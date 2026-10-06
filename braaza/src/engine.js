import {Program,mesh,target,bind,imageTexture,loadImage} from './gl.js';
import * as S from './shaders.js';
import {rock,panel,tube,cube} from './geometry.js';
import {compose,multiply,perspective,invert,unproject,project,transform} from './math.js';
import {Motion,clamp,wrap,slotY,chainOffset,random,damp,viewMatrix} from './core.js';
import {CONTENT} from './content.js';

/** All visible environment geometry is real 3D, never a screenshot laid over the page. */
export class Forge{
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance'});if(!this.gl)throw Error('WebGL2 indisponível');
  const g=this.gl;this.hdr=!!g.getExtension('EXT_color_buffer_float');this.time=0;this.motion=new Motion(CONTENT.projects.length);this.pointer=[0,0];this.pointerTarget=[0,0];this.hover=-1;this.frames=0;this.paused=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.quality='auto';this.targets=[];this.drawCalls=0;this.contextLost=false;
  this.programs={};for(const [n,v,f] of [['stone',S.vertex,S.stone],['card',S.vertex,S.card],['lava',S.vertex,S.lava],['flame',S.vertex,S.flame],['background',S.full,S.background],['blur',S.full,S.blur],['output',S.full,S.output],['art',S.full,S.art],['particles',S.particlesV,S.particlesF]])this.programs[n]=new Program(g,v,f);
  this.meshes={rock:mesh(g,rock(5)),rock2:mesh(g,rock(32)),cube:mesh(g,cube()),chain:mesh(g,tube('chain')),ring:mesh(g,tube('ring')),panel:mesh(g,panel()),plane:mesh(g,panel(2,2))};this.makeWorld();this.makeSparks();
  this.cards=CONTENT.projects.map((content,index)=>({index,content,hover:0,pointer:[.5,.5],trails:Array(24).fill(0),trailSlot:0,lastTrail:-1,tex:null,label:this.makeLabel(content,index),model:null,inverse:null}));
 }
 async initialize(){
  const g=this.gl;
  for(const c of this.cards){
   const rt=target(g,896,480,false,false);this.setTarget(rt);g.disable(g.DEPTH_TEST);g.disable(g.BLEND);this.programs.art.use({uIndex:c.index});this.full();c.demoTarget=rt;c.tex=rt.t;
   if(c.content.kind==='image'&&c.content.src){try{c.tex=await loadImage(g,c.content.src);}catch{c.mediaError=true;}}
   if(c.content.kind==='video'){
    if(c.content.poster){try{c.tex=await loadImage(g,c.content.poster);}catch{c.mediaError=true;}}
    if(c.content.src){const video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.crossOrigin='anonymous';video.preload='none';video.src=c.content.src;c.video=video;c.videoPlaying=false;}
   }
  }
  this.resize();this.update(0);this.render();
 }
 makeLabel(content,i){const cv=document.createElement('canvas');cv.width=1075;cv.height=575;const ctx=cv.getContext('2d');const bg=ctx.createLinearGradient(0,300,0,575);bg.addColorStop(0,'rgba(0,0,0,0)');bg.addColorStop(1,'rgba(0,0,0,.83)');ctx.fillStyle=bg;ctx.fillRect(0,0,1075,575);ctx.fillStyle='#e9e5df';ctx.font='25px monospace';ctx.fillText(content.title,53,478);ctx.fillStyle='#bcb0a3';ctx.font='13px monospace';ctx.fillText(content.kind==='demo'?'PRÉVIA / DEMONSTRAÇÃO':content.kind==='video'?'VÍDEO / REPRODUZIR':'IMAGEM / EXPLORAR',53,516);ctx.fillStyle='#f2dec5';ctx.font='20px monospace';ctx.fillText(String(i+1).padStart(2,'0'),990,519);return imageTexture(this.gl,cv);}
 makeWorld(){
  const r=random(83);this.objects=[];this.orbits=[];this.fires=[];const add=(type,pos,scale,rot=[0,0,0],kind=0,heat=1)=>this.objects.push({mesh:type,model:compose(pos,rot,Array.isArray(scale)?1:scale),pos,scale,rot,kind,heat,seed:r()*30});
  // Jagged crucibles at both ends of the vertical conveyor.
  for(const top of [false,true]){
   const cy=top?12.25:-.28,cz=top?-2:1.15;
   for(let i=0;i<36;i++){const a=i/36*Math.PI*2,rad=2.15+r()*.6;add(i%3?'rock':'rock2',[Math.cos(a)*rad,cy+(r()-.5)*.8,cz+Math.sin(a)*rad],[.72+r()*.4,.72+r()*.78,.75+r()*.32],[r()*2,r()*2,r()*3],0,1.1);}
   for(let i=0;i<24;i++){const a=r()*Math.PI*2,rad=.5+r()*2.2;add('rock2',[Math.cos(a)*rad,cy-.12,cz+Math.sin(a)*rad],[.22+r()*.42,.15+r()*.34,.22+r()*.4],[r(),r()*2,r()],0,1.7);}
   for(let i=0;i<3;i++)this.orbits.push({model:compose([0,cy+.38+(top?-.12:.0),cz],[-Math.PI/2,0,0],1.10+i*.50),seed:i,kind:2,heat:1});
   for(let j=0;j<4;j++)this.fires.push({pos:[(r()-.5)*2.,top?10.80:1.10,cz-.55+j*.12],rotation:top?[0,0,Math.PI]:[0,0,0],scale:[2.1,top?2.2:2.8,1],seed:j+(top?5:0),opacity:.35});
  }
  // Back wall and silhouettes; no opaque rectangle hiding the composition.
  for(let side of [-1,1])for(let i=0;i<18;i++){add('rock',[side*(7.8+r()*3.5),-2+r()*18,-7-r()*5],[.8+r()*1.2,1.8+r()*3.0,.7+r()*1.2],[r(),r(),r()],0,.035);}
  for(let i=0;i<36;i++){const x=(r()-.5)*17,y=-3+r()*15,z=-4+r()*7;if(Math.abs(x)<4.3)continue;add('rock2',[x,y,z],[.07+r()*.38,.18+r()*.65,.07+r()*.28],[r()*5,r()*5,r()*5],0,.85);}
  // Parallel rails between chain and cards.
  for(const side of [-1,1])add('cube',[side*2.70,5.,-1.35],[.055,7.,.095],[0,0,0],1,.2);
  this.chains=[];for(const side of [-1,1])for(let i=0;i<20;i++)this.chains.push({side,i,secondary:false});
  for(const side of [-1,1])for(let i=0;i<17;i++)this.chains.push({side,i,secondary:true});
 }
 makeSparks(){const g=this.gl,r=random(722),a=[];for(let i=0;i<1300;i++){const spread=r()>.64?13:5.6;a.push((r()-.5)*spread,r(),r());}this.sparkVao=g.createVertexArray();g.bindVertexArray(this.sparkVao);const b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,new Float32Array(a),g.STATIC_DRAW);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,3,g.FLOAT,false,0,0);g.bindVertexArray(null);}
 model(pos,rot,s){const m=compose(pos,rot,1);const sc=Array.isArray(s)?s:[s,s,s];for(let c=0;c<3;c++)for(let row=0;row<4;row++)m[c*4+row]*=sc[c];return m;}
 resize(){const g=this.gl;this.width=innerWidth;this.height=innerHeight;this.mobile=this.width<this.height*.88;const cap=this.quality==='low'?.8:this.quality==='high'?1.7:this.mobile?1.15:1.35;this.dpr=Math.min(devicePixelRatio||1,cap);const w=Math.max(4,Math.round(this.width*this.dpr)),h=Math.max(4,Math.round(this.height*this.dpr));this.canvas.width=w;this.canvas.height=h;this.targets.forEach(t=>t.dispose());this.targets=[];const add=(w,h,d=false)=>{const t=target(g,Math.max(2,w),Math.max(2,h),this.hdr,d);this.targets.push(t);return t;};this.sceneTarget=add(w,h,true);this.blooms=[2,4,8].map(s=>[add(Math.ceil(w/s),Math.ceil(h/s)),add(Math.ceil(w/s),Math.ceil(h/s))]);this.update(0);}
 setTarget(t){const g=this.gl;g.bindFramebuffer(g.FRAMEBUFFER,t?.f??null);g.viewport(0,0,t?.w??this.canvas.width,t?.h??this.canvas.height);}
 full(){const g=this.gl;g.bindVertexArray(null);g.drawArrays(g.TRIANGLES,0,3);}
 draw(m){const g=this.gl;g.bindVertexArray(m.vao);g.drawElements(g.TRIANGLES,m.count,g.UNSIGNED_INT,0);this.drawCalls++;}
 update(dt){
  this.motion.step(dt,this.reduced);if(!this.paused&&!this.reduced)this.time+=dt;
  for(let i=0;i<2;i++)this.pointer[i]=damp(this.pointer[i],this.pointerTarget[i],4,dt);
  this.camera=this.mobile?[this.pointer[0]*.08,4.0,17.9]:[this.pointer[0]*.22,4.1+this.pointer[1]*.10,13.8];
  // Portrait crops the peripheral cliffs, not the usable width of the media.
  let fov=this.mobile?2*Math.atan(3.8/(this.camera[2]*(this.width/this.height))):.9;
  this.vp=multiply(perspective(fov,this.width/this.height,.1,70),viewMatrix(this.camera,[0,5.3,0]));
  for(const c of this.cards){
   if(c.video){const play=this.hover===c.index&&!this.paused&&!this.reduced;if(play&&!c.videoPlaying){c.videoPlaying=true;c.video.play().catch(()=>{c.mediaError=true;});}else if(!play&&c.videoPlaying){c.video.pause();c.videoPlaying=false;}}
   c.y=slotY(c.index,this.motion.value,this.cards.length);c.hover=damp(c.hover,c.index===this.hover?1:0,8,dt);const sc=1.0+c.hover*.025;c.model=this.model([0,c.y,-.055*c.y+c.hover*.21],[.015+(c.pointer[1]-.5)*c.hover*.028,.055+(c.pointer[0]-.5)*c.hover*.06,-.074],sc);c.inverse=invert(multiply(this.vp,c.model));c.screen=project(multiply(this.vp,c.model),[0,0,0]);}
 }
 point(x,y,time){this.pointerTarget=[x*2-1,1-y*2];const h=this.pick(x,y);this.hover=h?.index??-1;if(h){const c=this.cards[h.index];c.pointer=h.uv;if(!this.reduced&&time-c.lastTrail>.04){c.lastTrail=time;const j=(c.trailSlot++%6)*4;c.trails.splice(j,4,...h.uv,this.time,.65);}}return h;}
 clear(){this.hover=-1;this.pointerTarget=[0,0];}
 pick(x,y){let nearest=null;for(const c of this.cards){if(!c.inverse||c.y>10.8)continue;const a=unproject(c.inverse,x*2-1,1-y*2,-1),b=unproject(c.inverse,x*2-1,1-y*2,1),dz=b[2]-a[2];if(Math.abs(dz)<1e-8)continue;const t=-a[2]/dz;if(t<0||t>1)continue;const px=a[0]+(b[0]-a[0])*t,py=a[1]+(b[1]-a[1])*t;if(Math.abs(px)<2.38&&Math.abs(py)<1.10&&(!nearest||c.screen[2]<nearest.depth))nearest={index:c.index,uv:[px/4.8+.5,py/2.25+.5],depth:c.screen[2]};}return nearest;}
 render(){
  const g=this.gl;this.drawCalls=0;this.setTarget(this.sceneTarget);g.clearColor(.001,.001,.001,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.disable(g.DEPTH_TEST);g.disable(g.BLEND);g.disable(g.CULL_FACE);
  this.programs.background.use({uResolution:[this.canvas.width,this.canvas.height],uPointer:this.pointer,uTime:this.time,uMotion:this.motion.velocity});this.full();
  g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.depthMask(true);g.enable(g.CULL_FACE);g.cullFace(g.BACK);
  const p=this.programs.stone;const base={uVP:this.vp,uCamera:this.camera,uTime:this.time};p.use(base);
  for(const o of this.objects){p.use({uModel:this.model(o.pos,o.rot,o.scale),uKind:o.kind,uSeed:o.seed,uHeat:o.heat});this.draw(this.meshes[o.mesh]);}
  for(const link of this.chains){const shift=chainOffset(this.motion.value,link.side);const y=-3+wrap(link.i*.88+shift,17.60),side=link.side;const x=side*(4.55-.115*y)+(link.secondary?side*3.15:0),z=2.35-.25*y-(link.secondary?6:0);const rot=[-.244,link.i%2?Math.PI/2:0,side*.112];const sc=link.secondary?1.2:1.14;p.use({uModel:this.model([x,y,z],rot,sc),uKind:1,uSeed:link.i*.8,uHeat:link.secondary?.25:.70});this.draw(this.meshes.chain);}
  for(const o of this.orbits){p.use({uModel:o.model,uKind:2,uSeed:o.seed,uHeat:1});this.draw(this.meshes.ring);}
  // Molten surfaces are flat in world space, in bowls with real faceted geometry.
  g.disable(g.CULL_FACE);this.programs.lava.use({uVP:this.vp,uTime:this.time,uPower:1});
  for(const [y,z] of [[.20,1.15],[11.83,-2]]){this.programs.lava.use({uModel:this.model([0,y,z],[-Math.PI/2,0,0],[2.23,2.23,2.23])});this.draw(this.meshes.plane);}
  const cp=this.programs.card;g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);cp.use({uVP:this.vp,uCamera:this.camera,uTime:this.time,uArt:0,uLabel:1});
  for(const c of [...this.cards].sort((a,b)=>b.y-a.y)){
   if(c.video&&c.video.readyState>=2&&c.videoPlaying){if(!c.videoTex)c.videoTex=imageTexture(g,c.video);else{bind(g,c.videoTex,0);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.SRGB8_ALPHA8,g.RGBA,g.UNSIGNED_BYTE,c.video);g.generateMipmap(g.TEXTURE_2D);}c.tex=c.videoTex;}
   const burn=clamp((c.y-9.6)/1.7,0,1);bind(g,c.tex,0);bind(g,c.label,1);cp.use({uModel:c.model,uPointer:c.pointer,uHover:c.hover,uTrail:c.trails,uBurn:burn,uIndex:c.index});this.draw(this.meshes.panel);}
  // Heat stays behind the panels where depth says it belongs.
  g.depthMask(false);g.blendFunc(g.SRC_ALPHA,g.ONE);const fp=this.programs.flame;fp.use({uVP:this.vp,uTime:this.time});
  for(const f of this.fires){fp.use({uModel:this.model(f.pos,f.rotation,f.scale),uSeed:f.seed,uOpacity:f.opacity});this.draw(this.meshes.plane);}
  g.blendFunc(g.SRC_ALPHA,g.ONE);this.programs.particles.use({uVP:this.vp,uTime:this.time,uReduced:+this.reduced,uDpr:this.dpr,uMotion:this.motion.velocity});g.bindVertexArray(this.sparkVao);g.drawArrays(g.POINTS,0,this.mobile?600:1300);g.depthMask(true);g.disable(g.BLEND);g.disable(g.DEPTH_TEST);
  let source=this.sceneTarget;for(let i=0;i<this.blooms.length;i++){const [a,b]=this.blooms[i];this.setTarget(a);bind(g,source.t,0);this.programs.blur.use({uMap:0,uStep:[1/source.w,0],uExtract:+(i===0)});this.full();this.setTarget(b);bind(g,a.t,0);this.programs.blur.use({uMap:0,uStep:[0,1/a.h],uExtract:0});this.full();source=b;}
  this.setTarget(null);bind(g,this.sceneTarget.t,0);bind(g,this.sceneTarget.depth,1);bind(g,this.blooms[0][1].t,2);bind(g,this.blooms[1][1].t,3);bind(g,this.blooms[2][1].t,4);
  this.programs.output.use({uScene:0,uDepth:1,uNear:2,uFar:3,uAir:4,uResolution:[this.canvas.width,this.canvas.height],uTime:this.time,uReduced:+this.reduced,uFocusDistance:this.mobile?18.1:13.6,uQuality:this.quality==='low'?0:1});this.full();this.frames++;
 }
 preview(index){const g=this.gl,t=this.cards[index].demoTarget,bytes=new Uint8Array(t.w*t.h*4);this.setTarget(t);g.readPixels(0,0,t.w,t.h,g.RGBA,g.UNSIGNED_BYTE,bytes);const cv=document.createElement('canvas');cv.width=t.w;cv.height=t.h;const ctx=cv.getContext('2d'),data=ctx.createImageData(t.w,t.h);for(let y=0;y<t.h;y++)for(let x=0;x<t.w;x++){const i=(y*t.w+x)*4,j=((t.h-1-y)*t.w+x)*4;for(let c=0;c<3;c++)data.data[j+c]=Math.round(Math.pow(bytes[i+c]/255,1/2.2)*255);data.data[j+3]=255;}ctx.putImageData(data,0,0);return cv.toDataURL('image/png');}
 inspect(){return {version:'braaza-forge-1.0',api:'WebGL2',hdr:this.hdr,frames:this.frames,drawCalls:this.drawCalls,position:this.motion.value,target:this.motion.target,hover:this.hover,quality:this.quality,reduced:this.reduced,width:this.canvas.width,height:this.canvas.height,chains:[chainOffset(this.motion.value,-1),chainOffset(this.motion.value,1)],cards:this.cards.map(c=>({index:c.index,y:c.y,screen:[(c.screen[0]*.5+.5)*this.width,(.5-c.screen[1]*.5)*this.height]}))};}
}
