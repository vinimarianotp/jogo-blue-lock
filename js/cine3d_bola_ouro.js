// ============================================================================
// CUTSCENES EM 3D — a noite da Bola de Ouro e a lição do Sae (js/cine_bola_ouro.js
// refeito no 3D). Kit: js/cine3d_kit.js. Mesmos planos, tempos e legendas da versão 2D.
//   bola_de_ouro_discurso • o teatro de Paris (montado na área vazia): o troféu → o
//                           discurso → a fome → a plateia de pé e o Rin na última fileira →
//                           ele sai pela porta dos fundos
//   rin_sae_licao         • o corredor do hotel → o campo de treino à uma da manhã, na chuva
// Usa os ajudantes 3D da cine3d_final (prefixo c3f: teatro, corredor do hotel, poses) e os
// ajudantes 2D das cenas originais no overlay (painéis, olhos, carimbos).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D || !CE.c3fTheatre) return;
  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const pic = (K, o) => K.quad(Object.assign({}, o, { ang: (o.ang || 0) + Math.PI }));
  const scr = (K, x, h, y) => K.screen(x, h, y);
  const WALKF = (f, sp = 6) => 1 + (Math.floor(f / sp) % 4) * 4;

  const YOU_C = '#00f5d4';
  const RIN_C = '#2dd4bf';
  const SAE_C = '#fb7185';
  const NARR_C = '#94a3b8';
  const HOST_C = '#fde68a';
  const GOLD = '#facc15';
  const KIT_TR = { jerseyPrimary: '#0b1f24', jerseySecondary: '#14b8a6' };
  const POPS0 = [[150, 560, 10], [300, 610, 9], [470, 580, 8], [820, 600, 9], [990, 570, 11], [1130, 540, 9], [80, 470, 8], [1210, 460, 8], [640, 620, 7]];
  const POPS1 = [[120, 600, 10], [260, 570, 8], [430, 615, 9], [760, 590, 8], [920, 612, 10], [1080, 580, 9], [1220, 600, 8]];

  const TH = CE.C3F_THEATRE;
  const rowY = (r) => TH.row0 + r * TH.step;
  const rowZ = (r) => r * TH.rake;
  const canvas = CE.c3fCanvas;
  const pose = CE.c3fPose;
  const poseSprite = CE.c3fPoseSprite;
  // altura dos olhos de uma pose (desenhada com size 180, 5 px por unidade) em ladrilhos
  const PXT = (0.9 * 72) / 66 / 180;
  const poseEye = (drop = 0) => (0.87 * 180 - 10.1 * 5 - drop * 5) * PXT;
  // olhos acesos (pixel) por cima de uma pose 3D: centro do rosto em (x, h, y)
  const eyesAt = (ctx, K, x, h, y, o) => {
    const a = scr(K, x, h, y);
    const b = scr(K, x, h + 5 * PXT, y);
    if (!a || !b) return;
    const u = Math.abs(a.y - b.y);
    if (u < 2) return;
    CE.wcdEyes(ctx, a.x, a.y, u, o);
  };

  // poses guardadas (desenhadas uma vez com os ajudantes 2D)
  const seatPose = (key, ch, o = {}) => pose('seat|' + key, (g, x, feet, size) => CE.rincSeat(g, ch, x, feet - 2.6 * 5, size, o));
  const crossPose = (key, ch, o = {}) =>
    pose('cross|' + key, (g, x, feet, size) => {
      g.save();
      g.translate(x, feet);
      g.rotate(o.lean || 0);
      CE.bdorSpr(g, ch, 0, 0, size, Object.assign({ cross: true }, o));
      g.restore();
    });
  const kneelPose = (key, ch, o = {}) => pose('kneel|' + key, (g, x, feet, size) => CE.zselKneel(g, ch, x, feet - (31.3 - 26.4) * 5, size, o));
  const lyingPose = (key, ch, o = {}) => pose('lying|' + key, (g, x, feet, size) => CE.bdorLying(g, ch, x + 0.43 * size, feet - 30, size, o));

  // ==========================================================================
  // 1. A NOITE DA BOLA DE OURO
  // ==========================================================================
  const LEC = [86, 11.55];
  const PED = [88.3, 11.2];
  const lectern = (K) => {
    const z = TH.stageZ;
    K.box({ x0: LEC[0] - 0.32, y0: LEC[1], x1: LEC[0] + 0.32, y1: LEC[1] + 0.26, z0: z, z1: z + 0.5, color: '#24142e', top: '#ca8a04' });
    pic(K, { x: LEC[0], y: LEC[1] + 0.265, z: z + 0.02, w: 0.5, h: 0.46, ang: Math.PI / 2, img: CE.c3fLectern(), color: '#ffffff', light: [0.9, 0.8, 0.85] });
    [0.2, 0.27].forEach((dx) => K.box({ x0: LEC[0] + dx - 0.01, y0: LEC[1] + 0.02, x1: LEC[0] + dx + 0.01, y1: LEC[1] + 0.04, z0: z + 0.5, z1: z + 0.66, color: '#111827' }));
  };
  const pedestal = (K, x, y, glow = true) => {
    const z = TH.stageZ;
    K.box({ x0: x - 0.2, y0: y - 0.2, x1: x + 0.2, y1: y + 0.2, z0: z, z1: z + 0.5, color: '#24142e', top: '#ca8a04' });
    K.sprite(CE.c3fGoldBall(), { x, y, z: z + 0.5, w: 0.28, h: 0.42, glow });
  };
  const galaCast = () => CE.bdorCast();

  CE.registerCine3D('bola_de_ouro_discurso', {
    phases: [320, 380, 330, 380, 300],
    music: 'victory',
    title: '🥇 A NOITE DA BOLA DE OURO',
    tags: ['PLANO 1 • O TROFÉU', 'PLANO 2 • O DISCURSO', 'PLANO 3 • A FOME', 'PLANO 4 • A ÚLTIMA FILEIRA', 'PLANO 5 • A PORTA DOS FUNDOS'],
    subs: [
      [
        { from: 12, to: 150, who: 'NARRADOR', text: 'Paris. A Bola de Ouro.', color: NARR_C },
        { from: 164, to: 318, who: 'APRESENTADORA', text: '"O melhor do mundo!"', color: HOST_C }
      ],
      [
        { from: 10, to: 196, who: 'VOCÊ', text: '"Eu entrei no Blue Lock como o nº 299."', color: YOU_C },
        { from: 198, to: 378, who: 'VOCÊ', text: '"Perdi. Me chamaram de sem talento."', color: YOU_C }
      ],
      [
        { from: 8, to: 190, who: 'VOCÊ', text: '"Então eu devorei um por um até aqui."', color: YOU_C },
        { from: 192, to: 330, who: 'VOCÊ', text: '"E eu ainda tô com fome."', color: YOU_C }
      ],
      [
        { from: 10, to: 200, who: 'NARRADOR', text: 'Paris inteira aplaude de pé.', color: NARR_C },
        { from: 206, to: 380, who: 'RIN ITOSHI', text: '(Esse troféu era pra ser meu.)', color: RIN_C }
      ],
      [{ from: 10, to: 236, who: 'VOCÊ', text: '"Quem quiser este troféu... que venha tomar."', color: YOU_C }]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'nel_dome',
    scene(K, S) {
      CE.c3fCamFix(K);
      const { t, phase, dur } = S;
      const c = galaCast();
      if (phase === 0) {
        const cut = 150;
        if (t < cut) {
          // o troféu no escuro, no pedestal, com o feixe de cima
          CE.c3fTheatre(K, { amb: '#3a2a3a' });
          K.expo(0.85);
          pedestal(K, 86, 11.0);
          K.quad({ x: 86, y: 11.0, z: TH.stageZ, w: 1.1, h: 2.6, ang: Math.PI / 2, img: CE.c3fBeam('254,240,138'), em: true, color: '#ffffff', alpha: 0.2 });
          K.floor({ x0: 85.4, y0: 10.4, x1: 86.6, y1: 11.6, z: TH.stageZ + 0.008, img: CE.c3fGlowCv('rgba(254,240,138,0.6)'), color: '#ffffff', em: true, alpha: 0.999 });
          const k = easeIO(t / cut);
          K.cam([86.05, lerp(0.9, 0.82, k), lerp(13.4, 12.35, k)], [86, TH.stageZ + 0.62, 11.0], lerp(40, 34, k));
        } else {
          // você sobe ao palco; a plateia de costas aplaudindo
          const u = t - cut;
          const k = easeIO(u / (dur - cut));
          CE.c3fTheatre(K, { amb: '#8a6a7a' });
          lectern(K);
          pedestal(K, PED[0], PED[1]);
          const walk = easeIO(seg(u, 6, 120));
          const px = lerp(83.4, LEC[0], walk);
          const moving = u > 6 && u < 118;
          K.actor('you', { x: px, y: LEC[1] - 0.3, z: TH.stageZ, ang: moving ? 0 : Math.PI / 2, extra: { outfit: 'suit' }, anim: moving ? 'run' : 'idle', frame: moving ? WALKF(S.f, 7) : 45, k: 0.9, light: [1.2, 1.08, 0.9] });
          K.quad({ x: px, y: LEC[1] - 0.3, z: TH.stageZ, w: 1.3, h: 2.6, ang: Math.PI / 2, img: CE.c3fBeam('254,240,138'), em: true, color: '#ffffff', alpha: 0.25 });
          CE.c3fAudience(K, { seed: 23, r0: 0, r1: 4, max: 30, face: [86, 10], frame: 0, light: [0.35, 0.28, 0.32] });
          K.cam([lerp(85.6, 86.1, k), lerp(1.05, 0.98, k), lerp(17.6, 16.6, k)], [lerp(85.4, 86, k), 0.75, 11.3], lerp(42, 36, k));
        }
      } else if (phase === 1) {
        // o discurso: você no púlpito, de perto
        CE.c3fTheatre(K, { amb: '#7a5a6a' });
        K.expo(0.9);
        lectern(K);
        K.actor('you', { x: LEC[0], y: LEC[1] - 0.25, z: TH.stageZ, ang: Math.PI / 2, extra: { outfit: 'suit' }, frame: 45, k: 0.9, light: [1.15, 1.05, 0.9] });
        const k = easeIO(t / dur);
        K.cam([LEC[0] - 0.42, TH.stageZ + 0.84, LEC[1] + 1.3 - k * 0.1], [LEC[0] - 0.02, TH.stageZ + 0.66, LEC[1] - 0.25], 32);
      } else if (phase === 2) {
        const cut = 176;
        if (t < cut) {
          // um por um: os cinco que você devorou, num corredor escuro, apagando
          K.sky('#020617', '#020617', 0);
          K.fog('#020617', 0.06);
          K.ambient('#6a7a9a');
          K.floor({ x0: 78, y0: 12, x1: 96, y1: 22, color: '#05070f' });
          const list = [['barou', { angry: true }, '#ef4444'], ['nagi', {}, '#e2e8f0'], ['shidou', {}, '#ec4899'], ['kaiser', {}, '#60a5fa'], ['rin', { angry: true }, RIN_C]];
          list.forEach(([id, ex, col], i) => {
            const a = 4 + i * 10;
            const hit = 46 + i * 24;
            const on = seg(t, a, a + 14);
            if (on <= 0) return;
            const dv = seg(t, hit, hit + 8);
            const x = 83.6 + i * 1.2;
            const lit = lerp(1.25, 0.25, dv);
            K.actor(id, { x, y: 15, ang: Math.PI / 2, extra: ex, frame: 45, k: 0.9, light: [lit, lit, lit * 1.1], alpha: on });
            K.floor({ x0: x - 0.4, y0: 14.6, x1: x + 0.4, y1: 15.4, z: 0.006, img: CE.c3fGlowCv(col), color: '#ffffff', em: true, alpha: 0.6 * (1 - dv) + 0.05 });
          });
          const pos = Math.min(4, Math.max(0, (t - 30) / 26));
          K.cam([84.2 + pos * 0.9, 0.62, 17.6], [84.2 + pos * 0.9 + 0.3, 0.55, 15], 46);
        } else {
          // com fome: o seu rosto de perto
          const u = t - cut;
          CE.c3fTheatre(K, { amb: '#3a5a5a' });
          K.expo(0.85);
          K.actor('you', { x: LEC[0], y: LEC[1] - 0.25, z: TH.stageZ, ang: Math.PI / 2, extra: { outfit: 'suit' }, frame: 45, k: 0.9, light: [0.6, 1.1, 1.05] });
          const sh = u >= 56 ? (1 - seg(u, 56, 80)) * 0.02 : 0.003;
          K.cam([LEC[0] + K.noise(S.f * 2, 3) * sh, TH.stageZ + 0.68, LEC[1] + 1.0 - u * 0.0008], [LEC[0], TH.stageZ + 0.68, LEC[1] - 0.25], 28);
        }
      } else if (phase === 3) {
        const cut = 204;
        const rinX = 89.2;
        const rinR = TH.rows - 1;
        const seat = seatPose('rin', c.rin, { dim: 0.45, dimTint: '0,12,16' });
        if (t < cut) {
          // a plateia de pé, aplaudindo; a câmera sobe até a última fileira
          CE.c3fTheatre(K, { amb: '#8a6a7a' });
          const clap = Math.floor(t / 7);
          CE.c3fAudience(K, { seed: 27, r0: 0, r1: TH.rows - 1, max: 40, face: [86, 10], rise: () => 1, frame: 45 });
          K.actor('noa', { x: 84.2, y: rowY(0) + 0.06, ang: -Math.PI / 2, extra: { outfit: 'suit' }, anim: 'clap', frame: clap % 2 ? 6 : 0, k: 0.9, light: [1.0, 0.9, 0.85] });
          poseSprite(K, seat, { x: rinX, y: rowY(rinR) + 0.06, z: rowZ(rinR), light: [0.55, 0.75, 0.8] });
          const k = easeIO(seg(t, 4, cut - 14));
          K.cam([lerp(86, 88.4, k), lerp(0.9, rowZ(rinR) + 0.75, k), lerp(11.6, rowY(rinR) - 2.4, k)], [lerp(86, rinX, k), lerp(0.7, rowZ(rinR) + 0.5, k), lerp(17, rowY(rinR), k)], lerp(52, 36, k));
        } else {
          // o rosto do Rin no escuro, os olhos acesos
          const u = t - cut;
          CE.c3fTheatre(K, { amb: '#2a2a3a' });
          K.expo(0.75);
          poseSprite(K, seat, { x: rinX, y: rowY(rinR) + 0.06, z: rowZ(rinR), light: [0.3, 0.55, 0.6] });
          const k = easeIO(u / (dur - cut));
          const eh = rowZ(rinR) + poseEye(2.6);
          K.cam([rinX - 0.3, eh + 0.02, rowY(rinR) - 1.75 + k * 0.1], [rinX, eh - 0.1, rowY(rinR)], 30);
        }
      } else {
        // o Rin sobe o corredor e sai pela porta dos fundos; a porta fecha
        const close = 238;
        const open = 1 - ease(seg(t, close, close + 22));
        CE.c3fTheatre(K, { amb: '#7a5a6a' });
        CE.c3fAudience(K, { seed: 29, r0: 0, r1: TH.rows, max: 40, face: [86, 10], frame: 0, light: [0.4, 0.32, 0.36] });
        const dz = rowZ(TH.rows);
        // a porta: a luz do corredor e as folhas fechando
        pic(K, { x: 86, y: TH.door + 0.57, z: dz, w: 0.9, h: 1.25, ang: -Math.PI / 2, color: '#fff6dc', em: true, alpha: Math.max(0.02, open) });
        [-1, 1].forEach((s) => K.box({ x0: 86 + s * (0.45 * open) + (s < 0 ? -0.45 : 0), y0: TH.door + 0.5, x1: 86 + s * (0.45 * open) + (s < 0 ? 0 : 0.45), y1: TH.door + 0.56, z0: dz, z1: dz + 1.25, color: '#1c1016' }));
        if (open > 0.02) K.floor({ x0: 85.55, y0: TH.door - 3, x1: 86.45, y1: TH.door + 0.5, z: dz + 0.01, color: '#ffedb4', alpha: 0.2 * open, em: true });
        const wk = easeIO(seg(t, 0, close - 4));
        const ry = lerp(14.2, TH.door + 0.3, wk);
        const rz = Math.max(0, Math.min(dz, Math.ceil((ry - TH.row0 - 0.5) / TH.step) * TH.rake));
        if (t < close + 20) {
          const walking = t < close - 6;
          K.actor('rin', { x: 86, y: ry, z: rz, ang: Math.PI / 2, extra: { outfit: 'suit', angry: true }, anim: walking ? 'run' : 'idle', frame: walking ? WALKF(S.f, 8) : 45, k: 0.9, light: [0.4, 0.6, 0.65] });
        }
        const k = easeIO(t / dur);
        K.cam([86.05, lerp(0.85, 1.2, k), lerp(12.6, 13.6, k)], [86, lerp(0.9, dz + 0.6, k), TH.door], 44);
      }
    },
    overlay(ctx, S, K) {
      CE.c3fCamBack();
      const { W, H, t, phase, top, bot } = S;
      const c = galaCast();
      if (phase === 0) {
        const cut = 150;
        if (t < cut) {
          const pb = scr(K, 86, TH.stageZ + 0.66, 11.0);
          if (pb) {
            for (let i = 0; i < 5; i++) {
              const a = Math.max(0, Math.sin(t * 0.05 + i * 1.7));
              this.finSparkle(ctx, pb.x + Math.cos(i * 2.4) * 90, pb.y + Math.sin(i * 2.4) * 80, 10, a * 0.9, 'rgba(253,230,138,0.7)');
            }
          }
          this.cineDust(ctx, W, H, t, 26, 'rgba(254,240,138,0.45)', 4);
          this.rincPops(ctx, POPS0, t, 3, 64, 7);
          this.finKicker(ctx, 40, top + 30, 'PARIS • THÉÂTRE DU CHÂTELET', seg(t, 8, 50), GOLD);
          this.finKicker(ctx, 40, top + 58, 'A CERIMÔNIA DA BOLA DE OURO', seg(t, 30, 80), '#e2e8f0');
          if (t > cut - 12) this.cineFlash(ctx, W, H, seg(t, cut - 12, cut), '#000000');
          this.cineSfx(S, 20, 'flash', () => window.SFX?.blip?.(1200));
        } else {
          const u = t - cut;
          this.rincPops(ctx, POPS1, t, 7, 50, 7);
          this.finKicker(ctx, 40, top + 30, 'O VENCEDOR SOBE AO PALCO', seg(u, 10, 50), GOLD);
          this.finKicker(ctx, 40, top + 58, this.cinePlayerName(), seg(u, 30, 70), YOU_C);
          this.cineFlash(ctx, W, H, 1 - seg(u, 0, 12), '#000000');
        }
      } else if (phase === 1) {
        this.cineBokeh(ctx, W, top, bot, t, 16, ['rgba(251,191,36,0.35)', 'rgba(254,240,138,0.25)'], 21);
        // painel: o nº 299 (o último do ranking do Blue Lock)
        const kA = ease(seg(t, 24, 40)) * (1 - ease(seg(t, 186, 198)));
        if (kA > 0) {
          this.finPanel(ctx, [[770, top + 22], [W - 22, top + 14], [W - 30, bot - 22], [748, bot - 14]], () => {
            this.cineGradient(ctx, 700, top, 600, bot - top, [[0, '#071a33'], [1, '#020814']]);
            this.ptdRays(ctx, 1010, 330, 640, '#38bdf8', 0.12, t * 0.003, 36, 0.03);
            this.finRim(ctx, c.youBL, 1010, bot + 100, 520, { facing: 'back', dim: 0.25, dimTint: '2,8,20', shirtNumber: 299 }, '#38bdf8', [-1, 1], 3);
            this.rincStamp(ctx, 'Nº 299', 1010, top + 74, 70, '#e0f2fe', t, 40, 3);
            this.finKicker(ctx, 786, bot - 46, 'O ÚLTIMO DO RANKING', seg(t, 60, 100), '#38bdf8');
          }, { dx: (1 - kA) * 620, border: '#bae6fd' });
        }
        // painel: a derrota, "sem talento"
        const kB = ease(seg(t, 200, 216));
        if (kB > 0) {
          this.finPanel(ctx, [[760, top + 14], [W - 22, top + 22], [W - 22, bot - 14], [740, bot - 22]], () => {
            this.cineGradient(ctx, 700, top, 600, bot - top, [[0, '#2a0508'], [1, '#0a0103']]);
            this.ptdRays(ctx, 1010, 320, 640, '#ef4444', 0.16, -t * 0.003, 36, 0.03);
            this.zselKneel(ctx, c.youBL, 1010, bot + 30, 400, { dim: 0.55, dimTint: '30,2,6' });
            this.rincShade(ctx, c.youBL, 1010, bot + 30 + (31.3 - 26.4) * (400 / 36), 400, 0.85);
            this.rincStamp(ctx, 'SEM', 1010, top + 70, 58, '#fecaca', t, 222, 3);
            this.rincStamp(ctx, 'TALENTO.', 1010, top + 134, 70, '#ef4444', t, 236, 3, 460);
          }, { dx: (1 - kB) * 620, border: '#fecaca' });
        }
      } else if (phase === 2) {
        const cut = 176;
        if (t < cut) {
          const list = [['BAROU', '#ef4444'], ['NAGI', '#e2e8f0'], ['SHIDOU', '#ec4899'], ['KAISER', '#60a5fa'], ['RIN', RIN_C]];
          list.forEach(([nm, col], i) => {
            const a = 4 + i * 10;
            const hit = 46 + i * 24;
            if (t < a) return;
            const dv = seg(t, hit, hit + 8);
            const x = 83.6 + i * 1.2;
            const p = scr(K, x, 0.5, 15);
            const pf = scr(K, x, 0, 15);
            if (!p || !pf) return;
            if (dv > 0) this.bdorClaw(ctx, p.x, p.y, dv, 200);
            ctx.save();
            ctx.globalAlpha = seg(t, a, a + 14);
            ctx.fillStyle = 'rgba(2,6,23,0.85)';
            ctx.fillRect(pf.x - 80, pf.y + 10, 160, 40);
            ctx.font = 'italic 900 24px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = dv > 0 ? '#475569' : col;
            ctx.fillText(nm, pf.x, pf.y + 30);
            ctx.restore();
            this.cineSfx(S, hit, 'garra' + i, () => window.SFX?.tackle?.());
          });
          this.cineImpactText(ctx, 'UM POR UM.', W / 2, (top + bot) / 2 - 140, 92, YOU_C, seg(t, 150, 160), W * 0.7, -0.05);
        } else {
          const u = t - cut;
          const hit = 56;
          this.ptdRays(ctx, 640, 330, W * 1.1, YOU_C, 0.06 + 0.12 * seg(u, 40, 70), u * 0.004, 50, 0.028);
          // a faixa dos olhos (mangá) no meio da tela
          const kb = ease(seg(u, 4, 18));
          this.finPanel(ctx, [[0, 250], [W, 244], [W, 410], [0, 416]], () => {
            ctx.fillStyle = '#010608';
            ctx.fillRect(0, 230, W, 200);
            const U = this.wcdEyeBand(ctx, c.you, 640, 330, 900, { dim: 0.08, dimTint: '0,20,20' });
            this.wcdEyes(ctx, 640, 330, U, { ring: YOU_C, iris: '#022c22', line: '#010405', glow: 'rgba(0,245,212,0.85)', glowA: 0.3 + 0.7 * seg(u, 20, 60), shine: 1, angry: u > hit });
          }, { dx: (1 - kb) * -W, border: '#99f6e4' });
          ctx.fillStyle = 'rgba(1,8,10,0.8)';
          ctx.fillRect(0, top, W, 84);
          ctx.fillRect(0, bot - 120, W, 120);
          this.rincStamp(ctx, 'E EU AINDA TÔ...', 640, top + 44, 44, '#ccfbf1', u, 14, 2, W * 0.8);
          this.cineImpactText(ctx, 'COM FOME.', 640, bot - 62, 100, YOU_C, seg(u, hit, hit + 10), W * 0.7, -0.04);
          if (u >= hit) this.cineFlash(ctx, W, H, 0.32 * (1 - seg(u, hit, hit + 12)), '#ccfbf1');
          this.cineSfx(S, cut + hit, 'fome', () => window.SFX?.kick?.(1));
        }
      } else if (phase === 3) {
        const cut = 204;
        const rinX = 89.2;
        const rinR = TH.rows - 1;
        const eh = rowZ(rinR) + poseEye(2.6);
        if (t < cut) {
          const glow = 0.7 + 0.3 * Math.sin(t * 0.09);
          if (t > 120) eyesAt(ctx, K, rinX, eh, rowY(rinR) + 0.06, { ring: '#5eead4', iris: '#042f2e', line: '#010405', angry: true, glow: 'rgba(45,212,191,0.85)', glowA: glow, char: c.rin });
          this.finKicker(ctx, 40, top + 30, 'DE PÉ, O TEATRO INTEIRO', seg(t, 10, 50), GOLD);
          this.finKicker(ctx, 40, top + 58, 'MENOS UM.', seg(t, 150, 186), RIN_C);
          if (t > 150) this.finKicker(ctx, W / 2 + 120, bot - 40, 'RIN ITOSHI • ÚLTIMA FILEIRA', seg(t, 160, 196), RIN_C);
        } else {
          const u = t - cut;
          this.ptdRays(ctx, 520, 330, W, '#0f766e', 0.1, u * 0.002, 40, 0.025);
          const pulse = 0.7 + 0.3 * Math.sin(u * 0.08);
          eyesAt(ctx, K, rinX, eh, rowY(rinR) + 0.06, { ring: '#2dd4bf', iris: '#042f2e', line: '#010405', angry: true, tiny: u > 70, glow: 'rgba(45,212,191,0.7)', glowA: pulse, shine: 0.9, char: c.rin });
          const kp = ease(seg(u, 40, 56));
          if (kp > 0) {
            this.finPanel(ctx, [[850, bot - 236], [W - 22, bot - 250], [W - 22, bot - 18], [830, bot - 18]], () => {
              this.cineGradient(ctx, 800, bot - 260, 500, 260, [[0, '#04161a'], [1, '#010608']]);
              ctx.fillStyle = '#2a0a12';
              ctx.fillRect(800, bot - 66, 500, 60);
              ctx.fillStyle = 'rgba(190,18,60,0.35)';
              ctx.fillRect(800, bot - 66, 500, 3);
              const sh = Math.round(this.cineNoise(S.f * 3.3, 2) * 3);
              this.cineGlow(ctx, 1040, bot - 150, 200, 'rgba(45,212,191,0.16)');
              this.wcdPix(ctx, this.wcdFistCv(), 890 + sh, bot - 226, 11);
              ctx.fillStyle = 'rgba(0,16,20,0.22)';
              ctx.fillRect(800, bot - 260, 500, 260);
            }, { dy: (1 - kp) * 300, border: '#5eead4' });
          }
          this.finKicker(ctx, 40, top + 30, 'RIN ITOSHI', seg(u, 6, 30), RIN_C);
          this.rincStamp(ctx, 'NÃO APLAUDE.', 1010, top + 74, 46, '#99f6e4', u, 20, 2, 460);
          this.cineFlash(ctx, W, H, 1 - seg(u, 0, 10), '#000000');
        }
      } else {
        const close = 238;
        // as mãos batendo palma das fileiras da frente (silhuetas na tela)
        this.bdorHeads(ctx, W, bot + 30, 1.1, t, { color: '#020106', rim: 'rgba(251,191,36,0.45)', clap: 0.6, seed: 4, handDy: -46, hand: '#1f150d' });
        this.finKicker(ctx, 40, top + 30, 'O DISCURSO AINDA ECOA', seg(t, 10, 50), GOLD);
        this.rincStamp(ctx, 'CLAC.', 900, top + 150, 52, '#e2e8f0', t, close + 20, 3);
        this.finKicker(ctx, W / 2, bot - 40, 'O RIN SAIU ANTES DO FIM', seg(t, close + 26, close + 42), RIN_C, 'center');
        this.cineFlash(ctx, W, H, 1 - seg(t, 0, 10), '#000000');
        this.cineSfx(S, close + 20, 'porta', () => window.SFX?.tackle?.());
      }
    }
  });

  // ==========================================================================
  // 2. A LIÇÃO DO SAE — o corredor do hotel → o campo de treino de madrugada, na chuva
  // ==========================================================================
  const nightRain = (K) => {
    K.sky('#010309', '#0a1f1a', 0.1);
    K.fog('#03080c', 0.035);
    K.expo(0.9);
  };
  // o gol sul do campo: as bolas amontoadas dentro (n bolas)
  const pile = (K, n) => {
    for (let i = 0; i < Math.min(n, 40); i++) {
      const row = i < 16 ? 0 : i < 28 ? 1 : 2;
      const kk = row === 0 ? i : row === 1 ? i - 16 : i - 28;
      const cnt = [16, 12, 12][row];
      K.ball(52.1 + (kk + 0.5) * (1.8 / cnt) + (rnd(i, 51) - 0.5) * 0.04, 22.62 + (rnd(i, 52) - 0.5) * 0.16 + row * 0.04, 0.05 + row * 0.07, { k: 0.66 });
    }
  };
  const lic = () => CE.bdorCast();
  // a poça (oval escura com o brilho verde-água na borda)
  const puddleCv = () =>
    canvas('puddle', 128, 64, (g, w, h) => {
      g.fillStyle = 'rgba(2,10,16,0.92)';
      g.beginPath();
      g.ellipse(w / 2, h / 2, w * 0.48, h * 0.44, 0, 0, TAU);
      g.fill();
      const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w * 0.45);
      gr.addColorStop(0, 'rgba(45,212,191,0.28)');
      gr.addColorStop(1, 'rgba(45,212,191,0)');
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = 'rgba(165,243,252,0.35)';
      g.lineWidth = 2;
      g.stroke();
    });

  CE.registerCine3D('rin_sae_licao', {
    phases: [320, 400, 340, 380, 450, 400, 430],
    music: 'dread',
    title: '🌧️ A LIÇÃO DO SAE',
    tags: ['PLANO 1 • O CORREDOR', 'PLANO 2 • GAROTO CHORÃO', 'PLANO 3 • UMA DA MANHÃ', 'PLANO 4 • JOGA COMIGO', 'PLANO 5 • 10 x 0', 'PLANO 6 • A LIÇÃO', 'PLANO 7 • O DESTRUIDOR'],
    subs: [
      [
        { from: 12, to: 200, who: 'SAE ITOSHI', text: '"Saindo no meio do discurso, Rin?"', color: SAE_C },
        { from: 204, to: 320, who: 'RIN ITOSHI', text: '"Não enche."', color: RIN_C }
      ],
      [
        { from: 10, to: 186, who: 'SAE ITOSHI', text: '"Você é só um garoto chorão..."', color: SAE_C },
        { from: 188, to: 352, who: 'SAE ITOSHI', text: '"...que não aceita perder."', color: SAE_C }
      ],
      [
        { from: 10, to: 172, who: 'NARRADOR', text: 'Uma da manhã. Campo vazio.', color: NARR_C },
        { from: 174, to: 340, who: 'RIN ITOSHI', text: '(De novo. De novo. DE NOVO.)', color: RIN_C }
      ],
      [
        { from: 120, to: 246, who: 'SAE ITOSHI', text: '"Joga comigo."', color: SAE_C },
        { from: 250, to: 380, who: 'RIN ITOSHI', text: '"Vou te esmagar."', color: RIN_C }
      ],
      [
        { from: 16, to: 112, who: 'SAE ITOSHI', text: '"Lento."', color: SAE_C },
        { from: 116, to: 262, who: 'SAE ITOSHI', text: '"Previsível. De novo."', color: SAE_C },
        { from: 270, to: 450, who: 'RIN ITOSHI', text: '(Por que eu não alcanço?!)', color: RIN_C }
      ],
      [
        { from: 10, to: 150, who: 'SAE ITOSHI', text: '"Perder dói? Ótimo."', color: SAE_C },
        { from: 152, to: 372, who: 'SAE ITOSHI', text: '"Para de chorar e transforma isso em fome."', color: SAE_C }
      ],
      [
        { from: 14, to: 130, who: 'RIN ITOSHI', text: '(...Fome.)', color: RIN_C },
        { from: 150, to: 344, who: 'RIN ITOSHI', text: '"Aproveita o troféu enquanto pode."', color: RIN_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'nel_dome',
    scene(K, S) {
      CE.c3fCamFix(K);
      const { t, phase, dur } = S;
      const c = lic();
      const sae = crossPose('sae', c.sae, { dim: 0.18, dimTint: '22,4,10', rim: '#e11d48', rimSides: [-1, 1], rimD: 2 });
      if (phase === 0 || phase === 1) {
        // o corredor do hotel: o Sae encostado na parede, de braços cruzados
        K.sky('#140b18', '#140b18', 0);
        K.fog('#140b18', 0.05);
        CE.c3fHotelHall(K, { amb: '#b07a50' });
        K.expo(0.85);
        if (phase === 0) {
          poseSprite(K, sae, { x: 86.05, y: 11.0, light: [0.95, 0.75, 0.65] });
          const wk = easeIO(seg(t, 0, 190));
          const walking = t < 186;
          K.actor('rin', { x: lerp(85.5, 85.25, wk), y: lerp(6.8, 12.4, wk), ang: Math.PI / 2, extra: { outfit: 'suit', angry: true }, anim: walking ? 'run' : 'idle', frame: walking ? WALKF(S.f, 7) : 45, k: 0.9, light: [0.8, 0.7, 0.62] });
          const k = easeIO(t / dur);
          K.cam([85.4, 0.72, lerp(14.7, 14.4, k)], [85.5, 0.7, 10], lerp(44, 40, k));
        } else {
          const cut = 352;
          poseSprite(K, sae, { x: 86.05, y: 11.0, light: [0.95, 0.75, 0.65] });
          if (t < cut) {
            // por cima do ombro do Rin: o Sae, frio
            const rage = seg(t, 290, cut);
            K.actor('rin', { x: 84.98, y: 12.3, ang: -Math.PI / 2 + 0.4, extra: { outfit: 'suit', angry: true }, frame: 45, k: 0.9, light: [0.22, 0.28, 0.3] });
            const sh = K.noise(S.f * 2.3, 4) * (0.004 + rage * 0.02);
            K.cam([85.15 + sh, 0.78, 13.45], [85.85, 0.66, 11.0], 34);
          } else {
            // o Rin passa ombro com ombro; o Sae nem se mexe
            const u = t - cut;
            const wk = seg(u, 0, 46);
            K.actor('rin', { x: lerp(85.3, 85.7, wk), y: lerp(12.2, 9.4, wk), ang: -Math.PI / 2, extra: { outfit: 'suit', angry: true }, anim: 'run', frame: WALKF(S.f, 3), k: 0.9, light: [0.8, 0.7, 0.62] });
            const sh = K.noise(S.f * 2.5, 2) * (u >= 22 ? (1 - seg(u, 22, 42)) * 0.03 : 0.008);
            K.cam([85.2 + sh, 0.7, 13.4], [85.8, 0.66, 10.6], 44);
          }
        }
        return;
      }
      nightRain(K);
      if (phase === 2) {
        const cut = 170;
        const N0 = 34;
        if (t < cut) {
          // uma da manhã: o Rin chutando sozinho na chuva (de trás dele, o gol lá na frente)
          const per = 26;
          const n = Math.max(0, Math.floor((t - 8) / per));
          const q = t < 8 ? 0 : (t - 8) % per;
          const kickT = 8 + n * per + 10;
          const landed = Math.max(0, Math.floor((t - 8 - 22) / per) + 1);
          pile(K, N0 + landed);
          const pz = q < 10 ? 'windup' : q < 18 ? 'shoot' : 'idle';
          K.actor('rin', { x: 53, y: 19.6, ang: Math.PI / 2, extra: Object.assign({ angry: true }, KIT_TR), anim: pz, frame: 45, k: 0.9, light: [0.4, 0.6, 0.65] });
          if (q < 10) K.ball(53.15, 19.85, 0.06);
          if (t >= kickT && t < kickT + 12) {
            const p = (t - kickT) / 12;
            K.ball(lerp(53.15, 52.4 + rnd(n, 3) * 1.2, ease(p)), lerp(19.85, 22.5, ease(p)), 0.06 + Math.sin(p * Math.PI) * 0.4 + p * 0.3);
          }
          const k = easeIO(t / cut);
          K.cam([52.6, lerp(0.78, 0.72, k), lerp(17.6, 17.9, k)], [53.1, 0.55, 21.6], 46);
        } else {
          // de trás da rede: o Rin chutando em você
          const u = t - cut;
          const per = 24;
          const n = Math.max(0, Math.floor((u - 6) / per));
          const q = u < 6 ? 0 : (u - 6) % per;
          const kickU = 6 + n * per + 9;
          pile(K, 44);
          const pz = q < 9 ? 'windup' : q < 16 ? 'shoot' : 'idle';
          K.actor('rin', { x: 53, y: 19.8, ang: Math.PI / 2, extra: Object.assign({ angry: true }, KIT_TR), anim: pz, frame: 45, k: 0.9, light: [0.45, 0.7, 0.75] });
          if (u >= kickU && u < kickU + 9) {
            const p = (u - kickU) / 9;
            K.ball(lerp(53.1, 52.6 + rnd(n, 7) * 0.8, p * p), lerp(20, 22.85, p * p), 0.1 + p * p * (0.3 + rnd(n, 8) * 0.5));
          }
          K.cam([53.05, 0.55, 22.8], [53, 0.55, 19.8], 50);
        }
      } else if (phase === 3) {
        const cut = 120;
        if (t < cut) {
          // rente ao chão: os sapatos do Sae pisando nas poças
          const wx = lerp(56.2, 53.9, seg(t, 0, 112));
          K.actor('sae', { x: wx, y: 15.0, ang: Math.PI, extra: { outfit: 'suit' }, anim: t < 112 ? 'run' : 'idle', frame: t < 112 ? WALKF(S.f, 10) : 45, k: 0.9, light: [0.6, 0.45, 0.5] });
          [[52.6, 15.4, 0.7], [54.2, 15.1, 0.9], [55.6, 15.3, 0.6]].forEach(([x, y, r]) => K.floor({ x0: x - r, y0: y - r * 0.3, x1: x + r, y1: y + r * 0.3, z: 0.008, img: puddleCv(), color: '#ffffff', alpha: 0.999 }));
          K.cam([52.7, 0.1, 16.2], [54.3, 0.16, 15.0], 44);
        } else {
          // o Sae entra na luz, a bola no pé; o Rin do outro lado
          const u = t - cut;
          const wk = easeIO(seg(u, 0, 70));
          const sx = lerp(56.0, 54.2, wk);
          const walking = u < 68;
          K.actor('sae', { x: sx, y: 15.0, ang: walking ? Math.PI : Math.PI, extra: { outfit: 'suit' }, anim: walking ? 'run' : 'idle', frame: walking ? WALKF(S.f, 8) : 45, k: 0.9, light: [1.05, 0.85, 0.85] });
          K.actor('rin', { x: 51.6, y: 15.0, ang: 0, extra: Object.assign({ angry: true }, KIT_TR), frame: 45, k: 0.9, light: [0.45, 0.68, 0.72] });
          [[51.1, 15.3], [52.3, 15.4], [52.6, 14.8], [50.9, 14.7]].forEach(([x, y]) => K.ball(x, y, 0.06, { k: 0.7 }));
          let bx;
          let bz = 0.06;
          if (u < 40) bx = 52.3;
          else if (u < 96) bx = lerp(52.3, 53.95, ease(seg(u, 40, 96)));
          else if (u < 230 && u > 140) {
            bx = 53.98;
            bz = 0.06 + Math.abs(Math.sin(((u - 140) / 30) * Math.PI)) * (u < 200 ? 0.55 : 0.32);
          } else bx = 53.95;
          K.ball(bx, 15.05, bz);
          K.floor({ x0: 53.1, y0: 14.3, x1: 55.1, y1: 15.7, z: 0.006, img: CE.c3fGlowCv('rgba(224,242,254,0.5)'), color: '#ffffff', em: true, alpha: 0.999 });
          const k = easeIO(u / (dur - cut));
          K.cam([52.9, 0.62, lerp(18.0, 17.6, k)], [52.9, 0.5, 15.0], lerp(48, 44, k));
        }
      } else if (phase === 4) {
        // o mano a mano: o Sae passa por ele de novo e de novo
        const R = [6, 50, 92, 128, 160, 188, 214, 238, 260, 282];
        const END = 312;
        let i = 0;
        for (let j = 0; j < R.length; j++) if (t >= R[j]) i = j;
        K.floor({ x0: 51.5, y0: 14.0, x1: 54.5, y1: 16.0, z: 0.006, img: CE.c3fGlowCv('rgba(224,242,254,0.45)'), color: '#ffffff', em: true, alpha: 0.999 });
        if (t < END) {
          const L = (R[i + 1] ?? END) - R[i];
          const q = (t - R[i]) / L;
          const dir = i % 2 ? -1 : 1;
          const slideRound = i % 2 === 0;
          const saeX = 53 + dir * lerp(-1.8, 1.8, q);
          const lunge = ease(seg(q, 0.24, 0.46));
          const rinX = 53 + dir * (0.3 - lunge * (slideRound ? 1.1 : 0.7));
          const over = Math.sin(seg(q, 0.3, 0.56) * Math.PI);
          const hop = slideRound ? over * 0.22 : over * 0.08;
          K.actor('sae', { x: saeX, y: 14.6, z: hop, ang: dir > 0 ? 0 : Math.PI, extra: { outfit: 'suit' }, anim: 'run', frame: WALKF(S.f, 3), k: 0.9, light: [1.0, 0.82, 0.85] });
          K.ball(saeX + dir * 0.15, 14.62, 0.06 + hop * 0.6 + (slideRound ? over * 0.5 : 0));
          const rinPose = lunge > 0 ? (slideRound ? 'slide' : 'run') : 'idle';
          if (i === R.length - 1 && q > 0.72) {
            poseSprite(K, lyingPose('rin', c.rinTr, { dim: 0.3, dimTint: '0,12,18' }), { x: rinX - dir * 0.2, y: 15.2, light: [0.45, 0.7, 0.75] });
          } else K.actor('rin', { x: rinX, y: 15.2, ang: dir > 0 ? Math.PI : 0, extra: Object.assign({ angry: true }, KIT_TR), anim: rinPose, frame: rinPose === 'run' ? 5 : 45, k: 0.9, light: [0.45, 0.7, 0.75] });
          K.cam([53, 0.62, 18.4], [53, 0.5, 14.9], 50);
        } else {
          // o Rin caído na lama; o Sae em pé, a bola debaixo do sapato
          poseSprite(K, lyingPose('rin', c.rinTr, { dim: 0.3, dimTint: '0,12,18' }), { x: 53.0, y: 15.2, light: [0.45, 0.7, 0.75] });
          K.actor('sae', { x: 54.0, y: 14.7, ang: Math.PI / 2 + 0.6, extra: { outfit: 'suit' }, frame: 45, k: 0.9, light: [1.0, 0.82, 0.85] });
          K.ball(53.85, 14.85, 0.06);
          const k = easeIO(seg(t, END, dur));
          K.cam([53.2, lerp(0.62, 0.7, k), lerp(18.4, 17.6, k)], [53.4, 0.42, 14.9], lerp(50, 44, k));
        }
      } else if (phase === 5) {
        // o Sae em pé sobre ele, de contraluz; depois vai embora no escuro
        const leave = 300;
        poseSprite(K, lyingPose('rin', c.rinTr, { dim: 0.42, dimTint: '0,12,18' }), { x: 52.45, y: 16.6, light: [0.35, 0.55, 0.62] });
        if (t < leave) {
          K.actor('sae', { x: 53.7, y: 15.1, ang: Math.PI / 2 + 0.3, extra: { outfit: 'suit' }, frame: 45, k: 0.9, light: [0.7, 0.55, 0.6] });
          K.ball(53.9, 15.25, 0.06);
        } else {
          const w = easeIO(seg(t, leave, dur));
          K.ball(53.9, 15.25, 0.06);
          K.actor('sae', { x: lerp(53.7, 55.2, w), y: lerp(15.1, 12.6, w), ang: -Math.PI / 2 + 0.5, extra: { outfit: 'suit' }, anim: 'run', frame: WALKF(S.f, 9), k: 0.9, light: [0.6, 0.45, 0.5], alpha: 1 - 0.7 * w });
        }
        const k = easeIO(t / dur);
        K.cam([53.0, lerp(0.45, 0.5, k), lerp(18.3, 18.0, k)], [53.3, 0.58, 15.2], 46);
      } else {
        const cA = 70;
        const cB = 150;
        const kneel = kneelPose('rin', c.rinTr, { dim: 0.45, dimTint: '0,12,18' });
        if (t < cA) {
          // de joelhos, a poça na frente
          poseSprite(K, kneel, { x: 53, y: 15.0, light: [0.4, 0.62, 0.7] });
          K.floor({ x0: 52.2, y0: 15.1, x1: 53.8, y1: 15.9, z: 0.008, img: puddleCv(), color: '#ffffff', alpha: 0.999 });
          const k = easeIO(t / cA);
          K.cam([53.05, lerp(0.7, 0.62, k), lerp(17.4, 17.0, k)], [53, 0.35, 15.2], 44);
        } else if (t < cB) {
          // o rosto refletido na poça: o sorriso aparece
          const u = t - cA;
          const grin = u >= 36;
          const face = canvas('poca|' + (grin ? 1 : 0), 256, 256, (g, w, h) => {
            g.save();
            g.beginPath();
            g.ellipse(w / 2, h / 2, w * 0.48, h * 0.46, 0, 0, TAU);
            g.clip();
            g.fillStyle = '#01070b';
            g.fillRect(0, 0, w, h);
            const ch = grin ? c.rinGrin : c.rinTr;
            const r = CE.finHead(g, ch, w / 2, h * 0.44, 230, { dim: 0.4, dimTint: '0,24,30' });
            CE.wcdEyes(g, w / 2, h * 0.42, r.u, { ring: '#2dd4bf', iris: '#0f766e', line: '#010405', angry: grin, half: !grin, lid: CE.finShade(c.rinTr.skinColor || '#f8dcc4', -0.45), glow: 'rgba(45,212,191,0.6)', glowA: grin ? 0.9 : 0.15, shine: 0.8, char: ch });
            g.fillStyle = 'rgba(4,36,48,0.35)';
            g.fillRect(0, 0, w, h);
            g.restore();
            g.strokeStyle = 'rgba(165,243,252,0.35)';
            g.lineWidth = 3;
            g.beginPath();
            g.ellipse(w / 2, h / 2, w * 0.48, h * 0.46, 0, 0, TAU);
            g.stroke();
          });
          K.floor({ x0: 52.3, y0: 14.3, x1: 53.7, y1: 15.7, z: 0.01, img: face, color: '#ffffff', light: [0.75, 0.85, 0.9], alpha: 0.999 });
          K.cam([53.0, 1.45 - u * 0.0015, 15.5], [53, 0, 14.98], 44);
        } else {
          // o olho do destruidor
          const u = t - cB;
          poseSprite(K, kneel, { x: 53, y: 15.0, light: [0.35, 0.7, 0.72] });
          const eh = poseEye(31.3 - 26.4);
          const sh = u >= 86 ? (1 - seg(u, 86, 112)) * 0.02 : 0.003;
          K.cam([53 + K.noise(S.f * 2, 1) * sh, eh + 0.02, 16.3 - u * 0.0008], [53, eh - 0.04, 15.0], 30);
        }
      }
    },
    overlay(ctx, S, K) {
      CE.c3fCamBack();
      const { W, H, t, phase, top, bot } = S;
      const c = lic();
      if (phase === 0) {
        this.finKicker(ctx, 40, top + 30, 'HOTEL DA GALA • 23:58', seg(t, 8, 50), GOLD);
        this.finKicker(ctx, 40, top + 58, 'SAE ITOSHI ESTAVA ESPERANDO', seg(t, 30, 80), SAE_C);
        const kE = ease(seg(t, 204, 218));
        if (kE > 0) {
          this.finPanel(ctx, [[18, top + 14], [W - 18, top + 14], [W - 18, top + 150], [18, top + 164]], () => {
            ctx.fillStyle = '#010608';
            ctx.fillRect(0, top, W, 180);
            const ey = top + 90;
            const U = this.wcdEyeBand(ctx, c.rin, 640, ey, 800, { dim: 0.2, dimTint: '0,20,24' });
            this.wcdEyes(ctx, 640, ey, U, { ring: '#2dd4bf', iris: '#042f2e', angry: true, line: '#010405', look: 1, glow: 'rgba(45,212,191,0.5)', glowA: 0.6 });
          }, { dx: (1 - kE) * -W, border: '#99f6e4' });
        }
      } else if (phase === 1) {
        const cut = 352;
        if (t < cut) {
          const rage = seg(t, 290, cut);
          const fadeA = 1 - seg(t, 176, 190);
          this.rincStamp(ctx, 'GAROTO', 560, top + 64, 56, '#fecdd3', t, 40, 3, 0, 'center', fadeA);
          this.rincStamp(ctx, 'CHORÃO.', 560, top + 128, 66, SAE_C, t, 70, 3, 0, 'center', fadeA);
          const kp = ease(seg(t, 196, 210));
          if (kp > 0) {
            this.finPanel(ctx, [[22, top + 16], [560, top + 16], [540, top + 176], [22, top + 190]], () => {
              ctx.fillStyle = '#010608';
              ctx.fillRect(0, top, 580, 200);
              const ey = top + 98;
              const U = this.wcdEyeBand(ctx, c.rin, 290, ey, 720, { dim: 0.2, dimTint: '0,20,24' });
              const shaky = t < 290 ? [0, 1, 0, -1][Math.floor(t / 2) % 4] : 0;
              this.wcdEyes(ctx, 290, ey, U, { ring: '#2dd4bf', iris: '#042f2e', line: '#010405', tiny: true, look: shaky, angry: t >= 290, glow: 'rgba(45,212,191,0.6)', glowA: rage });
            }, { dx: (1 - kp) * -620, border: '#99f6e4' });
          }
          this.cineImpactText(ctx, 'PERDER.', 340, bot - 72, 84, SAE_C, seg(t, 270, 280), 520, -0.05);
        } else {
          const u = t - cut;
          this.cineImpactText(ctx, 'CALA A BOCA!!', 430, top + 104, 96, RIN_C, seg(u, 0, 8), 760, -0.06);
          if (u >= 22) this.rincStamp(ctx, 'TOC.', 1080, top + 70, 52, '#e2e8f0', u, 22, 3);
          if (u >= 22) this.cineFlash(ctx, W, H, 0.25 * (1 - seg(u, 22, 30)), '#ccfbf1');
          this.cineSfx(S, cut + 22, 'ombro', () => window.SFX?.tackle?.());
        }
      } else if (phase === 2) {
        const cut = 170;
        const N0 = 34;
        if (t < cut) {
          const per = 26;
          const n = Math.max(0, Math.floor((t - 8) / per));
          const landed = Math.max(0, Math.floor((t - 8 - 22) / per) + 1);
          this.finSplashes(ctx, 0, W, H * 0.6, bot, t, 30);
          this.bdorRain(ctx, W, H, t);
          this.cineSfx(S, 8 + n * per + 10, 'chute' + n, () => window.SFX?.kick?.(0.7));
          this.finKicker(ctx, 40, top + 30, 'CAMPO DE TREINO • 01:07', seg(t, 8, 50), '#38bdf8');
          this.finKicker(ctx, 40, top + 58, 'SOZINHO, NA CHUVA', seg(t, 30, 80), RIN_C);
          this.ptdChip(ctx, `${N0 + landed} BOLAS NA REDE`, W - 250, top + 34, RIN_C, seg(t, 20, 34), { size: 16, left: true });
          if (t > cut - 8) this.cineFlash(ctx, W, H, seg(t, cut - 8, cut) * 0.8, '#000000');
        } else {
          const u = t - cut;
          const per = 24;
          const n = Math.max(0, Math.floor((u - 6) / per));
          const kickU = 6 + n * per + 9;
          const hitAt = kickU + 9;
          const shotsA = Math.floor((cut - 8 - 22) / 26) + 1;
          const landedB = Math.max(0, Math.floor((u - 6 - 9 - 9 - 10) / per) + 1);
          // a rede em primeiro plano (a câmera está atrás do gol)
          ctx.save();
          ctx.strokeStyle = 'rgba(241,245,249,0.22)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let x = -20; x < W + 20; x += 34) {
            ctx.moveTo(x, top);
            ctx.lineTo(x, bot);
          }
          for (let y = top; y < bot; y += 34) {
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
          }
          ctx.stroke();
          ctx.restore();
          if (u >= hitAt && u < hitAt + 16) {
            const hx = 430 + rnd(n, 7) * 420;
            const hy = top + 150 + rnd(n, 8) * 170;
            this.ptdRings(ctx, hx, hy, seg(u, hitAt, hitAt + 16), ['#ccfbf1', '#ffffff'], 160, 0);
            this.cineImpactText(ctx, 'DOM!', hx + 60, hy - 70, 54, '#ccfbf1', seg(u, hitAt, hitAt + 5), 0, -0.1);
          }
          this.bdorRain(ctx, W, H, t, 0.8);
          this.cineSfx(S, cut + hitAt, 'rede' + n, () => window.SFX?.post?.());
          this.ptdChip(ctx, `${N0 + shotsA + landedB} BOLAS NA REDE`, W - 250, top + 34, RIN_C, 1, { size: 16, left: true });
          const kE = ease(seg(u, 60, 74));
          if (kE > 0) {
            this.finPanel(ctx, [[110, top + 50], [760, top + 44], [750, top + 170], [110, top + 180]], () => {
              ctx.fillStyle = '#010608';
              ctx.fillRect(90, top + 30, 700, 170);
              const ey = top + 114;
              const U = this.wcdEyeBand(ctx, c.rinTr, 430, ey, 760, { dim: 0.25, dimTint: '0,20,24' });
              this.wcdEyes(ctx, 430, ey, U, { ring: '#2dd4bf', iris: '#0f766e', line: '#010405', angry: true, glow: 'rgba(45,212,191,0.6)', glowA: 0.8, shine: 0.8 });
            }, { dx: (1 - kE) * -800, border: '#99f6e4' });
          }
          this.cineFlash(ctx, W, H, 0.8 * (1 - seg(u, 0, 10)), '#000000');
        }
      } else if (phase === 3) {
        const cut = 120;
        if (t < cut) {
          [30, 62, 94].forEach((st, i) => {
            if (t < st || t > st + 26) return;
            const p = (t - st) / 26;
            const pp = scr(K, lerp(56.2, 53.9, seg(st, 0, 112)), 0.01, 15.0);
            if (pp) {
              ctx.strokeStyle = `rgba(224,242,254,${0.7 * (1 - p)})`;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.ellipse(pp.x, pp.y, 30 + p * 140, 6 + p * 20, 0, 0, TAU);
              ctx.stroke();
            }
            this.rincStamp(ctx, 'TAP.', [300, 520, 380][i], top + [90, 150, 210][i], 44, '#e2e8f0', t, st, 3, 0, 'center', 1 - seg(t, st + 16, st + 26));
            this.cineSfx(S, st, 'passo' + i, () => window.SFX?.blip?.(180));
          });
          this.finSplashes(ctx, 0, W, H * 0.7, bot, t, 30);
          this.bdorRain(ctx, W, H, t, 0.9);
          this.finKicker(ctx, 40, top + 30, 'PASSOS NA CHUVA', seg(t, 6, 40), SAE_C);
        } else {
          const u = t - cut;
          this.finSplashes(ctx, 0, W, H * 0.62, bot, t, 24);
          this.bdorRain(ctx, W, H, t, 0.85);
          const kS = ease(seg(u, 8, 22)) * (1 - ease(seg(u, 120, 132)));
          if (kS > 0) {
            this.finPanel(ctx, [[680, top + 16], [W - 18, top + 16], [W - 18, top + 160], [664, top + 172]], () => {
              ctx.fillStyle = '#0c0306';
              ctx.fillRect(640, top, 660, 190);
              const ey = top + 96;
              const U = this.wcdEyeBand(ctx, c.sae, 975, ey, 720, { dim: 0.18, dimTint: '24,4,10' });
              this.wcdEyes(ctx, 975, ey, U, { ring: '#2aa198', iris: '#134e4a', half: true, lid: this.finShade(c.sae.skinColor || '#fbe6d8', -0.2), look: -1 });
            }, { dx: (1 - kS) * 700, border: '#fecdd3' });
          }
          const kR = ease(seg(u, 134, 148));
          if (kR > 0) {
            this.finPanel(ctx, [[18, top + 16], [600, top + 16], [584, top + 172], [18, top + 160]], () => {
              ctx.fillStyle = '#010608';
              ctx.fillRect(0, top, 620, 190);
              const ey = top + 96;
              const U = this.wcdEyeBand(ctx, c.rinTr, 300, ey, 720, { dim: 0.2, dimTint: '0,20,24' });
              this.wcdEyes(ctx, 300, ey, U, { ring: '#2dd4bf', iris: '#042f2e', line: '#010405', angry: true, look: 1, glow: 'rgba(45,212,191,0.6)', glowA: 0.8 });
            }, { dx: (1 - kR) * -640, border: '#99f6e4' });
          }
          if (u > 20) this.finKicker(ctx, W - 300, bot - 40, 'SAE ITOSHI', seg(u, 20, 50), SAE_C);
          this.cineFlash(ctx, W, H, 0.9 * (1 - seg(u, 0, 10)), '#000000');
        }
      } else if (phase === 4) {
        const R = [6, 50, 92, 128, 160, 188, 214, 238, 260, 282];
        const END = 312;
        const passOf = (j) => R[j] + ((R[j + 1] ?? END) - R[j]) * 0.55;
        let score = 0;
        R.forEach((r, j) => {
          if (t >= passOf(j)) score = j + 1;
        });
        const lastPass = passOf(Math.max(0, score - 1));
        const pop = score > 0 ? 1 - seg(t, lastPass, lastPass + 10) : 0;
        const after = t >= END;
        if (!after) {
          let i = 0;
          for (let j = 0; j < R.length; j++) if (t >= R[j]) i = j;
          this.ptdSpeed(ctx, S, t, '#e0f2fe', 0.12, i % 2 ? -1 : 1, 50, 18, top + 40, bot - 40, 4 + i);
        }
        this.finSplashes(ctx, 0, W, H * 0.62, bot, t, 26);
        this.bdorRain(ctx, W, H, t, 1);
        if (!after || t < END + 14) this.bdorTally(ctx, W / 2, top + 46, score, pop);
        if (after) {
          this.cineImpactText(ctx, `${score} x 0`, W / 2, top + 150, 130, SAE_C, seg(t, END + 10, END + 20), W * 0.6, -0.04);
          if (t >= END + 10) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, END + 10, END + 20)), '#fecdd3');
        }
        R.forEach((r, j) => this.cineSfx(S, passOf(j), 'passe' + j, () => window.SFX?.whoosh?.()));
        this.cineSfx(S, END + 10, 'dez', () => window.SFX?.kick?.(1));
      } else if (phase === 5) {
        this.finSplashes(ctx, 0, W, H * 0.62, bot, t, 26);
        this.bdorRain(ctx, W, H, t, 1);
        this.rincStamp(ctx, 'PERDER DÓI?', 330, top + 64, 52, '#fecdd3', t, 16, 2, 0, 'center', 1 - seg(t, 140, 152));
        this.rincStamp(ctx, 'ÓTIMO.', 330, top + 128, 62, SAE_C, t, 84, 3, 0, 'center', 1 - seg(t, 140, 152));
        const kE = ease(seg(t, 156, 170)) * (1 - ease(seg(t, 284, 296)));
        if (kE > 0) {
          this.finPanel(ctx, [[22, top + 16], [600, top + 16], [584, top + 176], [22, top + 164]], () => {
            ctx.fillStyle = '#0c0306';
            ctx.fillRect(0, top, 620, 200);
            const ey = top + 96;
            const U = this.wcdEyeBand(ctx, c.sae, 300, ey, 720, { dim: 0.2, dimTint: '24,4,10' });
            this.wcdEyes(ctx, 300, ey, U, { ring: '#2aa198', iris: '#134e4a', half: true, lid: this.finShade(c.sae.skinColor || '#fbe6d8', -0.2), look: 0, shine: 0.6 });
          }, { dx: (1 - kE) * -640, border: '#fecdd3' });
        }
        this.cineImpactText(ctx, 'FOME.', 400, top + 120, 104, SAE_C, seg(t, 300, 310) * (1 - seg(t, 380, 396)), 420, -0.06);
      } else {
        const cA = 70;
        const cB = 150;
        const cC = 300;
        if (t < cA) {
          this.finSplashes(ctx, 200, 1080, H * 0.66, bot, t, 14, '165,243,252');
          this.bdorRain(ctx, W, H, t, 1);
          this.finKicker(ctx, 40, top + 30, 'SOZINHO DE NOVO', seg(t, 6, 40), RIN_C);
        } else if (t < cB) {
          const u = t - cA;
          ctx.save();
          ctx.lineWidth = 2;
          for (let i = 0; i < 7; i++) {
            const ph = (t * 0.02 + rnd(i, 61)) % 1;
            const x = 180 + rnd(i + Math.floor(t * 0.02 + rnd(i, 61)), 62) * 920;
            const y = top + 60 + rnd(i + Math.floor(t * 0.02 + rnd(i, 61)), 63) * (bot - top - 120);
            ctx.strokeStyle = `rgba(165,243,252,${0.5 * (1 - ph)})`;
            ctx.beginPath();
            ctx.ellipse(x, y, 10 + ph * 120, 4 + ph * 44, 0, 0, TAU);
            ctx.stroke();
          }
          ctx.restore();
          if (u >= 36) this.rincStamp(ctx, 'HAH.', 1040, bot - 100, 60, '#99f6e4', u, 40, 3);
          this.cineFlash(ctx, W, H, 1 - seg(u, 0, 8), '#000000');
        } else {
          const u = t - cB;
          const hit = 86;
          this.ptdRays(ctx, 640, 330, W * 1.15, '#14b8a6', 0.08 + 0.14 * seg(u, 20, 80), u * 0.004, 50, 0.028);
          const kb = ease(seg(u, 4, 18));
          this.finPanel(ctx, [[0, 250], [W, 244], [W, 410], [0, 416]], () => {
            ctx.fillStyle = '#010608';
            ctx.fillRect(0, 230, W, 200);
            const U = this.wcdEyeBand(ctx, c.rinGrin, 640, 330, 900, { dim: 0.12, dimTint: '0,20,24' });
            this.wcdEyes(ctx, 640, 330, U, { ring: '#5eead4', iris: '#0f766e', line: '#010405', angry: true, glow: 'rgba(45,212,191,0.9)', glowA: 0.6 + 0.4 * seg(u, 20, 60), shine: 1, reflect: '#ccfbf1' });
          }, { dx: (1 - kb) * W, border: '#99f6e4' });
          ctx.fillStyle = '#99f6e4';
          for (let i = 0; i < 26; i++) {
            const ph = (u * (0.8 + rnd(i, 71)) + rnd(i, 72) * 300) % 300;
            ctx.globalAlpha = (1 - ph / 300) * 0.8;
            ctx.fillRect(Math.round(200 + rnd(i, 73) * 880), Math.round(620 - ph * 2), 5, 5);
          }
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(0,8,10,0.82)';
          ctx.fillRect(0, top, W, 84);
          ctx.fillRect(0, bot - 120, W, 120);
          const fadeT = 1 - seg(t, cC, cC + 14);
          this.rincStamp(ctx, 'NA COPA DO MUNDO...', 640, top + 44, 46, '#ccfbf1', u, 14, 2, W * 0.8, 'center', fadeT);
          this.ptdWord(ctx, 'EU DESTRUO ELE.', 640, bot - 62, 104, RIN_C, seg(u, hit, hit + 10), fadeT, -0.04, W * 0.8);
          if (u >= hit) this.cineFlash(ctx, W, H, 0.38 * (1 - seg(u, hit, hit + 12)), '#ccfbf1');
          this.cineSfx(S, cB + hit, 'destruo', () => window.SFX?.kick?.(1));
          if (t >= cC) {
            const tk = seg(t, cC, cC + 30);
            ctx.fillStyle = `rgba(0,4,6,${0.78 * tk})`;
            ctx.fillRect(0, 0, W, H);
            this.cineTitleCard(ctx, W, 360, tk, { kicker: 'RIN ITOSHI • O DESTRUIDOR ACORDOU', title: 'A LIÇÃO DO SAE', sub: 'Próxima parada: a Copa do Mundo.', color: RIN_C });
            this.cineSfx(S, cC + 4, 'titulo', () => window.SFX?.kick?.(0.8));
          }
        }
      }
    }
  });
})();
