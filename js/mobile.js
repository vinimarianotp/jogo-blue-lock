// ============================================================================
// CELULAR: controles de toque na partida (joystick + botões) e ajustes de tela.
// Só liga em aparelho de toque (ou com ?touch=1 na URL, para testar no PC).
//   joystick (esquerda)  → WASD. Nasce onde o dedo encostar na metade esquerda (não
//                          precisa achar o círculo). Correr é só no botão CORRER
//   CHUTAR (segurar)     → carrega o chute e vira um analógico de mira: arrastando o dedo,
//                          mira para onde arrastou; sem arrastar, chuta no gol (o joystick
//                          escolhe o canto). A linha tracejada no campo mostra para onde vai
//   PASSE                → passe para o companheiro na direção do joystick (sem bola: pede a bola)
//   DRIBLE / CARRINHO / CORRER (trava a corrida) / FLUXO / QUÍMICA / skills 1–6 (+V) / ⏸
// Só deitado: com o celular em pé (ex: trava de rotação ligada) a partida é desenhada
// girada 90° (html.tc-deitado) — é só virar o celular de lado, com a câmera na esquerda.
// O jogo de PC não muda: a mira com o mouse continua igual.
// ============================================================================
// Service worker (app instalado, sem internet, atualização sozinha): só no site
// (http/https, ex: GitHub Pages) — abrindo o index.html direto do PC (file://) não existe
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

