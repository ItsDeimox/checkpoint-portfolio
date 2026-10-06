import {THREE,canvasTexture,glow} from './shared.js';
import {VertexEnergyField} from '../core/vertex-energy.js';
import {projects,pairs} from '../projects.js';

// Optical gain is independent of the displacement simulation. A swipe never becomes a floodlight.
export const GLASS_HOVER=Object.freeze({gain:.22,limit:1.2});

const vertex=`
uniform sampler2D uEnergy;uniform vec2 uGrid;uniform float uTime,uFocus;
varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormal;varying float vEnergy;
void main(){
 vUv=uv;vec2 texel=1./uGrid;vec2 sampleUv=(uv*(uGrid-1.)+.5)/uGrid;
 vec4 energy=texture2D(uEnergy,sampleUv);
 float left=texture2D(uEnergy,sampleUv-vec2(texel.x,0.)).r;
 float right=texture2D(uEnergy,sampleUv+vec2(texel.x,0.)).r;
 float bottom=texture2D(uEnergy,sampleUv-vec2(0.,texel.y)).r;
 float top=texture2D(uEnergy,sampleUv+vec2(0.,texel.y)).r;
 vec3 p=position;p.z+=energy.r*(1.-uFocus*.8);
 vEnergy=energy.g;vWorld=(modelMatrix*vec4(p,1.)).xyz;
 vec3 n=normalize(vec3((left-right)*6.,(bottom-top)*6.,1.));
 vNormal=normalize(mat3(modelMatrix)*n);
 gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);
}`;
const fragment=`
precision highp float;
uniform sampler2D uBackground,uMedia,uLabels,uEnergy;
uniform vec2 uResolution,uGrid;uniform float uTime,uMirror,uFocus,uPlaying,uMediaAspect,uHoverGlowGain,uHoverGlowLimit;
varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormal;varying float vEnergy;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float boxDistance(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
vec3 blurBackground(vec2 uv,float radius){
 vec3 c=texture2D(uBackground,uv).rgb*.20;
 c+=(texture2D(uBackground,uv+vec2(1.,0.)*radius).rgb+texture2D(uBackground,uv-vec2(1.,0.)*radius).rgb)*.12;
 c+=(texture2D(uBackground,uv+vec2(0.,1.7)*radius).rgb+texture2D(uBackground,uv-vec2(0.,1.7)*radius).rgb)*.12;
 c+=(texture2D(uBackground,uv+vec2(.75,1.3)*radius).rgb+texture2D(uBackground,uv-vec2(.75,1.3)*radius).rgb)*.08;
 c+=(texture2D(uBackground,uv+vec2(-.75,1.3)*radius).rgb+texture2D(uBackground,uv-vec2(-.75,1.3)*radius).rgb)*.08;
 return c;
}
void main(){
 vec2 p=(vUv-.5)*vec2(4.8,2.8);float d=boxDistance(p,vec2(2.38,1.38),.15);
 float aa=max(fwidth(d),.001);if(d>aa)discard;
 float floorCut=.018+hash(floor(vUv*200.))*.045;
 if(vWorld.y<floorCut)discard;
 float contact=exp(-max(vWorld.y-.04,0.)*15.);
 vec2 suv=clamp(gl_FragCoord.xy/uResolution,vec2(.005),vec2(.995));
 float edge=1.-smoothstep(.004,.025,-d);
 float bevel=exp(-abs(d)*16.);
 vec2 localNormal=normalize(p/vec2(2.4,1.4)+.00001);
 vec2 distortion=localNormal*bevel*.008+vNormal.xy*.0015;
 vec2 euv=(vUv*(uGrid-1.)+.5)/uGrid;
 float glowEnergy=texture2D(uEnergy,euv).g;
 vec3 glass=vec3(.013,.038,.105);
 if(uMirror<.5){glass=blurBackground(suv+distortion,.003+bevel*.005)*vec3(.35,.46,.62)+vec3(.013,.03,.074);}
 vec3 eye=normalize(cameraPosition-vWorld);float fres=pow(clamp(1.-abs(dot(eye,normalize(vNormal))),0.,1.),3.);
 float frost=hash(gl_FragCoord.xy)*.008;
 glass+=vec3(.08,.16,.34)*(bevel*.36+fres*.45)+frost;
 float inset=1.-smoothstep(-.25,-.12,d);
 vec2 mediaUv=vUv;
 // Letterbox rather than stretch the source, including local videos with arbitrary ratios.
 float cardAspect=4.8/2.8;vec2 contained=vec2(1.);
 if(uMediaAspect>cardAspect)contained.y=cardAspect/uMediaAspect;else contained.x=uMediaAspect/cardAspect;
 vec2 movieUv=(mediaUv-.5)/contained+.5;
 float inside=step(0.,movieUv.x)*step(movieUv.x,1.)*step(0.,movieUv.y)*step(movieUv.y,1.);
 vec2 posterUv=vec2(vUv.x,clamp((vUv.y-.12)/.80,0.,1.));
 vec2 muv=mix(posterUv,movieUv,uPlaying);
 float diffusion=(1.-uPlaying)*.0017;
 vec3 media=texture2D(uMedia,muv).rgb*.50;
 media+=(texture2D(uMedia,muv+vec2(diffusion,0.)).rgb+texture2D(uMedia,muv-vec2(diffusion,0.)).rgb)*.25;
 float mediaWeight=mix(.88,.985,uPlaying)*inset*mix(1.,inside,uPlaying);
 float bottom=smoothstep(.08,.65,vUv.y);
 media*=mix(.15,.90,bottom)*(1.-uPlaying)+uPlaying;
 vec3 color=mix(glass,media,mediaWeight);
 // Wide milky transmission around the pane, not a CSS border painted over the image.
 float milky=exp(-abs(d)*6.0)*.10;
 color+=vec3(.24,.42,.87)*(milky+bevel*.07)*(1.-uPlaying*.9);
 float sweep=pow(max(0.,sin(vUv.x*3.0+vUv.y*1.7+.8)),12.)*.065;
 color+=vec3(.23,.40,.79)*sweep*(1.-uPlaying);
 float hotspots=.62+3.2*exp(-pow((vUv.x-.025)*28.,2.))*smoothstep(.60,1.,vUv.y)
   +3.5*exp(-pow((vUv.x-.95)*30.,2.))*smoothstep(0.,.3,1.-vUv.y)
   +1.7*exp(-pow((vUv.x-.67-.05*sin(uTime*.6))*26.,2.));
 vec3 edgeColor=vec3(.38,.66,1.75)*edge*hotspots;
 color+=edgeColor+vec3(.11,.35,1.8)*min(glowEnergy,uHoverGlowLimit)*uHoverGlowGain*(1.-uPlaying*.85);
 color+=vec3(.2,.9,3.8)*contact*(.25+hash(vUv)*.6);
 vec4 label=texture2D(uLabels,vUv);color=mix(color,label.rgb,label.a*(1.-uPlaying));
 gl_FragColor=vec4(color,(1.-smoothstep(-aa,aa,d)));
}`;

