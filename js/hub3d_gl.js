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
uniform float uDay; uniform vec3 uSun; uniform vec3 uSunC; uniform vec3 uAmbD; uniform sampler2D uSH; uniform vec3 uCity;
${OUT}
// cidade de dia (js/hub3d_cidade.js: sunMap): o ponto está na sombra dos prédios?
// (uSH guarda, a cada 1/4 de ladrilho da cidade, até que altura ali fica na sombra, / 16;
// uCity = linha onde a cidade começa, largura e altura dela em ladrilhos)
float cityShade(vec3 p) {
  vec2 q = vec2(p.x / uCity.y, (p.z - uCity.x) / uCity.z);
  if (q.x < 0.0 || q.y < 0.0 || q.x >= 1.0 || q.y >= 1.0) return 1.0;
  return p.y < texture(uSH, q).r * 16.0 ? 0.0 : 1.0;
}
void main() {
  vec4 t = texture(uTex, vUv);
  if (t.a < 0.3) discard;
  bool em = t.a < 0.85;
  vec3 N = normalize(vNrm);
  vec4 lm = texture(uLM, (vPos.xz + N.xz * 0.14) / uMap);
  vec3 light = lm.rgb * 2.0;
  // de dia (ou no fim de tarde) a cidade troca a luz assada da noite pela do céu e do sol
  if (uDay > 0.0 && vPos.z > uCity.x) {
    float s = max(dot(N, uSun), 0.0) * cityShade(vPos + N * (N.y > 0.5 ? 0.02 : 0.15));
    vec3 dl = uAmbD * (0.78 + 0.22 * max(N.y, 0.0)) + uSunC * s;
    light = mix(light, dl, uDay);
  }
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
  // peças das cenas de cinema (caixas, placas e imagens montadas por cena, js/cine3d_kit.js)
  const FS_DYN = `#version 300 es
precision highp float;
in vec3 vPos; in vec2 vUv; in vec3 vNrm;
uniform sampler2D uTex; uniform vec4 uCol; uniform vec3 uLight; uniform float uEm; uniform vec3 uCam; uniform vec3 uFog; uniform float uFogK;
${OUT}
void main() {
  vec4 t = texture(uTex, vUv) * uCol;
  if (t.a < 0.04) discard;
  vec3 N = normalize(vNrm);
  float sh = 0.72 + 0.28 * max(N.y, 0.0) + 0.1 * abs(N.x);
  vec3 col = uEm > 0.5 ? t.rgb * 1.35 : t.rgb * uLight * sh;
  float f = exp(-length(uCam - vPos) * uFogK);
  col = mix(uFog, col, f);
  oCol = vec4(col, t.a);
  oGlow = vec4(uEm > 0.5 ? t.rgb * f * 0.8 : vec3(0.0), t.a);
}`;
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
    // (atlas da cidade: só os primeiros níveis do mipmap, para as texturas vizinhas não se misturarem)
    if (mip && o.maxLevel !== undefined) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, o.maxLevel);
    // (o máximo da placa é lido uma vez só: cada getParameter faz o navegador esperar a placa
    // terminar tudo o que tem na fila, e eram ~500 texturas ao montar um prédio novo)
    if (mip && GL.aniso) {
      if (GL.anisoGl !== gl) {
        GL.anisoGl = gl;
        GL.anisoMax = Math.min(8, gl.getParameter(GL.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1);
      }
      gl.texParameterf(gl.TEXTURE_2D, GL.aniso.TEXTURE_MAX_ANISOTROPY_EXT, GL.anisoMax);
    }
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
      g = texture2D(t.w, t.h, encode(t), { mip: !sprite, maxLevel: t.maxLevel });
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
      GL.pDyn = compile(VS_WORLD, FS_DYN);
      GL.white = texture2D(1, 1, new Uint8Array([255, 255, 255, 255]), {});
      GL.vaoDyn = gl.createVertexArray();
      gl.bindVertexArray(GL.vaoDyn);
      GL.dynBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, GL.dynBuf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 32, 12);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 32, 20);
      gl.bindVertexArray(null);
      GL.canvasTex = new WeakMap();
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
    GL.scn = null;
    GL.wsrc = null;
    GL.pre = null;
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
  // cenas já montadas na placa de vídeo (o prédio de cada tema; ver World.prepare): a volta
  // de uma cena de cinema com outro cenário não monta nem envia as texturas de novo
  const SCN = ['groups', 'worldTex', 'tex', 'screenTex', 'screenObj', 'wheelTex', 'wheelObj', 'tubeTex', 'tubeObj', 'floorTex', 'ceilTex', 'lmTex', 'matTex'];
  const freeScene = (s) => {
    s.groups.forEach((g) => {
      gl.deleteBuffer(g.buf);
      gl.deleteVertexArray(g.vao);
    });
    s.worldTex.forEach((t) => gl.deleteTexture(t));
  };
  function buildScene() {
    if (!GL.scn || GL.scnGl !== gl) {
      GL.scn = new Map();
      GL.scnGl = gl;
    }
    // (o que está na placa agora é de que prédio? GL.wsrc = os dados de onde saiu)
    if (GL.key && GL.groups.length && GL.wsrc) {
      const s = { src: GL.wsrc };
      SCN.forEach((f) => (s[f] = GL[f]));
      GL.scn.delete(GL.key);
      GL.scn.set(GL.key, s);
      while (GL.scn.size > 2) {
        const k = GL.scn.keys().next().value;
        freeScene(GL.scn.get(k));
        GL.scn.delete(k);
      }
    } else if (GL.groups.length) freeScene(GL);
    const old = GL.scn.get(World.key);
    GL.scn.delete(World.key);
    if (old && old.src === World.FA) {
      SCN.forEach((f) => (GL[f] = old[f]));
      GL.key = World.key;
      GL.wsrc = World.FA;
      return;
    }
    if (old) freeScene(old);
    // texturas deste prédio já enviadas antes (GL.prewarmGen): começa com elas
    const pre = GL.pre && GL.pre.get(World.FA);
    if (pre) GL.pre.delete(World.FA);
    GL.worldTex = pre && pre.gl === gl ? pre.worldTex : [];
    GL.tex = pre && pre.gl === gl ? pre.tex : new WeakMap();
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
    // (caixas da cidade: as faces que estão no atlas da cidade — js/hub3d_cidade.js — vão
    // para um grupo por pedaço do mapa, 16 x 12 ladrilhos, que some quando sai da vista)
    const UV1 = [0, 0, 1, 1];
    const atlasKey = (b) => {
      const A = b.atl.page;
      const cx = (b.x0 + b.x1) / 2;
      const cy = (b.y0 + b.y1) / 2;
      const c = cy < 35 ? 100 + Math.floor(cx / 16) : Math.floor(cx / 16) + Math.floor((cy - 35) / 12) * 4;
      const ks = A.keys || (A.keys = {});
      return ks[c] || (ks[c] = { atlas: A, chunk: c });
    };
    World.boxes.forEach((b) => {
      const { x0, y0, x1, y1, z0, z1 } = b;
      const at = b.atl;
      const ak = at ? atlasKey(b) : null;
      const key = (dir, t) => (at && at.uv[dir] ? ak : b === World.wheel && (dir === 'N' || dir === 'S') ? 'wheel' : b === World.tube && dir.length === 1 && 'NSEW'.includes(dir) ? 'tube' : t);
      const uv = (dir) => (at && at.uv[dir]) || UV1;
      const f = b.f;
      let u;
      if (f.N) (u = uv('N')), quad(grp(key('N', f.N)), [x1, z1, y0], [x0, z1, y0], [x0, z0, y0], [x1, z0, y0], [0, 0, -1], u[0], u[2], u[1], u[3]);
      if (f.S) (u = uv('S')), quad(grp(key('S', f.S)), [x0, z1, y1], [x1, z1, y1], [x1, z0, y1], [x0, z0, y1], [0, 0, 1], u[0], u[2], u[1], u[3]);
      if (f.W) (u = uv('W')), quad(grp(key('W', f.W)), [x0, z1, y0], [x0, z1, y1], [x0, z0, y1], [x0, z0, y0], [-1, 0, 0], u[0], u[2], u[1], u[3]);
      if (f.E) (u = uv('E')), quad(grp(key('E', f.E)), [x1, z1, y1], [x1, z1, y0], [x1, z0, y0], [x1, z0, y1], [1, 0, 0], u[0], u[2], u[1], u[3]);
      if (f.T) (u = uv('T')), quad(grp(key('T', f.T)), [x0, z1, y0], [x1, z1, y0], [x1, z1, y1], [x0, z1, y1], [0, 1, 0], u[0], u[2], u[1], u[3]);
      if (f.B && z0 > 0.01) (u = uv('B')), quad(grp(key('B', f.B)), [x0, z0, y1], [x1, z0, y1], [x1, z0, y0], [x0, z0, y0], [0, -1, 0], u[0], u[2], u[1], u[3]);
    });
    // chão (um quadrão com a textura do andar inteiro) e teto (fora do que é a céu aberto:
    // campo e cidade). RW = linhas montadas (a cidade só existe no tema pro: js/hub3d.js)
    const RW = m.rows;
    quad(grp('floor', 1), [0, 0, 0], [MW, 0, 0], [MW, 0, RW], [0, 0, RW], [0, 1, 0]);
    const CAMPO = X.AREA_IDS.indexOf('campo');
    const OPEN = X.OPEN;
    const cg = grp('ceil', 2);
    for (let y = 0; y < RW; y++) for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      if (m.solid[i] || m.area[i] < 0 || OPEN[m.area[i]]) continue;
      quad(cg, [x, H, y + 1], [x + 1, H, y + 1], [x + 1, H, y], [x, H, y], [0, -1, 0], x / MW, (x + 1) / MW, (y + 1) / RW, y / RW);
    }
    // Blue Lock e NEL: o campo fica DENTRO do prédio (antes era a céu aberto, com estrelas):
    // paredes subindo até um teto alto com luminárias. Alto porque as câmeras das cenas
    // chegam a ~6 de altura em cima do campo.
    const th0 = World.th || {};
    if (th0.id === 'bluelock' || th0.id === 'nel') {
      const FH = H * 4;
      const ug = grp(World.wallTex('upper', 'arena'));
      const rg = grp(World.wallTex('roof', 'arena'));
      const isField = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && !m.solid[y * MW + x] && m.area[y * MW + x] === CAMPO;
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        if (!isField(x, y)) continue;
        quad(rg, [x, FH, y + 1], [x + 1, FH, y + 1], [x + 1, FH, y], [x, FH, y], [0, -1, 0]);
        // a parede alta em cada borda do campo (acima das paredes e das portas)
        for (let k = 1; k < 4; k++) {
          const b = H * k;
          const t = b + H;
          if (!isField(x, y - 1)) quad(ug, [x, t, y], [x + 1, t, y], [x + 1, b, y], [x, b, y], [0, 0, 1]);
          if (!isField(x, y + 1)) quad(ug, [x + 1, t, y + 1], [x, t, y + 1], [x, b, y + 1], [x + 1, b, y + 1], [0, 0, -1]);
          if (!isField(x - 1, y)) quad(ug, [x, t, y + 1], [x, t, y], [x, b, y], [x, b, y + 1], [1, 0, 0]);
          if (!isField(x + 1, y)) quad(ug, [x + 1, t, y], [x + 1, t, y + 1], [x + 1, b, y + 1], [x + 1, b, y], [-1, 0, 0]);
        }
      }
    }
    // Seleção, Copa e liga profissional: o estádio gigante (anéis, teto, refletores, telões e
    // a torcida viva) é desenhado à parte pelo js/hub3d_estadio.js. Esta arquibancada simples
    // de 4 degraus só fica se aquele arquivo não carregar ou der erro na placa de vídeo.
    const est = window.HubEstadio;
    if ((th0.id === 'japan' || th0.id === 'worldcup' || th0.id === 'pro') && !(est && est.replaces())) {
      let x0 = MW;
      let y0 = MH;
      let x1 = 0;
      let y1 = 0;
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        const i = y * MW + x;
        if (m.solid[i] || m.area[i] !== CAMPO) continue;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x + 1);
        y1 = Math.max(y1, y + 1);
      }
      if (x1 > x0 && y1 > y0) {
        const cgr = grp(World.wallTex('crowd', 'arena'));
        const tgr = grp(World.wallTex('tread', 'arena'));
        const STEP = 1.25; // quanto cada degrau recua
        const rows = 4;
        // fileira em pedaços de 1 ladrilho (a textura não repete)
        const riser = (ax, ay, bx, by, zb, zt, n) => {
          const len = Math.hypot(bx - ax, by - ay);
          const segs = Math.max(1, Math.round(len));
          for (let s = 0; s < segs; s++) {
            const pa = [ax + ((bx - ax) * s) / segs, ay + ((by - ay) * s) / segs];
            const pb = [ax + ((bx - ax) * (s + 1)) / segs, ay + ((by - ay) * (s + 1)) / segs];
            quad(cgr, [pa[0], zt, pa[1]], [pb[0], zt, pb[1]], [pb[0], zb, pb[1]], [pa[0], zb, pa[1]], n);
          }
        };
        for (let k = 0; k <= rows; k++) {
          const dIn = k ? 0.1 + STEP * (k - 1) : 0; // borda de dentro do piso deste degrau
          const d = 0.1 + STEP * k; // onde fica a fileira deste degrau
          const zb = H * (1 + k * 0.85);
          const zt = zb + H * 0.85;
          // piso do degrau (liga o topo do degrau de baixo à fileira deste)
          const a0 = [x0 - dIn, y0 - dIn];
          const a1 = [x1 + dIn, y1 + dIn];
          const b0 = [x0 - d, y0 - d];
          const b1 = [x1 + d, y1 + d];
          quad(tgr, [b0[0], zb, b0[1]], [b1[0], zb, b0[1]], [a1[0], zb, a0[1]], [a0[0], zb, a0[1]], [0, 1, 0]);
          quad(tgr, [a0[0], zb, a1[1]], [a1[0], zb, a1[1]], [b1[0], zb, b1[1]], [b0[0], zb, b1[1]], [0, 1, 0]);
          quad(tgr, [b0[0], zb, b0[1]], [a0[0], zb, a0[1]], [a0[0], zb, a1[1]], [b0[0], zb, b1[1]], [0, 1, 0]);
          quad(tgr, [a1[0], zb, a0[1]], [b1[0], zb, b0[1]], [b1[0], zb, b1[1]], [a1[0], zb, a1[1]], [0, 1, 0]);
          if (k === rows) break;
          // a fileira com a torcida, virada para o campo (os 4 lados se encontram nos cantos)
          riser(b0[0], b0[1], b1[0], b0[1], zb, zt, [0, 0, 1]);
          riser(b1[0], b1[1], b0[0], b1[1], zb, zt, [0, 0, -1]);
          riser(b0[0], b1[1], b0[0], b0[1], zb, zt, [1, 0, 0]);
          riser(b1[0], b0[1], b1[0], b1[1], zb, zt, [-1, 0, 0]);
        }
      }
    }
    // texturas fixas e as que mudam (telão, roleta, tubo)
    const asTex = (k) => {
      if (k === 'floor') return GL.floorTex;
      if (k === 'ceil') return GL.ceilTex;
      if (k === 'screen') return GL.screenTex;
      if (k === 'wheel') return GL.wheelTex;
      if (k === 'tube') return GL.tubeTex;
      if (k && k.atlas) return glTexOf(k.atlas); // (pedaço da cidade: a folha do atlas)
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
    GL.floorTex = texture2D(FW, RW * FTX, new Uint8Array(World.FA.buffer), { mip: true });
    GL.ceilTex = texture2D(MW * CTX, RW * CTX, new Uint8Array(World.CA.buffer), { mip: true });
    GL.worldTex.push(GL.floorTex, GL.ceilTex);
    // mapa de luz (suave) + escurecido dos cantos no alfa
    const LW = MW * X.C.LM;
    const LH = RW * X.C.LM;
    const lm = new Uint8Array(LW * LH * 4);
    for (let i = 0; i < LW * LH; i++) {
      lm[i * 4] = Math.min(255, World.L[i * 3] * 127.5);
      lm[i * 4 + 1] = Math.min(255, World.L[i * 3 + 1] * 127.5);
      lm[i * 4 + 2] = Math.min(255, World.L[i * 3 + 2] * 127.5);
      lm[i * 4 + 3] = Math.min(255, World.AO[i] * 255);
    }
    GL.lmTex = texture2D(LW, LH, lm, { linear: true });
    // quanto o chão de cada ladrilho reflete
    const mat = new Uint8Array(MW * RW * 4);
    for (let i = 0; i < MW * RW; i++) {
      const a = m.area[i];
      mat[i * 4] = a >= 0 ? Math.round(X.REFL[a] * 255) : 0;
      mat[i * 4 + 3] = 255;
    }
    GL.matTex = texture2D(MW, RW, mat, {});
    GL.worldTex.push(GL.lmTex, GL.matTex);
    GL.groups = [];
    groups.forEach((g) => {
      const data = new Float32Array(g.v);
      // zona do grupo (para não desenhar o que não dá para ver): 2 = só a cidade (y >= 35),
      // 1 = só o fundo do prédio (y <= 17,5: atrás da ala dos quartos), 0 = misturado
      let y0 = 1e9;
      let y1 = -1e9;
      for (let i = 2; i < data.length; i += 8) {
        if (data[i] < y0) y0 = data[i];
        if (data[i] > y1) y1 = data[i];
      }
      const zone = m.city ? (y0 >= 35 ? 2 : y1 <= 17.5 ? 1 : 0) : 0;
      // (com a cidade: a caixa que envolve o grupo, para não desenhar o que está fora da vista)
      let bb = null;
      if (m.city) {
        bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
        for (let i = 0; i < data.length; i += 8) for (let k = 0; k < 3; k++) {
          if (data[i + k] < bb[k]) bb[k] = data[i + k];
          if (data[i + k] > bb[k + 3]) bb[k + 3] = data[i + k];
        }
      }
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
      GL.groups.push({ vao, buf, n: data.length / 8, mode: g.mode, tex: asTex(g.key), zone, bb, src: g.key && g.key.atlas ? g.key.atlas : typeof g.key === 'object' ? g.key : null });
    });
    gl.bindVertexArray(null);
    GL.key = World.key;
    GL.wsrc = World.FA;
  }

  // ---------------------------------------------------------------- desenhar
  // os 6 planos da vista da câmera (da matriz VP) e se uma caixa [x0, h0, y0, x1, h1, y1]
  // fica pelo menos em parte dentro deles (só com a cidade: ver drawWorld)
  function frustumOf(m) {
    const P = [];
    for (let k = 0; k < 3; k++) for (const s of [1, -1]) P.push([m[3] + s * m[k], m[7] + s * m[4 + k], m[11] + s * m[8 + k], m[15] + s * m[12 + k]]);
    return P;
  }
  function boxInFrustum(P, b) {
    for (let i = 0; i < 6; i++) {
      const p = P[i];
      if (p[0] * (p[0] > 0 ? b[3] : b[0]) + p[1] * (p[1] > 0 ? b[4] : b[1]) + p[2] * (p[2] > 0 ? b[5] : b[2]) + p[3] < 0) return false;
    }
    return true;
  }
  function drawWorld(VP, eye, mirror, F) {
    const P = GL.pWorld;
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u('uVP'), false, VP);
    gl.uniform2f(P.u('uMap'), MW, World.map.rows); // (luz e reflexo cobrem só as linhas montadas)
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
    // sol da cidade (manhã / fim de tarde; de noite uDay = 0 e nada disso conta)
    const day = F.day || 0;
    gl.uniform1f(P.u('uDay'), day);
    gl.uniform1i(P.u('uSH'), 4);
    let sm = null;
    if (day > 0) {
      // a sombra dos prédios para esta hora do dia (feita uma vez: js/hub3d_cidade.js sunMap)
      const C = window.HubCidade;
      sm = C && C.sunMap ? C.sunMap(F.key) : null;
      if (sm && (GL.shSrc !== sm || GL.shGl !== gl)) {
        if (GL.shTex && GL.shGl === gl) gl.deleteTexture(GL.shTex);
        GL.shTex = texture2D(sm.w, sm.h, sm.data, {});
        GL.shSrc = sm;
        GL.shGl = gl;
      }
      gl.uniform3fv(P.u('uSun'), F.sun);
      gl.uniform3fv(P.u('uSunC'), F.sunC);
      gl.uniform3fv(P.u('uAmbD'), F.ambD);
      // (sem o mapa: tudo no sol)
      if (sm) gl.uniform3f(P.u('uCity'), sm.cells[2], sm.cells[0], sm.cells[1]);
      else gl.uniform3f(P.u('uCity'), 35.0, 1e-4, 1e-4);
    }
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, sm ? GL.shTex : GL.white);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, GL.lmTex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, GL.matTex);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, mirror ? null : GL.reflTex);
    gl.activeTexture(gl.TEXTURE0);
    // (com a cidade: o grupo que está todo fora da vista da câmera nem é desenhado)
    const fr = World.map.city ? frustumOf(VP) : null;
    for (let i = 0; i < GL.groups.length; i++) {
      const g = GL.groups[i];
      if (mirror && g.mode === 1) continue;
      if (g.zone && F.skip[g.zone]) continue;
      if (fr && g.bb && !boxInFrustum(fr, g.bb)) continue;
      gl.uniform1f(P.u('uMode'), g.mode);
      // de manhã a cidade usa as texturas apagadas (feitas e enviadas na 1ª vez que precisa;
      // os pedaços do atlas da cidade dividem a mesma)
      let tx = g.tex;
      if (F.dayTex && g.zone === 2) {
        if (g.dayTex === undefined) {
          const d = g.src && window.HubCidade ? window.HubCidade.dayOf(g.src) : null;
          const dt = d && d !== g.src ? texture2D(d.w, d.h, encode(d), { mip: true, maxLevel: d.maxLevel }) : g.tex;
          if (dt !== g.tex) GL.worldTex.push(dt);
          GL.groups.forEach((o) => {
            if (o.src === g.src && o.tex === g.tex && o.dayTex === undefined) o.dayTex = dt;
          });
          g.dayTex = dt;
        }
        tx = g.dayTex;
      }
      gl.bindTexture(gl.TEXTURE_2D, tx);
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
  // textura de um canvas (das cenas): enviada de novo só quando a cena marca dirty
  function canvasTex(cv, dirty) {
    let c = GL.canvasTex.get(cv);
    if (!c) {
      c = { t: gl.createTexture(), w: 0, h: 0 };
      GL.canvasTex.set(cv, c);
      dirty = true;
    }
    if (dirty || c.w !== cv.width || c.h !== cv.height) {
      gl.bindTexture(gl.TEXTURE_2D, c.t);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      c.w = cv.width;
      c.h = cv.height;
    }
    return c.t;
  }
  GL.texFor = (src, dirty) => (src instanceof HTMLCanvasElement ? canvasTex(src, dirty) : glTexOf(src, true));
  function drawDyn(VP, eye, F, list) {
    if (!list || !list.length) return;
    const P = GL.pDyn;
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u('uVP'), false, VP);
    gl.uniform3fv(P.u('uCam'), eye);
    gl.uniform3fv(P.u('uFog'), F.fog);
    gl.uniform1f(P.u('uFogK'), F.fogK);
    gl.uniform1i(P.u('uTex'), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(GL.vaoDyn);
    gl.bindBuffer(gl.ARRAY_BUFFER, GL.dynBuf);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    list.forEach((o) => {
      gl.bufferData(gl.ARRAY_BUFFER, o.verts, gl.DYNAMIC_DRAW);
      gl.bindTexture(gl.TEXTURE_2D, o.src ? GL.texFor(o.src, o.dirty) : GL.white);
      gl.uniform4fv(P.u('uCol'), o.col);
      gl.uniform3fv(P.u('uLight'), o.light);
      gl.uniform1f(P.u('uEm'), o.em ? 1 : 0);
      gl.depthMask(o.col[3] >= 0.99);
      gl.drawArrays(gl.TRIANGLES, 0, o.verts.length / 8);
    });
    gl.depthMask(true);
    gl.disable(gl.BLEND);
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
      const wide = vw >= 1476 && vh >= 560;
      const shift = wide ? 0.5 * d * Math.tan(fovy / 2) * asp : 0;
      const fl = [f.x - fz * shift, Math.max(0.35, f.h * 0.6), f.y + fx * shift];
      const e = GL.fk * GL.fk * (3 - 2 * GL.fk);
      for (let i = 0; i < 3; i++) {
        eye[i] += (fe[i] - eye[i]) * e;
        look[i] += (fl[i] - look[i]) * e;
      }
    }
    // cena de cinema (js/cine3d.js): a câmera segue o roteiro da cena
    const cc = hub.cineCam ? hub.cineCam() : null;
    if (cc) {
      for (let i = 0; i < 3; i++) {
        eye[i] = cc.eye[i];
        look[i] = cc.look[i];
      }
    }
    const view = M.look(eye, look, [0, 1, 0]);
    const proj = M.persp(cc && cc.fov ? (cc.fov * Math.PI) / 180 : fovy, asp, 0.05, 80);
    if (cc && cc.shiftY) proj[9] += cc.shiftY * proj[11]; // (imagem deslocada para cima: a caixa de texto cobre a parte de baixo)
    const VP = M.mul(proj, view);
    GL.VP = VP;
    GL.cssW = vw;
    GL.cssH = vh;
    // luzes para o brilho no chão: as 8 mais perto, na área onde você está
    const ai = World.map.area[Math.floor(hub.py) * MW + Math.floor(hub.px)];
    const campoI = X.AREA_IDS.indexOf('campo');
    const open = X.OPEN[ai] === 1; // (campo e cidade: a céu aberto)
    // (na cidade, a céu aberto, as luzes de todas as ruas valem: js/hub3d.js buildLightGen)
    const HC = World.map.city ? window.HubCidade : null;
    const outA = HC && HC.outdoor ? (a) => a >= 0 && HC.outdoor(X.AREA_IDS[a]) : null;
    const cityOut = !!(outA && outA(ai));
    const near = World.lights.filter((l) => l.a === ai || l.a2 === ai || (cityOut && outA(l.a))).map((l) => ({ l, d: Math.hypot(l.x - hub.px, l.y - hub.py) })).sort((a, b) => a.d - b.d).slice(0, 8);
    const lp = new Float32Array(32);
    const lc = new Float32Array(24);
    near.forEach(({ l }, i) => {
      lp[i * 4] = l.x;
      lp[i * 4 + 1] = l.z !== undefined ? l.z : ai === campoI ? 3.3 : l.top ? WALL_H - 0.06 : 1.0;
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
    // na cidade: céu de fim de tarde, névoa da cor do horizonte (js/hub3d_cidade.js)
    // (nas cenas de cinema e conversas o céu é o da cena; a selfie — Hub.cine — é na rua)
    const cityAir = World.map.city && (!cc || hub.cine) && window.HubCidade && window.HubCidade.air(ai, th);
    if (cityAir) Object.assign(F, cityAir);
    // (de manhã os postes estão apagados: sem o brilho das lâmpadas no chão)
    if (F.day >= 0.9) F.nl = 0;
    // o que não dá para ver daqui nem é desenhado: dentro do prédio, a cidade (só se vê da
    // ala dos quartos, do apartamento e da portaria, pelas portas em linha); na rua, o fundo
    // do prédio. (nas cenas de cinema a câmera vai a qualquer lugar: desenha tudo)
    F.skip = [false, false, false];
    if (!cc && World.map.city) {
      const ids = X.AREA_IDS;
      const pa = hub.area;
      const ca = ids[World.map.area[Math.floor(eye[2]) * MW + Math.floor(eye[0])]];
      const street = (a) => !!(HC && HC.outdoor ? HC.outdoor(a) : a === 'rua' || a === 'praca');
      const seesCity = (a) => a === 'dorm' || a === 'quarto' || a === 'portaria' || street(a);
      if (pa && ca && !seesCity(pa) && !seesCity(ca)) F.skip[2] = true;
      else if ((pa === 'quarto' || pa === 'dorm') && (ca === 'quarto' || ca === 'dorm')) {
        // de casa a rua só aparece pela porta de baixo do apartamento (13,30): com a porta fora
        // da vista da câmera, a cidade nem é desenhada
        const dx = 13.5 - eye[0];
        const dz = 30.5 - eye[2];
        const fx = look[0] - eye[0];
        const fz = look[2] - eye[2];
        const a = Math.abs(Math.atan2(fx * dz - fz * dx, fx * dx + fz * dz));
        if (a > Math.atan(Math.tan(fovy / 2) * asp) + 0.35) F.skip[2] = true;
      }
      if (street(pa) && street(ca)) F.skip[1] = true;
    }
    if (cc && cc.sk) {
      if (cc.fog) F.fog = cc.fog;
      if (cc.fogK !== undefined) F.fogK = cc.fogK;
      if (cc.skyTop) F.skyTop = cc.skyTop;
      if (cc.skyHor) F.skyHor = cc.skyHor;
      if (cc.stars !== undefined) F.stars = cc.stars;
      if (cc.expo) F.expo = cc.expo;
      if (cc.noLights) F.nl = 0;
    }
    // quem aparece em pé: enfeites, companheiros, você e a setinha
    const list = [];
    const L3 = [0, 0, 0];
    // (de dia, quem está na rua pega a luz do céu/sol no lugar da luz assada da noite)
    const dayC = F.day > 0 && window.HubCidade ? window.HubCidade : null;
    const L4 = [0, 0, 0];
    const lit = (x, y, lift) => {
      World.light(x, y, L3, false);
      if (dayC && y > 35) {
        dayC.dayLight(x, y, F, L4);
        for (let i = 0; i < 3; i++) L3[i] = L3[i] * (1 - F.day) + L4[i] * F.day;
      }
      return new Float32Array([L3[0] + lift, L3[1] + lift, L3[2] + lift]);
    };
    World.sprites.forEach((s) => {
      // (enfeite da cidade atrás da câmera ou muito longe: nem entra; nas cenas entra tudo)
      if (s.city && !cc) {
        const dx = s.x - eye[0];
        const dy = s.y - eye[2];
        if (dx * cdx + dy * cdy < -1.5 || dx * dx + dy * dy > 1600) return;
      }
      if (!s.tex) s.tex = X.propTex(s.key, s.factory, th);
      if (!s.tex) return;
      const k = s.k || 1;
      const z = (s.z || 0) + (s.bob !== undefined ? 0.05 * Math.sin(t * 0.06 + s.bob) : 0);
      // (enfeite grande — as árvores da cidade — colado na câmera: fica transparente)
      let al = 1;
      if (k >= 2) {
        const de = Math.hypot(s.x - eye[0], s.y - eye[2]);
        if (de < 1.8) al = Math.max(0.12, (de - 0.5) / 1.3);
      }
      list.push({ x: s.x, y: s.y, z, w: (s.tex.w / SPX) * k, h: (s.tex.h / SPX) * k, foot: 0, tex: glTexOf(s.tex, true), light: lit(s.x, s.y, 0.05), alpha: al, glow: s.glow, shadow: s.shadow || 0 });
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
      // (a bola da quadra da cidade vem pronta: n.tex)
      if (n.tex) {
        const kb = n.k || 1;
        list.push({ x: n.x, y: n.y, z: n.z || 0, w: (n.tex.w / SPX) * kb, h: (n.tex.h / SPX) * kb, foot: 0, tex: glTexOf(n.tex, true), light: lit(n.x, n.y, 0.1), alpha: 1, glow: false, shadow: n.shadow ?? 0.1 });
        return;
      }
      let rel = Math.atan2(camY - n.y, camX - n.x) - n.ang;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      const view = n.view || (Math.abs(rel) < 0.75 ? 'front' : Math.abs(rel) > 2.4 ? 'back' : 'side');
      const left = n.left !== undefined ? !!n.left : Math.cos(n.ang) * rX + Math.sin(n.ang) * rY < 0;
      const frame = n.frame !== undefined ? n.frame : n.still ? 0 : n.anim === 'run' ? Math.floor(t * 0.5) : Math.floor(t / 4) * 4;
      const slot = n.slot || i + 1;
      const tx = X.charTex(slot, n.cd, Object.assign({ view, left, animState: n.anim, frame }, n.opts || {}));
      const kk = n.k || 0.9;
      const out = World.isSolid(Math.floor(n.x), Math.floor(n.y));
      const nl = n.light ? new Float32Array(n.light) : n.dark ? new Float32Array([0.06, 0.06, 0.08]) : out && cc && cc.ambient ? new Float32Array(cc.ambient) : lit(n.x, n.y, 0.14);
      // pedestre passando colado na câmera: fica transparente (não vira um borrão na tela)
      let al = n.alpha ?? 1;
      if (n.ped) {
        const de = Math.hypot(n.x - camX, n.y - camY);
        if (de < 1.3) al = Math.max(0.12, (de - 0.35) / 0.95);
      }
      list.push({ x: n.x, y: n.y, z: n.z || 0, w: (tx.w / SPX) * kk, h: (tx.h / SPX) * kk, foot: 6 / 72, tex: charGl(slot, tx), light: nl, alpha: al, glow: !!n.glow, shadow: n.shadow ?? 0.24 });
    });
    const App = window.App;
    const p = App.state.profile;
    const me = { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8', number: p.number };
    const frameMe = hub.moving ? Math.floor(t * (hub.keys.run ? 0.9 : 0.6)) : Math.floor(t / 4) * 4;
    if (cc && cc.sprites) cc.sprites.forEach((s) => list.push(Object.assign({ foot: 0, alpha: 1, shadow: 0 }, s, { tex: GL.texFor(s.src, s.dirty), light: new Float32Array(s.light || cc.ambient || [1, 1, 1]) })));
    const meView = (cc && cc.meView) || 'back';
    const txMe = X.charTex(0, me, { view: meView, left: !!(cc && cc.meLeft), animState: hub.moving ? 'run' : 'idle', frame: frameMe, accessories: App.state.equippedAccessories || [] });
    const ghost = cc ? 1 : bk < 1.1 ? Math.max(0.3, Math.min(1, 0.3 + ((bk - 0.3) / 0.8) * 0.7)) : 1;
    if (!(cc && cc.noMe)) list.push({ x: hub.px, y: hub.py, z: 0, w: (txMe.w / SPX) * 0.9, h: (txMe.h / SPX) * 0.9, foot: 6 / 72, tex: charGl(0, txMe), light: lit(hub.px, hub.py, 0.14), alpha: ghost, shadow: 0.26 });
    const spot = !cc && hub.canAct() ? hub.nearSpot() : null;
    if (spot) {
      const bob = Math.abs(Math.sin(t * 0.09)) * 0.06;
      list.push({ x: spot.x, y: spot.y, z: (spot.h || 1.1) + 0.12 + bob, w: 0.2, h: 0.16, foot: 0, tex: GL.arrowTex, light: new Float32Array([1, 1, 1]), alpha: 1, glow: true, shadow: 0 });
    }
    // poeira na luz
    const dust = [];
    if (!open && !(cc && cc.noDust)) {
      const m = World.map;
      const cx0 = Math.floor(hub.px);
      const cy0 = Math.floor(hub.py);
      for (let cy = cy0 - 6; cy <= cy0 + 6; cy++) for (let cx = cx0 - 6; cx <= cx0 + 6; cx++) {
        if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) continue;
        const idx = cy * MW + cx;
        if (m.solid[idx] || m.area[idx] < 0 || X.OPEN[m.area[idx]]) continue;
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
      if (cc && cc.dyn) drawDyn(VPm, eyeM, F, cc.dyn);
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
    // estádio gigante (js/hub3d_estadio.js): a parte sólida junto com o prédio; os fachos de
    // luz, o brilho dos refletores e a poeira na luz por cima de tudo (somando luz)
    const est = window.HubEstadio;
    const estOn = !!(est && est.wants(hub, eye, cc));
    if (estOn) est.draw(gl, VP, eye, look, F, hub, cc, 0);
    if (cc && cc.dyn) drawDyn(VP, eye, F, cc.dyn);
    drawSprites(VP, eye, F, list, false);
    drawDust(VP, F);
    if (estOn) est.draw(gl, VP, eye, look, F, hub, cc, 1);
    // 3) brilho, tom e cor
    post(F);
    if (cc && cc.sk) return;
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
  // desenha um quadro agora (usado pelas cenas de cinema) e devolve o canvas, ou null sem 3D
  GL.renderNow = function () {
    if (Hub.forceSW) return null;
    if (GL.lost) {
      if ((GL.losses || 0) >= 4) return null;
      rebuild();
    }
    if (GL.ok === undefined) GL.ok = init();
    if (!GL.ok) return null;
    if (!World.gl) {
      World.gl = true;
      World.key = '';
    }
    try {
      frame(Hub);
    } catch (err) {
      console.warn('[cine3d] quadro 3D falhou:', err);
      if (GL.lost) return null;
      if (!downgrade(err)) fail(err);
      return null;
    }
    return cvs;
  };
  // Envia aos poucos (em fatias) as texturas de um prédio guardado que ainda não está na
  // tela (World.snapOf: o de uma cena de cinema que vem aí): móveis, paredes e enfeites.
  // Quando a cena monta esse prédio (buildScene), elas já estão na placa.
  GL.prewarmGen = function* (snap) {
    if (!gl || !GL.ok || !snap || !snap.FA) return;
    if (!GL.pre || GL.preGl !== gl) {
      GL.pre = new Map();
      GL.preGl = gl;
    }
    if (GL.pre.has(snap.FA) || GL.wsrc === snap.FA) return;
    const g0 = gl;
    const pre = { gl, tex: new WeakMap(), worldTex: [] };
    const up = (t, sprite) => {
      if (!t || !t.px || pre.tex.has(t)) return;
      const g = texture2D(t.w, t.h, encode(t), { mip: !sprite, maxLevel: t.maxLevel });
      pre.tex.set(t, g);
      pre.worldTex.push(g);
    };
    let n = 0;
    for (const b of snap.boxes || []) {
      // (caixa da cidade: a face no atlas sobe junto com a folha inteira, uma vez só)
      ['N', 'S', 'E', 'W', 'T', 'B'].forEach((d) => up(b.atl && b.atl.uv[d] ? b.atl.page : b.f && b.f[d]));
      if (++n % 6 === 0) yield;
      if (gl !== g0) return; // (a placa foi perdida no meio)
    }
    for (const k of Object.keys(snap.walls || {})) {
      up(snap.walls[k]);
      if (++n % 3 === 0) yield;
      if (gl !== g0) return;
    }
    for (const s of snap.sprites || []) {
      up(s.tex, true);
      if (++n % 6 === 0) yield;
      if (gl !== g0) return;
    }
    // (a cena já montou esse prédio enquanto isso: não precisa mais)
    if (GL.wsrc === snap.FA || (GL.scn && [...GL.scn.values()].some((s) => s.src === snap.FA))) {
      pre.worldTex.forEach((t) => gl.deleteTexture(t));
      return;
    }
    // (no máximo 2 prédios adiantados: o mais velho sai)
    GL.pre.set(snap.FA, pre);
    while (GL.pre.size > 2) {
      const k = GL.pre.keys().next().value;
      GL.pre.get(k).worldTex.forEach((t) => gl.deleteTexture(t));
      GL.pre.delete(k);
    }
  };
  GL.fail = fail;
  GL.downgrade = downgrade;
  GL.rebuild = rebuild;
  // (para o js/hub3d_estadio.js montar os programas e texturas dele no mesmo contexto)
  GL.compile = compile;
  GL.texture2D = texture2D;
  GL.ctx = () => gl;
  Hub.GL3D = GL;
})();
