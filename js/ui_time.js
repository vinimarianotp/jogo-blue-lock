// ============================================================================
// ui_time.js — visual "cutscene" das abas TREINOS, CONQUISTAS e OBJETIVOS
// (mesma linguagem da aba ATRIBUTOS: navy escuro, painéis de cantos cortados com
// borda neon, tipografia itálica pesada, linhas de velocidade e granulação).
// Sobrescreve App.renderTrainingTab e App.renderAchievementsAndObjectives mantendo
// os mesmos dados, handlers (App.executeTraining) e ids (#training-drills-grid,
// #achievements-grid, #objectives-grid). Estilos em css/ui_time.css.
// ============================================================================
(function () {
  const App = window.App;
  if (!App) return;

  const BOLT = '<svg class="tm-bolt" viewBox="0 0 10 16" aria-hidden="true"><path d="M6.4 0 0.8 9.2h3.6L3.2 16 9.2 6.4H5.6z"/></svg>';
  const LOCK = '<svg viewBox="0 0 12 14" aria-hidden="true"><path d="M3 6V4a3 3 0 0 1 6 0v2h1.2c.4 0 .8.4.8.8v6.4c0 .4-.4.8-.8.8H1.8c-.4 0-.8-.4-.8-.8V6.8c0-.4.4-.8.8-.8zm1.6 0h2.8V4a1.4 1.4 0 0 0-2.8 0z"/></svg>';
  const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.2 11.6 2.4 7.8 1 9.2l5.2 5.2L15 5.6l-1.4-1.4z"/></svg>';

  const CAT_COLORS = { 'FÍSICO': '#00f5d4', 'TÉCNICA': '#3b82f6', 'MENTAL': '#a78bfa', 'SINERGIA': '#f472b6' };
  const catColor = (c) => CAT_COLORS[String(c || '').toUpperCase()] || '#00f5d4';
  const pad2 = (n) => String(n).padStart(2, '0');

  // Rótulo e cor de cada atributo (mesmas categorias/cores da aba ATRIBUTOS)
  const statInfo = (key) => {
    for (const cat of App.ATTR_CATEGORIES || []) {
      const it = cat.items.find((x) => x.key === key);
      if (it) return { label: it.label, color: key === 'ego' ? '#ef4444' : cat.color };
    }
    return { label: key, color: '#00f5d4' };
  };

  // Entrada ao abrir a aba: classe temporária (animações rodam UMA vez)
  const playIntro = (el, cls) => {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    clearTimeout(el._tmIntroT);
    el._tmIntroT = setTimeout(() => el.classList.remove(cls), 1600);
  };

  const hexA = (hex, a) => {
    const h = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (!h) return `rgba(0,245,212,${a})`;
    const n = parseInt(h[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // Gerador pseudoaleatório com semente: o desenho é sempre igual (nada pisca ao redesenhar)
  const rng = (seed) => {
    let s = seed % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  };

  const findMentors = (mentorStr) => {
    const chars = window.BLUE_LOCK_CHARACTERS || [];
    return String(mentorStr || '')
      .split('&')
      .map((n) => n.trim().toLowerCase())
      .map((n) => chars.find((c) => c.name.toLowerCase() === n) || chars.find((c) => c.name.toLowerCase().split(' ').includes(n)))
      .filter(Boolean);
  };

  // ==========================================================================
  // ARTE DOS TREINOS (canvas): campo em perspectiva, linhas de velocidade,
  // silhueta do mentor ao fundo e o SEU jogador fazendo o exercício
  // ==========================================================================
  function playerLook(app) {
    const pr = app.state.profile;
    return {
      skinColor: pr.skinColor,
      hairColor: pr.hairColor,
      hairSecondary: pr.hairSecondary,
      eyeColor: pr.eyeColor,
      eyeStyle: pr.eyeStyle,
      hairStyle: pr.hairStyle,
      jerseyPrimary: '#0f2942',
      jerseySecondary: '#1d4ed8',
      number: pr.number
    };
  }

  function drawSprite(ctx, look, x, feetY, size, opts) {
    const PR = window.PixelRenderer;
    if (!PR) return;
    const s = size / 36;
    ctx.save();
    ctx.translate(Math.round(x - size / 2), Math.round(feetY - 31.4 * s));
    PR.drawCharacterSprite(ctx, look, size, size, opts);
    ctx.restore();
  }

  // Jogador com brilho e rim light na cor da categoria (igual à vitrine dos ATRIBUTOS)
  function drawHero(ctx, look, x, feetY, size, col, opts) {
    const s = size / 36;
    const rim = Math.max(1, Math.round(s * 0.6));
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = Math.round(2.4 * s);
    ctx.globalAlpha = 0.8;
    drawSprite(ctx, look, x, feetY, size, Object.assign({}, opts, { tint: col }));
    ctx.restore();
    drawSprite(ctx, look, x - rim, feetY, size, Object.assign({}, opts, { tint: col }));
    drawSprite(ctx, look, x + rim, feetY - Math.round(rim / 2), size, Object.assign({}, opts, { tint: '#e8fffb' }));
    drawSprite(ctx, look, x, feetY, size, opts);
  }

  function floorGlow(ctx, x, y, r, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.26);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, hexA(col, 0.55));
    g.addColorStop(0.55, hexA(col, 0.16));
    g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexA(col, 0.55);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function paintDrillArt(app, cv, dr, col, idx) {
    const W = cv.clientWidth | 0;
    const H = cv.clientHeight | 0;
    if (W < 4 || H < 4) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pr = app.state.profile;
    const key = [W, H, dpr, pr.hairStyle, pr.hairColor, pr.hairSecondary, pr.eyeColor, pr.eyeStyle, pr.skinColor, pr.number, (app.state.equippedAccessories || []).join(',')].join('|');
    if (cv._tmKey === key) return;
    cv._tmKey = key;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const rand = rng(97 + idx * 131);

    // fundo
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0f2147');
    bg.addColorStop(0.5, '#0a1530');
    bg.addColorStop(1, '#03070f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const hz = H * 0.5;
    const vpx = W * 0.56;
    const glow = ctx.createRadialGradient(vpx, hz, 0, vpx, hz, Math.max(W, H) * 0.75);
    glow.addColorStop(0, hexA(col, 0.32));
    glow.addColorStop(0.45, hexA(col, 0.08));
    glow.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // faixa diagonal de mangá
    ctx.save();
    ctx.translate(W / 2, H * 0.42);
    ctx.rotate(-0.24);
    const band = ctx.createLinearGradient(-W, 0, W, 0);
    band.addColorStop(0, hexA(col, 0));
    band.addColorStop(0.35, hexA(col, 0.1));
    band.addColorStop(0.65, hexA(col, 0.1));
    band.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = band;
    ctx.fillRect(-W, -H * 0.12, W * 2, H * 0.24);
    ctx.fillStyle = hexA(col, 0.3);
    ctx.fillRect(-W, -H * 0.12, W * 2, 1);
    ctx.restore();

    // gramado em perspectiva
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, hz, W, H - hz);
    ctx.clip();
    const floor = ctx.createLinearGradient(0, hz, 0, H);
    floor.addColorStop(0, 'rgba(6, 14, 32, 0.2)');
    floor.addColorStop(1, 'rgba(4, 10, 22, 0.85)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, hz, W, H - hz);
    ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i++) {
      const xb = vpx + i * W * 0.22;
      ctx.strokeStyle = hexA(col, i === 0 ? 0.26 : 0.13);
      ctx.beginPath();
      ctx.moveTo(vpx + (xb - vpx) * 0.04, hz);
      ctx.lineTo(xb, H);
      ctx.stroke();
    }
    for (let k = 1; k <= 9; k++) {
      const y = hz + (H - hz) * Math.pow(k / 9, 2.1);
      ctx.strokeStyle = hexA(col, 0.05 + (k / 9) * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();
    // brilho do horizonte
    ctx.fillStyle = hexA(col, 0.35);
    ctx.fillRect(0, Math.round(hz), W, 1);

    // linhas de velocidade (fixas)
    ctx.save();
    ctx.translate(W, 0);
    ctx.rotate(Math.PI * 0.16);
    for (let i = 0; i < 26; i++) {
      const y = rand() * H * 1.4 - H * 0.2;
      const len = W * (0.25 + rand() * 0.6);
      const x = -W * 1.2 + rand() * W * 0.6;
      ctx.fillStyle = i % 5 === 0 ? hexA(col, 0.16) : `rgba(255,255,255,${0.025 + rand() * 0.05})`;
      ctx.fillRect(x, y, len, i % 4 === 0 ? 2 : 1);
    }
    ctx.restore();

    const mentors = findMentors(dr.mentor);
    const look = playerLook(app);
    const acc = app.state.equippedAccessories;
    const unit = Math.max(1.5, Math.floor((H * 0.5) / 36 * 2) / 2);
    const heroSize = 36 * unit;
    const feetY = Math.round(H * 0.9);

    // silhueta gigante do mentor ao fundo
    const ghost = mentors[mentors.length > 1 && dr.id === 'train_chemical' ? 1 : 0] || mentors[0];
    if (ghost) {
      // sombra escura com contorno neon (o "mentor observando" dos painéis de mangá)
      const gSize = Math.round((H * 0.9) / 36) * 36;
      const gx = W * 0.74;
      const gy = H * 1.0;
      const o = Math.max(2, Math.round(gSize / 36 * 0.5));
      const gOpts = { facing: 'front', frame: 4 };
      ctx.save();
      ctx.globalAlpha = 0.55;
      [[-o, 0], [o, 0], [0, -o]].forEach(([dx, dy]) => drawSprite(ctx, ghost, gx + dx, gy + dy, gSize, Object.assign({ tint: col }, gOpts)));
      ctx.globalAlpha = 1;
      drawSprite(ctx, ghost, gx, gy, gSize, Object.assign({ tint: '#071026' }, gOpts));
      ctx.globalAlpha = 0.1;
      drawSprite(ctx, ghost, gx, gy, gSize, gOpts);
      ctx.restore();
      // apaga a base da silhueta para ela "sumir" no chão
      const fade = ctx.createLinearGradient(0, H * 0.62, 0, H);
      fade.addColorStop(0, 'rgba(3,7,15,0)');
      fade.addColorStop(1, 'rgba(3,7,15,0.85)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, H * 0.62, W, H * 0.38);
    }

    ctx.save();
    ctx.lineCap = 'round';
    if (dr.id === 'train_physical') {
      // anéis de sprint de pé no campo, sumindo no horizonte
      const rings = [0.12, 0.3, 0.52, 0.78];
      rings.forEach((t, i) => {
        const x = W * 0.38 + (vpx + W * 0.1 - W * 0.38) * t + W * 0.28 * (1 - t);
        const yb = feetY + (hz + 6 - feetY) * t;
        const r = H * 0.24 * (1 - t * 0.78);
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 12 * (1 - t * 0.6);
        ctx.strokeStyle = i === 0 ? '#ffffff' : hexA(col, 0.95 - t * 0.5);
        ctx.lineWidth = Math.max(1.5, 5 * (1 - t * 0.7));
        ctx.beginPath();
        ctx.ellipse(x, yb - r, r * 0.42, r, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
      // rastro do sprint
      for (let i = 0; i < 7; i++) {
        const y = feetY - heroSize * (0.25 + i * 0.075);
        const len = W * (0.18 + rand() * 0.16);
        const g = ctx.createLinearGradient(W * 0.3 - len, 0, W * 0.3, 0);
        g.addColorStop(0, hexA(col, 0));
        g.addColorStop(1, hexA(col, 0.55));
        ctx.fillStyle = g;
        ctx.fillRect(W * 0.3 - len, y, len, i % 2 ? 2 : 3);
      }
      floorGlow(ctx, W * 0.36, feetY, heroSize * 0.42, col);
      drawHero(ctx, look, W * 0.36, feetY, heroSize, col, { facing: 'side', animState: 'run', frame: 4, accessories: acc, shirtNumber: look.number });
    } else if (dr.id === 'train_shooting') {
      // gol ao fundo com rede e alvos dourados nos ângulos
      const gw = W * 0.62;
      const gh = H * 0.2;
      const gx = vpx - gw / 2;
      const gy = hz + 4 - gh;
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.16)';
      ctx.lineWidth = 1;
      for (let x = gx; x <= gx + gw; x += gw / 14) {
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + (x - vpx) * 0.08, hz + 4); ctx.stroke();
      }
      for (let y = gy; y <= hz + 4; y += gh / 6) {
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
      }
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx, hz + 4); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy); ctx.lineTo(gx + gw, hz + 4);
      ctx.stroke();
      ctx.restore();
      const targets = [[gx + gw * 0.12, gy + gh * 0.22], [gx + gw * 0.88, gy + gh * 0.22], [gx + gw * 0.12, gy + gh * 0.78], [gx + gw * 0.88, gy + gh * 0.78]];
      targets.forEach(([x, y], i) => {
        const r = gh * 0.2;
        ctx.save();
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 10;
        ctx.fillStyle = i === 1 ? 'rgba(250, 204, 21, 0.4)' : 'rgba(250, 204, 21, 0.14)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      });
      // trajetória da bola até o ângulo
      const bx = W * 0.5;
      const by = feetY - heroSize * 0.08;
      const [tx, ty] = targets[1];
      ctx.save();
      ctx.setLineDash([2, 7]);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(W * 0.92, H * 0.5, tx, ty);
      ctx.stroke();
      ctx.restore();
      const trail = ctx.createLinearGradient(W * 0.3, by, bx, by);
      trail.addColorStop(0, hexA(col, 0));
      trail.addColorStop(1, hexA(col, 0.7));
      ctx.fillStyle = trail;
      ctx.fillRect(W * 0.3, by - 3, bx - W * 0.3, 6);
      floorGlow(ctx, W * 0.32, feetY, heroSize * 0.42, col);
      drawHero(ctx, look, W * 0.32, feetY, heroSize, col, { facing: 'side', animState: 'shoot', frame: 2, accessories: acc, shirtNumber: look.number });
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(bx, by, Math.max(4, unit * 2.2), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (dr.id === 'train_mental') {
      // prancheta holográfica flutuando: campo, X e O e setas
      ctx.save();
      ctx.translate(W * 0.6, H * 0.3);
      ctx.transform(1, 0, -0.32, 0.62, 0, 0);
      const bw = W * 0.62;
      const bh = H * 0.42;
      ctx.shadowColor = col;
      ctx.shadowBlur = 16;
      ctx.fillStyle = hexA(col, 0.08);
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      ctx.strokeStyle = hexA(col, 0.9);
      ctx.lineWidth = 2;
      ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = hexA(col, 0.45);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, -bh / 2); ctx.lineTo(0, bh / 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, bh * 0.16, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeRect(-bw / 2, -bh * 0.22, bw * 0.13, bh * 0.44);
      ctx.strokeRect(bw / 2 - bw * 0.13, -bh * 0.22, bw * 0.13, bh * 0.44);
      const pts = [[-0.32, -0.25], [-0.2, 0.2], [-0.05, -0.05], [0.12, 0.28]];
      pts.forEach(([px, py]) => {
        const x = px * bw;
        const y = py * bh;
        ctx.strokeStyle = '#e6fffb';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke();
      });
      [[0.22, -0.18], [0.3, 0.1], [0.36, -0.32]].forEach(([px, py]) => {
        const x = px * bw;
        const y = py * bh;
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke();
      });
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-0.2 * bw, 0.2 * bh);
      ctx.quadraticCurveTo(0.02 * bw, 0.42 * bh, 0.12 * bw, 0.28 * bh);
      ctx.moveTo(-0.05 * bw, -0.05 * bh);
      ctx.quadraticCurveTo(0.18 * bw, -0.45 * bh, 0.42 * bw, -0.05 * bh);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(0.42 * bw + 2, -0.05 * bh); ctx.lineTo(0.42 * bw - 8, -0.05 * bh - 7); ctx.lineTo(0.42 * bw - 9, -0.05 * bh + 5);
      ctx.fill();
      ctx.restore();
      // feixe da prancheta até o jogador
      const beam = ctx.createLinearGradient(0, H * 0.4, 0, feetY);
      beam.addColorStop(0, hexA(col, 0.2));
      beam.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(W * 0.42, H * 0.42); ctx.lineTo(W * 0.66, H * 0.42); ctx.lineTo(W * 0.5, feetY - heroSize * 0.7); ctx.lineTo(W * 0.3, feetY - heroSize * 0.7);
      ctx.fill();
      floorGlow(ctx, W * 0.38, feetY, heroSize * 0.42, col);
      drawHero(ctx, look, W * 0.38, feetY, heroSize, col, { facing: 'front', frame: 4, accessories: acc, shirtNumber: look.number });
    } else {
      // 2v1 de química: você e o parceiro ligados por um elo de luz
      const partner = mentors[0];
      const ax = W * 0.3;
      const bxp = W * 0.74;
      const fy2 = feetY - H * 0.1;
      const pSize = Math.round(heroSize * 0.82 / 36) * 36 || heroSize;
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = hexA(col, 0.9);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax + heroSize * 0.1, feetY - heroSize * 0.55);
      ctx.bezierCurveTo(W * 0.42, H * 0.18, W * 0.62, H * 0.18, bxp - pSize * 0.1, fy2 - pSize * 0.6);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      // bola no meio do elo
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(W * 0.52, H * 0.25, Math.max(4, unit * 2.2), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (partner) {
        floorGlow(ctx, bxp, fy2, pSize * 0.4, col);
        drawSprite(ctx, partner, bxp, fy2, pSize, { facing: 'side', animState: 'run', frame: 1, flipX: true });
      }
      floorGlow(ctx, ax, feetY, heroSize * 0.42, col);
      drawHero(ctx, look, ax, feetY, heroSize, col, { facing: 'side', animState: 'run', frame: 4, accessories: acc, shirtNumber: look.number });
    }
    ctx.restore();

    // vinheta
    const vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, 'rgba(3,6,14,0.55)');
    vg.addColorStop(0.18, 'rgba(3,6,14,0)');
    vg.addColorStop(0.82, 'rgba(3,6,14,0)');
    vg.addColorStop(1, 'rgba(3,6,14,0.7)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // ==========================================================================
  // CONQUISTAS: ícone e "raridade" de cada uma
  // ==========================================================================
  const ACH_GLYPH = {
    ach_prologue: '⚽', ach_first_spin: '🎰', ach_yukimiya_style: '⚡', ach_chem_shidou: '💥', ach_u20_win: '🗾',
    ach_nel_unlock: '⚔️', ach_england_u20: '🦁', ach_four_egos: '🌍', ach_first_goal: '⚽', ach_goals_10: '🥅',
    ach_goals_25: '🐺', ach_goals_50: '🔥', ach_hat_trick: '🎩', ach_angle_5: '🎯', ach_long_3: '💣',
    ach_dribble_30: '🌀', ach_steal_20: '🛡️', ach_wins_10: '🏅', ach_rating_9: '⭐', ach_legendary: '💎',
    ach_world_class_pull: '👑', ach_lucky: '🍀', ach_rank_s: 'T:S', ach_rank_wc: 'T:WC', ach_nel_champion: '🏆',
    ach_top23: 'T:23', ach_most_valuable: '💰', ach_monster: '👹', ach_secrets: '🥚', ach_pro_champion: '🏆', ach_ballon_dor: '🥇',
    ach_world_cup: '🏆'
  };
  const achTier = (a) =>
    a.rewardCoins >= 800 ? { name: 'LENDÁRIA', color: '#00f5d4' }
      : a.rewardCoins >= 400 ? { name: 'OURO', color: '#facc15' }
      : a.rewardCoins >= 200 ? { name: 'PRATA', color: '#cbd5e1' }
      : { name: 'BRONZE', color: '#f59e0b' };

  // Barra segmentada inclinada (igual às barras dos ATRIBUTOS)
  const segBar = (cur, goal, cls = '') => {
    const pct = Math.max(0, Math.min(100, goal > 0 ? (cur / goal) * 100 : 0));
    return `<div class="tm-bar ${cls}"><div class="tm-bar-track"></div><div class="tm-bar-glow"><div class="tm-bar-seg"><div class="tm-bar-fill" style="width:${pct.toFixed(1)}%"></div></div></div></div>`;
  };

  // Objetivos da carreira (mesma lista de App.renderAchievementsAndObjectives)
  function objectiveList(app) {
    const done = (id) => app.state.completedChapters.includes(id);
    return [
      { icon: '⚽', title: 'Sobreviver à Final do Ensino Médio e entrar no Blue Lock', desc: 'Decida se passa para o seu amigo ou chuta no Prólogo. Libera a roleta de Arma e Fluxo.', ok: app.state.blueLockEntered },
      { icon: '🔒', title: 'Sobreviver à 1ª Seleção', desc: 'Vença o Time V do Nagi e do Reo com o Time Z.', ok: done('ch2_first_selection_v') },
      { icon: '🛡️', title: 'Passar pela 2ª e 3ª Seleção', desc: 'Encare os World Five e vença o Torneio de Trios.', ok: done('ch4b_trio_tournament') },
      { icon: '👑', title: 'Vencer a Sub-20 do Japão', desc: 'Salve o Blue Lock e libere a Liga Neo Egoísta, o 2º slot de Arma e Fluxo e o Metavision / Predator Eye.', ok: app.state.nelUnlocked },
      { icon: '🃏', title: 'Encarar o Wild Card', desc: 'O Kunigami volta da porta preta sem sorriso. Jogue contra o Coringa antes da NEL.', ok: done('ch5b_wild_card') },
      { icon: '💴', title: 'Sobreviver à Liga Neo Egoísta', desc: 'Jogue os 8 jogos da NEL e termine entre os 23 mais valiosos para ir à Copa.', ok: done('ch7_nel_ubers_pxg') },
      { icon: '🦁', title: 'Vencer a Inglaterra na Copa Sub-20', desc: 'Derrote Agi, Teddy Knight e Chris Prince.', ok: done('ch8_u20_england') },
      { icon: '🌍', title: '"4 EGOS": campeão da Copa do Mundo Sub-20', desc: 'Vença a França de Loki e Hugo na final.', ok: done('ch9_world_cup_final') },
      { icon: '🦊', title: 'Passar no teste do Fox', desc: 'Acorde o monstro e vire o jogo contra o Rin, o Kaiser, o Barou e o Shidou.', ok: done('ch10_fox_training') },
      { icon: '🥇', title: 'Disputar a Bola de Ouro', desc: 'Escolha uma proposta e jogue a temporada inteira da Liga Europeia.', ok: done('ch12_pro_season_2') },
      { icon: '🗾', title: 'Ganhar a vaga na seleção principal', desc: 'Seja convocado pelo Ego e vença os amistosos contra Portugal e Coreia do Sul.', ok: done('ch12b_wc_camp') },
      { icon: '🏆', title: 'Campeão da Copa do Mundo', desc: 'Passe da fase de grupos e vença os 5 jogos de mata-mata, até a França de Noel Noa.', ok: done('ch13_world_cup') },
      { icon: '🩸', title: 'O último duelo', desc: 'Vença o Rin Itoshi pelo número 1 do Blue Lock e receba a Bola de Ouro.', ok: done('ch14_rin_final') }
    ];
  }

  Object.assign(App, {
    // ========================================================================
    // ABA TREINOS: cartões de missão cinematográficos
    // ========================================================================
    renderTrainingTab() {
      const box = document.getElementById('training-drills-grid');
      if (!box) return;
      const max = window.TRAINING_ENERGY_MAX;
      const energy = this.state.trainingEnergy ?? max;
      const tired = energy <= 0;
      const sp = this.state.currencies.skillPoints;

      const pips = Array.from({ length: max }, (_, i) => `<i class="trn-pip ${i < energy ? 'on' : ''}" style="--i:${i}">${BOLT}</i>`).join('');

      const cards = window.TRAINING_DRILLS.map((dr, i) => {
        const col = catColor(dr.category);
        const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(dr.name);
        const main = m ? m[1] : dr.name;
        const sub = m ? m[2] : '';
        const desc = String(dr.desc)
          .replace(/^MINIGAME NO CAMPO:\s*/i, '')
          .replace(/\[([A-Z])\]/g, '<kbd>$1</kbd>')
          .replace(/\bWASD\b/, '<kbd>WASD</kbd>')
          .replace(/\bShift\b/, '<kbd>Shift</kbd>')
          .replace(/\bMouse\b/, '<kbd>Mouse</kbd>');
        const gains = Object.entries(dr.statGains)
          .map(([k, v]) => {
            const s = statInfo(k);
            return `<span class="trn-gain" style="--c:${s.color}"><b>+${v}</b><span>${s.label}</span></span>`;
          })
          .join('');
        const aff = dr.affinityGain ? `<span class="trn-gain" style="--c:#f472b6"><b>+${dr.affinityGain}%</b><span>Química</span></span>` : '';
        return `
          <article class="trn-card tm-frame" style="--cat:${col}; --i:${i}">
            <div class="trn-art">
              <div class="trn-art-edge" aria-hidden="true"></div>
              <div class="trn-art-in">
                <canvas class="trn-cv" data-drill="${dr.id}" data-idx="${i}"></canvas>
                <span class="trn-num" aria-hidden="true">${pad2(i + 1)}</span>
                <span class="trn-cat">${dr.category}</span>
              </div>
            </div>
            <div class="trn-body">
              <div class="trn-kicker"><span>MISSÃO ${pad2(i + 1)}</span><i></i>MINIGAME NO CAMPO</div>
              <h3 class="trn-name">${main}</h3>
              ${sub ? `<div class="trn-sub">${sub}</div>` : ''}
              <div class="trn-mentor"><small>MENTORES</small><b>${dr.mentor}</b></div>
              <p class="trn-desc">${desc}</p>
              <div class="tm-cap trn-rw-cap">RECOMPENSAS</div>
              <div class="trn-gains">${gains}${aff}</div>
              <div class="trn-foot">
                <div class="trn-loot">
                  <span class="trn-loot-sp"><b>+${dr.spGain}</b><small>SP</small></span>
                  <span class="trn-loot-coin"><b>+${dr.coinGain}</b><small>EGOCOINS</small></span>
                </div>
                <button class="trn-go ${tired ? 'disabled' : ''}" onclick="App.executeTraining('${dr.id}')" title="${tired ? 'Sem energia: jogue uma partida da HISTÓRIA para recarregar' : 'Treinar (gasta 1 de energia)'}">
                  <span>${tired ? 'SEM ENERGIA' : 'TREINAR ▶'}</span>${tired ? '' : `<em>−1 ${BOLT}</em>`}
                </button>
              </div>
            </div>
          </article>`;
      }).join('');

      const html = `
        <div class="trn-root tm-root">
          <div class="trn-hero tm-frame tm-grain ${tired ? 'is-empty' : ''}">
            <div class="tm-speed" aria-hidden="true"></div>
            <div class="tm-letterbox"><span>BLUE LOCK <b>TRAINING CENTRE</b></span><span>TRAINING LAB</span></div>
            <div class="trn-hero-in">
              <div class="trn-hero-title">
                <div class="tm-cap">CENTRO DE</div>
                <h2 class="tm-title">TREINAMENTO</h2>
                <p class="tm-lead">Cada treino é um minigame em campo. Ganha atributos de verdade (veja o efeito na aba <b>ATRIBUTOS</b>) e Pontos de Habilidade.</p>
              </div>
              <div class="trn-energy ${tired ? 'empty' : ''}">
                <div class="tm-cap">ENERGIA DE TREINO</div>
                <div class="trn-energy-row">
                  <div class="trn-pips">${pips}</div>
                  <div class="trn-energy-num"><b>${energy}</b><span>/${max}</span></div>
                </div>
                <div class="trn-energy-msg"><span class="trn-status">${tired ? 'ESGOTADO' : 'PRONTO'}</span><span>${tired ? 'Você está esgotado. Jogue uma partida da HISTÓRIA para recarregar.' : `Cada treino gasta 1. Jogar uma partida enche de novo (até ${max}).`}</span></div>
              </div>
              <button class="trn-sp" onclick="App.switchTab('ESTATISTICAS')" title="Distribuir SP na aba ATRIBUTOS">
                <span class="tm-cap">SP DISPONÍVEL</span>
                <span class="trn-sp-big"><b>${sp}</b><small>SP</small></span>
                <span class="trn-sp-go">DISTRIBUIR ▶</span>
              </button>
            </div>
          </div>
          <div class="trn-grid">${cards}</div>
        </div>`;

      const visible = box.offsetParent !== null;
      const intro = visible && !this._trnWasVisible;
      this._trnWasVisible = visible;
      const prevEnergy = this._trnPrevEnergy;
      this._trnPrevEnergy = energy;
      if (box._tmHtml !== html) {
        box.innerHTML = html;
        box._tmHtml = html;
      }
      const root = box.firstElementChild;
      if (intro) playIntro(root, 'tm-intro');
      // energia gasta: o raio que apagou "descarrega" uma vez
      if (prevEnergy != null && energy < prevEnergy && root) {
        const pip = root.querySelectorAll('.trn-pip')[energy];
        if (pip) {
          pip.classList.add('spent');
          setTimeout(() => pip.classList.remove('spent'), 900);
        }
      }
      if (visible) this.drawTrainingArt();
    },

    drawTrainingArt() {
      const box = document.getElementById('training-drills-grid');
      if (!box || box.offsetParent === null) return;
      box.querySelectorAll('canvas.trn-cv').forEach((cv) => {
        const dr = window.TRAINING_DRILLS.find((d) => d.id === cv.dataset.drill);
        if (dr) paintDrillArt(this, cv, dr, catColor(dr.category), +cv.dataset.idx || 0);
      });
    },

    // ========================================================================
    // ABAS CONQUISTAS (sala de troféus) e OBJETIVOS (rota da carreira)
    // ========================================================================
    renderAchievementsAndObjectives() {
      this.renderTrophyRoom();
      this.renderObjectiveRoute();
    },

    renderTrophyRoom() {
      const achBox = document.getElementById('achievements-grid');
      if (!achBox) return;
      const all = window.ACHIEVEMENTS_DB;
      const unlockedIds = this.state.unlockedAchievements;
      const got = all.filter((a) => unlockedIds.includes(a.id));
      const earned = got.reduce((s, a) => s + a.rewardCoins, 0);
      const spinsEarned = got.reduce((s, a) => s + (a.rewardSpins || 0), 0);
      const c = this.state.career;
      const played = c.wins + c.draws + c.losses;
      const pctAll = all.length ? Math.round((got.length / all.length) * 100) : 0;
      // Desbloqueadas primeiro; entre as bloqueadas, as mais perto de sair primeiro
      const pct = (a) => {
        if (!a.progress) return 0;
        const [cur, goal] = a.progress(this.state, this);
        return cur / goal;
      };
      const sorted = all.slice().sort((a, b) => {
        const ua = unlockedIds.includes(a.id);
        const ub = unlockedIds.includes(b.id);
        if (ua !== ub) return ua ? -1 : 1;
        return pct(b) - pct(a);
      });
      const prevSet = this._acbPrev;
      this._acbPrev = unlockedIds.slice();

      const stat = (label, value, cls = '') => `<div class="acb-cs ${cls}"><b>${value}</b><span>${label}</span></div>`;
      const card = (ach, i) => {
        const unlocked = unlockedIds.includes(ach.id);
        const prog = !unlocked && ach.progress ? ach.progress(this.state, this) : null;
        const tier = achTier(ach);
        const g = ACH_GLYPH[ach.id] || '🏆';
        const glyph = g.startsWith('T:') ? `<span class="acb-glyph txt">${g.slice(2)}</span>` : `<span class="acb-glyph">${g}</span>`;
        const isNew = prevSet && unlocked && !prevSet.includes(ach.id);
        return `
          <div class="acb-card ${unlocked ? 'unlocked' : 'locked'} ${isNew ? 'acb-new' : ''}" style="--tier:${tier.color}; --i:${Math.min(i, 14)}">
            <div class="acb-emb">${glyph}${unlocked ? '' : `<i class="acb-lock">${LOCK}</i>`}</div>
            <div class="acb-info">
              <div class="acb-top"><span class="acb-tier">${tier.name}</span>${unlocked ? `<span class="acb-stamp">${CHECK}CONQUISTADA</span>` : ''}</div>
              <h4>${ach.title}</h4>
              <p>${ach.desc}</p>
              ${prog ? `<div class="acb-prog">${segBar(prog[0], prog[1])}<span>${Math.min(prog[0], prog[1])} / ${prog[1]}</span></div>` : ''}
              <div class="acb-rw"><span><b>+${ach.rewardCoins}</b> EGOCOINS</span>${ach.rewardSpins ? `<span><b>+${ach.rewardSpins}</b> GIRO${ach.rewardSpins > 1 ? 'S' : ''}</span>` : ''}</div>
            </div>
          </div>`;
      };
      const unl = sorted.filter((a) => unlockedIds.includes(a.id));
      const lck = sorted.filter((a) => !unlockedIds.includes(a.id));
      const html = `
        <div class="acb-root tm-root">
          <div class="acb-hero tm-frame tm-grain">
            <div class="tm-speed" aria-hidden="true"></div>
            <div class="tm-letterbox"><span>EGOIST <b>TROPHY ROOM</b></span><span>BLUE LOCK</span></div>
            <div class="acb-hero-in">
              <div class="acb-count-block">
                <div class="tm-cap">SALA DE TROFÉUS</div>
                <h2 class="tm-title">CONQUISTAS</h2>
                <div class="acb-count"><b>${got.length}</b><span>/ ${all.length}</span></div>
                <div class="acb-summary">🏆 <b>${got.length} de ${all.length}</b> conquistas • <b>${earned}</b> EgoCoins ganhos com elas</div>
              </div>
              <div class="acb-ring" style="--p:${pctAll}">
                <div class="acb-ring-in"><b>${pctAll}<small>%</small></b><span>COMPLETO</span></div>
              </div>
              <div class="acb-career">
                <div class="acb-career-head"><span class="tm-tag">SUA CARREIRA</span><span class="acb-loot"><b>+${earned}</b> EGOCOINS · <b>+${spinsEarned}</b> GIROS GANHOS</span></div>
                <div class="acb-record">
                  <div class="acb-rec-main"><b>${played}</b><span>PARTIDAS</span></div>
                  <div class="acb-rec w"><b>${c.wins}</b><span>VITÓRIAS</span></div>
                  <div class="acb-rec d"><b>${c.draws}</b><span>EMPATES</span></div>
                  <div class="acb-rec l"><b>${c.losses}</b><span>DERROTAS</span></div>
                </div>
                <div class="acb-cs-grid">
                  ${stat('Seus gols', c.myGoals, 'hi')}
                  ${stat('No ângulo', c.angleGoals)}
                  ${stat('De longe', c.longGoals)}
                  ${stat('Hat-tricks', c.hatTricks)}
                  ${stat('Dribles', c.dribbles)}
                  ${stat('Desarmes', c.steals)}
                  ${stat('Melhor nota', c.bestRating ? c.bestRating.toFixed(1) : '—', 'amber')}
                </div>
              </div>
            </div>
          </div>
          ${unl.length ? `<div class="tm-section"><span>DESBLOQUEADAS</span><i></i><b>${unl.length}</b></div><div class="acb-grid">${unl.map(card).join('')}</div>` : ''}
          <div class="tm-section"><span>A CONQUISTAR</span><i></i><b>${lck.length}</b></div>
          <div class="acb-grid">${lck.map((a, i) => card(a, i + unl.length)).join('')}</div>
        </div>`;

      const visible = achBox.offsetParent !== null;
      const intro = visible && !this._acbWasVisible;
      this._acbWasVisible = visible;
      if (achBox._tmHtml !== html) {
        achBox.innerHTML = html;
        achBox._tmHtml = html;
      }
      if (intro) playIntro(achBox.firstElementChild, 'tm-intro');
    },

    renderObjectiveRoute() {
      const objBox = document.getElementById('objectives-grid');
      if (!objBox) return;
      const ovr = this.calculateOVR();
      const rank = this.getRankLetter(ovr);
      const objectives = objectiveList(this);
      const next = objectives.findIndex((o) => !o.ok);
      const doneCount = objectives.filter((o) => o.ok).length;
      const cur = next >= 0 ? objectives[next] : null;
      const wc = ovr >= 95;

      const mini = objectives.map((o, i) => `<i class="${o.ok ? 'done' : i === next ? 'current' : ''}"></i>`).join('');
      const nodes = objectives.map((o, i) => {
        const st = o.ok ? 'done' : i === next ? 'current' : 'locked';
        const side = i % 2 ? 'r' : 'l';
        const stepLabel = o.ok ? 'CONCLUÍDA' : i === next ? 'AGORA' : 'BLOQUEADA';
        return `
          <div class="obj-node ${st} side-${side}" style="grid-row:${i + 1} / span 2; --i:${i}">
            <div class="obj-card">
              <div class="obj-ico">${o.ok ? `<span class="obj-check">${CHECK}</span>` : `<span class="obj-emoji">${o.icon}</span>`}</div>
              <div class="obj-txt">
                <div class="obj-step"><span>ETAPA ${pad2(i + 1)}</span><em>${i === next ? '▶ ' : ''}${stepLabel}</em></div>
                <h4>${o.title}</h4>
                <p>${o.desc}</p>
              </div>
            </div>
            <div class="obj-dot"><span>${pad2(i + 1)}</span></div>
          </div>`;
      }).join('');

      const html = `
        <div class="obj-root tm-root">
          <div class="obj-hero tm-frame tm-grain">
            <div class="tm-speed" aria-hidden="true"></div>
            <div class="tm-letterbox"><span>EGOIST <b>ROUTE</b></span><span>BLUE LOCK → MUNDO</span></div>
            <div class="obj-hero-in">
              <div class="obj-hero-title">
                <div class="tm-cap">ROTA DO EGOÍSTA</div>
                <h2 class="tm-title">OBJETIVOS</h2>
                <div class="obj-count"><b>${pad2(doneCount)}</b><span>/ ${pad2(objectives.length)} ETAPAS</span></div>
                <div class="obj-mini">${mini}</div>
              </div>
              <div class="obj-next ${cur ? '' : 'all-done'}">
                <div class="obj-next-head"><span class="tm-tag">${cur ? `PRÓXIMO OBJETIVO · ETAPA ${pad2(next + 1)}` : 'ROTA COMPLETA'}</span></div>
                <div class="obj-next-body">
                  <div class="obj-next-ico">${cur ? cur.icon : '🏆'}</div>
                  <div>
                    <h3>${cur ? cur.title : 'Lenda do futebol'}</h3>
                    <p>${cur ? cur.desc : 'Você cumpriu todas as etapas da carreira. O monstro ainda está com fome.'}</p>
                  </div>
                </div>
              </div>
              <div class="obj-side ${wc ? 'done' : ''}" style="--rank:${rank.color}">
                <div class="obj-side-head"><span class="tm-cap">OBJETIVO PARALELO</span>${wc ? `<span class="obj-side-ok">${CHECK}</span>` : ''}</div>
                <div class="obj-side-title">VIRAR <b>WORLD CLASS</b></div>
                <div class="obj-side-row">
                  <div class="obj-side-ovr"><b>${ovr}</b><span>/ 95 OVR</span></div>
                  <div class="obj-side-rank"><span>${rank.letter}</span></div>
                </div>
                ${segBar(ovr, 95, 'obj-wc-bar')}
                <p>Treine, distribua SP na aba ATRIBUTOS e gire Armas e Fluxos melhores. Hoje: OVR ${ovr} (${rank.label}).</p>
              </div>
            </div>
          </div>
          <div class="tm-section"><span>MAPA DA CARREIRA</span><i></i><b>${doneCount}/${objectives.length}</b></div>
          <div class="obj-route">
            <div class="obj-spine" aria-hidden="true"><i class="obj-spine-fill"></i></div>
            ${nodes}
          </div>
        </div>`;

      const visible = objBox.offsetParent !== null;
      const intro = visible && !this._objWasVisible;
      this._objWasVisible = visible;
      if (objBox._tmHtml !== html) {
        objBox.innerHTML = html;
        objBox._tmHtml = html;
        objBox._tmSpineW = 0;
      }
      if (intro) playIntro(objBox.firstElementChild, 'tm-intro');
      if (visible) this.layoutObjectiveSpine();
    },

    // Parte acesa da linha da rota: do começo até o ponto da etapa atual
    layoutObjectiveSpine() {
      const objBox = document.getElementById('objectives-grid');
      if (!objBox || objBox.offsetParent === null) return;
      const route = objBox.querySelector('.obj-route');
      const fill = objBox.querySelector('.obj-spine-fill');
      if (!route || !fill) return;
      const w = route.clientWidth;
      if (objBox._tmSpineW === w) return;
      objBox._tmSpineW = w;
      const rr = route.getBoundingClientRect();
      const target = route.querySelector('.obj-node.current .obj-dot') || (route.querySelector('.obj-node.locked') ? null : [...route.querySelectorAll('.obj-node.done .obj-dot')].pop());
      const firstDot = route.querySelector('.obj-dot');
      if (!firstDot) return;
      const top0 = firstDot.getBoundingClientRect().top + firstDot.offsetHeight / 2 - rr.top;
      let h = 0;
      if (target) h = target.getBoundingClientRect().top + target.offsetHeight / 2 - rr.top - top0;
      fill.style.top = `${top0}px`;
      fill.style.height = `${Math.max(0, h)}px`;
      const spine = route.querySelector('.obj-spine');
      const lastDot = [...route.querySelectorAll('.obj-dot')].pop();
      if (spine && lastDot) {
        spine.style.top = `${top0}px`;
        spine.style.height = `${lastDot.getBoundingClientRect().top + lastDot.offsetHeight / 2 - rr.top - top0}px`;
        fill.style.top = '0px';
      }
    }
  });

  // Redesenha a arte/rota quando a janela muda de tamanho
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      try {
        App.drawTrainingArt();
        App.layoutObjectiveSpine();
      } catch (e) { /* aba fechada */ }
    }, 120);
  });
})();
