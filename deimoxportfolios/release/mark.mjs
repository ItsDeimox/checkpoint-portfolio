import {readFile,writeFile} from 'node:fs/promises';
const manifest=JSON.parse(await readFile(new URL('./manifest.json',import.meta.url),'utf8'));
await writeFile(new URL('../dist/build-info.json',import.meta.url),JSON.stringify({version:manifest.version,sourceSha256:manifest.sha256,sourceFiles:Object.keys(manifest.files).length,assets:Object.keys(manifest.assets).length},null,2)+'\n');
