import {Matrix4} from 'three';

/** Reuse the planar image only while its camera/object mapping is unchanged.
 * Geometry moves and resizes always refresh immediately: never lag a dragged car. */
export class ReflectionBudget {
  constructor(view){
    this.view=view;this.clock=0;this.last=-Infinity;this.valid=false;this.captures=0;
    this.cameraMatrix=new Matrix4();this.projection=new Matrix4();
    const ground=view.ground,draw=ground.onBeforeRender;
    ground.onBeforeRender=(renderer,scene,camera,...rest)=>{
      if(!this.shouldCapture(camera))return;
      const hidden=[];
      if(this.quality==='low'){
        for(const [i,smoke]of (view.smokes??[]).entries())if(i%5!==0&&smoke.visible){hidden.push(smoke);smoke.visible=false;}
        for(const beam of view.beams??[])if(beam.visible){hidden.push(beam);beam.visible=false;}
      }
      try{
        draw.call(ground,renderer,scene,camera,...rest);
        this.cameraMatrix.copy(camera.matrixWorld);this.projection.copy(camera.projectionMatrix);
        this.angle=view.turntable?.angle;this.hover=view.hoverPanel;this.content=view.contentPanel;
        const target=ground.getRenderTarget();this.width=target.width;this.height=target.height;
        this.last=this.clock;this.valid=true;this.captures++;
      }finally{for(const object of hidden)object.visible=true;}
    };
  }
  advance(dt){if(Number.isFinite(dt)&&dt>0)this.clock+=Math.min(dt,.15);}
  invalidate(){this.valid=false;}
  configure(quality){
    this.quality=quality;
    const target=this.view.ground.getRenderTarget(),limit=quality==='low'?0:quality==='high'?4:2;
    const samples=(this.view.optics?.supportedSamples??[]).find(n=>n<=limit)??0;
    if(target.samples!==samples){target.dispose();target.samples=samples;}
    this.invalidate();
  }
  shouldCapture(camera){
    const v=this.view,target=v.ground.getRenderTarget();
    if(!this.valid||!this.cameraMatrix.equals(camera.matrixWorld)||!this.projection.equals(camera.projectionMatrix)
      ||this.angle!==v.turntable?.angle||this.hover!==v.hoverPanel||this.content!==v.contentPanel
      ||this.width!==target.width||this.height!==target.height)return true;
    if(v.settings.paused||v.reduced?.matches)return false;
    const hz=this.quality==='low'?20:this.quality==='high'?60:30;
    return this.clock-this.last>=1/hz-1e-5;
  }
}
