(async () => {
  // GERADOR DOS SAVES SINTÉTICOS de testes/saves/ (nada aqui é o save real do dono).
  // Foi rodado UMA vez na versão de ANTES do js/save.js (85f9cf7), para guardar:
  //   testes/saves/<nome>.json           o texto do save, como o jogo gravou (ou estragado de propósito)
  //   testes/saves/esperado/<nome>.json  o App.state que o jogo de antes montava ao abrir esse save
  //                                       (loadState + renderAll). O teste saves.js exige o mesmo hoje.
  //   testes/saves/antes.json            o que o jogo de antes fazia com cada save estragado
  // Rodar de novo (só se os saves precisarem mudar):
  //   powershell -File testes\rodar.ps1 -teste gerar_saves -saida testes\saves
  // As carreiras são montadas pelo próprio jogo: startNewCareer, initLeague, recordLeagueRound,
  // unlockAchievement e saveState, com os capítulos avançados pelo estado.
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const App = window.App;
  const CE = window.CutsceneEngine;
  let seed = 20261112;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const KEY = App.SLOT_KEYS[1];
  const raw = () => localStorage.getItem(KEY);
  const chs = window.CAREER_CHAPTERS;
  const ids = chs.map((c) => c.id);
  const at = (id) => ids.indexOf(id);
  const copia = (o) => JSON.parse(JSON.stringify(o));
  const saves = {};
  const limpar = async () => {
    for (let i = 0; i < 30; i++) {
      const m = document.querySelector('#cinematic-modal.open');
      if (m) App.closeCinematicModal?.();
      else if (CE.sakugaActive) CE.finishSakuga();
      else if (CE.active) CE.finish();
      else break;
      await wait(30);
    }
  };
  // joga a liga do capítulo atual até o fim do turno (placares de verdade do motor da liga)
  const jogarLiga = (ate) => {
    let n = 0;
    while (App.lgState().games < ate && n++ < 20) {
      const m = App.nextLeagueMatch();
      if (!m) break;
      const [a, b] = [2 + (n % 2), n % 3 === 0 ? 2 : 1];
      App.recordLeagueRound(m.roundIdx, m.home ? a : b, m.home ? b : a, { rating: 7 + (n % 3) * 0.5, goals: a });
    }
  };

  // ------------------------------------------------------------------ 1. carreira nova
  App.startNewCareer(1, { name: 'Novato Teste', shirtName: 'NOVATO', number: 9 }, 'normal');
  await wait(400);
  await limpar();
  saves.novo = raw();

  // ------------------------------------------------------------------ 2. meio: Liga NEL, 2º turno
  const st = App.state;
  Object.assign(st.profile, { name: 'Meio Teste', shirtName: 'MEIO', number: 10, eyeStyle: 'default' });
  const upNel = at('ch7_nel_ubers_pxg');
  st.completedChapters = ids.slice(0, upNel);
  st.currentChapterIndex = upNel;
  st.blueLockEntered = true;
  st.nelUnlocked = true;
  st.nelClub = 'barcha';
  Object.keys(st.stats).forEach((k, i) => (st.stats[k] = 38 + i * 2));
  Object.assign(st.currencies, { egoCoins: 3450, spins: 4, luckySpins: 1, skillPoints: 6 });
  const armas = window.WEAPONS_DB.filter((w) => !w.secret);
  const fluxos = window.FLOWS_DB.filter((f) => !f.secret);
  st.equippedWeapon = Object.assign({}, armas[3]);
  st.equippedWeapon2 = Object.assign({}, armas[7]);
  st.equippedFlow = Object.assign({}, fluxos[2]);
  st.selectedNelEvolution = window.NEL_EVOLUTIONS[0].id;
  st.ownedAccessories = ['wristband'].concat(window.LOCKER_ITEMS.filter((it) => it.id !== 'wristband').slice(0, 3).map((it) => it.id));
  st.equippedAccessories = st.ownedAccessories.slice(0, 2);
  st.affinities.bachira = 92;
  st.affinities.nagi = 74;
  st.chapterResults = {};
  ids.slice(0, upNel).forEach((id, i) => (st.chapterResults[id] = i === 3 ? 'loss' : 'win'));
  st.dialogueChoices = { ch1_bachira_monstro: true, ch3_nagi_reo: true };
  st.trainingRecords = { sprint: { rank: 'A', best: 1820, target: 1500, runs: 3 } };
  st.easterEggs = { logo: true };
  Object.assign(st.career, { wins: 14, draws: 2, losses: 3, myGoals: 31, angleGoals: 2, longGoals: 1, dribbles: 18, steals: 6, bestRating: 8.7, hatTricks: 1 });
  st.careerGoals = 31;
  st.careerAssists = 9;
  st.careerMatches = 19;
  st.nelSalaryBid = 31 * 45000000;
  st.tutorial = { basic: true, advanced: true };
  st.trainingEnergy = 2;
  App.markPostMatchScenesSeen();
  App.enforceRivalries();
  App.initLeague();
  jogarLiga(5);
  App.unlockAchievement('ach_nel_unlock');
  App.unlockAchievement('ach_first_goal');
  App.saveState();
  await limpar();
  saves.meio_nel = raw();

  // ------------------------------------------------------------------ 3. meio: Torneio de Trios
  const trio = copia(JSON.parse(saves.meio_nel));
  Object.assign(trio.profile, { name: 'Trio Teste', shirtName: 'TRIO' });
  const upTrio = at('ch4b_trio_tournament');
  trio.completedChapters = ids.slice(0, upTrio);
  trio.currentChapterIndex = upTrio;
  Object.assign(trio, { nelUnlocked: false, nelClub: null, nel: null, equippedWeapon2: null, selectedNelEvolution: null });
  trio.trio = { chapterId: 'ch4b_trio_tournament', mates: ['bachira', 'chigiri'], round: 1 };
  trio.chapterResults = {};
  trio.completedChapters.forEach((id) => (trio.chapterResults[id] = 'win'));
  trio.unlockedAchievements = trio.unlockedAchievements.filter((a) => a !== 'ach_nel_unlock');
  saves.meio_trio = JSON.stringify(trio);

  // ------------------------------------------------------------------ 4. meio: Copa do Mundo, fase de grupos
  const upPro = at('ch12_pro_season_2');
  st.completedChapters = ids.slice(0, at('ch11_pro_season_1'));
  st.currentChapterIndex = at('ch11_pro_season_1');
  st.monsterUnlocked = true;
  st.proClub = 'real';
  st.pro = null;
  App.initLeague();
  jogarLiga(4);
  st.completedChapters.push('ch11_pro_season_1');
  st.currentChapterIndex = upPro;
  jogarLiga(8);
  st.completedChapters.push('ch12_pro_season_2', 'ch12b_wc_camp');
  st.currentChapterIndex = at('ch13_world_cup');
  st.completedChapters.forEach((id) => (st.chapterResults[id] = st.chapterResults[id] || 'win'));
  const wc = chs[at('ch13_world_cup')];
  const grp = wc.cupRounds.filter((r) => r.group);
  const outros = (g) => Object.keys(wc.groupTeams).filter((id) => id !== 'japao' && id !== g);
  st.cup = {
    chapterId: 'ch13_world_cup',
    round: 2,
    v: 2,
    group: { results: { [grp[0].group]: [2, 1], [grp[1].group]: [1, 1] }, sims: [App.simGroupGame(wc, ...outros(grp[0].group)), App.simGroupGame(wc, ...outros(grp[1].group))] }
  };
  st.equippedFlow2 = Object.assign({}, fluxos[5]);
  Object.keys(st.stats).forEach((k, i) => (st.stats[k] = 70 + (i % 5) * 3));
  st.currencies.egoCoins = 12880;
  st.profile.name = 'Copa Teste';
  st.profile.shirtName = 'COPA';
  App.markPostMatchScenesSeen();
  App.enforceRivalries();
  App.unlockAchievement('ach_u20_win');
  App.unlockAchievement('ach_england_u20');
  App.unlockAchievement('ach_four_egos');
  App.unlockAchievement('ach_monster');
  App.saveState();
  await limpar();
  saves.meio_copa = raw();

  // ------------------------------------------------------------------ 5. fim de jogo (campeão)
  st.completedChapters = ids.slice();
  st.currentChapterIndex = chs.length;
  st.cup = null;
  st.trio = null;
  ids.forEach((id) => (st.chapterResults[id] = 'win'));
  st.profile.name = 'Campeao Teste';
  st.profile.shirtName = 'CAMPEAO';
  st.unlockedWeapons = window.WEAPONS_DB.filter((w) => w.secret).slice(0, 2).map((w) => w.id);
  st.unlockedFlows = window.FLOWS_DB.filter((f) => f.secret).slice(0, 2).map((f) => f.id);
  st.easterEggs = { logo: true, fox: true, konami: true };
  st.career.selfies = 4;
  st.career.autographs = 7;
  st.fanMeets = { ch: 'ch14_rin_final', n: 3, total: 11 };
  st.cityClock = 5;
  st.prologueChoice = 'shoot';
  ['ach_world_cup', 'ach_ballon_dor', 'ach_pro_champion', 'ach_nel_champion', 'ach_top23'].forEach((a) => App.unlockAchievement(a));
  App.markPostMatchScenesSeen();
  App.saveState();
  await limpar();
  saves.fim = raw();

  // ------------------------------------------------------------------ 6. storyVersion 2 antigo
  // (antes do visual Isagi, do tutorial, do registro de resultados, da Copa com grupos, dos
  // amistosos ch12b e dos clubes profissionais novos)
  const v2 = copia(JSON.parse(saves.meio_copa));
  v2.storyVersion = 2;
  Object.assign(v2.profile, { name: 'Antigo Dois', hairStyle: 'spiky_tall', hairColor: '#0f172a', hairSecondary: '#2563eb', eyeColor: '#ef4444', dominantFoot: 'AMBOS' });
  v2.ambidextrousBorn = false;
  Object.keys(v2.stats).forEach((k) => (v2.stats[k] = 30));
  delete v2.tutorial;
  delete v2.chapterResults;
  delete v2.monsterUnlocked;
  v2.completedChapters = v2.completedChapters.filter((id) => id !== 'ch12b_wc_camp');
  v2.cup = { chapterId: 'ch13_world_cup', round: 1 };
  const volta = {};
  Object.entries(window.PRO_LEGACY_MAP).forEach(([velho, novo]) => (volta[novo] = velho));
  const old = (c) => volta[c] || c;
  v2.proClub = old(v2.proClub);
  v2.pro.rounds = v2.pro.rounds.map((pairs) => pairs.map((p) => p.map((c) => (c ? old(c) : c))));
  v2.pro.results = v2.pro.results.map((rs) => rs.map((r) => Object.assign({}, r, { a: old(r.a), b: old(r.b) })));
  const tb = {};
  Object.keys(v2.pro.table).forEach((c) => (tb[old(c)] = v2.pro.table[c]));
  v2.pro.table = tb;
  v2.equippedFlow = Object.assign({}, v2.equippedFlow, { desc: 'texto antigo do fluxo', passive: null });
  saves.v2_antigo = JSON.stringify(v2);

  // ------------------------------------------------------------------ 7. storyVersion 1 antigo
  // (índice da lista antiga de 10 capítulos, sem os campos que vieram depois)
  const legacy = ['ch0_prologue', 'ch1_first_selection_x_y', 'ch2_first_selection_v', 'ch3_second_selection_world5', 'ch4_third_selection', 'ch5_u20_japan', 'ch6_nel_barcha_manshine', 'ch7_nel_ubers_pxg', 'ch8_u20_england', 'ch9_world_cup_final'];
  const v1 = copia(JSON.parse(saves.novo));
  ['storyVersion', 'tutorial', 'chapterResults', 'career', 'unlockedAchievements', 'dialogueChoices', 'seenInterludes', 'trainingEnergy', 'ambidextrousBorn', 'difficulty', 'trio', 'nel', 'pro', 'cup', 'monsterUnlocked', 'unlockedFlows', 'equippedFlow2', 'selectedNelEvolution', 'nelClub', 'proClub'].forEach((k) => delete v1[k]);
  delete v1.currencies.luckySpins;
  delete v1.profile.eyeStyle;
  Object.assign(v1.profile, { name: 'Antigo Um', hairStyle: 'spiky_tall', hairColor: '#0f172a', hairSecondary: '#2563eb', eyeColor: '#ef4444' });
  v1.completedChapters = legacy.slice(0, 5);
  v1.currentChapterIndex = 5;
  v1.blueLockEntered = true;
  Object.keys(v1.stats).forEach((k, i) => (v1.stats[k] = 20 + i));
  v1.currencies.egoCoins = 900;
  saves.v1_antigo = JSON.stringify(v1);

  const v1n = copia(v1);
  v1n.profile.name = 'Antigo Um NEL';
  v1n.completedChapters = legacy.slice(0, 7);
  v1n.currentChapterIndex = 7;
  v1n.nelUnlocked = true;
  saves.v1_nel = JSON.stringify(v1n);

  // ------------------------------------------------------------------ 8. saves estragados
  const base = (n) => JSON.parse(saves[n]);
  const quebrados = {};
  quebrados.quebrado_cortado = saves.fim.slice(0, Math.floor(saves.fim.length * 0.6));
  quebrados.quebrado_lista = '[1,2,3]';
  const nulos = base('meio_nel');
  Object.assign(nulos, { completedChapters: null, unlockedAchievements: null, equippedAccessories: null, nel: {}, career: null, affinities: null, seenInterludes: null, stats: null });
  nulos.profile.name = 'Nulos Teste';
  quebrados.campos_null = JSON.stringify(nulos);
  const tipos = base('meio_copa');
  tipos.profile.name = 'Tipos Teste';
  Object.keys(tipos.stats).forEach((k) => (tipos.stats[k] = String(tipos.stats[k])));
  tipos.stats.ego = 'muito';
  Object.assign(tipos.currencies, { egoCoins: '1200', spins: 'abc', skillPoints: null });
  Object.assign(tipos, { trainingEnergy: '2', blueLockEntered: 'true', careerGoals: '12', selectedSquad: 'bachira', ownedAccessories: { 0: 'wristband' }, difficulty: 'impossivel', equippedWeapon: 'lâmina' });
  tipos.profile.number = '10';
  tipos.affinities.bachira = '90';
  tipos.cup.round = '2';
  quebrados.tipos_errados = JSON.stringify(tipos);
  const obj = base('fim');
  obj.profile.name = 'Objeto Teste';
  obj.completedChapters = Object.assign({}, obj.completedChapters);
  quebrados.capitulos_objeto = JSON.stringify(obj);
  const textoNum = base('meio_nel');
  textoNum.profile.name = 'Texto Teste';
  textoNum.stats.velocidade = '50';
  textoNum.currencies.egoCoins = '777';
  quebrados.numeros_texto = JSON.stringify(textoNum);
  const c999 = base('meio_nel');
  c999.profile.name = 'Cap999 Teste';
  c999.currentChapterIndex = 999;
  quebrados.capitulo_999 = JSON.stringify(c999);
  const cabc = base('meio_trio');
  cabc.profile.name = 'CapTexto Teste';
  cabc.currentChapterIndex = 'abc';
  quebrados.capitulo_texto = JSON.stringify(cabc);
  Object.assign(saves, quebrados);

  // ------------------------------------------------------------------ 9. o que o jogo de antes faz com cada um
  const esperado = {};
  const antes = {};
  for (const nome of Object.keys(saves)) {
    localStorage.setItem(KEY, saves[nome]);
    App.activeSlot = 1;
    App.state = null;
    const r = { erros: [] };
    try {
      App.loadState();
    } catch (e) {
      r.erros.push('loadState: ' + e.message);
    }
    try {
      App.renderAll();
    } catch (e) {
      r.erros.push('renderAll: ' + e.message);
    }
    try {
      r.menu = App.slotSummary(1);
    } catch (e) {
      r.erros.push('slotSummary: ' + e.message);
    }
    await limpar();
    const s = App.state;
    r.nome = s?.profile?.name;
    r.capitulo = s?.currentChapterIndex;
    r.moedas = s?.currencies?.egoCoins;
    r.concluidos = Array.isArray(s?.completedChapters) ? s.completedChapters.length : typeof s?.completedChapters;
    r.hasSave = App.hasSave;
    antes[nome] = r;
    if (!quebrados[nome]) esperado[nome] = JSON.stringify(s, null, 1);
  }
  localStorage.removeItem(KEY);

  const b64 = (t) => 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(t)));
  const imgs = {};
  Object.keys(saves).forEach((n) => (imgs[n + '.json'] = b64(saves[n])));
  Object.keys(esperado).forEach((n) => (imgs['esperado\\' + n + '.json'] = b64(esperado[n])));
  imgs['antes.json'] = b64(JSON.stringify({ versao: '85f9cf7 (antes do js/save.js)', saves: antes }, null, 1));
  return { imgs, gerados: Object.keys(saves), esperados: Object.keys(esperado), antes };
})()
