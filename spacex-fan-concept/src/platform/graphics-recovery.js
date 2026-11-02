/** Serialize context recovery and prevent stale asynchronous work from reviving a lost viewer. */
export function createGraphicsRecovery({release=()=>{},rebuild,complete,fail}){
 let generation=0,blocked=false,busy=false,disposed=false;
 return {
  get blocked(){return blocked;},
  lose(){generation++;blocked=true;busy=false;try{release();}catch(error){fail(error);}},
  async restore(){
   if(disposed||!blocked||busy)return;busy=true;const current=generation;
   try{await rebuild();if(disposed||current!==generation)return;blocked=false;complete();}
   catch(error){if(!disposed&&current===generation)fail(error);}
   finally{if(current===generation)busy=false;}
  },
  dispose(){disposed=true;generation++;blocked=true;busy=false;}
 };
}
