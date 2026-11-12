// ============================================================================
// ui_time.js — visual "cutscene" das abas TREINOS, CONQUISTAS e OBJETIVOS
// (mesma linguagem da aba ATRIBUTOS: navy escuro, painéis de cantos cortados com
// borda neon, tipografia itálica pesada, linhas de velocidade e granulação).
// Sobrescreve App.renderTrainingTab e App.renderAchievementsAndObjectives mantendo
// os mesmos dados, handlers (App.executeTraining) e ids (#training-drills-grid,
// #achievements-grid, #objectives-grid). Estilos em css/ui_time.css.
// ============================================================================
(function () {
  const App = window.App;
  if (!App) return;

  const BOLT = '<svg class="tm-bolt" viewBox="0 0 10 16" aria-hidden="true"><path d="M6.4 0 0.8 9.2h3.6L3.2 16 9.2 6.4H5.6z"/></svg>';
  const LOCK = '<svg viewBox="0 0 12 14" aria-hidden="true"><path d="M3 6V4a3 3 0 0 1 6 0v2h1.2c.4 0 .8.4.8.8v6.4c0 .4-.4.8-.8.8H1.8c-.4 0-.8-.4-.8-.8V6.8c0-.4.4-.8.8-.8zm1.6 0h2.8V4a1.4 1.4 0 0 0-2.8 0z"/></svg>';
  const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.2 11.6 2.4 7.8 1 9.2l5.2 5.2L15 5.6l-1.4-1.4z"/></svg>';

  const CAT_COLORS = { 'FÍSICO': '#00f5d4', 'TÉCNICA': '#3b82f6', 'MENTAL': '#a78bfa', 'SINERGIA': '#f472b6' };
  const catColor = (c) => CAT_COLORS[String(c || '').toUpperCase()] || '#00f5d4';
  const pad2 = (n) => String(n).padStart(2, '0');

  // Rótulo e cor de cada atributo (mesmas categorias/cores da aba ATRIBUTOS)
  const statInfo = (key) => {
    for (const cat of App.ATTR_CATEGORIES || []) {
      const it = cat.items.find((x) => x.key === key);
      if (it) return { label: it.label, color: key === 'ego' ? '#ef4444' : cat.color };
    }
    return { label: key, color: '#00f5d4' };
  };

  // Entrada ao abrir a aba: classe temporária (animações rodam UMA vez)
  const playIntro = (el, cls) => {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    clearTimeout(el._tmIntroT);
    el._tmIntroT = setTimeout(() => el.classList.remove(cls), 1600);
  };

  const findMentors = (mentorStr) => {
    const chars = window.BLUE_LOCK_CHARACTERS || [];
    return String(mentorStr || '')
      .split('&')
      .map((n) => n.trim().toLowerCase())
      .map((n) => chars.find((c) => c.name.toLowerCase() === n) || chars.find((c) => c.name.toLowerCase().split(' ').includes(n)))
      .filter(Boolean);
  };

  // ==========================================================================
  // ARTE DOS TREINOS (pixel art): o lugar do treino (academia do prédio ou o campo) e
  // VOCÊ fazendo o exercício, desenhados numa tela pequena e ampliados sem suavizar
  // (o mesmo boneco de 72 px do jogo, nunca esticado por número quebrado)
  // ==========================================================================
  function playerLook(app) {
    const pr = app.state.profile;
    return {
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
  }

  // boneco de pé na caixa de 72 px: pé no chão em (x, footY)
  function drawSprite(g, look, x, footY, opts) {
    const PR = window.PixelRenderer;
    if (!PR || !look) return;
    g.save();
    g.translate(Math.round(x - 36), Math.round(footY - 62));
    PR.drawCharacterSprite(g, look, 72, 72, opts);
    g.restore();
  }

  function paintDrillArt(app, cv, dr, col, idx) {
    const W = cv.clientWidth | 0;
    const H = cv.clientHeight | 0;
    if (W < 4 || H < 4) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pr = app.state.profile;
    const key = [W, H, dpr, dr.id, pr.hairStyle, pr.hairColor, pr.hairSecondary, pr.eyeColor, pr.eyeStyle, pr.skinColor, pr.number, (app.state.equippedAccessories || []).join(',')].join('|');
    if (cv._tmKey === key) return;
    cv._tmKey = key;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    // 1 pixel da arte = px pixels do canvas (a altura fica perto de 190 pixels da arte)
    const px = Math.max(1, Math.round(cv.height / 190));
    const vw = Math.ceil(cv.width / px);
    const vh = Math.ceil(cv.height / px);
    const s = document.createElement('canvas');
    s.width = vw;
    s.height = vh;
    const g = s.getContext('2d');
    g.imageSmoothingEnabled = false;
    const R = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };
    // elipse no chão em pixel (anéis dos treinos)
    const oval = (cx, cy, rx, ry, c, fill) => {
      for (let y = -ry; y <= ry; y++) {
        const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
        if (fill) R(cx - w, cy + y, w * 2 + 1, 1, c);
        else {
          R(cx - w, cy + y, 1, 1, c);
          R(cx + w, cy + y, 1, 1, c);
        }
      }
      if (!fill) {
        R(cx - Math.round(rx * 0.5), cy - ry, Math.round(rx) + 1, 1, c);
        R(cx - Math.round(rx * 0.5), cy + ry, Math.round(rx) + 1, 1, c);
      }
    };
    const dots = (x0, y0, x1, y1, c) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 3));
      for (let i = 0; i <= n; i += 2) R(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, 2, 1, c);
    };
    const ball = (x, y) => {
      R(x - 2, y - 3, 4, 6, '#e2e8f0');
      R(x - 3, y - 2, 6, 4, '#e2e8f0');
      R(x - 1, y - 1, 2, 2, '#1e293b');
      R(x - 3, y + 1, 6, 1, '#94a3b8');
    };
    const look = playerLook(app);
    const acc = app.state.equippedAccessories || [];
    const mentors = findMentors(dr.mentor);
    const GT = window.GymTraining;
    const fy = Math.round(vh * 0.8);
    const cx = Math.round(vw / 2);
    const wide = vw >= 200;

    if (dr.place === 'academia') {
      // ---- academia: parede com espelhos, faixa neon, piso de borracha
      R(0, 0, vw, fy, '#0b1630');
      for (let x = 4; x < vw; x += 34) {
        R(x, 12, 28, fy - 40, '#12244a');
        R(x + 1, 13, 26, fy - 42, '#162c58');
        for (let k = 0; k < 3; k++) R(x + 4 + k * 7, 16 + k * 9, 2, 22, 'rgba(148, 197, 255, 0.10)');
      }
      R(0, fy - 24, vw, 2, '#22d3ee');
      R(0, fy - 22, vw, 1, '#0e7490');
      R(0, fy, vw, vh - fy, '#0f172a');
      for (let x = 0; x < vw; x += 14) R(x, fy, 1, vh - fy, '#0b1120');
      R(0, fy, vw, 1, '#334155');
      // rack de halteres coloridos no fundo
      const rx = wide ? vw - 70 : 6;
      R(rx, fy - 44, 60, 30, '#111827');
      for (let r = 0; r < 3; r++) {
        R(rx, fy - 36 + r * 9, 60, 1, '#4b5563');
        for (let i = 0; i < 6; i++) {
          const c = ['#ef4444', '#3b82f6', '#22c55e', '#facc15'][(i + r) % 4];
          R(rx + 3 + i * 10, fy - 42 + r * 9, 2, 5, c);
          R(rx + 5 + i * 10, fy - 40 + r * 9, 3, 1, '#9ca3af');
          R(rx + 8 + i * 10, fy - 42 + r * 9, 2, 5, c);
        }
      }
      if (dr.mode === 'bench') {
        // banco do supino (de lado) e você deitado empurrando a barra
        const top = fy - 16;
        R(cx - 30, top, 60, 4, '#991b1b');
        R(cx - 30, top, 60, 1, '#ef4444');
        R(cx - 26, top + 4, 5, fy - top - 4, '#1f2937');
        R(cx + 21, top + 4, 5, fy - top - 4, '#1f2937');
        R(cx - 34, top - 26, 3, fy - top + 26, '#64748b');
        if (wide && mentors[0]) drawSprite(g, mentors[0], cx - 58, fy, { view: 'side', left: false, animState: 'idle', frame: 4 });
        if (GT && GT.paintPose) GT.paintPose(g, look, 'bench', 9, cx - 36 - 4, top - 62);
      } else {
        // barra fixa: montantes, a barra e você pendurado com o queixo lá em cima
        const barY = fy - 66;
        R(cx - 34, barY - 6, 4, fy - barY + 6, '#334155');
        R(cx + 30, barY - 6, 4, fy - barY + 6, '#334155');
        R(cx - 34, barY - 6, 68, 3, '#1e293b');
        for (let y = fy - 10; y < fy - 4; y += 2) {
          R(cx - 34, y, 4, 1, '#facc15');
          R(cx + 30, y, 4, 1, '#facc15');
        }
        if (wide && mentors[0]) drawSprite(g, mentors[0], cx + 64, fy, { view: 'side', left: true, animState: 'idle', frame: 4 });
        if (GT && GT.paintPose) {
          const a = GT.handsAt(look, 'pullup', 10);
          const hy = a && a.handL ? (a.handL[1] + a.handR[1]) / 2 : 15;
          GT.paintPose(g, look, 'pullup', 10, cx - 36, Math.round(barY + 1 - hy * 2));
        }
        R(cx - 30, barY, 60, 2, '#cbd5e1');
        R(cx - 30, barY, 60, 1, '#f8fafc');
      }
    } else {
      // ---- campo à noite: arquibancada escura, refletores e o gramado em faixas
      R(0, 0, vw, fy - 40, '#0a1733');
      for (let x = 0; x < vw; x += 6) R(x, fy - 58 + ((x * 7) % 5), 3, 2, 'rgba(148, 163, 184, 0.18)');
      for (let i = 0; i < 4; i++) {
        const lx = Math.round(((i + 0.5) * vw) / 4);
        R(lx - 6, 8, 12, 3, '#fefce8');
        R(lx - 6, 11, 12, 1, '#a3a3a3');
      }
      for (let y = fy - 40, k = 0; y < vh; y += 10, k++) R(0, y, vw, 10, k % 2 ? '#166534' : '#15803d');
      R(0, fy - 40, vw, 1, '#4ade80');
      if (dr.mode === 'gauntlet') {
        // você driblando e os três robôs do bote em fila (o da frente armando, anel vermelho)
        const step = Math.max(26, Math.round((vw - 70) / 3.2));
        const bots = [0, 1, 2].map((i) => [Math.round(vw - 18 - (2 - i) * step * 0.85), fy - 22 + i * 8]);
        bots.slice().reverse().forEach(([x, y], j) => {
          const first = j === 2;
          if (first) {
            oval(x, y, 15, 5, 'rgba(239, 68, 68, 0.25)', true);
            oval(x, y, 15, 5, '#ef4444');
            oval(x, y, 8, 3, '#f8fafc');
          }
          const robot = { skinColor: '#1e3a8a', hairColor: '#00f5d4', hairSecondary: '#38bdf8', eyeColor: '#00f5d4', hairStyle: 'short_sharp', jerseyPrimary: '#090d16', jerseySecondary: '#ef4444', number: 0 };
          drawSprite(g, robot, x, y, { view: 'side', left: true, animState: first ? 'windup' : 'idle', frame: 0 });
        });
        const youX = Math.max(26, bots[0][0] - step * 0.95);
        drawSprite(g, look, youX, fy - 8, { view: 'side', left: false, animState: 'run', frame: 6, accessories: acc, shirtNumber: look.number });
        ball(youX + 12, fy - 10);
      } else {
        // rondo: você com a bola, o parceiro livre (linha verde) e o marcado (robô no meio)
        const m = mentors.length ? mentors : [];
        const lx = Math.round(vw * 0.22);
        const rx = Math.round(vw * 0.8);
        const top = fy - 30;
        const freeX = rx;
        dots(cx + 6, fy - 12, freeX - 6, top + 2, '#4ade80');
        oval(freeX, top + 1, 12, 4, '#4ade80');
        if (m[1]) drawSprite(g, m[1], freeX, top, { view: 'side', left: true, animState: 'call_pass', frame: 0 });
        oval(lx, top + 1, 10, 3, '#ef4444');
        if (m[0]) drawSprite(g, m[0], lx, top, { view: 'side', left: false, animState: 'idle', frame: 4 });
        const robot = { skinColor: '#1e3a8a', hairColor: '#00f5d4', hairSecondary: '#38bdf8', eyeColor: '#00f5d4', hairStyle: 'short_sharp', jerseyPrimary: '#090d16', jerseySecondary: '#f97316', number: 0 };
        drawSprite(g, robot, Math.round((lx + cx) / 2), fy - 20, { view: 'side', left: true, animState: 'idle', frame: 0 });
        drawSprite(g, look, cx, fy - 4, { view: 'front', left: false, animState: 'idle', frame: 4, accessories: acc, shirtNumber: look.number });
        ball(cx + 10, fy - 5);
      }
    }
    // vinheta (escurece as bordas de cima e de baixo)
    for (let i = 0; i < 6; i++) {
      R(0, i, vw, 1, `rgba(3, 6, 14, ${0.45 - i * 0.07})`);
      R(0, vh - 1 - i, vw, 1, `rgba(3, 6, 14, ${0.55 - i * 0.08})`);
    }
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(s, 0, 0, vw * px, vh * px);
  }

  // ==========================================================================
  // CONQUISTAS: ícone e "raridade" de cada uma
  // ==========================================================================
  const ACH_GLYPH = {
    ach_prologue: '⚽', ach_first_spin: '🎰', ach_yukimiya_style: '⚡', ach_chem_shidou: '💥', ach_u20_win: '🗾',
    ach_nel_unlock: '⚔️', ach_england_u20: '🦁', ach_four_egos: '🌍', ach_first_goal: '⚽', ach_goals_10: '🥅',
    ach_goals_25: '🐺', ach_goals_50: '🔥', ach_hat_trick: '🎩', ach_angle_5: '🎯', ach_long_3: '💣',
    ach_dribble_30: '🌀', ach_steal_20: '🛡️', ach_wins_10: '🏅', ach_rating_9: '⭐', ach_legendary: '💎',
    ach_world_class_pull: '👑', ach_lucky: '🍀', ach_rank_s: 'T:S', ach_rank_wc: 'T:WC', ach_nel_champion: '🏆',
    ach_top23: 'T:23', ach_most_valuable: '💰', ach_monster: '👹', ach_secrets: '🥚', ach_pro_champion: '🏆', ach_ballon_dor: '🥇',
    ach_world_cup: '🏆'
  };
  const achTier = (a) =>
    a.rewardCoins >= 800 ? { name: 'LENDÁRIA', color: '#00f5d4' }
      : a.rewardCoins >= 400 ? { name: 'OURO', color: '#facc15' }
      : a.rewardCoins >= 200 ? { name: 'PRATA', color: '#cbd5e1' }
      : { name: 'BRONZE', color: '#f59e0b' };

  // Barra segmentada inclinada (igual às barras dos ATRIBUTOS)
  const segBar = (cur, goal, cls = '') => {
    const pct = Math.max(0, Math.min(100, goal > 0 ? (cur / goal) * 100 : 0));
    return `<div class="tm-bar ${cls}"><div class="tm-bar-track"></div><div class="tm-bar-glow"><div class="tm-bar-seg"><div class="tm-bar-fill" style="width:${pct.toFixed(1)}%"></div></div></div></div>`;
  };

  // Objetivos da carreira (mesma lista de App.renderAchievementsAndObjectives)
  function objectiveList(app) {
    const done = (id) => app.state.completedChapters.includes(id);
    return [
      { icon: '⚽', title: 'Sobreviver à Final do Ensino Médio e entrar no Blue Lock', desc: 'Decida se passa para o seu amigo ou chuta no Prólogo. Libera a roleta de Arma e Fluxo.', ok: app.state.blueLockEntered },
      { icon: '🔒', title: 'Sobreviver à 1ª Seleção', desc: 'Vença o Time V do Nagi e do Reo com o Time Z.', ok: done('ch2_first_selection_v') },
      { icon: '🛡️', title: 'Passar pela 2ª e 3ª Seleção', desc: 'Encare os World Five e vença o Torneio de Trios.', ok: done('ch4b_trio_tournament') },
      { icon: '👑', title: 'Vencer a Sub-20 do Japão', desc: 'Salve o Blue Lock e libere a Liga Neo Egoísta, o 2º slot de Arma e Fluxo e o Metavision / Predator Eye.', ok: app.state.nelUnlocked },
      { icon: '🃏', title: 'Encarar o Wild Card', desc: 'O Kunigami volta da porta preta sem sorriso. Jogue contra o Coringa antes da NEL.', ok: done('ch5b_wild_card') },
      { icon: '💴', title: 'Sobreviver à Liga Neo Egoísta', desc: 'Jogue os 8 jogos da NEL e termine entre os 23 mais valiosos para ir à Copa.', ok: done('ch7_nel_ubers_pxg') },
      { icon: '🦁', title: 'Vencer a Inglaterra na Copa Sub-20', desc: 'Derrote Agi, Teddy Knight e Chris Prince.', ok: done('ch8_u20_england') },
      { icon: '🌍', title: '"4 EGOS": campeão da Copa do Mundo Sub-20', desc: 'Vença a França de Loki e Hugo na final.', ok: done('ch9_world_cup_final') },
      { icon: '🦊', title: 'Passar no teste do Fox', desc: 'Acorde o monstro e vire o jogo contra o Rin, o Kaiser, o Barou e o Shidou.', ok: done('ch10_fox_training') },
      { icon: '🥇', title: 'Disputar a Bola de Ouro', desc: 'Escolha uma proposta e jogue a temporada inteira da Liga Europeia.', ok: done('ch12_pro_season_2') },
      { icon: '🗾', title: 'Ganhar a vaga na seleção principal', desc: 'Seja convocado pelo Ego e vença os amistosos contra Portugal e Coreia do Sul.', ok: done('ch12b_wc_camp') },
      { icon: '🏆', title: 'Campeão da Copa do Mundo', desc: 'Passe da fase de grupos e vença os 5 jogos de mata-mata, até a França de Noel Noa.', ok: done('ch13_world_cup') },
      { icon: '🩸', title: 'O último duelo', desc: 'Vença o Rin Itoshi pelo número 1 do Blue Lock e receba a Bola de Ouro.', ok: done('ch14_rin_final') }
    ];
  }

  Object.assign(App, {
    // ========================================================================
    // ABA TREINOS: cartões de missão cinematográficos
    // ========================================================================
    renderTrainingTab() {
      const box = document.getElementById('training-drills-grid');
      if (!box) return;
      const max = window.TRAINING_ENERGY_MAX;
      const energy = this.state.trainingEnergy ?? max;
      const tired = energy <= 0;
      const sp = this.state.currencies.skillPoints;

      const pips = Array.from({ length: max }, (_, i) => `<i class="trn-pip ${i < energy ? 'on' : ''}" style="--i:${i}">${BOLT}</i>`).join('');

      const cards = window.TRAINING_DRILLS.map((dr, i) => {
        const col = catColor(dr.category);
        const gym = dr.place === 'academia';
        const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(dr.name);
        const main = m ? m[1] : dr.name;
        const sub = m ? m[2] : '';
        const desc = String(dr.desc)
          .replace(/^[^:]{0,40}:\s*/, '')
          .replace(/\[([A-ZÇÃÉ ]{1,12})\]/g, '<kbd>$1</kbd>')
          .replace(/\bWASD\b/, '<kbd>WASD</kbd>')
          .replace(/\bShift\b/, '<kbd>Shift</kbd>')
          .replace(/\bMouse\b/, '<kbd>Mouse</kbd>');
        const gains = Object.entries(dr.statGains)
          .map(([k, v]) => {
            const s = statInfo(k);
            return `<span class="trn-gain" style="--c:${s.color}"><b>+${v}</b><span>${s.label}</span></span>`;
          })
          .join('');
        const aff = dr.affinityGain ? `<span class="trn-gain" style="--c:#f472b6"><b>+${dr.affinityGain}%</b><span>Química</span></span>` : '';
        const rec = (this.state.trainingRecords || {})[dr.id];
        return `
          <article class="trn-card tm-frame" style="--cat:${col}; --i:${i}">
            <div class="trn-art">
              <div class="trn-art-edge" aria-hidden="true"></div>
              <div class="trn-art-in">
                <canvas class="trn-cv" data-drill="${dr.id}" data-idx="${i}"></canvas>
                <span class="trn-num" aria-hidden="true">${pad2(i + 1)}</span>
                <span class="trn-cat">${dr.category}</span>
                <span class="trn-place ${gym ? 'is-gym' : ''}">${gym ? 'ACADEMIA DO PRÉDIO' : 'CAMPO DE TREINO'}</span>
              </div>
            </div>
            <div class="trn-body">
              <div class="trn-kicker"><span>MISSÃO ${pad2(i + 1)}</span><i></i>${gym ? 'NO APARELHO DA ACADEMIA' : 'MINIGAME NO CAMPO'}</div>
              <h3 class="trn-name">${main}</h3>
              ${sub ? `<div class="trn-sub">${sub}</div>` : ''}
              <div class="trn-mentor"><small>MENTORES</small><b>${dr.mentor}</b></div>
              <p class="trn-desc">${desc}</p>
              <div class="trn-meta">
                <span>⏱ <b>${dr.time || 45}s</b></span>
                <span>META <b>${dr.target || 5}</b> ${dr.unit || 'alvos'}</span>
                ${rec
                  ? `<span class="trn-rec" style="--rk:${(App.TRAINING_RANKS[rec.rank] || {}).color || '#94a3b8'}">🏅 RECORDE <b>${rec.rank}</b> ${rec.best}/${rec.target}</span>`
                  : '<span class="trn-rec none">🏅 SEM RECORDE</span>'}
              </div>
              <div class="tm-cap trn-rw-cap">RECOMPENSAS</div>
              <div class="trn-gains">${gains}${aff}</div>
              <div class="trn-foot">
                <div class="trn-loot">
                  <span class="trn-loot-sp"><b>+${dr.spGain}</b><small>SP</small></span>
                  <span class="trn-loot-coin"><b>+${dr.coinGain}</b><small>EGOCOINS</small></span>
                </div>
                <button class="trn-go ${tired ? 'disabled' : ''}" onclick="App.executeTraining('${dr.id}')" title="${tired ? 'Sem energia: jogue uma partida da HISTÓRIA para recarregar' : gym ? 'Vai até o aparelho na academia (gasta 1 de energia)' : 'Treinar no campo (gasta 1 de energia)'}">
                  <span>${tired ? 'SEM ENERGIA' : 'TREINAR ▶'}</span>${tired ? '' : `<em>−1 ${BOLT}</em>`}
                </button>
              </div>
            </div>
          </article>`;
      }).join('');

      const html = `
        <div class="trn-root tm-root">
          <div class="trn-hero tm-frame tm-grain ${tired ? 'is-empty' : ''}">
            <div class="tm-speed" aria-hidden="true"></div>
            <div class="tm-letterbox"><span>BLUE LOCK <b>TRAINING CENTRE</b></span><span>TRAINING LAB</span></div>
            <div class="trn-hero-in">
              <div class="trn-hero-title">
                <div class="tm-cap">CENTRO DE</div>
                <h2 class="tm-title">TREINAMENTO</h2>
                <p class="tm-lead">Dois treinos são na ACADEMIA do prédio (supino e barra fixa: você vai até o aparelho e treina ali) e dois no CAMPO. No fim sai uma nota: <b>S</b> 150% · <b>A</b> 125% · <b>B</b> 100% · <b>C</b> 50% dos atributos, SP e EgoCoins.</p>
              </div>
              <div class="trn-energy ${tired ? 'empty' : ''}">
                <div class="tm-cap">ENERGIA DE TREINO</div>
                <div class="trn-energy-row">
                  <div class="trn-pips">${pips}</div>
                  <div class="trn-energy-num"><b>${energy}</b><span>/${max}</span></div>
                </div>
                <div class="trn-energy-msg"><span class="trn-status">${tired ? 'ESGOTADO' : 'PRONTO'}</span><span>${tired ? 'Você está esgotado. Jogue uma partida da HISTÓRIA para recarregar.' : `Cada treino gasta 1. Jogar uma partida enche de novo (até ${max}).`}</span></div>
              </div>
              <button class="trn-sp" onclick="App.switchTab('ESTATISTICAS')" title="Distribuir SP na aba ATRIBUTOS">
                <span class="tm-cap">SP DISPONÍVEL</span>
                <span class="trn-sp-big"><b>${sp}</b><small>SP</small></span>
                <span class="trn-sp-go">DISTRIBUIR ▶</span>
              </button>
            </div>
          </div>
          <div class="trn-grid">${cards}</div>
        </div>`;

      const visible = box.offsetParent !== null;
      const intro = visible && !this._trnWasVisible;
      this._trnWasVisible = visible;
      const prevEnergy = this._trnPrevEnergy;
      this._trnPrevEnergy = energy;
      if (box._tmHtml !== html) {
        box.innerHTML = html;
        box._tmHtml = html;
      }
      const root = box.firstElementChild;
      if (intro) playIntro(root, 'tm-intro');
      // energia gasta: o raio que apagou "descarrega" uma vez
      if (prevEnergy != null && energy < prevEnergy && root) {
        const pip = root.querySelectorAll('.trn-pip')[energy];
        if (pip) {
          pip.classList.add('spent');
          setTimeout(() => pip.classList.remove('spent'), 900);
        }
      }
      if (visible) this.drawTrainingArt();
    },

    drawTrainingArt() {
      const box = document.getElementById('training-drills-grid');
      if (!box || box.offsetParent === null) return;
      box.querySelectorAll('canvas.trn-cv').forEach((cv) => {
        const dr = window.TRAINING_DRILLS.find((d) => d.id === cv.dataset.drill);
        if (dr) paintDrillArt(this, cv, dr, catColor(dr.category), +cv.dataset.idx || 0);
      });
    },

    // ========================================================================
    // ABAS CONQUISTAS (sala de troféus) e OBJETIVOS (rota da carreira)
    // ========================================================================
    renderAchievementsAndObjectives() {
      this.renderTrophyRoom();
      this.renderObjectiveRoute();
    },

    renderTrophyRoom() {
      const achBox = document.getElementById('achievements-grid');
      if (!achBox) return;
      const all = window.ACHIEVEMENTS_DB;
      const unlockedIds = this.state.unlockedAchievements;
      const got = all.filter((a) => unlockedIds.includes(a.id));
      const earned = got.reduce((s, a) => s + a.rewardCoins, 0);
      const spinsEarned = got.reduce((s, a) => s + (a.rewardSpins || 0), 0);
      const c = this.state.career;
      const played = c.wins + c.draws + c.losses;
      const pctAll = all.length ? Math.round((got.length / all.length) * 100) : 0;
      // Desbloqueadas primeiro; entre as bloqueadas, as mais perto de sair primeiro
      const pct = (a) => {
        if (!a.progress) return 0;
        const [cur, goal] = a.progress(this.state, this);
        return cur / goal;
      };
      const sorted = all.slice().sort((a, b) => {
        const ua = unlockedIds.includes(a.id);
        const ub = unlockedIds.includes(b.id);
        if (ua !== ub) return ua ? -1 : 1;
        return pct(b) - pct(a);
      });
      const prevSet = this._acbPrev;
      this._acbPrev = unlockedIds.slice();

      const stat = (label, value, cls = '') => `<div class="acb-cs ${cls}"><b>${value}</b><span>${label}</span></div>`;
      const card = (ach, i) => {
        const unlocked = unlockedIds.includes(ach.id);
        const prog = !unlocked && ach.progress ? ach.progress(this.state, this) : null;
        const tier = achTier(ach);
        const g = ACH_GLYPH[ach.id] || '🏆';
        const glyph = g.startsWith('T:') ? `<span class="acb-glyph txt">${g.slice(2)}</span>` : `<span class="acb-glyph">${g}</span>`;
        const isNew = prevSet && unlocked && !prevSet.includes(ach.id);
        return `
          <div class="acb-card ${unlocked ? 'unlocked' : 'locked'} ${isNew ? 'acb-new' : ''}" style="--tier:${tier.color}; --i:${Math.min(i, 14)}">
            <div class="acb-emb">${glyph}${unlocked ? '' : `<i class="acb-lock">${LOCK}</i>`}</div>
            <div class="acb-info">
              <div class="acb-top"><span class="acb-tier">${tier.name}</span>${unlocked ? `<span class="acb-stamp">${CHECK}CONQUISTADA</span>` : ''}</div>
              <h4>${ach.title}</h4>
              <p>${ach.desc}</p>
              ${prog ? `<div class="acb-prog">${segBar(prog[0], prog[1])}<span>${Math.min(prog[0], prog[1])} / ${prog[1]}</span></div>` : ''}
              <div class="acb-rw"><span><b>+${ach.rewardCoins}</b> EGOCOINS</span>${ach.rewardSpins ? `<span><b>+${ach.rewardSpins}</b> GIRO${ach.rewardSpins > 1 ? 'S' : ''}</span>` : ''}</div>
            </div>
          </div>`;
      };
      const unl = sorted.filter((a) => unlockedIds.includes(a.id));
      const lck = sorted.filter((a) => !unlockedIds.includes(a.id));
      const html = `
        <div class="acb-root tm-root">
          <div class="acb-hero tm-frame tm-grain">
            <div class="tm-speed" aria-hidden="true"></div>
            <div class="tm-letterbox"><span>EGOIST <b>TROPHY ROOM</b></span><span>BLUE LOCK</span></div>
            <div class="acb-hero-in">
              <div class="acb-count-block">
                <div class="tm-cap">SALA DE TROFÉUS</div>
                <h2 class="tm-title">CONQUISTAS</h2>
                <div class="acb-count"><b>${got.length}</b><span>/ ${all.length}</span></div>
                <div class="acb-summary">🏆 <b>${got.length} de ${all.length}</b> conquistas • <b>${earned}</b> EgoCoins ganhos com elas</div>
              </div>
              <div class="acb-ring" style="--p:${pctAll}">
                <div class="acb-ring-in"><b>${pctAll}<small>%</small></b><span>COMPLETO</span></div>
              </div>
              <div class="acb-career">
                <div class="acb-career-head"><span class="tm-tag">SUA CARREIRA</span><span class="acb-loot"><b>+${earned}</b> EGOCOINS · <b>+${spinsEarned}</b> GIROS GANHOS</span></div>
                <div class="acb-record">
                  <div class="acb-rec-main"><b>${played}</b><span>PARTIDAS</span></div>
                  <div class="acb-rec w"><b>${c.wins}</b><span>VITÓRIAS</span></div>
                  <div class="acb-rec d"><b>${c.draws}</b><span>EMPATES</span></div>
                  <div class="acb-rec l"><b>${c.losses}</b><span>DERROTAS</span></div>
                </div>
                <div class="acb-cs-grid">
                  ${stat('Seus gols', c.myGoals, 'hi')}
                  ${stat('No ângulo', c.angleGoals)}
                  ${stat('De longe', c.longGoals)}
                  ${stat('Hat-tricks', c.hatTricks)}
                  ${stat('Dribles', c.dribbles)}
                  ${stat('Desarmes', c.steals)}
                  ${stat('Melhor nota', c.bestRating ? c.bestRating.toFixed(1) : '—', 'amber')}
                </div>
              </div>
            </div>
          </div>
          ${unl.length ? `<div class="tm-section"><span>DESBLOQUEADAS</span><i></i><b>${unl.length}</b></div><div class="acb-grid">${unl.map(card).join('')}</div>` : ''}
          <div class="tm-section"><span>A CONQUISTAR</span><i></i><b>${lck.length}</b></div>
          <div class="acb-grid">${lck.map((a, i) => card(a, i + unl.length)).join('')}</div>
        </div>`;

      const visible = achBox.offsetParent !== null;
      const intro = visible && !this._acbWasVisible;
      this._acbWasVisible = visible;
      if (achBox._tmHtml !== html) {
        achBox.innerHTML = html;
        achBox._tmHtml = html;
      }
      if (intro) playIntro(achBox.firstElementChild, 'tm-intro');
    },

    renderObjectiveRoute() {
      const objBox = document.getElementById('objectives-grid');
      if (!objBox) return;
      const ovr = this.calculateOVR();
      const rank = this.getRankLetter(ovr);
      const objectives = objectiveList(this);
      const next = objectives.findIndex((o) => !o.ok);
      const doneCount = objectives.filter((o) => o.ok).length;
      const cur = next >= 0 ? objectives[next] : null;
      const wc = ovr >= 95;

      const mini = objectives.map((o, i) => `<i class="${o.ok ? 'done' : i === next ? 'current' : ''}"></i>`).join('');
      const nodes = objectives.map((o, i) => {
        const st = o.ok ? 'done' : i === next ? 'current' : 'locked';
        const side = i % 2 ? 'r' : 'l';
        const stepLabel = o.ok ? 'CONCLUÍDA' : i === next ? 'AGORA' : 'BLOQUEADA';
        return `
          <div class="obj-node ${st} side-${side}" style="grid-row:${i + 1} / span 2; --i:${i}">
            <div class="obj-card">
              <div class="obj-ico">${o.ok ? `<span class="obj-check">${CHECK}</span>` : `<span class="obj-emoji">${o.icon}</span>`}</div>
              <div class="obj-txt">
                <div class="obj-step"><span>ETAPA ${pad2(i + 1)}</span><em>${i === next ? '▶ ' : ''}${stepLabel}</em></div>
                <h4>${o.title}</h4>
                <p>${o.desc}</p>
              </div>
            </div>
            <div class="obj-dot"><span>${pad2(i + 1)}</span></div>
          </div>`;
      }).join('');

      const html = `
        <div class="obj-root tm-root">
          <div class="obj-hero tm-frame tm-grain">
            <div class="tm-speed" aria-hidden="true"></div>
            <div class="tm-letterbox"><span>EGOIST <b>ROUTE</b></span><span>BLUE LOCK → MUNDO</span></div>
            <div class="obj-hero-in">
              <div class="obj-hero-title">
                <div class="tm-cap">ROTA DO EGOÍSTA</div>
                <h2 class="tm-title">OBJETIVOS</h2>
                <div class="obj-count"><b>${pad2(doneCount)}</b><span>/ ${pad2(objectives.length)} ETAPAS</span></div>
                <div class="obj-mini">${mini}</div>
              </div>
              <div class="obj-next ${cur ? '' : 'all-done'}">
                <div class="obj-next-head"><span class="tm-tag">${cur ? `PRÓXIMO OBJETIVO · ETAPA ${pad2(next + 1)}` : 'ROTA COMPLETA'}</span></div>
                <div class="obj-next-body">
                  <div class="obj-next-ico">${cur ? cur.icon : '🏆'}</div>
                  <div>
                    <h3>${cur ? cur.title : 'Lenda do futebol'}</h3>
                    <p>${cur ? cur.desc : 'Você cumpriu todas as etapas da carreira. O monstro ainda está com fome.'}</p>
                  </div>
                </div>
              </div>
              <div class="obj-side ${wc ? 'done' : ''}" style="--rank:${rank.color}">
                <div class="obj-side-head"><span class="tm-cap">OBJETIVO PARALELO</span>${wc ? `<span class="obj-side-ok">${CHECK}</span>` : ''}</div>
                <div class="obj-side-title">VIRAR <b>WORLD CLASS</b></div>
                <div class="obj-side-row">
                  <div class="obj-side-ovr"><b>${ovr}</b><span>/ 95 OVR</span></div>
                  <div class="obj-side-rank"><span>${rank.letter}</span></div>
                </div>
                ${segBar(ovr, 95, 'obj-wc-bar')}
                <p>Treine, distribua SP na aba ATRIBUTOS e gire Armas e Fluxos melhores. Hoje: OVR ${ovr} (${rank.label}).</p>
              </div>
            </div>
          </div>
          <div class="tm-section"><span>MAPA DA CARREIRA</span><i></i><b>${doneCount}/${objectives.length}</b></div>
          <div class="obj-route">
            <div class="obj-spine" aria-hidden="true"><i class="obj-spine-fill"></i></div>
            ${nodes}
          </div>
        </div>`;

      const visible = objBox.offsetParent !== null;
      const intro = visible && !this._objWasVisible;
      this._objWasVisible = visible;
      if (objBox._tmHtml !== html) {
        objBox.innerHTML = html;
        objBox._tmHtml = html;
        objBox._tmSpineW = 0;
      }
      if (intro) playIntro(objBox.firstElementChild, 'tm-intro');
      if (visible) this.layoutObjectiveSpine();
    },

    // Parte acesa da linha da rota: do começo até o ponto da etapa atual
    layoutObjectiveSpine() {
      const objBox = document.getElementById('objectives-grid');
      if (!objBox || objBox.offsetParent === null) return;
      const route = objBox.querySelector('.obj-route');
      const fill = objBox.querySelector('.obj-spine-fill');
      if (!route || !fill) return;
      const w = route.clientWidth;
      if (objBox._tmSpineW === w) return;
      objBox._tmSpineW = w;
      const rr = route.getBoundingClientRect();
      const target = route.querySelector('.obj-node.current .obj-dot') || (route.querySelector('.obj-node.locked') ? null : [...route.querySelectorAll('.obj-node.done .obj-dot')].pop());
      const firstDot = route.querySelector('.obj-dot');
      if (!firstDot) return;
      const top0 = firstDot.getBoundingClientRect().top + firstDot.offsetHeight / 2 - rr.top;
      let h = 0;
      if (target) h = target.getBoundingClientRect().top + target.offsetHeight / 2 - rr.top - top0;
      fill.style.top = `${top0}px`;
      fill.style.height = `${Math.max(0, h)}px`;
      const spine = route.querySelector('.obj-spine');
      const lastDot = [...route.querySelectorAll('.obj-dot')].pop();
      if (spine && lastDot) {
        spine.style.top = `${top0}px`;
        spine.style.height = `${lastDot.getBoundingClientRect().top + lastDot.offsetHeight / 2 - rr.top - top0}px`;
        fill.style.top = '0px';
      }
    }
  });

  // Redesenha a arte/rota quando a janela muda de tamanho
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      try {
        App.drawTrainingArt();
        App.layoutObjectiveSpine();
      } catch (e) { /* aba fechada */ }
    }, 120);
  });
})();
