(async () => {
  // PRINTS DA LEGENDA E DA TARJA (acabamento global das cenas, js/cine_kit.js): 3 cenas
  // diferentes, quadros com fala, grito, pensamento e fala longa. Os arquivos saem com
  // "antes" (kit antigo) ou "depois" (kit com digitação: CE.cineTypeRate existe).
  //   powershell -NoProfile -File testes\rodar.ps1 -teste legendas_fotos -saida C:\Users\Public\bl_f2motor\legendas -timeout 300000
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine;
  App.startNewCareer(1, { name: 'Teste' }, 'normal');
  await wait(300);
  App.closeTitleScreen();
  for (let i = 0; i < 60; i++) {
    const m = document.querySelector('#cinematic-modal.open');
    if (m) {
      const b = m.querySelector('.dilemma-buttons button, button');
      if (b) b.click();
    } else if (CE.sakugaActive) CE.finishSakuga();
    else if (CE.active) {
      if (CE.awaitingChoice) CE.choose(0);
      else CE.next();
    } else if (i > 4) break;
    await wait(80);
  }
  H.glFix = true;
  if (H.GL3D) H.GL3D.scale = 0.6;
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([document.fonts.load('22px "Jersey 10"'), document.fonts.load('700 22px Inter')]);
    } catch (e) {}
  }
  await wait(500);
  const fase = CE.cineTypeRate ? 'depois' : 'antes';
  // [cena, capítulo, plano, t, nome]
  const Q = [
    ['first_selection_awakening', 'ch2_first_selection_v', 0, 100, 'grito'],
    ['first_selection_awakening', 'ch2_first_selection_v', 1, 96, 'pensamento'],
    ['wildcard_door', 'ch5b_wild_card', 0, 120, 'narrador'],
    ['wildcard_door', 'ch5b_wild_card', 1, 66, 'digitando'],
    ['wildcard_door', 'ch5b_wild_card', 1, 38, 'digitando_meio'],
    ['itoshi_snow', 'ch4b_trio_tournament', 1, 300, 'fala_longa']
  ];
  const cv = document.getElementById('sakuga-action-canvas');
  const imgs = {};
  let tipo0 = null;
  for (const [type, ch, p, t, nome] of Q) {
    if (type !== tipo0) {
      if (CE.sakugaActive) CE.finishSakuga();
      App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === ch));
      H._th = null;
      await wait(150);
      CE.cineFreeze(type, 0, 1);
      tipo0 = type;
    }
    CE.cineFreeze(type, p, t);
    imgs[`${fase}_${type}_P${p + 1}_${nome}.png`] = cv.toDataURL('image/png');
    await wait(20);
  }
  CE.finishSakuga();
  await wait(300);
  return { resultado: errs.length ? 'FALHOU' : 'OK', fase, erros: errs, imgs };
})()
