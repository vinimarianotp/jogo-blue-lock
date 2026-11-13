// ============================================================================
// 05/06 · barou_king / barou_king_win — "O campo dos caídos" (conceito A)
// Cap. 1, Time Z × Time X, logo depois do jogo, no campo do Prédio 5. O Time Z defende o gol
// sul; a câmera fica do lado oeste, então o Rei SEMPRE entra pela esquerda e ataca a direita.
// Assinatura: quem o Rei dribla senta no gramado e não levanta mais; o campo vai se enchendo
// de caídos.
//   Derrota (05, ~21 s): três lances, cada um mais curto (5 s, 4 s, 3 s), com a câmera do alto
//     (o Time Z visto de cima, pequeno). No 3º você é o último de pé, senta sem encostar na
//     bola e o Rei marca (o pico: quadro de impacto). Ele passa por você; a grua sobe sobre o
//     campo cheio de caídos.
//   Vitória (06, ~24 s): planos próprios desde o 1º, com a câmera mais baixa e você perto
//     dela, de pé, lendo o Rei. No 3º lance você não senta: rouba e vira o jogo (o pico: quadro
//     de impacto no SEU chute). No fim, só você e o Barou de pé no meio dos caídos.
// O placar da derrota é o do jogo (três gols do Rei; AUDIT [VERIFICAR] 15). O da vitória vem da
// partida (placar final), com 3 × 2 quando a cena é revista fora da partida.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro || !CE.rtA) return;
  const R = CE.roteiro;
  const A = CE.rtA;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = R.seg;
  const lerp = R.lerp;
  const suave = R.curvas.suave;

  const BAROU_COR = '#ef4444'; // (cor nova: não está na tabela do CUTSCENE_STYLE §1.2)
  // uniformes do jogo (data_story: ch1_first_selection_x_y)
  const Z = { jerseyPrimary: '#1e40af', jerseySecondary: '#38bdf8' };
  const X = { jerseyPrimary: '#111827', jerseySecondary: '#dc2626' };
  const XA = Object.assign({ angry: true }, X); // (o Rei de cara fechada)
  const GS = A.campo.gs; // gol sul (o do Time Z)
  const GN = A.campo.gn; // gol norte (o do Time X)

  // ---------------------------------------------------------------- trilhas
  // kf = [[t, x, y], ...]: posição suave entre as marcas (cada trecho com entrada e saída)
  const trilha = (kf, t) => {
    if (t <= kf[0][0]) return [kf[0][1], kf[0][2]];
    for (let i = 1; i < kf.length; i++) {
      const a = kf[i - 1];
      const b = kf[i];
      if (t <= b[0]) {
        const k = suave(seg(t, a[0], b[0]));
        return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
      }
    }
    const z = kf[kf.length - 1];
    return [z[1], z[2]];
  };
  // para onde a trilha vai (um ponto à frente)
  const frente = (kf, t) => {
    const a = trilha(kf, t - 3);
    const b = trilha(kf, t + 3);
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d < 1e-3) return null;
    return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
  };
  const passo = (t, p = 3) => 1 + (Math.floor(t / p) % 4) * 4;
  // Sentado no chão, este boneco só se lê de frente (de lado parece um baixinho em pé): quem
  // caiu fica virado para a câmera do plano (cam = [x, y] dela), um pouco de lado (desvio)
  const deFrente = (p, cam, desvio = 0.35) => {
    const a = Math.atan2(cam[1] - p[1], cam[0] - p[0]) + desvio;
    return [p[0] + Math.cos(a) * 2, p[1] + Math.sin(a) * 2];
  };

  // O lance do Rei: L = { kf (trilha), arma (começa o chute), chute (o pé na bola), gol (a bola
  // na rede), alvo: [x, y, z] na rede, depois: [x, y] para onde ele olha no fim }
  function barouAtor(L, o = {}) {
    return {
      quem: 'barou',
      extra: o.extra || X,
      x: (t) => trilha(L.kf, t)[0],
      y: (t) => trilha(L.kf, t)[1],
      anim: (t) => (t < L.arma ? 'run' : t < L.chute ? 'windup' : t < L.chute + 24 ? 'shoot' : 'idle'),
      frame: (t) => (t < L.arma ? passo(t, 3) : t < L.chute + 24 ? 1 : undefined),
      olha: (t) => {
        if (t >= L.chute + 24) return L.depois || [53, 12];
        if (t >= L.arma) return [L.alvo[0], L.alvo[1]];
        const p = trilha(L.kf, t);
        const d = frente(L.kf, t) || [0, 1];
        return [p[0] + d[0], p[1] + d[1]];
      },
      opts: o.opts
    };
  }
  // a bola do lance: no pé dele até o chute; depois até a rede (e cai)
  function bolaLance(K, L, t, st) {
    let b;
    if (t < L.chute) {
      const p = trilha(L.kf, t);
      const d = frente(L.kf, t) || [0, 1];
      b = [p[0] + d[0] * 0.3, p[1] + d[1] * 0.3, 0.05 + Math.abs(Math.sin(t * 0.32)) * 0.05];
    } else {
      const p = trilha(L.kf, L.chute);
      const d = frente(L.kf, L.chute - 4) || [0, 1];
      const b0 = [p[0] + d[0] * 0.3, p[1] + d[1] * 0.3, 0.06];
      const q = seg(t, L.chute, L.gol);
      if (q < 1) {
        b = R.mix(b0, L.alvo, q);
        b[2] += Math.sin(q * Math.PI) * 0.12;
        const qa = Math.max(0, q - 0.3);
        const ba = R.mix(b0, L.alvo, qa);
        st.bola0 = R.ponto(ba[0], ba[1], ba[2]);
      } else {
        const u = t - L.gol;
        const sgn = L.alvo[1] > 14.5 ? 1 : -1;
        b = [L.alvo[0], L.alvo[1] + sgn * Math.min(0.42, u * 0.04), Math.max(0.08, L.alvo[2] - u * 0.02)];
      }
      st.pe = R.ponto(b0[0], b0[1], 0.12);
    }
    K.ball(b[0], b[1], b[2]);
    st.bola = R.ponto(b[0], b[1], b[2]);
  }
  // ---------------------------------------------------------------- os caídos, deitados
  // Sentado, o boneco chibi não se lê de longe (parece um baixinho em pé). Deitado se lê: o
  // quadro do próprio boneco (de frente, parado) vira uma placa deitada no gramado, girada,
  // fria e apagada, com uma sombra embaixo. (Câmera do lado oeste: giro 0 = cabeça para o
  // norte, à esquerda do quadro; perto de ±90° a cabeça apontaria para a câmera e encolhe.)
  let KK = null; // o K do quadro (o cenário guarda antes dos atores: o "visivel" desenha)
  const GIRO = { kuon: 0.55, igarashi: 3.6, raichi: 2.55, kunigami: -0.5, bachira: 2.9, you: 0.25, iemon: 3.3, gen_teamx_a: -0.35, gen_teamx_b: 2.75, gen_teamx_c: 0.45, gk_teamx: 3.0 };
  const DEITADO = new Map();
  function deitadoCv(K, quem, extra, giro) {
    const key = quem + '|' + JSON.stringify(extra || {}) + '|' + giro;
    let cv = DEITADO.get(key);
    if (cv) return cv;
    const PR = window.PixelRenderer;
    const cd = K.charData(quem, { extra });
    const s = document.createElement('canvas');
    s.width = s.height = 72;
    const sg = s.getContext('2d');
    sg.imageSmoothingEnabled = false;
    if (PR && PR.drawCharacterSprite) PR.drawCharacterSprite(sg, cd, 72, 72, { facing: 'front', view: 'front', animState: 'idle', frame: 1, accessories: [], shirtNumber: cd.number || 10 });
    cv = document.createElement('canvas');
    cv.width = cv.height = 96;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.translate(48, 48);
    g.rotate(giro);
    g.drawImage(s, -36, -38);
    g.setTransform(1, 0, 0, 1, 0, 0);
    A.limiar(g, 96, 96, 110);
    DEITADO.set(key, cv);
    return cv;
  }
  const SOMBRA_DEITADO = () => R.brilho('rgba(0,0,0,0.85)');
  function deitar(K, quem, extra, p) {
    if (!K) return;
    const X = window.Hub && window.Hub._3d;
    const half = (96 / ((X && X.C && X.C.SPX) || 66)) * 0.9 * 0.5;
    const giro = GIRO[quem] ?? 0.4;
    // a sombra embaixo do corpo (que fica mais ou menos ao longo de y)
    K.floor({ x0: p[0] - 0.3, y0: p[1] - 0.5, x1: p[0] + 0.3, y1: p[1] + 0.5, z: 0.008, img: SOMBRA_DEITADO(), color: '#000000', alpha: 0.6 });
    K.floor({ x0: p[0] - half, y0: p[1] - half, x1: p[0] + half, y1: p[1] + half, z: 0.013, img: deitadoCv(K, quem, extra, giro), color: '#8390b4' });
  }
  // quem tenta parar o Rei: D = { quem, p: [x, y] (de pé), bote: [t0, t1] (corre no Rei),
  // cai: t (desaba), senta: [x, y] (onde fica no chão), olha, sentado: true (você: senta) }
  function caido(D, extra = Z) {
    const alvo = D.bote ? D.botePara || D.p : D.p;
    return {
      quem: D.quem,
      id: D.id,
      extra,
      // (depois da queda o boneco some e fica a placa deitada no lugar)
      visivel: (t) => {
        if (D.sentado || t < D.cai + 10) return true;
        deitar(KK, D.quem, extra, D.senta);
        return false;
      },
      x: (t) => (t >= D.cai ? lerp(alvo[0], D.senta[0], seg(t, D.cai, D.cai + 10)) : D.bote ? lerp(D.p[0], alvo[0], suave(seg(t, D.bote[0], D.bote[1]))) : D.p[0]),
      y: (t) => (t >= D.cai ? lerp(alvo[1], D.senta[1], seg(t, D.cai, D.cai + 10)) : D.bote ? lerp(D.p[1], alvo[1], suave(seg(t, D.bote[0], D.bote[1]))) : D.p[1]),
      anim: (t) => (t >= D.cai + 10 ? 'sit_floor' : t >= D.cai ? 'fall' : D.bote && t >= D.bote[0] && t < D.bote[1] ? 'run' : 'idle'),
      frame: (t) => (D.bote && t >= D.bote[0] && t < D.bote[1] && t < D.cai ? passo(t, 3) : undefined),
      opts: (t) => (t >= D.cai && t < D.cai + 10 ? { animTime: (t - D.cai) * 3 } : undefined),
      olha: (t) => (t >= D.cai + 10 ? deFrente(D.senta, D.cam || [46.5, 16]) : typeof D.olha === 'function' ? D.olha(t) : D.olha),
      luz: (t) => (t >= D.cai + 10 ? VOCE_CAIDO : undefined)
    };
  }
  const VOCE_CAIDO = [0.72, 0.78, 0.94];
  // quem já caiu antes: deitado onde ficou (a placa; o boneco em pé não aparece)
  const sentado = (quem, p, cam, extra = Z) => ({
    quem,
    extra,
    x: p[0],
    y: p[1],
    visivel: () => {
      deitar(KK, quem, extra, p);
      return false;
    }
  });
  // o goleiro do Time Z: pula para o lado errado no chute
  const iemon = (L, lado, o = {}) => ({
    quem: 'iemon',
    x: (t) => lerp(53.0, 53.0 + lado * 0.75, suave(seg(t, L.chute + 2, L.chute + 18))),
    y: GS - 0.42,
    z: (t) => Math.sin(seg(t, L.chute + 2, L.chute + 22) * Math.PI) * 0.22,
    anim: (t) => (t < L.chute + 2 ? 'idle' : t < L.chute + 40 ? 'dive' : o.fim || 'kneel_one'),
    opts: (t) => (t >= L.chute + 2 && t < L.chute + 40 ? { animTime: Math.min(30, (t - L.chute - 2) * 1.4) } : undefined),
    olha: (t) => (t < L.chute + 2 ? [53, 14] : [53 + lado * 3, GS - 0.4])
  });

  // ---------------------------------------------------------------- os lances
  // 1º: corta por fora do Kuon e por dentro do Igarashi
  const L1 = {
    kf: [[0, 53.3, 11.0], [70, 53.1, 14.5], [100, 53.85, 15.9], [150, 53.7, 17.4], [178, 52.95, 18.7], [212, 53.1, 19.75]],
    arma: 212,
    chute: 222,
    gol: 240,
    alvo: [52.45, GS + 0.02, 0.45],
    depois: [53, 12]
  };
  const D1 = [
    { quem: 'kuon', p: [53.05, 16.25], bote: [70, 96], botePara: [53.2, 15.6], cai: 98, senta: [52.8, 15.75], olha: [53.3, 19] },
    { quem: 'igarashi', p: [53.45, 18.85], bote: [150, 176], botePara: [53.5, 18.4], cai: 180, senta: [53.8, 18.6], olha: [53.2, 21] }
  ];
  // 2º: pelo lado de dentro; o Raichi vem de frente, o Kunigami entra de carrinho
  const L2 = {
    kf: [[0, 53.0, 11.6], [50, 53.4, 14.5], [74, 54.3, 15.5], [110, 54.2, 17.25], [134, 53.55, 18.35], [160, 53.4, 19.7]],
    arma: 160,
    chute: 168,
    gol: 184,
    alvo: [53.65, GS + 0.02, 0.55],
    depois: [53, 12]
  };
  const D2 = [
    { quem: 'raichi', p: [54.05, 16.5], bote: [52, 72], botePara: [54.15, 15.95], cai: 76, senta: [54.6, 16.25], olha: [53.8, 19] },
    { quem: 'kunigami', p: [52.5, 18.3], bote: [112, 132], botePara: [53.25, 18.55], cai: 136, senta: [52.85, 19.1], olha: [53.4, 21] }
  ];
  // 3º: o mais curto. O Bachira cai; você é o último de pé
  const L3 = {
    kf: [[0, 53.2, 12.2], [30, 53.3, 14.3], [46, 52.7, 15.3], [70, 52.8, 16.55], [88, 53.7, 17.55], [108, 53.3, 19.55]],
    arma: 108,
    chute: 116,
    gol: 130,
    alvo: [52.4, GS + 0.02, 0.62],
    depois: [53, 17]
  };
  const SENTADOS1 = [['kuon', [52.8, 15.75]], ['igarashi', [53.8, 18.6]]];
  const SENTADOS2 = SENTADOS1.concat([['raichi', [54.6, 16.25]], ['kunigami', [52.85, 19.1]]]);
  const BACH_SENTA = [53.6, 15.05];
  const VOCE_SENTA = [52.7, 17.8];
  // o Time X fica no meio-campo norte (atrás do Rei, à esquerda do quadro)
  const TIME_X = [['gen_teamx_a', [52.0, 10.4]], ['gen_teamx_b', [54.3, 9.3]], ['gen_teamx_c', [55.7, 11.9]], ['gk_teamx', [53.0, GN + 0.45]]];
  const timeX = (olha, anim = 'idle', escolhe) => TIME_X.map(([q, p], i) => ({ quem: q, x: p[0], y: p[1], anim: escolhe ? escolhe(i) : anim, olha }));

  // placar da vitória (o da partida, quando a cena toca depois dela)
  const placarFinal = () => {
    const ME = window.MatchEngine;
    if (ME && ME.chapter && ME.chapter.id === 'ch1_first_selection_x_y' && ME.scoreHome > ME.scoreAway && ME.scoreAway >= 2) return [ME.scoreHome, ME.scoreAway];
    return [3, 2];
  };
  const placar = (ctx, S, gc, gf, muda, mk, k = 1, min) =>
    A.placar(ctx, S, { casa: 'TIME Z', fora: 'TIME X', gc, gf, corC: '#38bdf8', corF: '#dc2626', muda, mk, k, min, direita: true });

  // ---------------------------------------------------------------- comum
  const base = {
    musica: 'tension',
    tema: 'bluelock_bunker',
    grao: 0.05,
    vinheta: 0.5,
    cores: { BAROU: BAROU_COR },
    cenario(K) {
      KK = K;
      K.sky('#0b1636', '#1e3a8a', 0.4);
    }
  };
  // sombras compridas dos refletores (quem está no quadro)
  const sombras = (K, pts, a = 0.26) => pts.forEach((p) => A.sombra(K, p[0], p[1], a));

  // ======================================================================== DERROTA
  R(
    'barou_king',
    Object.assign({}, base, {
      titulo: 'O REI',
      planos: [
        {
          id: 'lance1',
          dur: 300,
          // do alto (uns 40°), o campo quase inteiro: o Rei entra pela esquerda
          cam: { de: [[47.6, 4.4, 15.8], [53.9, 0.0, 17.0], 46], para: [[47.4, 4.3, 16.6], [54.0, 0.0, 17.6], 46], curva: 'easeIO' },
          atores: [
            barouAtor(L1),
            ...D1.map((d) => caido(d)),
            iemon(L1, 1, { fim: 'idle' }),
            { quem: 'you', extra: Z, x: 52.2, y: 12.6, olha: (t) => trilha(L1.kf, t), anim: 'idle' },
            { quem: 'bachira', extra: Z, x: 54.6, y: 12.0, olha: (t) => trilha(L1.kf, t) },
            { quem: 'raichi', extra: Object.assign({ angry: true }, Z), x: 51.4, y: 13.6, olha: (t) => trilha(L1.kf, t) },
            { quem: 'kunigami', extra: Z, x: 55.4, y: 14.2, olha: (t) => trilha(L1.kf, t) },
            ...timeX([53, 16])
          ],
          cena(K, S, st) {
            bolaLance(K, L1, S.t, st);
            sombras(K, [trilha(L1.kf, S.t), [52.2, 12.6], [54.6, 12.0]]);
          },
          falas: [{ em: 40, quem: 'SHOUEI BAROU', texto: '"Saiam da frente!"', tipo: 'grito' }],
          letreiros: [{ em: 8, ate: 170, sai: 20, texto: 'BLUE LOCK • PRÉDIO 5 • A ESTREIA', cor: '#22d3ee' }],
          sons: [
            { em: 98, som: 'carrinho' },
            { em: 180, som: 'carrinho' },
            { em: L1.chute, som: 'chute', arg: 0.9 },
            { em: L1.gol, som: 'gol', arg: false }
          ],
          sobre(ctx, S, K, st) {
            A.refletores(ctx, S, K, 0.6);
            if (S.t >= L1.chute) A.rastro(ctx, st.bola0, st.bola, '254,202,202', 0.6 * (1 - seg(S.t, L1.gol, L1.gol + 6)), 8);
            placar(ctx, S, 0, S.t >= L1.gol ? 1 : 0, 'fora', seg(S.t, L1.gol, L1.gol + 40), seg(S.t, 6, 26));
          }
        },
        {
          id: 'lance2',
          dur: 240,
          cam: { de: [[47.7, 4.0, 16.9], [53.9, 0.0, 17.4], 44], para: [[47.9, 4.0, 16.5], [54.0, 0.0, 17.7], 44], curva: 'easeIO' },
          atores: [
            barouAtor(L2),
            ...D2.map((d) => caido(d)),
            ...SENTADOS1.map(([q, p]) => sentado(q, p, [46.6, 16.2])),
            iemon(L2, -1, { fim: 'idle' }),
            { quem: 'you', extra: Z, x: 52.5, y: 13.6, olha: (t) => trilha(L2.kf, t) },
            { quem: 'bachira', extra: Z, x: 54.6, y: 13.3, olha: (t) => trilha(L2.kf, t) }
          ],
          cena(K, S, st) {
            bolaLance(K, L2, S.t, st);
            sombras(K, [trilha(L2.kf, S.t), [52.3, 12.9], [54.7, 12.5]]);
          },
          falas: [{ em: 30, quem: 'SHOUEI BAROU', texto: '"Hmph. Plebeus."' }],
          sons: [
            { em: 76, som: 'carrinho' },
            { em: 120, som: 'carrinho' },
            { em: L2.chute, som: 'chute', arg: 0.9 },
            { em: L2.gol, som: 'gol', arg: false }
          ],
          sobre(ctx, S, K, st) {
            A.refletores(ctx, S, K, 0.6);
            if (S.t >= L2.chute) A.rastro(ctx, st.bola0, st.bola, '254,202,202', 0.6 * (1 - seg(S.t, L2.gol, L2.gol + 6)), 8);
            placar(ctx, S, 0, S.t >= L2.gol ? 2 : 1, 'fora', seg(S.t, L2.gol, L2.gol + 40));
          }
        },
        {
          id: 'lance3',
          dur: 180,
          // mais perto e mais baixo: o último de pé
          cam: { de: [[48.3, 3.4, 17.2], [53.8, 0.0, 17.4], 42], para: [[48.5, 3.3, 17.6], [53.9, 0.0, 17.8], 41], curva: 'easeIO' },
          atores: [
            barouAtor(L3),
            caido({ quem: 'bachira', p: [53.15, 15.4], bote: [26, 44], botePara: [53.1, 14.9], cai: 46, senta: BACH_SENTA, olha: [53.3, 19], cam: [46.9, 16.5] }),
            // você: vai no Rei, ele corta, você senta sem encostar na bola
            caido({ quem: 'you', p: [53.05, 17.45], bote: [74, 88], botePara: [53.25, 17.25], cai: 90, senta: VOCE_SENTA, olha: (t) => trilha(L3.kf, t), cam: [46.9, 16.5], sentado: true }),
            ...SENTADOS2.map(([q, p]) => sentado(q, p, [46.9, 16.5])),
            iemon(L3, 1)
          ],
          cena(K, S, st) {
            bolaLance(K, L3, S.t, st);
            sombras(K, [trilha(L3.kf, S.t)]);
          },
          falas: [{ em: 6, quem: 'SHOUEI BAROU', texto: '"É só isso, Time Z?"' }],
          efeitos: [
            // o pico: o 3º gol, o pé do Rei na bola
            { tipo: 'impacto', em: L3.chute, ate: L3.chute + 2 },
            { tipo: 'tremor', em: L3.chute, ate: L3.chute + 24, forca: 0.5, amp: 0.05 },
            { tipo: 'linhas', modo: 'radial', em: L3.chute, ate: L3.chute + 8, alvo: 'pe', forca: 0.3, cor: '#fee2e2' }
          ],
          sons: [
            { em: 46, som: 'carrinho' },
            { em: 90, som: 'carrinho' },
            { em: L3.chute, som: 'chute', arg: 1 },
            { em: L3.gol, som: 'gol', arg: false }
          ],
          sobre(ctx, S, K, st) {
            A.refletores(ctx, S, K, 0.6);
            if (S.t >= L3.chute) A.rastro(ctx, st.bola0, st.bola, '254,202,202', 0.7 * (1 - seg(S.t, L3.gol, L3.gol + 6)), 9);
            placar(ctx, S, 0, S.t >= L3.gol ? 3 : 2, 'fora', seg(S.t, L3.gol, L3.gol + 40));
          }
        },
        {
          id: 'passa',
          dur: 260,
          // de lado e mais perto: o Rei volta para o meio e passa por você, sentado
          cam: { de: [[49.5, 1.75, 19.0], [52.9, 0.42, 17.7], 42], para: [[49.7, 1.7, 18.4], [52.9, 0.42, 17.5], 39], curva: 'easeIO' },
          atores: [
            {
              quem: 'barou',
              extra: XA,
              x: (t) => trilha([[0, 53.45, 19.5], [60, 53.25, 18.25], [170, 53.25, 18.2], [260, 53.05, 16.0]], t)[0],
              y: (t) => trilha([[0, 53.45, 19.5], [60, 53.25, 18.25], [170, 53.25, 18.2], [260, 53.05, 16.0]], t)[1],
              anim: (t) => (t < 60 || t > 170 ? 'walk' : 'idle'),
              frame: (t) => (t < 60 || t > 170 ? passo(t, 7) : undefined),
              olha: (t) => (t < 60 ? [53.1, 16] : t < 170 ? VOCE_SENTA : [53, 12])
            },
            { quem: 'you', extra: Z, x: VOCE_SENTA[0], y: VOCE_SENTA[1], anim: 'sit_floor', olha: deFrente(VOCE_SENTA, [49.6, 18.7], 0.5), luz: VOCE_CAIDO },
            sentado('kunigami', [54.5, 19.3], [49.6, 18.7])
          ],
          cena(K, S) {
            sombras(K, [[VOCE_SENTA[0], VOCE_SENTA[1]]], 0.3);
          },
          falas: [{ em: 64, quem: 'SHOUEI BAROU', texto: '"Você não tem talento nenhum. Some do meu campo."' }],
          sobre(ctx, S, K) {
            A.refletores(ctx, S, K, 0.5);
            placar(ctx, S, 0, 3);
          }
        },
        {
          id: 'caidos',
          dur: 320,
          // a grua sobe: o Rei vai embora e sai do quadro; o campo cheio de caídos e você
          // sentado sozinho no meio deles
          cam: { de: [[49.6, 1.9, 18.6], [52.9, 0.4, 17.6], 42], para: [[47.8, 4.3, 17.7], [53.4, 0.0, 17.5], 48], curva: 'easeIO' },
          atores: [
            { quem: 'barou', extra: X, de: [53.05, 16.0], para: [53.3, 10.4], anim: 'walk', passo: 7, olha: [53.3, 8] },
            { quem: 'you', extra: Z, x: VOCE_SENTA[0], y: VOCE_SENTA[1], anim: 'sit_floor', olha: deFrente(VOCE_SENTA, [47.8, 17.7], 0.15), luz: VOCE_CAIDO },
            sentado('bachira', BACH_SENTA, [47.5, 17]),
            ...SENTADOS2.map(([q, p]) => sentado(q, p, [47.5, 17])),
            sentado('iemon', [53.4, GS - 0.75], [47.5, 17], {})
          ],
          falas: [
            { em: 30, ate: 170, quem: 'you', texto: '(Eu nem encostei na bola.)', tipo: 'pensamento' },
            { em: 176, quem: 'you', texto: '(Então essa é a distância...)', tipo: 'pensamento' }
          ],
          efeitos: [{ tipo: 'cor', em: 0, ate: 320, de: '#1e3a8a', para: '#1e3a8a', forca: (t) => 0.3 * seg(t, 60, 260) }],
          letreiros: [{ em: 200, texto: 'FIM DE JOGO', cor: '#94a3b8' }],
          sobre(ctx, S, K) {
            A.refletores(ctx, S, K, 0.7);
            placar(ctx, S, 0, 3);
          }
        }
      ]
    })
  );

  // ======================================================================== VITÓRIA
  // o 3º lance da vitória: o Rei vem, o Bachira cai... e você rouba
  const L3V = {
    kf: [[0, 53.2, 12.2], [30, 53.3, 14.3], [46, 52.7, 15.3], [74, 52.85, 16.7]],
    arma: 999,
    chute: 999,
    gol: 999,
    alvo: [53, GS, 0.5]
  };
  const ROUBO = 80; // o seu carrinho na bola
  const VOCE_V = [53.1, 17.35];
  // o seu chute (plano 4): você conduz para o norte e bate no canto
  const MEU = { kf: [[0, 53.15, 14.3], [64, 53.0, 11.6]], chute: 70, gol: 90, alvo: [52.42, GN - 0.02, 0.6] };
  const SENTADOS3 = SENTADOS2.concat([['bachira', BACH_SENTA]]);

  R(
    'barou_king_win',
    Object.assign({}, base, {
      titulo: 'O REI (A VIRADA)',
      planos: [
        {
          id: 'lance1',
          dur: 260,
          // mais baixo que na derrota (uns 30°) e você perto da câmera, de pé, lendo o Rei
          cam: { de: [[48.0, 2.7, 14.6], [53.7, 0.45, 16.6], 48], para: [[48.2, 2.7, 15.8], [53.8, 0.45, 18.0], 46], curva: 'easeIO' },
          tempoLance: 300 / 260,
          atores: [
            barouAtor(L1),
            ...D1.map((d) => caido(d)),
            iemon(L1, 1, { fim: 'idle' }),
            // você, à esquerda e perto, de perfil: não tira os olhos do Rei
            { quem: 'you', extra: Z, de: [55.0, 14.2], para: [55.2, 15.6], anim: (t) => (t > 90 && t < 230 ? 'andar' : 'idle'), em: 90, ate: 230, olha: (t) => trilha(L1.kf, t), luz: [1.08, 1.08, 1.08] },
            { quem: 'bachira', extra: Z, x: 54.6, y: 12.0, olha: (t) => trilha(L1.kf, t) },
            ...timeX([53, 16])
          ].map((a) => Object.assign({ tempo: (t) => t * (300 / 260) }, a)),
          cena(K, S, st) {
            bolaLance(K, L1, S.t * (300 / 260), st);
            sombras(K, [trilha(L1.kf, S.t * (300 / 260))]);
          },
          falas: [{ em: 34, quem: 'SHOUEI BAROU', texto: '"Saiam da frente!"', tipo: 'grito' }],
          letreiros: [{ em: 8, ate: 160, sai: 20, texto: 'BLUE LOCK • PRÉDIO 5 • A ESTREIA', cor: '#22d3ee' }],
          sons: [
            { em: 85, som: 'carrinho' },
            { em: 156, som: 'carrinho' },
            { em: 192, som: 'chute', arg: 0.9 },
            { em: 208, som: 'gol', arg: false }
          ],
          sobre(ctx, S, K, st) {
            A.refletores(ctx, S, K, 0.6);
            if (S.t * (300 / 260) >= L1.chute) A.rastro(ctx, st.bola0, st.bola, '254,202,202', 0.6 * (1 - seg(S.t * (300 / 260), L1.gol, L1.gol + 6)), 8);
          }
        },
        {
          id: 'lance2',
          dur: 200,
          cam: { de: [[48.0, 2.6, 16.6], [53.7, 0.45, 17.6], 46], para: [[48.2, 2.6, 17.4], [53.8, 0.45, 18.4], 45], curva: 'easeIO' },
          atores: [
            barouAtor(L2),
            ...D2.map((d) => caido(d)),
            ...SENTADOS1.map(([q, p]) => sentado(q, p, [46.6, 16.2])),
            iemon(L2, -1, { fim: 'idle' }),
            // você acompanha o Rei por fora, sem tirar os olhos dele
            // você acompanha o Rei pelo outro lado do campo, sem tirar os olhos dele
            { quem: 'you', extra: Z, de: [55.1, 13.9], para: [55.3, 17.0], anim: 'correr', passo: 4, ate: 170, olha: (t) => trilha(L2.kf, t) },
            ...timeX([53, 17])
          ].map((a) => Object.assign({ tempo: (t) => t * (240 / 200) }, a)),
          cena(K, S, st) {
            bolaLance(K, L2, S.t * 1.2, st);
            sombras(K, [trilha(L2.kf, S.t * 1.2)]);
          },
          falas: [{ em: 24, quem: 'SHOUEI BAROU', texto: '"Hmph. Plebeus."' }],
          sons: [
            { em: 63, som: 'carrinho' },
            { em: 100, som: 'carrinho' },
            { em: 140, som: 'chute', arg: 0.9 },
            { em: 153, som: 'gol', arg: false }
          ],
          sobre(ctx, S, K, st) {
            A.refletores(ctx, S, K, 0.6);
            if (S.t * 1.2 >= L2.chute) A.rastro(ctx, st.bola0, st.bola, '254,202,202', 0.6 * (1 - seg(S.t * 1.2, L2.gol, L2.gol + 6)), 8);
          }
        },
        {
          id: 'roubo',
          dur: 220,
          // mais perto, quase na altura deles; câmera lenta curta no carrinho
          lento: { em: 62, ate: 122, fator: 0.3, rampa: 12 },
          cam: { de: [[49.8, 1.5, 17.9], [53.0, 0.45, 16.5], 42], para: [[50.0, 1.45, 17.2], [53.0, 0.45, 15.8], 42], curva: 'easeIO' },
          atores: [
            // o Rei vem; você entra de carrinho na bola; ele tropeça e fica de pé, parado
            {
              quem: 'barou',
              extra: X,
              x: (t) => (t < ROUBO + 4 ? trilha(L3V.kf, t)[0] : lerp(52.85, 53.0, seg(t, ROUBO + 4, ROUBO + 24))),
              y: (t) => (t < ROUBO + 4 ? trilha(L3V.kf, t)[1] : lerp(16.85, 17.45, R.curvas.ease(seg(t, ROUBO + 4, ROUBO + 24)))),
              anim: (t) => (t < ROUBO + 4 ? 'run' : t < ROUBO + 30 ? 'hurt' : 'idle'),
              frame: (t) => (t < ROUBO + 4 ? passo(t, 3) : undefined),
              olha: (t) => (t < ROUBO + 30 ? [53, GS] : [53.1, 13.0])
            },
            caido({ quem: 'bachira', p: [53.15, 15.4], bote: [26, 44], botePara: [53.1, 14.9], cai: 46, senta: BACH_SENTA, olha: [53.1, 17], cam: [49.8, 17.6] }),
            {
              quem: 'you',
              extra: Z,
              x: (t) => (t < ROUBO - 10 ? VOCE_V[0] : t < ROUBO + 30 ? lerp(VOCE_V[0], 52.95, seg(t, ROUBO - 10, ROUBO + 6)) : trilha([[ROUBO + 30, 52.95, 16.9], [220, 53.15, 14.3]], t)[0]),
              y: (t) => (t < ROUBO - 10 ? VOCE_V[1] : t < ROUBO + 30 ? lerp(VOCE_V[1], 16.95, seg(t, ROUBO - 10, ROUBO + 6)) : trilha([[ROUBO + 30, 52.95, 16.9], [220, 53.15, 14.3]], t)[1]),
              anim: (t) => (t < ROUBO - 10 ? 'idle' : t < ROUBO + 30 ? 'slide' : 'run'),
              frame: (t) => (t >= ROUBO + 30 ? passo(t, 3) : undefined),
              opts: (t) => (t >= ROUBO - 10 && t < ROUBO + 30 ? { animTime: Math.min(40, (t - ROUBO + 10) * 1.3) } : undefined),
              olha: (t) => (t < ROUBO + 30 ? trilha(L3V.kf, Math.min(t, ROUBO)) : [53.1, 11])
            },
            // (só os caídos que cabem no quadro: nada cortado na borda)
            sentado('kuon', [52.8, 15.75], [49.8, 17.6]),
            sentado('raichi', [54.6, 16.25], [49.8, 17.6])
          ],
          cena(K, S, st) {
            const t = S.A;
            let b;
            if (t < ROUBO) {
              const p = trilha(L3V.kf, t);
              const d = frente(L3V.kf, t) || [0, 1];
              b = [p[0] + d[0] * 0.3, p[1] + d[1] * 0.3, 0.05 + Math.abs(Math.sin(t * 0.32)) * 0.05];
            } else if (t < ROUBO + 30) b = [lerp(52.9, 52.92, seg(t, ROUBO, ROUBO + 30)), lerp(16.95, 16.6, seg(t, ROUBO, ROUBO + 30)), 0.06];
            else {
              const p = trilha([[ROUBO + 30, 52.95, 16.9], [220, 53.15, 14.3]], t);
              b = [p[0] + 0.02, p[1] - 0.3, 0.05 + Math.abs(Math.sin(t * 0.32)) * 0.05];
            }
            K.ball(b[0], b[1], b[2]);
          },
          sons: [
            { em: 46, som: 'carrinho' },
            { em: 108, som: 'carrinho' }
          ],
          sobre(ctx, S, K) {
            A.refletores(ctx, S, K, 0.6);
            const [gc, gf] = placarFinal();
            placar(ctx, S, gc - 1, gf, null, 1, seg(S.t, 4, 24), "89'");
          }
        },
        {
          id: 'chute',
          dur: 220,
          // a direção vira: agora quem ataca é você, da direita para a esquerda, no gol norte
          cam: { de: [[48.6, 1.9, 12.4], [52.9, 0.45, 10.6], 46], para: [[48.4, 1.9, 11.4], [52.7, 0.45, 9.4], 46], curva: 'easeIO' },
          atores: [
            {
              quem: 'you',
              extra: Z,
              x: (t) => trilha(MEU.kf, t)[0],
              y: (t) => trilha(MEU.kf, t)[1],
              anim: (t) => (t < MEU.chute - 8 ? 'run' : t < MEU.chute ? 'windup' : t < MEU.chute + 50 ? 'shoot' : 'idle'),
              frame: (t) => (t < MEU.chute - 8 ? passo(t, 3) : t < MEU.chute + 50 ? 1 : undefined),
              olha: (t) => (t < MEU.chute + 50 ? [MEU.alvo[0], MEU.alvo[1]] : [53.1, 14])
            },
            { quem: 'barou', extra: X, de: [53.1, 15.6], para: [53.15, 12.9], ate: 110, anim: (t) => (t < 110 ? 'run' : 'idle'), frame: (t) => (t < 110 ? passo(t, 3) : undefined), olha: (t) => (t < 110 ? [53, 10] : [MEU.alvo[0], MEU.alvo[1]]) },
            {
              quem: 'gk_teamx',
              x: (t) => lerp(53.0, 53.75, suave(seg(t, MEU.chute + 2, MEU.chute + 18))),
              y: GN + 0.45,
              z: (t) => Math.sin(seg(t, MEU.chute + 2, MEU.chute + 22) * Math.PI) * 0.24,
              anim: (t) => (t < MEU.chute + 2 ? 'idle' : t < MEU.chute + 40 ? 'dive' : 'sit_floor'),
              opts: (t) => (t >= MEU.chute + 2 && t < MEU.chute + 40 ? { animTime: Math.min(30, (t - MEU.chute - 2) * 1.4) } : undefined),
              olha: [53, 12]
            },
            { quem: 'gen_teamx_b', de: [54.2, 9.6], para: [53.6, 10.3], ate: 70, anim: (t) => (t < 70 ? 'run' : 'idle'), frame: (t) => (t < 70 ? passo(t, 3) : undefined), olha: [53, 11] }
          ],
          cena(K, S, st) {
            const t = S.t;
            let b;
            if (t < MEU.chute) {
              const p = trilha(MEU.kf, t);
              b = [p[0] - 0.02, p[1] - 0.3, 0.05 + Math.abs(Math.sin(t * 0.32)) * 0.05];
            } else {
              const p = trilha(MEU.kf, MEU.chute);
              const b0 = [p[0] - 0.02, p[1] - 0.3, 0.06];
              const q = seg(t, MEU.chute, MEU.gol);
              if (q < 1) {
                b = R.mix(b0, MEU.alvo, q);
                b[2] += Math.sin(q * Math.PI) * 0.15;
                const ba = R.mix(b0, MEU.alvo, Math.max(0, q - 0.3));
                st.bola0 = R.ponto(ba[0], ba[1], ba[2]);
              } else {
                const u = t - MEU.gol;
                b = [MEU.alvo[0], MEU.alvo[1] - Math.min(0.42, u * 0.04), Math.max(0.08, MEU.alvo[2] - u * 0.02)];
              }
              st.pe = R.ponto(b0[0], b0[1], 0.12);
            }
            K.ball(b[0], b[1], b[2]);
            st.bola = R.ponto(b[0], b[1], b[2]);
            sombras(K, [trilha(MEU.kf, t)]);
          },
          efeitos: [
            // o pico da vitória: o SEU chute
            { tipo: 'impacto', em: MEU.chute, ate: MEU.chute + 2 },
            { tipo: 'tremor', em: MEU.chute, ate: MEU.chute + 24, forca: 0.5, amp: 0.05 },
            { tipo: 'linhas', modo: 'radial', em: MEU.chute, ate: MEU.chute + 8, alvo: 'pe', forca: 0.32, cor: '#ccfbf1' }
          ],
          sons: [
            { em: MEU.chute, som: 'chute', arg: 1 },
            { em: MEU.gol, som: 'gol', arg: true }
          ],
          sobre(ctx, S, K, st) {
            A.refletores(ctx, S, K, 0.7);
            if (S.t >= MEU.chute) A.rastro(ctx, st.bola0, st.bola, '0,245,212', 0.8 * (1 - seg(S.t, MEU.gol, MEU.gol + 6)), 10);
            const [gc, gf] = placarFinal();
            placar(ctx, S, S.t >= MEU.gol ? gc : gc - 1, gf, 'casa', seg(S.t, MEU.gol, MEU.gol + 40));
          }
        },
        {
          id: 'odio',
          dur: 240,
          // o Rei se vira: de frente para ele, do seu lado do campo
          cam: { de: [[50.8, 1.75, 10.5], [53.1, 0.5, 12.95], 40], para: [[51.0, 1.7, 10.8], [53.1, 0.52, 12.95], 37], curva: 'easeIO' },
          atores: [
            { quem: 'barou', extra: (t) => (t > 40 ? XA : X), x: 53.15, y: 12.9, olha: (t) => (t < 40 ? [52.4, 7] : [53.0, 10.6]) },
            ...SENTADOS3.map(([q, p]) => sentado(q, p, [51.0, 10.7])),
            sentado('gen_teamx_a', [51.7, 14.4], [51.0, 10.7], {}),
            sentado('gen_teamx_c', [54.6, 14.3], [51.0, 10.7], {})
          ],
          cena(K) {
            sombras(K, [[53.15, 12.9]], 0.3);
          },
          falas: [{ em: 46, quem: 'SHOUEI BAROU', texto: '"Sorte de principiante."' }],
          sobre(ctx, S, K) {
            A.refletores(ctx, S, K, 0.6);
            const [gc, gf] = placarFinal();
            placar(ctx, S, gc, gf);
          }
        },
        {
          id: 'dois',
          dur: 320,
          // só vocês dois de pé no meio dos caídos; a grua sobe
          // (de perfil: você à esquerda, o Rei à direita, os caídos em volta)
          cam: { de: [[49.5, 1.8, 17.25], [53.3, 0.35, 17.2], 42], para: [[48.5, 3.6, 17.25], [53.35, 0.0, 17.2], 46], curva: 'easeIO' },
          atores: [
            { quem: 'you', extra: Z, x: 53.3, y: 16.55, olha: [53.3, 17.9], luz: [1.1, 1.1, 1.12] },
            { quem: 'barou', extra: XA, x: 53.3, y: 17.85, olha: [53.3, 16.5], luz: [1.12, 1.05, 1.02] },
            // os caídos em roda, perto dos dois (depois do apito ninguém se levantou)
            ...[['bachira', [52.5, 15.55]], ['kuon', [52.3, 18.55]], ['igarashi', [54.45, 18.8]], ['raichi', [54.55, 15.6]], ['kunigami', [53.45, 19.7]]].map(([q, p]) => sentado(q, p, [48.6, 17.25])),
            // (o Time X perdeu: no chão também)
            sentado('gen_teamx_a', [52.35, 17.1], [48.6, 17.25], {}),
            sentado('gen_teamx_c', [55.0, 17.35], [48.6, 17.25], {})
          ],
          cena(K) {
            sombras(K, [[53.3, 16.55], [53.3, 17.85]], 0.34);
          },
          falas: [
            { em: 24, ate: 170, quem: 'SHOUEI BAROU', texto: '"O Rei não perde duas vezes."' },
            { em: 180, quem: 'you', texto: '(Então eu existo aqui.)', tipo: 'pensamento' }
          ],
          letreiros: [{ em: 210, texto: 'FIM DE JOGO', cor: '#94a3b8' }],
          sobre(ctx, S, K) {
            A.refletores(ctx, S, K, 0.7);
            const [gc, gf] = placarFinal();
            placar(ctx, S, gc, gf);
          }
        }
      ]
    })
  );
})();
