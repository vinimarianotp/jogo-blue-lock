(async () => {
  // DIAGNÓSTICO: como cada pose de "caído/sentado" aparece no 3D, de lado e de frente,
  // a média distância (para escolher a pose que lê como "caiu" nas cenas do grupo A).
  //   powershell -NoProfile -File testes\rodar.ps1 -teste poses_grupo_a -saida C:\Users\Public\bl_f2a\poses
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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
  if (H.GL3D) H.GL3D.scale = 1;
  await wait(500);
  const POSES = [['idle'], ['sit_floor'], ['kneel'], ['kneel_down'], ['kneel_one'], ['sit_down'], ['fall', 30], ['dive', 30], ['hurt'], ['slide', 30]];
  const R = CE.roteiro;
  const atores = (olha) =>
    POSES.map(([a, at], i) => ({ quem: 'you', id: 'p' + i, x: 50.5 + i * 0.7, y: 14.5, anim: a, opts: at ? { animTime: at } : undefined, olha: olha(50.5 + i * 0.7) }));
  R('poses_diag', {
    tema: 'bluelock_bunker',
    planos: [
      // de lado (olhando para o sul: a câmera está ao norte → eles de perfil)
      { id: 'lado', dur: 60, cam: { de: [[53.65, 1.6, 10.6], [53.65, 0.35, 14.5], 46] }, atores: atores((x) => [x + 3, 14.5]) },
      { id: 'frente', dur: 60, cam: { de: [[53.65, 1.6, 10.6], [53.65, 0.35, 14.5], 46] }, atores: atores((x) => [x, 10]) },
      { id: 'alto', dur: 60, cam: { de: [[53.65, 4.2, 11.2], [53.65, 0.0, 14.5], 46] }, atores: atores((x) => [x + 3, 14.5]) }
    ]
  });
  App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === 'ch1_first_selection_x_y'));
  H._th = null;
  await wait(150);
  const cv = document.getElementById('sakuga-action-canvas');
  const imgs = {};
  CE.cineFreeze('poses_diag', 0, 1);
  for (let p = 0; p < 3; p++) {
    CE.cineFreeze('poses_diag', p, 20);
    CE.cineFreeze('poses_diag', p, 30);
    imgs['poses_' + p + '.png'] = cv.toDataURL('image/png');
  }
  CE.finishSakuga();
  await wait(6000);
  return { resultado: 'OK', ordem: POSES.map((p) => p[0]).join(', '), imgs };
})()
