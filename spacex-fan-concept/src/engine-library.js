import {createModel}from'./external-models.js';
import {createFade}from'./viewer-motion.js';
/** Load only on explicit inspection; use the existing shared template cache and per-tier cancellation policy. */
export async function loadDetailModel(viewer,family){
 if(!family||viewer.disposed)return;
 const quality=viewer.quality.tier==='high'?'high':'eco',key=family+'-'+quality;
 viewer.assetWants[family]=key;
 if(viewer.detailModels.get(family)?.assetKey===key){const status='licensed-'+quality;if(viewer.assetStates[family]!==status){viewer.assetStates[family]=status;viewer.onAssetStatus?.(family,status);}return;}
 if(viewer.assetJobs.has(key))return viewer.assetJobs.get(key);
 viewer.assetStates[family]='loading';viewer.onAssetStatus?.(family,'loading');
 const job=(async()=>{try{
  const template=await viewer.library.template(family,quality);
  if(viewer.disposed||viewer.assetWants[family]!==key)return;
  const model=createModel(template,viewer.state.index);model.assetKey=key;model.fade=createFade(model.group);viewer.applyTextureBudget(model);
  const previous=viewer.detailModels.get(family);viewer.detailModels.set(family,model);
  if(viewer.detailFamily()===family&&viewer.floor)viewer.applyState(viewer.state,false,true);
  previous?.dispose();viewer.assetStates[family]='licensed-'+quality;viewer.onAssetStatus?.(family,viewer.assetStates[family]);viewer.wake();
 }catch(error){if(!viewer.disposed&&viewer.assetWants[family]===key){viewer.assetStates[family]=viewer.detailModels.has(family)?'licensed-fallback':'unavailable';viewer.onAssetStatus?.(family,viewer.assetStates[family]);console.warn('Authored component unavailable.',error.message);}}
 finally{viewer.assetJobs.delete(key);}})();
 viewer.assetJobs.set(key,job);return job;
}
