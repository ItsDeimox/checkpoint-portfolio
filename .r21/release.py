from pathlib import Path
r=Path('dxrkths')
p=r/'src/scene/room-portal-exit.js';s=p.read_text().replace('finalDepth-distance*.48','finalDepth-distance*.12');p.write_text(s)
p=r/'tests/portal-wall.test.mjs';s=p.read_text();marker="test('the tunnel continues occluding the wider page through mid-flight'"
if marker not in s:s+="\ntest('the tunnel continues occluding the wider page through mid-flight',()=>{const f=shot(.45);assert.ok(f.clip[0]>.08&&f.clip[2]<.92);assert.ok(f.exitDepth-f.tunnelEndDepth>0);});\n"
p.write_text(s)
