// ============================================================================
// SPRITES 2.0 — ESQUELETO 3D SIMPLES + PIXEL ART NUMA GRADE ÚNICA
//
// Cada quadro do boneco é montado de verdade, pixel a pixel, numa grade fixa
// (PX = 2 pixels por unidade da grade de 36 → caixa de 72 px) e só é ampliado em
// múltiplos inteiros. O corpo é um esqueleto em 3D bem simples (quadril, tronco,
// pescoço, ombro→cotovelo→mão, quadril→joelho→pé) que é PROJETADO na direção pedida
// (frente, 3/4 para a direita/esquerda, costas): a mesma pose serve para as 4 direções.
//
// Acabamento: luz única de cima à esquerda; cada material tem uma rampa de 4 tons com
// "hue shifting" (sombra puxando pro frio, luz pro quente); contorno seletivo (o
// contorno de fora é um tom escuro da cor vizinha, mais claro do lado da luz); linha
// interna só onde uma peça passa NA FRENTE de outra; limpeza de pixel solto.
// A cabeça (rosto, olhos, expressões e os 66 cabelos) é a mesma do jogo, desenhada na
// mesma grade (os cabelos já são polígonos). Tudo fica em cache por quadro.
// ============================================================================
(function () {
  'use strict';
  const PR = window.PixelRenderer;
  if (!PR) return;
  const RAD = Math.PI / 180;
  const PX = 2; // pixels da arte por unidade
  const X0 = -10; // canto do quadro (unidades)
  const Y0 = -16;
  const FW = 56 * PX; // 112 x 104 px por quadro
  const FH = 52 * PX;
  // Estilo do corpo (proporções). Padrão = o atual; o laboratório testa variações
  // (SpriteRig.setStyle). torsoK/legK/armK encurtam tronco, pernas e braços (cabeça
  // fica do mesmo tamanho = mais chibi); leanAdd inclina mais a corrida; rim = contorno
  // claro por fora (estilo "adesivo" da referência).
  // limbK = braços e pernas mais grossinhos; bootK = chuteira maior (chibi fofinho)
  // outline = uma cor de contorno escuro ÚNICA pro boneco todo (null = contorno da cor de
  // cada peça); lift = claridade mínima (HSL 0–1) do uniforme e do cabelo, pra não virar
  // mancha escura no gramado (0 = desligado)
  // Padrão = estilo "D" aprovado (04/11/2026): chibi (tronco/pernas/braços mais curtos,
  // braços e pernas um pouco mais grossos, chuteira maior), corrida mais inclinada,
  // contorno escuro único e cores escuras clareadas (preto vira azul bem escuro).
  // O estilo anterior ("A") é: torsoK/legK/armK/limbK/bootK/strideK = 1, leanAdd = 0,
  // outline = null, lift = 0.
  const STYLE = { torsoK: 0.82, legK: 0.76, armK: 0.86, leanAdd: 9, strideK: 1.18, rim: null, limbK: 1.06, bootK: 1.06, outline: '#171226', lift: 0.24 };
  // clareia uma cor até a claridade mínima, sem mudar matiz nem saturação
  function liftHex(hex, minL) {
    if (!minL) return hex;
    let [h, s, l] = rgbHsl(...hexRgb(hex));
    if (l >= minL) return hex;
    // preto/cinza não clareia pra cinza (fica desbotado): vira azul-violeta escuro, como o
    // "cabelo preto" de anime
    if (s < 0.25) {
      h = 232;
      s = 0.32;
    }
    const [r, g, b] = hslRgb(h, s, minL);
    return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  }
  const GROUND = 31.2; // sola da chuteira com o boneco em pé (igual ao desenho antigo)
  const GROUND_ROW = Math.round((GROUND - Y0) * PX) - 1;
  const HX = 18; // quadril em pé
  const HY = 23;

  // ================================================================ cores
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  function hexRgb(c) {
    if (Array.isArray(c)) return c.slice(0, 3);
    const s = String(c || '#ff00ff').trim();
    if (s[0] === '#') {
      const n = parseInt(s.slice(1, 7), 16);
      if (s.length === 4) return [((n >> 8) & 15) * 17, ((n >> 4) & 15) * 17, (n & 15) * 17];
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = s.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : [255, 0, 255];
  }
  function rgbHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn;
    const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h;
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslRgb(h, s, l) {
    h = ((((h % 360) + 360) % 360) / 360);
    if (s <= 0) {
      const v = Math.round(l * 255);
      return [v, v, v];
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
  }
  const hueTo = (h, target, amt) => h + (((((target - h) % 360) + 540) % 360) - 180) * amt;
  const pack = (c) => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
  const unpack = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255];
  const css = (v) => {
    const [r, g, b] = unpack(v);
    return `rgb(${r},${g},${b})`;
  };
  const isWarm = (h, s) => s > 0.22 && (h < 48 || h > 330);

  // Rampa de 4 tons: l (luz, puxa pro quente), b (base), d (sombra, puxa pro frio;
  // na pele puxa pro rosado), e (sombra funda / sombra projetada)
  const RAMPS = new Map();
  function ramp(color) {
    const key = String(color);
    let r = RAMPS.get(key);
    if (r) return r;
    const b = hexRgb(color);
    const [h, s, l] = rgbHsl(...b);
    const gray = s < 0.12;
    const warm = isWarm(h, s);
    const coolT = warm ? 350 : 232;
    const hs = gray ? 225 : h;
    const ss = gray ? Math.max(s, 0.1) : s;
    const dk = l < 0.22;
    const L = (hh, sat, lum) => pack(hslRgb(hh, clamp01(sat), clamp01(lum)));
    r = [
      L(gray ? h : hueTo(h, 52, 0.12), gray ? s : s * 1.04, dk ? l + 0.07 : l + Math.min(0.11, (1 - l) * 0.24)),
      pack(b),
      L(hueTo(hs, coolT, gray ? 0 : 0.13), ss * 1.04 + (gray ? 0.05 : 0), dk ? l * 0.68 : l * 0.83),
      L(hueTo(hs, coolT, gray ? 0 : 0.22), ss * 1.06 + (gray ? 0.08 : 0), dk ? l * 0.45 : l * 0.66)
    ];
    RAMPS.set(key, r);
    return r;
  }
  // Contorno seletivo: tom escuro da própria cor (do lado da luz, um pouco mais claro)
  const OUTL = new Map();
  function selOut(v, lit, soft) {
    const key = v * 4 + (lit ? 1 : 0) + (soft ? 2 : 0);
    let o = OUTL.get(key);
    if (o !== undefined) return o;
    const [r, g, b] = unpack(v);
    const [h, s, l] = rgbHsl(r, g, b);
    const gray = s < 0.12;
    const warm = isWarm(h, s);
    const k = soft ? (lit ? 0.62 : 0.5) : lit ? 0.4 : 0.27;
    o = pack(hslRgb(gray ? 228 : hueTo(h, warm ? 8 : 236, 0.3), gray ? 0.28 : Math.min(1, s * 0.85 + 0.12), Math.max(0.035, l * k)));
    OUTL.set(key, o);
    return o;
  }
  const mixPacked = (a, b, t) => pack(unpack(a).map((v, i) => Math.round(v + (unpack(b)[i] - v) * t)));

  // ================================================================ cabeça
  // Camada da cabeça: 36 x 32 unidades (72 x 64 px). y da camada = (y do rosto + 12) * PX.
  // O ponto de encaixe é o pescoço (18, 9) → px (36, 42).
  const HW = 36 * PX;
  const HH = 32 * PX;
  const HEAD_AX = 18 * PX;
  const HEAD_AY = (12 + 9) * PX;
  let headCv = null;
  const headCtx = () => {
    if (!headCv) {
      headCv = document.createElement('canvas');
      headCv.width = HW;
      headCv.height = HH;
    }
    const g = headCv.getContext('2d', { willReadFrequently: true });
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, HW, HH);
    g.imageSmoothingEnabled = false;
    return g;
  };
  const readLayer = (g, col, cls, c) => {
    const d = new Uint32Array(g.getImageData(0, 0, HW, HH).data.buffer);
    for (let i = 0; i < d.length; i++) {
      const a = d[i] >>> 24;
      if (a < 110) continue;
      col[i] = (d[i] | 0xff000000) >>> 0;
      cls[i] = c;
    }
  };

  // Olho da esquerda da tela por formato (eyeStyle); o da direita é o espelho.
  // 't6' = desloca 6 em vez de espelhar (o brilho fica sempre do lado da luz)
  const EYES = {
    default: (W, eye, pupil) => [[13, 4, 3, 2.2, W], [14, 4, 2, 2.2, eye], [14.6, 4.8, 1, 1.4, pupil], [14, 4.4, 0.6, 0.6, W, 't6'], [12.8, 3.8, 3.4, 0.5, 'D']],
    wide: (W, eye) => [[12.9, 4, 3.3, 2.5, W], [14, 4.6, 1.3, 1.4, eye], [12.9, 3.9, 3.3, 0.4, 'D']],
    sharp: (W, eye, pupil) => [[13, 4.3, 3, 1.6, W], [14, 4.1, 1.6, 1.9, eye], [14.55, 4.3, 0.5, 1.5, pupil], [14.1, 4.3, 0.4, 0.4, W], [12.8, 3.7, 3.4, 0.5, 'D'], [12.3, 3.3, 1.1, 0.5, 'D']],
    round: (W, eye, pupil) => [[13, 3.8, 3, 2.6, W], [13.5, 3.9, 2.3, 2.5, eye], [14.2, 4.7, 1, 1.2, pupil], [13.7, 4.0, 0.75, 0.75, W], [15.1, 5.6, 0.4, 0.4, W], [12.8, 3.4, 3.4, 0.55, 'D']],
    fierce: (W, eye, pupil) => [[13, 4.2, 3, 1.8, W], [14.1, 4.4, 1.4, 1.4, eye], [14.55, 4.8, 0.5, 0.6, pupil], [12.8, 3.6, 1.2, 0.5, 'D'], [13.9, 3.9, 1.2, 0.5, 'D'], [15, 4.2, 1.2, 0.5, 'D'], [13, 6.0, 3, 0.3, 'D']]
  };

  // ---- cabeça em 3/4: o crânio gira de verdade em volta do eixo do pescoço.
  // Na altura do rosto a cabeça é um cilindro de raio R0U; acima da testa ela fecha
  // como uma esfera. O que fica fora do crânio (pontas de cabelo, orelha) acompanha
  // a borda: do lado de perto anda junto, do lado de longe fica parado.
  const R0U = 6.2;
  const HEAD_YAW = (28 * Math.PI) / 180;
  const COS_HY = Math.cos(HEAD_YAW);
  // x virado de um ponto do rosto (unidades). 'hid' = ficou escondido atrás da bochecha
  const turnU = (u, sg) => {
    const d = u - 18;
    if (Math.abs(d) > R0U) return { x: d * sg < 0 ? u + sg * R0U * (1 - COS_HY) : u, hid: false };
    const a = Math.asin(d / R0U) + HEAD_YAW * sg;
    if (Math.abs(a) > Math.PI / 2) return { x: 18 + sg * R0U, hid: true };
    return { x: 18 + R0U * Math.sin(a), hid: false };
  };

  // Rosto arredondado (px da camada da cabeça): bochecha que fecha num queixo macio,
  // em vez do retângulo com cantos retos. Recuo de cada linha a partir de y = 36 px.
  const JAW = [1, 1, 2, 3, 4, 7];
  function faceMask(g, cd, skin, skinSoft, shadeSide) {
    const x0 = 12 * PX, x1 = 24 * PX;
    for (let y = 12 * PX; y < 12 * PX + 18; y++) {
      const k = y - 36;
      const ins = k < 0 ? 0 : JAW[k];
      g.fillStyle = skin;
      g.fillRect(x0 + ins, y, x1 - x0 - ins * 2, 1);
      // lado longe da luz (direita) um tom mais suave, seguindo a curva da bochecha
      if (shadeSide && y >= 26 && y < 40) {
        g.fillStyle = skinSoft;
        g.fillRect(x1 - ins - 2, y, 2, 1);
      }
    }
    if (cd.longChin) {
      g.fillStyle = skin;
      g.fillRect(x0 + 9, 42, x1 - x0 - 18, 1);
      g.fillRect(x0 + 10, 43, x1 - x0 - 20, 1);
    }
  }

  function drawFace(g, cd, view, sg, expr, fl, part = 'all') {
    const R = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(Math.round(x * PX), Math.round((y + 12) * PX), Math.max(1, Math.round(w * PX)), Math.max(1, Math.round(h * PX)));
    };
    const skin = cd.skinColor || '#f3d1b8';
    const sk = ramp(skin);
    const skinShade = css(sk[2]);
    const skinSoft = css(mixPacked(sk[1], sk[2], 0.45));
    const dark = '#0a0f1c';
    const ink = '#090d16';
    const side = view === 'side';
    const acc = fl.acc || [];
    // 3/4: cada peça do rosto vai pro lugar dela na cabeça virada (as duas pontas
    // mapeadas pelo giro, então o olho de longe estreita e o de perto alarga)
    const F = (x, y, w, h, c) => {
      if (!side) return R(x, y, w, h, c);
      const a = turnU(x, sg);
      const b = turnU(x + w, sg);
      if (a.hid && b.hid) return;
      const xa = Math.round(Math.min(a.x, b.x) * PX);
      const xb = Math.max(xa + 1, Math.round(Math.max(a.x, b.x) * PX));
      g.fillStyle = c;
      g.fillRect(xa, Math.round((y + 12) * PX), xb - xa, Math.max(1, Math.round(h * PX)));
    };
    // peça do olho esquerdo + o espelho (ou deslocamento) no direito
    const pair = (x, y, w, h, c, mode) => {
      F(x, y, w, h, c);
      const xr = mode === 't6' ? x + 6 : mode === 't67' ? x + 6.7 : 36 - x - w;
      F(xr, y, w, h, c);
    };

    // balaclava: o pano preto toma o lugar da pele no rosto, nas orelhas e no pescoço
    const bala = acc.includes('balaclava');
    const bSkin = bala ? '#1a2133' : skin;
    const bSoft = bala ? '#121828' : skinSoft;
    const bShade = bala ? '#0c101b' : skinShade;
    if (part !== 'feat') {
      // pescoço, rosto arredondado e orelhas ('base' = fonte do giro 3/4: sem pescoço,
      // porque o pescoço fica no eixo e não gira junto)
      if (view === 'back') {
        // de costas: só a calota (embaixo do cabelo), o pescoço e as orelhas.
        // A mandíbula larga aparecendo embaixo das pontas parecia um rosto com franja.
        R(12.4, 0, 11.2, 5, bSkin);
        R(15.2, 4, 5.6, 5.8, bSkin);
        R(15.2, 4, 0.8, 5.8, bSoft);
        R(20, 4, 0.8, 5.8, bSoft);
        R(11.2, 4.2, 1.2, 2.2, bSoft);
        R(23.6, 4.2, 1.2, 2.2, bSoft);
        R(11.6, 4.7, 0.5, 1.2, bShade);
        R(23.9, 4.7, 0.5, 1.2, bShade);
        if (longHair(cd)) R(12, 0, 12, 7, cd.hairColor || '#0f172a');
      } else {
        if (part !== 'base') R(16, 8.4, 4, 1, bShade);
        faceMask(g, cd, bSkin, bSoft, true);
        R(11.4, 4, 0.8, 2.2, bShade);
        R(23.8, 4, 0.8, 2.2, bShade);
        // costura do pano no meio do rosto (pega a luz de leve)
        if (bala) R(17.8, 6.4, 0.4, 2.4, '#262f45');
      }
      if (part === 'base' || view === 'back') return;
    }

    // abertura dos olhos da balaclava (cantos arredondados, sombra do pano em cima)
    if (bala) {
      F(13.2, 3.2, 9.6, 2.9, skin);
      F(12.8, 3.6, 0.4, 2.1, skin);
      F(22.8, 3.6, 0.4, 2.1, skin);
      F(13.2, 3.2, 9.6, 0.5, skinShade);
    }

    // ---- olhos
    const eye = cd.eyeColor || '#ef4444';
    const pupil = PR.shade(eye, -0.5);
    const W = '#ffffff';
    const es = cd.eyeStyle && EYES[cd.eyeStyle] ? cd.eyeStyle : cd.eyeStyle === 'lidded' || cd.eyeStyle === 'tired' ? cd.eyeStyle : 'default';
    const angry = expr === 'angry' || (cd.angry && (expr === null || expr === 'normal'));
    const mode = fl.blink ? 'closed' : expr === 'laugh' ? 'arc' : expr === 'sparkle' ? 'star' : expr === 'scared' ? 'tiny' : expr === 'hurt' ? 'squeeze' : 'base';
    if (mode === 'closed') pair(13, 5, 3, 1, ink);
    else if (mode === 'arc') {
      [[13, 5.5, 0.5], [13.5, 5, 0.5], [14, 4.5, 1], [15, 5, 0.5], [15.5, 5.5, 0.5]].forEach(([x, y, w]) => pair(x, y, w, 0.5, dark));
    } else if (mode === 'squeeze') {
      [[13, 4, 1], [14, 4.5, 1], [15, 5, 1], [14, 5.5, 1], [13, 6, 1]].forEach(([x, y, w]) => pair(x, y, w, 0.5, dark));
    } else if (mode === 'star') {
      pair(13, 3.8, 3, 2.6, W);
      pair(13.5, 3.9, 2.3, 2.5, eye);
      pair(14.4, 4.1, 0.5, 1.6, W);
      pair(13.9, 4.65, 1.5, 0.5, W);
      pair(15.2, 5.7, 0.5, 0.5, W);
      pair(12.8, 3.4, 3.4, 0.55, dark);
    } else if (mode === 'tiny') {
      // susto (anime): o mesmo olho, com os cílios, e a íris encolhida num pontinho
      pair(13, 3.9, 3, 2.4, W);
      pair(14.2, 4.5, 1, 1.1, eye);
      pair(14.45, 4.75, 0.5, 0.6, pupil);
      pair(12.8, 3.6, 3.4, 0.5, dark);
    } else {
      const base = es === 'lidded' || es === 'tired' ? 'default' : es;
      if (fl.aura) {
        // OLHO DO FLUXO (como no anime): o branco do olho escurece e a íris acende na cor
        // do Fluxo, com a pupila virando um ponto de luz branco
        const auraC = fl.auraColor || cd.auraColor || '#38bdf8';
        const iris = PR.shade(auraC, 0.3);
        let first = true;
        EYES[base](W, eye, pupil).forEach(([x, y, w, h, c, m]) => {
          let cc = c === 'D' ? dark : c;
          if (c === W && first) {
            cc = '#161a33';
            first = false;
          } else if (c === eye) cc = iris;
          else if (c === pupil) cc = '#ffffff';
          pair(x, y, w, h, cc, m);
        });
      } else EYES[base](W, eye, pupil).forEach(([x, y, w, h, c, m]) => pair(x, y, w, h, c === 'D' ? dark : c, m));
      if (es === 'lidded') {
        pair(12.9, 3.9, 3.2, 1.1, skinShade);
        pair(12.8, 4.8, 3.4, 0.45, dark);
      } else if (es === 'tired') {
        pair(12.9, 3.9, 3.2, 1.4, skinShade);
        pair(12.8, 5.1, 3.4, 0.45, dark);
        pair(13.2, 6.45, 2.6, 0.3, PR.shade(skin, -0.2));
      }
      if (angry) {
        pair(12.9, 3.9, 3.3, 0.9, dark);
        pair(15, 4.6, 1.3, 0.8, dark);
      } else if (expr === 'determined' || expr === 'shout') {
        pair(12.9, 3.9, 3.3, 0.5, dark);
      } else if (expr === 'smirk') {
        pair(12.9, 3.9, 3.3, 0.7, skinShade);
      }
    }
    if (cd.lashes && mode === 'base') pair(12.4, 3.6, 0.8, 0.8, dark);
    // rastro de luz saindo do olho só no grito do chute (no Fluxo o rosto fica normal e
    // só o olho muda de cor)
    if (expr === 'shout' && mode !== 'closed' && !fl.noTrail) {
      const aura = fl.auraColor || cd.auraColor || '#38bdf8';
      F(22, 3, 5, 1.2, aura);
      F(25, 2, 3, 1.2, W);
    }

    // ---- sobrancelhas
    if (angry) {
      [[12.6, 2.3], [13.8, 2.7], [15, 3.1]].forEach(([x, y]) => pair(x, y, 1.4, 0.8, ink));
    } else if (expr === 'determined' || expr === 'shout') {
      pair(13, 2.6, 1.6, 0.6, ink);
      pair(14.5, 3.0, 1.6, 0.6, ink);
    } else if (expr === 'sweat' || expr === 'scared' || expr === 'hurt') {
      pair(13, 3.1, 1.6, 0.6, ink);
      pair(14.5, 2.6, 1.6, 0.6, ink);
    } else if (expr === 'smirk') {
      F(13, 3, 3, 0.6, ink, 'L');
      F(20, 2.4, 3, 0.6, ink, 'R');
    } else if (expr === 'happy' || expr === 'laugh' || expr === 'sparkle') {
      pair(13, 2.6, 3, 0.6, ink);
    } else if (cd.shortBrows) {
      pair(14, 3, 1.4, 1, ink);
    } else {
      pair(13, 3, 3, 1, ink);
    }

    // ---- nariz e boca (somem embaixo da balaclava e da máscara do corvo)
    const covered = bala || acc.includes('crow_mask');
    if (!covered) F(18.2, 6.2, 0.7, 0.7, skinShade);
    const M = (x, y, w, h, c) => {
      if (!covered) F(x, y, w, h, c);
    };
    // expressão pedida de propósito (raiva) ganha da boca de cadastro (ex.: a boca fina do Rin)
    const strong = expr === 'laugh' || expr === 'shout' || expr === 'scared' || expr === 'hurt' || expr === 'sparkle' || expr === 'angry';
    if (cd.mouth === 'thin' && !strong) M(16.6, 7.5, 2.8, 0.5, PR.shade(skin, -0.45));
    else if (cd.mouth === 'grin' && !strong) {
      M(15.4, 6.9, 5.2, 1.5, dark);
      M(15.7, 7.05, 4.6, 0.75, '#f8fafc');
      M(17.3, 7.05, 0.65, 1.1, '#f8fafc');
      M(18.05, 7.05, 0.65, 1.1, '#f8fafc');
    } else if (cd.mouth === 'gold_grin' && !strong) {
      M(14.4, 6.6, 7.2, 2.1, '#1a0b05');
      M(14, 6.3, 0.8, 0.7, '#1a0b05');
      M(21.2, 6.3, 0.8, 0.7, '#1a0b05');
      M(14.8, 6.85, 6.4, 0.75, '#facc15');
      M(15.2, 7.75, 5.6, 0.7, '#eab308');
      [15.9, 18.1, 20.3].forEach((x) => M(x, 6.85, 0.2, 1.6, '#92400e'));
    } else if (angry || expr === 'hurt') {
      M(15.8, 6.9, 4.4, 1.2, dark);
      M(16.1, 7.1, 3.8, 0.7, '#f8fafc');
      [17.1, 18.9].forEach((x) => M(x, 7.1, 0.25, 0.7, '#64748b'));
    } else if (expr === 'laugh') {
      M(16, 6.8, 4, 2, '#7f1d1d');
      M(16.4, 6.8, 3.2, 0.5, '#ffffff');
      M(17, 8.1, 2, 0.7, '#f87171');
    } else if (expr === 'shout' || expr === 'sparkle') {
      M(16.3, 6.8, 3.4, 1.9, '#7f1d1d');
      M(16.6, 6.8, 2.8, 0.5, '#ffffff');
    } else if (expr === 'happy') {
      M(16.4, 7.0, 3.2, 1.1, '#7f1d1d');
      M(16.6, 7.0, 2.8, 0.5, '#ffffff');
      M(15.9, 6.6, 0.6, 0.5, '#7f1d1d');
      M(19.5, 6.6, 0.6, 0.5, '#7f1d1d');
    } else if (expr === 'scared') {
      M(17.1, 6.9, 1.8, 1.8, '#7f1d1d');
    } else if (expr === 'sweat') {
      M(16.4, 7.5, 1, 0.5, '#9a3412');
      M(17.4, 7.0, 1.2, 0.5, '#9a3412');
      M(18.6, 7.5, 1, 0.5, '#9a3412');
    } else if (expr === 'smirk') {
      M(16.8, 7.5, 2.4, 0.5, '#9a3412');
      M(19.2, 7.0, 0.6, 0.5, '#9a3412');
    } else if (expr === 'determined') {
      M(16.6, 7.4, 2.8, 0.5, '#7c2d12');
    } else {
      // boca neutra: tracinho pequeno (o bloco 4x2 parecia um "O" de susto)
      M(17, 7.3, 2, 0.5, '#9a3412');
    }
    if ((expr === 'happy' || expr === 'laugh' || expr === 'sparkle') && !covered) {
      const blush = css(mixPacked(sk[1], pack([244, 114, 182]), 0.38));
      pair(13.2, 6.6, 1.6, 0.5, blush);
    }

    // ---- óculos, viseira e máscaras
    if (cd.glasses) {
      const fc = '#0b0b0f';
      [['L', 12.4], ['R', 19.4]].forEach(([grp, gx]) => {
        F(gx + 0.6, 4.2, 3, 2.3, 'rgba(203,213,225,0.22)', grp);
        F(gx, 3.6, 4.2, 0.7, fc, grp);
        F(gx, 6.4, 4.2, 0.7, fc, grp);
        F(gx, 3.6, 0.7, 3.5, fc, grp);
        F(gx + 3.5, 3.6, 0.7, 3.5, fc, grp);
        F(gx + 0.9, 4.4, 0.5, 0.5, '#ffffff', grp);
      });
      F(16.6, 4.4, 2.8, 0.6, fc, 'C');
    } else if (cd.sportGlasses) {
      // óculos esportivo do Yukimiya: armação prateada envolvente, lente âmbar com brilho
      const fr = '#cbd5e1';
      const frD = '#64748b';
      F(11.4, 3.3, 13.2, 0.6, fr);
      F(11.4, 3.9, 13.2, 0.3, frD);
      [['L', 12.4], ['R', 19.2]].forEach(([grp, gx]) => {
        F(gx, 4.2, 4.4, 2.0, 'rgba(251,191,36,0.55)', grp);
        F(gx, 6.0, 4.4, 0.4, frD, grp);
        F(gx + 0.5, 4.3, 1.3, 0.5, '#fff7ed', grp);
        F(gx + 2.6, 5.2, 0.6, 0.4, 'rgba(255,247,237,0.7)', grp);
      });
      F(16.8, 4.2, 2.4, 0.6, fr, 'C');
    } else if (cd.hairStyle === 'parted_glasses' || cd.hairStyle === 'spiky_glasses') {
      F(12, 3.5, 12, 1, '#f59e0b');
      F(13, 3.5, 4, 2.5, 'rgba(56,189,248,0.4)', 'L');
      F(19, 3.5, 4, 2.5, 'rgba(56,189,248,0.4)', 'R');
    } else if (acc.includes('face_guard')) {
      // óculos protetor esportivo: elástico atrás, armação em volta de cada olho,
      // faixa da lente escura em cima com brilho (os olhos aparecem por baixo)
      const fr = '#1e293b';
      F(11.3, 3.8, 13.4, 0.7, '#0b1220');
      [12.6, 19.0].forEach((gx) => {
        F(gx, 3.0, 4.4, 0.6, fr);
        F(gx, 6.2, 4.4, 0.6, fr);
        F(gx, 3.0, 0.6, 3.8, fr);
        F(gx + 3.8, 3.0, 0.6, 3.8, fr);
        F(gx + 0.6, 3.6, 3.2, 0.7, '#38bdf8');
        F(gx + 0.6, 4.3, 3.2, 0.4, '#1d4ed8');
        F(gx + 0.8, 3.6, 0.8, 0.5, '#e0f2fe');
      });
      F(17.0, 4.0, 2.0, 0.8, fr);
      F(17.4, 4.0, 1.2, 0.3, '#475569');
    }
    if (acc.includes('crow_mask')) {
      // máscara do corvo: cobre nariz e boca e desce num bico; costura cinza no meio
      // e as tiras indo pra orelha
      const mk = '#090d16';
      F(11.4, 5.4, 1.4, 0.5, mk);
      F(23.2, 5.4, 1.4, 0.5, mk);
      F(12.6, 5.3, 10.8, 0.7, mk);
      F(12.4, 6.0, 11.2, 2.0, mk);
      F(13.4, 8.0, 9.2, 0.6, mk);
      F(15.0, 8.6, 6.0, 0.6, mk);
      F(16.6, 9.2, 2.8, 0.6, mk);
      F(17.4, 9.8, 1.2, 0.5, mk);
      F(13.0, 5.3, 4.4, 0.5, '#1f2937');
      F(17.8, 6.0, 0.4, 3.8, '#334155');
      F(14.2, 6.6, 1.0, 0.5, '#1f2937');
    }
  }

  // Cabelo (os polígonos do jogo rasterizados direto na grade) + o que vai por cima
  // Cabelo grande: de costas ele cai e cobre a nuca. Todo o resto é cabelo curto:
  // de costas acaba na altura da orelha, com pontinhas, e o pescoço aparece.
  // (Hugo, Aiku, Lorenzo, Ness e Grim são cabelo médio/curto: de costas acabam na nuca)
  const LONG_HAIR = new Set(['chigiri_long', 'anri_bob', 'bachira_bob', 'glam_very_long', 'braid_side', 'dreads_ponytail', 'tall_dreads', 'snuffy_dreads', 'kaiser_gradient', 'reo_bun', 'ego_bob', 'freckle_bob']);
  const longHair = (cd) => LONG_HAIR.has(cd.hairStyle || 'spiky_tall');
  const SPIKY = /spik|flame|horn|shark|star|lightning|wild/;
  // linha de baixo do cabelo de costas (unidades): uma curva em U, alta dos lados e
  // descendo no meio até perto da gola (cabeça redonda vista de trás), com pontinhas
  // ao longo da curva
  const NAPE_TIPS = [13.6, 15.8, 18, 20.2, 22.4];
  const napeCurve = (xu) => {
    const d = Math.abs(xu - 18);
    return d >= 7.4 ? 3.6 : 3.6 + 5 * Math.sqrt(1 - (d / 7.4) ** 2);
  };
  const napeY = (xu, spiky) => {
    let y = napeCurve(xu);
    NAPE_TIPS.forEach((tx) => {
      const t = 1 - Math.abs(xu - tx) / 1.1;
      if (t > 0) y += (spiky ? 1.2 : 0.9) * t;
    });
    return y;
  };
  const napeCut = (x, spiky) => Math.round((napeY((x + 0.5) / PX, spiky) + 12) * PX);

  // Cabelo curto de costas com topo reto (cara de "pote"): arredonda os cantos de cima
  // (só acima da testa, sem deixar aparecer a pele da cabeça) e contorna a borda nova
  function roundBackTop(col, cls, ol) {
    const xa = Math.round(11.4 * PX), xb = Math.round(24.6 * PX);
    const top = new Int16Array(HW).fill(-1);
    let minTop = HH;
    for (let x = xa; x < xb; x++) {
      for (let y = 0; y < HH; y++) {
        if (cls[y * HW + x]) {
          top[x] = y;
          break;
        }
      }
      if (top[x] >= 0) minTop = Math.min(minTop, top[x]);
    }
    let flat = 0, n = 0;
    for (let x = Math.round(12.5 * PX); x < Math.round(23.5 * PX); x++) {
      n++;
      if (top[x] >= 0 && top[x] - minTop <= 1) flat++;
    }
    if (!n || flat / n < 0.7) return;
    const limit = Math.round((-0.2 + 12) * PX);
    const R = 3.4, C0 = 3.4;
    const cut = [];
    // (a largura toda do cabelo: as colunas de fora da cabeça também, senão sobram
    // "chifrinhos" nos cantos)
    for (let x = 0; x < HW; x++) {
      if (top[x] < 0) {
        for (let y = 0; y < limit; y++) {
          if (cls[y * HW + x]) {
            top[x] = y;
            break;
          }
        }
      }
      const d = Math.abs((x + 0.5) / PX - 18) - C0;
      if (d <= 0 || top[x] < 0) continue;
      const drop = R - Math.sqrt(Math.max(0, R * R - Math.min(R, d) * Math.min(R, d)));
      const to = Math.min(limit, Math.round(minTop + drop * PX));
      for (let y = top[x]; y < to; y++) {
        const i = y * HW + x;
        if (!cls[i]) continue;
        col[i] = 0;
        cls[i] = 0;
        cut.push(i);
      }
    }
    // a borda nova ganha o contorno
    cut.forEach((i) => {
      [i + HW, i - 1, i + 1].forEach((j) => {
        if (j >= 0 && j < HW * HH && cls[j] === 1) {
          col[j] = ol;
          cls[j] = 2;
        }
      });
    });
  }

  // Cabelo LONGO desenhado por código, de costas (era um bloco quadrado com uma faixa
  // clara reta): topo arredondado, pontas na barra de baixo, fios caindo de cada vão
  // entre as pontas, volume de cima para baixo e brilho em tracinhos no alto
  function longBackTidy(col, cls, main, ol) {
    const lumP = (v) => 0.3 * (v & 255) + 0.59 * ((v >> 8) & 255) + 0.11 * ((v >> 16) & 255);
    const lm = lumP(main);
    for (let i = 0; i < col.length; i++) if (cls[i] === 1 && lumP(col[i]) > lm + 18) col[i] = main;
    roundBackTop(col, cls, ol);
    const yT = new Int16Array(HW).fill(-1);
    const yB = new Int16Array(HW).fill(-1);
    for (let x = 0; x < HW; x++) {
      for (let y = 0; y < HH; y++) {
        if (!cls[y * HW + x]) continue;
        if (yT[x] < 0) yT[x] = y;
        yB[x] = y;
      }
    }
    // pontas: a cada 2,2 unidades, a barra de baixo sobe 0,9 unidade nos vãos
    const P = 2.2;
    const tri = (xu) => {
      const d = (((xu - 18 + P / 2) % P) + P) % P;
      return 1 - Math.abs(d - P / 2) / (P / 2); // 1 = ponta, 0 = vão
    };
    const nb = new Int16Array(HW).fill(-1);
    for (let x = 0; x < HW; x++) {
      if (yB[x] < 0) continue;
      const h = yB[x] - yT[x];
      const cut = h > 8 ? Math.round((1 - tri((x + 0.5) / PX)) * 0.9 * PX) : 0;
      nb[x] = yB[x] - cut;
      for (let y = nb[x] + 1; y <= yB[x]; y++) {
        col[y * HW + x] = 0;
        cls[y * HW + x] = 0;
      }
    }
    // contorno da borda nova (embaixo e nos lados de cada ponta)
    for (let x = 0; x < HW; x++) {
      if (nb[x] < 0) continue;
      for (let y = Math.max(0, nb[x] - 3); y <= nb[x]; y++) {
        const i = y * HW + x;
        if (cls[i] !== 1) continue;
        if (y === nb[x] || (x > 0 && y > nb[x - 1]) || (x < HW - 1 && y > nb[x + 1])) {
          col[i] = ol;
          cls[i] = 2;
        }
      }
    }
    const sh = (i, k) => (col[i] = mixPacked(col[i], LOCK_DARK, k));
    const li = (i, k) => (col[i] = mixPacked(col[i], LOCK_LIGHT, k));
    for (let x = 0; x < HW; x++) {
      if (yT[x] < 0 || nb[x] < 0) continue;
      const xu = (x + 0.5) / PX;
      const h = Math.max(1, nb[x] - yT[x]);
      for (let y = yT[x]; y < nb[x]; y++) {
        const i = y * HW + x;
        if (cls[i] !== 1) continue;
        const v = (y - yT[x]) / h;
        // fio: uma linha de sombra descendo de cada vão entre as pontas (metade de baixo)
        const valley = tri(xu) < 0.12;
        if (valley && v > 0.42) sh(i, v > 0.8 ? 0.42 : 0.26);
        else if (v > 0.88) sh(i, 0.26);
        else if (v > 0.7) sh(i, 0.14);
        else if (xu > 21.6 && v > 0.2) sh(i, 0.1);
      }
      // brilho em tracinhos 2 px abaixo do contorno de cima (lado da luz)
      if (xu > 12.4 && xu < 20.6 && (x + (xu < 17 ? 0 : 1)) % 4 !== 0) {
        const i = (yT[x] + 2) * HW + x;
        if (cls[i] === 1) li(i, xu < 17 ? 0.3 : 0.2);
      }
    }
  }

  // Volume do cabelo curto de costas (pixel art clássico): mais claro em cima e mais
  // escuro embaixo, um brilho em tracinhos acompanhando o contorno de cima (do lado da
  // luz: cima à esquerda), o lado direito um pouco na sombra e os "V" de sombra subindo
  // de cada vão entre as pontinhas da nuca (os do meio mais compridos: separam as mechas).
  // Os tons saem da cor do próprio pixel (cabelo de duas cores continua com as duas).
  const LOCK_DARK = pack([14, 10, 30]);
  const LOCK_LIGHT = pack([255, 255, 255]);
  function backHairLocks(col, cls, cutA, flatLight) {
    const yT = new Int16Array(HW).fill(-1);
    for (let x = 0; x < HW; x++) {
      for (let y = 0; y < cutA[x]; y++) {
        if (cls[y * HW + x]) {
          yT[x] = y;
          break;
        }
      }
    }
    const hairCols = [];
    for (let x = 0; x < HW; x++) if (yT[x] >= 0) hairCols.push(x);
    if (!hairCols.length) return;
    const xL = hairCols[0], xR = hairCols[hairCols.length - 1];
    const sh = (i, k) => (col[i] = mixPacked(col[i], LOCK_DARK, k));
    const li = (i, k) => (col[i] = mixPacked(col[i], LOCK_LIGHT, k));
    for (let x = xL; x <= xR; x++) {
      if (yT[x] < 0) continue;
      const xu = (x + 0.5) / PX;
      const h = cutA[x] - yT[x];
      for (let y = yT[x]; y < cutA[x]; y++) {
        const i = y * HW + x;
        if (cls[i] !== 1) continue;
        // (a faixa clara da vista de frente, que de costas não existe, vira a cor base)
        if (flatLight && flatLight(col[i])) col[i] = flatLight.main;
        const v = (y - yT[x]) / Math.max(1, h);
        if (v > 0.86) sh(i, 0.3);
        else if (v > 0.68) sh(i, 0.16);
        else if (xu > 21.6 && v > 0.22) sh(i, 0.1);
      }
      // brilho em tracinhos: 2 px abaixo do contorno de cima, do lado esquerdo e no meio
      const d = y => y * HW + x;
      if (xu > 12.4 && xu < 20.6 && (x + (xu < 17 ? 0 : 1)) % 4 !== 0) {
        const y1 = yT[x] + 2;
        if (y1 < cutA[x] - 3 && cls[d(y1)] === 1) li(d(y1), xu < 17 ? 0.34 : 0.22);
        if (xu < 16 && y1 + 1 < cutA[x] - 3 && cls[d(y1 + 1)] === 1) li(d(y1 + 1), 0.16);
      }
    }
    // camadas: uma fileira de pontinhas no meio da cabeça (a camada de cima por cima da
    // de baixo), paralela à nuca. Linha de sombra em zigue-zague, um fio de luz na borda
    // da camada de cima (lado da luz) e a camada de baixo um pouco na sombra
    const MID_TIPS = [12.5, 14.7, 16.9, 19.1, 21.3, 23.5];
    const zig = (xu) => {
      let best = 0;
      MID_TIPS.forEach((tx) => (best = Math.max(best, 1 - Math.abs(xu - tx) / 1.1)));
      return best;
    };
    for (let x = xL; x <= xR; x++) {
      if (yT[x] < 0) continue;
      const xu = (x + 0.5) / PX;
      if (Math.abs(xu - 18) > 6.6) continue;
      const yu = napeCurve(xu) - 3.3 + 1.0 * zig(xu);
      const y = Math.round((yu + 12) * PX);
      if (y <= yT[x] + 2 || y >= cutA[x] - 3) continue;
      const i = y * HW + x;
      if (cls[i] !== 1) continue;
      sh(i, 0.38);
      if (cls[i - HW] === 1 && xu < 19) li(i - HW, 0.14);
      for (let k = 1; k <= 2; k++) if (cls[i + k * HW] === 1) sh(i + k * HW, 0.1);
    }
    // "V" de sombra subindo de cada vão entre as pontinhas da nuca (inclinado para o meio)
    for (let n = 0; n < NAPE_TIPS.length - 1; n++) {
      const xv = (NAPE_TIPS[n] + NAPE_TIPS[n + 1]) / 2;
      const mid = n === 1 || n === 2;
      const len = mid ? 7 : 4;
      let x = Math.floor(xv * PX);
      const toC = xv < 18 ? 1 : -1;
      const yb = Math.round((napeCurve(xv) + 12) * PX) - 1;
      for (let k = 0; k < len; k++) {
        const y = yb - k;
        if (k === 3 || k === 6) x += toC;
        const i = y * HW + x;
        if (y > 0 && cls[i] === 1) sh(i, k < 2 ? 0.45 : 0.3);
      }
    }
  }

  // what: 'all' | 'runs' (só os fios) | 'over' (só o que vai por cima: faixa, suor, fone)
  function drawHairLayer(cd, view, expr, fl, col, cls, what = 'all') {
    const style = cd.hairStyle || 'spiky_tall';
    const c1 = cd.hairColor || '#0f172a';
    const c2 = cd.hairSecondary || c1;
    const back = view === 'back';
    const side = view === 'side';
    const shortBack = back && !longHair(cd);
    // over = formas por cima da cabeça já virada (only: 'over'): o contorno delas só
    // aparece fora do cabelo (por cima do próprio cabelo ele viraria um risco)
    const paint = (st, a0, b0, over) => {
      // cabelo preto vira um azul-violeta bem escuro (lê no gramado; o preto fica pro contorno)
      const a = STYLE.lift ? liftHex(a0, STYLE.lift * 0.85) : a0;
      const b2 = STYLE.lift ? liftHex(b0, STYLE.lift * 0.85) : b0;
      const n = hexRgb(a);
      const luma = 0.3 * n[0] + 0.59 * n[1] + 0.11 * n[2];
      const rp = ramp(a);
      const pal = {
        main: pack(n),
        sec: pack(hexRgb(b2)),
        light: pack(hexRgb(luma < 70 ? b2 : PR.shade(a, 0.32))),
        gloss: pack(hexRgb(PR.shade(a, luma < 70 ? 0.3 : 0.32))),
        shade: luma < 70 ? pack(hexRgb(PR.shade(a, -0.3))) : rp[2],
        outline: selOut(pack(n), false, false),
        line: luma < 70 ? pack(hexRgb(PR.shade(a, -0.6))) : rp[3],
        beard: mixPacked(pack(hexRgb(cd.skinColor || '#f3d1b8')), pack([20, 12, 8]), 0.78),
        scar: pack(hexRgb('#b45f4a'))
      };
      PR.getHairRuns(st, back, over ? fl.sg || 1 : fl.sideSrc, over).forEach((run) => {
        const x0 = Math.round(run.x * PX);
        const y = Math.round((run.y + 12) * PX);
        const w = Math.round(run.w * PX);
        if (y < 0 || y >= HH) return;
        // de costas, cabelo curto: sem os riscos verticais na nuca (eram eles que
        // deixavam o cabelo com cara de "lambido")
        const k = shortBack && run.k === 'line' && run.y > 1 ? 'main' : run.k;
        const v = pal[k];
        if (v === undefined) return;
        for (let x = Math.max(0, x0); x < Math.min(HW, x0 + w); x++) {
          if (over && run.k === 'outline' && cls[y * HW + x]) continue;
          col[y * HW + x] = v;
          cls[y * HW + x] = run.k === 'outline' ? 2 : 1;
        }
      });
    };
    if (what !== 'over') {
      const spiky = SPIKY.test(style);
      const main = pack(hexRgb(c1));
      // cabelo curto de costas: a calota da cabeça é cabelo até a nuca (sem careca
      // aparecendo entre as mechas desenhadas)
      if (shortBack) {
        for (let x = Math.round(11.4 * PX); x < Math.round(24.6 * PX); x++) {
          const cut = napeCut(x, spiky);
          for (let y = (-1 + 12) * PX; y < cut; y++) {
            const i = y * HW + x;
            if (!cls[i]) {
              col[i] = main;
              cls[i] = 1;
            }
          }
        }
      }
      if (PR.HAIR_SHAPES[style]) paint(style, c1, c2);
      else if (shortBack) {
        // estilo desenhado por código: a vista de costas dele é um bloco quadrado.
        // Usa o topo da vista de frente (espetos, volume) e a calota cobre o resto.
        const g = headCtx();
        PR.drawHairStyle(g, style, c1, c2, 12, PX, 'front');
        const tc = new Uint32Array(HW * HH);
        const tk = new Uint8Array(HW * HH);
        readLayer(g, tc, tk, 1);
        const lim = (-0.5 + 12) * PX;
        for (let i = 0; i < lim * HW; i++) {
          if (!tk[i]) continue;
          col[i] = tc[i];
          cls[i] = tk[i];
        }
      } else {
        const g = headCtx();
        PR.drawHairStyle(g, style, c1, c2, 12, PX, back ? 'back' : 'front');
        readLayer(g, col, cls, 1);
        // cabelo longo de costas desenhado por código: deixa de ser um bloco quadrado
        if (back) {
          const mainP = pack(hexRgb(c1));
          longBackTidy(col, cls, mainP, selOut(mainP, false, false));
        }
      }
      if (cd.hat === 'beanie') paint('hat_beanie', '#16181d', '#2b2f38');
      // corta a nuca "lambida": abaixo da linha da nuca não tem cabelo, e a borda nova
      // ganha o contorno do próprio cabelo (as pontinhas)
      if (shortBack) {
        const ol = selOut(main, false, false);
        // contorno que ficou no meio do cabelo (a borda da nuca antiga, agora coberta
        // pela calota) vira só um tom de sombra
        const ins = [];
        for (let i = HW * 23; i < HW * (HH - 1); i++) {
          if (cls[i] === 2 && cls[i - HW] && cls[i + HW] && cls[i - 1] && cls[i + 1]) ins.push(i);
        }
        const lumS = 0.3 * ((main >> 16) & 255) + 0.59 * ((main >> 8) & 255) + 0.11 * (main & 255);
        const shdS = lumS < 70 ? pack(hexRgb(PR.shade(c1, -0.3))) : ramp(c1)[2];
        ins.forEach((i) => {
          col[i] = shdS;
          cls[i] = 1;
        });
        const cutA = new Int16Array(HW);
        for (let x = 0; x < HW; x++) {
          cutA[x] = napeCut(x, spiky);
          for (let y = cutA[x]; y < HH; y++) {
            col[y * HW + x] = 0;
            cls[y * HW + x] = 0;
          }
        }
        // contorno da borda cortada: embaixo e nos lados de cada pontinha
        const mk = [];
        for (let x = 0; x < HW; x++) {
          for (let y = Math.max(0, cutA[x] - 5); y < cutA[x]; y++) {
            const i = y * HW + x;
            if (!cls[i]) continue;
            if (y + 1 >= cutA[x] || (x > 0 && y >= cutA[x - 1]) || (x < HW - 1 && y >= cutA[x + 1])) mk.push(i);
          }
        }
        mk.forEach((i) => {
          col[i] = ol;
          cls[i] = 2;
        });
        // topo reto (cabelo "pote" de costas): arredonda os cantos de cima da cabeça
        if (!PR.HAIR_SHAPES[style]) roundBackTop(col, cls, ol);
        // volume e mechas (estilos desenhados por código: a faixa clara da vista de
        // frente some, de costas ela não existe)
        let flat = null;
        if (!PR.HAIR_SHAPES[style]) {
          const lumP = (v) => 0.3 * (v & 255) + 0.59 * ((v >> 8) & 255) + 0.11 * ((v >> 16) & 255);
          const lm = lumP(main);
          flat = (v) => lumP(v) > lm + 18;
          flat.main = main;
        }
        backHairLocks(col, cls, cutA, flat);
      }
      if (what === 'runs') return;
    }
    // mechas desenhadas direto na cabeça virada (ex.: a trança do Kurona caindo na frente)
    if (side && PR.HAIR_SHAPES[style]) paint(style, c1, c2, true);
    // por cima do cabelo: faixa, veia de raiva, fones, gota de suor
    // (em 3/4 cada peça vai pro lugar dela na cabeça virada)
    const acc = fl.acc || [];
    const g = headCtx();
    const R = (x, y, w, h, c) => {
      let xa = Math.round(x * PX);
      let xb = xa + Math.max(1, Math.round(w * PX));
      if (side) {
        const a = turnU(x, fl.sg || 1);
        const b = turnU(x + w, fl.sg || 1);
        if (a.hid && b.hid) return;
        xa = Math.round(Math.min(a.x, b.x) * PX);
        xb = Math.max(xa + 1, Math.round(Math.max(a.x, b.x) * PX));
      }
      g.fillStyle = c;
      g.fillRect(xa, Math.round((y + 12) * PX), xb - xa, Math.max(1, Math.round(h * PX)));
    };
    let any = false;
    if (acc.includes('headband')) {
      any = true;
      const W1 = '#ffffff';
      const W2 = '#eef2f7';
      const W3 = '#c3ccd8';
      // pixel direto (sem o giro), para o nó e as pontas que ficam fora da cabeça
      const P = (x, y, w, h, c) => {
        g.fillStyle = c;
        g.fillRect(Math.round(x * PX), Math.round((y + 12) * PX), Math.max(1, Math.round(w * PX)), Math.max(1, Math.round(h * PX)));
      };
      // a faixa contorna a testa: mais baixa nas pontas (cabeça redonda), luz em cima
      for (let x = 11; x < 25; x += 0.5) {
        const d = (x + 0.25 - 18) / 7;
        const y0 = 1.0 + 0.7 * d * d;
        R(x, y0, 0.5, 0.5, W1);
        R(x, y0 + 0.5, 0.5, 0.5, W2);
        R(x, y0 + 1.0, 0.5, 0.5, W3);
      }
      // ponta de pano: tira grossa com a parte de baixo na sombra
      const tail = (pts) => {
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, y0] = pts[i];
          const [x1, y1] = pts[i + 1];
          const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * PX));
          for (let k = 0; k <= n; k++) {
            const x = x0 + ((x1 - x0) * k) / n;
            const y = y0 + ((y1 - y0) * k) / n;
            P(x - 0.5, y, 1, 0.5, W3);
            P(x - 0.5, y - 0.5, 1, 0.5, W2);
          }
        }
      };
      const knot = (kx, ky) => {
        P(kx - 1, ky - 0.7, 2, 1.8, W2);
        P(kx - 0.5, ky - 0.2, 1, 0.8, W3);
        P(kx - 1, ky - 0.7, 2, 0.5, W1);
      };
      if (back) {
        // de costas: nó no meio da nuca e as duas pontas soltas no vento
        tail([[18.3, 2.6], [20.2, 4.4], [22.6, 5.4], [24.8, 5.0]]);
        tail([[17.8, 2.8], [19.2, 5.4], [20.4, 7.4], [21.8, 8.4]]);
        knot(18, 2.0);
      } else if (side) {
        // de lado: o nó fica atrás da cabeça e as pontas voam pra trás
        const s = fl.sg || 1;
        const kx = s > 0 ? turnU(11.2, s).x - 0.3 : turnU(24.8, s).x + 0.3;
        tail([[kx, 2.3], [kx - s * 2.6, 3.0], [kx - s * 5.2, 2.5]]);
        tail([[kx, 2.7], [kx - s * 2.0, 4.6], [kx - s * 4.2, 5.7]]);
        knot(kx, 1.9);
      } else {
        // de frente: só as pontinhas aparecendo atrás da cabeça, de um lado
        tail([[25.3, 2.4], [26.8, 3.3], [28.2, 3.0]]);
        tail([[25.3, 2.8], [26.4, 4.8], [27.3, 5.9]]);
      }
    }
    if (!back) {
      if (expr === 'angry' || (cd.angry && !expr)) {
        [[21.5, -1.5, 0.5, 1.5], [23, -1.5, 0.5, 1.5], [21, -1, 1.5, 0.5], [22.5, -1, 1.5, 0.5], [21.5, 0, 0.5, 1.5], [23, 0, 0.5, 1.5]].forEach(([x, y, w, h]) => R(x, y, w, h, '#dc2626'));
        any = true;
      }
      if (cd.earpiece) {
        R(10.9, 4.8, 1.1, 1.5, '#111318');
        R(11.2, 6.2, 0.5, 1.2, '#111318');
        any = true;
      }
      if (cd.headset) {
        R(10.6, 4.4, 1.4, 2, '#111318');
        R(11.6, 6.2, 0.6, 0.6, '#111318');
        R(12.1, 6.7, 0.6, 0.6, '#111318');
        R(12.6, 7.2, 1.4, 0.5, '#111318');
        R(13.8, 6.9, 1.2, 1.1, '#1f2329');
        any = true;
      }
      if (expr === 'sweat' || fl.sweat) {
        R(24.5, 1, 1, 1.5, '#7dd3fc');
        R(24.5, 0.5, 0.5, 0.5, '#7dd3fc');
        R(24.5, 1.5, 0.5, 0.5, '#ffffff');
        any = true;
      }
    }
    if (any) readLayer(g, col, cls, 1);
  }

  const layer = () => ({ col: new Uint32Array(HW * HH), cls: new Uint8Array(HW * HH) });

  // Gira a cabeça para 3/4 juntando a vista de frente e a de costas (base do rosto +
  // fios do cabelo). Cada pixel da tela, dentro do crânio, sabe de que ângulo da cabeça
  // ele vem: da frente (rosto, franja) ou, na borda de trás, das costas (nuca, cabelo de trás).
  function turnHead(fF, hF, fB, hB, sg) {
    const face = layer();
    const hair = layer();
    const near = new Uint8Array(HW * HH);
    const c = HEAD_AX;
    const ps = HEAD_YAW * sg;
    let faceOK = true;
    const put = (o, sf, sh, j) => {
      if (!sf.cls[j] && !sh.cls[j]) return false;
      if (sf.cls[j] && (faceOK || sf === fB)) {
        face.col[o] = sf.col[j];
        face.cls[o] = sf.cls[j];
      }
      if (sh.cls[j]) {
        hair.col[o] = sh.col[j];
        hair.cls[o] = sh.cls[j];
      }
      return true;
    };
    const R = R0U * PX;
    // linhas em que a vista de frente tem cabelo caindo nas laterais (costeleta,
    // cabelo comprido). Sem isso, da orelha pra baixo o cabelo de trás não aparece:
    // cabelo curto não ganha um bloco preto do lado da mandíbula.
    const sideHair = new Uint8Array(HH);
    for (let y = 0; y < HH; y++) {
      for (let x = 0; x < HW; x++) {
        if (hF.cls[y * HW + x] && Math.abs(x + 0.5 - c) >= R - 2) {
          sideHair[y] = 1;
          break;
        }
      }
    }
    for (let y = 0; y < HH; y++) {
      const yu = y / PX - 12;
      const backOK = y < 35 || sideHair[y];
      // o giro é inteiro do rosto pra baixo e vai sumindo até o topo da cabeça
      // (a franja vira com o rosto, as pontas de cima quase não mexem: espeto não quebra)
      const tw = Math.min(1, Math.max(0, (yu + 8.5) / 7));
      const w = tw * tw * (3 - 2 * tw);
      const psy = ps * w;
      const row = y * HW;
      // linhas da mandíbula: a pele da frente gira por conta própria (passo 3)
      const ins = y < 36 ? -1 : y <= 41 ? JAW[y - 36] : 9 + (y - 42);
      faceOK = ins < 0;
      // 1) dentro do crânio: mapa inverso (sem buracos)
      let lastJ = -1;
      for (let x = 0; x < HW; x++) {
        const dx = x + 0.5 - c;
        if (Math.abs(dx) > R) continue;
        const a = Math.asin(dx / R) - psy;
        const s = R * Math.sin(a);
        const front = Math.abs(a) <= Math.PI / 2;
        if (!front && !backOK) continue;
        let xs = Math.floor(front ? c + s : c - s);
        if (xs < 0 || xs >= HW) continue;
        const sh = front ? hF : hB;
        // contorno esticado vira 2-3 px de risco escuro: repete só o pixel de dentro
        if (row + xs === lastJ && sh.cls[row + xs] === 2) {
          const inward = xs + (xs < c ? 1 : -1);
          if (sh.cls[row + inward] === 1) xs = inward;
        }
        lastJ = row + Math.floor(front ? c + s : c - s);
        if (put(row + x, front ? fF : fB, sh, row + xs)) continue;
        // perto da borda a vista de frente não tem nada: usa a outra vista no mesmo ponto
        if (Math.abs(a) > 0.95 && yu > -3 && (front ? backOK : true)) {
          const xm = Math.floor(front ? c - s : c + s);
          if (xm >= 0 && xm < HW) put(row + x, front ? fB : fF, front ? hB : hF, row + xm);
        }
      }
      // 2) fora do crânio (vista de frente): o lado de perto anda junto com a borda,
      // o lado de longe fica parado atrás (só cabelo: a orelha de lá some atrás da cabeça)
      const shift = Math.round(sg * R * (1 - Math.cos(psy)));
      for (let xs = 0; xs < HW; xs++) {
        const dx = xs + 0.5 - c;
        if (Math.abs(dx) <= R) continue;
        const j = row + xs;
        if (!fF.cls[j] && !hF.cls[j]) continue;
        const nearSide = dx * sg < 0;
        const x = nearSide ? xs + shift : xs;
        if (x < 0 || x >= HW) continue;
        const o = row + x;
        if (!nearSide) {
          if (!face.cls[o] && !hair.cls[o] && hF.cls[j]) {
            hair.col[o] = hF.col[j];
            hair.cls[o] = hF.cls[j];
          }
          continue;
        }
        if (hF.cls[j]) {
          hair.col[o] = hF.col[j];
          hair.cls[o] = hF.cls[j];
          near[o] = 1;
        } else if (fF.cls[j] && faceOK) {
          face.col[o] = fF.col[j];
          face.cls[o] = fF.cls[j];
          if (!near[o]) hair.cls[o] = 0;
        }
      }
      // 3) mandíbula: cada linha é uma elipse mais estreita e mais pra frente que o crânio,
      // então o queixo aponta pro lado em que ele olha e a bochecha de longe faz curva
      if (ins >= 0 && ins < 12) {
        const e = 12 - ins;
        const d = e * 0.9;
        const f0 = R - d;
        const A = Math.hypot(e * Math.cos(psy), d * Math.sin(psy));
        const be = Math.atan2(d * Math.sin(psy), e * Math.cos(psy));
        const ctr = c + f0 * Math.sin(psy);
        for (let x = 0; x < HW; x++) {
          const dxo = x + 0.5 - ctr;
          if (Math.abs(dxo) > A) continue;
          let ph = Math.asin(dxo / A) - be;
          // lado de trás da mandíbula (embaixo da orelha): pele da borda, espelhada
          if (ph > Math.PI / 2) ph = Math.PI - ph;
          else if (ph < -Math.PI / 2) ph = -Math.PI - ph;
          const xs = Math.min(HW - 1, Math.max(0, Math.floor(c + e * Math.sin(ph))));
          const j = row + xs;
          if (!fF.cls[j]) continue;
          face.col[row + x] = fF.col[j];
          face.cls[row + x] = fF.cls[j];
        }
      }
    }
    return { face, hair };
  }

  // sombra curtinha do cabelo na nuca: 1 px de pele mais escura logo abaixo das pontas
  function napeShade(cd, face, hair) {
    const sh = ramp(cd.skinColor || '#f3d1b8')[2];
    for (let i = HW; i < HW * HH; i++) {
      if (face.cls[i] && !hair.cls[i] && hair.cls[i - HW]) face.col[i] = sh;
    }
  }

  function sideHead(cd, sg, expr, fl) {
    const fF = layer(), hF = layer(), fB = layer(), hB = layer();
    let g = headCtx();
    drawFace(g, cd, 'front', sg, expr, fl, 'base');
    readLayer(g, fF.col, fF.cls, 1);
    drawHairLayer(cd, 'front', expr, Object.assign({}, fl, { sideSrc: sg }), hF.col, hF.cls, 'runs');
    g = headCtx();
    drawFace(g, cd, 'back', sg, expr, fl, 'base');
    readLayer(g, fB.col, fB.cls, 1);
    drawHairLayer(cd, 'back', expr, fl, hB.col, hB.cls, 'runs');
    napeShade(cd, fB, hB);
    const h = turnHead(fF, hF, fB, hB, sg);
    // pescoço: fica no eixo (não gira), só aparece onde a cabeça não cobre
    const neckC = (fl.acc || []).includes('balaclava') ? pack(hexRgb('#0c101b')) : ramp(cd.skinColor || '#f3d1b8')[2];
    for (let y = 41; y <= 42; y++) {
      for (let x = 16 * PX; x < 20 * PX; x++) {
        const i = y * HW + x;
        if (h.face.cls[i] || h.hair.cls[i]) continue;
        h.face.col[i] = neckC;
        h.face.cls[i] = 1;
      }
    }
    // traços do rosto desenhados já virados (nítidos, sem esticar pixel)
    g = headCtx();
    drawFace(g, cd, 'side', sg, expr, fl, 'feat');
    readLayer(g, h.face.col, h.face.cls, 1);
    drawHairLayer(cd, 'side', expr, Object.assign({}, fl, { sg }), h.hair.col, h.hair.cls, 'over');
    return h;
  }

  const HEADS = new Map();
  function headLayers(cd, view, sg, expr, fl) {
    const key = [cd.id || cd.name, cd.hairStyle, cd.hairColor, cd.hairSecondary, cd.skinColor, cd.eyeColor, cd.eyeStyle, cd.hat, cd.glasses, cd.angry, cd.mouth, cd.longChin, cd.lashes, cd.shortBrows, cd.earpiece, cd.headset, view, sg, expr, fl.blink ? 1 : 0, fl.aura ? fl.auraColor || 1 : 0, fl.sweat ? 1 : 0, fl.noTrail ? 1 : 0, (fl.acc || []).join(',')].join('|');
    let h = HEADS.get(key);
    if (h) return h;
    if (view === 'side') h = sideHead(cd, sg, expr, fl);
    else {
      const face = layer();
      const hair = layer();
      const g = headCtx();
      drawFace(g, cd, view, sg, expr, fl);
      readLayer(g, face.col, face.cls, 1);
      drawHairLayer(cd, view, expr, fl, hair.col, hair.cls);
      if (view === 'back') napeShade(cd, face, hair);
      h = { face, hair };
    }
    if (HEADS.size > 220) HEADS.clear();
    HEADS.set(key, h);
    return h;
  }

  // ================================================================ RotSprite
  // Gira pixel art sem estragar: amplia 4x com Scale2x (2 vezes), gira e amostra.
  // (8x era 4 vezes mais caro e na grade de 2 px não dava diferença visível)
  function scale2x(src, w, h) {
    const W2 = w * 2;
    const dst = new Uint32Array(W2 * h * 2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const P = src[y * w + x];
        const A = y > 0 ? src[(y - 1) * w + x] : P;
        const B = x < w - 1 ? src[y * w + x + 1] : P;
        const C = x > 0 ? src[y * w + x - 1] : P;
        const D = y < h - 1 ? src[(y + 1) * w + x] : P;
        const o = y * 2 * W2 + x * 2;
        dst[o] = C === A && C !== D && A !== B ? A : P;
        dst[o + 1] = A === B && A !== C && B !== D ? B : P;
        dst[o + W2] = D === C && D !== B && C !== A ? C : P;
        dst[o + W2 + 1] = B === D && B !== A && D !== C ? D : P;
      }
    }
    return dst;
  }
  function rotSprite(src, w, h, ang, px, py) {
    const a = ((ang % 360) + 360) % 360;
    const R = Math.ceil(Math.hypot(w, h)) + 2;
    const S = 2 * R;
    const out = new Uint32Array(S * S);
    const c = Math.cos(a * RAD);
    const sn = Math.sin(a * RAD);
    const exact = a % 90 === 0;
    let s = src;
    let sw = w;
    let sh = h;
    const K = exact ? 1 : 4;
    if (!exact) {
      for (let i = 0; i < 2; i++) {
        s = scale2x(s, sw, sh);
        sw *= 2;
        sh *= 2;
      }
    }
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - R;
        const dy = y + 0.5 - R;
        const sx = (dx * c + dy * sn + px) * K;
        const sy = (-dx * sn + dy * c + py) * K;
        const ix = Math.floor(sx);
        const iy = Math.floor(sy);
        if (ix < 0 || iy < 0 || ix >= sw || iy >= sh) continue;
        out[y * S + x] = s[iy * sw + ix];
      }
    }
    return { data: out, w: S, h: S, ax: R, ay: R };
  }

  // ================================================================ geometria
  const capsule = (ax, ay, bx, by, ra, rb) => {
    const ang = Math.atan2(by - ay, bx - ax);
    const pts = [];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const t = ang + Math.PI / 2 + (i / n) * Math.PI;
      pts.push([ax + Math.cos(t) * ra, ay + Math.sin(t) * ra]);
    }
    for (let i = 0; i <= n; i++) {
      const t = ang - Math.PI / 2 + (i / n) * Math.PI;
      pts.push([bx + Math.cos(t) * rb, by + Math.sin(t) * rb]);
    }
    return pts;
  };
  const circle = (cx, cy, r) => {
    const pts = [];
    for (let i = 0; i < 16; i++) pts.push([cx + Math.cos((i / 16) * Math.PI * 2) * r, cy + Math.sin((i / 16) * Math.PI * 2) * r]);
    return pts;
  };
  // fecho convexo (para a silhueta do tronco e da chuteira)
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [];
    for (const q of p) {
      while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
      lo.push(q);
    }
    const up = [];
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
      up.push(q);
    }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001010010', '111101111101111', '111101111001111'];

  // ================================================================ montagem do quadro
  const VIEW_YAW = { front: 0, side: 62, back: 180 };
  const TONE_L = 0;
  const TONE_B = 1;
  const TONE_D = 2;
  const TONE_E = 3;

  // tempo por etapa da montagem (ms acumulados; SpriteRig.prof) — pra achar o gargalo
  const PROF = { prep: 0, head: 0, raster: 0, passes: 0, outline: 0, canvas: 0, n: 0 };
  let profT = 0;
  const profMark = (k) => {
    const t = performance.now();
    PROF[k] += t - profT;
    profT = t;
  };
  function buildFrame(cd, pose, o, crop = false) {
    profT = performance.now();
    PROF.n++;
    const view = o.view || pose.view || 'front';
    const sg = o.left ? -1 : 1;
    const yaw = (VIEW_YAW[view] || 0) * (view === 'side' ? sg : 1);
    const cy = Math.cos(yaw * RAD);
    const sy = Math.sin(yaw * RAD);
    const outfit = cd.outfit || 'kit';
    const kit = outfit === 'kit';
    const acc = o.accessories || [];
    // espelho de pose (frente/costas com flipX): troca as pernas e os braços
    const mir = !!o.mirror;
    const AR = (mir ? pose.AL : pose.AR) || [2, 12, 9];
    const AL = (mir ? pose.AR : pose.AL) || [2, 12, 9];
    const LR = (mir ? pose.LL : pose.LR) || [0, 0, 0, 3];
    const LL = (mir ? pose.LR : pose.LL) || [0, 0, 0, 3];

    // ---------- materiais (cada um vira uma rampa de 4 tons)
    const mats = [];
    const matIdx = {};
    // (estilo com lift: uniforme escuro ganha claridade mínima — o preto fica pro contorno)
    const LIFTABLE = { j1: 1, j2: 1, therm: 1, shorts: 1, sock: 1, cloth: 1, pants: 1, boot: 1, neck: 1, pglove: 1, gkstrap: 1, wrist: 1 };
    const M = (name, color) => {
      matIdx[name] = mats.length;
      mats.push(ramp(STYLE.lift && LIFTABLE[name] ? liftHex(color, STYLE.lift) : color));
    };
    const j1 = cd.jerseyPrimary || '#0f2942';
    const j2 = cd.jerseySecondary || '#1d4ed8';
    const clothes = outfit === 'suit' ? '#111522' : outfit === 'office' ? '#1e2a44' : outfit === 'casual' ? cd.clothesColor || '#8b8f99' : j1;
    const whiteJ2 = /^#f[0-9a-f]{5}$/i.test(j2) && hexRgb(j2).every((v) => v > 230);
    M('skin', cd.skinColor || '#f3d1b8');
    M('j1', j1);
    M('j2', j2);
    M('neck', '#0b1020');
    M('therm', '#121a2c');
    M('shorts', outfit === 'suit' ? clothes : outfit === 'casual' ? '#27406b' : outfit === 'office' ? clothes : whiteJ2 ? '#1e3a8a' : '#111827');
    M('sock', '#111a33');
    M('boot', outfit === 'suit' ? '#0a0e1a' : outfit === 'office' ? '#11141c' : outfit === 'casual' ? '#e2e8f0' : '#1e40af');
    M('studF', '#facc15');
    M('studB', '#38bdf8');
    M('cloth', clothes);
    M('pants', outfit === 'suit' ? '#111522' : outfit === 'office' ? '#2b3448' : '#27406b');
    M('white', '#f1f5f9');
    M('tie', '#0b0f1a');
    M('wrist', '#16181d');
    M('red', '#ef4444');
    M('gkglove', '#f8fafc');
    M('gkstrap', '#1f2937');
    M('pglove', '#151b2b');
    M('pcuff', '#64748b');
    M('wrap', '#e2e8f0');
    M('bone', '#e9e2cf');
    // número das costas: branco em camisa escura, azul-marinho em camisa clara
    M('num', rgbHsl(...hexRgb(j1))[2] > 0.55 ? '#13203d' : '#f8fafc');
    const T = (m, t) => matIdx[m] * 4 + t;

    // ---------- esqueleto: espaço do corpo (f = frente, u = para baixo, r = direita do boneco)
    // pose "correndo pra frente" (inclinada): o estilo pode inclinar e abrir mais a passada
    const runLike = (pose.lean || 0) > 8 && !pose.roll;
    const lean = ((pose.lean || 0) + (runLike ? STYLE.leanAdd : 0)) * RAD;
    const cl = Math.cos(lean);
    const sl = Math.sin(lean);
    const stretch = pose.breath || 0;
    const roll = (pose.roll || 0) * sg;
    const hipY = HY + (pose.y || 0);
    const rc = Math.cos(roll * RAD);
    const rs = Math.sin(roll * RAD);
    const leanPt = (f, u, r) => {
      // tronco (u < 0): respira e, no estilo chibi, fica mais curto
      if (u < 0) u *= (1 + stretch / 9) * STYLE.torsoK;
      return [f * cl - u * sl, f * sl + u * cl, r];
    };
    // projeção na tela (unidades) + profundidade (z maior = mais perto da câmera)
    const proj = (p) => {
      let x = HX + (-p[2] * cy + p[0] * sy);
      let y = hipY + p[1];
      if (roll) {
        const dx = x - HX;
        const dy = y - hipY;
        x = HX + dx * rc - dy * rs;
        y = hipY + dx * rs + dy * rc;
      }
      return [x, y, p[0] * cy + p[2] * sy];
    };
    const add = (a, d, k) => [a[0] + d[0] * k, a[1] + d[1] * k, a[2] + d[2] * k];
    const dirV = (flex, abd, side) => {
      const a = abd * RAD;
      const f = flex * RAD;
      return [Math.cos(a) * Math.sin(f), Math.cos(a) * Math.cos(f), Math.sin(a) * side];
    };

    const parts = [];
    // membro de trás (lado longe da câmera) fica um tom mais escuro: dá profundidade
    const farShift = (side) => (view === 'side' && side * sg < 0 ? 1 : 0);

    // ---------- tronco: anéis elípticos (altura u, meia-largura W, meia-profundidade D)
    const RINGS = [
      [-9.15, 4.7, 2.4],
      [-8.7, 6.0, 3.0],
      [-7.6, 6.5, 3.3],
      [-4.6, 6.4, 3.35],
      [-2.35, 5.9, 3.15],
      [-1.6, 6.05, 3.2],
      [0.9, outfit === 'office' ? 6.7 : 6.0, 3.15]
    ];
    const ringAt = (u) => {
      if (u <= RINGS[0][0]) return RINGS[0];
      for (let i = 1; i < RINGS.length; i++) {
        if (u <= RINGS[i][0]) {
          const a = RINGS[i - 1];
          const b = RINGS[i];
          const t = (u - a[0]) / (b[0] - a[0]);
          return [u, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        }
      }
      return RINGS[RINGS.length - 1];
    };
    const torsoPts = [];
    RINGS.forEach(([u, Wd, D]) => {
      for (let i = 0; i < 20; i++) {
        const th = (i / 20) * Math.PI * 2;
        torsoPts.push(proj(leanPt(D * Math.cos(th), u, Wd * Math.sin(th))));
      }
    });
    const tA = proj(leanPt(0, 0.9, 0));
    const tB = proj(leanPt(0, -9.15, 0));
    const axL = Math.hypot(tB[0] - tA[0], tB[1] - tA[1]) || 1e-6;
    const ax = [(tB[0] - tA[0]) / axL, (tB[1] - tA[1]) / axL];
    const back = Math.abs(yaw) > 150;
    // número das costas: 2 dígitos com célula de 2 px; 3 dígitos (ex.: 299) com célula de
    // 1 px de largura, pra caber nas costas
    const num = String(o.shirtNumber || cd.number || 11).slice(0, 3);
    const nCw = num.length >= 3 ? 1 : 2;
    const nPitch = 3 * nCw + (num.length >= 3 ? 1 : 2);
    const torsoShader = (x, y) => {
      const dx = x - tA[0];
      const dy = y - tA[1];
      const u = 0.9 - ((dx * ax[0] + dy * ax[1]) / axL) * 10.05;
      const s = ax[0] * dy - ax[1] * dx; // deslocamento lateral na tela
      const [, Wd, D] = ringAt(u);
      const Rr = Math.hypot(Wd * cy, D * sy) || 1e-6;
      const al = Math.atan2(D * sy, -Wd * cy);
      const q = Math.asin(Math.max(-1, Math.min(1, -s / Rr)));
      // dois ângulos possíveis: fica o que está virado pra câmera
      let th = q - al;
      const th2 = Math.PI - q - al;
      const dz = (t) => D * Math.cos(t) * cy + Wd * Math.sin(t) * sy;
      if (dz(th2) > dz(th)) th = th2;
      const sn = Math.sin(th);
      const cs = Math.cos(th);
      const rl = Wd * sn; // lateral no corpo (+ = direita do boneco)
      // normal → luz da esquerda
      let nr = sn / Wd;
      let nf = cs / D;
      const nl = Math.hypot(nr, nf) || 1;
      nr /= nl;
      nf /= nl;
      const nx = -(-nr * cy + nf * sy);
      let tone = nx < -0.56 ? TONE_L : nx > 0.62 ? TONE_D : TONE_B;
      const front = cs > 0.5;
      const shirt = u < -2.35;
      if (shirt) {
        if (u < -8.55 && tone === TONE_B) tone = TONE_L;
        if (u > -2.85) tone = TONE_D;
        if (kit) {
          if (back && Math.abs(yaw) > 150) {
            const cxp = Math.floor(s * PX + (num.length * nPitch - (nPitch - 3 * nCw)) / 2);
            const ry = Math.floor((u + 7.1) * PX);
            if (ry >= 0 && ry < 10 && cxp >= 0) {
              const dg = Math.floor(cxp / nPitch);
              const cc = cxp % nPitch;
              if (dg < num.length && cc < 3 * nCw) {
                const bits = DIGITS[+num[dg]] || DIGITS[0];
                if (bits[Math.floor(ry / 2) * 3 + Math.floor(cc / nCw)] === '1') return T('num', TONE_B);
              }
            }
          }
          if (front && u < -8.35 && Math.abs(rl) < 2.9) return T('neck', TONE_B);
          if (front && u < -7.75 && Math.abs(rl) < 2.1) return T('j2', TONE_L);
          if (front && u < -7.15 && Math.abs(rl) < 1.1) return T('j2', TONE_L);
          if (cs < -0.55 && u < -8.5 && Math.abs(rl) < 2.4) return T('j2', TONE_B);
          // faixa lateral: de frente aparece na beirada; de lado não "acende" com a luz
          if (Math.abs(sn) > 0.8 && cs > -0.3) return T('j2', tone === TONE_L && Math.abs(yaw) > 20 && Math.abs(yaw) < 150 ? TONE_B : tone);
          if (Math.abs(sn) > 0.8 && back) return T('j2', tone);
          return T('j1', tone);
        }
        // terno / blazer / casual
        if (front && outfit === 'suit') {
          const v = 2.3 - (u + 9.15) * 0.42;
          if (u < -4.4 && Math.abs(rl) < v) return Math.abs(rl) < 0.55 ? T('tie', TONE_B) : T('white', u < -8.4 ? TONE_D : TONE_B);
          if (u < -3.6 && Math.abs(rl) < v + 0.9) return T('cloth', TONE_L);
          if (Math.abs(rl) < 0.4 && u > -4.2 && u < -3.5) return T('white', TONE_D);
        } else if (front && outfit === 'office') {
          if (u < -6.4 && Math.abs(rl) < 1.7) return T('white', TONE_B);
          if (u < -5 && Math.abs(rl) < 2.6) return T('cloth', TONE_L);
        } else if (front && outfit === 'casual') {
          if (Math.abs(rl) < 2.5) return T('white', u < -8.4 ? TONE_D : rl > 1.6 ? TONE_D : TONE_B);
          if (Math.abs(rl) < 3.1) return T('cloth', TONE_D);
        }
        return T('cloth', tone);
      }
      // calção (ou calça / saia)
      if (u < -1.9 && kit) return T('shorts', TONE_E);
      return T(kit ? 'shorts' : outfit === 'office' ? 'cloth' : 'pants', tone);
    };
    parts.push({ pts: hull(torsoPts), z: 0, g: 1, sh: torsoShader, line: true });

    // ---------- membros (cápsulas com luz pela normal)
    const limb = (a, b, ra, rb, z, g, pick, far) => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const L2 = dx * dx + dy * dy;
      const L = Math.sqrt(L2) || 1e-6;
      const nx = -dy / L;
      const ny = dx / L;
      const lit = nx * -0.6 + ny * -0.8;
      const sh = (x, y) => {
        const t = L2 > 1e-6 ? ((x - a[0]) * dx + (y - a[1]) * dy) / L2 : 0;
        const tc = t < 0 ? 0 : t > 1 ? 1 : t;
        const r = ra + (rb - ra) * tc;
        const off = ((x - a[0]) * nx + (y - a[1]) * ny) / r;
        const f = L2 > 1e-6 ? off * lit : (x - a[0]) * -0.6 + (y - a[1]) * -0.8;
        let tone = f > 0.42 ? TONE_L : f < -0.4 ? TONE_D : TONE_B;
        const v = pick(t, tone);
        if (!far) return v;
        const tt = v & 3;
        return tt === TONE_E ? v : v + 1;
      };
      parts.push({ pts: L2 > 1e-6 ? capsule(a[0], a[1], b[0], b[1], ra, rb) : circle(a[0], a[1], Math.max(ra, rb)), z, g, sh, line: true });
    };

    // ---------- pernas
    const legGeo = (side, prm) => {
      const [th0, kn = 0, ft = 0, ab = 3] = prm;
      const th = runLike ? th0 * STYLE.strideK : th0;
      const hip = [0, 0, 3.25 * side];
      const knee = add(hip, dirV(th, ab, side), 3.4 * STYLE.legK);
      const ank = add(knee, dirV(th - kn, ab, side), 3.0 * STYLE.legK);
      return { hip, knee, ank, fa: th - kn + 90 - ft, ab, side };
    };
    const legs = { R: legGeo(1, LR), L: legGeo(-1, LL) };
    const toes = {};
    const addLeg = (k, gid) => {
      const lg = legs[k];
      const far = farShift(lg.side);
      const H = proj(lg.hip);
      const K = proj(lg.knee);
      const A = proj(lg.ank);
      const zT = (H[2] + K[2]) / 2 - 0.45;
      const zS = (K[2] + A[2]) / 2 - 0.45;
      // pedaço do calção que acompanha a coxa
      const d1 = [lg.knee[0] - lg.hip[0], lg.knee[1] - lg.hip[1], lg.knee[2] - lg.hip[2]];
      const sEnd = proj(add(lg.hip, d1, kit || outfit === 'office' ? 0.3 : 0.5));
      const legMat = kit ? 'skin' : 'pants';
      const shortsMat = kit ? 'shorts' : outfit === 'office' ? 'cloth' : 'pants';
      // coxa (a meia-calça da Anri é mais fina)
      const lk = STYLE.limbK;
      if (outfit === 'office') limb(proj(add(lg.hip, d1, 0.3)), K, 1.55 * lk, 1.45 * lk, zT, gid, (t, tone) => T('pants', tone), far);
      else limb(proj(add(lg.hip, d1, 0.36)), K, (kit ? 1.75 : 1.85) * lk, (kit ? 1.6 : 1.7) * lk, zT, gid, (t, tone) => T(legMat, tone), far);
      limb(H, sEnd, (kit ? 2.15 : 1.95) * lk, (kit ? 2.05 : 1.9) * lk, zT + 0.05, gid, (t, tone) => T(shortsMat, tone), far);
      // canela com o meião listrado
      limb(K, A, 1.6 * lk, (kit ? 1.35 : 1.4) * lk, zS, gid, (t, tone) => {
        if (!kit) return T(outfit === 'office' ? 'pants' : 'pants', tone);
        if (t < 0.07) return T('skin', tone);
        if (t < 0.34) return T('j2', tone);
        if (t < 0.43) return T('sock', tone);
        if (t < 0.52) return T('j2', tone === TONE_L ? TONE_B : TONE_D);
        return T('sock', tone);
      }, far);
      // chuteira: fecho convexo de pontos 3D do pé (calcanhar → bico), projetados
      const fa = lg.fa * RAD;
      const Fv = [Math.sin(fa), Math.cos(fa)];
      const Uv = [Math.cos(fa), -Math.sin(fa)];
      const P3 = (bf, bu, br) => proj([lg.ank[0] + Fv[0] * bf + Uv[0] * bu, lg.ank[1] + Fv[1] * bf + Uv[1] * bu, lg.ank[2] + br * lg.side]);
      const heel = outfit === 'office';
      // (meia-largura grande: de frente a chuteira é um pouco mais larga que a canela)
      const BOOT = [
        [-1.25, -1.8, 1.55], [0.3, -1.8, 1.85], [1.9, -1.8, 1.8], [2.9, -1.72, 1.35], [3.35, -1.55, 0.6],
        [-1.2, 0.15, 1.4], [0.5, 0.25, 1.5], [1.5, -0.55, 1.6], [2.6, -1.0, 1.2], [3.2, -1.25, 0.45]
      ];
      const bp = [];
      const bk = STYLE.bootK;
      BOOT.forEach(([bf, bu, br]) => {
        bp.push(P3(bf * bk, bu * bk, br * bk));
        bp.push(P3(bf * bk, bu * bk, -br * bk));
      });
      if (heel) bp.push(P3(-1.0, -2.6, 0.3), P3(-1.0, -2.6, -0.3));
      const bh = hull(bp);
      const zB = A[2] + Math.cos(fa) * 0 - 0.3;
      const sole = [P3(-1.25 * bk, -1.8 * bk, 0), P3(3.35 * bk, -1.6 * bk, 0)];
      const sdx = sole[1][0] - sole[0][0];
      const sdy = sole[1][1] - sole[0][1];
      const sL = Math.hypot(sdx, sdy);
      const studs = kit ? (k === 'R' ? 'studF' : 'studB') : null;
      let sMinY = Infinity;
      bh.forEach((p) => {
        sMinY = Math.min(sMinY, p[1]);
      });
      const top = sMinY;
      const bot = Math.max(...bh.map((p) => p[1]));
      parts.push({
        pts: bh,
        z: zB,
        g: gid,
        line: true,
        sh: (x, y) => {
          // distância até a linha da sola (de lado) ou até o fundo (de frente)
          let dSole;
          if (sL > 1.2) {
            const nx = -sdy / sL;
            const ny = sdx / sL;
            dSole = Math.abs((x - sole[0][0]) * nx + (y - sole[0][1]) * ny);
          } else dSole = bot - y;
          if (dSole < 0.55 && y > top + 0.8) return studs ? T(studs, TONE_B) : T('boot', TONE_E);
          if (y < top + 0.75 && x < (sole[0][0] + sole[1][0]) / 2 + 0.6) return T('boot', Math.min(3, TONE_L + far));
          return T('boot', Math.min(3, TONE_B + far));
        }
      });
      toes[k] = P3(3.4, -1.0, 0);
    };

    // ---------- braços
    const armGeo = (side, prm) => {
      const [fl, el = 10, ab = 8, ab2] = prm;
      const sh = leanPt(0, -7.75, 7.15 * side);
      const d1 = dirV(fl, ab, side);
      const elb = add(sh, d1, 2.75 * STYLE.armK);
      const d2 = dirV(fl + el, ab2 === undefined ? ab : ab2, side);
      const wr = add(elb, d2, 2.25 * STYLE.armK);
      const hand = add(wr, d2, 0.8);
      return { sh, elb, wr, hand, side };
    };
    const arms = { R: armGeo(1, AR), L: armGeo(-1, AL) };
    const addArm = (k, gid) => {
      const am = arms[k];
      const far = farShift(am.side);
      const S = proj(am.sh);
      const E = proj(am.elb);
      const Wr = proj(am.wr);
      const Hd = proj(am.hand);
      const bias = view === 'side' ? 0 : 0.6;
      const zU = (S[2] + E[2]) / 2 + bias;
      const zF = (E[2] + Wr[2]) / 2 + bias + 0.02;
      const sleeve = kit ? 'therm' : 'cloth';
      const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      const wraps = acc.includes('hand_wraps');
      const gk = acc.includes('gk_gloves');
      const pg = acc.includes('player_gloves');
      const ak = STYLE.limbK;
      limb(S, E, 1.45 * ak, 1.3 * ak, zU, gid, (t, tone) => T(sleeve, tone), far);
      // braçadeira de capitão (braço esquerdo): anel vermelho mais grosso que a manga,
      // com o "C" branco no meio (3 x 3 px)
      if (k === 'L' && acc.includes('captain_armband')) {
        const B0 = lerp(S, E, 0.4);
        const B1 = lerp(S, E, 0.82);
        const cx = (B0[0] + B1[0]) / 2;
        const cyy = (B0[1] + B1[1]) / 2;
        limb(B0, B1, 1.62 * ak, 1.5 * ak, zU + 0.01, gid, (t, tone) => T('red', tone), far);
        const bandPart = parts[parts.length - 1];
        const base = bandPart.sh;
        bandPart.sh = (x, y) => {
          const px = Math.round((x - cx) * PX);
          const py = Math.round((y - cyy) * PX);
          const c = py === -1 || py === 1 ? px >= -1 && px <= 1 : py === 0 && px === -1;
          return c && !far ? T('white', TONE_L) : base(x, y);
        };
      }
      limb(E, Wr, 1.25 * ak, 1.1 * ak, zF, gid, (t, tone) => {
        if (!kit) return t > 0.8 ? T('white', tone) : T('cloth', tone);
        // bandagem: voltas de pano (uma volta clara, outra na sombra)
        if (wraps && t > 0.45) return T('wrap', Math.floor(t * 9) % 2 ? Math.min(3, tone + 1) : tone);
        return T('skin', tone);
      }, far);
      // munhequeira / punho da luva: anel mais grosso que o antebraço, logo antes da mão
      // (a mão cobria a munhequeira fininha, que sumia)
      const cuff = pg ? 'pcuff' : gk ? 'gkstrap' : acc.includes('wristband') ? 'wrist' : null;
      if (cuff && kit) {
        limb(lerp(E, Wr, 0.42), lerp(E, Wr, 0.92), 1.42 * ak, 1.36 * ak, zF + 0.02, gid, (t, tone) => {
          // listra clara no meio da munhequeira (lê em cima da manga escura)
          if (cuff === 'wrist' && t > 0.34 && t < 0.66) return T('white', tone === TONE_D ? TONE_B : TONE_L);
          return T(cuff, tone);
        }, far);
      }
      const glove = gk ? 'gkglove' : pg ? 'pglove' : wraps ? 'wrap' : 'skin';
      const hr = (gk ? 1.65 : pg ? 1.4 : 1.3) * ak;
      limb(Hd, Hd, hr, hr, zF + 0.04, gid, (t, tone) => T(glove, tone), far);
      // bandagem também na mão: voltas na horizontal (uma linha de sombra a cada 3 px)
      if (wraps) {
        const handPart = parts[parts.length - 1];
        const base = handPart.sh;
        handPart.sh = (x, y) => (Math.floor((y - Hd[1]) * PX + 9) % 3 === 0 ? T('wrap', TONE_D) : base(x, y));
      }
    };

    // ---------- asas de osso (atrás de tudo)
    if (acc.includes('bone_wings')) {
      // asa de osso: um osso grosso sai das costas até a "junta", e dali 4 ossos
      // finos abrem em leque, afinando na ponta. Bate de leve com o tempo.
      const fl = Math.sin((o.frame || 0) * 0.2) * 0.5;
      [-1, 1].forEach((sd) => {
        const P = (f, u, r) => proj(leanPt(f, u, r * sd));
        const far = view === 'side' && sd * sg < 0 ? 1 : 0;
        const A0 = P(-2.4, -6.4, 2.4);
        const A1 = P(-3.0, -9.6 - fl, 6.6);
        const z = (A0[2] + A1[2]) / 2;
        const bone = (t, tone) => T('bone', tone);
        limb(A0, A1, 1.0, 0.8, z, 6, bone, far);
        // 3 "dedos" de osso, cada um com uma junta no meio (falange), afinando na ponta
        [[-3.3, -14.6 - fl * 1.4, 9.0], [-3.4, -12.2 - fl * 1.2, 11.8], [-3.3, -8.6 - fl * 0.8, 12.6]].forEach(([f, u, r]) => {
          const mid = P(-3.15, (-9.6 - fl + u) / 2, (6.6 + r) / 2);
          const tip = P(f, u, r);
          limb(A1, mid, 0.72, 0.58, z - 0.01, 6, bone, far);
          limb(mid, tip, 0.58, 0.3, z - 0.02, 6, bone, far);
          limb(mid, mid, 0.72, 0.72, z, 6, bone, far);
        });
        // juntas: bolinha na base da asa e no "cotovelo"
        limb(A1, A1, 1.05, 1.05, z + 0.01, 6, bone, far);
        limb(A0, A0, 0.95, 0.95, z + 0.01, 6, bone, far);
      });
    }

    addLeg('R', 2);
    addLeg('L', 3);
    addArm('R', 4);
    addArm('L', 5);

    // ---------- cabeça (cabelo atrasa 1 px no movimento: "overlap")
    profMark('prep');
    const neck = proj(leanPt(0, -9.0, 0));
    const hd = pose.head || [0, 0, 0];
    const fl = { acc, blink: !!o.blink, aura: !!o.showAura, auraColor: o.auraColor, sweat: (pose.fx || []).includes('sweat'), noTrail: !!o.noTrail };
    const expr = o.expr !== undefined && o.expr !== null ? o.expr : pose.expr || null;
    // de bruços (caído pra frente) a cara vai pro chão: aparece a nuca
    const prone = view === 'side' && (pose.roll || 0) >= 75;
    const hv = Math.abs(yaw) > 150 || prone ? 'back' : view === 'side' ? 'side' : 'front';
    const hl = headLayers(cd, hv, sg, expr === 'normal' ? null : expr, fl);
    const hairD = pose.hair || [0, 0];
    const hcol = new Uint32Array(HW * HH);
    // alfa 0xfe = pixel comum; 0xfd = contorno do próprio cabelo (não ganha contorno de novo)
    for (let i = 0; i < hcol.length; i++) if (hl.face.cls[i]) hcol[i] = ((hl.face.col[i] & 0x00ffffff) | 0xfe000000) >>> 0;
    const hdx = Math.round(hairD[0] * sg);
    const hdy = Math.round(hairD[1]);
    for (let yy = 0; yy < HH; yy++) {
      const sy2 = yy - hdy;
      if (sy2 < 0 || sy2 >= HH) continue;
      for (let xx = 0; xx < HW; xx++) {
        const sx2 = xx - hdx;
        if (sx2 < 0 || sx2 >= HW) continue;
        const j = sy2 * HW + sx2;
        if (!hl.hair.cls[j]) continue;
        hcol[yy * HW + xx] = ((hl.hair.col[j] & 0x00ffffff) | (hl.hair.cls[j] === 2 ? 0xfd000000 : 0xfe000000)) >>> 0;
      }
    }
    const tilt = roll + (hd[0] || 0) * sg;
    let head = { data: hcol, w: HW, h: HH, ax: HEAD_AX, ay: HEAD_AY };
    if (Math.abs(tilt) > 0.5) head = rotSprite(hcol, HW, HH, tilt, HEAD_AX, HEAD_AY);
    const hx = Math.round((neck[0] + (hd[1] || 0) * sg - X0) * PX) - head.ax;
    const hy = Math.round((neck[1] + (hd[2] || 0) - Y0) * PX) - head.ay;
    parts.push({ img: head, x: hx, y: hy, z: 0.3 + (view === 'side' ? 0 : 0), g: 7 });

    // ================================================================ rasterização
    profMark('head');
    const N = FW * FH;
    const col = new Uint32Array(N);
    const cls = new Uint8Array(N);
    const grp = new Uint8Array(N);
    const dep = new Float32Array(N);
    const mat = new Int16Array(N).fill(-1);
    // área ocupada pelo boneco: as passadas de acabamento só percorrem ela (+ margem),
    // não o quadro inteiro (o boneco ocupa ~1/4 do quadro)
    let bR0 = FH, bR1 = -1, bC0 = FW, bC1 = -1;
    const OUTC = STYLE.outline ? pack(hexRgb(STYLE.outline)) : 0;
    const grow = (r, c) => {
      if (r < bR0) bR0 = r;
      if (r > bR1) bR1 = r;
      if (c < bC0) bC0 = c;
      if (c > bC1) bC1 = c;
    };
    parts.sort((a, b) => a.z - b.z);
    parts.forEach((pt) => {
      if (pt.img) {
        const im = pt.img;
        for (let yy = 0; yy < im.h; yy++) {
          const r = pt.y + yy;
          if (r < 0 || r >= FH) continue;
          for (let xx = 0; xx < im.w; xx++) {
            const v = im.data[yy * im.w + xx];
            if (!v) continue;
            const c = pt.x + xx;
            if (c < 0 || c >= FW) continue;
            const i = r * FW + c;
            const a = v >>> 24;
            // contorno do cabelo: no estilo de contorno único ele usa a mesma cor escura
            col[i] = a === 0xfd && OUTC ? OUTC : (v | 0xff000000) >>> 0;
            cls[i] = a === 0xfd ? 2 : 1;
            grp[i] = pt.g;
            dep[i] = pt.z;
            mat[i] = 900;
            grow(r, c);
          }
        }
        return;
      }
      const pts = pt.pts;
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (const p of pts) {
        if (p[0] < x0) x0 = p[0];
        if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1];
        if (p[1] > y1) y1 = p[1];
      }
      const c0 = Math.max(0, Math.floor((x0 - X0) * PX));
      const c1 = Math.min(FW - 1, Math.ceil((x1 - X0) * PX));
      const r0 = Math.max(0, Math.floor((y0 - Y0) * PX));
      const r1 = Math.min(FH - 1, Math.ceil((y1 - Y0) * PX));
      const n = pts.length;
      const xs = [];
      for (let r = r0; r <= r1; r++) {
        const wy = Y0 + (r + 0.5) / PX;
        xs.length = 0;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const yi = pts[i][1];
          const yj = pts[j][1];
          if (yi > wy !== yj > wy) xs.push(pts[i][0] + ((wy - yi) * (pts[j][0] - pts[i][0])) / (yj - yi));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const ca = Math.max(c0, Math.ceil((xs[k] - X0) * PX - 0.5));
          const cb = Math.min(c1, Math.floor((xs[k + 1] - X0) * PX - 0.5));
          for (let c = ca; c <= cb; c++) {
            const v = pt.sh(X0 + (c + 0.5) / PX, wy);
            if (v === null || v === undefined) continue;
            const i = r * FW + c;
            const m = v >> 2;
            col[i] = mats[m][v & 3];
            cls[i] = 1;
            grp[i] = pt.g;
            dep[i] = pt.z;
            mat[i] = m;
            grow(r, c);
          }
        }
      }
    });
    // margem de 2 px (o contorno fica 1 px pra fora) e dentro do quadro
    const aR0 = Math.max(1, bR0 - 2);
    const aR1 = Math.min(FH - 2, bR1 + 2);
    const aC0 = Math.max(1, bC0 - 2);
    const aC1 = Math.min(FW - 2, bC1 + 2);

    // ---------- limpeza: tira pixel solto e fecha furinho de 1 px
    profMark('raster');
    const filled = (i) => cls[i] !== 0;
    for (let r = aR0; r <= aR1; r++) {
      for (let c = aC0; c <= aC1; c++) {
        const i = r * FW + c;
        const n4 = filled(i - 1) + filled(i + 1) + filled(i - FW) + filled(i + FW);
        if (cls[i] && n4 === 0) cls[i] = 0;
        else if (!cls[i] && n4 === 4) {
          col[i] = col[i - FW];
          cls[i] = cls[i - FW];
          grp[i] = grp[i - FW];
          dep[i] = dep[i - FW];
          mat[i] = mat[i - FW];
        }
      }
    }

    // ---------- sombra projetada (luz de cima à esquerda): a peça da frente escurece 1 px
    // da de trás logo abaixo/à direita dela (cabeça → gola, calção → coxa, braço → tronco)
    const shade1 = new Uint8Array(N);
    // (sem criar lista por pixel: os dois vizinhos testados direto — fica bem mais rápido)
    const shadeBy = (i, j) => cls[j] && grp[j] !== grp[i] && dep[j] > dep[i] + 0.2 && mat[j] !== mat[i];
    for (let r = aR0; r <= aR1; r++) {
      for (let c = aC0; c <= aC1; c++) {
        const i = r * FW + c;
        if (cls[i] !== 1 || mat[i] === 900 || mat[i] < 0) continue;
        if (shadeBy(i, i - FW) || shadeBy(i, i - FW - 1)) shade1[i] = 1;
      }
    }
    for (let i = aR0 * FW; i <= aR1 * FW + FW - 1; i++) {
      if (!shade1[i]) continue;
      const rp = mats[mat[i]];
      const t = rp.indexOf(col[i]);
      col[i] = rp[t < 0 ? TONE_D : Math.min(TONE_E, Math.max(TONE_D, t + 1))];
    }

    // ---------- linha interna: só onde uma peça passa NA FRENTE de outra
    const lineAt = new Uint8Array(N);
    const lineBy = (i, j) => cls[j] && grp[j] !== grp[i] && dep[i] > dep[j] + 0.2 && !(mat[i] === mat[j] && mat[i] !== 900);
    for (let r = aR0; r <= aR1; r++) {
      for (let c = aC0; c <= aC1; c++) {
        const i = r * FW + c;
        if (cls[i] !== 1) continue;
        if (lineBy(i, i - 1) || lineBy(i, i + 1) || lineBy(i, i - FW) || lineBy(i, i + FW)) lineAt[i] = 1;
      }
    }
    for (let i = aR0 * FW; i <= aR1 * FW + FW - 1; i++) if (lineAt[i]) col[i] = selOut(col[i], false, true);

    // ---------- chão: o pé (ou o corpo deitado) encosta na linha do chão
    profMark('passes');
    let maxR = -1;
    for (let r = Math.min(FH - 1, aR1); r >= 0 && maxR < 0; r--) {
      for (let c = aC0 - 1; c <= aC1 + 1; c++) {
        if (cls[r * FW + c]) {
          maxR = r;
          break;
        }
      }
    }
    const shift = (pose.ground === false ? 0 : GROUND_ROW - maxR) - Math.round((pose.air || 0) * PX);

    // ---------- contorno de fora (seletivo) + monta a imagem final já no chão
    const out = new Uint32Array(N);
    const lum = (v) => 0.3 * (v & 255) + 0.59 * ((v >>> 8) & 255) + 0.11 * ((v >>> 16) & 255);
    // (laço sem criar função/lista por pixel; o resultado é o mesmo de antes)
    let best = 0;
    let bestL = Infinity;
    let nFill = 0;
    let nHair = 0;
    const look = (rr, cc, isLit) => {
      if (rr < 0 || rr >= FH || cc < 0 || cc >= FW) return;
      const j = rr * FW + cc;
      const k = cls[j];
      if (!k) return;
      nFill++;
      const v = col[j];
      if (k === 2) {
        nHair++;
        const L = lum(v);
        if (L < bestL) {
          best = v;
          bestL = L;
        }
        return;
      }
      const ov = selOut(v, isLit, false);
      const OL = lum(ov);
      if (OL < bestL) {
        best = ov;
        bestL = OL;
      }
    };
    // só as linhas/colunas onde o boneco (já no chão) está, com 1 px de folga pro contorno
    const oR0 = Math.max(0, aR0 - 1 + shift);
    const oR1 = Math.min(FH - 1, aR1 + 1 + shift);
    for (let r = oR0; r <= oR1; r++) {
      const sr = r - shift;
      for (let c = aC0 - 1; c <= aC1 + 1; c++) {
        const i = r * FW + c;
        if (sr >= 0 && sr < FH && cls[sr * FW + c]) {
          out[i] = col[sr * FW + c];
          continue;
        }
        // vizinhos preenchidos (que não sejam já contorno do cabelo)
        best = 0;
        bestL = Infinity;
        nFill = 0;
        nHair = 0;
        look(sr, c + 1, true); // o vizinho está à direita → este pixel é a borda esquerda (lado da luz)
        look(sr + 1, c, true); // vizinho embaixo → borda de cima (lado da luz)
        look(sr, c - 1, false);
        look(sr - 1, c, false);
        // borda de cabelo já contornada não ganha segundo contorno
        if (best && !(nFill && nFill === nHair)) out[i] = OUTC || best;
      }
    }
    // contorno claro por fora (estilo "adesivo" da referência), se o estilo pedir
    if (STYLE.rim) {
      const rimC = pack(hexRgb(STYLE.rim));
      const rimAt = [];
      for (let r = Math.max(1, oR0 - 1); r <= Math.min(FH - 2, oR1 + 1); r++) {
        for (let c = Math.max(1, aC0 - 2); c <= Math.min(FW - 2, aC1 + 2); c++) {
          const i = r * FW + c;
          if (out[i]) continue;
          if (out[i - 1] || out[i + 1] || out[i - FW] || out[i + FW]) rimAt.push(i);
        }
      }
      rimAt.forEach((i) => (out[i] = rimC));
    }

    // ---------- imagem + efeitos
    profMark('outline');
    const shiftU = shift / PX;
    const toe = toes.R ? [toes.R[0], toes.R[1] + shiftU] : null;
    // pontos do corpo já no chão (unidades da caixa): pras cenas saberem onde fica o quê
    const anchors = { hip: hipY + shiftU, neck: neck[1] + shiftU, shoulder: proj(leanPt(0, -7.75, 0))[1] + shiftU };
    // sem efeito nenhum e no jogo (recorte): monta direto o canvas pequeno, do tamanho
    // do boneco (não cria o quadro inteiro pra depois reler e recortar)
    const fxUsed = !!(pose.swoosh || (pose.fx && pose.fx.length) || pose.ball || pose.ballAtToe);
    if (crop && !fxUsed) {
      let bx0 = FW, by0 = FH, bx1 = -1, by1 = -1;
      for (let r = Math.max(0, oR0 - 1); r <= Math.min(FH - 1, oR1 + 1); r++) {
        for (let c = Math.max(0, aC0 - 2); c <= Math.min(FW - 1, aC1 + 2); c++) {
          if (!out[r * FW + c]) continue;
          if (c < bx0) bx0 = c;
          if (c > bx1) bx1 = c;
          if (r < by0) by0 = r;
          if (r > by1) by1 = r;
        }
      }
      if (bx1 >= 0) {
        const w = bx1 - bx0 + 1;
        const h = by1 - by0 + 1;
        const small = document.createElement('canvas');
        small.width = w;
        small.height = h;
        const sg2 = small.getContext('2d');
        const im2 = sg2.createImageData(w, h);
        const d2 = new Uint32Array(im2.data.buffer);
        for (let r = 0; r < h; r++) d2.set(out.subarray((by0 + r) * FW + bx0, (by0 + r) * FW + bx0 + w), r * w);
        sg2.putImageData(im2, 0, 0);
        profMark('canvas');
        return { cv: small, ox: bx0, oy: by0, shiftU, toe, anchors };
      }
    }
    const cv = document.createElement('canvas');
    cv.width = FW;
    cv.height = FH;
    const g = cv.getContext('2d');
    const img = g.createImageData(FW, FH);
    new Uint32Array(img.data.buffer).set(out);
    g.putImageData(img, 0, 0);
    // rastro do chute: arco que a ponta do pé percorreu (do recuo até o impacto)
    let swoosh = null;
    if (pose.swoosh) {
      swoosh = [];
      const [a0, a1] = pose.swoosh;
      const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 2.5));
      for (let i = 0; i <= n; i++) {
        const a = (a0 + ((a1 - a0) * i) / n) * RAD;
        const p = proj([Math.sin(a) * 7.6, Math.cos(a) * 7.6, 3.25]);
        swoosh.push([p[0], p[1] + shiftU, i / n]);
      }
    }
    const tr = tilt * RAD;
    const headC = [neck[0] + Math.sin(tr) * 5.2, neck[1] - Math.cos(tr) * 5.2 + shiftU];
    drawFx(g, pose, o, shiftU, toe, sg, { swoosh, headC });
    profMark('canvas');
    return { cv, shiftU, toe, anchors };
  }

  // ================================================================ efeitos (camada separada)
  function px(g, x, y, w, h, c) {
    g.fillStyle = c;
    g.fillRect(Math.round((x - X0) * PX), Math.round((y - Y0) * PX), Math.max(1, Math.round(w * PX)), Math.max(1, Math.round(h * PX)));
  }
  // nuvens de poeira desenhadas à mão (luz em cima à esquerda, sombra embaixo)
  const PUFFS = {
    S: ['.ab.', 'abbc', '.cd.'],
    M: ['..ab..', '.abbbc', 'abbbcc', '.ccdd.'],
    L: ['...aab..', '.aabbbc.', 'abbbbbcc', 'bbbbcccd', '.cccdd..'],
    X: ['....aab...', '..aabbbbc.', '.abbbbbbcc', 'abbbbbcccd', 'bbbbcccddd', '.cccdddd..']
  };
  const PUFF_C = { a: '#fbf8ef', b: '#e8e2d2', c: '#c9c1ad', d: '#a39a84' };
  function puff(g, x, y, size, flip) {
    const m = PUFFS[size] || PUFFS.S;
    const w = m[0].length;
    const x0 = Math.round((x - X0) * PX - w / 2);
    const y0 = Math.round((y - Y0) * PX) - m.length;
    m.forEach((row, yy) => {
      for (let xx = 0; xx < w; xx++) {
        const ch = row[flip ? w - 1 - xx : xx];
        if (ch === '.' || ch === ' ') continue;
        g.fillStyle = PUFF_C[ch];
        g.fillRect(x0 + xx, y0 + yy, 1, 1);
      }
    });
  }
  function drawFx(g, pose, o, shiftU, toe, sg, ex = {}) {
    const fx = pose.fx || [];
    if (ex.swoosh) {
      // smear: faixa clara que engrossa até o pé, desenhada ATRÁS do boneco
      g.globalCompositeOperation = 'destination-over';
      ex.swoosh.forEach(([x, y, t]) => {
        const w = 0.5 + t * 1.6;
        px(g, x - w / 2, y - w / 2, w, w, t > 0.55 ? '#ffffff' : '#e0f2fe');
        if (t > 0.25) px(g, x - w / 2 - 0.5, y + w / 2 - 0.5, 0.5, 0.5, '#7dd3fc');
      });
      g.globalCompositeOperation = 'source-over';
    }
    if (!fx.length && !pose.ball && !pose.ballAtToe) return;
    const F = o.frame || 0;
    const gy = GROUND;
    const back = (x) => (sg > 0 ? x : 36 - x);
    const fl = sg < 0;
    if (fx.includes('dustS')) [[12.2, 'M', 0], [9.6, 'S', -0.5]].forEach(([x, s, dy]) => puff(g, back(x), gy + dy + 0.5, s, fl));
    if (fx.includes('dustL')) [[14, 'X', 0], [10.2, 'L', -0.5], [7, 'M', -1], [4.6, 'S', -1.5]].forEach(([x, s, dy]) => puff(g, back(x), gy + dy + 0.5, s, fl));
    if (fx.includes('dustTrail')) for (let i = 0; i < 5; i++) px(g, back(3 + i * 1.7), gy - 0.5 - (i % 2) * 0.5, i % 2 ? 0.5 : 1, 0.5, i % 2 ? '#c9c1ad' : '#e8e2d2');
    if (fx.includes('speed')) {
      [[1, 14, 5], [-1, 18.5, 6.5], [2, 23, 4]].forEach(([x, y, w]) => {
        px(g, back(x) - (sg > 0 ? 0 : w), y + shiftU, w, 0.5, '#bfdbfe');
        px(g, back(x + w + 0.5) - (sg > 0 ? 0 : 1), y + shiftU, 1, 0.5, '#e0f2fe');
      });
    }
    if (fx.includes('impact') && toe) {
      const [ix, iy] = [toe[0] + 1.4 * sg, toe[1] - 0.4];
      [[-2.5, 0, 1.5, 0.5], [1.5, 0, 1.5, 0.5], [0, -2.5, 0.5, 1.5], [0, 1.5, 0.5, 1.5]].forEach(([x, y, w, h]) => px(g, ix + x, iy + y, w, h, '#fde047'));
      [[-1.5, -1.5], [1, 1], [1, -1.5], [-1.5, 1]].forEach(([x, y]) => px(g, ix + x, iy + y, 0.5, 0.5, '#fef9c3'));
      px(g, ix - 0.5, iy - 0.5, 1, 1, '#ffffff');
    }
    if (fx.includes('stars') && ex.headC) {
      // estrelinhas girando em volta da cabeça (tontura)
      const [hx, hy] = ex.headC;
      [0, 1, 2].forEach((i) => {
        const a = ((o.frame || 0) * 0.15 + (i * Math.PI * 2) / 3);
        const x = hx + Math.cos(a) * 6.5;
        const y = hy - 7.5 + Math.sin(a) * 1.6;
        const c = i === 0 ? '#fde047' : '#facc15';
        px(g, x - 0.25, y - 1, 0.5, 2, c);
        px(g, x - 1, y - 0.25, 2, 0.5, c);
        px(g, x - 0.25, y - 0.25, 0.5, 0.5, '#ffffff');
      });
    }
    if (fx.includes('sparkle')) {
      [[5, 6], [31, 3], [32.5, 13]].forEach(([x, y], i) => {
        const c = i % 2 ? '#fde047' : '#ffffff';
        px(g, x, y - 1, 0.5, 2.5, c);
        px(g, x - 1, y, 2.5, 0.5, c);
      });
    }
    let ball = pose.ball ? [back(pose.ball[0]), pose.ball[1]] : null;
    if (pose.ballAtToe && toe) ball = [toe[0] + 1.5 * sg, toe[1] + 0.3];
    if (ball) {
      if (pose.ballFx) {
        px(g, ball[0] - 7 * sg - (sg > 0 ? 0 : 5), ball[1] - 0.5, 5, 0.5, '#bfdbfe');
        px(g, ball[0] - 6 * sg - (sg > 0 ? 0 : 3.5), ball[1] + 1, 3.5, 0.5, '#e0f2fe');
      }
      drawBall(g, (ball[0] - X0) * PX, (ball[1] - Y0) * PX, F);
    }
  }

  // Bola em pixel art (diâmetro 7 px) girando em 4 quadros
  const BALL = [
    ['..ooo..', '.oWWdo.', 'oWkkWWo', 'oWkkWdo', 'oWWWddo', '.odddo.', '..ooo..'],
    ['..ooo..', '.oWWWo.', 'oWWkkWo', 'okWkkdo', 'oWWWddo', '.odkdo.', '..ooo..'],
    ['..ooo..', '.okWWo.', 'oWWWWko', 'oWWkkdo', 'oWkkddo', '.odddo.', '..ooo..'],
    ['..ooo..', '.oWWko.', 'okWWWWo', 'okkWWdo', 'oWWWkdo', '.odddo.', '..ooo..']
  ];
  const BALL_C = { o: '#0a0f1c', W: '#f8fafc', d: '#cbd5e1', k: '#1f2937' };
  function drawBall(g, cx, cy, frame) {
    const m = BALL[Math.floor(frame / 4) % 4];
    const x0 = Math.round(cx) - 3;
    const y0 = Math.round(cy) - 3;
    m.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        g.fillStyle = BALL_C[ch];
        g.fillRect(x0 + x, y0 + y, 1, 1);
      });
    });
  }

  // ================================================================ cache + desenho
  const CACHE = new Map();
  let cacheBytes = 0;
  const CACHE_MAX = 28 * 1024 * 1024;
  const lookKey = (cd) => [cd.id || cd.name, cd.skinColor, cd.hairStyle, cd.hairColor, cd.hairSecondary, cd.eyeColor, cd.eyeStyle, cd.jerseyPrimary, cd.jerseySecondary, cd.outfit, cd.clothesColor, cd.hat, cd.glasses, cd.angry, cd.mouth, cd.number].join('|');

  // recorta o quadro no tamanho do boneco (no jogo: ~1/3 da memória de um quadro inteiro)
  function cropFrame(f) {
    const g = f.cv.getContext('2d');
    const d = new Uint32Array(g.getImageData(0, 0, FW, FH).data.buffer);
    let x0 = FW, y0 = FH, x1 = -1, y1 = -1;
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < FW; x++) {
        if (!d[y * FW + x]) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return f;
    const cv = document.createElement('canvas');
    cv.width = x1 - x0 + 1;
    cv.height = y1 - y0 + 1;
    cv.getContext('2d').drawImage(f.cv, x0, y0, cv.width, cv.height, 0, 0, cv.width, cv.height);
    return Object.assign({}, f, { cv, ox: x0, oy: y0 });
  }

  const frameKey = (cd, pose, o) => lookKey(cd) + '#' + JSON.stringify(pose) + '#' + [o.view, o.left ? 1 : 0, o.mirror ? 1 : 0, o.expr, (o.accessories || []).join(','), o.shirtNumber, o.blink ? 1 : 0, o.showAura ? o.auraColor || 1 : 0, o.noTrail ? 1 : 0, pose.ball || pose.ballAtToe || (pose.fx || []).includes('stars') ? (o.frame || 0) % 16 : 0].join('|');

  const SpriteRig = {
    PX,
    X0,
    Y0,
    FW,
    FH,
    GROUND_ROW,
    ramp,
    drawBall,
    lookKey,
    // true no jogo: guarda o quadro recortado (o laboratório usa o quadro inteiro)
    cropFrames: false,
    stats: { built: 0, buildMs: 0 },
    prof: PROF,
    clearCache() {
      CACHE.clear();
      HEADS.clear();
      cacheBytes = 0;
    },
    // muda as proporções/estilo do corpo (e limpa o cache, que foi montado no estilo antigo)
    setStyle(s) {
      Object.assign(STYLE, s);
      this.clearCache();
    },
    style: STYLE,
    cacheInfo() {
      return { frames: CACHE.size, mb: +(cacheBytes / 1048576).toFixed(1), heads: HEADS.size };
    },
    // quadro já pronto no cache (ou null), sem montar
    peek(cd, pose, o = {}) {
      return CACHE.get(frameKey(cd, pose, o)) || null;
    },
    // Quadro pronto (canvas na resolução da arte), com cache
    frame(cd, pose, o = {}) {
      const key = frameKey(cd, pose, o);
      let f = CACHE.get(key);
      if (f) {
        CACHE.delete(key);
        CACHE.set(key, f);
        return f;
      }
      const t0 = performance.now();
      f = buildFrame(cd, pose, o, this.cropFrames);
      if (this.cropFrames && f.ox === undefined) f = cropFrame(f);
      this.stats.built++;
      this.stats.buildMs += performance.now() - t0;
      f.bytes = f.cv.width * f.cv.height * 4;
      CACHE.set(key, f);
      cacheBytes += f.bytes;
      while (cacheBytes > CACHE_MAX && CACHE.size) {
        const k0 = CACHE.keys().next().value;
        cacheBytes -= CACHE.get(k0).bytes || FW * FH * 4;
        CACHE.delete(k0);
      }
      return f;
    },
    // Desenha um quadro pronto na caixa W x H do jeito do drawCharacterSprite (pé no
    // mesmo lugar). Ampliação: múltiplo inteiro quando a caixa está perto de um
    // (pixel certinho); caixa menor que a arte é reduzida suavizando (sem perder pixel).
    put(ctx, f, boxW, boxH) {
      const s = Math.min(boxW, boxH) / 36;
      let k = s / PX;
      if (k >= 1 && Math.abs(k - Math.round(k)) < 0.2) k = Math.round(k);
      const ax = 18 * s - (18 - X0) * PX * k + (f.ox || 0) * k;
      const ay = GROUND * s - (GROUND - Y0) * PX * k + (f.oy || 0) * k;
      ctx.save();
      // escala real na tela (a partida pode encolher o canvas inteiro com setTransform no
      // celular): reduzindo sem suavizar, o pixel art fica com pixels de larguras desiguais
      let ts = 1;
      if (k >= 1 && ctx.getTransform) {
        const m = ctx.getTransform();
        ts = Math.hypot(m.a, m.b);
      }
      ctx.imageSmoothingEnabled = k * ts < 0.99;
      // 'medium' é bem mais leve que 'high' e na redução de 0,5–1x fica igual
      if (k * ts < 0.99) ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(f.cv, Math.round(ax), Math.round(ay), f.cv.width * k, f.cv.height * k);
      ctx.restore();
    },
    draw(ctx, cd, boxW, boxH, pose, o = {}) {
      const f = this.frame(cd, pose, o);
      this.put(ctx, f, boxW, boxH);
      return f;
    }
  };
  PR.SpriteRig = SpriteRig;
})();
