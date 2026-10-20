#!/usr/bin/env python3
"""Render baseline/current room lenses and active panel materials in native GLES.

Uses the installed EGL compiler from validate-room-glsl.py; no browser, installs,
graphics flags, or environment changes. Requires the project's Node dependencies,
NumPy and Pillow. Native software-renderer timings are not browser or user GPU FPS.

Run: python tools/native-optics-check.py --baseline <original-commit> --output /tmp/dxt-native-optics
"""

import argparse
import ctypes as C
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import time

import numpy as np
from PIL import Image

PROJECT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("room_glsl", PROJECT / "tools/validate-room-glsl.py")
COMPILER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COMPILER)

NODE_SOURCE = r"""
import * as T from 'three';
import {RoomOptics} from './src/scene/room-optics.js';
import {roomVertex,displayFragment} from './src/scene/room-shaders.js';
import {createFixedPanelLayout} from './src/scene/room-environment.js';
import {configurePanelHologram} from './src/scene/room-hologram.js';
import {BannerPortal} from './src/scene/room-portal.js';
import {RoomIdentity} from './src/scene/room-identity.js';
import {RoomPanelEnergy} from './src/scene/room-panel-energy.js';
import {RoomCamera} from './src/scene/room-camera.js';
const {width,height,baselineCommit,original}=JSON.parse(await new Promise(resolve=>{
 let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>resolve(s));
}));
const serialize=uniforms=>Object.fromEntries(Object.entries(uniforms).flatMap(([key,{value:v}])=>{
 if(v?.isDataTexture)return [[key,{texture:{width:v.image.width,height:v.image.height,data:Array.from(v.image.data)}}]];
 if(v?.isTexture||v===null)return [];
 if(v?.toArray)return [[key,v.toArray()]];
 if(ArrayBuffer.isView(v))return [[key,Array.from(v)]];
 if(typeof v==='number'||typeof v==='boolean'||Array.isArray(v))return [[key,v]];
 throw Error('Unsupported uniform '+key);
}));
const camera=new T.PerspectiveCamera(42,width/height,.08,100);
camera.updateMatrixWorld(true);
const fake={extensions:{has:()=>true},capabilities:{reversedDepthBuffer:false},getPixelRatio:()=>1,getSize:v=>v.set(width,height)};
const optics=new RoomOptics(fake,new T.Scene(),camera);optics.composer.render=()=>{};
const profiles={};
for(const quality of ['auto','high']){
 optics.setQuality(quality);optics.render(1/60,{focusDistance:12});
 profiles[quality]=serialize(optics.lensPass.uniforms);
}
const previous=camera.clone();previous.position.set(.025,-.006,.004);previous.rotation.set(.0007,-.0014,.0003);previous.updateMatrixWorld(true);
const previousVP=new T.Matrix4().multiplyMatrices(previous.projectionMatrix,previous.matrixWorldInverse).toArray();
const baselineFragment=original.match(/const LENS_FRAGMENT\s*=\s*\/\* glsl \*\/`([\s\S]*?)`;/)?.[1];
if(!baselineFragment)throw Error('Baseline lens shader not found');
const shaders=[
 {name:'lens-baseline',vertex:optics.lensPass.material.vertexShader,fragment:baselineFragment},
 {name:'lens-current',vertex:optics.lensPass.material.vertexShader,fragment:optics.lensPass.material.fragmentShader},
];
const scene=new T.Scene(),panelCamera=camera.clone();
const panels=createFixedPanelLayout().map(p=>{
 const frame=new T.Group();scene.add(frame);
 const material=new T.ShaderMaterial({vertexShader:roomVertex,fragmentShader:displayFragment,fog:true,
  uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),hover:{value:1},hoverTime:{value:.7},hoverUv:{value:new T.Vector2(.5,.5)},
   artwork:{value:null},contentMap:{value:null},contentMix:{value:0},eraseForeground:{value:p.index===2||p.index===3?1:0},projection:{value:new T.Matrix3()}}});
 const panel={...p,frame,material};configurePanelHologram(panel);return panel;
});
const view={scene,camera:panelCamera,cameraRig:new RoomCamera(panelCamera,width),panels,carPivot:new T.Group(),screenLight:new T.PointLight(),
 hoverPanel:-1,settings:{quality:'high'},reduced:{matches:false},host:{style:{setProperty(){}}},reflectionBudget:{invalidate(){}}};
view.bannerPortal=new BannerPortal(view);view.identity=new RoomIdentity(view);view.panelEnergy=new RoomPanelEnergy(view);view.panelEnergy.prime();
for(const panel of panels){
 panel.material.uniforms.cardLevel.value=1;
 shaders.push({name:'panel-'+panel.index,vertex:panel.material.vertexShader,fragment:panel.material.fragmentShader,fog:true,uniforms:serialize(panel.material.uniforms)});
}
// Released center impulse on the actual physical card field. Preserve aspect
// and isolate its light by subtracting an idle draw of the same full material.
const panelFrames=[],entry=view.panelEnergy.entries[0];
entry.field.clear();entry.field.inject(.5,.5,.4);entry.field.release();
for(let i=1;i<=72;i++){
 entry.field.step(1/120);
 if(i===24||i===72)panelFrames.push({name:'panel-0-released-'+(i===24?'200ms':'600ms'),
  aspect:entry.field.aspect,seconds:i/120,uniforms:serialize(entry.panel.material.uniforms)});
}
const expand=source=>source.replace(/#include\s+<([\w\d_]+)>/g,(_,name)=>{
 if(!T.ShaderChunk[name])throw Error('Missing Three shader chunk '+name);return expand(T.ShaderChunk[name]);
});
// Match Three WebGLProgram.generatePrecision for the sampler types used here.
const common='#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp samplerCube;\n#define HIGH_PRECISION\n';
const vertexPrefix=[
 '#define attribute in','#define varying out','#define texture2D texture',
 'uniform mat4 modelMatrix; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;',
 'uniform mat4 viewMatrix; uniform mat3 normalMatrix; uniform vec3 cameraPosition;',
 'uniform bool isOrthographic; in vec3 position; in vec3 normal; in vec2 uv;'
].join('\n')+'\n';
const fragmentPrefix=[
 '#define varying in','#define texture2D texture','#define textureCube texture','#define texture2DProj textureProj',
 '#define texture2DLodEXT textureLod','#define textureCubeLodEXT textureLod','#define texture2DGradEXT textureGrad',
 '#define textureCubeGradEXT textureGrad','#define gl_FragColor pc_fragColor','layout(location=0) out highp vec4 pc_fragColor;',
 'uniform mat4 viewMatrix; uniform vec3 cameraPosition; uniform bool isOrthographic;',T.ShaderChunk.colorspace_pars_fragment,
 'vec4 linearToOutputTexel(vec4 color) { return color; }',
 'float luminance(vec3 color) { return dot(color, vec3(.2126,.7152,.0722)); }'
].join('\n')+'\n';
for(const s of shaders){
 s.rawVertex=s.vertex;s.rawFragment=s.fragment;
 const defines=s.fog?'#define USE_FOG\n#define FOG_EXP2\n':'';
 s.vertex=common+defines+vertexPrefix+expand(s.vertex);s.fragment=common+defines+fragmentPrefix+expand(s.fragment);
}
console.log(JSON.stringify({threeRevision:T.REVISION,baselineCommit,
 camera:{width,height,near:camera.near,far:camera.far,fov:camera.fov,projection:camera.projectionMatrix.toArray(),focalLength:camera.getFocalLength()/1000,filmHeight:camera.getFilmHeight()/1000},profiles,previousVP,shaders,panelFrames}));
"""


