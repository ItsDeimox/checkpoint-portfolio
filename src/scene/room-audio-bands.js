// Web Audio frequency bins are indexed in Hz, not fixed indices tied to one device.
export const AUDIO_FFT_SIZE=2048;
export const ANALYSIS_INTERVAL=1/30;
export class BandEnvelope {
 constructor(sampleRate=48000,fftSize=AUDIO_FFT_SIZE){
  const rate=Number.isFinite(sampleRate)&&sampleRate>0?sampleRate:48000;
  this.bands=[[35,180,28,.035,.23],[2200,10000,70,.025,.16]].map(([lo,hi,gain,attack,release])=>({
   start:Math.max(1,Math.ceil(lo*fftSize/rate)),end:Math.min(fftSize/2-1,Math.floor(hi*fftSize/rate)),gain,attack,release,
  }));
  this.value={bass:0,treble:0};
 }
 reset(){this.value.bass=this.value.treble=0;return this.value;}
 update(data,delta){
  const dt=Number.isFinite(delta)&&delta>0?Math.min(delta,.1):0;
  this.bands.forEach((band,index)=>{
   let power=0;const end=Math.min(band.end,data.length-1),count=Math.max(1,end-band.start+1);
   for(let bin=band.start;bin<=end;bin++){const db=data[bin];if(Number.isFinite(db))power+=10**(Math.min(0,db)/10);}
   const target=Math.max(0,Math.min(1,(Math.sqrt(power/count)-.00025)*band.gain));
   const key=index===0?'bass':'treble',previous=this.value[key];
   this.value[key]=previous+(target-previous)*(1-Math.exp(-dt/(target>previous?band.attack:band.release)));
   if(this.value[key]<.0001)this.value[key]=0;
  });
  return this.value;
 }
}
