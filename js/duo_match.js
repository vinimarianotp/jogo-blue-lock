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

    // Um tique do relógio de reserva (só faz algo se o requestAnimationFrame parou)
    duoBgTick() {
      const d = this.duo;
      if (!d || d.role !== 'host' || !this.active) return;
      const now = performance.now();
      const App = window.App;
      if (now - (App?._rafAt || 0) < 150) {
        d.bgAt = now;
        return;
      }
      const steps = Math.min(8, Math.floor((now - (d.bgAt || now)) / (1000 / 60)));
      if (steps <= 0) return;
      d.bgAt += steps * (1000 / 60);
      for (let i = 0; i < steps && this.duo; i++) this.update();
      if (App) App._bgRan = true;
    },

    duoEndCleanup() {
      if (!this.duo) return;
      try {
        this.duo.bgWorker?.terminate();
      } catch (e) {}
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
      // Relógio de reserva: com a janela escondida/minimizada o navegador para o
      // requestAnimationFrame e a partida congelava para os dois. Um Worker (que o navegador
      // não para) segue chamando o quadro da partida enquanto a janela não desenha
      try {
        const src = 'setInterval(function(){postMessage(0)},16)';
        d.bgWorker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
        d.bgAt = performance.now();
        d.bgWorker.onmessage = () => self.duoBgTick();
      } catch (e) {
        d.bgWorker = null;
      }
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
            if (self.duo && self.active && !NOFWD.includes(type)) self.duoEvent({ k: 'cine', id: type });
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
      // (antes saía do próprio campo e era gol certo de qualquer lugar)
      if (owner.x < 0) {
        this.showBanner('🔗 CHEGUE NO CAMPO DE ATAQUE', 'O Ataque de Dupla só sai do meio-campo para a frente.', '#a78bfa', 60);
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
        return [r1(en.x), r1(en.y), r1(en.z), en.animState || 'idle', en.facingRight ? 1 : 0, (en.stunTimer > 0 ? 1 : 0) | (en.celebrateUntil > clock ? 2 : 0) | (en.buffTimer > 0 ? 4 : 0) | (en.dashTimer > 0 || en.recoverTimer > 0 ? 8 : 0), aura, r1(en.vz)];
      });
      const b = this.ball;
      const msg = {
        t: 's',
        // relógio do host (o parceiro desenha ~0,1 s atrás, deslizando entre as posições) e o
        // último comando dele que já foi aplicado (para ele corrigir a previsão do próprio boneco)
        tm: Math.round(performance.now()),
        aq: d.ackSeq || 0,
        gp: this.goalPause > 0 ? 1 : 0,
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
      d.buf = [];
      d.offset = null;
      d.seq = 0;
      d.hist = [];
      d.corr = { x: 0, y: 0 };
      d.predicting = false;
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
      // o seu boneco anda na hora (previsão); os outros deslizam entre as posições recebidas
      this.duoPredictSelf();
      this.duoApplySnapshot();
      // a "folga" da rede sobe devagar (se a conexão piorar, a interpolação se ajusta sozinha)
      if (d.offset != null) d.offset += 0.05;
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
    },

    // O SEU boneco (no aparelho de quem entrou na sala): anda na hora em que você aperta, com
    // as mesmas contas de velocidade do host, e manda o comando numerado. Quando a posição
    // oficial chega (duoReconcile), a diferença é corrigida aos pouquinhos. Em drible,
    // carrinho, queda, gol, replay ou cena, ele segue a posição do host
    duoPredictSelf() {
      const d = this.duo;
      const p = this.playerEntity;
      const latest = d.buf[d.buf.length - 1];
      const k = this.keys;
      const keys = { w: !!(k.w || k.arrowup), a: !!(k.a || k.arrowleft), s: !!(k.s || k.arrowdown), d: !!(k.d || k.arrowright), shift: !!k.shift, q: !!k.q, e: !!k.e };
      d.seq++;
      window.DuoNet?.send(Object.assign({ t: 'in', k: keys, md: this.mouse.down ? 1 : 0, q: d.seq }, this.duoAimWorld()));
      if (!latest || !p) return;
      const row = latest.e[this.entities.indexOf(p)];
      const SPECIAL = ['rabona', 'slide', 'dive', 'hurt', 'fall', 'celebrate'];
      const special = !row || latest.rp || latest.pz || latest.gp || SPECIAL.includes(row[3]) || row[5] & 1 || row[5] & 8;
      if (special) {
        d.predicting = false;
        d.hist = [];
        d.corr = { x: 0, y: 0 };
        // segue a posição mais nova do host (sem o atraso da interpolação)
        const far = Math.hypot(row ? row[0] - p.x : 0, row ? row[1] - p.y : 0) > 220;
        if (row) {
          p.x += (row[0] - p.x) * (far ? 1 : 0.5);
          p.y += (row[1] - p.y) * (far ? 1 : 0.5);
          p.animState = row[3];
          p.facingRight = !!row[4];
        }
        return;
      }
      if (!d.predicting) {
        d.predicting = true;
        d.hist = [];
      }
      let mx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
      let my = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
      const moving = mx !== 0 || my !== 0;
      const sprint = moving && keys.shift && !this.exhausted && this.stamina > 0;
      const spd = (p.speed || 2.6) * (sprint ? 1.6 : this.exhausted ? 0.82 : 1) * (row[5] & 4 ? 1.3 : 1);
      if (moving) {
        const len = Math.hypot(mx, my);
        p.x = Math.max(-this.PITCH_HALF_X + 15, Math.min(this.PITCH_HALF_X - 15, p.x + (mx / len) * spd));
        p.y = Math.max(-this.PITCH_HALF_Y + 12, Math.min(this.PITCH_HALF_Y - 12, p.y + (my / len) * spd));
        if (mx !== 0) p.facingRight = mx > 0;
      }
      // a animação: correndo/parado é sua; chute, pedido de bola etc. vêm do host
      p.animState = row[3] === 'idle' || row[3] === 'run' ? (moving ? 'run' : 'idle') : row[3];
      // correção suave da diferença para a posição oficial
      p.x += d.corr.x * 0.15;
      p.y += d.corr.y * 0.15;
      d.corr.x *= 0.85;
      d.corr.y *= 0.85;
      d.hist.push({ q: d.seq, x: p.x, y: p.y });
      if (d.hist.length > 180) d.hist.shift();
    },

    // Chegou a posição oficial: compara com o que você previu para o mesmo comando
    duoReconcile(msg) {
      const d = this.duo;
      if (!d.predicting || !msg.aq) return;
      const p = this.playerEntity;
      const row = msg.e[this.entities.indexOf(p)];
      if (!row) return;
      while (d.hist.length && d.hist[0].q < msg.aq) d.hist.shift();
      const h = d.hist[0];
      if (!h || h.q !== msg.aq) return;
      const ex = row[0] - h.x;
      const ey = row[1] - h.y;
      const err = Math.hypot(ex, ey);
      if (err < 1.5) return;
      d.hist.forEach((e) => {
        e.x += ex;
        e.y += ey;
      });
      if (err > 160) {
        p.x += ex;
        p.y += ey;
        d.corr = { x: 0, y: 0 };
      } else {
        d.corr.x += ex;
        d.corr.y += ey;
      }
    },

    // Os outros bonecos e a bola: desenhados ~0,1 s atrás, deslizando entre as duas
    // posições recebidas em volta desse instante (sem trancos mesmo com a rede oscilando)
    duoApplySnapshot() {
      const d = this.duo;
      const buf = d.buf;
      if (!buf.length) return;
      const latest = buf[buf.length - 1];
      const clock = this.animClock || 0;
      const rt = performance.now() - (d.offset || 0) - 100;
      let i0 = 0;
      for (let i = buf.length - 1; i >= 0; i--) {
        if (buf[i].tm <= rt) {
          i0 = i;
          break;
        }
      }
      const s0 = buf[i0];
      const s1 = buf[i0 + 1] || s0;
      const a = s1 === s0 ? 0 : Math.max(0, Math.min(1, (rt - s0.tm) / Math.max(1, s1.tm - s0.tm)));
      const me = this.playerEntity;
      this.entities.forEach((en, i) => {
        const r0 = s0.e[i];
        const r1 = s1.e[i] || r0;
        const rl = latest.e[i] || r1;
        if (!r0 || !rl) return;
        if (en !== me) {
          const jump = Math.hypot(r1[0] - r0[0], r1[1] - r0[1]) > 220;
          en.x = jump ? r1[0] : r0[0] + (r1[0] - r0[0]) * a;
          en.y = jump ? r1[1] : r0[1] + (r1[1] - r0[1]) * a;
          en.z = r0[2] + (r1[2] - r0[2]) * a;
          const rs = a < 0.5 ? r0 : r1;
          en.vz = rs[7] || 0;
          en.animState = rs[3];
          en.facingRight = !!rs[4];
        }
        // efeitos (atordoado, comemoração, aura) vêm do mais novo, para responder na hora
        const flags = rl[5];
        const aura = rl[6];
        en.stunTimer = flags & 1 ? 10 : 0;
        en.celebrateUntil = flags & 2 ? clock + 3 : 0;
        if (en.isPlayer) en.duoFlow = null;
        else if (en.isDuo) en.duoFlow = aura || null;
        else {
          en.rivalFlowTimer = aura ? 5 : 0;
          if (aura) en.rivalFlowColor = aura;
        }
      });
      const b0 = s0.b;
      const b1 = s1.b || b0;
      const owner = (a < 0.5 ? b0 : b1)[3];
      // a bola no SEU pé acompanha o seu boneco (que está à frente, previsto)
      const ownerEnt = latest.b[3] >= 0 && this.entities[latest.b[3]] === me ? me : owner >= 0 ? this.entities[owner] : null;
      this.ball.owner = ownerEnt;
      this.ball.color = latest.b[4] || '#ffffff';
      if (ownerEnt) {
        this.ball.x = ownerEnt.x + (ownerEnt.facingRight ? 14 : -14);
        this.ball.y = ownerEnt.y + 4;
        this.ball.z = ownerEnt.z || 0;
      } else {
        const jump = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]) > 260;
        this.ball.x = jump ? b1[0] : b0[0] + (b1[0] - b0[0]) * a;
        this.ball.y = jump ? b1[1] : b0[1] + (b1[1] - b0[1]) * a;
        this.ball.z = b0[2] + (b1[2] - b0[2]) * a;
      }
      this.replay = latest.rp ? { label: latest.rp[2], frames: [], pos: 0 } : null;
    },

    // Mensagem do host chegando no guest
    duoGuestMessage(msg) {
      const d = this.duo;
      if (!d) return;
      if (msg.t === 's') {
        d.snap = msg;
        // guarda para a interpolação (pelo relógio do host) e corrige a previsão do seu boneco
        const off = performance.now() - (msg.tm || 0);
        if (d.offset == null || off < d.offset) d.offset = off;
        d.buf.push(msg);
        while (d.buf.length > 40 || (d.buf.length > 2 && msg.tm - d.buf[0].tm > 1500)) d.buf.shift();
        this.duoReconcile(msg);
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
          // só os sons que o host realmente encaminha (nada de chamar outra função pelo nome)
          if (!SFX_FWD.includes(ev.n)) break;
          try {
            window.SFX?.[ev.n]?.(...(Array.isArray(ev.a) ? ev.a.slice(0, 3).map((x) => Number(x) || 0) : []));
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
        if (msg.q) d.ackSeq = msg.q;
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
