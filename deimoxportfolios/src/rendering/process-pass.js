import {bindTexture} from './gl.js';
import {PROCESS_MATERIAL} from '../core/process-surface.js';
export function drawProcessSurfaces(renderer,scene){
  if(scene.weights[2]<.001)return;
  const gl=renderer.gl;gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.SCISSOR_TEST);bindTexture(gl,renderer.art[0],0);const p=renderer.programs.process.use();
  const clip=scene.processClip;
  for(const surface of scene.surfaces){
   const [x,y,w,h]=surface.rect;if(w<=0||h<=0)continue;
   // Bounded work per card; the mobile window clips horizontally, not through the glass glow.
   let left=x*renderer.width-28*renderer.dpr,right=(x+w)*renderer.width+28*renderer.dpr;
   if(scene.mobile){left=Math.max(left,clip[0]*renderer.width);right=Math.min(right,(clip[0]+clip[2])*renderer.width);}
   const bottom=Math.max(0,Math.floor((1-y-h)*renderer.height-72*renderer.dpr)),top=Math.min(renderer.height,Math.ceil((1-y)*renderer.height+28*renderer.dpr));
   left=Math.max(0,Math.floor(left));right=Math.min(renderer.width,Math.ceil(right));if(right<=left||top<=bottom)continue;
   gl.scissor(left,bottom,right-left,top-bottom);
   p.setAll({uResolution:[renderer.width,renderer.height],uRect:surface.rect,uCssSize:surface.cssSize,uPointer:surface.pointer,uHover:surface.hover,uDim:surface.dim,uTheme:surface.color,uIndex:surface.index,uMap:0,uTime:scene.time,uReduced:+scene.reduced,uOpacity:scene.weights[2],uRadius:PROCESS_MATERIAL.radius,uCut:PROCESS_MATERIAL.cut,uGridPitch:PROCESS_MATERIAL.gridPitch});renderer.fullScreen();
  }
  gl.disable(gl.SCISSOR_TEST);
}
