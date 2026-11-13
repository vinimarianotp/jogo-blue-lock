// ============================================================================
// ROTEIRO DE DADOS DAS CUTSCENES (regras e a referência completa da API:
// CUTSCENE_STYLE.md §8; exemplo com todos os recursos: testes/roteiro_demo.js)
// Uma cena nova é uma LISTA DE PLANOS, não código solto: cada plano diz onde a câmera vai,
// quem está em cena, quem fala e que efeito acontece, e o motor cuida do acabamento — as
// tarjas, a legenda com digitação e a cor de quem fala, o tempo de leitura, os cortes, o
// pré-carregamento dos bonecos, o AVANÇAR/PULAR e o aviso de "mais de um pico".
// CE.roteiro(tipo, spec) compila o roteiro para o kit 3D (js/cine3d_kit.js: phases, subs,
// scene, overlay). O que for desenho próprio da cena (cenário, cut-in, efeito-assinatura)
// entra pelos ganchos cenario/cena/sobre/depois, chamados na ordem fixa descrita abaixo.
// As 3 cenas de referência (bl_eleven, itoshi_snow, wildcard_door) são roteiros: bons
// exemplos de cena grande. Cenas novas: js/roteiros/*.js. Só acrescente à API (as cenas
// dependem das assinaturas de hoje).
//
//   CE.roteiro('tipo', {
//     titulo, musica, tema, tarja: 0.12, grao: 0.06, vinheta: 0.55, leitura: 1, corte: 'seco',
//     cores: { NOME: '#hex' },                 // (sobrescreve a tabela de cores de quem fala)
//     cenario(K, t, st, plano, S) { ... },     // o lugar 3D, todo quadro, em todos os planos
//     planos: [{
//       id, dur,                                // dur em quadros (60 = 1 s)
//       expo, ceu: [topo, horizonte, estrelas], neblina: [cor, dens], luz: '#ambiente',
//       fundo: { cor, degrade: [c0, c1], reticula: { cor, passo, de }, alpha },
//       cam: { de: [olho, alvo, fov], para: [olho, alvo, fov], curva, em, ate } | fn(K, t, S, st),
//       atores: [{ quem, x, y, z | de: [x, y, z], para: [...], curva, em, ate, arco, anim,
//                 passo, frame, escala, luz, contraluz, alpha, silhueta, sombra, olha, ang,
//                 tempo: 'real' | 'acao' | fn, visivel, kit, extra, opts, view, left, seat }],
//       falas: [{ em, ate, quem, texto, tipo: 'fala' | 'grito' | 'pensamento' | 'sussurro', cor }],
//       quadros, onomatopeias, letreiros, cartela, efeitos, sons, lento, corte, escolha,
//       narracao: 'frase',
//       cena(K, S, st), sobre(ctx, S, K, st), depois(ctx, S, K, st)
//     }]
//   });
//
// Ordem de cada quadro — 3D: câmera → expo/céu/neblina/luz do plano → cenario → atores →
// cena() → tremor/zoom. 2D (por cima da imagem 3D): fundo → silhuetas → sobre() → quadros →
// efeitos (na ordem da lista) → onomatopeias → letreiros → cartela → narração → depois() →
// transição de entrada (wipe/vidro). Quem vem depois manda.
// Coordenadas: atores e CE.roteiro.ponto(x, y, h) usam [x, y] do chão e h = altura; a câmera
// usa [x, altura, y] (como o K.cam). Qualquer campo de ator ou de efeito pode ser uma função
// (t, S, st) → valor. Sem 3D (aparelho sem WebGL2) a cena de roteiro não toca (a cena segue).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE) return;
  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  // (com a === b vira um degrau, sem divisão por zero)
  const seg = (t, a, b) => (b === a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };

  // ---------------------------------------------------------------- curvas
  const CURVAS = {
    linear: (x) => clamp(x),
    ease: (x) => 1 - Math.pow(1 - clamp(x), 3), // sai rápido e pousa
    easeIO: (x) => {
      x = clamp(x);
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    },
    entra: (x) => clamp(x) * clamp(x), // começa devagar e acelera
    suave: (x) => {
      x = clamp(x);
      return x * x * (3 - 2 * x);
    }
  };
  const curva = (c) => (typeof c === 'function' ? c : CURVAS[c] || CURVAS.easeIO);

  // ---------------------------------------------------------------- cor de quem fala
  // CUTSCENE_STYLE §1.2: a cor de cada personagem (nome na legenda, linhas, luz de destaque).
  // Personagem novo ganha a cor lá e aqui, antes de entrar em cena.
  const CORES = {
    'VOCÊ': '#00f5d4',
    RIN: '#2dd4bf',
    SAE: '#fb7185',
    AIKU: '#f59e0b',
    EGO: '#22d3ee',
    BACHIRA: '#facc15',
    KUNIGAMI: '#fb923c',
    NARRADOR: '#94a3b8',
    NAGI: '#e2e8f0',
    CHIGIRI: '#f87171',
    ANRI: '#fcd34d',
    SHIDOU: '#ec4899',
    REO: '#c084fc'
  };
  const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  function corDe(quem, extra) {
    const tab = Object.assign({}, CORES, extra || {});
    if (!quem) return tab.NARRADOR;
    const up = String(quem).toUpperCase();
    if (up === 'YOU' || up === 'VOCÊ' || up === CE.cinePlayerName()) return tab['VOCÊ'];
    if (tab[up]) return tab[up];
    const plain = semAcento(up);
    for (const k of Object.keys(tab)) if (semAcento(k) === plain) return tab[k];
    // "SAE ITOSHI" → SAE, "JINPACHI EGO" → EGO
    for (const w of up.split(/\s+/)) if (tab[w]) return tab[w];
    return '#e2e8f0';
  }
  const nomeDe = (f) => {
    if (f.nome) return f.nome;
    const q = String(f.quem || 'NARRADOR');
    return q === 'you' || q.toUpperCase() === 'VOCÊ' ? CE.cinePlayerName() : q.toUpperCase();
  };
  const textoDe = (f) => {
    const s = typeof f.texto === 'function' ? f.texto() : String(f.texto ?? '');
    return s.replace(/\{NOME\}/g, CE.cinePlayerName());
  };

  // ---------------------------------------------------------------- avisos (só depuração)
  // console.warn só com ?debug na URL ou no modo de teste (CE.roteiroTeste = true): no jogo
  // normal o console fica limpo
  const debug = () => {
    try {
      return !!CE.roteiroTeste || /[?&]debug\b/.test(window.location.search);
    } catch (e) {
      return false;
    }
  };
  const avisar = (tipo, msg) => {
    const R = CE.roteiro.cenas[tipo];
    if (R && !R.avisos.includes(msg)) R.avisos.push(msg);
    if (debug()) console.warn(`[roteiro ${tipo}] ${msg}`);
  };
  // "Um pico por cena" (§1.8): impacto, inversão, clarão forte, P&B total, onomatopeia gigante
  // e tremor forte. Conta os do roteiro na compilação e os dos ganchos quando eles chamam
  // CE.roteiro.fx.* (registro por cena/plano/tipo)
  const PICO_TIPOS = { impacto: 'quadro de impacto', inverter: 'inversão de cor', flash: 'clarão', pb: 'preto e branco total', tremor: 'tremor forte', ono: 'onomatopeia gigante' };
  function ehPico(e) {
    if (e.tipo === 'impacto' || e.tipo === 'inverter') return true;
    if (e.tipo === 'flash') return (e.forca ?? 1) >= 0.6;
    if (e.tipo === 'pb') return (e.forca ?? 1) >= 0.9 && !e.circulo;
    if (e.tipo === 'tremor') return (e.forca ?? 0.5) >= 0.7;
    return false;
  }
  function pico(tipo, nome, phase) {
    const R = CE.roteiro.cenas[tipo];
    if (!R) return;
    const key = `P${phase + 1} ${PICO_TIPOS[nome] || nome}`;
    if (R.picos.includes(key)) return;
    R.picos.push(key);
    // (planos diferentes com o mesmo tipo de pico também contam: são dois picos)
    if (R.picos.length > 1) avisar(tipo, `mais de 1 efeito de pico na cena: ${R.picos.join(', ')}`);
  }

  // ---------------------------------------------------------------- efeitos prontos
  // (também para os ganchos sobre/depois: o desenho é o mesmo e o pico fica registrado)
  const fx = {
    // quadro de impacto: a imagem em P&B com as cores invertidas (1 a 2 quadros)
    impacto(ctx, W, H) {
      if (CE.sakugaType) pico(CE.sakugaType, 'impacto', CE.sakugaPhase);
      ctx.save();
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    },
    // inversão de cor (o "devorar"): a cor vira o negativo, sem perder o matiz
    inverter(ctx, W, H, a = 1) {
      if (a <= 0) return;
      if (CE.sakugaType) pico(CE.sakugaType, 'inverter', CE.sakugaPhase);
      ctx.save();
      ctx.globalAlpha = clamp(a);
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    },
    // preto e branco com tom (azulado por padrão); circle: só dentro/fora de um círculo
    pb(ctx, W, H, a = 1, circle = null, tint = '#3b82f6') {
      if (a <= 0) return;
      if (a >= 0.9 && !circle && CE.sakugaType) pico(CE.sakugaType, 'pb', CE.sakugaPhase);
      ctx.save();
      if (circle) {
        ctx.beginPath();
        if (circle.inside) ctx.arc(circle.x, circle.y, Math.max(0, circle.r), 0, TAU);
        else {
          ctx.rect(0, 0, W, H);
          ctx.arc(circle.x, circle.y, Math.max(0, circle.r), 0, TAU, true);
        }
        ctx.clip('evenodd');
      }
      ctx.globalAlpha = clamp(a);
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = clamp(a) * 0.3;
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    },
    // clarão (no máximo 0,15 s quando forte)
    flash(ctx, W, H, a, cor = '#ffffff') {
      if (a <= 0) return;
      if (a >= 0.6 && CE.sakugaType) pico(CE.sakugaType, 'flash', CE.sakugaPhase);
      CE.cineFlash(ctx, W, H, a, cor);
    },
    // escurece (fade para o preto) a tela inteira
    escuro(ctx, W, H, a) {
      if (a <= 0) return;
      ctx.fillStyle = `rgba(0,0,0,${clamp(a)})`;
      ctx.fillRect(0, 0, W, H);
    },
    // pinta a imagem com uma cor (modo de mistura do canvas)
    cor(ctx, W, H, cor, a = 0.3, modo = 'soft-light') {
      if (a <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = modo;
      ctx.globalAlpha = clamp(a);
      ctx.fillStyle = cor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  };

  // ---------------------------------------------------------------- utilidades de cor
  const rgbDe = (c) => {
    if (Array.isArray(c)) return c.map((v) => (v <= 1.5 ? v * 255 : v));
    const h = String(c).replace('#', '');
    const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
    return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
  };
  const corMix = (a, b, k) => {
    const A = rgbDe(a);
    const B = rgbDe(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
  };

  // ---------------------------------------------------------------- peças de cenário
  // canvas pintado UMA vez (pixel art: sem suavizar)
  const TELAS = new Map();
  function tela(chave, w, h, fn) {
    let c = TELAS.get(chave);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    fn(g, w, h);
    TELAS.set(chave, c);
    return c;
  }
  // brilho redondo (degradê até o transparente), para poças de luz e halos de lâmpada
  const brilho = (cor, cx = 0.5, cy = 0.5) =>
    tela(`brilho|${cor}|${cx}|${cy}`, 64, 64, (g) => {
      const r = 64 * Math.max(cx, 1 - cx, cy, 1 - cy);
      const gr = g.createRadialGradient(64 * cx, 64 * cy, 0, 64 * cx, 64 * cy, r);
      gr.addColorStop(0, cor);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    });
  // placa em pé que se lê de frente (o K.quad espelha a imagem vista do lado de ang)
  const placa = (K, o) => K.quad(Object.assign({}, o, { ang: (o.ang ?? 0) + Math.PI }));
  // sala fechada montada na área vazia (K.VOID): chão, 4 paredes viradas para dentro e
  // (opcional) a faixa do rodapé. o = { x0, y0, x1, y1, h, chao, parede, paredes: { n, s, l, o } }
  function sala(K, o) {
    const h = o.h ?? 1.75;
    K.floor({ x0: o.x0, y0: o.y0, x1: o.x1, y1: o.y1, color: o.chao || '#3a3f4a', img: o.chaoImg });
    const P = Object.assign({}, o.paredes || {});
    const cor = (k) => (P[k] && P[k].color) || o.parede || '#262b36';
    const img = (k) => (P[k] && P[k].img) || o.paredeImg;
    if (P.n !== false) placa(K, { x: (o.x0 + o.x1) / 2, y: o.y0 + 0.01, w: o.x1 - o.x0, h, ang: Math.PI / 2, color: cor('n'), img: img('n') });
    if (P.s !== false) placa(K, { x: (o.x0 + o.x1) / 2, y: o.y1 - 0.01, w: o.x1 - o.x0, h, ang: -Math.PI / 2, color: cor('s'), img: img('s') });
    if (P.o !== false) placa(K, { x: o.x0 + 0.01, y: (o.y0 + o.y1) / 2, w: o.y1 - o.y0, h, ang: 0, color: cor('o'), img: img('o') });
    if (P.l !== false) placa(K, { x: o.x1 - 0.01, y: (o.y0 + o.y1) / 2, w: o.y1 - o.y0, h, ang: Math.PI, color: cor('l'), img: img('l') });
  }
  // fileiras de assentos (auditório, teatro, arquibancada): caixas em grade
  function fileiras(K, o) {
    const n = o.colunas || 8;
    const m = o.linhas || 4;
    for (let j = 0; j < m; j++) {
      for (let i = 0; i < n; i++) {
        const x = o.x0 + i * (o.dx ?? 0.5);
        const y = o.y0 + j * (o.dy ?? 0.6);
        const z0 = j * (o.degrau ?? 0);
        K.box({ x0: x - 0.18, y0: y - 0.16, x1: x + 0.18, y1: y + 0.16, z0, z1: z0 + 0.18, color: o.cor || '#7f1d1d', top: o.topo || '#991b1b' });
        K.box({ x0: x - 0.18, y0: y + 0.12, x1: x + 0.18, y1: y + 0.18, z0, z1: z0 + 0.42, color: o.cor || '#7f1d1d' });
      }
    }
  }
  // fachada com janelas (prédio, hotel): devolve o canvas para uma placa
  const fachada = (o = {}) =>
    tela(`fachada|${o.cor}|${o.janela}|${o.colunas}|${o.andares}|${o.acesas}`, 96, 96, (g, w, h) => {
      g.fillStyle = o.cor || '#2b2f45';
      g.fillRect(0, 0, w, h);
      const nc = o.colunas || 6;
      const na = o.andares || 6;
      const cw = w / nc;
      const ch = h / na;
      for (let a = 0; a < na; a++) {
        for (let c = 0; c < nc; c++) {
          const on = rnd(a * 31 + c, 5) < (o.acesas ?? 0.55);
          g.fillStyle = on ? o.janela || '#ffd27a' : '#1a1d2c';
          g.fillRect(Math.round(c * cw + cw * 0.2), Math.round(a * ch + ch * 0.25), Math.max(2, Math.round(cw * 0.6)), Math.max(2, Math.round(ch * 0.5)));
        }
      }
    });

  // ---------------------------------------------------------------- pontos do mundo
  // ponto guardado no st durante o 3D e entregue ao 2D já na tela ({ x, y } ou null)
  const ponto = (x, y, h = 0) => ({ __p: [x, y, h] });
  function stTela(K) {
    const out = {};
    Object.keys(K.st || {}).forEach((k) => {
      const v = K.st[k];
      out[k] = v && v.__p ? K.screen(v.__p[0], v.__p[2], v.__p[1]) : v;
    });
    return out;
  }
  const alvoDe = (a, st, S) => {
    if (!a) return { x: S.W / 2, y: (S.top + S.bot) / 2 };
    if (typeof a === 'string') return st[a] || null;
    if (Array.isArray(a)) return { x: a[0] <= 1 ? a[0] * S.W : a[0], y: a[1] <= 1 ? S.top + a[1] * S.stageH : a[1] };
    return a;
  };

  // ---------------------------------------------------------------- tempo da ação (lento)
  // lento = { em, ate, fator: 0.25, rampa: 20 }: a velocidade cai até o fator (rampa de
  // entrada e de saída) e o tempo da ação (S.A) anda mais devagar que o do plano
  function acao(lento, t) {
    if (!lento) return t;
    const L = [].concat(lento);
    let A = t;
    L.forEach((l) => {
      const f = l.fator ?? 0.25;
      const a = l.em ?? 0;
      const b = l.ate ?? a + 60;
      const r = Math.max(0, Math.min(l.rampa ?? 18, (b - a) / 2));
      // integral de (1 - v) onde v cai de 1 para f: perda acumulada até t
      const perda = (x) => {
        if (x <= a) return 0;
        const d = 1 - f;
        let p = 0;
        const x1 = Math.min(x, a + r);
        if (r > 0) p += d * ((x1 - a) * (x1 - a)) / (2 * r);
        if (x <= a + r) return p;
        const x2 = Math.min(x, b - r);
        p += d * (x2 - (a + r));
        if (x <= b - r) return p;
        const x3 = Math.min(x, b);
        const u = x3 - (b - r);
        if (r > 0) p += d * (u - (u * u) / (2 * r));
        return p;
      };
      A -= perda(t);
    });
    return A;
  }

  // ---------------------------------------------------------------- estado por vez que toca
  const estadoDe = (R) => {
    if (R.run !== CE._cineRun) {
      R.run = CE._cineRun;
      R.estado = {};
      R.escolhido = {};
    }
    return R.estado;
  };

  // ---------------------------------------------------------------- atores
  const PROIBIDO_ATOR = ['aura', 'closeOlho', 'olhoGrande'];
  function ator(K, a, S, st, R) {
    const tt = a.tempo === 'real' ? S.t : typeof a.tempo === 'function' ? a.tempo(S.t, S, st) : S.A;
    const v = (x) => (typeof x === 'function' ? x(tt, S, st) : x);
    if (a.visivel !== undefined) {
      const vis = v(a.visivel);
      if (vis === false) return null;
      if (Array.isArray(vis) && (tt < vis[0] || tt >= vis[1])) return null;
    }
    let x = v(a.x);
    let y = v(a.y);
    let z = v(a.z);
    if (a.de) {
      const de = v(a.de);
      const para = v(a.para) || de;
      const q = seg(tt, a.em ?? 0, a.ate ?? S.dur);
      const k = curva(a.curva || 'linear')(q);
      x = lerp(de[0], para[0], k);
      y = lerp(de[1], para[1], k);
      if (de[2] !== undefined || para[2] !== undefined) z = lerp(de[2] || 0, para[2] ?? de[2] ?? 0, k);
      // arremesso/pulo: sobe e desce no meio do trajeto (altura do arco)
      if (a.arco) z = (z || 0) + v(a.arco) * Math.sin(Math.PI * q);
    }
    const o = { x, y, z, id: a.id, kit: a.kit, extra: v(a.extra), opts: v(a.opts), view: v(a.view), left: v(a.left), seat: a.seat, k: v(a.escala), alpha: v(a.alpha), shadow: v(a.sombra), dark: v(a.escuro) };
    // (o quadro do passo segue o tempo do ator: em câmera lenta ele anda devagar)
    const fr = S.f + (tt - S.t);
    let anim = v(a.anim) || 'idle';
    if (anim === 'andar') {
      anim = 'run';
      o.frame = 1 + (Math.floor(fr / (a.passo || 6)) % 4) * 4;
    } else if (anim === 'correr') {
      anim = 'run';
      o.frame = 1 + (Math.floor(fr / (a.passo || 3)) % 4) * 4;
    }
    o.anim = anim;
    // (frame como função que devolve undefined = o quadro padrão daquele momento)
    if (a.frame !== undefined) {
      const fv = v(a.frame);
      if (fv !== undefined) o.frame = fv;
    }
    const luz = v(a.luz);
    const cl = v(a.contraluz);
    if (cl) o.light = cl === true ? [0.14, 0.12, 0.15] : cl;
    else if (luz) o.light = luz;
    const olha = v(a.olha);
    if (olha === 'camera') o.face = [K.c.eye[0], K.c.eye[2]];
    else if (Array.isArray(olha)) o.face = olha;
    else o.ang = v(a.ang) ?? 0;
    if (v(a.aceso)) o.glow = true; // (só holograma/fantasma: nunca aura em volta de boneco)
    PROIBIDO_ATOR.forEach((p) => a[p] !== undefined && avisar(R.tipo, `ator ${a.quem}: "${p}" é proibido (CUTSCENE_STYLE §4) e foi ignorado`));
    // silhueta numa cor (2D, por cima): o boneco 3D não aparece
    const sil = v(a.silhueta);
    if (sil) {
      const cor = typeof sil === 'string' ? sil : sil.cor || '#0b1020';
      (st.__sil || (st.__sil = [])).push({ quem: a.quem, o, cor, alpha: typeof sil === 'object' ? sil.alpha ?? 1 : 1 });
      return null;
    }
    // (sem undefined no objeto: o K.actor trata ausência e undefined do mesmo jeito)
    Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]);
    const r = K.actor(a.quem, o);
    if (st.atores) st.atores[a.id || a.quem] = r;
    // olhos acesos (recurso 16): guardados para o 2D, na altura dos olhos deste boneco
    const ol = v(a.olhos);
    if (ol) {
      const kk = r.k || 0.9;
      const cor = typeof ol === 'string' ? ol : ol.cor || '#22d3ee';
      (st.__olhos || (st.__olhos = [])).push({ x: r.x, y: r.y, z: K.headZ(r) + 0.57 * (kk / 0.9), cor: rgbaDe(cor, 0.95), forca: typeof ol === 'object' ? ol.forca ?? 1 : 1 });
    }
    return r;
  }
  // '#hex' ou [r, g, b] → 'rgba(r,g,b,a)' (o brilho pronto do kit precisa do alfa no fim)
  const rgbaDe = (c, a = 1) => (String(c).startsWith('rgba') ? c : `rgba(${rgbDe(c).map(Math.round).join(',')},${a})`);
  // os olhos acesos: dois pontinhos do tamanho certo para a distância (nunca um close de olho)
  function olhos(ctx, S, K, st) {
    if (!st.__olhos) return;
    st.__olhos.forEach((o) => {
      const k = clamp(o.forca);
      if (k <= 0) return;
      const a = K.screen(o.x, o.z, o.y);
      const b = K.screen(o.x, o.z + 0.1, o.y);
      if (!a || !b) return;
      const u = Math.abs(a.y - b.y) * 10; // px por ladrilho nessa distância
      [-1, 1].forEach((s) => {
        CE.cineGlow(ctx, a.x + s * u * 0.015, a.y, Math.max(8, u * 0.045), o.cor, k);
        CE.cineGlow(ctx, a.x + s * u * 0.015, a.y, Math.max(3, u * 0.0145), 'rgba(240,253,250,1)', k);
      });
    });
  }
  // as silhuetas: a forma do boneco (CE.ART.silhouette) no lugar e no tamanho dele na tela
  function silhuetas(ctx, S, K, st) {
    const A = CE.ART;
    const X = window.Hub && window.Hub._3d;
    if (!A || !A.silhouette || !X || !st.__sil) return;
    st.__sil.forEach((s) => {
      const o = s.o;
      const cd = K.charData(s.quem, o);
      const z = o.z || 0;
      const box = (72 / X.C.SPX) * (o.k || 0.9);
      const pf = K.screen(o.x, z, o.y);
      const pt = K.screen(o.x, z + box * (66 / 72), o.y);
      if (!pf || !pt) return;
      const h = Math.abs(pf.y - pt.y) * (72 / 66);
      if (h < 4) return;
      const eye = K.c.eye;
      const ang = o.face ? Math.atan2(o.face[1] - o.y, o.face[0] - o.x) : o.ang || 0;
      let rel = Math.atan2(eye[2] - o.y, eye[0] - o.x) - ang;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      const view = o.view || (Math.abs(rel) < 0.75 ? 'front' : Math.abs(rel) > 2.4 ? 'back' : 'side');
      ctx.save();
      ctx.globalAlpha = clamp(s.alpha);
      A.silhouette(ctx, cd, pf.x, pf.y, h, { view, pose: o.anim, frame: o.frame || 0, fill: s.cor });
      ctx.restore();
    });
  }

  // ---------------------------------------------------------------- câmera
  function camera(K, pl, S, st) {
    const c = pl.cam;
    if (!c) return;
    if (typeof c === 'function') {
      const r = c.call(CE, K, S.t, S, st);
      if (Array.isArray(r)) K.cam(r[0], r[1], r[2]);
      return;
    }
    const k = curva(c.curva || 'easeIO')(seg(c.tempo === 'acao' ? S.A : S.t, c.em ?? 0, c.ate ?? S.dur));
    const de = c.de;
    const para = c.para || c.de;
    const fov = de[2] !== undefined ? lerp(de[2], para[2] ?? de[2], k) : undefined;
    K.cam(mix(de[0], para[0], k), mix(de[1], para[1], k), fov);
  }
  // tremor (trauma que cai com o tempo; a tremida usa trauma² com ruído suave) e zoom
  function efeitosCam(K, pl, S) {
    (pl.efeitos || []).forEach((e, i) => {
      const t = e.tempo === 'acao' ? S.A : S.t;
      const em = e.em ?? 0;
      const ate = e.ate ?? Infinity;
      if (t < em || t >= ate) return;
      if (e.tipo === 'tremor') {
        const f0 = e.forca ?? 0.5;
        const dur = Number.isFinite(ate) ? ate - em : 30;
        const tr = Math.max(0, f0 * (1 - (t - em) / dur));
        const amp = (e.amp ?? 0.06) * tr * tr;
        const f = S.f * 2;
        const sd = e.semente ?? i + 1;
        const p = K.c.eye;
        K.c.eye = [p[0] + K.noise(f, sd) * amp, p[1] + K.noise(f, sd + 3) * amp * 0.6, p[2] + K.noise(f, sd + 7) * amp];
      } else if (e.tipo === 'zoom') {
        const k = curva(e.curva || 'easeIO')(seg(t, em, Number.isFinite(ate) ? ate : S.dur));
        K.c.fov = (K.c.fov || 50) * lerp(e.de ?? 1, e.para ?? 0.8, k);
      }
    });
  }

  // ---------------------------------------------------------------- 2D: fundo e narração
  function fundo(ctx, S, f) {
    const { W, H, top, stageH } = S;
    ctx.save();
    ctx.globalAlpha = clamp(f.alpha ?? 1);
    if (f.degrade) CE.cineGradient(ctx, 0, 0, W, H, [[0, f.degrade[0]], [1, f.degrade[1]]]);
    else if (f.cor) {
      ctx.fillStyle = f.cor;
      ctx.fillRect(0, 0, W, H);
    }
    if (f.reticula && CE.ART && CE.ART.halftone) {
      const r = f.reticula === true ? {} : f.reticula;
      CE.ART.halftone(ctx, 0, top, W, stageH, { color: r.cor || 'rgba(2,6,23,0.35)', step: r.passo || 14, from: r.de || 'bottom', max: r.max ?? 0.8 });
    }
    ctx.restore();
  }
  // a frase única, grande e centralizada no fundo preto (com digitação)
  function narracao(ctx, S, n) {
    const { W, top, bot, t } = S;
    const texto = typeof n === 'string' ? n : String(n.texto || '');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, top, W, bot - top);
    const fs = n.tam || 44;
    ctx.save();
    ctx.font = `700 ${fs}px Inter, "Segoe UI", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    // quebra em linhas pela largura do texto inteiro (o texto não pula enquanto é digitado)
    const maxW = W * 0.74;
    const linhas = [];
    let cur = '';
    texto.split(/\s+/).forEach((w) => {
      const tryS = cur ? cur + ' ' + w : w;
      if (ctx.measureText(tryS).width > maxW && cur) {
        linhas.push(cur);
        cur = w;
      } else cur = tryS;
    });
    if (cur) linhas.push(cur);
    const lh = fs * 1.3;
    const y0 = (top + bot) / 2 - ((linhas.length - 1) * lh) / 2;
    const cps = CE.cineTypeRate ? CE.cineTypeRate() : 0.75;
    let resto = cps === Infinity ? Infinity : Math.max(0, Math.floor((t - (n.em ?? 10)) * cps));
    ctx.globalAlpha = seg(t, n.em ?? 10, (n.em ?? 10) + 12);
    ctx.fillStyle = n.cor || '#f8fafc';
    linhas.forEach((l, i) => {
      const lw = ctx.measureText(l).width;
      const vis = l.slice(0, Math.max(0, Math.min(l.length, resto)));
      resto -= l.length + 1;
      if (vis) ctx.fillText(vis, W / 2 - lw / 2, y0 + i * lh);
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- 2D: quadros (cut-ins)
  // layouts prontos (polígonos na tela); 'largo' = uma faixa larga no meio do quadro
  function layoutDe(nome, S, i) {
    const { W, top, bot } = S;
    const sh = bot - top;
    const L = {
      direita: [[[W * 0.58, top + 22], [W - 24, top + 22], [W - 24, top + sh * 0.58], [W * 0.58, top + sh * 0.58]]],
      esquerda: [[[24, top + 22], [W * 0.42, top + 22], [W * 0.42, top + sh * 0.58], [24, top + sh * 0.58]]],
      1: [[[W * 0.2, top + 24], [W * 0.8, top + 24], [W * 0.8, bot - 24], [W * 0.2, bot - 24]]],
      largo: [[[40, top + sh * 0.22], [W - 40, top + sh * 0.16], [W - 40, top + sh * 0.76], [40, top + sh * 0.82]]],
      2: [
        [[24, top + 22], [W / 2 - 8, top + 22], [W / 2 - 8, bot - 22], [24, bot - 22]],
        [[W / 2 + 8, top + 22], [W - 24, top + 22], [W - 24, bot - 22], [W / 2 + 8, bot - 22]]
      ],
      3: [0, 1, 2].map((k) => {
        const x0 = 24 + k * ((W - 48) / 3) + (k ? 8 : 0);
        const x1 = 24 + (k + 1) * ((W - 48) / 3) - (k < 2 ? 8 : 0);
        return [[x0, top + 22], [x1, top + 22], [x1, bot - 22], [x0, bot - 22]];
      }),
      diagonal: [
        [[24, top + 22], [W * 0.62, top + 22], [W * 0.38, bot - 22], [24, bot - 22]],
        [[W * 0.62 + 16, top + 22], [W - 24, top + 22], [W - 24, bot - 22], [W * 0.38 + 16, bot - 22]]
      ],
      quebrado: [
        [[24, top + 22], [W * 0.55, top + 22], [W * 0.45, top + sh * 0.55], [24, top + sh * 0.62]],
        [[W * 0.55 + 14, top + 22], [W - 24, top + 22], [W - 24, top + sh * 0.48], [W * 0.45 + 14, top + sh * 0.55]],
        [[24, top + sh * 0.62 + 14], [W * 0.45 + 8, top + sh * 0.55 + 14], [W - 24, top + sh * 0.48 + 14], [W - 24, bot - 22], [24, bot - 22]]
      ]
    };
    const p = L[nome] || L.direita;
    return i === undefined ? p : p[i % p.length];
  }
  function quadro(ctx, S, K, st, q, R, idx) {
    const t = S.t;
    const em = q.em ?? 0;
    const ate = q.ate ?? Infinity;
    if (t < em || t >= ate) return;
    const kIn = seg(t, em, em + (q.entra ?? 9));
    const kOut = q.sai ? 1 - seg(t, ate - q.sai, ate) : 1;
    const prog = seg(t, em, Number.isFinite(ate) ? ate : S.dur);
    // desenho próprio da cena (cut-in completo)
    if (q.desenha) {
      q.desenha.call(CE, ctx, S, kIn * kOut, t, prog, st, K);
      return;
    }
    const A = CE.ART;
    if (!A || !A.panel || !q.desenho) return;
    const polys = q.poly ? [q.poly] : layoutDe(q.layout || 'direita', S);
    const fns = [].concat(q.desenho);
    polys.forEach((poly, i) => {
      const fn = fns[i % fns.length];
      // (os quadros de um layout entram um depois do outro)
      const k = seg(t, em + i * (q.escalonar ?? 6), em + i * (q.escalonar ?? 6) + (q.entra ?? 9)) * kOut;
      if (k <= 0) return;
      A.panel(ctx, poly, (b, g) => fn.call(CE, b, g, prog, S, st, i), { k, from: q.de || [S.W * 0.3 * (i % 2 ? -1 : 1), 0], pixel: q.pixel ?? 6, border: q.borda });
    });
    void R;
    void idx;
  }

  // ---------------------------------------------------------------- 2D: efeitos de tela
  function efeito(ctx, S, K, st, e, R) {
    const t = e.tempo === 'acao' ? S.A : S.t;
    const em = e.em ?? 0;
    const ate = e.ate ?? Infinity;
    if (t < em || t >= ate) return;
    const { W, H, top, bot } = S;
    const q = seg(t, em, Number.isFinite(ate) ? ate : S.dur);
    // rampa de entrada/saída (em quadros) para os efeitos contínuos
    const rampa = (e.entra ? seg(t, em, em + e.entra) : 1) * (e.sai && Number.isFinite(ate) ? 1 - seg(t, ate - e.sai, ate) : 1);
    const v = (x, d) => (typeof x === 'function' ? x(t, S, st) : x ?? d);
    switch (e.tipo) {
      case 'impacto':
        fx.impacto(ctx, W, H);
        break;
      case 'inverter':
        fx.inverter(ctx, W, H, v(e.forca, 1) * rampa);
        break;
      case 'flash': {
        // forte por "segura" quadros e cai até o fim
        const a = v(e.forca, 1) * (1 - seg(t, em + (e.segura ?? 0), ate));
        fx.flash(ctx, W, H, a, e.cor || '#ffffff');
        break;
      }
      case 'escuro':
        fx.escuro(ctx, W, H, lerp(v(e.de, 0), v(e.para, 1), curva(e.curva || 'linear')(q)));
        break;
      case 'pb': {
        const al = alvoDe(e.circulo && e.circulo.alvo, st, S);
        const circ = e.circulo && al ? { x: al.x, y: al.y, r: v(e.circulo.raio, 200), inside: !!e.circulo.dentro } : null;
        fx.pb(ctx, W, H, v(e.forca, 1) * rampa, circ, e.tom || '#3b82f6');
        break;
      }
      case 'cor': {
        const k = curva(e.curva || 'easeIO')(q);
        fx.cor(ctx, W, H, e.para ? corMix(e.de || e.para, e.para, k) : e.de, v(e.forca, 0.35) * rampa, e.modo || 'soft-light');
        break;
      }
      case 'vinheta':
        ctx.save();
        ctx.globalAlpha = rampa;
        CE.cineVignette(ctx, W, H, v(e.forca, 0.6), e.cor ? rgbDe(e.cor).join(',') : '0,0,0');
        ctx.restore();
        break;
      case 'pulso': {
        // batida dupla do coração (tum-tum) na borda da tela
        const per = (60 * 60) / (e.bpm || 90);
        const ph = (((t - em) % per) + per) % per / per;
        const b = Math.max(0, 1 - ph * 7) + 0.6 * Math.max(0, 1 - Math.abs(ph - 0.22) * 8);
        ctx.save();
        ctx.globalAlpha = clamp(b) * rampa;
        CE.cineVignette(ctx, W, H, v(e.forca, 0.75), e.cor ? rgbDe(e.cor).join(',') : '127,29,29');
        ctx.restore();
        break;
      }
      case 'linhas': {
        const a = v(e.forca, 0.4) * (e.decai === false ? 1 : 1 - (t - em) / ((Number.isFinite(ate) ? ate : em + 8) - em)) * rampa;
        if (a <= 0) break;
        if ((e.modo || 'radial') === 'radial') {
          const p = alvoDe(e.alvo, st, S);
          if (p) CE.drawRadialSpeedLines(ctx, p.x, p.y, W, e.cor || '#f8fafc', a);
        } else if (e.modo === 'paralelas') {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, top, W, bot - top);
          ctx.clip();
          if (CE.ART && CE.ART.speedLines) {
            ctx.globalAlpha = clamp(a);
            CE.ART.speedLines(ctx, v(e.ang, 0), W, H, { color: e.cor || 'rgba(241,245,249,0.6)', t: S.f, n: e.n || 40 });
          } else CE.drawSpeedLines(ctx, W, H, e.cor || '#f8fafc', a);
          ctx.restore();
        } else if (e.modo === 'leitura') {
          // linhas tracejadas de leitura entre pontos (metavisão, passe que ninguém viu)
          const pts = (e.pontos || []).map((k) => alvoDe(k, st, S)).filter(Boolean);
          if (pts.length < 2) break;
          ctx.save();
          ctx.globalAlpha = clamp(a);
          ctx.strokeStyle = e.cor || '#00f5d4';
          ctx.lineWidth = e.largura || 3;
          ctx.setLineDash([14, 9]);
          ctx.lineDashOffset = -S.f * 1.5;
          ctx.beginPath();
          pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
          ctx.stroke();
          ctx.restore();
        }
        break;
      }
      case 'particulas': {
        const n = e.n || 60;
        const a = v(e.forca, 1) * rampa;
        if (a <= 0) break;
        ctx.save();
        ctx.globalAlpha = clamp(a);
        if (e.modo === 'chuva') CE.cineRain(ctx, W, H, S.f, 0.35, n);
        else if (e.modo === 'neve' && CE.mgmSnow) CE.mgmSnow(ctx, W, top, bot, S.f, n, 2, 0.9, '226,236,248', 0.6, 7, 0.4);
        else CE.cineDust(ctx, W, H, S.f, n, e.cor || (e.modo === 'brasas' ? 'rgba(251,146,60,0.8)' : 'rgba(226,232,240,0.7)'), 3);
        ctx.restore();
        break;
      }
      case 'flashes': {
        // flashes de câmera fotográfica espalhados (área = [x0, y0, x1, y1] em frações)
        const ar = e.area || [0.05, 0.15, 0.95, 0.6];
        const n = e.n || 10;
        const per = e.periodo || 50;
        for (let i = 0; i < n; i++) {
          const ph = (t - em + rnd(i, 7) * per) % per;
          if (ph > 7) continue;
          const k = 1 - ph / 7;
          const x = (ar[0] + rnd(i + Math.floor((t - em + rnd(i, 7) * per) / per) * 13, 3) * (ar[2] - ar[0])) * W;
          const y = top + (ar[1] + rnd(i, 4) * (ar[3] - ar[1])) * (bot - top);
          CE.cineGlow(ctx, x, y, 40 * (e.tam || 1), 'rgba(255,255,255,0.8)', k * rampa);
          if (CE.finSparkle) CE.finSparkle(ctx, x, y, 12 * (e.tam || 1), k * rampa, 'rgba(255,255,255,0.8)');
        }
        break;
      }
      case 'brilho': {
        const p = alvoDe(e.alvo, st, S);
        if (p) CE.cineGlow(ctx, p.x, p.y, v(e.raio, 120), e.cor || 'rgba(255,255,255,0.4)', v(e.forca, 1) * rampa);
        break;
      }
      case 'desenho':
        if (e.desenho) e.desenho.call(CE, ctx, S, K, st, q);
        break;
      default:
        break;
    }
    void R;
  }

  // ---------------------------------------------------------------- 2D: textos na imagem
  // onomatopeia: Jersey 10, CAIXA ALTA, entra com impacto (escala caindo), sem itálico falso
  function onomatopeia(ctx, S, st, o) {
    const t = S.t;
    const em = o.em ?? 0;
    const ate = o.ate ?? em + 50;
    if (t < em || t >= ate) return;
    const k = seg(t, em, em + (o.entra ?? 8));
    const fora = o.sai ?? 10;
    const al = Math.min(1, k * 2.5) * (1 - seg(t, ate - fora, ate));
    const p = o.alvo ? alvoDe(o.alvo, st, S) : alvoDe([o.x ?? 0.5, o.y ?? 0.4], st, S);
    if (!p || al <= 0) return;
    const fs = o.tam || 96;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(o.rot ?? -0.08);
    const sc = 1.6 - (1 - Math.pow(1 - k, 3)) * 0.6;
    ctx.scale(sc, sc);
    ctx.globalAlpha = al;
    ctx.font = `${fs}px "Jersey 10", "Arial Narrow", Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const txt = String(o.texto || '').toUpperCase();
    ctx.fillStyle = '#020617';
    ctx.fillText(txt, fs * 0.05, fs * 0.07);
    ctx.lineWidth = Math.max(5, fs / 9);
    ctx.strokeStyle = '#020617';
    ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = o.cor || '#f8fafc';
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }
  // letreiro discreto de lugar/hora (canto de cima), selo de TV ("REPLAY") ou centralizado
  function letreiro(ctx, S, l) {
    const t = S.t;
    const em = l.em ?? 0;
    const ate = l.ate ?? Infinity;
    if (t < em || t >= ate) return;
    const k = seg(t, em, em + (l.entra ?? 40)) * (l.sai && Number.isFinite(ate) ? 1 - seg(t, ate - l.sai, ate) : 1);
    if (k <= 0) return;
    const { W, top, bot } = S;
    const est = l.estilo || 'lugar';
    // (texto pode ser função: muda com o nome do jogador, o placar...)
    const texto = typeof l.texto === 'function' ? l.texto(t, S) : l.texto;
    if (est === 'tv') {
      // selo pequeno de transmissão: bolinha vermelha piscando + texto em Jersey 10
      const txt = String(texto || 'REPLAY').toUpperCase();
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 3);
      ctx.font = '22px "Jersey 10", "Arial Narrow", sans-serif';
      const tw = ctx.measureText(txt).width;
      const x = l.x ?? W - 44 - tw - 30;
      const y = l.y ?? top + 22;
      ctx.fillStyle = 'rgba(2,6,23,0.72)';
      ctx.fillRect(x, y, tw + 44, 30);
      ctx.fillStyle = Math.floor(S.f / 20) % 2 ? '#ef4444' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(x + 16, y + 15, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = l.cor || '#f8fafc';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, x + 30, y + 16);
      ctx.restore();
      return;
    }
    if (est === 'centro') {
      if (CE.finKicker) CE.finKicker(ctx, l.x ?? W / 2, l.y ?? (top + bot) / 2, texto, k, l.cor || '#e2e8f0', 'center');
      return;
    }
    const linha = l.linha || 0;
    const y = l.y ?? (l.pos === 'baixo' ? bot - 40 - linha * 32 : top + 30 + linha * 32);
    if (CE.luckKicker) CE.luckKicker(ctx, l.x ?? 40, y, texto, k, l.cor || '#94a3b8');
  }
  // a cartela (uma por cena, no último plano, depois da ação)
  function cartela(ctx, S, c) {
    const t = S.t;
    const em = c.em ?? 0;
    const k = seg(t, em, em + (c.entra ?? 36));
    if (k <= 0) return;
    const { W, top, bot } = S;
    if (c.estilo === 'fim') {
      // pequena, no alto (kicker + título de impacto)
      if (CE.finKicker) CE.finKicker(ctx, W / 2, top + 54, c.kicker || '', k, c.cor || '#00f5d4', 'center');
      CE.cineImpactText(ctx, c.titulo || '', W / 2, top + 124, 70, '#f8fafc', k, W * 0.78, 0);
      return;
    }
    const y = c.y === 'baixo' ? bot - 100 : typeof c.y === 'number' ? c.y : (top + bot) / 2;
    CE.cineTitleCard(ctx, W, y, k, { kicker: c.kicker || '', title: c.titulo || '', sub: c.sub || '', color: c.cor || '#00f5d4' });
  }

  // ---------------------------------------------------------------- sons
  const SONS = { chute: 'kick', passe: 'pass', vento: 'whoosh', carrinho: 'tackle', defesa: 'save', trave: 'post', gol: 'goal', apito: 'whistle', pagina: 'page', bip: 'blip' };
  function sons(S, pl) {
    (pl.sons || []).forEach((s, i) => {
      CE.cineSfx(S, s.em ?? 0, s.id || 'rt' + i, () => {
        if (s.fn) return s.fn();
        const fn = window.SFX && window.SFX[SONS[s.som] || s.som];
        if (typeof fn === 'function') fn.apply(window.SFX, [].concat(s.arg ?? []));
        return undefined;
      });
    });
  }

  // ---------------------------------------------------------------- cortes wipe e vidro
  // O último quadro do plano (só o palco, antes da legenda) fica guardado e, no começo do
  // plano seguinte, sai de cena varrido na diagonal (wipe) ou quebrado em cacos (vidro).
  // (duas fotos, por plano par/ímpar: um plano com wipe na entrada e vidro na saída não apaga
  // a foto do plano anterior enquanto guarda a sua)
  const FOTOS = [
    { cv: null, run: -1, phase: -1 },
    { cv: null, run: -1, phase: -1 }
  ];
  function guardaFoto(ctx, S) {
    const F = FOTOS[S.phase % 2];
    if (!F.cv) F.cv = document.createElement('canvas');
    if (F.cv.width !== S.W || F.cv.height !== S.H) {
      F.cv.width = S.W;
      F.cv.height = S.H;
    }
    const g = F.cv.getContext('2d');
    g.clearRect(0, 0, S.W, S.H);
    g.drawImage(ctx.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height, 0, 0, S.W, S.H);
    F.run = CE._cineRun;
    F.phase = S.phase;
  }
  // cacos para o corte "vidro" (próprios: o cache de cacos da cena da neve é de uma entrada)
  let CACOS = null;
  function cacos(W, H, cx, cy) {
    const key = `${W}x${H}`;
    if (CACOS && CACOS.key === key) return CACOS;
    let s = 7;
    const R = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const radii = [0, 60, 150, 280, 460, Math.hypot(W, H)];
    const n = 10;
    const ang = Array.from({ length: n }, (_, j) => (j / n) * TAU + (R() - 0.5) * 0.4);
    const V = radii.map((rr, i) => ang.map((a) => (i === 0 ? [cx, cy] : [cx + Math.cos(a + (R() - 0.5) * 0.2) * rr * (0.85 + R() * 0.3), cy + Math.sin(a + (R() - 0.5) * 0.2) * rr * (0.85 + R() * 0.3)])));
    const list = [];
    for (let i = 0; i < radii.length - 1; i++) {
      for (let j = 0; j < n; j++) {
        const j2 = (j + 1) % n;
        const pts = i === 0 ? [V[0][j], V[1][j], V[1][j2]] : [V[i][j], V[i][j2], V[i + 1][j2], V[i + 1][j]];
        const sx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
        const sy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        const d = Math.hypot(sx - cx, sy - cy) || 1;
        list.push({ pts, cx: sx, cy: sy, ring: i, vx: ((sx - cx) / d) * (1 + R() * 2.5), vy: ((sy - cy) / d) * (1 + R()) - 1.2, vr: (R() - 0.5) * 0.08 });
      }
    }
    CACOS = { key, list };
    return CACOS;
  }
  function transicao(ctx, S, tipo) {
    const FOTO = FOTOS[(S.phase + 1) % 2];
    if (!FOTO.cv || FOTO.run !== CE._cineRun || FOTO.phase !== S.phase - 1) return;
    const { W, H, top, bot, t } = S;
    if (tipo === 'wipe') {
      const D = 16;
      if (t >= D) return;
      // a borda diagonal anda da esquerda para a direita; o resto da foto ainda cobre
      const e = CURVAS.easeIO(t / D);
      const x = -H * 0.6 + e * (W + H * 1.2);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(W, top);
      ctx.lineTo(W, bot);
      ctx.lineTo(x - H * 0.5, bot);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(FOTO.cv, 0, 0);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x - H * 0.5, bot);
      ctx.stroke();
      ctx.restore();
    } else if (tipo === 'vidro') {
      const D = 42;
      if (t >= D) return;
      const sh = cacos(W, H, W * 0.5, (top + bot) / 2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top, W, bot - top);
      ctx.clip();
      sh.list.forEach((c) => {
        const d = Math.max(0, t - c.ring * 3);
        const dx = c.vx * d * 1.6;
        const dy = c.vy * d * 0.6 + 0.16 * d * d;
        ctx.save();
        ctx.translate(c.cx + dx, c.cy + dy);
        ctx.rotate(c.vr * d);
        ctx.translate(-c.cx, -c.cy);
        ctx.beginPath();
        c.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.closePath();
        ctx.save();
        ctx.clip();
        ctx.drawImage(FOTO.cv, 0, 0);
        ctx.restore();
        ctx.strokeStyle = `rgba(224,242,254,${Math.max(0, 0.9 - d * 0.02)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- escolha
  // Pausa a cena (o relógio para) com botões .bl-btn por cima e chama a função da opção.
  // { em, opcoes: [{ texto, fn(estado), ir: 'id do plano' }], padrao: 0 }
  function mostraEscolha(R, pl, idx) {
    const host = document.getElementById('sakuga-anime-overlay') || document.body;
    let box = document.getElementById('rt-escolha');
    if (!box) {
      box = document.createElement('div');
      box.id = 'rt-escolha';
      box.className = 'rt-escolha';
    }
    if (box.parentNode !== host) host.appendChild(box);
    box.innerHTML = '';
    (pl.escolha.opcoes || []).forEach((op, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bl-btn' + (i ? ' bl-btn--secondary' : '');
      b.textContent = String(op.texto || '');
      b.onclick = (e) => {
        e.stopPropagation();
        escolher(R, idx, i);
      };
      box.appendChild(b);
    });
    box.hidden = false;
    const first = box.querySelector('button');
    if (first) first.focus();
  }
  function escondeEscolha() {
    const box = document.getElementById('rt-escolha');
    if (box) box.hidden = true;
  }
  function escolher(R, phase, i) {
    const pl = R.planos[phase];
    const op = pl && pl.escolha && pl.escolha.opcoes[i];
    if (!op) return;
    R.escolhido[phase] = i;
    R.estado.escolha = i;
    escondeEscolha();
    try {
      if (op.fn) op.fn.call(CE, R.estado, CE);
    } catch (e) {
      CE.reportCineError && CE.reportCineError('escolha', e);
    }
    if (op.ir) {
      const k = R.planos.findIndex((p) => p.id === op.ir);
      if (k >= 0 && CE.sakugaType === R.tipo) {
        CE.sakugaPhase = k;
        CE.sakugaPhaseTimer = 0;
      }
    }
  }
  // pendente = o plano chegou na hora da escolha e ninguém escolheu ainda
  const escolhaPendente = (R) => {
    if (!R || CE.sakugaType !== R.tipo) return false;
    const p = CE.sakugaPhase;
    const pl = R.planos[p];
    if (!pl || !pl.escolha) return false;
    estadoDe(R);
    return R.escolhido[p] === undefined && CE.sakugaPhaseTimer >= (pl.escolha.em ?? pl.dur - 1);
  };
  CE.cineChoicePending = function () {
    const R = CE.roteiro.cenas[this.sakugaType];
    return escolhaPendente(R);
  };
  // o relógio da cena para na escolha (e os botões aparecem)
  const upd0 = CE.updateSakuga;
  CE.updateSakuga = function () {
    const R = CE.roteiro.cenas[this.sakugaType];
    if (R && this.sakugaActive && escolhaPendente(R)) {
      const box = document.getElementById('rt-escolha');
      if (!box || box.hidden || R.mostrando !== `${CE._cineRun}|${this.sakugaPhase}`) {
        R.mostrando = `${CE._cineRun}|${this.sakugaPhase}`;
        mostraEscolha(R, R.planos[this.sakugaPhase], this.sakugaPhase);
      }
      return undefined;
    }
    return upd0.apply(this, arguments);
  };
  // pulou a cena com uma escolha na tela: vale a opção padrão
  const fin0 = CE.finishSakuga;
  CE.finishSakuga = function () {
    const R = CE.roteiro.cenas[this.sakugaType];
    if (R && escolhaPendente(R)) {
      const pl = R.planos[this.sakugaPhase];
      escolher(R, this.sakugaPhase, pl.escolha.padrao ?? 0);
    }
    escondeEscolha();
    // (as fotos dos cortes ocupam ~3,7 MB cada: soltas quando a cena acaba)
    FOTOS.forEach((F) => {
      if (F.cv) F.cv.width = F.cv.height = 0;
      F.run = -1;
    });
    return fin0.apply(this, arguments);
  };

  // ---------------------------------------------------------------- compilar
  function compilar(tipo, spec) {
    const planos = (spec.planos || []).map((p) => Object.assign({}, p));
    planos.forEach((p) => {
      // narração: dura o bastante para ler a frase (no mínimo)
      if (p.narracao) {
        const tx = typeof p.narracao === 'string' ? p.narracao : p.narracao.texto || '';
        p.dur = Math.max(p.dur || 0, Math.round(70 + tx.length * 4));
      }
      if (!p.dur) p.dur = 240;
      // câmera lenta também aceita como efeito: { tipo: 'lento', em, ate, fator, rampa }
      const lentos = (p.efeitos || []).filter((e) => e.tipo === 'lento');
      if (lentos.length && !p.lento) p.lento = lentos.length === 1 ? lentos[0] : lentos;
    });
    const R = { tipo, spec, planos, picos: [], avisos: [], run: -1, estado: {}, escolhido: {} };
    CE.roteiro.cenas[tipo] = R;
    // checagem na compilação: picos, falas longas, clarão longo
    planos.forEach((p, i) => {
      (p.efeitos || []).forEach((e) => {
        if (ehPico(e)) pico(tipo, e.tipo, i);
        if (e.tipo === 'flash' && (e.forca ?? 1) > 0.5 && (e.ate ?? Infinity) - (e.em ?? 0) > 9) avisar(tipo, `P${i + 1}: clarão forte com mais de 0,15 s`);
      });
      (p.onomatopeias || []).forEach((o) => (o.gigante || (o.tam || 0) >= 120) && pico(tipo, 'ono', i));
      (p.falas || []).forEach((f) => typeof f.texto === 'string' && f.texto.length > 90 && avisar(tipo, `P${i + 1}: fala com mais de 90 letras (${f.texto.length})`));
    });
    const def = {
      phases: planos.map((p) => p.dur),
      music: spec.musica,
      title: spec.titulo || '',
      letterbox: spec.tarja ?? 0.12,
      grain: spec.grao ?? 0.06,
      vignette: spec.vinheta ?? 0.55,
      readScale: spec.leitura,
      theme: spec.tema,
      // cortes entre planos (o motor lê no drawSakuga): 'seco' é o padrão das cenas novas
      cortes: planos.map((p) => p.corte || spec.corte || 'seco'),
      entrada: spec.entrada || 'fade',
      saida: spec.saida || 'fade',
      _roteiro: R,
      // as falas (texto com {NOME} e função viram texto quando a cena começa)
      get subs() {
        return planos.map((p) =>
          (p.falas || []).map((f) => {
            const s = { from: f.em ?? 0, who: nomeDe(f), text: textoDe(f), color: f.cor || corDe(f.quem, spec.cores), tipo: f.tipo || 'fala' };
            if (f.ate !== undefined) s.to = f.ate;
            return s;
          })
        );
      },
      // pontos de ensaio dos bonecos (pré-carregamento): início, meio e fim de cada plano e
      // os 4 passos de quem anda
      ensaio: (() => {
        const out = [];
        planos.forEach((p, i) => {
          const ts = new Set([1, Math.floor(p.dur / 2), p.dur - 2]);
          (p.atores || []).forEach((a) => {
            if (a.anim === 'andar' || a.anim === 'correr') for (let k = 0; k < 4; k++) ts.add(1 + k * (a.passo || (a.anim === 'andar' ? 6 : 3)));
          });
          [...ts].sort((x, y) => x - y).forEach((t) => out.push([i, t]));
        });
        return out;
      })(),
      scene(K, S) {
        const pl = planos[S.phase] || planos[planos.length - 1];
        const st = (K.st = {});
        st.atores = {};
        S.plano = pl;
        S.estado = estadoDe(R);
        S.A = acao(pl.lento, S.t);
        S.q = S.dur ? S.t / S.dur : 0;
        camera(K, pl, S, st);
        if (pl.narracao && !pl.cam) {
          // (nada para montar: a câmera olha o céu do vazio e o 2D cobre com o preto)
          K.cam([K.VOID[0], 30, K.VOID[1]], [K.VOID[0] + 1, 31, K.VOID[1]], 50);
          K.sky('#000000', '#000000', 0);
        }
        if (pl.expo !== undefined) K.expo(typeof pl.expo === 'function' ? pl.expo(S.t, S, st) : pl.expo);
        if (pl.ceu) K.sky(pl.ceu[0], pl.ceu[1], pl.ceu[2]);
        if (pl.neblina) K.fog(pl.neblina[0], pl.neblina[1]);
        if (pl.luz) K.ambient(pl.luz);
        if (spec.cenario && pl.cenario !== false && !pl.narracao) spec.cenario.call(CE, K, S.t, st, pl, S);
        (pl.atores || []).forEach((a) => ator(K, a, S, st, R));
        if (pl.cena) pl.cena.call(CE, K, S, st);
        efeitosCam(K, pl, S);
      },
      overlay(ctx, S, K) {
        const pl = planos[S.phase] || planos[planos.length - 1];
        S.plano = pl;
        S.estado = estadoDe(R);
        S.A = acao(pl.lento, S.t);
        const st = stTela(K);
        sons(S, pl);
        if (pl.fundo) fundo(ctx, S, pl.fundo);
        silhuetas(ctx, S, K, K.st || {});
        olhos(ctx, S, K, K.st || {});
        if (pl.sobre) pl.sobre.call(CE, ctx, S, K, st);
        (pl.quadros || []).forEach((q, i) => quadro(ctx, S, K, st, q, R, i));
        (pl.efeitos || []).forEach((e) => e.tipo !== 'tremor' && e.tipo !== 'zoom' && efeito(ctx, S, K, st, e, R));
        (pl.onomatopeias || []).forEach((o) => onomatopeia(ctx, S, st, o));
        (pl.letreiros || []).forEach((l) => letreiro(ctx, S, l));
        if (pl.cartela) cartela(ctx, S, pl.cartela);
        if (pl.narracao) narracao(ctx, S, pl.narracao);
        if (pl.depois) pl.depois.call(CE, ctx, S, K, st);
        // entrada pelo corte do plano anterior (wipe/vidro) e a foto para o próximo
        const antes = planos[S.phase - 1];
        const ca = antes && (antes.corte || spec.corte);
        if (ca === 'wipe' || ca === 'vidro') transicao(ctx, S, ca);
        const c = pl.corte || spec.corte;
        if (c === 'wipe' || c === 'vidro') guardaFoto(ctx, S);
      }
    };
    if (R.picos.length > 1) avisar(tipo, `mais de 1 efeito de pico na cena: ${R.picos.join(', ')}`);
    return def;
  }

  CE.roteiro = function (tipo, spec) {
    const def = compilar(tipo, spec || {});
    if (CE.registerCine3D) CE.registerCine3D(tipo, def);
    return def;
  };
  CE.roteiro.cenas = {};
  // relatório de uma cena (para os testes de regras): picos e avisos, sem console
  CE.roteiro.checar = (tipo) => {
    const R = CE.roteiro.cenas[tipo];
    return R ? { picos: R.picos.slice(), avisos: R.avisos.slice(), planos: R.planos.length } : null;
  };
  Object.assign(CE.roteiro, { ponto, fx, cores: CORES, corDe, curvas: CURVAS, seg, lerp, mix, rnd, acao, tela, brilho, placa, sala, fileiras, fachada });
})();
