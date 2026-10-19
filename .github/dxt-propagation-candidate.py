"""Keep reviewed application changes only; never update a ref from CI."""
import base64, hashlib, json, os, pathlib, re, urllib.request
repo='ItsDeimox/checkpoint-portfolio'
base='2254c2aeb6d2a80fc26dd1bab522aaca8045f6da'
app_tree='e792de7c99d39289e0374f0fb038c048bbd3aae8'
root=pathlib.Path('dxrkths')
log=pathlib.Path('/tmp/dxt-propagation-build.log').read_text()
assert re.search(r'^# tests 368$',log,re.M) and re.search(r'^# pass 368$',log,re.M) and re.search(r'^# fail 0$',log,re.M)
pixel=json.loads((root/'docs/propagation-qa/pixel-probe.json').read_text())
native=json.loads((root/'docs/propagation-qa/native-browser.json').read_text())
r=pixel['result']
assert not pixel['errors'] and not r['glError'] and r['allOriented'] and r['reduced']
assert len(r['propagation'])==5 and all(c['pass'] for c in r['propagation'])
assert len(native['checks'])>=10 and all(c['pass'] for c in native['checks']) and not native['errors'] and not native.get('failure')
def api(path,data=None):
 request=urllib.request.Request('https://api.github.com/repos/'+repo+'/'+path,data=None if data is None else json.dumps(data).encode(),headers={'Authorization':'Bearer '+os.environ['GITHUB_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'})
 with urllib.request.urlopen(request,timeout=60) as response:return json.load(response)
assert api('git/ref/heads/main')['object']['sha']==base,'Main changed; review before release.'
bundle=(root/'src/render/showroom.bundle.js').read_bytes()
summary={'base':base,'unitPassed':368,'propagation':r['propagation'],'orientationChecks':len(r['orientation']),'nativeChecks':len(native['checks']),'errors':[],'renderer':'Chromium ANGLE SwiftShader; no RTX performance benchmark','scope':'Original network and brightness restored; only static card edge conductance differs from pre-Prism rendering. CTA, cadence, capture, tunnel, quality, camera and lighting unchanged.','bundleSha256':hashlib.sha256(bundle).hexdigest()}
entries=[]
for name,data in [('src/render/showroom.bundle.js',bundle),('docs/propagation-validation.json',json.dumps(summary,indent=2).encode())]:
 blob=api('git/blobs',{'encoding':'base64','content':base64.b64encode(data).decode()})['sha']
 entries.append({'path':'dxrkths/'+name,'mode':'100644','type':'blob','sha':blob})
tree=api('git/trees',{'base_tree':app_tree,'tree':entries})['sha']
commit=api('git/commits',{'message':'fix(dxrkths): restore network hover and vary only propagation','tree':tree,'parents':[base]})['sha']
result={'commit':commit,'tree':tree,'base':base,'validation':summary,'refChanged':False}
pathlib.Path('candidate.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
