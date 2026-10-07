/** Local GLSL sources with explicit include expansion and cycle protection. */
export class ShaderLibrary {
 constructor(base=new URL('../glsl/',import.meta.url)){this.base=base;this.cache=new Map();}
 async read(name,stack=[]){
  if(stack.includes(name))throw Error('Cyclic GLSL include: '+[...stack,name].join(' -> '));
  if(!this.cache.has(name))this.cache.set(name,(async()=>{const response=await fetch(new URL(name,this.base));if(!response.ok)throw Error('GLSL '+name+': HTTP '+response.status);return response.text();})());
  let text=await this.cache.get(name);for(const match of [...text.matchAll(/#include\s+"([^"]+)"/g)])text=text.replace(match[0],await this.read(match[1],[...stack,name]));return text;
 }
 async pair(vertex,fragment){return Promise.all([this.read(vertex),this.read(fragment)]);}
}
