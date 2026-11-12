(async () => {
  // TESTE DE REGRESSÃO: toca as 63 cutscenes DUAS vezes no mesmo navegador (2 quadros por
  // plano) e exige zero erros. Pega bugs de cache entre cenas, como o da coroa (C1 da
  // auditoria): a 1ª cena deixava um cache estragado e a 2ª quebrava.
  // A lista de cenas [[tipo, capítulo], ...] vem de testes/cenas.json (o rodar.ps1 coloca)
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const ce0 = console.error.bind(console);
  console.error = (...a) => {
    errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300));
    ce0(...a);
  };
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine;
  const clear = async (n = 60) => {
    for (let i = 0; i < n; i++) {
      const m = document.querySelector('#cinematic-modal.open');
      if (m) {
        const b = m.querySelector('.dilemma-buttons button, button');
        if (b) b.click();
        else App.closeCinematicModal?.();
      } else if (CE.sakugaActive && CE.finishSakuga) CE.finishSakuga();
      else if (CE.active && CE.awaitingChoice && CE.choose) CE.choose(0);
      else if (CE.active && CE.next) CE.next();
      else if (i > 3) break;
      await wait(100);
    }
  };
  App.startNewCareer(1, { name: 'Teste' }, 'normal');
  await wait(300);
  App.closeTitleScreen();
  await clear();
  H.glFix = true;
  if (H.GL3D) H.GL3D.scale = 0.3;
  await wait(800);
  const t0 = performance.now();
  const porCena = {};
  let chNow = null;
  for (const passada of [1, 2]) {
    for (const [type, ch] of __CENAS__) {
      const e0 = errs.length;
      try {
        if (ch && ch !== chNow) {
          if (CE.sakugaActive) CE.finishSakuga();
          App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === ch));
          H._th = null;
          chNow = ch;
          await wait(150);
        }
        CE.cineFreeze(type, 0, 1);
        const ph = CE.getSakugaPhaseDurations();
        for (let p = 0; p < ph.length; p++) {
          for (const f of [0.35, 0.8]) CE.cineFreeze(type, p, Math.max(1, Math.floor(ph[p] * f)));
        }
        CE.finishSakuga();
      } catch (e) {
        errs.push(type + ' (passada ' + passada + '): ' + (e.stack || e).toString().slice(0, 300));
        try { CE.finishSakuga(); } catch (e2) {}
      }
      if (errs.length > e0) porCena[type + '#' + passada] = errs.length - e0;
      await wait(20);
    }
  }
  return {
    resultado: errs.length ? 'FALHOU' : 'OK',
    cenas: __CENAS__.length,
    passadas: 2,
    segundos: Math.round((performance.now() - t0) / 1000),
    cenasComErro: porCena,
    erros: errs.slice(0, 20)
  };
})()
