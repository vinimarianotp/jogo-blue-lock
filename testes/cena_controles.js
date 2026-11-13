(async () => {
  // TESTE DOS CONTROLES DA CENA: ESPAÇO durante a digitação completa a fala (o plano não
  // muda); ESPAÇO de novo passa o plano; tecla segurada (repeat) não conta; o clique no
  // canvas faz o mesmo que o ESPAÇO; ESC pula a cena inteira (e não abre o ☰ MENU).
  //   powershell -NoProfile -File testes\rodar.ps1 -teste cena_controles -saida C:\Users\Public\bl_f2motor\controles -timeout 300000
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
  if (H.GL3D) H.GL3D.scale = 0.3;
  await wait(800);
  const key = (k, repeat = false) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k === ' ' ? 'Space' : k, repeat, bubbles: true, cancelable: true }));
  const until = async (fn, ms = 20000) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      if (fn()) return true;
      await wait(16);
    }
    return false;
  };
  const r = {};
  // 0) a velocidade do texto no ☰ MENU: lenta → normal → rápida → instantânea, salva no navegador
  H.toggleMenu?.(true);
  await wait(200);
  const vb = document.querySelector('.js-veltexto-btn');
  const seq = [];
  if (vb) {
    for (let i = 0; i < 4; i++) {
      vb.click();
      await wait(50);
      seq.push(vb.textContent.replace('💬 TEXTO: ', '') + '/' + localStorage.getItem('bl_vel_texto'));
    }
  }
  r.velTexto = seq.join(' ') === 'RÁPIDA/rapida INSTANTÂNEA/instantanea LENTA/lenta NORMAL/normal';
  r.velTextoSeq = seq.join(' ') || 'SEM BOTÃO';
  H.toggleMenu?.(false);
  // o tempo de leitura muda com a velocidade (lenta lê mais devagar; normal = como antes)
  const fimDe = (v) => {
    CE.setTextSpeed(v);
    const p = CE.cinePlanAll({ phases: [600, 300], subs: [[{ from: 0, to: 10, who: 'EGO', text: 'Uma fala de teste com umas quarenta letras.' }], []] }, 'teste_leitura');
    return Math.round(p[0].subs[0].to);
  };
  const lida = { lenta: fimDe('lenta'), normal: fimDe('normal'), rapida: fimDe('rapida') };
  r.leituraMuda = lida.lenta > lida.normal && lida.normal > lida.rapida;
  r.leitura = JSON.stringify(lida);
  CE.setTextSpeed('normal');
  let acabou = 0;
  CE.playActionSakuga('wildcard_door', () => acabou++);
  // 1) espera a 1ª fala começar a ser digitada e aperta ESPAÇO
  r.digitando = await until(() => CE.cineTyping());
  const p0 = CE.sakugaPhase;
  key(' ');
  await wait(50);
  r.completouSemPassar = !CE.cineTyping() && CE.sakugaPhase === p0;
  // 2) ESPAÇO de novo: passa o plano
  key(' ');
  await wait(50);
  r.passouPlano = CE.sakugaPhase === p0 + 1;
  // 3) tecla segurada não conta
  const p1 = CE.sakugaPhase;
  key(' ', true);
  key(' ', true);
  await wait(50);
  r.seguradaNaoRepete = CE.sakugaPhase === p1;
  // 4) clique no canvas = ESPAÇO
  await until(() => CE.cineTyping() || CE.sakugaPhaseTimer > 200, 20000);
  const p2 = CE.sakugaPhase;
  document.getElementById('sakuga-action-canvas').click();
  await wait(50);
  document.getElementById('sakuga-action-canvas').click();
  await wait(50);
  r.cliqueAvanca = CE.sakugaPhase === p2 + 1;
  // 5) ESC pula a cena inteira e o menu do mapa continua fechado
  key('Escape');
  await wait(400);
  r.escPulou = !CE.sakugaActive && acabou === 1;
  r.menuFechado = !H.menuOpen;
  await wait(300);
  const ok = Object.values(r).every((v) => v === true || typeof v === 'string') && !errs.length;
  return { resultado: ok ? 'OK' : 'FALHOU', checagens: r, erros: errs };
})()
