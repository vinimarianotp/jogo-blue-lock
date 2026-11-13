(async () => {
  // CELULAR DEITADO: um print da tela inteira (o canvas da cena + os botões AVANÇAR/PULAR e
  // a legenda como o jogador vê) de um plano de cada cena do grupo C (o mais carregado).
  //   powershell -NoProfile -File testes\rodar.ps1 -teste c_cel -saida C:\Users\Public\bl_f2c\cel -timeout 1500 -mobile '844,390,2'
  // (com o celular emulado o Chrome fica lento: um print por vez e espera longa entre eles,
  // senão os prints chegam fora de ordem ou se perdem)
  const ALVO = [['sae_interview', 'ch5_u20_japan', 2, 0.5], ['camp_night', 'ch12b_wc_camp', 3, 0.5], ['ballon_dor', 'ch14_rin_final', 4, 0.2], ['u20_celebration', 'ch9_world_cup_final', 2, 0.5], ['duo_regra', 'ch1_first_selection_x_y', 3, 0.8], ['duo_final', 'ch1_first_selection_x_y', 3, 0.5]];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine;
  App.startNewCareer(1, { name: 'Enjin Tsubaza' }, 'normal');
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
  await wait(500);
  let n = 0;
  for (const [type, ch, p, f] of ALVO) {
    App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === ch));
    H._th = null;
    await wait(1500);
    for (let w = 0; w < 120 && H.faseOn; w++) await wait(250);
    CE.cineFreeze(type, 0, 1);
    const ph = CE.getSakugaPhaseDurations();
    // (a cena continua tocando a partir daqui: o print sai uns quadros depois)
    CE.cineFreeze(type, p, Math.floor(ph[p] * f));
    await wait(300);
    window.__shot(`${String(++n).padStart(2, '0')}_${type}_P${p + 1}`);
    await wait(5000);
    CE.finishSakuga();
    await wait(800);
  }
  await wait(6000);
  return { resultado: errs.length ? 'FALHOU' : 'OK', prints: n, erros: errs.slice(0, 20) };
})()
