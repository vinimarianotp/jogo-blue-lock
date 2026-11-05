// ============================================================================
// BLUE LOCK: EGOIST CAREER - CONTROLADOR GERAL DE CARREIRA, GIROS, TREINOS E UI
// ============================================================================

window.App = {
  state: null,
  currentTab: 'HISTORIA',
  viewportFacing: 'front',
  lockerFilter: 'ALL',
  ownedOnlyFilter: false,
  spMultiplier: 1,
  animFrame: 0,

  defaultState() {
    return {
      profile: {
        name: 'Yori Triver',
        shirtName: 'TRIVER',
        number: 11,
        position: 'LW',
        height: "5' 11\"",
        dominantFoot: 'DIREITA',
        personality: 'SAÍDA',
        skinColor: '#f3d1b8',
        hairColor: '#1b2340',
        hairSecondary: '#3a5ba0',
        eyeColor: '#3b82f6',
        eyeStyle: 'default', // formato dos olhos (✏️ PERSONALIZAR → CREATOR_EYE_STYLES)
        hairStyle: 'isagi'
      },
      currencies: {
        egoCoins: 0,
        spins: 0,
        luckySpins: 0, // Giros da Sorte (comprados na LOJA)
        skillPoints: 0
      },
      // Você começa do ZERO absoluto (OVR 0) e evolui treinando e jogando!
      stats: {
        velocidade: 0,
        resistencia: 0,
        forca: 0,
        habilidadeAerea: 0,
        finalizando: 0,
        poderDisparo: 0,
        tirosLongos: 0,
        conducao: 0,
        visao: 0,
        posicionamento: 0,
        compostura: 0,
        ego: 0
      },
      // Progressão da Lore
      storyVersion: 3, // 2 = capítulos com o Torneio de Trios, 3 = visual do protagonista estilo Isagi (ver loadState)
      trio: null, // Torneio de Trios em andamento: { chapterId, mates: [id, id], round }
      nelClub: null, // Clube escolhido na NEL (id de NEL_CLUBS)
      nel: null, // Liga NEL em andamento: rodadas, tabela, placares e valores (App.initLeague)
      proClub: null, // Clube profissional (proposta aceita em App.openProOffers)
      pro: null, // Liga Europeia em andamento (mesmo formato de "nel", com a corrida pela Bola de Ouro)
      cup: null, // Copa do Mundo em andamento: { chapterId, round }
      monsterUnlocked: false, // O Fox acordou o monstro: ficando atrás no placar, ele desperta (MatchEngine.checkMonster)
      difficulty: 'normal', // Fácil / Normal / Egoísta (window.DIFFICULTY_MODES)
      tutorial: { basic: false, advanced: false }, // tutoriais já vistos (MatchEngine.startTutorialIfNeeded)
      trainingEnergy: 3, // treinos disponíveis até a próxima partida (TRAINING_ENERGY_MAX)
      ambidextrousBorn: false, // ganhou o sorteio de nascimento do pé AMBOS (window.AMBIDEXTROUS)
      seenInterludes: {}, // interlúdios já vistos (STORY_INTERLUDES): tocam uma vez, depois só no REVER
      blueLockEntered: false, // Só libera Giro de Arma e Fluxo após entrar no Blue Lock!
      nelUnlocked: false, // Libera 2º Slot de Arma, 2º Fluxo e Evolução na NEL!
      currentChapterIndex: 0,
      completedChapters: [],
      careerGoals: 0,
      careerAssists: 0,
      careerMatches: 0,
      nelSalaryBid: 0,

      // Armas e Fluxos (1 slot até a NEL, 2 slots na NEL)
      equippedWeapon: null,
      equippedWeapon2: null,
      unlockedWeapons: [],
      equippedFlow: null,
      equippedFlow2: null,
      unlockedFlows: [],
      selectedNelEvolution: null,

      // Locker / Acessórios da Print 2 (Começa com 0 comprados, apenas munhequeira básica liberada)
      ownedAccessories: ['wristband'],
      equippedAccessories: ['wristband'],

      // Equipe titular escolhida & Afinidade Química com os 66 personagens
      selectedSquad: ['shidou', 'yukimiya', 'bachira', 'sae'],
      affinities: {
        shidou: 85,
        yukimiya: 80,
        bachira: 75,
        sae: 70,
        rin: 65,
        hiori: 70,
        kurona: 65,
        nagi: 60,
        barou: 55,
        chigiri: 65,
        kunigami: 60,
        loki: 50,
        hugo: 50,
        kaiser: 45
      },
      // Escolhas de diálogo já feitas (cada uma só muda a relação uma vez)
      dialogueChoices: {},
      // Estatísticas da carreira (aba CONQUISTAS e conquistas com progresso)
      career: { wins: 0, draws: 0, losses: 0, myGoals: 0, angleGoals: 0, longGoals: 0, dribbles: 0, steals: 0, bestRating: 0, hatTricks: 0, luckyBought: 0, legendaryPulls: 0, worldClassPulls: 0 },
      unlockedAchievements: []
    };
  },

  init() {
    window.SFX?.init();
    this.rewindSlotToNel();
    this.loadState();
    this.bindNavigation();
    window.MatchEngine.init(document.getElementById('match-canvas'));
    this.renderAll();
    this.startLoop();
    this.openTitleScreen();
    if (this.rewoundToNel) this.notify('A Carreira 1 voltou para o começo da Liga NEL (atributos, armas e moedas mantidos).', '#00f5d4');
  },

  // ==========================================================================
  // TELA INICIAL: logo, seu jogador e o menu (continuar / nova carreira).
  // O fundo é desenhado no title-canvas enquanto a tela está aberta.
  // ==========================================================================
  openTitleScreen() {
    const el = document.getElementById('title-screen');
    if (!el) return;
    el.classList.add('open');
    this.titleMode = 'main';
    this.renderTitleMenu();
    if (this.titleRaf) cancelAnimationFrame(this.titleRaf);
    const loop = () => {
      if (!el.classList.contains('open')) return;
      this.drawTitleBackground();
      this.titleRaf = requestAnimationFrame(loop);
    };
    this.titleRaf = requestAnimationFrame(loop);
  },

  closeTitleScreen() {
    const el = document.getElementById('title-screen');
    if (el) el.classList.remove('open');
    if (this.titleRaf) cancelAnimationFrame(this.titleRaf);
    this.switchTab('HISTORIA');
  },

  // ==========================================================================
  // DUAS CARREIRAS (espaços de save 1 e 2). O espaço 1 usa a chave antiga, então
  // o save que já existia continua sendo a "Carreira 1".
  // ==========================================================================
  SLOT_KEYS: { 1: 'bluelock_egoist_career_v2', 2: 'bluelock_egoist_career_v2_slot2' },

  saveKey() {
    return this.SLOT_KEYS[this.activeSlot] || this.SLOT_KEYS[1];
  },

  // Pedido do jogador (29/10/2026): a Carreira 1 volta UMA vez para o começo da Liga NEL,
  // mantendo atributos, armas, fluxos, moedas e conquistas. Os capítulos da NEL em diante
  // são refeitos (o clube é escolhido de novo). Uma cópia do save antigo fica guardada
  // em "bluelock_backup_slot1_antes_da_nel".
  rewindSlotToNel() {
    const FLAG = 'bluelock_rewind_nel_v1';
    try {
      if (localStorage.getItem(FLAG)) return;
      const raw = localStorage.getItem(this.SLOT_KEYS[1]);
      const chs = window.CAREER_CHAPTERS;
      const nelIdx = chs.findIndex((c) => c.id === 'ch6_nel_barcha_manshine');
      // Sem save (navegador novo) ou save já desta versão (tem chapterResults): o pedido
      // era só para a carreira que existia em 29/10. Antes a marca não era gravada sem
      // save, e a carreira nova era rebobinada para a NEL no F5 seguinte
      if (!raw || nelIdx < 0) {
        localStorage.setItem(FLAG, '1');
        return;
      }
      const s = JSON.parse(raw);
      localStorage.setItem(FLAG, '1');
      if (s.chapterResults || (s.currentChapterIndex || 0) < nelIdx) return;
      localStorage.setItem('bluelock_backup_slot1_antes_da_nel', raw);
      const later = new Set(chs.slice(nelIdx).map((c) => c.id));
      s.completedChapters = (s.completedChapters || []).filter((id) => !later.has(id));
      Object.assign(s, { currentChapterIndex: nelIdx, nelClub: null, nel: null, proClub: null, pro: null, cup: null, trio: null, monsterUnlocked: false });
      const seen = Object.assign({}, s.seenInterludes);
      ['spain', 'cup_speech', 'rin_rivalry', 'convocation', 'fox_arrival', 'u20_aftermath'].forEach((id) => delete seen[id]);
      s.seenInterludes = seen;
      localStorage.setItem(this.SLOT_KEYS[1], JSON.stringify(s));
      this.rewoundToNel = true;
    } catch (e) {
      // Save ilegível: não mexe em nada
    }
  },

  readSlot(n) {
    try {
      const raw = localStorage.getItem(this.SLOT_KEYS[n]);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  // Resumo de um espaço para os botões do menu
  slotSummary(n) {
    const s = this.readSlot(n);
    if (!s) return null;
    // O índice salvo pode ser de antes dos capítulos novos: acerta numa cópia, como o loadState
    s.completedChapters = s.completedChapters || [];
    s.currentChapterIndex = s.currentChapterIndex || 0;
    this.skipCompletedChapters(s);
    const ch = window.CAREER_CHAPTERS[s.currentChapterIndex];
    const rank = this.getBlueLockRank(s.completedChapters);
    const club = ch?.league === 'pro' ? window.PRO_CLUBS[s.proClub] : ch?.nelPhase !== undefined && window.NEL_CLUBS[s.nelClub];
    return {
      name: s.profile?.name || `Carreira ${n}`,
      chapter: ch ? `Cap. ${ch.chapterNumber} • ${club ? club.name : ch.era.split('—')[0].trim()}` : 'Campeão do Mundo',
      rank: rank ? `Ranking #${rank}` : 'Ensino Médio'
    };
  },

  // titleMode: 'main' | 'new' (escolher criar outra ou apagar) | 'pick' (qual apagar) | 'confirm' (certeza?)
  renderTitleMenu() {
    const box = document.getElementById('title-menu');
    if (!box) return;
    const slots = [1, 2].map((n) => ({ n, info: this.slotSummary(n) }));
    const used = slots.filter((s) => s.info);
    const empty = slots.find((s) => !s.info);
    const mode = this.titleMode || 'main';
    const back = '<button class="title-btn ghost" onclick="App.setTitleMode(\'main\')">VOLTAR</button>';
    const slotLabel = (s) => `CARREIRA ${s.n} • ${s.info.name.toUpperCase()}<small>${s.info.chapter} • ${s.info.rank}</small>`;

    if (!used.length) {
      box.innerHTML = `<button class="title-btn primary" onclick="App.createCareerInSlot(1)">COMEÇAR CARREIRA<small>Prólogo • Final do Ensino Médio</small></button>`;
      return;
    }
    if (mode === 'new' && empty) {
      box.innerHTML = `
        <div class="title-confirm">Você tem ${used.length} carreira. O que quer fazer?</div>
        <button class="title-btn primary" onclick="App.createCareerInSlot(${empty.n})">CRIAR OUTRA CARREIRA<small>Fica no espaço ${empty.n}; a sua carreira atual continua salva</small></button>
        <button class="title-btn danger" onclick="App.setTitleMode('pick')">APAGAR UMA E COMEÇAR DE NOVO</button>
        ${back}`;
      return;
    }
    if (mode === 'pick' || mode === 'new') {
      box.innerHTML = `
        <div class="title-confirm">${used.length === 2 ? 'Você já tem 2 carreiras. Qual quer apagar para começar a nova?' : 'Qual carreira quer apagar?'}</div>
        ${used.map((s) => `<button class="title-btn danger" onclick="App.titleDeleteSlot=${s.n}; App.setTitleMode('confirm')">APAGAR ${slotLabel(s)}</button>`).join('')}
        ${back}`;
      return;
    }
    if (mode === 'confirm') {
      const s = slots.find((x) => x.n === this.titleDeleteSlot);
      box.innerHTML = `
        <div class="title-confirm">Apagar a Carreira ${s.n} (${s.info?.name}) e começar do zero no lugar dela? Não dá para desfazer.</div>
        <button class="title-btn danger" onclick="App.createCareerInSlot(${s.n})">SIM, APAGAR E COMEÇAR</button>
        ${back}`;
      return;
    }
    box.innerHTML = `
      ${used.map((s) => `<button class="title-btn ${s.n === this.activeSlot ? 'primary' : ''}" onclick="App.playSlot(${s.n})">${slotLabel(s)}</button>`).join('')}
      <button class="title-btn shop" onclick="App.openShopFromTitle()">🛒 LOJA<small>Giros e Giros da Sorte • Carreira ${this.activeSlot}</small></button>
      <button class="title-btn ghost" onclick="App.setTitleMode('new')">NOVA CARREIRA</button>`;
  },

  // LOJA direto da tela inicial (com as EgoCoins da carreira selecionada)
  openShopFromTitle() {
    if (!this.readSlot(this.activeSlot)) {
      const other = [1, 2].find((n) => this.readSlot(n));
      if (!other) return;
      this.activeSlot = other;
    }
    this.playSlot(this.activeSlot);
    this.switchTab('LOJA');
  },

  setTitleMode(mode) {
    this.titleMode = mode;
    this.renderTitleMenu();
  },

  // Entra numa carreira salva
  playSlot(n) {
    this.activeSlot = n;
    try {
      localStorage.setItem('bluelock_active_slot', String(n));
    } catch (e) {
      // ignore storage errors
    }
    this.loadState();
    this.renderAll();
    this.closeTitleScreen();
  },

  // Nova carreira no espaço n: primeiro você cria o seu jogador (o save antigo só é
  // apagado quando você confirma em COMEÇAR CARREIRA)
  createCareerInSlot(n) {
    this.openCreator('new', n);
  },

  startNewCareer(n, profile, difficulty) {
    this.activeSlot = n;
    try {
      localStorage.removeItem(this.SLOT_KEYS[n]);
      localStorage.setItem('bluelock_active_slot', String(n));
    } catch (e) {
      // ignore storage errors
    }
    this.state = this.defaultState();
    Object.assign(this.state.profile, profile);
    this.state.difficulty = difficulty;
    // Sorteio de nascimento: só uma pequena chance de nascer ambidestro
    const amb = window.AMBIDEXTROUS;
    this.state.ambidextrousBorn = Math.random() < amb.birthChance;
    if (this.state.ambidextrousBorn) this.state.profile.dominantFoot = 'AMBOS';
    this.saveState();
    this.renderAll();
    this.closeTitleScreen();
    if (this.state.ambidextrousBorn) {
      window.SFX?.jingle([523, 659, 784, 1047, 1319]);
      this.showGachaModal(
        '🎲 SORTEIO DE NASCIMENTO',
        'VOCÊ NASCEU AMBIDESTRO!',
        `SÓ ${Math.round(amb.birthChance * 100)}% NASCEM ASSIM`,
        '#facc15',
        `As duas pernas são boas. Passiva para a carreira toda:<br>• <strong>+${amb.accBonus}% de acerto no chute</strong><br>• <strong>+${amb.dribbleBonus}% de chance de drible</strong>`
      );
    } else {
      this.notify(`🎲 Sorteio de nascimento: você nasceu com o pé ${this.state.profile.dominantFoot}. AMBOS só libera no OVR ${amb.unlockOvr}.`, '#94a3b8');
    }
  },

  // Pode usar o pé AMBOS: nasceu assim ou já chegou no OVR de desbloqueio
  canBeAmbidextrous() {
    return !!this.state.ambidextrousBorn || this.calculateOVR() >= window.AMBIDEXTROUS.unlockOvr;
  },

  // ==========================================================================
  // CRIAR / EDITAR JOGADOR: o ✏️ na frente do nome muda o nome e abre o painel
  // PERSONALIZAR (cabelo, cores, pele, olhos, camisa, número, posição, pé). A
  // dificuldade fica na mesma tela. 'new' = nova carreira, 'edit' = ✏️ do topo.
  // ==========================================================================
  CREATOR_HAIR: [
    ['isagi', 'Protagonista'], ['spiky_tall', 'Espetado'], ['bachira_bob', 'Duas Cores'], ['rin_fringe', 'Franja (Rin)'],
    ['nagi_fluffy', 'Bagunçado (Nagi)'], ['barou_flame', 'Labaredas (Barou)'], ['shidou_horns', 'Explosão (Shidou)'], ['kunigami_spike', 'Herói (Kunigami)'],
    ['kaiser_gradient', 'Imperador (Kaiser)'], ['chigiri_long', 'Longo (Chigiri)'], ['sae_spiky', 'Gênio (Sae)'], ['loki_flattop', 'Topo Reto (Loki)'],
    ['hugo_wavy', 'Ondulado (Hugo)'], ['reo_bun', 'Coque (Reo)'], ['parted_glasses', 'Com Óculos'], ['ego_bob', 'Chanel (Ego)'],
    ['bangs_over_eyes', 'Capacete (Niko)'], ['bunny_messy', 'Rebelde (Bunny)'], ['lorenzo_wavy', 'Cortina (Lorenzo)'], ['aiku_messy', 'Capitão (Aiku)'],
    ['fox_slick', 'Raposa (Fox)'], ['anri_bob', 'Chanel (Anri)'], ['loki_kid', 'Topo Reto Curto'], ['kurona_braid', 'Trança (Kurona)']
  ],
  CREATOR_SKIN: ['#fde7d6', '#f3d1b8', '#e5b899', '#c99472', '#a26a47', '#7a4a2e', '#5a3622'],
  CREATOR_HAIR_COLORS: ['#1b2340', '#0f0f10', '#5b3a1e', '#a16207', '#facc15', '#e5e7eb', '#a94e68', '#ef4444', '#e2557f', '#1e3a8a', '#14532d', '#7c3aed'],
  CREATOR_EYES: ['#3b82f6', '#2aa198', '#22c55e', '#a16207', '#78350f', '#ef4444', '#7c3aed', '#0f172a'],
  // Formatos de olho (PixelRenderer: charData.eyeStyle)
  CREATOR_EYE_STYLES: [
    ['default', 'Padrão'], ['sharp', 'Afiado'], ['round', 'Brilhante'], ['fierce', 'Predador'],
    ['lidded', 'Calmo'], ['tired', 'Sonolento'], ['wide', 'Arregalado']
  ],
  CREATOR_POSITIONS: ['LW', 'RW', 'CF', 'ST', 'CAM', 'CM', 'CDM', 'CB'],
  CREATOR_FEET: ['DIREITA', 'ESQUERDA', 'AMBOS'],

  openCreator(mode, slot = null) {
    const base = mode === 'edit' ? this.state : this.defaultState();
    this.creator = {
      mode,
      slot,
      profile: Object.assign({}, base.profile),
      difficulty: base.difficulty || 'normal',
      facing: 'front',
      open: mode === 'edit',
      editingName: false,
      shirtTouched: mode === 'edit'
    };
    document.getElementById('creator-screen')?.classList.add('open');
    this.renderCreator();
  },

  closeCreator() {
    this.creator = null;
    document.getElementById('creator-screen')?.classList.remove('open');
  },

  // Botão/cor/estilo: muda e redesenha a tela
  creatorSet(field, value) {
    const c = this.creator;
    if (!c) return;
    if (field === 'dominantFoot' && value === 'AMBOS' && !this.creatorAmbosAllowed()) {
      const amb = window.AMBIDEXTROUS;
      this.notify(
        c.mode === 'new'
          ? `AMBOS é de nascença: ao começar a carreira há ${Math.round(amb.birthChance * 100)}% de chance de você nascer ambidestro. Senão, libera no OVR ${amb.unlockOvr}.`
          : `🔒 AMBOS libera no OVR ${amb.unlockOvr} (você está no OVR ${this.calculateOVR()}).`,
        '#f59e0b'
      );
      return;
    }
    if (field === 'difficulty' || field === 'facing' || field === 'open') c[field] = value;
    else c.profile[field] = value;
    window.SFX?.click();
    this.renderCreator();
  },

  // Texto digitado (nome, camisa, número): só atualiza o rascunho e o boneco, sem perder o foco
  creatorInput(field, value) {
    const c = this.creator;
    if (!c) return;
    if (field === 'name') {
      c.profile.name = value.slice(0, 22);
      // O nome na camisa acompanha o sobrenome até você mexer nele
      if (!c.shirtTouched) {
        const last = value.trim().split(/\s+/).pop() || '';
        c.profile.shirtName = last.toUpperCase().slice(0, 12);
        const shirt = document.getElementById('creator-shirt');
        if (shirt) shirt.value = c.profile.shirtName;
      }
    } else if (field === 'shirtName') {
      c.shirtTouched = true;
      c.profile.shirtName = value.toUpperCase().slice(0, 12);
    } else if (field === 'number') {
      c.profile.number = Math.max(1, Math.min(99, parseInt(value, 10) || 11));
    }
    this.drawCreatorPreview();
  },

  // AMBOS na tela: nunca ao criar (sai no sorteio de nascimento); depois, se nasceu
  // ambidestro ou já tem o OVR de desbloqueio
  creatorAmbosAllowed() {
    return this.creator?.mode === 'edit' && this.canBeAmbidextrous();
  },

  creatorFootHtml() {
    const c = this.creator;
    const amb = window.AMBIDEXTROUS;
    const allowed = this.creatorAmbosAllowed();
    const btns = this.CREATOR_FEET.map((v) => {
      const locked = v === 'AMBOS' && !allowed;
      return `<button class="chip ${c.profile.dominantFoot === v ? 'on' : ''} ${locked ? 'locked' : ''}" onclick="App.creatorSet('dominantFoot', '${v}')">${locked ? '🔒 ' : ''}${v}</button>`;
    }).join('');
    const note = c.mode === 'new'
      ? `🎲 AMBOS é de nascença: ao começar a carreira há <b>${Math.round(amb.birthChance * 100)}%</b> de chance de você nascer ambidestro (+${amb.accBonus}% chute, +${amb.dribbleBonus}% drible). Senão, libera no <b>OVR ${amb.unlockOvr}</b>.`
      : this.state.ambidextrousBorn
      ? '✨ Você nasceu ambidestro.'
      : allowed
      ? `✅ Você treinou a perna ruim (OVR ${amb.unlockOvr}+): AMBOS liberado.`
      : `🔒 AMBOS libera no OVR ${amb.unlockOvr} (você está no OVR ${this.calculateOVR()}).`;
    return `${btns}<div class="foot-note">${note}</div>`;
  },

  // ✏️: liga a edição do nome e abre o PERSONALIZAR
  creatorPencil() {
    const c = this.creator;
    if (!c) return;
    c.editingName = true;
    c.open = true;
    this.renderCreator();
    const inp = document.getElementById('creator-name-input');
    if (inp) {
      inp.focus();
      inp.select();
    }
  },

  creatorNameDone() {
    const c = this.creator;
    if (!c || !c.editingName) return;
    c.editingName = false;
    if (!c.profile.name.trim()) c.profile.name = 'Yori Triver';
    this.renderCreator();
  },

  confirmCreator() {
    const c = this.creator;
    if (!c) return;
    const profile = Object.assign({}, c.profile, { name: (c.profile.name || '').trim() || 'Yori Triver' });
    if (!profile.shirtName) profile.shirtName = profile.name.split(/\s+/).pop().toUpperCase().slice(0, 12);
    if (c.mode === 'new') {
      this.closeCreator();
      this.startNewCareer(c.slot, profile, c.difficulty);
      this.notify(`Bem-vindo, ${profile.name}! Dificuldade: ${window.DIFFICULTY_MODES[c.difficulty].name}.`, '#00f5d4');
      return;
    }
    Object.assign(this.state.profile, profile);
    this.state.difficulty = c.difficulty;
    this.saveState();
    this.closeCreator();
    this.renderAll();
    this.notify('Jogador atualizado!', '#00f5d4');
  },

  creatorLook(extra = {}) {
    const p = this.creator.profile;
    return Object.assign(
      { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8', number: p.number },
      extra
    );
  },

  drawCreatorPreview() {
    const c = this.creator;
    const cv = document.getElementById('creator-cv');
    if (!c || !cv) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    window.PixelRenderer.drawCharacterSprite(ctx, this.creatorLook(), cv.width, cv.height, {
      facing: c.facing,
      frame: 4,
      accessories: c.mode === 'edit' ? this.state.equippedAccessories : ['wristband'],
      shirtNumber: c.profile.number
    });
    const tag = document.getElementById('creator-tag');
    if (tag) tag.innerHTML = `<b>#${c.profile.number}</b> ${c.profile.shirtName || ''} <span>${c.profile.position}</span>`;
  },

  renderCreator() {
    const c = this.creator;
    const box = document.getElementById('creator-screen');
    if (!c || !box) return;
    const p = c.profile;
    const swatches = (field, list) =>
      `${list.map((col) => `<button class="swatch ${p[field] === col ? 'on' : ''}" style="background:${col}" onclick="App.creatorSet('${field}', '${col}')"></button>`).join('')}
       <label class="swatch custom" title="Outra cor"><input type="color" value="${p[field]}" onchange="App.creatorSet('${field}', this.value)">+</label>`;
    const chips = (field, list) => list.map((v) => `<button class="chip ${p[field] === v ? 'on' : ''}" onclick="App.creatorSet('${field}', '${v}')">${v}</button>`).join('');
    const nameHtml = c.editingName
      ? `<input id="creator-name-input" class="creator-name-input" maxlength="22" value="${p.name.replace(/"/g, '&quot;')}" oninput="App.creatorInput('name', this.value)" onkeydown="if(event.key==='Enter'){this.blur()}" onblur="App.creatorNameDone()">`
      : `<span class="creator-name" onclick="App.creatorPencil()">${p.name}</span>`;
    const diffs = Object.values(window.DIFFICULTY_MODES)
      .map((d) => `
        <button class="diff-card ${c.difficulty === d.id ? 'on' : ''}" style="--dc:${d.color}" onclick="App.creatorSet('difficulty', '${d.id}')">
          <strong>${d.icon} ${d.name}</strong>
          <span>${d.desc}</span>
          <em>${d.reward}</em>
        </button>`)
      .join('');
    box.innerHTML = `
      <div class="creator-box">
        <div class="creator-title">${c.mode === 'new' ? 'CRIE O SEU JOGADOR' : 'EDITAR JOGADOR'}</div>
        <div class="creator-cols">
          <div class="creator-preview">
            <canvas id="creator-cv" width="240" height="264"></canvas>
            <div id="creator-tag" class="creator-tag"></div>
            <div class="creator-facing">
              <button class="chip ${c.facing === 'front' ? 'on' : ''}" onclick="App.creatorSet('facing', 'front')">FRENTE</button>
              <button class="chip ${c.facing === 'back' ? 'on' : ''}" onclick="App.creatorSet('facing', 'back')">COSTAS</button>
            </div>
          </div>
          <div class="creator-form">
            <div class="creator-name-row">
              <button class="pencil-btn big" title="Personalizar" onclick="App.creatorPencil()">✏️</button>
              ${nameHtml}
            </div>
            <div class="creator-hint">${c.open ? 'Clique no nome ou no ✏️ para mudar o nome.' : 'Clique no ✏️ para mudar o nome e PERSONALIZAR o seu jogador.'}</div>
            ${c.open
              ? `
            <div class="creator-section">
              <h4>✏️ PERSONALIZAR</h4>
              <div class="creator-row">
                <label>Nome na camisa <input id="creator-shirt" class="ego-input" maxlength="12" value="${p.shirtName || ''}" oninput="App.creatorInput('shirtName', this.value)"></label>
                <label>Número <input class="ego-input" type="number" min="1" max="99" value="${p.number}" oninput="App.creatorInput('number', this.value)"></label>
              </div>
              <div class="creator-line"><span>Posição</span><div>${chips('position', this.CREATOR_POSITIONS)}</div></div>
              <div class="creator-line"><span>Pé bom</span><div>${this.creatorFootHtml()}</div></div>
              <div class="creator-line top"><span>Cabelo</span>
                <div class="hair-grid">${this.CREATOR_HAIR.map(([id, label]) => `<button class="hair-opt ${p.hairStyle === id ? 'on' : ''}" onclick="App.creatorSet('hairStyle', '${id}')"><canvas data-hair="${id}" width="64" height="52"></canvas><small>${label}</small></button>`).join('')}</div>
              </div>
              <div class="creator-line"><span>Cor do cabelo</span><div class="swatches">${swatches('hairColor', this.CREATOR_HAIR_COLORS)}</div></div>
              <div class="creator-line"><span>Mechas</span><div class="swatches">${swatches('hairSecondary', this.CREATOR_HAIR_COLORS)}</div></div>
              <div class="creator-line top"><span>Formato dos olhos</span>
                <div class="hair-grid eye-grid">${this.CREATOR_EYE_STYLES.map(([id, label]) => `<button class="hair-opt ${(p.eyeStyle || 'default') === id ? 'on' : ''}" onclick="App.creatorSet('eyeStyle', '${id}')"><canvas data-eye="${id}" width="64" height="40"></canvas><small>${label}</small></button>`).join('')}</div>
              </div>
              <div class="creator-line"><span>Cor dos olhos</span><div class="swatches">${swatches('eyeColor', this.CREATOR_EYES)}</div></div>
              <div class="creator-line"><span>Pele</span><div class="swatches">${swatches('skinColor', this.CREATOR_SKIN)}</div></div>
            </div>`
              : ''}
            <div class="creator-section">
              <h4>🎮 DIFICULDADE ${c.mode === 'edit' ? '<small>(dá para trocar quando quiser)</small>' : ''}</h4>
              <div class="diff-grid">${diffs}</div>
            </div>
            <div class="creator-actions">
              <button class="title-btn ghost" onclick="App.closeCreator()">${c.mode === 'new' ? 'VOLTAR' : 'CANCELAR'}</button>
              <button class="title-btn primary" onclick="App.confirmCreator()">${c.mode === 'new' ? 'COMEÇAR CARREIRA ▶' : 'SALVAR ✓'}</button>
            </div>
          </div>
        </div>
      </div>`;
    this.drawCreatorPreview();
    // Miniaturas dos cabelos: a cabeça do seu jogador com cada estilo
    box.querySelectorAll('canvas[data-hair]').forEach((cv) => {
      const ctx = cv.getContext('2d');
      const zoom = 3.2;
      const size = 36 * zoom;
      ctx.save();
      ctx.translate(cv.width / 2 - 18 * zoom, cv.height / 2 - (window.SPRITE_MAPY || ((y) => y))(6) * zoom);
      window.PixelRenderer.drawCharacterSprite(ctx, this.creatorLook({ hairStyle: cv.dataset.hair }), size, size * 1.1, { facing: 'front', frame: 4 });
      ctx.restore();
    });
    // Miniaturas dos olhos: zoom no rosto do seu jogador com cada formato
    box.querySelectorAll('canvas[data-eye]').forEach((cv) => {
      const ctx = cv.getContext('2d');
      const zoom = 4.6;
      const size = 36 * zoom;
      ctx.fillStyle = this.creator.profile.skinColor;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.save();
      ctx.translate(cv.width / 2 - 18 * zoom, cv.height / 2 - (window.SPRITE_MAPY || ((y) => y))(10) * zoom);
      // frame 1: nunca cai no quadro em que o boneco pisca
      window.PixelRenderer.drawCharacterSprite(ctx, this.creatorLook({ eyeStyle: cv.dataset.eye }), size, size * 1.1, { facing: 'front', frame: 1 });
      ctx.restore();
    });
  },

  drawTitleBackground() {
    const cv = document.getElementById('title-canvas');
    if (!cv) return;
    // Só recria o canvas quando a janela muda de tamanho (antes era a cada quadro)
    const cw = cv.clientWidth || 1280;
    const chh = cv.clientHeight || 720;
    if (cv.width !== cw || cv.height !== chh) {
      cv.width = cw;
      cv.height = chh;
    }
    const W = cv.width;
    const H = cv.height;
    const ctx = cv.getContext('2d');
    const t = (this.titleT = (this.titleT || 0) + 1);
    const horizon = H * 0.62;
    // Fundo parado (degradê + as linhas da grade que vão até você) pronto por tamanho de
    // tela: antes era um degradê de tela cheia + 29 traços em todo quadro
    if (this._titleBgKey !== `${W}x${H}`) {
      this._titleBgKey = `${W}x${H}`;
      const bg = document.createElement('canvas');
      bg.width = W;
      bg.height = H;
      const b = bg.getContext('2d');
      const g = b.createRadialGradient(W * 0.7, H * 0.45, 40, W * 0.6, H * 0.5, W * 0.8);
      g.addColorStop(0, '#0d2a5c');
      g.addColorStop(1, '#02050d');
      b.fillStyle = g;
      b.fillRect(0, 0, W, H);
      // Chão em grade correndo na sua direção
      b.strokeStyle = 'rgba(0, 245, 212, 0.18)';
      b.lineWidth = 1.5;
      b.beginPath();
      for (let i = -14; i <= 14; i++) {
        b.moveTo(W * 0.62 + i * 40, horizon);
        b.lineTo(W * 0.62 + i * 220, H);
      }
      b.stroke();
      this._titleBg = bg;
    }
    ctx.drawImage(this._titleBg, 0, 0);
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.18)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 10; k++) {
      const p = ((k + (t % 60) / 60) / 10) ** 2;
      const y = horizon + (H - horizon) * p;
      ctx.globalAlpha = p;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Linhas de velocidade atravessando a tela
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 22; i++) {
      const y = (i * 53 + t * 0.7) % horizon;
      const x = W - ((i * 211 + t * 14) % (W + 400));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 120 + (i % 4) * 60, y);
      ctx.stroke();
    }
    // Seu jogador em destaque, com um brilho do Ego atrás
    const size = Math.min(H * 0.95, W * 0.5);
    const p = this.state.profile;
    const glow = ctx.createRadialGradient(W * 0.74, H * 0.5, 20, W * 0.74, H * 0.5, size * 0.6);
    glow.addColorStop(0, `rgba(0, 245, 212, ${0.28 + Math.sin(t * 0.05) * 0.06})`);
    glow.addColorStop(1, 'rgba(0, 245, 212, 0)');
    ctx.fillStyle = glow;
    // só o quadrado do brilho (fora dele o degradê já é transparente)
    ctx.fillRect(W * 0.74 - size * 0.6, H * 0.5 - size * 0.6, size * 1.2, size * 1.2);
    ctx.save();
    ctx.translate(W * 0.74 - size / 2, H - size * 1.02);
    window.PixelRenderer.drawCharacterSprite(
      ctx,
      { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8', number: p.number },
      size,
      size * 1.1,
      { facing: 'front', frame: t, accessories: this.state.equippedAccessories }
    );
    ctx.restore();
    // Escurece a esquerda para o menu ler bem
    const fade = ctx.createLinearGradient(0, 0, W * 0.6, 0);
    fade.addColorStop(0, 'rgba(2, 5, 13, 0.92)');
    fade.addColorStop(1, 'rgba(2, 5, 13, 0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, Math.ceil(W * 0.6), H);
  },

  loadState() {
    try {
      // Qual das 2 carreiras estava aberta (se ela estiver vazia, abre a outra)
      if (!this.activeSlot) {
        const last = parseInt(localStorage.getItem('bluelock_active_slot'), 10);
        this.activeSlot = last === 2 ? 2 : 1;
        if (!localStorage.getItem(this.saveKey())) {
          const other = this.activeSlot === 1 ? 2 : 1;
          if (localStorage.getItem(this.SLOT_KEYS[other])) this.activeSlot = other;
        }
      }
      const saved = localStorage.getItem(this.saveKey());
      this.hasSave = !!saved;
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = Object.assign(this.defaultState(), parsed);
        // Campos novos dentro de objetos (saves antigos não têm)
        this.state.career = Object.assign(this.defaultState().career, parsed.career || {});
        // Quem já jogou antes do tutorial existir não precisa ver de novo
        if (!parsed.tutorial) {
          const played = (parsed.completedChapters || []).length;
          this.state.tutorial = { basic: played >= 1, advanced: played >= 2 };
        }
        const version = parsed.storyVersion || 1;
        if (version < 2) this.migrateChapterIndex();
        if (version < 3) this.migrateProtagonistLook();
        // Quem já tinha começado a Copa (ou passado dela) antes dos amistosos existirem não
        // volta para eles; a Copa antiga ganha a fase de grupos no começo
        const done = this.state.completedChapters;
        if (!done.includes('ch12b_wc_camp') && (done.includes('ch13_world_cup') || this.state.cup?.chapterId === 'ch13_world_cup' || this.state.seenInterludes?.convocation)) {
          done.push('ch12b_wc_camp');
        }
        this.migrateCupGroups();
        // Saves que terminaram no antigo último capítulo (a final Sub-20): seguem para os capítulos novos
        const chs = window.CAREER_CHAPTERS;
        // Capítulos novos inseridos no meio (Times Y e W, a 2ª Seleção, o Wild Card): o
        // índice salvo só pode ter ficado para trás, então anda por cima dos já concluídos e
        // dos novos que o save já passou (viram CAPÍTULO NOVO na HISTÓRIA, ver pendingExtraChapters)
        this.skipCompletedChapters();
        // O antigo Cap. 1 (Times X e Y) só fechava vencendo: quem o concluiu antes de existir
        // o registro de resultados venceu o Time X (o 🎬 REVER mostra a versão da vitória)
        if (this.state.completedChapters.includes('ch1_first_selection_x_y') && !this.state.chapterResults?.ch1_first_selection_x_y && !parsed.chapterResults) {
          this.state.chapterResults = Object.assign({}, this.state.chapterResults, { ch1_first_selection_x_y: 'win' });
        }
        // Carreira profissional assinada com um clube da NEL (antes dos clubes novos)
        if (window.PRO_LEGACY_MAP[this.state.proClub]) this.migrateProClubs();
        // Quem passou desses jogos antes das cenas existirem pode rever na aba HISTÓRIA
        this.markPostMatchScenesSeen();
        this.enforceRivalries();
        // Quem já passou do treino do Fox tem o monstro (saves de antes da marca existir)
        if ((this.state.completedChapters || []).includes('ch10_fox_training')) this.state.monsterUnlocked = true;
        // O save guarda o Fluxo inteiro: troca pela versão atual (as passivas novas)
        this.state.equippedFlow = window.resolveFlow?.(this.state.equippedFlow) ?? this.state.equippedFlow;
        this.state.equippedFlow2 = window.resolveFlow?.(this.state.equippedFlow2) ?? this.state.equippedFlow2;
        // AMBOS escolhido antes de virar passiva de nascença: só fica se já tem o OVR
        if (this.state.profile.dominantFoot === 'AMBOS' && !this.canBeAmbidextrous()) this.state.profile.dominantFoot = 'DIREITA';
      } else {
        this.state = this.defaultState();
      }
    } catch (e) {
      this.state = this.defaultState();
    }
  },

  // Cenas de pós-jogo que também ficam no 🎬 REVER: o Rin rival (depois da Sub-20 do
  // Japão) e a entrada do Fox (depois da final da Copa Sub-20)
  markPostMatchScenesSeen() {
    const done = this.state.completedChapters || [];
    const seen = Object.assign({}, this.state.seenInterludes);
    delete seen.u20_aftermath;
    if (done.includes('ch5_u20_japan')) seen.rin_rival_scene = true;
    if (done.includes('ch9_world_cup_final')) Object.assign(seen, { fox_arrival: true, four_egos: true });
    // Cenas que entraram depois: quem já passou delas pode ver no 🎬 REVER (a porta do
    // Wild Card fica para tocar no começo do capítulo do Wild Card, se ainda não tocou)
    if (done.includes('ch3_second_selection_world5')) Object.assign(seen, { nagi_choice: true, barou_devour: true, world_five_scene: true });
    // Cenas que tocam dentro dos capítulos da 1ª/2ª/3ª Seleção (e os interlúdios novos que
    // quem já passou desses capítulos não viu)
    if (done.includes('ch1_first_selection_x_y')) seen.barou_king_scene = true;
    // O final do jogo (depois do último duelo com o Rin)
    if (done.includes('ch14_rin_final')) seen.final_ending = true;
    // A noite da Bola de Ouro: quem ganhou a Bola de Ouro da temporada profissional
    if (done.includes('ch12_pro_season_2') && (this.state.unlockedAchievements || []).includes('ach_ballon_dor')) seen.ballon_night = true;
    if (done.includes('ch1b_team_y')) seen.ego_victory_scene = true;
    if (done.includes('ch1c_team_w')) seen.team_w_scene = true;
    if (done.includes('ch2b_second_selection')) Object.assign(seen, { bluelock_man_test: true, nagi_choice: true, rin_bachira_scene: true });
    if (done.includes('ch4_third_selection')) seen.ego_federation = true;
    if (done.includes('ch5_u20_japan')) Object.assign(seen, { bl_eleven: true, shidou_cut: true });
    if (done.includes('ch5_u20_japan')) seen.itoshi_snow = true;
    if (done.includes('ch5b_wild_card')) Object.assign(seen, { wildcard_door: true, wildcard_hell: true, wildcard_return: true });
    this.state.seenInterludes = seen;
  },

  // A história que você viveu: venceu o capítulo? (sem registro = o que aconteceu no mangá)
  chapterWon(id, canon = false) {
    const r = this.state?.chapterResults?.[id];
    return r ? r === 'win' : canon;
  },

  // Anda o índice por cima dos capítulos já concluídos e dos capítulos novos que o save já
  // passou (eles viram CAPÍTULO NOVO na HISTÓRIA). É o que faz o capítulo extra "voltar
  // para onde estava" — antes só pulava os concluídos e caía no próximo extra.
  // s = outro estado (ex: o resumo do menu lê o save cru do outro espaço)
  skipCompletedChapters(s = this.state) {
    const chs = window.CAREER_CHAPTERS;
    const done = s.completedChapters || [];
    while (chs[s.currentChapterIndex]) {
      const c = chs[s.currentChapterIndex];
      if (done.includes(c.id) || (c.extraForOldSaves && this.isPastExtraChapter(c, s))) s.currentChapterIndex++;
      else break;
    }
  },

  // Save que já tinha passado do ponto onde um capítulo novo entrou (ex: já jogou a NEL)
  // (= algum capítulo depois dele já foi concluído; o Wild Card também conta a NEL começada)
  isPastExtraChapter(ch, s = this.state) {
    const done = s.completedChapters || [];
    const chs = window.CAREER_CHAPTERS;
    const i = chs.indexOf(ch);
    if (i < 0) return false;
    if (ch.id === 'ch5b_wild_card' && (s.nel?.games || 0) > 0) return true;
    return chs.slice(i + 1).some((c) => done.includes(c.id));
  },

  // Capítulos novos que ficaram para trás no save: aparecem como CAPÍTULO NOVO na HISTÓRIA
  pendingExtraChapters() {
    const done = this.state.completedChapters || [];
    return window.CAREER_CHAPTERS.filter((c, i) => c.extraForOldSaves && i !== this.state.currentChapterIndex && !done.includes(c.id) && this.isPastExtraChapter(c));
  },

  extraChapterHtml() {
    const c = this.pendingExtraChapters()[0];
    if (!c) return '';
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]);
    return `
      <section class="story-card sh-frame sh-extra">
        <div class="sh-extra-txt">
          <span class="sh-chip">🃏 CAPÍTULO NOVO</span>
          <h3>${esc(c.title)}</h3>
          <p>${esc(c.loreSummary)} Você já passou desse ponto da história: jogue agora e depois volte exatamente para onde estava.</p>
        </div>
        <button class="story-play-btn sh-cta" onclick="App.playExtraChapter('${c.id}')"><small>CAP. ${c.chapterNumber} • ${esc(c.era.split('—')[0].trim())}</small><span>JOGAR CAPÍTULO NOVO</span><i>▶</i></button>
      </section>`;
  },

  playExtraChapter(id) {
    const i = window.CAREER_CHAPTERS.findIndex((c) => c.id === id);
    if (i < 0) return;
    this.state.currentChapterIndex = i;
    this.saveState();
    this.launchChapterMatch();
  },

  // A liga profissional usava os 5 clubes da NEL: cada um vira o clube novo equivalente
  // (PRO_LEGACY_MAP) no contrato, na tabela, nas rodadas e nos placares
  migrateProClubs() {
    const map = window.PRO_LEGACY_MAP;
    const to = (c) => map[c] || c;
    this.state.proClub = to(this.state.proClub);
    const pro = this.state.pro;
    if (!pro) return;
    pro.rounds = (pro.rounds || []).map((pairs) => pairs.map((p) => p.map((c) => (c ? to(c) : c))));
    pro.results = (pro.results || []).map((rs) => rs.map((r) => Object.assign({}, r, { a: to(r.a), b: to(r.b) })));
    const table = {};
    Object.keys(pro.table || {}).forEach((c) => (table[to(c)] = pro.table[c]));
    pro.table = table;
  },

  // Saves antigos guardam só o índice do capítulo. Com o Torneio de Trios entrando
  // entre a 3ª Seleção e a Sub-20, o índice é convertido pelo id do capítulo.
  migrateChapterIndex() {
    const legacyIds = [
      'ch0_prologue', 'ch1_first_selection_x_y', 'ch2_first_selection_v', 'ch3_second_selection_world5', 'ch4_third_selection',
      'ch5_u20_japan', 'ch6_nel_barcha_manshine', 'ch7_nel_ubers_pxg', 'ch8_u20_england', 'ch9_world_cup_final'
    ];
    const st = this.state;
    const ids = window.CAREER_CHAPTERS.map((c) => c.id);
    const oldId = legacyIds[st.currentChapterIndex];
    if (st.completedChapters.includes('ch5_u20_japan') && !st.completedChapters.includes('ch4b_trio_tournament')) {
      st.completedChapters.push('ch4b_trio_tournament');
    }
    let idx = ids.indexOf(oldId);
    // Quem estava para jogar a Sub-20 agora precisa ganhar a vaga no Torneio de Trios antes
    if (oldId === 'ch5_u20_japan' && !st.completedChapters.includes('ch5_u20_japan')) {
      idx = ids.indexOf('ch4b_trio_tournament');
    }
    if (idx >= 0) st.currentChapterIndex = idx;
    st.storyVersion = 2;
    try {
      localStorage.setItem(this.saveKey(), JSON.stringify(st));
    } catch (e) {
      // ignore storage errors
    }
  },

  // O cabelo "Espetado Protagonista" antigo vira o novo estilo Isagi; as cores só
  // mudam se ainda forem as padrão (quem personalizou mantém as suas)
  migrateProtagonistLook() {
    const p = this.state.profile;
    if (p.hairStyle === 'spiky_tall') p.hairStyle = 'isagi';
    if (p.hairColor === '#0f172a' && p.hairSecondary === '#2563eb') {
      p.hairColor = '#1b2340';
      p.hairSecondary = '#3a5ba0';
    }
    if (p.eyeColor === '#ef4444') p.eyeColor = '#3b82f6';
    this.state.storyVersion = 3;
    try {
      localStorage.setItem(this.saveKey(), JSON.stringify(this.state));
    } catch (e) {
      // ignore storage errors
    }
  },

  // Depois do vestiário da Sub-20 o Rin é o seu rival mortal: ele te odeia, química 0% para
  // sempre (nenhum treino, escolha ou jogo sobe de novo, e ele nunca é parceiro de Reação)
  isMortalRival(id) {
    return id === 'rin' && (this.state?.completedChapters || []).includes('ch5_u20_japan');
  },

  enforceRivalries() {
    if (this.state?.affinities && this.isMortalRival('rin')) this.state.affinities.rin = 0;
  },

  saveState() {
    this.enforceRivalries();
    try {
      localStorage.setItem(this.saveKey(), JSON.stringify(this.state));
      this.hasSave = true;
    } catch (e) {
      // ignore storage errors
    }
    this.updateTopHeader();
  },

  resetCareer() {
    if (confirm('Deseja reiniciar sua carreira do ZERO absoluto (OVR 0, 0 Moedas, 0 Giros)?')) {
      localStorage.removeItem(this.saveKey());
      this.state = this.defaultState();
      this.renderAll();
      this.notify('Carreira reiniciada no ZERO absoluto (OVR 0)!', '#38bdf8');
    }
  },

  // Sua posição no ranking do Blue Lock: a melhor entre os capítulos concluídos
  // (sai dos capítulos salvos, então funciona em saves antigos). null = ainda no colégio.
  getBlueLockRank(completed = this.state.completedChapters) {
    const ranks = (completed || []).map((id) => window.BLUE_LOCK_RANKING?.[id]).filter((r) => r);
    return ranks.length ? Math.min(...ranks) : null;
  },

  rankRewardLine(before, after) {
    if (!after || before === after) return '';
    return before
      ? `<br>• <strong style="color:#00f5d4">Ranking do Blue Lock: #${before} → #${after}</strong>`
      : `<br>• <strong style="color:#00f5d4">Você entra no Blue Lock: ranking #${after} de 300</strong>`;
  },

  // Linhas do Ego anunciando o ranking novo (vazio se não mudou)
  rankAnnouncement(before, after) {
    const name = this.state.profile.name.toUpperCase();
    if (!before || !after || before === after) return [];
    const line = after === 1
      ? `"Ranking do Blue Lock atualizado. ${name}: #${before} → #1. O número 1 do Blue Lock... é você."`
      : `"Ranking do Blue Lock atualizado. ${name}: #${before} → #${after}. Continuem devorando."`;
    return [{ bg: 'monitor_room', speaker: 'JINPACHI EGO', text: line, mood: 'ego' }];
  },

  // Calcula o OVR dinâmico e a Letra da Classificação (mais difícil e realista de upar!)
  calculateOVR() {
    const s = this.state.stats;
    const sum =
      s.velocidade + s.resistencia + s.forca + s.habilidadeAerea +
      s.finalizando + s.poderDisparo + s.tirosLongos + s.conducao +
      s.visao + s.posicionamento + s.compostura + s.ego;

    // Progressão mais difícil: cada ~22 pontos de atributos totais = +1 OVR
    let base = Math.floor(sum / 22);
    if (this.state.equippedWeapon) {
      const r = window.RARITY_TIERS[this.state.equippedWeapon.rarity];
      if (r) base += Math.max(1, Math.round(r.ovrBonus * 0.2));
    }
    if (this.state.nelUnlocked && this.state.equippedWeapon2) {
      const r2 = window.RARITY_TIERS[this.state.equippedWeapon2.rarity];
      if (r2) base += Math.max(1, Math.round(r2.ovrBonus * 0.12));
    }
    if (this.state.equippedFlow) {
      const rf = window.RARITY_TIERS[this.state.equippedFlow.rarity];
      if (rf) base += Math.max(1, Math.round(rf.ovrBonus * 0.12));
    }
    if (this.state.selectedNelEvolution) {
      base += 4;
    }
    return base;
  },

  // Escala o OVR dos personagens da Lore para acompanhar exatamente o mesmo nível de OVR do jogador!
  getScaledCharOVR(charData, isOpponent = false) {
    const playerOvr = this.calculateOVR();
    if (!charData) return playerOvr;
    // World Class: o jogador em si (não a arma) fica MUITO acima do seu personagem
    if (charData.worldClass) {
      return Math.max(charData.ovr || 99, playerOvr + 35);
    }
    // Diferença sutil baseada no tier original (-1 a +2) para manter todos no mesmo nível do jogador
    const rawDiff = Math.round(((charData.ovr || 85) - 85) / 8);
    const bonus = isOpponent ? Math.max(0, rawDiff) : rawDiff;
    // Companheiros com relação alta jogam melhor ao seu lado (-2 a +2)
    // (o rival mortal te odeia, mas joga no máximo por ele mesmo: sem bônus nem castigo)
    const relBonus = isOpponent || this.isMortalRival(charData.id) ? 0 : Math.round(((this.state.affinities[charData.id] ?? 50) - 50) / 25);
    return Math.max(0, playerOvr + bonus + relBonus);
  },

  // Aplica os efeitos de uma escolha de diálogo (relação com personagens + atributos)
  applyDialogueEffects(effects, choiceKey) {
    if (!effects) return;
    if (!this.state.dialogueChoices) this.state.dialogueChoices = {};
    if (choiceKey && this.state.dialogueChoices[choiceKey]) {
      this.notify('Você já fez essa escolha antes — a relação não muda de novo.', '#94a3b8');
      return;
    }
    const extraNames = { tada: 'Tada' };
    const parts = [];
    let color = '#22c55e';
    Object.entries(effects.affinity || {}).forEach(([id, delta]) => {
      if (this.isMortalRival(id)) return;
      const prev = this.state.affinities[id] ?? 50;
      this.state.affinities[id] = Math.max(0, Math.min(100, prev + delta));
      const c = window.BLUE_LOCK_CHARACTERS.find((x) => x.id === id);
      const name = c ? c.name : extraNames[id] || id;
      parts.push(`${delta >= 0 ? '▲' : '▼'} ${name} ${delta >= 0 ? '+' : ''}${delta}`);
      if (delta < 0) color = '#ef4444';
    });
    Object.entries(effects.stats || {}).forEach(([k, v]) => {
      if (this.state.stats[k] === undefined) return;
      this.state.stats[k] = Math.max(0, this.state.stats[k] + v);
      parts.push(`${v >= 0 ? '+' : ''}${v} ${k.toUpperCase()}`);
    });
    if (choiceKey) this.state.dialogueChoices[choiceKey] = true;
    this.saveState();
    if (parts.length) this.notify(`RELAÇÃO: ${parts.join(' • ')}`, color);
  },

  getRankLetter(ovr) {
    if (ovr >= 95) return { letter: 'WC', color: '#00f5d4', label: 'WORLD CLASS' };
    if (ovr >= 82) return { letter: 'SS', color: '#ef4444', label: 'RANK SS' };
    if (ovr >= 68) return { letter: 'S', color: '#facc15', label: 'RANK S' };
    if (ovr >= 52) return { letter: 'A', color: '#a855f7', label: 'RANK A' };
    if (ovr >= 38) return { letter: 'B', color: '#38bdf8', label: 'RANK B' };
    if (ovr >= 24) return { letter: 'C', color: '#22c55e', label: 'RANK C' };
    if (ovr >= 12) return { letter: 'D', color: '#eab308', label: 'RANK D' };
    if (ovr >= 3) return { letter: 'E', color: '#f97316', label: 'RANK E' };
    return { letter: 'G', color: '#64748b', label: 'INICIANTE (0)' };
  },

  bindNavigation() {
    document.querySelectorAll('.top-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
  },

  switchTab(tabName) {
    if (this.currentTab !== tabName) window.SFX?.click();
    this.currentTab = tabName;
    document.querySelectorAll('.top-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
    this.renderAll();
  },

  // Passo fixo de 60 atualizações por segundo: em monitores de 120/144 Hz o
  // requestAnimationFrame roda 2x mais vezes e deixava a partida acelerada
  startLoop() {
    const STEP = 1000 / 60;
    let last = performance.now();
    let lastDraw = last;
    let acc = 0;
    const loop = (now) => {
      // O próximo quadro é pedido antes: um erro num quadro não congela mais o jogo inteiro
      requestAnimationFrame(loop);
      acc += Math.min(250, now - last);
      last = now;
      try {
        let ran = false;
        while (acc >= STEP) {
          acc -= STEP;
          this.animFrame++;
          if (window.MatchEngine.active) window.MatchEngine.update();
          ran = true;
        }
        // Só redesenha (vitrines do menu e partida) quando o jogo andou: em tela de
        // 120/144 Hz o mesmo quadro era desenhado 2x (o desenho é a parte cara)
        if (ran) this.renderLiveViewport();
        if (window.MatchEngine.active && ran) {
          window.MatchEngine.draw();
          // tempo entre um desenho e outro (a resolução automática do celular usa)
          if (window.MatchEngine.noteFrameTime) window.MatchEngine.noteFrameTime(Math.min(250, now - lastDraw));
          lastDraw = now;
        }
      } catch (e) {
        acc = 0;
        console.error(e);
      }
    };
    requestAnimationFrame(loop);
  },

  renderLiveViewport() {
    // Partida ou cutscene por cima: as vitrines das abas ficam escondidas, não desenha
    if (window.MatchEngine?.active || window.CutsceneEngine?.active || window.CutsceneEngine?.sakugaActive) return;
    // A vitrine da aba ATRIBUTOS tem desenho próprio (aura + rim light): drawAttrShowcase
    this.drawAttrShowcase();
    const canvases = [
      document.getElementById('profile-viewport-canvas')
    ];
    canvases.forEach((cv) => {
      if (!cv || cv.offsetParent === null) return;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);

      // Plataforma azul sob os pés (igual à Print 2)
      ctx.fillStyle = '#172554';
      ctx.fillRect(35, cv.height - 38, cv.width - 70, 22);
      ctx.strokeStyle = '#3b82f6';
      ctx.strokeRect(35, cv.height - 38, cv.width - 70, 22);

      const p = this.state.profile;
      window.PixelRenderer.drawCharacterSprite(
        ctx,
        {
          skinColor: p.skinColor,
          hairColor: p.hairColor,
          hairSecondary: p.hairSecondary,
          eyeColor: p.eyeColor,
          eyeStyle: p.eyeStyle,
          hairStyle: p.hairStyle,
          jerseyPrimary: '#0f2942',
          jerseySecondary: '#1d4ed8',
          number: p.number
        },
        cv.width,
        cv.height - 15,
        {
          facing: this.viewportFacing,
          frame: this.animFrame,
          accessories: this.state.equippedAccessories,
          shirtNumber: p.number
        }
      );
    });
  },

  updateTopHeader() {
    const ovr = this.calculateOVR();
    const p = this.state.profile;
    document.querySelectorAll('.js-player-name').forEach((el) => (el.textContent = p.name));
    document.querySelectorAll('.js-player-pos').forEach((el) => (el.textContent = p.position));
    document.querySelectorAll('.js-player-ovr').forEach((el) => (el.textContent = `OVR ${ovr}`));
    document.querySelectorAll('.js-egocoins').forEach((el) => (el.textContent = this.state.currencies.egoCoins));
    document.querySelectorAll('.js-spins').forEach((el) => (el.textContent = this.state.currencies.spins));
    document.querySelectorAll('.js-lucky').forEach((el) => (el.textContent = this.state.currencies.luckySpins || 0));
    document.querySelectorAll('.js-sp').forEach((el) => (el.textContent = this.state.currencies.skillPoints));
    document.querySelectorAll('.js-shirt-number-preview').forEach((el) => (el.textContent = `#${p.number}`));
    document.querySelectorAll('.js-shirt-name-preview').forEach((el) => (el.textContent = p.shirtName));
    const ch = window.CAREER_CHAPTERS[this.state.currentChapterIndex];
    const rank = this.getBlueLockRank();
    document.querySelectorAll('.js-chapter-note').forEach((el) => {
      el.textContent = `${rank ? `RANKING BLUE LOCK #${rank} • ` : ''}${ch ? `CAP. ${ch.chapterNumber} • ${ch.era}` : 'CAMPEÃO DO MUNDO'}`;
    });
  },

  renderAll() {
    this.checkAchievements();
    this.updateTopHeader();
    this.renderStoryHub();
    this.renderProfileTab();
    this.renderStatsTab();
    this.renderWeaponsTab();
    this.renderFlowsTab();
    this.renderShopTab();
    this.renderCareerAndFaseTabs();
    this.renderTrainingTab();
    this.renderSquadAndRelationships();
    this.renderAchievementsAndObjectives();
  },

  // ==========================================================================
  // ABA 1: PROFILE & LOCKER (IGUAL À PRINT 2)
  // ==========================================================================
  renderProfileTab() {
    // Os campos de aparência mostram o que está salvo (antes ficavam sempre no valor padrão)
    const p = this.state.profile;
    [['hair-style-select', p.hairStyle], ['hair-color-input', p.hairColor], ['hair-secondary-input', p.hairSecondary], ['eye-color-input', p.eyeColor],
      ['profile-name-input', p.name], ['profile-shirt-input', p.shirtName], ['profile-number-input', String(p.number)]].forEach(([id, v]) => {
      const el = document.getElementById(id);
      // (não mexe no campo que você está digitando agora)
      if (el && v && el.value !== v && document.activeElement !== el) el.value = v;
    });

    const grid = document.getElementById('locker-grid');
    if (!grid) return;

    const items = window.LOCKER_ITEMS.filter((it) => {
      if (this.lockerFilter !== 'ALL' && it.slot !== this.lockerFilter) return false;
      if (this.ownedOnlyFilter && !this.state.ownedAccessories.includes(it.id)) return false;
      return true;
    });

    const ownedCountEl = document.getElementById('locker-owned-count');
    if (ownedCountEl) {
      ownedCountEl.textContent = `${this.state.ownedAccessories.length} DE ${window.LOCKER_ITEMS.length}`;
    }

    const slotNames = { HEAD: 'CABEÇA', FACE: 'ROSTO', ARM: 'BRAÇO', WRIST: 'PULSO', HANDS: 'MÃOS', BACK: 'COSTAS' };
    grid.innerHTML = items
      .map((it) => {
        const owned = this.state.ownedAccessories.includes(it.id);
        const equipped = this.state.equippedAccessories.includes(it.id);
        return `
        <div class="locker-card ${equipped ? 'equipped' : ''} ${owned ? 'owned' : ''}" onclick="App.toggleOrBuyAccessory('${it.id}')" title="${it.desc}">
          <div class="locker-card-top">
            ${equipped ? '<span class="badge-on">EM USO</span>' : '<span></span>'}
            <span class="slot-tag">${slotNames[it.slot] || it.slot}</span>
          </div>
          <div class="locker-icon-box" style="border-color:${it.color}">
            <canvas class="locker-item-cv" data-item="${it.id}" data-slot="${it.slot}" width="72" height="64"></canvas>
          </div>
          <div class="locker-item-name">${it.name}</div>
          <div class="locker-item-status ${equipped ? 'text-green' : owned ? 'text-cyan' : 'text-gold'}">
            ${equipped ? 'EQUIPADO' : owned ? 'EQUIPAR' : `💠 ${it.cost}`}
          </div>
        </div>
      `;
      })
      .join('');

    // Ícone: o seu boneco usando o acessório, com zoom na parte do corpo onde ele vai
    const look = { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8' };
    // (bonecos novos: cabeça mais baixa, braçadeira no braço da direita da tela, zoom
    // em múltiplo de 2 = pixel inteiro)
    const v2 = window.PixelRenderer.spritesV2;
    const M = window.SPRITE_MAPY || ((y) => y);
    const focus = v2
      ? { HEAD: [18, M(6.5)], FACE: [18, M(11)], ARM: [25.5, M(16.5)], WRIST: [26.5, M(19.5)], HANDS: [26.5, M(20.8)], BACK: [18, M(15)] }
      : { HEAD: [18, 4], FACE: [18, 9], ARM: [10, 16], WRIST: [25, 19], HANDS: [25, 20], BACK: [18, 15] };
    grid.querySelectorAll('.locker-item-cv').forEach((cv) => {
      const ctx = cv.getContext('2d');
      const zoom = cv.dataset.slot === 'BACK' ? (v2 ? 4 : 3) : v2 ? 6 : 5;
      const [fx, fy] = focus[cv.dataset.slot] || [18, 14];
      const size = 36 * zoom;
      ctx.save();
      ctx.translate(cv.width / 2 - fx * zoom, cv.height / 2 - fy * zoom);
      window.PixelRenderer.drawCharacterSprite(ctx, look, size, size * 1.1, {
        facing: cv.dataset.slot === 'BACK' ? 'back' : 'front',
        frame: 4,
        accessories: [cv.dataset.item]
      });
      ctx.restore();
    });
  },

  toggleOrBuyAccessory(itemId) {
    const item = window.LOCKER_ITEMS.find((i) => i.id === itemId);
    if (!item) return;

    if (this.state.ownedAccessories.includes(itemId)) {
      if (this.state.equippedAccessories.includes(itemId)) {
        this.state.equippedAccessories = this.state.equippedAccessories.filter((id) => id !== itemId);
      } else {
        this.state.equippedAccessories.push(itemId);
      }
      this.saveState();
      this.renderProfileTab();
      return;
    }

    if (this.state.currencies.egoCoins < item.cost) {
      this.notify(`EgoCoins insuficientes! Precisa de ${item.cost} EgoCoins.`, '#ef4444');
      return;
    }
    this.state.currencies.egoCoins -= item.cost;
    this.state.ownedAccessories.push(itemId);
    this.state.equippedAccessories.push(itemId);
    this.saveState();
    this.renderProfileTab();
    this.notify(`${item.name} comprado e equipado!`, '#22c55e');
  },

  setLockerFilter(slot, btnEl) {
    this.lockerFilter = slot;
    document.querySelectorAll('.locker-filter-btn').forEach((b) => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    this.renderProfileTab();
  },

  toggleViewportFacing(facing) {
    this.viewportFacing = facing;
  },

  changePosition() {
    const positions = ['LW', 'CF', 'ST', 'RW', 'CAM', 'CM', 'CDM', 'CB', 'GK'];
    const idx = positions.indexOf(this.state.profile.position);
    this.state.profile.position = positions[(idx + 1) % positions.length];
    this.saveState();
    this.renderAll();
  },

  updateAppearance(field, value) {
    this.state.profile[field] = value;
    this.saveState();
    this.renderAll();
  },

  // ==========================================================================
  // ABA 2: ESTATÍSTICAS & OVERALL (IGUAL À PRINT 3)
  // ==========================================================================
  // Visual da aba em css/atributos.css (tudo dentro de #tab-ESTATISTICAS).
  // As linhas dos atributos são montadas uma vez e depois só atualizadas: assim a barra
  // desliza até o valor novo, o número salta e o "+N" sobe quando um atributo aumenta.
  ATTR_CATEGORIES: [
    {
      id: 'fisico',
      containerId: 'stats-list-fisico',
      color: '#00f5d4',
      items: [
        { key: 'velocidade', label: 'Velocidade' },
        { key: 'resistencia', label: 'Resistência' },
        { key: 'forca', label: 'Força' },
        { key: 'habilidadeAerea', label: 'Habilidade Aérea' }
      ]
    },
    {
      id: 'tecnica',
      containerId: 'stats-list-tecnica',
      color: '#3b82f6',
      items: [
        { key: 'finalizando', label: 'Finalização' },
        { key: 'poderDisparo', label: 'Poder de Disparo' },
        { key: 'tirosLongos', label: 'Tiros Longos' },
        { key: 'conducao', label: 'Condução de Bola' }
      ]
    },
    {
      id: 'mental',
      containerId: 'stats-list-mental',
      color: '#a78bfa',
      items: [
        { key: 'visao', label: 'Visão' },
        { key: 'posicionamento', label: 'Posicionamento' },
        { key: 'compostura', label: 'Compostura' },
        { key: 'ego', label: 'Ego' }
      ]
    }
  ],

  // Radar: 6 eixos que juntos cobrem os 12 atributos (média de cada grupo)
  ATTR_RADAR: [
    { label: 'RITMO', keys: ['velocidade', 'resistencia'] },
    { label: 'FÍSICO', keys: ['forca', 'habilidadeAerea'] },
    { label: 'CHUTE', keys: ['finalizando', 'poderDisparo', 'tirosLongos'] },
    { label: 'DRIBLE', keys: ['conducao'] },
    { label: 'VISÃO', keys: ['visao', 'posicionamento'] },
    { label: 'EGO', keys: ['compostura', 'ego'] }
  ],

  // Cor da aura da vitrine: a do Fluxo equipado; senão a cor dos olhos (se não for escura demais)
  attrAuraColor() {
    const fl = this.state.equippedFlow;
    if (fl && fl.color) return fl.color;
    const eye = this.state.profile.eyeColor;
    if (/^#[0-9a-f]{6}$/i.test(eye || '')) {
      const n = parseInt(eye.slice(1), 16);
      const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
      if (lum > 70) return eye;
    }
    return '#00f5d4';
  },

  renderStatsTab() {
    const root = document.getElementById('atr-root');
    if (!root) return;
    const st = this.state;
    const p = st.profile;
    const ovr = this.calculateOVR();
    const rank = this.getRankLetter(ovr);
    const sp = st.currencies.skillPoints;
    const visible = root.offsetParent !== null;
    // Acabou de abrir a aba: painéis entram e as barras enchem (uma vez só)
    const intro = visible && !this._atrWasVisible;
    this._atrWasVisible = visible;
    const prev = visible && !intro ? this._atrPrev : null;

    this._atrAura = this.attrAuraColor();
    root.style.setProperty('--atr-rank', rank.color);
    root.style.setProperty('--atr-aura', this._atrAura);
    root.classList.toggle('atr-nosp', sp <= 0);

    const set = (id, txt) => {
      const el = document.getElementById(id);
      if (el && el.textContent !== String(txt)) el.textContent = txt;
      return el;
    };
    const pop = (el) => {
      if (!el) return;
      el.classList.remove('atr-pop');
      void el.offsetWidth;
      el.classList.add('atr-pop');
    };

    // Vitrine + classificação
    const ovrEl = set('atr-ovr-num', ovr);
    set('atr-pos', p.position);
    const letterEl = set('stats-rank-letter', rank.letter);
    if (letterEl) letterEl.classList.toggle('atr-two', rank.letter.length > 1);
    set('atr-rank-label', rank.label);
    set('stats-rank-ovr', `OVR ${ovr}`);
    set('atr-number', `#${p.number}`);
    set('atr-watermark', p.number);
    const nameEl = set('atr-name', p.name);
    if (nameEl) nameEl.title = p.name;
    set('atr-personality', `PERSONALIDADE: ${p.personality || 'SAÍDA'} / EGOÍSTA`);
    set('atr-height', p.height || `5' 11"`);
    const foot = p.dominantFoot || 'DIREITA';
    const footEl = set('stats-foot', foot === 'AMBOS' ? `AMBOS ${st.ambidextrousBorn ? '✨ (nato)' : '✅'}` : foot);
    if (footEl) footEl.title = footEl.textContent;
    const blr = this.getBlueLockRank();
    set('atr-blr', blr ? `#${blr}` : '—');

    // SP
    const spEl = set('atr-sp-num', sp);
    set('sp-mult-display', this.spMultiplier);
    if (prev && ovr > prev.ovr) {
      pop(ovrEl);
      pop(document.getElementById('atr-emblem'));
    }
    if (prev && sp !== prev.sp) pop(spEl);

    // Atributos
    const gain = sp > 0 ? Math.min(sp, this.spMultiplier) : 0;
    this.ATTR_CATEGORIES.forEach((cat) => {
      const box = document.getElementById(cat.containerId);
      if (!box) return;
      if (box.dataset.built !== '1') {
        box.innerHTML = cat.items
          .map((it) => `
          <div class="atr-stat" data-key="${it.key}" style="--bar:${it.key === 'ego' ? '#ef4444' : cat.color}">
            <span class="atr-stat-label">${it.label}</span>
            <span class="atr-stat-val">0</span>
            <button class="atr-add" onclick="App.upgradeStat('${it.key}')" title="Adicionar Pontos de Habilidade"><span>+</span></button>
            <div class="atr-bar">
              <div class="atr-bar-track"></div>
              <div class="atr-bar-glow"><div class="atr-bar-seg"><div class="atr-bar-ghost"></div><div class="atr-bar-fill"></div></div></div>
            </div>
            <span class="atr-stat-fx">⚽ <span></span></span>
          </div>`)
          .join('');
        box.dataset.built = '1';
      }
      let sum = 0;
      cat.items.forEach((it) => {
        const row = box.querySelector(`[data-key="${it.key}"]`);
        if (!row) return;
        const val = st.stats[it.key] ?? 0;
        sum += val;
        row.querySelector('.atr-bar-fill').style.width = `${Math.min(100, (val / 200) * 100)}%`;
        row.querySelector('.atr-bar-ghost').style.width = `${Math.min(100, ((val + gain) / 200) * 100)}%`;
        const valEl = row.querySelector('.atr-stat-val');
        if (valEl.textContent !== String(val)) valEl.textContent = val;
        valEl.classList.toggle('atr-hi', val >= 100);
        const fx = row.querySelector('.atr-stat-fx span');
        const fxText = window.MatchEngine.describeStatEffect(it.key, st.stats);
        if (fx.textContent !== fxText) fx.textContent = fxText;
        const before = prev ? prev.stats[it.key] : undefined;
        if (before !== undefined && val > before) this.attrCelebrate(row, valEl, val - before);
      });
      const avg = Math.round(sum / cat.items.length);
      const avgEl = set(`atr-avg-${cat.id}`, avg);
      if (prev && avg > prev.avg[cat.id]) pop(avgEl);
      (this._atrAvg = this._atrAvg || {})[cat.id] = avg;
    });

    this._atrPrev = { ovr, sp, stats: Object.assign({}, st.stats), avg: Object.assign({}, this._atrAvg) };

    if (intro) {
      root.classList.remove('atr-intro');
      void root.offsetWidth;
      root.classList.add('atr-intro');
      clearTimeout(this._atrIntroT);
      this._atrIntroT = setTimeout(() => root.classList.remove('atr-intro'), 1300);
    }
    this.drawAttrRadar(intro);
    this.drawAttrShowcase();
  },

  // Atributo subiu: número salta, "+N" sobe e um brilho passa uma vez pela linha
  attrCelebrate(row, valEl, delta) {
    row.classList.remove('atr-up');
    valEl.classList.remove('atr-pop');
    void row.offsetWidth;
    row.classList.add('atr-up');
    valEl.classList.add('atr-pop');
    row.querySelectorAll('.atr-float').forEach((f) => f.remove());
    const f = document.createElement('span');
    f.className = 'atr-float';
    f.textContent = `+${delta}`;
    // logo à esquerda do número, na altura dele
    f.style.right = `${row.clientWidth - valEl.offsetLeft + 6}px`;
    f.style.top = `${valEl.offsetTop}px`;
    row.appendChild(f);
    setTimeout(() => f.remove(), 950);
    clearTimeout(row._atrT);
    row._atrT = setTimeout(() => {
      row.classList.remove('atr-up');
      valEl.classList.remove('atr-pop');
    }, 700);
  },

  // Radar hexagonal: anima do valor antigo para o novo (0,45s)
  drawAttrRadar(fromZero) {
    const cv = document.getElementById('atr-radar-cv');
    if (!cv || cv.offsetParent === null) return;
    const target = this.ATTR_RADAR.map((ax) => ax.keys.reduce((a, k) => a + (this.state.stats[k] || 0), 0) / ax.keys.length);
    const max = Math.max(50, Math.ceil(Math.max(...target) / 50) * 50);
    const scaleEl = document.getElementById('atr-radar-scale');
    if (scaleEl) scaleEl.textContent = `ESCALA 0–${max}`;
    const key = `${target.join(',')}|${cv.clientWidth}x${cv.clientHeight}`;
    if (!fromZero && key === this._atrRadarKey) return;
    this._atrRadarKey = key;
    const from = fromZero || !this._atrRadarCur ? target.map(() => 0) : this._atrRadarCur;
    const fromMax = fromZero || !this._atrRadarMax ? max : this._atrRadarMax;
    const t0 = performance.now();
    const dur = 450;
    cancelAnimationFrame(this._atrRadarRaf);
    const step = (now) => {
      const t = Math.min(1, Math.max(0, (now - t0) / dur));
      const e = 1 - Math.pow(1 - t, 3);
      const cur = target.map((v, i) => from[i] + (v - from[i]) * e);
      this._atrRadarCur = cur;
      this._atrRadarMax = fromMax + (max - fromMax) * e;
      this.paintAttrRadar(cv, cur, this._atrRadarMax);
      if (t < 1) this._atrRadarRaf = requestAnimationFrame(step);
    };
    step(t0);
  },

  paintAttrRadar(cv, vals, max) {
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, cv.clientWidth);
    const H = Math.max(1, cv.clientHeight);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2 + 6;
    const R = Math.max(20, Math.min(W / 2 - 50, H / 2 - 31));
    const n = vals.length;
    const pt = (i, r) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / n;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    const poly = (r) => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const [x, y] = pt(i, typeof r === 'function' ? r(i) : r);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
    };
    // grade
    for (let ring = 4; ring >= 1; ring--) {
      poly((R * ring) / 4);
      ctx.fillStyle = ring % 2 ? 'rgba(30, 58, 110, 0.22)' : 'rgba(8, 16, 34, 0.5)';
      ctx.fill();
      ctx.strokeStyle = ring === 4 ? 'rgba(96, 165, 250, 0.35)' : 'rgba(96, 165, 250, 0.14)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.14)';
    for (let i = 0; i < n; i++) {
      const [x, y] = pt(i, R);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    // forma do jogador
    const rOf = (i) => Math.max(0.04, Math.min(1, vals[i] / max)) * R;
    poly(rOf);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, 'rgba(0, 245, 212, 0.12)');
    g.addColorStop(1, 'rgba(0, 245, 212, 0.42)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.shadowColor = 'rgba(0, 245, 212, 0.8)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < n; i++) {
      const [x, y] = pt(i, rOf(i));
      ctx.fillStyle = '#e6fffb';
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
    // rótulos
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const [x, y] = pt(i, R + 13);
      const ax = Math.abs(x - cx) < 4 ? 'center' : x < cx ? 'right' : 'left';
      ctx.textAlign = ax;
      const dy = Math.abs(x - cx) < 4 && y < cy ? -5 : 0;
      ctx.font = 'italic 900 10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(this.ATTR_RADAR[i].label, x, y + dy - 5);
      ctx.font = 'italic 900 12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#00f5d4';
      ctx.fillText(String(Math.round(vals[i])), x, y + dy + 7);
    }
  },

  // Vitrine: boneco grande com aura, rim light, chão iluminado e partículas subindo devagar.
  // Chamado a cada quadro pelo loop (renderLiveViewport) e ao renderizar a aba.
  drawAttrShowcase() {
    const cv = document.getElementById('stats-viewport-canvas');
    if (!cv || cv.offsetParent === null || !this.state) return;
    const W = Math.max(1, cv.clientWidth | 0);
    const H = Math.max(1, cv.clientHeight | 0);
    if (cv.width !== W || cv.height !== H) {
      cv.width = W;
      cv.height = H;
    }
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const aura = this._atrAura || '#00f5d4';
    const f = this.animFrame;
    const card = cv.parentElement;
    const bottomEl = card && card.querySelector('.atr-sc-bottom');
    const topEl = card && card.querySelector('.atr-sc-top');
    const bottomH = bottomEl ? bottomEl.offsetHeight : 150;
    const topBottom = topEl ? topEl.offsetTop + topEl.offsetHeight : 200;

    // O boneco fica entre o bloco do OVR (em cima) e a ficha (embaixo), sem cobrir os dois.
    // Escala em múltiplos de 2,5 (a pixel art é desenhada a 5px/unidade): pixels uniformes
    const feetY = H - bottomH + 46;
    const room = Math.min((feetY - topBottom + 22) / 30.4, W / 25);
    const s = room >= 15 ? 15 : room >= 10 ? 10 : room >= 7.5 ? 7.5 : Math.max(2.5, Math.floor(room / 2.5) * 2.5);
    const x0 = Math.round(W / 2 - 18 * s);
    const y0 = Math.round(feetY - 31.4 * s);
    const box = 36 * s;
    const hex = (a) => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
    const auraA = (a) => (/^#[0-9a-f]{6}$/i.test(aura) ? aura + hex(a) : `rgba(0,245,212,${a})`);

    // luz de cima (holofote) + brilho atrás do corpo, respirando bem devagar
    const breathe = 0.5 + 0.5 * Math.sin(f * 0.025);
    const beam = ctx.createLinearGradient(0, 0, 0, feetY);
    beam.addColorStop(0, auraA(0));
    beam.addColorStop(0.35, auraA(0.05));
    beam.addColorStop(1, auraA(0.16));
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 4 * s, 0);
    ctx.lineTo(W / 2 + 4 * s, 0);
    ctx.lineTo(W / 2 + 13 * s, feetY);
    ctx.lineTo(W / 2 - 13 * s, feetY);
    ctx.closePath();
    ctx.fill();

    const back = ctx.createRadialGradient(W / 2, y0 + 15 * s, 0, W / 2, y0 + 15 * s, 19 * s);
    back.addColorStop(0, auraA(0.3 + breathe * 0.06));
    back.addColorStop(0.55, auraA(0.1));
    back.addColorStop(1, auraA(0));
    ctx.fillStyle = back;
    ctx.fillRect(0, 0, W, H);

    // chão: disco iluminado + anéis
    ctx.save();
    ctx.translate(W / 2, feetY);
    ctx.scale(1, 0.24);
    const floor = ctx.createRadialGradient(0, 0, 0, 0, 0, 15 * s);
    floor.addColorStop(0, auraA(0.55));
    floor.addColorStop(0.5, auraA(0.18));
    floor.addColorStop(1, auraA(0));
    ctx.fillStyle = floor;
    ctx.beginPath();
    ctx.arc(0, 0, 15 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2 / 0.24 * 0.5;
    ctx.strokeStyle = auraA(0.7);
    ctx.beginPath();
    ctx.arc(0, 0, 10.5 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = auraA(0.25);
    ctx.beginPath();
    ctx.arc(0, 0, 14 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, 6.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // partículas subindo (movimento contínuo, sem piscar)
    for (let i = 0; i < 14; i++) {
      const span = feetY * 0.85;
      const t = ((f * (0.35 + (i % 4) * 0.08) + i * 47) % span) / span;
      const px = W / 2 + Math.sin(i * 2.3 + f * 0.01) * (6 + (i * 37) % 11) * s * 0.9;
      const py = feetY - t * span;
      const a = Math.sin(t * Math.PI) * 0.7;
      ctx.fillStyle = auraA(a);
      const sz = i % 3 === 0 ? 3 : 2;
      ctx.fillRect(Math.round(px), Math.round(py), sz, sz);
    }

    const pr = this.state.profile;
    const look = {
      skinColor: pr.skinColor,
      hairColor: pr.hairColor,
      hairSecondary: pr.hairSecondary,
      eyeColor: pr.eyeColor,
      eyeStyle: pr.eyeStyle,
      hairStyle: pr.hairStyle,
      jerseyPrimary: '#0f2942',
      jerseySecondary: '#1d4ed8',
      number: pr.number
    };
    const opts = { facing: 'front', frame: f, accessories: this.state.equippedAccessories, shirtNumber: pr.number };
    const PR = window.PixelRenderer;
    const rim = Math.max(2, Math.round(s * 0.7));
    ctx.save();
    ctx.translate(x0, y0);
    // brilho da aura em volta da silhueta
    ctx.save();
    ctx.shadowColor = aura;
    ctx.shadowBlur = Math.round(2.6 * s);
    ctx.globalAlpha = 0.85;
    PR.drawCharacterSprite(ctx, look, box, box, Object.assign({}, opts, { tint: aura }));
    ctx.restore();
    // rim light: aura do lado esquerdo, luz clara do lado direito
    ctx.translate(-rim, 0);
    PR.drawCharacterSprite(ctx, look, box, box, Object.assign({}, opts, { tint: aura }));
    ctx.translate(rim * 2, -Math.round(rim / 2));
    PR.drawCharacterSprite(ctx, look, box, box, Object.assign({}, opts, { tint: '#e8fffb' }));
    ctx.translate(-rim, Math.round(rim / 2));
    PR.drawCharacterSprite(ctx, look, box, box, opts);
    ctx.restore();
  },

  changeSpMultiplier(delta) {
    if (delta === 'MAX') {
      this.spMultiplier = Math.max(1, this.state.currencies.skillPoints);
    } else {
      this.spMultiplier = Math.max(1, this.spMultiplier + delta);
    }
    const el = document.getElementById('sp-mult-display');
    if (el) el.textContent = this.spMultiplier;
    this.renderStatsTab(); // atualiza a prévia do ganho nas barras
  },

  upgradeStat(statKey) {
    const sp = this.state.currencies.skillPoints;
    if (sp <= 0) {
      this.notify('Você não tem Pontos de Habilidade (SP)! Faça Treinos ou jogue Partidas para ganhar SP!', '#f59e0b');
      return;
    }
    const spend = Math.min(sp, this.spMultiplier);
    this.state.currencies.skillPoints -= spend;
    // Mais difícil de upar: cada 1 SP adiciona +1 no atributo escolhido!
    this.state.stats[statKey] += spend * 1;
    this.saveState();
    this.renderStatsTab();
  },

  resetSkillPoints() {
    if (this.state.currencies.egoCoins < 750) {
      this.notify('Precisa de 750 EgoCoins para redefinir seus SP!', '#ef4444');
      return;
    }
    this.state.currencies.egoCoins -= 750;
    let refunded = 0;
    Object.keys(this.state.stats).forEach((k) => {
      refunded += this.state.stats[k];
      this.state.stats[k] = 0;
    });
    this.state.currencies.skillPoints += refunded;
    this.saveState();
    this.renderStatsTab();
    this.notify(`Pontos de Habilidade redefinidos (+${refunded} SP devolvidos)!`, '#22c55e');
  },

  // ==========================================================================
  // ABA 3 & 4: ARMAS (WEAPONS) & FLUXO (FLOWS) - SISTEMA DE GIRO 7 RARIDADES
  // ==========================================================================
  renderWeaponsTab() {
    const lockBanner = document.getElementById('weapon-lock-status');
    const slot1Box = document.getElementById('weapon-slot-1-box');
    const slot2Box = document.getElementById('weapon-slot-2-box');
    const listBox = document.getElementById('weapons-catalog-grid');
    if (!slot1Box || !listBox) return;

    if (!this.state.blueLockEntered) {
      lockBanner.innerHTML = `
        <div class="alert-lock-box">
          <span>🔒 <strong>ROLETA BLOQUEADA:</strong> você descobre sua Arma quando entra no <strong>BLUE LOCK</strong>. Jogue o Prólogo na aba HISTÓRIA.</span>
        </div>`;
    } else if (!this.state.nelUnlocked) {
      lockBanner.innerHTML = `
        <div class="alert-info-box">
          <span>⚡ Você tem <strong>1 slot de Arma</strong>. O <strong>2º slot</strong> abre quando você vencer a Sub-20 e entrar na <strong>Liga Neo Egoísta</strong>.</span>
        </div>`;
    } else {
      lockBanner.innerHTML = `
        <div class="alert-wc-box">
          <span>👑 <strong>LIGA NEO EGOÍSTA:</strong> você usa <strong>2 Armas</strong> ao mesmo tempo (teclas 1-2-3 e 4-5-6).</span>
        </div>`;
    }

    const renderSlot = (wp, slotNum, locked) => {
      if (locked) {
        return `<div class="slot-card locked"><h4>SLOT DE ARMA ${slotNum}</h4><p>🔒 Bloqueado (Requer ${slotNum === 1 ? 'Entrada no Blue Lock' : 'Chegar na Liga NEL'})</p></div>`;
      }
      if (!wp) {
        return `<div class="slot-card empty"><h4>SLOT DE ARMA ${slotNum}</h4><p>Nenhuma Arma ainda. Gire a roleta — a arma que sair é a sua!</p></div>`;
      }
      const r = window.RARITY_TIERS[wp.rarity];
      const keyOffset = slotNum === 2 ? 3 : 0;
      return `
        <div class="slot-card" style="border-color:${r.color}; box-shadow: 0 0 18px ${r.glow}">
          <div class="slot-header">
            <span class="rarity-pill" style="background:${r.color}; color:#090d16">${r.name.toUpperCase()}</span>
            <span class="slot-title-tag">ARMA EQUIPADA (SLOT ${slotNum})</span>
          </div>
          <h3 style="color:${r.color}">${wp.name}</h3>
          <p class="slot-insp">Inspiração: <strong>${wp.inspiration}</strong> | +${r.ovrBonus} OVR</p>
          <p class="slot-desc">${wp.desc}</p>
          ${this.passiveHtml(wp)}
          <div class="skills-preview-row">
            ${wp.skills
              .map(
                (sk, i) => `
              <div class="skill-chip" style="border-left: 3px solid ${sk.color}">
                <div class="skill-chip-head">
                  <span class="key-pill">TECLA ${i + 1 + keyOffset}</span>
                  <strong>${sk.name}</strong>
                  <small>${sk.cd}s CD</small>
                </div>
                <div class="skill-chip-desc">${sk.desc}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    };

    slot1Box.innerHTML = renderSlot(this.state.equippedWeapon, 1, !this.state.blueLockEntered);
    slot2Box.innerHTML = renderSlot(this.state.equippedWeapon2, 2, !this.state.nelUnlocked);

    // Botões de giro: um por slot (o 2º só na NEL), normal e da sorte
    const spinBox = document.getElementById('weapon-spin-buttons');
    if (spinBox) spinBox.innerHTML = this.spinButtonsHtml('spinWeaponGacha', '🎲 GIRAR ARMA');

    // Catálogo só de consulta: não dá para escolher nem guardar armas, o que sair na roleta é seu
    listBox.innerHTML = this.renderRarityGroups(window.WEAPONS_DB, 'armas', (wp) => {
      const r = window.RARITY_TIERS[wp.rarity];
      const mine = this.state.equippedWeapon?.id === wp.id || this.state.equippedWeapon2?.id === wp.id;
      return `
        <div class="weapon-card ${mine ? 'owned' : ''}" style="border-color:${r.color}">
          <div class="weapon-card-top">
            <span class="rarity-pill" style="background:${r.color}; color:#090d16">${r.name}</span>
            <span class="ovr-bonus-tag">+${r.ovrBonus} OVR</span>
          </div>
          <h4>${wp.name}</h4>
          <div class="weapon-insp">${wp.inspiration}</div>
          <div class="weapon-skills-mini">
            ${wp.skills.map((s) => `<div><strong>[${s.key}] ${s.name}:</strong> ${s.desc}</div>`).join('')}
          </div>
          ${this.passiveHtml(wp)}
          ${mine ? '<div class="weapon-mine-tag">✓ SUA ARMA ATUAL</div>' : ''}
        </div>
      `;
    });
  },

  // Caixinha da passiva da arma (slot, catálogo e roleta)
  passiveHtml(wp) {
    const ps = window.getWeaponPassive(wp);
    if (!ps) return '';
    return `<div class="passive-chip"><span class="passive-tag">PASSIVA</span><strong>${ps.name}</strong><small>${window.describePassive(ps)}</small></div>`;
  },

  // Botões de giro de um slot: normal (giro/250 coins) e da sorte (🍀)
  spinButtonsHtml(fn, label) {
    const lucky = this.state.currencies.luckySpins || 0;
    const slots = this.state.nelUnlocked ? [1, 2] : [1];
    return slots
      .map((s) => {
        const tag = this.state.nelUnlocked ? ` • SLOT ${s}` : '';
        return `
          <button class="btn-spin-big" onclick="App.${fn}(${s})">${label}${tag}${s === 1 ? ' (1 GIRO OU 250 COINS)' : ''}</button>
          <button class="btn-spin-big btn-lucky${lucky ? '' : ' empty'}" onclick="App.${fn}(${s}, false, true)">🍀 GIRO DA SORTE${tag} (${lucky})</button>`;
      })
      .join('');
  },

  // Catálogo da roleta em ordem: da raridade mais alta (World Class) para a mais baixa,
  // cada uma com título, quantidade e chance; dentro dela, em ordem alfabética
  renderRarityGroups(items, noun, cardFn) {
    const tiers = Object.keys(window.RARITY_TIERS).reverse();
    return tiers
      .map((key) => {
        const r = window.RARITY_TIERS[key];
        const group = items.filter((it) => it.rarity === key).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        if (!group.length) return '';
        return `
          <div class="rarity-group">
            <div class="rarity-group-title" style="color:${r.color}; border-color:${r.color}">
              <span>${r.name.toUpperCase()}</span>
              <small>${group.length} ${noun} • ${r.chance}% de chance na roleta</small>
            </div>
            <div class="catalog-grid">${group.map(cardFn).join('')}</div>
          </div>`;
      })
      .join('');
  },

  unlockBlueLockNowForTest() {
    this.state.blueLockEntered = true;
    this.saveState();
    this.renderAll();
    this.notify('Entrada no Blue Lock ativada! Clique em "GIRAR ARMA" para descobrir sua primeira Arma!', '#00f5d4');
  },

  // ==========================================================================
  // ROLETA SEM VOLTA: o que sair substitui o que você tinha naquele slot.
  // Não existe inventário de armas/fluxos — se girar de novo, a atual vai embora.
  // ==========================================================================
  // lucky = Giro da Sorte (comprado na LOJA); sem nenhum, leva você até a loja
  canPaySpin(lucky = false) {
    if (lucky) {
      if ((this.state.currencies.luckySpins || 0) > 0) return true;
      this.notify('Você não tem Giros da Sorte! Compre na LOJA.', '#4ade80');
      this.switchTab('LOJA');
      return false;
    }
    if (this.state.currencies.spins <= 0 && this.state.currencies.egoCoins < 250) {
      this.notify('Sem Giros ou EgoCoins (250) suficientes! Jogue partidas ou treine para ganhar mais!', '#ef4444');
      return false;
    }
    return true;
  },

  paySpin(lucky = false) {
    if (lucky) this.state.currencies.luckySpins--;
    else if (this.state.currencies.spins > 0) this.state.currencies.spins--;
    else this.state.currencies.egoCoins -= 250;
  },

  // Aviso antes de trocar: a arma/fluxo atual é perdida para sempre
  confirmRespin(kind, slot, current, lucky = false) {
    const modal = document.getElementById('cinematic-modal');
    const content = document.getElementById('cinematic-modal-content');
    if (!modal || !content) return;
    const r = window.RARITY_TIERS[current.rarity];
    const isWeapon = kind === 'weapon';
    content.innerHTML = `
      <div class="cinematic-box respin-box" style="border-color:#ef4444; box-shadow: 0 0 30px rgba(239,68,68,0.45)">
        <div class="cinematic-badge" style="background:#ef4444; color:#fff">⚠️ SEM VOLTA</div>
        <h2>GIRAR DE NOVO?</h2>
        <p class="cinematic-desc">
          ${isWeapon ? 'Sua arma atual' : 'Seu fluxo atual'}
          <strong style="color:${r.color}">${current.name} (${r.name})</strong>
          vai embora <strong>para sempre</strong>. No Blue Lock não dá para guardar ${isWeapon ? 'armas' : 'fluxos'}:
          o que sair na roleta é o seu ${isWeapon ? 'jeito de jogar' : 'estado de fluxo'} daqui em diante.
        </p>
        <div class="dilemma-buttons">
          <button class="btn-dilemma pass-choice" onclick="App.closeCinematicModal()">MANTER ${isWeapon ? 'MINHA ARMA' : 'MEU FLUXO'}</button>
          <button class="btn-dilemma shoot-choice" onclick="App.${isWeapon ? 'spinWeaponGacha' : 'spinFlowGacha'}(${slot}, true, ${lucky})">${lucky ? '🍀' : '🎲'} GIRAR MESMO ASSIM</button>
        </div>
      </div>
    `;
    modal.classList.add('open');
  },

  spinWeaponGacha(slot = 1, confirmed = false, lucky = false) {
    if (!this.state.blueLockEntered) {
      this.notify('Jogue o Prólogo (Final do Ensino Médio) na aba HISTÓRIA para entrar no Blue Lock e girar sua Arma!', '#ef4444');
      return;
    }
    if (slot === 2 && !this.state.nelUnlocked) return;
    if (!this.canPaySpin(lucky)) return;
    const key = slot === 2 ? 'equippedWeapon2' : 'equippedWeapon';
    if (this.state[key] && !confirmed) {
      this.confirmRespin('weapon', slot, this.state[key], lucky);
      return;
    }
    this.paySpin(lucky);

    const rolledRarity = this.rollRarityTier(lucky);
    const pool = window.WEAPONS_DB.filter((w) => w.rarity === rolledRarity);
    const chosen = pool[Math.floor(Math.random() * pool.length)] || window.WEAPONS_DB[0];
    const lost = this.state[key];
    this.state[key] = chosen;
    this.countPull(chosen);
    this.unlockAchievement('ach_first_spin');
    this.saveState();
    // A tela de trás só é redesenhada quando a roleta para (antes dava pra ver o resultado
    // no painel atrás da roleta ainda girando): playSpinReelAnimation chama renderAll no fim

    const ps = window.getWeaponPassive(chosen);
    this.playSpinReelAnimation({
      header: `${lucky ? '🍀 GIRO DA SORTE • ' : ''}${slot === 2 ? 'NOVA ARMA • SLOT 2' : 'NOVA ARMA DESPERTADA'}`,
      pool: window.WEAPONS_DB,
      chosen,
      lucky,
      lostName: lost ? lost.name : null,
      detailHtml: chosen.skills
        .map((sk, i) => `<div class="reveal-skill" style="border-left-color:${sk.color}"><span>TECLA ${i + 1 + (slot === 2 ? 3 : 0)}</span><strong>${sk.name}</strong><small>${sk.desc}</small></div>`)
        .join('') + (ps ? `<div class="reveal-skill" style="border-left-color:#facc15"><span>PASSIVA</span><strong>${ps.name}</strong><small>${window.describePassive(ps)}</small></div>` : '')
    });
  },

  renderFlowsTab() {
    const slotBox = document.getElementById('flow-slots-container');
    const evoBox = document.getElementById('nel-evolutions-container');
    const listBox = document.getElementById('flows-catalog-grid');
    if (!slotBox || !listBox) return;

    const fl1 = this.state.equippedFlow;
    const fl2 = this.state.equippedFlow2;
    const r1 = fl1 ? window.RARITY_TIERS[fl1.rarity] : null;
    const r2 = fl2 ? window.RARITY_TIERS[fl2.rarity] : null;

    slotBox.innerHTML = `
      <div class="slot-card" style="border-color:${r1 ? r1.color : '#334155'}">
        <div class="slot-header">
          <span class="rarity-pill" style="background:${r1 ? r1.color : '#475569'}; color:#090d16">${r1 ? r1.name : 'VAZIO'}</span>
          <span class="slot-title-tag">FLUXO PRINCIPAL (TECLA G)</span>
        </div>
        <h3 style="color:${fl1 ? fl1.color : '#94a3b8'}">${fl1 ? fl1.name : this.state.blueLockEntered ? 'Nenhum Fluxo Equipado' : '🔒 Bloqueado no Prólogo'}</h3>
        <p>${fl1 ? `${fl1.desc}<br><strong style="color:${fl1.color}">${window.describeFlow(fl1)}</strong>` : 'Gire um Fluxo após entrar no Blue Lock!'}</p>
      </div>
      <div class="slot-card ${!this.state.nelUnlocked ? 'locked' : ''}" style="border-color:${r2 ? r2.color : '#334155'}">
        <div class="slot-header">
          <span class="rarity-pill" style="background:${r2 ? r2.color : '#475569'}; color:#090d16">${r2 ? r2.name : '2º SLOT NEL'}</span>
          <span class="slot-title-tag">2º FLUXO SINÉRGICO (LIGA NEL)</span>
        </div>
        <h3 style="color:${fl2 ? fl2.color : '#94a3b8'}">${!this.state.nelUnlocked ? '🔒 Desbloqueia na Liga Neo Egoísta (NEL)' : fl2 ? fl2.name : 'Gire a roleta do 2º slot'}</h3>
        <p>${fl2 ? fl2.desc : 'Ao chegar na NEL você combina um segundo Fluxo e desperta Metavision / Predator Eye!'}</p>
      </div>
      ${fl1 && fl2 && this.state.nelUnlocked
        ? (() => {
            const both = window.combineFlows([fl1, fl2]);
            return `<div class="flow-combo" style="--c1:${fl1.color}; --c2:${fl2.color}">🔥 <b>[G] DESPERTA OS DOIS JUNTOS:</b> ${window.describeFlow(both)} • ${both.duration}s</div>`;
          })()
        : ''}
    `;

    if (evoBox) {
      evoBox.innerHTML = window.NEL_EVOLUTIONS.map((ev) => {
        const active = this.state.selectedNelEvolution === ev.id;
        return `
          <div class="evo-card ${active ? 'active' : ''} ${!this.state.nelUnlocked ? 'locked' : ''}" style="border-color:${ev.color}" onclick="App.selectNelEvolution('${ev.id}')">
            <h4 style="color:${ev.color}">${ev.name}</h4>
            <p>${ev.desc}</p>
            <span class="evo-status">${active ? '✓ DESPERTADO' : this.state.nelUnlocked ? 'CLIQUE P/ DESPERTAR' : '🔒 REQUER LIGA NEL'}</span>
          </div>
        `;
      }).join('');
    }

    const spinBox = document.getElementById('flow-spin-buttons');
    if (spinBox) spinBox.innerHTML = this.spinButtonsHtml('spinFlowGacha', '🔥 GIRAR FLUXO');

    listBox.innerHTML = this.renderSecretFlows() + this.renderRarityGroups(window.FLOWS_DB.filter((f) => !f.secret), 'fluxos', (fl) => {
      const r = window.RARITY_TIERS[fl.rarity];
      const mine = this.state.equippedFlow?.id === fl.id || this.state.equippedFlow2?.id === fl.id;
      return `
        <div class="weapon-card ${mine ? 'owned' : ''}" style="border-color:${r.color}">
          <div class="weapon-card-top">
            <span class="rarity-pill" style="background:${r.color}; color:#090d16">${r.name}</span>
            <span class="ovr-bonus-tag">${fl.duration || 10}s</span>
          </div>
          <h4 style="color:${fl.color}">${fl.name}</h4>
          <p class="slot-desc">${fl.desc}</p>
          <div class="flow-effects" style="color:${fl.color}">${window.describeFlow(fl)}</div>
          ${mine ? '<div class="weapon-mine-tag">✓ SEU FLUXO ATUAL</div>' : ''}
        </div>
      `;
    });
  },

  // ==========================================================================
  // FLUXOS SECRETOS: fora da roleta; um segredo (js/easter_eggs.js) libera e eles ficam
  // aqui para equipar quando quiser (state.unlockedFlows guarda os ids)
  // ==========================================================================
  isSecretFlowUnlocked(id) {
    return (this.state.unlockedFlows || []).includes(id);
  },
  unlockSecretFlow(id) {
    const fl = window.FLOWS_DB.find((f) => f.id === id);
    if (!fl) return false;
    this.state.unlockedFlows = this.state.unlockedFlows || [];
    if (this.state.unlockedFlows.includes(id)) return false;
    this.state.unlockedFlows.push(id);
    this.saveState();
    return true;
  },
  renderSecretFlows() {
    const list = window.FLOWS_DB.filter((f) => f.secret);
    if (!list.length) return '';
    const cards = list
      .map((fl) => {
        const r = window.RARITY_TIERS[fl.rarity];
        if (!this.isSecretFlowUnlocked(fl.id)) {
          return `
        <div class="weapon-card secret-flow locked">
          <div class="weapon-card-top"><span class="rarity-pill" style="background:#475569; color:#090d16">???</span></div>
          <h4>🔒 Fluxo secreto</h4>
          <p class="slot-desc">Escondido em algum lugar do jogo. Dica: tem alguém sempre observando você... de olho até no canto da tela.</p>
        </div>`;
        }
        const on1 = this.state.equippedFlow?.id === fl.id;
        const on2 = this.state.equippedFlow2?.id === fl.id;
        const btn = (slot, on, label) =>
          on ? `<span class="weapon-mine-tag">✓ ${label}</span>` : `<button class="secret-flow-btn" style="--c:${fl.color}" onclick="App.equipSecretFlow('${fl.id}', ${slot})">EQUIPAR${slot === 2 ? ' NO 2º SLOT' : ''}</button>`;
        return `
        <div class="weapon-card secret-flow owned" style="border-color:${fl.color}">
          <div class="weapon-card-top">
            <span class="rarity-pill" style="background:${r.color}; color:#090d16">${r.name} • SEGREDO</span>
            <span class="ovr-bonus-tag">${fl.duration || 10}s</span>
          </div>
          <h4 style="color:${fl.color}">${fl.name}</h4>
          <p class="slot-desc">${fl.desc}</p>
          <div class="flow-effects" style="color:${fl.color}">${window.describeFlow(fl)}</div>
          <div class="secret-flow-actions">${btn(1, on1, 'NO FLUXO PRINCIPAL')}${this.state.nelUnlocked ? btn(2, on2, 'NO 2º SLOT') : ''}</div>
        </div>`;
      })
      .join('');
    return `<div class="rarity-group secret-flows"><div class="rarity-group-title" style="color:#eab308; border-color:#eab308"><span>🥚 FLUXOS SECRETOS</span><small>fora da roleta • liberados por segredos escondidos no jogo</small></div><div class="catalog-grid">${cards}</div></div>`;
  },
  equipSecretFlow(id, slot = 1) {
    const fl = window.FLOWS_DB.find((f) => f.id === id);
    if (!fl || !this.isSecretFlowUnlocked(id)) return;
    if (!this.state.blueLockEntered) {
      this.notify('Entre para o Blue Lock para usar um Fluxo!', '#ef4444');
      return;
    }
    if (slot === 2 && !this.state.nelUnlocked) return;
    const key = slot === 2 ? 'equippedFlow2' : 'equippedFlow';
    const cur = this.state[key];
    // o Fluxo da roleta não fica guardado: trocar por ele perde o atual (o secreto não)
    if (cur && !cur.secret && cur.id !== id && !window.confirm(`Equipar ${fl.name} no lugar de ${cur.name}?\n\nO Fluxo atual (da roleta) será perdido. O secreto continua liberado para sempre.`)) return;
    this.state[key] = Object.assign({}, fl);
    this.saveState();
    this.renderAll?.();
    this.notify(`🥚 FLUXO SECRETO EQUIPADO: ${fl.name}`, fl.color);
  },

  spinFlowGacha(slot = 1, confirmed = false, lucky = false) {
    if (!this.state.blueLockEntered) {
      this.notify('Entre para o Blue Lock após a Final do Ensino Médio para girar seu Fluxo!', '#ef4444');
      return;
    }
    if (slot === 2 && !this.state.nelUnlocked) return;
    if (!this.canPaySpin(lucky)) return;
    const key = slot === 2 ? 'equippedFlow2' : 'equippedFlow';
    if (this.state[key] && !confirmed) {
      this.confirmRespin('flow', slot, this.state[key], lucky);
      return;
    }
    this.paySpin(lucky);

    const rolledRarity = this.rollRarityTier(lucky);
    const pool = window.FLOWS_DB.filter((f) => f.rarity === rolledRarity && !f.secret);
    const chosen = pool[Math.floor(Math.random() * pool.length)] || window.FLOWS_DB[0];
    const lost = this.state[key];
    this.state[key] = chosen;
    this.countPull(chosen);
    this.saveState();
    // A tela de trás só é redesenhada quando a roleta para (antes dava pra ver o resultado
    // no painel atrás da roleta ainda girando): playSpinReelAnimation chama renderAll no fim

    this.playSpinReelAnimation({
      header: `${lucky ? '🍀 GIRO DA SORTE • ' : ''}${slot === 2 ? 'NOVO FLUXO • SLOT 2' : 'FLUXO DESPERTADO'}`,
      pool: window.FLOWS_DB.filter((f) => !f.secret),
      chosen,
      lucky,
      lostName: lost ? lost.name : null,
      detailHtml: `<div class="reveal-skill" style="border-left-color:${chosen.color}"><span>TECLA G</span><strong>${window.describeFlow(chosen)}</strong><small>Dura ${chosen.duration || 10}s em campo</small></div>`
    });
  },

  // ==========================================================================
  // LABORATÓRIO DE FLUXOS: testa qualquer Fluxo (mesmo sem ter girado) num treino
  // contra um time de teste. A barra recarrega sozinha em ~3 s; nada conta para a
  // história, prêmios ou conquistas, e o seu Fluxo equipado não muda.
  // ==========================================================================
  // Escolha do laboratório: Fluxo 1 e (opcional) Fluxo 2 — os dois juntos no [G], como
  // os 2 slots da NEL em diante (dá para testar a combinação mesmo antes da NEL)
  openFlowLabPicker() {
    const modal = document.getElementById('cinematic-modal');
    const content = document.getElementById('cinematic-modal-content');
    if (!modal || !content) return;
    const tiers = Object.keys(window.RARITY_TIERS).reverse();
    const opts = (sel, none) =>
      (none ? `<option value="">— nenhum (só o Fluxo 1) —</option>` : '') +
      tiers
        .map((r) => {
          const list = window.FLOWS_DB.filter((f) => f.rarity === r && (!f.secret || this.isSecretFlowUnlocked(f.id)));
          if (!list.length) return '';
          return `<optgroup label="${window.RARITY_TIERS[r].name}">${list.map((f) => `<option value="${f.id}"${f.id === sel ? ' selected' : ''}>${f.name} — ${f.effect}</option>`).join('')}</optgroup>`;
        })
        .join('');
    const s1 = this.state.equippedFlow?.id || window.FLOWS_DB[0].id;
    const s2 = this.state.equippedFlow2?.id || '';
    content.innerHTML = `
      <div class="cinematic-box flow-lab-box" style="max-width:720px; border-top-color:#a855f7">
        <div class="cinematic-badge" style="background:#a855f7; color:#090d16">🧪 LABORATÓRIO DE FLUXOS</div>
        <h2>ESCOLHA O QUE TESTAR</h2>
        <p class="cinematic-desc">Um treino contra um time de teste. A barra do Fluxo recarrega sozinha e nada conta (sem prêmio, sem história, seu Fluxo equipado não muda).<br>Com o <b>Fluxo 2</b>, o [G] desperta os dois juntos e as duas passivas valem ao mesmo tempo, como na NEL.</p>
        <label class="flow-lab-row"><span>FLUXO 1</span><select id="flow-lab-1" onchange="App.updateFlowLabPreview()">${opts(s1, false)}</select></label>
        <label class="flow-lab-row"><span>FLUXO 2</span><select id="flow-lab-2" onchange="App.updateFlowLabPreview()">${opts(s2, true)}</select></label>
        <div id="flow-lab-preview" class="flow-lab-preview"></div>
        <div class="dilemma-buttons">
          <button class="btn-dilemma shoot-choice" onclick="App.confirmFlowLab()">🧪 TESTAR</button>
          <button class="btn-dilemma" onclick="document.getElementById('cinematic-modal').classList.remove('open')">CANCELAR</button>
        </div>
      </div>`;
    modal.classList.add('open');
    this.updateFlowLabPreview();
  },

  updateFlowLabPreview() {
    const get = (id) => window.FLOWS_DB.find((f) => f.id === document.getElementById(id)?.value);
    const box = document.getElementById('flow-lab-preview');
    const both = window.combineFlows([get('flow-lab-1'), get('flow-lab-2')]);
    if (box && both) box.innerHTML = `<b style="color:${both.color}">[G] ${both.duration}s</b> • ${window.describeFlow(both)}`;
  },

  confirmFlowLab() {
    const v1 = document.getElementById('flow-lab-1')?.value;
    const v2 = document.getElementById('flow-lab-2')?.value;
    document.getElementById('cinematic-modal')?.classList.remove('open');
    this.startFlowLab(v1, v2 && v2 !== v1 ? v2 : null);
  },

  startFlowLab(id, id2 = null) {
    if (window.MatchEngine?.active) return;
    const fl = window.FLOWS_DB.find((f) => f.id === id) || window.resolveFlow(this.state.equippedFlow) || window.FLOWS_DB[0];
    const fl2 = id2 ? window.FLOWS_DB.find((f) => f.id === id2) || null : null;
    const ch = {
      id: 'flow_lab',
      flowLab: true,
      chapterNumber: 0,
      mapTheme: 'bluelock_holo',
      era: '🧪 LABORATÓRIO DE FLUXOS',
      title: fl2 ? `${fl.effect} + ${fl2.effect}` : `${fl.name} • ${fl.effect}`,
      teamName: 'Laboratório',
      opponentName: 'Time de Teste',
      targetGoals: 99,
      matchDuration: 200,
      difficulty: 4,
      teammateIds: ['bachira', 'nagi', 'chigiri', 'gagamaru'],
      opponentIds: ['karasu', 'otoya', 'yukimiya', 'raichi', 'fukaku'],
      homeColor: '#0f2942',
      homeSecondary: '#38bdf8',
      opponentColor: '#f8fafc',
      opponentSecondary: '#7e22ce',
      leagueLabel: `🧪 LAB • [G] ${String(fl.effect || 'FLUXO').toUpperCase()}${fl2 ? ` + ${String(fl2.effect).toUpperCase()}` : ''}`,
      scoreLabels: { home: 'VOCÊ', away: 'TESTE' }
    };
    // Cópia rasa do estado: o Fluxo do teste não substitui o seu. Com o Fluxo 2 o slot da
    // NEL vale só aqui dentro (nelUnlocked na cópia; sem 2ª arma se você não tem uma)
    const ps = Object.assign({}, this.state, { equippedFlow: fl, equippedFlow2: fl2 });
    if (fl2) Object.assign(ps, { nelUnlocked: true, equippedWeapon2: this.state.nelUnlocked ? this.state.equippedWeapon2 : null });
    this.flowLabActive = true;
    window.MatchEngine.startMatch(ch, ps);
    window.MatchEngine.flowState.charge = 100;
    window.MatchEngine.flowState.readyShown = true;
    const both = window.combineFlows([fl, fl2]);
    window.MatchEngine.showBanner(`🧪 TESTANDO: ${(fl2 ? `${fl.effect} + ${fl2.effect}` : fl.name).toUpperCase()}`, `[G] ${window.describeFlow(both)}. A barra recarrega sozinha. ESC para sair.`, fl.color, 220);
  },

  onFlowLabFinished(gf, ga) {
    this.flowLabActive = false;
    this.switchTab('FLUXO');
    this.renderAll();
    this.notify(`🧪 Laboratório encerrado (${gf} x ${ga}). Escolha outro Fluxo para testar!`, '#a855f7');
  },

  // ==========================================================================
  // ROLETA ANIMADA: uma fita de cartas passa por baixo do ponteiro, desacelera
  // e para no resultado; depois a carta vencedora "explode" na cor da raridade
  // (World Class com flash na tela inteira).
  // ==========================================================================
  playSpinReelAnimation({ header, pool, chosen, lostName, detailHtml, lucky = false }) {
    const modal = document.getElementById('cinematic-modal');
    const content = document.getElementById('cinematic-modal-content');
    if (!modal || !content) return;
    const CARD = 150;
    const WIN = 38; // posição da carta vencedora na fita
    const strip = [];
    for (let i = 0; i < WIN + 5; i++) {
      const item = i === WIN ? chosen : pool[Math.floor(Math.random() * pool.length)];
      strip.push(item);
    }
    const r = window.RARITY_TIERS[chosen.rarity];
    const cardHtml = (it, i) => {
      const tr = window.RARITY_TIERS[it.rarity];
      return `<div class="reel-card${i === WIN ? ' reel-win' : ''}" style="--rc:${tr.color}">
        <span class="reel-rarity">${tr.name.split(' ')[0]}</span>
        <strong>${it.name}</strong>
        <small>${it.inspiration || ''}</small>
      </div>`;
    };
    content.innerHTML = `
      <div class="reel-box">
        <div class="reel-title">🎰 ${header}</div>
        <div class="reel-window">
          <div class="reel-pointer"></div>
          <div class="reel-strip" id="reel-strip">${strip.map(cardHtml).join('')}</div>
        </div>
        <div class="reel-odds">${Object.values(window.RARITY_TIERS).map((t) => `<span style="color:${t.color}">${t.name.split(' ')[0]} ${lucky ? window.LUCKY_CHANCES[t.id] : t.chance}%</span>`).join('')}</div>
        <div id="reel-reveal"></div>
      </div>
    `;
    modal.classList.add('open');

    const stripEl = document.getElementById('reel-strip');
    const windowW = stripEl.parentElement.clientWidth || 900;
    // Para com a carta vencedora sob o ponteiro (com um pequeno desvio aleatório dentro da carta)
    const jitter = (Math.random() - 0.5) * CARD * 0.5;
    const targetX = -(WIN * CARD + CARD / 2 - windowW / 2 + jitter);
    stripEl.style.transform = 'translateX(0px)';
    void stripEl.offsetWidth;
    stripEl.style.transition = 'transform 4.6s cubic-bezier(0.08, 0.72, 0.12, 1)';
    stripEl.style.transform = `translateX(${targetX}px)`;

    const showReveal = () => {
      // Só agora a tela de trás mostra a arma/fluxo novo
      this.renderAll();
      const win = stripEl.children[WIN];
      if (win) win.classList.add('won');
      const wc = chosen.rarity === 'WORLD_CLASS' || chosen.rarity === 'MITICO';
      const reveal = document.getElementById('reel-reveal');
      if (!reveal) return;
      reveal.innerHTML = `
        ${wc ? `<div class="reel-flash" style="background:${r.color}"></div>` : ''}
        <div class="reel-result" style="--rc:${r.color}">
          <div class="cinematic-badge" style="background:${r.color}; color:#090d16">${r.name.toUpperCase()}</div>
          <h1>${chosen.name}</h1>
          ${chosen.inspiration ? `<div class="reel-insp">Inspiração: ${chosen.inspiration}</div>` : ''}
          <p>${chosen.desc}</p>
          <div class="reveal-skills">${detailHtml}</div>
          ${lostName ? `<div class="reel-lost">✖ ${lostName} se foi para sempre.</div>` : ''}
          <button class="btn-dilemma shoot-choice" onclick="App.closeCinematicModal()">ESSE É O MEU EGO ▶</button>
        </div>
      `;
    };
    // Lendário, Mítico e World Class: a fita para e explode na animação de raridade antes da carta
    setTimeout(() => {
      if (this.RARITY_BURST_LEVEL[chosen.rarity]) {
        stripEl.children[WIN]?.classList.add('won');
        setTimeout(() => this.playRarityBurst(chosen, showReveal), 350);
      } else {
        showReveal();
      }
    }, 4800);
  },

  // ==========================================================================
  // ANIMAÇÃO DE RARIDADE ALTA (Lendário / Mítico / World Class): a luz é sugada
  // para o centro, explode (flash, anéis, raios girando), o personagem da arma
  // aparece com aura e o nome da raridade entra gigante. Clique pula.
  // ==========================================================================
  RARITY_BURST_LEVEL: { LENDARIO: 1, MITICO: 2, WORLD_CLASS: 3 },
  RARITY_BURST_LABEL: { LENDARIO: 'LENDÁRIO!', MITICO: 'MÍTICO!!', WORLD_CLASS: 'WORLD CLASS!!!' },

  makeRarityBurst(chosen) {
    const r = window.RARITY_TIERS[chosen.rarity];
    const isWeapon = !!chosen.skills;
    // Arma: o personagem que inspirou; Fluxo (ou arma sem personagem): você
    let hero = null;
    if (isWeapon) {
      hero = (chosen.id.startsWith('wp_char_') && window.findCharacter(chosen.id.slice(8))) ||
        window.BLUE_LOCK_CHARACTERS.find((c) => window.weaponInspiredBy(chosen, c.name)) || null;
    }
    if (!hero) {
      const p = this.state.profile;
      hero = { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
    }
    return {
      chosen,
      color: r.color,
      level: this.RARITY_BURST_LEVEL[chosen.rarity],
      label: this.RARITY_BURST_LABEL[chosen.rarity],
      hero: Object.assign({}, hero, { auraColor: isWeapon ? r.color : chosen.color || r.color }),
      parts: [],
      burst: false
    };
  },

  playRarityBurst(chosen, done) {
    const st = this.makeRarityBurst(chosen);
    const dur = 2.4 + st.level * 0.45;
    const wrap = document.createElement('div');
    wrap.className = 'rarity-burst';
    const cv = document.createElement('canvas');
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    wrap.appendChild(cv);
    document.body.appendChild(wrap);
    const ctx = cv.getContext('2d');
    window.SFX?.jingle(st.level === 3 ? [523, 659, 784, 1047, 1319, 1568] : st.level === 2 ? [440, 554, 659, 880, 1109] : [392, 494, 587, 784]);
    const t0 = performance.now();
    let finished = false;
    const end = () => {
      if (finished) return;
      finished = true;
      wrap.remove();
      done();
    };
    wrap.onclick = end;
    const frame = (now) => {
      if (finished) return;
      const t = (now - t0) / 1000;
      if (t > dur) {
        end();
        return;
      }
      this.drawRarityBurst(ctx, cv.width, cv.height, t, st);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },

  drawRarityBurst(ctx, W, H, t, st) {
    const CHARGE = 0.75; // segundos até a explosão
    const cx = W / 2;
    const cy = H * 0.44;
    const lv = st.level;
    const col = st.color;
    const easeOutBack = (x) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);
    const k = t - CHARGE;
    const shake = t < CHARGE ? (t / CHARGE) * 5 * lv : Math.max(0, 16 * lv * (1 - k / 0.6));
    ctx.setTransform(1, 0, 0, 1, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    ctx.fillStyle = '#03060d';
    ctx.fillRect(-30, -30, W + 60, H + 60);

    if (t < CHARGE) {
      // Carga: faíscas sendo sugadas para o centro e um brilho crescendo
      for (let i = 0; i < 3 * lv; i++) {
        const a = Math.random() * Math.PI * 2;
        const R = Math.max(W, H) * (0.45 + Math.random() * 0.2);
        st.parts.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, vx: -Math.cos(a) * R / 30, vy: -Math.sin(a) * R / 30, life: 30, max: 30, size: 2 + Math.random() * 2 });
      }
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 + (t / CHARGE) * 160);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.3, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else {
      if (!st.burst) {
        st.burst = true;
        for (let i = 0; i < 90 * lv; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 6 + Math.random() * 16;
          st.parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 70, max: 70, size: 2 + Math.random() * 4, grav: 0.12 });
        }
        window.SFX?.kick(1);
        if (lv >= 2) window.SFX?.goal(true);
      }
      // Raios girando
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(k * (0.4 + lv * 0.15));
      const rays = 10 + lv * 4;
      ctx.globalAlpha = 0.16 + lv * 0.04;
      ctx.fillStyle = col;
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, Math.max(W, H), a, a + Math.PI / rays * 0.7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // Anéis de choque
      for (let i = 0; i <= lv; i++) {
        const rr = k * 1100 - i * 170;
        if (rr <= 0) continue;
        ctx.globalAlpha = Math.max(0, 1 - rr / (Math.max(W, H) * 0.8));
        ctx.strokeStyle = i % 2 ? '#ffffff' : col;
        ctx.lineWidth = 10 - i * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // O personagem aparecendo com aura
      const size = Math.min(W, H) * 0.42;
      const pop = Math.min(1, k / 0.35);
      const s = size * (0.55 + 0.45 * easeOutBack(pop));
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.8);
      glow.addColorStop(0, col);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(cx - s / 2, cy - s * 0.6);
      window.PixelRenderer.drawCharacterSprite(ctx, st.hero, s, s * 1.1, { facing: 'front', frame: 4, showAura: true, animState: 'idle' });
      ctx.restore();
      // Nome da raridade entrando gigante
      const tp = Math.min(1, Math.max(0, (k - 0.12) / 0.3));
      const scale = 2.4 - 1.4 * (1 - Math.pow(1 - tp, 3));
      ctx.save();
      ctx.translate(cx, H * 0.83);
      ctx.scale(scale, scale);
      ctx.globalAlpha = tp;
      ctx.textAlign = 'center';
      ctx.font = `italic 900 ${Math.round(H * 0.11)}px "Segoe UI", sans-serif`;
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#03060d';
      ctx.strokeText(st.label, 0, 0);
      ctx.shadowColor = col;
      ctx.shadowBlur = 30;
      ctx.fillStyle = col;
      ctx.fillText(st.label, 0, 0);
      ctx.restore();
      if (k > 0.45) {
        ctx.globalAlpha = Math.min(1, (k - 0.45) / 0.3);
        ctx.textAlign = 'center';
        ctx.font = `800 ${Math.round(H * 0.032)}px "Segoe UI", sans-serif`;
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(st.chosen.name, cx, H * 0.91);
        ctx.globalAlpha = 1;
      }
      // Flash branco da explosão
      if (k < 0.3) {
        ctx.fillStyle = `rgba(255,255,255,${1 - k / 0.3})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    // Faíscas
    st.parts = st.parts.filter((p) => --p.life > 0);
    st.parts.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.grav) p.vy += p.grav;
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = Math.random() < 0.3 ? '#ffffff' : col;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  },

  selectNelEvolution(evoId) {
    if (!this.state.nelUnlocked) {
      const nelNum = window.CAREER_CHAPTERS.find((c) => c.id === 'ch6_nel_barcha_manshine')?.chapterNumber;
      this.notify(`Chegue na Liga Neo Egoísta (Cap. ${nelNum}) para despertar o Metavision / Predator Eye!`, '#f59e0b');
      return;
    }
    const evo = window.NEL_EVOLUTIONS.find((e) => e.id === evoId);
    if (!evo) return;
    this.state.selectedNelEvolution = evoId;
    this.saveState();
    this.renderAll();
    this.notify(`EVOLUÇÃO NEL DESPERTADA: ${evo.name}!`, evo.color);
  },

  // Conta os giros bons para as conquistas (Lendário ou melhor / World Class)
  countPull(chosen) {
    if (['LENDARIO', 'MITICO', 'WORLD_CLASS'].includes(chosen.rarity)) this.state.career.legendaryPulls++;
    if (chosen.rarity === 'WORLD_CLASS') this.state.career.worldClassPulls++;
  },

  // lucky = chances do Giro da Sorte (LUCKY_CHANCES): sem Comum/Incomum
  rollRarityTier(lucky = false) {
    const chance = (key) => (lucky ? window.LUCKY_CHANCES[key] : window.RARITY_TIERS[key].chance);
    const roll = Math.random() * 100;
    let acc = 0;
    const order = ['WORLD_CLASS', 'MITICO', 'LENDARIO', 'EPICO', 'RARO', 'INCOMUM', 'COMUM'];
    for (const key of order) {
      acc += chance(key);
      if (roll <= acc) return key;
    }
    return lucky ? 'RARO' : 'COMUM';
  },

  // ==========================================================================
  // LOJA: compra giros normais e Giros da Sorte com EgoCoins
  // ==========================================================================
  renderShopTab() {
    const box = document.getElementById('shop-box');
    if (!box) return;
    const coins = this.state.currencies.egoCoins;
    const tiers = Object.values(window.RARITY_TIERS).slice().reverse();
    const oddsRow = (lucky) => tiers
      .map((t) => {
        const pct = lucky ? window.LUCKY_CHANCES[t.id] : t.chance;
        return `<div class="odds-cell${pct ? '' : ' off'}" style="--rc:${t.color}"><span>${t.name.split(' ')[0]}</span><strong>${pct}%</strong><i style="width:${Math.min(100, pct * 2.5)}%"></i></div>`;
      })
      .join('');
    const cards = window.SHOP_ITEMS.map((it) => {
      const afford = coins >= it.price;
      return `
        <div class="shop-card${it.lucky ? ' lucky' : ''}">
          <div class="shop-icon">${it.icon}${(it.spins || it.lucky) > 1 ? `<small>x${it.spins || it.lucky}</small>` : ''}</div>
          <h3>${it.name}</h3>
          <p>${it.desc}</p>
          <button class="shop-buy${afford ? '' : ' disabled'}" onclick="App.buyShopItem('${it.id}')">💠 ${it.price} EGOCOINS</button>
        </div>`;
    }).join('');
    box.innerHTML = `
      <div class="gacha-action-bar shop-head">
        <div>
          <h2>🛒 LOJA DO BLUE LOCK</h2>
          <p style="font-size:12px; color:#cbd5e1">Troque suas EgoCoins por giros. O <strong style="color:#4ade80">Giro da Sorte</strong> serve para Armas e Fluxos e aumenta muito a chance de pegar algo bom.</p>
        </div>
        <div class="shop-wallet">
          <span>💠 <b>${coins}</b> EgoCoins</span>
          <span>🎰 <b>${this.state.currencies.spins}</b> Giros</span>
          <span>🍀 <b>${this.state.currencies.luckySpins || 0}</b> Giros da Sorte</span>
        </div>
      </div>
      <div class="shop-grid">${cards}</div>
      <div class="odds-compare">
        <h3>CHANCES DE CADA GIRO</h3>
        <div class="odds-line"><div class="odds-label">🎰 Giro normal</div><div class="odds-cells">${oddsRow(false)}</div></div>
        <div class="odds-line lucky"><div class="odds-label">🍀 Giro da Sorte</div><div class="odds-cells">${oddsRow(true)}</div></div>
      </div>
      <p class="shop-hint">Para usar: abra a aba <b>ARMAS</b> ou <b>FLUXO</b> e aperte <b style="color:#4ade80">🍀 GIRO DA SORTE</b>.</p>`;
  },

  buyShopItem(id) {
    const it = window.SHOP_ITEMS.find((x) => x.id === id);
    if (!it) return;
    const cur = this.state.currencies;
    if (cur.egoCoins < it.price) {
      this.notify(`Faltam ${it.price - cur.egoCoins} EgoCoins para comprar ${it.name}. Jogue partidas e treine!`, '#ef4444');
      return;
    }
    cur.egoCoins -= it.price;
    if (it.spins) cur.spins += it.spins;
    if (it.lucky) {
      cur.luckySpins = (cur.luckySpins || 0) + it.lucky;
      this.state.career.luckyBought += it.lucky;
    }
    this.saveState();
    this.renderAll();
    window.SFX?.jingle?.([660, 880, 1320]);
    this.notify(`${it.icon} Você comprou: ${it.name}!`, it.lucky ? '#4ade80' : '#00f5d4');
  },

  // ==========================================================================
  // PROGRESSÃO DE HISTÓRIA DIRETO PELO BOTÃO "CONTINUAR >>" (SEM ABA FASE / CARREIRA!)
  // ==========================================================================
  renderCareerAndFaseTabs() {
    const ch = window.CAREER_CHAPTERS[this.state.currentChapterIndex];
    const trio = ch && this.getActiveTrio(ch);
    const roundLabel = trio ? ` • ${ch.trioRounds[trio.round]?.name || ''}` : '';
    document.querySelectorAll('.js-current-chapter-btn-label').forEach((el) => {
      el.textContent = ch ? `CONTINUAR HISTÓRIA ▶ Cap. ${ch.chapterNumber}${roundLabel}` : 'CARREIRA CONCLUÍDA ✔ CAMPEÃO DO MUNDO';
    });
  },

  // ==========================================================================
  // ABA HISTÓRIA: o capítulo atual em destaque (cenário, seu time x rival,
  // meta) e a linha do tempo da campanha inteira (feito / atual / bloqueado).
  // ==========================================================================
  renderStoryHub() {
    const box = document.getElementById('story-hub');
    if (!box) return;
    const chapters = window.CAREER_CHAPTERS;
    const idx = this.state.currentChapterIndex;
    const ch = this.getChapter(idx);
    const timeline = chapters
      .map((c, i) => {
        const cls = i < idx ? 'done' : i === idx ? 'current' : 'locked';
        const icon = i < idx ? '✔' : i === idx ? '▶' : '🔒';
        return `<div class="tl-node ${cls}"><div class="tl-dot">${icon}</div><div class="tl-num">CAP. ${c.chapterNumber}</div><div class="tl-era">${c.era.split('—')[0].trim()}</div></div>`;
      })
      .join('<div class="tl-line"></div>');

    if (!ch) {
      box.innerHTML = `
        <div class="story-card story-done">
          <div class="story-card-body">
            <div class="story-era">FIM DA CARREIRA • LENDA DO FUTEBOL</div>
            <h1>CAMPEÃO DO MUNDO</h1>
            <p>Da final perdida no colégio até a taça da Copa do Mundo. O Blue Lock gerou o atacante mais egoísta do planeta: você.<br><br>🦊 O monstro ainda está com fome. Você pode rever as cenas da história nos botões acima e continuar treinando, girando armas e caçando conquistas.</p>
          </div>
        </div>
        <div class="story-timeline">${timeline}</div>`;
      return;
    }

    const trio = this.getActiveTrio(ch);
    const mates = trio ? trio.mates : ch.teammateIds || [];
    const rivals = (ch.format === 'trio' ? ch.opponentIds?.slice(0, 3) : ch.opponentIds) || [];
    const metaLine = ch.format === 'trio'
      ? `Torneio de Trios • ${ch.trioRounds.length} mata-matas${trio ? ` • próxima: ${ch.trioRounds[trio.round]?.name}` : ''}`
      : ch.leagueMatch
      ? `${this.lg().name} • Jogo ${this.lgState().games + 1} de 8 • 7 contra 7 • ${ch.goalLimit ? `quem fizer ${ch.goalLimit} gols primeiro vence • ` : ''}vale a tabela`
      : ch.format === 'cup'
      ? `${ch.friendly ? 'Amistoso' : 'Copa do Mundo'} • ${ch.cupRounds[ch.cupIdx].name} (${ch.cupIdx + 1} de ${ch.cupRounds.length}) • ${ch.friendly ? 'perdeu, joga de novo' : ch.cupRounds[ch.cupIdx].group ? 'fase de grupos: os 2 primeiros passam' : 'mata-mata: precisa vencer'}`
      : (() => {
          const secs = window.MatchEngine.matchTime(ch.matchDuration);
          return `Meta: ${ch.targetGoals} gol${ch.targetGoals > 1 ? 's' : ''} • ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} de partida`;
        })();
    box.innerHTML = `
      <div class="story-card" style="--story-accent:${ch.opponentSecondary || '#2563eb'}">
        <canvas id="story-art" class="story-art" width="1200" height="420"></canvas>
        <div class="story-card-body">
          <div class="story-era">CAPÍTULO ${ch.chapterNumber} • ${ch.era}</div>
          <h1>${ch.title}</h1>
          <p>${ch.loreSummary}</p>
          <div class="story-meta">
            <span><b>SEU TIME</b> ${ch.teamName || 'Blue Lock'}</span>
            <span><b>ADVERSÁRIO</b> ${ch.opponentName}</span>
            <span><b>OBJETIVO</b> ${metaLine}</span>
            <span><b>SEU RANKING</b> ${this.getBlueLockRank() ? `#${this.getBlueLockRank()} de 300` : 'Fora do Blue Lock'}</span>
          </div>
          <button class="story-play-btn" onclick="App.launchChapterMatch()">${trio ? 'CONTINUAR TORNEIO' : ch.nelPhase !== undefined && !ch.nelClub ? 'ESCOLHER CLUBE E JOGAR' : ch.league === 'pro' && !ch.proClub ? 'VER AS PROPOSTAS' : ch.leagueMatch ? `JOGAR JOGO ${this.lgState().games + 1} DA LIGA` : ch.format === 'cup' ? `JOGAR: ${ch.cupRounds[ch.cupIdx].name}` : 'JOGAR CAPÍTULO'} ▶</button>
        </div>
      </div>
      ${ch.format === 'league' && this.lgState() ? this.leagueTablesHtml(true) : ''}
      ${ch.format === 'cup' ? `<div class="cup-bracket">${ch.cupRounds.map((cr, k) => `<span class="${k < ch.cupIdx ? 'done' : k === ch.cupIdx ? 'now' : ''}">${cr.name}<b>${cr.label}</b></span>`).join('')}</div>` : ''}
      ${ch.format === 'cup' && ch.groupTeams && ch.cupRounds[ch.cupIdx].group ? this.groupTableHtml(ch, this.state.cup?.group) : ''}
      ${this.interludeButtonsHtml()}
      <div class="story-timeline">${timeline}</div>`;

    // Arte do capítulo: o cenário da fase, seu time de um lado e o rival do outro
    const cv = document.getElementById('story-art');
    const ctx = cv.getContext('2d');
    const W = cv.width;
    const H = cv.height;
    window.CutsceneEngine.drawVnBackground(ctx, W, H, ch.mapTheme);
    const shade = ctx.createLinearGradient(0, H * 0.3, 0, H);
    shade.addColorStop(0, 'rgba(6, 11, 22, 0)');
    shade.addColorStop(1, 'rgba(6, 11, 22, 0.85)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
    const find = (id) => window.findCharacter(id);
    const p = this.state.profile;
    const you = { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: ch.homeColor || '#0f2942', jerseySecondary: ch.homeSecondary || '#1d4ed8' };
    const drawAt = (c, x, size, flip) => {
      ctx.save();
      ctx.translate(x - size / 2, H - size * 0.98);
      window.PixelRenderer.drawCharacterSprite(ctx, c, size, size * 1.1, { facing: 'front', frame: 4, flipX: flip });
      ctx.restore();
    };
    const homeKit = ch.homeColor ? { jerseyPrimary: ch.homeColor, jerseySecondary: ch.homeSecondary } : {};
    const home = mates.slice(0, 3).map(find).filter(Boolean).map((c) => Object.assign({}, c, homeKit));
    home.forEach((c, i) => drawAt(c, W * (0.08 + i * 0.09), 170, false));
    drawAt(you, W * 0.36, 260, false);
    const away = rivals.slice(0, 4).map(find).filter(Boolean).map((c) => Object.assign({}, c, { jerseyPrimary: ch.opponentColor || c.jerseyPrimary, jerseySecondary: ch.opponentSecondary || c.jerseySecondary }));
    away.forEach((c, i) => drawAt(c, W * (0.64 + i * 0.1), i === 0 ? 250 : 170, true));
    ctx.font = 'italic 900 90px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#060b16';
    ctx.strokeText('VS', W * 0.5, H * 0.62);
    ctx.fillStyle = '#facc15';
    ctx.fillText('VS', W * 0.5, H * 0.62);
  },

  // Rever um interlúdio já visto (botão 🎬 na aba HISTÓRIA)
  replayInterlude(id) {
    const it = window.STORY_INTERLUDES?.[id];
    if (!it) return;
    // O clima de cada interlúdio vem das próprias falas (os do pós-Copa começam com dark: true)
    window.CutsceneEngine.play({ locationTitle: `INTERLÚDIO: ${it.title.toUpperCase()}`, crestTitle: 'BLUE LOCK', bg: 'monitor_room', lines: it.lines, dark: false });
  },

  // Tudo depois da Copa Sub-20 tem clima sombrio (CutsceneEngine.setDarkMode): do Cap. 11
  // (o treino do Fox) em diante. Sem ch, vale o capítulo atual da carreira.
  isDarkEra(ch) {
    const chs = window.CAREER_CHAPTERS || [];
    const start = chs.findIndex((c) => c.id === 'ch10_fox_training');
    const idx = ch ? chs.findIndex((c) => c.id === ch.id) : this.state?.currentChapterIndex ?? 0;
    return start >= 0 && idx >= start;
  },

  interludeButtonsHtml() {
    const seen = this.state.seenInterludes || {};
    const ids = window.storySceneIds(seen);
    if (!ids.length) return '';
    return `<div class="story-scenes">🎬 REVER: ${ids.map((id) => `<button onclick="App.replayInterlude('${id}')">${window.STORY_INTERLUDES[id].title}</button>`).join('')}</div>`;
  },

  // Capítulo com o clube da NEL aplicado: nos capítulos com nelPhase, o elenco, o rival,
  // o uniforme e as falas vêm de NEL_CLUBS[state.nelClub].phases[nelPhase]
  getChapter(idx = this.state.currentChapterIndex) {
    const ch = window.CAREER_CHAPTERS[idx];
    if (!ch) return ch;
    if (ch.format === 'cup') return this.cupRoundChapter(ch);
    // Liga profissional: o clube vem das propostas (state.proClub)
    if (ch.league === 'pro') {
      const club = window.PRO_CLUBS[this.state.proClub];
      if (!club) return Object.assign({}, ch, { teamName: 'Seu clube (escolha uma proposta)', title: 'Temporada 1: escolha o seu clube', opponentName: 'Depende do clube que você escolher' });
      const out = Object.assign({}, ch, { proClub: club.id, teamName: `${club.name} (Profissional)`, homeColor: club.color, homeSecondary: club.secondary });
      return this.leagueRoundChapter(out, club);
    }
    if (ch.nelPhase === undefined) return ch;
    const club = window.NEL_CLUBS[this.state.nelClub];
    if (!club) return Object.assign({}, ch, window.NEL_UNCHOSEN);
    const out = Object.assign({}, ch, club.phases[ch.nelPhase], { nelClub: club.id, homeColor: club.color, homeSecondary: club.secondary });
    return ch.format === 'league' ? this.leagueRoundChapter(out, club) : out;
  },

  // A liga do capítulo atual (NEL ou a Liga Europeia profissional): LEAGUES[ch.league]
  lg(ch = window.CAREER_CHAPTERS[this.state.currentChapterIndex]) {
    return window.LEAGUES[ch?.league || 'nel'];
  },

  lgState() {
    return this.state[this.lg().stateKey];
  },

  // Os clubes da liga atual (NEL_CLUBS ou PRO_CLUBS)
  lgClubs(ch) {
    return this.lg(ch).clubs;
  },

  lgClub() {
    return this.state[this.lg().clubKey];
  },

  // Valor no ranking da liga: ¥ na NEL, pontos na Bola de Ouro
  fmtLeagueValue(v) {
    return this.lg().unit === 'pts' ? `${v.toFixed(1)} pts` : this.fmtYen(v);
  },

  // ==========================================================================
  // LIGA NEO EGOÍSTA: 5 clubes, turno e returno (10 rodadas; cada clube joga 8
  // e folga 2). state.nel guarda as rodadas, a tabela, os placares e os valores
  // de mercado. Cap. 7 = seus jogos 1-4, Cap. 8 = jogos 5-8.
  // ==========================================================================
  initLeague() {
    const L = this.lg();
    const t = [...L.order, null];
    const turn = [];
    for (let r = 0; r < t.length - 1; r++) {
      const pairs = [];
      for (let i = 0; i < t.length / 2; i++) pairs.push([t[i], t[t.length - 1 - i]]);
      turn.push(pairs);
      t.splice(1, 0, t.pop()); // método do círculo: o 1º fica parado e o resto gira
    }
    const rounds = [...turn, ...turn.map((pairs) => pairs.map(([a, b]) => [b, a]))];
    const table = {};
    L.order.forEach((c) => (table[c] ={ j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 }));
    this.state[L.stateKey] = { rounds, round: 0, games: 0, table, results: rounds.map(() => []), values: Object.assign({}, L.startValues), prevValues: Object.assign({}, L.startValues) };
    // Save que já estava no 2º turno (antes da liga existir): o 1º turno é simulado
    const half = L.gamesPerChapter;
    const ch = window.CAREER_CHAPTERS[this.state.currentChapterIndex];
    const club = this.lgClub();
    if ((ch?.nelPhase ?? ch?.leaguePhase) === 1) {
      while (this.lgState().games < half) {
        const m = this.nextLeagueMatch();
        const [ga, gb] = this.simLeagueScore(m.home ? club : m.opp, m.home ? m.opp : club);
        this.recordLeagueRound(m.roundIdx, m.home ? ga : gb, m.home ? gb : ga, null);
      }
    }
    this.saveState();
  },

  // Seu próximo jogo: pula (simulando) as rodadas em que o seu clube folga
  nextLeagueMatch() {
    const nel = this.lgState();
    const club = this.lgClub();
    while (nel.round < nel.rounds.length) {
      const pair = nel.rounds[nel.round].find((p) => p.includes(club));
      const opp = pair[0] === club ? pair[1] : pair[0];
      if (opp) return { roundIdx: nel.round, opp, home: pair[0] === club };
      this.simulateLeagueRound(nel.round);
      nel.round++;
    }
    return null;
  },

  leagueStrength(club) {
    const ids = this.lg().rosters[club] || [];
    return ids.reduce((s, id) => s + (window.findCharacter(id)?.ovr || 85), 0) / Math.max(1, ids.length);
  },

  // Placar simulado (gols ~ Poisson, o time mais forte faz mais)
  simLeagueScore(a, b) {
    const diff = this.leagueStrength(a) - this.leagueStrength(b);
    const goals = (lam) => {
      let k = 0;
      let p = Math.exp(-lam);
      let s = p;
      const u = Math.random();
      while (u > s && k < 7) {
        k++;
        p *= lam / k;
        s += p;
      }
      return k;
    };
    const lam = (d) => Math.max(0.4, Math.min(3, 1.5 + d / 8));
    return [goals(lam(diff)), goals(lam(-diff))];
  },

  applyLeagueResult(a, b, ga, gb) {
    const t = this.lgState().table;
    [[a, ga, gb], [b, gb, ga]].forEach(([c, f, s]) => {
      const row = t[c];
      row.j++;
      row.gp += f;
      row.gc += s;
      if (f > s) {
        row.v++;
        row.pts += 3;
      } else if (f === s) {
        row.e++;
        row.pts += 1;
      } else row.d++;
    });
  },

  // Rodada em que o seu clube folga: todas as partidas são simuladas
  simulateLeagueRound(roundIdx) {
    const nel = this.lgState();
    nel.rounds[roundIdx].forEach((pair) => {
      if (!pair[0] || !pair[1]) return;
      const [ga, gb] = this.simLeagueScore(pair[0], pair[1]);
      this.applyLeagueResult(pair[0], pair[1], ga, gb);
      nel.results[roundIdx].push({ a: pair[0], b: pair[1], ga, gb });
    });
    this.updateLeagueValues(roundIdx, null);
  },

  // Fecha a rodada com o seu jogo: placar (do ponto de vista do mandante), os outros jogos e os valores
  recordLeagueRound(roundIdx, homeGoals, awayGoals, rep) {
    const nel = this.lgState();
    const club = this.lgClub();
    const pair = nel.rounds[roundIdx].find((p) => p.includes(club));
    this.applyLeagueResult(pair[0], pair[1], homeGoals, awayGoals);
    nel.results[roundIdx].push({ a: pair[0], b: pair[1], ga: homeGoals, gb: awayGoals, mine: true });
    nel.prevValues = Object.assign({}, nel.values);
    nel.rounds[roundIdx].forEach((p) => {
      if (!p[0] || !p[1] || p === pair) return;
      const [ga, gb] = this.simLeagueScore(p[0], p[1]);
      this.applyLeagueResult(p[0], p[1], ga, gb);
      nel.results[roundIdx].push({ a: p[0], b: p[1], ga, gb });
    });
    this.updateLeagueValues(roundIdx, rep);
    nel.round = roundIdx + 1;
    nel.games++;
  },

  // Valores de mercado depois da rodada: você pela partida (nota, gols, resultado);
  // os outros sobem/descem um pouco e mais quando o clube deles vence
  updateLeagueValues(roundIdx, rep) {
    const nel = this.lgState();
    const clubOf = {};
    Object.entries(this.lg().rosters).forEach(([c, ids]) => ids.forEach((id) => (clubOf[id] = c)));
    const resultOf = (c) => {
      const r = nel.results[roundIdx].find((x) => x.a === c || x.b === c);
      if (!r) return 0;
      const f = r.a === c ? r.ga : r.gb;
      const s = r.a === c ? r.gb : r.ga;
      return f > s ? 1 : f === s ? 0 : -1;
    };
    Object.keys(nel.values).forEach((id) => {
      if (id === 'you') return;
      const c = clubOf[id];
      const res = c ? resultOf(c) : 0;
      nel.values[id] = Math.max(1, Math.round((nel.values[id] + (Math.random() * 3 - 0.8) + res * 1.5) * 10) / 10);
    });
    if (rep) {
      const mine = nel.results[roundIdx].find((x) => x.mine);
      const res = mine ? resultOf(this.lgClub()) : 0;
      // Antes um jogo ótimo dava +15 e em 3 jogos você já passava o Rin (30): agora o ganho
      // por jogo é menor e tem teto — o topo só vem no fim da liga, jogando muito bem
      // (na Liga Europeia, que começa mais longe do topo, ele rende 40% a mais)
      const scale = this.lg().id === 'pro' ? 1.4 : 1;
      const raw = ((rep.rating || 6) - 6) * 1.1 + (rep.goals || 0) * 0.9 + res * 0.8;
      const delta = Math.max(-3, Math.min(6, raw)) * scale;
      nel.values.you = Math.max(1, Math.round((nel.values.you + delta) * 10) / 10);
    }
  },

  leagueStandings() {
    const t = this.lgState().table;
    return Object.keys(t)
      .map((c) => Object.assign({ club: c, sg: t[c].gp - t[c].gc }, t[c]))
      .sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp);
  },

  // Ranking de valor: os jogadores do Blue Lock + você (os 23 primeiros vão para a Copa)
  leagueValueRanking() {
    const nel = this.lgState();
    return Object.keys(nel.values)
      .map((id) => ({ id, value: nel.values[id], prev: nel.prevValues[id] ?? nel.values[id] }))
      .sort((a, b) => b.value - a.value);
  },

  // O capítulo da liga já montado para o seu próximo jogo (7 contra 7)
  leagueRoundChapter(base, club) {
    const L = this.lg(base);
    const lgs = this.state[L.stateKey];
    if (!lgs) return Object.assign(base, { leagueLabel: `LIGA ${L.short}` });
    const phase = base.nelPhase ?? base.leaguePhase ?? 0;
    // Turno já jogado (o jogo fechou antes do "FIM DO TURNO"): falta só encerrar o capítulo
    if (lgs.games >= (phase + 1) * L.gamesPerChapter) return Object.assign(base, { leagueTurnDone: true });
    const m = this.nextLeagueMatch();
    if (!m) return base;
    const opp = L.clubs[m.opp];
    const games = lgs.games;
    const first = games % L.gamesPerChapter === 0;
    const roster = L.rosters[club.id];
    return Object.assign(base, {
      bigTeams: true,
      leagueMatch: m,
      // Quem fizer goalLimit gols primeiro encerra o jogo (pedidos do jogador: NEL 3, profissional 4)
      goalLimit: L.goalLimit || null,
      leagueLabel: `${L.short} • JOGO ${games + 1}/8${L.goalLimit ? ` • ATÉ ${L.goalLimit} GOLS` : ''}`,
      // O 6º do elenco fica de fora: é a sua vaga
      teammateIds: roster.filter((_, i) => i !== 5),
      opponentIds: L.rosters[m.opp],
      opponentName: opp.name,
      opponentColor: opp.color,
      opponentSecondary: opp.secondary,
      scoreLabels: { home: club.name.toUpperCase(), away: opp.name.toUpperCase() },
      title: `${L.short} • Jogo ${games + 1} de 8 (Rodada ${m.roundIdx + 1}): ${club.name} x ${opp.name}`,
      targetGoals: 99,
      matchDuration: 95,
      // A fala no meio do jogo e a cena do Metavision só no 1º jogo de cada turno
      midMatchLore: first ? base.midMatchLore : null,
      firstGoalSakuga: first ? base.firstGoalSakuga : null,
      loreSummary: L.summary(phase === 0 ? '1º turno' : '2º turno', club, opp)
    });
  },

  fmtYen(m) {
    return `¥ ${Math.round(m * 1000000).toLocaleString('pt-BR')}`;
  },

  // Tabela + ranking de valor (pós-jogo da liga e aba HISTÓRIA)
  leagueTablesHtml(compact = false) {
    const L = this.lg();
    const nel = this.lgState();
    if (!nel) return '';
    const club = this.lgClub();
    const unitDelta = L.unit === 'pts' ? '' : 'M';
    const rows = this.leagueStandings()
      .map((r, i) => {
        const c = L.clubs[r.club];
        return `<tr class="${r.club === club ? 'mine' : ''}"><td>${i + 1}</td><td><i class="kit" style="background:linear-gradient(90deg, ${c.color} 60%, ${c.secondary} 60%)"></i>${c.name}</td><td>${r.j}</td><td>${r.v}</td><td>${r.e}</td><td>${r.d}</td><td>${r.gp}</td><td>${r.gc}</td><td>${r.sg > 0 ? '+' : ''}${r.sg}</td><td><b>${r.pts}</b></td></tr>`;
      })
      .join('');
    const ranking = this.leagueValueRanking();
    const youIdx = ranking.findIndex((r) => r.id === 'you');
    const show = compact ? ranking.slice(0, 8) : ranking;
    const nameOf = (id) => (id === 'you' ? `${this.state.profile.name} (VOCÊ)` : window.findCharacter(id)?.name || id);
    const valueRows = show
      .map((r, i) => {
        const d = Math.round((r.value - r.prev) * 10) / 10;
        const cut = i === L.cutoff - 1 ? ' cutoff' : '';
        return `<tr class="${r.id === 'you' ? 'mine' : ''}${cut}"><td>${i + 1}</td><td>${nameOf(r.id)}</td><td>${this.fmtLeagueValue(r.value)}</td><td class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '▲' : d < 0 ? '▼' : '•'} ${Math.abs(d).toFixed(1)}${unitDelta}</td></tr>`;
      })
      .join('');
    const youRow = compact && youIdx >= show.length
      ? `<tr class="mine"><td>${youIdx + 1}</td><td>${nameOf('you')}</td><td>${this.fmtLeagueValue(nel.values.you)}</td><td></td></tr>`
      : '';
    return `
      <div class="league-panels">
        <div class="league-panel">
          <h3>🏆 TABELA DA ${L.short} <small>${nel.games}/8 jogos seus</small></h3>
          <table class="league-table"><tr><th>#</th><th>CLUBE</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>PTS</th></tr>${rows}</table>
        </div>
        <div class="league-panel">
          <h3>${L.valueTitle} <small>você é o #${youIdx + 1} • ${L.cutoffNote}</small></h3>
          <div class="value-scroll"><table class="league-table value-table">${valueRows}${youRow}</table></div>
        </div>
      </div>`;
  },

  // Placares de uma rodada
  leagueRoundHtml(roundIdx) {
    const nel = this.lgState();
    const res = nel.results[roundIdx] || [];
    const bye = nel.rounds[roundIdx].find((p) => !p[0] || !p[1]);
    const restClub = bye && (bye[0] || bye[1]);
    const clubs = this.lgClubs();
    return `
      <div class="league-round">
        <div class="league-round-title">RODADA ${roundIdx + 1}</div>
        ${res
          .map((r) => `<div class="league-score${r.mine ? ' mine' : ''}"><span>${clubs[r.a].name}</span><b>${r.ga} x ${r.gb}</b><span>${clubs[r.b].name}</span></div>`)
          .join('')}
        ${restClub ? `<div class="league-bye">Folga: ${clubs[restClub].name}</div>` : ''}
      </div>`;
  },

  // Fim do seu jogo na liga: registra, simula o resto da rodada, mostra tabela/valores
  handleLeagueMatch(ch, goalsFor, goalsAgainst, rep) {
    const m = ch.leagueMatch;
    const L = this.lg();
    const nel = this.lgState();
    const rankBefore = this.getBlueLockRank();
    this.state.careerMatches++;
    this.state.careerGoals += goalsFor;
    this.recordLeagueRound(m.roundIdx, m.home ? goalsFor : goalsAgainst, m.home ? goalsAgainst : goalsFor, rep);
    const won = goalsFor > goalsAgainst;
    const draw = goalsFor === goalsAgainst;
    const coins = Math.round((won ? 160 : draw ? 90 : 50) * this.coinMult());
    this.state.currencies.egoCoins += coins;
    this.state.currencies.skillPoints += 1;
    if (won) this.state.currencies.spins += 1;
    const turnDone = nel.games % L.gamesPerChapter === 0;
    this.saveState();
    this.renderAll();

    const color = won ? '#00f5d4' : draw ? '#facc15' : '#ef4444';
    const you = nel.values.you;
    const d = Math.round((you - (nel.prevValues.you ?? you)) * 10) / 10;
    const modal = document.getElementById('cinematic-modal');
    const content = document.getElementById('cinematic-modal-content');
    if (!modal || !content) return;
    this.pendingLeagueFinish = turnDone ? { ch, goalsFor, goalsAgainst, rankBefore } : null;
    content.innerHTML = `
      <div class="cinematic-box league-box" style="border-color:${color}; box-shadow: 0 0 35px ${color}">
        <div class="cinematic-badge" style="background:${color}; color:#090d16">${won ? 'VITÓRIA' : draw ? 'EMPATE' : 'DERROTA'} • JOGO ${nel.games} DE 8</div>
        <h2>${ch.scoreLabels.home} ${goalsFor} x ${goalsAgainst} ${ch.scoreLabels.away}</h2>
        <p class="cinematic-desc">
          ${L.valueLabel}: <strong>${this.fmtLeagueValue(you)}</strong> <span class="${d >= 0 ? 'up' : 'down'}">(${d >= 0 ? '+' : ''}${d.toFixed(1)}${L.unit === 'pts' ? ' pts' : ' milhões'})</span><br>
          +${coins} EgoCoins • +1 SP${won ? ' • +1 Giro' : ''}${draw || !won ? ' • Na liga não tem repetição: o resultado fica na tabela.' : ''}
        </p>
        ${this.lastReportHtml || ''}
        ${this.leagueRoundHtml(m.roundIdx)}
        ${this.leagueTablesHtml(false)}
        <div class="dilemma-buttons">
          ${turnDone
            ? `<button class="btn-dilemma shoot-choice" onclick="App.finishLeagueTurn()">${nel.games >= 8 ? `FIM DA ${L.name.toUpperCase()} ▶` : 'FIM DO 1º TURNO ▶'}</button>`
            : `<button class="btn-dilemma shoot-choice" onclick="App.closeCinematicModal(); App.launchChapterMatch()">PRÓXIMO JOGO ▶</button>
               <button class="btn-dilemma pass-choice" onclick="App.closeCinematicModal()">VOLTAR AO MENU</button>`}
        </div>
      </div>`;
    this.lastReportHtml = '';
    modal.classList.add('open');
  },

  // Fim do turno (jogo 4 ou 8): o capítulo termina com a posição na tabela e no ranking de valor
  finishLeagueTurn() {
    const p = this.pendingLeagueFinish;
    if (!p) return;
    this.pendingLeagueFinish = null;
    this.closeCinematicModal();
    const L = this.lg();
    const pos = this.leagueStandings().findIndex((r) => r.club === this.lgClub()) + 1;
    const ranking = this.leagueValueRanking();
    const vpos = ranking.findIndex((r) => r.id === 'you') + 1;
    const final = this.lgState().games >= 8;
    const club = L.clubs[this.lgClub()];
    if (L.id === 'pro') {
      this.finishProTurn(p, { pos, vpos, final, club, ranking });
      return;
    }
    if (final) {
      if (pos === 1) this.unlockAchievement('ach_nel_champion');
      if (vpos <= window.NEL_CUTOFF) this.unlockAchievement('ach_top23');
      if (vpos === 1) this.unlockAchievement('ach_most_valuable');
    }
    const preLines = [
      { speaker: 'NARRADOR', text: `${final ? 'Fim da Liga Neo Egoísta' : 'Fim do 1º turno'}: o ${club.name} está em ${pos}º lugar na tabela.`, mood: 'tense' },
      {
        speaker: 'JINPACHI EGO',
        text: `"Seu valor: ${this.fmtYen(this.state.nel.values.you)}. Você é o ${vpos}º jogador mais valioso do Blue Lock. ${vpos <= window.NEL_CUTOFF ? (final ? 'Está entre os 23. Vai para a Copa.' : 'Por enquanto, está entre os 23 da Copa.') : 'Fora dos 23. Os números não mentem: suba ou fique para trás.'}"`,
        mood: 'ego'
      }
    ];
    this.completeChapter(p.ch, p.goalsFor, p.goalsAgainst, p.rankBefore, {
      headline: final ? `LIGA ENCERRADA • ${pos}º LUGAR` : `1º TURNO ENCERRADO • ${pos}º LUGAR`,
      preLines
    });
  },

  // Fim do turno na carreira profissional: no fim da temporada tem a gala da Bola de Ouro
  finishProTurn(p, { pos, vpos, final, club, ranking }) {
    const pts = this.fmtLeagueValue(this.lgState().values.you);
    const winner = ranking[0];
    const winnerName = winner.id === 'you' ? this.state.profile.name : window.findCharacter(winner.id)?.name || winner.id;
    let preLines;
    if (!final) {
      preLines = [
        { speaker: 'NARRADOR', text: `Fim do 1º turno da Liga Europeia: o ${club.name} está em ${pos}º lugar.`, mood: 'tense' },
        { speaker: 'FOX', text: `"Você tá em ${vpos}º na corrida pela Bola de Ouro, com ${pts}. Quem lidera é ${winnerName}. Hehehe... quer que eu dê um jeito nele? Brincadeira. ...Ou não."`, mood: 'ego' }
      ];
    } else {
      if (pos === 1) this.unlockAchievement('ach_pro_champion');
      if (vpos === 1) this.unlockAchievement('ach_ballon_dor');
      preLines = [
        { speaker: 'NARRADOR', text: `Fim da temporada: o ${club.name} terminou a Liga Europeia em ${pos}º lugar.${pos === 1 ? ' CAMPEÃO DA EUROPA!' : ''}`, mood: 'tense', music: 'tension' },
        { speaker: 'NARRADOR', text: 'Paris, gala da Bola de Ouro. Smokings, flashes e os melhores jogadores do planeta na mesma sala.', mood: 'tense', bg: 'paris_gala' },
        { speaker: 'APRESENTADOR', text: '"E a Bola de Ouro desta temporada vai para..."', mood: 'tense', bg: 'paris_gala' },
        vpos === 1
          ? { speaker: 'APRESENTADOR', text: `"${this.state.profile.name.toUpperCase()}!!! O garoto do Blue Lock é o MELHOR JOGADOR DO MUNDO!"`, mood: 'happy', bg: 'paris_gala', music: 'victory' }
          : { speaker: 'APRESENTADOR', text: `"${winnerName.toUpperCase()}!" Você terminou em ${vpos}º, com ${pts}.`, mood: 'tense', bg: 'paris_gala' },
        // Ganhou: o discurso no palco (com o Rin saindo pelos fundos) e, depois do Ego,
        // a lição do Sae no campo à noite
        ...(vpos === 1 ? [{ cinematic: 'bola_de_ouro_discurso' }] : []),
        vpos === 1
          ? { speaker: 'JINPACHI EGO', text: '"O melhor do mundo saiu do Blue Lock. Eu disse. Agora falta uma coisa: a Copa do Mundo."', mood: 'ego', bg: 'paris_gala' }
          : { speaker: 'JINPACHI EGO', text: '"Perdeu. Ótimo. Guarde essa raiva. Na Copa do Mundo, ninguém vai lembrar de quem ganhou um troféu numa festa."', mood: 'ego', bg: 'paris_gala' },
        ...(vpos === 1 ? [{ cinematic: 'rin_sae_licao' }] : []),
        { speaker: 'FOX', text: '"Hehehe... a temporada acabou. Agora o seu país te chama. Vai pra Copa, monstro. Eu vou estar assistindo. Eu sempre estou assistindo."', mood: 'ego', bg: 'paris_gala', music: 'dread' }
      ];
    }
    this.completeChapter(p.ch, p.goalsFor, p.goalsAgainst, p.rankBefore, {
      headline: final ? `TEMPORADA ENCERRADA • ${pos}º LUGAR • BOLA DE OURO: ${vpos}º` : `1º TURNO ENCERRADO • ${pos}º LUGAR`,
      preLines
    });
  },

  // ==========================================================================
  // PROPOSTAS DOS CLUBES PROFISSIONAIS: depois do treino do Fox, os 5 clubes
  // fazem ofertas (salário = base + o seu valor final na NEL). O Fox comenta.
  // ==========================================================================
  proSalary(id) {
    const nelValue = this.state.nel?.values?.you || 5;
    return Math.round(window.PRO_OFFERS[id].base * (1 + nelValue / 100));
  },

  openProOffers(ch) {
    window.CutsceneEngine.play({
      locationTitle: `${ch.era} • AS PROPOSTAS`,
      crestTitle: 'EURO LEAGUE',
      bg: 'monitor_room',
      music: 'travel',
      lines: [
        { speaker: 'FOX', text: '"Hehehe... o seu celular não para de tocar, né? Fui eu que dei o seu número pra eles. Cinco clubes da Europa querem o monstro."', mood: 'ego' },
        { speaker: 'JINPACHI EGO', text: '"(no telefone) Você é profissional agora. Escolha o clube onde o SEU ego vai crescer, não o dele. E não assine nada que aquele homem colocar na sua frente."', mood: 'ego' },
        { speaker: 'FOX', text: '"Re Al, Chelsee, Dortmont, Milanno, Marsella. Escolhe. Qualquer um serve... desde que o monstro continue com fome."', mood: 'ego' }
      ],
      onComplete: () => this.openProOfferPicker()
    });
  },

  openProOfferPicker() {
    this.proPick = null;
    const modal = document.getElementById('cinematic-modal');
    const content = document.getElementById('cinematic-modal-content');
    if (!modal || !content) return;
    const cards = window.PRO_CLUB_ORDER
      .map((id) => {
        const club = window.PRO_CLUBS[id];
        const star = window.findCharacter(window.PRO_ROSTERS[id][0]);
        const was = window.PRO_ROSTERS[id].includes('rin') ? '<span class="club-bl">⚠ O Rin joga aqui</span>' : '';
        return `
          <button class="trio-card club-card" data-id="${id}" style="border-color:${club.secondary}; --club-a:${club.color}; --club-b:${club.secondary}" onclick="App.pickProOffer('${id}')">
            <div class="club-stripe"></div>
            <canvas class="club-cv" data-club="${id}" width="96" height="96"></canvas>
            <strong>${club.name.toUpperCase()}</strong>
            <span class="club-country">${club.country}</span>
            <span>Estrela: <b>${star ? star.name : ''}</b></span>
            <span class="offer-salary">💰 ${this.proSalary(id)} milhões/ano</span>
            <span class="club-style">🦊 ${window.PRO_OFFERS[id].fox}</span>
            ${was}
          </button>`;
      })
      .join('');
    content.innerHTML = `
      <div class="cinematic-box" style="max-width:1100px">
        <div class="cinematic-badge">CARREIRA PROFISSIONAL</div>
        <h2>ESCOLHA UMA PROPOSTA</h2>
        <p class="cinematic-desc">
          O clube decide com quem você joga e contra quem você disputa a Liga Europeia e a Bola de Ouro.<br>
          O salário sobe com o seu valor final na NEL. <strong>Não dá para trocar depois.</strong>
        </p>
        <div class="trio-grid">${cards}</div>
        <div class="dilemma-buttons">
          <button id="club-confirm-btn" class="btn-dilemma shoot-choice" disabled onclick="App.confirmProOffer()">ESCOLHA UMA PROPOSTA</button>
        </div>
      </div>
    `;
    modal.classList.add('open');
    content.querySelectorAll('.club-cv').forEach((cv) => {
      const club = window.PRO_CLUBS[cv.dataset.club];
      const star = window.findCharacter(window.PRO_ROSTERS[cv.dataset.club][0]);
      if (!star) return;
      const kit = Object.assign({}, star, { jerseyPrimary: club.color, jerseySecondary: club.secondary });
      window.PixelRenderer.drawCharacterSprite(cv.getContext('2d'), kit, cv.width, cv.height, { facing: 'front', frame: 4 });
    });
  },

  pickProOffer(id) {
    this.proPick = id;
    window.SFX?.click?.();
    document.querySelectorAll('.club-card').forEach((btn) => btn.classList.toggle('picked', btn.dataset.id === id));
    const btn = document.getElementById('club-confirm-btn');
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = `ASSINAR COM O ${window.PRO_CLUBS[id].name.toUpperCase()} (${this.proSalary(id)}M/ano) ▶`;
  },

  confirmProOffer() {
    const club = window.PRO_CLUBS[this.proPick];
    if (!club) return;
    this.state.proClub = club.id;
    this.state.currencies.egoCoins += this.proSalary(club.id) * 5;
    this.saveState();
    this.renderAll();
    this.closeCinematicModal();
    this.notify(`Contrato assinado com o ${club.name}! +${this.proSalary(club.id) * 5} EgoCoins de luvas`, club.secondary);
    this.launchChapterMatch();
  },

  // ==========================================================================
  // COPA DO MUNDO (format 'cup'): mata-mata de ch.cupRounds com a seleção.
  // state.cup = { chapterId, round }. Perdeu? Joga de novo a mesma fase.
  // ==========================================================================
  cupRound(ch) {
    const cup = this.state.cup;
    return cup && cup.chapterId === ch.id ? cup.round : 0;
  },

  cupRoundChapter(ch) {
    const i = Math.min(this.cupRound(ch), ch.cupRounds.length - 1);
    const r = ch.cupRounds[i];
    return Object.assign({}, ch, {
      cupIdx: i,
      title: `${ch.friendly ? 'Pré-Copa' : 'Copa do Mundo'} • ${r.name}: Japão x ${r.rivalName}`,
      opponentName: r.rivalName,
      opponentIds: r.opponentIds,
      teammateIds: r.teammateIds || ch.teammateIds,
      opponentColor: r.opponentColor,
      opponentSecondary: r.opponentSecondary,
      // Uniforme reserva (branco) quando o rival também joga de azul
      homeColor: r.homeColor || ch.homeColor,
      homeSecondary: r.homeSecondary || ch.homeSecondary,
      difficulty: r.difficulty || ch.difficulty,
      scoreLabels: { home: 'JAPÃO', away: r.label },
      era: ch.friendly ? `PRÉ-COPA — ${r.name}` : `COPA DO MUNDO — ${r.name}`,
      leagueLabel: `${ch.friendly ? 'AMISTOSO' : 'COPA'} • ${r.name}`,
      loreSummary: ch.friendly
        ? `${r.name}: Japão x ${r.rivalName}. Perdeu? O Ego manda jogar de novo (jogo ${i + 1} de ${ch.cupRounds.length}).`
        : r.group
          ? `Fase de grupos da Copa do Mundo: Japão x ${r.rivalName}. Vitória vale 3 pontos, empate 1: os 2 primeiros do grupo passam (jogo ${i + 1} de 3).`
          : `${r.name} da Copa do Mundo: Japão x ${r.rivalName}. Mata-mata: precisa vencer para seguir (fase ${i + 1} de ${ch.cupRounds.length}).`
    });
  },

  // ==========================================================================
  // FASE DE GRUPOS: state.cup.group = { results: { [time]: [gp, gc] }, sims: [...] }.
  // Os jogos entre os rivais são simulados pela força (ch.groupTeams[id].power).
  // ==========================================================================
  groupRounds(ch) {
    return ch.cupRounds.filter((r) => r.group);
  },

  // Tabela do grupo: [{ id, name, pts, j, v, e, d, gp, gc }] ordenada (pontos, saldo, gols)
  groupTable(ch, group = this.state.cup?.group) {
    const teams = ch.groupTeams || {};
    const row = {};
    Object.keys(teams).forEach((id) => (row[id] = { id, name: teams[id].name, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }));
    const add = (a, b, ga, gb) => {
      [[a, ga, gb], [b, gb, ga]].forEach(([id, f, c]) => {
        const r = row[id];
        if (!r) return;
        r.j++;
        r.gp += f;
        r.gc += c;
        if (f > c) { r.v++; r.pts += 3; } else if (f === c) { r.e++; r.pts += 1; } else r.d++;
      });
    };
    Object.entries(group?.results || {}).forEach(([opp, [gf, ga]]) => add('japao', opp, gf, ga));
    (group?.sims || []).forEach(([a, b, ga, gb]) => add(a, b, ga, gb));
    return Object.values(row).sort((x, y) => y.pts - x.pts || (y.gp - y.gc) - (x.gp - x.gc) || y.gp - x.gp || (x.id === 'japao' ? -1 : 1));
  },

  // Simula o jogo entre dois rivais do grupo (quem tem mais força marca mais)
  simGroupGame(ch, a, b) {
    const pa = ch.groupTeams[a].power;
    const pb = ch.groupTeams[b].power;
    const goals = (p) => Math.max(0, Math.round(Math.random() * 2.2 + p * 1.4 - 0.6));
    return [a, b, goals(pa), goals(pb)];
  },

  groupTableHtml(ch, group) {
    const rows = this.groupTable(ch, group);
    return `<div class="group-table"><div class="group-title">${ch.groupName || 'GRUPO'} • os 2 primeiros passam</div>
      <table><tr><th></th><th>Seleção</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr>
      ${rows.map((r, k) => `<tr class="${r.id === 'japao' ? 'me' : ''} ${k < 2 ? 'qual' : ''}"><td>${k + 1}</td><td>${r.name}</td><td><b>${r.pts}</b></td><td>${r.j}</td><td>${r.v}</td><td>${r.e}</td><td>${r.d}</td><td>${r.gp - r.gc}</td></tr>`).join('')}
      </table></div>`;
  },

  // Saves que estavam no meio da Copa antiga (sem fase de grupos): o 1º jogo era a
  // Alemanha, que agora é o 4º (16-avos). Quem já tinha passado dele não joga os grupos.
  migrateCupGroups() {
    const cup = this.state.cup;
    if (!cup || cup.chapterId !== 'ch13_world_cup' || cup.v === 2) return;
    if (cup.round > 0) cup.round += 3;
    cup.v = 2;
  },

  // Fim de um jogo da Copa. Devolve true quando a Copa continua (o capítulo não termina)
  handleCupMatch(ch, goalsFor, goalsAgainst) {
    const i = ch.cupIdx;
    const r = ch.cupRounds[i];
    const won = goalsFor > goalsAgainst;
    const draw = goalsFor === goalsAgainst;
    const last = i >= ch.cupRounds.length - 1;
    if (won && last) {
      this.state.cup = null;
      if (!ch.friendly) this.unlockAchievement('ach_world_cup');
      return false;
    }
    this.state.careerMatches++;
    this.state.careerGoals += goalsFor;
    const coins = Math.round((won ? 250 : draw && r.group ? 120 : 60) * this.coinMult());
    this.state.currencies.egoCoins += coins;
    if (won) this.state.currencies.spins += 1;
    const prev = this.state.cup && this.state.cup.chapterId === ch.id ? this.state.cup : {};
    let nextIdx = won ? i + 1 : i;
    let badge = won ? 'CLASSIFICADO!' : draw ? 'EMPATE • ELIMINADO' : 'DERROTA • ELIMINADO';
    let color = won ? '#00f5d4' : '#ef4444';
    let advanced = won;
    let text = '';
    let tableHtml = '';
    let group = null;
    if (r.group) {
      // Fase de grupos: todo resultado conta; no mesmo dia os outros dois rivais se enfrentam
      group = prev.group || { results: {}, sims: [] };
      group.results[r.group] = [goalsFor, goalsAgainst];
      // (cada rodada tem um par diferente: quem não enfrenta o Japão nesse dia)
      const others = Object.keys(ch.groupTeams).filter((id) => id !== 'japao' && id !== r.group);
      if (others.length === 2) group.sims.push(this.simGroupGame(ch, others[0], others[1]));
      const done = this.groupRounds(ch).every((gr) => group.results[gr.group]);
      tableHtml = this.groupTableHtml(ch, group);
      advanced = true;
      nextIdx = i + 1;
      badge = `${won ? 'VITÓRIA • +3 PONTOS' : draw ? 'EMPATE • +1 PONTO' : 'DERROTA • 0 PONTOS'} • ${r.name}`;
      color = won ? '#00f5d4' : draw ? '#facc15' : '#ef4444';
      const next = ch.cupRounds[i + 1];
      text = `Próximo jogo do grupo: <strong>${next.name} contra ${next.rivalName}</strong>.`;
      if (done) {
        const pos = this.groupTable(ch, group).findIndex((row) => row.id === 'japao');
        if (pos < 2) {
          badge = `CLASSIFICADO EM ${pos + 1}º LUGAR!`;
          color = '#00f5d4';
          text = `O Japão está no mata-mata! Próximo jogo: <strong>${next.name} contra ${next.rivalName}</strong>.`;
        } else {
          // Caiu no grupo: a fase de grupos recomeça do zero
          advanced = false;
          nextIdx = ch.cupRounds.findIndex((cr) => cr.group);
          group = null;
          badge = `ELIMINADO NA FASE DE GRUPOS (${pos + 1}º)`;
          color = '#ef4444';
          text = 'O Japão caiu no grupo... a não ser que você volte no tempo. Jogue a fase de grupos de novo.';
        }
      }
    } else if (ch.friendly) {
      badge = won ? `AMISTOSO VENCIDO • ${r.name}` : `AMISTOSO PERDIDO • ${r.name}`;
      color = won ? '#00f5d4' : '#f59e0b';
      text = won
        ? `Próximo: <strong>${ch.cupRounds[i + 1].name} contra ${ch.cupRounds[i + 1].rivalName}</strong>.`
        : '"De novo." O Ego não aceita derrota nem em amistoso. Jogue este amistoso outra vez.';
    } else {
      badge = `${badge} • ${r.name}`;
      text = won
        ? `O Japão avança! Próximo jogo: <strong>${ch.cupRounds[i + 1].name} contra ${ch.cupRounds[i + 1].rivalName}</strong>.`
        : 'No mata-mata não existe empate: o sonho acabou... a não ser que você volte no tempo. Jogue esta fase de novo.';
    }
    this.state.cup = { chapterId: ch.id, round: nextIdx, v: 2, group };
    this.saveState();
    this.renderAll();
    const modal = document.getElementById('cinematic-modal');
    const content = document.getElementById('cinematic-modal-content');
    if (!modal || !content) return true;
    content.innerHTML = `
      <div class="cinematic-box league-box" style="border-color:${color}; box-shadow: 0 0 35px ${color}">
        <div class="cinematic-badge" style="background:${color}; color:#090d16">${badge}</div>
        <h2>JAPÃO ${goalsFor} x ${goalsAgainst} ${r.label}</h2>
        <p class="cinematic-desc">
          ${text}<br>
          +${coins} EgoCoins${won ? ' • +1 Giro' : ''}
        </p>
        ${tableHtml}
        ${this.lastReportHtml || ''}
        <div class="cup-bracket">${ch.cupRounds.map((cr, k) => `<span class="${k < nextIdx ? 'done' : k === nextIdx ? 'now' : ''}">${cr.name}<b>${cr.label}</b></span>`).join('')}</div>
        <div class="dilemma-buttons">
          <button class="btn-dilemma shoot-choice" onclick="App.closeCinematicModal(); App.launchChapterMatch()">${advanced ? 'PRÓXIMO JOGO' : 'JOGAR DE NOVO'} ▶</button>
          <button class="btn-dilemma pass-choice" onclick="App.closeCinematicModal()">VOLTAR AO MENU</button>
        </div>
      </div>`;
    this.lastReportHtml = '';
    modal.classList.add('open');
    return true;
  },

  launchChapterMatch(chapterIdx) {
    const idx = chapterIdx !== undefined ? chapterIdx : this.state.currentChapterIndex;
    if (idx !== this.state.currentChapterIndex) {
      this.notify('Na carreira não é possível voltar para fases anteriores nem pular fases!', '#ef4444');
      return;
    }
    let ch = this.getChapter(idx);
    if (!ch) return;
    // O treino do Fox ensina o monstro (MatchEngine.checkMonster) para o resto da carreira
    if (ch.unlocksMonster && !this.state.monsterUnlocked) {
      this.state.monsterUnlocked = true;
      this.saveState();
    }

    // NEL sem clube: primeiro o Ego anuncia a Liga e você escolhe onde vai jogar
    if (ch.nelPhase !== undefined && !ch.nelClub) {
      this.openNelDraft(ch);
      return;
    }
    // Carreira profissional sem clube: as propostas dos 5 clubes
    if (ch.league === 'pro' && !ch.proClub) {
      this.openProOffers(ch);
      return;
    }
    // Liga ainda não começou (clube recém-escolhido ou save antigo): monta a tabela
    if (ch.format === 'league' && !this.lgState()) {
      this.initLeague();
      ch = this.getChapter(idx);
    }
    if (ch.leagueTurnDone) {
      this.pendingLeagueFinish = { ch, goalsFor: 0, goalsAgainst: 0, rankBefore: this.getBlueLockRank() };
      this.finishLeagueTurn();
      return;
    }
    // Jogos da liga depois do 1º de cada turno: só o anúncio da rodada, sem repetir a história
    const L = this.lg();
    if (ch.leagueMatch && this.lgState().games % L.gamesPerChapter !== 0) {
      const opp = L.clubs[ch.leagueMatch.opp];
      const oppStar = L.id === 'pro' ? window.findCharacter(L.rosters[opp.id][0]) : window.findCharacter(opp.master);
      window.CutsceneEngine.play({
        locationTitle: `${ch.era} • RODADA ${ch.leagueMatch.roundIdx + 1}`,
        crestTitle: L.crest,
        bg: ch.mapTheme,
        lines: [
          { speaker: 'NARRADOR', text: `Rodada ${ch.leagueMatch.roundIdx + 1} da ${L.name}: ${L.clubs[this.lgClub()].name} x ${opp.name}. ${L.valueLabel}: ${this.fmtLeagueValue(this.lgState().values.you)}.`, mood: 'tense' },
          { speaker: oppStar?.name.toUpperCase() || 'RIVAL', text: L.id === 'pro' ? '"Bem-vindo ao profissional, garoto. Aqui a gente quebra o tornozelo de quem chega se achando."' : '"Mostre os seus números em campo."', mood: 'ego' }
        ],
        onComplete: () => window.MatchEngine.startMatch(ch, this.state)
      });
      return;
    }
    // Copa do Mundo depois do 1º jogo: só o anúncio da fase e as falas do rival
    if (ch.format === 'cup' && ch.cupIdx > 0) {
      const r = ch.cupRounds[ch.cupIdx];
      window.CutsceneEngine.play({
        locationTitle: `${ch.friendly ? 'PRÉ-COPA' : 'COPA DO MUNDO'} • ${r.name}`,
        crestTitle: ch.friendly ? 'SELEÇÃO JAPONESA' : 'FIFA WORLD CUP',
        bg: ch.mapTheme,
        lines: [{ speaker: 'NARRADOR', text: `${ch.friendly ? 'Pré-Copa' : 'Copa do Mundo'}, ${r.name.toLowerCase()}: Japão x ${r.rivalName}.`, mood: 'tense' }, ...r.intro],
        onComplete: () => window.MatchEngine.startMatch(ch, this.state)
      });
      return;
    }

    // Torneio de Trios já começado: volta direto para a rodada atual com o mesmo trio
    if (this.getActiveTrio(ch)) {
      this.playTrioRound(ch);
      return;
    }

    // Diálogos da lore (com escolhas) + Cutscene de intro e, ao terminar, a Partida em TELA TODA!
    // Falas com "club" só tocam para quem escolheu aquele clube da NEL
    const preStory = ((window.CHAPTER_DIALOGUES && window.CHAPTER_DIALOGUES[ch.id]) || [])
      .filter((l) => !l.club || [].concat(l.club).includes(ch.league === 'pro' ? this.state.proClub : this.state.nelClub));
    // Interlúdios do capítulo (ex: a viagem para a Espanha e o discurso antes da Copa): só na primeira vez
    const seen = Object.assign({}, this.state.seenInterludes || {});
    const fresh = [].concat(ch.interlude || []).filter((id) => !seen[id] && window.STORY_INTERLUDES?.[id]);
    if (fresh.length) {
      fresh.forEach((id) => (seen[id] = true));
      this.state.seenInterludes = seen;
      this.saveState();
    }
    const interludeLines = fresh.flatMap((id) => window.STORY_INTERLUDES[id].lines);
    window.CutsceneEngine.play({
      locationTitle: `${ch.era} • ${fresh.length ? `INTERLÚDIO: ${window.STORY_INTERLUDES[fresh[0]].title.toUpperCase()}` : 'ARENA PRINCIPAL'}`,
      crestTitle: 'BLUE LOCK',
      bg: ch.mapTheme,
      lines: [...interludeLines, ...preStory, ...ch.introCutscene, ...(ch.format === 'cup' ? ch.cupRounds[ch.cupIdx].intro : [])],
      onComplete: () => {
        if (ch.format === 'trio') {
          this.openTrioPicker(ch);
        } else if (ch.hasFourEgosCutscene) {
          this.triggerFourEgosCutscene(() => {
            window.MatchEngine.startMatch(ch, this.state);
            window.MatchEngine.flowState.charge = 100;
            window.MatchEngine.chemCharge = 100;
            window.MatchEngine.showBanner('SINGULARIDADE: 4 EGO\'S!', 'Fluxo e Reação Química carregados. Decida a Final World Cup U-20!', '#00f5d4', 140);
          });
        } else {
          window.MatchEngine.startMatch(ch, this.state);
        }
      }
    });
  },

  // ==========================================================================
  // ESCOLHA DO CLUBE DA NEL: o Ego anuncia a Liga e você assina com um dos 5
  // clubes (state.nelClub). O clube muda elenco, uniforme, rivais e falas das
  // duas partidas da NEL. Não dá para trocar depois.
  // ==========================================================================
  openNelDraft(ch) {
    window.CutsceneEngine.play({
      locationTitle: `${ch.era} • A ESCOLHA DO CLUBE`,
      crestTitle: 'NEO EGOIST LEAGUE',
      bg: ch.mapTheme,
      lines: window.NEL_DRAFT_INTRO,
      onComplete: () => this.openNelClubPicker()
    });
  },

  openNelClubPicker() {
    this.nelPick = null;
    const modal = document.getElementById('cinematic-modal');
    const content = document.getElementById('cinematic-modal-content');
    if (!modal || !content) return;
    const find = (id) => window.BLUE_LOCK_CHARACTERS.find((x) => x.id === id);
    const cards = window.NEL_CLUB_ORDER
      .map((id) => {
        const club = window.NEL_CLUBS[id];
        const master = find(club.master);
        return `
          <button class="trio-card club-card" data-id="${id}" style="border-color:${club.secondary}; --club-a:${club.color}; --club-b:${club.secondary}" onclick="App.pickNelClub('${id}')">
            <div class="club-stripe"></div>
            <canvas class="club-cv" data-club="${id}" width="96" height="96"></canvas>
            <strong>${club.name.toUpperCase()}</strong>
            <span class="club-country">${club.country}</span>
            <span>Mestre: <b>${master ? master.name : club.master}</b></span>
            <span class="club-style">${club.style}</span>
            <span class="club-bl">Blue Lock: ${club.blueLock}</span>
          </button>`;
      })
      .join('');
    content.innerHTML = `
      <div class="cinematic-box" style="max-width:1100px">
        <div class="cinematic-badge">LIGA NEO EGOÍSTA</div>
        <h2>ESCOLHA O SEU CLUBE</h2>
        <p class="cinematic-desc">
          O clube decide com quem você joga, o seu uniforme e contra quem você vai jogar nas duas partidas da NEL.<br>
          <strong>Não dá para trocar depois.</strong>
        </p>
        <div class="trio-grid">${cards}</div>
        <div class="dilemma-buttons">
          <button id="club-confirm-btn" class="btn-dilemma shoot-choice" disabled onclick="App.confirmNelClub()">ESCOLHA UM CLUBE</button>
        </div>
      </div>
    `;
    modal.classList.add('open');
    content.querySelectorAll('.club-cv').forEach((cv) => {
      const club = window.NEL_CLUBS[cv.dataset.club];
      const master = find(club.master);
      if (!master) return;
      const kit = Object.assign({}, master, { jerseyPrimary: club.color, jerseySecondary: club.secondary });
      window.PixelRenderer.drawCharacterSprite(cv.getContext('2d'), kit, cv.width, cv.height, { facing: 'front', frame: 4 });
    });
  },

  pickNelClub(id) {
    this.nelPick = id;
    window.SFX?.click?.();
    document.querySelectorAll('.club-card').forEach((btn) => btn.classList.toggle('picked', btn.dataset.id === id));
    const btn = document.getElementById('club-confirm-btn');
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = `ASSINAR COM O ${window.NEL_CLUBS[id].name.toUpperCase()} ▶`;
  },

  confirmNelClub() {
    const club = window.NEL_CLUBS[this.nelPick];
    if (!club) return;
    this.state.nelClub = club.id;
    this.saveState();
    this.renderAll();
    this.closeCinematicModal();
    this.notify(`Você assinou com o ${club.name}!`, club.secondary);
    this.launchChapterMatch();
  },

  // ==========================================================================
  // TORNEIO DE TRIOS (3ª Seleção): você escolhe 2 companheiros e vence os
  // mata-matas 3 contra 3 de ch.trioRounds para ganhar a vaga contra a Sub-20.
  // O trio e a rodada atual ficam salvos em state.trio.
  // ==========================================================================
  getActiveTrio(ch) {
    const t = this.state.trio;
    return ch?.format === 'trio' && t && t.chapterId === ch.id && t.mates?.length === 2 ? t : null;
  },

  openTrioPicker(ch) {
    this.trioPick = [];
    const modal = document.getElementById('cinematic-modal');
    const content = document.getElementById('cinematic-modal-content');
    if (!modal || !content) return;
    const cards = ch.trioPool
      .map((id) => {
        const c = window.BLUE_LOCK_CHARACTERS.find((x) => x.id === id);
        if (!c) return '';
        return `
          <button class="trio-card" data-id="${id}" style="border-color:${c.auraColor}" onclick="App.toggleTrioPick('${id}')">
            <canvas class="trio-cv" data-charid="${id}" width="72" height="72"></canvas>
            <strong>${c.name}</strong>
            <span>${c.pos} • OVR ${this.getScaledCharOVR(c)}</span>
            <span style="color:${c.auraColor}">⚡ ${c.weaponName}</span>
            <span>Química: ${this.state.affinities[id] ?? 50}%</span>
          </button>`;
      })
      .join('');
    const rounds = ch.trioRounds.map((r) => `<strong>${r.name}</strong>: ${r.rivalName}`).join('<br>');
    content.innerHTML = `
      <div class="cinematic-box" style="max-width:1040px">
        <div class="cinematic-badge">3ª SELEÇÃO — TORNEIO DE TRIOS</div>
        <h2>MONTE SEU TRIO</h2>
        <p class="cinematic-desc">
          Escolha <strong>2 companheiros</strong>. Quanto maior a química, melhor eles jogam ao seu lado.
          Só o trio campeão ganha a vaga contra a Sub-20!<br>${rounds}
        </p>
        <div class="trio-grid">${cards}</div>
        <div class="dilemma-buttons">
          <button id="trio-confirm-btn" class="btn-dilemma shoot-choice" disabled onclick="App.confirmTrio()">ESCOLHA 2 COMPANHEIROS (0/2)</button>
        </div>
      </div>
    `;
    modal.classList.add('open');
    content.querySelectorAll('.trio-cv').forEach((cv) => {
      const c = window.BLUE_LOCK_CHARACTERS.find((x) => x.id === cv.dataset.charid);
      if (c) window.PixelRenderer.drawCharacterSprite(cv.getContext('2d'), c, cv.width, cv.height, { facing: 'front', frame: 4 });
    });
  },

  toggleTrioPick(id) {
    if (this.trioPick.includes(id)) {
      this.trioPick = this.trioPick.filter((x) => x !== id);
    } else {
      if (this.trioPick.length >= 2) this.trioPick.shift();
      this.trioPick.push(id);
    }
    document.querySelectorAll('.trio-card').forEach((btn) => btn.classList.toggle('picked', this.trioPick.includes(btn.dataset.id)));
    const btn = document.getElementById('trio-confirm-btn');
    if (!btn) return;
    const names = this.trioPick.map((x) => window.BLUE_LOCK_CHARACTERS.find((c) => c.id === x).name.split(' ').pop());
    btn.disabled = this.trioPick.length !== 2;
    btn.textContent = this.trioPick.length === 2 ? `FECHAR O TRIO: VOCÊ + ${names.join(' + ').toUpperCase()} ▶` : `ESCOLHA 2 COMPANHEIROS (${this.trioPick.length}/2)`;
  },

  confirmTrio() {
    const ch = window.CAREER_CHAPTERS[this.state.currentChapterIndex];
    if (!ch || ch.format !== 'trio' || this.trioPick.length !== 2) return;
    this.state.trio = { chapterId: ch.id, mates: this.trioPick.slice(), round: 0 };
    this.saveState();
    this.renderAll();
    this.closeCinematicModal();
    this.playTrioRound(ch);
  },

  playTrioRound(ch) {
    const t = this.state.trio;
    const round = ch.trioRounds[t.round];
    const roundChapter = Object.assign({}, ch, round, {
      teammateIds: t.mates.slice(),
      opponentName: round.rivalName,
      era: `${ch.era} • ${round.name}`
    });
    window.CutsceneEngine.play({
      locationTitle: `${ch.era} • ${round.name}`,
      crestTitle: 'TORNEIO DE TRIOS',
      bg: ch.mapTheme,
      lines: [
        { speaker: 'JINPACHI EGO', text: `"${round.name}! Seu trio contra o ${round.rivalName}. Empate ou derrota: fora da Sub-20."`, mood: 'ego' },
        ...(round.intro || [])
      ],
      onComplete: () => window.MatchEngine.startMatch(roundChapter, this.state)
    });
  },

  // Retorna true quando a rodada foi tratada aqui (derrota ou vitória antes da final);
  // false quando o trio é campeão e o capítulo termina como uma vitória normal
  handleTrioRound(won, goalsFor, goalsAgainst) {
    const ch = window.CAREER_CHAPTERS.find((c) => c.id === window.MatchEngine.chapter.id);
    const t = this.getActiveTrio(ch);
    if (!t) return false;
    const round = ch.trioRounds[t.round];
    const boostTrio = (amt) => t.mates.forEach((id) => (this.state.affinities[id] = Math.min(100, (this.state.affinities[id] ?? 50) + amt)));
    if (won && t.round >= ch.trioRounds.length - 1) {
      boostTrio(5);
      this.state.trio = null;
      return false;
    }

    this.state.careerMatches++;
    this.state.careerGoals += goalsFor;
    if (won) {
      t.round++;
      boostTrio(3);
      this.state.currencies.egoCoins += 90;
    } else {
      this.state.currencies.egoCoins += 50;
    }
    this.state.currencies.skillPoints += 1;
    this.saveState();
    this.renderAll();

    const next = ch.trioRounds[t.round];
    const color = won ? '#00f5d4' : '#ef4444';
    const modal = document.getElementById('cinematic-modal');
    const content = document.getElementById('cinematic-modal-content');
    if (!modal || !content) return true;
    content.innerHTML = `
      <div class="cinematic-box" style="border-color:${color}; box-shadow: 0 0 35px ${color}">
        <div class="cinematic-badge" style="background:${color}; color:#090d16">${won ? `${round.name} VENCIDA!` : `ELIMINADO NA ${round.name}`}</div>
        <h2>${goalsFor} x ${goalsAgainst} — ${round.rivalName}</h2>
        <p class="cinematic-desc">
          ${won
            ? `Seu trio avança! Próximo adversário: <strong>${next.rivalName}</strong> (${next.name}).<br>+90 EgoCoins • +1 SP • Química do trio +3`
            : 'No mata-mata, empate também elimina... mas o Ego te deu mais uma chance com o mesmo trio.<br>+50 EgoCoins • +1 SP'}
        </p>
        <div class="dilemma-buttons">
          <button class="btn-dilemma shoot-choice" onclick="App.closeCinematicModal(); App.launchChapterMatch()">${won ? `JOGAR A ${next.name} ▶` : `TENTAR A ${round.name} DE NOVO ▶`}</button>
          <button class="btn-dilemma pass-choice" onclick="App.closeCinematicModal()">VOLTAR AO MENU</button>
        </div>
      </div>
    `;
    modal.classList.add('open');
    return true;
  },

  previewAnimeSakuga(type = 'u20_direct_shoot') {
    window.CutsceneEngine.playActionSakuga(type);
  },

  closeIntroAndPlay() {
    const modal = document.getElementById('match-intro-modal');
    if (modal) modal.classList.remove('open');
  },

  // ==========================================================================
  // CUTSCENES CINEMATOGRÁFICAS ESPECIAIS PEDIDAS PELO USUÁRIO
  // 1) O Dilema do Passe no Prólogo (Amigo Tada erra o gol na trave -> Entrada no Blue Lock!)
  // 2) "QUATRO EGOS" (Câmera passa no campo mostrando Você, Sae Itoshi, Julian Loki e Hugo!)
  // 3) Reação Química Explosiva (Ex: Com Shidou, Yukimiya, Bachira, Sae)
  // ==========================================================================
  triggerProloguePassCutscene() {
    window.MatchEngine.paused = true;
    const modal = document.getElementById('cinematic-modal');
    const content = document.getElementById('cinematic-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="cinematic-box prologue-dilemma">
        <div class="cinematic-badge">MOMENTO DECISIVO — FINAL DO ENSINO MÉDIO (89')</div>
        <h2>CARA A CARA COM O GOLEIRO!</h2>
        <p class="cinematic-desc">
          Você driblou dois defensores e entrou na grande área! O goleiro sai fechando o ângulo.
          Ao seu lado direito, seu amigo <strong>Tada</strong> está sozinho e grita:
          <br><em>"PASSA PRA MIM! UM POR TODOS E TODOS POR UM!"</em>
        </p>
        <div class="dilemma-buttons">
          <button class="btn-dilemma pass-choice" onclick="App.resolvePrologueChoice('pass')">
            🤝 DAR O PASSE PARA O MEU AMIGO (Tada)
          </button>
          <button class="btn-dilemma shoot-choice" onclick="App.resolvePrologueChoice('shoot')">
            🔥 IGNORAR O AMIGO E CHUTAR PRO GOL
          </button>
        </div>
      </div>
    `;
    modal.classList.add('open');
  },

  resolvePrologueChoice(choice) {
    const modal = document.getElementById('cinematic-modal');
    const content = document.getElementById('cinematic-modal-content');
    if (modal) modal.classList.remove('open');

    this.state.blueLockEntered = true;
    // A escolha fica no save ('pass' = o caminho do mangá)
    this.state.prologueChoice = choice;
    this.state.stats.ego += 6;
    this.state.currencies.spins += 3;
    if (this.state.currentChapterIndex === 0) {
      this.state.currentChapterIndex = 1;
      this.state.completedChapters.push('ch0_prologue');
    }
    this.unlockAchievement('ach_prologue');
    this.saveState();
    this.renderAll();

    // A noite depois da eliminação (ligação do Tada e a carta da JFU), com as falas da sua escolha
    const prologue = window.CAREER_CHAPTERS.find((c) => c.id === 'ch0_prologue');
    const nightLines = (prologue?.postMatchCutscene || []).filter((l) => !l.when || l.when === choice);

    // Toca a Animação Multi-Ângulo do Prólogo (Tada acertando a Trave!), a noite em casa e o convite do Blue Lock.
    // A animação é a do passe: quem chutou vai direto para a noite em casa
    const night = () => {
      window.MatchEngine.closeFullscreenOverlay();
      window.CutsceneEngine.play({ locationTitle: 'NAQUELA NOITE', crestTitle: 'PRÓLOGO', bg: 'night_home', lines: nightLines, onComplete: () => showInvite() });
    };
    if (choice === 'pass') window.CutsceneEngine.playActionSakuga('prologue_tada_miss', night);
    else night();
    const showInvite = () => {
      const text =
        choice === 'pass'
          ? `Você decide confiar no seu amigo e toca a bola de lado... <strong>Tada chuta de canela e a bola EXPLODE NA TRAVE!</strong> No contra-ataque imediato, Matsukaze faz o gol e elimina sua escola!<br><br>Enquanto você grita de arrependimento jurando nunca mais passar a bola na cara do gol, <strong>Jinpachi Ego</strong> envia sua convocação para o <strong>PROJETO BLUE LOCK</strong>!`
          : `Você tenta fuzilar sozinho, mas dois zagueiros bloqueiam em cima da linha e o contra-ataque elimina sua escola! Na arquibancada, <strong>Jinpachi Ego</strong> sorri ao ver sua fome de gol e te convoca para o <strong>PROJETO BLUE LOCK</strong>!`;

      if (modal && content) {
        content.innerHTML = `
          <div class="cinematic-box">
            <div class="cinematic-badge" style="background:#00f5d4; color:#090d16">BEM-VINDO AO BLUE LOCK!</div>
            <h2>O NASCIMENTO DO SEU EGO!</h2>
            <p class="cinematic-desc">${text}</p>
            <div class="reward-highlight">
              🔓 <strong>GIRO DE ARMA E FLUXO DESBLOQUEADOS!</strong> (+3 Giros e +6 Ego! Vá na aba ARMAS para girar sua primeira Arma!)
            </div>
            <button class="btn-dilemma shoot-choice" onclick="App.closeCinematicModal(); App.switchTab('ARMAS');">IR GIRAR MINHA ARMA ▶</button>
          </div>
        `;
        modal.classList.add('open');
      }
    };
  },

  // Cinemática da Final contra a França: "FINAL WORLD CUP U-20" → câmera girando
  // pelo campo → "4 EGO'S" → tela dividida em 4 (Você, Loki, Sae e Hugo)
  // (a conquista "Quatro Egos" só sai quando você vence a final, em completeChapter)
  triggerFourEgosCutscene(onDone) {
    // viu a cena: ela entra no 🎬 REVER CENAS
    this.state.seenInterludes = Object.assign({}, this.state.seenInterludes, { four_egos: true });
    this.saveState();
    window.CutsceneEngine.playActionSakuga('four_egos_intro', onDone);
  },

  showChemicalCutsceneOverlay(partnerChar, playerState) {
    window.MatchEngine.showBanner(
      `⚡ REAÇÃO QUÍMICA: ${playerState.profile.name.toUpperCase()} × ${partnerChar.name.toUpperCase()}!`,
      `${partnerChar.chemName} — ${partnerChar.chemBonus}`,
      partnerChar.auraColor || '#ec4899',
      135
    );
  },

  closeCinematicModal() {
    const modal = document.getElementById('cinematic-modal');
    if (modal) modal.classList.remove('open');
    window.MatchEngine.paused = false;
  },

  // Caixinha com a nota da partida (S/A/B/C/D) e o que contou para ela
  reportHtml(rep) {
    if (!rep) return '';
    const color = rep.color;
    const labels = {
      finalizando: 'Finalização', poderDisparo: 'Poder de Disparo', tirosLongos: 'Tiros Longos', conducao: 'Condução',
      velocidade: 'Velocidade', resistencia: 'Resistência', visao: 'Visão', forca: 'Força', posicionamento: 'Posicionamento',
      compostura: 'Compostura', ego: 'Ego', habilidadeAerea: 'Hab. Aérea'
    };
    return `
      <div class="match-report">
        <div class="match-grade" style="color:${color}; text-shadow: 0 0 18px ${color}">${rep.grade}</div>
        <div class="match-report-stats">
          NOTA DA PARTIDA • <b>+${rep.bonus} EgoCoins</b><br>
          Gols ${rep.goals}${rep.angleGoals ? ` (${rep.angleGoals} no ângulo)` : ''} • Chutes no alvo ${rep.onTarget}/${rep.shots}<br>
          Dribles ${rep.dribbles} • Passes ${rep.passes} • Desarmes ${rep.steals} • Skills ${rep.skills} • Gols sofridos ${rep.conceded}
          ${Object.keys(rep.gains || {}).length ? `<div class="match-gains">${Object.entries(rep.gains).map(([k, v]) => `<span>+${v} ${labels[k] || k}</span>`).join('')}</div>` : ''}
        </div>
      </div>`;
  },

  // opts.forfeit = desistiu pela pausa: derrota sem prêmio (nada de nota, atributos, energia
  // ou os +80 da derrota — antes dava para farmar desistindo) e sem avançar a história
  onMatchFinished(won, goalsFor, goalsAgainst, opts = {}) {
    const ch = window.MatchEngine.chapter;
    const forfeit = !!opts.forfeit;
    // Bônus de EgoCoins pela nota da partida (vale em qualquer resultado)
    const rep = forfeit ? null : window.MatchEngine.lastReport;
    window.MatchEngine.lastReport = null;
    this.lastReportHtml = this.reportHtml(rep);
    // Jogar uma partida enche a energia de treino de novo
    if (!forfeit) this.state.trainingEnergy = window.TRAINING_ENERGY_MAX;
    if (rep) {
      rep.bonus = Math.round(rep.bonus * this.coinMult());
      this.state.currencies.egoCoins += rep.bonus;
      Object.entries(rep.gains || {}).forEach(([k, v]) => {
        if (this.state.stats[k] !== undefined) this.state.stats[k] += v;
      });
      this.trackCareer(rep, goalsFor, goalsAgainst);
    }
    if (ch?.format === 'trio' && this.handleTrioRound(won, goalsFor, goalsAgainst)) {
      this.lastReportHtml = '';
      return;
    }
    // Liga NEL: todo resultado conta na tabela e a liga segue (não tem "tentar de novo")
    if (ch?.format === 'league' && ch.leagueMatch) {
      this.handleLeagueMatch(ch, goalsFor, goalsAgainst, rep);
      return;
    }
    // Copa do Mundo: mata-mata, só a vitória na final fecha o capítulo
    if (ch?.format === 'cup' && this.handleCupMatch(ch, goalsFor, goalsAgainst)) return;
    this.state.careerMatches++;
    this.state.careerGoals += goalsFor;
    // Capítulos com advanceOnLoss (ex: World Five) avançam a história mesmo perdendo
    const advancedOnLoss = !won && !forfeit && !!ch?.advanceOnLoss;
    // Resultado que conta na história (venceu um jogo que no mangá foi derrota? as cenas
    // e o 🎬 REVER usam a versão da vitória; ver chapterWon)
    if (ch && (won || advancedOnLoss)) this.state.chapterResults = Object.assign({}, this.state.chapterResults, { [ch.id]: won ? 'win' : 'loss' });
    // Ranking antes do capítulo (o anúncio do Ego mostra de quanto para quanto você subiu)
    const rankBefore = this.getBlueLockRank();

    if (advancedOnLoss) {
      if (!this.state.completedChapters.includes(ch.id)) {
        this.state.completedChapters.push(ch.id);
      }
      const rankAfter = this.getBlueLockRank();
      const coins = Math.round((ch.rewardCoins / 2) * this.coinMult());
      this.state.currencies.egoCoins += coins;
      this.state.currencies.spins += ch.rewardSpins;
      this.state.currencies.skillPoints += ch.rewardSP;
      if (this.state.currentChapterIndex < window.CAREER_CHAPTERS.length - 1) {
        this.state.currentChapterIndex++;
      }
      this.skipCompletedChapters();
      this.markPostMatchScenesSeen();
      this.saveState();
      this.renderAll();

      window.CutsceneEngine.play({
        locationTitle: `${ch.era} • PÓS-JOGO`,
        crestTitle: 'BLUE LOCK',
        bg: ch.mapTheme,
        dark: this.isDarkEra(ch),
        lines: [...(ch.lossCutscene || ch.postMatchCutscene || []), ...(rankBefore ? this.rankAnnouncement(rankBefore, rankAfter) : [])],
        onComplete: () => {
          this.showGachaModal(
            `DERROTA (${goalsFor} x ${goalsAgainst}) — MAS A HISTÓRIA CONTINUA`,
            ch.title,
            'CAPÍTULO CONCLUÍDO • AVANÇOU NA LORE!',
            '#f59e0b',
            `Recompensas recebidas:<br>• <strong>+${coins} EgoCoins</strong> (metade, pela derrota)<br>• <strong>+${ch.rewardSpins} Giros de Arma/Fluxo</strong><br>• <strong>+${ch.rewardSP} Pontos de Habilidade (SP)</strong>${this.rankRewardLine(rankBefore, rankAfter)}`
          );
        }
      });
      return;
    }

    if (won && ch) {
      this.completeChapter(ch, goalsFor, goalsAgainst, rankBefore);
    } else {
      if (!forfeit) {
        this.state.currencies.egoCoins += 80;
        this.state.currencies.skillPoints += 1;
      }
      // Perdeu um CAPÍTULO NOVO que ficou para trás: volta para onde estava (o card continua
      // na HISTÓRIA e o "TENTAR DE NOVO" joga o extra de novo)
      if (ch?.extraForOldSaves && this.isPastExtraChapter(ch)) this.skipCompletedChapters();
      this.saveState();
      this.renderAll();
      this.showDefeatScreen(ch, goalsFor, goalsAgainst, forfeit);
    }
  },

  // Capítulo vencido: marca como feito, dá as recompensas, avança e toca o pós-jogo.
  // opts.headline / opts.preLines: a Liga NEL usa para o fim do turno
  completeChapter(ch, goalsFor, goalsAgainst, rankBefore, opts = {}) {
    {
      if (!this.state.completedChapters.includes(ch.id)) {
        this.state.completedChapters.push(ch.id);
      }
      if (ch.unlocksBlueLock) this.state.blueLockEntered = true;
      if (ch.unlocksNEL) {
        this.state.nelUnlocked = true;
        this.unlockAchievement('ach_nel_unlock');
      }
      if (ch.id === 'ch5_u20_japan') this.unlockAchievement('ach_u20_win');
      if (ch.id === 'ch8_u20_england') this.unlockAchievement('ach_england_u20');
      if (ch.id === 'ch9_world_cup_final') this.unlockAchievement('ach_four_egos');
      this.markPostMatchScenesSeen();
      if (ch.unlocksMonster) this.unlockAchievement('ach_monster');

      const coins = Math.round(ch.rewardCoins * this.coinMult());
      this.state.currencies.egoCoins += coins;
      this.state.currencies.spins += ch.rewardSpins;
      this.state.currencies.skillPoints += ch.rewardSP;
      this.state.nelSalaryBid += goalsFor * 45000000;

      // Depois do último capítulo o índice passa do fim: o hub mostra o final da carreira
      if (this.state.currentChapterIndex < window.CAREER_CHAPTERS.length) {
        this.state.currentChapterIndex++;
      }
      // Capítulo extra jogado por quem já estava mais à frente: volta para onde estava
      this.skipCompletedChapters();

      this.saveState();
      this.renderAll();
      const rankAfter = this.getBlueLockRank();

      const showRewardBox = () => {
        this.showGachaModal(
          opts.headline || `VITÓRIA! (${goalsFor} x ${goalsAgainst})`,
          ch.title,
          'CAPÍTULO CONCLUÍDO • AVANÇOU NA LORE!',
          '#00f5d4',
          `Recompensas recebidas:<br>• <strong>+${coins} EgoCoins</strong><br>• <strong>+${ch.rewardSpins} Giros de Arma/Fluxo</strong><br>• <strong>+${ch.rewardSP} Pontos de Habilidade (SP)</strong>${this.rankRewardLine(rankBefore, rankAfter)}<br>${ch.unlocksNEL ? '<br>👑 <strong>LIGA NEO EGOÍSTA (NEL) E 2º SLOT DE ARMA/FLUXO DESBLOQUEADOS!</strong>' : ''}`
        );
      };

      // Toca a Cutscene Pós-Partida da Lore (e o anúncio do ranking) antes das recompensas
      const postLines = [...(opts.preLines || []), ...(ch.postMatchCutscene || []).filter((l) => !l.when), ...(rankBefore ? this.rankAnnouncement(rankBefore, rankAfter) : [])];
      const playPost = () => {
        if (postLines.length > 0) {
          window.CutsceneEngine.play({
            locationTitle: `${ch.era} • PÓS-JOGO`,
            crestTitle: 'BLUE LOCK',
            bg: ch.mapTheme,
            lines: postLines,
            // O índice já avançou: o clima é o do capítulo que acabou (a final Sub-20 escurece no meio)
            dark: this.isDarkEra(ch),
            onComplete: showRewardBox
          });
        } else {
          showRewardBox();
        }
      };
      // Vitória com festa (ex: o título da Copa Sub-20): a comemoração toca antes do pós-jogo
      if (ch.victorySakuga) {
        window.CutsceneEngine.celebCfg = { home: goalsFor, away: goalsAgainst };
        window.CutsceneEngine.playActionSakuga(ch.victorySakuga, playPost);
      } else {
        playPost();
      }
    }
  },

  // EgoCoins das partidas e capítulos mudam com a dificuldade (Fácil −20%, Egoísta +30%)
  coinMult() {
    return (window.DIFFICULTY_MODES[this.state.difficulty] || window.DIFFICULTY_MODES.normal).coinMult;
  },

  // Soma a partida nas estatísticas da carreira (o que VOCÊ fez, do relatório da partida)
  trackCareer(rep, goalsFor, goalsAgainst) {
    const c = this.state.career;
    if (goalsFor > goalsAgainst) c.wins++;
    else if (goalsFor === goalsAgainst) c.draws++;
    else c.losses++;
    c.myGoals += rep.goals || 0;
    c.angleGoals += rep.angleGoals || 0;
    c.longGoals += rep.longGoals || 0;
    c.dribbles += rep.dribbles || 0;
    c.steals += rep.steals || 0;
    if ((rep.goals || 0) >= 3) c.hatTricks++;
    c.bestRating = Math.max(c.bestRating, rep.rating || 0);
  },

  // Conquistas com progresso: libera as que bateram a meta (roda a cada renderAll)
  checkAchievements() {
    (window.ACHIEVEMENTS_DB || []).forEach((a) => {
      if (!a.progress || this.state.unlockedAchievements.includes(a.id)) return;
      const [cur, goal] = a.progress(this.state, this);
      if (cur >= goal) this.unlockAchievement(a.id);
    });
  },

  // Tela de derrota: o Ego fala, você ganha um pouco de experiência e escolhe tentar
  // de novo ou ir treinar
  showDefeatScreen(ch, goalsFor, goalsAgainst, forfeit = false) {
    const modal = document.getElementById('cinematic-modal');
    const content = document.getElementById('cinematic-modal-content');
    if (!modal || !content) return;
    const lines = [
      'Perdeu porque jogou pra não perder. Atacante que tem medo de errar não serve pro Blue Lock.',
      'Isso foi futebol de time de colégio. Cadê o seu ego? Volte quando tiver uma arma de verdade.',
      'Você enxergou o gol e hesitou. Hesitação é o que separa os 299 do número 1.',
      goalsFor === goalsAgainst ? 'Empate? Empate é o resultado de quem não teve coragem de vencer.' : 'O placar não mente. Treine, evolua e volte para devorar eles.'
    ];
    const line = lines[(goalsFor + goalsAgainst * 3 + (ch?.chapterNumber || 0)) % lines.length];
    content.innerHTML = `
      <div class="cinematic-box defeat-box">
        <div class="cinematic-badge" style="background:#b91c1c; color:#fff">DERROTA</div>
        <div class="defeat-score">${goalsFor} <span>x</span> ${goalsAgainst}</div>
        <h3 style="color:#94a3b8">${ch?.title || ''}</h3>
        <p class="cinematic-desc"><strong style="color:#f8fafc">JINPACHI EGO:</strong> "${line}"</p>
        ${this.lastReportHtml || ''}
        <p class="defeat-reward">${forfeit ? 'Desistência: sem recompensa' : '+80 EgoCoins • +1 SP de experiência'}</p>
        <div class="dilemma-buttons">
          <button class="btn-dilemma shoot-choice" onclick="App.closeCinematicModal(); ${ch?.extraForOldSaves && this.isPastExtraChapter(ch) ? `App.playExtraChapter('${ch.id}')` : 'App.launchChapterMatch()'}">TENTAR DE NOVO ▶</button>
          <button class="btn-dilemma" onclick="App.closeCinematicModal(); App.switchTab('TREINO')">IR TREINAR</button>
        </div>
      </div>`;
    this.lastReportHtml = '';
    modal.classList.add('open');
  },

  // ==========================================================================
  // ABA 7: ESQUEMA DE TREINOS COM CUTSCENE + MINIGAME JOGÁVEL NO CAMPO SEMI-3D!
  // ==========================================================================
  renderTrainingTab() {
    const box = document.getElementById('training-drills-grid');
    if (!box) return;
    const max = window.TRAINING_ENERGY_MAX;
    const energy = this.state.trainingEnergy ?? max;
    const tired = energy <= 0;

    box.innerHTML = `
      <div class="training-energy ${tired ? 'empty' : ''}">
        <div class="energy-pips">${Array.from({ length: max }, (_, i) => `<i class="${i < energy ? 'on' : ''}"></i>`).join('')}</div>
        <div><b>ENERGIA DE TREINO: ${energy}/${max}</b><span>${tired ? 'Você está esgotado. Jogue uma partida da HISTÓRIA para recarregar.' : `Cada treino gasta 1. Jogar uma partida enche de novo (até ${max}).`}</span></div>
      </div>` + window.TRAINING_DRILLS.map(
      (dr) => `
      <div class="training-card">
        <div class="training-cat-badge">${dr.category}</div>
        <h3>${dr.name}</h3>
        <div class="training-mentor">Mentores: <strong>${dr.mentor}</strong></div>
        <p>${dr.desc}</p>
        <div class="training-gains">
          ${Object.entries(dr.statGains)
            .map(([k, v]) => `<span class="gain-pill">+${v} ${k.toUpperCase()}</span>`)
            .join('')}
          <span class="gain-pill gold">+${dr.spGain} SP</span>
          <span class="gain-pill cyan">+${dr.coinGain} EgoCoins</span>
        </div>
        <button class="btn-train-exec ${tired ? 'disabled' : ''}" onclick="App.executeTraining('${dr.id}')">
          ${tired ? '😮‍💨 SEM ENERGIA' : 'TREINAR ▶ (−1 ⚡)'}
        </button>
      </div>
    `
    ).join('');
  },

  executeTraining(drillId) {
    const dr = window.TRAINING_DRILLS.find((d) => d.id === drillId);
    if (!dr) return;
    // Treino não é infinito: gasta energia, que só volta jogando partidas
    const energy = this.state.trainingEnergy ?? window.TRAINING_ENERGY_MAX;
    if (energy <= 0) {
      this.notify('Sem energia de treino! Jogue uma partida da HISTÓRIA para recarregar.', '#ef4444');
      return;
    }
    this.state.trainingEnergy = energy - 1;
    this.saveState();
    this.renderTrainingTab();

    // 1. Mostra a Cutscene do Centro de Treinamento (idêntica às Imagens 1 e 2!)
    window.CutsceneEngine.play({
      locationTitle: 'BLUE LOCK  TRAINING CENTRE',
      crestTitle: 'TRAINING LAB',
      lines: [
        {
          speaker: dr.mentor.split('&')[0].trim().toUpperCase(),
          text: `"Dia de treino intensivo no ${dr.name}. Mostre em campo que você merece subir seu Overall!"`,
          mood: 'ego'
        },
        {
          speaker: this.state.profile.name.toUpperCase(),
          partnerSpeaker: dr.mentor.split('&')[0].trim(),
          text: `"Eu comecei do zero, mas vou destruir todos os alvos desse minigame agora mesmo!"`,
          mood: 'ego'
        }
      ],
      onComplete: () => {
        window.MatchEngine.startTrainingMinigame(dr, this.state);
      }
    });
  },

  onTrainingMinigameFinished(dr, scoreAchieved) {
    if (!dr) return;
    const mult = scoreAchieved >= 4 ? 1.25 : 1;

    Object.entries(dr.statGains).forEach(([k, v]) => {
      if (this.state.stats[k] !== undefined) {
        this.state.stats[k] += Math.max(1, Math.round(v * mult));
      }
    });
    const spEarned = Math.max(1, Math.round(dr.spGain * mult));
    const coinsEarned = Math.round(dr.coinGain * mult);
    this.state.currencies.skillPoints += spEarned;
    this.state.currencies.egoCoins += coinsEarned;

    if (dr.affinityGain) {
      this.state.selectedSquad.forEach((id) => {
        this.state.affinities[id] = Math.min(100, (this.state.affinities[id] || 50) + dr.affinityGain);
      });
    }

    this.saveState();
    this.renderAll();
    const newOvr = this.calculateOVR();
    this.showGachaModal(
      `MINIGAME DE TREINO CONCLUÍDO! (${scoreAchieved} Acertos)`,
      dr.name,
      `NOVO OVERALL: OVR ${newOvr}`,
      '#22c55e',
      `Seus atributos subiram no campo!<br>• <strong>+${spEarned} Pontos de Habilidade (SP)</strong><br>• <strong>+${coinsEarned} EgoCoins</strong><br>• <strong>Overall Atual: OVR ${newOvr}</strong>`
    );
  },

  // ==========================================================================
  // ABA 8 & 9: EQUIPE ATUAL DA HISTÓRIA & RELACIONAMENTOS (SEM ESCALAÇÃO MANUAL)
  // Os 66 personagens aparecem automaticamente nas fases da Lore e Partidas com OVR escalado ao seu nível!
  // ==========================================================================
  renderSquadAndRelationships() {
    const squadBox = document.getElementById('all-characters-grid');
    const relBox = document.getElementById('relationships-grid');
    const currentCh = this.getChapter() || window.CAREER_CHAPTERS[0];
    // No Torneio de Trios o time é o trio escolhido e o rival é o da rodada atual
    let mateIds = currentCh?.teammateIds || [];
    let oppIds = currentCh?.opponentIds || [];
    let oppName = currentCh?.opponentName;
    if (currentCh?.format === 'trio') {
      const trio = this.getActiveTrio(currentCh);
      const round = currentCh.trioRounds[trio ? trio.round : 0];
      mateIds = trio ? trio.mates : [];
      oppIds = round.opponentIds;
      oppName = `${round.rivalName} (${round.name})`;
    }

    const titleEl = document.getElementById('current-story-team-title');
    if (titleEl && currentCh) {
      titleEl.textContent = `👥 EQUIPE DA FASE ATUAL: ${currentCh.teamName || currentCh.era} vs ${oppName}`;
    }

    if (squadBox && currentCh) {
      const renderCharCard = (id, roleLabel, isOpp) => {
        const c = window.findCharacter(id) || window.BLUE_LOCK_CHARACTERS[0];
        const scaledOvr = this.getScaledCharOVR(c, isOpp);
        return `
          <div class="char-pixel-card" style="border-color:${c.auraColor}">
            <div class="char-card-header">
              <span class="pos-tag">${c.pos}</span>
              <span class="ovr-tag">OVR ${scaledOvr}</span>
              <span class="num-tag">#${c.number}</span>
            </div>
            <canvas class="char-sprite-cv" data-charid="${c.id}" width="72" height="72"></canvas>
            <h4>${c.name}</h4>
            <div class="char-team-tag">${roleLabel}</div>
            <div class="char-weapon-tag">⚡ ${c.weaponName}</div>
            <div class="char-chem-box">
              <strong>Combo na Partida:</strong> ${c.chemName}
            </div>
          </div>
        `;
      };

      squadBox.innerHTML = `
        <div class="panel-box">
          <h3 style="color:#00f5d4; margin-bottom:12px">★ SEU TIME NESTA FASE DA LORE (${currentCh.teamName || currentCh.era})</h3>
          <div class="characters-grid">
            ${mateIds.length
              ? mateIds.map((id) => renderCharCard(id, 'SEU COMPANHEIRO NA PARTIDA', false)).join('')
              : `<p style="color:#94a3b8">${currentCh.nelPhase !== undefined ? 'Você escolhe o seu clube da NEL ao apertar JOGAR.' : 'Você monta o seu trio ao apertar CONTINUAR.'}</p>`}
          </div>
        </div>
        <div class="panel-box">
          <h3 style="color:#ef4444; margin-bottom:12px">⚔️ TIME ADVERSÁRIO NESTA FASE (${oppName})</h3>
          <div class="characters-grid">
            ${oppIds.map((id) => renderCharCard(id, 'ADVERSÁRIO DA HISTÓRIA', true)).join('')}
          </div>
        </div>
      `;
    }

    if (relBox) {
      relBox.innerHTML = window.BLUE_LOCK_CHARACTERS.map((c) => {
        const aff = this.isMortalRival(c.id) ? 0 : this.state.affinities[c.id] ?? 50;
        const scaledOvr = this.getScaledCharOVR(c, false);
        return `
          <div class="rel-row-card" style="border-left: 4px solid ${c.auraColor}">
            <canvas class="char-sprite-cv" data-charid="${c.id}" width="56" height="56"></canvas>
            <div class="rel-info">
              <div class="rel-top">
                <strong>${c.name} (${c.pos} • OVR ${scaledOvr} • ${c.team})</strong>
                <span class="chem-pill" style="background:${c.auraColor}; color:#090d16">${this.isMortalRival(c.id) ? '🩸 RIVAL MORTAL • ' : ''}Química: ${aff}%</span>
              </div>
              <div class="rel-chem-title">🔥 Reação Química na Partida: <strong>${c.chemName}</strong> — ${c.chemBonus}</div>
              <div class="rel-quote">"${c.quote}"</div>
            </div>
          </div>
        `;
      }).join('');
    }

    setTimeout(() => {
      document.querySelectorAll('.char-sprite-cv').forEach((cv) => {
        const cid = cv.dataset.charid;
        const cData = window.findCharacter(cid);
        if (cData) {
          window.PixelRenderer.drawCharacterSprite(cv.getContext('2d'), cData, cv.width, cv.height, {
            facing: 'front',
            frame: 4
          });
        }
      });
    }, 20);
  },

  toggleSquadMember(charId) {
    if (this.state.selectedSquad.includes(charId)) {
      this.state.selectedSquad = this.state.selectedSquad.filter((id) => id !== charId);
    } else {
      if (this.state.selectedSquad.length >= 4) {
        this.state.selectedSquad.shift();
      }
      this.state.selectedSquad.push(charId);
    }
    // Atualiza também os companheiros do capítulo atual para você jogar com eles!
    const ch = window.CAREER_CHAPTERS[this.state.currentChapterIndex];
    if (ch) {
      ch.teammateIds = [...this.state.selectedSquad];
    }
    this.saveState();
    this.renderSquadAndRelationships();
    const c = window.BLUE_LOCK_CHARACTERS.find((x) => x.id === charId);
    if (c) this.notify(`${c.name} atualizado nos seus titulares!`, c.auraColor);
  },

  trainWithPartner(charId) {
    const c = window.BLUE_LOCK_CHARACTERS.find((x) => x.id === charId);
    if (!c) return;
    if (this.isMortalRival(charId)) {
      this.notify('"Treinar com você? Eu prefiro morrer." — O Rin é o seu rival mortal: Química 0%.', '#22d3ee');
      return;
    }
    this.state.affinities[charId] = Math.min(100, (this.state.affinities[charId] || 50) + 20);
    this.state.stats.ego += 4;
    this.state.stats.visao += 4;
    this.saveState();
    this.renderAll();
    this.notify(`Reação Química com ${c.name} subiu para ${this.state.affinities[charId]}%! (${c.chemName})`, c.auraColor);
  },

  // ==========================================================================
  // ABA 10: CONQUISTAS & OBJECTIVES
  // ==========================================================================
  renderAchievementsAndObjectives() {
    const achBox = document.getElementById('achievements-grid');
    const objBox = document.getElementById('objectives-grid');

    const bar = (cur, goal, color) =>
      `<div class="ach-progress"><i style="width:${Math.min(100, (cur / goal) * 100)}%; background:${color}"></i><span>${Math.min(cur, goal)} / ${goal}</span></div>`;

    if (achBox) {
      const all = window.ACHIEVEMENTS_DB;
      const got = all.filter((a) => this.state.unlockedAchievements.includes(a.id));
      const earned = got.reduce((s, a) => s + a.rewardCoins, 0);
      const c = this.state.career;
      const played = c.wins + c.draws + c.losses;
      const stat = (label, value) => `<div class="career-stat"><b>${value}</b><span>${label}</span></div>`;
      // Desbloqueadas primeiro; entre as bloqueadas, as mais perto de sair primeiro
      const pct = (a) => {
        if (!a.progress) return 0;
        const [cur, goal] = a.progress(this.state, this);
        return cur / goal;
      };
      const sorted = all.slice().sort((a, b) => {
        const ua = this.state.unlockedAchievements.includes(a.id);
        const ub = this.state.unlockedAchievements.includes(b.id);
        if (ua !== ub) return ua ? -1 : 1;
        return pct(b) - pct(a);
      });
      achBox.innerHTML = `
        <div class="career-panel">
          <h3>📊 SUA CARREIRA</h3>
          <div class="career-stats">
            ${stat('Partidas', played)}
            ${stat('Vitórias', c.wins)}
            ${stat('Empates', c.draws)}
            ${stat('Derrotas', c.losses)}
            ${stat('Seus gols', c.myGoals)}
            ${stat('No ângulo', c.angleGoals)}
            ${stat('De longe', c.longGoals)}
            ${stat('Hat-tricks', c.hatTricks)}
            ${stat('Dribles', c.dribbles)}
            ${stat('Desarmes', c.steals)}
            ${stat('Melhor nota', c.bestRating ? c.bestRating.toFixed(1) : '—')}
          </div>
        </div>
        <div class="ach-summary">🏆 <b>${got.length} de ${all.length}</b> conquistas • ${earned} EgoCoins ganhos com elas</div>
        ${sorted
          .map((ach) => {
            const unlocked = this.state.unlockedAchievements.includes(ach.id);
            const prog = !unlocked && ach.progress ? ach.progress(this.state, this) : null;
            return `
              <div class="ach-card ${unlocked ? 'unlocked' : ''}">
                <div class="ach-icon">${unlocked ? '🏆' : '🔒'}</div>
                <div class="ach-body">
                  <h4>${ach.title}</h4>
                  <p>${ach.desc}</p>
                  ${prog ? bar(prog[0], prog[1], '#38bdf8') : ''}
                  <span class="ach-reward">Recompensa: +${ach.rewardCoins} EgoCoins${ach.rewardSpins ? ` & +${ach.rewardSpins} Giro${ach.rewardSpins > 1 ? 's' : ''}` : ''}</span>
                </div>
              </div>`;
          })
          .join('')}`;
    }

    if (objBox) {
      const ovr = this.calculateOVR();
      const done = (id) => this.state.completedChapters.includes(id);
      const objectives = [
        { icon: '⚽', title: 'Sobreviver à Final do Ensino Médio e entrar no Blue Lock', desc: 'Decida se passa para o seu amigo ou chuta no Prólogo. Libera a roleta de Arma e Fluxo.', ok: this.state.blueLockEntered },
        { icon: '🔒', title: 'Sobreviver à 1ª Seleção', desc: 'Vença o Time V do Nagi e do Reo com o Time Z.', ok: done('ch2_first_selection_v') },
        { icon: '🛡️', title: 'Passar pela 2ª e 3ª Seleção', desc: 'Encare os World Five e vença o Torneio de Trios.', ok: done('ch4b_trio_tournament') },
        { icon: '👑', title: 'Vencer a Sub-20 do Japão', desc: 'Salve o Blue Lock e libere a Liga Neo Egoísta, o 2º slot de Arma e Fluxo e o Metavision / Predator Eye.', ok: this.state.nelUnlocked },
        { icon: '🃏', title: 'Encarar o Wild Card', desc: 'O Kunigami volta da porta preta sem sorriso. Jogue contra o Coringa antes da NEL.', ok: done('ch5b_wild_card') },
        { icon: '💴', title: 'Sobreviver à Liga Neo Egoísta', desc: 'Jogue os 8 jogos da NEL e termine entre os 23 mais valiosos para ir à Copa.', ok: done('ch7_nel_ubers_pxg') },
        { icon: '🦁', title: 'Vencer a Inglaterra na Copa Sub-20', desc: 'Derrote Agi, Teddy Knight e Chris Prince.', ok: done('ch8_u20_england') },
        { icon: '🌍', title: '"4 EGOS": campeão da Copa do Mundo Sub-20', desc: 'Vença a França de Loki e Hugo na final.', ok: done('ch9_world_cup_final') },
        { icon: '🦊', title: 'Passar no teste do Fox', desc: 'Acorde o monstro e vire o jogo contra o Rin, o Kaiser, o Barou e o Shidou.', ok: done('ch10_fox_training') },
        { icon: '🥇', title: 'Disputar a Bola de Ouro', desc: 'Escolha uma proposta e jogue a temporada inteira da Liga Europeia.', ok: done('ch12_pro_season_2') },
        { icon: '🇯🇵', title: 'Ganhar a vaga na seleção principal', desc: 'Seja convocado pelo Ego e vença os amistosos contra Portugal e Coreia do Sul.', ok: done('ch12b_wc_camp') },
        { icon: '🏆', title: 'Campeão da Copa do Mundo', desc: 'Passe da fase de grupos e vença os 5 jogos de mata-mata, até a França de Noel Noa.', ok: done('ch13_world_cup') },
        { icon: '🩸', title: 'O último duelo', desc: 'Vença o Rin Itoshi pelo número 1 do Blue Lock e receba a Bola de Ouro.', ok: done('ch14_rin_final') }
      ];
      const next = objectives.findIndex((o) => !o.ok);
      objBox.innerHTML = `
        ${objectives
          .map((o, i) => `
            <div class="ach-card objective ${o.ok ? 'unlocked' : i === next ? 'current' : ''}">
              <div class="ach-icon">${o.ok ? '✅' : o.icon}</div>
              <div class="ach-body">
                <h4>${i === next ? '<span class="obj-now">▶ AGORA</span> ' : ''}${o.title}</h4>
                <p>${o.desc}</p>
              </div>
            </div>`)
          .join('')}
        <div class="ach-card objective ${ovr >= 95 ? 'unlocked' : ''}">
          <div class="ach-icon">${ovr >= 95 ? '✅' : '📈'}</div>
          <div class="ach-body">
            <h4>Objetivo paralelo: virar World Class (OVR 95)</h4>
            <p>Treine, distribua SP na aba ATRIBUTOS e gire Armas e Fluxos melhores. Hoje: OVR ${ovr} (${this.getRankLetter(ovr).label}).</p>
            ${ovr < 95 ? bar(ovr, 95, '#00f5d4') : ''}
          </div>
        </div>`;
    }
  },

  unlockAchievement(achId) {
    if (this.flowLabActive) return; // nada do Laboratório de Fluxos conta
    if (this.state.unlockedAchievements.includes(achId)) return;
    const ach = window.ACHIEVEMENTS_DB.find((a) => a.id === achId);
    if (!ach) return;
    this.state.unlockedAchievements.push(achId);
    this.state.currencies.egoCoins += ach.rewardCoins;
    this.state.currencies.spins += ach.rewardSpins;
    this.saveState();
    this.notify(`🏆 CONQUISTA DESBLOQUEADA: ${ach.title} (+${ach.rewardCoins} EgoCoins)!`, '#facc15');
  },

  showGachaModal(header, itemTitle, rarityName, color, descHtml) {
    const modal = document.getElementById('cinematic-modal');
    const content = document.getElementById('cinematic-modal-content');
    if (!modal || !content) return;
    content.innerHTML = `
      <div class="cinematic-box" style="border-color:${color}; box-shadow: 0 0 35px ${color}">
        <div class="cinematic-badge" style="background:${color}; color:#090d16">${rarityName}</div>
        <h3 style="color:#94a3b8; margin-top:8px">${header}</h3>
        <h1 style="color:${color}; font-size:28px; margin:8px 0">${itemTitle}</h1>
        ${this.lastReportHtml || ''}
        <p class="cinematic-desc">${descHtml}</p>
        <button class="btn-dilemma shoot-choice" onclick="App.closeCinematicModal()">CONTINUAR ▶</button>
      </div>
    `;
    this.lastReportHtml = '';
    modal.classList.add('open');
    window.SFX?.jingle([523, 659, 784, 1047, 1319]);
  },

  notify(msg, color = '#38bdf8') {
    const toast = document.getElementById('ego-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.borderColor = color;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 3800);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});

