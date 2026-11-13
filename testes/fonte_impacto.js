(async () => {
  // PRINTS DA FONTE DE IMPACTO (CUTSCENE_STYLE §1.3): cartela final, onomatopeia e letreiros
  // dos ajudantes compartilhados (CE.cineTitleCard, CE.cineImpactText, CE.luckKicker,
  // CE.finKicker) em 4 cenas. Sai "antes" (kit antigo) ou "depois" (CE.cinePixelText existe).
  //   powershell -NoProfile -File testes\rodar.ps1 -teste fonte_impacto -saida C:\Users\Public\bl_f2motor\fonte -timeout 600000
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
  try {
    await Promise.all([document.fonts.load('40px "Jersey 10"'), document.fonts.load('600 16px Inter')]);
  } catch (e) {}
  await wait(500);
  const fase = CE.cinePixelText ? 'depois' : 'antes';
  // [cena, capítulo, [[plano, t, ensaio?], ...]]
  const Q = [
    ['itoshi_snow', 'ch4b_trio_tournament', [[4, 289, 262], [5, 255]]],
    ['u20_direct_shoot', 'ch5_u20_japan', [[8, 98], [10, 40], [11, 140]]],
    ['wildcard_door', 'ch5b_wild_card', [[0, 150], [5, 212]]],
    ['first_selection_awakening', 'ch2_first_selection_v', [[2, 58]]]
  ];
  const cv = document.getElementById('sakuga-action-canvas');
  const TW = 640, TH = 360, PAD = 8, LAB = 20;
  const n = Q.reduce((a, q) => a + q[2].length, 0);
  const rows = Math.ceil(n / 2);
  const s = document.createElement('canvas');
  s.width = PAD + 2 * (TW + PAD);
  s.height = PAD + rows * (TH + LAB + PAD);
  const sg = s.getContext('2d');
  sg.fillStyle = '#0b0f19';
  sg.fillRect(0, 0, s.width, s.height);
  let i = 0;
  for (const [type, ch, list] of Q) {
    App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === ch));
    H._th = null;
    await wait(200);
    CE.cineFreeze(type, 0, 1);
    for (const [p, t, pre] of list) {
      if (pre) CE.cineFreeze(type, p, pre);
      CE.cineFreeze(type, p, t);
      const x = PAD + (i % 2) * (TW + PAD);
      const y = PAD + Math.floor(i / 2) * (TH + LAB + PAD);
      sg.drawImage(cv, x, y + LAB, TW, TH);
      sg.fillStyle = '#e2e8f0';
      sg.font = '700 14px Inter, sans-serif';
      sg.fillText(`${type} • P${p + 1} • t ${t}`, x, y + 15);
      i++;
      await wait(10);
    }
    CE.finishSakuga();
    await wait(150);
  }
  await wait(300);
  return { resultado: errs.length ? 'FALHOU' : 'OK', fase, erros: errs, imgs: { [`fonte_impacto_${fase}.jpg`]: s.toDataURL('image/jpeg', 0.88) } };
})()
