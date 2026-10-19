"""Build immutable app-only Git objects after verification; do not change refs."""
import base64,json,os,pathlib,re,subprocess,urllib.request
repo='ItsDeimox/checkpoint-portfolio'
base='910bb08f6e69086c9b86849e05925d7a4882dc40'
base_tree='f074e48b8e0b47af608f4282c2007a42ad9a7d39'
expected=['dxrkths/docs/HOVER-FLOW.md','dxrkths/src/scene/room-cursor-wake.js','dxrkths/src/scene/room-panel-energy.js','dxrkths/src/shaders/panel-flow.js','dxrkths/src/shaders/panel-prism.js','dxrkths/tests/card-flow-browser.cjs','dxrkths/tests/card-flow.test.mjs','dxrkths/tests/card-signature.test.mjs','dxrkths/tests/hover-regression.test.mjs']
paths=subprocess.check_output(['git','diff','--cached','--name-only','-z']).decode().strip('\0').split('\0')
assert sorted(paths)==sorted(expected), paths
log=pathlib.Path('/tmp/dxt-flow-build.log').read_text()
assert re.search(r'^# tests 368$',log,re.M) and re.search(r'^# pass 368$',log,re.M) and re.search(r'^# fail 0$',log,re.M)
root=pathlib.Path('/tmp/dxt-flow-qa')
flow=json.loads((root/'flow-pixels.json').read_text())
probe=json.loads((root/'pixel-probe.json').read_text())
native=json.loads((root/'native-browser.json').read_text())
assert len(flow['checks'])==15 and all(x['pass'] for x in flow['checks']) and not flow['errors'] and not flow['glError']
assert probe['result']['allOriented'] and probe['result']['reduced'] and not probe['errors'] and not probe['result']['glError']
assert len(native['checks'])>=40 and all(x['pass'] for x in native['checks']) and not native['errors']
def api(path,data=None):
 request=urllib.request.Request('https://api.github.com/repos/'+repo+'/'+path,data=None if data is None else json.dumps(data).encode(),headers={'Authorization':'Bearer '+os.environ['GITHUB_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'})
 with urllib.request.urlopen(request,timeout=60) as r:return json.load(r)
assert api('git/ref/heads/main')['object']['sha']==base,'Main changed; reconcile before release.'
entries=[]
def add(name,data):
 assert name.startswith('dxrkths/') and '..' not in pathlib.PurePosixPath(name).parts
 sha=api('git/blobs',{'encoding':'base64','content':base64.b64encode(data).decode()})['sha']
 entries.append({'path':name,'mode':'100644','type':'blob','sha':sha})
for p in paths:
 if p.endswith('/panel-prism.js'):entries.append({'path':p,'mode':'100644','type':'blob','sha':None})
 else:add(p,subprocess.check_output(['git','show',':'+p]))
add('dxrkths/src/render/showroom.bundle.js',pathlib.Path('dxrkths/src/render/showroom.bundle.js').read_bytes())
summary={'base':base,'unitPassed':368,'flowPixelChecks':15,'nativeChecks':len(native['checks']),'orientationChecks':len(probe['result']['orientation']),'errors':[], 'renderer':'Chromium ANGLE SwiftShader (not an RTX benchmark)', 'scope':'Recorded card wakes only; preserved Play Now, native portal captures, cadence, quality and lighting.', 'bundleSha256':json.loads(pathlib.Path('dxrkths/dist/build-info.json').read_text())['files']['src/render/showroom.bundle.js']}
add('dxrkths/docs/card-flow-validation.json',json.dumps(summary,indent=2).encode())
tree=api('git/trees',{'base_tree':base_tree,'tree':entries})['sha']
commit=api('git/commits',{'message':'fix(dxrkths): replace prism fragments with a continuous cursor wake','tree':tree,'parents':[base]})['sha']
result={'commit':commit,'tree':tree,'base':base,'files':[x['path'] for x in entries],'validation':summary,'refChanged':False}
pathlib.Path('candidate.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
