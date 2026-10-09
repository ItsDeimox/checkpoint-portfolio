import './bundle.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
execFileSync(process.execPath,['--test',...(await fs.readdir('tests')).filter(n=>n.endsWith('.test.mjs')).map(n=>'tests/'+n)],{stdio:'inherit'});
await fs.rm('dist',{recursive:true,force:true});await fs.mkdir('dist');for(const name of['index.html','src','assets'])await fs.cp(name,'dist/'+name,{recursive:true});
for(const route of['groups','projects','about','contact','berserk']){await fs.mkdir('dist/'+route);await fs.copyFile('index.html',`dist/${route}/index.html`);}
await fs.copyFile('index.html','dist/404.html');await fs.writeFile('dist/robots.txt','User-agent: *\nAllow: /\nSitemap: https://dxrkths.vercel.app/sitemap.xml\n');
await fs.writeFile('dist/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['','groups','projects','about','contact'].map(p=>'<url><loc>https://dxrkths.vercel.app/'+p+'</loc></url>').join('')+'</urlset>');
const files={};async function visit(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await visit(p);else files[p.replace(/^dist\//,'')]=createHash('sha256').update(await fs.readFile(p)).digest('hex');}}await visit('dist');await fs.writeFile('dist/build-info.json',JSON.stringify({version:'dxt-reference-r3',commit:process.env.VERCEL_GIT_COMMIT_SHA||null,files},null,2));console.log('DXT static build:',Object.keys(files).length,'files');
