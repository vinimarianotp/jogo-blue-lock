// ============================================================================
// CARREIRA EM DUPLA — A SAGA (do Cap. 16 em diante)
// Depois do Projeto Elo, a dupla segue a história grande do jogo: a Liga NEL (2 turnos,
// com a escolha do clube), a Copa do Mundo Sub-20, a final contra a França, o treino da
// Raposa, a temporada profissional (2 turnos e a Bola de Ouro), a Convocação, a Copa do
// Mundo e o último duelo contra o Rin — os mesmos capítulos da carreira solo.
// As regras (tabela da liga, valores, grupos, mata-mata) são as da carreira solo: elas
// rodam num "save sombra" da dupla (career.solo) colocado no lugar do App.state só
// enquanto a conta é feita — o save solo de ninguém é tocado. Quem criou a sala monta
// cada passo (falas, escolha do clube, partida, tabela) e manda para o parceiro.
// As falas do "VOCÊ" da história viram falas dos dois, uma de cada.
// ============================================================================
(function () {
  const App = window.App;
  const DC = window.DuoCareer;
  const Duo = window.Duo;
  const Net = window.DuoNet;
  const CE = window.CutsceneEngine;
  const ME = window.MatchEngine;
  if (!App || !DC || !Duo || !Net || !CE || !ME || !window.CAREER_CHAPTERS || !window.DUO_CHAPTERS) return;

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // O resultado da partida (tabela da liga/grupo) chega do host já em HTML: no parceiro ele
  // só pode ter tags de texto/tabela, sem script, eventos (onerror...) nem links — senão um
  // host malicioso rodaria código no navegador de quem entrou na sala
  const SAFE_TAGS = new Set(['DIV', 'SPAN', 'B', 'STRONG', 'SMALL', 'P', 'BR', 'EM', 'I', 'U', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'UL', 'OL', 'LI', 'H2', 'H3', 'H4', 'H5', 'SECTION', 'HR', 'IMG']);
  const safeHtml = (html) => {
    const t = document.createElement('template');
    t.innerHTML = String(html || '').slice(0, 80000);
    const walk = (node) => {
      [...node.children].forEach((el) => {
        if (!SAFE_TAGS.has(el.tagName)) {
          el.remove();
          return;
        }
        [...el.attributes].forEach((a) => {
          const n = a.name.toLowerCase();
          const ok =
            n === 'class' ||
            (n === 'style' && !/url\s*\(|expression|javascript|@import/i.test(a.value)) ||
            (n === 'src' && el.tagName === 'IMG' && /^(data:image\/(png|gif|jpeg|webp);|icons\/)/i.test(a.value));
          if (!ok) el.removeAttribute(a.name);
        });
        walk(el);
      });
    };
    walk(t.content);
    return t.innerHTML;
  };
  const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : '#fde047');
  const N = (text, extra) => Object.assign({ speaker: 'NARRADOR', text, mood: 'tense' }, extra || {});
  const EGO = (text, extra) => Object.assign({ speaker: 'JINPACHI EGO', text, mood: 'ego' }, extra || {});
  const SHADOW_KEYS = ['nel', 'nelClub', 'pro', 'proClub', 'cup', 'seenInterludes', 'monsterUnlocked'];

  // ---------------------------------------------------------------- capítulos
  window.DUO_ARCS.push('ARCO 6 • A LIGA NEO EGOÍSTA', 'ARCO 7 • A COPA SUB-20', 'ARCO 8 • PROFISSIONAIS', 'ARCO 9 • A COPA DO MUNDO', 'EPÍLOGO • O ÚLTIMO DUELO');
  const SAGA = [
    ['ch6_nel_barcha_manshine', 5, 'Liga NEL • 1º turno'],
    ['ch7_nel_ubers_pxg', 5, 'Liga NEL • 2º turno'],
    ['ch8_u20_england', 6, 'Copa do Mundo Sub-20'],
    ['ch9_world_cup_final', 6, 'A Final: Japão x França'],
    ['ch10_fox_training', 7, 'O Teste da Raposa'],
    ['ch11_pro_season_1', 7, 'Temporada 1 • 1º turno'],
    ['ch12_pro_season_2', 7, 'Temporada 1 • 2º turno e a Bola de Ouro'],
    ['ch12b_wc_camp', 8, 'A Convocação'],
    ['ch13_world_cup', 8, 'A Copa do Mundo'],
    ['ch14_rin_final', 9, 'O Último Duelo']
  ];
  const base = window.DUO_CHAPTERS.length;
  window.DUO_SAGA = SAGA.map(([solo, arc, title], k) => {
    const sch = window.CAREER_CHAPTERS.find((c) => c.id === solo) || {};
    return {
      id: 'saga_' + solo,
      saga: true,
      solo,
      arc,
      title,
      number: base + 1 + k,
      era: window.DUO_ARCS[arc],
      summary: sch.loreSummary || sch.title || title,
      reward: { stats: 14, sintonia: 4 },
      ending: solo === 'ch14_rin_final'
    };
  });
  DC.chapters = () => window.DUO_CHAPTERS.concat(window.DUO_SAGA);

  // Do Projeto Elo para a NEL (toca uma vez, antes da escolha do clube)
  const BRIDGE = [
    EGO('"Projeto Elo: encerrado. A Sub-20 levou os DOIS. Mas antes da Copa, vem a parte grande."', { bg: 'monitor_room' }),
    EGO('"A Liga Neo Egoísta. Os cinco maiores clubes da Europa vão disputar vocês. No mesmo clube: essa dupla não se separa."'),
    { speaker: 'ANRI TEIERI', text: 'Cada gol de vocês vale dinheiro no ranking. Os 23 mais valiosos do Blue Lock vão para a Copa Sub-20.', mood: 'normal' }
  ];

  Object.assign(DC, {
    sagaDef(idx) {
      return this.chapters()[idx];
    },
    sagaSoloIdx(def) {
      return window.CAREER_CHAPTERS.findIndex((c) => c.id === def.solo);
    },

    // ---------------------------------------------------------- save sombra
    // O App.state de mentira da dupla (o nome dos dois junto, a liga e a copa dela)
    sagaAppState(save, soloIdx) {
      const nm = this.names(save);
      const pa = this.playerOf(save, 'a');
      const st = Object.assign(App.defaultState(), JSON.parse(JSON.stringify(save.solo || {})));
      st.profile = Object.assign({}, st.profile, pa?.profile || {}, { name: `${nm.a} & ${nm.b}` });
      st.currentChapterIndex = soloIdx;
      st.seenInterludes = st.seenInterludes || {};
      return st;
    },
    withShadow(fn) {
      const s = this.story;
      if (!s?.app) return undefined;
      const real = App.state;
      const keep = { saveState: App.saveState, renderAll: App.renderAll, unlockAchievement: App.unlockAchievement, notify: App.notify };
      App.state = s.app;
      App.saveState = () => {};
      App.renderAll = () => {};
      App.unlockAchievement = () => {};
      App.notify = () => {};
      try {
        return fn();
      } finally {
        App.state = real;
        Object.assign(App, keep);
      }
    },
    // O que o solo escreveria na janela de resultado (tabela da liga / grupo / chave),
    // sem os botões — vira o passo "resultado" das duas telas
    captureModal(fn) {
      const modal = document.getElementById('cinematic-modal');
      const content = document.getElementById('cinematic-modal-content');
      if (!modal || !content) return { html: '', ret: fn() };
      const before = content.innerHTML;
      const wasOpen = modal.classList.contains('open');
      App.lastReportHtml = '';
      const ret = fn();
      const box = document.createElement('div');
      box.innerHTML = content.innerHTML;
      box.querySelectorAll('.dilemma-buttons, button').forEach((el) => el.remove());
      content.innerHTML = before;
      if (!wasOpen) modal.classList.remove('open');
      // os prêmios da janela do solo (EgoCoins, SP, Giro) não valem aqui: a dupla ganha no fim do capítulo
      const html = box.innerHTML
        .replace(/\+\d+ EgoCoins[^<]*/g, '')
        .replace(/Seu valor de mercado/g, 'Valor da dupla')
        .replace(/Seus pontos na Bola de Ouro/g, 'Pontos da dupla na Bola de Ouro')
        .replace(/Na liga não tem repetição: o resultado fica na tabela\./g, '');
      return { html, ret };
    },

    // ---------------------------------------------------------- falas
    // Falas da carreira solo para as duas telas: só as do clube certo, sem escolhas
    // (elas mexem no save solo), e o "VOCÊ" dividido entre os dois
    sagaLines(lines) {
      const s = this.story;
      const app = s.app;
      const nm = this.names();
      const club = app.proClub || app.nelClub;
      let turn = 0;
      return (lines || [])
        .filter((l) => l && !l.when)
        .filter((l) => (!l.ifClub || l.ifClub === app.proClub) && (!l.ifNotClub || l.ifNotClub !== app.proClub))
        .filter((l) => !l.club || [].concat(l.club).includes(club))
        .filter((l) => !l.cinematic || CE.hasSakuga?.(l.cinematic))
        .map((l) => {
          const o = Object.assign({}, l);
          ['choices', 'id', 'ifClub', 'ifNotClub', 'club', 'when'].forEach((k) => delete o[k]);
          if (o.speaker && /VOCÊ/i.test(o.speaker)) o.speaker = turn++ % 2 ? nm.b : nm.a;
          return o;
        });
    },

    // ---------------------------------------------------------- início
    runSaga(idx) {
      const def = this.sagaDef(idx);
      if (!def || !this.career) return;
      this.chapterResult = null;
      const soloIdx = this.sagaSoloIdx(def);
      this.story = {
        saga: true,
        idx,
        ch: def,
        soloIdx,
        steps: [],
        i: -1,
        meDone: -1,
        partnerDone: -1,
        picks: {},
        styles: {},
        delta: { sintonia: 0, flags: {}, path: null, flowFor: false },
        reports: {},
        res: { duo: { passes: 0, assists: 0, combos: 0 }, forfeit: false, sh: 0, sa: 0 },
        q: [],
        phase: 'start',
        app: Net.role === 'host' ? this.sagaAppState(this.career, soloIdx) : null
      };
      document.getElementById('duo-screen')?.classList.remove('open');
      App.closeTitleScreen?.();
      this.patchSpeakers(true);
      if (Net.role === 'host') this.sagaNext();
      else this.renderWaiting(`⏳ Esperando ${this.partnerName()}...`);
    },

    // ---------------------------------------------------------- passos (host)
    sagaNext() {
      const s = this.story;
      if (!s || Net.role !== 'host') return;
      if (!s.q.length) this.sagaPlan();
      const step = s.q.shift() || { end: true };
      s.i++;
      Net.send({ t: 'sstep', i: s.i, step: step.match ? { match: true } : step });
      this.sagaExec(step, s.i);
    },

    sagaPlan() {
      const s = this.story;
      const sch = window.CAREER_CHAPTERS[s.soloIdx];
      const app = s.app;
      if (s.phase === 'start') {
        s.phase = 'pre';
        if (sch.nelPhase !== undefined && !app.nelClub) {
          s.q.push({ lines: this.sagaLines([...(s.ch.number === base + 1 ? BRIDGE : []), ...(window.NEL_DRAFT_INTRO || [])]), bg: sch.mapTheme, title: 'A ESCOLHA DO CLUBE' });
          s.q.push({ pick: 'nel', options: this.clubOptions('nel') });
          return;
        }
        if (sch.league === 'pro' && !app.proClub) {
          s.q.push({ lines: [{ speaker: 'FOX', text: '"Hehehe. Cinco clubes da Liga Europeia querem a dupla do Elo. Os dois, no mesmo vestiário. Escolham... e eu escolho o que vocês vão virar."', mood: 'ego' }], bg: 'monitor_room', title: 'AS PROPOSTAS' });
          s.q.push({ pick: 'pro', options: this.clubOptions('pro') });
          return;
        }
      }
      if (s.phase === 'pre') {
        let ch = null;
        this.withShadow(() => {
          if (sch.format === 'league' && !App.lgState()) App.initLeague();
          ch = App.getChapter(s.soloIdx);
        });
        s.curCh = ch;
        const lines = this.preLines(ch, sch);
        if (lines.length) s.q.push({ lines, bg: ch.mapTheme, title: ch.era });
        s.q.push({ match: true });
        s.phase = 'match';
        return;
      }
      s.q.push({ end: true });
    },

    // As falas antes do jogo: a história inteira no 1º jogo do capítulo/turno/copa;
    // nos outros, só o anúncio da rodada (igual à carreira solo)
    preLines(ch, sch) {
      const app = this.story.app;
      if (ch.leagueMatch) {
        let L = null;
        let lgs = null;
        this.withShadow(() => {
          L = App.lg();
          lgs = App.lgState();
        });
        if (lgs.games % L.gamesPerChapter !== 0) {
          const opp = L.clubs[ch.leagueMatch.opp];
          const star = L.id === 'pro' ? window.findCharacter(L.rosters[opp.id][0]) : window.findCharacter(opp.master);
          return this.sagaLines([
            N(`Rodada ${ch.leagueMatch.roundIdx + 1} da ${L.name}: ${L.clubs[app[L.clubKey]].name} x ${opp.name}.`),
            { speaker: star?.name?.toUpperCase() || 'RIVAL', text: L.id === 'pro' ? '"Dois do Blue Lock no mesmo time? Aqui a gente quebra o tornozelo de quem chega se achando."' : '"Mostrem os seus números em campo. Os dois."', mood: 'ego' }
          ]);
        }
      }
      if (ch.format === 'cup' && ch.cupIdx > 0) {
        const r = ch.cupRounds[ch.cupIdx];
        const cupName = ch.friendly ? 'Pré-Copa' : ch.cupName || 'Copa do Mundo';
        const talk = (r.dialogues && window.CHAPTER_DIALOGUES?.[r.dialogues]) || [];
        return this.sagaLines([N(`${cupName}, ${r.name.toLowerCase()}: Japão x ${r.rivalName}.`), ...talk, ...(r.intro || [])]);
      }
      const seen = app.seenInterludes || (app.seenInterludes = {});
      const fresh = [].concat(ch.interlude || []).filter((id) => !seen[id] && window.STORY_INTERLUDES?.[id]);
      fresh.forEach((id) => (seen[id] = true));
      const cupStart = ch.format === 'cup' && ch.cupStartInterlude && ch.cupIdx === 0 && app.cup?.chapterId !== ch.id && window.STORY_INTERLUDES?.[ch.cupStartInterlude];
      const dialog = (window.CHAPTER_DIALOGUES?.[ch.id] || []).filter((l) => !l.club || [].concat(l.club).includes(ch.league === 'pro' ? app.proClub : app.nelClub));
      const four = ch.hasFourEgosCutscene && window.STORY_INTERLUDES?.four_egos ? window.STORY_INTERLUDES.four_egos.lines : [];
      return this.sagaLines([
        ...fresh.flatMap((id) => window.STORY_INTERLUDES[id].lines),
        ...dialog,
        ...(ch.introCutscene || []),
        ...(cupStart ? window.STORY_INTERLUDES[ch.cupStartInterlude].lines : []),
        ...(ch.format === 'cup' ? ch.cupRounds[ch.cupIdx].intro || [] : []),
        ...four
      ]);
    },

    clubOptions(kind) {
      if (kind === 'nel') {
        return (window.NEL_CLUB_ORDER || Object.keys(window.NEL_CLUBS)).map((id) => {
          const c = window.NEL_CLUBS[id];
          return { id, name: c.name, sub: `Mestre: ${window.findCharacter(c.master)?.name || '?'}`, color: c.color, secondary: c.secondary };
        });
      }
      return (window.PRO_CLUB_ORDER || Object.keys(window.PRO_CLUBS)).map((id) => {
        const c = window.PRO_CLUBS[id];
        return { id, name: c.name, sub: c.country, color: c.color, secondary: c.secondary, fox: window.PRO_OFFERS?.[id]?.fox };
      });
    },

    // ---------------------------------------------------------- passos (os dois)
    sagaExec(step, i) {
      const s = this.story;
      if (!s) return;
      s.i = i;
      this.renderWaiting();
      const done = () => this.stepDone(i);
      if (step.end) return this.finishChapter();
      if (step.match) return this.sagaMatch(done);
      if (step.pick) return this.showClubPick(step, done);
      if (step.result) return this.showSagaResult(step.result, done);
      if (step.lines) {
        if (!step.lines.length) return done();
        CE.play({ locationTitle: `CAP. ${s.ch.number} • ${String(step.title || s.ch.title).toUpperCase()}`, crestTitle: 'BLUE LOCK • DUPLA', bg: step.bg || 'monitor_room', dark: !!step.dark, lines: step.lines, onComplete: done });
        return;
      }
      done();
    },

    showClubPick(step, done) {
      const host = Net.role === 'host';
      if (!host) {
        this.overlay(`<div class="duo-story-cap">✍️ A ESCOLHA DO CLUBE</div><h2>${esc(this.partnerName().toUpperCase())} ESTÁ ESCOLHENDO O CLUBE DA DUPLA...</h2><p class="duo-story-sub">Os dois jogam no mesmo clube.</p>`);
        this._pickClose = true;
        done();
        return;
      }
      this._clubDone = done;
      this._clubKind = step.pick;
      this.overlay(`
        <div class="duo-story-cap">✍️ ${step.pick === 'nel' ? 'LIGA NEO EGOÍSTA' : 'LIGA EUROPEIA'} • ESCOLHA O CLUBE DA DUPLA</div>
        <h2>ONDE A DUPLA VAI JOGAR?</h2>
        <p class="duo-story-sub">Os dois assinam com o mesmo clube. Não dá para trocar depois.</p>
        <div class="duo-clubs">
          ${step.options
            .map(
              (o) => `
            <button class="duo-club" style="--c:${o.color};--c2:${o.secondary || '#0b1120'}" onclick="DuoCareer.pickClub('${o.id}')">
              <b>${esc(o.name)}</b><small>${esc(o.sub || '')}</small>${o.fox ? `<i>🦊 ${esc(o.fox)}</i>` : ''}
            </button>`
            )
            .join('')}
        </div>`);
    },
    pickClub(id) {
      const s = this.story;
      if (!s?.app || !this._clubDone) return;
      if (this._clubKind === 'nel') s.app.nelClub = id;
      else s.app.proClub = id;
      window.SFX?.click?.();
      this.overlay(null);
      const d = this._clubDone;
      this._clubDone = null;
      d();
    },

    showSagaResult(r, done) {
      this._resDone = done;
      this.overlay(`
        <div class="duo-story-cap" style="color:${safeColor(r.color)}">${esc(r.title || 'RESULTADO')}</div>
        <h2>${esc(r.sub || '')}</h2>
        <div class="duo-saga-res">${safeHtml(r.html)}</div>
        <button class="duo-btn primary big" onclick="DuoCareer.closeSagaResult()">CONTINUAR ▶</button>`);
    },
    closeSagaResult() {
      this.overlay(null);
      const d = this._resDone;
      this._resDone = null;
      d?.();
    },

    // A partida: o host joga com o capítulo inteiro (roteiro, cenas) e manda o essencial
    sagaMatch(done) {
      const s = this.story;
      if (this._pickClose) {
        this.overlay(null);
        this._pickClose = false;
      }
      s.matchDone = done;
      s.inMatch = true;
      this.renderWaiting();
      if (Net.role !== 'host') return;
      const ch = Object.assign({}, s.curCh, { duoStory: true });
      const lean = this.leanChapter(ch);
      Net.send({ t: 'start', ch: lean, story: true });
      Duo.beginMatch(ch, this.storyStates());
      // a final dos Quatro Egos começa com o Fluxo e a Química cheios (igual ao solo)
      if (ch.hasFourEgosCutscene) {
        ME.flowState.charge = 100;
        if (ME.duo?.ctx) ME.duo.ctx.flowState.charge = 100;
        ME.chemCharge = 100;
        ME.showBanner("SINGULARIDADE: 4 EGO'S!", 'Fluxo e Química carregados. Decidam a Final!', '#00f5d4', 140);
      }
    },
    leanChapter(ch) {
      const keys = ['id', 'era', 'title', 'mapTheme', 'matchDuration', 'targetGoals', 'goalLimit', 'drawIsWin', 'difficulty', 'teammateIds', 'opponentIds', 'teamName', 'opponentName', 'homeColor', 'homeSecondary', 'opponentColor', 'opponentSecondary', 'scoreLabels', 'bigTeams', 'threeVsThree', 'leagueLabel', 'hype', 'duoStory', 'script'];
      const out = {};
      keys.forEach((k) => ch[k] !== undefined && (out[k] = ch[k]));
      return out;
    },

    // ---------------------------------------------------------- fim de jogo (host)
    sagaAfterMatch(res, myRep, otherRep) {
      const s = this.story;
      const me = this.pid();
      const other = Object.keys(this.career.players).find((p) => p !== me);
      // soma o que cada um fez no capítulo (vira atributo no fim) e a Sintonia da dupla
      [[me, myRep], [other, otherRep]].forEach(([pid, rep]) => {
        if (!rep) return;
        const acc = s.reports[pid] || (s.reports[pid] = { gains: {}, goals: 0 });
        Object.entries(rep.gains || {}).forEach(([k, v]) => (acc.gains[k] = (acc.gains[k] || 0) + v));
        acc.goals += rep.goals || 0;
      });
      if (res?.duo) ['passes', 'assists', 'combos'].forEach((k) => (s.res.duo[k] += res.duo[k] || 0));
      s.res.sh = res?.sh || 0;
      s.res.sa = res?.sa || 0;
      const ch = s.curCh;
      const sch = window.CAREER_CHAPTERS[s.soloIdx];
      const gf = res?.sh || 0;
      const ga = res?.sa || 0;
      const won = gf > ga;
      const draw = gf === ga;
      if (!res || res.forfeit) {
        s.q.push({ lines: [N('A partida foi interrompida. O capítulo continua de onde parou na próxima vez.')], bg: 'monitor_room' });
        s.phase = 'end';
        return;
      }
      const rep = { rating: ((myRep?.rating || 6) + (otherRep?.rating || 6)) / 2, goals: (myRep?.goals || 0) + (otherRep?.goals || 0) };
      const color = won ? '#00f5d4' : draw ? '#facc15' : '#ef4444';
      // Liga (NEL / Liga Europeia): o resultado entra na tabela; no 4º jogo fecha o turno
      if (ch.leagueMatch) {
        let turn = null;
        const cap = this.withShadow(() =>
          this.captureModal(() => {
            App.handleLeagueMatch(ch, gf, ga, rep);
            const L = App.lg();
            const lgs = App.lgState();
            turn = { done: lgs.games % L.gamesPerChapter === 0, games: lgs.games };
            App.pendingLeagueFinish = null;
          })
        );
        s.q.push({ result: { title: `${won ? 'VITÓRIA' : draw ? 'EMPATE' : 'DERROTA'} • JOGO ${turn.games} DE 8`, sub: `${ch.scoreLabels?.home || 'DUPLA'} ${gf} x ${ga} ${ch.scoreLabels?.away || ''}`, html: cap.html, color } });
        if (turn.done) {
          s.q.push({ lines: this.sagaLines([...this.turnLines(), ...(sch.postMatchCutscene || [])]), bg: ch.mapTheme, title: 'FIM DO TURNO' });
          this.sagaComplete(sch);
        } else s.phase = 'pre';
        return;
      }
      // Copa: grupos, mata-mata e amistosos com as regras do solo
      if (ch.format === 'cup') {
        const cap = this.withShadow(() => this.captureModal(() => App.handleCupMatch(ch, gf, ga)));
        const goesOn = cap.ret !== false;
        if (goesOn) {
          s.q.push({ result: { title: 'COPA', sub: `JAPÃO ${gf} x ${ga} ${ch.cupRounds?.[ch.cupIdx]?.label || ''}`, html: cap.html, color } });
          s.phase = 'pre';
        } else {
          s.q.push({ result: { title: '🏆 CAMPEÕES!', sub: `JAPÃO ${gf} x ${ga} ${ch.cupRounds?.[ch.cupIdx]?.label || ''}`, html: '', color: '#facc15' } });
          s.q.push({ lines: this.sagaLines([...(ch.victorySakuga ? [{ cinematic: ch.victorySakuga }] : []), ...(sch.postMatchCutscene || [])]), bg: ch.mapTheme, title: 'A TAÇA' });
          this.sagaComplete(sch);
        }
        return;
      }
      // Capítulo de um jogo só (a final, o treino da Raposa, o último duelo)
      const ok = won || (ch.drawIsWin !== false && draw && gf >= (ch.targetGoals || 1));
      if (ok) {
        s.q.push({ lines: this.sagaLines([...(ch.victorySakuga ? [{ cinematic: ch.victorySakuga }] : []), ...(sch.postMatchCutscene || [])]), bg: ch.mapTheme, title: 'PÓS-JOGO' });
        this.sagaComplete(sch);
      } else {
        s.q.push({ lines: [EGO('"Perderam. Ótimo: agora vocês sabem o tamanho do buraco. De novo."')], bg: 'monitor_room' });
        s.phase = 'end';
      }
    },

    sagaComplete(sch) {
      const s = this.story;
      s.won = true;
      s.advance = true;
      if (sch.unlocksMonster) s.app.monsterUnlocked = true;
      s.phase = 'end';
    },

    // Fecha o turno da liga: a posição na tabela e no ranking (e a gala da Bola de Ouro)
    turnLines() {
      return this.withShadow(() => {
        const L = App.lg();
        const club = L.clubs[App.lgClub()];
        const pos = App.leagueStandings().findIndex((r) => r.club === App.lgClub()) + 1;
        const ranking = App.leagueValueRanking();
        const vpos = ranking.findIndex((r) => r.id === 'you') + 1;
        const final = App.lgState().games >= 8;
        const value = App.fmtLeagueValue(App.lgState().values.you);
        if (L.id !== 'pro') {
          return [
            N(`${final ? 'Fim da Liga Neo Egoísta' : 'Fim do 1º turno'}: o ${club.name} está em ${pos}º lugar na tabela.`),
            EGO(`"O valor da dupla: ${value}. ${vpos}º no ranking do Blue Lock. ${vpos <= (window.NEL_CUTOFF || 23) ? (final ? 'Os dois vão para a Copa.' : 'Por enquanto, os dois estão entre os 23 da Copa.') : 'Fora dos 23. Os números não mentem: subam ou fiquem para trás.'}"`)
          ];
        }
        const winner = ranking[0];
        const winnerName = winner.id === 'you' ? App.state.profile.name : window.findCharacter(winner.id)?.name || winner.id;
        if (!final) {
          return [N(`Fim do 1º turno da Liga Europeia: o ${club.name} está em ${pos}º lugar.`), { speaker: 'FOX', text: `"A dupla tá em ${vpos}º na corrida pela Bola de Ouro, com ${value}. Quem lidera é ${winnerName}. Hehehe... dois pela mesma bola de ouro. Quem vai ficar com ela?"`, mood: 'ego' }];
        }
        return [
          N(`Fim da temporada: o ${club.name} terminou a Liga Europeia em ${pos}º lugar.${pos === 1 ? ' CAMPEÕES DA EUROPA!' : ''}`, { music: 'tension' }),
          N('Paris, gala da Bola de Ouro. Smokings, flashes e os melhores jogadores do planeta na mesma sala.', { bg: 'paris_gala' }),
          { speaker: 'APRESENTADOR', text: '"E a Bola de Ouro desta temporada vai para..."', mood: 'tense', bg: 'paris_gala' },
          vpos === 1
            ? { speaker: 'APRESENTADOR', text: `"PELA PRIMEIRA VEZ NA HISTÓRIA... PARA DOIS! ${App.state.profile.name.toUpperCase()}!!! A dupla do Blue Lock é a MELHOR DO MUNDO!"`, mood: 'happy', bg: 'paris_gala', music: 'victory' }
            : { speaker: 'APRESENTADOR', text: `"${winnerName.toUpperCase()}!" A dupla terminou em ${vpos}º, com ${value}.`, mood: 'tense', bg: 'paris_gala' },
          ...(vpos === 1 ? [{ cinematic: 'bola_de_ouro_discurso' }] : []),
          vpos === 1 ? EGO('"Dois melhores do mundo saíram do Blue Lock. Agora falta uma coisa: a Copa do Mundo."', { bg: 'paris_gala' }) : EGO('"Perderam. Ótimo. Guardem essa raiva para a Copa do Mundo."', { bg: 'paris_gala' }),
          { speaker: 'FOX', text: '"Hehehe... a temporada acabou. Agora o país chama vocês. Vão pra Copa, monstros. Eu vou estar assistindo."', mood: 'ego', bg: 'paris_gala', music: 'dread' }
        ];
      });
    }
  });

  // ---------------------------------------------------------- ganchos no diretor
  const wrap = (name, make) => {
    const orig = DC[name];
    DC[name] = make(orig);
  };
  // Capítulo da saga: começa pelo runner da saga
  wrap('runChapter', (orig) =>
    function (idx) {
      if (this.sagaDef(idx)?.saga) return this.runSaga(idx);
      return orig.call(this, idx);
    }
  );
  wrap('onMessage', (orig) =>
    function (msg) {
      if (msg.t === 'sstep') {
        if (this.story?.saga && Net.role === 'guest') {
          if (this._pickClose && !msg.step.match) {
            this.overlay(null);
            this._pickClose = false;
          }
          this.sagaExec(msg.step, msg.i);
        }
        return true;
      }
      return orig.call(this, msg);
    }
  );
  // Na saga quem avança é o host (ele monta o próximo passo); o parceiro espera o "sstep"
  wrap('tryAdvance', (orig) =>
    function () {
      const s = this.story;
      if (!s?.saga) return orig.call(this);
      if (Net.role === 'host' && s.meDone >= s.i && s.partnerDone >= s.i) this.sagaNext();
      else this.renderWaiting();
    }
  );
  wrap('onMatchEnd', (orig) =>
    function (res, myRep, otherRep) {
      const s = this.story;
      if (!s?.saga) return orig.call(this, res, myRep, otherRep);
      s.inMatch = false;
      if (Net.role === 'host') this.sagaAfterMatch(res, myRep, otherRep);
      else if (res?.forfeit) s.res.forfeit = false;
      const d = s.matchDone;
      s.matchDone = null;
      d?.();
    }
  );
  // Fim do capítulo da saga: a liga/copa da dupla volta para o save dela
  wrap('finishChapter', (orig) =>
    function () {
      const s = this.story;
      if (s?.saga && Net.role === 'host' && s.app && this.career) {
        const out = {};
        SHADOW_KEYS.forEach((k) => (out[k] = s.app[k] ?? null));
        this.career.solo = out;
      }
      return orig.call(this);
    }
  );
  // Depois do treino da Raposa, o monstro também acorda nos dois
  wrap('playerState', (orig) =>
    function (save, pid) {
      const st = orig.call(this, save, pid);
      st.monsterUnlocked = !!save?.solo?.monsterUnlocked;
      return st;
    }
  );
})();
