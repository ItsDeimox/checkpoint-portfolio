import {HEAVY_ENGINE_TOP,HEAVY_INTERSTAGE_START,HEAVY_FAIRING_START} from './heavy-regions.js';
export function installHighlight(material,uniforms) {
  material.onBeforeCompile=shader=>{
    shader.uniforms.uHighlight=uniforms.highlight;shader.uniforms.uBrightness=uniforms.brightness;
    shader.fragmentShader='uniform float uHighlight; uniform float uBrightness;\n'+shader.fragmentShader;
    let highlight='uHighlight';
    if(uniforms.core){
      shader.uniforms.uEngines=uniforms.core.engines.highlight;
      shader.uniforms.uInterstage=uniforms.core.interstage.highlight;
      shader.uniforms.uFairing=uniforms.core.fairing.highlight;
      shader.vertexShader='varying float vCoreHeight;\n'+shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvCoreHeight = position.y / '+uniforms.height.toFixed(4)+';');
      shader.fragmentShader='varying float vCoreHeight; uniform float uEngines,uInterstage,uFairing;\n'+shader.fragmentShader;
      highlight=uniforms.side?`(vCoreHeight <= ${HEAVY_ENGINE_TOP} ? uEngines : uHighlight)`:
        `(vCoreHeight <= ${HEAVY_ENGINE_TOP} ? uEngines : vCoreHeight >= ${HEAVY_FAIRING_START} ? uFairing : vCoreHeight >= ${HEAVY_INTERSTAGE_START} ? uInterstage : uHighlight)`;
    }
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float edge=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),3.0);\noutgoingLight+=vec3(0.48)*edge*${highlight};\noutgoingLight*=uBrightness;\n#include <opaque_fragment>`);
    // Brightness is applied in linear light, before bloom, tone mapping and sRGB.
  };
  material.customProgramCacheKey=()=> uniforms.side?'spacex-heavy-booster-regions':uniforms.core?'spacex-heavy-core-regions':'spacex-part-surface-v2-linear';
}
