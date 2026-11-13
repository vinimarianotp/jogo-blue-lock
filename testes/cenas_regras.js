(async () => {
  // TESTE DE REGRAS DAS CUTSCENES (CUTSCENE_STYLE.md §1.4, §1.5 e §1.6). Para cada uma das 63
  // cenas e cada plano, desenha 3 quadros (~15%, 50% e 85% do plano) e mede:
  //  (a) cada boneco: altura projetada na tela em fração da altura da IMAGEM (o palco entre as
  //      tarjas; pé e cabeça projetados como no K.screen; pessoa = k ladrilhos, k padrão 0,9)
  //      e se ele está cortado pela borda do palco (parte dentro e parte fora; inteiro fora não
  //      conta). Lê os bonecos e a câmera do último quadro pelo gancho CE._c3Last (cine3d_kit.js);
  //  (b) exposição do palco no #sakuga-action-canvas: % de pixels quase pretos (luma < 16) e
  //      quase brancos (luma > 240). Quadro estourado = mais de 30% quase branco; se estourar,
  //      confere 9 quadros (0,15 s) antes e depois para saber se dura mais que isso;
  //  (c) falas com mais de 90 caracteres.
  // Gera regras_relatorio.md e regras.json na pasta de saída (-saida): copie para docs/cenas/.
  // É uma LINHA DE BASE: o teste não falha por causa das regras, só por erro de console.
  //   powershell -NoProfile -File testes\rodar.ps1 -teste cenas_regras -saida C:\Users\Public\x
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const ce0 = console.error.bind(console);
  console.error = (...a) => {
    errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300));
    ce0(...a);
  };
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine;
  const LIST = __CENAS__;
  const LIM = { boneco: 0.45, escuro: 0.4, branco: 0.3, fala: 90, flashQ: 9 };
  const FR = [0.15, 0.5, 0.85];
  const clear = async (n = 60) => {
    for (let i = 0; i < n; i++) {
      const m = document.querySelector('#cinematic-modal.open');
      if (m) {
        const b = m.querySelector('.dilemma-buttons button, button');
        if (b) b.click();
        else App.closeCinematicModal?.();
      } else if (CE.sakugaActive && CE.finishSakuga) CE.finishSakuga();
      else if (CE.active && CE.awaitingChoice && CE.choose) CE.choose(0);
      else if (CE.active && CE.next) CE.next();
      else if (i > 3) break;
      await wait(100);
    }
  };
  App.startNewCareer(1, { name: 'Teste' }, 'normal');
  await wait(300);
  App.closeTitleScreen();
  await clear();
  H.glFix = true;
  if (H.GL3D) H.GL3D.scale = 0.3;
  await wait(800);
  CE._c3Probe = true;
  const cv = document.getElementById('sakuga-action-canvas');
  const g = cv.getContext('2d');
  const W = cv.width;
  const Hh = cv.height;

  // exposição do palco (1 pixel a cada 2 em x e y)
  const expo = (top, bot) => {
    const d = g.getImageData(0, top, W, bot - top).data;
    let n = 0, dark = 0, white = 0;
    const row = W * 4;
    for (let y = 0; y < bot - top; y += 2) {
      for (let x = 0; x < W; x += 2) {
        const i = y * row + x * 4;
        const l = (d[i] * 54 + d[i + 1] * 183 + d[i + 2] * 19) >> 8;
        n++;
        if (l < 16) dark++;
        else if (l > 240) white++;
      }
    }
    return { dark: dark / n, white: white / n };
  };
  // bonecos do último quadro: altura em fração do palco e corte na borda
  const proj = (m, x, h, y) => {
    const cx = m[0] * x + m[4] * h + m[8] * y + m[12];
    const cy = m[1] * x + m[5] * h + m[9] * y + m[13];
    const cw = m[3] * x + m[7] * h + m[11] * y + m[15];
    if (cw < 0.05) return null;
    return { x: ((cx / cw + 1) / 2) * W, y: ((1 - cy / cw) / 2) * Hh };
  };
  const actorsNow = (top, bot) => {
    const L = CE._c3Last;
    if (!L || !L.VP) return null;
    const out = [];
    const stageH = bot - top;
    for (const a of L.actors || []) {
      if (!a || (a.alpha !== undefined && a.alpha < 0.05)) continue;
      const k = a.k || 0.9;
      const z = a.z || 0;
      const foot = proj(L.VP, a.x, z, a.y);
      const head = proj(L.VP, a.x, z + k, a.y);
      if (!foot || !head) continue; // (atrás da câmera)
      const hp = Math.abs(foot.y - head.y);
      const hw = hp * 0.25;
      const x0 = (foot.x + head.x) / 2 - hw;
      const x1 = (foot.x + head.x) / 2 + hw;
      const y0 = Math.min(foot.y, head.y);
      const y1 = Math.max(foot.y, head.y);
      const tol = 2;
      const outside = x1 < 0 || x0 > W || y1 < top || y0 > bot;
      if (outside) continue;
      const inside = x0 >= -tol && x1 <= W + tol && y0 >= top - tol && y1 <= bot + tol;
      const nm = (a.cd && (a.cd.id || a.cd.name)) || '?';
      out.push({ nome: nm, frac: +(hp / stageH).toFixed(3), cortado: !inside });
    }
    return out;
  };
  const pct = (v) => Math.round(v * 100);

  const t0 = performance.now();
  const cenas = [];
  let chNow = null;
  for (let ci = 0; ci < LIST.length; ci++) {
    const [type, ch] = LIST[ci];
    const e0 = errs.length;
    const R = { n: ci + 1, tipo: type, cap: ch, is3d: false, planos: [] };
    try {
      if (ch && ch !== chNow) {
        if (CE.sakugaActive) CE.finishSakuga();
        App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === ch));
        H._th = null;
        chNow = ch;
        await wait(150);
      }
      CE.cineFreeze(type, 0, 1);
      const def = CE.CINE?.[type];
      R.is3d = !!(def && def._is3d);
      const ph = CE.getSakugaPhaseDurations().slice();
      const lb = def ? def.letterbox ?? 0.12 : 0;
      const top = Math.round(Hh * lb);
      const bot = Hh - top;
      let subs = [];
      try {
        subs = (def && def.subs) || [];
      } catch (e) {}
      for (let p = 0; p < ph.length; p++) {
        const dur = ph[p];
        const P = { plano: p, dur, quadros: [], maior: null, cortados: [], escuroMax: 0, brancoMax: 0, estourado: false, estouradoLongo: false, falasLongas: [] };
        (subs[p] || []).forEach((s) => {
          const tx = String((s && s.text) || '');
          if (tx.length > LIM.fala) P.falasLongas.push({ quem: s.who || '', n: tx.length, texto: tx });
        });
        // (fora do escurecimento que o motor faz no começo e no fim de cada plano)
        const lo = Math.min(15, Math.floor(dur / 2));
        const hi = Math.max(lo, dur - 11);
        for (const f of FR) {
          const t = Math.max(lo, Math.min(hi, Math.floor(dur * f)));
          CE._c3Last = null;
          // (2 quadros: o K.screen dentro do scene usa o quadro anterior)
          CE.cineFreeze(type, p, Math.max(1, t - 1));
          CE.cineFreeze(type, p, t);
          const ex = expo(top, bot);
          const acts = R.is3d ? actorsNow(top, bot) : null;
          const Q = { t, escuro: pct(ex.dark), branco: pct(ex.white) };
          if (acts) {
            Q.bonecos = acts.length;
            const big = acts.slice().sort((a, b) => b.frac - a.frac)[0];
            if (big) Q.maior = { nome: big.nome, frac: big.frac };
            Q.cortados = acts.filter((a) => a.cortado).map((a) => a.nome + ' ' + pct(a.frac) + '%');
            if (big && (!P.maior || big.frac > P.maior.frac)) P.maior = { nome: big.nome, frac: big.frac, t };
            Q.cortados.forEach((c) => {
              const nm = c.split(' ')[0];
              if (!P.cortados.includes(nm)) P.cortados.push(nm);
            });
          }
          P.escuroMax = Math.max(P.escuroMax, ex.dark);
          P.brancoMax = Math.max(P.brancoMax, ex.white);
          if (ex.white > LIM.branco) {
            P.estourado = true;
            // dura mais que 0,15 s? confere 9 quadros antes e depois
            let longo = false;
            for (const dt of [-LIM.flashQ, LIM.flashQ]) {
              const t2 = t + dt;
              if (t2 < 1 || t2 >= dur) continue;
              CE.cineFreeze(type, p, Math.max(1, t2 - 1));
              CE.cineFreeze(type, p, t2);
              if (expo(top, bot).white > LIM.branco) longo = true;
            }
            Q.estouradoLongo = longo;
            if (longo) P.estouradoLongo = true;
          }
          P.quadros.push(Q);
        }
        P.escuroMax = pct(P.escuroMax);
        P.brancoMax = pct(P.brancoMax);
        P.grande = !!(P.maior && P.maior.frac > LIM.boneco);
        P.escuro = P.escuroMax > LIM.escuro * 100;
        R.planos.push(P);
      }
      CE.finishSakuga();
    } catch (e) {
      errs.push(type + ': ' + (e.stack || e).toString().slice(0, 300));
      try {
        CE.finishSakuga();
      } catch (e2) {}
    }
    R.erros = errs.length - e0;
    R.resumo = {
      planos: R.planos.length,
      grande: R.planos.filter((p) => p.grande).length,
      cortado: R.planos.filter((p) => p.cortados.length).length,
      escuro: R.planos.filter((p) => p.escuro).length,
      estourado: R.planos.filter((p) => p.estouradoLongo).length,
      clarao: R.planos.filter((p) => p.estourado && !p.estouradoLongo).length,
      falas: R.planos.reduce((n, p) => n + p.falasLongas.length, 0)
    };
    const s = R.resumo;
    R.pontos = s.grande * 2 + s.cortado * 2 + s.escuro * 2 + s.estourado * 3 + s.clarao + s.falas;
    cenas.push(R);
    await wait(20);
  }
  CE._c3Probe = false;
  CE._c3Last = null;
  const seg = Math.round((performance.now() - t0) / 1000);

  // ---------------------------------------------------------------- relatório
  const nn = (n) => String(n).padStart(2, '0');
  const md = [];
  md.push('# Teste de regras das cutscenes — linha de base');
  md.push('');
  md.push('Gerado por `testes/cenas_regras.js` (`powershell -NoProfile -File testes\\rodar.ps1 -teste cenas_regras -saida <pasta>`).');
  md.push('Regras medidas (`CUTSCENE_STYLE.md`): §1.5 boneco ≤ 45% da altura da imagem e nada cortado na borda; §1.6 no máximo 40% do quadro quase preto (luma < 16) e nenhum quadro estourado de branco por mais de 0,15 s; §1.4 fala ≤ 90 caracteres.');
  md.push('');
  md.push('**Como mede:** 3 quadros por plano (~15%, 50% e 85%, fora do escurecimento automático do motor no começo e no fim do plano).');
  md.push('- *Imagem* = o palco entre as tarjas. A altura do boneco é a distância na tela entre o pé e a cabeça projetados (pessoa = k ladrilhos, k padrão 0,9), como no `K.screen`. Os bonecos vêm do último quadro desenhado (`CE._c3Last`, com o recuo automático do kit já aplicado).');
  md.push('- *Cortado* = o retângulo do boneco (largura = metade da altura) tem parte dentro e parte fora do palco. Boneco inteiro fora não conta. Não distingue o boneco que entra/sai em movimento (permitido).');
  md.push('- *Escuro* = algum dos 3 quadros com mais de 40% do palco quase preto. *Estourado* = quadro com mais de 30% do palco quase branco que continua estourado 9 quadros (0,15 s) antes ou depois; *clarão* = estourou, mas por menos de 0,15 s (permitido).');
  md.push('- Limitações: um boneco atrás de um quadro de mangá (cut-in) ou de uma parede conta como visível; as poses deitadas/sentadas contam com a altura de uma pessoa em pé. As cenas só 2D não têm medida de boneco.');
  md.push('');
  md.push(`Nome do jogador no teste: "Teste". ${cenas.length} cenas, ${cenas.reduce((n, c) => n + c.planos.length, 0)} planos, ${seg} s, erros de console: ${errs.length}.`);
  md.push('');
  md.push('## Resumo (nº de planos que furam cada regra)');
  md.push('');
  md.push('| Nº | Cena | 3D | Planos | Boneco > 45% | Cortado | Escuro > 40% | Estourado > 0,15 s | Clarão | Falas > 90 |');
  md.push('|---|---|---|---|---|---|---|---|---|---|');
  cenas.forEach((c) => {
    const s = c.resumo;
    md.push(`| ${nn(c.n)} | ${c.tipo} | ${c.is3d ? 'sim' : 'não'} | ${s.planos} | ${s.grande} | ${s.cortado} | ${s.escuro} | ${s.estourado} | ${s.clarao} | ${s.falas} |`);
  });
  const tot = (k) => cenas.reduce((n, c) => n + c.resumo[k], 0);
  md.push(`| | **total** | | ${tot('planos')} | ${tot('grande')} | ${tot('cortado')} | ${tot('escuro')} | ${tot('estourado')} | ${tot('clarao')} | ${tot('falas')} |`);
  md.push('');
  md.push('## As 10 piores (pontos = 2 × (boneco > 45% + cortado + escuro) + 3 × estourado + clarão + falas longas)');
  md.push('');
  md.push('| Nº | Cena | Pontos | Boneco > 45% | Cortado | Escuro | Estourado | Falas |');
  md.push('|---|---|---|---|---|---|---|---|');
  cenas
    .slice()
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 10)
    .forEach((c) => {
      const s = c.resumo;
      md.push(`| ${nn(c.n)} | ${c.tipo} | ${c.pontos} | ${s.grande}/${s.planos} | ${s.cortado}/${s.planos} | ${s.escuro}/${s.planos} | ${s.estourado} | ${s.falas} |`);
    });
  md.push('');
  md.push('## Detalhe por plano');
  md.push('');
  md.push('P = plano (começa em 0, como nas folhas da auditoria). "Maior" = o boneco mais alto nos 3 quadros (% da altura da imagem). Escuro e branco = o máximo dos 3 quadros.');
  cenas.forEach((c) => {
    md.push('');
    md.push(`### ${nn(c.n)} ${c.tipo} (${c.cap}${c.is3d ? '' : ', só 2D'})`);
    md.push('');
    md.push('| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |');
    md.push('|---|---|---|---|---|---|---|');
    c.planos.forEach((p) => {
      const big = p.maior ? `${p.grande ? '**' : ''}${p.maior.nome} ${pct(p.maior.frac)}%${p.grande ? '**' : ''}` : '–';
      const cut = p.cortados.length ? '**' + p.cortados.join(', ') + '**' : '–';
      const dk = p.escuro ? `**${p.escuroMax}%**` : `${p.escuroMax}%`;
      const wh = p.estouradoLongo ? `**${p.brancoMax}% (> 0,15 s)**` : p.estourado ? `${p.brancoMax}% (clarão)` : `${p.brancoMax}%`;
      const fl = p.falasLongas.length ? p.falasLongas.map((x) => `${x.quem} (${x.n}): "${x.texto.replace(/\|/g, '/')}"`).join('<br>') : '–';
      md.push(`| ${p.plano} | ${p.dur} | ${big} | ${cut} | ${dk} | ${wh} | ${fl} |`);
    });
  });
  md.push('');
  const b64 = (s) => 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(s)));
  const json = JSON.stringify({ gerado: new Date().toISOString(), limites: LIM, quadros: FR, segundos: seg, erros: errs.slice(0, 40), cenas }, null, 1);
  await wait(500);
  return {
    resultado: errs.length ? 'FALHOU' : 'OK',
    cenas: cenas.length,
    segundos: seg,
    erros: errs.slice(0, 20),
    piores: cenas
      .slice()
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, 10)
      .map((c) => `${nn(c.n)} ${c.tipo}: ${c.pontos} (${JSON.stringify(c.resumo)})`),
    imgs: { 'regras_relatorio.md': b64(md.join('\n')), 'regras.json': b64(json) }
  };
})()
