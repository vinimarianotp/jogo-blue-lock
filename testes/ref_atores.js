(async () => {
  // ONDE OS BONECOS CAEM NA TELA (cenas de roteiro): para cada quadro pedido, cada boneco com
  // a altura em % do palco (regra: no máximo 45%), se sai cortado na borda e o quanto o
  // quadro é escuro (% de pixels do palco com brilho < 16; regra: no máximo 40%).
  //   powershell -NoProfile -File testes\rodar.ps1 -teste ref_atores -saida C:\Users\Public\bl_f2motor\atores -timeout 600000
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
  const Q = [
    ['bl_eleven', 'ch4_third_selection', [[0, 120], [1, 60], [1, 200], [2, 120], [3, 40], [3, 200], [4, 60], [4, 170], [4, 240], [5, 100], [5, 238]]],
    ['wildcard_door', 'ch5b_wild_card', [[4, 10], [4, 37], [4, 125]]],
    ['itoshi_snow', 'ch4b_trio_tournament', [[5, 45], [5, 200]]]
  ];
  const X = H._3d;
  const cv = document.getElementById('sakuga-action-canvas');
  const g = cv.getContext('2d');
  const out = [];
  for (const [type, ch, list] of Q) {
    App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === ch));
    H._th = null;
    await wait(150);
    const R = CE.roteiro.cenas[type];
    if (!R) {
      out.push(type + ': não é roteiro');
      continue;
    }
    let grab = null;
    // (o gancho "depois" de cada plano lê os atores já empurrados pelo kit e a câmera)
    R.planos.forEach((pl) => {
      const d0 = pl.depois;
      pl.depois = function (ctx, S, K, st) {
        if (d0) d0.call(this, ctx, S, K, st);
        const rows = [];
        (K.c.actors || []).forEach((a) => {
          const nm = (a.cd && (a.cd.id || a.cd.name)) || "?";
          const box = (72 / X.C.SPX) * (a.k || 0.9);
          const pf = K.screen(a.x, a.z || 0, a.y);
          const pt = K.screen(a.x, (a.z || 0) + box * (60 / 72), a.y);
          if (!pf || !pt) return;
          const h = ((pf.y - pt.y) / S.stageH) * 100;
          const w = (pf.y - pt.y) * 0.5;
          const cut = [];
          if (pt.y < S.top) cut.push('cima');
          if (pf.y > S.bot + 4) cut.push('baixo');
          if (pf.x - w / 2 < 0 && pf.x + w / 2 > 0) cut.push('esq');
          if (pf.x + w / 2 > S.W && pf.x - w / 2 < S.W) cut.push('dir');
          const vis = pf.x + w / 2 > 0 && pf.x - w / 2 < S.W;
          if (vis) rows.push(`${nm} ${h.toFixed(0)}%${cut.length ? ' CORTADO ' + cut.join('+') : ''}`);
        });
        grab = rows;
      };
    });
    CE.cineFreeze(type, 0, 1);
    for (const [p, t] of list) {
      grab = null;
      CE.cineFreeze(type, p, t);
      // escuro: % do palco com brilho < 16
      const top = Math.round(cv.height * 0.12);
      const d = g.getImageData(0, top, cv.width, cv.height - 2 * top).data;
      let dark = 0;
      let n = 0;
      for (let i = 0; i < d.length; i += 16) {
        n++;
        if (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 16) dark++;
      }
      out.push(`${type} P${p + 1} t${t}: escuro ${Math.round((dark / n) * 100)}% | ${(grab || []).join(' · ')}`);
      await wait(10);
    }
    CE.finishSakuga();
    await wait(150);
  }
  return { resultado: errs.length ? 'FALHOU' : 'OK', quadros: out, erros: errs };
})()
