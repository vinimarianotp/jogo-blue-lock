// ============================================================================
// O PRÉDIO EM 3D DE VERDADE (placa de vídeo / WebGL2)
// Mesmo prédio, mesmas salas e a mesma câmera atrás do jogador (estilo Doom em 3ª
// pessoa), mas desenhado na resolução da tela, com bordas lisas (MSAA), luz suave
// (mapa de luz filtrado), brilho especular das luminárias no chão, reflexo de
// verdade no piso (a cena espelhada), névoa, céu com estrelas, brilho (bloom) no
// que é aceso e acabamento de cor. Personagens e enfeites continuam em pixel art
// (nítida, sem borrar), como num jogo "HD-2D".
// Sem WebGL2 (ou se der erro) o jogo volta sozinho para o desenho por raios do
// js/hub3d.js. A qualidade se ajusta sozinha se o aparelho estiver lento.
// ============================================================================
(function () {
  const Hub = window.Hub;
  if (!Hub || !Hub._3d) return;
  const X = Hub._3d;
  const World = X.World;
  const { WALL_H, CAM_BACK, MW, MH, FTX, CTX, SPX } = X.C;
  const EYE_H = 1.36; // altura da câmera (abaixo das vigas das portas, 1,46)
  const FOVY = (58 * Math.PI) / 180;
  // níveis de qualidade: tamanho da imagem (s), reflexo no chão (r) e bordas lisas/MSAA (m)
  const LEVELS = [{ s: 1, r: 1, m: 1 }, { s: 0.85, r: 1, m: 1 }, { s: 0.72, r: 1, m: 1 }, { s: 0.62, r: 0, m: 1 }, { s: 0.52, r: 0, m: 0 }, { s: 0.42, r: 0, m: 0 }];

  // ---------------------------------------------------------------- matrizes (coluna-major)
  const M = {
    persp(fy, a, n, f) {
      const t = 1 / Math.tan(fy / 2);
      return new Float32Array([t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]);
    },
    look(e, c, u) {
      let zx = e[0] - c[0];
      let zy = e[1] - c[1];
      let zz = e[2] - c[2];
      let l = Math.hypot(zx, zy, zz) || 1;
      zx /= l;
      zy /= l;
      zz /= l;
      let xx = u[1] * zz - u[2] * zy;
      let xy = u[2] * zx - u[0] * zz;
      let xz = u[0] * zy - u[1] * zx;
      l = Math.hypot(xx, xy, xz) || 1;
      xx /= l;
      xy /= l;
      xz /= l;
      const yx = zy * xz - zz * xy;
      const yy = zz * xx - zx * xz;
      const yz = zx * xy - zy * xx;
      return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
    },
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
      return o;
    },
    inv(m) {
      const o = new Float32Array(16);
      const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
      const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
      const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
      const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
      const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
      let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!d) return o;
      d = 1 / d;
      o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d;
      o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d;
      o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d;
      o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d;
      o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d;
      o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d;
      o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d;
      o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
      o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d;
      o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d;
      o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d;
      o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d;
      o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d;
      o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d;
      o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d;
      o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d;
      return o;
    }
  };
  const MIRROR = new Float32Array([1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

  // ---------------------------------------------------------------- shaders
  const OUT = 'layout(location=0) out vec4 oCol;\nlayout(location=1) out vec4 oGlow;\n';
  const VS_WORLD = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUv;
layout(location=2) in vec3 aNrm;
uniform mat4 uVP;
out vec3 vPos; out vec2 vUv; out vec3 vNrm;
void main() { vPos = aPos; vUv = aUv; vNrm = aNrm; gl_Position = uVP * vec4(aPos, 1.0); }`;
  const FS_WORLD = `#version 300 es
precision highp float;
in vec3 vPos; in vec2 vUv; in vec3 vNrm;
uniform sampler2D uTex; uniform sampler2D uLM; uniform sampler2D uMat; uniform sampler2D uRefl;
uniform vec2 uMap; uniform vec3 uCam; uniform vec3 uFog; uniform float uFogK; uniform float uWallH;
uniform float uMode; uniform float uUseRefl; uniform vec2 uView;
uniform vec4 uLP[8]; uniform vec3 uLC[8]; uniform int uNL;
${OUT}
void main() {
  vec4 t = texture(uTex, vUv);
  if (t.a < 0.3) discard;
  bool em = t.a < 0.85;
  vec3 N = normalize(vNrm);
  vec4 lm = texture(uLM, (vPos.xz + N.xz * 0.14) / uMap);
  vec3 light = lm.rgb * 2.0;
  float ao = 1.0;
  float shiny = 0.05;
  if (uMode < 0.5) {
    if (N.y < 0.5) {
      float h = vPos.y;
      ao = mix(0.55, 1.0, smoothstep(0.0, 0.45, h)) * mix(0.78, 1.0, smoothstep(uWallH, uWallH - 0.35, h));
      ao *= 1.0 - 0.1 * abs(N.z);
    }
  } else if (uMode < 1.5) {
    ao = lm.a;
    shiny = texture(uMat, vPos.xz / uMap).r;
  } else {
    ao = 0.6;
  }
  vec3 col = t.rgb * light * ao;
  vec3 V = normalize(uCam - vPos);
  for (int i = 0; i < 8; i++) {
    if (i >= uNL) break;
    vec3 L = uLP[i].xyz - vPos;
    float d = length(L);
    float r = uLP[i].w;
    if (d < r) {
      L /= d;
      vec3 H = normalize(L + V);
      float s = pow(max(dot(N, H), 0.0), 40.0) * (1.0 - d / r) * max(dot(N, L), 0.0);
      col += uLC[i] * s * (0.12 + shiny * 2.8);
    }
  }
  if (uMode > 0.5 && uMode < 1.5 && uUseRefl > 0.5 && shiny > 0.01) {
    vec3 rc = texture(uRefl, gl_FragCoord.xy / uView).rgb;
    float fr = 0.3 + 0.7 * pow(1.0 - max(dot(N, V), 0.0), 3.0);
    col = mix(col, rc, clamp(shiny * 1.5 * fr, 0.0, 0.55));
  }
  if (em) col = t.rgb * 1.45;
  float f = exp(-length(uCam - vPos) * uFogK);
  col = mix(uFog, col, f);
  oCol = vec4(col, 1.0);
  oGlow = vec4(em ? t.rgb * f * (uMode > 1.5 ? 0.45 : 0.9) : max(col - 0.85, 0.0) * 0.5, 1.0);
}`;
  const VS_SPR = `#version 300 es
layout(location=0) in vec2 aC;
uniform mat4 uVP; uniform vec3 uPos; uniform vec2 uSize; uniform vec3 uRight; uniform float uFoot; uniform float uKind;
out vec2 vUv; out vec3 vPos;
void main() {
  vec3 p;
  if (uKind > 0.5) p = uPos + vec3((aC.x - 0.5) * uSize.x, 0.012, (aC.y - 0.5) * uSize.x);
  else p = uPos + uRight * ((aC.x - 0.5) * uSize.x) + vec3(0.0, (aC.y - uFoot) * uSize.y, 0.0);
  vPos = p; vUv = vec2(aC.x, 1.0 - aC.y);
  gl_Position = uVP * vec4(p, 1.0);
}`;
  const FS_SPR = `#version 300 es
precision highp float;
in vec2 vUv; in vec3 vPos;
uniform sampler2D uTex; uniform vec3 uLight; uniform vec3 uCam; uniform vec3 uFog; uniform float uFogK;
uniform float uAlpha; uniform float uGlow; uniform float uKind;
${OUT}
void main() {
  if (uKind > 0.5) {
    vec2 q = vUv * 2.0 - 1.0;
    float d = dot(q, q);
    if (d > 1.0) discard;
    float a = (1.0 - d) * 0.55 * uAlpha;
    oCol = vec4(0.0, 0.0, 0.0, a); oGlow = vec4(0.0, 0.0, 0.0, a);
    return;
  }
  vec4 t = texture(uTex, vUv);
  if (t.a < 0.5) discard;
  bool em = uGlow > 0.5 || t.a < 0.85;
  vec3 col = em ? t.rgb * 1.5 : t.rgb * uLight;
  float f = exp(-length(uCam - vPos) * uFogK);
  col = mix(uFog, col, f);
  oCol = vec4(col, uAlpha);
  oGlow = vec4(em ? t.rgb * f : vec3(0.0), uAlpha);
}`;
  const VS_FULL = `#version 300 es
out vec2 vUv;
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
  const FS_SKY = `#version 300 es
precision highp float;
in vec2 vUv;
uniform mat4 uInv; uniform vec3 uTop; uniform vec3 uHor; uniform float uStars;
${OUT}
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec2 n = vUv * 2.0 - 1.0;
  vec4 a = uInv * vec4(n, -1.0, 1.0);
  vec4 b = uInv * vec4(n, 1.0, 1.0);
  vec3 d = normalize(b.xyz / b.w - a.xyz / a.w);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 c = mix(uHor, uTop, pow(h, 0.55));
  vec3 g = floor(d * 260.0);
  float s = hash(g);
  float star = step(1.0 - uStars, s) * smoothstep(0.03, 0.25, d.y) * (0.45 + 0.55 * hash(g + 7.0));
  c += vec3(star);
  oCol = vec4(c, 1.0);
  oGlow = vec4(vec3(star) * 0.5, 1.0);
}`;
  const VS_DUST = `#version 300 es
layout(location=0) in vec4 aP;
uniform mat4 uVP; uniform float uPx;
out float vB;
void main() { gl_Position = uVP * vec4(aP.xyz, 1.0); gl_PointSize = clamp(uPx / gl_Position.w, 1.5, 7.0); vB = aP.w; }`;
  const FS_DUST = `#version 300 es
precision highp float;
in float vB;
uniform vec3 uCol;
${OUT}
void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float d = dot(q, q); if (d > 1.0) discard; float a = (1.0 - d) * vB; oCol = vec4(uCol * a, 1.0); oGlow = vec4(uCol * a * 0.6, 1.0); }`;
  const FS_DOWN = `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uK;
out vec4 o;
void main() {
  vec4 s = texture(uSrc, vUv + uTexel * vec2(-1.0, -1.0)) + texture(uSrc, vUv + uTexel * vec2(1.0, -1.0)) + texture(uSrc, vUv + uTexel * vec2(-1.0, 1.0)) + texture(uSrc, vUv + uTexel * vec2(1.0, 1.0));
  o = vec4(s.rgb * 0.25 * uK, 1.0);
}`;
  const FS_COMP = `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uScene; uniform sampler2D uBloom; uniform float uBloomK; uniform float uExpo;
out vec4 o;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 c = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  c = aces(c * uExpo);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 1.12);
  vec2 q = vUv - 0.5;
  c *= 1.0 - dot(q, q) * 0.6;
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

  // ---------------------------------------------------------------- estado
  const GL = { ok: undefined, scale: 1, groups: [], tex: new WeakMap(), worldTex: [], key: '' };
  let gl = null;
  let cvs = null;

  function compile(vs, fs) {
    const mk = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    const locs = {};
    return { p, u: (n) => (n in locs ? locs[n] : (locs[n] = gl.getUniformLocation(p, n))) };
  }
  function texture2D(w, h, data, o = {}) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, o.internal || gl.RGBA8, w, h, 0, gl.RGBA, o.type || gl.UNSIGNED_BYTE, data || null);
    const mip = o.mip && data;
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : o.linear ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, o.linear ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (mip && GL.aniso) gl.texParameterf(gl.TEXTURE_2D, GL.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(GL.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1));
    return t;
  }
  // textura do js/hub3d.js ({w, h, px, em}) → RGBA com o alfa marcando aceso (170) e vazio (0)
  function encode(t) {
    const n = t.w * t.h;
    const src = new Uint8Array(t.px.buffer, t.px.byteOffset, n * 4);
    const out = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) {
      const j = i * 4;
      const a = src[j + 3];
      out[j] = src[j];
      out[j + 1] = src[j + 1];
      out[j + 2] = src[j + 2];
      out[j + 3] = a < 128 ? 0 : t.em && t.em[i] ? 170 : 255;
    }
    return out;
  }
  function glTexOf(t, sprite) {
    let g = GL.tex.get(t);
    if (!g) {
      g = texture2D(t.w, t.h, encode(t), { mip: !sprite });
      GL.tex.set(t, g);
      GL.worldTex.push(g);
    }
    return g;
  }
  function upload(glt, t, mip) {
    gl.bindTexture(gl.TEXTURE_2D, glt);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, t.w, t.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, encode(t));
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  }

  function init() {
    try {
      if (!Hub.cv) return false;
      if (cvs) cvs.remove();
      cvs = document.createElement('canvas');
      cvs.className = 'hub-canvas hub-gl';
      cvs.style.pointerEvents = 'none';
      Hub.cv.after(cvs);
      const attrs = { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false };
      gl = cvs.getContext('webgl2', attrs) || cvs.getContext('webgl2', { alpha: false });
      if (!gl) throw new Error('o navegador não tem WebGL2');
      // o celular pode "perder" a placa de vídeo (app em segundo plano, pouca memória):
      // aí o 3D é montado de novo no próximo quadro
      cvs.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        GL.lost = true;
      });
      GL.hasFloat = !!gl.getExtension('EXT_color_buffer_float');
      GL.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      applyCfg();
      GL.pWorld = compile(VS_WORLD, FS_WORLD);
      GL.pSpr = compile(VS_SPR, FS_SPR);
      GL.pSky = compile(VS_FULL, FS_SKY);
      GL.pDust = compile(VS_DUST, FS_DUST);
      GL.pDown = compile(VS_FULL, FS_DOWN);
      GL.pComp = compile(VS_FULL, FS_COMP);
      GL.vaoFull = gl.createVertexArray();
      GL.vaoQuad = gl.createVertexArray();
      gl.bindVertexArray(GL.vaoQuad);
      const qb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, qb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      GL.vaoDust = gl.createVertexArray();
      gl.bindVertexArray(GL.vaoDust);
      GL.dustBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, GL.dustBuf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      // setinha amarela (acesa) em cima do que dá para usar
      GL.arrow = X.makeTex(15, 12, (g, e) => {
        const rows = [[0, 15], [1, 13], [2, 11], [3, 9], [4, 7], [5, 5], [6, 3]];
        rows.forEach(([y, w]) => {
          g.fillStyle = '#0f172a';
          g.fillRect(7 - Math.floor(w / 2) - 1 < 0 ? 0 : 7 - Math.floor(w / 2), y + 2, w, 2);
        });
        rows.forEach(([y, w]) => {
          g.fillStyle = y ? '#facc15' : '#fef08a';
          g.fillRect(7 - Math.floor(w / 2), y + 1, w, 1);
          e.fillStyle = '#fff';
          e.fillRect(7 - Math.floor(w / 2), y + 1, w, 1);
        });
      });
      GL.arrowTex = texture2D(GL.arrow.w, GL.arrow.h, encode(GL.arrow), {});
      GL.charTex = [];
      World.gl = true;
      return true;
    } catch (err) {
      console.warn('[hub3d_gl] usando o desenho por raios:', err);
      GL.err = short(err);
      if (cvs) cvs.remove();
      cvs = null;
      gl = null;
      World.gl = false;
      return false;
    }
  }
  const short = (err) => String((err && err.message) || err || '').slice(0, 60);
  // jeitos de montar as telas de desenho, do mais bonito para o mais simples: se o
  // aparelho não aceitar um, tenta o próximo antes de desistir do 3D
  const CFGS = [{ hdr: 1, ms: 1 }, { hdr: 1, ms: 0 }, { hdr: 0, ms: 1 }, { hdr: 0, ms: 0 }];
  function applyCfg() {
    GL.cfg = GL.cfg || 0;
    const c = CFGS[GL.cfg];
    GL.hdr = !!(c.hdr && GL.hasFloat);
    const fmt = GL.hdr ? gl.RGBA16F : gl.RGBA8;
    let ms = 0;
    if (c.ms) {
      try {
        const list = gl.getInternalformatParameter(gl.RENDERBUFFER, fmt, gl.SAMPLES) || [];
        ms = Math.min(4, Math.max(0, ...Array.from(list).filter((n) => n <= 4)));
      } catch (e) {
        ms = 0;
      }
    }
    GL.maxSamples = ms;
    GL.samples = ms;
    GL.W = 0;
    GL.msFbo = undefined;
  }
  // deu erro montando/desenhando: tenta um jeito mais simples; sem mais nenhum, desiste
  function downgrade(err) {
    GL.errs = (GL.errs || []).concat(short(err)).slice(-4);
    if (!gl || GL.cfg >= CFGS.length - 1) return false;
    GL.cfg++;
    console.warn('[hub3d_gl] tentando um jeito mais simples:', CFGS[GL.cfg], err);
    applyCfg();
    return true;
  }
  function fail(err) {
    console.error('[hub3d_gl] erro, voltando para o desenho por raios:', err);
    GL.err = short(err);
    GL.ok = false;
    if (cvs) cvs.remove();
    cvs = null;
    gl = null;
    World.gl = false;
    World.key = ''; // remonta com o chão aceso do modo antigo
  }
  // monta tudo de novo (placa de vídeo perdida e devolvida)
  function rebuild() {
    if (cvs) cvs.remove();
    cvs = null;
    gl = null;
    GL.lost = false;
    GL.ok = undefined;
    GL.groups = [];
    GL.tex = new WeakMap();
    GL.worldTex = [];
    GL.res = [];
    GL.key = '';
    GL.W = 0;
    GL.msFbo = undefined;
    GL.losses = (GL.losses || 0) + 1;
  }

  // ---------------------------------------------------------------- telas de desenho (FBOs)
  function targets(w, h) {
    if (GL.W === w && GL.H === h && GL.msFbo !== undefined) return;
    for (let i = 0; i < 8 && gl.getError(); i++); // (limpa erros antigos antes de conferir os novos)
    const old = GL.res || [];
    old.forEach((o) => (o instanceof WebGLTexture ? gl.deleteTexture(o) : o instanceof WebGLRenderbuffer ? gl.deleteRenderbuffer(o) : o instanceof WebGLFramebuffer ? gl.deleteFramebuffer(o) : 0));
    const res = (GL.res = []);
    GL.W = w;
    GL.H = h;
    const fmt = GL.hdr ? gl.RGBA16F : gl.RGBA8;
    const type = GL.hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    const tex = (tw, th) => {
      const t = texture2D(tw, th, null, { internal: fmt, type, linear: true });
      res.push(t);
      return t;
    };
    const chk = (name) => {
      const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`tela ${name} recusada (${st})`);
    };
    const fbo = (t, depth) => {
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (depth) {
        const d = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, d);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, depth[0], depth[1]);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, d);
        res.push(d);
      }
      res.push(f);
      chk(depth ? 'reflexo' : 'brilho');
      return f;
    };
    // cena: com MSAA (bordas lisas) em renderbuffers, resolvida em texturas
    GL.sceneTex = tex(w, h);
    GL.glowTex = tex(w, h);
    GL.sceneFbo = fbo(GL.sceneTex);
    GL.glowFbo = fbo(GL.glowTex);
    if (GL.samples > 0) {
      GL.msFbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, GL.msFbo);
      [0, 1].forEach((i) => {
        const rb = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, GL.samples, fmt, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.RENDERBUFFER, rb);
        res.push(rb);
      });
      const d = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, d);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, GL.samples, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, d);
      res.push(d, GL.msFbo);
    } else {
      GL.msFbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, GL.msFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, GL.sceneTex, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, GL.glowTex, 0);
      const d = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, d);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, d);
      res.push(d, GL.msFbo);
    }
    chk(GL.samples > 0 ? 'da cena (MSAA)' : 'da cena');
    const ge = gl.getError();
    if (ge) throw new Error(`erro ${ge} montando as telas`);
    // reflexo (cena espelhada) em meia resolução
    const rw = Math.max(2, w >> 1);
    const rh = Math.max(2, h >> 1);
    GL.reflTex = tex(rw, rh);
    GL.reflFbo = fbo(GL.reflTex, [rw, rh]);
    GL.reflSize = [rw, rh];
    // brilho: 1/2, 1/4, 1/8, 1/16
    GL.bloom = [];
    for (let k = 1; k <= 4; k++) {
      const bw = Math.max(2, w >> k);
      const bh = Math.max(2, h >> k);
      const t = tex(bw, bh);
      GL.bloom.push({ t, f: fbo(t), w: bw, h: bh });
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // ---------------------------------------------------------------- o prédio em triângulos
  function buildScene() {
    GL.groups.forEach((g) => {
      gl.deleteBuffer(g.buf);
      gl.deleteVertexArray(g.vao);
    });
    GL.worldTex.forEach((t) => gl.deleteTexture(t));
    GL.worldTex = [];
    GL.tex = new WeakMap();
    const groups = new Map();
    const grp = (key, mode) => {
      let g = groups.get(key);
      if (!g) groups.set(key, (g = { key, mode: mode || 0, v: [] }));
      return g;
    };
    const quad = (g, a, b, c, d, n, u0 = 0, u1 = 1, v0 = 0, v1 = 1) => {
      const P = (p, u, v) => g.v.push(p[0], p[1], p[2], u, v, n[0], n[1], n[2]);
      P(a, u0, v0);
      P(b, u1, v0);
      P(c, u1, v1);
      P(a, u0, v0);
      P(c, u1, v1);
      P(d, u0, v1);
    };
    const m = World.map;
    const H = WALL_H;
    // paredes: cada face de bloco virada para um lugar onde dá para andar
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const idx = y * MW + x;
      const sv = m.solid[idx];
      if (!sv) continue;
      const fc = m.face[idx] || {};
      [['N', 0, -1], ['S', 0, 1], ['W', -1, 0], ['E', 1, 0]].forEach(([dir, dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) return;
        const ni = ny * MW + nx;
        if (m.solid[ni]) return;
        const ai = m.area[ni];
        const style = X.AREAS[X.AREA_IDS[ai >= 0 ? ai : 2]].wall;
        const sp = fc[dir];
        let g;
        let u0 = 0;
        let u1 = 1;
        if (sp && sp.startsWith('screen:')) {
          g = grp('screen');
          const i = Number(sp.slice(7));
          u0 = i / 4;
          u1 = (i + 1) / 4;
        } else g = grp(World.wallTex(sp || (sv === 2 ? 'pillar' : 'base'), style));
        if (dir === 'N') quad(g, [x + 1, H, y], [x, H, y], [x, 0, y], [x + 1, 0, y], [0, 0, -1], u0, u1);
        else if (dir === 'S') quad(g, [x, H, y + 1], [x + 1, H, y + 1], [x + 1, 0, y + 1], [x, 0, y + 1], [0, 0, 1], u0, u1);
        else if (dir === 'W') quad(g, [x, H, y], [x, H, y + 1], [x, 0, y + 1], [x, 0, y], [-1, 0, 0], u0, u1);
        else quad(g, [x + 1, H, y + 1], [x + 1, H, y], [x + 1, 0, y], [x + 1, 0, y + 1], [1, 0, 0], u0, u1);
      });
    }
    // móveis (caixas)
    World.boxes.forEach((b) => {
      const { x0, y0, x1, y1, z0, z1 } = b;
      const key = (dir, t) => (b === World.wheel && (dir === 'N' || dir === 'S') ? 'wheel' : b === World.tube && dir.length === 1 && 'NSEW'.includes(dir) ? 'tube' : t);
      const f = b.f;
      if (f.N) quad(grp(key('N', f.N)), [x1, z1, y0], [x0, z1, y0], [x0, z0, y0], [x1, z0, y0], [0, 0, -1]);
      if (f.S) quad(grp(key('S', f.S)), [x0, z1, y1], [x1, z1, y1], [x1, z0, y1], [x0, z0, y1], [0, 0, 1]);
      if (f.W) quad(grp(key('W', f.W)), [x0, z1, y0], [x0, z1, y1], [x0, z0, y1], [x0, z0, y0], [-1, 0, 0]);
      if (f.E) quad(grp(key('E', f.E)), [x1, z1, y1], [x1, z1, y0], [x1, z0, y0], [x1, z0, y1], [1, 0, 0]);
      if (f.T) quad(grp(f.T), [x0, z1, y0], [x1, z1, y0], [x1, z1, y1], [x0, z1, y1], [0, 1, 0]);
      if (f.B && z0 > 0.01) quad(grp(f.B), [x0, z0, y1], [x1, z0, y1], [x1, z0, y0], [x0, z0, y0], [0, -1, 0]);
    });
    // chão (um quadrão com a textura do andar inteiro) e teto (fora do campo)
    quad(grp('floor', 1), [0, 0, 0], [MW, 0, 0], [MW, 0, MH], [0, 0, MH], [0, 1, 0]);
    const CAMPO = X.AREA_IDS.indexOf('campo');
    const cg = grp('ceil', 2);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      if (m.solid[i] || m.area[i] < 0 || m.area[i] === CAMPO) continue;
      quad(cg, [x, H, y + 1], [x + 1, H, y + 1], [x + 1, H, y], [x, H, y], [0, -1, 0], x / MW, (x + 1) / MW, (y + 1) / MH, y / MH);
    }
    // texturas fixas e as que mudam (telão, roleta, tubo)
    const asTex = (k) => {
      if (k === 'floor') return GL.floorTex;
      if (k === 'ceil') return GL.ceilTex;
      if (k === 'screen') return GL.screenTex;
      if (k === 'wheel') return GL.wheelTex;
      if (k === 'tube') return GL.tubeTex;
      return glTexOf(k);
    };
    const mkDyn = (t) => {
      const g = texture2D(t.w, t.h, encode(t), { mip: true });
      GL.worldTex.push(g);
      return g;
    };
    GL.screenTex = mkDyn(World.screenTex);
    GL.screenObj = World.screenTex;
    GL.wheelTex = mkDyn(World.wheel.f.S);
    GL.wheelObj = World.wheel.f.S;
    GL.tubeTex = mkDyn(World.tube.f.N);
    GL.tubeObj = World.tube.f.N;
    const FW = MW * FTX;
    GL.floorTex = texture2D(FW, MH * FTX, new Uint8Array(World.FA.buffer), { mip: true });
    GL.ceilTex = texture2D(MW * CTX, MH * CTX, new Uint8Array(World.CA.buffer), { mip: true });
    GL.worldTex.push(GL.floorTex, GL.ceilTex);
    // mapa de luz (suave) + escurecido dos cantos no alfa
    const LW = MW * X.C.LM;
    const LH = MH * X.C.LM;
    const lm = new Uint8Array(LW * LH * 4);
    for (let i = 0; i < LW * LH; i++) {
      lm[i * 4] = Math.min(255, World.L[i * 3] * 127.5);
      lm[i * 4 + 1] = Math.min(255, World.L[i * 3 + 1] * 127.5);
      lm[i * 4 + 2] = Math.min(255, World.L[i * 3 + 2] * 127.5);
      lm[i * 4 + 3] = Math.min(255, World.AO[i] * 255);
    }
    GL.lmTex = texture2D(LW, LH, lm, { linear: true });
    // quanto o chão de cada ladrilho reflete
    const mat = new Uint8Array(MW * MH * 4);
    for (let i = 0; i < MW * MH; i++) {
      const a = m.area[i];
      mat[i * 4] = a >= 0 ? Math.round(X.REFL[a] * 255) : 0;
      mat[i * 4 + 3] = 255;
    }
    GL.matTex = texture2D(MW, MH, mat, {});
    GL.worldTex.push(GL.lmTex, GL.matTex);
    GL.groups = [];
    groups.forEach((g) => {
      const data = new Float32Array(g.v);
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 32, 12);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 32, 20);
      GL.groups.push({ vao, buf, n: data.length / 8, mode: g.mode, tex: asTex(g.key) });
    });
    gl.bindVertexArray(null);
    GL.key = World.key;
  }

  // ---------------------------------------------------------------- desenhar
  function drawWorld(VP, eye, mirror, F) {
    const P = GL.pWorld;
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u('uVP'), false, VP);
    gl.uniform2f(P.u('uMap'), MW, MH);
    gl.uniform3fv(P.u('uCam'), eye);
    gl.uniform3fv(P.u('uFog'), F.fog);
    gl.uniform1f(P.u('uFogK'), F.fogK);
    gl.uniform1f(P.u('uWallH'), WALL_H);
    gl.uniform1f(P.u('uUseRefl'), mirror || !F.useRefl ? 0 : 1);
    gl.uniform2f(P.u('uView'), GL.W, GL.H);
    gl.uniform4fv(P.u('uLP'), F.lp);
    gl.uniform3fv(P.u('uLC'), F.lc);
    gl.uniform1i(P.u('uNL'), F.nl);
    gl.uniform1i(P.u('uTex'), 0);
    gl.uniform1i(P.u('uLM'), 1);
    gl.uniform1i(P.u('uMat'), 2);
    gl.uniform1i(P.u('uRefl'), 3);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, GL.lmTex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, GL.matTex);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, mirror ? null : GL.reflTex);
    gl.activeTexture(gl.TEXTURE0);
    for (let i = 0; i < GL.groups.length; i++) {
      const g = GL.groups[i];
      if (mirror && g.mode === 1) continue;
      gl.uniform1f(P.u('uMode'), g.mode);
      gl.bindTexture(gl.TEXTURE_2D, g.tex);
      gl.bindVertexArray(g.vao);
      gl.drawArrays(gl.TRIANGLES, 0, g.n);
    }
  }
  function drawSky(VP, F) {
    const P = GL.pSky;
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u('uInv'), false, M.inv(VP));
    gl.uniform3fv(P.u('uTop'), F.skyTop);
    gl.uniform3fv(P.u('uHor'), F.skyHor);
    gl.uniform1f(P.u('uStars'), F.stars);
    gl.bindVertexArray(GL.vaoFull);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
  }
  function drawSprites(VP, eye, F, list, mirror) {
    const P = GL.pSpr;
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u('uVP'), false, VP);
    gl.uniform3fv(P.u('uCam'), eye);
    gl.uniform3fv(P.u('uFog'), F.fog);
    gl.uniform1f(P.u('uFogK'), F.fogK);
    gl.uniform3fv(P.u('uRight'), F.right);
    gl.uniform1i(P.u('uTex'), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(GL.vaoQuad);
    // sombras redondas no chão (só na cena de verdade)
    if (!mirror) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.uniform1f(P.u('uKind'), 1);
      list.forEach((s) => {
        if (!s.shadow || s.z > 0.05) return;
        gl.uniform3f(P.u('uPos'), s.x, 0, s.y);
        gl.uniform2f(P.u('uSize'), s.shadow * 2.4, s.shadow * 2.4);
        gl.uniform1f(P.u('uAlpha'), 1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      });
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
    gl.uniform1f(P.u('uKind'), 0);
    const ghosts = [];
    list.forEach((s) => {
      if (s.alpha < 1) {
        ghosts.push(s);
        return;
      }
      one(P, s);
    });
    if (ghosts.length) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      ghosts.forEach((s) => one(P, s));
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
  }
  function one(P, s) {
    gl.bindTexture(gl.TEXTURE_2D, s.tex);
    gl.uniform3f(P.u('uPos'), s.x, s.z || 0, s.y);
    gl.uniform2f(P.u('uSize'), s.w, s.h);
    gl.uniform1f(P.u('uFoot'), s.foot || 0);
    gl.uniform3fv(P.u('uLight'), s.light);
    gl.uniform1f(P.u('uAlpha'), s.alpha);
    gl.uniform1f(P.u('uGlow'), s.glow ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function drawDust(VP, F) {
    if (!F.dust || !F.dust.length) return;
    const P = GL.pDust;
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u('uVP'), false, VP);
    gl.uniform1f(P.u('uPx'), GL.H * 0.012);
    gl.uniform3fv(P.u('uCol'), F.dustCol);
    gl.bindVertexArray(GL.vaoDust);
    gl.bindBuffer(gl.ARRAY_BUFFER, GL.dustBuf);
    gl.bufferData(gl.ARRAY_BUFFER, F.dust, gl.DYNAMIC_DRAW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.depthMask(false);
    gl.drawArrays(gl.POINTS, 0, F.dust.length / 4);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }
  function post(F) {
    // resolve o MSAA nas texturas
    if (GL.samples > 0) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, GL.msFbo);
      gl.readBuffer(gl.COLOR_ATTACHMENT0);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, GL.sceneFbo);
      gl.blitFramebuffer(0, 0, GL.W, GL.H, 0, 0, GL.W, GL.H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.readBuffer(gl.COLOR_ATTACHMENT1);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, GL.glowFbo);
      gl.blitFramebuffer(0, 0, GL.W, GL.H, 0, 0, GL.W, GL.H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(GL.vaoFull);
    const D = GL.pDown;
    gl.useProgram(D.p);
    gl.uniform1i(D.u('uSrc'), 0);
    gl.activeTexture(gl.TEXTURE0);
    // brilho: reduz em 4 tamanhos e soma de volta, do menor para o maior
    let src = GL.glowTex;
    let sw = GL.W;
    let sh = GL.H;
    gl.uniform1f(D.u('uK'), 1);
    GL.bloom.forEach((b) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, b.f);
      gl.viewport(0, 0, b.w, b.h);
      gl.uniform2f(D.u('uTexel'), 1 / sw, 1 / sh);
      gl.bindTexture(gl.TEXTURE_2D, src);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      src = b.t;
      sw = b.w;
      sh = b.h;
    });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = GL.bloom.length - 1; i > 0; i--) {
      const s = GL.bloom[i];
      const d = GL.bloom[i - 1];
      gl.bindFramebuffer(gl.FRAMEBUFFER, d.f);
      gl.viewport(0, 0, d.w, d.h);
      gl.uniform2f(D.u('uTexel'), 0.5 / s.w, 0.5 / s.h);
      gl.uniform1f(D.u('uK'), 0.9);
      gl.bindTexture(gl.TEXTURE_2D, s.t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);
    // junta tudo na tela: cena + brilho, tom de cinema, cor e vinheta
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, cvs.width, cvs.height);
    const C = GL.pComp;
    gl.useProgram(C.p);
    gl.uniform1i(C.u('uScene'), 0);
    gl.uniform1i(C.u('uBloom'), 1);
    gl.uniform1f(C.u('uBloomK'), 0.85);
    gl.uniform1f(C.u('uExpo'), F.expo);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, GL.bloom[0].t);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, GL.sceneTex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ---------------------------------------------------------------- um quadro
  function frame(hub) {
    const th = hub.theme3();
    if (GL.key !== World.key || !GL.groups.length) buildScene();
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 720;
    const touch = document.documentElement.classList.contains('is-touch');
    if (GL.level === undefined) GL.level = touch ? 1 : 0;
    const Q = LEVELS[GL.level];
    const pr = Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2) * (Hub.glFix && GL.scale !== 1 ? GL.scale : Q.s);
    const wantS = Q.m ? GL.maxSamples : 0;
    if (GL.samples !== wantS) {
      GL.samples = wantS;
      GL.W = 0;
    }
    const W = Math.max(64, Math.round(vw * pr));
    const H = Math.max(64, Math.round(vh * pr));
    if (cvs.width !== W || cvs.height !== H) {
      cvs.width = W;
      cvs.height = H;
    }
    targets(W, H);
    const t = hub.t;
    // telas que mexem: telão, roleta e tubo do Fluxo
    if (hub.area === 'saguao' && t % 6 === 0) World.screenTex = X.makeScreen(th, t);
    if (World.screenTex !== GL.screenObj) {
      upload(GL.screenTex, World.screenTex, true);
      GL.screenObj = World.screenTex;
    }
    if (hub.area === 'armas' || hub.area === 'subsolo') {
      if (t % 2 === 0) World.wheel.f.S = World.wheel.f.N = X.wheelTex(t);
      if (t % 3 === 0) {
        const tt = X.tubeTex(t);
        ['N', 'S', 'E', 'W'].forEach((d) => (World.tube.f[d] = tt));
      }
    }
    if (World.wheel.f.S !== GL.wheelObj) {
      upload(GL.wheelTex, World.wheel.f.S, true);
      GL.wheelObj = World.wheel.f.S;
    }
    if (World.tube.f.N !== GL.tubeObj) {
      upload(GL.tubeTex, World.tube.f.N, true);
      GL.tubeObj = World.tube.f.N;
    }
    // câmera atrás de você (chega mais perto se tiver parede atrás)
    const cdx = Math.cos(hub.camA);
    const cdy = Math.sin(hub.camA);
    let back = CAM_BACK;
    for (let d = 0.15; d <= CAM_BACK; d += 0.05) {
      const x = hub.px - cdx * d;
      const y = hub.py - cdy * d;
      let hit = World.isSolid(Math.floor(x), Math.floor(y));
      if (!hit) {
        const l = World.bcell[Math.floor(y) * MW + Math.floor(x)];
        if (l) hit = l.some((id) => {
          const b = World.boxes[id];
          return b.z1 > EYE_H - 0.1 && b.z0 < EYE_H + 0.1 && x > b.x0 - 0.12 && x < b.x1 + 0.12 && y > b.y0 - 0.12 && y < b.y1 + 0.12;
        });
      }
      if (hit) {
        back = Math.max(0.3, d - 0.25);
        break;
      }
    }
    hub._back = hub._back === undefined || back < hub._back ? back : hub._back + (back - hub._back) * 0.1;
    const bk = hub._back;
    const eye = new Float32Array([hub.px - cdx * bk, EYE_H, hub.py - cdy * bk]);
    // (celular em pé: a câmera olha mais para baixo, menos teto e mais chão)
    const asp = W / H;
    const lookH = asp >= 1.3 ? 0.6 : 0.6 - (1.3 - asp) * 0.9;
    const look = [hub.px + cdx * 1.7, lookH, hub.py + cdy * 1.7];
    // celular em pé: abre o ângulo de visão para não ficar só o seu boneco na tela
    const fovy = asp >= 1.3 ? FOVY : Math.min((88 * Math.PI) / 180, 2 * Math.atan((Math.tan(FOVY / 2) * 1.3) / asp));
    // câmera de vitrine: com uma aba aberta, ela desliza até o que você usou (roleta, PC,
    // balcão...) e deixa ele do lado esquerdo; a janela de vidro fica do lado direito
    const f = hub.focus;
    const wantF = hub.panel && f ? 1 : 0;
    const nowF = performance.now();
    const dtF = Math.min(0.1, (nowF - (GL.fkT || nowF)) / 1000);
    GL.fkT = nowF;
    GL.fk = (GL.fk || 0) + (wantF - (GL.fk || 0)) * Math.min(1, dtF * 4.5);
    if (f && GL.fk > 0.002) {
      let vx = hub.px - f.x;
      let vy = hub.py - f.y;
      let l = Math.hypot(vx, vy);
      if (l < 0.2) {
        vx = -Math.cos(hub.ang);
        vy = -Math.sin(hub.ang);
        l = 1;
      }
      vx /= l;
      vy /= l;
      // gira um pouco para o seu boneco não ficar na frente do objeto
      const rc = Math.cos(0.6);
      const rs = Math.sin(0.6);
      const ux = vx * rc - vy * rs;
      const uy = vx * rs + vy * rc;
      let d = 2.5;
      for (let k = 0.3; k <= 2.5; k += 0.05) {
        if (World.isSolid(Math.floor(f.x + ux * k), Math.floor(f.y + uy * k))) {
          d = Math.max(0.9, k - 0.3);
          break;
        }
      }
      const fe = [f.x + ux * d, Math.min(WALL_H - 0.15, 0.55 + f.h * 0.55), f.y + uy * d];
      const fx = -ux;
      const fz = -uy;
      // na tela larga a janela ocupa a direita: mira à direita do objeto (ele vai para a esquerda)
      const wide = vw >= 1100 && vh >= 560;
      const shift = wide ? 0.5 * d * Math.tan(fovy / 2) * asp : 0;
      const fl = [f.x - fz * shift, Math.max(0.35, f.h * 0.6), f.y + fx * shift];
      const e = GL.fk * GL.fk * (3 - 2 * GL.fk);
      for (let i = 0; i < 3; i++) {
        eye[i] += (fe[i] - eye[i]) * e;
        look[i] += (fl[i] - look[i]) * e;
      }
    }
    const view = M.look(eye, look, [0, 1, 0]);
    const proj = M.persp(fovy, asp, 0.05, 80);
    const VP = M.mul(proj, view);
    GL.VP = VP;
    GL.cssW = vw;
    GL.cssH = vh;
    // luzes para o brilho no chão: as 8 mais perto, na área onde você está
    const ai = World.map.area[Math.floor(hub.py) * MW + Math.floor(hub.px)];
    const campoI = X.AREA_IDS.indexOf('campo');
    const near = World.lights.filter((l) => l.a === ai).map((l) => ({ l, d: Math.hypot(l.x - hub.px, l.y - hub.py) })).sort((a, b) => a.d - b.d).slice(0, 8);
    const lp = new Float32Array(32);
    const lc = new Float32Array(24);
    near.forEach(({ l }, i) => {
      lp[i * 4] = l.x;
      lp[i * 4 + 1] = ai === campoI ? 3.3 : l.top ? WALL_H - 0.06 : 1.0;
      lp[i * 4 + 2] = l.y;
      lp[i * 4 + 3] = l.r * 1.25;
      lc[i * 3] = l.c[0] * l.k;
      lc[i * 3 + 1] = l.c[1] * l.k;
      lc[i * 3 + 2] = l.c[2] * l.k;
    });
    const fog = World.fog.map((v) => v / 255);
    const F = {
      fog,
      fogK: ai === campoI ? 0.022 : 0.04,
      lp,
      lc,
      nl: near.length,
      right: new Float32Array([-cdy, 0, cdx]),
      skyTop: (th.skyTop || [3, 6, 18]).map((v) => v / 255),
      skyHor: (th.skyHor || [22, 40, 78]).map((v) => v / 255),
      stars: Math.min(0.012, (th.stars ?? 260) / 40000),
      expo: th.home || th.id === 'school' ? 0.95 : 1.05
    };
    // quem aparece em pé: enfeites, companheiros, você e a setinha
    const list = [];
    const L3 = [0, 0, 0];
    const lit = (x, y, lift) => {
      World.light(x, y, L3, false);
      return new Float32Array([L3[0] + lift, L3[1] + lift, L3[2] + lift]);
    };
    World.sprites.forEach((s) => {
      if (!s.tex) s.tex = X.propTex(s.key, s.factory, th);
      if (!s.tex) return;
      const k = s.k || 1;
      const z = (s.z || 0) + (s.bob !== undefined ? 0.05 * Math.sin(t * 0.06 + s.bob) : 0);
      list.push({ x: s.x, y: s.y, z, w: (s.tex.w / SPX) * k, h: (s.tex.h / SPX) * k, foot: 0, tex: glTexOf(s.tex, true), light: lit(s.x, s.y, 0.05), alpha: 1, glow: s.glow, shadow: s.shadow || 0 });
    });
    const npcs = hub.npcs();
    const camX = eye[0];
    const camY = eye[2];
    const rX = -cdy;
    const rY = cdx;
    const charGl = (slot, tex) => {
      let c = GL.charTex[slot];
      if (!c) c = GL.charTex[slot] = { obj: null, t: texture2D(tex.w, tex.h, null, {}) };
      if (c.obj !== tex) {
        upload(c.t, tex, false);
        c.obj = tex;
      }
      return c.t;
    };
    npcs.forEach((n, i) => {
      let rel = Math.atan2(camY - n.y, camX - n.x) - n.ang;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      const view = Math.abs(rel) < 0.75 ? 'front' : Math.abs(rel) > 2.4 ? 'back' : 'side';
      const left = Math.cos(n.ang) * rX + Math.sin(n.ang) * rY < 0;
      const frame = n.anim === 'run' ? Math.floor(t * 0.5) : Math.floor(t / 4) * 4;
      const tx = X.charTex(i + 1, n.cd, { view, left, animState: n.anim, frame });
      list.push({ x: n.x, y: n.y, z: n.z || 0, w: (tx.w / SPX) * 0.9, h: (tx.h / SPX) * 0.9, foot: 6 / 72, tex: charGl(i + 1, tx), light: lit(n.x, n.y, 0.14), alpha: 1, shadow: 0.24 });
    });
    const App = window.App;
    const p = App.state.profile;
    const me = { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8', number: p.number };
    const frameMe = hub.moving ? Math.floor(t * (hub.keys.run ? 0.9 : 0.6)) : Math.floor(t / 4) * 4;
    const txMe = X.charTex(0, me, { view: 'back', animState: hub.moving ? 'run' : 'idle', frame: frameMe, accessories: App.state.equippedAccessories || [] });
    const ghost = bk < 1.1 ? Math.max(0.3, Math.min(1, 0.3 + ((bk - 0.3) / 0.8) * 0.7)) : 1;
    list.push({ x: hub.px, y: hub.py, z: 0, w: (txMe.w / SPX) * 0.9, h: (txMe.h / SPX) * 0.9, foot: 6 / 72, tex: charGl(0, txMe), light: lit(hub.px, hub.py, 0.14), alpha: ghost, shadow: 0.26 });
    const spot = hub.canAct() ? hub.nearSpot() : null;
    if (spot) {
      const bob = Math.abs(Math.sin(t * 0.09)) * 0.06;
      list.push({ x: spot.x, y: spot.y, z: (spot.h || 1.1) + 0.12 + bob, w: 0.2, h: 0.16, foot: 0, tex: GL.arrowTex, light: new Float32Array([1, 1, 1]), alpha: 1, glow: true, shadow: 0 });
    }
    // poeira na luz
    const dust = [];
    if (ai !== campoI) {
      const m = World.map;
      const cx0 = Math.floor(hub.px);
      const cy0 = Math.floor(hub.py);
      for (let cy = cy0 - 6; cy <= cy0 + 6; cy++) for (let cx = cx0 - 6; cx <= cx0 + 6; cx++) {
        if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) continue;
        const idx = cy * MW + cx;
        if (m.solid[idx] || m.area[idx] < 0 || m.area[idx] === campoI) continue;
        const h = (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) >>> 0;
        const ph = ((h & 1023) / 1023) * 6.283;
        const x = cx + ((h >>> 10) & 255) / 255 + Math.sin(t * 0.004 + ph) * 0.25;
        const y = cy + ((h >>> 18) & 255) / 255 + Math.cos(t * 0.003 + ph) * 0.25;
        const z = 0.25 + (((h >>> 4) & 255) / 255) * 1.3 + Math.sin(t * 0.006 + ph * 2) * 0.1;
        World.light(x, y, L3, false);
        const b = Math.min(1, (L3[0] + L3[1] + L3[2]) / 3) * (0.4 + 0.6 * Math.sin(t * 0.05 + ph * 3)) * 0.35;
        if (b > 0.03) dust.push(x, z, y, b);
      }
    }
    F.dust = new Float32Array(dust);
    F.dustCol = new Float32Array(th.lamp.map((v) => v / 255));
    // 1) o reflexo: a cena espelhada no chão, em meia resolução (sai nos níveis mais leves)
    F.useRefl = !!Q.r;
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    if (F.useRefl) {
      const VPm = M.mul(VP, MIRROR);
      const eyeM = new Float32Array([eye[0], -eye[1], eye[2]]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, GL.reflFbo);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      gl.viewport(0, 0, GL.reflSize[0], GL.reflSize[1]);
      gl.clearColor(fog[0], fog[1], fog[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      drawSky(VPm, F);
      drawWorld(VPm, eyeM, true, F);
      drawSprites(VPm, eyeM, F, list.filter((s) => s.shadow || s.glow), true);
    }
    // 2) a cena (com MSAA): cor + o que brilha
    gl.bindFramebuffer(gl.FRAMEBUFFER, GL.msFbo);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, W, H);
    gl.clearBufferfv(gl.COLOR, 0, [fog[0], fog[1], fog[2], 1]);
    gl.clearBufferfv(gl.COLOR, 1, [0, 0, 0, 1]);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    drawSky(VP, F);
    drawWorld(VP, eye, false, F);
    drawSprites(VP, eye, F, list, false);
    drawDust(VP, F);
    // 3) brilho, tom e cor
    post(F);
    hub.cam3 = { x: eye[0], y: eye[2], a: hub.camA };
    hub.drawHud(null, 1);
    hub.hud3(hub.cam3, npcs);
  }
  // ponto do mundo → px da tela (CSS)
  function toScreen(x, y, h) {
    const m = GL.VP;
    if (!m) return null;
    const cx = m[0] * x + m[4] * h + m[8] * y + m[12];
    const cy = m[1] * x + m[5] * h + m[9] * y + m[13];
    const cw = m[3] * x + m[7] * h + m[11] * y + m[15];
    if (cw < 0.05) return null;
    return { x: ((cx / cw + 1) / 2) * GL.cssW, y: ((1 - cy / cw) / 2) * GL.cssH };
  }

  // ---------------------------------------------------------------- liga no Hub
  const swDraw = Hub.draw;
  const swToScreen = Hub.toScreen;
  let lastT = 0;
  let avg = 16;
  Hub.draw = function () {
    if (GL.lost && !Hub.forceSW) {
      if ((GL.losses || 0) >= 4) fail(new Error('a placa de vídeo caiu várias vezes'));
      else rebuild();
    }
    if (GL.ok === undefined && !Hub.forceSW) GL.ok = init();
    if (!GL.ok || Hub.forceSW) {
      if (World.gl) {
        // (modo simples: o chão precisa ser assado já aceso)
        World.gl = false;
        World.key = '';
      }
      return swDraw.call(this);
    }
    if (!World.gl) {
      World.gl = true;
      World.key = '';
    }
    try {
      frame(this);
    } catch (err) {
      if (GL.lost) return;
      if (!downgrade(err)) fail(err);
      return;
    }
    // qualidade automática: o intervalo entre quadros (devagar → menos pixels)
    const now = performance.now();
    const dt = lastT ? Math.min(100, now - lastT) : 16;
    lastT = now;
    avg = avg * 0.95 + dt * 0.05;
    // (cai um nível se ficar abaixo de ~42 quadros por segundo; sobe se sobrar folga)
    if (!Hub.glFix && GL.level !== undefined && this.t - (GL.qT || 0) > 120) {
      let i = GL.level;
      if (avg > 24 && i < LEVELS.length - 1) i++;
      else if (avg < 17.2 && i > 0 && this.t - (GL.upT || 0) > 600) {
        i--;
        GL.upT = this.t;
      }
      if (i !== GL.level) {
        GL.level = i;
        GL.qT = this.t;
        avg = 16;
      }
    }
  };
  Hub.toScreen = function (cam, x, y, h) {
    if (GL.ok && !Hub.forceSW) return toScreen(x, y, h);
    return swToScreen.call(this, cam, x, y, h);
  };
  // ☰ MENU → GRÁFICO: mostra qual desenho está valendo (e por que o 3D não abriu, se for
  // o caso) e troca entre o 3D e o simples. A escolha fica guardada no navegador.
  try {
    Hub.forceSW = localStorage.getItem('bluelock_hub_gfx') === 'simples';
  } catch (e) {}
  const LV = ['MÁXIMO', 'ALTO', 'MÉDIO', 'LEVE', 'MAIS LEVE', 'MÍNIMO'];
  function gfxLabel() {
    if (Hub.forceSW) return '🖥️ GRÁFICO: SIMPLES (tocar = voltar ao 3D)';
    if (GL.ok) return `🖥️ GRÁFICO: 3D • ${LV[GL.level || 0]}${GL.cfg ? ' • MODO SEGURO' : ''}`;
    if (GL.ok === false) return `🖥️ GRÁFICO: SIMPLES • 3D NÃO ABRIU: ${GL.err || '?'} (tocar = tentar de novo)`;
    return '🖥️ GRÁFICO: 3D';
  }
  function gfxButton() {
    const row = Hub.hud && Hub.hud.querySelector('.hub-menu-row');
    if (!row) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hub-gfx-btn';
    b.style.gridColumn = '1 / -1';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (Hub.forceSW) {
        Hub.forceSW = false;
        if (GL.ok === false) {
          GL.ok = undefined;
          GL.cfg = 0;
          GL.losses = 0;
        }
      } else if (GL.ok === false) {
        GL.ok = undefined;
        GL.cfg = 0;
        GL.losses = 0;
      } else Hub.forceSW = true;
      try {
        localStorage.setItem('bluelock_hub_gfx', Hub.forceSW ? 'simples' : '3d');
      } catch (err) {}
      if (cvs) cvs.style.display = Hub.forceSW ? 'none' : '';
      window.SFX?.click?.();
      setTimeout(() => (b.textContent = gfxLabel()), 400);
      b.textContent = gfxLabel();
    });
    row.insertBefore(b, row.firstChild);
    GL.btn = b;
  }
  const drawGL = Hub.draw;
  Hub.draw = function () {
    if (!GL.btn) gfxButton();
    if (cvs) cvs.style.display = Hub.forceSW ? 'none' : '';
    drawGL.call(this);
    if (GL.btn && this.menuOpen && this.t % 15 === 0) {
      const l = gfxLabel();
      if (GL.btn.textContent !== l) GL.btn.textContent = l;
    }
  };
  GL.fail = fail;
  GL.downgrade = downgrade;
  GL.rebuild = rebuild;
  Hub.GL3D = GL;
})();
