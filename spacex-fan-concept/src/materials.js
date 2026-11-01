export function installHighlight(material,uniforms) {
  material.onBeforeCompile=shader=>{
    shader.uniforms.uHighlight=uniforms.highlight;shader.uniforms.uBrightness=uniforms.brightness;
    shader.fragmentShader='uniform float uHighlight; uniform float uBrightness;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float edge=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),3.0);\noutgoingLight+=vec3(0.48)*edge*uHighlight;\noutgoingLight*=uBrightness;\n#include <opaque_fragment>`);
    // Brightness is applied in linear light, before bloom, tone mapping and sRGB.
  };
  material.customProgramCacheKey=()=> 'spacex-part-surface-v2-linear';
}
