// Reproduções pontuais (estado em memória de um Chrome descartável)
const out = {};
App.renderAll = () => { try { App.checkAchievements(); } catch (e) {} };
App.showTrainingResult = () => {};
const modal = () => document.getElementById('cinematic-modal');
// 1) Finais com clímax roteirizado: dá para perder? (bot com atributos 0 no Egoísta)
out.climax = [];
for (const id of ['ch5_u20_japan', 'ch9_world_cup_final']) {
  for (let k = 0; k < 3; k++) {
    const r = await playOne(id, { diff: 'egoista', stats: allStats(0) });
    out.climax.push(`${id}: venceu=${r.won} ${r.gf}x${r.ga}`);
  }
}
// 1b) mesmo o bot parado (não toca na bola)
{
  const keep = botStep;
  setupState({ diff: 'egoista', stats: allStats(0) });
  const idx = CH.findIndex((c) => c.id === 'ch5_u20_japan');
  App.state.currentChapterIndex = idx;
  lastRes = null;
  const k0 = App.onMatchFinished; App.onMatchFinished = recorder;
  ME.startMatch(App.getChapter(idx), App.state);
  let f = 0; drain();
  while (ME.active && f < 60 * 60 * 6) { drain(); if (!ME.active) break; ME.keys = {}; if (ME.replay) ME.endReplay(); ME.update(); VT += 1000 / 60; f++; if (f % 3000 === 0) await wait(0); }
  drain();
  App.onMatchFinished = k0;
  out.climaxParado = lastRes ? `parado no Egoísta: venceu=${lastRes.won} ${lastRes.gf}x${lastRes.ga}` : 'sem resultado';
}
// 2) Liga NEL perdendo os 8 jogos: avança mesmo assim?
{
  App.startNewCareer(1, { name: 'Perdedor' }, 'normal');
  const i6 = CH.findIndex((c) => c.id === 'ch6_nel_barcha_manshine');
  Object.assign(App.state, { currentChapterIndex: i6, completedChapters: CH.slice(0, i6).map((c) => c.id), blueLockEntered: true, nelUnlocked: true, nelClub: 'bastard', tutorial: { basic: true, advanced: true } });
  App.initLeague();
  const log = [];
  for (let g = 0; g < 12 && App.state.currentChapterIndex <= i6 + 1; g++) {
    const ch = App.getChapter();
    if (ch.leagueTurnDone) { App.launchChapterMatch(); drain(); log.push('turno fechado'); continue; }
    ME.chapter = ch; ME.lastReport = null;
    App.onMatchFinished(false, 0, 3);
    drain();
    if (App.pendingLeagueFinish) { App.finishLeagueTurn(); drain(); }
    modal().classList.remove('open');
    log.push(`jogo ${App.state.nel?.games} idx=${App.state.currentChapterIndex}`);
  }
  const rk = App.leagueValueRanking ? (() => { try { return App.state.nel ? Object.entries(App.state.nel.values).sort((a, b) => b[1] - a[1]).findIndex(([id]) => id === 'you') + 1 : null; } catch (e) { return 'x'; } })() : null;
  out.nelPerdendo = { log, capAgora: CH[App.state.currentChapterIndex]?.id, completou: App.state.completedChapters.slice(-2), seuValor: App.state.nel?.values?.you, posValor: rk, corte: window.NEL_CUTOFF };
}
// 3) Treino de Química: quem ganha os +10%?
{
  App.startNewCareer(1, { name: 'Quimica' }, 'normal');
  const i6 = CH.findIndex((c) => c.id === 'ch6_nel_barcha_manshine');
  Object.assign(App.state, { currentChapterIndex: i6, blueLockEntered: true, nelUnlocked: true, nelClub: 'bastard' });
  const mates = App.getChapter().teammateIds;
  const before = Object.assign({}, App.state.affinities);
  const dr = window.TRAINING_DRILLS.find((d) => d.id === 'train_chemical');
  App.onTrainingMinigameFinished(dr, 5, { target: 5, timeLeft: 5 });
  modal().classList.remove('open');
  const ch = {};
  Object.keys(App.state.affinities).forEach((k) => { if (App.state.affinities[k] !== before[k]) ch[k] = `${before[k] ?? 'nd'}→${App.state.affinities[k]}`; });
  out.treinoQuimica = { companheirosNoCampo: mates, selectedSquad: App.state.selectedSquad, mudou: ch, companheirosMudaram: mates.filter((m) => ch[m]) };
}
// 4) OVR da arma: o card diz +ovrBonus
{
  App.startNewCareer(1, { name: 'Ovr' }, 'normal');
  App.state.blueLockEntered = true;
  const o0 = App.calculateOVR();
  App.state.equippedWeapon = W('wp_wc_kaiser');
  const o1 = App.calculateOVR();
  App.state.equippedFlow = F('fl_wc_quatro_egos');
  const o2 = App.calculateOVR();
  out.ovrArma = { semNada: o0, comArmaWC: o1, cardDiz: '+' + window.RARITY_TIERS.WORLD_CLASS.ovrBonus, comFluxoWC: o2, statBoostsKaiser: W('wp_wc_kaiser').statBoosts };
}
// 5) Derrota num capítulo da história: o que paga
{
  App.startNewCareer(1, { name: 'Derrota' }, 'normal');
  const i2 = CH.findIndex((c) => c.id === 'ch2_first_selection_v');
  Object.assign(App.state, { currentChapterIndex: i2, blueLockEntered: true, trainingEnergy: 0, tutorial: { basic: true, advanced: true } });
  const s = App.state;
  const b = { c: s.currencies.egoCoins, sp: s.currencies.skillPoints, e: s.trainingEnergy, st: Object.values(s.stats).reduce((a, x) => a + x, 0) };
  const r = await playOne('ch2_first_selection_v', { diff: 'egoista', stats: allStats(0) });
  // o playOne grava só o resultado; aplica a derrota de verdade
  s.difficulty = 'normal';
  ME.chapter = App.getChapter(i2);
  ME.lastReport = { grade: '6.0', rating: 6, color: '#fff', bonus: 30, gains: { resistencia: 1, conducao: 1 }, goals: 0, angleGoals: 0, longGoals: 0, shots: 2, onTarget: 1, dribbles: 2, passes: 1, steals: 0, skills: 0, conceded: 3 };
  App.onMatchFinished(false, 0, 3);
  drain();
  const a = { c: s.currencies.egoCoins, sp: s.currencies.skillPoints, e: s.trainingEnergy, st: Object.values(s.stats).reduce((x, y) => x + y, 0) };
  // os 3 treinos que a derrota libera (nota A)
  let tc = 0, tst = 0, tsp = 0;
  for (const dr of window.TRAINING_DRILLS.slice(0, 3)) {
    const c0 = s.currencies.egoCoins, st0 = Object.values(s.stats).reduce((x, y) => x + y, 0), sp0 = s.currencies.skillPoints;
    s.trainingEnergy--;
    App.onTrainingMinigameFinished(dr, dr.target, { target: dr.target, timeLeft: 5 });
    modal().classList.remove('open');
    tc += s.currencies.egoCoins - c0; tst += Object.values(s.stats).reduce((x, y) => x + y, 0) - st0; tsp += s.currencies.skillPoints - sp0;
  }
  out.derrota = { botNoEgoistaZerado: `${r.gf}x${r.ga}`, moedas: a.c - b.c, sp: a.sp - b.sp, energia: `${b.e}→${a.e}`, atributosDaPartida: a.st - b.st, treinosA: { moedas: tc, atributos: tst, sp: tsp }, aindaNoCap: CH[s.currentChapterIndex].id, botaoTentar: !!document.querySelector('#cinematic-modal-content .shoot-choice') };
  modal().classList.remove('open');
}
// 6) Conteúdo: escolhas e efeitos do prólogo
out.prologo = 'pass e shoot dão +6 ego e +3 giros iguais (resolvePrologueChoice)';
return { out, errs: [...new Set(errs)].slice(0, 12) };
