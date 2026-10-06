import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await fs.mkdir(path.join(root,'vendor'),{recursive:true});
await build({stdin:{contents:`import * as THREE from 'three';\nimport {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';\nimport {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';\nexport {THREE,RoomEnvironment,mergeGeometries};`,resolveDir:root,sourcefile:'vendor-entry.js'},bundle:true,minify:true,format:'esm',platform:'browser',target:'es2020',outfile:path.join(root,'vendor/deps.js'),legalComments:'eof'});
await fs.copyFile(path.join(root,'node_modules/three/LICENSE'),path.join(root,'vendor/THREE-LICENSE.txt'));
console.log('Built pinned Three.js 0.180.0 runtime. No CDN at runtime.');
