// ============================================================================
// A ENGRENAGEM DO HUGO (cine_hugo) — final da Copa do Mundo Sub-20 (ch9_world_cup_final)
//   hugo_gears • o Hugo encosta do seu lado: "Aceite: um de nós dois vai ser o segundo
//     melhor." → você sem entender: "Por quê??" → metade do rosto dele e, no lugar da
//     outra metade, engrenagens girando: "gente como a gente não nasceu para ser o
//     primeiro lugar" → a câmera entra no olho dele: a íris vira uma engrenagem preta
//     com o anel azul-claro e ele entra no Fluxo.
// Tocada pelo midMatchLore da final ({ cinematic: 'hugo_gears' }); quando acaba, o Hugo
// fica alguns segundos em Fluxo na partida (midMatchLore.rivalFlow → MatchEngine).
// Usa os helpers da cine_partida (ptd*). Helpers novos com o prefixo "hgo".
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

  const PINK = '#ec4899';
  const CRIMSON = '#a8173a';
  const ICE = '#7dd3fc';
  const INK = '#0b0f19';
  const PAPER = '#eef2f7';
  // uniformes da final: França de azul-marinho, Japão de branco
  const FRA = { jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff' };
  const JPN = { jerseyPrimary: '#f8fafc', jerseySecondary: '#1d4ed8' };

  Object.assign(CE, {
    hgoCast() {
      return { hugo: this.cineChar('hugo', FRA), you: this.cineYou(JPN) };
    },

    // Engrenagem em tinta: dentes, aro, raios vazados, miolo e um fio de brilho
    hgoGear(ctx, x, y, r, teeth, rot, o = {}) {
      const fill = o.fill || INK;
      const hole = o.hole || PAPER;
      const th = r * 0.16;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = fill;
      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a0 = (i / teeth) * TAU;
        const a1 = a0 + (TAU / teeth) * 0.22;
        const a2 = a0 + (TAU / teeth) * 0.5;
        const a3 = a0 + (TAU / teeth) * 0.72;
        const pts = [[a0, r], [a1, r + th], [a2, r + th], [a3, r]];
        pts.forEach(([a, rr], k) => {
          const px = Math.cos(a) * rr;
          const py = Math.sin(a) * rr;
          i === 0 && k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
      }
      ctx.closePath();
      ctx.fill();
      // raios vazados
      const spokes = o.spokes ?? 6;
      if (spokes) {
        ctx.fillStyle = hole;
        for (let i = 0; i < spokes; i++) {
          const a0 = (i / spokes) * TAU + 0.18;
          const a1 = ((i + 1) / spokes) * TAU - 0.18;
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.72, a0, a1);
          ctx.arc(0, 0, r * 0.32, a1, a0, true);
          ctx.closePath();
          ctx.fill();
        }
      }
      if (o.ring) {
        ctx.strokeStyle = o.ring;
        ctx.lineWidth = Math.max(2, r * 0.07);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.5, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = hole;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.12, 0, TAU);
      ctx.fill();
      // brilho metálico
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(1.5, r * 0.035);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.88, -2.6, -1.6);
      ctx.stroke();
      ctx.restore();
    },

    // O olho do Hugo com a íris de engrenagem (desenhado pequeno e ampliado em pixel)
    hgoEyeCv(t, open = 1) {
      const w = 192;
      const h = 108;
      if (!this._hgoEye) {
        this._hgoEye = document.createElement('canvas');
        this._hgoEye.width = w;
        this._hgoEye.height = h;
      }
      const cv = this._hgoEye;
      const g = cv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      // pele com hachura de mangá
      g.fillStyle = '#f7e6dc';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(168,23,58,0.12)';
      for (let i = -h; i < w; i += 7) {
        g.beginPath();
        g.moveTo(i, h);
        g.lineTo(i + h * 0.6, 0);
        g.lineTo(i + h * 0.6 + 1.6, 0);
        g.lineTo(i + 1.6, h);
        g.fill();
      }
      const cx = w / 2;
      const cy = h * 0.5;
      const lidUp = (x) => cy - 30 * open * Math.sin(Math.PI * clamp((x - 14) / (w - 28)));
      const lidDn = (x) => cy + 14 * open * Math.sin(Math.PI * clamp((x - 20) / (w - 40)));
      const almond = () => {
        g.beginPath();
        for (let x = 14; x <= w - 14; x += 2) g.lineTo(x, lidUp(x));
        for (let x = w - 14; x >= 14; x -= 2) g.lineTo(x, lidDn(x));
        g.closePath();
      };
      // branco do olho
      almond();
      g.fillStyle = '#f8fafc';
      g.fill();
      // a íris: uma engrenagem preta com o anel azul-claro
      g.save();
      almond();
      g.clip();
      this.hgoGear(g, cx, cy - 3, 30, 12, t * 0.025, { fill: INK, hole: '#cbd5e1', ring: ICE, spokes: 8 });
      g.fillStyle = INK;
      g.beginPath();
      g.arc(cx, cy - 3, 6, 0, TAU);
      g.fill();
      g.fillStyle = '#ffffff';
      g.fillRect(cx + 9, cy - 16, 4, 4);
      g.restore();
      // pálpebra de cima grossa com cílios, risco de baixo e a dobra
      g.strokeStyle = INK;
      g.lineCap = 'round';
      g.lineWidth = 6;
      g.beginPath();
      for (let x = 10; x <= w - 10; x += 2) g.lineTo(x, lidUp(x) - 1);
      g.stroke();
      g.lineWidth = 2.5;
      for (let i = 0; i < 7; i++) {
        const x = w - 30 + i * 3;
        g.beginPath();
        g.moveTo(x, lidUp(x) - 2);
        g.lineTo(x + 6, lidUp(x) - 9 - i);
        g.stroke();
      }
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 26; x <= w - 26; x += 2) g.lineTo(x, lidDn(x) + 1);
      g.stroke();
      g.lineWidth = 1.5;
      g.beginPath();
      for (let x = 30; x <= w - 30; x += 2) g.lineTo(x, lidUp(x) - 10);
      g.stroke();
      // mechas do cabelo carmim caindo nos cantos
      g.fillStyle = CRIMSON;
      [[0, 0, 40, 26], [w - 52, 0, 52, 18]].forEach(([x, y, ww, hh]) => {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + ww, y);
        g.lineTo(x + ww * 0.55, y + hh);
        g.lineTo(x + ww * 0.25, y + hh * 0.6);
        g.lineTo(x, y + hh);
        g.closePath();
        g.fill();
      });
      return cv;
    },

    // O Hugo em pixel tratado como página de mangá: o boneco desenhado no tamanho da tela
    // e convertido em preto, retícula de pontos e branco — só o cabelo carmim continua
    // colorido. Guardado (monta uma vez por cena; ~1 MB de pixels)
    hgoMangaHead(char, W, H, hx, eyeY, size) {
      const key = `${this.ptdCharKey(char)}|${W}x${H}|${hx}|${eyeY}|${size}`;
      if (this._hgoManga && this._hgoManga.key === key) return this._hgoManga.cv;
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const g = cv.getContext('2d');
      const { u } = this.ptdHead(g, char, hx, eyeY, size, {});
      this.ptdEyes(g, char, hx, eyeY, u, {});
      const img = g.getImageData(0, 0, W, H);
      const d = img.data;
      // retícula no tamanho do pixel da arte (o boneco usa 2 px de arte por unidade)
      const pitch = Math.max(4, Math.round(u / 2));
      const dot = Math.max(2, Math.round(pitch / 2));
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (d[i + 3] < 10) continue;
          const r = d[i];
          const gg = d[i + 1];
          const b = d[i + 2];
          // cabelo carmim: fica
          if (r > 100 && r > gg * 1.6 && r > b * 1.2) continue;
          const lum = 0.3 * r + 0.59 * gg + 0.11 * b;
          let ink;
          if (lum < 72) ink = true;
          else if (lum < 170) ink = x % pitch < dot && y % pitch < dot;
          else ink = false;
          d[i] = ink ? 11 : 241;
          d[i + 1] = ink ? 15 : 245;
          d[i + 2] = ink ? 25 : 249;
          d[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      this._hgoManga = { key, cv };
      return cv;
    },

    // Engrenagens em pixel: desenhadas num canvas de 1/4 da tela, com as bordas "duras"
    // (só tinta, papel ou o azul do anel) e ampliadas sem suavizar — combinam com o boneco
    hgoGearsLo(W, H, t, gears, mono) {
      const s = 4;
      const w = Math.ceil(W / s);
      const h = Math.ceil(H / s);
      if (!this._hgoLo || this._hgoLo.width !== w) {
        this._hgoLo = document.createElement('canvas');
        this._hgoLo.width = w;
        this._hgoLo.height = h;
      }
      const cv = this._hgoLo;
      const g = cv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, w, h);
      gears.forEach(([x, y, r, n, dir, ring, pop], i) => {
        if (pop <= 0) return;
        this.hgoGear(g, x / s, y / s, (r / s) * pop, n, dir * t * (6 / r) + i, { ring: ring || null, spokes: r > 60 ? 6 : 4, hole: PAPER });
      });
      if (mono && mono.k > 0) this.hgoGear(g, mono.x / s, mono.y / s, (mono.r / s) * mono.k, 12, t * 0.05, { ring: ICE, spokes: 8, hole: PAPER });
      const img = g.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 110) {
          d[i + 3] = 0;
          continue;
        }
        const lum = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
        const ice = d[i + 2] > 180 && d[i] < 180;
        if (ice) {
          d[i] = 125;
          d[i + 1] = 211;
          d[i + 2] = 252;
        } else if (lum < 140) {
          d[i] = 11;
          d[i + 1] = 15;
          d[i + 2] = 25;
        } else {
          d[i] = 241;
          d[i + 1] = 245;
          d[i + 2] = 249;
        }
        d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      return cv;
    },

    // PLANO 1 — o Hugo em pixel, de perto, a câmera inclinada, o estádio à noite com as
    // luzes desfocadas e a luz rosa dele; você de costas no canto (é com você que ele fala)
    hgo0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.hgoCast();
      const k = ease(t / S.dur);
      const bg = ctx.createLinearGradient(0, top, 0, bot);
      bg.addColorStop(0, '#0b0820');
      bg.addColorStop(1, '#3b0a2a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      this.cineBokeh(ctx, W, top, bot * 0.8, t, 26, ['rgba(236,72,153,0.4)', 'rgba(255,236,179,0.4)', 'rgba(147,197,253,0.35)'], 5);
      this.ptdRays(ctx, W * 0.6, H * 0.42, W * 0.9, PINK, 0.1, t * 0.002, 30);
      const eyeY = H * 0.42;
      const x = W * 0.6 + lerp(40, 0, ease(seg(t, 0, 30)));
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(-0.045);
      ctx.translate(-W / 2, -H / 2);
      this.cineCamera(ctx, W, H, { x, y: eyeY, zoom: lerp(1, 1.06, k), shake: 0.15 });
      this.cineGlow(ctx, x, eyeY - 60, 360, 'rgba(236,72,153,0.4)', 1);
      const { u } = this.ptdHead(ctx, o.hugo, x, eyeY, 820, { rim: PINK, rimD: 4 });
      this.ptdEyes(ctx, o.hugo, x, eyeY, u, {});
      // brilho no olho na hora da fala
      const gl = seg(t, 20, 28) * (1 - seg(t, 60, 84));
      this.ptdEyeFlare(ctx, x - 3.5 * u, eyeY, gl * 0.7, PINK, W * 0.3);
      ctx.restore();
      // você de costas no canto, no escuro
      this.ptdSpr(ctx, o.you, W * 0.1, bot + 300, 820, { facing: 'back', dim: 0.72, dimTint: '2,6,23' });
      this.ptdChip(ctx, 'HUGO • FRANÇA SUB-20', W * 0.24, top + 40, PINK, seg(t, 6, 18), { size: 16 });
      this.ptdSfx(S, 4, 'hugo', () => window.SFX?.jingle?.([392, 330], 0, 'triangle'));
    },

    // PLANO 2 — você sem entender: a gota de suor e os pontos de interrogação
    hgo1(ctx, S) {
      const { W, H, t } = S;
      const o = this.hgoCast();
      const eyeY = H * 0.44;
      const x = W * 0.58;
      this.ptdCloseBg(ctx, S, '#38bdf8', x);
      ctx.save();
      this.cineCamera(ctx, W, H, { x, y: eyeY, zoom: lerp(1.02, 1.08, ease(t / S.dur)), shake: 0.15 });
      const { u } = this.ptdHead(ctx, o.you, x, eyeY, 700, { flipX: true, rim: '#38bdf8', rimD: 3 });
      // olhos do próprio boneco, com a cara de quem não entendeu
      this.cineSpriteEyes(ctx, o.you, x, eyeY, u, { expr: 'sweat', eyeU: SPRITE_MAPY(10) });
      // gota de suor descendo na têmpora
      const dy = seg(t, 10, 50) * 40;
      ctx.fillStyle = '#bae6fd';
      ctx.strokeStyle = '#0c4a6e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const sx = x + 6.6 * u;
      const sy = eyeY - 3 * u + dy;
      ctx.moveTo(sx, sy - 22);
      ctx.quadraticCurveTo(sx + 16, sy + 6, sx, sy + 12);
      ctx.quadraticCurveTo(sx - 16, sy + 6, sx, sy - 22);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // "?" pulando do lado da cabeça
      [[W * 0.26, H * 0.3, 96, 10], [W * 0.17, H * 0.46, 66, 18], [W * 0.84, H * 0.26, 74, 24]].forEach(([qx, qy, sz, at], i) => {
        const k = seg(t, at, at + 8);
        if (k <= 0) return;
        this.ptdWord(ctx, '?', qx, qy - Math.sin(t * 0.12 + i) * 6, sz, '#f8fafc', k, 1, (i - 1) * 0.15);
      });
    },

    // PLANO 3 — página de mangá em pixel: metade do rosto do Hugo (preto, retícula e só o
    // cabelo carmim) e, saindo do meio do rosto, engrenagens em pixel girando, com uma
    // engrenagem azul no lugar do outro olho e peças voando
    hgo2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.hgoCast();
      const size = 1180;
      const hx = Math.round(W * 0.47);
      const eyeY = Math.round(H * 0.48);
      const u = size / 36;
      const k = ease(t / S.dur);
      // papel com retícula grossa e linhas de impacto saindo do olho
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(11,15,25,0.16)';
      for (let y = top; y < bot; y += 12) for (let x = ((y / 12) % 2) * 6; x < W; x += 12) ctx.fillRect(x, y, 4, 4);
      this.ptdRays(ctx, hx - 3.5 * u, eyeY, W * 1.1, INK, 0.1, 0, 44);
      ctx.save();
      // empurrão lento da câmera e um tremor no corte
      const z = lerp(1, 1.05, k);
      ctx.translate(W / 2, H / 2);
      ctx.scale(z, z);
      ctx.translate(-W / 2 + (t < 16 ? (rnd(t, 7) - 0.5) * 6 : 0), -H / 2);
      const head = this.hgoMangaHead(o.hugo, W, H, hx, eyeY, size);
      // a metade do rosto: tudo à esquerda do corte (em degraus de pixel)
      const cut = (y) => hx + 8 + Math.round(((rnd(Math.floor(y / 24), 9) - 0.5) * 22) / 4) * 4;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let y = 0; y <= H; y += 24) {
        ctx.lineTo(cut(y), y);
        ctx.lineTo(cut(y), y + 24);
      }
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.clip();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(head, 0, 0);
      ctx.restore();
      // a outra metade: as engrenagens nascendo do corte e se espalhando pra direita
      const grow = (i) => ease(seg(t, 6 + i * 4, 30 + i * 4));
      const gears = [
        [hx + 60, eyeY - 170, 96, 14, 1], [hx + 250, eyeY - 120, 130, 18, -1], [hx + 120, eyeY + 140, 120, 16, -1], [hx + 330, eyeY + 120, 90, 12, 1],
        [hx + 470, eyeY - 30, 110, 14, 1], [hx + 40, eyeY + 260, 70, 10, 1], [hx + 520, eyeY + 220, 76, 10, -1], [hx + 420, eyeY - 230, 64, 10, -1], [hx + 200, eyeY + 290, 60, 9, 1]
      ].map((gr, i) => gr.concat([null, grow(i)]));
      const mono = { x: hx + 3.5 * u, y: eyeY, r: 60, k: ease(seg(t, 24, 44)) };
      const lo = this.hgoGearsLo(W, H, t, gears, mono);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(lo, 0, 0, lo.width * 4, lo.height * 4);
      // peças e parafusos voando pra direita (quadradinhos de pixel)
      ctx.fillStyle = INK;
      for (let i = 0; i < 30; i++) {
        const q = (rnd(i, 4) + t * 0.004 * (0.5 + rnd(i, 5))) % 1;
        const x = hx + 20 + q * (W - hx);
        const y = top + rnd(i, 6) * (bot - top);
        const s = 4 * (1 + (i % 3));
        ctx.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, s, s);
      }
      // a borda do corte em tinta (degraus de pixel) e rachaduras subindo pelo rosto
      for (let y = 0; y <= H; y += 24) ctx.fillRect(cut(y) - 2, y, 6, 24);
      ctx.fillRect(hx - 24, eyeY - 120, 20, 4);
      ctx.fillRect(hx - 28, eyeY - 116, 4, 16);
      ctx.fillRect(hx - 20, eyeY + 90, 16, 4);
      ctx.restore();
      if (mono.k > 0) this.cineGlow(ctx, W / 2 + (mono.x - W / 2) * z, H / 2 + (mono.y - H / 2) * z, 120, 'rgba(125,211,252,0.55)', mono.k);
      this.ptdSfx(S, 14, 'engrenagem', () => window.SFX?.click?.());
    },

    // PLANO 4 — a câmera entra no olho: a íris de engrenagem gira e ele entra no Fluxo
    hgo3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.hgoCast();
      const dive = 26;
      if (t < dive) {
        // mergulho até o olho dele (o boneco em pixel)
        const eyeY = H * 0.44;
        this.ptdCloseBg(ctx, S, PINK, W * 0.5);
        ctx.save();
        const z = lerp(1, 7, easeIn(t / dive));
        const u = 900 / 36;
        this.cineCamera(ctx, W, H, { x: W * 0.5 - 3.5 * u, y: eyeY, zoom: z, shake: 0 });
        const hd = this.ptdHead(ctx, o.hugo, W * 0.5, eyeY, 900, { rim: PINK, rimD: 3 });
        this.ptdEyes(ctx, o.hugo, W * 0.5, eyeY, hd.u, {});
        ctx.restore();
        this.cineFlash(ctx, W, H, seg(t, dive - 6, dive), '#ffffff');
        return;
      }
      const u2 = t - dive;
      const open = ease(seg(u2, 0, 14));
      const eye = this.hgoEyeCv(u2, 0.25 + 0.75 * open);
      const scale = Math.max(W / eye.width, (bot - top) / eye.height) * lerp(1.12, 1.0, ease(seg(u2, 0, 40)));
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const dw = eye.width * scale;
      const dh = eye.height * scale;
      const shake = u2 < 12 ? (rnd(u2, 3) - 0.5) * 10 : 0;
      ctx.drawImage(eye, (W - dw) / 2 + shake, (top + bot) / 2 - dh / 2, dw, dh);
      ctx.restore();
      // o anel azul pulsando e faíscas rosa do Fluxo saindo do olho
      const pulse = 0.5 + 0.5 * Math.sin(u2 * 0.25);
      this.cineGlow(ctx, W / 2, (top + bot) / 2 - 3 * scale, 160 + 60 * pulse, 'rgba(125,211,252,0.45)', open);
      ctx.fillStyle = PINK;
      for (let i = 0; i < 22; i++) {
        const q = ((u2 * 0.02 + rnd(i, 2)) % 1);
        const a = rnd(i, 3) * TAU;
        const r = 120 + q * W * 0.5;
        ctx.globalAlpha = (1 - q) * open;
        ctx.fillRect(W / 2 + Math.cos(a) * r, (top + bot) / 2 + Math.sin(a) * r * 0.55, 6, 6);
      }
      ctx.globalAlpha = 1;
      if (u2 < 8) this.cineFlash(ctx, W, H, 1 - u2 / 8, '#ffffff');
      // o carimbo do Fluxo
      const sk = seg(u2, 30, 40);
      if (sk > 0) {
        this.ptdWord(ctx, 'FLUXO', W * 0.5, top + 92, 96, PINK, sk, 1, -0.05, W * 0.7);
        this.ptdChip(ctx, 'HUGO • A ENGRENAGEM DO SEGUNDO LUGAR', W * 0.5, bot - 50, ICE, seg(u2, 40, 54), { size: 17 });
      }
      this.ptdSfx(S, dive, 'olho', () => window.SFX?.kick?.(0.8));
      this.ptdSfx(S, dive + 30, 'fluxo', () => window.SFX?.jingle?.([392, 523, 784], 0, 'square'));
    }
  });

  const PLANES = [CE.hgo0, CE.hgo1, CE.hgo2, CE.hgo3];
  CE.registerCine('hugo_gears', {
    phases: [130, 90, 170, 150],
    letterbox: 0.1,
    grain: 0.05,
    music: 'dread',
    title: '⚙️ A ENGRENAGEM DO HUGO',
    tags: ['PLANO 1 • HUGO', 'PLANO 2 • POR QUÊ?', 'PLANO 3 • O MECANISMO', 'PLANO 4 • O OLHO'],
    subs: [
      [{ from: 8, who: 'HUGO', text: '"Aceite: um de nós dois vai ser o segundo melhor."', color: PINK }],
      [{ from: 6, who: 'VOCÊ', text: '"...Por quê??"', color: '#38bdf8' }],
      [{ from: 6, who: 'HUGO', text: '"Porque gente como a gente... não nasceu para ser o primeiro lugar."', color: PINK }],
      [{ from: 40, who: 'NARRADOR', text: 'As engrenagens giram. O Hugo entrou no Fluxo.', color: '#94a3b8' }]
    ],
    draw(ctx, S) {
      PLANES[S.phase].call(this, ctx, S);
      if (S.phase === 0 && S.t < 10) this.cineFlash(ctx, S.W, S.H, 1 - S.t / 10, '#000000');
    }
  });
})();
