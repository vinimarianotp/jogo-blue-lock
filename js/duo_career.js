// ============================================================================
// CARREIRA EM DUPLA — "PROJETO ELO" (o diretor da história)
// O save da dupla fica nos DOIS aparelhos (localStorage 'bluelock_duo_careers', um por
// par de jogadores). Cada aparelho tem um id próprio (pid). Quem criou a sala é a
// autoridade: escolhe a versão mais nova, aplica as recompensas e manda o save novo.
// Os passos de um capítulo (cena, escolha dupla, estilo, Fluxo, partida) rodam nos dois
// aparelhos ao mesmo tempo: cada um avisa quando terminou o passo (sdone) e o próximo só
// começa com os dois prontos ("Esperando o parceiro...").
// ============================================================================
(function () {
  const App = window.App;
  const Duo = window.Duo;
  const Net = window.DuoNet;
  const CE = window.CutsceneEngine;
  if (!App || !Duo || !Net || !CE || !window.DUO_CHAPTERS) return;

  const KEY = 'bluelock_duo_careers';
  const PID_KEY = 'bluelock_duo_pid';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const STATS = ['velocidade', 'resistencia', 'forca', 'habilidadeAerea', 'finalizando', 'poderDisparo', 'tirosLongos', 'conducao', 'visao', 'posicionamento', 'compostura', 'ego'];
  const STAT_LABEL = { finalizando: 'Finalização', poderDisparo: 'Poder de Disparo', tirosLongos: 'Tiros Longos', conducao: 'Condução', velocidade: 'Velocidade', resistencia: 'Resistência', visao: 'Visão', forca: 'Força', posicionamento: 'Posicionamento', compostura: 'Compostura', ego: 'Ego', habilidadeAerea: 'Hab. Aérea' };
  // Cenas grandes da dupla (as que entram no 🎬 REVER)
  const SCENES = [
    ['duo_ponte', 'A Ponte Velha'],
    ['duo_elo', 'O Elo se Fecha'],
    ['duo_ressonancia', 'Ressonância'],
    ['duo_regra', 'A Regra do Um'],
    ['duo_mascaras', 'As Máscaras Caem'],
    ['duo_final', 'Dois Egos, Um Gol']
  ];

  const DC = {
    career: null, // save da dupla da sala atual
    story: null, // capítulo rodando agora
    chapterResult: null,

    // ------------------------------------------------------------ guardado
    pid() {
      if (this._sessionPid) return this._sessionPid;
      let id = null;
      try {
        id = localStorage.getItem(PID_KEY);
        if (!id) {
          id = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
          localStorage.setItem(PID_KEY, id);
        }
      } catch (e) {
        id = this._pid || (this._pid = 'p' + Math.random().toString(36).slice(2, 10));
      }
      return id;
    },
    all() {
      try {
        return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
      } catch (e) {
        return {};
      }
    },
    store(save) {
      if (!save?.id) return;
      const all = this.all();
      all[save.id] = save;
      try {
        localStorage.setItem(KEY, JSON.stringify(all));
      } catch (e) {}
    },
    findFor(p1, p2) {
      const list = Object.values(this.all()).filter((s) => s?.players?.[p1] && s.players[p2]);
      return list.sort((a, b) => (b.rev || 0) - (a.rev || 0))[0] || null;
    },

    // Os dois da carreira: A (quem fundou) e B
    slotPid(save, slot) {
      return Object.keys(save?.players || {}).find((k) => save.players[k].slot === slot) || null;
    },
    playerOf(save, slot) {
      const pid = this.slotPid(save, slot);
      return pid ? save.players[pid] : null;
    },
    names(save = this.career) {
      return { a: this.playerOf(save, 'a')?.profile?.name || 'A', b: this.playerOf(save, 'b')?.profile?.name || 'B' };
    },

    newPlayer(pid, slot, prof) {
      const p = prof?.profile || {};
      return {
        pid,
        slot,
        profile: { name: p.name || (slot === 'a' ? 'Jogador A' : 'Jogador B'), shirtName: p.shirtName, number: p.number || (slot === 'a' ? 11 : 10), position: p.position || 'CF', skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle },
        stats: Object.assign({}, window.DUO_BASE_STATS),
        style: null,
        flow: false,
        accessories: (prof?.equippedAccessories || []).slice(),
        goals: 0,
        matches: 0
      };
    },

    // A carreira nova (no host): você é o A, o parceiro é o B
    create() {
      if (Net.role !== 'host' || !Duo.partnerPid) return;
      const me = this.pid();
      const save = {
        v: 1,
        id: 'elo-' + Math.random().toString(36).slice(2, 9),
        created: Date.now(),
        rev: 1,
        chapter: 0,
        done: [],
        results: {},
        sintonia: 10,
        path: null,
        flags: {},
        seen: {},
        picks: {},
        players: { [me]: this.newPlayer(me, 'a', Duo.me || Duo.myProfile()), [Duo.partnerPid]: this.newPlayer(Duo.partnerPid, 'b', Duo.partner) }
      };
      this.career = save;
      this.store(save);
      Net.send({ t: 'careerSync', save });
      Duo.render();
    },

    // Estado de jogador da partida para um dos dois (atributos da dupla + estilo + Fluxo)
    playerState(save, pid) {
      const pl = save.players[pid];
      const style = pl.style ? window.DUO_STYLES[pl.style] : null;
      return {
        profile: Object.assign({}, pl.profile),
        stats: Object.assign({}, pl.stats),
        equippedWeapon: style ? style.weapon : null,
        equippedWeapon2: null,
        equippedFlow: pl.flow ? window.DUO_FLOW : null,
        equippedFlow2: null,
        nelUnlocked: false,
        equippedAccessories: pl.accessories || [],
        difficulty: App.state?.difficulty || 'normal',
        tutorial: { basic: true, advanced: true },
        affinities: {},
        ovr: Math.floor(STATS.reduce((s, k) => s + (pl.stats[k] || 0), 0) / 22) + (style ? 2 : 0) + (pl.flow ? 2 : 0)
      };
    },

    // ------------------------------------------------------------ rede
    // Depois do "hello": cada um manda a carreira que tem com esse parceiro
    onHello() {
      this.career = null;
      const mine = Duo.partnerPid ? this.findFor(this.pid(), Duo.partnerPid) : null;
      Net.send({ t: 'career', save: mine });
      if (Net.role === 'host') this._hostOwn = mine;
    },

    onMessage(msg) {
      switch (msg.t) {
        case 'career':
          // o host fica com a versão mais nova (a sua ou a do parceiro) e manda para ele
          if (Net.role === 'host') {
            const own = this._hostOwn ?? this.findFor(this.pid(), Duo.partnerPid);
            const theirs = msg.save && msg.save.players?.[this.pid()] ? msg.save : null;
            const pick = [own, theirs].filter(Boolean).sort((a, b) => (b.rev || 0) - (a.rev || 0))[0] || null;
            this.career = pick;
            if (pick) {
              this.store(pick);
              Net.send({ t: 'careerSync', save: pick });
            }
            Duo.render();
          }
          return true;
        case 'careerSync':
          if (msg.save?.players?.[this.pid()]) {
            this.career = msg.save;
            this.store(msg.save);
            if (this.story?.finishing) this.showChapterResult();
            Duo.render();
          }
          return true;
        case 'story':
          if (Net.role === 'guest') this.runChapter(msg.ch);
          return true;
        case 'sdone':
          if (this.story && msg.i >= 0) {
            this.story.partnerDone = Math.max(this.story.partnerDone, msg.i);
            this.tryAdvance();
          }
          return true;
        case 'pick':
          if (this.story) {
            this.story.picks[msg.id] = Object.assign({}, this.story.picks[msg.id], { [msg.pid]: msg.tag });
            this.checkDual();
          }
          return true;
        case 'style':
          if (this.story) {
            this.story.styles[msg.pid] = msg.style;
            this.renderWaiting();
          }
          return true;
      }
      return false;
    },

    // ------------------------------------------------------------ capítulo
    startChapter() {
      if (Net.role !== 'host' || !this.career || this.story) return;
      const idx = clamp(this.career.chapter, 0, window.DUO_CHAPTERS.length - 1);
      Net.send({ t: 'story', ch: idx });
      this.runChapter(idx);
    },

    runChapter(idx) {
      const ch = window.DUO_CHAPTERS[idx];
      if (!ch || !this.career) return;
      this.chapterResult = null;
      this.story = {
        idx,
        ch,
        steps: ch.pre.slice().concat([{ match: true }]),
        i: -1,
        meDone: -1,
        partnerDone: -1,
        picks: {},
        styles: {},
        delta: { sintonia: 0, flags: {}, path: null, flowFor: false },
        reports: {},
        res: null
      };
      document.getElementById('duo-screen')?.classList.remove('open');
      App.closeTitleScreen?.();
      this.patchSpeakers(true);
      this.next();
    },

    next() {
      const s = this.story;
      if (!s) return;
      s.i++;
      this.renderWaiting();
      if (s.i >= s.steps.length) {
        this.finishChapter();
        return;
      }
      const step = s.steps[s.i];
      const done = () => this.stepDone(s.i);
      if (step.match) return this.playMatchStep(done);
      if (step.style) return this.showStylePick(done);
      if (step.flow) return this.showFlowGift(done);
      if (step.dual) return this.showDual(step.dual, done);
      if (step.lines) return this.playLines(step, done);
      done();
    },

    stepDone(i) {
      const s = this.story;
      if (!s || i !== s.i || s.meDone >= i) return;
      s.meDone = i;
      Net.send({ t: 'sdone', i });
      this.tryAdvance();
    },

    tryAdvance() {
      const s = this.story;
      if (!s) return;
      if (s.meDone >= s.i && s.partnerDone >= s.i) this.next();
      else this.renderWaiting();
    },

    // Falas com os nomes no lugar de @A/@B/@tag, filtradas pelo caminho e pelas flags
    prepLines(lines, extraNames = {}) {
      const s = this.story;
      const save = this.career;
      const path = s?.delta.path || save.path;
      const flags = Object.assign({}, save.flags, s?.delta.flags);
      const nm = Object.assign({ A: this.names().a, B: this.names().b }, extraNames);
      const sub = (str) => String(str || '').replace(/@([A-Za-z]+)/g, (m, k) => (nm[k] !== undefined ? nm[k] : m));
      return (lines || [])
        .filter((l) => !l.path || l.path === path)
        .filter((l) => !l.flag || flags[l.flag[0]] === l.flag[1])
        .filter((l) => !l.cinematic || CE.hasSakuga?.(l.cinematic))
        .map((l) => {
          if (l.cinematic) {
            if (save.seen) save.seen[l.cinematic] = true;
            return l;
          }
          const sp = sub(l.speaker);
          return Object.assign({}, l, { speaker: sp, text: sub(l.text) });
        });
    },

    // Nomes das escolhas (@chuto, @toco...) e do placar (@top, @low)
    tagNames(dualId) {
      const s = this.story;
      const out = {};
      const picks = s?.picks?.[dualId] || {};
      Object.keys(picks).forEach((pid) => {
        const name = this.career.players[pid]?.profile?.name || '';
        if (!out[picks[pid]]) out[picks[pid]] = name;
      });
      const reps = s?.reports || {};
      const pa = this.slotPid(this.career, 'a');
      const pb = this.slotPid(this.career, 'b');
      const ga = reps[pa]?.goals || 0;
      const gb = reps[pb]?.goals || 0;
      out.top = ga >= gb ? this.names().a : this.names().b;
      out.low = ga >= gb ? this.names().b : this.names().a;
      // flags da final (eu/passo) guardadas antes da partida
      const fin = s?.picks?.elo15_ultimo || this.career.picks?.elo15_ultimo;
      if (fin) {
        Object.keys(fin).forEach((pid) => {
          const name = this.career.players[pid]?.profile?.name || '';
          if (!out[fin[pid]]) out[fin[pid]] = name;
        });
      }
      return out;
    },

    playLines(step, done, extraNames) {
      const lines = this.prepLines(step.lines, extraNames || this.tagNames());
      if (!lines.length) return done();
      const ch = this.story.ch;
      CE.play({ locationTitle: `CAP. ${ch.number} • ${ch.title.toUpperCase()}`, crestTitle: 'PROJETO ELO', bg: step.bg || ch.match.theme, dark: !!step.dark, lines, onComplete: done });
    },

    // Rostos certos nas falas: os nomes da dupla viram os bonecos dela
    patchSpeakers(on) {
      if (on && !this._origSpeaker) {
        const orig = CE.getSpeakerCharData;
        this._origSpeaker = orig;
        const self = this;
        CE.getSpeakerCharData = function (name) {
          const up = String(name || '').toUpperCase().trim();
          const save = self.career;
          if (save) {
            for (const pid of Object.keys(save.players)) {
              const p = save.players[pid];
              if ((p.profile?.name || '').toUpperCase().trim() === up) {
                return Object.assign({ name: p.profile.name, jerseyPrimary: '#111c44', jerseySecondary: '#fde047', auraColor: '#fde047' }, p.profile, { jerseyPrimary: '#111c44', jerseySecondary: '#fde047' });
              }
            }
          }
          return orig.call(this, name);
        };
      } else if (!on && this._origSpeaker) {
        CE.getSpeakerCharData = this._origSpeaker;
        this._origSpeaker = null;
      }
    },

    // ------------------------------------------------------------ escolhas e prêmios
    overlay(html) {
      let el = document.getElementById('duo-story-ov');
      if (!el) {
        el = document.createElement('div');
        el.id = 'duo-story-ov';
        el.className = 'duo-story-ov';
        document.body.appendChild(el);
      }
      if (!html) {
        el.classList.remove('open');
        el.innerHTML = '';
        return el;
      }
      el.innerHTML = `<div class="duo-story-box">${html}</div>`;
      el.classList.add('open');
      return el;
    },

    showStylePick(done) {
      const s = this.story;
      const me = this.pid();
      const cur = this.career.players[me]?.style;
      const styles = Object.values(window.DUO_STYLES);
      this._styleDone = done;
      this.overlay(`
        <div class="duo-story-cap">🔗 O ELO LIBERA O SEU ESTILO</div>
        <h2>QUAL É O SEU JEITO DE JOGAR?</h2>
        <p class="duo-story-sub">Vira a sua Arma (skills 1, 2 e 3) e os atributos que mais crescem a cada capítulo. Cada um escolhe o seu.</p>
        <div class="duo-styles">
          ${styles
            .map(
              (st) => `
            <button class="duo-style ${cur === st.id ? 'on' : ''}" onclick="DuoCareer.pickStyle('${st.id}')">
              <span class="duo-style-ic">${st.icon}</span>
              <b>${esc(st.name)}</b>
              <small>${esc(st.desc)}</small>
              <i>⚔️ ${esc(st.weapon.name)}</i>
              <em>${st.weapon.skills.map((k) => `${k.key}: ${esc(k.name)}`).join('<br>')}</em>
            </button>`
            )
            .join('')}
        </div>`);
      void s;
    },

    pickStyle(id) {
      const s = this.story;
      if (!s || !window.DUO_STYLES[id] || !this._styleDone) return;
      const me = this.pid();
      s.styles[me] = id;
      Net.send({ t: 'style', pid: me, style: id });
      window.SFX?.click?.();
      this.overlay(null);
      const done = this._styleDone;
      this._styleDone = null;
      done();
    },

    showFlowGift(done) {
      this.story.delta.flowFor = true;
      window.SFX?.jingle?.([392, 523, 659, 784, 1047], 0, 'sawtooth');
      const f = window.DUO_FLOW;
      this.overlay(`
        <div class="duo-story-cap">🔥 FLUXO DESBLOQUEADO</div>
        <h2 style="color:${f.color}">${esc(f.name.toUpperCase())}</h2>
        <p class="duo-story-sub">${esc(f.desc)}<br><b>${esc(f.effect)}:</b> ${esc(f.effectDesc)}.</p>
        <div class="duo-flow-rule">🔗 <b>RESSONÂNCIA:</b> os dois no Fluxo (G) ao mesmo tempo → quem tem a bola aperta <b>C</b> = <b>ATAQUE DE DUPLA</b>.</div>
        <button class="duo-btn primary big" onclick="DuoCareer.closeGift()">ENTENDI ▶</button>`);
      this._giftDone = done;
    },
    closeGift() {
      this.overlay(null);
      const d = this._giftDone;
      this._giftDone = null;
      d?.();
    },

    showDual(dual, done) {
      const s = this.story;
      s.dualDone = done;
      s.dual = dual;
      const mine = s.picks[dual.id]?.[this.pid()];
      this.overlay(`
        <div class="duo-story-cap">⚖️ ESCOLHA DUPLA • cada um escolhe no seu aparelho</div>
        <h2>${esc(dual.prompt)}</h2>
        <p class="duo-story-sub">O que acontece depende das DUAS respostas. Você só vê a do parceiro depois.</p>
        <div class="duo-dual">
          ${dual.options.map((o) => `<button class="duo-dual-opt ${mine === o.tag ? 'on' : ''}" ${mine ? 'disabled' : ''} onclick="DuoCareer.pickDual('${o.tag}')">${esc(o.label)}</button>`).join('')}
        </div>
        <div id="duo-dual-wait" class="duo-dual-wait">${mine ? `Você escolheu. Esperando ${esc(this.partnerName())}...` : ''}</div>`);
    },

    pickDual(tag) {
      const s = this.story;
      if (!s?.dual) return;
      const id = s.dual.id;
      const me = this.pid();
      if (s.picks[id]?.[me]) return;
      s.picks[id] = Object.assign({}, s.picks[id], { [me]: tag });
      Net.send({ t: 'pick', id, pid: me, tag });
      window.SFX?.click?.();
      this.showDual(s.dual, s.dualDone);
      this.checkDual();
    },

    checkDual() {
      const s = this.story;
      if (!s?.dual) return;
      const dual = s.dual;
      const picks = s.picks[dual.id] || {};
      const pids = Object.keys(this.career.players);
      if (!pids.every((p) => picks[p])) return;
      // a chave segue a ordem das opções: 'chuto+toco', nunca 'toco+chuto'
      const order = dual.options.map((o) => o.tag);
      const key = pids
        .map((p) => picks[p])
        .sort((x, y) => order.indexOf(x) - order.indexOf(y))
        .join('+');
      const out = dual.out[key] || {};
      s.delta.sintonia += out.sintonia || 0;
      Object.assign(s.delta.flags, out.flags || {});
      if (out.path) s.delta.path = out.path;
      const done = s.dualDone;
      s.dual = null;
      s.dualDone = null;
      // mostra a escolha do parceiro antes do desfecho
      const pPick = picks[pids.find((p) => p !== this.pid())];
      const label = dual.options.find((o) => o.tag === pPick)?.label || pPick;
      this.overlay(`
        <div class="duo-story-cap">⚖️ AS DUAS RESPOSTAS</div>
        <h2>${esc(this.partnerName().toUpperCase())} ESCOLHEU:</h2>
        <div class="duo-dual-reveal">${esc(label)}</div>
        ${out.sintonia ? `<div class="duo-sint-delta ${out.sintonia > 0 ? 'up' : 'down'}">SINTONIA ${out.sintonia > 0 ? '+' : ''}${out.sintonia}</div>` : ''}`);
      setTimeout(() => {
        this.overlay(null);
        const lines = out.lines || [];
        if (!lines.length) return done?.();
        this.playLines({ lines, bg: null }, () => done?.(), this.tagNames(dual.id));
      }, 2200);
    },

    partnerName() {
      const pid = Object.keys(this.career?.players || {}).find((p) => p !== this.pid());
      return this.career?.players?.[pid]?.profile?.name || 'o parceiro';
    },

    // ------------------------------------------------------------ partida
    matchChapter(ch) {
      const m = ch.match;
      const short = String(m.oppName || 'RIVAL').split('(')[0].trim().toUpperCase().slice(0, 16);
      return {
        id: 'duo_' + ch.id,
        era: ch.era,
        title: `${m.title}: ${ch.title}`,
        mapTheme: m.theme,
        matchDuration: m.duration || 130,
        targetGoals: m.target || 3,
        drawIsWin: false,
        difficulty: m.diff || 1,
        teammateIds: m.mates.slice(),
        opponentIds: m.opp.slice(),
        teamName: 'PROJETO ELO',
        opponentName: m.oppName,
        homeColor: m.homeColor,
        homeSecondary: m.homeSecondary,
        opponentColor: m.oppColor,
        opponentSecondary: m.oppSec,
        scoreLabels: { home: 'ELO', away: short },
        duoStory: true
      };
    },

    // Estados de jogo dos dois com o que muda NESTE capítulo (estilo escolhido, Fluxo novo)
    storyStates() {
      const s = this.story;
      const save = JSON.parse(JSON.stringify(this.career));
      Object.keys(s.styles).forEach((pid) => save.players[pid] && (save.players[pid].style = s.styles[pid]));
      if (s.delta.flowFor) Object.values(save.players).forEach((p) => (p.flow = true));
      const me = this.pid();
      const other = Object.keys(save.players).find((p) => p !== me);
      return { myState: this.playerState(save, me), partnerState: this.playerState(save, other) };
    },

    playMatchStep(done) {
      const s = this.story;
      s.matchDone = done;
      s.inMatch = true;
      this.renderWaiting();
      if (Net.role === 'host') {
        const ch = this.matchChapter(s.ch);
        Net.send({ t: 'start', ch, story: true });
        Duo.beginMatch(ch, this.storyStates());
      }
      // o guest começa quando chega o 'start' (Duo.onMessage → beginMatch com storyStates)
    },

    onMatchEnd(res, myRep, otherRep) {
      const s = this.story;
      if (!s) return;
      s.inMatch = false;
      s.res = res;
      const me = this.pid();
      const other = Object.keys(this.career.players).find((p) => p !== me);
      s.reports[me] = myRep || null;
      s.reports[other] = otherRep || null;
      const won = !!res?.won;
      const go = won || s.ch.advanceOnLoss;
      // desistência / queda: sem cena de pós-jogo
      const post = res?.forfeit ? [] : (won ? s.ch.win : s.ch.loss) || [];
      s.won = won;
      s.advance = go && !res?.forfeit;
      s.steps.splice(s.i + 1, 0, ...post);
      const d = s.matchDone;
      s.matchDone = null;
      d?.();
    },

    // ------------------------------------------------------------ fim do capítulo
    finishChapter() {
      const s = this.story;
      if (!s) return;
      s.finishing = true;
      this.overlay(null);
      if (Net.role === 'host') {
        const save = this.applyChapter(this.career, s);
        this.career = save;
        this.store(save);
        Net.send({ t: 'careerSync', save });
        this.showChapterResult();
      } else {
        // espera o save novo do host (careerSync → showChapterResult)
        this.renderWaiting(`Esperando ${this.partnerName()} salvar o capítulo...`);
        clearTimeout(this._syncTimer);
        this._syncTimer = setTimeout(() => this.story?.finishing && this.showChapterResult(), 6000);
      }
    },

    // As recompensas (no host): atributos de cada um, Sintonia, caminho, próximo capítulo
    applyChapter(save0, s) {
      const save = JSON.parse(JSON.stringify(save0));
      const reward = s.ch.reward || {};
      const gains = {};
      Object.keys(save.players).forEach((pid) => {
        const pl = save.players[pid];
        if (s.styles[pid]) pl.style = s.styles[pid];
        if (s.delta.flowFor) pl.flow = true;
        const g = {};
        const add = (k, v) => {
          if (!v) return;
          pl.stats[k] = (pl.stats[k] || 0) + v;
          g[k] = (g[k] || 0) + v;
        };
        // o que fez em campo (relatório da partida)
        const rep = s.reports[pid];
        Object.entries(rep?.gains || {}).forEach(([k, v]) => add(k, v));
        // o prêmio do capítulo: vai mais para os atributos do estilo (sem estilo, espalha)
        if (s.advance) {
          const grow = pl.style ? window.DUO_STYLES[pl.style].grow : STATS;
          for (let i = 0; i < (reward.stats || 0); i++) add(grow[i % grow.length], 1);
        }
        pl.matches = (pl.matches || 0) + (s.res && !s.res.forfeit ? 1 : 0);
        pl.goals = (pl.goals || 0) + (rep?.goals || 0);
        gains[pid] = g;
      });
      const duoGain = s.res?.duo ? Math.min(12, Math.round((s.res.duo.passes || 0) * 0.5 + (s.res.duo.assists || 0) * 3 + (s.res.duo.combos || 0) * 4)) : 0;
      const sintGain = (s.advance ? reward.sintonia || 0 : 0) + s.delta.sintonia + duoGain;
      save.sintonia = clamp((save.sintonia || 0) + sintGain, 0, 100);
      Object.assign(save.flags, s.delta.flags);
      if (s.delta.path) save.path = s.delta.path;
      Object.keys(s.picks).forEach((id) => (save.picks[id] = s.picks[id]));
      Object.assign(save.seen, this.career.seen || {});
      (s.ch.pre || []).concat(s.won ? s.ch.win || [] : []).forEach((st) => (st.lines || []).forEach((l) => l.cinematic && CE.hasSakuga?.(l.cinematic) && (save.seen[l.cinematic] = true)));
      save.results[s.ch.id] = s.won ? 'win' : 'loss';
      if (s.advance) {
        if (!save.done.includes(s.ch.id)) save.done.push(s.ch.id);
        save.chapter = Math.min(window.DUO_CHAPTERS.length, s.idx + 1);
      }
      save.rev = (save.rev || 0) + 1;
      save.updated = Date.now();
      save.last = { ch: s.ch.id, won: s.won, advance: s.advance, gains, sint: sintGain, duo: s.res?.duo || null, res: s.res ? { sh: s.res.sh, sa: s.res.sa } : null };
      return save;
    },

    showChapterResult() {
      const s = this.story;
      clearTimeout(this._syncTimer);
      if (!s) return;
      this.patchSpeakers(false);
      this.overlay(null);
      this.renderWaiting(null);
      // EgoCoins na SUA carreira solo por capítulo jogado
      if (s.res && !s.res.forfeit) {
        const coins = s.advance ? 200 : 60;
        if (App.state?.currencies) {
          App.state.currencies.egoCoins = (App.state.currencies.egoCoins || 0) + coins;
          App.saveState?.();
        }
        s.coins = coins;
      }
      this.chapterResult = { ch: s.ch, won: s.won, advance: s.advance, coins: s.coins || 0, last: this.career?.last, forfeit: !!s.res?.forfeit };
      this.story = null;
      Duo.view = Net.connected() ? 'room' : 'menu';
      Duo.ensureScreen().classList.add('open');
      Duo.render();
    },

    // Caiu a conexão / alguém saiu no meio do capítulo
    abort(reason) {
      const s = this.story;
      if (!s) return;
      this.story = null;
      clearTimeout(this._syncTimer);
      this.overlay(null);
      this.renderWaiting(null);
      if (CE.active) {
        CE.onComplete = null;
        CE.finish();
      }
      if (CE.sakugaActive) {
        CE.sakugaOnComplete = null;
        CE.finishSakuga();
      }
      this.patchSpeakers(false);
      this.chapterResult = { ch: s.ch, aborted: true, reason };
    },

    // ------------------------------------------------------------ espera
    renderWaiting(text) {
      let el = document.getElementById('duo-wait-badge');
      const s = this.story;
      let msg = text;
      if (msg === undefined) {
        if (!s || s.inMatch) msg = null;
        else if (s.meDone >= s.i && s.partnerDone < s.i) msg = `⏳ Esperando ${this.partnerName()} terminar...`;
        else msg = null;
      }
      if (!msg) {
        if (el) el.classList.remove('show');
        return;
      }
      if (!el) {
        el = document.createElement('div');
        el.id = 'duo-wait-badge';
        el.className = 'duo-wait-badge';
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.classList.add('show');
    },

    // ------------------------------------------------------------ sala (painel)
    panelHtml() {
      const host = Net.role === 'host';
      const save = this.career;
      const res = this.chapterResult;
      const resHtml = res ? this.resultHtml(res) : '';
      if (!Duo.partner) return '';
      if (!save) {
        return `
          <div class="duo-mode career">
            <div class="duo-mode-title">📖 CARREIRA EM DUPLA • PROJETO ELO</div>
            <div class="duo-mode-desc">Uma história só de vocês dois, em 15 capítulos: rivais de rua presos pela mesma pulseira. Escolhas duplas, Sintonia, Fluxo Compartilhado e cenas próprias. Cada um começa com um jogador novo (com a aparência da carreira solo).</div>
            ${host ? '<button class="duo-btn primary big" onclick="DuoCareer.create()">🔗 COMEÇAR O PROJETO ELO</button>' : `<div class="duo-waithost">Esperando <b>${esc(Duo.partner?.profile?.name || 'o dono da sala')}</b> começar o Projeto Elo...</div>`}
          </div>`;
      }
      const total = window.DUO_CHAPTERS.length;
      const idx = save.chapter;
      const ch = window.DUO_CHAPTERS[Math.min(idx, total - 1)];
      const ended = idx >= total;
      const nm = this.names(save);
      const pa = this.playerOf(save, 'a');
      const pb = this.playerOf(save, 'b');
      const sty = (p) => (p?.style ? `${window.DUO_STYLES[p.style].icon} ${window.DUO_STYLES[p.style].name}` : 'sem estilo');
      const ovr = (p) => this.playerState(save, p.pid).ovr;
      const seen = SCENES.filter(([id]) => save.seen?.[id] && CE.hasSakuga?.(id));
      return `
        ${resHtml}
        <div class="duo-mode career on">
          <div class="duo-mode-title">📖 PROJETO ELO <small>${ended ? 'CONCLUÍDO' : `CAP. ${ch.number}/${total}`}</small></div>
          <div class="duo-arc">${esc(window.DUO_ARCS[ch.arc])}</div>
          <div class="duo-ch-title">${ended ? 'FIM: dois egos, um gol.' : esc(ch.title)}</div>
          <div class="duo-mode-desc">${ended ? 'Vocês terminaram o Projeto Elo. Dá para jogar a final de novo.' : esc(ch.summary)}</div>
          <div class="duo-sint"><span>🔗 SINTONIA</span><div class="duo-sint-bar"><i style="width:${save.sintonia}%"></i></div><b>${save.sintonia}</b></div>
          ${save.path ? `<div class="duo-path ${save.path}">${save.path === 'pacto' ? '🤝 CAMINHO DO PACTO' : '⚔️ CAMINHO DA RIVALIDADE'}</div>` : ''}
          <div class="duo-duo-players">
            <div><b>${esc(nm.a)}</b><small>${esc(sty(pa))} • OVR ${pa ? ovr(pa) : '?'}${pa?.flow ? ' • 🔥' : ''}</small></div>
            <div><b>${esc(nm.b)}</b><small>${esc(sty(pb))} • OVR ${pb ? ovr(pb) : '?'}${pb?.flow ? ' • 🔥' : ''}</small></div>
          </div>
          <div class="duo-chapters">${window.DUO_CHAPTERS.map((c, i) => `<i class="${save.done.includes(c.id) ? 'done' : i === idx ? 'cur' : ''}" title="Cap. ${c.number} • ${esc(c.title)}">${c.number}</i>`).join('')}</div>
          ${host
            ? `<button class="duo-btn primary big" onclick="DuoCareer.startChapter()">▶ ${ended ? 'JOGAR A FINAL DE NOVO' : `JOGAR O CAP. ${ch.number}`}</button>`
            : `<div class="duo-waithost">Esperando <b>${esc(Duo.partner?.profile?.name || 'o dono da sala')}</b> começar o capítulo...</div>`}
          ${seen.length ? `<div class="duo-rever"><span>🎬 REVER</span>${seen.map(([id, t]) => `<button onclick="DuoCareer.replay('${id}')">${esc(t)}</button>`).join('')}</div>` : ''}
        </div>`;
    },

    resultHtml(r) {
      if (r.aborted) return `<div class="duo-result lose"><div class="duo-res-title">CAPÍTULO INTERROMPIDO</div><div class="duo-res-score">${esc(r.reason || 'A conexão caiu.')} O capítulo ${r.ch.number} recomeça do início.</div></div>`;
      const last = r.last || {};
      const lines = Object.keys(last.gains || {}).map((pid) => {
        const name = this.career?.players?.[pid]?.profile?.name || '?';
        const g = last.gains[pid];
        const txt = Object.entries(g).map(([k, v]) => `+${v} ${STAT_LABEL[k] || k}`).join(' • ');
        return `<div class="duo-res-line"><b>${esc(name)}</b><span>${txt || 'sem ganhos'}</span></div>`;
      });
      return `
        <div class="duo-result ${r.won ? 'win' : 'lose'}">
          <div class="duo-res-title">${r.forfeit ? 'PARTIDA INTERROMPIDA' : r.advance ? `CAP. ${r.ch.number} CONCLUÍDO!` : 'DERROTA'}</div>
          <div class="duo-res-score">${esc(r.ch.title)}${last.res ? ` • ELO ${last.res.sh} x ${last.res.sa}` : ''}${r.advance ? '' : ' • tentem de novo'}</div>
          ${lines.join('')}
          <div class="duo-res-coins">🔗 Sintonia ${last.sint >= 0 ? '+' : ''}${last.sint || 0}${last.duo ? ` (tabelas ${last.duo.passes || 0} • gols do Elo ${last.duo.assists || 0} • ataques de dupla ${last.duo.combos || 0})` : ''}${r.coins ? ` • +${r.coins} EgoCoins na sua carreira solo` : ''}</div>
        </div>`;
    },

    replay(id) {
      if (!CE.hasSakuga?.(id)) return;
      document.getElementById('duo-screen')?.classList.remove('open');
      CE.playActionSakuga(id, () => {
        Duo.ensureScreen().classList.add('open');
        Duo.render();
      });
    }
  };

  window.DuoCareer = DC;
})();
