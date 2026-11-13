// ============================================================================
// 12 · chem_reaction — a Reação Química: O MARCADOR NO MEIO
// Conceito A do lote 1 (docs/cenas/CONCEITOS_LOTE1.md), regras em CUTSCENE_STYLE.md.
// Assinatura: a tabela vista de lado, na altura da cintura, com o marcador rival de pé no
// meio dos dois. Ele vira a cabeça para um lado e para o outro atrás da bola e nunca acha
// ela: no seu chute de primeira ainda está olhando para o lado errado.
// Três planos de ~2 s: o seu passe → a devolução do parceiro, do jeito dele → o seu toque
// (o pico: quadro de impacto) com a bola saindo do quadro. O resultado é da partida.
// Dados: CE.ptdChemCtx() (js/cine_partida.js), montado pela partida em playChemCutscene:
//   { partner, you, def (o marcador mais perto), pc (cor do parceiro), st: { kind, shout,
//     finish } (o jeito do parceiro: CE.CHEM_STYLES), c: { partnerName, youName } }
// O estádio é o da partida (sem tema próprio). Substitui o registro antigo de
// js/cine3d_partida.js (este arquivo carrega depois).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro) return;
  const R = CE.roteiro;
  const { seg, lerp } = R;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIn = (x) => clamp(x) * clamp(x);
  const easeIO = R.curvas.easeIO;

  const ctxo = () => CE.ptdChemCtx();
  const kind = () => (ctxo().st && ctxo().st.kind) || 'through';
  const fin = () => (ctxo().st && ctxo().st.finish) || 'shoot';
  // cor de quem fala: a da tabela (CUTSCENE_STYLE §1.2) ou, fora dela, a cor do parceiro
  function corParceiro() {
    const o = ctxo();
    const tab = R.corDe(String(o.c.partnerName || o.partner.name || ''));
    return tab !== '#e2e8f0' ? tab : o.pc || '#e2e8f0';
  }

  // ---------------------------------------------------------------- o campo
  // Ataque no gol norte (y 6,6): u = de lado (x), d = distância da linha do gol.
  // A câmera fica a leste, de lado: o gol fica para a DIREITA do quadro.
  const GX = 53;
  const P = (u, d, z = 0) => [GX + u, 6.6 + d, z];
  const cam = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  const ator = (K, cd, p, o) => {
    if (cd && typeof cd === 'object' && !cd.name) cd = Object.assign({}, cd, { name: '_' + (o.id || '') });
    return K.actor(cd, Object.assign({ x: p[0], y: p[1], z: p[2] || 0 }, o));
  };
  const corre = (f, passo = 3) => 1 + (Math.floor(f / passo) % 4) * 4;
  // onde cada um fica (u, d)
  // (na entrada da área: a linha da grande área fica em d 2,8)
  const VC = [-0.1, 5.9]; // você no começo
  const VF = [-0.1, 5.0]; // você no chute
  const PA = [-1.15, 2.4]; // o parceiro
  const MK = [0.3, 3.75]; // o marcador, no meio (um pouco mais perto da câmera)
  const ALVO = [-0.75, -0.1, 0.8]; // o canto longe do marcador
  // altura da bola no seu pé no chute (de primeira, de voleio, de bicicleta)
  const FZ = { shoot: 0.06, volley: 0.34, bicycle: 0.6 };

  // O marcador: para onde ele olha (para a esquerda = você, para a direita = o parceiro).
  // Cada virada é um tranco: um pulinho no lugar, o corpo gira passando de frente para a
  // câmera e dá meio passo para o lado em que a bola JÁ esteve.
  // (v = você, ao sul: ângulo +90°; p = parceiro, ao norte: −90°; 0° = de frente para a
  // câmera, que fica a leste)
  const ANG = { v: Math.PI / 2, p: -Math.PI / 2 };
  const LADO = { v: 0.14, p: -0.14 }; // o meio passo (em d)
  // viradas = [[quando, para onde], ...] em ordem; começa olhando 'de'
  function marcador(K, t, de, viradas) {
    let ang = ANG[de];
    let dd = LADO[de];
    let z = 0;
    let ant = de;
    viradas.forEach(([quando, para]) => {
      const k = seg(t, quando, quando + 7);
      if (k <= 0) return;
      ang = lerp(ANG[ant], ANG[para], ease(k));
      dd = lerp(LADO[ant], LADO[para], ease(k));
      z = Math.max(z, Math.sin(k * Math.PI) * 0.07);
      ant = para;
    });
    return ator(K, ctxo().def, P(MK[0], MK[1] + dd, z), { id: 'mk', ang, frame: 0 });
  }

  // ---------------------------------------------------------------- o seu passe (plano 1)
  const PASSE = 50; // você toca
  const CHEGA = 84; // a bola chega no parceiro
  function bolaPasse(t) {
    if (t < PASSE) {
      const k = ease(seg(t, 0, PASSE - 6));
      const d = lerp(VC[1] + 0.3, VC[1] - 0.3, k);
      return P(VC[0] + 0.05, d - 0.3, 0.05);
    }
    const q = seg(t, PASSE, CHEGA);
    const de = P(VC[0], VC[1] - 0.55, 0.05);
    const para = P(PA[0] + 0.15, PA[1] + 0.32, kind() === 'trap' ? 0.3 : 0.05);
    const p = R.mix(de, para, kind() === 'power' ? ease(q) : q);
    // lançado (o parceiro mata no peito/pé) ou rasteiro
    if (kind() === 'trap' || kind() === 'acrobat') p[2] += Math.sin(q * Math.PI) * 1.1;
    else p[2] += Math.sin(q * Math.PI) * 0.12;
    return p;
  }

  // ---------------------------------------------------------------- a devolução (plano 2)
  // cada jeito: onde o parceiro toca, quando, a pose e o caminho da bola até você
  const DEV = 58; // o parceiro devolve (tempo do plano 2)
  function jogada(t) {
    const k = kind();
    const r = { p: [PA[0], PA[1], 0], anim: 'idle', frame: 0, solta: DEV, held: null };
    if (k === 'dribble') {
      // a ginga: dois cortes no lugar antes de soltar
      r.p = [PA[0] + Math.sin(t * 0.22) * 0.18 * (1 - seg(t, 40, DEV)), PA[1], 0];
      r.anim = t < DEV ? (Math.floor(t / 12) % 2 ? 'rabona' : 'run') : 'shoot';
      r.frame = t < DEV ? undefined : 1;
    } else if (k === 'trap') {
      // a bola cai do alto e morre no pé; ele levanta de volta
      r.anim = t < DEV - 10 ? 'idle' : t < DEV ? 'windup' : 'shoot';
      r.frame = t < DEV - 10 ? 0 : 1;
    } else if (k === 'sprint') {
      // arranca com a bola dois passos e corta para trás
      const q = ease(seg(t, 0, DEV - 8));
      r.p = [PA[0], PA[1] - q * 1.1, 0];
      r.anim = t < DEV - 8 ? 'run' : t < DEV ? 'windup' : 'shoot';
      r.frame = t < DEV - 8 ? corre(t, 2) : 1;
    } else if (k === 'power') {
      r.anim = t < DEV - 12 ? 'idle' : t < DEV ? 'windup' : 'shoot';
      r.frame = t < DEV - 12 ? 0 : 1;
    } else if (k === 'acrobat') {
      // de costas, de bicicleta
      const q = seg(t, DEV - 18, DEV + 22);
      r.p = [PA[0], PA[1], Math.sin(q * Math.PI) * 0.4];
      r.anim = t < DEV - 18 ? 'idle' : 'bicycle';
      r.frame = t < DEV - 18 ? 0 : undefined;
      r.opts = t < DEV - 18 ? undefined : { animTime: q * 40 };
    } else {
      // through e curve: o toque limpo
      r.anim = t < DEV - 10 ? 'idle' : t < DEV ? 'windup' : 'shoot';
      r.frame = t < DEV - 10 ? 0 : 1;
    }
    r.held = [r.p[0] + 0.15, r.p[1] + 0.3, 0.05 + (r.p[2] || 0) * 0.9];
    return r;
  }
  const ATE = 40; // quadros da devolução até o seu pé
  function bolaDevolucao(t) {
    const r = jogada(t);
    if (t < DEV) {
      if (kind() === 'trap') {
        // ainda caindo do lançamento do plano 1 e morrendo no pé
        const q = seg(t, 0, 16);
        return [r.held[0], r.held[1], lerp(0.5, 0.05, easeIn(q)) + Math.abs(Math.sin(q * Math.PI * 2)) * 0.06 * (1 - q)];
      }
      return r.held;
    }
    const q = seg(t, DEV, DEV + ATE);
    const de = P(r.p[0] + 0.12, r.p[1] + 0.32, 0.05 + (r.p[2] || 0));
    const para = P(VF[0] - 0.05, VF[1] - 0.32, FZ[fin()]);
    const p = R.mix(de, para, kind() === 'power' ? ease(q) : q);
    if (kind() === 'curve') {
      // por fora do marcador: abre para longe da câmera e volta
      p[0] -= Math.sin(q * Math.PI) * 0.9;
      p[2] += Math.sin(q * Math.PI) * 0.25;
    } else if (kind() === 'trap' || kind() === 'acrobat' || fin() !== 'shoot') p[2] += Math.sin(q * Math.PI) * 0.75;
    return p;
  }

  // ---------------------------------------------------------------- o seu chute (plano 3)
  // câmera lenta curta chegando no toque (rampa de 10 quadros) e a pausa de 4 quadros no
  // contato (a 2ª faixa soma 0,35 à perda de 0,65 da 1ª: o tempo da ação para)
  const HIT_T = 40; // o contato, no tempo do plano (efeitos e sons)
  const LENTO3 = [
    { em: 18, ate: 62, fator: 0.35, rampa: 10 },
    { em: HIT_T, ate: HIT_T + 4, fator: 0.65, rampa: 0 }
  ];
  const HIT = R.acao(LENTO3, HIT_T); // o contato, no tempo da ação (atores e bola)
  function bolaChute(a) {
    const pe = P(VF[0] - 0.05, VF[1] - 0.32, FZ[fin()]);
    if (a < HIT) {
      // a devolução terminando de chegar
      const q = seg(a, 0, HIT);
      const de = P(VF[0] - 0.4, VF[1] - 1.6, FZ[fin()] + (fin() === 'shoot' ? 0 : 0.4));
      return R.mix(de, pe, q);
    }
    const q = easeIn(seg(a, HIT, HIT + 26)) * 0.6 + seg(a, HIT, HIT + 26) * 0.4;
    const p = R.mix(pe, P(ALVO[0], ALVO[1], ALVO[2]), q);
    p[2] += Math.sin(q * Math.PI) * 0.2;
    return p;
  }

  const def = R('chem_reaction', {
    titulo: 'REAÇÃO QUÍMICA',
    leitura: 0.7,
    grao: 0.05,
    vinheta: 0.45,
    cenario(K) {
      K.expo(1.0);
    },
    planos: [
      // 1 · O SEU PASSE: você toca por fora do marcador; ele vira tarde para o parceiro
      {
        id: 'passe',
        dur: 120,
        cena(K, S, st) {
          const t = S.t;
          const o = ctxo();
          const k = ease(seg(t, 0, PASSE));
          const vp = P(VC[0], lerp(VC[1] + 0.3, VC[1], k));
          ator(K, o.you, vp, { id: 'y', face: P(PA[0], PA[1]), anim: t < PASSE - 10 ? 'run' : t < PASSE ? 'windup' : 'shoot', frame: t < PASSE - 10 ? corre(S.f, 4) : 1 });
          ator(K, o.partner, P(PA[0], PA[1]), { id: 'p', face: P(VC[0], VC[1]), anim: t > CHEGA - 8 && t < CHEGA + 6 ? 'windup' : 'idle', frame: t > CHEGA - 8 && t < CHEGA + 6 ? 1 : 0 });
          // olhando você... e o tranco para o lado do parceiro quando a bola já passou
          marcador(K, t, 'v', [[PASSE + 16, 'p']]);
          const b = bolaPasse(t);
          K.ball(b[0], b[1], b[2]);
          st.bola = R.ponto(b[0], b[1], b[2]);
          const q = easeIO(seg(t, 0, S.dur));
          cam(K, P(lerp(4.05, 3.8, q), lerp(4.5, 4.1, q), 0.56), P(-0.3, lerp(4.25, 3.95, q), 0.44), 44);
        },
        sons: [{ em: PASSE, som: 'passe' }]
      },
      // 2 · A DEVOLUÇÃO: o parceiro, do jeito dele; o marcador vira de novo, tarde
      {
        id: 'devolucao',
        dur: 120,
        cena(K, S, st) {
          const t = S.t;
          const o = ctxo();
          const r = jogada(t);
          ator(K, o.partner, P(r.p[0], r.p[1], r.p[2]), { id: 'p', face: P(VF[0], VF[1]), anim: r.anim, frame: r.frame, opts: r.opts });
          const k = ease(seg(t, 10, 100));
          ator(K, o.you, P(VC[0], lerp(VC[1], VF[1], k)), { id: 'y', face: P(0, 0), anim: k < 0.98 ? 'run' : 'idle', frame: k < 0.98 ? corre(S.f, 4) : 0 });
          marcador(K, t, 'p', [[DEV + 18, 'v']]);
          const b = bolaDevolucao(t);
          K.ball(b[0], b[1], b[2]);
          st.bola = R.ponto(b[0], b[1], b[2]);
          const q = easeIO(seg(t, 0, S.dur));
          // a câmera começa no parceiro e acompanha a bola voltando
          const pan = easeIO(seg(t, DEV - 6, DEV + ATE + 10));
          cam(K, P(lerp(3.9, 3.75, q), lerp(3.2, 4.35, pan), 0.6), P(-0.3, lerp(2.9, 4.2, pan), 0.45), lerp(43, 44, q));
        },
        falas: [
          {
            em: 8,
            tipo: 'grito',
            texto: () => `"${(ctxo().st && ctxo().st.shout) || 'AGORA!'}"`,
            get nome() {
              const o = ctxo();
              return String(o.c.partnerName || o.partner.name || 'PARCEIRO').toUpperCase();
            },
            get cor() {
              return corParceiro();
            }
          }
        ],
        sons: [{ em: DEV, fn: () => (kind() === 'power' ? window.SFX?.kick?.(0.8) : window.SFX?.pass?.()) }]
      },
      // 3 · O SEU TOQUE: de primeira, mais baixo e mais perto; a bola sai do quadro e o
      // marcador ainda olha para você
      {
        id: 'chute',
        dur: 125,
        lento: LENTO3,
        cena(K, S, st) {
          const t = S.t;
          const A = S.A;
          const o = ctxo();
          const f = fin();
          const bate = A >= HIT;
          const sobe = f === 'bicycle' ? Math.sin(seg(A, HIT - 20, HIT + 40) * Math.PI) * 0.4 : f === 'volley' ? Math.sin(seg(A, HIT - 16, HIT + 26) * Math.PI) * 0.14 : 0;
          const anim = f === 'bicycle' ? (A < HIT - 20 ? 'windup' : 'bicycle') : bate ? 'shoot' : 'windup';
          ator(K, o.you, P(VF[0], VF[1], sobe), { id: 'y', face: P(ALVO[0], 0), anim, frame: anim === 'bicycle' ? undefined : 1, opts: anim === 'bicycle' ? { animTime: seg(A, HIT - 20, HIT + 40) * 40 } : undefined });
          // o marcador: ainda olhando você quando a bola passa; vira tarde... e volta
          marcador(K, t, 'v', [[HIT_T + 30, 'p'], [HIT_T + 60, 'v']]);
          ator(K, o.partner, P(PA[0], PA[1]), { id: 'p', face: P(ALVO[0], 0), anim: 'idle', frame: 0 });
          const b = bolaChute(A);
          K.ball(b[0], b[1], b[2]);
          const pe = P(VF[0] - 0.05, VF[1] - 0.32, FZ[f] + sobe * 0.5);
          st.pe = R.ponto(pe[0], pe[1], pe[2]);
          st.bola = R.ponto(b[0], b[1], b[2]);
          st.bateu = bate;
          const q = easeIO(seg(t, 0, S.dur));
          // (o gol fica fora do quadro, à direita: a bola sai do quadro e o resultado é da partida)
          cam(K, P(lerp(3.55, 3.4, q), lerp(6.5, 6.3, q), lerp(0.36, 0.34, q) + sobe * 0.3), P(-0.1, lerp(5.2, 5.0, q), 0.42 + sobe * 0.4), lerp(44, 43, q));
        },
        efeitos: [
          { tipo: 'impacto', em: HIT_T, ate: HIT_T + 2 },
          { tipo: 'tremor', em: HIT_T, ate: HIT_T + 24, forca: 0.45, amp: 0.05 },
          { tipo: 'linhas', modo: 'radial', em: HIT_T, ate: HIT_T + 10, alvo: 'pe', forca: 0.4, cor: '#e0f2fe' }
        ],
        sons: [{ em: HIT_T, fn: () => window.SFX?.kick?.(1) }],
        depois(ctx, S, K, st) {
          // os dois rastros (a cor do parceiro e o ciano) saindo juntos do pé
          if (!st.bateu || !st.pe || !st.bola || !CE.luckStreak) return;
          const k = 1 - seg(S.t, HIT_T + 22, HIT_T + 40);
          if (k <= 0) return;
          const hex = (c) => {
            const h = String(c || '#00f5d4').replace('#', '');
            return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0).join(',');
          };
          CE.luckStreak(ctx, st.pe.x, st.pe.y - 4, st.bola.x, st.bola.y - 4, 2, 16, hex(ctxo().pc), 0.8 * k);
          CE.luckStreak(ctx, st.pe.x, st.pe.y + 4, st.bola.x, st.bola.y + 4, 2, 16, hex(R.cores['VOCÊ']), 0.8 * k);
        }
      }
    ]
  });
  // o título da tarja de cima: os dois da tabela
  Object.defineProperty(def, 'title', {
    configurable: true,
    enumerable: true,
    get() {
      const o = ctxo();
      return `REAÇÃO QUÍMICA • ${String(o.c.partnerName || o.partner.name || '').toUpperCase()}`;
    }
  });
})();
