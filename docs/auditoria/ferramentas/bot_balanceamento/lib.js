// ===== Harness de simulação rápida (FASE 0, só leitura): relógio falso + bot =====
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ME = window.MatchEngine, App = window.App, CE = window.CutsceneEngine;
const CH = window.CAREER_CHAPTERS;
const errs = [];
window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno));
const ce0 = console.error.bind(console);
console.error = (...a) => { errs.push('console.error: ' + a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300)); };
// Para os laços de desenho do jogo (título, hub 3D, partida): só o nosso laço roda
window.requestAnimationFrame = () => 0;
await wait(400);
// Relógio falso: o cronômetro da partida usa performance.now()
let VT = 100000;
const realNow = performance.now.bind(performance);
performance.now = () => VT;
// Cenas viram callback imediato
const CBQ = [];
const cbNow = function (a, b) { CBQ.push(typeof b === 'function' ? b : a && a.onComplete); };
const drain = () => { let n = 0; while (CBQ.length && n++ < 50) { const f = CBQ.shift(); if (typeof f === 'function') { try { f(); } catch (e) { errs.push('cb: ' + String(e.stack || e).slice(0, 300)); } } } };
['playChemCutscene', 'playActionSakuga', 'playFlowCutscene', 'playShotCutscene', 'play'].forEach((k) => (CE[k] = cbNow));
CE.active = false; CE.sakugaActive = false;
ME.startSpecialMoment = null;
ME.draw = () => {};
ME.updateHUD = () => {};
window.SFX = null;
ME.openFullscreenOverlay = () => {};
ME.closeFullscreenOverlay = () => { ME.active = false; };
App.renderAll = () => {};
App.notify = () => {};
App.showGachaModal = () => {};
let AIM = { wx: 1650, wy: 0 };
ME.screenToWorld = () => AIM;
ME.mouse = ME.mouse || { x: 0, y: 0, down: false, charge: 0 };
const R = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const allStats = (v) => ({ velocidade: v, resistencia: v, forca: v, habilidadeAerea: v, finalizando: v, poderDisparo: v, tirosLongos: v, conducao: v, visao: v, posicionamento: v, compostura: v, ego: v });
const W = (id) => window.WEAPONS_DB.find((w) => w.id === id);
const F = (id) => window.FLOWS_DB.find((f) => f.id === id);

// ---- BOT: joga como um atacante "ok" (corre pro gol, dribla quando apertado, chuta na área,
// usa skill de chute, Fluxo e Química quando dá, dá carrinho no dono da bola, pede a bola)
const BOT = { shotDist: 430, charge: 55, useSkills: true, useFlow: true, useChem: true, dribble: true };
const setKeys = (dx, dy, sprint) => {
  ME.keys = {};
  const a = Math.atan2(dy, dx);
  const cx = Math.cos(a), cy = Math.sin(a);
  if (cx > 0.38) ME.keys.d = true; else if (cx < -0.38) ME.keys.a = true;
  if (cy > 0.38) ME.keys.s = true; else if (cy < -0.38) ME.keys.w = true;
  if (sprint) ME.keys.shift = true;
};
const bestKey = (types) => {
  const st = ME.playerState;
  const out = [];
  [[st.equippedWeapon, 0], [st.nelUnlocked ? st.equippedWeapon2 : null, 3]].forEach(([w, off]) => {
    (w?.skills || []).forEach((s, i) => { if (types.includes(s.type)) out.push({ k: String(i + 1 + off), s }); });
  });
  return out.filter((o) => !(ME.skillCooldowns[o.k] > 0));
};
const botStep = (f) => {
  const p = ME.playerEntity, b = ME.ball;
  if (!p || ME.goalPause > 0 || ME.replay) { ME.keys = {}; return; }
  const rivals = ME.entities.filter((e) => e.team === 'away' && !e.isGK);
  const gk = ME.entities.find((e) => e.team === 'away' && e.isGK);
  const sprintOk = ME.stamina > 38 && !ME.exhausted;
  if (b.owner === p) {
    const dGoal = Math.hypot(ME.PITCH_HALF_X - p.x, p.y);
    const aimY = gk && gk.y > 0 ? -72 : 72;
    AIM = { wx: ME.PITCH_HALF_X, wy: aimY };
    if (BOT.useFlow && ME.flowState.charge >= 100 && !ME.flowState.active && ME.playerState.equippedFlow) { ME.activateFlow(); return; }
    if (BOT.useChem && ME.chemCharge >= 60 && ME.inRivalBox(p)) { ME.triggerChemicalReaction(); return; }
    let near = null, nd = 1e9;
    rivals.forEach((e) => { const d = dist(e, p); if (d < nd && !(e.stunTimer > 0)) { nd = d; near = e; } });
    if (dGoal < BOT.shotDist) {
      const sk = BOT.useSkills ? bestKey(['shot']) : [];
      if (sk.length && dGoal < 520) { AIM = { wx: ME.PITCH_HALF_X, wy: aimY }; ME.useWeaponSkill(sk[0].k); return; }
      ME.shootTowardMouse(BOT.charge);
      return;
    }
    if (BOT.dribble && near && nd < 95) {
      const buff = BOT.useSkills ? bestKey(['buff']) : [];
      if (buff.length) { ME.useWeaponSkill(buff[0].k); }
      const dsk = BOT.useSkills ? bestKey(['dribble']) : [];
      const side = near.y > p.y ? -1 : 1;
      AIM = { wx: p.x + 220, wy: p.y + side * 110 };
      ME.keys = {};
      if (dsk.length && ME.stamina > 12) { ME.useWeaponSkill(dsk[0].k); return; }
      if (ME.dribbleCooldown <= 0 && ME.stamina > 12) { ME.dribbleMove(); return; }
    }
    const ty = Math.abs(p.y) > 150 ? 0 : p.y * 0.5;
    setKeys(ME.PITCH_HALF_X - 300 - p.x, ty - p.y, sprintOk);
    return;
  }
  if (b.owner && b.owner.team === 'home') {
    if (!(ME.callCooldown > 0) && f % 20 === 0) ME.callForPass();
    const tx = Math.min(ME.PITCH_HALF_X - 500, b.x + 250);
    setKeys(tx - p.x, (b.y > 0 ? -100 : 100) - p.y, sprintOk && Math.abs(tx - p.x) > 200);
    return;
  }
  if (b.owner && b.owner.team === 'away') {
    const o = b.owner;
    const d = dist(o, p);
    if (o.isGK) { setKeys(ME.PITCH_HALF_X - 600 - p.x, -p.y, false); return; }
    const dsk = BOT.useSkills ? bestKey(['defense']) : [];
    if (dsk.length && d < 140) { ME.useWeaponSkill(dsk[0].k); return; }
    if (d < 55 && !(ME.slideCooldown > 0) && ME.stamina > 15) { AIM = { wx: o.x, wy: o.y }; ME.slideTackle(); return; }
    setKeys(o.x - 20 - p.x, o.y - p.y, sprintOk);
    return;
  }
  // bola solta
  setKeys(b.x + b.vx * 6 - p.x, b.y + b.vy * 6 - p.y, sprintOk);
};

