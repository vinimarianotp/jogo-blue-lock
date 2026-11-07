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

  // ==========================================================================
  // CENAS DA HISTÓRIA DO ELO
  // ==========================================================================
  const ELO_KIT = { jerseyPrimary: '#111c44', jerseySecondary: '#fde047' };
  const EGO_RED = '#dc2626';

  Object.assign(CE, {
    // Antebraço em pixel com a pulseira do Elo (dir = 1 vem da esquerda, -1 da direita)
    duoWrist(ctx, x, y, dir, skin, lit, closeK = 1) {
      const px = 8;
      const len = 44;
      const h = 12;
      const x0 = dir > 0 ? x - len * px : x;
      // braço (com a manga do uniforme do Elo na ponta de fora)
      for (let c = 0; c < len; c++) {
        const sleeve = dir > 0 ? c < 14 : c >= len - 14;
        const cuff = dir > 0 ? c === 13 : c === len - 14;
        for (let r = sleeve ? -2 : 0; r < (sleeve ? h + 2 : h); r++) {
          const edge = sleeve ? r === -2 || r === h + 1 : r === 0 || r === h - 1;
          if (sleeve) ctx.fillStyle = edge ? '#050816' : cuff ? '#fde047' : r < 3 ? '#1e2b66' : '#111c44';
          else ctx.fillStyle = edge ? '#3b2416' : r < 4 ? skin : r > 8 ? '#b07a55' : skin;
          ctx.fillRect(x0 + c * px, y + r * px - (h * px) / 2, px, px);
        }
      }
      // punho fechado na ponta
      const fx = dir > 0 ? x : x - 7 * px;
      for (let c = 0; c < 7; c++) {
        for (let r = -1; r < h + 1; r++) {
          const edge = r === -1 || r === h || c === (dir > 0 ? 6 : 0);
          ctx.fillStyle = edge ? '#3b2416' : (c + r) % 3 === 0 ? '#c99472' : skin;
          ctx.fillRect(fx + c * px, y + r * px - (h * px) / 2, px, px);
        }
      }
      // a pulseira: duas metades que se fecham (closeK 0 → aberta, 1 → fechada)
      const bx = dir > 0 ? x - 14 * px : x + 6 * px;
      const gap = Math.round((1 - closeK) * 5) * px;
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(bx, y - (h / 2 + 2) * px - gap, 7 * px, (h / 2 + 2) * px);
      ctx.fillRect(bx, y + gap, 7 * px, (h / 2 + 2) * px);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(bx + px, y - (h / 2 + 1) * px - gap, 5 * px, px);
      // a luz do Elo
      ctx.fillStyle = lit ? '#fde047' : '#334155';
      ctx.fillRect(bx + 2 * px, y - px, 3 * px, 2 * px);
      return { bx: bx + 3.5 * px, by: y };
    },

    // Corrente de luz entre dois pontos (em degraus de pixel)
    duoChain(ctx, x0, y0, x1, y1, t, k = 1, color = GOLD) {
      if (k <= 0) return;
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 22));
      ctx.save();
      ctx.globalAlpha = k;
      for (let i = 0; i <= n; i++) {
        const q = i / n;
        const x = lerp(x0, x1, q);
        const y = lerp(y0, y1, q) + Math.sin(q * Math.PI) * 18 + Math.sin(t * 0.3 + i) * 3;
        ctx.fillStyle = i % 2 ? color : '#fef9c3';
        ctx.fillRect(Math.round(x / 4) * 4 - 6, Math.round(y / 4) * 4 - 4, 12, 8);
      }
      ctx.restore();
      this.cineGlow(ctx, (x0 + x1) / 2, (y0 + y1) / 2 + 12, 140, 'rgba(253,224,71,0.35)', k);
    },

    // Fundo de sala escura com o telão do Projeto (pixel)
    duoRoomBg(ctx, S, tint = '#0b1026') {
      const { W, H, top, bot } = S;
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, '#030512');
      g.addColorStop(1, tint);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(148,163,184,0.06)';
      for (let x = 0; x < W; x += 32) ctx.fillRect(x, top, 2, bot - top);
    },

    // ---------------------------------------------------------- duo_elo
    // PLANO 1 — os dois pulsos, as pulseiras fechando: CLACK
    duoElo0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(ELO_KIT, ELO_KIT);
      this.duoRoomBg(ctx, S, '#1a1240');
      const shut = ease(seg(t, 34, 44));
      const lit = t > 50;
      const y = (top + bot) / 2;
      const slide = ease(seg(t, 0, 28));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y, zoom: lerp(1, 1.06, ease(t / S.dur)), shake: t > 44 && t < 52 ? 1.5 : 0.1 });
      const a = this.duoWrist(ctx, lerp(W * 0.2, W * 0.42, slide), y - 70, 1, c.a.skinColor || '#f3d1b8', lit, shut);
      const b = this.duoWrist(ctx, lerp(W * 0.8, W * 0.58, slide), y + 70, -1, c.b.skinColor || '#f3d1b8', lit, shut);
      this.duoChain(ctx, a.bx, a.by, b.bx, b.by, t, seg(t, 56, 72));
      ctx.restore();
      if (t > 44 && t < 50) this.cineFlash(ctx, W, H, 1 - (t - 44) / 6, '#ffffff');
      this.ptdWord(ctx, 'CLACK', W * 0.5, top + 90, 80, '#f8fafc', seg(t, 44, 52), 1, -0.06);
      this.ptdChip(ctx, `${c.an} + ${c.bn} • ELO ATIVADO`, W / 2, bot - 46, GOLD, seg(t, 70, 84), { size: 16 });
      this.ptdSfx(S, 44, 'clack', () => window.SFX?.kick?.(0.7));
      this.ptdSfx(S, 56, 'luz', () => window.SFX?.jingle?.([523, 784], 0, 'square'));
    },
    // PLANO 2 — os dois rostos se encarando, a corrente de luz no meio
    duoElo1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(ELO_KIT, ELO_KIT);
      this.duoRoomBg(ctx, S, '#2a1a05');
      this.ptdRays(ctx, W / 2, H * 0.45, W, GOLD, 0.08, t * 0.002, 30);
      const eyeY = H * 0.44;
      const size = 560;
      const u = size / 36;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: eyeY, zoom: lerp(1, 1.05, ease(t / S.dur)), shake: 0.1 });
      this.ptdHead(ctx, c.a, W * 0.27, eyeY, size, { rim: GOLD, rimD: 3 });
      this.ptdEyes(ctx, c.a, W * 0.27, eyeY, u, { angry: true });
      this.ptdHead(ctx, c.b, W * 0.73, eyeY, size, { flipX: true, rim: GOLD, rimD: 3 });
      this.ptdEyes(ctx, c.b, W * 0.73, eyeY, u, { angry: true });
      ctx.restore();
      this.duoChain(ctx, W * 0.38, H * 0.78, W * 0.62, H * 0.78, t, seg(t, 4, 20));
      this.ptdWord(ctx, 'SE UM CAIR...', W / 2, top + 70, 54, '#f8fafc', seg(t, 30, 40), 1, -0.03);
      this.ptdWord(ctx, '...OS DOIS CAEM.', W / 2, top + 130, 54, EGO_RED, seg(t, 60, 70), 1, 0.03);
    },

    // ---------------------------------------------------------- duo_ressonancia
    // PLANO 1 — metade do olho de cada um, um de cada lado, e as pulseiras acendendo
    duoReso0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(ELO_KIT, ELO_KIT);
      ctx.fillStyle = '#05030f';
      ctx.fillRect(0, 0, W, H);
      const eyeY = (top + bot) / 2;
      const size = 1500;
      const u = size / 36;
      [0, 1].forEach((i) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(i ? W / 2 + 4 : 0, top, W / 2 - 4, bot - top);
        ctx.clip();
        const ch = i ? c.b : c.a;
        // cada metade mostra o olho mais perto do corte
        const cx = i ? W / 2 + 3.5 * u + W * 0.12 : W / 2 - 3.5 * u - W * 0.12;
        const ex = i ? cx - 3.5 * u : cx + 3.5 * u;
        this.ptdCloseBg(ctx, S, GOLD, ex);
        this.ptdHead(ctx, ch, cx, eyeY, size, { flipX: !!i });
        this.ptdEyes(ctx, ch, cx, eyeY, u, {});
        this.ptdEyeFlare(ctx, ex, eyeY, seg(t, 30 + i * 8, 40 + i * 8), GOLD, W * 0.4);
        ctx.restore();
      });
      ctx.fillStyle = GOLD;
      ctx.fillRect(W / 2 - 4, top, 8, bot - top);
      if (t > 50 && t < 58) this.cineFlash(ctx, W, H, 1 - (t - 50) / 8, '#fde047');
      this.ptdWord(ctx, 'NO MESMO SEGUNDO', W / 2, bot - 60, 50, '#f8fafc', seg(t, 56, 66), 1, -0.03, W * 0.8);
      this.ptdSfx(S, 50, 'reso', () => window.SFX?.jingle?.([523, 659, 784, 1047], 0, 'square'));
    },
    // PLANO 2 — os dois correndo lado a lado, aura dourada, a bola indo e voltando
    duoReso1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(ELO_KIT, ELO_KIT);
      const bg = ctx.createLinearGradient(0, top, 0, bot);
      bg.addColorStop(0, '#1a1003');
      bg.addColorStop(1, '#3f2a06');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      this.ptdSpeed(ctx, S, t, '#fde047', 0.35, 1, 60, 34);
      const feet = H * 0.86;
      const bob = (i) => Math.sin(t * 0.5 + i * 2) * 6;
      this.ptdSpr(ctx, c.a, W * 0.36, feet - 70 + bob(0), 300, { facing: 'side', animState: 'run', frame: runF(t, 3), showAura: true, auraColor: GOLD });
      this.ptdSpr(ctx, c.b, W * 0.62, feet + bob(1), 300, { facing: 'side', animState: 'run', frame: runF(t + 2, 3), showAura: true, auraColor: GOLD });
      // a bola trocando de pé entre os dois (tabela relâmpago)
      const q = (Math.sin(t * 0.18) + 1) / 2;
      this.duoBall(ctx, lerp(W * 0.42, W * 0.68, q), lerp(feet - 70, feet, q) - 4, 30);
      this.duoChain(ctx, W * 0.36, feet - 200, W * 0.62, feet - 130, t, 0.7);
      this.ptdWord(ctx, 'RESSONÂNCIA', W / 2, top + 80, 86, GOLD, seg(t, 10, 22), 1, -0.04, W * 0.8);
    },
    // PLANO 3 — o chute dos dois: a bola rasga a tela e estufa a rede
    duoReso2(ctx, S) {
      const { W, H, t, top, bot } = S;
      ctx.fillStyle = '#05030f';
      ctx.fillRect(0, 0, W, H);
      this.ptdRays(ctx, W * 0.82, H * 0.5, W * 1.2, GOLD, 0.16, t * 0.004, 40);
      // o gol em pixel no canto direito
      const gx = W * 0.74;
      const gy = H * 0.3;
      const gw = W * 0.2;
      const gh = H * 0.42;
      const bulge = ease(seg(t, 34, 44)) * (1 - seg(t, 70, 100) * 0.6);
      ctx.fillStyle = 'rgba(226,232,240,0.35)';
      for (let x = 0; x <= gw; x += 14) ctx.fillRect(gx + x + bulge * 30 * Math.sin((x / gw) * Math.PI), gy, 2, gh);
      for (let y = 0; y <= gh; y += 14) ctx.fillRect(gx + bulge * 30 * Math.sin((y / gh) * Math.PI), gy + y, gw, 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(gx - 8, gy - 8, 10, gh + 8);
      ctx.fillRect(gx - 8, gy - 8, gw + 8, 10);
      // a bola vindo de longe, com o rastro dourado
      const k = ease(seg(t, 4, 36));
      const bx = lerp(W * 0.05, gx + gw * 0.5, k);
      const by = lerp(H * 0.8, gy + gh * 0.4, k);
      if (t < 60) {
        ctx.fillStyle = GOLD;
        for (let i = 1; i < 14; i++) {
          const kk = ease(seg(t - i * 1.6, 4, 36));
          ctx.globalAlpha = 1 - i / 14;
          ctx.fillRect(lerp(W * 0.05, gx + gw * 0.5, kk) - 10, lerp(H * 0.8, gy + gh * 0.4, kk) - 10, 20, 20);
        }
        ctx.globalAlpha = 1;
        this.duoBall(ctx, bx, by + 18, 40);
      }
      if (t >= 36 && t < 44) this.cineFlash(ctx, W, H, 1 - (t - 36) / 8, '#ffffff');
      this.ptdWord(ctx, 'ATAQUE DE DUPLA', W * 0.4, top + 90, 78, GOLD, seg(t, 40, 50), 1, -0.05, W * 0.75);
      const c = this.duoCast(ELO_KIT, ELO_KIT);
      this.ptdChip(ctx, `${c.an} + ${c.bn}`, W * 0.4, bot - 50, GOLD, seg(t, 50, 62), { size: 17 });
      this.ptdSfx(S, 4, 'chute', () => window.SFX?.kick?.(1));
      this.ptdSfx(S, 36, 'rede', () => window.SFX?.goal?.(true));
    },

    // ---------------------------------------------------------- duo_regra
    // PLANO 1 — o Ego no telão: "REGRA DO UM"
    duoRegra0(ctx, S) {
      const { W, H, t, top, bot } = S;
      this.duoRoomBg(ctx, S, '#1a0508');
      const ego = this.getSpeakerCharData('JINPACHI EGO');
      const sx = W * 0.2;
      const sy = top + 30;
      const sw = W * 0.6;
      const sh = (bot - top) * 0.72;
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(sx - 14, sy - 14, sw + 28, sh + 28);
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh);
      ctx.clip();
      ctx.fillStyle = '#04120c';
      ctx.fillRect(sx, sy, sw, sh);
      const eyeY = sy + sh * 0.42;
      const size = 520;
      this.ptdHead(ctx, ego, W / 2, eyeY, size, {});
      // linhas de TV
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let y = sy; y < sy + sh; y += 4) ctx.fillRect(sx, y, sw, 2);
      ctx.fillStyle = 'rgba(0,245,212,0.06)';
      ctx.fillRect(sx, sy + ((t * 6) % sh), sw, 30);
      ctx.restore();
      this.ptdWord(ctx, 'REGRA DO UM', W / 2, bot - 70, 82, EGO_RED, seg(t, 40, 52), 1, -0.03, W * 0.8);
      this.ptdSfx(S, 40, 'regra', () => window.SFX?.jingle?.([196, 147], 0, 'sawtooth'));
    },
    // PLANO 2 — o mostrador da pulseira racha em dois placares; os dois se olham
    duoRegra1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(ELO_KIT, ELO_KIT);
      this.duoRoomBg(ctx, S, '#1a0508');
      const eyeY = H * 0.46;
      const size = 520;
      const u = size / 36;
      const split = ease(seg(t, 20, 46));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: eyeY, zoom: 1.02, shake: t > 20 && t < 30 ? 1 : 0.1 });
      this.ptdHead(ctx, c.a, W * 0.2 - split * 30, eyeY, size, { rim: EGO_RED, rimD: 3 });
      this.ptdEyes(ctx, c.a, W * 0.2 - split * 30, eyeY, u, {});
      this.ptdHead(ctx, c.b, W * 0.8 + split * 30, eyeY, size, { flipX: true, rim: EGO_RED, rimD: 3 });
      this.ptdEyes(ctx, c.b, W * 0.8 + split * 30, eyeY, u, {});
      ctx.restore();
      // o mostrador: "DUPLA" vira "0 | 0"
      const dw = 300;
      const dh = 120;
      const dx = W / 2;
      const dy = (top + bot) / 2;
      [-1, 1].forEach((s) => {
        ctx.save();
        ctx.translate(dx + s * split * 60, dy + s * split * 8);
        ctx.rotate(s * split * 0.08);
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(s < 0 ? -dw / 2 : 0, -dh / 2, dw / 2, dh);
        ctx.fillStyle = split > 0.5 ? EGO_RED : GOLD;
        ctx.font = 'italic 900 54px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (split < 0.5) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(s < 0 ? -dw / 2 : 0, -dh / 2, dw / 2, dh);
          ctx.clip();
          ctx.fillText('DUPLA', 0, 4);
          ctx.restore();
        } else ctx.fillText('0', s * dw * 0.25, 4);
        ctx.restore();
      });
      if (split > 0 && split < 1) {
        ctx.fillStyle = '#f8fafc';
        for (let y = dy - dh / 2 - 20; y < dy + dh / 2 + 20; y += 8) ctx.fillRect(dx - 2 + (rnd(y, 3) - 0.5) * 10, y, 4, 8);
      }
      this.ptdChip(ctx, 'O ELO CONTA OS GOLS DE CADA UM', W / 2, bot - 50, EGO_RED, seg(t, 60, 74), { size: 16 });
      this.ptdSfx(S, 20, 'racha', () => window.SFX?.tackle?.());
    },

    // ---------------------------------------------------------- duo_mascaras
    // PLANO 1 — o túnel: dois vultos de máscara branca contra a luz
    duoMask0(ctx, S) {
      const { W, H, t, top, bot } = S;
      ctx.fillStyle = '#020208';
      ctx.fillRect(0, 0, W, H);
      // luz do fim do túnel
      this.cineGlow(ctx, W / 2, H * 0.5, W * 0.4, 'rgba(226,232,240,0.5)', 1);
      ctx.fillStyle = 'rgba(148,163,184,0.12)';
      for (let i = 0; i < 9; i++) {
        const k = i / 9;
        const w = lerp(W * 1.2, W * 0.2, k);
        const h = lerp((bot - top) * 1.4, (bot - top) * 0.3, k);
        ctx.fillRect(W / 2 - w / 2, H / 2 - h / 2, w, 3);
        ctx.fillRect(W / 2 - w / 2, H / 2 + h / 2, w, 3);
      }
      const feet = H * 0.84;
      const walk = ease(seg(t, 0, 70));
      [0, 1].forEach((i) => {
        const m = this.duoMasked(i, { jerseyPrimary: '#0a0a0a', jerseySecondary: '#1f2937' });
        const x = W * (0.42 + i * 0.16);
        const size = lerp(200, 300, walk);
        this.ptdSpr(ctx, m, x, feet, size, { facing: 'front', animState: walk < 1 ? 'run' : 'idle', frame: walk < 1 ? runF(t, 6) : 45, tint: '#05050a' });
        const u = size / 36;
        const eyeY = feet - size * 0.87 + SPRITE_MAPY(10) * u;
        this.duoMask(ctx, x, eyeY + 0.6 * u, u, { stripe: i ? '#ef4444' : '#e5e7eb', glow: t > 80 ? (i ? '#ef4444' : '#e5e7eb') : null });
      });
      this.ptdChip(ctx, 'TÚNEL DO ESTÁDIO • LISBOA', W / 2, top + 40, '#e5e7eb', seg(t, 10, 22), { size: 15 });
    },
    // PLANO 2 — as máscaras rachando e caindo: Shion Mikami e Haru Ibuki
    duoMask1(ctx, S) {
      const { W, H, t, top, bot } = S;
      ctx.fillStyle = '#07040c';
      ctx.fillRect(0, 0, W, H);
      this.ptdRays(ctx, W / 2, H * 0.45, W, '#e5e7eb', 0.07, t * 0.002, 30);
      const eyeY = H * 0.44;
      const size = 600;
      const u = size / 36;
      const ids = ['elo_shion', 'elo_haru'];
      const names = ['SHION MIKAMI', 'HARU IBUKI'];
      const colors = ['#e5e7eb', '#ef4444'];
      [0, 1].forEach((i) => {
        const ch = this.cineChar(ids[i], { jerseyPrimary: '#0a0a0a', jerseySecondary: i ? '#dc2626' : '#e5e7eb' });
        const x = W * (0.29 + i * 0.42);
        this.ptdHead(ctx, ch, x, eyeY, size, { flipX: i === 1, rim: colors[i], rimD: 3 });
        this.ptdEyes(ctx, ch, x, eyeY, u, {});
        // a máscara: racha, depois cai girando
        const fall = easeIn(seg(t, 40 + i * 14, 80 + i * 14));
        if (fall < 1) {
          ctx.save();
          ctx.globalAlpha = 1 - fall;
          ctx.translate(x, eyeY + 0.6 * u + fall * 320);
          ctx.rotate((i ? 1 : -1) * fall * 1.2);
          this.duoMask(ctx, 0, 0, u, { stripe: i ? '#e5e7eb' : '#dc2626' });
          if (t > 26 + i * 14) {
            ctx.fillStyle = '#0b0f19';
            for (let k = 0; k < 8; k++) ctx.fillRect(-4 + (rnd(k, i + 3) - 0.5) * 30, -40 + k * 10, 6, 8);
          }
          ctx.restore();
        }
        this.ptdChip(ctx, names[i], x, bot - 46, colors[i], seg(t, 70 + i * 14, 84 + i * 14), { size: 17 });
      });
      this.ptdSfx(S, 26, 'racha', () => window.SFX?.tackle?.());
      this.ptdSfx(S, 40, 'cai', () => window.SFX?.click?.());
    },

    // ---------------------------------------------------------- duo_final
    // PLANO 1 — o estádio de Lisboa: os dois correndo para o último lance
    duoFinal0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(ELO_KIT, ELO_KIT);
      const bg = ctx.createLinearGradient(0, top, 0, bot);
      bg.addColorStop(0, '#020617');
      bg.addColorStop(0.55, '#0b1736');
      bg.addColorStop(1, '#14532d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      this.cineBokeh(ctx, W, top, H * 0.55, t, 34, ['rgba(255,236,179,0.5)', 'rgba(253,224,71,0.45)', 'rgba(147,197,253,0.4)'], 7);
      ctx.fillStyle = '#166534';
      ctx.fillRect(0, H * 0.62, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let x = 0; x < W; x += 120) ctx.fillRect(x, H * 0.62, 60, H);
      this.ptdSpeed(ctx, S, t, '#f8fafc', 0.2, 1, 50, 22, H * 0.6, bot);
      const feet = H * 0.9;
      this.ptdSpr(ctx, c.a, W * 0.34, feet, 320, { facing: 'side', animState: 'run', frame: runF(t, 3), showAura: true, auraColor: GOLD });
      this.ptdSpr(ctx, c.b, W * 0.6, feet - 40, 300, { facing: 'side', animState: 'run', frame: runF(t + 2, 3), showAura: true, auraColor: GOLD });
      this.duoBall(ctx, W * 0.47 + Math.sin(t * 0.2) * 40, feet - 10, 32);
      this.ptdChip(ctx, 'FINAL DA LIGA DOS PARES • ÚLTIMO LANCE', W / 2, top + 40, GOLD, seg(t, 8, 20), { size: 16 });
      this.ptdSfx(S, 6, 'torcida', () => window.SFX?.whoosh?.());
    },
    // PLANO 2 — o gol: rede, "GOL", e as duas pulseiras desligadas acendendo sozinhas
    duoFinal1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(ELO_KIT, ELO_KIT);
      if (t < 70) {
        this.duoReso2(ctx, Object.assign({}, S, { t: t * 0.9 }));
        this.ptdWord(ctx, 'GOOOL!', W * 0.4, (top + bot) / 2, 120, '#f8fafc', seg(t, 40, 48), 1, -0.06);
        return;
      }
      const u2 = t - 70;
      this.duoRoomBg(ctx, S, '#1a1240');
      const y = (top + bot) / 2;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y, zoom: lerp(1.08, 1, ease(seg(u2, 0, 40))), shake: 0.05 });
      const a = this.duoWrist(ctx, W * 0.44, y - 60, 1, c.a.skinColor || '#f3d1b8', u2 > 30, 1);
      const b = this.duoWrist(ctx, W * 0.56, y + 60, -1, c.b.skinColor || '#f3d1b8', u2 > 38, 1);
      this.duoChain(ctx, a.bx, a.by, b.bx, b.by, t, seg(u2, 44, 60));
      ctx.restore();
      if (u2 > 30 && u2 < 36) this.cineFlash(ctx, W, H, 1 - (u2 - 30) / 6, '#fde047');
      this.ptdWord(ctx, 'DOIS EGOS. UM GOL.', W / 2, top + 80, 64, GOLD, seg(u2, 50, 62), 1, -0.03, W * 0.85);
      this.ptdChip(ctx, `${c.an} + ${c.bn}`, W / 2, bot - 46, GOLD, seg(u2, 60, 74), { size: 17 });
      this.ptdSfx(S, 100, 'elo', () => window.SFX?.jingle?.([523, 659, 784, 1047], 0, 'square'));
    }
  });

  const reg = (id, def, planes) =>
    CE.registerCine(
      id,
      Object.assign({ letterbox: 0.1, grain: 0.05 }, def, {
        draw(ctx, S) {
          planes[S.phase].call(this, ctx, S);
          if (S.phase === 0 && S.t < 10) this.cineFlash(ctx, S.W, S.H, 1 - S.t / 10, '#000000');
        }
      })
    );
  reg(
    'duo_elo',
    {
      phases: [120, 140],
      music: 'mystery',
      title: '🔗 O ELO SE FECHA',
      tags: ['PLANO 1 • CLACK', 'PLANO 2 • PRESOS'],
      subs: [[{ from: 50, who: 'ANRI TEIERI', text: 'Elo ativado. A partir de agora, o ranking é da dupla.', color: '#38bdf8' }], [{ from: 20, who: 'JINPACHI EGO', text: '"Se um cair... os dois caem."', color: '#00f5d4' }]]
    },
    [CE.duoElo0, CE.duoElo1]
  );
  reg(
    'duo_ressonancia',
    {
      phases: [100, 110, 120],
      music: 'epic',
      title: '🔗 RESSONÂNCIA',
      tags: ['PLANO 1 • NO MESMO SEGUNDO', 'PLANO 2 • RESSONÂNCIA', 'PLANO 3 • ATAQUE DE DUPLA'],
      subs: [[{ from: 20, who: 'NARRADOR', text: 'Os dois entram no Fluxo no mesmo segundo. As pulseiras disparam.', color: '#fde047' }], [], []]
    },
    [CE.duoReso0, CE.duoReso1, CE.duoReso2]
  );
  reg(
    'duo_regra',
    {
      phases: [140, 150],
      music: 'dread',
      title: '⚖️ A REGRA DO UM',
      tags: ['PLANO 1 • O TELÃO', 'PLANO 2 • DOIS PLACARES'],
      subs: [[{ from: 14, who: 'JINPACHI EGO', text: '"A Sub-20 vai levar UM atacante do Projeto Elo. Um."', color: '#ef4444' }], [{ from: 30, who: 'NARRADOR', text: 'O mostrador da pulseira racha ao meio. Agora cada um tem o seu número.', color: '#cbd5e1' }]]
    },
    [CE.duoRegra0, CE.duoRegra1]
  );
  reg(
    'duo_mascaras',
    {
      phases: [130, 170],
      music: 'mystery',
      title: '🎭 AS MÁSCARAS CAEM',
      tags: ['PLANO 1 • O TÚNEL', 'PLANO 2 • OS ROSTOS'],
      subs: [[{ from: 30, who: 'NARRADOR', text: 'No fim do túnel, duas máscaras brancas esperando.', color: '#cbd5e1' }], [{ from: 60, who: 'NARRADOR', text: 'Shion Mikami e Haru Ibuki. A primeira dupla do Projeto Elo.', color: '#e5e7eb' }]]
    },
    [CE.duoMask0, CE.duoMask1]
  );
  reg(
    'duo_final',
    {
      phases: [120, 200],
      music: 'epic',
      title: '🏆 DOIS EGOS, UM GOL',
      tags: ['PLANO 1 • O ÚLTIMO LANCE', 'PLANO 2 • O ELO'],
      subs: [[{ from: 20, who: 'NARRADOR', text: 'Último lance da final. Lisboa inteira de pé.', color: '#fde047' }], [{ from: 90, who: 'NARRADOR', text: 'As duas pulseiras, desligadas no bolso, acendem sozinhas.', color: '#fde047' }]]
    },
    [CE.duoFinal0, CE.duoFinal1]
  );
})();
