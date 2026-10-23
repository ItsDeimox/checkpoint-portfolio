import test from 'node:test';
import assert from 'node:assert/strict';
const data=await import('../src/pages/future-project-details.js').catch(()=>({}));
const ui=await import('../src/ui/future-project-dialog.js').catch(()=>({}));

test('all six published projects have individual detail records without fabricated media',()=>{
 assert.equal(typeof data.getFutureProject,'function','project detail lookup must exist');
 const projects=['0-0','0-1','1-0','1-1','2-0','2-1'].map(data.getFutureProject);
 assert.deepEqual(projects.map(p=>p.name),['Unnamed Drift Game','Right Cut!','Procedural Tiremark Generator','Procedural Vegetation Placer','Drift Judge Score System','FFB System']);
 assert.deepEqual(projects.map(p=>p.platform),['Steam','Roblox','Blender','Blender','Roblox','Roblox']);
 assert.ok(projects.every(p=>!p.media.some(item=>/\/berserk\/game-|\/test-only\//.test(item.src))),'Unrelated or test-only media must never be presented as an upcoming project');
 assert.equal(data.getFutureProject('__proto__'),null);
 assert.equal(data.getFutureProject('0-99'),null);
});
test('media allows real image/video sources and rejects script URLs and traversal',()=>{
 assert.equal(typeof data.projectMedia,'function');
 const media=data.projectMedia([
  {type:'image',src:'/assets/projects/rally/one.webp',alt:'Track'},
  {type:'video',src:'https://example.com/project.mp4',poster:'/assets/projects/poster.webp'},
  {type:'image',src:'javascript:alert(1)'},{type:'video',src:'//evil.test/x'},
  {type:'image',src:'/assets/../secret'},{type:'iframe',src:'https://example.com'},
  {type:'image',src:'/assets/%2e%2e/private'},{type:'image',src:'https://user:password@example.com/x'},
 ]);
 assert.equal(media.length,2);assert.equal(media[0].alt,'Track');assert.equal(media[1].type,'video');
 assert.equal(data.projectMedia(null).length,0);
});
test('dialog is labelled, escapes authored content and does not request media in its shell',()=>{
 assert.equal(typeof ui.projectDialogContent,'function');
 const html=ui.projectDialogContent({id:'0-0',name:'<img src=x onerror=alert(1)>',category:'Games',platform:'Roblox',description:['<script>bad</script>'],media:[]});
 assert.match(html,/id="future-project-title"/);assert.match(html,/data-project-close/);
 assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
 assert.doesNotMatch(html,/<script|<img src=x|autoplay|<iframe/);
 assert.match(html,/Photos and videos/);
});
test('the gallery presents only image-side arrows, not a strip of PHOTO 1/2/3 buttons',()=>{
 assert.equal(typeof ui.projectDialogContent,'function');
 const html=ui.projectDialogContent({name:'Right Cut!',category:'Games',platform:'Roblox',description:[],media:[
  {type:'image',src:'/assets/x.webp'},{type:'image',src:'/assets/y.webp'},{type:'video',src:'/assets/z.mp4'}
 ]});
 assert.match(html,/class="fp-viewer"/);
 assert.equal((html.match(/data-project-step=/g)||[]).length,2);
 assert.match(html,/class="fp-arrow fp-arrow-prev" data-project-step="-1" aria-label="Previous project media"/);
 assert.match(html,/class="fp-arrow fp-arrow-next" data-project-step="1" aria-label="Next project media"/);
 assert.ok(html.indexOf('data-project-step="-1"')>html.indexOf('class="fp-stage"'));
 assert.doesNotMatch(html,/data-project-media=|class="fp-media-choices"|class="fp-media-tools"|\bPHOTO\b/);
 assert.doesNotMatch(html,/src="\/assets\/x|src="\/assets\/y|src="\/assets\/z|autoplay/,'media stays lazy');
 assert.match(html,/data-project-count aria-live=/,'screen readers still receive the media position');
});
test('empty and single-image projects do not show useless slideshow controls',()=>{
 const noMedia=ui.projectDialogContent({name:'FFB System',category:'Systems',platform:'Roblox',description:[],media:[]});
 const one=ui.projectDialogContent({name:'One image',category:'Games',platform:'Steam',description:[],media:[{type:'image',src:'/assets/one.webp'}]});
 assert.match(noMedia,/Preview coming soon/);
 for(const html of [noMedia,one])assert.doesNotMatch(html,/data-project-step=|data-project-media=|data-project-count/);
});
test('title is reduced and gallery arrow controls are positioned inside the image on desktop and mobile',async()=>{
 const {readFileSync}=await import('node:fs');
 const css=readFileSync(new URL('../src/styles-project-dialog.css',import.meta.url),'utf8');
 assert.match(css,/\.fp-details h2\{[^}]*clamp\(27px,3vw,38px\)/);
 assert.match(css,/\.fp-viewer\{[^}]*position:relative/);
 assert.match(css,/\.fp-arrow\{[^}]*position:absolute[^}]*top:50%/);
 assert.match(css,/\.fp-arrow-prev\{[^}]*left:/);
 assert.match(css,/\.fp-arrow-next\{[^}]*right:/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.doesNotMatch(css,/\.fp-media-choices|\.fp-media-tools/);
});

test('project facts appear once below the photo, never under the title',()=>{
 const p=data.getFutureProject('0-1');
 const html=ui.projectDialogContent(p);
 const mediaStart=html.indexOf('<section class="fp-media"');
 const viewer=html.indexOf('<div class="fp-viewer">');
 const facts=html.indexOf('<dl class="fp-facts"');
 const mediaEnd=html.indexOf('</section>',mediaStart);
 const details=html.indexOf('<section class="fp-details">');
 assert.ok(mediaStart>=0&&viewer>mediaStart&&facts>viewer&&mediaEnd>facts&&details>mediaEnd,
  'metadata belongs to the left image column before the right description');
 for(const field of ['Category','Platform','Collaborators']){
  assert.equal((html.match(new RegExp('<dt>'+field+'</dt>','g'))||[]).length,1,field+' is rendered once');
 }
 assert.doesNotMatch(html,/FUTURE PROJECTS|FUTURE PROJECT|class="fp-platform"|ESC TO CLOSE/);
 assert.match(html,/id="future-project-title">Right Cut!</);
 assert.match(html,/class="fp-description"/);
 assert.match(html,/data-project-close/);
});
test('placeholder projects keep their category and platform under the empty media frame',()=>{
 const p=data.getFutureProject('2-1');
 const html=ui.projectDialogContent(p);
 const facts=html.indexOf('<dl class="fp-facts"'),details=html.indexOf('<section class="fp-details">');
 assert.ok(facts>html.indexOf('data-project-stage')&&facts<details);
 assert.equal((html.match(/<dt>Category<\/dt>/g)||[]).length,1);
 assert.equal((html.match(/<dt>Platform<\/dt>/g)||[]).length,1);
 assert.doesNotMatch(html,/<dt>Collaborators<\/dt>|data-project-step=|FUTURE PROJECTS/);
 assert.match(html,/Preview coming soon/);
});
test('metadata is aligned under the gallery on desktop and stacks correctly on mobile',async()=>{
 const {readFileSync}=await import('node:fs');
 const css=readFileSync(new URL('../src/styles-project-dialog.css',import.meta.url),'utf8');
 assert.match(css,/\.fp-layout\{[^}]*grid-template-columns:minmax\(0,1\.15fr\) minmax\(0,1fr\)/);
 assert.match(css,/\.fp-facts\{[^}]*margin:2[024]px 0 0/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.doesNotMatch(css,/\.fp-platform\{|\.fp-footer\{/);
});