(function () {
  const q = new URLSearchParams(location.search);
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const touch = q.get('touch') === '1' || (coarse && (navigator.maxTouchPoints || 0) > 0);
  window.IS_TOUCH = !!touch;
  if (!touch) return;
  document.documentElement.classList.add('is-touch');

  const ME = window.MatchEngine;
  const overlay = document.getElementById('fullscreen-match-overlay');
  if (!ME || !overlay) return;

  // ---------------------------------------------------------------- montagem
  const root = document.createElement('div');
  root.className = 'tc-root';
  root.innerHTML = `
    <div class="tc-zone"></div>
    <div class="tc-stick"><div class="tc-stick-ring"></div><div class="tc-knob"></div></div>
    <div class="tc-actions">
      <button class="tc-btn tc-shoot" data-act="shoot"><b>CHUTAR</b><small>arraste: mira</small><i class="tc-charge"></i></button>
      <button class="tc-btn tc-pass" data-act="pass"><b>PASSE</b></button>
      <button class="tc-btn tc-dribble" data-act="dribble"><b>DRIBLE</b></button>
      <button class="tc-btn tc-tackle" data-act="tackle"><b>CARRINHO</b></button>
      <button class="tc-btn tc-sprint" data-act="sprint"><b>CORRER</b></button>
    </div>
    <div class="tc-row">
      <button class="tc-mini tc-flow" data-act="flow">G<small>FLUXO</small></button>
      <button class="tc-mini tc-chem" data-act="chem">C<small>QUÍM.</small></button>
      ${['1', '2', '3', '4', '5', '6', 'v'].map((k) => `<button class="tc-mini tc-skill" data-act="skill" data-key="${k}">${k.toUpperCase()}</button>`).join('')}
    </div>
    <button class="tc-pause" data-act="pause">⏸</button>
    <div class="tc-aim"><div class="tc-stick-ring"></div><div class="tc-knob"></div></div>`;
  overlay.appendChild(root);

  const zone = root.querySelector('.tc-zone');
  const aimPad = root.querySelector('.tc-aim');
  const aimKnob = aimPad.querySelector('.tc-knob');
  const stick = root.querySelector('.tc-stick');
  const knob = root.querySelector('.tc-knob');
  const chargeBar = root.querySelector('.tc-charge');
  const vec = { x: 0, y: 0, mag: 0 };

  // ---------------------------------------------------------------- deitado na marra
  // Celular em pé com a partida aberta: a partida é desenhada girada 90° (css/mobile.css).
  // O toque chega nas coordenadas da tela em pé; toLocal traz para as da partida.
  const html = document.documentElement;
  const portrait = window.matchMedia('(orientation: portrait)');
  const syncDeitado = (open = overlay.classList.contains('open')) => html.classList.toggle('tc-deitado', open && portrait.matches);
  const toLocal = (x, y) => {
    if (!html.classList.contains('tc-deitado')) return { x, y };
    return { x: y, y: overlay.getBoundingClientRect().right - x };
  };
  // Mira do chute: arrasto a partir do botão CHUTAR (mag 0 = sem mira, chuta no gol)
  const aim = { x: 0, y: 0, mag: 0, sx: 0, sy: 0 };
  let sprintLock = false;

  // ---------------------------------------------------------------- mira
  const setMouseWorld = (wx, wy) => {
    const s = ME.project3D(wx, wy, 0);
    ME.mouse.x = s.sx;
    ME.mouse.y = s.sy;
  };
  // Chute: no gol rival; o joystick para cima/baixo escolhe o canto
  const aimGoal = () => {
    const p = ME.playerEntity;
    if (!p) return;
    const lim = ME.GOAL_HALF_WIDTH * 0.72;
    const gy = Math.max(-lim, Math.min(lim, p.y * 0.3 + (vec.mag > 0.3 ? vec.y : 0) * lim));
    setMouseWorld(ME.PITCH_HALF_X, gy);
  };
  // Passe: o companheiro mais na direção do joystick (parado: o mais perto à frente)
  const aimMate = () => {
    const p = ME.playerEntity;
    if (!p) return;
    let best = null;
    let bestScore = -Infinity;
    ME.entities.forEach((m) => {
      if (m.team !== 'home' || m.isPlayer || m.isGK || m.stunTimer > 0) return;
      const dx = m.x - p.x;
      const dy = m.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const score = vec.mag > 0.3 ? (dx * vec.x + dy * vec.y) / d - d / 2500 : (dx > -80 ? 1 : 0) - d / 1200;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    });
    if (best) setMouseWorld(best.x, best.y);
  };
  // Drible/carrinho sem direção no joystick: para frente / na bola
  const aimAhead = () => {
    const p = ME.playerEntity;
    if (p) setMouseWorld(p.x + 220, p.y);
  };
  const aimBall = () => setMouseWorld(ME.ball.x, ME.ball.y);
  // Chute mirado: na direção do arrasto (para cima na tela = lado de cima do campo)
  const aimDrag = () => {
    const p = ME.playerEntity;
    if (p) setMouseWorld(p.x + aim.x * 800, p.y + aim.y * 800);
  };
  const aimShot = () => (aim.mag > 0 ? aimDrag() : aimGoal());

  const canAct = () => ME.active && !ME.paused && !ME.camera?.cutsceneMode && !ME.pauseOpen;

  // ---------------------------------------------------------------- joystick
  // (a captura do toque falha em alguns navegadores/toques sintéticos: nunca pode travar a ação)
  const capture = (el, e) => {
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      /* segue sem captura */
    }
  };
  let stickId = null;
  const applyStick = () => {
    const keys = ME.keys;
    const on = vec.mag > 0.28;
    keys['w'] = on && vec.y < -0.38;
    keys['s'] = on && vec.y > 0.38;
    keys['a'] = on && vec.x < -0.38;
    keys['d'] = on && vec.x > 0.38;
    keys['shift'] = sprintLock && on;
    knob.style.transform = `translate(${vec.x * 42}px, ${vec.y * 42}px)`;
  };
  const stickMove = (e) => {
    const pt = toLocal(e.clientX, e.clientY);
    const half = stick.offsetWidth / 2;
    let dx = (pt.x - stick.offsetLeft - half) / half;
    let dy = (pt.y - stick.offsetTop - half) / half;
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    vec.x = dx;
    vec.y = dy;
    vec.mag = Math.min(1, m);
    applyStick();
  };
  // O analógico nasce embaixo do dedo (dentro da metade esquerda) e volta ao lugar ao soltar
  const placeStick = (e) => {
    const pt = toLocal(e.clientX, e.clientY);
    const half = stick.offsetWidth / 2;
    const zl = zone.offsetLeft;
    const zt = zone.offsetTop;
    const cx = Math.max(zl + half, Math.min(zl + zone.offsetWidth - half, pt.x));
    const cy = Math.max(zt + half, Math.min(zt + zone.offsetHeight - half - 6, pt.y));
    stick.style.left = `${cx - half}px`;
    stick.style.top = `${cy - half}px`;
    stick.style.bottom = 'auto';
  };
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (stickId !== null) return;
    stickId = e.pointerId;
    capture(zone, e);
    placeStick(e);
    stick.classList.add('on');
    stickMove(e);
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId === stickId) stickMove(e);
  });
  const stickEnd = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    vec.x = vec.y = vec.mag = 0;
    stick.classList.remove('on');
    stick.style.left = stick.style.top = stick.style.bottom = '';
    applyStick();
  };
  zone.addEventListener('pointerup', stickEnd);
  zone.addEventListener('pointercancel', stickEnd);

  // ---------------------------------------------------------------- botões
  let shootId = null;
  const shootStart = (e) => {
    if (!canAct()) return;
    if (ME.replay) {
      ME.endReplay();
      return;
    }
    if (ME.goalPause > 0) return;
    shootId = e.pointerId;
    const pt = toLocal(e.clientX, e.clientY);
    aim.sx = pt.x;
    aim.sy = pt.y;
    aim.x = aim.y = aim.mag = 0;
    // O analógico de mira nasce embaixo do dedo
    const half = aimPad.offsetWidth / 2 || 60;
    aimPad.style.left = `${pt.x - half}px`;
    aimPad.style.top = `${pt.y - half}px`;
    aimKnob.style.transform = '';
    aimPad.classList.add('on');
    ME.mouse.down = true;
    ME.mouse.charge = 12;
    if (ME.ball.owner === ME.playerEntity) {
      ME.playerEntity.animState = 'windup';
      ME.playerEntity.animTimer = 25;
    }
  };
  const shootEnd = (e) => {
    if (e.pointerId !== shootId) return;
    shootId = null;
    aimPad.classList.remove('on', 'aiming');
    if (!ME.mouse.down) return;
    ME.mouse.down = false;
    if (canAct()) {
      aimShot();
      ME.shootTowardMouse(ME.mouse.charge);
    }
    ME.mouse.charge = 0;
    aim.x = aim.y = aim.mag = 0;
    aimPad.classList.remove('on', 'aiming');
  };
  // Arrastando o dedo com o CHUTAR apertado: a mira segue o arrasto (até 14px é toque parado)
  const shootDrag = (e) => {
    if (e.pointerId !== shootId) return;
    const pt = toLocal(e.clientX, e.clientY);
    const dx = pt.x - aim.sx;
    const dy = pt.y - aim.sy;
    const d = Math.hypot(dx, dy);
    const k = d > 46 ? 46 / d : 1;
    aimKnob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    aimPad.classList.toggle('aiming', d >= 14);
    if (d < 14) {
      aim.mag = 0;
      return;
    }
    aim.x = dx / d;
    aim.y = dy / d;
    aim.mag = Math.min(1, d / 70);
  };

  root.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    e.preventDefault();
    b.classList.add('down');
    const act = b.dataset.act;
    if (act === 'pause') return ME.openPauseMenu();
    if (act === 'shoot') {
      capture(b, e);
      return shootStart(e);
    }
    if (!canAct()) return;
    if (ME.replay) return ME.endReplay();
    if (ME.goalPause > 0) return;
    if (act === 'pass') {
      aimMate();
      ME.passBall();
    } else if (act === 'dribble') {
      if (vec.mag <= 0.28) aimAhead();
      ME.dribbleMove();
    } else if (act === 'tackle') {
      aimBall();
      ME.slideTackle();
    } else if (act === 'sprint') {
      sprintLock = !sprintLock;
      b.classList.toggle('lock', sprintLock);
      applyStick();
    } else if (act === 'flow') {
      ME.activateFlow();
    } else if (act === 'chem') {
      ME.triggerChemicalReaction();
    } else if (act === 'skill') {
      aimGoal();
      ME.useWeaponSkill(b.dataset.key);
    }
  });
  const release = (e) => {
    root.querySelectorAll('button.down').forEach((x) => x.classList.remove('down'));
    shootEnd(e);
  };
  root.addEventListener('pointermove', shootDrag);
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);

  // Toque no campo durante o replay pula (o canvas não recebe toque no celular); a área
  // do analógico também conta, senão metade da tela deitada não pulava
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.tc-root button, .pause-overlay, .tutorial-panel')) return;
    if (ME.active && ME.replay) ME.endReplay();
  });

  // ---------------------------------------------------------------- estado visível
  // Esconde os controles em cena/diálogo/pausa; mostra só as skills que existem;
  // barra de carga do chute
  const tick = () => {
    const CE = window.CutsceneEngine;
    syncDeitado();
    const hide = !ME.active || ME.pauseOpen || CE?.active || CE?.sakugaActive;
    root.classList.toggle('hidden', !!hide);
    if (ME.active) {
      const st = ME.playerState || {};
      root.querySelectorAll('.tc-skill').forEach((b) => {
        const k = b.dataset.key;
        const has = k === 'v' ? !!ME.passive?.('copy') : ['4', '5', '6'].includes(k) ? !!(st.nelUnlocked && st.equippedWeapon2) : !!st.equippedWeapon;
        b.style.display = has ? '' : 'none';
        b.classList.toggle('cd', (ME.skillCooldowns?.[k] || 0) > 0);
      });
      root.querySelector('.tc-flow').classList.toggle('ready', (ME.flowState?.charge || 0) >= 100 && !ME.flowState?.active);
      root.querySelector('.tc-chem').classList.toggle('ready', (ME.chemCharge || 0) >= 60);
      const haveBall = ME.ball?.owner === ME.playerEntity;
      root.querySelector('.tc-pass b').textContent = haveBall ? 'PASSE' : 'PEDIR';
      chargeBar.style.transform = `scaleX(${ME.mouse.down ? Math.min(1, ME.mouse.charge / 100) : 0})`;
      // Com a bola: a mira (e a linha tracejada no campo) sempre aponta para onde o chute vai
      if (haveBall && canAct() && !ME.replay) aimShot();
      root.querySelector('.tc-shoot').classList.toggle('aiming', aim.mag > 0);
    } else if (sprintLock) {
      sprintLock = false;
      root.querySelector('.tc-sprint').classList.remove('lock');
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // ---------------------------------------------------------------- tela cheia
  // Ao começar a partida: tela cheia e (no Android) trava deitado. Sem suporte: só segue.
  const origStart = ME.startMatch.bind(ME);
  ME.startMatch = function (...args) {
    syncDeitado(true);
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
      }
    } catch (e) {
      /* sem tela cheia */
    }
    return origStart(...args);
  };
  const origTrain = ME.startTrainingMinigame?.bind(ME);
  if (origTrain) {
    ME.startTrainingMinigame = function (...args) {
      syncDeitado(true);
      try {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
      } catch (e) {
        /* sem tela cheia */
      }
      return origTrain(...args);
    };
  }
  // Acabou a partida: as telas seguintes (resultado, história) voltam ao normal na hora
  const origClose = ME.closeFullscreenOverlay.bind(ME);
  ME.closeFullscreenOverlay = function (...args) {
    const r = origClose(...args);
    syncDeitado(false);
    return r;
  };
  // Barra de abas deslizante: a aba escolhida (até por botão, ex: "ARMAS ▶") aparece na tela
  const App = window.App;
  if (App?.switchTab) {
    const origSwitch = App.switchTab.bind(App);
    App.switchTab = function (tab, ...rest) {
      const r = origSwitch(tab, ...rest);
      try {
        document.querySelector(`.top-tab-btn[data-tab="${tab}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      } catch (e) {
        /* navegador sem scrollIntoView com opções */
      }
      return r;
    };
  }
  // ---------------------------------------------------------------- tamanho da tela
  // A altura de verdade da tela: o 100vh do celular conta a barra do navegador, que
  // escondia a parte de baixo da partida (controles e campo ficavam "para baixo")
  const setAppH = () => html.style.setProperty('--app-h', `${window.innerHeight}px`);
  setAppH();
  window.addEventListener('resize', setAppH);
  // O motor mede a caixa do campo para desenhar: antes, acerta a altura e o "deitado"
  const origResize = ME.resizeCanvasToFullscreen.bind(ME);
  ME.resizeCanvasToFullscreen = function (...args) {
    setAppH();
    syncDeitado();
    return origResize(...args);
  };
  // Girou o celular: o canvas acompanha
  window.addEventListener('orientationchange', () => setTimeout(() => ME.active && ME.resizeCanvasToFullscreen(), 300));
})();
