// ============================================================================
// 42 · u20_celebration — "Três subidas" (CUTSCENE_STYLE §6, conceito C do lote 1)
// Cap. 14, vitória na final da Copa Sub-20 (victorySakuga): toca logo depois da 49, que já
// termina no apito. Por isso aqui não tem apito, nem placar de "FIM DE JOGO", nem título
// "CAMPEÕES": é a festa dos garotos no gramado.
// Assinatura: o arremesso em três subidas. O time te joga para cima três vezes (as mãos
// deles aparecem, ninguém levita) e a cada subida a câmera sobe um andar: o gramado, a
// arquibancada, o céu com os fogos, até ver o estádio inteiro festejando lá embaixo.
// Pico: o quadro de impacto no alto da 3ª subida (um só). A taça da Sub-20 em pixel, no 3D.
// Uma camisa 10 só: a do Sae (o Rin fica de lado, de frente, sem comemorar).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro) return;
  const R = CE.roteiro;
  const { seg, lerp, rnd, tela, brilho } = R;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

  const C0 = [53, 14.6]; // o meio do campo
  const GK = { jerseyPrimary: '#facc15', jerseySecondary: '#111827' };
  // quem te joga para cima (em roda, de frente para você): [id, ângulo na roda]
  const RODA = [['shidou', 0.2], ['bachira', 1.45], ['chigiri', 2.7], ['kunigami', 3.95], ['gagamaru', 5.2]];
  const RAIO = 0.46;
  const naRoda = (a, r = RAIO) => [C0[0] + Math.cos(a) * r, C0[1] + Math.sin(a) * r * 0.85];
  // de onde cada um vem correndo no começo
  const DE_LONGE = (a) => [C0[0] + Math.cos(a) * 4.2, C0[1] + Math.sin(a) * 3.0];
  const SAE_P = [54.25, 15.25];
  const RIN_P = [51.15, 15.7];

  const numero = () => (window.App?.state?.profile?.number || 11);
  const voce = (K, o) => K.actor('you', Object.assign({ id: 'voce', kit: 'japan', extra: { number: numero() }, k: 0.9 }, o));
  const mate = (K, id, o) => K.actor(id, Object.assign({ id: 'm_' + id, kit: id === 'gagamaru' ? undefined : 'japan', extra: id === 'gagamaru' ? GK : undefined, k: 0.9 }, o));

  // uma subida: z de você entre t0 e t0 + dur (parábola, com a altura h)
  const subida = (t, t0, dur, h) => {
    const q = (t - t0) / dur;
    return q <= 0 || q >= 1 ? 0 : h * 4 * q * (1 - q);
  };
  // a roda do time: os braços sobem no empurrão e na hora de pegar você de volta
  function roda(K, t, z, empurra, luz) {
    RODA.forEach(([id, a], i) => {
      const p = naRoda(a);
      // quando você está lá em cima, eles olham para cima e pulam de leve
      const pula = z > 0.3 ? Math.abs(Math.sin(t * 0.22 + i)) * 0.05 : 0;
      mate(K, id, { x: p[0], y: p[1], z: pula, face: C0, anim: empurra ? 'celebrate' : 'idle', frame: 0, light: luz });
    });
  }

  // a taça da Sub-20 em pixel (prata e ouro, duas alças, base preta): não é a da Copa
  const tacaCv = () =>
    tela('c42|taca', 18, 26, (g) => {
      const P = (x, y, w, h, c) => {
        g.fillStyle = c;
        g.fillRect(x, y, w, h);
      };
      P(4, 1, 10, 2, '#fde68a');
      P(3, 3, 12, 7, '#e2e8f0');
      P(4, 10, 10, 2, '#cbd5e1');
      P(5, 12, 8, 1, '#94a3b8');
      P(4, 3, 2, 7, '#f8fafc');
      P(12, 4, 2, 6, '#94a3b8');
      P(0, 4, 3, 1, '#cbd5e1');
      P(0, 4, 1, 4, '#cbd5e1');
      P(0, 8, 3, 1, '#cbd5e1');
      P(15, 4, 3, 1, '#94a3b8');
      P(17, 4, 1, 4, '#94a3b8');
      P(15, 8, 3, 1, '#94a3b8');
      P(8, 13, 2, 4, '#facc15');
      P(6, 17, 6, 2, '#ca8a04');
      P(4, 19, 10, 6, '#111827');
      P(4, 19, 10, 1, '#facc15');
      P(7, 21, 4, 2, '#1d4ed8');
    });

  // fogos em pixel (estouros de quadradinhos, nas cores do time e do ouro)
  const CORES_FOGO = ['#f8fafc', '#60a5fa', '#facc15', '#ef4444', '#93c5fd'];
  function fogos(ctx, S, t, n, a = 1, y1 = 0.45) {
    const { W, top, stageH } = S;
    const px = Math.max(3, Math.round(5 * (W / 1280)));
    ctx.save();
    for (let i = 0; i < n; i++) {
      const per = 70 + rnd(i, 3) * 40;
      const ciclo = Math.floor((t + rnd(i, 4) * per) / per);
      const u = (t + rnd(i, 4) * per) % per;
      if (u > 46) continue;
      const cx = (0.08 + rnd(i + ciclo * 7, 5) * 0.84) * W;
      const cy = top + (0.06 + rnd(i + ciclo * 7, 6) * (y1 - 0.06)) * stageH;
      const r = (u / 46) * (60 + rnd(i, 7) * 50) * (W / 1280);
      const al = clamp(a * (1 - u / 46) * 1.2);
      ctx.fillStyle = CORES_FOGO[(i + ciclo) % CORES_FOGO.length];
      ctx.globalAlpha = al;
      for (let k = 0; k < 14; k++) {
        const ang = (k / 14) * Math.PI * 2;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r + (u / 46) * (u / 46) * 20;
        ctx.fillRect(Math.round(x / px) * px, Math.round(y / px) * px, px, px);
      }
    }
    ctx.restore();
  }
  function confete(ctx, S, t, n, a = 1) {
    const { W, top, bot } = S;
    const cols = ['#f8fafc', '#60a5fa', '#facc15', '#1d4ed8', '#ef4444'];
    const px = Math.max(3, Math.round(5 * (W / 1280)));
    ctx.save();
    ctx.globalAlpha = clamp(a);
    for (let i = 0; i < n; i++) {
      const x = (rnd(i, 21) * W + Math.sin(t * 0.03 + i) * 30) % W;
      const y = top + ((rnd(i, 22) * (bot - top) + t * (1.2 + rnd(i, 23) * 1.6)) % (bot - top));
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(Math.round(x / px) * px, Math.round(y / px) * px, px, px);
    }
    ctx.restore();
  }

  // as três subidas (quadro do plano em que você sai das mãos, quanto dura, a altura)
  const S1 = { em: 150, dur: 62, h: 0.85 };
  const S2 = { em: 40, dur: 74, h: 1.3 };
  const S3 = { em: 34, dur: 120, h: 1.9 };
  const LENTO3 = { em: 66, ate: 150, fator: 0.28, rampa: 20 };
  // o quadro real do alto da 3ª subida (o tempo da ação anda devagar ali)
  const ALTO3 = (() => {
    const alvo = S3.em + S3.dur / 2;
    for (let t = 0; t < 400; t++) if (R.acao(LENTO3, t) >= alvo) return t;
    return 120;
  })();
  const L_DIA = [1.12, 1.06, 0.98];

  R('u20_celebration', {
    titulo: 'JAPÃO, CAMPEÃO DA COPA SUB-20',
    musica: 'victory',
    tema: 'worldcup_final',
    grao: 0.05,
    vinheta: 0.42,
    leitura: 0.9,
    cenario(K) {
      K.sky('#020617', '#1e1b4b', 0.7);
    },
    planos: [
      {
        // O GRAMADO: o time chega correndo, o Sae vem por último; a 1ª subida, baixinha,
        // vista da altura da grama
        id: 'gramado',
        dur: 240,
        expo: 1.04,
        cam: { de: [[53.55, 0.32, 18.9], [53.0, 0.78, 14.6], 50], para: [[53.35, 0.36, 18.3], [53.0, 0.86, 14.6], 48], curva: 'suave' },
        cena(K, S) {
          const t = S.t;
          const z = subida(t, S1.em, S1.dur, S1.h);
          RODA.forEach(([id, a], i) => {
            const k = R.curvas.ease(seg(t, 4 + i * 7, 70 + i * 7));
            const de = DE_LONGE(a);
            const p = naRoda(a);
            const x = lerp(de[0], p[0], k);
            const y = lerp(de[1], p[1], k);
            if (t >= 100) return;
            if (k < 1) mate(K, id, { x, y, face: C0, anim: 'run', frame: 1 + (Math.floor((S.f + i * 5) / 3) % 4) * 4, light: L_DIA });
            else mate(K, id, { x, y, face: C0, anim: 'celebrate', frame: 0, light: L_DIA });
          });
          if (t >= 100) roda(K, t, z, t > S1.em - 12, L_DIA);
          // o Sae chega andando e para do seu lado
          const ks = R.curvas.easeIO(seg(t, 20, 96));
          mate(K, 'sae', { x: lerp(56.4, SAE_P[0], ks), y: lerp(16.4, SAE_P[1], ks), face: [C0[0], C0[1] + 0.1], anim: ks > 0 && ks < 1 ? 'run' : 'idle', frame: ks > 0 && ks < 1 ? 1 + (Math.floor(S.f / 6) % 4) * 4 : 0, light: L_DIA });
          // o Rin de lado, sem comemorar (de frente para a câmera)
          mate(K, 'rin', { x: RIN_P[0], y: RIN_P[1], ang: Math.PI / 2 - 0.35, frame: 0, extra: { angry: true }, light: [1.0, 1.0, 1.05] });
          voce(K, { x: C0[0], y: C0[1] + 0.02, z, face: z > 0 ? [C0[0], 30] : SAE_P, anim: z > 0.05 ? 'jump' : t > 100 ? 'idle' : 'celebrate', frame: 0, light: [1.18, 1.12, 1.02] });
        },
        falas: [{ em: 92, quem: 'SAE ITOSHI', texto: '"Esse gol foi o meu passe."' }],
        sons: [{ em: S1.em, som: 'vento' }]
      },
      {
        // A ARQUIBANCADA: a câmera sobe um andar; a 2ª subida, mais alta, com a torcida atrás
        id: 'arquibancada',
        dur: 170,
        expo: 1.04,
        cam: { de: [[55.9, 1.85, 18.6], [53.0, 1.05, 14.6], 48], para: [[55.6, 2.35, 18.2], [53.0, 1.3, 14.6], 46], curva: 'suave' },
        cena(K, S) {
          const t = S.t;
          const z = subida(t, S2.em, S2.dur, S2.h);
          roda(K, t, z, t > S2.em - 14, L_DIA);
          mate(K, 'sae', { x: 54.65, y: 14.05, face: C0, frame: 0, light: L_DIA });
          voce(K, { x: C0[0], y: C0[1] + 0.02, z, face: [C0[0] + 3, 30], anim: z > 0.05 ? 'jump' : 'idle', frame: 0, light: [1.18, 1.12, 1.02] });
        },
        sobre(ctx, S) {
          confete(ctx, S, S.t + 40, 36, 0.8);
        },
        falas: [{ em: 30, quem: 'BACHIRA', texto: '"PARCEIRO!!"', tipo: 'grito' }],
        sons: [{ em: S2.em, som: 'vento' }]
      },
      {
        // O CÉU: a câmera sobe junto com você no meio dos fogos; no alto da 3ª subida, o
        // tempo quase para (câmera lenta) e cai o quadro de impacto
        id: 'ceu',
        dur: 230,
        expo: 1.06,
        lento: LENTO3,
        // (a câmera sobe junto com você: o alvo acompanha a sua altura, o olho vai até o céu)
        cam(K, t, S) {
          const A = S.A;
          const z = subida(A, S3.em, S3.dur, S3.h);
          const k = R.curvas.easeIO(seg(A, 0, S3.em + S3.dur / 2));
          return [[lerp(54.3, 53.8, k), lerp(1.9, 4.4, k), lerp(17.6, 17.4, k)], [53.0, 0.55 + z * 0.55, lerp(14.6, 14.5, k)], lerp(50, 54, k)];
        },
        cena(K, S) {
          const A = S.A;
          const z = subida(A, S3.em, S3.dur, S3.h);
          roda(K, A, z, A > S3.em - 14, L_DIA);
          voce(K, { tempo: 'acao', x: C0[0], y: C0[1] + 0.02, z, face: [C0[0], 30], anim: z > 0.05 ? 'jump' : 'idle', frame: 0, light: [1.22, 1.16, 1.06] });
        },
        sobre(ctx, S) {
          fogos(ctx, S, S.A * 1.6, 7, seg(S.t, 10, 40), 0.5);
          confete(ctx, S, S.A + 90, 40, 0.7);
        },
        efeitos: [{ tipo: 'impacto', em: ALTO3, ate: ALTO3 + 2 }],
        sons: [{ em: S3.em, som: 'vento' }, { em: ALTO3, som: 'chute', arg: 0.6 }]
      },
      {
        // A TAÇA: de volta ao chão, você ergue a taça da Sub-20 no meio do time; a câmera
        // vai mais alto e mais longe até o estádio inteiro festejar lá embaixo
        id: 'taca',
        dur: 240,
        expo: 1.06,
        // (perto da taça e depois a grua até o estádio inteiro: o último andar)
        cam: { de: [[53.4, 0.95, 17.4], [53.0, 0.8, 14.5], 50], para: [[53.4, 8.4, 24.4], [53.0, 0.4, 13.6], 56], curva: 'easeIO', em: 50, ate: 240 },
        cena(K, S, st) {
          const t = S.t;
          K.floor({ x0: C0[0] - 1.8, y0: C0[1] - 1.4, x1: C0[0] + 1.8, y1: C0[1] + 1.4, z: 0.01, img: brilho('rgba(250,224,120,0.4)'), color: '#ffffff', em: true, alpha: 0.999 });
          // o time numa fileira atrás de você (ninguém entre a câmera e a taça), pulando
          const ATRAS = [[52.15, 14.05], [52.6, 13.8], [53.4, 13.8], [53.85, 14.05], [53.0, 13.55]];
          RODA.forEach(([id], i) => {
            const p = ATRAS[i];
            mate(K, id, { x: p[0], y: p[1], z: Math.abs(Math.sin(t * 0.18 + i * 1.3)) * 0.12, face: [p[0], 30], anim: 'celebrate', frame: 0, light: L_DIA });
          });
          mate(K, 'sae', { x: 53.75, y: 14.55, face: C0, frame: 0, light: L_DIA });
          mate(K, 'rin', { x: 52.3, y: 14.8, ang: Math.PI / 2 - 0.35, frame: 0, extra: { angry: true }, light: [1.0, 1.0, 1.05] });
          voce(K, { x: C0[0], y: C0[1] + 0.02, face: [C0[0], 30], anim: 'celebrate', frame: 0, light: [1.24, 1.16, 1.04] });
          // a taça em cima das mãos erguidas
          K.sprite(tacaCv(), { x: C0[0], y: C0[1] + 0.03, z: 1.0, w: 18 / 66, h: 26 / 66, light: [1.3, 1.25, 1.1] });
          st.taca = R.ponto(C0[0], C0[1], 1.2);
        },
        sobre(ctx, S, K, st) {
          if (st.taca) CE.cineGlow(ctx, st.taca.x, st.taca.y, 60 * (S.W / 1280), 'rgba(250,224,120,0.45)', 0.9);
          fogos(ctx, S, S.t + 200, 9, 1, 0.42);
          confete(ctx, S, S.t + 150, 60, 0.9);
        },
        falas: [{ em: 70, quem: 'NARRADOR', texto: 'Da final do colégio ao topo do mundo.' }],
        letreiros: [{ em: 20, get texto() { return placar(); }, cor: '#facc15' }]
      }
    ]
  });
  // o placar da final (o mesmo da partida que acabou de tocar)
  function placar() {
    const c0 = CE.celebCfg;
    // (a festa é de vitória: um placar que não seja vitória é resto de outra partida)
    const c = c0 && c0.home > c0.away ? c0 : { home: 3, away: 2 };
    return `COPA SUB-20 • FINAL • JAPÃO ${c.home} × ${c.away} FRANÇA`;
  }
})();
