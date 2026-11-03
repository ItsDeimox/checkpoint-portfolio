/** Validate decoded copies. Never rewrites a published/source asset. */
import fs from'node:fs/promises';
import path from'node:path';
import {fileURLToPath}from'node:url';
import {createHash}from'node:crypto';
import validator from'gltf-validator';
import {NodeIO}from'@gltf-transform/core';
import {ALL_EXTENSIONS}from'@gltf-transform/extensions';
import {MeshoptDecoder}from'meshoptimizer';
const root=fileURLToPath(new URL('../../',import.meta.url)),manifest=JSON.parse(await fs.readFile(path.join(root,'public/assets/manifest.json'),'utf8'));
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}),reports=[];
for(const[key,file]of Object.entries(manifest.files)){
 if(key==='studio')continue;
 const bytes=await fs.readFile(path.join(root,'public',file.url));
 if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Asset integrity mismatch: '+key);
 const doc=await io.readBinary(bytes);
 for(const extension of doc.getRoot().listExtensionsUsed())if(extension.extensionName==='EXT_meshopt_compression')extension.dispose();
 const decoded=await io.writeBinary(doc),result=await validator.validateBytes(decoded,{uri:key+'.glb',maxIssues:1000,writeTimestamp:false});
 const report={key,sha256:file.sha256,bytes:file.bytes,triangles:file.triangles,...result.issues};reports.push(report);
 console.log(key,JSON.stringify({errors:report.numErrors,warnings:report.numWarnings,truncated:report.truncated}));
}
const result={validator:validator.version(),validation:'Losslessly decoded copies; source and published bytes unchanged. Format checks are not interior-completeness or engineering-fidelity checks.',reports};
await fs.writeFile(process.env.ASSET_REPORT||'/tmp/spacex-gltf-validation.json',JSON.stringify(result,null,2)+'\n');
if(reports.some(r=>r.numErrors||r.numWarnings||r.truncated))process.exitCode=1;
