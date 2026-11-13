(async () => {
  // FOLHAS DE CONTATO DAS CENAS DO LOTE 1, GRUPO A (roteiros em js/roteiros/):
  // 13 first_selection_awakening • 05/06 barou_king(_win) • 10 rin_rival •
  // 15/16 rin_takes_bachira(_win) • 19/20 world_five_fall/_win.
  // Desenha 3 quadros por plano (15%, 50% e 85%, mais os quadros-chave pedidos), mede o
  // escuro (fração do palco com brilho < 16) e o estouro (> 245) de cada um e devolve uma folha
  // por cena (<cena>.jpg) com os picos e avisos do roteiro.
  //   powershell -NoProfile -File testes\rodar.ps1 -teste cenas_grupo_a -saida C:\Users\Public\bl_f2a\x -timeout 900
  // Para escolher as cenas, edite PEDIDO abaixo. No celular: -mobile '844,390,2' (1 quadro por plano).
  const PEDIDO = {
    cenas: ['barou_king', 'barou_king_win', 'rin_rival', 'rin_takes_bachira', 'rin_takes_bachira_win', 'world_five_fall', 'world_five_win'],
    fr: [0.15, 0.5, 0.85],
    // quadros-chave a mais: { tipo: { plano: [t, ...] } }
    extra: { rin_rival: { 2: [106, 130] }, rin_takes_bachira: { 3: [118] }, rin_takes_bachira_win: { 3: [118] }, world_five_fall: { 1: [92] }, world_five_win: { 2: [126] } },
    escala: 1
  };
  const CAP = {
    first_selection_awakening: 'ch2_first_selection_v',
    barou_king: 'ch1_first_selection_x_y',
    barou_king_win: 'ch1_first_selection_x_y',
    rin_rival: 'ch5_u20_japan',
    rin_takes_bachira: 'ch2b_second_selection',
    rin_takes_bachira_win: 'ch2b_second_selection',
    world_five_fall: 'ch3_second_selection_world5',
    world_five_win: 'ch3_second_selection_world5'
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const ce0 = console.error.bind(console);
  console.error = (...a) => {
    errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300));
    ce0(...a);
  };
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine;
  // (granulado com sorteio fixo: as folhas saem iguais entre rodadas)
  let seed = 12345;
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
  if (H.GL3D) H.GL3D.scale = PEDIDO.escala;
  CE.roteiroTeste = true;
  await wait(600);
  const cv = document.getElementById('sakuga-action-canvas');
  const g = cv.getContext('2d', { willReadFrequently: true });
  const imgs = {};
  const rel = {};
  for (const type of PEDIDO.cenas) {
    const ch = CAP[type];
    App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === ch));
    H._th = null;
    await wait(150);
    try {
      CE.cineFreeze(type, 0, 1);
    } catch (e) {
      errs.push(type + ': ' + (e.stack || e).toString().slice(0, 300));
      continue;
    }
    const ph = CE.getSakugaPhaseDurations().slice();
    const def = CE.CINE[type];
    const lb = def.letterbox ?? 0.12;
    const quadros = [];
    for (let p = 0; p < ph.length; p++) {
      const ts = PEDIDO.fr.map((f) => Math.max(1, Math.floor(ph[p] * f)));
      ((PEDIDO.extra[type] || {})[p] || []).forEach((t) => ts.push(t));
      ts.sort((a, b) => a - b);
      ts.forEach((t) => quadros.push([p, t]));
    }
    // 3 por linha, na ordem (o plano com quadros a mais quebra em outra linha)
    const cols = 3;
    const linhas = Math.ceil(quadros.length / cols);
    const TW = 420;
    const TH = Math.round((TW * cv.height) / cv.width);
    const PAD = 8, LAB = 20;
    const sheet = document.createElement('canvas');
    sheet.width = PAD + cols * (TW + PAD);
    sheet.height = PAD + linhas * (TH + LAB + PAD);
    const sg = sheet.getContext('2d');
    sg.fillStyle = '#0b0f19';
    sg.fillRect(0, 0, sheet.width, sheet.height);
    const medidas = [];
    let idx = 0;
    for (const [p, t] of quadros) {
      try {
        CE.cineFreeze(type, p, t);
      } catch (e) {
        errs.push(`${type} P${p + 1} t${t}: ` + (e.stack || e).toString().slice(0, 300));
        continue;
      }
      // escuro e estouro, só no palco (entre as tarjas)
      const top = Math.round(cv.height * lb);
      const d = g.getImageData(0, top, cv.width, cv.height - 2 * top).data;
      let esc = 0, est = 0, n = 0;
      for (let i = 0; i < d.length; i += 16) {
        const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        if (y < 16) esc++;
        else if (y > 245) est++;
        n++;
      }
      const m = { p: p + 1, t, escuro: Math.round((esc / n) * 100), estouro: Math.round((est / n) * 100) };
      medidas.push(m);
      const x = PAD + (idx % cols) * (TW + PAD);
      const y = PAD + Math.floor(idx / cols) * (TH + LAB + PAD);
      idx++;
      sg.drawImage(cv, x, y + LAB, TW, TH);
      sg.fillStyle = m.escuro > 40 ? '#f87171' : '#e2e8f0';
      sg.font = '700 13px Inter, sans-serif';
      sg.fillText(`P${p + 1} • t ${t}/${ph[p]} • escuro ${m.escuro}% • branco ${m.estouro}%`, x, y + 14);
      await wait(10);
    }
    CE.finishSakuga();
    await wait(100);
    imgs[type + '.jpg'] = sheet.toDataURL('image/jpeg', 0.88);
    const chk = CE.roteiro && CE.roteiro.checar(type);
    rel[type] = {
      planos: ph,
      segundos: Math.round((ph.reduce((a, b) => a + b, 0) / 60) * 10) / 10,
      picos: chk ? chk.picos : null,
      avisos: chk ? chk.avisos : null,
      escuroMax: Math.max(...medidas.map((m) => m.escuro)),
      acima40: medidas.filter((m) => m.escuro > 40).map((m) => `P${m.p} t${m.t} ${m.escuro}%`)
    };
  }
  const out = { resultado: errs.length ? 'FALHOU' : 'OK', cenas: rel, erros: errs.slice(0, 20), imgs };
  await wait(6000);
  return out;
})()
