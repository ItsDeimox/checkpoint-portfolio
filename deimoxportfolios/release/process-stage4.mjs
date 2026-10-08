/** Adapt the original release template, then compile independently editable process modules. */
import {readFile,writeFile} from 'node:fs/promises';
const edit=async(path,modify)=>{const old=await readFile(path,'utf8');await writeFile(path,modify(old));};
const replaceOnce=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Template mismatch: '+a);return s.replace(a,b);};
const replaceRange=(s,a,b,body)=>{const start=s.indexOf(a),end=s.indexOf(b,start);if(start<0||end<start)throw Error('Missing template range: '+a);return s.slice(0,start)+body+s.slice(end);};
await edit('src/config.js',s=>replaceOnce(s,'https://portfolio-roblox-20260928-portfolio.deimox.chatgpt.site/','https://deimoxrbx.vercel.app/'));
await edit('src/rendering/renderer.js',s=>{
 s="import {drawProcessSurfaces} from './process-pass.js';\n"+s;
 return replaceRange(s,' drawSurfaces(scene){',' drawButtons(scene){',' drawSurfaces(scene){drawProcessSurfaces(this,scene);}\n');
});
await edit('src/ui/experience.js',s=>{
 s="import {ProcessCards} from './process-cards.js';\n"+s;
 s=replaceRange(s,'  this.processCards=[...this.grid.children]',"  document.addEventListener('click'",'  this.processController=new ProcessCards(this.grid);this.processCards=this.processController.items;\n');
 return replaceRange(s,'  let strongest=null;','  for(const [el,item] of this.buttonStates)',`  this.processController.update(this.scene,dt,processVisible&&!this.sheets.isOpen);
  const rectOf=el=>{const r=el.getBoundingClientRect();return [r.left/this.scene.width,r.top/this.scene.height,r.width/this.scene.width,r.height/this.scene.height];};
`);
});
const css=await readFile('src/styles-process.css','utf8');
await edit('src/styles.css',s=>s+'\n'+css);
await edit('tools/build.mjs',s=>{
 s=replaceOnce(s,"'core/math.js',","'core/math.js','core/process-surface.js',");
 s=replaceOnce(s,"'rendering/gl.js',","'rendering/gl.js','rendering/process-pass.js',");
 return replaceOnce(s,"'ui/experience.js',","'ui/process-cards.js','ui/experience.js',");
});
await edit('src/ui/experience.js',s=>s+"\nimport {installShaderUI} from './shader-ui.js';\ninstallShaderUI();\n");
await edit('src/styles.css',s=>s+"\n"+await readFile('src/styles-glsl-ui.css','utf8'));
await edit('tools/build.mjs',s=>replaceOnce(s,"'ui/process-cards.js','ui/experience.js',","'ui/process-cards.js','ui/shader-ui.js','ui/experience.js',"));
console.log('Process glass stage 4: modules, shader, CSS and portable entry point assembled.');
