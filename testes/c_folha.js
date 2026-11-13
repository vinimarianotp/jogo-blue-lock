(async () => {
  // FOLHA DE CONTATO das cenas do grupo C (lote 1 da Fase 2): 3 quadros por plano (ou 1 no
  // modo celular), com a medida do piso de luz de cada quadro (fração quase preta < 16 e
  // estourada > 250, só na área da imagem) e o relatório do roteiro (picos e avisos).
  //   powershell -NoProfile -File testes\rodar.ps1 -teste c_folha -saida C:\Users\Public\bl_f2c\x -timeout 600000
  // ALVO: [[tipo, capítulo], ...] (edite antes de rodar); CEL = 1 quadro por plano (celular)
  const ALVO = [['sae_interview', 'ch5_u20_japan'], ['camp_night', 'ch12b_wc_camp'], ['ballon_dor', 'ch14_rin_final'], ['u20_celebration', 'ch9_world_cup_final'], ['duo_regra', 'ch1_first_selection_x_y'], ['duo_final', 'ch1_first_selection_x_y']];
  const CEL = false;
  const AMOSTRAS = CEL ? [0.6] : [0.14, 0.5, 0.86];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const ce0 = console.error.bind(console);
  console.error = (...a) => {
    errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300));
    ce0(...a);
  };
  const cw0 = console.warn.bind(console);
  const warns = [];
  console.warn = (...a) => {
    warns.push(a.map((x) => String(x)).join(' ').slice(0, 200));
    cw0(...a);
  };
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
  if (H.GL3D) H.GL3D.scale = CEL ? 1 : 0.75;
  CE.roteiroTeste = true;
  await wait(500);
  const cv = document.getElementById('sakuga-action-canvas');
  const small = document.createElement('canvas');
  small.width = 128;
  small.height = 72;
  const sm = small.getContext('2d', { willReadFrequently: true });
  // piso de luz: fração quase preta e estourada, só no palco (sem as tarjas)
  const luz = () => {
    const lb = 0.12;
    sm.clearRect(0, 0, 128, 72);
    sm.drawImage(cv, 0, cv.height * lb, cv.width, cv.height * (1 - 2 * lb), 0, 0, 128, 72);
    const d = sm.getImageData(0, 0, 128, 72).data;
    let esc = 0;
    let bra = 0;
    for (let i = 0; i < d.length; i += 4) {
      const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (y < 16) esc++;
      if (y > 250) bra++;
    }
    const n = d.length / 4;
    return [Math.round((esc / n) * 100), Math.round((bra / n) * 100)];
  };
  const out = { resultado: 'OK', cenas: {}, imgs: {} };
  // (3º item do ALVO: quadros a mais por plano, { índice do plano: [t, ...] })
  for (const [type, ch, extra = {}] of ALVO) {
    if (ch) {
      App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === ch));
      H._th = null;
      await wait(200);
    }
    CE.cineFreeze(type, 0, 1);
    const ph = CE.getSakugaPhaseDurations();
    const TW = CEL ? 422 : 432, TH = CEL ? 195 : 243, PAD = 8, LAB = 18;
    const tsDe = (p) => AMOSTRAS.map((a) => Math.max(1, Math.floor(ph[p] * a))).concat(extra[p] || []);
    const cols = Math.max(...ph.map((_, p) => tsDe(p).length));
    const sheet = document.createElement('canvas');
    sheet.width = PAD + cols * (TW + PAD);
    sheet.height = PAD + ph.length * (TH + LAB + PAD);
    const sg = sheet.getContext('2d');
    sg.fillStyle = '#0b0f19';
    sg.fillRect(0, 0, sheet.width, sheet.height);
    const medidas = [];
    for (let p = 0; p < ph.length; p++) {
      const ts = tsDe(p);
      for (let i = 0; i < ts.length; i++) {
        const t = ts[i];
        CE.cineFreeze(type, p, t);
        const [esc, bra] = luz();
        medidas.push(`P${p + 1}@${t}: ${esc}% preto, ${bra}% branco`);
        const x = PAD + i * (TW + PAD);
        const y = PAD + p * (TH + LAB + PAD);
        sg.drawImage(cv, x, y + LAB, TW, TH);
        sg.fillStyle = esc > 40 || bra > 3 ? '#f87171' : '#e2e8f0';
        sg.font = '700 13px Inter, sans-serif';
        sg.fillText(`P${p + 1} • t ${t}/${ph[p]} • ${esc}% escuro${bra ? ' • ' + bra + '% branco' : ''}`, x, y + 13);
        await wait(10);
      }
    }
    CE.finishSakuga();
    await wait(200);
    const chk = CE.roteiro && CE.roteiro.checar ? CE.roteiro.checar(type) : null;
    out.cenas[type] = { planos: ph, segundos: +(ph.reduce((a, b) => a + b, 0) / 60).toFixed(1), picos: chk && chk.picos, avisos: chk && chk.avisos, luz: medidas };
    out.imgs[type + (CEL ? '_cel' : '') + '.jpg'] = sheet.toDataURL('image/jpeg', 0.86);
  }
  out.erros = errs.slice(0, 20);
  out.avisosConsole = warns.slice(0, 20);
  if (errs.length) out.resultado = 'FALHOU';
  await wait(1500);
  return out;
})()
