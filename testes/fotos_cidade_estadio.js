(async () => {
  // Fotos da cidade com o estádio (liga pro): a arquibancada invade a cidade?
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine;
  App.startNewCareer(1, { name: 'Teste' }, 'normal');
  await wait(300);
  App.closeTitleScreen();
  for (let i = 0; i < 60; i++) {
    const m = document.querySelector('#cinematic-modal.open');
    if (m) { const b = m.querySelector('.dilemma-buttons button, button'); if (b) b.click(); }
    else if (CE.sakugaActive) CE.finishSakuga();
    else if (CE.active) { if (CE.awaitingChoice) CE.choose(0); else CE.next(); }
    else if (i > 4) break;
    await wait(80);
  }
  H.glFix = true;
  H.GL3D.scale = 0.5;
  App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === 'ch11_pro_season_1'));
  H._th = null;
  await wait(3000);
  const W = H._3d.World;
  const pts = [
    ['praca_olhando_norte', 52, 41, -Math.PI / 2],
    ['rua_olhando_nordeste', 30, 40, -Math.PI / 4],
    ['avenida_olhando_norte', 30, 62, -Math.PI / 2],
    ['portaria_saindo', 13.5, 37, -Math.PI / 2],
    ['campo_olhando_sul', 52, 18, Math.PI / 2]
  ];
  for (const [nome, x, y, a] of pts) {
    H.px = x; H.py = y; H.ang = a; H.camA = a;
    H.area = W.areaAt(x, y) || H.area;
    await wait(2500);
    window.__shot(nome);
    await wait(1500);
  }
  await wait(6000);
  return { erros: errs };
})()