// Joga a partida atual até acabar (ou maxFrames). Devolve placar e estatísticas
const runMatch = async (maxFrames = 60 * 60 * 9) => {
  let f = 0;
  drain();
  while (ME.active && f < maxFrames) {
    drain();
    if (!ME.active) break;
    if (ME.paused) {
      // modal do prólogo / pausa: escolhe "passar"
      if (ME.chapter?.id === 'ch0_prologue') { App.resolvePrologueChoice('pass'); }
      ME.paused = false;
    }
    if (ME.tutorial) ME.endTutorial(true);
    if (ME.replay) ME.endReplay();
    if (f % 2 === 0) botStep(f);
    try { ME.update(); } catch (e) { errs.push('update: ' + String(e.stack || e).slice(0, 300)); break; }
    VT += 1000 / 60;
    f++;
    if (f % 3000 === 0) await wait(0);
  }
  return f;
};

// Partida isolada (sem avançar a carreira): capítulo + build + dificuldade
const RES = [];
let lastRes = null;
const recorder = (won, gf, ga) => { lastRes = { won, gf, ga, rep: ME.lastReport }; };
const setupState = (o) => {
  const s = App.state;
  s.difficulty = o.diff || 'normal';
  s.stats = Object.assign(allStats(0), o.stats || {});
  s.equippedWeapon = o.w1 ? W(o.w1) : null;
  s.equippedWeapon2 = o.w2 ? W(o.w2) : null;
  s.equippedFlow = o.f1 ? F(o.f1) : null;
  s.equippedFlow2 = o.f2 ? F(o.f2) : null;
  s.nelUnlocked = !!o.nel;
  s.monsterUnlocked = !!o.monster;
  s.selectedNelEvolution = o.evo || null;
  s.profile.dominantFoot = o.amb ? 'AMBOS' : 'DIREITA';
  s.tutorial = { basic: true, advanced: true };
  if (o.aff) Object.assign(s.affinities, o.aff);
};
const playOne = async (chId, o, chOverride = null) => {
  setupState(o);
  const idx = CH.findIndex((c) => c.id === chId);
  const base = CH[idx];
  App.state.currentChapterIndex = idx;
  let ch;
  if (base.format === 'trio') ch = Object.assign({}, base, base.trioRounds[o.round || 0], { teammateIds: (o.mates || base.trioPool.slice(0, 2)) });
  else {
    if (base.format === 'cup') App.state.cup = { chapterId: base.id, round: o.round || 0, v: 2, group: null };
    if (base.nelPhase !== undefined) App.state.nelClub = o.club || 'bastard';
    if (base.league === 'pro') App.state.proClub = o.club || 'real';
    if (base.format === 'league') { App.state.nel = null; App.state.pro = null; App.initLeague(); }
    ch = App.getChapter(idx);
  }
  if (chOverride) ch = Object.assign({}, ch, chOverride);
  lastRes = null;
  const keep = App.onMatchFinished;
  App.onMatchFinished = recorder;
  ME.startMatch(ch, App.state);
  if (ME.tutorial) ME.endTutorial(true);
  const frames = await runMatch();
  drain();
  App.onMatchFinished = keep;
  if (ME.active) { ME.active = false; return { to: true, gf: ME.scoreHome, ga: ME.scoreAway, frames }; }
  const r = lastRes || { won: null, gf: ME.scoreHome, ga: ME.scoreAway };
  const st = r.rep || {};
  return { won: r.won, gf: r.gf, ga: r.ga, frames, my: st.goals || 0, sh: st.shots || 0, ot: st.onTarget || 0, dr: st.dribbles || 0, stl: st.steals || 0, rating: st.rating };
};
App.startNewCareer(2, { name: 'Bot' }, 'normal');
App.closeTitleScreen?.();
CE.active = false; CE.sakugaActive = false;
document.getElementById('cinematic-modal')?.classList.remove('open');
