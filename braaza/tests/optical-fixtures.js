/** Real GPU fixtures, using production shaders and label textures. */
export function opticalFixtures(f){
 const g=f.gl,pool=f.mediaPool,resources=[],add=(name,w,h,options={})=>{const t=pool.color('fixture-'+name,w,h,{hdr:true,...options});resources.push(t);return t;};
 const set=t=>{f.setTarget(t);g.disable(g.CULL_FACE);g.disable(g.BLEND);g.depthMask(true);g.clearColor(0,0,0,0);g.clearDepth(1);g.clear(g.COLOR_BUFFER_BIT|(t.depth?g.DEPTH_BUFFER_BIT:0));};
 const bind=(texture,unit)=>{g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,texture);};
 const read=t=>{f.setTarget(t);const d=new Float32Array(t.w*t.h*4);g.readPixels(0,0,t.w,t.h,g.RGBA,g.FLOAT,d);return d;};
 const black=add('black',1,1),label=add('transparent',1,1);set(black);set(label);
 const target=add('card',768,360,{depth:true}),I=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),VP=new Float32Array([1/2.4,0,0,0,0,1/1.125,0,0,0,0,-.1,0,0,0,0,1]);
 const card=(texture,hover)=>{set(target);g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);bind(black.t,0);bind(texture,1);bind(black.t,2);
 f.programs.card.use({uVP:VP,uPreviousVP:VP,uModel:I,uPreviousModel:I,uCamera:[0,0,10],uArt:0,uLabel:1,uBehind:2,uResolution:[768,360],uTime:3,uHover:hover,uPointer:[.5,.035],uTrail:new Float32Array(24),uBurn:0,uIndex:0,uMediaAspect:4.8/2.25,uUseProbe:0,uShadows:0,uUseAO:0,uHasInternalScene:0,uInstanced:0,uVertexSurface:0,uCloth:0,uHistory:0});f.draw(f.meshes.panel);return read(target);};
 const clear=[card(label.t,0),card(label.t,1)],real=[card(f.cards[0].label,0),card(f.cards[0].label,1)];let a=0,b=0;
 for(let y=5;y<=10;y++)for(let x=365;x<402;x++){const at=(y*768+x)*4;a+=clear[1][at]-clear[0][at];b+=real[1][at]-real[0][at];}
 const rim={control:a,withLabel:b,retained:b/Math.max(a,1e-8)};
 const size=256,scene=add('scene',size,size,{depth:true}),particles=add('particles',size,size,{depth:true}),focused=add('focusedDepth',1,1,{depth:true}),out=add('resolve',size,size);
 set(scene);g.clearColor(.006,.008,.012,1);g.clear(g.COLOR_BUFFER_BIT);set(focused);g.clearDepth(140*(14.5-.1)/(14.5*(140-.1)));g.clear(g.DEPTH_BUFFER_BIT);
 set(particles);const vao=g.createVertexArray(),buffer=g.createBuffer();g.bindVertexArray(vao);g.bindBuffer(g.ARRAY_BUFFER,buffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-Math.sin(12.8)*.384,.4,0]),g.STATIC_DRAW);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,3,g.FLOAT,false,0,0);
 const scale=1/Math.tan(.45),cameraZ=17.,aa=(140+.1)/(.1-140),bb=2*140*.1/(.1-140),pv=new Float32Array([scale,0,0,0,0,scale,0,0,0,0,aa,-1,0,-5*scale,bb-cameraZ*aa,cameraZ]);
 g.enable(g.DEPTH_TEST);g.depthMask(false);g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE);f.programs.particles.use({uVP:pv,uTime:0,uDpr:1,uReduced:0,uMotion:0});g.drawArrays(g.POINTS,0,1);g.disable(g.BLEND);g.depthMask(true);g.disable(g.DEPTH_TEST);
 const resolve=depth=>{set(out);g.disable(g.DEPTH_TEST);bind(scene.t,0);bind(particles.t,1);bind(depth,2);bind(black.t,3);bind(black.t,4);f.programs.resolve.use({uScene:0,uParticles:1,uDepth:2,uVelocity:3,uNormal:4,uResolution:[size,size],uFocusDistance:14.5,uQuality:1,uMotionEnabled:0,uShutter:0});f.full();return read(out);};
 const far=resolve(scene.depth),near=resolve(focused.depth);let farPeak=0,nearPeak=0;for(let i=0;i<far.length;i+=4){farPeak=Math.max(farPeak,far[i]-.006);nearPeak=Math.max(nearPeak,near[i]-.006);}
 const sparks={farPeak,nearPeak,retained:farPeak/Math.max(nearPeak,1e-8)};
 const visibility=add('visibility',2,1),depthOpen=add('open',1,1,{depth:true}),depthClosed=add('closed',1,1,{depth:true});set(depthOpen);set(depthClosed);g.clearDepth(0);g.clear(g.DEPTH_BUFFER_BIT);g.clearDepth(1);
 const visible=depth=>{set(visibility);g.disable(g.DEPTH_TEST);bind(depth,0);bind(black.t,1);f.programs.visibility.use({uDepth:0,uPrevious:1,uFlare:[.5,.5,.5,1,.5,.5,.5,0],uResolution:[256,256],uBlend:1});f.full();return [...read(visibility)];};
 const flare={open:visible(depthOpen.depth),closed:visible(depthClosed.depth)};
 const cascade=add('cascade',256,256);
 const shot=time=>{set(cascade);g.disable(g.DEPTH_TEST);f.programs.lava.use({uVP:I,uPreviousVP:I,uModel:I,uPreviousModel:I,uSurface:[0,0,0,1],uInstanced:0,uVertexSurface:0,uCloth:0,uHistory:0,uReflection:0,uTime:time,uSeed:2.35,uFall:1});f.draw(f.meshes.plane);return read(cascade);};
 const c0=shot(3),c1=shot(3.4);let bottomAlpha=0,change=0,gx=0,gy=0;
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;if(y<12)bottomAlpha+=c0[i+3];change+=Math.abs(c0[i]-c1[i]);if(x>0)gx+=Math.abs(c0[i]-c0[i-4]);if(y>0)gy+=Math.abs(c0[i]-c0[i-1024]);}
 const lava={bottomAlpha:bottomAlpha/(12*256),change:change/65536,longitudinal:gx/Math.max(gy,1e-8)};
 const error=g.getError();g.deleteVertexArray(vao);g.deleteBuffer(buffer);resources.forEach(t=>t.dispose());g.clearDepth(1);f.setTarget(null);return{rim,sparks,flare,lava,error};
}
