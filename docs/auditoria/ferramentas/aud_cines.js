(async () => {
  // AUDITORIA FASE 0: folha de quadros de cada cutscene 3D no capítulo dela.
  // __LIST__ = [[tipo, capítulo, nome]]. 2 quadros por plano (25% e 75% do plano).
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const ce0 = console.error.bind(console);
  console.error = (...a) => { errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300)); ce0(...a); };
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine;
  const clear = async (n = 60) => {
    for (let i = 0; i < n; i++) {
      const m = document.querySelector('#cinematic-modal.open');
      if (m) { const b = m.querySelector('.dilemma-buttons button, button'); if (b) b.click(); else App.closeCinematicModal?.(); }
      else if (CE.sakugaActive && CE.finishSakuga) CE.finishSakuga();
      else if (CE.active && CE.awaitingChoice && CE.choose) CE.choose(0);
      else if (CE.active && CE.next) CE.next();
      else if (i > 3) break;
      await wait(100);
    }
  };
  App.startNewCareer(1, { name: 'Enjin Tsubaza' }, 'normal');
  await wait(300);
  App.closeTitleScreen();
  await clear();
  H.glFix = true;
  if (H.GL3D) H.GL3D.scale = 0.3;
  await wait(800);
  const imgs = {};
  const info = [];
  let chNow = null;
  const TW = 480, TH = 270, FR = [0.25, 0.75];
  for (const [type, ch, name] of __LIST__) {
    const e0 = errs.length;
    const r = { name, type, ch, is3d: false, phases: [] };
    try {
      if (ch && ch !== chNow) {
        if (CE.sakugaActive) CE.finishSakuga();
        App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === ch));
        H._th = null;
        chNow = ch;
        await wait(200);
      }
      CE.cineFreeze(type, 0, 1);
      const ph = CE.getSakugaPhaseDurations();
      r.is3d = !!(CE.CINE[type] && CE.CINE[type]._is3d);
      r.phases = ph.slice();
      const cols = 4;
      const rows = Math.max(1, Math.ceil((ph.length * FR.length) / cols));
      const sheet = document.createElement('canvas');
      sheet.width = TW * cols;
      sheet.height = TH * rows;
      const sx = sheet.getContext('2d');
      sx.fillStyle = '#000';
      sx.fillRect(0, 0, sheet.width, sheet.height);
      let k = 0;
      for (let p = 0; p < ph.length; p++) {
        for (const f of FR) {
          const t = Math.max(1, Math.floor(ph[p] * f));
          try { CE.cineFreeze(type, p, Math.max(1, t - 1)); CE.cineFreeze(type, p, t); } catch (e) { errs.push(type + ' p' + p + ': ' + (e.stack || e).toString().slice(0, 300)); }
          const src = document.getElementById('sakuga-action-canvas');
          const x = (k % cols) * TW, y = Math.floor(k / cols) * TH;
          if (src && src.width) sx.drawImage(src, x, y, TW, TH);
          sx.fillStyle = 'rgba(0,0,0,0.6)';
          sx.fillRect(x, y, 150, 18);
          sx.fillStyle = '#ff0';
          sx.font = 'bold 13px sans-serif';
          sx.fillText(`P${p} ${Math.round(f * 100)}%  (${ph[p]}q)`, x + 4, y + 13);
          k++;
        }
      }
      imgs[name + '.jpg'] = sheet.toDataURL('image/jpeg', 0.8);
      CE.finishSakuga();
    } catch (e) {
      errs.push(type + ': ' + (e.stack || e).toString().slice(0, 300));
    }
    r.errs = errs.length - e0;
    info.push(r);
    await wait(30);
  }
  return { errs: errs.slice(0, 60), info, imgs };
})()
