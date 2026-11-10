// ============================================================================
// CUTSCENES EM 3D — CARREIRA EM DUPLA "PROJETO ELO" (js/cine_duo.js refeito no 3D)
//   duo_ponte       • a quadra debaixo da Ponte Velha (montada na área vazia), o frente a
//                     frente, o lance roubado pelos mascarados, o poste e as duas casas
//   duo_elo         • o salão (saguão) das trinta duplas, a pulseira fechando, a corrente
//   duo_ressonancia • os corações, a corrida com a aura, o chute dos dois e o gol (campo)
//   duo_regra       • o auditório vermelho, o Ego no telão: "UM.", a corrente rachando
//   duo_mascaras    • o túnel (ala do treino), a máscara rachando, Shion Mikami e Haru Ibuki
//   duo_final       • a final no campo, o olhar sem olhar, o chute, o gol e as pulseiras
// Kit: js/cine3d_kit.js. Mesmos planos, tempos e legendas da versão 2D.
// Os dois protagonistas vêm do CE.duoCast (A = quem fundou a dupla, ciano; B = o parceiro,
// coral; os dois juntos: o dourado do Elo). Máscaras, pulseira, corrente de luz e textos
// grandes usam os ajudantes 2D da versão antiga (CE.duo*, CE.ptd*) no overlay.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;

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
  const rgbOf = (hex) => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    return m ? [1, 2, 3].map((i) => parseInt(m[i], 16)) : [253, 224, 71];
  };
  const rgba = (hex, a) => `rgba(${rgbOf(hex).join(',')},${a})`;
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };

  // Cores e uniformes (iguais aos da versão 2D)
  const GOLD = '#fde047';
  const CA = '#38bdf8';
  const CB = '#fb7185';
  const RED = '#dc2626';
  const HOKUTO = { jerseyPrimary: '#0f766e', jerseySecondary: '#f8fafc' };
  const SEIRAN = { jerseyPrimary: '#7f1d1d', jerseySecondary: '#fbbf24' };
  const ELO = { jerseyPrimary: '#111c44', jerseySecondary: '#fde047' };
  const CASUAL_A = { jerseyPrimary: '#1f2937', jerseySecondary: '#38bdf8' };
  const CASUAL_B = { jerseyPrimary: '#3f1d1d', jerseySecondary: '#fb7185' };
  const MASK_KIT = { jerseyPrimary: '#0a0a0a', jerseySecondary: '#e5e7eb' };
  const SHION_KIT = { jerseyPrimary: '#0a0a0a', jerseySecondary: '#e5e7eb' };
  const HARU_KIT = { jerseyPrimary: '#0a0a0a', jerseySecondary: '#dc2626' };
  // luz nos bonecos para destacar cada um (A puxado pro ciano, B pro coral)
  const LA = [1.08, 1.3, 1.48];
  const LB = [1.48, 1.12, 1.16];

  // ---------------------------------------------------------------- utilidades
  const mkCv = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (draw) draw(g, w, h);
    return c;
  };
  const lazy = (fn) => {
    let v = null;
    return () => v || (v = fn());
  };
  const M10 = () => (window.SPRITE_MAPY || ((v) => v))(10);

  // Olhos de um boneco na tela (e px por unidade do boneco, para a máscara e os olhos no overlay).
  // dir = para onde ele olha na tela quando está de lado (-1/1): o rosto fica um pouco para lá
  function eyeOf(K, x, y, z = 0, k = 0.9, dir = 0) {
    const ez = z + (k * (66 - 2 * M10())) / 66;
    const p = K.screen(x, ez, y);
    const q = K.screen(x, ez + 0.2, y);
    if (!p || !q) return null;
    const u = (Math.hypot(p.x - q.x, p.y - q.y) / 0.2) * ((2 * k) / 66);
    return { x: p.x + dir * 2.6 * u, y: p.y, u };
  }

  // Ângulo de uma placa (K.quad) para ser lida certa por quem olha de (vx, vy)
  // (a placa do kit mostra a textura sem espelhar olhando do lado oposto ao ang)
  const plateAng = (x, y, vx, vy) => Math.atan2(y - vy, x - vx);
  const camAng = (K, x, y) => plateAng(x, y, K.c.eye[0], K.c.eye[2]);

  // Câmera olhando para "alvo", com o alvo aparecendo na fração fx da largura da tela
  function camFrame(K, S, eye, tgt, fov, fx = 0.5) {
    const dx = tgt[0] - eye[0];
    const dz = tgt[2] - eye[2];
    const d = Math.hypot(dx, dz) || 1;
    const th = Math.tan((fov * Math.PI) / 360) * (S.W / S.H);
    const off = (0.5 - fx) * 2 * d * th;
    K.cam(eye, [tgt[0] + (-dz / d) * off, tgt[1], tgt[2] + (dx / d) * off], fov);
  }

  // Os bonecos em pé ficam virados para o "lado direito" da câmera do mapa (Hub.camA), não
  // para a câmera da cena: com a câmera olhando para leste/oeste eles ficavam de lado (finos
  // como papel). Durante o desenho da cena o Hub.camA aponta para onde a câmera da cena
  // olha, e volta ao valor de antes no overlay (que roda logo depois, no mesmo quadro).
  let CAM_A0 = null;
  function aimBillboards(K) {
    const Hub = window.Hub;
    if (!Hub || !K.c) return;
    if (CAM_A0 === null) CAM_A0 = Hub.camA;
    const e = K.c.eye;
    const l = K.c.look;
    if (Math.abs(l[0] - e[0]) + Math.abs(l[2] - e[2]) > 1e-4) Hub.camA = Math.atan2(l[2] - e[2], l[0] - e[0]);
  }
  function restoreBillboards() {
    if (CAM_A0 === null || !window.Hub) return;
    window.Hub.camA = CAM_A0;
    CAM_A0 = null;
  }
  const reg3d = (type, def) => {
    const sc = def.scene;
    const ov = def.overlay;
    def.scene = function (K, S) {
      restoreBillboards();
      sc.call(this, K, S);
      aimBillboards(K);
    };
    def.overlay = function (ctx, S, K) {
      restoreBillboards();
      if (ov) ov.call(this, ctx, S, K);
    };
    CE.registerCine3D(type, def);
  };

  // ---------------------------------------------------------------- elenco
  const PARTNER = { name: 'Parceiro', hairColor: '#f97316', hairSecondary: '#fde047', hairStyle: 'knight_wild', eyeColor: '#38bdf8', skinColor: '#f1c9a5', number: 7 };
  let CAST = null;
  function cast() {
    const run = CE._cineRun || 0;
    if (CAST && CAST.run === run) return CAST;
    let c = null;
    try {
      c = CE.duoCast ? CE.duoCast() : null;
    } catch (e) {
      c = null;
    }
    if (!c || !c.a || !c.b) {
      const p = window.App?.state?.profile || {};
      c = { a: Object.assign({ skinColor: '#f3d1b8', hairStyle: 'spiky_tall' }, p, { id: 'duo_a' }), b: Object.assign({ id: 'duo_b' }, PARTNER), an: String(p.name || 'A').toUpperCase(), bn: 'PARCEIRO' };
    }
    CAST = Object.assign({ run }, c);
    return CAST;
  }
  // um dos dois (side 'a' | 'b') com o uniforme da cena
  const duo = (K, side, kit, o) => K.actor(cast()[side], Object.assign({ id: side, extra: Object.assign({ duoSide: side }, kit) }, o));
  const masked = (i) => (CE.duoMasked ? CE.duoMasked(i) : Object.assign({ name: 'mascarado' + i, hairStyle: 'slick_back' }, MASK_KIT));

  // gente sorteada (figurantes) — sempre a mesma
  function people(n, seed, kit) {
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = A.CREATOR_SKIN || ['#f3d1b8'];
    const cols = A.CREATOR_HAIR_COLORS || ['#1b2340'];
    let s = seed;
    const r = (m) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % m);
    const out = [];
    for (let i = 0; i < n; i++) out.push(Object.assign({ name: 'duo_fig' + seed + '_' + i, skinColor: skins[r(skins.length)], hairColor: cols[r(cols.length)], hairSecondary: cols[r(cols.length)], eyeColor: '#1e293b', hairStyle: hairs[r(hairs.length)], number: 1 + r(60) }, kit));
    return out;
  }

  // ---------------------------------------------------------------- texturas (feitas uma vez)
  const HALO = lazy(() =>
    mkCv(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    })
  );
  const CONE = lazy(() =>
    mkCv(64, 128, (g) => {
      for (let y = 0; y < 128; y++) {
        const q = y / 127;
        const half = 4 + q * 28;
        const gr = g.createLinearGradient(32 - half, 0, 32 + half, 0);
        const a = 0.7 * (1 - q * 0.75);
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(0.5, `rgba(255,255,255,${a})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(32 - half, y, half * 2, 1);
      }
    })
  );
  const dot = (c) => mkCv(2, 2, (g) => ((g.fillStyle = c), g.fillRect(0, 0, 2, 2)));
  const LED_ON = lazy(() => dot(GOLD));
  const LED_RED = lazy(() => dot('#ef4444'));
  const LED_OFF = lazy(() => dot('#334155'));
  const PHONE = lazy(() => mkCv(3, 4, (g) => ((g.fillStyle = '#ffffff'), g.fillRect(0, 0, 3, 4))));
  // elos da corrente de luz (deitado e em pé), dourados e vermelhos
  const link = (w, h, col) =>
    mkCv(w, h, (g) => {
      g.fillStyle = '#020617';
      g.fillRect(0, 0, w, h);
      g.fillStyle = col;
      g.fillRect(1, 1, w - 2, h - 2);
      g.fillStyle = '#020617';
      if (w > h) g.fillRect(3, Math.floor(h / 2), w - 6, 1);
      else g.fillRect(Math.floor(w / 2), 3, 1, h - 6);
    });
  const LINKS = lazy(() => ({ h: link(12, 7, GOLD), v: link(7, 12, GOLD), hr: link(12, 7, '#ef4444'), vr: link(7, 12, '#ef4444') }));

  // ---------------------------------------------------------------- peças soltas
  // brilho redondo virado para a câmera (dyn com transparência: soma luz por cima)
  function halo(K, x, y, z, size, color, a) {
    if (a <= 0.01) return;
    K.quad({ x, y, z: z - size / 2, w: size, h: size, ang: camAng(K, x, y), img: HALO(), color, alpha: Math.min(0.98, a), em: true });
  }
  // corrente de luz em 3D entre p0 e p1 ([x, y, z]); k = quanto já apareceu, brk = rachando
  function chain3d(K, p0, p1, t, k = 1, brk = 0) {
    if (k <= 0) return;
    const L = LINKS();
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const q = i / n;
      if (q > k) break;
      const mid = Math.abs(q - 0.5) < 0.12;
      let x = lerp(p0[0], p1[0], q);
      const y = lerp(p0[1], p1[1], q);
      let z = lerp(p0[2], p1[2], q) - Math.sin(q * Math.PI) * 0.1 + Math.sin(t * 0.25 + i) * 0.006;
      let a = 1;
      if (brk > 0 && mid) {
        z -= easeIn(brk) * (0.35 + i * 0.015);
        x += (rnd(i, 4) - 0.5) * 0.25 * brk;
        a = 1 - brk;
      }
      if (a <= 0.02 || z < 0.02) continue;
      const red = brk > 0 && mid;
      const vert = i % 2;
      const cv = vert ? (red ? L.vr : L.v) : red ? L.hr : L.h;
      const w = vert ? 0.055 : 0.095;
      const h = vert ? 0.095 : 0.055;
      K.sprite(cv, { x, y, z: z - h / 2, w, h, glow: true, alpha: a < 1 ? a : 1 });
    }
  }
  // os LEDs da pulseira no pulso de cada figurante (piscando)
  function wristLed(K, S, x, y, i, red) {
    const on = mod(S.f * 0.05 + rnd(i, 12) * 6, 6) < 3.5;
    K.sprite(on ? (red ? LED_RED() : LED_ON()) : LED_OFF(), { x, y, z: 0.31, w: 0.04, h: 0.04, glow: on });
  }

  // ======================================================================
  // CENÁRIO 1 — A QUADRA DEBAIXO DA PONTE VELHA (na área vazia, à noite)
  // ======================================================================
  const V = [86, 17]; // = K.VOID
  const COURT = { x0: 79, x1: 93, y0: 14.2, y1: 21.8 };
  const LAMPS = [82.4, 86.0, 89.6];
  const LAMP_Y = 14.3;
  const COURT_TEX = lazy(() =>
    mkCv(280, 152, (g, w, h) => {
      g.fillStyle = '#20263a';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = i % 2 ? 'rgba(148,163,184,0.10)' : 'rgba(2,6,23,0.28)';
        g.fillRect(Math.floor(rnd(i, 8) * w), Math.floor(rnd(i, 9) * h), 1 + (i % 3 === 0 ? 1 : 0), 1);
      }
      // manchas (poças)
      [[60, 100, 22], [200, 40, 16], [150, 120, 12]].forEach(([x, y, r]) => {
        g.fillStyle = 'rgba(30,41,82,0.55)';
        g.beginPath();
        g.ellipse(x, y, r, r * 0.5, 0, 0, TAU);
        g.fill();
      });
      // linhas gastas
      g.fillStyle = 'rgba(226,232,240,0.5)';
      g.fillRect(6, 6, w - 12, 2);
      g.fillRect(6, h - 8, w - 12, 2);
      g.fillRect(6, 6, 2, h - 12);
      g.fillRect(w - 8, 6, 2, h - 12);
      g.fillRect(w / 2 - 1, 6, 2, h - 12);
      for (let a = 0; a < TAU; a += 0.02) g.fillRect(Math.floor(w / 2 + Math.cos(a) * 30), Math.floor(h / 2 + Math.sin(a) * 30), 2, 2);
      for (let i = 0; i < 500; i++) {
        g.clearRect(Math.floor(rnd(i, 3) * w), Math.floor(rnd(i, 5) * h), 2, 1);
      }
    })
  );
  const MESH = lazy(() =>
    mkCv(320, 25, (g, w, h) => {
      g.fillStyle = 'rgba(120,135,160,0.6)';
      for (let y = 2; y < h; y++) for (let x = 0; x < w; x++) if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) g.fillRect(x, y, 1, 1);
      g.fillStyle = '#475569';
      g.fillRect(0, 0, w, 2);
      for (let x = 0; x < w; x += 40) g.fillRect(x, 0, 2, h);
    })
  );
  const NET = lazy(() =>
    mkCv(24, 16, (g, w, h) => {
      g.fillStyle = 'rgba(226,232,240,0.55)';
      for (let x = 0; x < w; x += 3) g.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
    })
  );
  const CITY = lazy(() =>
    mkCv(512, 80, (g, w, h) => {
      for (let x = 0; x < w; ) {
        const bw = 8 + Math.floor(rnd(x, 3) * 20);
        const bh = 10 + Math.floor(rnd(x, 4) * 30);
        const by = h - bh;
        g.fillStyle = '#0d0a2a';
        g.fillRect(x, by, bw - 1, bh);
        for (let yy = by + 3; yy < h - 2; yy += 4) {
          for (let xx = x + 2; xx < x + bw - 3; xx += 3) {
            if (rnd(xx * 7 + yy, 5) > 0.72) {
              g.fillStyle = rnd(xx + yy, 6) > 0.5 ? '#fbbf24' : '#93c5fd';
              g.fillRect(xx, yy, 1, 1);
            }
          }
        }
        x += bw;
      }
    })
  );
  const MOON = lazy(() =>
    mkCv(24, 24, (g) => {
      g.fillStyle = '#fef3c7';
      for (let y = 0; y < 24; y++) {
        const half = Math.floor(Math.sqrt(Math.max(0, 132 - (y - 11.5) * (y - 11.5))));
        g.fillRect(12 - half, y, half * 2, 1);
      }
      g.fillStyle = 'rgba(203,213,225,0.75)';
      [[6, 8, 3], [14, 13, 2], [9, 16, 2]].forEach(([x, y, r]) => g.fillRect(x, y, r, r));
    })
  );
  const PILLAR = lazy(() =>
    mkCv(24, 60, (g, w, h) => {
      g.fillStyle = '#161d2e';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#24304a';
      g.fillRect(2, 0, 3, h);
      for (let i = 0; i < 80; i++) {
        g.fillStyle = 'rgba(2,6,23,0.4)';
        g.fillRect(Math.floor(rnd(i, 2) * w), Math.floor(rnd(i, 7) * h), 2, 1);
      }
      // pichações
      g.fillStyle = '#7c3aed';
      g.fillRect(6, 34, 12, 3);
      g.fillStyle = '#dc2626';
      g.fillRect(8, 39, 9, 2);
      g.fillStyle = '#fde047';
      g.fillRect(7, 44, 3, 3);
    })
  );
  const RAIL = lazy(() =>
    mkCv(160, 8, (g, w, h) => {
      g.fillStyle = '#111827';
      g.fillRect(0, 0, w, 1);
      for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h);
    })
  );
  // o arco debaixo da ponte (escuro, com o vão aberto)
  const ARCH = lazy(() =>
    mkCv(204, 24, (g, w, h) => {
      g.fillStyle = '#0b0f1c';
      for (let x = 0; x < w; x++) {
        const k = (x - w / 2) / (w / 2);
        const y = Math.floor(Math.max(0, k * k) * h * 0.95);
        g.fillRect(x, 0, 1, Math.max(2, y));
      }
    })
  );
  const KIDS = lazy(() => {
    const cds = people(22, 31, { jerseyPrimary: '#111827', jerseySecondary: '#374151' });
    const out = [];
    for (let i = 0; i < 22; i++) {
      const x = 78.7 + ((i + 0.5) / 22) * 14.6 + (rnd(i, 4) - 0.5) * 0.4;
      if (Math.abs(x - 86) < 0.9) continue;
      out.push({ cd: cds[i], x, y: 13.35 + (rnd(i, 8) - 0.5) * 0.3, k: 0.72 + rnd(i, 5) * 0.12, phone: rnd(i, 7) > 0.5, jump: rnd(i, 6) > 0.6, i });
    }
    return out;
  });
  // a gaiola (gol de rua): boca virada para dir (+1 = leste)
  function cage(K, x, dir, bulge = 0) {
    const y0 = 17.2;
    const y1 = 18.8;
    const zt = 0.85;
    const back = x - dir * 0.5;
    const post = (px, py) => K.box({ x0: px - 0.03, y0: py - 0.03, x1: px + 0.03, y1: py + 0.03, z0: 0, z1: zt, color: '#e2e8f0' });
    post(x, y0);
    post(x, y1);
    post(back, y0);
    post(back, y1);
    K.box({ x0: x - 0.03, y0, x1: x + 0.03, y1, z0: zt - 0.06, z1: zt, color: '#e2e8f0' });
    // rede: fundo (estufa com o gol), lados e teto
    K.quad({ x: back - dir * bulge * 0.18, y: 18, z: 0, w: 1.6, h: zt, ang: 0, img: NET() });
    [y0, y1].forEach((py) => K.quad({ x: (x + back) / 2 - dir * bulge * 0.09, y: py, z: 0, w: 0.5 + bulge * 0.18, h: zt, ang: Math.PI / 2, img: NET() }));
    K.floor({ x0: Math.min(x, back), y0, x1: Math.max(x, back), y1, z: zt, img: NET() });
  }
  // monta a quadra. o = { lamp (força dos postes), kids (molecada no alambrado), dark }
  function street(K, S, o = {}) {
    const t = S.f;
    K.sky('#02030f', '#2a1a5a', 1);
    K.fog(o.fog || '#160f3a', o.fogK ?? 0.028);
    K.ambient(o.ambient || '#a3acd9');
    K.expo(o.expo || 0.95);
    // chão em volta e a quadra de asfalto
    K.floor({ x0: 56, y0: -6, x1: 116, y1: 42, z: 0.004, color: '#0a0c16' });
    K.floor({ x0: COURT.x0, y0: COURT.y0, x1: COURT.x1, y1: COURT.y1, z: 0.01, img: COURT_TEX(), light: [0.78, 0.8, 0.95] });
    // a cidade ao longe (cenário de teatro) e a lua
    K.quad({ x: V[0], y: -3, z: -0.2, w: 66, h: 10.3, ang: plateAng(V[0], -3, V[0], 30), img: CITY(), em: true, color: '#9aa3c7' });
    K.quad({ x: 97, y: 0, z: 9.2, w: 1.9, h: 1.9, ang: plateAng(97, 0, V[0], 30), img: MOON(), em: true });
    halo(K, 97, 0.1, 10.15, 7, '#fef3c7', 0.32);
    // a ponte: tabuleiro, faixa clara, guarda-corpo, arco e pilares
    K.box({ x0: 64, y0: 11.4, x1: 108, y1: 13.0, z0: 3.05, z1: 3.5, color: '#0b0f1c', top: '#121a2c' });
    K.box({ x0: 64, y0: 12.98, x1: 108, y1: 13.04, z0: 3.03, z1: 3.1, color: '#334155' });
    K.quad({ x: V[0], y: 13.02, z: 3.5, w: 44, h: 0.32, ang: plateAng(V[0], 13.02, V[0], 30), img: RAIL() });
    K.quad({ x: V[0], y: 12.95, z: 2.1, w: 10.2, h: 0.96, ang: plateAng(V[0], 12.95, V[0], 30), img: ARCH() });
    [80.2, 91.8].forEach((px) => K.box({ x0: px - 0.7, y0: 11.6, x1: px + 0.7, y1: 12.9, z0: 0, z1: 3.05, img: PILLAR(), light: [0.62, 0.64, 0.8] }));
    // alambrado
    K.quad({ x: V[0], y: 14.0, z: 0, w: 16, h: 1.25, ang: plateAng(V[0], 14, V[0], 30), img: MESH() });
    // gaiolas nas duas pontas
    cage(K, 79.45, 1, o.bulgeW || 0);
    cage(K, 92.55, -1, o.bulgeE || 0);
    // postes (com a luz piscando)
    const lamp = o.lamp ?? 1;
    LAMPS.forEach((px, i) => {
      const fl = 0.75 + 0.25 * Math.sin(t * 0.09 + i * 2) * (rnd(Math.floor(t / 9) + i, 3) > 0.1 ? 1 : 0.2);
      K.box({ x0: px - 0.04, y0: LAMP_Y - 0.04, x1: px + 0.04, y1: LAMP_Y + 0.04, z0: 0, z1: 2.32, color: '#05070f' });
      K.box({ x0: px - 0.22, y0: LAMP_Y - 0.05, x1: px + 0.22, y1: LAMP_Y + 0.05, z0: 2.26, z1: 2.32, color: '#05070f' });
      K.box({ x0: px - 0.17, y0: LAMP_Y - 0.04, x1: px + 0.17, y1: LAMP_Y + 0.04, z0: 2.22, z1: 2.26, color: lamp > 0.2 ? '#fde68a' : '#6b5d2e', em: lamp > 0.2 });
      halo(K, px, LAMP_Y + 0.05, 2.22, 1.3, '#fde68a', 0.42 * fl * lamp);
      K.floor({ x0: px - 1.5, y0: LAMP_Y - 0.6, x1: px + 1.5, y1: LAMP_Y + 2.2, z: 0.015, img: HALO(), color: '#fde68a', alpha: 0.2 * fl * lamp, em: true });
    });
    // a molecada no alambrado com as lanternas do celular
    if (o.kids !== false) {
      KIDS().forEach((c) => {
        const jump = c.jump ? Math.max(0, Math.sin(t * 0.25 + c.i * 1.7)) * 0.12 : 0;
        K.actor(c.cd, { id: 'kid' + c.i, x: c.x, y: c.y, z: jump, face: [86, 24], frame: 0, dark: true, k: c.k, shadow: 0 });
        if (c.phone) K.sprite(PHONE(), { x: c.x + 0.13, y: c.y + 0.03, z: c.k * 1.02 + jump, w: 0.055, h: 0.075, glow: true, alpha: 0.75 + 0.25 * Math.sin(t * 0.3 + c.i) });
      });
    }
  }

  // ======================================================================
  // CENÁRIO 2 — AS DUAS CASAS (na área vazia, ao lado: dois quartos em corte)
  // ======================================================================
  const ROOM_Y = 27.5; // parede do fundo
  const RA = [83.8, 29.2]; // onde fica A (quarto da esquerda)
  const RB = [88.2, 29.2]; // onde fica B (quarto da direita)
  // papel de parede com listras + rodapé (base de todas as paredes dos quartos)
  const paper = (g, w, h, c0, c1, stripe) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, c0);
    gr.addColorStop(1, c1);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = stripe;
    for (let x = 3; x < w; x += 8) g.fillRect(x, 0, 2, h - 6);
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(0, h - 6, w, 6);
  };
  const WALL_A = lazy(() =>
    mkCv(148, 70, (g, w, h) => {
      paper(g, w, h, '#0c1a44', '#1a3a78', 'rgba(147,197,253,0.07)');
      // janela (a chuva entra pelo overlay)
      g.fillStyle = '#05091c';
      g.fillRect(9, 12, 40, 32);
      g.fillStyle = '#0b1a44';
      g.fillRect(11, 14, 36, 28);
      g.fillStyle = '#05091c';
      g.fillRect(28, 14, 2, 28);
      g.fillRect(11, 27, 36, 2);
      g.fillStyle = 'rgba(191,219,254,0.3)';
      g.fillRect(33, 16, 10, 8);
      // pôster de chuteira
      g.fillStyle = '#020617';
      g.fillRect(83, 11, 24, 30);
      g.fillStyle = '#1e40af';
      g.fillRect(84, 12, 22, 28);
      g.fillStyle = CA;
      g.fillRect(88, 27, 14, 5);
      g.fillStyle = '#e2e8f0';
      g.fillRect(88, 16, 14, 2);
      // prateleira com a bola
      g.fillStyle = '#0a1430';
      g.fillRect(116, 34, 24, 2);
      g.fillStyle = '#e2e8f0';
      g.fillRect(124, 28, 6, 6);
    })
  );
  const WALL_B = lazy(() =>
    mkCv(148, 70, (g, w, h) => {
      paper(g, w, h, '#3a1a08', '#6b3410', 'rgba(253,230,138,0.07)');
      // pôster
      g.fillStyle = '#020617';
      g.fillRect(21, 11, 24, 30);
      g.fillStyle = '#991b1b';
      g.fillRect(22, 12, 22, 28);
      g.fillStyle = CB;
      g.fillRect(26, 16, 14, 14);
      g.fillStyle = '#fde68a';
      g.fillRect(26, 33, 14, 2);
      // prateleira com troféu pequeno e medalhas
      g.fillStyle = '#2b1305';
      g.fillRect(62, 30, 30, 2);
      g.fillStyle = '#fbbf24';
      g.fillRect(70, 23, 5, 7);
      g.fillRect(69, 22, 7, 2);
      g.fillStyle = '#e5e7eb';
      g.fillRect(82, 26, 3, 4);
      // calendário
      g.fillStyle = '#f1f5f9';
      g.fillRect(104, 14, 14, 16);
      g.fillStyle = '#dc2626';
      g.fillRect(104, 14, 14, 4);
    })
  );
  const SIDE_A = lazy(() => mkCv(124, 70, (g, w, h) => paper(g, w, h, '#0a1638', '#14306a', 'rgba(147,197,253,0.06)')));
  const SIDE_B = lazy(() => mkCv(124, 70, (g, w, h) => paper(g, w, h, '#311505', '#5a2b0c', 'rgba(253,230,138,0.06)')));
  // o envelope (fechado com o lacre azul do Blue Lock / aberto)
  const ENV = lazy(() =>
    [0, 1].map((open) =>
      mkCv(26, 22, (g) => {
        const y0 = 6;
        g.fillStyle = '#0b0f19';
        g.fillRect(0, y0, 26, 16);
        g.fillStyle = '#f1f5f9';
        g.fillRect(1, y0 + 1, 24, 14);
        g.fillStyle = '#94a3b8';
        for (let i = 0; i < 12; i++) {
          g.fillRect(1 + i, y0 + 14 - Math.floor(i * 0.6), 1, 1);
          g.fillRect(24 - i, y0 + 14 - Math.floor(i * 0.6), 1, 1);
        }
        if (!open) {
          // a aba fechada (triângulo para baixo) e o lacre
          g.fillStyle = '#cbd5e1';
          for (let r = 0; r < 8; r++) g.fillRect(1 + r * 1.5, y0 + 1 + r, 24 - r * 3, 1);
          g.fillStyle = '#1d4ed8';
          g.fillRect(11, y0 + 5, 4, 4);
        } else {
          // a aba aberta (triângulo para cima) e a carta saindo
          g.fillStyle = '#f8fafc';
          g.fillRect(4, y0 - 2, 18, 6);
          g.fillStyle = '#1d4ed8';
          g.fillRect(4, y0 - 2, 18, 1);
          g.fillStyle = '#e2e8f0';
          for (let r = 0; r < 6; r++) g.fillRect(1 + r * 2, y0 - r, 24 - r * 4, 1);
        }
      })
    )
  );
  function rooms(K, S) {
    const t = S.f;
    K.sky('#02030f', '#0b1030', 0.6);
    K.fog('#03040c', 0.02);
    K.ambient('#9aa6cc');
    K.expo(1.0);
    const LA0 = [0.8, 0.9, 1.25];
    const LB0 = [1.3, 1.0, 0.72];
    // chão (A: azul frio, B: madeira quente)
    K.floor({ x0: 82.3, y0: ROOM_Y, x1: 86, y1: 30.6, z: 0.01, color: '#1d2a4c', light: LA0 });
    K.floor({ x0: 86, y0: ROOM_Y, x1: 89.7, y1: 30.6, z: 0.01, color: '#4a2e18', light: LB0 });
    // paredes do fundo (pintadas), as dos lados e o corte no meio
    K.quad({ x: 84.15, y: ROOM_Y, z: 0, w: 3.7, h: 1.75, ang: plateAng(84.15, ROOM_Y, 84.15, 40), img: WALL_A(), light: [1.0, 1.05, 1.2] });
    K.quad({ x: 87.85, y: ROOM_Y, z: 0, w: 3.7, h: 1.75, ang: plateAng(87.85, ROOM_Y, 87.85, 40), img: WALL_B(), light: [1.2, 1.05, 0.9] });
    K.box({ x0: 82.15, y0: ROOM_Y - 0.1, x1: 82.3, y1: 30.6, z0: 0, z1: 1.75, img: SIDE_A(), light: LA0 });
    K.box({ x0: 89.7, y0: ROOM_Y - 0.1, x1: 89.85, y1: 30.6, z0: 0, z1: 1.75, img: SIDE_B(), light: LB0 });
    K.box({ x0: 85.93, y0: ROOM_Y - 0.1, x1: 86.07, y1: 30.6, z0: 0, z1: 1.95, color: '#0b0f19', light: [0.5, 0.5, 0.5] });
    K.box({ x0: 82.0, y0: ROOM_Y - 0.1, x1: 90.0, y1: 30.6, z0: 1.75, z1: 1.95, color: '#0b0f19', light: [0.5, 0.5, 0.5] });
    // A: o luar entrando pela janela · B: o abajur aceso
    K.floor({ x0: 82.4, y0: ROOM_Y + 0.1, x1: 84.4, y1: 29.6, z: 0.02, img: HALO(), color: '#93c5fd', alpha: 0.22, em: true });
    K.box({ x0: 89.0, y0: 27.75, x1: 89.45, y1: 28.2, z0: 0, z1: 0.42, color: '#2b1305', light: LB0 });
    K.box({ x0: 89.12, y0: 27.88, x1: 89.32, y1: 28.07, z0: 0.42, z1: 0.72, color: '#78350f', light: LB0 });
    K.box({ x0: 89.06, y0: 27.82, x1: 89.38, y1: 28.13, z0: 0.72, z1: 0.86, color: '#fbbf24', em: true });
    halo(K, 89.22, 28.1, 0.8, 1.6, '#fbbf24', 0.36 * (0.9 + 0.1 * Math.sin(t * 0.2)));
    K.floor({ x0: 87.6, y0: ROOM_Y + 0.1, x1: 89.7, y1: 29.8, z: 0.02, img: HALO(), color: '#fbbf24', alpha: 0.26, em: true });
    // cama de A (canto) e escrivaninha com cadeira de B
    K.box({ x0: 82.35, y0: 29.2, x1: 83.05, y1: 30.5, z0: 0, z1: 0.26, color: '#1e3a8a', top: '#3b5bb5', light: LA0 });
    K.box({ x0: 82.38, y0: 29.25, x1: 82.75, y1: 29.55, z0: 0.26, z1: 0.33, color: '#e2e8f0', light: LA0 });
    K.box({ x0: 86.2, y0: 27.6, x1: 87.1, y1: 28.05, z0: 0, z1: 0.4, color: '#4a2a12', top: '#6b3d1a', light: LB0 });
    K.box({ x0: 86.45, y0: 28.2, x1: 86.8, y1: 28.5, z0: 0, z1: 0.24, color: '#2b1305', light: LB0 });
    return { LA0, LB0 };
  }

  // ======================================================================
  // CENÁRIO 3 — O SALÃO / AUDITÓRIO DO PROJETO ELO (o saguão do prédio)
  // ======================================================================
  // o telão do Projeto Elo por cima do telão do saguão (x 23–27 na parede norte)
  const SCR_W = 384;
  const SCR_H = 124;
  let SCR = null;
  function egoScreen(K, S, o = {}) {
    if (!SCR) SCR = mkCv(SCR_W, SCR_H);
    const key = (o.key || 'elo') + '|' + Math.floor(S.f / 3) + '|' + Math.round((o.glasses || 0) * 10);
    const dirty = SCR._key !== key;
    if (dirty) {
      SCR._key = key;
      const g = SCR.getContext('2d');
      const w = SCR_W;
      const h = SCR_H;
      const sh = h - 22;
      const f = S.f;
      g.imageSmoothingEnabled = false;
      g.fillStyle = '#020617';
      g.fillRect(0, 0, w, h);
      g.fillStyle = o.frame || '#1e293b';
      g.fillRect(2, 2, w - 4, sh);
      g.fillStyle = o.screen || '#03120d';
      g.fillRect(5, 5, w - 10, sh - 6);
      g.save();
      g.beginPath();
      g.rect(5, 5, w - 10, sh - 6);
      g.clip();
      const ego = CE.getSpeakerCharData('JINPACHI EGO');
      const size = o.size || 250;
      const eyeY = o.eyeY || 46;
      const u = size / 36;
      if (CE.ptdHead) CE.ptdHead(g, ego, w / 2, eyeY, size, o.rim ? { rim: o.rim, rimD: 3 } : {});
      // os óculos: o brilho passando (ou acesos de vez)
      if (o.glasses) {
        g.fillStyle = `rgba(255,255,255,${0.4 + o.glasses * 0.55})`;
        [-1, 1].forEach((s) => g.fillRect(w / 2 + s * 3.5 * u - 2.4 * u, eyeY - 1.3 * u, 4.8 * u, 2.4 * u));
      } else {
        const glare = 0.5 + 0.5 * Math.sin(f * 0.08);
        g.fillStyle = `rgba(255,255,255,${0.35 + glare * 0.4})`;
        [-1, 1].forEach((s) => g.fillRect(w / 2 + s * 3.5 * u - 2.2 * u, eyeY - 1.1 * u, 1.2 * u, 0.6 * u));
      }
      g.fillStyle = o.tint || 'rgba(0,245,212,0.08)';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.28)';
      for (let yy = 5; yy < sh; yy += 3) g.fillRect(5, yy, w - 10, 1);
      g.fillStyle = o.scan || 'rgba(0,245,212,0.09)';
      g.fillRect(5, 5 + mod(f * 1.6, sh), w - 10, 9);
      if (o.glitch && rnd(Math.floor(f / 4), 3) > 0.7) {
        g.fillStyle = 'rgba(220,38,38,0.3)';
        g.fillRect(5, 5 + rnd(Math.floor(f / 4), 5) * (sh - 12), w - 10, 4);
      }
      g.restore();
      // letreiro embaixo
      g.fillStyle = o.label || '#00f5d4';
      g.font = '900 11px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(o.title || 'PROJETO ELO • TRANSMISSÃO', w / 2, h - 10);
      if (Math.floor(f / 30) % 2) {
        g.fillStyle = '#ef4444';
        g.fillRect(w - 18, 10, 6, 6);
      }
    }
    K.quad({ x: 25, y: 9.04, z: 0.27, w: 3.86, h: 1.27, ang: plateAng(25, 9.04, 25, 20), img: SCR, dirty, em: true });
  }
  // as fileiras de duplas (pares com a pulseira piscando); n = quantas duplas no máximo
  let HALL = null;
  const hall = () => {
    if (HALL) return HALL;
    const cds = people(64, 17, ELO);
    HALL = [];
    let k = 0;
    for (let row = 0; row < 3; row++) {
      const y = 16.0 + row * 1.12;
      for (let i = 0; i < 9; i++) {
        const cx = 18.95 + i * 1.5 + (row % 2) * 0.35;
        if (row === 0 && i === 4) continue; // o lugar dos dois
        if (cx > 31.6) continue;
        const pair = [];
        [-1, 1].forEach((s) => {
          const x = cx + s * 0.22;
          if (y > 16.6 && y < 18.4 && (Math.abs(x - 21.5) < 0.72 || Math.abs(x - 28.5) < 0.72)) return;
          pair.push({ x, s, cd: cds[k++ % cds.length] });
        });
        if (pair.length) HALL.push({ row, y, pair, order: rnd(row * 9 + i, 7) });
      }
    }
    return HALL;
  };
  const YA = [24.58, 16.0];
  const YB = [25.42, 16.0];
  function crowdHall(K, S, o = {}) {
    let i = 0;
    hall().forEach((p, j) => {
      if (o.only && p.order > o.only) return;
      p.pair.forEach((m) => {
        K.actor(m.cd, { id: 'fila' + i, x: m.x, y: p.y, face: [25, 9], frame: 0, k: 0.86, light: o.light });
        wristLed(K, S, m.x + m.s * 0.13, p.y + 0.02, i + j, o.red);
        i++;
      });
    });
  }

  // ======================================================================
  // A PULSEIRA EM CLOSE (a arte de pixel da versão 2D numa placa em 3D)
  // ======================================================================
  const WR = {};
  function wristCv(side, o) {
    if (!CE.duoWristCv) return null;
    const src = CE.duoWristCv(o.skin || '#f3d1b8', o.sleeve || '#111c44', o.open ?? 1, o.lit ?? 0, o.num, o.t || 0, o.glow, side === 'b');
    let c = WR[side];
    if (!c) c = WR[side] = mkCv(src.width, src.height);
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.save();
    if (side === 'b') {
      g.translate(c.width, 0);
      g.scale(-1, 1);
    }
    g.drawImage(src, 0, 0);
    g.restore();
    return c;
  }
  // os dois punhos: base = [x, y, altura] (o meio da cena); ax/bx = onde fica a ponta de
  // cada punho, em px da arte a partir do meio (132 px = 1 ladrilho); a câmera fica no sul
  const WPX = 1 / 132;
  let WRIST_AT = {}; // onde ficaram as pulseiras neste quadro (para o overlay)
  function wrists(K, base, o) {
    const res = {};
    const hgt = 60 * WPX;
    const z = base[2] - hgt * (1 - 32 / 60);
    const place = (side, anchor, opt) => {
      const cv = wristCv(side, opt);
      if (!cv) return;
      // A: manga à esquerda, punho na ponta direita · B: espelhado (punho na ponta esquerda),
      // um tiquinho mais perto da câmera para os dois não brigarem no mesmo plano
      const cx = side === 'a' ? anchor - 66 : anchor + 66;
      const x = base[0] + cx * WPX;
      const y = base[1] + (side === 'b' ? 0.012 : 0);
      K.quad({ x, y, z, w: 132 * WPX, h: hgt, ang: plateAng(x, y, x, y + 5), img: cv, dirty: true, light: opt.light || [1, 1, 1] });
      // onde está a pulseira (para as faíscas e a luz)
      res[side] = [base[0] + (side === 'a' ? anchor - 132 + 85 : anchor + 132 - 85) * WPX, base[1], base[2]];
    };
    place('a', o.ax, o.a);
    if (o.b) place('b', o.bx, o.b);
    WRIST_AT = res;
    return res;
  }

  // ======================================================================
  // OVERLAY — pedaços comuns
  // ======================================================================
  // a tela dividida na diagonal (o jeito das Reações Químicas), por cima do 3D: as duas
  // metades tingidas, linhas de velocidade e o corte com faíscas. cx = onde fica o corte
  function duoCut(ctx, S, cl, cr, o = {}) {
    const { W, H, t, top, bot } = S;
    const cx = o.cx ?? W / 2;
    const cut = [cx + W * 0.06, cx - W * 0.06];
    const L = [[0, 0], [cut[0], 0], [cut[1], H], [0, H]];
    const R = [[cut[0], 0], [W, 0], [W, H], [cut[1], H]];
    const a = o.alpha ?? 0.14;
    ctx.save();
    [[L, cl, 1, 3], [R, cr, -1, 7]].forEach(([pts, col, dir, sd]) => {
      ctx.save();
      poly(ctx, pts);
      ctx.clip();
      ctx.fillStyle = rgba(col, a);
      ctx.fillRect(0, 0, W, H);
      if (CE.ptdSpeed) CE.ptdSpeed(ctx, S, t, col, o.speed ?? 0.12, dir, 22, 14, top, bot, sd);
      ctx.restore();
    });
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(cut[0], 0);
    ctx.lineTo(cut[1], H);
    ctx.stroke();
    ctx.strokeStyle = o.cutColor || '#f8fafc';
    ctx.lineWidth = 5;
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const q = mod(t * 0.02 + i / 8, 1);
      ctx.fillStyle = i % 2 ? cl : cr;
      ctx.fillRect(lerp(cut[0], cut[1], q) - 5 + (i % 2 ? 9 : -9), lerp(0, H, q) - 5, 10, 10);
    }
    ctx.restore();
  }
  const fadeIn = (ctx, S) => {
    if (S.phase === 0 && S.t < 10) CE.cineFlash(ctx, S.W, S.H, 1 - S.t / 10, '#000000');
  };
  const sfx = (S, at, id, fn) => (CE.ptdSfx ? CE.ptdSfx(S, at, id, fn) : CE.cineSfx(S, at, id, fn));
  const word = (ctx, ...a) => CE.ptdWord && CE.ptdWord(ctx, ...a);
  const chip = (ctx, ...a) => CE.ptdChip && CE.ptdChip(ctx, ...a);
  // máscara branca em cima do rosto de um boneco 3D (de frente)
  function maskAt(ctx, K, x, y, z, k, o) {
    const e = eyeOf(K, x, y, z, k);
    if (!e || e.u < 0.8 || !CE.duoMask) return e;
    CE.duoMask(ctx, e.x, e.y + 0.6 * e.u, e.u, o);
    return e;
  }

  // ======================================================================
  // O CHUTE DOS DOIS E O GOL (Ressonância e a final) — no campo
  // ======================================================================
  const FOOT = [53.08, 10.12];
  const GOAL_IN = [53.72, 6.42, 0.62];
  const shotBall = (q) => [lerp(FOOT[0], GOAL_IN[0], q), lerp(FOOT[1], GOAL_IN[1], q), lerp(0.1, GOAL_IN[2], q) + Math.sin(q * Math.PI) * 0.25];
  const SHOT_HIT = 16;
  function shotScene(K, S) {
    const { t } = S;
    const hit = SHOT_HIT;
    const anim = t < hit ? 'windup' : 'shoot';
    duo(K, 'b', ELO, { x: 52.55, y: 10.5, face: [53.4, 6.6], anim, alpha: 0.45 * seg(t, 0, 10), light: [1.65, 0.78, 0.9] });
    duo(K, 'a', ELO, { x: 53.0, y: 10.32, face: [53.4, 6.6], anim, light: LA });
    // a câmera baixa atrás, contra-plongée, tremendo no impacto e virando para a bola
    const sh = t >= hit ? 0.03 * (1 - seg(t, hit, hit + 22)) : 0.004;
    const nx = K.noise(S.f * 3, 1) * sh;
    const nz = K.noise(S.f * 3, 2) * sh;
    const u = easeIn(seg(t, hit + 2, hit + 34));
    const b = shotBall(u);
    const look = K.mix([53.05, 0.5, 9.9], [53.4, 0.55, 8.4], ease(seg(t, hit, hit + 40)));
    K.cam([54.35 + nx, 0.26 + nz, 11.5 - seg(t, hit, hit + 30) * 0.25], look, lerp(46, 42, seg(t, hit, hit + 30)));
    if (t < hit) {
      const q = ease(t / hit);
      K.ball(lerp(51.7, FOOT[0], q), lerp(11.4, FOOT[1], q), 0.06 + Math.sin(q * Math.PI) * 0.45);
    } else K.ball(b[0], b[1], b[2], { glow: true, k: 0.9 });
  }
  function shotOverlay(ctx, S, K, o) {
    const { W, H, t, top } = S;
    const hit = SHOT_HIT;
    // as duas metades (A ciano, B coral) e as linhas de tinta saindo do pé
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = CA;
    poly(ctx, [[0, 0], [W * 0.5, 0], [W * 0.38, H], [0, H]]);
    ctx.fill();
    ctx.fillStyle = CB;
    poly(ctx, [[W * 0.5, 0], [W, 0], [W, H], [W * 0.38, H]]);
    ctx.fill();
    ctx.restore();
    const foot = K.screen(FOOT[0], 0.1, FOOT[1]);
    if (foot && CE.ptdRays) CE.ptdRays(ctx, foot.x, foot.y, W * 1.1, o.ink || '#0b0a14', 0.22 + (t >= hit ? 0.2 * (1 - seg(t, hit, hit + 20)) : 0), t * 0.002, 56, 0.03);
    if (t >= hit - 4 && t < hit + 10 && foot) {
      const sw = seg(t, hit - 4, hit + 10);
      ctx.save();
      ctx.globalAlpha = 1 - sw;
      ctx.lineCap = 'round';
      [[30, CB], [20, CA], [9, '#ffffff']].forEach(([w, col]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.arc(foot.x - 60, foot.y - 26, 130, 2.3, lerp(2.3, 0.35, ease(sw * 1.6)), true);
        ctx.stroke();
      });
      ctx.restore();
    }
    if (t >= hit) {
      if (foot && CE.ptdRings) CE.ptdRings(ctx, foot.x, foot.y, seg(t, hit, hit + 36), [CA, CB, GOLD], 440);
      const u = easeIn(seg(t, hit + 2, hit + 34));
      [[CA, 0], [CB, Math.PI]].forEach(([col, ph]) => {
        const pts = [];
        for (let i = 0; i < 9; i++) {
          const b = shotBall(Math.max(0, u - i * 0.04));
          const p = K.screen(b[0], b[2] + 0.05, b[1]);
          if (p) pts.push({ x: p.x, y: p.y + Math.sin(i * 0.9 + t * 0.6 + ph) * 12 });
        }
        if (CE.ptdStreak) CE.ptdStreak(ctx, pts, col, 40, 0.85);
      });
      const b = shotBall(u);
      const p = K.screen(b[0], b[2] + 0.05, b[1]);
      if (p) CE.cineGlow(ctx, p.x, p.y, 130, rgba(GOLD, 0.8));
      word(ctx, o.shout || 'DOM!!', W * 0.72, top + 110, 104, GOLD, seg(t, hit, hit + 8), 1, -0.15, W * 0.52);
      CE.cineFlash(ctx, W, H, 0.9 * (1 - seg(t, hit, hit + 8)));
    }
  }
  const HIT_T = 80;
  const GOAL_BALL = (z) => [lerp(53.12, 53.72, z), lerp(10.4, 6.3, z), lerp(0.22, 0.52, z)];
  function goalScene(K, S, o) {
    const t = Math.min(S.t, 119);
    const z = easeIO(t / HIT_T);
    const reach = seg(t, 50, 84);
    const kz = Math.sin(reach * Math.PI * 0.8) * 0.32;
    K.actor(o.keeper || 'elo_gk_final', { id: 'gk', x: lerp(53.0, 52.45, ease(reach)), y: 6.95, z: kz, face: [53, 12], anim: reach > 0.1 ? 'dive' : 'idle', left: true, light: [1.1, 1.1, 1.15] });
    // a câmera vem atrás da bola até a boca do gol (e treme quando ela entra)
    const shk = t > HIT_T && t < HIT_T + 16 ? 0.02 : 0.004;
    const nx = K.noise(S.f * 3, 4) * shk;
    K.cam(K.mix([53.0 + nx, 0.5, 11.4], [53.15 + nx, 0.6, 9.75], z), [53.25, 0.48, 6.4], lerp(46, 40, z));
    if (t < HIT_T + 4) {
      const b = GOAL_BALL(Math.min(1, z));
      K.ball(b[0], b[1], b[2], { glow: true, k: 0.9 });
    } else K.ball(53.68, 6.2, 0.1, { glow: true, k: 1.15 });
  }
  function goalOverlay(ctx, S, K, o) {
    const { W, H, top } = S;
    const t = Math.min(S.t, 119);
    const z = easeIO(t / HIT_T);
    if (t < HIT_T + 4) {
      // os dois rastros (ciano e coral) enrolando atrás da bola
      [[CA, 0], [CB, Math.PI]].forEach(([col, ph]) => {
        const tail = [];
        for (let i = 0; i < 9; i++) {
          const b = GOAL_BALL(Math.max(0, z - i * 0.05));
          const p = K.screen(b[0], b[2], b[1]);
          if (p) tail.push({ x: p.x + Math.sin(i * 0.8 - t * 0.35 + ph) * 22, y: p.y + i * 6 });
        }
        if (CE.ptdStreak) CE.ptdStreak(ctx, tail, col, 60, 0.8);
      });
      const b = GOAL_BALL(Math.min(1, z));
      const p = K.screen(b[0], b[2], b[1]);
      if (p) CE.cineGlow(ctx, p.x, p.y, 120, rgba(GOLD, 0.7));
    }
    if (t >= HIT_T) {
      // a bola presa no fundo da rede, acesa
      const pb = K.screen(53.68, 0.18, 6.2);
      if (pb) CE.cineGlow(ctx, pb.x, pb.y, 90, rgba(GOLD, 0.75), 1 - seg(t, HIT_T + 30, HIT_T + 40) * 0.5);
      if (t < HIT_T + 8) CE.cineFlash(ctx, W, H, 1 - (t - HIT_T) / 8, '#ffffff');
      if (CE.duoConfetti) CE.duoConfetti(ctx, S, t - HIT_T, seg(t, HIT_T, HIT_T + 10));
      word(ctx, o.word || 'GOL DO ELO!!', W / 2, top + 100, 96, GOLD, seg(t, HIT_T, HIT_T + 8), 1, -0.05, W * 0.85);
      if (o.sub) chip(ctx, o.sub, W / 2, top + 170, GOLD, seg(t, HIT_T + 14, HIT_T + 26), { size: 16 });
    }
  }
  // a corrida com a aura pelo campo (rumo ao gol norte), com a câmera acompanhando de lado
  const runY = (t, dur) => lerp(19.6, 10.6, t / dur);
  const AURA = { showAura: true, auraColor: GOLD };
  function runScene(K, S) {
    const { t, dur } = S;
    const y = runY(t, dur);
    const bob = (i) => Math.abs(Math.sin(t * 0.5 + i * 2)) * 0.03;
    duo(K, 'a', ELO, { x: 52.7, y: y + 0.65, z: bob(0), ang: -Math.PI / 2, anim: 'run', frame: Math.floor(S.f * 1.3), light: LA, opts: AURA });
    duo(K, 'b', ELO, { x: 53.3, y: y - 0.15, z: bob(1), ang: -Math.PI / 2, anim: 'run', frame: Math.floor(S.f * 1.3) + 3, light: LB, opts: AURA });
    // a bola indo e voltando entre os dois
    const q = (Math.sin(t * 0.2) + 1) / 2;
    K.ball(lerp(52.72, 53.3, q), y - 0.35 + (1 - q) * 0.75, 0.08 + Math.sin(q * Math.PI) * 0.12, { glow: true });
    const n = K.noise(S.f, 6) * 0.03;
    K.cam([50.75, 0.6 + n, y + 0.75], [53.0, 0.48, y - 0.2], 46);
    return y;
  }
  function runOverlay(ctx, S, K) {
    const { t, dur } = S;
    const y = runY(t, dur);
    const q = (Math.sin(t * 0.2) + 1) / 2;
    const a = K.screen(52.75, 0.15, y + 0.45);
    const b = K.screen(53.28, 0.15, y - 0.3);
    if (CE.ptdSpeed) CE.ptdSpeed(ctx, S, t, GOLD, 0.3, -1, 60, 30);
    if (a && b && CE.ptdBolt) CE.ptdBolt(ctx, a.x, a.y, b.x, b.y, GOLD, 0.7, t, 5);
    void q;
  }

  // ======================================================================
  // duo_ponte — A PONTE VELHA
  // ======================================================================
  const PY = 17.6; // a linha do meio da quadra (onde fica a bola)
  reg3d('duo_ponte', {
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
    ],
    letterbox: 0.1,
    grain: 0.05,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, dur } = S;
      if (phase === 0) {
        // MEIA-NOITE: a câmera desce do céu (a lua, a ponte) até a quadra
        const pan = easeIO(seg(t, 0, 110));
        K.cam(K.mix([86, 3.4, 26.0], [86, 0.9, 21.9], pan), K.mix([90, 7.6, 6], [86, 0.6, 16.8], pan), 50);
        street(K, S);
        const walk = ease(seg(t, 70, 150));
        const moving = walk > 0 && walk < 1;
        duo(K, 'a', HOKUTO, { x: lerp(80.4, 85.25, walk), y: PY, ang: 0, anim: moving ? 'run' : 'idle', frame: moving ? Math.floor(S.f * 0.5) : S.f });
        duo(K, 'b', SEIRAN, { x: lerp(91.6, 86.75, walk), y: PY, ang: Math.PI, anim: moving ? 'run' : 'idle', frame: moving ? Math.floor(S.f * 0.5) + 2 : S.f });
        K.ball(86, PY, 0);
        sfx(S, 70, 'passos', () => window.SFX?.whoosh?.());
      } else if (phase === 1) {
        // FRENTE A FRENTE: câmera baixa entre os dois, de lado, chegando perto
        const k = ease(t / 30);
        const n = K.noise(S.f, 3) * 0.006;
        K.cam(K.mix([86, 0.7, 21.8], [86 + n, 0.6, 20.2], k), [86, 0.56, PY], 34);
        street(K, S, { lamp: 0.9 });
        duo(K, 'a', HOKUTO, { x: 85.3, y: PY, ang: 0, light: LA, opts: { expr: 'angry' } });
        duo(K, 'b', SEIRAN, { x: 86.7, y: PY, ang: Math.PI, light: LB, opts: { expr: 'angry' } });
        K.ball(86, PY, 0);
        sfx(S, 42, 'zap', () => window.SFX?.jingle?.([988, 1319], 0, 'square'));
      } else if (phase === 2) {
        const freeze = 62;
        if (t < freeze) {
          // os dois arrancando para a bola, câmera rente ao asfalto
          const run = ease(seg(t, 0, freeze));
          const sh = lerp(0.003, 0.02, t / freeze);
          K.cam([86 + K.noise(S.f * 2, 1) * sh, 0.24 + K.noise(S.f * 2, 2) * sh, 20.3 - run * 0.5], [86, 0.42, PY], lerp(48, 38, easeIn(t / freeze)));
          street(K, S, { lamp: 0.8 });
          duo(K, 'a', HOKUTO, { x: lerp(80.8, 85.5, run), y: PY, ang: 0, anim: 'run', frame: Math.floor(S.f * 1.4), light: LA });
          duo(K, 'b', SEIRAN, { x: lerp(91.2, 86.5, run), y: PY, ang: Math.PI, anim: 'run', frame: Math.floor(S.f * 1.4) + 3, light: LB });
          K.ball(86, PY, 0);
          sfx(S, 2, 'arranque', () => window.SFX?.whoosh?.());
        } else {
          // os três quadros: o roubo, o toque entre os mascarados, a bola na gaiola
          const u = t - freeze;
          const m0 = masked(0);
          const m1 = masked(1);
          const ink = [0.13, 0.12, 0.16];
          if (u < 20) camFrame(K, S, [86.35, 0.42, 20.7], [86.05, 0.4, PY - 0.15], 38, 0.19);
          else if (u < 40) camFrame(K, S, [86.75, 0.55, 19.9], [86.65, 0.45, 16.65], 38, 0.5);
          else camFrame(K, S, [90.9, 0.55, 21.3], [92.45, 0.35, 18.0], 40, 0.82);
          street(K, S, { lamp: 0.55, ambient: '#c08a96', fog: '#1a0306', expo: 0.85, bulgeE: u >= 48 ? Math.sin(seg(u, 48, 70) * Math.PI) : 0 });
          if (u < 20) {
            // o roubo: o pé da máscara branca tirando a bola do meio dos dois
            const q = ease(seg(u, 4, 20));
            duo(K, 'a', HOKUTO, { x: 85.55, y: PY + 0.1, ang: 0, anim: 'dive', light: [0.55, 0.3, 0.35] });
            duo(K, 'b', SEIRAN, { x: 86.6, y: PY + 0.1, ang: Math.PI, anim: 'dive', light: [0.55, 0.3, 0.35] });
            K.actor(m0, { id: 'm0', x: 86.05, y: PY - 0.45, view: 'front', anim: 'rabona', frame: 0, light: ink });
            K.ball(lerp(86.0, 86.9, q), lerp(PY, PY - 0.7, q), Math.sin(q * Math.PI) * 0.45);
          } else if (u < 40) {
            // o toque entre os dois mascarados
            const q = ease(seg(u, 24, 38));
            K.actor(m0, { id: 'm0', x: 86.2, y: 16.9, view: 'front', anim: 'shoot', frame: 0, light: ink });
            K.actor(m1, { id: 'm1', x: 87.15, y: 16.45, z: 0.08, view: 'front', anim: 'run', frame: Math.floor(S.f * 1.2), light: ink });
            K.ball(lerp(86.32, 87.02, q), lerp(16.95, 16.5, q), 0.1 + Math.sin(q * Math.PI) * 0.35, { glow: true });
          } else {
            // a gaiola: a bola estufa a rede (vista de trás da rede)
            const q = ease(seg(u, 40, 50));
            K.actor(m1, { id: 'm1', x: 89.6, y: 17.4, view: 'front', anim: 'shoot', frame: 0, light: ink });
            K.ball(lerp(89.9, 92.75 + Math.sin(seg(u, 48, 70) * Math.PI) * 0.12, q), lerp(17.6, 18.05, q), 0.06 + (1 - q) * 0.2, { glow: true, k: 0.9 });
          }
          sfx(S, freeze, 'roubo', () => window.SFX?.kick?.(0.6));
          sfx(S, freeze + 48, 'gaiola', () => window.SFX?.post?.());
        }
      } else if (phase === 3) {
        if (t < 84) {
          // os mascarados debaixo do poste; os dois no chão, de costas, em primeiro plano
          const e = ease(t / 84);
          K.cam(K.mix([86, 0.55, 21.9], [86, 0.52, 21.2], e), [86, 0.78, 14.8], lerp(42, 38, e));
          street(K, S, { lamp: 0.5, kids: false, expo: 0.78 });
          // o cone de luz do poste do meio em cima dos dois
          K.quad({ x: 86, y: LAMP_Y + 0.35, z: 0, w: 2.0, h: 2.2, ang: camAng(K, 86, LAMP_Y + 0.35), img: CONE(), color: '#fef3c7', alpha: 0.32, em: true });
          [0, 1].forEach((i) => K.actor(masked(i), { id: 'm' + i, x: 85.58 + i * 0.84, y: 14.85, face: [86, 22], frame: 45 + i, light: [0.42, 0.4, 0.42] }));
          duo(K, 'a', HOKUTO, { x: 85.05, y: 19.6, ang: -Math.PI / 2, anim: 'stun', light: [0.4, 0.42, 0.55] });
          duo(K, 'b', SEIRAN, { x: 86.95, y: 19.75, ang: -Math.PI / 2, anim: 'stun', light: [0.4, 0.42, 0.55] });
        } else {
          // close na máscara branca
          const u2 = t - 84;
          const ez = (0.9 * (66 - 2 * M10())) / 66;
          const sh = u2 < 8 ? 0.012 : 0.002;
          K.cam([85.58 + K.noise(S.f * 3, 1) * sh, ez - 0.02, 14.85 + lerp(1.3, 1.5, ease(u2 / 30))], [85.58, ez - 0.04, 14.85], 30);
          street(K, S, { lamp: 0.35, kids: false, expo: 0.7, fog: '#1a0306', ambient: '#a07070' });
          K.actor(masked(0), { id: 'm0', x: 85.58, y: 14.85, face: [86, 22], frame: 45, light: [0.24, 0.2, 0.24] });
          sfx(S, 84, 'mascara', () => window.SFX?.jingle?.([220, 196], 0, 'square'));
        }
      } else {
        // A CARTA: as duas casas, lado a lado em corte; a câmera recua
        const e = easeIO(t / dur);
        K.cam(K.mix([86, 0.8, 33.4], [86, 0.76, 32.95], e), [86, 0.6, 29.0], 42);
        const L = rooms(K, S);
        const ENVs = ENV();
        const flap = ease(seg(t, 24, 40));
        const lit = seg(t, 150, 162);
        duo(K, 'a', CASUAL_A, { x: RA[0], y: RA[1], face: [RA[0] + 0.6, 34], light: lit > 0 ? [0.85, 0.92, 1.25] : L.LA0 });
        duo(K, 'b', CASUAL_B, { x: RB[0], y: RB[1], face: [RB[0] - 0.6, 34], light: lit > 0 ? [1.3, 1.05, 0.8] : L.LB0 });
        K.sprite(ENVs[flap > 0.5 ? 1 : 0], { x: RA[0] + 0.22, y: RA[1] + 0.09, z: 0.22, w: 0.24, h: 0.2, light: [0.95, 1.0, 1.15] });
        K.sprite(ENVs[flap > 0.5 ? 1 : 0], { x: RB[0] - 0.22, y: RB[1] + 0.09, z: 0.22, w: 0.24, h: 0.2, light: [1.15, 1.0, 0.85] });
        sfx(S, 26, 'envelope', () => window.SFX?.click?.());
        sfx(S, 110, 'nenhum', () => window.SFX?.kick?.(0.6));
        sfx(S, 150, 'olhos', () => window.SFX?.jingle?.([523, 784], 0, 'triangle'));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = cast();
      if (phase === 0) {
        CE.cineRain(ctx, W, H, t, 0.12, 80, 0.2);
        CE.cineVignette(ctx, W, H, 0.5);
        CE.cineTitleCard(ctx, W, H * 0.3, seg(t, 120, 140) * (1 - seg(t, 160, 170)), { kicker: 'MEIA-NOITE • FINAL', title: 'TORNEIO DE RUA DA PONTE VELHA', sub: 'Colégio Hokuto  x  Colégio Seiran', color: GOLD });
      } else if (phase === 1) {
        const ea = eyeOf(K, 85.3, PY, 0, 0.9, 1);
        const eb = eyeOf(K, 86.7, PY, 0, 0.9, -1);
        const mid = ea && eb ? (ea.x + eb.x) / 2 : W / 2;
        duoCut(ctx, S, CA, CB, { cx: mid });
        const lit = seg(t, 34, 42);
        const fade = 1 - seg(t, 90, 115) * 0.6;
        if (ea && eb) {
          CE.ptdEyeFlare?.(ctx, ea.x, ea.y, lit * fade, CA, W * 0.5);
          CE.ptdEyeFlare?.(ctx, eb.x, eb.y, lit * fade, CB, W * 0.5);
          const bk = seg(t, 40, 48) * (1 - seg(t, 80, 100));
          CE.ptdBolt?.(ctx, ea.x, ea.y, mid, ea.y - 40, CA, bk, t, 1);
          CE.ptdBolt?.(ctx, mid, ea.y - 40, eb.x, eb.y, CB, bk, t, 2);
          if (bk > 0) CE.cineGlow(ctx, mid, ea.y - 40, 100, 'rgba(255,255,255,0.9)', bk);
        }
        word(ctx, 'VS', W / 2, H * 0.68, 130, '#f8fafc', seg(t, 46, 54), 1, -0.08);
        word(ctx, 'HOKUTO', W * 0.24, bot - 70, 64, CA, seg(t, 54, 62), 1, -0.05);
        word(ctx, 'SEIRAN', W * 0.77, bot - 70, 64, CB, seg(t, 58, 66), 1, -0.05);
        chip(ctx, c.an, W * 0.24, top + 38, CA, seg(t, 14, 26), { size: 17 });
        chip(ctx, c.bn, W * 0.76, top + 38, CB, seg(t, 20, 32), { size: 17 });
      } else if (phase === 2) {
        const freeze = 62;
        if (t < freeze) {
          CE.ptdSpeed?.(ctx, S, t, '#e2e8f0', 0.22, 1, 50, 26);
          // poeira atrás dos dois
          const run = ease(seg(t, 0, freeze));
          const pa = K.screen(lerp(80.8, 85.5, run) - 0.3, 0.05, PY);
          const pb = K.screen(lerp(91.2, 86.5, run) + 0.3, 0.05, PY);
          ctx.fillStyle = 'rgba(203,213,225,0.5)';
          for (let i = 0; i < 10; i++) {
            const a = mod(t * 2 + i * 7, 30);
            if (pa) ctx.fillRect(pa.x - a * 4, pa.y - 6 - a * 0.8 - rnd(i, 3) * 20, 6, 6);
            if (pb) ctx.fillRect(pb.x + a * 4, pb.y - 6 - a * 0.8 - rnd(i, 4) * 20, 6, 6);
          }
          word(ctx, 'MINHA!!', W * 0.26, top + 90, 60, CA, seg(t, 26, 34), 1, -0.1);
          word(ctx, 'MINHA!!', W * 0.74, top + 140, 60, CB, seg(t, 32, 40), 1, 0.1);
        } else {
          const u = t - freeze;
          const i = u < 20 ? 0 : u < 40 ? 1 : 2;
          const pt = u - [0, 20, 40][i];
          // tinta vermelha por cima da cena e as máscaras por cima dos mascarados
          ctx.fillStyle = 'rgba(40,0,8,0.28)';
          ctx.fillRect(0, 0, W, H);
          const k0 = 0.9;
          if (i === 0) maskAt(ctx, K, 86.05, PY - 0.45, 0, k0, { stripe: '#e5e7eb', glow: '#e5e7eb' });
          else if (i === 1) {
            maskAt(ctx, K, 86.2, 16.9, 0, k0, { stripe: '#e5e7eb', glow: '#e5e7eb' });
            maskAt(ctx, K, 87.15, 16.45, 0.08, k0, { stripe: RED, glow: '#ef4444' });
            const p0 = K.screen(86.32, 0.12, 16.95);
            const p1 = K.screen(87.02, 0.35, 16.5);
            if (p0 && p1) CE.ptdBolt?.(ctx, p0.x, p0.y, p1.x, p1.y, RED, seg(pt, 4, 10), pt, 4);
          } else maskAt(ctx, K, 89.6, 17.4, 0, k0, { stripe: RED, glow: '#ef4444' });
          // a página de mangá: os três quadros (o de agora mostra a cena; os outros, tinta)
          const PAN = [
            [[W * 0.02, top + 14], [W * 0.36, top + 14], [W * 0.31, bot - 14], [W * 0.02, bot - 14]],
            [[W * 0.38, top + 14], [W * 0.68, top + 14], [W * 0.63, bot - 14], [W * 0.33, bot - 14]],
            [[W * 0.7, top + 14], [W * 0.98, top + 14], [W * 0.98, bot - 14], [W * 0.65, bot - 14]]
          ];
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, W, H);
          PAN[i].forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          ctx.fillStyle = '#05030a';
          ctx.fill('evenodd');
          PAN.forEach((p, j) => {
            if (j > i) return;
            if (j < i) {
              poly(ctx, p);
              ctx.fillStyle = '#1a0306';
              ctx.fill();
              ctx.save();
              poly(ctx, p);
              ctx.clip();
              const cx = (p[0][0] + p[2][0]) / 2;
              CE.ptdRays?.(ctx, cx, H * 0.5, W * 0.5, RED, 0.25, t * 0.004, 26);
              word(ctx, j === 0 ? 'TOC.' : '!!', cx, H * 0.5, 54, '#f8fafc', 1, 0.8, -0.1);
              ctx.restore();
            }
            poly(ctx, p);
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 6;
            ctx.stroke();
          });
          ctx.restore();
          const cx = [W * 0.18, W * 0.5, W * 0.82][i];
          if (i === 0) word(ctx, 'TOC.', cx, top + 90, 54, '#f8fafc', seg(pt, 6, 12), 1, -0.1);
          if (i === 2) word(ctx, 'GOL.', cx, bot - 80, 70, '#f8fafc', seg(pt, 10, 18), 1, -0.06);
          if (u < 6) CE.cineFlash(ctx, W, H, 1 - u / 6, '#ffffff');
        }
      } else if (phase === 3) {
        if (t < 84) {
          [0, 1].forEach((i) => maskAt(ctx, K, 85.58 + i * 0.84, 14.85, 0, 0.9, { stripe: i ? RED : '#e5e7eb', glow: t > 40 ? (i ? '#ef4444' : '#e5e7eb') : null }));
          CE.cineRain(ctx, W, H, t, 0.15, 90, 0.2);
          chip(ctx, '??? & ???', W / 2, top + 40, RED, seg(t, 14, 26), { size: 18 });
        } else {
          const u2 = t - 84;
          const e = eyeOf(K, 85.58, 14.85, 0, 0.9);
          // tinta vermelha em volta (o papel preto da versão 2D)
          ctx.save();
          ctx.fillStyle = 'rgba(42,3,8,0.45)';
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
          if (e) CE.ptdRays?.(ctx, e.x, e.y, W * 1.1, '#2a0308', 0.55, u2 * 0.003, 56, 0.03);
          CE.cineVignette(ctx, W, H, 0.7, '20,0,0');
          maskAt(ctx, K, 85.58, 14.85, 0, 0.9, { stripe: RED, glow: '#ffffff' });
          if (u2 < 6) CE.cineFlash(ctx, W, H, 1 - u2 / 6, '#ffffff');
          word(ctx, 'SÓ BARULHO.', W / 2, bot - 76, 70, '#f8fafc', seg(u2, 20, 28), 1, -0.03, W * 0.7);
        }
      } else {
        // a chuva na janela de A
        const w0 = K.screen(82.53, 1.45, ROOM_Y + 0.02);
        const w1 = K.screen(83.52, 0.66, ROOM_Y + 0.02);
        if (w0 && w1) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(w0.x, w0.y, w1.x - w0.x, w1.y - w0.y);
          ctx.clip();
          CE.cineRain(ctx, W, H, t, 0.45, 60, 0.15);
          ctx.restore();
        }
        // os olhos dos dois acendem (dourado)
        const lit = seg(t, 150, 162);
        if (lit > 0) {
          const ea = eyeOf(K, RA[0], RA[1]);
          const eb = eyeOf(K, RB[0], RB[1]);
          if (ea) CE.ptdEyeFlare?.(ctx, ea.x + 3.5 * ea.u, ea.y, lit, GOLD, W * 0.3);
          if (eb) CE.ptdEyeFlare?.(ctx, eb.x - 3.5 * eb.u, eb.y, lit, GOLD, W * 0.3);
        }
        // a carta subindo no meio
        const ck = ease(seg(t, 40, 70));
        if (ck > 0) {
          const cw = Math.min(540, W * 0.4);
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
            ctx.fillText(CE.cineType(ln, lk), 0, -chh / 2 + 98 + i * 56);
          });
          // o símbolo do Elo (duas argolas) carimbado no canto
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
      }
      fadeIn(ctx, S);
    }
  });

  // ======================================================================
  // duo_elo — O ELO SE FECHA
  // ======================================================================
  const ELO_W = [25, 11.6, 0.8]; // onde ficam os punhos no close da pulseira
  const CH_A = [24.25, 10.75];
  const CH_B = [25.75, 10.75];
  reg3d('duo_elo', {
    phases: [150, 140, 140],
    music: 'mystery',
    title: '🔗 O ELO SE FECHA',
    tags: ['PLANO 1 • O SALÃO', 'PLANO 2 • A PULSEIRA', 'PLANO 3 • PRESOS'],
    subs: [
      [{ from: 30, who: 'ANRI TEIERI', text: 'Trinta duplas. Uma pulseira para cada um.', color: '#38bdf8' }],
      [{ from: 50, who: 'ANRI TEIERI', text: 'Elo ativado. A partir de agora, o ranking é da dupla.', color: '#38bdf8' }],
      [{ from: 20, who: 'JINPACHI EGO', text: '"Se um cair... os dois caem."', color: '#00f5d4' }]
    ],
    letterbox: 0.1,
    grain: 0.05,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, dur } = S;
      K.expo(0.85);
      egoScreen(K, S, {});
      if (phase === 0) {
        // O SALÃO: grua por cima das fileiras de duplas até os dois, de costas
        const e = easeIO(t / dur);
        K.cam(K.mix([25, 1.6, 20.8], [25, 1.42, 18.7], e), [25, 0.72, 10.2], 52);
        crowdHall(K, S);
        duo(K, 'a', ELO, { x: YA[0], y: YA[1], face: [25, 9], light: LA, k: 0.88 });
        duo(K, 'b', ELO, { x: YB[0], y: YB[1], face: [25, 9], light: LB, k: 0.88 });
        sfx(S, 10, 'salao', () => window.SFX?.jingle?.([196, 262], 0, 'triangle'));
      } else if (phase === 1) {
        // A PULSEIRA: o pulso em close, o telão com o Ego atrás
        const c = cast();
        const shut = ease(seg(t, 30, 38));
        const lit = Math.floor(clamp((t - 44) / 30) * 5);
        const slideB = ease(seg(t, 70, 96));
        const bump = t >= 96;
        const sh = t > 36 && t < 46 ? 0.012 : bump && t < 104 ? 0.016 : 0.002;
        const z = lerp(1.08, 1, ease(t / 40));
        K.cam([25 + K.noise(S.f * 3, 1) * sh, ELO_W[2] + 0.02 + K.noise(S.f * 3, 2) * sh, ELO_W[1] + 1.28 / z], [25, ELO_W[2] - 0.02, ELO_W[1]], 40);
        wrists(K, ELO_W, {
          ax: lerp(50, 8, slideB),
          bx: lerp(228, -8, slideB),
          a: { skin: c.a.skinColor, sleeve: '#111c44', open: shut, lit, num: 27, t, glow: GOLD },
          b: slideB > 0 ? { skin: c.b.skinColor, sleeve: '#111c44', open: 1, lit: 5, num: 27, t, glow: GOLD } : null
        });
        sfx(S, 36, 'clack', () => window.SFX?.kick?.(0.8));
        sfx(S, 46, 'led', () => window.SFX?.jingle?.([523, 659, 784, 988, 1175], 0, 'square'));
        sfx(S, 96, 'soquinho', () => window.SFX?.kick?.(0.5));
      } else {
        // PRESOS: os dois de cara feia, a corrente de luz entre os pulsos
        const e = easeIO(t / dur);
        K.cam(K.mix([24.6, 0.4, 13.05], [25.5, 0.46, 12.95], e), [25, 0.55, CH_A[1]], 40);
        duo(K, 'a', ELO, { x: CH_A[0], y: CH_A[1], ang: 0, light: LA, opts: { expr: 'angry' } });
        duo(K, 'b', ELO, { x: CH_B[0], y: CH_B[1], ang: Math.PI, light: LB, opts: { expr: 'angry' } });
        chain3d(K, [CH_A[0] + 0.12, CH_A[1] + 0.02, 0.36], [CH_B[0] - 0.12, CH_B[1] + 0.02, 0.36], t, seg(t, 14, 40));
        sfx(S, 80, 'caem', () => window.SFX?.jingle?.([196, 147], 0, 'sawtooth'));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = cast();
      if (phase === 0) {
        CE.cineShafts(ctx, W * 0.15, top - 10, Math.PI * 0.35, H, 0.25, 3, '191,219,254', 0.06, t);
        CE.cineShafts(ctx, W * 0.85, top - 10, Math.PI * 0.65, H, 0.25, 3, '191,219,254', 0.06, t);
        chip(ctx, 'PROJETO ELO • 30 DUPLAS • 60 ATACANTES', W / 2, top + 40, GOLD, seg(t, 20, 34), { size: 16 });
      } else if (phase === 1) {
        const w = WRIST_AT;
        const pa = w.a ? K.screen(w.a[0], w.a[2], w.a[1]) : null;
        const mid = K.screen(ELO_W[0], ELO_W[2], ELO_W[1]);
        const bump = t >= 96;
        if (bump && mid) {
          CE.ptdRings?.(ctx, mid.x, mid.y, seg(t, 96, 124), [GOLD, CA, CB], 420);
          CE.cineGlow(ctx, mid.x, mid.y, 220, 'rgba(253,224,71,0.6)', 1 - seg(t, 96, 130));
        }
        if (bump && t < 102) CE.cineFlash(ctx, W, H, 1 - (t - 96) / 6, '#fde047');
        word(ctx, 'TOC.', W * 0.5, top + 80, 70, GOLD, seg(t, 96, 102), 1, 0.06);
        if (t > 36 && t < 42) CE.cineFlash(ctx, W, H, 1 - (t - 36) / 6, '#ffffff');
        // faíscas da trava
        if (t > 36 && t < 60 && pa) {
          ctx.fillStyle = GOLD;
          for (let i = 0; i < 14; i++) {
            const q = (t - 36) / 24;
            const ang = rnd(i, 3) * TAU;
            ctx.fillRect(pa.x + Math.cos(ang) * q * 200, pa.y + Math.sin(ang) * q * 140, 8, 8);
          }
        }
        if (pa && t > 44) CE.cineGlow(ctx, pa.x, pa.y - 20, 90, 'rgba(253,224,71,0.35)', 1);
        word(ctx, 'CLACK', W * 0.3, top + 90, 96, '#f8fafc', seg(t, 36, 44), 1 - seg(t, 80, 92), -0.08);
        const lit = Math.floor(clamp((t - 44) / 30) * 5);
        if (lit >= 5) chip(ctx, `DUPLA 27 • ${c.an} + ${c.bn}`, W / 2, bot - 46, GOLD, seg(t, 76, 88), { size: 16 });
      } else {
        const ea = eyeOf(K, CH_A[0], CH_A[1], 0, 0.9, 1);
        const eb = eyeOf(K, CH_B[0], CH_B[1], 0, 0.9, -1);
        duoCut(ctx, S, CA, CB, { cx: ea && eb ? (ea.x + eb.x) / 2 : W / 2, cutColor: GOLD, alpha: 0.12 });
        word(ctx, 'SE UM CAIR...', W / 2, top + 80, 58, '#f8fafc', seg(t, 46, 56), 1, -0.03);
        word(ctx, '...OS DOIS CAEM.', W / 2, top + 150, 64, RED, seg(t, 80, 90), 1, 0.03);
      }
      fadeIn(ctx, S);
    }
  });

  // ======================================================================
  // duo_ressonancia — RESSONÂNCIA / ATAQUE DE DUPLA (no campo)
  // ======================================================================
  const HA = [53.4, 13.0];
  const HB = [52.6, 13.0];
  const DEF = [[20, 0.9], [44, -1], [66, 1]]; // [quando é derrubado, para que lado voa]
  reg3d('duo_ressonancia', {
    phases: [110, 110, 90, 120],
    music: 'epic',
    title: '🔗 RESSONÂNCIA',
    tags: ['PLANO 1 • NO MESMO SEGUNDO', 'PLANO 2 • RESSONÂNCIA', 'PLANO 3 • ATAQUE DE DUPLA', 'PLANO 4 • GOL DO ELO'],
    subs: [[{ from: 14, who: 'NARRADOR', text: 'Os dois corações batem no mesmo segundo. As pulseiras disparam.', color: '#fde047' }], [], [], []],
    letterbox: 0.1,
    grain: 0.05,
    // na partida, o estádio com as cores da partida
    get theme() {
      return window.MatchEngine?.active && CE.ptdTheme ? CE.ptdTheme('bluelock_holo') : 'bluelock_holo';
    },
    scene(K, S) {
      const { t, phase, dur } = S;
      if (phase === 0) {
        // NO MESMO SEGUNDO: os dois parados, de frente, a câmera girando devagar
        const e = easeIO(t / dur);
        const sync = seg(t, 40, 52);
        K.cam(K.mix([53.5, 0.52, 10.45], [52.55, 0.58, 10.65], e), [53, 0.6, 13.0], 38);
        const l = sync > 0.5 ? [1.4, 1.35, 1.0] : null;
        duo(K, 'a', ELO, { x: HA[0], y: HA[1], face: [53, 8], light: l || LA });
        duo(K, 'b', ELO, { x: HB[0], y: HB[1], face: [53, 8], light: l || LB });
        sfx(S, 52, 'reso', () => window.SFX?.jingle?.([523, 659, 784, 1047], 0, 'square'));
      } else if (phase === 1) {
        // RESSONÂNCIA: a corrida com a aura dourada derrubando a marcação
        const y0 = runScene(K, S);
        DEF.forEach(([at, side], i) => {
          const dy = runY(at, dur) - 0.35;
          const hit = t > at;
          const q = ease(seg(t, at, at + 26));
          K.actor('elo_gen_b', { id: 'def' + i, extra: { jerseyPrimary: '#334155', jerseySecondary: '#94a3b8' }, x: 53.0 + side * q * 1.3, y: dy - q * 0.9, z: hit ? Math.sin(q * Math.PI) * 0.5 : 0, face: [53, 22], anim: hit ? 'dive' : 'idle', left: side < 0 });
        });
        void y0;
        sfx(S, 20, 'bam', () => window.SFX?.tackle?.());
      } else if (phase === 2) {
        shotScene(K, S);
        sfx(S, SHOT_HIT, 'chute', () => window.SFX?.kick?.(1));
      } else {
        const keeper = window.MatchEngine?.active ? window.MatchEngine.entities?.find((e) => e.team === 'away' && e.isGK)?.charData : null;
        goalScene(K, S, { keeper });
        sfx(S, HIT_T, 'rede', () => window.SFX?.goal?.(true));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot, dur } = S;
      if (phase === 0) {
        const sync = seg(t, 40, 52);
        const ea = eyeOf(K, HA[0], HA[1]);
        const eb = eyeOf(K, HB[0], HB[1]);
        duoCut(ctx, S, CA, CB, { cx: ea && eb ? (ea.x + eb.x) / 2 : W / 2, cutColor: sync > 0 ? GOLD : '#f8fafc', alpha: 0.12 });
        // eletro: cada um vem do seu lado, fora de ritmo; depois batem juntos
        const y = top + 70;
        CE.duoHeart?.(ctx, 0, W / 2, y, t, sync > 0.5 ? GOLD : CA, 1, 30, 0, 50);
        CE.duoHeart?.(ctx, W, W / 2, y, t, sync > 0.5 ? GOLD : CB, 1, 30, sync > 0.5 ? 0 : 13, 50);
        if (sync > 0) {
          const pulse = mod(t, 30) < 4 ? 1 : 0;
          CE.cineGlow(ctx, W / 2, y, 140 + pulse * 60, 'rgba(253,224,71,0.6)', sync);
          word(ctx, 'TUM-TUM', W / 2, y + 60, 40, GOLD, sync, 1, -0.04);
          if (ea && eb) {
            CE.ptdEyeFlare?.(ctx, ea.x + 3.5 * ea.u, ea.y, sync, GOLD, W * 0.3);
            CE.ptdEyeFlare?.(ctx, eb.x - 3.5 * eb.u, eb.y, sync, GOLD, W * 0.3);
          }
        }
        if (t > 52 && t < 58) CE.cineFlash(ctx, W, H, 1 - (t - 52) / 6, '#fde047');
        word(ctx, 'NO MESMO SEGUNDO', W / 2, bot - 64, 58, '#f8fafc', seg(t, 58, 68), 1, -0.03, W * 0.8);
      } else if (phase === 1) {
        runOverlay(ctx, S, K);
        DEF.forEach(([at, side], i) => {
          if (t <= at) return;
          const p = K.screen(53.0, 1.0, runY(at, dur) - 0.35);
          if (p) word(ctx, ['BAM!', 'DOM!', 'VUSH!'][i], p.x, p.y - 30, 44, '#f8fafc', seg(t, at, at + 6), 1 - seg(t, at + 22, at + 30), -0.08 * side);
        });
        word(ctx, 'RESSONÂNCIA', W / 2, top + 76, 88, GOLD, seg(t, 6, 18), 1, -0.04, W * 0.84);
      } else if (phase === 2) {
        shotOverlay(ctx, S, K, { shout: 'ATAQUE DE DUPLA!!' });
      } else {
        goalOverlay(ctx, S, K, { word: 'GOL DO ELO!!' });
      }
      fadeIn(ctx, S);
    }
  });

  // ======================================================================
  // duo_regra — A REGRA DO UM (o auditório vermelho)
  // ======================================================================
  const RED_SCR = { key: 'regra', frame: '#3f0a0a', screen: '#140306', tint: 'rgba(239,68,68,0.12)', scan: 'rgba(239,68,68,0.1)', label: '#ef4444', title: 'AUDITÓRIO • RESTAM 12 DUPLAS', glitch: true };
  function redHall(K) {
    K.ambient('#ffb4b4');
    K.fog('#2a0508', 0.05);
    K.expo(0.72);
  }
  reg3d('duo_regra', {
    phases: [150, 110, 160],
    music: 'dread',
    title: '⚖️ A REGRA DO UM',
    tags: ['PLANO 1 • O AUDITÓRIO', 'PLANO 2 • UM.', 'PLANO 3 • A CORRENTE RACHA'],
    subs: [
      [{ from: 20, who: 'NARRADOR', text: 'Auditório do Projeto Elo. Restam doze duplas.', color: '#cbd5e1' }],
      [{ from: 14, who: 'JINPACHI EGO', text: '"A Sub-20 vai levar UM atacante do Projeto Elo. Um."', color: '#ef4444' }],
      [{ from: 30, who: 'NARRADOR', text: 'A corrente entre os dois racha. Agora cada um tem o seu número.', color: '#cbd5e1' }]
    ],
    letterbox: 0.1,
    grain: 0.05,
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase, dur } = S;
      redHall(K);
      const RL = [1.25, 0.72, 0.72];
      if (phase === 0) {
        // O AUDITÓRIO: a câmera passa por cima das doze duplas e entra no telão
        egoScreen(K, S, RED_SCR);
        const z = easeIO(seg(t, 20, 140));
        K.cam(K.mix([25, 1.58, 20.7], [25, 0.95, 10.7], z), K.mix([25, 0.78, 10.0], [25, 0.92, 9.0], z), lerp(52, 40, z));
        crowdHall(K, S, { only: 0.48, light: RL, red: true });
        duo(K, 'a', ELO, { x: YA[0], y: YA[1], face: [25, 9], light: [1.2, 1.0, 1.15], k: 0.88 });
        duo(K, 'b', ELO, { x: YB[0], y: YB[1], face: [25, 9], light: [1.35, 0.9, 0.95], k: 0.88 });
        sfx(S, 30, 'zoom', () => window.SFX?.whoosh?.());
      } else if (phase === 1) {
        // UM.: o rosto do Ego no telão, visto de baixo; os óculos acendem
        egoScreen(K, S, Object.assign({}, RED_SCR, { key: 'um', size: 380, eyeY: 50, rim: RED, glasses: seg(t, 10, 18), glitch: false, title: 'PROJETO ELO • A REGRA DO UM' }));
        const sh = t < 10 ? 0.01 : 0.002;
        K.cam([25.55 + K.noise(S.f * 3, 1) * sh, 0.3, 11.5 - ease(t / 30) * 0.2], [25.0, 1.02, 9.0], 46);
        sfx(S, 30, 'um', () => window.SFX?.kick?.(1));
      } else {
        // A CORRENTE RACHA
        egoScreen(K, S, RED_SCR);
        const e = easeIO(t / dur);
        const brk = ease(seg(t, 40, 80));
        K.cam(K.mix([25.5, 0.44, 13.0], [24.6, 0.4, 13.05], e), [25, 0.55, CH_A[1]], 40);
        duo(K, 'a', ELO, { x: CH_A[0], y: CH_A[1], ang: 0, light: [1.1, 1.05, 1.25] });
        duo(K, 'b', ELO, { x: CH_B[0], y: CH_B[1], ang: Math.PI, light: [1.4, 0.95, 1.0] });
        chain3d(K, [CH_A[0] + 0.12, CH_A[1] + 0.02, 0.36], [CH_B[0] - 0.12, CH_B[1] + 0.02, 0.36], t, 1, brk);
        sfx(S, 40, 'racha', () => window.SFX?.tackle?.());
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      // o salão inteiro puxado para o vermelho (multiplicar é barato, sem filtro)
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(255,110,110,${phase === 1 ? 0.3 : 0.5})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      if (phase === 0) {
        CE.cineShafts(ctx, W * 0.15, top - 10, Math.PI * 0.35, H, 0.25, 3, '254,202,202', 0.06, t);
        CE.cineShafts(ctx, W * 0.85, top - 10, Math.PI * 0.65, H, 0.25, 3, '254,202,202', 0.06, t);
        CE.cineVignette(ctx, W, H, 0.6, '20,0,0');
      } else if (phase === 1) {
        const p = K.screen(25, 1.0, 9.05);
        if (p) CE.ptdRays?.(ctx, p.x, p.y, W * 1.1, RED, 0.14, t * 0.003, 56, 0.03);
        CE.cineVignette(ctx, W, H, 0.6, '20,0,0');
        word(ctx, 'UM.', W * 0.76, H * 0.5, 220, RED, seg(t, 30, 38), 1, -0.08);
        chip(ctx, 'A SUB-20 LEVA UM ATACANTE DO PROJETO', W * 0.7, bot - 50, RED, seg(t, 50, 64), { size: 15 });
      } else {
        const brk = ease(seg(t, 40, 80));
        const ea = eyeOf(K, CH_A[0], CH_A[1], 0, 0.9, 1);
        const eb = eyeOf(K, CH_B[0], CH_B[1], 0, 0.9, -1);
        duoCut(ctx, S, CA, CB, { cx: ea && eb ? (ea.x + eb.x) / 2 : W / 2, cutColor: brk > 0.5 ? RED : GOLD, alpha: 0.12 });
        if (t > 40 && t < 48) CE.cineFlash(ctx, W, H, 1 - (t - 40) / 8, '#ef4444');
        // o contador de gols de cada um (girando) e a gota de suor
        const spin = (s) => (t < 90 ? Math.floor(rnd(Math.floor(t / 3), s) * 10) : 0);
        [[ea, CA, 1, -1], [eb, CB, 2, 1]].forEach(([e, col, s, side]) => {
          if (!e) return;
          if (brk > 0.2) {
            const x = e.x + side * 26 * e.u;
            const y = e.y + 8 * e.u;
            ctx.fillStyle = '#020617';
            ctx.fillRect(x - 60, y, 120, 70);
            ctx.strokeStyle = col;
            ctx.lineWidth = 4;
            ctx.strokeRect(x - 60, y, 120, 70);
            ctx.fillStyle = col;
            ctx.font = 'italic 900 44px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(String(spin(s)), x, y + 50);
            ctx.font = '900 11px "Segoe UI", sans-serif';
            ctx.fillText('GOLS', x, y + 64);
          }
          const d = seg(t, 90, 130) * 3 * e.u;
          const x = e.x - side * 5 * e.u;
          const y = e.y - 4 * e.u + d;
          ctx.fillStyle = '#bae6fd';
          ctx.strokeStyle = '#0c4a6e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, y - 20);
          ctx.quadraticCurveTo(x + 14, y + 6, x, y + 12);
          ctx.quadraticCurveTo(x - 14, y + 6, x, y - 20);
          ctx.fill();
          ctx.stroke();
        });
        chip(ctx, 'O ELO CONTA OS GOLS DE CADA UM', W / 2, bot - 46, RED, seg(t, 100, 114), { size: 16 });
      }
      fadeIn(ctx, S);
    }
  });

  // ======================================================================
  // duo_mascaras — AS MÁSCARAS CAEM (o túnel do estádio)
  // ======================================================================
  const TUN = { y: 14.5, door: 44.5 };
  const MK_Y = [14.18, 14.82];
  reg3d('duo_mascaras', {
    phases: [150, 110, 160],
    music: 'mystery',
    title: '🎭 AS MÁSCARAS CAEM',
    tags: ['PLANO 1 • O TÚNEL', 'PLANO 2 • A RACHADURA', 'PLANO 3 • OS ROSTOS'],
    subs: [
      [{ from: 30, who: 'NARRADOR', text: 'No fim do túnel, as duas máscaras brancas esperando.', color: '#cbd5e1' }],
      [],
      [{ from: 60, who: 'NARRADOR', text: 'Shion Mikami e Haru Ibuki. A primeira dupla do Projeto Elo.', color: '#e5e7eb' }]
    ],
    letterbox: 0.1,
    grain: 0.05,
    theme: 'worldcup_england',
    scene(K, S) {
      const { t, phase } = S;
      K.expo(0.8);
      const DIM = [0.36, 0.36, 0.42];
      if (phase === 0) {
        // O TÚNEL: os dois mascarados vindo da luz do campo até a câmera
        const walk = ease(seg(t, 0, 130));
        K.cam([34.7, 0.78, TUN.y + K.noise(S.f, 2) * 0.01], [44, 0.7, TUN.y], 44);
        [0, 1].forEach((i) => {
          const moving = walk < 1;
          K.actor(masked(i), { id: 'm' + i, x: lerp(42.6, 36.9, walk), y: lerp(TUN.y + (i ? 0.18 : -0.18), MK_Y[i], walk), ang: Math.PI, anim: moving ? 'run' : 'idle', frame: moving ? Math.floor(S.f * 0.35) + i * 3 : 45 + i, light: DIM });
        });
        [30, 62, 94, 126].forEach((at, i) => sfx(S, at, 'passo' + i, () => window.SFX?.click?.()));
      } else if (phase === 1) {
        // A RACHADURA: close na máscara branca
        const ez = (0.9 * (66 - 2 * M10())) / 66;
        const crack = ease(seg(t, 12, 70));
        const sh = crack > 0 && crack < 1 ? 0.006 : 0.001;
        const zoom = seg(t, 0, 110) * 0.08;
        K.cam([36.9 - 2.5 + zoom, ez - 0.03 + K.noise(S.f * 3, 2) * sh, MK_Y[0] + K.noise(S.f * 3, 1) * sh], [36.9, ez - 0.12, MK_Y[0]], 30);
        K.actor(masked(0), { id: 'm0', x: 36.9, y: MK_Y[0], ang: Math.PI, frame: 45, light: [0.22, 0.22, 0.27] });
        sfx(S, 14, 'crac', () => window.SFX?.tackle?.());
      } else {
        // OS ROSTOS: Shion e Haru sem máscara, contra a luz do campo
        const k = ease(t / 26);
        const lit = seg(t, 60, 70);
        K.cam(K.mix([37.0, 0.36, TUN.y], [37.5, 0.4, TUN.y], k), [39.6, 0.66, TUN.y], 40);
        const L = lit > 0 ? [0.75, 0.75, 0.85] : [0.5, 0.5, 0.58];
        K.actor('elo_shion', { id: 'sh', extra: SHION_KIT, x: 39.6, y: MK_Y[0], ang: Math.PI, light: L });
        K.actor('elo_haru', { id: 'ha', extra: HARU_KIT, x: 39.6, y: MK_Y[1], ang: Math.PI, light: L });
        sfx(S, 20, 'cai', () => window.SFX?.click?.());
        sfx(S, 60, 'olhos', () => window.SFX?.jingle?.([392, 523], 0, 'triangle'));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const door = K.screen(TUN.door, 0.7, TUN.y);
      if (door) CE.cineGlow(ctx, door.x, door.y, W * 0.3, 'rgba(226,232,240,0.35)', phase === 1 ? 0.4 : 1);
      if (phase === 0) {
        const walk = ease(seg(t, 0, 130));
        [0, 1].forEach((i) => maskAt(ctx, K, lerp(42.6, 36.9, walk), lerp(TUN.y + (i ? 0.18 : -0.18), MK_Y[i], walk), 0, 0.9, { stripe: i ? RED : '#e5e7eb', glow: t > 70 ? (i ? '#ef4444' : '#e5e7eb') : null }));
        chip(ctx, 'TÚNEL DO ESTÁDIO • LISBOA', W / 2, top + 40, '#e5e7eb', seg(t, 10, 22), { size: 15 });
      } else if (phase === 1) {
        const crack = ease(seg(t, 12, 70));
        CE.cineVignette(ctx, W, H, 0.65);
        const e = maskAt(ctx, K, 36.9, MK_Y[0], 0, 0.9, { stripe: '#e5e7eb', glow: '#ffffff', crack, seed: 5 });
        // lascas caindo
        if (crack > 0.5 && e) {
          ctx.fillStyle = '#e2e8f0';
          for (let i = 0; i < 16; i++) {
            const q = mod(t * 0.02 + rnd(i, 3), 1);
            ctx.fillRect(e.x + (rnd(i, 4) - 0.5) * 260, e.y - 40 + q * 400, 10 + (i % 3) * 6, 10 + (i % 2) * 6);
          }
        }
        word(ctx, 'CRAC', W * 0.78, H * 0.3, 80, '#f8fafc', seg(t, 14, 22), 1 - seg(t, 60, 70), 0.1);
      } else {
        const lit = seg(t, 60, 70);
        const es = eyeOf(K, 39.6, MK_Y[0]);
        const eh = eyeOf(K, 39.6, MK_Y[1]);
        duoCut(ctx, S, '#e5e7eb', '#ef4444', { cx: es && eh ? (es.x + eh.x) / 2 : W / 2, cutColor: '#e5e7eb', alpha: 0.1 });
        // as máscaras caindo dos rostos (rachadas)
        [es, eh].forEach((e, side) => {
          if (!e || !CE.duoMask) return;
          const fall = easeIn(seg(t, 20 + side * 10, 60 + side * 10));
          if (fall >= 1) return;
          ctx.save();
          ctx.globalAlpha = 1 - fall;
          ctx.translate(e.x + (side ? -3 : 3) * fall * 30, e.y + 0.6 * e.u + fall * 360);
          ctx.rotate((side ? 1 : -1) * fall * 1.3);
          CE.duoMask(ctx, 0, 0, e.u, { stripe: side ? RED : '#e5e7eb', crack: 0.6 });
          ctx.restore();
        });
        if (es) CE.ptdEyeFlare?.(ctx, es.x + 3.5 * es.u, es.y, lit, '#ffffff', W * 0.4);
        if (eh) CE.ptdEyeFlare?.(ctx, eh.x - 3.5 * eh.u, eh.y, lit, '#ef4444', W * 0.4);
        chip(ctx, 'SHION MIKAMI', W * 0.24, top + 38, '#e5e7eb', seg(t, 70, 84), { size: 17 });
        chip(ctx, 'HARU IBUKI', W * 0.76, top + 38, '#ef4444', seg(t, 78, 92), { size: 17 });
        word(ctx, 'A PRIMEIRA DUPLA', W / 2, bot - 70, 60, '#f8fafc', seg(t, 100, 112), 1, -0.03, W * 0.8);
      }
      fadeIn(ctx, S);
    }
  });

  // ======================================================================
  // duo_final — DOIS EGOS, UM GOL (a final no campo)
  // ======================================================================
  const FIN_W = [53, 12.0, 0.8]; // os punhos no fim
  reg3d('duo_final', {
    phases: [110, 90, 80, 210],
    music: 'epic',
    title: '🏆 DOIS EGOS, UM GOL',
    tags: ['PLANO 1 • O ÚLTIMO LANCE', 'PLANO 2 • SEM OLHAR', 'PLANO 3 • O CHUTE', 'PLANO 4 • O ELO'],
    subs: [
      [{ from: 10, who: 'NARRADOR', text: 'Final da Liga dos Pares. 2 a 2. Último lance.', color: '#fde047' }],
      [],
      [],
      [{ from: 130, who: 'NARRADOR', text: 'As duas pulseiras, desligadas no bolso, acendem sozinhas.', color: '#fde047' }]
    ],
    letterbox: 0.1,
    grain: 0.05,
    theme: 'worldcup_final',
    scene(K, S) {
      const { t, phase, dur } = S;
      if (phase === 0) {
        // O ÚLTIMO LANCE: a corrida com a aura; o Shion se jogando e ficando para trás
        runScene(K, S);
        const at = 30;
        const sy = runY(at + 8, dur) - 0.2;
        const q = ease(seg(t, at, at + 30));
        K.actor('elo_shion', { id: 'sh', extra: SHION_KIT, x: 53.4 + q * 1.1, y: sy + q * 0.6, z: Math.sin(q * Math.PI) * 0.4, face: [53, 22], anim: t > at ? 'dive' : 'idle', left: false });
        sfx(S, 30, 'drible', () => window.SFX?.whoosh?.());
      } else if (phase === 1) {
        // SEM OLHAR: os dois correndo para a câmera, sem se olhar
        const y = lerp(15.6, 12.6, t / dur);
        const n = K.noise(S.f, 5) * 0.012;
        K.cam([53 + n, 0.56, y - 2.45], [53, 0.6, y], 36);
        duo(K, 'a', ELO, { x: 53.42, y, ang: -Math.PI / 2, anim: 'run', frame: Math.floor(S.f * 1.2), light: LA, opts: AURA });
        duo(K, 'b', ELO, { x: 52.58, y: y + 0.05, ang: -Math.PI / 2, anim: 'run', frame: Math.floor(S.f * 1.2) + 3, light: LB, opts: AURA });
        K.ball(53.0 + Math.sin(t * 0.22) * 0.25, y - 0.3, 0.06, { glow: true });
        sfx(S, 28, 'olhar', () => window.SFX?.jingle?.([784, 1047], 0, 'square'));
      } else if (phase === 2) {
        shotScene(K, S);
        sfx(S, SHOT_HIT, 'chute', () => window.SFX?.kick?.(1));
      } else if (t < 120) {
        goalScene(K, S, {});
        sfx(S, HIT_T, 'rede', () => window.SFX?.goal?.(true));
      } else {
        // O ELO: punho com punho, as pulseiras desligadas acendendo sozinhas
        const u2 = t - 120;
        const c = cast();
        const lit = Math.floor(clamp((u2 - 10) / 24) * 5);
        const slide = ease(seg(u2, 0, 14));
        K.cam([53 + K.noise(S.f, 3) * 0.004, FIN_W[2] + 0.04, FIN_W[1] + 1.4 - ease(u2 / 90) * 0.12], [53, FIN_W[2], FIN_W[1]], 40);
        K.expo(0.9);
        // (cada punho entra do seu lado até os dois se baterem no meio)
        wrists(K, FIN_W, {
          ax: lerp(-70, 8, slide),
          bx: lerp(70, -8, slide),
          a: { skin: c.a.skinColor, open: 1, lit, num: 27, t },
          b: { skin: c.b.skinColor, open: 1, lit, num: 27, t }
        });
        sfx(S, 130, 'elo', () => window.SFX?.jingle?.([523, 659, 784, 1047], 0, 'square'));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = cast();
      if (phase === 0) {
        runOverlay(ctx, S, K);
        CE.ptdSpeed?.(ctx, S, t, '#f8fafc', 0.16, -1, 50, 24);
        if (CE.ptdScore) CE.ptdScore(ctx, W / 2 - 191, top + 30, { hl: 'ELO', al: 'S&H', hs: 2, as: 2, minute: "90+3'", hc: GOLD, ac: '#ef4444', k: seg(t, 4, 14) });
      } else if (phase === 1) {
        const y = lerp(15.6, 12.6, t / S.dur);
        const ea = eyeOf(K, 53.42, y);
        const eb = eyeOf(K, 52.58, y + 0.05);
        const lit = seg(t, 24, 32);
        duoCut(ctx, S, CA, CB, { cx: ea && eb ? (ea.x + eb.x) / 2 : W / 2, cutColor: GOLD, alpha: 0.12 });
        if (ea && eb) {
          const xa = ea.x + 3.5 * ea.u;
          const xb = eb.x - 3.5 * eb.u;
          CE.ptdEyeFlare?.(ctx, xa, ea.y, lit, GOLD, W * 0.5);
          CE.ptdEyeFlare?.(ctx, xb, eb.y, lit, GOLD, W * 0.5);
          CE.ptdBolt?.(ctx, xa, ea.y, xb, eb.y, GOLD, seg(t, 28, 34), t, 3);
        }
        word(ctx, 'SEM OLHAR.', W / 2, bot - 70, 70, GOLD, seg(t, 40, 50), 1, -0.03);
      } else if (phase === 2) {
        shotOverlay(ctx, S, K, { shout: 'DEVORA!!', ink: '#3b2a06' });
      } else if (t < 120) {
        goalOverlay(ctx, S, K, { word: 'GOOOOL!!', sub: 'CAMPEÕES DA LIGA DOS PARES' });
      } else {
        const u2 = t - 120;
        const lit = Math.floor(clamp((u2 - 10) / 24) * 5);
        CE.duoConfetti?.(ctx, S, t, 0.5);
        const mid = K.screen(FIN_W[0], FIN_W[2], FIN_W[1]);
        if (u2 >= 14 && mid) {
          CE.ptdRings?.(ctx, mid.x, mid.y, seg(u2, 14, 44), [GOLD, CA, CB], 460);
          CE.cineGlow(ctx, mid.x, mid.y, 240, 'rgba(253,224,71,0.55)', lit >= 5 ? 1 : 0.4);
        }
        if (u2 >= 14 && u2 < 20) CE.cineFlash(ctx, W, H, 1 - (u2 - 14) / 6, '#fde047');
        CE.cineTitleCard(ctx, W, top + 90, seg(u2, 40, 56), { kicker: 'PROJETO ELO', title: 'DOIS EGOS. UM GOL.', sub: `${c.an}  +  ${c.bn}`, color: GOLD });
      }
      fadeIn(ctx, S);
    }
  });
})();
