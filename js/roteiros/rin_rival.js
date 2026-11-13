// ============================================================================
// 10 · rin_rival — "A toalha que cai" (conceito A)
// Cap. da Sub-20, pós-jogo: a coletiva do Sae → o vestiário, você oferece metade do gol
// (a fala que o jogador acabou de ler NÃO se repete) → esta cena → o Rin: "Você me roubou o
// gol...". No vestiário do prédio: uma lâmpada acesa em cima do banco e a luz fria do
// corredor entrando de lado (pela esquerda do quadro).
// Assinatura: a toalha branca. Esconde o Rin no começo (a mancha mais clara do quadro),
// escorrega para os ombros quando ele se levanta, cai quando o rival nasce, e o último plano
// é ela no chão, entre os dois. Um só quadro de mangá: a toalha batendo no chão.
//   P1 o Rin sentado no banco, a toalha na cabeça; você de pé à direita: "...Pra nós dois?"
//   P2 ele se levanta (câmera lenta curta), a toalha escorrega; ele vem até você
//   P3 cara a cara, de perfil: "VOCÊ É O MEU RIVAL." — tremida forte (o pico) e a toalha cai
//   P4 a toalha no chão entre os dois; a grua sobe devagar
// Sem olhos acesos, sem punho, sem quadro 85% preto.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro) return;
  const R = CE.roteiro;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = R.seg;
  const lerp = R.lerp;
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);

  const BL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const RIN = Object.assign({ angry: true, number: 10 }, BL);
  // O banco leste do vestiário (tampo 0,26; x 42,6–42,94; y 20–22,4) visto de lado: a câmera
  // fica a oeste, olhando para o leste (o norte fica à esquerda do quadro). O Rin sentado no
  // meio do banco, virado para a câmera; você de pé à direita dele (ao sul), de perfil.
  const SENTA = [42.77, 20.72];
  const VOCE = [42.17, 21.78];
  const PARA = [42.2, 21.02]; // onde o Rin para, na sua frente
  const TOALHA_CHAO = [42.16, 21.4]; // onde a toalha cai (entre os dois)

  // ---------------------------------------------------------------- a toalha (pixel art)
  const BR = '#f1f5f9';
  const CL = '#cbd5e1';
  const SM = '#8796ab';
  const LI = '#38bdf8'; // a listra azul do Blue Lock na barra
  const px = (g) => (c, x, y, w, h) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  // Pixel art por máscara: tom(x, y) devolve o tom de cada pixel ('' = vazio); depois o
  // contorno escuro em volta de tudo (inclusive em volta da janela do rosto)
  const TONS = { w: '#ffffff', b: '#e6ebf2', s: '#b9c4d4', d: '#8693a8', l: '#38bdf8', L: '#0e7490', x: '#0b1220' };
  const CONTORNO = '#3d4a61';
  function pixMascara(g, w, h, tom) {
    const m = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m.push(tom(x, y) || '');
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '' : m[y * w + x]);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const c = at(x, y);
        if (!c) continue;
        // (a sombra pontilhada não ganha contorno: ela é o vão da janela)
        const borda = c !== 'x' && (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1));
        g.fillStyle = borda ? CONTORNO : TONS[c];
        g.fillRect(x, y, 1, 1);
      }
  }
  // Na cabeça, de frente (ele está de cabeça baixa): a cúpula cobre o alto da cabeça, a borda
  // da frente passa na testa, as abas caem dos lados até os ombros, com dobras e a barra
  // azul. No meio, a janela vazada: aparecem a franja verde e o rosto do boneco; só a faixa
  // dos olhos fica na sombra da toalha (pontilhado). Ela esconde o olhar, não a pessoa.
  const CABECA = () =>
    R.tela('rr|toalha_cabeca4', 26, 26, (g) => {
      pixMascara(g, 26, 26, (x, y) => {
        const cx = 12.5;
        const naCupula = y <= 11 && ((x - cx) / 11.2) ** 2 + ((y - 11) / 11) ** 2 <= 1;
        const abaE = y >= 8 && y <= 24 && x >= (y > 19 ? 0 : 1) && x <= 7;
        const abaD = y >= 8 && y <= 24 && x >= 18 && x <= (y > 19 ? 25 : 24);
        const janela = x >= 8 && x <= 17 && y >= 11;
        if (janela) return y <= 12 && (x + y) % 2 === 0 ? 'x' : '';
        if (!naCupula && !abaE && !abaD) return '';
        if (abaE || abaD) {
          if (y === 22) return 'l';
          if (y === 23) return 'L';
          if (y <= 12 && (x === 7 || x === 18)) return 'd'; // a sombra embaixo da cúpula
          if (x === 7 || x === 18 || x === 4 || x === 21) return 's'; // as dobras
          if (x === 2 && y > 10) return 'd';
        }
        // a barra azul da toalha passa na testa, por cima da janela
        if (x >= 6 && x <= 19 && y === 9) return 'l';
        if (x >= 6 && x <= 19 && y === 10) return 'L';
        if (y <= 10 && x <= 11 && y + x * 0.5 < 8) return 'w'; // o brilho do alto
        if ((x === 10 && y >= 3 && y <= 8) || (x === 16 && y >= 4 && y <= 8) || (x === 13 && y >= 1 && y <= 3)) return 's';
        // a trama da toalha: um pontinho mais escuro aqui e ali
        if ((x * 3 + y * 5) % 11 === 0) return 's';
        return 'b';
      });
    });
  // Nos ombros, de lado (ele está de perfil, virado para você, à direita do quadro): o rolo
  // em volta do pescoço e as duas pontas caindo, a da frente mais curta
  const OMBROS_LADO = () =>
    R.tela('rr|toalha_ombros_lado', 18, 18, (g) => {
      pixMascara(g, 18, 18, (x, y) => {
        const rolo = y <= 3 && x >= 3 && x <= 14 && !(y === 0 && (x < 5 || x > 12));
        const tras = y >= 2 && y <= 16 && x >= 2 && x <= 6;
        const frente = y >= 2 && y <= 13 && x >= 11 && x <= 15;
        if (!rolo && !tras && !frente) return '';
        if (tras || frente) {
          const fim = tras ? 16 : 13;
          if (y === fim - 2) return 'l';
          if (y === fim - 1) return 'L';
          if (x === 4 || x === 13) return 's';
          if ((tras && x === 6) || (frente && x === 11)) return 'd';
          if (y <= 3) return y === 3 ? 's' : 'b';
          return 'b';
        }
        if (y === 1) return 'w';
        if (y === 3) return 'd';
        return 'b';
      });
    });
  // Nos ombros: o rolo atrás do pescoço (com volume: brilho em cima, sombra embaixo) e as
  // duas pontas caindo na frente, com dobras e a barra; o meio vazado (a camisa aparece)
  const OMBROS = () =>
    R.tela('rr|toalha_ombros4', 26, 18, (g) => {
      pixMascara(g, 26, 18, (x, y) => {
        // (no meio, atrás do pescoço, o rolo é mais fino: não tapa o queixo)
        const rolo = y <= (x >= 9 && x <= 16 ? 2 : 4) && x >= 2 && x <= 23 && !(y === 0 && (x < 5 || x > 20));
        const pontaE = y >= 3 && y <= 17 && x >= 2 && x <= 8;
        const pontaD = y >= 3 && y <= 15 && x >= 17 && x <= 23;
        if (!rolo && !pontaE && !pontaD) return '';
        if (pontaE || pontaD) {
          const fim = pontaE ? 17 : 15;
          if (y === fim - 2) return 'l';
          if (y === fim - 1) return 'L';
          if (x === 5 || x === 20) return 's';
          if ((pontaE && x === 8) || (pontaD && x === 17)) return 'd';
          if (y <= 4) return y === 4 ? 's' : 'b';
          return 'b';
        }
        if (y === 1) return 'w';
        if (y === 3) return 's';
        if (y === 4) return 'd';
        return 'b';
      });
    });
  // caindo: torcida, na vertical
  const CAINDO = () =>
    R.tela('rr|toalha_caindo2', 18, 24, (g) => {
      const p = px(g);
      p(BR, 6, 0, 8, 4);
      p(BR, 3, 4, 11, 7);
      p(BR, 4, 11, 10, 6);
      p(BR, 6, 17, 8, 6);
      p(CL, 3, 6, 3, 6);
      p(CL, 10, 12, 3, 7);
      p(SM, 6, 11, 6, 1);
      p(SM, 7, 17, 5, 1);
      p(LI, 6, 22, 8, 1);
    });
  // no chão, vista de cima: amassada, com a listra
  const CHAO = () =>
    R.tela('rr|toalha_chao2', 32, 24, (g) => {
      const p = px(g);
      p('rgba(0,0,0,0.4)', 4, 6, 26, 16);
      p(BR, 6, 3, 18, 5);
      p(BR, 3, 7, 25, 8);
      p(BR, 6, 15, 20, 5);
      p(CL, 10, 6, 2, 10);
      p(CL, 19, 8, 3, 8);
      p(CL, 4, 12, 4, 2);
      p(SM, 12, 10, 7, 1);
      p(SM, 22, 13, 3, 1);
      p(LI, 6, 19, 18, 1);
      p('#ffffff', 8, 4, 7, 1);
    });

  // a toalha (placa em pé virada para a câmera) presa à cabeça do ator a; um pouco à frente
  // dele, do lado da câmera, para ficar por cima do boneco
  const naCabeca = (K, a, img, o) => {
    if (!a) return;
    const hz = K.headZ(a);
    const e = K.c.eye;
    const dx = e[0] - a.x;
    const dy = e[2] - a.y;
    const d = Math.hypot(dx, dy) || 1;
    K.sprite(img, { x: a.x + (dx / d) * 0.06 + (o.dx || 0), y: a.y + (dy / d) * 0.06 + (o.dy || 0), z: hz + o.z, w: o.w, h: o.h, light: [1.08, 1.08, 1.1], shadow: 0 });
  };
  const toalhaNoChao = (K) => K.floor({ x0: TOALHA_CHAO[0] - 0.24, y0: TOALHA_CHAO[1] - 0.18, x1: TOALHA_CHAO[0] + 0.24, y1: TOALHA_CHAO[1] + 0.18, z: 0.014, img: CHAO(), color: '#ffffff', alpha: 1 });

  // ---------------------------------------------------------------- a luz
  // a lâmpada acesa em cima do banco e a luz fria do corredor, que entra pelo norte (pela
  // esquerda do quadro) e se espalha no chão
  const LUZ_CORREDOR = () =>
    R.tela('rr|corredor2', 32, 64, (g, w, h) => {
      const gv = g.createLinearGradient(0, 0, 0, h);
      gv.addColorStop(0, 'rgba(125,211,252,0.95)');
      gv.addColorStop(0.55, 'rgba(125,211,252,0.35)');
      gv.addColorStop(1, 'rgba(125,211,252,0)');
      g.fillStyle = gv;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in';
      const gh = g.createLinearGradient(0, 0, w, 0);
      gh.addColorStop(0, 'rgba(0,0,0,0)');
      gh.addColorStop(0.3, 'rgba(0,0,0,1)');
      gh.addColorStop(0.7, 'rgba(0,0,0,1)');
      gh.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gh;
      g.fillRect(0, 0, w, h);
    });
  const POCA = () => R.brilho('rgba(255,244,214,0.9)');
  function vestiario(K, o = {}) {
    K.expo(o.expo ?? 1.02);
    K.floor({ x0: 41.4, y0: 19.4, x1: 43.6, y1: 22.2, z: 0.012, img: POCA(), color: '#fff4d6', alpha: 0.24, em: true });
    K.floor({ x0: 40.6, y0: 17.1, x1: 43.0, y1: 22.4, z: 0.011, img: LUZ_CORREDOR(), color: '#7dd3fc', alpha: 0.2, em: true });
    // a lâmpada pendurada (abaixo do teto, que fica em 1,75)
    K.box({ x0: 42.58, y0: 20.62, x1: 42.96, y1: 20.9, z0: 1.46, z1: 1.51, color: '#fff7e0', em: true });
    K.box({ x0: 42.76, y0: 20.75, x1: 42.78, y1: 20.77, z0: 1.51, z1: 1.75, color: '#111827' });
  }

  // tempos
  const LEVANTA = 70; // (tempo da ação) começa a levantar
  const EM_PE = 104; // de pé
  const ANDA0 = 116;
  const ANDA1 = 186;
  const RIVAL = 70; // (plano 3) a fala do "rival" começa
  const CAI = RIVAL + 34; // a toalha cai no "VOCÊ É O MEU RIVAL"
  const CHAO_T = CAI + 22; // bate no chão
  const andando = (t) => R.curvas.suave(seg(t, ANDA0, ANDA1));
  const rinX = (t) => lerp(SENTA[0] - 0.2, PARA[0], andando(t));
  const rinY = (t) => lerp(SENTA[1] + 0.04, PARA[1], andando(t));

  R('rin_rival', {
    titulo: 'O RIVAL',
    musica: 'dread',
    tema: 'bluelock_bunker',
    grao: 0.05,
    vinheta: 0.45,
    planos: [
      {
        id: 'toalha',
        dur: 240,
        // de lado, na altura do banco: o Rin sentado, a toalha cobrindo a cabeça; você à direita
        cam: { de: [[39.75, 0.5, 21.2], [42.5, 0.42, 21.2], 42], para: [[40.05, 0.48, 21.18], [42.5, 0.42, 21.18], 40], curva: 'easeIO' },
        cena(K, S, st) {
          vestiario(K);
          naCabeca(K, st.atores.rin, CABECA(), { z: 0.37, w: 0.52, h: 0.52 });
        },
        atores: [
          // os ombros tremem de leve enquanto ele escuta
          { quem: 'rin', id: 'rin', extra: RIN, x: SENTA[0], y: (t) => SENTA[1] + (t > 40 && t < 150 ? Math.round(Math.sin(t * 1.1)) * 0.004 : 0), anim: 'sit_down', seat: 0.2, olha: [39.7, SENTA[1]], luz: [1.0, 1.02, 1.08] },
          { quem: 'you', extra: BL, x: VOCE[0], y: VOCE[1], olha: [SENTA[0] - 0.2, SENTA[1]], luz: [0.88, 0.94, 1.05] }
        ],
        falas: [{ em: 60, quem: 'RIN ITOSHI', texto: '"...Pra nós dois?"', tipo: 'sussurro' }]
      },
      {
        id: 'levanta',
        dur: 270,
        // mais baixo; câmera lenta curta enquanto ele se levanta e a toalha escorrega
        lento: { em: 60, ate: 124, fator: 0.3, rampa: 14 },
        cam: { de: [[40.0, 0.36, 20.75], [42.55, 0.52, 20.95], 42], para: [[40.15, 0.42, 21.05], [42.35, 0.5, 21.3], 42], curva: 'easeIO' },
        cena(K, S, st) {
          vestiario(K);
          const a = st.atores.rin;
          const t = S.A;
          if (t < LEVANTA + 4) naCabeca(K, a, CABECA(), { z: 0.37, w: 0.52, h: 0.52 });
          else if (t < EM_PE) {
            // escorregando para trás da cabeça (para o lado de longe da câmera: o boneco tapa)
            const k = ease(seg(t, LEVANTA + 4, EM_PE));
            naCabeca(K, a, CAINDO(), { z: lerp(0.42, 0.3, k), w: 0.34, h: 0.44, dx: 0.16 });
          } else if (t < ANDA0) naCabeca(K, a, OMBROS(), { z: 0.27, w: 0.42, h: 0.3 });
          else naCabeca(K, a, OMBROS_LADO(), { z: 0.28, w: 0.3, h: 0.3 });
        },
        atores: [
          // (o assento não aceita função: um ator por pose, com o mesmo id)
          { quem: 'rin', id: 'rin', extra: RIN, visivel: [0, LEVANTA], x: SENTA[0], y: SENTA[1], anim: 'sit_down', seat: 0.2, olha: [39.7, SENTA[1]], luz: [1.0, 1.02, 1.08] },
          { quem: 'rin', id: 'rin', extra: RIN, visivel: [LEVANTA, EM_PE], x: (t) => SENTA[0] - ease(seg(t, LEVANTA, EM_PE)) * 0.1, y: SENTA[1], anim: 'sit', seat: 0.24, olha: [39.7, SENTA[1]], luz: [1.0, 1.02, 1.08] },
          {
            quem: 'rin',
            id: 'rin',
            extra: RIN,
            visivel: [EM_PE, 1e9],
            x: rinX,
            y: rinY,
            anim: (t) => (t >= ANDA0 && t < ANDA1 ? 'walk' : 'idle'),
            frame: (t) => (t >= ANDA0 && t < ANDA1 ? 1 + (Math.floor(t / 7) % 4) * 4 : undefined),
            olha: (t) => (t < ANDA0 ? [39.7, SENTA[1]] : [VOCE[0], VOCE[1] + 1]),
            luz: [1.0, 1.02, 1.08]
          },
          { quem: 'you', extra: BL, x: VOCE[0], y: VOCE[1], olha: (t) => [rinX(t), rinY(t) - 0.4], luz: [0.88, 0.94, 1.05] }
        ],
        falas: [{ em: 150, quem: 'RIN ITOSHI', texto: '"Não esquece. Eu VOU te matar."' }],
        sons: [{ em: 66, som: 'vento' }]
      },
      {
        id: 'rival',
        dur: 300,
        // os dois de perfil, cara a cara; a toalha cai no "rival"
        cam: { de: [[39.6, 0.56, 21.38], [42.2, 0.5, 21.38], 40], para: [[39.9, 0.54, 21.38], [42.2, 0.5, 21.38], 38], curva: 'easeIO' },
        cena(K, S, st) {
          vestiario(K);
          const a = st.atores.rin;
          const t = S.t;
          if (t < CAI) naCabeca(K, a, OMBROS_LADO(), { z: 0.28, w: 0.3, h: 0.3 });
          else if (t < CHAO_T) {
            // escorrega do ombro do lado de você e cai entre os dois (sem tapar o rosto)
            const k = R.curvas.entra(seg(t, CAI, CHAO_T));
            K.sprite(CAINDO(), { x: lerp(a.x, TOALHA_CHAO[0], k), y: lerp(a.y + 0.2, TOALHA_CHAO[1], k), z: lerp(0.3, 0.0, k), w: 0.3, h: 0.4, light: [1.08, 1.08, 1.1] });
          } else toalhaNoChao(K);
        },
        atores: [
          { quem: 'rin', extra: RIN, x: PARA[0], y: PARA[1], olha: [VOCE[0], VOCE[1] + 1], luz: [1.02, 1.04, 1.1] },
          { quem: 'you', extra: BL, x: VOCE[0], y: VOCE[1], olha: [PARA[0], PARA[1] - 1], luz: [0.9, 0.96, 1.08] }
        ],
        falas: [{ em: RIVAL, quem: 'RIN ITOSHI', texto: '"A partir deste momento... VOCÊ É O MEU RIVAL."' }],
        efeitos: [
          // o pico: a tremida forte no "VOCÊ É O MEU RIVAL"
          { tipo: 'tremor', em: CAI, ate: CAI + 40, forca: 0.85, amp: 0.05 }
        ],
        quadros: [
          {
            // a toalha batendo no chão (o único quadro de mangá da cena), visto rente ao piso
            em: CHAO_T - 4,
            ate: CHAO_T + 100,
            sai: 10,
            poly: null,
            layout: 'direita',
            pixel: 6,
            desenho(b, g, q) {
              // Rente ao piso, entre os dois pares de chuteiras: o tênis azul do Rin à
              // esquerda, o seu à direita e a toalha amassada no meio. Desenhado numa grade de
              // 84 x 48 "pixels" do quadro (cada um ~6 px da tela, o tamanho do pixel do
              // quadro), só com tons que sobrevivem à redução de cores (múltiplos de 51)
              const sx = b.w / 84;
              const sy = b.h / 48;
              const L = (c, lx, ly, lw, lh) => {
                g.fillStyle = c;
                g.fillRect(b.x + Math.round(lx) * sx, b.y + Math.round(ly) * sy, Math.ceil(lw) * sx + 0.5, Math.ceil(lh) * sy + 0.5);
              };
              // os armários lá atrás e o rodapé
              L('#000033', 0, 0, 84, 15);
              for (let i = 0; i < 6; i++) {
                L('#003366', 2 + i * 14, 1, 12, 11);
                L('#336699', 11 + i * 14, 5, 1, 3);
              }
              L('#336699', 0, 13, 84, 2);
              // o piso de ladrilho (linhas escuras) e a luz fria do corredor vindo da esquerda
              L('#333366', 0, 15, 84, 33);
              for (let r = 15; r < 48; r++) L('#336699', 0, r, Math.max(0, 14 - (r - 15) * 0.25), 1);
              [19, 25, 33, 44].forEach((r) => L('#000033', 0, r, 84, 1));
              [[-20, 18], [10, 30], [42, 42], [74, 54], [104, 66]].forEach(([b0, t0]) => {
                for (let r = 15; r < 48; r++) L('#000033', t0 + ((b0 - t0) * (r - 15)) / 33, r, 1, 1);
              });
              // uma chuteira de lado (dir = 1: bico para a direita), com a meia subindo
              const tenis = (x0, y0, dir, cano, escuro, cadarco, listra) => {
                const T = (c, lx, ly, lw, lh) => L(c, dir > 0 ? x0 + lx : x0 + 19 - lx - lw, y0 + ly, lw, lh);
                T('#003366', 3, -20, 5, 20);
                T(listra, 3, -6, 5, 1);
                T(listra, 3, -4, 5, 1);
                T(cano, 2, 0, 13, 5);
                T(cano, 15, 2, 3, 3);
                T(escuro, 2, 0, 2, 5);
                T(cadarco, 8, 1, 1, 1);
                T(cadarco, 10, 1, 1, 1);
                T(cadarco, 12, 2, 1, 1);
                T('#ffffff', 1, 5, 18, 2);
                T('#999999', 1, 7, 18, 1);
              };
              // o par do Rin (o de trás mais escuro) e o seu
              tenis(9, 30, 1, '#003399', '#000066', '#6699cc', '#336699');
              tenis(3, 33, 1, '#0066cc', '#003399', '#99ccff', '#33ccff');
              tenis(57, 30, -1, '#009999', '#006666', '#99ffff', '#336699');
              tenis(63, 33, -1, '#00cccc', '#009999', '#ccffff', '#00cccc');
              // a toalha: cai (alta e estreita) e assenta amassada no piso, entre os pares
              const k = ease(seg(q, 0.02, 0.2));
              const cx = 42;
              const base = 41;
              const alt = lerp(15, 7, k);
              const larg = lerp(9, 22, k);
              const top = base - alt - lerp(16, 0, k);
              const x0 = cx - larg / 2;
              if (k > 0.6) L('#000033', x0 - 1, base, larg + 2, 2);
              L('#666699', x0 - 1, top + 1, larg + 2, alt);
              L('#ffffff', x0, top + alt * 0.3, larg, alt * 0.7);
              L('#ffffff', x0 + larg * 0.18, top, larg * 0.55, alt * 0.45);
              L('#cccccc', x0, top + alt * 0.62, larg * 0.22, alt * 0.38);
              L('#cccccc', x0 + larg * 0.55, top + alt * 0.15, larg * 0.14, alt * 0.85);
              L('#999999', x0 + larg * 0.36, top + alt * 0.35, 1, alt * 0.65);
              L('#999999', x0 + larg * 0.8, top + alt * 0.45, 1, alt * 0.55);
              // a ponta dobrada por cima (quando assenta) e a barra azul
              if (k > 0.85) {
                L('#666699', x0 + larg * 0.58, top - 3, larg * 0.3 + 1, 3);
                L('#ffffff', x0 + larg * 0.6, top - 2, larg * 0.28, 2);
              }
              L('#33ccff', x0 + 1, base - 3, larg - 2, 1);
              L('#006699', x0 + 1, base - 2, larg - 2, 1);
              // a queda: três riscos acima dela
              if (k < 0.95) for (let i = 0; i < 3; i++) L('#cccccc', x0 + 2 + i * (larg / 3), top - 9, 1, 7);
              // o contato: a poeira rente ao chão, para os dois lados
              const p = seg(q, 0.16, 0.42);
              if (p > 0 && p < 1) {
                const d = 2 + p * 8;
                L('#cccccc', x0 - d - 3, base - 2, 3, 2);
                L('#cccccc', x0 + larg + d, base - 2, 3, 2);
                if (p < 0.6) {
                  L('#ffffff', x0 - d * 1.5 - 2, base - 5, 2, 2);
                  L('#ffffff', x0 + larg + d * 1.5, base - 5, 2, 2);
                }
              }
            }
          }
        ],
        sons: [
          { em: CAI, som: 'vento' },
          { em: CHAO_T, som: 'pagina' }
        ]
      },
      {
        id: 'chao',
        dur: 210,
        // a grua sobe devagar (sem passar do teto, que fica em 1,75): a toalha entre os dois
        // (termina num ângulo de uns 35°, com os dois inteiros: nada cortado em cima)
        cam: { de: [[39.8, 0.5, 21.4], [42.2, 0.3, 21.4], 40], para: [[40.25, 1.45, 21.4], [42.2, 0.18, 21.4], 48], curva: 'easeIO' },
        cena(K) {
          vestiario(K);
          toalhaNoChao(K);
        },
        atores: [
          { quem: 'rin', extra: RIN, x: PARA[0], y: PARA[1], olha: [VOCE[0], VOCE[1] + 1], luz: [1.02, 1.04, 1.1] },
          { quem: 'you', extra: BL, x: VOCE[0], y: VOCE[1], olha: [PARA[0], PARA[1] - 1], luz: [0.9, 0.96, 1.08] }
        ]
      }
    ]
  });
})();
