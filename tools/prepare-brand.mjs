import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export const BRAND_SOURCE=Object.freeze({
  url:'https://d2ol7oe51mr4n9.cloudfront.net/user_3IMtiokXx52FyruOvzDYoL5cvK8/398e4e13-e293-470c-8192-408a6f1c5627.glb',
  sha256:'372cf7584a82c7f4b12589e17d5e7cd9ff3abf8962cf4f3caf55e670f753d2da',
  bytes:273932,
});
const root=fileURLToPath(new URL('..',import.meta.url));
const digest=data=>createHash('sha256').update(data).digest('hex');

/** Cache the original attachment locally; deployed clients use only this site's asset. */
export async function ensureBrandAsset({directory=root,fetcher=fetch}={}){
  const target=path.join(directory,'assets/models/DXTlogoPrinted.glb');
  try{const existing=await fs.readFile(target);if(existing.length===BRAND_SOURCE.bytes && digest(existing)===BRAND_SOURCE.sha256)return target;}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const response=await fetcher(BRAND_SOURCE.url,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`Cannot fetch supplied DXT logo: HTTP ${response.status}`);
  const data=Buffer.from(await response.arrayBuffer());
  if(data.length!==BRAND_SOURCE.bytes || digest(data)!==BRAND_SOURCE.sha256)throw new Error('DXT logo integrity check failed.');
  await fs.mkdir(path.dirname(target),{recursive:true});
  const temporary=`${target}.${process.pid}.tmp`;
  try{await fs.writeFile(temporary,data);await fs.rename(temporary,target);}
  finally{await fs.rm(temporary,{force:true});}
  return target;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await ensureBrandAsset();
