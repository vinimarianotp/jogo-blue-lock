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
  const ES = '#334155'; // a sombra embaixo da toalha (o rosto escondido)
  const LI = '#38bdf8'; // a listra azul do Blue Lock na barra
  const px = (g) => (c, x, y, w, h) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  // na cabeça, de frente: a cúpula cobre o cabelo, as abas caem até os ombros e o rosto fica
  // na sombra entre elas
  // (a cabeça está baixa: vê-se o alto da toalha; a frente cai sobre o rosto e só sobra uma
  // fresta de sombra embaixo, torta, entre as abas)
  const CABECA = () =>
    R.tela('rr|toalha_cabeca3', 26, 26, (g) => {
      const p = px(g);
      p(BR, 8, 1, 10, 1);
      p(BR, 5, 2, 16, 2);
      p(BR, 3, 4, 20, 3);
      p(BR, 2, 7, 22, 6);
      p(BR, 1, 13, 8, 8); // aba esquerda
      p(BR, 17, 13, 8, 7); // aba direita
      p(BR, 7, 13, 12, 3); // a frente caída sobre o rosto
      p(BR, 9, 16, 7, 1);
      p(BR, 2, 21, 6, 3);
      p(BR, 18, 20, 6, 3);
      p(ES, 9, 17, 8, 2); // a fresta de sombra embaixo da toalha
      p(ES, 8, 16, 1, 3);
      p('#1e293b', 10, 19, 6, 1);
      p(CL, 3, 7, 4, 5);
      p(CL, 2, 14, 3, 8);
      p(CL, 21, 14, 3, 7);
      p(CL, 7, 12, 3, 4);
      p(SM, 8, 15, 10, 1); // a borda da frente
      p(SM, 12, 4, 1, 4); // a dobra do meio
      p(SM, 16, 8, 1, 4);
      p(LI, 2, 23, 6, 1);
      p(LI, 18, 22, 6, 1);
      p('#ffffff', 9, 2, 6, 1);
      p('#ffffff', 6, 4, 4, 1);
    });
  // nos ombros, em volta do pescoço (as pontas caindo dos dois lados)
  // (um U de cabeça para baixo: a volta no pescoço e as duas pontas caindo na frente; o meio
  // fica vazado e a camisa aparece)
  const OMBROS = () =>
    R.tela('rr|toalha_ombros3', 26, 18, (g) => {
      const p = px(g);
      p(BR, 6, 1, 14, 3);
      p(BR, 4, 3, 5, 14);
      p(BR, 17, 3, 5, 13);
      p(CL, 4, 6, 2, 11);
      p(CL, 20, 6, 2, 10);
      p(SM, 8, 4, 1, 12);
      p(SM, 17, 4, 1, 11);
      p(LI, 4, 16, 5, 1);
      p(LI, 17, 15, 5, 1);
      p('#ffffff', 8, 1, 8, 1);
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
          } else naCabeca(K, a, OMBROS(), { z: 0.27, w: 0.42, h: 0.3 });
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
          if (t < CAI) naCabeca(K, a, OMBROS(), { z: 0.27, w: 0.42, h: 0.3 });
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
              const { x, y, w, h } = b;
              const P = (c, a, bb, cc, dd) => {
                g.fillStyle = c;
                g.fillRect(x + a * w, y + bb * h, cc * w, dd * h);
              };
              // (o quadro reduz as cores a 6 tons por canal: a paleta usa só esses tons, chapados)
              // os armários lá atrás, desfocados, e o piso de ladrilho em perspectiva
              P('#003366', 0, 0, 1, 0.4);
              for (let i = 0; i < 5; i++) P('#333366', 0.03 + i * 0.2, 0.05, 0.17, 0.33);
              P('#333366', 0, 0.4, 1, 0.6);
              P('#336699', 0, 0.4, 1, 0.03);
              [0.48, 0.58, 0.72, 0.9].forEach((yy) => P('#336699', 0, yy, 1, 0.012));
              [-0.4, -0.1, 0.2, 0.5, 0.8, 1.1, 1.4].forEach((xx) => {
                for (let s = 0; s < 12; s++) {
                  const f = s / 12;
                  P('#336699', 0.5 + (xx - 0.5) * (0.25 + f * 0.75) - 0.004, 0.4 + f * 0.6, 0.008, 0.05);
                }
              });
              // a luz fria do corredor entra pela esquerda (uma faixa mais clara no chão)
              P('#336699', 0, 0.62, 0.36, 0.38);
              // o tênis do Rin na beira do quadro (de quem é a toalha)
              P('#0066cc', 0.02, 0.6, 0.15, 0.1);
              P('#ffffff', 0.02, 0.7, 0.17, 0.03);
              P('#003366', 0.06, 0.5, 0.06, 0.1);
              // a toalha: cai (alta e estreita) e assenta (larga e baixa, amassada)
              const k = ease(seg(q, 0.02, 0.2));
              const cx = 0.56;
              const base = 0.82;
              const alt = lerp(0.42, 0.15, k);
              const larg = lerp(0.18, 0.56, k);
              const top = base - alt - lerp(0.3, 0, k);
              P('#000033', cx - larg * 0.52, base - 0.015, larg * 1.04, 0.045);
              P('#ffffff', cx - larg * 0.5, top + alt * 0.35, larg, alt * 0.65);
              P('#ffffff', cx - larg * 0.34, top, larg * 0.6, alt * 0.4);
              P('#cccccc', cx - larg * 0.5, top + alt * 0.6, larg * 0.2, alt * 0.4);
              P('#cccccc', cx + larg * 0.1, top + alt * 0.18, larg * 0.16, alt * 0.82);
              P('#999999', cx - larg * 0.1, top + alt * 0.35, larg * 0.05, alt * 0.65);
              P('#999999', cx + larg * 0.28, top + alt * 0.5, larg * 0.04, alt * 0.5);
              P('#33ccff', cx - larg * 0.48, base - alt * 0.18, larg * 0.9, Math.max(0.03, alt * 0.1));
              // a queda: riscos verticais acima dela (só enquanto cai)
              if (k < 0.95) for (let i = 0; i < 4; i++) P('#cccccc', cx - larg * 0.4 + i * larg * 0.27, top - 0.24, 0.014, 0.18);
              // o contato: a poeira sai rente ao chão para os dois lados
              const p = seg(q, 0.16, 0.4);
              if (p > 0 && p < 1) {
                const d = 0.04 + p * 0.16;
                P('#cccccc', cx - larg * 0.5 - d - 0.05, base - 0.05, 0.05, 0.035);
                P('#cccccc', cx + larg * 0.5 + d, base - 0.05, 0.05, 0.035);
                if (p < 0.6) {
                  P('#ffffff', cx - larg * 0.5 - d * 1.4 - 0.03, base - 0.1, 0.03, 0.03);
                  P('#ffffff', cx + larg * 0.5 + d * 1.4, base - 0.1, 0.03, 0.03);
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
