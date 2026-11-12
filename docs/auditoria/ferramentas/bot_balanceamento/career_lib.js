// ===== Carreira inteira jogada pelo bot (treinos simulados com nota A, SP e giros por estratégia) =====
App.renderAll = () => { try { App.checkAchievements(); } catch (e) {} };
App.showTrainingResult = () => {};
App.playSpinReelAnimation = () => {};
const modalEl = () => document.getElementById('cinematic-modal');
const modalOpen = () => modalEl().classList.contains('open');
const modalHtml = () => document.getElementById('cinematic-modal-content').innerHTML;
const RANKS = ['COMUM', 'INCOMUM', 'RARO', 'EPICO', 'LENDARIO', 'MITICO', 'WORLD_CLASS'];
const rk = (x) => (x ? RANKS.indexOf(x.rarity) : -1);
const KEYS = ['velocidade', 'resistencia', 'forca', 'habilidadeAerea', 'finalizando', 'poderDisparo', 'tirosLongos', 'conducao', 'visao', 'posicionamento', 'compostura', 'ego'];
const sumStats = () => KEYS.reduce((a, k) => a + (App.state.stats[k] || 0), 0);
const spendSP = (strat) => {
  const s = App.state;
  while (s.currencies.skillPoints > 0) {
    let k;
    if (strat === 'fin') k = 'finalizando';
    else if (strat === 'shoot3') { const ks = ['finalizando', 'compostura', 'poderDisparo']; k = ks.sort((a, b) => s.stats[a] - s.stats[b])[0]; }
    else if (strat === 'none') return;
    else k = KEYS.slice().sort((a, b) => s.stats[a] - s.stats[b])[0];
    s.currencies.skillPoints--;
    s.stats[k]++;
  }
};
const doSpins = (cfg) => {
  const s = App.state;
  if (!s.blueLockEntered) return;
  let guard = 0;
  while (s.currencies.spins > 0 && guard++ < 50) {
    if (rk(s.equippedWeapon) < cfg.keepAt) { App.spinWeaponGacha(1, true); continue; }
    if (rk(s.equippedFlow) < cfg.keepAt) { App.spinFlowGacha(1, true); continue; }
    if (s.nelUnlocked && rk(s.equippedWeapon2) < cfg.keepAt) { App.spinWeaponGacha(2, true); continue; }
    if (s.nelUnlocked && rk(s.equippedFlow2) < cfg.keepAt) { App.spinFlowGacha(2, true); continue; }
    break;
  }
  if (s.nelUnlocked && !s.selectedNelEvolution && window.NEL_EVOLUTIONS[0]) App.selectNelEvolution(window.NEL_EVOLUTIONS[0].id);
};
const DRILLS = window.TRAINING_DRILLS;
let drillN = 0;
const doTrainings = (cfg) => {
  const s = App.state;
  let n = 0;
  while ((s.trainingEnergy ?? 3) > 0 && n < 5) {
    n++;
    const dr = DRILLS[drillN++ % DRILLS.length];
    s.trainingEnergy--;
    const target = dr.target || 5;
    App.onTrainingMinigameFinished(dr, cfg.trainScore === 'B' ? Math.ceil(target * 0.6) : target, { target, timeLeft: cfg.trainScore === 'S' ? 12 : 5 });
    modalEl().classList.remove('open');
  }
};
const runCareer = async (cfg) => {
  App.startNewCareer(cfg.slot || 1, { name: 'Bot ' + cfg.name }, cfg.diff);
  App.state.tutorial = { basic: true, advanced: true };
  modalEl().classList.remove('open');
  const log = [], perCh = {}, events = [];
  const attempts = {};
  let matches = 0, steps = 0, forced = 0, realMs = realNow();
  const keyOf = (ch) => {
    if (ch.format === 'trio') return ch.id + ':r' + (App.state.trio?.round ?? 0);
    if (ch.format === 'cup') return ch.id + ':c' + ch.cupIdx;
    if (ch.leagueMatch) return ch.id + ':g' + App.lgState().games;
    return ch.id;
  };
  while (steps++ < 4000) {
    drain();
    if (ME.active) {
      const ch = ME.chapter;
      const key = keyOf(ch);
      attempts[key] = (attempts[key] || 0) + 1;
      const s = App.state;
      const before = { c: s.currencies.egoCoins, sp: s.currencies.skillPoints, st: sumStats() };
      let r;
      if (attempts[key] > (cfg.cap || 10)) {
        ME.scoreHome = 9; ME.scoreAway = 0; forced++;
        ME.finishMatch();
        r = { forced: true };
      } else {
        await runMatch();
        r = { gf: ME.scoreHome, ga: ME.scoreAway };
      }
      matches++;
      const e = { key, att: attempts[key], res: r.forced ? 'FORÇADO' : r.gf + 'x' + r.ga, ovr: App.calculateOVR() };
      log.push(e);
      const pc = (perCh[ch.id] = perCh[ch.id] || { games: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, forced: 0 });
      pc.games++;
      if (r.forced) pc.forced++;
      else { if (r.gf > r.ga) pc.w++; else if (r.gf === r.ga) pc.d++; else pc.l++; pc.gf += r.gf; pc.ga += r.ga; }
      continue;
    }
    if (modalOpen()) {
      const html = modalHtml();
      if (html.includes('trio-confirm-btn')) {
        const ch = CH[App.state.currentChapterIndex];
        const pool = ch.trioPool.filter((id) => window.BLUE_LOCK_CHARACTERS.find((c) => c.id === id));
        pool.slice(0, 2).forEach((id) => App.toggleTrioPick(id));
        App.confirmTrio();
        continue;
      }
      if (html.includes('confirmNelClub')) { App.pickNelClub(cfg.nelClub || 'bastard'); App.confirmNelClub(); events.push('nel:' + App.state.nelClub); continue; }
      if (html.includes('confirmProOffer')) { App.pickProOffer(cfg.proClub || 'real'); App.confirmProOffer(); events.push('pro:' + App.state.proClub); continue; }
      if (html.includes('resolvePrologueChoice')) { App.resolvePrologueChoice('pass'); continue; }
      const c = document.getElementById('cinematic-modal-content');
      const b = c.querySelector('.btn-dilemma.shoot-choice') || c.querySelector('.reel-cta') || c.querySelector('button');
      if (b) b.click(); else App.closeCinematicModal();
      continue;
    }
    if (App.state.currentChapterIndex >= CH.length) break;
    const ch0 = CH[App.state.currentChapterIndex];
    // antes de jogar: treinos (a energia volta a cada partida), SP e giros
    if (App.state.blueLockEntered && !cfg.noTrain) doTrainings(cfg);
    spendSP(cfg.strat);
    doSpins(cfg);
    if (!perCh[ch0.id] || perCh[ch0.id].games === 0) {
      const s = App.state;
      perCh[ch0.id] = perCh[ch0.id] || { games: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, forced: 0 };
      Object.assign(perCh[ch0.id], { ovr0: App.calculateOVR(), st0: sumStats(), coins0: s.currencies.egoCoins, spins0: s.currencies.spins, sp0: s.currencies.skillPoints, wr: s.equippedWeapon?.rarity || '-', fr: s.equippedFlow?.rarity || '-', fin0: s.stats.finalizando, achs: s.unlockedAchievements.length });
    }
    App.launchChapterMatch();
    drain();
    if (!ME.active && !modalOpen()) { events.push('nada abriu em ' + ch0.id); break; }
  }
  const s = App.state;
  return {
    name: cfg.name, diff: cfg.diff, strat: cfg.strat, matches, forced, ms: Math.round(realNow() - realMs), end: (CH[s.currentChapterIndex] || {}).id || 'FIM',
    final: { ovr: App.calculateOVR(), st: sumStats(), coins: s.currencies.egoCoins, spins: s.currencies.spins, lucky: s.currencies.luckySpins, sp: s.currencies.skillPoints, w: s.equippedWeapon?.rarity, f: s.equippedFlow?.rarity, ach: s.unlockedAchievements.length, career: s.career, stats: s.stats, nelVal: s.nel?.values?.you, proVal: s.pro?.values?.you },
    perCh, events: events.slice(0, 20), attemptsMax: Object.entries(attempts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  };
};
