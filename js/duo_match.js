// ============================================================================
// MODO DUPLA — A PARTIDA EM DUAS TELAS (extensão do MatchEngine)
// Quem criou a sala (host) roda a partida de verdade. O parceiro é um jogador do
// time da casa marcado com isRemote: ele não tem IA, anda e age com os comandos
// que chegam pela rede. Para o parceiro ter TUDO que você tem (fôlego, drible,
// chute carregado, curva, carrinho, skills da Arma, Fluxo), o "estado de jogador"
// dele fica guardado à parte (duo.ctx) e é trocado no lugar do seu enquanto os
// comandos dele rodam (duoSwap) — as mesmas funções servem para os dois.
// Quem entrou na sala (guest) não simula nada: desenha as posições que chegam
// ~30x por segundo (suavizadas) e manda os comandos.
// ============================================================================
(function () {
  const ME = window.MatchEngine;
  if (!ME) return;

  // Tudo que é "de quem joga" no MatchEngine (o resto — bola, IA, placar — é do jogo)
  const CTX_FIELDS = [
    'playerEntity', 'playerState', 'keys', 'mouse', 'stamina', 'exhausted', 'slideCooldown', 'dribbleCooldown', 'dribbleInvulnTimer',
    'dribbleChain', 'dribbleChainTimer', 'callCooldown', 'callPassRequested', 'skillCooldowns', 'flowState', 'flowFx', 'flowFirstShotUsed',
    'passives', 'copiedSkill', 'revengeTimer', 'oneTwo', 'matchStats', 'rating', '_aimOverride'
  ];
  const ACTION_FNS = ['dribbleMove', 'slideTackle', 'callForPass', 'passBall', 'shootTowardMouse', 'useWeaponSkill', 'activateFlow', 'triggerChemicalReaction'];
  const SFX_FWD = ['kick', 'pass', 'goal', 'save', 'whistle', 'tackle', 'post', 'concede', 'whoosh'];
  const r1 = (v) => Math.round((v || 0) * 10) / 10;
  const emptyStats = () => ({ goals: 0, angleGoals: 0, longGoals: 0, shots: 0, onTarget: 0, skills: 0, steals: 0, dribbles: 0, passes: 0, sprintFrames: 0, conceded: 0 });

  Object.assign(ME, {
    // ---------------------------------------------------------------- comum
    // duo = { role, partner (perfil do outro), onEnd } — chamado antes do startMatch
    duoBegin(opts) {
      this.duo = { role: opts.role, partner: opts.partner, onEnd: opts.onEnd, patches: [], actions: [], input: { k: {}, ax: 0, ay: 0, md: false }, online: true };
    },

    duoPatch(obj, name, make) {
      const orig = obj[name];
      if (typeof orig !== 'function') return;
      obj[name] = make(orig);
      this.duo.patches.push(() => (obj[name] = orig));
    },

    duoEndCleanup() {
      if (!this.duo) return;
      this.duo.patches.reverse().forEach((undo) => undo());
      this.duo = null;
      this._remoteCtx = false;
      this._aimOverride = null;
      this._localOnly = 0;
    },

    // O boneco do parceiro (perfil que chegou pela rede)
    duoMakePartner(slot) {
      const pr = this.duo.partner;
      const prof = pr.profile || {};
      const ent = {
        id: 'duo_partner',
        isPlayer: false,
        isRemote: true,
        isDuo: true,
        team: 'home',
        name: prof.name || 'Parceiro',
        number: prof.number || 10,
        x: slot.x,
        y: slot.y,
        z: 0,
        homeX: slot.x,
        homeY: slot.y,
        vx: 0,
        vy: 0,
        vz: 0,
        slideVx: 0,
        slideVy: 0,
        speed: 2.6,
        facingRight: true,
        animState: 'idle',
        animTimer: 0,
        stunTimer: 0,
        accessories: pr.equippedAccessories || [],
        charData: {
          skinColor: prof.skinColor || '#f3d1b8',
          hairColor: prof.hairColor || '#0f172a',
          hairSecondary: prof.hairSecondary || '#2563eb',
          eyeColor: prof.eyeColor || '#ef4444',
          eyeStyle: prof.eyeStyle,
          hairStyle: prof.hairStyle || 'spiky_tall',
          jerseyPrimary: this.chapter.homeColor || '#0f2942',
          jerseySecondary: this.chapter.homeSecondary || '#38bdf8',
          auraColor: pr.equippedFlow?.color || '#facc15',
          number: prof.number || 10,
          ovr: pr.ovr || 60
        }
      };
      // Velocidade do parceiro pelos atributos dele (as mesmas contas que valem para você)
      const keep = this.playerState;
      this.playerState = pr;
      try {
        ent.speed = this.getPlayerJogSpeed();
      } catch (e) {}
      this.playerState = keep;
      this.duo.partnerEnt = ent;
      return ent;
    },

    // Índice do boneco na lista (é o mesmo nas duas telas)
    duoIdx(ent) {
      return ent ? this.entities.indexOf(ent) : -1;
    },

    // ---------------------------------------------------------------- host
    duoHostSetup() {
      const d = this.duo;
      const ent = d.partnerEnt;
      d.ctx = {
        playerEntity: ent,
        playerState: d.partner,
        keys: {},
        mouse: { x: 0, y: 0, down: false, charge: 0 },
        stamina: 100,
        exhausted: false,
        slideCooldown: 0,
        dribbleCooldown: 0,
        dribbleInvulnTimer: 0,
        dribbleChain: 0,
        dribbleChainTimer: 0,
        callCooldown: 0,
        callPassRequested: false,
        skillCooldowns: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, v: 0 },
        flowState: { active: false, timer: 0, charge: 0, readyShown: false },
        flowFx: null,
        flowFirstShotUsed: false,
        passives: {},
        copiedSkill: null,
        revengeTimer: 0,
        oneTwo: null,
        matchStats: emptyStats(),
        rating: 6,
        _aimOverride: { wx: ent.x + 200, wy: ent.y }
      };
      this.duoWithRemote(() => (this.passives = this.computePassives()));
      d.lastSecond = this.timeLeft;
      d.sendTick = 0;
      this.tutorial = null;

      const self = this;
      // Depois de cada quadro: as posições vão para o parceiro
      this.duoPatch(this, 'update', (orig) =>
        function () {
          orig.apply(this, arguments);
          if (self.duo && ++self.duo.sendTick % 2 === 0) self.duoSendSnapshot();
        }
      );
      // Avisos das SUAS ações ficam só na sua tela (os do parceiro vão só para a dele)
      ACTION_FNS.concat(['tickSkillAndFlow']).forEach((name) =>
        this.duoPatch(this, name, (orig) =>
          function () {
            this._localOnly = (this._localOnly || 0) + 1;
            try {
              return orig.apply(this, arguments);
            } finally {
              this._localOnly--;
            }
          }
        )
      );
      // Efeitos que os dois veem
      this.duoPatch(this, 'addBubble', (orig) =>
        function (ent, text, color, frames) {
          orig.apply(this, arguments);
          self.duoEvent({ k: 'bub', i: self.duoIdx(ent), tx: text, c: color, f: frames });
        }
      );
      this.duoPatch(this, 'spawnParticles', (orig) =>
        function (x, y, z, color, count = 15) {
          orig.apply(this, arguments);
          if (count >= 10) self.duoEvent({ k: 'pt', x: r1(x), y: r1(y), z: r1(z), c: color, n: count });
        }
      );
      this.duoPatch(this, 'showGoalFx', (orig) =>
        function (text, sub, color) {
          orig.apply(this, arguments);
          self.duoEvent({ k: 'gfx', tx: text, sb: sub, c: color });
        }
      );
      this.duoPatch(this, 'impact', (orig) =>
        function (shake, flash = 0) {
          orig.apply(this, arguments);
          self.duoEvent({ k: 'imp', s: shake, f: flash });
        }
      );
      this.duoPatch(this, 'startSpecialMoment', (orig) =>
        function (color, opts) {
          orig.apply(this, arguments);
          self.duoEvent({ k: 'sm', c: color, o: opts || {}, i: self.duoIdx(this.playerEntity) });
        }
      );
      if (window.SFX) {
        SFX_FWD.forEach((name) =>
          this.duoPatch(window.SFX, name, (orig) =>
            function () {
              const r = orig.apply(this, arguments);
              if (!self._localOnly || self._remoteCtx) self.duoEvent({ k: 'sfx', n: name, a: Array.from(arguments).slice(0, 3) });
              return r;
            }
          )
        );
      }
      // O jogo acaba no host: o resultado vai para os dois
      this.duoPatch(this, 'finishMatch', () =>
        function () {
          self.duoFinish();
        }
      );
      // Sintonia: tabelas entre os dois humanos
      d.stats = { passes: 0, assists: 0, combos: 0 };
      this.duoPatch(this, 'kickPass', (orig) =>
        function (from, to) {
          const r = orig.apply(this, arguments);
          if (self.duoHuman(from) && self.duoHuman(to) && from !== to) {
            d.stats.passes++;
            d.lastHumanPass = { to, frame: this.frame };
          }
          return r;
        }
      );
      // Cenas que tocam no meio do jogo (a do Hugo, o monstro, o flashback da França, o Ataque
      // de Dupla...) tocam também na tela do parceiro. As que dependem da jogada do host
      // (chute roteirizado, química, despertar do Fluxo) ficam só nele
      const CEo = window.CutsceneEngine;
      const NOFWD = ['scripted_shot', 'chem_reaction', 'flow_awaken', 'first_selection_awakening', 'nel_metavision_goal'];
      if (CEo) {
        this.duoPatch(CEo, 'playActionSakuga', (orig) =>
          function (type) {
            if (self.duo && self.active && !self._remoteCtx && !NOFWD.includes(type)) self.duoEvent({ k: 'cine', id: type });
            return orig.apply(this, arguments);
          }
        );
        this.duoPatch(CEo, 'play', (orig) =>
          function (cfg) {
            if (self.duo && self.active && cfg?.lines?.length) {
              const lines = cfg.lines.filter((l) => !l.choices).map((l) => {
                const o = Object.assign({}, l);
                delete o.choices;
                return o;
              });
              self.duoEvent({ k: 'vn', lines, loc: cfg.locationTitle, bg: cfg.bg });
            }
            return orig.apply(this, arguments);
          }
        );
      }
      // [C]: com os dois no Fluxo vira o ATAQUE DE DUPLA (a Reação Química dos
      // companheiros do computador fica de fora no Modo Dupla)
      this.duoPatch(this, 'triggerChemicalReaction', () =>
        function () {
          self.duoTryCombo(this.playerEntity);
        }
      );
    },

    duoHuman(ent) {
      return !!ent && (ent.isPlayer || !!ent.isDuo);
    },

    // Gol de um dos dois logo depois de uma tabela entre eles = GOL DO ELO
    duoOnGoal(scorer) {
      const d = this.duo;
      if (d?.role !== 'host' || !this.duoHuman(scorer)) return;
      const lp = d.lastHumanPass;
      if (lp && lp.to === scorer && this.frame - lp.frame < 300) {
        d.stats.assists++;
        d.lastHumanPass = null;
        this.showBanner('🔗 GOL DO ELO!', 'Tabela entre os dois e gol: a Sintonia da dupla sobe.', '#fde047', 90);
      }
    },

    // RESSONÂNCIA: os dois no Fluxo ao mesmo tempo (checado todo quadro no host)
    duoCheckResonance() {
      const d = this.duo;
      if (!d?.ctx) return;
      const both = this.flowState.active && d.ctx.flowState.active && d.online;
      if (both && !d.reso) {
        d.reso = true;
        const p = this.playerEntity;
        const m = d.partnerEnt;
        p.buffTimer = Math.max(p.buffTimer || 0, 240);
        p.buffColor = '#fde047';
        d.ctx.playerEntity.buffTimer = Math.max(d.ctx.playerEntity.buffTimer || 0, 240);
        window.SFX?.jingle?.([523, 659, 784, 1047, 1319], 0, 'square');
        this.spawnParticles(p.x, p.y, 20, '#fde047', 30);
        this.spawnParticles(m.x, m.y, 20, '#fde047', 30);
        this.showBanner('🔗 RESSONÂNCIA!', 'Os dois no Fluxo: quem estiver com a bola aperta [C] — ATAQUE DE DUPLA!', '#fde047', 150);
      } else if (!both && d.reso) {
        d.reso = false;
      }
    },

    // ATAQUE DE DUPLA: a cena da Ressonância nas duas telas e a bola na rede
    duoTryCombo(caller) {
      const d = this.duo;
      if (!d || d.role !== 'host' || this.duoComboBusy) return;
      const owner = this.ball.owner;
      if (!d.reso) {
        this.showBanner('🔗 PRECISA DOS DOIS NO FLUXO', 'O Ataque de Dupla só sai na Ressonância: os dois apertam [G] juntos.', '#a78bfa', 70);
        return;
      }
      if (!this.duoHuman(owner)) {
        this.showBanner('🔗 PEGUE A BOLA PRIMEIRO', 'Um dos dois precisa estar com a bola para o Ataque de Dupla.', '#a78bfa', 60);
        return;
      }
      this.duoComboBusy = true;
      d.stats.combos++;
      const shooter = owner;
      const finish = () => {
        this.duoComboBusy = false;
        // a bola entra no ângulo, longe do goleiro
        const side = shooter.y >= 0 ? 1 : -1;
        this.ball.owner = null;
        this.ball.x = this.PITCH_HALF_X - 42;
        this.ball.y = side * this.GOAL_HALF_WIDTH * 0.72;
        this.ball.z = this.GOAL_HEIGHT * 0.62;
        this.ball.vx = 26;
        this.ball.vy = 0;
        this.ball.vz = 0;
        this.ball.curve = 0;
        this.ball.spin = 0;
        this.markKick(shooter);
        this.ball.color = '#fde047';
        // os dois saem do Fluxo (a Ressonância queimou tudo)
        this.flowState.active = false;
        this.flowState.timer = 0;
        if (d.ctx) {
          d.ctx.flowState.active = false;
          d.ctx.flowState.timer = 0;
        }
        d.reso = false;
        this.lastTimerTick = performance.now();
      };
      const CE = window.CutsceneEngine;
      if (CE?.hasSakuga?.('duo_ressonancia')) {
        // (a cena vai para a tela do parceiro pelo gancho do playActionSakuga)
        CE.playActionSakuga('duo_ressonancia', finish);
      } else {
        this.showBanner('🔗 ATAQUE DE DUPLA!', '', '#fde047', 80);
        finish();
      }
    },

    // Troca o "estado de jogador" (o seu ↔ o do parceiro). Chamar 2x desfaz.
    duoSwap(ctx) {
      CTX_FIELDS.forEach((f) => {
        const tmp = this[f];
        this[f] = ctx[f];
        ctx[f] = tmp;
      });
    },

    // Roda fn como se o parceiro fosse "você": ações dele, avisos para a tela dele, e
    // sem conquistas/cenas no seu save
    duoWithRemote(fn) {
      const d = this.duo;
      if (!d?.ctx) return;
      const App = window.App;
      const CE = window.CutsceneEngine;
      const keepAch = App?.unlockAchievement;
      const keepFlowCine = CE?.playFlowCutscene;
      if (App) App.unlockAchievement = () => {};
      if (CE) CE.playFlowCutscene = (o, done) => done && done();
      this.duoSwap(d.ctx);
      this._remoteCtx = true;
      try {
        fn();
      } catch (e) {
        console.error(e);
      } finally {
        this._remoteCtx = false;
        this.duoSwap(d.ctx);
        if (App) App.unlockAchievement = keepAch;
        if (CE) CE.playFlowCutscene = keepFlowCine;
      }
    },

    // Um quadro do parceiro (chamado no update, depois do seu movimento)
    duoHostStep() {
      const d = this.duo;
      const ent = d?.partnerEnt;
      if (!ent || !d.ctx) return;
      if (!d.online) {
        ent.duoFlow = null;
        return;
      }
      const inp = d.input;
      const secondTick = this.timeLeft !== d.lastSecond;
      d.lastSecond = this.timeLeft;
      const now = performance.now();
      // comando muito velho (chegou enquanto uma cena passava) não vale mais
      const acts = d.actions.splice(0).filter((a) => now - a.at < 700);
      this.duoWithRemote(() => {
        this.keys = Object.assign({}, inp.k || {});
        this._aimOverride = { wx: inp.ax, wy: inp.ay };
        this.mouse.down = !!inp.md;
        this.tickPlayerTimers();
        this.tickSkillAndFlow();
        // a barra de Fluxo do parceiro enche igual à sua (pelo Ego dele)
        if (secondTick && !this.camera.cutsceneMode) {
          const fx = this.getStatEffects();
          this.flowState.charge = Math.min(100, this.flowState.charge + fx.flowRate * (this.difficultyMode().flowMult ?? 1));
          if (this.flowState.charge >= 100 && !this.flowState.active && !this.flowState.readyShown && this.playerState?.equippedFlow) {
            this.flowState.readyShown = true;
            this.showBanner('🔥 SEU FLUXO ESTÁ PRONTO!', 'Aperte [G] para despertar.', this.playerState.equippedFlow.color || '#00f5d4', 110);
          }
        }
        acts.forEach((a) => this.duoApplyAction(a));
        this.moveControlledPlayer();
        ent.duoFlow = this.flowState.active ? this.flowFx?.color || '#facc15' : null;
      });
      this.duoCheckResonance();
    },

    duoApplyAction(a) {
      if (a.ax !== undefined) this._aimOverride = { wx: a.ax, wy: a.ay };
      switch (a.a) {
        case 'shoot':
          this.keys.q = a.cv < 0;
          this.keys.e = a.cv > 0;
          this.shootTowardMouse(Math.max(0, Math.min(100, a.ch || 0)));
          break;
        case 'pass':
          this.passBall();
          break;
        case 'dribble':
          this.dribbleMove();
          break;
        case 'tackle':
          this.slideTackle();
          break;
        case 'call':
          this.callForPass();
          break;
        case 'skill':
          this.useWeaponSkill(String(a.key));
          break;
        case 'flow':
          this.activateFlow();
          break;
        case 'chem':
          this.duoTryCombo(this.playerEntity);
          break;
        case 'skipReplay':
          break;
      }
    },

    // O parceiro está protegido do bote (acabou de driblar / está no carrinho)?
    duoProtected(victim) {
      const d = this.duo;
      if (!d?.ctx || victim !== d.partnerEnt) return false;
      return d.ctx.dribbleInvulnTimer > 0 || victim.animState === 'rabona' || victim.animState === 'slide';
    },

    duoOnRemoteGoal(scorer, angle) {
      const c = this.duo?.ctx;
      if (!c) return;
      c.matchStats.goals++;
      if (angle) c.matchStats.angleGoals++;
      c.flowState.charge = Math.min(100, c.flowState.charge + 12);
      c.rating = Math.max(3, Math.min(10, c.rating + 1 + (angle ? 0.3 : 0)));
      this.duoEvent({ k: 'rate', d: 1 + (angle ? 0.3 : 0), l: angle ? 'GOL NO ÂNGULO' : 'GOL', r: c.rating });
    },

    duoSendRate(delta, label, rating) {
      this.duoEvent({ k: 'rate', d: delta, l: label, r: rating });
    },

    // Para onde vai cada aviso: true = aparece na sua tela também
    duoRouteBanner(title, sub, color, dur) {
      if (this.duo?.role !== 'host') return true;
      const ev = { k: 'ban', tt: title, sb: sub, c: color, du: dur };
      if (this._remoteCtx) {
        this.duoEvent(ev);
        return false;
      }
      if (this._localOnly || /^🔥 SEU FLUXO/.test(title)) return true;
      this.duoEvent(ev);
      return true;
    },

    duoEvent(ev) {
      if (this.duo?.role === 'host') window.DuoNet?.send({ t: 'ev', e: ev });
    },

    duoSendSnapshot() {
      const d = this.duo;
      if (!d || !window.DuoNet?.connected()) return;
      const c = d.ctx;
      const clock = this.animClock || 0;
      const host = this.playerEntity;
      const e = this.entities.map((en) => {
        const aura = en === host ? (this.flowState.active ? this.flowFx?.color || '#00f5d4' : 0) : en.isDuo ? en.duoFlow || 0 : en.rivalFlowTimer > 0 ? en.rivalFlowColor : 0;
        return [r1(en.x), r1(en.y), r1(en.z), en.animState || 'idle', en.facingRight ? 1 : 0, (en.stunTimer > 0 ? 1 : 0) | (en.celebrateUntil > clock ? 2 : 0), aura, r1(en.vz)];
      });
      const b = this.ball;
      const msg = {
        t: 's',
        tl: this.timeLeft,
        sc: [this.scoreHome, this.scoreAway],
        ch: Math.round(this.chemCharge),
        b: [r1(b.x), r1(b.y), r1(b.z), this.duoIdx(b.owner), b.color],
        e,
        g: c
          ? [Math.round(c.stamina), c.exhausted ? 1 : 0, c.dribbleCooldown, c.slideCooldown, Math.round(c.flowState.charge), c.flowState.active ? 1 : 0, c.skillCooldowns, c.dribbleInvulnTimer, Math.round(c.rating * 10) / 10]
          : null,
        rp: this.replay ? [r1(this.camera.x), r1(this.camera.y), this.replay.label || ''] : 0,
        pz: this.paused || window.CutsceneEngine?.active || window.CutsceneEngine?.sakugaActive ? 1 : 0
      };
      window.DuoNet.send(msg);
    },

    // Fim do jogo (no host): resultado para os dois
    duoFinish() {
      const d = this.duo;
      if (!d) return;
      window.SFX?.whistle?.(3);
      const forfeit = !!this.forfeited;
      this.forfeited = false;
      const report = this.getMatchReport ? this.getMatchReport() : null;
      const c = d.ctx;
      let partnerReport = null;
      if (c) this.duoWithRemote(() => (partnerReport = this.getMatchReport ? this.getMatchReport() : null));
      const res = { won: this.scoreHome > this.scoreAway, draw: this.scoreHome === this.scoreAway, sh: this.scoreHome, sa: this.scoreAway, forfeit, by: forfeit ? 'host' : null, duo: d.stats ? Object.assign({}, d.stats) : null };
      window.DuoNet?.send({ t: 'end', res, rep: partnerReport, hrep: report });
      const onEnd = d.onEnd;
      this.closeFullscreenOverlay();
      this.duoEndCleanup();
      onEnd?.(res, report, partnerReport);
    },

    // O parceiro saiu no meio: o boneco dele passa para a IA
    duoPartnerLost() {
      const d = this.duo;
      if (!d || d.role !== 'host' || !d.online) return;
      d.online = false;
      if (d.partnerEnt) {
        d.partnerEnt.isRemote = false;
        d.partnerEnt.duoFlow = null;
      }
      this.showBanner('📡 O SEU PARCEIRO CAIU', 'O computador assume o jogador dele até o fim da partida.', '#f59e0b', 140);
    },

    // ---------------------------------------------------------------- guest
    duoGuestSetup() {
      const self = this;
      const d = this.duo;
      d.snap = null;
      d.inputTick = 0;
      d.lastSent = '';
      this.tutorial = null;
      // O seu Fluxo (para a aura e o emblema quando o host disser que ele ligou)
      const st = this.playerState;
      d.myFlow = window.combineFlows ? window.combineFlows([st.equippedFlow, st.nelUnlocked ? st.equippedFlow2 : null]) : st.equippedFlow;
      // Nada é simulado aqui: o quadro só aplica o que chega e manda os comandos
      this.duoPatch(this, 'update', () =>
        function () {
          self.duoGuestUpdate();
        }
      );
      const act = (a, extra) => self.duoSendAction(Object.assign({ a }, extra || {}));
      this.duoPatch(this, 'dribbleMove', () => () => act('dribble'));
      this.duoPatch(this, 'slideTackle', () => () => act('tackle'));
      this.duoPatch(this, 'callForPass', () => () => act('call'));
      this.duoPatch(this, 'passBall', () => () => act('pass'));
      this.duoPatch(this, 'useWeaponSkill', () => (key) => act('skill', { key }));
      this.duoPatch(this, 'activateFlow', () => () => act('flow'));
      this.duoPatch(this, 'triggerChemicalReaction', () => () => act('chem'));
      this.duoPatch(this, 'shootTowardMouse', () => (charge) => act('shoot', { ch: Math.round(charge || 0), cv: self.keys.q ? -1 : self.keys.e ? 1 : 0 }));
      this.duoPatch(this, 'endReplay', () => () => act('skipReplay'));
      // Desistir: sai da partida (o host continua com o computador no seu lugar)
      this.duoPatch(this, 'forfeitMatch', () =>
        function () {
          document.getElementById('pause-overlay')?.classList.remove('open');
          window.DuoNet?.send({ t: 'quitMatch' });
          const onEnd = self.duo?.onEnd;
          self.closeFullscreenOverlay();
          self.duoEndCleanup();
          onEnd?.({ won: false, draw: false, sh: 0, sa: 3, forfeit: true, by: 'me' }, null);
        }
      );
      this.duoPatch(this, 'finishMatch', () => function () {});
    },

    duoAimWorld() {
      const keep = this._aimOverride;
      this._aimOverride = null;
      const w = this.screenToWorld(this.mouse.x, this.mouse.y);
      this._aimOverride = keep;
      // Com WASD apertado o drible/carrinho vai na direção das teclas (igual ao seu)
      return { ax: r1(w.wx), ay: r1(w.wy) };
    },

    duoSendAction(a) {
      const aim = this.duoAimWorld();
      window.DuoNet?.send(Object.assign({ t: 'act' }, a, aim));
      if (a.a === 'shoot') {
        this.mouse.charge = 0;
        this.mouse.down = false;
      }
    },

    duoGuestUpdate() {
      if (!this.active) return;
      const d = this.duo;
      if (!d) return;
      this.animClock = (this.animClock || 0) + 1;
      this.frame++;
      if (this.bubbles?.length) this.bubbles = this.bubbles.filter((b) => --b.timer > 0);
      if (this.mouse.down) this.mouse.charge = Math.min(100, this.mouse.charge + 2.6);
      this.duoApplySnapshot();
      // Câmera: no replay a do host; no jogo, a sua (igual à de quem joga sozinho)
      const s = d.snap;
      const p = this.playerEntity;
      if (s && s.rp) {
        this.camera.x += (s.rp[0] - this.camera.x) * 0.3;
        this.camera.y += (s.rp[1] - this.camera.y) * 0.3;
      } else {
        const focusX = this.ball.owner === p ? p.x + 95 : p.x * 0.55 + this.ball.x * 0.45;
        const focusY = p.y * 0.6 + this.ball.y * 0.4;
        const maxCamX = this.PITCH_HALF_X - 480;
        this.camera.x += (Math.max(-maxCamX, Math.min(maxCamX, focusX)) - this.camera.x) * 0.14;
        this.camera.y += (focusY - this.camera.y) * 0.12;
      }
      if (!this.ball.owner && this.frame % 2 === 0) this.trailPoints.push({ x: this.ball.x, y: this.ball.y, z: this.ball.z, color: this.ball.color, life: 14 });
      this.updateEffects();
      // Host pausou / está numa cena / a tela dele parou de mandar (app minimizado, internet)
      const stale = d.lastSnapAt && performance.now() - d.lastSnapAt > 1500;
      this.duoSetPausedNote(stale || !!s?.pz, stale ? '📡 ESPERANDO O SEU PARCEIRO (A CONEXÃO OSCILOU)...' : '⏸ O SEU PARCEIRO PAUSOU (OU ESTÁ NUMA CENA)...');
      // Comandos contínuos (teclas e mira): ~30x por segundo, ou na hora quando mudam
      const k = this.keys;
      const keys = { w: !!(k.w || k.arrowup), a: !!(k.a || k.arrowleft), s: !!(k.s || k.arrowdown), d: !!(k.d || k.arrowright), shift: !!k.shift, q: !!k.q, e: !!k.e };
      const sig = JSON.stringify(keys) + (this.mouse.down ? 1 : 0);
      if (++d.inputTick % 2 === 0 || sig !== d.lastSent) {
        d.lastSent = sig;
        window.DuoNet?.send(Object.assign({ t: 'in', k: keys, md: this.mouse.down ? 1 : 0 }, this.duoAimWorld()));
      }
    },

    // Posições que chegaram do host: cada boneco desliza até onde ele está
    duoApplySnapshot() {
      const s = this.duo.snap;
      if (!s) return;
      const clock = this.animClock || 0;
      s.e.forEach((row, i) => {
        const en = this.entities[i];
        if (!row || !en) return;
        const [x, y, z, anim, right, flags, aura, vz] = row;
        const far = Math.hypot(x - en.x, y - en.y) > 220;
        const k = far ? 1 : 0.45;
        en.x += (x - en.x) * k;
        en.y += (y - en.y) * k;
        en.z = z;
        en.vz = vz || 0;
        en.animState = anim;
        en.facingRight = !!right;
        en.stunTimer = flags & 1 ? 10 : 0;
        en.celebrateUntil = flags & 2 ? clock + 3 : 0;
        if (en.isPlayer) en.duoFlow = null;
        else if (en.isDuo) en.duoFlow = aura || null;
        else {
          en.rivalFlowTimer = aura ? 5 : 0;
          if (aura) en.rivalFlowColor = aura;
        }
      });
      const [bx, by, bz, owner, color] = s.b;
      const ownerEnt = owner >= 0 ? this.entities[owner] : null;
      this.ball.owner = ownerEnt;
      this.ball.color = color || '#ffffff';
      if (ownerEnt) {
        this.ball.x = ownerEnt.x + (ownerEnt.facingRight ? 14 : -14);
        this.ball.y = ownerEnt.y + 4;
        this.ball.z = ownerEnt.z || 0;
      } else {
        const far = Math.hypot(bx - this.ball.x, by - this.ball.y) > 160;
        const k = far ? 1 : 0.6;
        this.ball.x += (bx - this.ball.x) * k;
        this.ball.y += (by - this.ball.y) * k;
        this.ball.z += (bz - this.ball.z) * k;
      }
      this.replay = s.rp ? { label: s.rp[2], frames: [], pos: 0 } : null;
    },

    // Mensagem do host chegando no guest
    duoGuestMessage(msg) {
      const d = this.duo;
      if (!d) return;
      if (msg.t === 's') {
        d.snap = msg;
        const changed = this.timeLeft !== msg.tl || this.scoreHome !== msg.sc[0] || this.scoreAway !== msg.sc[1];
        this.timeLeft = msg.tl;
        this.scoreHome = msg.sc[0];
        this.scoreAway = msg.sc[1];
        this.chemCharge = msg.ch;
        if (msg.g) {
          const [sta, ex, dcd, scd, fch, fon, skc, inv] = msg.g;
          this.stamina = sta;
          this.exhausted = !!ex;
          this.dribbleCooldown = dcd;
          this.slideCooldown = scd;
          this.dribbleInvulnTimer = inv || 0;
          const wasOn = this.flowState.active;
          this.flowState.charge = fch;
          this.flowState.active = !!fon;
          if (fon && !wasOn) this.flowFx = d.myFlow;
          if (skc) Object.assign(this.skillCooldowns, skc);
          const bar = document.getElementById('match-stamina-bar');
          if (bar && this.frame % 5 === 0) {
            bar.style.width = `${Math.floor(sta)}%`;
            bar.style.background = ex ? '#ef4444' : sta < 35 ? '#f59e0b' : '#22c55e';
          }
        }
        if (changed || this.frame % 30 === 0) this.updateHUD();
        d.lastSnapAt = performance.now();
        return;
      }
      if (msg.t === 'ev') {
        this.duoGuestEvent(msg.e);
        return;
      }
      if (msg.t === 'end') {
        const onEnd = d.onEnd;
        window.SFX?.whistle?.(3);
        this.duoSetPausedNote(false);
        this.closeFullscreenOverlay();
        this.duoEndCleanup();
        onEnd?.(msg.res, msg.rep, msg.hrep);
      }
    },

    duoGuestEvent(ev) {
      if (!ev) return;
      const ent = ev.i >= 0 ? this.entities[ev.i] : null;
      switch (ev.k) {
        case 'ban':
          this.showBanner(ev.tt, ev.sb, ev.c, ev.du);
          break;
        case 'bub':
          if (ent) {
            this.bubbles = (this.bubbles || []).filter((b) => b.ent !== ent);
            this.bubbles.push({ ent, text: ev.tx, color: ev.c || '#ffffff', timer: ev.f || 60, max: ev.f || 60 });
          }
          break;
        case 'pt':
          this.spawnParticles(ev.x, ev.y, ev.z, ev.c, ev.n);
          break;
        case 'gfx':
          this.showGoalFx(ev.tx, ev.sb, ev.c);
          break;
        case 'imp':
          this.shakeMag = Math.max(this.shakeMag || 0, ev.s || 0);
          this.flashAlpha = Math.max(this.flashAlpha || 0, ev.f || 0);
          break;
        case 'sm':
          if (this.startSpecialMoment) {
            // o momento especial é desenhado em quem fez (você ou o host)
            const keep = this.playerEntity;
            if (ent) this.playerEntity = ent;
            try {
              this.startSpecialMoment(ev.c, ev.o);
            } finally {
              this.playerEntity = keep;
            }
          }
          break;
        case 'cine':
          if (window.CutsceneEngine?.hasSakuga?.(ev.id) && !window.CutsceneEngine.sakugaActive) window.CutsceneEngine.playActionSakuga(ev.id, () => {});
          break;
        case 'vn':
          if (window.CutsceneEngine && !window.CutsceneEngine.active) window.CutsceneEngine.play({ locationTitle: ev.loc || 'EM CAMPO', crestTitle: 'LORE EVENT', bg: ev.bg, lines: ev.lines || [], onComplete: () => {} });
          break;
        case 'sfx':
          try {
            window.SFX?.[ev.n]?.(...(ev.a || []));
          } catch (e) {}
          break;
        case 'rate': {
          this.rating = ev.r;
          const p = this.playerEntity;
          this.popTexts = this.popTexts || [];
          this.popTexts.push({ text: `${ev.d > 0 ? '+' : ''}${Number(ev.d).toFixed(Math.abs(ev.d) < 0.1 ? 2 : 1)} ${ev.l}`, color: ev.d > 0 ? '#4ade80' : '#f87171', x: p.x, y: p.y, z: (p.z || 0) + 70 + (this.popTexts.length % 3) * 16, life: 70 });
          const el = document.getElementById('match-rating-display');
          if (el) {
            el.textContent = Number(ev.r).toFixed(1);
            el.style.color = this.ratingColor(ev.r);
          }
          break;
        }
      }
    },

    // Faixa "o host pausou / está numa cena" por cima do campo
    duoSetPausedNote(on, text) {
      let el = document.getElementById('duo-wait-note');
      if (!on) {
        if (el?.classList.contains('show')) el.classList.remove('show');
        return;
      }
      if (!el) {
        el = document.createElement('div');
        el.id = 'duo-wait-note';
        el.className = 'duo-wait-note';
        document.getElementById('fullscreen-match-overlay')?.appendChild(el);
      }
      if (text && el.textContent !== text) el.textContent = text;
      if (!el.classList.contains('show')) el.classList.add('show');
    },

    // Mensagem do guest chegando no host
    duoHostMessage(msg) {
      const d = this.duo;
      if (!d) return;
      if (msg.t === 'in') {
        d.input = { k: msg.k || {}, ax: Number(msg.ax) || 0, ay: Number(msg.ay) || 0, md: !!msg.md };
        return;
      }
      if (msg.t === 'act') {
        if (msg.a === 'skipReplay') {
          if (this.replay) this.endReplay();
          return;
        }
        d.actions.push(Object.assign({}, msg, { at: performance.now() }));
        if (d.actions.length > 12) d.actions.shift();
        return;
      }
      if (msg.t === 'quitMatch') this.duoPartnerLost();
    }
  });
})();
