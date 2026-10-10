#!/usr/bin/env python3
"""Compile/link the room's GLSL with installed EGL/GLES; never draw a frame.

Requires Node plus the project's installed Three.js and a native EGL provider.
ShaderMaterial prefixes and the representative MeshStandard light configuration
are reconstructed from Three 0.180 conventions. This catches shader syntax,
reserved identifiers, chunk integration and varying-link errors; it does not
replace a WebGL browser render or validate framebuffer/driver performance.

Run: python tools/validate-room-glsl.py --report docs/room-glsl-validation.json
Exit 77 means the optional native compiler is unavailable. No installs, browser
flags, environment overrides or graphics configuration changes are performed.
"""

import argparse
import ctypes as C
import ctypes.util
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess


PROJECT = Path(__file__).resolve().parents[1]
NODE_SOURCE = r"""
import fs from 'node:fs';
import * as T from 'three';
import * as S from './src/scene/room-shaders.js';
import { RoomOptics } from './src/scene/room-optics.js';

const fake = {
  extensions: { has: () => true }, capabilities: { reversedDepthBuffer: false },
  getPixelRatio: () => 1, getSize: value => value.set(1672, 941),
};
const optics = new RoomOptics(fake, new T.Scene(), new T.PerspectiveCamera(38, 1672 / 941, .08, 100));
const shaders = [];
for (const [name, vertex, fragment] of [
  ['display', S.roomVertex, S.displayFragment],
  ['floor', S.floorVertex, S.floorFragment],
  ['smoke', S.roomVertex, S.smokeFragment],
  ['beam', S.roomVertex, S.beamFragment],
  ['contact', S.roomVertex, S.contactFragment],
]) shaders.push({ name, vertex, fragment, fog: name === 'display' || name === 'floor' });
for (const material of [
  optics.lensPass.material, optics.gradePass.material, optics.aaPass.material,
  optics.bloomPass.brightMaterial, optics.bloomPass.blurMaterial, optics.bloomPass.streakMaterial,
]) shaders.push({ name: material.name, vertex: material.vertexShader, fragment: material.fragmentShader });
shaders.push({
  name: 'OutputPass.ACES.sRGB', raw: true,
  vertex: optics.outputPass.material.vertexShader, fragment: optics.outputPass.material.fragmentShader,
});

// Exercise the actual private onBeforeCompile hook without loading browser textures.
const environment = fs.readFileSync('./src/scene/room-environment.js', 'utf8');
const start = environment.indexOf('function weatheredMetal()');
const end = environment.indexOf('export function createReferenceCamera', start);
if (start < 0 || end < 0) throw new Error('Update fixture extraction for weatheredMetal().');
const weathered = new Function('T', 'noiseGLSL', 'material',
  'return (' + environment.slice(start, end).trim() + ')()'
)(T, S.noiseGLSL, options => new T.MeshStandardMaterial(options));
const standard = {
  vertexShader: T.ShaderLib.standard.vertexShader,
  fragmentShader: T.ShaderLib.standard.fragmentShader,
};
weathered.onBeforeCompile(standard);
shaders.push({
  name: 'Weathered.MeshStandard.Fog.Lights.Env.Shadows', fog: true, physical: true,
  vertex: standard.vertexShader, fragment: standard.fragmentShader,
});

const counts = {
  NUM_DIR_LIGHTS: 1, NUM_POINT_LIGHTS: 1, NUM_SPOT_LIGHTS: 0, NUM_HEMI_LIGHTS: 1,
  NUM_RECT_AREA_LIGHTS: 1, NUM_DIR_LIGHT_SHADOWS: 1, NUM_POINT_LIGHT_SHADOWS: 0,
  NUM_SPOT_LIGHT_SHADOWS: 0, NUM_SPOT_LIGHT_MAPS: 0, NUM_SPOT_LIGHT_COORDS: 0,
  NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS: 0, NUM_LIGHT_PROBES: 0,
  NUM_CLIPPING_PLANES: 0, UNION_CLIPPING_PLANES: 0,
};
const expand = source => source.replace(/#include\s+<([\w\d_]+)>/g, (_, name) => {
  if (!T.ShaderChunk[name]) throw new Error('Missing Three shader chunk: ' + name);
  return expand(T.ShaderChunk[name]);
});
function prepare(source) {
  source = expand(source);
  for (const [key, value] of Object.entries(counts)) {
    source = source.replace(new RegExp('\\b' + key + '\\b', 'g'), String(value));
  }
  // Matches WebGLProgram's numeric loop unrolling after light-count replacement.
  return source.replace(
    /#pragma unroll_loop_start\s+for \( int i = (\d+); i < (\d+); i \+\+ \) \{([\s\S]+?)\}\s+#pragma unroll_loop_end/g,
    (_, begin, end, body) => Array.from({ length: +end - +begin }, (_, offset) => {
      const i = +begin + offset;
      return body.replace(/\[\s*i\s*\]/g, '[ ' + i + ' ]').replace(/UNROLLED_LOOP_INDEX/g, String(i));
    }).join('')
  );
}
const common = '#version 300 es\nprecision highp float;\nprecision highp int;\n';
const vertexPrefix = [
  '#define attribute in', '#define varying out', '#define texture2D texture',
  'uniform mat4 modelMatrix; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;',
  'uniform mat4 viewMatrix; uniform mat3 normalMatrix; uniform vec3 cameraPosition;',
  'uniform bool isOrthographic; in vec3 position; in vec3 normal; in vec2 uv;',
].join('\n') + '\n';
const fragmentPrefix = [
  '#define varying in', '#define texture2D texture', '#define textureCube texture',
  '#define texture2DProj textureProj', '#define texture2DLodEXT textureLod',
  '#define textureCubeLodEXT textureLod', '#define texture2DGradEXT textureGrad',
  '#define textureCubeGradEXT textureGrad', '#define gl_FragColor pc_fragColor',
  'layout(location=0) out highp vec4 pc_fragColor;',
  'uniform mat4 viewMatrix; uniform vec3 cameraPosition; uniform bool isOrthographic;',
  T.ShaderChunk.colorspace_pars_fragment,
  'vec4 linearToOutputTexel(vec4 color) { return color; }',
  'float luminance(vec3 color) { return dot(color, vec3(.2126, .7152, .0722)); }',
].join('\n') + '\n';
const native = [
  '#define USE_SHADOWMAP', '#define SHADOWMAP_TYPE_PCF_SOFT',
  '#define USE_ENVMAP', '#define ENVMAP_TYPE_CUBE_UV', '#define ENVMAP_MODE_REFLECTION',
  '#define CUBEUV_TEXEL_WIDTH .001', '#define CUBEUV_TEXEL_HEIGHT .001', '#define CUBEUV_MAX_MIP 8.0',
].join('\n') + '\n';
for (const shader of shaders) {
  const defines = (shader.fog ? '#define USE_FOG\n#define FOG_EXP2\n' : '') + (shader.physical ? native : '');
  shader.vertex = shader.raw
    ? '#version 100\n' + prepare(shader.vertex)
    : common + defines + vertexPrefix + prepare(shader.vertex);
  shader.fragment = shader.raw
    ? '#version 100\n#define ACES_FILMIC_TONE_MAPPING\n#define SRGB_TRANSFER\n' + prepare(shader.fragment)
    : common + defines + fragmentPrefix + prepare(shader.fragment);
}
console.log(JSON.stringify({ threeRevision: T.REVISION, shaders }));
"""


