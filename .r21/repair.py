from pathlib import Path
r=Path('dxrkths')
p=r/'tests/portal-wall.test.mjs';s=p.read_text().replace('f.exitHalf[1]>basis.half.y*2','f.exitHalf[1]>basis.half.y');p.write_text(s)
p=r/'tests/room-portal-return.test.mjs';s=p.read_text()
s=s.replace('advance(f,3);assert.equal(arrivals,1)','advance(f,A+F+.1);assert.equal(arrivals,1)')
s=s.replace('n<110;n++','n<Math.ceil((F+.2)*60);n++')
s=s.replace('advance(f,2);assert.equal(typeof f.portal.returnToShowroom', 'advance(f,F+.1);assert.equal(typeof f.portal.returnToShowroom')
s=s.replace('setAttribute(){},removeAttribute(){},querySelector:()=>null','setAttribute(){},removeAttribute(){},getAttribute:()=>null,querySelector:()=>null')
p.write_text(s)
p=r/'tests/room-portal-effects.test.mjs';s=p.read_text();a=s.index("test('interior shader preparation uses");b=s.index("test('temporary portal light",a)
s=s[:a]+'''test('interior shader preparation warms real geometry in its HDR target and restores state',async()=>{
 const target={name:'scene-linear'},prior={name:'previous'},viewport=new T.Vector4(2,3,80,60),scissor=new T.Vector4(4,5,20,30);let active=prior,captured,draws=0,clip=false;
 const camera=new T.PerspectiveCamera(48,1.5,.08,100),rig=new RoomCamera(camera,900);
 const panels=createFixedPanelLayout().map(p=>({...p,material:new T.ShaderMaterial({uniforms:{artwork:{value:null},projection:{value:new T.Matrix3()}},fragmentShader:'void main(){vec3 c=vec3(0.);gl_FragColor=vec4(c,1.);}'})}));
 const renderer={getRenderTarget:()=>active,setRenderTarget:x=>{active=x;},getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>clip,
  setViewport(...a){if(a[0]?.isVector4)viewport.copy(a[0]);else viewport.set(...a);},setScissor(...a){if(a[0]?.isVector4)scissor.copy(a[0]);else scissor.set(...a);},setScissorTest:v=>{clip=v;},
  async compileAsync(scene){captured={target:active,scene};},render(){draws++;},getContext:()=>({})};
 const optics={sceneTarget:target,composer:{passes:[],insertPass(p){this.passes.push(p);}},bloomPass:{},resetHistory(){}};
 const view={renderer,camera,cameraRig:rig,panels,scene:new T.Scene(),optics};const owner=new BannerPortal(view);
 await owner.prepare();assert.equal(captured.target,target);assert.equal(captured.scene,owner.fullScene);assert.equal(active,prior);assert.equal(draws,1);assert.equal(owner.prepared,true);
 assert.deepEqual(viewport.toArray(),[2,3,80,60]);assert.deepEqual(scissor.toArray(),[4,5,20,30]);assert.equal(clip,false);
 renderer.compileAsync=async()=>{throw Error('lost context');};await assert.rejects(owner.prepare(),/lost context/);assert.equal(active,prior);assert.deepEqual(viewport.toArray(),[2,3,80,60]);
 owner.dispose();owner.shutter.dispose();panels.forEach(p=>p.material.dispose());
});
''' + s[b:];p.write_text(s)
