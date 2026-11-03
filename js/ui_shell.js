// ============================================================================
// UI SHELL — barra de abas, cabeçalho do jogador, tela inicial, modais e avisos.
// Só acrescenta enfeites (elementos decorativos) e embrulha funções do App sem
// mudar o que elas fazem. O visual fica em css/ui_shell.css.
// ============================================================================
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    n.className = cls;
    if (html) n.innerHTML = html;
    n.setAttribute('aria-hidden', 'true');
    return n;
  };

  // Reinicia uma animação de "uma vez só" (sem piscar: só roda quando chamada)
  const replay = (node, cls) => {
    if (!node) return;
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  };

  // ---------------------------------------------------------------- fundo da página
  if (!$('.sh-page-bg')) document.body.prepend(el('div', 'sh-page-bg'));

  // ---------------------------------------------------------------- barra de abas
  const nav = $('nav.top-nav-bar');
  if (nav && !$('.sh-brand', nav)) {
    nav.prepend(el('div', 'sh-brand', '<span class="sh-brand-mark">BL</span><span class="sh-brand-txt"><b>BLUE LOCK</b><small>EGOIST CAREER</small></span>'));
    const TAB_COLORS = { HISTORIA: '#00f5d4', FLUXO: '#ef4444', LOJA: '#4ade80', CONQUISTAS: '#facc15' };
    nav.querySelectorAll('.top-tab-btn').forEach((b) => {
      const c = TAB_COLORS[b.dataset.tab];
      if (c) b.style.setProperty('--tab', c);
    });
  }

  // ---------------------------------------------------------------- cabeçalho (moedas)
  const CUR = [
    ['.js-spins', 'GIROS', '#00f5d4'],
    ['.js-lucky', 'SORTE', '#4ade80'],
    ['.js-sp', 'SP', '#f59e0b'],
    ['.js-egocoins', 'EGOCOINS', '#60a5fa']
  ];
  document.querySelectorAll('.ego-subheader .currency-item').forEach((item) => {
    const def = CUR.find(([sel]) => item.querySelector(sel));
    if (!def || item.classList.contains('sh-cur')) return;
    const label = item.firstElementChild;
    if (label && !label.className) {
      label.className = 'sh-cur-label';
      label.textContent = def[1];
    }
    item.classList.add('sh-cur');
    item.style.setProperty('--cur', def[2]);
  });
  const sub = $('.ego-subheader');
  if (sub && !$('.sh-sub-fx', sub)) sub.prepend(el('div', 'sh-sub-fx'));

  // ---------------------------------------------------------------- tela inicial
  const title = $('#title-screen');
  if (title && !$('.sh-title-fx', title)) {
    const fx = el('div', 'sh-title-fx',
      '<div class="sh-title-slash"></div>' +
      '<div class="sh-title-mark">EGO</div>' +
      '<div class="sh-title-bar sh-top"><span>PROJETO <b>BLUE LOCK</b> • JFU</span><span class="sh-title-rec">● ARQUIVO DO EGOÍSTA</span></div>' +
      '<div class="sh-title-bar sh-bottom"><span></span><span>ESCOLHA SUA <b>CARREIRA</b> ▶</span></div>');
    const cv = $('#title-canvas', title);
    if (cv) cv.after(fx);
    else title.prepend(fx);
  }

  // ---------------------------------------------------------------- modais
  // A cor de destaque de cada caixa vem da borda inline que o app já define
  const accentOf = (box) => {
    if (box.classList.contains('defeat-box')) return '#ef4444';
    const bc = box.style.borderTopColor;
    if (bc) return bc;
    const badge = box.querySelector('.cinematic-badge');
    return (badge && badge.style.backgroundColor) || '';
  };
  const decorateBoxes = (root) => {
    if (!root) return;
    root.querySelectorAll('.cinematic-box, .pause-box').forEach((box) => {
      const acc = accentOf(box);
      if (acc) box.style.setProperty('--sh-acc', acc);
      else box.style.removeProperty('--sh-acc');
    });
  };
  ['cinematic-modal-content', 'match-intro-modal', 'pause-overlay'].forEach((id) => {
    const root = document.getElementById(id);
    if (!root) return;
    decorateBoxes(root);
    new MutationObserver(() => decorateBoxes(root)).observe(root, { childList: true });
  });

  // ---------------------------------------------------------------- App
  const App = window.App;
  if (!App) return;

  const origHeader = App.updateTopHeader;
  Object.assign(App, {
    // Só as abas de verdade trocam de aba (antes o SOM e o MENU também chamavam
    // switchTab(undefined) e a tela ficava vazia depois de mutar o som)
    bindNavigation() {
      document.querySelectorAll('.top-tab-btn').forEach((btn) => {
        if (!btn.dataset.tab) return;
        btn.addEventListener('click', () => {
          const tab = btn.dataset.tab;
          this.switchTab(tab);
        });
      });
    },

    // Mesmo cabeçalho de antes; depois disso, o OVR e o capítulo ganham marcação
    // própria (só dentro do cabeçalho) e os números que mudaram dão um "pulo"
    updateTopHeader() {
      origHeader.call(this);
      const head = document.querySelector('.ego-subheader');
      if (!head) return;
      const ovrEl = head.querySelector('.js-player-ovr');
      if (ovrEl) {
        const ovr = this.calculateOVR();
        if (ovrEl.dataset.shVal !== String(ovr)) {
          const had = ovrEl.dataset.shVal !== undefined;
          ovrEl.dataset.shVal = String(ovr);
          ovrEl.innerHTML = `<small>OVR</small><b>${ovr}</b>`;
          if (had) replay(ovrEl, 'sh-pop');
        } else if (!ovrEl.querySelector('b')) {
          ovrEl.innerHTML = `<small>OVR</small><b>${ovr}</b>`;
        }
      }
      const note = head.querySelector('.js-chapter-note');
      if (note) {
        const ch = window.CAREER_CHAPTERS[this.state.currentChapterIndex];
        const rank = this.getBlueLockRank();
        const parts = [];
        if (rank) parts.push(`<span class="sh-rank"><small>RANKING BL</small><b>#${rank}</b></span>`);
        if (ch) {
          // Só a parte principal da era (a frase inteira espremia o seu nome no topo: "YORI TRI...");
          // a completa fica no title (passar o mouse)
          const era = String(ch.era || '').split('—')[0].trim();
          parts.push(`<span class="sh-chap"><small>CAP. ${ch.chapterNumber}</small><b>${era}</b></span>`);
        } else {
          parts.push('<span class="sh-chap"><small>FIM</small><b>CAMPEÃO DO MUNDO</b></span>');
        }
        note.innerHTML = parts.join('');
        note.title = ch ? `Cap. ${ch.chapterNumber} • ${ch.era}` : note.textContent;
      }
      head.querySelectorAll('.sh-cur').forEach((item) => {
        const v = item.querySelector('span:last-child');
        if (!v) return;
        const now = v.textContent;
        if (item.dataset.shVal !== undefined && item.dataset.shVal !== now) replay(v, 'sh-pop');
        item.dataset.shVal = now;
      });
    },

    // Mesmo aviso de antes + cor de destaque e a barrinha de tempo
    notify(msg, color = '#38bdf8') {
      const toast = document.getElementById('ego-toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.style.borderColor = color;
      toast.style.setProperty('--sh-acc', color);
      replay(toast, 'sh-tick');
      toast.classList.add('show');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => toast.classList.remove('show'), 3800);
    }
  });

  // Menu da tela inicial: cada botão ganha seu índice (decorativo) e a seta
  const origTitleMenu = App.renderTitleMenu;
  App.renderTitleMenu = function () {
    origTitleMenu.apply(this, arguments);
    const box = document.getElementById('title-menu');
    if (!box) return;
    box.querySelectorAll('.title-btn').forEach((b, i) => b.style.setProperty('--i', i));
    replay(box, 'sh-in');
  };
})();
