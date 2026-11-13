(async () => {
  // RESERVA SEM 3D: (A) com GRÁFICO SIMPLES uma cena de roteiro com versão 2D antiga
  // (wildcard_door) toca a 2D; (B) uma cena de roteiro sem 2D é pulada e a história segue;
  // (C) com a placa de vídeo falhando no meio da cena, ela recomeça na 2D e as próximas da
  // sessão também; (D) depois de religar, o 3D volta. Console limpo.
  //   powershell -NoProfile -File testes\rodar.ps1 -teste sem3d -saida C:\Users\Public\bl_f2motor\sem3d -timeout 600000
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const ce0 = console.error.bind(console);
  console.error = (...a) => {
    errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300));
    ce0(...a);
  };
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
  if (H.GL3D) H.GL3D.scale = 0.4;
  App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === 'ch5b_wild_card'));
  H._th = null;
  await wait(800);
  const until = async (fn, ms = 30000) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      if (fn()) return true;
      await wait(30);
    }
    return false;
  };
  const r = {};
  // (A) GRÁFICO SIMPLES: a versão 2D
  H.forceSW = true;
  let fimA = 0;
  CE.playActionSakuga('wildcard_door', () => fimA++);
  const defA = CE.CINE.wildcard_door;
  r.A_tocaA2D = !!(defA && !defA._is3d && typeof defA.draw === 'function' && !defA._roteiro);
  r.A_relogioAnda = await until(() => CE.sakugaFrame > 40, 20000);
  window.__shot('sem3d_A_grafico_simples');
  await wait(1500);
  CE.finishSakuga();
  r.A_terminou = fimA === 1;
  // (B) roteiro sem 2D, sem 3D: pula e chama o onComplete
  CE.roteiro('teste_sem_2d', { titulo: 'TESTE', planos: [{ dur: 120, cam: { de: [[56, 1, 18], [53, 0.6, 14.5], 50] }, falas: [{ em: 5, quem: 'EGO', texto: '"Teste."' }] }] });
  let fimB = 0;
  CE.playActionSakuga('teste_sem_2d', () => fimB++);
  await wait(200);
  r.B_pulou = !CE.sakugaActive && fimB === 1;
  H.forceSW = false;
  // (C) a placa de vídeo falha no meio da cena: recomeça na 2D
  let fimC = 0;
  CE.playActionSakuga('wildcard_door', () => fimC++);
  r.C_comecouEm3D = !!(CE.CINE.wildcard_door && CE.CINE.wildcard_door._is3d);
  r.C_rodou3D = await until(() => CE.sakugaPhaseTimer > 20, 60000);
  const rn = H.GL3D.renderNow;
  H.GL3D.renderNow = () => {
    throw new Error('contexto do WebGL perdido (simulado)');
  };
  r.C_trocouPara2D = await until(() => CE.CINE.wildcard_door && !CE.CINE.wildcard_door._is3d, 5000);
  r.C_continuaTocando = CE.sakugaActive && CE.sakugaType === 'wildcard_door';
  r.C_marcouQuebrado = CE.cine3dBroken();
  await wait(600);
  window.__shot('sem3d_C_falha_no_meio');
  await wait(1500);
  H.GL3D.renderNow = rn;
  CE.finishSakuga();
  r.C_terminou = fimC === 1;
  // a próxima cena da sessão já vem em 2D
  CE.playActionSakuga('wildcard_door', null);
  r.C_proximaEm2D = !!(CE.CINE.wildcard_door && !CE.CINE.wildcard_door._is3d);
  CE.finishSakuga();
  // (D) religado: volta o 3D
  CE.cine3dReset();
  CE.playActionSakuga('wildcard_door', null);
  r.D_voltou3D = !!(CE.CINE.wildcard_door && CE.CINE.wildcard_door._is3d);
  await wait(500);
  CE.finishSakuga();
  await wait(6000);
  const ok = Object.values(r).every((v) => v === true) && !errs.length;
  return { resultado: ok ? 'OK' : 'FALHOU', checagens: r, falhaGuardada: CE._c3Fail || null, erros: errs.slice(0, 10) };
})()
