(async () => {
  // TESTE: abre o jogo, cria uma carreira, entra no mapa e abre o ☰ MENU.
  // Exige console limpo (o harness lista erros e avisos no fim) e o botão de música própria.
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
  await wait(1500);
  H.toggleMenu?.(true);
  await wait(300);
  const btn = document.querySelector('.js-musica-btn');
  return { resultado: errs.length ? 'FALHOU' : 'OK', botaoMusica: btn ? btn.textContent : 'SEM BOTÃO', erros: errs };
})()
