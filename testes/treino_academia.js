(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const ce0 = console.error.bind(console);
  console.error = (...a) => { errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300)); ce0(...a); };
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine, G = window.GymTraining;
  const clear = async (n = 60) => {
    for (let i = 0; i < n; i++) {
      const m = document.querySelector('#cinematic-modal.open');
      if (m) { const b = m.querySelector('.dilemma-buttons button, button'); if (b) b.click(); else App.closeCinematicModal?.(); }
      else if (CE.sakugaActive && CE.finishSakuga) CE.finishSakuga();
      else if (CE.active && CE.awaitingChoice && CE.choose) CE.choose(0);
      else if (CE.active && CE.next) CE.next();
      else if (i > 3) break;
      await wait(100);
    }
  };
  const key = (k, type) => window.dispatchEvent(new KeyboardEvent(type, { key: k, code: k === ' ' ? 'Space' : k, bubbles: true }));
  const tap = async () => { key(' ', 'keydown'); await wait(40); key(' ', 'keyup'); };
  const until = async (fn, ms = 8000) => { const t0 = Date.now(); while (!fn() && Date.now() - t0 < ms) await wait(30); return fn(); };
  H.glFix = true;
  App.startNewCareer(1, { name: 'Enjin Tsubaza' }, 'normal');
  await wait(300);
  App.closeTitleScreen();
  await clear();
  App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === 'ch2b_second_selection'));
  H._th = null;
  if (H.GL3D) H.GL3D.scale = window.__scale || 0.6;
  await wait(1000);
  App.state.trainingEnergy = 3;
  App.state.trainingRecords = { train_physical: { rank: 'S', best: 10, target: 10, runs: 2 } };
  const log = [];
  const drill = window.__drill || 'trn_supino';
  const st0 = Object.assign({}, App.state.stats);
  // abre pela aba, como o jogador
  App.switchTab('TREINO');
  await wait(800);
  if (window.__shotTab) { window.__shot('aba_treinos'); await wait(1500); }
  App.executeTraining(drill);
  log.push('energia depois de começar: ' + App.state.trainingEnergy + ' painel=' + H.panel + ' pos=' + H.px.toFixed(2) + ',' + H.py.toFixed(2));
  await wait(900);
  if (window.__shotVn) { window.__shot(drill + '_dialogo'); await wait(1500); }
  await clear();
  await until(() => G.active, 6000);
  log.push('ativo=' + G.active + ' fase=' + G.S?.phase);
  await wait(500);
  window.__shot(drill + '_1_intro'); await wait(1500);
  await until(() => G.S.phase === 'aim' || G.S.phase === 'hang', 9000);
  window.__shot(drill + '_2_comeco'); await wait(1500);
  const S = G.S;
  if (S.mode === 'bench') {
    for (let i = 0; i < (window.__reps || 4); i++) {
      await until(() => S.phase === 'aim' && S.phaseT > 8, 5000);
      S.cur = S.zone; S.dir = 1;
      await tap();
      await wait(120);
      if (i === 1) { window.__shot(drill + '_3_perfeito'); await wait(1500); }
    }
    log.push('reps=' + S.reps + ' combo=' + S.combo + ' tempo=' + S.timeLeft.toFixed(1));
    await until(() => S.phase === 'aim' && S.phaseT > 8, 5000);
    S.cur = Math.min(1, S.zone + S.zw + 0.12); if (Math.abs(S.cur - S.zone) <= S.zw) S.cur = Math.max(0, S.zone - S.zw - 0.12);
    S.dir = 1;
    await tap();
    await wait(400);
    window.__shot(drill + '_4_erro'); await wait(1500);
    log.push('depois do erro: fase=' + S.phase + ' cansaço=' + S.fat.toFixed(2) + ' combo=' + S.combo);
    await until(() => S.phase === 'aim' && S.phaseT > 8, 5000);
    S.cur = S.zone + S.zw * 0.7; await tap(); await wait(200);
    log.push('boa (não perfeita): reps=' + S.reps + ' combo=' + S.combo);
    await until(() => S.phase === 'aim' && S.phaseT > 8, 5000);
    window.__shot(drill + '_5_meio'); await wait(1500);
  } else {
    // barra fixa: segura com o cursor sempre dentro da faixa
    let reps0 = S.reps;
    let shotP = false;
    // (o cursor fica na faixa o tempo todo, até durante os prints: setInterval)
    const keep = setInterval(() => { if (S.phase === 'hang' || S.phase === 'down') { S.gy = S.band; S.gv = 0; } }, 8);
    key(' ', 'keydown');
    for (let i = 0; i < 400 && S.reps < (window.__reps || 3); i++) {
      if (i === 6 && S.reps === 0) { window.__shot(drill + '_3a_subindo'); await wait(1200); }
      if (S.reps >= 2 && !shotP) { shotP = true; window.__shot(drill + '_3_perfeito'); await wait(1200); }
      await wait(30);
    }
    clearInterval(keep);
    key(' ', 'keyup');
    log.push('barras=' + S.reps + ' combo=' + S.combo + ' tempo=' + S.timeLeft.toFixed(1));
    await until(() => S.phase === 'hang', 4000);
    // erro: cursor fora da faixa até escorregar
    for (let i = 0; i < 200 && S.phase !== 'slip'; i++) { S.gy = S.band > 0.5 ? 0.02 : 0.98; S.gv = 0; await wait(25); }
    log.push('escorregou: fase=' + S.phase + ' pegada=' + S.grip.toFixed(2));
    await wait(250);
    window.__shot(drill + '_4_erro'); await wait(1500);
    await until(() => S.phase === 'hang', 4000);
    window.__shot(drill + '_5_meio'); await wait(1500);
  }
  // termina pelo relógio
  S.timeLeft = 0.05;
  await until(() => document.getElementById('cinematic-modal')?.classList.contains('open'), 8000);
  await wait(800);
  window.__shot(drill + '_6_nota'); await wait(1500);
  const rec = App.state.trainingRecords;
  const gains = Object.keys(App.state.stats).filter((k) => App.state.stats[k] !== st0[k]).map((k) => k + '+' + (App.state.stats[k] - st0[k]));
  log.push('recorde=' + JSON.stringify(rec[drill]) + ' antigos guardados=' + !!rec.train_physical + ' ganhos=' + gains.join(','));
  log.push('depois: ativo=' + G.active + ' pos=' + H.px.toFixed(2) + ',' + H.py.toFixed(2) + ' area=' + H.area + ' hideK=' + JSON.stringify(H._3d.World.hideK));
  App.closeCinematicModal?.();
  await wait(1200);
  window.__shot(drill + '_7_mapa'); await wait(1500);
  if (window.__sw) {
    // sem placa de vídeo (GRÁFICO SIMPLES): a versão 2D do aparelho
    H.forceSW = true;
    App.state.trainingEnergy = 1;
    App.executeTraining(drill);
    await wait(600);
    await clear();
    await until(() => G.active, 6000);
    await until(() => G.S.phase === 'aim' || G.S.phase === 'hang', 9000);
    await wait(400);
    window.__shot(drill + '_8_2d'); await wait(1500);
    document.querySelector('.gym-quit').click(); await wait(200);
    document.querySelector('.gym-pause .out').click(); await wait(500);
    log.push('2D: saiu=' + !G.active);
    H.forceSW = false;
  }
  await wait(6500);
  return { log, errs };
})()
