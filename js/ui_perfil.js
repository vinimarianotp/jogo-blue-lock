// ============================================================================
// ui_perfil — visual das abas PERFIL, EQUIPE e RELAÇÕES e da tela ✏️ PERSONALIZAR
// no mesmo estilo da aba ATRIBUTOS (navy escuro, painéis com cantos cortados,
// tipografia itálica 900, linhas de velocidade, granulação estática).
// Tudo que é CSS fica em css/ui_perfil.css (escopado em #tab-PROFILE, #tab-EQUIPE,
// #tab-RELACIONAMENTOS e #creator-screen). Aqui só trocamos a marcação: todos os
// ids, handlers e comportamentos das funções originais do app.js continuam iguais.
// ============================================================================
(function () {
  const A = window.App;
  if (!A) return;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c || '');
  const hexA = (c, a) => (isHex(c) ? c + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0') : `rgba(0,245,212,${a})`);
  const visible = (el) => !!el && el.offsetParent !== null;

  // Funções originais (mantidas para referência / fallback)
  const ORIG = {
    renderProfileTab: A.renderProfileTab,
    renderSquadAndRelationships: A.renderSquadAndRelationships,
    toggleViewportFacing: A.toggleViewportFacing,
    drawCreatorPreview: A.drawCreatorPreview,
    renderCreator: A.renderCreator
  };

  const SLOT_NAMES = { HEAD: 'CABEÇA', FACE: 'ROSTO', ARM: 'BRAÇO', WRIST: 'PULSO', HANDS: 'MÃOS', BACK: 'COSTAS' };
  const FILTERS = [['ALL', 'TODOS'], ['HEAD', 'CABEÇA'], ['FACE', 'ROSTO'], ['ARM', 'BRAÇO'], ['WRIST', 'PULSO'], ['HANDS', 'MÃOS'], ['BACK', 'COSTAS']];

  Object.assign(A, {
    // ------------------------------------------------------------------------
    // Utilidades visuais
    // ------------------------------------------------------------------------
    // "Raridade" da carta do personagem (moldura), a partir do OVR base dele
    prfRarity(c) {
      const T = window.RARITY_TIERS || {};
      const o = c.ovr || 85;
      const id = c.worldClass ? 'WORLD_CLASS' : o >= 95 ? 'MITICO' : o >= 91 ? 'LENDARIO' : o >= 87 ? 'EPICO' : o >= 83 ? 'RARO' : o >= 80 ? 'INCOMUM' : 'COMUM';
      const t = T[id] || {};
      return { id, name: id === 'WORLD_CLASS' ? 'WORLD CLASS' : (t.name || id).toUpperCase(), color: t.color || '#94a3b8' };
    },

    // Faixa de química (rótulo + cor do medidor)
    prfChemTier(aff, rival) {
      if (rival) return { label: 'RIVAL MORTAL', color: '#ef4444' };
      if (aff >= 90) return { label: 'ALMA GÊMEA', color: '#facc15' };
      if (aff >= 75) return { label: 'SINTONIA', color: '#00f5d4' };
      if (aff >= 55) return { label: 'PARCERIA', color: '#38bdf8' };
      if (aff >= 35) return { label: 'NEUTRO', color: '#94a3b8' };
      return { label: 'ATRITO', color: '#f97316' };
    },

    prfAffinity(c) {
      return this.isMortalRival(c.id) ? 0 : this.state.affinities[c.id] ?? 50;
    },

    // Medidor segmentado (mesmo desenho das barras da aba ATRIBUTOS)
    prfMeterHtml(pct, color, extraClass = '') {
      return `<div class="prf-meter ${extraClass}" style="--m:${color}"><div class="prf-meter-track"></div><div class="prf-meter-glow"><div class="prf-meter-seg"><div class="prf-meter-fill" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div></div></div>`;
    },

    // Boneco com brilho da aura e rim light (como a vitrine da aba ATRIBUTOS), desenhado uma vez.
    // s = tamanho do "pixel" da arte (múltiplo de 2,5 = pixels uniformes)
    prfDrawSprite(ctx, look, x0, y0, s, opts) {
      const PR = window.PixelRenderer;
      if (!PR) return;
      const box = 36 * s;
      const aura = opts.aura || '#00f5d4';
      const rim = Math.max(1, Math.round(s * 0.6));
      const o = Object.assign({ facing: 'front', frame: 1 }, opts.sprite || {});
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(x0, y0);
      if (opts.glow !== false) {
        ctx.save();
        ctx.shadowColor = aura;
        ctx.shadowBlur = Math.round(2.4 * s);
        ctx.globalAlpha = 0.8;
        PR.drawCharacterSprite(ctx, look, box, box, Object.assign({}, o, { tint: aura }));
        ctx.restore();
      }
      ctx.translate(-rim, 0);
      PR.drawCharacterSprite(ctx, look, box, box, Object.assign({}, o, { tint: aura }));
      ctx.translate(rim * 2, -Math.round(rim / 2));
      PR.drawCharacterSprite(ctx, look, box, box, Object.assign({}, o, { tint: opts.light || '#e8fffb' }));
      ctx.translate(-rim, Math.round(rim / 2));
      PR.drawCharacterSprite(ctx, look, box, box, o);
      ctx.restore();
    },

    prfPlayerLook() {
      const p = this.state.profile;
      return { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8', number: p.number };
    },

    // Entrada (uma vez) quando a aba acabou de aparecer
    prfIntro(key, root) {
      this._prfVis = this._prfVis || {};
      const vis = visible(root);
      const intro = vis && !this._prfVis[key];
      this._prfVis[key] = vis;
      if (!intro) return false;
      root.classList.remove('prf-intro');
      void root.offsetWidth;
      root.classList.add('prf-intro');
      clearTimeout(root._prfIntroT);
      root._prfIntroT = setTimeout(() => root.classList.remove('prf-intro'), 1400);
      return true;
    },

    // ========================================================================
    // ABA PERFIL
    // ========================================================================
    prfBuildProfile() {
      const sec = document.getElementById('tab-PROFILE');
      if (!sec || sec.dataset.prf === '1') return;
      const oldSel = document.getElementById('hair-style-select');
      // (todos os cabelos do criador; a lista antiga do index.html não tinha os novos)
      const hairOptions = (this.CREATOR_HAIR || []).map(([v, l]) => `<option value="${v}">${l}</option>`).join('') || (oldSel ? oldSel.innerHTML : '');
      sec.dataset.prf = '1';
      sec.innerHTML = `
      <div id="prf-root" class="prf-root">
        <!-- VITRINE: o seu jogador ao vivo (desenhado em App.prfDrawShowcase) -->
        <div class="prf-show prf-frame prf-grain">
          <div class="prf-show-slash" aria-hidden="true"></div>
          <div class="prf-show-wm" id="prf-show-wm" aria-hidden="true">11</div>
          <canvas id="prf-show-cv" class="prf-show-cv"></canvas>
          <canvas id="profile-viewport-canvas" width="240" height="270" hidden></canvas>
          <div class="prf-letterbox"><span>EGOIST <b>LOCKER</b></span><span>VESTIÁRIO</span></div>
          <div class="prf-show-top">
            <div class="prf-show-num"><span class="js-shirt-number-preview">#11</span><b id="prf-show-pos">LW</b></div>
            <div class="prf-facing">
              <button class="prf-sbtn ${this.viewportFacing !== 'back' ? 'on' : ''}" data-facing="front" onclick="App.toggleViewportFacing('front')"><span>FRENTE</span></button>
              <button class="prf-sbtn ${this.viewportFacing === 'back' ? 'on' : ''}" data-facing="back" onclick="App.toggleViewportFacing('back')"><span>COSTAS</span></button>
            </div>
          </div>
          <div class="prf-show-bottom">
            <div class="prf-show-equip" id="prf-show-equip"></div>
            <div class="prf-show-name" id="prf-show-name">YORI TRIVER</div>
            <div class="prf-show-shirt"><small>NA CAMISA</small><strong class="js-shirt-name-preview">TRIVER</strong></div>
            <div class="prf-show-actions">
              <button class="prf-btn prf-btn-cyan" onclick="App.openCreator('edit')"><span>✏️ PERSONALIZAR</span></button>
              <button class="prf-btn" onclick="App.switchTab('ARMAS')"><span>ARMAS ▶</span></button>
            </div>
            <div class="prf-show-note">Acessórios e Fluxo aparecem em campo</div>
          </div>
        </div>

        <div class="prf-mid">
          <!-- FICHA DA CARREIRA -->
          <div class="prf-career prf-frame">
            <div class="prf-head">
              <span class="prf-tag">FICHA DA CARREIRA</span>
              <span class="prf-cap" id="prf-chapter"></span>
            </div>
            <div class="prf-career-body">
              <div class="prf-ovr">
                <div class="prf-ovr-num" id="prf-ovr-num">0</div>
                <div class="prf-ovr-tag"><span>OVR</span><b id="prf-rank">RANK E</b></div>
              </div>
              <div class="prf-record">
                <div class="prf-record-top" id="prf-record-top"></div>
                <div class="prf-record-bar" id="prf-record-bar"></div>
                <div class="prf-cstats" id="prf-cstats"></div>
              </div>
            </div>
            <div class="prf-gear" id="prf-gear"></div>
          </div>

          <!-- ARMÁRIO -->
          <div class="prf-locker prf-frame">
            <div class="prf-head">
              <span class="prf-tag prf-tag-blue">ARMÁRIO</span>
              <span class="prf-count"><small>COLEÇÃO</small><b id="locker-owned-count">1 DE 10</b></span>
            </div>
            <div class="locker-filters-row prf-filters">
              ${FILTERS.map(([id, label]) => `<button class="locker-filter-btn ${this.lockerFilter === id ? 'active' : ''}" onclick="App.setLockerFilter('${id}', this)"><span>${label}</span></button>`).join('')}
            </div>
            <div id="locker-grid" class="prf-locker-grid"></div>
          </div>
        </div>

        <!-- CAMISA & APARÊNCIA -->
        <div class="prf-side prf-frame">
          <div class="prf-head"><span class="prf-tag prf-tag-amber">CAMISA &amp; APARÊNCIA</span></div>
          <div class="prf-jersey" aria-hidden="true">
            <div class="prf-jersey-shirt">
              <span class="prf-jersey-name js-shirt-name-preview">TRIVER</span>
              <span class="prf-jersey-num" id="prf-jersey-num">11</span>
            </div>
          </div>
          <label class="prf-field"><small>NOME COMPLETO</small>
            <input id="profile-name-input" class="ego-input prf-input" value="Yori Triver" oninput="App.updateAppearance('name', this.value)" />
          </label>
          <div class="prf-field-row">
            <label class="prf-field"><small>NOME NA CAMISA</small>
              <input id="profile-shirt-input" class="ego-input prf-input" value="TRIVER" oninput="App.updateAppearance('shirtName', this.value.toUpperCase())" />
            </label>
            <label class="prf-field prf-field-num"><small>NÚMERO</small>
              <input id="profile-number-input" class="ego-input prf-input" type="number" min="1" max="99" value="11" oninput="App.updateAppearance('number', parseInt(this.value || 11, 10))" />
            </label>
          </div>
          <div class="prf-sub"><span>VISUAL</span></div>
          <label class="prf-field"><small>ESTILO DE CABELO</small>
            <select id="hair-style-select" class="ego-input prf-input" onchange="App.updateAppearance('hairStyle', this.value)">${hairOptions}</select>
          </label>
          <div class="prf-colors">
            <label class="prf-color"><input id="hair-color-input" type="color" value="#1b2340" onchange="App.updateAppearance('hairColor', this.value)" /><span>CABELO</span></label>
            <label class="prf-color"><input id="hair-secondary-input" type="color" value="#3a5ba0" onchange="App.updateAppearance('hairSecondary', this.value)" /><span>MECHAS</span></label>
            <label class="prf-color"><input id="eye-color-input" type="color" value="#3b82f6" onchange="App.updateAppearance('eyeColor', this.value)" /><span>OLHOS (EGO)</span></label>
          </div>
          <button class="prf-btn prf-btn-ghost prf-wide" onclick="App.openCreator('edit')"><span>✏️ PERSONALIZAR COMPLETO <small>olhos • pele • pé • posição</small></span></button>
          <div class="prf-sub"><span>FICHA DO JOGADOR</span></div>
          <div class="prf-bio" id="prf-bio"></div>
          <div class="prf-side-fill"></div>
          <button class="prf-continue js-current-chapter-btn-label" onclick="App.launchChapterMatch()">CONTINUAR HISTÓRIA ▶</button>
        </div>
      </div>`;
      // o rótulo do botão CONTINUAR vem de renderCareerAndFaseTabs
      if (typeof this.renderCareerAndFaseTabs === 'function' && this.state) this.renderCareerAndFaseTabs();
      this.prfStartShowcaseLoop();
    },

    renderProfileTab() {
      if (!this.state) return;
      this.prfBuildProfile();
      // Os campos de aparência mostram o que está salvo (sem mexer no campo que você está digitando)
      const p = this.state.profile;
      [['hair-style-select', p.hairStyle], ['hair-color-input', p.hairColor], ['hair-secondary-input', p.hairSecondary], ['eye-color-input', p.eyeColor],
        ['profile-name-input', p.name], ['profile-shirt-input', p.shirtName], ['profile-number-input', String(p.number)]].forEach(([id, v]) => {
        const el = document.getElementById(id);
        if (el && v && el.value !== v && document.activeElement !== el) el.value = v;
      });

      const root = document.getElementById('prf-root');
      const set = (id, txt) => {
        const el = document.getElementById(id);
        if (el && el.textContent !== String(txt)) el.textContent = txt;
        return el;
      };
      document.querySelectorAll('#tab-PROFILE .js-shirt-number-preview').forEach((el) => (el.textContent = `#${p.number}`));
      document.querySelectorAll('#tab-PROFILE .js-shirt-name-preview').forEach((el) => (el.textContent = p.shirtName));
      set('prf-show-wm', p.number);
      set('prf-jersey-num', p.number);
      set('prf-show-pos', p.position);
      const nm = set('prf-show-name', p.name);
      if (nm) nm.title = p.name;

      // Ficha da carreira
      const ovr = this.calculateOVR();
      const rank = this.getRankLetter(ovr);
      if (root) {
        root.style.setProperty('--prf-aura', this.attrAuraColor());
        root.style.setProperty('--prf-rank', rank.color);
      }
      set('prf-ovr-num', ovr);
      set('prf-rank', rank.label);
      const ch = this.getChapter ? this.getChapter() : null;
      const blr = this.getBlueLockRank();
      set('prf-chapter', `${blr ? `RANKING BL #${blr} • ` : ''}${ch ? `CAP. ${ch.chapterNumber}` : 'CAMPEÃO DO MUNDO'}`);
      const c = this.state.career || {};
      const w = c.wins || 0, d = c.draws || 0, l = c.losses || 0;
      const played = w + d + l;
      const rec = document.getElementById('prf-record-top');
      if (rec) {
        rec.innerHTML = `<span class="prf-played"><b>${played}</b> PARTIDAS</span>
          <span class="prf-wdl"><i class="w">${w}V</i><i class="d">${d}E</i><i class="l">${l}D</i></span>
          <span class="prf-winrate"><small>APROV.</small><b>${played ? Math.round(((w * 3 + d) / (played * 3)) * 100) : 0}%</b></span>`;
      }
      const bar = document.getElementById('prf-record-bar');
      if (bar) {
        bar.innerHTML = played
          ? `<i class="w" style="flex:${w}"></i><i class="d" style="flex:${d}"></i><i class="l" style="flex:${l}"></i>`
          : '<i class="none" style="flex:1"></i>';
      }
      const got = (this.state.unlockedAchievements || []).length;
      const allAch = (window.ACHIEVEMENTS_DB || []).length;
      const stat = (label, val, color) => `<div class="prf-cstat" style="--c:${color}"><b>${val}</b><small>${label}</small></div>`;
      const cs = document.getElementById('prf-cstats');
      if (cs) {
        cs.innerHTML = [
          stat('GOLS', c.myGoals || 0, '#f59e0b'),
          stat('NOTA MÁX', c.bestRating ? Number(c.bestRating).toFixed(1) : '—', '#00f5d4'),
          stat('HAT-TRICK', c.hatTricks || 0, '#ef4444'),
          stat('DRIBLES', c.dribbles || 0, '#a78bfa'),
          stat('DESARMES', c.steals || 0, '#3b82f6'),
          stat('TROFÉUS', allAch ? `${got}/${allAch}` : got, '#facc15')
        ].join('');
      }
      const gear = document.getElementById('prf-gear');
      if (gear) {
        const T = window.RARITY_TIERS || {};
        const item = (label, it, locked) => {
          const col = it && T[it.rarity] ? T[it.rarity].color : '#4b6189';
          return `<div class="prf-gear-item ${it ? '' : 'empty'}" style="--g:${col}"><small>${label}</small><b>${it ? esc(it.name) : locked ? '🔒 BLOQUEADO' : '— VAZIO —'}</b>${it && T[it.rarity] ? `<em>${esc(T[it.rarity].name)}</em>` : ''}</div>`;
        };
        const st = this.state;
        gear.innerHTML = item('ARMA', st.equippedWeapon, !st.blueLockEntered) + item('FLUXO', st.equippedFlow, !st.blueLockEntered)
          + (st.nelUnlocked ? item('ARMA 2', st.equippedWeapon2, false) : '');
      }

      const bio = document.getElementById('prf-bio');
      if (bio) {
        const dm = (window.DIFFICULTY_MODES || {})[this.state.difficulty] || {};
        const foot = p.dominantFoot || 'DIREITA';
        const cell = (k, v, col) => `<div style="--c:${col}"><small>${k}</small><strong title="${esc(v)}">${esc(v)}</strong></div>`;
        bio.innerHTML = cell('POSIÇÃO', p.position, '#00f5d4') + cell('PÉ BOM', foot === 'AMBOS' && this.state.ambidextrousBorn ? 'AMBOS ✨' : foot, '#3b82f6')
          + cell('ALTURA', p.height || `5' 11"`, '#a78bfa') + cell('DIFICULDADE', `${dm.name || this.state.difficulty || 'Normal'}`, dm.color || '#f59e0b');
      }

      // Acessórios em uso (chips na vitrine)
      const eqBox = document.getElementById('prf-show-equip');
      if (eqBox) {
        eqBox.innerHTML = (this.state.equippedAccessories || [])
          .map((id) => window.LOCKER_ITEMS.find((it) => it.id === id))
          .filter(Boolean)
          .map((it) => `<span>${esc(it.name)}</span>`)
          .join('');
      }

      // ARMÁRIO
      const grid = document.getElementById('locker-grid');
      if (!grid) return;
      document.querySelectorAll('#tab-PROFILE .locker-filter-btn').forEach((b) => {
        const m = (b.getAttribute('onclick') || '').match(/'(\w+)'/);
        b.classList.toggle('active', !!m && m[1] === this.lockerFilter);
      });
      const items = window.LOCKER_ITEMS.filter((it) => {
        if (this.lockerFilter !== 'ALL' && it.slot !== this.lockerFilter) return false;
        if (this.ownedOnlyFilter && !this.state.ownedAccessories.includes(it.id)) return false;
        return true;
      });
      const ownedCountEl = document.getElementById('locker-owned-count');
      if (ownedCountEl) ownedCountEl.textContent = `${this.state.ownedAccessories.length} DE ${window.LOCKER_ITEMS.length}`;

      const coins = this.state.currencies.egoCoins;
      grid.innerHTML = items
        .map((it) => {
          const owned = this.state.ownedAccessories.includes(it.id);
          const equipped = this.state.equippedAccessories.includes(it.id);
          const afford = coins >= it.cost;
          const st = equipped ? 'equipped' : owned ? 'owned' : afford ? 'buy' : 'locked';
          return `
          <div class="locker-card prf-lk ${equipped ? 'equipped' : ''} ${owned ? 'owned' : ''} prf-lk-${st}" style="--it:${it.color}" onclick="App.toggleOrBuyAccessory('${it.id}')" title="${esc(it.desc)}">
            <div class="prf-lk-top">
              <span class="prf-lk-slot">${SLOT_NAMES[it.slot] || it.slot}</span>
              ${equipped ? '<span class="prf-lk-on">EM USO</span>' : ''}
            </div>
            <div class="prf-lk-icon"><canvas class="locker-item-cv" data-item="${it.id}" data-slot="${it.slot}" width="112" height="88"></canvas></div>
            <div class="prf-lk-name">${esc(it.name)}</div>
            <div class="prf-lk-act">${equipped ? '✓ EQUIPADO' : owned ? 'EQUIPAR' : `💠 ${it.cost}`}</div>
          </div>`;
        })
        .join('');

      // Ícone: o seu boneco usando o acessório, com zoom na parte do corpo onde ele vai
      const look = this.prfPlayerLook();
      delete look.number;
      // (os bonecos novos têm a cabeça mais baixa e a braçadeira no braço da direita da tela)
      // (alturas passam pelo SPRITE_MAPY: no chibi a cabeça e os braços ficam mais baixos)
      const M = window.SPRITE_MAPY || ((y) => y);
      const focus = window.PixelRenderer.spritesV2
        ? { HEAD: [18, M(6.5)], FACE: [18, M(11)], ARM: [25.5, M(16.5)], WRIST: [26.5, M(19.5)], HANDS: [26.5, M(20.8)], BACK: [18, M(15)] }
        : { HEAD: [18, 4], FACE: [18, 9], ARM: [10, 16], WRIST: [25, 19], HANDS: [25, 20], BACK: [18, 15] };
      grid.querySelectorAll('.locker-item-cv').forEach((cv) => {
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const zoom = cv.dataset.slot === 'BACK' ? (window.PixelRenderer.spritesV2 ? 4 : 5) : 10;
        const [fx, fy] = focus[cv.dataset.slot] || [18, 14];
        const size = 36 * zoom;
        ctx.save();
        ctx.translate(Math.round(cv.width / 2 - fx * zoom), Math.round(cv.height / 2 - fy * zoom));
        window.PixelRenderer.drawCharacterSprite(ctx, look, size, size * 1.1, {
          facing: cv.dataset.slot === 'BACK' ? 'back' : 'front',
          frame: 4,
          accessories: [cv.dataset.item]
        });
        ctx.restore();
      });

      if (root) this.prfIntro('PROFILE', root);
    },

    toggleViewportFacing(facing) {
      this.viewportFacing = facing;
      document.querySelectorAll('#tab-PROFILE .prf-facing .prf-sbtn').forEach((b) => b.classList.toggle('on', b.dataset.facing === facing));
    },

    prfStartShowcaseLoop() {
      if (this._prfLoop) return;
      this._prfLoop = true;
      const loop = () => {
        this.prfDrawShowcase();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },

    // Vitrine do PERFIL: boneco grande com aura, rim light, holofote e partículas (sem piscar)
    prfDrawShowcase() {
      const cv = document.getElementById('prf-show-cv');
      if (!cv || cv.offsetParent === null || !this.state) return;
      // Partida ou cutscene por cima da tela: não gasta quadro desenhando a vitrine escondida
      if (window.MatchEngine?.active || window.CutsceneEngine?.active || window.CutsceneEngine?.sakugaActive) return;
      const W = Math.max(1, cv.clientWidth | 0);
      const H = Math.max(1, cv.clientHeight | 0);
      if (cv.width !== W || cv.height !== H) {
        cv.width = W;
        cv.height = H;
      }
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      const aura = this.attrAuraColor();
      const A2 = (a) => hexA(aura, a);
      const f = this.animFrame;
      const card = cv.parentElement;
      const bottomEl = card && card.querySelector('.prf-show-bottom');
      const topEl = card && card.querySelector('.prf-show-top');
      const bottomH = bottomEl ? bottomEl.offsetHeight : 180;
      const topBottom = topEl ? topEl.offsetTop + topEl.offsetHeight : 110;
      const feetY = H - bottomH + 30;
      const room = Math.min((feetY - topBottom + 10) / 30.4, W / 27);
      const s = room >= 14 ? 12.5 : room >= 10 ? 10 : room >= 7.5 ? 7.5 : Math.max(2.5, Math.floor(room / 2.5) * 2.5);
      const x0 = Math.round(W / 2 - 18 * s);
      const y0 = Math.round(feetY - 31.4 * s);
      const box = 36 * s;
      const breathe = 0.5 + 0.5 * Math.sin(f * 0.025);

      // holofote
      const beam = ctx.createLinearGradient(0, 0, 0, feetY);
      beam.addColorStop(0, A2(0));
      beam.addColorStop(0.35, A2(0.05));
      beam.addColorStop(1, A2(0.16));
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 4 * s, 0);
      ctx.lineTo(W / 2 + 4 * s, 0);
      ctx.lineTo(W / 2 + 13 * s, feetY);
      ctx.lineTo(W / 2 - 13 * s, feetY);
      ctx.closePath();
      ctx.fill();
      const back = ctx.createRadialGradient(W / 2, y0 + 15 * s, 0, W / 2, y0 + 15 * s, 19 * s);
      back.addColorStop(0, A2(0.3 + breathe * 0.06));
      back.addColorStop(0.55, A2(0.1));
      back.addColorStop(1, A2(0));
      ctx.fillStyle = back;
      ctx.fillRect(0, 0, W, H);

      // chão: disco hexagonal de vestiário + anéis
      ctx.save();
      ctx.translate(W / 2, feetY);
      ctx.scale(1, 0.24);
      const floor = ctx.createRadialGradient(0, 0, 0, 0, 0, 15 * s);
      floor.addColorStop(0, A2(0.55));
      floor.addColorStop(0.5, A2(0.18));
      floor.addColorStop(1, A2(0));
      ctx.fillStyle = floor;
      ctx.beginPath();
      ctx.arc(0, 0, 15 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = A2(0.7);
      ctx.beginPath();
      ctx.arc(0, 0, 10.5 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = A2(0.25);
      ctx.beginPath();
      ctx.arc(0, 0, 14 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, 6.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // partículas subindo devagar
      for (let i = 0; i < 12; i++) {
        const span = feetY * 0.85;
        const t = ((f * (0.3 + (i % 4) * 0.07) + i * 53) % span) / span;
        const px = W / 2 + Math.sin(i * 2.1 + f * 0.01) * (6 + (i * 37) % 11) * s * 0.9;
        const py = feetY - t * span;
        ctx.fillStyle = A2(Math.sin(t * Math.PI) * 0.65);
        const sz = i % 3 === 0 ? 3 : 2;
        ctx.fillRect(Math.round(px), Math.round(py), sz, sz);
      }

      const pr = this.state.profile;
      const look = this.prfPlayerLook();
      const opts = { facing: this.viewportFacing === 'back' ? 'back' : 'front', frame: f, accessories: this.state.equippedAccessories, shirtNumber: pr.number };
      const PR = window.PixelRenderer;
      const rim = Math.max(2, Math.round(s * 0.7));
      ctx.save();
      ctx.translate(x0, y0);
      ctx.save();
      ctx.shadowColor = aura;
      ctx.shadowBlur = Math.round(2.6 * s);
      ctx.globalAlpha = 0.85;
      PR.drawCharacterSprite(ctx, look, box, box, Object.assign({}, opts, { tint: aura }));
      ctx.restore();
      ctx.translate(-rim, 0);
      PR.drawCharacterSprite(ctx, look, box, box, Object.assign({}, opts, { tint: aura }));
      ctx.translate(rim * 2, -Math.round(rim / 2));
      PR.drawCharacterSprite(ctx, look, box, box, Object.assign({}, opts, { tint: '#e8fffb' }));
      ctx.translate(-rim, Math.round(rim / 2));
      PR.drawCharacterSprite(ctx, look, box, box, opts);
      ctx.restore();
    },

    // ========================================================================
    // ABAS EQUIPE e RELAÇÕES
    // ========================================================================
    prfBuildTeamTabs() {
      const eq = document.getElementById('tab-EQUIPE');
      if (eq && eq.dataset.prf !== '1') {
        eq.dataset.prf = '1';
        eq.innerHTML = `
        <div id="prf-eq-root" class="prf-eq-root">
          <div class="prf-vs prf-frame prf-grain">
            <div class="prf-vs-lines" aria-hidden="true"></div>
            <div class="prf-vs-side prf-vs-home">
              <small>SEU TIME</small>
              <b id="prf-vs-home">—</b>
              <span id="prf-vs-home-ovr"></span>
            </div>
            <div class="prf-vs-mid" aria-hidden="true"><span>VS</span></div>
            <div class="prf-vs-side prf-vs-away">
              <small>ADVERSÁRIO</small>
              <b id="prf-vs-away">—</b>
              <span id="prf-vs-away-ovr"></span>
            </div>
            <div class="prf-vs-foot">
              <h2 id="current-story-team-title">EQUIPE</h2>
              <p>Seu time e o adversário mudam com o capítulo da história.</p>
            </div>
          </div>
          <div id="all-characters-grid" class="prf-eq-grid"></div>
        </div>`;
      }
      const rel = document.getElementById('tab-RELACIONAMENTOS');
      if (rel && rel.dataset.prf !== '1') {
        rel.dataset.prf = '1';
        rel.innerHTML = `
        <div id="prf-rel-root" class="prf-rel-root">
          <div class="prf-relhero prf-frame prf-grain">
            <div class="prf-relhero-txt">
              <div class="prf-relhero-kicker">CHEMISTRY <b>LINK</b></div>
              <h2>RELAÇÕES &amp; REAÇÕES QUÍMICAS</h2>
              <p>Suas escolhas nos diálogos mudam a química com cada jogador. Em campo, com a bola, aperte <strong>C</strong>: o parceiro com mais química faz a jogada dele com você.</p>
            </div>
            <div class="prf-relhero-stats" id="prf-rel-stats"></div>
            <div class="prf-relhero-top" id="prf-rel-top"></div>
          </div>
          <div class="prf-relbar">
            <div class="prf-relsort" id="prf-rel-sort"></div>
            <div class="prf-rellegend" id="prf-rel-legend"></div>
          </div>
          <div id="relationships-grid" class="prf-rel-grid"></div>
        </div>`;
      }
      if (!this._prfResize) {
        this._prfResize = true;
        let t = 0;
        window.addEventListener('resize', () => {
          clearTimeout(t);
          t = setTimeout(() => {
            this._prfSquadKey = null;
            if (this.state) this.renderSquadAndRelationships();
          }, 150);
        });
      }
    },

    prfSetRelSort(mode) {
      this.prfRelSort = mode;
      window.SFX?.click();
      this._prfRelKey = null;
      this.renderSquadAndRelationships();
    },

    renderSquadAndRelationships() {
      if (!this.state) return;
      this.prfBuildTeamTabs();
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
      const ovr = this.calculateOVR();

      // ---------------------------- EQUIPE ----------------------------
      const eqRoot = document.getElementById('prf-eq-root');
      if (squadBox && currentCh && visible(squadBox)) {
        const key = JSON.stringify([currentCh.id, mateIds, oppIds, oppName, ovr, mateIds.map((id) => this.state.affinities[id]), squadBox.clientWidth]);
        this.prfIntro('EQUIPE', eqRoot);
        if (key !== this._prfSquadKey) {
          this._prfSquadKey = key;
          const homeName = currentCh.teamName || currentCh.era;
          const setT = (id, v) => { const el = document.getElementById(id); if (el) { el.textContent = v; el.title = v; } };
          setT('prf-vs-home', homeName);
          setT('prf-vs-away', oppName || '—');
          const avg = (ids, opp) => (ids.length ? Math.round(ids.reduce((s, id) => s + this.getScaledCharOVR(window.findCharacter(id) || window.BLUE_LOCK_CHARACTERS[0], opp), 0) / ids.length) : 0);
          const homeAvg = mateIds.length ? Math.round((avg(mateIds, false) * mateIds.length + ovr) / (mateIds.length + 1)) : ovr;
          const awayAvg = avg(oppIds, true);
          const ho = document.getElementById('prf-vs-home-ovr');
          if (ho) ho.innerHTML = `OVR MÉDIO <b>${homeAvg}</b>`;
          const ao = document.getElementById('prf-vs-away-ovr');
          if (ao) ao.innerHTML = `OVR MÉDIO <b>${oppIds.length ? awayAvg : '—'}</b>`;

          const mates = mateIds.map((id) => this.prfCardHtml(id, 'SEU COMPANHEIRO NA PARTIDA', false)).join('');
          const opps = oppIds.map((id) => this.prfCardHtml(id, 'ADVERSÁRIO DA HISTÓRIA', true)).join('');
          const chemAvg = mateIds.length ? Math.round(mateIds.reduce((s, id) => s + this.prfAffinity(window.findCharacter(id) || { id }), 0) / mateIds.length) : 0;
          const tier = this.prfChemTier(chemAvg, false);
          const summary = mateIds.length
            ? `<div class="prf-sumcard prf-frame" style="--m:${tier.color}">
                <div class="prf-cap">QUÍMICA DO TIME</div>
                <div class="prf-sum-big">${chemAvg}<small>%</small></div>
                <div class="prf-sum-tier">${tier.label}</div>
                ${this.prfMeterHtml(chemAvg, tier.color)}
                <p>Química alta = companheiros jogam melhor ao seu lado (até +2 OVR) e liberam a Reação Química no <b>C</b>.</p>
              </div>`
            : '';
          squadBox.innerHTML = `
            <div class="prf-squad prf-squad-home">
              <div class="prf-squad-label"><span>★ SEU TIME</span><small>${esc(homeName)}</small></div>
              <div class="prf-squad-cards">
                ${mateIds.length
                  ? mates + summary
                  : `<div class="prf-empty prf-frame"><b>${currentCh.nelPhase !== undefined ? 'Você escolhe o seu clube da NEL ao apertar JOGAR.' : 'Você monta o seu trio ao apertar CONTINUAR.'}</b></div>`}
              </div>
            </div>
            <div class="prf-squad prf-squad-away">
              <div class="prf-squad-label"><span>⚔️ ADVERSÁRIO</span><small>${esc(oppName || '')}</small></div>
              <div class="prf-squad-cards">${opps || '<div class="prf-empty prf-frame"><b>Os adversários aparecem aqui quando a partida for definida.</b></div>'}</div>
            </div>`;
          squadBox.querySelectorAll('canvas.prf-card-cv').forEach((cv) => this.prfDrawCardPortrait(cv));
        }
      } else if (eqRoot) {
        this.prfIntro('EQUIPE', eqRoot);
      }

      // ---------------------------- RELAÇÕES ----------------------------
      const relRoot = document.getElementById('prf-rel-root');
      if (relBox && visible(relBox)) {
        const sort = this.prfRelSort || 'CHEM';
        const key = JSON.stringify([this.state.affinities, ovr, this.isMortalRival('rin'), sort]);
        this.prfIntro('RELACIONAMENTOS', relRoot);
        if (key !== this._prfRelKey) {
          this._prfRelKey = key;
          this.prfRenderRelationships(relBox, sort);
        }
      } else if (relRoot) {
        this.prfIntro('RELACIONAMENTOS', relRoot);
      }
    },

    // Carta de personagem (EQUIPE)
    prfCardHtml(id, roleLabel, isOpp) {
      const c = window.findCharacter(id) || window.BLUE_LOCK_CHARACTERS[0];
      const scaledOvr = this.getScaledCharOVR(c, isOpp);
      const r = this.prfRarity(c);
      const parts = String(c.name).split(' ');
      const last = parts.length > 1 ? parts.pop() : parts[0];
      const first = parts.length && parts[0] !== last ? parts.join(' ') : '';
      const rival = this.isMortalRival(c.id);
      let chem = '';
      if (isOpp) {
        // Ameaça: o quanto o rival está acima (ou abaixo) do seu OVR
        const diff = scaledOvr - this.calculateOVR();
        const lvl = diff >= 20 ? ['EXTREMA', '#ef4444'] : diff >= 5 ? ['ALTA', '#f97316'] : diff >= -4 ? ['EQUILIBRADA', '#facc15'] : ['BAIXA', '#22c55e'];
        chem = `<div class="prf-card-chem" style="--m:${lvl[1]}">
            <div class="prf-card-chem-top"><span>AMEAÇA ${lvl[0]}</span><b>${diff > 0 ? '+' : ''}${diff} OVR</b></div>
            ${this.prfMeterHtml(Math.max(6, Math.min(100, 50 + diff * 2.5)), lvl[1])}
          </div>`;
      } else {
        const aff = this.prfAffinity(c);
        const t = this.prfChemTier(aff, rival);
        chem = `<div class="prf-card-chem" style="--m:${t.color}">
            <div class="prf-card-chem-top"><span>${rival ? '🩸 RIVAL MORTAL' : t.label}</span><b>Química: ${aff}%</b></div>
            ${this.prfMeterHtml(aff, t.color)}
          </div>`;
      }
      return `
        <div class="char-pixel-card prf-card ${isOpp ? 'prf-card-opp' : 'prf-card-home'} prf-r-${r.id}" style="--rar:${r.color}; --aura:${c.auraColor}">
          <div class="prf-card-in">
            <div class="prf-card-art">
              <div class="prf-card-wm" aria-hidden="true">${c.number}</div>
              <canvas class="prf-card-cv" data-charid="${c.id}"></canvas>
              <div class="prf-card-top">
                <div class="prf-card-ovr"><b>${scaledOvr}</b><span>${c.pos}</span></div>
                <div class="prf-card-num">#${c.number}</div>
              </div>
              <div class="prf-card-rar">${r.name}</div>
            </div>
            <div class="prf-card-body">
              <div class="prf-card-name">${first ? `<small>${esc(first)}</small>` : ''}<b>${esc(last)}</b></div>
              <div class="prf-card-team">${esc(c.team || '')}</div>
              <div class="prf-card-role">${roleLabel}</div>
              <div class="prf-card-weapon" title="${esc(c.weaponName)}"><i>⚡</i><span>${esc(c.weaponName)}</span></div>
              <div class="prf-card-combo" title="${esc(c.chemBonus)}"><small>COMBO NA PARTIDA</small><span>${esc(c.chemName)}</span></div>
              ${chem}
            </div>
          </div>
        </div>`;
    },

    prfDrawCardPortrait(cv) {
      const c = window.findCharacter(cv.dataset.charid);
      if (!c) return;
      const W = Math.max(1, cv.clientWidth | 0);
      const H = Math.max(1, cv.clientHeight | 0);
      if (W < 10 || H < 10) return;
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      const s = H >= 175 ? 5 : H >= 130 ? 5 : 2.5 * Math.max(1, Math.floor(H / 32.5 / 2.5));
      const x0 = Math.round(W / 2 - 18 * s);
      // corpo inteiro se couber; senão a cabeça fica no topo e as pernas saem por baixo
      const y0 = Math.round(H >= 31.6 * s + 22 ? H - 31.6 * s - 4 : 14);
      // chão iluminado
      ctx.save();
      ctx.translate(W / 2, H - 6);
      ctx.scale(1, 0.25);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 13 * s);
      g.addColorStop(0, hexA(c.auraColor, 0.6));
      g.addColorStop(0.55, hexA(c.auraColor, 0.18));
      g.addColorStop(1, hexA(c.auraColor, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 13 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      this.prfDrawSprite(ctx, c, x0, y0, s, { aura: c.auraColor, sprite: { facing: 'front', frame: 1 } });
    },

    // Lista de relações (66 cartas)
    prfRenderRelationships(relBox, sort) {
      const chars = window.BLUE_LOCK_CHARACTERS.slice();
      const data = chars.map((c, i) => ({ c, i, aff: this.prfAffinity(c), rival: this.isMortalRival(c.id) }));
      if (sort === 'CHEM') data.sort((a, b) => (a.rival - b.rival) || (b.aff - a.aff) || (a.i - b.i));
      else if (sort === 'OVR') data.sort((a, b) => (b.c.ovr || 0) - (a.c.ovr || 0) || a.i - b.i);

      // Cabeçalho: resumo e top 3 parceiros
      const normal = data.filter((d) => !d.rival);
      const avg = normal.length ? Math.round(normal.reduce((s, d) => s + d.aff, 0) / normal.length) : 0;
      const souls = normal.filter((d) => d.aff >= 90).length;
      const sync = normal.filter((d) => d.aff >= 75).length;
      const stats = document.getElementById('prf-rel-stats');
      if (stats) {
        const rivalOn = data.some((d) => d.rival);
        stats.innerHTML = `
          <div class="prf-rs" style="--c:#00f5d4"><b>${avg}<small>%</small></b><span>QUÍMICA MÉDIA</span></div>
          <div class="prf-rs" style="--c:#facc15"><b>${souls}</b><span>ALMAS GÊMEAS</span></div>
          <div class="prf-rs" style="--c:#38bdf8"><b>${sync}</b><span>EM SINTONIA</span></div>
          <div class="prf-rs ${rivalOn ? 'prf-rs-rival' : ''}" style="--c:#ef4444"><b>${rivalOn ? '🩸' : '0'}</b><span>${rivalOn ? 'RIVAL MORTAL' : 'RIVAIS MORTAIS'}</span></div>`;
      }
      const top = normal.slice().sort((a, b) => b.aff - a.aff || a.i - b.i).slice(0, 3);
      const topBox = document.getElementById('prf-rel-top');
      if (topBox) {
        topBox.innerHTML = `<div class="prf-cap">MAIOR QUÍMICA</div>
          <div class="prf-top3">${top.map((d, n) => `
            <div class="prf-top1" style="--aura:${d.c.auraColor}">
              <em>${n + 1}</em>
              <canvas class="prf-top-cv" data-charid="${d.c.id}" width="64" height="64"></canvas>
              <div><b>${esc(d.c.name.split(' ').slice(-1)[0])}</b><span>${d.aff}%</span></div>
            </div>`).join('')}</div>`;
        topBox.querySelectorAll('canvas.prf-top-cv').forEach((cv) => {
          const c = window.findCharacter(cv.dataset.charid);
          if (!c) return;
          const ctx = cv.getContext('2d');
          ctx.clearRect(0, 0, cv.width, cv.height);
          this.prfDrawSprite(ctx, c, Math.round(32 - 18 * 5), -2, 5, { aura: c.auraColor, glow: false, sprite: { facing: 'front', frame: 1 } });
        });
      }
      const sortBox = document.getElementById('prf-rel-sort');
      if (sortBox) {
        const b = (id, label) => `<button class="prf-chip ${sort === id ? 'on' : ''}" onclick="App.prfSetRelSort('${id}')"><span>${label}</span></button>`;
        sortBox.innerHTML = `<span class="prf-cap">ORDENAR</span>${b('CHEM', 'QUÍMICA')}${b('OVR', 'CLASSE')}${b('LIST', 'ELENCO')}<span class="prf-relcount">${data.length} JOGADORES</span>`;
      }
      const legend = document.getElementById('prf-rel-legend');
      if (legend && !legend.innerHTML) {
        legend.innerHTML = [[90, 'ALMA GÊMEA'], [75, 'SINTONIA'], [55, 'PARCERIA'], [35, 'NEUTRO'], [0, 'ATRITO']]
          .map(([v]) => this.prfChemTier(v, false))
          .map((t) => `<span style="--c:${t.color}">${t.label}</span>`)
          .join('');
      }

      relBox.innerHTML = data
        .map(({ c, aff, rival }) => {
          const scaledOvr = this.getScaledCharOVR(c, false);
          const t = this.prfChemTier(aff, rival);
          const r = this.prfRarity(c);
          return `
          <div class="rel-row-card prf-rel ${rival ? 'prf-rel-rival' : ''} ${aff >= 90 && !rival ? 'prf-rel-soul' : ''}" style="--aura:${c.auraColor}; --m:${t.color}; --rar:${r.color}">
            <div class="prf-rel-art">
              <canvas class="prf-rel-cv" data-charid="${c.id}" width="96" height="104"></canvas>
              <span class="prf-rel-pos">${c.pos}</span>
              <span class="prf-rel-ovr">${scaledOvr}</span>
            </div>
            <div class="prf-rel-info">
              <div class="prf-rel-top">
                <strong title="${esc(c.name)}">${esc(c.name)}</strong>
              </div>
              <div class="prf-rel-meta"><span class="prf-rel-rar">${r.name}</span>${c.pos} • OVR ${scaledOvr} • ${esc(c.team || '')}</div>
              <div class="prf-rel-chem">
                <span class="prf-rel-tier">${t.label}</span>
                ${this.prfMeterHtml(rival ? 100 : aff, t.color, rival ? 'prf-meter-rival' : '')}
                <span class="chem-pill prf-pill">${rival ? '🩸 RIVAL MORTAL • ' : ''}Química: ${aff}%</span>
              </div>
              <div class="prf-rel-combo"><b>🔥 ${esc(c.chemName)}</b> — ${esc(c.chemBonus)}</div>
              <div class="prf-rel-quote">“${esc(c.quote)}”</div>
            </div>
          </div>`;
        })
        .join('');
      relBox.querySelectorAll('canvas.prf-rel-cv').forEach((cv) => {
        const c = window.findCharacter(cv.dataset.charid);
        if (!c) return;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        this.prfDrawSprite(ctx, c, Math.round(cv.width / 2 - 18 * 5), 0, 5, {
          aura: this.isMortalRival(c.id) ? '#ef4444' : c.auraColor,
          sprite: { facing: 'front', frame: 1 }
        });
      });
    },

    // ========================================================================
    // ✏️ PERSONALIZAR (tela de criar / editar): mesma marcação e handlers do
    // app.js; aqui só a prévia ganha aura + rim light e a tela ganha a moldura.
    // ========================================================================
    drawCreatorPreview() {
      const c = this.creator;
      const cv = document.getElementById('creator-cv');
      if (!c || !cv) return;
      const ctx = cv.getContext('2d');
      const W = cv.width;
      const H = cv.height;
      ctx.clearRect(0, 0, W, H);
      const p = c.profile;
      const eye = p.eyeColor;
      let aura = '#00f5d4';
      if (isHex(eye)) {
        const n = parseInt(eye.slice(1), 16);
        const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
        if (lum > 70) aura = eye;
      }
      const s = 7.5;
      const x0 = Math.round(W / 2 - 18 * s);
      const feetY = H - 12;
      const y0 = Math.round(feetY - 31.4 * s);
      // chão
      ctx.save();
      ctx.translate(W / 2, feetY);
      ctx.scale(1, 0.24);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 15 * s);
      g.addColorStop(0, hexA(aura, 0.55));
      g.addColorStop(0.5, hexA(aura, 0.16));
      g.addColorStop(1, hexA(aura, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 15 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = hexA(aura, 0.6);
      ctx.beginPath();
      ctx.arc(0, 0, 10.5 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      this.prfDrawSprite(ctx, this.creatorLook(), x0, y0, s, {
        aura,
        sprite: {
          facing: c.facing,
          frame: 4,
          accessories: c.mode === 'edit' ? this.state.equippedAccessories : ['wristband'],
          shirtNumber: p.number
        }
      });
      const scr = document.getElementById('creator-screen');
      if (scr) scr.style.setProperty('--prf-aura', aura);
      const tag = document.getElementById('creator-tag');
      if (tag) tag.innerHTML = `<b>#${p.number}</b> ${esc(p.shirtName || '')} <span>${p.position}</span>`;
    },

    renderCreator() {
      const c = this.creator;
      const box = document.getElementById('creator-screen');
      if (!c || !box) return;
      // a prévia é maior nesta versão: troca o tamanho antes de desenhar
      ORIG.renderCreator.apply(this, arguments);
      const cv = document.getElementById('creator-cv');
      const prev = box.querySelector('.creator-preview');
      if (prev && !prev.querySelector('.prf-cr-deco')) {
        prev.insertAdjacentHTML('afterbegin', `
          <div class="prf-cr-deco" aria-hidden="true">
            <div class="prf-cr-letterbox"><span>EGOIST <b>${c.mode === 'new' ? 'ENTRY' : 'EDIT'}</b></span><span>BLUE LOCK</span></div>
            <div class="prf-cr-slash"></div>
            <div class="prf-cr-wm">${esc(c.profile.number)}</div>
          </div>`);
      }
      if (cv && (cv.width !== 300 || cv.height !== 330)) {
        cv.width = 300;
        cv.height = 330;
        this.drawCreatorPreview();
      }
      const title = box.querySelector('.creator-title');
      if (title && !title.dataset.prf) {
        title.dataset.prf = '1';
        title.innerHTML = `<small>${c.mode === 'new' ? 'NOVA CARREIRA • PASSO 1' : 'VESTIÁRIO • ✏️ PERSONALIZAR'}</small><span>${esc(title.textContent)}</span>`;
      }
    }
  });

  // número d'água da prévia acompanha o número digitado
  const origCreatorInput = A.creatorInput;
  A.creatorInput = function (field, value) {
    origCreatorInput.apply(this, arguments);
    if (field === 'number' && this.creator) {
      const wm = document.querySelector('#creator-screen .prf-cr-wm');
      if (wm) wm.textContent = this.creator.profile.number;
    }
  };
})();
