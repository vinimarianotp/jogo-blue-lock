(async () => {
  // TESTE DOS SAVES (js/save.js e js/state.js). Rodar:
  //   powershell -File testes\rodar_saves.ps1 -teste saves -saida <pasta dos prints>
  // Roda numa página vazia; cada "abrir o jogo" é um iframe do index.html com o
  // localStorage preparado antes (é o mesmo que recarregar a página com aquele save).
  //   A. Laboratório (um jogo aberto): compatibilidade com a versão de antes, saves
  //      estragados, migração com erro, falha ao gravar (+ cama), interlúdio, fim de cena
  //      com erro, GameState e importar.
  //   B. Cada save de testes/saves/ aberto do zero: não trava, a tela inicial tem botões,
  //      a carreira vem igual à de antes (esperado/) ou consertada, ou o painel aparece.
  //   C. Recuperar backup, exportar o quebrado, começar de novo, backup feito jogando,
  //      segunda abertura (migração roda uma vez só) e duas abas.
  // Console limpo: os erros provocados de propósito são interceptados; o harness lista
  // no fim qualquer outro erro ou aviso (de dentro dos iframes também).
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const SAVES = __SAVES__;
  const ESP = __ESPERADO__;
  const K1 = 'bluelock_egoist_career_v2';
  const K2 = 'bluelock_egoist_career_v2_slot2';
  const t0 = performance.now();
  const falhas = [];
  const det = {};
  const ok = (cond, msg) => {
    if (!cond) falhas.push(msg);
    return !!cond;
  };
  const ls = (k) => localStorage.getItem(k);
  const diff = (a, b, p = '', out = []) => {
    if (out.length > 12) return out;
    const tipo = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
    if (tipo(a) !== tipo(b)) {
      out.push(`${p}: ${JSON.stringify(a)?.slice(0, 60)} x ${JSON.stringify(b)?.slice(0, 60)}`);
      return out;
    }
    if (a && typeof a === 'object') {
      new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => {
        if (p === '' && k === 'saveVersion') return;
        diff(a[k], b[k], `${p}.${k}`, out);
      });
      return out;
    }
    if (a !== b) out.push(`${p}: ${JSON.stringify(a)} x ${JSON.stringify(b)}`);
    return out;
  };
  const estadoJson = (W) => JSON.parse(JSON.stringify(W.App.state));
  // Prepara o localStorage. ATENÇÃO: para um jogo já aberto num iframe, estas gravações são
  // "outra aba" (o evento storage chega depois, sozinho): espere (prepAberto) antes de mexer
  // nele, senão ele trava a gravação no meio do teste.
  const prep = (extra = {}, comMapa = false) => {
    localStorage.clear();
    // como num navegador que já abriu o jogo depois de 29/10 (a volta para a NEL não roda)
    localStorage.setItem('bluelock_rewind_nel_v1', '1');
    // mapa 3D desligado nas aberturas que só olham a tela inicial: o teste fica mais leve.
    // (No laboratório ele fica ligado: com ele desligado, todo diálogo avisa no console
    // "[cine3d] cena em 3D desligada", o que não tem a ver com o save.)
    if (!comMapa) localStorage.setItem('bluelock_hub_off', '1');
    Object.entries(extra).forEach(([k, v]) => localStorage.setItem(k, v));
  };
  const prepAberto = async (extra) => {
    prep(extra, true);
    await wait(800);
  };
  let nBoot = 0;
  const bootMs = [];
  const abrir = async () => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;border:0;background:#000';
    f.src = '../index.html?boot=' + ++nBoot;
    document.body.appendChild(f);
    const ini = performance.now();
    let pronto = false;
    for (let i = 0; i < 2400 && !pronto; i++) {
      await wait(100);
      try {
        pronto = f.contentDocument.readyState === 'complete' && !!f.contentWindow.App?.state && !!f.contentDocument.getElementById('title-menu');
      } catch (e) {}
    }
    await wait(800);
    bootMs.push(Math.round(performance.now() - ini));
    f.W = f.contentWindow;
    f.D = f.contentDocument;
    f.pronto = pronto;
    return f;
  };
  const fechar = (f) => f && f.remove();
  const botoes = (D) => [...D.querySelectorAll('#title-menu .title-btn')].map((b) => b.textContent.replace(/\s+/g, ' ').trim());
  const toast = (D) => D.getElementById('ego-toast')?.textContent || '';
  const aviso = (D) => {
    const el = D.getElementById('save-aviso');
    return el && !el.hidden ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  };
  // Erros provocados de propósito não vão para o console (o harness exige console limpo)
  const calar = (W) => {
    const presos = [];
    const orig = W.console.error;
    W.console.error = (...a) => presos.push(a.map((x) => (x && x.message) || String(x)).join(' ').slice(0, 200));
    return () => {
      W.console.error = orig;
      return presos;
    };
  };
  // O print sai quando o harness consegue (a máquina é lenta): a tela fica parada antes e
  // bem depois do pedido
  const print = async (nome) => {
    await wait(3500);
    window.__shot(nome);
    await wait(25000);
  };

  // ==================================================================== A. LABORATÓRIO
  prep({}, true);
  let f = await abrir();
  let W = f.W;
  let D = f.D;
  ok(f.pronto, 'A: o jogo não abriu com o navegador vazio');
  const SS = W.SaveSystem;
  const A = W.App;
  ok(SS && SS.SAVE_VERSION === 4, 'A: SaveSystem.SAVE_VERSION não é 4');

  // A1. Compatibilidade: cada save válido da versão de antes abre com o MESMO estado
  det.compat = {};
  for (const nome of Object.keys(ESP)) {
    localStorage.setItem(K1, SAVES[nome]);
    A.activeSlot = 1;
    const r = A.loadState();
    A.renderAll();
    A.closeCinematicModal();
    const st = estadoJson(W);
    const d = diff(st, JSON.parse(ESP[nome]));
    const gravado = JSON.parse(ls(K1));
    // aberto de novo: já está na v4, nada a migrar nem consertar, mesmo estado
    const de2 = SS.abrirTexto(ls(K1));
    det.compat[nome] = { de: r.de, para: r.para, diferencas: d.length };
    ok(r.estado === 'ok', `A1 ${nome}: não abriu (${r.estado})`);
    ok(!d.length, `A1 ${nome}: estado diferente da versão de antes: ${d.join(' | ')}`);
    ok(gravado.saveVersion === 4, `A1 ${nome}: o save gravado não tem saveVersion 4`);
    ok(de2.ok && !de2.migrou && !de2.consertos.length, `A1 ${nome}: reabrir o save já migrado ainda migra/conserta (${de2.consertos?.join('; ')})`);
    ok(de2.ok && !diff(JSON.parse(JSON.stringify(de2.save)), gravado).length, `A1 ${nome}: reabrir mudou o save`);
  }
  ok(det.compat.v1_antigo?.de === 1 && det.compat.v2_antigo?.de === 2 && det.compat.novo?.de === 3, 'A1: versões de origem erradas (v1/v2/v3)');

  // A2. Saves estragados que dão para consertar (sem trocar a carreira pela padrão)
  const abre = (nome) => SS.abrirTexto(SAVES[nome]);
  let r = abre('numeros_texto');
  ok(r.ok && r.save.stats.velocidade === 50 && r.save.currencies.egoCoins === 777, 'A2 numeros_texto: "50" e "777" não viraram número');
  r = abre('capitulo_999');
  ok(r.ok && r.save.currentChapterIndex === 12, `A2 capitulo_999: índice ${r.save?.currentChapterIndex} (esperado 12, o 1º capítulo não concluído)`);
  ok(r.ok && A.saveSummary(r.save, 1).chapter !== 'Campeão do Mundo', 'A2 capitulo_999: o menu ainda mostra Campeão do Mundo');
  r = abre('capitulo_texto');
  ok(r.ok && r.save.currentChapterIndex === 8, `A2 capitulo_texto: índice ${r.save?.currentChapterIndex} (esperado 8)`);
  r = abre('capitulos_objeto');
  ok(r.ok && Array.isArray(r.save.completedChapters) && r.save.completedChapters.length === 21, 'A2 capitulos_objeto: a lista de capítulos não foi recuperada do objeto');
  r = abre('campos_null');
  ok(r.ok && Array.isArray(r.save.unlockedAchievements) && Array.isArray(r.save.equippedAccessories) && r.save.nel === null && r.save.currentChapterIndex === 12 && r.save.profile.name === 'Nulos Teste',
    'A2 campos_null: campos null não foram consertados ou a carreira foi trocada');
  r = abre('tipos_errados');
  ok(r.ok && Array.isArray(r.save.ownedAccessories) && r.save.selectedSquad[0] === 'bachira' && r.save.difficulty === 'normal' && r.save.trainingEnergy === 2 && r.save.blueLockEntered === true && r.save.currencies.egoCoins === 1200 && r.save.cup.round === 2 && r.save.equippedWeapon === null,
    'A2 tipos_errados: tipos não consertados');
  det.consertos_tipos = r.consertos?.length;
  // A3. Sem conserto: não abre (e não vira a carreira padrão)
  ok(!abre('quebrado_cortado').ok, 'A3 quebrado_cortado abriu');
  ok(!abre('quebrado_lista').ok, 'A3 quebrado_lista abriu');

  // A4. Migração com erro (bug futuro): o save fica intacto, guardado e travado
  {
    const fim = calar(W);
    const orig = A.migrateProClubs;
    A.migrateProClubs = () => {
      throw new Error('bug de teste numa migração');
    };
    localStorage.removeItem(K1 + '_quebrado');
    localStorage.setItem(K1, SAVES.v2_antigo);
    A.activeSlot = 1;
    const r4 = A.loadState();
    const s4 = A.saveState();
    A.migrateProClubs = orig;
    const presos = fim();
    ok(r4.estado === 'quebrado', `A4: migração com erro deu "${r4.estado}"`);
    ok(ls(K1) === SAVES.v2_antigo, 'A4: o save foi alterado depois da migração com erro');
    ok(ls(K1 + '_quebrado') === SAVES.v2_antigo, 'A4: o texto do save não foi guardado em _quebrado');
    ok(!s4.ok && s4.travado === 'quebrado', 'A4: o estado padrão foi gravado por cima do save');
    ok(presos.length === 1, `A4: esperava 1 erro registrado, veio ${presos.length}`);
    localStorage.removeItem(K1 + '_quebrado');
  }

  // A5. Falha ao gravar: aviso uma vez só, cama honesta, aviso some quando volta a gravar
  {
    await prepAberto({ [K1]: SAVES.meio_nel });
    A.activeSlot = null;
    A.playSlot(1);
    await wait(600);
    const setOrig = W.Storage.prototype.setItem;
    W.Storage.prototype.setItem = function () {
      throw new W.DOMException('cheio', 'QuotaExceededError');
    };
    const res = [1, 2, 3, 4, 5].map(() => A.saveState());
    const av = aviso(D);
    const H = W.Hub;
    const hub = { nearSpot: H.nearSpot, canAct: H.canAct };
    H.nearSpot = () => ({ act: 'SLEEP', x: 0, y: 0 });
    H.canAct = () => true;
    H.interact();
    await wait(100);
    const camaFalha = toast(D);
    ok(res.every((x) => x && x.ok === false), 'A5: saveState não devolveu ok:false com o storage cheio');
    ok(/NÃO conseguiu salvar/.test(av) && /sem espaço/.test(av), `A5: aviso de falha não apareceu (${av})`);
    ok(D.querySelectorAll('#save-aviso').length === 1, 'A5: o aviso se repetiu');
    ok(/NÃO foi salvo/.test(camaFalha), `A5: a cama disse "${camaFalha}" sem gravar`);
    det.avisoFalha = av;
    await print('aviso_falha_ao_gravar');
    W.Storage.prototype.setItem = setOrig;
    const ok5 = A.saveState();
    H.interact();
    await wait(100);
    const camaOk = toast(D);
    Object.assign(H, hub);
    ok(ok5.ok, 'A5: não voltou a gravar depois do storage liberar');
    ok(!aviso(D), 'A5: o aviso de falha não sumiu depois de gravar');
    ok(/Jogo salvo/.test(camaOk), `A5: a cama não disse "Jogo salvo" gravando (${camaOk})`);
  }

  // A6. Interlúdio só fica "visto" no fim da cena
  {
    const CE = W.CutsceneEngine;
    const ME = W.MatchEngine;
    const chs = W.CAREER_CHAPTERS;
    const idx = chs.findIndex((c) => c.id === 'ch2b_second_selection');
    await prepAberto({ [K1]: SAVES.novo });
    A.activeSlot = null;
    A.playSlot(1);
    await wait(2000); // o mapa 3D monta o cenário antes do diálogo
    const st = A.state;
    st.currentChapterIndex = idx;
    st.completedChapters = chs.slice(0, idx).map((c) => c.id);
    st.blueLockEntered = true;
    st.seenInterludes = {};
    A.saveState();
    A.launchChapterMatch();
    await wait(400);
    const meio = { cena: CE.active, memoria: !!A.state.seenInterludes.bluelock_man_test, gravado: !!JSON.parse(ls(K1)).seenInterludes.bluelock_man_test };
    for (let i = 0; i < 10 && CE.sakugaActive; i++) {
      CE.finishSakuga();
      await wait(100);
    }
    if (CE.active) CE.finish();
    await wait(400);
    const fimCena = { memoria: !!A.state.seenInterludes.bluelock_man_test, gravado: !!JSON.parse(ls(K1)).seenInterludes.bluelock_man_test, partida: !!ME.active };
    if (ME.active) ME.closeFullscreenOverlay();
    ok(meio.cena && !meio.memoria && !meio.gravado, `A6: interlúdio marcado antes do fim da cena (${JSON.stringify(meio)})`);
    ok(fimCena.memoria && fimCena.gravado, `A6: interlúdio não marcado no fim da cena (${JSON.stringify(fimCena)})`);
    det.interludio = { meio, fimCena };
  }

  // A7. onComplete com erro: volta para o mapa em vez de travar
  {
    const CE = W.CutsceneEngine;
    const fim = calar(W);
    let escapou = null;
    try {
      CE.play({ lines: [{ speaker: 'TESTE', text: 'fala de teste' }], onComplete: () => { throw new Error('erro de teste no fim do diálogo'); } });
      await wait(200);
      CE.finish();
    } catch (e) {
      escapou = e.message;
    }
    await wait(100);
    const t1 = toast(D);
    const vn = D.getElementById('vn-cutscene-overlay')?.classList.contains('open');
    try {
      CE.playActionSakuga('bluelock_door', () => { throw new Error('erro de teste no fim da cena'); });
      await wait(300);
      CE.finishSakuga();
    } catch (e) {
      escapou = escapou || e.message;
    }
    await wait(100);
    const presos = fim();
    ok(!escapou, `A7: o erro do onComplete escapou (${escapou})`);
    ok(!CE.active && !CE.sakugaActive && !vn, 'A7: a cena ficou aberta depois do erro');
    ok(/voltou para o mapa/.test(t1), `A7: sem aviso de volta ao mapa (${t1})`);
    ok(presos.length === 2, `A7: esperava 2 erros registrados, veio ${presos.length}`);
  }

  // A8. GameState: get/set/update/mudou, comEstado e withShadow
  {
    const GS = W.GameState;
    const ev = [];
    const off = GS.on('mudou', (d) => ev.push(d.caminho));
    const c0 = GS.get('currencies.egoCoins');
    GS.set('currencies.egoCoins', c0 + 5);
    GS.update('currencies', (c) => {
      c.spins += 1;
    });
    off();
    GS.set('currencies.egoCoins', c0);
    ok(A.state.currencies.egoCoins === c0 && GS.get() === A.state, 'A8: GameState.get/set não mexem no App.state');
    ok(ev.join(',') === 'currencies.egoCoins,currencies', `A8: eventos "mudou" errados: ${ev.join(',')}`);
    const real = A.state;
    let dentro = null;
    try {
      GS.comEstado({ teste: 1 }, () => {
        dentro = A.state.teste;
        A.saveState();
        throw new Error('x');
      });
    } catch (e) {}
    ok(dentro === 1 && A.state === real && typeof A.saveState === 'function' && A.saveState().ok, 'A8: comEstado não devolveu o estado de verdade');
    const DC = W.DuoCareer;
    if (DC?.withShadow) {
      const story = DC.story;
      DC.story = { app: { sombra: 7 } };
      const v = DC.withShadow(() => A.state.sombra);
      DC.story = story;
      ok(v === 7 && A.state === real, 'A8: duo_saga.withShadow não usa o estado sombra');
    } else falhas.push('A8: DuoCareer.withShadow não existe');
  }

  // A9. Importar: migra, valida, mostra a versão e guarda o espaço substituído
  {
    A.closeTitleScreen?.();
    A.openTitleScreen();
    const antes = ls(K1);
    A.openSaveImport();
    const ta = D.getElementById('save-code');
    ta.value = 'BLSAVE1:' + btoa(unescape(encodeURIComponent(SAVES.v1_antigo)));
    A.previewSaveImport();
    const info = D.getElementById('save-import-info')?.textContent || '';
    D.querySelector('input[name="save-slot"][value="1"]').checked = true;
    A.confirmSaveImport();
    const pediu = toast(D);
    A.confirmSaveImport();
    await wait(100);
    const fim = toast(D);
    const novo = JSON.parse(ls(K1));
    ok(/Antigo Um/.test(info) && /versão 1, convertido para a 4/.test(info), `A9: a prévia não mostra a versão (${info})`);
    ok(/já tem um save/.test(pediu), 'A9: substituiu sem pedir confirmação');
    ok(novo.profile.name === 'Antigo Um' && novo.saveVersion === 4 && novo.storyVersion === 3, 'A9: o save importado não foi migrado');
    ok(ls(K1 + '_bak') === antes, 'A9: o save substituído não foi para o _bak');
    ok(/versão 1/.test(fim), `A9: o aviso não diz a versão (${fim})`);
    det.importar = { previa: info, aviso: fim };
  }
  fechar(f);

  // ==================================================================== B. CADA SAVE DO ZERO
  const CONSERTAVEIS = ['campos_null', 'tipos_errados', 'capitulos_objeto', 'numeros_texto', 'capitulo_999', 'capitulo_texto'];
  const SEM_CONSERTO = ['quebrado_cortado', 'quebrado_lista'];
  det.abertura = {};
  for (const nome of Object.keys(SAVES)) {
    prep({ [K1]: SAVES[nome] });
    f = await abrir();
    W = f.W;
    D = f.D;
    const b = botoes(D);
    const info = { ms: bootMs[bootMs.length - 1], botoes: b.length };
    det.abertura[nome] = info;
    if (!ok(f.pronto && W.App?.state, `B ${nome}: o jogo não abriu`)) {
      fechar(f);
      continue;
    }
    ok(b.length > 0, `B ${nome}: tela inicial sem botões`);
    ok(D.getElementById('title-screen')?.classList.contains('open'), `B ${nome}: a tela inicial não abriu`);
    for (let i = 0; i < 100 && typeof W.App._rafAt !== 'number'; i++) await wait(100);
    ok(typeof W.App._rafAt === 'number', `B ${nome}: o laço do jogo não começou`);
    if (ESP[nome]) {
      const d = diff(estadoJson(W), JSON.parse(ESP[nome]));
      ok(!d.length, `B ${nome}: estado diferente da versão de antes: ${d.join(' | ')}`);
      // (o _bak é o save anterior: o original, ou o migrado se a abertura já salvou de novo
      // ao liberar conquistas; o original fica sempre no _antes_v4)
      ok(JSON.parse(ls(K1)).saveVersion === 4, `B ${nome}: não gravou a v4`);
      ok(ls(K1 + '_antes_v4') === SAVES[nome], `B ${nome}: sem a cópia de antes da migração`);
      ok(!!ls(K1 + '_bak') && W.SaveSystem.abrirTexto(ls(K1 + '_bak')).ok, `B ${nome}: sem backup que abra`);
      ok(b.some((t) => t.startsWith('CARREIRA 1')), `B ${nome}: sem o botão da carreira`);
    } else if (CONSERTAVEIS.includes(nome)) {
      ok(b.some((t) => t.startsWith('CARREIRA 1')), `B ${nome}: a carreira consertada não aparece no menu`);
      ok(!D.querySelector('.title-broken'), `B ${nome}: painel de quebrado num save consertável`);
      ok(JSON.parse(ls(K1)).saveVersion === 4 && ls(K1 + '_antes_v4') === SAVES[nome] && !!ls(K1 + '_bak'), `B ${nome}: o conserto não foi gravado com backup`);
      const resumo = W.App.slotSummary(1);
      info.menu = `${resumo?.name} • ${resumo?.chapter}`;
      if (nome === 'capitulo_999' || nome === 'capitulo_texto') ok(resumo.chapter !== 'Campeão do Mundo', `B ${nome}: o menu mostra Campeão do Mundo`);
      // entra na carreira e monta as telas sem erro
      W.App.playSlot(1);
      await wait(500);
      ok(!D.getElementById('title-screen')?.classList.contains('open'), `B ${nome}: clicar na carreira não entrou`);
    } else if (SEM_CONSERTO.includes(nome)) {
      ok(!!D.querySelector('.title-broken'), `B ${nome}: sem o painel "Sua carreira não abriu"`);
      ok(ls(K1) === SAVES[nome], `B ${nome}: o save quebrado foi alterado`);
      ok(ls(K1 + '_quebrado') === SAVES[nome], `B ${nome}: o texto não foi guardado em _quebrado`);
      ok(W.App.saveState().ok === false && ls(K1) === SAVES[nome], `B ${nome}: o estado padrão foi gravado por cima`);
      ok(!!D.querySelector('.title-broken button[disabled]'), `B ${nome}: RECUPERAR BACKUP habilitado sem backup`);
      ok(b.some((t) => t.startsWith('COMEÇAR CARREIRA')) && /createCareerInSlot\(2\)/.test(D.querySelector('#title-menu').innerHTML), `B ${nome}: COMEÇAR deveria usar o espaço 2`);
      if (nome === 'quebrado_lista') {
        // COMEÇAR DE NOVO NESTE ESPAÇO: confirmação e carreira nova (o quebrado fica guardado)
        D.querySelector('.title-broken .title-btn.danger').click();
        await wait(200);
        const conf = D.querySelector('#title-menu .title-confirm')?.textContent || '';
        ok(/carreira nova na Carreira 1/.test(conf), 'B quebrado_lista: sem a confirmação de começar de novo');
        await print('confirmar_comecar_de_novo');
        [...D.querySelectorAll('#title-menu .title-btn')].find((x) => /SIM, COMEÇAR/.test(x.textContent))?.click();
        await wait(200);
        ok(D.getElementById('creator-screen')?.classList.contains('open'), 'B quebrado_lista: a criação do jogador não abriu');
        W.App.closeCreator();
        W.App.startNewCareer(1, { name: 'Recomeco Teste' }, 'normal');
        await wait(300);
        W.App.closeCinematicModal();
        ok(JSON.parse(ls(K1)).profile.name === 'Recomeco Teste', 'B quebrado_lista: a carreira nova não foi gravada');
        ok(ls(K1 + '_quebrado') === SAVES[nome], 'B quebrado_lista: o save quebrado sumiu ao recomeçar');
      }
    }
    // segunda abertura: a migração não roda de novo e nada muda
    if (nome === 'v1_antigo') {
      const txt = ls(K1);
      const bak = ls(K1 + '_bak');
      fechar(f);
      f = await abrir();
      const d = diff(estadoJson(f.W), JSON.parse(ESP[nome]));
      ok(!d.length, `B v1_antigo (2ª abertura): estado mudou: ${d.join(' | ')}`);
      ok(ls(K1) === txt && ls(K1 + '_bak') === bak, 'B v1_antigo (2ª abertura): o save foi regravado (a migração rodou de novo?)');
    }
    fechar(f);
  }

  // ==================================================================== C. RECUPERAÇÃO
  // C1. Painel com backup: exportar o quebrado, recuperar e jogar
  prep({ [K1]: SAVES.quebrado_cortado, [K1 + '_bak']: SAVES.meio_nel, [K2]: SAVES.novo });
  f = await abrir();
  W = f.W;
  D = f.D;
  {
    const painel = D.querySelector('.title-broken');
    const rec = painel && [...painel.querySelectorAll('.title-btn')].find((x) => /RECUPERAR BACKUP/.test(x.textContent));
    ok(painel && rec && !rec.disabled && /Meio Teste/.test(rec.textContent), 'C1: RECUPERAR BACKUP não mostra o backup');
    ok(botoes(D).some((t) => t.startsWith('CARREIRA 2')), 'C1: a outra carreira sumiu do menu');
    await print('painel_sua_carreira_nao_abriu');
    [...painel.querySelectorAll('.title-btn')].find((x) => /EXPORTAR SAVE QUEBRADO/.test(x.textContent)).click();
    await wait(300);
    ok(D.getElementById('save-code')?.value === SAVES.quebrado_cortado, 'C1: exportar não mostra o texto do save quebrado');
    await print('exportar_save_quebrado');
    W.SaveSystem.fecharJanela();
    rec.click();
    await wait(400);
    ok(botoes(D).some((t) => t.startsWith('CARREIRA 1 • MEIO TESTE')), 'C1: a carreira recuperada não aparece');
    ok(ls(K1 + '_quebrado') === SAVES.quebrado_cortado, 'C1: o save quebrado sumiu depois de recuperar');
    await print('backup_recuperado');
    W.App.playSlot(1);
    await wait(400);
    const d = diff(estadoJson(W), JSON.parse(ESP.meio_nel));
    ok(!d.length, `C1: a carreira recuperada não é a do backup: ${d.join(' | ')}`);
    ok(W.App.saveState().ok, 'C1: não grava depois de recuperar');
  }
  fechar(f);

  // C2. O _bak feito jogando salva a carreira quando o save principal estraga
  prep({ [K1]: SAVES.meio_nel });
  f = await abrir();
  {
    f.W.App.playSlot(1);
    const c0 = f.W.App.state.currencies.egoCoins;
    f.W.App.state.currencies.egoCoins = c0 + 1000;
    f.W.App.saveState();
    fechar(f);
    localStorage.setItem(K1, ls(K1).slice(0, 300)); // gravação cortada no meio
    f = await abrir();
    const rec = [...f.D.querySelectorAll('.title-broken .title-btn')].find((x) => /RECUPERAR BACKUP/.test(x.textContent));
    ok(rec && !rec.disabled, 'C2: sem backup depois de jogar e salvar');
    rec?.click();
    await wait(300);
    f.W.App.playSlot(1);
    ok(f.W.App.state.currencies.egoCoins === c0, `C2: o backup não é o save anterior (${f.W.App.state.currencies.egoCoins} x ${c0})`);
  }
  fechar(f);

  // C3. Duas abas: a que não salvou por último para de salvar e avisa
  prep({ [K1]: SAVES.meio_nel });
  const fa = await abrir();
  const fb = await abrir();
  {
    fa.W.App.playSlot(1);
    fb.W.App.playSlot(1);
    await wait(300);
    fb.W.App.state.currencies.egoCoins += 7;
    const moedasB = fb.W.App.state.currencies.egoCoins;
    ok(fb.W.App.saveState().ok, 'C3: a aba B não gravou');
    await wait(800);
    const ra = fa.W.App.saveState();
    const av = aviso(fa.D);
    ok(!ra.ok && /outra aba/.test(ra.erro || ''), 'C3: a aba A gravou por cima da B');
    ok(JSON.parse(ls(K1)).currencies.egoCoins === moedasB, 'C3: o progresso da aba B se perdeu');
    ok(/outra aba/.test(av) && /RECARREGAR/.test(av), `C3: a aba A não avisou (${av})`);
    det.avisoOutraAba = av;
    fb.style.display = 'none';
    await print('aviso_outra_aba');
    // voltar para a tela inicial e entrar de novo lê o save novo e destrava
    fa.W.App.openTitleScreen();
    fa.W.App.playSlot(1);
    ok(fa.W.App.state.currencies.egoCoins === moedasB && fa.W.App.saveState().ok && !aviso(fa.D), 'C3: entrar de novo não destravou a aba A');
  }
  fechar(fa);
  fechar(fb);
  localStorage.clear();

  return {
    resultado: falhas.length ? 'FALHOU' : 'OK',
    falhas,
    aberturas: nBoot,
    segundosPorAbertura: Math.round(bootMs.reduce((a, b) => a + b, 0) / bootMs.length / 1000),
    segundos: Math.round((performance.now() - t0) / 1000),
    detalhes: det
  };
})()
