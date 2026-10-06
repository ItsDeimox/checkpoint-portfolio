"""GPU regressions for lower-rim emission and focused spark visibility.

Run from braaza with a system Chromium:
    python tests/visual-regressions.py

Requires Python Playwright and Chromium. On Linux without a desktop, use Xvfb.
BRAAZA_CHROMIUM selects another executable; BRAAZA_ROOT selects an unchanged
checkout for a baseline comparison. No dev server is needed.
Only actual production card, particle, and output shaders are exercised. The
fixtures provide known textures, geometry placement, and camera depth; no
shader source is matched or rewritten. Measurements are printed, not saved.
"""

import json
import os

from playwright.sync_api import sync_playwright

from support import load


GPU_CHECKS = r"""() => {
    const forge = window.__BRAAZA__.get(), gl = forge.gl;
    forge.paused = true;
    if (!forge.hdr) throw Error('These radiance regressions require HDR render targets.');

    const resources = [];
    function target(width, height, depth = false) {
        const texture = gl.createTexture(), framebuffer = gl.createFramebuffer();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0,
            gl.RGBA, gl.HALF_FLOAT, null);
        for (const [name, value] of [
            [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
            [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]
        ]) gl.texParameteri(gl.TEXTURE_2D, name, value);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D, texture, 0);
        let depthTexture = null;
        if (depth) {
            depthTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, depthTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0,
                gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
                gl.TEXTURE_2D, depthTexture, 0);
        }
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
            throw Error('Incomplete GPU test fixture.');
        const result = {framebuffer, texture, depth: depthTexture, width, height};
        resources.push(result);
        return result;
    }
    function clear(destination, color, depth = 1) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, destination.framebuffer);
        gl.viewport(0, 0, destination.width, destination.height);
        gl.depthMask(true);
        gl.clearColor(...color);
        gl.clearDepth(depth);
        gl.clear(gl.COLOR_BUFFER_BIT | (destination.depth ? gl.DEPTH_BUFFER_BIT : 0));
    }
    function bind(texture, unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
    }
    function read(destination) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, destination.framebuffer);
        const pixels = new Float32Array(destination.width * destination.height * 4);
        gl.readPixels(0, 0, destination.width, destination.height, gl.RGBA, gl.FLOAT, pixels);
        if (!pixels.every(Number.isFinite)) throw Error('Nonfinite GPU fixture output.');
        return pixels;
    }

    const black = target(1, 1), transparent = target(1, 1);
    clear(black, [0, 0, 0, 1]);
    clear(transparent, [0, 0, 0, 0]);

    // A label matte may darken media, but must not extinguish the glass rim's
    // emitted response to hover. Subtract unhovered pixels to isolate emission.
    const cardTarget = target(768, 360, true);
    const identity = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    const cardProjection = new Float32Array([
        1/2.4,0,0,0, 0,1/1.125,0,0, 0,0,-0.1,0, 0,0,0,1
    ]);
    function renderCard(label, hover) {
        clear(cardTarget, [0, 0, 0, 0]);
        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        bind(black.texture, 0);
        bind(label, 1);
        bind(black.texture, 2);
        forge.programs.card.use({
            uModel: identity, uVP: cardProjection, uCamera: [0, 0, 10],
            uResolution: [cardTarget.width, cardTarget.height],
            uArt: 0, uLabel: 1, uBehind: 2, uTime: 3, uHover: hover,
            uPointer: [0.5, 0.018], uTrail: new Float32Array(24),
            uBurn: 0, uIndex: 0
        });
        forge.draw(forge.meshes.panel);
        return read(cardTarget);
    }
    const unlabelled = [renderCard(transparent.texture, 0), renderCard(transparent.texture, 1)];
    const labelled = [renderCard(forge.cards[0].label, 0), renderCard(forge.cards[0].label, 1)];
    let clearDelta = 0, labelDelta = 0, samples = 0;
    // Read the lower edge, away from label glyphs and rounded corners.
    for (let y = 5; y <= 8; y++) for (let x = 368; x < 400; x++) {
        const at = (y * cardTarget.width + x) * 4;
        clearDelta += unlabelled[1][at] - unlabelled[0][at];
        labelDelta += labelled[1][at] - labelled[0][at];
        samples++;
    }
    const rim = {
        clearHoverEmission: clearDelta / samples,
        labelledHoverEmission: labelDelta / samples,
        retained: labelDelta / clearDelta
    };

    // Render one real particle at the focus distance. As in the renderer,
    // additive particles leave the opaque background's depth untouched.
    const size = 256, focus = 13.6, near = 0.1, far = 70;
    const scene = target(size, size, true), base = target(1, 1);
    const focusedDepth = target(1, 1, true), output = target(size, size);
    const background = [0.006, 0.008, 0.012, 1];
    clear(base, background);
    clear(focusedDepth, background, far * (focus - near) / (focus * (far - near)));
    clear(scene, background);
    const particleVao = gl.createVertexArray(), particleBuffer = gl.createBuffer();
    gl.bindVertexArray(particleVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
    // At time zero this seed has world y = 5 and z = 2.5. Cancel its x drift.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -Math.sin(12.8) * 0.384, 0.4, 0
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const focalScale = 1 / Math.tan(0.45), cameraZ = 16.1;
    const a = (far + near) / (near - far), b = 2 * far * near / (near - far);
    const particleProjection = new Float32Array([
        focalScale,0,0,0, 0,focalScale,0,0, 0,0,a,-1,
        0,-5*focalScale,b-cameraZ*a,cameraZ
    ]);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    forge.programs.particles.use({
        uVP: particleProjection, uTime: 0, uDpr: 1, uReduced: 0, uMotion: 0
    });
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    function postprocess(color, depth) {
        clear(output, [0, 0, 0, 1]);
        bind(color, 0);
        bind(depth, 1);
        bind(black.texture, 2);
        bind(black.texture, 3);
        bind(black.texture, 4);
        bind(base.texture, 5);
        forge.programs.output.use({
            uScene: 0, uDepth: 1, uNear: 2, uFar: 3, uAir: 4, uBase: 5,
            uResolution: [size, size], uTime: 0, uReduced: 0,
            uQuality: 1, uFocusDistance: focus
        });
        forge.full();
        return read(output);
    }
    const backgroundOnly = postprocess(base.texture, scene.depth);
    const farBackground = postprocess(scene.texture, scene.depth);
    const focusedBackground = postprocess(scene.texture, focusedDepth.depth);
    function peakContrast(pixels) {
        let peak = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            const contrast = (pixels[i] - backgroundOnly[i]) * 0.2126
                + (pixels[i+1] - backgroundOnly[i+1]) * 0.7152
                + (pixels[i+2] - backgroundOnly[i+2]) * 0.0722;
            peak = Math.max(peak, contrast);
        }
        return peak;
    }
    const focusedPeak = peakContrast(focusedBackground), farPeak = peakContrast(farBackground);
    const sparks = {focusedPeak, farBackgroundPeak: farPeak, retained: farPeak / focusedPeak};

    const error = gl.getError();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
    gl.deleteBuffer(particleBuffer);
    gl.deleteVertexArray(particleVao);
    for (const item of resources) {
        gl.deleteFramebuffer(item.framebuffer);
        gl.deleteTexture(item.texture);
        if (item.depth) gl.deleteTexture(item.depth);
    }
    gl.clearDepth(1);
    return {rim, sparks, error};
}"""


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=os.environ.get("BRAAZA_CHROMIUM", "/usr/bin/chromium"),
            headless=False,
            args=["--no-sandbox", "--enable-webgl", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
        )
        page = browser.new_page(viewport={"width": 1100, "height": 740})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        load(page)
        measurements = page.evaluate(GPU_CHECKS)
        browser.close()

    if errors or measurements["error"]:
        raise RuntimeError({"pageErrors": errors, "webglError": measurements["error"]})

    rim = measurements["rim"]
    sparks = measurements["sparks"]
    checks = [
        ("label matte preserves lower-rim hover emission",
         rim["clearHoverEmission"] > 0.2 and rim["retained"] > 0.85, rim),
        ("in-focus spark retains contrast over distant background",
         sparks["focusedPeak"] > 0.1 and sparks["retained"] > 0.85, sparks),
    ]
    for name, passed, detail in checks:
        print(("PASS " if passed else "FAIL ") + name + " " + json.dumps(detail), flush=True)
    raise SystemExit(0 if all(passed for _, passed, _ in checks) else 1)


if __name__ == "__main__":
    main()
