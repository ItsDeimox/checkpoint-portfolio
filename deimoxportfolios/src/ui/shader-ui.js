/**
 * Single-context WebGL2 light pass for native dialog elements.
 * The actual modal, its keyboard semantics, hit testing, layout and text stay in HTML.
 * Only optical highlights are rendered here; unlit pixels are fully transparent.
 */
const VERTEX=`#version 300 es
precision highp float;
out vec2 vUv;
void main(){
 vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
 vUv=p*.5;
 gl_Position=vec4(p-1.,0.,1.);
}`;
const FRAGMENT=`#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uResolution,uPointer;
uniform float uTime,uFocus,uReduced;
uniform int uCount;
uniform vec4 uRects[8];
uniform float uLevels[8];
out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
 vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
float roundedBox(vec2 p,vec2 b,float r){
 vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;
}
void main(){
 vec2 px=vUv*uResolution;
 float t=uTime*(1.-uReduced);
 vec2 delta=px-uPointer*uResolution;
 float proximity=exp(-dot(delta,delta)/38000.)*uFocus;
 float frame=roundedBox(px-uResolution*.5,uResolution*.5-vec2(1.4),11.0);
 float rim=exp(-pow((frame+1.0)/2.5,2.));
 float sheen=pow(max(sin(vUv.x*10.0-vUv.y*5.0-t*.3),0.),32.0);
 float shimmer=noise(vUv*vec2(11.,7.)+vec2(t*.06,-t*.028));
 vec3 cyan=vec3(.41,.81,1.00);
 // Glass edge and a faint reflected pool: not a replacement for the dialog background.
 vec3 emission=cyan*(rim*(.022+.23*proximity)+proximity*.013);
 emission+=cyan*vec3(.06,.35,.45)*rim*sheen*.19;
 emission+=cyan*max(shimmer-.57,0.)*.009*proximity;
 float opacity=clamp(rim*(.07+.29*proximity)+proximity*.09,0.,.42);
 // One pass, up to eight native controls. A soft field follows the pointer inside
 // each control and the strongest emission lives inside the glass border.
 for(int i=0;i<8;i++){
  if(i>=uCount)break;
  vec4 rect=uRects[i];
  vec2 origin=rect.xy*uResolution,size=rect.zw*uResolution;
  if(min(size.x,size.y)<2.)continue;
  vec2 q=px-origin;
  float d=roundedBox(q-size*.5,size*.5-vec2(1.8),min(7.0,size.y*.15));
  float inside=1.-smoothstep(-1.5,.7,d);
  float edge=exp(-pow((d+1.3)/2.6,2.));
  float inner=exp(-pow((d+8.)/14.,2.))*inside;
  vec2 field=(q-(uPointer*uResolution-origin))/max(size.y,20.);
  float light=exp(-dot(field,field)*2.1)*uLevels[i];
  float halo=exp(-dot(field,field)*.65)*uLevels[i];
  float sparks=pow(max(sin(q.x*.032+q.y*.02-t*.30),0.),28.);
  float strength=edge*(.10+halo*.50+sparks*.08*uLevels[i])+inner*light*.11+inside*light*.11;
  emission+=cyan*strength;
  opacity=max(opacity,clamp((edge*(.13+halo*.49)+inside*light*.22),0.,.64));
 }
 outColor=vec4(clamp(emission,vec3(0.),vec3(.60)),opacity);
}`;
const clampUi=(value,min,max)=>Math.min(max,Math.max(min,value));
export function installShaderUI(){
 const dialog=document.querySelector('#sheet');
 if(!dialog||dialog.dataset.uiShaderInstalled)return;
 dialog.dataset.uiShaderInstalled='true';
 const canvas=document.createElement('canvas');
 canvas.className='glsl-ui-layer';canvas.setAttribute('aria-hidden','true');
 dialog.appendChild(canvas);
 const state={gl:null,program:null,ready:false,raf:0,last:0,start:performance.now(),pointer:[.5,.5],focus:0,goal:0,levels:new WeakMap(),rects:new Float32Array(32),power:new Float32Array(8),reduced:matchMedia('(prefers-reduced-motion: reduce)')};
 function init(){
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,powerPreference:'low-power'});
  if(!gl){canvas.hidden=true;return;}
  state.gl=gl;
  try{
   const compile=(kind,source)=>{
    const shader=gl.createShader(kind);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const info=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(info);}
    return shader;
   };
   const vertex=compile(gl.VERTEX_SHADER,VERTEX),fragment=compile(gl.FRAGMENT_SHADER,FRAGMENT);
   const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
   gl.deleteShader(vertex);gl.deleteShader(fragment);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   state.program=program;
   state.uniforms=Object.fromEntries(['uResolution','uPointer','uTime','uFocus','uReduced','uCount','uRects[0]','uLevels[0]'].map(key=>[key,gl.getUniformLocation(program,key)]));
   state.ready=true;
  }catch(error){
   console.warn('[Deimox] Interface GLSL fallback:',error.message);
   canvas.hidden=true;state.ready=false;
  }
 }
 function onPointer(event){
  const r=dialog.getBoundingClientRect();
  state.pointer=[clampUi((event.clientX-r.left)/Math.max(1,r.width),0,1),clampUi(1-(event.clientY-r.top)/Math.max(1,r.height),0,1)];
  state.goal=1;
 }
 dialog.addEventListener('pointermove',onPointer,{passive:true});
 dialog.addEventListener('pointerleave',()=>{state.goal=0;},{passive:true});
 dialog.addEventListener('focusin',()=>{state.goal=.75;});
 dialog.addEventListener('focusout',()=>{state.goal=0;});
 function render(now){
  state.raf=requestAnimationFrame(render);
  if(!dialog.open||!state.ready||document.hidden)return;
  const dt=clampUi((now-state.last)/1000,0,.05);state.last=now;
  const rect=dialog.getBoundingClientRect();
  if(rect.width<2||rect.height<2)return;
  const scale=Math.min(devicePixelRatio||1,1.4);
  const w=Math.max(1,Math.min(1400,Math.round(rect.width*scale)));
  const h=Math.max(1,Math.min(1080,Math.round(rect.height*scale)));
  const gl=state.gl;
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
  state.focus+=(state.goal-state.focus)*(1-Math.exp(-8*dt));
  state.rects.fill(0);state.power.fill(0);
  const elements=[...dialog.querySelectorAll('#sheet-content .button,#sheet-content .contact-option,#sheet-content .project-detail>img,#sheet-content .project-list button,.close-sheet')].slice(0,8);
  let count=0;
  for(const element of elements){
   const b=element.getBoundingClientRect();
   if(b.width<4||b.height<4||b.bottom<rect.top||b.top>rect.bottom)continue;
   const goal=element.matches(':hover,:focus-visible') ? .98 : 0;
   const previous=state.levels.get(element)||0;
   const level=previous+(goal-previous)*(1-Math.exp(-10*dt));
   state.levels.set(element,level);
   state.rects.set([(b.left-rect.left)/rect.width,(rect.bottom-b.bottom)/rect.height,b.width/rect.width,b.height/rect.height],count*4);
   state.power[count]=level;
   count++;
  }
  gl.useProgram(state.program);
  gl.uniform2f(state.uniforms.uResolution,w,h);
  gl.uniform2f(state.uniforms.uPointer,state.pointer[0],state.pointer[1]);
  gl.uniform1f(state.uniforms.uTime,(now-state.start)/1000);
  gl.uniform1f(state.uniforms.uFocus,state.focus);
  gl.uniform1f(state.uniforms.uReduced,Number(state.reduced.matches));
  gl.uniform1i(state.uniforms.uCount,count);
  gl.uniform4fv(state.uniforms['uRects[0]'],state.rects);
  gl.uniform1fv(state.uniforms['uLevels[0]'],state.power);
  gl.drawArrays(gl.TRIANGLES,0,3);
 }
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();state.ready=false;},{passive:false});
 canvas.addEventListener('webglcontextrestored',()=>init());
 // The UI pass sleeps outside the modal: no continuous frames or GPU work while closed.
 const open=()=>{
  if(!dialog.open||state.raf)return;
  state.last=performance.now();state.raf=requestAnimationFrame(render);
 };
 const close=()=>{cancelAnimationFrame(state.raf);state.raf=0;state.goal=0;state.focus=0;};
 const observer=new MutationObserver(()=>{if(dialog.open)open();else close();});
 observer.observe(dialog,{attributes:true,attributeFilter:['open']});
 dialog.addEventListener('close',close);
 window.addEventListener('pagehide',()=>{close();observer.disconnect();},{once:true});
 init();if(dialog.open)open();
}
