import * as T from 'three';

const textureCache=new Map();
function noiseTexture(kind) {
  if(textureCache.has(kind))return textureCache.get(kind);
  const n=256,data=new Uint8Array(n*n*4);let seed=137;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    let c=kind==='brushed'?173+Math.sin(y*2.91)*23+rand()*14:188+rand()*38;
    if(kind==='carbon')c=125+((Math.floor(x/4)+Math.floor(y/4))%2)*24+rand()*8;
    const i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=c;data[i+3]=255;
  }
  const tex=new T.DataTexture(data,n,n);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(3,5);tex.needsUpdate=true;tex.generateMipmaps=true;tex.minFilter=T.LinearMipmapLinearFilter;tex.magFilter=T.LinearFilter;
  textureCache.set(kind,tex);return tex;
}
export function surfaceMaterial(kind,uniforms,textures=true) {
  const recipes={
    paint:{color:0xc6c8cb,metalness:.23,roughness:.34},
    pale:{color:0xe3e4e6,metalness:.16,roughness:.32},
    dark:{color:0x16191e,metalness:.54,roughness:.34},
    carbon:{color:0x111419,metalness:.35,roughness:.38},
    steel:{color:0x91979d,metalness:1,roughness:.27},
    silver:{color:0xc5c9cf,metalness:.98,roughness:.24},
    bronze:{color:0x61534a,metalness:.92,roughness:.33},
    black:{color:0x060708,metalness:.15,roughness:.57},
    glass:{color:0x0a1623,metalness:.9,roughness:.12},
  };
  const material=new T.MeshStandardMaterial(recipes[kind]??recipes.paint);
  material.dithering=true;
  if(textures){material.roughnessMap=noiseTexture(kind==='carbon'?'carbon':kind==='steel'||kind==='silver'?'brushed':'paint');material.bumpMap=material.roughnessMap;material.bumpScale=kind==='steel'?.002:.001;}
  installHighlight(material,uniforms);return material;
}
export function installHighlight(material,uniforms) {
  material.onBeforeCompile=shader=>{
    shader.uniforms.uHighlight=uniforms.highlight;shader.uniforms.uBrightness=uniforms.brightness;
    shader.fragmentShader='uniform float uHighlight; uniform float uBrightness;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float edge=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),3.0);\noutgoingLight+=vec3(0.48)*edge*uHighlight;\n#include <opaque_fragment>`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.rgb *= uBrightness;');
  };
  material.customProgramCacheKey=()=> 'spacex-part-surface-v1';
}
export function decalTexture(kind) {
  if(textureCache.has(kind))return textureCache.get(kind);
  const canvas=document.createElement('canvas');canvas.width=kind==='wordmark'?256:512;canvas.height=kind==='wordmark'?1024:256;
  const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
  if(kind==='wordmark'){
    c.fillStyle='#20384d';c.textAlign='center';c.font='500 138px Arial';
    [...'SPACEX'].forEach((letter,i)=>c.fillText(letter,128,160+i*145));
    c.lineWidth=5;c.strokeStyle='#20384d';c.beginPath();c.moveTo(55,965);c.quadraticCurveTo(110,883,212,856);c.stroke();
  }else if(kind==='flag'){
    c.fillStyle='#d3d5d8';c.fillRect(20,20,472,215);
    c.fillStyle='#7e2632';for(let i=0;i<13;i+=2)c.fillRect(20,20+i*16.5,472,16.5);
    c.fillStyle='#1f304a';c.fillRect(20,20,190,116);c.fillStyle='#e6e7e7';
    for(let y=0;y<9;y++)for(let x=0;x<6-(y%2);x++){c.beginPath();c.arc(36+x*29+(y%2)*14,30+y*12,3,0,Math.PI*2);c.fill();}
  }else if(kind==='x'){
    c.fillStyle='#273d50';c.beginPath();c.moveTo(105,70);c.lineTo(190,70);c.lineTo(326,185);c.lineTo(242,185);c.closePath();c.fill();
    c.beginPath();c.moveTo(99,202);c.quadraticCurveTo(294,26,465,28);c.quadraticCurveTo(262,82,164,202);c.closePath();c.fill();
  }else if(kind==='tiles'){
    c.fillStyle='#23262a';c.fillRect(0,0,512,256);c.strokeStyle='#111316';c.lineWidth=1.5;
    for(let y=-1;y<13;y++)for(let x=-1;x<24;x++){
      const px=x*24+(y%2)*12,py=y*21;c.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;c.lineTo(px+13*Math.cos(a),py+13*Math.sin(a));}c.closePath();c.stroke();
    }
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  if(kind==='tiles'){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(1,8);}
  textureCache.set(kind,texture);return texture;
}
export function disposeSharedTextures(){for(const t of textureCache.values())t.dispose();textureCache.clear();}
