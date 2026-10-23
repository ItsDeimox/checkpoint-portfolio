from pathlib import Path
root=Path(__file__).resolve().parents[1]
def replace(path,old,new):
 p=root/path;s=p.read_text();assert s.count(old)==1,(path,s.count(old));p.write_text(s.replace(old,new))
p=root/'src/pages/home-room.js';s=p.read_text();a=s.index('      <div class="room-mobile-context"');b=s.index('      <section id="room-panel-options"',a)
s=s[:a]+'''      <nav class="room-mobile-context" aria-label="Explore DXT on mobile">
        ${ROOM_PANELS.map((panel, index) => `<button class="room-mobile-card" type="button" data-mobile-panel="${index}" data-open-panel="${index}" aria-controls="room-section-page"><strong>${escape(panel.title)}</strong>${icon('arrow')}</button>`).join('')}
      </nav>
'''+s[b:];p.write_text(s)
replace('index.html','  <link rel="stylesheet" href="/src/styles-project-dialog.css">','  <link rel="stylesheet" href="/src/styles-project-dialog.css">\n  <link rel="stylesheet" href="/src/styles-mobile.css">')
replace('tools/build.mjs',"  'src/styles-project-dialog.css',","  'src/styles-project-dialog.css',\n  'src/styles-mobile.css',")
replace('tests/entrypoints.test.mjs',"'/src/styles-project-dialog.css']);","'/src/styles-project-dialog.css', '/src/styles-mobile.css']);")
