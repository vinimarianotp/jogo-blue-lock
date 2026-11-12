// ============================================================================
// TREINOS DA ACADEMIA: SUPINO e BARRA FIXA, jogados no próprio aparelho do prédio
//
// Você anda até o banco (ou a barra fixa) da academia no mapa 3D, aperta a ação e o
// treino começa ali: a câmera vai para o lado do aparelho (parada, sem cortar o boneco),
// o seu boneco deita no banco / pendura na barra (poses 'bench' e 'pullup' do
// js/data_animations.js) e a barra sobe e desce conforme o jogo. A aba TREINOS chama o
// mesmo caminho (App.executeTraining → GymTraining.prepare/start) e leva você até lá.
//
//   SUPINO (mode 'bench'): um cursor vai e volta numa barra de força. Apertar (ESPAÇO,
//   clique ou toque) com o cursor na faixa verde = repetição limpa (a barra sobe); no
//   centro dourado = PERFEITO (+1 s e combo). Errou: a barra treme, desce e você cansa;
//   cansaço cheio = o mentor ajuda a pôr a barra no suporte (perde tempo). A cada
//   repetição o cursor acelera e a faixa encolhe.
//   BARRA FIXA (mode 'pullup'): segurar (ESPAÇO, botão do mouse ou o botão na tela) sobe
//   um cursor num medidor em pé; soltar, ele cai. Com o cursor dentro da faixa que anda
//   você sobe; fora dela, desce e a pegada cansa. Queixo acima da barra = 1 barra; sem
//   sair da faixa = PERFEITO. Pegada no fim = escorrega e pega de novo.
//
// Desenho: com 3D (WebGL2) o prédio de verdade é filmado pelo js/hub3d_gl.js
// (Hub.GL3D.renderNow com Hub.sk, como as cenas do js/cine3d_kit.js); o boneco + a
// anilha são uma placa em pixel art (2 px por unidade, como no mapa). Sem 3D (GRÁFICO
// SIMPLES ou modo clássico sem placa de vídeo) uma versão 2D desenha o aparelho de lado.
// O HUD é pixel art (fonte 3x5 do mapa), num canvas pequeno ampliado sem suavizar.
// No fim: App.onTrainingMinigameFinished (nota, ganhos e recorde, igual aos do campo).
// ============================================================================
(function () {
  'use strict';
  const App = window.App;
  if (!App) return;
  const Hub = window.Hub;
  const X = Hub && Hub._3d;
  const PR = () => window.PixelRenderer;
  const SFX = () => window.SFX || null;
  const sfx = (fn, ...a) => {
    try {
      const s = SFX();
      if (s && typeof s[fn] === 'function') s[fn](...a);
    } catch (e) {}
  };
  const STEP = 1000 / 60;
  const UPX = 0.9 / 66; // ladrilhos por pixel da arte (o boneco de 72 px do mapa = 0,98 ladrilho)
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

  // ---------------------------------------------------------------- aparelhos
  // stand = onde você fica no mapa (x, y, ângulo) antes e depois; cam = câmera do treino
  // ([x, altura, y]); from = de onde a câmera vem; lifter = a placa do boneco; mentor = quem
  // assiste (o mentor do treino)
  const ST = {
    supino: {
      stand: [39.35, 10.05, 0],
      cam: { eye: [38.05, 0.7, 10.0], look: [40.02, 0.38, 10.0], fov: 46 },
      from: { eye: [37.4, 1.3, 11.35], look: [40.0, 0.45, 9.95], fov: 52 },
      lifter: { x: 39.84, y: 10.1, z: 0.32 },
      mentor: { x: 40.14, y: 9.08, ang: Math.PI / 2 },
      hide: 'supino'
    },
    barra: {
      stand: [36.25, 9.65, Math.PI],
      cam: { eye: [38.35, 0.9, 9.95], look: [35.45, 0.78, 9.65], fov: 46 },
      from: { eye: [38.9, 1.4, 11.2], look: [35.5, 0.8, 9.7], fov: 52 },
      lifter: { x: 35.5, y: 9.65, barZ: 1.025 },
      mentor: { x: 35.72, y: 10.9, ang: -1.8 }
    }
  };

  // ---------------------------------------------------------------- estado
  const GT = {
    active: false,
    S: null,

    // A aba TREINOS (ou o próprio aparelho) leva você até a academia: a janela fecha e
    // o seu boneco fica de frente para o aparelho (a conversa do mentor acontece ali)
    prepare(dr) {
      const st = ST[dr && dr.station];
      if (!st || !Hub || !Hub.mode3d) return;
      try {
        if (Hub.panel) {
          Hub.panel = null;
          Hub.applyBodyClass && Hub.applyBodyClass();
        }
        Hub.px = st.stand[0];
        Hub.py = st.stand[1];
        Hub.ang = st.stand[2];
        Hub.camA = st.stand[2];
        Hub.area = 'academia';
        Hub.room = 'academia';
        Hub.focus = null;
        Hub._back = undefined;
        Hub.keys = {};
        const el = Hub.hud && Hub.hud.querySelector('.hub-room');
        if (el && Hub.areaName) el.textContent = Hub.areaName('academia');
      } catch (e) {}
    },

    start(dr) {
      if (this.active || !dr) return;
      const st = ST[dr.station];
      if (!st) return;
      ui();
      const cd = youCd();
      const mentorCd = mentorOf(dr);
      this.S = {
        dr,
        st,
        mode: dr.mode,
        cd,
        mentorCd,
        tick: 0,
        phase: 'intro',
        phaseT: 0,
        timeLeft: dr.time || 40,
        target: dr.target || 10,
        reps: 0,
        combo: 0,
        bestCombo: 0,
        hold: false,
        pressQ: 0,
        pops: [],
        trauma: 0,
        mentorAnim: 'idle',
        mentorT: 0,
        warm: 0,
        // supino
        cur: 0,
        dir: 1,
        bar: 1,
        fat: 0,
        zone: 0.5,
        zw: 0.15,
        // barra fixa
        gy: 0.2,
        gv: 0,
        band: 0.45,
        bh: 0.15,
        bandT: Math.random() * 10,
        prog: 0,
        grip: 1,
        clean: true,
        slip: 0
      };
      if (this.S.mode === 'bench') newZone(this.S);
      this.active = true;
      document.documentElement.classList.add('gym-on');
      box.classList.add('on');
      box.classList.toggle('is-bench', this.S.mode === 'bench');
      box.querySelector('.gym-act b').textContent = this.S.mode === 'bench' ? 'EMPURRAR' : 'SEGURAR';
      box.querySelector('.gym-act small').textContent = this.S.mode === 'bench' ? 'ou ESPAÇO' : 'segure ESPAÇO';
      Hub && (Hub.keys = {});
      last = performance.now();
      acc = 0;
      if (!raf) raf = requestAnimationFrame(loop);
    },

    // sair no meio (pausa → SAIR): sem resultado (a energia já foi gasta, como no campo)
    quit() {
      if (!this.active) return;
      stop();
      App.notify && App.notify('Treino interrompido: sem ganhos desta vez.', '#94a3b8');
    }
  };
  window.GymTraining = GT;

  // o seu boneco (mesmas cores do mapa) e o do mentor
  function youCd() {
    const p = App.state.profile || {};
    return { name: p.name || 'Você', skinColor: p.skinColor || '#f3d1b8', hairColor: p.hairColor || '#0f172a', hairSecondary: p.hairSecondary || '#2563eb', eyeColor: p.eyeColor || '#ef4444', eyeStyle: p.eyeStyle, hairStyle: p.hairStyle || 'spiky_tall', jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8', number: p.number || 10 };
  }
  function mentorOf(dr) {
    const name = String(dr.mentor || '').split('&')[0].trim();
    const CE = window.CutsceneEngine;
    const cd = name && CE && CE.getSpeakerCharData ? CE.getSpeakerCharData(name) : null;
    return cd && cd.hairStyle ? Object.assign({}, cd) : null;
  }

  // ---------------------------------------------------------------- tela (DOM)
  let box = null;
  let cv = null;
  let hud = null;
  function ui() {
    if (box) return box;
    const css = document.createElement('style');
    css.textContent = `
      .gym-drill { position: fixed; inset: 0; z-index: 2350; display: none; background: #03060f; touch-action: none; user-select: none; -webkit-user-select: none; }
      .gym-drill.on { display: block; }
      .gym-drill canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: block; }
      .gym-drill .gym-hud { image-rendering: pixelated; image-rendering: crisp-edges; pointer-events: none; }
      .gym-drill button { font-family: inherit; }
      .gym-act { position: absolute; right: max(16px, env(safe-area-inset-right)); bottom: max(16px, env(safe-area-inset-bottom)); min-width: 112px; min-height: 72px; padding: 8px 16px; border: 3px solid #e2e8f0; border-radius: 0; background: #0b1530; color: #f8fafc; display: grid; place-items: center; gap: 2px; box-shadow: 0 4px 0 #020617, inset 0 0 0 2px #1d4ed8; cursor: pointer; touch-action: none; }
      .gym-act b { font: 900 18px/1 system-ui, sans-serif; letter-spacing: 1px; font-style: italic; }
      .gym-act small { font: 700 10px/1 system-ui, sans-serif; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase; }
      .gym-act.down { transform: translateY(3px); box-shadow: 0 1px 0 #020617, inset 0 0 0 2px #facc15; background: #13224a; }
      .gym-quit { position: absolute; right: max(12px, env(safe-area-inset-right)); top: max(10px, env(safe-area-inset-top)); min-width: 64px; min-height: 44px; border: 2px solid #475569; border-radius: 0; background: rgba(3, 7, 18, 0.82); color: #cbd5e1; font: 800 12px/1 system-ui, sans-serif; letter-spacing: 1px; cursor: pointer; }
      .gym-pause { position: absolute; inset: 0; display: none; place-items: center; background: rgba(2, 6, 18, 0.72); }
      .gym-pause.on { display: grid; }
      .gym-pause-box { border: 3px solid #e2e8f0; background: #0b1530; box-shadow: 0 6px 0 #020617, inset 0 0 0 2px #1d4ed8; padding: 18px 20px; display: grid; gap: 10px; min-width: 240px; color: #e2e8f0; text-align: center; font: 700 13px/1.35 system-ui, sans-serif; }
      .gym-pause-box b { font: 900 22px/1 system-ui, sans-serif; font-style: italic; letter-spacing: 2px; }
      .gym-pause-box button { min-height: 44px; border: 2px solid #475569; border-radius: 0; background: #111c3a; color: #f8fafc; font: 800 13px/1 system-ui, sans-serif; letter-spacing: 1px; cursor: pointer; }
      .gym-pause-box button.go { border-color: #22c55e; }
      .gym-pause-box button.out { border-color: #ef4444; color: #fecaca; }
      @media (max-height: 460px) { .gym-act { min-width: 104px; min-height: 64px; } }
    `;
    document.head.appendChild(css);
    box = document.createElement('div');
    box.className = 'gym-drill';
    box.innerHTML = `
      <canvas class="gym-3d"></canvas>
      <canvas class="gym-hud"></canvas>
      <button class="gym-quit" type="button" aria-label="Pausar o treino">PAUSA</button>
      <button class="gym-act" type="button"><b>EMPURRAR</b><small>ou ESPAÇO</small></button>
      <div class="gym-pause"><div class="gym-pause-box"><b>PAUSADO</b><span>Sair agora encerra o treino sem ganhos.</span><button class="go" type="button">▶ CONTINUAR</button><button class="out" type="button">SAIR DO TREINO</button></div></div>`;
    document.body.appendChild(box);
    cv = box.querySelector('.gym-3d');
    hud = box.querySelector('.gym-hud');
    const act = box.querySelector('.gym-act');
    const down = (e) => {
      if (!GT.active || paused) return;
      e.preventDefault();
      e.stopPropagation();
      act.classList.add('down');
      try {
        act.setPointerCapture && act.setPointerCapture(e.pointerId);
      } catch (er) {}
      press(true);
    };
    const up = (e) => {
      act.classList.remove('down');
      if (!GT.active) return;
      e && e.preventDefault && e.preventDefault();
      press(false);
    };
    act.addEventListener('pointerdown', down);
    act.addEventListener('pointerup', up);
    act.addEventListener('pointercancel', up);
    act.addEventListener('lostpointercapture', up);
    // tocar/clicar na imagem também vale (no PC o botão do mouse; no celular qualquer toque)
    cv.addEventListener('pointerdown', (e) => {
      if (!GT.active || paused) return;
      e.preventDefault();
      press(true);
    });
    window.addEventListener('pointerup', () => {
      if (GT.active && GT.S && GT.S.hold) press(false);
    });
    box.querySelector('.gym-quit').addEventListener('click', () => setPause(true));
    box.querySelector('.gym-pause .go').addEventListener('click', () => setPause(false));
    box.querySelector('.gym-pause .out').addEventListener('click', () => {
      setPause(false);
      GT.quit();
    });
    // teclado: só enquanto o treino está na tela (as teclas não vão para o mapa nem para a partida)
    const keys = (e) => {
      if (!GT.active) return;
      const k = (e.key || '').toLowerCase();
      const isAct = k === ' ' || k === 'enter' || k === 'w' || k === 'arrowup' || e.code === 'Space';
      // (as outras teclas não vão para o mapa, mas o navegador continua com elas: F5, F11...)
      if (!isAct && k !== 'escape' && k !== 'p') {
        e.stopImmediatePropagation();
        return;
      }
      if (e.type === 'keydown') {
        if (k === 'escape' || k === 'p') {
          setPause(!paused);
        } else if (isAct && !paused && !e.repeat) press(true);
      } else if (isAct) press(false);
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', keys, true);
    window.addEventListener('keyup', keys, true);
    // trocou de janela: pausa (e solta o botão)
    window.addEventListener('blur', () => {
      if (!GT.active) return;
      if (GT.S) GT.S.hold = false;
      if (GT.S && GT.S.phase !== 'intro' && GT.S.phase !== 'end') setPause(true);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && GT.active && GT.S && GT.S.phase !== 'end') setPause(true);
    });
    return box;
  }
  let paused = false;
  function setPause(on) {
    if (!GT.active) return;
    paused = !!on;
    if (GT.S) GT.S.hold = false;
    box.querySelector('.gym-pause').classList.toggle('on', paused);
    last = performance.now();
  }
  function press(on) {
    const S = GT.S;
    if (!S) return;
    if (on) {
      S.hold = true;
      if (S.mode === 'bench') S.pressQ++;
    } else S.hold = false;
  }

  // o mapa e a partida não andam com o treino na tela
  if (Hub && Hub.live) {
    const live0 = Hub.live;
    Hub.live = function () {
      return !GT.active && live0.call(this);
    };
  }

  // ---------------------------------------------------------------- laço
  let raf = 0;
  let last = 0;
  let acc = 0;
  function loop(now) {
    raf = 0;
    if (!GT.active) return;
    raf = requestAnimationFrame(loop);
    if (paused) {
      last = now;
      return;
    }
    acc += Math.min(200, now - last);
    last = now;
    let n = 0;
    while (acc >= STEP && n < 6) {
      acc -= STEP;
      n++;
      try {
        tick(GT.S);
      } catch (e) {
        console.error('[treino academia]', e);
      }
      if (!GT.active) return;
    }
    if (n === 6) acc = 0;
    try {
      draw(GT.S);
    } catch (e) {
      console.error('[treino academia] desenho', e);
    }
  }
  function stop() {
    GT.active = false;
    paused = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (box) {
      box.classList.remove('on');
      box.querySelector('.gym-pause').classList.remove('on');
      box.querySelector('.gym-act').classList.remove('down');
    }
    document.documentElement.classList.remove('gym-on');
    if (X && X.World) X.World.hideK = null;
    const S = GT.S;
    // você fica de pé ao lado do aparelho, de frente para ele
    if (S && Hub && Hub.mode3d) {
      Hub.px = S.st.stand[0];
      Hub.py = S.st.stand[1];
      Hub.ang = S.st.stand[2];
      Hub.camA = S.st.stand[2];
      Hub.area = 'academia';
      Hub.keys = {};
      Hub._back = undefined;
    }
  }

  // ---------------------------------------------------------------- regras
  // (60 passos por segundo; dt = 1/60)
  const DT = 1 / 60;
  function pop(S, text, color, big) {
    S.pops.push({ text, color, t: 0, big: !!big });
    if (S.pops.length > 4) S.pops.shift();
  }
  function setPhase(S, p) {
    S.phase = p;
    S.phaseT = 0;
  }
  function newZone(S) {
    // a faixa nasce num lugar novo a cada repetição; encolhe com as repetições e o cansaço
    S.zone = 0.28 + Math.random() * 0.44;
    S.zw = Math.max(0.07, 0.155 - S.reps * 0.0065 - S.fat * 0.03);
    S.cur = Math.random() < 0.5 ? 0 : 1;
    S.dir = S.cur ? -1 : 1;
  }
  const curSpeed = (S) => Math.min(2.1, 0.95 + S.reps * 0.075);
  function mentorDo(S, anim, ticks) {
    S.mentorAnim = anim;
    S.mentorT = ticks;
  }
  function tick(S) {
    S.tick++;
    S.phaseT++;
    S.trauma = Math.max(0, S.trauma - 0.04);
    S.pops.forEach((p) => p.t++);
    S.pops = S.pops.filter((p) => p.t < 50);
    if (S.mentorT > 0 && --S.mentorT === 0) S.mentorAnim = 'idle';
    // o relógio só anda com o treino valendo
    const running = S.phase !== 'intro' && S.phase !== 'count' && S.phase !== 'end';
    if (running) {
      S.timeLeft -= DT;
      if (S.timeLeft <= 0) {
        S.timeLeft = 0;
        pop(S, 'TEMPO!', '#f8fafc', true);
        sfx('whistle', 3);
        setPhase(S, 'end');
        return;
      }
    }
    if (S.phase === 'intro') {
      // a câmera vai até o aparelho (os quadros do boneco vão sendo montados)
      warm(S);
      if (S.phaseT >= 66) setPhase(S, 'count');
      return;
    }
    if (S.phase === 'count') {
      warm(S);
      if (S.phaseT % 30 === 1) sfx('blip', S.phaseT > 80 ? 880 : 520);
      if (S.phaseT >= 120) {
        setPhase(S, S.mode === 'bench' ? 'aim' : 'hang');
        S.pressQ = 0;
      }
      return;
    }
    if (S.phase === 'end') {
      if (S.phaseT >= 70) finish(S);
      return;
    }
    if (S.mode === 'bench') benchTick(S);
    else pullTick(S);
  }

  // SUPINO --------------------------------------------------------------
  function benchTick(S) {
    const presses = S.pressQ;
    S.pressQ = 0;
    if (S.phase === 'aim') {
      // a barra no peito, o cursor correndo
      S.bar = Math.max(0, S.bar - DT * 3);
      S.cur += S.dir * curSpeed(S) * DT;
      if (S.cur >= 1) {
        S.cur = 1;
        S.dir = -1;
      } else if (S.cur <= 0) {
        S.cur = 0;
        S.dir = 1;
      }
      if (presses > 0 && S.phaseT > 6) {
        const d = Math.abs(S.cur - S.zone);
        if (d <= S.zw) {
          const perfect = d <= S.zw * 0.32;
          S.reps++;
          if (perfect) {
            S.combo++;
            S.bestCombo = Math.max(S.bestCombo, S.combo);
            S.timeLeft += 1;
            pop(S, S.combo >= 2 ? 'PERFEITO X' + S.combo : 'PERFEITO!', '#facc15', true);
            sfx('jingle', [659, 880, 1175]);
            if (S.combo >= 2) mentorDo(S, 'clap', 50);
          } else {
            S.combo = 0;
            pop(S, 'BOA!', '#4ade80');
            sfx('tone', 'triangle', 330, 520, 0.14, 0.16);
          }
          S.fat = Math.max(0, S.fat - 0.08);
          setPhase(S, 'lift');
        } else {
          S.combo = 0;
          S.fat = Math.min(1, S.fat + 0.34);
          S.trauma = Math.min(1, S.trauma + 0.55);
          pop(S, 'ERROU!', '#f87171');
          sfx('noise', 'lowpass', 220, 0.22, 0.22);
          setPhase(S, 'fail');
        }
      }
    } else if (S.phase === 'lift') {
      // empurra: a barra sobe até travar os braços
      S.bar = Math.min(1, S.bar + DT / 0.36);
      if (S.bar >= 1 && S.phaseT >= 24) {
        if (S.reps >= S.target) {
          pop(S, 'META!', '#facc15', true);
          sfx('jingle', [523, 659, 784, 1047]);
          mentorDo(S, 'clap', 80);
          setPhase(S, 'end');
          return;
        }
        setPhase(S, 'lower');
      }
    } else if (S.phase === 'lower') {
      // desce controlado até o peito
      S.bar = Math.max(0, S.bar - DT / 0.32);
      if (S.bar <= 0) {
        newZone(S);
        setPhase(S, 'aim');
      }
    } else if (S.phase === 'fail') {
      // a barra sobe um pouco, trava, treme e volta para o peito
      const k = S.phaseT / 52;
      S.bar = k < 0.35 ? (k / 0.35) * 0.32 : 0.32 * (1 - (k - 0.35) / 0.65);
      if (S.phaseT >= 52) {
        S.bar = 0;
        if (S.fat >= 1) {
          pop(S, 'O MENTOR AJUDA', '#fbbf24');
          mentorDo(S, 'call_pass', 90);
          setPhase(S, 'rack');
        } else {
          newZone(S);
          setPhase(S, 'aim');
        }
      }
    } else if (S.phase === 'rack') {
      // cansaço cheio: o mentor põe a barra no suporte, respira e volta
      const k = S.phaseT / 100;
      S.bar = k < 0.5 ? k * 2 : 1;
      if (S.phaseT >= 100) {
        S.fat = 0.35;
        setPhase(S, 'lower');
      }
    }
  }

  // BARRA FIXA ----------------------------------------------------------
  function bandAt(S) {
    // a faixa passeia (soma de senos: não repete o padrão) e acelera com as repetições
    const sp = 1 + S.reps * 0.09;
    const t = S.bandT;
    return clamp(0.5 + 0.27 * Math.sin(t * 0.9 * sp) + 0.13 * Math.sin(t * 2.3 * sp + 1.7), S.bh + 0.02, 1 - S.bh - 0.02);
  }
  function pullTick(S) {
    S.bandT += DT;
    S.bh = Math.max(0.075, 0.15 - S.reps * 0.0085);
    S.band = bandAt(S);
    // o cursor: segurando sobe, solto cai
    const a = S.hold ? 2.7 : -2.3;
    S.gv = clamp(S.gv + a * DT, -1.3, 1.3);
    S.gy += S.gv * DT;
    if (S.gy <= 0) {
      S.gy = 0;
      S.gv = Math.max(0, S.gv);
    } else if (S.gy >= 1) {
      S.gy = 1;
      S.gv = Math.min(0, S.gv);
    }
    const inside = Math.abs(S.gy - S.band) <= S.bh;
    if (S.phase === 'hang') {
      if (inside) {
        S.prog = Math.min(1, S.prog + DT / 1.35);
        S.grip = Math.min(1, S.grip + DT * 0.1);
      } else {
        S.prog = Math.max(0, S.prog - DT * 0.5);
        S.grip = Math.max(0, S.grip - DT * 0.36);
        S.clean = false;
      }
      if (S.prog >= 1) {
        S.reps++;
        if (S.clean) {
          S.combo++;
          S.bestCombo = Math.max(S.bestCombo, S.combo);
          S.timeLeft += 1;
          pop(S, S.combo >= 2 ? 'PERFEITO X' + S.combo : 'PERFEITO!', '#facc15', true);
          sfx('jingle', [659, 880, 1175]);
          if (S.combo >= 2) mentorDo(S, 'clap', 50);
        } else {
          S.combo = 0;
          pop(S, 'SUBIU!', '#4ade80');
          sfx('tone', 'triangle', 330, 520, 0.14, 0.16);
        }
        if (S.reps >= S.target) {
          pop(S, 'META!', '#facc15', true);
          sfx('jingle', [523, 659, 784, 1047]);
          mentorDo(S, 'clap', 80);
          setPhase(S, 'end');
          return;
        }
        setPhase(S, 'down');
      } else if (S.grip <= 0) {
        S.combo = 0;
        S.trauma = Math.min(1, S.trauma + 0.6);
        pop(S, 'ESCORREGOU!', '#f87171', true);
        sfx('noise', 'lowpass', 240, 0.25, 0.24);
        setPhase(S, 'slip');
      }
    } else if (S.phase === 'down') {
      // desce até esticar os braços e começa a próxima
      S.prog = Math.max(0, S.prog - DT / 0.42);
      if (S.prog <= 0 && S.phaseT >= 20) {
        S.clean = true;
        setPhase(S, 'hang');
      }
    } else if (S.phase === 'slip') {
      // caiu da barra: respira e pula de novo (a pegada volta pela metade)
      S.prog = 0;
      if (S.phaseT >= 84) {
        S.grip = 0.6;
        S.clean = true;
        S.gy = S.band;
        S.gv = 0;
        setPhase(S, 'hang');
      }
    }
  }

  function finish(S) {
    stop();
    const info = { target: S.target, timeLeft: Math.max(0, Math.round(S.timeLeft)), bestCombo: S.bestCombo };
    try {
      App.onTrainingMinigameFinished(S.dr, S.reps, info);
    } catch (e) {
      console.error('[treino academia] resultado', e);
    }
  }

  // ---------------------------------------------------------------- o boneco (placa)
  // quadro da pose agora (bench/pullup: 0..10 = movimento, 11 = travou/escorregou)
  function poseIdx(S) {
    if (S.mode === 'bench') {
      if (S.phase === 'fail' && S.phaseT > 14) return 11;
      return Math.round(clamp(S.bar, 0, 1) * 10);
    }
    if (S.phase === 'slip') return 0;
    if (S.phase === 'hang' && S.grip < 0.3 && S.prog < 0.15) return 11;
    return Math.round(clamp(S.prog, 0, 1) * 10);
  }
  const ANIM = { bench: 'bench', pullup: 'pullup' };
  function drawOpts(S, idx) {
    return { animState: ANIM[S.mode], view: S.mode === 'bench' ? 'side' : 'front', left: false, frame: idx, accessories: App.state.equippedAccessories || [], shirtNumber: S.cd.number };
  }
  // monta os quadros aos poucos no começo (um por passo), para o movimento não engasgar
  function warm(S) {
    if (S.warm > 11) return;
    const P = PR();
    if (!P || !P.spritePose || !P.SpriteRig) {
      S.warm = 12;
      return;
    }
    const r = P.spritePose(S.cd, drawOpts(S, S.warm));
    P.SpriteRig.frame(S.cd, r.pose, r.opts);
    S.warm++;
  }
  function anchorsAt(S, idx) {
    const P = PR();
    if (!P || !P.spritePose || !P.SpriteRig) return null;
    const r = P.spritePose(S.cd, drawOpts(S, idx));
    const f = P.SpriteRig.frame(S.cd, r.pose, r.opts);
    return f && f.anchors ? f.anchors : null;
  }
  // você no aparelho fora do treino (arte dos cartões da aba TREINOS): caixa de 72 px
  // com o canto em (x, y), no quadro idx da pose; no supino a anilha vai na mão de perto
  GT.paintPose = function (g, cd, mode, idx, x, y) {
    const P = PR();
    if (!P || !cd) return;
    const S = { mode, cd };
    g.save();
    g.translate(x, y);
    P.drawCharacterSprite(g, cd, 72, 72, drawOpts(S, idx));
    g.restore();
    if (mode !== 'bench') return;
    const a = anchorsAt(S, idx);
    if (!a || !a.handL) return;
    const h = a.handL[1] <= a.handR[1] ? a.handL : a.handR;
    drawPlate(g, Math.round(x + h[0] * 2), Math.round(y + h[1] * 2 - 6));
  };
  GT.handsAt = (cd, mode, idx) => anchorsAt({ mode, cd }, idx);
  // placa do boneco (com a anilha no supino): BW x BH px, quadril do boneco em (OX + 36)
  const PL = { bench: { w: 128, h: 80, ox: 34, oy: 14 }, pullup: { w: 96, h: 96, ox: 12, oy: 14 } };
  function lifterCanvas(S) {
    const L = PL[S.mode];
    if (!S.lc) {
      S.lc = document.createElement('canvas');
      S.lc.width = L.w;
      S.lc.height = L.h;
      S.lcKey = '';
    }
    const idx = poseIdx(S);
    const key = idx + '|' + (S.mode === 'bench' ? Math.round(S.bar * 40) : 0);
    if (key === S.lcKey) return { cv: S.lc, idx, dirty: false };
    S.lcKey = key;
    const g = S.lc.getContext('2d');
    g.clearRect(0, 0, L.w, L.h);
    g.imageSmoothingEnabled = false;
    g.save();
    g.translate(L.ox, L.oy);
    PR().drawCharacterSprite(g, S.cd, 72, 72, drawOpts(S, idx));
    g.restore();
    if (S.mode === 'bench') {
      const a = anchorsAt(S, idx);
      if (a && a.handL) {
        // a mão de perto (mais alta na tela) segura a barra; a anilha azul de 20 kg fica
        // por fora dela, um pouco acima (a barra vem na direção da câmera)
        const h = a.handL[1] <= a.handR[1] ? a.handL : a.handR;
        drawPlate(g, Math.round(L.ox + h[0] * 2), Math.round(L.oy + h[1] * 2 - 6));
      }
    }
    return { cv: S.lc, idx, dirty: true };
  }
  // anilha de 20 kg (azul) vista de frente, em pixel art: aro escuro, face azul com brilho
  // em cima à esquerda, anel de dentro e a ponta da barra (luva de aço) no meio
  function drawPlate(g, cx, cy) {
    const R = 8;
    for (let y = -R; y <= R; y++) {
      for (let x = -R; x <= R; x++) {
        const d = Math.hypot(x + 0.5, y + 0.5);
        if (d > R + 0.2) continue;
        let c;
        if (d > R - 1.1) c = '#0b1020';
        else if (d < 2.4) c = d < 1.4 ? '#e5e7eb' : '#94a3b8';
        else if (d < 3.6) c = '#0f1b45';
        else if (d > R - 2.2 && x + y < -3) c = '#3b82f6';
        else if (d > R - 2.2 && x + y > 4) c = '#172554';
        else c = x + y < -1 ? '#2453c9' : '#1e40af';
        g.fillStyle = c;
        g.fillRect(cx + x, cy + y, 1, 1);
      }
    }
    // brilho pequeno no aro
    g.fillStyle = '#93c5fd';
    g.fillRect(cx - 5, cy - 5, 2, 1);
    g.fillRect(cx - 5, cy - 4, 1, 1);
  }

  // ---------------------------------------------------------------- câmera e cena 3D
  function camNow(S) {
    const st = S.st;
    let k = 1;
    if (S.phase === 'intro') k = ease(S.phaseT / 66);
    const eye = mix(st.from.eye, st.cam.eye, k);
    const look = mix(st.from.look, st.cam.look, k);
    const fov = st.from.fov + (st.cam.fov - st.from.fov) * k;
    // a câmera respira de leve (nunca parada) e treme um pouco no erro
    const t = S.tick / 60;
    const sh = S.trauma * S.trauma * 0.025;
    eye[0] += Math.sin(t * 0.37) * 0.025;
    eye[1] += Math.sin(t * 0.53) * 0.012 + Math.sin(S.tick * 1.7) * sh;
    eye[2] += Math.sin(t * 0.29 + 1) * 0.03 + Math.cos(S.tick * 2.3) * sh;
    return { eye, look, fov };
  }
  const L3 = [0, 0, 0];
  function litAt(x, y, lift) {
    const W = X && X.World;
    if (!W || !W.light || !W.L) return [1, 1, 1];
    W.light(x, y, L3, false);
    // (embaixo de uma luminária a pele estourava em branco: a luz do boneco tem teto)
    const k = Math.min(1, 0.95 / Math.max(0.01, Math.max(L3[0], L3[1], L3[2]) + lift));
    return [(L3[0] + lift) * k, (L3[1] + lift) * k, (L3[2] + lift) * k];
  }
  function lifterPlacement(S, lc) {
    const st = S.st.lifter;
    const L = PL[S.mode];
    const w = L.w * UPX;
    const h = L.h * UPX;
    if (S.mode === 'bench') {
      // linha do chão do boneco (pé = 31,2 unidades = 62,4 px na caixa) em cima do banco;
      // o quadril fica em lifter.y (a cabeça para o lado do suporte)
      const groundPx = L.oy + 62.4;
      const z = st.z - (L.h - groundPx) * UPX;
      const shake = S.phase === 'fail' && S.phaseT > 14 ? (S.tick % 4 < 2 ? 1 : -1) * UPX : 0;
      const yc = st.y - (L.ox + 36 - L.w / 2) * UPX + shake;
      return { x: st.x, y: yc, z, w, h };
    }
    // barra fixa: as mãos ficam na altura da barra (âncora das mãos de cada quadro)
    const a = anchorsAt(S, lc.idx);
    const handY = a && a.handL ? (a.handL[1] + a.handR[1]) / 2 : 12;
    const handPx = L.oy + handY * 2;
    let z = st.barZ - (L.h - handPx) * UPX;
    if (S.phase === 'slip') {
      // soltou: cai até o chão (pés no chão) e depois pula de volta
      const footPx = L.oy + 62.4;
      const zFloor = -(L.h - footPx) * UPX;
      const k = S.phaseT < 14 ? ease(S.phaseT / 14) : S.phaseT > 70 ? 1 - ease((S.phaseT - 70) / 14) : 1;
      z = z + (zFloor - z) * k;
    }
    const sway = S.phase === 'hang' && S.grip < 0.35 ? Math.sin(S.tick * 0.9) * UPX : 0;
    return { x: st.x, y: st.y + sway, z, w, h };
  }
  function scene(S, cam) {
    const st = S.st;
    const lc = lifterCanvas(S);
    const pl = lifterPlacement(S, lc);
    const c = { sk: true, noMe: true, noDust: false, eye: cam.eye, look: cam.look, fov: cam.fov, actors: [], sprites: [], dyn: [] };
    c.sprites.push({ src: lc.cv, dirty: lc.dirty, x: pl.x, y: pl.y, z: pl.z, w: pl.w, h: pl.h, light: litAt(pl.x, pl.y, 0.1), alpha: 1, shadow: 0, foot: 0 });
    if (S.mentorCd) {
      const m = st.mentor;
      c.actors.push({ cd: S.mentorCd, x: m.x, y: m.y, z: 0, ang: m.ang, anim: S.mentorAnim, frame: S.tick, slot: 141, shadow: 0.22 });
    }
    return c;
  }
  function render3D(S, cam) {
    const G = Hub && Hub.GL3D;
    if (!G || !G.renderNow || !X) return null;
    const W = X.World;
    const c = scene(S, cam);
    const save = { px: Hub.px, py: Hub.py, area: Hub.area, t: Hub.t, camA: Hub.camA, sk: Hub.sk, skTheme: Hub.skTheme };
    Hub.camA = Math.atan2(c.look[2] - c.eye[2], c.look[0] - c.eye[0]);
    Hub.sk = c;
    Hub.skTheme = null;
    Hub.px = c.look[0];
    Hub.py = c.look[2];
    Hub.area = 'academia';
    Hub.t = S.tick;
    W.hideK = S.st.hide ? { [S.st.hide]: true } : null;
    let out = null;
    try {
      out = G.renderNow();
    } finally {
      Object.assign(Hub, save);
    }
    return out;
  }
  const can3d = () => {
    const CE = window.CutsceneEngine;
    try {
      return !!(Hub && Hub.GL3D && CE && CE.cine3dAvailable && CE.cine3dAvailable());
    } catch (e) {
      return false;
    }
  };

  // ---------------------------------------------------------------- 2D (sem placa de vídeo)
  // O aparelho visto de lado num cenário simples da academia, em pixel art ampliado por
  // número inteiro: parede com espelho, piso de borracha, o banco/a barra e você.
  function render2D(S, g, W, H) {
    const px = Math.max(2, Math.floor(Math.min(W / 300, H / 170)));
    const vw = Math.ceil(W / px);
    const vh = Math.ceil(H / px);
    if (!S.c2 || S.c2.width !== vw || S.c2.height !== vh) {
      S.c2 = document.createElement('canvas');
      S.c2.width = vw;
      S.c2.height = vh;
    }
    const c = S.c2.getContext('2d');
    c.imageSmoothingEnabled = false;
    const R = (x, y, w, h, col) => {
      c.fillStyle = col;
      c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };
    const floorY = Math.round(vh * 0.7);
    R(0, 0, vw, floorY, '#0d1730');
    for (let x = 6; x < vw; x += 46) {
      R(x, 18, 38, floorY - 52, '#16264a');
      R(x + 2, 20, 34, floorY - 56, '#1b3058');
      R(x + 4, 22, 2, floorY - 60, '#2c4a7c');
    }
    R(0, floorY - 26, vw, 2, '#22d3ee');
    R(0, floorY - 24, vw, 1, '#0e7490');
    R(0, floorY, vw, vh - floorY, '#111827');
    for (let x = 0; x < vw; x += 16) R(x, floorY, 1, vh - floorY, '#0b1220');
    R(0, floorY, vw, 1, '#334155');
    const cx = Math.round(vw / 2);
    const lc = lifterCanvas(S);
    const L = PL[S.mode];
    if (S.mode === 'bench') {
      const benchTop = floorY - 18;
      R(cx - 40, benchTop, 80, 5, '#7f1d1d');
      R(cx - 40, benchTop, 80, 1, '#b91c1c');
      R(cx - 36, benchTop + 5, 6, floorY - benchTop - 5, '#1f2937');
      R(cx + 30, benchTop + 5, 6, floorY - benchTop - 5, '#1f2937');
      R(cx - 44, benchTop - 30, 3, floorY - benchTop + 30, '#9ca3af');
      R(cx - 44, benchTop - 30, 1, floorY - benchTop + 30, '#d1d5db');
      const x0 = Math.round(cx - (L.ox + 36) + 6);
      const y0 = Math.round(benchTop - (L.oy + 62));
      c.drawImage(lc.cv, x0, y0);
    } else {
      const barY = floorY - 70;
      R(cx - 40, barY - 6, 4, floorY - barY + 6, '#334155');
      R(cx + 36, barY - 6, 4, floorY - barY + 6, '#334155');
      R(cx - 40, barY - 6, 80, 3, '#1e293b');
      const a = anchorsAt(S, lc.idx);
      const handY = a && a.handL ? (a.handL[1] + a.handR[1]) / 2 : 12;
      let y0 = Math.round(barY + 1 - (L.oy + handY * 2));
      if (S.phase === 'slip') y0 = Math.round(floorY - (L.oy + 62));
      c.drawImage(lc.cv, Math.round(cx - L.w / 2), y0);
      R(cx - 36, barY, 72, 2, '#cbd5e1');
    }
    if (S.mentorCd) {
      const mx = S.mode === 'bench' ? cx - 64 : cx + 56;
      c.save();
      c.translate(mx - 36, floorY - 62);
      PR().drawCharacterSprite(c, S.mentorCd, 72, 72, { animState: S.mentorAnim, view: 'side', left: S.mode !== 'bench', frame: S.tick, accessories: [] });
      c.restore();
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(S.c2, 0, 0, vw * px, vh * px);
  }

  // ---------------------------------------------------------------- desenho
  function draw(S) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(64, Math.round(window.innerWidth * dpr));
    const H = Math.max(64, Math.round(window.innerHeight * dpr));
    const g = cv.getContext('2d');
    const cam = camNow(S);
    let src = null;
    if (can3d()) src = render3D(S, cam);
    if (src) {
      if (cv.width !== src.width || cv.height !== src.height) {
        cv.width = src.width;
        cv.height = src.height;
      }
      g.drawImage(src, 0, 0);
    } else {
      if (cv.width !== W || cv.height !== H) {
        cv.width = W;
        cv.height = H;
      }
      g.fillStyle = '#03060f';
      g.fillRect(0, 0, W, H);
      render2D(S, g, W, H);
    }
    drawHud(S);
  }

  // HUD em pixel art: canvas pequeno (P px da tela por pixel) ampliado sem suavizar
  function drawHud(S) {
    const cw = window.innerWidth || 1280;
    const ch = window.innerHeight || 720;
    const P = clamp(Math.floor(Math.min(cw / 300, ch / 168)), 2, 6);
    const w = Math.ceil(cw / P);
    const h = Math.ceil(ch / P);
    if (hud.width !== w || hud.height !== h) {
      hud.width = w;
      hud.height = h;
      hud.style.width = w * P + 'px';
      hud.style.height = h * P + 'px';
    }
    const g = hud.getContext('2d');
    g.clearRect(0, 0, w, h);
    g.imageSmoothingEnabled = false;
    const R = (x, y, ww, hh, c) => {
      g.fillStyle = c;
      g.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh));
    };
    const T = (s, x, y, c, k = 1, al = 'left') => (Hub && Hub.ptext ? Hub.ptext(g, s, x, y, c, k, al) : 0);
    const panel = (x, y, ww, hh) => {
      R(x, y, ww, hh, 'rgba(3,7,18,0.82)');
      R(x, y, ww, 1, '#334155');
      R(x, y + hh - 1, ww, 1, '#0f172a');
      R(x, y, 1, hh, '#334155');
      R(x + ww - 1, y, 1, hh, '#0f172a');
    };
    const mob = cw < 760 || ch < 460;
    // ---- topo: nome e contagem (esquerda), relógio (meio), combo
    const name = S.mode === 'bench' ? 'SUPINO' : 'BARRA FIXA';
    panel(4, 4, 74, 24);
    T(name, 8, 8, '#38bdf8');
    const unit = S.mode === 'bench' ? 'REPS' : 'BARRAS';
    T(String(S.reps).padStart(2, '0'), 8, 15, '#f8fafc', 2);
    T('/' + S.target + ' ' + unit, 32, 20, '#94a3b8');
    const tl = Math.ceil(S.timeLeft);
    const ts = Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0');
    const tw = 54;
    panel(Math.round(w / 2 - tw / 2), 4, tw, 17);
    T(ts, Math.round(w / 2), 7, tl <= 10 && S.phase !== 'intro' && S.phase !== 'count' ? (S.tick % 30 < 15 ? '#f87171' : '#fecaca') : '#f8fafc', 2, 'center');
    if (S.combo >= 2) {
      panel(4, 31, 74, 11);
      T('COMBO X' + S.combo, 8, 34, '#facc15');
    }
    // ---- contagem antes de começar
    if (S.phase === 'count') {
      const n = 3 - Math.floor(S.phaseT / 30);
      const s = n > 0 ? String(n) : 'VAI!';
      const k = n > 0 ? 4 : 3;
      T(s, Math.round(w / 2), 30, n > 0 ? '#f8fafc' : '#4ade80', k, 'center');
    }
    // ---- medidor de cada treino
    if (S.mode === 'bench') benchHud(S, g, w, h, R, T, panel, mob);
    else pullHud(S, g, w, h, R, T, panel, mob);
    // ---- avisos que sobem (perto do medidor, nunca no rosto)
    // (só o último aviso: um por cima do outro virava borrão)
    const ay = h - 56;
    const p = S.pops[S.pops.length - 1];
    if (p) {
      const k = p.t / 50;
      if (!(k > 0.85 && p.t % 4 < 2)) {
        const y = Math.round(ay - k * 8);
        const x = Math.round(w / 2);
        T(p.text, x + 1, y + 1, '#020617', p.big ? 2 : 1, 'center');
        T(p.text, x, y, p.color, p.big ? 2 : 1, 'center');
      }
    }
  }
  function benchHud(S, g, w, h, R, T, panel, mob) {
    const bw = Math.min(196, w - (mob ? 130 : 60));
    const bx = Math.round(w / 2 - bw / 2);
    const by = h - 30;
    panel(bx - 6, by - 13, bw + 12, 33);
    T('FORÇA', bx, by - 9, '#94a3b8');
    // cansaço: 3 blocos que enchem a cada erro
    T('CANSAÇO', bx + bw - 46, by - 9, '#94a3b8');
    for (let i = 0; i < 3; i++) {
      const on = S.fat >= (i + 1) / 3 - 0.01;
      R(bx + bw - 12 + i * 4, by - 9, 3, 5, on ? '#f87171' : '#1e293b');
    }
    // a barra
    R(bx - 1, by - 1, bw + 2, 10, '#94a3b8');
    R(bx, by, bw, 8, '#0b1220');
    const z0 = Math.round(bx + (S.zone - S.zw) * bw);
    const z1 = Math.round(bx + (S.zone + S.zw) * bw);
    const p0 = Math.round(bx + (S.zone - S.zw * 0.32) * bw);
    const p1 = Math.round(bx + (S.zone + S.zw * 0.32) * bw);
    const live = S.phase === 'aim';
    R(z0, by, z1 - z0, 8, live ? '#16a34a' : '#14532d');
    R(z0, by, z1 - z0, 1, live ? '#4ade80' : '#166534');
    R(p0, by, Math.max(2, p1 - p0), 8, live ? '#facc15' : '#a16207');
    R(p0, by, Math.max(2, p1 - p0), 1, live ? '#fef08a' : '#ca8a04');
    for (let x = bx + 8; x < bx + bw; x += 8) R(x, by + 6, 1, 2, 'rgba(148,163,184,0.25)');
    // o cursor (para quando a barra está subindo)
    const cx = Math.round(bx + S.cur * (bw - 1));
    R(cx - 1, by - 4, 3, 16, '#020617');
    R(cx, by - 3, 1, 14, '#f8fafc');
    R(cx - 2, by - 5, 5, 1, '#f8fafc');
    R(cx - 1, by - 4, 3, 1, '#f8fafc');
    if (S.reps < 2 && !S.pops.length) T(mob ? 'TOQUE NA FAIXA VERDE' : 'ESPAÇO / CLIQUE NA FAIXA VERDE', Math.round(w / 2), by + 12, '#64748b', 1, 'center');
  }
  function pullHud(S, g, w, h, R, T, panel, mob) {
    // medidor em pé à direita (no celular, à esquerda: o botão fica à direita)
    const gh = Math.min(104, h - 70);
    const gx = mob ? 14 : w - 40;
    const gy0 = Math.round(h / 2 - gh / 2) + 8;
    panel(gx - 8, gy0 - 14, 36, gh + 22);
    T('FÔLEGO', gx + 10, gy0 - 10, '#94a3b8', 1, 'center');
    R(gx - 1, gy0 - 1, 12, gh + 2, '#94a3b8');
    R(gx, gy0, 10, gh, '#0b1220');
    const yOf = (v) => Math.round(gy0 + (1 - v) * (gh - 1));
    const b0 = yOf(S.band + S.bh);
    const b1 = yOf(S.band - S.bh);
    const inside = Math.abs(S.gy - S.band) <= S.bh;
    const live = S.phase === 'hang';
    R(gx, b0, 10, b1 - b0 + 1, live ? (inside ? '#22c55e' : '#15803d') : '#14532d');
    R(gx, b0, 10, 1, live ? '#86efac' : '#166534');
    // o cursor
    const cy = yOf(S.gy);
    R(gx - 3, cy - 1, 16, 3, '#020617');
    R(gx - 2, cy, 14, 1, S.hold ? '#facc15' : '#f8fafc');
    R(gx - 4, cy - 1, 2, 3, S.hold ? '#facc15' : '#f8fafc');
    // a subida desta barra (dourado) ao lado
    R(gx + 14, gy0, 4, gh, '#0b1220');
    const ph = Math.round(S.prog * gh);
    R(gx + 14, gy0 + gh - ph, 4, ph, '#facc15');
    // pegada embaixo, no meio
    const pw = Math.min(120, w - 120);
    const px0 = Math.round(w / 2 - pw / 2);
    const py = h - 22;
    panel(px0 - 6, py - 12, pw + 12, 22);
    T('PEGADA', px0, py - 8, '#94a3b8');
    const segs = 10;
    const sw = Math.floor((pw - (segs - 1)) / segs);
    for (let i = 0; i < segs; i++) {
      const on = S.grip > i / segs + 0.001;
      const col = S.grip < 0.3 ? '#f87171' : S.grip < 0.6 ? '#fbbf24' : '#4ade80';
      R(px0 + i * (sw + 1), py, sw, 5, on ? col : '#1e293b');
    }
    if (S.reps < 2 && !S.pops.length) T(mob ? 'SEGURE O BOTÃO' : 'SEGURE ESPAÇO PARA SUBIR', Math.round(w / 2), py - 18, '#64748b', 1, 'center');
  }
})();
