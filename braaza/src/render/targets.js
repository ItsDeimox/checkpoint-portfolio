/** Own every attachment. Shared depth belongs to its original framebuffer only. */
export class TargetPool {
 constructor(gl){this.gl=gl;this.items=[];this.bytes=0;}
 color(id,w,h,{hdr=true,depth=false,sharedDepth=null,nearest=false}={}){
  const g=this.gl;w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));
  const f=g.createFramebuffer(),t=g.createTexture();g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,t);
  g.texImage2D(g.TEXTURE_2D,0,hdr?g.RGBA16F:g.RGBA8,w,h,0,g.RGBA,hdr?g.HALF_FLOAT:g.UNSIGNED_BYTE,null);
  this.parameters(nearest);g.bindFramebuffer(g.FRAMEBUFFER,f);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,t,0);
  let dt=sharedDepth,ownDepth=false;
  if(depth){ownDepth=true;dt=g.createTexture();g.bindTexture(g.TEXTURE_2D,dt);g.texImage2D(g.TEXTURE_2D,0,g.DEPTH_COMPONENT24,w,h,0,g.DEPTH_COMPONENT,g.UNSIGNED_INT,null);this.parameters(true);}
  if(dt)g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,dt,0);
  if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Incomplete framebuffer: '+id);
  const bytes=w*h*((hdr?8:4)+(ownDepth?4:0));this.bytes+=bytes;
  const obj={id,w,h,f,t,depth:dt,hdr,bytes,dispose:()=>{if(obj.disposed)return;obj.disposed=true;g.deleteFramebuffer(f);g.deleteTexture(t);if(ownDepth)g.deleteTexture(dt);this.bytes-=bytes;}};this.items.push(obj);return obj;
 }
 depth(id,size,height=size){const g=this.gl,f=g.createFramebuffer(),t=g.createTexture();g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,t);g.texImage2D(g.TEXTURE_2D,0,g.DEPTH_COMPONENT24,size,height,0,g.DEPTH_COMPONENT,g.UNSIGNED_INT,null);this.parameters(true);g.bindFramebuffer(g.FRAMEBUFFER,f);g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,t,0);g.drawBuffers([g.NONE]);g.readBuffer(g.NONE);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Incomplete depth '+id);
 const bytes=size*height*4;this.bytes+=bytes;const obj={id,w:size,h:height,f,t,depth:t,bytes,dispose:()=>{if(obj.disposed)return;obj.disposed=true;g.deleteFramebuffer(f);g.deleteTexture(t);this.bytes-=bytes;}};this.items.push(obj);return obj;}
 parameters(nearest=false){const g=this.gl;for(const[k,v]of[[g.TEXTURE_MIN_FILTER,nearest?g.NEAREST:g.LINEAR],[g.TEXTURE_MAG_FILTER,nearest?g.NEAREST:g.LINEAR],[g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE],[g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE]])g.texParameteri(g.TEXTURE_2D,k,v);}
 dispose(){this.items.forEach(t=>t.dispose());this.items=[];}
}
export function copyColor(g,from,to){if(from===to)throw Error('Framebuffer feedback');g.bindFramebuffer(g.READ_FRAMEBUFFER,from.f);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,to.f);g.blitFramebuffer(0,0,from.w,from.h,0,0,to.w,to.h,g.COLOR_BUFFER_BIT,g.NEAREST);}
