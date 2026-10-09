import {Program,FULLSCREEN,Optics,imageTexture,bind} from './gl.js';
import {advance,clamp,coverUV,qualitySize,DragState} from '../core.js';
const FRAGMENT=`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D art,depthMap;uniform vec2 cover,pointer;uniform float clock,hover,scroll;out vec4 color;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return s;}
void main(){
 // A bounded relief camera. Supplied artwork remains the exact vehicle source.
 bool portrait=cover.x<.99;
 vec2 t=(uv-.5)*cover*(portrait?.96:1.02)+(portrait?vec2(.65,.5):vec2(.505,.38));
 float depth=texture(depthMap,clamp(t,0.,1.)).r;
 vec2 shift=pointer*vec2(.018,.010)*(depth-.24);
 t+=shift+vec2(0.,scroll*.004*(depth-.2));
 vec3 srgb=texture(art,clamp(t,.002,.998)).rgb;
 vec3 base=pow(srgb,vec3(2.2));float lum=dot(base,vec3(.2126,.7152,.0722));
 float vehicle=smoothstep(.52,.85,depth);
 // Night grading is selective: red paint stays rich, road and sky stay neutral.
 float red=smoothstep(.07,.22,srgb.r-max(srgb.g,srgb.b));
 base=mix(vec3(lum)*vec3(.47,.53,.66),base,mix(.30,.97,red));
 base*=mix(.23,.85,vehicle);base+=base*red*.58;
 float upperShade=1.-smoothstep(.66,.94,t.y)*.65;
 base*=upperShade;
 vec2 point=pointer*.5+.5;
 float spot=exp(-dot((uv-point)*vec2(1.5,1.),(uv-point)*vec2(1.5,1.))*10.)*hover;
 float spec=pow(max(lum-.34,0.),1.8)*vehicle;
 base+=vec3(1.,.18,.15)*spec*(.5+spot*.7);
 // Analytic smoke is layered in depth, not a full-screen flashing overlay.
 float time=clock*.10;
 vec2 cloudUV=vec2(uv.x*4.0-time,uv.y*6.0);
 float n=fbm(cloudUV+fbm(cloudUV*1.5+vec2(time,0.)));
 float belt=exp(-pow((uv.y-.34)/.13,2.));
 float edgeSmoke=smoothstep(.28,.85,uv.x)*(1.-vehicle*.73);
 float smoke=pow(max(n-.3,0.),1.5)*belt*edgeSmoke*.34;
 base=mix(base,vec3(.30,.29,.34),smoke);
 float redFog=exp(-pow((uv.y-.075)/.095,2.))*fbm(vec2(uv.x*7.+time,uv.y*5.))*smoothstep(.2,.55,uv.x);
 base+=vec3(.26,.002,.016)*redFog;
 // Headlamps use source-space anchors, so the highlight follows the relief camera.
 for(int i=0;i<2;i++){vec2 lamp=i==0?vec2(.439,.345):vec2(.656,.342);vec2 d=(t-lamp)*vec2(1.78,1.);float core=exp(-dot(d,d)*12000.);float streak=exp(-abs(d.y)*700.)*exp(-abs(d.x)*85.);base+=vec3(1.2,.95,.78)*(core*.55+streak*.14)*(.9+.1*sin(clock*.4));}
 float v=1.-.22*smoothstep(.3,.8,length((uv-.5)*vec2(1.2,.85)));
 color=vec4(max(base*v,0.),1.);
}`;
export class HeroScene{
 constructor(canvas,settings){this.canvas=canvas;this.settings=settings;this.abort=new AbortController();this.drag=new DragState();this.mouse=[0,0];this.pointer=[0,0];this.offset=[0,0];this.hover=0;this.goal=0;this.time=0;this.raf=0;this.frames=0;this.visible=true;this.ready=false;this.dead=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const on=(target,type,fn,opts={})=>target.addEventListener(type,fn,{signal:this.abort.signal,...opts});
 on(canvas,'pointermove',e=>{const r=canvas.getBoundingClientRect();this.mouse=[clamp((e.clientX-r.left)/r.width)*2-1,1-clamp((e.clientY-r.top)/r.height)*2];this.goal=1;if(this.drag.active){this.drag.move(e.pointerId,e.clientX,e.clientY);this.offset[0]=clamp(this.origin[0]+(e.clientX-this.drag.x)/r.width,-.7,.7);this.offset[1]=clamp(this.origin[1]-(e.clientY-this.drag.y)/r.height,-.3,.3);}this.wake();},{passive:true});
 on(canvas,'pointerleave',()=>{this.goal=0;this.mouse=[0,0];this.wake();});
 on(canvas,'pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;this.drag.start(e.pointerId,e.clientX,e.clientY);this.origin=[...this.offset];canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});
 const cancel=()=>{this.drag.cancel();canvas.classList.remove('dragging');};on(canvas,'pointerup',e=>{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);cancel();});on(canvas,'pointercancel',cancel);on(canvas,'lostpointercapture',cancel);
 on(document,'visibilitychange',()=>{if(document.hidden)this.sleep();else this.wake();});on(this.reduced,'change',()=>this.wake());
 on(canvas,'webglcontextlost',e=>{e.preventDefault();this.ready=false;canvas.style.opacity=0;this.sleep();});on(canvas,'webglcontextrestored',()=>this.initialize());
 this.ro=new ResizeObserver(()=>{this.dirty=true;this.wake();});this.ro.observe(canvas);this.io=new IntersectionObserver(([e])=>{this.visible=e.isIntersecting;this.visible?this.wake():this.sleep();});this.io.observe(canvas);this.initialize();}
 async initialize(){try{const g=this.gl=this.canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance'});if(!g)throw Error('WebGL2 unavailable');this.program=new Program(g,FULLSCREEN,FRAGMENT);this.optics=new Optics(g);const [image,depth]=await Promise.all([imageTexture(g,'/assets/images/race.webp'),imageTexture(g,'/assets/images/race-depth.webp')]);if(this.dead){g.deleteTexture(image.texture);g.deleteTexture(depth.texture);return;}this.image=image;this.depth=depth;this.ready=true;this.dirty=true;this.wake();}catch(e){this.error=e.message;this.canvas.style.opacity=0;console.warn('[DXT] Hero fallback:',e.message);}}
 resize(){const r=this.canvas.getBoundingClientRect(),[w,h]=qualitySize(r.width,r.height,devicePixelRatio,this.settings.quality);if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;this.optics.resize(w,h);}this.cover=coverUV(this.image.width,this.image.height,r.width,r.height);this.dirty=false;}
 wake(){if(this.raf||!this.ready||this.dead||!this.visible||document.hidden)return;this.last=performance.now();this.raf=requestAnimationFrame(t=>this.frame(t));}
 sleep(){cancelAnimationFrame(this.raf);this.raf=0;}
 setSettings(){this.dirty=true;this.wake();}
 frame(now){this.raf=0;if(this.dead||!this.ready||!this.visible||document.hidden)return;const dt=Math.min(.05,(now-this.last)/1000);this.last=now;const moving=!this.settings.paused&&!this.reduced.matches;if(moving)this.time+=dt;
 this.hover=advance(this.hover,this.goal,7,dt);for(let i=0;i<2;i++)this.pointer[i]=advance(this.pointer[i],moving?clamp(this.mouse[i]*.45+this.offset[i],-1,1):0,5.5,dt);
 try{if(this.dirty)this.resize();const g=this.gl;g.disable(g.DEPTH_TEST);g.disable(g.BLEND);this.optics.set(this.optics.scene);bind(g,this.image.texture);bind(g,this.depth.texture,1);this.program.use().sampler('art',0).sampler('depthMap',1).set('cover',this.cover).set('pointer',this.pointer).set('clock',this.time).set('hover',this.hover).set('scroll',clamp(scrollY/innerHeight));this.optics.draw();this.optics.finish();this.canvas.style.opacity=1;this.frames++;if(moving||Math.abs(this.hover-this.goal)>.002||this.pointer.some((v,i)=>Math.abs(v-(moving?this.mouse[i]*.45+this.offset[i]:0))>.005))this.raf=requestAnimationFrame(t=>this.frame(t));}catch(e){this.error=e.message;this.ready=false;this.canvas.style.opacity=0;console.warn('[DXT] Hero material:',e.message);}}
 inspect(){return {type:'artwork-relief',ready:this.ready,frames:this.frames,scheduled:!!this.raf,size:[this.canvas.width,this.canvas.height],error:this.error??null,hdr:!!this.optics?.hdr};}
 dispose(){this.dead=true;this.sleep();this.ro.disconnect();this.io.disconnect();this.abort.abort();this.program?.dispose();this.optics?.dispose();if(this.gl){this.gl.deleteTexture(this.image?.texture);this.gl.deleteTexture(this.depth?.texture);}this.ready=false;}
}
