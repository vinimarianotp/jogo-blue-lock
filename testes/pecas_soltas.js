(async () => {
  // PEÇAS SOLTAS DO MAPA NAS CENAS: as bolas e os cones de treino do campo do prédio
  // (js/hub3d.js, buildSprites) não podem aparecer em cena nenhuma — nem no 1º quadro,
  // quando o prédio troca de tema dentro do renderNow. Conta quantas dessas peças o
  // desenho 3D recebe em cada quadro (o que o js/hub3d_gl.js lê em World.sprites) e tira
  // o 1º quadro de cada cena (o "antes" e o "depois" saem em pastas diferentes).
  //   powershell -NoProfile -File testes\rodar.ps1 -teste pecas_soltas -saida C:\Users\Public\bl_f2motor\pecas -timeout 600000
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
  if (H.GL3D) H.GL3D.scale = 0.5;
  await wait(500);
  const X = H._3d;
  // o que o desenho 3D recebe: World.sprites no momento em que o quadro é montado
  let inRender = false;
  let leak = 0;
  const rn0 = H.GL3D.renderNow;
  H.GL3D.renderNow = function () {
    inRender = true;
    try {
      return rn0.apply(this, arguments);
    } finally {
      inRender = false;
    }
  };
  const th0 = H.theme3;
  H.theme3 = function () {
    const r = th0.apply(this, arguments);
    if (inRender && H.sk) leak = Math.max(leak, (X.World.sprites || []).filter((s) => s.key === 'ball' || s.key === 'cone').length);
    return r;
  };
  // [cena, capítulo do mapa (outro tema), quadros [plano, t]]
  const Q = [
    ['first_selection_awakening', 'ch0_prologue', [[0, 30], [1, 60], [3, 40]]],
    ['nel_metavision_goal', 'ch1_first_selection_x_y', [[0, 30], [2, 40], [4, 80]]],
    ['u20_direct_shoot', 'ch1_first_selection_x_y', [[0, 30], [8, 98], [10, 40]]],
    ['scripted_shot', 'ch2_first_selection_v', [[0, 30], [2, 50], [3, 80]]],
    // (a 63, no tema worldcup_final: as bolas do campo em 50,2/9,4 e 52,6/7,4)
    ['duo_final', 'ch1_first_selection_x_y', [[0, 30], [1, 50], [3, 100]]],
    ['duo_final', 'ch9_world_cup_final', [[0, 30], [2, 40], [3, 150]]]
  ];
  const cv = document.getElementById('sakuga-action-canvas');
  const TW = 640, TH = 360, PAD = 8, LAB = 20;
  const s = document.createElement('canvas');
  s.width = PAD + 2 * (TW + PAD);
  s.height = PAD + Math.ceil(Q.length / 2) * (TH + LAB + PAD);
  const sg = s.getContext('2d');
  sg.fillStyle = '#0b0f19';
  sg.fillRect(0, 0, s.width, s.height);
  const out = [];
  let total = 0;
  let i = 0;
  for (const [type, ch, list] of Q) {
    App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === ch));
    H._th = null;
    // (o mapa troca para o tema do capítulo: a cena vem de outro tema)
    await wait(4000);
    const key0 = X.World.key;
    CE.cineFreeze(type, 0, 1);
    const res = [];
    for (let j = 0; j < list.length; j++) {
      const [p, t] = list[j];
      leak = 0;
      CE.cineFreeze(type, p, t);
      res.push(`P${p + 1} t${t}: ${leak}`);
      total += leak;
      if (j === 0) {
        const x = PAD + (i % 2) * (TW + PAD);
        const y = PAD + Math.floor(i / 2) * (TH + LAB + PAD);
        sg.drawImage(cv, x, y + LAB, TW, TH);
        sg.fillStyle = '#e2e8f0';
        sg.font = '700 14px Inter, sans-serif';
        sg.fillText(`${type} • 1º quadro (P1 t${t}) • peças soltas: ${leak}`, x, y + 15);
        i++;
      }
      await wait(10);
    }
    out.push(`${type} (mapa ${key0 === X.World.key ? 'mesmo tema' : 'outro tema'}): ${res.join(' · ')}`);
    CE.finishSakuga();
    await wait(200);
  }
  H.GL3D.renderNow = rn0;
  H.theme3 = th0;
  await wait(300);
  return { resultado: errs.length || total ? 'FALHOU' : 'OK', pecasNosQuadros: out, erros: errs, imgs: { 'pecas_soltas.jpg': s.toDataURL('image/jpeg', 0.88) }, total };
})()
