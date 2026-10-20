import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

/** A first color pass can consume the resolved capture directly. The output
 * still belongs to the composer's single-sample ping-pong targets. */
export class SceneSourcePass extends ShaderPass {
  render(renderer,writeBuffer,readBuffer,deltaTime,maskActive){
    super.render(renderer,writeBuffer,this.sourceTarget??readBuffer,deltaTime,maskActive);
  }
}
