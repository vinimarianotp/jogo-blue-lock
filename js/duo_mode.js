// ============================================================================
// MODO DUPLA — A SALA (tela inicial → 🤝 MODO DUPLA)
// Criar sala (código de 5 letras) ou entrar com o código do amigo; os dois trocam
// o jogador da carreira que está aberta; quem criou a sala escolhe o rival e
// começa a partida. Por enquanto: AMISTOSO EM DUPLA. A Carreira em Dupla (história
// própria) entra nesta mesma sala.
// ============================================================================
(function () {
  const App = window.App;
  const ME = window.MatchEngine;
  const Net = window.DuoNet;
  if (!App || !ME || !Net) return;

  const VERSION = 1;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // Rivais do amistoso (o 5º é o goleiro). Os 3 companheiros: 2 de linha + goleiro
  const RIVALS = [
    { id: 'teamx', name: 'Time X', sub: 'Barou, o Rei', opp: ['barou', 'gen_teamx_a', 'gen_teamx_b', 'gen_teamx_c', 'gk_teamx'], color: '#111827', sec: '#facc15', theme: 'bluelock_bunker', diff: 1 },
    { id: 'teamv', name: 'Time V', sub: 'Nagi, Reo & Zantetsu', opp: ['nagi', 'reo', 'zantetsu', 'tsunzaki', 'gk_teamv'], color: '#f8fafc', sec: '#7c3aed', theme: 'bluelock_bunker', diff: 1.2 },
    { id: 'u20', name: 'Japão Sub-20', sub: 'Sae, Shidou & Aiku', opp: ['shidou', 'sae', 'sendo', 'aiku', 'fukaku'], color: '#ffffff', sec: '#1d4ed8', theme: 'u20_national', diff: 1.35 },
    { id: 'world5', name: 'World Five', sub: 'Loki & os craques do mundo', opp: ['loki', 'luna', 'blake', 'dada_silva', 'pablo'], color: '#ffffff', sec: '#0f172a', theme: 'bluelock_holo', diff: 1.5 }
  ];
  const MATES = ['chigiri', 'kunigami', 'gagamaru'];

  const Duo = {
    view: 'menu', // menu | waiting | connecting | room | result
    me: null,
    partner: null,
    rival: 'teamx',
    result: null,
    error: '',
    inMatch: false,

    // ------------------------------------------------------------ perfil
    myProfile() {
      const st = App.state;
      if (!st?.profile) return null;
      const pick = (o, keys) => keys.reduce((a, k) => ((a[k] = o?.[k]), a), {});
      return {
        v: VERSION,
        profile: pick(st.profile, ['name', 'shirtName', 'number', 'position', 'skinColor', 'hairColor', 'hairSecondary', 'eyeColor', 'eyeStyle', 'hairStyle']),
        stats: Object.assign({}, st.stats),
        ovr: App.calculateOVR?.() || 60,
        equippedWeapon: st.equippedWeapon || null,
        equippedWeapon2: st.equippedWeapon2 || null,
        equippedFlow: st.equippedFlow || null,
        equippedFlow2: st.equippedFlow2 || null,
        nelUnlocked: !!st.nelUnlocked,
        equippedAccessories: (st.equippedAccessories || []).slice(),
        difficulty: st.difficulty || 'normal',
        // o parceiro não tem a sua química: as passivas/efeitos que dependem dela ficam de fora
        affinities: {}
      };
    },

    hasCareer() {
      return [1, 2].some((n) => App.readSlot?.(n));
    },

    // ------------------------------------------------------------ tela
    ensureScreen() {
      let el = document.getElementById('duo-screen');
      if (!el) {
        el = document.createElement('div');
        el.id = 'duo-screen';
        el.className = 'duo-screen';
        document.body.appendChild(el);
      }
      return el;
    },

    open() {
      if (!this.hasCareer()) {
        App.notify?.('Crie o seu jogador numa carreira primeiro: é ele que joga no Modo Dupla.', '#f59e0b');
        return;
      }
      if (!Net.available()) {
        App.notify?.('Não deu para carregar a parte online. Confira a internet e recarregue a página.', '#ef4444');
        return;
      }
      this.bindNet();
      this.error = '';
      if (!Net.connected() && this.view !== 'waiting' && this.view !== 'connecting') this.view = 'menu';
      this.ensureScreen().classList.add('open');
      window.SFX?.click?.();
      this.render();
    },

    close() {
      // Fechar a tela sai da sala
      Net.close();
      this.partner = null;
      this.view = 'menu';
      document.getElementById('duo-screen')?.classList.remove('open');
    },

    pickSlot(n) {
      if (Net.connected() || !App.readSlot?.(n)) return;
      App.activeSlot = n;
      try {
        localStorage.setItem('bluelock_active_slot', String(n));
      } catch (e) {}
      App.loadState?.();
      App.renderAll?.();
      App.renderTitleMenu?.();
      this.render();
    },

    createRoom() {
      this.error = '';
      this.view = 'waiting';
      this.code = null;
      this.render();
      Net.host();
    },

    joinRoom() {
      const input = document.getElementById('duo-code-input');
      const code = Net.cleanCode(input?.value);
      if (code.length !== 5) {
        this.error = 'O código tem 5 letras/números (ex: K7M2Q).';
        this.render();
        return;
      }
      this.error = '';
      this.view = 'connecting';
      this.code = code;
      this.render();
      Net.join(code);
    },

    leaveRoom() {
      Net.send({ t: 'bye' });
      Net.close();
      this.partner = null;
      this.view = 'menu';
      this.render();
    },

    copyCode() {
      const code = this.code || '';
      const done = () => App.notify?.('📋 Código copiado! Mande para o seu amigo.', '#facc15');
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done, () => {});
      else done();
    },

    setRival(id) {
      this.rival = id;
      Net.send({ t: 'rival', id });
      this.render();
    },

    // ------------------------------------------------------------ rede
    bindNet() {
      if (this.bound) return;
      this.bound = true;
      Net.on('status', (st, code) => {
        if (st === 'waiting') {
          this.code = code;
          if (this.view !== 'result' || !this.partner) this.view = 'waiting';
          this.partner = null;
        } else if (st === 'connecting') {
          this.view = 'connecting';
        } else if (st === 'connected') {
          this.me = this.myProfile();
          Net.send({ t: 'hello', p: this.me });
        } else if (st === 'lost') {
          const name = this.partner?.profile?.name || 'O seu parceiro';
          this.partner = null;
          if (ME.duo) {
            if (ME.duo.role === 'host') ME.duoPartnerLost();
            else this.abortGuestMatch(`${name} saiu da sala (ou a conexão caiu).`);
          }
          if (Net.role === 'guest') {
            this.view = 'menu';
            this.error = `${name} fechou a sala (ou a conexão caiu).`;
          }
          App.notify?.(`📡 ${name} desconectou.`, '#f59e0b');
        }
        this.render();
      });
      Net.on('error', (msg) => {
        this.error = msg;
        if (!Net.connected()) this.view = 'menu';
        this.render();
      });
      Net.on('ping', () => this.renderPing());
      Net.on('message', (msg) => this.onMessage(msg));
    },

    onMessage(msg) {
      // Durante a partida, posições e comandos vão direto para o MatchEngine
      if (ME.duo) {
        if (ME.duo.role === 'guest' && (msg.t === 's' || msg.t === 'ev' || msg.t === 'end')) {
          ME.duoGuestMessage(msg);
          return;
        }
        if (ME.duo.role === 'host' && (msg.t === 'in' || msg.t === 'act' || msg.t === 'quitMatch')) {
          ME.duoHostMessage(msg);
          return;
        }
      }
      switch (msg.t) {
        case 'hello':
          this.partner = msg.p;
          this.view = 'room';
          if (msg.p?.v !== VERSION) this.error = 'Vocês estão com versões diferentes do jogo: os dois recarreguem a página (Ctrl+F5).';
          else this.error = '';
          if (Net.role === 'host') Net.send({ t: 'rival', id: this.rival });
          window.SFX?.jingle?.([523, 659, 784]);
          this.render();
          break;
        case 'rival':
          if (RIVALS.some((r) => r.id === msg.id)) this.rival = msg.id;
          this.render();
          break;
        case 'start':
          if (Net.role === 'guest') this.beginMatch(msg.ch);
          break;
        case 'bye':
          break;
      }
    },

    // ------------------------------------------------------------ partida
    friendlyChapter() {
      const r = RIVALS.find((x) => x.id === this.rival) || RIVALS[0];
      return {
        id: 'duo_friendly',
        era: 'MODO DUPLA',
        title: `Amistoso contra o ${r.name}`,
        mapTheme: r.theme,
        matchDuration: 150,
        targetGoals: 3,
        drawIsWin: false,
        difficulty: r.diff,
        teammateIds: MATES.slice(),
        opponentIds: r.opp.slice(),
        teamName: 'A DUPLA',
        opponentName: r.name,
        homeColor: '#4c1d95',
        homeSecondary: '#fde047',
        opponentColor: r.color,
        opponentSecondary: r.sec,
        scoreLabels: { home: 'DUPLA', away: r.name.toUpperCase() }
      };
    },

    startFriendly() {
      if (Net.role !== 'host' || !this.partner) return;
      const ch = this.friendlyChapter();
      Net.send({ t: 'start', ch });
      this.beginMatch(ch);
    },

    beginMatch(ch) {
      const role = Net.role;
      this.inMatch = true;
      this.result = null;
      document.getElementById('duo-screen')?.classList.remove('open');
      App.closeTitleScreen?.();
      App.closeCinematicModal?.();
      ME.duoBegin({ role, partner: this.partner, onEnd: (res, myRep, otherRep) => this.onMatchEnd(res, myRep, otherRep) });
      ME.startMatch(ch, App.state);
      if (role === 'host') ME.duoHostSetup();
      else ME.duoGuestSetup();
    },

    abortGuestMatch(reason) {
      if (!ME.duo) return;
      const onEnd = ME.duo.onEnd;
      ME.duoSetPausedNote?.(false);
      ME.closeFullscreenOverlay();
      ME.duoEndCleanup();
      this.inMatch = false;
      this.error = reason;
      onEnd && this.onMatchEnd({ won: false, draw: false, sh: ME.scoreHome, sa: ME.scoreAway, forfeit: true, by: 'net' }, null, null);
    },

    // Fim do amistoso: prêmio em EgoCoins na SUA carreira e volta para a sala
    onMatchEnd(res, myRep, otherRep) {
      this.inMatch = false;
      let coins = 0;
      if (res && !res.forfeit) {
        coins = (res.won ? 120 : res.draw ? 60 : 30) + Math.min(250, myRep?.bonus || 0);
        const st = App.state;
        if (st?.currencies) {
          st.currencies.egoCoins = (st.currencies.egoCoins || 0) + coins;
          App.saveState?.();
          App.renderAll?.();
        }
      }
      this.result = { res, myRep, otherRep, coins };
      this.view = Net.connected() ? 'result' : Net.role === 'host' && Net.code ? 'waiting' : 'menu';
      if (!Net.connected() && res && !this.error) this.error = 'A conexão com o seu parceiro acabou.';
      this.ensureScreen().classList.add('open');
      this.render();
    },

    // ------------------------------------------------------------ desenho
    charData(p) {
      const pr = p?.profile || {};
      return {
        skinColor: pr.skinColor || '#f3d1b8',
        hairColor: pr.hairColor || '#0f172a',
        hairSecondary: pr.hairSecondary || '#2563eb',
        eyeColor: pr.eyeColor || '#ef4444',
        eyeStyle: pr.eyeStyle,
        hairStyle: pr.hairStyle || 'spiky_tall',
        jerseyPrimary: '#4c1d95',
        jerseySecondary: '#fde047',
        number: pr.number || 10
      };
    },

    drawCards() {
      document.querySelectorAll('#duo-screen canvas[data-duo-who]').forEach((cv) => {
        const p = cv.dataset.duoWho === 'me' ? this.me || this.myProfile() : this.partner;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        if (!p) return;
        ctx.imageSmoothingEnabled = false;
        try {
          window.PixelRenderer?.drawCharacterSprite(ctx, this.charData(p), cv.width, cv.height, {
            facing: 'front',
            flipX: cv.dataset.duoWho !== 'me',
            animState: 'idle',
            accessories: p.equippedAccessories || [],
            priority: true
          });
        } catch (e) {}
      });
    },

    card(p, who) {
      if (!p) {
        return `<div class="duo-card empty"><div class="duo-card-art"><span class="duo-dots">●●●</span></div><b>ESPERANDO...</b><small>o seu parceiro aparece aqui</small></div>`;
      }
      const pr = p.profile || {};
      const w = p.equippedWeapon?.name;
      return `
        <div class="duo-card ${who}">
          <div class="duo-card-art"><canvas width="132" height="132" data-duo-who="${who}"></canvas></div>
          <span class="duo-card-tag">${who === 'me' ? 'VOCÊ' : 'PARCEIRO'}</span>
          <b>${esc(String(pr.name || '???').toUpperCase())}</b>
          <small>${esc(pr.position || 'CF')} • Nº ${esc(pr.number || '?')} • OVR ${esc(p.ovr || '?')}</small>
          ${w ? `<small class="duo-card-wp">⚔️ ${esc(w)}</small>` : ''}
        </div>`;
    },

    renderPing() {
      const el = document.getElementById('duo-ping');
      if (!el) return;
      const ms = Net.pingMs;
      el.textContent = ms == null ? '…' : `${ms} ms`;
      el.className = `duo-ping ${ms == null ? '' : ms < 90 ? 'good' : ms < 180 ? 'ok' : 'bad'}`;
    },

    render() {
      const el = document.getElementById('duo-screen');
      if (!el || !el.classList.contains('open')) return;
      const me = this.myProfile();
      this.me = me;
      const err = this.error ? `<div class="duo-error">${esc(this.error)}</div>` : '';
      const head = `
        <div class="duo-head">
          <div class="duo-logo">🤝 MODO DUPLA <small>ONLINE</small></div>
          <button class="duo-x" onclick="Duo.close()" title="Fechar (sai da sala)">✕</button>
        </div>`;
      let body = '';

      if (this.view === 'menu') {
        const slots = [1, 2].map((n) => ({ n, info: App.slotSummary?.(n) })).filter((s) => s.info);
        body = `
          <p class="duo-lead">Jogue com um amigo, cada um no seu celular ou PC. Um cria a sala e manda o código; o outro entra com ele.</p>
          <div class="duo-who">
            <span>VOCÊ JOGA COM</span>
            ${slots.map((s) => `<button class="duo-slot ${s.n === App.activeSlot ? 'on' : ''}" onclick="Duo.pickSlot(${s.n})">${esc(s.info.name.toUpperCase())}<small>Carreira ${s.n} • ${esc(s.info.chapter)}</small></button>`).join('')}
          </div>
          <div class="duo-actions">
            <button class="duo-btn primary" onclick="Duo.createRoom()">➕ CRIAR SALA<small>você recebe um código para mandar</small></button>
            <div class="duo-join">
              <input id="duo-code-input" class="duo-code-input" maxlength="5" placeholder="CÓDIGO" autocomplete="off" autocapitalize="characters" spellcheck="false" onkeydown="if(event.key==='Enter')Duo.joinRoom()">
              <button class="duo-btn" onclick="Duo.joinRoom()">ENTRAR ▶</button>
            </div>
          </div>
          ${err}
          <p class="duo-note">Dica: os dois no Wi-Fi conectam melhor. Algumas redes de celular (4G) bloqueiam a ligação direta.</p>`;
      } else if (this.view === 'waiting' || this.view === 'connecting') {
        const waiting = this.view === 'waiting';
        body = `
          <div class="duo-wait">
            ${waiting
              ? this.code
                ? `<span class="duo-cap">CÓDIGO DA SALA</span>
                   <div class="duo-code" onclick="Duo.copyCode()" title="Copiar">${esc(this.code)}</div>
                   <button class="duo-btn small" onclick="Duo.copyCode()">📋 COPIAR</button>
                   <p class="duo-lead">Mande esse código para o seu amigo. Ele abre <b>🤝 MODO DUPLA</b>, digita o código e toca em <b>ENTRAR</b>.</p>`
                : '<span class="duo-cap">CRIANDO A SALA...</span><div class="duo-spinner"></div>'
              : `<span class="duo-cap">ENTRANDO NA SALA</span><div class="duo-code dim">${esc(this.code || '')}</div><div class="duo-spinner"></div>`}
          </div>
          <div class="duo-cards">${this.card(me, 'me')}${this.card(null)}</div>
          ${err}
          <div class="duo-actions row"><button class="duo-btn ghost" onclick="Duo.leaveRoom()">CANCELAR</button></div>`;
      } else if (this.view === 'room' || this.view === 'result') {
        const host = Net.role === 'host';
        const r = RIVALS.find((x) => x.id === this.rival) || RIVALS[0];
        const result = this.view === 'result' && this.result ? this.resultHtml() : '';
        body = `
          ${result}
          <div class="duo-room-bar"><span>SALA <b>${esc(this.code || '')}</b></span><span id="duo-ping" class="duo-ping">…</span></div>
          <div class="duo-cards">${this.card(me, 'me')}<div class="duo-vs">+</div>${this.card(this.partner, 'mate')}</div>
          ${err}
          <div class="duo-modes">
            <div class="duo-mode on">
              <div class="duo-mode-title">⚽ AMISTOSO EM DUPLA</div>
              <div class="duo-mode-desc">Vocês dois no mesmo time contra um rival do Blue Lock. Primeiro a 3 gols (ou o placar quando o tempo acabar). Vale EgoCoins para os dois.</div>
              <div class="duo-rivals">
                ${RIVALS.map((x) => `<button class="duo-rival ${x.id === r.id ? 'on' : ''}" ${host ? `onclick="Duo.setRival('${x.id}')"` : 'disabled'}><b>${esc(x.name)}</b><small>${esc(x.sub)}</small></button>`).join('')}
              </div>
              ${host
                ? `<button class="duo-btn primary big" ${this.partner ? '' : 'disabled'} onclick="Duo.startFriendly()">▶ COMEÇAR A PARTIDA</button>`
                : `<div class="duo-waithost">Esperando <b>${esc(this.partner?.profile?.name || 'o dono da sala')}</b> começar a partida...</div>`}
            </div>
            <div class="duo-mode soon">
              <div class="duo-mode-title">📖 CARREIRA EM DUPLA</div>
              <div class="duo-mode-desc">Uma história nova, só de vocês dois, com cenas e lore próprias. Em construção.</div>
            </div>
          </div>
          <div class="duo-actions row"><button class="duo-btn ghost" onclick="Duo.leaveRoom()">SAIR DA SALA</button></div>`;
      }
      el.innerHTML = `<div class="duo-box">${head}${body}</div>`;
      this.drawCards();
      this.renderPing();
      const input = document.getElementById('duo-code-input');
      if (input && this.view === 'menu' && !window.IS_TOUCH) input.focus();
    },

    resultHtml() {
      const { res, myRep, otherRep, coins } = this.result;
      if (!res) return '';
      const title = res.forfeit ? (res.by === 'me' ? 'VOCÊ SAIU DA PARTIDA' : 'PARTIDA ENCERRADA') : res.won ? 'VITÓRIA DA DUPLA!' : res.draw ? 'EMPATE' : 'DERROTA';
      const cls = res.forfeit ? 'lose' : res.won ? 'win' : res.draw ? 'draw' : 'lose';
      const line = (name, rep) =>
        rep
          ? `<div class="duo-res-line"><b>${esc(name)}</b><span>⚽ ${rep.goals} gol(s) • 🎯 ${rep.onTarget}/${rep.shots} • 🌀 ${rep.dribbles} dribles • 🛡️ ${rep.steals} desarmes</span><i style="color:${rep.color}">${rep.grade}</i></div>`
          : '';
      return `
        <div class="duo-result ${cls}">
          <div class="duo-res-title">${title}</div>
          <div class="duo-res-score">DUPLA ${res.sh} x ${res.sa}</div>
          ${line(this.me?.profile?.name || 'Você', myRep)}
          ${line(this.partner?.profile?.name || 'Parceiro', otherRep)}
          ${coins ? `<div class="duo-res-coins">+${coins} EgoCoins na sua carreira</div>` : ''}
        </div>`;
    }
  };

  window.Duo = Duo;

  // Botão na tela inicial
  const orig = App.renderTitleMenu;
  App.renderTitleMenu = function () {
    orig.apply(this, arguments);
    const box = document.getElementById('title-menu');
    if (!box || (this.titleMode && this.titleMode !== 'main') || !Duo.hasCareer()) return;
    if (box.querySelector('.title-duo')) return;
    const b = document.createElement('button');
    b.className = 'title-btn duo title-duo';
    b.innerHTML = '🤝 MODO DUPLA<small>Jogue online com um amigo</small>';
    b.onclick = () => Duo.open();
    const shop = box.querySelector('.title-btn.shop');
    if (shop) box.insertBefore(b, shop);
    else box.appendChild(b);
  };
  App.renderTitleMenu();
})();
