import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'dist');fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});
for(const name of ['src','vendor','assets'])fs.cpSync(path.join(root,name),path.join(output,name),{recursive:true});
fs.copyFileSync(path.join(root,'index.html'),path.join(output,'index.html'));
// Small deterministic linker for this project's named ESM imports/exports only.
// It emits a portable build without CDN calls, installs, fonts or service workers.
const modules=new Map();const emitted=[];
function named(spec){return spec.split(',').map(s=>s.trim()).filter(Boolean).map(s=>{const[a,b]=s.split(/\s+as\s+/);return b?`${b}:${a}`:a;}).join(',');}
function compile(file){file=path.normalize(file);if(modules.has(file))return modules.get(file);const id='m'+modules.size;modules.set(file,id);let source=fs.readFileSync(path.join(root,file),'utf8');
 source=source.replace(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?/g,(_,spec,ref)=>{const dep=compile(path.join(path.dirname(file),ref));const destruct=spec.split(',').map(v=>{const[a,b]=v.trim().split(/\s+as\s+/);return b?`${a}:${b}`:a;}).join(',');return `const {${destruct}}=${dep};`;});
 const exports=[];source=source.replace(/export\s+(class|function|const|let|var)\s+([A-Za-z_$][\w$]*)/g,(_,kind,name)=>{exports.push(name);return `${kind} ${name}`;});
 source=source.replace(/export\s*\{([^}]+)\};?/g,(_,spec)=>{exports.push(named(spec));return '';});
 emitted.push(`const ${id}=(()=>{\n${source}\nreturn {${exports.join(',')}};\n})();`);return id;
}
compile('src/main.js');
const assets={};for(const file of fs.readdirSync(path.join(root,'assets/posters'))){const key='assets/posters/'+file;assets[key]='data:image/webp;base64,'+fs.readFileSync(path.join(root,key)).toString('base64');}
const license=fs.readFileSync(path.join(root,'vendor/THREE-LICENSE.txt'),'utf8');
const js=`/* Three.js license:\n${license}\n*/\nwindow.__INLINE_ASSETS__=${JSON.stringify(assets)};\n`+emitted.join('\n');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');html=html.replace('<link rel="stylesheet" href="src/ui/styles.css">',`<style>${fs.readFileSync(path.join(root,'src/ui/styles.css'),'utf8')}</style>`);
const logo='data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,'assets/mark.svg')).toString('base64');html=html.replaceAll('assets/mark.svg',logo).replace('<script type="module" src="src/main.js"></script>',()=>`<script>\n${js.replaceAll('</script','<\\/script')}\n</script>`);
fs.writeFileSync(path.join(output,'Deimox-Portfolio.html'),html);
console.log(`Static site: dist/index.html; portable: dist/Deimox-Portfolio.html (${Math.round(Buffer.byteLength(html)/1024)} KB)`);
