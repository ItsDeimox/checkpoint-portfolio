import test from 'node:test';import assert from 'node:assert/strict';
const module=await import('../src/asset-parts.js').catch(()=>null);
test('licensed model classification module exists',()=>assert.ok(module));
const cases=[['falcon','Merlin Engine',.03,'engines'],['falcon','First Stage',.4,'tanks'],['falcon','Grid Fins',.62,'interstage'],['falcon','Fairing Half',.92,'fairing'],['starship','Superheavy Raptor 3',.02,'engines'],['starship','Starship Raptor 3',.60,'fairing'],['starship','Booster Cylinder',.32,'tanks'],['starship','Grid Fins',.56,'tanks']];
for(const [family,name,y,expected]of cases)test(`${family} ${name} classified as ${expected}`,()=>assert.equal(module?.classifyPart(family,name,y),expected));
test('invalid scale is rejected',()=>assert.throws(()=>module.normalization({min:[0,0,0],max:[0,0,0]},14),/height/));
test('normalization grounds and preserves aspect',()=>{const n=module?.normalization({min:[-1,2,-1],max:[1,12,1]},14);assert.equal(n?.scale,1.4);assert.deepEqual(n?.offset,[0,-2,0]);});
