/** WebGL2 interface lighting. DOM remains interactive, semantic, and accessible. */
const vertex=`#version 300 es
precision highp float;
out vec2 vUv;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUv=p*.5;gl_Position=vec4(p-1.,0.,1.);}`;
const fragment="#version 300 es\nprecision highp float;\nin vec2 vUv;\nuniform vec2 uResolution,uPointer;\nuniform float uTime,uHover,uKind;\nout vec4 outColor;\nfloat hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}\nvoid main(){\n vec2 uv=vUv;vec2 aspect=vec2(uResolution.x/max(uResolution.y,1.),1.);vec2 p=(uv-uPointer)*aspect;\n float radial=exp(-dot(p,p)*(uKind>.5?11.:3.8))*uHover;\n float t=uTime*.13;\n float vein=noise(uv*vec2(24.,12.)+vec2(t,-t*.23));\n float fracture=pow(1.-abs(fract((uv.x*1.9+uv.y*1.3+vein*.09)*14.)-.5)*2.,18.);\n float edge=min(min(uv.x,1.-uv.x)*uResolution.x,min(uv.y,1.-uv.y)*uResolution.y);\n float glassEdge=exp(-edge*(uKind>.5?.55:.36));\n float glint=pow(max(sin(uv.x*20.+uv.y*5.-uTime*.8),0.),16.);\n vec3 cyan=vec3(.24,.82,1.05);\n vec3 base=uKind>.5?vec3(.015,.027,.035):vec3(.019,.029,.034);\n vec3 light=cyan*(radial*(uKind>.5?.25:.11)+fracture*(.007+radial*.12)+glassEdge*(.025+radial*.20)+glassEdge*glint*.065);\n float grain=(hash(gl_FragCoord.xy+floor(uTime*6.))-.5)*.005;\n outColor=vec4(max(base+light+grain,0.),1.);\n}";
class Surface {
 constructor(target,kind){
  this.target=target;this.kind=kind;this.mouse=[.5,.5];this.hover=0;this.goal=0;
  this.canvas=document.createElement('canvas');this.canvas.className='glsl-ui-layer';this.canvas.setAttribute('aria-hidden','true');
  target.prepend(this.canvas);
  const gl=this.gl=this.canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'low-power'});
  if(!gl){this.canvas.remove();return;}
  try{
   const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment),program=this.program=gl.createProgram();
   gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   gl.deleteShader(v);gl.deleteShader(f);this.uniforms={};
   for(const name of ['uResolution','uPointer','uTime','uHover','uKind'])this.uniforms[name]=gl.getUniformLocation(program,name);
   this.ready=true;
  }catch(e){console.warn('Interface GLSL unavailable',e);this.canvas.remove();this.gl=null;}
  target.addEventListener('pointermove',e=>{const r=target.getBoundingClientRect();this.mouse=[(e.clientX-r.left)/Math.max(r.width,1),1-(e.clientY-r.top)/Math.max(r.height,1)];this.goal=1;},{passive:true});
  target.addEventListener('pointerleave',()=>{this.goal=0;},{passive:true});
  target.addEventListener('focusin',()=>{this.goal=.7;});
  target.addEventListener('focusout',()=>{this.goal=0;});
 }
 render(time,dt){
  if(!this.ready)return;
  const g=this.gl,r=this.target.getBoundingClientRect();
  if(r.width<2||r.height<2)return;
  const ratio=Math.min(devicePixelRatio||1,1.5),w=Math.min(1400,Math.round(r.width*ratio)),h=Math.min(1000,Math.round(r.height*ratio));
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;g.viewport(0,0,w,h);}
  this.hover+=(this.goal-this.hover)*(1-Math.exp(-9*dt));
  g.useProgram(this.program);g.uniform2f(this.uniforms.uResolution,w,h);g.uniform2f(this.uniforms.uPointer,...this.mouse);
  g.uniform1f(this.uniforms.uTime,time);g.uniform1f(this.uniforms.uHover,this.hover);g.uniform1f(this.uniforms.uKind,this.kind);
  g.drawArrays(g.TRIANGLES,0,3);
 }
 dispose(){this.gl?.deleteProgram(this.program);this.canvas.remove();}
}
export function installShaderUI(){
 const sheet=document.querySelector('#sheet');if(!sheet)return;
 const surfaces=[];const base=new Surface(sheet,0);surfaces.push(base);
 let start=performance.now(),last=start,handle=0;
 const install=()=>{const targets=sheet.querySelectorAll('.button,.contact-option,.close-sheet');
  for(const target of targets)if(!target.dataset.glslUi){target.dataset.glslUi='1';surfaces.push(new Surface(target,1));}
 };
 const observer=new MutationObserver(install);observer.observe(sheet,{childList:true,subtree:true});install();
 function frame(now){
  handle=requestAnimationFrame(frame);
  if(!sheet.open||document.hidden)return;
  const dt=Math.min(.05,(now-last)/1000);last=now;
  for(const s of surfaces)if(s.target.isConnected)s.render((now-start)/1000,dt);
 }
 handle=requestAnimationFrame(frame);
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(handle);observer.disconnect();surfaces.forEach(s=>s.dispose());},{once:true});
}
