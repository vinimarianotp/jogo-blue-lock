// ============================================================================
// 48 · camp_night — "A fachada como página" (CUTSCENE_STYLE §6, conceito B do lote 1)
// Cap. 18, véspera do Amistoso 2 (Coreia do Sul). Um hotel de verdade, montado na área vazia
// (K.VOID), com a rua e a cidade em volta. Assinatura: a fachada do hotel como página de
// mangá: cada janela acesa é um quadro. Fachada apagada → a sua janela acende → o Rin na
// varanda ao lado → o Sae na porta do quarto dele, visto pela janela → o Shidou acende o
// quarto inteiro gargalhando. No fim, quatro janelas acesas no prédio escuro.
// Pico: o "HAHAHA" do Shidou estourando para fora da janela (a única onomatopeia).
// Aqui também fica o quarto do hotel em que a conversa logo depois (bg 'hotel_night') é
// filmada pelo diretor das conversas (js/cine3d.js, CE.c3Sets.hotel).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro) return;
  const R = CE.roteiro;
  const { seg, lerp, mix, rnd, tela, brilho, placa } = R;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- o hotel
  // fachada virada para o sul (para a rua), em y = 12; 8 colunas de janelas, térreo + 6 andares
  const HOT = { x0: 80, x1: 92, y: 12, fundo: 5.5, terreo: 1.5, andar: 1.2, n: 6, alto: 9.0 };
  const colX = (c) => HOT.x0 + 0.75 + c * 1.5;
  const andarZ = (a) => HOT.terreo + (a - 1) * HOT.andar;
  const JAN = { w: 0.9, h: 0.72, peit: 0.26 };
  const PX = 20; // px da fachada por ladrilho
  // os quatro quartos acordados: c = coluna, a = andar
  const Q = {
    voce: { c: 4, a: 3 },
    rin: { c: 5, a: 3, porta: true },
    sae: { c: 2, a: 3 },
    shidou: { c: 3, a: 4 }
  };
  const ehBuraco = (c, a) => Object.values(Q).some((q) => q.c === c && q.a === a);
  // a janela de um quarto: [x0, x1, z0, z1] (a do Rin é a porta da varanda, mais alta)
  const janela = (q) => {
    const x = colX(q.c);
    const z0 = andarZ(q.a) + (q.porta ? 0.04 : JAN.peit);
    return [x - JAN.w / 2, x + JAN.w / 2, z0, z0 + (q.porta ? 0.98 : JAN.h)];
  };

  // a fachada inteira em pixel (as janelas dos quatro quartos são buracos)
  const fachadaCv = () =>
    tela('c48|fachada', 12 * PX, HOT.alto * PX, (g, w, h) => {
      const Y = (z) => Math.round((HOT.alto - z) * PX);
      // reboco com pilastras e as faixas de cada andar
      g.fillStyle = '#4a4762';
      g.fillRect(0, 0, w, h);
      for (let c = 0; c <= 8; c++) {
        g.fillStyle = '#3e3b55';
        g.fillRect(Math.round(c * 1.5 * PX) - 2, Y(HOT.alto - 0.3), 4, Y(0) - Y(HOT.alto - 0.3));
      }
      for (let a = 1; a <= HOT.n + 1; a++) {
        const z = andarZ(a);
        g.fillStyle = '#5a5676';
        g.fillRect(0, Y(z) - 1, w, 2);
        g.fillStyle = '#36334a';
        g.fillRect(0, Y(z) + 1, w, 1);
      }
      // a platibanda (topo)
      g.fillStyle = '#332f45';
      g.fillRect(0, 0, w, Y(HOT.alto - 0.3));
      g.fillStyle = '#5a5676';
      g.fillRect(0, Y(HOT.alto - 0.3), w, 2);
      // as janelas
      for (let a = 1; a <= HOT.n; a++) {
        for (let c = 0; c < 8; c++) {
          const q = Q.rin.c === c && Q.rin.a === a ? Q.rin : { c, a };
          const [x0, x1, z0, z1] = janela(q);
          const px0 = Math.round((x0 - HOT.x0) * PX);
          const px1 = Math.round((x1 - HOT.x0) * PX);
          const py0 = Y(z1);
          const py1 = Y(z0);
          // moldura e peitoril
          g.fillStyle = '#76718f';
          g.fillRect(px0 - 1, py0 - 1, px1 - px0 + 2, py1 - py0 + 2);
          g.fillStyle = '#8a85a3';
          g.fillRect(px0 - 2, py1, px1 - px0 + 4, 2);
          if (ehBuraco(c, a)) {
            g.clearRect(px0, py0, px1 - px0, py1 - py0);
            continue;
          }
          // vidro escuro com o reflexo do luar e, em algumas, a cortina
          g.fillStyle = '#0f1428';
          g.fillRect(px0, py0, px1 - px0, py1 - py0);
          const r = rnd(a * 8 + c, 48);
          if (r < 0.45) {
            g.fillStyle = '#1b2442';
            for (let k = 0; k < 3; k++) g.fillRect(px0 + 3 + k * 2, py0 + 1 + k, 1, Math.max(2, py1 - py0 - 6));
          } else if (r < 0.7) {
            g.fillStyle = '#161d36';
            for (let x = px0 + 1; x < px1 - 1; x += 3) g.fillRect(x, py0, 1, py1 - py0);
          }
          g.fillStyle = '#5a5676';
          g.fillRect(Math.round((px0 + px1) / 2), py0, 1, py1 - py0);
        }
      }
      // o térreo: o saguão envidraçado (luz fraca da recepção) e a porta
      const t0 = Y(HOT.terreo - 0.1);
      const t1 = Y(0.05);
      g.fillStyle = '#2a2433';
      g.fillRect(PX * 1.2, t0, w - PX * 2.4, t1 - t0);
      for (let x = PX * 1.2; x < w - PX * 1.2; x += PX * 1.2) {
        g.fillStyle = '#3a2f2a';
        g.fillRect(Math.round(x) + 2, t0 + 3, Math.round(PX * 1.2) - 4, t1 - t0 - 3);
        g.fillStyle = 'rgba(253,186,116,0.35)';
        g.fillRect(Math.round(x) + 2, t0 + 3, Math.round(PX * 1.2) - 4, 3);
      }
      g.fillStyle = '#c08457';
      g.fillRect(w / 2 - PX * 0.8, t0 + 2, PX * 1.6, t1 - t0 - 2);
      g.fillStyle = '#7c4a2a';
      g.fillRect(w / 2 - 1, t0 + 2, 2, t1 - t0 - 2);
    });
  // o letreiro do telhado (letras de neon quentes)
  const letreiroCv = () =>
    tela('c48|letreiro', 96, 20, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      CE.finPixelText(g, 'HOTEL', w / 2, 10, 3, '#fdba74', 'center', w - 4);
    });
  const grade = () =>
    tela('c48|grade', 64, 16, (g, w, h) => {
      g.fillStyle = '#1e2438';
      g.fillRect(0, 0, w, 2);
      g.fillRect(0, h - 2, w, 2);
      for (let x = 1; x < w; x += 5) g.fillRect(x, 0, 1, h);
      g.fillStyle = 'rgba(203,213,225,0.5)';
      g.fillRect(0, 0, w, 1);
    });
  // a moldura de quadro de mangá que acende em volta da janela acesa
  const moldura = () =>
    tela('c48|moldura', 40, 32, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#f8fafc';
      g.fillRect(0, 0, w, 2);
      g.fillRect(0, h - 2, w, 2);
      g.fillRect(0, 0, 2, h);
      g.fillRect(w - 2, 0, 2, h);
    });
  // a cidade no fundo (prédios em pixel com janelas) e a lua
  const cidadeCv = () =>
    tela('c48|cidade', 512, 192, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      CE.cineCity(g, w, h, 150, '#1a2244', 'rgba(253,224,71,0.5)', 5, 0);
      CE.cineCity(g, w, h, 90, '#121935', 'rgba(251,191,36,0.6)', 11, 140);
    });
  const luaCv = () =>
    tela('c48|lua', 24, 24, (g) => {
      for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) {
        const d = x * x + y * y;
        if (d > 100) continue;
        g.fillStyle = d > 81 ? '#cbd5e1' : (x + 3) * (x + 3) + (y - 2) * (y - 2) < 12 ? '#d6dde8' : '#f1f5f9';
        g.fillRect(12 + x, 12 + y, 1, 1);
      }
      g.fillStyle = '#d6dde8';
      g.fillRect(14, 8, 3, 2);
      g.fillRect(8, 14, 2, 2);
    });
  const asfalto = () =>
    tela('c48|asfalto', 64, 64, (g, w, h) => {
      g.fillStyle = '#1c1f2b';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) {
        g.fillStyle = rnd(i, 7) < 0.5 ? '#222634' : '#181b26';
        g.fillRect(Math.floor(rnd(i, 8) * w), Math.floor(rnd(i, 9) * h), 2, 1);
      }
    });
  const calcada = () =>
    tela('c48|calcada', 32, 32, (g, w, h) => {
      g.fillStyle = '#4a4f63';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#3c4054';
      for (let k = 0; k < w; k += 8) {
        g.fillRect(k, 0, 1, h);
        g.fillRect(0, k, w, 1);
      }
    });
  // parede de quarto (papel listrado) e chão de carpete
  const papel = (cor) =>
    tela('c48|papel|' + cor, 32, 32, (g, w, h) => {
      g.fillStyle = cor;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.06)';
      for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 2, h);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(0, h - 4, w, 4);
    });

  // a luz de um quarto: 0 apagado → 1 aceso (com a piscada do interruptor)
  const acende = (t, em) => {
    if (em === null || t < em) return 0;
    const u = t - em;
    if (u < 3) return 0.7;
    if (u < 5) return 0.15;
    return Math.min(1, 0.6 + (u - 5) * 0.08);
  };
  // um quarto atrás da janela: chão, paredes, teto, cama, abajur; k = quanto está aceso
  function quarto(K, q, k, o = {}) {
    const x = colX(q.c);
    const z0 = andarZ(q.a);
    const x0 = x - 0.72;
    const x1 = x + 0.72;
    const y1 = HOT.y - 0.02;
    const y0 = y1 - 1.7;
    const hh = HOT.andar - 0.04;
    const quente = o.cor || [1.15, 0.86, 0.6];
    const L = mix([0.24, 0.26, 0.38], quente, k);
    const pap = papel(o.papel || '#6b4e5a');
    K.floor({ x0, y0, x1, y1, z: z0 + 0.01, color: '#4a3a3a', light: L });
    K.floor({ x0, y0, x1, y1, z: z0 + hh, color: '#2a2230', light: L });
    placa(K, { x, y: y0 + 0.01, z: z0, w: 1.44, h: hh, ang: Math.PI / 2, img: pap, color: '#ffffff', light: L });
    placa(K, { x: x0 + 0.01, y: (y0 + y1) / 2, z: z0, w: 1.7, h: hh, ang: 0, img: pap, color: '#ffffff', light: L });
    placa(K, { x: x1 - 0.01, y: (y0 + y1) / 2, z: z0, w: 1.7, h: hh, ang: Math.PI, img: pap, color: '#ffffff', light: L });
    // a cama encostada na parede da esquerda e o criado-mudo com o abajur
    if (o.cama !== false) {
      K.box({ x0: x0 + 0.02, y0: y0 + 0.25, x1: x - 0.05, y1: y0 + 1.25, z0: z0, z1: z0 + 0.2, color: '#3b3048', top: '#c7cfe0', light: L });
      K.box({ x0: x0 + 0.02, y0: y0 + 0.02, x1: x - 0.05, y1: y0 + 0.26, z0: z0, z1: z0 + 0.5, color: '#5a3a2a', light: L });
    }
    K.box({ x0: x1 - 0.32, y0: y0 + 0.1, x1: x1 - 0.04, y1: y0 + 0.38, z0: z0, z1: z0 + 0.3, color: '#4a3424', top: '#5a4030', light: L });
    if (k > 0) {
      K.box({ x0: x1 - 0.24, y0: y0 + 0.18, x1: x1 - 0.12, y1: y0 + 0.3, z0: z0 + 0.3, z1: z0 + 0.44, color: '#fde68a', em: true, alpha: Math.min(1, k + 0.2) });
      K.floor({ x0, y0, x1, y1, z: z0 + 0.015, img: brilho('rgba(255,214,150,0.6)', 0.7, 0.3), color: '#ffffff', em: true, alpha: Math.min(0.999, k * 0.9) });
    }
    // o quadro de mangá em volta da janela (acende junto com a luz)
    if (k > 0.5) {
      const [jx0, jx1, jz0, jz1] = janela(q);
      placa(K, { x: (jx0 + jx1) / 2, y: HOT.y + 0.02, z: jz0 - 0.05, w: jx1 - jx0 + 0.1, h: jz1 - jz0 + 0.1, ang: Math.PI / 2, img: moldura(), color: '#ffffff', em: true, alpha: Math.min(0.999, (k - 0.5) * 1.6) * 0.75 });
    }
    // a luz que sai pela janela e bate na calçada (de longe, a janela acesa brilha)
    return L;
  }

  function hotel(K, S, st, luzes) {
    const lua = [0.68, 0.69, 0.9];
    K.sky('#0b1636', '#24407a', 0.7);
    K.fog('#111a38', 0.012);
    K.ambient('#8e9ac8');
    // a cidade lá atrás e a lua
    placa(K, { x: 86, y: -18, z: -1, w: 90, h: 34, ang: Math.PI / 2, img: cidadeCv(), color: '#ffffff', em: true, alpha: 0.999 });
    K.sprite(luaCv(), { x: 97, y: -8, z: 16, w: 2.6, h: 2.6, glow: true });
    // o chão: calçada do hotel, a rua com as faixas e a calçada de cá
    K.floor({ x0: 60, y0: -20, x1: 116, y1: 40, z: -0.01, color: '#141824' });
    K.floor({ x0: 66, y0: 12, x1: 106, y1: 13.6, img: calcada(), color: '#ffffff', light: [0.85, 0.85, 0.95] });
    K.floor({ x0: 66, y0: 13.6, x1: 106, y1: 18.6, img: asfalto(), color: '#ffffff', light: [0.8, 0.82, 0.95] });
    for (let x = 67; x < 106; x += 2.2) K.floor({ x0: x, y0: 16.04, x1: x + 1.1, y1: 16.16, z: 0.004, color: '#d6c27a', light: [0.8, 0.8, 0.8] });
    for (let k = 0; k < 7; k++) K.floor({ x0: 85.0 + k * 0.32, y0: 13.7, x1: 85.18 + k * 0.32, y1: 18.5, z: 0.004, color: '#9aa3b8', light: [0.85, 0.85, 0.95] });
    K.floor({ x0: 66, y0: 18.6, x1: 106, y1: 20.2, img: calcada(), color: '#ffffff', light: [0.85, 0.85, 0.95] });
    // os prédios vizinhos (mais baixos, quase todos dormindo)
    K.box({ x0: 70.2, y0: 5, x1: 79.6, y1: 11.6, z0: 0, z1: 6.2, img: R.fachada({ cor: '#2b3150', janela: '#e8b86a', colunas: 6, andares: 5, acesas: 0.12 }), color: '#ffffff', top: '#1a1f33', light: lua });
    K.box({ x0: 92.4, y0: 5, x1: 101.8, y1: 11.4, z0: 0, z1: 7.6, img: R.fachada({ cor: '#2e2f4a', janela: '#f0c070', colunas: 6, andares: 6, acesas: 0.1 }), color: '#ffffff', top: '#1a1f33', light: lua });
    K.box({ x0: 64, y0: 4, x1: 70, y1: 10, z0: 0, z1: 4.4, img: R.fachada({ cor: '#262b44', janela: '#e8b86a', colunas: 4, andares: 4, acesas: 0.18 }), color: '#ffffff', top: '#1a1f33', light: lua });
    K.box({ x0: 102.2, y0: 4, x1: 108, y1: 10, z0: 0, z1: 5.2, img: R.fachada({ cor: '#272a42', janela: '#f0c070', colunas: 4, andares: 4, acesas: 0.14 }), color: '#ffffff', top: '#1a1f33', light: lua });
    // o hotel: laterais, telhado e a fachada (com os buracos dos quatro quartos)
    placa(K, { x: HOT.x0, y: (HOT.y + HOT.fundo) / 2, w: HOT.y - HOT.fundo, h: HOT.alto, ang: Math.PI, color: '#2c3150', light: lua });
    placa(K, { x: HOT.x1, y: (HOT.y + HOT.fundo) / 2, w: HOT.y - HOT.fundo, h: HOT.alto, ang: 0, color: '#2c3150', light: lua });
    K.floor({ x0: HOT.x0, y0: HOT.fundo, x1: HOT.x1, y1: HOT.y, z: HOT.alto, color: '#1e2236', light: lua });
    placa(K, { x: (HOT.x0 + HOT.x1) / 2, y: HOT.y, z: 0, w: HOT.x1 - HOT.x0, h: HOT.alto, ang: Math.PI / 2, img: fachadaCv(), color: '#ffffff', light: lua });
    // o letreiro no telhado e a marquise da entrada com a luz da recepção
    placa(K, { x: 86, y: HOT.y - 0.3, z: HOT.alto + 0.05, w: 3.2, h: 0.66, ang: Math.PI / 2, img: letreiroCv(), color: '#ffffff', em: true, alpha: 0.999 });
    K.box({ x0: 84.6, y0: HOT.y, x1: 87.4, y1: HOT.y + 0.9, z0: 1.42, z1: 1.5, color: '#2a2f4a', top: '#3a4060', light: lua });
    K.floor({ x0: 84.2, y0: HOT.y, x1: 87.8, y1: HOT.y + 1.6, z: 0.006, img: brilho('rgba(253,186,116,0.5)', 0.5, 0.1), color: '#ffffff', em: true, alpha: 0.999 });
    // a varanda do Rin: a laje e o guarda-corpo
    const rx = colX(Q.rin.c);
    const rz = andarZ(Q.rin.a);
    K.box({ x0: rx - 0.7, y0: HOT.y, x1: rx + 0.7, y1: HOT.y + 0.62, z0: rz - 0.06, z1: rz + 0.03, color: '#3d4466', top: '#4a5279', light: lua });
    placa(K, { x: rx, y: HOT.y + 0.6, z: rz + 0.03, w: 1.4, h: 0.44, ang: Math.PI / 2, img: grade(), color: '#ffffff', light: lua });
    [-1, 1].forEach((s) => placa(K, { x: rx + s * 0.69, y: HOT.y + 0.3, z: rz + 0.03, w: 0.6, h: 0.44, ang: s < 0 ? 0 : Math.PI, img: grade(), color: '#ffffff', light: lua }));
    // os postes da rua (luz quente na calçada)
    [78, 84, 90, 96].forEach((x) => {
      K.box({ x0: x - 0.05, y0: 13.25, x1: x + 0.05, y1: 13.35, z0: 0, z1: 2.3, color: '#1e2232', light: lua });
      K.box({ x0: x - 0.05, y0: 13.25, x1: x + 0.05, y1: 13.9, z0: 2.24, z1: 2.32, color: '#1e2232', light: lua });
      K.box({ x0: x - 0.12, y0: 13.72, x1: x + 0.12, y1: 13.96, z0: 2.14, z1: 2.24, color: '#ffe2a8', em: true });
      K.sprite(brilho('rgba(255,214,150,0.55)'), { x, y: 13.84, z: 1.75, w: 1.0, h: 1.0, glow: true, alpha: 0.7 });
      K.floor({ x0: x - 1.5, y0: 12.4, x1: x + 1.5, y1: 15.4, z: 0.008, img: brilho('rgba(255,200,130,0.42)'), color: '#ffffff', em: true, alpha: 0.999 });
    });
    // os quatro quartos (por trás dos buracos da fachada)
    const L = {};
    Object.keys(Q).forEach((k) => {
      L[k] = quarto(K, Q[k], luzes[k] || 0, { papel: k === 'shidou' ? '#7a4a62' : k === 'sae' ? '#4e566e' : k === 'rin' ? '#3e5a5a' : '#6b4e5a', cama: k !== 'rin', cor: k === 'shidou' ? [1.25, 0.95, 1.0] : undefined });
      const [x0, x1, z0, z1] = janela(Q[k]);
      st['j_' + k] = R.ponto((x0 + x1) / 2, HOT.y + 0.05, (z0 + z1) / 2);
      // de longe: a janela acesa joga um retângulo de luz na calçada
      if ((luzes[k] || 0) > 0.3) K.floor({ x0: x0 - 0.4, y0: HOT.y + 0.05, x1: x1 + 0.4, y1: HOT.y + 1.1, z: 0.01, img: brilho('rgba(253,186,116,0.25)', 0.5, 0.1), color: '#ffffff', em: true, alpha: 0.999 * (luzes[k] - 0.3) });
    });
    return L;
  }

  // ---------------------------------------------------------------- o elenco
  const casual = (c) => ({ outfit: 'casual', clothesColor: c });
  const ROUPA = { voce: casual('#1e3a8a'), rin: casual('#1f2a44'), sae: casual('#e5e7eb'), shidou: casual('#be185d') };
  // você sentado na beira da cama, acordado, de perfil para a janela (de frente, o boneco
  // sentado parecia em pé)
  const voceAt = () => [colX(Q.voce.c) - 0.32, HOT.y - 1.0, andarZ(Q.voce.a)];
  const rinAt = () => [colX(Q.rin.c) + 0.12, HOT.y + 0.36, andarZ(Q.rin.a) + 0.03];
  // (o Sae no vão da porta, com a luz do corredor em volta; o Shidou pulando no meio do quarto)
  const saeAt = () => [colX(Q.sae.c), HOT.y - 1.46, andarZ(Q.sae.a)];
  const shidouAt = () => [colX(Q.shidou.c) - 0.05, HOT.y - 0.66, andarZ(Q.shidou.a)];
  function elenco(K, S, L, quem) {
    if (quem.voce) {
      const p = voceAt();
      K.actor('you', { id: 'voce', x: p[0], y: p[1], z: p[2], ang: 0.15, anim: 'sit', seat: 0.2, frame: 0, extra: ROUPA.voce, light: L.voce });
    }
    if (quem.rin) {
      const p = rinAt();
      K.actor('rin', { id: 'rin', x: p[0], y: p[1], z: p[2], ang: Math.PI / 2 + 0.25, frame: 0, extra: ROUPA.rin, light: [0.62, 0.7, 0.98] });
    }
    if (quem.sae) {
      const p = saeAt();
      K.actor('sae', { id: 'sae', x: p[0], y: p[1], z: p[2], ang: Math.PI / 2, frame: 0, extra: ROUPA.sae, light: mix([0.3, 0.32, 0.45], [0.62, 0.56, 0.56], quem.sae) });
    }
    if (quem.shidou) {
      const p = shidouAt();
      const pulo = Math.abs(Math.sin(S.t * 0.16)) * 0.09 * quem.shidou;
      K.actor('shidou', { id: 'shidou', x: p[0], y: p[1], z: p[2] + pulo, ang: Math.PI / 2, anim: quem.shidou > 0.5 ? 'celebrate' : 'idle', frame: 0, extra: ROUPA.shidou, light: L.shidou, opts: { expr: 'laugh' } });
    }
  }
  // a porta do quarto do Sae aberta: o retângulo quente do corredor e a folha da porta
  function portaSae(K, k) {
    const x = colX(Q.sae.c);
    const z0 = andarZ(Q.sae.a);
    const y0 = HOT.y - 1.7;
    // (o vão é mais largo que ele: a luz do corredor aparece dos dois lados e por cima)
    K.box({ x0: x - 0.42, y0: y0 + 0.01, x1: x + 0.42, y1: y0 + 0.05, z0: z0, z1: z0 + 1.12, color: '#2a1d16', light: [0.6, 0.5, 0.4] });
    K.quad({ x, y: y0 + 0.06, z: z0, w: 0.74, h: 1.08, ang: Math.PI / 2, color: '#ffe8c0', em: true, alpha: 0.999 * k });
    K.quad({ x: x + 0.37 + Math.cos(-1.0) * 0.3, y: y0 + 0.07 - Math.sin(-1.0) * 0.3, z: z0, w: 0.6, h: 1.0, ang: Math.PI / 2 - 1.0, color: '#6a4632', light: [0.8, 0.62, 0.45] });
    K.floor({ x0: x - 0.5, y0: y0 + 0.05, x1: x + 0.5, y1: y0 + 1.1, z: z0 + 0.016, img: brilho('rgba(255,210,140,0.7)', 0.5, 0.05), color: '#ffffff', em: true, alpha: 0.999 * k });
  }

  // a cartela final: o kicker pequeno e espaçado e o título em Jersey 10 (CAIXA ALTA),
  // sempre inteiro (a fonte encolhe até caber)
  function cartelaJersey(ctx, S, k, kicker, titulo, cor) {
    if (k <= 0) return;
    const { W, top } = S;
    const y = top + Math.round(S.stageH * 0.11);
    ctx.save();
    ctx.globalAlpha = clamp(k * 1.4);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let fs = Math.round(Math.min(78, W * 0.07));
    ctx.font = `${fs}px "Jersey 10", "Arial Narrow", sans-serif`;
    while (fs > 28 && ctx.measureText(titulo).width > W * 0.86) {
      fs -= 2;
      ctx.font = `${fs}px "Jersey 10", "Arial Narrow", sans-serif`;
    }
    const sobe = (1 - Math.min(1, k * 1.2)) * 14;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(5, fs / 9);
    ctx.strokeStyle = '#020617';
    ctx.strokeText(titulo, W / 2, y + fs * 0.55 + sobe);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(titulo, W / 2, y + fs * 0.55 + sobe);
    if (CE.finKicker) CE.finKicker(ctx, W / 2, y - fs * 0.05, kicker, k, cor, 'center');
    ctx.restore();
  }

  // ---------------------------------------------------------------- o roteiro
  // quando cada janela acende (quadro do plano; null = já acesa / ainda apagada)
  const ACENDE = { voce: 136, rin: 14, sae: 34, shidou: 40 };
  const luzesDo = (id, t) => {
    const on = (k) => (k ? 1 : 0);
    if (id === 'apagado') return { voce: acende(t, ACENDE.voce) };
    if (id === 'rin') return { voce: 1, rin: acende(t, ACENDE.rin) };
    if (id === 'sae') return { voce: 1, rin: 1, sae: acende(t, ACENDE.sae) };
    if (id === 'shidou') return { voce: 1, rin: 1, sae: 1, shidou: acende(t, ACENDE.shidou) };
    return { voce: on(1), rin: 1, sae: 1, shidou: 1 };
  };
  const RIN_C = colX(Q.rin.c);
  const VOCE_C = colX(Q.voce.c);
  const SAE_C = colX(Q.sae.c);
  const SHI_C = colX(Q.shidou.c);
  const ZJ = (a) => andarZ(a) + 0.6;

  R('camp_night', {
    titulo: 'A VÉSPERA',
    musica: 'mystery',
    grao: 0.06,
    vinheta: 0.5,
    cores: { 'RYUSEI SHIDOU': '#ec4899' },
    cenario(K, t, st, pl, S) {
      const luzes = luzesDo(pl.id, t);
      st.luzes = luzes;
      st.L = hotel(K, S, st, luzes);
    },
    planos: [
      {
        // a rua de madrugada: a câmera sobe da calçada e mostra o hotel inteiro apagado;
        // no fim, uma janela acende
        id: 'apagado',
        dur: 230,
        expo: 1.05,
        cam: { de: [[86.5, 0.6, 26.2], [86.1, 4.2, 12], 58], para: [[86.3, 2.2, 25.0], [86.1, 4.9, 12], 54], curva: 'suave' },
        cena(K, S, st) {
          elenco(K, S, st.L, { voce: st.luzes.voce > 0.3 });
        },
        falas: [{ em: 40, quem: 'NARRADOR', texto: 'O hotel inteiro dorme... quase.' }],
        letreiros: [{ em: 10, texto: 'HOTEL DA SELEÇÃO • 02:47', cor: '#94a3b8' }],
        sons: [{ em: ACENDE.voce, som: 'click' }]
      },
      {
        // a sua janela e, ao lado, a varanda do Rin: os dois acordados, sem se olhar
        id: 'rin',
        dur: 230,
        expo: 1.05,
        cam: { de: [[VOCE_C + 0.2, ZJ(3) + 0.15, 15.9], [VOCE_C + 0.45, ZJ(3), 12], 40], para: [[RIN_C - 0.35, ZJ(3) + 0.05, 15.5], [RIN_C - 0.45, ZJ(3) - 0.05, 12], 38], curva: 'suave' },
        cena(K, S, st) {
          elenco(K, S, st.L, { voce: 1, rin: 1 });
        },
        falas: [{ em: 50, quem: 'RIN ITOSHI', texto: '"...Também não consegue dormir?"' }]
      },
      {
        // dois quartos para a esquerda: a luz acende e, lá no fundo, o Sae na porta aberta
        id: 'sae',
        dur: 210,
        expo: 1.05,
        cam: { de: [[SAE_C + 0.22, ZJ(3) + 0.02, 15.3], [SAE_C + 0.02, ZJ(3) - 0.06, 11], 40], para: [[SAE_C + 0.08, ZJ(3), 14.8], [SAE_C, ZJ(3) - 0.06, 11], 38], curva: 'suave' },
        cena(K, S, st) {
          const k = st.luzes.sae;
          portaSae(K, k);
          elenco(K, S, st.L, { sae: k > 0 ? Math.min(1, k) : 0.0001 });
        },
        falas: [{ em: 38, quem: 'SAE ITOSHI', texto: '"Barulho na varanda às três?"' }],
        sons: [{ em: ACENDE.sae, som: 'click' }]
      },
      {
        // um andar acima: o quarto do Shidou acende de uma vez e a gargalhada sai pela janela
        id: 'shidou',
        dur: 210,
        expo: 1.05,
        cam: { de: [[SHI_C + 0.6, ZJ(4) + 0.05, 15.6], [SHI_C + 0.1, ZJ(4) - 0.05, 11], 40], para: [[SHI_C + 0.45, ZJ(4) + 0.02, 15.0], [SHI_C + 0.1, ZJ(4) - 0.02, 11], 37], curva: 'suave' },
        cena(K, S, st) {
          const k = st.luzes.shidou;
          elenco(K, S, st.L, { shidou: k > 0 ? Math.min(1, k) : 0 });
        },
        efeitos: [{ tipo: 'tremor', em: ACENDE.shidou + 4, ate: ACENDE.shidou + 40, forca: 0.45, amp: 0.05 }],
        onomatopeias: [{ em: ACENDE.shidou + 4, ate: 196, texto: 'HAHAHA!', x: 0.68, y: 0.2, tam: 150, rot: -0.14, cor: '#f9a8d4' }],
        falas: [{ em: 54, quem: 'RYUSEI SHIDOU', texto: '"Parece velório aqui!"' }],
        sons: [{ em: ACENDE.shidou + 4, som: 'tackle' }]
      },
      {
        // de volta para a rua, mais longe: quatro janelas acesas no prédio escuro
        id: 'quatro',
        dur: 250,
        expo: 1.05,
        cam: { de: [[86.3, 1.6, 26.6], [86.1, 6.2, 12], 52], para: [[86.4, 2.1, 28.8], [86.1, 6.5, 12], 54], curva: 'suave' },
        cena(K, S, st) {
          portaSae(K, 1);
          elenco(K, S, st.L, { voce: 1, rin: 1, sae: 1, shidou: 0.6 });
        },
        falas: [{ em: 30, quem: 'NARRADOR', texto: 'Quatro egos. Amanhã, um gol só.' }],
        // a cartela (no céu, em cima do hotel): Jersey 10, inteira
        depois(ctx, S) {
          cartelaJersey(ctx, S, seg(S.t, 120, 156), 'AMANHÃ • AMISTOSO', 'JAPÃO × COREIA DO SUL', '#facc15');
        }
      }
    ]
  });

  // ==========================================================================
  // O QUARTO DO HOTEL PARA A CONVERSA (bg 'hotel_night', filmada pelo js/cine3d.js)
  // Você na beira da cama; o Rin na varanda, de costas para o quarto; o Sae na porta do
  // corredor; o Shidou no meio do quarto. A cidade e a lua lá fora, pela porta de vidro.
  // ==========================================================================
  const QV = { x0: 84.4, x1: 89.4, y0: 14.8, y1: 18.4, h: 1.8, porta: 85.5, vidro: [86.9, 88.9] };
  const LUGAR = {
    'VOCÊ': { x: 85.45, y: 16.9, ang: -0.6, anim: 'sit', seat: 0.22, luz: [0.95, 0.8, 0.66], extra: ROUPA.voce },
    'RIN ITOSHI': { x: 88.35, y: 19.05, ang: Math.PI / 2, luz: [0.62, 0.7, 0.98], extra: ROUPA.rin },
    'SAE ITOSHI': { x: 85.5, y: 15.0, ang: Math.PI / 2, luz: [0.95, 0.78, 0.62], extra: ROUPA.sae },
    'RYUSEI SHIDOU': { x: 88.2, y: 15.3, ang: Math.PI * 0.9, anim: 'celebrate', luz: [1.0, 0.82, 0.72], extra: ROUPA.shidou }
  };
  function quartoConversa(K, t) {
    const L = [0.95, 0.78, 0.62];
    K.sky('#0b1636', '#24407a', 0.6);
    K.fog('#0b1636', 0.012);
    K.ambient('#c8a888');
    const { x0, x1, y0, y1, h } = QV;
    const pap = papel('#6b4e5a');
    K.floor({ x0, y0, x1, y1, color: '#4a3a3a', light: L });
    K.floor({ x0, y0, x1, y1, z: h, color: '#2a2230', light: L });
    // parede norte com a porta do corredor (o vão aceso)
    placa(K, { x: (x0 + QV.porta - 0.45) / 2, y: y0 + 0.01, w: QV.porta - 0.45 - x0, h, ang: Math.PI / 2, img: pap, color: '#ffffff', light: L });
    placa(K, { x: (QV.porta + 0.45 + x1) / 2, y: y0 + 0.01, w: x1 - QV.porta - 0.45, h, ang: Math.PI / 2, img: pap, color: '#ffffff', light: L });
    placa(K, { x: QV.porta, y: y0 + 0.01, z: 1.38, w: 0.9, h: h - 1.38, ang: Math.PI / 2, img: pap, color: '#ffffff', light: L });
    K.quad({ x: QV.porta, y: y0 - 0.25, z: 0, w: 1.4, h: 1.6, ang: Math.PI / 2, color: '#ffcf8a', em: true });
    K.floor({ x0: QV.porta - 0.5, y0, x1: QV.porta + 0.5, y1: y0 + 1.4, z: 0.012, img: brilho('rgba(255,200,130,0.55)', 0.5, 0.05), color: '#ffffff', em: true, alpha: 0.999 });
    // paredes leste e oeste
    placa(K, { x: x0 + 0.01, y: (y0 + y1) / 2, w: y1 - y0, h, ang: 0, img: pap, color: '#ffffff', light: L });
    placa(K, { x: x1 - 0.01, y: (y0 + y1) / 2, w: y1 - y0, h, ang: Math.PI, img: pap, color: '#ffffff', light: L });
    // parede sul com a porta de vidro da varanda
    placa(K, { x: (x0 + QV.vidro[0]) / 2, y: y1 - 0.01, w: QV.vidro[0] - x0, h, ang: -Math.PI / 2, img: pap, color: '#ffffff', light: L });
    placa(K, { x: (QV.vidro[1] + x1) / 2, y: y1 - 0.01, w: x1 - QV.vidro[1], h, ang: -Math.PI / 2, img: pap, color: '#ffffff', light: L });
    placa(K, { x: (QV.vidro[0] + QV.vidro[1]) / 2, y: y1 - 0.01, z: 1.5, w: QV.vidro[1] - QV.vidro[0], h: h - 1.5, ang: -Math.PI / 2, img: pap, color: '#ffffff', light: L });
    [QV.vidro[0], (QV.vidro[0] + QV.vidro[1]) / 2, QV.vidro[1]].forEach((x) => K.box({ x0: x - 0.04, y0: y1 - 0.04, x1: x + 0.04, y1: y1 + 0.04, z0: 0, z1: 1.5, color: '#2a2230', light: L }));
    // a cama, o criado-mudo e o abajur (a luz quente do quarto)
    K.box({ x0: 84.45, y0: 15.7, x1: 85.6, y1: 17.8, z0: 0, z1: 0.22, color: '#3b3048', top: '#c7cfe0', light: L });
    K.box({ x0: 84.45, y0: 15.7, x1: 84.62, y1: 17.8, z0: 0, z1: 0.6, color: '#5a3a2a', light: L });
    K.box({ x0: 84.45, y0: 17.85, x1: 84.9, y1: 18.3, z0: 0, z1: 0.36, color: '#4a3424', top: '#5a4030', light: L });
    K.box({ x0: 84.6, y0: 17.98, x1: 84.76, y1: 18.14, z0: 0.36, z1: 0.56, color: '#fde68a', em: true });
    K.floor({ x0: 84.4, y0: 16.6, x1: 86.6, y1: 18.4, z: 0.012, img: brilho('rgba(255,214,150,0.6)'), color: '#ffffff', em: true, alpha: 0.999 });
    // a mala aberta e a camisa da seleção em cima da cadeira
    K.box({ x0: 88.4, y0: 17.5, x1: 89.25, y1: 18.0, z0: 0, z1: 0.18, color: '#1e3a8a', top: '#1d4ed8', light: L });
    // a varanda, o guarda-corpo, a cidade e a lua
    K.floor({ x0: 86.6, y0: y1, x1: 89.2, y1: 19.7, z: 0.01, color: '#3d4466', light: [0.6, 0.66, 0.9] });
    placa(K, { x: 87.9, y: 19.66, w: 2.6, h: 0.46, ang: -Math.PI / 2, img: grade(), color: '#ffffff', light: [0.6, 0.66, 0.9] });
    // as paredes dos lados da varanda (a fachada do hotel continua)
    [[86.6, 0], [89.2, Math.PI]].forEach(([x, a]) => placa(K, { x, y: 19.05, w: 1.3, h: h, ang: a, color: '#4a4762', light: [0.6, 0.64, 0.85] }));
    placa(K, { x: 87.9, y: 40, z: -6, w: 70, h: 26, ang: -Math.PI / 2, img: cidadeCv(), color: '#ffffff', em: true, alpha: 0.999 });
    K.sprite(luaCv(), { x: 95, y: 36, z: 10, w: 2.6, h: 2.6, glow: true });
    void t;
  }
  // as tomadas da conversa: aberta (do canto, por cima), e uma por quem fala
  const PLANO = {
    geral: [{ eye: [89.1, 1.6, 18.15], look: [86.4, 0.45, 15.9], fov: 56, drift: [-0.2, -0.04, -0.15] }, { eye: [88.9, 1.75, 17.9], look: [86.2, 0.45, 15.6], fov: 54, drift: [-0.15, -0.05, -0.2] }],
    'VOCÊ': { eye: [87.5, 0.9, 18.0], look: [85.45, 0.48, 16.9], fov: 42, drift: [-0.12, 0, -0.05] },
    'RIN ITOSHI': { eye: [87.6, 0.98, 16.7], look: [88.35, 0.66, 19.4], fov: 46, drift: [0.04, 0, 0.12] },
    'SAE ITOSHI': { eye: [87.6, 0.95, 17.2], look: [85.5, 0.62, 15.0], fov: 42, drift: [-0.08, 0, -0.1] },
    'RYUSEI SHIDOU': { eye: [86.2, 0.9, 17.4], look: [88.2, 0.6, 15.3], fov: 44, drift: [0.1, 0, -0.08] }
  };
  CE.c3Sets = CE.c3Sets || {};
  CE.c3Sets.hotel = {
    build: (K, t) => quartoConversa(K, t),
    expo: 1.0,
    // onde cada um fica (quem não está na lista entra no meio do quarto)
    lugar(sp, i) {
      const up = String(sp || '').toUpperCase();
      const l = LUGAR[up] || LUGAR[Object.keys(LUGAR).find((k) => up.includes(k.split(' ')[0])) || ''];
      return l || { x: 86.8 + i * 0.5, y: 16.6, ang: Math.PI * 0.75, luz: [0.95, 0.8, 0.66] };
    },
    // a tomada de cada fala: quem fala (pelo nome), você, ou a aberta
    plano(sp, alt, ehVoce) {
      if (ehVoce) return PLANO['VOCÊ'];
      const up = String(sp || '').toUpperCase();
      const k = Object.keys(PLANO).find((n) => n !== 'geral' && (up === n || up.includes(n.split(' ')[0])));
      return k ? PLANO[k] : PLANO.geral[alt % 2];
    }
  };
  void TAU;
  void clamp;
  void seg;
  void lerp;
})();
