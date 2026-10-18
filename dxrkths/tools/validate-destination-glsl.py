#!/usr/bin/env python3
"""Compile the actual themed card/portal and page programs through native EGL.
This validates syntax/linking only; browser compositing and performance are separate.
"""
import importlib.util
from pathlib import Path

spec=importlib.util.spec_from_file_location('room_validator',Path(__file__).with_name('validate-room-glsl.py'))
validator=importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)
extra=r'''
const {createFixedPanelLayout}=await import('./src/scene/room-environment.js');
const {configurePanelHologram}=await import('./src/scene/room-hologram.js');
const {BannerPortal}=await import('./src/scene/room-portal.js');
const {RoomCamera}=await import('./src/scene/room-camera.js');
const {RoomIdentity}=await import('./src/scene/room-identity.js');
const {DestinationGraphics}=await import('./src/scene/destination-graphics.js');
const roomScene=new T.Scene(),roomCamera=new T.PerspectiveCamera(48,1.5,.08,100);
const panels=createFixedPanelLayout().map(p=>{
 const material=new T.ShaderMaterial({vertexShader:S.roomVertex,fragmentShader:S.displayFragment,uniforms:{artwork:{value:null},projection:{value:new T.Matrix3()}}});
 const panel={...p,material,frame:new T.Group()};configurePanelHologram(panel);return panel;
});
const view={scene:roomScene,camera:roomCamera,cameraRig:new RoomCamera(roomCamera,900),panels,settings:{quality:'low'},ready:false,hoverPanel:-1};
const portal=new BannerPortal(view);view.bannerPortal=portal;new RoomIdentity(view);
for(const panel of panels)shaders.push({name:'ThemedCard.'+panel.index,vertex:panel.material.vertexShader,fragment:panel.material.fragmentShader,fog:true});
for(const material of[portal.fullMaterial,...portal.effects.group.children.map(o=>o.material),portal.shutter.material])shaders.push({name:material.name,vertex:material.vertexShader,fragment:material.fragmentShader});
const graphics={};DestinationGraphics.prototype.buildCar.call(graphics);DestinationGraphics.prototype.buildEnergy.call(graphics);
for(const scene of[graphics.carScene,graphics.energyScene])scene.traverse(object=>{
 const material=object.material;if(!material)return;
 if(material.isShaderMaterial)shaders.push({name:scene===graphics.energyScene?'EnergyNetworkCTA':'CoverContact',vertex:material.vertexShader,fragment:material.fragmentShader});
 if(object===graphics.cloth){
  const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
  shaders.push({name:'DrapedCarCloth',physical:true,fog:true,vertex:shader.vertexShader,fragment:shader.fragmentShader});
 }
});
'''
validator.NODE_SOURCE=validator.NODE_SOURCE.replace('const counts = {',extra+'\nconst counts = {')
if __name__=='__main__':
    raise SystemExit(validator.main())
