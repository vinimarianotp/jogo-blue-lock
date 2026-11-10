// ============================================================================
// CUTSCENES EM 3D — começo da história (js/cine_inicio.js refeito no 3D)
// Kit: js/cine3d_kit.js. Mesmos planos, tempos e legendas da versão 2D.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;

  // ---------------------------------------------------------------- O DISCURSO DE JINPACHI EGO
  // Auditório = saguão do prédio cheio de atacantes, o Ego num palco na frente do telão
  let CROWD = null;
  const crowd = () => {
    if (CROWD) return CROWD;
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = A.CREATOR_SKIN || ['#f3d1b8'];
    const cols = A.CREATOR_HAIR_COLORS || ['#1b2340'];
    let s = 7;
    const rnd = (n) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % n);
    CROWD = [];
    for (let row = 0; row < 5; row++) {
      for (let i = 0; i < 12; i++) {
        const x = 18.0 + i * 1.22 + (row % 2) * 0.6;
        const y = 15.95 + row * 1.0;
        if (x > 32.5 || (Math.abs(x - 21.5) < 0.65 && y > 16.8 && y < 18.2) || (Math.abs(x - 28.5) < 0.65 && y > 16.8 && y < 18.2)) continue;
        if (row === 0 && Math.abs(x - 25) < 0.7) continue; // o seu lugar
        CROWD.push({ x, y, row, cd: { name: 'atacante' + CROWD.length, skinColor: skins[rnd(skins.length)], hairColor: cols[rnd(cols.length)], hairSecondary: cols[rnd(cols.length)], eyeColor: '#1e293b', hairStyle: hairs[rnd(hairs.length)], jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8', number: 1 + rnd(299) } });
      }
    }
    return CROWD;
  };
  const YOU = [25, 16.0];
  const EGO_AT = [25, 10.05];

  CE.registerCine3D('ego_speech', {
    phases: [170, 200, 110, 220, 180],
    music: 'dread',
    title: '🎙️ O DISCURSO DE JINPACHI EGO',
    tags: ['PLANO 1 • 300 ATACANTES', 'PLANO 2 • JINPACHI EGO', 'PLANO 3 • O OLHAR', 'PLANO 4 • 300 → 1', 'PLANO 5 • O EGO DESPERTA'],
    subs: [
      [{ from: 8, text: 'Ninguém sabe por que foi chamado.' }],
      [{ from: 12, who: 'JINPACHI EGO', text: '"Quero o atacante MAIS EGOÍSTA."', color: '#a5f3fc' }],
      [],
      [{ from: 6, who: 'JINPACHI EGO', text: '"Os 299 NUNCA mais jogam pelo Japão."', color: '#a5f3fc' }],
      [{ from: 8, who: 'VOCÊ', text: '(Aquela trave... nunca mais.)', color: '#00f5d4' }]
    ],
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, dur } = S;
      const k = t / dur;
      K.expo(0.82);
      // palco do Ego e o holofote nele
      K.box({ x0: 23.4, y0: 9.35, x1: 26.6, y1: 10.75, z0: 0, z1: 0.26, color: '#0b1220', top: '#111c33' });
      K.floor({ x0: 23.6, y0: 9.5, x1: 26.4, y1: 10.6, z: 0.265, color: '#22d3ee', alpha: 0.12, em: true });
      // a plateia (no plano 4 vai sumindo: 300 → 1)
      const gone = phase === 4 ? 1 : phase === 3 ? K.seg(t, 40, 190) : 0;
      crowd().forEach((c, i) => {
        const order = ((i * 37) % crowd().length) / crowd().length;
        const a = gone > order ? Math.max(0, 1 - (gone - order) * 8) : 1;
        if (a <= 0.02) return;
        K.actor(c.cd, { id: i, x: c.x, y: c.y, face: EGO_AT, frame: 0, alpha: a, k: 0.86 });
      });
      // você na primeira fila
      const you = K.actor('you', { x: YOU[0], y: YOU[1], face: phase === 4 ? [25, 12] : EGO_AT, anim: 'idle', light: phase === 4 && t > 60 ? [1.25, 1.55, 1.6] : undefined, k: 0.88 });
      // o Ego no palco
      K.actor('EGO', { x: EGO_AT[0], y: EGO_AT[1], z: 0.26, ang: Math.PI / 2, k: 0.95, light: phase === 2 ? '#7dd3fc' : undefined });
      void you;
      if (phase === 0) {
        // grua por cima da plateia, entrando devagar até o palco
        const e = K.easeIO(k);
        K.cam(K.mix([25, 1.62, 20.75], [25, 1.48, 18.9], e), [25, 0.7, 10.2], 52);
      } else if (phase === 1) {
        // contra-plongée: o Ego visto de baixo, a câmera subindo pelo palco
        const e = K.easeIO(k);
        K.cam(K.mix([24.2, 0.32, 12.6], [24.7, 0.42, 12.0], e), [25, 0.95, 10.0], 46);
      } else if (phase === 2) {
        // O OLHAR: close nos olhos do Ego (lente fechada, tremidinha)
        const n = K.noise(S.f, 2) * 0.004;
        K.cam([25 + n, 0.92, 11.75 - k * 0.15], [25, 0.86, 10.05], 30);
      } else if (phase === 3) {
        // 300 → 1: plano alto, a plateia sumindo em volta de você
        const e = K.easeIO(k);
        K.cam(K.mix([25, 1.66, 20.75], [25.6, 1.66, 20.6], e), [25, 0, 16.6], 58);
      } else {
        // O EGO DESPERTA: de frente para você, chegando perto
        const e = K.ease(k);
        K.cam(K.mix([25, 1.3, 12.0], [25, 1.25, 12.6], e), [25, 0.66, YOU[1]], 24);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top } = S;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (phase === 0) {
        // contador da plateia
        const n = Math.min(300, Math.floor(K.ease(K.seg(t, 10, 120)) * 300));
        ctx.font = '900 64px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(248,250,252,0.92)';
        ctx.textAlign = 'right';
        ctx.fillText(String(n), W - 60, top + 70);
        ctx.font = '800 14px "Segoe UI", sans-serif';
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText('ATACANTES SUB-18', W - 60, top + 112);
      } else if (phase === 1 && t > 70) {
        // "EGOÍSTA" gigante atrás do Ego
        const a = K.seg(t, 70, 100);
        ctx.globalAlpha = a * 0.85;
        ctx.font = `italic 900 ${Math.round(H * 0.16)}px "Segoe UI", sans-serif`;
        ctx.fillStyle = '#22d3ee';
        ctx.fillText('EGOÍSTA', W / 2, top + H * 0.2);
      } else if (phase === 2) {
        // cartela do nome
        const a = K.seg(t, 20, 40);
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(2,6,23,0.8)';
        ctx.fillRect(40, H * 0.62, 360, 70);
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(40, H * 0.62, 6, 70);
        ctx.textAlign = 'left';
        ctx.font = '900 30px "Segoe UI", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('JINPACHI EGO', 62, H * 0.62 + 28);
        ctx.font = '700 14px "Segoe UI", sans-serif';
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText('CRIADOR DO PROJETO BLUE LOCK', 62, H * 0.62 + 52);
      } else if (phase === 3) {
        const n = Math.max(1, 300 - Math.floor(K.easeIO(K.seg(t, 40, 190)) * 299));
        ctx.font = '900 80px "Segoe UI", sans-serif';
        ctx.fillStyle = n === 1 ? '#facc15' : '#f8fafc';
        ctx.fillText(String(n), W / 2, top + 64);
        if (t > 190) {
          ctx.globalAlpha = K.seg(t, 190, 205);
          ctx.font = 'italic 900 34px "Segoe UI", sans-serif';
          ctx.fillStyle = '#facc15';
          ctx.fillText('SÓ 1 SOBREVIVE.', W / 2, top + 120);
        }
      } else if (phase === 4) {
        // linhas de velocidade e a frase
        if (t > 40) CE.drawRadialSpeedLines(ctx, W / 2, H * 0.45, W, '#00f5d4', 0.18 * K.seg(t, 40, 70));
        if (t > 90) {
          ctx.globalAlpha = K.seg(t, 90, 110);
          ctx.font = 'italic 900 44px "Segoe UI", sans-serif';
          ctx.fillStyle = '#00f5d4';
          ctx.fillText('EU VOU SER ESSE 1.', W / 2, top + 70);
        }
      }
      ctx.restore();
    }
  });

  // ======================================================================
  // AJUDANTES do prólogo, da porta e do pique-pega
  // ======================================================================
  const seg = (t, a, b) => CE.cineSeg(t, a, b);
  const E = (x) => CE.cineEase(x);
  const EIO = (x) => CE.cineEaseInOut(x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const name = () => CE.cinePlayerName();
  const PI = Math.PI;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mixc = (a, b, k) => rgb(a).map((v, i) => v + (rgb(b)[i] - v) * Math.max(0, Math.min(1, k)));
  // canvas pintado uma vez só (cenário, placa, telão); redesenhar = chamar fn de novo + dirty
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
  // Olhos de um ator na tela (para efeitos do overlay em cima do 3D): centro entre os
  // olhos e quantos px vale 1 unidade da pixel art (o boneco tem 36 unidades)
  const eyesAt = (K, x, y, z = 0, k = 0.9) => {
    const u = (2 * k) / 66;
    const h = z + (31.2 - SPRITE_MAPY(10.1)) * u;
    const a = K.screen(x, h, y);
    const b = K.screen(x, h + u, y);
    if (!a || !b) return null;
    return { x: a.x, y: a.y, u: Math.abs(a.y - b.y) };
  };
  // Faixa de close nos olhos: pixel art 2D por cima do 3D (como a versão 2D fazia)
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
  // Figurantes (atacantes do Blue Lock) com cara/cabelo sorteados
  const extras = (n, seed, kit) => {
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = A.CREATOR_SKIN || ['#f3d1b8'];
    const cols = A.CREATOR_HAIR_COLORS || ['#1b2340'];
    let s = seed;
    const rnd = (m) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % m);
    const out = [];
    for (let i = 0; i < n; i++) out.push({ name: 'figurante' + seed + '_' + i, skinColor: skins[rnd(skins.length)], hairColor: cols[rnd(cols.length)], hairSecondary: cols[rnd(cols.length)], eyeColor: '#1e293b', hairStyle: hairs[rnd(hairs.length)], jerseyPrimary: kit.jerseyPrimary, jerseySecondary: kit.jerseySecondary, number: 1 + rnd(299) });
    return out;
  };

  // ======================================================================
  // PRÓLOGO • A FINAL REGIONAL (campo do colégio ao pôr do sol)
  // Você ataca o gol norte do campo; o Tada vem livre pela direita (leste)
  // ======================================================================
  const ICHINAN = { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' };
  const MATSUKAZE = { jerseyPrimary: '#f1f5f9', jerseySecondary: '#2563eb' };
  const KEEPER = { jerseyPrimary: '#15803d', jerseySecondary: '#0f172a' };
  const tadaCd = () => Object.assign({}, CE.getSpeakerCharData('TADA'), ICHINAN, { number: 9 });
  const YOU_P = [52.6, 10.4];
  const TADA_P = [55.2, 9.2];
  // sala dos monitores (montada no vazio, fora do prédio)
  const MON = { x: 86, y: 14.5 };
  let MONI = null;
  const monitorWall = () => {
    if (MONI && MONI.run === CE._cineRun) return MONI;
    const wall = paint(440, 240, (g, w, h) => {
      g.fillStyle = '#02050c';
      g.fillRect(0, 0, w, h);
      for (let r = 0; r < 4; r++) {
        for (let i = 0; i < 7; i++) {
          const x = 6 + i * 62;
          const y = 6 + r * 58;
          g.fillStyle = '#071226';
          g.fillRect(x, y, 56, 52);
          g.fillStyle = 'rgba(56,189,248,0.35)';
          for (let k = 0; k < 4; k++) g.fillRect(x + 5, y + 8 + k * 10, 46 * (0.3 + 0.7 * Math.abs(Math.sin(i * 3 + r * 7 + k))), 4);
          g.strokeStyle = 'rgba(34,211,238,0.7)';
          g.lineWidth = 2;
          g.strokeRect(x + 1, y + 1, 54, 50);
        }
      }
    });
    // o replay pausado no passe
    const you = CE.cineYou(ICHINAN);
    const tada = tadaCd();
    const rep = paint(400, 240, (g, w, h) => {
      CE.cineGradient(g, 0, 0, w, h, [[0, '#5b6b2a'], [1, '#1f3a10']]);
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 3;
      g.strokeRect(w * 0.62, h * 0.2, w * 0.5, h * 0.6);
      CE.drawSprite(g, you, w * 0.28, h * 0.84, 110, { animState: 'shoot', frame: 4 });
      CE.drawSprite(g, tada, w * 0.72, h * 0.74, 88, { animState: 'call_pass', flipX: true, frame: 4 });
      g.setLineDash([10, 8]);
      g.strokeStyle = '#facc15';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(w * 0.36, h * 0.82);
      g.lineTo(w * 0.66, h * 0.72);
      g.stroke();
      g.setLineDash([]);
      g.strokeStyle = '#ef4444';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(w * 0.28, h * 0.56, 46, 0, PI * 2);
      g.stroke();
      g.fillStyle = 'rgba(0,0,0,0.22)';
      for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
      g.font = '900 13px "Segoe UI", sans-serif';
      g.textBaseline = 'top';
      g.fillStyle = '#f8fafc';
      g.fillText('❚❚  REPLAY • 89:41 • ICHINAN x MATSUKAZE', 10, 8);
      g.strokeStyle = '#22d3ee';
      g.lineWidth = 6;
      g.strokeRect(0, 0, w, h);
    });
    MONI = { wall, rep, run: CE._cineRun };
    return MONI;
  };

  CE.registerCine3D('prologue_tada_miss', semEnfeites({
    phases: [170, 150, 140, 160, 150, 170],
    music: 'tension',
    title: '⚽ PRÓLOGO • A FINAL REGIONAL',
    tags: ["PLANO 1 • 89' — A ARRANCADA", 'PLANO 2 • O DILEMA', 'PLANO 3 • O PASSE', 'PLANO 4 • A TRAVE', 'PLANO 5 • ELIMINADOS', 'PLANO 6 • ALGUÉM ESTAVA ASSISTINDO'],
    get subs() {
      return [
        [{ from: 6, text: `Final Regional: a bola é de ${name()}.` }],
        [{ from: 48, who: 'TADA', text: '"UM POR TODOS!"', color: '#60a5fa' }],
        [{ from: 0, who: 'VOCÊ', text: '(Passar é o certo... né?)', color: '#00f5d4' }],
        [
          { from: 0, to: 84, text: 'Goleiro batido...' },
          { from: 84, text: 'Na trave.' }
        ],
        [{ from: 4, who: 'VOCÊ', text: '(...e se eu tivesse chutado?)', color: '#00f5d4' }],
        [{ from: 6, who: 'JINPACHI EGO', text: '"Passou? Que desperdício."', color: '#a5f3fc' }]
      ];
    },
    theme: 'school_sunset',
    scene(K, S) {
      const { t, phase, dur } = S;
      const k = t / dur;
      const hand = (s, a = 0.012) => K.noise(S.f * 0.6, s) * a;
      K.expo(0.95);
      if (phase === 0) {
        // a arrancada: travelling de lado acompanhando você com a bola até a área
        const yy = lerp(20.6, 10.6, k);
        const hop = Math.sin(seg(t, 52, 82) * PI) * 0.24;
        K.actor('you', { extra: ICHINAN, x: YOU_P[0], y: yy, z: hop, face: [YOU_P[0], 6], anim: 'run' });
        const chip = Math.sin(seg(t, 114, 136) * PI) * 0.32;
        K.ball(YOU_P[0] + 0.04, yy - 0.34 - Math.abs(Math.sin(t * 0.45)) * 0.05 - seg(t, 114, 136) * 0.15, 0.05 + hop * 0.9 + chip);
        // zagueiro 1: vem de frente e dá o carrinho por baixo do seu pulo
        const d1 = t < 48 ? lerp(14.2, 16.2, t / 48) : 16.2 + E(seg(t, 48, 80)) * 1.7;
        K.actor('ishikari', { extra: MATSUKAZE, x: YOU_P[0] - 0.12, y: d1, face: [YOU_P[0], 24], anim: t < 48 ? 'run' : 'slide', frame: t < 48 ? S.f : 4 });
        // zagueiro 2: estica a perna; a bola passa por cima (cavadinha)
        const d2 = t < 104 ? lerp(11.2, 12.9, t / 104) : 12.9;
        K.actor('shiguma', { extra: MATSUKAZE, x: YOU_P[0] + 0.18, y: d2, face: [YOU_P[0] + 0.4, 24], anim: t < 104 ? 'run' : t < 132 ? 'shoot' : 'idle', frame: t < 104 ? S.f : 4 });
        // o goleiro saindo do gol
        if (t > 120) K.actor('fukaku', { extra: KEEPER, x: 53.0, y: lerp(7.0, 8.4, E(seg(t, 120, 170))), face: [YOU_P[0], 14], anim: 'run' });
        const push = EIO(seg(t, 128, 170));
        K.cam([YOU_P[0] + 3.4 - push * 1.3 + hand(1), 0.6 + hand(2), yy + 0.9 - push * 0.2], [YOU_P[0] - 0.2, 0.42 + push * 0.04, yy - 0.8], 44 - push * 6);
      } else if (phase === 1) {
        const you = { extra: ICHINAN, x: YOU_P[0], y: YOU_P[1], face: [YOU_P[0], 6], anim: 'idle' };
        const gk = { extra: KEEPER, x: 52.9, y: lerp(7.2, 9.1, E(seg(t, 0, 150))), face: YOU_P, anim: 'run' };
        K.actor('you', you);
        if (t < 92) K.actor('fukaku', gk);
        K.ball(YOU_P[0] + 0.05, YOU_P[1] - 0.32, 0.05);
        K.actor(tadaCd(), { x: TADA_P[0] + 0.3, y: TADA_P[1] + 0.3, face: YOU_P, anim: t >= 46 ? 'call_pass' : 'run' });
        if (t < 46) {
          // por cima do ombro: o goleiro saindo em cima de você
          K.cam([53.4 + hand(3), 0.74, lerp(12.5, 12.2, t / 46)], [52.7, 0.5, 8.4], 36);
        } else if (t < 92) {
          // o Tada livre, braço pra cima
          const e = E(seg(t, 46, 92));
          K.cam([lerp(53.5, 53.75, e) + hand(4), 0.42, lerp(10.9, 10.75, e)], [TADA_P[0] + 0.3, 0.55, TADA_P[1] + 0.3], 40);
        } else {
          // o seu rosto: o coração batendo no enquadramento
          const beat = Math.pow(Math.max(0, Math.sin(t * 0.21)), 12);
          K.cam([YOU_P[0] + 0.25 + hand(5, 0.006), 0.66, YOU_P[1] - 1.85], [YOU_P[0], 0.78, YOU_P[1]], 40 - beat * 1.5);
        }
      } else if (phase === 2) {
        // o passe: a câmera chicoteia acompanhando a bola até o Tada, que chuta torto
        const yState = t < 14 ? 'windup' : t < 34 ? 'shoot' : 'idle';
        K.actor('you', { extra: ICHINAN, x: YOU_P[0], y: YOU_P[1], face: TADA_P, anim: yState, frame: t < 34 ? 4 : S.f });
        const tState = t < 84 ? 'run' : t < 96 ? 'windup' : t < 124 ? 'shoot' : 'idle';
        const tx = t < 84 ? lerp(56.4, TADA_P[0], seg(t, 0, 84)) : TADA_P[0];
        const ty = t < 84 ? lerp(10.6, TADA_P[1], seg(t, 0, 84)) : TADA_P[1];
        K.actor(tadaCd(), { x: tx, y: ty, face: t < 84 ? YOU_P : [52, 6.6], anim: tState, frame: tState === 'run' || tState === 'idle' ? S.f : 4 });
        K.actor('fukaku', { extra: KEEPER, x: 52.8, y: 8.4, face: [tx, ty], anim: 'idle' });
        let b;
        if (t < 18) b = [YOU_P[0] + 0.2, YOU_P[1] - 0.2, 0.05];
        else if (t < 92) {
          const e = E(seg(t, 18, 90));
          b = [lerp(YOU_P[0] + 0.25, TADA_P[0] - 0.25, e), lerp(YOU_P[1] - 0.2, TADA_P[1] + 0.05, e), 0.05];
        } else {
          const e = seg(t, 96, 140);
          b = [lerp(TADA_P[0] - 0.25, 52.4, e), lerp(TADA_P[1], 6.9, e), 0.05 + Math.sin(e * PI * 0.8) * 0.5];
        }
        K.ball(b[0], b[1], b[2]);
        const pan = EIO(seg(t, 24, 80));
        const after = EIO(seg(t, 96, 140));
        K.cam([53.9 + hand(6), 0.58, 12.7 - after * 0.3], [lerp(YOU_P[0], TADA_P[0] - 0.3, pan) - after * 1.2, 0.45, lerp(YOU_P[1], TADA_P[1], pan) - after * 1.4], 40);
      } else if (phase === 3) {
        // de dentro do gol: a bola vem em câmera lenta, curva... e explode na trave
        const hit = 72;
        const fr = 24;
        const tt = t < hit ? t : t < hit + fr ? hit : t - fr;
        const after = Math.max(0, tt - hit);
        const kd = E(seg(tt, 6, 90));
        K.actor('fukaku', { extra: KEEPER, x: lerp(53.0, 53.7, kd), y: 7.7, z: Math.sin(Math.min(1, kd * 1.2) * PI) * 0.22, face: [53, 14], anim: kd > 0.05 ? 'dive' : 'idle', frame: 4, left: false });
        K.actor(tadaCd(), { x: TADA_P[0], y: TADA_P[1], face: [52, 6.6], anim: 'shoot', frame: 4 });
        let b;
        if (tt < hit) {
          const e = E(seg(tt, 0, hit));
          const p0 = [TADA_P[0] - 0.6, TADA_P[1] - 0.5, 0.2];
          const p1 = [54.6, 7.6, 0.75];
          const p2 = [52.08, 6.75, 0.55];
          b = [0, 1, 2].map((i) => (1 - e) * (1 - e) * p0[i] + 2 * (1 - e) * e * p1[i] + e * e * p2[i]);
        } else b = [52.08 + after * 0.01, 6.75 + after * 0.05, Math.max(0.05, 0.55 + after * 0.012 - after * after * 0.0009)];
        K.ball(b[0], b[1], b[2]);
        const sh = t >= hit ? 0.03 * Math.max(0, 1 - (t - hit) / 40) : 0;
        const zoom = t < hit ? seg(t, 0, hit) * 6 : 6;
        K.cam([53.0 + K.noise(S.f * 3, 1) * sh, 0.5 + K.noise(S.f * 3, 2) * sh, 6.15], [52.5, 0.5, 8.4], 70 - zoom);
      } else if (phase === 4) {
        // fim de jogo: você de costas, eles comemorando lá longe; o céu escurece
        const push = E(seg(t, 0, 150));
        K.sky(mixc('#312e81', '#0b0a24', push), mixc('#c2410c', '#4a2f5e', push), 0.4 * push);
        K.expo(0.86 - push * 0.16);
        ['ishikari', 'shiguma', 'tanaka', 'sokura', 'fukaku'].forEach((id, i) => {
          const x = 50.4 + i * 1.25;
          const jump = Math.abs(Math.sin(t * 0.16 + i * 1.3)) * 0.18;
          K.actor(id, { extra: id === 'fukaku' ? KEEPER : MATSUKAZE, x, y: 8.6 + (i % 2) * 0.6, z: jump, face: [x + (i % 2 ? 0.6 : -0.6), 14], anim: i % 2 ? 'call_pass' : 'celebrate', frame: S.f + i * 9 });
        });
        K.actor(tadaCd(), { x: 51.6, y: 11.4, face: [52.4, 15], anim: 'idle', frame: 4 });
        K.actor('you', { extra: ICHINAN, x: 53.15, y: 13.3, face: [53, 8], anim: 'idle', frame: 4, light: [0.5, 0.42, 0.5] });
        K.cam([53.55 - push * 0.15, 0.66, 15.1 - push * 0.35], [53.0, 0.52, 10.2], 40);
      } else {
        // a sala dos monitores: o Ego parado no replay do passe
        const M = monitorWall();
        const cut = 84;
        K.sky('#000000', '#02050c', 0);
        K.fog('#02040a', 0.06);
        K.ambient('#4a86a8');
        K.expo(0.9);
        K.floor({ x0: MON.x - 6, y0: MON.y - 1, x1: MON.x + 6, y1: MON.y + 7, color: '#050b16' });
        K.quad({ x: MON.x, y: MON.y, z: 0.15, w: 4.4, h: 2.4, ang: -PI / 2, img: M.wall, em: true, color: '#9fb8cc' });
        K.quad({ x: MON.x - 0.3, y: MON.y + 0.03, z: 0.75, w: 2.0, h: 1.2, ang: -PI / 2, img: M.rep, em: true });
        K.box({ x0: MON.x - 1.6, y0: MON.y + 1.25, x1: MON.x + 1.4, y1: MON.y + 1.6, z0: 0, z1: 0.4, color: '#0a1424', top: '#13233b' });
        const egoP = [MON.x + 0.55, MON.y + 2.1];
        K.actor('EGO', { x: egoP[0], y: egoP[1], face: t < cut ? [MON.x, MON.y] : [MON.x + 0.4, MON.y], k: 0.95, anim: 'idle', frame: 4, light: [0.42, 0.78, 0.95] });
        if (t < cut) {
          const push = EIO(seg(t, 0, cut));
          K.cam([lerp(MON.x + 1.4, MON.x + 1.0, push), lerp(1.0, 1.1, push), lerp(MON.y + 4.6, MON.y + 3.7, push)], [lerp(MON.x + 0.2, MON.x - 0.3, push), 1.15, MON.y], 44);
        } else {
          const e = E(seg(t, cut, dur));
          K.cam([MON.x + 0.35, 0.6, MON.y + 0.32 - e * 0.04], [egoP[0], 0.56, egoP[1]], 40 - e * 3);
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot, stageH } = S;
      if (phase === 0) {
        CE.drawSpeedLines(ctx, W, H, '#ffedd5', 0.1);
        if (t > 60 && t < 84) CE.cineImpactText(ctx, 'PASSOU UM!', W * 0.66, top + 90, 46, '#fef3c7', seg(t, 60, 70), 0, -0.08);
        if (t > 122 && t < 146) CE.cineImpactText(ctx, 'PASSOU DOIS!', W * 0.66, top + 90, 46, '#fef3c7', seg(t, 122, 132), 0, -0.08);
        if (t > 146) CE.cineImpactText(ctx, 'CARA A CARA!', W * 0.5, top + stageH * 0.2, 84, '#facc15', seg(t, 146, 158), W * 0.8, -0.05);
        CE.inicioScore(ctx, 28, top + 18, 'ICHINAN', 0, 'MATSUKAZE', 0, "89'", seg(t, 4, 18));
        CE.cineSfx(S, 66, 'tackle', () => window.SFX?.tackle());
        CE.cineSfx(S, 124, 'chip', () => window.SFX?.pass());
      } else if (phase === 1) {
        if (t >= 46 && t < 92) {
          CE.drawRadialSpeedLines(ctx, W * 0.5, H * 0.45, W, '#fff7ed', 0.16);
          CE.cineImpactText(ctx, 'PASSA PRA MIM!!', W * 0.72, top + 90, 46, '#f8fafc', seg(t, 58, 68), W * 0.5, -0.06);
        }
        if (t >= 92) {
          // close nos seus olhos (pixel art), o suor e o coração batendo
          const you = K.charData('you', { extra: ICHINAN });
          const look = t < 120 ? 0 : 2;
          eyeBand(ctx, S, you, { k: seg(t, 92, 104), y0: top + 18, y1: top + stageH * 0.33, dw: 1000, bg: '#4c2a5e', shade: 'rgba(10,6,30,0.25)', eyes: { ring: you.eyeColor || '#ef4444', iris: '#020617', look, tiny: t > 120 && t < 136 }, after: (U, ey, cx) => {
            const dy = (t % 90) * 1.4;
            ctx.fillStyle = '#e0f2fe';
            ctx.fillRect(cx + 6.6 * U, ey - 2.4 * U + dy * 0.6, U * 0.5, U * 0.8);
          } });
          if (t > 104) CE.cineImpactText(ctx, 'TUM... TUM...', W * 0.26, bot - 60, 34, '#fca5a5', seg(t, 104, 114), 0, -0.05);
        }
      } else if (phase === 2) {
        const panSpeed = Math.sin(seg(t, 24, 80) * PI);
        if (panSpeed > 0.05) CE.drawSpeedLines(ctx, W, H, '#fff7ed', 0.22 * panSpeed);
        if (t > 96) CE.cineImpactText(ctx, 'TOC...', W * 0.8, top + stageH * 0.72, 54, '#cbd5e1', seg(t, 96, 106), 0, 0.12);
        CE.cineSfx(S, 16, 'pass', () => window.SFX?.pass());
        CE.cineSfx(S, 96, 'kick', () => window.SFX?.kick(0.5));
      } else if (phase === 3) {
        const hit = 72;
        const fr = 24;
        const p = K.screen(52.0, 0.55, 6.75) || { x: W * 0.72, y: top + stageH * 0.4 };
        if (t >= hit) {
          const kk = (t - hit) / 50;
          ctx.save();
          ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.8 - kk)})`;
          ctx.lineWidth = 5;
          for (let r = 0; r < 3; r++) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 30 + r * 34 + kk * 120, -PI * 0.8, PI * 0.8, true);
            ctx.stroke();
          }
          ctx.restore();
        }
        if (t >= hit && t < hit + fr) {
          ctx.fillStyle = 'rgba(30,58,138,0.32)';
          ctx.fillRect(0, top, W, stageH);
          CE.drawRadialSpeedLines(ctx, p.x, p.y, W, '#020617', 0.5);
        }
        CE.cineFlash(ctx, W, H, t >= hit ? 0.85 * (1 - (t - hit) / 8) : 0);
        if (t >= hit) CE.cineImpactText(ctx, 'CLANG!!', W * 0.42, top + stageH * 0.3, 120, '#f8fafc', seg(t, hit, hit + 8), W * 0.6, -0.1);
        CE.cineSfx(S, hit, 'post', () => window.SFX?.post());
      } else if (phase === 4) {
        CE.inicioScore(ctx, W / 2 - 200, top + 18, 'ICHINAN', 0, 'MATSUKAZE', 1, 'FIM', seg(t, 4, 16), 1);
        if (t > 40) CE.cineImpactText(ctx, 'ELIMINADOS.', W * 0.7, top + stageH * 0.3, 72, '#cbd5e1', seg(t, 40, 54), W * 0.5, -0.04);
        if (t >= 112) {
          // a rachadura sai da sua cabeça (o ego quebrando a casca)
          const e = eyesAt(K, 53.15, 13.3) || { x: W * 0.45, y: top + stageH * 0.5 };
          const sh = CE.getShards(W, H, e.x, e.y);
          CE.drawCracks(ctx, sh, Math.min(sh.rings, 1 + Math.floor((t - 112) / 5)));
          CE.cineFlash(ctx, W, H, 0.7 * (1 - (t - 112) / 6));
          CE.cineImpactText(ctx, 'CRACK', W * 0.2, top + stageH * 0.22, 64, '#f8fafc', seg(t, 112, 120), 0, -0.12);
        }
        CE.cineSfx(S, 4, 'whistle', () => window.SFX?.whistle(3));
        CE.cineSfx(S, 112, 'crack', () => window.SFX?.tackle());
      } else {
        const cut = 84;
        if (t >= cut) {
          const kk = t - cut;
          // os óculos viram espelho com o brilho correndo
          const e = eyesAt(K, MON.x + 0.55, MON.y + 2.1, 0, 0.95);
          if (e) {
            const u = e.u;
            const lensY = e.y - (SPRITE_MAPY(10.1) - SPRITE_MAPY(9.2)) * u;
            const a = seg(kk, 6, 18);
            ctx.save();
            ctx.globalAlpha = a;
            [-1, 1].forEach((s) => {
              const lx = e.x + s * 2.7 * u - 1.2 * u;
              ctx.fillStyle = 'rgba(224,242,254,0.92)';
              ctx.fillRect(lx, lensY, 2.4 * u, 2.0 * u);
              ctx.save();
              ctx.beginPath();
              ctx.rect(lx, lensY, 2.4 * u, 2.0 * u);
              ctx.clip();
              const gx = lx + lerp(-2 * u, 5 * u, seg(kk, 10, 40));
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.moveTo(gx, lensY);
              ctx.lineTo(gx + u, lensY);
              ctx.lineTo(gx - 0.2 * u, lensY + 2.2 * u);
              ctx.lineTo(gx - 1.2 * u, lensY + 2.2 * u);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            });
            ctx.restore();
            if (a > 0) CE.cineGlow(ctx, e.x, e.y, 90 * a, 'rgba(165,243,252,0.5)', a);
          }
          CE.cineGradient(ctx, 0, top + stageH * 0.55, W, stageH * 0.45, [[0, 'rgba(2,4,10,0)'], [1, 'rgba(2,4,10,0.92)']]);
          CE.cineTitleCard(ctx, W, top + stageH * 0.8, seg(kk, 34, 64), { kicker: 'CONVOCAÇÃO', title: 'PROJETO BLUE LOCK', sub: 'O seu ego começa agora.', color: '#00f5d4' });
        }
      }
    }
  }));

  // ======================================================================
  // A PORTA DO BLUE LOCK (montada no vazio; o corredor é a ala do treino do prédio)
  // ======================================================================
  const DR = { x: 86, y: 12, w: 2.6, h: 3.2 };
  let DOOR = null;
  const doorArt = (spin, force) => {
    if (!DOOR) {
      const full = paint(560, 680);
      DOOR = { full, L: paint(220, 600), R: paint(220, 600), spin: null };
      DOOR.wall = paint(256, 128, (g, w, h) => {
        CE.cineGradient(g, 0, 0, w, h, [[0, '#020617'], [0.7, '#06122b'], [1, '#0b1d3f']]);
        g.strokeStyle = 'rgba(56,189,248,0.16)';
        g.lineWidth = 1;
        for (let x = 0; x < w; x += 16) {
          g.beginPath();
          g.moveTo(x + 0.5, 0);
          g.lineTo(x + 0.5, h);
          g.stroke();
        }
        g.fillStyle = 'rgba(14,165,233,0.5)';
        g.fillRect(0, h - 6, w, 2);
      });
      DOOR.cone = paint(64, 160, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, 'rgba(191,219,254,0.85)');
        gr.addColorStop(1, 'rgba(191,219,254,0.1)');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(w / 2 - 4, 0);
        g.lineTo(w / 2 + 4, 0);
        g.lineTo(w, h);
        g.lineTo(0, h);
        g.closePath();
        g.fill();
      });
    }
    if (DOOR.spin === spin && !force) return false;
    DOOR.spin = spin;
    const g = DOOR.full.g;
    g.clearRect(0, 0, 560, 680);
    CE.inicioDoor(g, 280, 60, 440, 600, 0, 0, spin);
    DOOR.L.g.clearRect(0, 0, 220, 600);
    DOOR.L.g.drawImage(DOOR.full, 60, 60, 220, 600, 0, 0, 220, 600);
    DOOR.R.g.clearRect(0, 0, 220, 600);
    DOOR.R.g.drawImage(DOOR.full, 280, 60, 220, 600, 0, 0, 220, 600);
    return true;
  };
  let DOOR_CROWD = null;
  const doorCrowd = () => {
    if (DOOR_CROWD) return DOOR_CROWD;
    const cds = extras(40, 11, { jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8' });
    DOOR_CROWD = [];
    let i = 0;
    for (let row = 0; row < 4; row++) {
      for (let c = 0; c < 10; c++) {
        const x = 83.1 + c * 0.66 + (row % 2) * 0.33;
        const y = 17.9 + row * 0.85;
        if (Math.abs(x - 86.3) < 0.4 && row === 0) continue;
        DOOR_CROWD.push({ x, y, cd: cds[i++ % cds.length] });
      }
    }
    return DOOR_CROWD;
  };
  // monta a porta, a parede, o chão e a luz atrás dela (open 0..1)
  const doorSet = (K, open, spin, light = 1) => {
    const dirty = doorArt(spin);
    const half = DR.w / 2;
    const gap = open * half * 1.02;
    const x0 = DR.x - half;
    const x1 = DR.x + half;
    K.floor({ x0: DR.x - 8, y0: DR.y - 2, x1: DR.x + 8, y1: DR.y + 12, color: '#0b1d3f' });
    K.floor({ x0: DR.x - 0.03 - gap, y0: DR.y + 0.2, x1: DR.x + 0.03 + gap, y1: DR.y + 11, z: 0.008, color: '#a5f3fc', alpha: 0.25 + open * 0.4, em: true });
    // parede com o vão da porta
    K.box({ x0: DR.x - 8, y0: DR.y - 0.2, x1: x0 - 0.25, y1: DR.y + 0.2, z0: 0, z1: 5, img: DOOR.wall, color: '#9fb6d3' });
    K.box({ x0: x1 + 0.25, y0: DR.y - 0.2, x1: DR.x + 8, y1: DR.y + 0.2, z0: 0, z1: 5, img: DOOR.wall, color: '#9fb6d3' });
    K.box({ x0: x0 - 0.25, y0: DR.y - 0.2, x1: x1 + 0.25, y1: DR.y + 0.2, z0: DR.h + 0.25, z1: 5, img: DOOR.wall, color: '#9fb6d3' });
    // moldura acesa
    K.box({ x0: x0 - 0.25, y0: DR.y + 0.18, x1: x1 + 0.25, y1: DR.y + 0.24, z0: DR.h + 0.2, z1: DR.h + 0.25, color: '#0ea5e9', em: true });
    K.box({ x0: x0 - 0.25, y0: DR.y + 0.18, x1: x0 - 0.2, y1: DR.y + 0.24, z0: 0, z1: DR.h + 0.25, color: '#0ea5e9', em: true });
    K.box({ x0: x1 + 0.2, y0: DR.y + 0.18, x1: x1 + 0.25, y1: DR.y + 0.24, z0: 0, z1: DR.h + 0.25, color: '#0ea5e9', em: true });
    // a luz do outro lado
    K.quad({ x: DR.x, y: DR.y - 0.12, z: 0, w: DR.w, h: DR.h, ang: PI / 2, color: open > 0 ? '#ecfeff' : '#0b1730', em: open > 0, alpha: 1 });
    // as duas folhas de aço deslizando para dentro da parede
    K.box({ x0: x0 - gap, y0: DR.y - 0.05, x1: DR.x - gap, y1: DR.y + 0.05, z0: 0, z1: DR.h, img: DOOR.L, dirty, color: '#ffffff', light: [1.15, 1.2, 1.3] });
    K.box({ x0: DR.x + gap, y0: DR.y - 0.05, x1: x1 + gap, y1: DR.y + 0.05, z0: 0, z1: DR.h, img: DOOR.R, dirty, color: '#ffffff', light: [1.15, 1.2, 1.3] });
    if (open <= 0) K.quad({ x: DR.x, y: DR.y + 0.07, z: 0, w: 0.035, h: DR.h, ang: PI / 2, color: '#a5f3fc', em: true, alpha: 0.6 + 0.3 * light });
  };

  CE.registerCine3D('bluelock_door', semEnfeites({
    phases: [150, 120, 170, 150],
    music: 'mystery',
    title: '🚪 A PORTA DO BLUE LOCK',
    tags: ['PLANO 1 • A PORTA', 'PLANO 2 • SEM OLHAR PRA TRÁS', 'PLANO 3 • A PORTA SE ABRE', 'PLANO 4 • BEM-VINDO AO BLUE LOCK'],
    subs: [
      [{ from: 0, who: 'JINPACHI EGO', text: '"Daqui não tem volta."', color: '#a5f3fc' }],
      [{ from: 8, who: 'VOCÊ', text: '(Eu vou ser o 1.)', color: '#00f5d4' }],
      [{ from: 30, text: 'A luz do Blue Lock engole tudo.' }],
      [{ from: 6, text: 'Atrás de você, a porta se fecha.' }]
    ],
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, dur } = S;
      const k = t / dur;
      if (phase === 3) {
        // contraplano: o corredor do Blue Lock (ala do treino) e a luz da porta atrás de você
        const back = E(seg(t, 0, 150));
        K.expo(0.86);
        K.quad({ x: 43.92, y: 14.5, z: 0, w: 1.0, h: 1.62, ang: PI, color: '#ecfeff', em: true });
        const wx = lerp(42.9, 40.6, E(seg(t, 0, 140)));
        K.actor('you', { x: wx, y: 14.5, face: [36, 14.5], anim: t < 140 ? 'run' : 'idle', frame: t < 140 ? Math.floor(S.f * 0.5) : 4, light: [0.55, 0.7, 0.85] });
        K.cam([36.4 - back * 0.4, 0.72, 14.5 + K.noise(S.f * 0.4, 3) * 0.01], [42.5, 0.78, 14.5], 34 + back * 8);
        return;
      }
      K.sky('#000106', '#03091a', 0.25);
      K.fog('#020814', 0.035);
      K.ambient('#5e7ea8');
      K.expo(phase === 2 ? 0.86 + E(seg(t, 44, 120)) * 0.5 : 0.86);
      const open = phase === 2 ? EIO(seg(t, 44, 110)) : 0;
      const spin = phase === 2 ? Math.round(E(seg(t, 0, 40)) * 24) / 16 * PI : phase === 0 ? Math.round(t * 0.01 * 16) / 16 : 0;
      doorSet(K, open, spin, 0.5 + 0.5 * Math.sin(t * 0.08));
      if (phase === 0) {
        // a porta gigante, o Ego no pedestal, os 300 atrás de você
        K.box({ x0: 83.5, y0: 16.2, x1: 84.3, y1: 17.0, z0: 0, z1: 0.42, color: '#0b1220', top: '#1b2a4a' });
        K.sprite(DOOR.cone, { x: 83.9, y: 16.6, z: 0, w: 1.4, h: 3.4, alpha: 0.8, glow: true });
        K.actor('EGO', { x: 83.9, y: 16.6, z: 0.42, face: [86.6, 20], k: 0.95, light: [1.05, 1.15, 1.35] });
        doorCrowd().forEach((c, i) => K.actor(c.cd, { id: i, x: c.x, y: c.y, face: [DR.x, DR.y], frame: 0, k: 0.86, light: [0.32, 0.4, 0.55] }));
        const step = E(seg(t, 50, 150));
        K.actor('you', { x: 86.3, y: 17.1 - step * 0.7, face: [DR.x, DR.y], anim: step > 0 && step < 1 ? 'run' : 'idle', frame: Math.floor(S.f * 0.4), light: [0.5, 0.65, 0.85] });
        const push = EIO(seg(t, 0, 150));
        K.cam([86.7, 1.42 - push * 0.08, 22.2 - push * 1.0], [86.0, 1.55, DR.y], 48);
      } else if (phase === 1) {
        // close: a fenda da porta acende o seu rosto
        K.actor('you', { x: 86.3, y: 16.3, face: [DR.x, DR.y], anim: 'idle', frame: 4, light: [0.7, 1.05, 1.2] });
        const drift = (t - 60) * 0.0015;
        K.cam([86.3 + drift, 0.62, 14.3], [86.3 + drift * 0.5, 0.55, 16.3], 40);
      } else {
        // atrás de você: a tranca gira, as folhas se abrem, você entra na luz
        const walk = EIO(seg(t, 84, 170));
        const wx = lerp(85.3, 86.0, walk);
        const wy = lerp(17.9, 12.7, walk);
        const glow = open * 0.8;
        K.actor('you', { x: wx, y: wy, face: [DR.x, DR.y - 2], anim: walk > 0 && walk < 1 ? 'run' : 'idle', frame: Math.floor(S.f * 0.4), light: [0.18 + glow * 0.2, 0.22 + glow * 0.3, 0.32 + glow * 0.35] });
        const sh = t > 40 && t < 112 ? 0.012 : 0.003;
        K.cam([85.1 + K.noise(S.f * 2, 1) * sh, 0.85 + K.noise(S.f * 2, 2) * sh, 19.7 - seg(t, 0, 170) * 0.5], [86.0, 1.35, DR.y], 52 - seg(t, 0, 170) * 4);
      }
      void k;
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, stageH } = S;
      if (phase === 0) {
        const d = K.screen(DR.x, DR.h * 0.5, DR.y);
        if (d) CE.cineShafts(ctx, d.x, d.y, PI / 2, stageH, 0.9, 5, '125,211,252', 0.08, t);
        // os óculos do Ego brilham
        if (t > 70 && t < 96) {
          const e = eyesAt(K, 83.9, 16.6, 0.42, 0.95);
          if (e) {
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            [-1, 1].forEach((s) => ctx.fillRect(e.x + s * 2.7 * e.u - 1.2 * e.u, e.y - 0.9 * e.u, 2.4 * e.u, 2.0 * e.u));
          }
        }
      } else if (phase === 1) {
        // a faixa dos olhos: a lâmina de luz cortando o rosto, o olhar fecha
        const you = K.charData('you', {});
        const bandTop = top + stageH * 0.26;
        const bandH = stageH * 0.42;
        const lid = t < 60 ? 0 : t < 70 ? 1 : 2;
        ctx.fillStyle = 'rgba(1,3,10,0.55)';
        ctx.fillRect(0, top, W, stageH);
        eyeBand(ctx, S, you, { k: seg(t, 0, 12), y0: bandTop, y1: bandTop + bandH, x0: -8, x1: W + 8, dw: 1240, cx: W / 2 + (t - 60) * 0.4, bg: '#04112a', shade: 'rgba(2,8,30,0.45)', eyes: { ring: '#22d3ee', iris: '#020617', look: t > 30 ? 0 : -1, half: lid >= 1, angry: lid >= 2, lid: '#0b1730' }, after: (U, ey, cx) => {
          const lx = cx - 0.4 * U + Math.sin(t * 0.04) * 6;
          const g = ctx.createLinearGradient(lx - 70, 0, lx + 70, 0);
          g.addColorStop(0, 'rgba(34,211,238,0)');
          g.addColorStop(0.5, 'rgba(165,243,252,0.42)');
          g.addColorStop(1, 'rgba(34,211,238,0)');
          ctx.fillStyle = g;
          ctx.fillRect(lx - 70, bandTop, 140, bandH);
        } });
        if (t > 66) CE.cineImpactText(ctx, 'SEM OLHAR PRA TRÁS.', W / 2, bandTop + bandH + 64, 52, '#a5f3fc', seg(t, 66, 78), W * 0.8);
        if (t > 10) {
          ctx.save();
          ctx.globalAlpha = seg(t, 10, 30);
          ctx.font = '900 15px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('— QUEM PASSAR POR ELA NÃO VOLTA ATRÁS —', W / 2, bandTop - 26);
          ctx.restore();
        }
      } else if (phase === 2) {
        const open = EIO(seg(t, 44, 110));
        const d = K.screen(DR.x, DR.h * 0.5, DR.y);
        if (open > 0 && d) {
          CE.cineShafts(ctx, d.x, d.y, PI / 2, stageH * 0.8, 2.6, 6, '207,250,254', 0.2 * open, t);
          CE.cineGlow(ctx, d.x, d.y, 420 * open, 'rgba(207,250,254,0.8)', open * 0.8);
          CE.cineDust(ctx, W, H, t, 40, 'rgba(224,242,254,0.8)', 5);
        }
        CE.cineFlash(ctx, W, H, t >= 108 ? 0.75 * (1 - (t - 108) / 14) : 0, '#e0f2fe');
        CE.cineSfx(S, 40, 'unlock', () => window.SFX?.tackle());
        CE.cineSfx(S, 46, 'open', () => window.SFX?.whoosh());
      } else {
        const d = K.screen(43.9, 0.8, 14.5);
        if (d) CE.cineGlow(ctx, d.x, d.y, 260, 'rgba(207,250,254,0.55)', 0.8);
        CE.cineGradient(ctx, 0, top, W, stageH * 0.42, [[0, 'rgba(2,6,23,0.9)'], [1, 'rgba(2,6,23,0)']]);
        CE.cineTitleCard(ctx, W, top + stageH * 0.22, seg(t, 40, 70), { kicker: 'PRÉDIO 5 • QUARTO Z', title: 'BEM-VINDO AO BLUE LOCK', sub: `${name()} • 299º de 300 no ranking`, color: '#00f5d4' });
      }
    }
  }));

  // ======================================================================
  // O PIQUE-PEGA DO QUARTO Z (a sala montada no vazio)
  // ======================================================================
  const RZ = { x0: 81.5, x1: 90.5, y0: 12, y1: 19.6, h: 2.1 };
  let ROOM = null;
  const roomArt = () => {
    if (ROOM) return ROOM;
    ROOM = {};
    ROOM.back = paint(540, 126, (g, w, h) => {
      CE.cineGradient(g, 0, 0, w, h, [[0, '#9fb6d3'], [1, '#d6e2f0']]);
      g.strokeStyle = 'rgba(30,64,120,0.18)';
      g.lineWidth = 2;
      for (let x = 0; x < w; x += 30) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, h);
        g.stroke();
      }
      g.font = 'italic 900 120px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      g.fillStyle = 'rgba(29,78,216,0.2)';
      g.fillText('Z', w * 0.22, h - 8);
      CE.cineGradient(g, 0, h - 14, w, 14, [[0, 'rgba(15,41,66,0)'], [1, 'rgba(15,41,66,0.35)']]);
    });
    ROOM.side = paint(256, 64, (g, w, h) => {
      CE.cineGradient(g, 0, 0, w, h, [[0, '#a9bfdb'], [1, '#d6e2f0']]);
      g.strokeStyle = 'rgba(30,64,120,0.16)';
      g.lineWidth = 2;
      for (let x = 0; x < w; x += 32) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, h);
        g.stroke();
      }
    });
    ROOM.floor = paint(360, 304, (g, w, h) => {
      CE.cineGradient(g, 0, 0, w, h, [[0, '#7f97b8'], [1, '#5f7aa0']]);
      g.strokeStyle = 'rgba(255,255,255,0.32)';
      g.lineWidth = 2;
      for (let x = 0; x <= w; x += 40) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, h);
        g.stroke();
      }
      for (let y = 0; y <= h; y += 40) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
      }
    });
    ROOM.timer = paint(260, 110);
    ROOM.tKey = '';
    return ROOM;
  };
  // painel de LED com o tempo (redesenha só quando o número muda)
  const roomTimer = (secs, urgent, t) => {
    const R = roomArt();
    const s = Math.max(0, Math.ceil(secs));
    const blink = urgent ? Math.floor(t / 8) % 2 : 0;
    const key = s + '|' + (urgent ? 1 : 0) + '|' + blink;
    if (key === R.tKey) return false;
    R.tKey = key;
    const g = R.timer.g;
    g.clearRect(0, 0, 260, 110);
    CE.inicioTimer(g, 130, 55, s, urgent, 1, blink ? 0 : 5.2);
    return true;
  };
  // a sala: chão, paredes, teto com luz, o Z e o tempo na parede do fundo
  const roomSet = (K, o) => {
    const R = roomArt();
    const alarm = o.alarm || 0;
    K.sky('#dbe7f5', '#c3d3e8', 0);
    K.fog(mixc('#c3d3e8', '#d9b3bc', alarm), 0.012);
    K.ambient(mixc('#f1f5ff', '#ffc9d2', alarm));
    K.expo(o.expo || 0.92);
    const tint = '#' + mixc('#ffffff', '#ffb3be', alarm).map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
    K.floor({ x0: RZ.x0, y0: RZ.y0, x1: RZ.x1, y1: RZ.y1, img: R.floor, color: tint });
    K.box({ x0: RZ.x0, y0: RZ.y0 - 0.2, x1: RZ.x1, y1: RZ.y0, z0: 0, z1: RZ.h, img: R.back, color: tint });
    K.box({ x0: RZ.x0 - 0.2, y0: RZ.y0, x1: RZ.x0, y1: RZ.y1, z0: 0, z1: RZ.h, img: R.side, color: tint });
    K.box({ x0: RZ.x1, y0: RZ.y0, x1: RZ.x1 + 0.2, y1: RZ.y1, z0: 0, z1: RZ.h, img: R.side, color: tint });
    K.box({ x0: RZ.x0, y0: RZ.y1, x1: RZ.x1, y1: RZ.y1 + 0.2, z0: 0, z1: RZ.h, img: R.side, color: tint });
    K.floor({ x0: RZ.x0, y0: RZ.y0, x1: RZ.x1, y1: RZ.y1, z: RZ.h, color: '#dbe7f5' });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) K.floor({ x0: 82.6 + i * 2.6, y0: 13.4 + j * 3.2, x1: 84.4 + i * 2.6, y1: 14.0 + j * 3.2, z: RZ.h - 0.01, color: '#ffffff', em: true });
    const dirty = roomTimer(o.secs, o.urgent, S0.t);
    K.quad({ x: 88.4, y: RZ.y0 + 0.02, z: 1.05, w: 1.5, h: 0.64, ang: -PI / 2, img: R.timer, em: true, dirty });
  };
  const S0 = { t: 0 };
  // a bola do chute no Kira (plano 4): do seu pé até a cabeça dele e o rebote
  const kickBall = (t) => {
    const yP = [84.2, 16.1];
    const kP = [88.5, 15.5];
    if (t < 18) return [yP[0] + 0.32, yP[1] - 0.05, 0.05];
    if (t < 60) {
      const f = E(seg(t, 18, 60));
      return [lerp(yP[0] + 0.35, kP[0] - 0.08, f), lerp(yP[1] - 0.05, kP[1] + 0.02, f), lerp(0.1, 0.62, f)];
    }
    const q = t - 60;
    return [kP[0] - 0.08 - q * 0.03, kP[1] + 0.02 + q * 0.01, Math.max(0.05, 0.62 + q * 0.025 - q * q * 0.0011)];
  };
  const TAG_IDS = ['bachira', 'kunigami', 'chigiri', 'gagamaru', 'igarashi', 'raichi'];
  const KIRA = () => CE.getSpeakerCharData('RYOSUKE KIRA');
  let TAG_X = null;
  const tagExtras = () => TAG_X || (TAG_X = extras(8, 23, { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' }));
  // quem corre no plano aberto: [quem, centro x, centro y, raio x, raio y, sentido]
  const runners = () => {
    const bl = { kit: 'blueLock' };
    const L = TAG_IDS.map((id) => [id, bl]).concat([[KIRA(), { kit: 'blueLock' }], ['you', bl]]).concat(tagExtras().map((c) => [c, {}]));
    return L.map(([who, o], i) => ({ who, o, cx: 86 + ((i * 37) % 5 - 2) * 0.5, cy: 15.8 + ((i * 53) % 3 - 1) * 0.4, rx: 1.6 + (i % 4) * 0.7, ry: 1.0 + (i % 3) * 0.6, dir: i % 2 ? 1 : -1, a0: i * 0.8 }));
  };

  CE.registerCine3D('onigokko', semEnfeites({
    phases: [170, 150, 170, 130, 220],
    music: 'tension',
    title: '⏱️ O PIQUE-PEGA DO QUARTO Z',
    tags: ['PLANO 1 • QUARTO Z: PIQUE-PEGA', 'PLANO 2 • A BOLA É SUA', 'PLANO 3 • QUEM É O ALVO?', 'PLANO 4 • O CHUTE', 'PLANO 5 • RYOSUKE KIRA, ELIMINADO'],
    subs: [
      [{ from: 4, who: 'JINPACHI EGO', text: '"Bola no fim? ELIMINADO."', color: '#a5f3fc' }],
      [{ from: 6, who: 'VOCÊ', text: '(Se eu não passar, tô fora!)', color: '#00f5d4' }],
      [{ from: 8, who: 'VOCÊ', text: '(Quem está perto... e distraído?)', color: '#00f5d4' }],
      [{ from: 58, text: 'Na cabeça!' }],
      [{ from: 10, who: 'VOCÊ', text: '(Chutei sem pensar. Eu não quero ir embora.)', color: '#00f5d4' }]
    ],
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase } = S;
      S0.t = t;
      const bl = { kit: 'blueLock' };
      if (phase === 0) {
        // plano aberto: todo mundo fugindo da bola, o tempo correndo
        roomSet(K, { secs: lerp(136, 11, E(seg(t, 16, 160))), urgent: false });
        const R = runners();
        const pos = R.map((r, i) => {
          const a = r.a0 + r.dir * t * 0.028;
          const x = r.cx + Math.cos(a) * r.rx;
          const y = r.cy + Math.sin(a) * r.ry;
          const vx = -Math.sin(a) * r.rx * r.dir;
          const vy = Math.cos(a) * r.ry * r.dir;
          K.actor(r.who, Object.assign({ id: 'r' + i, x, y, face: [x + vx, y + vy], anim: 'run', frame: S.f + i * 3 }, r.o));
          return [x, y];
        });
        const hop = (t % 40) / 40;
        const iA = Math.floor(t / 40) % pos.length;
        const a = pos[iA];
        const b = pos[(iA + 3) % pos.length];
        K.ball(lerp(a[0], b[0], hop), lerp(a[1], b[1], hop), 0.4 + Math.sin(hop * PI) * 0.8);
        const pan = EIO(seg(t, 0, 170));
        K.cam([lerp(84.0, 88.0, pan), 1.72, 19.3], [lerp(85.4, 86.6, pan), 0.35, 14.8], 56);
      } else if (phase === 1) {
        // PÁ! a bola bate em você; todo mundo corre pras paredes
        const hit = 14;
        roomSet(K, { secs: lerp(10, 8, seg(t, 0, 150)), urgent: true, alarm: 0.25 + 0.15 * Math.sin(t * 0.12) });
        const flee = E(seg(t, hit, 90));
        const others = TAG_IDS.map((id) => [id, bl]).concat([[KIRA(), bl]]).concat(tagExtras().slice(0, 5).map((c) => [c, {}]));
        others.forEach(([who, o], i) => {
          const ang = -PI * 0.92 + (i / (others.length - 1)) * PI * 0.84;
          const r = lerp(1.0, who === others[6][0] ? 2.2 : 3.3, flee);
          const x = 86 + Math.cos(ang) * r * 1.25;
          const y = 16.2 + Math.sin(ang) * r * 0.95;
          K.actor(who, Object.assign({ id: 'f' + i, x, y, face: flee < 1 ? [x + Math.cos(ang), y + Math.sin(ang)] : [86, 16.4], anim: flee < 1 && t > hit ? 'run' : 'idle', frame: S.f + i * 5 }, o));
        });
        K.actor('you', { x: 86, y: 16.4, face: [86, 20], anim: 'idle', frame: t < hit + 10 ? 4 : S.f, kit: 'blueLock' });
        let b;
        if (t < hit) b = [lerp(83.0, 86.05, t / hit), lerp(15.6, 16.45, t / hit), lerp(1.3, 0.62, t / hit)];
        else {
          const kk = Math.min(1, (t - hit) / 30);
          b = [86.05 + kk * 0.45, 16.45 + kk * 0.4, Math.max(0.05, lerp(0.62, 0.05, kk * kk) + Math.sin(kk * PI) * 0.3)];
        }
        K.ball(b[0], b[1], b[2]);
        const push = EIO(seg(t, 60, 150));
        const sh = t >= hit ? 0.03 * Math.max(0, 1 - (t - hit) / 26) : 0;
        K.cam([86 + K.noise(S.f * 3, 1) * sh, lerp(0.8, 0.66, push), lerp(19.3, 18.3, push)], [86, lerp(0.5, 0.56, push), 16.4], lerp(46, 38, push));
      } else if (phase === 2) {
        // os seus olhos varrendo a sala: longe, longe... perto e de costas: o Kira
        roomSet(K, { secs: lerp(7, 5, seg(t, 0, 170)), urgent: true, alarm: 0.3 + 0.1 * Math.sin(t * 0.12) });
        const C = [[83.0, 13.3], [89.2, 13.1], [86.9, 14.9]];
        K.actor('bachira', { kit: 'blueLock', x: C[0][0], y: C[0][1], face: [86, 16.6], frame: 4 });
        K.actor('kunigami', { kit: 'blueLock', x: C[1][0], y: C[1][1], face: [89.4, 12], frame: 4 });
        K.actor(KIRA(), { kit: 'blueLock', x: C[2][0], y: C[2][1], face: [87.4, 12], frame: S.f });
        ['chigiri', 'gagamaru', 'igarashi', 'raichi'].forEach((id, i) => K.actor(id, { kit: 'blueLock', x: [82.2, 90.0, 82.4, 89.9][i], y: [17.4, 16.6, 15.4, 18.6][i], face: [86, 16.6], frame: 4 }));
        tagExtras().slice(0, 4).forEach((c, i) => K.actor(c, { id: 'e' + i, x: [84.4, 85.2, 88.3, 87.5][i], y: [12.5, 12.6, 12.7, 19.1][i], face: [86, 16.6], frame: 0 }));
        K.ball(86.2, 16.25, 0.05);
        const l0 = t < 38 ? C[0] : t < 62 ? C[1] : C[2];
        const lp = t < 38 ? C[0] : t < 62 ? C[0] : C[1];
        const kk = t < 38 ? 1 : t < 62 ? EIO(seg(t, 38, 48)) : EIO(seg(t, 62, 72));
        const lx = lerp(lp[0], l0[0], kk);
        const ly = lerp(lp[1], l0[1], kk);
        const lock = t >= 112 ? E(seg(t, 112, 128)) : 0;
        K.cam([86.0 + K.noise(S.f * 0.5, 2) * 0.01, 0.64, 16.95], [lx, 0.48, ly], 44 - lock * 12);
      } else if (phase === 3) {
        // o chute: a bola cruza a sala e acerta a cabeça do Kira
        const kick = 18;
        const hitAt = 60;
        roomSet(K, { secs: lerp(4, 2, seg(t, 0, 130)), urgent: true, alarm: 0.35 + 0.15 * Math.sin(t * 0.12) });
        const yP = [84.2, 16.1];
        const kP = [88.5, 15.5];
        K.actor('you', { kit: 'blueLock', x: yP[0], y: yP[1], face: kP, anim: t < kick ? 'windup' : t < kick + 30 ? 'shoot' : 'idle', frame: t < kick + 30 ? 4 : S.f, glow: false });
        const turned = t > 44;
        const fall = t >= hitAt ? Math.min(60, t - hitAt) : -1;
        K.actor(KIRA(), { kit: 'blueLock', x: kP[0], y: kP[1], face: turned ? yP : [92, 15.5], anim: fall >= 0 ? 'fall' : 'idle', frame: fall >= 0 ? fall : 4, opts: fall >= 0 ? { animTime: fall } : undefined });
        ['bachira', 'chigiri'].forEach((id, i) => K.actor(id, { kit: 'blueLock', x: [82.6, 90.0][i], y: [13.0, 13.4][i], face: [86, 15.8], frame: 4 }));
        const b = kickBall(t);
        K.ball(b[0], b[1], b[2], { k: 0.8 });
        const pan = EIO(seg(t, kick, hitAt + 10));
        const sh = t >= hitAt ? 0.035 * Math.max(0, 1 - (t - hitAt) / 30) : t >= kick && t < kick + 12 ? 0.02 : 0;
        K.cam([lerp(85.0, 86.6, pan) + K.noise(S.f * 3, 1) * sh, 0.62 + K.noise(S.f * 3, 2) * sh, 19.35], [lerp(85.6, 87.6, pan), 0.48, 15.8], 52);
      } else {
        // 0:00 — o Kira no chão; a imagem congela numa foto com o carimbo
        const tt = Math.min(t, 44);
        roomSet(K, { secs: 0, urgent: true, alarm: 0.55 + 0.25 * Math.sin(tt * 0.1) });
        K.actor(KIRA(), { kit: 'blueLock', x: 87.8, y: 15.5, face: [84, 15.5], anim: 'fall', frame: 60 });
        K.ball(88.7, 16.1, 0.05);
        TAG_IDS.slice(0, 4).forEach((id, i) => K.actor(id, { kit: 'blueLock', x: [82.6, 84.3, 89.8, 90.0][i], y: [13.2, 12.6, 13.6, 17.8][i], face: [87.8, 15.5], frame: 4 }));
        tagExtras().slice(0, 5).forEach((c, i) => K.actor(c, { id: 'w' + i, x: [83.2, 85.6, 86.8, 88.9, 82.2][i], y: [12.4, 12.5, 12.4, 12.6, 16.2][i], face: [87.8, 15.5], frame: 0 }));
        K.actor('you', { kit: 'blueLock', x: 85.7, y: 17.2, face: [87.8, 15.5], frame: 4, light: [0.75, 0.6, 0.66] });
        K.cam([85.0 + tt * 0.004, 1.0, 19.2], [87.2, 0.32, 15.6], 46);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot, stageH } = S;
      if (phase === 0) {
        CE.cineImpactText(ctx, 'PIQUE-PEGA', W * 0.27, top + stageH * 0.15, 72, '#1e3a8a', seg(t, 6, 18) * (1 - seg(t, 70, 84)), 0, -0.06);
      } else if (phase === 1) {
        const hit = 14;
        const push = EIO(seg(t, 60, 150));
        const e = eyesAt(K, 86, 16.4);
        if (t > 40 && e) {
          const d = ((t - 40) % 70) * 0.05 * e.u;
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(e.x + 4.8 * e.u, e.y - 2 * e.u + d, e.u * 0.6, e.u * 0.9);
        }
        if (push > 0.3) {
          ctx.save();
          ctx.globalAlpha = seg(push, 0.3, 0.6);
          CE.inicioTimer(ctx, W - 130, top + 64, lerp(10, 8, seg(t, 0, 150)), true, 0.6, t);
          ctx.restore();
        }
        if (t >= hit && t < 56) CE.cineImpactText(ctx, 'PÁ!', W * 0.66, top + stageH * 0.3, 96, '#f8fafc', seg(t, hit, hit + 8), 0, -0.12);
        CE.cineFlash(ctx, W, H, t >= hit ? 0.6 * (1 - (t - hit) / 6) : 0);
        if (t > 50) CE.cineImpactText(ctx, '?!', W * 0.33, top + stageH * 0.3, 80, '#ef4444', seg(t, 50, 58), 0, 0.1);
        CE.cineSfx(S, hit, 'hit', () => window.SFX?.tackle());
      } else if (phase === 2) {
        const lock = 112;
        const you = K.charData('you', { kit: 'blueLock' });
        const beat = Math.pow(Math.max(0, Math.sin(t * 0.26)), 12);
        const bandTop = top + 12;
        const bandH = stageH * 0.3;
        eyeBand(ctx, S, you, { k: seg(t, 0, 10), y0: bandTop, y1: bandTop + bandH + beat * 6, dw: 1100, bg: '#0b1736', shade: t >= lock ? 'rgba(127,29,29,0.28)' : 'rgba(2,8,30,0.3)', eyes: { ring: t >= lock ? '#ef4444' : you.eyeColor || '#ef4444', iris: '#020617', look: t < lock ? Math.round(Math.sin(t * 0.09) * 2) : 2, tiny: t < lock, angry: t >= lock } });
        // as etiquetas de quem aparece e a mira no Kira
        const tag = (x, y, z, label, at, red) => {
          const p = K.screen(x, z, y);
          if (p) p.y = Math.max(p.y, bandTop + bandH + 40);
          if (!p || t < at) return;
          CE.ptdChip(ctx, label, p.x, p.y, red ? '#ef4444' : '#f8fafc', seg(t, at, at + 10), { size: 14 });
        };
        if (t < 62) tag(83.0, 13.3, 1.08, 'LONGE', 14);
        if (t >= 38 && t < 80) tag(89.2, 13.1, 1.08, 'LONGE', 42);
        if (t >= 62) tag(86.9, 14.9, 1.1, 'PERTO • DE COSTAS', 70, t >= lock);
        if (t >= lock) {
          const e = eyesAt(K, 86.9, 14.9) || { x: W / 2, y: H / 2, u: 6 };
          const r = (14 - E(seg(t, lock, lock + 16)) * 5) * e.u;
          ctx.save();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r, 0, PI * 2);
          ctx.moveTo(e.x - r - 26, e.y);
          ctx.lineTo(e.x - r + 18, e.y);
          ctx.moveTo(e.x + r - 18, e.y);
          ctx.lineTo(e.x + r + 26, e.y);
          ctx.moveTo(e.x, e.y - r - 26);
          ctx.lineTo(e.x, e.y - r + 18);
          ctx.stroke();
          ctx.restore();
          CE.cineImpactText(ctx, '...O KIRA.', W * 0.3, bot - 70, 64, '#ef4444', seg(t, lock, lock + 10), 0, -0.05);
        }
        CE.inicioTimer(ctx, W - 120, bandTop + bandH + 70, lerp(7, 5, seg(t, 0, 170)), true, 0.55, t);
        CE.cineSfx(S, lock, 'lock', () => window.SFX?.blip(220));
      } else if (phase === 3) {
        const kick = 18;
        const hitAt = 60;
        if (t >= kick && t < kick + 10) {
          // quadro de impacto (um só): clarão e linhas de foco escuras
          ctx.fillStyle = 'rgba(248,250,252,0.55)';
          ctx.fillRect(0, top, W, stageH);
          const p = K.screen(84.6, 0.2, 16.0) || { x: W * 0.3, y: H * 0.6 };
          CE.drawRadialSpeedLines(ctx, p.x, p.y, W * 1.4, '#020617', 0.6);
        } else if (t >= kick && t < hitAt) {
          CE.drawSpeedLines(ctx, W, H, '#1e3a8a', 0.16);
          // a faixa de vento atrás da bola (uma só, não é cópia da bola)
          const a = kickBall(Math.max(kick, t - 8));
          const b = kickBall(t);
          const p = K.screen(a[0], a[2], a[1]);
          const q = K.screen(b[0], b[2], b[1]);
          if (p && q) CE.inicioStreak(ctx, p.x, p.y, q.x, q.y, 18, 'rgba(239,68,68,0.6)');
        }
        if (t > 44 && t < hitAt + 6) {
          const e = eyesAt(K, 88.5, 15.5);
          if (e) CE.drawMangaCaption(ctx, 'Hã...?', e.x, e.y - 22 * e.u, 26);
        }
        if (t >= kick && t < hitAt) CE.cineImpactText(ctx, 'DOM!!', W * 0.32, top + stageH * 0.26, 110, t < kick + 10 ? '#020617' : '#f8fafc', seg(t, kick, kick + 8), 0, -0.12);
        if (t >= hitAt) CE.cineImpactText(ctx, 'PÁ!!', W * 0.62, top + stageH * 0.24, 120, '#ef4444', seg(t, hitAt, hitAt + 8), 0, 0.1);
        CE.cineFlash(ctx, W, H, t >= hitAt ? 0.55 * (1 - (t - hitAt) / 7) : 0);
        CE.cineSfx(S, kick, 'kick', () => window.SFX?.kick(1));
        CE.cineSfx(S, hitAt, 'hit', () => window.SFX?.tackle());
      } else {
        const freezeAt = 44;
        const fz = EIO(seg(t, freezeAt, freezeAt + 22));
        if (fz > 0) {
          // vira foto: copia o quadro 3D, encolhe e inclina por cima do fundo vermelho
          if (!ROOM.photo) ROOM.photo = paint(W, H);
          const ph = ROOM.photo;
          if (t < freezeAt + 2 || !ROOM.photoOk) {
            ph.g.clearRect(0, 0, W, H);
            ph.g.drawImage(ctx.canvas, 0, 0, W, H);
            ROOM.photoOk = t >= freezeAt + 1;
          }
          ctx.fillStyle = '#0a0410';
          ctx.fillRect(0, top, W, stageH);
          ctx.save();
          ctx.globalAlpha = fz * 0.5;
          ctx.font = 'italic 900 26px "Segoe UI", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillStyle = '#7f1d1d';
          for (let r = 0; r < 9; r++) ctx.fillText('TEMPO ESGOTADO • TEMPO ESGOTADO • TEMPO ESGOTADO • TEMPO ESGOTADO', -((t * 0.6 + r * 120) % 300), top + 30 + r * 62);
          ctx.restore();
          const sc = lerp(1, 0.78, fz);
          const cx = W / 2;
          const cy = top + stageH / 2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(lerp(0, -0.035, fz));
          ctx.scale(sc, sc);
          ctx.translate(-cx, -cy);
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(-16, top - 16, W + 32, stageH + 32);
          ctx.drawImage(ph, 0, top, W, stageH, 0, top, W, stageH);
          ctx.fillStyle = `rgba(30,58,138,${0.3 * fz})`;
          ctx.fillRect(0, top, W, stageH);
          ctx.restore();
        } else ROOM.photoOk = false;
        if (t > freezeAt + 20) {
          const k = E(seg(t, freezeAt + 20, freezeAt + 30));
          ctx.save();
          ctx.translate(W * 0.64, top + stageH * 0.42);
          ctx.rotate(-0.12);
          ctx.scale(1.7 - k * 0.7, 1.7 - k * 0.7);
          ctx.globalAlpha = Math.min(1, k * 1.5);
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 9;
          ctx.strokeRect(-250, -70, 500, 128);
          ctx.lineWidth = 3;
          ctx.strokeRect(-238, -58, 476, 104);
          ctx.font = 'italic 900 34px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#dc2626';
          ctx.fillText('RYOSUKE KIRA', 0, -26);
          ctx.font = 'italic 900 52px "Segoe UI", sans-serif';
          ctx.fillText('ELIMINADO', 0, 22);
          ctx.restore();
        }
        CE.cineFlash(ctx, W, H, t >= freezeAt && t < freezeAt + 6 ? 0.5 * (1 - (t - freezeAt) / 6) : 0);
        CE.cineSfx(S, 2, 'buzz', () => window.SFX?.whistle(1));
        CE.cineSfx(S, freezeAt, 'snap', () => window.SFX?.page());
        CE.cineSfx(S, freezeAt + 20, 'stamp', () => window.SFX?.tackle());
      }
    }
  }));
})();
