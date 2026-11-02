/** Identity consistency is not engineering accuracy or legal clearance. */
export function readSourceJSON(bytes,format='glb'){
 if(format==='gltf')return JSON.parse(bytes.toString('utf8'));
 if(format!=='glb'||bytes.length<20||bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw Error('Invalid GLB header');
 const length=bytes.readUInt32LE(12);
 if(bytes.readUInt32LE(16)!==0x4e4f534a||length<2||length%4!==0||length>bytes.length-20)throw Error('Invalid GLB JSON chunk');
 return JSON.parse(bytes.subarray(20,20+length).toString('utf8'));
}
function sourceURL(value){
 const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Invalid source URL');
 return u.href.replace(/\/$/,'');
}
export function reviewSource(json,expected){
 const extras=json?.asset?.extras;
 if(json?.asset?.version!=='2.0'||!extras||!expected)throw Error('Missing source identity');
 const author=String(extras.author??'').split(' (')[0].trim();
 const license=String(extras.license??'').match(/^([A-Z0-9.-]+)(?:\s|\(|$)/)?.[1];
 if(!author||author!==expected.author||license!==expected.license||!['CC-BY-4.0','CC0-1.0'].includes(license)||sourceURL(extras.source)!==sourceURL(expected.source))throw Error('Source author, license or URL differs from attribution');
 return {identityMatched:true,engineeringVerified:false,author,license,source:sourceURL(extras.source),title:String(extras.title??'')};
}
