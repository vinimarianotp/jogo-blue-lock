// ============================================================================
// CUTSCENES EM 3D — cenas da partida (js/cine_partida.js) e o gol da sorte
// (js/cine_luck.js) refeitas no campo do prédio. Kit: js/cine3d_kit.js.
// Mesmos planos, tempos e legendas da versão 2D:
//   scripted_shot             • gol garantido do roteiro (CE.shotCfg / demo)
//   chem_reaction             • reação química com o parceiro (CE.chemCfg / demo)
//   first_selection_awakening • seu 1º gol no cap. 2 (Time Z x Time V)
//   nel_metavision_goal       • seu 1º gol na NEL (Metavision)
//   u20_direct_shoot / u20_final_goal • o gol da sorte (13 planos, o mesmo filme)
// Campo: x45–60 y6–22, gols no norte (y 6,6) e no sul (y 22,4), centrados em x 53.
// Aqui os pontos são [x, y, z] (z = altura); u = de lado, d = distância da linha do gol.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;

  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIn = (x) => clamp(x) * clamp(x);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mixP = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const mod = (a, n) => ((a % n) + n) % n;
  const rgbOf = (hex) => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    return m ? [1, 2, 3].map((i) => parseInt(m[i], 16)) : [0, 245, 212];
  };
  const rgba = (hex, a) => `rgba(${rgbOf(hex).join(',')},${a})`;
  // luz de um boneco puxada para uma cor (k = quanto da cor)
  const tint = (hex, k = 0.35, base = 1.1) => rgbOf(hex).map((v) => +(base * (1 - k) + (v / 255) * k * 1.6).toFixed(3));

  const YOU = '#00f5d4';

  // Os bonecos em pé (billboards) viram para Hub.camA (a câmera do mapa), não para a
  // câmera da cena: com a câmera de lado eles ficavam de perfil, finos como uma linha.
  // Durante o quadro da cena o Hub.camA aponta para onde a câmera da cena olha e volta
  // ao valor de antes logo depois (no overlay, que roda logo após o desenho 3D).
  const Hub = window.Hub;
  // No mesmo quadro somem as bolas e os cones soltos do mapa (bola de treino no meio do
  // campo, cones): numa partida de verdade eles confundiam com a bola do lance.
  const W3 = Hub && Hub._3d && Hub._3d.World;
  let camA0 = null;
  let spr0 = null;
  let key0 = '';
  const restoreCam = () => {
    if (camA0 !== null && Hub) Hub.camA = camA0;
    // (se o desenho trocou o tema, o prédio já montou uma lista nova: fica a nova)
    if (spr0 && W3 && W3.key === key0) W3.sprites = spr0;
    camA0 = null;
    spr0 = null;
  };
  const faceCam = (K) => {
    const c = K.c;
    if (!Hub || !c || !c.eye || !c.look) return;
    const dx = c.look[0] - c.eye[0];
    const dy = c.look[2] - c.eye[2];
    if (Math.abs(dx) + Math.abs(dy) < 1e-4) return;
    if (camA0 === null) {
      camA0 = Hub.camA;
      setTimeout(restoreCam, 0); // (garantia: volta mesmo se o overlay não rodar)
    }
    Hub.camA = Math.atan2(dy, dx);
    if (!spr0 && W3 && Array.isArray(W3.sprites)) {
      spr0 = W3.sprites;
      key0 = W3.key;
      W3.sprites = spr0.filter((s) => s.key !== 'ball' && s.key !== 'cone');
    }
  };
  const reg = (type, def) => {
    const sc = def.scene;
    const ov = def.overlay;
    def.scene = function (K, S) {
      sc.call(this, K, S);
      faceCam(K);
    };
    def.overlay = function (ctx, S, K) {
      restoreCam();
      if (ov) ov.call(this, ctx, S, K);
    };
    CE.registerCine3D(type, def);
  };

  // ---------------------------------------------------------------- campo
  const GX = 53;
  // quem ataca o gol norte (casa) ou o sul (rival): u e d viram x, y do campo
  const atk = (away) => ({ gy: away ? 22.4 : 6.6, sy: away ? -1 : 1, sx: away ? -1 : 1, away: !!away });
  const pt = (A, u, d, z = 0) => [GX + u * A.sx, A.gy + d * A.sy, z];
  // câmera com pontos [x, y, z]
  const cam = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  // (o kit guarda os bonecos pelo nome: boneco sem nome ganha um, senão dois sem nome viram o mesmo)
  const act = (K, who, p, o = {}) => {
    if (who && typeof who === 'object' && !who.name) who = Object.assign({}, who, { name: '_' + (o.id || '') });
    return K.actor(who, Object.assign({ x: p[0], y: p[1], z: p[2] || 0 }, o));
  };
  const ball = (K, p, o) => K.ball(p[0], p[1], p[2] || 0, o);
  // altura dos olhos de um boneco em pé (k = escala do boneco)
  const EYE = 0.556;
  const eyeP = (p, k = 0.9) => [p[0], p[1], (p[2] || 0) + (EYE * k) / 0.9];
  // tremida de câmera na mão
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp, p[2] + K.noise(f, seed + 7) * amp * 0.7];
  // A cena guarda pontos do MUNDO (wp) e o overlay projeta na tela (resolve): a matriz da
  // câmera (K.VP) só fica pronta depois do desenho 3D, então projetar dentro da cena usaria
  // a câmera do quadro anterior
  const wp = (p) => (p ? { __w: p } : null);
  const resolve = (K, v) => {
    if (!v || typeof v !== 'object') return v;
    if (v.__w) return K.screen(v.__w[0], v.__w[2] || 0, v.__w[1]);
    // (pontos atrás da câmera somem da trilha)
    if (Array.isArray(v)) return v.map((x) => resolve(K, x)).filter((x, i) => x !== null || !(v[i] && v[i].__w));
    const o = {};
    for (const k in v) o[k] = resolve(K, v[k]);
    return o;
  };
  // trilha da bola (pontos do mundo; o overlay projeta e usa no rastro)
  const trail = (K, fn, q, n = 7, step = 0.035) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(wp(fn(Math.max(0, q - i * step))));
    }
    return out;
  };

  // anel no gramado (ponto futuro, marca embaixo de você): canvas pronto uma vez por cor
  const RINGS = {};
  const ringCv = (color) => {
    if (RINGS[color]) return RINGS[color];
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 64;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 32);
        if (d > 26 && d < 31) {
          g.fillStyle = color;
          g.fillRect(x, y, 1, 1);
        } else if (d <= 26 && d > 23) {
          g.fillStyle = rgba(color, 0.35);
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    RINGS[color] = cv;
    return cv;
  };
  const ring = (K, p, r, color, alpha = 1) => {
    if (alpha <= 0.01) return;
    K.floor({ x0: p[0] - r, y0: p[1] - r, x1: p[0] + r, y1: p[1] + r, z: 0.012, img: ringCv(color), em: true, alpha });
  };

  // =========================================================================
  // 1) GOL GARANTIDO DO ROTEIRO (scripted_shot)
  // =========================================================================
  // Plano 1: o atacante arranca com a bola, o marcador vem no carrinho e ele pula por cima
  const shotRun = (t) => {
    const slideAt = 58;
    const sd = lerp(9.6, 5.8, ease(t / 96));
    const hop = t > slideAt && t < slideAt + 22 ? Math.sin(((t - slideAt) / 22) * Math.PI) * 0.22 : 0;
    const dd = t < slideAt ? lerp(2.2, lerp(9.6, 5.8, ease(slideAt / 96)) - 0.9, ease(t / slideAt)) : lerp(sd - 0.9, sd + 1.8, ease((t - slideAt) / 30));
    return { slideAt, sd, hop, dd };
  };

  reg('scripted_shot', {
    phases: [100, 110, 100, 150],
    music: 'tension',
    letterbox: 0.1,
    grain: 0,
    get title() {
      const c = CE.ptdShotCfg();
      return `⚽ GOL GARANTIDO • ${String(c.shooterName || '').toUpperCase()}`;
    },
    get tags() {
      const c = CE.ptdShotCfg();
      return ['PLANO 1 • A ARRANCADA', `PLANO 2 • ${String(c.weaponName || 'A ARMA').toUpperCase()}`, 'PLANO 3 • IMPACTO!', `PLANO 4 • GOL! ${c.homeAfter} x ${c.awayAfter}`];
    },
    get subs() {
      const c = CE.ptdShotCfg();
      const away = c.team === 'away';
      const col = away ? '#ef4444' : YOU;
      const who = String(c.shooterName || '').toUpperCase();
      const sc = CE.CINE_READ_SCALE.scripted_shot ?? 1;
      const shout = `"${String(c.skillName || '').replace(/\s*\(.*\)\s*$/, '')}!!"`;
      const fits = (30 + `${who} ${shout}`.length * 3.4) * sc <= 106;
      return [
        [{ from: 4, who: 'NARRADOR', text: 'Livre! Parte pra cima!', color: '#94a3b8' }],
        fits ? [{ from: 4, who, text: shout, color: col }] : [],
        [{ from: 8, who: 'NARRADOR', text: 'O tempo congela...', color: '#94a3b8' }],
        [{ from: 24, who: 'NARRADOR', text: away ? 'A rede estufa... o rival marca!' : 'A rede estufa! Seu time marca!', color: away ? '#fca5a5' : '#94a3b8' }]
      ];
    },
    scene(K, S) {
      const { t, phase, f } = S;
      const o = CE.ptdShotCtx();
      const { c, color } = o;
      const A = atk(o.away);
      const st = (K.st = {});
      K.expo(1.0);
      if (phase === 0) {
        const r = shotRun(t);
        const sp = pt(A, -0.5, r.sd, r.hop);
        const dp = pt(A, -0.45, r.dd);
        act(K, c.defender, dp, { id: 'def', face: t < r.slideAt ? pt(A, -0.45, 20) : pt(A, -0.45, 30), anim: t < r.slideAt ? 'run' : 'slide' });
        act(K, c.shooter, sp, { id: 'sh', face: pt(A, -0.5, 0), anim: 'run', light: t > 40 ? tint(color, 0.25, 1.15) : undefined, opts: t > 40 ? { showAura: true, auraColor: color } : undefined });
        ball(K, pt(A, -0.5, r.sd - 0.32, 0.05 + r.hop * 0.8));
        // goleiro lá no fundo e mais dois do rival voltando
        act(K, c.keeper, pt(A, 0, 0.45), { id: 'gk', face: pt(A, 0, 10), frame: 0 });
        // travelling de lado acompanhando (a câmera do lado de fora do campo de ataque)
        const e = pt(A, 1.85, r.sd + 0.35 - t * 0.003, 0.5);
        cam(K, shake(K, e, f * 0.6, 0.015), pt(A, -0.5, r.sd - 0.75, 0.4), 42);
        st.slide = wp(dp);
        st.sp = r;
      } else if (phase === 1) {
        // close: o rosto, a habilidade
        const p = pt(A, -0.4, 5.6);
        act(K, c.shooter, p, { id: 'sh', face: pt(A, -0.4, 0), anim: 'idle', light: tint(color, 0.3, 1.2) });
        const push = ease(t / 110);
        const dist = lerp(2.3, 2.05, push);
        const e = pt(A, -0.4 - 0.12, 5.6 - dist, 0.6);
        // deixa o rosto no terço da tela (o nome do golpe fica do outro lado)
        const lk = pt(A, -0.4 - 0.42, 5.6, 0.58);
        cam(K, shake(K, e, f * 0.4, t > 24 && t < 40 ? 0.012 : 0.004), lk, 32);
        st.eye = wp(eyeP(p));
        st.eyeL = wp([p[0] + 0.1, p[1], eyeP(p)[2]]);
        st.eyeR = wp([p[0] - 0.1, p[1], eyeP(p)[2]]);
      } else if (phase === 2) {
        const hit = 14;
        const sp = pt(A, -0.3, 5.4);
        if (t < 54) {
          // a perna armando (de baixo) → o impacto
          act(K, c.shooter, sp, { id: 'sh', face: pt(A, -0.3, 0), anim: t < hit ? 'windup' : 'shoot', light: tint(color, 0.2, 1.2) });
          const q = t < hit + 6 ? 0 : easeIn(seg(t, hit + 6, 54));
          const b0 = pt(A, -0.3, 5.08, 0.06);
          const bp = mixP(b0, pt(A, 0.3, 2.0, 0.55), q);
          ball(K, bp);
          act(K, c.defender, pt(A, 0.6, 3.6), { id: 'def', face: sp, frame: 0, anim: 'run' });
          const e = t < hit ? pt(A, 0.95, 4.55, 0.16) : pt(A, 1.05, 4.6, 0.22);
          cam(K, shake(K, e, f, t >= hit ? 0.03 * (1 - seg(t, hit, hit + 24)) : 0.004, 2), pt(A, -0.25, 5.25, 0.36), 40);
          st.ball = wp(bp);
          st.hit = hit;
        } else {
          // câmera colada na bola: o marcador passa por baixo, o goleiro voa e não alcança
          const u = t - 54;
          const bp = ballFly(A, u / 46, 0.75);
          ball(K, bp);
          const dk = seg(u, 0, 26);
          act(K, c.defender, pt(A, lerp(1.6, -1.6, dk), 3.3), { id: 'def', face: pt(A, -9, 3.3), anim: 'slide' });
          const gk = seg(u, 14, 44);
          act(K, c.keeper, pt(A, lerp(0.1, -0.85, ease(gk)), 0.45, Math.sin(gk * Math.PI) * 0.3), { id: 'gk', face: pt(A, -5, 0.45), anim: gk > 0.05 ? 'dive' : 'idle' });
          act(K, c.shooter, sp, { id: 'sh', face: pt(A, 0, 0), anim: 'shoot' });
          const back = mixP(bp, pt(A, -0.3, 6.2, 0.3), 0.18);
          cam(K, shake(K, [back[0] - 0.15 * A.sx, back[1] + 0.55 * A.sy, back[2] + 0.12], f, 0.015, 4), pt(A, 0.55, -0.4, 0.62), 46);
          st.trail = trail(K, (q) => ballFly(A, q, 0.75), u / 46, 7, 0.04);
          st.ball = wp(bp);
        }
      } else {
        goalHitScene(K, S, A, { keeper: c.keeper, scorer: c.shooter, color, hit: 20, side: 1, mates: [c.defender] });
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, top, bot, phase } = S;
      const o = CE.ptdShotCtx();
      const { c, color } = o;
      const st = resolve(K, K.st || {});
      const dir = o.away ? -1 : 1;
      if (phase === 0) {
        CE.ptdSpeed(ctx, S, t, '#e0f2fe', 0.14, dir, 30, 14, top, H * 0.55);
        const r = st.sp;
        if (r && t > r.slideAt && t < r.slideAt + 26 && st.slide) {
          ctx.fillStyle = 'rgba(226,232,240,0.6)';
          for (let i = 0; i < 9; i++) ctx.fillRect(st.slide.x + (rnd(i, 4) - 0.5) * 90, st.slide.y - rnd(i, 5) * 26 - (t - r.slideAt) * 0.6, 6, 6);
        }
        CE.ptdSfx(S, 58, 'slide', () => window.SFX?.tackle());
        CE.ptdScore(ctx, 32, top + 16, Object.assign(CE.ptdShotScore(o, c.homeBefore, c.awayBefore), { k: seg(t, 4, 16) }));
        CE.ptdWord(ctx, `${o.who} ARRANCA!`, W * 0.66, top + 132, 62, color, seg(t, 16, 26), 1, -0.05 * dir, W * 0.56);
      } else if (phase === 1) {
        const lit = seg(t, 20, 30);
        if (st.eye) CE.ptdEyeFlare(ctx, st.eye.x, st.eye.y, lit * (1 - seg(t, 60, 90) * 0.6), color, W);
        const tx = W * 0.7;
        CE.ptdChip(ctx, `ARMA • ${String(c.weaponName || '').toUpperCase()}`, tx, H * 0.3, color, seg(t, 8, 20), { size: 15 });
        CE.ptdWord(ctx, String(c.skillName || '').toUpperCase(), tx, H * 0.45, 76, color, seg(t, 24, 34), 1, -0.06 * dir, W * 0.48);
        ctx.save();
        ctx.globalAlpha = seg(t, 40, 54);
        ctx.font = 'italic 800 18px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText('A HABILIDADE ASSINATURA', tx, H * 0.45 + 62);
        ctx.restore();
        CE.ptdChip(ctx, o.who, W * 0.14, bot - 40, o.teamColor, seg(t, 4, 14), { size: 18 });
        CE.ptdSfx(S, 24, 'skill', () => window.SFX?.whoosh());
      } else if (phase === 2) {
        if (t < 54) {
          const hit = 14;
          if (t < hit) CE.ptdSpeed(ctx, S, t, color, 0.22, dir, 30);
          else {
            const b = st.ball || { x: W * 0.6, y: H * 0.66 };
            CE.drawRadialSpeedLines(ctx, b.x, b.y, W, '#020617', 0.5 * (1 - seg(t, hit, hit + 30)));
            CE.ptdRings(ctx, b.x, b.y, seg(t, hit, hit + 34), ['#0a1430', color, '#0a1430'], 340);
            CE.ptdWord(ctx, 'DOM!!', W * 0.8, top + 120, 124, color, seg(t, hit, hit + 7), 1, -0.15 * dir);
            CE.cineFlash(ctx, W, H, 0.9 * (1 - seg(t, hit, hit + 8)));
          }
          CE.ptdSfx(S, hit, 'kick', () => window.SFX?.kick(1));
        } else {
          if (st.trail) CE.ptdStreak(ctx, st.trail, color, 46, 0.85);
          if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 90, rgba(color, 0.7));
          CE.ptdSpeed(ctx, S, t, '#e0f2fe', 0.12, dir, 50, 18);
          CE.ptdSfx(S, 56, 'fly', () => window.SFX?.whoosh());
        }
      } else {
        goalHitOverlay(ctx, S, K, { color, teamColor: o.teamColor, word: o.away ? 'GOL DO RIVAL!' : 'GOOOOOL!!', hit: 20, sfx: o.away ? () => window.SFX?.concede() : () => window.SFX?.goal(true) });
        const flipAt = 50;
        const flipped = t >= flipAt;
        CE.ptdScore(ctx, 32, top + 16, CE.ptdShotScore(o, flipped ? c.homeAfter : c.homeBefore, flipped ? c.awayAfter : c.awayBefore, o.away ? 'away' : 'home', seg(t, flipAt, flipAt + 16)));
        CE.ptdSfx(S, flipAt, 'score', () => window.SFX?.blip(880));
      }
    }
  });

  // A bola do chute rumo ao ângulo (q 0..1): sai do pé e entra no canto alto
  function ballFly(A, q, side = 0.75) {
    const k = clamp(q);
    return pt(A, lerp(-0.3, side, k), lerp(5.0, 0.35, k), lerp(0.18, 0.8, Math.sin(k * Math.PI * 0.5)));
  }

  // Gol de frente: a bola entra no ângulo, o goleiro pula atrasado, a rede estufa e quem
  // fez comemora na frente da câmera. o = { keeper, scorer, color, hit, side (1 = canto
  // direito da tela, -1 = esquerdo), mates }
  function goalHitScene(K, S, A, o) {
    const { t, f } = S;
    const hit = o.hit ?? 20;
    const isHit = t >= hit;
    const side = o.side ?? 1;
    // canto: u na direção que fica à direita/esquerda da câmera (a câmera olha o gol)
    const cu = 0.78 * side;
    const corner = pt(A, cu, -0.12, 0.84);
    const from = pt(A, -0.35 * side, 3.6, 0.22);
    const k = seg(t, 0, hit);
    let bp;
    if (!isHit) bp = [lerp(from[0], corner[0], easeIn(k)), lerp(from[1], corner[1], easeIn(k)), lerp(from[2], corner[2], ease(k))];
    else {
      const u = t - hit;
      bp = pt(A, cu * 0.96, -0.12 - Math.min(0.32, u * 0.03), Math.max(0.1, 0.84 - easeIn(seg(u, 6, 40)) * 0.74));
    }
    if (!isHit || t < hit + 90) ball(K, bp);
    // goleiro: pula atrasado e baixo para o lado da bola
    const kk = seg(t, 8, hit + 14);
    const gp = pt(A, lerp(0, cu * 0.55, ease(kk)), 0.4, Math.sin(clamp(kk) * Math.PI) * 0.26 * (isHit ? 1 - seg(t, hit + 14, hit + 34) : 1));
    act(K, o.keeper, gp, { id: 'gk', face: pt(A, cu * 4, 0.4), anim: kk > 0.15 ? 'dive' : 'idle', frame: kk > 0.15 ? undefined : 0 });
    (o.mates || []).forEach((m, i) => act(K, m, pt(A, (-0.75 + i * 1.6) * side, 1.15 + i * 0.4), { id: 'm' + i, face: corner, frame: 0, anim: 'idle' }));
    // quem fez: entra correndo pela frente e comemora
    const rise = ease(seg(t, hit + 26, hit + 60));
    if (o.scorer && t > hit + 20) {
      const sp = pt(A, lerp(-2.3 * side, -1.4 * side, rise), lerp(1.2, 1.9, rise));
      act(K, o.scorer, sp, { id: 'sc', face: pt(A, -0.6 * side, 6), anim: rise < 1 ? 'run' : 'celebrate', light: tint(o.color, 0.25, 1.2), opts: { showAura: true, auraColor: o.color } });
    }
    // câmera na frente do gol, baixa, tremendo no impacto
    const sh = isHit ? 0.035 * (1 - seg(t, hit, hit + 34)) : 0.004;
    const pull = ease(seg(t, hit + 30, hit + 80));
    const e = pt(A, -0.55 * side - pull * 0.5 * side, lerp(4.1, 4.6, pull), lerp(0.48, 0.55, pull));
    cam(K, shake(K, e, f, sh, 5), pt(A, 0.12 * side - pull * 0.4 * side, lerp(0.1, 1.6, pull), lerp(0.55, 0.5, pull)), 40);
    K.st.ball = wp(bp);
    K.st.isHit = isHit;
    if (!isHit) K.st.trail = trail(K, (q) => [lerp(from[0], corner[0], easeIn(q)), lerp(from[1], corner[1], easeIn(q)), lerp(from[2], corner[2], ease(q))], k, 6, 0.08);
  }
  function goalHitOverlay(ctx, S, K, o) {
    const { W, H, t, top } = S;
    const st = resolve(K, K.st || {});
    const hit = o.hit ?? 20;
    if (t < hit && st.trail) CE.ptdStreak(ctx, st.trail, o.color, 40, 0.8);
    if (t < hit && st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 80, rgba(o.color, 0.7));
    if (t >= hit) {
      // a rede estufando (ondas em volta do ponto do impacto)
      if (st.ball) CE.ptdRings(ctx, st.ball.x, st.ball.y, seg(t, hit, hit + 30), ['#f8fafc', o.color, '#f8fafc'], 220, 0);
      CE.cineFlash(ctx, W, H, 0.8 * (1 - seg(t, hit, hit + 7)));
      CE.ptdWord(ctx, o.word || 'GOOOOOL!!', W * 0.56, top + 118, 104, o.teamColor || YOU, seg(t, hit, hit + 10), 1, -0.04, W * 0.74);
    }
    CE.ptdSfx(S, hit, 'net', o.sfx || (() => window.SFX?.goal(true)));
  }

  // =========================================================================
  // 2) REAÇÃO QUÍMICA (chem_reaction)
  // =========================================================================
  // altura da bola no pé de quem finaliza (de primeira, de voleio, de bicicleta)
  const FIN_Z = { shoot: 0.06, volley: 0.36, bicycle: 0.62 };
  const FIN_AIR = { shoot: 0, volley: 0.2, bicycle: 0.42 };
  // A jogada do parceiro no plano 2 (u, d, z em coordenadas de ataque)
  function chemPlay(o, t) {
    const st = o.st;
    const r = { kick: 46, p: [-2.2, 7.0, 0], anim: 'idle', defs: [], held: null, shout: [] };
    if (st.kind === 'dribble') {
      r.kick = 80;
      r.p = [-2.4, lerp(9.4, 6.6, ease(t / 76)), 0];
      r.anim = t < r.kick ? (Math.floor(t / 12) % 2 ? 'rabona' : 'run') : 'shoot';
      [[-2.35, 8.2], [-2.15, 7.25]].forEach(([u, d], i) => {
        const beaten = r.p[1] < d - 0.25;
        r.defs.push({ who: i ? 'a' : 'b', p: [u + (beaten ? 0.5 : 0), d, beaten ? 0.08 : 0], anim: beaten ? 'dive' : 'idle', face: beaten ? [u + 3, d] : [r.p[0], r.p[1]] });
        if (beaten) r.shout.push({ text: 'ELÁSTICO!', at: 26 + i * 26, len: 30, size: 34, p: [u, d, 1.1] });
      });
      if (t < r.kick) r.held = [r.p[0] + Math.sin(t * 0.4) * 0.12, r.p[1] - 0.3, 0.05];
    } else if (st.kind === 'trap') {
      r.kick = 70;
      const fall = Math.min(1, t / 34);
      if (t < 34) r.held = [-2.1, 6.75, lerp(3.4, 0.06, fall * fall)];
      else if (t < r.kick) {
        r.held = [-2.1, 6.75, 0.06];
        r.shout.push({ text: 'TOC.', at: 34, len: 36, size: 54, p: [-2.1, 6.75, 1.0] });
        r.rings = [-2.1, 6.75, 0.06];
      }
      r.anim = t < r.kick ? 'idle' : 'shoot';
    } else if (st.kind === 'sprint') {
      r.kick = 58;
      r.p = [-2.2, lerp(12.6, 6.9, ease(t / 55)), 0];
      r.anim = t < r.kick ? 'run' : 'shoot';
      r.dust = true;
      if (t < r.kick) r.held = [r.p[0], r.p[1] - 0.3, 0.05];
    } else if (st.kind === 'power') {
      r.kick = 60;
      r.p = [-2.2, lerp(9.2, 7.25, ease(t / 40)), 0];
      r.anim = t < 40 ? 'run' : t < r.kick ? 'idle' : 'shoot';
      const hitT = t > 38;
      const q = Math.min(1, Math.max(0, (t - 38) / 20));
      r.defs.push({ who: 'a', p: [-2.2 + (hitT ? ease(q) * 0.3 : 0), 6.7 - (hitT ? ease(q) * 0.9 : 0), hitT ? Math.sin(q * Math.PI) * 0.36 : 0], anim: hitT ? 'dive' : 'idle', face: [r.p[0], r.p[1]] });
      if (hitT) r.shout.push({ text: 'BAM!!', at: 38, len: 32, size: 58, p: [-2.2, 6.6, 1.1] });
      if (t < r.kick) r.held = [r.p[0], r.p[1] - 0.3, 0.05];
    } else if (st.kind === 'curve') {
      [[-0.85, 5.75], [0.05, 5.35]].forEach(([u, d], i) => r.defs.push({ who: 'a', id: 'c' + i, p: [u, d, 0], anim: 'idle', face: [-2.2, 7] }));
      r.anim = t < r.kick ? 'idle' : 'shoot';
      if (t < r.kick) r.held = [-2.0, 6.72, 0.05];
    } else if (st.kind === 'acrobat') {
      r.kick = 52;
      const jump = Math.sin(Math.min(1, t / 104) * Math.PI);
      r.p = [-2.2, 7.0, jump * 0.5];
      r.anim = t < 18 ? 'run' : t < 92 ? 'bicycle' : 'idle';
      if (t < r.kick) r.held = [-2.15, 6.85, r.p[2] + 0.5];
    } else {
      // passe enfiado: a barreira de marcadores e a fresta
      [[-1.35, 5.6], [0.2, 5.45], [0.95, 5.2]].forEach(([u, d], i) => r.defs.push({ who: 'a', id: 't' + i, p: [u, d, 0], anim: 'idle', face: [-2.2, 7] }));
      r.anim = t < r.kick ? 'idle' : 'shoot';
      if (t < r.kick) r.held = [-2.0, 6.72, 0.05];
      r.lane = t < r.kick + 6;
    }
    r.from = [r.p[0] + 0.15, r.p[1] - 0.3, r.p[2] + (st.kind === 'acrobat' ? 0.45 : 0.06)];
    return r;
  }
  // a bola do passe: arco normal, curva por fora dos marcadores ou reta e forte
  function chemPath(o, r, aim, q) {
    const kind = o.st.kind;
    const p = mixP(r.from, aim, q);
    if (kind === 'curve') {
      p[2] += Math.sin(q * Math.PI) * 0.9 * (1 - q * 0.3);
      p[1] -= Math.sin(q * Math.PI) * 1.1;
    } else if (kind !== 'power' && kind !== 'through') p[2] += Math.sin(q * Math.PI) * 0.6;
    return p;
  }

  reg('chem_reaction', {
    phases: [110, 140, 90, 100],
    letterbox: 0.1,
    grain: 0,
    get title() {
      const c = CE.ptdChemCfg();
      return `⚗️ REAÇÃO QUÍMICA • ${String(c.partnerName || '').toUpperCase()} × ${String(c.youName || 'VOCÊ').toUpperCase()}`;
    },
    get tags() {
      const o = CE.ptdChemCtx();
      return ['PLANO 1 • SINTONIA', `PLANO 2 • ${o.chemName.toUpperCase()}`, 'PLANO 3 • IMPACTO', 'PLANO 4 • RUMO AO GOL'];
    },
    get subs() {
      const o = CE.ptdChemCtx();
      const c = o.c;
      const sc = CE.CINE_READ_SCALE.chem_reaction ?? 1;
      const fits = (who, text, room) => (30 + `${who} ${text}`.length * 3.4) * sc <= room;
      const pWho = String(c.partnerName || '').toUpperCase();
      const quote = o.partner.quote ? `"${o.partner.quote}"` : '';
      const bonus = o.partner.chemBonus || '';
      return [
        [quote && fits(pWho, quote, 106) ? { from: 4, who: pWho, text: quote, color: o.pc } : { from: 2, who: 'NARRADOR', text: 'Os dois veem o mesmo lance!', color: '#94a3b8' }],
        [{ from: 6, who: 'NARRADOR', text: bonus && fits('NARRADOR', bonus, 134) ? bonus : 'O passe sai no espaço perfeito.', color: '#94a3b8' }],
        [{ from: 8, who: 'NARRADOR', text: 'Um só chute!', color: '#94a3b8' }],
        [{ from: 2, who: 'NARRADOR', text: 'O goleiro vai alcançar?', color: '#94a3b8' }]
      ];
    },
    scene(K, S) {
      const { t, phase, f } = S;
      const o = CE.ptdChemCtx();
      const A = atk(false);
      const st = (K.st = {});
      const fin = o.st.finish || 'shoot';
      const Y = [1.0, 4.0];
      K.expo(1.0);
      if (phase === 0) {
        // os dois lado a lado, vendo o mesmo lance; a câmera entre eles e o gol
        const k = easeIO(t / 110);
        const pp = pt(A, 1.2, 6.8);
        const yp = pt(A, -1.2, 6.55);
        act(K, o.partner, pp, { id: 'p', face: pt(A, 1.2, 0), light: tint(o.pc, 0.3, 1.15), frame: undefined });
        act(K, o.you, yp, { id: 'y', face: pt(A, -1.2, 0), light: tint(o.yc, 0.3, 1.15) });
        act(K, o.def, pt(A, -0.2, 3.6), { id: 'd', face: pt(A, 0, 9), frame: 0 });
        cam(K, shake(K, pt(A, 0, lerp(4.05, 4.45, k), 0.6), f * 0.5, 0.008), pt(A, 0, 6.7, 0.5), 42);
        st.e1 = wp(eyeP(pp));
        st.e2 = wp(eyeP(yp));
        st.p1 = wp([pp[0], pp[1], 1.0]);
        st.p2 = wp([yp[0], yp[1], 1.0]);
      } else if (phase === 1) {
        const r = chemPlay(o, t);
        const P = (q) => pt(A, q[0], q[1], q[2] || 0);
        const aim = [Y[0], Y[1], FIN_Z[fin]];
        act(K, o.partner, P(r.p), { id: 'p', face: r.anim === 'shoot' ? P(aim) : pt(A, r.p[0], 0), anim: r.anim, light: tint(o.pc, 0.25, 1.15), opts: { showAura: true, auraColor: o.pc } });
        const def2 = o.def2 || (o.def2 = Object.assign({}, o.def, { name: 'Marcador', hairStyle: 'short_sharp', hairColor: '#3f2a1d', hairSecondary: '#3f2a1d', skinColor: '#e5b899', eyeStyle: undefined, mouth: undefined }));
        r.defs.forEach((d, i) => act(K, d.who === 'b' ? def2 : o.def, P(d.p), { id: 'd' + i + (d.id || ''), face: P(d.face), anim: d.anim, frame: d.anim === 'idle' ? 0 : undefined }));
        // você entrando para finalizar
        const yk = ease(t / 110);
        const yz = t > 100 ? Math.sin(Math.min(1, (t - 100) / 40) * Math.PI) * FIN_AIR[fin] : 0;
        const yp = pt(A, lerp(3.6, Y[0], yk), lerp(6.8, Y[1], yk), yz);
        act(K, o.you, yp, { id: 'y', face: t > 100 ? pt(A, 0, 0) : P(r.from), anim: t > 100 ? (fin === 'bicycle' ? 'bicycle' : 'shoot') : 'run', light: tint(o.yc, 0.2, 1.15), opts: { showAura: true, auraColor: o.yc } });
        act(K, CE.ptdChemKeeper(), pt(A, 0, 0.45), { id: 'gk', face: pt(A, 0, 9), frame: 0 });
        let bp = null;
        if (t >= r.kick) {
          const u = Math.min(1, (t - r.kick) / 56);
          bp = chemPath(o, r, aim, u);
          st.trail = trail(K, (q) => P(chemPath(o, r, aim, q)), u, 7, 0.035);
        } else if (r.held) bp = r.held;
        if (bp) ball(K, P(bp));
        st.ball = bp ? wp(P(bp)) : null;
        st.kicked = t >= r.kick;
        st.r = r;
        st.shouts = r.shout.map((s) => Object.assign({}, s, { s: wp(P(s.p)) }));
        if (r.rings) st.rings = wp(P(r.rings));
        if (r.lane) {
          st.lane0 = wp(P(r.from));
          st.lane1 = wp(P(aim));
          st.gap = wp(P([-0.6, 5.5, 1.0]));
        }
        if (r.dust) st.dust = wp(P(r.p));
        // câmera atrás do lance, alta, acompanhando
        const k = easeIO(t / 140);
        cam(K, shake(K, pt(A, lerp(0.9, 1.3, k), lerp(12.0, 11.2, k), lerp(1.65, 1.5, k)), f * 0.5, o.st.kind === 'sprint' ? 0.02 : 0.008), pt(A, lerp(-0.6, 0.2, k), lerp(6.2, 5.2, k), 0.15), 46);
      } else if (phase === 2) {
        const hit = 16;
        const air = FIN_AIR[fin];
        const yp = pt(A, Y[0], Y[1], fin === 'bicycle' ? 0.42 : fin === 'volley' ? 0.18 : 0);
        const anim = t < hit ? 'windup' : fin === 'bicycle' ? 'bicycle' : 'shoot';
        // o parceiro "por trás" na cor dele, fazendo a mesma jogada
        act(K, o.partner, pt(A, Y[0] + 0.32, Y[1] + 0.5, yp[2]), { id: 'p', face: pt(A, 0.4, 0), anim, alpha: 0.45 * seg(t, 0, 10), light: tint(o.pc, 0.7, 1.35), k: 1.0 });
        act(K, o.you, yp, { id: 'y', face: pt(A, 0.4, 0), anim, light: tint(o.yc, 0.22, 1.2) });
        const foot = pt(A, Y[0] - 0.16, Y[1] - 0.3, FIN_Z[fin]);
        const goal = pt(A, 0.25, 0.3, 0.82);
        let bp;
        if (t < hit) bp = mixP(pt(A, -1.2, 6.0, 0.9), foot, ease(t / hit));
        else bp = mixP(foot, goal, easeIn(seg(t, hit + 2, hit + 40)));
        ball(K, bp);
        const e = pt(A, Y[0] + 1.42, Y[1] - 0.98, 0.22 + air * 0.5);
        cam(K, shake(K, e, f, t >= hit ? 0.03 * (1 - seg(t, hit, hit + 22)) : 0.004, 6), pt(A, Y[0] - 0.05, Y[1] - 0.05, 0.38 + air * 0.6), 40);
        st.foot = wp(foot);
        st.ball = wp(bp);
        if (t >= hit) st.trail = trail(K, (q) => mixP(foot, goal, easeIn(q)), seg(t, hit + 2, hit + 40), 9, 0.04);
      } else {
        const z = easeIO(t / 100);
        const bp = (q) => pt(A, lerp(0.9, 0.62, q), lerp(3.4, 0.4, q), lerp(0.42, 0.84, q));
        const b = bp(z);
        ball(K, b);
        const reach = seg(t, 66, 100);
        act(K, CE.ptdChemKeeper(), pt(A, lerp(-0.05, 0.45, ease(reach)), 0.42, Math.sin(reach * Math.PI * 0.8) * 0.3), { id: 'gk', face: pt(A, 0, 9), anim: reach > 0.1 ? 'dive' : 'idle', frame: reach > 0.1 ? undefined : 0 });
        act(K, o.def, pt(A, -0.9, 1.9), { id: 'd', face: b, frame: 0 });
        const e = [b[0] + 0.22, b[1] + 1.55, b[2] + 0.3];
        cam(K, shake(K, e, f, 0.012, 7), pt(A, 0.3, -0.2, 0.6), 46);
        st.ball = wp(b);
        st.trail = trail(K, bp, z, 9, 0.05);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, top, bot, phase } = S;
      const o = CE.ptdChemCtx();
      const st = resolve(K, K.st || {});
      if (phase === 0) {
        const lit = seg(t, 34, 42);
        const fade = 1 - seg(t, 84, 110) * 0.6;
        if (st.e1 && st.e2) {
          CE.ptdEyeFlare(ctx, st.e1.x, st.e1.y, lit * fade, o.pc, W * 0.5);
          CE.ptdEyeFlare(ctx, st.e2.x, st.e2.y, lit * fade, o.yc, W * 0.5);
          const mx = (st.e1.x + st.e2.x) / 2;
          const my = Math.min(st.e1.y, st.e2.y) - 40;
          const bk = seg(t, 40, 48) * (1 - seg(t, 70, 90));
          CE.ptdBolt(ctx, st.e1.x, st.e1.y, mx, my, o.pc, bk, t, 1);
          CE.ptdBolt(ctx, mx, my, st.e2.x, st.e2.y, o.yc, bk, t, 2);
          if (bk > 0) CE.cineGlow(ctx, mx, my, 90, 'rgba(255,255,255,0.9)', bk);
        }
        CE.ptdSfx(S, 42, 'zap', () => window.SFX?.jingle?.([988, 1319], 0, 'square'));
        CE.ptdWord(ctx, 'REAÇÃO', W * 0.33, bot - 104, 78, o.pc, seg(t, 48, 58), 1, -0.06);
        CE.ptdWord(ctx, 'QUÍMICA', W * 0.66, bot - 62, 78, o.yc, seg(t, 54, 64), 1, -0.06);
        CE.ptdChip(ctx, String(o.c.partnerName || o.pFirst).toUpperCase(), st.p1 ? st.p1.x : W * 0.24, top + 38, o.pc, seg(t, 14, 26), { size: 17 });
        CE.ptdChip(ctx, String(o.c.youName || o.yFirst).toUpperCase(), st.p2 ? st.p2.x : W * 0.76, top + 38, o.yc, seg(t, 20, 32), { size: 17 });
        CE.ptdSfx(S, 36, 'sync', () => window.SFX?.jingle([659, 988], 0, 'triangle'));
      } else if (phase === 1) {
        if (o.st.kind === 'sprint') CE.ptdSpeed(ctx, S, t, o.pc, 0.3, 1, 40, 22);
        if (st.dust) {
          ctx.fillStyle = 'rgba(226,232,240,0.55)';
          for (let i = 0; i < 12; i++) {
            const a = mod(t * 2 + i * 9, 40);
            ctx.fillRect(st.dust.x - 20 + (rnd(i, 2) - 0.5) * 60, st.dust.y + 10 - a * 0.8 - rnd(i, 3) * 20 + a * 2, 6, 6);
          }
        }
        (st.shouts || []).forEach((s) => {
          if (!s.s) return;
          CE.ptdWord(ctx, s.text, s.s.x, s.s.y, s.size, '#f8fafc', seg(t, s.at, s.at + 8), 1 - seg(t, s.at + s.len - 10, s.at + s.len), -0.06);
        });
        if (st.rings) CE.ptdRings(ctx, st.rings.x, st.rings.y, seg(t, 34, 60), [o.pc, '#f8fafc'], 90, 0);
        if (st.lane0 && st.lane1) {
          ctx.save();
          ctx.setLineDash([14, 10]);
          ctx.lineDashOffset = -t * 2;
          ctx.strokeStyle = o.pc;
          ctx.globalAlpha = 0.8;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(st.lane0.x, st.lane0.y);
          ctx.lineTo(st.lane1.x, st.lane1.y);
          ctx.stroke();
          ctx.restore();
          if (st.gap) CE.ptdChip(ctx, '(...a fresta.)', st.gap.x, st.gap.y, o.pc, seg(t, 6, 16), { size: 16 });
        }
        if (st.kicked && st.trail) CE.ptdStreak(ctx, st.trail, o.pc, o.st.kind === 'power' ? 26 : 20, 0.85);
        if (st.kicked && st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 50, rgba(o.pc, 0.75));
        CE.ptdSfx(S, st.r ? st.r.kick : 46, 'pass', () => window.SFX?.pass());
        CE.ptdWord(ctx, `${o.chemName.toUpperCase()}!`, W * 0.5, top + 64, 52, o.pc, seg(t, 4, 14), 1, -0.03, W * 0.86);
      } else if (phase === 2) {
        const hit = 16;
        if (st.foot) {
          ctx.save();
          ctx.globalAlpha = 0.45;
          CE.ptdChemMotif(ctx, S, o, t, st.foot);
          ctx.restore();
        }
        if (t >= hit && st.foot) {
          CE.ptdRings(ctx, st.foot.x, st.foot.y, seg(t, hit, hit + 36), [o.pc, o.yc, '#0a1430'], 420);
          if (st.trail && st.trail.length > 1) {
            [[o.pc, 0], [o.yc, Math.PI]].forEach(([col, ph]) => {
              const pts = st.trail.map((p, i) => ({ x: p.x, y: p.y + Math.sin(i * 0.9 + t * 0.6 + ph) * 10 }));
              CE.ptdStreak(ctx, pts, col, 46, 0.9);
            });
          }
          if (st.ball) {
            CE.cineGlow(ctx, st.ball.x - 14, st.ball.y, 110, rgba(o.pc, 0.8));
            CE.cineGlow(ctx, st.ball.x + 14, st.ball.y, 110, rgba(o.yc, 0.8));
          }
          const sh = o.st.shout;
          CE.ptdWord(ctx, sh, W * 0.74, top + 110, sh.length > 10 ? 78 : 112, o.pc, seg(t, hit, hit + 8), 1, -0.15, W * 0.52);
          CE.cineFlash(ctx, W, H, 0.9 * (1 - seg(t, hit, hit + 8)));
        }
        CE.ptdSfx(S, hit, 'kick', () => window.SFX?.kick(1));
      } else {
        if (st.trail && st.trail.length > 1) {
          [[o.pc, 0], [o.yc, Math.PI]].forEach(([col, ph]) => {
            const pts = st.trail.map((p, i) => ({ x: p.x + Math.sin(i * 0.8 - t * 0.35 + ph) * 14, y: p.y }));
            CE.ptdStreak(ctx, pts, col, 60, 0.85);
          });
        }
        if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 80, rgba(t % 6 < 3 ? o.pc : o.yc, 0.75));
        CE.ptdWord(ctx, `${o.pFirst} → ${o.yFirst}!!`, W / 2, top + 62, 56, '#f8fafc', seg(t, 6, 16), 1, -0.03, W * 0.8);
        CE.ptdChip(ctx, `⚗️ ${o.chemName.toUpperCase()}`, W / 2, top + 122, o.pc, seg(t, 14, 26), { size: 15 });
      }
    }
  });

  // =========================================================================
  // AJUDANTES DOS GOLS DA HISTÓRIA (1ª Seleção e NEL)
  // =========================================================================
  // Câmera colada na bola rumo ao gol; quem passa (carrinho, goleiro) cruza na frente.
  // o = { from, to, len, passers: [{ who, id, anim, p0, p1, t0, t1, z }] }
  function ballCamScene(K, S, A, u, o) {
    const q = clamp(u / o.len);
    const bpos = (k) => [lerp(o.from[0], o.to[0], k), lerp(o.from[1], o.to[1], k), lerp(o.from[2], o.to[2], Math.sin(clamp(k) * Math.PI * 0.5))];
    const b = bpos(q);
    ball(K, b);
    (o.passers || []).forEach((p) => {
      const k = seg(u, p.t0, p.t1);
      const pos = mixP(p.p0, p.p1, k);
      pos[2] = (p.z || 0) * Math.sin(k * Math.PI);
      act(K, p.who, pos, { id: p.id, face: [pos[0] + (p.p1[0] - p.p0[0]), pos[1] + (p.p1[1] - p.p0[1])], anim: p.anim });
    });
    const back = [b[0] - (o.to[0] - o.from[0]) * 0.12 + 0.12 * A.sx, b[1] + 0.85 * A.sy, b[2] + 0.12];
    cam(K, shake(K, back, S.f, 0.014, 9), [o.to[0], o.to[1] - 0.6 * A.sy, 0.6], 48);
    K.st.ball = wp(b);
    K.st.trail = trail(K, bpos, q, 8, 0.035);
  }

  // Três cortes no mesmo chute: de baixo → impacto → de trás. o = { you, keeper, color, shout }
  const TRI = ['CORTE 1/3 • DE BAIXO', 'CORTE 2/3 • IMPACTO', 'CORTE 3/3 • DE TRÁS'];
  function tripleScene(K, S, A, o) {
    const { t, dur, f } = S;
    const L = Math.floor(dur / 3);
    const cut = Math.min(2, Math.floor(t / L));
    const u = t - cut * L;
    const Y = pt(A, 0.9, 4.6);
    const foot = pt(A, 0.74, 4.28, 0.08);
    const goal = pt(A, 0.62, -0.1, 0.8);
    K.st.cut = cut;
    K.st.u = u;
    K.st.L = L;
    if (cut === 0) {
      // de baixo: a câmera no gramado, você armando, a bola caindo do alto
      act(K, o.you, Y, { id: 'y', face: pt(A, 0.6, 0), anim: 'windup', light: tint(o.color, 0.2, 1.2) });
      const bp = mixP(pt(A, 0.7, 4.0, 2.6), foot, ease(u / L));
      ball(K, bp);
      cam(K, shake(K, pt(A, 1.8, 3.62, 0.06), f, 0.004, 2), pt(A, 0.82, 4.45, 0.62 - u * 0.002), 44);
      K.st.ball = wp(bp);
    } else if (cut === 1) {
      // o impacto: de lado, colado no pé
      act(K, o.you, Y, { id: 'y', face: pt(A, 0.6, 0), anim: o.anim || 'shoot', light: tint(o.color, 0.25, 1.25) });
      const bp = u < 6 ? foot : mixP(foot, goal, easeIn(seg(u, 6, L + 30)));
      ball(K, bp);
      cam(K, shake(K, pt(A, 2.32, 4.3, 0.3), f, 0.035 * (1 - seg(u, 0, 18)), 3), pt(A, 0.82, 4.35, 0.36), 38);
      K.st.ball = wp(bp);
    } else {
      // de trás: você de costas na frente, a bola indo, o goleiro voando para o lado errado
      const k = seg(u, 0, L);
      act(K, o.you, Y, { id: 'y', face: pt(A, 0.6, 0), anim: 'shoot', light: tint(o.color, 0.2, 1.2) });
      const bpos = (q) => mixP(mixP(foot, goal, 0.12), goal, ease(q));
      const bp = bpos(k);
      ball(K, bp);
      act(K, o.keeper, pt(A, lerp(0, -0.55, ease(k)), 0.42, Math.sin(k * Math.PI) * 0.3), { id: 'gk', face: pt(A, -4, 0.42), anim: k > 0.3 ? 'dive' : 'idle', frame: k > 0.3 ? undefined : 0 });
      cam(K, shake(K, pt(A, 0.2, 6.0, 0.6), f, 0.006, 4), pt(A, 0.3, 0.3, 0.5), 42);
      K.st.ball = wp(bp);
      K.st.trail = trail(K, bpos, k, 6, 0.06);
    }
  }
  function tripleOverlay(ctx, S, K, o) {
    const { W, H, top } = S;
    const st = resolve(K, K.st || {});
    const u = st.u || 0;
    if (st.cut === 0) {
      CE.ptdRays(ctx, W / 2, H * 0.2, W, rgba(o.color, 1), 0.08, u * 0.004, 30);
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 70, rgba(o.color, 0.6));
      // grama na frente da câmera
      const g = CE.luckGrassCv && CE.luckGrassCv();
      if (g) ctx.drawImage(g, -160, S.bot - 90, W + 320, 150);
    } else if (st.cut === 1) {
      const b = st.ball || { x: W * 0.62, y: H * 0.6 };
      CE.drawRadialSpeedLines(ctx, b.x, b.y, W, '#020617', 0.55 * (1 - seg(u, 0, 26)));
      CE.ptdRings(ctx, b.x, b.y, seg(u, 0, 30), ['#0a1430', o.color, '#0a1430'], 360);
      CE.ptdWord(ctx, o.shout, W * 0.74, top + 110, 96, o.color, seg(u, 0, 7), 1, -0.12, W * 0.5);
      CE.cineFlash(ctx, W, H, 0.9 * (1 - seg(u, 0, 8)));
      CE.ptdSfx(S, st.L || 36, 'kick', () => window.SFX?.kick(1));
    } else {
      if (st.trail) CE.ptdStreak(ctx, st.trail, o.color, 44, 0.85);
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 60, rgba(o.color, 0.7));
    }
    CE.ptdChip(ctx, TRI[st.cut || 0], 30, top + 34, o.color, seg(u, 0, 6), { size: 14, left: true });
  }

  // =========================================================================
  // 3) 1ª SELEÇÃO: O DESPERTAR (first_selection_awakening)
  // =========================================================================
  const FUT = [1.1, 3.3]; // o ponto futuro (u, d)
  reg('first_selection_awakening', {
    phases: [100, 110, 108, 90, 130],
    music: 'epic',
    letterbox: 0.1,
    grain: 0,
    theme: 'bluelock_bunker',
    title: '🧩 1ª SELEÇÃO • O DESPERTAR',
    tags: ['PLANO 1 • O CRUZAMENTO DO BACHIRA', 'PLANO 2 • AS PEÇAS SE ENCAIXAM', 'PLANO 3 • TRÊS ÂNGULOS, UM CHUTE DIRETO', 'PLANO 4 • RASGANDO A GRANDE ÁREA', 'PLANO 5 • A REDE DO TIME V'],
    get subs() {
      return [
        [{ from: 4, who: 'MEGURU BACHIRA', text: '"É você!!"', color: '#facc15' }],
        [{ from: 0, who: 'VOCÊ', text: '(A última peça... sou EU.)', color: YOU }],
        [{ from: 6, who: 'NARRADOR', text: 'Voleio sem dominar!', color: '#94a3b8' }],
        [{ from: 8, who: 'NARRADOR', text: 'Nem o Nagi!', color: '#94a3b8' }],
        [{ from: 12, who: 'JINPACHI EGO', text: '"Isso! Esse é o EGO."', color: YOU }]
      ];
    },
    scene(K, S) {
      const { t, phase, f } = S;
      const c = CE.ptdFirstCast();
      const A = atk(false);
      const st = (K.st = {});
      K.expo(1.0);
      if (phase === 0) {
        // o Bachira dá o elástico no Reo e cruza para o ponto futuro
        const el = t >= 24 && t < 42;
        const cross = 64;
        const bu = t < 42 ? lerp(-3.5, -2.7, ease(t / 30)) : lerp(-2.7, -2.35, ease(seg(t, 42, 62)));
        const bd = t < 42 ? lerp(9.4, 7.2, ease(t / 30)) : lerp(7.2, 6.0, ease(seg(t, 42, 62)));
        const bp = pt(A, bu, bd);
        const bAnim = t >= cross ? 'shoot' : el ? 'rabona' : 'run';
        act(K, c.bachira, bp, { id: 'b', face: t >= cross ? pt(A, FUT[0], FUT[1]) : pt(A, bu + 0.3, 0), anim: bAnim, light: tint('#facc15', 0.2, 1.15), opts: { showAura: true, auraColor: '#facc15' } });
        const rk = ease(seg(t, 32, 50));
        const rp = pt(A, lerp(-2.25, -2.45, seg(t, 0, 30)) - rk * 0.7, 6.75 + rk * 0.25, rk > 0 ? Math.sin(rk * Math.PI) * 0.12 : 0);
        act(K, c.reo, rp, { id: 'r', face: rk > 0 ? pt(A, -6, 6.9) : bp, anim: t > 32 ? 'dive' : 'idle', frame: t > 32 ? undefined : 0 });
        act(K, c.nagi, pt(A, 0.5, 3.7), { id: 'n', face: bp, frame: 0 });
        act(K, c.keeper, pt(A, 0, 0.45), { id: 'gk', face: pt(A, 0, 9), frame: 0 });
        act(K, c.you, pt(A, lerp(2.7, 1.7, t / 100), lerp(6.4, 4.6, t / 100)), { id: 'y', face: pt(A, FUT[0], FUT[1]), anim: 'run' });
        let ballP;
        if (t < cross) {
          const wig = el ? Math.sin((t - 26) * 0.5) * 0.18 : 0;
          ballP = pt(A, bu + 0.12 + wig, bd - 0.32, 0.05);
        } else {
          const k = seg(t, cross, cross + 40);
          const from = pt(A, bu + 0.12, bd - 0.32, 0.05);
          const to = pt(A, FUT[0], FUT[1], 0.4);
          ballP = mixP(from, to, k);
          ballP[2] += Math.sin(k * Math.PI) * 1.5;
          st.trail = trail(K, (q) => {
            const p = mixP(from, to, q);
            p[2] += Math.sin(q * Math.PI) * 1.5;
            return p;
          }, k, 6, 0.05);
        }
        ball(K, ballP);
        const rk2 = seg(t, cross + 6, cross + 16);
        ring(K, pt(A, FUT[0], FUT[1]), 0.42 + Math.sin(t * 0.3) * 0.03, YOU, rk2);
        // grua atrás do lance; depois do cruzamento ela gira para o ponto futuro
        const pan = easeIO(seg(t, cross - 4, 100));
        cam(K, shake(K, pt(A, lerp(-1.2, -0.6, pan), lerp(10.8, 10.2, pan), 1.25), f * 0.5, 0.008), pt(A, lerp(-2.1, 0.2, pan), lerp(6.4, 4.0, pan), 0.3), 46);
        st.ball = wp(ballP);
        st.el = el ? wp([bp[0], bp[1], 1.15]) : null;
        st.fut = wp(pt(A, FUT[0], FUT[1], 0.75));
      } else if (phase === 1) {
        // por cima do seu ombro: as costas do Nagi e do Reo e a fresta entre eles
        const yp = pt(A, 2.75, 5.35);
        const k = easeIO(t / 110);
        const ce = pt(A, 2.5, lerp(6.6, 6.35, k), 0.78);
        // você de costas para a câmera (por cima do seu ombro)
        act(K, c.you, yp, { id: 'y', face: [2 * yp[0] - ce[0], 2 * yp[1] - ce[1]], anim: 'idle' });
        const look = pt(A, -3, 6.2);
        act(K, c.nagi, pt(A, 0.95, 3.6), { id: 'n', face: look, frame: 0 });
        act(K, c.reo, pt(A, 2.35, 3.35), { id: 'r', face: look, frame: 0 });
        act(K, c.keeper, pt(A, 0.2, 0.45), { id: 'gk', face: pt(A, 0, 9), frame: 0 });
        const gk = seg(t, 40, 60);
        const gp = pt(A, 1.55, 3.55);
        if (gk > 0) {
          K.box({ x0: gp[0] - 0.03, y0: gp[1] - 0.03, x1: gp[0] + 0.03, y1: gp[1] + 0.03, z0: 0, z1: 1.1, color: YOU, em: true, alpha: 0.85 * gk });
          ring(K, gp, 0.36, YOU, gk);
        }
        cam(K, shake(K, ce, f * 0.5, 0.006), pt(A, 1.55, 3.5, 0.5), 40);
        st.gap = wp([gp[0], gp[1], 0.62]);
        st.gapTop = wp([gp[0], gp[1], 1.1]);
      } else if (phase === 2) {
        tripleScene(K, S, A, { you: c.you, keeper: c.keeper, color: YOU });
      } else if (phase === 3) {
        ballCamScene(K, S, A, t, {
          from: pt(A, 0.75, 3.9, 0.42),
          to: pt(A, 0.66, 0.4, 0.8),
          len: 92,
          passers: [
            { who: c.nagi, id: 'n', anim: 'slide', p0: pt(A, 1.7, 3.1), p1: pt(A, -1.6, 3.1), t0: 10, t1: 46 },
            { who: c.keeper, id: 'gk', anim: 'dive', p0: pt(A, 0.35, 0.55), p1: pt(A, -0.95, 0.55), t0: 50, t1: 86, z: 0.36 }
          ]
        });
      } else {
        goalHitScene(K, S, A, { keeper: c.keeper, scorer: c.you, color: YOU, hit: 20, side: 1, mates: [c.reo, c.nagi] });
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, top, bot, phase } = S;
      const c = CE.ptdFirstCast();
      const st = resolve(K, K.st || {});
      if (phase === 0) {
        if (st.el) CE.ptdWord(ctx, 'ELÁSTICO!', st.el.x, st.el.y, 58, '#facc15', seg(t, 24, 30), 1 - seg(t, 36, 42), -0.06);
        if (st.trail) CE.ptdStreak(ctx, st.trail, '#facc15', 20, 0.8);
        if (t > 70 && st.fut) CE.ptdChip(ctx, 'PONTO FUTURO', st.fut.x, st.fut.y - 30, YOU, seg(t, 70, 80), { size: 15 });
        CE.ptdSfx(S, 64, 'cross', () => window.SFX?.kick(0.6));
        CE.ptdScore(ctx, 32, top + 16, Object.assign({}, c.score, { hs: Math.max(0, c.score.hs - 1), k: seg(t, 4, 16) }));
      } else if (phase === 1) {
        // A: o seu olho (painel de mangá na esquerda) com as peças flutuando
        const out = ease(seg(t, 62, 76));
        if (out < 1) {
          const slide = (1 - ease(seg(t, 0, 14))) * 60 + out * W * 0.45;
          const pw = W * 0.36;
          const PA = [[24, top + 16], [pw, top + 16], [pw - 44, bot - 16], [24, bot - 16]];
          CE.ptdPanel(ctx, PA, () => {
            CE.ptdCloseBg(ctx, S, YOU, pw * 0.5);
            CE.ptdFaceCrop(ctx, c.you, 6, top + 40, pw - 20, 10, 3, 16, 14, { ring: t > 50 ? YOU : undefined, look: 1, angry: t > 50 });
            for (let i = 0; i < 5; i++) {
              const a = t * 0.02 + i;
              CE.ptdPuzzle(ctx, 60 + rnd(i, 3) * (pw - 140) + Math.sin(a) * 16, bot - 120 + Math.cos(a) * 24 - rnd(i, 4) * 70, 40, i % 2 ? YOU : '#38bdf8', a * 0.5, 0.9);
            }
          }, { dx: -slide });
        }
        // a última peça voa para a fresta e encaixa
        const g = st.gap || { x: W * 0.6, y: H * 0.5 };
        const k = ease(seg(t, 56, 80));
        if (t > 40 && st.gapTop) CE.ptdChip(ctx, 'A ÚLTIMA PEÇA', st.gapTop.x, st.gapTop.y - 26, YOU, seg(t, 40, 52), { size: 14 });
        if (t >= 56) {
          const px = lerp(W + 80, g.x, k);
          const py = lerp(top - 40, g.y, k);
          if (k >= 1) CE.cineGlow(ctx, g.x, g.y, 140, 'rgba(0,245,212,0.7)', 1 - seg(t, 80, 110) * 0.5);
          CE.ptdPuzzle(ctx, px, py, 84, YOU, (1 - k) * 1.2, 1);
          if (t >= 80) CE.ptdWord(ctx, 'CLICK!', g.x + 150, g.y + 40, 60, '#f8fafc', seg(t, 80, 86), 1, -0.1);
        }
        CE.ptdSfx(S, 80, 'click', () => window.SFX?.blip(1320));
      } else if (phase === 2) {
        tripleOverlay(ctx, S, K, { color: YOU, shout: 'CHUTE DIRETO!!' });
      } else if (phase === 3) {
        if (st.trail) {
          CE.ptdStreak(ctx, st.trail, '#38bdf8', 70, 0.6);
          CE.ptdStreak(ctx, st.trail, YOU, 50, 0.85);
        }
        if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 90, rgba(YOU, 0.7));
        CE.ptdSpeed(ctx, S, t, '#e0f2fe', 0.12, 1, 50, 18);
        CE.ptdWord(ctx, 'PASSOU!', W * 0.72, top + 90, 70, YOU, seg(t, 30, 38), 1 - seg(t, 70, 84), -0.08);
        CE.ptdSfx(S, 4, 'fly', () => window.SFX?.whoosh());
      } else {
        goalHitOverlay(ctx, S, K, { color: YOU, teamColor: YOU, word: 'GOOOOOL!!', hit: 20 });
        CE.ptdScore(ctx, 32, top + 16, Object.assign({}, c.score, { hs: t >= 50 ? c.score.hs : Math.max(0, c.score.hs - 1), pop: 'home', popK: seg(t, 50, 66) }));
        CE.ptdChip(ctx, 'O TIME Z SEGUE VIVO NO BLUE LOCK!', W * 0.36, bot - 44, YOU, seg(t, 70, 82), { size: 17 });
      }
    }
  });

  // =========================================================================
  // 4) NEL: METAVISION (nel_metavision_goal)
  // =========================================================================
  // grade holográfica do Metavision no gramado (pronta uma vez)
  let GRID = null;
  const gridCv = () => {
    if (GRID) return GRID;
    const cv = document.createElement('canvas');
    cv.width = 296;
    cv.height = 316;
    const g = cv.getContext('2d');
    g.fillStyle = 'rgba(2,6,23,0.55)';
    g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = 'rgba(56,189,248,0.55)';
    for (let x = 0; x <= cv.width; x += 12) g.fillRect(x, 0, 1, cv.height);
    for (let y = 0; y <= cv.height; y += 12) g.fillRect(0, y, cv.width, 1);
    g.fillStyle = 'rgba(103,232,249,0.95)';
    g.fillRect(0, 0, cv.width, 3);
    g.fillRect(0, cv.height - 3, cv.width, 3);
    g.fillRect(0, 0, 3, cv.height);
    g.fillRect(cv.width - 3, 0, 3, cv.height);
    g.fillRect(0, cv.height / 2 - 1, cv.width, 3);
    GRID = cv;
    return cv;
  };
  // onde cada um está no plano 1 (u, d)
  const META = [
    { key: 'hiori', p: [-2.8, 9.9], col: YOU, name: 'HIORI' },
    { key: 'kaiser', p: [-1.1, 4.2], col: '#ef4444', name: 'KAISER' },
    { key: 'lorenzo', p: [2.0, 3.2], col: '#ef4444', name: 'LORENZO' },
    { key: 'keeper', p: [0, 0.5], col: '#ef4444', name: 'GOLEIRO' },
    { key: 'lorenzo', id: 'f1', p: [3.9, 5.4], col: '#ef4444', name: '' },
    { key: 'hiori', id: 'm1', p: [3.1, 8.3], col: YOU, name: '' },
    { key: 'kaiser', id: 'f2', p: [-2.8, 2.2], col: '#ef4444', name: '' }
  ];
  const ME_AT = [0.7, 6.4];
  // figurantes (sem rosto de personagem famoso) para os dois sem nome de cada time
  const extraOf = (c, base, id) => {
    const cache = c._ex || (c._ex = {});
    if (!cache[id]) cache[id] = Object.assign({}, base, { name: 'Jogador ' + id, id: undefined, hairStyle: 'short_sharp', hairColor: id === 'm1' ? '#78350f' : '#1f2937', hairSecondary: id === 'm1' ? '#78350f' : '#1f2937', skinColor: '#e8c4a8', eyeStyle: undefined, mouth: undefined });
    return cache[id];
  };

  reg('nel_metavision_goal', {
    phases: [100, 108, 108, 90, 150],
    music: 'epic',
    letterbox: 0.1,
    grain: 0,
    theme: 'nel_dome',
    title: '👁️ NEL • METAVISION',
    tags: ['PLANO 1 • METAVISION 4D', 'PLANO 2 • OLHOS DO PREDADOR', 'PLANO 3 • TRÊS ÂNGULOS, DUAS ARMAS', 'PLANO 4 • EFEITO MAGNUS', 'PLANO 5 • ¥ 300.000.000'],
    get subs() {
      return [
        [{ from: 2, who: 'VOCÊ', text: '(Eu já vi esse lance.)', color: YOU }],
        [{ from: 2, who: 'VOCÊ', text: '(Vão bloquear a canhota.)', color: YOU }],
        [{ from: 8, who: 'NARRADOR', text: 'Bomba de direita!', color: '#94a3b8' }],
        [{ from: 0, who: 'MICHAEL KAISER', text: '"Impossível."', color: '#a855f7' }],
        [{ from: 40, who: 'BLTV', text: 'Seu leilão: ¥ 300.000.000!', color: '#facc15' }]
      ];
    },
    scene(K, S) {
      const { t, phase, f } = S;
      const c = CE.ptdNelCast();
      const A = atk(false);
      const st = (K.st = {});
      K.expo(1.0);
      if (phase === 0) {
        // o campo visto do alto com a grade do Metavision; todo mundo parado no instante
        K.expo(0.62);
        K.floor({ x0: 45.6, y0: 6.6, x1: 60.4, y1: 22.4, z: 0.02, img: gridCv(), em: true, alpha: 0.75 });
        const me = pt(A, ME_AT[0], ME_AT[1]);
        act(K, c.you, me, { id: 'y', face: pt(A, 0.7, 0), frame: 0, light: tint(YOU, 0.3, 1.3) });
        st.pl = META.map((m) => {
          const who = m.id ? extraOf(c, c[m.key], m.id) : c[m.key];
          const p = pt(A, m.p[0], m.p[1]);
          act(K, who, p, { id: m.id || m.key, face: m.col === YOU ? pt(A, 0, 0) : me, frame: 0 });
          return Object.assign({}, m, { s: wp([p[0], p[1], 0.05]), top: wp([p[0], p[1], 1.05]) });
        });
        const k = easeIO(t / 100);
        cam(K, pt(A, lerp(2.6, -0.6, k), lerp(14.6, 13.4, k), lerp(5.6, 5.0, k)), pt(A, 0.4, 5.2, 0), 50);
        st.me = wp([me[0], me[1], 0.05]);
        st.P = (u, d) => { const q = pt(A, u, d, 0.05); return K.screen(q[0], q[2], q[1]); };
      } else if (phase === 1) {
        const cutAt = 44;
        if (t < cutAt) {
          // olhos do predador: close escuro e vermelho (os olhos vão no overlay)
          K.expo(0.6);
          const yp = pt(A, 0.7, 5.0);
          act(K, c.you, yp, { id: 'y', face: pt(A, 0.7, 0), frame: 0, light: [1.25, 0.7, 0.7] });
          cam(K, shake(K, pt(A, 0.8, 5.0 - 1.82 + t * 0.002, 0.58), f, 0.004), pt(A, 0.7, 5.0, 0.55), 32);
        } else {
          // a finta no ar: o Kaiser e o Lorenzo saltam para bloquear a canhota
          const u = t - cutAt;
          const feint = 30;
          const jump = Math.sin(clamp(u / 64) * Math.PI);
          const yp = pt(A, 0.7, 4.6, jump * 0.38);
          act(K, c.you, yp, { id: 'y', face: pt(A, 0.7, 0), anim: u < feint ? 'windup' : 'shoot', light: u >= feint ? tint(YOU, 0.3, 1.25) : undefined, opts: u >= feint ? { showAura: true, auraColor: YOU, mirror: true } : undefined });
          const kz = ease(seg(u, 0, 26));
          const fall = easeIn(seg(u, feint + 2, feint + 26));
          act(K, c.lorenzo, pt(A, 0.75, lerp(2.4, 3.75, kz) - fall * 0.5, 0), { id: 'l', face: yp, anim: 'slide' });
          act(K, c.kaiser, pt(A, 0.6, lerp(2.6, 3.9, kz) - fall * 0.6, lerp(0.1, 0.55, kz) * (1 - fall) + 0.02), { id: 'k', face: yp, anim: 'dive' });
          act(K, c.hiori, pt(A, -2.6, 7.2), { id: 'h', face: yp, anim: u < 4 ? 'shoot' : 'idle', frame: u < 4 ? undefined : 0 });
          const bk = seg(u, 0, 26);
          const from = pt(A, -2.4, 6.9, 0.05);
          const to = pt(A, 0.62, 4.42, yp[2] + 0.2);
          const bp = mixP(from, to, bk);
          bp[2] += Math.sin(bk * Math.PI) * 0.6;
          ball(K, bp);
          cam(K, shake(K, pt(A, 3.3, 5.0, 0.42), f, 0.008), pt(A, 0.4, 4.3, 0.5), 44);
          st.pass = wp([from[0], from[1], 1.0]);
          st.feint = wp([yp[0], yp[1], yp[2] + 1.0]);
        }
      } else if (phase === 2) {
        tripleScene(K, S, A, { you: c.you, keeper: c.keeper, color: YOU });
      } else if (phase === 3) {
        // o Kaiser parado em primeiro plano; a bola fazendo a curva impossível atrás dele
        K.expo(0.85);
        const kp = pt(A, -0.55, 3.3);
        act(K, c.kaiser, kp, { id: 'k', face: pt(A, -0.4, 9), frame: 0, light: [0.95, 0.78, 1.15] });
        act(K, c.keeper, pt(A, 0, 0.45), { id: 'gk', face: pt(A, 0, 9), frame: 0 });
        const B = (q) => {
          const p = mixP(pt(A, 1.5, 4.4, 0.25), pt(A, -0.78, -0.15, 0.84), q);
          p[0] += Math.sin(q * Math.PI) * 1.5 * A.sx;
          p[2] += Math.sin(q * Math.PI) * 0.5;
          return p;
        };
        const k = seg(t, 6, 78);
        const bp = B(k);
        ball(K, bp);
        cam(K, shake(K, pt(A, -0.15, 5.15 - t * 0.002, 0.6), f, 0.004), pt(A, 0.2, 3.3, 0.56), 32);
        st.trail = trail(K, B, k, 12, 0.04);
        st.ball = wp(bp);
        st.head = wp([kp[0], kp[1], 0.6]);
        st.temple = wp([kp[0] + 0.11 * A.sx, kp[1], 0.66]);
        st.temple2 = wp([kp[0] + 0.11 * A.sx, kp[1], 0.6]);
      } else {
        goalHitScene(K, S, A, { keeper: c.keeper, scorer: t < 64 ? c.you : null, color: YOU, hit: 16, side: -1, mates: [c.kaiser] });
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, top, bot, phase } = S;
      const c = CE.ptdNelCast();
      const st = resolve(K, K.st || {});
      if (phase === 0) {
        const me = st.me || { x: W / 2, y: H / 2 };
        // varredura de 360°
        const ang = t * 0.11;
        ctx.save();
        for (let i = 0; i < 10; i++) {
          ctx.globalAlpha = 0.14 * (1 - i / 10);
          ctx.fillStyle = YOU;
          ctx.beginPath();
          ctx.moveTo(me.x, me.y);
          ctx.arc(me.x, me.y, W * 0.6, ang - (i + 1) * 0.06, ang - i * 0.06);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        const passed = (x, y) => ang >= TAU || mod(ang, TAU) >= mod(Math.atan2(y - me.y, x - me.x), TAU);
        (st.pl || []).forEach((pl) => {
          if (!pl.s) return;
          const on = passed(pl.s.x, pl.s.y);
          ctx.fillStyle = '#020617';
          ctx.fillRect(pl.s.x - 9, pl.s.y - 5, 18, 10);
          ctx.fillStyle = on ? pl.col : 'rgba(148,163,184,0.5)';
          ctx.fillRect(pl.s.x - 7, pl.s.y - 3, 14, 6);
          if (on && pl.name && pl.top) CE.ptdChip(ctx, pl.name, pl.top.x, pl.top.y - 14, pl.col, 1, { size: 12 });
        });
        const P = st.P;
        const dash = (a, b, col, k, w = 4) => {
          if (k <= 0 || !P) return;
          const p0 = P(a[0], a[1]);
          const p1 = P(b[0], b[1]);
          if (!p0 || !p1) return;
          ctx.save();
          ctx.setLineDash([12, 9]);
          ctx.lineDashOffset = -t * 1.5;
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(lerp(p0.x, p1.x, k), lerp(p0.y, p1.y, k));
          ctx.stroke();
          ctx.restore();
        };
        dash([-1.1, 4.2], [-0.2, 5.4], '#ef4444', seg(t, 36, 52));
        dash([2.0, 3.2], [1.2, 5.0], '#ef4444', seg(t, 40, 56));
        dash([-2.8, 9.9], ME_AT, YOU, seg(t, 50, 64));
        dash(ME_AT, [-0.75, -0.05], '#facc15', seg(t, 64, 82), 5);
        CE.ptdChip(ctx, 'VOCÊ', me.x, me.y + 30, YOU, 1, { size: 13 });
        if (t > 64 && P) {
          const r = P(-0.9, 1.6);
          if (r) CE.ptdWord(ctx, 'ROTA DE GOL', r.x, r.y - 44, 30, '#facc15', seg(t, 66, 74), 1, -0.05);
        }
        // o seu olho no canto
        const E = [[24, bot - 150], [372, bot - 158], [372, bot - 18], [24, bot - 18]];
        CE.ptdPanel(ctx, E, () => {
          ctx.fillStyle = '#071226';
          ctx.fillRect(0, bot - 170, 380, 170);
          CE.ptdFaceCrop(ctx, c.you, 24, bot - 158, 348, 11, 7.2, 14, 6.4, { ring: YOU, iris: '#0b3b4f', look: mod(Math.floor(t / 20), 3) - 1 });
        }, { width: 4 });
        CE.ptdWord(ctx, 'METAVISION', 210, top + 50, 50, YOU, seg(t, 6, 14), 1, -0.05);
        CE.ptdChip(ctx, 'LEITURA 4D • 360°', 210, top + 102, YOU, seg(t, 12, 22), { size: 14 });
        CE.ptdSfx(S, 6, 'scan', () => window.SFX?.blip(660));
      } else if (phase === 1) {
        const cutAt = 44;
        if (t < cutAt) {
          // faixa dos olhos em close (pixel art), bem no meio da tela
          const bh = Math.round(H * 0.4);
          const by = Math.round(H * 0.5 - bh / 2);
          const k = ease(seg(t, 0, 10));
          CE.ptdPanel(ctx, [[0, by], [W, by - 10], [W, by + bh], [0, by + bh + 10]], () => {
            CE.ptdCloseBg(ctx, S, '#ef4444', W / 2);
            const U = W / 13;
            CE.ptdFaceCrop(ctx, c.you, 0, by + bh / 2 - (10 - 7.6) * U, W, 11.5, 7.6, 13, 5, { iris: '#1c0505', ring: '#ef4444', tiny: true, angry: true });
          }, { dx: (1 - k) * -W });
          CE.ptdWord(ctx, 'OLHOS DO PREDADOR', W / 2, bot - 70, 54, '#ef4444', seg(t, 8, 16), 1, -0.03, W * 0.8);
        } else {
          const u = t - cutAt;
          const feint = 30;
          if (u < 24 && st.pass) CE.ptdChip(ctx, 'PASSE DO HIORI', st.pass.x, st.pass.y, '#38bdf8', seg(u, 0, 8), { size: 14 });
          if (u >= feint) CE.ptdWord(ctx, 'FINTA NO AR!', W * 0.42, top + 90, 70, YOU, seg(u, feint, feint + 8), 1, -0.06);
          CE.ptdSfx(S, cutAt + feint, 'feint', () => window.SFX?.whoosh());
        }
      } else if (phase === 2) {
        tripleOverlay(ctx, S, K, { color: YOU, shout: 'DUAS ARMAS!!' });
      } else if (phase === 3) {
        if (st.trail) CE.ptdStreak(ctx, st.trail, YOU, 34, 0.85);
        if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 60, rgba(YOU, 0.7));
        // gota de suor descendo na têmpora do Kaiser
        if (st.temple && st.temple2) {
          const u = Math.max(4, Math.abs(st.temple2.y - st.temple.y) / 2.2);
          const dy = seg(t, 40, 90) * u * 2;
          ctx.fillStyle = '#bae6fd';
          ctx.fillRect(Math.round(st.temple.x), Math.round(st.temple.y + dy), Math.ceil(u * 0.6), Math.ceil(u * 0.9));
          ctx.fillRect(Math.round(st.temple.x - u * 0.2), Math.round(st.temple.y + dy + u * 0.6), Math.ceil(u), Math.ceil(u * 0.9));
        }
        CE.ptdWord(ctx, 'EFEITO MAGNUS', W * 0.72, bot - 70, 66, YOU, seg(t, 20, 30), 1, -0.05, W * 0.5);
        CE.ptdSfx(S, 8, 'curve', () => window.SFX?.whoosh());
      } else {
        goalHitOverlay(ctx, S, K, { color: YOU, teamColor: YOU, word: 'GOOOOOL!!', hit: 16 });
        CE.ptdScore(ctx, 32, top + 16, Object.assign({}, c.score, { hs: t >= 40 ? c.score.hs : Math.max(0, c.score.hs - 1), pop: 'home', popK: seg(t, 40, 56) }));
        nelBoard(ctx, S, c);
      }
    }
  });

  // O telão da BLTV descendo com o leilão (igual à versão 2D)
  function nelBoard(ctx, S, c) {
    const { W, H, t, top, bot } = S;
    const sk = ease(seg(t, 58, 76));
    if (sk <= 0) return;
    ctx.save();
    ctx.fillStyle = `rgba(2,6,23,${0.55 * sk})`;
    ctx.fillRect(0, 0, W, H);
    const x0 = W * 0.1;
    const w = W * 0.8;
    const y0 = lerp(-400, top + 26, sk);
    const h = bot - top - 64;
    ctx.fillStyle = '#020617';
    ctx.fillRect(x0 - 10, y0 - 10, w + 20, h + 20);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(x0 - 6, y0 - 6, w + 12, h + 12);
    ctx.fillStyle = '#070b18';
    ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(x0, y0, w, 44);
    ctx.font = '900 20px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0b1020';
    ctx.fillText('BLTV • LEILÃO MUNDIAL AO VIVO', x0 + 18, y0 + 23);
    if (Math.floor(t / 20) % 2) {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x0 + w - 92, y0 + 12, 12, 12);
    }
    ctx.fillStyle = '#0b1020';
    ctx.textAlign = 'right';
    ctx.fillText('AO VIVO', x0 + w - 18, y0 + 23);
    const pw = Math.min(250, h - 190);
    ctx.fillStyle = '#0b2447';
    ctx.fillRect(x0 + 24, y0 + 64, pw, pw);
    CE.ptdCrop(ctx, c.you, {}, 9, 2, 18, 18, x0 + 24, y0 + 64, pw, pw);
    ctx.strokeStyle = YOU;
    ctx.lineWidth = 3;
    ctx.strokeRect(x0 + 24, y0 + 64, pw, pw);
    ctx.textAlign = 'left';
    ctx.font = '900 16px "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('NOVA OFERTA', x0 + pw + 60, y0 + 92);
    ctx.font = '900 30px "Segoe UI", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(CE.cinePlayerName(), x0 + pw + 60, y0 + 130);
    const val = Math.round((300000000 * easeIO(seg(t, 76, 118))) / 1000000) * 1000000;
    const txt = `¥ ${val.toLocaleString('pt-BR')}`;
    let fs = 62;
    ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
    while (fs > 30 && ctx.measureText('¥ 300.000.000').width > w - pw - 100) {
      fs -= 4;
      ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
    }
    ctx.fillStyle = '#020617';
    ctx.fillText(txt, x0 + pw + 64, y0 + 206);
    ctx.fillStyle = val >= 300000000 ? '#facc15' : '#fde68a';
    ctx.fillText(txt, x0 + pw + 60, y0 + 202);
    if (t > 118) CE.ptdChip(ctx, '▲ RECORDE DA RODADA', x0 + pw + 60, y0 + 266, '#facc15', seg(t, 118, 128), { size: 15, left: true });
    const bids = [['MANSHINE CITY', 240, '#7dd3fc'], ['P.X.G', 210, '#e11d48'], ['FC BARCHA', 180, '#ef4444']];
    bids.forEach(([club, v, col], i) => {
      const k = seg(t, 84 + i * 10, 96 + i * 10);
      if (k <= 0) return;
      const y = y0 + Math.max(pw + 100, 352) + i * 40;
      if (y > y0 + h - 56) return;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(30,41,59,0.85)';
      ctx.fillRect(x0 + 24, y - 16, w - 48, 32);
      ctx.fillStyle = col;
      ctx.fillRect(x0 + 24, y - 16, 6, 32);
      ctx.font = '900 16px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`LANCE • ${club}`, x0 + 44, y + 1);
      const barW = (w - 520) * (v / 300) * ease(k);
      ctx.fillStyle = col;
      ctx.fillRect(x0 + 300, y - 6, barW, 12);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`¥ ${(v * 1000000).toLocaleString('pt-BR')}`, x0 + w - 40, y + 1);
      ctx.restore();
    });
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0 + h - 40, w, 40);
    ctx.clip();
    ctx.fillStyle = '#111827';
    ctx.fillRect(x0, y0 + h - 40, w, 40);
    ctx.font = '900 15px "Segoe UI", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    const tick = 'BASTARD MÜNCHEN • MANSHINE CITY • FC BARCHA • UBERS • P.X.G • ';
    const tw = ctx.measureText(tick).width;
    const off = mod(t * 2.2, tw);
    for (let x = x0 - off; x < x0 + w; x += tw) ctx.fillText(tick, x, y0 + h - 20);
    ctx.restore();
    ctx.restore();
    CE.ptdSfx(S, 118, 'offer', () => window.SFX?.jingle([784, 988, 1319], 0, 'triangle'));
  }

  // =========================================================================
  // 5) O GOL DA SORTE (u20_direct_shoot e u20_final_goal: o mesmo filme)
  // =========================================================================
  const CYAN = '#00f5d4';
  const RIN_C = '#22d3ee';
  const FROZEN_L = [0.55, 0.68, 0.98];
  // paletas das peças de quebra-cabeça (as mesmas da versão 2D)
  const PAL = {
    gold: { f0: '#fff7cc', f1: '#fcd34d', f2: '#b45309', b0: '#d9a520', b1: '#b8860b', b2: '#7c4a03', side: '#8a5a00', side2: '#9a6700', dark: '#5c3a00', edge: '#78350f', text: '#6b2f06', glow: 'rgba(253,224,71,0.85)' },
    cyan: { f0: '#ccfbf1', f1: '#2dd4bf', f2: '#0f766e', b0: '#5eead4', b1: '#0d9488', b2: '#134e4a', side: '#0b4f4a', side2: '#0d5c56', dark: '#042f2e', edge: '#022c22', text: '#042f2e', glow: 'rgba(45,212,191,0.7)' },
    teal: { f0: '#a5f3fc', f1: '#22d3ee', f2: '#0e7490', b0: '#67e8f9', b1: '#0891b2', b2: '#164e63', side: '#155e75', side2: '#0e7490', dark: '#083344', edge: '#082f49', text: '#083344', glow: 'rgba(34,211,238,0.7)' },
    blue: { f0: '#dbeafe', f1: '#60a5fa', f2: '#1d4ed8', b0: '#93c5fd', b1: '#2563eb', b2: '#1e3a8a', side: '#1e3a8a', side2: '#1e40af', dark: '#172554', edge: '#0b1d4d', text: '#0b1d4d', glow: 'rgba(96,165,250,0.7)' },
    white: { f0: '#ffffff', f1: '#e2e8f0', f2: '#94a3b8', b0: '#f1f5f9', b1: '#cbd5e1', b2: '#64748b', side: '#64748b', side2: '#475569', dark: '#334155', edge: '#1e293b', text: '#0f172a', glow: 'rgba(226,232,240,0.6)' }
  };
  // a peça dourada LUCK em pé no mundo (canvas único, redesenhado só quando gira)
  let PIECE = null;
  const pieceSprite = (K, p, spin, tilt, glow, shine, size = 0.62) => {
    if (!PIECE) {
      PIECE = document.createElement('canvas');
      PIECE.width = 192;
      PIECE.height = 192;
      PIECE.key = '';
    }
    const key = [spin.toFixed(2), tilt.toFixed(2), glow.toFixed(2), shine.toFixed(2)].join('|');
    const dirty = key !== PIECE.key;
    if (dirty) {
      const g = PIECE.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, 192, 192);
      CE.luckPiece(g, 96, 96, 110, spin, tilt, 'LUCK', PAL.gold, glow, shine);
      PIECE.key = key;
    }
    K.sprite(PIECE, { x: p[0], y: p[1], z: p[2] - size / 2, w: size, h: size, light: [1.3, 1.22, 1.05], dirty });
  };
  // onde a sorte cai (u, d)
  const LAND = [0.25, 3.9];
  // a explosão ciano no choque: um círculo de luz de borda recortada e raios finos
  const cyanBurst = (ctx, x, y, q, W) => {
    if (q <= 0 || q >= 1) return;
    const R = 40 + ease(q) * W * 0.22;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - q;
    const gr = ctx.createRadialGradient(x, y, R * 0.08, x, y, R);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)');
    gr.addColorStop(0.5, 'rgba(207,250,254,0.75)');
    gr.addColorStop(0.82, 'rgba(34,211,238,0.6)');
    gr.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    for (let i = 0; i <= 44; i++) {
      const a = (i / 44) * TAU;
      const r = R * (0.86 + rnd(i, 71) * 0.16);
      if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(207,250,254,0.85)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const a = rnd(i, 72) * TAU;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * R * 0.95, y + Math.sin(a) * R * 0.95);
      ctx.lineTo(x + Math.cos(a) * R * (1.6 + rnd(i, 73)), y + Math.sin(a) * R * (1.6 + rnd(i, 73)));
      ctx.stroke();
    }
    ctx.restore();
  };

  const luckDef = (type) => ({
    phases: [140, 140, 130, 120, 160, 140, 160, 150, 110, 120, 140, 140, 150],
    music: type === 'u20_direct_shoot' ? 'u20' : 'epic',
    theme: type === 'u20_direct_shoot' ? 'u20_national' : 'worldcup_final',
    get title() {
      return CE.luckCfg(type).title;
    },
    get tags() {
      // (a jogada nova não tem a peça da sorte: a bola sobe e cai)
      return CE.luckTags(type).map((s) => s.replace('• A PEÇA DA SORTE', '• A BOLA CAI').replace('• A SORTE', '• A BOLA SOBE'));
    },
    get subs() {
      return CE.luckSubs(type);
    },
    scene(K, S) {
      luckScene(K, S, CE.luckCfg(type));
    },
    overlay(ctx, S, K) {
      luckOverlay(ctx, S, K, CE.luckCfg(type));
    }
  });

  function luckScene(K, S, c) {
    const { t, phase, f } = S;
    const A = atk(false);
    const st = (K.st = {});
    const P = (u, d, z = 0) => pt(A, u, d, z);
    const rivalL = tint(c.rivalRim, 0.3, 1.15);
    const rinL = tint(RIN_C, 0.3, 1.15);
    const youL = tint(CYAN, 0.25, 1.2);
    K.expo(1.0);
    // A jogada (como o dono do jogo pediu): o Sae sai jogando com a bola, dá um chapéu de
    // calcanhar por cima do Rin, os dois correm atrás dela, o Sae tenta a rabona e o Rin
    // bloqueia — a bola sobe; o Aiku pula e não alcança; você chega por trás e chuta.
    const SAE_U = -0.5;
    if (phase === 0) {
      // PLANO 1: o estádio do alto; a grua desce até o lance (o Sae com a bola, o Rin vindo)
      const k = easeIO(seg(t, 6, 140));
      const sd = lerp(1.0, 1.9, ease(t / 140));
      const yd = lerp(10.4, 8.0, ease(t / 140));
      act(K, c.gk, P(0, 0.45), { id: 'gk', face: P(0, 9), frame: 0 });
      act(K, c.defender, P(1.3, lerp(1.2, 1.5, k)), { id: 'df', face: P(SAE_U, sd), anim: 'idle' });
      act(K, c.foes[0], P(-2.2, lerp(3.4, 3.9, k)), { id: 'f0', face: P(0, 12), anim: 'run' });
      act(K, c.foes[1], P(2.6, lerp(3.0, 3.6, k)), { id: 'f1', face: P(0, 12), anim: 'run' });
      act(K, c.mates[0], P(lerp(3.6, 3.0, k), lerp(8.8, 7.6, k)), { id: 'm0', face: P(2.6, 0), anim: 'run' });
      act(K, c.mates[1], P(lerp(2.6, 2.1, k), lerp(9.6, 8.6, k)), { id: 'm1', face: P(1, 0), anim: 'run' });
      act(K, c.rival, P(SAE_U, sd), { id: 'rv', face: P(SAE_U, 12), anim: 'run', light: rivalL });
      ball(K, P(SAE_U + Math.sin(t * 0.4) * 0.04, sd + 0.3, 0.05));
      act(K, c.rin, P(-0.35, lerp(6.4, 5.4, ease(t / 140))), { id: 'rin', face: P(SAE_U, sd), anim: 'run', light: rinL });
      const yp = P(-2.9, yd);
      act(K, c.you, yp, { id: 'y', face: P(-2.4, 0), anim: 'run', light: youL });
      const mk = seg(t, 70, 84);
      ring(K, yp, 0.42, CYAN, mk);
      cam(K, mixP(P(3.4, 13.8, 5.8), P(1.7, 9.8, 2.1), k), mixP(P(0, 6.2, 0), P(-0.9, 4.4, 0.35), k), lerp(52, 46, k));
      st.you = wp([yp[0], yp[1], 1.15]);
      st.mk = mk;
    } else if (phase === 1) {
      // PLANO 2: de lado — o Sae conduz, o Rin vem fechar e leva um chapéu de calcanhar. No
      // chapéu a ação fica em câmera lenta (metade da velocidade) e a câmera gira em volta
      const FL = 84; // o chapéu
      const LAND_T = 114;
      const realT = t;
      // (tempo da ação: normal até 78, metade até 118, normal depois)
      const ta = realT < 78 ? realT : realT < 118 ? 78 + (realT - 78) * 0.5 : 98 + (realT - 118);
      {
      const t = ta;
      const sd = t < FL ? lerp(1.9, 3.2, ease(seg(t, 0, FL))) : 3.2 + seg(t, FL + 6, 140) * 0.95;
      const su = t < FL + 8 ? SAE_U : lerp(SAE_U, -0.85, ease(seg(t, FL + 8, FL + 30)));
      const rd = t < FL ? lerp(5.4, 3.75, easeIO(seg(t, 0, FL))) : 3.75 + seg(t, 106, 140) * 0.45;
      const sAnim = t >= FL - 4 && t < FL + 14 ? 'rabona' : 'run';
      act(K, c.rival, P(su, sd), { id: 'rv', face: P(su, 12), anim: sAnim, opts: sAnim === 'rabona' ? { animTime: (t - FL + 4) * 1.4 } : undefined, light: rivalL });
      // o Rin: corre, a bola passa por cima (ele olha para trás) e vira para correr atrás dela
      const turned = t > 104;
      const rAnim = t < FL + 2 ? 'run' : turned ? 'run' : 'idle';
      act(K, c.rin, P(-0.3, rd), { id: 'rin', face: turned ? P(-0.3, 12) : P(SAE_U, sd), anim: rAnim, light: rinL });
      // a bola: no pé do Sae, depois o arco por cima do Rin e rolando à frente
      let bp;
      if (t < FL) bp = P(SAE_U + Math.sin(t * 0.4) * 0.04, sd + 0.3, 0.05);
      else if (t < LAND_T) {
        const q = seg(t, FL, LAND_T);
        bp = P(lerp(SAE_U, -0.4, q), lerp(3.45, 4.95, q), 0.08 + Math.sin(q * Math.PI) * 1.35);
      } else bp = P(-0.4, 4.95 + seg(t, LAND_T, 140) * 0.18, 0.06);
      ball(K, bp);
      const yp = P(-3.4, lerp(9.8, 8.0, ease(t / 140)));
      act(K, c.you, yp, { id: 'y', face: P(-3.0, 0), anim: 'run', light: youL });
      act(K, c.gk, P(0, 0.45), { id: 'gk', face: P(0, 9), frame: 0 });
      // câmera de lado acompanhando; no chapéu ela gira em volta dos dois e olha a bola subindo
      const mid = (sd + rd) / 2;
      const up = Math.sin(seg(t, FL, LAND_T) * Math.PI);
      const orb = easeIO(seg(realT, 76, 120)) * 0.42;
      const R = 2.45;
      cam(K, shake(K, P(-0.4 + Math.cos(orb) * R, mid + Math.sin(orb) * R, 0.55 + up * 0.3 + orb * 0.5), f, 0.008), P(-0.42, mid, 0.6 + up * 0.55), 48);
      st.you = wp([yp[0], yp[1], 1.15]);
      }
    } else if (phase === 2) {
      // PLANO 3: por trás dos dois correndo atrás da bola (o Sae: "Ainda fraco, Rin.")
      K.expo(0.9);
      const k = seg(t, 0, 130);
      const sp = P(-0.68, lerp(4.15, 5.05, k));
      const rp = P(-0.08, lerp(3.95, 4.95, k));
      act(K, c.rival, sp, { id: 'rv', face: P(-0.68, 12), anim: 'run', light: tint(c.rivalRim, 0.4, 1.2) });
      act(K, c.rin, rp, { id: 'rin', face: P(-0.08, 12), anim: 'run', light: tint(RIN_C, 0.4, 1.2), opts: { expr: 'angry' } });
      ball(K, P(-0.4, lerp(5.13, 5.55, ease(k)), 0.05));
      const vs = 72;
      const sh = t >= vs && t < vs + 24 ? 0.02 * (1 - (t - vs) / 24) : 0.006;
      const md = lerp(4.05, 5.0, k);
      cam(K, shake(K, P(-0.38, md - 1.75, 0.62), f * 2, sh, 4), P(-0.38, md + 1.4, 0.45), 48);
      st.rin = wp([rp[0], rp[1], 0.3]);
      st.rv = wp([sp[0], sp[1], 0.3]);
    } else if (phase === 3) {
      // PLANO 4: câmera baixa — o Sae arma a rabona, o Rin corta na frente e bloqueia: a bola sobe
      const clash = 50;
      const after = Math.max(0, t - clash);
      const k = easeIn(seg(t, 4, clash));
      const back = Math.min(0.35, ease(after / 30) * 0.35);
      // o Sae chega na bola e arma a rabona (virado para o nosso gol)
      const vd = t < clash ? lerp(5.05, 5.45, k) : 5.45 - back;
      const sAnim = t < 26 ? 'run' : 'rabona';
      act(K, c.rival, P(-0.45, vd), { id: 'rv', face: P(-0.4, 12), anim: sAnim, opts: sAnim === 'rabona' ? { animTime: Math.min(60, (t - 26) * 1.1) } : undefined, light: rivalL });
      // o Rin corta por fora e fica na frente da bola (de frente para ele): bloqueia com a perna
      const rk = easeIO(seg(t, 0, clash - 4));
      const rp = t < clash ? P(lerp(0.35, -0.38, rk), lerp(5.2, 5.95, rk)) : P(-0.38, 5.95 + back);
      const rAnim = t < clash - 6 ? 'run' : 'windup';
      act(K, c.rin, rp, { id: 'rin', face: t < clash - 14 ? P(-0.4, 6.4) : P(-0.4, 0), anim: rAnim, frame: rAnim === 'run' ? undefined : 1, light: rinL });
      const bp = t < clash ? P(-0.4, lerp(5.6, 5.68, k), 0.05) : P(lerp(-0.4, 0.25, seg(after, 0, 70)), 5.7 - after * 0.02, 0.2 + after * 0.046);
      ball(K, bp);
      const tilt = easeIO(seg(t, clash + 4, clash + 60));
      const sh = t >= clash ? 0.04 * Math.max(0, 1 - after / 34) : 0.004;
      cam(K, shake(K, P(1.9, 5.75, 0.14), f * 2, sh, 6), P(-0.4, 5.7, lerp(0.5, 2.1, tilt)), 46);
      st.clash = wp(P(-0.4, 5.7, 0.45));
      st.ball = wp(bp);
      st.bp0 = wp(P(-0.35, 5.7, 0.2));
    } else if (phase === 4) {
      // PLANO 5: câmera baixa olhando para cima — a bola sobe do bloqueio, o Aiku pula para
      // cabecear e ela passa por cima dele, depois começa a cair (sem letreiro de sorte)
      const k = easeIO(t / 160);
      const bq = (t - 70) / 70;
      const bp = P(lerp(0.25, 0.32, k), lerp(5.35, 4.15, t / 160), 3.0 - bq * bq * 0.9);
      ball(K, bp, { k: 0.95 });
      // (de lado, de longe: o pulo do Aiku e a bola passando por cima dele no mesmo quadro)
      const ce = P(lerp(-2.7, -2.45, k), lerp(6.95, 6.75, k), 0.5);
      // o Rin e o Sae olhando a bola subir
      [[c.rival, 'rv', P(0.55, 6.55)], [c.rin, 'rin', P(-0.5, 6.75)]].forEach(([ch, id, p]) => act(K, ch, p, { id, face: P(0.35, 4.9), frame: 0, light: FROZEN_L }));
      // o Aiku pula embaixo da bola e não alcança: ela passa por cima da cabeça dele
      const jq = seg(t, 38, 90);
      const ap = P(0.42, 4.8);
      const inAir = jq > 0 && jq < 1;
      act(K, c.defender, ap, { id: 'df', z: Math.sin(jq * Math.PI) * 0.7, face: P(0.28, 6.0), anim: inAir ? 'jump' : 'idle', opts: inAir ? { animTime: jq * 40 } : undefined, light: [0.95, 0.95, 1.05] });
      const yp = P(-1.45, 7.3);
      act(K, c.you, yp, { id: 'y', face: P(0.35, 4.9), frame: 0, light: [1.15, 1.45, 1.45] });
      cam(K, shake(K, ce, f * 0.5, 0.004), P(0.35, 4.9, lerp(1.45, 1.6, k)), 56);
      st.ball = wp(bp);
    } else if (phase === 5) {
      // PLANO 6: o seu rosto no escuro (a faixa dos olhos e as peças vão no overlay)
      K.expo(0.45);
      const yp = P(-0.6, 6.4);
      act(K, c.you, yp, { id: 'y', face: P(-0.6, 0), frame: 1, light: [1.0, 1.5, 1.5] });
      const k = easeIO(t / 140);
      cam(K, P(-0.55, 6.4 - lerp(1.95, 1.75, k), 0.6), P(-0.6, 6.4, 0.56), 32);
    } else if (phase === 6) {
      // PLANO 7: o tempo parou — tudo azul e parado; só você corre (câmera atrás de você)
      K.expo(0.9);
      K.fog('#1e3a8a', 0.05);
      K.sky('#0b1636', '#3b5bab', 0.2);
      const notice = 112;
      act(K, c.rin, P(-0.4, 6.0), { id: 'rin', face: P(-0.4, 0), anim: 'windup', frame: 1, light: FROZEN_L });
      act(K, c.rival, P(-0.4, 5.45), { id: 'rv', face: P(-0.4, 12), anim: 'windup', frame: 1, light: FROZEN_L });
      act(K, c.gk, P(0, 0.45), { id: 'gk', face: P(0, 9), frame: 0, light: FROZEN_L });
      act(K, c.foes[0], P(-2.4, 4.6), { id: 'f0', face: P(-0.4, 6), frame: 0, light: FROZEN_L });
      // a grama suspensa no ar
      for (let i = 0; i < 14; i++) {
        const a = Math.PI + rnd(i, 111) * Math.PI;
        const d = 0.15 + rnd(i, 112) * 0.5;
        const x = GX - 0.4 + Math.cos(a) * d * 1.4;
        const y = 6.6 + 5.72 + Math.sin(i * 1.7) * 0.25;
        const z = 0.25 - Math.sin(a) * d * 0.9;
        K.box({ x0: x - 0.02, y0: y - 0.02, x1: x + 0.02, y1: y + 0.02, z0: z, z1: z + 0.04, color: '#86efac', em: true, alpha: 0.85 });
      }
      const bp = P(LAND[0], LAND[1], 2.3);
      ball(K, bp);
      // o Aiku fica parado olhando (não vai mais na bola)
      const dp = P(1.9, 3.1);
      act(K, c.defender, dp, { id: 'df', face: P(LAND[0], LAND[1]), frame: 0, light: FROZEN_L });
      const q = easeIO(seg(t, 0, 150));
      const yp = P(lerp(1.9, 0.75, q), lerp(9.2, 4.8, q));
      act(K, c.you, yp, { id: 'y', face: P(LAND[0], LAND[1]), anim: 'run', light: [1.3, 1.5, 1.5], opts: { showAura: true, auraColor: CYAN } });
      cam(K, shake(K, [yp[0] + 2.2 * A.sx, yp[1] + 0.3 * A.sy, 0.55], f * 0.5, 0.006), [yp[0] - 0.3 * A.sx, yp[1] - 0.9 * A.sy, 0.5], 46);
      st.def = wp([dp[0], dp[1], 0.95]);
      st.you = wp([yp[0], yp[1], 0.45]);
    } else if (phase === 7) {
      // PLANO 8: câmera no chão — a bola cai, quica alto e volta a subir (você vem correndo)
      const hits = [40];
      let air;
      if (t < 40) air = lerp(2.4, 0, easeIn(t / 40));
      else {
        const q = (t - 40) / 150;
        air = 2.6 * 4 * q * (1 - q);
      }
      const pp = P(LAND[0], LAND[1], 0.12 + air);
      ball(K, pp, { k: 0.95 });
      const yk = easeIn(seg(t, 0, 150));
      const yp = P(lerp(-0.2, 0.1, yk), lerp(9.2, 5.7, yk));
      act(K, c.you, yp, { id: 'y', face: P(LAND[0], LAND[1]), anim: 'run', light: youL });
      const pz = easeIO(seg(t, 96, 150));
      const bump = hits.reduce((m, h) => (t >= h && t < h + 6 ? Math.max(m, 0.012 * (1 - (t - h) / 6)) : m), 0);
      cam(K, shake(K, P(lerp(0.65, 0.5, pz), lerp(2.45, 2.85, pz), lerp(0.1, 0.14, pz)), f * 2, bump, 8), P(LAND[0] - 0.05, LAND[1] + 0.6, lerp(0.42, 0.24, pz)), lerp(44, 38, pz));
      st.piece = wp(pp);
      st.ground = wp(P(LAND[0], LAND[1], 0));
      st.sky = wp(P(LAND[0], LAND[1], 4.5));
    } else if (phase === 8) {
      // PLANO 9: o chute de primeira — a peça vira luz, a bola sai antes do carrinho
      const kick = 40;
      const hold = 6;
      const tt = t < kick ? t : t < kick + hold ? kick : t - hold;
      const after = Math.max(0, tt - kick);
      const yp = t < 24 ? P(lerp(-0.25, 0.15, ease(t / 24)), lerp(6.0, 4.4, ease(t / 24))) : P(0.15, 4.4);
      const an = t < 24 ? 'run' : t < kick ? 'windup' : 'shoot';
      act(K, c.you, yp, { id: 'y', face: P(0.3, 0), anim: an, frame: an === 'run' ? undefined : 1, light: youL, opts: { showAura: true, auraColor: CYAN } });
      const foot = P(0.32, 4.08, 0.1);
      let bp;
      if (tt < kick) {
        const q = tt / kick;
        bp = [lerp(foot[0] + 0.3, foot[0], q), lerp(foot[1] - 0.2, foot[1], q), lerp(3.0, foot[2], q * q)];
      } else bp = P(0.32 + after * 0.004, 4.08 - after * 0.13, 0.1 + after * 0.012);
      ball(K, bp);
      // o Aiku não tenta pegar: fica olhando você chutar
      act(K, c.defender, P(1.7, 3.3), { id: 'df', face: P(0.15, 4.4), frame: 0, light: tint(c.awayRim, 0.2, 1.1) });
      const sh = t >= kick ? 0.035 * Math.max(0, 1 - (t - kick) / 26) : 0.003;
      cam(K, shake(K, P(2.05, 4.65, 0.24), f * 2, sh, 3), P(0.25, 4.2, 0.44), t < kick ? lerp(42, 36, seg(t, 0, kick)) : lerp(36, 39, seg(t, kick, kick + 40)));
      st.foot = wp(foot);
      st.ball = wp(bp);
      if (t >= kick) st.trail = [wp(bp), wp(foot)];
    } else if (phase === 9) {
      // PLANO 10: a câmera colada na bola — o zagueiro e o goleiro ficam pra trás
      ballCamScene(K, S, A, t, {
        from: P(0.36, 3.6, 0.32),
        to: P(0.5, 0.25, 0.8),
        len: 150,
        passers: [
          { who: c.gk, id: 'gk', anim: 'dive', p0: P(1.3, 1.05), p1: P(-1.3, 1.05), t0: 58, t1: 108, z: 0.62 }
        ]
      });
    } else if (phase === 10) {
      // PLANO 11: de dentro do gol — a bola vem e a rede estufa na cara da câmera
      const hit = 34;
      act(K, c.rin, P(1.9, 6.4), { id: 'rin', face: P(0.4, 0), frame: 1, light: rinL });
      act(K, c.defender, P(2.5, 4.2), { id: 'df', face: P(0, 0), frame: 0, light: tint(c.awayRim, 0.2, 1.0) });
      const cel = t > 70;
      const jump = cel ? Math.abs(Math.sin((t - 70) * 0.15)) * 0.12 : 0;
      act(K, c.you, P(0.3, 4.3, jump), { id: 'y', face: P(0.3, 0), anim: cel ? 'celebrate' : 'shoot', frame: cel ? undefined : 1, light: youL });
      act(K, c.gk, P(-0.8, 1.1, 0.02), { id: 'gk', face: P(-3, 1.1), anim: 'dive', light: [0.9, 0.95, 0.9] });
      const from = P(0.3, 3.95, 0.12);
      const to = P(0.12, 0.42, 0.55);
      let bp;
      if (t < hit) {
        const q = t / hit;
        bp = [lerp(from[0], to[0], q), lerp(from[1], to[1], q), lerp(from[2], to[2], Math.sin(q * Math.PI * 0.5))];
      } else bp = [to[0], to[1] - Math.min(0.08, (t - hit) * 0.01) * A.sy, Math.max(0.1, to[2] - easeIn(seg(t, hit + 10, hit + 50)) * 0.45)];
      ball(K, bp);
      const sh = t >= hit ? 0.03 * Math.max(0, 1 - (t - hit) / 30) : 0.002;
      cam(K, shake(K, [GX + 0.22, 6.24, 0.55], f * 2, sh, 2), P(0.05, 5.0, 0.42), 54);
      st.ball = wp(bp);
      st.hitP = wp(to);
    } else if (phase === 11) {
      // PLANO 12: o estádio explode — você no meio, os companheiros pulando
      const orbit = easeIO(t / 140);
      const yp = P(0.2, 5.6);
      const jump = Math.abs(Math.sin(t * 0.1)) * 0.06;
      act(K, c.you, [yp[0], yp[1], jump], { id: 'y', face: P(0.2, 12), anim: 'celebrate', light: youL, opts: { showAura: true, auraColor: CYAN } });
      act(K, c.mates[0], P(1.1, 6.1, Math.abs(Math.sin(t * 0.12 + 1)) * 0.1), { id: 'm0', face: yp, anim: 'celebrate' });
      act(K, c.mates[1], P(-0.8, 6.2, Math.abs(Math.sin(t * 0.13 + 2)) * 0.1), { id: 'm1', face: yp, anim: 'celebrate' });
      const a = lerp(-0.55, 0.45, orbit) + Math.PI / 2;
      const r = lerp(2.0, 2.4, orbit);
      cam(K, shake(K, [yp[0] + Math.cos(a) * r, yp[1] + Math.sin(a) * r * A.sy, 0.42], f, t < 30 ? 0.02 * (1 - t / 30) : 0.003, 5), [yp[0], yp[1], 0.62], 46);
    } else {
      // PLANO 13: a festa lá atrás; o Rin parado na sombra, olhando
      K.expo(0.85);
      const party = [[c.mates[0], 1.2, 4.3, 8], [c.you, 0.4, 4.5, 0], [c.mates[1], -0.4, 4.2, 4]];
      party.forEach(([ch, u, d, ph], i) => act(K, ch, P(u, d, Math.abs(Math.sin(t * 0.14 + ph)) * 0.1), { id: 'pt' + i, face: P(u, 9), anim: 'celebrate', light: ch === c.you ? youL : undefined }));
      const rp = P(-2.2, 7.6);
      act(K, c.rin, rp, { id: 'rin', face: P(-0.9, 9.6), frame: 1, light: [0.42, 0.62, 0.68], opts: { expr: 'angry' } });
      const push = easeIO(seg(t, 0, 150));
      cam(K, P(lerp(-1.45, -1.65, push), lerp(9.55, 9.3, push), 0.6), P(lerp(-1.2, -1.6, push), lerp(6.4, 6.9, push), 0.55), lerp(38, 32, push));
      st.rinTop = wp([rp[0], rp[1], 1.0]);
    }
  }

  function luckOverlay(ctx, S, K, c) {
    const { W, H, t, top, bot, stageH, phase } = S;
    const st = resolve(K, K.st || {});
    const me = CE.cinePlayerName();
    if (phase === 0) {
      for (let i = 0; i < 16; i++) {
        const a = Math.max(0, Math.sin(t * 0.07 + i * 2.3));
        if (a < 0.6) continue;
        CE.cineGlow(ctx, rnd(i, 81) * W, top + 20 + rnd(i, 82) * stageH * 0.3, 10, 'rgba(255,255,255,0.9)', (a - 0.6) * 2.5);
      }
      if (st.mk > 0 && st.you) {
        ctx.save();
        ctx.globalAlpha = st.mk;
        ctx.fillStyle = CYAN;
        ctx.font = '900 13px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`▼ ${me}`, st.you.x, st.you.y - 8);
        ctx.restore();
      }
      CE.luckKicker(ctx, 40, top + 30, c.place, seg(t, 10, 50));
      CE.luckKicker(ctx, 40, top + 58, `${c.minute} • ACRÉSCIMOS`, seg(t, 40, 80), '#facc15');
      CE.luckScore(ctx, c, W - 428, top + 18, c.before[0], c.before[1], c.minute, seg(t, 6, 20));
      if (t > 98) CE.cineImpactText(ctx, 'ÚLTIMO LANCE!', W / 2, bot - 70, 70, '#facc15', seg(t, 98, 110), W * 0.8, -0.04);
      CE.cineSfx(S, 2, 'torcida', () => window.SFX?.whistle?.(1));
    } else if (phase === 1) {
      CE.drawSpeedLines(ctx, W, H, '#e0f2fe', 0.08);
      const mk = seg(t, 84, 96);
      if (mk > 0 && st.you) CE.cineImpactText(ctx, `▼ ${me} • LIVRE`, st.you.x, st.you.y - 20, 22, CYAN, mk, 300, 0);
      CE.luckScore(ctx, c, 28, top + 18, c.before[0], c.before[1], c.minute);
      if (t > 26 && t < 80) CE.cineImpactText(ctx, `O ${c.rivalShort} CONDUZ!`, W * 0.66, top + 84, 54, '#fda4af', seg(t, 26, 36), W * 0.6, -0.06);
      // o chapéu de calcanhar por cima do Rin
      if (t >= 88 && t < 132) CE.cineImpactText(ctx, 'CHAPÉU!', W * 0.5, top + 96, 74, '#f8fafc', seg(t, 88, 96), W * 0.6, -0.08);
    } else if (phase === 2) {
      const vs = 72;
      CE.drawRadialSpeedLines(ctx, W / 2, top + stageH * 0.5, W, '#020617', 0.18);
      const kn = ease(seg(t, 26, 40));
      if (kn > 0) {
        ctx.save();
        ctx.globalAlpha = kn;
        const lx = st.rin ? Math.max(140, Math.min(W - 140, st.rin.x)) : W * 0.2;
        const rx = st.rv ? Math.max(140, Math.min(W - 140, st.rv.x)) : W * 0.8;
        [[Math.min(lx, rx) === lx ? lx : rx, 'RIN ITOSHI', RIN_C], [Math.min(lx, rx) === lx ? rx : lx, c.rivalName, c.rivalRim]].forEach(([x, nm, col]) => {
          ctx.font = 'italic 900 22px "Segoe UI", sans-serif';
          const w = ctx.measureText(nm).width + 34;
          ctx.fillStyle = 'rgba(2,6,23,0.9)';
          ctx.fillRect(x - w / 2, bot - 64, w, 36);
          ctx.fillStyle = col;
          ctx.fillRect(x - w / 2, bot - 64, w, 3);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(nm, x, bot - 45);
        });
        ctx.restore();
      }
      if (t >= vs) {
        const mx = st.rin && st.rv ? (st.rin.x + st.rv.x) / 2 : W / 2;
        const pts = [];
        for (let i = 0; i <= 10; i++) {
          const fq = i / 10;
          pts.push([mx + 40 - fq * 80 + (i && i < 10 ? (i % 2 ? 16 : -16) : 0), lerp(top, bot, fq)]);
        }
        ctx.save();
        ctx.lineJoin = 'miter';
        [['#020617', 14], ['#facc15', 7], ['#ffffff', 3]].forEach(([col, w]) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
        });
        ctx.restore();
        CE.cineGlow(ctx, mx, top + stageH * 0.5, 220, 'rgba(250,204,21,0.45)', 1 - seg(t, vs, vs + 40) * 0.6);
        CE.cineImpactText(ctx, 'VS', mx, top + stageH * 0.36, 150, '#facc15', seg(t, vs, vs + 10), 0, -0.08);
        CE.cineFlash(ctx, W, H, (1 - seg(t, vs, vs + 10)) * 0.45);
      }
      CE.cineSfx(S, vs, 'vs', () => window.SFX?.tackle?.());
    } else if (phase === 3) {
      const clash = 50;
      const after = Math.max(0, t - clash);
      const cp = st.clash || { x: W / 2, y: H * 0.6 };
      if (t >= clash) {
        cyanBurst(ctx, cp.x, cp.y, seg(after, 0, 30), W);
        if (st.ball && st.bp0) CE.luckStreak(ctx, st.bp0.x, st.bp0.y, st.ball.x, st.ball.y + 10, 4, 22, '255,255,255', 0.5);
        if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 50, 'rgba(253,224,71,0.6)');
        const q = after / 40;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - q);
        ctx.lineWidth = 6;
        for (let r = 1; r <= 3; r++) {
          ctx.strokeStyle = r % 2 ? '#f8fafc' : '#facc15';
          ctx.beginPath();
          ctx.ellipse(cp.x, cp.y, after * 10 * r * 0.7 + 20, after * 4 * r * 0.7 + 8, 0, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = 'rgba(134,239,172,0.8)';
        for (let i = 0; i < 18; i++) {
          const a = Math.PI + rnd(i, 91) * Math.PI;
          const d = after * (4 + rnd(i, 92) * 6);
          const gy = cp.y + 60 + Math.sin(a) * d + after * after * 0.12;
          if (gy < bot) ctx.fillRect(cp.x + Math.cos(a) * d, gy, 5, 5);
        }
        if (t < clash + 14) CE.drawRadialSpeedLines(ctx, cp.x, cp.y, W, '#020617', 0.6 * (1 - (t - clash) / 14));
        CE.cineFlash(ctx, W, H, 0.8 * (1 - seg(t, clash, clash + 10)));
        CE.cineImpactText(ctx, 'DOOOM!!', W * 0.5, top + 120, 130, '#f8fafc', seg(t, clash, clash + 8), W * 0.7, -0.08);
      } else if (t < 26) CE.cineImpactText(ctx, `RIN x ${c.rivalShort}`, W / 2, top + 80, 44, '#e2e8f0', seg(t, 14, 24), W * 0.7, -0.04);
      // o Sae arma a rabona (o Rin corta na frente)
      else CE.cineImpactText(ctx, 'RABONA!', W * 0.62, top + 96, 70, '#fda4af', seg(t, 26, 34), W * 0.6, -0.08);
      CE.luckScore(ctx, c, 28, top + 18, c.before[0], c.before[1], c.minute);
      CE.cineSfx(S, clash, 'choque', () => window.SFX?.tackle?.());
    } else if (phase === 4) {
      // (sem o letreiro SORTE: só a bola subindo contra os refletores)
      CE.cineDust(ctx, W, H, t * 0.25, 40, 'rgba(191,219,254,0.6)', 5);
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 90, 'rgba(241,245,249,0.3)', 0.8);
      CE.luckKicker(ctx, 40, top + 30, 'CÂMERA LENTA', seg(t, 8, 30), '#93c5fd');
    } else if (phase === 5) {
      luckEyesRow(ctx, S, c);
    } else if (phase === 6) {
      const notice = 112;
      for (let i = 0; i < 12; i++) CE.cineGlow(ctx, rnd(i, 101) * W, top + 30 + rnd(i, 102) * stageH * 0.25, 12, 'rgba(219,234,254,0.9)', 0.7);
      if (st.you) [0.4, 0.6, 0.8].forEach((q, i) => CE.luckStreak(ctx, st.you.x - 260, st.you.y + 120 - 200 * q, st.you.x - 40, st.you.y + 60 - 120 * q, 2, 9 - i * 2, '0,245,212', 0.5));
      ctx.save();
      ctx.strokeStyle = `rgba(0,245,212,${0.3 + Math.sin(t * 0.12) * 0.12})`;
      ctx.lineWidth = 8;
      ctx.strokeRect(10, top + 10, W - 20, stageH - 20);
      ctx.restore();
      CE.luckKicker(ctx, 40, top + 36, 'O TEMPO PAROU', seg(t, 10, 40), '#93c5fd');
      CE.luckScore(ctx, c, W - 428, top + 18, c.before[0], c.before[1], '⏸ ' + c.minute, 0.85);
    } else if (phase === 7) {
      const hits = [40];
      const pp = st.piece || { x: W / 2, y: H / 2 };
      const gr = st.ground || pp;
      if (t > 60 && st.sky) CE.cineShafts(ctx, gr.x, Math.max(top - 60, st.sky.y), Math.PI / 2, Math.max(100, gr.y - st.sky.y + 40), 0.42, 5, '241,245,249', 0.12 * seg(t, 60, 110), t);
      hits.slice(0, 3).forEach((h, i) => CE.luckGoldBurst(ctx, gr.x, gr.y, seg(t, h, h + 20), 14, 140 - i * 30, 0.35));
      const g = CE.luckGrassCv && CE.luckGrassCv();
      if (g) ctx.drawImage(g, -160, bot - 110, W + 320, 150);
      hits.slice(0, 3).forEach((h, i) => CE.cineSfx(S, h, 'quique' + i, () => window.SFX?.blip?.(660 - i * 120)));
    } else if (phase === 8) {
      const kick = 40;
      const hold = 6;
      const cp = st.foot || { x: W * 0.4, y: H * 0.7 };
      if (t >= kick && st.piece) {
        const q = seg(t, kick, kick + 26);
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * TAU;
          const d = ease(q) * (90 + rnd(i, 121) * 120);
          ctx.fillStyle = `rgba(253,224,71,${1 - q})`;
          ctx.fillRect(st.piece.x + Math.cos(a) * d, st.piece.y + Math.sin(a) * d * 0.6, 6, 6);
        }
        CE.cineGlow(ctx, st.piece.x, st.piece.y, 160, 'rgba(253,224,71,0.8)', 1 - q);
      }
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 50, t < kick ? 'rgba(253,224,71,0.5)' : 'rgba(0,245,212,0.6)');
      if (t >= kick && st.ball) CE.luckStreak(ctx, cp.x, cp.y, st.ball.x - 10, st.ball.y, 6, 34, '0,245,212', 0.85);
      if (t >= kick && t < kick + 30) {
        ctx.save();
        ctx.globalAlpha = 1 - (t - kick) / 30;
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 6;
        for (let r = 1; r <= 2; r++) {
          ctx.beginPath();
          ctx.ellipse(cp.x, cp.y, (t - kick) * 8 * r + 20, (t - kick) * 4 * r + 10, -0.2, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (t >= kick && t < kick + hold + 10) CE.drawRadialSpeedLines(ctx, cp.x, cp.y, W, '#020617', 0.55);
      CE.cineFlash(ctx, W, H, t >= kick ? 0.85 * (1 - seg(t, kick, kick + 9)) : 0);
      if (t >= kick) CE.cineImpactText(ctx, 'DOM!!', W * 0.76, top + 130, 140, '#f8fafc', seg(t, kick, kick + 8), W * 0.5, -0.12);
      if (t > 66) CE.cineImpactText(ctx, 'CHUTE DIRETO!', W * 0.3, top + 80, 56, CYAN, seg(t, 66, 76), W * 0.5, -0.06);
      CE.cineSfx(S, kick, 'chute', () => window.SFX?.kick?.(1));
    } else if (phase === 9) {
      CE.drawSpeedLines(ctx, W, H, '#e0f2fe', 0.3);
      CE.drawSpeedLines(ctx, W, H, CYAN, 0.15);
      if (st.trail) {
        CE.ptdStreak(ctx, st.trail, CYAN, 80, 0.55);
        CE.ptdStreak(ctx, st.trail, '#ffffff', 36, 0.6);
      }
      if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 150, 'rgba(0,245,212,0.5)');
      if (t > 76) CE.cineImpactText(ctx, `${c.gkShort} NÃO ALCANÇA!`, W / 2, bot - 60, 50, '#facc15', seg(t, 76, 86), W * 0.8, -0.04);
      CE.cineSfx(S, 4, 'vento', () => window.SFX?.whoosh?.());
      CE.cineSfx(S, 70, 'luva', () => window.SFX?.whoosh?.());
    } else if (phase === 10) {
      const hit = 34;
      const hp = st.hitP || { x: W * 0.6, y: top + stageH * 0.36 };
      const hx = hp.x;
      const hy = hp.y;
      if (st.ball && t < hit) CE.cineGlow(ctx, st.ball.x, st.ball.y, 60, 'rgba(0,245,212,0.5)');
      // as traves (de trás), em primeiro plano
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(40, top + 20, 26, bot - top);
      ctx.fillRect(W - 66, top + 20, 26, bot - top);
      ctx.fillRect(40, top + 20, W - 80, 22);
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.fillRect(58, top + 42, 8, bot - top);
      ctx.fillRect(W - 48, top + 42, 8, bot - top);
      ctx.fillRect(40, top + 36, W - 80, 6);
      // a rede em primeiro plano, estufando em volta do impacto
      const Am = t >= hit ? Math.sin((t - hit) * 0.28) * Math.exp(-(t - hit) / 30) * 0.9 + 0.35 * Math.exp(-(t - hit) / 60) : 0;
      const sig2 = 2 * 210 * 210;
      const np = (x, y) => {
        if (!Am) return [x, y];
        const dx = x - hx;
        const dy = y - hy;
        const m = 1 + Am * Math.exp(-(dx * dx + dy * dy) / sig2);
        return [hx + dx * m, hy + dy * m];
      };
      ctx.save();
      ctx.strokeStyle = 'rgba(241,245,249,0.42)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const step = 46;
      for (let gx = -2; gx <= W / step + 2; gx++) {
        for (let gy = -1; gy <= stageH / step + 2; gy++) {
          const x = gx * step + (gy % 2) * step * 0.5;
          const y = top + gy * step;
          const p0 = np(x, y);
          const p1 = np(x + step * 0.5, y + step);
          const p2 = np(x - step * 0.5, y + step);
          ctx.moveTo(p0[0], p0[1]);
          ctx.lineTo(p1[0], p1[1]);
          ctx.moveTo(p0[0], p0[1]);
          ctx.lineTo(p2[0], p2[1]);
        }
      }
      ctx.stroke();
      ctx.restore();
      if (t >= hit && t < hit + 30) {
        const q = (t - hit) / 30;
        ctx.save();
        ctx.globalAlpha = 1 - q;
        ctx.lineWidth = 5;
        for (let r = 1; r <= 3; r++) {
          ctx.strokeStyle = r % 2 ? CYAN : '#facc15';
          ctx.beginPath();
          ctx.arc(hx, hy, (t - hit) * 6 * r + 30, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (t > hit + 20) CE.drawConfetti(ctx, W, H, t - hit, 60);
      CE.cineFlash(ctx, W, H, t >= hit ? 0.8 * (1 - seg(t, hit, hit + 9)) : 0);
      CE.luckKinetic(ctx, 'GOOOOOL!!', W / 2, top + stageH * 0.62, 120, CYAN, t, hit + 8, 3, -0.06);
      const flipped = t > hit + 30;
      CE.luckScore(ctx, c, 28, top + 18, flipped ? c.after[0] : c.before[0], flipped ? c.after[1] : c.before[1], flipped ? 'FIM DE JOGO' : c.minute, 1, flipped ? Math.max(0, 1 - (t - hit - 30) / 40) + 0.2 : 0);
      CE.cineSfx(S, hit, 'gol', () => window.SFX?.goal?.(true));
    } else if (phase === 11) {
      const hz = top + stageH * 0.3;
      if (t < 60) CE.cineGlow(ctx, W / 2, hz, 260 + t * 8, 'rgba(254,249,195,0.5)', 1 - t / 60);
      const fw = [[220, 60, 4], [980, 40, 12], [620, 20, 24], [380, 90, 38], [1120, 100, 50], [760, 70, 62], [160, 40, 74], [1000, 60, 86], [480, 50, 98], [1180, 80, 108], [300, 110, 118], [860, 30, 126]];
      fw.forEach(([x, y, at], i) => CE.luckFirework(ctx, (x / 1280) * W, top + y, t - at, ['#facc15', c.crowd[0], '#f8fafc', CYAN][i % 4], 24, 110 + (i % 3) * 26));
      CE.drawConfetti(ctx, W, H, t + 120, 90);
      CE.luckFans(ctx, W, bot + 40, t, 1.15, 'rgba(125,211,252,0.7)', 3);
      const dkk = seg(t, 40, 60);
      if (dkk > 0) CE.cineGradient(ctx, 0, top, W, 250, [[0, `rgba(1,3,11,${0.8 * dkk})`], [0.7, `rgba(1,3,11,${0.45 * dkk})`], [1, 'rgba(1,3,11,0)']]);
      CE.cineTitleCard(ctx, W, top + 92, seg(t, 46, 78), { kicker: c.kicker, title: c.bigTitle, sub: '', color: CYAN });
      const ks = ease(seg(t, 70, 90));
      if (ks > 0) {
        ctx.save();
        ctx.globalAlpha = ks;
        ctx.font = 'italic 900 30px "Segoe UI", sans-serif';
        const txt = `${c.home}  ${c.after[0]} x ${c.after[1]}  ${c.away}`;
        const w = ctx.measureText(txt).width + 50;
        ctx.fillStyle = 'rgba(2,6,23,0.88)';
        ctx.fillRect(W / 2 - w / 2, top + 170, w, 48);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(W / 2 - w / 2, top + 170, w, 3);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(txt, W / 2, top + 195);
        ctx.restore();
      }
      if (t >= 46) CE.cineFlash(ctx, W, H, (1 - seg(t, 46, 58)) * 0.4);
      CE.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
    } else {
      CE.drawConfetti(ctx, W, H, t + 300, 30);
      // o lado do Rin fica na sombra e uma luz ciano fraca começa a pulsar nele
      const ak = seg(t, 50, 120);
      const shade = ctx.createLinearGradient(0, 0, W * 0.6, 0);
      shade.addColorStop(0, 'rgba(1,6,10,0.7)');
      shade.addColorStop(1, 'rgba(1,6,10,0)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, top, W, stageH);
      if (ak > 0 && st.rinTop) CE.cineGlow(ctx, st.rinTop.x, st.rinTop.y + 40, 220, 'rgba(34,211,238,0.25)', ak * (0.7 + 0.3 * Math.sin(t * 0.15)));
      // faixa de mangá: os olhos do Rin, de perto
      const ke = ease(seg(t, 96, 112));
      if (ke > 0) {
        const y0 = top + stageH * 0.64;
        CE.cinePanel(ctx, [[W * 0.42, y0], [W - 24, y0 - 30], [W - 24, y0 + 120], [W * 0.42, y0 + 150]], () => {
          ctx.fillStyle = '#010409';
          ctx.fillRect(W * 0.4, y0 - 40, W * 0.6, 200);
          const dw = 640;
          const U = dw / 14;
          CE.luckBand(ctx, c.rin, W * 0.71 - dw / 2, y0 + 60 - 3.1 * U, dw, { ring: RIN_C, iris: '#0f766e', angry: true, tiny: true, look: 1 });
          ctx.fillStyle = 'rgba(2,24,30,0.3)';
          ctx.fillRect(W * 0.4, y0 - 40, W * 0.6, 200);
        }, { dx: (1 - ke) * W * 0.6 });
      }
    }
  }

  // PLANO 6: a faixa dos seus olhos e as peças do quebra-cabeça se montando (EGO, RIN,
  // BOLA, [?], GOL) por cima do close no escuro
  function luckEyesRow(ctx, S, c) {
    const { W, t, top, bot, stageH } = S;
    const rowY = top + stageH * 0.74;
    CE.cineGlow(ctx, W / 2, rowY, 420, 'rgba(0,245,212,0.14)', 1);
    const beat = 1 + Math.pow(Math.max(0, Math.sin(t * 0.2)), 12) * 0.02;
    const b0 = top + 16;
    const b1 = top + 196;
    const kb = ease(seg(t, 0, 14));
    ctx.save();
    ctx.translate(W / 2, (b0 + b1) / 2);
    ctx.scale(beat, beat);
    ctx.translate(-W / 2, -(b0 + b1) / 2);
    CE.cinePanel(ctx, [[20, b0], [W - 20, b0], [W - 20, b1], [20, b1]], () => {
      ctx.fillStyle = '#04111a';
      ctx.fillRect(0, b0, W, b1 - b0);
      const dw = 700 + easeIO(t / 140) * 60;
      const U = dw / 14;
      const e = CE.luckBand(ctx, c.you, W / 2 - dw / 2, (b0 + b1) / 2 - 3.1 * U, dw, { ring: c.you.eyeColor || '#ef4444', look: 0, tiny: t > 100 });
      const gl = ease(seg(t, 20, 70));
      if (gl > 0 && e) {
        CE.luckStreak(ctx, e.rx + 2.4 * U + gl * 520, e.ly - 0.4 * U, e.rx + 2.2 * U, e.ly, 2, 14, '0,245,212', 0.9);
        CE.luckStreak(ctx, e.lx - 2.4 * U - gl * 520, e.ly - 0.4 * U, e.lx - 2.2 * U, e.ly, 2, 14, '0,245,212', 0.9);
        CE.cineGlow(ctx, e.rx, e.ly, 90, 'rgba(0,245,212,0.45)', gl);
        CE.cineGlow(ctx, e.lx, e.ly, 90, 'rgba(0,245,212,0.45)', gl);
      }
      ctx.fillStyle = 'rgba(0,40,60,0.18)';
      ctx.fillRect(0, b0, W, b1 - b0);
    }, { dx: (1 - kb) * -W });
    ctx.restore();
    const sz = 90;
    const gap = 124;
    const pieces = [
      { label: 'EGO', pal: PAL.cyan, at: 20, from: [-200, top + 40] },
      { label: 'RIN', pal: PAL.teal, at: 34, from: [W + 200, top + 60] },
      { label: 'BOLA', pal: PAL.white, at: 48, from: [-200, bot + 100] },
      { slot: true, at: 18 },
      { label: 'GOL', pal: PAL.blue, at: 62, from: [W + 200, bot + 100] }
    ];
    pieces.forEach((p, i) => {
      const x = W / 2 + (i - 2) * gap;
      if (p.slot) {
        CE.luckSlot(ctx, x, rowY, sz, seg(t, p.at, p.at + 12), t);
        if (t > 80) CE.cineGlow(ctx, x, rowY, 110, 'rgba(253,224,71,0.4)', 0.5 + 0.4 * Math.sin(t * 0.15));
        return;
      }
      const k = ease(seg(t, p.at, p.at + 22));
      if (k <= 0) return;
      const px = lerp(p.from[0], x, k);
      const py = lerp(p.from[1], rowY, k) + (k >= 1 ? Math.sin(t * 0.08 + i) * 2 : 0);
      CE.luckPiece(ctx, px, py, sz, (1 - k) * 8, (1 - k) * (i % 2 ? 1 : -1) * 1.2, p.label, p.pal, k >= 1 ? 0.35 : 0, seg(t, p.at + 22, p.at + 40));
      if (t >= p.at + 22 && t < p.at + 34) CE.cineGlow(ctx, x, rowY, 90, 'rgba(255,255,255,0.7)', 1 - (t - p.at - 22) / 12);
    });
    if (t > 104) CE.cineImpactText(ctx, 'SOU EU.', W / 2, bot - 34, 60, CYAN, seg(t, 104, 114), W * 0.6, -0.05);
    [20, 34, 48, 62].forEach((a, i) => CE.cineSfx(S, a + 22, 'peca' + i, () => window.SFX?.blip?.(440 + i * 110)));
  }

  // o mesmo filme para os dois jogos (como na versão 2D)
  ['u20_direct_shoot', 'u20_final_goal'].forEach((type) => reg(type, luckDef(type)));
})();
