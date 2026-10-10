import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

// MP3 prepared from the Lagoon WAV supplied for this showroom. The browser
// only receives our own same-origin verified asset, never the upload URL.
export const MUSIC_SOURCE = Object.freeze({
  url:'https://d2ol7oe51mr4n9.cloudfront.net/user_3IMtiokXx52FyruOvzDYoL5cvK8/0d03d311-f79b-41e7-9f17-d5a8f5408918.mp3',
  sha256:'77d1a3e4509d6dcb8b867d7f7065c4b45c4e94940eda33b208b4edb55788b8c3',
  bytes:3068947,
});
const root = fileURLToPath(new URL('..', import.meta.url));
const digest = data => createHash('sha256').update(data).digest('hex');

export async function ensureMusicAsset({directory=root,fetcher=fetch}={}) {
  const target=path.join(directory,'assets/audio/lagoon.mp3');
  try {
    const cached=await fs.readFile(target);
    if(cached.length===MUSIC_SOURCE.bytes && digest(cached)===MUSIC_SOURCE.sha256)return target;
  } catch(error){if(error.code!=='ENOENT')throw error;}
  const response=await fetcher(MUSIC_SOURCE.url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`Cannot fetch Lagoon soundtrack: HTTP ${response.status}`);
  const data=Buffer.from(await response.arrayBuffer());
  if(data.length!==MUSIC_SOURCE.bytes || digest(data)!==MUSIC_SOURCE.sha256){
    throw new Error('Lagoon music integrity/size check failed.');
  }
  await fs.mkdir(path.dirname(target),{recursive:true});
  const temporary=`${target}.${process.pid}.tmp`;
  try{await fs.writeFile(temporary,data);await fs.rename(temporary,target);}
  finally{await fs.rm(temporary,{force:true});}
  return target;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await ensureMusicAsset();
