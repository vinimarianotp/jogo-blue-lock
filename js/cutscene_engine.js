// ============================================================================
// BLUE LOCK: EGOIST CAREER - MOTOR DE CUTSCENES + ANIMAÇÕES SAKUGA MULTI-ÂNGULO
// 1. Cutscenes de Diálogo (Visual Novel no Centro de Treinamento / Estádio)
// 2. Animações Cinematográficas do Mangá/Anime (Sakuga Multi-Ângulo 60 FPS):
//    • Mudança dinâmica de ângulos de câmera no chute (ex: Gol contra o Sub-20!)
//    • Peças de Quebra-Cabeça (Puzzle do Ego), Impact Frames Preto & Branco,
//      Câmera seguindo a bola e Bola batendo e estufando a rede do gol!
// ============================================================================

window.CutsceneEngine = {
  active: false,
  lines: [],
  currentIndex: 0,
  onComplete: null,
  locationTitle: 'BLUE LOCK TRAINING CENTRE',
  crestTitle: 'BLUE LOCK',

  // Estado da Animação Sakuga Multi-Ângulo (Estilo Anime/Mangá)
  sakugaActive: false,
  sakugaType: 'u20_direct_shoot',
  sakugaFrame: 0,
  sakugaPhase: 0, // 0..4 (5 ângulos de câmera por animação!)
  sakugaPhaseTimer: 0,
  sakugaAutoPlay: true,
  sakugaOnComplete: null,
  sakugaRaf: null,
  puzzlePieces: [],

  awaitingChoice: false,

  play(config) {
    this.active = true;
    this._youKit = null;
    // Cópia: as respostas das escolhas são inseridas na lista durante o diálogo.
    // ifClub / ifNotClub: fala que só vale com (ou sem) aquele clube profissional (ex: o Rin é
    // seu colega no Marsella, então as falas dele "do outro time" trocam)
    const club = window.App?.state?.proClub;
    this.lines = (config.lines || []).filter((l) => (!l.ifClub || l.ifClub === club) && (!l.ifNotClub || l.ifNotClub !== club));
    this.currentIndex = 0;
    this.awaitingChoice = false;
    this.onComplete = config.onComplete || null;
    this.locationTitle = config.locationTitle || 'BLUE LOCK TRAINING CENTRE';
    this.crestTitle = config.crestTitle || 'BLUE LOCK';
    // Cenário de fundo: o mapa da fase; uma fala com "bg" troca o local dali em diante
    this.sceneBg = config.bg || null;
    this.currentBg = undefined;
    // Trilha do diálogo: config.music, ou uma fala com "music" troca dali em diante ('none' = silêncio)
    this.dialogueMusic = config.music || null;
    if (this.dialogueMusic) window.SFX?.playMusic(this.dialogueMusic);
    // Clima sombrio: tudo depois da Copa Sub-20 (App.isDarkEra), config.dark, ou uma fala com "dark"
    this.setDarkMode(config.dark ?? !!window.App?.isDarkEra?.());

    this.showOverlay('vn-cutscene-overlay');
    this.renderCurrentStep();
  },

  setDarkMode(on) {
    this.darkMode = !!on;
    document.getElementById('vn-cutscene-overlay')?.classList.toggle('vn-dark', this.darkMode);
  },

  // Abre/fecha as telas com fade (o CSS anima .open e .closing)
  showOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!this.closeTimers) this.closeTimers = {};
    clearTimeout(this.closeTimers[id]);
    el.classList.remove('closing');
    el.classList.add('open');
  },

  hideOverlay(id) {
    const el = document.getElementById(id);
    if (!el || !el.classList.contains('open')) return;
    if (!this.closeTimers) this.closeTimers = {};
    el.classList.add('closing');
    this.closeTimers[id] = setTimeout(() => el.classList.remove('open', 'closing'), 350);
  },

  // Reinicia a animação de fade de um elemento (a cada fala nova)
  restartFade(el) {
    if (!el) return;
    el.classList.remove('vn-fade');
    void el.offsetWidth;
    el.classList.add('vn-fade');
  },

  next() {
    if (!this.active) return;
    // Clique durante a letra por letra só completa a fala
    if (this.typing) {
      this.finishTypewriter();
      return;
    }
    if (this.awaitingChoice) return;
    this.currentIndex++;
    if (this.currentIndex >= this.lines.length) {
      this.finish();
    } else {
      this.renderCurrentStep();
    }
  },

  // PULAR para na próxima escolha (as escolhas mudam a relação, então não são puladas)
  skip() {
    if (!this.active) return;
    if (this.typing) this.finishTypewriter();
    if (this.awaitingChoice) return;
    const nextChoice = this.lines.findIndex((l, i) => i > this.currentIndex && l.choices && l.choices.length);
    if (nextChoice !== -1) {
      // As falas puladas ainda mudam o lugar, a trilha e o clima (antes a escolha aparecia
      // no fundo e com a música de antes do pulo)
      let music = null;
      for (let i = this.currentIndex + 1; i < nextChoice; i++) {
        const l = this.lines[i];
        if (l.bg) this.sceneBg = l.bg;
        if (l.music) music = l.music;
        if (l.dark !== undefined) this.setDarkMode(l.dark);
      }
      if (music) {
        this.dialogueMusic = music === 'none' ? null : music;
        if (this.dialogueMusic) window.SFX?.playMusic(this.dialogueMusic);
        else window.SFX?.stopMusic();
      }
      this.currentIndex = nextChoice;
      this.renderCurrentStep();
      return;
    }
    this.finish();
  },

  choose(idx) {
    const line = this.lines[this.currentIndex];
    const choice = line?.choices?.[idx];
    if (!choice) return;
    this.awaitingChoice = false;
    window.App?.applyDialogueEffects(choice.effects, line.id || null);
    if (choice.reply && choice.reply.length) {
      this.lines.splice(this.currentIndex + 1, 0, ...choice.reply);
    }
    this.next();
  },

  renderChoices(line) {
    let box = document.getElementById('vn-choices');
    if (!box) {
      const content = document.querySelector('.vn-dialogue-content');
      if (!content) return;
      box = document.createElement('div');
      box.id = 'vn-choices';
      box.className = 'vn-choices';
      content.appendChild(box);
    }
    const hint = document.querySelector('.vn-click-continue');
    const hasChoices = !!(line && line.choices && line.choices.length);
    this.awaitingChoice = hasChoices;
    box.hidden = !hasChoices;
    if (hint) hint.hidden = hasChoices;
    if (!hasChoices) {
      box.innerHTML = '';
      return;
    }

    const nameOf = (id) => {
      const c = (window.BLUE_LOCK_CHARACTERS || []).find((x) => x.id === id);
      return c ? c.name.split(' ')[0] : id === 'tada' ? 'Tada' : id;
    };
    box.innerHTML = line.choices
      .map((ch, i) => {
        // Rival mortal não muda de relação (App.applyDialogueEffects ignora): não promete isso
        const who = Object.keys(ch.effects?.affinity || {}).filter((id) => !window.App?.isMortalRival?.(id)).map(nameOf);
        const tag = who.length ? `<span class="vn-choice-tag">💬 Afeta a relação com ${who.join(', ')}</span>` : '';
        return `<button class="vn-choice-btn" data-idx="${i}">${ch.label}${tag}</button>`;
      })
      .join('');
    box.querySelectorAll('.vn-choice-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.choose(parseInt(btn.dataset.idx, 10));
      });
    });
  },

  // Fala aparecendo letra por letra (pausa um pouco mais em pontuação)
  startTypewriter(el, text, onDone) {
    clearTimeout(this.typeTimer);
    this.typing = true;
    this.typeEl = el;
    this.typeFull = text;
    this.typeDone = onDone;
    let i = 0;
    el.textContent = '';
    const step = () => {
      if (!this.typing) return;
      i++;
      el.textContent = text.slice(0, i);
      // A "voz" de quem fala: um blip a cada 2 letras (narrador não tem voz)
      if (this.voicePitch && i % 2 === 0 && /[A-Za-zÀ-ú0-9]/.test(text[i - 1])) window.SFX?.blip(this.voicePitch * (0.96 + Math.random() * 0.08));
      if (i >= text.length) {
        this.finishTypewriter();
        return;
      }
      const ch = text[i - 1];
      this.typeTimer = setTimeout(step, '.!?…'.includes(ch) ? 170 : ch === ',' ? 80 : 24);
    };
    this.typeTimer = setTimeout(step, 24);
  },

  finishTypewriter() {
    if (!this.typing) return;
    clearTimeout(this.typeTimer);
    this.typing = false;
    if (this.typeEl) this.typeEl.textContent = this.typeFull;
    const cb = this.typeDone;
    this.typeDone = null;
    if (cb) cb();
  },

  finish() {
    clearTimeout(this.typeTimer);
    this.typing = false;
    this.typeDone = null;
    this.active = false;
    this.renderChoices(null);
    this.hideOverlay('vn-cutscene-overlay');
    if (this.dialogueMusic) {
      this.dialogueMusic = null;
      window.SFX?.stopMusic();
    }
    if (typeof this.onComplete === 'function') {
      const cb = this.onComplete;
      this.onComplete = null;
      cb();
    }
  },

  // ==========================================================================
  // MOTOR DE ANIMAÇÃO DO ANIME/MANGÁ MULTI-ÂNGULO (SAKUGA 60 FPS)
  // Exemplo pedido: Na partida contra o U-20, o protagonista dá um chute que
  // muda os ângulos de câmera, a bola rasga o ar, bate na rede e é GOL!
  // ==========================================================================
  // Trilha de cada animação (SFX.MUSIC_THEMES); ao acabar volta a trilha que tocava antes
  SAKUGA_MUSIC: {
    loki_hugo_promise: 'promise',
    flow_awaken: 'epic',
    chem_reaction: 'epic',
    captain_speech: 'epic',
    four_egos_intro: 'epic',
    u20_direct_shoot: 'u20',
    u20_final_goal: 'epic',
    sae_interview: 'dread',
    rin_rival: 'dread',
    fox_entrance: 'dread',
    fox_watch: 'dread',
    nel_metavision_goal: 'epic',
    first_selection_awakening: 'epic',
    u20_celebration: 'victory',
    wc_champion: 'victory',
    fox_training: 'dread',
    monster_awaken: 'epic',
    rin_challenge: 'tension',
    credits: 'promise',
    scripted_shot: 'tension',
    clasico_bunny: 'tension',
    onigokko: 'tension',
    spain_flight: 'travel',
    ego_ticket: 'mystery',
    ego_speech: 'mystery',
    bluelock_door: 'mystery',
    prologue_tada_miss: 'promise'
  },

  // Cenas que existem: as registradas (js/cine_*.js) e as antigas desenhadas aqui
  LEGACY_SAKUGA: [
    'four_egos_intro', 'u20_direct_shoot', 'u20_final_goal', 'sae_interview', 'rin_rival', 'fox_entrance', 'fox_watch',
    'scripted_shot', 'chem_reaction', 'flow_awaken', 'ego_ticket', 'spain_flight', 'clasico_bunny', 'loki_hugo_promise',
    'u20_celebration', 'wc_champion', 'fox_training', 'monster_awaken', 'rin_challenge', 'credits', 'captain_speech',
    'ego_speech', 'bluelock_door', 'onigokko', 'prologue_tada_miss', 'first_selection_awakening', 'nel_metavision_goal', 'four_egos_world_cup'
  ],

  hasSakuga(type) {
    return !!this.CINE?.[type] || this.LEGACY_SAKUGA.includes(type);
  },

  playActionSakuga(type = 'u20_direct_shoot', onComplete = null) {
    // Cena desconhecida: não toca a animação genérica, só segue
    if (!this.hasSakuga(type)) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    this.sakugaActive = true;
    this.sakugaType = type;
    this._youKit = null;
    this.sakugaPrevMusic = window.SFX?.music?.id || null;
    // Cenas cinematográficas (js/cine_*.js) se registram em CINE e têm prioridade
    const cine = this.CINE?.[type];
    if (cine?.music) this.SAKUGA_MUSIC[type] = cine.music;
    this._cineRun = (this._cineRun || 0) + 1;
    if (this.SAKUGA_MUSIC[type]) window.SFX?.playMusic(this.SAKUGA_MUSIC[type]);
    this.sakugaFrame = 0;
    this.sakugaPhase = 0;
    this.sakugaPhaseTimer = 0;
    this.sakugaAutoPlay = true;
    this.sakugaOnComplete = onComplete;

    // Inicializa peças de quebra-cabeça voando (referência clássica do Isagi no mangá/anime)
    this.puzzlePieces = [];
    for (let i = 0; i < 18; i++) {
      this.puzzlePieces.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        vx: -2 - Math.random() * 5,
        vy: (Math.random() - 0.5) * 3,
        size: 16 + Math.random() * 22,
        rot: Math.random() * Math.PI * 2,
        color: i % 2 === 0 ? '#00f5d4' : '#38bdf8'
      });
    }

    this.showOverlay('sakuga-anime-overlay');
    // Os botões [1]-[5] só servem para as animações de 5 ângulos
    const angleBtns = document.getElementById('sakuga-angle-buttons');
    const legacyAngles = ['prologue_tada_miss', 'first_selection_awakening', 'nel_metavision_goal', 'four_egos_world_cup'];
    if (angleBtns) angleBtns.style.visibility = legacyAngles.includes(type) && !cine ? 'visible' : 'hidden';

    if (this.sakugaRaf) cancelAnimationFrame(this.sakugaRaf);
    // Mesmo passo fixo de 60/s da partida (não acelera em monitores de 144 Hz)
    const STEP = 1000 / 60;
    let last = performance.now();
    let acc = STEP;
    // Se o onComplete de uma animação abrir outra, o loop antigo para sozinho
    const token = {};
    this.sakugaToken = token;
    const alive = () => this.sakugaActive && this.sakugaToken === token;
    const loop = (now) => {
      if (!alive()) return;
      acc += Math.min(250, now - last);
      last = now;
      while (acc >= STEP && alive()) {
        acc -= STEP;
        this.updateSakuga();
      }
      if (!alive()) return;
      this.drawSakuga();
      this.sakugaRaf = requestAnimationFrame(loop);
    };
    this.sakugaRaf = requestAnimationFrame(loop);
  },

  // Duração (em frames) de cada ângulo/fase da animação atual
  getSakugaPhaseDurations() {
    if (this.CINE?.[this.sakugaType]) return this.CINE[this.sakugaType].phases;
    if (this.sakugaType === 'four_egos_intro') return [170, 320, 150, 340];
    if (this.sakugaType === 'u20_direct_shoot' || this.sakugaType === 'u20_final_goal') return [210, 190, 160, 230, 230, 170, 270, 150, 240, 190];
    if (this.sakugaType === 'sae_interview') return [180, 200, 230];
    if (this.sakugaType === 'rin_rival') return [190, 190, 320];
    if (this.sakugaType === 'fox_entrance') return [190, 210, 230];
    if (this.sakugaType === 'fox_watch') return [200, 240, 190];
    if (this.sakugaType === 'scripted_shot') return [115, 130, 110, 160];
    if (this.sakugaType === 'chem_reaction') return [130, 140, 100, 110];
    if (this.sakugaType === 'flow_awaken') return [95, 135, 80];
    if (this.sakugaType === 'ego_ticket') return [150, 175];
    if (this.sakugaType === 'spain_flight') return [175, 150, 190];
    if (this.sakugaType === 'clasico_bunny') return [170, 185, 160, 175];
    if (this.sakugaType === 'loki_hugo_promise') return [175, 230, 175];
    if (this.sakugaType === 'u20_celebration' || this.sakugaType === 'wc_champion') return [180, 230, 220];
    if (this.sakugaType === 'fox_training') return [200, 200, 170];
    if (this.sakugaType === 'monster_awaken') return [70, 110, 90];
    if (this.sakugaType === 'rin_challenge') return [170, 190];
    if (this.sakugaType === 'credits') return [700, 700, 500];
    if (this.sakugaType === 'captain_speech') return [150, 240, 170];
    if (this.sakugaType === 'ego_speech') return [190, 260, 250, 210];
    if (this.sakugaType === 'bluelock_door') return [260];
    if (this.sakugaType === 'onigokko') return [230, 230, 220, 180, 250];
    return [130, 130, 165, 115, 150];
  },

  setSakugaAngle(angleIdx) {
    const last = this.getSakugaPhaseDurations().length - 1;
    this.sakugaPhase = Math.max(0, Math.min(last, angleIdx));
    this.sakugaPhaseTimer = 0;
  },

  nextSakugaAngle() {
    if (this.sakugaPhase < this.getSakugaPhaseDurations().length - 1) {
      this.sakugaPhase++;
      this.sakugaPhaseTimer = 0;
    } else {
      this.finishSakuga();
    }
  },

  // Cada cena guarda prontos os seus bonecos e fundos (this._luckSpr, this._wcfgBgC...)
  // e nada apagava: depois de 5 cenas eram ~370 MB de canvas presos (fora do heap do JS,
  // no celular derruba a aba). Ao terminar a cena, esvazia todo cache de canvas dela.
  // Ficam só os do diálogo (fundo do VN, já limitado a 8) e a sombra dos retratos.
  CINE_KEEP_CACHES: new Set(['_vnBgCache', '_shadowCache']),
  releaseCineCaches() {
    const isPic = (v) => v instanceof HTMLCanvasElement || (typeof ImageBitmap !== 'undefined' && v instanceof ImageBitmap);
    // amostra alguns valores: canvas, objeto com canvas dentro ({ cv }, { canvas }) ou
    // outro Map/objeto de canvas (ex.: _fxaBgs é um Map de Maps)
    const holdsPics = (vals, depth) => {
      let n = 0;
      for (const v of vals) {
        if (n++ > 4) break;
        if (!v || typeof v !== 'object') continue;
        if (isPic(v) || isPic(v.cv) || isPic(v.canvas) || isPic(v.c)) return true;
        if (depth < 2 && v instanceof Map && holdsPics(v.values(), depth + 1)) return true;
        if (depth < 2 && v.constructor === Object && holdsPics(Object.values(v), depth + 1)) return true;
      }
      return false;
    };
    Object.keys(this).forEach((k) => {
      if (k[0] !== '_' || this.CINE_KEEP_CACHES.has(k)) return;
      const v = this[k];
      if (v instanceof Map) {
        if (holdsPics(v.values(), 0)) v.clear();
      } else if (v && typeof v === 'object' && v.constructor === Object) {
        if (holdsPics(Object.values(v), 0)) Object.keys(v).forEach((kk) => delete v[kk]);
      }
    });
  },

  finishSakuga() {
    this.sakugaActive = false;
    if (this.sakugaRaf) cancelAnimationFrame(this.sakugaRaf);
    this.hideOverlay('sakuga-anime-overlay');
    try {
      this.releaseCineCaches();
    } catch (e) {}
    // Volta a trilha do diálogo (ou silêncio) antes de seguir
    if (this.SAKUGA_MUSIC[this.sakugaType]) {
      if (this.sakugaPrevMusic) window.SFX?.playMusic(this.sakugaPrevMusic);
      else window.SFX?.stopMusic();
    }
    if (typeof this.sakugaOnComplete === 'function') {
      const cb = this.sakugaOnComplete;
      this.sakugaOnComplete = null;
      cb();
    }
  },

  CINE_READ_SCALE: {
    scripted_shot: 0.7, chem_reaction: 0.7, flow_awaken: 0.7, monster_awaken: 0.7,
    first_selection_awakening: 0.8, nel_metavision_goal: 0.8, u20_direct_shoot: 0.85, u20_final_goal: 0.85
  },

  CINE_MIN_RATE: 0.55,

  // Tempo de leitura das legendas das cenas de cinema (as falas antigas passavam a ~35
  // letras/s): cada plano ganha UMA velocidade constante, calculada no começo do plano
  // (câmera lenta uniforme, até 50%). Nada congela e a velocidade nunca muda no meio do
  // plano, só no corte. ESPAÇO/clique pula o plano.
  cineReadRate(def) {
    if (this._cinePlanRun !== this._cineRun || this._cinePlanType !== this.sakugaType) {
      this._cinePlans = this.cinePlanAll(def, this.sakugaType);
      this._cinePlanRun = this._cineRun;
      this._cinePlanType = this.sakugaType;
    }
    const plan = this._cinePlans[this.sakugaPhase] || { rate: 1, subs: [] };
    this._cineSubs = plan.subs;
    return plan.rate;
  },

  // As falas de cada plano em sequência: uma fala que precisa de mais tempo avança sobre a
  // folga antes da próxima, a velocidade só cai o necessário (até CINE_MIN_RATE) e o que
  // ainda faltar continua por cima do corte, no começo do plano seguinte (como num filme).
  // Limites (antes o excesso ia empurrando plano a plano: a legenda chegava a ficar dois
  // planos atrasada e as falas finais eram descartadas no último plano):
  //  • passa para o plano seguinte no máximo ~35% dele;
  //  • se nem assim couber, as falas do plano encurtam por igual (k);
  //  • o último plano segura até 1,5 s a mais (end) para a última fala, em vez de cortar.
  cinePlanAll(def, type) {
    const scale = def.readScale ?? this.CINE_READ_SCALE[type] ?? 1;
    // ~17 letras por segundo + meio segundo para achar a legenda (mais ágil nas cenas que
    // interrompem a partida)
    const needOf = (s) => (30 + `${s.who || ''} ${s.text || ''}`.length * 3.4) * scale;
    const n = def.phases.length;
    let carry = [];
    return def.phases.map((dur, phase) => {
      const last = phase === n - 1;
      const subs = (def.subs?.[phase] || [])
        .map((s) => ({ s, a: s.from ?? 0, b: Math.min(s.to ?? dur, dur), need: needOf(s) }))
        .filter((x) => x.b > x.a)
        .sort((x, y) => x.a - y.a);
      subs.unshift(...carry);
      const lay = (rate, k = 1) => {
        let cur = 0;
        return subs.map((x) => {
          const from = Math.max(x.a, cur);
          cur = Math.max(x.b, from + x.need * rate * k);
          return Object.assign({}, x.s, { from, to: cur });
        });
      };
      const endOf = (rate, k) => (subs.length ? lay(rate, k)[subs.length - 1].to : 0);
      let rate = 1;
      while (subs.length && rate > this.CINE_MIN_RATE && endOf(rate, 1) > dur) rate -= 0.02;
      rate = Math.max(this.CINE_MIN_RATE, rate);
      const room = last ? 90 * rate : 0.35 * (def.phases[phase + 1] || 0) * rate;
      let k = 1;
      while (subs.length && k > 0.35 && endOf(rate, k) > dur + room) k -= 0.05;
      const out = lay(rate, k);
      const lastTo = out.length ? out[out.length - 1].to : 0;
      const end = last ? Math.max(dur, Math.min(dur + room, lastTo)) : dur;
      // Só passa para o próximo plano o que for legível (um resto de 0,3 s não vale)
      carry = last
        ? []
        : out
            .map((s) => ({ s: Object.assign({}, s, { carried: s.from < dur || s.carried }), a: 0, b: 0, need: (s.to - Math.max(dur, s.from)) / rate }))
            .filter((x) => x.need > 20);
      return { rate, end, subs: out.filter((s) => s.from < end) };
    });
  },

  // Fim do plano atual: o último pode durar um pouco mais para a última fala (cinePlanAll)
  cinePhaseEnd(dur) {
    if (!this.CINE?.[this.sakugaType]) return dur;
    return this._cinePlans?.[this.sakugaPhase]?.end || dur;
  },

  updateSakuga() {
    this.sakugaFrame++;
    const cineDef = this.CINE?.[this.sakugaType];
    if (cineDef) {
      // Rampa curta (~0,5 s) até a velocidade do plano: sem tranco quando muda no corte
      const target = this.cineReadRate(cineDef);
      if (this._cineRateRun !== this._cineRun) {
        this._cineRateRun = this._cineRun;
        this._cineRateNow = target;
      }
      this._cineRateNow += (target - this._cineRateNow) * 0.1;
      this.sakugaPhaseTimer += this._cineRateNow;
    } else {
      this.sakugaPhaseTimer += 1;
    }

    this.puzzlePieces.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += 0.04;
      if (p.x < -50) p.x = 1320;
    });

    // Cada ângulo dura ~2-5 segundos e troca automaticamente de ângulo!
    const phaseDurations = this.getSakugaPhaseDurations();
    const maxT = this.cinePhaseEnd(phaseDurations[this.sakugaPhase] || 130);
    if (this.sakugaAutoPlay && this.sakugaPhaseTimer >= maxT) {
      if (this.sakugaPhase < phaseDurations.length - 1) {
        this.sakugaPhase++;
        this.sakugaPhaseTimer = 0;
      } else {
        this.finishSakuga();
      }
    }
  },

  getSakugaMetadata(type) {
    const pName = (window.App?.state?.profile?.name || 'VOCÊ').toUpperCase();
    switch (type) {
      case 'prologue_tada_miss':
        return {
          title: 'PRÓLOGO: O PASSE PARA TADA E A BOLA NA TRAVE!',
          rivalId: 'niou',
          allyId: 'nanase',
          defenderId: 'ishikari',
          gkId: 'fukaku',
          isMissOnPost: true,
          angles: [
            { tag: 'ÂNGULO 1/5 • ARRANCADA NO ENSINO MÉDIO', sub: `${pName} dribla dois marcadores e entra na grande área cara a cara com o goleiro!` },
            { tag: 'ÂNGULO 2/5 • O PEDIDO DE PASSE DO AMIGO', sub: 'Tada corre livre pela direita gritando: "UM POR TODOS E TODOS POR UM! PASSA PRA MIM!"' },
            { tag: 'ÂNGULO 3/5 • MUDANÇA DE ÂNGULO: O CHUTE DE TADA', sub: 'Você toca de lado... A câmera corta em 3 ângulos mostrando Tada batendo torto na bola!' },
            { tag: 'ÂNGULO 4/5 • CÂMERA NA BOLA RUMO À TRAVE', sub: 'O goleiro já estava batido, mas a bola faz uma curva para fora...' },
            { tag: 'ÂNGULO 5/5 • EXPLOSÃO NA TRAVE! ELIMINAÇÃO E CONVOCAÇÃO!', sub: 'CLANG!! A bola explode no poste direito! Seu colégio é eliminado e Jinpachi Ego te convoca para o BLUE LOCK!' }
          ]
        };
      case 'first_selection_awakening':
        return {
          title: '1ª SELEÇÃO: O DESPERTAR DO QUEBRA-CABEÇA & CHUTE DIRETO!',
          rivalId: 'nagi',
          allyId: 'bachira',
          defenderId: 'barou',
          gkId: 'gagamaru',
          angles: [
            { tag: 'ÂNGULO 1/5 • CRUZAMENTO DE BACHIRA NO PRÉDIO 5', sub: 'Bachira aplica um elástico no ar e levanta a bola no ponto futuro da grande área!' },
            { tag: 'ÂNGULO 2/5 • CLOSE-UP MANGÁ: AS PEÇAS DO EGO SE ENCAIXAM', sub: `${pName} enxerga a última peça do quebra-cabeça nas costas de Barou e Nagi!` },
            { tag: 'ÂNGULO 3/5 • TRIPLA MUDANÇA DE ÂNGULO NO CHUTE DIRETO!', sub: 'Sem dominar! A câmera gira em 3 ângulos diferentes no impacto do seu Voleio Direto!' },
            { tag: 'ÂNGULO 4/5 • DISPARO RASGANDO A GRANDE ÁREA', sub: 'A bola corta o ar com rastro neon passando por Nagi!' },
            { tag: 'ÂNGULO 5/5 • BOLA ESTUFANDO A REDE DO TIME V!', sub: 'GOOOOOL!! A bola bate com violência no fundo da rede e garante a sobrevivência no Blue Lock!' }
          ]
        };
      case 'nel_metavision_goal':
        return {
          title: 'LIGA NEO EGOÍSTA (NEL): METAVISION & CHUTE DE DUAS ARMAS!',
          rivalId: 'kaiser',
          allyId: 'hiori',
          defenderId: 'lorenzo',
          gkId: 'gagamaru',
          angles: [
            { tag: 'ÂNGULO 1/5 • GRADE HOLOGRÁFICA DO METAVISION 4D', sub: `${pName} escaneia todo o campo em 360° e prevê a interceptação de Michael Kaiser e Don Lorenzo!` },
            { tag: 'ÂNGULO 2/5 • CLOSE-UP OLHOS DO PREDADOR & FINTA NO AR', sub: 'Kaiser e Lorenzo saltam para bloquear seu chute de esquerda, mas você finta no ar (Two-Gun Volley)!' },
            { tag: 'ÂNGULO 3/5 • MUDANÇA DE ÂNGULO: IMPACTO DEVASTADOR!', sub: 'Câmera corta em 3 ângulos (Baixo, Impact Frame Preto & Branco e Traseiro) no chute com a perna direita!' },
            { tag: 'ÂNGULO 4/5 • EFEITO MAGNUS RASGANDO A ÁREA DA NEL', sub: 'Kaiser assiste paralisado enquanto sua bola faz uma curva impossível!' },
            { tag: 'ÂNGULO 5/5 • REDE ESTUFADA & OFERTA DE ¥ 300.000.000!', sub: 'GOOOOOL!! A bola explode na malha da rede e o telão da BLTV dispara seu leilão mundial!' }
          ]
        };
      case 'four_egos_world_cup':
        return {
          title: 'FINAL DA COPA DO MUNDO: SINGULARIDADE DOS "QUATRO EGOS"!',
          rivalId: 'loki',
          allyId: 'sae',
          defenderId: 'hugo',
          gkId: 'fukaku',
          angles: [
            { tag: 'ÂNGULO 1/5 • CÂMERA PANORÂMICA: OS QUATRO EGOS EM CAMPO', sub: `A câmera passa por ${pName}, Sae Itoshi, Julian Loki e Hugo emanando auras colossais no centro da Final!` },
            { tag: 'ÂNGULO 2/5 • REAÇÃO QUÍMICA COM SAE ITOSHI vs LOKI & HUGO', sub: 'Sae Itoshi dispara o passe de trivela milimétrico; Julian Loki e Hugo fecham em velocidade supersônica!' },
            { tag: 'ÂNGULO 3/5 • TRIPLA MUDANÇA DE ÂNGULO DO CHUTE MUNDIAL!', sub: 'A câmera corta por 3 ângulos cinematográficos enquanto você golpeia a bola no ar entre Loki e Hugo!' },
            { tag: 'ÂNGULO 4/5 • COMETA WORLD CLASS RUMO AO ÂNGULO', sub: 'O disparo rasga o gramado da Catedral da Copa do Mundo quebrando a barreira do som!' },
            { tag: 'ÂNGULO 5/5 • A BOLA EXPLODE NA REDE! CAMPEÃO DO MUNDO!', sub: 'GOOOOOL HISTÓRICO!! A bola deforma a rede do gol e consagra você como o Nº 1 DO MUNDO!' }
          ]
        };
      case 'u20_direct_shoot':
      default:
        return {
          title: 'PARTIDA SUB-20 DO JAPÃO: O CHUTE DA "SORTE" QUE MUDA DE ÂNGULO!',
          rivalId: 'sae',
          allyId: 'rin',
          defenderId: 'aiku',
          gkId: 'fukaku',
          angles: [
            { tag: 'CENA 1/6 • 90+3\' — RIN vs SAE', sub: '3 x 3 no Estádio Nacional. Os irmãos Itoshi se chocam na entrada da área!' },
            { tag: 'CENA 2/6 • A PEÇA DA "SORTE"', sub: 'A bola espirra para o alto... e o tempo parece parar.' },
            { tag: 'CENA 3/6 • O EGO DESPERTA', sub: `Todo o estádio congela... menos ${pName}. A última peça do quebra-cabeça se encaixa.` },
            { tag: 'CENA 4/6 • CHUTE DIRETO!', sub: 'Sem dominar! Oliver Aiku se joga no carrinho, mas o voleio já saiu!' },
            { tag: 'CENA 5/6 • A BOLA RASGA A DEFESA SUB-20', sub: 'Passa pela chuteira do Aiku e pelas luvas do Fukaku!' },
            { tag: 'CENA 6/6 • GOOOL! BLUE LOCK 4 x 3', sub: 'A rede estufa e o Estádio Nacional explode! O Blue Lock venceu a Sub-20!' }
          ]
        };
    }
  },

  // Desenha a cena atual e escurece nas trocas: cada cena nasce do preto e,
  // no automático, a anterior escurece antes do corte (sem "corte seco")
  drawSakuga() {
    this.drawSakugaScene();
    const cv = document.getElementById('sakuga-action-canvas');
    if (!cv) return;
    const t = this.sakugaPhaseTimer;
    const dur = this.cinePhaseEnd(this.getSakugaPhaseDurations()[this.sakugaPhase] || 130);
    let alpha = 0;
    if (t < 14) alpha = 1 - t / 14;
    else if (this.sakugaAutoPlay && dur - t < 10) alpha = ((10 - (dur - t)) / 10) * 0.85;
    if (alpha > 0) {
      const ctx = cv.getContext('2d');
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#000000';
      // Nas cenas de cinema escurece só a imagem: as tarjas (com a legenda que atravessa o
      // corte) ficam como estão, sem piscar
      const def = this.CINE?.[this.sakugaType];
      const top = def ? Math.round(cv.height * (def.letterbox ?? 0.12)) : 0;
      ctx.fillRect(0, top, cv.width, cv.height - top * 2);
      ctx.restore();
    }
  },

  drawSakugaScene() {
    const cv = document.getElementById('sakuga-action-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width;
    const H = cv.height;
    if (this.CINE?.[this.sakugaType]) {
      this.drawCine(ctx, W, H, this.CINE[this.sakugaType]);
      return;
    }
    if (this.sakugaType === 'four_egos_intro') {
      this.drawFourEgosIntro(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'u20_direct_shoot' || this.sakugaType === 'u20_final_goal') {
      this.drawLuckGoal(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'sae_interview') {
      this.drawSaeInterview(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'rin_rival') {
      this.drawRinRival(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'fox_entrance') {
      this.drawFoxEntrance(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'fox_watch') {
      this.drawFoxWatch(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'scripted_shot') {
      this.drawScriptedShot(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'chem_reaction') {
      this.drawChemReaction(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'flow_awaken') {
      this.drawFlowAwaken(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'ego_ticket') {
      this.drawEgoTicket(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'spain_flight') {
      this.drawSpainFlight(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'clasico_bunny') {
      this.drawClasicoBunny(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'loki_hugo_promise') {
      this.drawLokiHugoPromise(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'u20_celebration' || this.sakugaType === 'wc_champion') {
      this.drawU20Celebration(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'fox_training') {
      this.drawFoxTraining(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'monster_awaken') {
      this.drawMonsterAwaken(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'rin_challenge') {
      this.drawRinChallenge(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'credits') {
      this.drawCredits(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'captain_speech') {
      this.drawCaptainSpeech(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'ego_speech') {
      this.drawEgoSpeech(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'bluelock_door') {
      this.drawBlueLockDoor(ctx, W, H);
      return;
    }
    if (this.sakugaType === 'onigokko') {
      this.drawOnigokko(ctx, W, H);
      return;
    }
    const meta = this.getSakugaMetadata(this.sakugaType);
    const phaseInfo = meta.angles[this.sakugaPhase] || meta.angles[0];
    const t = this.sakugaPhaseTimer;

    const playerChar = this.getSpeakerCharData('VOCÊ');
    const rivalChar = this.getSpeakerCharData(meta.rivalId);
    const allyChar = this.getSpeakerCharData(meta.allyId);
    const defChar = this.getSpeakerCharData(meta.defenderId);
    const gkChar = this.getSpeakerCharData(meta.gkId);

    ctx.clearRect(0, 0, W, H);

    // ========================================================================
    // ÂNGULO 0: PLANO DINÂMICO DA JOGADA (DISPUTA RIN x SAE / BOLA SUBINDO)
    // ========================================================================
    if (this.sakugaPhase === 0) {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(0.5, '#14532d');
      grad.addColorStop(1, '#064e3b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Refletores do Estádio e Speedlines diagonais
      this.drawSpeedLines(ctx, W, H, '#38bdf8', 0.22);

      // Gramado em perspectiva dramática
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 3;
      ctx.strokeRect(120, H * 0.54, W - 240, H * 0.4);

      // Ally (ex: Rin / Sae / Bachira) e Rival disputando a bola
      const clashX = W * 0.42;
      const clashY = H * 0.48;
      ctx.save();
      ctx.translate(clashX - 180 + Math.min(40, t * 0.5), clashY - 80);
      window.PixelRenderer.drawCharacterSprite(ctx, allyChar, 210, 240, {
        facing: 'front',
        animState: 'slide',
        frame: t,
        showAura: true,
        auraColor: allyChar.auraColor || '#00f5d4'
      });
      ctx.restore();

      ctx.save();
      ctx.translate(clashX + 20 - Math.min(30, t * 0.4), clashY - 90);
      window.PixelRenderer.drawCharacterSprite(ctx, rivalChar, 210, 240, {
        facing: 'front',
        flipX: true,
        animState: 'rabona',
        frame: t,
        showAura: true,
        auraColor: rivalChar.auraColor || '#ec4899'
      });
      ctx.restore();

      // Faíscas do choque e a Bola subindo alto com a peça "LUCK / SORTE"!
      const ballX = clashX + 40 + t * 2.4;
      const ballY = clashY - Math.sin(Math.min(Math.PI * 0.85, t * 0.018)) * 260;
      this.drawAnimeBall(ctx, ballX, ballY, 26, '#00f5d4', t);

      // Peça de Quebra-Cabeça brilhando ao lado da bola
      this.drawPuzzlePiece(ctx, ballX + 48, ballY - 35, 34, '#00f5d4', t * 0.03, 'LUCK');

      // Você correndo ao fundo entrando na área
      ctx.save();
      ctx.translate(W * 0.72, H * 0.52);
      window.PixelRenderer.drawCharacterSprite(ctx, playerChar, 180, 210, {
        facing: 'front',
        animState: 'run',
        frame: t,
        showAura: true,
        auraColor: '#00f5d4'
      });
      ctx.restore();
    }

    // ========================================================================
    // ÂNGULO 1: CLOSE-UP EXTREMO DOS OLHOS DO EGO + QUEBRA-CABEÇA + AIKU DANDO CARRINHO
    // ========================================================================
    else if (this.sakugaPhase === 1) {
      ctx.fillStyle = '#040814';
      ctx.fillRect(0, 0, W, H);
      this.drawRadialSpeedLines(ctx, W * 0.35, H * 0.45, W, '#00f5d4', 0.35);

      // Peças do Quebra-Cabeça voando pela tela (marca registrada do anime Blue Lock!)
      this.puzzlePieces.forEach((p, idx) => {
        this.drawPuzzlePiece(ctx, p.x, p.y, p.size, p.color, p.rot, idx % 4 === 0 ? 'EGO' : '');
      });

      // Divisão de tela estilo Mangá (Split Panel Diagonal!)
      // Painel Esquerdo: Seu rosto em Close-Up Gigante com chamas do Ego nos olhos!
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W * 0.58, 0);
      ctx.lineTo(W * 0.46, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = '#09152b';
      ctx.fillRect(0, 0, W, H);
      this.drawSpeedLines(ctx, W, H, '#00f5d4', 0.3);
      ctx.translate(60, -30);
      window.PixelRenderer.drawCharacterSprite(ctx, playerChar, 540, 660, {
        facing: 'front',
        animState: 'run',
        frame: t,
        showAura: true,
        auraColor: '#00f5d4'
      });

      // Brilho espiral nos olhos (Ego Eye Trail!)
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(290, 230);
      ctx.lineTo(420 + Math.sin(t * 0.3) * 30, 170);
      ctx.moveTo(365, 230);
      ctx.lineTo(510 + Math.cos(t * 0.3) * 30, 165);
      ctx.stroke();
      ctx.restore();

      // Linha divisória branca/ciano do painel de mangá
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(W * 0.58, 0);
      ctx.lineTo(W * 0.46, H);
      ctx.stroke();

      // Painel Direito: Oliver Aiku / Defensor se jogando no carrinho desesperado!
      ctx.save();
      ctx.translate(W * 0.68 - Math.min(90, t * 0.8), H * 0.32);
      window.PixelRenderer.drawCharacterSprite(ctx, defChar, 340, 390, {
        facing: 'front',
        flipX: true,
        animState: 'slide',
        frame: t,
        showAura: true,
        auraColor: '#22c55e'
      });
      ctx.restore();
    }

    // ========================================================================
    // ÂNGULO 2: O CHUTE QUE MUDA OS ÂNGULOS DE CÂMERA (3 SUB-ÂNGULOS DINÂMICOS!)
    // • Sub-Ângulo A (t 0..55): Câmera Baixa Lateral (Contra-Plongée) preparando a perna
    // • Sub-Ângulo B (t 56..110): IMPACT FRAME PRETO & BRANCO MANGÁ no contato com a bola!
    // • Sub-Ângulo C (t 111..165): Câmera Traseira Inclinada (Dutch Angle) disparando pro gol!
    // ========================================================================
    else if (this.sakugaPhase === 2) {
      const subAngle = t < 55 ? 1 : t < 110 ? 2 : 3;

      if (subAngle === 1) {
        // SUB-ÂNGULO 3A: Contra-Plongée Dramático (Câmera rente à grama olhando para cima)
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#0f172a');
        g.addColorStop(0.75, '#1e3a8a');
        g.addColorStop(0.75, '#15803d');
        g.addColorStop(1, '#052e16');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        this.drawRadialSpeedLines(ctx, W * 0.5, H * 0.55, W, '#38bdf8', 0.35);

        // Defensor passando no chão tentando bloquear
        ctx.save();
        ctx.translate(W * 0.22, H * 0.46);
        window.PixelRenderer.drawCharacterSprite(ctx, defChar, 260, 300, {
          facing: 'front',
          flipX: true,
          animState: 'slide',
          frame: t,
          showAura: true,
          auraColor: '#ef4444'
        });
        ctx.restore();

        // Protagonista armando o voleio direto!
        ctx.save();
        ctx.translate(W * 0.45, H * 0.22);
        ctx.rotate(-0.08);
        window.PixelRenderer.drawCharacterSprite(ctx, playerChar, 360, 420, {
          facing: 'front',
          animState: 'windup',
          frame: t,
          showAura: true,
          auraColor: '#00f5d4'
        });
        ctx.restore();

        this.drawAnimeBall(ctx, W * 0.62, H * 0.52 - (55 - t) * 2.2, 34, '#00f5d4', t);
        this.drawCameraCutBadge(ctx, '🎥 CORTE DE CÂMERA 3A: CONTRA-PLONGÉE (PREPARAÇÃO DO VOLEIO)');
      } else if (subAngle === 2) {
        // SUB-ÂNGULO 3B: IMPACT FRAME MANGÁ PRETO & BRANCO + RAIOS CIANO/DOURADOS!
        const flash = t % 6 < 3;
        ctx.fillStyle = flash ? '#ffffff' : '#050811';
        ctx.fillRect(0, 0, W, H);
        this.drawRadialSpeedLines(ctx, W * 0.55, H * 0.5, W, flash ? '#090d16' : '#00f5d4', 0.75);

        ctx.save();
        ctx.translate(W * 0.34, H * 0.14);
        ctx.rotate(0.12);
        window.PixelRenderer.drawCharacterSprite(ctx, playerChar, 430, 490, {
          facing: 'front',
          animState: 'shoot',
          frame: t,
          showAura: true,
          auraColor: '#00f5d4'
        });
        ctx.restore();

        // Anéis de Onda de Choque Supersônica no pé batendo na bola!
        const bx = W * 0.61;
        const by = H * 0.53;
        for (let r = 1; r <= 4; r++) {
          ctx.strokeStyle = r % 2 === 0 ? '#00f5d4' : '#facc15';
          ctx.lineWidth = 6 - r;
          ctx.beginPath();
          ctx.ellipse(bx, by, (t - 50) * r * 1.4, (t - 50) * r * 0.7, 0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
        this.drawAnimeBall(ctx, bx, by, 44, '#facc15', t);
        this.drawCameraCutBadge(ctx, '⚡ CORTE DE CÂMERA 3B: IMPACT FRAME MANGÁ (CONTATO DIRETO NA BOLA!)');
      } else {
        // SUB-ÂNGULO 3C: Câmera Traseira Inclinada mostrando o Gol ao fundo e a bola saindo do pé!
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(-0.06);
        ctx.translate(-W / 2, -H / 2);

        ctx.fillStyle = '#064e3b';
        ctx.fillRect(-100, -100, W + 200, H + 200);
        this.drawSpeedLines(ctx, W, H, '#00f5d4', 0.4);

        // Trave Grande ao Fundo
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 10;
        ctx.strokeRect(W * 0.56, H * 0.14, W * 0.36, H * 0.42);

        // Goleiro saltando ao fundo
        ctx.save();
        ctx.translate(W * 0.68, H * 0.25);
        window.PixelRenderer.drawCharacterSprite(ctx, gkChar, 170, 195, {
          facing: 'front',
          animState: 'dive',
          frame: t
        });
        ctx.restore();

        // Seu jogador de costas/perfil finalizando o movimento da perna
        ctx.save();
        ctx.translate(W * 0.12, H * 0.22);
        window.PixelRenderer.drawCharacterSprite(ctx, playerChar, 370, 430, {
          facing: 'back',
          animState: 'shoot',
          frame: t,
          showAura: true,
          auraColor: '#00f5d4'
        });
        ctx.restore();

        const prog = (t - 110) / 55;
        const bx = W * 0.38 + prog * (W * 0.44);
        const by = H * 0.52 - prog * (H * 0.28);
        this.drawAnimeBall(ctx, bx, by, 38 * (1 - prog * 0.35), '#00f5d4', t);
        ctx.restore();

        this.drawCameraCutBadge(ctx, '🎥 CORTE DE CÂMERA 3C: VISÃO TRASEIRA RUMO AO ÂNGULO DO GOL!');
      }
    }

    // ========================================================================
    // ÂNGULO 3: CÂMERA SEGUINDO A BOLA GIRANDO EM ALTA VELOCIDADE
    // ========================================================================
    else if (this.sakugaPhase === 3) {
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, W, H);
      this.drawSpeedLines(ctx, W, H, '#00f5d4', 0.65);
      this.drawSpeedLines(ctx, W, H, '#facc15', 0.35);

      // Defensor e Goleiro ficando para trás em motion blur
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.translate(W * 0.28 - t * 3.2, H * 0.36);
      window.PixelRenderer.drawCharacterSprite(ctx, defChar, 220, 260, {
        facing: 'front',
        animState: 'dive',
        frame: t
      });
      ctx.restore();

      // Bola Gigante no centro girando com raios de aura
      const shakeX = (Math.random() - 0.5) * 10;
      const shakeY = (Math.random() - 0.5) * 10;
      this.drawAnimeBall(ctx, W * 0.54 + shakeX, H * 0.48 + shakeY, 68, '#00f5d4', t * 2.5);
    }

    // ========================================================================
    // ÂNGULO 4: DENTRO DO GOL — A BOLA BATE NA REDE, ESTUFA A MALHA E É GOL!
    // ========================================================================
    else if (this.sakugaPhase === 4) {
      const impactT = Math.max(0, t - 18);
      const isHit = t >= 18;
      const shake = isHit && t < 55 ? (Math.random() - 0.5) * 18 : 0;

      ctx.save();
      ctx.translate(shake, shake);

      // Fundo escuro do estádio visto de dentro do gol
      ctx.fillStyle = '#040b16';
      ctx.fillRect(0, 0, W, H);

      if (meta.isMissOnPost) {
        // Caso especial do Prólogo: A bola de Tada explode na TRAVE e sai!
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(W * 0.72, 40, 28, H - 80);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(W * 0.72, 40, 24, H - 80);

        const bx = isHit ? W * 0.72 - (t - 18) * 9 : W * 0.25 + t * 26;
        const by = isHit ? H * 0.38 - (t - 18) * 4 : H * 0.48;
        this.drawAnimeBall(ctx, bx, by, 48, '#ef4444', t);

        if (isHit) {
          this.drawRadialSpeedLines(ctx, W * 0.72, H * 0.38, W, '#ef4444', 0.5);
          ctx.fillStyle = '#ef4444';
          ctx.font = 'italic 900 58px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💥 NA TRAVE!! O AMIGO PERDEU O GOL!', W * 0.45, H * 0.25);
        }
      } else {
        // A REDE DO GOL SENDO ESTUFADA E DEFORMADA PELO IMPACTO DA BOLA!
        const hitX = W * 0.56;
        const hitY = H * 0.44;
        const stretch = isHit ? Math.min(115, impactT * 4.5) : 0;

        // Desenha a malha da rede 3D deformando para trás no ponto em que a bola bate!
        ctx.strokeStyle = isHit ? '#00f5d4' : 'rgba(255,255,255,0.45)';
        ctx.lineWidth = isHit ? 2.5 : 1.5;

        const cols = 18;
        const rows = 10;
        const getNetPoint = (c, r) => {
          const nx = 90 + (c / cols) * (W - 180);
          const ny = 60 + (r / rows) * (H - 180);
          const dist = Math.hypot(nx - hitX, ny - hitY);
          const pull = Math.max(0, 1 - dist / 340) * stretch;
          const ang = Math.atan2(hitY - ny, hitX - nx);
          return {
            x: nx + Math.cos(ang) * pull * 0.55,
            y: ny + Math.sin(ang) * pull * 0.55 - pull * 0.25
          };
        };

        for (let r = 0; r <= rows; r++) {
          ctx.beginPath();
          for (let c = 0; c <= cols; c++) {
            const pt = getNetPoint(c, r);
            if (c === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        }
        for (let c = 0; c <= cols; c++) {
          ctx.beginPath();
          for (let r = 0; r <= rows; r++) {
            const pt = getNetPoint(c, r);
            if (r === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        }

        const ballX = isHit ? hitX + Math.sin(t * 0.8) * 6 : W * 0.15 + (t / 18) * (hitX - W * 0.15);
        const ballY = isHit ? hitY + Math.cos(t * 0.8) * 6 : H * 0.65 - (t / 18) * (H * 0.65 - hitY);

        if (isHit) {
          // Ondas de choque estufando a rede!
          for (let k = 1; k <= 3; k++) {
            ctx.strokeStyle = k % 2 === 0 ? '#facc15' : '#00f5d4';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(hitX, hitY, (impactT * 3.5 * k) % 260, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        this.drawAnimeBall(ctx, ballX, ballY, 54, '#00f5d4', t * 2);

        if (isHit) {
          ctx.fillStyle = '#00f5d4';
          ctx.font = 'italic 900 64px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#090d16';
          ctx.shadowBlur = 16;
          ctx.fillText('⚽ GOOOOOOOL!! A REDE ESTUFOU!', W / 2, H * 0.18);
          ctx.shadowBlur = 0;
        }
      }
      ctx.restore();
    }

    this.drawSakugaBar(ctx, W, H, `🎬 ANIMAÇÃO DO MANGÁ/ANIME: ${meta.title}`, phaseInfo.tag, phaseInfo.sub);
  },

  // ========================================================================
  // BARRA CINEMATOGRÁFICA INFERIOR DA ANIMAÇÃO (COM CONTROLE DE ÂNGULOS)
  // ========================================================================
  drawSakugaBar(ctx, W, H, title, tag, sub) {
    ctx.fillStyle = 'rgba(5, 9, 18, 0.92)';
    ctx.fillRect(0, H - 108, W, 108);
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, H - 108);
    ctx.lineTo(W, H - 108);
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.font = '900 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, 28, H - 78);

    ctx.fillStyle = '#00f5d4';
    ctx.font = 'italic 900 20px "Segoe UI", sans-serif';
    ctx.fillText(tag, 28, H - 48);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 14px "Segoe UI", sans-serif';
    ctx.fillText(sub, 28, H - 20);
  },

  // ========================================================================
  // FINAL CONTRA A FRANÇA: "FINAL WORLD CUP U-20" → CÂMERA GIRANDO PELO CAMPO
  // → "4 EGO'S" → TELA DIVIDIDA EM 4 (VOCÊ, LOKI, SAE E HUGO)
  // ========================================================================
  getFourEgosCast() {
    const find = (id) => (window.BLUE_LOCK_CHARACTERS || []).find((c) => c.id === id) || {};
    const japan = { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' };
    const france = { jerseyPrimary: '#0b1d4d', jerseySecondary: '#ef4444' };
    const pName = (window.App?.state?.profile?.name || 'VOCÊ').toUpperCase();
    return [
      { label: pName, role: 'JAPÃO • O EGO DO BLUE LOCK', color: '#00f5d4', pos: [-130, 70], char: Object.assign({}, this.getSpeakerCharData('VOCÊ'), japan) },
      { label: 'JULIAN LOKI', role: 'FRANÇA • GODSPEED', color: '#facc15', pos: [170, -90], char: Object.assign({}, find('loki'), france) },
      { label: 'SAE ITOSHI', role: 'JAPÃO • GÊNIO DO PASSE', color: '#f43f5e', pos: [-280, -130], char: Object.assign({}, find('sae'), japan) },
      { label: 'HUGO', role: 'FRANÇA • O EGO DE CABELO ROSA', color: '#ec4899', pos: [240, 130], char: Object.assign({}, find('hugo'), france) }
    ];
  },

  drawFourEgosIntro(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const cast = this.getFourEgosCast();
    const stageH = H - 108;
    ctx.clearRect(0, 0, W, H);

    if (this.sakugaPhase === 0) {
      // "FINAL WORLD CUP U-20" — estádio à noite, flashes da torcida e refletores
      const g = ctx.createLinearGradient(0, 0, 0, stageH);
      g.addColorStop(0, '#020617');
      g.addColorStop(1, '#0b1d4d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, stageH);
      for (let i = 0; i < 140; i++) {
        const fx = (i * 97) % W;
        const fy = 40 + ((i * 53) % Math.floor(stageH * 0.55));
        if ((i * 7 + this.sakugaFrame) % 23 < 2) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(fx, fy, 3, 3);
        }
      }
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#e0f2fe';
      [0.15, 0.85].forEach((px, k) => {
        const sway = Math.sin(this.sakugaFrame * 0.02 + k) * 120;
        ctx.beginPath();
        ctx.moveTo(W * px, 0);
        ctx.lineTo(W / 2 + sway - 140, stageH);
        ctx.lineTo(W / 2 + sway + 140, stageH);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();

      const pop = Math.min(1, t / 35);
      const scale = pop < 1 ? 0.4 + pop * 0.75 : 1.15 - Math.min(0.15, (t - 35) * 0.004);
      ctx.save();
      ctx.translate(W / 2, stageH * 0.45);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.font = 'italic 900 78px "Segoe UI", sans-serif';
      ctx.fillStyle = '#facc15';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 20;
      ctx.fillText('FINAL WORLD CUP U-20', 0, 0);
      ctx.restore();

      if (t > 60) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, (t - 60) / 25);
        ctx.textAlign = 'center';
        ctx.font = '900 34px "Segoe UI", sans-serif';
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(W / 2 - 330, stageH * 0.58, 250, 52);
        ctx.fillStyle = '#0b1d4d';
        ctx.fillRect(W / 2 + 80, stageH * 0.58, 250, 52);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('JAPÃO', W / 2 - 205, stageH * 0.58 + 38);
        ctx.fillText('FRANÇA', W / 2 + 205, stageH * 0.58 + 38);
        ctx.fillStyle = '#facc15';
        ctx.fillText('VS', W / 2, stageH * 0.58 + 38);
        ctx.restore();
      }
      this.drawSakugaBar(ctx, W, H, '🎬 FINAL WORLD CUP U-20 • JAPÃO vs FRANÇA', 'PARTE 1/4 • A GRANDE FINAL', 'O estádio inteiro está de pé. Os hinos terminaram.');
    } else if (this.sakugaPhase === 1) {
      // Câmera orbitando ao redor do campo (pseudo-3D)
      const ang = -0.6 + t * 0.012;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const D = 950;
      const f = 720;
      const horizon = stageH * 0.3;
      const camH = 170;
      const proj = (x, z) => {
        const rx = x * cosA - z * sinA;
        const rz = x * sinA + z * cosA + D;
        return { sx: W / 2 + (rx * f) / rz, sy: horizon + (camH * f) / rz, depth: rz };
      };

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, stageH);
      // Arquibancada passando ao fundo (parallax com a rotação)
      const crowdOff = (ang * 600) % 24;
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, horizon - 120, W, 120);
      for (let cx = -24; cx < W + 24; cx += 12) {
        for (let cy = horizon - 112; cy < horizon - 6; cy += 12) {
          const lit = ((cx + cy + Math.floor(ang * 90)) % 5) === 0;
          ctx.fillStyle = lit ? '#e2e8f0' : (cx / 12) % 2 === 0 ? '#1d4ed8' : '#7f1d1d';
          ctx.fillRect(cx + crowdOff, cy, 7, 7);
        }
      }

      const L = 520;
      const Wd = 330;
      const corners = [proj(-L, -Wd), proj(L, -Wd), proj(L, Wd), proj(-L, Wd)];
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      corners.forEach((c, i) => (i === 0 ? ctx.moveTo(c.sx, c.sy) : ctx.lineTo(c.sx, c.sy)));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      const line = (pts) => {
        ctx.beginPath();
        pts.forEach(([x, z], i) => {
          const p = proj(x, z);
          if (i === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        });
        ctx.stroke();
      };
      line([[0, -Wd], [0, Wd]]);
      const circle = [];
      for (let k = 0; k <= 32; k++) circle.push([Math.cos((k / 32) * Math.PI * 2) * 80, Math.sin((k / 32) * Math.PI * 2) * 80]);
      line(circle);
      line([[-L, -150], [-L + 150, -150], [-L + 150, 150], [-L, 150]]);
      line([[L, -150], [L - 150, -150], [L - 150, 150], [L, 150]]);

      // Os 4 egos no gramado, desenhados do mais distante para o mais próximo
      const placed = cast
        .map((c) => ({ c, p: proj(c.pos[0], c.pos[1]) }))
        .sort((a, b) => b.p.depth - a.p.depth);
      placed.forEach(({ c, p }) => {
        const size = Math.max(60, (150 * f) / p.depth);
        ctx.save();
        ctx.translate(p.sx - size / 2, p.sy - size);
        window.PixelRenderer.drawCharacterSprite(ctx, c.char, size, size * 1.1, {
          facing: 'front',
          frame: this.sakugaFrame,
          showAura: true,
          auraColor: c.color
        });
        ctx.restore();
        ctx.font = '900 13px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = c.color;
        ctx.fillText(c.label, p.sx, p.sy - size - 6);
      });

      const closest = placed[placed.length - 1].c;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = 'italic 900 44px "Segoe UI", sans-serif';
      ctx.fillStyle = closest.color;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 12;
      ctx.fillText(closest.label, 40, stageH - 40);
      ctx.restore();
      this.drawSakugaBar(ctx, W, H, '🎬 FINAL WORLD CUP U-20 • JAPÃO vs FRANÇA', 'PARTE 2/4 • A CÂMERA GIRA PELO CAMPO', 'Quatro monstros esperam o apito no centro do mundo...');
    } else if (this.sakugaPhase === 2) {
      // "4 EGO'S" — impact frames preto e branco
      const flash = t < 24 && t % 6 < 3;
      ctx.fillStyle = flash ? '#ffffff' : '#050811';
      ctx.fillRect(0, 0, W, stageH);
      this.drawRadialSpeedLines(ctx, W / 2, stageH / 2, W, flash ? '#090d16' : '#00f5d4', 0.5);
      cast.forEach((c, i) => {
        const a = (i / 4) * Math.PI * 2 + t * 0.02;
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(W / 2 + Math.cos(a) * 120, stageH / 2 + Math.sin(a) * 120);
        ctx.lineTo(W / 2 + Math.cos(a) * W, stageH / 2 + Math.sin(a) * W);
        ctx.stroke();
      });
      const shake = t < 40 ? (Math.random() - 0.5) * 16 : 0;
      const sc = Math.min(1, t / 14) * (1.2 - Math.min(0.2, t * 0.004));
      ctx.save();
      ctx.translate(W / 2 + shake, stageH / 2 + shake);
      ctx.scale(sc, sc);
      ctx.textAlign = 'center';
      ctx.font = 'italic 900 150px "Segoe UI", sans-serif';
      ctx.fillStyle = flash ? '#090d16' : '#ffffff';
      ctx.shadowColor = '#00f5d4';
      ctx.shadowBlur = 30;
      ctx.fillText("4 EGO'S", 0, 50);
      ctx.restore();
      this.drawSakugaBar(ctx, W, H, '🎬 FINAL WORLD CUP U-20 • JAPÃO vs FRANÇA', "PARTE 3/4 • 4 EGO'S", 'Quatro egos absolutos dividindo o mesmo gramado.');
    } else {
      // Tela dividida em 4 partes: Você, Loki, Sae e Hugo
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, stageH);
      const pw = W / 4;
      const skew = 34;
      cast.forEach((c, i) => {
        const appear = Math.max(0, Math.min(1, (t - i * 22) / 18));
        if (appear <= 0) return;
        const slide = (1 - appear) * -stageH;
        const x0 = i * pw;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0 + skew + 4, 0);
        ctx.lineTo(x0 + pw + skew - 4, 0);
        ctx.lineTo(x0 + pw - skew - 4, stageH);
        ctx.lineTo(x0 - skew + 4, stageH);
        ctx.closePath();
        ctx.clip();
        ctx.translate(0, slide);
        const bg = ctx.createLinearGradient(0, 0, 0, stageH);
        bg.addColorStop(0, '#050811');
        bg.addColorStop(1, c.color);
        ctx.fillStyle = bg;
        ctx.fillRect(x0 - skew, 0, pw + skew * 2, stageH);
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let k = 0; k < 12; k++) {
          const ly = (k * 53 + this.sakugaFrame * 14) % stageH;
          ctx.beginPath();
          ctx.moveTo(x0 - skew, ly);
          ctx.lineTo(x0 + pw + skew, ly - 40);
          ctx.stroke();
        }
        ctx.restore();
        const zoom = 1 + Math.min(0.12, Math.max(0, t - i * 22) * 0.0006);
        const sw = 300 * zoom;
        ctx.translate(x0 + pw / 2 - sw / 2, stageH * 0.1);
        window.PixelRenderer.drawCharacterSprite(ctx, c.char, sw, sw * 1.15, {
          facing: 'front',
          frame: this.sakugaFrame + i * 9,
          showAura: true,
          auraColor: c.color
        });
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = appear;
        ctx.fillStyle = 'rgba(5, 8, 17, 0.85)';
        ctx.fillRect(x0 + 10, stageH - 82, pw - 20, 62);
        ctx.textAlign = 'center';
        ctx.fillStyle = c.color;
        ctx.font = 'italic 900 22px "Segoe UI", sans-serif';
        ctx.fillText(c.label.slice(0, 16), x0 + pw / 2, stageH - 52);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '700 11px "Segoe UI", sans-serif';
        ctx.fillText(c.role, x0 + pw / 2, stageH - 32);
        ctx.restore();
      });
      this.drawSakugaBar(ctx, W, H, "🎬 FINAL WORLD CUP U-20 • 4 EGO'S", 'PARTE 4/4 • VOCÊ • LOKI • SAE • HUGO', 'O apito vai soar. Só um ego vai reinar no topo do mundo!');
    }
  },

  // Desenha um personagem com os pés em (x, feetY)
  drawSprite(ctx, char, x, feetY, size, opts = {}) {
    ctx.save();
    ctx.translate(x - size / 2, feetY - size * 0.87);
    window.PixelRenderer.drawCharacterSprite(ctx, char, size, size * 1.1, Object.assign({ facing: 'front', frame: this.sakugaFrame }, opts));
    ctx.restore();
  },

  // Canvas auxiliar reaproveitado: só muda de tamanho quando precisa (recriar o
  // canvas a cada quadro deixava as cenas travando)
  // Só cresce (bonecos de tamanhos diferentes no mesmo quadro não realocam o canvas) e
  // limpa só a área que vai ser usada (w x h) — quem usa trabalha só nessa área
  scratchCanvas(key, w, h) {
    if (!this[key]) this[key] = document.createElement('canvas');
    const cv = this[key];
    if (cv.width < w || cv.height < h) {
      cv.width = Math.max(cv.width, w);
      cv.height = Math.max(cv.height, h);
    } else {
      cv.getContext('2d').clearRect(0, 0, w, h);
    }
    return cv;
  },

  // Desenha o boneco num canvas auxiliar COM MARGEM em volta (o cabelo espetado e a aura
  // passam da caixa do boneco; sem margem eles eram cortados e virava uma "moldura")
  // e devolve { cv, c2, ox, oy } para colar depois em (ox, oy)
  spriteToScratch(key, char, x, feetY, size, opts) {
    const pad = Math.ceil(size * 0.45);
    const w = Math.ceil(size) + pad * 2;
    const h = Math.ceil(size * 1.1) + pad * 2;
    const cv = this.scratchCanvas(key, w, h);
    const c2 = cv.getContext('2d');
    c2.save();
    c2.beginPath();
    c2.rect(0, 0, w, h);
    c2.clip();
    c2.translate(pad, pad);
    window.PixelRenderer.drawCharacterSprite(c2, char, size, size * 1.1, Object.assign({ facing: 'front', frame: this.sakugaFrame }, opts));
    c2.restore();
    return { cv, c2, w, h, ox: x - size / 2 - pad, oy: feetY - size * 0.87 - pad };
  },

  // Boneco escurecido / tingido (dim 0..1, tint = "r,g,b") SEM ctx.filter — o filtro em cima
  // de um boneco feito de centenas de retângulos é muito lento e travava as cutscenes
  // Feito com o "tint" do próprio PixelRenderer (pinta o boneco no tamanho pequeno da pixel
  // art antes de ampliar): o boneco normal + o mesmo boneco pintado de rgba(tint, dim) por cima.
  // Bem mais barato que pintar um canvas auxiliar do tamanho do boneco ampliado
  drawSpriteDim(ctx, char, x, feetY, size, opts = {}, dim = 0.5, tint = '0,0,0') {
    this.drawSprite(ctx, char, x, feetY, size, opts);
    if (dim > 0) this.drawSprite(ctx, char, x, feetY, size, Object.assign({}, opts, { tint: `rgba(${tint},${dim})`, showAura: false }));
  },

  // Sombra preta no rosto, estilo mangá (amount 0..1): o boneco vira preto da cabeça até
  // o queixo e a sombra some num degradê para baixo; só os pixels dele escurecem
  // solidTo / fadeTo: até onde (em unidades de 36 a partir do topo do boneco) a sombra é
  // sólida e onde ela termina. Padrão: até um pouco abaixo dos olhos, a boca aparece por
  // baixo (o Rin). No Fox (11.6 → 12.4) só o sorriso fica de fora.
  drawFaceShadow(ctx, char, x, feetY, size, opts = {}, amount = 0.9, solidTo = 11, fadeTo = 14.5) {
    if (amount <= 0.02) return;
    // A sombra de um boneco parado é sempre igual: fica guardada pronta (refazer o close
    // gigante todo quadro pesava ~20 ms)
    const key = `${char.name}|${Math.round(size)}|${solidTo}|${fadeTo}|${opts.animState || ''}|${opts.frame ?? 'x'}|${opts.flipX ? 1 : 0}`;
    if (!this._shadowCache) this._shadowCache = new Map();
    const pad = Math.ceil(size * 0.45);
    const cached = this._shadowCache.get(key);
    if (cached) {
      ctx.save();
      ctx.globalAlpha = amount;
      ctx.drawImage(cached, x - size / 2 - pad, feetY - size * 0.87 - pad);
      ctx.restore();
      return;
    }
    const { cv, c2, w, h, ox, oy } = this.spriteToScratch('_shadeCv', char, x, feetY, size, opts);
    const u = size / 36;
    const top = (w - Math.ceil(size)) / 2;
    c2.globalCompositeOperation = 'source-in';
    c2.fillStyle = '#000000';
    c2.fillRect(0, 0, w, h);
    c2.globalCompositeOperation = 'destination-in';
    // (alturas medidas no corpo antigo: SPRITE_MAPY leva para o boneco atual)
    const y4 = SPRITE_MAPY(4);
    const yF = SPRITE_MAPY(fadeTo);
    const fade = c2.createLinearGradient(0, top + y4 * u, 0, top + yF * u);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(Math.max(0, Math.min(1, (SPRITE_MAPY(solidTo) - y4) / (yF - y4))), 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    c2.fillStyle = fade;
    c2.fillRect(0, 0, w, h);
    c2.globalCompositeOperation = 'source-over';
    // Só guarda quando o boneco está parado num quadro fixo (frame informado)
    if (opts.frame !== undefined) {
      const keep = document.createElement('canvas');
      keep.width = w;
      keep.height = h;
      keep.getContext('2d').drawImage(cv, 0, 0, w, h, 0, 0, w, h);
      if (this._shadowCache.size > 16) this._shadowCache.delete(this._shadowCache.keys().next().value);
      this._shadowCache.set(key, keep);
    }
    ctx.save();
    ctx.globalAlpha = amount;
    ctx.drawImage(cv, 0, 0, w, h, ox, oy, w, h);
    ctx.restore();
  },

  // Personagem preenchido de uma cor só (silhueta do impact frame)
  drawSilhouette(ctx, char, x, feetY, size, opts, color) {
    this.drawSprite(ctx, char, x, feetY, size, Object.assign({}, opts, { tint: color, showAura: false }));
  },

  // Balão de texto estilo mangá
  drawMangaCaption(ctx, text, x, y, fontSize = 26, color = '#090d16', align = 'center') {
    ctx.save();
    ctx.font = `italic 900 ${fontSize}px "Segoe UI", sans-serif`;
    ctx.textAlign = align;
    const w = ctx.measureText(text).width + 28;
    const bx = align === 'center' ? x - w / 2 : x - 14;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 4;
    ctx.fillRect(bx, y - fontSize - 6, w, fontSize + 20);
    ctx.strokeRect(bx, y - fontSize - 6, w, fontSize + 20);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + 2);
    ctx.restore();
  },

  drawU20Scoreboard(ctx, home, away, minute, homeLabel = 'BLUE LOCK', awayLabel = 'U-20') {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 9, 18, 0.9)';
    ctx.fillRect(24, 20, 330, 40);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(24, 20, 6, 40);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(348, 20, 6, 40);
    ctx.font = '900 17px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(homeLabel.slice(0, 12), 40, 47);
    ctx.textAlign = 'right';
    ctx.fillText(awayLabel.slice(0, 10), 338, 47);
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.fillText(`${home} - ${away}`, 186, 47);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 12px "Segoe UI", sans-serif';
    ctx.fillText(minute, 186, 76);
    ctx.restore();
  },

  // Estádio Nacional à noite visto de lado (pan = deslocamento da câmera)
  drawU20Stadium(ctx, W, stageH, pan, horizonFrac = 0.46, sign = 'JFU JAPAN • BLUE LOCK vs U-20') {
    const hy = stageH * horizonFrac;
    const sky = ctx.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, '#020617');
    sky.addColorStop(1, '#0b1736');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, hy);

    // Torres de refletor
    [0.12, 0.38, 0.64, 0.9].forEach((fx) => {
      const lx = ((fx * W - pan * 0.25) % (W + 200) + W + 200) % (W + 200) - 100;
      const glow = ctx.createRadialGradient(lx, 40, 4, lx, 40, 120);
      glow.addColorStop(0, 'rgba(255,255,255,0.9)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(lx - 120, -80, 240, 240);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(lx - 3, 50, 6, hy - 200);
    });

    // Arquibancada lotada (vermelho/branco da Sub-20 e azul do Blue Lock)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, hy - 170, W, 170);
    const off = ((pan * 0.5) % 14 + 14) % 14;
    for (let y = hy - 162; y < hy - 22; y += 14) {
      for (let x = -14; x < W + 14; x += 14) {
        const col = Math.floor((x + pan * 0.5) / 14);
        const seed = (col * 31 + y * 7) % 11;
        ctx.fillStyle = seed === 0 && (this.sakugaFrame + col) % 9 < 2 ? '#ffffff' : seed < 4 ? '#dc2626' : seed < 7 ? '#e2e8f0' : '#1d4ed8';
        ctx.fillRect(x - off, y, 8, 8);
      }
    }
    // Placas de publicidade
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(0, hy - 20, W, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    const step = Math.max(320, ctx.measureText(sign).width + 60);
    for (let x = -((pan * 0.9) % step) - step; x < W; x += step) ctx.fillText(sign, x, hy - 6);

    // Gramado com faixas
    for (let i = 0; i < 8; i++) {
      const y0 = hy + (stageH - hy) * ((i / 8) ** 1.4);
      const y1 = hy + (stageH - hy) * (((i + 1) / 8) ** 1.4);
      ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#166534';
      ctx.fillRect(0, y0, W, y1 - y0 + 1);
    }
  },

  // Rede do gol vista de frente, estufando em volta do ponto (hitX, hitY)
  drawStretchNet(ctx, gx0, gy0, gx1, gy1, hitX, hitY, stretch) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    const cols = 22;
    const rows = 12;
    const pt = (c, r) => {
      const nx = gx0 + (c / cols) * (gx1 - gx0);
      const ny = gy0 + (r / rows) * (gy1 - gy0);
      const pull = Math.max(0, 1 - Math.hypot(nx - hitX, ny - hitY) / 260) * stretch;
      return { x: nx + (nx - hitX) * pull * -0.004, y: ny + (ny - hitY) * pull * -0.004 - pull * 0.3 };
    };
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        const p = pt(c, r);
        if (c === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      for (let r = 0; r <= rows; r++) {
        const p = pt(c, r);
        if (r === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(gx0, gy1);
    ctx.lineTo(gx0, gy0);
    ctx.lineTo(gx1, gy0);
    ctx.lineTo(gx1, gy1);
    ctx.stroke();
    ctx.restore();
  },

  // ========================================================================
  // GOL GARANTIDO DO ROTEIRO (4 CENAS) — usado quando o placar da lore
  // precisa acontecer (ex: 3 x 3 contra a Sub-20). Quem chuta usa a própria
  // habilidade: arrancada → close com o nome do golpe → impact frame → rede.
  // cfg: { shooter, shooterName, defender, keeper, team: 'home'|'away',
  //        skillName, weaponName, skillColor, homeBefore, awayBefore,
  //        homeAfter, awayAfter, minute, homeLabel, awayLabel, sign }
  // ========================================================================
  playShotCutscene(cfg, onComplete) {
    this.shotCfg = cfg;
    this.playActionSakuga('scripted_shot', onComplete);
  },

  drawScriptedShot(ctx, W, H) {
    const c = this.shotCfg;
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const lerp = (a, b, k) => a + (b - a) * k;
    const color = c.skillColor || '#00f5d4';
    const who = c.shooterName.toUpperCase();
    // O time da casa ataca para a direita; o rival vem da direita para a esquerda
    const flip = c.team === 'away';
    const dir = flip ? -1 : 1;
    const X = (x) => (flip ? W - x : x);
    const goalColor = c.team === 'home' ? '#00f5d4' : '#ef4444';
    const tags = [
      { tag: 'CENA 1/4 • A ARRANCADA', sub: `${c.shooterName} recebe livre e parte para cima da defesa!` },
      { tag: `CENA 2/4 • ${c.weaponName.toUpperCase()}`, sub: `"${c.skillName}" — a habilidade assinatura de ${c.shooterName}!` },
      { tag: 'CENA 3/4 • IMPACTO!', sub: 'O tempo congela no momento do chute...' },
      { tag: `CENA 4/4 • GOL! ${c.homeAfter} x ${c.awayAfter}`, sub: c.team === 'home' ? 'A rede estufa! Seu time marca!' : 'A rede estufa... o rival marca!' }
    ];
    ctx.clearRect(0, 0, W, H);
    // Nada da cena invade a barra de legenda embaixo
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();

    if (this.sakugaPhase === 0) {
      const feet = stageH * 0.88;
      this.drawU20Stadium(ctx, W, stageH, t * 1.6 * dir, 0.46, c.sign);
      const sx = X(lerp(W * 0.08, W * 0.46, ease(t / 100)));
      this.drawSprite(ctx, c.defender, X(lerp(W * 1.05, W * 0.68, ease(t / 90))), feet + 8, 200, { animState: t > 72 ? 'slide' : 'run', flipX: !flip });
      this.drawSprite(ctx, c.shooter, sx, feet, 240, { animState: 'run', flipX: flip, showAura: t > 50, auraColor: color });
      this.drawAnimeBall(ctx, sx + dir * 70, feet - 16, 18, '#ffffff', t);
      this.drawU20Scoreboard(ctx, c.homeBefore, c.awayBefore, c.minute, c.homeLabel, c.awayLabel);
      this.drawMangaCaption(ctx, `${who} ARRANCA!`, W * 0.62, 70, 26);
    } else if (this.sakugaPhase === 1) {
      // Close no atacante com o nome da habilidade sendo "escrito" na tela
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, stageH);
      this.drawRadialSpeedLines(ctx, X(W * 0.3), stageH * 0.45, W, color, 0.4);
      const size = lerp(420, 540, ease(t / 70));
      this.drawSprite(ctx, c.shooter, X(W * 0.27), stageH + size * 0.32, size, { animState: 'windup', flipX: flip, showAura: true, auraColor: color });

      const name = c.skillName.toUpperCase();
      const shown = name.slice(0, Math.max(0, Math.floor((t - 12) * 0.7)));
      if (shown) {
        ctx.save();
        ctx.translate(X(W * 0.7), stageH * 0.44);
        ctx.rotate(-0.07 * dir);
        let fs = 64;
        ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
        while (fs > 26 && ctx.measureText(name).width > W * 0.5) {
          fs -= 4;
          ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
        }
        ctx.textAlign = 'center';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#020617';
        ctx.strokeText(shown, 0, 0);
        ctx.fillStyle = color;
        ctx.fillText(shown, 0, 0);
        ctx.font = '900 18px "Segoe UI", sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(`⚡ ${c.weaponName}`, 0, 40);
        ctx.restore();
      }
      this.drawMangaCaption(ctx, `${who}!!`, X(W * 0.3), 70, 28);
    } else if (this.sakugaPhase === 2) {
      if (t < 55) {
        // Impact frame preto e branco piscando
        const inv = t < 14 && t % 4 < 2;
        const fg = inv ? '#ffffff' : '#090d16';
        ctx.fillStyle = inv ? '#090d16' : '#ffffff';
        ctx.fillRect(0, 0, W, stageH);
        this.drawRadialSpeedLines(ctx, X(W * 0.6), stageH * 0.6, W, fg, 0.9);
        this.drawSilhouette(ctx, c.shooter, X(W * 0.4), stageH * 0.98, 440, { animState: 'shoot', flipX: flip }, fg);
        for (let r = 1; r <= 3; r++) {
          ctx.strokeStyle = fg;
          ctx.lineWidth = 7 - r * 2;
          ctx.beginPath();
          ctx.ellipse(X(W * 0.62), stageH * 0.6, t * r * 4, t * r * 2, 0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
        this.drawAnimeBall(ctx, X(W * 0.62), stageH * 0.6, 34, color, t);
        ctx.save();
        ctx.translate(X(W * 0.82), stageH * 0.3);
        ctx.rotate(-0.15 * dir);
        ctx.font = 'italic 900 110px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = fg;
        ctx.fillText('DOM!!', 0, 0);
        ctx.restore();
      } else {
        // Câmera colada na bola: marcador e goleiro ficam para trás
        const u = t - 55;
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, W, stageH);
        this.drawSpeedLines(ctx, W, stageH, color, 0.6);
        this.drawSpeedLines(ctx, W, stageH, '#facc15', 0.25);
        ctx.save();
        ctx.globalAlpha = 0.85;
        this.drawSprite(ctx, c.defender, X(lerp(W * 1.1, -W * 0.2, u / 40)), stageH * 0.98, 280, { animState: 'slide', flipX: !flip });
        this.drawSprite(ctx, c.keeper, X(lerp(W * 1.3, -W * 0.1, u / 55)), stageH * 0.72, 280, { animState: 'dive', flipX: !flip });
        ctx.restore();
        const shake = (Math.random() - 0.5) * 8;
        this.drawAnimeBall(ctx, W * 0.5 + shake, stageH * 0.48 + shake, 72, color, t * 2.5);
      }
    } else {
      // A bola estufa a rede, o placar muda e o atacante comemora
      const hit = 22;
      const isHit = t >= hit;
      const shakeAmt = isHit && t < 60 ? (Math.random() - 0.5) * 14 : 0;
      ctx.save();
      ctx.translate(shakeAmt, shakeAmt);
      this.drawU20Stadium(ctx, W, stageH, 900, 0.42, c.sign);
      const gx0 = W * 0.18;
      const gx1 = W * 0.82;
      const gy0 = stageH * 0.22;
      const gy1 = stageH * 0.86;
      const hitX = X(W * 0.7);
      const hitY = stageH * 0.36;
      const stretch = isHit ? Math.min(60, (t - hit) * 4) * Math.max(0.35, 1 - (t - hit) / 160) : 0;
      this.drawStretchNet(ctx, gx0, gy0, gx1, gy1, hitX, hitY, stretch);
      this.drawSprite(ctx, c.keeper, X(W * 0.38), gy1 + 10, 230, { animState: 'dive', flipX: flip });
      const ballX = isHit ? hitX + Math.sin(t * 0.7) * 3 : lerp(W * 0.5, hitX, t / hit);
      const ballY = isHit ? hitY + stretch * 0.15 : lerp(stageH * 1.05, hitY, t / hit);
      this.drawAnimeBall(ctx, ballX, ballY, isHit ? 30 : 40, color, t * 2);
      ctx.restore();

      if (t >= hit && t < hit + 6) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, stageH);
      }
      if (t > 60) {
        const rise = ease((t - 60) / 35);
        this.drawSprite(ctx, c.shooter, X(W * 0.82), lerp(stageH + 380, stageH + 30, rise), 360, { animState: 'call_pass', flipX: flip, showAura: true, auraColor: color });
      }
      if (isHit) {
        const pop = Math.min(1, (t - hit) / 12);
        ctx.save();
        ctx.translate(W * 0.5, stageH * 0.19);
        ctx.scale(0.6 + pop * 0.4, 0.6 + pop * 0.4);
        ctx.font = 'italic 900 90px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = goalColor;
        ctx.shadowColor = '#020617';
        ctx.shadowBlur = 18;
        ctx.fillText(c.team === 'home' ? 'GOOOOOL!!' : 'GOL DO RIVAL!', 0, 0);
        ctx.restore();
      }
      const flipped = t > hit + 25;
      this.drawU20Scoreboard(ctx, flipped ? c.homeAfter : c.homeBefore, flipped ? c.awayAfter : c.awayBefore, c.minute, c.homeLabel, c.awayLabel);
    }

    ctx.restore();
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, `🎬 GOL GARANTIDO • ${c.shooterName.toUpperCase()}`, info.tag, info.sub);
  },

  // ========================================================================
  // INTERLÚDIO DA ESPANHA (antes da Copa): o envelope do Ego, a viagem de avião e
  // o clássico Barcha x Re Al em que o Bunny provoca o Sae. Tocados por falas
  // { cinematic: 'ego_ticket' | 'spain_flight' | 'clasico_bunny' } (STORY_INTERLUDES).
  // ========================================================================
  spainCast() {
    const find = (id) => (window.BLUE_LOCK_CHARACTERS || []).find((c) => c.id === id) || this.getSpeakerCharData(id);
    const barcha = window.NEL_CLUBS?.barcha || { color: '#7f1d1d', secondary: '#1e40af' };
    const barchaKit = { jerseyPrimary: barcha.color, jerseySecondary: barcha.secondary };
    const realKit = { jerseyPrimary: '#f8fafc', jerseySecondary: '#a78bfa' };
    return {
      you: this.getSpeakerCharData('VOCÊ'),
      traveler: Object.assign({}, this.getSpeakerCharData('VOCÊ'), { outfit: 'casual', clothesColor: '#1e3a5f' }),
      ego: this.getSpeakerCharData('JINPACHI EGO'),
      bunny: Object.assign({}, find('bunny'), barchaKit),
      lavinho: Object.assign({}, find('lavinho'), barchaKit),
      sae: Object.assign({}, find('sae'), realKit),
      luna: Object.assign({}, find('luna'), realKit)
    };
  },

  // Avião visto de lado (x,y = centro da fuselagem; dir 1 = bico para a direita)
  drawPlane(ctx, x, y, sc, dir = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc * dir, sc);
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(-40, 6);
    ctx.lineTo(30, 70);
    ctx.lineTo(60, 70);
    ctx.lineTo(30, 6);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, 0, 200, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-150, -10);
    ctx.lineTo(-205, -95);
    ctx.lineTo(-170, -95);
    ctx.lineTo(-110, -14);
    ctx.fill();
    ctx.fillStyle = '#00b4d8';
    ctx.fillRect(-190, 4, 360, 8);
    ctx.beginPath();
    ctx.moveTo(-195, -90);
    ctx.lineTo(-172, -90);
    ctx.lineTo(-150, -50);
    ctx.lineTo(-178, -50);
    ctx.fill();
    // O logo desfaz o espelhamento para não sair ao contrário quando o avião vira
    ctx.save();
    ctx.translate(-176, -58);
    ctx.scale(dir, 1);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 20px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BL', 0, 0);
    ctx.restore();
    ctx.fillStyle = '#0f172a';
    for (let i = -130; i < 140; i += 22) ctx.fillRect(i, -12, 10, 10);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(168, -12);
    ctx.lineTo(196, -2);
    ctx.lineTo(176, -2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(130, -24, 18, 30);
    ctx.restore();
  },

  drawEgoTicket(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const lerp = (a, b, k) => a + (b - a) * k;
    const cast = this.spainCast();
    const pName = (window.App?.state?.profile?.name || 'VOCÊ').toUpperCase();
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    if (this.sakugaPhase === 0) {
      // A sala de monitores: o Ego atrás da mesa desliza um envelope preto até você
      this.drawBgMonitorRoom(ctx, W, stageH);
      ctx.fillStyle = 'rgba(2,6,23,0.45)';
      ctx.fillRect(0, 0, W, stageH);
      this.drawSprite(ctx, cast.ego, W * 0.62, stageH * 0.86, 380, { animState: 'idle' });
      const deskY = stageH * 0.66;
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, deskY, W, stageH - deskY);
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, deskY, W, 10);
      const k = ease((t - 30) / 80);
      const ex = lerp(W * 0.6, W * 0.32, k);
      const ey = lerp(deskY + 30, deskY + 70, k);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(ex - 90, ey - 30, 180, 60);
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(ex - 90, ey - 30, 180, 60);
      ctx.fillStyle = '#00f5d4';
      ctx.beginPath();
      ctx.arc(ex, ey, 9, 0, Math.PI * 2);
      ctx.fill();
      if (t > 95) this.drawMangaCaption(ctx, 'Para você.', W * 0.74, stageH * 0.2, 28);
    } else {
      // Close: o envelope abre e saem a passagem e o ingresso do clássico
      ctx.fillStyle = '#04070f';
      ctx.fillRect(0, 0, W, stageH);
      const g = ctx.createRadialGradient(W / 2, stageH * 0.5, 10, W / 2, stageH * 0.5, W * 0.5);
      g.addColorStop(0, 'rgba(0,245,212,0.25)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, stageH);
      const cx = W * 0.5;
      const cy = stageH * 0.62;
      // Aba do envelope abrindo para cima (fica atrás da passagem)
      ctx.fillStyle = '#111827';
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 290, cy);
      ctx.lineTo(cx, cy - 150 * Math.min(1, t / 25));
      ctx.lineTo(cx + 290, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Passagem
      const up = ease((t - 25) / 60);
      const px = cx - 260;
      const py = cy - 40 - up * 190;
      ctx.save();
      ctx.translate(px, py);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 520, 200);
      ctx.fillStyle = '#00b4d8';
      ctx.fillRect(0, 0, 520, 40);
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 18px "Segoe UI", sans-serif';
      ctx.fillText('BLUE LOCK AIRLINES • CARTÃO DE EMBARQUE', 16, 27);
      ctx.font = 'italic 900 52px "Segoe UI", sans-serif';
      ctx.fillText('HND ✈ BCN', 16, 104);
      ctx.font = '700 14px "Segoe UI", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('TÓQUIO → BARCELONA', 18, 128);
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 15px "Segoe UI", sans-serif';
      ctx.fillText(`PASSAGEIRO: ${pName}`, 18, 160);
      ctx.fillText('VOO BL-011 • ASSENTO 11A • EMBARQUE 06:00', 18, 184);
      for (let i = 0; i < 26; i++) ctx.fillRect(390 + i * 4.5, 60, i % 3 ? 2 : 3, 120);
      ctx.restore();
      // Ingresso do clássico
      const side = ease((t - 85) / 50);
      if (side > 0) {
        ctx.save();
        ctx.translate(lerp(cx - 60, cx + 120, side), cy - 120 - side * 40);
        ctx.rotate(0.08);
        const tg = ctx.createLinearGradient(0, 0, 340, 0);
        tg.addColorStop(0, '#7f1d1d');
        tg.addColorStop(1, '#1e40af');
        ctx.fillStyle = tg;
        ctx.fillRect(0, 0, 340, 130);
        ctx.fillStyle = '#facc15';
        ctx.font = 'italic 900 34px "Segoe UI", sans-serif';
        ctx.fillText('EL CLÁSICO', 16, 46);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '800 16px "Segoe UI", sans-serif';
        ctx.fillText('FC BARCHA x RE AL', 18, 78);
        ctx.fillText('ESTADI BARCHA • 21:00', 18, 104);
        ctx.restore();
      }
      // Frente do envelope (por cima da parte de baixo da passagem)
      ctx.fillStyle = '#090d16';
      ctx.fillRect(cx - 290, cy, 580, 180);
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - 290, cy, 580, 180);
      ctx.fillStyle = '#00f5d4';
      ctx.font = '900 22px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BLUE LOCK', cx, cy + 110);
      ctx.textAlign = 'left';
    }
    ctx.restore();
    const tags = [
      { tag: 'CENA 1/2 • A SALA DO EGO', sub: 'O Ego empurra um envelope preto pela mesa.' },
      { tag: 'CENA 2/2 • O ENVELOPE', sub: 'Uma passagem para Barcelona e um ingresso para o clássico.' }
    ];
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '✈ INTERLÚDIO • A VIAGEM PARA A ESPANHA', info.tag, info.sub);
  },

  drawSpainFlight(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const lerp = (a, b, k) => a + (b - a) * k;
    const cast = this.spainCast();
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    if (this.sakugaPhase === 0) {
      // Haneda ao amanhecer: você sobe a escada do avião
      const sky = ctx.createLinearGradient(0, 0, 0, stageH * 0.7);
      sky.addColorStop(0, '#1e1b4b');
      sky.addColorStop(0.6, '#7c2d12');
      sky.addColorStop(1, '#f97316');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, stageH);
      ctx.fillStyle = 'rgba(253,224,71,0.9)';
      ctx.beginPath();
      ctx.arc(W * 0.85, stageH * 0.68, 50, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, stageH * 0.68, W, stageH * 0.32);
      ctx.fillStyle = '#facc15';
      for (let x = 0; x < W; x += 120) ctx.fillRect(x, stageH * 0.84, 60, 6);
      this.drawPlane(ctx, W * 0.62, stageH * 0.5, 1.6, -1);
      // Escada até a porta (perto do bico, à esquerda)
      const doorX = W * 0.62 - 150 * 1.6;
      const doorY = stageH * 0.5 - 14;
      const footX = doorX - 150;
      const footY = stageH * 0.9;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(footX, footY);
      ctx.lineTo(doorX, doorY + 40);
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(doorX - 18, doorY - 30, 36, 70);
      // Andando até a escada e subindo
      let yx;
      let yy;
      if (t < 80) {
        yx = lerp(-60, footX, ease(t / 80));
        yy = footY + 10;
      } else {
        const k = Math.min(1, (t - 80) / 70);
        yx = lerp(footX, doorX, k);
        yy = lerp(footY + 10, doorY + 44, k);
      }
      if (t < 160) this.drawSprite(ctx, cast.traveler, yx, yy, 150, { animState: 'run', facing: t < 80 ? 'front' : 'back' });
      this.drawMangaCaption(ctx, 'AEROPORTO DE HANEDA • 06:00 • PORTÃO 11', W * 0.32, 60, 22);
    } else if (this.sakugaPhase === 1) {
      // Acima das nuvens, com o mapa da rota
      const sky = ctx.createLinearGradient(0, 0, 0, stageH);
      sky.addColorStop(0, '#0c4a6e');
      sky.addColorStop(1, '#7dd3fc');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, stageH);
      ctx.fillStyle = 'rgba(255,251,235,0.9)';
      ctx.beginPath();
      ctx.arc(W * 0.15, stageH * 0.2, 46, 0, Math.PI * 2);
      ctx.fill();
      for (let layer = 0; layer < 3; layer++) {
        const yb = stageH * (0.62 + layer * 0.13);
        const sp = 1.5 + layer * 1.8;
        ctx.fillStyle = `rgba(255,255,255,${0.55 + layer * 0.15})`;
        for (let i = 0; i < 8; i++) {
          const x = ((i * 260 - t * sp) % (W + 300) + W + 300) % (W + 300) - 150;
          ctx.beginPath();
          ctx.ellipse(x, yb, 130, 34, 0, 0, Math.PI * 2);
          ctx.ellipse(x + 70, yb - 18, 80, 30, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      this.drawPlane(ctx, W * 0.45, stageH * 0.42 + Math.sin(t * 0.06) * 8, 0.9, -1);
      // Mapa: Tóquio → Barcelona com o aviãozinho andando no arco
      const mx = W * 0.62;
      const my = 30;
      const mw = W * 0.34;
      const mh = 150;
      ctx.fillStyle = 'rgba(2,6,23,0.8)';
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(mx, my, mw, mh);
      const a = { x: mx + mw * 0.88, y: my + mh * 0.6 };
      const b = { x: mx + mw * 0.12, y: my + mh * 0.62 };
      const ctrl = { x: mx + mw * 0.5, y: my + mh * 0.05 };
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y, b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const k = ease(t / 140);
      const qx = (1 - k) * (1 - k) * a.x + 2 * (1 - k) * k * ctrl.x + k * k * b.x;
      const qy = (1 - k) * (1 - k) * a.y + 2 * (1 - k) * k * ctrl.y + k * k * b.y;
      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 13px "Segoe UI", sans-serif';
      ctx.fillText('TÓQUIO', a.x - 30, a.y + 24);
      ctx.fillText('BARCELONA', b.x - 20, b.y + 24);
      ctx.font = '22px "Segoe UI", sans-serif';
      ctx.fillText('✈', qx - 10, qy + 8);
      this.drawMangaCaption(ctx, '14 horas de voo...', W * 0.25, stageH * 0.92, 24);
    } else {
      // Barcelona: o avião pousa, você desce a escada e se espreguiça no sol
      const sky = ctx.createLinearGradient(0, 0, 0, stageH * 0.7);
      sky.addColorStop(0, '#38bdf8');
      sky.addColorStop(1, '#bae6fd');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, stageH);
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(W * 0.82, stageH * 0.16, 44, 0, Math.PI * 2);
      ctx.fill();
      // Silhueta da cidade: torres pontudas de basílica, prédios e palmeiras
      ctx.fillStyle = '#c4a484';
      for (let i = 0; i < 14; i++) {
        const bw = 50 + (i % 3) * 22;
        const bh = 50 + ((i * 37) % 70);
        ctx.fillRect(i * (W / 13), stageH * 0.66 - bh, bw, bh);
      }
      ctx.fillStyle = '#a8805c';
      [0.36, 0.4, 0.44, 0.48].forEach((fx, i) => {
        const th = 150 + (i === 1 || i === 2 ? 50 : 0);
        ctx.beginPath();
        ctx.moveTo(W * fx - 14, stageH * 0.66);
        ctx.lineTo(W * fx, stageH * 0.66 - th);
        ctx.lineTo(W * fx + 14, stageH * 0.66);
        ctx.fill();
      });
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, stageH * 0.66, W, stageH * 0.34);
      ctx.fillStyle = '#f8fafc';
      for (let x = 0; x < W; x += 120) ctx.fillRect(x, stageH * 0.8, 60, 5);
      // O avião chega taxiando da direita com o bico para a esquerda e para
      const roll = ease(t / 70);
      const planeX = lerp(W * 1.3, W * 0.6, roll);
      this.drawPlane(ctx, planeX, stageH * 0.56, 1.2, -1);
      if (t > 80) {
        const doorX = planeX - 150 * 1.2;
        const k = Math.min(1, (t - 85) / 60);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(doorX - 110, stageH * 0.9);
        ctx.lineTo(doorX, stageH * 0.56 + 30);
        ctx.stroke();
        const yx = lerp(doorX, doorX - 110, k);
        const yy = lerp(stageH * 0.56 + 34, stageH * 0.92, k);
        this.drawSprite(ctx, cast.traveler, yx, yy, 140, { animState: k >= 1 ? 'call_pass' : 'run' });
      }
      if (t > 40) {
        const k = ease((t - 40) / 30);
        ctx.save();
        ctx.globalAlpha = k;
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(W * 0.06, 40, 420 * k, 14);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(W * 0.06, 54, 420 * k, 14);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(W * 0.06, 68, 420 * k, 14);
        ctx.font = 'italic 900 46px "Segoe UI", sans-serif';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#020617';
        ctx.strokeText('BARCELONA, ESPANHA', W * 0.06, 136);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('BARCELONA, ESPANHA', W * 0.06, 136);
        ctx.restore();
      }
    }
    ctx.restore();
    const tags = [
      { tag: 'CENA 1/3 • EMBARQUE', sub: 'Mochila nas costas. A primeira vez saindo do Japão.' },
      { tag: 'CENA 2/3 • O VOO', sub: 'Tóquio → Barcelona. Do outro lado do mundo, os monstros estão jogando.' },
      { tag: 'CENA 3/3 • ESPANHA', sub: 'Sol, calor e o cheiro de futebol em cada esquina.' }
    ];
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '✈ INTERLÚDIO • A VIAGEM PARA A ESPANHA', info.tag, info.sub);
  },

  drawClasicoBunny(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const lerp = (a, b, k) => a + (b - a) * k;
    const cast = this.spainCast();
    const pink = '#f43f5e';
    const sign = 'EL CLÁSICO • FC BARCHA x RE AL';
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    if (this.sakugaPhase === 0) {
      // Frente a frente no meio de campo
      this.drawU20Stadium(ctx, W, stageH, t * 0.4, 0.46, sign);
      const feet = stageH * 0.92;
      this.drawSprite(ctx, cast.bunny, lerp(W * 0.12, W * 0.34, ease(t / 50)), feet, 300, { animState: 'idle' });
      this.drawSprite(ctx, cast.sae, lerp(W * 0.88, W * 0.66, ease(t / 50)), feet, 300, { animState: 'idle', flipX: true });
      this.drawU20Scoreboard(ctx, 0, 0, "12'", 'BARCHA', 'RE AL');
      if (t > 35) this.drawMangaCaption(ctx, 'Ei, Sae! O estádio veio me ver. Você é só o figurante.', W * 0.38, stageH * 0.22, 20);
      if (t > 110) this.drawMangaCaption(ctx, '...Fala demais.', W * 0.7, stageH * 0.36, 22);
    } else if (this.sakugaPhase === 1) {
      // O Bunny brinca: calcanhar no marcador e passe sem olhar
      this.drawU20Stadium(ctx, W, stageH, t * 2.2, 0.46, sign);
      this.drawSpeedLines(ctx, W, stageH, pink, 0.25);
      const feet = stageH * 0.9;
      const bx = lerp(W * 0.1, W * 0.72, ease(t / 120));
      const flick = t > 60 && t < 95;
      // O marcador do Re Al vem no bote e cai quando o calcanhar passa por cima dele
      this.drawSprite(ctx, cast.luna, t > 75 ? W * 0.5 : lerp(W * 0.7, W * 0.52, ease(t / 70)), feet + 6, 230, { animState: t > 75 ? 'dive' : 'run', flipX: true });
      this.drawSprite(ctx, cast.bunny, bx, feet, 260, { animState: flick ? 'rabona' : 'run', showAura: t > 55, auraColor: pink });
      if (t < 120) {
        const ballX = flick ? bx - 20 + (t - 60) * 2 : bx + 40;
        const ballY = flick ? feet - 60 - Math.sin(((t - 60) / 35) * Math.PI) * 70 : feet - 14;
        this.drawAnimeBall(ctx, ballX, ballY, 16, pink, t);
      } else {
        // Passe de calcanhar para trás, sem olhar, até o Lavinho chegando
        const k = ease((t - 120) / 40);
        this.drawSprite(ctx, cast.lavinho, lerp(-W * 0.1, W * 0.22, k), feet, 240, { animState: 'run' });
        this.drawAnimeBall(ctx, lerp(bx - 30, W * 0.26, k), feet - 14, 16, '#facc15', t);
      }
      if (t > 62 && t < 115) this.drawMangaCaption(ctx, 'CALCANHAR!!', W * 0.7, stageH * 0.18, 40);
      if (t > 122) this.drawMangaCaption(ctx, 'PASSE SEM OLHAR!', W * 0.62, stageH * 0.18, 34);
    } else if (this.sakugaPhase === 2) {
      // Tela dividida: o sorriso do Bunny x o olhar frio do Sae
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, stageH);
      const half = (pts, color, draw) => {
        ctx.save();
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(0, 0, W, stageH);
        ctx.globalAlpha = 1;
        draw();
        ctx.restore();
      };
      half([[0, 0], [W * 0.58, 0], [W * 0.42, stageH], [0, stageH]], pink, () => {
        this.drawRadialSpeedLines(ctx, W * 0.24, stageH * 0.5, W, pink, 0.4);
        this.drawSprite(ctx, cast.bunny, W * 0.24, stageH + 150, 460, { animState: 'call_pass', showAura: true, auraColor: pink });
      });
      half([[W * 0.58, 0], [W, 0], [W, stageH], [W * 0.42, stageH]], '#0d9488', () => {
        this.drawSprite(ctx, cast.sae, W * 0.76, stageH + 150, 460, { animState: 'idle', flipX: true });
      });
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(W * 0.58, 0);
      ctx.lineTo(W * 0.42, stageH);
      ctx.stroke();
      if (t > 15) this.drawMangaCaption(ctx, 'O seu futebol é perfeito, Sae. O meu é melhor.', W * 0.27, 60, 21);
      if (t > 85) this.drawMangaCaption(ctx, 'Ganha primeiro. Depois fala.', W * 0.74, stageH * 0.16, 22);
    } else {
      // O Lavinho finaliza, a rede estufa e o Bunny aponta para o Sae
      const hit = 30;
      const isHit = t >= hit;
      const shakeAmt = isHit && t < 60 ? (Math.random() - 0.5) * 12 : 0;
      ctx.save();
      ctx.translate(shakeAmt, shakeAmt);
      this.drawU20Stadium(ctx, W, stageH, 900, 0.42, sign);
      const gx0 = W * 0.2;
      const gx1 = W * 0.8;
      const gy0 = stageH * 0.22;
      const gy1 = stageH * 0.84;
      const hitX = W * 0.32;
      const hitY = stageH * 0.38;
      const stretch = isHit ? Math.min(60, (t - hit) * 4) * Math.max(0.35, 1 - (t - hit) / 160) : 0;
      this.drawStretchNet(ctx, gx0, gy0, gx1, gy1, hitX, hitY, stretch);
      this.drawSprite(ctx, Object.assign({}, cast.luna, { jerseyPrimary: '#334155' }), W * 0.62, gy1 + 10, 220, { animState: 'dive', flipX: true });
      const ballX = isHit ? hitX + Math.sin(t * 0.7) * 3 : lerp(W * 0.5, hitX, t / hit);
      const ballY = isHit ? hitY + stretch * 0.15 : lerp(stageH * 1.05, hitY, t / hit);
      this.drawAnimeBall(ctx, ballX, ballY, isHit ? 28 : 38, '#facc15', t * 2);
      ctx.restore();
      if (t >= hit && t < hit + 6) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, stageH);
      }
      if (isHit) {
        ctx.save();
        ctx.translate(W * 0.5, stageH * 0.18);
        const pop = Math.min(1, (t - hit) / 12);
        ctx.scale(0.6 + pop * 0.4, 0.6 + pop * 0.4);
        ctx.font = 'italic 900 80px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#020617';
        ctx.shadowBlur = 18;
        ctx.fillText('GOL DO BARCHA!', 0, 0);
        ctx.restore();
      }
      if (t > 70) {
        const rise = ease((t - 70) / 30);
        this.drawSprite(ctx, cast.bunny, W * 0.84, lerp(stageH + 360, stageH + 40, rise), 340, { animState: 'call_pass', flipX: true, showAura: true, auraColor: pink });
        if (t > 100) this.drawMangaCaption(ctx, 'Viu, Sae? Esse campo gira em volta de MIM.', W * 0.6, stageH * 0.48, 21);
      }
      this.drawU20Scoreboard(ctx, t > hit + 25 ? 1 : 0, 0, "67'", 'BARCHA', 'RE AL');
    }
    ctx.restore();
    const tags = [
      { tag: 'CENA 1/4 • FRENTE A FRENTE', sub: 'Bunny Iglesias (FC Barcha) x Sae Itoshi (Re Al).' },
      { tag: 'CENA 2/4 • O SHOW DO BUNNY', sub: 'Calcanhar, passe sem olhar: ele joga para o estádio olhar para ele.' },
      { tag: 'CENA 3/4 • A PROVOCAÇÃO', sub: 'O ego de um contra o olhar frio do outro.' },
      { tag: 'CENA 4/4 • O ESTÁDIO EXPLODE', sub: 'O passe do Bunny vira gol do Lavinho.' }
    ];
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '⚽ EL CLÁSICO • FC BARCHA x RE AL', info.tag, info.sub);
  },

  // ========================================================================
  // FLASHBACK DA PROMESSA (final contra a França, só quando a França está perdendo):
  // Paris anos atrás em sépia (Loki e Hugo crianças trocando passes) → os dois no
  // muro prometendo ganhar a Copa juntos → de volta ao presente: "A FRANÇA DESPERTA!"
  // ========================================================================
  drawLokiHugoPromise(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const find = (id) => (window.BLUE_LOCK_CHARACTERS || []).find((c) => c.id === id) || this.getSpeakerCharData(id);
    const france = { jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff' };
    const kidLoki = Object.assign({}, find('loki'), { hairStyle: 'loki_kid', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff' });
    const kidHugo = Object.assign({}, find('hugo'), { jerseyPrimary: '#f8fafc', jerseySecondary: '#1e3a8a' });
    const loki = Object.assign({}, find('loki'), france);
    const hugo = Object.assign({}, find('hugo'), france);
    // Lembrança: tom sépia, vinheta e grão de filme
    const memory = () => {
      ctx.fillStyle = 'rgba(120,72,24,0.3)';
      ctx.fillRect(0, 0, W, stageH);
      const vig = ctx.createRadialGradient(W / 2, stageH / 2, W * 0.25, W / 2, stageH / 2, W * 0.75);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(40,20,5,0.75)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, stageH);
      ctx.fillStyle = 'rgba(255,240,210,0.18)';
      for (let i = 0; i < 70; i++) ctx.fillRect(((i * 137 + this.sakugaFrame * 31) % W), ((i * 89 + this.sakugaFrame * 17) % stageH), 2, 2);
    };
    const sunset = () => {
      const sky = ctx.createLinearGradient(0, 0, 0, stageH);
      sky.addColorStop(0, '#7c2d12');
      sky.addColorStop(0.55, '#f59e0b');
      sky.addColorStop(1, '#fde68a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, stageH);
    };
    // Torre Eiffel em silhueta
    const eiffel = (x, base, h) => {
      ctx.fillStyle = '#3b2412';
      ctx.beginPath();
      ctx.moveTo(x - h * 0.22, base);
      ctx.quadraticCurveTo(x - h * 0.06, base - h * 0.45, x - h * 0.02, base - h);
      ctx.lineTo(x + h * 0.02, base - h);
      ctx.quadraticCurveTo(x + h * 0.06, base - h * 0.45, x + h * 0.22, base);
      ctx.lineTo(x + h * 0.12, base);
      ctx.quadraticCurveTo(x, base - h * 0.14, x - h * 0.12, base);
      ctx.fill();
      ctx.fillRect(x - h * 0.13, base - h * 0.3, h * 0.26, h * 0.025);
      ctx.fillRect(x - h * 0.08, base - h * 0.58, h * 0.16, h * 0.02);
      ctx.fillRect(x - 1.5, base - h * 1.08, 3, h * 0.1);
    };
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    if (this.sakugaPhase === 0) {
      // Paris, anos atrás: os dois meninos trocando passes numa quadrinha
      sunset();
      eiffel(W * 0.8, stageH * 0.72, stageH * 0.62);
      ctx.fillStyle = '#5a3a20';
      for (let i = 0; i < 12; i++) ctx.fillRect(i * (W / 11) - 20, stageH * 0.72 - 30 - ((i * 23) % 40), W / 11 - 10, 80);
      ctx.fillStyle = '#a16207';
      ctx.fillRect(0, stageH * 0.72, W, stageH * 0.28);
      const feet = stageH * 0.94;
      const lx = W * 0.28;
      const hx = W * 0.6;
      this.drawSprite(ctx, kidLoki, lx, feet, 170, { animState: 'run' });
      this.drawSprite(ctx, kidHugo, hx, feet, 170, { animState: 'run', flipX: true });
      const k = (Math.sin(t * 0.06) + 1) / 2;
      this.drawAnimeBall(ctx, lx + 40 + (hx - lx - 80) * k, feet - 20 - Math.sin(k * Math.PI) * 50, 12, '#ffffff', t);
      memory();
      if (t > 25) this.drawMangaCaption(ctx, 'Paris, anos atrás.', W * 0.26, 64, 26);
    } else if (this.sakugaPhase === 1) {
      // A promessa no muro, olhando o pôr do sol
      sunset();
      const sun = ctx.createRadialGradient(W / 2, stageH * 0.5, 10, W / 2, stageH * 0.5, 180);
      sun.addColorStop(0, 'rgba(255,251,235,1)');
      sun.addColorStop(1, 'rgba(255,251,235,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, W, stageH);
      eiffel(W * 0.86, stageH * 0.62, stageH * 0.45);
      ctx.fillStyle = '#6b4423';
      ctx.fillRect(0, stageH * 0.72, W, stageH * 0.28);
      ctx.fillStyle = '#4a2c16';
      for (let x = 0; x < W; x += 60) ctx.fillRect(x, stageH * 0.72, 2, stageH * 0.28);
      const feet = stageH * 0.78;
      this.drawSprite(ctx, kidHugo, W * 0.4, feet, 230, { animState: 'idle' });
      this.drawSprite(ctx, kidLoki, W * 0.6, feet, 230, { animState: 'idle' });
      // Soquinho da promessa
      if (t > 160) {
        const k = ease((t - 160) / 20);
        ctx.fillStyle = '#c99472';
        ctx.fillRect(W / 2 - 70 + k * 40, stageH * 0.42, 34, 26);
        ctx.fillStyle = '#6b3e26';
        ctx.fillRect(W / 2 + 36 - k * 40, stageH * 0.42, 34, 26);
        if (k >= 1) {
          ctx.strokeStyle = '#fffbeb';
          ctx.lineWidth = 3;
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(W / 2 + Math.cos(a) * 30, stageH * 0.42 + 13 + Math.sin(a) * 30);
            ctx.lineTo(W / 2 + Math.cos(a) * (60 + (t - 180)), stageH * 0.42 + 13 + Math.sin(a) * (60 + (t - 180)));
            ctx.stroke();
          }
        }
      }
      memory();
      if (t > 20) this.drawMangaCaption(ctx, 'Loki... um dia a gente ganha a Copa do Mundo?', W * 0.36, 60, 21);
      if (t > 95) this.drawMangaCaption(ctx, 'A gente vai ganhar. Juntos. Eu prometo.', W * 0.64, 120, 21);
      if (t > 185) this.drawMangaCaption(ctx, 'PROMESSA.', W * 0.5, stageH * 0.3, 30);
    } else {
      // De volta à final: os dois lembram e a França desperta
      this.drawU20Stadium(ctx, W, stageH, t * 0.5, 0.46, 'FINAL • JAPÃO x FRANÇA');
      ctx.fillStyle = 'rgba(2,6,23,0.45)';
      ctx.fillRect(0, 0, W, stageH);
      this.drawRadialSpeedLines(ctx, W * 0.5, stageH * 0.5, W, '#38bdf8', 0.35);
      this.drawSprite(ctx, loki, W * 0.3, stageH + 110, 420, { animState: 'idle', showAura: true, auraColor: '#38bdf8' });
      this.drawSprite(ctx, hugo, W * 0.7, stageH + 110, 420, { animState: 'idle', flipX: true, showAura: true, auraColor: '#ec4899' });
      if (t > 15) this.drawMangaCaption(ctx, 'Hugo. A promessa.', W * 0.3, 60, 24);
      if (t > 60) this.drawMangaCaption(ctx, 'Eu lembro. Isso ainda não acabou!', W * 0.7, 110, 24);
      if (t > 105) {
        const pop = ease((t - 105) / 15);
        ctx.save();
        ctx.translate(W / 2, stageH * 0.55);
        ctx.scale(0.6 + pop * 0.4, 0.6 + pop * 0.4);
        ctx.font = 'italic 900 78px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#020617';
        ctx.strokeText('A FRANÇA DESPERTA!', 0, 0);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('A FRANÇA DESPERTA!', 0, 0);
        ctx.restore();
      }
      // Volta da lembrança com um clarão
      if (t < 14) {
        ctx.fillStyle = `rgba(255,251,235,${1 - t / 14})`;
        ctx.fillRect(0, 0, W, stageH);
      }
    }
    ctx.restore();
    const tags = [
      { tag: 'CENA 1/3 • PARIS, ANOS ATRÁS', sub: 'Dois meninos e uma bola até o sol se pôr.' },
      { tag: 'CENA 2/3 • A PROMESSA', sub: 'Loki e Hugo prometem ganhar a Copa do Mundo juntos.' },
      { tag: 'CENA 3/3 • A FRANÇA DESPERTA', sub: 'Perdendo a final, eles lembram do que prometeram.' }
    ];
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '🇫🇷 FLASHBACK • A PROMESSA DE LOKI E HUGO', info.tag, info.sub);
  },

  // A seleção japonesa (você + os do Blue Lock) com a camisa do Japão
  japanSquad(ids) {
    const kit = { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' };
    const find = (id) => (window.BLUE_LOCK_CHARACTERS || []).find((c) => c.id === id);
    return [Object.assign({}, this.getSpeakerCharData('VOCÊ'), kit), ...ids.map(find).filter(Boolean).map((c) => Object.assign({}, c, kit))];
  },

  // Confete caindo (posições fixas por índice, andam com o tempo)
  drawConfetti(ctx, W, H, t, n = 90) {
    const cols = ['#facc15', '#ffffff', '#1d4ed8', '#ef4444', '#00f5d4'];
    for (let i = 0; i < n; i++) {
      const x = (i * 137.5 + Math.sin(t * 0.03 + i) * 30) % W;
      const y = ((i * 71 + t * (2 + (i % 4))) % (H + 40)) - 20;
      ctx.fillStyle = cols[i % cols.length];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.1 + i);
      ctx.fillRect(-4, -2, 8, 4);
      ctx.restore();
    }
  },

  // Taça dourada
  drawTrophy(ctx, x, y, sc) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    const gold = ctx.createLinearGradient(-40, 0, 40, 0);
    gold.addColorStop(0, '#a16207');
    gold.addColorStop(0.45, '#fde047');
    gold.addColorStop(1, '#ca8a04');
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(-40, -60);
    ctx.lineTo(40, -60);
    ctx.quadraticCurveTo(38, 10, 0, 18);
    ctx.quadraticCurveTo(-38, 10, -40, -60);
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#ca8a04';
    ctx.beginPath();
    ctx.arc(-44, -38, 16, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(44, -38, 16, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.fillStyle = gold;
    ctx.fillRect(-7, 16, 14, 26);
    ctx.fillRect(-26, 40, 52, 14);
    ctx.fillStyle = '#14532d';
    ctx.fillRect(-30, 52, 60, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(-26, -54, 8, 40);
    ctx.restore();
  },

  // ========================================================================
  // CAMPEÕES! (fim da final da Copa Sub-20): apito final com todo mundo correndo
  // para você → o time inteiro pulando com fogos e cada um gritando do seu jeito
  // → você levantando a taça.
  // ========================================================================
  drawU20Celebration(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const lerp = (a, b, k) => a + (b - a) * k;
    const c = this.celebCfg || { home: 1, away: 0 };
    // A mesma festa serve para o título da Copa do Mundo principal (wc_champion)
    const wc = this.sakugaType === 'wc_champion';
    const squad = this.japanSquad(['sae', 'rin', 'shidou', 'bachira', 'nagi', 'gagamaru', 'chigiri', 'kunigami', 'barou']);
    const [you, ...mates] = squad;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    if (this.sakugaPhase === 0) {
      this.drawU20Stadium(ctx, W, stageH, t * 0.4, 0.46, wc ? 'FINAL DA COPA DO MUNDO • JAPÃO x FRANÇA' : 'FINAL • JAPÃO x FRANÇA • CAMPEÃO');
      const feet = stageH * 0.94;
      this.drawSprite(ctx, you, W / 2, feet - Math.abs(Math.sin(t * 0.12)) * 40, 280, { animState: 'call_pass', showAura: t > 40, auraColor: '#facc15' });
      mates.slice(0, 6).forEach((m, i) => {
        const side = i % 2 ? 1 : -1;
        const k = ease((t - 20 - i * 8) / 70);
        const x = lerp(W / 2 + side * W * 0.65, W / 2 + side * (110 + Math.floor(i / 2) * 95), k);
        this.drawSprite(ctx, m, x, feet + 8, 210, { animState: k < 1 ? 'run' : 'call_pass', flipX: side > 0 });
      });
      this.drawU20Scoreboard(ctx, c.home, c.away, 'FIM', 'JAPÃO', 'FRANÇA');
      if (t > 50) this.drawConfetti(ctx, W, stageH, t);
      if (t > 15 && t < 90) this.drawMangaCaption(ctx, 'APITA O ÁRBITRO!!', W * 0.5, 120, 34);
      if (t > 90) {
        const pop = ease((t - 90) / 14);
        ctx.save();
        ctx.translate(W / 2, stageH * 0.3);
        ctx.scale(0.5 + pop * 0.5, 0.5 + pop * 0.5);
        ctx.font = 'italic 900 96px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 9;
        ctx.strokeStyle = '#020617';
        ctx.strokeText('CAMPEÕES!!', 0, 0);
        ctx.fillStyle = '#facc15';
        ctx.fillText('CAMPEÕES!!', 0, 0);
        ctx.restore();
      }
    } else if (this.sakugaPhase === 1) {
      // Fogos no céu e o time inteiro pulando, cada um gritando do seu jeito
      const sky = ctx.createLinearGradient(0, 0, 0, stageH);
      sky.addColorStop(0, '#020617');
      sky.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, stageH);
      for (let f = 0; f < 5; f++) {
        const cyc = (t + f * 37) % 90;
        const fx = W * (0.12 + f * 0.19);
        const fy = stageH * (0.16 + (f % 2) * 0.12);
        const col = ['#facc15', '#ef4444', '#00f5d4', '#ffffff', '#38bdf8'][f];
        ctx.fillStyle = col;
        ctx.globalAlpha = Math.max(0, 1 - cyc / 90);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          ctx.fillRect(fx + Math.cos(a) * cyc * 1.6, fy + Math.sin(a) * cyc * 1.6 + cyc * 0.3, 5, 5);
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, stageH * 0.7, W, stageH * 0.3);
      const feet = stageH * 0.98;
      const row = [mates[0], mates[2], mates[4], you, mates[3], mates[1], mates[5]];
      row.forEach((m, i) => {
        if (!m) return;
        const x = W * (0.08 + i * 0.14);
        const jump = Math.abs(Math.sin(t * 0.1 + i * 0.9)) * 50;
        this.drawSprite(ctx, m, x, feet - jump, m === you ? 250 : 210, { animState: 'call_pass', flipX: i > 3, showAura: m === you, auraColor: '#facc15' });
      });
      this.drawConfetti(ctx, W, stageH, t, 60);
      if (t > 15) this.drawMangaCaption(ctx, 'BIG BAAANG!!', W * 0.36, 70, 24);
      if (t > 60) this.drawMangaCaption(ctx, 'A gente conseguiu, parceiro!!', W * 0.68, 130, 22);
      if (t > 110) this.drawMangaCaption(ctx, '...Tsc. Nada mal.', W * 0.2, 190, 22);
      if (t > 155) this.drawMangaCaption(ctx, 'Esse gol foi o meu passe. Não esquece.', W * 0.62, 250, 20);
    } else {
      // A taça
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, stageH);
      const spot = ctx.createRadialGradient(W / 2, stageH * 0.35, 20, W / 2, stageH * 0.35, W * 0.45);
      spot.addColorStop(0, 'rgba(253,224,71,0.45)');
      spot.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, W, stageH);
      ctx.save();
      ctx.globalAlpha = 0.55;
      mates.slice(0, 6).forEach((m, i) => {
        const side = i % 2 ? 1 : -1;
        this.drawSprite(ctx, m, W / 2 + side * (180 + Math.floor(i / 2) * 120), stageH + 30, 230, { animState: 'call_pass', flipX: side > 0 });
      });
      ctx.restore();
      const rise = ease(t / 70);
      this.drawSprite(ctx, you, W / 2, stageH + 60, 380, { animState: 'call_pass', showAura: true, auraColor: '#facc15' });
      this.drawTrophy(ctx, W / 2, lerp(stageH * 0.55, stageH * 0.2, rise), 1.3);
      for (let i = 0; i < 40; i++) {
        const a = i * 2.4 + t * 0.02;
        const r = 60 + ((t * 2 + i * 23) % 260);
        ctx.fillStyle = i % 3 ? '#fde047' : '#ffffff';
        ctx.fillRect(W / 2 + Math.cos(a) * r, stageH * 0.25 + Math.sin(a) * r * 0.6, 4, 4);
      }
      if (t > 80) {
        const pop = ease((t - 80) / 16);
        ctx.save();
        ctx.translate(W / 2, stageH * 0.86);
        ctx.scale(0.6 + pop * 0.4, 0.6 + pop * 0.4);
        ctx.font = 'italic 900 64px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#020617';
        const champ = wc ? 'CAMPEÕES DO MUNDO!!' : 'CAMPEÕES DO MUNDO SUB-20!';
        ctx.strokeText(champ, 0, 0);
        ctx.fillStyle = '#facc15';
        ctx.fillText(champ, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
    const tags = [
      { tag: 'CENA 1/3 • APITO FINAL', sub: `Japão ${c.home} x ${c.away} França. O time inteiro corre na sua direção.` },
      { tag: 'CENA 2/3 • TODO MUNDO', sub: 'Fogos, confete e cada um comemorando do seu jeito.' },
      { tag: 'CENA 3/3 • A TAÇA', sub: wc ? 'A taça de verdade. O Japão no topo do planeta.' : 'Da final do colégio ao topo do mundo.' }
    ];
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, wc ? '🏆 JAPÃO CAMPEÃO DA COPA DO MUNDO' : '🏆 JAPÃO CAMPEÃO DA COPA DO MUNDO SUB-20', info.tag, info.sub);
  },

  // ========================================================================
  // O DISCURSO (vestiário antes da estreia na Copa): o time calado → você se
  // levanta e fala → todo mundo se levanta gritando "VAMOS!!!"
  // ========================================================================
  drawCaptainSpeech(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const squad = this.japanSquad(['rin', 'shidou', 'bachira', 'nagi', 'gagamaru', 'chigiri']);
    const [you, ...mates] = squad;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    if (this.sakugaPhase === 0) {
      // O vestiário em silêncio: o time sentado, cabeças baixas
      this.drawBgLockerRoom(ctx, W, stageH);
      ctx.fillStyle = 'rgba(2,6,23,0.5)';
      ctx.fillRect(0, 0, W, stageH);
      mates.forEach((m, i) => this.drawSpriteDim(ctx, m, W * (0.12 + i * 0.15), stageH * 0.98, 220, { animState: 'idle', frame: 0 }, 0.4));
      if (t > 25) this.drawMangaCaption(ctx, 'Ninguém fala nada. Dá pra ouvir a torcida lá fora.', W * 0.5, 70, 22);
      if (t > 90) this.drawMangaCaption(ctx, 'TUM... TUM...', W * 0.82, 150, 24);
    } else if (this.sakugaPhase === 1) {
      // Você se levanta e fala; as frases vão aparecendo, cada vez maiores
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, stageH);
      this.drawRadialSpeedLines(ctx, W * 0.27, stageH * 0.5, W, '#00f5d4', 0.3);
      const size = 380 + ease(t / 80) * 120;
      this.drawSprite(ctx, you, W * 0.27, stageH + size * 0.25, size, { animState: 'call_pass', showAura: t > 150, auraColor: '#00f5d4' });
      const lines = [
        { at: 10, text: 'O mundo inteiro acha que a gente veio só participar.', size: 22, color: '#cbd5e1' },
        { at: 65, text: 'Que o Japão é o país que "corre bastante".', size: 24, color: '#cbd5e1' },
        { at: 120, text: 'EU NÃO VIM PARTICIPAR.', size: 40, color: '#f8fafc' },
        { at: 165, text: 'EU VIM DEVORAR O MUNDO. E VOCÊS?', size: 44, color: '#00f5d4' }
      ];
      lines.forEach((l, i) => {
        if (t < l.at) return;
        const k = ease((t - l.at) / 15);
        ctx.save();
        ctx.globalAlpha = k;
        ctx.font = `italic 900 ${l.size}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#020617';
        let fs = l.size;
        while (fs > 18 && ctx.measureText(l.text).width > W * 0.52) {
          fs -= 2;
          ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
        }
        const y = stageH * (0.18 + i * 0.19);
        ctx.strokeText(l.text, W * 0.7 + (1 - k) * 40, y);
        ctx.fillStyle = l.color;
        ctx.fillText(l.text, W * 0.7 + (1 - k) * 40, y);
        ctx.restore();
      });
    } else {
      // O time inteiro se levanta gritando
      this.drawBgLockerRoom(ctx, W, stageH);
      ctx.fillStyle = 'rgba(2,6,23,0.35)';
      ctx.fillRect(0, 0, W, stageH);
      this.drawRadialSpeedLines(ctx, W / 2, stageH * 0.5, W, '#facc15', 0.35);
      for (let r = 0; r < 3; r++) {
        const rr = ((t * 9) + r * 140) % 600;
        ctx.strokeStyle = 'rgba(0,245,212,' + Math.max(0, 1 - rr / 600) + ')';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(W / 2, stageH * 0.6, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      const row = [mates[0], mates[2], mates[4], you, mates[3], mates[1], mates[5]];
      row.forEach((m, i) => {
        if (!m) return;
        const up = ease((t - i * 4) / 25);
        const jump = Math.abs(Math.sin(t * 0.14 + i)) * 26 * up;
        this.drawSprite(ctx, m, W * (0.08 + i * 0.14), stageH * 0.98 - up * 20 - jump, m === you ? 260 : 220, { animState: 'call_pass', flipX: i > 3, showAura: true, auraColor: m === you ? '#00f5d4' : m.auraColor });
      });
      if (t > 20) {
        const pop = ease((t - 20) / 12);
        ctx.save();
        ctx.translate(W / 2, stageH * 0.3);
        ctx.scale(0.5 + pop * 0.5, 0.5 + pop * 0.5);
        ctx.font = 'italic 900 120px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#020617';
        ctx.strokeText('VAMOS!!!', 0, 0);
        ctx.fillStyle = '#facc15';
        ctx.fillText('VAMOS!!!', 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
    const tags = [
      { tag: 'CENA 1/3 • O SILÊNCIO', sub: 'Minutos antes da estreia na Copa do Mundo Sub-20.' },
      { tag: 'CENA 2/3 • O DISCURSO', sub: 'Você se levanta. Ninguém pediu. Ninguém precisava.' },
      { tag: 'CENA 3/3 • VAMOS!!!', sub: 'O vestiário inteiro se levanta com você.' }
    ];
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '🎙 O DISCURSO • VESTIÁRIO DO JAPÃO', info.tag, info.sub);
  },

  // Texto grande que "estoura" na tela (títulos das cenas)
  drawPopTitle(ctx, text, x, y, size, color, k, maxW) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.5 + k * 0.5, 0.5 + k * 0.5);
    ctx.globalAlpha = Math.min(1, k * 1.5);
    let fs = size;
    ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
    while (maxW && fs > 20 && ctx.measureText(text).width > maxW) {
      fs -= 4;
      ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.lineWidth = Math.max(6, fs / 11);
    ctx.strokeStyle = '#020617';
    ctx.strokeText(text, 0, 0);
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  },

  // O monstro: a sua silhueta gigante em vermelho escuro, com os olhos acesos
  drawMonsterShadow(ctx, you, x, feetY, size, glow) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    this.drawSilhouette(ctx, you, x, feetY, size, { animState: 'idle', frame: 0 }, '#450a0a');
    ctx.restore();
    const u = size / 36;
    const eyeY = feetY - size * 0.87 + SPRITE_MAPY(10.1) * u;
    [-1, 1].forEach((s) => {
      const ex = x + s * 3.3 * u;
      const g = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, u * 3.5);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.25, '#ef4444');
      g.addColorStop(1, 'rgba(220,38,38,0)');
      ctx.globalAlpha = glow;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ex, eyeY, u * 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  },

  // Correntes atravessando a tela; com "snap" > 0 elas se partem no meio e voam
  drawChains(ctx, W, H, snap) {
    ctx.save();
    [[0.22, -0.12], [0.62, 0.1]].forEach(([yk, rot], r) => {
      ctx.save();
      ctx.translate(W / 2, H * yk);
      ctx.rotate(rot);
      for (let i = -14; i <= 14; i++) {
        const side = i < 0 ? -1 : 1;
        const fly = snap * (30 + Math.abs(i) * 6);
        const x = i * 44 + side * fly;
        const y = snap * snap * (Math.abs(i) * 4 + r * 30);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(side * snap * 0.5 + (i % 2 ? Math.PI / 2 : 0) * 0.2);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, i % 2 ? 9 : 14, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    });
    ctx.restore();
  },

  // ========================================================================
  // O TREINO DA RAPOSA: madrugada na escadaria → o Fox explica o monstro →
  // a sombra vermelha atrás de você
  // ========================================================================
  drawFoxTraining(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const you = this.getSpeakerCharData('VOCÊ');
    const fox = this.getSpeakerCharData('FOX');
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    if (this.sakugaPhase === 0) {
      // Antes do sol: céu preto-avermelhado, lua coberta e uma escadaria sem fim
      const sky = ctx.createLinearGradient(0, 0, 0, stageH);
      sky.addColorStop(0, '#05030a');
      sky.addColorStop(0.6, '#2a0a0a');
      sky.addColorStop(1, '#5c1a0b');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, stageH);
      ctx.fillStyle = 'rgba(248,113,113,0.35)';
      ctx.beginPath();
      ctx.arc(W * 0.82, stageH * 0.3, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#05030a';
      ctx.fillRect(W * 0.7, stageH * 0.27, W * 0.3, 18);
      const steps = 16;
      for (let i = 0; i < steps; i++) {
        const x = W * 0.02 + i * (W * 0.058);
        const y = stageH - i * (stageH * 0.05);
        ctx.fillStyle = i % 2 ? '#18181b' : '#27272a';
        ctx.fillRect(x, y - stageH * 0.05, W, stageH);
        ctx.fillStyle = '#52525b';
        ctx.fillRect(x, y - stageH * 0.05, W, 3);
      }
      // Você subindo os degraus
      const k = Math.min(1, t / 190);
      const px = W * 0.08 + k * W * 0.62;
      // Pés em cima do degrau onde você está (com um pulinho a cada passada)
      const step = Math.floor((px - W * 0.02) / (W * 0.058));
      const py = stageH - (step + 1) * (stageH * 0.05) + 6 - Math.abs(Math.sin(t * 0.25)) * 8;
      this.drawSprite(ctx, you, px, py, 200, { animState: 'run' });
      for (let i = 0; i < 6; i++) {
        const a = (t * 0.2 + i) % 1;
        ctx.fillStyle = 'rgba(186,230,253,0.85)';
        ctx.fillRect(px - 20 - i * 9, py - 170 + a * 30 + i * 4, 4, 7);
      }
      // O Fox lá em cima com o cronômetro
      this.drawSprite(ctx, fox, W * 0.9, stageH * 0.22, 150, { animState: 'idle', flipX: true });
      if (t > 20) this.drawMangaCaption(ctx, '4 da manhã. 300 degraus. Pela 9ª vez.', W * 0.32, 70, 22);
      if (t > 80) this.drawMangaCaption(ctx, 'DE NOVO! QUEM PARA, EU SUBSTITUO!!', W * 0.62, 140, 24, '#7f1d1d');
      if (t > 140) this.drawMangaCaption(ctx, 'hah... hah...', px - 170, py - 120, 20);
    } else if (this.sakugaPhase === 1) {
      // Close no Fox, sorrindo no escuro
      ctx.fillStyle = '#0c0a09';
      ctx.fillRect(0, 0, W, stageH);
      const glow = ctx.createRadialGradient(W * 0.3, stageH * 0.45, 10, W * 0.3, stageH * 0.45, W * 0.5);
      glow.addColorStop(0, 'rgba(245,158,11,0.35)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, stageH);
      const size = 520 + ease(t / 120) * 60;
      this.drawSprite(ctx, fox, W * 0.3, stageH + size * 0.3, size, { animState: 'idle', frame: 0 });
      const lines = [
        { at: 10, text: 'Todo atacante tem um monstro dentro.' },
        { at: 70, text: 'O Ego colocou uma coleira no seu.' },
        { at: 130, text: 'Eu vim tirar. Mesmo que doa. PRINCIPALMENTE se doer.' }
      ];
      lines.forEach((l, i) => {
        if (t > l.at) this.drawMangaCaption(ctx, l.text, W * 0.7, stageH * (0.2 + i * 0.22), 22);
      });
    } else {
      // A sombra do monstro atrás de você
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, stageH);
      const red = ctx.createRadialGradient(W / 2, stageH * 0.4, 20, W / 2, stageH * 0.4, W * 0.55);
      red.addColorStop(0, 'rgba(220,38,38,' + (0.15 + ease(t / 60) * 0.3) + ')');
      red.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = red;
      ctx.fillRect(0, 0, W, stageH);
      const grow = ease(t / 80);
      this.drawMonsterShadow(ctx, you, W / 2, stageH * 1.25, 600 + grow * 160, ease((t - 30) / 30));
      this.drawSprite(ctx, you, W / 2, stageH * 0.99, 300, { animState: 'idle', frame: 0 });
      if (t > 60) this.drawPopTitle(ctx, '...DEIXA ELE SAIR.', W / 2, stageH * 0.16, 64, '#ef4444', ease((t - 60) / 14), W * 0.8);
    }
    ctx.restore();
    const tags = [
      { tag: 'CENA 1/3 • A ESCADARIA', sub: 'O Fox te arranca da cama antes do sol. Todo dia. Sem exceção.' },
      { tag: 'CENA 2/3 • A RAPOSA', sub: '"Tem um monstro dentro de você. E ele é meu."' },
      { tag: 'CENA 3/3 • O MONSTRO', sub: 'Ficou atrás no placar? Ele vai acordar.' }
    ];
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '🦊 O TREINO DA RAPOSA', info.tag, info.sub);
  },

  // ========================================================================
  // O MONSTRO ACORDA (em campo, quando você fica atrás no placar): batimento → o olho
  // vermelho e as correntes partindo → você com a sombra gigante atrás
  // ========================================================================
  drawMonsterAwaken(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const you = Object.assign({}, this.getSpeakerCharData('VOCÊ'), { auraColor: '#dc2626' });
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    ctx.fillStyle = '#050000';
    ctx.fillRect(0, 0, W, stageH);
    if (this.sakugaPhase === 0) {
      [5, 35].forEach((b) => {
        const k = t - b;
        if (k < 0 || k > 35) return;
        ctx.strokeStyle = '#dc2626';
        ctx.globalAlpha = 1 - k / 35;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(W / 2, stageH / 2, 40 + k * 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
      if (t > 8) this.drawMangaCaption(ctx, 'TUM.', W * 0.25, stageH * 0.3, 30);
      if (t > 38) this.drawMangaCaption(ctx, '...perdendo?', W * 0.72, stageH * 0.7, 26);
    } else if (this.sakugaPhase === 1) {
      // Close no rosto, o olho acende em vermelho e as correntes partem
      const size = W * 0.95;
      const u = size / 36;
      const eyeY = stageH * 0.45;
      const top = eyeY - SPRITE_MAPY(10.1) * u;
      this.drawSprite(ctx, you, W / 2, top + size * 0.87, size, { animState: 'idle', frame: 0 });
      ctx.fillStyle = 'rgba(5,0,0,0.45)';
      ctx.fillRect(0, 0, W, stageH);
      const vig = ctx.createRadialGradient(W / 2, eyeY, W * 0.1, W / 2, eyeY, W * 0.7);
      vig.addColorStop(0, 'rgba(60,0,0,0)');
      vig.addColorStop(1, 'rgba(20,0,0,0.92)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, stageH);
      const lit = ease((t - 15) / 20);
      [-1, 1].forEach((s) => {
        const ex = W / 2 + s * 3.3 * u;
        const g = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, u * 4);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.3, '#ef4444');
        g.addColorStop(1, 'rgba(220,38,38,0)');
        ctx.globalAlpha = lit;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ex, eyeY, u * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      this.drawChains(ctx, W, stageH, ease((t - 55) / 30));
      if (t > 55 && t < 75) {
        ctx.fillStyle = 'rgba(255,255,255,' + (1 - (t - 55) / 20) + ')';
        ctx.fillRect(0, 0, W, stageH);
      }
      if (t > 58) this.drawMangaCaption(ctx, 'KRAAASH!!', W * 0.78, stageH * 0.15, 30);
    } else {
      this.drawRadialSpeedLines(ctx, W / 2, stageH * 0.5, W, '#dc2626', 0.5);
      // Sombra maior que você: os olhos dela ficam acima da sua cabeça
      this.drawMonsterShadow(ctx, you, W / 2, stageH * 1.2, 920, 1);
      this.drawSprite(ctx, you, W / 2, stageH * 0.99, 330, { animState: 'run', showAura: true, auraColor: '#dc2626' });
      this.drawPopTitle(ctx, 'O MONSTRO ACORDOU!!', W / 2, stageH * 0.17, 76, '#ef4444', ease(t / 12), W * 0.9);
    }
    ctx.restore();
    const tags = [
      { tag: 'CENA 1/3 • PERDENDO', sub: 'O placar está contra você. O coração dispara.' },
      { tag: 'CENA 2/3 • AS CORRENTES', sub: 'O que te prendia se parte.' },
      { tag: 'CENA 3/3 • MONSTRO', sub: '15 segundos: mais rápido, mais preciso, chute mais forte.' }
    ];
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '👹 O MONSTRO', info.tag, info.sub);
  },

  // ========================================================================
  // O DESAFIO DO RIN: tela dividida (você x Rin) → frente a frente
  // ========================================================================
  drawRinChallenge(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const you = this.getSpeakerCharData('VOCÊ');
    const rin = (window.BLUE_LOCK_CHARACTERS || []).find((c) => c.id === 'rin') || you;
    const proKit = window.PRO_CLUBS?.[window.App?.state?.proClub];
    const youKit = Object.assign({}, you, proKit ? { jerseyPrimary: proKit.color, jerseySecondary: proKit.secondary } : {});
    const rinClub = window.PRO_CLUBS?.marsella || { color: '#7dd3fc', secondary: '#0f172a' };
    const rinKit = Object.assign({}, rin, { jerseyPrimary: rinClub.color, jerseySecondary: rinClub.secondary });
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    if (this.sakugaPhase === 0) {
      // Tela dividida na diagonal: você (azul) e o Rin (verde-escuro)
      const slide = ease(t / 30);
      ctx.fillStyle = '#0b1e3f';
      ctx.fillRect(0, 0, W, stageH);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(W * 0.58, 0);
      ctx.lineTo(W, 0);
      ctx.lineTo(W, stageH);
      ctx.lineTo(W * 0.42, stageH);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = '#052e2b';
      ctx.fillRect(0, 0, W, stageH);
      this.drawSpeedLines(ctx, W, stageH, '#14b8a6', 0.25);
      this.drawSprite(ctx, rinKit, W * 0.78 + (1 - slide) * 300, stageH * 1.18, 480, { animState: 'idle', frame: 0, flipX: true });
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W * 0.58, 0);
      ctx.lineTo(W * 0.42, stageH);
      ctx.lineTo(0, stageH);
      ctx.closePath();
      ctx.clip();
      this.drawSpeedLines(ctx, W, stageH, '#38bdf8', 0.25);
      this.drawSprite(ctx, youKit, W * 0.22 - (1 - slide) * 300, stageH * 1.18, 480, { animState: 'idle', frame: 0 });
      ctx.restore();
      // O raio no meio
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(W * 0.58, 0);
      for (let i = 1; i <= 8; i++) ctx.lineTo(W * (0.58 - i * 0.02) + (i % 2 ? 14 : -14) * Math.sin(t * 0.5), (stageH * i) / 8);
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (t > 40) this.drawMangaCaption(ctx, 'Bola de Ouro? Só existe UM melhor do mundo.', W * 0.7, 70, 20);
      if (t > 100) this.drawMangaCaption(ctx, 'E não é você.', W * 0.74, 140, 24);
    } else {
      // Frente a frente, testa com testa
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, stageH);
      this.drawRadialSpeedLines(ctx, W / 2, stageH * 0.45, W, '#facc15', 0.35);
      const close = ease(t / 40);
      this.drawSprite(ctx, youKit, W * (0.2 + close * 0.1), stageH * 1.12, 440, { animState: 'idle', frame: 0, showAura: true, auraColor: '#38bdf8' });
      this.drawSprite(ctx, rinKit, W * (0.8 - close * 0.1), stageH * 1.12, 440, { animState: 'idle', frame: 0, flipX: true, showAura: true, auraColor: '#14b8a6' });
      if (t > 30) this.drawPopTitle(ctx, 'VS', W / 2, stageH * 0.5, 110, '#facc15', ease((t - 30) / 10));
      if (t > 70) this.drawPopTitle(ctx, '"O MELHOR DO MUNDO VAI SER EU."', W / 2, stageH * 0.15, 46, '#f8fafc', ease((t - 70) / 14), W * 0.92);
      if (t > 120) this.drawMangaCaption(ctx, '(ao mesmo tempo, os dois)', W / 2, stageH * 0.28, 18);
    }
    ctx.restore();
    const tags = [
      { tag: 'CENA 1/2 • O RIVAL', sub: 'O Rin Itoshi lê cada manchete sobre você.' },
      { tag: 'CENA 2/2 • FRENTE A FRENTE', sub: 'A corrida pela Bola de Ouro virou pessoal.' }
    ];
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '⚡ O DESAFIO DO RIN', info.tag, info.sub);
  },

  // ========================================================================
  // CRÉDITOS FINAIS: o texto subindo e o elenco inteiro desfilando embaixo
  // ========================================================================
  drawCredits(ctx, W, H) {
    // Tempo corrido desde o começo (pular de fase com o clique também adianta a rolagem)
    const t = this.getSakugaPhaseDurations().slice(0, this.sakugaPhase).reduce((s, d) => s + d, 0) + this.sakugaPhaseTimer;
    const stageH = H - 108;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    const sky = ctx.createLinearGradient(0, 0, 0, stageH);
    sky.addColorStop(0, '#020617');
    sky.addColorStop(1, '#0b1e3f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, stageH);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 + ((i * 37) % 10) / 15})`;
      ctx.fillRect((i * 173) % W, (i * 97) % (stageH * 0.7), 2, 2);
    }
    const name = window.App?.state?.profile?.name || 'VOCÊ';
    const cast = (window.BLUE_LOCK_CHARACTERS || []).filter((c) => !/^gen_|^gk_/.test(c.id));
    const lines = [
      ['big', 'BLUE LOCK: EGOIST CAREER'],
      ['gap'],
      ['head', 'ESTRELANDO'],
      ['name', name.toUpperCase()],
      ['gap'],
      ['head', 'O PROJETO BLUE LOCK'],
      ['name', 'Jinpachi Ego'],
      ['name', 'Anri Teieri'],
      ['gap'],
      ['head', 'O TREINADOR'],
      ['name', 'Fox'],
      ['gap'],
      ['head', 'ELENCO'],
      ...cast.map((c) => ['name', c.name]),
      ['gap'],
      ['head', 'BASEADO EM'],
      ['name', 'Blue Lock, de Muneyuki Kaneshiro e Yusuke Nomura'],
      ['gap'],
      ['head', 'E VOCÊ'],
      ['name', 'que chutou quando todo mundo mandava passar.'],
      ['gap'],
      ['gap'],
      ['big', 'OBRIGADO POR JOGAR!']
    ];
    const lineH = { big: 70, head: 46, name: 32, gap: 34 };
    const total = lines.reduce((s, l) => s + lineH[l[0]], 0);
    const durations = this.getSakugaPhaseDurations();
    const all = durations.reduce((s, d) => s + d, 0);
    // A rolagem termina com o "OBRIGADO" parado no meio da tela
    // O texto rola só na parte de cima; embaixo fica o desfile
    const textBottom = stageH - 150;
    const k = Math.min(1, t / (all - 120));
    let y = textBottom + 20 - k * (total + 20 - textBottom * 0.5);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, textBottom);
    ctx.clip();
    ctx.textAlign = 'center';
    lines.forEach(([kind, text]) => {
      y += lineH[kind];
      if (!text || y < -60 || y > stageH + 60) return;
      ctx.font = kind === 'big' ? 'italic 900 44px "Segoe UI", sans-serif' : kind === 'head' ? '800 16px "Segoe UI", sans-serif' : '600 24px "Segoe UI", sans-serif';
      ctx.fillStyle = kind === 'big' ? '#facc15' : kind === 'head' ? '#00f5d4' : '#f8fafc';
      ctx.fillText(text, W / 2, y);
    });
    // As linhas somem suavemente nas bordas da área de texto
    [[0, 50, '#020617', 'rgba(2,6,23,0)'], [textBottom - 50, textBottom, 'rgba(9,24,53,0)', 'rgb(9,24,53)']].forEach(([y0, y1, a, b]) => {
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      ctx.fillStyle = g;
      ctx.fillRect(0, y0, W, y1 - y0);
    });
    ctx.restore();
    // O desfile: cada personagem atravessa a tela correndo
    const groundY = stageH * 0.99;
    ctx.fillStyle = 'rgba(2,6,23,0.6)';
    ctx.fillRect(0, groundY - 6, W, 12);
    const parade = [this.getSpeakerCharData('VOCÊ'), this.getSpeakerCharData('FOX'), ...cast];
    const gap = 95;
    parade.forEach((c, i) => {
      const x = W + 80 - (t * 3.4 - i * gap);
      if (x < -80 || x > W + 80) return;
      this.drawSprite(ctx, c, x, groundY, 120, { animState: 'run', flipX: true });
    });
    ctx.restore();
    this.drawSakugaBar(ctx, W, H, '🎬 CRÉDITOS', 'FIM', 'Obrigado por jogar BLUE LOCK: EGOIST CAREER.');
  },

  // ========================================================================
  // O GOL DA SORTE (10 cenas, ~33 s): o seu gol no último lance contra a Sub-20
  // do Japão (u20_direct_shoot: Rin x Sae) e o gol do título na final da Copa
  // Sub-20 (u20_final_goal: Rin x Loki). O Rin se choca com o rival, a bola
  // espirra, a "sorte" cai... e só você estava esperando embaixo dela.
  // ========================================================================
  luckGoalCfg() {
    const find = (id) => window.findCharacter?.(id) || (window.BLUE_LOCK_CHARACTERS || []).find((c) => c.id === id) || {};
    const kit = (c, k) => Object.assign({}, c, k);
    const keeperKit = { jerseyPrimary: '#facc15', jerseySecondary: '#111827' };
    if (this.sakugaType === 'u20_final_goal') {
      const japan = { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' };
      const france = { jerseyPrimary: '#0b1d4d', jerseySecondary: '#ef4444' };
      return {
        you: kit(this.getSpeakerCharData('VOCÊ'), japan),
        rin: kit(find('rin'), Object.assign({ angry: true }, japan)),
        rival: kit(find('loki'), france),
        defender: kit(find('hugo'), france),
        gk: kit(find('gk_france'), keeperKit),
        rivalName: 'JULIAN LOKI',
        defName: 'HUGO',
        gkName: 'GOLEIRO DA FRANÇA',
        rivalAura: '#facc15',
        rivalBg: '#1c1403',
        rivalLine: 'Ninguém passa pela Velocidade Divina.',
        homeLabel: 'JAPÃO',
        awayLabel: 'FRANÇA',
        before: [2, 2],
        after: [3, 2],
        minute: "90+4'",
        sign: 'FIFA U-20 WORLD CUP • GRANDE FINAL • JAPÃO x FRANÇA',
        title: 'FINAL DA COPA DO MUNDO SUB-20 • O GOL DO TÍTULO',
        goalSub: 'O Japão vira a final no último lance da Copa!'
      };
    }
    const blueLock = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
    const u20 = { jerseyPrimary: '#ffffff', jerseySecondary: '#dc2626' };
    return {
      you: kit(this.getSpeakerCharData('VOCÊ'), blueLock),
      rin: kit(find('rin'), Object.assign({ angry: true }, blueLock)),
      rival: kit(find('sae'), u20),
      defender: kit(find('aiku'), u20),
      gk: kit(find('fukaku'), keeperKit),
      rivalName: 'SAE ITOSHI',
      defName: 'OLIVER AIKU',
      gkName: 'FUKAKU',
      rivalAura: '#f43f5e',
      rivalBg: '#2a0a12',
      rivalLine: 'Você ainda não chegou no meu nível, Rin.',
      homeLabel: 'BLUE LOCK',
      awayLabel: 'U-20',
      before: [3, 3],
      after: [4, 3],
      minute: "90+3'",
      sign: 'JFU JAPAN • BLUE LOCK vs U-20',
      title: 'BLUE LOCK vs JAPÃO SUB-20 • O GOL DA VITÓRIA',
      goalSub: 'O Estádio Nacional explode! O Blue Lock venceu a Sub-20!'
    };
  },

  drawLuckGoal(ctx, W, H) {
    const c = this.luckGoalCfg();
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const lerp = (a, b, k) => a + (b - a) * k;
    const cyan = '#00f5d4';
    const rinAura = '#14b8a6';
    const pName = (window.App?.state?.profile?.name || 'VOCÊ').toUpperCase();
    const ph = this.sakugaPhase;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();

    if (ph === 0) {
      // O último lance: o Rin conduz, o rival vem fechar e você lá atrás, sem ninguém te marcar
      const feet = stageH * 0.86;
      this.drawU20Stadium(ctx, W, stageH, t * 1.2, 0.46, c.sign);
      this.drawSprite(ctx, c.gk, W * 0.94, stageH * 0.6, 100, { animState: 'idle', flipX: true });
      this.drawSprite(ctx, c.defender, lerp(W * 0.88, W * 0.78, ease(t / 200)), stageH * 0.66, 120, { animState: 'run', flipX: true });
      const yx = lerp(W * 0.05, W * 0.3, ease(t / 210));
      this.drawSprite(ctx, c.you, yx, stageH * 0.64, 110, { animState: 'run' });
      ctx.fillStyle = cyan;
      ctx.font = '900 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`▼ ${pName}`, yx, stageH * 0.64 - 104);
      const rx = lerp(W * 0.06, W * 0.4, ease(t / 200));
      this.drawSprite(ctx, c.rin, rx, feet, 230, { animState: 'run', showAura: t > 90, auraColor: rinAura });
      this.drawAnimeBall(ctx, rx + 70, feet - 16, 17, '#ffffff', t);
      this.drawSprite(ctx, c.rival, lerp(W * 1.12, W * 0.66, ease((t - 50) / 160)), feet, 230, { animState: 'run', flipX: true, showAura: t > 120, auraColor: c.rivalAura });
      this.drawU20Scoreboard(ctx, c.before[0], c.before[1], c.minute, c.homeLabel, c.awayLabel);
      if (t > 12) this.drawMangaCaption(ctx, `${c.minute} • ${c.before[0]} x ${c.before[1]} • ÚLTIMA JOGADA`, W * 0.66, 72, 22);
      if (t > 95) this.drawMangaCaption(ctx, 'O RIN ARRANCA COM A BOLA!', W * 0.66, 138, 24);
    } else if (ph === 1) {
      // Tela dividida: o olhar do Rin contra o do rival
      const slide = ease(t / 26);
      const half = (pts, bg, fn) => {
        ctx.save();
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, stageH);
        fn();
        ctx.restore();
      };
      half([[0, 0], [W * 0.56, 0], [W * 0.44, stageH], [0, stageH]], '#04201d', () => {
        this.drawRadialSpeedLines(ctx, W * 0.24, stageH * 0.42, W, rinAura, 0.35);
        this.drawSprite(ctx, c.rin, W * 0.24 - (1 - slide) * 300, stageH * 1.22, 500, { animState: 'idle', frame: 0, showAura: true, auraColor: rinAura });
      });
      half([[W * 0.56, 0], [W, 0], [W, stageH], [W * 0.44, stageH]], c.rivalBg, () => {
        this.drawRadialSpeedLines(ctx, W * 0.76, stageH * 0.42, W, c.rivalAura, 0.35);
        this.drawSprite(ctx, c.rival, W * 0.76 + (1 - slide) * 300, stageH * 1.22, 500, { animState: 'idle', frame: 0, flipX: true, showAura: true, auraColor: c.rivalAura });
      });
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(W * 0.56, 0);
      for (let i = 1; i <= 8; i++) ctx.lineTo(W * (0.56 - i * 0.015) + (i % 2 ? 12 : -12) * Math.sin(t * 0.5), (stageH * i) / 8);
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (t > 35) this.drawMangaCaption(ctx, '"SAI DA FRENTE."', W * 0.22, 72, 26);
      if (t > 90) this.drawMangaCaption(ctx, `"${c.rivalLine}"`, W * 0.72, stageH - 36, 21);
      if (t > 140) this.drawPopTitle(ctx, 'VS', W / 2, stageH * 0.55, 120, '#facc15', ease((t - 140) / 10));
    } else if (ph === 2) {
      // O choque na entrada da área: a bola espirra para o alto
      const clash = 66;
      const feet = stageH * 0.86;
      const after = Math.max(0, t - clash);
      const shake = t > clash && t < clash + 30 ? (Math.random() - 0.5) * 18 : 0;
      ctx.save();
      ctx.translate(shake, shake);
      this.drawU20Stadium(ctx, W, stageH, 400 + t * 0.8, 0.46, c.sign);
      const k = ease(t / clash);
      const rx = t < clash ? lerp(W * 0.12, W * 0.44, k) : W * 0.44 - Math.min(70, after * 2.2);
      const vx = t < clash ? lerp(W * 0.88, W * 0.56, k) : W * 0.56 + Math.min(70, after * 2.2);
      this.drawSprite(ctx, c.rin, rx, feet, 240, { animState: t < clash ? 'run' : 'slide', showAura: true, auraColor: rinAura });
      this.drawSprite(ctx, c.rival, vx, feet, 240, { animState: t < clash ? 'run' : 'slide', flipX: true, showAura: true, auraColor: c.rivalAura });
      const bx = t < clash ? rx + 60 : W * 0.5 + after * 1.5;
      const by = t < clash ? feet - 16 : feet - 40 - after * 11 + after * after * 0.02;
      this.drawAnimeBall(ctx, bx, by, 18, t >= clash ? '#facc15' : '#ffffff', t);
      if (t >= clash) {
        for (let r = 1; r <= 3; r++) {
          ctx.strokeStyle = r % 2 ? '#f8fafc' : '#facc15';
          ctx.globalAlpha = Math.max(0, 1 - after / 50);
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.ellipse(W * 0.5, feet - 80, after * 9 * r, after * 4 * r, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (t >= clash - 2 && t < clash + 12) {
        ctx.save();
        ctx.globalAlpha = 1 - (t - clash + 2) / 14;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, stageH);
        ctx.restore();
        this.drawRadialSpeedLines(ctx, W * 0.5, feet - 70, W, '#020617', 0.8);
      }
      if (t >= clash && after < 70) this.drawPopTitle(ctx, 'DOOM!!', W * 0.5, stageH * 0.3, 130, '#f8fafc', ease(after / 8));
      this.drawU20Scoreboard(ctx, c.before[0], c.before[1], c.minute, c.homeLabel, c.awayLabel);
      this.drawMangaCaption(ctx, t < clash ? `RIN ITOSHI vs ${c.rivalName}!` : 'A BOLA ESPIRRA PRO ALTO!', W * 0.64, 72, 26);
    } else if (ph === 3) {
      // Câmera lenta olhando para o céu: a peça da SORTE vem caindo... e o monólogo
      const bg = ctx.createRadialGradient(W * 0.66, stageH * 0.42, 40, W * 0.66, stageH * 0.42, W * 0.75);
      bg.addColorStop(0, '#13265a');
      bg.addColorStop(1, '#020617');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, stageH);
      for (let i = 0; i < 16; i++) {
        const lx = (i * 211 + t * 0.4) % (W + 100) - 50;
        const ly = 50 + ((i * 97) % Math.floor(stageH * 0.6));
        const rr = 18 + (i % 4) * 10;
        const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, rr);
        g.addColorStop(0, 'rgba(255,255,255,0.3)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(lx - rr, ly - rr, rr * 2, rr * 2);
      }
      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) {
        const lx = (i * 59) % W;
        const ly = stageH - ((i * 83 + t * 1.1) % stageH);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx, ly + 60);
        ctx.stroke();
      }
      const bx = W * 0.66;
      const by = stageH * 0.4 - Math.sin(t * 0.015) * 18;
      this.drawAnimeBall(ctx, bx, by, 52, '#facc15', t * 0.2);
      const pk = ease(t / 120);
      const pulse = t > 120 ? 1 + Math.sin(t * 0.3) * 0.08 : 1;
      this.drawPuzzlePiece(ctx, lerp(W + 80, bx + 96, pk), lerp(stageH * 0.9, by - 10, pk), 58 * pulse, cyan, (1 - pk) * 3, 'SORTE');
      if (t > 120 && t < 130) this.drawRadialSpeedLines(ctx, bx + 96, by - 10, W, cyan, 0.6);
      // Todo mundo congelado olhando para cima; só você está aceso
      ctx.save();
      ctx.globalAlpha = 0.92;
      this.drawSilhouette(ctx, c.rin, W * 0.36, stageH + 80, 240, { animState: 'idle', facing: 'back' }, '#020617');
      this.drawSilhouette(ctx, c.rival, W * 0.58, stageH + 80, 240, { animState: 'idle', facing: 'back' }, '#020617');
      this.drawSilhouette(ctx, c.defender, W * 0.84, stageH + 90, 230, { animState: 'idle', facing: 'back' }, '#020617');
      ctx.restore();
      this.drawSprite(ctx, c.you, W * 0.12, stageH + 60, 250, { animState: 'idle', facing: 'back', showAura: t > 60, auraColor: cyan });
      const mono = [
        { at: 18, text: 'Sorte...' },
        { at: 75, text: 'Todo mundo acha que a sorte cai do céu.' },
        { at: 145, text: 'Mentira. Ela só cai pra quem já está esperando embaixo.' }
      ];
      mono.forEach((m, i) => {
        if (t > m.at) this.drawMangaCaption(ctx, m.text, 36, 58 + i * 58, 21, '#090d16', 'left');
      });
    } else if (ph === 4) {
      // Close nos olhos + quebra-cabeça se montando (EGO, RIN, SORTE... GOL)
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, stageH);
      this.drawRadialSpeedLines(ctx, W / 2, stageH * 0.38, W, cyan, 0.25);
      const bandTop = stageH * 0.14;
      const bandH = stageH * 0.42;
      const faceSize = W * 1.05;
      const s = faceSize / 36;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, bandTop, W, bandH);
      ctx.clip();
      ctx.fillStyle = '#0b1736';
      ctx.fillRect(0, bandTop, W, bandH);
      ctx.translate(W / 2 - 18 * s, bandTop + bandH * 0.55 - 9.6 * s);
      window.PixelRenderer.drawCharacterSprite(ctx, c.you, faceSize, faceSize * 1.1, { facing: 'front', frame: 5 });
      const glowLen = Math.min(1, t / 50) * 14;
      ctx.fillStyle = cyan;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(23 * s, 10.3 * s, glowLen * s, 0.45 * s);
      ctx.fillRect((13 - glowLen) * s, 10.3 * s, glowLen * s, 0.45 * s);
      ctx.restore();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.strokeRect(-4, bandTop, W + 8, bandH);
      const labels = ['EGO', 'RIN', 'SORTE', '', '', 'GOL'];
      const pieceSize = 70;
      const rowY = stageH * 0.78;
      labels.forEach((label, i) => {
        const sx = W / 2 + (i - (labels.length - 1) / 2) * (pieceSize + 12);
        const pk = ease((t - i * 18) / 30);
        if (pk <= 0) return;
        const last = i === labels.length - 1;
        this.drawPuzzlePiece(ctx, lerp(i % 2 === 0 ? -100 : W + 100, sx, pk), lerp(i < 3 ? -60 : stageH + 60, rowY, pk), pieceSize, last ? '#facc15' : i === 1 ? rinAura : '#38bdf8', (1 - pk) * 4, label);
      });
      const lastLand = (labels.length - 1) * 18 + 30;
      if (t >= lastLand && t < lastLand + 8) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, stageH);
        ctx.restore();
      }
      const line = 'Rin... foi você que criou essa bola. Mas quem empurra pra rede... SOU EU.';
      const shown = line.slice(0, Math.max(0, Math.floor((t - 10) * 0.5)));
      if (shown) this.drawMangaCaption(ctx, shown, 36, 58, 22, '#090d16', 'left');
    } else if (ph === 5) {
      // O tempo para: o estádio fica azulado e todo mundo parado (de verdade, sem borrão),
      // só você corre. Os parados são os bonecos normais com um véu cinza por cima.
      const feet = stageH * 0.88;
      this.drawU20Stadium(ctx, W, stageH, 700, 0.46, c.sign);
      // O mundo inteiro fica azul (o tempo parou); os parados ganham o mesmo azul por cima
      ctx.fillStyle = 'rgba(14,52,120,0.5)';
      ctx.fillRect(0, 0, W, stageH);
      const frozen = (ch, x, fy, size, flipX) => this.drawSpriteDim(ctx, ch, x, fy, size, { animState: 'idle', frame: 0, flipX }, 0.5, '30,70,150');
      frozen(c.rin, W * 0.32, stageH * 0.7, 160, false);
      frozen(c.rival, W * 0.45, stageH * 0.7, 160, true);
      frozen(c.gk, W * 0.92, stageH * 0.64, 130, true);
      if (t < 100) frozen(c.defender, W * 0.8, feet - 10, 220, true);
      else this.drawSprite(ctx, c.defender, lerp(W * 0.8, W * 0.7, ease((t - 100) / 60)), feet - 10, 220, { animState: 'run', flipX: true });
      // Moldura de "tempo parado": borda ciano pulsando
      ctx.strokeStyle = `rgba(0,245,212,${0.35 + Math.sin(t * 0.15) * 0.15})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, W - 10, stageH - 10);
      this.drawSpeedLines(ctx, W, stageH, cyan, 0.3);
      const yx = lerp(W * 0.12, W * 0.52, ease(t / 150));
      // Rastro: faixas de luz atrás de você (sem cópias do boneco, que pareciam várias imagens)
      const trail = ctx.createLinearGradient(yx - 260, 0, yx - 40, 0);
      trail.addColorStop(0, 'rgba(0,245,212,0)');
      trail.addColorStop(1, 'rgba(0,245,212,0.45)');
      ctx.fillStyle = trail;
      [0.42, 0.6, 0.78].forEach((k, i) => ctx.fillRect(yx - 260, feet - 260 * k, 220, 10 - i * 2));
      this.drawSprite(ctx, c.you, yx, feet, 260, { animState: 'run', showAura: true, auraColor: cyan });
      this.drawAnimeBall(ctx, lerp(W * 0.64, W * 0.6, t / 170), lerp(-40, feet - 110, ease(t / 170)), 22, '#facc15', t * 0.4);
      if (t > 15) this.drawMangaCaption(ctx, 'Só eu me mexo nesse mundo.', 36, 58, 24, '#090d16', 'left');
      if (t > 100) this.drawMangaCaption(ctx, `${c.defName} PERCEBEU!`, W * 0.74, 130, 24, '#b91c1c');
    } else if (ph === 6) {
      if (t < 140) {
        // Corte A: a peça dourada da SORTE ("LUCK") cai do céu, quica duas vezes no gramado
        // e para brilhando; você chega no tempo da bola e chuta sem dominar
        const feet = stageH * 0.88;
        const kick = 118;
        this.drawU20Stadium(ctx, W, stageH, 300 + t * 0.4, 0.46, c.sign);
        this.drawSprite(ctx, c.defender, lerp(W * 1.05, W * 0.76, ease((t - 50) / 80)), feet + 10, 220, { animState: t > 90 ? 'slide' : 'run', flipX: true });
        const px = W * 0.62;
        const ground = feet - 40;
        let py = ground;
        if (t < 40) py = lerp(-90, ground, (t / 40) ** 2);
        else if (t < 72) {
          const q = (t - 40) / 32;
          py = ground - 520 * q * (1 - q);
        } else if (t < 92) {
          const q = (t - 72) / 20;
          py = ground - 180 * q * (1 - q);
        }
        if (t <= kick + 4) {
          const air = Math.max(0, ground - py);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath();
          ctx.ellipse(px, ground + 44, Math.max(14, 50 - air * 0.25), 10, 0, 0, Math.PI * 2);
          ctx.fill();
          // Poeira dourada a cada quique
          [40, 72, 92].forEach((b) => {
            const k = t - b;
            if (k < 0 || k > 18) return;
            for (let i = 0; i < 10; i++) {
              const a = Math.PI + (i / 9) * Math.PI;
              ctx.fillStyle = `rgba(253,224,71,${1 - k / 18})`;
              ctx.fillRect(px + Math.cos(a) * k * 4, ground + 40 + Math.sin(a) * k * 2, 5, 5);
            }
          });
          const settle = t >= 92 ? 1 : 0;
          // Girando na queda; parada, fica de frente balançando de leve para o LUCK aparecer
          const spin = settle ? Math.sin(t * 0.06) * 0.35 : t * 0.11;
          this.drawPuzzle3D(ctx, px, py, 86, spin, Math.sin(t * 0.12) * 0.3 * (1 - settle * 0.85), 'LUCK', settle ? 0.6 + Math.sin(t * 0.3) * 0.4 : 0.2);
        } else {
          // No chute a peça vira luz dourada
          const k = (t - kick) / 22;
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            ctx.fillStyle = `rgba(253,224,71,${Math.max(0, 1 - k)})`;
            ctx.fillRect(px + Math.cos(a) * k * 140, ground + Math.sin(a) * k * 90, 7, 7);
          }
        }
        const yx = lerp(W * 0.12, W * 0.46, ease(t / 105));
        this.drawSprite(ctx, c.you, yx, feet, 260, { animState: t < 96 ? 'run' : t < kick ? 'windup' : 'shoot', showAura: true, auraColor: cyan });
        const bx = t < kick ? W * 0.55 : W * 0.55 + (t - kick) * 34;
        const by = t < kick ? lerp(-40, feet - 70, ease(t / kick)) : feet - 70 - (t - kick) * 6;
        this.drawAnimeBall(ctx, bx, by, 22, t < kick ? '#facc15' : cyan, t);
        if (t >= kick && t < kick + 5) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillRect(0, 0, W, stageH);
        }
        if (t > 44 && t < 100) this.drawMangaCaption(ctx, 'A sorte quicou bem na minha frente.', 36, 116, 22, '#090d16', 'left');
        this.drawCameraCutBadge(ctx, t < 92 ? '🎥 CORTE A: A PEÇA DA SORTE CAI DO CÉU...' : '🎥 CORTE A: SEM DOMINAR... DIRETO!');
      } else if (t < 185) {
        // Corte B: impact frame preto e branco
        // Um só flash invertido no impacto (o pisca-pisca parecia várias imagens trocando)
        const u = t - 140;
        const inv = u < 6;
        const fg = inv ? '#ffffff' : '#090d16';
        ctx.fillStyle = inv ? '#090d16' : '#ffffff';
        ctx.fillRect(0, 0, W, stageH);
        this.drawRadialSpeedLines(ctx, W * 0.6, stageH * 0.62, W, fg, 0.9);
        this.drawSilhouette(ctx, c.you, W * 0.42, stageH * 0.98, 440, { animState: 'shoot' }, fg);
        for (let r = 1; r <= 3; r++) {
          ctx.strokeStyle = fg;
          ctx.lineWidth = 7 - r * 2;
          ctx.beginPath();
          ctx.ellipse(W * 0.62, stageH * 0.62, u * r * 4, u * r * 2, 0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
        this.drawAnimeBall(ctx, W * 0.62, stageH * 0.62, 34, cyan, t);
        ctx.save();
        ctx.translate(W * 0.82, stageH * 0.3);
        ctx.rotate(-0.15);
        ctx.font = 'italic 900 110px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = fg;
        ctx.fillText('DOM!!', 0, 0);
        ctx.restore();
      } else {
        // Corte C: por trás — a bola sai voando rumo ao ângulo
        const u = (t - 185) / 85;
        this.drawU20Stadium(ctx, W, stageH, 600, 0.5, c.sign);
        const gx = W * 0.5;
        const gy = stageH * 0.56;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.strokeRect(gx - 190, gy - 120, 380, 120);
        this.drawSprite(ctx, c.gk, gx - 30, gy + 4, 110, { animState: u > 0.45 ? 'dive' : 'idle' });
        this.drawSprite(ctx, c.you, W * 0.2, stageH + 40, 420, { animState: 'shoot', facing: 'back', showAura: true, auraColor: cyan });
        // Um risco de luz só, da chuteira até a bola (antes eram 6 bolas fantasmas)
        const bx = lerp(W * 0.32, gx + 150, ease(u));
        const by = lerp(stageH * 0.8, gy - 95, ease(u));
        const tail = Math.max(0, ease(u) - 0.25);
        const sx = lerp(W * 0.32, gx + 150, tail);
        const sy = lerp(stageH * 0.8, gy - 95, tail);
        const streak = ctx.createLinearGradient(sx, sy, bx, by);
        streak.addColorStop(0, 'rgba(0,245,212,0)');
        streak.addColorStop(1, 'rgba(0,245,212,0.85)');
        ctx.strokeStyle = streak;
        ctx.lineCap = 'round';
        ctx.lineWidth = lerp(26, 10, u);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(bx, by);
        ctx.stroke();
        this.drawAnimeBall(ctx, bx, by, lerp(34, 14, u), cyan, t);
        this.drawCameraCutBadge(ctx, '🎥 CORTE C: VISÃO TRASEIRA RUMO AO ÂNGULO!');
      }
    } else if (ph === 7) {
      // Câmera colada na bola: o zagueiro e o goleiro passam e ficam para trás
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, W, stageH);
      this.drawSpeedLines(ctx, W, stageH, cyan, 0.6);
      this.drawSpeedLines(ctx, W, stageH, '#facc15', 0.3);
      if (t < 70) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        this.drawSprite(ctx, c.defender, lerp(W * 1.1, -W * 0.2, t / 70), stageH * 0.98, 300, { animState: 'slide', flipX: true });
        ctx.restore();
      }
      if (t >= 55) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        this.drawSprite(ctx, c.gk, lerp(W * 1.1, -W * 0.1, (t - 55) / 80), stageH * 0.72, 300, { animState: 'dive', flipX: true });
        ctx.restore();
      }
      const shake = (Math.random() - 0.5) * 8;
      this.drawAnimeBall(ctx, W * 0.5 + shake, stageH * 0.48 + shake, 72, cyan, t * 2.5);
      this.drawMangaCaption(ctx, t < 60 ? `PASSOU PELO ${c.defName}!` : `O ${c.gkName} NÃO ALCANÇA!`, W * 0.5, 72, 30);
    } else if (ph === 8) {
      // Gol de frente: a rede estufa, o placar vira e você comemora
      const hit = 22;
      const isHit = t >= hit;
      const shakeAmt = isHit && t < 60 ? (Math.random() - 0.5) * 14 : 0;
      ctx.save();
      ctx.translate(shakeAmt, shakeAmt);
      this.drawU20Stadium(ctx, W, stageH, 900, 0.42, c.sign);
      const gx0 = W * 0.18;
      const gx1 = W * 0.82;
      const gy0 = stageH * 0.22;
      const gy1 = stageH * 0.86;
      const hitX = W * 0.7;
      const hitY = stageH * 0.34;
      const stretch = isHit ? Math.min(60, (t - hit) * 4) * Math.max(0.35, 1 - (t - hit) / 160) : 0;
      this.drawStretchNet(ctx, gx0, gy0, gx1, gy1, hitX, hitY, stretch);
      this.drawSprite(ctx, c.gk, W * 0.36, gy1 + 10, 230, { animState: 'dive' });
      const ballX = isHit ? hitX + Math.sin(t * 0.7) * 3 : lerp(W * 0.4, hitX, t / hit);
      const ballY = isHit ? hitY + stretch * 0.15 : lerp(stageH * 1.05, hitY, t / hit);
      this.drawAnimeBall(ctx, ballX, ballY, isHit ? 30 : 40, cyan, t * 2);
      if (isHit && t < hit + 30) {
        for (let k = 1; k <= 3; k++) {
          ctx.strokeStyle = k % 2 ? cyan : '#facc15';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(hitX, hitY, (t - hit) * 4 * k, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
      if (t >= hit && t < hit + 6) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, stageH);
      }
      if (t > hit + 10) this.drawConfetti(ctx, W, stageH, t - hit);
      if (t > 70) {
        const rise = ease((t - 70) / 35);
        this.drawSprite(ctx, c.you, W * 0.8, lerp(stageH + 380, stageH + 30, rise), 380, { animState: 'call_pass', showAura: true, auraColor: cyan });
      }
      if (isHit) this.drawPopTitle(ctx, 'GOOOOOL!!', W * 0.5, stageH * 0.2, 100, cyan, ease((t - hit) / 12));
      if (t > 120) this.drawPopTitle(ctx, `${c.homeLabel} ${c.after[0]} x ${c.after[1]} ${c.awayLabel}`, W * 0.42, stageH * 0.36, 46, '#facc15', ease((t - 120) / 12), W * 0.7);
      const flipped = t > hit + 25;
      this.drawU20Scoreboard(ctx, flipped ? c.after[0] : c.before[0], flipped ? c.after[1] : c.before[1], flipped ? 'FIM DE JOGO' : c.minute, c.homeLabel, c.awayLabel);
    } else {
      // Enquanto o estádio comemora ao fundo, o Rin fica parado em primeiro plano, olhando.
      // (Antes era um close gigante cortado e escurecido com filtro — parecia bug)
      this.drawU20Stadium(ctx, W, stageH, 950, 0.46, c.sign);
      this.drawConfetti(ctx, W, stageH, t + 200, 60);
      // O time comemorando lá no fundo, com você no meio
      this.drawSprite(ctx, c.you, W * 0.72, stageH * 0.7, 170, { animState: 'call_pass', showAura: true, auraColor: cyan });
      // Um véu escuro só do lado do Rin: a festa fica clara, ele fica na sombra
      const shade = ctx.createLinearGradient(0, 0, W * 0.62, 0);
      shade.addColorStop(0, 'rgba(2,6,23,0.78)');
      shade.addColorStop(1, 'rgba(2,6,23,0)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, W, stageH);
      const rinX = W * 0.24;
      const rinFeet = stageH * 0.97;
      this.drawSprite(ctx, c.rin, rinX, rinFeet, 330, { animState: 'idle', frame: 0 });
      // Uma sombra ciano escura tremulando em volta dele (o começo da aura do vestiário)
      if (t > 90) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.55, (t - 90) / 120);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        for (let i = 0; i <= 30; i++) {
          const a = Math.PI + (i / 30) * Math.PI;
          const r = 190 + Math.sin(i * 1.7 + t * 0.12) * 16;
          const px = rinX + Math.cos(a) * r * 0.75;
          const py = rinFeet - 150 + Math.sin(a) * r;
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }
      if (t > 30) this.drawMangaCaption(ctx, '...', rinX + 150, stageH * 0.3, 26);
      if (t > 70) this.drawMangaCaption(ctx, '"Esse gol... era MEU."', rinX + 250, stageH * 0.42, 26, '#0f766e');
      if (t > 130) this.drawMangaCaption(ctx, '(O Rin não comemorou.)', W * 0.66, stageH - 40, 20);
    }
    ctx.restore();

    const tags = [
      { tag: `CENA 1/10 • ${c.minute} — O ÚLTIMO LANCE`, sub: `${c.before[0]} x ${c.before[1]}. O Rin arranca... e ninguém está olhando pra você.` },
      { tag: 'CENA 2/10 • DOIS MONSTROS', sub: `Rin Itoshi contra ${c.rivalName}. Nenhum dos dois vai recuar.` },
      { tag: 'CENA 3/10 • O CHOQUE', sub: 'Os dois se chocam na entrada da área. A bola espirra para o alto!' },
      { tag: 'CENA 4/10 • A SORTE', sub: 'Câmera lenta. O estádio inteiro olha para cima.' },
      { tag: 'CENA 5/10 • O EGO DESPERTA', sub: 'A última peça do quebra-cabeça se encaixa.' },
      { tag: 'CENA 6/10 • SÓ VOCÊ SE MEXE', sub: `O mundo congela. ${pName} já estava embaixo da bola.` },
      { tag: 'CENA 7/10 • LUCK → CHUTE DIRETO!', sub: `A peça dourada da sorte quica no gramado... e sem dominar, o voleio sai antes do carrinho do ${c.defName}!` },
      { tag: 'CENA 8/10 • RUMO AO GOL', sub: `Passa por ${c.defName} e pelas luvas do ${c.gkName}!` },
      { tag: `CENA 9/10 • GOOOL! ${c.homeLabel} ${c.after[0]} x ${c.after[1]}`, sub: c.goalSub },
      { tag: 'CENA 10/10 • O OLHAR DO RIN', sub: 'O estádio inteiro comemora. Menos ele.' }
    ];
    const info = tags[ph] || tags[0];
    this.drawSakugaBar(ctx, W, H, `🎬 ${c.title}`, info.tag, info.sub);
  },

  // ========================================================================
  // A AURA DO RIN (pela imagem de referência): monstros de sombra saindo das
  // costas dele, ciano bem escuro por dentro e contorno ciano aceso, cheios de
  // olhos com anéis e bocas com dentes. (x, y) = de onde saem; k = 0..1 quanto já saiu
  // ========================================================================
  drawRinAbyss(ctx, x, y, scale, t, k) {
    if (k <= 0) return;
    const fill = '#021a1d';
    const edge = '#22d3ee';
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // A nuvem escura girando atrás de tudo
    const cloudR = 300 * scale * k;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = cloudR * (1 + Math.sin(a * 7 + t * 0.05) * 0.1 + Math.sin(a * 13 - t * 0.03) * 0.06);
      const px = x + Math.cos(a) * r;
      const py = y - 40 * scale + Math.sin(a) * r * 0.8;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;
    this.glowStroke(ctx, edge, 3 * scale);
    // Redemoinho dentro da nuvem
    ctx.strokeStyle = 'rgba(34,211,238,0.22)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 7; a += 0.12) {
      const r = (12 + a * 13) * scale * k;
      const px = x + Math.cos(a + t * 0.03) * r;
      const py = y - 40 * scale + Math.sin(a + t * 0.03) * r * 0.8;
      if (a) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
    // Os braços-monstro: [ângulo, comprimento, largura, cabeça, fase]
    const arms = [
      [-2.95, 0.85, 40, 'mouth', 3.3], [-2.6, 1.0, 46, 'eye', 0], [-2.15, 1.25, 54, 'mouth', 1.3], [-1.75, 1.4, 60, 'eye', 2.1],
      [-1.38, 1.2, 50, 'mouth', 0.6], [-1.02, 1.35, 58, 'eye', 2.8], [-0.62, 1.1, 48, 'mouth', 1.9], [-0.25, 0.95, 44, 'eye', 0.4], [0.12, 0.8, 38, 'mouth', 1.1]
    ];
    arms.forEach(([ang, len, wid, head, ph]) => {
      const L = 270 * len * scale * k;
      // Balanço pequeno: os monstros respiram, mas ficam presos nas costas dele
      const a = ang + Math.sin(t * 0.03 + ph) * 0.08;
      const tipX = x + Math.cos(a) * L;
      const tipY = y + Math.sin(a) * L;
      const ca = a + Math.sin(t * 0.025 + ph * 2) * 0.3;
      const cx1 = x + Math.cos(ca) * L * 0.55;
      const cy1 = y + Math.sin(ca) * L * 0.55;
      const left = [];
      const right = [];
      const N = 16;
      for (let i = 0; i <= N; i++) {
        const s = i / N;
        const px = (1 - s) * (1 - s) * x + 2 * (1 - s) * s * cx1 + s * s * tipX;
        const py = (1 - s) * (1 - s) * y + 2 * (1 - s) * s * cy1 + s * s * tipY;
        const dx = 2 * (1 - s) * (cx1 - x) + 2 * s * (tipX - cx1);
        const dy = 2 * (1 - s) * (cy1 - y) + 2 * s * (tipY - cy1);
        const d = Math.hypot(dx, dy) || 1;
        const w = wid * scale * (1 - s * 0.45) * (0.6 + 0.4 * k) * (1 + Math.sin(s * 9 + t * 0.08 + ph) * 0.14);
        left.push([px - (dy / d) * w, py + (dx / d) * w]);
        right.push([px + (dy / d) * w, py - (dx / d) * w]);
      }
      ctx.beginPath();
      left.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      right.reverse().forEach(([px, py]) => ctx.lineTo(px, py));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      this.glowStroke(ctx, edge, 3 * scale);
      this.drawAbyssHead(ctx, tipX, tipY, wid * scale * 1.2 * (0.6 + 0.4 * k), head, t + ph * 40, fill, edge);
    });
    ctx.restore();
  },

  // Contorno de uma peça de quebra-cabeça de lado s centrada em (0, 0): encaixe para
  // fora em cima e à direita, encaixe para dentro embaixo e à esquerda
  puzzlePath(ctx, s) {
    const h = s / 2;
    const r = s * 0.17;
    const A = 2.498; // ângulos onde o círculo do encaixe corta a borda (raio r, centro a 0.6r)
    const B = 0.6435;
    const C = 2.214;
    ctx.beginPath();
    ctx.moveTo(-h, -h);
    ctx.lineTo(-0.8 * r, -h);
    ctx.arc(0, -h - 0.6 * r, r, A, B, false);
    ctx.lineTo(h, -h);
    ctx.lineTo(h, -0.8 * r);
    ctx.arc(h + 0.6 * r, 0, r, -C, C, false);
    ctx.lineTo(h, h);
    ctx.lineTo(0.8 * r, h);
    ctx.arc(0, h - 0.6 * r, r, B, A, true);
    ctx.lineTo(-h, h);
    ctx.lineTo(-h, 0.8 * r);
    ctx.arc(-h + 0.6 * r, 0, r, C, -C, true);
    ctx.closePath();
  },

  // Peça de quebra-cabeça 3D dourada: a forma é extrudada (camadas mais escuras atrás dão a
  // espessura), a face da frente tem gradiente de ouro, brilho na borda e o texto em relevo.
  // spin = giro no eixo vertical (achata e mostra o lado), tilt = inclinação, glow 0..1
  drawPuzzle3D(ctx, x, y, s, spin, tilt, label, glow = 0) {
    ctx.save();
    ctx.translate(x, y);
    if (glow > 0) {
      const g = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 1.6);
      g.addColorStop(0, `rgba(253,224,71,${0.55 * glow})`);
      g.addColorStop(1, 'rgba(253,224,71,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-s * 1.6, -s * 1.6, s * 3.2, s * 3.2);
    }
    ctx.rotate(tilt);
    const cos = Math.cos(spin);
    const sx = Math.max(0.12, Math.abs(cos));
    const depth = Math.max(4, Math.round(s * 0.16));
    const side = Math.sin(spin) >= 0 ? 1 : -1;
    // Espessura: a mesma forma repetida para trás, do escuro para o médio
    for (let i = depth; i >= 1; i--) {
      ctx.save();
      ctx.translate(side * i * (1 - sx) * 1.6 + i * 0.35, i * 0.9);
      ctx.scale(sx, 1);
      this.puzzlePath(ctx, s);
      ctx.fillStyle = i === depth ? '#5c3a00' : i % 2 ? '#8a5a00' : '#9a6700';
      ctx.fill();
      ctx.restore();
    }
    ctx.scale(sx, 1);
    this.puzzlePath(ctx, s);
    const front = cos >= 0;
    const grad = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    grad.addColorStop(0, front ? '#fff7cc' : '#d9a520');
    grad.addColorStop(0.35, front ? '#fcd34d' : '#b8860b');
    grad.addColorStop(1, front ? '#b45309' : '#7c4a03');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = Math.max(2, s * 0.035);
    ctx.strokeStyle = '#78350f';
    ctx.stroke();
    // Brilho fino na borda de cima
    ctx.save();
    this.puzzlePath(ctx, s * 0.84);
    ctx.strokeStyle = 'rgba(255,251,235,0.55)';
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.stroke();
    ctx.restore();
    if (front && label) {
      // Texto menor e puxado para a direita: o encaixe redondo da esquerda cortava a perna
      // do "L" e ele virava um "D" ("DUCK")
      const fs = Math.round(s * 0.22);
      const tx = s * 0.07;
      ctx.font = `900 ${fs}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2, fs * 0.16);
      ctx.strokeStyle = 'rgba(255,251,235,0.85)';
      ctx.strokeText(label, tx, 0);
      ctx.fillStyle = '#78350f';
      ctx.fillText(label, tx, 0);
    }
    ctx.restore();
  },

  // Contorno "neon" barato: um traço largo e transparente embaixo e o fino por cima
  // (o shadowBlur do canvas fazia a mesma coisa, mas travava a cena)
  glowStroke(ctx, color, width) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha *= 0.25;
    ctx.lineWidth = width * 4;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  },

  // Cabeça de um braço da aura: bolha com espinhos e, dentro, um olho ou uma boca com dentes
  drawAbyssHead(ctx, x, y, r, kind, t, fill, edge) {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const rr = r * (i % 2 ? 1.18 : 0.96);
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    this.glowStroke(ctx, edge, 2.5);
    if (kind === 'eye') {
      this.drawAbyssEye(ctx, x, y, r * 0.75, t, edge);
    } else {
      // Boca escancarada com duas fileiras de dentes
      const mw = r * 0.82;
      const mh = r * (0.38 + Math.abs(Math.sin(t * 0.05)) * 0.18);
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(x, y, mw, mh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#e6fffb';
      const n = 7;
      for (let i = 0; i < n; i++) {
        const tx = x - mw * 0.85 + (i + 0.5) * ((mw * 1.7) / n);
        const tw = (mw * 1.7) / n / 2;
        const edgeY = Math.sqrt(Math.max(0, 1 - ((tx - x) / mw) ** 2)) * mh;
        ctx.beginPath();
        ctx.moveTo(tx - tw, y - edgeY);
        ctx.lineTo(tx + tw, y - edgeY);
        ctx.lineTo(tx, y - edgeY + mh * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(tx - tw, y + edgeY);
        ctx.lineTo(tx + tw, y + edgeY);
        ctx.lineTo(tx, y + edgeY - mh * 0.7);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  },

  // Olho da aura (largura 2r) em pixel art: pálpebra no ciano da aura e íris em anéis
  drawAbyssEye(ctx, x, y, r, t, edge = '#22d3ee') {
    this.drawPixelEye(ctx, x, y, (r * 2) / 12, { line: edge, iris: '#021a1d', ring: '#22d3ee', look: Math.round(Math.sin(t * 0.045)), blink: t % 220 < 8 });
  },

  // Olho em pixel art, na mesma linguagem dos bonecos: pálpebra grossa em cima, branco,
  // íris em anéis (ou, com tiny, só um pontinho tremendo: o olho em choque) e pupila.
  // px = tamanho de cada pixel; look = desloca a íris em pixels
  PIXEL_EYE: ['.KKKKKKKKKK.', 'KKKKKKKKKKKK', 'KWWWWWWWWWWK', 'KWWWWWWWWWWK', 'KWWWWWWWWWWK', '.KWWWWWWWWK.', '..KKKKKKKK..'],
  PIXEL_IRIS: ['.IIII.', 'IRRRRI', 'IRPPRI', 'IRRRRI', '.IIII.'],
  PIXEL_IRIS_TINY: ['.II.', 'IPPI', '.II.'],
  drawPixelEye(ctx, cx, cy, px, opts = {}) {
    const pal = { K: opts.line || '#020617', W: opts.white || '#f1f5f9', I: opts.iris || '#0f766e', R: opts.ring || '#5eead4', P: '#000000' };
    const shape = this.PIXEL_EYE;
    const x0 = Math.round(cx - (shape[0].length / 2) * px);
    const y0 = Math.round(cy - (shape.length / 2) * px);
    const size = Math.ceil(px);
    const cell = (c, r, k) => {
      ctx.fillStyle = pal[k];
      ctx.fillRect(Math.round(x0 + c * px), Math.round(y0 + r * px), size, size);
    };
    if (opts.blink) {
      for (let c = 1; c < 11; c++) cell(c, 3, 'K');
      return;
    }
    shape.forEach((row, r) => [...row].forEach((k, c) => k !== '.' && cell(c, r, k)));
    const iris = opts.tiny ? this.PIXEL_IRIS_TINY : this.PIXEL_IRIS;
    const ic = Math.round((12 - iris[0].length) / 2) + (opts.look || 0);
    const ir = opts.tiny ? 2 : 1;
    iris.forEach((row, r) =>
      [...row].forEach((k, c) => {
        if (k !== '.' && shape[ir + r]?.[ic + c] === 'W') cell(ic + c, ir + r, k);
      })
    );
  },

  // Toalha branca caída por cima da cabeça (o Rin sentado no vestiário, como na imagem)
  drawTowelOnHead(ctx, x, feetY, size, color = '#e5e7eb') {
    const u = size / 36;
    const top = feetY - size * 0.87;
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = Math.max(2, u * 0.35);
    ctx.beginPath();
    ctx.moveTo(x - 9.5 * u, top + SPRITE_MAPY(15) * u);
    ctx.quadraticCurveTo(x - 10.5 * u, top + SPRITE_MAPY(2) * u, x, top + SPRITE_MAPY(1.2) * u);
    ctx.quadraticCurveTo(x + 10.5 * u, top + SPRITE_MAPY(2) * u, x + 9.5 * u, top + SPRITE_MAPY(15) * u);
    ctx.lineTo(x + 7 * u, top + SPRITE_MAPY(14) * u);
    ctx.quadraticCurveTo(x + 7.5 * u, top + SPRITE_MAPY(7) * u, x, top + SPRITE_MAPY(6.5) * u);
    ctx.quadraticCurveTo(x - 7.5 * u, top + SPRITE_MAPY(7) * u, x - 7 * u, top + SPRITE_MAPY(14) * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Dobras do pano e a sombra da toalha caindo sobre os olhos (some aos poucos)
    ctx.strokeStyle = 'rgba(100,116,139,0.6)';
    [-4, 0, 4].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * u, top + SPRITE_MAPY(2) * u);
      ctx.quadraticCurveTo(x + dx * 1.3 * u, top + SPRITE_MAPY(4.5) * u, x + dx * 1.5 * u, top + SPRITE_MAPY(6.4) * u);
      ctx.stroke();
    });
    const sh = ctx.createLinearGradient(0, top + SPRITE_MAPY(6.5) * u, 0, top + SPRITE_MAPY(11.5) * u);
    sh.addColorStop(0, 'rgba(2,6,23,0.7)');
    sh.addColorStop(1, 'rgba(2,6,23,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.moveTo(x - 7 * u, top + SPRITE_MAPY(14) * u);
    ctx.quadraticCurveTo(x - 7.5 * u, top + SPRITE_MAPY(7) * u, x, top + SPRITE_MAPY(6.5) * u);
    ctx.quadraticCurveTo(x + 7.5 * u, top + SPRITE_MAPY(7) * u, x + 7 * u, top + SPRITE_MAPY(14) * u);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  // ========================================================================
  // A COLETIVA DO SAE: a sala de imprensa → o Sae diz o SEU nome → o Rin ouve
  // pela TV do corredor, os olhos se arregalam e a tela inteira quebra
  // ========================================================================
  drawSaeInterview(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const find = (id) => (window.BLUE_LOCK_CHARACTERS || []).find((c) => c.id === id) || {};
    // Depois do Blue Lock x Sub-20 do Japão: o Sae com a camisa da Sub-20, o Rin com a do Blue Lock
    const sae = Object.assign({}, find('sae'), { jerseyPrimary: '#ffffff', jerseySecondary: '#dc2626' });
    const rin = Object.assign({}, find('rin'), { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' });
    const pName = (window.App?.state?.profile?.name || 'VOCÊ').toUpperCase();
    const flashes = (n, seed) => {
      for (let i = 0; i < n; i++) {
        if ((this.sakugaFrame * 7 + i * 13 + seed) % 23 > 1) continue;
        const fx = ((i * 197 + seed * 31) % W);
        const fy = stageH * (0.55 + ((i * 53) % 40) / 100);
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 90);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(fx - 90, fy - 90, 180, 180);
      }
    };
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    if (this.sakugaPhase === 0) {
      // Sala de imprensa: painel de patrocínio, mesa com microfones e os flashes
      ctx.fillStyle = '#0b1120';
      ctx.fillRect(0, 0, W, stageH);
      ctx.font = '900 15px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      for (let r = 0; r < 9; r++) {
        for (let col = 0; col < 7; col++) {
          ctx.fillStyle = (r + col) % 2 ? 'rgba(56,189,248,0.22)' : 'rgba(250,204,21,0.18)';
          ctx.fillText((r + col) % 2 ? 'BLUE LOCK vs U-20' : 'JFU JAPAN', col * 200 + (r % 2) * 100, 40 + r * 52);
        }
      }
      this.drawSprite(ctx, sae, W * 0.5, stageH * 0.95, 330, { animState: 'idle', frame: 0 });
      ctx.fillStyle = '#111827';
      ctx.fillRect(W * 0.18, stageH * 0.66, W * 0.64, stageH * 0.34);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(W * 0.18, stageH * 0.66, W * 0.64, 8);
      [-60, -20, 20, 60].forEach((dx, i) => {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(W * 0.5 + dx * 1.4, stageH * 0.66);
        ctx.lineTo(W * 0.5 + dx * 0.6, stageH * 0.52);
        ctx.stroke();
        ctx.fillStyle = ['#ef4444', '#facc15', '#38bdf8', '#22c55e'][i];
        ctx.fillRect(W * 0.5 + dx * 0.6 - 9, stageH * 0.5, 18, 20);
      });
      // Os repórteres de costas, na frente
      for (let i = 0; i < 9; i++) {
        const rx = W * 0.05 + i * W * 0.115;
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(rx, stageH * 0.93, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(rx - 52, stageH * 0.96, 104, 60);
        if (i % 3 === 1) ctx.fillRect(rx + 10, stageH * 0.8, 34, 24);
      }
      flashes(14, 3);
      if (t > 20) this.drawMangaCaption(ctx, '"Sae Itoshi! Quem do Blue Lock mais te impressionou hoje?"', W * 0.5, 66, 22);
    } else if (this.sakugaPhase === 1) {
      // Close no Sae: frio, sem pressa. E o nome sai.
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, W, stageH);
      this.drawSprite(ctx, sae, W * 0.3, stageH * 1.32, 600, { animState: 'idle', frame: 0 });
      const vig = ctx.createLinearGradient(W * 0.45, 0, W, 0);
      vig.addColorStop(0, 'rgba(5,7,15,0)');
      vig.addColorStop(0.25, 'rgba(5,7,15,0.92)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, stageH);
      if (t > 20) this.drawMangaCaption(ctx, '"...Tem um."', W * 0.72, 90, 24);
      if (t > 70) this.drawMangaCaption(ctx, '"Um jogador daquele time que é muito bom."', W * 0.7, 160, 22);
      if (t > 130) {
        if (t < 140) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillRect(0, 0, W, stageH);
        }
        flashes(20, 7);
        this.drawPopTitle(ctx, `${pName}.`, W * 0.72, stageH * 0.62, 96, '#f8fafc', ease((t - 130) / 10), W * 0.5);
      }
    } else {
      // O Rin ouvindo pela TV do corredor → os olhos se arregalam → a tela quebra
      const crackAt = 95;
      const fallAt = 150;
      if (!this._shatterCv) this._shatterCv = document.createElement('canvas');
      const src = this._shatterCv;
      if (src.width !== W || src.height !== stageH) {
        src.width = W;
        src.height = stageH;
      }
      const sctx = src.getContext('2d');
      sctx.fillStyle = '#020617';
      sctx.fillRect(0, 0, W, stageH);
      const size = W * 0.95;
      const u = size / 36;
      const eyeY = stageH * 0.48;
      const top = eyeY - SPRITE_MAPY(10.1) * u;
      this.drawSprite(sctx, rin, W / 2, top + size * 0.87, size, { animState: 'idle', frame: 0 });
      sctx.fillStyle = 'rgba(2,6,23,0.4)';
      sctx.fillRect(0, 0, W, stageH);
      // A luz azul da TV de um lado do rosto
      const tv = sctx.createLinearGradient(0, 0, W, 0);
      tv.addColorStop(0, 'rgba(56,189,248,0.28)');
      tv.addColorStop(0.5, 'rgba(56,189,248,0)');
      tv.addColorStop(1, 'rgba(0,0,0,0.6)');
      sctx.fillStyle = tv;
      sctx.fillRect(0, 0, W, stageH);
      // Os olhos se arregalam (em pixel, como o resto do boneco): a pupila vira um ponto tremendo
      if (t > 45) {
        [-1, 1].forEach((s) => {
          const look = t > 59 ? Math.round((Math.random() - 0.5) * 2) : 0;
          this.drawPixelEye(sctx, W / 2 + s * 3.3 * u, eyeY, u * 0.3, { tiny: t > 59, look, line: '#020617', iris: '#0f766e' });
        });
      }
      if (t > 15) this.drawMangaCaption(sctx, `(TV) "...${pName}."`, W * 0.24, 70, 22, '#1e3a8a');
      if (t > 60) this.drawMangaCaption(sctx, '...o quê?', W * 0.78, stageH - 50, 26);
      // A quebra: rachaduras saindo do olho; depois os cacos caem e sobra o preto
      const cx = W / 2 - 3.3 * u;
      const shards = this.getShards(W, stageH, cx, eyeY);
      if (t < fallAt) {
        ctx.drawImage(src, 0, 0);
        if (t >= crackAt) {
          const rings = Math.min(shards.rings, 1 + Math.floor((t - crackAt) / 6));
          this.drawCracks(ctx, shards, rings);
          if (t < crackAt + 5) {
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillRect(0, 0, W, stageH);
          }
          this.drawPopTitle(ctx, 'CRACK', W * 0.8, stageH * 0.2, 80, '#f8fafc', ease((t - crackAt) / 8));
        }
      } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, stageH);
        const f = t - fallAt;
        shards.list.forEach((sh) => {
          const d = Math.max(0, f - sh.delay);
          ctx.save();
          ctx.translate(sh.cx + sh.vx * d, sh.cy + sh.vy * d + 0.4 * d * d);
          ctx.rotate(sh.vr * d);
          ctx.translate(-sh.cx, -sh.cy);
          ctx.beginPath();
          sh.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
          ctx.closePath();
          ctx.save();
          ctx.clip();
          ctx.drawImage(src, 0, 0);
          ctx.restore();
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        });
        if (f > 40) this.drawPopTitle(ctx, '...', W / 2, stageH * 0.5, 60, '#64748b', ease((f - 40) / 20));
      }
    }
    ctx.restore();
    const tags = [
      { tag: 'CENA 1/3 • A SALA DE IMPRENSA', sub: 'A Sub-20 perdeu para o Blue Lock. Centenas de flashes em cima do Sae Itoshi.' },
      { tag: 'CENA 2/3 • O NOME', sub: '"Um jogador daquele time que é muito bom..."' },
      { tag: 'CENA 3/3 • O RIN', sub: 'No corredor, o Rin ouve tudo pela TV. O irmão disse outro nome.' }
    ];
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '🎤 A COLETIVA DO SAE', info.tag, info.sub);
  },

  // Cacos da tela quebrando: anéis em volta de (cx, cy) cortados em fatias, com as
  // pontas compartilhadas (as rachaduras batem). Guardados por tamanho de tela.
  getShards(W, H, cx, cy) {
    const key = `${W}x${H}x${Math.round(cx)}x${Math.round(cy)}`;
    if (this._shards?.key === key) return this._shards;
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const radii = [0, 60, 150, 290, 480, Math.hypot(W, H)];
    const n = 13;
    const angles = Array.from({ length: n }, (_, j) => (j / n) * Math.PI * 2 + (rnd() - 0.5) * 0.35);
    const V = radii.map((r, i) =>
      angles.map((a) => {
        if (i === 0) return [cx, cy];
        const rr = r * (i === radii.length - 1 ? 1 : 0.85 + rnd() * 0.3);
        const aa = a + (rnd() - 0.5) * 0.15;
        return [cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr];
      })
    );
    const list = [];
    for (let i = 0; i < radii.length - 1; i++) {
      for (let j = 0; j < n; j++) {
        const j2 = (j + 1) % n;
        const pts = i === 0 ? [V[0][j], V[1][j], V[1][j2]] : [V[i][j], V[i][j2], V[i + 1][j2], V[i + 1][j]];
        const sx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
        const sy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        const dx = sx - cx;
        const dy = sy - cy;
        const d = Math.hypot(dx, dy) || 1;
        list.push({ pts, cx: sx, cy: sy, vx: (dx / d) * (1 + rnd() * 3), vy: (dy / d) * (1 + rnd() * 2) - 2, vr: (rnd() - 0.5) * 0.06, delay: i * 5 + rnd() * 8 });
      }
    }
    this._shards = { key, list, V, rings: radii.length - 1, n };
    return this._shards;
  },

  drawCracks(ctx, sh, rings) {
    ctx.save();
    const line = (a, b) => {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    };
    [['#020617', 6], ['#f8fafc', 2.5]].forEach(([color, width]) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      for (let i = 0; i < rings; i++) {
        for (let j = 0; j < sh.n; j++) {
          line(sh.V[i][j], sh.V[i + 1][j]);
          if (i > 0) line(sh.V[i][j], sh.V[i][(j + 1) % sh.n]);
        }
      }
    });
    ctx.restore();
  },

  // ========================================================================
  // O RIVAL MORTAL: o vestiário com a única luz acesa → o olho do Rin por baixo
  // da toalha → a aura (monstros ciano saindo dele) e "VOCÊ É O MEU RIVAL."
  // ========================================================================
  drawRinRival(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const find = (id) => (window.BLUE_LOCK_CHARACTERS || []).find((c) => c.id === id) || {};
    // Os dois com a camisa do Blue Lock (o Rin é o 10, como na referência)
    const blueLock = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
    const rin = Object.assign({}, find('rin'), blueLock, { angry: true });
    const you = Object.assign({}, this.getSpeakerCharData('VOCÊ'), blueLock);
    const bench = (y) => {
      ctx.fillStyle = '#3f2a17';
      ctx.fillRect(W * 0.22, y, W * 0.56, 22);
      ctx.fillStyle = '#24170c';
      ctx.fillRect(W * 0.26, y + 22, 14, stageH);
      ctx.fillRect(W * 0.74 - 14, y + 22, 14, stageH);
    };
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    if (this.sakugaPhase === 0) {
      // O vestiário apagado, uma luz em cima do Rin; você na porta
      this.drawBgLockerRoom(ctx, W, stageH);
      // Vestiário apagado e azulado
      ctx.fillStyle = 'rgba(6,22,58,0.72)';
      ctx.fillRect(0, 0, W, stageH);
      const cone = ctx.createRadialGradient(W * 0.55, stageH * 0.45, 20, W * 0.55, stageH * 0.45, W * 0.38);
      cone.addColorStop(0, 'rgba(147,197,253,0.26)');
      cone.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cone;
      ctx.fillRect(0, 0, W, stageH);
      const sob = t > 60 && t < 140 ? Math.sin(t * 0.9) * 1.5 : 0;
      const feet = stageH * 0.98;
      const rinOpts = { animState: 'idle', frame: 0 };
      this.drawSpriteDim(ctx, rin, W * 0.55, feet + sob, 330, rinOpts, 0.3, '20,50,110');
      // A cara dele na sombra preta: ninguém vê o rosto do Rin agora
      this.drawFaceShadow(ctx, rin, W * 0.55, feet + sob, 330, rinOpts, 0.95);
      this.drawTowelOnHead(ctx, W * 0.55, feet + sob, 330, '#b8c4d6');
      bench(stageH * 0.8);
      ctx.save();
      ctx.globalAlpha = 0.95;
      this.drawSilhouette(ctx, you, W * 0.12, stageH * 1.02, 300, { animState: 'idle', facing: 'back' }, '#020617');
      ctx.restore();
      if (t > 20) this.drawMangaCaption(ctx, 'Só uma luz ficou acesa.', W * 0.3, 70, 22);
      if (t > 70) this.drawMangaCaption(ctx, '"...pra nós dois?"', W * 0.78, 150, 24, '#0f766e');
      if (t > 130) this.drawMangaCaption(ctx, '"Hah."', W * 0.8, 215, 26, '#0f766e');
    } else if (this.sakugaPhase === 1) {
      // Close: um olho arregalado por baixo da toalha, a pupila minúscula
      ctx.fillStyle = '#010409';
      ctx.fillRect(0, 0, W, stageH);
      const size = W * 0.95;
      const u = size / 36;
      const eyeY = stageH * 0.5;
      const top = eyeY - SPRITE_MAPY(10.1) * u;
      const feet = top + size * 0.87;
      // Close gigante com fundo preto: desenhar e passar um véu na tela custa bem menos
      // que escurecer o boneco num canvas separado do tamanho dele
      this.drawSprite(ctx, rin, W / 2, feet, size, { animState: 'idle', frame: 0 });
      ctx.fillStyle = 'rgba(2,10,28,0.55)';
      ctx.fillRect(0, 0, W, stageH);
      // Rosto na sombra preta (no close é só um degradê na tela, o fundo já é preto);
      // só o olho, desenhado por cima, aparece
      const faceShade = ctx.createLinearGradient(0, top, 0, top + SPRITE_MAPY(14.5) * u);
      faceShade.addColorStop(0, 'rgba(0,0,0,1)');
      faceShade.addColorStop(0.72, 'rgba(0,0,0,1)');
      faceShade.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = faceShade;
      ctx.fillRect(0, 0, W, top + SPRITE_MAPY(14.5) * u);
      this.drawTowelOnHead(ctx, W / 2, feet, size, '#7b818b');
      const ex = W / 2 - 3.3 * u;
      const open = ease((t - 20) / 16);
      if (open > 0) {
        const g = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, u * 5);
        g.addColorStop(0, 'rgba(34,211,238,0.35)');
        g.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.fillStyle = g;
        ctx.fillRect(ex - u * 5, eyeY - u * 5, u * 10, u * 10);
        this.drawPixelEye(ctx, ex + Math.round((Math.random() - 0.5) * 2) * u * 0.4, eyeY, u * 0.4, { tiny: true, blink: open < 0.6, line: '#010409', iris: '#0f766e' });
      }
      // A sombra da toalha cobre o resto do rosto
      const sh = ctx.createLinearGradient(W / 2 + u * 1, 0, W / 2 + u * 7, 0);
      sh.addColorStop(0, 'rgba(1,4,9,0)');
      sh.addColorStop(1, 'rgba(1,4,9,0.9)');
      ctx.fillStyle = sh;
      ctx.fillRect(0, 0, W, stageH);
      if (t > 45) this.drawMangaCaption(ctx, '"Não esquece."', W * 0.78, 90, 28);
      if (t > 105) this.drawMangaCaption(ctx, '"Isso quer dizer que eu VOU te matar."', W * 0.7, stageH - 60, 26, '#0f766e');
    } else {
      // A aura: os monstros ciano saindo dele e tomando o vestiário
      const k = ease(t / 100);
      const zoom = 1 + ease(t / 300) * 0.08;
      const shake = t > 20 && t < 120 ? (Math.random() - 0.5) * 6 : 0;
      ctx.fillStyle = '#000405';
      ctx.fillRect(0, 0, W, stageH);
      ctx.save();
      ctx.translate(W / 2 + shake, stageH / 2 + shake);
      ctx.scale(zoom, zoom);
      ctx.translate(-W / 2, -stageH / 2);
      const glow = ctx.createRadialGradient(W * 0.56, stageH * 0.42, 30, W * 0.56, stageH * 0.42, W * 0.6);
      glow.addColorStop(0, 'rgba(8,145,178,0.28)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, stageH);
      const feet = stageH * 1.02;
      this.drawRinAbyss(ctx, W * 0.56, stageH * 0.52, 1.05, t, k);
      this.drawSpriteDim(ctx, rin, W * 0.56, feet, 360, { animState: 'idle', frame: 0 }, 0.5);
      // Quando a aura sai, a sombra do rosto clareia bastante: agora dá pra ver a raiva
      this.drawFaceShadow(ctx, rin, W * 0.56, feet, 360, { animState: 'idle', frame: 0 }, 0.95 * (1 - 0.75 * k));
      this.drawTowelOnHead(ctx, W * 0.56, feet, 360, '#8a8f98');
      bench(stageH * 0.84);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.97;
      this.drawSilhouette(ctx, you, W * 0.1, stageH * 1.08, 360, { animState: 'idle', facing: 'back' }, '#000000');
      ctx.restore();
      if (t > 110) this.drawPopTitle(ctx, 'A PARTIR DESTE MOMENTO...', W * 0.5, stageH * 0.12, 34, '#a5f3fc', ease((t - 110) / 14), W * 0.8);
      if (t > 170) this.drawPopTitle(ctx, 'VOCÊ É O MEU RIVAL.', W * 0.5, stageH * 0.26, 76, '#22d3ee', ease((t - 170) / 12), W * 0.92);
    }
    ctx.restore();
    const tags = [
      { tag: 'CENA 1/3 • O VESTIÁRIO', sub: 'O Rin, sozinho, com a toalha cobrindo a cabeça.' },
      { tag: 'CENA 2/3 • NÃO ESQUECE', sub: 'Por baixo da toalha, um olho que nunca mais vai te esquecer.' },
      { tag: 'CENA 3/3 • O RIVAL MORTAL', sub: '"A partir deste momento... você é o meu rival."' }
    ];
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '🩸 O RIVAL MORTAL', info.tag, info.sub);
  },

  // Torcida da arquibancada (silhuetas com cachecol): rows = [{ y, scale }], cheer 0..1
  drawStandsCrowd(ctx, W, rows, t, scarf, cheer = 0) {
    rows.forEach((row, r) => {
      ctx.fillStyle = '#3f0d12';
      ctx.fillRect(0, row.y + 18 * row.scale, W, 26 * row.scale);
      const step = 64 * row.scale;
      for (let i = -1; i * step < W + step; i++) {
        const x = i * step + (r % 2) * step * 0.5;
        const seed = (i * 7 + r * 13) % 5;
        const jump = cheer > 0 && (seed + Math.floor(t / 12)) % 3 === 0 ? -8 * row.scale * cheer : 0;
        const y = row.y + jump;
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(x, y - 22 * row.scale, 12 * row.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 20 * row.scale, y - 10 * row.scale, 40 * row.scale, 34 * row.scale);
        // Cachecol listrado nas cores do time
        ctx.fillStyle = scarf[seed % scarf.length];
        ctx.fillRect(x - 14 * row.scale, y - 9 * row.scale, 28 * row.scale, 5 * row.scale);
        if (jump) {
          ctx.fillStyle = '#111827';
          ctx.fillRect(x - 22 * row.scale, y - 40 * row.scale, 6 * row.scale, 24 * row.scale);
          ctx.fillRect(x + 16 * row.scale, y - 40 * row.scale, 6 * row.scale, 24 * row.scale);
        }
      }
    });
  },

  // ========================================================================
  // O FOX NA ARQUIBANCADA (jogo contra a Inglaterra): sem mostrar o rosto — a
  // torcida inglesa gritando e ele sentado parado → close no rosto na sombra, só o
  // sorriso: "Finalmente... um monstro" → ele rindo, girando o dedo
  // ========================================================================
  drawFoxWatch(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const fox = this.getSpeakerCharData('FOX');
    const scarf = ['#f8fafc', '#dc2626', '#f8fafc', '#1e3a8a'];
    const shadowed = (x, feet, size) => {
      this.drawSprite(ctx, fox, x, feet, size, { animState: 'idle', frame: 0 });
      this.drawFaceShadow(ctx, fox, x, feet, size, { animState: 'idle', frame: 0 }, 1, 11.6, 12.4);
    };
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    const bg = ctx.createLinearGradient(0, 0, 0, stageH);
    bg.addColorStop(0, '#0b1023');
    bg.addColorStop(1, '#1c0b12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, stageH);
    if (this.sakugaPhase === 0) {
      // A arquibancada inglesa: todo mundo pulando... menos um homem sentado
      const pan = ease(t / 170) * 140;
      ctx.save();
      ctx.translate(-pan, 0);
      this.drawStandsCrowd(ctx, W + 300, [{ y: stageH * 0.22, scale: 0.6 }, { y: stageH * 0.42, scale: 0.8 }], t, scarf, 1);
      const fx = W * 0.62 + pan;
      shadowed(fx, stageH * 0.98, 260);
      this.drawStandsCrowd(ctx, W + 300, [{ y: stageH * 0.86, scale: 1.15 }], t, scarf, 1);
      ctx.restore();
      // Um foco de sombra em volta dele
      const spot = ctx.createRadialGradient(W * 0.62, stageH * 0.6, 40, W * 0.62, stageH * 0.6, W * 0.45);
      spot.addColorStop(0, 'rgba(0,0,0,0)');
      spot.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, W, stageH);
      if (t > 15) this.drawMangaCaption(ctx, 'Arquibancada inglesa. Todo mundo grita.', 36, 58, 22, '#090d16', 'left');
      if (t > 95) this.drawMangaCaption(ctx, 'Menos um.', 36, 120, 26, '#7f1d1d', 'left');
    } else if (this.sakugaPhase === 1) {
      // Close: o rosto inteiro na sombra, só o sorrisão aparece
      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, W, stageH);
      const size = 760;
      const u = size / 36;
      const mouthY = stageH * 0.5;
      const top = mouthY - 12.6 * u;
      const feet = top + size * 0.87;
      const x = W * 0.36;
      // Brilho vermelho bem fraco atrás da cabeça, para o contorno do cabelo aparecer
      const rim = ctx.createRadialGradient(x, top + SPRITE_MAPY(6) * u, 20, x, top + SPRITE_MAPY(6) * u, size * 0.5);
      rim.addColorStop(0, 'rgba(127,29,29,0.45)');
      rim.addColorStop(1, 'rgba(127,29,29,0)');
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, W, stageH);
      shadowed(x, feet + Math.sin(t * 0.08) * 2, size);
      const lines = [
        { at: 20, text: '...hehe.', y: 0.16, s: 22 },
        { at: 75, text: '"Finalmente."', y: 0.36, s: 28 },
        { at: 130, text: '"Depois de tanto tempo..."', y: 0.56, s: 26 },
        { at: 180, text: '"...eu vi um MONSTRO."', y: 0.78, s: 32 }
      ];
      lines.forEach((l) => {
        if (t > l.at) this.drawMangaCaption(ctx, l.text, W * 0.76, stageH * l.y, l.s, l.at >= 180 ? '#7f1d1d' : '#090d16');
      });
    } else {
      // Ele rindo sentado no meio da festa inglesa, girando o dedo
      this.drawStandsCrowd(ctx, W, [{ y: stageH * 0.3, scale: 0.75 }], t, scarf, 0.6);
      const fx = W * 0.5;
      shadowed(fx, stageH * 1.05, 380);
      this.drawStandsCrowd(ctx, W, [{ y: stageH * 0.95, scale: 1.3 }], t, scarf, 0.6);
      const hx = fx + 380 * 0.3;
      const hy = stageH * 1.05 - 380 * 0.48;
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 3;
      for (let r = 0; r < 3; r++) {
        const a0 = t * 0.25 + r * 2.1;
        ctx.beginPath();
        ctx.arc(hx, hy, 16 + r * 8, a0, a0 + 1.6);
        ctx.stroke();
      }
      if (t > 20) this.drawMangaCaption(ctx, 'TWIRL', hx + 70, hy - 30, 18);
      if (t > 40) this.drawPopTitle(ctx, 'HEHEHEHE...', W * 0.5, stageH * 0.16, 54, '#fca5a5', ease((t - 40) / 14), W * 0.8);
      if (t > 100) this.drawMangaCaption(ctx, '(Ninguém em volta percebeu que ele estava sorrindo.)', W * 0.5, stageH - 30, 18);
    }
    ctx.restore();
    const tags = [
      { tag: 'CENA 1/3 • A ARQUIBANCADA', sub: 'A torcida inglesa pula. Um homem de terno continua sentado.' },
      { tag: 'CENA 2/3 • O SORRISO', sub: 'O rosto dele fica na sombra. Só o sorriso aparece.' },
      { tag: 'CENA 3/3 • ???', sub: 'Quem é esse homem?' }
    ];
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '🦊 ENQUANTO ISSO, NA ARQUIBANCADA...', info.tag, info.sub);
  },

  // Sorrisão do Fox flutuando no escuro (dentes enfileirados e olhos com anéis)
  drawFoxGrin(ctx, cx, cy, w, k) {
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k);
    ctx.translate(cx, cy);
    const mouth = () => {
      ctx.beginPath();
      ctx.moveTo(-w / 2, -0.04 * w);
      ctx.quadraticCurveTo(0, 0.14 * w, w / 2, -0.04 * w);
      ctx.quadraticCurveTo(0, 0.5 * w, -w / 2, -0.04 * w);
      ctx.closePath();
    };
    mouth();
    this.glowStroke(ctx, '#b91c1c', w * 0.02);
    ctx.fillStyle = '#f5f5f4';
    ctx.fill();
    ctx.save();
    mouth();
    ctx.clip();
    ctx.strokeStyle = '#0c0a09';
    ctx.lineWidth = Math.max(2, w * 0.008);
    for (let i = -7; i <= 7; i++) {
      const x = (i / 8) * (w / 2);
      ctx.beginPath();
      ctx.moveTo(x, -0.1 * w);
      ctx.lineTo(x * 0.96, 0.5 * w);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0.1 * w);
    ctx.quadraticCurveTo(0, 0.3 * w, w / 2, 0.1 * w);
    ctx.lineWidth = Math.max(3, w * 0.014);
    ctx.stroke();
    ctx.restore();
    mouth();
    ctx.strokeStyle = '#0c0a09';
    ctx.lineWidth = Math.max(4, w * 0.02);
    ctx.stroke();
    // Os olhos com a íris em anéis, em pixel art como o resto do jogo
    [-1, 1].forEach((s) => this.drawPixelEye(ctx, s * 0.27 * w, -0.3 * w, 0.019 * w, { line: '#0c0a09', iris: '#1c1917', ring: '#f5f5f4', look: s > 0 ? -1 : 1 }));
    ctx.restore();
  },

  // ========================================================================
  // A ENTRADA DO FOX: as luzes do campo apagam uma por uma → só o sorriso e os
  // olhos no escuro, rindo → o holofote acende e o título dele entra na tela
  // ========================================================================
  drawFoxEntrance(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const fox = this.getSpeakerCharData('FOX');
    const you = this.getSpeakerCharData('VOCÊ');
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    if (this.sakugaPhase === 0) {
      // O campo vazio do Blue Lock de madrugada; os refletores apagam um por um
      const offAt = [40, 72, 104, 136];
      const lit = offAt.filter((a) => t < a).length;
      const dim = 0.25 + (lit / 4) * 0.75;
      const hy = stageH * 0.42;
      ctx.fillStyle = '#020308';
      ctx.fillRect(0, 0, W, stageH);
      ctx.fillStyle = `rgba(15,23,42,${dim})`;
      ctx.fillRect(0, hy - 150, W, 150);
      for (let y = hy - 140; y < hy - 10; y += 16) {
        for (let x = 0; x < W; x += 22) {
          ctx.fillStyle = `rgba(51,65,85,${dim * 0.8})`;
          ctx.fillRect(x, y, 16, 6);
        }
      }
      for (let i = 0; i < 8; i++) {
        const y0 = hy + (stageH - hy) * ((i / 8) ** 1.4);
        const y1 = hy + (stageH - hy) * (((i + 1) / 8) ** 1.4);
        ctx.fillStyle = i % 2 === 0 ? `rgba(21,128,61,${dim})` : `rgba(22,101,52,${dim})`;
        ctx.fillRect(0, y0, W, y1 - y0 + 1);
      }
      [0.1, 0.36, 0.64, 0.9].forEach((fx, i) => {
        const lx = W * fx;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(lx - 3, 40, 6, hy - 150);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(lx - 34, 22, 68, 26);
        if (t < offAt[i]) {
          const g = ctx.createRadialGradient(lx, 36, 4, lx, 36, 160);
          g.addColorStop(0, 'rgba(255,255,255,0.9)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(lx - 160, -120, 320, 320);
        } else if (t < offAt[i] + 25) {
          this.drawMangaCaption(ctx, 'CLACK.', lx, 100, 20);
        }
      });
      this.drawSprite(ctx, you, W * 0.5, stageH * 0.9, 190, { animState: 'idle', frame: 0 });
      this.drawAnimeBall(ctx, W * 0.5 + 60, stageH * 0.9 - 12, 13, 'rgba(0,0,0,0)', 0);
      ctx.fillStyle = `rgba(0,0,0,${0.75 - dim * 0.75})`;
      ctx.fillRect(0, 0, W, stageH);
      if (t > 150) this.drawMangaCaption(ctx, '...Quem tá aí?', W * 0.5, stageH * 0.55, 22);
    } else if (this.sakugaPhase === 1) {
      // Só o sorriso no escuro, rindo cada vez mais alto
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, stageH);
      const red = ctx.createRadialGradient(W / 2, stageH * 0.45, 20, W / 2, stageH * 0.45, W * 0.55);
      red.addColorStop(0, `rgba(127,29,29,${0.1 + ease(t / 160) * 0.3})`);
      red.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = red;
      ctx.fillRect(0, 0, W, stageH);
      const wob = Math.sin(t * 0.12) * 4;
      this.drawFoxGrin(ctx, W / 2, stageH * 0.5 + wob, 300 + ease(t / 200) * 260, ease((t - 10) / 40));
      const laughs = [
        { at: 40, text: 'hehe...', x: 0.18, y: 0.2, s: 20 },
        { at: 85, text: 'Hehehe...', x: 0.8, y: 0.3, s: 26 },
        { at: 130, text: 'HEHEHEHE!!', x: 0.24, y: 0.82, s: 34 },
        { at: 165, text: 'HEHEHEHEHE!!!', x: 0.76, y: 0.88, s: 40 }
      ];
      laughs.forEach((l) => {
        if (t > l.at) this.drawMangaCaption(ctx, l.text, W * l.x, stageH * l.y, l.s, '#7f1d1d');
      });
    } else {
      // O holofote acende: o Fox na arquibancada, girando o dedo, e o título dele
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, stageH);
      const fx = W * 0.62;
      const cone = ctx.createLinearGradient(fx, 0, fx, stageH);
      cone.addColorStop(0, 'rgba(254,243,199,0.55)');
      cone.addColorStop(1, 'rgba(254,243,199,0.08)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(fx - 40, 0);
      ctx.lineTo(fx + 40, 0);
      ctx.lineTo(fx + 230, stageH);
      ctx.lineTo(fx - 230, stageH);
      ctx.closePath();
      ctx.fill();
      // Os degraus da arquibancada sob a luz
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(68,64,60,0.85)' : 'rgba(87,83,78,0.85)';
        ctx.fillRect(fx - 260, stageH * (0.78 + i * 0.045), 520, stageH * 0.045);
      }
      const size = 430;
      const feet = stageH * 0.86;
      this.drawSprite(ctx, fox, fx, feet, size, { animState: 'idle', frame: 0 });
      // Os olhos com anéis da referência, abertos (em pixel)
      const u = size / 36;
      const eyeY = feet - size * 0.87 + SPRITE_MAPY(10.1) * u;
      [-1, 1].forEach((s) => this.drawPixelEye(ctx, fx + s * 3.3 * u, eyeY, u * 0.24, { line: '#0c0a09', iris: '#1c1917', ring: '#f5f5f4', look: s > 0 ? -1 : 1 }));
      // O dedo girando (TWIRL)
      const hx = fx + size * 0.3;
      const hy = feet - size * 0.48;
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 3;
      for (let r = 0; r < 3; r++) {
        const a0 = t * 0.25 + r * 2.1;
        ctx.beginPath();
        ctx.arc(hx, hy, 18 + r * 9, a0, a0 + 1.6);
        ctx.stroke();
      }
      if (t > 25) this.drawMangaCaption(ctx, 'TWIRL', hx + 70, hy - 20, 18);
      if (t < 8) {
        ctx.fillStyle = `rgba(255,255,255,${1 - t / 8})`;
        ctx.fillRect(0, 0, W, stageH);
      }
      // O cartão de apresentação do personagem
      const k = ease((t - 45) / 16);
      if (k > 0) {
        ctx.save();
        ctx.translate(W * 0.25, stageH * 0.45);
        ctx.rotate(-0.06);
        ctx.globalAlpha = k;
        ctx.fillStyle = '#0c0a09';
        ctx.fillRect(-210, -120, 420, 200);
        ctx.strokeStyle = '#f5f5f4';
        ctx.lineWidth = 4;
        ctx.strokeRect(-210, -120, 420, 200);
        ctx.fillStyle = '#f5f5f4';
        ctx.font = '900 18px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TÉCNICO DA INGLATERRA SUB-20', 0, -78);
        ctx.restore();
        this.drawPopTitle(ctx, 'FOX', W * 0.25, stageH * 0.45 + 40, 130, '#f5f5f4', k);
      }
      if (t > 140) this.drawMangaCaption(ctx, '"Boa noite, campeão."', W * 0.64, 70, 24, '#7f1d1d');
    }
    ctx.restore();
    const tags = [
      { tag: 'CENA 1/3 • AS LUZES', sub: 'Madrugada. Os refletores do Blue Lock apagam, um por um.' },
      { tag: 'CENA 2/3 • O SORRISO', sub: 'No escuro, alguém está rindo.' },
      { tag: 'CENA 3/3 • A RAPOSA', sub: 'Fox. Ninguém sabe o que ele quer. Ninguém que descobriu continuou o mesmo.' }
    ];
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '🦊 A ENTRADA DO FOX', info.tag, info.sub);
  },

  // Cafeteria em Barcelona: janela para a rua ensolarada, balcão e mesa com dois cafés
  drawBgSpainCafe(ctx, W, H) {
    const wall = ctx.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#7c4a2b');
    wall.addColorStop(1, '#4a2c1a');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);
    // Janela com a rua: céu, prédios claros e o estádio lá no fundo
    const wx = W * 0.06;
    const wy = H * 0.1;
    const ww = W * 0.5;
    const wh = H * 0.46;
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, ww, wh);
    ctx.clip();
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(wx, wy, ww, wh);
    // O estádio do Barcha no fundo, atrás dos prédios
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(wx + ww * 0.7, wy + wh * 0.42, ww * 0.18, wh * 0.12, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(wx + ww * 0.52, wy + wh * 0.42, ww * 0.36, 6);
    ctx.fillStyle = '#e7d3b0';
    for (let i = 0; i < 6; i++) ctx.fillRect(wx + i * (ww / 6), wy + wh * (0.48 + (i % 3) * 0.08), ww / 6 - 6, wh);
    ctx.fillStyle = 'rgba(120,80,40,0.35)';
    for (let i = 0; i < 6; i++) {
      for (let r = 0; r < 3; r++) ctx.fillRect(wx + i * (ww / 6) + 10, wy + wh * (0.56 + (i % 3) * 0.08) + r * 26, 12, 14);
    }
    ctx.restore();
    ctx.strokeStyle = '#3f2a1d';
    ctx.lineWidth = 10;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.stroke();
    // Luminárias
    [0.66, 0.82].forEach((fx) => {
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W * fx, 0);
      ctx.lineTo(W * fx, H * 0.14);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(W * fx, H * 0.16, 14, 0, Math.PI * 2);
      ctx.fill();
      const glow = ctx.createRadialGradient(W * fx, H * 0.18, 4, W * fx, H * 0.18, 120);
      glow.addColorStop(0, 'rgba(251,191,36,0.35)');
      glow.addColorStop(1, 'rgba(251,191,36,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(W * fx - 120, 0, 240, H * 0.5);
    });
    // Balcão com a máquina de café e prateleira
    ctx.fillStyle = '#3f2a1d';
    ctx.fillRect(W * 0.6, H * 0.46, W * 0.4, H * 0.2);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(W * 0.7, H * 0.34, 90, 70);
    ctx.fillStyle = '#5b3a24';
    ctx.fillRect(W * 0.6, H * 0.26, W * 0.4, 8);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = ['#ef4444', '#f8fafc', '#facc15'][i % 3];
      ctx.fillRect(W * 0.62 + i * 28, H * 0.26 - 22, 14, 22);
    }
    // Chão quadriculado
    const floorY = Math.round(H * 0.66);
    for (let c = 0; c * 40 < W; c++) {
      for (let r = 0; floorY + r * 40 < H; r++) {
        ctx.fillStyle = (c + r) % 2 ? '#d6c3a1' : '#a8916e';
        ctx.fillRect(c * 40, floorY + r * 40, 40, 40);
      }
    }
    // Mesa com dois cafés
    ctx.fillStyle = '#f5f5f4';
    ctx.fillRect(W * 0.3, H * 0.7, W * 0.4, 14);
    ctx.fillStyle = '#44403c';
    ctx.fillRect(W * 0.49, H * 0.7 + 14, 12, H * 0.2);
    [0.38, 0.6].forEach((fx) => {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(W * fx, H * 0.7 - 18, 22, 18);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(W * fx + 2, H * 0.7 - 16, 18, 4);
    });
  },

  // ========================================================================
  // DESPERTAR DO FLUXO (3 CENAS, ~5 s): o mundo para (close no rosto, batimentos,
  // o olho acende na cor do Fluxo) → o despertar (aura, linhas de velocidade e o
  // nome do Fluxo sendo escrito) → impact frame "FLUXO!!". Tocado pelo [G].
  // ========================================================================
  playFlowCutscene(cfg, onComplete) {
    this.flowCfg = cfg;
    // Cada Fluxo tem a sua cena (js/cine_fluxos_*.js registra 'flow_<id>'); com os 2 slots
    // combinados, toca a do Fluxo de raridade mais alta. Sem cena própria: a genérica.
    const db = window.FLOWS_DB || [];
    const tiers = Object.keys(window.RARITY_TIERS || {});
    const best = String(cfg.flow?.id || '')
      .split('+')
      .map((id) => db.find((f) => f.id === id))
      .filter(Boolean)
      .sort((a, b) => tiers.indexOf(b.rarity) - tiers.indexOf(a.rarity))[0];
    const own = best && this.CINE?.[`flow_${best.id}`] ? `flow_${best.id}` : null;
    this.playActionSakuga(own || 'flow_awaken', onComplete);
  },

  drawFlowAwaken(ctx, W, H) {
    const c = this.flowCfg;
    const fl = c.flow;
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const color = fl.color || '#00f5d4';
    const you = Object.assign({}, c.you, { auraColor: color });
    const rarity = window.RARITY_TIERS?.[fl.rarity];
    const tags = [
      { tag: 'CENA 1/3 • O MUNDO PARA', sub: 'O barulho do estádio some. Só existe você, a bola e o gol.' },
      { tag: `CENA 2/3 • ${fl.name.toUpperCase()}`, sub: window.describeFlow?.(fl) || fl.desc },
      { tag: 'CENA 3/3 • FLUXO!!', sub: `${fl.duration || 10} segundos em que nada consegue te parar.` }
    ];
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();

    if (this.sakugaPhase === 0) {
      // Close no rosto e ombros: os olhos ficam no meio da tela (no boneco, ~10 unidades abaixo do topo)
      ctx.fillStyle = '#04070f';
      ctx.fillRect(0, 0, W, stageH);
      const size = W * 0.95;
      const u = size / 36;
      const eyeY = stageH * 0.45;
      const top = eyeY - SPRITE_MAPY(10.1) * u + (1 - ease(t / 60)) * 30;
      ctx.save();
      ctx.globalAlpha = 0.9;
      this.drawSprite(ctx, you, W / 2, top + size * 0.87, size, { animState: 'idle', frame: 0 });
      ctx.restore();
      // Tudo escuro e dessaturado em volta (vinheta)
      const vig = ctx.createRadialGradient(W / 2, eyeY, W * 0.12, W / 2, eyeY, W * 0.7);
      vig.addColorStop(0, 'rgba(4,7,15,0)');
      vig.addColorStop(1, 'rgba(4,7,15,0.92)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, stageH);
      // Batimentos: dois anéis "TUM... TUM"
      [12, 42].forEach((b, i) => {
        const k = t - b;
        if (k < 0 || k > 40) return;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 1 - k / 40;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(W / 2, eyeY, 60 + k * 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (k < 20) this.drawMangaCaption(ctx, 'TUM...', W * (i ? 0.78 : 0.2), stageH * (i ? 0.25 : 0.78), 28);
      });
      // O olho acende: reflexo na cor do Fluxo atravessando a tela
      if (t > 55) {
        const k = ease((t - 55) / 30);
        const ex = W / 2 + 3.3 * u;
        const g = ctx.createLinearGradient(ex - W * 0.5 * k, 0, ex + W * 0.5 * k, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.5, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(0, eyeY - 3 - 6 * k, W, 6 + 12 * k);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, eyeY, 6 + 16 * k, 0, Math.PI * 2);
        ctx.fill();
      }
      if (t > 20) this.drawMangaCaption(ctx, '...tudo ficou em silêncio.', W * 0.5, stageH * 0.12, 24);
    } else if (this.sakugaPhase === 1) {
      // O despertar: linhas de velocidade, você inteiro com aura e o nome do Fluxo
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, stageH);
      const glow = ctx.createRadialGradient(W * 0.3, stageH * 0.55, 10, W * 0.3, stageH * 0.55, W * 0.6);
      glow.addColorStop(0, color);
      glow.addColorStop(1, 'rgba(2,6,23,0)');
      ctx.globalAlpha = 0.35 + Math.sin(t * 0.2) * 0.08;
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, stageH);
      ctx.globalAlpha = 1;
      this.drawRadialSpeedLines(ctx, W * 0.3, stageH * 0.5, W, color, 0.45);
      const size = 380 + ease(t / 60) * 140;
      this.drawSprite(ctx, you, W * 0.3, stageH + size * 0.25 - ease(t / 50) * 40, size, { animState: 'run', showAura: true, auraColor: color });
      // Faíscas subindo
      for (let i = 0; i < 26; i++) {
        const px = (W * 0.08 + ((i * 97) % (W * 0.5)) + Math.sin(t * 0.1 + i) * 10) % W;
        const py = stageH - ((t * (3 + (i % 4)) + i * 41) % stageH);
        ctx.fillStyle = i % 3 ? color : '#ffffff';
        ctx.fillRect(px, py, 4, 4);
      }
      const name = fl.name.toUpperCase();
      const shown = name.slice(0, Math.max(0, Math.floor((t - 14) * 0.8)));
      ctx.save();
      ctx.translate(W * 0.68, stageH * 0.42);
      ctx.rotate(-0.06);
      ctx.textAlign = 'center';
      if (rarity && t > 6) {
        ctx.font = '900 16px "Segoe UI", sans-serif';
        ctx.fillStyle = rarity.color;
        ctx.fillText(`✦ FLUXO ${rarity.name.split(' ')[0].toUpperCase()} ✦`, 0, -62);
      }
      if (shown) {
        let fs = 60;
        ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
        while (fs > 24 && ctx.measureText(name).width > W * 0.56) {
          fs -= 4;
          ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
        }
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#020617';
        ctx.strokeText(shown, 0, 0);
        ctx.shadowColor = color;
        ctx.shadowBlur = 24;
        ctx.fillStyle = color;
        ctx.fillText(shown, 0, 0);
        ctx.shadowBlur = 0;
      }
      if (t > 70) {
        ctx.globalAlpha = Math.min(1, (t - 70) / 20);
        ctx.font = '800 17px "Segoe UI", sans-serif';
        ctx.fillStyle = '#e2e8f0';
        const fx = window.describeFlow?.(fl) || '';
        ctx.fillText(fx.length > 70 ? `${fx.slice(0, 68)}…` : fx, 0, 46);
      }
      ctx.restore();
    } else {
      // Impact frame preto e branco piscando + "FLUXO!!"
      const inv = t < 18 && t % 4 < 2;
      const fg = inv ? '#ffffff' : '#090d16';
      ctx.fillStyle = inv ? '#090d16' : '#ffffff';
      ctx.fillRect(0, 0, W, stageH);
      this.drawRadialSpeedLines(ctx, W * 0.42, stageH * 0.55, W, fg, 0.9);
      this.drawSilhouette(ctx, you, W * 0.42, stageH * 1.02, 470, { animState: 'run' }, fg);
      ctx.save();
      ctx.translate(W * 0.72, stageH * 0.36);
      ctx.rotate(-0.14);
      const pop = 0.7 + ease(t / 12) * 0.3;
      ctx.scale(pop, pop);
      ctx.font = 'italic 900 120px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = t > 18 ? color : fg;
      ctx.strokeStyle = fg;
      ctx.lineWidth = 6;
      ctx.strokeText('FLUXO!!', 0, 0);
      ctx.fillText('FLUXO!!', 0, 0);
      ctx.restore();
      if (t > 62) {
        ctx.fillStyle = `rgba(255,255,255,${(t - 62) / 18})`;
        ctx.fillRect(0, 0, W, stageH);
      }
    }

    ctx.restore();
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, `🔥 DESPERTAR DO FLUXO • ${(c.youName || 'VOCÊ').toUpperCase()}`, info.tag, info.sub);
  },

  // ========================================================================
  // REAÇÃO QUÍMICA (4 CENAS): tela dividida com os dois em sintonia → o passe
  // do parceiro → impact frame do seu chute → câmera na bola rumo ao gol.
  // Termina com a bola no ar: o resultado (gol ou defesa) acontece na partida.
  // ========================================================================
  playChemCutscene(cfg, onComplete) {
    this.chemCfg = cfg;
    this.playActionSakuga('chem_reaction', onComplete);
  },

  // Cada parceiro faz a SUA jogada na reação (como no anime): o jeito do passe,
  // como você finaliza e o grito do quadro de impacto
  CHEM_STYLES: {
    bachira: { kind: 'dribble', shout: 'O MONSTRO!!', finish: 'shoot' },
    yukimiya: { kind: 'dribble', shout: 'GIRO!!', finish: 'shoot' },
    nagi: { kind: 'trap', shout: 'TOC.', finish: 'volley' },
    reo: { kind: 'trap', shout: 'CAMALEÃO!', finish: 'volley' },
    chigiri: { kind: 'sprint', shout: 'PANTERA!!', finish: 'shoot' },
    otoya: { kind: 'sprint', shout: 'NINJA!', finish: 'shoot' },
    loki: { kind: 'sprint', shout: 'VELOCIDADE DIVINA!', finish: 'shoot' },
    kunigami: { kind: 'power', shout: 'HERÓI!!', finish: 'shoot' },
    barou: { kind: 'power', shout: 'O REI!!', finish: 'shoot' },
    hugo: { kind: 'power', shout: 'ESMAGA!!', finish: 'shoot' },
    tokimitsu: { kind: 'power', shout: 'AAAAH!!', finish: 'shoot' },
    rin: { kind: 'curve', shout: 'MASSACRE.', finish: 'volley' },
    kaiser: { kind: 'curve', shout: 'IMPACTO!!', finish: 'shoot' },
    ness: { kind: 'curve', shout: 'MÁGICA!', finish: 'volley' },
    shidou: { kind: 'acrobat', shout: 'BIG BANG!!', finish: 'bicycle' },
    gagamaru: { kind: 'acrobat', shout: 'ELÁSTICO!!', finish: 'bicycle' },
    aryu: { kind: 'acrobat', shout: 'ELEGANTE!', finish: 'bicycle' },
    sae: { kind: 'through', shout: 'PASSE DE DEUS', finish: 'shoot' },
    hiori: { kind: 'through', shout: 'AGORA!', finish: 'shoot' },
    karasu: { kind: 'through', shout: 'CORVO!!', finish: 'shoot' },
    kurona: { kind: 'through', shout: 'AQUI!', finish: 'shoot' },
    niko: { kind: 'through', shout: 'LEITURA!', finish: 'shoot' },
    noa: { kind: 'through', shout: 'PERFEITO.', finish: 'volley' }
  },

  getChemStyle(partner) {
    return this.CHEM_STYLES[partner?.id] || { kind: 'through', shout: 'DOM!!', finish: 'shoot' };
  },

  // Cena 2 da reação: o parceiro prepara a jogada do jeito dele e solta o passe;
  // você entra para finalizar (de primeira, de voleio ou de bicicleta)
  drawChemPassScene(ctx, W, stageH, t, c, st) {
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const lerp = (a, b, k) => a + (b - a) * k;
    const pc = c.partner.auraColor || '#ec4899';
    const yc = '#00f5d4';
    const feet = stageH * 0.9;
    const def = c.defender || this.getSpeakerCharData('defensor');
    const aim = { x: W * 0.68, y: st.finish === 'shoot' ? feet - 30 : st.finish === 'volley' ? stageH * 0.55 : stageH * 0.4 };
    this.drawU20Stadium(ctx, W, stageH, t * (st.kind === 'sprint' ? 4 : 1.2), 0.46, c.sign);
    if (st.kind === 'sprint') this.drawSpeedLines(ctx, W, stageH, pc, 0.45);

    // Onde o parceiro está e quando ele toca na bola
    let kick = 42;
    let px = W * 0.22;
    let py = feet;
    let pAnim = 'idle';
    let from = { x: W * 0.28, y: feet - 12 };
    if (st.kind === 'dribble') {
      kick = 78;
      px = lerp(W * 0.02, W * 0.34, ease(t / 75));
      pAnim = t < kick ? (Math.floor(t / 12) % 2 ? 'rabona' : 'run') : 'shoot';
      [W * 0.14, W * 0.25].forEach((dx, i) => {
        const beaten = px > dx + 20;
        this.drawSprite(ctx, def, dx + (beaten ? -20 : 0), feet, 200, { animState: beaten ? 'dive' : 'idle', flipX: true });
        if (beaten && t < 30 + i * 25) this.drawMangaCaption(ctx, 'ELÁSTICO!', dx, stageH * 0.36, 20);
      });
      from = { x: px + 40, y: feet - 12 };
    } else if (st.kind === 'trap') {
      kick = 70;
      const fall = Math.min(1, t / 34);
      if (t < 34) this.drawAnimeBall(ctx, W * 0.26, lerp(-30, feet - 14, fall * fall), 18, '#ffffff', t);
      else if (t < kick) {
        this.drawAnimeBall(ctx, W * 0.26, feet - 14, 18, '#ffffff', 0);
        ctx.strokeStyle = pc;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(W * 0.26, feet - 14, 10 + (t - 34) * 2, 0, Math.PI * 2);
        ctx.stroke();
        this.drawMangaCaption(ctx, 'TOC.', W * 0.26, stageH * 0.4, 30);
      }
      pAnim = t < kick ? 'idle' : 'shoot';
      from = { x: W * 0.28, y: feet - 20 };
    } else if (st.kind === 'sprint') {
      kick = 58;
      px = lerp(-W * 0.1, W * 0.34, ease(t / 55));
      pAnim = t < kick ? 'run' : 'shoot';
      for (let k = 4; k >= 1; k--) {
        ctx.globalAlpha = 0.12 * k;
        this.drawSprite(ctx, c.partner, px - k * 45, feet, 250, { animState: 'run', showAura: true, auraColor: pc });
      }
      ctx.globalAlpha = 1;
      from = { x: px + 40, y: feet - 12 };
    } else if (st.kind === 'power') {
      kick = 60;
      px = lerp(W * 0.04, W * 0.26, ease(t / 40));
      pAnim = t < 40 ? 'run' : t < kick ? 'idle' : 'shoot';
      const hit = t > 38;
      const dx = hit ? lerp(W * 0.32, W * 0.46, ease((t - 38) / 20)) : W * 0.32;
      this.drawSprite(ctx, def, dx, feet - (hit ? Math.sin(Math.min(1, (t - 38) / 20) * Math.PI) * 40 : 0), 220, { animState: hit ? 'dive' : 'idle', flipX: true });
      if (hit && t < 70) this.drawMangaCaption(ctx, 'BAM!!', W * 0.38, stageH * 0.32, 34);
      from = { x: px + 40, y: feet - 12 };
    } else if (st.kind === 'curve') {
      [W * 0.42, W * 0.5].forEach((dx) => this.drawSprite(ctx, def, dx, feet - 20, 190, { animState: 'idle', flipX: true }));
    } else if (st.kind === 'acrobat') {
      kick = 52;
      const jump = Math.sin(Math.min(1, t / 70) * Math.PI);
      py = feet - jump * 120;
      pAnim = t < 18 ? 'run' : 'bicycle';
      from = { x: W * 0.28, y: py - 40 };
      if (t < kick) this.drawAnimeBall(ctx, W * 0.27, py - 50, 18, '#ffffff', t);
    } else {
      // Passe enfiado: a barreira de marcadores e a linha de visão acendendo pela fresta
      [stageH * 0.62, stageH * 0.74, stageH * 0.92].forEach((y) => this.drawSprite(ctx, def, W * 0.47, y, 170, { animState: 'idle', flipX: true }));
      if (t < 50) {
        ctx.save();
        ctx.setLineDash([14, 10]);
        ctx.strokeStyle = pc;
        ctx.globalAlpha = 0.5 + Math.sin(t * 0.4) * 0.3;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(aim.x, aim.y);
        ctx.stroke();
        ctx.restore();
        this.drawMangaCaption(ctx, '(...a fresta.)', W * 0.47, stageH * 0.3, 20);
      }
    }

    this.drawSprite(ctx, c.partner, px, py, 250, { animState: pAnim, showAura: true, auraColor: pc });

    // Você entra para finalizar
    const yk = ease(t / 110);
    const youX = lerp(W * 1.05, W * 0.72, yk);
    const air = st.finish === 'bicycle' ? 90 : st.finish === 'volley' ? 45 : 0;
    const youY = feet - (t > 100 ? Math.sin(Math.min(1, (t - 100) / 40) * Math.PI) * air : 0);
    const finishAnim = st.finish === 'bicycle' ? 'bicycle' : 'shoot';
    this.drawSprite(ctx, c.you, youX, youY, 260, { animState: t > 100 ? finishAnim : 'run', flipX: true, showAura: true, auraColor: yc });

    // A bola: arco normal, curva por fora dos marcadores, ou reta e forte
    const path = (u) => {
      const x = lerp(from.x, aim.x, u);
      let y = lerp(from.y, aim.y, u);
      if (st.kind === 'curve') y -= Math.sin(u * Math.PI) * 170 * (1 - u * 0.3);
      else if (st.kind !== 'power' && st.kind !== 'through') y -= Math.sin(u * Math.PI) * 110;
      return { x, y };
    };
    if (t >= kick) {
      const u = Math.min(1, (t - kick) / 60);
      for (let k = 1; k <= 7; k++) {
        const q = path(Math.max(0, u - k * 0.03));
        ctx.globalAlpha = 0.5 - k * 0.06;
        this.drawAnimeBall(ctx, q.x, q.y, (st.kind === 'power' ? 24 : 20) - k * 2, pc, t);
      }
      ctx.globalAlpha = 1;
      const b = path(u);
      this.drawAnimeBall(ctx, b.x, b.y, 22, pc, t);
    } else if (st.kind === 'curve' || st.kind === 'through' || st.kind === 'power') {
      this.drawAnimeBall(ctx, from.x, from.y, 18, '#ffffff', t);
    }
  },

  drawChemReaction(ctx, W, H) {
    const c = this.chemCfg;
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const lerp = (a, b, k) => a + (b - a) * k;
    const pc = c.partner.auraColor || '#ec4899';
    const yc = '#00f5d4';
    const chemName = c.partner.chemName || 'Reação Química';
    const pFirst = c.partnerName.split(' ').pop().toUpperCase();
    const yFirst = c.youName.split(' ').pop().toUpperCase();
    const st = this.getChemStyle(c.partner);
    const tags = [
      { tag: 'CENA 1/4 • SINTONIA', sub: `${c.partnerName} e ${c.youName} enxergam a mesma jogada ao mesmo tempo.` },
      { tag: `CENA 2/4 • ${chemName.toUpperCase()}`, sub: c.partner.chemBonus || 'O passe sai no espaço perfeito.' },
      { tag: 'CENA 3/4 • IMPACTO', sub: 'Duas armas, um só chute.' },
      { tag: 'CENA 4/4 • RUMO AO GOL', sub: 'A bola rasga o campo... o goleiro vai alcançar?' }
    ];
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();

    if (this.sakugaPhase === 0) {
      // Tela dividida na diagonal: parceiro à esquerda, você à direita
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, stageH);
      const half = (pts, color, cx, draw) => {
        ctx.save();
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.clip();
        const g = ctx.createRadialGradient(cx, stageH * 0.5, 20, cx, stageH * 0.5, W * 0.5);
        g.addColorStop(0, color);
        g.addColorStop(1, '#020617');
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, stageH);
        ctx.globalAlpha = 1;
        this.drawRadialSpeedLines(ctx, cx, stageH * 0.5, W, color, 0.3);
        draw();
        ctx.restore();
      };
      const k = ease(t / 45);
      half([[0, 0], [W * 0.58, 0], [W * 0.42, stageH], [0, stageH]], pc, W * 0.25, () => {
        this.drawSprite(ctx, c.partner, lerp(-W * 0.2, W * 0.24, k), stageH * 1.25, 520, { animState: 'idle', showAura: true, auraColor: pc });
      });
      half([[W * 0.58, 0], [W, 0], [W, stageH], [W * 0.42, stageH]], yc, W * 0.75, () => {
        this.drawSprite(ctx, c.you, lerp(W * 1.2, W * 0.76, k), stageH * 1.25, 520, { animState: 'idle', flipX: true, showAura: true, auraColor: yc });
      });
      // Faísca na linha do corte
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = t % 8 < 4 ? pc : yc;
      ctx.shadowBlur = 24;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(W * 0.58, 0);
      ctx.lineTo(W * 0.42, stageH);
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (t > 30) {
        const pop = ease((t - 30) / 14);
        ctx.save();
        ctx.translate(W / 2, stageH * 0.42);
        ctx.scale(0.5 + pop * 0.5, 0.5 + pop * 0.5);
        ctx.font = 'italic 900 78px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#020617';
        ctx.strokeText('REAÇÃO QUÍMICA', 0, 0);
        const g = ctx.createLinearGradient(-300, 0, 300, 0);
        g.addColorStop(0, pc);
        g.addColorStop(1, yc);
        ctx.fillStyle = g;
        ctx.fillText('REAÇÃO QUÍMICA', 0, 0);
        ctx.restore();
      }
      if (t > 55) this.drawMangaCaption(ctx, `${pFirst} × ${yFirst}`, W / 2, stageH * 0.58, 30);
      // A fala do parceiro (cada um com a sua)
      if (t > 75 && c.partner.quote) {
        const q = `${pFirst}: "${c.partner.quote}"`;
        this.drawMangaCaption(ctx, q.length > 78 ? `${q.slice(0, 76)}…"` : q, W / 2, 52, 18);
      }
    } else if (this.sakugaPhase === 1) {
      // O parceiro faz a jogada DELE (drible, domínio, arrancada, trombada, curva, acrobacia ou passe enfiado)
      this.drawChemPassScene(ctx, W, stageH, t, c, st);
      this.drawMangaCaption(ctx, `${chemName.toUpperCase()}!`, W * 0.5, 70, 28);
    } else if (this.sakugaPhase === 2) {
      // Impact frame: os dois em silhueta, a bola com as duas cores
      const inv = t < 14 && t % 4 < 2;
      const fg = inv ? '#ffffff' : '#090d16';
      ctx.fillStyle = inv ? '#090d16' : '#ffffff';
      ctx.fillRect(0, 0, W, stageH);
      this.drawRadialSpeedLines(ctx, W * 0.62, stageH * 0.5, W, fg, 0.9);
      ctx.globalAlpha = 0.35;
      this.drawSilhouette(ctx, c.partner, W * 0.2, stageH * 1.05, 380, { animState: 'shoot' }, fg);
      ctx.globalAlpha = 1;
      this.drawSilhouette(ctx, c.you, W * 0.48, stageH * 0.95, 460, { animState: st.finish === 'bicycle' ? 'bicycle' : 'shoot', flipX: true }, fg);
      for (let r = 1; r <= 4; r++) {
        ctx.strokeStyle = r % 2 ? pc : yc;
        ctx.lineWidth = 8 - r;
        ctx.beginPath();
        ctx.ellipse(W * 0.66, stageH * 0.42, t * r * 4, t * r * 2.2, 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
      this.drawAnimeBall(ctx, W * 0.66, stageH * 0.42, 36, t % 6 < 3 ? pc : yc, t);
      ctx.save();
      ctx.translate(W * 0.8, stageH * 0.26);
      ctx.rotate(-0.15);
      ctx.font = 'italic 900 104px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = fg;
      ctx.font = `italic 900 ${st.shout.length > 10 ? 72 : 104}px "Segoe UI", sans-serif`;
      ctx.fillText(st.shout, 0, 0);
      ctx.restore();
    } else {
      // Câmera colada na bola, o gol crescendo à frente
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, W, stageH);
      this.drawSpeedLines(ctx, W, stageH, pc, 0.55);
      this.drawSpeedLines(ctx, W, stageH, yc, 0.4);
      const z = ease(t / 100);
      const gw = lerp(120, W * 0.9, z);
      const gh = gw * 0.34;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = lerp(3, 14, z);
      ctx.strokeRect(W / 2 - gw / 2, stageH * 0.55 - gh, gw, gh);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(W / 2 - gw / 2 + (gw * i) / 10, stageH * 0.55 - gh);
        ctx.lineTo(W / 2 - gw / 2 + (gw * i) / 10, stageH * 0.55);
        ctx.stroke();
      }
      const shake = (Math.random() - 0.5) * 8;
      this.drawAnimeBall(ctx, W * 0.5 + shake, stageH * 0.62 + shake, lerp(70, 40, z), t % 6 < 3 ? pc : yc, t * 2.5);
      this.drawMangaCaption(ctx, `${pFirst} → ${yFirst}!!`, W * 0.5, 70, 30);
    }
    ctx.restore();
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, `🎬 REAÇÃO QUÍMICA • ${c.partnerName.toUpperCase()} × ${c.youName.toUpperCase()}`, info.tag, info.sub);
  },

  // ========================================================================
  // O DISCURSO DE JINPACHI EGO PARA OS 300 (4 CENAS) — 1ª fase da lore:
  // auditório lotado → Ego no telão → os 300 viram 1 → seus olhos.
  // Tocada por uma fala { cinematic: 'ego_speech' }. A porta abrindo é outra
  // animação ('bluelock_door'), que só toca DEPOIS de você escolher passar por ela.
  // ========================================================================
  drawEgoSpeech(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const lerp = (a, b, k) => a + (b - a) * k;
    const typed = (s, start, speed = 0.55) => s.slice(0, Math.max(0, Math.floor((t - start) * speed)));
    const rnd = (i) => (((Math.sin(i * 127.1) * 43758.5453) % 1) + 1) % 1;
    const ego = this.getSpeakerCharData('JINPACHI EGO');
    const you = this.getSpeakerCharData('VOCÊ');
    const pName = (window.App?.state?.profile?.name || 'VOCÊ').toUpperCase();
    const tags = [
      { tag: 'CENA 1/4 • 300 ATACANTES', sub: 'Um auditório escuro no meio do nada. Ninguém sabe por que foi chamado.' },
      { tag: 'CENA 2/4 • JINPACHI EGO', sub: 'O telão acende. O homem que vai destruir o futebol japonês aparece.' },
      { tag: 'CENA 3/4 • 300 → 1', sub: 'Só um vai sobreviver. Os outros 299 nunca mais vestem a camisa do Japão.' },
      { tag: 'CENA 4/4 • O EGO DESPERTA', sub: `${pName} lembra do passe daquela final...` }
    ];
    // Plateia: fileiras de cabeças em silhueta (as da frente maiores)
    const crowd = (top, alpha, glowYou) => {
      for (let r = 0; r < 11; r++) {
        const y = top + r * ((stageH - top) / 11);
        const size = 6 + r * 1.9;
        const n = Math.ceil(W / (size * 2.6));
        for (let i = 0; i < n; i++) {
          const x = (i + (r % 2) * 0.5) * (W / n);
          const isYou = glowYou && r === 8 && i === Math.floor(n * 0.42);
          ctx.fillStyle = isYou ? '#00f5d4' : `rgba(${10 + rnd(i + r * 50) * 20}, ${16 + rnd(i * 3 + r) * 20}, 32, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(x - size * 1.3, y + size * 0.8, size * 2.6, size * 1.6);
        }
      }
    };
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();

    if (this.sakugaPhase === 0) {
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, 0, W, stageH);
      // Holofote descendo devagar sobre a plateia
      const open = ease(t / 120);
      const g = ctx.createLinearGradient(0, 0, 0, stageH);
      g.addColorStop(0, `rgba(180, 220, 255, ${0.35 * open})`);
      g.addColorStop(1, 'rgba(180, 220, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 30, 0);
      ctx.lineTo(W / 2 + 30, 0);
      ctx.lineTo(W / 2 + W * 0.35 * open, stageH);
      ctx.lineTo(W / 2 - W * 0.35 * open, stageH);
      ctx.closePath();
      ctx.fill();
      crowd(stageH * 0.38, 1, false);
      const count = Math.min(300, Math.floor(t * 2.6));
      ctx.font = 'italic 900 64px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(String(count).padStart(3, '0'), 40, 90);
      ctx.font = '900 18px "Segoe UI", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('ATACANTES SUB-18 CONVOCADOS', 44, 118);
      const murmurs = [['Seleção sub-18...?', 0.62, 0.42, 60], ['Por que só atacantes?', 0.2, 0.5, 85], ['Quem chamou a gente?', 0.78, 0.6, 110]];
      murmurs.forEach(([txt, fx, fy, start]) => {
        if (t > start) this.drawMangaCaption(ctx, txt, W * fx, stageH * fy, 16);
      });
    } else if (this.sakugaPhase === 1) {
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, 0, W, stageH);
      // Telão acendendo com o rosto do Ego
      const sx = W * 0.14;
      const sy = stageH * 0.05;
      const sw = W * 0.72;
      const sh = stageH * 0.62;
      const flicker = t < 24 ? (t % 6 < 3 ? 0.3 : 1) : 1;
      const glow = ctx.createRadialGradient(W / 2, sy + sh / 2, 40, W / 2, sy + sh / 2, W * 0.6);
      glow.addColorStop(0, `rgba(0, 245, 212, ${0.35 * flicker})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, stageH);
      ctx.save();
      ctx.globalAlpha = flicker;
      ctx.fillStyle = '#06142b';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh);
      ctx.clip();
      // Cabeça inteira (cabelo em y≈1 até o queixo em y≈14 na grade do sprite) ocupando o telão
      const s = (sh * 0.78) / 14;
      const faceSize = 36 * s;
      ctx.translate(W / 2 - 18 * s, sy + sh * 0.5 - 7.6 * s);
      window.PixelRenderer.drawCharacterSprite(ctx, ego, faceSize, faceSize * 1.1, { facing: 'front', frame: 5 });
      // Brilho passando pelos óculos
      if (t > 50 && t < 90) {
        const gx = lerp(10, 26, (t - 50) / 40);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.moveTo(gx * s, 8 * s);
        ctx.lineTo((gx + 1.2) * s, 8 * s);
        ctx.lineTo((gx - 0.6) * s, 12 * s);
        ctx.lineTo((gx - 1.8) * s, 12 * s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // Linhas de varredura do telão
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = sy; y < sy + sh; y += 4) ctx.fillRect(sx, y, sw, 2);
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 4;
      ctx.strokeRect(sx, sy, sw, sh);
      crowd(stageH * 0.72, 1, false);
      const l1 = typed('"Para o Japão vencer a Copa do Mundo..."', 30);
      const l2 = typed('"...precisamos do atacante MAIS EGOÍSTA do planeta."', 130);
      if (l1) this.drawMangaCaption(ctx, l1, W / 2, sy + sh + 52, 24);
      if (l2) this.drawMangaCaption(ctx, l2, W / 2, sy + sh + 104, 24, '#b91c1c');
    } else if (this.sakugaPhase === 2) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, stageH);
      // 300 bonecos; um a um eles apagam, só você continua aceso
      const cols = 25;
      const rows = 12;
      const cw = (W * 0.84) / cols;
      const ch = (stageH * 0.56) / rows;
      const youIdx = 6 * cols + 11;
      const fallProgress = ease((t - 60) / 150);
      let alive = 0;
      for (let i = 0; i < cols * rows; i++) {
        const x = W * 0.08 + (i % cols) * cw + cw / 2;
        const y = stageH * 0.36 + Math.floor(i / cols) * ch;
        const isYou = i === youIdx;
        const gone = !isYou && rnd(i + 7) < fallProgress;
        if (!gone) alive++;
        ctx.fillStyle = isYou ? '#00f5d4' : gone ? '#1f2937' : '#94a3b8';
        ctx.globalAlpha = gone ? 0.35 : 1;
        ctx.fillRect(x - 3, y - ch * 0.35, 6, 6);
        ctx.fillRect(x - 4, y - ch * 0.35 + 7, 8, 10);
        if (isYou && t > 150) {
          ctx.strokeStyle = '#00f5d4';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 10, y - ch * 0.35 - 6, 20, 30);
        }
      }
      ctx.globalAlpha = 1;
      const shown = Math.max(1, Math.min(300, alive));
      ctx.font = 'italic 900 96px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = shown <= 1 ? '#ef4444' : '#f8fafc';
      ctx.fillText(String(shown), W / 2, stageH * 0.24);
      const l1 = typed('"Vocês são 300. Só 1 vai sobreviver."', 10);
      if (l1) this.drawMangaCaption(ctx, l1, W / 2, stageH * 0.31, 22);
      const l2 = typed('"Os 299 que falharem NUNCA mais vestem a camisa do Japão."', 150, 0.7);
      if (l2) this.drawMangaCaption(ctx, l2, W / 2, stageH * 0.97, 20, '#b91c1c');
    } else {
      // Close nos seus olhos na plateia escura
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, stageH);
      this.drawRadialSpeedLines(ctx, W / 2, stageH * 0.38, W, '#00f5d4', 0.25);
      const bandTop = stageH * 0.16;
      const bandH = stageH * 0.42;
      const faceSize = W * 1.05;
      const s = faceSize / 36;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, bandTop, W, bandH);
      ctx.clip();
      ctx.fillStyle = '#0b1736';
      ctx.fillRect(0, bandTop, W, bandH);
      ctx.translate(W / 2 - 18 * s, bandTop + bandH * 0.55 - 9.6 * s);
      window.PixelRenderer.drawCharacterSprite(ctx, you, faceSize, faceSize * 1.1, { facing: 'front', frame: 5 });
      const glowLen = Math.min(1, Math.max(0, (t - 100) / 50)) * 14;
      ctx.fillStyle = '#00f5d4';
      ctx.globalAlpha = 0.85;
      ctx.fillRect(23 * s, 10.3 * s, glowLen * s, 0.45 * s);
      ctx.fillRect((13 - glowLen) * s, 10.3 * s, glowLen * s, 0.45 * s);
      ctx.restore();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.strokeRect(-4, bandTop, W + 8, bandH);
      const l1 = typed('(Aquela final no colégio...)', 10);
      const l2 = typed('(...dessa vez, EU vou ser esse 1.)', 100);
      if (l1) this.drawMangaCaption(ctx, l1, 40, stageH * 0.74, 24, '#090d16', 'left');
      if (l2) this.drawMangaCaption(ctx, l2, W - 40 - l2.length * 13, stageH * 0.88, 26, '#0e7490', 'left');
    }
    ctx.restore();
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '🎬 O DISCURSO DE JINPACHI EGO', info.tag, info.sub);
  },

  // ========================================================================
  // A PORTA DO BLUE LOCK — toca depois da escolha "vocês vão passar pela porta?"
  // (fala { cinematic: 'bluelock_door' }): a porta abre e você entra na luz.
  // ========================================================================
  drawBlueLockDoor(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const lerp = (a, b, k) => a + (b - a) * k;
    const typed = (s, start, speed = 0.55) => s.slice(0, Math.max(0, Math.floor((t - start) * speed)));
    const you = this.getSpeakerCharData('VOCÊ');
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();
    {
      // A porta do Blue Lock se abrindo, luz invadindo o auditório
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, 0, W, stageH);
      const gap = ease(t / 130) * W * 0.32;
      const light = ctx.createRadialGradient(W / 2, stageH * 0.45, 10, W / 2, stageH * 0.45, W * 0.5);
      light.addColorStop(0, '#ffffff');
      light.addColorStop(0.35, '#a5f3fc');
      light.addColorStop(1, 'rgba(0, 245, 212, 0)');
      ctx.fillStyle = light;
      ctx.fillRect(W / 2 - gap - 40, 0, gap * 2 + 80, stageH);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(W * 0.08 - gap, stageH * 0.04, W * 0.42, stageH * 0.86);
      ctx.fillRect(W * 0.5 + gap, stageH * 0.04, W * 0.42, stageH * 0.86);
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 6;
      ctx.strokeRect(W * 0.08 - gap, stageH * 0.04, W * 0.42, stageH * 0.86);
      ctx.strokeRect(W * 0.5 + gap, stageH * 0.04, W * 0.42, stageH * 0.86);
      ctx.font = 'italic 900 42px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1d4ed8';
      ctx.fillText('BLUE', W * 0.29 - gap, stageH * 0.5);
      ctx.fillText('LOCK', W * 0.71 + gap, stageH * 0.5);
      if (t > 80) {
        ctx.save();
        ctx.globalAlpha = ease((t - 80) / 30);
        ctx.font = 'italic 900 90px "Segoe UI", sans-serif';
        ctx.fillStyle = '#00f5d4';
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 30;
        ctx.fillText('BLUE LOCK', W / 2, stageH * 0.32);
        ctx.restore();
      }
      // Você de costas, entrando na luz
      this.drawSprite(ctx, you, W / 2, stageH * 1.12 - ease(t / 220) * 60, lerp(560, 440, ease(t / 220)), { facing: 'back', animState: 'idle' });
      const l1 = typed('(Sem olhar pra trás. Dessa vez eu vou ser o 1.)', 20, 0.6);
      if (l1) this.drawMangaCaption(ctx, l1, W / 2, 60, 22);
    }
    ctx.restore();
    this.drawSakugaBar(ctx, W, H, '🎬 A PORTA DO BLUE LOCK', 'VOCÊ PASSA PELA PORTA', 'Quem passar por ela não volta atrás.');
  },

  // ========================================================================
  // O PIQUE-PEGA DO QUARTO Z (5 CENAS) — o primeiro teste do Blue Lock:
  // quem estiver com a bola quando o tempo acabar está eliminado. Faltando
  // 10 segundos a bola é sua... e você chuta no Kira.
  // Tocada por uma fala { cinematic: 'onigokko' }.
  // ========================================================================
  drawRoomZ(ctx, W, stageH, horizon) {
    ctx.fillStyle = '#050b1a';
    ctx.fillRect(0, 0, W, horizon);
    // Parede com grade azul e o Z gigante
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, horizon);
      ctx.stroke();
    }
    for (let y = 0; y <= horizon; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.font = 'italic 900 150px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(29, 78, 216, 0.45)';
    ctx.fillText('Z', W / 2, horizon - 30);
    // Chão em perspectiva
    const g = ctx.createLinearGradient(0, horizon, 0, stageH);
    g.addColorStop(0, '#0b2447');
    g.addColorStop(1, '#13315c');
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon, W, stageH - horizon);
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.22)';
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + i * 60, horizon);
      ctx.lineTo(W / 2 + i * 260, stageH);
      ctx.stroke();
    }
    for (let k = 1; k < 7; k++) {
      const y = horizon + (stageH - horizon) * Math.pow(k / 7, 1.6);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  },

  drawTagTimer(ctx, x, y, secs, urgent) {
    const txt = `0:${String(Math.max(0, Math.ceil(secs))).padStart(2, '0')}`;
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.fillRect(x - 110, y - 52, 220, 74);
    ctx.strokeStyle = urgent ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(x - 110, y - 52, 220, 74);
    ctx.font = 'italic 900 56px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = urgent && this.sakugaFrame % 20 < 10 ? '#ef4444' : '#f8fafc';
    ctx.fillText(txt, x, y + 8);
    ctx.restore();
  },

  drawOnigokko(ctx, W, H) {
    const t = this.sakugaPhaseTimer;
    const stageH = H - 108;
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
    const lerp = (a, b, k) => a + (b - a) * k;
    const typed = (s, start, speed = 0.6) => s.slice(0, Math.max(0, Math.floor((t - start) * speed)));
    const you = this.getSpeakerCharData('VOCÊ');
    const kira = this.getSpeakerCharData('RYOSUKE KIRA');
    // O Quarto Z (os que existem no banco de personagens)
    const crowdIds = ['bachira', 'kunigami', 'chigiri', 'gagamaru', 'igarashi', 'raichi'];
    const crowd = crowdIds.map((id) => (window.BLUE_LOCK_CHARACTERS || []).find((c) => c.id === id)).filter(Boolean);
    const pName = (window.App?.state?.profile?.name || 'VOCÊ').toUpperCase();
    const tags = [
      { tag: 'CENA 1/5 • QUARTO Z: PIQUE-PEGA', sub: 'O primeiro teste do Blue Lock. Quem estiver com a bola quando o tempo acabar está eliminado.' },
      { tag: 'CENA 2/5 • A BOLA É SUA', sub: 'Faltando 10 segundos, a bola bate em você. Todo mundo foge.' },
      { tag: 'CENA 3/5 • QUEM É O ALVO?', sub: 'Quem está perto... quem não está olhando...' },
      { tag: 'CENA 4/5 • O CHUTE', sub: `${pName} chuta sem pensar. A bola vai direto no Kira.` },
      { tag: 'CENA 5/5 • RYOSUKE KIRA, ELIMINADO', sub: 'O melhor atacante da sua região cai no primeiro dia. Foi o seu ego que escolheu.' }
    ];
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, stageH);
    ctx.clip();

    if (this.sakugaPhase === 0) {
      // Plano aberto: todo mundo correndo, a bola quicando de um para outro
      const horizon = stageH * 0.42;
      this.drawRoomZ(ctx, W, stageH, horizon);
      const spots = crowd.concat([kira, you]).map((c, i) => {
        const a = this.sakugaFrame * 0.025 + i * 0.57;
        return {
          c,
          x: W / 2 + Math.cos(a * (i % 2 ? 1 : -1)) * (220 + (i % 4) * 90),
          y: horizon + 70 + ((i * 53) % 220) + Math.sin(a * 1.3) * 30,
          right: Math.sin(a) > 0
        };
      });
      spots.sort((a, b) => a.y - b.y).forEach((s) => {
        this.drawSprite(ctx, s.c, s.x, s.y, 70 + (s.y - horizon) * 0.35, { animState: 'run', flipX: !s.right });
      });
      const hop = (t % 46) / 46;
      const from = spots[Math.floor(t / 46) % spots.length];
      const to = spots[(Math.floor(t / 46) + 3) % spots.length];
      this.drawAnimeBall(ctx, lerp(from.x, to.x, hop), lerp(from.y, to.y, hop) - 30 - Math.sin(hop * Math.PI) * 90, 12, '#ffffff', t);
      this.drawTagTimer(ctx, W - 150, 80, lerp(136, 31, t / 230), false);
      const l1 = typed('JINPACHI EGO: "Regra única: quem estiver com a bola no fim do tempo... ESTÁ ELIMINADO."', 10);
      if (l1) this.drawMangaCaption(ctx, l1, 40, stageH - 30, 20, '#090d16', 'left');
    } else if (this.sakugaPhase === 1) {
      // A bola bate em você; os outros correm para as paredes
      const horizon = stageH * 0.42;
      this.drawRoomZ(ctx, W, stageH, horizon);
      const flee = ease(t / 90);
      crowd.concat([kira]).forEach((c, i) => {
        const ang = (i / (crowd.length + 1)) * Math.PI * 2;
        const isKira = c === kira;
        const r = lerp(120, isKira ? 300 : 520, flee);
        const x = W / 2 + Math.cos(ang) * r;
        const y = horizon + 150 + Math.sin(ang) * r * 0.28;
        this.drawSprite(ctx, c, x, y, 110, { animState: flee < 1 ? 'run' : 'idle', flipX: Math.cos(ang) < 0, facing: flee < 1 ? 'front' : 'front' });
      });
      const hit = t < 24;
      this.drawSprite(ctx, you, W / 2, stageH * 0.98, 300, { animState: hit ? 'stun' : 'idle' });
      if (hit) {
        this.drawAnimeBall(ctx, lerp(W * 0.1, W / 2 + 20, t / 24), lerp(stageH * 0.3, stageH * 0.6, t / 24), 18, '#ffffff', t);
        this.drawMangaCaption(ctx, 'PÁ!', W / 2 + 120, stageH * 0.45, 40);
      } else {
        this.drawAnimeBall(ctx, W / 2 + 40, stageH * 0.94, 20, '#ef4444', t);
      }
      this.drawTagTimer(ctx, W - 150, 80, lerp(10, 7, t / 230), true);
      const l1 = typed('(A bola... tá comigo?!)', 30);
      const l2 = typed('(Faltam 10 segundos. Se eu não passar pra alguém, eu tô fora.)', 110);
      if (l1) this.drawMangaCaption(ctx, l1, 40, 70, 24, '#090d16', 'left');
      if (l2) this.drawMangaCaption(ctx, l2, 40, 130, 20, '#b91c1c', 'left');
    } else if (this.sakugaPhase === 2) {
      // Seus olhos varrendo a sala... e parando no Kira, de costas, distraído
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, stageH);
      this.drawRadialSpeedLines(ctx, W / 2, stageH * 0.3, W, '#00f5d4', 0.2);
      const bandTop = stageH * 0.06;
      const bandH = stageH * 0.36;
      const faceSize = W * 1.05;
      const s = faceSize / 36;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, bandTop, W, bandH);
      ctx.clip();
      ctx.fillStyle = '#0b1736';
      ctx.fillRect(0, bandTop, W, bandH);
      ctx.translate(W / 2 - 18 * s, bandTop + bandH * 0.32 - 9.6 * s);
      window.PixelRenderer.drawCharacterSprite(ctx, you, faceSize, faceSize * 1.1, { facing: 'front', frame: 5 });
      // Brilho saindo dos olhos quando ele acha o alvo
      const glowLen = Math.min(1, Math.max(0, (t - 120) / 40)) * 14;
      ctx.fillStyle = '#00f5d4';
      ctx.globalAlpha = 0.85;
      ctx.fillRect(23 * s, 10.3 * s, glowLen * s, 0.45 * s);
      ctx.fillRect((13 - glowLen) * s, 10.3 * s, glowLen * s, 0.45 * s);
      ctx.restore();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.strokeRect(-4, bandTop, W + 8, bandH);
      // Quadro de baixo: o Kira conversando, de costas para você
      const pTop = bandTop + bandH + 18;
      ctx.fillStyle = '#0b2447';
      ctx.fillRect(W * 0.52, pTop, W * 0.46, stageH - pTop - 10);
      ctx.save();
      ctx.beginPath();
      ctx.rect(W * 0.52, pTop, W * 0.46, stageH - pTop - 10);
      ctx.clip();
      this.drawSprite(ctx, kira, W * 0.75, stageH + 60, 300, { facing: 'back', animState: 'idle' });
      if (t > 120) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(W * 0.75, pTop + 110, 80 + Math.sin(t * 0.3) * 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.strokeRect(W * 0.52, pTop, W * 0.46, stageH - pTop - 10);
      this.drawTagTimer(ctx, W * 0.25, pTop + 80, lerp(7, 4, t / 220), true);
      const l1 = typed('(Quem está perto... quem não está olhando...)', 10);
      const l2 = typed('(...o Kira.)', 120, 0.4);
      if (l1) this.drawMangaCaption(ctx, l1, 40, stageH - 90, 22, '#090d16', 'left');
      if (l2) this.drawMangaCaption(ctx, l2, 40, stageH - 30, 30, '#b91c1c', 'left');
    } else if (this.sakugaPhase === 3) {
      // Impact frame: você chuta, a bola vai no Kira que acabou de se virar
      const inv = t < 14 && t % 4 < 2;
      const fg = inv ? '#ffffff' : '#090d16';
      ctx.fillStyle = inv ? '#090d16' : '#ffffff';
      ctx.fillRect(0, 0, W, stageH);
      this.drawRadialSpeedLines(ctx, W * 0.3, stageH * 0.6, W, fg, 0.8);
      this.drawSilhouette(ctx, you, W * 0.24, stageH * 0.98, 420, { animState: t < 20 ? 'windup' : 'shoot' }, fg);
      const turned = t > 60;
      this.drawSprite(ctx, kira, W * 0.8, stageH * 0.95, 300, { facing: turned ? 'front' : 'back', animState: t > 110 ? 'stun' : 'idle', flipX: true });
      if (t >= 20) {
        const u = Math.min(1, (t - 20) / 90);
        const bx = lerp(W * 0.34, W * 0.79, u);
        const by = lerp(stageH * 0.8, stageH * 0.62, u);
        for (let k = 1; k <= 6; k++) {
          const uu = Math.max(0, u - k * 0.04);
          ctx.globalAlpha = 0.45 - k * 0.06;
          this.drawAnimeBall(ctx, lerp(W * 0.34, W * 0.79, uu), lerp(stageH * 0.8, stageH * 0.62, uu), 22 - k * 2, '#ef4444', t);
        }
        ctx.globalAlpha = 1;
        this.drawAnimeBall(ctx, bx, by, 26, '#ef4444', t);
      }
      ctx.save();
      ctx.translate(W * 0.36, stageH * 0.24);
      ctx.rotate(-0.12);
      ctx.font = 'italic 900 96px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = fg;
      ctx.fillText(t > 110 ? 'PÁ!!' : 'DOM!!', 0, 0);
      ctx.restore();
      if (turned && t < 110) this.drawMangaCaption(ctx, 'KIRA: "Hã...?"', W * 0.8, stageH * 0.22, 24);
    } else {
      // Tempo esgotado: o Kira no chão, você em pé, o carimbo de ELIMINADO
      const horizon = stageH * 0.42;
      this.drawRoomZ(ctx, W, stageH, horizon);
      ctx.fillStyle = 'rgba(127, 29, 29, 0.25)';
      ctx.fillRect(0, 0, W, stageH);
      this.drawSprite(ctx, kira, W * 0.66, stageH * 0.9, 260, { animState: 'dive', flipX: true });
      this.drawAnimeBall(ctx, W * 0.74, stageH * 0.9, 18, '#ffffff', 0);
      this.drawSprite(ctx, you, W * 0.3, stageH * 1.02, 330, { facing: 'back', animState: 'idle' });
      this.drawTagTimer(ctx, W - 150, 80, 0, true);
      if (t > 30) {
        const pop = ease((t - 30) / 12);
        ctx.save();
        ctx.translate(W * 0.64, stageH * 0.36);
        ctx.rotate(-0.1);
        ctx.scale(1.6 - pop * 0.6, 1.6 - pop * 0.6);
        ctx.globalAlpha = pop;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 8;
        ctx.strokeRect(-250, -60, 500, 104);
        ctx.font = 'italic 900 40px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ef4444';
        ctx.fillText('RYOSUKE KIRA', 0, -14);
        ctx.fillText('ELIMINADO', 0, 32);
        ctx.restore();
      }
      const l1 = typed('(Eu... chutei sem pensar.)', 80);
      const l2 = typed('(Mas eu não quero ir embora. É isso o Blue Lock.)', 140);
      if (l1) this.drawMangaCaption(ctx, l1, 40, 70, 24, '#090d16', 'left');
      if (l2) this.drawMangaCaption(ctx, l2, 40, 130, 22, '#0e7490', 'left');
    }
    ctx.restore();
    const info = tags[this.sakugaPhase] || tags[0];
    this.drawSakugaBar(ctx, W, H, '🎬 O PIQUE-PEGA DO QUARTO Z', info.tag, info.sub);
  },

  drawCameraCutBadge(ctx, text) {
    ctx.save();
    ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
    ctx.fillRect(24, 22, 620, 36);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 22, 620, 36);
    ctx.fillStyle = '#facc15';
    ctx.font = '900 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, 38, 45);
    ctx.restore();
  },

  drawAnimeBall(ctx, x, y, r, glowColor, frame) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(frame * 0.22);

    // Aura de energia em volta da bola
    const grad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.9);
    grad.addColorStop(0, glowColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2);
    ctx.fill();

    // Corpo da bola
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#090d16';
    ctx.stroke();

    // Pentágonos clássicos estilo anime Blue Lock
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.36, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawPuzzlePiece(ctx, x, y, s, color, rot, label = '') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.beginPath();
    ctx.arc(0, -s / 2 - s * 0.18, s * 0.22, 0, Math.PI * 2);
    ctx.arc(s / 2 + s * 0.18, 0, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    if (label) {
      ctx.fillStyle = '#090d16';
      ctx.font = '900 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, 4);
    }
    ctx.restore();
  },

  drawSpeedLines(ctx, W, H, color, alpha = 0.25) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 3;
    for (let i = 0; i < 28; i++) {
      const y = ((i * 37 + this.sakugaFrame * 9) % H);
      const len = 140 + (i % 5) * 90;
      const x = ((i * 173 - this.sakugaFrame * 28) % (W + 300));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawRadialSpeedLines(ctx, cx, cy, W, color, alpha = 0.35) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 42; i++) {
      const a = (i / 42) * Math.PI * 2 + (this.sakugaFrame % 4) * 0.02;
      const r1 = 110 + (i % 3) * 35;
      const r2 = W;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.restore();
  },

  // Tom da "voz" (blip das letras) de cada personagem: alguns fixos, o resto sai do nome
  getVoicePitch(speaker) {
    const up = (speaker || '').toUpperCase();
    if (up.includes('EGO')) return 165;
    if (up.includes('ANRI')) return 660;
    if (up.includes('VOCÊ')) return 380;
    if (up.includes('BAROU') || up.includes('KUNIGAMI') || up.includes('GAGAMARU')) return 230;
    if (up.includes('BACHIRA') || up.includes('SHIDOU')) return 520;
    let h = 0;
    for (const c of up) h = (h * 31 + c.charCodeAt(0)) % 997;
    return 280 + (h % 300);
  },

  // Uniforme que você veste nas cenas: o da partida em andamento; fora dela, o do seu time
  // no capítulo atual (Time Z, Japão, clube da NEL / profissional...). Antes era sempre o
  // azul-marinho do Blue Lock. Guardado até a próxima cena (play / playActionSakuga).
  currentYouKit() {
    if (this._youKit) return this._youKit;
    let kit = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
    try {
      const me = window.MatchEngine;
      const pd = me?.active && me.playerEntity?.charData;
      const App = window.App;
      const st = App?.state;
      const ch = window.CAREER_CHAPTERS?.[st?.currentChapterIndex];
      let home = null;
      if (pd?.jerseyPrimary) home = [pd.jerseyPrimary, pd.jerseySecondary];
      else if (ch) {
        const club = ch.league === 'pro' ? window.PRO_CLUBS?.[st.proClub] : ch.nelPhase !== undefined ? window.NEL_CLUBS?.[st.nelClub] : null;
        if (club) home = [club.color, club.secondary];
        else {
          const c = ch.format === 'cup' && App.cupRoundChapter ? App.cupRoundChapter(ch) : ch;
          if (c.homeColor) home = [c.homeColor, c.homeSecondary || '#ffffff'];
        }
      }
      if (home) kit = { jerseyPrimary: home[0], jerseySecondary: home[1] };
    } catch (e) {
      /* fica o uniforme padrão */
    }
    return (this._youKit = kit);
  },

  // Resolve os dados visuais de quem está falando para desenhar o retrato e os bonecos gigantes
  getSpeakerCharData(speakerName) {
    const up = (speakerName || '').toUpperCase();
    const st = window.App?.state?.profile || {};
    // O seu nome só conta quando é o falante inteiro (antes "REN" casava com "RENSUKE
    // KUNIGAMI", e quem se chamasse "Rin" virava o Rin Itoshi)
    const myName = (st.name || 'YORI').toUpperCase().trim();
    if (up.includes('VOCÊ') || (myName && up.trim() === myName)) {
      return {
        name: st.name || 'Você',
        skinColor: st.skinColor || '#f3d1b8',
        hairColor: st.hairColor || '#0f172a',
        hairSecondary: st.hairSecondary || '#2563eb',
        eyeColor: st.eyeColor || '#ef4444',
        eyeStyle: st.eyeStyle,
        hairStyle: st.hairStyle || 'spiky_tall',
        ...this.currentYouKit(),
        auraColor: '#00f5d4'
      };
    }
    if (up.includes('EGO')) {
      return {
        name: 'Jinpachi Ego',
        skinColor: '#f1dfcd',
        hairColor: '#2a2a30',
        hairSecondary: '#5b5b63',
        eyeColor: '#1a1a1f',
        hairStyle: 'ego_bob',
        glasses: true,
        eyeStyle: 'wide',
        mouth: 'thin',
        longChin: true,
        headset: true,
        outfit: 'suit',
        jerseyPrimary: '#090d16',
        jerseySecondary: '#334155',
        auraColor: '#00f5d4'
      };
    }
    // Anri Teieri: a assistente do Ego (blazer e saia, não uniforme de jogo)
    if (up.includes('ANRI')) {
      return {
        name: 'Anri Teieri',
        skinColor: '#fbe3d3',
        hairColor: '#8a4b25',
        hairSecondary: '#facc15',
        eyeColor: '#6b3f1d',
        hairStyle: 'anri_bob',
        lashes: true,
        outfit: 'office',
        jerseyPrimary: '#1e2a44',
        jerseySecondary: '#e2e8f0',
        auraColor: '#f472b6'
      };
    }
    if (up.includes('TADA')) {
      return {
        name: 'Tada (Amigo)',
        skinColor: '#f3d1b8',
        hairColor: '#451a03',
        hairSecondary: '#78350f',
        eyeColor: '#451a03',
        hairStyle: 'short_sharp',
        jerseyPrimary: '#1d4ed8',
        jerseySecondary: '#ffffff',
        auraColor: '#94a3b8'
      };
    }
    // Fox (só da história, pelas imagens de referência): o treinador que te procura depois da Copa Sub-20
    if (/\bFOX\b/.test(up)) {
      return {
        name: 'Fox',
        skinColor: '#d6a77a',
        hairColor: '#e5e7eb',
        hairSecondary: '#1f2937',
        eyeColor: '#1f2937',
        hairStyle: 'fox_slick',
        eyeStyle: 'lidded',
        mouth: 'grin',
        earpiece: true,
        outfit: 'suit',
        jerseyPrimary: '#111827',
        jerseySecondary: '#475569',
        auraColor: '#f59e0b'
      };
    }
    // Ryosuke Kira (só da história): o craque do Matsukaze Kokuo, eliminado no pique-pega do Quarto Z
    if (/\bKIRA\b/.test(up)) {
      return {
        name: 'Ryosuke Kira',
        skinColor: '#f3d1b8',
        hairColor: '#3f2a1d',
        hairSecondary: '#6b4a33',
        eyeColor: '#7c5a3a',
        hairStyle: 'soft_side',
        jerseyPrimary: '#0f2942',
        jerseySecondary: '#1d4ed8',
        auraColor: '#94a3b8',
        number: 7
      };
    }
    // Bunny disfarçado de famoso (interlúdio da Espanha): gorro preto e cardigã
    if (up.includes('DISFAR')) {
      const bunny = (window.BLUE_LOCK_CHARACTERS || []).find((c) => c.id === 'bunny');
      if (bunny) return Object.assign({}, bunny, { hat: 'beanie', outfit: 'casual', clothesColor: '#8b8f99' });
    }
    // Nome completo primeiro; depois id ou primeiro nome como palavra inteira
    // (antes "CHRIS PRINCE" virava o Rin e "CHARLES CHEVALIER" virava o Ali)
    const chars = window.BLUE_LOCK_CHARACTERS || [];
    const words = up.split(/[\s()]+/);
    const padded = ` ${words.join(' ')} `;
    const found = chars.find((c) => padded.includes(` ${c.name.toUpperCase()} `))
      || chars.find((c) => words.includes(c.id.toUpperCase()) || words.includes(c.name.split(' ')[0].toUpperCase()))
      // Personagens só da história (Kuon, Wanima, Iemon...): pelo nome completo
      || (window.NEL_KEEPERS || []).find((c) => padded.includes(` ${c.name.toUpperCase()} `));
    if (found) return found;

    return {
      name: speakerName,
      skinColor: '#e5b899',
      hairColor: '#1e293b',
      hairSecondary: '#475569',
      eyeColor: '#38bdf8',
      hairStyle: 'spiky_tall',
      jerseyPrimary: '#1e293b',
      jerseySecondary: '#facc15',
      auraColor: '#38bdf8'
    };
  },

  // ==========================================================================
  // CENÁRIOS DOS DIÁLOGOS: o fundo muda com a fase (mapTheme do capítulo) e com
  // o local da conversa (fala com bg: 'locker_room', 'auditorium', ...).
  // Sem bg (ex: treinos) fica o Training Centre original em HTML.
  // ==========================================================================
  renderBackground(theme) {
    const viewport = document.querySelector('.vn-scene-viewport');
    if (!viewport) return;
    let cv = document.getElementById('vn-bg-canvas');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'vn-bg-canvas';
      cv.className = 'vn-bg-canvas';
      viewport.prepend(cv);
    }
    const themed = !!theme && theme !== 'training_centre';
    viewport.classList.toggle('themed', themed);
    cv.style.display = themed ? 'block' : 'none';
    if (!themed) {
      this.currentBg = null;
      return;
    }
    const W = viewport.clientWidth || 1280;
    const H = viewport.clientHeight || 620;
    if (this.currentBg === theme && cv.width === W && cv.height === H) return;
    if (this.currentBg !== theme) this.restartFade(cv);
    this.currentBg = theme;
    cv.width = W;
    cv.height = H;
    this.drawVnBackground(cv.getContext('2d'), W, H, theme);
  },

  drawVnBackground(ctx, W, H, theme) {
    ctx.clearRect(0, 0, W, H);
    // Fundos novos (js/bg_*.js) se registram em VN_BG[tema] e têm prioridade
    if (this.VN_BG?.[theme]) {
      // São desenhos detalhados (até ~100 ms): cada tema/tamanho fica guardado pronto
      if (!this._vnBgCache) this._vnBgCache = new Map();
      const key = `${theme}|${W}x${H}`;
      let cv = this._vnBgCache.get(key);
      if (!cv) {
        cv = document.createElement('canvas');
        cv.width = W;
        cv.height = H;
        const g = cv.getContext('2d');
        g.save();
        this.VN_BG[theme].call(this, g, W, H);
        g.restore();
        if (this._vnBgCache.size >= 8) this._vnBgCache.delete(this._vnBgCache.keys().next().value);
        this._vnBgCache.set(key, cv);
      }
      ctx.drawImage(cv, 0, 0);
      return;
    }
    const interiors = {
      locker_room: () => this.drawBgLockerRoom(ctx, W, H),
      auditorium: () => this.drawBgAuditorium(ctx, W, H),
      corridor: () => this.drawBgCorridor(ctx, W, H),
      monitor_room: () => this.drawBgMonitorRoom(ctx, W, H),
      bluelock_room: () => this.drawBgBlueLockRoom(ctx, W, H),
      night_home: () => this.drawBgNightHome(ctx, W, H),
      spain_cafe: () => this.drawBgSpainCafe(ctx, W, H),
      clasico_night: () => this.drawU20Stadium(ctx, W, H, 0, 0.5, 'EL CLÁSICO • FC BARCHA x RE AL'),
      tunnel: () => this.drawBgTunnel(ctx, W, H)
    };
    if (interiors[theme]) {
      interiors[theme]();
      return;
    }
    this.drawBgStadium(ctx, W, H, theme);
  },

  // Estádio/campo de cada fase, com as cores do mapa da partida
  drawBgStadium(ctx, W, H, theme) {
    const c = window.MatchEngine.getMapColors(theme);
    const hy = Math.round(H * 0.52);
    const sky = ctx.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, c.skyTop);
    sky.addColorStop(1, c.skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, hy);

    if (theme === 'school_sunset') {
      // Sol se pondo atrás do colégio
      const sun = ctx.createRadialGradient(W * 0.78, hy * 0.55, 10, W * 0.78, hy * 0.55, 160);
      sun.addColorStop(0, 'rgba(255,240,180,1)');
      sun.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, W, hy);
      ctx.fillStyle = c.building;
      ctx.fillRect(W * 0.12, hy * 0.38, W * 0.62, hy * 0.62);
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(W * 0.12, hy * 0.38, W * 0.62, 10);
      for (let r = 0; r < 3; r++) {
        for (let i = 0; i < 12; i++) {
          ctx.fillStyle = 'rgba(253, 186, 116, 0.85)';
          ctx.fillRect(W * 0.14 + i * W * 0.05, hy * 0.48 + r * hy * 0.16, W * 0.03, hy * 0.09);
        }
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(W * 0.43, hy * 0.3, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (theme === 'bluelock_bunker' || theme === 'bluelock_holo') {
      // Instalação do Blue Lock: teto com luzes e paredes de metal/holograma
      ctx.fillStyle = theme === 'bluelock_holo' ? '#1e1b4b' : '#111827';
      ctx.fillRect(0, hy * 0.25, W, hy * 0.75);
      for (let i = 0; i < 9; i++) {
        const lx = (i + 0.5) * (W / 9);
        const g = ctx.createRadialGradient(lx, hy * 0.25, 2, lx, hy * 0.25, 90);
        g.addColorStop(0, theme === 'bluelock_holo' ? 'rgba(168,85,247,0.7)' : 'rgba(56,189,248,0.6)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(lx - 90, hy * 0.25 - 90, 180, 180);
      }
      ctx.strokeStyle = theme === 'bluelock_holo' ? 'rgba(0,245,212,0.25)' : 'rgba(148,163,184,0.18)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, hy * 0.3);
        ctx.lineTo(x, hy);
        ctx.stroke();
      }
      for (let y = hy * 0.3; y < hy; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.font = 'italic 900 120px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.fillText(theme === 'bluelock_holo' ? 'BL' : '5', W * 0.5, hy * 0.85);
    } else {
      // Arquibancada lotada
      ctx.fillStyle = c.building;
      ctx.fillRect(0, hy * 0.3, W, hy * 0.7);
      const colors = [c.boardBg, '#ffffff', c.signBg, '#94a3b8'];
      for (let y = hy * 0.36; y < hy - 26; y += 13) {
        for (let x = 0; x < W; x += 13) {
          const seed = (Math.floor(x / 13) * 31 + Math.floor(y / 13) * 17) % 7;
          ctx.fillStyle = colors[seed % colors.length];
          ctx.globalAlpha = 0.55 + (seed % 3) * 0.15;
          ctx.fillRect(x, y, 8, 8);
        }
      }
      ctx.globalAlpha = 1;
      // Refletores
      [0.1, 0.36, 0.64, 0.9].forEach((fx) => {
        const g = ctx.createRadialGradient(W * fx, hy * 0.12, 4, W * fx, hy * 0.12, 130);
        g.addColorStop(0, 'rgba(255,255,255,0.9)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(W * fx - 130, hy * 0.12 - 130, 260, 260);
      });
      if (theme === 'worldcup_final') {
        // Fogos de artifício
        for (let i = 0; i < 6; i++) {
          const fx = W * (0.1 + i * 0.16);
          const fy = hy * (0.12 + (i % 2) * 0.1);
          ctx.strokeStyle = ['#facc15', '#00f5d4', '#ef4444'][i % 3];
          ctx.lineWidth = 2;
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(fx + Math.cos(a) * 8, fy + Math.sin(a) * 8);
            ctx.lineTo(fx + Math.cos(a) * 30, fy + Math.sin(a) * 30);
            ctx.stroke();
          }
        }
      }
      if (theme === 'nel_dome') {
        // Telões da BLTV com o leilão de salários
        [0.18, 0.82].forEach((fx) => {
          ctx.fillStyle = '#020617';
          ctx.fillRect(W * fx - 110, hy * 0.08, 220, 90);
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 3;
          ctx.strokeRect(W * fx - 110, hy * 0.08, 220, 90);
          ctx.fillStyle = '#eab308';
          ctx.font = '900 26px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('¥ 300.000.000', W * fx, hy * 0.08 + 58);
        });
      }
    }

    // Faixa com o nome do local
    ctx.fillStyle = c.signBg;
    ctx.fillRect(W * 0.22, hy * 0.06, W * 0.56, 34);
    ctx.fillStyle = c.signBg === '#00f5d4' ? '#090d16' : '#ffffff';
    ctx.font = 'italic 900 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.signText, W * 0.5, hy * 0.06 + 23);

    // Placas de publicidade + gramado em perspectiva
    ctx.fillStyle = c.boardBg;
    ctx.fillRect(0, hy - 24, W, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px "Segoe UI", sans-serif';
    const step = W / c.sponsors.length;
    c.sponsors.forEach((sp, i) => ctx.fillText(sp, step * (i + 0.5), hy - 7));
    for (let i = 0; i < 9; i++) {
      const y0 = hy + (H - hy) * ((i / 9) ** 1.4);
      const y1 = hy + (H - hy) * (((i + 1) / 9) ** 1.4);
      ctx.fillStyle = i % 2 === 0 ? c.grass1 : c.grass2;
      ctx.fillRect(0, y0, W, y1 - y0 + 1);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, hy + 18);
    ctx.lineTo(W, hy + 18);
    ctx.stroke();
  },

  drawBgLockerRoom(ctx, W, H) {
    const floorY = H * 0.68;
    ctx.fillStyle = '#1f2a3d';
    ctx.fillRect(0, 0, W, floorY);
    // Fileira de armários
    const n = Math.ceil(W / 92);
    for (let i = 0; i < n; i++) {
      const x = i * 92 + 6;
      ctx.fillStyle = i % 2 ? '#2b4a7a' : '#2f5288';
      ctx.fillRect(x, H * 0.12, 80, floorY - H * 0.12);
      ctx.fillStyle = '#1b2f50';
      for (let v = 0; v < 4; v++) ctx.fillRect(x + 18, H * 0.16 + v * 9, 44, 4);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x + 66, H * 0.36, 5, 22);
    }
    // Luz do teto
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.25);
    g.addColorStop(0, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.25);
    // Banco e piso
    ctx.fillStyle = '#7c4a24';
    ctx.fillRect(W * 0.08, floorY - 30, W * 0.84, 16);
    ctx.fillStyle = '#4b2e17';
    ctx.fillRect(W * 0.12, floorY - 14, 12, 14);
    ctx.fillRect(W * 0.86, floorY - 14, 12, 14);
    for (let y = floorY; y < H; y += 26) {
      ctx.fillStyle = ((y - floorY) / 26) % 2 ? '#9ca3af' : '#a8b0bb';
      ctx.fillRect(0, y, W, 26);
    }
  },

  drawBgAuditorium(ctx, W, H) {
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, W, H);
    // Telão gigante com o logo do Blue Lock
    const sx = W * 0.2;
    const sw = W * 0.6;
    const g = ctx.createRadialGradient(W / 2, H * 0.28, 20, W / 2, H * 0.28, sw * 0.7);
    g.addColorStop(0, 'rgba(0,245,212,0.35)');
    g.addColorStop(1, 'rgba(0,245,212,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.7);
    ctx.fillStyle = '#0b1736';
    ctx.fillRect(sx, H * 0.08, sw, H * 0.4);
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 4;
    ctx.strokeRect(sx, H * 0.08, sw, H * 0.4);
    ctx.font = 'italic 900 64px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00f5d4';
    ctx.fillText('BLUE LOCK', W / 2, H * 0.3);
    ctx.font = '900 18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('300 ATACANTES • 1 SOBREVIVENTE', W / 2, H * 0.38);
    // Fileiras de cadeiras com silhuetas
    for (let r = 0; r < 5; r++) {
      const y = H * 0.56 + r * H * 0.09;
      ctx.fillStyle = `rgba(30, 41, 59, ${0.6 + r * 0.08})`;
      ctx.fillRect(0, y, W, H * 0.05);
      ctx.fillStyle = '#020617';
      for (let x = (r % 2) * 22; x < W; x += 44) {
        ctx.beginPath();
        ctx.arc(x + 20, y - 4, 11 + r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  drawBgCorridor(ctx, W, H) {
    const vx = W / 2;
    const vy = H * 0.42;
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, W, H);
    // Paredes, teto e chão em perspectiva
    const quad = (pts, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
    };
    quad([[0, 0], [vx - 90, vy - 60], [vx - 90, vy + 60], [0, H]], '#13213b');
    quad([[W, 0], [vx + 90, vy - 60], [vx + 90, vy + 60], [W, H]], '#13213b');
    quad([[0, 0], [W, 0], [vx + 90, vy - 60], [vx - 90, vy - 60]], '#0f1a2e');
    quad([[0, H], [W, H], [vx + 90, vy + 60], [vx - 90, vy + 60]], '#1e293b');
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(vx - 90, vy - 60, 180, 120);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(vx - 70, vy - 45, 140, 90);
    // Faixas de luz azul nas paredes
    ctx.strokeStyle = 'rgba(56,189,248,0.8)';
    ctx.lineWidth = 3;
    [[0, H * 0.3, vx - 90, vy - 20], [W, H * 0.3, vx + 90, vy - 20], [0, H * 0.8, vx - 90, vy + 30], [W, H * 0.8, vx + 90, vy + 30]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.font = 'italic 900 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0b1220';
    ctx.fillText('BLUE LOCK', vx, vy + 8);
  },

  drawBgMonitorRoom(ctx, W, H) {
    ctx.fillStyle = '#03060d';
    ctx.fillRect(0, 0, W, H);
    // Parede de monitores (alguns mostrando partidas)
    const cols = 7;
    const rows = 3;
    const mw = W / (cols + 1);
    const mh = H * 0.15;
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < cols; i++) {
        const x = mw * 0.5 + i * mw;
        const y = H * 0.06 + r * (mh + 12);
        ctx.fillStyle = (i + r) % 3 === 0 ? '#14532d' : '#0b1736';
        ctx.fillRect(x + 4, y, mw - 8, mh);
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y, mw - 8, mh);
        if ((i + r) % 3 === 0) {
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.strokeRect(x + 14, y + 10, mw - 28, mh - 20);
        } else {
          ctx.fillStyle = 'rgba(0,245,212,0.6)';
          for (let k = 0; k < 4; k++) ctx.fillRect(x + 14, y + 12 + k * 10, (mw - 40) * ((k * 37 + i * 13) % 10) / 10, 4);
        }
      }
    }
    // Mesa de controle
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, H * 0.7, W, H * 0.3);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(W * 0.1, H * 0.66, W * 0.8, 18);
  },

  drawBgBlueLockRoom(ctx, W, H) {
    ctx.fillStyle = '#dbe4ef';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c3cfdf';
    ctx.fillRect(0, H * 0.7, W, H * 0.3);
    // "Z" gigante na parede e telão do ranking
    ctx.font = 'italic 900 220px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(29, 78, 216, 0.18)';
    ctx.fillText('Z', W * 0.5, H * 0.62);
    ctx.fillStyle = '#0b1736';
    ctx.fillRect(W * 0.62, H * 0.1, W * 0.3, H * 0.32);
    ctx.fillStyle = '#00f5d4';
    ctx.font = '900 16px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ['RANKING', '298  KUNIGAMI', '299  VOCÊ', '300  IGARASHI'].forEach((txt, i) => ctx.fillText(txt, W * 0.64, H * 0.16 + i * 26));
    // Beliches
    [0.06, 0.3].forEach((fx) => {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(W * fx, H * 0.3, W * 0.2, 10);
      ctx.fillRect(W * fx, H * 0.55, W * 0.2, 10);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(W * fx + 4, H * 0.3 - 14, W * 0.2 - 8, 14);
      ctx.fillRect(W * fx + 4, H * 0.55 - 14, W * 0.2 - 8, 14);
      ctx.fillStyle = '#334155';
      ctx.fillRect(W * fx, H * 0.24, 8, H * 0.46);
      ctx.fillRect(W * fx + W * 0.2 - 8, H * 0.24, 8, H * 0.46);
    });
  },

  drawBgNightHome(ctx, W, H) {
    ctx.fillStyle = '#0f1424';
    ctx.fillRect(0, 0, W, H);
    // Janela com lua e estrelas
    const wx = W * 0.58;
    const ww = W * 0.3;
    ctx.fillStyle = '#0b1736';
    ctx.fillRect(wx, H * 0.1, ww, H * 0.4);
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(wx + ((i * 73) % ww), H * 0.12 + ((i * 41) % (H * 0.36)), 2, 2);
    }
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.arc(wx + ww * 0.72, H * 0.2, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 8;
    ctx.strokeRect(wx, H * 0.1, ww, H * 0.4);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, H * 0.1);
    ctx.lineTo(wx + ww / 2, H * 0.5);
    ctx.stroke();
    // Escrivaninha com o envelope preto do Blue Lock
    ctx.fillStyle = '#5b3a1e';
    ctx.fillRect(W * 0.08, H * 0.6, W * 0.42, 16);
    ctx.fillRect(W * 0.1, H * 0.6, 12, H * 0.25);
    ctx.fillRect(W * 0.46, H * 0.6, 12, H * 0.25);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(W * 0.22, H * 0.56, 90, 26);
    ctx.fillStyle = '#00f5d4';
    ctx.beginPath();
    ctx.arc(W * 0.22 + 45, H * 0.56 + 13, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#161b2e';
    ctx.fillRect(0, H * 0.85, W, H * 0.15);
  },

  drawBgTunnel(ctx, W, H) {
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, W, H);
    // Luz do campo no fim do túnel
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, W * 0.45);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.25, 'rgba(200,230,255,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(W / 2 - 110, H * 0.3, 220, H * 0.3);
    // Arcos do túnel
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.9)';
    for (let k = 1; k <= 5; k++) {
      ctx.lineWidth = 10 - k;
      const s = 1 - k * 0.15;
      ctx.strokeRect(W / 2 - (W * 0.5 * s), H * 0.45 - H * 0.5 * s, W * s, H * s);
    }
  },

  renderCurrentStep() {
    const line = this.lines[this.currentIndex];
    if (!line) return;

    if (line.music) {
      this.dialogueMusic = line.music === 'none' ? null : line.music;
      if (this.dialogueMusic) window.SFX?.playMusic(this.dialogueMusic);
      else window.SFX?.stopMusic();
    }
    if (line.dark !== undefined) this.setDarkMode(line.dark);

    // Fala com "cinematic": toca uma animação de anime por cima do diálogo e depois segue.
    // Cena que ainda não existe é pulada (antes caía na animação genérica do chute)
    if (line.cinematic) {
      if (!this.hasSakuga(line.cinematic)) {
        this.next();
        return;
      }
      this.playActionSakuga(line.cinematic, () => this.next());
      return;
    }

    const titleEl = document.getElementById('vn-building-title');
    const crestEl = document.getElementById('vn-crest-title');
    const speakerEl = document.getElementById('vn-speaker-name');
    const textEl = document.getElementById('vn-dialogue-text');
    const portraitCv = document.getElementById('vn-portrait-canvas');
    const stageCv = document.getElementById('vn-stage-canvas');
    const hint = document.querySelector('.vn-click-continue');
    // Vozes sem personagem (alto-falante, repórter, apresentadora...) também ficam sem boneco
    const isNarrator = (s) => !s || /NARRADOR|ALTO-FALANTE|^VOZ\b|REPÓRTER|APRESENTADORA|LOCUTOR/i.test(s);

    if (titleEl) titleEl.textContent = this.locationTitle;
    if (crestEl) crestEl.textContent = this.crestTitle;
    if (line.bg) this.sceneBg = line.bg;
    this.renderBackground(this.sceneBg);

    const narrator = isNarrator(line.speaker);
    const mainChar = narrator ? null : this.getSpeakerCharData(line.speaker);
    this.voicePitch = narrator ? 0 : this.getVoicePitch(line.speaker);
    window.SFX?.page();
    // Quem falou antes fica no palco, escurecido (narrador e cenas não contam)
    let prevSpeaker = line.partnerSpeaker || null;
    let prevShadow = false;
    for (let i = this.currentIndex - 1; !prevSpeaker && i >= 0; i--) {
      const sp = this.lines[i].speaker;
      if (this.lines[i].cinematic) break;
      if (!isNarrator(sp) && sp !== line.speaker) {
        prevSpeaker = sp;
        prevShadow = !!this.lines[i].shadowFace;
      }
    }
    const secondChar = prevSpeaker ? this.getSpeakerCharData(prevSpeaker) : null;

    if (speakerEl) {
      // displayName: nome mostrado (ex: "???" para o Fox antes de ele se apresentar)
      speakerEl.textContent = line.displayName || line.speaker || 'NARRADOR';
      speakerEl.style.borderLeft = `6px solid ${mainChar?.auraColor || '#94a3b8'}`;
    }
    // Letra por letra; as escolhas e o "continuar" só aparecem quando a fala termina
    this.renderChoices(null);
    if (hint) hint.hidden = true;
    if (textEl) {
      textEl.classList.toggle('vn-narration', narrator);
      // {NOME} nas falas vira o nome do seu jogador
      const lineText = (line.text || '').replace(/\{NOME\}/g, window.App?.state?.profile?.name || 'Você');
      this.startTypewriter(textEl, lineText, () => {
        this.renderChoices(line);
      });
    }

    this.restartFade(stageCv);
    this.restartFade(portraitCv?.parentElement);

    if (portraitCv) {
      const pctx = portraitCv.getContext('2d');
      pctx.clearRect(0, 0, portraitCv.width, portraitCv.height);
      pctx.fillStyle = '#1e293b';
      pctx.fillRect(0, 0, portraitCv.width, portraitCv.height);
      if (mainChar) {
        window.PixelRenderer.drawCharacterSprite(pctx, mainChar, portraitCv.width, portraitCv.height + 34, {
          facing: 'front',
          frame: 4
        });
        // shadowFace: o rosto fica na sombra preta e só o sorriso aparece (o Fox escondido).
        // Mesma grade do retrato: x = metade da largura, pés em largura × 0.87
        if (line.shadowFace) this.drawFaceShadow(pctx, mainChar, portraitCv.width / 2, portraitCv.width * 0.87, portraitCv.width, { frame: 4 }, 1, 11.6, 12.4);
      } else {
        pctx.fillStyle = '#94a3b8';
        pctx.font = '900 40px "Segoe UI", sans-serif';
        pctx.textAlign = 'center';
        pctx.fillText('📖', portraitCv.width / 2, portraitCv.height / 2 + 8);
        pctx.font = '900 11px "Segoe UI", sans-serif';
        pctx.fillText('NARRAÇÃO', portraitCv.width / 2, portraitCv.height - 16);
      }
    }

    if (stageCv) {
      const sctx = stageCv.getContext('2d');
      sctx.clearRect(0, 0, stageCv.width, stageCv.height);
      const draw = (char, x, size, opts) => {
        sctx.save();
        sctx.translate(x, stageCv.height - size * 1.18);
        window.PixelRenderer.drawCharacterSprite(sctx, char, size, size * 1.18, Object.assign({ facing: 'front' }, opts));
        sctx.restore();
        // Quem fala com o rosto escondido: sombra preta no rosto, só o sorriso aparece
        if ((char === mainChar && line.shadowFace) || (char === secondChar && prevShadow)) {
          this.drawFaceShadow(sctx, char, x + size / 2, stageCv.height - size * 0.31, size, Object.assign({ facing: 'front' }, opts), 1, 11.6, 12.4);
        }
      };
      if (mainChar && secondChar && secondChar.name !== mainChar.name) {
        sctx.save();
        sctx.filter = 'brightness(0.45) saturate(0.6)';
        draw(secondChar, 140, 280, { frame: 2 });
        sctx.restore();
        draw(mainChar, 450, 305, { frame: 6 });
      } else if (mainChar) {
        draw(mainChar, 305, 300, { frame: 6 });
      } else if (secondChar) {
        // Narração: quem estava na cena fica ao fundo, apagado
        sctx.save();
        sctx.filter = 'brightness(0.35)';
        draw(secondChar, 305, 290, { frame: 2 });
        sctx.restore();
      }
    }
  }
};