class CompilerUnavailable(RuntimeError):
    pass


class NativeCompiler:
    def __init__(self):
        library = ctypes.util.find_library("EGL")
        if not library:
            raise CompilerUnavailable("Installed EGL library not found.")
        self.egl = C.CDLL(library)
        self.display = None
        self.context = None
        self.get_proc = self.core("eglGetProcAddress", C.c_void_p, C.c_char_p)
        platform_display = self.proc(
            "eglGetPlatformDisplayEXT", C.c_void_p, C.c_uint, C.c_void_p, C.POINTER(C.c_int)
        )
        self.display = platform_display(0x31DD, None, None)  # EGL_PLATFORM_SURFACELESS_MESA
        major, minor = C.c_int(), C.c_int()
        if not self.core("eglInitialize", C.c_uint, C.c_void_p, C.POINTER(C.c_int), C.POINTER(C.c_int))(
            self.display, C.byref(major), C.byref(minor)
        ):
            raise CompilerUnavailable("The installed EGL provider cannot initialize surfaceless compilation.")
        if not self.core("eglBindAPI", C.c_uint, C.c_uint)(0x30A0):  # EGL_OPENGL_ES_API
            raise CompilerUnavailable("The installed EGL provider does not expose the GLES compiler.")
        attributes = (C.c_int * 5)(0x3033, 1, 0x3040, 0x40, 0x3038)
        config, count = C.c_void_p(), C.c_int()
        chosen = self.core(
            "eglChooseConfig", C.c_uint, C.c_void_p, C.POINTER(C.c_int),
            C.POINTER(C.c_void_p), C.c_int, C.POINTER(C.c_int)
        )(self.display, attributes, C.byref(config), 1, C.byref(count))
        if not chosen or not count.value:
            raise CompilerUnavailable("No GLES 3 compiler configuration is available.")
        self.context = self.core(
            "eglCreateContext", C.c_void_p, C.c_void_p, C.c_void_p, C.c_void_p, C.POINTER(C.c_int)
        )(self.display, config, None, (C.c_int * 3)(0x3098, 3, 0x3038))
        self.make_current = self.core(
            "eglMakeCurrent", C.c_uint, C.c_void_p, C.c_void_p, C.c_void_p, C.c_void_p
        )
        if not self.context or not self.make_current(self.display, None, None, self.context):
            raise CompilerUnavailable("Could not activate the native compile-only context.")
        get_string = self.proc("glGetString", C.c_char_p, C.c_uint)
        self.details = {
            "eglVersion": f"{major.value}.{minor.value}",
            "shadingLanguage": get_string(0x8B8C).decode(),
            "renderer": get_string(0x1F01).decode(),
        }

    def core(self, name, result, *arguments):
        function = getattr(self.egl, name)
        function.restype, function.argtypes = result, arguments
        return function

    def proc(self, name, result, *arguments):
        address = self.get_proc(name.encode())
        if not address:
            raise CompilerUnavailable(f"Native compiler entry point missing: {name}")
        return C.CFUNCTYPE(result, *arguments)(address)

    def compile_pair(self, item):
        create = self.proc("glCreateShader", C.c_uint, C.c_uint)
        source = self.proc("glShaderSource", None, C.c_uint, C.c_int, C.POINTER(C.c_char_p), C.POINTER(C.c_int))
        compile_shader = self.proc("glCompileShader", None, C.c_uint)
        shader_status = self.proc("glGetShaderiv", None, C.c_uint, C.c_uint, C.POINTER(C.c_int))
        shader_log = self.proc("glGetShaderInfoLog", None, C.c_uint, C.c_int, C.POINTER(C.c_int), C.c_char_p)
        program = self.proc("glCreateProgram", C.c_uint)()
        attach = self.proc("glAttachShader", None, C.c_uint, C.c_uint)
        errors, handles = [], []
        try:
            for stage, kind in (("vertex", 0x8B31), ("fragment", 0x8B30)):
                shader = create(kind)
                handles.append(shader)
                data = C.c_char_p(item[stage].encode())
                source(shader, 1, C.byref(data), None)
                compile_shader(shader)
                status = C.c_int()
                shader_status(shader, 0x8B81, C.byref(status))
                if not status.value:
                    log = C.create_string_buffer(32768)
                    shader_log(shader, len(log), None, log)
                    errors.append({"stage": stage, "message": log.value.decode()})
                attach(program, shader)
            if not errors:
                self.proc("glLinkProgram", None, C.c_uint)(program)
                status = C.c_int()
                self.proc("glGetProgramiv", None, C.c_uint, C.c_uint, C.POINTER(C.c_int))(
                    program, 0x8B82, C.byref(status)
                )
                if not status.value:
                    log = C.create_string_buffer(32768)
                    self.proc("glGetProgramInfoLog", None, C.c_uint, C.c_int, C.POINTER(C.c_int), C.c_char_p)(
                        program, len(log), None, log
                    )
                    errors.append({"stage": "link", "message": log.value.decode()})
        finally:
            for shader in handles:
                self.proc("glDeleteShader", None, C.c_uint)(shader)
            self.proc("glDeleteProgram", None, C.c_uint)(program)
        return {
            "shader": item["name"],
            "status": "failed" if errors else "compiled_and_linked",
            "sourceSha256": hashlib.sha256((item["vertex"] + "\n" + item["fragment"]).encode()).hexdigest(),
            "errors": errors,
        }

    def close(self):
        if self.context:
            self.make_current(self.display, None, None, None)
            self.core("eglDestroyContext", C.c_uint, C.c_void_p, C.c_void_p)(self.display, self.context)
            self.context = None
        if self.display:
            self.core("eglTerminate", C.c_uint, C.c_void_p)(self.display)
            self.display = None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, help="Write the JSON evidence report at this path.")
    args = parser.parse_args()
    extracted = json.loads(subprocess.check_output(
        ["node", "--input-type=module", "-e", NODE_SOURCE], cwd=PROJECT, text=True
    ))
    report = {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "threeRevision": extracted["threeRevision"],
        "method": "Installed native EGL/GLES compiler and linker; no browser or frame rendering.",
        "scope": "Actual custom shaders and a representative Three MeshStandard fog/light/environment/shadow variant.",
        "limitations": "Does not validate browser appearance, framebuffer behavior, GPU performance, or every material variant.",
    }
    compiler = None
    try:
        compiler = NativeCompiler()
        report["compiler"] = compiler.details
        report["checks"] = [compiler.compile_pair(item) for item in extracted["shaders"]]
        report["status"] = "failed" if any(item["errors"] for item in report["checks"]) else "passed"
        result = 1 if report["status"] == "failed" else 0
    except CompilerUnavailable as error:
        report.update(status="unavailable", reason=str(error))
        result = 77
    finally:
        if compiler:
            compiler.close()
    output = json.dumps(report, indent=2) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(output)
    print(output, end="")
    return result


if __name__ == "__main__":
    raise SystemExit(main())
