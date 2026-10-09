/** Apply UI-only additions after the approved release and process stage are restored. */
import {readFile,writeFile} from 'node:fs/promises';
const edit=async(path,fn)=>{const input=await readFile(path,'utf8');await writeFile(path,fn(input));};
const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Modal patch: unexpected template '+a);return s.replace(a,b);};
await edit('src/ui/sheets.js',s=>{
 s="import {ModalMaterial} from './modal-material.js';\n"+s;
 s=once(s,'this.onProject=onProject;',"this.onProject=onProject;this.material=new ModalMaterial(this.dialog);\n  this.dialog.addEventListener('cancel',event=>{event.preventDefault();this.close();});");
 s=once(s,"this.dialog.scrollTop=0;document.body.classList.add('dialog-open');","this.dialog.scrollTop=0;this.material.opened();document.body.classList.add('dialog-open');");
 return once(s,'close(){this.dialog.close();}','close(){this.material.close();}');
});
await edit('src/main.js',s=>once(s,'if(stopped){last=now;return;}','if(stopped||(sheets.isOpen&&(!renderer||renderer.frames>0))){last=now;return;}'));
const css=await readFile('src/styles-modal-material.css','utf8');
await edit('src/styles.css',s=>s+'\n'+css);
await edit('tools/build.mjs',s=>once(s,"'ui/sheets.js',","'ui/modal-material.js','ui/sheets.js',"));
console.log('Modal material: native dialog preserved, shared GLSL background installed.');
