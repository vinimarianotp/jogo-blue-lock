// ============================================================================
// 31 · nel_metavision_goal — a Metavision: OS FANTASMAS DO PRÓXIMO SEGUNDO
// Conceito B do lote 1 (docs/cenas/CONCEITOS_LOTE1.md), regras em CUTSCENE_STYLE.md.
// Assinatura: o futuro em silhuetas. Com o tempo parado, cada jogador ganha a sua sombra
// do próximo segundo, na cor dele (a sua em ciano: o que todos esperam que você faça).
// O tempo volta e cada um anda até a própria sombra e a preenche; só você sai do roteiro:
// a sua sombra fica vazia e some. Do lugar que ninguém leu sai o chute (o pico: quadro de
// impacto), a bola entra e o telão da BLTV mostra o seu valor de verdade.
// Toca na NEL, no seu 1º gol do 1º jogo do turno (chapter.firstGoalSakuga). O elenco é o da
// partida que está rolando: você e o companheiro que passa são do seu clube; os três que
// leem o lance e o goleiro são do rival da rodada (quem marca = o melhor deles). O Kaiser
// só aparece se estiver em campo. O placar e os nomes são os do jogo; o valor do telão é o
// seu valor no ranking da liga (App.lgState().values.you).
// Substitui o registro antigo de js/cine3d_partida.js (este arquivo carrega depois).
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
  const YOU = R.cores['VOCÊ'];
  // a cor do Kaiser (não está na tabela da §1.2: fica registrada aqui e no relatório)
  const KAISER = '#818cf8';

  // ---------------------------------------------------------------- quem está em campo
  const rgbDe = (c) => {
    const h = String(c || '#888888').replace('#', '');
    const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0);
  };
  const brilhoDe = (c) => {
    const [r, g, b] = rgbDe(c);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  // a cor da sombra de cada time: a mais viva das duas cores da camisa (uma camisa preta
  // ou azul-marinho viraria uma mancha escura no gramado)
  function corDoTime(p, s) {
    const a = brilhoDe(p);
    const b = brilhoDe(s);
    let c = a >= b ? p : s;
    if (Math.max(a, b) < 40) c = '#f8fafc';
    return c;
  }
  let ELENCO = null;
  function elenco() {
    if (ELENCO && ELENCO.run === CE._cineRun) return ELENCO;
    const ME = window.MatchEngine;
    const App = window.App;
    const ch = (ME && ME.chapter) || (App && App.getChapter && App.getChapter()) || {};
    const live = !!(ME && ME.active && ME.playerEntity && Array.isArray(ME.entities));
    const clube = window.NEL_CLUBS && App && App.state ? window.NEL_CLUBS[App.state.nelClub] : null;
    const kitCasa = clube ? { jerseyPrimary: clube.color, jerseySecondary: clube.secondary } : ch.homeColor ? { jerseyPrimary: ch.homeColor, jerseySecondary: ch.homeSecondary } : { jerseyPrimary: '#0f2942', jerseySecondary: '#ef4444' };
    const kitRival = ch.opponentColor ? { jerseyPrimary: ch.opponentColor, jerseySecondary: ch.opponentSecondary || '#ffffff' } : { jerseyPrimary: '#1e1b4b', jerseySecondary: '#a855f7' };
    const porOvr = (a, b) => ((b.charData && b.charData.ovr) || 0) - ((a.charData && a.charData.ovr) || 0);
    let you;
    let passa;
    let rivais = [];
    let goleiro;
    if (live) {
      you = Object.assign({}, ME.playerEntity.charData);
      const comp = ME.entities.filter((e) => e.team === 'home' && !e.isGK && e !== ME.playerEntity && e.charData).sort(porOvr);
      passa = comp[0] && comp[0].charData;
      rivais = ME.entities.filter((e) => e.team === 'away' && !e.isGK && e.charData).sort(porOvr).slice(0, 3).map((e) => e.charData);
      const gk = ME.entities.find((e) => e.team === 'away' && e.isGK);
      goleiro = gk && gk.charData;
    }
    if (!you) you = CE.cineYou(kitCasa);
    if (!passa) {
      const id = (ch.teammateIds || [])[0];
      passa = id ? CE.cineChar(id, kitCasa) : Object.assign({}, CE.cineChar('hiori'), kitCasa);
    }
    if (rivais.length < 3) {
      const ids = (ch.opponentIds || []).filter((id) => !/^gk_/.test(id));
      const extra = ids.map((id) => CE.cineChar(id, kitRival)).filter((c) => c && c.name);
      // (o melhor do rival marca você)
      extra.sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
      rivais = rivais.concat(extra).slice(0, 3);
      while (rivais.length < 3) rivais.push(Object.assign({ name: 'Rival ' + rivais.length, hairStyle: 'short_sharp', hairColor: '#1f2937', skinColor: '#e8c4a8' }, kitRival));
    }
    if (!goleiro) goleiro = Object.assign({}, CE.cineChar('fukaku'), kitRival);
    // o placar: o seu gol já entrou na partida quando a cena começa (antes = um a menos)
    const labels = ch.scoreLabels || { home: clube ? clube.name : 'VOCÊ', away: ch.opponentName || 'RIVAL' };
    let hs = live ? ME.scoreHome : 1;
    const as = live ? ME.scoreAway : 0;
    let min = '';
    if (live) {
      const tot = ME.totalTime || (ME.matchTime ? ME.matchTime(ch.matchDuration || 100) : 0);
      if (tot) min = `${Math.min(90, Math.max(1, Math.round(90 * (1 - ME.timeLeft / tot))))}'`;
    }
    hs = Math.max(1, hs);
    // o seu valor no ranking da liga (¥ na NEL; pontos na liga profissional)
    let valor = null;
    let fmt = (v) => String(v);
    try {
      const lg = App.lgState && App.lgState();
      if (lg && lg.values && typeof lg.values.you === 'number') {
        valor = lg.values.you;
        fmt = (v) => App.fmtLeagueValue(v);
      }
    } catch (e) {
      valor = null;
    }
    const kaiserRival = rivais.some((c) => c && c.id === 'kaiser');
    ELENCO = {
      run: CE._cineRun,
      you,
      passa,
      rivais,
      goleiro,
      corRival: corDoTime(kitRival.jerseyPrimary, kitRival.jerseySecondary),
      hl: labels.home,
      al: labels.away,
      hs,
      as,
      min,
      valor,
      fmt,
      kaiserRival
    };
    return ELENCO;
  }

  // ---------------------------------------------------------------- o campo
  // Ataque no gol norte (y 6,6). A câmera fica a leste, de lado, na altura da cintura:
  // o gol fica à DIREITA do quadro. u = de lado (x), d = distância da linha do gol.
  const GX = 53;
  const P = (u, d, z = 0) => [GX + u, 6.6 + d, z];
  const cam = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  const ator = (K, cd, p, o) => {
    if (cd && typeof cd === 'object' && !cd.name) cd = Object.assign({}, cd, { name: '_' + (o.id || '') });
    return K.actor(cd, Object.assign({ x: p[0], y: p[1], z: p[2] || 0 }, o));
  };
  const corre = (f, passo = 3) => 1 + (Math.floor(f / passo) % 4) * 4;
  // onde cada um está (u, d) e onde vai estar no próximo segundo (a sombra). Você é quem
  // fica mais perto da câmera; os rivais, um pouco mais longe (o maior do quadro é você)
  // (cada sombra fica a ~1 ladrilho do dono, de lado no quadro: as duas se leem)
  const TM = [-1.6, 8.9]; // o companheiro que passa (lá atrás)
  const VOCE = [0.6, 5.8];
  const ROTEIRO = [0.5, 4.85]; // a sua sombra: dominar para a frente e chutar
  const FORA = [1.1, 6.45]; // aonde você vai de verdade (para trás, de volta para a bola)
  const RIV = [
    { de: [-0.2, 3.45], para: [0.35, 4.6], anim: 'slide' }, // o melhor deles: o carrinho
    { de: [-1.2, 2.05], para: [-0.6, 2.8], anim: 'jump' }, // o salto no chute
    { de: [-0.45, 7.45], para: [-0.25, 6.65], anim: 'run' } // fechando por trás
  ];
  const GK = { de: [0, 0.45], para: [0.42, 0.5] };
  const ALVO = [-0.78, -0.12, 0.78]; // o canto longe de todos
  // a bola do passe (q 0..1): do pé do companheiro até você
  const bolaPasse = (q) => {
    const p = R.mix(P(TM[0] + 0.15, TM[1] - 0.3, 0.05), P(VOCE[0] - 0.05, VOCE[1] + 0.25, 0.08), q);
    p[2] += Math.sin(q * Math.PI) * 0.55;
    return p;
  };
  const PARADA = 0.62; // onde a bola ficou parada no ar no plano 1

  // ---------------------------------------------------------------- as sombras (2D)
  // Desenhadas por cima de tudo (depois do efeito que tira a cor do mundo), com a forma do
  // próprio boneco (CE.ART.silhouette) no lugar e no tamanho dele na tela.
  function sombra(ctx, K, cd, p, o) {
    const A = CE.ART;
    const X = window.Hub && window.Hub._3d;
    if (!A || !A.silhouette || !X || o.alpha <= 0.01) return;
    const k = 0.9;
    const box = (72 / X.C.SPX) * k;
    const pf = K.screen(p[0], p[2] || 0, p[1]);
    const pt = K.screen(p[0], (p[2] || 0) + box * (66 / 72), p[1]);
    if (!pf || !pt) return;
    const h = Math.abs(pf.y - pt.y) * (72 / 66);
    if (h < 4) return;
    const eye = K.c.eye;
    const ang = Math.atan2(o.face[1] - p[1], o.face[0] - p[0]);
    let rel = Math.atan2(eye[2] - p[1], eye[0] - p[0]) - ang;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const view = Math.abs(rel) < 0.75 ? 'front' : Math.abs(rel) > 2.4 ? 'back' : 'side';
    const cdx = K.c.look[0] - eye[0];
    const cdy = K.c.look[2] - eye[2];
    const left = Math.cos(ang) * -cdy + Math.sin(ang) * cdx < 0;
    ctx.save();
    ctx.globalAlpha = clamp(o.alpha);
    A.silhouette(ctx, K.charData(cd, {}), pf.x, pf.y, h, { view, left, pose: o.anim, frame: o.frame || 0, fill: o.cor });
    ctx.restore();
  }
  // todas as sombras de um quadro (a = alfa de cada uma, por quem)
  function sombras(ctx, K, a) {
    const E = elenco();
    const g = P(0, 0);
    RIV.forEach((r, i) => sombra(ctx, K, E.rivais[i], P(r.para[0], r.para[1]), { alpha: a.r[i], cor: E.corRival, anim: r.anim, frame: r.anim === 'run' ? 5 : 2, face: P(ROTEIRO[0], ROTEIRO[1]) }));
    sombra(ctx, K, E.goleiro, P(GK.para[0], GK.para[1]), { alpha: a.gk, cor: E.corRival, anim: 'idle', face: P(ROTEIRO[0], ROTEIRO[1]) });
    sombra(ctx, K, E.you, P(ROTEIRO[0], ROTEIRO[1]), { alpha: a.voce, cor: YOU, anim: 'windup', frame: 1, face: [g[0] + 0.2, g[1]] });
  }

  // ---------------------------------------------------------------- o telão da BLTV
  // Pendurado na lateral oeste, de frente para a câmera: fica no fundo dos três planos.
  // Antes do gol: o seu nome e o leilão ao vivo, sem número; depois do gol o número rola e
  // para no seu valor de verdade. Placa em pixel (texto em fonte de pixel), redesenhada só
  // quando o texto muda.
  const TV = { cv: null, key: '' };
  const TELAO = { x: 45.12, y: 11.9, z: 1.6, w: 4.4, h: 2.45 };
  function telao(texto, nome, aceso) {
    const key = texto + '|' + nome + '|' + aceso;
    if (TV.cv && TV.key === key) return { cv: TV.cv, novo: false };
    if (!TV.cv) {
      TV.cv = document.createElement('canvas');
      TV.cv.width = 128;
      TV.cv.height = 72;
    }
    const g = TV.cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#070b18';
    g.fillRect(0, 0, 128, 72);
    g.fillStyle = aceso ? '#facc15' : '#a16207';
    g.fillRect(0, 0, 128, 13);
    g.fillRect(0, 70, 128, 2);
    if (CE.finPixelText) {
      CE.finPixelText(g, 'BLTV  LEILÃO AO VIVO', 64, 7, 1, '#0b1020');
      CE.finPixelText(g, String(nome || '').toUpperCase().slice(0, 16), 64, 28, 1, '#e2e8f0', 'center', 120);
      if (texto) CE.finPixelText(g, texto, 64, 50, 1, aceso ? '#fde047' : '#94a3b8', 'center', 122);
    }
    TV.key = key;
    return { cv: TV.cv, novo: true };
  }
  function telaoNoCampo(K, texto, aceso) {
    const tv = telao(texto, CE.cinePlayerName(), aceso);
    R.placa(K, { x: TELAO.x, y: TELAO.y, z: TELAO.z, w: TELAO.w, h: TELAO.h, ang: 0, img: tv.cv, em: true, dirty: tv.novo });
    // (a moldura e o cabo: uma caixa escura atrás e duas hastes até o alto)
    K.box({ x0: TELAO.x - 0.1, y0: TELAO.y - TELAO.w / 2 - 0.08, x1: TELAO.x - 0.02, y1: TELAO.y + TELAO.w / 2 + 0.08, z0: TELAO.z - 0.08, z1: TELAO.z + TELAO.h + 0.08, color: '#0b1020' });
    [-1, 1].forEach((s) => K.box({ x0: TELAO.x - 0.08, y0: TELAO.y + s * (TELAO.w / 2 - 0.3) - 0.03, x1: TELAO.x - 0.04, y1: TELAO.y + s * (TELAO.w / 2 - 0.3) + 0.03, z0: TELAO.z + TELAO.h, z1: TELAO.z + TELAO.h + 3, color: '#1f2937' }));
  }
  // o valor com os dígitos rolando (q 0..1: da esquerda para a direita cada dígito para)
  function valorRolando(q) {
    const E = elenco();
    if (E.valor === null) return '';
    const alvo = E.fmt(E.valor);
    if (q >= 1) return alvo;
    const n = alvo.length;
    let s = '';
    for (let i = 0; i < n; i++) {
      const ch = alvo[i];
      const parou = q * (n + 4) > i + 4;
      s += /\d/.test(ch) && !parou ? String(Math.floor(R.rnd(i * 7 + Math.floor(q * 40), 3) * 10)) : ch;
    }
    return s;
  }

  // ---------------------------------------------------------------- o chute (plano 3)
  const HIT_T = 46;
  const LENTO3 = [
    { em: 22, ate: 70, fator: 0.3, rampa: 12 },
    // (a pausa no contato: soma 0,3 à perda de 0,7 da 1ª faixa e o tempo para)
    { em: HIT_T, ate: HIT_T + 4, fator: 0.7, rampa: 0 }
  ];
  const HIT = R.acao(LENTO3, HIT_T);
  const VOO = 26; // quadros (tempo da ação) até a rede
  function bolaChute(a) {
    const pe = P(FORA[0] + 0.02, FORA[1] - 0.3, 0.06);
    if (a < HIT) return pe;
    const q = seg(a, HIT, HIT + VOO);
    if (q < 1) {
      const p = R.mix(pe, P(ALVO[0], ALVO[1], ALVO[2]), easeIn(q) * 0.5 + q * 0.5);
      p[2] += Math.sin(q * Math.PI) * 0.35;
      // a curva para longe do goleiro
      p[0] -= Math.sin(q * Math.PI) * 0.25;
      return p;
    }
    const u = a - HIT - VOO;
    return P(ALVO[0] + Math.min(0.15, u * 0.01), ALVO[1] - Math.min(0.4, u * 0.03), Math.max(0.08, ALVO[2] - easeIn(seg(u, 0, 24)) * 0.7));
  }

  R('nel_metavision_goal', {
    titulo: 'METAVISION',
    musica: 'epic',
    leitura: 0.8,
    grao: 0.05,
    vinheta: 0.45,
    // (sem tema: na partida, o estádio é o do capítulo que está rolando)
    cenario(K) {
      K.expo(1.0);
    },
    planos: [
      // 1 · O PRÓXIMO SEGUNDO: o tempo parado (o mundo perde um pouco da cor); as sombras
      // aparecem uma a uma; a câmera, já em plano médio, chega devagar (a bola parada no ar)
      {
        id: 'fantasmas',
        dur: 200,
        cena(K, S, st) {
          const t = S.t;
          const E = elenco();
          ator(K, E.passa, P(TM[0], TM[1]), { id: 'tm', face: P(VOCE[0], VOCE[1]), anim: 'shoot', frame: 1 });
          ator(K, E.you, P(VOCE[0], VOCE[1]), { id: 'y', face: P(TM[0], TM[1]), anim: 'idle', frame: 0 });
          RIV.forEach((r, i) => ator(K, E.rivais[i], P(r.de[0], r.de[1]), { id: 'r' + i, face: P(VOCE[0], VOCE[1]), anim: 'run', frame: 1 + i * 4 }));
          ator(K, E.goleiro, P(GK.de[0], GK.de[1]), { id: 'gk', face: P(VOCE[0], VOCE[1]), anim: 'idle', frame: 0 });
          const b = bolaPasse(PARADA);
          K.ball(b[0], b[1], b[2]);
          // já em plano médio (você, os três e as sombras), chegando devagar
          const q = easeIO(seg(t, 0, S.dur));
          cam(K, P(lerp(4.5, 4.15, q), lerp(5.6, 5.4, q), lerp(0.62, 0.58, q)), P(-0.2, lerp(5.2, 5.1, q), 0.5), 44);
          telaoNoCampo(K, '', false);
          st.q = q;
        },
        falas: [{ em: 70, quem: 'you', tipo: 'pensamento', texto: '(Eu já vi esse lance.)' }],
        efeitos: [{ tipo: 'pb', em: 0, forca: 0.62, entra: 24, tom: '#1e3a8a' }],
        sons: [{ em: 6, som: 'bip', arg: 660 }],
        depois(ctx, S, K) {
          const t = S.t;
          // uma a uma: primeiro os rivais (o melhor primeiro), o goleiro, e por último a sua
          sombras(ctx, K, { r: [0, 1, 2].map((i) => 0.5 * seg(t, 30 + i * 18, 44 + i * 18)), gk: 0.45 * seg(t, 84, 98), voce: 0.55 * seg(t, 104, 120) });
          const E = elenco();
          CE.rtPlacar(ctx, S, { hl: E.hl, al: E.al, hs: E.hs - 1, as: E.as, min: E.min });
        }
      },
      // 2 · TODOS VÃO PARA A SOMBRA, MENOS VOCÊ: o tempo volta; cada rival preenche a sua;
      // você deixa a bola correr e sai para trás; a sua sombra fica vazia e some
      {
        id: 'roteiro',
        dur: 150,
        cena(K, S, st) {
          const t = S.t;
          const E = elenco();
          // a bola termina de chegar e você a leva para trás, longe da câmera
          const chegou = seg(t, 0, 26);
          const sai = easeIO(seg(t, 24, 74));
          const vp = R.mix(P(VOCE[0], VOCE[1]), P(FORA[0], FORA[1]), sai);
          const anda = sai > 0.02 && sai < 0.98;
          ator(K, E.you, vp, { id: 'y', face: sai > 0.98 ? P(ALVO[0], 0) : P(FORA[0], FORA[1] + 2), anim: anda ? 'run' : 'idle', frame: anda ? corre(S.f, 3) : 0 });
          let b;
          if (chegou < 1) b = bolaPasse(lerp(PARADA, 1, chegou));
          else b = [vp[0] + 0.05, vp[1] - 0.3, 0.05];
          K.ball(b[0], b[1], b[2]);
          ator(K, E.passa, P(TM[0], TM[1]), { id: 'tm', face: P(VOCE[0], VOCE[1]), anim: t < 20 ? 'shoot' : 'idle', frame: t < 20 ? 1 : 0 });
          // os rivais: cada um até a sua sombra, no seu tempo, e fica na pose dela
          st.cheg = RIV.map((r, i) => {
            const k = ease(seg(t, 10 + i * 6, 52 + i * 8));
            const p = R.mix(P(r.de[0], r.de[1]), P(r.para[0], r.para[1]), k);
            const pose = k >= 0.98 ? r.anim : 'run';
            const z = pose === 'jump' ? Math.sin(seg(t, 52 + i * 8, 92 + i * 8) * Math.PI) * 0.32 : 0;
            ator(K, E.rivais[i], [p[0], p[1], z], { id: 'r' + i, face: P(ROTEIRO[0], ROTEIRO[1]), anim: pose, frame: pose === 'run' ? corre(S.f + i * 2, 3) : undefined, opts: pose === 'slide' ? { animTime: Math.min(15, (t - 52 - i * 8) * 0.8) } : pose === 'jump' ? { animTime: Math.min(22, (t - 52 - i * 8) * 0.55) } : undefined });
            return k;
          });
          const kg = ease(seg(t, 20, 60));
          ator(K, E.goleiro, R.mix(P(GK.de[0], GK.de[1]), P(GK.para[0], GK.para[1]), kg), { id: 'gk', face: P(ROTEIRO[0], ROTEIRO[1]), anim: 'idle', frame: 0 });
          st.kg = kg;
          const q = easeIO(seg(t, 0, S.dur));
          cam(K, P(lerp(4.15, 4.05, q), lerp(5.4, 5.8, q), 0.58), P(-0.2, lerp(5.1, 5.5, q), 0.5), 44);
          telaoNoCampo(K, '', false);
        },
        efeitos: [{ tipo: 'pb', em: 0, ate: 22, forca: (t) => 0.62 * (1 - seg(t, 0, 22)) }],
        sons: [{ em: 2, som: 'vento' }],
        depois(ctx, S, K, st) {
          const t = S.t;
          // a sombra de cada um some quando ele chega nela; a sua fica sozinha e apaga
          const ch = st.cheg || [0, 0, 0];
          sombras(ctx, K, { r: ch.map((k) => 0.5 * (1 - seg(k, 0.82, 1))), gk: 0.45 * (1 - seg(st.kg || 0, 0.8, 1)), voce: 0.55 * (1 - seg(t, 92, 132)) });
          const E = elenco();
          CE.rtPlacar(ctx, S, { hl: E.hl, al: E.al, hs: E.hs - 1, as: E.as, min: E.min });
        }
      },
      // 3 · O CHUTE: do lugar que ninguém leu; a bola entra longe de todos e o telão da BLTV
      // mostra o seu valor
      {
        id: 'chute',
        dur: 200,
        lento: LENTO3,
        cena(K, S, st) {
          const t = S.t;
          const A = S.A;
          const E = elenco();
          const bate = A >= HIT;
          ator(K, E.you, P(FORA[0], FORA[1]), { id: 'y', face: P(ALVO[0], 0), anim: bate ? 'shoot' : A > HIT - 16 ? 'windup' : 'idle', frame: bate || A > HIT - 16 ? 1 : 0 });
          // todos presos no roteiro: o carrinho no chão, o salto caindo, o que fechava parado
          RIV.forEach((r, i) => {
            const z = r.anim === 'jump' ? Math.max(0, 0.18 - A * 0.004) : 0;
            // (o carrinho sem animTime fica no quadro do chão; o salto, no da queda)
            ator(K, E.rivais[i], P(r.para[0], r.para[1], z), { id: 'r' + i, face: P(ROTEIRO[0], ROTEIRO[1]), anim: r.anim === 'run' ? 'idle' : r.anim, frame: r.anim === 'run' ? 0 : undefined, opts: r.anim === 'jump' ? { animTime: 32 } : undefined });
          });
          const gq = seg(A, HIT + 8, HIT + VOO + 6);
          ator(K, E.goleiro, P(lerp(GK.para[0], -0.3, ease(gq)), GK.para[1], Math.sin(gq * Math.PI) * 0.24), { id: 'gk', face: P(-3, 0.5), anim: gq > 0.02 ? 'dive' : 'idle', frame: gq > 0.02 ? undefined : 0, opts: gq > 0.02 ? { animTime: gq * 30 } : undefined });
          const b = bolaChute(A);
          K.ball(b[0], b[1], b[2]);
          // o telão da BLTV no fundo: depois do gol o número rola e para no seu valor
          const gol = A >= HIT + VOO;
          telaoNoCampo(K, E.valor !== null && gol ? valorRolando(seg(t, 100, 146)) : '', gol);
          // de perto, de perfil; depois do chute a câmera recua e sobe: você, o gol e o telão
          const vira = easeIO(seg(A, HIT + 4, HIT + 44));
          const e = R.mix(P(4.4, 7.3, 0.4), P(5.6, 6.2, 0.85), vira);
          const l = R.mix(P(0.7, 6.1, 0.45), P(-1.2, 4.2, 1.15), vira);
          cam(K, e, l, lerp(42, 46, vira));
          const pe = P(FORA[0] + 0.02, FORA[1] - 0.3, 0.12);
          st.pe = R.ponto(pe[0], pe[1], pe[2]);
          st.bola = R.ponto(b[0], b[1], b[2]);
          st.bateu = bate;
          st.gol = A >= HIT + VOO;
        },
        falas: [
          {
            em: 118,
            texto: '"Impossível."',
            nome: 'MICHAEL KAISER',
            cor: KAISER,
            // só se o Kaiser estiver em campo pelo rival: sem ele, a fala termina onde começa
            // e o motor a descarta (a legenda não aparece)
            get ate() {
              return elenco().kaiserRival ? undefined : 118;
            }
          }
        ],
        efeitos: [
          { tipo: 'impacto', em: HIT_T, ate: HIT_T + 2 },
          { tipo: 'tremor', em: HIT_T, ate: HIT_T + 26, forca: 0.45, amp: 0.05 },
          { tipo: 'linhas', modo: 'radial', em: HIT_T, ate: HIT_T + 10, alvo: 'pe', forca: 0.4, cor: '#e0f2fe' }
        ],
        sons: [
          { em: HIT_T, fn: () => window.SFX?.kick?.(1) },
          { em: 92, fn: () => window.SFX?.goal?.(true) },
          { em: 104, som: 'bip', arg: 880 }
        ],
        depois(ctx, S, K, st) {
          const E = elenco();
          if (st.bateu && st.pe && st.bola && CE.luckStreak) {
            const k = 1 - seg(S.t, HIT_T + 30, HIT_T + 50);
            if (k > 0) CE.luckStreak(ctx, st.pe.x, st.pe.y, st.bola.x, st.bola.y, 3, 20, rgbDe(YOU).join(','), 0.8 * k);
          }
          CE.rtPlacar(ctx, S, { hl: E.hl, al: E.al, hs: st.gol ? E.hs : E.hs - 1, as: E.as, min: E.min, pop: 'home', popK: seg(S.t, 92, 110) });
        }
      }
    ]
  });
})();
