// ============================================================================
// BLUE LOCK: EGOIST CAREER - MOTOR SEMI-3D COLOSSAL + MAPAS DINÂMICOS DA LORE
// • Campo Colossal (3300 x 880 em coordenadas 3D) com Câmera 2D (X e Y) + Radar
// • Mapas/Estádios que mudam visualmente a cada fase da Lore!
// • Controles: WASD (Mover), SHIFT (Correr, gasta Resistência), Mouse Esq (Chutar),
//   R (Pedir a Bola), F (Dar Carrinho), 1/2/3 (Skills Arma), G (Ativar Fluxo), C (Reação Química)
// • Roteiro da Lore (chapter.script): gols garantidos com cutscene + placar do clímax
// ============================================================================

window.MatchEngine = {
  active: false,
  paused: false,
  mode: 'match',
  currentDrill: null,
  trainingScore: 0,
  trainingTargetScore: 5,
  trainingTargets: [],
  canvas: null,
  ctx: null,
  chapter: null,
  frame: 0,
  timeLeft: 90,
  lastTimerTick: 0,
  scoreHome: 0,
  scoreAway: 0,
  keys: {},
  mouse: { x: 640, y: 325, down: false, charge: 0 },
  netShakeTimer: 0,
  slideCooldown: 0,
  dribbleCooldown: 0,
  dribbleInvulnTimer: 0,
  dribbleChain: 0, // Dribles seguidos em pouco tempo perdem eficácia (anti-spam)
  dribbleChainTimer: 0,
  callPassRequested: false,

  // Resistência (0-100): SHIFT corre gastando fôlego; zerou = cansado até recuperar 30
  stamina: 100,
  exhausted: false,

  // Roteiro da lore (gols garantidos + placar do clímax), vem de chapter.script
  scriptBusy: false,
  climaxDone: false,
  climaxTimer: 0,

  // CAMPO COLOSSAL (Quase 4x maior que o inicial!)
  PITCH_HALF_X: 1650, // Comprimento total: 3300 (-1650 até +1650)
  PITCH_HALF_Y: 420,  // Largura total: 840 (-420 até +420)
  GOAL_HEIGHT: 108,
  GOAL_HALF_WIDTH: 102,

  camera: {
    x: 0,
    y: 0,
    cutsceneMode: false,
    bannerText: '',
    bannerSub: '',
    bannerColor: '#00f5d4',
    bannerTimer: 0
  },

  prologueChoiceTriggered: false,
  midLoreTriggered: false,
  skillCooldowns: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 },
  flowState: { active: false, timer: 0, charge: 0 },
  chemCharge: 0,
  particles: [],
  trailPoints: [],
  entities: [],
  ball: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, owner: null, curve: 0, color: '#ffffff' },
  goalPause: 0,
  hitStop: 0,
  replay: null,
  matchStats: { goals: 0, angleGoals: 0, longGoals: 0, shots: 0, onTarget: 0, skills: 0, steals: 0, dribbles: 0, passes: 0, sprintFrames: 0, conceded: 0 },

  openFullscreenOverlay() {
    const ov = document.getElementById('fullscreen-match-overlay');
    if (ov) ov.classList.add('open');
    this.resizeCanvasToFullscreen();
  },

  closeFullscreenOverlay() {
    this.active = false;
    this.replay = null;
    this.goalPause = 0;
    this.pauseOpen = false;
    this.paused = false;
    this.tutorial = null;
    document.getElementById('pause-overlay')?.classList.remove('open');
    document.getElementById('tutorial-panel')?.classList.remove('open');
    window.SFX?.stopCrowd();
    const ov = document.getElementById('fullscreen-match-overlay');
    if (ov) ov.classList.remove('open');
  },

  // ==========================================================================
  // MENU DE PAUSA (ESC / P / botão PAUSA): continuar, som, controles e desistir.
  // Desistir conta como derrota por W.O. (0 x 3) — antes o ✖ SAIR fechava a partida
  // sem resultado e dava para fugir de uma derrota na liga.
  // ==========================================================================
  openPauseMenu() {
    if (!this.active || this.pauseOpen || this.paused) return;
    if (window.CutsceneEngine?.active || window.CutsceneEngine?.sakugaActive) return;
    this.paused = true;
    this.pauseOpen = true;
    this.keys = {};
    this.mouse.down = false;
    window.SFX?.click();
    const box = document.getElementById('pause-overlay');
    if (!box) return;
    const training = this.mode === 'training';
    // No Prólogo a escolha do passe ainda vai acontecer: sair não pode concluir o capítulo
    const prologue = this.chapter?.id === 'ch0_prologue';
    const league = !!this.chapter?.leagueMatch;
    const st = this.playerState || {};
    const keys = [
      ['WASD', 'Mover'],
      ['SHIFT', 'Correr (gasta fôlego)'],
      ['MOUSE ESQ.', 'Chutar (segure = mais forte)'],
      ['Q / E', 'Chute com curva (segure ao soltar)'],
      ['MOUSE DIR.', 'Passe (vai para quem está perto da mira)'],
      ['ESPAÇO', 'Drible'],
      ['F', 'Carrinho / roubar a bola'],
      ['R', 'Pedir a bola'],
      ['1 2 3', `Skills da Arma${st.nelUnlocked ? ' (4 5 6 = 2ª Arma)' : ''}`],
      ['G', 'Fluxo (barra cheia)'],
      ['C', 'Reação Química (com a bola, dentro da área)'],
      ...(this.passive('copy') ? [['V', 'Usar a skill copiada (Camaleão)']] : []),
      ['ESC / P', 'Pausar']
    ];
    const passives = [st.equippedWeapon, st.nelUnlocked ? st.equippedWeapon2 : null]
      .map((w) => window.getWeaponPassive?.(w))
      .filter(Boolean);
    if (this.ambidextrousBonus('accBonus')) {
      passives.unshift({ name: 'Ambidestro', desc: `Sem perna ruim: +${window.AMBIDEXTROUS.accBonus}% de acerto no chute e +${window.AMBIDEXTROUS.dribbleBonus}% no drible.` });
    }
    const lab = !!this.chapter?.flowLab;
    const quitLabel = lab ? 'SAIR DO LABORATÓRIO' : training ? 'SAIR DO TREINO' : prologue ? 'SAIR DA PARTIDA' : 'DESISTIR (DERROTA 0 x 3)';
    const quitNote = lab
      ? 'Volta para a aba FLUXO. Nada do laboratório conta.'
      : training || prologue
      ? 'Você volta ao menu sem resultado.'
      : league
      ? 'Na liga a desistência conta na tabela como derrota por W.O.'
      : 'Conta como derrota: você pode tentar o capítulo de novo.';
    box.innerHTML = `
      <div class="pause-box">
        <div class="pause-title">⏸ PAUSADO</div>
        <div class="pause-score">${this.chapter?.scoreLabels?.home || 'VOCÊ'} ${this.scoreHome} x ${this.scoreAway} ${this.chapter?.scoreLabels?.away || 'RIVAL'} • ${Math.floor(this.timeLeft / 60)}:${String(this.timeLeft % 60).padStart(2, '0')}</div>
        <div class="pause-buttons">
          <button class="pause-btn primary" onclick="MatchEngine.closePauseMenu()">▶ CONTINUAR</button>
          <button class="pause-btn js-mute-btn" onclick="SFX.toggleMute()">🔊 SOM</button>
          <button class="pause-btn danger" onclick="MatchEngine.forfeitMatch()">🏳 ${quitLabel}</button>
        </div>
        <div class="pause-note">${quitNote}</div>
        <div class="pause-grid">
          <div>
            <h4>CONTROLES</h4>
            ${keys.map(([k, d]) => `<div class="pause-key"><kbd>${k}</kbd><span>${d}</span></div>`).join('')}
          </div>
          <div>
            <h4>SUAS PASSIVAS</h4>
            ${passives.length
              ? passives.map((p) => `<div class="pause-passive"><b>${p.name}</b><span>${p.desc || window.describePassive(p)}</span></div>`).join('')
              : '<div class="pause-passive"><span>Nenhuma arma equipada.</span></div>'}
          </div>
        </div>
      </div>`;
    window.SFX?.updateButtons?.();
    box.classList.add('open');
  },

  closePauseMenu() {
    if (!this.pauseOpen) return;
    this.pauseOpen = false;
    this.paused = false;
    // O relógio volta a contar a partir de agora (senão descontava o tempo pausado)
    this.lastTimerTick = performance.now();
    document.getElementById('pause-overlay')?.classList.remove('open');
  },

  forfeitMatch() {
    const training = this.mode === 'training';
    const prologue = this.chapter?.id === 'ch0_prologue';
    document.getElementById('pause-overlay')?.classList.remove('open');
    this.pauseOpen = false;
    this.paused = false;
    if (training || prologue) {
      this.closeFullscreenOverlay();
      return;
    }
    // Laboratório: sai com o placar como estava
    if (this.chapter?.flowLab) {
      this.finishMatch();
      return;
    }
    this.scoreHome = 0;
    this.scoreAway = Math.max(3, this.scoreAway);
    this.rate(-1, 'DESISTIU');
    this.climaxTimer = 0;
    // Desistência: derrota sem prêmio e sem avançar a história (App.onMatchFinished)
    this.forfeited = true;
    this.finishMatch();
  },

  resizeCanvasToFullscreen() {
    if (!this.canvas) return;
    // Celular: o tamanho da caixa do campo (com o celular em pé a partida é desenhada
    // deitada, girada, e a largura e a altura da tela trocam de lugar — js/mobile.js)
    const w = (window.IS_TOUCH && this.canvas.offsetWidth) || window.innerWidth || 1366;
    const h = (window.IS_TOUCH && this.canvas.offsetHeight) || window.innerHeight || 768;
    // Celular (tela baixa): o campo é desenhado numa resolução maior e encolhido pelo CSS
    // para caber o mesmo campo/HUD do PC em vez de tudo gigante
    const k = window.IS_TOUCH ? Math.max(1, Math.min(2.2, 700 / h)) : 1;
    // VW x VH = tamanho "lógico" (todo o desenho e a mira usam ele). O canvas de verdade
    // pode ser menor (this.res < 1) em celular que não aguenta: o draw() encolhe tudo
    // com setTransform, então o campo e o HUD ficam iguais, só com menos pixels
    this.VW = Math.round(w * k);
    this.VH = Math.round(h * k);
    const res = this.res || 1;
    this.canvas.width = Math.round(this.VW * res);
    this.canvas.height = Math.round(this.VH * res);
  },

  // Resolução automática (celular E PC): mede o tempo entre quadros e, se a média de ~2,5 s
  // ficar abaixo de ~40 fps, baixa a resolução do canvas um degrau (até 0,67). Só desce,
  // nunca sobe (não fica oscilando); vale até fechar o jogo. (No PC o canvas era sempre a
  // janela inteira em 1x: com placa de vídeo fraca e tela grande não tinha para onde recuar)
  noteFrameTime(dt) {
    if (!this.active || this.replay || (this.frame || 0) < 240) return;
    this._ftAcc = (this._ftAcc || 0) + dt;
    this._ftN = (this._ftN || 0) + 1;
    if (this._ftAcc < 2500) return;
    const avg = this._ftAcc / this._ftN;
    this._ftAcc = 0;
    this._ftN = 0;
    const res = this.res || 1;
    if (avg > 25 && res > 0.7) {
      this.res = Math.max(0.67, +(res - 0.17).toFixed(2));
      this.resizeCanvasToFullscreen();
      this._lightKey = null;
    }
  },

  // Projeta coordenada 3D (wx, wy, wz) ocupando 100% da Tela Toda (Fullscreen)
  project3D(wx, wy, wz = 0) {
    const W = this.VW || (this.canvas ? this.canvas.width : 1366);
    const H = this.VH || (this.canvas ? this.canvas.height : 768);
    const horizonY = Math.round(H * 0.21);
    const pitchH = H - horizonY - 24;
    const relY = wy - this.camera.y * 0.35;
    const viewHalfY = 350;
    const t = (relY + viewHalfY) / (viewHalfY * 2);
    const scale = Math.max(0.55, Math.min(1.42, 0.74 + t * 0.5));
    const relX = wx - this.camera.x;
    const screenX = W / 2 + relX * scale * 0.96;
    const groundY = horizonY + t * pitchH;
    const screenY = groundY - wz * scale;
    return { sx: screenX, sy: screenY, groundY, scale };
  },

  // A mesma conta do project3D, mas sem criar um objeto por ponto: a rede, a arquibancada e
  // as linhas do campo projetam centenas de pontos por quadro e isso virava ~170 KB de lixo
  // por quadro (a coleta de lixo travava a partida de tempos em tempos, pior no celular).
  // Uso: const P = this.projector(); const x = P.x(wx, wy, wz); depois P.y (y na tela),
  // P.g (chão) e P.s (escala) — leia antes de projetar o próximo ponto
  projector() {
    let P = this._proj;
    if (!P) {
      P = this._proj = { W2: 0, hY: 0, pH: 0, cx: 0, cy: 0, y: 0, g: 0, s: 0, x: null };
      P.x = (wx, wy, wz) => {
        const t = (wy - P.cy + 350) / 700;
        const s = Math.max(0.55, Math.min(1.42, 0.74 + t * 0.5));
        P.s = s;
        P.g = P.hY + t * P.pH;
        P.y = P.g - wz * s;
        return P.W2 + (wx - P.cx) * s * 0.96;
      };
    }
    const W = this.VW || (this.canvas ? this.canvas.width : 1366);
    const H = this.VH || (this.canvas ? this.canvas.height : 768);
    P.W2 = W / 2;
    P.hY = Math.round(H * 0.21);
    P.pH = H - P.hY - 24;
    P.cx = this.camera.x;
    P.cy = this.camera.y * 0.35;
    return P;
  },

  screenToWorld(sx, sy) {
    // Modo Dupla: a mira do parceiro já chega em coordenadas do campo
    if (this._aimOverride) return this._aimOverride;
    const W = this.VW || (this.canvas ? this.canvas.width : 1366);
    const H = this.VH || (this.canvas ? this.canvas.height : 768);
    const horizonY = Math.round(H * 0.21);
    const pitchH = H - horizonY - 24;
    const viewHalfY = 350;
    const t = Math.max(-0.2, Math.min(1.2, (sy - horizonY) / pitchH));
    const relY = t * (viewHalfY * 2) - viewHalfY;
    const wy = relY + this.camera.y * 0.35;
    const scale = Math.max(0.55, Math.min(1.42, 0.74 + t * 0.5));
    const wx = this.camera.x + (sx - W / 2) / (scale * 0.96);
    return { wx, wy };
  },

  // Números pelo código físico da tecla: com SHIFT apertado o e.key do "1" vira "!"
  keyName(e) {
    return e.code && e.code.startsWith('Digit') ? e.code.slice(5) : e.key.toLowerCase();
  },

  init(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.resizeCanvasToFullscreen();

    window.addEventListener('resize', () => {
      if (this.active) this.resizeCanvasToFullscreen();
    });

    window.addEventListener('keydown', (e) => {
      // Se estiver na Animação Sakuga do Anime/Mangá, permite trocar de ângulo ou avançar!
      // (tecla segurada repete o keydown: não conta, senão segurar ESPAÇO pulava a cena
      // inteira; 1-5 só trocam de ângulo nas animações antigas que mostram esses botões —
      // antes as teclas de skill reiniciavam ou pulavam qualquer cena)
      const CE = window.CutsceneEngine;
      // Movimento apertado durante uma cena/diálogo fica valendo quando a partida volta
      // (antes era preciso soltar e apertar de novo; o keyup sempre limpa)
      if ((CE?.sakugaActive || CE?.active) && ['w', 'a', 's', 'd', 'shift'].includes(this.keyName(e))) this.keys[this.keyName(e)] = true;
      if (CE?.sakugaActive) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (!e.repeat) CE.nextSakugaAngle();
        } else if (['1', '2', '3', '4', '5'].includes(e.key) && !CE.CINE?.[CE.sakugaType] && document.getElementById('sakuga-angle-buttons')?.style.visibility === 'visible') {
          CE.setSakugaAngle(parseInt(e.key, 10) - 1);
        }
        return;
      }

      // Diálogo aberto: ESPAÇO/ENTER completam a fala que está sendo escrita ou avançam
      if (CE?.active) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (!e.repeat) CE.next();
        }
        return;
      }

      if (!this.active) return;
      const k = this.keyName(e);
      // ESC / P: abre e fecha o menu de pausa
      if (k === 'escape' || k === 'p') {
        e.preventDefault();
        if (this.pauseOpen) this.closePauseMenu();
        else this.openPauseMenu();
        return;
      }
      if (this.pauseOpen) return;
      if (this.tutorial && k === 'enter') {
        e.preventDefault();
        this.endTutorial(true);
        return;
      }
      this.keys[k] = true;

      // Comemoração/replay do gol: nada de ação; ESPAÇO/ENTER pulam o replay
      if (this.replay || this.goalPause > 0) {
        if (this.replay && (k === ' ' || k === 'enter')) {
          e.preventDefault();
          this.endReplay();
        }
        return;
      }

      if (!this.paused && !this.camera.cutsceneMode) {
        if (['1', '2', '3', '4', '5', '6'].includes(k) || (k === 'v' && this.passive('copy'))) {
          e.preventDefault();
          this.useWeaponSkill(k);
        } else if (k === ' ') {
          e.preventDefault();
          this.dribbleMove(); // BARRA DE ESPAÇO = DRIBLAR!
        } else if (k === 'f') {
          e.preventDefault();
          this.slideTackle(); // TECLA F = DAR CARRINHO!
        } else if (k === 'r') {
          e.preventDefault();
          this.callForPass(); // TECLA R = PEDIR A BOLA!
        } else if (k === 'g') {
          e.preventDefault();
          this.activateFlow(); // TECLA G = ATIVAR FLUXO!
        } else if (k === 'c') {
          e.preventDefault();
          this.triggerChemicalReaction();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[this.keyName(e)] = false;
    });
    // Trocar de janela com o SHIFT apertado não pode deixar o jogador correndo sozinho
    window.addEventListener('blur', () => {
      this.keys = {};
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - rect.left) * ((this.VW || this.canvas.width) / rect.width);
      this.mouse.y = (e.clientY - rect.top) * ((this.VH || this.canvas.height) / rect.height);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.active || this.paused || this.camera.cutsceneMode) return;
      if (this.replay) {
        this.endReplay();
        return;
      }
      if (this.goalPause > 0) return;
      if (e.button === 0) {
        // BOTÃO ESQUERDO DO MOUSE = CHUTAR!
        this.mouse.down = true;
        this.mouse.charge = 12;
        if (this.ball.owner === this.playerEntity) {
          this.playerEntity.animState = 'windup';
          this.playerEntity.animTimer = 25;
        }
      } else if (e.button === 2) {
        // BOTÃO DIREITO DO MOUSE = DAR PASSE!
        e.preventDefault();
        this.passBall();
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (!this.active) return;
      if (e.button === 0 && this.mouse.down) {
        this.mouse.down = false;
        this.shootTowardMouse(this.mouse.charge);
        this.mouse.charge = 0;
      }
    });
    // Soltou o botão fora do campo (ex: em cima de uma cena que abriu no meio da partida):
    // cancela a carga em vez de deixar o chute preso até o próximo clique
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0 && e.target !== this.canvas) {
        this.mouse.down = false;
        this.mouse.charge = 0;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  startMatch(chapter, playerState) {
    this.openFullscreenOverlay();
    this.mode = 'match';
    this.currentDrill = null;
    this.chapter = chapter;
    this.playerState = playerState;
    this.active = true;
    this.paused = false;
    this.frame = 0;
    this.timeLeft = this.matchTime(chapter.matchDuration || 100);
    this.lastTimerTick = performance.now();
    this.scoreHome = 0;
    this.scoreAway = 0;
    this.prologueChoiceTriggered = false;
    this.midLoreTriggered = false;
    this.slideCooldown = 0;
    this.dribbleCooldown = 0;
    this.dribbleInvulnTimer = 0;
    this.dribbleChain = 0;
    this.dribbleChainTimer = 0;
    this.callPassRequested = false;
    this.callCooldown = 0;
    this.bubbles = [];
    this.stamina = 100;
    this.exhausted = false;
    this.scriptBusy = false;
    this.climaxDone = false;
    this.climaxTimer = 0;
    this.matchDone = false;
    this._scriptSaves = 0;
    this.scriptBonusDone = {};
    this.chemHintFrame = -999;
    this.mouse.down = false;
    this.mouse.charge = 0;
    this.firstGoalSakugaDone = false;
    this.oneTwo = null;
    // Gol: comemoração, replay e a nota da partida
    this.goalPause = 0;
    this.hitStop = 0;
    this.special = null;
    this.shakeMag = 0;
    this.flashAlpha = 0;
    this.goalFx = null;
    this.replay = null;
    this.replayBuf = [];
    this.pendingKickoff = null;
    this.finishAfterReplay = false;
    this.skipReplayOnce = false;
    this.lastReport = null;
    this.rating = 6;
    this.popTexts = [];
    this.dribbleFx = [];
    const ratingEl = document.getElementById('match-rating-display');
    if (ratingEl) {
      ratingEl.textContent = '6.0';
      ratingEl.style.color = this.ratingColor(6);
    }
    this.matchStats = { goals: 0, angleGoals: 0, longGoals: 0, shots: 0, onTarget: 0, skills: 0, steals: 0, dribbles: 0, passes: 0, sprintFrames: 0, conceded: 0 };
    window.SFX?.whistle(2);
    window.SFX?.startCrowd();
    this.skillCooldowns = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, v: 0 };
    this.pauseOpen = false;
    this.passives = this.computePassives();
    this.copiedSkill = null;
    this.flashbackDone = false;
    // O monstro do Fox (checkMonster): desperta uma vez por jogo
    this.monster = { used: false, timer: 0 };
    this.totalTime = this.timeLeft;
    // O Fluxo começa vazio e só ativa com a barra cheia (antes começava com 50% e já dava pra usar)
    this.flowState = { active: false, timer: 0, charge: 0, readyShown: false };
    this.flowFx = null;
    this.revengeTimer = 0;
    // Time pilhado pelo discurso (chapter.hype): a Química começa cheia
    this.chemCharge = chapter.id === 'ch0_prologue' ? 0 : chapter.hype ? 100 : 0;
    this.particles = [];
    this.trailPoints = [];
    this.trainingTargets = [];

    this.setupEntities();
    this.resetPositions('home');
    this.updateHUD();
    this.showBanner(
      `⚽ ${chapter.era}: ${chapter.title.toUpperCase()}`,
      'WASD: Mover | SHIFT: Correr | ESPAÇO: Driblar | BOTÃO DIREITO: Passe | BOTÃO ESQUERDO: Chutar (+Q/E: com curva) | F: Carrinho | R: Pedir Bola',
      '#00f5d4',
      130
    );
    this.startTutorialIfNeeded();
  },

  // ==========================================================================
  // TUTORIAL: na 1ª partida da carreira (Prólogo) ensina o básico; na 1ª partida
  // dentro do Blue Lock ensina skills, Fluxo e Reação Química. Enquanto ele roda o
  // relógio não anda, os rivais ficam parados e o que acontecer não conta. Cada
  // passo termina quando você faz a ação. Dá para pular (ENTER ou o botão).
  // ==========================================================================
  TUTORIAL_STEPS: {
    basic: [
      { key: 'W A S D', text: 'Ande pelo campo com <b>W A S D</b>.', done: (me) => me.tut.moved > 180 },
      { key: 'SHIFT', text: 'Segure <b>SHIFT</b> enquanto anda para correr. Correr gasta o fôlego (barra verde lá em cima).', done: (me) => me.matchStats.sprintFrames > 45 },
      { key: 'BOTÃO DIREITO', text: 'Com a bola, aponte o mouse para um companheiro e clique com o <b>botão direito</b> para tocar.', needBall: true, done: (me) => me.matchStats.passes > me.tut.base.passes },
      { key: 'R', text: 'Peça a bola de volta apertando <b>R</b>.', done: (me) => me.ball.owner === me.playerEntity },
      { key: 'ESPAÇO', text: 'Aperte <b>ESPAÇO</b> para driblar na direção do mouse (ou do WASD). Driblar várias vezes seguidas diminui a chance.', needBall: true, done: (me) => me.tut.dribbled },
      { key: 'BOTÃO ESQUERDO', text: 'Mire no gol, <b>segure o botão esquerdo</b> para carregar e solte para chutar. Segurando <b>Q</b> ou <b>E</b> ao soltar, o chute sai com curva.', needBall: true, done: (me) => me.matchStats.shots > me.tut.base.shots }
    ],
    advanced: [
      { key: '1 2 3', text: 'Use uma skill da sua Arma com <b>1</b>, <b>2</b> ou <b>3</b> (chute e passe especial precisam da bola). Elas recarregam sozinhas.', needBall: true, skipIf: (me) => !me.playerState.equippedWeapon, done: (me) => me.matchStats.skills > me.tut.base.skills },
      { key: 'G', text: 'A barra de <b>FLUXO</b> encheu: aperte <b>G</b> para entrar no Fluxo (a passiva do seu Fluxo vale por alguns segundos).', skipIf: (me) => !me.playerState.equippedFlow, setup: (me) => (me.flowState.charge = 100), done: (me) => me.flowState.active },
      { key: 'C', text: 'Leve a bola até a <b>grande área rival</b> (ela brilha em rosa) e aperte <b>C</b> para a <b>Reação Química</b>: uma tabela com o parceiro que tem mais química com você.', needBall: true, setup: (me) => (me.chemCharge = 100), done: (me) => me.chemCharge < 60 },
      { key: 'ESC', text: 'Esqueceu algum botão? <b>ESC</b> pausa e mostra todos os controles. Agora é pra valer!', done: (me) => me.tut.stepFrames > 240 }
    ]
  },

  startTutorialIfNeeded() {
    this.tutorial = null;
    const t = window.App?.state?.tutorial;
    if (this.mode !== 'match' || !t || this.chapter.flowLab || this.duo) return;
    const prologue = this.chapter.id === 'ch0_prologue';
    const kind = prologue && !t.basic ? 'basic' : !prologue && !t.advanced ? 'advanced' : null;
    if (!kind) return;
    this.tutorial = kind;
    this.tut = { step: -1, moved: 0, dribbled: false, stepFrames: 0, lastX: this.playerEntity.x, lastY: this.playerEntity.y, base: {} };
    this.nextTutorialStep();
  },

  nextTutorialStep() {
    const steps = this.TUTORIAL_STEPS[this.tutorial];
    do {
      this.tut.step++;
    } while (this.tut.step < steps.length && steps[this.tut.step].skipIf?.(this));
    if (this.tut.step >= steps.length) {
      this.endTutorial(false);
      return;
    }
    const st = steps[this.tut.step];
    this.tut.base = { passes: this.matchStats.passes, shots: this.matchStats.shots, skills: this.matchStats.skills };
    this.tut.stepFrames = 0;
    this.tut.dribbled = false;
    st.setup?.(this);
    if (this.tut.step > 0) window.SFX?.jingle([660, 990]);
    this.renderTutorialPanel();
  },

  // Roda a cada quadro enquanto o tutorial está aberto
  updateTutorial() {
    const steps = this.TUTORIAL_STEPS[this.tutorial];
    const st = steps[this.tut.step];
    const p = this.playerEntity;
    this.tut.moved += Math.hypot(p.x - this.tut.lastX, p.y - this.tut.lastY);
    this.tut.lastX = p.x;
    this.tut.lastY = p.y;
    this.tut.stepFrames++;
    // Passo que precisa da bola: se ela estiver longe, volta para o seu pé
    if (st.needBall && !this.ball.owner && Math.hypot(this.ball.vx, this.ball.vy) < 1 && this.tut.stepFrames > 90) {
      this.ball.owner = p;
      this.ball.z = 0;
    }
    if (st.done(this)) this.nextTutorialStep();
  },

  renderTutorialPanel() {
    const box = document.getElementById('tutorial-panel');
    if (!box) return;
    const steps = this.TUTORIAL_STEPS[this.tutorial];
    const st = steps[this.tut.step];
    box.innerHTML = `
      <div class="tut-head">${this.tutorial === 'basic' ? 'TUTORIAL' : 'TUTORIAL DO BLUE LOCK'} • ${this.tut.step + 1}/${steps.length}</div>
      <div class="tut-body"><kbd>${st.key}</kbd><span>${st.text}</span></div>
      <div class="tut-foot">
        <div class="tut-dots">${steps.map((_, i) => `<i class="${i < this.tut.step ? 'done' : i === this.tut.step ? 'now' : ''}"></i>`).join('')}</div>
        <button onclick="MatchEngine.endTutorial(true)">PULAR TUTORIAL (ENTER)</button>
      </div>`;
    box.classList.add('open');
  },

  // Fim (ou pulou): o treino não conta — placar, nota e números voltam ao zero e começa a partida
  endTutorial(skipped) {
    if (!this.tutorial) return;
    const kind = this.tutorial;
    this.tutorial = null;
    document.getElementById('tutorial-panel')?.classList.remove('open');
    const st = window.App.state;
    st.tutorial = Object.assign({}, st.tutorial, { [kind]: true });
    window.App.saveState();
    this.scoreHome = 0;
    this.scoreAway = 0;
    this.rating = 6;
    Object.keys(this.matchStats).forEach((k) => (this.matchStats[k] = 0));
    this.flowState.active = false;
    this.flowState.charge = 0;
    this.flowState.readyShown = false;
    this.chemCharge = this.chapter.id === 'ch0_prologue' ? 0 : 60;
    Object.keys(this.skillCooldowns).forEach((k) => (this.skillCooldowns[k] = 0));
    this.stamina = 100;
    // Um gol no meio do tutorial (ex: a Reação Química) não encerra nem atrasa a partida
    this.finishAfterReplay = false;
    this.pendingKickoff = null;
    this.replay = null;
    this.goalPause = 0;
    this.goalFx = null;
    this.lastTimerTick = performance.now();
    this.resetPositions('home');
    this.updateHUD();
    window.SFX?.whistle(2);
    this.showBanner(skipped ? 'TUTORIAL PULADO' : '✅ TUTORIAL CONCLUÍDO!', 'Agora vale! O relógio começou a correr.', '#00f5d4', 110);
  },

  startTrainingMinigame(drill, playerState) {
    this.openFullscreenOverlay();
    this.mode = 'training';
    this.currentDrill = drill;
    this.chapter = {
      id: 'training_mode',
      mapTheme: 'bluelock_holo',
      era: `MINIGAME DE TREINO: ${drill.name.toUpperCase()}`,
      targetGoals: 5
    };
    this.playerState = playerState;
    this.active = true;
    this.paused = false;
    this.frame = 0;
    this.timeLeft = drill.time || 45;
    this.lastTimerTick = performance.now();
    // Nada da partida anterior passa para o treino: o clímax pendente (desistir no meio da
    // faixa do 3 x 3 travava o jogo no treino), o monstro, o Fluxo, cargas e o mouse preso
    this.scriptBusy = false;
    this.climaxDone = false;
    this.climaxTimer = 0;
    this.finishAfterReplay = false;
    this.trainingDone = false;
    this.monster = { used: false, timer: 0 };
    this.flowState = { active: false, timer: 0, charge: 0, readyShown: false };
    this.chemCharge = 0;
    this.skillCooldowns = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, v: 0 };
    this.mouse.down = false;
    this.mouse.charge = 0;
    this.trainingScore = 0;
    this.trainingTargetScore = drill.target || 5;
    // combo de acertos seguidos e a janela do "de primeira" (Sinergia)
    this.trnCombo = 0;
    this.trnBestCombo = 0;
    this.trnReceivedAt = -999;
    this.trnOneTouch = false;
    this.trnPrevOwner = null;
    this.trnMateGotAt = 0;
    this.trnLastSpot = null;
    this.scoreHome = 0;
    this.scoreAway = 0;
    this.goalPause = 0;
    this.hitStop = 0;
    this.special = null;
    this.replay = null;
    this.goalFx = null;
    this.stamina = 100;
    this.exhausted = false;
    this.callCooldown = 0;
    this.bubbles = [];
    this.particles = [];
    this.trailPoints = [];
    this.passives = this.computePassives();
    this.copiedSkill = null;
    this.pauseOpen = false;
    this.tutorial = null;

    this.setupTrainingEntities(drill);
    this.spawnNextTrainingTargets();
    if (this.trnMode() === 'onetouch') this.trnResetBall();
    this.updateHUD();
    const howTo = {
      rings: `Siga a SETA e passe pelos ${this.trainingTargetScore} anéis em sequência (SHIFT corre). Cada anel dá +2 s!`,
      targets: 'Chute nos alvos do gol (segure o botão esquerdo = mais forte). Acertos seguidos = COMBO e +2 s!',
      blindspot: 'O PONTO CEGO anda pelo gol: chute quando ele estiver longe do goleiro!',
      onetouch: 'O parceiro toca pra você (ou [R]): o gol só vale se você chutar DE PRIMEIRA, em até 2 s!'
    };
    this.showBanner(`MINIGAME: ${drill.name.toUpperCase()}!`, howTo[this.trnMode()] || howTo.targets, '#00f5d4', 160);
  },

  // Um rival entra no Fluxo depois da cena dele (midMatchLore.rivalFlow): aura na cor,
  // +25% de velocidade e o drible acelerado do transe por rf.seconds
  startRivalFlow(rf) {
    const ent = this.entities.find((e) => e.team === 'away' && e.id === rf.id);
    if (!ent) return;
    const frames = Math.round((rf.seconds || 12) * 60);
    if (!ent.rivalFlowBase) ent.rivalFlowBase = ent.speed;
    ent.speed = ent.rivalFlowBase * 1.25;
    ent.rivalFlowTimer = frames;
    ent.rivalFlowColor = rf.color || ent.charData?.auraColor || '#ef4444';
    ent.buffTimer = Math.max(ent.buffTimer || 0, frames);
    this.addBubble(ent, 'FLUXO!', ent.rivalFlowColor, 80);
    this.spawnParticles(ent.x, ent.y, 30, ent.rivalFlowColor, 40);
    window.SFX?.jingle?.([392, 523, 784]);
    this.showBanner(`⚙️ ${ent.name.toUpperCase()} ENTROU NO FLUXO!`, `${rf.name ? rf.name + ': ' : ''}ele está mais rápido por alguns segundos. Marque ele!`, ent.rivalFlowColor, 120);
  },

  // ---------------------------------------------------------------- treino
  // Qual minigame é (drill.mode; os antigos sem mode: FÍSICO = anéis, o resto = alvos)
  trnMode() {
    const d = this.currentDrill;
    return d?.mode || (d?.category === 'FÍSICO' ? 'rings' : 'targets');
  },

  // Lugar do próximo anel: a uma corrida curta de onde você está, dentro do campo
  trnRingSpot(fx, fy) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 380 + Math.random() * 320;
      const x = fx + Math.cos(a) * d;
      const y = fy + Math.sin(a) * d * 0.6;
      if (Math.abs(x) < 1350 && Math.abs(y) < 320) return { x, y };
    }
    return { x: Math.max(-1350, Math.min(1350, -fx * 0.5)), y: Math.max(-320, Math.min(320, -fy * 0.8)) };
  },

  // Depois de cada chute: você volta pra perto da área; no "de primeira" a bola fica com
  // o parceiro, que toca pra você
  trnResetBall() {
    const p = this.playerEntity;
    p.x = 1050 + (Math.random() - 0.5) * 180;
    p.y = (Math.random() - 0.5) * 320;
    if (this.trnMode() === 'onetouch') {
      const mate = this.entities.find((e) => !e.isPlayer && e.team === 'home' && !e.isGK);
      if (mate) {
        mate.x = 1180;
        mate.y = p.y > 0 ? -170 : 170;
        mate.vx = 0;
        mate.vy = 0;
        this.ball.owner = mate;
        this.ball.passTarget = null;
        this.ball.x = mate.x;
        this.ball.y = mate.y;
        this.ball.z = 0;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.vz = 0;
        this.trnMateGotAt = this.frame;
        return;
      }
    }
    this.ball.owner = p;
  },

  // Errou (defesa, fora, fora do alvo): o combo zera
  trnMiss() {
    if (this.trnCombo >= 2) this.addBubble(this.playerEntity, 'COMBO PERDIDO', '#94a3b8', 40);
    this.trnCombo = 0;
  },

  // Lógica de cada minigame, a cada quadro
  trainingTick(p) {
    const mode = this.trnMode();
    if (mode === 'rings') {
      const cur = this.trainingTargets.find((t) => t.current);
      if (cur && Math.hypot(p.x - cur.x, p.y - cur.y) < cur.radius + 18) {
        this.trainingScore++;
        this.scoreHome = this.trainingScore;
        this.timeLeft += 2;
        this.spawnParticles(cur.x, cur.y, 15, '#22c55e', 30);
        window.SFX?.pass?.();
        this.addBubble(p, '+2 s', '#22c55e', 35);
        // o próximo vira o atual e nasce um novo depois dele
        const nxt = this.trainingTargets.find((t) => t.next);
        if (nxt) {
          nxt.next = false;
          nxt.current = true;
          const s = this.trnRingSpot(nxt.x, nxt.y);
          cur.x = s.x;
          cur.y = s.y;
          cur.current = false;
          cur.next = true;
        }
        this.showBanner(`⚡ ANEL ${this.trainingScore}/${this.trainingTargetScore}`, 'Siga a seta até o próximo!', '#22c55e', 45);
        this.updateHUD();
        if (this.trainingScore >= this.trainingTargetScore) setTimeout(() => this.finishMatch(), 600);
      }
    } else if (mode === 'blindspot') {
      // o Ponto Cego passeia pelo gol (de canto a canto, sobe e desce)
      this.trainingTargets.forEach((tg) => {
        if (!tg.moving) return;
        tg.phase += tg.speed;
        tg.y = Math.sin(tg.phase) * 70;
        tg.z = 50 + Math.sin(tg.phase * 1.7 + 1) * 30;
      });
    } else if (mode === 'onetouch') {
      const owner = this.ball.owner;
      const mate = this.entities.find((e) => !e.isPlayer && e.team === 'home' && !e.isGK);
      // o parceiro segura a bola um instante e toca pra você
      if (mate && owner === mate && this.frame - this.trnMateGotAt > 70) this.kickPass(mate, p, '#f472b6');
      // recebeu o passe de um companheiro: abre a janela do "de primeira"
      if (owner === p && this.trnPrevOwner !== p && this.ball.lastTouch && this.ball.lastTouch !== p && this.ball.lastTouch.team === 'home') {
        this.trnReceivedAt = this.frame;
        this.addBubble(p, 'DE PRIMEIRA!', '#f472b6', 50);
      }
      // a bola saiu do seu pé: foi de primeira se você chutou dentro da janela
      if (this.trnPrevOwner === p && owner !== p) this.trnOneTouch = this.ball.lastTouch === p && this.frame - this.trnReceivedAt <= 120;
      if (owner === p && this.trnPrevOwner !== p && this.ball.lastTouch === p) this.trnReceivedAt = -999;
      this.trnPrevOwner = owner;
    }
  },

  setupTrainingEntities(drill) {
    this.entities = [];
    const st = this.playerState;
    const baseSpeed = this.getPlayerJogSpeed();

    this.playerEntity = {
      id: 'player',
      isPlayer: true,
      team: 'home',
      name: st.profile.name || 'Yori Triver',
      number: st.profile.number || 11,
      x: drill.category === 'FÍSICO' ? -300 : 1050,
      y: 0,
      z: 0,
      homeX: drill.category === 'FÍSICO' ? -300 : 1050,
      homeY: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      speed: baseSpeed,
      slideVx: 0,
      slideVy: 0,
      facingRight: true,
      animState: 'idle',
      animTimer: 0,
      charData: {
        skinColor: st.profile.skinColor || '#f3d1b8',
        hairColor: st.profile.hairColor || '#0f172a',
        hairSecondary: st.profile.hairSecondary || '#2563eb',
        eyeColor: st.profile.eyeColor || '#ef4444',
        eyeStyle: st.profile.eyeStyle,
        hairStyle: st.profile.hairStyle || 'spiky_tall',
        jerseyPrimary: '#0f2942',
        jerseySecondary: '#38bdf8',
        auraColor: '#00f5d4',
        number: st.profile.number || 11,
        ovr: window.App.calculateOVR()
      }
    };
    this.entities.push(this.playerEntity);

    const shidou = window.BLUE_LOCK_CHARACTERS.find((c) => c.id === 'shidou') || window.BLUE_LOCK_CHARACTERS[0];
    this.entities.push({
      id: shidou.id,
      isPlayer: false,
      team: 'home',
      isGK: false,
      name: shidou.name,
      number: shidou.number,
      x: 1180,
      y: -140,
      z: 0,
      homeX: 1180,
      homeY: -140,
      vx: 0,
      vy: 0,
      vz: 0,
      speed: 2.2,
      facingRight: true,
      animState: 'idle',
      animTimer: 0,
      charData: Object.assign({}, shidou, { ovr: window.App.getScaledCharOVR(shidou) })
    });

    this.entities.push(this.makeRobotKeeper('away', this.PITCH_HALF_X - 28));

    this.ball.owner = this.playerEntity;
    this.ball.x = this.playerEntity.x + 12;
    this.ball.y = this.playerEntity.y;
    this.ball.z = 0;
    this.camera.x = this.playerEntity.x;
    this.camera.y = this.playerEntity.y;
  },

  // Partidas mais longas: os tempos dos capítulos (matchDuration, triggerTime, deadline
  // do roteiro) continuam escritos na escala antiga e são esticados aqui, todos juntos
  MATCH_TIME_SCALE: 1.8,

  matchTime(seconds) {
    return Math.round(seconds * this.MATCH_TIME_SCALE);
  },

  // Velocidade de trote (sem SHIFT). Mais calma que antes; o SHIFT multiplica por 1.6
  getPlayerJogSpeed() {
    return this.getStatEffects().jogSpeed;
  },

  // ==========================================================================
  // O QUE CADA ATRIBUTO FAZ EM CAMPO (um lugar só: a partida usa estes números
  // e a aba ESTATÍSTICAS mostra o mesmo texto ao lado de cada barra).
  // Os rivais sobem de OVR junto com você, então quem decide a partida são os
  // atributos — cada ponto precisa pesar.
  // ==========================================================================
  // Seus atributos (o Fluxo não soma mais pontos: cada um tem a sua passiva, em passive())
  // + a Evolução da NEL escolhida (Metavision, Predator Eye, Protagonista): a tela prometia
  // "+35 Visão..." mas antes só somava +4 de OVR e não mudava nada em campo
  effectiveStats() {
    const base = this.playerState?.stats || {};
    const id = this.playerState?.selectedNelEvolution;
    const evo = id && (window.NEL_EVOLUTIONS || []).find((e) => e.id === id);
    if (!evo?.bonuses) return base;
    const out = Object.assign({}, base);
    Object.entries(evo.bonuses).forEach(([k, v]) => (out[k] = (out[k] || 0) + v));
    return out;
  },

  // Sem "stats" = os seus efeitos em campo, já com as passivas das armas.
  // Com "stats" (aba ATRIBUTOS) = só o que os atributos fazem.
  getStatEffects(stats = null) {
    const own = !stats;
    if (!stats) stats = this.playerState ? this.effectiveStats() : window.App?.state?.stats || {};
    const v = (k) => Math.max(0, stats[k] || 0);
    const fx = {
      jogSpeed: 2.25 + Math.min(1.1, v('velocidade') / 80),
      staminaDrain: Math.max(0.18, 0.45 - v('resistencia') / 250),
      staminaRegen: 1 + v('resistencia') / 100,
      tackleResist: v('conducao') * 0.002 + v('forca') * 0.004,
      slideBonus: v('forca') * 0.004 + v('posicionamento') * 0.002,
      airReach: 34 + Math.min(36, v('habilidadeAerea') * 0.35),
      controlRadius: 22 + Math.min(18, v('posicionamento') * 0.15),
      accBonus: v('finalizando') * 0.6 + v('compostura') * 0.2 + v('poderDisparo') * 0.1,
      keeperBeat: Math.min(0.45, v('finalizando') / 220),
      shotBase: 11.5 + Math.min(5, v('poderDisparo') / 14),
      shotCap: 19.5 + Math.min(2.5, v('poderDisparo') / 40),
      skillPower: 1 + Math.min(0.2, v('poderDisparo') / 400),
      longRangeCut: Math.min(0.7, v('tirosLongos') / 120),
      pressureCut: Math.min(0.65, v('compostura') / 150),
      passSpeed: Math.min(3, v('visao') / 25),
      chemRate: 2 + v('visao') / 60,
      // %/segundo: com Ego 0 enche em ~2 min (a partida tem ~3); Ego 60 em ~70 s
      flowRate: 0.8 + v('ego') / 100
    };
    // Atributos de chute muito altos rendem menos (acima de +60 conta a metade): sem teto,
    // com tudo em 150 o Egoísta ficava igual ao Normal
    if (fx.accBonus > 60) fx.accBonus = 60 + (fx.accBonus - 60) * 0.5;
    if (own && this.passives) {
      const ps = (k) => this.passive(k);
      // velocidade das passivas somadas (Loki + Chigiri + Fluxo...) para em +30%
      fx.jogSpeed *= 1 + Math.min(0.3, ps('speed'));
      fx.staminaDrain *= 1 - Math.min(0.6, ps('stamina'));
      fx.tackleResist += ps('shield');
      fx.slideBonus += ps('steal');
      fx.airReach += ps('aerial');
      fx.controlRadius += ps('aerial') / 3;
      fx.keeperBeat = Math.min(0.75, fx.keeperBeat + ps('keeper_beat'));
      fx.longRangeCut = Math.min(0.95, fx.longRangeCut + ps('long_shot'));
      fx.shotBase += (ps('long_shot') ? 1 : 0) + ps('power') * 3;
      fx.shotCap += ps('power') * 5;
      fx.skillPower += ps('power');
      fx.pressureCut = Math.min(0.9, fx.pressureCut + ps('composure'));
      fx.passSpeed += ps('perfect_pass') + ps('radar');
      fx.chemRate *= 1 + Math.min(1, ps('chem'));
      fx.flowRate *= 1 + ps('flow');
    }
    // O monstro acordado: chute mais forte, mais preciso e difícil de parar
    if (own && this.monsterActive()) {
      fx.accBonus += 25;
      fx.shotBase += 2;
      fx.shotCap += 2;
      fx.tackleResist += 0.25;
      fx.pressureCut = Math.min(0.95, fx.pressureCut + 0.3);
    }
    return fx;
  },

  // Passivas das armas equipadas (as duas da NEL somam): { kind: valor }
  computePassives() {
    const out = {};
    if (!this.playerState || this.chapter?.id === 'ch0_prologue') return out;
    const st = this.playerState;
    [st.equippedWeapon, st.nelUnlocked ? st.equippedWeapon2 : null].forEach((w) => {
      const p = window.getWeaponPassive?.(w);
      if (p) out[p.kind] = (out[p.kind] || 0) + (p.value || 1);
    });
    return out;
  },

  // Passiva das armas + a do Fluxo ativo (FLOWS_DB[].fx, só enquanto o Fluxo dura)
  passive(kind) {
    const f = this.flowState?.active ? this.flowFx?.fx?.[kind] || 0 : 0;
    return (this.passives?.[kind] || 0) + f;
  },

  // Tiraram a bola de você: com a Revanche (Adrenalina) o próximo carrinho em 5 s é certeiro
  onPlayerRobbed() {
    if (!this.flowFxVal('revenge')) return;
    this.revengeTimer = 300;
    this.addBubble(this.playerEntity, 'REVANCHE! [F]', '#22c55e', 60);
  },

  // Efeito do Fluxo ativo (sem somar armas): os efeitos que só existem nos Fluxos
  flowFxVal(kind) {
    return this.flowState?.active ? this.flowFx?.fx?.[kind] || 0 : 0;
  },

  // Bônus de acerto do Fluxo num chute (o Fluxo AJUDA, não garante): Quatro Egos (1º
  // chute), Kaiser Impact (carregado no máximo) e Máquina Racional (livre dentro da área).
  // Só valem de uma distância de chute de verdade, e o teto pela distância continua
  // (antes era gol garantido e entrava até do meio-campo)
  FLOW_SHOT_RANGE: 650,
  flowShotBonus(p, charge = 0) {
    if (this.mode !== 'match' || !this.flowState?.active) return 0;
    const dist = Math.hypot(this.PITCH_HALF_X - p.x, p.y);
    if (dist > this.FLOW_SHOT_RANGE) return 0;
    let bonus = 0;
    if (this.flowFxVal('first_shot') && !this.flowFirstShotUsed) {
      this.flowFirstShotUsed = true;
      bonus += 35;
      this.showBanner('👁️ QUATRO EGOS!', 'O primeiro chute do Fluxo: o goleiro quase não se mexe.', this.flowFx.color, 70);
    }
    if (this.flowFxVal('kaiser') && charge >= 90) {
      bonus += 30;
      this.showBanner('👑 KAISER IMPACT!', 'Chute carregado no máximo: muito mais difícil de defender.', this.flowFx.color, 70);
    }
    if (this.flowFxVal('rational')) {
      const inBox = p.x > this.PITCH_HALF_X - this.AREA_DEPTH && Math.abs(p.y) < 210;
      const free = !this.entities.some((e) => e.team === 'away' && !e.isGK && !(e.stunTimer > 0) && Math.hypot(e.x - p.x, e.y - p.y) < 110);
      if (inBox && free) {
        bonus += 40;
        this.showBanner('🧮 MÁQUINA RACIONAL!', 'Livre dentro da área: a conta está a seu favor.', this.flowFx.color, 70);
      }
    }
    return bonus;
  },

  // Pé AMBOS (passiva de nascença ou liberada no OVR 52): sem perna ruim
  ambidextrousBonus(key) {
    return this.playerState?.profile?.dominantFoot === 'AMBOS' ? window.AMBIDEXTROUS?.[key] || 0 : 0;
  },

  // O Fluxo ativo (os 2 slots combinados em activateFlow) tem esse perk?
  flowHasPerk(perk) {
    return !!this.flowFxVal(perk);
  },

  // Grande área do rival (a mesma desenhada no campo: 280 de fundo, ±210 de largura)
  AREA_DEPTH: 280,
  AREA_HALF_W: 210,

  inRivalBox(ent) {
    return ent.x >= this.PITCH_HALF_X - this.AREA_DEPTH && Math.abs(ent.y) <= this.AREA_HALF_W;
  },

  // Fácil / Normal / Egoísta (window.DIFFICULTY_MODES), escolhida ao criar o jogador
  difficultyMode() {
    const modes = window.DIFFICULTY_MODES || {};
    return modes[this.playerState?.difficulty] || modes.normal || { rivalEdge: 0, rivalSpeed: 1, rivalKeeper: 1, myKeeper: 0, coinMult: 1 };
  },

  // Skill de chute que faz curva (trivela, folha seca, gyro...)
  isCurveSkill(sk) {
    return !!sk && /curv|trivela|gyro|magnus|folha seca|arco/i.test(`${sk.name} ${sk.desc || ''}`);
  },

  // Texto curto do efeito de um atributo (aba ESTATÍSTICAS)
  describeStatEffect(key, stats) {
    const fx = this.getStatEffects(stats);
    const base = this.getStatEffects({});
    const pct = (a, b) => `${Math.round((a / b - 1) * 100)}%`;
    switch (key) {
      case 'velocidade': return `Corrida +${pct(fx.jogSpeed, base.jogSpeed)}`;
      case 'resistencia': return `Fôlego gasta −${Math.round((1 - fx.staminaDrain / base.staminaDrain) * 100)}% e volta +${pct(fx.staminaRegen, 1)}`;
      case 'forca': return `Segura a bola e ganha carrinhos (+${Math.round((stats.forca || 0) * 0.4)}%)`;
      case 'habilidadeAerea': return `Domina bolas altas até ${Math.round(fx.airReach)} de altura (base 34)`;
      case 'finalizando': return `+${Math.round((stats.finalizando || 0) * 0.6)}% de chance de passar pelo goleiro (o goleiro rival sobe junto com o seu nível)`;
      case 'poderDisparo': return `Chute ${fx.shotBase.toFixed(1)} de força (base 11.5): precisa carregar menos`;
      case 'tirosLongos': return `De longe, perde só ${Math.round((1 - fx.longRangeCut) * 100)}% da precisão normal (e o teto de longe sobe +${Math.round(fx.longRangeCut * 10)}%)`;
      case 'conducao': return `Drible +${Math.round((stats.conducao || 0) * 0.5)}% • arrancada maior`;
      case 'visao': return `Passe +${pct(8.5 + fx.passSpeed, 8.5)} mais rápido • Química carrega +${pct(fx.chemRate, 2)}`;
      case 'posicionamento': return `Alcance para pegar a bola solta ${Math.round(fx.controlRadius)} (base 22)`;
      case 'compostura': return `Marcador em cima atrapalha só ${Math.round((1 - fx.pressureCut) * 100)}% do normal`;
      case 'ego': return `Fluxo carrega +${pct(fx.flowRate, 0.8)} mais rápido (enche em ${Math.round(100 / fx.flowRate)}s)`;
      default: return '';
    }
  },

  // Goleiro holográfico do Blue Lock (treinos e Torneio de Trios)
  makeRobotKeeper(team, x) {
    return {
      id: `bluelock_man_${team}`,
      isPlayer: false,
      team,
      isGK: true,
      name: 'BLUE LOCK MAN',
      number: 0,
      x,
      y: 0,
      z: 0,
      homeX: x,
      homeY: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      speed: 2.0,
      edge: 0,
      tackleCd: 0,
      facingRight: team === 'home',
      animState: 'idle',
      animTimer: 0,
      stunTimer: 0,
      charData: {
        skinColor: '#1e3a8a',
        hairColor: '#00f5d4',
        hairSecondary: '#38bdf8',
        eyeColor: '#00f5d4',
        hairStyle: 'short_sharp',
        jerseyPrimary: '#090d16',
        jerseySecondary: team === 'home' ? '#00f5d4' : '#ef4444',
        auraColor: '#00f5d4',
        number: 1,
        ovr: window.App.calculateOVR()
      }
    };
  },

  spawnNextTrainingTargets() {
    this.trainingTargets = [];
    if (!this.currentDrill) return;
    const mode = this.trnMode();

    if (mode === 'rings') {
      // um anel de cada vez (o atual aceso e o próximo apagadinho), sempre a uma corrida curta
      const p = this.playerEntity || { x: -300, y: 0 };
      const a = this.trnRingSpot(p.x, p.y);
      const b = this.trnRingSpot(a.x, a.y);
      this.trainingTargets.push({ type: 'sprint_ring', x: a.x, y: a.y, z: 0, radius: 42, color: '#22c55e', current: true });
      this.trainingTargets.push({ type: 'sprint_ring', x: b.x, y: b.y, z: 0, radius: 42, color: '#22c55e', next: true });
    } else if (mode === 'blindspot') {
      this.trainingTargets.push({
        type: 'goal_target',
        x: this.PITCH_HALF_X - 8,
        y: 0,
        z: 50,
        radius: 34,
        color: '#a855f7',
        label: 'PONTO CEGO',
        moving: true,
        phase: Math.random() * Math.PI * 2,
        speed: 0.022 + Math.random() * 0.012
      });
    } else {
      const spots = [
        { y: -72, z: 76, color: '#facc15', label: 'GAVETA ESQ' },
        { y: 72, z: 76, color: '#00f5d4', label: 'GAVETA DIR' },
        { y: -65, z: 20, color: '#f43f5e', label: 'CANTO BAIXO' },
        { y: 65, z: 20, color: '#a855f7', label: 'CANTO BAIXO' },
        { y: 0, z: 82, color: '#22c55e', label: 'CENTRO ALTO' }
      ];
      // nunca o mesmo canto duas vezes seguidas
      const pool = spots.filter((s) => s !== this.trnLastSpot);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      this.trnLastSpot = pick;
      this.trainingTargets.push({
        type: 'goal_target',
        x: this.PITCH_HALF_X - 8,
        y: pick.y,
        z: pick.z,
        radius: 36,
        color: pick.color,
        label: pick.label
      });
    }
  },

  setupEntities() {
    this.entities = [];
    const st = this.playerState;
    const playerOvr = window.App.calculateOVR();
    const baseSpeed = this.getPlayerJogSpeed();
    // Torneio de Trios: você + 2 escolhidos contra 3 rivais, com goleiros holográficos
    // (threeVsThree: o mesmo 3 contra 3 num capítulo comum, ex: a 2ª Seleção)
    const trio = this.chapter.format === 'trio' || !!this.chapter.threeVsThree;

    // 1. Jogador Controlado (Você)
    this.playerEntity = {
      id: 'player',
      isPlayer: true,
      team: 'home',
      name: st.profile.name || 'Yori Triver',
      number: st.profile.number || 11,
      x: -180,
      y: 0,
      z: 0,
      homeX: -180,
      homeY: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      slideVx: 0,
      slideVy: 0,
      speed: baseSpeed,
      facingRight: true,
      animState: 'idle',
      animTimer: 0,
      charData: {
        skinColor: st.profile.skinColor || '#f3d1b8',
        hairColor: st.profile.hairColor || '#0f172a',
        hairSecondary: st.profile.hairSecondary || '#2563eb',
        eyeColor: st.profile.eyeColor || '#ef4444',
        eyeStyle: st.profile.eyeStyle,
        hairStyle: st.profile.hairStyle || 'spiky_tall',
        // homeColor/homeSecondary = uniforme do clube da NEL (App.getChapter)
        jerseyPrimary: this.chapter.homeColor || '#0f2942',
        jerseySecondary: this.chapter.homeSecondary || '#38bdf8',
        auraColor: st.equippedFlow ? st.equippedFlow.color : '#38bdf8',
        number: st.profile.number || 11,
        ovr: playerOvr
      }
    };
    this.entities.push(this.playerEntity);

    // 2. Companheiros distribuídos pelo Campo Colossal (com OVR nivelado ao seu!)
    // NEL (chapter.bigTeams): 7 contra 7, com dois zagueiros (role 'back') em cada time
    const big = !!this.chapter.bigTeams;
    const mateCoords = trio
      ? [{ x: -430, y: -210 }, { x: -430, y: 210 }, { x: -this.PITCH_HALF_X + 35, y: 0, isGK: true }]
      : big
      ? [
          { x: -420, y: -270 },
          { x: -420, y: 270 },
          { x: -680, y: 0 },
          { x: -1000, y: -190, role: 'back' },
          { x: -1000, y: 190, role: 'back' },
          { x: -this.PITCH_HALF_X + 35, y: 0, isGK: true }
        ]
      : [
          { x: -420, y: -230 },
          { x: -420, y: 230 },
          { x: -880, y: 0 },
          { x: -this.PITCH_HALF_X + 35, y: 0, isGK: true }
        ];
    // Modo Dupla: o parceiro humano fica no lugar do 1º companheiro. A ordem é a mesma nas
    // duas telas (0 = quem criou a sala, 1 = quem entrou) para as posições irem pela rede
    if (this.duo && this.duoMakePartner) {
      const slot = mateCoords.shift();
      const partner = this.duoMakePartner(slot);
      if (this.duo.role === 'guest') {
        // aqui você é o 1: troca de lugar com o parceiro (o 0 fica no meio do campo)
        Object.assign(this.playerEntity, { x: slot.x, y: slot.y, homeX: slot.x, homeY: slot.y });
        Object.assign(partner, { x: -180, y: 0, homeX: -180, homeY: 0 });
        this.entities.unshift(partner);
      } else {
        this.entities.push(partner);
      }
    }
    // Modo Dupla com o elenco cheio: o parceiro entra no lugar do 1º de linha (o goleiro,
    // que é o último da lista, nunca sai)
    let baseMates = this.chapter.teammateIds || ['bachira', 'shidou', 'sae', 'gagamaru'];
    if (this.duo && !trio && baseMates.length > mateCoords.length) baseMates = baseMates.slice(baseMates.length - mateCoords.length);
    const mateIds = trio ? [...(this.chapter.teammateIds || []).slice(0, 2), 'bluelock_man'] : baseMates.slice(0, mateCoords.length);
    const homeKit = this.chapter.homeColor ? { jerseyPrimary: this.chapter.homeColor, jerseySecondary: this.chapter.homeSecondary } : {};
    mateIds.forEach((id, idx) => {
      const pos = mateCoords[idx] || { x: -500, y: 0 };
      if (id === 'bluelock_man') {
        this.entities.push(this.makeRobotKeeper('home', pos.x));
        return;
      }
      const cData = window.findCharacter(id) || window.BLUE_LOCK_CHARACTERS[0];
      const scaledOvr = window.App.getScaledCharOVR(cData);
      this.entities.push({
        id: cData.id,
        isPlayer: false,
        team: 'home',
        isGK: !!pos.isGK,
        role: pos.role || null,
        name: this.chapter.id === 'ch0_prologue' && idx === 0 ? 'Tada (Amigo)' : cData.name,
        number: cData.number,
        x: pos.x,
        y: pos.y,
        z: 0,
        homeX: pos.x,
        homeY: pos.y,
        vx: 0,
        vy: 0,
        vz: 0,
        // Seu goleiro acompanha a bola mais rápido que o rival (antes era 2.0 e chegava atrasado);
        // time pilhado pelo discurso (chapter.hype) corre 6% mais
        speed: pos.isGK ? 3.1 : 2.35 * (this.chapter.hype ? 1.06 : 1),
        facingRight: true,
        animState: 'idle',
        animTimer: 0,
        charData: Object.assign({}, cData, { ovr: scaledOvr }, homeKit)
      });
    });

    // 3. Adversários distribuídos pelo Campo Colossal (com OVR nivelado ao seu!)
    const oppCoords = trio
      ? [{ x: 300, y: 0 }, { x: 720, y: -210 }, { x: 720, y: 210 }, { x: this.PITCH_HALF_X - 35, y: 0, isGK: true }]
      : big
      ? [
          { x: 260, y: 0 },
          { x: 580, y: -280 },
          { x: 580, y: 280 },
          { x: 820, y: 0 },
          { x: 1120, y: -190, role: 'back' },
          { x: 1120, y: 190, role: 'back' },
          { x: this.PITCH_HALF_X - 35, y: 0, isGK: true }
        ]
      : [
          { x: 260, y: 0 },
          { x: 640, y: -220 },
          { x: 640, y: 220 },
          { x: 1120, y: 0 },
          { x: this.PITCH_HALF_X - 35, y: 0, isGK: true }
        ];
    const oppIds = trio
      ? [...(this.chapter.opponentIds || []).slice(0, 3), 'bluelock_man']
      : (this.chapter.opponentIds || ['kaiser', 'loki', 'hugo', 'lorenzo', 'fukaku']).slice(0, oppCoords.length);
    // Dificuldade do capítulo: rivais mais rápidos e com vantagem própria (antes a vantagem
    // vinha só do OVR, que acompanha o seu — então nenhum capítulo ficava mais difícil)
    const difficulty = this.chapter.difficulty || 1;
    // Dificuldade escolhida pelo jogador (Fácil / Normal / Egoísta) por cima da do capítulo
    const mode = this.difficultyMode();
    const diffBoost = difficulty * 0.08;
    const diffEdge = (difficulty - 1) * 0.05;
    oppIds.forEach((id, idx) => {
      const pos = oppCoords[idx] || { x: 700, y: 0 };
      if (id === 'bluelock_man') {
        this.entities.push(this.makeRobotKeeper('away', pos.x));
        return;
      }
      const cData = window.findCharacter(id) || window.BLUE_LOCK_CHARACTERS[3];
      // rivalEdgeCap (ex: NEL) limita a vantagem dos rivais para a fase ser vencível
      const edgeCap = this.chapter.rivalEdgeCap ?? 1;
      const scaledOvr = Math.min(window.App.getScaledCharOVR(cData, true), playerOvr + Math.round(edgeCap * 40));
      // Vantagem de OVR sobre você (-0.5 a 1.0): deixa World Class mais rápidos, desarmando mais e lendo seus dribles
      // A dificuldade escolhida entra depois do limite do capítulo (senão o Egoísta era cortado)
      const capped = Math.max(-0.5, Math.min(edgeCap, (scaledOvr - playerOvr) / 40 + diffEdge));
      const edge = Math.min(1, Math.max(mode.edgeFloor ?? -0.5, capped + mode.rivalEdge));
      const customChar = Object.assign({}, cData, {
        ovr: scaledOvr,
        jerseyPrimary: this.chapter.opponentColor || cData.jerseyPrimary,
        jerseySecondary: this.chapter.opponentSecondary || cData.jerseySecondary
      });
      // Skills da Arma do personagem (ex: a trivela curva do Rin). Recargas começam
      // sorteadas para os rivais não usarem tudo no primeiro minuto
      const skills = pos.isGK ? {} : this.rivalSkills(cData);
      const startCd = () => 240 + Math.floor(Math.random() * 360);
      this.entities.push({
        shotSkills: skills.shotSkills || [],
        defSkill: skills.defSkill || null,
        buffSkill: skills.buffSkill || null,
        shotCd: startCd(),
        defCd: startCd(),
        buffCd: startCd(),
        id: cData.id,
        isPlayer: false,
        team: 'away',
        isGK: !!pos.isGK,
        role: pos.role || null,
        name: cData.name,
        number: cData.number,
        x: pos.x,
        y: pos.y,
        z: 0,
        homeX: pos.x,
        homeY: pos.y,
        vx: 0,
        vy: 0,
        vz: 0,
        speed: ((pos.isGK ? 2.0 : 2.05) + diffBoost + Math.max(0, edge) * 0.7) * mode.rivalSpeed,
        edge,
        // Drible assinatura (da Arma inspirada nele) que o rival usa com a bola
        sigSkill: skills.sigSkill || null,
        tackleCd: 0,
        facingRight: false,
        animState: 'idle',
        animTimer: 0,
        stunTimer: 0,
        charData: customChar
      });
    });
    // Bonecos novos: já monta os quadros de parado/correndo de todo mundo em
    // segundo plano (aos pouquinhos), pra não engasgar no primeiro pique
    window.PixelRenderer.prewarmSprites?.(
      this.entities.map((e) => ({ cd: e.charData, accessories: e.isPlayer ? this.playerState.equippedAccessories : e.accessories || [], actions: e.isPlayer || !!e.isDuo, left: !e.facingRight }))
    );
  },

  resetPositions(kickoffTeam = 'home') {
    this.entities.forEach((ent) => {
      ent.x = ent.homeX;
      ent.y = ent.homeY;
      ent.z = 0;
      ent.vx = 0;
      ent.vy = 0;
      ent.vz = 0;
      ent.slideVx = 0;
      ent.slideVy = 0;
      ent.dashTimer = 0;
      ent.recoverTimer = 0;
      ent.callTimer = 0;
      ent.stunTimer = 0;
      ent.animState = 'idle';
      ent.animTimer = 0;
    });
    this.ball.x = 0;
    this.ball.y = 0;
    this.ball.z = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.curve = 0;
    this.ball.spin = 0;
    this.ball.passTarget = null;
    this.ball.lastTouch = null;
    this.ball.kickGrace = 0;
    this.ball.color = '#ffffff';
    this.ball.owner = kickoffTeam === 'home' ? this.playerEntity : this.entities.find((e) => e.team === 'away');
    this.camera.x = this.playerEntity.x;
    this.camera.y = this.playerEntity.y;
  },

  // ==========================================================================
  // BARRA DE ESPAÇO: DRIBLAR (FINTA EXPLOSIVA + ANKLE BREAKER!)
  // ==========================================================================
  // Chance de sucesso do drible: melhora com Condução, Velocidade e Compostura,
  // cai se você driblar várias vezes seguidas ou se o marcador for muito mais forte (World Class)
  getDribbleChance(bonus = 0) {
    const s = this.effectiveStats();
    const p = this.playerEntity;
    let chance = 30 + (s.conducao || 0) * 0.5 + (s.velocidade || 0) * 0.12 + (s.compostura || 0) * 0.1 + bonus + (p.buffTimer > 0 ? 20 : 0) + this.passive('dribble') + this.ambidextrousBonus('dribbleBonus');
    chance -= this.dribbleChain * 18;
    let strongest = 0;
    this.entities.forEach((e) => {
      if (e.team === 'away' && !e.isGK && Math.hypot(e.x - p.x, e.y - p.y) < 160) {
        strongest = Math.max(strongest, e.edge || 0);
      }
    });
    chance -= strongest * 30;
    chance -= this.difficultyMode().dribbleCut || 0;
    return Math.round(Math.max(5, Math.min(92, chance)));
  },

  // A bola solta só vai junto no drible (espaço ou skill) se estiver no seu pé: no alcance
  // de dominar mais um passo, e baixa. De longe o drible é só a arrancada — antes a bola
  // "teleportava" de longe para o seu pé
  dribbleCanTake(p) {
    if (this.ball.owner === p) return true;
    if (this.ball.owner || this.ball.z >= 34) return false;
    return Math.hypot(this.ball.x - p.x, this.ball.y - p.y) <= this.getStatEffects().controlRadius + 18;
  },

  dribbleMove() {
    if (this.dribbleCooldown > 0) {
      this.showBanner('DRIBLE RECARREGANDO...', `Espere ${(this.dribbleCooldown / 60).toFixed(1)}s para driblar de novo.`, '#f59e0b', 30);
      return;
    }
    if (this.playerEntity.recoverTimer > 0) return;
    if (!this.spendStamina(8, 'driblar')) return;
    if (this.tutorial) this.tut.dribbled = true;
    const p = this.playerEntity;
    const chance = this.getDribbleChance();
    const success = Math.random() * 100 < chance;
    // (no Fluxo Velocidade Divina os dribles seguidos não pesam: a graça dele é driblar sem parar)
    if (!this.flowFxVal('dribble_cd')) this.dribbleChain = Math.min(4, this.dribbleChain + 1);
    this.dribbleChainTimer = 300;
    // (Velocidade Divina do Loki: o drible quase não recarrega durante o Fluxo)
    this.dribbleCooldown = Math.round(Math.max(90, 150 - Math.floor((this.playerState.stats.conducao || 0) * 0.4)) * (this.passive('dribble') ? 0.75 : 1) * (this.flowFxVal('dribble_cd') || 1));
    this.dribbleInvulnTimer = success ? 26 : 0;

    const target = this.screenToWorld(this.mouse.x, this.mouse.y);
    let dx = target.wx - p.x;
    let dy = target.wy - p.y;
    if (this.keys['w'] || this.keys['s'] || this.keys['a'] || this.keys['d']) {
      dx = (this.keys['d'] ? 1 : 0) - (this.keys['a'] ? 1 : 0);
      dy = (this.keys['s'] ? 1 : 0) - (this.keys['w'] ? 1 : 0);
    }
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;

    p.facingRight = dirX >= 0;
    p.animState = 'rabona';
    p.animTimer = 24;
    p.vz = 2.6;

    const dribStat = this.playerState.stats.conducao || 0;
    const dashDist = (92 + Math.min(48, dribStat * 0.4)) * (success ? 1 : 0.45);
    this.startDash(dirX, dirY, dashDist, 10, 'straight', success ? '#00f5d4' : null);

    // Se a bola estiver solta no seu pé ou com você, leva a bola colada no pé!
    if (this.dribbleCanTake(p)) {
      this.ball.owner = p;
      this.ball.z = 0;
    }

    if (!success) {
      // Drible lido: o marcador mais próximo rouba a bola
      const thief = this.entities
        .filter((e) => e.team === 'away' && !e.isGK && e.stunTimer <= 0 && Math.hypot(e.x - p.x, e.y - p.y) < 130)
        .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (thief && this.ball.owner === p) {
        this.ball.owner = thief;
        thief.animState = 'slide';
        thief.animTimer = 18;
        thief.tackleCd = 50;
        this.spawnParticles(p.x, p.y, 6, '#ef4444', 12);
        this.onPlayerRobbed();
      }
      this.rate(-0.2, 'DRIBLE FALHOU');
      this.showBanner(
        `❌ DRIBLE FALHOU! (${chance}% de chance)`,
        thief ? `${thief.name} leu seu movimento e roubou a bola!` : 'Você perdeu o tempo da finta. Driblar várias vezes seguidas reduz a chance!',
        '#ef4444',
        65
      );
      return;
    }

    // Quebra a cintura (Stun) dos marcadores que estavam vindo atrás de você!
    // World Class às vezes não caem na finta
    let brokenCount = 0;
    const readers = [];
    const victims = [];
    this.entities.forEach((e) => {
      if (e.team === 'away' && !e.isGK && Math.hypot(e.x - p.x, e.y - p.y) < 135) {
        if ((e.edge || 0) > 0.5 && Math.random() < e.edge * 0.5) {
          readers.push(e.name.split(' ')[0]);
          return;
        }
        // (Rei do 1v1 do Yukimiya: quem cai fica no chão o triplo do tempo)
        e.stunTimer = Math.round(52 * (this.flowFxVal('dribble_stun') || 1));
        // quem cai na finta solta a bola (antes ela ficava grudada no rival caído)
        if (this.ball.owner === e) Object.assign(this.ball, { owner: null, vx: 0, vy: 0, z: 0 });
        victims.push(e);
        brokenCount++;
      }
    });
    this.breakAnkles(victims);

    this.spawnParticles(p.x, p.y, 10, '#00f5d4', 20);
    window.SFX?.whoosh();
    if (brokenCount > 0 && this.mode === 'match') {
      this.matchStats.dribbles++;
      this.rate(0.2, 'DRIBLE');
    }
    if (readers.length > 0) {
      this.showBanner(`👁️ ${readers.join(' e ').toUpperCase()} NÃO CAIU NA FINTA!`, 'Jogadores World Class leem dribles fracos. Evolua sua Condução!', '#f59e0b', 60);
    } else if (brokenCount > 0) {
      this.showBanner(`⚡ DRIBLE ELÁSTICO! (${brokenCount} MARCADOR(ES) BATIDO(S)!)`, `Chance de sucesso: ${chance}% • Use o Botão Direito para tocar ou Botão Esquerdo para chutar!`, '#00f5d4', 55);
    }
  },

  // ==========================================================================
  // TECLA F: DAR CARRINHO (SLIDE TACKLE ANIMADO!)
  // ==========================================================================
  // Arrancada curta espalhada em alguns quadros (antes o jogador teleportava)
  // color: deixa o rastro de luz e os "fantasmas" do drible nessa cor (null = sem efeito)
  startDash(dirX, dirY, dist, frames, move = 'straight', color = null) {
    const p = this.playerEntity;
    p.dashTimer = frames;
    p.dashFrames = frames;
    p.dashMove = move;
    p.dashColor = color;
    p.dashVx = (dirX * dist) / frames;
    p.dashVy = (dirY * dist) / frames;
  },

  // A Arma do personagem: a assinatura dele (wp_char_<id>) ou a que foi inspirada nele
  findCharWeapon(cData) {
    const db = window.WEAPONS_DB || [];
    return db.find((x) => x.id === `wp_char_${cData.id}`) || db.find((x) => x.inspiration && window.weaponInspiredBy(x, cData.name)) || null;
  },

  // O drible da Arma do personagem (de preferência um com movimento próprio)
  findSignatureDribble(cData) {
    const sk = this.findCharWeapon(cData)?.skills || [];
    return sk.find((s) => s.type === 'dribble' && s.move) || sk.find((s) => s.type === 'dribble') || null;
  },

  // Skills que o rival usa em campo: drible com a bola, chute especial, bote e transe
  rivalSkills(cData) {
    const sk = this.findCharWeapon(cData)?.skills || [];
    const best = (type) => sk.filter((s) => s.type === type).sort((a, b) => (b.power || 0) - (a.power || 0))[0] || null;
    return { sigSkill: this.findSignatureDribble(cData), shotSkills: sk.filter((s) => s.type === 'shot'), defSkill: best('defense'), buffSkill: best('buff') };
  },

  // Qual chute especial o rival usa agora: o curvo quando ele tem (a trivela do Rin), senão um dos chutes da Arma
  pickRivalShot(ent) {
    const shots = ent.shotSkills || [];
    if (!shots.length) return null;
    const curve = shots.find((s) => this.isCurveSkill(s));
    if (curve && Math.random() < 0.65) return curve;
    return shots[Math.floor(Math.random() * shots.length)];
  },

  // Rival usou uma skill: a passiva Camaleão (Reo) copia na hora
  // Etiqueta em cima do jogador: o sobrenome; sem nome do mangá (Meia do Time Y, Goleiro da
  // França...) vira a função; "Okawa (Time Y)" vira OKAWA (antes saíam "Y" e "Y)")
  tagName(ent) {
    const name = String(ent.name || '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
    const generic = /^(Meia|Zagueiro|Ponta|Atacante|Goleiro|Coringa)\b/i.exec(name);
    if (generic) return generic[1].toUpperCase();
    // Nome já em maiúsculas é nome próprio inteiro (BLUE LOCK MAN, não "MAN")
    if (name === name.toUpperCase()) return name;
    return (name.split(' ').pop() || name).toUpperCase();
  },

  onRivalSkill(ent, skill) {
    if (!skill || !this.passive('copy')) return;
    this.copiedSkill = { skill, from: ent.name.split(' ').pop() };
    this.addBubble(this.playerEntity, 'COPIEI!', '#a855f7', 60);
    this.showBanner(`🦎 CAMALEÃO: VOCÊ COPIOU "${skill.name.toUpperCase()}"!`, `Aperte [V] para usar a skill de ${ent.name} uma vez.`, '#a855f7', 80);
  },

  // Um quadro da arrancada: reta, ou em zigue-zague / giro / arrancada com rastro
  stepDash(p) {
    p.dashTimer--;
    const step = p.dashFrames - p.dashTimer;
    let vx = p.dashVx;
    let vy = p.dashVy;
    if (p.dashMove === 'zigzag') {
      // Corta para um lado e para o outro a cada 5 quadros, avançando sempre
      const side = Math.floor((step - 1) / 5) % 2 ? 1 : -1;
      vx += -p.dashVy * side * 1.7;
      vy += p.dashVx * side * 1.7;
      if (step % 5 === 0) this.spawnParticles(p.x, p.y, 8, '#dc2626', 8);
    } else if (p.dashMove === 'spin') {
      if (step % 3 === 0) p.facingRight = !p.facingRight;
    } else if (p.dashMove === 'burst') {
      if (step % 2 === 0) this.trailPoints.push({ x: p.x, y: p.y, z: 18, color: '#f43f5e', life: 12 });
    }
    p.x = Math.max(-this.PITCH_HALF_X + 20, Math.min(this.PITCH_HALF_X - 20, p.x + vx));
    p.y = Math.max(-this.PITCH_HALF_Y + 15, Math.min(this.PITCH_HALF_Y - 15, p.y + vy));
    if (p.dashColor) this.addDribbleFx(p, p.dashColor, step);
    if (p.dashTimer === 0) {
      p.dashMove = 'straight';
      p.dashColor = null;
    }
  },

  // Rastro de luz no chão + "fantasmas" coloridos de quem está driblando
  addDribbleFx(ent, color, step) {
    this.dribbleFx = this.dribbleFx || [];
    this.dribbleFx.push({ type: 'trail', ent, x: ent.x, y: ent.y, color, life: 36, max: 36 });
    if (step % 3 === 0) {
      this.dribbleFx.push({ type: 'ghost', x: ent.x, y: ent.y, z: ent.z || 0, anim: ent.animState, right: ent.facingRight, view: ent.animState === 'run' || ent.animState === 'idle' ? ent._view : undefined, charData: ent.charData, color, life: 16, max: 16 });
    }
  },

  // Fluxo com "radar" (Hiori, Niko, Metavision): com a bola no pé, linhas brilhando até
  // cada companheiro livre (sem rival a menos de 150)
  drawFlowRadar(ctx) {
    const flow = this.playerState?.equippedFlow;
    const p = this.playerEntity;
    if (this.ball.owner !== p) return;
    // Fluxo com radar ativo, ou a passiva Radar da arma (Hiori, Agi) o tempo todo
    if (!this.flowHasPerk('radar') && !this.passive('radar')) return;
    const from = this.project3D(p.x, p.y, 4);
    ctx.save();
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -this.frame * 1.5;
    const radarColor = this.flowHasPerk('radar') ? this.flowFx.color : flow?.color || '#38bdf8';
    // Todas as linhas num caminho só; o brilho é um traço largo translúcido por baixo
    // (o shadowBlur de antes custava caro em todo quadro)
    ctx.beginPath();
    this.entities.forEach((m) => {
      if (m.team !== 'home' || m.isPlayer || m.isGK) return;
      const free = !this.entities.some((o) => o.team === 'away' && !o.isGK && Math.hypot(o.x - m.x, o.y - m.y) < 150);
      if (!free) return;
      const to = this.project3D(m.x, m.y, 4);
      ctx.moveTo(from.sx, from.groundY);
      ctx.lineTo(to.sx, to.groundY);
      ctx.moveTo(to.sx + 18 * to.scale, to.groundY);
      ctx.ellipse(to.sx, to.groundY, 18 * to.scale, 8 * to.scale, 0, 0, Math.PI * 2);
    });
    ctx.strokeStyle = radarColor;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  },

  // Marcador que caiu no drible: fica no chão e aparece o "TORNOZELO QUEBRADO!"
  breakAnkles(victims) {
    victims.forEach((e, i) => {
      e.knockTimer = 48;
      e.animState = 'dive';
      if (i === 0) {
        this.popTexts = this.popTexts || [];
        this.popTexts.push({ text: 'TORNOZELO QUEBRADO!', color: '#facc15', x: e.x, y: e.y, z: 120, life: 70 });
      }
    });
    if (victims.length) this.impact(7, 0.12, 4);
  },

  drawDribbleFx(ctx) {
    const fx = this.dribbleFx || [];
    if (!fx.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Fita de luz: liga os pontos seguidos do mesmo jogador (brilho colorido + miolo branco)
    let prev = null;
    fx.forEach((d) => {
      if (d.type !== 'trail') return;
      if (prev && prev.ent === d.ent && Math.hypot(d.x - prev.x, d.y - prev.y) < 90) {
        const a = this.project3D(prev.x, prev.y, 4);
        const b = this.project3D(d.x, d.y, 4);
        const k = d.life / d.max;
        const lw = 12 * b.scale * (0.4 + k * 0.6);
        ctx.strokeStyle = d.color;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        // brilho: traço bem largo e translúcido (no lugar do shadowBlur, que era caro)
        ctx.globalAlpha = k * 0.3;
        ctx.lineWidth = lw * 2.3;
        ctx.stroke();
        ctx.globalAlpha = k;
        ctx.lineWidth = lw;
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5 * b.scale * k;
        ctx.stroke();
      }
      prev = d;
    });
    ctx.restore();
    // Fantasmas: a silhueta do jogador na cor do drible, sumindo
    fx.forEach((d) => {
      if (d.type !== 'ghost') return;
      const proj = this.project3D(d.x, d.y, d.z);
      const size = Math.round(58 * proj.scale);
      ctx.save();
      ctx.globalAlpha = (d.life / d.max) * 0.55;
      ctx.translate(proj.sx - size / 2, proj.sy - size + 6);
      window.PixelRenderer.drawCharacterSprite(ctx, d.charData, size, size, { facing: 'front', flipX: !d.right, frame: this.frame, animState: d.anim, view: d.view, tint: d.color });
      ctx.restore();
    });
  },

  // Gasta resistência numa ação; sem fôlego suficiente a ação não sai
  spendStamina(cost, actionLabel) {
    cost *= this.difficultyMode().staminaMult ?? 1;
    if (this.stamina < cost) {
      this.showBanner(`😮‍💨 SEM FÔLEGO PARA ${actionLabel.toUpperCase()}!`, 'Pare de correr (solte o SHIFT) para recuperar a resistência.', '#f59e0b', 45);
      return false;
    }
    this.stamina -= cost;
    return true;
  },

  // SHIFT gasta fôlego; andando recupera devagar e parado recupera rápido.
  // Resistência (atributo) faz a barra durar mais e voltar mais rápido.
  updateStamina(moving, canSprint) {
    const fx = this.getStatEffects();
    // Fluxo com fôlego infinito: não cansa e ainda recupera
    const endless = this.flowHasPerk('endless');
    if (endless) {
      this.stamina = Math.min(100, this.stamina + 0.6);
      this.exhausted = false;
    }
    const sprinting = canSprint && moving && this.keys['shift'] && !this.exhausted;
    if (sprinting && endless) {
      if (this.mode === 'match') this.matchStats.sprintFrames++;
    } else if (sprinting) {
      if (this.mode === 'match') this.matchStats.sprintFrames++;
      this.stamina = Math.max(0, this.stamina - fx.staminaDrain * (this.difficultyMode().staminaMult ?? 1));
      if (this.stamina <= 0) {
        this.exhausted = true;
        this.showBanner('😮‍💨 SEM FÔLEGO!', 'Você está cansado e mais lento. Solte o SHIFT para recuperar — treine RESISTÊNCIA para correr mais!', '#f59e0b', 80);
      }
    } else {
      this.stamina = Math.min(100, this.stamina + (moving ? 0.18 : 0.35) * fx.staminaRegen);
      if (this.exhausted && this.stamina >= 30) this.exhausted = false;
    }
    if (this.frame % 5 === 0 && !this._remoteCtx) {
      const bar = document.getElementById('match-stamina-bar');
      if (bar) {
        bar.style.width = `${Math.floor(this.stamina)}%`;
        bar.style.background = this.exhausted ? '#ef4444' : this.stamina < 35 ? '#f59e0b' : '#22c55e';
      }
    }
    return sprinting ? 1.6 : this.exhausted ? 0.82 : 1;
  },

  // Carrinho: recarga de ~2s, só resolve UMA vez por carrinho (no contato) e pode
  // falhar — errou, você fica no chão um instante. Antes roubava garantido e dava para spamar.
  SLIDE_COOLDOWN: 120,

  slideTackle() {
    const p = this.playerEntity;
    if (this.slideCooldown > 0 || p.recoverTimer > 0) return;
    if (!this.spendStamina(10, 'dar carrinho')) return;
    this.slideCooldown = this.SLIDE_COOLDOWN;
    p.slideResolved = false;

    const target = this.screenToWorld(this.mouse.x, this.mouse.y);
    let dx = target.wx - p.x;
    let dy = target.wy - p.y;
    if (this.ball.owner && this.ball.owner !== p) {
      dx = this.ball.x - p.x;
      dy = this.ball.y - p.y;
    }
    const dist = Math.hypot(dx, dy) || 1;
    p.facingRight = dx >= 0;
    p.animState = 'slide';
    p.animTimer = 28;
    p.slideVx = (dx / dist) * 8.2;
    p.slideVy = (dy / dist) * 8.2;

    this.spawnParticles(p.x, p.y, 2, '#22c55e', 16);
  },

  // Contato do carrinho com a bola: bola solta é sua; com o rival, depende de Força/Posicionamento
  resolveSlideContact(p) {
    p.slideResolved = true;
    const owner = this.ball.owner;
    // (bola na mão do goleiro rival é intocável, como no bote dos rivais e na skill de defesa:
    // antes o carrinho tirava a bola do goleiro em metade das vezes)
    if (!owner || owner.team === 'home' || owner.isGK) {
      if (!owner) {
        this.ball.owner = p;
        this.ball.z = 0;
      }
      return;
    }
    // Revanche (Adrenalina): logo depois de perder a bola, o carrinho é certeiro
    const revenge = this.revengeTimer > 0;
    const chance = revenge ? 1 : Math.max(0.15, Math.min(0.9, 0.45 + this.getStatEffects().slideBonus - Math.max(0, owner.edge || 0) * 0.3));
    if (Math.random() < chance) {
      this.revengeTimer = 0;
      owner.stunTimer = 60;
      // Devorar (Don Lorenzo): o desarmado fica 3 s no chão e o Fluxo ganha 1,5 s
      if (this.flowFxVal('devour')) {
        owner.stunTimer = 180;
        this.flowState.timer += 90;
        this.addBubble(p, 'DEVORADO!', this.flowFx.color, 50);
      }
      // O Olhar do Ego (segredo): quem leva o seu carrinho fica N vezes mais tempo no chão
      const tStun = this.flowFxVal('tackle_stun');
      if (tStun) {
        owner.stunTimer = Math.round(owner.stunTimer * tStun);
        this.addBubble(owner, 'NÃO LEVANTA!', this.flowFx.color, 50);
      }
      if (revenge) this.addBubble(p, 'REVANCHE!', '#22c55e', 50);
      this.ball.owner = p;
      this.ball.z = 0;
      window.SFX?.tackle();
      this.impact(6);
      this.matchStats.steals++;
      this.rate(0.3, 'DESARME');
      this.addBubble(owner, 'ARGH!', '#ef4444', 50);
      this.showBanner(`⚡ CARRINHO CERTEIRO EM ${owner.name.toUpperCase()}!`, `Chance de desarme: ${Math.round(chance * 100)}%`, '#22c55e', 60);
    } else {
      // Ele pula o carrinho e você fica no chão
      owner.animState = 'rabona';
      owner.animTimer = 20;
      owner.vz = 3;
      p.recoverTimer = 40;
      this.rate(-0.1, 'CARRINHO ERRADO');
      this.addBubble(owner, 'OLÉ!', '#f59e0b', 50);
      this.showBanner(`❌ ${owner.name.toUpperCase()} PULOU O CARRINHO!`, `Chance era ${Math.round(chance * 100)}%. Você caiu — espere levantar. Treine Força e Posicionamento!`, '#ef4444', 70);
    }
  },

  // ==========================================================================
  // TECLA R: PEDIR A BOLA (CALL FOR PASS!)
  // ==========================================================================
  callForPass() {
    const p = this.playerEntity;
    if (this.ball.owner === p || this.callCooldown > 0) return;
    this.callCooldown = 45;
    p.animState = 'call_pass';
    p.animTimer = 30;
    this.callPassRequested = true;
    this.spawnParticles(p.x, p.y, 28, '#38bdf8', 10);
    this.addBubble(p, 'AQUI! PASSA!', '#00f5d4', 60);

    // (o parceiro do Modo Dupla é humano: o pedido só aparece no balão para ele)
    if (this.ball.owner && this.ball.owner.team === 'home' && !this.ball.owner.isPlayer && !this.ball.owner.isRemote && !this.ball.owner.isDuo) {
      const holder = this.ball.owner;
      this.kickPass(holder, p, '#00f5d4');
      this.callPassRequested = false;
      this.addBubble(holder, 'TOMA!', '#facc15', 50);
    }
  },

  // Balões de fala sobre a cabeça (pedir bola, comemorar, xingar o carrinho...)
  addBubble(ent, text, color = '#ffffff', frames = 60) {
    this.bubbles = (this.bubbles || []).filter((b) => b.ent !== ent);
    this.bubbles.push({ ent, text, color, timer: frames, max: frames });
  },

  drawBubbles(ctx) {
    (this.bubbles || []).forEach((b) => {
      const pr = this.project3D(b.ent.x, b.ent.y, b.ent.z || 0);
      const size = Math.round(58 * pr.scale);
      const x = pr.sx;
      const y = pr.sy - size - 30;
      const pop = Math.min(1, (b.max - b.timer) / 6);
      const fade = Math.min(1, b.timer / 10);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(x, y);
      ctx.scale(0.7 + pop * 0.3, 0.7 + pop * 0.3);
      ctx.font = '900 13px "Segoe UI", sans-serif';
      const w = ctx.measureText(b.text).width + 18;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -24);
      ctx.lineTo(w / 2, -24);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 9);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-w / 2, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.fillStyle = b.color === '#ffffff' ? '#090d16' : b.color;
      ctx.fillRect(-w / 2, -24, 4, 24);
      ctx.fillStyle = '#090d16';
      ctx.textAlign = 'center';
      ctx.fillText(b.text, 2, -7);
      ctx.restore();
    });
  },

  // Porcentagem de acerto do chute: sobe com Finalização, Compostura, Poder de Disparo
  // e Tiros Longos (de longe); cai com distância, marcação em cima e goleiro mais forte
  getShotAccuracy(fromX, fromY, skill = null, charge = 0, curved = false, flowBonus = 0) {
    const fx = this.getStatEffects();
    let acc = 25 + fx.accBonus + flowBonus;
    // Passiva de curva (Rin): chute com efeito fica mais preciso
    if (curved || this.isCurveSkill(skill)) acc += this.passive('curve');
    // Passivas "vence o goleiro" (Kaiser, Karasu, Sendo, Blake) e "potência" (Shidou, Chris
    // Prince): antes só valiam no chute dos companheiros e não mudavam nada no seu
    acc += this.passive('keeper_beat') * 40 + this.passive('power') * 30;
    acc += this.ambidextrousBonus('accBonus');
    const distToGoal = Math.hypot(this.PITCH_HALF_X - fromX, fromY);
    const longRange = Math.max(0, (distToGoal - 380) / 22);
    acc -= longRange * (1 - fx.longRangeCut);
    let pressure = 0;
    this.entities.forEach((e) => {
      if (e.team === 'away' && !e.isGK && e.stunTimer <= 0 && Math.hypot(e.x - fromX, e.y - fromY) < 110) {
        pressure += 9 + Math.max(0, e.edge || 0) * 10;
      }
    });
    acc -= pressure * (1 - fx.pressureCut);
    const gk = this.entities.find((e) => e.team === 'away' && e.isGK);
    if (gk) acc -= Math.max(0, gk.edge || 0) * 12 + this.keeperLevelCut(gk);
    if (skill) acc += 6 + (skill.power || 1) * 6;
    if (charge > 85) acc -= 10;
    acc -= this.difficultyMode().accCut || 0;
    // Teto pela distância (nenhum atributo/skill passa dele): do meio-campo o goleiro
    // pega a maioria — antes o chute de skill do meio de campo era gol quase certo
    // (Tiros Longos melhora o teto de longe, mas ele nunca passa o de dentro da área)
    let cap = distToGoal <= 350 ? 85 : Math.min(85, Math.max(12, 85 - (distToGoal - 350) * 0.045 + fx.longRangeCut * 10));
    // Fluxo de chute (Quatro Egos, Kaiser Impact, Máquina Racional...): sobe o teto — antes o
    // bônus batia no teto e não valia nada no fim de jogo
    if (flowBonus > 0) cap += 10;
    // Egoísta: o goleiro pega mais de qualquer distância (atributo nenhum passa disso)
    cap -= this.difficultyMode().capCut || 0;
    return Math.round(Math.max(5, Math.min(cap, acc)));
  },

  // O goleiro rival acompanha o seu nível: ele "come" parte do que você ganhou em
  // Finalização / Compostura / Poder de Disparo (sem contar Fluxo, monstro e passivas) e
  // fica mais forte a cada capítulo. Treinar continua valendo (~60% do ganho), mas o chute
  // não vira gol certo depois de alguns níveis. Só o goleiro dos treinos não sobe (o
  // holograma dos jogos 3 contra 3 sobe também: antes eles eram os chutes mais fáceis)
  keeperLevelCut(gk) {
    if (!gk || this.mode !== 'match') return 0;
    const own = this.getStatEffects(this.effectiveStats()).accBonus;
    return Math.max(0, own - 12) * 0.55 + (this.chapter?.difficulty || 1) * 1.2;
  },

  // Q = curva para a esquerda de quem chuta, E = para a direita (0 = sem curva)
  getCurveInput() {
    return this.keys['q'] ? -1 : this.keys['e'] ? 1 : 0;
  },

  // O efeito (ball.spin) é curvatura por pixel percorrido e enfraquece com a distância:
  // a curva desenha sempre o mesmo arco, seja o chute forte ou fraco
  CURVE_FADE: 700,

  applySpin(vx, vy, spin) {
    const step = Math.hypot(vx, vy);
    const a = spin * step;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return { vx: vx * c - vy * s, vy: vx * s + vy * c, spin: spin * Math.exp(-step / this.CURVE_FADE) };
  },

  // Chute com efeito: a saída é "aberta" para o lado oposto e o ângulo certo é
  // achado simulando o arco, para a curva voltar e terminar na mira
  getCurvedShot(dirX, dirY, dist, speed, curveDir) {
    if (!curveDir) return { dirX, dirY, spin: 0 };
    const spin = curveDir * 0.0011;
    // Desvio lateral em relação à mira quando a bola chega na distância da mira
    const lateral = (a) => {
      let x = 0;
      let y = 0;
      let vx = Math.cos(a) * 8;
      let vy = Math.sin(a) * 8;
      let sp = spin;
      for (let i = 0; i < 500 && x < dist; i++) {
        x += vx;
        y += vy;
        ({ vx, vy, spin: sp } = this.applySpin(vx, vy, sp));
        if (vx <= 0) break;
      }
      return y;
    };
    let lo = -1.1 * curveDir;
    let hi = 0;
    const signLo = Math.sign(lateral(lo));
    for (let k = 0; k < 14; k++) {
      const mid = (lo + hi) / 2;
      if (Math.sign(lateral(mid)) === signLo) lo = mid;
      else hi = mid;
    }
    const a = (lo + hi) / 2;
    return { dirX: dirX * Math.cos(a) - dirY * Math.sin(a), dirY: dirX * Math.sin(a) + dirY * Math.cos(a), spin };
  },

  // Rola o acerto: o chute SEMPRE vai para onde você mirou, e a % é a chance de passar
  // pelo goleiro. Errou a rolagem = o goleiro lê o chute e defende (ball.gkSave)
  rollShotDirection(dx, dy, acc) {
    const hit = Math.random() * 100 < acc;
    const baseAng = Math.atan2(dy, dx);
    const err = (Math.random() - 0.5) * 0.04;
    return { hit, dirX: Math.cos(baseAng + err), dirY: Math.sin(baseAng + err), overBar: false };
  },

  // Zagueiro seu no caminho do chute do rival (bola baixa indo pro seu gol): trava com o
  // corpo uma vez por chute (45%, menos contra rival muito mais forte)
  tryBlockShot() {
    const b = this.ball;
    if (b.owner || this.mode !== 'match' || b.blockTried === b.kickFrom) return;
    const shooter = b.lastTouch;
    if (!shooter || shooter.team !== 'away' || b.vx > -7 || b.z > 30 || b.passTarget) return;
    const blocker = this.entities.find((e) => e.team === 'home' && !e.isPlayer && !e.isGK && !(e.stunTimer > 0) && Math.hypot(e.x - b.x, e.y - b.y) < 22);
    if (!blocker) return;
    b.blockTried = b.kickFrom;
    if (Math.random() > Math.max(0.25, 0.45 - Math.max(0, shooter.edge || 0) * 0.2)) return;
    b.vx = -b.vx * 0.3;
    b.vy = (Math.random() - 0.5) * 6;
    b.vz = 3;
    b.lastTouch = blocker;
    blocker.animState = 'slide';
    blocker.animTimer = 16;
    this.spawnParticles(blocker.x, blocker.y, 12, '#22c55e', 14);
    window.SFX?.tackle();
    this.impact(5);
    this.showBanner(`🧱 BLOQUEIO DE ${blocker.name.toUpperCase()}!`, 'O zagueiro se jogou na frente do chute!', '#22c55e', 55);
  },

  // Altura do chute mirado no gol: simula o voo (gravidade 0.24, arrasto 0.992) e, se a
  // bola fosse cruzar a linha acima de maxZ, baixa o vz para ela entrar por baixo do
  // travessão (antes o chute carregado no máximo sempre ia por cima)
  fitShotHeight(fromX, speed, dirX, vz, z0 = 0, maxZ = this.GOAL_HEIGHT * 0.86) {
    const dist = this.PITCH_HALF_X - fromX;
    if (dirX <= 0.05 || dist <= 0) return vz;
    const vx0 = speed * dirX;
    let x = 0;
    let n = 0;
    let vx = vx0;
    while (x < dist && n < 300) {
      x += vx;
      vx *= 0.992;
      n++;
    }
    const zAt = (v) => z0 + v * n - 0.12 * n * (n - 1);
    if (zAt(vz) <= maxZ) return vz;
    return (maxZ - z0 + 0.12 * n * (n - 1)) / n;
  },

  // Chute seu indo pro gol: guarda se o goleiro vai pegar (rolado no rollShotDirection)
  armKeeperRead(shot) {
    if (this.mode !== 'match') return;
    this.ball.gkSave = !shot.hit;
  },

  shootTowardMouse(chargeBonus = 0) {
    if (this.ball.owner !== this.playerEntity) {
      this.slideTackle();
      return;
    }
    const p = this.playerEntity;
    const target = this.screenToWorld(this.mouse.x, this.mouse.y);
    const dx = target.wx - p.x;
    const dy = target.wy - p.y;

    // Poder de Disparo deixa o chute mais forte: bola acima de ~15.8 o goleiro não segura
    const fx = this.getStatEffects();
    const speed = Math.min(fx.shotCap, fx.shotBase + chargeBonus * 0.07);
    const curveIn = this.getCurveInput();
    const acc = this.getShotAccuracy(p.x, p.y, null, chargeBonus, !!curveIn, this.flowShotBonus(p, chargeBonus));
    const shot = this.rollShotDirection(dx, dy, acc);
    const curved = this.getCurvedShot(shot.dirX, shot.dirY, Math.hypot(dx, dy), speed, curveIn);

    p.animState = 'shoot';
    p.animTimer = 24;
    p.facingRight = dx >= 0;
    // Som e peso do chute: quanto mais forte, mais "DOM" e mais a tela treme
    const power = Math.max(0, Math.min(1, (speed - 10) / 9));
    window.SFX?.kick(power);
    if (chargeBonus > 70) this.impact(4 + power * 6, 0, 3);
    // Chute com o Fluxo ligado: faixa dos olhos + campo escuro, e o lance congela
    // ~0,3 s para a faixa entrar antes de a bola sair
    if (this.flowState.active && this.startSpecialMoment) {
      this.startSpecialMoment(this.flowFx?.color || '#00f5d4', { eye: true, dur: 1300 });
      this.impact(8, 0.15, 18);
    }
    if (this.mode === 'match') {
      // No alvo = a mira cruza a linha do gol entre as traves
      const yAtGoal = dx > 0 ? p.y + (dy * (this.PITCH_HALF_X - p.x)) / dx : Infinity;
      const aimedIn = Math.abs(yAtGoal) < this.GOAL_HALF_WIDTH;
      this.matchStats.shots++;
      if (aimedIn) this.matchStats.onTarget++;
      this.rate(aimedIn ? 0.2 : -0.1, aimedIn ? 'CHUTE NO ALVO' : 'CHUTE PRA FORA');
    }

    this.ball.owner = null;
    this.ball.vx = curved.dirX * speed;
    this.ball.vy = curved.dirY * speed;
    this.ball.vz = 2.4 + (chargeBonus / 100) * 7.4;
    // Mirou dentro do gol: o chute carregado sobe, mas entra por baixo do travessão
    const yAtGoalLine = dx > 0 ? p.y + (dy * (this.PITCH_HALF_X - p.x)) / dx : Infinity;
    if (Math.abs(yAtGoalLine) < this.GOAL_HALF_WIDTH) this.ball.vz = this.fitShotHeight(p.x, speed, curved.dirX, this.ball.vz, this.ball.z || 0);
    this.ball.curve = 0;
    this.ball.spin = curved.spin;
    this.ball.passTarget = null;
    this.markKick(p);
    this.armKeeperRead(shot);
    this.ball.color = this.flowState.active ? (this.flowFx?.color || '#00f5d4') : curved.spin ? '#facc15' : '#38bdf8';
    if (curved.spin) {
      this.showBanner(curved.spin < 0 ? '🌀 CHUTE COLOCADO COM CURVA (Q)!' : '🌀 CHUTE COLOCADO COM CURVA (E)!', 'Bolas com efeito são mais difíceis para o goleiro!', '#facc15', 45);
    }

    this.spawnParticles(p.x, p.y, p.z + 10, this.ball.color, 18);
  },

  // ==========================================================================
  // BOTÃO DIREITO DO MOUSE: DAR PASSE!
  // ==========================================================================
  passBall() {
    const p = this.playerEntity;
    if (this.ball.owner !== p) {
      this.callForPass();
      return;
    }
    if (this.mode === 'match' && this.chapter.id === 'ch0_prologue' && !this.prologueChoiceTriggered && !this.tutorial) {
      this.prologueChoiceTriggered = true;
      window.App.triggerProloguePassCutscene();
      return;
    }

    const best = this.getPassReceiver();
    if (best) {
      this.kickPass(p, best, '#facc15');
      this.showBanner(`⚽ PASSE PARA ${best.name.toUpperCase()}!`, 'Aperte [R] quando quiser receber a bola de volta na tabela!', '#facc15', 55);
    }
  },

  // Companheiro que recebe o passe do botão direito: o mais perto da mira do mouse
  // (fica marcado com um anel no chão enquanto você está com a bola)
  getPassReceiver() {
    const target = this.screenToWorld(this.mouse.x, this.mouse.y);
    let best = null;
    let bestDist = Infinity;
    this.entities.forEach((m) => {
      if (m.team !== 'home' || m === this.playerEntity || m.isGK || m.stunTimer > 0) return;
      const d = Math.hypot(m.x - target.wx, m.y - target.wy);
      if (d < bestDist) {
        bestDist = d;
        best = m;
      }
    });
    return best;
  },

  // Passe rasteiro para um jogador: mira onde ele VAI estar (pela velocidade dele),
  // força proporcional à distância, e quem recebe domina a bola em qualquer velocidade
  kickPass(from, to, color = '#facc15') {
    const dist0 = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    // Seus passes saem mais rápidos com Visão (menos chance de o rival cortar no caminho)
    const vision = from.isPlayer ? this.getStatEffects().passSpeed : 0;
    const speed = Math.min(15 + vision, Math.max(8.5 + vision, dist0 / 24));
    // Quadros até a bola chegar, já contando o atrito do gramado (0.982 por quadro);
    // o passe longo vai pelo alto, onde quase não perde velocidade
    const ratio = Math.min(0.9, (dist0 * 0.018) / speed);
    const lead = dist0 > 600 ? dist0 / speed : Math.log(1 - ratio) / Math.log(0.982);
    const tx = Math.max(-this.PITCH_HALF_X + 20, Math.min(this.PITCH_HALF_X - 20, to.x + (to.vx || 0) * lead));
    const ty = Math.max(-this.PITCH_HALF_Y + 15, Math.min(this.PITCH_HALF_Y - 15, to.y + (to.vy || 0) * lead));
    const dx = tx - from.x;
    const dy = ty - from.y;
    const d = Math.hypot(dx, dy) || 1;
    from.animState = 'shoot';
    from.animTimer = 16;
    from.facingRight = dx >= 0;
    if (from.isGK) from.saveLock = 40;
    if (from.team === 'home') window.SFX?.pass();
    if (from.isPlayer && this.mode === 'match') {
      this.matchStats.passes++;
      this.rate(0.05, 'PASSE');
    }
    this.ball.owner = null;
    this.ball.x = from.x;
    this.ball.y = from.y;
    this.ball.vx = (dx / d) * speed;
    this.ball.vy = (dy / d) * speed;
    // Passe longo vai pelo alto (no ar a bola perde menos velocidade e chega lá)
    this.ball.vz = dist0 > 600 ? Math.min(7, 3.5 + (dist0 - 600) / 250) : 2.2;
    this.ball.curve = 0;
    this.ball.spin = 0;
    this.ball.color = color;
    this.ball.passTarget = to;
    this.ball.passAim = { x: tx, y: ty };
    this.ball.passTimer = 150;
    this.markKick(from);
  },

  // Quem acabou de tocar na bola não a "pega de volta" no mesmo instante
  markKick(ent) {
    this.ball.lastTouch = ent;
    this.ball.special = false;
    this.ball.kickGrace = 12;
    this.ball.kickFrom = { x: ent.x, y: ent.y };
    this.ball.gkSave = false;
  },

  // Goleiro repõe a bola: o seu toca para você, o rival para o companheiro mais livre
  goalkeeperDistribute(gk) {
    const mates = this.entities.filter((e) => e.team === gk.team && !e.isGK && !(e.stunTimer > 0));
    if (!mates.length) return;
    let target = this.playerEntity;
    if (gk.team !== 'home') {
      const opponents = this.entities.filter((e) => e.team !== gk.team);
      const freeness = (m) => Math.min(...opponents.map((o) => Math.hypot(o.x - m.x, o.y - m.y)));
      target = mates.slice().sort((a, b) => freeness(b) - freeness(a))[0];
    }
    this.kickPass(gk, target, '#ffffff');
  },

  useWeaponSkill(key) {
    if (this.chapter?.id === 'ch0_prologue') {
      this.showBanner('ARMA BLOQUEADA NO PRÓLOGO!', 'Você começa do ZERO e só gira sua Arma ao entrar no Blue Lock!', '#ef4444', 70);
      return;
    }
    if (this.skillCooldowns[key] > 0) return;

    let weapon;
    let skill;
    const copied = this.copiedSkill;
    if (key === 'v') {
      // Passiva Camaleão (Reo): a skill que você copiou do rival, uma vez (tecla V; o C é a Reação Química)
      if (!copied) {
        this.showBanner('NADA COPIADO AINDA', 'Espere um rival usar uma skill: o Camaleão copia na hora.', '#a855f7', 55);
        return;
      }
      weapon = { name: `CÓPIA DE ${copied.from.toUpperCase()}` };
      skill = copied.skill;
    } else {
      const isSecondary = ['4', '5', '6'].includes(key);
      weapon = isSecondary ? this.playerState.equippedWeapon2 : this.playerState.equippedWeapon;
      if (!weapon) {
        this.showBanner('NENHUMA ARMA EQUIPADA!', 'Vá na aba ARMAS e gire na Roleta para conseguir sua Arma!', '#f59e0b', 70);
        return;
      }
      skill = weapon.skills[isSecondary ? parseInt(key, 10) - 4 : parseInt(key, 10) - 1];
    }
    if (!skill) return;
    if ((skill.type === 'shot' || skill.type === 'pass') && this.ball.owner !== this.playerEntity) {
      this.showBanner('VOCÊ PRECISA ESTAR COM A BOLA!', `Peça a bola com [R] ou roube com [F] antes de usar ${skill.type === 'pass' ? 'um passe' : 'um chute'} especial.`, '#f59e0b', 55);
      return;
    }

    // (a cópia do Camaleão recarrega como a skill copiada, no mínimo 6 s: antes era 1 s e
    // dava para usar 5-7 skills copiadas por minuto)
    this.skillCooldowns[key] = key === 'v' ? Math.max(360, (skill.cd || 0) * 60) : skill.cd * 60;
    if (key === 'v') this.copiedSkill = null;
    this.matchStats.skills++;
    const p = this.playerEntity;
    const target = this.screenToWorld(this.mouse.x, this.mouse.y);
    const dx = target.wx - p.x;
    const dy = target.wy - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;

    window.App.unlockAchievement('ach_yukimiya_style');

    if (skill.type === 'dribble') {
      // drible assinatura gasta fôlego como o do ESPAÇO
      if (!this.spendStamina(6, 'driblar')) {
        this.skillCooldowns[key] = 0;
        if (key === 'v') this.copiedSkill = copied;
        return;
      }
      const chance = this.getDribbleChance((skill.power || 1) * 8);
      const success = Math.random() * 100 < chance;
      this.dribbleChain = Math.min(4, this.dribbleChain + 1);
      this.dribbleChainTimer = 300;
      p.animState = 'rabona';
      p.animTimer = 38;
      const withBall = this.dribbleCanTake(p);
      if (withBall) {
        this.ball.owner = p;
        this.ball.z = 0;
      }
      // Cada drible assinatura tem o seu movimento (move): zigue-zague do Barou, giro do
      // Bachira, arrancada do Chigiri, pulo do Nagi/Shidou, ombro do Kunigami
      const move = skill.move || 'straight';
      const frames = move === 'zigzag' ? 26 : move === 'burst' ? 18 : 14;
      const reach = 155 * (skill.power * 0.55) * (success ? 1 : 0.4) * (move === 'burst' ? 1.5 : move === 'zigzag' ? 1.25 : 1);
      this.startDash(dirX, dirY, reach, frames, move, success ? skill.color : null);
      p.vz = move === 'hop' ? 6.5 : 3.5;
      if (success && !withBall) {
        // sem a bola é só a arrancada: ninguém cai numa finta sem bola
        window.SFX?.whoosh();
        this.showBanner(`${skill.name.toUpperCase()} (SEM A BOLA)`, 'Só a arrancada: o drible derruba marcadores quando a bola está no seu pé.', skill.color, 60);
      } else if (success) {
        const victims = [];
        const readers = [];
        window.SFX?.whoosh();
        this.matchStats.dribbles++;
        this.rate(0.25, skill.name.toUpperCase());
        this.dribbleInvulnTimer = frames + 16;
        this.entities.forEach((e) => {
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (e.team === 'away' && !e.isGK && d < 120) {
            // World Class às vezes leem a finta (como no drible do ESPAÇO)
            if ((e.edge || 0) > 0.5 && Math.random() < e.edge * 0.5) {
              readers.push(e.name.split(' ')[0]);
              return;
            }
            e.stunTimer = Math.round(50 * (this.flowFxVal('dribble_stun') || 1));
            if (this.ball.owner === e) Object.assign(this.ball, { owner: null, vx: 0, vy: 0, z: 0 });
            victims.push(e);
            // Ombro: o marcador é empurrado para longe
            if (move === 'shield') {
              e.x += ((e.x - p.x) / (d || 1)) * 70;
              e.y += ((e.y - p.y) / (d || 1)) * 70;
              e.animState = 'dive';
              e.animTimer = 30;
            }
          }
        });
        this.breakAnkles(victims);
        this.spawnParticles(p.x, p.y, 15, skill.color, 28);
        if (readers.length && !victims.length) this.showBanner(`👁️ ${readers.join(' e ').toUpperCase()} NÃO CAIU NA FINTA!`, 'Jogadores World Class leem dribles. Evolua sua Condução!', '#f59e0b', 70);
        else this.showBanner(`${weapon.name.toUpperCase()}: ${skill.name.toUpperCase()}! (${chance}%)`, skill.desc, skill.color, 80);
      } else {
        this.showBanner(`❌ ${skill.name.toUpperCase()} FALHOU! (${chance}% de chance)`, 'Os marcadores não caíram. Evolua Condução e Velocidade!', '#ef4444', 70);
        this.rate(-0.15, 'DRIBLE FALHOU');
      }
    } else if (skill.type === 'shot') {
      const isAcrobatic =
        skill.name.toLowerCase().includes('bicicleta') ||
        skill.name.toLowerCase().includes('big bang') ||
        skill.name.toLowerCase().includes('dragon') ||
        skill.name.toLowerCase().includes('voleio') ||
        skill.name.toLowerCase().includes('escorpião');

      p.animState = isAcrobatic ? 'bicycle' : 'shoot';
      p.animTimer = 36;
      if (isAcrobatic) {
        p.z = 28;
        p.vz = 4.5;
      }

      const acc = this.getShotAccuracy(p.x, p.y, skill, 0, false, this.flowShotBonus(p, 0));
      this.ball.owner = null;
      this.ball.z = p.z + 10;
      const targetX = this.PITCH_HALF_X;
      const targetY = dy > 0 ? 58 : -58;
      const shot = this.rollShotDirection(targetX - p.x, targetY - p.y, acc);
      const shotSpeed = 16.5 * Math.min(1.5, skill.power * 0.6) * this.getStatEffects().skillPower;

      this.ball.vx = shot.dirX * shotSpeed;
      this.ball.vy = shot.dirY * shotSpeed;
      this.ball.vz = this.fitShotHeight(p.x, shotSpeed, shot.dirX, 5.6, this.ball.z);
      this.ball.curve =
        skill.name.toLowerCase().includes('gyro') ||
        skill.name.toLowerCase().includes('magnus') ||
        skill.name.toLowerCase().includes('curva') ||
        skill.name.toLowerCase().includes('trivela')
          ? dy > 0 ? -0.18 : 0.18
          : 0;
      this.ball.color = skill.color;
      this.markKick(p);
      this.armKeeperRead(shot);
      this.spawnParticles(p.x, p.y, p.z + 16, skill.color, 35);
      window.SFX?.kick(1);
      // momento de anime: campo escuro; a faixa dos olhos só entra se o Fluxo estiver
      // ligado (aí o lance congela ~0,3 s para a faixa entrar antes de a bola sair)
      const flowEye = !!(this.flowState.active && this.startSpecialMoment);
      if (this.startSpecialMoment) this.startSpecialMoment(flowEye ? this.flowFx?.color || skill.color : skill.color, { eye: flowEye, dur: 1300 });
      this.impact(10, 0.2, flowEye ? 18 : 5);
      this.matchStats.shots++;
      this.matchStats.onTarget++;
      this.rate(0.25, 'CHUTE ESPECIAL');
      this.showBanner(`DISPARO ESPECIAL: ${skill.name.toUpperCase()}! (${acc}%)`, skill.desc, skill.color, 90);
    } else if (skill.type === 'buff') {
      // Transe/estado especial: alguns segundos mais rápido e driblando melhor (com aura)
      // (antes durava 180 + power×60 e dava +25 de fôlego: com recarga rápida ficava ligado
      // 90% do tempo e o fôlego nunca acabava)
      p.buffTimer = Math.round(180 + (skill.power || 1) * 30);
      p.buffColor = skill.color;
      if (this.startSpecialMoment) this.startSpecialMoment(skill.color, { dur: 1100 });
      this.stamina = Math.min(100, this.stamina + 10);
      this.spawnParticles(p.x, p.y, 10, skill.color, 30);
      this.addBubble(p, 'AGORA!', skill.color, 60);
      this.showBanner(`${skill.name.toUpperCase()}!`, `${skill.desc} (${Math.round(p.buffTimer / 60)}s)`, skill.color, 75);
    } else if (skill.type === 'defense') {
      // Bote especial: avança em quem está com a bola (ou na bola solta) e tenta roubar.
      // Antes roubava sempre, de até ~290 px (até do Loki): agora tem chance e alcance menor
      const reach = 120 + (skill.power || 1) * 25;
      const owner = this.ball.owner;
      const target = owner && owner.team === 'away' && !owner.isGK ? owner : !owner ? this.ball : null;
      const tDist = target ? Math.hypot(target.x - p.x, target.y - p.y) : Infinity;
      if (!target || tDist > reach) {
        this.skillCooldowns[key] = 60;
        if (key === 'v') this.copiedSkill = copied;
        this.showBanner(`${skill.name.toUpperCase()}: NINGUÉM NO ALCANCE`, 'Chegue mais perto de quem está com a bola.', '#f59e0b', 50);
        return;
      }
      p.animState = 'slide';
      p.animTimer = 22;
      this.skillCooldowns[key] = Math.max(this.skillCooldowns[key], 420);
      this.startDash((target.x - p.x) / tDist, (target.y - p.y) / tDist, tDist, 10, 'straight', skill.color);
      if (owner) {
        const stealChance = Math.max(0.25, Math.min(0.85, 0.55 + (skill.power || 1) * 0.08 + this.getStatEffects().slideBonus * 0.5 - Math.max(0, owner.edge || 0) * 0.35));
        if (Math.random() >= stealChance) {
          this.addBubble(owner, 'ESCAPEI!', '#22c55e', 45);
          this.rate(-0.1, 'BOTE FALHOU');
          this.spawnParticles(p.x, p.y, 6, skill.color, 14);
          this.showBanner(`❌ ${skill.name.toUpperCase()}: ${owner.name.split(' ')[0].toUpperCase()} ESCAPOU!`, `Chance de roubo: ${Math.round(stealChance * 100)}% • Evolua Força e Posicionamento.`, '#ef4444', 65);
          return;
        }
        owner.stunTimer = Math.round(70 * (this.flowFxVal('tackle_stun') || 1));
        this.addBubble(owner, 'QUÊ?!', '#ef4444', 50);
      }
      this.ball.owner = p;
      this.ball.z = 0;
      window.SFX?.tackle();
      if (owner) {
        this.matchStats.steals++;
        this.rate(0.3, 'ROUBO');
      }
      this.spawnParticles(p.x, p.y, 10, skill.color, 25);
      this.showBanner(`${skill.name.toUpperCase()}!`, skill.desc, skill.color, 75);
    } else if (skill.type === 'pass') {
      // Passe especial: rápido, para o companheiro mais adiantado; "tabela" volta pra você
      const mates = this.entities.filter((m) => m.team === 'home' && !m.isPlayer && !m.isGK && !(m.stunTimer > 0));
      const mate = mates.sort((a, b) => b.x - a.x)[0];
      if (!mate) return;
      this.kickPass(p, mate, skill.color);
      this.ball.vx *= 1.3;
      this.ball.vy *= 1.3;
      this.ball.passTimer = 200;
      if (/tabela/i.test(skill.name)) {
        this.oneTwo = { mate, timer: 0 };
        this.addBubble(p, 'TABELA!', skill.color, 50);
      }
      this.spawnParticles(p.x, p.y, 10, skill.color, 20);
      this.showBanner(`${skill.name.toUpperCase()}!`, skill.desc, skill.color, 75);
    }
  },

  activateFlow() {
    if (this.chapter?.id === 'ch0_prologue') {
      this.showBanner('FLUXO BLOQUEADO NO PRÓLOGO!', 'Entre para o Blue Lock para girar seu Fluxo!', '#ef4444', 70);
      return;
    }
    // Os dois slots juntos (o 2º só conta na NEL em diante)
    const st = this.playerState;
    const flow = window.combineFlows([st.equippedFlow, st.nelUnlocked ? st.equippedFlow2 : null]);
    if (!flow) {
      this.showBanner('NENHUM FLUXO EQUIPADO!', 'Gire seu Fluxo na aba FLUXO!', '#f59e0b', 70);
      return;
    }
    if (this.flowState.active) return;
    if (this.flowState.charge < 100) {
      this.showBanner('O FLUXO AINDA NÃO DESPERTOU', `Carga: ${Math.floor(this.flowState.charge)}% — precisa da barra cheia (100%). Ego alto e gols carregam mais rápido.`, '#f59e0b', 70);
      return;
    }
    this.flowState.active = true;
    this.flowState.timer = (flow.duration || 10) * 60;
    this.flowState.charge = 0;
    this.flowState.readyShown = false;
    this.flowFx = flow;
    this.flowFirstShotUsed = false;
    this.mouse.down = false;
    this.keys = {};
    window.SFX?.jingle([392, 523, 659, 784, 1047], 0, 'sawtooth');
    // Cutscene do despertar (a partida fica parada enquanto ela passa); o Fluxo conta depois
    const done = () => {
      this.spawnParticles(this.playerEntity.x, this.playerEntity.y, 20, flow.color, 50);
      this.showBanner(`FLUXO: ${flow.name.toUpperCase()}!`, window.describeFlow?.(flow) || flow.desc, flow.color, 110);
      // a cena do despertar já teve os olhos: aqui o campo escurece e o emblema do ego
      // entra grande atrás de você
      if (this.startSpecialMoment) this.startSpecialMoment(flow.color, { emblem: true, dur: 1200 });
      this.impact(8, 0.35, 4);
      this.lastTimerTick = performance.now();
    };
    if (window.CutsceneEngine?.playFlowCutscene) {
      window.CutsceneEngine.playFlowCutscene({ flow, you: this.playerEntity.charData, youName: this.playerEntity.name }, done);
    } else {
      done();
    }
  },

  triggerChemicalReaction() {
    if (this.chapter?.id === 'ch0_prologue') {
      this.showBanner('REAÇÃO QUÍMICA BLOQUEADA NO PRÓLOGO!', 'Entre no Blue Lock primeiro!', '#ef4444', 70);
      return;
    }
    if (this.chemCharge < 60) {
      this.showBanner('SINERGIA QUÍMICA CARREGANDO!', `Precisa de 60% (Atual: ${Math.floor(this.chemCharge)}%)`, '#f59e0b', 60);
      return;
    }
    // A reação é uma tabela: você toca, o parceiro devolve e você finaliza. Sem a bola não tem tabela.
    if (this.ball.owner !== this.playerEntity) {
      this.showBanner('VOCÊ PRECISA ESTAR COM A BOLA!', 'A Reação Química é uma tabela com o parceiro: peça a bola com [R] ou roube com [F] primeiro.', '#f59e0b', 55);
      return;
    }
    // Só dentro da grande área rival (antes ela teleportava você para a cara do gol de qualquer lugar)
    if (!this.inRivalBox(this.playerEntity)) {
      this.showBanner('SÓ DENTRO DA ÁREA!', 'A Reação Química é a tabela final: leve a bola até a grande área rival (ela brilha em rosa) e aperte [C].', '#ec4899', 70);
      return;
    }
    this.chemCharge = 0;
    const mates = this.entities.filter((e) => e.team === 'home' && !e.isPlayer && !e.isGK);
    // O parceiro da reação é o companheiro com quem você tem a maior relação
    const aff = window.App.state.affinities;
    // O rival mortal (o Rin, depois do vestiário da Sub-20) nunca faz tabela com você
    const willing = mates.filter((m) => !window.App.isMortalRival?.(m.id));
    const partner = (willing.length ? willing : mates).slice().sort((a, b) => (aff[b.id] ?? 50) - (aff[a.id] ?? 50))[0];
    if (!partner) return;
    // Quanto mais química com o parceiro, mais forte e mais no alvo sai a finalização
    const chem = Math.max(0, Math.min(100, aff[partner.id] ?? 50)) / 100;

    window.App.unlockAchievement('ach_chem_shidou');
    window.SFX?.whoosh();
    window.SFX?.jingle([659, 784, 988, 1319], 0.1);

    // A jogada acontece de onde você está: o parceiro aparece de frente para a tabela
    const p = this.playerEntity;
    partner.x = Math.max(this.PITCH_HALF_X - 520, p.x - 170);
    partner.y = p.y > 0 ? p.y - 130 : p.y + 130;
    partner.animState = 'shoot';
    partner.animTimer = 35;

    p.z = 38;
    p.vz = 4.5;
    p.animState = 'bicycle';
    p.animTimer = 45;

    const onTarget = Math.random() < 0.7 + chem * 0.25;
    // O goleiro pode pegar: a finalização rola o acerto como um chute de verdade (com bônus
    // pela química). Antes a bola saía sem leitura do goleiro: 39 gols em 40 no Egoísta
    const chemAcc = this.getShotAccuracy(p.x, p.y, null, 0, false, 40 + chem * 20);
    const side = p.y > 0 ? -1 : 1;
    const ty = onTarget ? side * this.GOAL_HALF_WIDTH * (0.45 + Math.random() * 0.4) : side * (this.GOAL_HALF_WIDTH + 30);
    const dx = this.PITCH_HALF_X - p.x;
    const dy = ty - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = 15.5 + chem * 3;

    this.ball.owner = null;
    this.ball.x = p.x;
    this.ball.y = p.y;
    this.ball.z = 42;
    this.ball.vx = (dx / d) * speed;
    this.ball.vy = (dy / d) * speed;
    this.ball.vz = 2.6;
    this.ball.color = partner.charData.auraColor || '#ec4899';
    this.markKick(p);
    this.armKeeperRead({ hit: onTarget && Math.random() * 100 < chemAcc });
    this.ball.special = true;

    // a tabela tira de jogada só os marcadores por perto (nunca o goleiro)
    this.entities.forEach((e) => {
      if (e.team === 'away' && !e.isGK && Math.hypot(e.x - p.x, e.y - p.y) < 250) e.stunTimer = 50;
    });

    this.spawnParticles(partner.x, partner.y, 15, partner.charData.auraColor || '#ec4899', 35);
    this.spawnParticles(p.x, p.y, 40, '#00f5d4', 45);
    // Cutscene da reação (o jogo fica pausado); quando ela acaba a bola já está voando pro gol
    this.mouse.down = false;
    // Quem leva o drible/trombada na cutscene: o marcador rival mais perto
    const marker = this.entities
      .filter((e) => e.team === 'away' && !e.isGK)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    window.CutsceneEngine.playChemCutscene(
      {
        partner: partner.charData,
        defender: marker?.charData,
        partnerName: partner.name,
        you: p.charData,
        youName: p.name,
        sign: this.getMapColors(this.chapter.mapTheme).signText
      },
      () => window.App.showChemicalCutsceneOverlay(partner.charData, this.playerState)
    );
  },

  // ==========================================================================
  // IA DOS COMPANHEIROS: cada um tem seu corredor (pela posição inicial) e se
  // posiciona pela BOLA, não copiando você. Um deles pressiona e desarma; com a
  // bola eles conduzem, tocam para quem está livre e finalizam (às vezes com a
  // habilidade assinatura).
  // ==========================================================================
  // Zona de chegada com folga: quem chegou no lugar só volta a andar quando o alvo se
  // afasta de verdade (antes ele alternava correr/parar e virava o corpo todo quadro —
  // o companheiro "tremia" quando você ficava parado perto dele)
  // slack = folga da zona de chegada (0 = vai certinho no alvo, ex: atrás da bola)
  moveEntity(ent, tx, ty, spd, slack = 34) {
    const dx = tx - ent.x;
    const dy = ty - ent.y;
    const d = Math.hypot(dx, dy);
    if (ent.arrived && d < slack) {
      ent.vx = 0;
      ent.vy = 0;
      if (ent.animTimer <= 0) ent.animState = 'idle';
      return;
    }
    ent.arrived = d <= 8;
    if (!ent.arrived) {
      const step = Math.min(spd, d);
      ent.vx = (dx / d) * step;
      ent.vy = (dy / d) * step;
      ent.x = Math.max(-this.PITCH_HALF_X + 15, Math.min(this.PITCH_HALF_X - 15, ent.x + ent.vx));
      ent.y = Math.max(-this.PITCH_HALF_Y + 12, Math.min(this.PITCH_HALF_Y - 12, ent.y + ent.vy));
      if (Math.abs(dx) > 10) ent.facingRight = dx >= 0;
      if (ent.animTimer <= 0) ent.animState = 'run';
    } else {
      ent.vx = 0;
      ent.vy = 0;
      if (ent.animTimer <= 0) ent.animState = 'idle';
    }
  },

  // Pique dos jogadores do computador (antes só você corria com SHIFT e era sempre o mais
  // rápido). Eles têm fôlego próprio: no pique gastam, quando zera trotam 2 s e recuperam.
  // Pique forte só de quem está COM A BOLA; quem vem marcar ganha só um empurrão leve
  // (todo mundo no pique ao mesmo tempo ficava estranho). Devolve o multiplicador.
  // chase: o seu defensor indo no rival com a bola dá o pique INTEIRO (igual ao do rival),
  // senão o rival que arrancava com a bola nunca era alcançado
  aiSprint(ent, wants, withBall = false, chase = false) {
    if (ent.sta === undefined) ent.sta = 60 + Math.random() * 40;
    if (ent.sprintRest > 0) ent.sprintRest--;
    if (wants && ent.sta > 0 && !(ent.sprintRest > 0)) {
      ent.sta -= withBall || chase ? 0.4 : 0.25;
      if (ent.sta <= 0) ent.sprintRest = 120;
      ent.sprinting = withBall || chase;
      const rivalFull = this.difficultyMode().rivalSprint ?? 1.42;
      const full = ent.team === 'away' ? rivalFull : chase ? Math.max(1.35, rivalFull) : 1.35;
      if (!withBall && !chase) return 1 + (full - 1) * 0.3;
      // Poeirinha no pé de quem arrancou com a bola (e do seu defensor no pique atrás dele)
      if ((this.frame + (ent.number || 0)) % 9 === 0) this.spawnParticles(ent.x, ent.y, 2, chase ? 'rgba(134,239,172,0.7)' : 'rgba(226,232,240,0.7)', 2);
      return full;
    }
    ent.sprinting = false;
    ent.sta = Math.min(100, ent.sta + 0.3);
    return 1;
  },

  // O que cada um grita quando está livre e quer a bola
  CALL_LINES: {
    bachira: 'VEM, PARCEIRO!',
    shidou: 'TOCA! BIG BANG!',
    rin: 'PASSA, IDIOTA.',
    nagi: 'Que preguiça... toca.',
    barou: 'A BOLA É DO REI!',
    kunigami: 'TÔ AQUI, HERÓI!',
    chigiri: 'NA VELOCIDADE!',
    sae: 'Agora.',
    kaiser: 'Me dá a coroa.',
    hiori: 'Olha o espaço!',
    kurona: 'Órbita, órbita!',
    reo: 'TÔ LIVRE, VAI!',
    yukimiya: 'Aqui, comigo!',
    gagamaru: 'HMM? AQUI!'
  },

  // Companheiro livre e à frente de você pede a bola (balão + braço levantado)
  teammateAskForBall(ent, p) {
    if (ent.callCd > 0) {
      ent.callCd--;
      return;
    }
    if (this.ball.owner !== p || ent.x < p.x + 60 || Math.random() > 0.02) return;
    const free = !this.entities.some((f) => f.team === 'away' && !f.isGK && Math.hypot(f.x - ent.x, f.y - ent.y) < 140);
    if (!free) return;
    ent.callCd = 300;
    ent.animState = 'call_pass';
    ent.animTimer = 40;
    const generic = ['AQUI!', 'TÔ LIVRE!', 'PASSA!', 'NA FRENTE!'];
    this.addBubble(ent, this.CALL_LINES[ent.id] || generic[Math.floor(Math.random() * generic.length)], ent.charData.auraColor || '#facc15', 80);
  },

  updateTeammate(ent, p, isChaser, isCover = false) {
    const b = this.ball;
    if (ent.tackleCd > 0) ent.tackleCd--;
    if (this.mode === 'match' && this.chapter?.id !== 'ch0_prologue') this.teammateAskForBall(ent, p);
    if (b.owner === ent) {
      this.teammateWithBall(ent, p);
      return;
    }
    ent.holdTimer = 0;
    let tx;
    let ty;
    let spd = ent.speed;
    const goingForBall = b.passTarget === ent || isChaser;
    // Rival com a bola: quem vai nele (e o zagueiro, quando o rival já passou da linha
    // dele) corre no pique inteiro para recuperar
    const rivalCarrier = b.owner && b.owner.team === 'away' && !b.owner.isGK;
    // Perseguidor no pique só quando o rival já passou dele (correndo atrás); de frente ele
    // fecha o caminho sem se jogar. O zagueiro dispara para ficar ENTRE a bola e o gol
    const hardChase = rivalCarrier && ((isChaser && b.x < ent.x + 10) || isCover || (ent.role === 'back' && b.x < ent.x + 200));
    const coverRun = hardChase && !isChaser;
    // Indo na bola ou buscando o passe, o companheiro dá pique também
    spd *= this.aiSprint(ent, (goingForBall || hardChase) && Math.hypot(b.x - ent.x, b.y - ent.y) > 40, false, hardChase);
    // No pique atrás do rival, iguala a velocidade base dele (no Egoísta os rivais são 17%
    // mais rápidos e o seu zagueiro nunca alcançava)
    if (hardChase && ent.sprinting) spd *= Math.min(1.3, Math.max(1, (b.owner.speed || ent.speed) / ent.speed));
    if (b.passTarget === ent) {
      // Corre para o ponto onde o passe vai chegar; com a bola já perto, vai nela
      const close = Math.hypot(b.x - ent.x, b.y - ent.y) < 120 || !b.passAim;
      tx = close ? b.x : b.passAim.x;
      ty = close ? b.y : b.passAim.y;
      spd *= 1.15;
    } else if (isChaser) {
      tx = b.x;
      ty = b.y;
      spd *= 1.08;
    } else {
      const lane = ent.homeY < -100 ? -1 : ent.homeY > 100 ? 1 : 0;
      const wobble = Math.sin(this.frame * 0.02 + ent.number) * 40;
      if (coverRun) {
        // Zagueiro de recuperação: corre para a frente de quem está com a bola (lado do gol);
        // já posicionado, sai no bote
        const goalSide = ent.x < b.x - 40 && Math.abs(ent.y - b.y) < 60;
        tx = goalSide ? b.x - 18 : Math.max(-this.PITCH_HALF_X + 140, b.x - 140);
        ty = goalSide ? b.y : b.y * 0.85;
      } else if (ent.role === 'back') {
        // Zagueiro (7 contra 7): segura a linha atrás da bola, no lado dele
        const attacking = b.owner && b.owner.team === 'home';
        tx = Math.min(b.x - (attacking ? 420 : 300), attacking ? 200 : -350) + wobble * 0.3;
        ty = ent.homeY + b.y * 0.3;
      } else if (b.owner && b.owner.team === 'home') {
        // Ataque: abre o campo à frente da bola, cada um no seu corredor (o do meio dá apoio atrás)
        tx = b.x + (lane === 0 ? -180 : 240) + wobble;
        ty = lane === 0 ? b.y * 0.3 + wobble : lane * 250 + wobble * 0.5;
      } else {
        // Defesa: recua entre a bola e o próprio gol fechando o corredor
        tx = b.x - 260 + wobble * 0.5;
        ty = lane * 170 + b.y * 0.35;
      }
      // Não fica grudado em você: desvia sempre para o lado do corredor dele (antes o lado
      // era escolhido a cada quadro e ele ficava indo e voltando quando você parava)
      const dp = Math.hypot(tx - p.x, ty - p.y);
      if (dp < 150) ty += (ent.homeY >= 0 ? 1 : -1) * (150 - dp);
      tx = Math.max(-this.PITCH_HALF_X + 120, Math.min(this.PITCH_HALF_X - 150, tx));
      ty = Math.max(-this.PITCH_HALF_Y + 40, Math.min(this.PITCH_HALF_Y - 40, ty));
    }
    this.moveEntity(ent, tx, ty, spd, goingForBall || hardChase ? 0 : 34);

    // Desarme no rival com a bola
    const owner = b.owner;
    // Avisa quando sai no pique atrás do rival
    if (hardChase && !ent.chaseCalled) {
      ent.chaseCalled = true;
      this.addBubble(ent, 'DEIXA COMIGO!', '#22c55e', 50);
    } else if (!hardChase) {
      ent.chaseCalled = false;
    }
    // Quem chega no pique dá o bote mais firme e mais vezes
    if (owner && owner.team === 'away' && !owner.isGK && !(ent.tackleCd > 0) && Math.hypot(b.x - ent.x, b.y - ent.y) < (hardChase ? 30 : 26) && b.z < 26) {
      ent.tackleCd = hardChase ? 32 : 42;
      if (Math.random() < Math.max(hardChase ? 0.38 : 0.26, (hardChase ? 0.55 : 0.45) - Math.max(0, owner.edge || 0) * 0.2)) {
        ent.animState = 'slide';
        ent.animTimer = 18;
        owner.stunTimer = 30;
        b.owner = ent;
        b.z = 0;
        this.spawnParticles(ent.x, ent.y, 6, '#22c55e', 12);
        this.showBanner(`🛡️ ${ent.name.toUpperCase()} ROUBOU A BOLA!`, 'Aperte [R] para pedir o passe dele!', '#22c55e', 55);
      }
    }
  },

  teammateWithBall(ent, p) {
    ent.holdTimer = (ent.holdTimer || 0) + 1;
    const foes = this.entities.filter((e) => e.team === 'away' && !e.isGK && !(e.stunTimer > 0));
    const dist = (a, c) => Math.hypot(a.x - c.x, a.y - c.y);
    const near = foes.slice().sort((a, c) => dist(a, ent) - dist(c, ent))[0];
    const nd = near ? dist(near, ent) : Infinity;

    // Conduz rumo ao gol, desviando do marcador que está na frente
    let ty = ent.y * 0.9;
    if (near && nd < 150 && near.x > ent.x - 20) ty = ent.y + (ent.y >= near.y ? 1 : -1) * 120;
    // Com a bola e campo livre pela frente, o companheiro também arranca no pique
    this.moveEntity(ent, ent.x + 120, ty, ent.speed * 0.92 * this.aiSprint(ent, nd > 120 && ent.x < this.PITCH_HALF_X - 400, true));

    // [R] pedindo a bola: toca na hora
    if (this.callPassRequested) {
      this.callPassRequested = false;
      this.kickPass(ent, p, '#00f5d4');
      return;
    }
    if (ent.holdTimer % 15 !== 0) return; // decide umas 4x por segundo

    const prologue = this.chapter?.id === 'ch0_prologue';
    const canShoot = this.mode === 'match' && !prologue;
    if (!canShoot && ent.holdTimer > 45) {
      this.kickPass(ent, p, '#00f5d4');
      return;
    }
    const distGoal = Math.hypot(this.PITCH_HALF_X - ent.x, ent.y);
    // Chuta de perto quase sempre e, de um pouco mais longe, às vezes (antes só a menos de
    // 700 e quase nunca chegava lá: os companheiros davam 0 chutes com você parado)
    const shootChance = distGoal < 700 ? 0.5 : distGoal < 880 ? 0.15 : 0;
    if (canShoot && shootChance && (Math.random() < shootChance || (nd < 60 && distGoal < 700))) {
      this.teammateShoot(ent);
      return;
    }
    const freeness = (m) => Math.min(9999, ...foes.map((f) => dist(f, m)));
    const options = [p, ...this.entities.filter((e) => e.team === 'home' && !e.isPlayer && !e.isGK && e !== ent)];
    // Valor de um passe: livre e mais à frente (para trás só quando não tem outro jeito)
    const passScore = (m) => Math.min(400, freeness(m)) + (m.x - ent.x) * 0.6 + (m === p ? 40 : 0);
    if (nd < 55 || ent.holdTimer > 210) {
      // Pressionado de verdade: toca para a melhor opção (antes, a 70 já tocava para o mais
      // livre — quase sempre para trás — e o time nunca passava do meio)
      this.kickPass(ent, options.sort((a, c) => passScore(c) - passScore(a))[0]);
      return;
    }
    // Toque para frente: alguém mais adiantado e livre (você tem preferência)
    const ahead = options.filter((m) => m.x > ent.x + 120 && freeness(m) > 100);
    if (ahead.length && Math.random() < 0.4) {
      this.kickPass(ent, ahead.includes(p) ? p : ahead[0]);
    }
  },

  // Finalização do companheiro: às vezes com a habilidade assinatura dele
  teammateShoot(ent) {
    const sig = Math.random() < 0.4 ? this.getSignatureShot(ent) : null;
    const side = Math.random() < 0.5 ? -1 : 1;
    const onTarget = Math.random() < (sig ? 0.72 : 0.58);
    const ty = onTarget ? side * this.GOAL_HALF_WIDTH * (0.35 + Math.random() * 0.5) : side * (this.GOAL_HALF_WIDTH + 25 + Math.random() * 70);
    const dx = this.PITCH_HALF_X - ent.x;
    const dy = ty - ent.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = sig ? 16.8 : 15;
    ent.animState = 'shoot';
    ent.animTimer = 22;
    ent.facingRight = true;
    this.ball.owner = null;
    this.ball.vx = (dx / d) * speed;
    this.ball.vy = (dy / d) * speed;
    this.ball.vz = 2.2 + Math.random() * 3.5;
    this.ball.curve = 0;
    this.ball.spin = 0;
    this.ball.color = sig ? sig.color : '#38bdf8';
    this.markKick(ent);
    if (sig) {
      this.spawnParticles(ent.x, ent.y, 16, sig.color, 26);
      this.showBanner(`⚡ ${ent.name.toUpperCase()}: ${sig.skillName.toUpperCase()}!`, sig.weaponName, sig.color, 70);
    }
  },

  // Flashback do rival quando ele fica atrás no placar (chapter.losingFlashback, ex: a
  // promessa de Loki e Hugo na final). Toca uma vez; depois o rival desperta.
  checkLosingFlashback() {
    const fb = this.chapter?.losingFlashback;
    if (!fb || this.flashbackDone || this.tutorial || this.scoreHome <= this.scoreAway) return false;
    this.flashbackDone = true;
    this.mouse.down = false;
    this.keys = {};
    window.CutsceneEngine.playActionSakuga(fb, () => this.rivalsAwaken());
    return true;
  },

  // O MONSTRO (ensinado pelo Fox): quando você fica atrás no placar, ele desperta (uma vez
  // por jogo). Antes só acordava no 2º tempo, e quem começava a perder cedo ficava esperando.
  checkMonster() {
    const ch = this.chapter;
    const m = this.monster;
    if (!m || m.used || this.tutorial || this.mode !== 'match') return false;
    if (!(this.playerState?.monsterUnlocked || ch?.monsterTest)) return false;
    if (ch.id === 'ch0_prologue' || this.scoreHome >= this.scoreAway) return false;
    // (um respiro depois do gol sofrido: acorda na saída de bola, não no meio da comemoração)
    if (this.goalPause > 0 || this.replay || this.pendingKickoff) return false;
    m.used = true;
    this.mouse.down = false;
    this.keys = {};
    window.CutsceneEngine.playActionSakuga('monster_awaken', () => this.monsterAwaken());
    return true;
  },

  monsterAwaken() {
    this.monster.timer = 15 * 60;
    this.lastTimerTick = performance.now();
    const p = this.playerEntity;
    if (p) this.spawnParticles(p.x, p.y, 20, '#dc2626', 40);
    window.SFX?.jingle([196, 233, 294, 392], 0, 'sawtooth');
    this.impact(16, 0.6, 10);
    this.showBanner('👹 O MONSTRO ACORDOU!', '15 segundos: mais rápido, mais preciso e com chute mais forte. VIRA O JOGO!', '#dc2626', 140);
    window.App?.unlockAchievement?.('ach_monster');
  },

  monsterActive() {
    return (this.monster?.timer || 0) > 0;
  },

  // O time rival desperta: mais vantagem e mais velocidade até o fim do jogo
  rivalsAwaken() {
    this.entities.forEach((e) => {
      if (e.team !== 'away' || e.isGK) return;
      e.edge = Math.min(1, (e.edge || 0) + 0.12);
      e.speed *= 1.06;
      this.spawnParticles(e.x, e.y, 12, '#38bdf8', 14);
    });
    this.lastTimerTick = performance.now();
    window.SFX?.jingle([392, 494, 587, 784], 0, 'sawtooth');
    this.impact(10, 0.4, 6);
    this.showBanner('🇫🇷 A PROMESSA DE LOKI E HUGO!', 'A França despertou: mais rápida e mais forte. Segura a vantagem!', '#38bdf8', 130);
  },

  // Chute do rival. Com "sk" é a skill de chute da Arma dele: mais forte, mais no alvo,
  // e com curva de verdade se for trivela/folha seca/gyro (ex: Rin, Sae, Hiori)
  rivalShoot(ent, sk = null) {
    const edge = Math.max(0, ent.edge || 0);
    const onTarget = Math.random() < 0.6 + edge * 0.3 + (sk ? 0.15 : 0);
    const side = Math.random() < 0.5 ? -1 : 1;
    const ty = onTarget
      ? (Math.random() - 0.5) * this.GOAL_HALF_WIDTH * 1.6
      : side * (this.GOAL_HALF_WIDTH + 30 + Math.random() * 80);
    const sdx = -this.PITCH_HALF_X - ent.x;
    const sdy = ty - ent.y;
    const sd = Math.hypot(sdx, sdy) || 1;
    const shotSpeed = 14.5 + edge * 2 + (sk ? Math.min(3, Math.max(0.8, ((sk.power || 1) - 1) * 1.5)) : 0);
    const curved = sk && this.isCurveSkill(sk)
      ? this.getCurvedShot(sdx / sd, sdy / sd, sd, shotSpeed, ent.y > ty ? 1 : -1)
      : { dirX: sdx / sd, dirY: sdy / sd, spin: 0 };
    ent.animState = 'shoot';
    ent.animTimer = 20;
    this.ball.owner = null;
    this.ball.vx = curved.dirX * shotSpeed;
    this.ball.vy = curved.dirY * shotSpeed;
    this.ball.vz = (sk ? 3 : 2.5) + Math.random() * 3;
    this.ball.curve = 0;
    this.ball.spin = curved.spin;
    this.ball.color = sk ? sk.color : '#ef4444';
    this.markKick(ent);
    if (!sk) return;
    this.ball.special = true;
    ent.shotCd = Math.max(600, (sk.cd || 6) * 120);
    this.addBubble(ent, `${sk.name.toUpperCase()}!`, sk.color, 60);
    this.spawnParticles(ent.x, ent.y, 16, sk.color, 30);
    window.SFX?.kick(1);
    this.impact(6, 0.12, 3);
    this.showBanner(`⚠️ ${ent.name.toUpperCase()}: ${sk.name.toUpperCase()}!`, curved.spin ? 'Chute com curva do rival — a bola vai fazer o arco!' : sk.desc, sk.color, 80);
    this.onRivalSkill(ent, sk);
  },

  // Bote especial do rival (skill "defense" da Arma dele): pula de longe na bola
  rivalDefenseSkill(ent, victim, dist) {
    const sk = ent.defSkill;
    const p = this.playerEntity;
    ent.defCd = Math.max(600, (sk.cd || 6) * 120);
    this.addDribbleFx(ent, sk.color, 0);
    const ux = (this.ball.x - ent.x) / (dist || 1);
    const uy = (this.ball.y - ent.y) / (dist || 1);
    ent.x = this.ball.x - ux * 14;
    ent.y = this.ball.y - uy * 14;
    ent.facingRight = ux >= 0;
    ent.animState = 'slide';
    ent.animTimer = 22;
    ent.tackleCd = 50;
    this.addBubble(ent, `${sk.name.toUpperCase()}!`, sk.color, 60);
    this.onRivalSkill(ent, sk);
    const holdBonus = victim === p ? this.getStatEffects().tackleResist : 0;
    const chance = Math.max(0.2, Math.min(0.85, 0.5 + Math.max(0, ent.edge || 0) * 0.3 - holdBonus));
    if (Math.random() < chance) {
      this.ball.owner = ent;
      this.ball.z = 0;
      window.SFX?.tackle();
      this.impact(6);
      this.spawnParticles(ent.x, ent.y, 8, sk.color, 22);
      if (victim === p) {
        this.rate(-0.3, 'PERDEU A BOLA');
        this.onPlayerRobbed();
      }
      this.showBanner(`⚠️ ${ent.name.toUpperCase()}: ${sk.name.toUpperCase()}!`, sk.desc, sk.color, 75);
    } else {
      this.addBubble(victim, 'ESCAPEI!', '#22c55e', 45);
      this.showBanner(`${sk.name.toUpperCase()} DE ${ent.name.toUpperCase()} FALHOU!`, `Você escapou do bote especial (${Math.round(chance * 100)}% de chance).`, '#22c55e', 60);
    }
  },

  // ==========================================================================
  // ROTEIRO DA LORE: GOLS GARANTIDOS + PLACAR DO CLÍMAX (chapter.script)
  //   goals:  [{ team: 'home'|'away', shooterId, deadline }]
  //           O n-ésimo gol de cada time na lista é o "gol nº n" dele. Se o
  //           relógio chegar no deadline (segundos restantes) e o time ainda
  //           não tiver n gols, quem chuta marca numa cutscene usando a própria
  //           habilidade. shooterId: 'player' = você; se não achar, vai o mais forte.
  //   climax: { home, away, sakuga, finalHome } — ao chegar nesse placar toca a
  //           animação final; antes disso, quem já chegou lá não marca mais.
  // ==========================================================================
  checkScriptedGoals() {
    const sc = this.chapter?.script;
    if (!sc || this.mode !== 'match' || this.scriptBusy || this.climaxDone || this.climaxTimer > 0) return false;
    const count = { home: 0, away: 0 };
    for (const [i, g] of (sc.goals || []).entries()) {
      // bonus: gol extra da história (ex: a arrancada do Chigiri) que entra uma vez no
      // deadline em qualquer placar, sem contar na lista nem travar o resultado
      if (g.bonus) {
        if (!this.scriptBonusDone?.[i] && this.timeLeft <= this.matchTime(g.deadline)) {
          (this.scriptBonusDone = this.scriptBonusDone || {})[i] = true;
          return this.playScriptedGoal(g);
        }
        continue;
      }
      count[g.team]++;
      const score = g.team === 'home' ? this.scoreHome : this.scoreAway;
      if (score < count[g.team] && this.timeLeft <= this.matchTime(g.deadline)) {
        return this.playScriptedGoal(g);
      }
    }
    return false;
  },

  // Acha quem vai chutar: em campo, ou do banco de personagens com a camisa do time
  findScriptShooter(g) {
    if (g.shooterId === 'player') return this.playerEntity;
    const onField = this.entities.find((e) => e.team === g.team && e.id === g.shooterId);
    if (onField) return onField;
    const c = window.BLUE_LOCK_CHARACTERS.find((x) => x.id === g.shooterId);
    if (c) {
      const jersey = g.team === 'away'
        ? { jerseyPrimary: this.chapter.opponentColor || c.jerseyPrimary, jerseySecondary: this.chapter.opponentSecondary || c.jerseySecondary }
        : this.chapter.homeColor ? { jerseyPrimary: this.chapter.homeColor, jerseySecondary: this.chapter.homeSecondary } : {};
      return { id: c.id, name: c.name, team: g.team, charData: Object.assign({}, c, jersey) };
    }
    return this.entities
      .filter((e) => e.team === g.team && !e.isGK)
      .sort((a, b) => (b.charData.ovr || 0) - (a.charData.ovr || 0))[0];
  },

  // Golpe assinatura de quem chuta: sua arma equipada, ou a arma do personagem
  getSignatureShot(ent) {
    const pick = (weapon, shots) => (shots.length ? { skillName: shots[0].name, weaponName: weapon.name, color: shots[0].color } : null);
    if (ent.isPlayer) {
      const w = this.playerState.equippedWeapon;
      const shots = (w?.skills || []).filter((s) => s.type === 'shot').sort((a, b) => (b.power || 0) - (a.power || 0));
      return pick(w, shots) || { skillName: 'Chute Direto', weaponName: 'Ego Desperto', color: '#00f5d4' };
    }
    const c = ent.charData;
    const w =
      window.WEAPONS_DB.find((x) => x.id === `wp_char_${ent.id}`) ||
      window.WEAPONS_DB.find((x) => window.weaponInspiredBy(x, c.name || '#'));
    const shots = (w?.skills || []).filter((s) => s.type === 'shot').reverse();
    return (w && pick(w, shots)) || { skillName: c.chemName || 'Chute Assinatura', weaponName: c.weaponName || 'Arma Egoísta', color: c.auraColor || '#ef4444' };
  },

  playScriptedGoal(g) {
    const rival = g.team === 'home' ? 'away' : 'home';
    const shooter = this.findScriptShooter(g);
    const keeper = this.entities.find((e) => e.team === rival && e.isGK);
    const defender = this.entities
      .filter((e) => e.team === rival && !e.isGK)
      .sort((a, b) => (b.charData.ovr || 0) - (a.charData.ovr || 0))[0];
    if (!shooter || !keeper || !defender) return false;

    const sig = this.getSignatureShot(shooter);
    const total = this.matchTime(this.chapter.matchDuration || 100);
    const minute = Math.min(90, Math.max(1, Math.round(90 * (1 - this.timeLeft / total))));
    const labels = this.chapter.scoreLabels || { home: 'BLUE LOCK', away: 'RIVAL' };
    const homeAfter = this.scoreHome + (g.team === 'home' ? 1 : 0);
    const awayAfter = this.scoreAway + (g.team === 'away' ? 1 : 0);
    this.scriptBusy = true;
    this.mouse.down = false;

    // g.sakuga: o gol vira uma cena própria da história (ex: chigiri_sprint)
    const play = g.sakuga ? (cfg, cb) => window.CutsceneEngine.playActionSakuga(g.sakuga, cb) : (cfg, cb) => window.CutsceneEngine.playShotCutscene(cfg, cb);
    play(
      {
        shooter: shooter.charData,
        shooterName: shooter.name,
        defender: defender.charData,
        keeper: keeper.charData,
        team: g.team,
        skillName: sig.skillName,
        weaponName: sig.weaponName,
        skillColor: sig.color,
        homeBefore: this.scoreHome,
        awayBefore: this.scoreAway,
        homeAfter,
        awayAfter,
        minute: `${minute}'`,
        homeLabel: labels.home,
        awayLabel: labels.away,
        sign: this.getMapColors(this.chapter.mapTheme).signText
      },
      () => {
        this.scriptBusy = false;
        this.scoreHome = homeAfter;
        this.scoreAway = awayAfter;
        this.lastTimerTick = performance.now();
        this.netShakeTimer = 35;
        this.resetPositions(rival);
        this.showBanner(
          g.team === 'home' ? `GOOOOL DE ${shooter.name.toUpperCase()}! (${homeAfter} x ${awayAfter})` : `GOL DE ${shooter.name.toUpperCase()}... (${homeAfter} x ${awayAfter})`,
          `${sig.skillName} — ${sig.weaponName}`,
          g.team === 'home' ? '#00f5d4' : '#ef4444',
          120
        );
        this.updateHUD();
        this.checkClimax();
        // Gol roteirizado da casa que bate a meta na frente encerra como um gol normal
        // (ex: o gol extra do Chigiri fazendo 4 x 3)
        if (g.team === 'home' && !this.chapter.script?.climax && homeAfter > awayAfter && homeAfter >= Math.min(this.chapter.goalLimit || Infinity, this.chapter.targetGoals || 3)) {
          this.finishMatch();
        }
      }
    );
    return true;
  },

  // Gol do roteiro guardado para depois da cena do meio do jogo (midMatchLore.goalAfter):
  // { g, n } = a entrada em script.goals e qual gol do time ela é (1º, 2º...)
  loreGoal(shooterId) {
    const goals = (this.chapter?.script?.goals || []).filter((g) => !g.bonus);
    const g = goals.find((x) => x.shooterId === shooterId);
    if (!g) return null;
    return { g, n: goals.filter((x) => x.team === g.team).indexOf(g) + 1 };
  },

  // Logo depois da cena: quem falou faz o gol garantido dele (se o time ainda não chegou nele)
  playLoreGoal(shooterId) {
    const lg = this.loreGoal(shooterId);
    if (!lg || this.mode !== 'match' || this.climaxDone) return;
    const score = lg.g.team === 'home' ? this.scoreHome : this.scoreAway;
    if (score < lg.n) this.playScriptedGoal(lg.g);
  },

  // Antes do clímax, o time que já chegou no placar do roteiro não marca mais
  scriptBlocksGoal(team) {
    // e, antes da cena do meio do jogo, o gol que é de quem fala nela fica guardado para ele
    const ml = this.chapter?.midMatchLore;
    if (ml?.goalAfter && !this.midLoreTriggered && this.mode === 'match') {
      const lg = this.loreGoal(ml.goalAfter);
      if (lg && lg.g.team === team && (team === 'home' ? this.scoreHome : this.scoreAway) >= lg.n - 1) return true;
    }
    const cl = this.chapter?.script?.climax;
    if (!cl || this.climaxDone || this.mode !== 'match') return false;
    return team === 'home' ? this.scoreHome >= cl.home : this.scoreAway >= cl.away;
  },

  // Gol barrado pelo roteiro: o goleiro de keeperTeam faz um milagre e fica com a bola
  miracleSave(keeperTeam, title = null, sub = null) {
    const gk = this.entities.find((e) => e.team === keeperTeam && e.isGK);
    this.ball.gkSave = false;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.z = 0;
    if (gk) {
      this.ball.owner = gk;
      gk.holdTimer = 0;
      gk.saveLock = 40;
      gk.animState = 'dive';
      gk.animTimer = 28;
      this.spawnParticles(gk.x, gk.y, 30, '#facc15', 30);
    }
    // Defesa do roteiro (gol guardado para outro momento): depois de 2 avisos o goleiro só
    // pega, sem a faixa — antes aparecia "MILAGRE" 10+ vezes na mesma partida
    if (!title) {
      this._scriptSaves = (this._scriptSaves || 0) + 1;
      if (this._scriptSaves > 2) return;
    }
    this.showBanner(
      title || `🧤 MILAGRE DE ${gk ? gk.name.toUpperCase() : 'GOLEIRO'}!`,
      sub || 'Defesa impossível em cima da linha! Este jogo ainda não está decidido...',
      '#facc15',
      80
    );
  },

  checkClimax() {
    const cl = this.chapter?.script?.climax;
    if (!cl || this.climaxDone || this.climaxTimer > 0 || this.mode !== 'match') return;
    if (this.scoreHome === cl.home && this.scoreAway === cl.away) {
      this.climaxTimer = 150;
      this.showBanner(
        `${cl.home} x ${cl.away}!! O ESTÁDIO PRENDE A RESPIRAÇÃO...`,
        cl.banner || 'Tudo empatado. O próximo lance vai decidir a partida!',
        '#facc15',
        150
      );
    }
  },

  startClimax() {
    const cl = this.mode === 'match' && this.chapter?.script?.climax;
    this.climaxTimer = 0;
    if (!cl) return;
    this.climaxDone = true;
    this.mouse.down = false;
    window.CutsceneEngine.playActionSakuga(cl.sakuga, () => {
      this.scoreHome = cl.finalHome ?? cl.home + 1;
      this.scoreAway = cl.away;
      this.updateHUD();
      this.finishMatch();
    });
  },

  showBanner(title, sub, color = '#00f5d4', duration = 90) {
    // Modo Dupla: o aviso vai para a tela de quem ele fala (duo_match.js)
    if (this.duo && this.duoRouteBanner && this.duoRouteBanner(title, sub, color, duration) === false) return;
    this.camera.bannerText = title;
    this.camera.bannerSub = sub;
    this.camera.bannerColor = color;
    this.camera.bannerTimer = duration;
  },

  spawnParticles(x, y, z, color, count = 15) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 4.5;
      this.particles.push({
        x,
        y,
        z: Math.max(0, z),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: 1 + Math.random() * 4,
        color,
        life: 20 + Math.random() * 20
      });
    }
  },

  update() {
    if (!this.active || this.paused || window.CutsceneEngine?.active || window.CutsceneEngine?.sakugaActive) return;
    // Impacto: congela alguns quadros (chute forte, gol)
    if (this.hitStop > 0) {
      this.hitStop--;
      return;
    }
    // Relógio das animações dos bonecos: para no "hit stop" (o impacto congela) mas
    // anda na comemoração do gol e no replay (o this.frame fica parado nesses momentos)
    this.animClock = (this.animClock || 0) + 1;
    // Comemoração do gol: a bola fica na rede um instante, depois vem o replay
    if (this.goalPause > 0) {
      this.goalPause--;
      if (this.netShakeTimer > 0) this.netShakeTimer--;
      // a bola não para na linha: entra até o fundo da rede (e o replay mostra isso também)
      if (this.ballIntoNet()) this.recordReplayFrame();
      // a câmera desliza um pouco até o gol (o gol ficava espremido na borda da tela)
      if (this.mode === 'match' && Math.abs(this.ball.x) > this.PITCH_HALF_X - 60) {
        const s = Math.sign(this.ball.x);
        const tx = s * (this.PITCH_HALF_X - 330);
        if ((tx - this.camera.x) * s > 0) this.camera.x += (tx - this.camera.x) * 0.08;
        this.camera.y += (this.ball.y * 0.7 - this.camera.y) * 0.08;
      }
      this.updateEffects();
      if (this.goalPause === 0) this.startReplay();
      return;
    }
    if (this.replay) {
      this.stepReplay();
      this.updateEffects();
      return;
    }
    this.frame++;
    // A torcida sobe quando o seu time chega perto do gol rival
    if (this.frame % 30 === 0 && window.SFX) {
      const homeBall = this.ball.owner?.team === 'home';
      window.SFX.crowdTension(homeBall ? Math.max(0, Math.min(1, (this.ball.x - 300) / (this.PITCH_HALF_X - 300))) : 0.1);
    }
    if (this.netShakeTimer > 0) this.netShakeTimer--;
    if (this.bubbles?.length) this.bubbles = this.bubbles.filter((b) => --b.timer > 0);
    this.tickPlayerTimers();
    if (this.monster?.timer > 0 && --this.monster.timer === 0) this.showBanner('O monstro voltou a dormir...', 'Mas ele sabe o caminho.', '#7f1d1d', 70);
    // Tabela (skill de passe): quem recebeu devolve na sua frente logo depois
    if (this.oneTwo) {
      const ot = this.oneTwo;
      if (this.ball.owner === ot.mate) {
        if (++ot.timer > 16) {
          this.kickPass(ot.mate, this.playerEntity, '#00f5d4');
          this.addBubble(ot.mate, 'DEVOLVE!', '#00f5d4', 45);
          this.oneTwo = null;
        }
      } else if (this.ball.owner) {
        this.oneTwo = null;
      }
    }
    if (this.climaxTimer > 0 && --this.climaxTimer === 0) {
      this.startClimax();
      return;
    }

    // Com a bola na área e a Química pronta: balão lembrando do [C]
    const pl = this.playerEntity;
    if (this.mode === 'match' && this.chemCharge >= 60 && this.ball.owner === pl && this.inRivalBox(pl) && this.frame - (this.chemHintFrame || -999) > 150) {
      this.chemHintFrame = this.frame;
      this.addBubble(pl, '[C] QUÍMICA!', '#ec4899', 70);
    }

    const now = performance.now();
    if (this.tutorial) {
      // Tutorial aberto: o relógio fica parado
      this.lastTimerTick = now;
      this.updateTutorial();
    }
    if (now - this.lastTimerTick >= 1000) {
      this.lastTimerTick = now;
      if (!this.camera.cutsceneMode) {
        this.timeLeft = Math.max(0, this.timeLeft - 1);
        const fx = this.getStatEffects();
        // Laboratório de Fluxos: a barra enche em ~3 s para testar de novo e de novo
        const labRate = this.chapter.flowLab && !this.flowState.active ? 34 : 0;
        this.flowState.charge = Math.min(100, this.flowState.charge + fx.flowRate * (this.difficultyMode().flowMult ?? 1) + labRate);
        // Avisa uma vez quando a barra enche
        if (this.flowState.charge >= 100 && !this.flowState.active && !this.flowState.readyShown && this.playerState?.equippedFlow) {
          this.flowState.readyShown = true;
          window.SFX?.jingle([523, 784, 1047]);
          this.showBanner('🔥 SEU FLUXO ESTÁ PRONTO!', 'Aperte [G] para despertar.', this.playerState.equippedFlow.color || '#00f5d4', 110);
        }
        this.chemCharge = Math.min(100, this.chemCharge + fx.chemRate);
        this.updateHUD();

        if (this.mode === 'match') {
          if (this.chapter.midMatchLore && !this.midLoreTriggered && this.timeLeft <= this.matchTime(this.chapter.midMatchLore.triggerTime)) {
            this.midLoreTriggered = true;
            const ml = this.chapter.midMatchLore;
            // cena com sceneId: vista agora, entra no 🎬 REVER CENAS
            const app = window.App;
            if (ml.sceneId && app?.state) {
              app.state.seenInterludes = Object.assign({}, app.state.seenInterludes, { [ml.sceneId]: true });
              app.saveState?.();
            }
            window.CutsceneEngine.play({
              locationTitle: `${this.chapter.era} • EM CAMPO`,
              crestTitle: 'LORE EVENT',
              bg: this.chapter.mapTheme,
              lines: ml.lines,
              // ex.: o Hugo entra no Fluxo depois da cena dele na final da Sub-20 e, na
              // sequência, faz o gol garantido dele (goalAfter)
              onComplete:
                ml.rivalFlow || ml.goalAfter
                  ? () => {
                      if (ml.rivalFlow) this.startRivalFlow(ml.rivalFlow);
                      if (ml.goalAfter) this.playLoreGoal(ml.goalAfter);
                    }
                  : undefined
            });
            return;
          }
          if (this.chapter.id === 'ch0_prologue' && !this.prologueChoiceTriggered && (this.timeLeft <= this.matchTime(68) || this.playerEntity.x > 650)) {
            this.prologueChoiceTriggered = true;
            window.App.triggerProloguePassCutscene();
            return;
          }
          if (this.timeLeft > 0 && this.checkScriptedGoals()) return;
          if (this.checkLosingFlashback()) return;
          if (this.timeLeft > 0 && this.checkMonster()) return;
        }

        if (this.timeLeft <= 0) {
          // Roteiro com clímax: o tempo acabou antes do placar? O clímax acontece mesmo assim
          const cl = this.mode === 'match' && this.chapter.script?.climax;
          if (cl && !this.climaxDone) {
            this.scoreHome = cl.home;
            this.scoreAway = cl.away;
            this.updateHUD();
            this.startClimax();
            return;
          }
          this.finishMatch();
          return;
        }
      }
    }

    this.tickSkillAndFlow();

    // 1. Movimento 3D do Jogador no Campo Colossal (WASD + SHIFT + Arrancada do drible + Carrinho)
    const p = this.playerEntity;
    this.moveControlledPlayer();

    // Câmera 2D Suave acompanhando X e Y pelo Campo Colossal!
    const focusX = this.ball.owner === p ? p.x + 95 : p.x * 0.55 + this.ball.x * 0.45;
    const focusY = p.y * 0.6 + this.ball.y * 0.4;
    const maxCamX = this.PITCH_HALF_X - 480;
    const targetCamX = Math.max(-maxCamX, Math.min(maxCamX, focusX));
    this.camera.x += (targetCamX - this.camera.x) * 0.14;
    this.camera.y += (focusY - this.camera.y) * 0.12;

    // Modo Dupla (online): o parceiro move e age com os comandos que chegam pela rede
    if (this.duo?.role === 'host') this.duoHostStep?.();

    // Minigames de treino (anéis, ponto cego andando, janela do "de primeira")
    if (this.mode === 'training' && !this.trainingDone) this.trainingTick(p);

    this.entities.forEach((ent) => {
      if (ent.animTimer > 0) {
        ent.animTimer--;
        if (ent.animTimer === 0) ent.animState = 'idle';
      }
      if (ent.z > 0 || ent.vz !== 0) {
        ent.z += ent.vz;
        ent.vz -= 0.38;
        if (ent.z <= 0) {
          ent.z = 0;
          ent.vz = 0;
        }
      }
    });
    this.updateAIAndBall(p);
  },

  // Recargas e timers de quem você controla (no Modo Dupla roda também para o parceiro,
  // com o "estado de jogador" dele trocado no lugar do seu: MatchEngine.duoSwap)
  tickPlayerTimers() {
    if (this.slideCooldown > 0) this.slideCooldown--;
    if (this.callCooldown > 0) this.callCooldown--;
    if (this.dribbleCooldown > 0) this.dribbleCooldown--;
    if (this.dribbleInvulnTimer > 0) this.dribbleInvulnTimer--;
    if (this.dribbleChainTimer > 0 && --this.dribbleChainTimer === 0) this.dribbleChain = 0;
    if (this.playerEntity?.buffTimer > 0) this.playerEntity.buffTimer--;
  },

  tickSkillAndFlow() {
    // passivas de recarga somadas (Sae + Snuffy + Fluxo...) no máximo dobram a velocidade
    const cdStep = 1 + Math.min(1, this.passive('cooldown'));
    Object.keys(this.skillCooldowns).forEach((k) => {
      if (this.skillCooldowns[k] > 0) this.skillCooldowns[k] = Math.max(0, this.skillCooldowns[k] - cdStep);
    });

    if (this.flowState.active) {
      this.flowState.timer--;
      if (this.flowState.timer <= 0) {
        // Gênio (Sae): o Fluxo apaga e a barra já volta parcialmente cheia
        const refund = this.flowFxVal('refund');
        this.flowState.active = false;
        if (refund) {
          this.flowState.charge = Math.max(this.flowState.charge, refund);
          this.showBanner('🧠 O GÊNIO NÃO DESLIGA', `O Fluxo acabou, mas a barra já voltou com ${refund}%.`, this.flowFx?.color || '#be123c', 70);
        }
      }
    }
    if (this.revengeTimer > 0) this.revengeTimer--;

    if (this.mouse.down) {
      this.mouse.charge = Math.min(100, this.mouse.charge + 2.6);
    }
  },

  // WASD + SHIFT + arrancada do drible + carrinho de quem você controla
  moveControlledPlayer() {
    const p = this.playerEntity;
    let mx = 0;
    let my = 0;
    if (this.keys['w'] || this.keys['arrowup']) my -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) my += 1;
    if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) mx += 1;
    const isSliding = p.animState === 'slide' && p.animTimer > 0;
    const sprintMult = this.updateStamina(mx !== 0 || my !== 0, !isSliding && !(p.dashTimer > 0));

    if (p.recoverTimer > 0) {
      // Caído depois de errar o carrinho: levanta sem poder se mexer
      p.recoverTimer--;
      p.vx = 0;
      p.vy = 0;
      p.animState = 'slide';
      p.animTimer = 2;
    } else if (p.dashTimer > 0) {
      this.stepDash(p);
    } else if (isSliding) {
      p.x = Math.max(-this.PITCH_HALF_X + 15, Math.min(this.PITCH_HALF_X - 15, p.x + p.slideVx));
      p.y = Math.max(-this.PITCH_HALF_Y + 12, Math.min(this.PITCH_HALF_Y - 12, p.y + p.slideVy));
      p.slideVx *= 0.92;
      p.slideVy *= 0.92;
      if (!p.slideResolved && this.ball.owner !== p && Math.hypot(this.ball.x - p.x, this.ball.y - p.y) < 44 && this.ball.z < 35) {
        this.resolveSlideContact(p);
      }
    } else {
      const spd = p.speed * sprintMult * (p.buffTimer > 0 ? 1.15 : 1) * (this.monsterActive() ? 1.3 : 1);

      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my);
        p.vx = (mx / len) * spd;
        p.vy = (my / len) * spd;
        p.x = Math.max(-this.PITCH_HALF_X + 15, Math.min(this.PITCH_HALF_X - 15, p.x + p.vx));
        p.y = Math.max(-this.PITCH_HALF_Y + 12, Math.min(this.PITCH_HALF_Y - 12, p.y + p.vy));
        if (mx !== 0) p.facingRight = mx > 0;
        if (p.animTimer <= 0 && !this.mouse.down) p.animState = 'run';
      } else {
        p.vx = 0;
        p.vy = 0;
        if (p.animTimer <= 0 && !this.mouse.down) p.animState = 'idle';
      }
    }
  },

  // A última bola foi de um jogador humano (você ou o parceiro do Modo Dupla)?
  humanTouch(p) {
    const t = this.ball.lastTouch;
    return !!t && (t === p || !!t.isRemote);
  },

  // IA dos dois times, goleiros, física da bola e gols (o resto do quadro da partida)
  updateAIAndBall(p) {
    // Descobre os 2 adversários mais próximos da bola para dar bote agressivo em você!
    const awayFieldPlayers = this.entities
      .filter((e) => e.team === 'away' && !e.isGK && e.stunTimer <= 0)
      .sort((a, b) => Math.hypot(a.x - this.ball.x, a.y - this.ball.y) - Math.hypot(b.x - this.ball.x, b.y - this.ball.y));
    const chaserIds = awayFieldPlayers.slice(0, this.difficultyMode().chasers ?? 2).map((e) => e.id);

    // Um companheiro (o mais perto) vai na bola: sempre que o rival está com ela,
    // e na bola solta só se ele estiver mais perto dela do que você
    let homeChaserId = null;
    // Rival com a bola no seu campo: o 2º mais perto fecha a frente do gol (cobertura)
    let homeCoverId = null;
    const ballOwner = this.ball.owner;
    const passToHome = this.ball.passTarget && this.ball.passTarget.team === 'home';
    if (!passToHome && (!ballOwner || ballOwner.team === 'away')) {
      const distToBall = (e) => Math.hypot(e.x - this.ball.x, e.y - this.ball.y);
      const mates = this.entities
        .filter((e) => e.team === 'home' && !e.isPlayer && !e.isRemote && !e.isGK && !(e.stunTimer > 0))
        .sort((a, b) => distToBall(a) - distToBall(b));
      const nearest = mates[0];
      if (nearest && (ballOwner || distToBall(nearest) < distToBall(p) * 0.9)) homeChaserId = nearest.id;
      if (ballOwner && !ballOwner.isGK && this.ball.x < 250 && mates[1]) homeCoverId = mates[1].id;
    }

    // 2. Inteligência Artificial Dinâmica e Agressiva (Adversários vêm atrás de você!)
    this.entities.forEach((ent, entIdx) => {
      // (o parceiro do Modo Dupla é controlado pela rede: duoHostStep)
      if (ent.isPlayer || ent.isRemote) return;
      // Tutorial: os rivais de linha ficam parados olhando
      if (this.tutorial && ent.team === 'away' && !ent.isGK) {
        ent.animState = 'idle';
        return;
      }
      if (ent.stunTimer > 0) {
        ent.stunTimer--;
        // Quem caiu no drible fica no chão um tempo antes de levantar
        if (ent.knockTimer > 0) {
          ent.knockTimer--;
          ent.animState = 'dive';
        } else {
          ent.animState = 'idle';
        }
        return;
      }

      if (ent.isGK) {
        if (ent.saveLock > 0) ent.saveLock--;
        // Goleiro com a bola: segura um pouco e depois repõe para um companheiro
        if (this.ball.owner === ent) {
          ent.holdTimer = (ent.holdTimer || 0) + 1;
          if (ent.animTimer <= 0) ent.animState = 'idle';
          if (ent.holdTimer > 70) {
            ent.holdTimer = 0;
            this.goalkeeperDistribute(ent);
          }
          return;
        }
        const distX = Math.abs(this.ball.x - ent.x);
        const mine = ent.team === 'home';
        // Seu goleiro lê o chute: vai para onde a bola VAI cruzar a linha do gol, e
        // com a bola chegando dá o bote lateral (dobro da velocidade)
        const incoming = !this.ball.owner && (mine ? this.ball.vx < -3 : this.ball.vx > 3);
        // O goleiro rival também lê o chute quando a rolagem diz que ele pega (ball.gkSave)
        const reads = mine || (this.ball.gkSave && this.humanTouch(p));
        let aimY = this.ball.y;
        if (reads && incoming) aimY = this.ball.y + this.ball.vy * ((ent.x - this.ball.x) / this.ball.vx);
        const targetY = Math.max(-this.GOAL_HALF_WIDTH + 8, Math.min(this.GOAL_HALF_WIDTH - 8, aimY));
        const dy = targetY - ent.y;
        const gkSpeed = ent.speed * (reads && incoming && distX < 420 ? (mine ? 2 : 2.6) : 1);
        ent.vy = Math.sign(dy) * Math.min(Math.abs(dy), gkSpeed);
        ent.y += ent.vy;
        // (parado volta a 'idle': antes o goleiro ficava "correndo parado" 60–80% do jogo)
        if (ent.animTimer <= 0) ent.animState = Math.abs(ent.vy) > 0.3 ? 'run' : 'idle';

        if (!this.ball.owner && distX < 110 && Math.abs(this.ball.vx) > 5 && ent.z === 0) {
          ent.animState = 'dive';
          ent.animTimer = 28;
          if (this.ball.z > 25) ent.vz = 4.2;
        }

        // Defesa: só em bola solta, e cada chute tem UMA tentativa de defesa (saveLock).
        // O seu goleiro alcança mais longe e mais alto que o do rival
        const gkReach = mine ? 40 : 28;
        const gkHigh = mine ? 60 : 46;
        if (!this.ball.owner && !(ent.saveLock > 0) && Math.hypot(this.ball.x - ent.x, this.ball.y - ent.y) < gkReach && Math.abs(this.ball.z - ent.z) < gkHigh) {
          ent.saveLock = 30;
          const ballSpd = Math.hypot(this.ball.vx, this.ball.vy);
          let saved;
          if (ballSpd < 6) {
            saved = true; // bola fraca: o goleiro só abaixa e pega
          } else if (ent.team === 'away' && this.humanTouch(p) && this.mode === 'match') {
            // Seu chute: a % de acerto já decidiu se ele passa (nenhuma skill passa direto)
            saved = !!this.ball.gkSave;
          } else if (ent.team === 'home') {
            // Seu goleiro defende uns 3 de cada 4 chutes comuns que chegam nele. Skill do rival
            // (chute especial) e bola com curva passam mais; a passiva Paredão ajuda
            const rivalSkillMult = (this.ball.special ? 0.75 : 1) * (this.ball.spin ? 0.85 : 1);
            saved = Math.random() < (this.ball.z > 55 ? 0.55 : 0.78) * rivalSkillMult + this.passive('gk_wall') + this.difficultyMode().myKeeper;
          } else {
            // Goleiros muito mais fortes que você defendem mais e chutes mais fortes
            const gkEdge = Math.max(0, ent.edge || 0);
            const highCornerBonus = (this.ball.z > 55 ? 0.24 : 0.46) + gkEdge * 0.3;
            // Bola com efeito (Q/E ou skill de curva) engana mais o goleiro
            // (com a passiva de curva do Rin, o goleiro lê ainda menos o seu chute curvo)
            const curveMult = this.ball.spin || this.ball.curve ? (this.ball.lastTouch === p && this.passive('curve') ? 0.45 : 0.7) : 1;
            // Chute seu bem finalizado (Finalização) engana o goleiro mais vezes
            const beat = this.ball.lastTouch === p ? 1 - this.getStatEffects().keeperBeat : 1;
            // Só chute MUITO forte (carregado + Poder de Disparo) passa direto pelo goleiro
            saved = ballSpd < 17.2 + gkEdge * 3 + (this.difficultyMode().gkHardShot || 0) && Math.random() < highCornerBonus * curveMult * beat * this.difficultyMode().rivalKeeper;
          }

          if (saved) {
            this.spawnParticles(ent.x, ent.y, ent.z + 20, '#ffffff', 14);
            window.SFX?.save();
            if (ent.team === 'away') this.impact(7);
            if (this.mode === 'training') {
              this.ball.vx = -7.0;
              this.ball.vy = (Math.random() - 0.5) * 6;
              this.ball.vz = 2.5;
              this.trnMiss();
              setTimeout(() => {
                if (this.mode === 'training' && this.active) this.trnResetBall();
              }, 500);
            } else if (ballSpd < 12 || Math.random() < 0.65) {
              // Encaixa a bola e fica com ela
              this.ball.owner = ent;
              this.ball.z = 0;
              ent.holdTimer = 0;
            } else {
              // Espalma para o lado
              this.ball.vx = ent.team === 'home' ? 7.0 : -7.0;
              this.ball.vy = (Math.random() - 0.5) * 6;
              this.ball.vz = 2.5;
            }
            this.showBanner(
              ent.team === 'home' ? `DEFESAÇA DE ${ent.name.toUpperCase()}!` : 'DEFESA DO GOLEIRO!',
              ent.team === 'home' ? 'Seu goleiro segurou! Ele vai repor a bola.' : 'Segure o Mouse para chutar no ângulo ou use suas Skills!',
              '#f59e0b',
              55
            );
          }
        }
        return;
      }

      if (ent.team === 'home') {
        this.updateTeammate(ent, p, ent.id === homeChaserId, ent.id === homeCoverId);
      } else {
        // TIME ADVERSÁRIO (AWAY): Vem atrás de você agressivamente para dar o bote!
        ['shotCd', 'defCd', 'buffCd'].forEach((k) => {
          if (ent[k] > 0) ent[k]--;
        });
        if (ent.buffTimer > 0) {
          ent.buffTimer--;
          if (ent.buffTimer % 8 === 0) this.spawnParticles(ent.x, ent.y, 12, ent.rivalFlowTimer > 0 ? ent.rivalFlowColor : ent.buffSkill?.color || '#ef4444', 4);
        }
        // Fluxo do rival (cena da partida): acabou o tempo, volta à velocidade normal
        if (ent.rivalFlowTimer > 0 && --ent.rivalFlowTimer === 0 && ent.rivalFlowBase) {
          ent.speed = ent.rivalFlowBase;
          this.addBubble(ent, '...', '#94a3b8', 40);
        }
        if (this.ball.owner === ent) {
          const gx = -this.PITCH_HALF_X + 20;
          const gy = 0;
          const dx = gx - ent.x;
          const dy = gy - ent.y;
          const d = Math.hypot(dx, dy) || 1;
          // Drible assinatura do rival (ex: o zigue-zague do Barou contra o Time Z)
          let mult = ent.buffTimer > 0 ? 1.35 : 1.04;
          let lat = 0;
          // Transe/estado especial da Arma (skill "buff"): alguns segundos mais rápido
          if (ent.buffSkill && !(ent.buffCd > 0) && !(ent.buffTimer > 0) && Math.random() < 0.008) {
            ent.buffTimer = 180;
            ent.buffCd = 900;
            this.addBubble(ent, `${ent.buffSkill.name.toUpperCase()}!`, ent.buffSkill.color, 60);
            this.showBanner(`⚠️ ${ent.name.toUpperCase()}: ${ent.buffSkill.name.toUpperCase()}!`, 'O rival entrou em transe: está mais rápido por alguns segundos!', '#ef4444', 70);
            this.onRivalSkill(ent, ent.buffSkill);
          }
          if (ent.sigSkill) {
            if (ent.sigCd > 0) ent.sigCd--;
            if (ent.sigTimer > 0) {
              ent.sigTimer--;
              mult = 1.8;
              if (ent.sigSkill.move === 'zigzag') lat = (Math.floor(ent.sigTimer / 6) % 2 ? 1 : -1) * ent.speed * 1.5;
              if (ent.sigTimer % 6 === 0) this.spawnParticles(ent.x, ent.y, 8, ent.sigSkill.color, 6);
              this.addDribbleFx(ent, ent.sigSkill.color, ent.sigTimer);
            } else if (!(ent.sigCd > 0) && ent.x < this.PITCH_HALF_X - 300 && Math.random() < 0.012) {
              ent.sigTimer = 40;
              ent.sigCd = 480;
              this.addBubble(ent, `${ent.sigSkill.name.toUpperCase()}!`, ent.sigSkill.color, 60);
              this.showBanner(`⚠️ ${ent.name.toUpperCase()}: ${ent.sigSkill.name.toUpperCase()}!`, 'Drible assinatura do rival — dê o carrinho [F] no tempo certo!', '#ef4444', 70);
              this.onRivalSkill(ent, ent.sigSkill);
            }
          }
          // Com a bola e campo pela frente, o rival arranca no pique rumo ao seu gol
          mult *= this.aiSprint(ent, !(ent.sigTimer > 0) && !(ent.buffTimer > 0) && ent.x > -this.PITCH_HALF_X + 420, true);
          ent.x += (dx / d) * ent.speed * mult + (-dy / d) * lat;
          ent.y += (dy / d) * ent.speed * mult + (dx / d) * lat;
          ent.facingRight = false;
          ent.animState = ent.sigTimer > 0 && ent.sigSkill.move === 'spin' && ent.sigTimer % 6 < 3 ? 'rabona' : 'run';

          // Pressionado, o rival toca para um companheiro livre mais à frente (antes nenhum
          // rival de linha passava: corria em linha reta até o gol com a bola)
          if (!(ent.sigTimer > 0) && Math.random() < 0.05) {
            const pressed = this.entities.some((e) => e.team === 'home' && !e.isGK && !(e.stunTimer > 0) && Math.hypot(e.x - ent.x, e.y - ent.y) < 75);
            if (pressed) {
              const free = (m) => !this.entities.some((e) => e.team === 'home' && !e.isGK && !(e.stunTimer > 0) && Math.hypot(e.x - m.x, e.y - m.y) < 90);
              const mate = this.entities
                .filter((m) => m.team === 'away' && m !== ent && !m.isGK && !(m.stunTimer > 0) && m.x < ent.x - 60 && Math.hypot(m.x - ent.x, m.y - ent.y) < 560 && free(m))
                .sort((a, c) => a.x - c.x)[0];
              if (mate) {
                this.kickPass(ent, mate, '#ef4444');
                return;
              }
            }
          }
          // Chute especial da Arma: o rival chuta de mais longe quando a skill está pronta
          const skillReady = ent.shotSkills?.length && !(ent.shotCd > 0);
          if (ent.x < -this.PITCH_HALF_X + (skillReady ? 640 : 520) && Math.random() < 0.035 * (this.difficultyMode().rivalShotMult ?? 1)) {
            this.rivalShoot(ent, skillReady && Math.random() < 0.55 ? this.pickRivalShot(ent) : null);
          }
        } else {
          const owner = this.ball.owner;
          const teammateHasBall = owner && owner.team === 'away';
          const isChaser = !teammateHasBall && chaserIds.includes(ent.id);
          const dToBall = Math.hypot(this.ball.x - ent.x, this.ball.y - ent.y);
          if (ent.tackleCd > 0) ent.tackleCd--;

          let tx;
          let ty;
          if (teammateHasBall) {
            // Companheiro do time adversário com a bola: abre espaço à frente dele em vez de dar bote
            tx = Math.max(-this.PITCH_HALF_X + 140, owner.x - 260);
            ty = Math.max(-this.PITCH_HALF_Y + 40, Math.min(this.PITCH_HALF_Y - 40, ent.homeY * 0.9 + owner.y * 0.1));
          } else if (isChaser || dToBall < (ent.role === 'back' ? 200 : 280)) {
            // (só os perseguidores da dificuldade vão de longe; os outros só dão bote perto —
            // com 680 quase todo o time rival virava um enxame na bola e Normal = Egoísta)
            // Corre direto para cima de você / da bola para dar bote!
            tx = this.ball.x;
            ty = this.ball.y;
          } else if (ent.role === 'back') {
            // Zagueiro rival (7 contra 7): fica entre a bola e o gol dele
            tx = Math.min(this.PITCH_HALF_X - 200, Math.max(this.ball.x + 220, 350));
            ty = ent.homeY * 0.8 + this.ball.y * 0.3;
          } else {
            // Fecha a linha de passe/chute entre você e o gol adversário!
            tx = Math.max(this.ball.x + 140, Math.min(this.PITCH_HALF_X - 180, (this.ball.x + this.PITCH_HALF_X) * 0.55));
            ty = this.ball.y * 0.7 + (ent.homeY * 0.3);
          }

          const dx = tx - ent.x;
          const dy = ty - ent.y;
          const d = Math.hypot(dx, dy) || 1;
          // Indo em você / na bola, o rival dá pique (gasta o fôlego dele)
          // Visão de Deus (Metavision): perto de você o rival anda em câmera lenta
          const slow = this.flowFxVal('rival_slow');
          const slowMult = slow && Math.hypot(ent.x - p.x, ent.y - p.y) < 260 ? slow : 1;
          const chaseMult = (isChaser ? 1.12 : 0.96) * this.aiSprint(ent, (isChaser || dToBall < 420) && d > 40 && !teammateHasBall) * slowMult;
          // o passo não passa do alvo e o boneco só vira com uma diferença de verdade (antes o
          // rival ia e voltava em cima do ponto e virava de lado 3 a 10 vezes por segundo)
          const step = Math.min(d, ent.speed * chaseMult);
          if (d > 3) {
            ent.x += (dx / d) * step;
            ent.y += (dy / d) * step;
          }
          if (Math.abs(dx) > 10) ent.facingRight = dx >= 0;
          if (ent.animTimer <= 0) ent.animState = d > 4 ? 'run' : 'idle';

          // Bote / Desarme: só em quem é do SEU time e está com a bola (nunca no próprio companheiro).
          // Se o dono da bola for você, o drible no ESPAÇO te protege por um instante.
          const victim = owner && owner.team === 'home' && !owner.isGK ? owner : null;
          const protectedPlayer =
            (victim === p && (this.dribbleInvulnTimer > 0 || p.animState === 'rabona' || p.animState === 'slide')) ||
            (!!victim?.isRemote && !!this.duoProtected?.(victim));
          // Bote especial da Arma (skill "defense", ex: a Leitura de Xadrez do Niko): pula de longe na bola
          if (victim && !protectedPlayer && ent.defSkill && !(ent.defCd > 0) && dToBall > 26 && dToBall < 130 && Math.random() < 0.03) {
            this.rivalDefenseSkill(ent, victim, dToBall);
          } else if (victim && !protectedPlayer && ent.tackleCd <= 0 && dToBall < 26 && this.ball.z < 26) {
            const dm = this.difficultyMode();
            ent.tackleCd = Math.round(40 * (dm.tackleCdMult ?? 1));
            const holdBonus = victim === p ? this.getStatEffects().tackleResist : 0;
            const tackleChance = Math.min(0.9, Math.max(0.12, 0.35 + Math.max(0, ent.edge || 0) * 0.35 - holdBonus) * (dm.tackleMult ?? 1));
            if (Math.random() < tackleChance) {
              ent.animState = 'slide';
              ent.animTimer = 18;
              this.ball.owner = ent;
              this.ball.z = 0;
              this.spawnParticles(ent.x, ent.y, 6, '#ef4444', 12);
              if (victim === p) {
                this.rate(-0.3, 'PERDEU A BOLA');
                this.onPlayerRobbed();
              }
              this.showBanner(`⚠️ DESARME DE ${ent.name.toUpperCase()}!`, 'Use [ESPAÇO] para driblar, [BOTÃO DIREITO] para tocar ou [F] para dar carrinho!', '#ef4444', 65);
            }
          }
        }
      }
    });

    // 3. Física 3D da Bola
    if (this.ball.owner) {
      const dirOffset = this.ball.owner.facingRight ? 14 : -14;
      this.ball.x = this.ball.owner.x + dirOffset;
      this.ball.y = this.ball.owner.y + 4;
      this.ball.z = this.ball.owner.z;
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.ball.vz = 0;
      this.ball.spin = 0;
      this.ball.passTarget = null;
    } else {
      this.ball.x += this.ball.vx;
      this.ball.y += this.ball.vy;
      this.ball.z += this.ball.vz;
      this.ball.vz -= 0.24;

      if (this.ball.curve) this.ball.vy += this.ball.curve;
      if (this.ball.spin) {
        const r = this.applySpin(this.ball.vx, this.ball.vy, this.ball.spin);
        this.ball.vx = r.vx;
        this.ball.vy = r.vy;
        this.ball.spin = Math.abs(r.spin) < 0.00002 ? 0 : r.spin;
      }
      if (this.ball.kickGrace > 0) this.ball.kickGrace--;
      this.tryBlockShot();

      if (this.ball.z <= 0) {
        this.ball.z = 0;
        if (Math.abs(this.ball.vz) > 1.2) {
          this.ball.vz = -this.ball.vz * 0.55;
        } else {
          this.ball.vz = 0;
        }
        this.ball.vx *= 0.982;
        this.ball.vy *= 0.982;
      } else {
        this.ball.vx *= 0.992;
        this.ball.vy *= 0.992;
      }

      this.trailPoints.push({ x: this.ball.x, y: this.ball.y, z: this.ball.z, color: this.ball.color, life: 14 });

      // Quem é o alvo do passe domina a bola em qualquer velocidade
      const pt = this.ball.passTarget;
      if (pt) {
        this.ball.passTimer--;
        if (!(pt.stunTimer > 0) && Math.hypot(this.ball.x - pt.x, this.ball.y - pt.y) < 34 && this.ball.z < 40) {
          this.ball.owner = pt;
          this.ball.z = 0;
          this.ball.passTarget = null;
        } else if (this.ball.passTimer <= 0 || Math.hypot(this.ball.vx, this.ball.vy) < 0.6) {
          this.ball.passTarget = null;
        }
      }
      // Bola solta: Posicionamento aumenta o seu alcance e Habilidade Aérea deixa você dominar bolas mais altas
      const fxCtl = this.getStatEffects();
      // Passiva Passe Perfeito (Charles): enquanto o seu passe viaja, só quem recebe pega a bola
      const shieldedPass = this.ball.passTarget && this.ball.lastTouch === p && this.passive('perfect_pass');
      // Passiva Predador: perto da área rival a bola solta "procura" você
      const boxReach = this.ball.x > this.PITCH_HALF_X - 520 ? this.passive('predator') : 0;
      // Leitura (Niko): passe ou chute do rival passando perto de você é cortado, em
      // qualquer velocidade (fora o goleiro dele segurando a bola)
      const cut = this.flowFxVal('intercept');
      if (cut && !this.ball.owner && this.ball.lastTouch?.team === 'away' && !this.ball.lastTouch.isGK && this.ball.z < 60 && !(p.stunTimer > 0) && !(p.recoverTimer > 0) && Math.hypot(this.ball.x - p.x, this.ball.y - p.y) < cut) {
        this.ball.owner = p;
        this.ball.z = 0;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.passTarget = null;
        this.matchStats.steals = (this.matchStats.steals || 0) + 1;
        this.addBubble(p, 'LIDO!', this.flowFx.color, 45);
        window.SFX?.pass?.();
      }
      if (!this.ball.owner && Math.hypot(this.ball.vx, this.ball.vy) < 11.5 && this.ball.z < Math.max(34, fxCtl.airReach)) {
        for (const ent of this.entities) {
          if (ent.stunTimer > 0 || ent.saveLock > 0) continue;
          if (ent === this.ball.lastTouch && this.ball.kickGrace > 0) continue;
          if (shieldedPass && ent !== this.ball.passTarget) continue;
          const reach = ent === p ? fxCtl.controlRadius + boxReach : ent.isRemote ? 30 : 22;
          if (!ent.isPlayer && !ent.isRemote && this.ball.z >= 34) continue;
          if (Math.hypot(this.ball.x - ent.x, this.ball.y - ent.y) < reach) {
            this.ball.owner = ent;
            this.ball.z = 0;
            this.ball.passTarget = null;
            break;
          }
        }
      }

      // GOL DIREITO (COM ANIMAÇÃO SAKUGA MULTI-ÂNGULO DO MANGÁ/ANIME!)
      if (this.ball.x >= this.PITCH_HALF_X - 10 && Math.abs(this.ball.y) <= this.GOAL_HALF_WIDTH) {
        if (this.ball.z <= this.GOAL_HEIGHT) {
          this.netShakeTimer = 35;
          if (this.mode === 'training') {
            // Só conta se a bola entrou perto do alvo (antes qualquer gol valia); no
            // "de primeira" só vale chutando logo depois do passe do parceiro
            const mode = this.trnMode();
            const onAim = this.trainingTargets.some((tg) => tg.type === 'goal_target' && Math.hypot(this.ball.y - tg.y, this.ball.z - tg.z) < tg.radius + 14);
            const firstTime = mode !== 'onetouch' || this.trnOneTouch;
            if (onAim && firstTime) {
              this.trainingScore++;
              this.scoreHome = this.trainingScore;
              this.trnCombo++;
              this.trnBestCombo = Math.max(this.trnBestCombo, this.trnCombo);
              // acertos seguidos rendem tempo
              if (this.trnCombo >= 2) this.timeLeft += 2;
              this.spawnParticles(this.PITCH_HALF_X, this.ball.y, this.ball.z, '#facc15', 55);
              this.showBanner(
                this.trnCombo >= 2 ? `🔥 COMBO x${this.trnCombo}! (${this.trainingScore}/${this.trainingTargetScore})` : `🎯 ALVO ATINGIDO! (${this.trainingScore}/${this.trainingTargetScore})`,
                this.trnCombo >= 2 ? '+2 s no relógio! Continue acertando em sequência!' : mode === 'onetouch' ? 'Isso! De primeira, como na tabela do Shidou!' : 'Acerte o próximo pra fazer COMBO!',
                this.trnCombo >= 2 ? '#f97316' : '#facc15',
                80
              );
            } else if (onAim) {
              this.trnMiss();
              this.showBanner('NO ALVO, MAS NÃO FOI DE PRIMEIRA', 'Receba o passe e chute em até 2 segundos!', '#94a3b8', 80);
            } else {
              this.trnMiss();
              this.showBanner('GOL, MAS FORA DO ALVO', mode === 'blindspot' ? 'O Ponto Cego anda: chute na hora certa!' : 'Mire no círculo para contar ponto!', '#94a3b8', 80);
            }
            this.trnOneTouch = false;
            this.trnResetBall();
            this.spawnNextTrainingTargets();
            this.updateHUD();
            if (this.trainingScore >= this.trainingTargetScore) {
              setTimeout(() => this.finishMatch(), 700);
            }
            return;
          }

          if (this.scriptBlocksGoal('home')) {
            this.miracleSave('away');
            return;
          }
          // O goleiro tinha lido o seu chute mas não chegou no corpo: defende no reflexo
          if (this.ball.gkSave && this.humanTouch(p)) {
            this.miracleSave('away', '🧤 DEFESA NO REFLEXO!', 'Chute com pouca % de acerto: o goleiro leu e buscou na linha!');
            return;
          }

          this.scoreHome++;
          this.flowState.charge = Math.min(100, this.flowState.charge + 12);
          this.chemCharge = Math.min(100, this.chemCharge + 15);
          const scorer = this.ball.lastTouch && this.ball.lastTouch.team === 'home' ? this.ball.lastTouch : this.playerEntity;
          // No ângulo = lá em cima, perto da trave; rente à trave = rasteiro no cantinho
          const corner = Math.abs(this.ball.y) > this.GOAL_HALF_WIDTH * 0.55;
          const angle = corner && this.ball.z > this.GOAL_HEIGHT * 0.55;
          const lowCorner = corner && this.ball.z < 18;
          const mine = scorer === this.playerEntity;
          // Modo Dupla: gol do parceiro conta nas estatísticas dele
          if (scorer.isRemote) this.duoOnRemoteGoal?.(scorer, angle);
          if (this.duo) this.duoOnGoal?.(scorer);
          if (mine) {
            this.matchStats.goals++;
            // Quatro Egos: cada gol seu no Fluxo soma segundos a ele
            const ext = this.flowFxVal('goal_extend');
            if (ext) this.flowState.timer += ext * 60;
            if (angle) this.matchStats.angleGoals++;
            // Gol de longe: o chute saiu a mais de ~450 do gol
            const long = this.ball.kickFrom && this.PITCH_HALF_X - this.ball.kickFrom.x > 450;
            if (long) this.matchStats.longGoals++;
            this.rate(1 + (angle ? 0.3 : 0) + (long ? 0.2 : 0), angle ? 'GOL NO ÂNGULO' : long ? 'GOLAÇO DE LONGE' : 'GOL');
          } else {
            this.rate(0.1, 'GOL DO TIME');
          }
          const heightLabel = angle ? 'NO ÂNGULO!' : lowCorner ? 'RENTE À TRAVE!' : this.ball.z > 55 ? 'NA GAVETA ALTA!' : 'NO FUNDO DA REDE!';
          for (let i = 0; i < 3; i++) this.spawnParticles(this.PITCH_HALF_X + 10, this.ball.y, this.ball.z, ['#00f5d4', '#facc15', '#ffffff'][i], 40);
          this.showBanner(`GOOOOL ${heightLabel} (${this.scoreHome} x ${this.scoreAway})`, `Marcado por ${scorer.name}!`, '#00f5d4', 115);
          this.showGoalFx(angle ? 'NO ÂNGULO!!' : 'GOOOOOL!!', mine ? (angle ? `${scorer.name.toUpperCase()} • +40 EGOCOINS` : scorer.name.toUpperCase()) : scorer.isDuo ? `${scorer.name.toUpperCase()} • GOL DA DUPLA!` : `${scorer.name.toUpperCase()} • ASSISTÊNCIA SUA? NÃO. GOL DELE.`, angle ? '#facc15' : '#00f5d4');
          this.impact(angle ? 26 : 18, 0.85, angle ? 16 : 10);
          window.SFX?.goal(angle);
          this.goalPause = 80;
          this.ball.inNet = null; // (a bola entra na rede: ballIntoNet)
          // quem fez o gol comemora (pula, soco no ar) enquanto a bola está na rede
          scorer.celebrateUntil = (this.animClock || 0) + 80;
          this.pendingKickoff = 'away';
          this.updateHUD();

          // Com clímax no roteiro (ex: Sub-20), quem encerra o jogo é a animação do 3 x 3, não a meta de gols
          const afterGoal = () => {
            // Gol durante o tutorial não conta (encerrava o Prólogo em 1 x 0 e pulava a
            // escolha do passe para o Tada)
            if (this.tutorial) {
              this.scoreHome = Math.max(0, this.scoreHome - 1);
              if (mine) this.matchStats.goals = Math.max(0, this.matchStats.goals - 1);
              this.updateHUD();
              this.showBanner('TREINO DO TUTORIAL', 'Esse gol não conta: termine o tutorial para valer.', '#94a3b8', 90);
              return;
            }
            if (this.chapter.script?.climax) {
              this.checkClimax();
            } else if (this.scoreHome >= Math.min(this.chapter.goalLimit || Infinity, this.chapter.targetGoals || 3) && this.scoreHome > this.scoreAway) {
              // (só encerra na frente: bater a meta perdendo não termina mais o jogo em derrota)
              // A partida acaba depois da comemoração e do replay
              this.finishAfterReplay = true;
            }
          };
          // Seu primeiro gol em alguns capítulos vira a cena do anime (ex: o chute direto contra o Time V)
          if (this.chapter.firstGoalSakuga && scorer === this.playerEntity && !this.firstGoalSakugaDone) {
            this.firstGoalSakugaDone = true;
            this.skipReplayOnce = true;
            this.mouse.down = false;
            window.CutsceneEngine.playActionSakuga(this.chapter.firstGoalSakuga, afterGoal);
            return;
          }
          afterGoal();
          return;
        } else if (this.ball.z <= this.GOAL_HEIGHT + 16) {
          this.ball.vx = -this.ball.vx * 0.7;
          this.ball.vz = 3.5;
          this.spawnParticles(this.PITCH_HALF_X, this.ball.y, this.GOAL_HEIGHT, '#facc15', 30);
          window.SFX?.post();
          this.impact(9);
          this.showBanner('NO TRAVESSÃO ALTO!', 'Explodiu no ferro superior!', '#facc15', 65);
        }
      }

      // GOL ESQUERDO
      if (this.mode === 'match' && this.ball.x <= -this.PITCH_HALF_X + 10 && Math.abs(this.ball.y) <= this.GOAL_HALF_WIDTH && this.ball.z <= this.GOAL_HEIGHT) {
        if (this.scriptBlocksGoal('away')) {
          this.miracleSave('home');
          return;
        }
        this.scoreAway++;
        this.matchStats.conceded++;
        this.rate(-0.2, 'GOL SOFRIDO');
        this.netShakeTimer = 35;
        this.spawnParticles(-this.PITCH_HALF_X - 10, this.ball.y, this.ball.z, '#ef4444', 45);
        this.showBanner('GOL DO ADVERSÁRIO!', 'Aperte [R] para pedir a bola e parta para o contra-ataque!', '#ef4444', 95);
        const rivalScorer = this.ball.lastTouch && this.ball.lastTouch.team === 'away' ? this.ball.lastTouch.name.toUpperCase() : 'RIVAL';
        this.showGoalFx('GOL DELES...', rivalScorer, '#ef4444');
        this.impact(10, 0, 6);
        window.SFX?.concede();
        this.goalPause = 60;
        this.ball.inNet = null; // (a bola entra na rede: ballIntoNet)
        if (this.ball.lastTouch && this.ball.lastTouch.team === 'away') this.ball.lastTouch.celebrateUntil = (this.animClock || 0) + 60;
        this.pendingKickoff = 'home';
        this.updateHUD();
        this.checkClimax();
        // Limite de gols (liga: NEL 3, profissional 4 — quem chegar primeiro encerra a partida)
        if (this.chapter.goalLimit && this.scoreAway >= this.chapter.goalLimit) this.finishAfterReplay = true;
        return;
      }

      if (this.ball.y < -this.PITCH_HALF_Y || this.ball.y > this.PITCH_HALF_Y) this.ball.vy *= -0.82;
      if (this.ball.x < -this.PITCH_HALF_X || this.ball.x > this.PITCH_HALF_X) {
        if (this.mode === 'training') {
          // nos anéis a bola só volta pro pé (sem teletransportar no meio da corrida)
          if (this.trnMode() === 'rings') this.ball.owner = p;
          else {
            this.trnMiss();
            this.trnResetBall();
          }
        } else {
          this.ball.vx *= -0.82;
        }
      }
      this.ball.x = Math.max(-this.PITCH_HALF_X - 5, Math.min(this.PITCH_HALF_X + 5, this.ball.x));
      this.ball.y = Math.max(-this.PITCH_HALF_Y - 5, Math.min(this.PITCH_HALF_Y + 5, this.ball.y));
    }

    this.recordReplayFrame();
    this.updateEffects();
  },

  // ==========================================================================
  // REPLAY DO GOL: grava os últimos ~3,5s (bola, jogadores, câmera) o tempo todo;
  // depois do gol, toca a jogada em câmera lenta com tarja "REPLAY" e então
  // a bola volta pro meio. ESPAÇO / clique pula.
  // ==========================================================================
  REPLAY_FRAMES: 210,

  // Profundidade da rede (o desenho do gol usa a mesma: drawTallGoal3D)
  NET_DEPTH: 66,
  // Depois do gol a bola continuava parada na boca do gol (o gol conta ao chegar na linha e
  // a comemoração congela tudo): agora ela segue para dentro, estufa o fundo da rede onde
  // bater e cai. Devolve true enquanto ainda se mexe.
  ballIntoNet() {
    const b = this.ball;
    if (!b || b.owner || b.inNet === 'stop') return false;
    const s = b.x >= 0 ? 1 : -1;
    if (Math.abs(b.x) < this.PITCH_HALF_X - 40 || Math.abs(b.y) > this.GOAL_HALF_WIDTH + 6) return false;
    if (!b.inNet) {
      b.inNet = 'go';
      // para dentro com a força do chute (no mínimo rolando, no máximo um tiro forte)
      b.vx = s * Math.max(5, Math.min(20, Math.abs(b.vx)));
      b.vy = Math.max(-3, Math.min(3, b.vy * 0.5));
      b.curve = 0;
      b.spin = 0;
      this.netShakeTimer = 0; // (a rede estufa quando a bola chegar no fundo)
    }
    const back = s * (this.PITCH_HALF_X + this.NET_DEPTH - 12);
    b.x += b.vx;
    b.y += b.vy;
    b.z += b.vz;
    b.vz -= 0.24;
    const hw = this.GOAL_HALF_WIDTH - 10;
    if (Math.abs(b.y) > hw) {
      b.y = Math.sign(b.y) * hw;
      b.vy *= -0.3;
    }
    const top = this.GOAL_HEIGHT - 10;
    if (b.z > top) {
      b.z = top;
      b.vz = -Math.abs(b.vz) * 0.3;
    }
    if (b.z <= 0) {
      b.z = 0;
      b.vz = Math.abs(b.vz) > 1.2 ? Math.abs(b.vz) * 0.35 : 0;
      // (rolando: perde pouco, para chegar no fundo; só depois de bater lá ela freia)
      const fr = b.inNet === 'go' ? 0.97 : 0.85;
      b.vx *= fr;
      b.vy *= fr;
    }
    if ((b.x - back) * s >= 0) {
      b.x = back;
      if (b.inNet === 'go') {
        // bateu no fundo: a rede estufa ali e segura a bola
        b.inNet = 'back';
        this.netShakeTimer = 35;
        this._netHit = null;
        this.impact?.(3);
      }
      b.vx = -s * 0.4;
      b.vy *= 0.5;
    }
    if (b.z === 0 && b.vz === 0 && Math.abs(b.vx) < 0.3) {
      b.vx = 0;
      b.vy = 0;
      b.inNet = 'stop';
    }
    return true;
  },

  recordReplayFrame() {
    if (this.mode !== 'match') return;
    if (!this.replayBuf) this.replayBuf = [];
    this.replayBuf.push({
      frame: this.frame,
      cam: { x: this.camera.x, y: this.camera.y },
      ball: { x: this.ball.x, y: this.ball.y, z: this.ball.z, color: this.ball.color },
      ents: this.entities.map((e) => [e.x, e.y, e.z || 0, e.animState, e.facingRight, e.animTimer])
    });
    if (this.replayBuf.length > this.REPLAY_FRAMES) this.replayBuf.shift();
  },

  startReplay() {
    const frames = this.replayBuf || [];
    if (this.skipReplayOnce || frames.length < 30) {
      this.skipReplayOnce = false;
      this.endReplay();
      return;
    }
    // O texto gigante sai; quem marcou fica pequeno no canto do replay
    this.replay = { frames: frames.slice(), pos: 0, label: this.goalFx ? `${this.goalFx.text} ${this.goalFx.sub || ''}`.trim() : '' };
    this.goalFx = null;
    this.replayBuf = [];
  },

  // Câmera lenta: meio quadro por atualização (no fim, um pouco mais lento ainda)
  stepReplay() {
    const r = this.replay;
    const n = r.frames.length;
    r.pos += r.pos > n - 50 ? 0.35 : 0.5;
    if (r.pos >= n - 1) {
      this.endReplay();
      return;
    }
    const f = r.frames[Math.floor(r.pos)];
    this.frame = f.frame;
    // Câmera de transmissão: puxada para a bola
    const maxCamX = this.PITCH_HALF_X - 480;
    this.camera.x = Math.max(-maxCamX, Math.min(maxCamX, f.cam.x * 0.4 + f.ball.x * 0.6));
    this.camera.y = f.cam.y * 0.5 + f.ball.y * 0.5;
    Object.assign(this.ball, f.ball);
    this.ball.owner = null;
    f.ents.forEach(([x, y, z, anim, right, at], i) => {
      const e = this.entities[i];
      if (!e) return;
      e.x = x;
      e.y = y;
      e.z = z;
      e.animState = anim;
      e.facingRight = right;
      e.animTimer = at;
    });
    if (Math.floor(r.pos * 2) % 2 === 0) this.trailPoints.push({ x: this.ball.x, y: this.ball.y, z: this.ball.z, color: this.ball.color, life: 16 });
  },

  endReplay() {
    this.replay = null;
    this.goalFx = null;
    this.resetPositions(this.pendingKickoff || 'home');
    this.pendingKickoff = null;
    if (this.finishAfterReplay) {
      this.finishAfterReplay = false;
      this.finishMatch();
    }
  },

  drawReplayOverlay(ctx, W, H) {
    if (!this.replay) return;
    const bar = Math.round(H * 0.08);
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 48, W, bar);
    ctx.fillRect(0, H - bar, W, bar);
    ctx.font = 'italic 900 30px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = Math.floor(performance.now() / 400) % 2 ? '#ef4444' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(40, 48 + bar / 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('REPLAY', 58, 48 + bar / 2 + 11);
    if (this.replay.label) {
      ctx.font = 'italic 900 16px "Segoe UI", sans-serif';
      ctx.fillStyle = '#facc15';
      ctx.fillText(this.replay.label, 200, 48 + bar / 2 + 6);
    }
    ctx.font = '700 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ESPAÇO / CLIQUE PARA PULAR', W - 24, H - bar / 2 + 5);
    ctx.restore();
  },

  // Partículas, rastro da bola e faixa de aviso (rodam até durante a comemoração do gol)
  updateEffects() {
    this.particles = this.particles.filter((pt) => {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.z = Math.max(0, pt.z + pt.vz);
      pt.vz -= 0.2;
      pt.life--;
      return pt.life > 0;
    });
    this.trailPoints = this.trailPoints.filter((tp) => {
      tp.life--;
      return tp.life > 0;
    });
    if (this.popTexts?.length) this.popTexts = this.popTexts.filter((pt) => --pt.life > 0);
    if (this.dribbleFx?.length) this.dribbleFx = this.dribbleFx.filter((d) => --d.life > 0);

    if (this.camera.bannerTimer > 0) this.camera.bannerTimer--;
  },

  // Tremida de tela, flash branco e congelada (o "peso" do chute e do gol)
  impact(shake, flash = 0, freeze = 0) {
    this.shakeMag = Math.max(this.shakeMag || 0, shake);
    this.flashAlpha = Math.max(this.flashAlpha || 0, flash);
    this.hitStop = Math.max(this.hitStop || 0, freeze);
  },

  // Texto gigante do gol / defesa no meio da tela
  showGoalFx(text, sub, color) {
    this.goalFx = { text, sub, color, start: performance.now() };
  },

  drawGoalFx(ctx, W, H) {
    if (this.flashAlpha > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`;
      ctx.fillRect(0, 0, W, H);
      this.flashAlpha *= 0.86;
    }
    const g = this.goalFx;
    if (!g) return;
    const k = (performance.now() - g.start) / 16.67;
    const dur = 110;
    if (k > dur) {
      this.goalFx = null;
      return;
    }
    const pop = Math.min(1, k / 7);
    const out = k > dur - 14 ? (dur - k) / 14 : 1;
    const cy = H * 0.4;
    ctx.save();
    ctx.globalAlpha = Math.max(0, out);
    // Faixa inclinada atrás do texto, com linhas de velocidade
    ctx.translate(W / 2, cy);
    ctx.rotate(-0.06);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
    const bandW = W * 1.4 * Math.min(1, k / 10);
    ctx.fillRect(-bandW / 2, -82, bandW, 150);
    ctx.fillStyle = g.color;
    ctx.fillRect(-bandW / 2, -86, bandW, 5);
    ctx.fillRect(-bandW / 2, 66, bandW, 5);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const y = -70 + i * 10;
      const x = ((i * 137 + k * 38) % (W * 1.4)) - W * 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 180, y);
      ctx.stroke();
    }
    const scale = 1.8 - 0.8 * pop + Math.sin(k * 0.3) * 0.015;
    ctx.scale(scale, scale);
    ctx.font = 'italic 900 92px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#020617';
    ctx.strokeText(g.text, 0, 10);
    const grad = ctx.createLinearGradient(0, -60, 0, 20);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, g.color);
    ctx.fillStyle = grad;
    ctx.fillText(g.text, 0, 10);
    if (g.sub && k > 10) {
      ctx.font = 'italic 900 24px "Segoe UI", sans-serif';
      ctx.lineWidth = 6;
      ctx.strokeText(g.sub, 0, 52);
      ctx.fillStyle = '#facc15';
      ctx.fillText(g.sub, 0, 52);
    }
    ctx.restore();
  },

  // ==========================================================================
  // NOTA DA PARTIDA (0 a 10, começa em 6.0): cada lance sobe ou desce a nota,
  // com um "+0.2 DRIBLE" subindo em cima de você e a nota ao vivo no placar.
  // ==========================================================================
  rate(delta, label) {
    if (this.mode !== 'match') return;
    this.rating = Math.max(3, Math.min(10, (this.rating || 6) + delta));
    // Modo Dupla: a nota do parceiro aparece só na tela dele
    if (this._remoteCtx) {
      this.duoSendRate?.(delta, label, this.rating);
      return;
    }
    this.popTexts = this.popTexts || [];
    const p = this.playerEntity;
    this.popTexts.push({
      text: `${delta > 0 ? '+' : ''}${delta.toFixed(Math.abs(delta) < 0.1 ? 2 : 1)} ${label}`,
      color: delta > 0 ? '#4ade80' : '#f87171',
      x: p.x,
      y: p.y,
      z: (p.z || 0) + 70 + (this.popTexts.length % 3) * 16,
      life: 70
    });
    const el = document.getElementById('match-rating-display');
    if (el) {
      el.textContent = this.rating.toFixed(1);
      el.style.color = this.ratingColor(this.rating);
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  },

  ratingColor(r) {
    return r >= 9 ? '#facc15' : r >= 8 ? '#4ade80' : r >= 7 ? '#38bdf8' : r >= 6 ? '#e2e8f0' : '#f87171';
  },

  drawPopTexts(ctx) {
    (this.popTexts || []).forEach((pt) => {
      const pr = this.project3D(pt.x, pt.y, pt.z + (70 - pt.life) * 0.6);
      ctx.save();
      ctx.globalAlpha = Math.min(1, pt.life / 20);
      ctx.font = 'italic 900 15px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#020617';
      ctx.strokeText(pt.text, pr.sx, pr.sy);
      ctx.fillStyle = pt.color;
      ctx.fillText(pt.text, pr.sx, pr.sy);
      ctx.restore();
    });
  },

  // Nota final e o bônus de EgoCoins pela atuação
  getMatchReport() {
    const s = this.matchStats;
    const won = this.scoreHome > this.scoreAway;
    if (won) this.rate(0.4, 'VITÓRIA');
    else if (this.scoreHome < this.scoreAway) this.rate(-0.3, 'DERROTA');
    const rating = Math.round(this.rating * 10) / 10;
    const grade = rating.toFixed(1);
    const bonus = (rating >= 9.5 ? 250 : rating >= 9 ? 200 : rating >= 8 ? 120 : rating >= 7 ? 70 : rating >= 6 ? 30 : 0) + s.angleGoals * 40;
    // Pontos de atributo pelo que você FEZ em campo (driblou → Condução, tocou → Visão...)
    const cap = (v, max) => Math.max(0, Math.min(max, Math.floor(v)));
    const gains = {
      finalizando: cap(s.onTarget / 2, 3),
      poderDisparo: cap(s.goals, 2),
      tirosLongos: cap(s.longGoals, 2),
      conducao: cap(s.dribbles / 2, 3),
      velocidade: cap(s.sprintFrames / 600, 2),
      resistencia: 1,
      visao: cap(s.passes / 3, 3),
      forca: cap(s.steals / 2, 2),
      posicionamento: cap(s.steals, 2),
      compostura: s.angleGoals > 0 || won ? 1 : 0,
      ego: cap(s.goals, 2),
      habilidadeAerea: cap(s.skills / 3, 1)
    };
    Object.keys(gains).forEach((k) => {
      if (!gains[k]) delete gains[k];
    });
    return Object.assign({ grade, rating, color: this.ratingColor(rating), bonus, gains }, s);
  },

  // ==========================================================================
  // RENDERIZADOR DE MAPAS / ESTÁDIOS QUE MUDAM COM A LORE!
  // ==========================================================================
  getMapColors(theme) {
    switch (theme) {
      case 'school_sunset': // Prólogo Ensino Médio (Pôr do sol laranja, escola japonesa)
        return {
          skyTop: '#c2410c', skyBot: '#fb923c', building: '#fef3c7', signBg: '#7c2d12',
          signText: 'ICHINAN HIGH SCHOOL • REGIONAL FINAL', boardBg: '#b45309',
          grass1: '#4d9c45', grass2: '#428a3b', sponsors: ['ICHINAN HS', 'SAITAMA', 'HIGH SCHOOL', 'NATIONALS', 'JFU YOUTH', 'MATSUKAZE']
        };
      case 'bluelock_bunker': // 1ª Seleção Prédio 5 (Bunker Subterrâneo Escuro Metálico!)
        return {
          skyTop: '#020617', skyBot: '#0f172a', building: '#1e293b', signBg: '#090d16',
          signText: 'BLUE LOCK FACILITY • STRATUM 5 BUNKER', boardBg: '#1d4ed8',
          grass1: '#0f4c3a', grass2: '#0b3b2d', sponsors: ['BLUE LOCK', 'TEAM Z', 'STRATUM 5', 'EGO JINPACHI', 'SURVIVAL', 'BL RANKING']
        };
      case 'bluelock_holo': // 2ª e 3ª Seleção (Câmara Holográfica Futurista)
        return {
          skyTop: '#090d16', skyBot: '#1e1b4b', building: '#312e81', signBg: '#0f172a',
          signText: 'BLUE LOCK CENTRAL HOLO-CHAMBER', boardBg: '#7c3aed',
          grass1: '#115e59', grass2: '#0f4c48', sponsors: ['RIVALRY BATTLE', 'WORLD FIVE', 'CHEMICAL', 'TOP 6', 'BLUE LOCK', 'BL HOLO']
        };
      case 'u20_national': // Partida Sub-20 do Japão (Estádio Nacional Lotado à Noite!)
        return {
          skyTop: '#030712', skyBot: '#172554', building: '#1e293b', signBg: '#991b1b',
          signText: 'JAPAN NATIONAL STADIUM • BLUE LOCK vs U-20', boardBg: '#dc2626',
          grass1: '#15803d', grass2: '#166534', sponsors: ['JFU JAPAN', 'BLUE LOCK 11', 'U-20 JAPAN', 'SAE ITOSHI', 'TOKYO LIVE', 'NATIONAL']
        };
      case 'nel_dome': // Liga Neo Egoísta (Arena BLTV Europeia!)
        return {
          skyTop: '#18181b', skyBot: '#3f3f46', building: '#27272a', signBg: '#991b1b',
          signText: 'NEO EGOIST LEAGUE • BLTV WORLD AUCTION ¥', boardBg: '#eab308',
          grass1: '#166534', grass2: '#14532d', sponsors: ['BASTARD', 'MANSHINE', 'FC BARCHA', 'UBERS', 'P.X.G', 'BLTV LIVE']
        };
      case 'worldcup_england': // Copa do Mundo Sub-20 vs Inglaterra
        return {
          skyTop: '#0c4a6e', skyBot: '#0284c7', building: '#f1f5f9', signBg: '#b91c1c',
          signText: 'U-20 WORLD CUP STADIUM • JAPAN vs ENGLAND', boardBg: '#1e3a8a',
          grass1: '#2e7d32', grass2: '#256628', sponsors: ['U-20 WORLD CUP', 'JAPAN U-20', 'ENGLAND U-20', 'THREE LIONS', 'BLUE LOCK', 'FIFA U-20']
        };
      case 'worldcup_final': // Grande Final da Copa do Mundo ("QUATRO EGOS")
        return {
          skyTop: '#040814', skyBot: '#0f172a', building: '#111827', signBg: '#00f5d4',
          signText: 'WORLD CUP GRAND FINAL • CATHEDRAL OF FOUR EGOS', boardBg: '#facc15',
          grass1: '#14532d', grass2: '#0f3f22', sponsors: ['WORLD CUP FINAL', 'QUATRO EGOS', 'SAE ITOSHI', 'JULIAN LOKI', 'HUGO', 'WORLD N°1']
        };
      default:
        return {
          skyTop: '#1e3a8a', skyBot: '#60a5fa', building: '#e2e8f0', signBg: '#091532',
          signText: 'BLUE LOCK TRAINING CENTRE', boardBg: '#eab308',
          grass1: '#3f8f4e', grass2: '#357e43', sponsors: ['BLUE LOCK', 'JFU JAPAN', 'EGOIST LAB', 'MANSHINE', 'BASTARD', 'PXG PARIS']
        };
    }
  },

  // ==========================================================================
  // GRÁFICOS DO ESTÁDIO (tudo guardado em cache: desenha uma vez, cola a cada quadro)
  // ==========================================================================
  // Torcida de cada mapa (cores das camisas); null = instalação do Blue Lock, sem torcida
  CROWD_COLORS: {
    u20_national: ['#dc2626', '#f8fafc', '#1d4ed8', '#f8fafc', '#991b1b', '#1e3a8a'],
    worldcup_england: ['#f8fafc', '#dc2626', '#1d4ed8', '#f8fafc', '#1e3a8a', '#facc15'],
    worldcup_final: ['#1d4ed8', '#f8fafc', '#1e3a8a', '#ef4444', '#facc15', '#f8fafc'],
    nel_dome: ['#eab308', '#f8fafc', '#dc2626', '#38bdf8', '#7f1d1d', '#1e1b4b'],
    school_sunset: ['#1d4ed8', '#f8fafc', '#475569', '#f8fafc'],
    bluelock_bunker: null,
    bluelock_holo: null
  },
  // Tons de pele da torcida atrás dos gols (drawEndStand)
  CROWD_SKINS: ['#f3d1b8', '#e5b899', '#c99472', '#8d5a3b'],

  getStadiumBackdrop(themeId, theme, W, horizonY) {
    const key = `${themeId}|${W}|${horizonY}`;
    if (this._backdrop?.key === key) return this._backdrop.cv;
    const BW = W + 600;
    const cv = document.createElement('canvas');
    cv.width = BW;
    cv.height = horizonY;
    const g = cv.getContext('2d');
    const shade = (c, a) => window.PixelRenderer.shade(c, a);
    let seed = 11;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const sky = g.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, theme.skyTop);
    sky.addColorStop(1, theme.skyBot);
    g.fillStyle = sky;
    g.fillRect(0, 0, BW, horizonY);
    const standTop = 24;
    const standBot = horizonY - 20;
    const crowd = themeId in this.CROWD_COLORS ? this.CROWD_COLORS[themeId] : ['#1d4ed8', '#f8fafc', '#eab308', '#dc2626', '#475569'];
    // Arquibancada: degraus com tons alternados, mais escuros lá em cima
    for (let y = standTop, row = 0; y < standBot; y += 6, row++) {
      const k = (y - standTop) / Math.max(1, standBot - standTop);
      g.fillStyle = shade(theme.building, row % 2 ? -0.45 + k * 0.25 : -0.35 + k * 0.25);
      g.fillRect(0, y, BW, 6);
    }
    if (crowd) {
      // Torcida: cada pessoa é uma cabeça (pele) e o corpo (cor da camisa); mais gente embaixo
      const skins = ['#f3d1b8', '#e5b899', '#c99472', '#8d5a3b', '#f1d3bd'];
      for (let y = standTop + 2; y < standBot - 6; y += 6) {
        const k = (y - standTop) / Math.max(1, standBot - standTop);
        for (let x = 2; x < BW; x += 6) {
          if (rnd() > 0.55 + k * 0.4) continue;
          const dark = 1 - (0.35 - k * 0.3);
          g.globalAlpha = dark;
          g.fillStyle = skins[Math.floor(rnd() * skins.length)];
          g.fillRect(x, y, 3, 2);
          g.fillStyle = crowd[Math.floor(rnd() * crowd.length)];
          g.fillRect(x - 1, y + 2, 5, 3);
        }
      }
      g.globalAlpha = 1;
    } else {
      // Instalação do Blue Lock: painéis de metal com faixas de luz azul
      for (let x = 0; x < BW; x += 90) {
        g.fillStyle = 'rgba(148,163,184,0.12)';
        g.fillRect(x + 4, standTop + 4, 82, standBot - standTop - 8);
        g.fillStyle = 'rgba(56,189,248,0.55)';
        g.fillRect(x + 8, standTop + 10, 74, 2);
        g.fillRect(x + 8, standBot - 14, 74, 2);
      }
    }
    // Teto escuro com treliça
    g.fillStyle = 'rgba(2,6,23,0.85)';
    g.fillRect(0, 0, BW, standTop);
    g.strokeStyle = 'rgba(148,163,184,0.25)';
    g.lineWidth = 1;
    for (let x = 0; x < BW; x += 28) {
      g.beginPath();
      g.moveTo(x, standTop);
      g.lineTo(x + 14, 4);
      g.lineTo(x + 28, standTop);
      g.stroke();
    }
    // Refletores acesos no teto, com o brilho já desenhado
    for (let x = 120; x < BW; x += 300) {
      const glow = g.createRadialGradient(x, 12, 4, x, 12, 150);
      glow.addColorStop(0, 'rgba(255,255,255,0.75)');
      glow.addColorStop(0.25, 'rgba(219,234,254,0.25)');
      glow.addColorStop(1, 'rgba(219,234,254,0)');
      g.fillStyle = glow;
      g.fillRect(x - 150, 0, 300, horizonY);
      g.fillStyle = '#f8fafc';
      for (let i = 0; i < 4; i++) g.fillRect(x - 22 + i * 12, 8, 8, 6);
    }
    // Faixa com o nome do estádio na frente da arquibancada
    g.fillStyle = theme.signBg;
    g.fillRect(0, standBot - 14, BW, 12);
    g.fillStyle = theme.signBg === '#00f5d4' ? '#090d16' : '#ffffff';
    g.font = 'italic 900 10px "Segoe UI", sans-serif';
    g.textAlign = 'left';
    const step = Math.max(300, g.measureText(theme.signText).width + 70);
    for (let x = 10; x < BW; x += step) g.fillText(theme.signText, x, standBot - 4.5);
    cv.hasCrowd = !!crowd;
    this._backdrop = { key, cv };
    return cv;
  },

  // Atrás de cada gol (side -1 = esquerda, 1 = direita). Tudo é desenhado em coordenadas do
  // campo (encolhe com a distância como o resto): nos estádios, área de escape, placas de
  // LED, fosso e a arquibancada em degraus com cada torcedor; no Blue Lock, o chão da sala
  // com a grade de luz e a parede de metal com neon
  // Cores derivadas do tema para a arquibancada do fundo (antes recalculadas e remontadas
  // como texto a cada quadro, nos dois lados)
  standColors(themeId, theme) {
    const key = themeId || '-';
    let c = this._standC;
    if (c && c.key === key && c.g2 === theme.grass2 && c.bb === theme.boardBg) return c;
    const shade = (col, a) => window.PixelRenderer.shade(col, a);
    const crowd = this.CROWD_COLORS[themeId] || ['#1d4ed8', '#f8fafc', '#eab308', '#dc2626', '#475569'];
    c = this._standC = { key, g2: theme.grass2, bb: theme.boardBg, crowd, floor: shade(theme.grass2, -0.45), escape: shade(theme.grass2, -0.12), seatA: shade(crowd[0], -0.5), seatB: shade(crowd[0], -0.62), boardDark: shade(theme.boardBg, -0.3) };
    return c;
  },

  // Fonte '900 Npx "Segoe UI"' guardada por tamanho (sem montar o texto a cada quadro)
  fontPx(n) {
    const m = this._fontPx || (this._fontPx = {});
    return m[n] || (m[n] = `900 ${n}px "Segoe UI", sans-serif`);
  },

  drawEndStand(ctx, side, theme, hx, hy) {
    const W = this.VW || this.canvas.width;
    const H = this.VH || this.canvas.height;
    // Pontos sem criar objeto (this.projector): são ~600 torcedores e dezenas de degraus
    // por lado a cada quadro. A ordem do desenho é a mesma de antes
    const PJ = this.projector();
    const X = (x, y, z) => PJ.x(side * x, y, z);
    // o mesmo caminho do drawPoly3D (4 cantos), sem montar arrays
    const quad = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
      ctx.moveTo(X(ax, ay, az), PJ.y);
      ctx.lineTo(X(bx, by, bz), PJ.y);
      ctx.lineTo(X(cx, cy, cz), PJ.y);
      ctx.lineTo(X(dx, dy, dz), PJ.y);
      ctx.closePath();
    };
    const poly = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, fill, stroke, lw = 2) => {
      ctx.beginPath();
      quad(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    };
    const line = (ax, ay, az, bx, by, bz, color, width) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(X(ax, ay, az), PJ.y);
      ctx.lineTo(X(bx, by, bz), PJ.y);
      ctx.stroke();
    };
    // Texto deitado ao longo de uma parede/placa (x fixo), centrado em y, na altura z
    const textAlong = (x, y, z, text, color, size) => {
      const px = X(x, y - 40, z);
      const py = PJ.y;
      const qx = X(x, y + 40, z);
      const qy = PJ.y;
      const cx = X(x, y, z);
      const cy = PJ.y;
      const cs = PJ.s;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(qy - py, qx - px));
      ctx.font = this.fontPx(Math.max(7, Math.round(size * cs)));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };
    const y0 = -hy - 70;
    const y1 = hy + 420;
    const far = hx + 1700;
    // Fora da tela (a câmera está do outro lado do campo): não desenha nada. O x na tela
    // só depende de x e y (a altura z mexe no y), então basta olhar a linha de fundo
    // nas duas pontas
    const offScreen = (x) => {
      const pa = X(x, y0, 0);
      const pb = X(x, y1, 0);
      return side > 0 ? Math.min(pa, pb) > W + 40 : Math.max(pa, pb) < -40;
    };
    if (offScreen(hx)) return;
    const themeId = this.chapter?.mapTheme;
    const facility = themeId in this.CROWD_COLORS && !this.CROWD_COLORS[themeId];
    const C = this.standColors(themeId, theme);
    ctx.save();

    if (facility) {
      // Chão da sala continuando depois da linha de fundo, com a grade de luz ciano
      const xw = hx + 300;
      poly(hx, y0, 0, far, y0, 0, far, y1, 0, hx, y1, 0, C.floor);
      for (let y = y0; y <= y1; y += 140) line(hx, y, 0, xw, y, 0, 'rgba(56,189,248,0.16)', 1.5);
      for (let x = hx + 75; x < xw; x += 75) line(x, y0, 0, x, y1, 0, 'rgba(56,189,248,0.16)', 1.5);
      // Parede de metal com costuras, dois neons e o nome do projeto
      const wallH = 170;
      poly(xw, y0, 0, xw, y1, 0, xw, y1, wallH, xw, y0, wallH, '#0b1220', 'rgba(148,163,184,0.35)', 1);
      for (let y = y0 + 160; y < y1; y += 160) line(xw, y, 0, xw, y, wallH, 'rgba(148,163,184,0.22)', 1);
      for (let n = 0; n < 2; n++) {
        const z = n ? wallH - 18 : 16;
        line(xw, y0, z, xw, y1, z, 'rgba(56,189,248,0.25)', 8);
        line(xw, y0, z, xw, y1, z, '#38bdf8', 2.5);
      }
      for (let y = y0 + 200; y < y1; y += 520) textAlong(xw, y, wallH / 2, 'BLUE LOCK', 'rgba(148,163,184,0.55)', 30);
      // Atrás da parede: o escuro do bunker
      poly(xw, y0, wallH, far, y0, wallH, far, y1, wallH, xw, y1, wallH, '#04070e');
      ctx.restore();
      return;
    }

    // Área de escape gramada
    const xb = hx + 190;
    poly(hx, y0, 0, xb, y0, 0, xb, y1, 0, hx, y1, 0, C.escape);
    // Fosso de concreto atrás das placas
    const x1 = xb + 70;
    poly(xb, y0, 0, x1, y0, 0, x1, y1, 0, xb, y1, 0, '#111827');
    // Arquibancada em degraus: cada fileira um degrau, cadeiras em dois tons
    const crowd = C.crowd;
    const seatA = C.seatA;
    const seatB = C.seatB;
    const T = 9;
    const depth = 92;
    const rise = 38;
    const z0 = 34;
    for (let i = 0; i < T; i++) {
      const a = x1 + i * depth;
      const z = z0 + i * rise;
      // Espelho do degrau (a parte em pé) e o piso com as cadeiras
      poly(a, y0, z - rise, a, y1, z - rise, a, y1, z, a, y0, z, '#1f2937');
      poly(a, y0, z, a + depth, y0, z, a + depth, y1, z, a, y1, z, i % 2 ? seatA : seatB);
    }
    const xe = x1 + T * depth;
    const top = z0 + (T - 1) * rise;
    // Escadas (corredores claros) cortando os degraus (uma a uma: num caminho só a placa
    // de vídeo suaviza a borda de outro jeito e muda alguns pixels)
    const aisle = 34 * 14;
    for (let y = y0 + aisle - 17; y < y1; y += aisle) {
      for (let i = 0; i < T; i++) {
        const a = x1 + i * depth;
        const z = z0 + i * rise;
        poly(a, y, z, a + depth, y, z, a + depth, y + 22, z, a, y + 22, z, 'rgba(203,213,225,0.35)');
      }
    }
    // A torcida: uma pessoa por cadeira (algumas vazias), alguns pulando
    const skins = this.CROWD_SKINS;
    // Duas fileiras de gente em cada degrau (a de trás desenhada primeiro)
    for (let i = 0; i < T; i++) {
      const z = z0 + i * rise;
      for (let row = 0; row < 2; row++) {
        const a = x1 + i * depth + depth * (row ? 0.3 : 0.72);
        if (offScreen(a)) continue;
        for (let y = y0 + 17 + row * 12, k = 0; y < y1; y += 34, k++) {
          if (k % 14 === 13) continue;
          const seed = (i * 131 + k * 71 + row * 37 + side * 17) & 1023;
          if (seed % 10 > 7) continue;
          const jump = (this.frame + seed * 3) % 90 < 8 ? 6 : 0;
          const sx = X(a, y, z + jump);
          if (sx < -30 || sx > W + 30) continue;
          const sy = PJ.y;
          const s = PJ.s;
          // fora da tela em cima ou embaixo (o torcedor vai de sy - 22s até sy - 2s)
          if (sy < -30 || sy - 22 * s > H + 30) continue;
          ctx.fillStyle = crowd[seed % crowd.length];
          ctx.fillRect(sx - 7 * s, sy - 14 * s, 14 * s, 12 * s);
          ctx.fillStyle = skins[seed % skins.length];
          ctx.fillRect(sx - 4 * s, sy - 22 * s, 8 * s, 8 * s);
        }
      }
    }
    // Lateral da arquibancada no lado do fundo (fecha a quina com a arquibancada da parede)
    poly(x1, y0, 0, xe, y0, 0, xe, y0, top, x1, y0, z0, '#141b2b', 'rgba(2,6,23,0.9)', 2);
    // Sombra da cobertura depois do último degrau
    poly(xe, y0, top, far, y0, top + 260, far, y1, top + 260, xe, y1, top, '#070b16');
    line(xe, y0, top, xe, y1, top, 'rgba(148,163,184,0.5)', 3);
    // Placas de LED (por cima do fosso, de frente para o campo) com os patrocinadores
    const boardH = 30;
    for (let y = y0, n = 0; y < y1; y += 160, n++) {
      poly(xb, y, 0, xb, y + 154, 0, xb, y + 154, boardH, xb, y, boardH, n % 2 ? theme.boardBg : C.boardDark, null);
      textAlong(xb, y + 77, boardH / 2, theme.sponsors[n % theme.sponsors.length] || 'BLUE LOCK', '#ffffff', 13);
    }
    line(xb, y0, boardH, xb, y1, boardH, 'rgba(255,255,255,0.55)', 1.5);
    ctx.restore();
  },
  // Marcações que faltavam: pequena área, pênaltis, meia-lua, escanteios e o ponto central
  drawPitchDetails(ctx, hx, hy, centerP) {
    const line = 'rgba(255,255,255,0.85)';
    // As curvas (meia-lua e escanteios) são fixas no campo: os pontos são calculados uma
    // vez e só projetados a cada quadro (antes eram dezenas de arrays novos por quadro)
    let D = this._pitchDet;
    if (!D || D.hx !== hx || D.hy !== hy) {
      D = this._pitchDet = { hx, hy, boxes: [[[-hx, -110, 0], [-hx + 100, -110, 0], [-hx + 100, 110, 0], [-hx, 110, 0]], [[hx - 100, -110, 0], [hx, -110, 0], [hx, 110, 0], [hx - 100, 110, 0]]], arcs: [], corners: [] };
      [-1, 1].forEach((s) => {
        const spot = s * (hx - 190);
        // Meia-lua: só a parte do círculo do pênalti que fica fora da grande área
        const arc = [];
        for (let a = -1.2; a <= 1.2; a += 0.1) {
          const x = spot - s * Math.cos(a) * 130;
          if (s * x < hx - 280) arc.push(x, Math.sin(a) * 130);
        }
        D.arcs.push(arc);
        // Escanteios
        [-1, 1].forEach((t) => {
          const pts = [];
          for (let a = 0; a <= Math.PI / 2 + 0.01; a += Math.PI / 12) pts.push(s * (hx - Math.cos(a) * 26), t * (hy - Math.sin(a) * 26));
          D.corners.push(pts);
        });
      });
    }
    const P = this.projector();
    // pts = [x0, y0, x1, y1, ...] no chão
    const path = (pts) => {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 2) {
        const x = P.x(pts[i], pts[i + 1], 0);
        if (i) ctx.lineTo(x, P.g);
        else ctx.moveTo(x, P.g);
      }
      ctx.stroke();
    };
    const dot = (x, y, r) => {
      const sx = P.x(x, y, 0);
      ctx.beginPath();
      ctx.ellipse(sx, P.g, r * P.s, r * 0.55 * P.s, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    ctx.save();
    ctx.strokeStyle = line;
    ctx.fillStyle = line;
    ctx.lineWidth = 2;
    this.drawPoly3D(ctx, D.boxes[0], null, line, 2);
    this.drawPoly3D(ctx, D.boxes[1], null, line, 2);
    ctx.beginPath();
    ctx.ellipse(centerP.sx, centerP.groundY, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 2; k++) {
      dot((k ? 1 : -1) * (hx - 190), 0, 4);
      if (D.arcs[k].length > 2) path(D.arcs[k]);
      path(D.corners[k * 2]);
      path(D.corners[k * 2 + 1]);
    }
    ctx.restore();
  },

  // Luz do estádio por cima de tudo do campo: névoa no fundo, poças de luz e vinheta
  drawStadiumLighting(ctx, W, H, horizonY) {
    // Antes eram 5 gradientes pintando ~4 telas inteiras por quadro (o maior custo da
    // partida). Agora tudo é desenhado UMA vez numa imagem pequena (1/4, é só degradê)
    // e colado com 1 drawImage esticado
    const key = `${W}|${H}`;
    if (this._lightKey !== key) {
      this._lightKey = key;
      const q = 0.25;
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.ceil(W * q));
      cv.height = Math.max(1, Math.ceil(H * q));
      const g = cv.getContext('2d');
      g.scale(cv.width / W, cv.height / H);
      // A névoa começa acima do horizonte (o gramado do fundo passa dele) para não deixar emenda
      const haze = g.createLinearGradient(0, horizonY * 0.55, 0, horizonY + (H - horizonY) * 0.45);
      haze.addColorStop(0, 'rgba(8,15,35,0.3)');
      haze.addColorStop(1, 'rgba(8,15,35,0)');
      g.fillStyle = haze;
      g.fillRect(0, horizonY * 0.55, W, horizonY * 0.45 + (H - horizonY) * 0.45);
      [0.18, 0.5, 0.82].forEach((fx) => {
        const r = g.createRadialGradient(W * fx, H * 0.6, 10, W * fx, H * 0.6, W * 0.3);
        r.addColorStop(0, 'rgba(255,255,240,0.07)');
        r.addColorStop(1, 'rgba(255,255,240,0)');
        g.fillStyle = r;
        g.fillRect(W * fx - W * 0.3, horizonY, W * 0.6, H - horizonY);
      });
      const vig = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.42)');
      g.fillStyle = vig;
      g.fillRect(0, 0, W, H);
      this._light = cv;
    }
    // esticar SEM suavizar: 10x mais barato (medido: 1,9 x 19,6 ms no celular) e, como é só
    // degradê bem lento (menos de 1/255 de diferença por bloco de 4 px), não aparece bloco
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this._light, 0, 0, W, H);
    ctx.restore();
  },

  // Sombra pronta dos bonecos (em unidades do campo, K pixels por unidade): as duas
  // sombras compridas dos refletores + a de baixo do pé (ciano no seu jogador)
  getShadowSprite(isPlayer) {
    this._shadowSpr = this._shadowSpr || {};
    const key = isPlayer ? 'p' : 'n';
    if (this._shadowSpr[key]) return this._shadowSpr[key];
    const K = 3;
    const uw = 76;
    const uh = 24;
    const ox = 38;
    const oy = 15;
    const cv = document.createElement('canvas');
    cv.width = uw * K;
    cv.height = uh * K;
    const g = cv.getContext('2d');
    g.scale(K, K);
    g.translate(ox, oy);
    g.fillStyle = 'rgba(0, 0, 0, 0.14)';
    [-1, 1].forEach((d) => {
      g.beginPath();
      g.ellipse(d * 15, -3, 19, 4, d * -0.45, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = isPlayer ? 'rgba(0, 245, 212, 0.4)' : 'rgba(0, 0, 0, 0.5)';
    g.beginPath();
    g.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2);
    g.fill();
    Object.assign(cv, { uw, uh, ox, oy });
    this._shadowSpr[key] = cv;
    return cv;
  },

  // Nome com contorno em cima do jogador, guardado pronto (ax/ay = ponto de ancoragem:
  // centro do texto na linha de base, como o fillText centrado de antes)
  getNameTag(text, px, color) {
    this._tags = this._tags || new Map();
    const key = `${text}|${px}|${color}`;
    let cv = this._tags.get(key);
    if (cv) return cv;
    if (this._tags.size > 120) this._tags.clear();
    const font = `900 ${px}px "Segoe UI", sans-serif`;
    const m = this.ctx;
    m.save();
    m.font = font;
    const w = Math.ceil(m.measureText(text).width) + 8;
    m.restore();
    cv = document.createElement('canvas');
    cv.width = w;
    cv.height = Math.ceil(px * 1.5) + 6;
    const g = cv.getContext('2d');
    g.font = font;
    g.textAlign = 'center';
    g.lineJoin = 'round';
    cv.ax = w / 2;
    cv.ay = Math.ceil(px * 1.1) + 3;
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(2, 6, 23, 0.9)';
    g.strokeText(text, cv.ax, cv.ay);
    g.fillStyle = color;
    g.fillText(text, cv.ax, cv.ay);
    this._tags.set(key, cv);
    return cv;
  },

  // Acrescenta um retângulo do chão (z = 0) ao caminho atual, sem pintar
  addQuad3D(ctx, x1, y1, x2, y2) {
    // (pontos sem criar objeto: this.projector)
    const P = this.projector();
    ctx.moveTo(P.x(x1, y1, 0), P.y);
    ctx.lineTo(P.x(x2, y1, 0), P.y);
    ctx.lineTo(P.x(x2, y2, 0), P.y);
    ctx.lineTo(P.x(x1, y2, 0), P.y);
    ctx.closePath();
  },

  drawPoly3D(ctx, pts3D, fillStyle, strokeStyle, lineWidth = 2) {
    const P = this.projector();
    ctx.beginPath();
    for (let idx = 0; idx < pts3D.length; idx++) {
      const pt = pts3D[idx];
      const x = P.x(pt[0], pt[1], pt[2] || 0);
      if (idx === 0) ctx.moveTo(x, P.y);
      else ctx.lineTo(x, P.y);
    }
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  },

  // Bandeirinhas de escanteio (haste e bandeira balançando)
  drawCornerFlags(ctx, hx, hy) {
    const W = this.VW || this.canvas.width;
    const P = this.projector();
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const x = i % 2 ? hx : -hx;
      const y = i < 2 ? -hy : hy;
      // base e topo da haste têm o mesmo x na tela (a altura só mexe no y)
      const bx = P.x(x, y, 0);
      // fora da tela (a bandeira vai no máximo ~25 px para a direita da haste)
      if (bx < -60 || bx > W + 60) continue;
      const bg = P.g;
      const bs = P.s;
      const tx = P.x(x, y, 46);
      const ty = P.y;
      const ts = P.s;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = Math.max(1.5, 2.2 * bs);
      ctx.beginPath();
      ctx.moveTo(bx, bg);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      const w = Math.sin(this.frame * 0.12 + i) * 3;
      ctx.fillStyle = i % 2 ? '#facc15' : '#ef4444';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + (14 + w) * ts, ty + 4 * ts + w * 0.3);
      ctx.lineTo(tx, ty + 9 * ts);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  // Gol de verdade: sombra no gramado, rede em losangos (com a bola estufando a rede no
  // gol), ferros de sustentação atrás e traves redondas (contorno, corpo branco e brilho)
  drawTallGoal3D(ctx, side) {
    const isLeft = side === 'left';
    const s = isLeft ? -1 : 1;
    const gx = s * this.PITCH_HALF_X;
    const depth = 66;
    const hw = this.GOAL_HALF_WIDTH;
    const h = this.GOAL_HEIGHT;
    // onde a bola bateu na rede (guardado no começo do balanço)
    if (this.netShakeTimer >= 34 && this.ball && Math.sign(this.ball.x) === s) this._netHit = { s, y: this.ball.y, z: Math.min(h * 0.9, this.ball.z || 20) };
    const hit = this._netHit && this._netHit.s === s && this.netShakeTimer > 0 ? this._netHit : null;
    const shake = hit ? this.netShakeTimer / 35 : 0;
    // Pontos sem criar objeto (this.projector): são ~400 por gol a cada quadro. P.x devolve
    // o x na tela e deixa o y em P.y (P.g = chão, P.s = escala)
    const P = this.projector();
    // Gol fora da tela (o outro lado do campo): não desenha nada. O x na tela não depende
    // da altura, então bastam os 4 cantos no chão (com a sombra e o fundo estufado, que vai
    // no máximo 34 para trás); a folga cobre as traves grossas e a tremida da tela
    const W = this.VW || this.canvas.width;
    const xb = gx + s * (depth + 34);
    const c1 = P.x(gx, -hw - 4, 0);
    const c2 = P.x(gx, hw + 4, 0);
    const c3 = P.x(xb, -hw - 4, 0);
    const c4 = P.x(xb, hw + 4, 0);
    if (Math.max(c1, c2, c3, c4) < -40 || Math.min(c1, c2, c3, c4) > W + 40) return;
    // ponto da rede (u: 0..1 ao longo da largura, v: 0..1 da altura), com o fundo estufado
    const backX = (y, z) => {
      let bx = gx + s * depth;
      if (hit) {
        const d = Math.hypot((y - hit.y) / 70, (z - hit.z) / 55);
        if (d < 1) bx += s * (1 - d * d) * 34 * shake * (0.75 + 0.25 * Math.sin(this.frame * 0.9));
      }
      return bx;
    };
    ctx.save();
    // sombra do gol no gramado
    ctx.fillStyle = 'rgba(2, 10, 6, 0.28)';
    ctx.beginPath();
    const xs = gx + s * (depth + 14);
    ctx.moveTo(P.x(gx, -hw - 4, 0), P.g);
    ctx.lineTo(P.x(xs, -hw - 4, 0), P.g);
    ctx.lineTo(P.x(xs, hw + 4, 0), P.g);
    ctx.lineTo(P.x(gx, hw + 4, 0), P.g);
    ctx.closePath();
    ctx.fill();
    // fundo da rede: véu bem leve
    ctx.fillStyle = 'rgba(241, 245, 249, 0.07)';
    ctx.beginPath();
    ctx.moveTo(P.x(backX(-hw, 0), -hw, 0), P.y);
    ctx.lineTo(P.x(backX(hw, 0), hw, 0), P.y);
    ctx.lineTo(P.x(backX(hw, h), hw, h), P.y);
    ctx.lineTo(P.x(backX(-hw, h), -hw, h), P.y);
    ctx.closePath();
    ctx.fill();
    // malha em losangos: fundo, laterais e teto
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.42)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const N = 14;
    const M = 7;
    for (let i = -M; i <= N; i++) {
      // diagonais do fundo (duas direções: 1 e depois -1)
      for (let dir = 1; dir >= -1; dir -= 2) {
        let first = true;
        for (let j = 0; j <= M; j++) {
          const u = (i + j * dir * 0.5) / N;
          const v = j / M;
          if (u < 0 || u > 1) {
            first = true;
            continue;
          }
          const y = -hw + u * hw * 2;
          const z = v * h;
          const x = P.x(backX(y, z), y, z);
          if (first) ctx.moveTo(x, P.y);
          else ctx.lineTo(x, P.y);
          first = false;
        }
      }
    }
    // laterais e teto: linhas verticais/horizontais (perspectiva já dá o desenho)
    for (let k = 0; k <= 5; k++) {
      const x = gx + (s * depth * k) / 5;
      for (let e = -1; e <= 1; e += 2) {
        const y = e * hw;
        ctx.moveTo(P.x(x, y, 0), P.y);
        ctx.lineTo(P.x(x, y, h), P.y);
      }
      ctx.moveTo(P.x(x, -hw, h), P.y);
      ctx.lineTo(P.x(x, hw, h), P.y);
    }
    for (let k = 1; k < 5; k++) {
      const z = (h * k) / 5;
      for (let e = -1; e <= 1; e += 2) {
        const y = e * hw;
        ctx.moveTo(P.x(gx, y, z), P.y);
        ctx.lineTo(P.x(backX(y, z), y, z), P.y);
      }
    }
    ctx.stroke();
    // ferros de sustentação atrás (cinza) e a barra de baixo
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const xd = gx + s * depth;
    for (let e = -1; e <= 1; e += 2) {
      const y = e * hw;
      ctx.moveTo(P.x(gx, y, h), P.y);
      ctx.lineTo(P.x(xd, y, h * 0.55), P.y);
      ctx.lineTo(P.x(xd, y, 0), P.y);
    }
    ctx.moveTo(P.x(xd, -hw, 0), P.y);
    ctx.lineTo(P.x(xd, hw, 0), P.y);
    ctx.stroke();
    // traves: contorno escuro, corpo branco e o brilho do refletor
    const tfx = P.x(gx, -hw, h);
    const tfy = P.y;
    const tfs = P.s;
    const bfx = P.x(gx, -hw, 0);
    const bfy = P.y;
    const tnx = P.x(gx, hw, h);
    const tny = P.y;
    const tns = P.s;
    const bnx = P.x(gx, hw, 0);
    const bny = P.y;
    const frame = () => {
      ctx.beginPath();
      ctx.moveTo(bfx, bfy);
      ctx.lineTo(tfx, tfy);
      ctx.lineTo(tnx, tny);
      ctx.lineTo(bnx, bny);
      ctx.stroke();
    };
    const wd = Math.max(4, 6 * ((tfs + tns) / 2));
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.lineWidth = wd + 3;
    frame();
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = wd;
    frame();
    ctx.save();
    ctx.translate(-wd * 0.22, -wd * 0.18);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = Math.max(1, wd * 0.28);
    frame();
    ctx.restore();
    // pé das traves no gramado
    ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    ctx.beginPath();
    ctx.ellipse(bfx, bfy + 1, wd * 1.1, wd * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bnx, bny + 1, wd * 1.1, wd * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // Bola de futebol de verdade: gomos (pentágonos) numa esfera girando de acordo com o
  // movimento, luz do refletor em cima, sombra que espalha com a altura e rastro de
  // velocidade quando ela vai forte. Os 16 giros da bola ficam prontos num cache
  getBallFrames() {
    if (this._ballFrames) return this._ballFrames;
    const R = 24;
    const S = R * 2 + 4;
    // centros dos 12 gomos pretos: vértices de um icosaedro
    const g = (1 + Math.sqrt(5)) / 2;
    const V = [[-1, g, 0], [1, g, 0], [-1, -g, 0], [1, -g, 0], [0, -1, g], [0, 1, g], [0, -1, -g], [0, 1, -g], [g, 0, -1], [g, 0, 1], [-g, 0, -1], [-g, 0, 1]].map((v) => {
      const l = Math.hypot(...v);
      return v.map((c) => c / l);
    });
    const frames = [];
    for (let f = 0; f < 16; f++) {
      const a = (f / 16) * Math.PI * 2 * (2 / 5); // 1/5 de volta já repete o desenho
      const cv = document.createElement('canvas');
      cv.width = S;
      cv.height = S;
      const c = cv.getContext('2d');
      const cx = S / 2;
      const cy = S / 2;
      c.fillStyle = '#f8fafc';
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI * 2);
      c.fill();
      c.save();
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI * 2);
      c.clip();
      // gira em volta de um eixo inclinado (rola para a frente e um pouco de lado)
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      V.forEach(([x, y, z]) => {
        const y2 = y * ca - z * sa;
        const z2 = y * sa + z * ca;
        const x3 = x * 0.94 + z2 * 0.34;
        const z3 = -x * 0.34 + z2 * 0.94;
        if (z3 <= -0.15) return;
        const px = cx + x3 * R;
        const py = cy + y2 * R;
        const fore = Math.max(0.25, z3);
        const rr = R * 0.36;
        c.fillStyle = '#111827';
        c.beginPath();
        for (let k = 0; k < 5; k++) {
          const t = (k / 5) * Math.PI * 2 + a;
          const dx = Math.cos(t) * rr;
          const dy = Math.sin(t) * rr;
          // achata o gomo perto da borda (perspectiva da esfera)
          const nx = x3;
          const ny = y2;
          const nl = Math.hypot(nx, ny) || 1;
          const along = (dx * nx + dy * ny) / nl;
          const sx = dx - (nx / nl) * along * (1 - fore);
          const sy = dy - (ny / nl) * along * (1 - fore);
          if (k) c.lineTo(px + sx, py + sy);
          else c.moveTo(px + sx, py + sy);
        }
        c.closePath();
        c.fill();
      });
      // sombra do lado de baixo e brilho em cima (luz do refletor)
      const sh = c.createRadialGradient(cx - R * 0.35, cy - R * 0.45, R * 0.15, cx, cy, R * 1.05);
      sh.addColorStop(0, 'rgba(255,255,255,0.55)');
      sh.addColorStop(0.35, 'rgba(255,255,255,0)');
      sh.addColorStop(0.75, 'rgba(15,23,42,0.12)');
      sh.addColorStop(1, 'rgba(15,23,42,0.5)');
      c.fillStyle = sh;
      c.fillRect(0, 0, S, S);
      c.restore();
      c.strokeStyle = '#0a0f1c';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI * 2);
      c.stroke();
      frames.push(cv);
    }
    frames.R = R;
    this._ballFrames = frames;
    return frames;
  },

  drawBall3D(ctx, b) {
    const bGround = this.project3D(b.x, b.y, 0);
    const bAir = this.project3D(b.x, b.y, b.z);
    const r = Math.max(5, 7.5 * bAir.scale);
    const spd = Math.hypot(b.vx || 0, b.vy || 0);
    this.ballSpin = (this.ballSpin || 0) + spd * 0.05;
    ctx.save();
    // sombra: mais fechada no chão, mais larga e fraca com a bola no alto
    const up = Math.min(1, (b.z || 0) / 140);
    ctx.fillStyle = `rgba(0, 0, 0, ${(0.5 - up * 0.3).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(bGround.sx, bGround.groundY, r * (1.15 + up * 0.6), r * (0.48 + up * 0.25), 0, 0, Math.PI * 2);
    ctx.fill();
    const frames = this.getBallFrames();
    const fr = frames[Math.floor(this.ballSpin * 2) & 15];
    const size = r * 2 * ((frames.R * 2 + 4) / (frames.R * 2));
    // rastro de velocidade: duas cópias apagadas para trás
    if (spd > 8) {
      const back = this.project3D(b.x - (b.vx || 0) * 1.6, b.y - (b.vy || 0) * 1.6, b.z);
      const dx = back.sx - bAir.sx;
      const dy = back.sy - bAir.sy;
      [[0.66, 0.22], [0.33, 0.38]].forEach(([k, a]) => {
        ctx.globalAlpha = a * Math.min(1, (spd - 8) / 6);
        ctx.drawImage(fr, bAir.sx + dx * k - size / 2, bAir.sy + dy * k - size / 2, size, size);
      });
      ctx.globalAlpha = 1;
    }
    if (spd > 9 && b.color && b.color !== '#ffffff') {
      // brilho do chute com efeito: dois halos translúcidos (sem shadowBlur)
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(bAir.sx, bAir.sy, r * 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(bAir.sx, bAir.sy, r * 1.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fr, bAir.sx - size / 2, bAir.sy - size / 2, size, size);
    ctx.restore();
  },

  // Como o boneco aparece neste quadro (bonecos novos): animação, direção e tempo.
  // - direção segue o movimento: de lado (3/4) andando pros lados, de frente vindo
  //   pra câmera, de costas indo pro fundo (com uma folguinha pra não ficar piscando)
  // - a corrida anda no ritmo da velocidade de verdade
  // - quem caiu no drible cai de cara; tonto fica "ferido"; quem fez o gol comemora
  spriteLook(ent) {
    const clock = this.animClock || 0;
    // velocidade (unidades por tick), medida no relógio das animações
    if (ent._lc === undefined) {
      ent._lc = clock;
      ent._lx = ent.x;
      ent._ly = ent.y;
      ent._vx = 0;
      ent._vy = 0;
    } else if (clock !== ent._lc) {
      const dt = Math.max(1, clock - ent._lc);
      const vx = (ent.x - ent._lx) / dt;
      const vy = (ent.y - ent._ly) / dt;
      ent._vx = ent._vx * 0.6 + vx * 0.4;
      ent._vy = ent._vy * 0.6 + vy * 0.4;
      ent._lc = clock;
      ent._lx = ent.x;
      ent._ly = ent.y;
    }
    const sp = Math.hypot(ent._vx, ent._vy);

    let anim = ent.animState || 'idle';
    let index;
    if (ent.celebrateUntil > clock) anim = 'celebrate';
    else if (anim === 'dive' && !ent.isGK) anim = 'fall';
    else if (ent.stunTimer > 0 && anim === 'idle') anim = 'hurt';
    else if ((anim === 'idle' || anim === 'run') && (ent.z || 0) > 4) {
      anim = 'jump';
      const vz = ent.vz || 0;
      index = vz > 1 ? 2 : vz < -1 ? 4 : 3;
    }
    if (anim !== ent._anim) {
      ent._anim = anim;
      ent._anim0 = clock;
    }

    // direção (só muda depois de alguns ticks querendo mudar)
    let view = ent._view || 'side';
    if (anim === 'run' || sp > 0.5) {
      const want = Math.abs(ent._vy) > Math.abs(ent._vx) * 1.3 && sp > 0.5 ? (ent._vy > 0 ? 'front' : 'back') : 'side';
      if (want !== view) {
        ent._viewN = (ent._viewN || 0) + 1;
        if (ent._viewN > 6) {
          view = want;
          ent._viewN = 0;
        }
      } else ent._viewN = 0;
    }
    ent._view = view;

    // ritmo da corrida: mais rápido = passada mais rápida
    const ref = ent.speed || 3;
    const dtc = ent._phc === undefined ? 0 : Math.max(0, clock - ent._phc);
    ent._ph = (ent._ph || 0) + (anim === 'run' ? Math.max(0.55, Math.min(1.7, (1.25 * sp) / ref)) : 1) * dtc;
    ent._phc = clock;
    const loopView = anim === 'idle' || anim === 'run' ? view : undefined;
    return { anim, view: loopView, time: clock - ent._anim0, index, frame: Math.floor(ent._ph) + (ent.number || 0) * 3 };
  },

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const W = this.VW || this.canvas.width;
    const H = this.VH || this.canvas.height;
    const horizonY = Math.round(H * 0.21);
    // cores do mapa guardadas por tema (antes um objeto novo com as listas a cada quadro)
    const mapTheme = this.chapter?.mapTheme;
    if (!this._mapC || this._mapC.id !== mapTheme) this._mapC = { id: mapTheme, theme: this.getMapColors(mapTheme) };
    const theme = this._mapC.theme;
    // orçamento de montagem dos bonecos zera uma vez por quadro
    if (window.PixelRenderer.beginSpriteFrame) window.PixelRenderer.beginSpriteFrame();

    // resolução automática: tudo é desenhado no tamanho lógico e encolhido aqui
    const res = this.canvas.width / W;
    ctx.setTransform(res, 0, 0, res, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // Tremida de tela (chute forte, gol): só o campo treme, o HUD fica parado
    ctx.save();
    if (this.shakeMag > 0.4) {
      ctx.translate((Math.random() - 0.5) * this.shakeMag, (Math.random() - 0.5) * this.shakeMag);
      this.shakeMag *= 0.88;
    }

    // 1. Estádio ao fundo (céu, teto, refletores acesos, torcida em fileiras e a faixa com o
    //    nome do estádio): desenhado UMA vez por mapa e tamanho de tela e só colado aqui,
    //    com parallax, então não custa nada por quadro
    const pxOffset = -this.camera.x * 0.12;
    const backdrop = this.getStadiumBackdrop(this.chapter?.mapTheme, theme, W, horizonY);
    ctx.drawImage(backdrop, Math.round(-300 + pxOffset), 0);
    // Flashes de câmera piscando na torcida
    if (backdrop.hasCrowd) {
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      for (let i = 0; i < 4; i++) {
        if ((this.frame * 13 + i * 37) % 41 > 1) continue;
        ctx.fillRect((this.frame * 97 + i * 331) % W, 34 + ((this.frame * 53 + i * 71) % Math.max(1, horizonY - 64)), 3, 3);
      }
    }

    // Placas Publicitárias na beira do campo: o texto é fixo, então as 6 placas são
    // desenhadas uma vez numa faixa (na resolução de verdade do canvas) e só coladas
    // (antes eram 6 textos escritos a cada quadro)
    const strip = this.getBoardStrip(theme, W, horizonY, res);
    ctx.drawImage(strip, 0, strip.dy / res, strip.width / res, strip.height / res);
    // (o estado que as placas deixavam no ctx continua igual para o que vem depois)
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';

    // 2. Gramado: textura de verdade (js/match_gfx.js) colada em perspectiva; se ela não
    //    existir ou falhar, o gramado antigo (faixas pintadas) logo abaixo
    const hx = this.PITCH_HALF_X;
    const hy = this.PITCH_HALF_Y;
    if (this.drawPitchTextured && this.drawPitchTextured(ctx, W, H, horizonY, theme)) {
      this.drawEndStand(ctx, -1, theme, hx, hy);
      this.drawEndStand(ctx, 1, theme, hx, hy);
    } else this.drawPitchOld(ctx, W, H, theme, hx, hy);
    // Reação Química pronta: a área rival pulsa em rosa (é só lá dentro que o [C] funciona)
    if (this.mode === 'match' && this.chapter?.id !== 'ch0_prologue' && this.chemCharge >= 60) {
      const a = 0.1 + 0.07 * Math.sin(this.frame * 0.12);
      this.drawPoly3D(ctx, [[hx - this.AREA_DEPTH, -this.AREA_HALF_W, 0], [hx, -this.AREA_HALF_W, 0], [hx, this.AREA_HALF_W, 0], [hx - this.AREA_DEPTH, this.AREA_HALF_W, 0]], `rgba(236,72,153,${a})`, 'rgba(236,72,153,0.9)', 3);
    }
    this.drawRestOfFrame(ctx, W, H, horizonY, theme);
  },

  // Faixa com as 6 placas da beira do campo (fundo + nome do patrocinador), guardada por
  // tema, tamanho de tela e resolução. Cobre as linhas de pixel de verdade [dy, dy + altura)
  // e é desenhada com a mesma conta de antes, então colada sem esticar fica igual
  getBoardStrip(theme, W, horizonY, res) {
    const c = this._boardStrip;
    if (c && c.theme === theme && c.W === W && c.hY === horizonY && c.res === res) return c;
    const dy = Math.floor(res * (horizonY - 22));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(W * res));
    cv.height = Math.max(1, Math.ceil(res * (horizonY + 4)) - dy);
    const g = cv.getContext('2d');
    g.setTransform(res, 0, 0, res, 0, -dy);
    const boardW = Math.floor((W - 40) / 6);
    for (let i = 0; i < 6; i++) {
      const sx = 20 + i * boardW;
      g.fillStyle = theme.boardBg;
      g.fillRect(sx, horizonY - 18, boardW - 14, 16);
      g.fillStyle = '#ffffff';
      g.font = '900 10px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.fillText(theme.sponsors[i] || 'BLUE LOCK', sx + (boardW - 14) / 2, horizonY - 6);
    }
    Object.assign(cv, { theme, W, hY: horizonY, res, dy });
    this._boardStrip = cv;
    return cv;
  },

  // gramado antigo (faixas pintadas e linhas desenhadas por cima), usado se a textura falhar
  drawPitchOld(ctx, W, H, theme, hx, hy) {
    // contornos fixos do campo (os pontos são guardados; antes eram arrays novos por quadro)
    let PP = this._pitchPolys;
    if (!PP || PP.X !== this.PITCH_HALF_X || PP.Y !== this.PITCH_HALF_Y || PP.hx !== hx || PP.hy !== hy) {
      const X = this.PITCH_HALF_X;
      const y0 = -this.PITCH_HALF_Y - 30;
      const y1 = this.PITCH_HALF_Y + 30;
      PP = this._pitchPolys = {
        X,
        Y: this.PITCH_HALF_Y,
        hx,
        hy,
        base: [[-X, y0, 0], [X, y0, 0], [X, y1, 0], [-X, y1, 0]],
        lines: [[-hx, -hy, 0], [hx, -hy, 0], [hx, hy, 0], [-hx, hy, 0]],
        areaL: [[-hx, -210, 0], [-hx + 280, -210, 0], [-hx + 280, 210, 0], [-hx, 210, 0]],
        areaR: [[hx - 280, -210, 0], [hx, -210, 0], [hx, 210, 0], [hx - 280, 210, 0]]
      };
    }
    // 28 faixas de grama (1 preenchimento de base + as 14 faixas da outra cor num caminho só)
    const stripW = (this.PITCH_HALF_X * 2) / 28;
    const gy0 = -this.PITCH_HALF_Y - 30;
    const gy1 = this.PITCH_HALF_Y + 30;
    this.drawPoly3D(ctx, PP.base, theme.grass1, null);
    ctx.beginPath();
    for (let i = 1; i < 28; i += 2) {
      const x1 = -this.PITCH_HALF_X + i * stripW;
      this.addQuad3D(ctx, x1, gy0, x1 + stripW, gy1);
    }
    ctx.fillStyle = theme.grass2;
    ctx.fill();

    // 2a. Atrás de cada gol a arquibancada dá a volta (antes o campo acabava no vazio e a
    //     faixa da torcida do fundo continuava reta depois da linha de fundo)
    this.drawEndStand(ctx, -1, theme, hx, hy);
    this.drawEndStand(ctx, 1, theme, hx, hy);
    // 2b. Corte em xadrez (faixas no comprimento também, como gramado de estádio de verdade)
    const bandH = (hy * 2 + 60) / 8;
    ctx.beginPath();
    for (let j = 0; j < 8; j += 2) {
      const y1 = -hy - 30 + j * bandH;
      this.addQuad3D(ctx, -hx - 40, y1, hx + 40, y1 + bandH);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fill();

    // Linhas do Campo Colossal
    this.drawPoly3D(ctx, PP.lines, null, 'rgba(255,255,255,0.88)', 2.5);

    const midTop = this.project3D(0, -hy, 0);
    const midBot = this.project3D(0, hy, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(midTop.sx, midTop.sy);
    ctx.lineTo(midBot.sx, midBot.sy);
    ctx.stroke();

    const centerP = this.project3D(0, 0, 0);
    ctx.beginPath();
    ctx.ellipse(centerP.sx, centerP.sy, 95, 55, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Grandes Áreas Proporcionais ao Campo Colossal
    this.drawPoly3D(ctx, PP.areaL, null, 'rgba(255,255,255,0.85)', 2);
    this.drawPoly3D(ctx, PP.areaR, null, 'rgba(255,255,255,0.85)', 2);
    this.drawPitchDetails(ctx, hx, hy, centerP);
    this.drawCornerFlags(ctx, hx, hy);
  },

  // ordem de desenho por profundidade (uma função só para o sort de todo quadro)
  byY(a, b) {
    return a.y - b.y;
  },

  // o resto do quadro (depois do gramado): mira, rastros, jogadores, bola, gols, luz e HUD
  drawRestOfFrame(ctx, W, H, horizonY, theme) {
    // 2c. Momento especial (anime): o estádio afunda no azul-noite com linhas de foco;
    //     o que vem depois (mira, rastros, jogadores, bola) fica aceso por cima
    if (this.special) this.drawSpecialDarken(ctx, W, H);

    // 3. Alvos de Minigame de Treino
    this.trainingTargets.forEach((tg) => {
      const pr = this.project3D(tg.x, tg.y, tg.z);
      ctx.save();
      if (tg.type === 'sprint_ring') {
        if (tg.next) {
          // o próximo anel: apagadinho, pra você já ver o caminho
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.ellipse(pr.sx, pr.groundY, 38 * pr.scale, 18 * pr.scale, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const pulse = 1 + 0.12 * Math.sin(this.frame * 0.18);
          ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 5;
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.ellipse(pr.sx, pr.groundY, 40 * pr.scale * pulse, 19 * pr.scale * pulse, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`⚡ ANEL ${Math.min(this.trainingScore + 1, this.trainingTargetScore)}`, pr.sx, pr.groundY - 22);
        }
      } else {
        const purple = tg.label === 'PONTO CEGO';
        ctx.strokeStyle = tg.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, 24 * pr.scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = purple ? 'rgba(168, 85, 247, 0.4)' : 'rgba(250, 204, 21, 0.35)';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🎯 ${tg.label}`, pr.sx, pr.sy - 26);
      }
      ctx.restore();
    });
    // Seta guia até o anel aceso: perto do seu jogador e, com o anel fora da tela, na borda
    const ring = this.mode === 'training' && this.trainingTargets.find((t) => t.current);
    if (ring && this.playerEntity) {
      const pl = this.project3D(this.playerEntity.x, this.playerEntity.y, 0);
      const rg = this.project3D(ring.x, ring.y, 0);
      const ang = Math.atan2(rg.groundY - pl.groundY, rg.sx - pl.sx);
      const arrow = (x, y, size, alpha) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#4ade80';
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size * 0.6, -size * 0.65);
        ctx.lineTo(-size * 0.25, 0);
        ctx.lineTo(-size * 0.6, size * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };
      if (Math.hypot(rg.sx - pl.sx, rg.groundY - pl.groundY) > 70) arrow(pl.sx + Math.cos(ang) * 46, pl.groundY + Math.sin(ang) * 30, 11, 0.9);
      const m = 36;
      if (rg.sx < m || rg.sx > W - m || rg.groundY < 70 || rg.groundY > H - 70) {
        const ex = Math.max(m, Math.min(W - m, rg.sx));
        const ey = Math.max(80, Math.min(H - 80, rg.groundY));
        arrow(ex, ey, 18, 0.75 + 0.25 * Math.sin(this.frame * 0.2));
      }
    }

    // 4. Linha de Mira (curva quando Q/E estão apertados) + anel em quem recebe o passe
    if (this.ball.owner === this.playerEntity) {
      const pl = this.playerEntity;
      const pProj = this.project3D(pl.x, pl.y, 0);
      const curveDir = this.getCurveInput();
      ctx.save();
      ctx.strokeStyle = curveDir ? '#facc15' : this.flowState.active ? '#00f5d4' : 'rgba(255, 255, 255, 0.75)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pProj.sx, pProj.sy);
      if (curveDir) {
        // Simula a trajetória com efeito até a distância da mira
        const target = this.screenToWorld(this.mouse.x, this.mouse.y);
        const dist = Math.hypot(target.wx - pl.x, target.wy - pl.y) || 1;
        const speed = 15;
        const shot = this.getCurvedShot((target.wx - pl.x) / dist, (target.wy - pl.y) / dist, dist, speed, curveDir);
        let x = pl.x;
        let y = pl.y;
        let vx = shot.dirX * speed;
        let vy = shot.dirY * speed;
        let spin = shot.spin;
        for (let i = 0, run = 0; i < 120 && run < dist; i++) {
          x += vx;
          y += vy;
          run += speed;
          ({ vx, vy, spin } = this.applySpin(vx, vy, spin));
          const pr = this.project3D(x, y, 0);
          ctx.lineTo(pr.sx, pr.sy);
        }
      } else {
        ctx.lineTo(this.mouse.x, this.mouse.y);
      }
      ctx.stroke();
      ctx.restore();

      const mate = this.chapter?.id === 'ch0_prologue' ? null : this.getPassReceiver();
      if (mate) {
        const mp = this.project3D(mate.x, mate.y, 0);
        ctx.save();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6 + Math.sin(this.frame * 0.15) * 0.25;
        ctx.beginPath();
        ctx.ellipse(mp.sx, mp.groundY, 22 * mp.scale, 9 * mp.scale, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 5. Rastro da Bola
    this.trailPoints.forEach((tp) => {
      const pr = this.project3D(tp.x, tp.y, tp.z);
      ctx.fillStyle = tp.color;
      ctx.globalAlpha = tp.life / 16;
      ctx.fillRect(pr.sx - 4, pr.sy - 4, 8, 8);
    });
    ctx.globalAlpha = 1;

    // 5b. Rastro de luz e fantasmas dos dribles (no chão, atrás dos jogadores)
    this.drawDribbleFx(ctx);
    this.drawFlowRadar(ctx);

    // 6. Jogadores 2D em Pé + Bola 3D
    // (lista e itens reaproveitados entre quadros; a ordem é a mesma de antes: os bonecos
    // na ordem deles e a bola no fim, ordenados por y com o sort estável)
    const renderables = this._rlList || (this._rlList = []);
    const pool = this._rlPool || (this._rlPool = []);
    renderables.length = 0;
    for (let i = 0; i <= this.entities.length; i++) {
      const it = pool[i] || (pool[i] = { type: '', y: 0, obj: null });
      const e = i < this.entities.length ? this.entities[i] : null;
      it.type = e ? 'entity' : 'ball';
      it.obj = e || this.ball;
      it.y = it.obj.y;
      renderables.push(it);
    }
    renderables.sort(this.byY);

    renderables.forEach((item) => {
      if (item.type === 'ball') {
        this.drawBall3D(ctx, item.obj);
        return;
      }

      const ent = item.obj;
      const proj = this.project3D(ent.x, ent.y, ent.z);
      if (proj.sx < -120 || proj.sx > W + 120) return;

      // (a sombra usa o ponto no chão: o x na tela e o groundY são os mesmos do proj,
      // então não precisa projetar de novo)
      const groundProj = proj;
      // bonecos novos no modo "pixel perfeito": tamanho fixo da arte (1x, sem encolher
      // borrando) — a profundidade fica por conta da posição no campo
      const PRr = window.PixelRenderer;
      const pixelPerfect = PRr.spritesV2 && PRr.matchPixelPerfect;
      const spriteSize = pixelPerfect ? 72 : Math.round(58 * proj.scale);

      // Sombras dos refletores (duas compridas e fracas em diagonal + a de baixo do pé):
      // imagem pronta colada com 1 drawImage (antes eram 3 elipses por boneco por quadro)
      const sc = proj.scale;
      const shSpr = this.getShadowSprite(ent.isPlayer);
      ctx.drawImage(shSpr, groundProj.sx - shSpr.ox * sc, groundProj.groundY - 2 - shSpr.oy * sc, shSpr.uw * sc, shSpr.uh * sc);
      // emblema do ego atrás de você no Fluxo (js/ego_fx.js)
      if (ent.isPlayer && this.drawEgoEmblem) this.drawEgoEmblem(ctx, ent, proj, spriteSize);

      ctx.save();
      // posição em pixel inteiro (posição quebrada faz o boneco "cintilar" andando)
      if (pixelPerfect) ctx.translate(Math.round(proj.sx - spriteSize / 2), Math.round(proj.sy - spriteSize + 6));
      else ctx.translate(proj.sx - spriteSize / 2, proj.sy - spriteSize + 6);
      const look = this.spriteLook(ent);
      window.PixelRenderer.drawCharacterSprite(ctx, ent.charData, spriteSize, spriteSize, {
        facing: 'front',
        flipX: !ent.facingRight,
        frame: look.frame,
        animState: look.anim,
        view: look.view,
        animTime: look.time,
        animIndex: look.index,
        priority: ent.isPlayer,
        budget: true,
        blinkable: true,
        moving: ent.animState === 'run',
        // Aura só no seu Fluxo ativado ou numa skill de transe (antes todo craque com OVR 90+ andava em chamas)
        showAura: (ent.isPlayer && (this.flowState.active || ent.buffTimer > 0 || this.monsterActive())) || ent.rivalFlowTimer > 0 || !!ent.duoFlow,
        auraColor: ent.duoFlow && !ent.isPlayer ? ent.duoFlow : !ent.isPlayer && ent.rivalFlowTimer > 0 ? ent.rivalFlowColor : ent.isPlayer && this.monsterActive() ? '#dc2626' : ent.isPlayer && ent.buffTimer > 0 && !this.flowState.active ? ent.buffColor : ent.isPlayer && this.flowState.active && this.flowFx ? this.flowFx.color : ent.isPlayer && this.playerState.equippedFlow ? this.playerState.equippedFlow.color : ent.charData.auraColor,
        // no Fluxo o emblema do ego (js/ego_fx.js) faz o papel das labaredas
        auraFlames: !(ent.isPlayer && this.flowState.active && this.flowFx && this.drawEgoEmblem && !this.monsterActive()),
        accessories: ent.isPlayer ? this.playerState.equippedAccessories : ent.accessories || []
      });
      ctx.restore();

      // Nome em cima do jogador (só o nome; você ganha uma seta em cima). O texto com
      // contorno vira uma imagem guardada por (nome, tamanho, cor): trocar ctx.font e
      // strokeText em todo quadro para cada jogador custava caro
      // (o nome curto e a imagem ficam guardados no próprio boneco: antes eram expressões
      // regulares e um texto-chave novos por boneco a cada quadro)
      if (ent._tagOf !== ent.name) {
        ent._tagOf = ent.name;
        ent._tagName = this.tagName(ent);
      }
      const tagText = ent.isPlayer ? 'VOCÊ' : ent._tagName;
      const tagColor = ent.isPlayer ? '#00f5d4' : ent.isDuo ? '#fde047' : ent.team === 'home' ? '#bfdbfe' : '#fca5a5';
      const tagY = proj.sy - spriteSize - 2;
      const tagPx = Math.max(9, Math.round(11 * proj.scale));
      if (ent._tagT !== tagText || ent._tagPx !== tagPx || ent._tagC !== tagColor || !ent._tagCv) {
        ent._tagT = tagText;
        ent._tagPx = tagPx;
        ent._tagC = tagColor;
        ent._tagCv = this.getNameTag(tagText, tagPx, tagColor);
      }
      const tag = ent._tagCv;
      ctx.drawImage(tag, Math.round(proj.sx - tag.ax), Math.round(tagY - tag.ay));
      // no Fluxo o símbolo do ego fica no lugar da seta (js/ego_fx.js)
      if (ent.isPlayer && !(this.drawEgoMarker && this.drawEgoMarker(ctx, ent, proj, tagY))) {
        const bob = Math.sin(this.frame * 0.15) * 2;
        ctx.fillStyle = tagColor;
        ctx.beginPath();
        ctx.moveTo(proj.sx - 6, tagY - 16 + bob);
        ctx.lineTo(proj.sx + 6, tagY - 16 + bob);
        ctx.lineTo(proj.sx, tagY - 9 + bob);
        ctx.closePath();
        ctx.fill();
      }
    });

    // 7. Gols Altos 3D
    this.drawTallGoal3D(ctx, 'left');
    this.drawTallGoal3D(ctx, 'right');
    this.drawBubbles(ctx);
    this.drawPopTexts(ctx);

    // 8. Partículas (até ~130 no gol: pontos sem criar objeto)
    const PJ = this.projector();
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      const sx = PJ.x(pt.x, pt.y, pt.z);
      ctx.fillStyle = pt.color;
      ctx.fillRect(sx - 3, PJ.y - 3, 6, 6);
    }

    // 9. Barra de Força
    if (this.mouse.down) {
      const pProj = this.project3D(this.playerEntity.x, this.playerEntity.y, this.playerEntity.z);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(pProj.sx - 28, pProj.sy + 10, 56, 8);
      ctx.fillStyle = this.mouse.charge > 80 ? '#ef4444' : '#facc15';
      ctx.fillRect(pProj.sx - 27, pProj.sy + 11, (this.mouse.charge / 100) * 54, 6);
    }

    // 9b. Porcentagem de acerto ao lado da mira
    if (this.ball.owner === this.playerEntity && !(this.mode === 'training' && this.trnMode() === 'rings')) {
      const acc = this.getShotAccuracy(this.playerEntity.x, this.playerEntity.y, null, this.mouse.down ? this.mouse.charge : 0);
      ctx.save();
      ctx.font = '900 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      const label = `🎯 CHANCE DE GOL ${acc}%`;
      ctx.fillRect(this.mouse.x + 12, this.mouse.y - 24, ctx.measureText(label).width + 10, 18);
      ctx.fillStyle = acc >= 60 ? '#22c55e' : acc >= 35 ? '#facc15' : '#ef4444';
      ctx.fillText(label, this.mouse.x + 16, this.mouse.y - 10);
      ctx.restore();
    }

    // 9c. Recarga do drible embaixo do seu jogador
    if (this.dribbleCooldown > 0) {
      const pProj = this.project3D(this.playerEntity.x, this.playerEntity.y, 0);
      const maxCd = Math.max(90, 150 - Math.floor((this.playerState.stats.conducao || 0) * 0.4));
      ctx.fillStyle = '#090d16';
      ctx.fillRect(pProj.sx - 28, pProj.groundY + 6, 56, 6);
      ctx.fillStyle = '#00f5d4';
      ctx.fillRect(pProj.sx - 27, pProj.groundY + 7, (1 - this.dribbleCooldown / maxCd) * 54, 4);
    }

    // 9d. Barra de resistência (SHIFT) embaixo do seu jogador quando não está cheia
    if (this.stamina < 99.5) {
      const pProj = this.project3D(this.playerEntity.x, this.playerEntity.y, 0);
      const y = pProj.groundY + (this.dribbleCooldown > 0 ? 14 : 6);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(pProj.sx - 28, y, 56, 6);
      ctx.fillStyle = this.exhausted ? '#ef4444' : this.stamina < 35 ? '#f59e0b' : '#22c55e';
      ctx.fillRect(pProj.sx - 27, y + 1, (this.stamina / 100) * 54, 4);
    }

    ctx.restore();
    // Luz de estádio por cima do campo: o fundo mais escuro e enevoado, poças de luz dos
    // refletores e uma vinheta nas bordas (gradientes guardados por tamanho de tela)
    this.drawStadiumLighting(ctx, W, H, horizonY);
    // faixa dos olhos do especial (por cima do campo, embaixo do HUD)
    if (this.special && this.drawEyeCutIn) this.drawEyeCutIn(ctx, W, H);
    this.drawGoalFx(ctx, W, H);
    this.drawReplayOverlay(ctx, W, H);
    if (this.replay) return;

    if (this.mode === 'match') this.drawSkillPanel(ctx, 16, 58);

    // 10. Mini-Mapa Radar do Campo Colossal
    this.drawRadarMiniMap(ctx, W - 225, 58, 205, 72);

    // 11. Banner Cinematográfico
    if (this.camera.bannerTimer > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(9, 13, 22, 0.92)';
      ctx.fillRect(0, H - 114, W, 54);
      ctx.strokeStyle = this.camera.bannerColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, H - 114);
      ctx.lineTo(W, H - 114);
      ctx.stroke();

      ctx.fillStyle = this.camera.bannerColor;
      ctx.font = '900 17px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.camera.bannerText, W / 2, H - 90);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 12px "Segoe UI", sans-serif';
      ctx.fillText(this.camera.bannerSub, W / 2, H - 69);
      ctx.restore();
    }
  },

  // Painel de habilidades: tecla, recarga e porcentagem de acerto atual de cada uma
  drawSkillPanel(ctx, x, y) {
    const rows = [
      { key: 'ESPAÇO', name: 'Drible', cd: this.dribbleCooldown, pct: this.getDribbleChance(), color: '#00f5d4' },
      { key: 'F', name: 'Carrinho', cd: this.slideCooldown, pct: null, color: '#f97316' }
    ];
    if (this.chapter?.id !== 'ch0_prologue') {
      const p = this.playerEntity;
      const addWeapon = (weapon, offset) => {
        if (!weapon) return;
        weapon.skills.forEach((sk, i) => {
          const key = String(i + 1 + offset);
          let pct = null;
          if (sk.type === 'shot') pct = this.getShotAccuracy(p.x, p.y, sk);
          else if (sk.type === 'dribble') pct = this.getDribbleChance((sk.power || 1) * 8);
          rows.push({ key, name: sk.name, cd: this.skillCooldowns[key], pct, color: sk.color });
        });
      };
      addWeapon(this.playerState.equippedWeapon, 0);
      if (this.playerState.nelUnlocked) addWeapon(this.playerState.equippedWeapon2, 3);
      if (this.passive('copy')) {
        const cp = this.copiedSkill;
        rows.push({ key: 'V', name: cp ? `Cópia: ${cp.skill.name}` : 'Cópia: (nada ainda)', cd: this.skillCooldowns.v, pct: null, color: '#a855f7', status: cp ? null : '—' });
      }
      // Passivas: sempre ativas, sem tecla
      [this.playerState.equippedWeapon, this.playerState.nelUnlocked ? this.playerState.equippedWeapon2 : null].forEach((w) => {
        const ps = window.getWeaponPassive?.(w);
        if (ps) rows.push({ key: 'P', name: ps.name, cd: 0, pct: null, color: '#facc15', status: 'PASSIVA' });
      });
    }

    // O painel só muda quando muda algum texto (recarga em segundos, % de acerto): ele vira
    // uma imagem guardada (na resolução de verdade do canvas, colada sem esticar) e só é
    // redesenhado quando a "assinatura" muda. Antes eram ~10 textos escritos por quadro
    const res = this.canvas.width / (this.VW || this.canvas.width);
    if (ctx.globalAlpha === 1 && ctx.globalCompositeOperation === 'source-over' && !ctx.shadowBlur && (ctx.filter === undefined || ctx.filter === 'none')) {
      let sig = x + ',' + y + ',' + res + ',' + ctx.lineWidth;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const ready = !r.cd || r.cd <= 0;
        sig += '\u0001' + r.key + '\u0002' + r.name + '\u0002' + r.color + '\u0002' + (!ready ? 'c' + Math.ceil(r.cd / 60) : r.status ? 's' + r.status : r.pct !== null ? 'p' + r.pct : 'P');
      }
      let cv = this._skillPanel;
      if (!cv || cv.sig !== sig) {
        const pw = 250;
        const ph = 22 + rows.length * 20;
        // linhas e colunas de pixel de verdade que o painel cobre (com a borda suavizada)
        const dx = Math.floor(res * (x - 2));
        const dy = Math.floor(res * (y - 2));
        cv = cv || document.createElement('canvas');
        cv.width = Math.max(1, Math.ceil(res * (x + pw + 2)) - dx);
        cv.height = Math.max(1, Math.ceil(res * (y + ph + 2)) - dy);
        const g = cv.getContext('2d');
        g.setTransform(res, 0, 0, res, -dx, -dy);
        g.lineWidth = ctx.lineWidth;
        this.paintSkillPanel(g, x, y, rows);
        Object.assign(cv, { sig, dx, dy });
        this._skillPanel = cv;
      }
      ctx.drawImage(cv, cv.dx / res, cv.dy / res, cv.width / res, cv.height / res);
      return;
    }
    this.paintSkillPanel(ctx, x, y, rows);
  },

  // desenho do painel de habilidades (no canvas da partida ou na imagem guardada)
  paintSkillPanel(ctx, x, y, rows) {
    ctx.save();
    const w = 250;
    const h = 22 + rows.length * 20;
    ctx.fillStyle = 'rgba(6, 12, 26, 0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#23427c';
    ctx.strokeRect(x, y, w, h);
    ctx.font = '900 11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('HABILIDADES • CHANCE DE ACERTO', x + 8, y + 15);
    rows.forEach((r, i) => {
      const ry = y + 22 + i * 20;
      const ready = !r.cd || r.cd <= 0;
      ctx.fillStyle = r.color;
      ctx.fillRect(x + 8, ry + 3, 3, 13);
      ctx.fillStyle = ready ? '#f8fafc' : '#64748b';
      ctx.font = '800 11px "Segoe UI", sans-serif';
      ctx.fillText(`[${r.key}] ${r.name}`.slice(0, 30), x + 16, ry + 14);
      ctx.textAlign = 'right';
      if (!ready) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`${Math.ceil(r.cd / 60)}s`, x + w - 8, ry + 14);
      } else if (r.status) {
        ctx.fillStyle = r.color;
        ctx.fillText(r.status, x + w - 8, ry + 14);
      } else if (r.pct !== null) {
        ctx.fillStyle = r.pct >= 60 ? '#22c55e' : r.pct >= 35 ? '#facc15' : '#ef4444';
        ctx.fillText(`${r.pct}%`, x + w - 8, ry + 14);
      } else {
        ctx.fillStyle = '#22c55e';
        ctx.fillText('PRONTO', x + w - 8, ry + 14);
      }
      ctx.textAlign = 'left';
    });
    ctx.restore();
  },

  drawRadarMiniMap(ctx, rx, ry, rw, rh) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 20, 14, 0.88)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry, rw, rh);

    ctx.beginPath();
    ctx.moveTo(rx + rw / 2, ry);
    ctx.lineTo(rx + rw / 2, ry + rh);
    ctx.stroke();

    this.entities.forEach((e) => {
      const mx = rx + ((e.x + this.PITCH_HALF_X) / (this.PITCH_HALF_X * 2)) * rw;
      const my = ry + ((e.y + this.PITCH_HALF_Y) / (this.PITCH_HALF_Y * 2)) * rh;
      ctx.fillStyle = e.isPlayer ? '#00f5d4' : e.isDuo ? '#fde047' : e.team === 'home' ? '#38bdf8' : '#ef4444';
      ctx.fillRect(mx - 2.5, my - 2.5, 5, 5);
    });

    const bx = rx + ((this.ball.x + this.PITCH_HALF_X) / (this.PITCH_HALF_X * 2)) * rw;
    const by = ry + ((this.ball.y + this.PITCH_HALF_Y) / (this.PITCH_HALF_Y * 2)) * rh;
    ctx.fillStyle = '#facc15';
    ctx.fillRect(bx - 2, by - 2, 4, 4);
    ctx.restore();
  },

  updateHUD() {
    const scoreEl = document.getElementById('match-score-display');
    const timeEl = document.getElementById('match-time-display');
    const targetEl = document.getElementById('match-target-display');
    const flowBar = document.getElementById('match-flow-bar');
    const chemBar = document.getElementById('match-chem-bar');

    if (scoreEl) {
      scoreEl.textContent = this.mode === 'training' ? `${this.trainingScore} / ${this.trainingTargetScore}` : `${this.scoreHome} - ${this.scoreAway}`;
    }
    // Nomes curtos no placar: "Time X & Y (Barou...)" vira "TIME X & Y"
    const short = (s) => String(s || '').split('(')[0].trim().toUpperCase().slice(0, 18);
    const homeEl = document.getElementById('match-home-name');
    const awayEl = document.getElementById('match-away-name');
    if (homeEl) homeEl.textContent = this.mode === 'training' ? 'TREINO' : short(this.chapter?.teamName) || 'BLUE LOCK';
    if (awayEl) awayEl.textContent = this.mode === 'training' ? 'ALVOS' : short(this.chapter?.opponentName) || 'RIVAL';
    if (timeEl) {
      timeEl.textContent = `${Math.floor(this.timeLeft / 60)}:${String(this.timeLeft % 60).padStart(2, '0')}`;
      timeEl.classList.toggle('urgent', this.timeLeft <= 15);
    }
    if (targetEl && this.chapter) {
      const cl = this.chapter.script?.climax;
      targetEl.textContent =
        this.mode === 'training'
          ? this.trnCombo >= 2 ? `🔥 COMBO x${this.trnCombo}` : ({ rings: 'SIGA A SETA', targets: 'ACERTE OS ALVOS', blindspot: 'PONTO CEGO', onetouch: 'DE PRIMEIRA' })[this.trnMode()] || 'TREINO'
          : cl
          ? `O DESTINO: ${cl.home} x ${cl.away}`
          : this.chapter.leagueLabel
          ? this.chapter.leagueLabel
          : `META ${Math.min(this.scoreHome, this.chapter.targetGoals)}/${this.chapter.targetGoals} GOLS`;
    }
    if (flowBar) {
      flowBar.style.width = `${Math.floor(this.flowState.charge)}%`;
      flowBar.parentElement?.classList.toggle('ready', this.flowState.charge >= 100);
    }
    if (chemBar) chemBar.style.width = `${Math.floor(this.chemCharge)}%`;
  },

  finishMatch() {
    // Uma partida termina uma vez só: chamada dupla dava o prêmio em dobro e pulava capítulo
    if (this.mode === 'match') {
      if (this.matchDone) return;
      this.matchDone = true;
    }
    // O treino podia terminar duas vezes (o 5º anel/alvo agenda o fim e o relógio também
    // acaba) e dava os atributos em dobro
    if (this.mode === 'training') {
      if (this.trainingDone) return;
      this.trainingDone = true;
    }
    window.SFX?.whistle(3);
    this.lastReport = this.mode === 'match' ? this.getMatchReport() : null;
    this.closeFullscreenOverlay();
    if (this.mode === 'training') {
      window.App.onTrainingMinigameFinished(this.currentDrill, this.trainingScore, { target: this.trainingTargetScore, timeLeft: Math.max(0, Math.round(this.timeLeft)), bestCombo: this.trnBestCombo || 0 });
      return;
    }
    // Laboratório de Fluxos: só volta para a aba FLUXO (sem prêmio, sem história, sem save)
    if (this.chapter.flowLab) {
      this.forfeited = false;
      window.App.onFlowLabFinished?.(this.scoreHome, this.scoreAway);
      return;
    }
    // No Torneio de Trios é mata-mata: empate não classifica. Nas partidas da história
    // precisa vencer; empate só vale se você bateu a meta de gols do capítulo
    const won =
      this.chapter.id === 'ch0_prologue'
        ? true
        : this.chapter.format === 'trio' || this.chapter.format === 'cup'
        ? this.scoreHome > this.scoreAway
        : this.scoreHome > this.scoreAway || (this.chapter.drawIsWin !== false && this.scoreHome === this.scoreAway && this.scoreHome >= (this.chapter.targetGoals || 1));
    const forfeit = !!this.forfeited;
    this.forfeited = false;
    window.App.onMatchFinished(won, this.scoreHome, this.scoreAway, { forfeit });
  }
};
