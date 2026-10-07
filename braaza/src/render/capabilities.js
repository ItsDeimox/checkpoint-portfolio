import {TargetPool} from './targets.js';
export function probeCapabilities(gl){
 const g=gl,pool=new TargetPool(g);const caps={webgl2:true,floatColor:!!g.getExtension('EXT_color_buffer_float'),floatLinear:!!g.getExtension('OES_texture_float_linear'),maxTextures:g.getParameter(g.MAX_TEXTURE_IMAGE_UNITS),maxSize:g.getParameter(g.MAX_TEXTURE_SIZE),maxDrawBuffers:g.getParameter(g.MAX_DRAW_BUFFERS),renderer:g.getParameter(g.RENDERER)};
 if(caps.floatColor){try{const t=pool.color('float-probe',4,4);g.bindFramebuffer(g.FRAMEBUFFER,t.f);g.clearColor(2,.5,.25,1);g.clear(g.COLOR_BUFFER_BIT);const data=new Float32Array(4);g.readPixels(0,0,1,1,g.RGBA,g.FLOAT,data);caps.floatColor=Math.abs(data[0]-2)<.01&&g.getError()===0;}catch{caps.floatColor=false;}finally{pool.dispose();g.bindFramebuffer(g.FRAMEBUFFER,null);}}
 if(caps.maxTextures<12||caps.maxDrawBuffers<3)throw Error('Insufficient rendering capabilities');return caps;
}