class NativeRenderer(COMPILER.NativeCompiler):
    """Small fullscreen draw harness, retaining exact extracted shader sources."""

    def __init__(self, width, height):
        super().__init__()
        self.width, self.height = width, height
        self.functions, self.programs, self.textures = {}, [], []
        self.vao = self.object("glGenVertexArrays")
        self.call("glBindVertexArray", None, [C.c_uint], self.vao)
        self.vbo = self.object("glGenBuffers")
        self.call("glBindBuffer", None, [C.c_uint, C.c_uint], 0x8892, self.vbo)
        vertices = np.array([[-1,-1,0,0,0], [3,-1,0,2,0], [-1,3,0,0,2]], dtype=np.float32)
        self.call("glBufferData", None, [C.c_uint,C.c_ssize_t,C.c_void_p,C.c_uint], 0x8892, vertices.nbytes, vertices.ctypes.data, 0x88E4)
        self.fbo = self.object("glGenFramebuffers")
        self.call("glBindFramebuffer", None, [C.c_uint,C.c_uint], 0x8D40, self.fbo)
        self.output = self.texture(np.zeros((height,width,4),dtype=np.float32), linear=False, half=False)
        self.call("glFramebufferTexture2D", None, [C.c_uint,C.c_uint,C.c_uint,C.c_uint,C.c_int],0x8D40,0x8CE0,0x0DE1,self.output,0)
        status = self.call("glCheckFramebufferStatus", C.c_uint,[C.c_uint],0x8D40)
        if status != 0x8CD5:
            raise RuntimeError(f"RGBA32F measurement framebuffer incomplete: {status:#x}")
        self.call("glViewport",None,[C.c_int]*4,0,0,width,height)
        self.check("framebuffer setup")

    def call(self, name, result, arguments, *values):
        if name not in self.functions:
            self.functions[name] = self.proc(name,result,*arguments)
        return self.functions[name](*values)

    def object(self, name):
        value=C.c_uint()
        self.call(name,None,[C.c_int,C.POINTER(C.c_uint)],1,C.byref(value))
        return value.value

    def check(self, operation):
        error=self.call("glGetError",C.c_uint,[])
        if error:
            raise RuntimeError(f"GLES error after {operation}: {error:#x}")

    def texture(self, pixels, linear=False, half=False):
        pixels=np.ascontiguousarray(pixels,dtype=np.float32)
        height,width,channels=pixels.shape
        texture=self.object("glGenTextures");self.textures.append(texture)
        self.call("glBindTexture",None,[C.c_uint,C.c_uint],0x0DE1,texture)
        for parameter,value in ((0x2801,0x2601 if linear else 0x2600),(0x2800,0x2601 if linear else 0x2600),(0x2802,0x812F),(0x2803,0x812F)):
            self.call("glTexParameteri",None,[C.c_uint,C.c_uint,C.c_int],0x0DE1,parameter,value)
        internal=(0x881A if half else 0x8814) if channels==4 else 0x822E
        self.call("glTexImage2D",None,[C.c_uint,C.c_int,C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p],
                  0x0DE1,0,internal,width,height,0,0x1908 if channels==4 else 0x1903,0x1406,pixels.ctypes.data)
        self.check("texture upload")
        return texture

    def program(self, item):
        program=self.call("glCreateProgram",C.c_uint,[]);self.programs.append(program)
        for stage,kind in (("vertex",0x8B31),("fragment",0x8B30)):
            shader=self.call("glCreateShader",C.c_uint,[C.c_uint],kind)
            source=C.c_char_p(item[stage].encode())
            self.call("glShaderSource",None,[C.c_uint,C.c_int,C.POINTER(C.c_char_p),C.POINTER(C.c_int)],shader,1,C.byref(source),None)
            self.call("glCompileShader",None,[C.c_uint],shader)
            status=C.c_int();self.call("glGetShaderiv",None,[C.c_uint,C.c_uint,C.POINTER(C.c_int)],shader,0x8B81,C.byref(status))
            if not status.value:
                log=C.create_string_buffer(32768)
                self.call("glGetShaderInfoLog",None,[C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_char_p],shader,len(log),None,log)
                raise RuntimeError(f"{item['name']} {stage}: {log.value.decode()}")
            self.call("glAttachShader",None,[C.c_uint,C.c_uint],program,shader)
            self.call("glDeleteShader",None,[C.c_uint],shader)
        self.call("glLinkProgram",None,[C.c_uint],program)
        status=C.c_int();self.call("glGetProgramiv",None,[C.c_uint,C.c_uint,C.POINTER(C.c_int)],program,0x8B82,C.byref(status))
        if not status.value:
            log=C.create_string_buffer(32768)
            self.call("glGetProgramInfoLog",None,[C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_char_p],program,len(log),None,log)
            raise RuntimeError(f"{item['name']} link: {log.value.decode()}")
        return program

    def draw(self, program, uniforms, textures):
        self.call("glUseProgram",None,[C.c_uint],program)
        for name,size,offset in (("position",3,0),("uv",2,12)):
            location=self.call("glGetAttribLocation",C.c_int,[C.c_uint,C.c_char_p],program,name.encode())
            if location>=0:
                self.call("glEnableVertexAttribArray",None,[C.c_uint],location)
                self.call("glVertexAttribPointer",None,[C.c_uint,C.c_int,C.c_uint,C.c_ubyte,C.c_int,C.c_void_p],location,size,0x1406,0,20,offset)
        standard={"modelMatrix":np.eye(4).ravel(),"modelViewMatrix":np.eye(4).ravel(),"projectionMatrix":np.eye(4).ravel(),
                  "viewMatrix":np.eye(4).ravel(),"normalMatrix":np.eye(3).ravel(),"cameraPosition":[0,0,2],"isOrthographic":False}
        for name,value in {**standard,**uniforms}.items():
            if isinstance(value,dict):continue
            location=self.call("glGetUniformLocation",C.c_int,[C.c_uint,C.c_char_p],program,name.encode())
            if location<0:continue
            if isinstance(value,bool):
                self.call("glUniform1i",None,[C.c_int,C.c_int],location,int(value))
            elif np.isscalar(value):
                self.call("glUniform1f",None,[C.c_int,C.c_float],location,float(value))
            else:
                data=np.ascontiguousarray(value,dtype=np.float32)
                ptr=data.ctypes.data_as(C.POINTER(C.c_float))
                if data.size in (9,16):
                    self.call("glUniformMatrix"+str(3 if data.size==9 else 4)+"fv",None,[C.c_int,C.c_int,C.c_ubyte,C.POINTER(C.c_float)],location,1,0,ptr)
                else:
                    size=2 if name=="uAperture" else data.size
                    self.call("glUniform"+str(size)+"fv",None,[C.c_int,C.c_int,C.POINTER(C.c_float)],location,data.size//size,ptr)
        for unit,(name,texture) in enumerate(textures.items()):
            location=self.call("glGetUniformLocation",C.c_int,[C.c_uint,C.c_char_p],program,name.encode())
            if location<0:continue
            self.call("glActiveTexture",None,[C.c_uint],0x84C0+unit)
            self.call("glBindTexture",None,[C.c_uint,C.c_uint],0x0DE1,texture)
            self.call("glUniform1i",None,[C.c_int,C.c_int],location,unit)
        self.check("uniform setup")
        self.call("glDrawArrays",None,[C.c_uint,C.c_int,C.c_int],4,0,3)
        self.call("glFinish",None,[])
        self.check("draw")

    def read(self):
        pixels=np.empty((self.height,self.width,4),dtype=np.float32)
        self.call("glReadPixels",None,[C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p],0,0,self.width,self.height,0x1908,0x1406,pixels.ctypes.data)
        self.check("readback")
        if not np.isfinite(pixels).all():raise RuntimeError("Non-finite rendered pixel")
        return pixels


def fixture(width,height,camera):
    """Linear HDR detail and discontinuous near/middle/far distance layers."""
    y,x=np.mgrid[0:height,0:width];u=(x+.5)/width;v=(y+.5)/height
    checker=((x//3+y//3)%2)*.3
    color=np.stack((.05+.12*u+checker,.035+.08*v+checker,.07+.1*u+checker,np.ones_like(u)),axis=-1)
    distance=np.full((height,width),36.,dtype=np.float64)
    regions=[((u>.31)&(u<.69)&(v>.18)&(v<.83),12.,(.28,.12,.085)),
             (((u-.20)**2/.013+(v-.53)**2/.11)<1,2.,(.016,.018,.022)),
             (((u-.79)**2/.006+(v-.47)**2/.07)<1,.65,(.028,.031,.036)),
             ((abs(u-(.43+.07*v))<.003)&(v>.11)&(v<.94),4.,(1.6,.012,.025))]
    for mask,z,tint in regions:
        distance[mask]=z;color[mask,:3]=np.array(tint)+checker[mask,None]*.2
    # Focus-plane spokes, far point emitters, and near bright edge expose changes
    # to gather shape, depth rejection, bokeh weighting, and texel boundaries.
    for index in range(19):
        cx=.05+(index%10)*.095;cy=.08+(index//10)*.83
        spot=((u-cx)*width)**2+((v-cy)*height)**2<(1.4+index%3)**2
        color[spot,:3]=[12.,8.,3.] if index%2 else [8.,.008,.03]
        distance[spot]=36.
    spokes=(abs(np.sin(np.arctan2(v-.5,u-.52)*18))<.08)&(((u-.52)**2+(v-.5)**2)<.014)
    color[spokes,:3]=[1.2,.85,.4];distance[spokes]=12.
    p=np.array(camera["projection"]).reshape((4,4),order="F")
    ndc=(p[2,2]*(-distance)+p[2,3])/(p[3,2]*(-distance)+p[3,3])
    depth=np.round((ndc*.5+.5)*(2**24-1))/(2**24-1)
    motion=np.zeros_like(color);moving=(distance==12.)
    motion[moving,0]=.5+5./width/2;motion[moving,1]=.5-2./height/2
    motion[moving,2]=distance[moving]/camera["far"];motion[moving,3]=1
    return color.astype(np.float32),depth.astype(np.float32)[...,None],motion.astype(np.float32),distance


def preview(pixels):
    # Display-only ACES approximation and sRGB. Numeric comparisons use raw HDR.
    x=np.maximum(pixels[...,:3],0)
    x=np.clip(x*(2.51*x+.03)/(x*(2.43*x+.59)+.14),0,1)
    x=np.where(x<=.0031308,x*12.92,1.055*x**(1/2.4)-.055)
    return np.uint8(np.clip(x*255+.5,0,255))[::-1]


def save_image(path,pixels):
    Image.fromarray(preview(pixels)).save(path)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",type=Path,default=Path(tempfile.gettempdir())/"dxt-native-optics")
    parser.add_argument("--baseline",default="HEAD")
    parser.add_argument("--width",type=int,default=1280)
    parser.add_argument("--height",type=int,default=720)
    parser.add_argument("--timings",type=int,default=0,help="Optional warm draws per program; native timings only")
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    original=subprocess.check_output(["git","show",args.baseline+":dxrkths/src/scene/room-optics.js"],cwd=PROJECT,text=True)
    baseline_commit=subprocess.check_output(["git","rev-parse",args.baseline],cwd=PROJECT,text=True).strip()
    extracted=json.loads(subprocess.check_output(["node","--input-type=module","-e",NODE_SOURCE],cwd=PROJECT,text=True,
        input=json.dumps({"width":args.width,"height":args.height,"baselineCommit":baseline_commit,"original":original})))
    report={"checkedAt":datetime.now(timezone.utc).isoformat(),"baselineCommit":extracted["baselineCommit"],
        "threeRevision":extracted["threeRevision"],"camera":extracted["camera"],
        "method":"Exact extracted fragments; installed native EGL/GLES3; identical textures and camera uniforms; RGBA32F readback.",
        "fixture":"Synthetic sharp near silhouettes (0.65, 2, 4 m), focus detail (12 m), far HDR dots (36 m); RGBA16F linear color; nearest R32F depth quantized to 24 bits; RGBA16F object motion.",
        "limitations":"Not a browser render, full scene screenshot, user GPU benchmark, or measurement of MSAA resolve. Preview PNGs use a display-only ACES approximation; raw HDR pixels determine errors.",
        "checks":[],"cases":[]}
    renderer=None
    try:
        renderer=NativeRenderer(args.width,args.height);report["renderer"]=renderer.details
        programs={}
        for item in extracted["shaders"]:
            for field,extension in (("rawVertex","raw.vert"),("rawFragment","raw.frag"),("vertex","native.vert"),("fragment","native.frag")):
                (args.output/(item["name"]+"."+extension)).write_text(item[field])
            programs[item["name"]]=renderer.program(item)
            report["checks"].append({"shader":item["name"],"status":"compiled_and_linked",
                "rawFragmentSha256":hashlib.sha256(item["rawFragment"].encode()).hexdigest(),
                "nativePairSha256":hashlib.sha256((item["vertex"]+"\n"+item["fragment"]).encode()).hexdigest()})
        color,depth,motion,distance=fixture(args.width,args.height,extracted["camera"])
        color_texture=renderer.texture(color,linear=True,half=True)
        textures={"tDiffuse":color_texture,"tSceneDepth":renderer.texture(depth),"tObjectMotion":renderer.texture(motion,half=True)}
        save_image(args.output/"fixture-color.png",color)
        Image.fromarray(np.uint8(np.clip(distance/extracted["camera"]["far"]*255,0,255))[::-1]).save(args.output/"fixture-distance.png")
        cases=[("identity-high","high",{"uCocScale":0,"uShutter":0}),
               ("dof-focus12-high","high",{}),("dof-focus12-auto","auto",{}),
               ("dof-focus4-high","high",{"uFocusDistance":4}),
               ("dof-camera-motion-high","high",{"uShutter":.55,"uPreviousViewProjection":extracted["previousVP"]}),
               ("motion-only-high","high",{"uCocScale":0,"uShutter":.55,"uPreviousViewProjection":extracted["previousVP"]}),
               ("dof-object-motion-high","high",{"uShutter":.55,"uObjectMotion":1})]
        for name,quality,overrides in cases:
            uniforms={**extracted["profiles"][quality],**overrides}
            if "uFocusDistance" in overrides:
                c=extracted["camera"];f=c["focalLength"]
                uniforms["uCocScale"]=1.5*.5*args.height*f*f/(1.65*c["filmHeight"]*max(uniforms["uFocusDistance"]-f,.01))
            outputs=[]
            for variant in ("lens-baseline","lens-current"):
                renderer.draw(programs[variant],uniforms,textures);outputs.append(renderer.read())
            delta=np.abs(outputs[1][...,:3].astype(np.float64)-outputs[0][...,:3])
            pixel_error=np.max(delta,axis=2)
            check={"name":name,"quality":quality,"samples":uniforms["uSamples"],"motionSamples":uniforms["uMotionSamples"],
                "focus":uniforms["uFocusDistance"],"cocScale":uniforms["uCocScale"],"shutter":uniforms["uShutter"],
                "maxAbsoluteHdrError":float(delta.max()),"rmsHdrError":float(np.sqrt(np.mean(delta*delta))),
                "meanAbsoluteHdrError":float(delta.mean()),"p99AbsoluteHdrError":float(np.quantile(delta,.99)),
                "pixelsOver1e-3":int(np.count_nonzero(pixel_error>1e-3)),"pixelsOver1e-2":int(np.count_nonzero(pixel_error>1e-2)),
                "alphaMaxError":float(np.max(np.abs(outputs[0][...,3]-outputs[1][...,3])))}
            if args.timings:
                check["nativeDrawMs"]={}
                for variant in ("lens-baseline","lens-current"):
                    elapsed=[]
                    for _ in range(args.timings):
                        start=time.perf_counter();renderer.draw(programs[variant],uniforms,textures);elapsed.append((time.perf_counter()-start)*1000)
                    check["nativeDrawMs"][variant]={"median":float(np.median(elapsed)),"samples":elapsed}
            for variant,pixels in zip(("baseline","current"),outputs):save_image(args.output/(name+"-"+variant+".png"),pixels)
            heat=np.uint8(np.clip(pixel_error*1000,0,1)*255)[::-1]
            Image.fromarray(heat).save(args.output/(name+"-difference-x1000.png"))
            report["cases"].append(check);print(json.dumps(check),flush=True)
        report["panels"]=[]
        for item in extracted["shaders"]:
            if not item["name"].startswith("panel-"):continue
            uniforms=item["uniforms"];panel_textures={"artwork":color_texture,"contentMap":color_texture}
            for name,value in uniforms.items():
                if isinstance(value,dict) and "texture" in value:
                    t=value["texture"];data=np.array(t["data"],dtype=np.float32).reshape((t["height"],t["width"],4))
                    panel_textures[name]=renderer.texture(data)
            states={}
            for active in (0,1):
                renderer.draw(programs[item["name"]],{**uniforms,"uEnergyActive":active},panel_textures)
                states[active]=renderer.read();save_image(args.output/(item["name"]+("-active.png" if active else "-idle.png")),states[active])
            difference=states[1][...,:3]-states[0][...,:3]
            report["panels"].append({"name":item["name"],"status":"rendered_idle_and_active","finite":True,
                "peakActiveHdr":float(states[1][...,:3].max()),"maxEnergyContribution":float(difference.max()),
                "litPixels":int(np.count_nonzero(np.max(difference,axis=2)>.001))})
        report["releasedPanelFrames"]=[]
        for frame in extracted["panelFrames"]:
            aspect=frame["aspect"]
            panel_width=min(args.width,round(args.height*aspect))
            panel_height=min(args.height,round(args.width/aspect))
            left=(args.width-panel_width)//2;bottom=(args.height-panel_height)//2
            renderer.call("glViewport",None,[C.c_int]*4,left,bottom,panel_width,panel_height)
            uniforms=frame["uniforms"];t=uniforms["uEnergyMap"]["texture"]
            data=np.array(t["data"],dtype=np.float32).reshape((t["height"],t["width"],4))
            panel_textures={"artwork":color_texture,"contentMap":color_texture,"uEnergyMap":renderer.texture(data)}
            states=[]
            for active in (0,1):
                renderer.call("glClearColor",None,[C.c_float]*4,0,0,0,1)
                renderer.call("glClear",None,[C.c_uint],0x4000)
                renderer.draw(programs["panel-0"],{**uniforms,"uEnergyActive":active},panel_textures)
                states.append(renderer.read())
            energy=np.maximum(states[1]-states[0],0)
            # Cropping preserves the viewport's physical card aspect; image
            # colors represent actual added HDR light, without a gain multiplier.
            image_pixels=energy[bottom:bottom+panel_height,left:left+panel_width]
            save_image(args.output/(frame["name"]+"-energy.png"),image_pixels)
            report["releasedPanelFrames"].append({"name":frame["name"],"seconds":frame["seconds"],"aspect":aspect,
                "imageSize":[panel_width,panel_height],"method":"Full active shader minus identical idle shader in raw HDR; dark background; display-only tone mapping; no brightness amplification.",
                "maxEnergyContribution":float(energy[...,:3].max()),"litPixels":int(np.count_nonzero(np.max(energy[...,:3],axis=2)>.001))})
        report["status"]="completed"
        result=0
    except COMPILER.CompilerUnavailable as error:
        report.update(status="unavailable",reason=str(error));result=77
    except Exception as error:
        report.update(status="failed",reason=str(error));result=1
    finally:
        if renderer:renderer.close()
        (args.output/"report.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"status":report["status"],"reason":report.get("reason"),"report":str(args.output/"report.json")}),flush=True)
    return result


if __name__=="__main__":
    raise SystemExit(main())
