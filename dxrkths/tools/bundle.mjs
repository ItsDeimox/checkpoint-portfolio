import {build} from 'esbuild';
import {ensureBrandAsset} from './prepare-brand.mjs';
await ensureBrandAsset();
await build({entryPoints:['src/scene/room-hologram-scene.js'],bundle:true,format:'esm',target:'es2022',minify:true,sourcemap:false,outfile:'src/render/showroom.bundle.js',legalComments:'eof'});
console.log('DXT: real-geometry 3D scene bundled.');
