// ============================================================================
// 11 · scripted_shot — o gol garantido do roteiro, como TRANSMISSÃO DE TV
// Conceito A do lote 1 (docs/cenas/CONCEITOS_LOTE1.md), regras em CUTSCENE_STYLE.md.
// Assinatura: o gol contado como a TV conta. Ao vivo, de cima e de lado, com o placar e o
// minuto no canto; logo depois o REPLAY de outro ângulo, baixo e em câmera lenta (o pico:
// o quadro de impacto no contato do replay); e de volta ao vivo para o placar mudar.
// Toca dentro de qualquer partida (quem marca pode ser você, um companheiro ou o rival):
// tudo vem do CE.ptdShotCfg() que a partida monta (js/match_engine.js, playScriptedGoal):
//   { shooter, shooterName, defender, keeper, team: 'home'|'away', skillName, weaponName,
//     skillColor, homeBefore, awayBefore, homeAfter, awayAfter, minute, homeLabel, awayLabel }
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

  // ---------------------------------------------------------------- quem está no lance
  const cfg = () => CE.ptdShotCfg();
  const fora = () => cfg().team === 'away';
  // a cor de quem chuta: a da tabela (CUTSCENE_STYLE §1.2) ou, se não estiver lá, a da arma
  function corDoChutador() {
    const c = cfg();
    const nome = String(c.shooterName || '').toUpperCase();
    const ME = window.MatchEngine;
    const voce = c.shooter && ME && ME.playerEntity && c.shooter === ME.playerEntity.charData;
    if (voce || nome === CE.cinePlayerName()) return R.cores['VOCÊ'];
    const tab = R.corDe(nome);
    return tab !== '#e2e8f0' ? tab : c.skillColor || '#e2e8f0';
  }
  const golpe = () => String(cfg().skillName || 'Chute').replace(/\s*\(.*\)\s*$/, '');

  // ---------------------------------------------------------------- o campo
  // O time da casa ataca o gol norte (y 6,6); o rival, o sul (y 22,4). u = de lado (x),
  // d = distância da linha do gol atacado. A câmera de TV fica sempre no mesmo lado (leste).
  const GX = 53;
  const P = (u, d, z = 0) => (fora() ? [GX + u, 22.4 - d, z] : [GX + u, 6.6 + d, z]);
  // câmera com pontos [x, y, z] → K.cam([x, z, y])
  const cam = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  const ator = (K, cd, p, o) => {
    if (cd && typeof cd === 'object' && !cd.name) cd = Object.assign({}, cd, { name: '_' + (o.id || '') });
    return K.actor(cd, Object.assign({ x: p[0], y: p[1], z: p[2] || 0 }, o));
  };
  const corre = (f, passo = 3) => 1 + (Math.floor(f / passo) % 4) * 4;

  // ---------------------------------------------------------------- o lance (ao vivo)
  const KT = 118; // o chute ao vivo
  const NET = 22; // quadros da bola até a rede
  const CANTO = [0.74, -0.08, 0.82]; // onde a bola entra (u, d, z): ângulo longe do goleiro
  const SLIDE = 60; // o carrinho
  // o chutador: arranca de longe, pula o carrinho e arma o chute na entrada da área
  function chutador(t) {
    const k = ease(seg(t, 0, KT - 10));
    const u = lerp(-1.35, -0.42, k);
    const d = lerp(11.2, 5.55, k);
    const pulo = t > SLIDE + 4 && t < SLIDE + 24 ? Math.sin(((t - SLIDE - 4) / 20) * Math.PI) * 0.22 : 0;
    return [u, d, pulo];
  }
  const bolaVoo = (q) => {
    const a = [-0.38, 5.2, 0.08];
    return [lerp(a[0], CANTO[0], q), lerp(a[1], CANTO[1], q), lerp(a[2], CANTO[2], Math.sin(clamp(q) * Math.PI * 0.5)) + Math.sin(q * Math.PI) * 0.18];
  };
  function bolaAoVivo(t) {
    if (t < KT) {
      const s = chutador(t);
      // colada no pé, um toque a cada passada
      const toque = Math.abs(Math.sin(t * 0.21)) * 0.16;
      return [s[0] + 0.06, s[1] - 0.28 - toque, 0.05 + s[2] * 0.7];
    }
    const q = seg(t, KT, KT + NET);
    if (q < 1) return bolaVoo(easeIn(q) * 0.55 + q * 0.45);
    // dentro do gol: bate na rede e cai
    const u = t - KT - NET;
    return [CANTO[0] - Math.min(0.2, u * 0.01), CANTO[1] - Math.min(0.42, u * 0.03), Math.max(0.08, CANTO[2] - easeIn(seg(u, 0, 26)) * 0.74)];
  }
  // o marcador vem fechar e se joga no carrinho
  function marcador(t) {
    if (t < SLIDE) {
      const k = ease(seg(t, 0, SLIDE));
      return { p: [lerp(1.2, -0.95, k), lerp(4.6, 7.3, k), 0], anim: 'run' };
    }
    const k = ease(seg(t, SLIDE, SLIDE + 22));
    return { p: [lerp(-0.95, -1.25, k), lerp(7.3, 8.3, k), 0], anim: 'slide', hold: t > SLIDE + 22 };
  }
  // o goleiro pula atrasado para o canto
  function goleiro(t) {
    const q = seg(t, KT + 6, KT + 30);
    return { p: [lerp(0.05, 0.62, ease(q)), 0.48, Math.sin(q * Math.PI) * 0.26], q };
  }

  // o replay: câmera lenta (rampa de entrada e de saída) e a pausa de 4 quadros no contato
  // (a 2ª faixa soma 0,2 de perda à 0,8 da 1ª: o tempo da ação para)
  const HIT2_T = 104; // o contato no tempo do plano (efeitos e sons)
  const LENTO2 = [
    { em: 16, ate: 150, fator: 0.2, rampa: 16 },
    { em: HIT2_T, ate: HIT2_T + 4, fator: 0.8, rampa: 0 }
  ];
  const HIT2 = R.acao(LENTO2, HIT2_T); // o contato no tempo da ação (atores e bola)

  // ---------------------------------------------------------------- 2D: o grafismo da TV
  // placar (Jersey 10, pequeno) no canto de cima, com o minuto; o selo AO VIVO ou REPLAY
  function placar(ctx, S, hs, as, pop, popK) {
    const c = cfg();
    CE.rtPlacar(ctx, S, { hl: c.homeLabel, al: c.awayLabel, hs, as, min: c.minute, pop, popK });
  }
  function selo(ctx, S, texto, replay, k) {
    if (k <= 0) return;
    const W = S.W;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 2);
    ctx.font = (replay ? '30px' : '24px') + ' "Jersey 10", "Arial Narrow", sans-serif';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(texto).width;
    const h = replay ? 38 : 32;
    const w = tw + (replay ? 34 : 44);
    // (o selo do replay entra deslizando da direita, como o das transmissões)
    const x = W - 30 - w + (1 - ease(k)) * (w + 40);
    const y = S.top + 16;
    ctx.fillStyle = 'rgba(2,6,23,0.82)';
    ctx.fillRect(x, y, w, h);
    if (replay) {
      ctx.fillStyle = cfg().skillColor || '#00f5d4';
      ctx.fillRect(x, y, 6, h);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(texto, x + 20, y + h / 2 + 1);
    } else {
      // a bolinha vermelha pisca devagar
      ctx.fillStyle = Math.floor(S.f / 30) % 2 ? '#ef4444' : '#991b1b';
      ctx.fillRect(x + 12, y + h / 2 - 5, 10, 10);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(texto, x + 30, y + h / 2 + 1);
    }
    ctx.restore();
  }
  // o rastro da bola na cor da arma (do pé até a bola, apagando)
  function rastro(ctx, a, b, cor, k) {
    if (!a || !b || k <= 0 || !CE.luckStreak) return;
    const h = String(cor || '#00f5d4').replace('#', '');
    const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0).join(',');
    CE.luckStreak(ctx, a.x, a.y, b.x, b.y, 3, 20, rgb, 0.85 * k);
  }

  // ---------------------------------------------------------------- o roteiro
  const def = R('scripted_shot', {
    titulo: 'TRANSMISSÃO',
    musica: 'tension',
    leitura: 0.7,
    grao: 0.05,
    vinheta: 0.45,
    cenario(K) {
      K.expo(1.0);
    },
    planos: [
      // 1 · AO VIVO: a câmera alta da TV, na lateral, acompanha a arrancada e o gol
      {
        id: 'ao_vivo',
        dur: 170,
        cena(K, S, st) {
          const t = S.t;
          const c = cfg();
          const s = chutador(t);
          const chutou = t >= KT;
          ator(K, c.shooter, P(s[0], s[1], s[2]), {
            id: 'sh',
            face: chutou ? P(CANTO[0], 0) : P(s[0] + 0.1, 0),
            anim: chutou ? 'shoot' : t > KT - 10 ? 'windup' : 'run',
            frame: chutou || t > KT - 10 ? 1 : corre(S.f)
          });
          const m = marcador(t);
          ator(K, c.defender, P(m.p[0], m.p[1]), { id: 'def', face: m.anim === 'slide' ? P(-1.6, 12) : P(s[0], s[1]), anim: m.anim, frame: m.anim === 'run' ? corre(S.f + 2) : undefined, opts: m.anim === 'slide' ? { animTime: Math.min(15, (t - SLIDE) * 0.8) } : undefined });
          const g = goleiro(t);
          ator(K, c.keeper, P(g.p[0], g.p[1], g.p[2]), { id: 'gk', face: P(g.p[0], 9), anim: g.q > 0.02 ? 'dive' : 'idle', frame: g.q > 0.02 ? undefined : 0, opts: g.q > 0.02 ? { animTime: g.q * 30 } : undefined, left: !fora() });
          const b = bolaAoVivo(t);
          const bp = P(b[0], b[1], b[2]);
          K.ball(bp[0], bp[1], bp[2]);
          // a TV: alta, na lateral leste, seguindo quem conduz; no chute abre um pouco para
          // caber quem chutou e o gol no mesmo quadro
          const k = easeIO(seg(t, 0, 150));
          const abre = easeIO(seg(t, KT - 24, KT + 16));
          const segue = P(s[0] - 0.3, s[1] - 1.2, 0.3);
          const look = R.mix(segue, P(-0.1, 2.9, 0.3), abre);
          cam(K, [59.6, P(0, lerp(10.2, 6.4, k))[1], lerp(3.0, 2.8, k)], look, lerp(31, 36, abre));
          st.bola = R.ponto(bp[0], bp[1], bp[2]);
        },
        sons: [
          { em: SLIDE, som: 'carrinho' },
          { em: KT, fn: () => window.SFX?.kick?.(0.9) },
          { em: KT + NET, fn: () => (fora() ? window.SFX?.concede?.() : window.SFX?.goal?.(true)) }
        ],
        depois(ctx, S) {
          const c = cfg();
          placar(ctx, S, c.homeBefore, c.awayBefore);
          selo(ctx, S, 'AO VIVO', false, seg(S.t, 2, 12));
        }
      },
      // 2 · REPLAY: outro lado, baixo, câmera lenta; o contato é o pico (quadro de impacto)
      {
        id: 'replay',
        dur: 175,
        // a câmera lenta (rampa de entrada e de saída) e a pausa de 4 quadros no contato
        // (a 2ª faixa soma 0,2 de perda à 1ª, que já perde 0,8: o tempo da ação para)
        lento: LENTO2,
        cena(K, S, st) {
          const A = S.A;
          const c = cfg();
          const HIT = HIT2;
          const bate = A >= HIT;
          const k = ease(seg(A, 0, HIT - 6));
          const sp = [lerp(-0.62, -0.42, k), lerp(6.5, 5.55, k)];
          ator(K, c.shooter, P(sp[0], sp[1]), {
            id: 'sh',
            face: P(CANTO[0] * 0.6, 0),
            anim: bate ? 'shoot' : A > HIT - 14 ? 'windup' : 'run',
            frame: bate || A > HIT - 14 ? 1 : corre(A * 1.0, 3)
          });
          // o marcador ficou no chão do carrinho, atrás
          ator(K, c.defender, P(-1.25, 8.3), { id: 'def', face: P(-1.6, 12), anim: 'slide' });
          const gq = seg(A, HIT + 6, HIT + 30);
          ator(K, c.keeper, P(lerp(0.05, 0.62, ease(gq)), 0.48, Math.sin(gq * Math.PI) * 0.26), { id: 'gk', face: P(0, 9), anim: gq > 0.02 ? 'dive' : 'idle', frame: gq > 0.02 ? undefined : 0, opts: gq > 0.02 ? { animTime: gq * 30 } : undefined, left: !fora() });
          let b;
          if (!bate) b = [sp[0] + 0.04, sp[1] - 0.3 - (1 - k) * 0.1, 0.06];
          else b = bolaVoo(easeIn(seg(A, HIT, HIT + NET)) * 0.55 + seg(A, HIT, HIT + NET) * 0.45);
          const bp = P(b[0], b[1], b[2]);
          K.ball(bp[0], bp[1], bp[2]);
          // baixo e do outro lado (oeste): quem chuta de perfil, com espaço na frente para a
          // bola sair na direção do gol; a câmera chega devagar e vira um pouco com a bola
          const q = easeIO(seg(S.t, 0, S.dur));
          const pe = P(-0.38, 5.25, 0.15);
          const e = P(lerp(-4.4, -3.9, q), lerp(5.5, 5.25, q), lerp(0.34, 0.3, q));
          const l = R.mix(P(-0.95, 4.6, 0.44), P(-0.6, 2.6, 0.5), ease(seg(A, HIT + 2, HIT + 26)) * 0.32);
          cam(K, e, l, lerp(44, 41, q));
          st.pe = R.ponto(pe[0], pe[1], pe[2]);
          st.bola = R.ponto(bp[0], bp[1], bp[2]);
          st.bateu = bate;
          st.A = A;
        },
        falas: [
          {
            em: 66,
            tipo: 'grito',
            texto: () => `"${golpe()}!!"`,
            get nome() {
              return String(cfg().shooterName || 'VOCÊ').toUpperCase();
            },
            get cor() {
              return corDoChutador();
            }
          }
        ],
        efeitos: [
          // o replay fica um pouco mais frio que o ao vivo (sem tirar a cor)
          { tipo: 'cor', em: 0, de: '#1e3a8a', forca: 0.18 },
          { tipo: 'impacto', em: HIT2_T, ate: HIT2_T + 2 },
          { tipo: 'tremor', em: HIT2_T, ate: HIT2_T + 30, forca: 0.45, amp: 0.05 },
          { tipo: 'linhas', modo: 'radial', em: HIT2_T, ate: HIT2_T + 10, alvo: 'pe', forca: 0.4, cor: '#e0f2fe' }
        ],
        sons: [
          { em: 20, som: 'vento' },
          { em: HIT2_T, fn: () => window.SFX?.kick?.(1) }
        ],
        depois(ctx, S, K, st) {
          const c = cfg();
          if (st.bateu && st.pe && st.bola) rastro(ctx, st.pe, st.bola, c.skillColor, 1 - seg(st.A || 0, 52, 66));
          placar(ctx, S, c.homeBefore, c.awayBefore);
          selo(ctx, S, 'REPLAY', true, seg(S.t, 0, 10));
        }
      },
      // 3 · AO VIVO de novo: quem fez corre para a lateral; o placar vira
      {
        id: 'placar',
        dur: 125,
        cena(K, S) {
          const t = S.t;
          const c = cfg();
          const k = ease(seg(t, 0, 66));
          const comemora = t > 58;
          if (!fora()) {
            // a favor: quem fez corre para a lateral (para a TV) e comemora; o marcador ficou
            // ajoelhado no meio do caminho
            const sp = P(lerp(0.4, 2.5, k), lerp(2.4, 3.3, k));
            ator(K, c.shooter, sp, { id: 'sh', face: comemora ? [62, sp[1] + 0.6] : [62, sp[1] + 0.3], anim: comemora ? 'celebrate' : 'run', frame: comemora ? undefined : corre(S.f) });
            ator(K, c.defender, P(-0.9, 4.1), { id: 'def', face: P(0.2, 0), anim: 'kneel_one' });
          } else {
            // contra: quem defendia (o seu time) de joelhos na frente; o rival comemora atrás
            ator(K, c.defender, P(1.9, 4.2), { id: 'def', face: P(0.6, 0), anim: 'kneel_down' });
            const sp = P(lerp(0.1, 1.0, k), lerp(1.7, 2.1, k));
            ator(K, c.shooter, sp, { id: 'sh', face: comemora ? [62, sp[1]] : P(3, 2.4), anim: comemora ? 'celebrate' : 'run', frame: comemora ? undefined : corre(S.f) });
          }
          ator(K, c.keeper, P(0.6, 0.3), { id: 'gk', face: P(0.6, 9), anim: 'sit_floor' });
          const bp = P(0.66, -0.36);
          K.ball(bp[0], bp[1], 0.08);
          // a TV de novo, mais baixa e mais perto: quem fez, quem sofreu e o gol no fundo
          const q = easeIO(seg(t, 0, S.dur));
          cam(K, [59.7, P(0, lerp(5.3, 5.0, q))[1], lerp(1.55, 1.45, q)], P(lerp(1.5, 2.0, q), 2.95, 0.45), lerp(41, 39, q));
        },
        sons: [{ em: 16, fn: () => window.SFX?.blip?.(fora() ? 330 : 880) }],
        depois(ctx, S) {
          const c = cfg();
          const vira = S.t >= 16;
          placar(ctx, S, vira ? c.homeAfter : c.homeBefore, vira ? c.awayAfter : c.awayBefore, fora() ? 'away' : 'home', seg(S.t, 16, 34));
          selo(ctx, S, 'AO VIVO', false, 1);
        }
      }
    ]
  });
  // o título da tarja de cima: o nome de quem vai chutar (sem dar o resultado)
  Object.defineProperty(def, 'title', {
    configurable: true,
    enumerable: true,
    get() {
      return String(cfg().shooterName || '').toUpperCase();
    }
  });
})();
