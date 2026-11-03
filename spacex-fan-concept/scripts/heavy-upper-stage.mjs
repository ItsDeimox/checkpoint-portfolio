import {prune} from '@gltf-transform/functions';
import {Matrix4} from 'three';

// Giroo's cover halves span the entire upper stage. Keep this separate from
// the shorter interstage sleeve and from the default fleet download.
export async function isolateHeavyUpperStage(doc){
 const root=doc.getRoot(),scene=root.listScenes()[0],nodes=root.listNodes();
 const meshFor=name=>nodes.find(n=>n.getMesh()&&n.getParentNode()?.getName()===name);
 const axis=new Matrix4().makeRotationX(-Math.PI/2)
  .multiply(new Matrix4().fromArray(meshFor('Stage_1_Engine').getWorldMatrix()).invert());
 const parts=[
  ['Stage_2_Cover_Left','heavy-upper-cover',68],['Stage_2_Cover_Right','heavy-upper-cover',68],
  ['Stage_2_FuelTank','heavy-upper-tank',412],['Stage_2_Engine','heavy-upper-engine',1150]
 ];
 const previousRoots=scene.listChildren();
 for(const [name,feature,triangles] of parts){
  const node=meshFor(name);
  if(node?.getMesh().listPrimitives()[0].getIndices().getCount()!==triangles*3)
   throw Error('Unexpected Heavy upper-stage source layout: '+name);
  const pose=axis.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
  scene.addChild(node.setMatrix(pose.toArray()).setName(name).setExtras({sourceAssembly:feature}));
 }
 for(const node of previousRoots)scene.removeChild(node);
 await doc.transform(prune());
}
