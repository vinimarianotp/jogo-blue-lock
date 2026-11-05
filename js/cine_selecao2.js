// ============================================================================
// A SEGUNDA SELEÇÃO (cine_selecao2) — ver js/cine_kit.js
//   bluelock_man_test      • a câmara branca → o BLUE LOCK MAN se materializa → defesa atrás de
//                            defesa → "LIDO." → a arma que a máquina não lê → o chute direto
//   rin_takes_bachira      • (derrota) fim do 3x3 → o Rin olha de cima → "O Bachira." → o
//                            monstro dele é mais forte → você e o Nagi sozinhos na sala branca
//   rin_takes_bachira_win  • (vitória) vocês vencem, mas é o Bachira quem pede para ir com o Rin
//   barou_devour           • 5x5 contra o time do Rin: o Barou (do SEU time) arranca como Rei →
//                            a metavisão nascendo → um passo antes → o gol dele roubado (impact
//                            frame) → o Barou de joelhos → o Rin: "Você. Vem pro meu time."
//   world_five_fall        • (derrota) o Rin abre → Velocidade Divina → 1 x 5 → a mão do Loki →
//                            o Ego: só o Rin e o Shidou marcaram → TOP 6
//   world_five_win         • (vitória) o mundo vem com tudo, o Blue Lock aguenta e vira
// Usa os bonecos guardados da cine_final (finSpr/finRim/finHead/finCrop), o rincStamp/rincSeat/
// rincShade da cine_rin, os olhos/pixel da cine_wildcard (wcdEyes/wcdEyeBand/wcdPixelize), a sala
// branca da cine_manga (mgmRoom) e a bola/rastro/quadro de impacto da cine_partida.
// Helpers daqui têm o prefixo "ssel".
// Regras: sem ctx.filter/shadowBlur, sem cópias fantasmas, sem tela piscando (um flash por
// impacto), olhos em close em pixel art, frame 0 = piscada (não usar).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine) return;
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
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  const line = (ctx, a, b) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  // quadros da corrida (4 por ciclo, cada um é um boneco guardado)
  const RUNF = (f, sp = 3) => 1 + (Math.floor(f / sp) % 4) * 4;
  // curva de Bézier quadrática
  const bez = (a, c, b, k) => [lerp(lerp(a[0], c[0], k), lerp(c[0], b[0], k), k), lerp(lerp(a[1], c[1], k), lerp(c[1], b[1], k), k)];

  // Perspectivas: a câmara do teste (fuga em 640,300), a sala branca da cine_manga (640,316.8),
  // o campo do Blue Lock (640,230) e o estádio do World Five (640,300)
  const CZ = (X, Y, z) => [640 + (X - 640) / z, 300 + (Y - 300) / z];
  const CZF = 3.0;
  const GZ = 1.9;
  const GZB = 2.2;
  const RP = (X, z) => [640 + (X - 640) / z, 316.8 + 403.2 / z];
  const PP = (X, z) => [640 + (X - 640) / z, 230 + 490 / z];

  const BL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const TEAL = { jerseyPrimary: '#134e4a', jerseySecondary: '#5eead4' };
  const WORLD = { jerseyPrimary: '#f1f5f9', jerseySecondary: '#b45309' };

  const YOU_C = '#00f5d4';
  const EGO_C = '#00f5d4';
  const NARR_C = '#94a3b8';
  const RIN_C = '#22d3ee';
  const BACH_C = '#facc15';
  const NAGI_C = '#cbd5e1';
  const ARYU_C = '#c084fc';
  const TOKI_C = '#a3e635';
  const BAROU_C = '#f87171';
  const LOKI_C = '#fbbf24';
  const INK = '#06111f';
  const PAPER = '#e0f2fe';
  // quadro de impacto em negativo: desenha com as cores invertidas e inverte tudo no fim
  const NEG_INK = '#f9eee0';
  const NEG_PAPER = '#1f0d01';

  // ==========================================================================
  // HELPERS (prefixo ssel)
  // ==========================================================================
  Object.assign(CE, {
    sselCast() {
      const run = `${this._cineRun || 0}|${this.sakugaType}`;
      if (this._sselCastRun === run && this._sselCastC) return this._sselCastC;
      const ch = (id, kit, extra = {}) => this.cineChar(id, Object.assign({}, kit, extra));
      this._sselCastC = {
        you: this.cineYou(Object.assign({}, BL)),
        bachira: ch('bachira', BL),
        nagi: ch('nagi', BL),
        rin: ch('rin', TEAL),
        aryu: ch('aryu', TEAL),
        toki: ch('tokimitsu', TEAL),
        rinBL: ch('rin', BL),
        aryuBL: ch('aryu', BL),
        tokiBL: ch('tokimitsu', BL),
        shidou: ch('shidou', BL),
        barou: ch('barou', BL),
        chigiri: ch('chigiri', BL),
        bachiraT: ch('bachira', TEAL),
        loki: ch('loki', WORLD),
        luna: ch('luna', WORLD),
        blake: ch('blake', WORLD),
        dada: ch('dada_silva', WORLD),
        pablo: ch('pablo', WORLD),
        ego: this.getSpeakerCharData('JINPACHI EGO'),
        robot: {
          id: 'ssel_robot', name: 'BLUE LOCK MAN', skinColor: '#1e3a8a', hairColor: '#00f5d4', hairSecondary: '#38bdf8', eyeColor: '#00f5d4',
          hairStyle: 'short_sharp', jerseyPrimary: '#090d16', jerseySecondary: '#00f5d4', auraColor: '#00f5d4'
        }
      };
      this._sselCastRun = run;
      return this._sselCastC;
    },

    // Aquecimento: um item por quadro durante o plano 1 (sem travada na troca de plano)
    sselWarm(S, list) {
      if (S.phase !== 0 || S.t < 3) return;
      const run = `${this.sakugaType}|${this._cineRun}`;
      if (this._sselWarmRun !== run) {
        this._sselWarmRun = run;
        this._sselWarmIdx = 0;
      }
      if (this._sselWarmIdx < list.length && list[this._sselWarmIdx].call(this) !== false) this._sselWarmIdx++;
    },

    // Voz do sistema: caixinha com a onda do áudio
    sselVoice(ctx, x, y, t, talk, label, rgb = '0,245,212') {
      ctx.save();
      ctx.fillStyle = 'rgba(2,10,24,0.84)';
      ctx.fillRect(x, y, 300, 66);
      ctx.strokeStyle = `rgba(${rgb},0.7)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 300, 66);
      ctx.fillStyle = `rgba(${rgb},${0.5 + 0.5 * Math.abs(Math.sin(t * 0.08))})`;
      ctx.beginPath();
      ctx.arc(x + 16, y + 17, 5, 0, TAU);
      ctx.fill();
      ctx.font = '900 12px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.fillText(label.split('').join(' '), x + 28, y + 17);
      for (let i = 0; i < 34; i++) {
        const lv = talk * (0.25 + 0.75 * Math.abs(Math.sin(t * 0.31 + i * 0.7) * Math.sin(t * 0.13 + i * 0.29)));
        const hh = Math.max(2, lv * 26);
        ctx.fillStyle = i % 2 ? `rgb(${rgb})` : 'rgba(186,230,253,0.9)';
        ctx.fillRect(x + 14 + i * 8, y + 46 - hh / 2, 5, hh);
      }
      ctx.restore();
    },

    // Coroa dourada em pixel (o Rei)
    sselCrownCv() {
      return this.wcdPixelize('ssel_crown', 22, 16, (g) => {
        g.fillStyle = '#facc15';
        poly(g, [[2, 14], [2, 4], [6, 9], [11, 2], [16, 9], [20, 4], [20, 14]]);
        g.fill();
        g.fillStyle = '#ca8a04';
        g.fillRect(2, 11, 18, 3);
        g.fillStyle = '#fef08a';
        g.fillRect(3, 6, 1, 5);
        g.fillRect(10, 4, 2, 4);
        g.fillStyle = '#dc2626';
        g.fillRect(10, 11, 2, 2);
        g.fillStyle = '#38bdf8';
        g.fillRect(5, 12, 2, 1);
        g.fillRect(15, 12, 2, 1);
      }, '#1c1003');
    },
    // Mão aberta estendida (pele escura do Loki, manga branca), palma para quem olha
    sselHandCv() {
      return this.wcdPixelize('ssel_hand', 20, 26, (g) => {
        const S = '#6b3e26';
        const D = '#4e2b19';
        const L = '#8a5435';
        [[3, 6], [6, 3], [9, 2], [12, 3]].forEach(([x, y0]) => {
          g.fillStyle = S;
          g.fillRect(x, y0, 3, 12 - y0);
          g.fillStyle = L;
          g.fillRect(x, y0, 1, 11 - y0);
          g.fillStyle = D;
          g.fillRect(x + 2, y0 + 1, 1, 10 - y0);
        });
        g.fillStyle = S;
        g.fillRect(3, 11, 12, 7);
        g.fillStyle = D;
        g.fillRect(13, 11, 2, 7);
        g.fillStyle = L;
        g.fillRect(4, 12, 4, 2);
        g.fillStyle = S;
        poly(g, [[14, 12], [18, 8], [19.6, 9.4], [16, 15], [14, 15]]);
        g.fill();
        g.fillStyle = S;
        g.fillRect(5, 18, 9, 3);
        g.fillStyle = '#f1f5f9';
        g.fillRect(4, 20, 11, 6);
        g.fillStyle = '#b45309';
        g.fillRect(4, 20, 11, 1);
        g.fillStyle = '#cbd5e1';
        g.fillRect(12, 21, 3, 5);
      }, '#1a0c05');
    },

    // O monstro do Bachira: sombra amarela e preta com olhos de pixel e um sorriso de dentes
    sselMonster(ctx, x, cy, R, t, k) {
      if (k <= 0) return;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * TAU;
        const up = Math.max(0, -Math.sin(a));
        const horn = Math.pow(Math.abs(Math.sin(a * 3 + t * 0.04)), 4);
        const r = R * (0.8 + up * (0.2 + 0.4 * horn) + Math.sin(a * 9 - t * 0.06) * 0.04);
        const px = x + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r * 0.9;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = '#120d02';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#facc15';
      ctx.stroke();
      ctx.globalAlpha = k;
      ctx.strokeStyle = 'rgba(250,204,21,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.16) {
        const r = (6 + a * 10) * (R / 260);
        const px = x + Math.cos(a + t * 0.03) * r * 2;
        const py = cy + Math.sin(a + t * 0.03) * r * 1.6;
        if (a) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
      const ey = cy - R * 0.22;
      [-1, 1].forEach((s) => {
        this.cineGlow(ctx, x + s * R * 0.32, ey, R * 0.22, 'rgba(250,204,21,0.6)', k);
        this.drawPixelEye(ctx, x + s * R * 0.32, ey, R * 0.026, { line: '#facc15', white: '#fef9c3', iris: '#422006', ring: '#facc15', tiny: true, look: s < 0 ? 1 : 1 });
      });
      // a boca sorrindo (meia-lua de dentes)
      const mw = R * 0.5;
      const my = cy + R * 0.2;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(x - mw, my);
      ctx.quadraticCurveTo(x, my + R * 0.5, x + mw, my);
      ctx.quadraticCurveTo(x, my + R * 0.16, x - mw, my);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fef9c3';
      for (let i = 0; i < 7; i++) {
        const tx = x - mw * 0.8 + (i + 0.5) * ((mw * 1.6) / 7);
        const tw = (mw * 1.6) / 7 / 2;
        const yy = my + R * 0.05 + (1 - Math.pow((tx - x) / mw, 2)) * R * 0.07;
        ctx.beginPath();
        ctx.moveTo(tx - tw, yy);
        ctx.lineTo(tx + tw, yy);
        ctx.lineTo(tx, yy + R * 0.08);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    // Cartão holográfico com o rosto (escolha de quem vai) — sel 0..1 acende
    sselCard(ctx, x, y, w, h, char, name, rgb, k, sel = 0, dim = 0, tag = '') {
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 2) * (1 - dim * 0.55);
      const e = ease(k);
      ctx.translate(0, (1 - e) * 30);
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.fillRect(x - w / 2, y - h / 2, w, h);
      ctx.fillStyle = `rgba(${rgb},${0.14 + sel * 0.2})`;
      ctx.fillRect(x - w / 2, y - h / 2, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - w / 2 + 6, y - h / 2 + 6, w - 12, h - 44);
      ctx.clip();
      this.cineGradient(ctx, x - w / 2, y - h / 2, w, h, [[0, `rgba(${rgb},0.25)`], [1, 'rgba(15,23,42,0.35)']]);
      this.finHead(ctx, char, x, y - h * 0.12, h * 1.7);
      this.finFillPat(ctx, 'scan', x - w / 2, y - h / 2, w, h, 0.4);
      ctx.restore();
      ctx.strokeStyle = `rgba(${rgb},${0.7 + sel * 0.3})`;
      ctx.lineWidth = 2 + sel * 3;
      ctx.strokeRect(x - w / 2, y - h / 2, w, h);
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.fillRect(x - w / 2, y + h / 2 - 34, w, 34);
      ctx.font = '900 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(name, x, y + h / 2 - 17, w - 10);
      if (sel > 0) this.cineGlow(ctx, x, y, w * 0.9, `rgba(${rgb},0.4)`, sel);
      ctx.restore();
      if (tag && sel > 0) this.ptdChip(ctx, tag, x, y - h / 2 - 22, `rgb(${rgb})`, sel, { size: 13 });
    },

    // ---------------------------------------------------------------- a câmara branca
    sselChamberBg(g, w, h) {
      const P = CZ;
      const q = (pts, f) => {
        g.fillStyle = f;
        poly(g, pts);
        g.fill();
      };
      const lg = (x0, y0, x1, y1, stops) => {
        const gr = g.createLinearGradient(x0, y0, x1, y1);
        stops.forEach(([o, c]) => gr.addColorStop(o, c));
        return gr;
      };
      const [fx0, fy0] = P(0, 0, CZF);
      const [fx1, fy1] = P(1280, 720, CZF);
      q([[0, 0], [w, 0], [fx1, fy0], [fx0, fy0]], lg(0, 0, 0, fy0, [[0, '#aebccd'], [1, '#e2e8f0']]));
      q([[0, 0], [fx0, fy0], [fx0, fy1], [0, h]], lg(0, 0, fx0, 0, [[0, '#c9d4e1'], [1, '#f1f5f9']]));
      q([[w, 0], [fx1, fy0], [fx1, fy1], [w, h]], lg(w, 0, fx1, 0, [[0, '#c4d0de'], [1, '#eef2f7']]));
      const floor = [[0, h], [w, h], [fx1, fy1], [fx0, fy1]];
      q(floor, lg(0, fy1, 0, h, [[0, '#eef2f7'], [1, '#cfd9e5']]));
      g.fillStyle = lg(0, fy0, 0, fy1, [[0, '#f8fafc'], [1, '#e2e8f0']]);
      g.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
      // piso: grade ciano, a grande área e o reflexo das luzes
      g.save();
      poly(g, floor);
      g.clip();
      g.strokeStyle = 'rgba(56,189,248,0.24)';
      g.lineWidth = 1.5;
      for (let X = -1920; X <= 3200; X += 160) line(g, P(X, 720, 1), P(X, 720, CZF));
      [1.1, 1.25, 1.42, 1.62, 1.85, 2.1, 2.4, 2.7].forEach((z) => line(g, P(-3000, 720, z), P(4280, 720, z)));
      g.strokeStyle = 'rgba(14,165,233,0.6)';
      g.lineWidth = 3;
      line(g, P(-3000, 720, GZ), P(4280, 720, GZ));
      g.beginPath();
      [P(120, 720, GZ), P(120, 720, 1.38), P(1160, 720, 1.38), P(1160, 720, GZ)].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
      g.beginPath();
      [P(400, 720, GZ), P(400, 720, 1.68), P(880, 720, 1.68), P(880, 720, GZ)].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
      const ps = P(640, 720, 1.5);
      g.fillStyle = 'rgba(14,165,233,0.7)';
      g.beginPath();
      g.ellipse(ps[0], ps[1], 6, 2.5, 0, 0, TAU);
      g.fill();
      [[1.15, 0.5], [1.55, 0.36], [2.0, 0.26]].forEach(([z, a]) => {
        const c = P(640, 720, z);
        g.save();
        g.translate(c[0], c[1]);
        g.scale(1, 0.22);
        this.cineGlow(g, 0, 0, 380 / z, `rgba(255,255,255,${a})`);
        g.restore();
      });
      g.restore();
      // paredes: emendas, a faixa ciano e o rodapé
      g.strokeStyle = 'rgba(148,163,184,0.5)';
      g.lineWidth = 2;
      [1.12, 1.3, 1.5, 1.75, 2.05, 2.4, 2.75].forEach((z) => [0, 1280].forEach((X) => line(g, P(X, 0, z), P(X, 720, z))));
      [0, 1280].forEach((X) => {
        q([P(X, 500, 1), P(X, 500, CZF), P(X, 509, CZF), P(X, 509, 1)], 'rgba(56,189,248,0.75)');
        q([P(X, 690, 1), P(X, 690, CZF), P(X, 720, CZF), P(X, 720, 1)], 'rgba(148,163,184,0.35)');
      });
      // painéis de luz do teto
      [[1.04, 1.22], [1.42, 1.6], [1.85, 2.03], [2.35, 2.5]].forEach(([z0, z1]) => {
        const pts = [P(470, 0, z0), P(810, 0, z0), P(810, 0, z1), P(470, 0, z1)];
        q(pts, '#ffffff');
        g.strokeStyle = 'rgba(125,211,252,0.9)';
        g.lineWidth = 2;
        poly(g, pts);
        g.stroke();
        const c = P(640, 0, (z0 + z1) / 2);
        this.cineGlow(g, c[0], c[1] + 12 / z0, 210 / z0, 'rgba(224,242,254,0.55)');
      });
      // arestas da sala
      g.strokeStyle = 'rgba(100,116,139,0.55)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(fx0, fy0);
      g.lineTo(fx0, fy1);
      g.lineTo(0, h);
      g.moveTo(w, 0);
      g.lineTo(fx1, fy0);
      g.lineTo(fx1, fy1);
      g.lineTo(w, h);
      g.moveTo(fx0, fy0);
      g.lineTo(fx1, fy0);
      g.moveTo(fx0, fy1);
      g.lineTo(fx1, fy1);
      g.stroke();
    },

    // O telão da parede do fundo (vivo: muda de cor e de texto)
    sselScreen(ctx, t, o = {}) {
      const x = 470;
      const y = 208;
      const w = 340;
      const h = 108;
      const rgb = o.green ? '22,163,74' : o.red ? '220,38,38' : '14,165,233';
      ctx.save();
      ctx.globalAlpha = o.k ?? 1;
      ctx.fillStyle = `rgba(${rgb},0.14)`;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = `rgba(${rgb},0.08)`;
      for (let yy = y; yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 2);
      ctx.strokeStyle = `rgba(${rgb},0.9)`;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'italic 900 30px "Segoe UI", sans-serif';
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.fillText(o.title || 'BLUE LOCK MAN', x + w / 2, y + 40, w - 20);
      ctx.font = '900 13px "Segoe UI", sans-serif';
      ctx.fillText((o.sub || '').split('').join(' '), x + w / 2, y + 78, w - 16);
      const by = y + ((t * 1.2) % h);
      ctx.fillStyle = `rgba(${rgb},0.18)`;
      ctx.fillRect(x, by, w, 5);
      ctx.restore();
      this.cineGlow(ctx, x + w / 2, y + h / 2, w * 0.7, `rgba(${rgb},0.22)`, o.k ?? 1);
    },

    // O gol holográfico (vivo, para ficar nítido com zoom). bulge 0..1 estufa a rede em (bx, by)
    sselGoal(ctx, t, o = {}) {
      const P = CZ;
      const col = o.green ? '34,197,94' : '0,200,230';
      const bulge = o.bulge || 0;
      const vp = [640, 300];
      const disp = (p) => {
        if (!bulge) return p;
        const d = Math.hypot(p[0] - o.bx, p[1] - o.by);
        const f = bulge * Math.exp(-Math.pow(d / 70, 2));
        return [p[0] + (vp[0] - p[0]) * 0.3 * f, p[1] + (vp[1] - p[1]) * 0.3 * f - 10 * f];
      };
      ctx.save();
      ctx.lineCap = 'round';
      // rede: fundo, teto e lados
      ctx.strokeStyle = `rgba(${col},0.42)`;
      ctx.lineWidth = 1.3;
      for (let i = 0; i <= 12; i++) {
        const X = 340 + i * 50;
        ctx.beginPath();
        for (let j = 0; j <= 8; j++) {
          const p = disp(P(X, 430 + j * 36.25, GZB));
          if (j) ctx.lineTo(p[0], p[1]);
          else ctx.moveTo(p[0], p[1]);
        }
        ctx.stroke();
        line(ctx, P(X, 360, GZ), disp(P(X, 430, GZB)));
      }
      for (let j = 0; j <= 8; j++) {
        const Y = 430 + j * 36.25;
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) {
          const p = disp(P(340 + i * 50, Y, GZB));
          if (i) ctx.lineTo(p[0], p[1]);
          else ctx.moveTo(p[0], p[1]);
        }
        ctx.stroke();
        const Yf = 360 + (j / 8) * 360;
        line(ctx, P(340, Yf, GZ), P(340, Y, GZB));
        line(ctx, P(940, Yf, GZ), P(940, Y, GZB));
      }
      // traves: luz ciano em volta + miolo branco
      const fr = [P(340, 720, GZ), P(340, 360, GZ), P(940, 360, GZ), P(940, 720, GZ)];
      const path = () => {
        ctx.beginPath();
        fr.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      };
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${col},0.35)`;
      ctx.lineWidth = 16;
      path();
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = `rgb(${col})`;
      ctx.lineWidth = 8;
      path();
      ctx.stroke();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3.5;
      path();
      ctx.stroke();
      ctx.restore();
    },

    // O BLUE LOCK MAN (reveal 0..1 = se materializando de baixo para cima)
    sselRobot(ctx, x, feet, size, o = {}, reveal = 1, t = 0, eyes = 1) {
      const c = this.sselCast().robot;
      if (reveal <= 0) return;
      if (reveal >= 1) this.finRim(ctx, c, x, feet, size, o, '#00f5d4', [-1, 1], 0);
      else {
        const yc = feet + size * 0.06 - size * 1.0 * reveal;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - size, yc, size * 2, size * 1.3);
        ctx.clip();
        this.finRim(ctx, c, x, feet, size, o, '#00f5d4', [-1, 1], 0);
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - size, yc - size * 0.16, size * 2, size * 0.16);
        ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.85;
        this.finSpr(ctx, c, x, feet, size, Object.assign({}, o, { tint: '#00f5d4' }));
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(165,243,252,0.95)';
        ctx.fillRect(x - size * 0.42, yc - 1.5, size * 0.84, 3);
        ctx.restore();
        this.cineGlow(ctx, x, yc, size * 0.5, 'rgba(0,245,212,0.55)');
        // cubinhos de luz soltando da linha
        ctx.fillStyle = 'rgba(165,243,252,0.9)';
        for (let i = 0; i < 14; i++) {
          const ph = (t * (0.8 + rnd(i, 3)) + rnd(i, 4) * 30) % 30;
          ctx.globalAlpha = 1 - ph / 30;
          ctx.fillRect(Math.round(x + (rnd(i, 5) - 0.5) * size * 0.8), Math.round(yc - ph * 1.6), 4, 4);
        }
        ctx.globalAlpha = 1;
      }
      if (eyes > 0 && reveal > 0.8 && !o.animState) {
        const u = size / 36;
        const ey = feet - size * 0.87 + SPRITE_MAPY(10.1) * u;
        [-1, 1].forEach((s) => this.cineGlow(ctx, x + s * 3.5 * u, ey, u * 2.6, 'rgba(0,245,212,0.9)', eyes * (0.8 + 0.2 * Math.sin(t * 0.2))));
      }
    },

    // Linha da previsão da máquina (tracejada, com a seta e o rótulo)
    sselPredict(ctx, a, b, k, t, label, rgb = '0,200,230') {
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.strokeStyle = `rgba(${rgb},0.9)`;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = -t * 1.5;
      const e = ease(k);
      const c = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 60];
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const p = bez(a, c, b, (i / 20) * e);
        if (i) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      if (e > 0.95) {
        ctx.strokeStyle = `rgb(${rgb})`;
        ctx.lineWidth = 3;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.moveTo(b[0] + sx * 18, b[1] + sy * 18 - sy * 8);
          ctx.lineTo(b[0] + sx * 18, b[1] + sy * 18);
          ctx.lineTo(b[0] + sx * 18 - sx * 8, b[1] + sy * 18);
          ctx.stroke();
        });
      }
      ctx.restore();
      if (label && e > 0.9) this.ptdChip(ctx, label, b[0], b[1] - 40, `rgb(${rgb})`, seg(k, 0.9, 1), { size: 12 });
    },

    // ---------------------------------------------------------------- o campo do Blue Lock
    sselPitchBg(g, w, h) {
      const hz = PP(0, 6)[1];
      this.cineGradient(g, 0, 0, w, hz, [[0, '#02040b'], [0.6, '#071026'], [1, '#0c1a36']]);
      // treliça do teto e os refletores
      g.strokeStyle = 'rgba(30,41,59,0.7)';
      g.lineWidth = 2;
      for (let i = -8; i <= 8; i++) line(g, [640 + i * 30, 120], [640 + i * 220, -20]);
      [24, 60, 96].forEach((y) => line(g, [0, y], [w, y]));
      [[160, 70], [420, 92], [860, 92], [1120, 70]].forEach(([x, y]) => {
        g.fillStyle = '#0b1220';
        g.fillRect(x - 64, y - 18, 128, 36);
        g.fillStyle = '#e0f2fe';
        for (let i = 0; i < 4; i++) g.fillRect(x - 58 + i * 30, y - 12, 24, 24);
        this.cineGlow(g, x, y, 170, 'rgba(219,234,254,0.4)');
      });
      // a parede do fundo: placas, faixas ciano e o telão
      g.fillStyle = '#0a1428';
      g.fillRect(0, 170, w, hz - 170);
      g.strokeStyle = 'rgba(2,6,15,0.8)';
      g.lineWidth = 3;
      for (let x = 40; x < w; x += 120) line(g, [x, 170], [x, hz]);
      g.fillStyle = 'rgba(56,189,248,0.7)';
      g.fillRect(0, hz - 26, w, 3);
      g.fillRect(0, 176, w, 2);
      g.fillStyle = '#020617';
      g.fillRect(470, 186, 340, 92);
      g.strokeStyle = 'rgba(56,189,248,0.8)';
      g.lineWidth = 3;
      g.strokeRect(470, 186, 340, 92);
      g.font = 'italic 900 34px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(56,189,248,0.85)';
      g.fillText('BLUE LOCK', 640, 222);
      g.font = '900 13px "Segoe UI", sans-serif';
      g.fillStyle = 'rgba(226,232,240,0.7)';
      g.fillText('2 ª   S E L E Ç Ã O', 640, 256);
      // gramado em faixas
      const zs = [0.5, 1, 1.25, 1.55, 1.95, 2.45, 3.1, 3.95, 5, 6];
      for (let i = 0; i < zs.length - 1; i++) {
        const y0 = PP(0, zs[i + 1])[1];
        const y1 = PP(0, zs[i])[1];
        g.fillStyle = i % 2 ? '#14532d' : '#166534';
        g.fillRect(0, y0, w, y1 - y0 + 1);
      }
      const gr = g.createLinearGradient(0, hz, 0, h);
      gr.addColorStop(0, 'rgba(2,6,15,0.55)');
      gr.addColorStop(0.5, 'rgba(2,6,15,0.1)');
      gr.addColorStop(1, 'rgba(2,6,15,0.25)');
      g.fillStyle = gr;
      g.fillRect(0, hz, w, h - hz);
      g.strokeStyle = 'rgba(240,253,244,0.55)';
      g.lineWidth = 2.5;
      line(g, PP(-700, 0.5), PP(-700, 6));
      line(g, PP(1980, 0.5), PP(1980, 6));
      line(g, PP(-700, 6), PP(1980, 6));
      g.beginPath();
      [PP(160, 6), PP(160, 4.4), PP(1120, 4.4), PP(1120, 6)].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
      // o gol do fundo
      const a = PP(470, 6);
      const b = PP(810, 6);
      g.strokeStyle = '#f8fafc';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(a[0], a[1] - 30);
      g.lineTo(b[0], b[1] - 30);
      g.lineTo(b[0], b[1]);
      g.stroke();
      // luz dos refletores no gramado
      [[300, 1.6], [980, 1.6], [640, 3]].forEach(([X, z]) => {
        const p = PP(X, z);
        g.save();
        g.translate(p[0], p[1]);
        g.scale(1, 0.3);
        this.cineGlow(g, 0, 0, 420 / z, 'rgba(187,247,208,0.35)');
        g.restore();
      });
    },

    // ---------------------------------------------------------------- o estádio holográfico
    sselStadiumBg(g, w, h) {
      this.cineGradient(g, 0, 0, w, h, [[0, '#01030a'], [0.45, '#071233'], [1, '#03081a']]);
      // o anel do teto
      g.strokeStyle = 'rgba(56,189,248,0.35)';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(640, 40, 760, 120, 0, 0, Math.PI);
      g.stroke();
      for (let i = 0; i < 22; i++) {
        const a = (i / 21) * Math.PI;
        const x = 640 + Math.cos(a) * 760;
        const y = 40 + Math.sin(a) * 120;
        this.cineGlow(g, x, y, 26, 'rgba(165,243,252,0.8)');
      }
      // arquibancadas: anéis de torcida holográfica (pontos)
      for (let r = 0; r < 14; r++) {
        const y = 150 + r * 15;
        const rx = 700 + r * 26;
        g.fillStyle = r % 2 ? '#0a1636' : '#0c1a40';
        g.beginPath();
        g.ellipse(640, y + 120, rx, 150, 0, Math.PI * 1.04, Math.PI * 1.96);
        g.lineTo(640 + rx, y + 132);
        g.ellipse(640, y + 132, rx, 150, 0, Math.PI * 1.96, Math.PI * 1.04, true);
        g.closePath();
        g.fill();
        for (let i = 0; i < 90; i++) {
          const a = Math.PI * (1.06 + (i / 90) * 0.88);
          const x = 640 + Math.cos(a) * rx;
          const yy = y + 126 + Math.sin(a) * 150;
          const q = rnd(i + r * 90, 3);
          g.fillStyle = q < 0.55 ? 'rgba(56,189,248,0.55)' : q < 0.8 ? 'rgba(224,242,254,0.6)' : 'rgba(250,204,21,0.45)';
          g.fillRect(Math.round(x), Math.round(yy), 3, 3);
        }
      }
      // gramado em perspectiva (fuga em 640,300)
      const SP = (X, z) => [640 + (X - 640) / z, 300 + 420 / z];
      const zs = [0.5, 1, 1.25, 1.55, 1.95, 2.45, 3.1, 3.95, 5];
      for (let i = 0; i < zs.length - 1; i++) {
        const y0 = SP(0, zs[i + 1])[1];
        const y1 = SP(0, zs[i])[1];
        g.fillStyle = i % 2 ? '#14532d' : '#15803d';
        g.fillRect(0, y0, w, y1 - y0 + 1);
      }
      g.fillStyle = '#030a1a';
      g.fillRect(0, SP(0, 5)[1] - 8, w, 8);
      g.fillStyle = 'rgba(56,189,248,0.7)';
      g.fillRect(0, SP(0, 5)[1] - 9, w, 2);
      g.strokeStyle = 'rgba(240,253,244,0.55)';
      g.lineWidth = 2.5;
      line(g, SP(-1200, 0.5), SP(-1200, 5));
      line(g, SP(2480, 0.5), SP(2480, 5));
      g.beginPath();
      g.ellipse(640, SP(0, 2.2)[1], 300, 34, 0, 0, TAU);
      g.stroke();
      line(g, SP(-3000, 2.2), SP(4280, 2.2));
      const gr = g.createLinearGradient(0, 380, 0, h);
      gr.addColorStop(0, 'rgba(2,6,23,0.5)');
      gr.addColorStop(1, 'rgba(2,6,23,0.15)');
      g.fillStyle = gr;
      g.fillRect(0, 380, w, h - 380);
    },

    // Torcida holográfica "explodindo" (luz por cima do fundo do estádio)
    sselStadiumBurst(ctx, t, k, rgb = '56,189,248') {
      if (k <= 0) return;
      for (let i = 0; i < 9; i++) this.cineGlow(ctx, 80 + i * 140, 250 + Math.sin(i * 1.7) * 30, 190, `rgba(${rgb},0.5)`, k * (0.6 + 0.4 * Math.sin(t * 0.09 + i)));
      for (let i = 0; i < 22; i++) {
        const per = 40 + rnd(i, 3) * 40;
        const ph = ((t + rnd(i, 4) * per) % per) / per;
        const a = Math.sin(ph * Math.PI) * k;
        this.finSparkle(ctx, 40 + rnd(i, 5) * 1200, 150 + rnd(i, 6) * 200, 8 + rnd(i, 7) * 10, a, `rgba(${rgb},0.8)`);
      }
    },

    // Placar flutuante (LED). o.text troca os números por um letreiro (sem placar exato)
    sselBoard(ctx, x, y, hs, as, o = {}) {
      const k = o.k ?? 1;
      if (k <= 0) return;
      const s = o.s || 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.translate(x, y);
      ctx.scale(s, s);
      const w = 560;
      const h = 96;
      ctx.fillStyle = 'rgba(2,6,23,0.92)';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      const rgb = o.red ? '239,68,68' : o.green ? '34,197,94' : '56,189,248';
      ctx.strokeStyle = `rgba(${rgb},0.9)`;
      ctx.lineWidth = 3;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      this.finFillPat(ctx, 'scan', -w / 2, -h / 2, w, h, 0.6);
      ctx.font = '900 18px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('BLUE LOCK', -w / 2 + 20, 0);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fde68a';
      ctx.fillText('WORLD FIVE', w / 2 - 20, 0);
      if (o.text) this.finPixelText(ctx, o.text, 0, 0, 3.4, o.textColor || '#f8fafc', 'center', 250);
      else {
        const pop = o.pop || 0;
        const col = o.red ? '#fca5a5' : '#f8fafc';
        ctx.save();
        ctx.translate(-56, 0);
        ctx.scale(1 + (o.popSide === 'h' ? pop * 0.4 : 0), 1 + (o.popSide === 'h' ? pop * 0.4 : 0));
        this.finPixelText(ctx, String(hs), 0, 0, 5, '#f8fafc', 'center');
        ctx.restore();
        this.finPixelText(ctx, 'x', 0, 0, 3.4, '#94a3b8', 'center');
        ctx.save();
        ctx.translate(56, 0);
        ctx.scale(1 + (o.popSide === 'a' ? pop * 0.4 : 0), 1 + (o.popSide === 'a' ? pop * 0.4 : 0));
        this.finPixelText(ctx, String(as), 0, 0, 5, col, 'center');
        ctx.restore();
      }
      ctx.restore();
      this.cineGlow(ctx, x, y, 300 * s, `rgba(${rgb},0.22)`, k);
    },

    // Ajoelhado: o boneco afunda até os joelhos tocarem o chão (canelas recortadas abaixo do
    // chão). Devolve o "pé" usado para desenhar o boneco (serve para rincShade/cabeça)
    sselKneel(ctx, ch, x, ground, size, o = {}) {
      const u = size / 36;
      const feet = ground + 4.4 * u;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - size, ground - size * 1.2, size * 2, size * 1.2 + 1);
      ctx.clip();
      this.finSpr(ctx, ch, x, feet, size, o);
      ctx.restore();
      ctx.fillStyle = 'rgba(2,6,23,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, ground, size * 0.3, size * 0.045, 0, 0, TAU);
      ctx.fill();
      return feet;
    },

    // Inverte as cores da imagem (o quadro de impacto em negativo do anime): uma passada só
    sselNeg(ctx, S) {
      ctx.save();
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, S.top, S.W, S.bot - S.top);
      ctx.restore();
    },
    // Quadro de impacto em negativo: linhas radiais + os bonecos de verdade, tudo invertido
    sselImpact(ctx, S, cx, cy, figs, text, color, u, rot = -0.06, tx = 0, ty = 0) {
      this.ptdImpactBg(ctx, S, cx, cy, NEG_INK, NEG_PAPER, u * 0.01);
      figs.forEach((f) => this.finSpr(ctx, f.c, f.x, f.feet, f.size, f.o || {}));
      this.sselNeg(ctx, S);
      if (text) this.cineImpactText(ctx, text, tx || S.W * 0.68, ty || S.top + 120, 130, color, seg(u, 0, 4), S.W * 0.5, rot);
    }
  });

  // ==========================================================================
  // 1. O BLUE LOCK MAN — a câmara branca
  // ==========================================================================
  const BALL0 = [470, 620];
  const SHOTS = [
    { w0: 16, k: 32, hit: 50, tx: 506, ty: 372, dir: -1 },
    { w0: 150, k: 166, hit: 184, tx: 778, ty: 362, dir: 1 }
  ];
  Object.assign(CE, {
    // você de costas com a bola, no primeiro plano da câmara
    sselBlmYou(ctx, t, st = 'idle', rim = '#7dd3fc') {
      const c = this.sselCast();
      this.finRim(ctx, c.you, 400, 652, 290, { facing: 'back', animState: st === 'idle' ? undefined : st, frame: 1 }, rim, [-1, 1], 2);
    },
    // o robô no gol (parado, mergulhando ou caído)
    sselBlmKeeper(ctx, t, s, rv = 1) {
      const size = 168;
      if (!s || t < s.k - 2) {
        const sway = Math.sin(t * 0.05) * 6;
        this.sselRobot(ctx, 640 + sway, 517, size, {}, rv, t);
        return { x: 640 + sway, feet: 517 };
      }
      const e = ease(seg(t, s.k - 2, s.hit));
      const tx = s.tx - s.dir * 0.46 * size;
      const tf = s.ty + 0.64 * size;
      const x = lerp(640, tx, e);
      const feet = lerp(517, tf, e) + (t > s.hit + 6 ? ease(seg(t, s.hit + 6, s.hit + 22)) * (560 - tf) : 0);
      this.sselRobot(ctx, x, feet, size, { animState: 'dive', flipX: s.dir < 0, frame: 1 }, 1, t, 0);
      return { x, feet, hand: [x + s.dir * 0.46 * size, feet - 0.64 * size] };
    },

    // PLANO 1 — "FASE 1" no preto → a câmara branca → o robô se materializa no gol
    sselBlm0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const intro = 50;
      if (t < intro) {
        ctx.fillStyle = '#020409';
        ctx.fillRect(0, 0, W, H);
        const cy = (top + bot) / 2;
        this.cineGlow(ctx, W / 2, cy, 380, 'rgba(56,189,248,0.18)', seg(t, 0, 20));
        this.finKicker(ctx, W / 2, cy - 74, 'BLUE LOCK • 2ª SELEÇÃO', seg(t, 2, 24), '#38bdf8', 'center');
        this.rincStamp(ctx, 'FASE 1', W / 2, cy, 104, '#f8fafc', t, 8, 3, W * 0.7);
        this.finKicker(ctx, W / 2, cy + 78, 'VOCÊ  x  A MÁQUINA', seg(t, 22, 40), YOU_C, 'center');
        this.cineFlash(ctx, W, H, seg(t, 38, intro), '#f8fafc');
        this.cineSfx(S, 8, 'abre', () => window.SFX?.whoosh?.());
        return;
      }
      const u = t - intro;
      const k = easeIO(u / (S.dur - intro));
      const rv = ease(seg(u, 40, 150));
      const talk = seg(u, 0, 8) * (1 - seg(u, 200, 214));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(372, 420, k), zoom: lerp(1.0, 1.28, k), shake: 0.4 });
      ctx.drawImage(this.finBg('ssel_chamber', 1280, 720, this.sselChamberBg), 0, 0);
      this.sselScreen(ctx, u, { title: 'BLUE LOCK MAN', sub: rv < 1 ? 'INICIANDO...' : 'FASE 1 • DERROTE-O', k: seg(u, 6, 30) });
      this.cineShafts(ctx, 640, -10, Math.PI / 2, 640, 1.0, 6, '224,242,254', 0.07, t);
      // o círculo de onde ele nasce
      ctx.save();
      ctx.translate(640, 518);
      ctx.scale(1, 0.24);
      this.cineGlow(ctx, 0, 0, 120, 'rgba(0,245,212,0.7)', seg(u, 20, 50) * (1 - 0.5 * seg(u, 150, 200)));
      ctx.restore();
      this.sselRobot(ctx, 640, 517, 168, {}, rv, u);
      this.sselGoal(ctx, u);
      this.mgmHoloTag(ctx, 640, 517 - 168 * 0.87 - 16, 'BLUE LOCK MAN', '0,170,160', seg(u, 150, 186), u);
      this.ptdBall(ctx, BALL0[0], BALL0[1], 12, 0);
      this.sselBlmYou(ctx, u);
      ctx.restore();
      this.cineDust(ctx, W, H, t, 26, 'rgba(56,189,248,0.5)', 5);
      this.finKicker(ctx, 40, top + 30, 'BLUE LOCK • 2ª SELEÇÃO • CÂMARA 01', seg(u, 8, 50), '#0ea5e9');
      this.finKicker(ctx, 40, top + 58, 'UM GOLEIRO QUE LÊ COMO OS MELHORES DO MUNDO', seg(u, 50, 120), '#0f766e');
      this.sselVoice(ctx, W - 340, bot - 92, t, talk, 'VOZ • JINPACHI EGO');
      this.cineFlash(ctx, W, H, 1 - seg(t, intro, intro + 26), '#f8fafc');
      this.cineSfx(S, intro + 40, 'robo', () => window.SFX?.blip?.(140));
      this.cineSfx(S, intro + 150, 'pronto', () => window.SFX?.blip?.(420));
    },

    // PLANO 2 — o chute, a previsão antes do chute, a defesa (duas vezes) → DEFENDIDO
    sselBlm1(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.sselCast();
      const s = t < 140 ? SHOTS[0] : SHOTS[1];
      const imp = SHOTS[1].hit + 2;
      if (t >= imp && t < imp + 14) {
        const u = t - imp;
        // a máquina voando no ângulo, a bola presa nas mãos
        this.ptdImpactBg(ctx, S, 860, 250, NEG_INK, NEG_PAPER, u * 0.01);
        this.finSpr(ctx, c.robot, 640, 620, 520, { animState: 'dive', frame: 1 });
        const pts = [];
        for (let i = 0; i < 6; i++) pts.push({ x: 880 - i * 70, y: 262 + i * 46 });
        this.ptdStreak(ctx, pts, NEG_PAPER, 36, 1);
        ctx.fillStyle = NEG_PAPER;
        ctx.beginPath();
        ctx.arc(884, 258, 40, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.strokeStyle = NEG_INK;
        ctx.stroke();
        this.sselNeg(ctx, S);
        this.cineImpactText(ctx, 'DEFENDIDO!', 360, S.bot - 90, 110, '#ef4444', seg(u, 0, 4), 620, -0.07);
        this.cineSfx(S, imp, 'impacto', () => window.SFX?.save?.());
        return;
      }
      const saves = 6 + (t >= SHOTS[0].hit ? 1 : 0) + (t >= SHOTS[1].hit ? 1 : 0);
      const after = t >= imp + 14 ? 1 - seg(t, imp + 14, imp + 40) : 0;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(590, 620, easeIO(t / 300)), y: 412, zoom: 1.14 + easeIO(t / 300) * 0.06, shake: 0.5 + after * 8 });
      ctx.drawImage(this.finBg('ssel_chamber', 1280, 720, this.sselChamberBg), 0, 0);
      this.sselScreen(ctx, t, { title: 'DEFESAS: ' + String(saves).padStart(2, '0'), sub: 'GOLS: 00 • LEITURA 99,8%', red: t >= SHOTS[0].hit });
      // previsão: aparece ANTES do chute
      this.sselPredict(ctx, BALL0, [s.tx, s.ty], seg(t, s.w0 + 2, s.w0 + 14) * (1 - seg(t, s.hit + 10, s.hit + 30)), t, 'PREVISÃO 99,8%');
      const kp = this.sselBlmKeeper(ctx, t, t >= s.k - 2 && t < (s === SHOTS[0] ? 104 : 400) ? s : null);
      this.sselGoal(ctx, t);
      // a bola
      let bx = BALL0[0];
      let by = BALL0[1];
      let br = 12;
      if (t >= s.k && t < s.hit) {
        const e = seg(t, s.k, s.hit);
        const c2 = [(BALL0[0] + s.tx) / 2, Math.min(BALL0[1], s.ty) - 60];
        [bx, by] = bez(BALL0, c2, [s.tx, s.ty], e);
        br = lerp(12, 8, e);
        const pts = [];
        for (let i = 0; i < 8; i++) {
          const p = bez(BALL0, c2, [s.tx, s.ty], Math.max(0, e - i * 0.05));
          pts.push({ x: p[0], y: p[1] });
        }
        this.ptdStreak(ctx, pts, '#38bdf8', 16, 0.8);
      } else if (t >= s.hit && kp.hand) {
        [bx, by] = kp.hand;
        br = 8;
      } else if (s === SHOTS[0] && t >= 104 && t < 150) {
        // a bola volta rolando
        const e = easeIO(seg(t, 106, 140));
        bx = lerp(640, BALL0[0], e);
        by = lerp(522, BALL0[1], e);
        br = lerp(8, 12, e);
      }
      if (!(s === SHOTS[0] && t >= 96 && t < 106)) this.ptdBall(ctx, bx, by, br, t * 0.4);
      // o robô "reinicia" depois da primeira defesa
      if (s === SHOTS[0] && t >= 96 && t < 112) this.sselRobot(ctx, 640, 517, 168, {}, seg(t, 96, 112), t);
      const st = t >= s.w0 && t < s.k ? 'windup' : t >= s.k && t < s.k + 18 ? 'shoot' : 'idle';
      this.sselBlmYou(ctx, t, st);
      ctx.restore();
      SHOTS.forEach((sh, i) => {
        const a = seg(t, sh.hit, sh.hit + 6) * (1 - seg(t, sh.hit + 50, sh.hit + 70));
        if (a > 0 && i === 0) this.cineImpactText(ctx, 'DEFENDIDO!', 960, S.bot - 120, 64, '#ef4444', seg(t, sh.hit, sh.hit + 8), 520, -0.08);
      });
      if (t >= imp + 14) this.rincStamp(ctx, 'LIDO.', 940, top + 120, 70, '#ef4444', t, imp + 30, 3, 0, 'center', 1 - seg(t, 280, 298));
      this.finKicker(ctx, 40, top + 30, 'TENTATIVA Nº ' + (t < 140 ? 7 : 8), seg(t, 4, 30), '#ef4444');
      SHOTS.forEach((sh, i) => {
        this.cineSfx(S, sh.k, 'chute' + i, () => window.SFX?.kick?.(0.8));
        this.cineSfx(S, sh.hit, 'defesa' + i, () => window.SFX?.save?.());
      });
      if (t >= imp + 14) this.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, imp + 14, imp + 24)), '#e0f2fe');
    },

    // PLANO 3 — página de mangá: os olhos da máquina, você no chão, o contador
    sselBlm2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, W, H);
      this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
      const mid = 344;
      // A: os olhos do BLUE LOCK MAN
      const kA = ease(seg(t, 0, 16));
      this.finPanel(ctx, [[20, top + 14], [W - 20, top + 14], [W - 20, mid - 10], [20, mid]], () => {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, top, W, mid - top);
        const ey = (top + mid) / 2 + 4;
        const z = 1 + easeIO(t / 300) * 0.05;
        ctx.save();
        ctx.translate(640, ey);
        ctx.scale(z, z);
        ctx.translate(-640, -ey);
        const U = this.wcdEyeBand(ctx, c.robot, 640, ey + 20, 960, {});
        this.wcdEyes(ctx, 640, ey + 20, U, { ring: '#00f5d4', iris: '#083344', white: '#a5f3fc', line: '#020617', glow: 'rgba(0,245,212,0.6)', tiny: t > 40, look: t > 40 ? Math.round(Math.sin(t * 0.07) * 1.4) : 0 });
        ctx.restore();
        // a mira e a leitura
        ctx.strokeStyle = 'rgba(0,245,212,0.7)';
        ctx.lineWidth = 2;
        [640 - 3.5 * 60, 640 + 3.5 * 60].forEach((x) => {
          ctx.beginPath();
          ctx.arc(x, ey + 20, 92 + Math.sin(t * 0.1) * 5, 0, TAU);
          ctx.stroke();
          line(ctx, [x - 124, ey + 20], [x - 100, ey + 20]);
          line(ctx, [x + 100, ey + 20], [x + 124, ey + 20]);
        });
        const sy = top + ((t * 2.2) % (mid - top));
        ctx.fillStyle = 'rgba(0,245,212,0.12)';
        ctx.fillRect(0, sy, W, 10);
        this.finFillPat(ctx, 'scan', 0, top, W, mid - top, 0.6);
        ctx.font = '900 15px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#5eead4';
        ctx.fillText(this.cineType('> ANALISANDO O ATACANTE...', seg(t, 6, 40)), 50, top + 44);
        ctx.fillText(this.cineType('> PADRÃO DE CHUTE: LIDO • 100%', seg(t, 30, 80)), 50, mid - 34);
      }, { dx: (1 - kA) * -W });
      // B: você no chão
      const kB = ease(seg(t, 70, 86));
      if (kB > 0) {
        this.finPanel(ctx, [[20, mid + 12], [720, mid + 4], [704, bot - 14], [20, bot - 14]], () => {
          const lt = t - 70;
          this.cineGradient(ctx, 0, mid, 740, bot - mid, [[0, '#e2e8f0'], [1, '#cbd5e1']]);
          ctx.strokeStyle = 'rgba(56,189,248,0.3)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 12; i++) line(ctx, [i * 80 - 120, bot], [i * 70 - 40, mid + 40]);
          line(ctx, [0, bot - 90], [740, bot - 110]);
          // a bola rolando para longe
          const bx = lerp(380, 690, ease(seg(lt, 0, 90)));
          this.ptdBall(ctx, bx, bot - 70, 18, lt * 0.3);
          ctx.save();
          const rise = ease(seg(lt, 120, 200));
          ctx.translate(250, bot - 66 - rise * 20);
          ctx.rotate(-lerp(1.45, 1.05, rise));
          this.finRim(ctx, c.you, 0, 110, 250, {}, '#7dd3fc', [-1, 1], 2);
          ctx.restore();
          this.rincDrops(ctx, [190, 230, 280], bot - 150, bot - 40, lt, 4, 6);
          if (lt < 40) this.cineImpactText(ctx, 'TUM!', 560, mid + 70, 56, '#0f172a', seg(lt, 0, 6), 0, -0.1);
          this.rincStamp(ctx, 'DE NOVO.', 520, mid + 66, 38, '#0f172a', lt, 120, 3, 0, 'center');
        }, { dy: (1 - kB) * 300 });
      }
      // C: o contador
      const kC = ease(seg(t, 130, 146));
      if (kC > 0) {
        this.finPanel(ctx, [[738, mid + 4], [W - 20, mid + 12], [W - 20, bot - 14], [722, bot - 14]], () => {
          const lt = t - 130;
          this.cineGradient(ctx, 700, mid, 600, bot - mid, [[0, '#1a0608'], [1, '#07040a']]);
          const n = Math.floor(lerp(9, 63, easeIn(seg(lt, 0, 130))));
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 14px "Segoe UI", sans-serif';
          ctx.fillStyle = '#fca5a5';
          ctx.fillText('T E N T A T I V A S', 1000, mid + 40);
          this.finPixelText(ctx, String(n).padStart(2, '0'), 1000, mid + 112, 9, '#f8fafc', 'center');
          ctx.font = '900 20px "Segoe UI", sans-serif';
          ctx.fillStyle = '#ef4444';
          ctx.fillText('GOLS: 0', 1000, mid + 176);
          for (let i = 0; i < Math.min(30, n - 8); i++) {
            const x = 790 + (i % 10) * 42;
            const y = mid + 206 + Math.floor(i / 10) * 26;
            ctx.strokeStyle = 'rgba(239,68,68,0.85)';
            ctx.lineWidth = 3;
            line(ctx, [x - 7, y - 7], [x + 7, y + 7]);
            line(ctx, [x + 7, y - 7], [x - 7, y + 7]);
          }
        }, { dx: (1 - kC) * 600 });
      }
      this.cineSfx(S, 70, 'tombo', () => window.SFX?.tackle?.());
      this.cineSfx(S, 130, 'pagina', () => window.SFX?.page?.());
    },

    // PLANO 4 — o seu rosto: a ideia (a arma que a máquina não lê)
    sselBlm3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const click = 150;
      const room = this.finBg('ssel_chamber', 1280, 720, this.sselChamberBg);
      this.mgmBlurDraw(ctx, this.mgmBlur('ssel_chamber_blur', room, 1280, 720, 10), W, 380, 160, 520, 292, -60, -40, W + 120, H + 80);
      // o branco da câmara apaga: só sobra você e a ideia
      const dk = seg(t, click - 10, click + 20);
      this.foxcGradH(ctx, 0, 0, W, H, [[0, `rgba(2,10,24,${0.15 + 0.6 * dk})`], [0.55, `rgba(2,10,24,${0.35 + 0.5 * dk})`], [1, `rgba(2,10,24,${0.7 + 0.25 * dk})`]]);
      this.cineGlow(ctx, 470, 120, 420, 'rgba(224,242,254,0.35)', 1 - dk * 0.6);
      this.cineDust(ctx, W, H, t, 24, 'rgba(165,243,252,0.45)', 12);
      if (t >= click) this.foxcRays(ctx, 470, 360, 0, 900, 48, '#67e8f9', 0.16 * seg(t, click, click + 10), (t - click) * 0.004, 0.03);
      const k = easeIO(t / 300);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640 + this.cineNoise(t * 0.5, 2) * 3, y: lerp(360, 350, k), zoom: 1 + k * 0.06 + (t >= click ? 0.03 * (1 - seg(t, click, click + 20)) : 0), shake: t >= click ? 5 * (1 - seg(t, click, click + 24)) : 0 });
      const x = 470;
      const eyeY = 356;
      const r = this.finHead(ctx, c.you, x, eyeY, 1000, { rim: '#bae6fd', dim: 0.12, dimTint: '8,20,40' });
      const eye = c.you.eyeColor || '#ef4444';
      const sharp = t >= click;
      this.wcdEyes(ctx, x, eyeY, r.u, {
        ring: sharp ? '#5eead4' : eye, iris: sharp ? '#083344' : this.finShade(eye, -0.55), tiny: sharp, half: t < 70,
        lid: this.finShade(c.you.skinColor || '#f3d1b8', -0.18), angry: t > click + 30, glow: 'rgba(0,245,212,0.5)', glowA: seg(t, click, click + 20),
        reflect: !sharp ? '#00f5d4' : null, look: t < click ? 1 : 0
      });
      this.rincDrops(ctx, [x - 9.4 * r.u, x + 9.0 * r.u], r.top + 13 * r.u, H + 40, t, r.u * 0.4, 5);
      ctx.restore();
      // painel: a bola voltando rolando até você
      const kp = ease(seg(t, 50, 66)) * (1 - seg(t, click - 6, click + 4));
      if (kp > 0) {
        this.finPanel(ctx, [[836, top + 20], [W - 22, top + 14], [W - 22, top + 250], [856, top + 262]], () => {
          this.cineGradient(ctx, 820, top, 460, 260, [[0, '#e2e8f0'], [1, '#bfcad8']]);
          ctx.strokeStyle = 'rgba(56,189,248,0.35)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 8; i++) line(ctx, [840 + i * 70, top + 260], [1000 + i * 30, top + 60]);
          const e = ease(seg(t, 56, 140));
          this.ptdBall(ctx, lerp(1060, 1100, e), lerp(top + 130, top + 196, e), lerp(14, 46, e), t * 0.25);
          this.rincStamp(ctx, 'A BOLA VOLTA...', 1050, top + 50, 26, '#0f172a', t, 70, 2);
        }, { dx: (1 - kp) * 460 });
      }
      // a ideia
      if (sharp) {
        const u = t - click;
        this.rincStamp(ctx, 'SEM DOMINAR.', 1000, top + 110, 46, '#f8fafc', u, 8, 2, 520);
        this.rincStamp(ctx, 'SEM AVISO.', 1000, top + 180, 46, '#f8fafc', u, 34, 2, 520);
        this.cineImpactText(ctx, 'CHUTE DIRETO.', 990, bot - 110, 70, YOU_C, seg(u, 66, 76), 540, -0.05);
        this.cineFlash(ctx, W, H, 0.3 * (1 - seg(u, 0, 10)), '#a5f3fc');
      }
      this.cineSfx(S, click, 'clique', () => window.SFX?.kick?.(0.6));
    },

    // PLANO 5 — de primeira: a previsão chega tarde. GOL. A câmara fica verde.
    sselBlm4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const kick = 42;
      const hit = 60;
      const tgt = [508, 372];
      if (t >= hit && t < hit + 16) {
        const u = t - hit;
        // de primeira: você em tinta, a bola rasgando até o ângulo, a máquina caindo tarde
        this.ptdImpactBg(ctx, S, 980, 220, NEG_INK, NEG_PAPER, u * 0.01);
        this.finSpr(ctx, c.robot, 1040, 600, 300, { animState: 'dive', frame: 1 });
        this.finSpr(ctx, c.you, 360, 820, 640, { animState: 'shoot', frame: 1 });
        const pts = [];
        for (let i = 0; i < 8; i++) pts.push({ x: 960 - i * 70, y: 200 + i * 52 });
        this.ptdStreak(ctx, pts, NEG_PAPER, 44, 1);
        ctx.fillStyle = NEG_PAPER;
        ctx.beginPath();
        ctx.arc(960, 200, 36, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 7;
        ctx.strokeStyle = NEG_INK;
        ctx.stroke();
        this.sselNeg(ctx, S);
        this.cineImpactText(ctx, 'GOL!', 760, S.bot - 96, 140, '#22c55e', seg(u, 0, 4), 0, -0.08);
        this.cineSfx(S, hit, 'gol', () => window.SFX?.goal?.(true));
        return;
      }
      const won = t >= hit + 16;
      const after = won ? 1 - seg(t, hit + 16, hit + 46) : 0;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(600, 680, seg(t, hit, 300)), y: lerp(414, 400, seg(t, hit, 300)), zoom: lerp(1.16, 1.08, seg(t, hit, 300)), shake: 0.5 + after * 9 });
      ctx.drawImage(this.finBg('ssel_chamber', 1280, 720, this.sselChamberBg), 0, 0);
      if (won) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgba(187,247,208,${0.55 * seg(t, hit + 16, hit + 60)})`;
        ctx.fillRect(-100, -100, W + 200, H + 200);
        ctx.restore();
      }
      this.sselScreen(ctx, t, won ? { title: 'DERROTADO', sub: 'GOLS: 01 • FASE 1 CONCLUÍDA', green: true } : { title: 'DEFESAS: 63', sub: 'GOLS: 00', red: true });
      // a previsão chega tarde e erra o lado
      this.sselPredict(ctx, BALL0, [780, 470], seg(t, kick + 8, kick + 20) * (1 - seg(t, hit + 30, hit + 50)), t, 'ERRO • SEM PADRÃO', '239,68,68');
      // o robô: atrasado, mergulha para o lado errado e cai
      const size = 168;
      if (t < kick + 8) this.sselRobot(ctx, 640, 517, size, {}, 1, t);
      else {
        const e = ease(seg(t, kick + 8, hit + 24));
        const x = lerp(640, 760, e);
        const feet = lerp(517, 500, e) + ease(seg(t, hit + 24, hit + 40)) * 50;
        this.sselRobot(ctx, x, feet, size, { animState: 'dive', frame: 1 }, 1, t, 0);
      }
      const bulge = t >= hit ? Math.exp(-(t - hit - 16) / 26) * Math.max(0, Math.cos((t - hit) * 0.2)) + (t < hit + 16 ? 1 : 0) : 0;
      this.sselGoal(ctx, t, { bulge: Math.min(1, Math.abs(bulge)), bx: tgt[0], by: tgt[1], green: won });
      // a bola: rola de volta → de primeira → no ângulo
      let bx;
      let by;
      let br = 12;
      if (t < kick) {
        const e = easeIO(seg(t, 0, kick));
        bx = lerp(640, BALL0[0], e);
        by = lerp(522, BALL0[1], e);
        br = lerp(8, 12, e);
      } else if (t < hit) {
        const e = seg(t, kick, hit);
        const c2 = [(BALL0[0] + tgt[0]) / 2 - 30, 330];
        [bx, by] = bez(BALL0, c2, tgt, e);
        br = lerp(12, 8, e);
        const pts = [];
        for (let i = 0; i < 8; i++) {
          const p = bez(BALL0, c2, tgt, Math.max(0, e - i * 0.05));
          pts.push({ x: p[0], y: p[1] });
        }
        this.ptdStreak(ctx, pts, '#00f5d4', 18, 0.9);
      } else {
        const d = ease(seg(t, hit + 16, hit + 40));
        bx = lerp(tgt[0] + 10, 560, d);
        by = lerp(tgt[1] - 6, 505, d);
        br = 8;
      }
      this.ptdBall(ctx, bx, by, br, t * 0.5, t >= kick && t < hit ? '#00f5d4' : null);
      const st = t >= kick - 6 && t < kick ? 'windup' : t >= kick && t < kick + 30 ? 'shoot' : 'idle';
      this.sselBlmYou(ctx, t, st, won ? '#86efac' : '#7dd3fc');
      ctx.restore();
      if (won) {
        this.cineDust(ctx, W, H, t, 30, 'rgba(34,197,94,0.6)', 9);
        this.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, hit + 16, hit + 28)), '#dcfce7');
        const tk = seg(t, 210, 246);
        if (tk > 0) {
          this.foxcGrad(ctx, 0, bot - 260, W, 260, [[0, 'rgba(2,6,23,0)'], [0.4, `rgba(2,6,23,${0.8 * tk})`], [1, `rgba(2,6,23,${0.9 * tk})`]]);
          this.cineTitleCard(ctx, W, bot - 106, tk, { kicker: '2ª SELEÇÃO • FASE 1', title: 'APROVADO', sub: 'O que a máquina não lê, a máquina não defende.', color: '#22c55e' });
        }
      } else this.finKicker(ctx, 40, top + 30, 'TENTATIVA Nº 64', seg(t, 4, 30), '#ef4444');
      this.cineSfx(S, kick, 'chute', () => window.SFX?.kick?.(1));
      this.cineSfx(S, 210, 'aprovado', () => window.SFX?.blip?.(660));
    }
  });

  // ==========================================================================
  // 2. O RIN LEVA O BACHIRA (sala branca da cine_manga). v = 'lose' | 'win'
  // ==========================================================================
  Object.assign(CE, {
    // texto novo por cima do telão da sala branca
    sselRoomScreen(ctx, t, title, sub, rgb = '3,105,161') {
      const sx = 467.8;
      const sw = 344.4;
      const sy = 179.4;
      const sh = 140;
      ctx.save();
      ctx.fillStyle = '#d6ecfa';
      ctx.fillRect(sx + 2, sy + 2, sw - 4, sh - 4);
      ctx.fillStyle = 'rgba(14,165,233,0.12)';
      for (let y = sy; y < sy + sh; y += 4) ctx.fillRect(sx + 2, y, sw - 4, 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 14px "Segoe UI", sans-serif';
      ctx.fillStyle = '#0369a1';
      ctx.fillText('F I M   D E   J O G O', sx + sw / 2, sy + 34);
      ctx.font = 'italic 900 30px "Segoe UI", sans-serif';
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.fillText(title, sx + sw / 2, sy + 76, sw - 24);
      ctx.font = '800 12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#0369a1';
      ctx.fillText(sub, sx + sw / 2, sy + 112, sw - 24);
      const by = sy + ((t * 1.1) % sh);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(sx + 2, by, sw - 4, 5);
      ctx.restore();
    },
    // personagem na sala (z = profundidade) ajoelhado ou de pé
    sselRoomChar(ctx, ch, X, z, o = {}, kneel = 0, rim = null, sides = [-1, 1]) {
      const [x, feet] = RP(X, z);
      const size = 330 / z;
      this.mgmFloorShadow(ctx, x, feet + 2, size * 0.28);
      if (kneel) {
        const oo = rim ? Object.assign({}, o, { rim, rimSides: sides, rimD: 2 }) : o;
        return { x, feet: this.sselKneel(ctx, ch, x, feet, size, oo, kneel), size };
      }
      if (rim) this.finRim(ctx, ch, x, feet, size, o, rim, sides, 2);
      else this.finSpr(ctx, ch, x, feet, size, o);
      return { x, feet, size };
    },

    // PLANO 1 — fim do 3x3: vocês três (de costas) e o Top 3 lá na frente
    sselRtb0(ctx, S, v) {
      const { W, H, top, bot } = S;
      const c = this.sselCast();
      const win = v === 'win';
      const intro = 44;
      // abertura no preto: o apito final (a sala branca é pintada aos poucos enquanto isso)
      if (S.t < intro) {
        ctx.fillStyle = '#020409';
        ctx.fillRect(0, 0, W, H);
        const cy = (top + bot) / 2;
        this.cineGlow(ctx, W / 2, cy, 380, win ? 'rgba(34,197,94,0.16)' : 'rgba(34,211,238,0.16)', seg(S.t, 0, 20));
        this.finKicker(ctx, W / 2, cy - 70, '2ª SELEÇÃO • 3 x 3 CONTRA O TOP 3', seg(S.t, 2, 22), '#38bdf8', 'center');
        this.rincStamp(ctx, 'FIM DE JOGO', W / 2, cy + 4, 92, '#f8fafc', S.t, 6, 2, W * 0.7);
        this.cineFlash(ctx, W, H, seg(S.t, 34, intro), '#f8fafc');
        this.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
        return;
      }
      const t = S.t - intro;
      const k = easeIO(t / (S.dur - intro));
      ctx.save();
      this.mgmCam(ctx, S, { x: 640, y: lerp(390, 372, k), zoom: lerp(1.04, 1.22, k), shake: 0.4 });
      ctx.drawImage(this.mgmRoom(), 0, 0);
      this.sselRoomScreen(ctx, t, win ? 'VENCEDOR: SEU TIME' : 'VENCEDOR: TIME RIN', win ? 'PELA REGRA, O VENCEDOR ESCOLHE UM JOGADOR' : 'O VENCEDOR ESCOLHE UM JOGADOR DO PERDEDOR', win ? '21,128,61' : '15,118,110');
      this.cineShafts(ctx, 640, -10, Math.PI / 2, 640, 1.1, 6, '224,242,254', 0.08, t);
      // o Top 3
      this.sselRoomChar(ctx, c.aryu, 420, 1.95, {}, win ? 3.4 : 0, '#a855f7');
      this.sselRoomChar(ctx, c.toki, 870, 1.92, {}, win ? 3.4 : 0, '#65a30d');
      this.cineGlow(ctx, RP(640, 1.75)[0], RP(640, 1.75)[1] - 100, 170, 'rgba(34,211,238,0.3)');
      this.sselRoomChar(ctx, c.rin, 640, 1.75, {}, 0, '#0891b2');
      ctx.restore();
      // vocês três em primeiro plano (de costas), ajoelhados na derrota
      ctx.save();
      this.mgmCam(ctx, S, { x: 640, y: 360 + k * 10, zoom: 1 + k * 0.08, shake: 0.6 });
      const fg = [[c.nagi, 140, 330], [c.you, 330, 360], [c.bachira, 1100, 340]];
      fg.forEach(([ch, x, size], i) => {
        const feet = 700 + i * 6;
        const o = { facing: 'back', dim: 0.18, dimTint: '30,41,59' };
        if (!win) {
          const up = this.sselKneel(ctx, ch, x, feet, size, Object.assign({}, o, { rim: '#94a3b8', rimSides: [-1, 1], rimD: 2 }), 3.6);
          const u = size / 36;
          this.rincDrops(ctx, [x - 8 * u, x + 8 * u], up - size * 0.87 + SPRITE_MAPY(14) * u, 760, t + i * 20, u * 0.4, 3 + i);
        } else this.finRim(ctx, ch, x, feet, size, o, '#94a3b8', [-1, 1], 2);
      });
      ctx.restore();
      this.cineDust(ctx, W, H, t, 26, 'rgba(56,189,248,0.45)', 3);
      this.finKicker(ctx, 40, top + 30, '2ª SELEÇÃO • 3 x 3 CONTRA O TOP 3', seg(t, 8, 50), '#0ea5e9');
      this.finKicker(ctx, 40, top + 58, win ? 'O TOP 3 CAIU' : 'O VENCEDOR ESCOLHE QUEM LEVA', seg(t, 40, 90), win ? '#16a34a' : '#0f766e');
      this.cineFlash(ctx, W, H, 1 - seg(t, 0, 24), '#f8fafc');
    },

    // PLANO 2 — o Rin de baixo (frio) → de cima: a sombra dele cobrindo vocês
    sselRtb1(ctx, S, v) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const win = v === 'win';
      const cut = 160;
      if (t < cut) {
        const k = easeIO(t / cut);
        this.cineGradient(ctx, 0, 0, W, H, [[0, '#f8fafc'], [1, '#c7d3e0']]);
        // teto visto de baixo: os painéis de luz convergindo para cima
        ctx.save();
        ctx.strokeStyle = 'rgba(56,189,248,0.25)';
        ctx.lineWidth = 2;
        for (let i = -8; i <= 8; i++) line(ctx, [640 + i * 30, -300], [640 + i * 220, H]);
        [[-60, 70], [140, 250]].forEach(([y0, y1], j) => {
          [-1, 1].forEach((s) => {
            const pts = [[640 + s * (60 + j * 20), y0], [640 + s * (260 + j * 120), y0], [640 + s * (330 + j * 150), y1], [640 + s * (90 + j * 30), y1]];
            ctx.fillStyle = '#ffffff';
            poly(ctx, pts);
            ctx.fill();
            ctx.strokeStyle = 'rgba(125,211,252,0.9)';
            ctx.stroke();
          });
        });
        ctx.restore();
        this.cineGlow(ctx, 640, 120, 420, 'rgba(255,255,255,0.9)');
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: lerp(380, 362, k), zoom: 1 + k * 0.06, shake: 0.4 });
        const r = this.finHead(ctx, c.rin, 640, 380, 900, { rim: '#ffffff', dim: 0.28, dimTint: '8,30,40' });
        this.rincShade(ctx, c.rin, 640, r.feet, 900, 0.5);
        this.wcdEyes(ctx, 640, 380, r.u, { ring: '#5eead4', iris: '#0f766e', half: true, lid: this.finShade(c.rin.skinColor, -0.3), glow: 'rgba(34,211,238,0.35)', glowA: seg(t, 40, 80) });
        ctx.restore();
        this.finKicker(ctx, 40, top + 30, 'RIN ITOSHI • TOP 1 DO BLUE LOCK', seg(t, 10, 50), '#0f766e');
        return;
      }
      // de cima: vocês três pequenos no chão branco; a sombra do Rin entra por baixo
      const u = t - cut;
      const k = easeIO(u / (S.dur - cut));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: 1.02 + k * 0.08, rot: -0.04 + k * 0.03, shake: 0.4 });
      this.cineGradient(ctx, -100, -100, W + 200, H + 200, [[0, '#dfe7f0'], [1, '#f1f5f9']]);
      ctx.strokeStyle = 'rgba(56,189,248,0.28)';
      ctx.lineWidth = 2;
      for (let i = -12; i <= 12; i++) line(ctx, [640 + i * 90, -100], [640 + i * 110, H + 100]);
      for (let j = -2; j < 12; j++) line(ctx, [-100, j * 80], [W + 100, j * 80 + 6]);
      ctx.strokeStyle = 'rgba(14,165,233,0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(640, 420, 330, 120, 0, 0, TAU);
      ctx.stroke();
      const sk = ease(seg(u, 10, 70));
      // a sombra comprida (silhueta deitada no chão)
      ctx.save();
      ctx.globalAlpha = 0.42 * sk;
      ctx.translate(640, H + 60);
      ctx.transform(1, 0, -0.18, 1, 0, 0);
      ctx.scale(1.6, lerp(0.6, 1.9, sk));
      this.finSpr(ctx, c.rin, 0, 0, 300, { tint: '#0f172a' });
      ctx.restore();
      [[c.nagi, 450], [c.you, 640], [c.bachira, 830]].forEach(([ch, x], i) => {
        const feet = 470 + (i === 1 ? 12 : 0);
        this.mgmFloorShadow(ctx, x, feet, 50);
        if (!win) this.sselKneel(ctx, ch, x, feet, 190, { rim: '#94a3b8', rimSides: [-1, 1], rimD: 2 }, 3.6);
        else this.finRim(ctx, ch, x, feet, 190, {}, '#94a3b8', [-1, 1], 2);
      });
      ctx.restore();
      this.finFillPat(ctx, 'dots', 0, top, W, bot - top, 0.12 * sk);
      this.rincStamp(ctx, win ? 'NÃO MUDA NADA.' : 'LENTOS DEMAIS.', 640, top + 70, 52, '#0f172a', u, 60, 3, W * 0.7);
      this.cineSfx(S, cut, 'corte', () => window.SFX?.whoosh?.());
    },

    // PLANO 3 — a escolha: os cartões holográficos; o cursor para no Bachira
    sselRtb2(ctx, S, v) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const win = v === 'win';
      const lock = win ? 190 : 156;
      this.mgmBlurDraw(ctx, this.mgmRoomBlur(), W, 400, 140, 480, 270, -60, -40, W + 120, H + 80);
      this.foxcGrad(ctx, 0, top, W, bot - top, [[0, 'rgba(148,163,184,0.1)'], [1, 'rgba(30,41,59,0.45)']]);
      this.cineBokeh(ctx, W, top, bot, t, 12, ['rgba(255,255,255,0.35)', 'rgba(125,211,252,0.3)'], 4);
      const k = easeIO(t / S.dur);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(372, 360, k), zoom: 1 + k * 0.06, shake: 0.5 });
      const L = [win ? 160 : 210, bot + 200, 660];
      const R = [win ? 1115 : 1070, bot + 200, 640];
      if (!win) {
        this.cineGlow(ctx, L[0], 360, 380, 'rgba(192,132,252,0.35)');
        this.cineGlow(ctx, R[0], 360, 380, 'rgba(163,230,53,0.3)');
        this.finRim(ctx, c.aryu, L[0], L[1], L[2], { animState: t > lock ? 'call_pass' : undefined, frame: 1 }, '#a855f7', [-1, 1], 3);
        this.finRim(ctx, c.toki, R[0], R[1], R[2], {}, '#65a30d', [-1, 1], 3);
        const tu = R[2] / 36;
        this.rincDrops(ctx, [R[0] - 8 * tu, R[0] + 8 * tu], R[1] - R[2] * 0.87 + SPRITE_MAPY(12) * tu, bot + 40, t, tu * 0.4, 8);
      } else {
        this.cineGlow(ctx, L[0], 360, 380, 'rgba(34,211,238,0.35)');
        this.cineGlow(ctx, R[0], 360, 380, 'rgba(250,204,21,0.35)');
        this.finRim(ctx, c.rin, L[0], L[1], L[2], { dim: 0.12, dimTint: '8,30,40' }, '#0891b2', [-1, 1], 3);
        this.finRim(ctx, c.bachira, R[0], R[1], R[2], { animState: t > lock - 20 ? 'call_pass' : undefined, frame: 1 }, '#ca8a04', [-1, 1], 3);
      }
      ctx.restore();
      // os cartões
      const list = win
        ? [[c.rin, 'RIN ITOSHI', '15,118,110'], [c.aryu, 'JYUBEI ARYU', '126,34,206'], [c.toki, 'AOSHI TOKIMITSU', '77,124,15']]
        : [[c.you, this.cinePlayerName(), '0,170,160'], [c.nagi, 'SEISHIRO NAGI', '71,85,105'], [c.bachira, 'MEGURU BACHIRA', '202,138,4']];
      const cx0 = win ? 370 : 470;
      const cy = bot - 150;
      const cur = t < lock ? Math.floor(t / 22) % 3 : win ? -1 : 2;
      list.forEach(([ch, nm, rgb], i) => {
        const sel = i === cur ? (t < lock ? 0.6 : 1) : 0;
        this.sselCard(ctx, cx0 + i * 170, cy, 140, 186, ch, nm, rgb, seg(t, 10 + i * 8, 30 + i * 8), sel, t >= lock && i !== cur ? 1 : 0, !win && t >= lock ? 'ESCOLHIDO' : '');
      });
      if (win) {
        const kb = seg(t, lock, lock + 16);
        this.sselCard(ctx, cx0 + 3 * 170, cy - 10, 150, 200, c.bachira, 'MEGURU BACHIRA', '202,138,4', kb, kb, 0, 'PEDIU PARA IR');
      }
      this.finKicker(ctx, 40, top + 30, win ? 'VOCÊS VENCERAM • VOCÊS ESCOLHEM' : 'O TOP 3 ESCOLHE', seg(t, 6, 40), win ? '#16a34a' : '#7c3aed');
      this.cineSfx(S, lock, 'trava', () => window.SFX?.blip?.(520));
      for (let i = 0; i < 7; i++) this.cineSfx(S, i * 22, 'cur' + i, () => window.SFX?.blip?.(300));
    },

    // PLANO 4 — o Bachira: olha para você... e sorri. O monstro dele quer o Rin.
    sselRtb3(ctx, S, v) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const turn = 210;
      this.mgmBlurDraw(ctx, this.mgmRoomBlur(), W, 300, 120, 520, 292, -60, -40, W + 120, H + 80);
      ctx.fillStyle = 'rgba(30,27,10,0.32)';
      ctx.fillRect(0, 0, W, H);
      this.cineGlow(ctx, 420, 340, 520, 'rgba(250,204,21,0.25)', seg(t, turn - 20, turn + 30));
      const k = easeIO(t / S.dur);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640 + this.cineNoise(t * 0.4, 3) * 3, y: lerp(370, 356, k), zoom: 1 + k * 0.07, shake: 0.4 });
      const x = 450;
      const eyeY = 352;
      const r = this.finHead(ctx, c.bachira, x, eyeY, 880, { rim: '#fde68a', dim: 0.1, dimTint: '40,30,0' });
      const grin = t >= turn;
      const look = t < 100 ? 2 : t < turn ? Math.round(lerp(2, 0, seg(t, 100, 130))) : -1;
      this.wcdEyes(ctx, x, eyeY, r.u, {
        ring: '#eab308', iris: '#713f12', look, half: !grin && t > 100, lid: this.finShade(c.bachira.skinColor, -0.2),
        shine: grin ? 1 : 0.5, tiny: grin && t < turn + 40, glow: 'rgba(250,204,21,0.4)', glowA: seg(t, turn, turn + 30)
      });
      if (grin) {
        this.finU(ctx, x, r.top, r.u, 16.3, 11.8, 3.4, 0.9, '#3b0a0a');
        this.finU(ctx, x, r.top, r.u, 16.6, 11.8, 2.8, 0.35, '#f8fafc');
        this.finU(ctx, x, r.top, r.u, 15.9, 11.4, 0.5, 0.5, '#3b0a0a');
        this.finU(ctx, x, r.top, r.u, 19.6, 11.4, 0.5, 0.5, '#3b0a0a');
      }
      ctx.restore();
      // painel: o monstro dele olhando para o abismo do Rin
      const kp = ease(seg(t, 140, 158));
      if (kp > 0) {
        this.finPanel(ctx, [[812, top + 18], [W - 22, top + 12], [W - 22, bot - 18], [790, bot - 12]], () => {
          const lt = t - 140;
          this.cineGradient(ctx, 780, top, 520, bot - top, [[0, '#020617'], [1, '#04161a']]);
          this.drawRinAbyss(ctx, 1150, bot - 40, 0.75, t, 1);
          this.finRim(ctx, c.rin, 1150, bot + 90, 400, { facing: 'back', dim: 0.6, dimTint: '0,20,24' }, '#22d3ee', [-1, 1], 3);
          this.sselMonster(ctx, 930, top + 230, 120, t, ease(seg(lt, 10, 40)));
          this.rincStamp(ctx, 'É ELE.', 960, bot - 60, 50, '#fde68a', lt, 50, 4);
          this.finFillPat(ctx, 'dots', 780, top, 520, bot - top, 0.16);
        }, { dx: (1 - kp) * 520, border: '#fde68a' });
      }
      this.cineSfx(S, turn, 'sorriso', () => window.SFX?.whoosh?.());
    },

    // PLANO 5 — ele vai embora pela porta do fundo; você e o Nagi sozinhos. O juramento.
    sselRtb4(ctx, S, v) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const cut = 250;
      if (t < cut) {
        const k = easeIO(t / cut);
        ctx.save();
        this.mgmCam(ctx, S, { x: 640, y: lerp(380, 360, k), zoom: lerp(1.14, 1.02, k), shake: 0.4 });
        ctx.drawImage(this.mgmRoom(), 0, 0);
        this.sselRoomScreen(ctx, t, v === 'win' ? 'BACHIRA → TIME RIN' : 'BACHIRA → TIME RIN', 'TRANSFERÊNCIA CONCLUÍDA', '161,98,7');
        // a porta do fundo, aberta
        const open = seg(t, 10, 40) * (1 - seg(t, 214, 240));
        const dx0 = 604;
        const dx1 = 676;
        const dy0 = 336;
        const dy1 = 418;
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(dx0 - 4, dy0 - 4, dx1 - dx0 + 8, dy1 - dy0 + 4);
        const ow = (dx1 - dx0) * open;
        this.cineGradient(ctx, 640 - ow / 2, dy0, ow, dy1 - dy0, [[0, '#0f172a'], [1, '#1e3a5f']]);
        this.cineGlow(ctx, 640, dy0 + 40, 60, 'rgba(34,211,238,0.5)', open);
        // o Top 3 esperando na porta (entram quando ele chega)
        const gone = seg(t, 196, 222);
        ctx.save();
        ctx.globalAlpha = 1 - gone;
        [[c.aryu, 586, 3.75], [c.toki, 694, 3.75], [c.rin, 640, 3.6]].forEach(([ch, X, z]) => this.sselRoomChar(ctx, ch, X, z, { facing: t > 180 ? 'back' : 'front' }, 0));
        ctx.restore();
        // o Bachira andando até eles, de costas; a mão para cima sem olhar para trás
        const wk = easeIO(seg(t, 0, 200));
        const z = lerp(1.45, 3.45, wk);
        const wave = t > 96 && t < 150;
        ctx.save();
        ctx.globalAlpha = 1 - seg(t, 200, 222);
        this.sselRoomChar(ctx, c.bachira, lerp(760, 650, wk), z, { facing: 'back', animState: wave ? 'call_pass' : 'run', frame: wave ? 1 : RUNF(S.f, 6) }, 0, '#fde68a');
        ctx.restore();
        ctx.restore();
        // você e o Nagi, de costas, no primeiro plano
        ctx.save();
        this.mgmCam(ctx, S, { x: 640, y: 360, zoom: 1 + k * 0.03, shake: 0.6 });
        this.finRim(ctx, c.you, 290, bot + 170, 480, { facing: 'back', dim: 0.15, dimTint: '30,41,59' }, '#0d9488', [1], 3);
        this.finRim(ctx, c.nagi, 1020, bot + 180, 460, { facing: 'back', dim: 0.15, dimTint: '30,41,59' }, '#64748b', [-1], 3);
        ctx.restore();
        this.finKicker(ctx, 40, top + 30, 'A SALA BRANCA • DOIS QUE FICARAM', seg(t, 20, 60), '#0ea5e9');
        this.cineSfx(S, 230, 'porta', () => window.SFX?.tackle?.());
        return;
      }
      // os seus olhos: o juramento
      const u = t - cut;
      ctx.fillStyle = '#020409';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      const z = 1 + easeIO(u / 90) * 0.05;
      ctx.translate(640, 356);
      ctx.scale(z, z);
      ctx.translate(-640, -356);
      const U = this.wcdEyeBand(ctx, c.you, 640, 356, 1280, { dim: 0.25, dimTint: '2,8,20' });
      const eye = c.you.eyeColor || '#ef4444';
      this.wcdEyes(ctx, 640, 356, U, { ring: eye, iris: this.finShade(eye, -0.6), angry: true, glow: 'rgba(0,245,212,0.35)', glowA: seg(u, 10, 40), shine: 1 });
      ctx.restore();
      ctx.fillStyle = 'rgba(2,4,9,0.25)';
      ctx.fillRect(0, top, W, bot - top);
      this.cineImpactText(ctx, 'EU VOU TE BUSCAR.', 640, bot - 70, 72, YOU_C, seg(u, 14, 24), W * 0.86, -0.03);
      if (u >= 14) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(u, 14, 26)), '#ccfbf1');
      this.cineSfx(S, cut + 14, 'jura', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // 3. DEVORANDO O REI (o jogo contra o time do Barou)
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — o Rei vem para cima: o Barou (do SEU time) atropela a defesa do time do Rin
    sselBar0(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.sselCast();
      const e = easeIn(seg(t, 10, 236));
      const z = lerp(3.4, 0.62, e);
      const X = 640 + Math.sin(t * 0.03) * 60;
      const [x, feet] = PP(X, z);
      const size = 360 / z;
      const shake = 0.6 + e * 6;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(380, 400, e), zoom: 1.04 + e * 0.04, shake });
      ctx.drawImage(this.finBg('ssel_pitch', 1280, 720, this.sselPitchBg), 0, 0);
      ctx.fillStyle = `rgba(60,0,0,${0.18 * e})`;
      ctx.fillRect(-100, -100, W + 200, H + 200);
      // o Aryu e o Tokimitsu (time do Rin) tentando marcar, deixados para trás
      const nz = 1.9;
      const [nx, nf] = PP(330, nz);
      const [tx2, tf2] = PP(1000, 2.3);
      const passed = (zz) => z < zz - 0.2;
      if (!passed(2.3)) this.finRim(ctx, c.toki, tx2, tf2, 360 / 2.3, {}, '#99f6e4', [-1, 1], 1);
      if (!passed(nz)) this.finRim(ctx, c.aryu, nx, nf, 360 / nz, {}, '#99f6e4', [-1, 1], 1);
      this.cineGlow(ctx, x, feet - size * 0.45, size * 0.9, 'rgba(220,38,38,0.35)');
      this.drawRadialSpeedLines(ctx, x, feet - size * 0.5, W, '#fca5a5', 0.12 + e * 0.3);
      // a bola no pé dele
      const bz = Math.max(0.5, z - 0.06);
      const [bx, by] = PP(X + 40 + Math.sin(t * 0.4) * 10, bz);
      this.ptdBall(ctx, bx, by, 18 / bz, t * 0.5);
      // a investida vem de frente pra câmera (view 'front' nos bonecos novos)
      this.finSpr(ctx, c.barou, x, feet, size, { animState: 'run', view: 'front', frame: RUNF(S.f), showAura: true });
      const cr = this.sselCrownCv();
      const cs = size / 36;
      this.wcdPix(ctx, cr, x - (cr.width * cs * 0.55) / 2, feet - size * 0.87 - cr.height * cs * 0.55 - 2 * cs + Math.sin(t * 0.2) * cs, cs * 0.55);
      if (passed(nz)) this.finRim(ctx, c.aryu, nx, nf, 360 / nz, { facing: 'back' }, '#99f6e4', [-1, 1], 1);
      if (passed(2.3)) this.finRim(ctx, c.toki, tx2, tf2, 360 / 2.3, { facing: 'back' }, '#99f6e4', [-1, 1], 1);
      ctx.restore();
      this.finKicker(ctx, 40, S.bot - 58, '2ª SELEÇÃO • 5 x 5 • O SEU TIME  x  O TIME DO RIN', seg(t, 6, 46), '#38bdf8');
      this.finKicker(ctx, 40, S.bot - 30, 'SHOUEI BAROU • O "REI" DO SEU PRÓPRIO TIME', seg(t, 40, 90), '#eab308');
      this.cineImpactText(ctx, 'ESSE GOL É MEU!', 880, top + 130, 70, '#fde047', seg(t, 190, 202), 680, -0.06);
      this.cineSfx(S, 190, 'rei', () => window.SFX?.tackle?.());
    },

    // PLANO 2 — o seu olho → a pupila vira o campo visto de cima: a rota do Rei e o espaço
    sselBar1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const into = 80;
      const ex = 640;
      const ey = 360;
      const drawEye = () => {
        ctx.fillStyle = '#020409';
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        const z = 1 + easeIO(t / into) * 0.12;
        ctx.translate(ex, ey);
        ctx.scale(z, z);
        ctx.translate(-ex, -ey);
        const dw = 900;
        const U = dw / 16;
        this.wcdEyeBand(ctx, c.you, ex + 3.5 * U, ey, dw, { dim: 0.2, dimTint: '2,8,20' });
        this.wcdEyes(ctx, ex + 3.5 * U, ey, U, { ring: '#5eead4', iris: '#083344', tiny: t > 30, glow: 'rgba(0,245,212,0.5)', glowA: seg(t, 20, 60), reflect: '#ef4444', shine: 1 });
        ctx.restore();
      };
      if (t < into + 30) drawEye();
      if (t >= into) {
        const r = ease(seg(t, into, into + 30)) * 900;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ex, ey, r, 0, TAU);
        ctx.clip();
        this.sselBoard3(ctx, S, t - into);
        ctx.restore();
        if (t < into + 30) {
          ctx.strokeStyle = '#5eead4';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(ex, ey, r, 0, TAU);
          ctx.stroke();
        }
      }
      if (t < into) this.rincStamp(ctx, '...!', 980, top + 110, 64, '#e0f2fe', t, 30, 3);
      this.cineSfx(S, into, 'meta', () => window.SFX?.whoosh?.());
    },
    // o campo visto de cima (holograma tático)
    sselBoard3(ctx, S, u) {
      const { W, H, top, bot } = S;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#020a18'], [1, '#04142a']]);
      const k = easeIO(u / 200);
      ctx.save();
      ctx.translate(640, 360);
      ctx.rotate(lerp(-0.08, -0.03, k));
      ctx.scale(lerp(1.12, 1.0, k), lerp(1.12, 1.0, k));
      ctx.translate(-640, -360);
      ctx.strokeStyle = 'rgba(56,189,248,0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) line(ctx, [x, 0], [x, H]);
      for (let y = 0; y <= H; y += 40) line(ctx, [0, y], [W, y]);
      // o campo
      const fx0 = 150;
      const fx1 = 1130;
      const fy0 = top + 40;
      const fy1 = bot - 40;
      ctx.strokeStyle = 'rgba(94,234,212,0.75)';
      ctx.lineWidth = 3;
      ctx.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
      line(ctx, [640, fy0], [640, fy1]);
      ctx.beginPath();
      ctx.arc(640, 360, 70, 0, TAU);
      ctx.stroke();
      ctx.strokeRect(fx0, 360 - 130, 150, 260);
      ctx.strokeRect(fx1 - 150, 360 - 130, 150, 260);
      ctx.strokeRect(fx0 - 16, 360 - 50, 16, 100);
      ctx.strokeRect(fx1, 360 - 50, 16, 100);
      const dot = (x, y, col, lab, a, big = false) => {
        if (a <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.min(1, a * 2);
        this.cineGlow(ctx, x, y, big ? 60 : 40, col.replace('rgb(', 'rgba(').replace(')', ',0.6)'));
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y, big ? 14 : 10, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        if (lab) this.ptdChip(ctx, lab, x, y - 34, col, a, { size: 12 });
      };
      // a rota do Rei (dourada, se desenhando) até o gol do time do Rin
      const rk = seg(u, 30, 100);
      const R0 = [930, 400];
      const RC = [620, 470];
      const R1 = [330, 330];
      if (rk > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(234,179,8,0.95)';
        ctx.lineWidth = 5;
        ctx.setLineDash([16, 10]);
        ctx.lineDashOffset = -u;
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) {
          const p = bez(R0, RC, R1, (i / 24) * rk);
          if (i) ctx.lineTo(p[0], p[1]);
          else ctx.moveTo(p[0], p[1]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        if (rk >= 1) {
          ctx.strokeStyle = 'rgba(234,179,8,0.6)';
          ctx.lineWidth = 3;
          line(ctx, R1, [fx0, 360]);
        }
        ctx.restore();
      }
      // linhas de passe (finas) entre os outros
      ctx.save();
      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.globalAlpha = seg(u, 20, 50);
      line(ctx, [760, 520], [930, 400]);
      line(ctx, [880, 180], [930, 400]);
      line(ctx, [720, 250], [760, 520]);
      ctx.restore();
      const bp = bez(R0, RC, R1, ease(seg(u, 100, 200)) * 0.82);
      // o time do Rin (verde-água) e os seus companheiros (cinza)
      dot(300, 480, 'rgb(45,212,191)', 'ARYU', seg(u, 10, 30));
      dot(560, 250, 'rgb(45,212,191)', 'TOKIMITSU', seg(u, 12, 32));
      dot(250, 360, 'rgb(45,212,191)', 'RIN', seg(u, 14, 34));
      dot(420, 560, 'rgb(45,212,191)', 'BACHIRA', seg(u, 16, 36));
      dot(760, 520, 'rgb(203,213,225)', 'NAGI', seg(u, 18, 38));
      dot(880, 180, 'rgb(203,213,225)', 'CHIGIRI', seg(u, 20, 40));
      dot(bp[0], bp[1], 'rgb(234,179,8)', 'BAROU', seg(u, 6, 26), true);
      // a sua rota: um passo antes (ciano) e o espaço
      const yk = seg(u, 120, 170);
      const Y0 = [720, 250];
      const Y1 = [360, 300];
      const yp = [lerp(Y0[0], Y1[0], ease(seg(u, 120, 200))), lerp(Y0[1], Y1[1], ease(seg(u, 120, 200)))];
      if (yk > 0) {
        ctx.save();
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 7;
        ctx.globalAlpha = 0.9;
        line(ctx, Y0, [lerp(Y0[0], Y1[0], ease(yk)), lerp(Y0[1], Y1[1], ease(yk))]);
        ctx.restore();
        const pul = 0.5 + 0.5 * Math.sin(u * 0.2);
        ctx.strokeStyle = `rgba(0,245,212,${0.5 + 0.5 * pul})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(Y1[0], Y1[1], 40 + pul * 8, 0, TAU);
        ctx.stroke();
      }
      dot(yp[0], yp[1], 'rgb(0,245,212)', 'VOCÊ', seg(u, 22, 42), true);
      ctx.restore();
      this.finFillPat(ctx, 'scan', 0, top, W, bot - top, 0.35);
      this.finKicker(ctx, 40, top + 30, 'METAVISÃO • O CAMPO VISTO DE CIMA', seg(u, 10, 50), '#5eead4');
      if (u > 150) this.cineImpactText(ctx, 'UM PASSO ANTES.', 880, bot - 70, 56, '#00f5d4', seg(u, 150, 160), 520, -0.05);
    },

    // PLANO 3 — o Rei arma o chute... e você entra no ponto cego e rouba o gol dele
    sselBar2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const steal = 96;
      const slow = t >= steal - 30 && t < steal + 20;
      const k = easeIO(t / S.dur);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(620, 720, k), y: 410, zoom: 1.22, shake: 0.6 + (t >= steal ? 6 * (1 - seg(t, steal, steal + 26)) : 0) });
      ctx.drawImage(this.finBg('ssel_pitch', 1280, 720, this.sselPitchBg), 0, 0);
      const z = 1.45;
      const fy = PP(0, z)[1];
      const size = 360 / z;
      // o Barou armando
      const bst = t < 50 ? 'run' : t < steal + 4 ? 'windup' : 'shoot';
      const bx = t < 50 ? lerp(980, 820, seg(t, 0, 50)) : 820;
      this.finSpr(ctx, c.barou, bx, fy, size, { animState: bst, frame: bst === 'run' ? RUNF(S.f) : 1, flipX: true, showAura: bst !== 'shoot' });
      // você entrando pelo ponto cego (por trás dele) e chegando à bola um passo antes
      const yx = t < steal ? lerp(1260, 720, easeIn(seg(t, 20, steal))) : lerp(720, 640, ease(seg(t, steal, steal + 30)));
      const yst = t < steal - 6 ? 'run' : t < steal ? 'windup' : t < steal + 40 ? 'shoot' : 'idle';
      this.finRim(ctx, c.you, yx, fy + 6, size * 1.04, { animState: yst, frame: yst === 'run' ? RUNF(S.f, 2) : 1, flipX: true }, '#5eead4', [-1, 1], 1);
      // a bola: no pé do Barou → chutada por você
      let ballX = bx - 50;
      let ballY = fy - 8;
      if (t >= steal) {
        const e = seg(t, steal, steal + 22);
        ballX = lerp(720 - 40, -200, e);
        ballY = lerp(fy - 8, fy - 140, e);
        const pts = [];
        for (let i = 0; i < 6; i++) pts.push({ x: lerp(680, -200, Math.max(0, e - i * 0.06)), y: lerp(fy - 8, fy - 140, Math.max(0, e - i * 0.06)) });
        this.ptdStreak(ctx, pts, '#00f5d4', 22, 0.9);
      }
      if (ballX > -100) this.ptdBall(ctx, ballX, ballY, 15, t * 0.5, t >= steal ? '#00f5d4' : null);
      ctx.restore();
      if (slow) this.ptdSpeed(ctx, S, t, '#e0f2fe', 0.25, -1, 30, 22);
      // painéis: o rosto do Barou em choque e os seus olhos frios
      const kA = ease(seg(t, steal + 14, steal + 30));
      if (kA > 0) {
        this.finPanel(ctx, [[760, top + 16], [W - 20, top + 16], [W - 20, 360], [780, 350]], () => {
          this.cineGradient(ctx, 740, top, 560, 300, [[0, '#2a0606'], [1, '#0a0303']]);
          this.drawRadialSpeedLines(ctx, 1020, 240, 600, '#fecaca', 0.18);
          const r = this.finHead(ctx, c.barou, 1020, 250, 600, { rim: '#fca5a5' });
          this.wcdEyes(ctx, 1020, 250, r.u, { ring: '#dc2626', iris: '#450a0a', tiny: true, look: Math.round(Math.sin(t * 0.5)) });
          ctx.fillStyle = 'rgba(186,230,253,0.85)';
          ctx.fillRect(Math.round(1020 + 7.4 * r.u), Math.round(250 - 1.2 * r.u + ease(seg(t, steal + 30, 260)) * 2.4 * r.u), Math.ceil(r.u * 0.5), Math.ceil(r.u * 0.8));
        }, { dx: (1 - kA) * 520, border: '#fecaca' });
      }
      const kB = ease(seg(t, steal + 60, steal + 76));
      if (kB > 0) {
        this.finPanel(ctx, [[780, 366], [W - 20, 374], [W - 20, bot - 16], [760, bot - 16]], () => {
          this.cineGradient(ctx, 740, 360, 560, 300, [[0, '#04202a'], [1, '#020617']]);
          const U = this.wcdEyeBand(ctx, c.you, 1030, 500, 500, {});
          this.wcdEyes(ctx, 1030, 500, U, { ring: '#5eead4', iris: '#083344', angry: true, glow: 'rgba(0,245,212,0.4)' });
        }, { dy: (1 - kB) * 300, border: '#99f6e4' });
      }
      if (t >= steal) this.cineImpactText(ctx, 'ROUBADO.', 380, top + 110, 76, '#00f5d4', seg(t, steal, steal + 8), 560, -0.08);
      if (t >= steal) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, steal, steal + 10)), '#ccfbf1');
      this.cineSfx(S, steal, 'roubo', () => window.SFX?.kick?.(1));
    },

    // PLANO 4 — a rede estufa → IMPACT FRAME → a coroa racha em cima do Rei
    sselBar3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const net = 0;
      const imp = 26;
      if (t < imp) {
        // a rede, de perto: a bola rasgando o ângulo
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.02, shake: 6 * seg(t, 8, 26) });
        const pitch = this.finBg('ssel_pitch', 1280, 720, this.sselPitchBg);
        this.mgmBlurDraw(ctx, this.mgmBlur('ssel_pitch_blur', pitch, 1280, 720, 10), W, 300, 120, 680, 380, -60, -40, W + 120, H + 80);
        ctx.fillStyle = 'rgba(2,6,23,0.35)';
        ctx.fillRect(-100, -100, W + 200, H + 200);
        const bp = ease(seg(t, net, net + 12));
        const bxx = 820;
        const byy = 250;
        ctx.strokeStyle = 'rgba(241,245,249,0.6)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 18; i++) {
          const x = 200 + i * 56;
          ctx.beginPath();
          for (let j = 0; j <= 10; j++) {
            const y = 120 + j * 50;
            const d = Math.hypot(x - bxx, y - byy);
            const f = bp * Math.exp(-Math.pow(d / 160, 2)) * 60;
            if (j) ctx.lineTo(x + (x - bxx) * f * 0.004, y + f * 0.4);
            else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        for (let j = 0; j <= 10; j++) {
          const y = 120 + j * 50;
          ctx.beginPath();
          for (let i = 0; i < 18; i++) {
            const x = 200 + i * 56;
            const d = Math.hypot(x - bxx, y - byy);
            const f = bp * Math.exp(-Math.pow(d / 160, 2)) * 60;
            if (i) ctx.lineTo(x + (x - bxx) * f * 0.004, y + f * 0.4);
            else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 22;
        line(ctx, [160, bot + 40], [160, 96]);
        line(ctx, [160, 96], [W + 40, 96]);
        this.ptdBall(ctx, bxx, byy + bp * 20, lerp(70, 40, bp), t * 0.6, '#00f5d4');
        this.ptdRings(ctx, bxx, byy, seg(t, 2, 24), ['#5eead4', '#f8fafc'], 300, 0);
        ctx.restore();
        this.cineSfx(S, 2, 'rede', () => window.SFX?.goal?.(true));
        return;
      }
      if (t < imp + 18) {
        const u = t - imp;
        this.sselImpact(ctx, S, 520, 330, [
          { c: c.barou, x: 1010, feet: 690, size: 420, o: { animState: 'windup', frame: 1, flipX: true } },
          { c: c.you, x: 440, feet: 780, size: 600, o: { animState: 'shoot', frame: 1, flipX: true } }
        ], 'GOL!', '#00f5d4', u, -0.08);
        this.sselCrack(ctx, 1010, 360, 1, PAPER, INK, 0.8);
        this.cineSfx(S, imp, 'impacto', () => window.SFX?.kick?.(1));
        return;
      }
      const u = t - imp - 18;
      const k = easeIO(u / (S.dur - imp - 18));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(400, 380, k), zoom: lerp(1.18, 1.26, k), shake: 0.6 + 7 * (1 - seg(u, 0, 26)) });
      ctx.drawImage(this.finBg('ssel_pitch', 1280, 720, this.sselPitchBg), 0, 0);
      ctx.fillStyle = 'rgba(2,6,23,0.3)';
      ctx.fillRect(-100, -100, W + 200, H + 200);
      // o Barou parado, a coroa rachando em cima dele
      const z = 1.9;
      const [bx, bf] = PP(820, z);
      const bs = 360 / z;
      this.finRim(ctx, c.barou, bx, bf, bs, { dim: 0.3, dimTint: '30,6,6' }, '#fca5a5', [-1, 1], 1);
      const cr = this.sselCrownCv();
      const cs = bs / 36;
      const fall = easeIn(seg(u, 100, 124));
      const cx = bx - (cr.width * cs * 0.55) / 2;
      const cyy = bf - bs * 0.87 - cr.height * cs * 0.55 - 2 * cs;
      ctx.save();
      ctx.translate(cx + cr.width * cs * 0.275 + fall * 50, cyy + fall * (bf - cyy - 14));
      ctx.rotate(fall * 1.2);
      this.wcdPix(ctx, cr, -cr.width * cs * 0.275, 0, cs * 0.55);
      ctx.restore();
      if (u > 40 && u < 100) this.sselCrack(ctx, bx + 2, cyy + 6, seg(u, 40, 70), '#fef08a', '#1c1003', 0.3);
      // você em primeiro plano, de costas, indo embora do gol
      this.finRim(ctx, c.you, 400, bot + 170, 500, { facing: 'back' }, '#5eead4', [-1, 1], 3);
      ctx.restore();
      this.finFillPat(ctx, 'dots', 0, top, W, bot - top, 0.08);
      this.rincStamp(ctx, 'O SEU GOL...', 960, top + 100, 46, '#e0f2fe', u, 50, 3);
      this.rincStamp(ctx, '...AGORA É MEU.', 960, top + 160, 46, '#00f5d4', u, 90, 3);
      this.cineSfx(S, imp + 18 + 100, 'coroa', () => window.SFX?.post?.());
    },
    // rachaduras saindo de um ponto (k = quanto rachou)
    sselCrack(ctx, cx, cy, k, col = '#fff7ed', ink = '#020617', sc = 1) {
      if (k <= 0) return;
      ctx.save();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + rnd(i, 7) * 0.6;
        const len = (90 + rnd(i, 8) * 200) * ease(k) * sc;
        const pts = [[cx, cy]];
        for (let j = 1; j <= 5; j++) {
          const d = (len * j) / 5;
          const aa = a + (rnd(i * 5 + j, 9) - 0.5) * 0.7;
          pts.push([cx + Math.cos(aa) * d, cy + Math.sin(aa) * d]);
        }
        [[ink, 6 * Math.max(0.5, sc)], [col, 2.5 * Math.max(0.5, sc)]].forEach(([cc, lw]) => {
          ctx.strokeStyle = cc;
          ctx.lineWidth = lw;
          ctx.beginPath();
          pts.forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
        });
      }
      ctx.restore();
    },

    // PLANO 5 — o Rei de joelhos → meio rosto no escuro: "Eu devorei o Rei."
    sselBar4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const cut = 150;
      if (t < cut) {
        const k = easeIO(t / cut);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: lerp(600, 640, k), y: lerp(400, 384, k), zoom: lerp(1.16, 1.26, k), shake: 0.4 });
        ctx.drawImage(this.finBg('ssel_pitch', 1280, 720, this.sselPitchBg), 0, 0);
        ctx.fillStyle = 'rgba(8,2,2,0.45)';
        ctx.fillRect(-100, -100, W + 200, H + 200);
        const [x, feet] = PP(600, 1.5);
        const size = 360 / 1.5;
        ctx.save();
        ctx.translate(x, feet);
        ctx.scale(1, 0.2);
        this.cineGlow(ctx, 0, 0, 220, 'rgba(220,38,38,0.35)');
        ctx.restore();
        this.cineShafts(ctx, x, -60, Math.PI / 2, 640, 0.5, 5, '254,202,202', 0.06, t);
        const up = this.sselKneel(ctx, c.barou, x, feet, size, { rim: '#fca5a5', rimSides: [-1, 1], rimD: 2, dim: 0.2, dimTint: '30,6,6' }, 4.2);
        this.rincShade(ctx, c.barou, x, up, size, 0.9);
        const u = size / 36;
        this.rincDrops(ctx, [x - 7 * u, x + 7.4 * u, x + 1 * u], up - size * 0.87 + SPRITE_MAPY(15) * u, feet + 6, t, u * 0.35, 9);
        // os cacos da coroa no gramado
        const cr = this.sselCrownCv();
        ctx.save();
        ctx.translate(x + 110, feet - 4);
        ctx.rotate(1.1);
        this.wcdPix(ctx, cr, -cr.width * 1.5, -cr.height * 1.5, 3);
        ctx.restore();
        // você de pé, de costas, olhando o Rei no chão
        this.finRim(ctx, c.you, 930, PP(0, 1.12)[1], 360 / 1.12, { facing: 'back', dim: 0.2, dimTint: '2,10,20' }, '#5eead4', [-1, 1], 2);
        ctx.restore();
        this.finKicker(ctx, 40, top + 30, 'SHOUEI BAROU • O REI', seg(t, 10, 50), '#eab308');
        this.finKicker(ctx, 40, top + 58, 'DE JOELHOS', seg(t, 40, 80), '#ef4444');
        return;
      }
      const u = t - cut;
      const k = easeIO(u / (S.dur - cut));
      ctx.fillStyle = '#020305';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 680, y: 370, zoom: 1 + k * 0.07, shake: 0.4 });
      this.cineGlow(ctx, 520, 340, 420, 'rgba(0,245,212,0.16)');
      const x = 820;
      const eyeY = 352;
      const r = this.finHead(ctx, c.you, x, eyeY, 1300, { rim: '#5eead4', rimSides: [-1], dim: 0.12, dimTint: '2,10,20' });
      this.foxcGradH(ctx, x - 1.5 * r.u, top - 40, 6 * r.u, bot - top + 80, [[0, 'rgba(2,3,5,0)'], [1, 'rgba(2,3,5,0.96)']]);
      ctx.fillStyle = 'rgba(2,3,5,0.96)';
      ctx.fillRect(x + 4.5 * r.u, top - 40, W, bot - top + 80);
      this.wcdEye(ctx, x - 3.5 * r.u, eyeY, r.u * 0.3, -1, { ring: '#5eead4', iris: '#021a1d', look: -1, angry: true, glow: 'rgba(0,245,212,0.55)', reflect: '#ef4444' });
      ctx.restore();
      this.rincStamp(ctx, 'EU DEVOREI...', 320, top + 120, 60, '#e2e8f0', u, 20, 3);
      this.cineImpactText(ctx, 'O REI.', 330, bot - 110, 110, '#00f5d4', seg(u, 64, 74), 560, -0.05);
      if (u >= 64) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(u, 64, 76)), '#ccfbf1');
      this.cineSfx(S, cut + 64, 'devorar', () => window.SFX?.kick?.(1));
    },

    // PLANO 6 — o Rin olha para você do outro lado do campo: "Você. Vem pro meu time."
    sselBar5(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const k = easeIO(t / S.dur);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(660, 700, k), y: lerp(400, 388, k), zoom: lerp(1.12, 1.22, k), shake: 0.4 });
      ctx.drawImage(this.finBg('ssel_pitch', 1280, 720, this.sselPitchBg), 0, 0);
      ctx.fillStyle = 'rgba(2,10,14,0.4)';
      ctx.fillRect(-100, -100, W + 200, H + 200);
      const z = 2.0;
      const [rx, rf] = PP(700, z);
      const size = 360 / z;
      this.drawRinAbyss(ctx, rx, rf - 10, 0.3, t, 0.4 + 0.6 * seg(t, 40, 120));
      [[c.aryu, 330, 2.5], [c.toki, 1180, 2.7]].forEach(([ch, X, zz]) => {
        const [x, f] = PP(X, zz);
        this.finRim(ctx, ch, x, f, 360 / zz, { dim: 0.3, dimTint: '2,20,24' }, '#99f6e4', [-1, 1], 1);
      });
      const [bx, bf] = PP(960, 2.05);
      this.finRim(ctx, c.bachiraT, bx, bf, 360 / 2.1, {}, '#fde68a', [-1, 1], 1);
      this.finRim(ctx, c.rin, rx, rf, size, { animState: t > 60 ? 'call_pass' : undefined, frame: 1 }, '#67e8f9', [-1, 1], 1);
      ctx.restore();
      // você de costas, em primeiro plano
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.03, shake: 0.6 });
      this.finRim(ctx, c.you, 280, bot + 170, 480, { facing: 'back', dim: 0.2, dimTint: '2,10,20' }, '#5eead4', [1], 3);
      ctx.restore();
      // painel: os olhos do Rin
      const kp = ease(seg(t, 24, 40)) * (1 - seg(t, 150, 166));
      if (kp > 0) {
        this.finPanel(ctx, [[700, top + 18], [W - 22, top + 12], [W - 22, top + 170], [716, top + 182]], () => {
          ctx.fillStyle = '#02080b';
          ctx.fillRect(680, top, 620, 200);
          const U = this.wcdEyeBand(ctx, c.rin, 990, top + 96, 700, {});
          this.wcdEyes(ctx, 990, top + 96, U, { ring: '#22d3ee', iris: '#021a1d', angry: true, line: '#010409', glow: 'rgba(34,211,238,0.5)' });
        }, { dx: (1 - kp) * 600, border: '#a5f3fc' });
      }
      this.rincStamp(ctx, 'VOCÊ.', 980, bot - 120, 70, '#a5f3fc', t, 40, 4, 0, 'center', 1 - seg(t, 150, 166));
      const tk = seg(t, 160, 196);
      if (tk > 0) {
        this.foxcGrad(ctx, 0, bot - 220, W, 220, [[0, 'rgba(2,6,23,0)'], [0.5, `rgba(2,6,23,${0.6 * tk})`], [1, `rgba(2,6,23,${0.85 * tk})`]]);
        this.cineTitleCard(ctx, W, bot - 100, tk, { kicker: '2ª SELEÇÃO • O TIME DO RIN', title: 'DEVORANDO O REI', sub: 'Você, o Rin e o Bachira: o caminho até o World Five.', color: '#22d3ee' });
      }
      this.cineSfx(S, 160, 'titulo', () => window.SFX?.kick?.(0.8));
    }
  });

  // ==========================================================================
  // 4. BLUE LOCK x WORLD FIVE. v = 'lose' | 'win'
  // ==========================================================================
  const SP = (X, z) => [640 + (X - 640) / z, 300 + 420 / z];
  Object.assign(CE, {
    sselStadium(ctx) {
      ctx.drawImage(this.finBg('ssel_stadium', 1280, 720, this.sselStadiumBg), 0, 0);
    },
    sselStadiumBlur(ctx, W, H) {
      const src = this.finBg('ssel_stadium', 1280, 720, this.sselStadiumBg);
      this.mgmBlurDraw(ctx, this.mgmBlur('ssel_stadium_blur', src, 1280, 720, 10), W, 260, 100, 760, 430, -60, -40, W + 120, H + 80);
    },

    // PLANO 1 — o Rin abre o placar; o estádio holográfico explode
    sselW50(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const kick = 40;
      const cut = 66;
      if (t < cut) {
        this.sselStadiumBlur(ctx, W, H);
        ctx.fillStyle = 'rgba(2,6,23,0.35)';
        ctx.fillRect(0, 0, W, H);
        this.cineBokeh(ctx, W, top, bot - 160, t, 14, ['rgba(56,189,248,0.35)', 'rgba(255,255,255,0.25)'], 3);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: 1.04 + seg(t, 0, cut) * 0.05, shake: t >= kick ? 4 : 0.6 });
        const st = t < kick - 10 ? 'run' : t < kick ? 'windup' : 'shoot';
        this.cineGlow(ctx, 420, 360, 420, 'rgba(34,211,238,0.4)');
        this.ptdRays(ctx, 420, 330, 900, '#22d3ee', 0.12 + (t >= kick ? 0.12 : 0), t * 0.004, 40, 0.03);
        this.finRim(ctx, c.rinBL, 420, bot + 120, 560, { animState: st, frame: st === 'run' ? RUNF(S.f) : 1, flipX: true }, '#67e8f9', [-1, 1], 3);
        if (t >= kick) {
          const e = seg(t, kick, cut);
          const a = [560, bot - 40];
          const cc = [900, bot + 60];
          const b = [W + 200, top + 60];
          const pts = [];
          for (let i = 0; i < 9; i++) {
            const p = bez(a, cc, b, Math.max(0, e - i * 0.05));
            pts.push({ x: p[0], y: p[1] });
          }
          this.ptdStreak(ctx, pts, '#22d3ee', 34, 0.9);
          const p = bez(a, cc, b, e);
          this.ptdBall(ctx, p[0], p[1], 22, t, '#22d3ee');
        } else this.ptdBall(ctx, 560, bot - 30, 22, t * 0.4);
        ctx.restore();
        this.finKicker(ctx, 40, top + 30, 'BLUE LOCK  x  WORLD FIVE', seg(t, 4, 30), '#38bdf8');
        this.cineSfx(S, kick, 'chute', () => window.SFX?.kick?.(1));
        return;
      }
      const u = t - cut;
      const k = easeIO(u / (S.dur - cut));
      const burst = seg(u, 4, 20) * (1 - 0.5 * seg(u, 140, 230));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(360, 340, k), zoom: lerp(1.1, 1.0, k), shake: 0.6 + 7 * (1 - seg(u, 0, 30)) });
      this.sselStadium(ctx);
      this.sselStadiumBurst(ctx, t, burst);
      // o gol, de frente
      const gx0 = 400;
      const gx1 = 880;
      const gy0 = 330;
      const gy1 = 500;
      ctx.strokeStyle = 'rgba(241,245,249,0.45)';
      ctx.lineWidth = 1.5;
      const bp = Math.max(0, 1 - u / 40);
      for (let i = 0; i <= 16; i++) {
        const x = gx0 + i * 30;
        const d = Math.abs(x - 830);
        line(ctx, [x, gy0], [x + (d < 90 ? (90 - d) * 0.3 * bp : 0), gy1]);
      }
      for (let j = 0; j <= 6; j++) line(ctx, [gx0, gy0 + j * 28], [gx1, gy0 + j * 28]);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 8;
      line(ctx, [gx0, gy1], [gx0, gy0]);
      line(ctx, [gx0, gy0], [gx1, gy0]);
      line(ctx, [gx1, gy0], [gx1, gy1]);
      this.ptdBall(ctx, 830, 352 + ease(seg(u, 0, 20)) * 120, 14, t);
      this.ptdRings(ctx, 830, 352, seg(u, 0, 26), ['#67e8f9', '#f8fafc'], 260, 0);
      this.sselBoard(ctx, 640, 168, 1, 0, { k: seg(u, 30, 46), pop: 1 - seg(u, 30, 60), popSide: 'h' });
      // o Rin de costas, frio, sem comemorar
      this.finRim(ctx, c.rinBL, 250, bot + 150, 460, { facing: 'back' }, '#67e8f9', [-1, 1], 3);
      ctx.restore();
      this.cineImpactText(ctx, 'GOL!', 980, bot - 100, 110, '#22d3ee', seg(u, 2, 12), 0, -0.08);
      this.cineFlash(ctx, W, H, 0.4 * (1 - seg(u, 0, 12)), '#cffafe');
      this.cineSfx(S, cut, 'gol', () => window.SFX?.goal?.(true));
    },

    // PLANO 2 — o olho do Loki → a Velocidade Divina: ele atravessa a defesa num traço
    sselW51(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const cut = 90;
      if (t < cut) {
        ctx.fillStyle = '#05040a';
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        const z = 1 + easeIO(t / cut) * 0.06;
        ctx.translate(640, 356);
        ctx.scale(z, z);
        ctx.translate(-640, -356);
        const U = this.wcdEyeBand(ctx, c.loki, 640, 356, 1280, {});
        this.wcdEyes(ctx, 640, 356, U, { ring: '#f0b429', iris: '#78350f', half: t < 40, lid: this.finShade(c.loki.skinColor, -0.25), shine: 1, glow: 'rgba(251,191,36,0.45)', glowA: seg(t, 40, 70) });
        ctx.restore();
        this.rincStamp(ctx, 'VELOCIDADE DIVINA.', 640, bot - 64, 54, '#fde68a', t, 40, 2, W * 0.8);
        return;
      }
      const u = t - cut;
      const go = 40;
      const arrive = go + 6;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 400, zoom: 1.1, shake: 0.6 + (u >= go ? 7 * (1 - seg(u, go, go + 30)) : 0) });
      this.sselStadium(ctx);
      const z = 1.5;
      const fy = SP(0, z)[1];
      const size = 360 / z;
      // a linha da defesa
      [[c.you, 520], [c.aryuBL, 690], [c.tokiBL, 860]].forEach(([ch, x], i) => {
        const turned = u > arrive + 6 + i * 3;
        this.finRim(ctx, ch, x, fy, size, { facing: turned ? 'back' : 'front' }, '#7dd3fc', [-1, 1], 1);
        if (u > arrive && u < arrive + 50) this.cineImpactText(ctx, '!?', x + 40, fy - size, 30, '#facc15', seg(u, arrive + i * 3, arrive + 8 + i * 3), 0, 0.1);
      });
      // o Loki: parado à esquerda → um traço → do outro lado
      const lx = u < go ? 230 : u < arrive ? lerp(230, 1100, seg(u, go, arrive)) : 1100;
      if (u >= go && u < arrive + 30) {
        const a = 1 - seg(u, arrive, arrive + 30);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(230, 0, lx, 0);
        g.addColorStop(0, 'rgba(251,191,36,0)');
        g.addColorStop(1, 'rgba(253,230,138,0.85)');
        ctx.fillStyle = g;
        poly(ctx, [[230, fy - size * 0.5], [lx, fy - size * 0.62], [lx, fy - size * 0.2], [230, fy - size * 0.45]]);
        ctx.fill();
        ctx.restore();
        this.ptdRings(ctx, 230, fy - 20, seg(u, go, go + 24), ['#fde68a', '#f8fafc'], 220, 0);
      }
      // chuta virado pra direita: a bola sai pra direita (de lado o flipX virava o pé pra esquerda)
      if (u < go || u >= arrive) this.finRim(ctx, c.loki, lx, fy, size, { animState: u >= arrive && u < arrive + 30 ? 'shoot' : 'idle', frame: 1 }, '#fde68a', [-1, 1], 1);
      // a bola: com ele → chutada para fora da tela
      if (u < arrive + 4) this.ptdBall(ctx, lx + 40, fy - 6, 12, u);
      else {
        const e = seg(u, arrive + 4, arrive + 20);
        if (e < 1) this.ptdBall(ctx, lerp(1140, W + 140, e), lerp(fy - 10, fy - 120, e), 12, u, '#fbbf24');
      }
      const bk = seg(u, 120, 140);
      this.sselBoard(ctx, 640, 215, 1, 1, { k: bk, pop: 1 - seg(u, 120, 150), popSide: 'a', red: true });
      ctx.restore();
      this.ptdSpeed(ctx, S, t, '#fde68a', 0.2 * (u >= go && u < arrive + 40 ? 1 : 0), 1, 50, 20);
      if (u >= go) this.cineFlash(ctx, W, H, 0.35 * (1 - seg(u, go, go + 10)), '#fef3c7');
      this.finKicker(ctx, 40, top + 30, 'JULIAN LOKI • WORLD FIVE', seg(u, 4, 40), '#fbbf24');
      this.cineSfx(S, cut + go, 'divina', () => window.SFX?.whoosh?.());
      this.cineSfx(S, cut + arrive + 4, 'chute', () => window.SFX?.kick?.(1));
    },

    // PLANO 3 — montagem em faixas de mangá: o mundo responde (ou o Blue Lock aguenta)
    sselW52(ctx, S, v) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const win = v === 'win';
      ctx.fillStyle = '#04060c';
      ctx.fillRect(0, 0, W, H);
      this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
      const strips = win
        ? [
            [c.luna, 'LUNA', 'BLOQUEADO', '#c084fc', { animState: 'run' }, '#38bdf8'],
            [c.blake, 'BLAKE', 'NA TRAVE', '#ef4444', { animState: 'shoot' }, '#38bdf8'],
            [c.dada, 'DADA SILVA', 'AFASTADA', '#22c55e', { animState: 'call_pass' }, '#38bdf8'],
            [c.you, this.cinePlayerName(), 'VIRADA!', '#00f5d4', { animState: 'shoot', flipX: true }, '#00f5d4']
          ]
        : [
            [c.luna, 'LUNA', '1 x 2', '#c084fc', { animState: 'run' }, '#fca5a5'],
            [c.blake, 'BLAKE', '1 x 3', '#ef4444', { animState: 'shoot' }, '#fca5a5'],
            [c.dada, 'DADA SILVA', '1 x 4', '#22c55e', { animState: 'call_pass' }, '#fca5a5'],
            [c.pablo, 'PABLO', '1 x 5', '#38bdf8', { animState: 'shoot', flipX: true }, '#fca5a5']
          ];
      const sw = W / 4;
      strips.forEach(([ch, nm, res, col, o, rc], i) => {
        const at = 6 + i * 62;
        const kk = ease(seg(t, at, at + 14));
        if (kk <= 0) return;
        const x0 = i * sw;
        const sl = 40;
        const pts = [[x0 + sl + 6, top + 14], [x0 + sw + sl - 6, top + 14], [x0 + sw - sl - 6, bot - 14], [x0 - sl + 6, bot - 14]];
        const lt = t - at;
        this.finPanel(ctx, pts, () => {
          this.cineGradient(ctx, x0 - 60, top, sw + 120, bot - top, [[0, '#020617'], [1, this.finShade(col, -0.7)]]);
          this.ptdRays(ctx, x0 + sw / 2, 330, 620, col, 0.3, lt * 0.01, 40, 0.03);
          const zz = 1 + ease(seg(lt, 0, 60)) * 0.06;
          ctx.save();
          ctx.translate(x0 + sw / 2, 360);
          ctx.scale(zz, zz);
          ctx.translate(-(x0 + sw / 2), -360);
          const hop = o.animState === 'call_pass' ? -40 * Math.sin(seg(lt, 0, 40) * Math.PI) : 0;
          this.finRim(ctx, ch, x0 + sw / 2, bot + 80 + hop, 460, Object.assign({ frame: o.animState === 'run' ? RUNF(S.f) : 1 }, o), col, [-1, 1], 3);
          ctx.restore();
          this.finFillPat(ctx, 'dots', x0 - 60, top, sw + 120, bot - top, 0.15);
          this.rincStamp(ctx, nm, x0 + sw / 2, top + 60, 34, '#f8fafc', lt, 8, 2, sw - 40);
          this.cineImpactText(ctx, res, x0 + sw / 2, bot - 70, 46, rc, seg(lt, 24, 32), sw - 30, -0.06);
        }, { dy: (i % 2 ? 1 : -1) * (1 - kk) * 600, border: col });
        this.cineSfx(S, at + 24, 'lance' + i, () => (win && i < 3 ? window.SFX?.save?.() : window.SFX?.kick?.(0.9)));
      });
      const fk = seg(t, 270, 290);
      if (fk > 0) {
        ctx.fillStyle = `rgba(2,4,10,${0.6 * fk})`;
        ctx.fillRect(0, top, W, bot - top);
        if (win) this.cineImpactText(ctx, 'O BLUE LOCK VIROU!', 640, (top + bot) / 2, 96, '#00f5d4', seg(t, 276, 288), W * 0.86, -0.05);
        else this.cineImpactText(ctx, '1 x 5', 640, (top + bot) / 2, 170, '#ef4444', seg(t, 276, 288), W * 0.7, -0.05);
        this.cineSfx(S, 276, 'fim', () => window.SFX?.kick?.(1));
      }
    },

    // PLANO 4 — (derrota) você no chão, o placar lá em cima; a mão do Loki
    //           (vitória) você de pé; o Loki surpreso estende a mão
    sselW53(ctx, S, v) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const win = v === 'win';
      const cut = 120;
      if (t < cut) {
        const k = easeIO(t / cut);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: lerp(340, 360, k), zoom: lerp(1.0, 1.06, k), shake: 0.4 });
        this.sselStadium(ctx);
        ctx.fillStyle = 'rgba(2,6,23,0.35)';
        ctx.fillRect(-100, -100, W + 200, H + 200);
        if (win) this.sselBoard(ctx, 640, 168, 0, 0, { text: 'FIM • BLUE LOCK VENCE', green: true, s: 1.1, textColor: '#86efac' });
        else this.sselBoard(ctx, 640, 168, 1, 5, { red: true, s: 1.25 });
        if (!win) {
          // deitado no gramado
          ctx.save();
          ctx.translate(560, bot - 110);
          ctx.rotate(-Math.PI / 2);
          this.finRim(ctx, c.you, 0, 150, 340, { dim: 0.2, dimTint: '2,6,23' }, '#7dd3fc', [-1, 1], 2);
          ctx.restore();
        } else this.finRim(ctx, c.you, 500, bot + 190, 520, {}, '#7dd3fc', [-1, 1], 2);
        this.finRim(ctx, c.loki, 1000, bot + 40, 360, { facing: win ? 'front' : 'back' }, '#fde68a', [-1, 1], 2);
        ctx.restore();
        this.finKicker(ctx, 40, top + 30, 'FIM DE JOGO', seg(t, 4, 30), win ? '#22c55e' : '#ef4444');
        this.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
        return;
      }
      // o ponto de vista: o Loki de perto e a mão estendida
      const u = t - cut;
      const k = easeIO(u / (S.dur - cut));
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#020617'], [1, '#0b1440']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.05, rot: win ? 0 : 0.05, shake: 0.4 });
      // o anel do teto (visto de baixo) e o placar no alto
      ctx.strokeStyle = 'rgba(56,189,248,0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(640, win ? 40 : -60, 820, 220, 0, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        this.cineGlow(ctx, 640 + Math.cos(a) * 820, (win ? 40 : -60) + Math.sin(a) * 220, 30, 'rgba(165,243,252,0.8)');
      }
      if (win) this.sselBoard(ctx, 300, top + 70, 0, 0, { text: 'BLUE LOCK VENCE', green: true, s: 0.6, textColor: '#86efac' });
      else this.sselBoard(ctx, 300, top + 70, 1, 5, { red: true, s: 0.6 });
      const x = 780;
      const eyeY = win ? 340 : 320;
      const r = this.finHead(ctx, c.loki, x, eyeY, 1100, { rim: '#fde68a', dim: 0.15, dimTint: '20,10,30' });
      const surprised = win && u < 70;
      this.wcdEyes(ctx, x, eyeY, r.u, {
        ring: '#f0b429', iris: '#78350f', tiny: surprised, half: !surprised, lid: this.finShade(c.loki.skinColor, -0.25), shine: 1,
        glow: 'rgba(251,191,36,0.3)', glowA: 0.6
      });
      if (!surprised) {
        this.finU(ctx, x, r.top, r.u, 16.4, 12.0, 3.2, 0.5, '#2b0f05');
        this.finU(ctx, x, r.top, r.u, 16.0, 11.6, 0.5, 0.5, '#2b0f05');
        this.finU(ctx, x, r.top, r.u, 19.5, 11.6, 0.5, 0.5, '#2b0f05');
      }
      ctx.restore();
      // a mão (pixel art) entrando na tela
      const hk = ease(seg(u, 30, 70));
      const hv = this.sselHandCv();
      const px = 16;
      const hx = 400 - (hv.width * px) / 2;
      const hy = lerp(bot + 40, win ? 300 : 260, hk);
      ctx.save();
      if (win) {
        ctx.translate(hx + (hv.width * px) / 2, hy + (hv.height * px) / 2);
        ctx.rotate(-0.4);
        ctx.translate(-(hx + (hv.width * px) / 2), -(hy + (hv.height * px) / 2));
      }
      this.wcdPix(ctx, hv, hx, hy, px);
      ctx.restore();
      if (surprised) this.cineImpactText(ctx, '...!', 1080, top + 100, 60, '#fde68a', seg(u, 4, 12), 0, 0.08);
      this.finKicker(ctx, 40, bot - 40, 'JULIAN LOKI', seg(u, 10, 40), '#fbbf24');
    },

    // PLANO 5 — o telão do Ego: quem marcou contra o mundo (TOP 6) / o topo existe
    sselW54(ctx, S, v) {
      const { W, H, t, top, bot } = S;
      const c = this.sselCast();
      const win = v === 'win';
      const k = easeIO(t / S.dur);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#02050c'], [1, '#05101e']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(372, 352, k), zoom: lerp(1, 1.06, k), shake: 0.4 });
      ctx.strokeStyle = 'rgba(0,245,212,0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 48) line(ctx, [x, 0], [x, H]);
      for (let y = 0; y <= H; y += 48) line(ctx, [0, y], [W, y]);
      this.cineGlow(ctx, 640, 260, 620, 'rgba(0,245,212,0.16)');
      this.finEgoScreen(ctx, 330, top + 20, 620, 250, t, { live: true, ticker: win ? 'BLUE LOCK x WORLD FIVE • VITÓRIA • NÃO É O TOPO • É A PROVA DE QUE ELE EXISTE •' : 'BLUE LOCK x WORLD FIVE • DERROTA • GOLS CONTRA O WORLD FIVE: RIN ITOSHI • RYUSEI SHIDOU •' });
      const cards = win
        ? [[c.you, this.cinePlayerName(), '0,170,160', 'VIROU O JOGO'], [c.rinBL, 'RIN ITOSHI', '8,145,178', 'ABRIU O PLACAR']]
        : [[c.rinBL, 'RIN ITOSHI', '8,145,178', 'MARCOU'], [c.shidou, 'RYUSEI SHIDOU', '219,39,119', 'MARCOU']];
      cards.forEach(([ch, nm, rgb, tag], i) => {
        const x = i ? 1090 : 190;
        this.sselCard(ctx, x, 350, 180, 240, ch, nm, rgb, seg(t, 60 + i * 30, 84 + i * 30), seg(t, 90 + i * 30, 110 + i * 30), 0, tag);
      });
      ctx.restore();
      const tk = seg(t, 230, 262);
      if (tk > 0) {
        this.foxcGrad(ctx, 0, bot - 220, W, 220, [[0, 'rgba(2,6,23,0)'], [0.5, `rgba(2,6,23,${0.6 * tk})`], [1, `rgba(2,6,23,${0.85 * tk})`]]);
        this.cineTitleCard(ctx, W, bot - 100, tk, win
          ? { kicker: 'BLUE LOCK x WORLD FIVE', title: 'O TOPO EXISTE', sub: 'Vencer uma vez é só o começo.', color: '#00f5d4' }
          : { kicker: '2ª SELEÇÃO • RESULTADO FINAL', title: 'TOP 6', sub: 'Só quem marcou contra o mundo.', color: '#00f5d4' });
      }
      this.cineSfx(S, 230, 'titulo', () => window.SFX?.kick?.(0.8));
    }
  });

  // ==========================================================================
  // AQUECIMENTO: "ensaios" de cada plano num canvas minúsculo (montam os cenários, brilhos e
  // bonecos guardados que o plano vai usar), um por quadro durante o plano 1
  // ==========================================================================
  const PH = {};
  const STOP = { stop: true };
  const dry = (scene, phase, name, t, v) =>
    function () {
      if (!this._sselDryCv) {
        this._sselDryCv = document.createElement('canvas');
        this._sselDryCv.width = 64;
        this._sselDryCv.height = 36;
      }
      const g = this._sselDryCv.getContext('2d');
      const dur = PH[scene][phase];
      const top = Math.round(720 * 0.12);
      const S = { W: 1280, H: 720, t, phase, dur, p: t / dur, f: t + phase * 100, top, bot: 720 - top, stageH: 720 - top * 2 };
      const sfx = this.cineSfx;
      this.cineSfx = () => {};
      // no máximo 3 bonecos novos por quadro: se o plano precisar de mais, o ensaio para e é
      // repetido no quadro seguinte (os que já ficaram prontos estão guardados)
      const PR = window.PixelRenderer;
      const orig = PR.drawCharacterSprite;
      let n = 0;
      let done = true;
      PR.drawCharacterSprite = function (...a) {
        if (++n > 3) throw STOP;
        return orig.apply(PR, a);
      };
      try {
        g.save();
        g.scale(0.05, 0.05);
        this[name](g, S, v);
      } catch (e) {
        // o ensaio nunca pode derrubar a cena
        if (e === STOP) done = false;
      } finally {
        PR.drawCharacterSprite = orig;
        g.restore();
        this.cineSfx = sfx;
      }
      return done;
    };
  const runs = (scene, phase, name, ts, v) => ts.map((t) => dry(scene, phase, name, t, v));
  const runFrames = (who, o) =>
    [1, 5, 9, 13].map((fr) =>
      function () {
        this.finSprEntry(this.sselCast()[who], 180, Object.assign({}, o, { frame: fr }));
      }
    );

  PH.bluelock_man_test = [280, 300, 300, 300, 330];
  PH.rin_takes_bachira = [300, 320, 330, 340, 340];
  PH.rin_takes_bachira_win = PH.rin_takes_bachira;
  PH.barou_devour = [260, 280, 290, 280, 300, 230];
  PH.world_five_fall = [300, 300, 330, 330, 340];
  PH.world_five_win = PH.world_five_fall;

  const warmBlm = [
    ...runs('bluelock_man_test', 0, 'sselBlm0', [70, 140, 220]),
    ...runs('bluelock_man_test', 1, 'sselBlm1', [20, 40, 60, 100, 120, 160, 175, 190, 240]),
    ...runs('bluelock_man_test', 2, 'sselBlm2', [20, 100, 200, 260]),
    function () {
      const room = this.finBg('ssel_chamber', 1280, 720, this.sselChamberBg);
      this.mgmBlur('ssel_chamber_blur', room, 1280, 720, 10);
    },
    ...runs('bluelock_man_test', 3, 'sselBlm3', [20, 100, 170, 240]),
    ...runs('bluelock_man_test', 4, 'sselBlm4', [20, 40, 50, 66, 90, 150, 250])
  ];
  const warmRtb = (v) => {
    const sc = v === 'win' ? 'rin_takes_bachira_win' : 'rin_takes_bachira';
    return [
      ...[0, 1, 2, 3, 4].map(() =>
        function () {
          this.mgmRoom(true);
        }
      ),
      function () {
        this.mgmFlush(this.mgmRoomBlur());
      },
      ...runs(sc, 0, 'sselRtb0', [60, 200], v),
      ...runs(sc, 1, 'sselRtb1', [40, 200, 280], v),
      ...runs(sc, 2, 'sselRtb2', [40, 120, 200, 280], v),
      ...runs(sc, 3, 'sselRtb3', [40, 160, 240], v),
      ...runFrames('bachira', { facing: 'back', rim: '#fde68a', rimSides: [-1, 1], rimD: 2 }),
      ...runs(sc, 4, 'sselRtb4', [40, 120, 200, 270], v)
    ];
  };
  const warmBar = [
    function () {
      this.finBg('ssel_pitch', 1280, 720, this.sselPitchBg);
    },
    ...runFrames('barou', { animState: 'run', showAura: true }),
    ...runs('barou_devour', 0, 'sselBar0', [60, 160, 240]),
    ...runs('barou_devour', 1, 'sselBar1', [20, 90, 160, 240]),
    ...runFrames('barou', { animState: 'run', flipX: true, showAura: true }),
    ...runFrames('you', { animState: 'run', flipX: true, rim: '#5eead4', rimSides: [-1, 1], rimD: 1 }),
    ...runs('barou_devour', 2, 'sselBar2', [30, 80, 100, 140, 200]),
    function () {
      const p = this.finBg('ssel_pitch', 1280, 720, this.sselPitchBg);
      this.mgmBlur('ssel_pitch_blur', p, 1280, 720, 10);
    },
    ...runs('barou_devour', 3, 'sselBar3', [10, 30, 80, 200]),
    ...runs('barou_devour', 4, 'sselBar4', [60, 200, 260]),
    ...runs('barou_devour', 5, 'sselBar5', [30, 80, 180])
  ];
  const warmW5 = (v) => {
    const sc = v === 'win' ? 'world_five_win' : 'world_five_fall';
    return [
      function () {
        this.finBg('ssel_stadium', 1280, 720, this.sselStadiumBg);
      },
      function () {
        const s = this.finBg('ssel_stadium', 1280, 720, this.sselStadiumBg);
        this.mgmBlur('ssel_stadium_blur', s, 1280, 720, 10);
      },
      ...runFrames('rinBL', { animState: 'run', flipX: true, rim: '#67e8f9', rimSides: [-1, 1], rimD: 3 }),
      ...runs(sc, 0, 'sselW50', [20, 50, 120, 200], v),
      ...runs(sc, 1, 'sselW51', [40, 120, 135, 150, 240], v),
      ...runs(sc, 2, 'sselW52', [30, 90, 150, 220, 290], v),
      ...runs(sc, 3, 'sselW53', [40, 160, 240], v),
      ...runs(sc, 4, 'sselW54', [100, 150, 260], v)
    ];
  };

  // ==========================================================================
  // REGISTRO
  // ==========================================================================
  const draw = (fns, warm, v) =>
    function (ctx, S) {
      fns[S.phase].call(this, ctx, S, v);
      this.sselWarm(S, warm);
      this.foxcGrain(ctx, S.W, S.H, 0.06);
    };

  CE.registerCine('bluelock_man_test', {
    phases: PH.bluelock_man_test,
    music: 'tension',
    title: '🤖 O BLUE LOCK MAN',
    tags: ['PLANO 1 • A CÂMARA BRANCA', 'PLANO 2 • DEFENDIDO', 'PLANO 3 • LIDO', 'PLANO 4 • UMA ARMA', 'PLANO 5 • DE PRIMEIRA'],
    subs: [
      [{ from: 34, to: 278, who: 'EGO', text: '"Segunda Seleção, primeira fase: derrote o BLUE LOCK MAN."', color: EGO_C }],
      [{ from: 40, to: 298, who: 'NARRADOR', text: 'A máquina defende antes mesmo de você chutar.', color: NARR_C }],
      [{ from: 24, to: 298, who: 'VOCÊ', text: '(Ele lê tudo. Cada passo. Cada chute.)', color: YOU_C }],
      [{ from: 16, to: 298, who: 'VOCÊ', text: '(Preciso de uma arma que a máquina não leia.)', color: YOU_C }],
      [{ from: 110, to: 328, who: 'EGO', text: '"Passou. Bem-vindo à próxima fase."', color: EGO_C }]
    ],
    grain: 0,
    vignette: 0.5,
    draw: draw([CE.sselBlm0, CE.sselBlm1, CE.sselBlm2, CE.sselBlm3, CE.sselBlm4], warmBlm)
  });

  const rtbFns = [CE.sselRtb0, CE.sselRtb1, CE.sselRtb2, CE.sselRtb3, CE.sselRtb4];
  CE.registerCine('rin_takes_bachira', {
    phases: PH.rin_takes_bachira,
    music: 'mystery',
    title: '🐝 O MONSTRO FOI EMBORA',
    tags: ['PLANO 1 • FIM DE JOGO', 'PLANO 2 • DE CIMA', 'PLANO 3 • A ESCOLHA', 'PLANO 4 • O MONSTRO', 'PLANO 5 • DOIS QUE FICARAM'],
    subs: [
      [{ from: 20, to: 296, who: 'NARRADOR', text: 'Fim de jogo. O Top 3 venceu.', color: NARR_C }],
      [{ from: 30, to: 316, who: 'RIN ITOSHI', text: '"Lentos demais. Vocês nem chegaram perto."', color: RIN_C }],
      [
        { from: 12, to: 182, who: 'AOSHI TOKIMITSU', text: '"A-a gente já decidiu..."', color: TOKI_C },
        { from: 184, to: 328, who: 'JYUBEI ARYU', text: '"O Bachira. OSHAA!"', color: ARYU_C }
      ],
      [
        { from: 8, to: 104, who: 'VOCÊ', text: '"...Bachira?"', color: YOU_C },
        { from: 106, to: 338, who: 'BACHIRA', text: '"Desculpa... o monstro dele é mais forte."', color: BACH_C }
      ],
      [
        { from: 16, to: 176, who: 'SEISHIRO NAGI', text: '"...Ele foi mesmo."', color: NAGI_C },
        { from: 180, to: 338, who: 'VOCÊ', text: '"Eu vou te buscar, Bachira."', color: YOU_C }
      ]
    ],
    grain: 0,
    vignette: 0.5,
    draw: draw(rtbFns, warmRtb('lose'), 'lose')
  });

  CE.registerCine('rin_takes_bachira_win', {
    phases: PH.rin_takes_bachira_win,
    music: 'mystery',
    title: '🐝 O MONSTRO ESCOLHEU',
    tags: ['PLANO 1 • FIM DE JOGO', 'PLANO 2 • NÃO MUDA NADA', 'PLANO 3 • A ESCOLHA', 'PLANO 4 • O MONSTRO', 'PLANO 5 • DOIS QUE FICARAM'],
    subs: [
      [{ from: 20, to: 296, who: 'NARRADOR', text: 'Fim de jogo. Vocês derrubaram o Top 3.', color: NARR_C }],
      [{ from: 30, to: 316, who: 'RIN ITOSHI', text: '"Ganhou hoje. Não muda nada."', color: RIN_C }],
      [
        { from: 10, to: 204, who: 'NARRADOR', text: 'Pela regra, vocês podem levar um deles.', color: NARR_C },
        { from: 206, to: 328, who: 'BACHIRA', text: '"Eu vou com o Rin."', color: BACH_C }
      ],
      [
        { from: 6, to: 88, who: 'VOCÊ', text: '"Bachira?"', color: YOU_C },
        { from: 90, to: 338, who: 'BACHIRA', text: '"O monstro dele é mais forte... eu quero jogar com ele."', color: BACH_C }
      ],
      [
        { from: 10, to: 190, who: 'SEISHIRO NAGI', text: '"A gente ganhou... e ele foi."', color: NAGI_C },
        { from: 192, to: 338, who: 'VOCÊ', text: '"Eu vou te buscar, Bachira."', color: YOU_C }
      ]
    ],
    grain: 0,
    vignette: 0.5,
    draw: draw(rtbFns, warmRtb('win'), 'win')
  });

  CE.registerCine('barou_devour', {
    phases: PH.barou_devour,
    music: 'epic',
    title: '👑 DEVORANDO O REI',
    tags: ['PLANO 1 • A INVESTIDA DO REI', 'PLANO 2 • METAVISÃO', 'PLANO 3 • UM PASSO ANTES', 'PLANO 4 • O GOL ROUBADO', 'PLANO 5 • DE JOELHOS', 'PLANO 6 • VEM PRO MEU TIME'],
    subs: [
      [{ from: 30, to: 258, who: 'SHOUEI BAROU', text: '"Ninguém toca na bola! Esse gol é do Rei!"', color: BAROU_C }],
      [{ from: 20, to: 278, who: 'VOCÊ', text: '(Eu vejo o caminho dele. E o gol que ele vai fazer.)', color: YOU_C }],
      [{ from: 120, to: 290, who: 'SHOUEI BAROU', text: '"...Ele roubou o MEU gol?!"', color: BAROU_C }],
      [{ from: 60, to: 278, who: 'VOCÊ', text: '(O seu gol... agora é meu.)', color: YOU_C }],
      [
        { from: 12, to: 150, who: 'NARRADOR', text: 'O Rei caiu de joelhos.', color: NARR_C },
        { from: 158, to: 298, who: 'VOCÊ', text: '(Eu devorei o Rei.)', color: YOU_C }
      ],
      [{ from: 36, to: 228, who: 'RIN ITOSHI', text: '"Você. Vem pro meu time."', color: RIN_C }]
    ],
    grain: 0,
    vignette: 0.55,
    draw: draw([CE.sselBar0, CE.sselBar1, CE.sselBar2, CE.sselBar3, CE.sselBar4, CE.sselBar5], warmBar)
  });

  const w5Fns = [CE.sselW50, CE.sselW51, CE.sselW52, CE.sselW53, CE.sselW54];
  CE.registerCine('world_five_fall', {
    phases: PH.world_five_fall,
    music: 'dread',
    title: '🌍 O MURO DO MUNDO',
    tags: ['PLANO 1 • O RIN ABRE', 'PLANO 2 • VELOCIDADE DIVINA', 'PLANO 3 • O MUNDO RESPONDE', 'PLANO 4 • A MÃO DO LOKI', 'PLANO 5 • TOP 6'],
    subs: [
      [{ from: 16, to: 298, who: 'NARRADOR', text: 'Blue Lock x World Five. E o Rin abre o placar.', color: NARR_C }],
      [{ from: 20, to: 298, who: 'JULIAN LOKI', text: '"Desculpe. Nessa velocidade, ninguém me alcança."', color: LOKI_C }],
      [{ from: 10, to: 328, who: 'NARRADOR', text: 'Luna. Blake. Dada Silva. Pablo. Um gol atrás do outro.', color: NARR_C }],
      [{ from: 124, to: 328, who: 'JULIAN LOKI', text: '"Bom jogo. Vocês ainda estão longe."', color: LOKI_C }],
      [
        { from: 8, to: 206, who: 'EGO', text: '"Só o Rin e o Shidou marcaram contra eles."', color: EGO_C },
        { from: 210, to: 338, who: 'EGO', text: '"Isso define o Top 6."', color: EGO_C }
      ]
    ],
    grain: 0,
    vignette: 0.55,
    draw: draw(w5Fns, warmW5('lose'), 'lose')
  });

  CE.registerCine('world_five_win', {
    phases: PH.world_five_win,
    music: 'epic',
    title: '🌍 O MUNDO SUOU',
    tags: ['PLANO 1 • O RIN ABRE', 'PLANO 2 • VELOCIDADE DIVINA', 'PLANO 3 • O BLUE LOCK AGUENTA', 'PLANO 4 • A MÃO DO LOKI', 'PLANO 5 • O TOPO EXISTE'],
    subs: [
      [{ from: 16, to: 298, who: 'NARRADOR', text: 'Blue Lock x World Five. E o Rin abre o placar.', color: NARR_C }],
      [{ from: 20, to: 298, who: 'JULIAN LOKI', text: '"Desculpe. Nessa velocidade, ninguém me alcança."', color: LOKI_C }],
      [{ from: 10, to: 328, who: 'NARRADOR', text: 'O mundo veio com tudo. O Blue Lock aguentou... e virou.', color: NARR_C }],
      [{ from: 40, to: 328, who: 'JULIAN LOKI', text: '"Vocês me fizeram suar. Guarde esse nome: Julian Loki."', color: LOKI_C }],
      [
        { from: 8, to: 166, who: 'EGO', text: '"Vencer uma vez não é o topo."', color: EGO_C },
        { from: 170, to: 338, who: 'EGO', text: '"É a prova de que o topo existe."', color: EGO_C }
      ]
    ],
    grain: 0,
    vignette: 0.55,
    draw: draw(w5Fns, warmW5('win'), 'win')
  });
})();
