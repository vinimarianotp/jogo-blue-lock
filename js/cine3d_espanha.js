// ============================================================================
// CUTSCENES EM 3D — a viagem para a Espanha, o clássico, o discurso e a promessa
// (js/cine_espanha.js refeito no 3D)
// ego_ticket • spain_flight • clasico_bunny • captain_speech • loki_hugo_promise
// Kit: js/cine3d_kit.js. Mesmos planos, tempos e legendas da versão 2D. Lugares fora do
// prédio (sala dos monitores, aeroporto, avião, Barcelona, Paris) ficam montados na área
// vazia K.VOID; o clássico e a final usam o campo do prédio e o discurso, o vestiário.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;

  // O kit não vira os bonecos (nem a bola) para a câmera da cena: eles ficam virados
  // para a câmera do mapa (Hub.camA) e de lado viram uma risca. Aqui cada quadro aponta o
  // Hub.camA para onde a câmera da cena olha e devolve o valor do mapa logo depois do
  // desenho (microtarefa: roda assim que o quadro termina).
  let camA0 = null;
  function aim(K) {
    const H = window.Hub;
    if (!H || !K.c || !K.c.eye) return;
    if (camA0 === null) {
      camA0 = H.camA;
      Promise.resolve().then(() => {
        if (camA0 !== null) H.camA = camA0;
        camA0 = null;
      });
    }
    const e = K.c.eye;
    const l = K.c.look;
    if (Math.abs(l[0] - e[0]) + Math.abs(l[2] - e[2]) > 1e-4) H.camA = Math.atan2(l[2] - e[2], l[0] - e[0]);
  }
  function register(type, def) {
    const scene = def.scene;
    def.scene = function (K, S) {
      scene.call(this, K, S);
      aim(K);
    };
    CE.registerCine3D(type, def);
  }

  // ---------------------------------------------------------------- ajudantes deste arquivo
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const kick = (t, at, len = 10) => (t < at ? 0 : Math.max(0, 1 - (t - at) / len));
  const hash = (i, s = 0) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const MAPY = (y) => (window.SPRITE_MAPY ? window.SPRITE_MAPY(y) : y);
  const c01 = (h) => {
    const n = parseInt(String(h).replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const hexMix = (a, b, k) => {
    const A = c01(a);
    const B = c01(b);
    return '#' + A.map((v, i) => Math.round((v + (B[i] - v) * k) * 255).toString(16).padStart(2, '0')).join('');
  };
  const VX = 86;
  const VY = 17;

  // Canvas pintado uma vez só
  const CV = new Map();
  function paint(key, w, h, fn) {
    let cv = CV.get(key);
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      fn.call(CE, g, w, h);
      CV.set(key, cv);
    }
    return cv;
  }

  // Unidade v do quadro do boneco na tela (0 = topo, 33 = chão; 36 unidades no quadro de 72 px)
  function spot(K, x, y, z = 0, k = 0.9, v = 0) {
    const h = (72 / 66) * k;
    const a = K.screen(x, z + (h * (33 - v)) / 36, y);
    const b = K.screen(x, z + (h * (34 - v)) / 36, y);
    if (!a || !b) return null;
    const u = a.y - b.y;
    const top = a.y - v * u;
    return { x: a.x, y: a.y, u, size: u * 36, top, feet: top + u * 36 * 0.87 };
  }

  // Pálpebras por cima dos olhos do boneco 3D (lid 0 = aberto, 1 = fechado). Posição medida nas
  // fotos: cada olho fica entre 1,2 e 3,6 unidades do meio do rosto, de 11,4 para baixo
  function lids(ctx, f, lid, skin) {
    if (!f || lid <= 0.02) return;
    const u = f.u;
    const y0 = f.top + 11.4 * u;
    const h = lid * 2.3 * u;
    [-3.6, 1.2].forEach((dx) => {
      ctx.fillStyle = skin;
      ctx.fillRect(f.x + dx * u, y0, 2.4 * u, h);
      ctx.fillStyle = '#0a0f1c';
      ctx.fillRect(f.x + dx * u, y0 + h - 0.4 * u, 2.4 * u, 0.5 * u);
    });
  }

  // Várias caixas iguais numa peça só
  const pq = (v, a, b, c, d, n) => {
    const P = (p, u, w) => v.push(p[0], p[1], p[2], u, w, n[0], n[1], n[2]);
    P(a, 0, 0);
    P(b, 1, 0);
    P(c, 1, 1);
    P(a, 0, 0);
    P(c, 1, 1);
    P(d, 0, 1);
  };
  function boxes(K, list, o) {
    if (!K._push) {
      list.forEach((b) => K.box(Object.assign({}, o, b)));
      return;
    }
    const s = [];
    const tp = [];
    list.forEach(({ x0, y0, x1, y1, z0 = 0, z1 = 1 }) => {
      pq(s, [x1, z1, y0], [x0, z1, y0], [x0, z0, y0], [x1, z0, y0], [0, 0, -1]);
      pq(s, [x0, z1, y1], [x1, z1, y1], [x1, z0, y1], [x0, z0, y1], [0, 0, 1]);
      pq(s, [x0, z1, y0], [x0, z1, y1], [x0, z0, y1], [x0, z0, y0], [-1, 0, 0]);
      pq(s, [x1, z1, y1], [x1, z1, y0], [x1, z0, y0], [x1, z0, y1], [1, 0, 0]);
      pq(tp, [x0, z1, y0], [x1, z1, y0], [x1, z1, y1], [x0, z1, y1], [0, 1, 0]);
    });
    K._push(s, o);
    K._push(tp, Object.assign({}, o, { color: o.top || o.color }));
  }
  // placa em pé virada para a câmera
  const toward = (x, y, eye) => Math.atan2(eye[2] - y, eye[0] - x);
  const glowCv = () =>
    paint('glow', 64, 64, (g) => {
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,1)');
      r.addColorStop(0.35, 'rgba(255,255,255,0.5)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, 64, 64);
    });
  function glowAt(K, x, y, z, s, color, alpha, eye) {
    if (alpha <= 0.01) return;
    K.quad({ x, y, z: z - s / 2, w: s, h: s, ang: toward(x, y, eye), img: glowCv(), color, alpha, em: true });
  }
  // feixe de luz (estreito em cima, largo embaixo) e o contrário (luz subindo)
  const coneCv = () =>
    paint('cone', 64, 128, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(255,255,255,0.75)');
      gr.addColorStop(1, 'rgba(255,255,255,0.1)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(26, 0);
      g.lineTo(38, 0);
      g.lineTo(64, 128);
      g.lineTo(0, 128);
      g.closePath();
      g.fill();
    });
  const shaftCv = () =>
    paint('shaft', 64, 128, (g) => {
      const gr = g.createLinearGradient(0, 128, 0, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(24, 128);
      g.lineTo(40, 128);
      g.lineTo(64, 0);
      g.lineTo(0, 0);
      g.closePath();
      g.fill();
    });
  const ringCv = () =>
    paint('ring', 128, 128, (g) => {
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.lineWidth = 7;
      g.beginPath();
      g.arc(64, 64, 58, 0, Math.PI * 2);
      g.stroke();
    });

  // Torcida genérica (rostos variados, cores de camisa dadas)
  function crowdOf(key, n, shirts, seed) {
    return paint('crowd|' + key, 1, 1, () => {}).list || (CV.get('crowd|' + key).list = (() => {
      const A = window.App || {};
      const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
      const skins = ['#f3d1b8', '#e8b796', '#c98e6a', '#8d5a3b', '#f1c9a5'];
      const cols = ['#1c1917', '#3f2a1d', '#78350f', '#a16207', '#d6b370', '#57534e'];
      const out = [];
      for (let i = 0; i < n; i++) {
        const q = Math.floor(hash(i, seed) * 9973);
        out.push({ name: key + i, skinColor: skins[q % skins.length], hairColor: cols[(q >> 3) % cols.length], hairSecondary: cols[(q >> 5) % cols.length], eyeColor: '#1e293b', hairStyle: hairs[(q >> 2) % hairs.length], outfit: 'casual', clothesColor: shirts[(q >> 4) % shirts.length], jerseyPrimary: shirts[q % shirts.length], jerseySecondary: '#f8fafc' });
      }
      return out;
    })());
  }

  // ==========================================================================
  // 1) A PASSAGEM — a sala dos monitores (área vazia)
  // ==========================================================================
  const EGO_AT = [VX, 14.15];
  const YOU_T = [VX - 0.8, 16.6];
  const DESK = { x0: VX - 1.6, y0: 14.55, x1: VX + 1.6, y1: 15.35, z1: 0.44 };
  const monitorWall = () =>
    paint('monitors', 512, 224, (g, w, h) => {
      g.fillStyle = '#01040b';
      g.fillRect(0, 0, w, h);
      const cols = 8;
      const rows = 4;
      const mw = w / cols;
      const mh = h / rows;
      const kindOf = (i, r) => [0, 1, 3, 1, 0, 3, 2][(i * 3 + r * 5) % 7];
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < cols; i++) {
          const x = i * mw;
          const y = r * mh;
          const kind = kindOf(i, r);
          g.fillStyle = '#050b18';
          g.fillRect(x + 2, y + 2, mw - 4, mh - 4);
          if (kind === 0) {
            g.fillStyle = '#0b3a26';
            g.fillRect(x + 6, y + 6, mw - 12, mh - 12);
            g.strokeStyle = 'rgba(220,252,231,0.5)';
            g.lineWidth = 1;
            g.strokeRect(x + 10.5, y + 10.5, mw - 21, mh - 21);
            g.beginPath();
            g.moveTo(x + mw / 2, y + 10);
            g.lineTo(x + mw / 2, y + mh - 10);
            g.stroke();
            g.fillStyle = 'rgba(220,90,90,0.9)';
            for (let d = 0; d < 4; d++) g.fillRect(x + 14 + ((d * 13 + i * 7) % (mw - 28)), y + 14 + d * 7, 3, 3);
          } else if (kind === 1) {
            g.fillStyle = 'rgba(0,245,212,0.6)';
            for (let b = 0; b < 4; b++) g.fillRect(x + 9, y + 9 + b * 9, (mw - 24) * (0.3 + 0.7 * Math.abs(Math.sin(b * 1.7 + i))), 4);
          } else if (kind === 2) {
            g.fillStyle = '#7f1d1d';
            g.fillRect(x + 6, y + 6, (mw - 12) / 2, mh - 12);
            g.fillStyle = '#1e3a8a';
            g.fillRect(x + 6 + (mw - 12) / 2, y + 6, (mw - 12) / 2, mh - 12);
            g.fillStyle = '#facc15';
            g.font = '900 8px "Segoe UI", sans-serif';
            g.textAlign = 'center';
            g.fillText('AO VIVO', x + mw / 2, y + mh / 2 - 2);
            g.fillText('ESPANHA', x + mw / 2, y + mh / 2 + 8);
          } else {
            g.fillStyle = '#0b1736';
            g.fillRect(x + 6, y + 6, mw - 12, mh - 12);
            g.fillStyle = 'rgba(147,197,253,0.6)';
            g.font = '900 9px "Segoe UI", sans-serif';
            g.textAlign = 'left';
            g.fillText(`#${(i * 7 + r * 13) % 300}`, x + 10, y + 18);
          }
          g.strokeStyle = 'rgba(0,245,212,0.55)';
          g.lineWidth = 1.5;
          g.strokeRect(x + 2.5, y + 2.5, mw - 5, mh - 5);
        }
      }
      g.fillStyle = 'rgba(1,4,11,0.35)';
      g.fillRect(0, 0, w, h);
    });
  const envelopeCv = () =>
    paint('envelope', 200, 112, (g, w, h) => {
      g.fillStyle = '#070b14';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#00f5d4';
      g.lineWidth = 3;
      g.strokeRect(1.5, 1.5, w - 3, h - 3);
      g.strokeStyle = 'rgba(0,245,212,0.3)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(w / 2, h * 0.45);
      g.lineTo(w, h);
      g.stroke();
      g.fillStyle = '#00f5d4';
      g.font = '900 11px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.fillText('B L U E   L O C K', w / 2, h - 12);
    });
  const flapCv = (inside) =>
    paint('flap' + (inside ? 'In' : 'Out'), 200, 64, (g, w, h) => {
      g.fillStyle = inside ? '#101a30' : '#070b14';
      g.strokeStyle = '#00f5d4';
      g.lineWidth = 3;
      g.beginPath();
      // por fora a ponta aponta para perto (baixo); por dentro, para longe (cima)
      if (inside) {
        g.moveTo(2, h - 2);
        g.lineTo(w - 2, h - 2);
        g.lineTo(w / 2, 2);
      } else {
        g.moveTo(2, 2);
        g.lineTo(w - 2, 2);
        g.lineTo(w / 2, h - 2);
      }
      g.closePath();
      g.fill();
      g.stroke();
    });
  const lockCv = (half) =>
    paint('lock' + half, 64, 64, (g) => {
      if (half) {
        g.beginPath();
        g.rect(half < 0 ? 0 : 32, 0, 32, 64);
        g.clip();
      }
      CE.espLock(g, 32, 30, 3.4);
    });
  const passCv = () => {
    const name = CE.cinePlayerName();
    return paint('pass|' + name, 520, 200, (g) => CE.espBoardingPass(g, name));
  };
  const ticketCv = () => paint('clasicoTicket', 340, 130, (g) => CE.espClasicoTicket(g));

  function monitorRoom(K, t, eye) {
    K.sky('#01030a', '#040a18', 0);
    K.fog('#01040b', 0.05);
    K.ambient('#7c97b8');
    K.floor({ x0: VX - 4.5, y0: 12.9, x1: VX + 4.5, y1: 20, color: '#070c16' });
    K.quad({ x: VX, y: 13.0, z: 0, w: 8.6, h: 3.75, ang: -Math.PI / 2, img: monitorWall(), color: '#c7d2e0', em: true });
    // faixa de varredura descendo pelos monitores
    K.quad({ x: VX, y: 13.03, z: 3.55 - ((t * 0.012) % 3.5), w: 8.6, h: 0.16, ang: Math.PI / 2, color: '#00f5d4', alpha: 0.1, em: true });
    K.quad({ x: VX - 4.3, y: 16.4, z: 0, w: 7, h: 3.75, ang: 0, color: '#04070e' });
    K.quad({ x: VX + 4.3, y: 16.4, z: 0, w: 7, h: 3.75, ang: Math.PI, color: '#04070e' });
    // a mesa (borda acesa pelo reflexo dos monitores)
    K.box({ x0: DESK.x0, y0: DESK.y0, x1: DESK.x1, y1: DESK.y1, z0: 0, z1: DESK.z1, color: '#0b1324', top: '#121c30' });
    K.box({ x0: DESK.x0, y0: DESK.y1 - 0.02, x1: DESK.x1, y1: DESK.y1 + 0.01, z0: DESK.z1 - 0.025, z1: DESK.z1 + 0.003, color: '#00f5d4', alpha: 0.85, em: true });
    // brilho ciano dos monitores atrás do Ego
    glowAt(K, VX, 13.2, 1.1, 3.4, '#00f5d4', 0.22, eye);
  }

  register('ego_ticket', {
    phases: [170, 160, 210, 150],
    music: 'mystery',
    title: '✈ INTERLÚDIO • A PASSAGEM',
    tags: ['PLANO 1 • A SALA DOS MONITORES', 'PLANO 2 • O ENVELOPE PRETO', 'PLANO 3 • O QUE TEM DENTRO', 'PLANO 4 • RUMO À ESPANHA'],
    subs: [
      [{ from: 12, who: 'JINPACHI EGO', text: '"Vá ver com seus olhos."', color: '#00f5d4' }],
      [{ from: 30, text: 'Um envelope preto, lacrado.' }],
      [{ from: 16, who: 'JINPACHI EGO', text: '"Os monstros não esperam ninguém."', color: '#00f5d4' }],
      [{ from: 2, who: 'JINPACHI EGO', text: '"Vá. Volte com fome."', color: '#00f5d4' }]
    ],
    theme: 'worldcup_england',
    scene(K, S) {
      const { t, phase, p } = S;
      K.expo(0.9);
      let eye;
      if (phase === 0) {
        // O Ego atrás da mesa, contra a luz dos monitores; a câmera entra por trás de você
        const e = easeIO(p);
        eye = K.mix([VX - 0.3, 1.1, 19.0], [VX - 0.48, 1.0, 17.95], e);
        K.cam(eye, K.mix([VX + 0.1, 0.72, 14.2], [VX + 0.05, 0.78, 14.2], e), lerp(42, 35, e));
      } else if (phase === 1) {
        eye = [VX - 0.05, 1.3, 16.2];
        K.cam(eye, [VX - 0.35, 0.42, 14.9], 40);
      } else if (phase === 2) {
        const fly = easeIO(seg(t, 100, 150));
        eye = [VX + 0.15, lerp(1.08, 0.95, fly), lerp(15.95, 16.15, fly)];
        K.cam(eye, [VX + 0.15, lerp(0.5, 0.62, fly), lerp(14.95, 15.2, fly)], 36);
      } else {
        eye = [YOU_T[0] + 0.55, 0.6, 18.08];
        K.cam(eye, [YOU_T[0] + 0.4, 0.58, YOU_T[1]], 33);
      }
      monitorRoom(K, t, eye);
      if (phase <= 2) K.actor('EGO', { x: EGO_AT[0], y: EGO_AT[1], ang: Math.PI / 2, k: 0.95, light: [0.5, 0.74, 0.82] });
      if (phase === 0) K.actor('you', { x: YOU_T[0], y: YOU_T[1], face: EGO_AT, light: [0.3, 0.42, 0.55] });
      if (phase === 1) {
        // a mão do Ego deslizando o envelope até você (e soltando no fim)
        const k = easeIO(seg(t, 24, 92));
        const ey = lerp(14.74, 15.12, k);
        const ex = VX + 0.15;
        K.floor({ x0: ex - 0.25, y0: ey - 0.14, x1: ex + 0.25, y1: ey + 0.14, z: DESK.z1 + 0.004, img: envelopeCv() });
        K.floor({ x0: ex - 0.25, y0: ey - 0.14, x1: ex + 0.25, y1: ey - 0.05, z: DESK.z1 + 0.006, img: flapCv(false) });
        K.floor({ x0: ex - 0.045, y0: ey - 0.085, x1: ex + 0.045, y1: ey + 0.005, z: DESK.z1 + 0.008, img: lockCv(0) });
        const back = ease(seg(t, 100, 130)) * 0.32;
        const hy = ey - 0.06 - back;
        if (hy > 14.3) {
          K.box({ x0: ex - 0.06, y0: 14.3, x1: ex + 0.06, y1: hy - 0.12, z0: DESK.z1 + 0.02, z1: DESK.z1 + 0.1, color: '#0b0f1a' });
          K.box({ x0: ex - 0.062, y0: hy - 0.135, x1: ex + 0.062, y1: hy - 0.11, z0: DESK.z1 + 0.02, z1: DESK.z1 + 0.1, color: '#e5e7eb' });
          K.box({ x0: ex - 0.05, y0: hy - 0.11, x1: ex + 0.05, y1: hy - 0.02, z0: DESK.z1 + 0.01, z1: DESK.z1 + 0.05, color: '#f1dfcd' });
          K.box({ x0: ex - 0.035, y0: hy - 0.02, x1: ex - 0.008, y1: hy + 0.07, z0: DESK.z1 + 0.008, z1: DESK.z1 + 0.025, color: '#f1dfcd' });
          K.box({ x0: ex + 0.006, y0: hy - 0.02, x1: ex + 0.033, y1: hy + 0.06, z0: DESK.z1 + 0.008, z1: DESK.z1 + 0.025, color: '#f1dfcd' });
        }
      }
      if (phase === 2) {
        // o envelope abre, a luz sai de dentro, a passagem e o ingresso sobem
        const ex = VX + 0.15;
        const ey = 15.0;
        const z = DESK.z1;
        K.floor({ x0: ex - 0.26, y0: ey - 0.145, x1: ex + 0.26, y1: ey + 0.145, z: z + 0.004, img: envelopeCv() });
        const fold = 1 - 2 * easeIO(seg(t, 14, 40));
        const L = 0.17;
        if (fold > 0.02) K.floor({ x0: ex - 0.26, y0: ey - 0.145, x1: ex + 0.26, y1: ey - 0.145 + L * fold, z: z + 0.007, img: flapCv(false) });
        else if (fold < -0.02) K.floor({ x0: ex - 0.26, y0: ey - 0.145 + L * fold, x1: ex + 0.26, y1: ey - 0.145, z: z + 0.007, img: flapCv(true) });
        const brk = seg(t, 8, 30);
        const ly = ey - 0.145 + L - 0.06;
        if (brk <= 0) K.floor({ x0: ex - 0.045, y0: ly - 0.045, x1: ex + 0.045, y1: ly + 0.045, z: z + 0.01, img: lockCv(0) });
        else if (brk < 1) {
          [-1, 1].forEach((s) => {
            const dx = s * brk * 0.12;
            K.floor({ x0: ex - 0.045 + dx, y0: ly - 0.045 + brk * brk * 0.15, x1: ex + 0.045 + dx, y1: ly + 0.045 + brk * brk * 0.15, z: z + 0.01, img: lockCv(s), alpha: 1 - brk });
          });
        }
        const open = seg(t, 24, 50);
        if (open > 0) {
          K.floor({ x0: ex - 0.24, y0: ey - 0.13, x1: ex + 0.24, y1: ey + 0.13, z: z + 0.009, color: '#00f5d4', alpha: 0.28 * open, em: true });
          K.quad({ x: ex, y: ey, z: z - 0.02, w: 0.95, h: 1.0, ang: toward(ex, ey, eye), img: shaftCv(), color: '#5eead4', alpha: 0.42 * open, em: true });
        }
        // a passagem subindo de dentro do envelope e depois vindo para a câmera
        const up = ease(seg(t, 40, 100));
        const fly = easeIO(seg(t, 100, 150));
        const py = ey + fly * 0.42;
        K.quad({ x: ex, y: py, z: lerp(z - 0.24, z + 0.1, up) + fly * 0.1, w: 0.52, h: 0.2, ang: toward(ex, py, eye) + Math.PI, img: passCv(), light: [1.15, 1.2, 1.22] });
        // o ingresso do clássico entra girando
        const side = ease(seg(t, 128, 162));
        if (side > 0) {
          const tx = lerp(ex + 1.3, ex + 0.36, side);
          const ty = lerp(ey + 0.35, ey + 0.5, side);
          K.quad({ x: tx, y: ty, z: lerp(z + 0.45, z + 0.12, side), w: 0.34, h: 0.13, ang: toward(tx, ty, eye) + Math.PI + (1 - side) * 4.2 - 0.25, img: ticketCv(), light: [1.1, 1.1, 1.12] });
        }
      }
      if (phase === 3) {
        // o seu rosto aceso pela luz da passagem
        K.actor('you', { x: YOU_T[0], y: YOU_T[1], ang: Math.PI / 2, view: 'front', light: [0.55, 0.92, 1.02] });
        glowAt(K, YOU_T[0] + 0.1, YOU_T[1] + 0.25, 0.15, 0.9, '#00f5d4', 0.45, eye);
        const px = YOU_T[0] + 0.12;
        const py = 17.62;
        K.quad({ x: px, y: py, z: 0.33, w: 0.52, h: 0.2, ang: toward(px, py, eye) + Math.PI - 0.45, img: passCv(), light: [0.42, 0.55, 0.62] });
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const glint = (f, g, scale = 1) => {
        if (!f || g <= 0 || g >= 1) return;
        const u = f.u;
        ctx.save();
        ctx.beginPath();
        [12.4, 19.4].forEach((gx) => ctx.rect(f.x + (gx + 0.6 - 18) * u, f.top + MAPY(8.7) * u, 3 * u, 2.4 * u));
        ctx.clip();
        const gx = f.x - 6 * u * scale + g * 12 * u * scale;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.moveTo(gx, f.top + MAPY(8) * u);
        ctx.lineTo(gx + 1.6 * u, f.top + MAPY(8) * u);
        ctx.lineTo(gx + 0.4 * u, f.top + MAPY(12) * u);
        ctx.lineTo(gx - 1.2 * u, f.top + MAPY(12) * u);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      if (phase === 0) {
        glint(spot(K, EGO_AT[0], EGO_AT[1], 0, 0.95, 0), seg(t, 70, 100));
        CE.cineDust(ctx, W, H, t, 30, 'rgba(165,243,252,0.45)', 5);
      } else if (phase === 1) {
        const cast = CE.spainCast();
        const ego = cast.ego;
        const you = CE.cineYou();
        CE.drawRadialSpeedLines(ctx, W * 0.7, (top + bot) / 2, W, '#0e7490', 0.12);
        const inA = ease(t / 14);
        const inB = ease((t - 78) / 14);
        // Painel A: os óculos do Ego e o brilho cortando as lentes
        if (inA > 0) {
          const y0 = top + 14;
          const y1 = top + 220;
          CE.espPanel(ctx, [[26, y0], [W * 0.36, y0], [W * 0.34, y1], [26, y1]], () => {
            CE.cineGradient(ctx, 0, y0, W * 0.4, y1 - y0, [[0, '#04212b'], [1, '#020617']]);
            const dw = W * 0.34;
            const U = dw / 15;
            const cx = (26 + W * 0.35) / 2;
            const cy = (y0 + y1) / 2;
            CE.fx2Crop(ctx, ego, {}, 10.5, 6, 15, 7, cx - dw / 2, cy - 3.6 * U, dw, 7 * U);
            ctx.fillStyle = 'rgba(2,12,28,0.3)';
            ctx.fillRect(0, y0, W * 0.4, y1 - y0);
            const fake = { x: cx, u: U, top: cy - 3.6 * U - MAPY(6) * U };
            glint(fake, seg(t, 16, 44), 1.15);
          }, { dx: -(1 - inA) * 500 });
        }
        // Painel B: o seu olho acompanhando o envelope
        if (inB > 0) {
          const y0 = top + 236;
          const y1 = bot - 14;
          CE.espPanel(ctx, [[26, y0], [W * 0.34, y0], [W * 0.32, y1], [26, y1]], () => {
            ctx.fillStyle = '#04121c';
            ctx.fillRect(0, y0, W * 0.4, y1 - y0);
            const dw = W * 0.4;
            const U = dw / 14;
            const cx = (26 + W * 0.33) / 2;
            const cy = (y0 + y1) / 2;
            CE.fx2Crop(ctx, you, {}, 11, 7, 14, 6, cx - dw / 2, cy - 3.25 * U, dw, 6 * U);
            CE.cineSpriteEyes(ctx, you, cx, cy - 0.15 * U, U, { look: 1 });
            const sh = ctx.createLinearGradient(0, 0, W * 0.34, 0);
            sh.addColorStop(0, 'rgba(0,30,50,0.1)');
            sh.addColorStop(1, 'rgba(0,30,50,0.55)');
            ctx.fillStyle = sh;
            ctx.fillRect(0, y0, W * 0.4, y1 - y0);
          }, { dy: (1 - inB) * 320 });
        }
        CE.cineSfx(S, 26, 'slide', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        CE.cineSfx(S, 8, 'seal', () => window.SFX?.page?.());
        CE.cineSfx(S, 128, 'ticket', () => window.SFX?.whoosh?.());
      } else {
        CE.cineBokeh(ctx, W, top + 40, bot - 60, t, 10, ['rgba(0,245,212,0.3)', 'rgba(59,130,246,0.3)'], 4);
        const k = seg(t, 30, 60);
        ctx.save();
        ctx.translate(W * 0.72 - W * 0.3, 0);
        CE.cineTitleCard(ctx, W * 0.6, top + (bot - top) / 2 - 10, k, { kicker: 'INTERLÚDIO', title: 'RUMO À ESPANHA', sub: 'Os monstros de verdade estão lá fora.', color: '#00f5d4' });
        ctx.restore();
        CE.cineDust(ctx, W, H, t, 24, 'rgba(165,243,252,0.45)', 9);
      }
    }
  });

  // ==========================================================================
  // 2) A VIAGEM — Haneda, a decolagem, a janelinha e Barcelona (área vazia)
  // ==========================================================================
  const planeSideCv = () =>
    paint('planeSide', 440, 190, (g) => {
      CE.drawPlane(g, 222, 104, 1, 1);
    });
  const dawnCityCv = () =>
    paint('dawnCity', 1024, 200, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      CE.cineCity(g, w, h - 30, 90, '#231a52', 'rgba(253,224,71,0.5)', 4, 0);
      g.fillStyle = '#1c1838';
      g.fillRect(0, h - 32, w, 32);
    });
  const BOARD = { cv: null, last: '' };
  function boardCv(t) {
    if (!BOARD.cv) {
      BOARD.cv = document.createElement('canvas');
      BOARD.cv.width = 430;
      BOARD.cv.height = 96;
    }
    const dest = 'BARCELONA';
    const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let shown = '';
    for (let i = 0; i < dest.length; i++) shown += t >= 18 + i * 5 ? dest[i] : AB[(Math.floor(t / 2) * 7 + i * 11) % 26];
    const key = shown + (t > 70 ? '1' : '0');
    if (key === BOARD.last) return { cv: BOARD.cv, dirty: false };
    BOARD.last = key;
    const g = BOARD.cv.getContext('2d');
    g.fillStyle = '#020617';
    g.fillRect(0, 0, 430, 96);
    g.strokeStyle = '#334155';
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, 427, 93);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.font = '900 13px "Consolas", monospace';
    g.fillStyle = '#94a3b8';
    g.fillText('PARTIDAS • DEPARTURES', 14, 22);
    g.font = '900 20px "Consolas", monospace';
    g.fillStyle = '#fbbf24';
    g.fillText('06:00  BL-011', 14, 54);
    g.fillText(shown, 196, 54);
    g.font = '900 15px "Consolas", monospace';
    g.fillStyle = t > 70 ? '#4ade80' : '#475569';
    g.fillText(t > 70 ? 'PORTÃO 11 • EMBARQUE' : 'PORTÃO 11 • AGUARDE', 14, 82);
    return { cv: BOARD.cv, dirty: true };
  }
  // a parede da cabine com a janela oval vazada (o céu de verdade aparece pelo buraco)
  const cabinWallCv = () =>
    paint('cabinWall', 160, 120, (g, w, h) => {
      g.fillStyle = '#cbd5e1';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#b6c2d2';
      g.fillRect(0, h - 18, w, 18);
      g.fillStyle = '#94a3b8';
      g.fillRect(0, h - 20, w, 2);
      // (a placa tem 2,4 x 1,8 ladrilhos: o centro da janela fica a 1,0 de altura)
      const cx = w / 2;
      const cy = 61;
      g.fillStyle = '#e2e8f0';
      g.beginPath();
      g.ellipse(cx, cy, 31, 40, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#64748b';
      g.beginPath();
      g.ellipse(cx, cy, 24, 32, 0, 0, Math.PI * 2);
      g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      g.ellipse(cx, cy, 20, 28, 0, 0, Math.PI * 2);
      g.fill();
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(cx, cy, 18, 26, 0, Math.PI * 1.1, Math.PI * 1.4);
      g.stroke();
    });
  const cloudCv = () =>
    paint('cloud', 256, 80, (g) => {
      g.fillStyle = '#ffffff';
      [[60, 52, 58, 20], [120, 44, 70, 26], [190, 54, 56, 18], [140, 60, 100, 16]].forEach(([x, y, rx, ry]) => {
        g.beginPath();
        g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        g.fill();
      });
    });
  const ROUTE = { cv: null, last: -1 };
  function routeCv(q) {
    if (!ROUTE.cv) {
      ROUTE.cv = document.createElement('canvas');
      ROUTE.cv.width = 330;
      ROUTE.cv.height = 220;
    }
    const mins = Math.round((1 - q) * 14 * 60);
    if (mins === ROUTE.last) return { cv: ROUTE.cv, dirty: false };
    ROUTE.last = mins;
    const g = ROUTE.cv.getContext('2d');
    const sw = 330;
    const shh = 220;
    g.fillStyle = '#062033';
    g.fillRect(0, 0, sw, shh);
    g.fillStyle = 'rgba(14,116,144,0.45)';
    [[0.2, 0.42, 0.13, 0.17], [0.32, 0.3, 0.1, 0.12], [0.55, 0.36, 0.2, 0.2], [0.82, 0.4, 0.07, 0.18], [0.68, 0.62, 0.09, 0.1]].forEach(([a, b, c, d]) => {
      g.beginPath();
      g.ellipse(sw * a, shh * b, sw * c, shh * d, 0.3, 0, Math.PI * 2);
      g.fill();
    });
    const A = { x: sw * 0.86, y: shh * 0.5 };
    const B = { x: sw * 0.14, y: shh * 0.46 };
    const Q = { x: sw * 0.5, y: shh * 0.02 };
    g.setLineDash([5, 6]);
    g.strokeStyle = 'rgba(165,243,252,0.6)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(A.x, A.y);
    g.quadraticCurveTo(Q.x, Q.y, B.x, B.y);
    g.stroke();
    g.setLineDash([]);
    const bz = (s) => ({ x: (1 - s) * (1 - s) * A.x + 2 * (1 - s) * s * Q.x + s * s * B.x, y: (1 - s) * (1 - s) * A.y + 2 * (1 - s) * s * Q.y + s * s * B.y });
    g.strokeStyle = '#00f5d4';
    g.lineWidth = 4;
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const pt = bz((q * i) / 24);
      if (i) g.lineTo(pt.x, pt.y);
      else g.moveTo(pt.x, pt.y);
    }
    g.stroke();
    const pt = bz(q);
    g.fillStyle = '#f8fafc';
    g.fillRect(pt.x - 6, pt.y - 6, 12, 12);
    g.font = '900 14px "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#e2e8f0';
    g.fillText('TÓQUIO', A.x, A.y + 24);
    g.fillText('BARCELONA', B.x, B.y + 24);
    g.textAlign = 'left';
    g.font = '900 16px "Consolas", monospace';
    g.fillStyle = '#a5f3fc';
    g.fillText(`TEMPO RESTANTE ${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`, 12, shh - 34);
    g.fillStyle = '#64748b';
    g.fillText('ALTITUDE 11.000 m', 12, shh - 12);
    return { cv: ROUTE.cv, dirty: true };
  }
  // Barcelona: fachadas, a cidade lá no fim da rua e as palmeiras
  const facadeCv = (v) =>
    paint('facade' + v, 120, 120, (g, w, h) => {
      const walls = ['#e7c9a0', '#d6b38a', '#ecd5b0'];
      const shut = ['#166534', '#1e3a8a', '#9a3412'];
      g.fillStyle = walls[v % 3];
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(120,80,40,0.25)';
      g.fillRect(0, 0, w, 6);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const x = 10 + c * 38;
          const y = 14 + r * 30;
          g.fillStyle = '#3b2a1a';
          g.fillRect(x, y, 22, 20);
          g.fillStyle = shut[(v + c) % 3];
          g.fillRect(x - 5, y, 5, 20);
          g.fillRect(x + 22, y, 5, 20);
          // varandinha de ferro
          g.fillStyle = '#1f2937';
          g.fillRect(x - 3, y + 18, 28, 2);
          for (let b = 0; b < 7; b++) g.fillRect(x - 2 + b * 4, y + 20, 1, 5);
        }
      }
      // térreo: loja com toldo listrado
      g.fillStyle = '#2a1d12';
      g.fillRect(8, h - 22, w - 16, 22);
      for (let s = 0; s < 8; s++) {
        g.fillStyle = s % 2 ? '#f8fafc' : ['#dc2626', '#1d4ed8', '#16a34a'][v % 3];
        g.fillRect(6 + s * 13.5, h - 30, 13.5, 8);
      }
    });
  const bcnCityCv = () =>
    paint('bcnCity', 1024, 300, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const hy = h - 60;
      // o mar à esquerda
      g.fillStyle = '#0284c7';
      g.fillRect(0, hy - 34, w * 0.42, 34);
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 14; i++) g.fillRect((i * 71) % (w * 0.4), hy - 30 + (i % 3) * 9, 16, 2);
      // a cidade cor de areia
      for (let i = 0; i < 22; i++) {
        const r = hash(i, 7);
        const bw = 40 + r * 34;
        const bh = 26 + r * 50;
        const x = i * 48 - 10;
        g.fillStyle = i % 2 ? '#e7c9a0' : '#d6b38a';
        g.fillRect(x, hy - bh, bw, bh + 60);
        g.fillStyle = 'rgba(120,80,40,0.35)';
        for (let wy = hy - bh + 8; wy < hy - 4; wy += 11) for (let wx = x + 6; wx < x + bw - 6; wx += 11) g.fillRect(wx, wy, 4, 6);
      }
      // as torres da basílica
      const sag = w * 0.5;
      [[-44, 170], [-15, 220], [15, 220], [44, 170]].forEach(([dx, th]) => {
        g.fillStyle = '#b08a5e';
        g.beginPath();
        g.moveTo(sag + dx - 13, hy + 4);
        g.lineTo(sag + dx - 8, hy - th * 0.7);
        g.lineTo(sag + dx, hy - th);
        g.lineTo(sag + dx + 8, hy - th * 0.7);
        g.lineTo(sag + dx + 13, hy + 4);
        g.closePath();
        g.fill();
        g.fillStyle = '#8a6a44';
        for (let y = hy - th * 0.62; y < hy; y += 13) g.fillRect(sag + dx - 3, y, 6, 5);
        g.fillStyle = '#f59e0b';
        g.fillRect(sag + dx - 2, hy - th - 8, 4, 8);
      });
      // o estádio do Barcha
      const stx = w * 0.84;
      g.fillStyle = '#7f1d1d';
      g.beginPath();
      g.ellipse(stx, hy + 4, 120, 42, 0, Math.PI, 0);
      g.fill();
      g.fillStyle = '#1e40af';
      g.fillRect(stx - 120, hy - 6, 240, 8);
      g.fillStyle = '#facc15';
      g.font = '900 13px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.fillText('ESTADI BARCHA', stx, hy - 16);
      g.fillStyle = '#c9a77f';
      g.fillRect(0, hy, w, h - hy);
    });
  const palmCv = () =>
    paint('palm', 96, 200, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#5b3b1d';
      for (let y = 40; y < h; y += 6) g.fillRect(44 + Math.sin(y * 0.03) * 3, y, 9, 5);
      g.fillStyle = '#14532d';
      for (let f = 0; f < 7; f++) {
        const a = -Math.PI / 2 + (f - 3) * 0.55;
        g.save();
        g.translate(48, 42);
        g.rotate(a);
        g.beginPath();
        g.ellipse(26, 0, 30, 6, 0.25, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      g.fillStyle = '#166534';
      g.fillRect(42, 36, 12, 10);
    });

  // o avião de verdade (caixas) voando para o sul (+y); p = centro da fuselagem
  function plane3D(K, p, light) {
    const [x, y, z] = p;
    const o = { color: '#f1f5f9', top: '#e2e8f0', light };
    K.box(Object.assign({ x0: x - 0.32, y0: y - 2.4, x1: x + 0.32, y1: y + 2.4, z0: z - 0.32, z1: z + 0.32 }, o));
    K.box(Object.assign({ x0: x - 0.22, y0: y + 2.4, x1: x + 0.22, y1: y + 2.95, z0: z - 0.24, z1: z + 0.18 }, o));
    K.box({ x0: x - 3.1, y0: y - 0.45, x1: x + 3.1, y1: y + 0.5, z0: z - 0.08, z1: z + 0.02, color: '#cbd5e1', light });
    K.box({ x0: x - 1.2, y0: y - 2.4, x1: x + 1.2, y1: y - 1.9, z0: z + 0.04, z1: z + 0.1, color: '#cbd5e1', light });
    K.box({ x0: x - 0.05, y0: y - 2.4, x1: x + 0.05, y1: y - 1.45, z0: z + 0.3, z1: z + 1.35, color: '#00b4d8', light });
    [-1.35, 1.35].forEach((dx) => K.box({ x0: x + dx - 0.16, y0: y - 0.15, x1: x + dx + 0.16, y1: y + 0.75, z0: z - 0.42, z1: z - 0.1, color: '#94a3b8', light }));
    // a barriga (vista de baixo, na sombra)
    K.floor({ x0: x - 0.32, y0: y - 2.4, x1: x + 0.32, y1: y + 2.95, z: z - 0.33, color: '#64748b', light });
    K.floor({ x0: x - 3.1, y0: y - 0.45, x1: x + 3.1, y1: y + 0.5, z: z - 0.085, color: '#94a3b8', light });
    K.floor({ x0: x - 0.32, y0: y + 0.2, x1: x + 0.32, y1: y + 0.32, z: z - 0.335, color: '#00b4d8', light });
  }

  register('spain_flight', {
    phases: [170, 130, 200, 210],
    music: 'travel',
    title: '✈ INTERLÚDIO • A VIAGEM',
    tags: ['PLANO 1 • HANEDA, 06:00', 'PLANO 2 • DECOLAGEM', 'PLANO 3 • 14 HORAS', 'PLANO 4 • BARCELONA'],
    subs: [
      [{ from: 24, text: 'A primeira vez fora do Japão.' }],
      [],
      [{ from: 2, who: 'VOCÊ', text: '(Do outro lado do mundo, os monstros jogam.)', color: '#00f5d4' }],
      [{ from: 70, who: 'VOCÊ', text: '(Sol, calor... e futebol.)', color: '#00f5d4' }]
    ],
    theme: 'worldcup_england',
    scene(K, S) {
      const { t, phase, p } = S;
      const traveler = CE.spainCast().traveler;
      if (phase === 0) {
        // Haneda ao amanhecer, pelo vidro do terminal
        K.expo(0.95);
        K.sky('#0b1640', '#f97316', 0.25);
        K.fog('#3a2a52', 0.012);
        K.ambient('#a99cc4');
        const eye = [VX - 2.6 + t * 0.004, 0.95, 19.9];
        K.cam(eye, [VX - 0.4 + t * 0.004, 1.05, 12.0], 48);
        K.floor({ x0: 60, y0: -40, x1: 112, y1: 13, color: '#1c1838', light: [0.75, 0.7, 0.85] });
        K.floor({ x0: 60, y0: 6.6, x1: 112, y1: 9.8, z: 0.006, color: '#151226', light: [0.75, 0.7, 0.85] });
        // luzes da pista
        const lights = [];
        [[10.2, 0], [7.6, 1], [3.8, 0], [-2, 0]].forEach(([y, c]) => {
          for (let x = 66; x < 108; x += 1.6) lights.push({ x0: x, y0: y, x1: x + 0.12, y1: y + 0.12, z0: 0, z1: 0.08, c });
        });
        boxes(K, lights.filter((l) => !l.c), { color: '#fbbf24', em: true });
        boxes(K, lights.filter((l) => l.c), { color: '#38bdf8', em: true });
        // a cidade e o sol nascendo lá no fundo
        K.quad({ x: VX + 4, y: -30, z: -0.6, w: 80, h: 15.6, ang: -Math.PI / 2, img: dawnCityCv(), light: [0.85, 0.72, 0.8] });
        glowAt(K, VX + 16, -29, 2.4, 22, '#fdba74', 0.75, eye);
        glowAt(K, VX + 16, -28.8, 2.4, 3.2, '#fff7ed', 1, eye);
        // o avião taxiando lá fora
        const px = VX - 4.5 + t * 0.012;
        K.quad({ x: px, y: 8.2, z: 0, w: 5.2, h: 2.25, ang: -Math.PI / 2, img: planeSideCv(), light: [1.0, 0.86, 0.84] });
        glowAt(K, px - 2.15, 8.15, 1.62, 0.5, '#f87171', 0.8 + 0.2 * Math.sin(t * 0.3), eye);
        // o terminal: chão, caixilhos do vidro e o painel de partidas
        K.floor({ x0: VX - 10, y0: 13.1, x1: VX + 10, y1: 24, z: 0.004, color: '#0d1022', light: [0.75, 0.72, 0.9] });
        const fr = [];
        for (let i = 0; i < 9; i++) fr.push({ x0: VX - 9 + i * 2.4, y0: 13.0, x1: VX - 9 + i * 2.4 + 0.14, y1: 13.14, z0: 0, z1: 3.4 });
        fr.push({ x0: VX - 10, y0: 13.0, x1: VX + 10, y1: 13.14, z0: 0.3, z1: 0.42 });
        fr.push({ x0: VX - 10, y0: 13.0, x1: VX + 10, y1: 13.14, z0: 2.6, z1: 2.76 });
        boxes(K, fr, { color: '#060914', light: [0.6, 0.6, 0.7] });
        K.quad({ x: VX, y: 13.08, z: 0, w: 20, h: 3.4, ang: Math.PI / 2, color: '#93c5fd', alpha: 0.05, em: true });
        const bd = boardCv(t);
        const bx = VX + 1.7;
        const by = 15.6;
        K.box({ x0: bx - 0.02, y0: by - 0.02, x1: bx + 0.02, y1: by + 0.02, z0: 2.15, z1: 3.4, color: '#111827' });
        K.quad({ x: bx, y: by, z: 1.78, w: 1.62, h: 0.36, ang: toward(bx, by, eye) + Math.PI, img: bd.cv, dirty: bd.dirty, em: true, color: '#d1d5db' });
        K.actor(traveler, { x: VX - 1.55, y: 14.15, ang: -Math.PI / 2, light: [0.4, 0.36, 0.52] });
      } else if (phase === 1) {
        // a decolagem vista de baixo: o avião passa por cima da câmera
        K.expo(1.0);
        K.sky('#1e3a8a', '#fbbf24', 0);
        K.fog('#f59e0b', 0.004);
        const k = seg(t, 6, 104);
        const shake = 0.05 * Math.max(0, 1 - Math.abs(k - 0.3) * 3.2);
        const eye = [VX - 0.85 + K.noise(S.f, 1) * shake, 0.28 + K.noise(S.f, 2) * shake, 13.0];
        K.cam(eye, [VX + 0.4, 2.8, 22.0], 62);
        K.floor({ x0: 50, y0: -20, x1: 122, y1: 80, color: '#24302a', light: [0.8, 0.72, 0.62] });
        K.floor({ x0: VX - 1.6, y0: -20, x1: VX + 1.6, y1: 80, z: 0.006, color: '#0b0f1c', light: [0.8, 0.75, 0.7] });
        const marks = [];
        const edge = [];
        for (let y = -20; y < 80; y += 1.7) {
          marks.push({ x0: VX - 0.06, y0: y, x1: VX + 0.06, y1: y + 0.85, z0: 0, z1: 0.012 });
          edge.push({ x0: VX - 1.66, y0: y, x1: VX - 1.54, y1: y + 0.12, z0: 0, z1: 0.07 }, { x0: VX + 1.54, y0: y, x1: VX + 1.66, y1: y + 0.12, z0: 0, z1: 0.07 });
        }
        boxes(K, marks, { color: '#fbbf24', light: [1, 0.95, 0.85] });
        boxes(K, edge, { color: '#fde68a', em: true });
        glowAt(K, VX + 9, 70, 9, 26, '#fde68a', 0.8, eye);
        glowAt(K, VX + 9, 69.8, 9, 4, '#fffbeb', 1, eye);
        if (k > 0 && k < 1) {
          const at = (q) => [VX + 0.3 + q * 1.6, 4 + q * 56, 1.6 + q * 12.4];
          const pp = at(k);
          plane3D(K, pp, [0.95, 0.85, 0.82]);
          // rastro de condensação atrás dos motores
          for (let i = 1; i <= 10; i++) {
            const q = at(Math.max(0, k - i * 0.012));
            [-1.35, 1.35].forEach((dx) => glowAt(K, q[0] + dx, q[1] - 0.3, q[2] - 0.3, 0.45 + i * 0.07, '#ffffff', 0.45 * (1 - i / 11), eye));
          }
        }
      } else if (phase === 2) {
        // a janelinha do avião: o céu passa de noite para dia em 14 horas
        const k = p;
        const mixSky = (a, b, c) => (k < 0.5 ? hexMix(a, b, k * 2) : hexMix(b, c, (k - 0.5) * 2));
        K.expo(0.95);
        K.sky(mixSky('#020617', '#1e3a8a', '#0369a1'), mixSky('#1e1b4b', '#fb923c', '#bae6fd'), Math.max(0, 1 - k * 2.6));
        K.fog(mixSky('#0b1028', '#f6a564', '#cfe9fb'), 0.015);
        const amb = mixSky('#5d6f9e', '#f2b98a', '#f4e7d6');
        K.ambient(amb);
        const eye = [VX - 0.5 + K.noise(S.f, 6) * 0.003, 1.02, 18.05];
        K.cam(eye, [VX + 0.15, 0.95, 16.4], 46);
        // lá fora: nuvens passando, o sol nascendo e a ponta da asa
        const cloud = mixSky('#334155', '#fed7aa', '#ffffff');
        [[9.5, 0.2, 2.6, 0.5], [5.5, -0.2, 5.0, 0.8], [1.0, -0.6, 7.5, 1]].forEach(([y, z, sp, a], L) => {
          for (let i = 0; i < 5; i++) {
            const x = ((((i * 7.3 - t * sp * 0.012) % 36) + 36) % 36) + VX - 18;
            K.quad({ x, y: y - L * 0.2, z, w: 6 + L * 2, h: 1.9 + L * 0.5, ang: -Math.PI / 2, img: cloudCv(), color: cloud, alpha: a, em: true });
          }
        });
        const sunK = seg(k, 0.3, 0.75);
        if (sunK > 0) {
          glowAt(K, VX + 3, -14, lerp(-2.5, 4, sunK), 10, '#ffedd5', 0.85 * sunK, eye);
          glowAt(K, VX + 3, -13.9, lerp(-2.5, 4, sunK), 1.6, '#fffbeb', sunK, eye);
        }
        K.box({ x0: VX - 0.15, y0: 11.4, x1: VX + 1.1, y1: 16.1, z0: 0.52, z1: 0.58, color: hexMix('#334155', '#e2e8f0', k), light: c01(amb) });
        glowAt(K, VX + 0.2, 11.5, 0.6, 0.45, '#f87171', 0.9, eye);
        // a cabine: parede com as janelas, bagageiro, teto, chão e as poltronas
        [-4.8, -2.4, 0, 2.4, 4.8].forEach((dx) => K.quad({ x: VX + dx, y: 16.4, z: 0.12, w: 2.4, h: 1.8, ang: -Math.PI / 2, img: cabinWallCv() }));
        K.box({ x0: VX - 6, y0: 16.4, x1: VX + 6, y1: 17.0, z0: 1.45, z1: 1.62, color: '#e2e8f0', top: '#cbd5e1' });
        K.box({ x0: VX - 5, y0: 16.4, x1: VX + 5, y1: 19.5, z0: 1.62, z1: 1.9, color: '#94a3b8' });
        K.floor({ x0: VX - 5, y0: 16.4, x1: VX + 5, y1: 19.5, z: 0.12, color: '#1e293b' });
        const seats = [];
        [-1.6, 0.55].forEach((sx) => seats.push({ x0: VX + sx, y0: 16.5, x1: VX + sx + 0.16, y1: 17.7, z0: 0.12, z1: 1.0 }));
        boxes(K, seats, { color: '#1e3a8a', top: '#1d4ed8' });
        const rc = routeCv(easeIO(p));
        const sx = VX + 0.545;
        K.quad({ x: sx, y: 17.2, z: 0.56, w: 0.5, h: 0.33, ang: 0, img: rc.cv, dirty: rc.dirty, em: true, color: '#e5e7eb' });
        const day = k > 0.45;
        K.actor(traveler, { x: VX - 0.62, y: 17.1, z: -0.05, ang: -Math.PI / 2, view: 'back', light: mix(c01(amb), [1, 1, 1], 0.2).map((v) => v * (day ? 0.95 : 0.75)) });
      } else {
        // Barcelona: a câmera desce do sol até a rua e encontra você
        K.expo(1.0);
        K.sky('#0369a1', '#bae6fd', 0);
        K.fog('#cde8f6', 0.014);
        K.ambient('#fff1dc');
        const tilt = easeIO(seg(t, 0, 100));
        const eye = [VX - 0.1, 1.05, VY + 3.4];
        K.cam(eye, K.mix([VX + 1.4, 7.2, VY - 10], [VX, 1.0, VY - 10], tilt), 52);
        glowAt(K, VX + 4, VY - 26, 11, 9, '#ffedd5', 0.85, eye);
        glowAt(K, VX + 4, VY - 25.9, 11, 1.8, '#fffbeb', 1, eye);
        K.floor({ x0: VX - 12, y0: VY - 32, x1: VX + 12, y1: VY + 6, color: '#c9a27a' });
        boxes(K, [{ x0: VX - 3.2, y0: VY - 32, x1: VX - 2.0, y1: VY + 6, z0: 0, z1: 0.06 }, { x0: VX + 2.0, y0: VY - 32, x1: VX + 3.2, y1: VY + 6, z0: 0, z1: 0.06 }], { color: '#b8956c', top: '#e3cfae' });
        for (let i = 0; i < 9; i++) {
          const y = VY + 2.5 - i * 3.6;
          K.quad({ x: VX - 3.2, y, z: 0, w: 3.6, h: 3.6, ang: Math.PI, img: facadeCv(i % 3), light: [0.84, 0.8, 0.78] });
          K.quad({ x: VX + 3.2, y: y - 1.2, z: 0, w: 3.6, h: 3.6, ang: 0, img: facadeCv((i + 1) % 3), light: [1.12, 1.06, 0.95] });
        }
        K.quad({ x: VX, y: VY - 31, z: -0.6, w: 40, h: 11.7, ang: -Math.PI / 2, img: bcnCityCv(), light: [1.0, 0.98, 0.95] });
        [[VX - 2.6, VY - 0.6], [VX + 2.6, VY - 4.2], [VX - 2.6, VY - 9.4]].forEach(([x, y]) => K.quad({ x, y, z: 0, w: 1.7, h: 3.5, ang: toward(x, y, eye) + Math.PI, img: palmCv(), light: [0.95, 0.95, 0.9] }));
        // você entra no quadro pela esquerda, de costas, e se espreguiça
        const enter = ease(seg(t, 80, 118));
        if (t >= 74) {
          const walking = t < 118;
          K.actor(traveler, { x: lerp(VX - 1.8, VX - 0.35, enter), y: lerp(VY + 2.3, VY + 0.9, enter), ang: walking ? -Math.PI / 4 : -Math.PI / 2, anim: walking ? 'run' : t > 128 ? 'call_pass' : 'idle', frame: walking ? Math.floor(S.f * 0.45) : S.f, light: [1.12, 1.06, 0.98] });
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      if (phase === 0) {
        // reflexos andando no vidro
        const off = (t * 1.1) % 330;
        ctx.fillStyle = 'rgba(255,255,255,0.035)';
        for (let x = -330 - off; x < W + 330; x += 330) {
          ctx.beginPath();
          ctx.moveTo(x + 60, top);
          ctx.lineTo(x + 140, top);
          ctx.lineTo(x + 40, bot);
          ctx.lineTo(x - 40, bot);
          ctx.closePath();
          ctx.fill();
        }
      } else if (phase === 1) {
        const k = seg(t, 6, 104);
        const sun = K.screen(VX + 9, 9, 70);
        if (sun) [[0.55, 26, 'rgba(56,189,248,0.4)'], [1.05, 46, 'rgba(251,146,60,0.35)'], [1.5, 18, 'rgba(255,255,255,0.4)']].forEach(([q, r, c]) => CE.cineGlow(ctx, sun.x + (W / 2 - sun.x) * q, sun.y + ((top + bot) / 2 - sun.y) * q, r, c, 0.8));
        if (k > 0 && k < 1) {
          ctx.save();
          ctx.translate(W / 2, H / 2);
          ctx.rotate(-0.42);
          ctx.translate(-W / 2, -H / 2);
          CE.drawSpeedLines(ctx, W, H, '#ffffff', 0.1);
          ctx.restore();
        }
        const tk = seg(t, 84, 100);
        if (tk > 0) {
          CE.cineImpactText(ctx, 'TÓQUIO  ✈  BARCELONA', W / 2, bot - 120, 54, '#f8fafc', tk, W * 0.8);
          ctx.save();
          ctx.globalAlpha = seg(t, 96, 112);
          CE.espText(ctx, '10.400 KM • 14 HORAS DE VOO', W / 2, bot - 66, 20, '#fde68a', 'center', '900');
          ctx.restore();
        }
        CE.cineSfx(S, 16, 'takeoff', () => window.SFX?.whoosh?.());
      } else if (phase === 3) {
        // gaivotas
        ctx.strokeStyle = 'rgba(15,23,42,0.7)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
          const gx = ((i * 260 + t * (1.2 + i * 0.2)) % (W + 200)) - 100;
          const gy = top + 40 + i * 34 + Math.sin(t * 0.05 + i) * 8 + seg(t, 0, 100) * 160;
          const fl = Math.sin(t * 0.25 + i * 2) * 5;
          ctx.beginPath();
          ctx.moveTo(gx - 14, gy - fl);
          ctx.lineTo(gx, gy);
          ctx.lineTo(gx + 14, gy - fl);
          ctx.stroke();
        }
        CE.cineDust(ctx, W, H, t, 26, 'rgba(254,240,138,0.6)', 2);
        const k = ease(seg(t, 96, 124));
        if (k > 0) {
          const x0 = W * 0.48;
          const y0 = top + 34;
          const w = 560 * k;
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(x0, y0, w, 12);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(x0, y0 + 12, w, 22);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(x0, y0 + 34, w, 12);
          ctx.save();
          ctx.globalAlpha = seg(t, 104, 120);
          CE.espText(ctx, 'BARCELONA, ESPANHA', x0 + 4 + (1 - k) * 40, y0 + 92, 50, '#f8fafc', 'left');
          CE.espText(ctx, '41°23′N • 13:40 • 31 °C', x0 + 8, y0 + 138, 17, '#fde68a', 'left', '800');
          ctx.restore();
        }
      }
    }
  });

  // ==========================================================================
  // 3) EL CLÁSICO — o campo do prédio à noite (você na arquibancada do sul)
  // ==========================================================================
  const SOUTH = [[21.15, 0.22], [21.75, 0.44], [22.35, 0.66]]; // degraus: y da frente, altura
  let CLA = null;
  function clasicoCrowd() {
    if (CLA) return CLA;
    const people = crowdOf('cla', 24, ['#7f1d1d', '#1e40af', '#facc15', '#f8fafc', '#991b1b', '#1d4ed8'], 5);
    CLA = [];
    let n = 0;
    SOUTH.forEach(([y, z], r) => {
      for (let i = 0; i < 8; i++) {
        const x = 49.3 + i * 0.72 + (r % 2) * 0.36;
        if (r === 0 && Math.abs(x - 51.5) < 0.4) continue; // você
        if (Math.abs(x - 52.25) < [0.42, 0.62, 0.85][r]) continue; // a câmera passa aqui
        CLA.push({ x, y: y + 0.3, z, cd: people[n++ % people.length], arms: hash(i, r + 2) < 0.45, ph: hash(i, r) * 6 });
      }
    });
    return CLA;
  }
  function southStands(K, t, cheer) {
    boxes(K, SOUTH.map(([y, z]) => ({ x0: 46, y0: y, x1: 60.9, y1: 22.95, z0: 0, z1: z })), { color: '#150910', top: '#2a0f19' });
    clasicoCrowd().forEach((f, i) => {
      const jump = cheer * Math.max(0, Math.sin(t * 0.2 + f.ph)) * 0.07;
      K.actor(f.cd, { id: 'f' + i, x: f.x, y: f.y, z: f.z + jump, ang: -Math.PI / 2, anim: f.arms && cheer > 0.3 ? 'call_pass' : 'idle', frame: 0, k: 0.86, light: [0.32, 0.26, 0.34] });
    });
  }
  // sinalizadores vermelhos na torcida do outro lado
  function flares(K, t, eye) {
    [[48.2, 0], [54.6, 2], [58.6, 4]].forEach(([x, s]) => glowAt(K, x, 6.1, 1.85, 1.6, '#f87171', 0.45 + 0.2 * Math.sin(t * 0.07 + s), eye));
  }
  const sc = () => CE.spainCast();
  function teams(K) {
    const kitB = { jerseyPrimary: sc().bunny.jerseyPrimary, jerseySecondary: sc().bunny.jerseySecondary };
    const kitR = { jerseyPrimary: '#f8fafc', jerseySecondary: '#a78bfa' };
    const bl = crowdOf('barcha', 4, ['#7f1d1d'], 9).map((c) => Object.assign({}, c, kitB, { outfit: undefined }));
    const rl = crowdOf('real', 4, ['#f8fafc'], 13).map((c) => Object.assign({}, c, kitR, { outfit: undefined }));
    [[50.2, 12.6], [50.6, 16.4], [48.8, 14.5], [51.4, 18.6]].forEach(([x, y], i) => K.actor(bl[i], { id: 'b' + i, x, y, ang: 0, frame: 0, k: 0.86 }));
    [[55.8, 12.4], [55.4, 16.6], [57.2, 14.5], [54.6, 10.4]].forEach(([x, y], i) => K.actor(rl[i], { id: 'r' + i, x, y, ang: Math.PI, frame: 0, k: 0.86 }));
  }

  register('clasico_bunny', {
    phases: [170, 200, 190, 190, 130],
    music: 'epic',
    title: '⚽ EL CLÁSICO • FC BARCHA x RE AL',
    tags: ['PLANO 1 • O ESTÁDIO', 'PLANO 2 • A PROVOCAÇÃO', 'PLANO 3 • O SHOW DO BUNNY', 'PLANO 4 • O ESTÁDIO EXPLODE', 'PLANO 5 • O OLHAR DO SAE'],
    subs: [
      [{ from: 8, text: '98 mil pessoas. E você no meio delas.' }],
      [{ from: 4, who: 'BUNNY IGLESIAS', text: '"Ei, Sae! Você é só o figurante."', color: '#fb7185' }],
      [{ from: 52, who: 'BUNNY IGLESIAS', text: '"Pra quê olhar?"', color: '#fb7185' }],
      [{ from: 18, who: 'BUNNY IGLESIAS', text: '"Viu, Sae? O campo é MEU."', color: '#fb7185' }],
      [{ from: 4, who: 'SAE ITOSHI', text: '"...Fala demais."', color: '#2dd4bf' }]
    ],
    theme: 'worldcup_england',
    scene(K, S) {
      const { t, phase } = S;
      const cast = sc();
      const pinkL = [1.22, 0.98, 1.04];
      if (phase === 0) {
        // o estádio de noite: a grua desce até a torcida; você no meio dela
        K.expo(0.92);
        const k = easeIO(seg(t, 0, 130));
        const eye = K.mix([53, 5.6, 22.7], [52.25, 1.3, 22.75], k);
        K.cam(eye, K.mix([53, 0.0, 12.5], [53, 0.45, 14.5], k), lerp(56, 50, k));
        southStands(K, t, 0.35);
        flares(K, t, eye);
        teams(K);
        K.actor(cast.traveler, { x: 51.5, y: SOUTH[0][0] + 0.3, z: SOUTH[0][1], ang: -Math.PI / 2, light: [0.42, 0.36, 0.42] });
        K.actor(cast.bunny, { x: 52.6, y: 14.5, ang: 0, k: 0.9 });
        K.actor(cast.sae, { x: 53.4, y: 14.5, ang: Math.PI, k: 0.9 });
      } else if (phase === 1) {
        K.expo(0.95);
        if (t < 100) {
          // o Bunny provoca (por cima do ombro do Sae)
          const k = easeIO(t / 100);
          const eye = [54.6, 0.84, 15.25];
          K.cam(eye, [52.75, lerp(0.6, 0.64, k), 14.55], lerp(34, 31, k));
          flares(K, t, eye);
          K.actor(cast.bunny, { x: 52.55, y: 14.5, ang: 0, anim: 'call_pass', k: 0.9, light: pinkL });
          K.actor(cast.sae, { x: 53.45, y: 14.5, ang: Math.PI, k: 0.9, light: [0.3, 0.3, 0.44] });
          glowAt(K, 52.5, 14.2, 0.6, 1.8, '#f43f5e', 0.28, eye);
        } else {
          // o Sae responde (por cima do ombro do Bunny)
          const k = easeIO((t - 100) / 100);
          const eye = [51.4, 0.8, 13.75];
          K.cam(eye, [53.25, lerp(0.6, 0.62, k), 14.45], lerp(32, 29, k));
          K.actor(cast.bunny, { x: 52.55, y: 14.5, ang: 0, anim: 'call_pass', k: 0.9, light: [0.22, 0.12, 0.2] });
          K.actor(cast.sae, { x: 53.45, y: 14.5, ang: Math.PI, k: 0.9, light: [0.95, 1.05, 1.1] });
          glowAt(K, 53.5, 14.8, 0.6, 1.6, '#2dd4bf', 0.18, eye);
        }
      } else if (phase === 2) {
        if (t < 108) {
          // o calcanhar por cima do marcador, a câmera correndo junto
          const bx = 48.6 + t * 0.032;
          const impact = t >= 60 && t < 70;
          const eye = [bx + 0.55 + (t > 78 && t < 92 ? K.noise(S.f, 3) * 0.02 : 0), 0.62, 14.55];
          K.cam(eye, [bx + 0.95, 0.6, 12.2], 44);
          if (impact) {
            K.expo(1.0);
            K.sky('#f43f5e', '#f43f5e', 0);
            K.fog('#f43f5e', 0.06);
            // quadro de impacto: tudo chapado em rosa atrás e embaixo deles
            K.quad({ x: bx + 1.2, y: 10.4, z: -0.5, w: 30, h: 12, ang: Math.PI / 2, color: '#f43f5e', light: [1.15, 1.15, 1.15] });
            K.floor({ x0: bx - 8, y0: 10.4, x1: bx + 10, y1: 16, z: 0.012, color: '#f43f5e', light: [1.0, 1.0, 1.0] });
          } else K.expo(0.95);
          const lunaX = t < 56 ? lerp(56.5, 51.0, ease(t / 56)) : t < 72 ? 51.0 : 51.0 - (t - 72) * 0.05;
          const b64 = 48.6 + 64 * 0.032;
          const a = seg(t, 64, 100);
          const ball = t < 60 ? [bx + 0.3, 12.15, 0.09] : t < 64 ? [bx - 0.3, 12.2, 0.18] : [lerp(b64 - 0.35, b64 + 2.4, a), 12.2, 0.12 + Math.sin(a * Math.PI) * 1.65];
          K.actor(cast.bunny, { x: bx, y: 12.2, ang: 0, anim: t >= 56 && t < 76 ? 'rabona' : 'run', k: 0.9, dark: impact, light: impact ? undefined : pinkL });
          K.actor(cast.luna, { x: lunaX, y: 12.45, ang: Math.PI, anim: t < 50 ? 'run' : 'slide', k: 0.9, dark: impact });
          K.ball(ball[0], ball[1], ball[2], impact ? { light: [2, 2, 2] } : {});
        } else {
          // o passe sem olhar: ele olha para a câmera e a bola vai para o outro lado
          const tt = t - 108;
          K.expo(0.95);
          const eye = [52.45, 0.6, 13.55];
          K.cam(eye, [53.15, 0.56, 11.6], 38);
          flares(K, t, eye);
          K.actor(cast.bunny, { x: 52.7, y: 11.85, ang: Math.PI / 2, view: 'front', k: 0.9, light: pinkL });
          K.actor(cast.lavinho, { x: lerp(57.8, 55.95, ease(seg(tt, 0, 40))), y: 10.05, ang: Math.PI, anim: tt < 40 ? 'run' : 'idle', k: 0.9 });
          const a = easeIO(seg(tt, 6, 44));
          K.ball(lerp(52.86, 55.72, a), lerp(11.78, 10.12, a), 0.1 + Math.sin(a * Math.PI) * 0.28);
        }
      } else if (phase === 3) {
        const hit = 26;
        if (t < 84) {
          // a rede estufa: gol do Barcha
          K.expo(0.95);
          const sh = t >= hit ? 0.03 * Math.max(0, 1 - (t - hit) / 30) : 0;
          const eye = [51.55 + K.noise(S.f, 1) * sh, 0.5 + K.noise(S.f, 2) * sh, 9.3];
          K.cam(eye, [53.0, 0.6, 6.4], 44);
          flares(K, t, eye);
          K.actor(cast.luna, { x: 53.75, y: 6.75, z: t > 10 ? 0.15 : 0, ang: Math.PI / 2, anim: t > 8 ? 'dive' : 'idle', left: false, k: 0.9 });
          const bk = Math.min(1, t / hit);
          if (t < hit) K.ball(lerp(52.9, 52.4, bk), lerp(10.6, 6.3, bk), lerp(0.25, 0.82, bk), { k: 0.8 });
          else K.ball(52.4, 6.15, Math.max(0.09, 0.82 - (t - hit) * 0.03), { k: 0.8 });
        } else {
          // o Bunny apontando para o Sae; o Sae parado lá atrás
          const tt = t - 84;
          K.expo(0.95);
          const eye = [53.15 + K.noise(S.f, 4) * 0.006, 0.36, 11.3];
          K.cam(eye, [53.05, 0.78, 9.0], 42);
          flares(K, t, eye);
          const rise = ease(tt / 22);
          K.actor(cast.bunny, { x: 53.45, y: 9.6, z: (rise - 1) * 0.35, ang: Math.PI / 2, anim: 'call_pass', left: true, k: 0.9, light: pinkL });
          glowAt(K, 53.45, 9.4, 0.6, 1.9, '#f43f5e', 0.25, eye);
          K.actor(cast.sae, { x: 51.4, y: 7.6, ang: Math.PI / 2, k: 0.9, light: [0.42, 0.44, 0.58] });
        }
      } else {
        // o olho do Sae em close, frio; a pálpebra desce
        K.expo(0.92);
        const e = easeIO(t / 130);
        const eye = [53.02, 0.6, lerp(13.4, 13.3, e)];
        K.cam(eye, [53.0, 0.57, 12.0], 27);
        flares(K, t, eye);
        K.actor(cast.sae, { x: 53.0, y: 12.0, ang: Math.PI / 2, view: 'front', k: 0.9, light: [1.08, 0.92, 0.98] });
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const cast = sc();
      const pink = '#f43f5e';
      if (phase === 0) {
        if (t > 40) CE.espScoreboard(ctx, 24, top + 14, 0, 0, "00'");
        CE.cineTitleCard(ctx, W, top + 180, seg(t, 64, 96), { kicker: 'BARCELONA • 21:00', title: 'EL CLÁSICO', sub: 'FC BARCHA x RE AL', color: '#facc15' });
      } else if (phase === 1) {
        CE.cineBokeh(ctx, W, top + 20, top + 200, t, 14, ['rgba(251,113,133,0.3)', 'rgba(253,230,138,0.25)'], 6);
        if (t < 100) CE.drawRadialSpeedLines(ctx, W * 0.45, top + 200, W, pink, 0.08);
      } else if (phase === 2) {
        if (t < 108) {
          const impact = t >= 60 && t < 70;
          if (impact) {
            // o caminho que a bola vai fazer: do calcanhar, por cima da cabeça, até a frente
            const b64 = 48.6 + 64 * 0.032;
            ctx.save();
            ctx.setLineDash([18, 12]);
            ctx.strokeStyle = '#fdf2f8';
            ctx.lineWidth = 6;
            ctx.beginPath();
            let started = false;
            for (let i = 0; i <= 30; i++) {
              const s = i / 30;
              const q = K.screen(lerp(b64 - 0.35, b64 + 2.4, s), 0.12 + Math.sin(s * Math.PI) * 1.65, 12.2);
              if (!q) continue;
              if (started) ctx.lineTo(q.x, q.y);
              else ctx.moveTo(q.x, q.y);
              started = true;
            }
            ctx.stroke();
            ctx.restore();
          } else {
            CE.drawSpeedLines(ctx, W, H, '#fda4af', 0.16);
          }
          const ck = seg(t, 60, 70);
          if (ck > 0 && t < 104) CE.cineImpactText(ctx, 'CALCANHAR!!', W * 0.7, top + 90, 70, '#fdf2f8', ck, 0, -0.08);
        } else {
          const tt = t - 108;
          const a = easeIO(seg(tt, 6, 44));
          const p0 = K.screen(52.86, 0.1, 11.78);
          const p1 = K.screen(lerp(52.86, 55.72, a), 0.1 + Math.sin(a * Math.PI) * 0.28, lerp(11.78, 10.12, a));
          if (p0 && p1 && a > 0) {
            ctx.strokeStyle = 'rgba(250,204,21,0.7)';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.quadraticCurveTo((p0.x + p1.x) / 2, Math.min(p0.y, p1.y) - 40, p1.x, p1.y);
            ctx.stroke();
          }
          CE.cineImpactText(ctx, 'PASSE SEM OLHAR!', W * 0.72, top + 70, 44, '#facc15', seg(tt, 20, 32), W * 0.46, -0.05);
        }
        CE.cineSfx(S, 60, 'heel', () => window.SFX?.kick?.(0.6));
        CE.cineSfx(S, 114, 'pass', () => window.SFX?.pass?.());
      } else if (phase === 3) {
        const hit = 26;
        if (t < 84) {
          CE.cineFlash(ctx, W, H, t >= hit ? 0.75 * kick(t, hit, 9) : 0);
          CE.cineImpactText(ctx, 'GOOOOL DO BARCHA!', W / 2, top + 100, 84, '#facc15', seg(t, hit + 2, hit + 14), W * 0.9, -0.04);
          CE.espScoreboard(ctx, 24, top + 14, t > hit + 20 ? 1 : 0, 0, "67'");
        } else {
          const tt = t - 84;
          CE.drawRadialSpeedLines(ctx, W * 0.62, top + 200, W, pink, 0.16);
          CE.drawConfetti(ctx, W, H, t, 50);
          CE.espScoreboard(ctx, 24, top + 14, 1, 0, "67'");
          CE.cineImpactText(ctx, 'EU SOU O SHOW.', W * 0.3, top + 110, 44, '#fda4af', seg(tt, 30, 42), W * 0.45, -0.06);
        }
        CE.cineSfx(S, hit, 'goal', () => window.SFX?.goal?.(true));
      } else {
        CE.cineBokeh(ctx, W, top + 20, bot - 20, t, 10, ['rgba(244,63,94,0.3)', 'rgba(250,204,21,0.2)'], 21);
        // a pálpebra descendo por cima dos olhos de verdade
        const lid = 0.12 + easeIO(seg(t, 24, 74)) * 0.3;
        const f = spot(K, 53.0, 12.0, 0, 0.9, 0);
        lids(ctx, f, lid, window.PixelRenderer.shade(cast.sae.skinColor || '#f3d1b8', -0.08));
        const g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, 'rgba(244,63,94,0.24)');
        g.addColorStop(0.45, 'rgba(244,63,94,0)');
        g.addColorStop(1, 'rgba(2,6,23,0.6)');
        ctx.fillStyle = g;
        ctx.fillRect(0, top, W, bot - top);
        CE.cineFlash(ctx, W, H, seg(t, 110, 130), '#000000');
      }
    }
  });

  // ==========================================================================
  // 4) O DISCURSO — o vestiário do prédio
  // ==========================================================================
  const SEAT_Y = 17.24;
  const SEATS = [['nagi', 35.7], ['bachira', 36.5], ['shidou', 37.3], ['rin', 39.7], ['chigiri', 40.5], ['gagamaru', 41.3], ['you', 42.2]];
  const squadChar = (id) => (id === 'you' ? 'you' : id);
  function lampCone(K, x, y, alpha, eye) {
    K.quad({ x, y, z: 0, w: 1.5, h: 1.72, ang: toward(x, y, eye), img: coneCv(), color: '#bfdbfe', alpha, em: true });
    K.floor({ x0: x - 0.7, y0: y - 0.5, x1: x + 0.7, y1: y + 0.5, z: 0.006, img: glowCv(), color: '#bfdbfe', alpha: alpha * 1.4, em: true });
  }

  register('captain_speech', {
    phases: [170, 110, 230, 100, 170],
    music: 'epic',
    title: '🎙 O DISCURSO • VESTIÁRIO DO JAPÃO',
    tags: ['PLANO 1 • O SILÊNCIO', 'PLANO 2 • DE PÉ', 'PLANO 3 • O DISCURSO', 'PLANO 4 • OS OLHOS', 'PLANO 5 • VAMOS!!!'],
    subs: [
      [{ from: 12, text: 'Lá fora, a torcida. Aqui, silêncio.' }],
      [{ from: 18, who: 'VOCÊ', text: '"...Escutem."', color: '#00f5d4' }],
      [],
      [{ from: 0, who: 'VOCÊ', text: '"E vocês?"', color: '#00f5d4' }],
      []
    ],
    theme: 'worldcup_england',
    scene(K, S) {
      const { t, phase, p } = S;
      const kit = 'japan';
      if (phase === 0) {
        // o silêncio: a câmera corre o banco, cabeças baixas, a torcida batendo na parede
        K.expo(0.7);
        const thump = Math.max(kick(t, 40, 16), kick(t, 90, 16), kick(t, 140, 16));
        const x = lerp(36.1, 41.55, easeIO(p));
        const n = K.noise(S.f, 2) * thump * 0.015;
        const eye = [x + n, 0.6 + n, 19.95];
        K.cam(eye, [x + 0.3, 0.4, 17.2], 44);
        SEATS.forEach(([id, sx]) => {
          const tap = id === 'shidou' ? Math.abs(Math.sin(t * 0.35)) * 0.012 : 0;
          const lit = id === 'you';
          K.actor(squadChar(id), { x: sx, y: SEAT_Y, z: -0.08 + tap, ang: Math.PI / 2, kit, frame: 0, light: lit ? [1.0, 1.04, 1.12] : [0.46, 0.52, 0.72] });
        });
        lampCone(K, 42.2, SEAT_Y + 0.15, 0.2 + thump * 0.05, eye);
      } else if (phase === 1) {
        // você se levanta para dentro da luz
        K.expo(0.72);
        const rise = easeIO(seg(t, 18, 66));
        const eye = [40.95, lerp(0.3, 0.36, rise), 20.55];
        K.cam(eye, [40.95, lerp(0.62, 0.78, rise), 17.6], 46);
        K.actor('you', { x: 40.95, y: lerp(SEAT_Y, 17.62, rise), z: lerp(-0.2, 0, rise), ang: Math.PI / 2, kit, light: mix([0.45, 0.5, 0.65], [1.05, 1.1, 1.18], rise) });
        lampCone(K, 40.95, 17.7, 0.28, eye);
        K.actor('rin', { x: 40.15, y: 19.4, z: -0.18, ang: -Math.PI / 2, kit, frame: 0, light: [0.06, 0.07, 0.11] });
        K.actor('bachira', { x: 41.8, y: 19.5, z: -0.2, ang: -Math.PI / 2, kit, frame: 0, light: [0.06, 0.07, 0.11] });
      } else if (phase === 2) {
        // o discurso: câmera baixa, o braço para cima
        K.expo(0.78);
        const punch = kick(t, 124, 12) + kick(t, 172, 12);
        const n = K.noise(S.f, 5) * punch * 0.03;
        const eye = [38.75 + n, 0.3 + n, 21.5 - easeIO(p) * 0.25];
        K.cam(eye, [38.2, 0.86, 19.0], 46 - punch * 2);
        const aura = t >= 168;
        K.actor('you', { x: 37.65, y: 19.0, ang: Math.PI / 2, view: 'front', kit, anim: 'call_pass', light: aura ? [0.9, 1.25, 1.2] : [1.05, 1.08, 1.12], opts: aura ? { showAura: true, auraColor: '#00f5d4' } : undefined });
        if (aura) glowAt(K, 37.65, 18.85, 0.5, 1.9, '#00f5d4', 0.32, eye);
      } else if (phase === 3) {
        // os olhos do time se abrindo, um por um (a câmera passa por cada rosto)
        K.expo(0.8);
        const x = lerp(35.6, 40.3, t / 100);
        const eye = [x, 0.58, 18.95];
        K.cam(eye, [x + 0.05, 0.55, 20.4], 34);
        [['rin', 36.0], ['shidou', 37.3], ['bachira', 38.6], ['nagi', 39.9]].forEach(([id, fx]) => K.actor(id, { x: fx, y: 20.4, ang: -Math.PI / 2, view: 'front', kit, frame: 0, light: [1.0, 1.02, 1.08] }));
      } else {
        // VAMOS!!! — todo mundo de pé, auras acesas, a onda de choque
        K.expo(0.82);
        const sh = t >= 14 ? Math.max(0, 1 - (t - 14) / 50) * 0.03 : 0;
        const eye = [38.5 + K.noise(S.f, 1) * sh, 0.24 + K.noise(S.f, 2) * sh, 21.7];
        K.cam(eye, [38.5, 0.85, 18.4], 50);
        [['bachira', 36.5, 18.3, '#facc15'], ['rin', 37.45, 18.0, '#22d3ee'], ['shidou', 39.55, 18.0, '#f97316'], ['nagi', 40.5, 18.3, '#e2e8f0']].forEach(([id, x, y, col], i) => {
          const up = ease(seg(t, i * 4, i * 4 + 20));
          const jump = Math.abs(Math.sin(t * 0.16 + i)) * 0.07 * up;
          K.actor(id, { x, y, z: up * 0.02 + jump, ang: Math.PI / 2, view: 'front', left: i > 1, kit, anim: 'call_pass', light: [1.05, 1.08, 1.12], opts: { showAura: true, auraColor: (CE.cineChar(id).auraColor || col) } });
        });
        const jumpY = Math.abs(Math.sin(t * 0.14)) * 0.06;
        K.actor('you', { x: 38.5, y: 18.9, z: jumpY, ang: Math.PI / 2, view: 'front', kit, anim: 'call_pass', light: [1.1, 1.18, 1.18], opts: { showAura: true, auraColor: '#00f5d4' } });
        for (let r = 0; r < 3; r++) {
          const rr = ((t * 0.045 + r * 0.9) % 2.7) + 0.1;
          const a = Math.max(0, 1 - rr / 2.7) * 0.8;
          K.floor({ x0: 38.5 - rr, y0: 18.9 - rr * 0.8, x1: 38.5 + rr, y1: 18.9 + rr * 0.8, z: 0.01 + r * 0.002, img: ringCv(), color: '#00f5d4', alpha: a, em: true });
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      if (phase === 0) {
        const thump = Math.max(kick(t, 40, 16), kick(t, 90, 16), kick(t, 140, 16));
        [40, 90, 140].forEach((b, i) => {
          const a = kick(t, b, 40);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.55;
          CE.espText(ctx, 'TUM...', W * (0.35 + i * 0.3), top + 70 + i * 26, 46, '#64748b', 'center', 'italic 900', null);
          ctx.restore();
        });
        CE.cineDust(ctx, W, H, t, 26 + Math.round(thump * 30), 'rgba(191,219,254,0.45)', 11);
      } else if (phase === 1) {
        CE.cineDust(ctx, W, H, t, 30, 'rgba(191,219,254,0.5)', 12);
      } else if (phase === 2) {
        CE.drawRadialSpeedLines(ctx, W * 0.3, top + 150, W, '#00f5d4', 0.06 + seg(t, 100, 200) * 0.2);
        const tx = W * 0.69;
        const l1 = 'O mundo acha que o Japão veio só participar.';
        const l2 = 'Que a gente é o time que "corre bastante".';
        const w1 = CE.cineType(l1, seg(t, 8, 48));
        const w2 = CE.cineType(l2, seg(t, 60, 100));
        if (w1) CE.espText(ctx, w1, tx, top + 70, 24, '#cbd5e1', 'center', 'italic 800');
        if (w2) CE.espText(ctx, w2, tx, top + 112, 24, '#cbd5e1', 'center', 'italic 800');
        CE.cineImpactText(ctx, 'EU NÃO VIM PARTICIPAR.', tx, top + 230, 58, '#f8fafc', seg(t, 124, 134), W * 0.56, -0.03);
        CE.cineImpactText(ctx, 'EU VIM DEVORAR', tx, top + 340, 72, '#00f5d4', seg(t, 172, 182), W * 0.56, -0.03);
        CE.cineImpactText(ctx, 'O MUNDO.', tx, top + 430, 92, '#00f5d4', seg(t, 180, 190), W * 0.56, -0.03);
        CE.cineFlash(ctx, W, H, 0.45 * kick(t, 172, 10), '#ccfbf1');
        CE.cineSfx(S, 124, 'line3', () => window.SFX?.kick?.(0.5));
        CE.cineSfx(S, 172, 'line4', () => window.SFX?.kick?.(1));
      } else if (phase === 3) {
        // a pálpebra de cada um sobe quando a câmera passa; o nome embaixo
        [['rin', 36.0, 'RIN'], ['shidou', 37.3, 'SHIDOU'], ['bachira', 38.6, 'BACHIRA'], ['nagi', 39.9, 'NAGI']].forEach(([id, fx, name]) => {
          const c = CE.cineChar(id, CE.KITS.japan);
          const at = ((fx - 35.65) / 4.7) * 100;
          const f = spot(K, fx, 20.4, 0, 0.9, 0);
          if (!f || f.x < -200 || f.x > W + 200) return;
          const lid = 1 - ease(seg(t, at - 6, at + 4));
          lids(ctx, f, lid, window.PixelRenderer.shade(c.skinColor || '#f3d1b8', -0.08));
          const k = ease(seg(t, at - 4, at + 6)) * (1 - seg(t, at + 22, at + 30));
          if (k > 0) {
            ctx.save();
            ctx.globalAlpha = k;
            ctx.fillStyle = 'rgba(2,6,23,0.85)';
            ctx.fillRect(f.x - 110, bot - 70, 220, 40);
            ctx.fillStyle = c.auraColor || '#00f5d4';
            ctx.fillRect(f.x - 110, bot - 70, 220, 3);
            CE.espText(ctx, name, f.x, bot - 50, 22, c.auraColor || '#f8fafc', 'center', 'italic 900', null);
            ctx.restore();
          }
        });
        CE.cineSfx(S, 20, 'eyes', () => window.SFX?.whoosh?.());
      } else {
        CE.drawRadialSpeedLines(ctx, W / 2, top + 260, W, '#facc15', 0.22);
        CE.cineImpactText(ctx, 'VAMOS!!!', W / 2, top + 110, 140, '#facc15', seg(t, 14, 26), W * 0.9, -0.03);
        CE.cineFlash(ctx, W, H, 0.55 * kick(t, 14, 10));
        CE.cineSfx(S, 14, 'roar', () => window.SFX?.goal?.(false));
      }
    }
  });

  // ==========================================================================
  // 5) A PROMESSA DE LOKI E HUGO — a final (campo) e Paris anos atrás (área vazia)
  // ==========================================================================
  const parisCv = () =>
    paint('parisRoofs', 1024, 360, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      CE.espParisRoofs(g, w, h - 10, '#5a3418', 0);
      CE.espEiffel(g, w * 0.7, h - 10, 200, '#3b2412');
    });
  const parisNearCv = () =>
    paint('parisNear', 1024, 200, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      CE.espParisRoofs(g, w, h, '#6b3d1c', 300);
    });
  const stoneCv = () =>
    paint('stone', 128, 32, (g, w, h) => {
      g.fillStyle = '#7c4a24';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#5c3618';
      for (let r = 0; r < 2; r++) for (let x = (r % 2) * 16; x < w; x += 32) g.fillRect(x, r * 16, 2, 16);
      g.fillRect(0, 15, w, 2);
      g.fillRect(0, 0, w, 2);
    });
  function paris(K, eye, sunAt) {
    K.sky('#6b2a12', '#fcd9a0', 0);
    K.fog('#e8a35c', 0.02);
    K.ambient('#ffd2a0');
    K.floor({ x0: VX - 50, y0: VY - 46, x1: VX + 50, y1: VY + 8, color: '#b98345', light: [1, 0.9, 0.78] });
    K.quad({ x: VX + 6, y: VY - 42, z: -8.0, w: 90, h: 31.6, ang: -Math.PI / 2, img: parisCv(), light: [0.92, 0.78, 0.68] });
    K.quad({ x: VX, y: VY - 20, z: -4.6, w: 50, h: 9.8, ang: -Math.PI / 2, img: parisNearCv(), light: [0.95, 0.8, 0.7] });
    glowAt(K, sunAt[0], sunAt[1], sunAt[2], sunAt[3] * 8, '#fff0c8', 0.9, eye);
    glowAt(K, sunAt[0], sunAt[1] + 0.1, sunAt[2], sunAt[3], '#fff4dc', 1, eye);
  }

  register('loki_hugo_promise', {
    phases: [70, 160, 170, 150],
    music: 'promise',
    grain: 0.1,
    title: '✦ FLASHBACK • A PROMESSA DE LOKI E HUGO',
    tags: ['PLANO 1 • O OLHAR DO LOKI', 'PLANO 2 • PARIS, ANOS ATRÁS', 'PLANO 3 • A PROMESSA', 'PLANO 4 • A FRANÇA DESPERTA'],
    subs: [
      [],
      [{ from: 4, who: 'HUGO (CRIANÇA)', text: '"Vamos ganhar a Copa?"', color: '#f9a8d4' }],
      [{ from: 10, who: 'LOKI (CRIANÇA)', text: '"Juntos. Eu prometo."', color: '#7dd3fc' }],
      [{ from: 0, who: 'HUGO', text: '"Eu lembro. Ainda não acabou."', color: '#f472b6' }]
    ],
    theme: 'worldcup_final',
    scene(K, S) {
      const { t, phase } = S;
      const f = CE.espFrance();
      if (phase === 0) {
        // na final: o close do Loki, a câmera entrando no olho dele
        K.expo(0.85);
        const z = easeIO(seg(t, 0, 44));
        const ez = 0.58;
        K.cam([lerp(53.25, 52.97, z), ez, lerp(14.6, 13.62, z)], [lerp(53.0, 52.93, z), ez - 0.02, 12.4], lerp(36, 27, z));
        K.actor(f.loki, { x: 53, y: 12.4, ang: Math.PI / 2, view: 'front', k: 0.9, light: [0.9, 0.95, 1.08] });
      } else if (phase === 1) {
        // Paris, anos atrás: os dois meninos trocando passes no fim da tarde
        K.expo(1.0);
        const eye = [VX - 0.4 + t * 0.004, 0.55, VY + 3.3];
        K.cam(eye, [VX + t * 0.004, 0.42, VY], 44);
        paris(K, eye, [VX + 8, VY - 46, 12, 3.2]);
        const lx = VX - 1.35;
        const hx = VX + 1.35;
        const cyc = t % 84;
        const toHugo = cyc < 42;
        const a = (cyc % 42) / 42;
        K.actor(f.kidLoki, { x: lx, y: VY, ang: 0, anim: toHugo && a < 0.2 ? 'shoot' : 'idle', k: 0.72, light: [1.05, 0.9, 0.8] });
        K.actor(f.kidHugo, { x: hx, y: VY, ang: Math.PI, anim: !toHugo && a < 0.2 ? 'shoot' : 'idle', k: 0.72, light: [1.05, 0.9, 0.8] });
        const from = toHugo ? lx + 0.25 : hx - 0.25;
        const to = toHugo ? hx - 0.25 : lx + 0.25;
        K.ball(lerp(from, to, a), VY + 0.05, 0.07 + Math.sin(a * Math.PI) * 0.35, { k: 0.6 });
      } else if (phase === 2) {
        K.expo(1.0);
        if (t < 92) {
          // de costas no muro, olhando o sol
          const e = easeIO(t / 92);
          const eye = [VX, 0.72, VY + lerp(2.6, 2.3, e)];
          K.cam(eye, [VX, 0.95, VY - 6], 42);
          paris(K, eye, [VX, VY - 46, 11, 4.5]);
          K.box({ x0: VX - 6, y0: VY - 0.3, x1: VX + 6, y1: VY + 0.3, z0: 0, z1: 0.5, img: stoneCv(), light: [0.62, 0.42, 0.3] });
          K.actor(f.kidLoki, { x: VX - 0.42, y: VY, z: 0.26, ang: -Math.PI / 2, k: 0.72, light: [0.5, 0.32, 0.22] });
          K.actor(f.kidHugo, { x: VX + 0.42, y: VY, z: 0.26, ang: -Math.PI / 2, k: 0.72, light: [0.5, 0.32, 0.22] });
        } else {
          // os punhos se encontram na frente do sol
          const eye = [VX, 1.3, VY + 2];
          K.cam(eye, [VX, 2.1, VY - 12], 40);
          paris(K, eye, [VX, VY - 46, 14, 6]);
        }
      } else {
        // de volta à final: os dois acordam
        K.expo(0.9);
        const rise = ease(seg(t, 0, 50));
        const eye = [53, 0.16, 14.45];
        K.cam(eye, [53, 0.95, 12.6], 50);
        const lift = (rise - 1) * 0.45;
        K.actor(f.loki, { x: 52.42, y: 12.6, z: lift, ang: Math.PI / 2, view: 'front', k: 0.92, light: [0.85, 0.95, 1.15], opts: { showAura: true, auraColor: '#38bdf8' } });
        K.actor(f.hugo, { x: 53.58, y: 12.6, z: lift, ang: Math.PI / 2, view: 'front', left: true, k: 0.92, light: [1.12, 0.9, 1.05], opts: { showAura: true, auraColor: '#ec4899' } });
        glowAt(K, 52.42, 12.4, 0.6 + lift, 2.0, '#38bdf8', 0.3 * rise, eye);
        glowAt(K, 53.58, 12.4, 0.6 + lift, 2.0, '#ec4899', 0.3 * rise, eye);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const f = CE.espFrance();
      if (phase === 0) {
        CE.cineBokeh(ctx, W, top + 20, bot - 20, t, 12, ['rgba(147,197,253,0.3)', 'rgba(255,255,255,0.25)'], 13);
        const sp = spot(K, 53, 12.4, 0, 0.9, 0);
        if (sp) {
          // gotas de suor
          ctx.fillStyle = '#bae6fd';
          [[-6.6, 6], [5.2, 9]].forEach(([dx, dy], i) => ctx.fillRect(sp.x + dx * sp.u, sp.top + MAPY(dy + ((t * 0.08 + i * 3) % 4)) * sp.u, sp.u * 0.6, sp.u * 1.1));
        }
        ctx.fillStyle = 'rgba(2,6,23,0.25)';
        ctx.fillRect(0, top, W, bot - top);
        // abertura em íris: dentro do círculo, Paris ao pôr do sol
        const r = easeIO(seg(t, 34, 70)) * 820;
        if (r > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(W / 2, (top + bot) / 2, r, 0, Math.PI * 2);
          ctx.clip();
          CE.espStatic(ctx, `paris0|${W}`, 0, top, W, bot - top, (g) => {
            CE.espSunsetSky(g, S, W * 0.68, top + 300);
            CE.espParisRoofs(g, W, bot - 120, '#5a3418');
            CE.espEiffel(g, W * 0.8, bot - 120, 330, '#3b2412');
          });
          ctx.restore();
          ctx.strokeStyle = 'rgba(255,237,213,0.85)';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(W / 2, (top + bot) / 2, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        CE.cineSfx(S, 34, 'memory', () => window.SFX?.whoosh?.());
      } else if (phase === 1) {
        CE.espMemory(ctx, S, 1);
        ctx.save();
        ctx.globalAlpha = seg(t, 10, 34);
        CE.espText(ctx, 'Paris, anos atrás.', 70, top + 64, 30, '#fff7ed', 'left', 'italic 700', 'rgba(60,30,10,0.8)');
        ctx.restore();
      } else if (phase === 2) {
        if (t >= 92) {
          const tt = t - 92;
          const meet = ease(seg(tt, 6, 24));
          const cy = (top + bot) / 2 + 30;
          const PR = window.PixelRenderer;
          const fist = (dir, skin, sleeve) => {
            const x = W / 2 - dir * lerp(600, 3, meet);
            ctx.save();
            ctx.translate(x, cy);
            ctx.scale(dir, 1);
            ctx.fillStyle = sleeve;
            ctx.fillRect(-520, -54, 400, 108);
            ctx.fillStyle = PR.shade(sleeve, -0.25);
            ctx.fillRect(-520, 30, 400, 24);
            ctx.fillStyle = sleeve === '#1e3a8a' ? '#f8fafc' : '#1e3a8a';
            ctx.fillRect(-150, -58, 30, 116);
            ctx.fillStyle = skin;
            ctx.fillRect(-120, -52, 84, 104);
            ctx.fillRect(-40, -60, 42, 120);
            ctx.fillStyle = PR.shade(skin, -0.22);
            [-30, 0, 30].forEach((fy) => ctx.fillRect(-40, fy - 2, 42, 4));
            ctx.fillRect(-120, 38, 82, 14);
            ctx.fillStyle = PR.shade(skin, 0.18);
            [-48, -18, 12, 42].forEach((fy) => ctx.fillRect(-10, fy, 10, 10));
            ctx.fillStyle = PR.shade(skin, -0.1);
            ctx.fillRect(-92, -70, 56, 26);
            ctx.restore();
          };
          fist(1, f.kidLoki.skinColor || '#f3d1b8', '#1e3a8a');
          fist(-1, f.kidHugo.skinColor || '#f3d1b8', '#f1f5f9');
          if (tt >= 24) {
            const b = seg(tt, 24, 60);
            ctx.strokeStyle = `rgba(255,251,235,${1 - b})`;
            ctx.lineWidth = 5;
            for (let i = 0; i < 12; i++) {
              const an = (i / 12) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(W / 2 + Math.cos(an) * (60 + b * 80), cy + Math.sin(an) * (60 + b * 80));
              ctx.lineTo(W / 2 + Math.cos(an) * (110 + b * 220), cy + Math.sin(an) * (110 + b * 220));
              ctx.stroke();
            }
          }
          CE.cineImpactText(ctx, 'PROMESSA.', W / 2, top + 90, 74, '#fff7ed', seg(tt, 30, 44), W * 0.7);
        }
        CE.espMemory(ctx, S, 1);
        CE.cineSfx(S, 116, 'fist', () => window.SFX?.kick?.(0.4));
      } else {
        // metade azul (Loki) e metade rosa (Hugo), cortadas na diagonal
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(37,99,235,0.14)';
        ctx.beginPath();
        ctx.moveTo(0, top);
        ctx.lineTo(W * 0.56, top);
        ctx.lineTo(W * 0.44, bot);
        ctx.lineTo(0, bot);
        ctx.fill();
        ctx.fillStyle = 'rgba(219,39,119,0.12)';
        ctx.beginPath();
        ctx.moveTo(W * 0.56, top);
        ctx.lineTo(W, top);
        ctx.lineTo(W, bot);
        ctx.lineTo(W * 0.44, bot);
        ctx.fill();
        ctx.restore();
        const rise = ease(seg(t, 0, 50));
        CE.drawRadialSpeedLines(ctx, W / 2, top + 200, W, '#e0f2fe', 0.1 + rise * 0.1);
        // os olhos acendem
        const glow = seg(t, 34, 50);
        if (glow > 0) {
          const lift = (rise - 1) * 0.45;
          [[52.42, 'rgba(56,189,248,0.95)'], [53.58, 'rgba(236,72,153,0.95)']].forEach(([x, col]) => {
            const p = spot(K, x, 12.6, lift, 0.92, MAPY(10.1));
            if (p) [-3.3, 3.3].forEach((dx) => CE.cineGlow(ctx, p.x + dx * p.u, p.y, p.u * 3, col, glow));
          });
        }
        CE.cineImpactText(ctx, 'A FRANÇA DESPERTA!', W / 2, top + 84, 78, '#f8fafc', seg(t, 50, 62), W * 0.9, -0.03);
        CE.cineFlash(ctx, W, H, 0.85 * kick(t, 0, 16), '#fff1d6');
        CE.cineSfx(S, 50, 'awake', () => window.SFX?.kick?.(1));
      }
    }
  });
})();