function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function labelTexture(project,index,side){return canvasTexture((ctx,w,h)=>{
 ctx.clearRect(0,0,w,h);const pad=82;
 ctx.fillStyle='#cad7ef';ctx.font='500 39px Arial, sans-serif';ctx.letterSpacing='4px';ctx.fillText(`${String(index+1).padStart(2,'0')} / VÍDEO`,pad,h-441);ctx.letterSpacing='0px';
 ctx.fillStyle='#f4f8ff';ctx.font=`600 ${side===0?80:116}px Arial, sans-serif`;ctx.fillText(project.title,pad,h-335);
 ctx.fillStyle='#c4d3ee';ctx.font=`400 ${side===0?40:58}px Arial, sans-serif`;ctx.fillText(project.subtitle,pad,h-243);
 let x=pad;for(const tag of project.tags){ctx.font='500 34px Arial, sans-serif';const width=ctx.measureText(tag).width+72;rounded(ctx,x,h-126,width,83,41);ctx.fillStyle='rgba(100,145,235,0.15)';ctx.fill();ctx.strokeStyle='rgba(170,195,255,0.24)';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#dce8ff';ctx.fillText(tag,x+36,h-70);x+=width+25;}
 const cx=w*.50,cy=h*.49;ctx.strokeStyle='#d9e9ff';ctx.lineWidth=3;ctx.shadowBlur=22;ctx.shadowColor='#669bff';ctx.beginPath();ctx.arc(cx,cy,98,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-18,cy-34);ctx.lineTo(cx+34,cy);ctx.lineTo(cx-18,cy+34);ctx.closePath();ctx.stroke();ctx.shadowBlur=0;
},1920,1120);}

class GlassPanel{
 constructor(side){this.side=side;this.group=new THREE.Group();this.group.name=side===0?'LeftVideoGlass':'RightVideoGlass';this.energy=new VertexEnergyField({columns:64,rows:38,width:4.8,height:2.8,seed:side+21,displacementLimit:.16});this.texture=new THREE.DataTexture(this.energy.data,this.energy.textureWidth,this.energy.textureHeight,THREE.RGBAFormat,THREE.FloatType);this.texture.minFilter=this.texture.magFilter=THREE.NearestFilter;this.texture.needsUpdate=true;
  const blank=new THREE.DataTexture(new Uint8Array([16,26,46,255]),1,1);blank.needsUpdate=true;
  this.uniforms={uEnergy:{value:this.texture},uGrid:{value:new THREE.Vector2(this.energy.textureWidth,this.energy.textureHeight)},uTime:{value:0},uBackground:{value:blank},uMedia:{value:blank},uLabels:{value:blank},uResolution:{value:new THREE.Vector2(1672,720)},uMirror:{value:0},uFocus:{value:0},uPlaying:{value:0},uMediaAspect:{value:16/9},uHoverGlowGain:{value:GLASS_HOVER.gain},uHoverGlowLimit:{value:GLASS_HOVER.limit}};
  this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,side:THREE.DoubleSide,depthWrite:true});
  this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(4.8,2.8,64,38),this.material);this.mesh.name=this.group.name+'Surface';this.mesh.userData.side=side;this.group.add(this.mesh);
  // Tangible thickness behind the refractive subdivided surface.
  const edgeMat=new THREE.MeshPhysicalMaterial({color:0x5478d2,metalness:.10,roughness:.28,transparent:true,opacity:.12,depthWrite:false,clearcoat:1});
  const shape=new THREE.Shape();shape.moveTo(-2.23,-1.38);shape.lineTo(2.23,-1.38);shape.quadraticCurveTo(2.38,-1.38,2.38,-1.23);shape.lineTo(2.38,1.23);shape.quadraticCurveTo(2.38,1.38,2.23,1.38);shape.lineTo(-2.23,1.38);shape.quadraticCurveTo(-2.38,1.38,-2.38,1.23);shape.lineTo(-2.38,-1.23);shape.quadraticCurveTo(-2.38,-1.38,-2.23,-1.38);
  this.back=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.09,bevelEnabled:false,curveSegments:8}),edgeMat);this.back.position.z=-.13;this.group.add(this.back);
  this.flare=glow(this.group,[-2.2,1.29,.015],.38,.8,0x73a2ff);this.flare2=glow(this.group,[2.20,-1.29,.02],.42,.9,0x6897ff);
  this.poster=null;this.labels=null;this.video=null;this.videoTexture=null;this.loadGeneration=0;
 }
 setProject(project,index){this.project=project;this.index=index;this.stop();this.loadGeneration++;const generation=this.loadGeneration;
  this.labels?.dispose();this.labels=labelTexture(project,index,this.side);this.uniforms.uLabels.value=this.labels;
  new THREE.TextureLoader().load(project.poster,tex=>{if(generation!==this.loadGeneration){tex.dispose();return;}tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;this.poster?.dispose();this.poster=tex;this.uniforms.uMedia.value=tex;},undefined,()=>{});
  this.energy.reset();this.texture.needsUpdate=true;
 }
 setVideo(video){this.stop();this.video=video;this.videoTexture=new THREE.VideoTexture(video);this.videoTexture.colorSpace=THREE.SRGBColorSpace;this.uniforms.uMedia.value=this.videoTexture;this.uniforms.uPlaying.value=1;this.uniforms.uMediaAspect.value=video.videoWidth/video.videoHeight||16/9;}
 stop(){if(this.video){this.video.pause();this.video=null;}this.videoTexture?.dispose();this.videoTexture=null;this.uniforms.uPlaying.value=0;if(this.poster)this.uniforms.uMedia.value=this.poster;}
 update(time,dt,motion){this.uniforms.uTime.value=time;this.uniforms.uFocus.value=motion.selected===this.side?motion.focusAmount:0;if(this.energy.step(dt))this.texture.needsUpdate=true;this.group.position.y=this.baseY+motion.cardOffset;this.back.visible=motion.cardOffset===0;this.flare.visible=this.flare2.visible=this.group.position.y>1.4;}
 dispose(){this.stop();this.poster?.dispose();this.labels?.dispose();this.texture.dispose();this.mesh.geometry.dispose();this.material.dispose();this.back.geometry.dispose();this.back.material.dispose();}
}
export class GlassGallery{
 constructor(scene){this.group=new THREE.Group();this.group.name='TwoRefractiveVideoPanels';scene.add(this.group);this.panels=[new GlassPanel(0),new GlassPanel(1)];this.panels.forEach(p=>this.group.add(p.group));this.setLayout(false);this.setPair(0);}
 setLayout(mobile){this.panels.forEach((p,i)=>{const side=i===0?-1:1;p.group.position.set(side*6.7184,2.4995,-1.5);p.baseY=2.4995;p.group.rotation.set(-.2244,-side*.9668,-side*.1223);p.group.scale.setScalar(1.6093);if(mobile){p.group.position.set(side*2.0,1.55,1.9);p.baseY=1.55;p.group.scale.setScalar(.70);p.group.rotation.set(0,-side*.12,side*.035);}});}
 setPair(index){this.panels.forEach((p,i)=>p.setProject(projects[pairs[index][i]],pairs[index][i]));}
 setMirror(value){this.panels.forEach(p=>p.uniforms.uMirror.value=Number(value));}
 setBackground(texture,w,h){this.panels.forEach(p=>{p.uniforms.uBackground.value=texture;p.uniforms.uResolution.value.set(w,h);});}
 update(time,dt,motion){this.panels.forEach(p=>p.update(time,dt,motion));}
 dispose(){this.panels.forEach(p=>p.dispose());}
}
