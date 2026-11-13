(async () => {
  // COMPARAÇÃO DAS 3 CENAS DE REFERÊNCIA (27 wildcard_door, 21 bl_eleven, 24 itoshi_snow):
  // carrega as versões antigas dos arquivos (cópia em C:\Users\Public\bl_f2motor\antes, tirada
  // do commit 6efd871 com `git show`) com o tipo renomeado para "<cena>__antes", desenha os
  // mesmos quadros (15%, 50% e 85% de cada plano) da antiga e da atual no MESMO navegador e
  // compara pixel a pixel só o palco (entre as tarjas: a legenda e a tarja mudam de propósito).
  // Devolve as folhas de contato <cena>_antes.jpg e <cena>_depois.jpg e a diferença por quadro.
  //   powershell -NoProfile -File testes\rodar.ps1 -teste ref_compara -saida C:\Users\Public\bl_f2motor\ref -timeout 900000
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const ce0 = console.error.bind(console);
  console.error = (...a) => {
    errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300));
    ce0(...a);
  };
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine;
  // o granulado é sorteado uma vez: sorteio fixo para as folhas saírem iguais entre rodadas
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
  // as versões antigas
  const ANTES = 'file:///C:/Users/Public/bl_f2motor/antes/';
  const load = (f) =>
    new Promise((ok, no) => {
      const x = new XMLHttpRequest();
      x.open('GET', ANTES + f);
      x.onload = () => ok(x.responseText);
      x.onerror = () => no(new Error('não leu ' + f));
      x.send();
    });
  const reg0 = CE.registerCine3D;
  for (const f of ['cine3d_wildcard.js', 'cine3d_federacao.js', 'cine3d_manga.js']) {
    const src = await load(f);
    CE.registerCine3D = function (type, def) {
      return reg0.call(this, type + '__antes', def);
    };
    try {
      (0, eval)(src);
    } finally {
      CE.registerCine3D = reg0;
    }
  }
  const CENAS = [
    ['wildcard_door', 'ch5b_wild_card'],
    ['bl_eleven', 'ch4_third_selection'],
    ['itoshi_snow', 'ch4b_trio_tournament']
  ];
  const FR = [0.15, 0.5, 0.85];
  // quadros "de ensaio" antes de uma amostra (a lembrança do Rin guarda a praia em t 258–268)
  const ENSAIO = { itoshi_snow: { 4: [262] } };
  const cv = document.getElementById('sakuga-action-canvas');
  const g = cv.getContext('2d');
  const TW = 400, TH = 225, PAD = 8, LAB = 18;
  const sheetOf = (n) => {
    const s = document.createElement('canvas');
    s.width = PAD + FR.length * (TW + PAD);
    s.height = PAD + n * (TH + LAB + PAD);
    const sg = s.getContext('2d');
    sg.fillStyle = '#0b0f19';
    sg.fillRect(0, 0, s.width, s.height);
    return { s, sg };
  };
  const shoot = async (type, ch, sheet) => {
    App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === ch));
    H._th = null;
    await wait(150);
    CE.cineFreeze(type, 0, 1);
    const ph = CE.getSakugaPhaseDurations().slice();
    const out = [];
    for (let p = 0; p < ph.length; p++) {
      for (let i = 0; i < FR.length; i++) {
        const t = Math.max(1, Math.floor(ph[p] * FR[i]));
        ((ENSAIO[type.replace('__antes', '')] || {})[p] || []).forEach((tt) => tt < t && CE.cineFreeze(type, p, tt));
        CE.cineFreeze(type, p, t);
        const def = CE.CINE[type];
        const top = Math.round(cv.height * (def.letterbox ?? 0.12));
        out.push({ p, f: FR[i], t, img: g.getImageData(0, top, cv.width, cv.height - 2 * top) });
        if (sheet) {
          const x = PAD + i * (TW + PAD);
          const y = PAD + p * (TH + LAB + PAD);
          sheet.sg.drawImage(cv, x, y + LAB, TW, TH);
          sheet.sg.fillStyle = '#e2e8f0';
          sheet.sg.font = '700 13px Inter, sans-serif';
          sheet.sg.fillText(`P${p + 1} • ${Math.round(FR[i] * 100)}% (t ${t})`, x, y + 13);
        }
        await wait(10);
      }
    }
    CE.finishSakuga();
    await wait(100);
    return { ph, out };
  };
  const imgs = {};
  const diffs = [];
  let total = 0;
  for (const [type, ch] of CENAS) {
    const n = (CE.CINE3D[type + '__antes'] || CE.CINE3D[type]).phases.length;
    const sa = sheetOf(n);
    const sd = sheetOf(n);
    const A = await shoot(type + '__antes', ch, sa);
    const D = await shoot(type, ch, sd);
    imgs[type + '_antes.jpg'] = sa.s.toDataURL('image/jpeg', 0.86);
    imgs[type + '_depois.jpg'] = sd.s.toDataURL('image/jpeg', 0.86);
    if (A.ph.join() !== D.ph.join()) diffs.push({ cena: type, planos: 'durações diferentes: ' + A.ph.join() + ' × ' + D.ph.join() });
    A.out.forEach((a, k) => {
      const d = D.out[k];
      if (!d) return;
      let px = 0;
      let max = 0;
      let big = 0;
      const x = a.img.data;
      const y = d.img.data;
      for (let i = 0; i < x.length; i += 4) {
        const m = Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2]));
        if (m) {
          px++;
          if (m > max) max = m;
          if (m > 16) big++;
        }
      }
      total += px;
      diffs.push({ cena: type, plano: a.p + 1, quadro: Math.round(a.f * 100) + '%', t: a.t, pixelsDiferentes: px, acimaDe16: big, maior: max });
    });
  }
  Math.random = rnd0;
  await wait(500);
  return { resultado: errs.length ? 'FALHOU' : 'OK', pixelsDiferentesNoTotal: total, diffs, erros: errs.slice(0, 20), imgs };
})()
