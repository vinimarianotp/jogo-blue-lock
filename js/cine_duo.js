// ============================================================================
// CENAS DA CARREIRA EM DUPLA — "PROJETO ELO" (cine_duo)
//   duo_ponte       • a final de rua debaixo da Ponte Velha, o frente a frente, o último lance
//                     roubado pela dupla mascarada (em quadros de mangá), os mascarados sob o
//                     poste e a mesma carta nas duas casas
//   duo_elo         • o salão das trinta duplas, a pulseira fechando no pulso, presos
//   duo_ressonancia • os dois corações batendo juntos, a corrida, o chute e o gol (também é o
//                     ATAQUE DE DUPLA da partida)
//   duo_regra       • o auditório, o Ego: "UM.", a corrente entre os dois rachando
//   duo_mascaras    • o túnel de Lisboa, a máscara rachando, Shion Mikami e Haru Ibuki
//   duo_final       • Lisboa, o olhar sem olhar, o chute dos dois, o gol e as pulseiras
// Os dois protagonistas são os jogadores da dupla (CE.duoCast: A = quem fundou a dupla,
// B = o parceiro). Cor do A: ciano; do B: coral; os dois juntos: o dourado do Elo.
// Usa os helpers da cine_partida (ptd*) e da cine_kit (cine*). Helpers novos: prefixo "duo".
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine || !CE.ptdHead) return;

  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const easeIn = (x) => clamp(x) * clamp(x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const mod = (a, n) => ((a % n) + n) % n;
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  const rgbOf = (hex) => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    return m ? [1, 2, 3].map((i) => parseInt(m[i], 16)) : [253, 224, 71];
  };
  const rgba = (hex, a) => `rgba(${rgbOf(hex).join(',')},${a})`;
  const mix = (a, b, k) => {
    const A = rgbOf(a);
    const B = rgbOf(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };
  const RUN = [3, 7, 11, 15];
  const AURA = [5, 9, 13];
  const runF = (t, sp = 4) => RUN[Math.floor(t / sp) % RUN.length];
  const auraF = (t) => AURA[Math.floor(t / 6) % AURA.length];

  // Cores: A ciano, B coral, os dois juntos o dourado do Elo
  const GOLD = '#fde047';
  const CA = '#38bdf8';
  const CB = '#fb7185';
  const RED = '#dc2626';
  const INK = '#0b0a14';
  const HOKUTO = { jerseyPrimary: '#0f766e', jerseySecondary: '#f8fafc' };
  const SEIRAN = { jerseyPrimary: '#7f1d1d', jerseySecondary: '#fbbf24' };
  const ELO = { jerseyPrimary: '#111c44', jerseySecondary: '#fde047' };
  const CASUAL_A = { jerseyPrimary: '#1f2937', jerseySecondary: '#38bdf8' };
  const CASUAL_B = { jerseyPrimary: '#3f1d1d', jerseySecondary: '#fb7185' };
  const MASK_KIT = { jerseyPrimary: '#0a0a0a', jerseySecondary: '#e5e7eb' };
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

  // Fonte de 3x5 para o mostrador da pulseira
  const DIGITS = {
    0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
    5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111'
  };

  Object.assign(CE, {
    // ======================================================================
    // ELENCO E PEÇAS
    // ======================================================================
    duoCast(kitA, kitB) {
      const pl = window.Duo?.castProfiles?.() || {};
      const a = pl.a || { profile: window.App?.state?.profile };
      const b = pl.b || { profile: { name: 'Parceiro', hairColor: '#f97316', hairSecondary: '#fde047', hairStyle: 'knight_wild', eyeColor: '#38bdf8', skinColor: '#f1c9a5', number: 7 } };
      return { a: charOf(a, 'duo_a', kitA), b: charOf(b, 'duo_b', kitB), an: (a.profile?.name || 'A').toUpperCase(), bn: (b.profile?.name || 'B').toUpperCase() };
    },
    duoMasked(i, kit = MASK_KIT) {
      const base = this.cineChar(i ? 'elo_mask_2' : 'elo_mask_1');
      return Object.assign({}, base?.id ? base : MASKED[i], kit);
    },

    // Máscara branca em pixel por cima do rosto (u = px por unidade do boneco); crack 0..1
    duoMask(ctx, cx, eyeY, u, o = {}) {
      const px = Math.max(2, Math.round(u * 0.5));
      const cols = 26;
      const rows = 17;
      const x0 = Math.round(cx - (cols * px) / 2);
      const y0 = Math.round(eyeY - 7 * px);
      const inside = (c, r) => {
        const nx = (c + 0.5 - cols / 2) / (cols / 2);
        const ny = (r + 0.5 - rows * 0.42) / (rows * 0.62);
        return nx * nx + ny * ny * (ny > 0 ? 1.6 : 1) < 1;
      };
      const crack = o.crack || 0;
      // o caminho da rachadura (três galhos descendo da testa, em degraus)
      const cracked = new Set();
      if (crack > 0) {
        const len = Math.floor(crack * 26);
        [[0, 1], [1, -1], [2, 1]].forEach(([b, dir], k) => {
          let c = cols / 2 - 2 + b * 2;
          let r = 0;
          for (let i = 0; i < len - k * 5; i++) {
            r += 1;
            c += rnd(i + k * 17, (o.seed || 3) + 5) > 0.55 ? dir : 0;
            if (r >= rows) break;
            cracked.add(`${Math.round(c)},${r}`);
          }
        });
      }
      const nearCrack = (c, r) => cracked.has(`${c - 1},${r}`) || cracked.has(`${c + 1},${r}`) || cracked.has(`${c},${r - 1}`);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!inside(c, r)) continue;
          if (cracked.has(`${c},${r}`)) {
            ctx.fillStyle = '#0b0f19';
            ctx.fillRect(x0 + c * px, y0 + r * px, px, px);
            continue;
          }
          // lascas soltando em volta da rachadura (só no fim)
          if (crack > 0.72 && nearCrack(c, r) && rnd(c * 31 + r, o.seed || 3) < (crack - 0.72) * 3) continue;
          const edge = !inside(c - 1, r) || !inside(c + 1, r) || !inside(c, r - 1) || !inside(c, r + 1);
          ctx.fillStyle = edge ? '#0b0f19' : c + r < cols * 0.55 ? '#ffffff' : r > rows * 0.7 ? '#cbd5e1' : '#e2e8f0';
          ctx.fillRect(x0 + c * px, y0 + r * px, px, px);
        }
      }
      // fendas dos olhos, inclinadas para dentro
      ctx.fillStyle = '#0b0f19';
      [-1, 1].forEach((s) => {
        for (let i = 0; i < 6; i++) {
          const c = Math.round(cols / 2 + s * (2.5 + i));
          const r = 6 + (i < 2 ? 1 : 0);
          ctx.fillRect(x0 + c * px, y0 + r * px, px, px * 2);
        }
        if (o.glow) {
          ctx.fillStyle = o.glow;
          ctx.fillRect(x0 + Math.round(cols / 2 + s * 5) * px, y0 + 6 * px, px * 2, px);
          ctx.fillStyle = '#0b0f19';
        }
      });
      // a risca da dupla atravessando a máscara
      ctx.fillStyle = o.stripe || RED;
      for (let r = 1; r < rows - 2; r++) {
        const c = Math.round(cols / 2 + 1 + (r - rows / 2) * 0.4);
        if (inside(c, r)) ctx.fillRect(x0 + c * px, y0 + r * px, px, px);
      }
    },

    // Tela dividida na diagonal (o jeito das cenas de Reação Química): L e R = { color, char,
    // x, flip, eye } — cada metade com o fundo na cor, raios, linhas de velocidade e o busto
    duoSplit(ctx, S, L, R, o = {}) {
      const { W, H, t, top, bot } = S;
      const eyeY = o.eyeY || H * 0.42;
      const size = o.size || 600;
      const cut = o.cut || [W * 0.56, W * 0.44];
      const res = {};
      [
        [L, [[0, 0], [cut[0], 0], [cut[1], H], [0, H]], false, 3],
        [R, [[cut[0], 0], [W, 0], [W, H], [cut[1], H]], true, 7]
      ].forEach(([side, pts, right, seed]) => {
        if (!side) return;
        ctx.save();
        poly(ctx, pts);
        ctx.clip();
        const cx = right ? W * 0.75 : W * 0.25;
        this.ptdCloseBg(ctx, S, side.color, cx);
        this.ptdRays(ctx, cx, eyeY, W * 0.8, side.color, 0.24, t * 0.004 * (right ? -1 : 1), 36);
        this.ptdSpeed(ctx, S, t, side.color, 0.14, right ? -1 : 1, 22, 14, top, bot, seed);
        if (side.under) side.under(ctx);
        const { u } = this.ptdHead(ctx, side.char, side.x, eyeY, size, { flipX: right, rim: side.color, rimD: 4, dim: side.dim, dimTint: side.dimTint });
        this.ptdEyes(ctx, side.char, side.x, eyeY, u, Object.assign({ look: right ? -1 : 1 }, side.eye || {}));
        if (side.over) side.over(ctx, u);
        ctx.restore();
        res[right ? 'r' : 'l'] = { u, eye: { x: side.x + (right ? -3.5 : 3.5) * u, y: eyeY } };
      });
      // o corte, com faíscas correndo nas duas cores
      ctx.save();
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(cut[0], 0);
      ctx.lineTo(cut[1], H);
      ctx.stroke();
      ctx.strokeStyle = o.cutColor || '#f8fafc';
      ctx.lineWidth = 6;
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const q = mod(t * 0.02 + i / 8, 1);
        ctx.fillStyle = i % 2 ? L?.color || GOLD : R?.color || GOLD;
        ctx.fillRect(lerp(cut[0], cut[1], q) - 5 + (i % 2 ? 9 : -9), lerp(0, H, q) - 5, 10, 10);
      }
      ctx.restore();
      return res;
    },

    // A pulseira do Elo + o antebraço, em pixel (desenhado pequeno e ampliado):
    // open 0..1 (aberta → fechada), lit = LEDs acesos (0..5), num = número da dupla
    duoWristCv(skin, sleeve, open, lit, num, t, glow, mirror) {
      const w = 132;
      const h = 60;
      if (!this._duoWristCv) {
        this._duoWristCv = document.createElement('canvas');
        this._duoWristCv.width = w;
        this._duoWristCv.height = h;
      }
      const cv = this._duoWristCv;
      const g = cv.getContext('2d');
      g.clearRect(0, 0, w, h);
      const cy = 32;
      const dark = mix(skin, '#3b2416', 0.55);
      const shade = mix(skin, '#3b2416', 0.25);
      const light = mix(skin, '#ffffff', 0.25);
      // manga do uniforme (esquerda) com o punho dourado
      for (let x = 0; x < 34; x++) {
        for (let y = cy - 14; y <= cy + 14; y++) {
          const e = y === cy - 14 || y === cy + 14;
          g.fillStyle = e ? '#050816' : x >= 30 ? GOLD : y < cy - 8 ? mix(sleeve, '#ffffff', 0.18) : y > cy + 8 ? mix(sleeve, '#000000', 0.35) : sleeve;
          g.fillRect(x, y, 1, 1);
        }
      }
      // antebraço afinando até o pulso
      for (let x = 34; x < 104; x++) {
        const half = Math.round(lerp(11, 8, (x - 34) / 70));
        for (let y = cy - half; y <= cy + half; y++) {
          const e = y === cy - half || y === cy + half;
          g.fillStyle = e ? '#3b2416' : y < cy - half + 3 ? light : y > cy + half - 3 ? shade : skin;
          g.fillRect(x, y, 1, 1);
        }
      }
      // o punho fechado (dedos dobrados e o polegar)
      for (let x = 104; x < 124; x++) {
        for (let y = cy - 11; y <= cy + 11; y++) {
          const rx = (x - 114) / 10;
          const ry = (y - cy) / 11;
          if (rx * rx * 0.7 + ry * ry > 1) continue;
          const e = rx * rx * 0.7 + ry * ry > 0.82;
          const knuckle = x > 119 && (y - cy + 11) % 6 === 0;
          g.fillStyle = e || knuckle ? '#3b2416' : x < 108 ? shade : y < cy - 4 ? light : skin;
          g.fillRect(x, y, 1, 1);
        }
      }
      g.fillStyle = dark;
      g.fillRect(108, cy - 3, 8, 2);
      // a pulseira: aro de cima e de baixo fechando no pulso
      const bx = 76;
      const gap = Math.round((1 - open) * 9);
      const band = (y0, y1, upper) => {
        for (let x = bx; x < bx + 18; x++) {
          for (let y = y0; y <= y1; y++) {
            const e = x === bx || x === bx + 17 || y === y0 || y === y1;
            g.fillStyle = e ? '#020617' : y === y0 + 1 && upper ? '#475569' : (x - bx) % 6 === 0 ? '#111827' : '#1f2937';
            g.fillRect(x, y, 1, 1);
          }
        }
      };
      band(cy - 13 - gap, cy - 1 - gap, true);
      band(cy + 1 + gap, cy + 13 + gap, false);
      // dobradiça
      g.fillStyle = '#64748b';
      g.fillRect(bx + 2, cy - 2 - gap, 3, 4 + gap * 2);
      // LEDs (5) no aro de cima
      for (let i = 0; i < 5; i++) {
        const on = i < lit;
        g.fillStyle = on ? (Math.floor(t / 6 + i) % 5 === 0 ? '#ffffff' : glow || GOLD) : '#334155';
        g.fillRect(bx + 3 + i * 3, cy - 10 - gap, 2, 2);
      }
      // o mostrador com o número da dupla no aro de baixo
      if (num != null && open > 0.95) {
        g.fillStyle = '#020617';
        g.fillRect(bx + 3, cy + 3, 12, 8);
        String(num)
          .padStart(2, '0')
          .slice(-2)
          .split('')
          // no braço espelhado (o do parceiro) os números são desenhados ao contrário para lerem certo
          .map((d, k, arr) => (mirror ? arr[arr.length - 1 - k] : d))
          .forEach((d, k) => {
            const bits = DIGITS[d] || DIGITS[0];
            for (let i = 0; i < 15; i++) {
              if (bits[i] !== '1') continue;
              g.fillStyle = glow || GOLD;
              g.fillRect(bx + 4 + k * 5 + (mirror ? 2 - (i % 3) : i % 3), cy + 4 + Math.floor(i / 3), 1, 1);
            }
          });
      }
      return cv;
    },
    duoWrist(ctx, x, y, scale, flip, o) {
      const cv = this.duoWristCv(o.skin || '#f3d1b8', o.sleeve || '#111c44', o.open ?? 1, o.lit ?? 0, o.num, o.t || 0, o.glow, flip);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(x), Math.round(y));
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(cv, -cv.width * scale, -32 * scale, cv.width * scale, cv.height * scale);
      ctx.restore();
      // o ponto da pulseira (para a corrente de luz)
      return { x: x + (flip ? 1 : -1) * (cv.width - 85) * scale, y };
    },

    // Corrente de luz em elos de pixel; brk 0..1 = rachando e caindo
    duoChain(ctx, x0, y0, x1, y1, t, k = 1, color = GOLD, brk = 0) {
      if (k <= 0) return;
      const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 30));
      ctx.save();
      for (let i = 0; i <= n; i++) {
        const q = i / n;
        if (q > k) break;
        const mid = Math.abs(q - 0.5) < 0.12;
        const fall = brk > 0 && mid ? easeIn(brk) * (180 + i * 30) : 0;
        const x = lerp(x0, x1, q) + (brk > 0 && mid ? (rnd(i, 4) - 0.5) * 60 * brk : 0);
        const y = lerp(y0, y1, q) + Math.sin(q * Math.PI) * 22 + Math.sin(t * 0.25 + i) * 3 + fall;
        ctx.globalAlpha = brk > 0 && mid ? 1 - brk : 1;
        const vert = i % 2;
        ctx.fillStyle = '#020617';
        ctx.fillRect(Math.round(x) - (vert ? 7 : 12), Math.round(y) - (vert ? 12 : 7), vert ? 14 : 24, vert ? 24 : 14);
        ctx.fillStyle = mid && brk > 0 ? RED : color;
        ctx.fillRect(Math.round(x) - (vert ? 4 : 9), Math.round(y) - (vert ? 9 : 4), vert ? 8 : 18, vert ? 18 : 8);
        ctx.fillStyle = '#020617';
        ctx.fillRect(Math.round(x) - (vert ? 1 : 5), Math.round(y) - (vert ? 5 : 1), vert ? 2 : 10, vert ? 10 : 2);
      }
      ctx.restore();
      if (brk < 0.5) this.cineGlow(ctx, (x0 + x1) / 2, (y0 + y1) / 2 + 14, 160, rgba(color, 0.35), k * (1 - brk * 2));
    },

    // Batimento (eletro): a linha vem de um lado e pula a cada batida
    duoHeart(ctx, x0, x1, y, t, color, k, beat = 30, phase = 0, amp = 60) {
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.strokeStyle = rgba(color, 0.35);
      ctx.lineWidth = 12;
      const path = () => {
        ctx.beginPath();
        const dir = x1 > x0 ? 1 : -1;
        const len = Math.abs(x1 - x0);
        for (let i = 0; i <= len; i += 6) {
          const x = x0 + dir * i;
          const p = mod(i / 6 - t * 1.6 + phase, beat);
          let dy = 0;
          if (p > 4 && p < 6) dy = -amp;
          else if (p >= 6 && p < 8) dy = amp * 0.6;
          else if (p >= 8 && p < 9) dy = -amp * 0.2;
          i ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy);
        }
      };
      path();
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      path();
      ctx.stroke();
      ctx.restore();
    },

    // ======================================================================
    // CENÁRIOS
    // ======================================================================
    // A quadra debaixo da Ponte Velha à noite, em camadas: céu (lua, estrelas, cidade) e a
    // quadra (ponte, alambrado, postes) — oy desce a quadra para a câmera "baixar" do céu
    duoNight(ctx, S, o = {}) {
      const { W, H, t } = S;
      const oy = o.oy || 0;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#02030f');
      sky.addColorStop(0.6, '#140d38');
      sky.addColorStop(1, '#2a1a5a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      // estrelas piscando e a lua (sobem mais devagar que a quadra: profundidade)
      const sy = oy * 0.35;
      for (let i = 0; i < 90; i++) {
        const tw = rnd(i + Math.floor(t / 14), 9) > 0.8 ? 0.4 : 1;
        ctx.fillStyle = i % 9 ? `rgba(226,232,240,${0.6 * tw})` : '#fde68a';
        ctx.fillRect(Math.floor(rnd(i, 1) * W / 4) * 4, Math.floor((rnd(i, 2) * H * 0.7 + sy - H * 0.2) / 4) * 4, 4, 4);
      }
      const mx = W * 0.8;
      const my = H * 0.2 + sy - H * 0.2;
      this.cineGlow(ctx, mx, my, 220, 'rgba(254,243,199,0.35)', 1);
      ctx.fillStyle = '#fef3c7';
      for (let yy = -40; yy <= 40; yy += 4) {
        const half = Math.floor(Math.sqrt(1600 - yy * yy) / 4) * 4;
        ctx.fillRect(mx - half, my + yy, half * 2, 4);
      }
      ctx.fillStyle = 'rgba(203,213,225,0.55)';
      [[-14, -10, 12], [10, 8, 8], [-4, 18, 6]].forEach(([dx, dy, r]) => ctx.fillRect(mx + dx, my + dy, r, r));
      // a quadra
      const w = Math.ceil(W / 4);
      const h = Math.ceil(H / 4);
      const cv = this.ptdBg(`duo_court|${w}x${h}`, w, h, (g) => {
        // cidade ao longe
        for (let x = 0; x < w; ) {
          const bw = 8 + Math.floor(rnd(x, 3) * 18);
          const bh = 18 + Math.floor(rnd(x, 4) * 40);
          const by = Math.floor(h * 0.44) - bh;
          g.fillStyle = '#0d0a2a';
          g.fillRect(x, by, bw - 1, bh + 2);
          for (let yy = by + 3; yy < by + bh - 2; yy += 4) {
            for (let xx = x + 2; xx < x + bw - 3; xx += 3) {
              if (rnd(xx * 7 + yy, 5) > 0.7) {
                g.fillStyle = rnd(xx + yy, 6) > 0.5 ? '#fbbf24' : '#93c5fd';
                g.fillRect(xx, yy, 1, 1);
              }
            }
          }
          x += bw;
        }
        // a ponte: tabuleiro, guarda-corpo, arco e pilares
        const deckY = Math.floor(h * 0.13);
        const deckH = Math.floor(h * 0.08);
        g.fillStyle = '#0b0f1c';
        g.fillRect(0, deckY, w, deckH);
        g.fillStyle = '#334155';
        g.fillRect(0, deckY + deckH - 2, w, 2);
        g.fillStyle = '#111827';
        for (let x = 0; x < w; x += 5) g.fillRect(x, deckY - 6, 1, 6);
        g.fillRect(0, deckY - 7, w, 1);
        for (let x = 0; x < w; x++) {
          const k = (x - w / 2) / (w * 0.42);
          const y = deckY + deckH + Math.floor(Math.max(0, k * k) * h * 0.2);
          g.fillStyle = '#0b0f1c';
          g.fillRect(x, deckY + deckH, 1, Math.max(0, y - deckY - deckH));
        }
        [0.08, 0.92].forEach((fx) => {
          const px = Math.floor(w * fx) - 10;
          g.fillStyle = '#161d2e';
          g.fillRect(px, deckY, 20, Math.floor(h * 0.64) - deckY);
          g.fillStyle = '#24304a';
          g.fillRect(px + 2, deckY, 3, Math.floor(h * 0.64) - deckY);
          // pichações
          g.fillStyle = fx < 0.5 ? '#7c3aed' : '#dc2626';
          g.fillRect(px + 6, Math.floor(h * 0.42), 10, 3);
          g.fillRect(px + 8, Math.floor(h * 0.46), 7, 2);
          g.fillStyle = '#fde047';
          g.fillRect(px + 7, Math.floor(h * 0.5), 3, 3);
        });
        // postes
        [0.24, 0.5, 0.76].forEach((fx) => {
          const px = Math.floor(w * fx);
          g.fillStyle = '#05070f';
          g.fillRect(px, Math.floor(h * 0.27), 2, Math.floor(h * 0.37));
          g.fillRect(px - 4, Math.floor(h * 0.27), 10, 2);
          g.fillStyle = '#fde68a';
          g.fillRect(px - 3, Math.floor(h * 0.27) + 2, 8, 1);
        });
        // alambrado
        const fy0 = Math.floor(h * 0.42);
        const fy1 = Math.floor(h * 0.64);
        g.fillStyle = 'rgba(100,116,139,0.5)';
        for (let y = fy0; y < fy1; y++) for (let x = 0; x < w; x++) if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) g.fillRect(x, y, 1, 1);
        g.fillStyle = '#475569';
        g.fillRect(0, fy0, w, 1);
        for (let x = 0; x < w; x += 24) g.fillRect(x, fy0, 1, fy1 - fy0);
        // a quadra de asfalto, com as linhas gastas
        const gy = fy1;
        const gr = g.createLinearGradient(0, gy, 0, h);
        gr.addColorStop(0, '#1c2130');
        gr.addColorStop(1, '#2b3243');
        g.fillStyle = gr;
        g.fillRect(0, gy, w, h - gy);
        for (let i = 0; i < 500; i++) {
          g.fillStyle = i % 2 ? 'rgba(148,163,184,0.12)' : 'rgba(2,6,23,0.25)';
          g.fillRect(Math.floor(rnd(i, 8) * w), gy + Math.floor(rnd(i, 9) * (h - gy)), 1, 1);
        }
        g.fillStyle = 'rgba(226,232,240,0.5)';
        g.fillRect(Math.floor(w / 2), gy + 2, 1, h - gy);
        for (let a = 0; a < TAU; a += 0.02) g.fillRect(Math.floor(w / 2 + Math.cos(a) * w * 0.12), Math.floor(gy + (h - gy) * 0.5 + Math.sin(a) * (h - gy) * 0.22), 1, 1);
        g.fillRect(0, gy + 1, w, 1);
        // as duas gaiolas (gols de rua) nas pontas
        [[2, 1], [w - 16, -1]].forEach(([x]) => {
          g.fillStyle = '#e2e8f0';
          g.fillRect(x, gy - 10, 14, 1);
          g.fillRect(x, gy - 10, 1, 12);
          g.fillRect(x + 13, gy - 10, 1, 12);
          g.fillStyle = 'rgba(226,232,240,0.3)';
          for (let yy = gy - 8; yy < gy + 2; yy += 2) g.fillRect(x + 1, yy, 12, 1);
        });
      });
      ctx.save();
      ctx.translate(0, Math.round(oy));
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cv, 0, 0, w * 4, h * 4);
      // a molecada no alambrado com as lanternas do celular
      if (o.kids !== false) this.duoKids(ctx, S, t, H * 0.6);
      // luz dos postes
      [0.24, 0.5, 0.76].forEach((fx, i) => {
        const fl = 0.75 + 0.25 * Math.sin(t * 0.09 + i * 2) * (rnd(Math.floor(t / 9) + i, 3) > 0.1 ? 1 : 0.2);
        this.cineGlow(ctx, W * fx + 6, H * 0.28, 160, 'rgba(253,230,138,0.42)', fl * (o.lamp ?? 1));
      });
      ctx.restore();
    },

    // Silhuetas da molecada encostada no alambrado (cabeça e ombros em pixel)
    duoKids(ctx, S, t, y) {
      const { W } = S;
      ctx.save();
      for (let i = 0; i < 26; i++) {
        const x = Math.round(((i + 0.5) / 26) * W + (rnd(i, 4) - 0.5) * 30);
        if (Math.abs(x - W / 2) < 90) continue;
        const hgt = 28 + rnd(i, 5) * 12;
        const jump = Math.max(0, Math.sin(t * 0.25 + i * 1.7)) * (rnd(i, 6) > 0.6 ? 10 : 0);
        const yy = y - jump;
        ctx.fillStyle = '#05060f';
        ctx.fillRect(x - 12, yy - hgt + 14, 24, hgt);
        ctx.fillRect(x - 8, yy - hgt, 16, 16);
        // braço levantado com o celular aceso
        if (rnd(i, 7) > 0.5) {
          ctx.fillRect(x + 8, yy - hgt - 14, 6, 20);
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.fillRect(x + 8, yy - hgt - 20, 6, 6);
          this.cineGlow(ctx, x + 11, yy - hgt - 17, 26, 'rgba(255,255,255,0.4)', 0.6 + 0.4 * Math.sin(t * 0.3 + i));
        }
      }
      ctx.restore();
    },

    // Salão/auditório do Projeto Elo: o telão com o Ego, as fileiras de duplas, holofotes
    duoHall(ctx, S, o = {}) {
      const { W, H, t, top, bot } = S;
      const tone = o.tone || '#1a1240';
      const light = o.light || '191,219,254';
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, '#030512');
      g.addColorStop(1, tone);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // telão
      const sw = W * 0.42;
      const sh = H * 0.34;
      const sx = W / 2 - sw / 2;
      const sy = top + 24;
      this.duoEgoScreen(ctx, sx, sy, sw, sh, t, o);
      this.cineShafts(ctx, W / 2, sy + sh, Math.PI / 2, H * 0.7, 0.5, 5, light, 0.08, t);
      // fileiras de duplas (pares de silhuetas, cada um com a pulseira piscando)
      for (let row = 0; row < 4; row++) {
        const y = sy + sh + 50 + row * 46;
        const s = 0.55 + row * 0.18;
        const n = 10 - row;
        for (let i = 0; i < n; i++) {
          const cx = W / 2 + (i - (n - 1) / 2) * (W / (n + 1)) * (0.8 + row * 0.1);
          [-1, 1].forEach((side) => {
            const x = cx + side * 14 * s;
            ctx.fillStyle = mix('#05060f', tone, 0.25 - row * 0.05);
            ctx.fillRect(x - 10 * s, y - 24 * s, 20 * s, 34 * s);
            ctx.fillRect(x - 7 * s, y - 38 * s, 14 * s, 14 * s);
            if (rnd(i * 7 + row + (side > 0 ? 3 : 0), 11) > 0.25) {
              const on = mod(t * 0.05 + rnd(i + row * 13, 12) * 6, 6) < 3.5;
              ctx.fillStyle = on ? o.led || GOLD : '#334155';
              ctx.fillRect(x + side * 9 * s - 3, y - 2 * s, 5, 5);
            }
          });
        }
      }
      // holofotes vindo de cima
      this.cineShafts(ctx, W * 0.15, top - 10, Math.PI * 0.35, H, 0.25, 3, light, 0.06, t);
      this.cineShafts(ctx, W * 0.85, top - 10, Math.PI * 0.65, H, 0.25, 3, light, 0.06, t);
    },

    // O Ego no telão (com as linhas de TV e o letreiro)
    duoEgoScreen(ctx, x, y, w, h, t, o = {}) {
      const ego = this.getSpeakerCharData('JINPACHI EGO');
      ctx.fillStyle = '#020617';
      ctx.fillRect(x - 12, y - 12, w + 24, h + 24);
      ctx.fillStyle = o.frame || '#1e293b';
      ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = o.screen || '#03120d';
      ctx.fillRect(x, y, w, h);
      const size = o.egoSize || h * 1.5;
      const eyeY = y + h * 0.42;
      this.ptdHead(ctx, ego, x + w / 2, eyeY, size, {});
      // brilho nos óculos
      const u = size / 36;
      const glare = 0.5 + 0.5 * Math.sin(t * 0.08);
      ctx.fillStyle = `rgba(255,255,255,${0.35 + glare * 0.4})`;
      [-1, 1].forEach((s) => ctx.fillRect(x + w / 2 + s * 3.5 * u - 2.2 * u, eyeY - 1.1 * u, 1.2 * u, 0.6 * u));
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      for (let yy = y; yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 2);
      ctx.fillStyle = o.scan || 'rgba(0,245,212,0.07)';
      ctx.fillRect(x, y + mod(t * 5, h), w, 26);
      if (o.glitch && rnd(Math.floor(t / 4), 3) > 0.7) {
        ctx.fillStyle = 'rgba(220,38,38,0.25)';
        ctx.fillRect(x, y + rnd(Math.floor(t / 4), 5) * h, w, 10);
      }
      ctx.restore();
      ctx.fillStyle = o.label || '#00f5d4';
      ctx.font = '900 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(o.title || 'PROJETO ELO • TRANSMISSÃO', x + w / 2, y + h + 26);
    },

    // Túnel do estádio: luzes do teto passando e a claridade do campo no fundo
    duoTunnel(ctx, S, t, light = '226,232,240') {
      const { W, H, top, bot } = S;
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H * 0.46;
      this.cineGlow(ctx, cx, cy, W * 0.32, `rgba(${light},0.55)`, 1);
      ctx.fillStyle = `rgba(${light},0.9)`;
      ctx.fillRect(cx - W * 0.07, cy - H * 0.08, W * 0.14, H * 0.16);
      // paredes em perspectiva (anéis) e as lâmpadas do teto vindo na direção da câmera
      for (let i = 0; i < 10; i++) {
        const q = mod(i / 10 + t * 0.006, 1);
        const z = Math.pow(q, 2.2);
        const w = lerp(W * 0.16, W * 1.6, z);
        const h = lerp(H * 0.18, H * 1.7, z);
        ctx.strokeStyle = `rgba(148,163,184,${0.05 + z * 0.18})`;
        ctx.lineWidth = 2 + z * 8;
        ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
        ctx.fillStyle = `rgba(254,249,195,${0.25 + z * 0.75})`;
        ctx.fillRect(cx - (20 + z * 120) / 2, cy - h / 2 + 4, 20 + z * 120, 4 + z * 14);
        if (z > 0.3) this.cineGlow(ctx, cx, cy - h / 2 + 10, 40 + z * 200, 'rgba(254,249,195,0.25)', z);
      }
      // chão molhado refletindo
      ctx.fillStyle = 'rgba(148,163,184,0.06)';
      for (let i = 0; i < 12; i++) ctx.fillRect(cx - 6 - i * 30, cy + 40 + i * 30, 12 + i * 60, 3);
      void top;
      void bot;
    },

    // Rachadura que se espalha (em degraus de pixel) a partir de (cx, cy)
    duoCrack(ctx, cx, cy, R, k, seed = 1, color = '#020617', w = 8) {
      if (k <= 0) return;
      ctx.fillStyle = color;
      for (let b = 0; b < 7; b++) {
        let x = cx;
        let y = cy;
        let a = (b / 7) * TAU + rnd(b, seed) * 0.6;
        const len = R * (0.5 + rnd(b, seed + 1) * 0.6) * k;
        for (let d = 0; d < len; d += w) {
          a += (rnd(b * 50 + d, seed + 2) - 0.5) * 0.8;
          x += Math.cos(a) * w;
          y += Math.sin(a) * w;
          ctx.fillRect(Math.round(x / w) * w, Math.round(y / w) * w, w, w);
        }
      }
    },

    // Confete dourado e branco caindo
    duoConfetti(ctx, S, t, k = 1) {
      if (k <= 0) return;
      const { W, H } = S;
      ctx.save();
      ctx.globalAlpha = k;
      for (let i = 0; i < 90; i++) {
        const x = mod(rnd(i, 1) * W + Math.sin(t * 0.05 + i) * 30, W);
        const y = mod(rnd(i, 2) * H + t * (2 + rnd(i, 3) * 3), H + 40) - 20;
        ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? GOLD : i % 2 ? CA : CB;
        const s = 6 + (i % 3) * 3;
        ctx.fillRect(Math.round(x), Math.round(y), s, Math.abs(Math.sin(t * 0.2 + i)) * s + 2);
      }
      ctx.restore();
    },

    // A página de impacto do chute dos dois (A chuta, B é o "fantasma" atrás) e o gol de frente
    duoShotPage(ctx, S, o) {
      const { W, H, t, top } = S;
      const c = o.c;
      const hit = o.hit || 16;
      const size = 520;
      const youX = W * 0.4;
      const feet = S.bot - 6;
      const foot = { x: youX + size * 0.17, y: feet - size * 0.09 };
      const goal = { x: W * 1.05, y: H * 0.16 };
      this.ptdImpactBg(ctx, S, foot.x, foot.y, o.ink || INK, o.paper || '#fef9c3', t * 0.002);
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = CA;
      poly(ctx, [[0, 0], [W * 0.5, 0], [W * 0.38, H], [0, H]]);
      ctx.fill();
      ctx.fillStyle = CB;
      poly(ctx, [[W * 0.5, 0], [W, 0], [W, H], [W * 0.38, H]]);
      ctx.fill();
      ctx.restore();
      ctx.save();
      this.cineCamera(ctx, W, H, { zoom: 1.03 + seg(t, hit, hit + 30) * 0.04, shake: t >= hit ? 10 * (1 - seg(t, hit, hit + 22)) : 1 });
      const anim = t < hit ? 'windup' : 'shoot';
      this.ptdSpr(ctx, c.b, youX - W * 0.08, feet + 14, size * 1.12, { animState: anim, tint: CB, alpha: 0.45 * seg(t, 0, 10) });
      this.ptdSpr(ctx, c.a, youX, feet, size, { animState: anim, rim: CA, rimD: 4 });
      const sw = seg(t, hit - 4, hit + 10);
      if (sw > 0 && sw < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - sw;
        ctx.lineCap = 'round';
        [[34, CB], [22, CA], [10, '#ffffff']].forEach(([w, col]) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.arc(foot.x - 70, foot.y - 30, 150, 2.3, lerp(2.3, 0.35, ease(sw * 1.6)), true);
          ctx.stroke();
        });
        ctx.restore();
      }
      if (t < hit) {
        const q = ease(t / hit);
        this.ptdBall(ctx, lerp(W * 0.12, foot.x, q), lerp(H * 0.12, foot.y, q), 30, t);
      } else {
        this.ptdRings(ctx, foot.x, foot.y, seg(t, hit, hit + 36), [CA, CB, GOLD], 440);
        const u = easeIn(seg(t, hit + 2, hit + 34));
        const ball = (q) => ({ x: lerp(foot.x, goal.x, q), y: lerp(foot.y, goal.y, q) - Math.sin(q * Math.PI) * 40 });
        [[CA, 0], [CB, Math.PI]].forEach(([col, ph]) => {
          const pts = [];
          for (let i = 0; i < 9; i++) {
            const b = ball(Math.max(0, u - i * 0.04));
            pts.push({ x: b.x, y: b.y + Math.sin(i * 0.9 + t * 0.6 + ph) * 12 });
          }
          this.ptdStreak(ctx, pts, col, 46, 0.9);
        });
        const sq = t < hit + 5 ? 0.6 : 1;
        const b = ball(u);
        this.cineGlow(ctx, b.x, b.y, 150, rgba(GOLD, 0.85));
        this.ptdBall(ctx, b.x, b.y, 44, (t - hit) * 0.8, null, 2 - sq, sq);
      }
      ctx.restore();
      if (t >= hit) {
        this.ptdWord(ctx, o.shout || 'DOM!!', W * 0.74, top + 110, 104, GOLD, seg(t, hit, hit + 8), 1, -0.15, W * 0.52);
        this.cineFlash(ctx, W, H, 0.9 * (1 - seg(t, hit, hit + 8)));
      }
      this.ptdSfx(S, hit, 'chute', () => window.SFX?.kick?.(1));
    },
    duoGoalPlane(ctx, S, o) {
      const { W, H, t, top } = S;
      const z = easeIO(t / 80);
      const keeper = o.keeper || this.cineChar('elo_gk_final');
      const theme = o.theme || this.ptdTheme('worldcup_final');
      const hitT = 80;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: 420, zoom: lerp(0.62, 1.22, z), shake: t > hitT && t < hitT + 16 ? 6 : 2 });
      ctx.fillStyle = '#020617';
      ctx.fillRect(-W, -H, W * 3, H * 3);
      const geo = this.ptdGoalView(ctx, S, { theme, sign: o.sign || 'LIGA DOS PARES • LISBOA' });
      const reach = seg(t, 50, 84);
      this.ptdSpr(ctx, keeper, lerp(W * 0.48, W * 0.36, ease(reach)), geo.gy1 + 6 - Math.sin(reach * Math.PI * 0.8) * 60, 290, { animState: reach > 0.1 ? 'dive' : 'idle', flipX: true });
      const bulge = t > hitT ? Math.sin(seg(t, hitT, hitT + 30) * Math.PI) : 0;
      // a bola presa no fundo da rede (a rede da frente passa por cima dela)
      if (t >= hitT) this.ptdBall(ctx, W * 0.72, 300, 30, 0, GOLD);
      this.ptdGoalFront(ctx, geo, W * 0.72, 300, bulge);
      ctx.restore();
      if (t < hitT + 4) {
        const bx = lerp(W * 0.5, W * 0.72, z) + this.cineNoise(t * 3, 1) * 4;
        const by = lerp(H * 0.82, H * 0.4, z) + this.cineNoise(t * 3, 2) * 4;
        const r = lerp(80, 36, z);
        [[CA, 0], [CB, Math.PI]].forEach(([col, ph]) => {
          const tail = [];
          for (let i = 0; i < 9; i++) {
            const q = Math.max(0, z - i * 0.05);
            const wob = Math.sin(i * 0.8 - t * 0.35 + ph) * r * 0.35;
            tail.push({ x: lerp(W * 0.5, W * 0.72, q) - i * 8 + wob, y: lerp(H * 0.82, H * 0.4, q) + i * 30 });
          }
          this.ptdStreak(ctx, tail, col, r * 1.1, 0.85);
        });
        this.ptdBall(ctx, bx, by, r, t * 0.8, GOLD);
      }
      if (t >= hitT) {
        if (t < hitT + 8) this.cineFlash(ctx, W, H, 1 - (t - hitT) / 8, '#ffffff');
        this.duoConfetti(ctx, S, t - hitT, seg(t, hitT, hitT + 10));
        this.ptdWord(ctx, o.word || 'GOL DO ELO!!', W / 2, top + 100, 96, GOLD, seg(t, hitT, hitT + 8), 1, -0.05, W * 0.85);
        if (o.sub) this.ptdChip(ctx, o.sub, W / 2, top + 170, GOLD, seg(t, hitT + 14, hitT + 26), { size: 16 });
      }
      this.ptdSfx(S, hitT, 'rede', () => window.SFX?.goal?.(true));
    },

    // ======================================================================
    // duo_ponte — A PONTE VELHA
    // ======================================================================
    // PLANO 1 — a câmera desce do céu (lua, estrelas) até a quadra: a molecada no
    // alambrado, os dois chegando cada um de um lado, o título da final
    duoPonte0(ctx, S) {
      const { W, H, t, bot } = S;
      const c = this.duoCast(HOKUTO, SEIRAN);
      const pan = easeIO(seg(t, 0, 110));
      this.duoNight(ctx, S, { oy: lerp(H * 0.85, 0, pan) });
      this.cineRain(ctx, W, H, t, 0.12, 80, 0.2);
      // os dois entrando de lados opostos, devagar, até se encararem no meio
      const walk = ease(seg(t, 70, 150));
      const feet = H * 0.92 + lerp(H * 0.85, 0, pan);
      const ax = lerp(-W * 0.05, W * 0.33, walk);
      const bx = lerp(W * 1.05, W * 0.67, walk);
      const moving = walk > 0 && walk < 1;
      this.ptdSpr(ctx, c.a, ax, feet, 250, { facing: 'side', animState: moving ? 'run' : 'idle', frame: moving ? runF(t, 6) : 45 });
      this.ptdSpr(ctx, c.b, bx, feet, 250, { facing: 'side', animState: moving ? 'run' : 'idle', frame: moving ? runF(t + 3, 6) : 45, flipX: true });
      this.ptdBall(ctx, W / 2, feet - 16, 16, 0);
      this.cineVignette(ctx, W, H, 0.5);
      this.cineTitleCard(ctx, W, H * 0.3, seg(t, 120, 140) * (1 - seg(t, 160, 170)), { kicker: 'MEIA-NOITE • FINAL', title: 'TORNEIO DE RUA DA PONTE VELHA', sub: 'Colégio Hokuto  x  Colégio Seiran', color: GOLD });
      this.ptdSfx(S, 70, 'passos', () => window.SFX?.whoosh?.());
      void bot;
    },

    // PLANO 2 — frente a frente na tela dividida: os olhos acendem e o raio cruza o corte
    duoPonte1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(HOKUTO, SEIRAN);
      const k = ease(t / 30);
      const lit = seg(t, 34, 42);
      const r = this.duoSplit(
        ctx,
        S,
        { color: CA, char: c.a, x: lerp(-W * 0.2, W * 0.27, k), eye: { angry: true, ring: lit > 0 ? CA : undefined } },
        { color: CB, char: c.b, x: lerp(W * 1.2, W * 0.73, k), eye: { angry: true, ring: lit > 0 ? CB : undefined } }
      );
      const fade = 1 - seg(t, 90, 115) * 0.6;
      this.ptdEyeFlare(ctx, r.l.eye.x, r.l.eye.y, lit * fade, CA, W * 0.5);
      this.ptdEyeFlare(ctx, r.r.eye.x, r.r.eye.y, lit * fade, CB, W * 0.5);
      const bk = seg(t, 40, 48) * (1 - seg(t, 80, 100));
      this.ptdBolt(ctx, r.l.eye.x, r.l.eye.y, W / 2, r.l.eye.y - 30, CA, bk, t, 1);
      this.ptdBolt(ctx, W / 2, r.l.eye.y - 30, r.r.eye.x, r.r.eye.y, CB, bk, t, 2);
      if (bk > 0) this.cineGlow(ctx, W / 2, r.l.eye.y - 30, 100, 'rgba(255,255,255,0.9)', bk);
      this.ptdWord(ctx, 'VS', W / 2, H * 0.68, 130, '#f8fafc', seg(t, 46, 54), 1, -0.08);
      this.ptdWord(ctx, 'HOKUTO', W * 0.24, bot - 70, 64, CA, seg(t, 54, 62), 1, -0.05);
      this.ptdWord(ctx, 'SEIRAN', W * 0.77, bot - 70, 64, CB, seg(t, 58, 66), 1, -0.05);
      this.ptdChip(ctx, c.an, W * 0.24, top + 38, CA, seg(t, 14, 26), { size: 17 });
      this.ptdChip(ctx, c.bn, W * 0.76, top + 38, CB, seg(t, 20, 32), { size: 17 });
      this.ptdSfx(S, 42, 'zap', () => window.SFX?.jingle?.([988, 1319], 0, 'square'));
    },

    // PLANO 3 — o último lance: os dois na mesma bola e, em três quadros de mangá, os
    // mascarados levam ela: o roubo, o toque entre eles, a bola na gaiola
    duoPonte2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(HOKUTO, SEIRAN);
      const freeze = 62;
      if (t < freeze) {
        // câmera baixa, rente ao asfalto: os dois arrancando para a bola
        ctx.save();
        this.cineCamera(ctx, W, H, { x: W / 2, y: H * 0.7, zoom: lerp(1.05, 1.25, easeIn(t / freeze)), shake: lerp(0.3, 2.2, t / freeze) });
        this.duoNight(ctx, S, { lamp: 0.8 });
        this.ptdSpeed(ctx, S, t, '#e2e8f0', 0.22, 1, 50, 26);
        const feet = H * 0.92;
        const run = ease(seg(t, 0, freeze));
        const ax = lerp(W * 0.06, W * 0.42, run);
        const bx = lerp(W * 0.94, W * 0.58, run);
        // poeira atrás dos dois
        ctx.fillStyle = 'rgba(203,213,225,0.5)';
        for (let i = 0; i < 10; i++) {
          const a = mod(t * 2 + i * 7, 30);
          ctx.fillRect(ax - 50 - a * 4, feet - 6 - a * 0.8 - rnd(i, 3) * 20, 6, 6);
          ctx.fillRect(bx + 44 + a * 4, feet - 6 - a * 0.8 - rnd(i, 4) * 20, 6, 6);
        }
        this.ptdSpr(ctx, c.a, ax, feet, 300, { facing: 'side', animState: 'run', frame: runF(t, 3), rim: CA, rimD: 3 });
        this.ptdSpr(ctx, c.b, bx, feet, 300, { facing: 'side', animState: 'run', frame: runF(t + 2, 3), flipX: true, rim: CB, rimD: 3 });
        this.ptdBall(ctx, W / 2, feet - 18, 20, t * 0.2);
        ctx.restore();
        this.ptdWord(ctx, 'MINHA!!', W * 0.26, top + 90, 60, CA, seg(t, 26, 34), 1, -0.1);
        this.ptdWord(ctx, 'MINHA!!', W * 0.74, top + 140, 60, CB, seg(t, 32, 40), 1, 0.1);
        this.ptdSfx(S, 2, 'arranque', () => window.SFX?.whoosh?.());
        return;
      }
      // os três quadros (papel preto com tinta vermelha)
      const u = t - freeze;
      ctx.fillStyle = '#05030a';
      ctx.fillRect(0, 0, W, H);
      if (u < 6) this.cineFlash(ctx, W, H, 1 - u / 6, '#ffffff');
      const m0 = this.duoMasked(0);
      const m1 = this.duoMasked(1);
      const panels = [
        { at: 0, pts: [[W * 0.02, top + 14], [W * 0.36, top + 14], [W * 0.31, bot - 14], [W * 0.02, bot - 14]], cx: W * 0.18 },
        { at: 20, pts: [[W * 0.38, top + 14], [W * 0.68, top + 14], [W * 0.63, bot - 14], [W * 0.33, bot - 14]], cx: W * 0.5 },
        { at: 40, pts: [[W * 0.7, top + 14], [W * 0.98, top + 14], [W * 0.98, bot - 14], [W * 0.65, bot - 14]], cx: W * 0.82 }
      ];
      panels.forEach((p, i) => {
        const k = ease(seg(u, p.at, p.at + 10));
        if (k <= 0) return;
        this.ptdPanel(
          ctx,
          p.pts,
          () => {
            const pt = u - p.at;
            ctx.fillStyle = i === 2 ? '#0b0f19' : '#1a0306';
            ctx.fillRect(0, 0, W, H);
            this.ptdRays(ctx, p.cx, H * 0.5, W * 0.5, i === 2 ? '#e2e8f0' : RED, 0.25, pt * 0.004, 26);
            if (i === 0) {
              // o roubo: o pé de máscara branca tirando a bola do meio dos dois (de calcanhar)
              const feet = bot - 20;
              this.ptdSpr(ctx, c.a, p.cx - 120, feet + 30, 300, { facing: 'side', animState: 'dive', dim: 0.5, dimTint: '20,0,10' });
              this.ptdSpr(ctx, m0, p.cx + 10, feet, 340, { facing: 'side', animState: 'rabona', frame: 45, tint: '#020205' });
              const mu = 340 / 36;
              this.duoMask(ctx, p.cx + 14, feet - 340 * 0.87 + SPRITE_MAPY(10) * mu + 0.6 * mu, mu, { stripe: '#e5e7eb', glow: '#e5e7eb' });
              this.ptdBall(ctx, p.cx + lerp(-30, 80, ease(seg(pt, 4, 20))), feet - 40 - Math.sin(seg(pt, 4, 20) * Math.PI) * 60, 20, pt * 0.5, '#e5e7eb');
              this.ptdWord(ctx, 'TOC.', p.cx, top + 90, 54, '#f8fafc', seg(pt, 6, 12), 1, -0.1);
            } else if (i === 1) {
              // o toque entre os dois mascarados: o raio branco e vermelho
              const feet = H * 0.78;
              this.ptdSpr(ctx, m0, p.cx - 90, feet, 230, { facing: 'side', animState: 'shoot', frame: 45, tint: '#020205' });
              this.ptdSpr(ctx, m1, p.cx + 90, feet - 40, 230, { facing: 'side', animState: 'run', frame: runF(pt, 3), flipX: true, tint: '#020205' });
              const mu = 230 / 36;
              this.duoMask(ctx, p.cx - 86, feet - 230 * 0.87 + SPRITE_MAPY(10) * mu + 0.6 * mu, mu, { stripe: '#e5e7eb', glow: '#e5e7eb' });
              this.duoMask(ctx, p.cx + 86, feet - 40 - 230 * 0.87 + SPRITE_MAPY(10) * mu + 0.6 * mu, mu, { stripe: RED, glow: '#ef4444' });
              const q = ease(seg(pt, 4, 22));
              this.ptdBolt(ctx, p.cx - 60, feet - 40, p.cx + 60, feet - 90, RED, seg(pt, 4, 10), pt, 4);
              this.ptdBall(ctx, lerp(p.cx - 60, p.cx + 60, q), lerp(feet - 40, feet - 90, q), 18, pt, '#ef4444');
            } else {
              // a gaiola: a bola estufa a rede
              const gx = p.cx - 120;
              const gy = H * 0.42;
              const bulge = Math.sin(seg(pt, 8, 30) * Math.PI);
              ctx.fillStyle = 'rgba(226,232,240,0.4)';
              for (let x = 0; x <= 240; x += 16) ctx.fillRect(gx + x + bulge * 26 * Math.sin((x / 240) * Math.PI), gy, 3, 200);
              for (let y = 0; y <= 200; y += 16) ctx.fillRect(gx + bulge * 20, gy + y + bulge * 16 * Math.sin((y / 200) * Math.PI), 240, 3);
              ctx.fillStyle = '#f8fafc';
              ctx.fillRect(gx - 10, gy - 10, 12, 210);
              ctx.fillRect(gx + 238, gy - 10, 12, 210);
              ctx.fillRect(gx - 10, gy - 10, 260, 12);
              const q = ease(seg(pt, 0, 10));
              this.ptdBall(ctx, lerp(p.cx - 200, p.cx + 10, q), lerp(bot, gy + 110, q), 26, pt);
              this.ptdWord(ctx, 'GOL.', p.cx, bot - 80, 70, '#f8fafc', seg(pt, 10, 18), 1, -0.06);
            }
          },
          { border: '#f8fafc', width: 6, dx: (1 - k) * 60, dy: 0 }
        );
      });
      this.ptdSfx(S, freeze, 'roubo', () => window.SFX?.kick?.(0.6));
      this.ptdSfx(S, freeze + 48, 'gaiola', () => window.SFX?.post?.());
    },

    // PLANO 4 — os mascarados sob o poste: os dois no chão de costas, e o close da máscara
    duoPonte3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(HOKUTO, SEIRAN);
      if (t < 84) {
        ctx.save();
        this.cineCamera(ctx, W, H, { x: W / 2, y: H * 0.55, zoom: lerp(1.0, 1.12, ease(t / 84)), shake: 0.1 });
        this.duoNight(ctx, S, { lamp: 0.5, kids: false });
        ctx.fillStyle = 'rgba(2,3,10,0.45)';
        ctx.fillRect(-20, -20, W + 40, H + 40);
        // o cone de luz do poste em cima dos mascarados
        this.cineShafts(ctx, W * 0.5 + 6, H * 0.28, Math.PI / 2, H * 0.7, 0.45, 6, '254,243,199', 0.1, t);
        [0, 1].forEach((i) => {
          const m = this.duoMasked(i);
          const x = W * (0.45 + i * 0.1);
          const feet = H * 0.72;
          this.ptdSpr(ctx, m, x, feet, 230, { facing: 'front', animState: 'idle', frame: 45 + i, rim: i ? '#ef4444' : '#e5e7eb', rimD: 3, dim: 0.55, dimTint: '2,2,8' });
          const mu = 230 / 36;
          this.duoMask(ctx, x, feet - 230 * 0.87 + SPRITE_MAPY(10) * mu + 0.6 * mu, mu, { stripe: i ? RED : '#e5e7eb', glow: t > 40 ? (i ? '#ef4444' : '#e5e7eb') : null });
        });
        // os dois, de costas, no chão em primeiro plano
        this.ptdSpr(ctx, c.a, W * 0.18, bot + 140, 560, { facing: 'back', animState: 'hurt', dim: 0.6, dimTint: '2,6,23' });
        this.ptdSpr(ctx, c.b, W * 0.84, bot + 160, 560, { facing: 'back', animState: 'hurt', flipX: true, dim: 0.6, dimTint: '2,6,23' });
        ctx.restore();
        this.cineRain(ctx, W, H, t, 0.15, 90, 0.2);
        this.ptdChip(ctx, '??? & ???', W / 2, top + 40, RED, seg(t, 14, 26), { size: 18 });
        return;
      }
      // close: a máscara branca no papel preto com tinta vermelha
      const u2 = t - 84;
      this.ptdImpactBg(ctx, S, W / 2, H * 0.45, '#2a0308', '#0a0306', u2 * 0.003);
      const eyeY = H * 0.44;
      const size = 900;
      const mu = size / 36;
      const m = this.duoMasked(0);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: eyeY, zoom: lerp(1.08, 1, ease(u2 / 30)), shake: u2 < 8 ? 2 : 0.1 });
      this.ptdHead(ctx, m, W / 2, eyeY, size, { tint: '#050206' });
      this.duoMask(ctx, W / 2, eyeY + 0.6 * mu, mu, { stripe: RED, glow: '#ffffff' });
      ctx.restore();
      if (u2 < 6) this.cineFlash(ctx, W, H, 1 - u2 / 6, '#ffffff');
      this.ptdWord(ctx, 'SÓ BARULHO.', W / 2, bot - 76, 70, '#f8fafc', seg(u2, 20, 28), 1, -0.03, W * 0.7);
      this.ptdSfx(S, 84, 'mascara', () => window.SFX?.jingle?.([220, 196], 0, 'square'));
    },

    // PLANO 5 — a carta: as duas casas (chuva na janela), o envelope abrindo e a carta
    // subindo no meio: "VOCÊS DOIS. JUNTOS. OU NENHUM." — e os olhos dos dois acendem
    duoPonte4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(CASUAL_A, CASUAL_B);
      const eyeY = H * 0.4;
      const size = 520;
      const u = size / 36;
      const cut = (y) => W * 0.5 + (y - H / 2) * 0.18;
      const room = (left) => {
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
        g.addColorStop(0, left ? '#060f2c' : '#220f05');
        g.addColorStop(1, left ? '#0f2a5a' : '#4a230b');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // janela com chuva (A) / abajur e pôster (B)
        if (left) {
          const wx = W * 0.04;
          ctx.fillStyle = '#0b1a44';
          ctx.fillRect(wx, top + 30, 190, 230);
          ctx.save();
          ctx.beginPath();
          ctx.rect(wx, top + 30, 190, 230);
          ctx.clip();
          this.cineRain(ctx, W, H, t, 0.45, 60, 0.15);
          ctx.restore();
          ctx.fillStyle = '#05091c';
          ctx.fillRect(wx + 91, top + 30, 8, 230);
          ctx.fillRect(wx, top + 140, 190, 8);
          this.cineGlow(ctx, wx + 140, top + 80, 120, 'rgba(191,219,254,0.3)', 1);
          // pôster de chuteira na parede
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(W * 0.34, top + 50, 90, 120);
          ctx.fillStyle = CA;
          ctx.fillRect(W * 0.34 + 18, top + 110, 54, 18);
        } else {
          this.cineGlow(ctx, W * 0.9, top + 130, 280, 'rgba(251,191,36,0.42)', 0.9 + 0.1 * Math.sin(t * 0.2));
          ctx.fillStyle = '#78350f';
          ctx.fillRect(W * 0.87, top + 96, 80, 54);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(W * 0.87 + 30, top + 150, 20, 60);
          ctx.fillStyle = '#7f1d1d';
          ctx.fillRect(W * 0.6, top + 50, 90, 120);
          ctx.fillStyle = CB;
          ctx.fillRect(W * 0.6 + 18, top + 70, 54, 54);
        }
        const x = left ? W * 0.24 : W * 0.76;
        const ch = left ? c.a : c.b;
        const dy = lerp(30, 0, ease(seg(t, 0, 24)));
        const lit = seg(t, 150, 162);
        this.ptdHead(ctx, ch, x, eyeY + dy, size, { flipX: !left, rim: left ? '#60a5fa' : '#fbbf24', rimD: 3 });
        this.ptdEyes(ctx, ch, x, eyeY + dy, u, { ring: lit > 0 ? GOLD : undefined, look: left ? 1 : -1 });
        if (lit > 0) this.ptdEyeFlare(ctx, x + (left ? 3.5 : -3.5) * u, eyeY + dy, lit, GOLD, W * 0.3);
        // o envelope na mão, inclinado, abrindo (com o lacre azul do Blue Lock)
        const flap = ease(seg(t, 24, 40));
        ctx.save();
        ctx.translate(left ? x + 120 : x - 120, H * 0.66);
        ctx.rotate(left ? -0.18 : 0.18);
        const ew = 104;
        const eh = 66;
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(-ew / 2 - 4, -eh / 2 - 4, ew + 8, eh + 8);
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(-ew / 2, -eh / 2, ew, eh);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-ew / 2, eh / 2);
        ctx.lineTo(0, 4);
        ctx.lineTo(ew / 2, eh / 2);
        ctx.stroke();
        ctx.fillStyle = flap > 0.5 ? '#e2e8f0' : '#cbd5e1';
        poly(ctx, [[-ew / 2, -eh / 2], [0, -eh / 2 + 34 - flap * 70], [ew / 2, -eh / 2]]);
        ctx.fill();
        ctx.strokeStyle = '#0b0f19';
        ctx.stroke();
        if (flap < 0.6) {
          ctx.fillStyle = '#1d4ed8';
          ctx.fillRect(-9, -eh / 2 + 22, 18, 18);
        }
        ctx.restore();
        ctx.restore();
      };
      room(true);
      room(false);
      ctx.fillStyle = '#0b0f19';
      poly(ctx, [[cut(0) - 5, 0], [cut(0) + 5, 0], [cut(H) + 5, H], [cut(H) - 5, H]]);
      ctx.fill();
      // a carta subindo no meio
      const ck = ease(seg(t, 40, 70));
      if (ck > 0) {
        const cw = Math.min(600, W * 0.5);
        const chh = 270;
        ctx.save();
        ctx.translate(W / 2, lerp(bot + chh, (top + bot) / 2 + 20, ck));
        ctx.rotate(lerp(0.12, -0.03, ck));
        ctx.fillStyle = 'rgba(2,6,23,0.6)';
        ctx.fillRect(-cw / 2 + 12, -chh / 2 + 14, cw, chh);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-cw / 2, -chh / 2, cw, chh);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(-cw / 2, -chh / 2, cw, 12);
        ctx.fillRect(-cw / 2, chh / 2 - 12, cw, 12);
        ctx.fillStyle = '#0b0f19';
        ctx.textAlign = 'center';
        ctx.font = '900 15px "Segoe UI", sans-serif';
        ctx.fillText('BLUE LOCK • PROJETO ELO • CONVOCAÇÃO', 0, -chh / 2 + 40);
        ['VOCÊS DOIS.', 'JUNTOS.', 'OU NENHUM.'].forEach((ln, i) => {
          const lk = seg(t, 74 + i * 18, 92 + i * 18);
          if (lk <= 0) return;
          ctx.font = `italic 900 ${i === 2 ? 50 : 42}px "Segoe UI", sans-serif`;
          ctx.fillStyle = i === 2 ? RED : '#0b0f19';
          ctx.fillText(this.cineType(ln, lk), 0, -chh / 2 + 98 + i * 56);
        });
        // o símbolo do Elo (duas argolas entrelaçadas) carimbado no canto
        const sk = seg(t, 132, 140);
        if (sk > 0) {
          ctx.save();
          ctx.translate(cw / 2 - 64, chh / 2 - 52);
          ctx.rotate(-0.2);
          ctx.scale(lerp(1.8, 1, sk), lerp(1.8, 1, sk));
          ctx.globalAlpha = sk;
          ctx.strokeStyle = '#1d4ed8';
          ctx.lineWidth = 6;
          [-13, 13].forEach((dx) => {
            ctx.beginPath();
            ctx.ellipse(dx, 0, 20, 13, 0.3, 0, TAU);
            ctx.stroke();
          });
          ctx.restore();
        }
        ctx.restore();
      }
      this.ptdSfx(S, 26, 'envelope', () => window.SFX?.click?.());
      this.ptdSfx(S, 110, 'nenhum', () => window.SFX?.kick?.(0.6));
      this.ptdSfx(S, 150, 'olhos', () => window.SFX?.jingle?.([523, 784], 0, 'triangle'));
    },

    // ======================================================================
    // duo_elo — O ELO SE FECHA
    // ======================================================================
    // PLANO 1 — o salão: trinta duplas, o Ego no telão, os dois de costas na frente
    duoElo0(ctx, S) {
      const { W, H, t, bot } = S;
      const c = this.duoCast(ELO, ELO);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H * 0.45, zoom: lerp(1, 1.1, ease(t / S.dur)), shake: 0.08 });
      this.duoHall(ctx, S, { tone: '#140d38' });
      ctx.restore();
      this.ptdSpr(ctx, c.a, W * 0.2, bot + 170, 500, { facing: 'back', animState: 'idle', frame: 45, rim: CA, rimD: 3, dim: 0.35, dimTint: '2,6,23' });
      this.ptdSpr(ctx, c.b, W * 0.81, bot + 180, 500, { facing: 'back', animState: 'idle', frame: 46, flipX: true, rim: CB, rimD: 3, dim: 0.35, dimTint: '2,6,23' });
      this.ptdChip(ctx, 'PROJETO ELO • 30 DUPLAS • 60 ATACANTES', W / 2, S.top + 40, GOLD, seg(t, 20, 34), { size: 16 });
      this.ptdSfx(S, 10, 'salao', () => window.SFX?.jingle?.([196, 262], 0, 'triangle'));
    },
    // PLANO 2 — a pulseira em close: abre, fecha no pulso (CLACK), os LEDs acendem um a
    // um e o mostrador mostra o número da dupla; o pulso do parceiro entra do outro lado
    duoElo1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(ELO, ELO);
      ctx.fillStyle = '#05040f';
      ctx.fillRect(0, 0, W, H);
      this.ptdRays(ctx, W / 2, H / 2, W, GOLD, 0.06, t * 0.002, 28);
      const shut = ease(seg(t, 30, 38));
      const lit = Math.floor(clamp((t - 44) / 30) * 5);
      const slideB = ease(seg(t, 70, 96));
      // no fim, o punho do parceiro entra pela direita e os dois batem punho com punho
      const s = 7;
      const C = W / 2;
      const bump = t >= 96;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: lerp(1.08, 1, ease(t / 40)), shake: t > 36 && t < 46 ? 2 : bump && t < 104 ? 3 : 0.1 });
      const y = (top + bot) / 2;
      const a = this.duoWrist(ctx, lerp(W * 0.72, C + 8 * s, slideB), y, s, false, { skin: c.a.skinColor, sleeve: '#111c44', open: shut, lit, num: 27, t, glow: GOLD });
      if (slideB > 0) this.duoWrist(ctx, lerp(W * 1.5, C - 8 * s, slideB), y, s, true, { skin: c.b.skinColor, sleeve: '#111c44', open: 1, lit: 5, num: 27, t, glow: GOLD });
      if (bump) {
        this.ptdRings(ctx, C, y, seg(t, 96, 124), [GOLD, CA, CB], 420);
        this.cineGlow(ctx, C, y, 220, 'rgba(253,224,71,0.6)', 1 - seg(t, 96, 130));
      }
      ctx.restore();
      if (bump && t < 102) this.cineFlash(ctx, W, H, 1 - (t - 96) / 6, '#fde047');
      this.ptdWord(ctx, 'TOC.', W * 0.5, top + 80, 70, GOLD, seg(t, 96, 102), 1, 0.06);
      this.ptdSfx(S, 96, 'soquinho', () => window.SFX?.kick?.(0.5));
      if (t > 36 && t < 42) this.cineFlash(ctx, W, H, 1 - (t - 36) / 6, '#ffffff');
      // faíscas da trava
      if (t > 36 && t < 60) {
        ctx.fillStyle = GOLD;
        for (let i = 0; i < 14; i++) {
          const q = (t - 36) / 24;
          const ang = rnd(i, 3) * TAU;
          ctx.fillRect(a.x + Math.cos(ang) * q * 200, y + Math.sin(ang) * q * 140, 8, 8);
        }
      }
      this.ptdWord(ctx, 'CLACK', W * 0.3, top + 90, 96, '#f8fafc', seg(t, 36, 44), 1 - seg(t, 80, 92), -0.08);
      if (lit >= 5) this.ptdChip(ctx, `DUPLA 27 • ${c.an} + ${c.bn}`, W / 2, bot - 46, GOLD, seg(t, 76, 88), { size: 16 });
      this.ptdSfx(S, 36, 'clack', () => window.SFX?.kick?.(0.8));
      this.ptdSfx(S, 46, 'led', () => window.SFX?.jingle?.([523, 659, 784, 988, 1175], 0, 'square'));
    },
    // PLANO 3 — presos: tela dividida, a corrente de luz atravessando o corte
    duoElo2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(ELO, ELO);
      const k = ease(t / 26);
      this.duoSplit(ctx, S, { color: CA, char: c.a, x: lerp(-W * 0.1, W * 0.27, k), eye: { angry: true } }, { color: CB, char: c.b, x: lerp(W * 1.1, W * 0.73, k), eye: { angry: true } }, { cutColor: GOLD });
      this.duoChain(ctx, W * 0.3, H * 0.8, W * 0.7, H * 0.8, t, seg(t, 14, 40));
      this.ptdWord(ctx, 'SE UM CAIR...', W / 2, top + 80, 58, '#f8fafc', seg(t, 46, 56), 1, -0.03);
      this.ptdWord(ctx, '...OS DOIS CAEM.', W / 2, top + 150, 64, RED, seg(t, 80, 90), 1, 0.03);
      this.ptdSfx(S, 80, 'caem', () => window.SFX?.jingle?.([196, 147], 0, 'sawtooth'));
      void bot;
    },

    // ======================================================================
    // duo_ressonancia — RESSONÂNCIA / ATAQUE DE DUPLA
    // ======================================================================
    // PLANO 1 — os batimentos: o do A (ciano) e o do B (coral) se encontram e viram um só
    duoReso0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(ELO, ELO);
      const sync = seg(t, 40, 52);
      this.duoSplit(ctx, S, { color: CA, char: c.a, x: W * 0.24, eye: { ring: sync > 0 ? GOLD : undefined } }, { color: CB, char: c.b, x: W * 0.76, eye: { ring: sync > 0 ? GOLD : undefined } }, { size: 700, eyeY: H * 0.46, cutColor: sync > 0 ? GOLD : '#f8fafc' });
      // eletro: cada um vem do seu lado, no começo fora de ritmo; depois batem juntos
      const y = top + 70;
      this.duoHeart(ctx, 0, W / 2, y, t, sync > 0.5 ? GOLD : CA, 1, 30, 0, 50);
      this.duoHeart(ctx, W, W / 2, y, t, sync > 0.5 ? GOLD : CB, 1, 30, sync > 0.5 ? 0 : 13, 50);
      if (sync > 0) {
        const pulse = mod(t, 30) < 4 ? 1 : 0;
        this.cineGlow(ctx, W / 2, y, 140 + pulse * 60, 'rgba(253,224,71,0.6)', sync);
        this.ptdWord(ctx, 'TUM-TUM', W / 2, y + 60, 40, GOLD, sync, 1, -0.04);
      }
      if (t > 52 && t < 58) this.cineFlash(ctx, W, H, 1 - (t - 52) / 6, '#fde047');
      this.ptdWord(ctx, 'NO MESMO SEGUNDO', W / 2, bot - 64, 58, '#f8fafc', seg(t, 58, 68), 1, -0.03, W * 0.8);
      this.ptdSfx(S, 52, 'reso', () => window.SFX?.jingle?.([523, 659, 784, 1047], 0, 'square'));
    },
    // PLANO 2 — a corrida no estádio: os dois com a aura dourada derrubando a marcação, a
    // bola indo e voltando entre eles num raio
    duoReso1(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.duoCast(ELO, ELO);
      const theme = window.MatchEngine?.active ? this.ptdTheme() : 'bluelock_holo';
      this.ptdArena(ctx, S, t * 9, { theme, hc: GOLD, ac: '#ef4444', sign: 'PROJETO ELO • RESSONÂNCIA' });
      this.ptdSpeed(ctx, S, t, GOLD, 0.35, 1, 60, 30);
      const feet = H * 0.9;
      // marcadores voando para trás quando os dois passam
      const def = this.cineChar('elo_gen_b', { jerseyPrimary: '#334155', jerseySecondary: '#94a3b8' });
      [[0.5, 20], [0.66, 44], [0.82, 66]].forEach(([fx, at], i) => {
        const hit = t > at;
        const q = ease(seg(t, at, at + 26));
        this.ptdSpr(ctx, def, W * fx + q * 240, feet - 40 - (hit ? Math.sin(q * Math.PI) * 140 : 0), 220, { animState: hit ? 'dive' : 'idle', flipX: true });
        if (hit) this.ptdWord(ctx, ['BAM!', 'DOM!', 'VUSH!'][i], W * fx, H * 0.36, 44, '#f8fafc', seg(t, at, at + 6), 1 - seg(t, at + 22, at + 30), -0.08);
      });
      const bob = (i) => Math.sin(t * 0.5 + i * 2) * 6;
      this.ptdSpr(ctx, c.a, W * 0.3, feet - 60 + bob(0), 300, { facing: 'side', animState: 'run', frame: runF(t, 3), showAura: true, auraColor: GOLD, rim: CA, rimD: 3 });
      this.ptdSpr(ctx, c.b, W * 0.52, feet + bob(1), 300, { facing: 'side', animState: 'run', frame: runF(t + 2, 3), showAura: true, auraColor: GOLD, rim: CB, rimD: 3 });
      const q = (Math.sin(t * 0.2) + 1) / 2;
      const p0 = { x: W * 0.36, y: feet - 70 };
      const p1 = { x: W * 0.58, y: feet - 10 };
      this.ptdBolt(ctx, p0.x, p0.y, p1.x, p1.y, GOLD, 0.8, t, 5);
      this.ptdBall(ctx, lerp(p0.x, p1.x, q), lerp(p0.y, p1.y, q), 18, t * 0.5, GOLD);
      this.ptdWord(ctx, 'RESSONÂNCIA', W / 2, top + 76, 88, GOLD, seg(t, 6, 18), 1, -0.04, W * 0.84);
      this.ptdSfx(S, 20, 'bam', () => window.SFX?.tackle?.());
    },
    duoReso2(ctx, S) {
      this.duoShotPage(ctx, S, { c: this.duoCast(ELO, ELO), shout: 'ATAQUE DE DUPLA!!' });
    },
    duoReso3(ctx, S) {
      const keeper = window.MatchEngine?.active ? window.MatchEngine.entities?.find((e) => e.team === 'away' && e.isGK)?.charData : null;
      this.duoGoalPlane(ctx, S, { keeper, theme: window.MatchEngine?.active ? this.ptdTheme() : 'bluelock_holo', sign: 'PROJETO ELO', word: 'GOL DO ELO!!' });
    },

    // ======================================================================
    // duo_regra — A REGRA DO UM
    // ======================================================================
    duoRegra0(ctx, S) {
      const { W, H, t } = S;
      ctx.save();
      // a câmera vai entrando no telão
      const z = easeIO(seg(t, 20, 140));
      this.cineCamera(ctx, W, H, { x: W / 2, y: lerp(H * 0.45, S.top + 24 + H * 0.17, z), zoom: lerp(1, 2.1, z), shake: 0.05 });
      this.duoHall(ctx, S, { tone: '#2a0508', light: '254,202,202', led: '#ef4444', screen: '#140306', scan: 'rgba(239,68,68,0.08)', label: '#ef4444', title: 'AUDITÓRIO • RESTAM 12 DUPLAS', glitch: true });
      ctx.restore();
      this.cineVignette(ctx, W, H, 0.6, '20,0,0');
      this.ptdSfx(S, 30, 'zoom', () => window.SFX?.whoosh?.());
    },
    duoRegra1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const ego = this.getSpeakerCharData('JINPACHI EGO');
      this.ptdImpactBg(ctx, S, W * 0.66, H * 0.45, RED, '#0a0204', t * 0.003);
      const eyeY = H * 0.42;
      const size = 1000;
      const u = size / 36;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W * 0.4, y: eyeY, zoom: lerp(1.06, 1, ease(t / 30)), shake: t < 10 ? 2 : 0.1 });
      this.ptdHead(ctx, ego, W * 0.36, eyeY, size, { rim: RED, rimD: 4 });
      // os óculos acendem em branco (sem ver os olhos)
      const g = seg(t, 10, 18);
      ctx.fillStyle = `rgba(255,255,255,${0.4 + g * 0.55})`;
      [-1, 1].forEach((s) => ctx.fillRect(W * 0.36 + s * 3.5 * u - 2.4 * u, eyeY - 1.3 * u, 4.8 * u, 2.4 * u));
      ctx.restore();
      this.ptdWord(ctx, 'UM.', W * 0.76, H * 0.5, 220, RED, seg(t, 30, 38), 1, -0.08);
      this.ptdChip(ctx, 'A SUB-20 LEVA UM ATACANTE DO PROJETO', W * 0.7, bot - 50, RED, seg(t, 50, 64), { size: 15 });
      this.ptdSfx(S, 30, 'um', () => window.SFX?.kick?.(1));
      void top;
    },
    duoRegra2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.duoCast(ELO, ELO);
      const brk = ease(seg(t, 40, 80));
      const counter = (ctx2, x, color, n) => {
        ctx2.fillStyle = '#020617';
        ctx2.fillRect(x - 70, H * 0.7, 140, 80);
        ctx2.strokeStyle = color;
        ctx2.lineWidth = 4;
        ctx2.strokeRect(x - 70, H * 0.7, 140, 80);
        ctx2.fillStyle = color;
        ctx2.font = 'italic 900 50px "Segoe UI", sans-serif';
        ctx2.textAlign = 'center';
        ctx2.fillText(String(n), x, H * 0.7 + 58);
        ctx2.font = '900 11px "Segoe UI", sans-serif';
        ctx2.fillText('GOLS', x, H * 0.7 + 74);
      };
      const spin = (s) => (t < 90 ? Math.floor(rnd(Math.floor(t / 3), s) * 10) : 0);
      this.duoSplit(
        ctx,
        S,
        { color: CA, char: c.a, x: W * 0.26, eye: {}, over: (g) => brk > 0.2 && counter(g, W * 0.2, CA, spin(1)) },
        { color: CB, char: c.b, x: W * 0.74, eye: {}, over: (g) => brk > 0.2 && counter(g, W * 0.8, CB, spin(2)) },
        { cutColor: brk > 0.5 ? RED : GOLD }
      );
      this.duoChain(ctx, W * 0.3, H * 0.6, W * 0.7, H * 0.6, t, 1, GOLD, brk);
      if (t > 40 && t < 48) this.cineFlash(ctx, W, H, 1 - (t - 40) / 8, '#ef4444');
      // gota de suor
      const d = seg(t, 90, 130) * 50;
      ctx.fillStyle = '#bae6fd';
      ctx.strokeStyle = '#0c4a6e';
      ctx.lineWidth = 3;
      [W * 0.38, W * 0.62].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x, top + 120 + d - 20);
        ctx.quadraticCurveTo(x + 14, top + 120 + d + 6, x, top + 120 + d + 12);
        ctx.quadraticCurveTo(x - 14, top + 120 + d + 6, x, top + 120 + d - 20);
        ctx.fill();
        ctx.stroke();
      });
      this.ptdChip(ctx, 'O ELO CONTA OS GOLS DE CADA UM', W / 2, bot - 46, RED, seg(t, 100, 114), { size: 16 });
      this.ptdSfx(S, 40, 'racha', () => window.SFX?.tackle?.());
    },

    // ======================================================================
    // duo_mascaras — AS MÁSCARAS CAEM
    // ======================================================================
    duoMask0(ctx, S) {
      const { W, H, t, top, bot } = S;
      this.duoTunnel(ctx, S, t);
      const walk = ease(seg(t, 0, 130));
      [0, 1].forEach((i) => {
        const m = this.duoMasked(i);
        const size = lerp(150, 430, walk);
        const x = W / 2 + (i ? 1 : -1) * lerp(40, 170, walk);
        const feet = lerp(H * 0.6, bot + size * 0.2, walk);
        this.ptdSpr(ctx, m, x, feet, size, { facing: 'front', animState: walk < 1 ? 'run' : 'idle', frame: walk < 1 ? runF(t, 8) : 45, rim: i ? '#ef4444' : '#e5e7eb', rimD: 3, dim: 0.62, dimTint: '2,2,8' });
        const u = size / 36;
        const eyeY = feet - size * 0.87 + SPRITE_MAPY(10) * u;
        this.duoMask(ctx, x, eyeY + 0.6 * u, u, { stripe: i ? RED : '#e5e7eb', glow: t > 70 ? (i ? '#ef4444' : '#e5e7eb') : null });
      });
      this.ptdChip(ctx, 'TÚNEL DO ESTÁDIO • LISBOA', W / 2, top + 40, '#e5e7eb', seg(t, 10, 22), { size: 15 });
      [30, 62, 94, 126].forEach((at, i) => this.ptdSfx(S, at, 'passo' + i, () => window.SFX?.click?.()));
    },
    duoMask1(ctx, S) {
      const { W, H, t, bot } = S;
      this.ptdImpactBg(ctx, S, W / 2, H * 0.45, '#16161f', '#05050a', t * 0.002);
      const eyeY = H * 0.4;
      const size = 1250;
      const mu = size / 36;
      const crack = ease(seg(t, 12, 70));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: eyeY, zoom: 1 + seg(t, 0, 110) * 0.05, shake: crack > 0 && crack < 1 ? 1.5 : 0.1 });
      this.ptdHead(ctx, this.duoMasked(0), W / 2, eyeY, size, { tint: '#050206' });
      this.duoMask(ctx, W / 2, eyeY + 0.6 * mu, mu, { stripe: '#e5e7eb', glow: '#ffffff', crack, seed: 5 });
      // lascas caindo
      if (crack > 0.5) {
        ctx.fillStyle = '#e2e8f0';
        for (let i = 0; i < 16; i++) {
          const q = mod(t * 0.02 + rnd(i, 3), 1);
          ctx.fillRect(W / 2 + (rnd(i, 4) - 0.5) * 260, eyeY - 40 + q * 400, 10 + (i % 3) * 6, 10 + (i % 2) * 6);
        }
      }
      ctx.restore();
      this.ptdWord(ctx, 'CRAC', W * 0.78, H * 0.3, 80, '#f8fafc', seg(t, 14, 22), 1 - seg(t, 60, 70), 0.1);
      this.ptdSfx(S, 14, 'crac', () => window.SFX?.tackle?.());
      void bot;
    },
    duoMask2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const k = ease(t / 26);
      const shion = this.cineChar('elo_shion', { jerseyPrimary: '#0a0a0a', jerseySecondary: '#e5e7eb' });
      const haru = this.cineChar('elo_haru', { jerseyPrimary: '#0a0a0a', jerseySecondary: '#dc2626' });
      const lit = seg(t, 60, 70);
      const maskFall = (u, side) => (g) => {
        const fall = easeIn(seg(t, 20 + side * 10, 60 + side * 10));
        if (fall >= 1) return;
        const x = side ? W * 0.73 : W * 0.27;
        g.save();
        g.globalAlpha = 1 - fall;
        g.translate(x + (side ? -3 : 3) * fall * 30, H * 0.42 + 0.6 * u + fall * 360);
        g.rotate((side ? 1 : -1) * fall * 1.3);
        this.duoMask(g, 0, 0, u, { stripe: side ? '#e5e7eb' : RED, crack: 0.6 });
        g.restore();
      };
      const r = this.duoSplit(
        ctx,
        S,
        { color: '#e5e7eb', char: shion, x: lerp(-W * 0.1, W * 0.27, k), eye: { ring: lit > 0 ? '#ffffff' : undefined }, over: (g, u) => maskFall(u, 0)(g) },
        { color: '#ef4444', char: haru, x: lerp(W * 1.1, W * 0.73, k), eye: { ring: lit > 0 ? '#ef4444' : undefined }, over: (g, u) => maskFall(u, 1)(g) },
        { cutColor: '#e5e7eb' }
      );
      this.ptdEyeFlare(ctx, r.l.eye.x, r.l.eye.y, lit, '#ffffff', W * 0.4);
      this.ptdEyeFlare(ctx, r.r.eye.x, r.r.eye.y, lit, '#ef4444', W * 0.4);
      this.ptdChip(ctx, 'SHION MIKAMI', W * 0.24, top + 38, '#e5e7eb', seg(t, 70, 84), { size: 17 });
      this.ptdChip(ctx, 'HARU IBUKI', W * 0.76, top + 38, '#ef4444', seg(t, 78, 92), { size: 17 });
      this.ptdWord(ctx, 'A PRIMEIRA DUPLA', W / 2, bot - 70, 60, '#f8fafc', seg(t, 100, 112), 1, -0.03, W * 0.8);
      this.ptdSfx(S, 20, 'cai', () => window.SFX?.click?.());
      this.ptdSfx(S, 60, 'olhos', () => window.SFX?.jingle?.([392, 523], 0, 'triangle'));
    },

    // ======================================================================
    // duo_final — DOIS EGOS, UM GOL
    // ======================================================================
    duoFinal0(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.duoCast(ELO, ELO);
      this.ptdArena(ctx, S, t * 10, { theme: 'worldcup_final', hc: GOLD, ac: '#ef4444', sign: 'LIGA DOS PARES • FINAL • LISBOA' });
      this.ptdSpeed(ctx, S, t, '#f8fafc', 0.22, 1, 50, 24);
      const feet = H * 0.9;
      const mk = this.cineChar('elo_shion', { jerseyPrimary: '#0a0a0a', jerseySecondary: '#e5e7eb' });
      const q = ease(seg(t, 30, 60));
      this.ptdSpr(ctx, mk, W * 0.62 + q * 260, feet - 30 - Math.sin(q * Math.PI) * 120, 230, { animState: t > 30 ? 'dive' : 'idle', flipX: true });
      this.ptdSpr(ctx, c.a, W * 0.3, feet - 50, 310, { facing: 'side', animState: 'run', frame: runF(t, 3), showAura: true, auraColor: GOLD, rim: CA, rimD: 3 });
      this.ptdSpr(ctx, c.b, W * 0.5, feet, 300, { facing: 'side', animState: 'run', frame: runF(t + 2, 3), showAura: true, auraColor: GOLD, rim: CB, rimD: 3 });
      this.ptdBall(ctx, W * 0.42 + Math.sin(t * 0.22) * 50, feet - 20, 18, t * 0.4, GOLD);
      this.ptdScore?.(ctx, W / 2, top + 30, { hl: 'ELO', al: 'S&H', hs: 2, as: 2, minute: "90+3'", hc: GOLD, ac: '#ef4444', k: seg(t, 4, 14) });
      this.ptdSfx(S, 30, 'drible', () => window.SFX?.whoosh?.());
    },
    duoFinal1(ctx, S) {
      const { W, H, t, bot } = S;
      const c = this.duoCast(ELO, ELO);
      const lit = seg(t, 24, 32);
      const r = this.duoSplit(ctx, S, { color: CA, char: c.a, x: W * 0.27, eye: { ring: lit > 0 ? GOLD : undefined } }, { color: CB, char: c.b, x: W * 0.73, eye: { ring: lit > 0 ? GOLD : undefined } }, { cutColor: GOLD });
      this.ptdEyeFlare(ctx, r.l.eye.x, r.l.eye.y, lit, GOLD, W * 0.5);
      this.ptdEyeFlare(ctx, r.r.eye.x, r.r.eye.y, lit, GOLD, W * 0.5);
      const bk = seg(t, 28, 34);
      this.ptdBolt(ctx, r.l.eye.x, r.l.eye.y, r.r.eye.x, r.r.eye.y, GOLD, bk, t, 3);
      this.ptdWord(ctx, 'SEM OLHAR.', W / 2, bot - 70, 70, GOLD, seg(t, 40, 50), 1, -0.03);
      this.ptdSfx(S, 28, 'olhar', () => window.SFX?.jingle?.([784, 1047], 0, 'square'));
      void H;
    },
    duoFinal2(ctx, S) {
      this.duoShotPage(ctx, S, { c: this.duoCast(ELO, ELO), shout: 'DEVORA!!', ink: '#3b2a06' });
    },
    duoFinal3(ctx, S) {
      const { W, H, t, top, bot } = S;
      if (t < 120) {
        this.duoGoalPlane(ctx, S, { theme: 'worldcup_final', word: 'GOOOOL!!', sub: 'CAMPEÕES DA LIGA DOS PARES' });
        return;
      }
      // as duas pulseiras desligadas no bolso acendendo sozinhas
      const u2 = t - 120;
      const c = this.duoCast(ELO, ELO);
      ctx.fillStyle = '#070512';
      ctx.fillRect(0, 0, W, H);
      this.duoConfetti(ctx, S, t, 0.5);
      // punho com punho, e as pulseiras desligadas acendendo sozinhas
      const lit = Math.floor(clamp((u2 - 10) / 24) * 5);
      const y = (top + bot) / 2 + 60;
      const s = 6;
      const C = W / 2;
      const slide = ease(seg(u2, 0, 14));
      this.duoWrist(ctx, lerp(W * 0.9, C + 8 * s, slide), y, s, false, { skin: c.a.skinColor, open: 1, lit, num: 27, t });
      this.duoWrist(ctx, lerp(W * 0.1, C - 8 * s, slide), y, s, true, { skin: c.b.skinColor, open: 1, lit, num: 27, t });
      if (u2 >= 14) {
        this.ptdRings(ctx, C, y, seg(u2, 14, 44), [GOLD, CA, CB], 460);
        this.cineGlow(ctx, C, y, 240, 'rgba(253,224,71,0.55)', lit >= 5 ? 1 : 0.4);
      }
      if (u2 >= 14 && u2 < 20) this.cineFlash(ctx, W, H, 1 - (u2 - 14) / 6, '#fde047');
      this.cineTitleCard(ctx, W, top + 90, seg(u2, 40, 56), { kicker: 'PROJETO ELO', title: 'DOIS EGOS. UM GOL.', sub: `${c.an}  +  ${c.bn}`, color: GOLD });
      this.ptdSfx(S, 130, 'elo', () => window.SFX?.jingle?.([523, 659, 784, 1047], 0, 'square'));
    }
  });

  // ==========================================================================
  // REGISTRO
  // ==========================================================================
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
    'duo_ponte',
    {
      phases: [175, 120, 165, 160, 200],
      music: 'mystery',
      title: '🌉 A PONTE VELHA',
      tags: ['PLANO 1 • MEIA-NOITE', 'PLANO 2 • FRENTE A FRENTE', 'PLANO 3 • O ÚLTIMO LANCE', 'PLANO 4 • OS MASCARADOS', 'PLANO 5 • A CARTA'],
      subs: [
        [{ from: 20, who: 'NARRADOR', text: 'Final do torneio de rua da Ponte Velha. Meia-noite. A quadra cheia de gente no alambrado.', color: '#cbd5e1' }],
        [{ from: 10, who: 'NARRADOR', text: 'Dois colégios rivais. Dois atacantes que não se suportam.', color: '#cbd5e1' }],
        [{ from: 8, who: 'NARRADOR', text: 'No último lance, os dois foram na mesma bola... e ela sumiu.', color: '#cbd5e1' }],
        [{ from: 30, who: '???', text: '"Sozinhos, vocês dois são só barulho."', color: '#ef4444' }],
        [{ from: 12, who: 'NARRADOR', text: 'Naquela mesma noite, a mesma carta chegou nas duas casas.', color: '#cbd5e1' }]
      ]
    },
    [CE.duoPonte0, CE.duoPonte1, CE.duoPonte2, CE.duoPonte3, CE.duoPonte4]
  );
  reg(
    'duo_elo',
    {
      phases: [150, 140, 140],
      music: 'mystery',
      title: '🔗 O ELO SE FECHA',
      tags: ['PLANO 1 • O SALÃO', 'PLANO 2 • A PULSEIRA', 'PLANO 3 • PRESOS'],
      subs: [
        [{ from: 30, who: 'ANRI TEIERI', text: 'Trinta duplas. Uma pulseira para cada um.', color: '#38bdf8' }],
        [{ from: 50, who: 'ANRI TEIERI', text: 'Elo ativado. A partir de agora, o ranking é da dupla.', color: '#38bdf8' }],
        [{ from: 20, who: 'JINPACHI EGO', text: '"Se um cair... os dois caem."', color: '#00f5d4' }]
      ]
    },
    [CE.duoElo0, CE.duoElo1, CE.duoElo2]
  );
  reg(
    'duo_ressonancia',
    {
      phases: [110, 110, 90, 120],
      music: 'epic',
      title: '🔗 RESSONÂNCIA',
      tags: ['PLANO 1 • NO MESMO SEGUNDO', 'PLANO 2 • RESSONÂNCIA', 'PLANO 3 • ATAQUE DE DUPLA', 'PLANO 4 • GOL DO ELO'],
      subs: [[{ from: 14, who: 'NARRADOR', text: 'Os dois corações batem no mesmo segundo. As pulseiras disparam.', color: '#fde047' }], [], [], []]
    },
    [CE.duoReso0, CE.duoReso1, CE.duoReso2, CE.duoReso3]
  );
  reg(
    'duo_regra',
    {
      phases: [150, 110, 160],
      music: 'dread',
      title: '⚖️ A REGRA DO UM',
      tags: ['PLANO 1 • O AUDITÓRIO', 'PLANO 2 • UM.', 'PLANO 3 • A CORRENTE RACHA'],
      subs: [
        [{ from: 20, who: 'NARRADOR', text: 'Auditório do Projeto Elo. Restam doze duplas.', color: '#cbd5e1' }],
        [{ from: 14, who: 'JINPACHI EGO', text: '"A Sub-20 vai levar UM atacante do Projeto Elo. Um."', color: '#ef4444' }],
        [{ from: 30, who: 'NARRADOR', text: 'A corrente entre os dois racha. Agora cada um tem o seu número.', color: '#cbd5e1' }]
      ]
    },
    [CE.duoRegra0, CE.duoRegra1, CE.duoRegra2]
  );
  reg(
    'duo_mascaras',
    {
      phases: [150, 110, 160],
      music: 'mystery',
      title: '🎭 AS MÁSCARAS CAEM',
      tags: ['PLANO 1 • O TÚNEL', 'PLANO 2 • A RACHADURA', 'PLANO 3 • OS ROSTOS'],
      subs: [
        [{ from: 30, who: 'NARRADOR', text: 'No fim do túnel, as duas máscaras brancas esperando.', color: '#cbd5e1' }],
        [],
        [{ from: 60, who: 'NARRADOR', text: 'Shion Mikami e Haru Ibuki. A primeira dupla do Projeto Elo.', color: '#e5e7eb' }]
      ]
    },
    [CE.duoMask0, CE.duoMask1, CE.duoMask2]
  );
  reg(
    'duo_final',
    {
      phases: [110, 90, 80, 210],
      music: 'epic',
      title: '🏆 DOIS EGOS, UM GOL',
      tags: ['PLANO 1 • O ÚLTIMO LANCE', 'PLANO 2 • SEM OLHAR', 'PLANO 3 • O CHUTE', 'PLANO 4 • O ELO'],
      subs: [
        [{ from: 10, who: 'NARRADOR', text: 'Final da Liga dos Pares. 2 a 2. Último lance.', color: '#fde047' }],
        [],
        [],
        [{ from: 130, who: 'NARRADOR', text: 'As duas pulseiras, desligadas no bolso, acendem sozinhas.', color: '#fde047' }]
      ]
    },
    [CE.duoFinal0, CE.duoFinal1, CE.duoFinal2, CE.duoFinal3]
  );
})();
