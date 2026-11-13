(async () => {
  // TRECHO DA HISTÓRIA DE VERDADE em volta das cenas do grupo C (lote 1 da Fase 2): toca as
  // falas pelo motor das conversas (CE.play, filmadas em 3D pelo js/cine3d.js) e tira um
  // print de cada fala e do meio de cada cena de cinema, para conferir a ordem e o lugar.
  //   powershell -NoProfile -File testes\rodar.ps1 -teste c_historia -saida C:\Users\Public\bl_f2c\h -timeout 600
  // TRECHO: 'hotel' (Amistoso 2: camp_night + a madrugada no hotel) ou 'gala' (o epílogo:
  // a Bola de Ouro, o discurso e a lição do Sae)
  const TRECHO = 'hotel';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const ce0 = console.error.bind(console);
  console.error = (...a) => {
    errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300));
    ce0(...a);
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
  if (H.GL3D) H.GL3D.scale = 0.5;
  const chs = window.CAREER_CHAPTERS;
  let ch;
  let lines = [];
  // procura um objeto dentro do capítulo (as rodadas dos amistosos ficam aninhadas)
  const acha = (o, fn, seen = new Set()) => {
    if (!o || typeof o !== 'object' || seen.has(o)) return null;
    seen.add(o);
    if (fn(o)) return o;
    for (const k of Object.keys(o)) {
      const r = acha(o[k], fn, seen);
      if (r) return r;
    }
    return null;
  };
  if (TRECHO === 'hotel') {
    ch = chs.find((c) => c.id === 'ch12b_wc_camp');
    const r = acha(ch, (o) => o.label === 'COREIA DO SUL' && Array.isArray(o.intro));
    lines = r ? r.intro : [];
  } else {
    ch = chs.find((c) => c.id === 'ch14_rin_final');
    const L = ch.postMatchCutscene || [];
    const i0 = L.findIndex((l) => l.bg === 'paris_gala');
    const i1 = L.findIndex((l, i) => i > i0 && l.bg === 'tunnel');
    lines = L.slice(i0, i1 + 1);
  }
  App.state.currentChapterIndex = chs.indexOf(ch);
  H._th = null;
  await wait(300);
  // (trocar de capítulo troca o prédio: espera a cortina de "NOVA FASE" do mapa sair)
  for (let w = 0; w < 8 && !H.faseOn; w++) await wait(250);
  for (let w = 0; w < 120 && H.faseOn; w++) await wait(250);
  await wait(500);
  const ordem = lines.map((l) => (l.cinematic ? '[cena ' + l.cinematic + ']' : `${l.speaker || ''}: ${String(l.text || '').slice(0, 50)}${l.bg ? ' [bg ' + l.bg + ']' : ''}`));
  const vistos = [];
  CE.play({ locationTitle: 'TESTE', crestTitle: 'TESTE', bg: lines[0] && lines[0].bg, lines });
  let n = 0;
  let parado = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < 240000) {
    await wait(200);
    if (CE.sakugaActive) {
      parado = 0;
      const tipo = CE.sakugaType;
      for (let w = 0; w < 30 && CE.cine3dLoad && CE.cine3dLoad() && !CE.cine3dLoad().done; w++) await wait(300);
      await wait(1800);
      window.__shot(String(++n).padStart(2, '0') + '_cena_' + tipo);
      vistos.push('cena ' + tipo);
      await wait(2500);
      CE.finishSakuga();
      await wait(400);
      continue;
    }
    if (!CE.active) {
      if (++parado > 4) break;
      continue;
    }
    parado = 0;
    const l = CE.lines && CE.lines[CE.currentIndex];
    if (!l || l.cinematic) continue;
    // completa a digitação e espera a câmera chegar
    if (CE.typing) CE.next();
    await wait(1400);
    window.__shot(String(++n).padStart(2, '0') + '_fala');
    vistos.push(`${l.speaker || ''}${l.bg ? ' [bg ' + l.bg + ']' : ''}`);
    await wait(2500);
    if (CE.awaitingChoice) CE.choose(0);
    else if (CE.active && CE.lines[CE.currentIndex] === l) CE.next();
  }
  await wait(6000);
  return { resultado: errs.length ? 'FALHOU' : 'OK', trecho: TRECHO, ordem, vistos, erros: errs.slice(0, 20) };
})()
