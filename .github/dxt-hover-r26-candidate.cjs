const fs=require('node:fs'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo='ItsDeimox/checkpoint-portfolio',base='2534b7a84d8b5417b4ca1220f38bb42367d81bde',baseTree='b3f5ab0381b7e470a0befcd5684f430d88b28019';
const expected=['dxrkths/docs/HOVER-R26.md','dxrkths/src/scene/room-panel-energy.js','dxrkths/src/shaders/panel-prism.js','dxrkths/tests/card-signature.test.mjs','dxrkths/tests/hover-regression.test.mjs'];
const paths=execFileSync('git',['diff','--cached','--name-only'],{encoding:'utf8'}).trim().split('\n').sort();
if(JSON.stringify(paths)!==JSON.stringify(expected))throw Error('Unexpected scope: '+paths);
const report=JSON.parse(fs.readFileSync('/tmp/dxt-r26-qa/native-hover.json','utf8'));
const probe=JSON.parse(fs.readFileSync('/tmp/dxt-r26-qa/pixel-probe.json','utf8'));
if(report.errors.length||!report.steps.every(x=>x.pass)||probe.errors.length||!probe.result.allOriented||!probe.result.reduced||probe.result.glError)throw Error('Browser verification incomplete');
const build=fs.readFileSync('/tmp/dxt-r26-build.log','utf8');
const match=build.match(/# tests (\d+)[\s\S]*?# pass (\d+)\n# fail (\d+)/);
if(!match||match[1]!==match[2]||match[3]!=='0'||Number(match[1])<354)throw Error('Full suite did not pass');
const token=process.env.GITHUB_TOKEN; if(!token)throw Error('Missing built-in GitHub workflow token');
async function api(path,body,method='POST'){
 const response=await fetch('https://api.github.com/repos/'+repo+'/'+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:body?JSON.stringify(body):undefined});
 if(!response.ok)throw Error(method+' '+path+' -> '+response.status+' '+(await response.text()).slice(0,300));return response.json();
}
(async()=>{
 const current=await api('git/ref/heads/main',null,'GET');
 if(current.object.sha!==base)throw Error('Main changed; do not overwrite newer work');
 const entries=[];
 for(const path of paths){
  const data=execFileSync('git',['show',':'+path]);
  const blob=await api('git/blobs',{content:data.toString('base64'),encoding:'base64'});
  entries.push({path,mode:'100644',type:'blob',sha:blob.sha});
 }
 const tree=await api('git/trees',{base_tree:baseTree,tree:entries});
 const commit=await api('git/commits',{message:'feat(dxrkths): give the five cards a distinct prism-trail hover',tree:tree.sha,parents:[base]});
 const result={base,commit:commit.sha,paths,unitPassed:Number(match[2]),browserChecks:report.steps.length+probe.result.orientation.length+2,productionRefChanged:false};
 fs.writeFileSync('candidate.json',JSON.stringify(result,null,2));console.log('REVIEWED CANDIDATE '+JSON.stringify(result));
})().catch(err=>{console.error(err);process.exitCode=1});
