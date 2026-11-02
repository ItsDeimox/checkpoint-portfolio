/** Present the original docking assembly using the creator's existing keyframe, not a guessed hinge. */
export function applyDragonSourcePose(doc){
 const channel=doc.getRoot().listAnimations().flatMap(a=>a.listChannels()).find(c=>c.getTargetPath()==='rotation'&&c.getTargetNode()?.getName()==='Circle.001_2');
 const sampler=channel?.getSampler(),times=sampler?.getInput()?.getArray(),values=sampler?.getOutput()?.getArray();
 if(!times||!values||sampler.getInterpolation()==='CUBICSPLINE')throw Error('Required authored Dragon nose animation is missing');
 const index=Array.from(times).findIndex(time=>Math.abs(time-100/24)<.0001);
 if(index<0)throw Error('Required authored Dragon docking keyframe is missing');
 const rotation=Array.from(values.slice(index*4,index*4+4));
 if(rotation.length!==4||!rotation.every(Number.isFinite))throw Error('Invalid authored nose rotation');
 channel.getTargetNode().setRotation(rotation);
 return {time:times[index],node:channel.getTargetNode().getName(),rotation};
}
