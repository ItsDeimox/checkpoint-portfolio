/** Skip hidden source geometry BEFORE triangle tests; preserve Three.js hit semantics. */
export function createVisiblePicker(){
 const candidates=[],hits=[];let requirePart=false;
 const collect=object=>{if(object.isMesh&&(!requirePart||object.userData.part))candidates.push(object);};
 return {
  pick(raycaster,root,partOnly=false){
   candidates.length=0;hits.length=0;requirePart=partOnly;
   // traverseVisible checks the root subtree, but not its ancestors.
   for(let node=root;node;node=node.parent)if(!node.visible)return null;
   root.traverseVisible(collect);
   raycaster.intersectObjects(candidates,false,hits);
   const nearest=hits[0]??null;
   // Do not retain retired inspection meshes between pointer events.
   candidates.length=0;hits.length=0;
   return nearest;
  }
 };
}
