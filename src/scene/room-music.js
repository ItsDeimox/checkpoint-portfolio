import {AUDIO_FFT_SIZE,ANALYSIS_INTERVAL,BandEnvelope} from './room-audio-bands.js';
import {DEFAULT_TRACK,normalizeMusicSettings} from './room-music-settings.js';

/** One streamed media element and one reusable analyser. No decoder buffer, timers or RAF for analysis. */
export class RoomMusic {
 constructor({settings,defaultTrack=DEFAULT_TRACK,createAudio=()=>new Audio(),createContext=()=>{
  const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Context)throw new Error('Web Audio is unavailable');return new Context();
 },createURL=file=>URL.createObjectURL(file),revokeURL=url=>URL.revokeObjectURL(url),onState=()=>{}}={}){
  Object.assign(this,{createAudio,createContext,createURL,revokeURL,onState});
  this.settings=normalizeMusicSettings(settings);this.defaultTrack=defaultTrack;this.track={...defaultTrack};
  this.enabled=false;this.suspended=false;this.disposed=false;this.status='idle';this.error=null;
  this.sequence=0;this.accumulator=0;this.analysisReads=0;this.levels={bass:0,treble:0};this.listeners=[];
 }
 notify(){this.onState(this.inspect());}
 ensureMedia(){
  if(this.media)return;
  this.media=this.createAudio();Object.assign(this.media,{preload:'none',loop:true,crossOrigin:'anonymous'});
  const listen=(event,handler)=>{this.media.addEventListener(event,handler);this.listeners.push([event,handler]);};
  listen('error',()=>{if(this.enabled)this.fail('Unable to play this track. Choose another file or try again.');});
  listen('waiting',()=>{if(this.enabled&&!this.suspended){this.status='loading';this.notify();}});
  listen('playing',()=>{if(this.enabled&&!this.suspended){this.status='playing';this.error=null;this.notify();}});
  if(this.track.url)this.media.src=this.track.url;
 }
 ensureGraph(){
  this.ensureMedia();if(this.context)return;
  const context=this.createContext();this.context=context;
  this.source=context.createMediaElementSource(this.media);this.analyser=context.createAnalyser();
  this.analyser.fftSize=AUDIO_FFT_SIZE;this.analyser.smoothingTimeConstant=.15;
  this.gain=context.createGain();this.gain.gain.value=this.settings.volume;
  this.source.connect(this.analyser);this.analyser.connect(this.gain);this.gain.connect(context.destination);
  this.data=new Float32Array(this.analyser.frequencyBinCount);
  this.envelope=new BandEnvelope(context.sampleRate,AUDIO_FFT_SIZE);this.levels=this.envelope.value;
 }
 resetLevels(){this.accumulator=0;this.levels.bass=this.levels.treble=0;}
 quiet(){this.media?.pause();this.resetLevels();return this.context?.suspend().catch(()=>{});}
 fail(message){
  this.sequence++;this.enabled=false;this.status='error';this.error=message;
  this.quiet();this.notify();return false;
 }
 async setEnabled(enabled){
  if(this.disposed)return false;
  if(enabled&&!this.track.url){this.error='Choose a music file first.';this.notify();return false;}
  const token=++this.sequence;this.enabled=Boolean(enabled);this.error=null;
  if(!this.enabled){this.status='paused';this.quiet();this.notify();return false;}
  if(this.suspended){this.status='paused';this.notify();return true;}
  let timer;
  try{
   this.ensureGraph();this.status='loading';this.notify();
   // Both browser permission-sensitive calls happen before the first await.
   const resumed=this.context.resume(),playing=this.media.play();
   await Promise.race([Promise.all([resumed,playing]),new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error('Track loading timed out')),12000);
   })]);
   if(token!==this.sequence||this.disposed){if(!this.enabled||this.suspended)this.quiet();return this.enabled;}
   this.status='playing';this.notify();return true;
  }catch(error){
   if(token!==this.sequence||this.disposed)return this.enabled;
   return this.fail(error.name==='NotAllowedError'?'Press Sound to allow music playback.':'Unable to play this track. Choose another file or try again.');
  }finally{clearTimeout(timer);}
 }
 async suspend(){
  if(this.disposed)return;this.suspended=true;this.sequence++;
  if(this.enabled)this.status='paused';const result=this.quiet();this.notify();await result;
 }
 resume(){
  if(this.disposed)return Promise.resolve(false);
  if(!this.suspended)return Promise.resolve(this.enabled);
  this.suspended=false;return this.enabled?this.setEnabled(true):Promise.resolve(false);
 }
 setSettings(settings){
  this.settings=normalizeMusicSettings({...this.settings,...settings});
  if(this.gain)this.gain.gain.setTargetAtTime(this.settings.volume,this.context.currentTime,.035);
  if(this.settings.reactivity===0||this.settings.volume===0)this.resetLevels();
 }
 update(delta,visualsAllowed=true){
  if(!visualsAllowed||!this.enabled||this.suspended||this.disposed||this.status!=='playing'||this.context?.state!=='running'||this.media?.paused||this.media?.readyState<3||this.settings.volume===0||this.settings.reactivity===0){
   this.resetLevels();return this.levels;
  }
  const dt=Number.isFinite(delta)&&delta>0?Math.min(delta,.1):0;this.accumulator+=dt;
  if(this.accumulator+1e-8>=ANALYSIS_INTERVAL){
   const elapsed=this.accumulator;this.accumulator%=ANALYSIS_INTERVAL;
   this.analyser.getFloatFrequencyData(this.data);this.analysisReads++;
   this.envelope.update(this.data,elapsed);
  }
  return this.levels;
 }
 selectFile(file){
  if(!file||!Number.isFinite(file.size)||file.size<=0||file.size>64*1024*1024||!(/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name)||/^audio\//.test(file.type)))throw new Error('Choose an audio file smaller than 64 MB.');
  if(this.disposed)return Promise.resolve(false);
  const url=this.createURL(file);return this.selectTrack({url,title:String(file.name).slice(0,120),local:true});
 }
 useDefault(){return this.selectTrack({...this.defaultTrack});}
 selectTrack(track){
  if(this.disposed)return Promise.resolve(false);
  const enabled=this.enabled,old=this.track;this.sequence++;this.media?.pause();this.resetLevels();
  this.track=track;this.ensureMedia();
  if(track.url)this.media.src=track.url;else this.media.removeAttribute('src');
  this.media.load();
  if(old.local)this.revokeURL(old.url);
  this.error=null;this.status='paused';this.notify();
  return enabled?this.setEnabled(Boolean(track.url)):Promise.resolve(false);
 }
 inspect(){return {enabled:this.enabled,playing:this.status==='playing',status:this.status,error:this.error,title:this.track.title,hasTrack:Boolean(this.track.url),local:Boolean(this.track.local),bass:this.levels.bass,treble:this.levels.treble,time:this.media?.currentTime??0,analysisReads:this.analysisReads};}
 async close(){
  if(this.disposed)return this.closePromise;this.disposed=true;this.enabled=false;this.sequence++;this.status='paused';
  this.media?.pause();this.resetLevels();
  for(const [event,handler]of this.listeners)this.media.removeEventListener(event,handler);this.listeners=[];
  if(this.media){this.media.removeAttribute('src');this.media.load();}
  if(this.track.local)this.revokeURL(this.track.url);
  this.source?.disconnect();this.analyser?.disconnect();this.gain?.disconnect();
  this.closePromise=Promise.resolve(this.context?.close()).catch(()=>{});
  await this.closePromise;
 }
}
