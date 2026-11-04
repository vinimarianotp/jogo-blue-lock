// ============================================================================
// CELULAR: controles de toque na partida (joystick + botões) e ajustes de tela.
// Só liga em aparelho de toque (ou com ?touch=1 na URL, para testar no PC).
//   joystick (esquerda)  → WASD; empurrado até a borda = correr (SHIFT). Nasce onde o
//                          dedo encostar na metade esquerda (não precisa achar o círculo)
//   CHUTAR (segurar)     → carrega o chute; solta = chuta no gol (o joystick escolhe o canto)
//   PASSE                → passe para o companheiro na direção do joystick (sem bola: pede a bola)
//   DRIBLE / CARRINHO / CORRER (trava a corrida) / FLUXO / QUÍMICA / skills 1–6 (+V) / ⏸
// Deitado: campo na tela toda e controles por cima. Em pé: placar em cima, campo no meio
// e os controles numa faixa só deles embaixo (o dedo não tampa o campo).
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
      <button class="tc-btn tc-shoot" data-act="shoot"><b>CHUTAR</b><small>segure</small><i class="tc-charge"></i></button>
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
    <button class="tc-pause" data-act="pause">⏸</button>`;
  overlay.appendChild(root);

  const zone = root.querySelector('.tc-zone');
  const stick = root.querySelector('.tc-stick');
  const knob = root.querySelector('.tc-knob');
  const chargeBar = root.querySelector('.tc-charge');
  const vec = { x: 0, y: 0, mag: 0 };
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
    keys['shift'] = (sprintLock && on) || vec.mag > 0.92;
    knob.style.transform = `translate(${vec.x * 42}px, ${vec.y * 42}px)`;
  };
  const stickMove = (e) => {
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2);
    let dy = (e.clientY - cy) / (r.height / 2);
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
    const zr = zone.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    const half = stick.offsetWidth / 2;
    const cx = Math.max(zr.left + half, Math.min(zr.right - half, e.clientX));
    const cy = Math.max(zr.top + half, Math.min(zr.bottom - half - 6, e.clientY));
    stick.style.left = `${cx - half - rr.left}px`;
    stick.style.top = `${cy - half - rr.top}px`;
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
    if (!ME.mouse.down) return;
    ME.mouse.down = false;
    if (canAct()) {
      aimGoal();
      ME.shootTowardMouse(ME.mouse.charge);
    }
    ME.mouse.charge = 0;
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
    } else if (sprintLock) {
      sprintLock = false;
      root.querySelector('.tc-sprint').classList.remove('lock');
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // ---------------------------------------------------------------- tela cheia
  // Ao começar a partida: tela cheia (no Android). Joga em pé ou deitado, do jeito que o
  // celular estiver. Sem suporte: só segue.
  const origStart = ME.startMatch.bind(ME);
  ME.startMatch = function (...args) {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
      }
    } catch (e) {
      /* sem tela cheia */
    }
    return origStart(...args);
  };
  const origTrain = ME.startTrainingMinigame?.bind(ME);
  if (origTrain) {
    ME.startTrainingMinigame = function (...args) {
      try {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
      } catch (e) {
        /* sem tela cheia */
      }
      return origTrain(...args);
    };
  }
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
  // escondia a parte de baixo da partida (controles e campo ficavam "para baixo").
  // Em pé, o campo fica com o que sobra entre o placar e a faixa dos controles
  // (entre 62% e 105% da largura da tela, para o campo não ficar fino nem achatado).
  const hud = overlay.querySelector('.fullscreen-hud-top');
  const portrait = window.matchMedia('(orientation: portrait)');
  const layout = () => {
    const appH = window.innerHeight;
    document.documentElement.style.setProperty('--app-h', `${appH}px`);
    if (!portrait.matches) return;
    const w = window.innerWidth;
    const hudH = hud ? hud.offsetHeight : 0;
    const panelH = 280 + (parseFloat(getComputedStyle(root).paddingBottom) || 0);
    const campoH = Math.round(Math.max(w * 0.62, Math.min(w * 1.05, appH - hudH - panelH)));
    overlay.style.setProperty('--hud-h', `${hudH}px`);
    overlay.style.setProperty('--campo-h', `${campoH}px`);
  };
  layout();
  // O motor mede o campo para desenhar: antes, arruma o tamanho das caixas
  const origResize = ME.resizeCanvasToFullscreen.bind(ME);
  ME.resizeCanvasToFullscreen = function (...args) {
    layout();
    return origResize(...args);
  };
  // Girou o celular: o campo acompanha (alguns celulares só dão o tamanho novo depois)
  window.addEventListener('orientationchange', () => setTimeout(() => (ME.active ? ME.resizeCanvasToFullscreen() : layout()), 300));
  window.addEventListener('resize', () => !ME.active && layout());
})();
