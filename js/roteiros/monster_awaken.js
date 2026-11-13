// ============================================================================
// 45 · monster_awaken — O MONSTRO: o passo atrás
// Conceito A do lote 1 (docs/cenas/CONCEITOS_LOTE1.md), regras em CUTSCENE_STYLE.md.
// Assinatura: o monstro aparece no medo dos outros. Você parado no meio do jogo, perdendo,
// com dois marcadores colados; a voz do Fox; corte seco e os DOIS marcadores dão um passo
// atrás juntos, antes de você se mexer. Só então a arrancada (o pico: tremida forte).
// Nada em cima do boneco (sem aura, sem tinta roxa, sem correntes, que são da 09).
// Toca dentro da partida, do Cap. 15 em diante, uma vez por jogo, quando você está atrás
// (MatchEngine.checkMonster). O estádio, os rivais e o placar são os da partida.
// O aviso dos 15 s de bônus não está mais na legenda: a partida já mostra a faixa
// "O MONSTRO ACORDOU!" com a regra (MatchEngine.monsterAwaken).
// Substitui o registro antigo de js/cine3d_fox.js (este arquivo carrega depois).
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
  // a cor do Fox (não está na tabela da §1.2: fica registrada aqui e no relatório)
  const FOX = '#ea580c';

  // ---------------------------------------------------------------- quem está em campo
  // (uma vez por vez que a cena toca: o elenco é o da partida que está rolando)
  let ELENCO = null;
  function elenco() {
    if (ELENCO && ELENCO.run === CE._cineRun) return ELENCO;
    const ME = window.MatchEngine;
    const ch = (ME && ME.chapter) || {};
    const you = CE.foxcMonsterYou ? CE.foxcMonsterYou() : CE.cineYou();
    const kit = ch.opponentColor ? { jerseyPrimary: ch.opponentColor, jerseySecondary: ch.opponentSecondary || '#ffffff' } : { jerseyPrimary: '#991b1b', jerseySecondary: '#f8fafc' };
    // os dois marcadores: os rivais de linha que estão em campo (os mais perto de você)
    let rivais = [];
    if (ME && ME.active && Array.isArray(ME.entities) && ME.playerEntity) {
      const p = ME.playerEntity;
      rivais = ME.entities
        .filter((e) => e.team === 'away' && !e.isGK && e.charData)
        .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))
        .slice(0, 2)
        .map((e) => e.charData);
    }
    if (rivais.length < 2) {
      let ids = (ch.opponentIds || []).filter((id) => !/^gk_/.test(id));
      if (ids.length < 2) ids = ['kaiser', 'barou'];
      rivais = ids.slice(0, 2).map((id) => CE.cineChar(id, kit));
    }
    ELENCO = { run: CE._cineRun, you, rivais };
    return ELENCO;
  }
  function placarAgora() {
    const ME = window.MatchEngine;
    let hs = ME && ME.active ? ME.scoreHome : 0;
    let as = ME && ME.active ? ME.scoreAway : 1;
    // (a cena só toca com você atrás; no teste fora da partida fica 0 x 1)
    if (!(hs < as)) {
      hs = 0;
      as = 1;
    }
    const labels = (ME && ME.chapter && ME.chapter.scoreLabels) || { home: 'VOCÊ', away: 'RIVAL' };
    let min = '';
    if (ME && ME.active && ME.timeLeft !== undefined) {
      const tot = ME.totalTime || (ME.matchTime ? ME.matchTime((ME.chapter && ME.chapter.matchDuration) || 100) : 0);
      if (tot) min = `${Math.min(90, Math.max(1, Math.round(90 * (1 - ME.timeLeft / tot))))}'`;
    }
    return { hs, as, hl: labels.home, al: labels.away, min };
  }
  // placar pequeno no canto (Jersey 10), o mesmo jeito do da transmissão
  function placar(ctx, S) {
    const c = placarAgora();
    CE.rtPlacar(ctx, S, { hl: c.hl, al: c.al, hs: c.hs, as: c.as, min: c.min });
  }

  // ---------------------------------------------------------------- o lugar
  // No meio-campo de ataque (gol norte). Plano 1: 3/4 de frente (a nordeste), baixo e perto.
  // Plano 2: de lado (a leste), mais baixo: o gol fica à DIREITA do quadro.
  const VX = 52.9;
  const VY = 15.0; // você
  // os marcadores: um na frente (entre você e o gol), outro atrás, colados e de frente
  const M1 = [52.7, 14.25];
  const M2 = [53.1, 15.75];
  const RECUO = 0.62; // o passo atrás (bem visível: quase um terço do quadro somando os dois)
  const cam = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  const ator = (K, cd, x, y, o) => {
    if (cd && typeof cd === 'object' && !cd.name) cd = Object.assign({}, cd, { name: '_' + (o.id || '') });
    return K.actor(cd, Object.assign({ x, y }, o));
  };
  const corre = (f, passo = 3) => 1 + (Math.floor(f / passo) % 4) * 4;
  // fôlego: o corpo sobe e desce devagar (ofegante)
  const folego = (t) => Math.max(0, Math.sin(t * 0.16)) * 0.012;

  const PASSO = [14, 30]; // o passo atrás dos dois, no mesmo quadro (plano 2)
  const ARRANCA = 46; // a arrancada (plano 2)
  // a arrancada: os primeiros passos ainda dentro do quadro (~0,4 s) e só então você sai
  const XR = 53.25; // (a linha da corrida: na frente do marcador, do lado da câmera)
  const corrida = (t) => {
    const u = Math.max(0, t - ARRANCA);
    return { x: lerp(VX, XR, seg(u, 0, 8)), y: VY - (0.03 * u + 0.004 * u * u) };
  };

  R('monster_awaken', {
    titulo: 'O MONSTRO',
    musica: 'epic',
    leitura: 0.75,
    grao: 0.05,
    vinheta: 0.5,
    cenario(K) {
      K.expo(1.0);
    },
    planos: [
      // 1 · PARADO: você no meio do jogo, ofegante, os dois colados; a câmera chegando; o
      // coração e a voz do Fox
      {
        id: 'parado',
        dur: 200,
        cena(K, S) {
          const t = S.t;
          const E = elenco();
          ator(K, E.you, VX, VY, { id: 'y', z: folego(t), face: [VX, 8], anim: 'idle', frame: Math.floor(t / 10) });
          E.rivais.forEach((r, i) => {
            const m = i ? M2 : M1;
            // (os dois de frente para você, firmes, balançando de leve no lugar)
            ator(K, r, m[0] + Math.sin(t * 0.05 + i * 2) * 0.02, m[1], { id: 'm' + i, face: [VX, VY], anim: 'idle', frame: Math.floor(t / 12) + i * 5 });
          });
          K.ball(VX - 0.04, VY - 0.3, 0.05);
          // 3/4 de frente, baixa, chegando devagar: você no meio, um marcador de cada lado
          const q = easeIO(seg(t, 0, S.dur));
          cam(K, [lerp(55.6, 55.15, q), lerp(12.75, 13.15, q), lerp(0.58, 0.5, q)], [VX, lerp(15.05, 14.95, q), 0.46], lerp(44, 42, q));
        },
        falas: [
          { em: 16, ate: 100, quem: 'you', tipo: 'pensamento', texto: '(Perder de novo?)' },
          { em: 108, quem: 'FOX', cor: FOX, tipo: 'sussurro', texto: '"...deixa ele sair."' }
        ],
        efeitos: [{ tipo: 'pulso', em: 0, ate: 200, bpm: 64, forca: 0.55, cor: '#450a0a', entra: 30 }],
        sons: [
          { em: 6, fn: () => window.SFX?.kick?.(0.3) },
          { em: 62, fn: () => window.SFX?.kick?.(0.3) },
          { em: 118, fn: () => window.SFX?.kick?.(0.35) },
          { em: 174, fn: () => window.SFX?.kick?.(0.4) }
        ],
        depois(ctx, S) {
          placar(ctx, S);
        }
      },
      // 2 · O PASSO ATRÁS: corte seco, de lado e mais baixo; os dois recuam juntos; você
      // arranca (os primeiros passos dentro do quadro) e sai; a câmera fica com os dois
      {
        id: 'arrancada',
        dur: 160,
        cena(K, S, st) {
          const t = S.t;
          const E = elenco();
          const rec = easeIO(seg(t, PASSO[0], PASSO[1]));
          const passo = rec > 0.02 && rec < 0.98;
          const pulinho = Math.sin(seg(t, PASSO[0], PASSO[1]) * Math.PI) * 0.07;
          const foi = t >= ARRANCA;
          const c = corrida(t);
          const agacha = t >= ARRANCA - 12 && t < ARRANCA;
          ator(K, E.you, c.x, c.y, { id: 'y', z: foi ? 0 : folego(t), face: [c.x, 6], anim: foi ? 'run' : agacha ? 'windup' : 'idle', frame: foi ? corre(S.f, 2) : agacha ? 1 : Math.floor(t / 10) });
          E.rivais.forEach((r, i) => {
            const m = i ? M2 : M1;
            // o passo atrás: os dois para longe de você, no mesmo quadro (com o tranco)
            const dy = m[1] > VY ? 1 : -1;
            const y = m[1] + dy * RECUO * rec;
            // depois que você passa, um de cada vez vira a cabeça atrás de você (tarde)
            const vira = foi && t > ARRANCA + 14 + i * 10;
            ator(K, r, m[0], y, { id: 'm' + i, z: pulinho, face: vira ? [m[0], 6] : [VX, VY], anim: passo ? 'hurt' : 'idle', frame: passo ? 0 : Math.floor(t / 14) });
          });
          // a bola vai com você
          K.ball(c.x - 0.04, c.y - 0.32 - (foi ? Math.abs(Math.sin(t * 0.35)) * 0.12 : 0), 0.05);
          // tufos de grama arrancados no primeiro passo
          if (t >= ARRANCA) {
            const u = t - ARRANCA;
            for (let i = 0; i < 10; i++) {
              const a = R.rnd(i, 4) * Math.PI - Math.PI;
              const d = Math.min(0.7, u * (0.012 + R.rnd(i, 5) * 0.016));
              const z = Math.max(0, u * (0.018 + R.rnd(i, 6) * 0.02) - u * u * 0.0007);
              const al = 1 - seg(u, 24, 40);
              if (al <= 0) continue;
              const x = VX + Math.cos(a) * d * 0.6;
              const y = VY + 0.2 + Math.abs(Math.sin(a)) * d;
              K.box({ x0: x - 0.02, y0: y - 0.02, x1: x + 0.02, y1: y + 0.02, z0: z, z1: z + 0.035, color: '#4ade80', alpha: al });
            }
          }
          // de lado, baixa e perto; na arrancada acompanha um pouco os seus primeiros passos e
          // te deixa ir; depois chega nos dois marcadores, olhando para onde você foi
          const segue = Math.sin(seg(t, ARRANCA, ARRANCA + 44) * Math.PI) * 0.45;
          const chega = easeIO(seg(t, ARRANCA + 40, S.dur));
          cam(K, [lerp(55.75, 55.35, chega), 15.0 - segue * 0.5, lerp(0.4, 0.46, chega)], [VX, 15.0 - segue, 0.46], lerp(44, 42, chega));
          st.pe = R.ponto(VX, VY, 0.1);
        },
        efeitos: [
          { tipo: 'tremor', em: ARRANCA, ate: ARRANCA + 36, forca: 0.85, amp: 0.08 },
          // (~0,3 s de linhas paralelas na arrancada)
          { tipo: 'linhas', modo: 'paralelas', em: ARRANCA, ate: ARRANCA + 20, forca: 0.45, ang: 0, decai: true, entra: 3 }
        ],
        sons: [
          { em: PASSO[0], fn: () => window.SFX?.tackle?.() },
          { em: ARRANCA, fn: () => window.SFX?.kick?.(1) },
          { em: ARRANCA + 2, som: 'vento' }
        ],
        depois(ctx, S) {
          placar(ctx, S);
        }
      }
    ]
  });
})();
