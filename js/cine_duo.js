// ============================================================================
// CENAS DA CARREIRA EM DUPLA — "PROJETO ELO" (cine_duo)
//   duo_ponte • abertura: a final do torneio de rua da Ponte Velha, os dois rivais, a
//     dupla mascarada que rouba o último lance e a mesma carta nas duas casas
// Os dois protagonistas são os jogadores da dupla (CE.duoCast: A = quem fundou a dupla,
// B = o parceiro). Usa os helpers da cine_partida (ptd*). Helpers novos com o prefixo "duo".
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine || !CE.ptdHead) return;

  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIn = (x) => clamp(x) * clamp(x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const RUN = [3, 7, 11, 15];
  const runF = (t, sp = 4) => RUN[Math.floor(t / sp) % RUN.length];

  // Cores da dupla e dos colégios do prólogo
  const GOLD = '#fde047';
  const VIOLET = '#a78bfa';
  const HOKUTO = { jerseyPrimary: '#0f766e', jerseySecondary: '#f8fafc' };
  const SEIRAN = { jerseyPrimary: '#7f1d1d', jerseySecondary: '#fbbf24' };
  const MASK_KIT = { jerseyPrimary: '#0a0a0a', jerseySecondary: '#e5e7eb' };
  // A dupla mascarada (ninguém sabe quem são... ainda)
  const MASKED = [
    { id: 'duo_mask_1', name: '???', skinColor: '#e8c7aa', hairColor: '#0b0b0f', hairSecondary: '#1f2937', eyeColor: '#e5e7eb', hairStyle: 'slick_back' },
    { id: 'duo_mask_2', name: '???', skinColor: '#c99a78', hairColor: '#f1f5f9', hairSecondary: '#94a3b8', eyeColor: '#ef4444', hairStyle: 'short_sharp' }
  ];

  // Perfil (da sala/da carreira em dupla) → boneco das cenas
  const charOf = (p, id, kit) => {
    const pr = (p && p.profile) || p || {};
    return Object.assign(
      {
        id,
        name: pr.name || '???',
        skinColor: pr.skinColor || '#f3d1b8',
        hairColor: pr.hairColor || '#0f172a',
        hairSecondary: pr.hairSecondary || '#2563eb',
        eyeColor: pr.eyeColor || '#ef4444',
        eyeStyle: pr.eyeStyle,
        hairStyle: pr.hairStyle || 'spiky_tall',
        number: pr.number || 10
      },
      kit || {}
    );
  };

  Object.assign(CE, {
    // A e B da dupla (com o uniforme pedido para cada um)
    duoCast(kitA, kitB) {
      const pl = window.Duo?.castProfiles?.() || {};
      const a = pl.a || { profile: window.App?.state?.profile };
      const b = pl.b || { profile: { name: 'Parceiro', hairColor: '#f97316', hairSecondary: '#fde047', hairStyle: 'knight_wild', eyeColor: '#38bdf8', skinColor: '#f1c9a5', number: 7 } };
      return { a: charOf(a, 'duo_a', kitA), b: charOf(b, 'duo_b', kitB), an: (a.profile?.name || 'A').toUpperCase(), bn: (b.profile?.name || 'B').toUpperCase() };
    },
    duoMasked(i, kit = MASK_KIT) {
      return Object.assign({}, MASKED[i], kit);
    },

    // Máscara branca em pixel por cima do rosto (u = px por unidade do boneco)
    duoMask(ctx, cx, eyeY, u, o = {}) {
      const px = Math.max(2, Math.round(u * 0.5));
      const cols = 26;
      const rows = 16;
      const x0 = Math.round(cx - (cols * px) / 2);
      const y0 = Math.round(eyeY - 7 * px);
      const inside = (c, r) => {
        const nx = (c + 0.5 - cols / 2) / (cols / 2);
        const ny = (r + 0.5 - rows * 0.42) / (rows * 0.62);
        return nx * nx + ny * ny * (ny > 0 ? 1.7 : 1) < 1;
      };
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!inside(c, r)) continue;
          const edge = !inside(c - 1, r) || !inside(c + 1, r) || !inside(c, r - 1) || !inside(c, r + 1);
          ctx.fillStyle = edge ? '#0b0f19' : c + r < cols * 0.55 ? '#ffffff' : '#e2e8f0';
          ctx.fillRect(x0 + c * px, y0 + r * px, px, px);
        }
      }
      // fendas dos olhos (inclinadas) e a risca da cor da dupla
      ctx.fillStyle = '#0b0f19';
      [-1, 1].forEach((s) => {
        for (let i = 0; i < 6; i++) {
          const c = Math.round(cols / 2 + s * (3 + i));
          const r = 6 + (s < 0 ? Math.floor(i / 2) : Math.floor((5 - i) / 2)) * 0 + (i > 3 ? 1 : 0);
          ctx.fillRect(x0 + c * px, y0 + r * px, px, px * 2);
        }
      });
      if (o.glow) {
        ctx.fillStyle = o.glow;
        [-1, 1].forEach((s) => ctx.fillRect(x0 + Math.round(cols / 2 + s * 5.5) * px, y0 + 6 * px, px * 2, px));
      }
      ctx.fillStyle = o.stripe || '#dc2626';
      for (let r = 2; r < rows - 2; r++) {
        const c = Math.round(cols / 2 + (r - rows / 2) * 0.35);
        if (inside(c, r)) ctx.fillRect(x0 + c * px, y0 + r * px, px, px);
      }
    },

    // Bola em pixel (pés no chão em y)
    duoBall(ctx, x, y, s = 28) {
      const px = Math.max(2, Math.round(s / 10));
      const n = 10;
      const x0 = Math.round(x - (n * px) / 2);
      const y0 = Math.round(y - n * px);
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const dx = c + 0.5 - n / 2;
          const dy = r + 0.5 - n / 2;
          const d = Math.hypot(dx, dy);
          if (d > n / 2) continue;
          // gomos escuros: um no meio e três na borda
          const patch = (Math.abs(dx + 0.5) < 1.2 && Math.abs(dy + 0.3) < 1.2) || (r === 1 && c >= 4 && c <= 5) || (r >= 6 && r <= 7 && (c === 1 || c === 8));
          ctx.fillStyle = d > n / 2 - 0.9 ? '#0b0f19' : patch ? '#1f2937' : dx + dy < -1 ? '#ffffff' : '#e2e8f0';
          ctx.fillRect(x0 + c * px, y0 + r * px, px, px);
        }
      }
    },

    // A quadra debaixo da Ponte Velha à noite (em pixel: desenhada a 1/4 e ampliada)
    duoBridgeBg(ctx, S, o = {}) {
      const { W, H, t } = S;
      const w = Math.ceil(W / 4);
      const h = Math.ceil(H / 4);
      const cv = this.ptdBg(`duo_bridge|${w}x${h}`, w, h, (g) => {
        const sky = g.createLinearGradient(0, 0, 0, h * 0.62);
        sky.addColorStop(0, '#04061a');
        sky.addColorStop(1, '#231a52');
        g.fillStyle = sky;
        g.fillRect(0, 0, w, h);
        // estrelas
        for (let i = 0; i < 60; i++) {
          g.fillStyle = i % 7 ? 'rgba(226,232,240,0.55)' : '#fde68a';
          g.fillRect(Math.floor(rnd(i, 1) * w), Math.floor(rnd(i, 2) * h * 0.3), 1, 1);
        }
        // cidade ao longe com janelas acesas
        for (let x = 0; x < w; ) {
          const bw = 8 + Math.floor(rnd(x, 3) * 18);
          const bh = 18 + Math.floor(rnd(x, 4) * 38);
          const by = Math.floor(h * 0.42) - bh;
          g.fillStyle = '#0f0c2e';
          g.fillRect(x, by, bw - 1, bh + 2);
          for (let yy = by + 3; yy < by + bh - 2; yy += 4) {
            for (let xx = x + 2; xx < x + bw - 3; xx += 3) {
              if (rnd(xx * 7 + yy, 5) > 0.72) {
                g.fillStyle = rnd(xx + yy, 6) > 0.5 ? '#fbbf24' : '#93c5fd';
                g.fillRect(xx, yy, 1, 1);
              }
            }
          }
          x += bw;
        }
        // a ponte: tabuleiro grosso em cima e o arco por baixo
        const deckY = Math.floor(h * 0.13);
        g.fillStyle = '#111827';
        g.fillRect(0, deckY, w, Math.floor(h * 0.09));
        g.fillStyle = '#374151';
        g.fillRect(0, deckY + Math.floor(h * 0.09) - 2, w, 2);
        g.fillStyle = '#1f2937';
        for (let x = 0; x < w; x += 6) g.fillRect(x, deckY + 3, 3, 2);
        // arco (em degraus)
        g.fillStyle = '#111827';
        for (let x = 0; x < w; x++) {
          const k = (x - w / 2) / (w * 0.48);
          const y = deckY + Math.floor(h * 0.09) + Math.floor(Math.max(0, 1 - k * k) * -10 + 10 + k * k * h * 0.18);
          g.fillRect(x, deckY + Math.floor(h * 0.09), 1, Math.max(0, y - deckY - Math.floor(h * 0.09)));
        }
        // pilares
        [0.07, 0.93].forEach((fx) => {
          const px = Math.floor(w * fx) - 9;
          g.fillStyle = '#1f2937';
          g.fillRect(px, deckY, 18, Math.floor(h * 0.62) - deckY);
          g.fillStyle = '#2b3546';
          g.fillRect(px + 2, deckY, 3, Math.floor(h * 0.62) - deckY);
          // pichação
          g.fillStyle = fx < 0.5 ? '#7c3aed' : '#dc2626';
          g.fillRect(px + 5, Math.floor(h * 0.44), 9, 3);
          g.fillRect(px + 7, Math.floor(h * 0.48), 6, 2);
        });
        // postes
        [0.24, 0.5, 0.76].forEach((fx) => {
          const px = Math.floor(w * fx);
          g.fillStyle = '#0b0f19';
          g.fillRect(px, Math.floor(h * 0.27), 2, Math.floor(h * 0.36));
          g.fillRect(px - 3, Math.floor(h * 0.27), 8, 2);
          g.fillStyle = '#fde68a';
          g.fillRect(px - 2, Math.floor(h * 0.27) + 2, 6, 1);
        });
        // alambrado (losangos)
        const fy0 = Math.floor(h * 0.4);
        const fy1 = Math.floor(h * 0.62);
        g.fillStyle = 'rgba(100,116,139,0.55)';
        for (let y = fy0; y < fy1; y++) {
          for (let x = 0; x < w; x++) if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) g.fillRect(x, y, 1, 1);
        }
        g.fillStyle = '#475569';
        g.fillRect(0, fy0, w, 1);
        // quadra de asfalto com as linhas pintadas
        const gy = Math.floor(h * 0.62);
        const gr = g.createLinearGradient(0, gy, 0, h);
        gr.addColorStop(0, '#1e2433');
        gr.addColorStop(1, '#2b3243');
        g.fillStyle = gr;
        g.fillRect(0, gy, w, h - gy);
        for (let i = 0; i < 400; i++) {
          g.fillStyle = i % 2 ? 'rgba(148,163,184,0.12)' : 'rgba(2,6,23,0.25)';
          g.fillRect(Math.floor(rnd(i, 8) * w), gy + Math.floor(rnd(i, 9) * (h - gy)), 1, 1);
        }
        g.fillStyle = 'rgba(226,232,240,0.55)';
        g.fillRect(Math.floor(w / 2), gy + 2, 1, h - gy);
        for (let a = 0; a < TAU; a += 0.02) g.fillRect(Math.floor(w / 2 + Math.cos(a) * w * 0.12), Math.floor(gy + (h - gy) * 0.5 + Math.sin(a) * (h - gy) * 0.22), 1, 1);
        g.fillRect(0, gy + 1, w, 1);
      });
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cv, 0, 0, w * 4, h * 4);
      ctx.restore();
      // luz dos postes (piscando de leve) e mariposas
      [0.24, 0.5, 0.76].forEach((fx, i) => {
        const fl = 0.75 + 0.25 * Math.sin(t * 0.09 + i * 2) * (rnd(Math.floor(t / 9) + i, 3) > 0.1 ? 1 : 0.2);
        this.cineGlow(ctx, W * fx + 4, H * 0.275, 150, 'rgba(253,230,138,0.45)', fl * (o.lamp ?? 1));
      });
    },

    // ------------------------------------------------------------------
    // PLANO 1 — a final da Ponte Velha: os dois frente a frente, a bola no meio
    duo0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(HOKUTO, SEIRAN);
      const k = ease(t / S.dur);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H * 0.6, zoom: lerp(1, 1.12, k), shake: 0.1 });
      this.duoBridgeBg(ctx, S);
      const feet = H * 0.9;
      const size = 300;
      const gap = lerp(W * 0.3, W * 0.22, ease(seg(t, 0, 60)));
      this.ptdSpr(ctx, c.a, W / 2 - gap, feet, size, { facing: 'side', animState: 'idle', frame: 45 + Math.floor(t / 10) });
      this.ptdSpr(ctx, c.b, W / 2 + gap, feet, size, { facing: 'side', animState: 'idle', flipX: true, frame: 47 + Math.floor(t / 10) });
      this.duoBall(ctx, W / 2, feet - 6, 34);
      // a faísca de rivalidade entre os dois olhares
      const sp = seg(t, 70, 84) * (1 - seg(t, 150, 168));
      if (sp > 0) {
        const eyeY = feet - size * 0.87 + SPRITE_MAPY(10) * (size / 36);
        ctx.fillStyle = GOLD;
        ctx.globalAlpha = sp;
        const x0 = W / 2 - gap + 40;
        const x1 = W / 2 + gap - 40;
        for (let x = x0; x < x1; x += 8) {
          const j = (rnd(Math.floor(x / 8) + Math.floor(t / 3), 4) - 0.5) * 26;
          ctx.fillRect(Math.round(x / 4) * 4, Math.round((eyeY + j) / 4) * 4, 8, 4);
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      this.ptdChip(ctx, 'FINAL • TORNEIO DE RUA DA PONTE VELHA', W / 2, top + 44, GOLD, seg(t, 8, 22), { size: 17 });
      this.ptdChip(ctx, `${c.an} • COLÉGIO HOKUTO`, W * 0.25, bot - 46, '#2dd4bf', seg(t, 30, 44), { size: 15 });
      this.ptdChip(ctx, `${c.bn} • COLÉGIO SEIRAN`, W * 0.75, bot - 46, '#f87171', seg(t, 40, 54), { size: 15 });
      this.ptdSfx(S, 72, 'faisca', () => window.SFX?.whoosh?.());
    },

    // PLANO 2 — o último lance: os dois na mesma bola... e dois vultos levam ela
    duo1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(HOKUTO, SEIRAN);
      const feet = H * 0.88;
      const size = 280;
      const hit = 64;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H * 0.6, zoom: 1.08, shake: t > hit && t < hit + 14 ? 1.2 : 0.25 });
      this.duoBridgeBg(ctx, S, { lamp: 0.7 });
      ctx.fillStyle = 'rgba(2,6,23,0.35)';
      ctx.fillRect(-20, -20, W + 40, H + 40);
      this.ptdSpeed(ctx, S, t, '#e2e8f0', 0.18, 1, 46, 26);
      const run = ease(seg(t, 0, hit));
      const ax = lerp(W * 0.12, W * 0.4, run);
      const bx = lerp(W * 0.88, W * 0.6, run);
      const stop = t > hit;
      this.ptdSpr(ctx, c.a, ax, feet, size, { facing: 'side', animState: stop ? 'idle' : 'run', frame: stop ? 45 : runF(t) });
      this.ptdSpr(ctx, c.b, bx, feet, size, { facing: 'side', animState: stop ? 'idle' : 'run', frame: stop ? 45 : runF(t + 2), flipX: true });
      // a bola rolando para o meio — até sumir no corte
      if (t < hit) this.duoBall(ctx, W / 2, feet - 4, 32);
      // os dois vultos mascarados passando no meio dos dois, rente ao chão, e levando a
      // bola num toque de um para o outro (com rastro de "fantasmas")
      const sl = seg(t, hit - 10, hit + 12);
      if (sl > 0 && sl < 1) {
        const ex = (k, i) => lerp(-W * 0.1 + i * 90, W * 1.1 + i * 90, k);
        [0, 1].forEach((i) => {
          const m = this.duoMasked(i);
          for (let g = 3; g >= 0; g--) {
            const kk = clamp(sl - g * 0.035);
            this.ptdSpr(ctx, m, ex(kk, i), feet + 10 + i * 14, 250, { facing: 'side', animState: 'run', frame: runF(t + i * 2), tint: g ? '#4c0519' : '#020617', alpha: g ? 0.35 - g * 0.08 : 1 });
          }
          // a máscara branca aparecendo no vulto
          const u = 250 / 36;
          const eyeY = feet + 10 + i * 14 - 250 * 0.87 + SPRITE_MAPY(10) * u;
          this.duoMask(ctx, ex(sl, i) + 4, eyeY + 0.6 * u, u, { stripe: i ? '#e5e7eb' : '#dc2626' });
        });
        // a bola indo de um pé para o outro
        const bk = clamp((sl - 0.25) / 0.5);
        if (sl > 0.25) this.duoBall(ctx, lerp(ex(sl, 0) + 30, ex(sl, 1) + 30, 0.5 + 0.5 * Math.sin(bk * Math.PI * 3)), feet + 8, 30);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.85 * (1 - sl);
        ctx.fillRect(0, feet - 60, W, 6);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (t >= hit && t < hit + 6) this.cineFlash(ctx, W, H, 1 - (t - hit) / 6, '#ffffff');
      // "!?" nos dois
      const q = seg(t, hit + 10, hit + 18);
      if (q > 0) {
        this.ptdWord(ctx, '!?', ax, feet - size - 40, 70, '#f8fafc', q, 1, -0.1);
        this.ptdWord(ctx, '!?', bx, feet - size - 40, 70, '#f8fafc', q, 1, 0.1);
        this.ptdChip(ctx, 'A BOLA SUMIU', W / 2, top + 44, '#f8fafc', seg(t, hit + 20, hit + 32), { size: 17 });
      }
      this.ptdSfx(S, hit, 'corte', () => window.SFX?.kick?.(0.9));
    },

    // PLANO 3 — os mascarados: dois rostos com máscaras brancas, de perto
    duo2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const k = ease(t / S.dur);
      const bg = ctx.createLinearGradient(0, top, 0, bot);
      bg.addColorStop(0, '#0a0410');
      bg.addColorStop(1, '#3b0712');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      this.ptdRays(ctx, W / 2, H * 0.45, W, '#dc2626', 0.12, t * 0.002, 36);
      const eyeY = H * 0.44;
      const size = 640;
      const u = size / 36;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: eyeY, zoom: lerp(1.0, 1.07, k), shake: 0.12 });
      const xs = [W * 0.3, W * 0.7];
      xs.forEach((x, i) => {
        const m = this.duoMasked(i);
        const dx = lerp(i ? 60 : -60, 0, ease(seg(t, 0, 26)));
        this.ptdHead(ctx, m, x + dx, eyeY, size, { flipX: i === 1, rim: '#dc2626', rimD: 3, dim: 0.25, dimTint: '20,0,10' });
        this.duoMask(ctx, x + dx, eyeY + 0.6 * u, u, { glow: t > 90 ? (i ? '#ef4444' : '#e5e7eb') : null, stripe: i ? '#e5e7eb' : '#dc2626' });
      });
      ctx.restore();
      this.ptdChip(ctx, '??? & ???', W / 2, top + 44, '#dc2626', seg(t, 10, 22), { size: 18 });
      const st = seg(t, 96, 108);
      if (st > 0) this.ptdWord(ctx, 'SÓ BARULHO.', W / 2, bot - 70, 64, '#f8fafc', st, 1, -0.03, W * 0.7);
      this.ptdSfx(S, 92, 'olhos', () => window.SFX?.jingle?.([220, 196], 0, 'square'));
    },

    // PLANO 4 — a carta: as duas casas, a mesma noite, o mesmo envelope
    duo3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(HOKUTO, SEIRAN);
      const eyeY = H * 0.42;
      const size = 520;
      const u = size / 36;
      // painel da esquerda (A): quarto azul com a lua; da direita (B): luz de abajur
      const cut = (y) => W * 0.5 + (y - H / 2) * 0.18;
      const panel = (left) => {
        ctx.save();
        ctx.beginPath();
        if (left) {
          ctx.moveTo(0, 0);
          ctx.lineTo(cut(0), 0);
          ctx.lineTo(cut(H), H);
          ctx.lineTo(0, H);
        } else {
          ctx.moveTo(cut(0), 0);
          ctx.lineTo(W, 0);
          ctx.lineTo(W, H);
          ctx.lineTo(cut(H), H);
        }
        ctx.closePath();
        ctx.clip();
        const g = ctx.createLinearGradient(0, top, 0, bot);
        g.addColorStop(0, left ? '#071233' : '#2a1306');
        g.addColorStop(1, left ? '#0f2a5a' : '#5a2a0c');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // janela / abajur
        if (left) {
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(W * 0.05, top + 40, 160, 200);
          ctx.fillStyle = '#e0e7ff';
          ctx.fillRect(W * 0.05 + 96, top + 70, 36, 36);
          ctx.fillStyle = '#0b1430';
          ctx.fillRect(W * 0.05 + 76, top + 40, 8, 200);
          ctx.fillRect(W * 0.05, top + 136, 160, 8);
          this.cineGlow(ctx, W * 0.05 + 114, top + 88, 120, 'rgba(224,231,255,0.35)', 1);
        } else {
          this.cineGlow(ctx, W * 0.9, top + 120, 260, 'rgba(251,191,36,0.4)', 1);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(W * 0.88, top + 90, 70, 50);
        }
        const x = left ? W * 0.24 : W * 0.76;
        const ch = left ? c.a : c.b;
        const dy = lerp(30, 0, ease(seg(t, 0, 24)));
        this.ptdHead(ctx, Object.assign({}, ch, { jerseyPrimary: '#1f2937', jerseySecondary: '#9ca3af' }), x, eyeY + dy, size, { flipX: !left, rim: left ? '#60a5fa' : '#fbbf24', rimD: 3 });
        this.ptdEyes(ctx, ch, x, eyeY + dy, u, {});
        ctx.restore();
      };
      panel(true);
      panel(false);
      // a costura do corte
      ctx.fillStyle = '#0b0f19';
      ctx.beginPath();
      ctx.moveTo(cut(0) - 5, 0);
      ctx.lineTo(cut(0) + 5, 0);
      ctx.lineTo(cut(H) + 5, H);
      ctx.lineTo(cut(H) - 5, H);
      ctx.fill();
      // a carta subindo no meio
      const ck = ease(seg(t, 40, 70));
      if (ck > 0) {
        const cw = Math.min(560, W * 0.5);
        const chh = 250;
        const cx = W / 2;
        const cy = lerp(bot + chh, (top + bot) / 2 + 30, ck);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(lerp(0.12, -0.03, ck));
        ctx.fillStyle = 'rgba(2,6,23,0.6)';
        ctx.fillRect(-cw / 2 + 10, -chh / 2 + 12, cw, chh);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-cw / 2, -chh / 2, cw, chh);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(-cw / 2, -chh / 2, cw, 10);
        ctx.fillRect(-cw / 2, chh / 2 - 10, cw, 10);
        ctx.fillStyle = '#0b0f19';
        ctx.textAlign = 'center';
        ctx.font = '900 15px "Segoe UI", sans-serif';
        ctx.fillText('BLUE LOCK • PROJETO ELO', 0, -chh / 2 + 38);
        const lines = ['VOCÊS DOIS.', 'JUNTOS.', 'OU NENHUM.'];
        lines.forEach((ln, i) => {
          const lk = seg(t, 74 + i * 16, 84 + i * 16);
          if (lk <= 0) return;
          ctx.globalAlpha = lk;
          ctx.font = `italic 900 ${i === 2 ? 46 : 40}px "Segoe UI", sans-serif`;
          ctx.fillStyle = i === 2 ? '#dc2626' : '#0b0f19';
          ctx.fillText(ln, 0, -chh / 2 + 92 + i * 52);
        });
        ctx.globalAlpha = 1;
        // o elo (duas argolas) no canto
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 5;
        [-12, 12].forEach((dx) => {
          ctx.beginPath();
          ctx.ellipse(cw / 2 - 52 + dx, chh / 2 - 44, 16, 11, 0.3, 0, TAU);
          ctx.stroke();
        });
        ctx.restore();
      }
      this.ptdSfx(S, 42, 'carta', () => window.SFX?.click?.());
      this.ptdSfx(S, 106, 'nenhum', () => window.SFX?.kick?.(0.6));
    }
  });

  const PLANES = [CE.duo0, CE.duo1, CE.duo2, CE.duo3];
  CE.registerCine('duo_ponte', {
    phases: [180, 130, 170, 210],
    letterbox: 0.1,
    grain: 0.05,
    music: 'mystery',
    title: '🌉 A PONTE VELHA',
    tags: ['PLANO 1 • A FINAL', 'PLANO 2 • O ÚLTIMO LANCE', 'PLANO 3 • OS MASCARADOS', 'PLANO 4 • A CARTA'],
    subs: [
      [{ from: 20, who: 'NARRADOR', text: 'Final do torneio de rua da Ponte Velha. Dois colégios rivais. Dois atacantes que não se suportam.', color: '#cbd5e1' }],
      [{ from: 8, who: 'NARRADOR', text: 'No último lance, os dois foram atrás da mesma bola... e ela sumiu.', color: '#cbd5e1' }],
      [{ from: 30, who: '???', text: '"Sozinhos, vocês dois são só barulho."', color: '#ef4444' }],
      [{ from: 12, who: 'NARRADOR', text: 'Naquela mesma noite, a mesma carta chegou nas duas casas.', color: '#cbd5e1' }]
    ],
    draw(ctx, S) {
      PLANES[S.phase].call(this, ctx, S);
      if (S.phase === 0 && S.t < 12) this.cineFlash(ctx, S.W, S.H, 1 - S.t / 12, '#000000');
    }
  });
})();
