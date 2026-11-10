// ============================================================================
// CUTSCENES EM 3D — 1ª SELEÇÃO (js/cine_selecao1.js refeito no 3D)
// Kit: js/cine3d_kit.js. Mesmos planos, tempos e legendas da versão 2D.
//   barou_king / barou_king_win • ego_victory • kuon_betrayal • chigiri_sprint
// Tudo no campo do prédio (o Time Z ataca o gol norte), no vestiário e no corredor
// do treino. Closes de olho, a mão e as correntes ficam no overlay em pixel art 2D.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;
  const PI = Math.PI;
  const seg = (t, a, b) => CE.cineSeg(t, a, b);
  const E = (x) => CE.cineEase(x);
  const EIO = (x) => CE.cineEaseInOut(x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mixc = (a, b, k) => rgb(a).map((v, i) => v + (rgb(b)[i] - v) * Math.max(0, Math.min(1, k)));

  const YOU_C = '#00f5d4';
  const BAROU_C = '#ef4444';
  const CHI_C = '#fb7185';
  const RAICHI_C = '#facc15';
  const KUON_C = '#a5b4fc';
  const BL = { kit: 'blueLock' };
  const KX = { jerseyPrimary: '#111827', jerseySecondary: '#dc2626' };
  const KY = { jerseyPrimary: '#b91c1c', jerseySecondary: '#0a0a0a' };
  const num = () => window.App?.state?.profile?.number || 11;

  // ---------------------------------------------------------------- ajudantes
  // canvas pintado uma vez (decalques no gramado, placar, brilho)
  const paint = (w, h, fn) => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    cv.g = g;
    if (fn) fn(g, w, h);
    return cv;
  };
  const ART = new Map();
  const art = (key, w, h, fn) => {
    let cv = ART.get(key);
    if (!cv) ART.set(key, (cv = paint(w, h, fn)));
    return cv;
  };
  // As bolas e os cones soltos do campo de treino (enfeites do mapa) confundiam os lances:
  // saem do quadro só durante o desenho 3D da cena e voltam logo depois
  const props = (hide) => {
    const L = window.Hub?._3d?.World?.sprites || [];
    L.forEach((s) => {
      if (hide && (s.key === 'ball' || s.key === 'cone') && s.x > 44 && s._hx === undefined) {
        s._hx = s.x;
        s.x += 500;
      } else if (!hide && s._hx !== undefined) {
        s.x = s._hx;
        delete s._hx;
      }
    });
  };
  const restore = () => props(false);
  const semEnfeites = (def) => {
    const sc = def.scene;
    const ov = def.overlay;
    def.scene = function (K, S) {
      sc.call(this, K, S);
      props(true);
      // (o desenho 3D é síncrono: devolve tudo logo depois, mesmo se a placa falhar no meio)
      queueMicrotask(restore);
    };
    def.overlay = function (ctx, S, K) {
      restore();
      if (ov) ov.call(this, ctx, S, K);
    };
    return def;
  };
  // Olhos de um ator na tela: centro entre os olhos e px por unidade da pixel art
  const eyesAt = (K, x, y, z = 0, k = 0.9) => {
    const u = (2 * k) / 66;
    const h = z + (31.2 - SPRITE_MAPY(10.1)) * u;
    const a = K.screen(x, h, y);
    const b = K.screen(x, h + u, y);
    if (!a || !b) return null;
    return { x: a.x, y: a.y, u: Math.abs(a.y - b.y) };
  };
  // Faixa de close nos olhos (pixel art 2D por cima do 3D, como a versão 2D fazia)
  const eyeBand = (ctx, S, cd, o) => {
    const k = o.k ?? 1;
    if (k <= 0 || !cd) return;
    const { W } = S;
    const x0 = o.x0 ?? 14;
    const x1 = o.x1 ?? W - 14;
    const cx = o.cx ?? (x0 + x1) / 2;
    const eyeY = (o.y0 + o.y1) / 2 + (o.dy || 0);
    CE.finPanel(ctx, [[x0, o.y0], [x1, o.y0], [x1, o.y1], [x0, o.y1]], () => {
      ctx.fillStyle = o.bg || '#04112a';
      ctx.fillRect(0, o.y0, W, o.y1 - o.y0);
      const U = CE.wcdEyeBand(ctx, cd, cx, eyeY, o.dw || 1000, { dim: o.dim || 0, dimTint: o.dimTint || '0,0,0' });
      if (o.shade) {
        ctx.fillStyle = o.shade;
        ctx.fillRect(0, o.y0, W, o.y1 - o.y0);
      }
      CE.wcdEyes(ctx, cx, eyeY, U, o.eyes || {});
      if (o.after) o.after(U, eyeY, cx);
    }, { dx: (1 - E(k)) * (o.from === 'left' ? -W : W), border: o.border || '#f8fafc' });
  };
  // Gota de suor escorrendo da têmpora de um ator
  const sweat = (ctx, K, x, y, t, t0, z = 0) => {
    const e = eyesAt(K, x, y, z);
    if (!e || t < t0) return;
    const d = E(seg(t, t0, t0 + 80)) * 2.6 * e.u;
    ctx.fillStyle = 'rgba(186,230,253,0.9)';
    ctx.fillRect(Math.round(e.x + 4.8 * e.u), Math.round(e.y - 2.2 * e.u + d), Math.ceil(e.u * 0.6), Math.ceil(e.u * 0.9));
  };
  // Escrita holográfica no gramado (a versão 2D pintava no campo)
  const pitchWords = (K, lines, box, alpha = 0.8) => {
    const key = 'w|' + lines.map((l) => l.text).join('|');
    const cv = art(key, 512, 256, (g, w, h) => {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      lines.forEach((l) => {
        g.font = `italic 900 ${l.size || 64}px "Segoe UI", sans-serif`;
        g.lineWidth = 6;
        g.strokeStyle = 'rgba(2,6,23,0.6)';
        g.strokeText(l.text, w / 2, h * l.y, w * 0.96);
        g.fillStyle = l.color || '#e0f2fe';
        g.fillText(l.text, w / 2, h * l.y, w * 0.96);
      });
    });
    K.floor({ x0: box[0], y0: box[1], x1: box[2], y1: box[3], z: 0.012, img: cv, em: true, alpha });
  };
  // Mancha de luz no chão (refletor, brilho do Rei)
  const DISC = {};
  const lightDisc = (K, x, y, r, color, alpha) => {
    const cv = DISC[color] || (DISC[color] = paint(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, color);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    }));
    K.floor({ x0: x - r, y0: y - r * 0.8, x1: x + r, y1: y + r * 0.8, z: 0.015, img: cv, em: true, alpha });
  };
  // Câmera de dentro do gol norte (a rede dos lados), olhando para o campo
  const goalCam = (K, lookX, fov = 66, sh = 0, f = 0) => K.cam([53.0 + K.noise(f * 3, 1) * sh, 0.5 + K.noise(f * 3, 2) * sh, 6.2], [lookX, 0.52, 9.6], fov);
  // a bola entrando no gol norte (k 0..1) e parando na rede
  const shotPath = (from, to, k, lift = 0.5) => [lerp(from[0], to[0], k), lerp(from[1], to[1], k), lerp(from[2] || 0.1, to[2], k) + Math.sin(k * PI) * lift * 0.3];
  // Quadro de impacto do chute: anéis e clarão no ponto da bola
  const kickFx = (ctx, S, K, p, t, at, color) => {
    const s = p && K.screen(p[0], p[2], p[1]);
    if (!s) return;
    CE.ptdRings(ctx, s.x, s.y, seg(t, at, at + 30), ['#0a1430', color, '#0a1430'], 340);
  };
  // tremida de câmera na mão
  const shake = (K, f, s, a) => K.noise(f * 3, s) * a;

  // ---------------------------------------------------------------- elenco
  const T = {
    you: ['you', BL],
    bachira: ['bachira', BL],
    kunigami: ['kunigami', BL],
    chigiri: ['chigiri', BL],
    raichi: ['raichi', { kit: 'blueLock', extra: { angry: true } }],
    igarashi: ['igarashi', BL],
    kuon: ['kuon', BL],
    iemon: ['iemon', {}],
    barou: ['barou', { extra: KX }],
    barouA: ['barou', { extra: Object.assign({ angry: true }, KX) }],
    xa: ['gen_teamx_a', {}],
    xb: ['gen_teamx_b', {}],
    xc: ['gen_teamx_c', {}],
    gkx: ['gk_teamx', {}],
    niko: ['niko', { extra: KY }],
    okawa: ['okawa', {}],
    ya: ['gen_teamy_a', {}],
    gky: ['gk_teamy', {}],
    wj: ['wanima_junichi', {}],
    wk: ['wanima_keisuke', {}],
    wjG: ['wanima_junichi', { extra: { mouth: 'grin' } }],
    wkG: ['wanima_keisuke', { extra: { mouth: 'grin' } }],
    wa: ['gen_teamw_a', {}],
    gkw: ['gk_teamw', {}]
  };
  const A = (K, who, o) => {
    const [id, base] = T[who];
    return K.actor(id, Object.assign({}, base, o));
  };
  const cdOf = (K, who) => {
    const [id, base] = T[who];
    return K.charData(id, base);
  };
  // campo de noite (luz dos refletores) e o céu do bunker
  const night = (K, expo = 0.92) => {
    K.expo(expo);
  };

  // ==========================================================================
  // 1. O REI (Time Z x Time X) — derrota e vitória
  // ==========================================================================
  const BAROU_AT = [53, 12.4];
  const barouScene = (K, S, win) => {
    const { t, phase, dur } = S;
    const k = t / dur;
    night(K);
    if (phase === 0) {
      // o campo do Prédio 5: o Time Z de costas, o Time X do outro lado, o Rei no meio
      pitchWords(K, [{ text: 'TIME Z  x  TIME X', y: 0.36, size: 70 }, { text: '1ª SELEÇÃO • JOGO 1', y: 0.72, size: 40, color: '#facc15' }], [49, 13.2, 57, 17.2], 0.7 * seg(t, 8, 40));
      lightDisc(K, BAROU_AT[0], BAROU_AT[1], 1.4, 'rgba(239,68,68,0.9)', 0.55 + 0.15 * Math.sin(t * 0.06));
      A(K, 'gkx', { x: 53, y: 7.0, face: [53, 14], frame: 0 });
      A(K, 'xb', { x: 50.4, y: 10.6, face: [53, 16], frame: 0 });
      A(K, 'xc', { x: 55.8, y: 10.4, face: [53, 16], frame: 0 });
      A(K, 'xa', { x: 51.6, y: 9.6, face: [53, 16], frame: 0 });
      A(K, 'barou', { x: BAROU_AT[0], y: BAROU_AT[1], face: [53, 20], anim: 'idle', frame: 4, light: [1.35, 0.8, 0.75] });
      A(K, 'chigiri', { x: 49.6, y: 16.6, face: [50, 8], frame: 4 });
      A(K, 'kunigami', { x: 56.6, y: 16.8, face: [56, 8], frame: 4 });
      A(K, 'bachira', { x: 54.6, y: 17.4, face: [54.6, 8], frame: 4 });
      A(K, 'you', { x: 51.7, y: 17.6, face: [51.7, 8], frame: 4 });
      const e = EIO(k);
      K.cam([53 + shake(K, S.f * 0.3, 1, 0.01), lerp(1.3, 0.75, e), lerp(21.2, 17.2, e)], [53, lerp(0.45, 0.55, e), BAROU_AT[1]], lerp(46, 28, e));
    } else if (phase === 1) {
      // o Rei atravessa sozinho: três marcadores voando, e o chute no gol sul
      const shootAt = 238;
      const by = lerp(9.6, 18.4, seg(t, 0, shootAt));
      const bx = 53.3 + Math.sin(t * 0.05) * 0.12;
      const anim = t < shootAt - 20 ? 'run' : t < shootAt ? 'windup' : 'shoot';
      A(K, 'barou', { x: bx, y: by, face: [53, 23], anim, frame: anim === 'run' ? S.f : 4, light: [1.25, 0.85, 0.8] });
      [['kuon', 62], ['raichi', 128], ['igarashi', 192]].forEach(([who, at], i) => {
        const u = t - at;
        if (u < -80 || u > 70) return;
        const yAt = lerp(9.6, 18.4, at / shootAt);
        if (u < 0) {
          A(K, who, { x: 53.2 + (i - 1) * 0.15, y: yAt + 0.55 - u * 0.03, face: [bx, by], anim: 'run' });
          return;
        }
        // o tranco: voa para trás (para a esquerda da tela) e some
        const kk = seg(u, 0, 30);
        A(K, who, { x: 53.55 + kk * 0.4, y: yAt + 0.55 - E(kk) * 1.3, z: Math.sin(kk * PI) * (0.4 + i * 0.06), face: [53.6, yAt + 3], anim: 'dive', frame: 4, alpha: 1 - seg(u, 46, 70) });
      });
      if (t < shootAt) K.ball(bx + 0.05, by + 0.32, 0.05 + Math.abs(Math.sin(t * 0.3)) * 0.06);
      else {
        const kb = seg(t, shootAt, shootAt + 22);
        if (kb < 1) K.ball(lerp(bx, 53.6, kb), lerp(by + 0.35, 22.6, kb), 0.1 + kb * 0.65);
      }
      A(K, 'iemon', { x: 53, y: 22.0, face: [53, 14], anim: t > shootAt ? 'dive' : 'idle', frame: 4 });
      const sh = 0.012 + (t > shootAt ? 0.05 * (1 - seg(t, shootAt, shootAt + 24)) : 0);
      K.cam([50.4 + shake(K, S.f, 1, sh), 0.58 + shake(K, S.f, 2, sh), by + 0.4 - (t > shootAt ? seg(t, shootAt, shootAt + 40) * 0.6 : 0)], [bx, 0.5, by + 0.7 + (t > shootAt ? E(seg(t, shootAt, shootAt + 30)) * 1.6 : 0)], 44);
    } else if (phase === 2) {
      // gol, e outro, e mais outro
      if (t < 40) {
        // de dentro do gol sul: a bola na rede, o Iemon atrasado
        const hit = 22;
        const kk = seg(t, 4, hit + 10);
        A(K, 'iemon', { x: lerp(53.0, 52.4, E(kk)), y: 21.7, z: Math.sin(kk * PI) * 0.18, face: [53, 14], anim: kk > 0.2 ? 'dive' : 'idle', frame: 4 });
        const b = t < hit ? shotPath([53.4, 18.0, 0.2], [53.6, 22.75, 0.5], seg(t, 0, hit)) : [53.6, 22.8, Math.max(0.1, 0.5 - (t - hit) * 0.02)];
        K.ball(b[0], b[1], b[2]);
        K.cam([52.3, 0.5, 22.8], [53.4, 0.52, 19.4], 66);
      } else if (t < 92) {
        // o Rei de costas, braço erguido, na luz vermelha
        lightDisc(K, 53, 20.4, 1.2, 'rgba(239,68,68,0.9)', 0.6);
        A(K, 'barou', { x: 53, y: 20.4, face: [53, 23], anim: 'call_pass', light: [1.3, 0.75, 0.72] });
        A(K, 'iemon', { x: 52.4, y: 21.9, face: [53, 14], anim: 'stun' });
        const e = E(seg(t, 40, 92));
        K.cam([53.5, 0.3, lerp(18.4, 18.7, e)], [53, 0.75, 21.2], 42);
      } else if (t < 150) {
        // GOL. GOL. GOL. — a rede de novo e de novo
        const at = t < 110 ? 92 : t < 140 ? 110 : 140;
        const kb = seg(t, at, at + 12);
        const b = shotPath([53.0 + (at % 3) * 0.3, 18.5, 0.2], [52.6 + (at % 2) * 1.0, 22.75, 0.45], kb);
        K.ball(b[0], b[1], b[2]);
        A(K, 'iemon', { x: 53.2, y: 21.8, face: [53, 14], anim: 'dive', frame: 4 });
        K.cam([53, 0.9, 19.0], [53, 0.5, 22.6], 40 - (t - 92) * 0.06);
      } else {
        // o seu rosto: as pupilas encolhendo
        A(K, 'you', { x: 52.4, y: 15.2, face: [52.4, 24], frame: 4, light: [0.55, 0.65, 0.85] });
        A(K, 'bachira', { x: 50.8, y: 13.6, face: [53, 22], frame: 4, light: [0.5, 0.55, 0.7] });
        K.cam([52.5, 0.62, 17.3], [52.4, 0.55, 15.2], 38 - seg(t, 150, 310) * 3);
      }
    } else if (!win && phase === 3) {
      const cut = 170;
      if (t < cut) {
        // "Você não tem talento nenhum." — o Rei em primeiro plano, você lá atrás apagado
        A(K, 'barouA', { x: 52.4, y: 14.0, face: [53.4, 16.2], frame: 4, light: [1.2, 0.72, 0.7] });
        A(K, 'you', { x: 54.4, y: 11.6, face: [53, 14], frame: 4, light: [0.4, 0.45, 0.6] });
        const e = EIO(t / cut);
        K.cam([53.5 + shake(K, S.f * 0.5, 2, 0.006), 0.5, 16.05 - e * 0.12], [53.1, 0.6, 13.2], 40);
      } else {
        // "Some do meu campo." — o ombro do Rei passando por você
        const u = t - cut;
        A(K, 'you', { x: 53.0, y: 13.0, face: [53, 20], frame: 4, light: [0.5, 0.58, 0.8] });
        const sx = lerp(54.6, 51.2, EIO(seg(u, 50, 160)));
        A(K, 'barou', { x: sx, y: 13.95, face: [sx - 2, 13.95], anim: 'run', frame: Math.floor(S.f * 0.5), light: [0.16, 0.08, 0.08] });
        const sh = u >= 34 ? 0.04 * (1 - seg(u, 34, 60)) : 0.004;
        K.cam([53.05 + shake(K, S.f, 1, sh), 0.6 + shake(K, S.f, 2, sh), 15.25], [53.0, 0.56, 13.0], 40);
      }
    } else if (!win && phase === 4) {
      const cut = 150;
      if (t < cut) {
        // você de joelhos no meio do campo; o Time X comemora, o Rei vai embora
        const e = EIO(t / cut);
        pitchWords(K, [{ text: 'FIM DE JOGO', y: 0.3, size: 60, color: '#e0f2fe' }, { text: 'DERROTA', y: 0.72, size: 84, color: '#ef4444' }], [49.5, 9.6, 56.5, 13.0], 0.7);
        lightDisc(K, 53, 15.2, 1.1, 'rgba(186,230,253,0.9)', 0.45);
        ['xa', 'xc', 'xb'].forEach((w, i) => A(K, w, { x: 51.4 + i * 1.6, y: 8.6 + (i % 2) * 0.5, z: Math.abs(Math.sin(t * 0.12 + i)) * 0.15, face: [52 + i, 14], anim: 'celebrate', frame: S.f + i * 7 }));
        A(K, 'barou', { x: 54.2, y: lerp(11.6, 9.4, t / cut), face: [54.6, 6], anim: 'run', frame: Math.floor(S.f * 0.4), light: [1.0, 0.7, 0.7] });
        A(K, 'you', { x: 53, y: 15.2, z: -0.2, face: [53, 6], frame: 4, light: [0.55, 0.62, 0.82] });
        K.cam([53.2, lerp(0.75, 3.4, e), lerp(16.6, 20.4, e)], [53, 0.3, lerp(14.8, 13.4, e)], lerp(40, 46, e));
      } else {
        // a mão tremendo; uma gota cai na palma
        A(K, 'you', { x: 53, y: 15.2, z: -0.2, face: [53, 20], frame: 4, light: [0.42, 0.5, 0.7] });
        K.expo(0.8);
        const e = EIO((t - cut) / (dur - cut));
        K.cam([53.1, 0.48 + e * 0.04, 17.2 - e * 0.15], [53, 0.4, 15.2], 40);
      }
    } else if (win && phase === 3) {
      const shot = 46;
      const cut = 150;
      if (t < shot) {
        // o seu chute: contra-plongée, a bola amassando no pé
        A(K, 'you', { x: 52.6, y: 11.0, face: [53, 6], anim: t < 30 ? 'windup' : 'shoot', frame: 4, light: [1.15, 1.25, 1.3] });
        K.ball(52.75, 10.62, 0.06);
        const sh = t > 30 ? 0.04 * (1 - seg(t, 30, 46)) : 0.006;
        K.cam([53.95 + shake(K, S.f, 1, sh), 0.2, 9.8 + shake(K, S.f, 2, sh)], [52.6, 0.52, 11.0], 42);
      } else if (t < cut) {
        // a rede: o Rei de costas, parado, vendo a bola entrar
        const u = t - shot;
        const hit = 24;
        A(K, 'barou', { x: 53.9, y: 9.6, face: [53.4, 6], frame: 4, light: [0.45, 0.25, 0.25] });
        const kk = seg(u, 4, hit + 12);
        A(K, 'gkx', { x: lerp(53.0, 53.9, E(kk)), y: 7.0, z: Math.sin(kk * PI) * 0.2, face: [53, 14], anim: kk > 0.15 ? 'dive' : 'idle', frame: 4 });
        const b = u < hit ? shotPath([52.7, 10.6, 0.1], [52.35, 6.3, 0.55], E(seg(u, 0, hit))) : [52.35, 6.25, Math.max(0.1, 0.55 - (u - hit) * 0.02)];
        K.ball(b[0], b[1], b[2]);
        const sh = u >= hit ? 0.04 * (1 - seg(u, hit, hit + 30)) : 0;
        K.cam([54.6 + shake(K, S.f, 1, sh), 0.75, 11.4], [53.0, 0.55, 6.6], 42);
      } else {
        // o Rei: a pupila tremendo → o ódio
        const u = t - cut;
        const hate = seg(u, 96, 110);
        A(K, hate > 0 ? 'barouA' : 'barou', { x: 53.4, y: 9.6, face: [53.2, 13], frame: 4, light: [1.15 + hate * 0.3, 0.7, 0.68] });
        const sh = u >= 96 ? 0.04 * (1 - seg(u, 96, 126)) : 0.004;
        K.cam([53.25 + shake(K, S.f, 1, sh), 0.42, 11.55 - EIO(u / 180) * 0.15], [53.4, 0.62, 9.6], 40);
      }
    } else {
      // (vitória) o olho do Rei → você, existindo
      const cut = 170;
      if (t < cut) {
        K.expo(0.8);
        A(K, 'barouA', { x: 53.4, y: 9.6, face: [53.2, 13], frame: 4, light: [1.2, 0.5, 0.5] });
        K.cam([53.3, 0.3, 11.6 - EIO(t / cut) * 0.1], [53.4, 0.7, 9.6], 38);
      } else {
        const u = t - cut;
        A(K, 'you', { x: 52.6, y: 13.2, face: [53, 7], frame: 4, light: [0.8, 1.2, 1.15] });
        A(K, 'barou', { x: 54.2, y: 9.2, face: [52.6, 13.2], frame: 4, light: [0.5, 0.3, 0.3] });
        const e = EIO(u / (dur - cut));
        K.cam([52.4, 0.55, 11.3 + e * 0.1], [52.6, 0.56, 13.2], 40 - e * 3);
      }
    }
  };
  const barouOverlay = (ctx, S, K, win) => {
    const { W, H, t, phase, top, bot } = S;
    if (phase === 0) {
      const p = K.screen(BAROU_AT[0], 0.55, BAROU_AT[1]);
      if (p) CE.cineGlow(ctx, p.x, p.y, 150, 'rgba(239,68,68,0.22)', 0.8 + 0.2 * Math.sin(t * 0.06));
      if (t > 150) {
        const s = K.screen(BAROU_AT[0], 1.08, BAROU_AT[1]);
        if (s) CE.ptdChip(ctx, 'SHOUEI BAROU • "O REI"', s.x, s.y, BAROU_C, seg(t, 150, 166), { size: 15 });
      }
      CE.finKicker(ctx, 40, top + 30, 'BLUE LOCK • PRÉDIO 5 • 1ª SELEÇÃO', seg(t, 6, 48));
      CE.finKicker(ctx, 40, top + 58, 'A ESTREIA: TIME Z x TIME X', seg(t, 34, 84), '#ef4444');
      CE.cineFlash(ctx, W, H, 1 - seg(t, 0, 16), '#000000');
      CE.cineSfx(S, 24, 'apito', () => window.SFX?.whistle?.(1));
    } else if (phase === 1) {
      const shootAt = 238;
      ctx.fillStyle = 'rgba(30,4,4,0.2)';
      ctx.fillRect(0, top, W, bot - top);
      CE.ptdSpeed(ctx, S, t, '#fecaca', 0.2, -1, 46, 16, top + 20, bot - 60, 7);
      [[62, 'DOM!'], [128, 'DOM!!'], [192, 'DOOM!!']].forEach(([at, word], i) => {
        const u = t - at;
        if (u >= 0 && u < 20) CE.cineImpactText(ctx, word, W * 0.62, top + 110 + i * 16, 60 + i * 10, '#fecaca', seg(u, 0, 6), 0, -0.1 + i * 0.08);
        CE.cineSfx(S, at, 'tranco' + i, () => window.SFX?.tackle?.());
      });
      if (t >= shootAt) {
        CE.cineImpactText(ctx, 'BANG!!', W * 0.72, top + 120, 110, '#ef4444', seg(t, shootAt, shootAt + 8), 0, -0.08);
        CE.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, shootAt, shootAt + 10)), '#fee2e2');
      }
      CE.ptdChip(ctx, 'O REI ATRAVESSA O CAMPO SOZINHO', 30, bot - 40, BAROU_C, seg(t, 8, 22) * (1 - seg(t, 220, 236)), { size: 14, left: true });
      CE.cineSfx(S, shootAt, 'chute', () => window.SFX?.kick?.(1));
    } else if (phase === 2) {
      if (t < 40) {
        if (t >= 22) {
          CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, 22, 30)), '#fee2e2');
          CE.zselStamp(ctx, 'GOL.', W * 0.7, bot - 90, 64, '#fecaca', t, 22, 3);
        }
      } else if (t < 92) {
        ctx.fillStyle = 'rgba(40,4,4,0.2)';
        ctx.fillRect(0, top, W, bot - top);
        CE.zselStamp(ctx, 'O REI.', W * 0.76, top + 80, 56, '#fecaca', t, 58, 3);
      } else if (t < 150) {
        ctx.fillStyle = 'rgba(42,5,5,0.35)';
        ctx.fillRect(0, top, W, bot - top);
        [[100, W * 0.2, 46, -0.12], [124, W * 0.46, 62, 0.06], [146, W * 0.74, 82, -0.08]].forEach(([at, x, s, r]) => {
          if (t >= at) CE.cineImpactText(ctx, 'GOL.', x, top + 120 + (s - 46) * 2.2, s, '#fee2e2', seg(t, at, at + 7), 0, r);
        });
      } else {
        const you = cdOf(K, 'you');
        eyeBand(ctx, S, you, { k: seg(t, 156, 170), y0: top + 20, y1: top + 190, dw: 1100, bg: '#0a1530', dim: 0.3, dimTint: '4,10,30', eyes: { ring: '#38bdf8', iris: '#0c4a6e', tiny: true, look: [0, 1, 0, -1][Math.floor(t / 3) % 4] }, after: (U, ey, cx) => {
          const dy = E(seg(t, 170, 240)) * 2.6 * U;
          ctx.fillStyle = 'rgba(186,230,253,0.9)';
          ctx.fillRect(Math.round(cx + 5.4 * U), Math.round(ey - 2.4 * U + dy), Math.ceil(U * 0.5), Math.ceil(U * 0.8));
        } });
      }
      [22, 100, 124, 146].forEach((at, i) => CE.cineSfx(S, at, 'gol' + i, () => window.SFX?.kick?.(i ? 0.6 : 0.9)));
    } else if (!win && phase === 3) {
      const cut = 170;
      if (t < cut) {
        const e = eyesAt(K, 52.4, 14.0);
        if (e) CE.cineGlow(ctx, e.x, e.y, 9 * e.u, 'rgba(239,68,68,0.3)', 0.8);
        CE.zselStamp(ctx, 'VOCÊ NÃO TEM', 1000, top + 70, 38, '#fecaca', t, 34, 2, 480);
        CE.zselStamp(ctx, 'TALENTO NENHUM.', 1000, top + 128, 58, '#ef4444', t, 64, 3, 520);
      } else {
        const u = t - cut;
        sweat(ctx, K, 53.0, 13.0, u, 40);
        CE.cineImpactText(ctx, 'SOME DO MEU CAMPO.', 470, bot - 70, 70, '#ef4444', seg(u, 34, 44), 760, -0.04);
        if (u >= 34) CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(u, 34, 46)), '#fee2e2');
      }
      CE.cineSfx(S, cut + 34, 'some', () => window.SFX?.kick?.(1));
      CE.cineSfx(S, 64, 'talento', () => window.SFX?.kick?.(0.5));
    } else if (!win && phase === 4) {
      const cut = 150;
      if (t < cut) {
        CE.finKicker(ctx, 40, top + 30, 'FIM DE JOGO • TIME Z x TIME X', seg(t, 6, 44));
        CE.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
      } else {
        const u = t - cut;
        CE.cineBokeh(ctx, W, top + 10, top + 160, t, 10, ['rgba(186,230,253,0.32)', 'rgba(56,189,248,0.22)'], 6);
        // a mão, tremendo, em primeiro plano
        const you = cdOf(K, 'you');
        const hv = CE.zselHandCv(you.skinColor || '#f3d1b8');
        const px = 17;
        const tr = 1 - seg(u, 120, 170) * 0.7;
        const hx = 200 + Math.round(K.noise(S.f * 2.7, 3) * 3 * tr);
        const hy = 300 + Math.round(K.noise(S.f * 2.3, 9) * 2 * tr);
        CE.cineGlow(ctx, hx + 150, hy + 180, 260, 'rgba(186,230,253,0.16)');
        CE.wcdPix(ctx, hv, hx, hy, px);
        if (u > 70) {
          const dk = seg(u, 70, 96);
          if (dk < 1) {
            ctx.fillStyle = 'rgba(186,230,253,0.9)';
            ctx.fillRect(hx + 7 * px, lerp(top - 20, hy + 11.5 * px, dk * dk), px * 0.8, px * 1.3);
          } else {
            const a = u - 96;
            ctx.strokeStyle = `rgba(186,230,253,${0.9 * (1 - seg(a, 0, 30))})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(hx + 7.4 * px, hy + 11.8 * px, 8 + a * 2, 2 + a * 0.5, 0, 0, PI * 2);
            ctx.stroke();
          }
        }
        CE.zselStamp(ctx, 'TÃO LONGE...', 960, bot - 70, 56, '#bae6fd', u, 110, 3, 520);
        const fo = seg(u, 150, S.dur - cut);
        if (fo > 0) {
          ctx.fillStyle = `rgba(0,0,0,${fo * 0.85})`;
          ctx.fillRect(0, 0, W, H);
        }
        CE.cineSfx(S, cut + 96, 'gota', () => window.SFX?.blip?.(880));
      }
    } else if (win && phase === 3) {
      const shot = 46;
      const cut = 150;
      if (t < shot) {
        kickFx(ctx, S, K, [52.75, 10.62, 0.06], t, 30, YOU_C);
        if (t >= 30) {
          CE.cineImpactText(ctx, 'AGORA!!', W * 0.76, top + 110, 96, YOU_C, seg(t, 30, 37), 0, -0.1);
          CE.cineFlash(ctx, W, H, 0.7 * (1 - seg(t, 30, 38)));
        }
        CE.cineSfx(S, 30, 'chute', () => window.SFX?.kick?.(1));
      } else if (t < cut) {
        const u = t - shot;
        if (u >= 24) {
          CE.cineFlash(ctx, W, H, 0.7 * (1 - seg(u, 24, 32)));
          CE.cineImpactText(ctx, 'VIRADA!!', W * 0.42, top + 110, 110, YOU_C, seg(u, 24, 34), W * 0.7, -0.05);
        }
        CE.cineSfx(S, shot + 24, 'rede', () => window.SFX?.goal?.(true));
      } else {
        const u = t - cut;
        const hate = seg(u, 96, 110);
        const barou = cdOf(K, hate > 0 ? 'barouA' : 'barou');
        eyeBand(ctx, S, barou, { k: seg(u, 6, 20), y0: bot - 210, y1: bot - 20, dw: 1100, bg: '#1a0505', dim: 0.1, dimTint: '40,4,4', eyes: { ring: '#ef4444', iris: '#450a0a', tiny: true, look: u < 96 ? [0, 1, 0, -1][Math.floor(u / 2) % 4] : 0, angry: hate > 0, glow: 'rgba(239,68,68,0.4)', glowA: hate }, after: (U, ey, cx) => {
          const dy = E(seg(u, 10, 90)) * 3 * U;
          ctx.fillStyle = 'rgba(186,230,253,0.9)';
          ctx.fillRect(Math.round(cx + 7 * U), Math.round(ey - 2 * U + dy), Math.ceil(U * 0.5), Math.ceil(U * 0.8));
        } });
        CE.zselStamp(ctx, 'SORTE DE', 1040, top + 80, 44, '#fecaca', u, 24, 2, 420);
        CE.zselStamp(ctx, 'PRINCIPIANTE.', 1040, top + 140, 54, '#ef4444', u, 40, 2, 440);
        if (u >= 96) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(u, 96, 108)), '#fecaca');
        CE.cineSfx(S, cut + 96, 'odio', () => window.SFX?.tackle?.());
      }
    } else {
      const cut = 170;
      if (t < cut) {
        // o olho do Rei em close extremo
        ctx.fillStyle = 'rgba(8,1,2,0.45)';
        ctx.fillRect(0, top, W, bot - top);
        const barou = cdOf(K, 'barouA');
        eyeBand(ctx, S, barou, { k: seg(t, 0, 12), y0: top + 90, y1: bot - 120, x0: -8, x1: W + 8, dw: 1500, bg: '#080102', dim: 0.1, dimTint: '40,4,4', eyes: { ring: '#ef4444', iris: '#450a0a', angry: true, look: -1, glow: 'rgba(239,68,68,0.5)', shine: 0.7 } });
        CE.zselStamp(ctx, 'O REI NÃO PERDE DUAS VEZES.', 640, bot - 48, 50, '#ef4444', t, 20, 2, W * 0.86);
      } else {
        const u = t - cut;
        CE.cineDust(ctx, W, H, t, 30, 'rgba(165,243,252,0.5)', 11);
        const e = eyesAt(K, 52.6, 13.2);
        if (e) CE.cineGlow(ctx, e.x, e.y, 8 * e.u, 'rgba(0,245,212,0.35)', seg(u, 100, 140));
        // a mão sobe e fecha na frente
        const you = cdOf(K, 'you');
        const hk = E(seg(u, 30, 70));
        CE.wcdPix(ctx, CE.zselHandCv(you.skinColor || '#f3d1b8'), 120, lerp(bot + 40, 300, hk), 15);
        CE.zselStamp(ctx, 'ELE ME OLHOU.', 330, top + 70, 44, '#ccfbf1', u, 10, 2, 520);
        CE.cineImpactText(ctx, 'EU EXISTO AQUI.', 470, bot - 70, 76, YOU_C, seg(u, 130, 140), 820, -0.04);
        if (u >= 130) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(u, 130, 142)), '#ccfbf1');
        CE.cineSfx(S, cut + 130, 'existo', () => window.SFX?.kick?.(1));
      }
    }
  };

  const barouSubs0 = [
    [
      { from: 12, to: 144, who: 'NARRADOR', text: 'Prédio 5. A estreia.', color: '#94a3b8' },
      { from: 148, who: 'SHOUEI BAROU', text: '"Hmph. Plebeus."', color: BAROU_C }
    ],
    [
      { from: 16, to: 160, who: 'SHOUEI BAROU', text: '"Saiam da frente!"', color: BAROU_C },
      { from: 164, who: 'NARRADOR', text: 'Ninguém encosta nele.', color: '#94a3b8' }
    ],
    [
      { from: 8, to: 162, who: 'NARRADOR', text: 'Gol. E outro. E mais outro.', color: '#94a3b8' },
      { from: 164, who: 'SHOUEI BAROU', text: '"É só isso, Time Z?"', color: BAROU_C }
    ]
  ];
  CE.registerCine3D('barou_king', semEnfeites({
    phases: [290, 300, 310, 350, 330],
    music: 'tension',
    title: '👑 O REI',
    tags: ['PLANO 1 • A ESTREIA', 'PLANO 2 • O REI ATRAVESSA', 'PLANO 3 • DE NOVO E DE NOVO', 'PLANO 4 • NENHUM TALENTO', 'PLANO 5 • A DISTÂNCIA'],
    subs: [
      ...barouSubs0,
      [
        { from: 24, to: 202, who: 'SHOUEI BAROU', text: '"Você não tem talento nenhum."', color: BAROU_C },
        { from: 204, who: 'SHOUEI BAROU', text: '"Some do meu campo."', color: BAROU_C }
      ],
      [
        { from: 16, to: 180, who: 'VOCÊ', text: '(Eu nem encostei na bola.)', color: YOU_C },
        { from: 182, who: 'VOCÊ', text: '(Então essa é a distância...)', color: YOU_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'bluelock_bunker',
    scene(K, S) {
      barouScene(K, S, false);
    },
    overlay(ctx, S, K) {
      barouOverlay(ctx, S, K, false);
    }
  }));
  CE.registerCine3D('barou_king_win', semEnfeites({
    phases: [290, 300, 310, 330, 450],
    music: 'tension',
    title: '👑 O REI (A VIRADA)',
    tags: ['PLANO 1 • A ESTREIA', 'PLANO 2 • O REI ATRAVESSA', 'PLANO 3 • DE NOVO E DE NOVO', 'PLANO 4 • A VIRADA', 'PLANO 5 • O PRIMEIRO OLHAR'],
    subs: [
      ...barouSubs0,
      [
        { from: 4, to: 162, who: 'NARRADOR', text: 'O Time Z virou contra o Rei.', color: '#94a3b8' },
        { from: 166, who: 'SHOUEI BAROU', text: '"Sorte de principiante."', color: BAROU_C }
      ],
      [
        { from: 8, to: 182, who: 'SHOUEI BAROU', text: '"O Rei não perde duas vezes."', color: BAROU_C },
        { from: 184, to: 320, who: 'VOCÊ', text: '(O Rei me olhou com ódio.)', color: YOU_C },
        { from: 322, who: 'VOCÊ', text: '(Então eu existo aqui.)', color: YOU_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'bluelock_bunker',
    scene(K, S) {
      barouScene(K, S, true);
    },
    overlay(ctx, S, K) {
      barouOverlay(ctx, S, K, true);
    }
  }));

  // ==========================================================================
  // 2. O GOSTO DO EGO (Time Z x Time Y)
  // ==========================================================================
  const NIKO_AT = [53.4, 9.4];
  const YOU_E = [52.0, 10.8];
  // a leitura do Niko projetada no gramado: setas vermelhas (riscadas no xeque) e,
  // um passo depois, a sua linha ciano
  let TACT = null;
  const tactics = (red, cross, cyan) => {
    const key = [Math.round(red * 12), Math.round(cross * 8), Math.round(cyan * 12)].join('|');
    if (!TACT) TACT = paint(512, 544);
    if (TACT.key === key) return false;
    TACT.key = key;
    const g = TACT.g;
    const P = (x, y) => [(x - 45) * 32, (y - 6) * 32];
    g.clearRect(0, 0, 512, 544);
    g.lineCap = 'round';
    const arrow = (a, b, k, color, w) => {
      if (k <= 0) return;
      const p = P(a[0], a[1]);
      const q = P(lerp(a[0], b[0], k), lerp(a[1], b[1], k));
      g.strokeStyle = color;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(p[0], p[1]);
      g.lineTo(q[0], q[1]);
      g.stroke();
      if (k >= 1) {
        const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
        g.fillStyle = color;
        g.beginPath();
        g.moveTo(q[0] + Math.cos(ang) * 14, q[1] + Math.sin(ang) * 14);
        g.lineTo(q[0] + Math.cos(ang + 2.4) * 14, q[1] + Math.sin(ang + 2.4) * 14);
        g.lineTo(q[0] + Math.cos(ang - 2.4) * 14, q[1] + Math.sin(ang - 2.4) * 14);
        g.closePath();
        g.fill();
      }
    };
    const R = [[[55.8, 12.2], [54.6, 9.2]], [[49.6, 12.6], [51.2, 9.4]], [[YOU_E[0], YOU_E[1]], [52.6, 8.4]], [[47.6, 11.5], [49.4, 8.6]]];
    R.forEach(([a, b], i) => {
      const k = seg(red, i * 0.2, i * 0.2 + 0.4);
      arrow(a, b, k, 'rgba(239,68,68,0.95)', 7);
      if (cross > 0 && k >= 1) {
        const q = P(b[0], b[1]);
        const s = 16 * Math.min(1, cross * 2);
        g.strokeStyle = 'rgba(254,202,202,0.95)';
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(q[0] - s, q[1] - s);
        g.lineTo(q[0] + s, q[1] + s);
        g.moveTo(q[0] + s, q[1] - s);
        g.lineTo(q[0] - s, q[1] + s);
        g.stroke();
      }
    });
    if (cyan > 0) {
      g.setLineDash([18, 10]);
      arrow([YOU_E[0], YOU_E[1]], [53.9, 8.2], cyan, 'rgba(0,245,212,0.98)', 9);
      g.setLineDash([]);
      if (cyan >= 1) {
        const q = P(53.9, 8.2);
        g.strokeStyle = 'rgba(0,245,212,0.9)';
        g.lineWidth = 5;
        g.beginPath();
        g.arc(q[0], q[1], 26, 0, PI * 2);
        g.stroke();
      }
    }
    return true;
  };
  const tacticsFloor = (K, red, cross, cyan, alpha = 0.85) => {
    const dirty = tactics(red, cross, cyan);
    K.floor({ x0: 45, y0: 6, x1: 61, y1: 23, z: 0.014, img: TACT, em: true, alpha, dirty });
  };
  // o lance final: os dois times parados na leitura do Niko
  const egoField = (K, S, o = {}) => {
    A(K, 'niko', Object.assign({ x: NIKO_AT[0], y: NIKO_AT[1], face: [52.6, 13], frame: 4, light: [1.15, 0.78, 0.76] }, o.niko || {}));
    A(K, 'okawa', { x: 55.4, y: 9.9, face: [55, 14], frame: 0 });
    A(K, 'ya', { x: 50.6, y: 9.7, face: [50, 14], frame: 0 });
    if (!o.noGk) A(K, 'gky', { x: 53, y: 7.0, face: [53, 14], frame: 0 });
    A(K, 'bachira', { x: 55.8, y: 12.2, face: [54, 8], frame: 0 });
    A(K, 'kunigami', { x: 49.6, y: 12.6, face: [51, 8], frame: 0 });
    A(K, 'chigiri', { x: 47.6, y: 11.5, face: [49, 8], frame: 0 });
    if (!o.noYou) A(K, 'you', Object.assign({ x: YOU_E[0], y: YOU_E[1], face: [52.4, 7], frame: 4 }, o.you || {}));
  };
  const LED = () => art('led_zy', 512, 152, (g) => CE.zselLed(g, 12, 12, 488, 128, 0, { top: 'FIM DE JOGO', left: 'TIME Z', right: 'TIME Y', leftOn: true, mid: '•' }));

  CE.registerCine3D('ego_victory', semEnfeites({
    phases: [250, 300, 220, 310, 300, 310],
    music: 'epic',
    title: '😈 O GOSTO DO EGO',
    tags: ['PLANO 1 • XEQUE', 'PLANO 2 • UM PASSO DEPOIS', 'PLANO 3 • O ÚLTIMO LANCE', 'PLANO 4 • DE JOELHOS', 'PLANO 5 • BOM DEMAIS', 'PLANO 6 • O MONSTRO'],
    subs: [
      [
        { from: 16, to: 142, who: 'IKKI NIKO', text: '"Li tudo. Acabou."', color: '#fca5a5' },
        { from: 160, who: 'VOCÊ', text: '(...Será?)', color: YOU_C }
      ],
      [
        { from: 16, to: 188, who: 'VOCÊ', text: '(Ele leu tudo... então eu leio ele.)', color: YOU_C },
        { from: 190, who: 'VOCÊ', text: '(Um passo depois.)', color: YOU_C }
      ],
      [{ from: 4, who: 'NARRADOR', text: 'Último lance. Um chute só.', color: '#94a3b8' }],
      [
        { from: 16, to: 176, who: 'IKKI NIKO', text: '"...Impossível. Eu li tudo."', color: '#fca5a5' },
        { from: 180, who: 'VOCÊ', text: '(Leu. Mas eu li depois.)', color: YOU_C }
      ],
      [
        { from: 14, to: 150, who: 'VOCÊ', text: '(Que sensação é essa...?)', color: YOU_C },
        { from: 152, who: 'VOCÊ', text: '(Vencer... é bom DEMAIS.)', color: YOU_C }
      ],
      [
        { from: 10, to: 160, who: 'VOCÊ', text: '(Devorar o plano de outro...)', color: YOU_C },
        { from: 162, who: 'VOCÊ', text: '(Quero sentir isso DE NOVO.)', color: YOU_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, dur } = S;
      const k = t / dur;
      night(K);
      if (phase === 0) {
        // o Niko leu tudo: a leitura dele aparece no gramado
        tacticsFloor(K, seg(t, 40, 140), seg(t, 140, 180), 0);
        egoField(K, S);
        const e = EIO(k);
        K.cam([lerp(54.6, 54.3, e), lerp(0.62, 0.55, e), lerp(11.6, 11.1, e)], [54.0, lerp(0.5, 0.56, e), 9.3], 40);
      } else if (phase === 1) {
        // um passo depois: a câmera gira em volta de você lendo a leitura dele
        tacticsFloor(K, 1, 1, seg(t, 150, 210));
        egoField(K, S, { you: { face: t > 150 ? [53.9, 8.2] : [52.4, 7], light: t > 150 ? [1.1, 1.3, 1.3] : undefined } });
        const a = lerp(PI * 0.62, PI * 0.18, EIO(k));
        const r = 2.3;
        K.cam([YOU_E[0] + Math.cos(a) * r, 1.45, YOU_E[1] + Math.sin(a) * r], [YOU_E[0] + 0.3, 0.3, YOU_E[1] - 0.6], 46);
      } else if (phase === 2) {
        const cut = 62;
        if (t < cut) {
          // o chute
          egoField(K, S, { you: { anim: t < 40 ? 'windup' : 'shoot', frame: 4, face: [53.9, 7.6], light: [1.1, 1.2, 1.25] } });
          K.ball(YOU_E[0] + 0.15, YOU_E[1] - 0.36, 0.06);
          const sh = t > 40 ? 0.04 * (1 - seg(t, 40, 60)) : 0.006;
          K.cam([53.3 + shake(K, S.f, 1, sh), 0.2, 9.4 + shake(K, S.f, 2, sh)], [YOU_E[0], 0.52, YOU_E[1]], 42);
        } else {
          // a rede, com o Niko parado de costas em primeiro plano
          const u = t - cut;
          const hit = 28;
          egoField(K, S, { noGk: true, niko: { face: [53.2, 6], light: [0.5, 0.3, 0.3] }, you: { anim: 'shoot', frame: 4, face: [53.9, 7.6] } });
          const kk = seg(u, 4, hit + 14);
          A(K, 'gky', { x: lerp(53.0, 52.2, E(kk)), y: 6.95, z: Math.sin(kk * PI) * 0.22, face: [53, 14], anim: kk > 0.15 ? 'dive' : 'idle', frame: 4 });
          const b = u < hit ? shotPath([YOU_E[0] + 0.3, YOU_E[1] - 0.4, 0.1], [53.85, 6.3, 0.6], E(seg(u, 0, hit))) : [53.85, 6.25, Math.max(0.1, 0.6 - (u - hit) * 0.02)];
          K.ball(b[0], b[1], b[2]);
          const sh = u >= hit ? 0.04 * (1 - seg(u, hit, hit + 30)) : 0;
          K.cam([53.15 + shake(K, S.f, 1, sh), 0.72, 11.1], [53.4, 0.5, 6.6], 42);
        }
      } else if (phase === 3) {
        // a imagem: você de pé na luz, olhando para baixo; o Niko de joelhos, de costas
        K.expo(0.84);
        K.quad({ x: 53, y: 5.98, z: 2.35, w: 3.6, h: 1.07, ang: -PI / 2, img: LED(), em: true });
        lightDisc(K, 53.1, 9.7, 1.0, 'rgba(224,242,254,0.95)', 0.6);
        A(K, 'you', { x: 53.1, y: 9.7, face: [52.8, 12], frame: 4, light: [1.25, 1.35, 1.4] });
        A(K, 'niko', { x: 51.6, y: 11.4, z: -0.2, face: [53.1, 9.7], frame: 4, light: [0.42, 0.28, 0.3] });
        A(K, 'okawa', { x: 56.2, y: 9.2, face: [53, 10], frame: 0, light: [0.35, 0.3, 0.32] });
        A(K, 'ya', { x: 49.8, y: 10.3, face: [53, 10], frame: 0, light: [0.35, 0.3, 0.32] });
        const e = EIO(k);
        K.cam([52.0, lerp(0.5, 0.58, e), lerp(13.4, 13.0, e)], [53.4, lerp(0.85, 0.95, e), 9.2], lerp(44, 40, e));
      } else if (phase === 4) {
        // vencer é bom DEMAIS: o coração no enquadramento
        const beats = [44, 62, 120, 138, 196, 214];
        const beat = beats.reduce((m, b) => Math.max(m, t >= b ? 1 - seg(t, b, b + 14) : 0), 0);
        A(K, 'you', { x: 53.1, y: 9.7, face: [53.1, 13], frame: 4, light: [0.9, 1.25, 1.2] });
        K.cam([53.15 + K.noise(S.f * 2.1, 3) * 0.008, 0.58 + K.noise(S.f * 1.9, 5) * 0.005, 11.75 - EIO(k) * 0.15], [53.1, 0.56, 9.7], 40 - beat * 1.4);
      } else {
        // o monstro aparece no seu rosto: contra-plongée, luz verde-água, os refletores atrás
        const kk = E(seg(t, 10, 150));
        K.expo(0.78);
        A(K, 'you', { x: 53.1, y: 9.7, face: [53.1, 13], frame: 4, extra: t > 100 ? { mouth: 'grin' } : undefined, light: [0.4 + kk * 0.3, 0.9 + kk * 0.4, 0.85 + kk * 0.35] });
        const hit = 176;
        const sh = 0.004 + (t >= hit ? 0.04 * (1 - seg(t, hit, hit + 30)) : 0);
        K.cam([53.1 + shake(K, S.f, 1, sh), 0.22, 11.6 - EIO(k) * 0.2], [53.1, 0.75, 9.7], 40);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot, dur } = S;
      if (phase === 0) {
        const e = eyesAt(K, NIKO_AT[0], NIKO_AT[1]);
        if (e) CE.cineGlow(ctx, e.x, e.y - 2 * e.u, e.u * 9, 'rgba(239,68,68,0.22)', seg(t, 60, 100));
        // a prancheta dele (o plano inteiro) entra pela direita
        const kp = E(seg(t, 20, 38)) * (1 - seg(t, 200, 220));
        if (kp > 0) CE.finPanel(ctx, [[880, top + 30], [W - 30, top + 22], [W - 36, top + 270], [866, top + 280]], () => CE.zselTactics(ctx, 860, top + 20, 400, 270, t, { red: seg(t, 40, 140), cross: seg(t, 140, 180) }), { dx: (1 - kp) * 440, border: '#fecaca' });
        if (t > 180) CE.cineImpactText(ctx, 'XEQUE.', 990, bot - 80, 70, '#ef4444', seg(t, 180, 188), 0, -0.06);
        CE.ptdChip(ctx, '89:41', 52, top + 34, '#facc15', seg(t, 4, 16), { size: 16, left: true });
        CE.finKicker(ctx, 150, top + 34, 'TIME Z x TIME Y • ÚLTIMO MINUTO', seg(t, 8, 50), '#ef4444');
        CE.cineSfx(S, 180, 'xeque', () => window.SFX?.kick?.(0.6));
      } else if (phase === 1) {
        const lock = t > 150;
        const you = cdOf(K, 'you');
        eyeBand(ctx, S, you, { k: seg(t, 0, 14), from: 'left', y0: top + 14, y1: top + 170, dw: 1260, bg: '#04201c', eyes: { ring: lock ? YOU_C : '#38bdf8', iris: '#065f46', look: lock ? 1 : [0, -1, 0, 1][Math.floor(t / 22) % 4], angry: lock, glow: 'rgba(0,245,212,0.4)', glowA: seg(t, 150, 170), shine: 0.8 } });
        if (t >= 204) {
          const p = K.screen(53.9, 0.05, 8.2);
          if (p) CE.cineGlow(ctx, p.x, p.y, 110, 'rgba(0,245,212,0.55)', 1 - seg(t, 204, 280) * 0.5);
          CE.zselStamp(ctx, 'ACHEI.', 1030, bot - 50, 54, '#ccfbf1', t, 206, 3);
        }
        CE.cineSfx(S, 204, 'click', () => window.SFX?.blip?.(1320));
      } else if (phase === 2) {
        const cut = 62;
        if (t < cut) {
          kickFx(ctx, S, K, [YOU_E[0] + 0.15, YOU_E[1] - 0.36, 0.06], t, 40, YOU_C);
          if (t >= 40) {
            CE.cineImpactText(ctx, 'DOM!!', W * 0.78, top + 110, 100, YOU_C, seg(t, 40, 47), 0, -0.12);
            CE.cineFlash(ctx, W, H, 0.7 * (1 - seg(t, 40, 48)));
          }
          CE.cineSfx(S, 40, 'chute', () => window.SFX?.kick?.(1));
        } else {
          const u = t - cut;
          if (u >= 28) {
            CE.cineFlash(ctx, W, H, 0.75 * (1 - seg(u, 28, 36)));
            CE.cineImpactText(ctx, 'GOOOOL!!', W * 0.4, top + 112, 112, YOU_C, seg(u, 28, 38), W * 0.66, -0.05);
          }
          CE.cineSfx(S, cut + 28, 'rede', () => window.SFX?.goal?.(true));
        }
      } else if (phase === 3) {
        const p = K.screen(53.1, 3.2, 9.7);
        if (p) CE.cineShafts(ctx, p.x, p.y - 80, PI / 2, 620, 0.42, 5, '224,242,254', 0.1, t);
        CE.cineDust(ctx, W, H, t, 26, 'rgba(226,232,240,0.5)', 21);
        const e = eyesAt(K, 53.1, 9.7);
        if (e) CE.cineGlow(ctx, e.x, e.y, 8 * e.u, 'rgba(0,245,212,0.35)', seg(t, 120, 200));
        CE.finKicker(ctx, 40, top + 30, 'FIM DE JOGO • PRÉDIO 5', seg(t, 6, 46), YOU_C);
      } else if (phase === 4) {
        const beats = [44, 62, 120, 138, 196, 214];
        const beat = beats.reduce((m, b) => Math.max(m, t >= b ? 1 - seg(t, b, b + 14) : 0), 0);
        const e = eyesAt(K, 53.1, 9.7);
        if (e) CE.cineGlow(ctx, e.x, e.y, 9 * e.u, 'rgba(0,245,212,0.35)', 0.4 + beat * 0.6);
        // painel: as mãos tremendo
        const kh = E(seg(t, 70, 86));
        if (kh > 0) {
          const you = cdOf(K, 'you');
          CE.finPanel(ctx, [[26, bot - 214], [400, bot - 230], [410, bot - 16], [20, bot - 16]], () => {
            ctx.fillStyle = '#04201c';
            ctx.fillRect(0, bot - 240, 420, 240);
            CE.ptdRays(ctx, 210, bot - 110, 400, YOU_C, 0.25, t * 0.004, 26);
            CE.wcdPix(ctx, CE.zselHandCv(you.skinColor || '#f3d1b8'), 120 + Math.round(K.noise(S.f * 3.1, 1) * 4), bot - 214, 10);
          }, { dy: (1 - kh) * 280, border: '#99f6e4' });
        }
        beats.forEach((b, i) => {
          if (t >= b && t < b + 30) CE.zselStamp(ctx, 'TUM', 1080 + (i % 2) * 90, top + 90 + (i % 2) * 50, 40, '#ccfbf1', t, b, 2, 0, 'center', 1 - seg(t, b + 18, b + 30));
        });
        CE.zselStamp(ctx, 'VENCER...', 340, top + 70, 52, '#ccfbf1', t, 152, 3);
        CE.cineImpactText(ctx, 'É BOM DEMAIS.', 820, bot - 80, 92, YOU_C, seg(t, 190, 200), 760, -0.05);
        if (t >= 190) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, 190, 202)), '#ccfbf1');
        beats.forEach((b, i) => CE.cineSfx(S, b, 'tum' + i, () => window.SFX?.kick?.(0.15)));
        CE.cineSfx(S, 190, 'demais', () => window.SFX?.kick?.(1));
      } else {
        const hit = 176;
        const kk = E(seg(t, 10, 150));
        const e = eyesAt(K, 53.1, 9.7);
        if (e) CE.cineGlow(ctx, e.x, e.y, 14 * e.u, 'rgba(0,245,212,0.5)', 0.3 + kk * 0.7);
        if (t > 100) {
          const you = cdOf(K, 'you');
          eyeBand(ctx, S, you, { k: seg(t, 100, 112), y0: top + 84, y1: top + 230, dw: 1240, bg: '#010405', dim: 0.08, dimTint: '0,20,20', eyes: { ring: YOU_C, iris: '#022c22', line: '#010405', tiny: true, glow: 'rgba(0,245,212,0.75)', glowA: 0.3 + kk * 0.7, shine: 1, angry: true } });
        }
        CE.zselStamp(ctx, 'DEVORAR O PLANO DE OUTRO...', 640, top + 46, 36, '#99f6e4', t, 20, 2, W * 0.84);
        CE.cineImpactText(ctx, 'DE NOVO.', 640, bot - 82, 120, YOU_C, seg(t, hit, hit + 10), W * 0.7, -0.04);
        if (t >= hit) CE.cineFlash(ctx, W, H, 0.42 * (1 - seg(t, hit, hit + 12)), '#ccfbf1');
        const fo = seg(t, dur - 30, dur);
        if (fo > 0) {
          ctx.fillStyle = `rgba(0,0,0,${fo * 0.7})`;
          ctx.fillRect(0, 0, W, H);
        }
        CE.cineSfx(S, hit, 'denovo', () => window.SFX?.kick?.(1));
      }
    }
  }));

  // ==========================================================================
  // 3. O TRAIDOR (Time Z x Time W)
  // ==========================================================================
  // o caminho ensaiado riscado no gramado (giz ciano; vermelho quando é lido)
  let LANE = null;
  const laneFloor = (K, k, red) => {
    if (!LANE) LANE = paint(256, 256);
    const key = Math.round(k * 16) + '|' + (red ? 1 : 0);
    let dirty = false;
    if (LANE.key !== key) {
      LANE.key = key;
      dirty = true;
      const g = LANE.g;
      g.clearRect(0, 0, 256, 256);
      g.setLineDash([16, 12]);
      g.lineWidth = 7;
      g.lineCap = 'round';
      g.strokeStyle = red ? 'rgba(239,68,68,0.95)' : 'rgba(56,189,248,0.9)';
      g.beginPath();
      g.moveTo(16, 240);
      g.lineTo(lerp(16, 240, k), lerp(240, 16, k));
      g.stroke();
    }
    // (de [52.3, 13.6] até [57.3, 8.6])
    K.floor({ x0: 52.0, y0: 8.4, x1: 57.6, y1: 14.0, z: 0.014, img: LANE, em: true, alpha: 0.9, dirty });
  };
  const KUON_AT = [36.5, 17.62];

  CE.registerCine3D('kuon_betrayal', semEnfeites({
    phases: [296, 280, 300, 370, 320],
    music: 'mystery',
    title: '🗡️ O TRAIDOR',
    tags: ['PLANO 1 • TUDO LIDO', 'PLANO 2 • OS GÊMEOS', 'PLANO 3 • O VESTIÁRIO', 'PLANO 4 • A CONFISSÃO', 'PLANO 5 • EGOÍSMO SEM GOL'],
    subs: [
      [
        { from: 4, to: 122, who: 'NARRADOR', text: 'Jogada ensaiada.', color: '#94a3b8' },
        { from: 124, who: 'CHIGIRI', text: '"Eles sabiam pra onde a bola ia!"', color: CHI_C }
      ],
      [
        { from: 14, to: 158, who: 'WANIMA', text: '"Valeu pela dica, Time Z."', color: '#4ade80' },
        { from: 160, who: 'VOCÊ', text: '(...Dica? Que dica?)', color: YOU_C }
      ],
      [
        { from: 8, to: 192, who: 'RAICHI', text: '"Foi você, Kuon! Você vendeu a gente!"', color: RAICHI_C },
        { from: 196, who: 'KUON', text: '"...E se fui?"', color: KUON_C }
      ],
      [
        { from: 10, to: 168, who: 'KUON', text: '"Os gêmeos me fazem artilheiro."', color: KUON_C },
        { from: 170, who: 'KUON', text: '"Eu só fiz o que o Ego mandou: ser egoísta."', color: KUON_C }
      ],
      [
        { from: 12, to: 178, who: 'VOCÊ', text: '(Egoísmo sem gol... é só traição.)', color: YOU_C },
        { from: 180, who: 'VOCÊ', text: '"A gente vence sem você."', color: YOU_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, dur } = S;
      const k = t / dur;
      night(K);
      if (phase === 0) {
        // a jogada ensaiada... e o gêmeo já está lá
        const pass = 92;
        const cutIn = 112;
        const by = lerp(15.6, 13.7, seg(t, 0, pass));
        const ba = t < pass - 12 ? 'run' : t < pass ? 'windup' : t < pass + 20 ? 'shoot' : 'idle';
        laneFloor(K, E(seg(t, 10, 40)), t >= cutIn);
        A(K, 'bachira', { x: 52.3, y: by, face: [55, 9], anim: ba, frame: ba === 'run' || ba === 'idle' ? S.f : 4 });
        A(K, 'you', { x: 49.8, y: 12.4, face: [52, 9], anim: 'run' });
        A(K, 'kuon', { x: 50.8, y: 15.8, face: [52, 12], frame: 4 });
        const wIn = E(seg(t, pass + 2, cutIn));
        const intercept = [55.3, 11.7];
        const wx = lerp(58.6, intercept[0], wIn);
        const wy = lerp(10.6, intercept[1], wIn);
        A(K, t >= cutIn ? 'wjG' : 'wj', { x: wx, y: wy, face: [52.3, 13.7], anim: t < cutIn ? 'run' : 'slide', frame: t < cutIn ? S.f : 4 });
        if (t > cutIn + 20) {
          const kk = E(seg(t, cutIn + 20, cutIn + 60));
          A(K, 'wkG', { x: lerp(59.6, 56.8, kk), y: lerp(12.4, 12.0, kk), face: [52.3, 13.7], anim: 'call_pass', frame: S.f });
        }
        A(K, 'wa', { x: 53.4, y: 9.4, face: [53, 14], frame: 0 });
        if (t < pass) K.ball(52.5, by - 0.3, 0.05 + Math.abs(Math.sin(t * 0.3)) * 0.05);
        else {
          const kb = t < cutIn ? seg(t, pass, cutIn) : 1;
          K.ball(lerp(52.6, intercept[0] - 0.2, kb), lerp(13.4, intercept[1] + 0.1, kb), 0.05 + Math.sin(kb * PI) * 0.12);
        }
        const z = t > cutIn ? E(seg(t, cutIn, cutIn + 40)) : 0;
        const sh = 0.006 + (t >= cutIn ? 0.035 * (1 - seg(t, cutIn, cutIn + 24)) : 0);
        const lx = t < pass ? 52.6 : lerp(52.6, 55.0, E(seg(t, pass, cutIn + 10)));
        const ly = t < pass ? by - 0.4 : lerp(by - 0.4, 11.9, E(seg(t, pass, cutIn + 10)));
        K.cam([lx - 2.6 + z * 0.6 + shake(K, S.f, 1, sh), 1.05 - z * 0.25, ly + 2.4 - z * 0.5], [lx, 0.42, ly], 46 - z * 8);
      } else if (phase === 1) {
        if (t < 150) {
          // os gêmeos Wanima, rindo
          A(K, 'wjG', { x: 55.0, y: 11.8, face: [54.2, 14], frame: 4, light: [0.8, 1.15, 0.85] });
          A(K, 'wkG', { x: 55.95, y: 11.95, face: [55.2, 14], frame: 4, light: [0.8, 1.15, 0.85] });
          const e = EIO(t / 150);
          K.cam([55.4, 0.45, 14.55 - e * 0.15], [55.5, 0.56, 11.9], 40);
        } else {
          // o Kuon desvia o olhar, suando
          A(K, 'kuon', { x: 51.0, y: 14.6, face: [49, 14.9], frame: 4, light: [0.55, 0.6, 0.78] });
          A(K, 'wjG', { x: 53.0, y: 12.0, face: [51, 14.6], frame: 0, light: [0.4, 0.55, 0.42] });
          K.cam([51.3, 0.55, 16.6], [51.0, 0.55, 14.6], 40);
        }
      } else if (phase === 2) {
        // o vestiário no intervalo: o Kuon no banco, o time em volta, o Raichi apontando
        const hit = 40;
        K.expo(0.9);
        A(K, 'kuon', { x: KUON_AT[0], y: KUON_AT[1], z: -0.12, face: [36.5, 22], frame: 4, light: [0.8, 0.85, 1.05] });
        A(K, 'kunigami', { x: 38.7, y: 18.5, face: KUON_AT, frame: 4 });
        A(K, 'chigiri', { x: 39.7, y: 18.1, face: KUON_AT, frame: 4 });
        A(K, 'bachira', { x: 35.5, y: 18.9, face: KUON_AT, frame: 4 });
        A(K, 'raichi', { x: 37.6, y: 18.3, face: KUON_AT, anim: t >= hit - 6 ? 'call_pass' : 'idle', frame: S.f, light: [1.15, 1.0, 0.85] });
        A(K, 'you', { x: 38.4, y: 20.75, face: KUON_AT, frame: 4, light: [0.5, 0.55, 0.7] });
        const e = EIO(k);
        const sh = 0.004 + (t >= hit ? 0.03 * (1 - seg(t, hit, hit + 26)) : 0);
        K.cam([lerp(37.3, 37.1, e) + shake(K, S.f, 1, sh), 0.95 + shake(K, S.f, 2, sh), lerp(22.4, 21.8, e)], [lerp(36.8, 36.7, e), 0.45, 17.6], lerp(48, 42, e));
      } else if (phase === 3) {
        const mem = t >= 24 && t < 200;
        if (mem) {
          // a memória: o acordo no corredor do treino
          A(K, 'wjG', { x: 40.0, y: 13.5, face: [38.7, 14.6], frame: 4 });
          A(K, 'wkG', { x: 40.7, y: 14.3, face: [38.7, 14.6], frame: 4 });
          A(K, 'kuon', { x: 38.7, y: 14.6, face: [40.3, 13.9], frame: 4 });
          const e = EIO(seg(t, 24, 200));
          K.cam([37.0 + e * 0.3, 0.82, 13.35], [40.1, 0.5, 14.1], 40);
        } else {
          // a confissão: o rosto frio, meio no escuro
          const hit = 268;
          K.expo(0.82);
          A(K, 'kuon', { x: KUON_AT[0], y: KUON_AT[1], z: -0.18, face: [36.5, 22], frame: 4, light: [0.5, 0.55, 0.78] });
          const e = EIO(k);
          const sh = 0.003 + (t >= hit ? 0.03 * (1 - seg(t, hit, hit + 24)) : 0);
          K.cam([36.75 + shake(K, S.f, 1, sh), 0.42, 19.25 - e * 0.12], [36.5, 0.42, KUON_AT[1]], 40);
        }
      } else {
        const hit = 110;
        if (t >= 30 && t < 104) {
          // o gol vazio, a bola parada na linha
          K.expo(0.85);
          K.ball(53.2, 6.75, 0.05);
          K.cam([53.6, 0.3, 8.4 - seg(t, 30, 104) * 0.2], [53.1, 0.38, 6.5], 42);
        } else {
          // você entende
          K.expo(0.86);
          A(K, 'you', { x: 38.6, y: 19.4, face: [38.6, 23], frame: 4, light: t > hit ? [0.85, 1.15, 1.15] : [0.55, 0.62, 0.82] });
          A(K, 'kuon', { x: KUON_AT[0], y: KUON_AT[1], z: -0.18, face: [37, 22], frame: 4, light: [0.3, 0.32, 0.45] });
          const sh = 0.003 + (t >= hit ? 0.03 * (1 - seg(t, hit, hit + 24)) : 0);
          K.cam([38.9 + shake(K, S.f, 1, sh), 0.55, 21.4 - EIO(k) * 0.12], [38.6, 0.56, 19.4], 40);
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      if (phase === 0) {
        const cutIn = 112;
        if (t < cutIn) CE.ptdSpeed(ctx, S, t, '#bae6fd', 0.16, -1, 36, 14, top + 20, bot - 40, 5);
        if (t >= cutIn) {
          CE.cineImpactText(ctx, 'LIDO?!', W * 0.62, top + 110, 100, '#4ade80', seg(t, cutIn, cutIn + 8), 0, -0.08);
          CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, cutIn, cutIn + 10)), '#dcfce7');
        }
        CE.ptdChip(ctx, 'JOGADA ENSAIADA Nº 3', 30, top + 34, '#38bdf8', seg(t, 6, 20), { size: 15, left: true });
        CE.cineSfx(S, 92, 'passe', () => window.SFX?.pass?.());
        CE.cineSfx(S, cutIn, 'corte', () => window.SFX?.tackle?.());
      } else if (phase === 1) {
        if (t < 150) {
          [[55.0, 11.8], [55.95, 11.95]].forEach(([x, y]) => {
            const e = eyesAt(K, x, y);
            if (e) CE.cineGlow(ctx, e.x, e.y, 6 * e.u, 'rgba(74,222,128,0.3)', 0.8);
          });
          CE.zselStamp(ctx, 'VALEU PELA DICA~', 640, top + 56, 44, '#bbf7d0', t, 14, 2, W * 0.8);
        } else {
          sweat(ctx, K, 51.0, 14.6, t, 170);
          CE.zselStamp(ctx, '...', W * 0.66, top + 90, 40, '#cbd5e1', t, 186, 6);
        }
      } else if (phase === 2) {
        const hit = 40;
        const p = K.screen(36.9, 1.7, 18.4);
        if (p) CE.cineGlow(ctx, p.x, p.y, 240, 'rgba(191,219,254,0.14)');
        if (t >= hit) CE.cineImpactText(ctx, 'TRAIDOR!', 470, top + 100, 84, RAICHI_C, seg(t, hit, hit + 8), 0, -0.1);
        CE.finKicker(ctx, 40, top + 30, 'INTERVALO • VESTIÁRIO DO TIME Z', seg(t, 6, 46));
        CE.cineSfx(S, hit, 'traidor', () => window.SFX?.kick?.(0.8));
      } else if (phase === 3) {
        const hit = 268;
        const mem = t >= 24 && t < 200;
        if (mem) {
          // memória: sem cor, com retícula
          ctx.save();
          ctx.globalCompositeOperation = 'saturation';
          ctx.globalAlpha = 0.65;
          ctx.fillStyle = '#777777';
          ctx.fillRect(0, top, W, bot - top);
          ctx.restore();
          ctx.fillStyle = 'rgba(20,60,30,0.18)';
          ctx.fillRect(0, top, W, bot - top);
          CE.finFillPat(ctx, 'dots', 0, top, W, bot - top, 0.2);
          CE.finKicker(ctx, 50, top + 44, 'ANTES DO JOGO', seg(t, 40, 70), '#86efac');
          CE.zselStamp(ctx, 'ARTILHEIRO.', W * 0.66, top + 120, 46, '#dcfce7', t, 80, 3, 480);
        } else {
          // meio rosto no escuro e o reflexo verde no olho
          const e = eyesAt(K, KUON_AT[0], KUON_AT[1], -0.18);
          if (e) {
            CE.foxcGradH(ctx, e.x - 1.5 * e.u, top, 6 * e.u, bot - top, [[0, 'rgba(3,4,6,0)'], [1, 'rgba(3,4,6,0.9)']]);
            ctx.fillStyle = 'rgba(3,4,6,0.9)';
            ctx.fillRect(e.x + 4.5 * e.u, top, W, bot - top);
            CE.cineGlow(ctx, e.x - 3.5 * e.u, e.y, 3 * e.u, 'rgba(74,222,128,0.5)', 0.8);
          }
          CE.zselStamp(ctx, 'O EGO MANDOU...', 300, top + 90, 44, '#c7d2fe', t, 214, 2, 520);
          CE.cineImpactText(ctx, 'SER EGOÍSTA.', 320, bot - 84, 84, KUON_C, seg(t, hit, hit + 10), 560, -0.05);
          if (t >= hit) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, hit, hit + 12)), '#e0e7ff');
        }
        // corte de memória: escurece e volta
        const fade = Math.max(1 - Math.min(Math.abs(t - 24), Math.abs(t - 200)) / 8, 0);
        if (fade > 0) {
          ctx.fillStyle = `rgba(0,0,0,${fade})`;
          ctx.fillRect(0, top, W, bot - top);
        }
        CE.cineSfx(S, hit, 'egoista', () => window.SFX?.kick?.(1));
      } else {
        const hit = 110;
        if (t >= 30 && t < 104) {
          ctx.fillStyle = 'rgba(2,6,23,0.3)';
          ctx.fillRect(0, top, W, bot - top);
          CE.zselStamp(ctx, 'SEM GOL...', W * 0.5, top + 90, 52, '#e2e8f0', t, 50, 3);
        } else {
          const e = eyesAt(K, 38.6, 19.4);
          if (e) {
            CE.foxcGradH(ctx, e.x, top, 10 * e.u, bot - top, [[0, 'rgba(2,6,23,0)'], [1, 'rgba(2,6,23,0.6)']]);
            CE.cineGlow(ctx, e.x, e.y, 8 * e.u, 'rgba(0,245,212,0.35)', seg(t, hit, hit + 30));
          }
        }
        CE.zselStamp(ctx, 'EGOÍSMO SEM GOL...', 940, 450, 44, '#e0f2fe', t, 60, 2, 560);
        CE.cineImpactText(ctx, 'É SÓ TRAIÇÃO.', 940, bot - 70, 80, YOU_C, seg(t, hit, hit + 10), 600, -0.05);
        if (t >= hit) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, hit, hit + 12)), '#e0f2fe');
        CE.cineSfx(S, hit, 'traicao', () => window.SFX?.kick?.(1));
      }
    }
  }));

  // ==========================================================================
  // 4. O RELÂMPAGO VERMELHO (Chigiri) — a ponta esquerda (oeste) do campo
  // ==========================================================================
  const CHI_AT = [46.7, 17.8];
  const laneRed = () => art('lane_red', 64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, 'rgba(244,63,94,0.75)');
    gr.addColorStop(1, 'rgba(244,63,94,0.05)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,228,230,0.8)';
    g.lineWidth = 4;
    for (let y = 30; y < h; y += 44) {
      g.beginPath();
      g.moveTo(14, y + 12);
      g.lineTo(w / 2, y);
      g.lineTo(w - 14, y + 12);
      g.stroke();
    }
  });
  // as correntes do medo (2D, presas no joelho do 3D)
  const chains = (ctx, S, K, knee, grip, beat, t) => {
    const p = K.screen(knee[0], knee[2], knee[1]);
    if (!p) return;
    const { bot } = S;
    const ch = { link: 34, thick: 9, color: '#6b7280', shine: '#e2e8f0' };
    const vib = 1 + beat * 5;
    [[-80, bot + 60, 0], [p.x - 330, bot + 90, 2], [p.x + 260, bot + 90, 4]].forEach(([ax, ay, s]) => {
      CE.foxcChain(ctx, ax, ay, lerp(ax, p.x + (s - 2) * 14, grip), lerp(ay, p.y + 20, grip), Object.assign({ t: t * 0.3 + s, vib }, ch));
    });
    if (grip > 0.6) {
      ctx.save();
      ctx.globalAlpha = seg(grip, 0.6, 1);
      CE.foxcChain(ctx, p.x - 90, p.y - 26, p.x + 90, p.y + 4, Object.assign({ t, vib: vib * 0.6, sag: 14 }, ch));
      CE.foxcChain(ctx, p.x - 90, p.y + 24, p.x + 90, p.y - 6, Object.assign({ t: t + 2, vib: vib * 0.6, sag: 14 }, ch));
      ctx.restore();
    }
    CE.cineGlow(ctx, p.x, p.y, 110, 'rgba(239,68,68,0.5)', 0.3 + beat * 0.6);
  };

  CE.registerCine3D('chigiri_sprint', semEnfeites({
    phases: [240, 360, 276, 300, 300],
    music: 'epic',
    title: '🐆 O RELÂMPAGO VERMELHO',
    tags: ['PLANO 1 • A PONTA LIVRE', 'PLANO 2 • AS CORRENTES', 'PLANO 3 • A ARRANCADA', 'PLANO 4 • O GOL', 'PLANO 5 • NÃO QUEBROU'],
    subs: [
      [{ from: 30, who: 'VOCÊ', text: '"CHIGIRI! A ponta tá livre!"', color: YOU_C }],
      [
        { from: 14, to: 196, who: 'CHIGIRI', text: '(E se o joelho estourar de novo?)', color: CHI_C },
        { from: 212, who: 'CHIGIRI', text: '"...Se quebrar, quebrou."', color: CHI_C }
      ],
      [
        { from: 36, to: 170, who: 'WANIMA', text: '"Ninguém alcança isso!"', color: '#4ade80' },
        { from: 170, who: 'VOCÊ', text: '(Ele tá voando!)', color: YOU_C }
      ],
      [{ from: 10, who: 'CHIGIRI', text: '"Eu sou o mais rápido daqui!"', color: CHI_C }],
      [
        { from: 20, to: 138, who: 'CHIGIRI', text: '"...Não quebrou."', color: CHI_C },
        { from: 160, who: 'BACHIRA', text: '"Que pernas, Chigiri!"', color: '#fde047' }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, dur } = S;
      const k = t / dur;
      night(K);
      if (phase === 0) {
        // a ponta esquerda livre, a bola chegando no pé dele
        const lane = E(seg(t, 60, 120));
        pitchWords(K, [{ text: 'TIME Z  x  TIME W', y: 0.36, size: 70 }, { text: '1ª SELEÇÃO', y: 0.72, size: 40, color: '#facc15' }], [50, 13.4, 57, 16.9], 0.6);
        if (lane > 0) K.floor({ x0: 45.3, y0: 7.6, x1: 48.3, y1: 18.6, z: 0.016, img: laneRed(), em: true, alpha: lane * (0.75 + 0.25 * Math.sin(t * 0.12)) });
        A(K, 'gkw', { x: 53, y: 7.0, face: [53, 14], frame: 0 });
        A(K, 'wa', { x: 55.8, y: 10.2, face: [53, 16], frame: 0 });
        A(K, 'wk', { x: 54.4, y: 12.0, face: [52, 16], frame: 0 });
        A(K, 'wj', { x: 52.8, y: 12.7, face: [52, 16], frame: 0 });
        A(K, 'you', { x: 53.6, y: 15.4, face: [47, 17.6], anim: t > 30 ? 'call_pass' : 'idle', frame: S.f });
        A(K, 'chigiri', { x: CHI_AT[0], y: CHI_AT[1], face: [47, 9], frame: 4, light: [1.1, 0.85, 0.88] });
        const bk = E(seg(t, 20, 70));
        K.ball(lerp(55.6, CHI_AT[0] + 0.2, bk), lerp(16.4, CHI_AT[1] - 0.3, bk), 0.05);
        const e = EIO(k);
        K.cam([lerp(47.6, 47.3, e), lerp(1.05, 0.8, e), lerp(20.8, 19.9, e)], [lerp(50.2, 49.0, e), 0.4, lerp(12.6, 13.2, e)], lerp(48, 40, e));
      } else if (phase === 1) {
        const cut = 150;
        K.expo(0.8);
        A(K, 'chigiri', { x: CHI_AT[0], y: CHI_AT[1], face: [47.3, 22], frame: 4, light: [1.05, 0.7, 0.72] });
        if (t < cut) {
          // as pernas em close, presas pelas correntes
          K.cam([CHI_AT[0] + 0.2, 0.2 + t * 0.0002, CHI_AT[1] + 1.32], [CHI_AT[0], 0.32, CHI_AT[1]], 40);
        } else {
          const u = t - cut;
          const sh = 0.004 + (u >= 64 ? 0.04 * (1 - seg(u, 64, 92)) : 0);
          K.cam([CHI_AT[0] + 0.15 + shake(K, S.f, 1, sh), 0.58, CHI_AT[1] + 1.95 - EIO(u / (dur - cut)) * 0.1], [CHI_AT[0], 0.56, CHI_AT[1]], 40);
        }
      } else if (phase === 2) {
        const cut = 36;
        if (t < cut) {
          // DASH!!: contra-plongée
          A(K, 'chigiri', { x: CHI_AT[0], y: CHI_AT[1], face: [46.9, 10], anim: 'run', frame: 4, light: [1.25, 0.9, 0.95] });
          K.ball(CHI_AT[0] + 0.1, CHI_AT[1] - 0.32, 0.05);
          const sh = 0.04 * (1 - seg(t, 0, 20));
          K.cam([CHI_AT[0] + 0.6 + shake(K, S.f, 1, sh), 0.18, CHI_AT[1] - 1.7], [CHI_AT[0], 0.6, CHI_AT[1]], 42);
        } else {
          // a arrancada pela ponta: os gêmeos ficando para trás
          const u = t - cut;
          const cy = lerp(18.6, 8.8, u / (dur - cut));
          A(K, 'chigiri', { x: 46.8, y: cy, face: [46.8, 6], anim: 'run', frame: Math.floor(S.f * 1.5), light: [1.2, 0.9, 0.92] });
          K.ball(46.85, cy - 0.34, 0.05 + Math.abs(Math.sin(u * 0.4)) * 0.06);
          [['wj', 20], ['wk', 50]].forEach(([w, at], i) => {
            if (u < at) return;
            const wy = cy + 0.6 + (u - at) * 0.035 + i * 0.3;
            A(K, w, { x: 47.6 + i * 0.5, y: wy, face: [47, 6], anim: 'run', frame: S.f + i * 2 });
          });
          A(K, 'gkw', { x: 53, y: 7.0, face: [47, 12], frame: 0 });
          K.cam([50.4 + shake(K, S.f, 1, 0.015), 0.6, cy + 0.7], [46.8, 0.45, cy - 0.35], 42);
        }
      } else if (phase === 3) {
        const cut = 80;
        if (t < cut) {
          // o corte para dentro e o chute
          A(K, 'chigiri', { x: 50.3, y: 9.0, face: [53.6, 6.6], anim: t < 50 ? 'run' : t < 64 ? 'windup' : 'shoot', frame: t < 50 ? S.f : 4, light: [1.2, 0.88, 0.9] });
          A(K, 'gkw', { x: 52.8, y: 7.0, face: [50.3, 9.0], frame: 4 });
          const bx = lerp(49.6, 50.6, seg(t, 0, 60));
          K.ball(bx, lerp(9.4, 8.75, seg(t, 0, 60)), 0.05);
          const sh = t > 64 ? 0.04 * (1 - seg(t, 64, 80)) : 0.01;
          K.cam([49.4 + shake(K, S.f, 1, sh), 0.2, 7.85 + shake(K, S.f, 2, sh)], [50.4, 0.55, 9.0], 44);
        } else {
          // o gol: de dentro da rede
          const u = t - cut;
          const hit = 24;
          const kk = seg(u, 2, hit + 10);
          A(K, 'gkw', { x: lerp(52.8, 53.35, E(kk)), y: 7.15, z: Math.sin(kk * PI) * 0.2, face: [53, 14], anim: kk > 0.1 ? 'dive' : 'idle', frame: 4 });
          A(K, 'chigiri', { x: 50.6 + seg(u, 40, 200) * 1.5, y: 9.0 + seg(u, 40, 200) * 1.2, face: [51, 12], anim: u > 40 ? 'celebrate' : 'shoot', frame: u > 40 ? S.f : 4, light: [1.2, 0.9, 0.92] });
          const b = u < hit ? shotPath([50.7, 8.7, 0.1], [53.65, 6.35, 0.55], E(seg(u, 0, hit))) : [53.65, 6.3, Math.max(0.1, 0.55 - (u - hit) * 0.02)];
          K.ball(b[0], b[1], b[2]);
          goalCam(K, 52.0, 64, u >= hit ? 0.03 * (1 - seg(u, hit, hit + 30)) : 0, S.f);
        }
      } else {
        // "...não quebrou." — a câmera desce até o joelho e volta; o time chega
        const down = EIO(seg(t, 70, 100)) * (1 - EIO(seg(t, 140, 170)));
        const kt = E(seg(t, 170, 230));
        A(K, 'chigiri', { x: 50.6, y: 9.2, face: [50.6, 13], frame: 4, light: [1.15, 0.92, 0.95] });
        if (kt > 0) {
          A(K, 'bachira', { x: lerp(48.0, 49.6, kt), y: lerp(10.6, 9.8, kt), face: [50.6, 9.2], anim: kt < 1 ? 'run' : 'call_pass', frame: S.f });
          A(K, 'you', { x: lerp(53.4, 51.6, kt), y: lerp(10.8, 9.9, kt), face: [50.6, 9.2], anim: kt < 1 ? 'run' : 'idle', frame: S.f });
        }
        const breath = Math.sin(t * 0.09) * 0.01 * (1 - seg(t, 120, 240));
        const back = E(seg(t, 170, 240));
        K.cam([50.75, lerp(0.58, 0.3, down) + breath, lerp(11.15, 11.1, down) + back * 0.9], [50.6, lerp(0.56, 0.25, down), 9.2], 40 + back * 6);
        void k;
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot, dur } = S;
      if (phase === 0) {
        const lane = E(seg(t, 60, 120));
        if (lane > 0) CE.ptdChip(ctx, 'A PONTA ESQUERDA ESTÁ LIVRE', 740, top + 80, CHI_C, lane, { size: 15 });
        CE.finKicker(ctx, 40, top + 30, 'TIME Z x TIME W • RETA FINAL', seg(t, 6, 46), CHI_C);
        CE.cineSfx(S, 70, 'domina', () => window.SFX?.pass?.());
      } else if (phase === 1) {
        const cut = 150;
        if (t < cut) {
          const beats = [20, 40, 80, 100, 130];
          const beat = beats.reduce((m, b) => Math.max(m, t >= b ? 1 - seg(t, b, b + 14) : 0), 0);
          ctx.fillStyle = `rgba(30,2,6,${0.25 + beat * 0.1})`;
          ctx.fillRect(0, top, W, bot - top);
          chains(ctx, S, K, [CHI_AT[0] + 0.05, CHI_AT[1], 0.24], E(seg(t, 4, 30)), beat, t);
          beats.forEach((b, i) => {
            if (t >= b && t < b + 26) CE.zselStamp(ctx, 'TUM', 160 + (i % 2) * 70, top + 80 + (i % 3) * 60, 40, '#fecaca', t, b, 2, 0, 'center', 1 - seg(t, b + 14, b + 26));
          });
          // a memória: a lesão (sem cor)
          const kp = E(seg(t, 46, 62));
          if (kp > 0) {
            const chi = cdOf(K, 'chigiri');
            CE.finPanel(ctx, [[860, top + 24], [W - 24, top + 14], [W - 24, bot - 24], [836, bot - 14]], () => {
              CE.cineGradient(ctx, 820, top, 460, bot - top, [[0, '#262626'], [1, '#0a0a0a']]);
              const fall = E(seg(t, 62, 92));
              CE.finSpr(ctx, chi, lerp(1000, 1060, fall), bot - 70 + fall * 20, 300, { animState: fall > 0.2 ? 'slide' : 'run', frame: 5, dim: 0.2, dimTint: '20,20,20' });
              ctx.save();
              ctx.globalCompositeOperation = 'saturation';
              ctx.fillStyle = '#777777';
              ctx.fillRect(820, top, 460, bot - top);
              ctx.restore();
              if (t > 88) {
                CE.cineGlow(ctx, 1080, bot - 120, 90, 'rgba(239,68,68,0.8)', 1 - seg(t, 88, 140) * 0.5);
                CE.zselStamp(ctx, 'CRACK', 1060, top + 80, 50, '#fecaca', t, 88, 3);
              }
              CE.finFillPat(ctx, 'dots', 820, top, 460, bot - top, 0.25);
              CE.finKicker(ctx, 880, bot - 50, 'UM ANO ATRÁS', seg(t, 66, 96), '#fca5a5');
            }, { dx: (1 - kp) * 460, border: '#e5e5e5' });
          }
          beats.forEach((b, i) => CE.cineSfx(S, b, 'tum' + i, () => window.SFX?.kick?.(0.15)));
        } else {
          const u = t - cut;
          const hit = 64;
          const decide = u >= hit;
          const chi = cdOf(K, 'chigiri');
          eyeBand(ctx, S, chi, { k: seg(u, 0, 12), y0: top + 40, y1: top + 230, dw: 1300, bg: '#0b0206', dim: 0.08, dimTint: '30,4,10', eyes: { ring: '#f472b6', iris: '#831843', tiny: !decide, look: decide ? 0 : [0, 1, 0, -1][Math.floor(u / 2) % 4], angry: decide, glow: 'rgba(244,63,94,0.5)', glowA: decide ? 1 : 0.2, shine: decide ? 0.9 : 0 } });
          // na decisão, as correntes estouram
          const gone = 1 - seg(u, hit + 22, hit + 52);
          if (decide && gone > 0) {
            const snap = 0.3 + 0.7 * E(seg(u, hit, hit + 34));
            ctx.save();
            ctx.globalAlpha = gone;
            const big = { link: 58, thick: 15, color: '#6b7280', shine: '#e2e8f0', snap };
            CE.foxcChain(ctx, -80, bot - 150, W + 80, bot - 30, Object.assign({ t: u, cut: 0.46 }, big));
            CE.foxcChain(ctx, -80, bot - 30, W + 80, bot - 160, Object.assign({ t: u + 3, cut: 0.55 }, big));
            ctx.restore();
          }
          CE.cineImpactText(ctx, 'SE QUEBRAR, QUEBROU.', 640, bot - 56, 78, CHI_C, seg(u, hit, hit + 10), W * 0.86, -0.03);
          if (decide) CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(u, hit, hit + 12)), '#ffe4e6');
          CE.cineSfx(S, cut + hit, 'decide', () => window.SFX?.kick?.(1));
        }
      } else if (phase === 2) {
        const cut = 36;
        if (t < cut) {
          const e = eyesAt(K, CHI_AT[0], CHI_AT[1]);
          if (e) CE.zselHairStreaks(ctx, e.x - 6 * e.u, e.y - 4 * e.u, t, 700, '190,18,60', 9, 120);
          ctx.save();
          ctx.globalAlpha = 1 - seg(t, 16, cut);
          CE.foxcChain(ctx, W * 0.14, H * 0.8, W * 0.86, H * 0.7, { t, snap: 0.45 + 0.55 * seg(t, 0, cut), cut: 0.5, link: 50, thick: 13, color: '#6b7280', shine: '#e2e8f0' });
          ctx.restore();
          CE.cineImpactText(ctx, 'DASH!!', W * 0.78, top + 110, 110, '#e11d48', seg(t, 0, 8), 0, -0.1);
          CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, 0, 10)));
          CE.cineSfx(S, 0, 'dash', () => window.SFX?.whoosh?.());
        } else {
          const u = t - cut;
          const cy = lerp(18.6, 8.8, u / (dur - cut));
          ctx.fillStyle = 'rgba(40,2,10,0.22)';
          ctx.fillRect(0, top, W, bot - top);
          CE.ptdSpeed(ctx, S, u, '#fda4af', 0.45, -1, 70, 26, top + 10, bot - 10, 3);
          CE.ptdSpeed(ctx, S, u, '#ffffff', 0.2, -1, 80, 12, top + 10, bot - 10, 11);
          const e = eyesAt(K, 46.8, cy);
          if (e) CE.zselHairStreaks(ctx, e.x - 6 * e.u, e.y - 3 * e.u, u, 620, '226,55,79', 8, 60);
          CE.zselStamp(ctx, 'MAIS RÁPIDO QUE TODOS.', 640, top + 70, 52, '#ffe4e6', u, 90, 2, W * 0.86);
          CE.ptdChip(ctx, 'HYOMA CHIGIRI', 30, bot - 40, CHI_C, seg(u, 4, 16), { size: 15, left: true });
          CE.cineSfx(S, cut + 20, 'vento', () => window.SFX?.whoosh?.());
        }
      } else if (phase === 3) {
        const cut = 80;
        if (t < cut) {
          ctx.fillStyle = 'rgba(40,2,12,0.18)';
          ctx.fillRect(0, top, W, bot - top);
          const e = eyesAt(K, 50.3, 9.0);
          if (e) CE.zselHairStreaks(ctx, e.x - 6 * e.u, e.y - 3 * e.u, t, 600, '226,55,79', 7, 90);
          if (t >= 64) {
            kickFx(ctx, S, K, [50.6, 8.75, 0.05], t, 64, CHI_C);
            CE.cineImpactText(ctx, 'VAI!!', W * 0.76, top + 110, 100, CHI_C, seg(t, 64, 71), 0, -0.1);
            CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, 64, 72)));
          }
          CE.cineSfx(S, 64, 'chute', () => window.SFX?.kick?.(1));
        } else {
          const u = t - cut;
          if (u >= 24) {
            CE.cineFlash(ctx, W, H, 0.7 * (1 - seg(u, 24, 32)));
            CE.cineImpactText(ctx, 'GOOOOL!!', W * 0.5, top + 112, 112, CHI_C, seg(u, 24, 34), W * 0.7, -0.05);
          }
          CE.cineSfx(S, cut + 24, 'rede', () => window.SFX?.goal?.(true));
        }
      } else {
        CE.cineDust(ctx, W, H, t, 30, 'rgba(255,228,230,0.5)', 17);
        // o joelho inteiro e a corrente partida largada no chão
        const kp = E(seg(t, 80, 96)) * (1 - seg(t, 140, 156));
        if (kp > 0) {
          const p = K.screen(50.6, 0.02, 9.35);
          if (p) {
            ctx.save();
            ctx.globalAlpha = kp;
            CE.foxcChain(ctx, p.x - 260, p.y + 10, p.x + 200, p.y + 30, { snap: 0.22, cut: 0.5, link: 28, thick: 7, color: '#6b7280', shine: '#e2e8f0' });
            ctx.restore();
          }
          const q = K.screen(50.6, 0.24, 9.2);
          if (q) CE.cineGlow(ctx, q.x, q.y, 140, 'rgba(255,228,230,0.3)', kp);
        }
        const e = eyesAt(K, 50.6, 9.2);
        if (e) CE.cineGlow(ctx, e.x, e.y, 8 * e.u, 'rgba(244,63,94,0.3)', seg(t, 150, 190));
        CE.zselStamp(ctx, '...NÃO QUEBROU.', 640, top + 60, 52, '#ffe4e6', t, 24, 3, W * 0.8, 'center', 1 - seg(t, 160, 180));
        if (t > 200) CE.cineImpactText(ctx, 'O RELÂMPAGO VERMELHO', 640, top + 64, 56, CHI_C, seg(t, 200, 210), W * 0.8, -0.03);
      }
    }
  }));
})();
