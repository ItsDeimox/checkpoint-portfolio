const USER_ID=1980621685, GROUPS=[35542723,379822883];
export const IMAGE_HOST='https://tr.rbxcdn.com/30DAY-Avatar-E363B4D13953A1967CD9F17F2FAAA525-Png/420/420/Avatar/Png/noFilter';
let cache=null,cachedAt=0;
const safeAvatar=url=>{try{const u=new URL(url);return u.protocol==='https:'&&u.hostname.endsWith('.rbxcdn.com')?u.href:null;}catch{return null;}};
async function json(url,fetcher){const r=await fetcher(url,{signal:AbortSignal.timeout(4500),headers:{Accept:'application/json'}});if(!r.ok)throw Error('Roblox HTTP '+r.status);return r.json();}
export async function getRobloxProfile(fetcher=fetch){
 const fallback={name:'Xaudriy',displayName:'DXT',id:USER_ID,avatar:IMAGE_HOST,groups:[],live:false};
 const [profile,thumb,...groups]=await Promise.allSettled([json(`https://users.roblox.com/v1/users/${USER_ID}`,fetcher),json(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${USER_ID}&size=420x420&format=Png&isCircular=false`,fetcher),...GROUPS.map(id=>json(`https://games.roblox.com/v2/groups/${id}/games?accessFilter=Public&limit=10&sortOrder=Desc`,fetcher))]);
 if(profile.status==='fulfilled'){fallback.name=String(profile.value.name||fallback.name).slice(0,50);fallback.displayName=String(profile.value.displayName||fallback.displayName).slice(0,50);fallback.live=true;}
 if(thumb.status==='fulfilled'){const t=thumb.value.data?.find(t=>t.targetId===USER_ID&&t.state==='Completed');fallback.avatar=safeAvatar(t?.imageUrl)||fallback.avatar;}
 groups.forEach((result,i)=>{if(result.status!=='fulfilled')return;fallback.groups.push({id:GROUPS[i],games:(result.value.data||[]).filter(g=>Number.isSafeInteger(g.rootPlace?.id)&&g.rootPlace.id>0).map(g=>({id:g.rootPlace.id,name:String(g.name).slice(0,160)}))});});return fallback;
}
export default async function handler(req,res){if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return res.status(405).json({error:'Method not allowed'});}res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=86400');if(!cache||Date.now()-cachedAt>900000){cache=await getRobloxProfile();cachedAt=Date.now();}return res.status(200).json(cache);}
