(async () => {
  // FOLHAS DAS CENAS DO GRUPO B (lote 1 da Fase 2): 11 scripted_shot, 12 chem_reaction,
  // 45 monster_awaken, 31 nel_metavision_goal e 60 duo_ressonancia, cada uma com 2
  // combinações (quem chuta, parceiro, clube, estádio). 3 quadros por plano, com a % de
  // quadro quase preto (brilho < 16) e estourado (> 250) de cada quadro na legenda.
  //   powershell -NoProfile -ExecutionPolicy Bypass -File testes\rodar.ps1 -teste f2b_cenas -saida C:\Users\Public\bl_f2b\folhas
  // Para rodar só algumas: edite SO (lista de nomes de trabalho; vazia = todos).
  const SO = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const ce0 = console.error.bind(console);
  console.error = (...a) => {
    errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300));
    ce0(...a);
  };
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine;
  CE.roteiroTeste = true;
  const clear = async (n = 60) => {
    for (let i = 0; i < n; i++) {
      const m = document.querySelector('#cinematic-modal.open');
      if (m) {
        const b = m.querySelector('.dilemma-buttons button, button');
        if (b) b.click();
        else App.closeCinematicModal?.();
      } else if (CE.sakugaActive && CE.finishSakuga) CE.finishSakuga();
      else if (CE.active && CE.awaitingChoice && CE.choose) CE.choose(0);
      else if (CE.active && CE.next) CE.next();
      else if (i > 3) break;
      await wait(100);
    }
  };
  App.startNewCareer(1, { name: 'Enjin Tsubaza' }, 'normal');
  await wait(300);
  App.closeTitleScreen();
  await clear();
  H.glFix = true;
  if (H.GL3D) H.GL3D.scale = 0.6;
  await wait(600);
  const cap = async (id) => {
    if (CE.sakugaActive) CE.finishSakuga();
    App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === id));
    H._th = null;
    await wait(200);
  };
  const ch = (id, kit) => CE.cineChar(id, kit);
  const KBL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const KV = { jerseyPrimary: '#4c1d95', jerseySecondary: '#f8fafc' };
  const KJP = { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' };
  const KU20 = { jerseyPrimary: '#0b1d4d', jerseySecondary: '#f8fafc' };
  const ME = window.MatchEngine;
  const sig = (id, cd) => (ME.getSignatureShot ? ME.getSignatureShot({ id, charData: cd, isPlayer: false }) : { skillName: 'Chute', weaponName: 'Arma', color: '#ef4444' });

  // ---------------------------------------------------------------- trabalhos
  let J_TEMA = null;
  const JOBS = [
    {
      nome: 'scripted_voce',
      tipo: 'scripted_shot',
      cap: 'ch2_first_selection_v',
      prep() {
        CE.shotCfg = {
          shooter: CE.cineYou(KBL),
          shooterName: 'Enjin Tsubaza',
          defender: ch('reo', KV),
          keeper: ch('fukaku', KV),
          team: 'home',
          skillName: 'Chute Direto',
          weaponName: 'Ego Desperto',
          skillColor: '#00f5d4',
          homeBefore: 1,
          awayBefore: 1,
          homeAfter: 2,
          awayAfter: 1,
          minute: "67'",
          homeLabel: 'TIME Z',
          awayLabel: 'TIME V'
        };
      },
      extra: { 1: [104] }
    },
    {
      nome: 'scripted_rival',
      tipo: 'scripted_shot',
      cap: 'ch5_u20_japan',
      prep() {
        const rin = ch('sae', KU20);
        const s = sig('sae', rin);
        CE.shotCfg = {
          shooter: rin,
          shooterName: 'Sae Itoshi',
          defender: CE.cineYou(KJP),
          keeper: ch('gagamaru', KJP),
          team: 'away',
          skillName: s.skillName,
          weaponName: s.weaponName,
          skillColor: s.color,
          homeBefore: 2,
          awayBefore: 2,
          homeAfter: 2,
          awayAfter: 3,
          minute: "81'",
          homeLabel: 'BLUE LOCK',
          awayLabel: 'SUB-20'
        };
      },
      extra: { 1: [105] }
    },
    {
      nome: 'chem_bachira',
      tipo: 'chem_reaction',
      cap: 'ch2_first_selection_v',
      prep() {
        CE.chemCfg = { partner: ch('bachira', KBL), defender: ch('reo', KV), partnerName: 'Meguru Bachira', you: CE.cineYou(KBL), youName: 'Enjin Tsubaza' };
      },
      extra: { 2: [40] }
    },
    {
      nome: 'chem_nagi',
      tipo: 'chem_reaction',
      cap: 'ch5_u20_japan',
      prep() {
        CE.chemCfg = { partner: ch('nagi', KJP), defender: ch('sae', KU20), partnerName: 'Seishiro Nagi', you: CE.cineYou(KJP), youName: 'Enjin Tsubaza' };
      },
      extra: { 2: [40] }
    },
    {
      nome: 'chem_shidou',
      tipo: 'chem_reaction',
      cap: 'ch4b_trio_tournament',
      prep() {
        CE.chemCfg = { partner: ch('shidou', KBL), defender: ch('aryu', KV), partnerName: 'Ryusei Shidou', you: CE.cineYou(KBL), youName: 'Enjin Tsubaza' };
      },
      extra: { 2: [40] }
    },
    {
      nome: 'monstro_fox',
      tipo: 'monster_awaken',
      cap: 'ch10_fox_training',
      prep() {
        ME.chapter = App.getChapter();
      },
      extra: { 1: [46, 54, 62, 70] }
    },
    {
      nome: 'monstro_copa',
      tipo: 'monster_awaken',
      cap: 'ch13_world_cup',
      prep() {
        ME.chapter = App.getChapter();
      },
      extra: { 1: [46, 54, 62, 70] }
    },
    {
      nome: 'nel_bastard',
      tipo: 'nel_metavision_goal',
      cap: 'ch7_nel_ubers_pxg',
      prep() {
        App.state.nelClub = 'bastard';
        App.initLeague();
        ME.chapter = App.getChapter();
      },
      extra: { 2: [46] }
    },
    {
      nome: 'nel_manshine',
      tipo: 'nel_metavision_goal',
      cap: 'ch6_nel_barcha_manshine',
      prep() {
        App.state.nelClub = 'manshine';
        App.initLeague();
        App.lgState().values.you = 187.4;
        ME.chapter = App.getChapter();
      },
      extra: { 2: [46] }
    },
    {
      nome: 'duo_holo',
      tipo: 'duo_ressonancia',
      cap: 'ch1_first_selection_x_y',
      prep() {},
      extra: { 0: [100, 103], 1: [128] }
    },
    {
      nome: 'duo_estadio',
      tipo: 'duo_ressonancia',
      cap: 'ch1_first_selection_x_y',
      prep() {
        window.Duo = Object.assign(window.Duo || {}, {
          castProfiles: () => ({
            a: { profile: { name: 'Ren Kagura', skinColor: '#c68a5e', hairColor: '#f8fafc', hairSecondary: '#94a3b8', hairStyle: 'spiky_tall', eyeColor: '#22c55e', number: 9 } },
            b: { profile: { name: 'Rei Kagura', skinColor: '#f1c9a5', hairColor: '#7c2d12', hairSecondary: '#ea580c', hairStyle: 'knight_wild', eyeColor: '#38bdf8', number: 11 } }
          })
        });
        // (o estádio da partida: na partida o tema vem do capítulo; aqui, direto no def)
        const d = CE.CINE3D.duo_ressonancia;
        J_TEMA = Object.getOwnPropertyDescriptor(d, 'theme');
        Object.defineProperty(d, 'theme', { configurable: true, enumerable: true, get: () => 'u20_national' });
      },
      depois() {
        if (J_TEMA) Object.defineProperty(CE.CINE3D.duo_ressonancia, 'theme', J_TEMA);
      },
      extra: { 0: [100, 103], 1: [128] }
    }
  ];

  // ---------------------------------------------------------------- folha
  const cv = document.getElementById('sakuga-action-canvas');
  const TW = 400, TH = 225, PAD = 8, LAB = 18;
  const luz = () => {
    // % quase preto e % estourado na área da imagem (entre as tarjas)
    try {
      const g = cv.getContext('2d');
      const top = Math.round(cv.height * 0.12);
      const d = g.getImageData(0, top, cv.width, cv.height - 2 * top).data;
      let preto = 0, branco = 0, n = 0;
      for (let i = 0; i < d.length; i += 4 * 7) {
        const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        if (y < 16) preto++;
        if (y > 250) branco++;
        n++;
      }
      return [Math.round((preto / n) * 100), Math.round((branco / n) * 100)];
    } catch (e) {
      return [-1, -1];
    }
  };
  const imgs = {};
  const rel = {};
  for (const J of JOBS) {
    if (SO.length && !SO.includes(J.nome)) continue;
    await cap(J.cap);
    J.prep();
    if (CE.sakugaActive) CE.finishSakuga();
    await wait(50);
    CE.cineFreeze(J.tipo, 0, 1);
    const ph = CE.getSakugaPhaseDurations().slice();
    const cols = 3 + Math.max(0, ...Object.values(J.extra || {}).map((a) => a.length));
    const sheet = document.createElement('canvas');
    sheet.width = PAD + cols * (TW + PAD);
    sheet.height = PAD + ph.length * (TH + LAB + PAD);
    const sg = sheet.getContext('2d');
    sg.fillStyle = '#0b0f19';
    sg.fillRect(0, 0, sheet.width, sheet.height);
    const luzes = [];
    for (let p = 0; p < ph.length; p++) {
      const ts = [0.12, 0.5, 0.88].map((f) => Math.max(1, Math.floor(ph[p] * f))).concat((J.extra && J.extra[p]) || []);
      for (let i = 0; i < ts.length; i++) {
        CE.cineFreeze(J.tipo, p, ts[i]);
        const [pr, br] = luz();
        luzes.push(`P${p + 1}t${ts[i]}:${pr}/${br}`);
        const x = PAD + i * (TW + PAD);
        const y = PAD + p * (TH + LAB + PAD);
        sg.drawImage(cv, x, y + LAB, TW, TH);
        sg.fillStyle = pr > 40 || br > 3 ? '#fca5a5' : '#e2e8f0';
        sg.font = '700 13px Inter, sans-serif';
        sg.fillText(`P${p + 1} • t ${ts[i]} / ${ph[p]}   preto ${pr}%  branco ${br}%`, x, y + 13);
        await wait(5);
      }
    }
    // um quadro grande do meio de cada plano (para conferir de perto)
    const big = [];
    for (let p = 0; p < ph.length; p++) {
      CE.cineFreeze(J.tipo, p, Math.floor(ph[p] * ((J.grande && J.grande[p]) ?? 0.5)));
      const c2 = document.createElement('canvas');
      c2.width = 960;
      c2.height = 540;
      c2.getContext('2d').drawImage(cv, 0, 0, 960, 540);
      big.push(c2);
    }
    CE.finishSakuga();
    if (J.depois) J.depois();
    ME.chapter = null;
    const chk = CE.roteiro.checar(J.tipo);
    rel[J.nome] = { planos: ph, segundos: +(ph.reduce((a, b) => a + b, 0) / 60).toFixed(2), picos: chk && chk.picos, avisos: chk && chk.avisos, luz: luzes.join(' ') };
    imgs[J.nome + '.jpg'] = sheet.toDataURL('image/jpeg', 0.85);
    big.forEach((c2, i) => (imgs[`${J.nome}_P${i + 1}.jpg`] = c2.toDataURL('image/jpeg', 0.85)));
    await wait(100);
  }
  const out = { resultado: errs.length ? 'FALHOU' : 'OK', rel, erros: errs.slice(0, 20), imgs };
  await wait(500);
  return out;
})()
