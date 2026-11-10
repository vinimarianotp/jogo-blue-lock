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
})();
