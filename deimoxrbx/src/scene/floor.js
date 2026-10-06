import {THREE,physical,canvasTexture,seedRandom} from './shared.js';
/** Camera-reflected scene, sampled with roughness-dependent normal distortion. */
export class ReflectiveFloor {
 constructor(scene){this.scene=scene;this.camera=new THREE.PerspectiveCamera();this.matrix=new THREE.Matrix4();this.target=new THREE.WebGLRenderTarget(1024,512,{type:THREE.HalfFloatType,depthBuffer:true});this.target.texture.name='planar-reflection';
  const rnd=seedRandom(45);const tex=canvasTexture((ctx,w,h)=>{ctx.fillStyle='#333c51';ctx.fillRect(0,0,w,h);const image=ctx.getImageData(0,0,w,h);for(let i=0;i<image.data.length;i+=4){const n=Math.floor(rnd()*25);image.data[i]+=n;image.data[i+1]+=n;image.data[i+2]+=n;}ctx.putImageData(image,0,0);ctx.lineWidth=2;ctx.strokeStyle='#141d32';for(let y=0;y<4;y++){for(let x=0;x<4;x++){let xx=x*128+(y%2)*64;ctx.strokeRect(xx,y*128,128,128);}}ctx.globalAlpha=.16;ctx.strokeStyle='#acbbd9';ctx.lineWidth=.7;for(let i=0;i<120;i++){let x=rnd()*w,y=rnd()*h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rnd()*55,y+rnd()*3);ctx.stroke();}},512,512);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(12,12);tex.anisotropy=8;
  const mat=physical(0x0c1527,.30,.94);mat.map=tex;mat.bumpMap=tex;mat.bumpScale=.055;mat.envMapIntensity=.16;
  this.uniforms={uReflection:{value:this.target.texture},uReflectionMatrix:{value:this.matrix}};
  mat.onBeforeCompile=shader=>{Object.assign(shader.uniforms,this.uniforms);shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform mat4 uReflectionMatrix;varying vec4 vReflection;varying vec3 vFloorWorld;').replace('#include <project_vertex>','#include <project_vertex>\nvFloorWorld=(modelMatrix*vec4(transformed,1.)).xyz;vReflection=uReflectionMatrix*vec4(vFloorWorld,1.);');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uReflection;varying vec4 vReflection;varying vec3 vFloorWorld;').replace('#include <opaque_fragment>',`vec2 ruv=vReflection.xy/vReflection.w;vec2 disturb=vec2(sin(vFloorWorld.x*18.+sin(vFloorWorld.z*4.)),cos(vFloorWorld.z*25.+sin(vFloorWorld.x*6.)))*.0005;
vec3 reflected=texture2D(uReflection,ruv+disturb).rgb*.30;reflected+=(texture2D(uReflection,ruv+disturb+vec2(.002,.0045)).rgb+texture2D(uReflection,ruv+disturb-vec2(.002,.0045)).rgb)*.22;reflected+=(texture2D(uReflection,ruv+vec2(-.002,.006)).rgb+texture2D(uReflection,ruv+vec2(.002,-.006)).rgb)*.13;
// The foreground is a rougher brushed finish: reflections fade naturally beneath the floating text.
float foreground=smoothstep(3.6,6.9,vFloorWorld.z);
reflected*=mix(1.,.025,foreground);
float fres=pow(1.-max(dot(normalize(cameraPosition-vFloorWorld),vec3(0.,1.,0.)),0.),3.);float tile=fract(vFloorWorld.x*.85+step(.5,fract(vFloorWorld.z*.42))*.5);float grout=min(min(tile,1.-tile),min(fract(vFloorWorld.z*.85),1.-fract(vFloorWorld.z*.85)));float seam=1.-smoothstep(.003,.015,grout);outgoingLight=mix(outgoingLight,reflected*vec3(.36,.48,.71),.55+fres*.23);outgoingLight*=mix(1.,.18,foreground);outgoingLight*=1.-seam*.43;outgoingLight+=vec3(.0004,.0008,.0018)*(1.-seam);\n#include <opaque_fragment>`);};
  this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(65,65),mat);this.mesh.rotation.x=-Math.PI/2;this.mesh.position.y=-.025;this.mesh.receiveShadow=true;scene.add(this.mesh);
 }
 resize(w,h,hdr=true){this.target.dispose();this.target=new THREE.WebGLRenderTarget(Math.min(1440,Math.round(w*.65)),Math.min(900,Math.round(h*.65)),{type:hdr?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true});this.uniforms.uReflection.value=this.target.texture;}
 reflect(scene,camera,renderer){
  // Reflect in the actual floor plane. Match the source camera roll as well as its position.
  const c=this.camera,normal=new THREE.Vector3(0,1,0),height=this.mesh.position.y;
  c.copy(camera);c.position.copy(camera.position);c.position.y=2*height-camera.position.y;
  const target=camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()));
  target.y=2*height-target.y;
  c.up.set(0,1,0).applyQuaternion(camera.quaternion).reflect(normal);
  c.lookAt(target);c.updateMatrixWorld();c.projectionMatrix.copy(camera.projectionMatrix);
  this.matrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  this.matrix.multiply(c.projectionMatrix).multiply(c.matrixWorldInverse);
  // Oblique near plane, following Three.js Reflector / Lengyel. Dissolving cards
  // below the floor must not leak back into its reflection.
  const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,this.mesh.position).applyMatrix4(c.matrixWorldInverse);
  const clip=new THREE.Vector4(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
  const m=c.projectionMatrix.elements,q=new THREE.Vector4((Math.sign(clip.x)+m[8])/m[0],(Math.sign(clip.y)+m[9])/m[5],-1,(1+m[10])/m[14]);
  const denominator=clip.dot(q);
  if(Math.abs(denominator)>1e-6){clip.multiplyScalar(2/denominator);m[2]=clip.x;m[6]=clip.y;m[10]=clip.z+1-.001;m[14]=clip.w;}
  c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
  const current=renderer.getRenderTarget();this.mesh.visible=false;
  try{renderer.setRenderTarget(this.target);renderer.render(scene,c);}
  finally{this.mesh.visible=true;renderer.setRenderTarget(current);}
 }

 dispose(){this.target.dispose();this.mesh.geometry.dispose();this.mesh.material.dispose();}
}
