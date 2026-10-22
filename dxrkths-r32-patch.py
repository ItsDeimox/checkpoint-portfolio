from pathlib import Path
import re
root=Path('dxrkths')
def replace(path,old,new,count=1):
 p=root/path;s=p.read_text();n=s.count(old)
 assert n==count,f'{path}: expected {count} matches, got {n}: {old}'
 p.write_text(s.replace(old,new));print('PATCH',path)
replace('src/pages/destination-data.js',"['BERSERK DRIFT: RALLY','Roblox'],",'')
replace('src/scene/destination-graphics.js','Math.sin(time*.19)*.026','Math.sin(time*.19)*.075')
replace('src/scene/destination-graphics.js','Math.sin(time*.14)*.04','Math.sin(time*.14)*.07')
replace('src/styles-sections.css',".future-car-stage::before{content:'';position:absolute;top:12px;left:42%;width:16%;height:2px;background:#e2d9ee80;box-shadow:0 0 30px 5px #d6c8ff20}\n",'')
replace('src/ui/future-project-dialog.js'," const media = projectMedia(project.media);", " const media = projectMedia(project.media);\n const collaborators = Array.isArray(project.collaborators) ? project.collaborators.filter(name => typeof name === 'string' && name.trim()) : [];")
replace('src/ui/future-project-dialog.js','    <dl class="fp-facts"><div><dt>Category</dt><dd>${escape(project.category)}</dd></div><div><dt>Platform</dt><dd>${escape(project.platform)}</dd></div></dl>', '''    ${project.disclaimer ? `<p class="fp-development-note">${escape(project.disclaimer)}</p>` : ''}
    <dl class="fp-facts"><div><dt>Category</dt><dd>${escape(project.category)}</dd></div><div><dt>Platform</dt><dd>${escape(project.platform)}</dd></div>${collaborators.length ? `<div><dt>Collaborators</dt><dd>${collaborators.map(escape).join(' &amp; ')}</dd></div>` : ''}</dl>''')
p=root/'src/styles-project-dialog.css';p.write_text(p.read_text()+'''\n/* Owner-provided WIP notice and credits do not change the established modal. */
.fp-development-note{margin:0 0 24px;padding:12px 14px;border-left:2px solid #b88ee06b;background:#ad78de09;color:#c0accd;font:400 12px/1.7 var(--body,Arial,sans-serif)}
.fp-facts dd{overflow-wrap:anywhere}
''')
assets=['right-cut/cover.webp','right-cut/precision-cut.webp','right-cut/fruit-mode.webp','unnamed-drift/car-selection.webp','unnamed-drift/drift-gameplay.webp','unnamed-drift/drift-transition.webp']
replace('tools/build.mjs',"  'src/pages/future-project-details.js',", "  'src/pages/future-project-details.js',\n"+'\n'.join("  'assets/projects/"+a+"'," for a in assets))
# Older requirements explicitly retained seven projects. Only these catalogue
# assertions change; unrelated numeric expectations and archival QA stay intact.
replace('tests/future-project-dialog.test.mjs',"['0-0','0-1','0-2','1-0','1-1','2-0','2-1']","['0-0','0-1','1-0','1-1','2-0','2-1']")
replace('tests/future-project-dialog.test.mjs',"['BERSERK DRIFT: RALLY','Unnamed Drift Game'","['Unnamed Drift Game'")
replace('tests/future-project-dialog.test.mjs',"['Roblox','Steam','Roblox','Blender','Blender','Roblox','Roblox']","['Steam','Roblox','Blender','Blender','Roblox','Roblox']")
replace('tests/future-project-dialog.test.mjs','all seven existing projects','all six published projects')
replace('tests/destination-contract.test.mjs',"['BERSERK DRIFT: RALLY','Unnamed Drift Game'","['Unnamed Drift Game'")
replace('tests/destination-contract.test.mjs','complete seven-item catalogue','complete six-item catalogue')
replace('tests/destination-contract.test.mjs',').length,7);',').length,6);')
replace('tests/future-catalogue-layout.test.mjs',').length,7);',').length,6);')
replace('tests/room-portal.test.mjs'," assert.match(sections.renderSectionPage(2),/BERSERK DRIFT: RALLY/);", " assert.match(sections.renderSectionPage(2),/Right Cut!/);\n assert.doesNotMatch(sections.renderSectionPage(2),/BERSERK DRIFT: RALLY/);")
for path in ['tests/destination-browser.cjs','tests/stability-browser.cjs']:
 replace(path,"document.querySelectorAll('.future-project').length===7","document.querySelectorAll('.future-project').length===6")
p=root/'tests/stability-browser.cjs';p.write_text(p.read_text().replace('all seven projects remain','all six published projects remain'))
print('All targeted changes applied. Showroom shaders, routes and scroll handling untouched.')
