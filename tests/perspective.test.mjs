import test from 'node:test';
import assert from 'node:assert/strict';
let M;try{M=await import('../src/ui/card-projection.js')}catch{}
test('the card material has a shared projective transform',()=>assert.ok(M?.cardMatrix));
if(M){
 const {cardMatrix,projectCard,unprojectCard,materialImpulse}=M;
 test('rest transforms have real depth, not only a 2D affine skew',()=>{
  const m=cardMatrix(0,false);assert.ok(Math.abs(m[3])+Math.abs(m[7])>1e-5);assert.notEqual(m[2],0);assert.notEqual(m[6],0);
 });
 test('the face recedes in depth and its four corners have different w',()=>{const m=cardMatrix(0,false);const pts=[[-140,-90],[140,-90],[140,90],[-140,90]].map(([x,y])=>projectCard(m,x,y));assert.ok(new Set(pts.map(p=>p[2])).size===4);assert.ok(pts[2][0]<pts[1][0]);assert.ok(pts[1][1]<pts[0][1]);});
 test('GPU and native link projection roundtrip across the whole card',()=>{for(const hover of[0,.1,.5,1])for(const mobile of[false,true]){const m=cardMatrix(hover,mobile);for(let x=-140;x<=140;x+=20)for(let y=-90;y<=90;y+=15){const p=projectCard(m,x,y),q=unprojectCard(m,p[0],p[1]);assert.ok(Math.abs(q[0]-x)<1e-6&&Math.abs(q[1]-y)<1e-6);}}});
 test('hover approaches camera smoothly rather than scaling the image',()=>{const a=cardMatrix(0),b=cardMatrix(1);assert.ok(b[14]>a[14]);const mid=cardMatrix(.5);assert.ok(mid[14]>a[14]&&mid[14]<b[14]);});
 test('a stationary cursor never generates perpetual ripple impulses',()=>{assert.equal(materialImpulse(0),0);assert.equal(materialImpulse(NaN),0);assert.ok(materialImpulse(100)<materialImpulse(800));assert.ok(materialImpulse(1e8)<=1.4);});
 test('projection remains finite on a narrow phone',()=>{const m=cardMatrix(1,true);for(const x of[-200,0,200])for(const y of[-100,0,100])assert.ok(projectCard(m,x,y).every(Number.isFinite));});
}
