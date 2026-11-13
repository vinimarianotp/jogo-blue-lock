(async () => {
  // MÚSICA TRAVADA NAS CENAS: toca uma cena em tempo real com a trilha ligada e mede, por
  // plano, o tempo dos quadros e as notas da trilha que saíram atrasadas (a trilha é agendada
  // no mesmo processo que desenha; quadro pesado = nota atrasada = música engasgando).
  //   powershell -NoProfile -ExecutionPolicy Bypass -File testes\rodar.ps1 -teste musica_trava -saida C:\Users\Public\bl_musica -timeout 200000
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine, SFX = window.SFX;
  const TIPO = window.__tipo || 'u20_direct_shoot';
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
  SFX.unlock?.();
  try {
    await SFX.ctx?.resume();
  } catch (e) {
    /* sem áudio */
  }
  await wait(300);
  const audio = SFX.ctx ? SFX.ctx.state : 'sem ctx';
  // notas: quanto tempo antes do relógio do áudio cada uma foi agendada (negativo = atrasada)
  const por = {};
  const P = () => (CE.sakugaActive ? CE.sakugaPhase : -1);
  const de = (p) => por[p] || (por[p] = { quadros: 0, somaMs: 0, maxMs: 0, longos: 0, notas: 0, atrasadas: 0, folgaMin: 9 });
  const step0 = SFX.musicStep;
  SFX.musicStep = function (m, t) {
    const o = de(P());
    const folga = t - this.ctx.currentTime;
    o.notas++;
    if (folga < 0) o.atrasadas++;
    o.folgaMin = Math.min(o.folgaMin, folga);
    return step0.call(this, m, t);
  };
  let last = performance.now();
  let rodando = true;
  const loop = () => {
    const now = performance.now();
    const o = de(P());
    const dt = now - last;
    last = now;
    o.quadros++;
    o.somaMs += dt;
    o.maxMs = Math.max(o.maxMs, dt);
    if (dt > 100) o.longos++;
    if (rodando) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  let fim = false;
  CE.playActionSakuga(TIPO, () => (fim = true));
  const t0 = performance.now();
  while (!fim && performance.now() - t0 < 150000) await wait(200);
  rodando = false;
  SFX.musicStep = step0;
  const tab = Object.keys(por)
    .map(Number)
    .sort((a, b) => a - b)
    .map((p) => {
      const o = por[p];
      return {
        plano: p + 1,
        msMedio: Math.round(o.somaMs / Math.max(1, o.quadros)),
        msMax: Math.round(o.maxMs),
        quadrosLongos: o.longos,
        notas: o.notas,
        atrasadas: o.atrasadas,
        folgaMinMs: o.notas ? Math.round(o.folgaMin * 1000) : null
      };
    });
  return JSON.stringify({ tipo: TIPO, acabou: fim, segundos: Math.round((performance.now() - t0) / 1000), musica: SFX.music?.id || null, audio, gl: (() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g && g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : String(!!g); })(), planos: tab, erros: errs }, null, 1);
})()
