from pathlib import Path
import hashlib
root=Path('dxrkths')
def gitsha(data):
 return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
original={'src/ui/room-intro.js':'b7de6055523af53cd0627a324ec9fdf49cf08d2d','src/ui/room-visitor-shell.js':'417bdf99f8378a376fbe10e555dc8a9ecf38af70','src/styles-experience.css':'5d2edcf63bdd7388e8b25644ee0c8c304b08db79','src/main.js':'1e8caddca6018aa185c017e7cbcb79d9815e64cd','index.html':'c21d17e240b8789689fb8ca3f252ef2f086218ad'}
for name,sha in original.items():assert gitsha((root/name).read_bytes())==sha,('source changed',name)
def edit(name,changes):
 p=root/name;s=p.read_text()
 for old,new in changes:
  assert s.count(old)==1,(name,old[:100],s.count(old));s=s.replace(old,new)
 p.write_text(s)
edit('src/ui/room-intro.js',[
 ('export function mountIntro(document,{onActivate,onDismiss}={}){',"export function mountIntro(document,{onActivate,onDismiss,destination='Showroom'}={}){"),
 (" const body=document.body,underlay=['#header','#main','#footer'].map(s=>document.querySelector(s)).filter(Boolean);", " const body=document.body,underlay=['#header','#main','#footer'].map(s=>document.querySelector(s)).filter(Boolean);\n const entryLabel=destination==='Showroom'?'Enter Showroom':destination==='Berserk Drift X'?'Enter BDX':`Continue to ${destination}`;"),
 ("  button.textContent=gate.failed?'Continue to site':gate.activated?'Preparing your showroom…':'Enter DXT';", "  button.textContent=gate.failed?'Continue without 3D':gate.activated?`Preparing ${destination}…`:entryLabel;"),
 ("  else if(gate.prepared)status.textContent='Showroom ready';", "  else if(gate.prepared)status.textContent=`${destination} ready`;"),
 ("  if(event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.target.closest?.('a'))return;\n  gate.activate();", "  // A decorative click must not silently queue entry while the 3D scene loads.\n  // Consume only this button's activation; keep the separate audio toggle usable.\n  if(event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.target.closest?.('#intro-enter')!==button)return;\n  event.preventDefault();event.stopPropagation();\n  gate.activate();")])
edit('src/ui/room-visitor-shell.js',[(
 '<button type="button" data-open-panel="3" class="room-enter" aria-label="Enter DXT" aria-controls="room-panel-options"><span>Enter DXT</span>',
 '<button type="button" data-open-panel="0" class="room-enter" aria-label="Enter BDX" aria-controls="room-section-page"><span>Enter BDX</span>')])
edit('src/styles-experience.css',[(
 'body.intro-leaving #room-intro{opacity:0;pointer-events:none}',
 '/* Keep the fading cover as a hit shield until its underlay is released. */\nbody.intro-leaving #room-intro{opacity:0;pointer-events:auto}')])
edit('index.html',[
 ('<button id="intro-enter" type="button" disabled>Enter DXT</button>','<button id="intro-enter" type="button" disabled>Enter Showroom</button>'),
 ('Click to enter · Music starts at 20%','Use the button to enter · Music starts at 20%')])
edit('src/main.js',[
 ("let scene=null,phase='loading',selectedPanel=null,intro=null,sections=null,started=false,bootTimedOut=false,startupTimeout=null;", "let scene=null,phase='loading',selectedPanel=null,intro=null,sections=null,started=false,bootTimedOut=false,startupTimeout=null;\nconst initialPanel=panelFromPath(location.pathname);"),
 ('intro=mountIntro(document,{onActivate()', "intro=mountIntro(document,{destination:initialPanel===null?'Showroom':ROOM_PANELS[initialPanel].title,onActivate()"),
 ('`Click to enter · Music starts at ${Math.round(settings.music.volume*100)}%`','`Use the button to enter · Music starts at ${Math.round(settings.music.volume*100)}%`'),
 ("const initialPanel=panelFromPath(location.pathname);\nif(initialPanel!==null)","if(initialPanel!==null)")])
expected={'src/ui/room-intro.js':'382f8cb3bff52015dd42a77ec0704517153a3a4b','src/ui/room-visitor-shell.js':'2d8cf6bc47bded413beed17fac75cd5a98cb6546','src/styles-experience.css':'6683ddbf80dfe7c86291f73dbb543ebfbc3f320a','src/main.js':'0a35dc196819e19bf373060e3945299e2fb690d0','index.html':'65846be0c43cc8ad2bf458241727f6ea44f52580'}
for name,sha in expected.items():assert gitsha((root/name).read_bytes())==sha,('output differs',name)
print('All five entry changes match the exact locally tested source blobs.')
