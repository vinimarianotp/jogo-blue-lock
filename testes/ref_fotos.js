(async () => {
  // FOTOS GRANDES DAS 3 CENAS DE REFERÊNCIA (para a crítica de arte dos planos mexidos):
  // uma folha por cena, 2 colunas de 640 × 360, com os quadros pedidos abaixo.
  // Rode com -saida diferente para o "antes" e o "depois".
  //   powershell -NoProfile -File testes\rodar.ps1 -teste ref_fotos -saida C:\Users\Public\bl_f2motor\fotos_antes -timeout 900000
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine;
  let seed = 12345;
  const rnd0 = Math.random;
  Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
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
  if (H.GL3D) H.GL3D.scale = 1;
  await wait(600);
  // [cena, capítulo, [[plano, t], ...]]
  const Q = [
    ['bl_eleven', 'ch4_third_selection', [[0, 120], [1, 60], [1, 200], [2, 120], [2, 250], [3, 40], [3, 120], [3, 200], [4, 60], [4, 170], [4, 240], [5, 100], [5, 238]]],
    ['wildcard_door', 'ch5b_wild_card', [[4, 10], [4, 37], [4, 80], [4, 125], [4, 212], [5, 37]]],
    ['itoshi_snow', 'ch4b_trio_tournament', [[5, 45], [5, 110], [5, 200], [5, 255]]]
  ];
  const cv = document.getElementById('sakuga-action-canvas');
  const imgs = {};
  const TW = 640, TH = 360, PAD = 8, LAB = 20;
  for (const [type, ch, list] of Q) {
    App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === ch));
    H._th = null;
    await wait(200);
    CE.cineFreeze(type, 0, 1);
    const rows = Math.ceil(list.length / 2);
    const s = document.createElement('canvas');
    s.width = PAD + 2 * (TW + PAD);
    s.height = PAD + rows * (TH + LAB + PAD);
    const sg = s.getContext('2d');
    sg.fillStyle = '#0b0f19';
    sg.fillRect(0, 0, s.width, s.height);
    for (let i = 0; i < list.length; i++) {
      const [p, t] = list[i];
      CE.cineFreeze(type, p, t);
      const x = PAD + (i % 2) * (TW + PAD);
      const y = PAD + Math.floor(i / 2) * (TH + LAB + PAD);
      sg.drawImage(cv, x, y + LAB, TW, TH);
      sg.fillStyle = '#e2e8f0';
      sg.font = '700 14px Inter, sans-serif';
      sg.fillText(`P${p + 1} • t ${t}`, x, y + 15);
      await wait(10);
    }
    CE.finishSakuga();
    imgs[`fotos_${type}.jpg`] = s.toDataURL('image/jpeg', 0.88);
    await wait(200);
  }
  Math.random = rnd0;
  await wait(300);
  return { resultado: errs.length ? 'FALHOU' : 'OK', erros: errs, imgs };
})()
