(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const ce0 = console.error.bind(console);
  console.error = (...a) => { errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300)); ce0(...a); };
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine, ME = window.MatchEngine;
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
  const until = async (fn, ms = 8000) => { const t0 = Date.now(); ms *= (window.__slow || 2.5); while (!fn() && Date.now() - t0 < ms) await wait(25); return fn(); };
  H.glFix = true;
  App.startNewCareer(1, { name: 'Enjin Tsubaza' }, 'normal');
  await wait(300);
  App.closeTitleScreen();
  await clear();
  App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === 'ch2b_second_selection'));
  H._th = null;
  if (H.GL3D) H.GL3D.scale = 0.5;
  await wait(800);
  App.state.trainingEnergy = 3;
  const log = [];
  const shootGoal = () => {
    const p = ME.playerEntity, b = ME.ball;
    b.owner = null; b.passTarget = null; b.x = p.x + 10; b.y = p.y; b.z = 5;
    const dx = ME.PITCH_HALF_X - b.x, dy = 40 - b.y, d = Math.hypot(dx, dy);
    b.vx = (dx / d) * 22; b.vy = (dy / d) * 22; b.vz = 1.2; b.spin = 0; b.curve = 0;
    ME.markKick(p);
    ME.entities.filter((e) => e.isGK).forEach((g) => { g.y = -90; g.saveLock = 999; });
  };
  let holdTimer = null;
  const holdD = (on) => { clearInterval(holdTimer); ME.keys['d'] = on; if (on) holdTimer = setInterval(() => (ME.keys['d'] = true), 50); };
  const which = window.__which || 'both';
  if (which !== 'rondo') {
    // ---------------- CORREDOR DE DRIBLE (o drible é apertado de dentro do laço do jogo:
    // a máquina de teste é lenta e um aperto por fora chegava atrasado)
    const banners = [];
    const sb0 = ME.showBanner.bind(ME);
    ME.showBanner = function (t, s, c, d) { banners.push(t); return sb0(t, s, c, d); };
    let auto = 'perfect';
    const gt0 = ME.trnGauntletTick.bind(ME);
    ME.trnGauntletTick = function (p) {
      gt0(p);
      const b = (ME.trnBots || []).find((x) => x.st === 'tele');
      if (!b) return;
      if (auto === 'perfect' && b.t === b.td - 1) ME.dribbleMove();
      if (auto === 'early' && b.t === 2) ME.dribbleMove();
    };
    App.executeTraining('trn_drible');
    await wait(700);
    await clear();
    await until(() => ME.active, 6000);
    await wait(1500);
    window.__shot('drible_1_comeco'); await wait(1200);
    const bots = ME.trnBots;
    holdD(true);
    auto = 'off';
    await until(() => bots[0].st === 'tele' && bots[0].t >= bots[0].td * 0.5, 6000);
    ME.paused = true; window.__shot('drible_2_anel'); await wait(1200); ME.paused = false;
    auto = 'perfect';
    await until(() => bots[0].st === 'down', 4000);
    await wait(80);
    ME.paused = true; window.__shot('drible_3_perfeito'); await wait(1200); ME.paused = false;
    await until(() => ME.trnPhase === 'shoot', 12000);
    holdD(false);
    log.push('depois dos 3: fase=' + ME.trnPhase + ' pontos=' + ME.trainingScore + ' combo=' + ME.trnCombo + ' robôs=' + bots.map((b) => b.st).join(','));
    shootGoal();
    await until(() => ME.trnPhase === 'run' && ME.trainingScore >= 5, 4000);
    log.push('depois do gol: pontos=' + ME.trainingScore + ' volta=' + ME.trnLap + ' fase=' + ME.trnPhase + ' tempo=' + ME.timeLeft + ' td novo=' + Math.max(20, 34 - ME.trnLap * 4));
    // erro: chega no robô e não dribla
    auto = 'off';
    holdD(true);
    await until(() => ME.trnPhase === 'wait', 8000);
    holdD(false);
    await wait(100);
    ME.paused = true; window.__shot('drible_4_erro'); await wait(1200); ME.paused = false;
    log.push('sem drible: fase=' + ME.trnPhase + ' dono=' + (ME.ball.owner && ME.ball.owner.id));
    // erro cedo: dribla logo que o anel aparece
    await until(() => ME.trnPhase === 'run', 4000);
    auto = 'early';
    holdD(true);
    await until(() => ME.trnPhase === 'wait', 8000);
    holdD(false);
    log.push('cedo demais: lido=' + bots[0].read + ' fase=' + ME.trnPhase + ' dono=' + (ME.ball.owner && ME.ball.owner.id));
    log.push('avisos: ' + banners.join(' | '));
    auto = 'off';
    ME.timeLeft = 1;
    await until(() => document.getElementById('cinematic-modal')?.classList.contains('open'), 8000);
    await wait(700);
    window.__shot('drible_5_nota'); await wait(1200);
    log.push('recorde drible=' + JSON.stringify(App.state.trainingRecords.trn_drible));
    App.closeCinematicModal?.();
    await wait(600);
  }
  if (which !== 'drible') {
    // ---------------- RONDO
    App.executeTraining('trn_rondo');
    await wait(700);
    await clear();
    await until(() => ME.active, 6000);
    await wait(1200);
    window.__shot('rondo_1_comeco'); await wait(1200);
    for (let k = 0; k < 2; k++) {
      await until(() => ME.trnPhase === 'pass' && ME.ball.owner === ME.playerEntity, 5000);
      const free = ME.trnMates.find((m) => m !== ME.trnCovered);
      ME.kickPass(ME.playerEntity, free, '#facc15');
      await until(() => ME.trnPhase === 'read', 4000);
      if (k === 0) { await wait(100); window.__shot('rondo_2_ponto'); await wait(900); }
      // corre até o ponto
      const sp = ME.trnSpot;
      { const p = ME.playerEntity; p.x = sp.x - 8; p.y = sp.y; }
      await until(() => ME.trnPhase === 'shoot' || ME.trnPhase === 'wait', 6000);
      if (k === 0) { ME.paused = true; window.__shot('rondo_2b_leu'); await wait(1200); ME.paused = false; }
      log.push(`rondo ${k}: fase=${ME.trnPhase} dono=${ME.ball.owner && ME.ball.owner.id}`);
      await until(() => ME.trnPhase === 'shoot', 3000);
      shootGoal();
      if (k === 0) { await until(() => ME.trainingScore >= 1, 3000); ME.paused = true; window.__shot('rondo_2c_gol'); await wait(1200); ME.paused = false; }
      await wait(900);
      log.push(`gol de fora ${k}: pontos=${ME.trainingScore} combo=${ME.trnCombo}`);
    }
    // erro: passa para o marcado
    await until(() => ME.trnPhase === 'pass' && ME.ball.owner === ME.playerEntity, 5000);
    ME.kickPass(ME.playerEntity, ME.trnCovered, '#facc15');
    await until(() => ME.trnPhase === 'wait', 4000);
    await wait(150);
    window.__shot('rondo_3_cortou'); await wait(900);
    log.push('passe no marcado: fase=' + ME.trnPhase + ' dono=' + (ME.ball.owner && ME.ball.owner.id));
    ME.timeLeft = 1;
    await until(() => document.getElementById('cinematic-modal')?.classList.contains('open'), 8000);
    await wait(700);
    window.__shot('rondo_4_nota'); await wait(1200);
    log.push('recorde rondo=' + JSON.stringify(App.state.trainingRecords.trn_rondo) + ' energia=' + App.state.trainingEnergy);
  }
  await wait(6500);
  return { log, errs };
})()
