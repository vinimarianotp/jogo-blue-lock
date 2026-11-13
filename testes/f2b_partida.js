(async () => {
  // AS CENAS DO GRUPO B TOCANDO DE VERDADE DENTRO DA PARTIDA (o gatilho real de cada uma):
  //   scripted_shot  → MatchEngine.playScriptedGoal (gol do roteiro do rival, Cap. 1b)
  //   chem_reaction  → MatchEngine.triggerChemicalReaction (você com a bola na área)
  //   monster_awaken → MatchEngine.checkMonster (você atrás no placar)
  //   nel_metavision → o seu 1º gol na NEL (chapter.firstGoalSakuga, pelo laço da partida)
  //   duo_ressonancia → MatchEngine.duoTryCombo (Ataque de Dupla, com a dupla simulada)
  // Cada caso: dispara, tira 2 prints durante a cena, espera a cena acabar sozinha e confere
  // que a partida continuou certa (placar, bola, tempo andando, sem erro no console).
  //   powershell -NoProfile -ExecutionPolicy Bypass -File testes\rodar.ps1 -teste f2b_partida -saida C:\Users\Public\bl_f2b\partida -timeout 1500
  const SO = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const ce0 = console.error.bind(console);
  console.error = (...a) => {
    errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300));
    ce0(...a);
  };
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine, ME = window.MatchEngine;
  const until = async (fn, ms) => {
    const t0 = Date.now();
    while (!fn() && Date.now() - t0 < ms) await wait(50);
    return fn();
  };
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
  App.startNewCareer(1, { name: 'Enjin Tsubaza' }, 'normal');
  await wait(300);
  App.closeTitleScreen();
  await clear();
  H.glFix = true;
  if (H.GL3D) H.GL3D.scale = 0.5;
  await wait(500);
  const comecar = async (capId, antes) => {
    if (CE.sakugaActive) CE.finishSakuga();
    App.state.currentChapterIndex = Math.max(0, window.CAREER_CHAPTERS.findIndex((c) => c.id === capId));
    H._th = null;
    if (antes) antes();
    const ch = App.getChapter();
    ME.startMatch(ch, App.state);
    await wait(1200);
    // sem tutorial nem conversa no meio
    ME.tutorial = null;
    if (CE.active) await clear(20);
    return ch;
  };
  const casos = [
    {
      nome: 'scripted_shot',
      cap: 'ch1b_team_y',
      disparar() {
        this.antes = { hs: ME.scoreHome, as: ME.scoreAway };
        return ME.playScriptedGoal(ME.chapter.script.goals[0]);
      },
      conferir() {
        return { placarAntes: this.antes, placarDepois: { hs: ME.scoreHome, as: ME.scoreAway }, ok: ME.scoreAway === this.antes.as + 1 && !ME.scriptBusy && ME.active };
      }
    },
    {
      nome: 'chem_reaction',
      cap: 'ch2_first_selection_v',
      disparar() {
        const p = ME.playerEntity;
        p.x = ME.PITCH_HALF_X - 160;
        p.y = 40;
        ME.ball.owner = p;
        ME.chemCharge = 100;
        ME.triggerChemicalReaction();
        return CE.sakugaType === 'chem_reaction';
      },
      conferir() {
        const b = ME.ball;
        return { bola: { x: Math.round(b.x), vx: +b.vx.toFixed(1), dono: b.owner ? b.owner.name : null }, ok: ME.active && (!b.owner || b.owner.isGK) };
      }
    },
    {
      nome: 'monster_awaken',
      cap: 'ch13_world_cup',
      antes() {
        App.state.monsterUnlocked = true;
      },
      disparar() {
        ME.scoreAway = ME.scoreHome + 1;
        ME.goalPause = 0;
        ME.replay = null;
        ME.pendingKickoff = null;
        if (ME.monster) ME.monster.used = false;
        return ME.checkMonster();
      },
      conferir() {
        return { timer: ME.monster && ME.monster.timer, ok: ME.active && ME.monster && ME.monster.timer > 600 };
      }
    },
    {
      nome: 'nel_metavision_goal',
      cap: 'ch7_nel_ubers_pxg',
      antes() {
        App.state.nelClub = 'bastard';
        App.initLeague();
      },
      disparar() {
        // o seu chute entra no gol (o laço da partida marca e chama a cena)
        const p = ME.playerEntity;
        const b = ME.ball;
        b.owner = null;
        b.passTarget = null;
        p.x = ME.PITCH_HALF_X - 260;
        p.y = 0;
        b.x = p.x + 10;
        b.y = 0;
        b.z = 5;
        b.vx = 24;
        b.vy = 0;
        b.vz = 1.0;
        b.spin = 0;
        b.curve = 0;
        ME.markKick(p);
        ME.entities.filter((e) => e.isGK).forEach((g) => {
          g.y = -120;
          g.saveLock = 999;
        });
        this.valor = App.lgState().values.you;
        return true;
      },
      conferir() {
        return { placar: { hs: ME.scoreHome, as: ME.scoreAway }, valor: this.valor, ok: ME.active && ME.scoreHome === 1 };
      }
    },
    {
      nome: 'duo_ressonancia',
      cap: 'ch1b_team_y',
      disparar() {
        // a dupla simulada (sem rede): o host com a Ressonância ligada e a bola no ataque
        ME.duo = { role: 'host', reso: true, stats: { passes: 0, assists: 0, combos: 0 }, ctx: null, patches: [], actions: [], input: { k: {}, ax: 0, ay: 0, md: false } };
        const p = ME.playerEntity;
        p.x = 400;
        p.y = 0;
        ME.ball.owner = p;
        ME.duoTryCombo(p);
        return CE.sakugaType === 'duo_ressonancia';
      },
      conferir() {
        const b = ME.ball;
        const r = { bola: { x: Math.round(b.x), vx: +b.vx.toFixed(1) }, combos: ME.duo && ME.duo.stats.combos, ok: ME.active && b.vx > 0 && !ME.duoComboBusy };
        ME.duo = null;
        return r;
      }
    }
  ];
  const rel = {};
  for (const C of casos) {
    if (SO.length && !SO.includes(C.nome)) continue;
    const e0 = errs.length;
    const R = { nome: C.nome };
    try {
      await comecar(C.cap, C.antes);
      R.disparou = !!C.disparar();
      R.tocou = await until(() => CE.sakugaActive && CE.sakugaType === C.nome, 15000);
      if (R.tocou) {
        R.roteiro = !!(CE.CINE3D[C.nome] && CE.CINE3D[C.nome]._roteiro);
        const f0 = CE.sakugaFrame;
        const t0 = performance.now();
        await wait(2500);
        window.__shot(C.nome + '_1');
        await wait(2500);
        window.__shot(C.nome + '_2');
        R.fps = Math.round(((CE.sakugaFrame - f0) / (performance.now() - t0)) * 1000);
        R.acabouSozinha = await until(() => !CE.sakugaActive, 60000);
        if (!R.acabouSozinha) CE.finishSakuga();
        // a partida segue: o relógio anda e nada quebra
        const tl = ME.timeLeft;
        await wait(2500);
        R.relogioAndou = ME.timeLeft < tl || !ME.active;
        Object.assign(R, C.conferir());
        window.__shot(C.nome + '_depois');
        await wait(3000);
      }
    } catch (e) {
      errs.push(C.nome + ': ' + (e.stack || e).toString().slice(0, 300));
    }
    R.erros = errs.length - e0;
    rel[C.nome] = R;
  }
  if (CE.sakugaActive) CE.finishSakuga();
  // (a partida fica como está: desligar o laço aqui fazia o mapa remontar e a resposta se perdia)
  const out = { resultado: errs.length || Object.values(rel).some((r) => !r.ok || !r.tocou) ? 'FALHOU' : 'OK', rel, erros: errs.slice(0, 12) };
  await wait(8000);
  return out;
})()
