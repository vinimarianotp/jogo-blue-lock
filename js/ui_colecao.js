// ============================================================================
// ui_colecao — visual "coleção / gacha premium" das abas ARMAS, FLUXO e LOJA e
// da roleta (playSpinReelAnimation / playRarityBurst). Mesmo estilo da aba
// ATRIBUTOS: navy escuro, painéis com cantos cortados e borda neon, tipografia
// itálica 900, linhas de velocidade e granulação estática. CSS em css/ui_colecao.css.
// Só troca o desenho: custos, confirmações, giros da sorte e handlers são os mesmos.
// ============================================================================
(function () {
  if (!window.App) return;
  const App = window.App;

  const TIERS = ['COMUM', 'INCOMUM', 'RARO', 'EPICO', 'LENDARIO', 'MITICO', 'WORLD_CLASS'];
  const STAT_NAMES = {
    velocidade: 'Velocidade', resistencia: 'Resistência', forca: 'Força', habilidadeAerea: 'Hab. Aérea',
    finalizando: 'Finalização', poderDisparo: 'Poder de Disparo', tirosLongos: 'Tiros Longos', conducao: 'Condução',
    visao: 'Visão', posicionamento: 'Posicionamento', compostura: 'Compostura', ego: 'Ego'
  };

  // Raridade: cor, nome curto, nível (0..6) e se ganha brilho holográfico (Lendário+)
  const rinfo = (key) => {
    const all = window.RARITY_TIERS;
    const r = all[key] || all.COMUM;
    const tier = Math.max(0, TIERS.indexOf(r.id));
    return {
      r,
      tier,
      short: r.id === 'WORLD_CLASS' ? 'WORLD CLASS' : r.name.toUpperCase(),
      cls: `col-r${tier}${tier >= 4 ? ' col-holo' : ''}`
    };
  };
  // "Big Bang Drive (Demônio da Área)" -> ["Big Bang Drive", "Demônio da Área"]
  const splitName = (name) => {
    const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(name || '');
    return m && m[1] ? [m[1], m[2]] : [name || '', ''];
  };
  const pips = (tier) => `<span class="col-pips" aria-hidden="true">${TIERS.map((_, i) => `<i${i <= tier ? ' class="on"' : ''}></i>`).join('')}</span>`;
  const luckyPct = (key) => (window.LUCKY_CHANCES ? window.LUCKY_CHANCES[key] : 0);
  const fmtPct = (v) => String(v).replace('.', ',');
  const flowChips = (fl) => window.describeFlow(fl).split(' • ').filter(Boolean).map((t) => `<span class="col-chip">${t}</span>`).join('');
  // Efeitos do fluxo como peças grandes (valor + rótulo) na base da vitrine
  // (cada Fluxo tem uma passiva própria: o nome dela e o que ela faz)
  const flowTiles = (fl) => {
    const list = fl.effects || (fl.effect ? [{ effect: fl.effect, effectDesc: fl.effectDesc }] : []);
    return list.map((e) => `<div class="col-fx-tile"><b>${e.effect}</b><small>${e.effectDesc}</small></div>`).join('');
  };
  const LETTERBOX =(l, r) => `<div class="col-letterbox"><span>${l}</span><span>${r}</span></div>`;

  // ---------------------------------------------------------------------------
  // Retratos em pixel art (personagem que inspirou a arma; para fluxo, você com a
  // aura do fluxo). Desenhados uma vez e guardados como imagem.
  // ---------------------------------------------------------------------------
  const portraitCache = new Map();

  Object.assign(App, {
    colHeroFor(item, isWeapon) {
      let hero = null;
      if (isWeapon) {
        hero = (item.id && item.id.startsWith('wp_char_') && window.findCharacter && window.findCharacter(item.id.slice(8))) ||
          (window.BLUE_LOCK_CHARACTERS || []).find((c) => window.weaponInspiredBy(item, c.name)) || null;
      }
      if (hero) return { hero, player: false };
      const p = this.state.profile;
      return {
        player: true,
        hero: { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' }
      };
    },

    colPortraitKey(item, isWeapon, w, h, mode, player) {
      const aura = isWeapon ? (window.RARITY_TIERS[item.rarity] || {}).color : item.color;
      const p = this.state.profile;
      return `${item.id}|${w}x${h}|${mode}|${aura}|${player ? [p.hairStyle, p.hairColor, p.hairSecondary, p.skinColor, p.eyeColor, p.eyeStyle].join(',') : ''}`;
    },

    // mode 'bust' = cabeça e tronco (cartas); 'full' = corpo quase inteiro (vitrine)
    colPortrait(item, isWeapon, w, h, mode = 'bust') {
      if (!item || !window.PixelRenderer) return '';
      const { hero, player } = this.colHeroFor(item, isWeapon);
      const aura = isWeapon ? (window.RARITY_TIERS[item.rarity] || {}).color : item.color;
      const key = this.colPortraitKey(item, isWeapon, w, h, mode, player);
      if (portraitCache.has(key)) return portraitCache.get(key);
      let url = '';
      try {
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext('2d');
        // Sprite: caixa S x 1.1S, corpo inteiro. Bust mostra ~62% de cima; full ~96%
        const show = mode === 'bust' ? 0.6 : 0.97;
        const S = h / (1.1 * show);
        const ox = (w - S) / 2;
        const oy = mode === 'bust' ? h * 0.05 : h * 0.02;
        const data = Object.assign({}, hero, { auraColor: aura || '#38bdf8' });
        const opts = { facing: 'front', frame: 4, animState: 'idle', auraColor: aura };
        ctx.translate(ox, oy);
        window.PixelRenderer.drawCharacterSprite(ctx, data, S, S * 1.1, Object.assign({ showAura: true }, opts));
        // Retrato parado: tira as faíscas brancas soltas da aura (num quadro fixo
        // viram pontinhos perdidos). Faísca = pixel branco fora da silhueta do corpo.
        const body = document.createElement('canvas');
        body.width = w;
        body.height = h;
        const bctx = body.getContext('2d');
        bctx.translate(ox, oy);
        window.PixelRenderer.drawCharacterSprite(bctx, data, S, S * 1.1, Object.assign({ showAura: false }, opts));
        const img = ctx.getImageData(0, 0, w, h);
        const bod = bctx.getImageData(0, 0, w, h).data;
        const px = img.data;
        const hex = String(aura || '').replace('#', '');
        const light = hex.length === 6 && ['0', '2', '4'].every((o) => parseInt(hex.substr(+o, 2), 16) > 190);
        if (!light) {
          for (let i = 0; i < px.length; i += 4) {
            if (bod[i + 3] === 0 && px[i + 3] > 8 && px[i] > 200 && px[i + 1] > 200 && px[i + 2] > 200) px[i + 3] = 0;
          }
          ctx.putImageData(img, 0, 0);
        }
        url = cv.toDataURL('image/png');
      } catch (e) {
        url = '';
      }
      portraitCache.set(key, url);
      return url;
    },

    // Versão preguiçosa para o catálogo (70+ cartas): se o retrato ainda não existe,
    // devolve um <img> vazio e desenha aos poucos, sem travar a abertura da aba
    colLazyImg(item, isWeapon, w, h, mode) {
      const { player } = this.colHeroFor(item, isWeapon);
      const key = this.colPortraitKey(item, isWeapon, w, h, mode, player);
      const done = portraitCache.get(key);
      if (done) return `<img src="${done}" alt="">`;
      this._colLazy = this._colLazy || { q: [], ids: new Map(), n: 0, busy: false };
      const L = this._colLazy;
      if (!L.ids.has(key)) {
        L.ids.set(key, `cp${++L.n}`);
        L.q.push({ item, isWeapon, w, h, mode, key, id: L.ids.get(key) });
      }
      const id = L.ids.get(key);
      if (!L.busy) {
        L.busy = true;
        const pump = () => {
          const t0 = performance.now();
          while (L.q.length && performance.now() - t0 < 12) {
            const job = L.q.shift();
            const url = this.colPortrait(job.item, job.isWeapon, job.w, job.h, job.mode);
            document.querySelectorAll(`img[data-pid="${job.id}"]`).forEach((im) => { im.src = url; });
            L.ids.delete(job.key);
          }
          if (L.q.length) setTimeout(pump, 16);
          else L.busy = false;
        };
        setTimeout(pump, 30);
      }
      return `<img data-pid="${id}" alt="">`;
    },

    // Entrada da aba (uma vez, quando ela acabou de abrir)
    colIntro(tab) {
      const root = document.getElementById(`col-root-${tab}`);
      if (!root) return false;
      const vis = root.offsetParent !== null;
      this._colVis = this._colVis || {};
      const intro = vis && !this._colVis[tab];
      this._colVis[tab] = vis;
      if (intro) {
        root.classList.remove('col-intro');
        void root.offsetWidth;
        root.classList.add('col-intro');
        clearTimeout(root._colT);
        root._colT = setTimeout(() => root.classList.remove('col-intro'), 1100);
      }
      return vis;
    },

    // Monta o esqueleto novo da aba (uma vez). Os ids antigos continuam existindo.
    colSkeleton(tab) {
      const panel = document.getElementById(`tab-${tab}`);
      if (!panel || panel.dataset.colBuilt === '1') return panel;
      const hero = (kicker, title, wm, desc, l, rr, side) => `
        <section class="col-hero col-frame col-grain">
          <div class="col-hero-lines" aria-hidden="true"></div>
          <div class="col-hero-wm" aria-hidden="true">${wm}</div>
          ${LETTERBOX(l, rr)}
          <div class="col-hero-grid">
            <div class="col-hero-title">
              <div class="col-kicker">${kicker}</div>
              <h2>${title}</h2>
              <p>${desc}</p>
              <div class="col-legend" id="col-legend-${tab}"></div>
            </div>
            <div class="col-hero-side">${side}</div>
          </div>
        </section>`;
      if (tab === 'ARMAS') {
        panel.innerHTML = `
          <div class="col-root col-armas" id="col-root-ARMAS">
            ${hero('ROLETA DE', 'ARMAS', 'ARMAS', 'Você não escolhe e não guarda armas: a que sair na roleta é a sua até você girar de novo.', 'EGOIST <b>ARSENAL</b>', 'ROLETA SEM VOLTA', `
              <div id="weapon-spin-buttons" class="col-spin-console"></div>`)}
            <div id="weapon-lock-status" class="col-status"></div>
            <div class="col-slots">
              <div id="weapon-slot-1-box" class="col-slot-box"></div>
              <div id="weapon-slot-2-box" class="col-slot-box"></div>
            </div>
            <div class="col-sec-head"><span class="col-sec-tag">CATÁLOGO</span><h3>TUDO QUE PODE SAIR NA ROLETA</h3><span class="col-sec-meta" id="col-count-ARMAS"></span></div>
            <div id="weapons-catalog-grid" class="col-catalog"></div>
          </div>`;
      } else if (tab === 'FLUXO') {
        panel.innerHTML = `
          <div class="col-root col-fluxo" id="col-root-FLUXO">
            ${hero('ESTADO DE', 'FLUXO', 'FLOW', 'Até a Liga Neo Egoísta você possui 1 Fluxo. Na NEL você libera o 2º slot e desperta o <b>Metavision</b> ou o <b>Predator Eye</b>!', 'EGOIST <b>FLOW</b>', 'TECLA G EM CAMPO', `
              <div id="flow-spin-buttons" class="col-spin-console"></div>`)}
            <div id="flow-slots-container" class="col-slots"></div>
            <div class="col-sec-head"><span class="col-sec-tag col-tag-nel">NEL</span><h3>EVOLUÇÕES DESPERTADAS NA LIGA NEO EGOÍSTA</h3><span class="col-sec-meta" id="col-evo-meta"></span></div>
            <div id="nel-evolutions-container" class="col-evos"></div>
            <div class="col-sec-head"><span class="col-sec-tag">CATÁLOGO</span><h3>TODOS OS FLUXOS QUE PODEM SAIR NA ROLETA</h3><span class="col-sec-meta" id="col-count-FLUXO"></span></div>
            <div id="flows-catalog-grid" class="col-catalog"></div>
          </div>`;
      } else if (tab === 'LOJA') {
        panel.innerHTML = `<div class="col-root col-loja" id="col-root-LOJA"><div id="shop-box"></div></div>`;
      }
      panel.dataset.colBuilt = '1';
      return panel;
    },

    colLegendHtml() {
      return TIERS.map((k) => {
        const ri = rinfo(k);
        return `<span class="col-leg" style="--rc:${ri.r.color}"><i></i>${ri.short}<b>${fmtPct(ri.r.chance)}%</b></span>`;
      }).join('');
    },

    // ==========================================================================
    // ABA ARMAS
    // ==========================================================================
    renderWeaponsTab() {
      if (!this.colSkeleton('ARMAS')) return;
      const lockBanner = document.getElementById('weapon-lock-status');
      const slot1Box = document.getElementById('weapon-slot-1-box');
      const slot2Box = document.getElementById('weapon-slot-2-box');
      const listBox = document.getElementById('weapons-catalog-grid');
      if (!slot1Box || !listBox) return;
      const st = this.state;
      const vis = document.getElementById('col-root-ARMAS').offsetParent !== null;

      const legend = document.getElementById('col-legend-ARMAS');
      if (legend) legend.innerHTML = this.colLegendHtml();

      if (!st.blueLockEntered) {
        lockBanner.innerHTML = `<div class="col-strip col-strip-lock"><span class="col-strip-tag">🔒 BLOQUEADA</span><span><strong>ROLETA BLOQUEADA:</strong> você descobre sua Arma quando entra no <strong>BLUE LOCK</strong>. Jogue o Prólogo na aba HISTÓRIA.</span></div>`;
      } else if (!st.nelUnlocked) {
        lockBanner.innerHTML = `<div class="col-strip col-strip-info"><span class="col-strip-tag">⚡ 1 SLOT</span><span>Você tem <strong>1 slot de Arma</strong>. O <strong>2º slot</strong> abre quando você vencer a Sub-20 e entrar na <strong>Liga Neo Egoísta</strong>.</span></div>`;
      } else {
        lockBanner.innerHTML = `<div class="col-strip col-strip-nel"><span class="col-strip-tag">👑 NEL</span><span><strong>LIGA NEO EGOÍSTA:</strong> você usa <strong>2 Armas</strong> ao mesmo tempo (teclas 1-2-3 e 4-5-6).</span></div>`;
      }

      const renderSlot = (wp, slotNum, locked) => {
        const num = `<div class="col-show-num" aria-hidden="true">0${slotNum}</div>`;
        if (locked) {
          return `
            <article class="col-show col-frame col-grain col-locked">
              ${num}
              ${LETTERBOX(`SLOT <b>${slotNum}</b> • ARMA`, 'BLOQUEADO')}
              <div class="col-void">
                <div class="col-void-emblem">🔒</div>
                <h3>SLOT DE ARMA ${slotNum}</h3>
                <p>Bloqueado — requer ${slotNum === 1 ? '<b>entrada no Blue Lock</b>' : '<b>chegar na Liga NEL</b>'}</p>
              </div>
            </article>`;
        }
        if (!wp) {
          return `
            <article class="col-show col-frame col-grain col-empty">
              ${num}
              ${LETTERBOX(`SLOT <b>${slotNum}</b> • ARMA`, 'VAZIO')}
              <div class="col-void">
                <div class="col-void-emblem col-void-q">?</div>
                <h3>NENHUMA ARMA AINDA</h3>
                <p>Gire a roleta — a arma que sair é a sua!</p>
                <button class="col-cta" onclick="App.spinWeaponGacha(${slotNum})"><span>🎲 GIRAR AGORA</span></button>
              </div>
            </article>`;
        }
        const ri = rinfo(wp.rarity);
        const r = ri.r;
        const keyOffset = slotNum === 2 ? 3 : 0;
        const [main, sub] = splitName(wp.name);
        const pic = vis ? this.colPortrait(wp, true, 300, 330, 'full') : '';
        const ps = window.getWeaponPassive(wp);
        return `
          <article class="col-show col-frame col-grain ${ri.cls}" style="--rc:${r.color}">
            <div class="col-show-slash" aria-hidden="true"></div>
            ${num}
            ${pic ? `<img class="col-show-pic" src="${pic}" alt="">` : ''}
            ${LETTERBOX(`SLOT <b>${slotNum}</b> • ARMA EQUIPADA`, `TECLAS ${1 + keyOffset}·${2 + keyOffset}·${3 + keyOffset}`)}
            <div class="col-show-body">
              <div class="col-show-top">
                <span class="col-rar-tag">${ri.short}</span>${pips(ri.tier)}
              </div>
              <h3 class="col-show-name">${main}</h3>
              ${sub ? `<div class="col-show-sub">${sub}</div>` : ''}
              <div class="col-show-meta">
                <span class="col-ovr"><b>+${r.ovrBonus}</b><small>OVR</small></span>
                <span class="col-insp"><small>INSPIRAÇÃO</small><b>${wp.inspiration}</b></span>
              </div>
              <p class="col-show-desc">${wp.desc}</p>
              ${ps ? `<div class="col-passive"><span class="col-passive-tag">PASSIVA</span><b>${ps.name}</b><small>${window.describePassive(ps)}</small></div>` : ''}
            </div>
            <div class="col-skills">
              ${wp.skills.map((sk, i) => `
                <div class="col-skill" style="--sk:${sk.color}">
                  <kbd>${i + 1 + keyOffset}</kbd>
                  <div class="col-skill-txt"><b>${sk.name}</b><small>${sk.desc}</small></div>
                  <span class="col-cd">${sk.cd}s</span>
                </div>`).join('')}
            </div>
          </article>`;
      };

      slot1Box.innerHTML = renderSlot(st.equippedWeapon, 1, !st.blueLockEntered);
      slot2Box.innerHTML = renderSlot(st.equippedWeapon2, 2, !st.nelUnlocked);

      const spinBox = document.getElementById('weapon-spin-buttons');
      if (spinBox) spinBox.innerHTML = this.spinButtonsHtml('spinWeaponGacha', '🎲 GIRAR ARMA');

      const count = document.getElementById('col-count-ARMAS');
      if (count) count.textContent = `${window.WEAPONS_DB.length} ARMAS • ${TIERS.length} RARIDADES`;

      // Catálogo só de consulta: não dá para escolher nem guardar armas
      listBox.innerHTML = this.renderRarityGroups(window.WEAPONS_DB, 'armas', (wp) => {
        const ri = rinfo(wp.rarity);
        const r = ri.r;
        const slot = st.equippedWeapon?.id === wp.id ? 1 : st.equippedWeapon2?.id === wp.id ? 2 : 0;
        const [main, sub] = splitName(wp.name);
        const pic = vis ? this.colLazyImg(wp, true, 132, 112, 'bust') : '';
        const ps = window.getWeaponPassive(wp);
        return `
          <div class="col-card ${ri.cls}${slot ? ' is-mine' : ''}" style="--rc:${r.color}">
            <div class="col-card-art">
              ${pic}
              <span class="col-card-rar">${ri.short}</span>
              <span class="col-card-ovr">+${r.ovrBonus}<small>OVR</small></span>
              ${slot ? `<span class="col-card-mine">✓ SUA ARMA • SLOT ${slot}</span>` : ''}
            </div>
            <div class="col-card-body">
              <h4>${main}</h4>
              ${sub ? `<div class="col-card-sub">${sub}</div>` : ''}
              <div class="col-card-insp">${wp.inspiration}</div>
              <ul class="col-card-skills">
                ${wp.skills.map((s) => `<li><kbd>${s.key}</kbd><div><b>${s.name}</b><span>${s.desc}</span></div></li>`).join('')}
              </ul>
              ${ps ? `<div class="col-card-passive"><span>PASSIVA</span><b>${ps.name}</b><small>${window.describePassive(ps)}</small></div>` : ''}
            </div>
          </div>`;
      });
      this.colIntro('ARMAS');
    },

    // Caixinha da passiva (mantida para quem ainda chama)
    passiveHtml(wp) {
      const ps = window.getWeaponPassive(wp);
      if (!ps) return '';
      return `<div class="passive-chip"><span class="passive-tag">PASSIVA</span><strong>${ps.name}</strong><small>${window.describePassive(ps)}</small></div>`;
    },

    // Botões de giro de um slot: normal (giro/250 coins) e da sorte (🍀)
    spinButtonsHtml(fn, label) {
      const c = this.state.currencies;
      const lucky = c.luckySpins || 0;
      const nel = this.state.nelUnlocked;
      const slots = nel ? [1, 2] : [1];
      const cost = c.spins > 0 ? `USA 1 GIRO • VOCÊ TEM ${c.spins}` : c.egoCoins >= 250 ? 'CUSTA 250 EGOCOINS' : 'SEM GIROS NEM 250 EGOCOINS';
      const locked = !this.state.blueLockEntered;
      return slots
        .map((s) => `
          <div class="col-spin-group${locked ? ' is-locked' : ''}">
            ${nel ? `<span class="col-spin-slot">SLOT<b>${s}</b></span>` : ''}
            <button class="col-spin-btn" onclick="App.${fn}(${s})"><span><b>${label}${nel ? ` • SLOT ${s}` : ''}</b><small>${locked ? '🔒 BLOQUEADO NO PRÓLOGO' : cost}</small></span></button>
            <button class="col-spin-btn col-lucky${lucky ? '' : ' empty'}" onclick="App.${fn}(${s}, false, true)"><span><b>🍀 GIRO DA SORTE</b><small>${lucky ? `VOCÊ TEM ${lucky}` : 'NENHUM • COMPRAR NA LOJA'}</small></span></button>
          </div>`)
        .join('');
    },

    // Catálogo em ordem: da raridade mais alta (World Class) para a mais baixa;
    // dentro dela, em ordem alfabética
    renderRarityGroups(items, noun, cardFn) {
      return TIERS.slice()
        .reverse()
        .map((key) => {
          const ri = rinfo(key);
          const group = items.filter((it) => it.rarity === key).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
          if (!group.length) return '';
          return `
            <div class="col-rgroup col-r${ri.tier}" style="--rc:${ri.r.color}; --n:${group.length}">
              <div class="col-rgroup-head">
                <span class="col-rgroup-tag">${ri.short}</span>
                ${pips(ri.tier)}
                <span class="col-rgroup-meta"><b>${group.length}</b> ${noun} • <b>${fmtPct(ri.r.chance)}%</b> no giro • <b class="col-green">${fmtPct(luckyPct(key))}%</b> no giro da sorte</span>
                <i class="col-rgroup-line"></i>
              </div>
              <div class="col-grid">${group.map(cardFn).join('')}</div>
            </div>`;
        })
        .join('');
    },

    // ==========================================================================
    // ABA FLUXO
    // ==========================================================================
    renderFlowsTab() {
      if (!this.colSkeleton('FLUXO')) return;
      const slotBox = document.getElementById('flow-slots-container');
      const evoBox = document.getElementById('nel-evolutions-container');
      const listBox = document.getElementById('flows-catalog-grid');
      if (!slotBox || !listBox) return;
      const st = this.state;
      const vis = document.getElementById('col-root-FLUXO').offsetParent !== null;

      const legend = document.getElementById('col-legend-FLUXO');
      if (legend) legend.innerHTML = this.colLegendHtml();

      const fl1 = st.equippedFlow;
      const fl2 = st.equippedFlow2;

      const flowSlot = (fl, slotNum) => {
        const num = `<div class="col-show-num" aria-hidden="true">0${slotNum}</div>`;
        const title = slotNum === 1 ? 'FLUXO PRINCIPAL' : '2º FLUXO SINÉRGICO';
        const lockedNel = slotNum === 2 && !st.nelUnlocked;
        const lockedPro = slotNum === 1 && !st.blueLockEntered;
        if (lockedNel || lockedPro) {
          return `
            <article class="col-show col-frame col-grain col-locked">
              ${num}
              ${LETTERBOX(`SLOT <b>${slotNum}</b> • ${title}`, 'BLOQUEADO')}
              <div class="col-void">
                <div class="col-void-emblem">🔒</div>
                <h3>${lockedNel ? 'DESBLOQUEIA NA LIGA NEO EGOÍSTA' : 'BLOQUEADO NO PRÓLOGO'}</h3>
                <p>${lockedNel ? 'Ao chegar na NEL você combina um segundo Fluxo e desperta <b>Metavision</b> / <b>Predator Eye</b>!' : 'Gire um Fluxo após entrar no <b>Blue Lock</b>!'}</p>
              </div>
            </article>`;
        }
        if (!fl) {
          return `
            <article class="col-show col-frame col-grain col-empty">
              ${num}
              ${LETTERBOX(`SLOT <b>${slotNum}</b> • ${title}`, 'VAZIO')}
              <div class="col-void">
                <div class="col-void-emblem col-void-q">?</div>
                <h3>${slotNum === 1 ? 'NENHUM FLUXO EQUIPADO' : 'GIRE A ROLETA DO 2º SLOT'}</h3>
                <p>${slotNum === 1 ? 'Gire um Fluxo — o que sair é o seu estado de fluxo em campo.' : 'Ao chegar na NEL você combina um segundo Fluxo e desperta Metavision / Predator Eye!'}</p>
                <button class="col-cta" onclick="App.spinFlowGacha(${slotNum})"><span>🔥 GIRAR AGORA</span></button>
              </div>
            </article>`;
        }
        const ri = rinfo(fl.rarity);
        const [main, sub] = splitName(fl.name);
        const pic = vis ? this.colPortrait(fl, false, 300, 330, 'full') : '';
        return `
          <article class="col-show col-frame col-grain col-show-flow ${ri.cls}" style="--rc:${ri.r.color}; --fc:${fl.color}">
            <div class="col-show-slash" aria-hidden="true"></div>
            ${num}
            ${pic ? `<img class="col-show-pic" src="${pic}" alt="">` : ''}
            ${LETTERBOX(`SLOT <b>${slotNum}</b> • ${title}`, slotNum === 1 ? 'TECLA G' : 'COMBINA NO [G]')}
            <div class="col-show-body">
              <div class="col-show-top">
                <span class="col-rar-tag">${ri.short}</span>${pips(ri.tier)}
              </div>
              <h3 class="col-show-name col-flow-name">${main}</h3>
              ${sub ? `<div class="col-show-sub">${sub}</div>` : ''}
              <div class="col-show-meta">
                <span class="col-ovr col-dur"><b>${fl.duration || 10}s</b><small>DURAÇÃO</small></span>
                <span class="col-insp"><small>ATIVAR EM CAMPO</small><b><kbd class="col-kbd-inline">G</kbd> ${slotNum === 1 ? 'Fluxo principal' : 'junto com o 1º'}</b></span>
              </div>
              <p class="col-show-desc">${fl.desc}</p>
            </div>
            <div class="col-skills col-fx">${flowTiles(fl)}</div>
          </article>`;
      };

      let combo = '';
      if (fl1 && fl2 && st.nelUnlocked) {
        const both = window.combineFlows([fl1, fl2]);
        combo = `
          <div class="col-combo" style="--c1:${fl1.color}; --c2:${fl2.color}">
            <span class="col-combo-tag"><kbd class="col-kbd-inline">G</kbd> DESPERTA OS DOIS JUNTOS</span>
            <div class="col-chips">${flowChips(both)}</div>
            <span class="col-combo-dur"><b>${both.duration}s</b></span>
          </div>`;
      }
      slotBox.innerHTML = flowSlot(fl1, 1) + flowSlot(fl2, 2) + combo;

      if (evoBox) {
        const meta = document.getElementById('col-evo-meta');
        if (meta) meta.textContent = st.nelUnlocked ? 'ESCOLHA 1 • CLIQUE PARA DESPERTAR' : '🔒 REQUER LIGA NEL';
        evoBox.innerHTML = window.NEL_EVOLUTIONS.map((ev) => {
          const active = st.selectedNelEvolution === ev.id;
          const bon = Object.entries(ev.bonuses || {}).map(([k, v]) => `<span class="col-chip">+${v} ${STAT_NAMES[k] || k}</span>`).join('');
          const [main, sub] = splitName(ev.name);
          return `
            <div class="col-evo col-frame${active ? ' active' : ''}${!st.nelUnlocked ? ' locked' : ''}" style="--ec:${ev.color}" onclick="App.selectNelEvolution('${ev.id}')">
              <div class="col-evo-eye" aria-hidden="true"><i></i></div>
              <div class="col-evo-txt">
                <h4>${main}</h4>
                ${sub ? `<div class="col-evo-sub">${sub}</div>` : ''}
                <p>${ev.desc}</p>
                <div class="col-chips">${bon}</div>
              </div>
              <span class="col-evo-status">${active ? '✓ DESPERTADO' : st.nelUnlocked ? 'CLIQUE P/ DESPERTAR' : '🔒 REQUER LIGA NEL'}</span>
            </div>`;
        }).join('');
      }

      const spinBox = document.getElementById('flow-spin-buttons');
      // + o Laboratório (testa o seu Fluxo; cada carta do catálogo tem o seu 🧪 TESTAR)
      if (spinBox) spinBox.innerHTML = this.spinButtonsHtml('spinFlowGacha', '🔥 GIRAR FLUXO') + '<button class="col-cta col-lab-btn" onclick="App.openFlowLabPicker()" title="Escolha 1 ou 2 Fluxos (combinados como na NEL) e teste num treino"><span>🧪 LABORATÓRIO DE FLUXOS</span></button>';

      const count = document.getElementById('col-count-FLUXO');
      if (count) count.textContent = `${window.FLOWS_DB.length} FLUXOS • ${TIERS.length} RARIDADES`;

      listBox.innerHTML = this.renderRarityGroups(window.FLOWS_DB, 'fluxos', (fl) => {
        const ri = rinfo(fl.rarity);
        const slot = st.equippedFlow?.id === fl.id ? 1 : st.equippedFlow2?.id === fl.id ? 2 : 0;
        const [main, sub] = splitName(fl.name);
        return `
          <div class="col-card col-card-flow ${ri.cls}${slot ? ' is-mine' : ''}" style="--rc:${ri.r.color}; --fc:${fl.color}">
            <div class="col-card-art">
              <span class="col-orb" aria-hidden="true"><b>${fl.duration || 10}s</b></span>
              <span class="col-card-rar">${ri.short}</span>
              <span class="col-card-ovr"><small>TECLA</small>G</span>
              ${slot ? `<span class="col-card-mine">✓ SEU FLUXO • SLOT ${slot}</span>` : ''}
            </div>
            <div class="col-card-body">
              <h4 style="color:${fl.color}">${main}</h4>
              ${sub ? `<div class="col-card-sub">${sub}</div>` : ''}
              <p class="col-card-desc">${fl.desc}</p>
              <div class="col-chips">${flowChips(fl)}</div>
              <button class="col-test-btn" onclick="App.startFlowLab('${fl.id}')" title="Testar este Fluxo num treino (não conta nada)">🧪 TESTAR</button>
            </div>
          </div>`;
      });
      this.colIntro('FLUXO');
    },

    // ==========================================================================
    // LOJA
    // ==========================================================================
    renderShopTab() {
      if (!this.colSkeleton('LOJA')) return;
      const box = document.getElementById('shop-box');
      if (!box) return;
      const c = this.state.currencies;
      const coins = c.egoCoins;
      const tiers = TIERS.slice().reverse();
      const base = { spins: (window.SHOP_ITEMS.find((x) => x.spins === 1) || {}).price, lucky: (window.SHOP_ITEMS.find((x) => x.lucky === 1) || {}).price };

      const oddsBar = (lucky) => tiers
        .map((k) => {
          const ri = rinfo(k);
          const pct = lucky ? luckyPct(k) : ri.r.chance;
          return pct ? `<i style="--rc:${ri.r.color}; flex:${pct}" title="${ri.short} ${fmtPct(pct)}%"></i>` : '';
        })
        .join('');
      const oddsRow = (lucky) => tiers
        .map((k) => {
          const ri = rinfo(k);
          const pct = lucky ? luckyPct(k) : ri.r.chance;
          return `<div class="col-odd${pct ? '' : ' off'}" style="--rc:${ri.r.color}"><span>${ri.short}</span><strong>${fmtPct(pct)}%</strong><i style="width:${Math.min(100, pct * 2.5)}%"></i></div>`;
        })
        .join('');

      const cards = window.SHOP_ITEMS.map((it) => {
        const afford = coins >= it.price;
        const qty = it.spins || it.lucky || 1;
        const unit = it.lucky ? base.lucky : base.spins;
        const full = unit ? unit * qty : 0;
        const save = full > it.price ? Math.round((1 - it.price / full) * 100) : 0;
        return `
          <div class="col-prod col-frame col-grain${it.lucky ? ' col-prod-lucky' : ''}${afford ? '' : ' cant'}">
            <div class="col-prod-art">
              <div class="col-prod-lines" aria-hidden="true"></div>
              <span class="col-prod-icon">${it.icon}</span>
              ${qty > 1 ? `<span class="col-prod-qty">x${qty}</span>` : ''}
              ${save ? `<span class="col-prod-save">-${save}%</span>` : ''}
              <span class="col-prod-kind">${it.lucky ? 'GIRO DA SORTE' : 'GIRO NORMAL'}</span>
            </div>
            <div class="col-prod-body">
              <h3>${it.name}</h3>
              <p>${it.desc}</p>
              <div class="col-prod-unit">${qty > 1 ? `${Math.round(it.price / qty)} por giro${save ? ` • economiza ${full - it.price}` : ''}` : 'ARMA OU FLUXO'}</div>
            </div>
            <button class="col-buy${afford ? '' : ' disabled'}" onclick="App.buyShopItem('${it.id}')"><span>💠 ${it.price} EGOCOINS</span></button>
            ${afford ? '' : `<div class="col-prod-miss">FALTAM ${it.price - coins}</div>`}
          </div>`;
      }).join('');

      box.innerHTML = `
        <section class="col-hero col-frame col-grain col-shop-hero">
          <div class="col-hero-lines" aria-hidden="true"></div>
          <div class="col-hero-wm" aria-hidden="true">SHOP</div>
          ${LETTERBOX('EGOIST <b>SHOP</b>', 'BLUE LOCK')}
          <div class="col-hero-grid">
            <div class="col-hero-title">
              <div class="col-kicker">🛒 LOJA DO</div>
              <h2>BLUE LOCK</h2>
              <p>Troque suas EgoCoins por giros. O <b class="col-green">Giro da Sorte</b> serve para Armas e Fluxos e aumenta muito a chance de pegar algo bom.</p>
            </div>
            <div class="col-hero-side col-shop-wallet">
              <div class="col-big col-big-coin"><small>💠 EGOCOINS</small><b>${coins}</b></div>
              <div class="col-big"><small>🎰 GIROS</small><b>${c.spins}</b></div>
              <div class="col-big col-big-lucky"><small>🍀 GIROS DA SORTE</small><b>${c.luckySpins || 0}</b></div>
            </div>
          </div>
        </section>
        <div class="col-shop-grid">${cards}</div>
        <section class="col-odds col-frame">
          <div class="col-odds-head"><span class="col-sec-tag">CHANCES</span><h3>CHANCES DE CADA GIRO</h3></div>
          <div class="col-odds-line">
            <div class="col-odds-label">🎰 Giro normal</div>
            <div class="col-odds-main"><div class="col-odds-bar">${oddsBar(false)}</div><div class="col-odds-cells">${oddsRow(false)}</div></div>
          </div>
          <div class="col-odds-line col-odds-lucky">
            <div class="col-odds-label">🍀 Giro da Sorte</div>
            <div class="col-odds-main"><div class="col-odds-bar">${oddsBar(true)}</div><div class="col-odds-cells">${oddsRow(true)}</div></div>
          </div>
        </section>
        <p class="col-shop-hint">Para usar: abra a aba <b>ARMAS</b> ou <b>FLUXO</b> e aperte <b class="col-green">🍀 GIRO DA SORTE</b>.</p>`;
      this.colIntro('LOJA');
    },

    // ==========================================================================
    // ROLETA: fita de cartas colecionáveis passando sob o ponteiro. Nenhuma carta
    // tem visual especial enquanto gira — a vencedora só ganha destaque quando para.
    // ==========================================================================
    playSpinReelAnimation({ header, pool, chosen, lostName, detailHtml, lucky = false }) {
      const modal = document.getElementById('cinematic-modal');
      const content = document.getElementById('cinematic-modal-content');
      if (!modal || !content) return;
      const CARD = 168;
      const WIN = 38; // posição da carta vencedora na fita
      const strip = [];
      for (let i = 0; i < WIN + 5; i++) {
        strip.push(i === WIN ? chosen : pool[Math.floor(Math.random() * pool.length)]);
      }
      const isWeapon = !!chosen.skills;
      const ri = rinfo(chosen.rarity);
      const r = ri.r;
      // Todas as cartas com a mesma estrutura (a vencedora não é marcada no HTML)
      const cardHtml = (it) => {
        const ti = rinfo(it.rarity);
        const [main] = splitName(it.name);
        const pic = isWeapon ? this.colPortrait(it, true, 132, 112, 'bust') : '';
        return `<div class="reel-card ${ti.cls}" style="--rc:${ti.r.color}${isWeapon ? '' : `; --fc:${it.color}`}"><div class="reel-card-in">
          <div class="reel-card-art">${pic ? `<img src="${pic}" alt="">` : `<span class="reel-orb"></span>`}</div>
          <span class="reel-rarity">${ti.short}</span>
          <strong>${main}</strong>
          <small>${it.inspiration || `FLUXO • ${it.duration || 10}s`}</small>
        </div></div>`;
      };
      content.innerHTML = `
        <div class="reel-box${lucky ? ' reel-lucky' : ''}">
          <div class="reel-letterbox"><span>EGOIST <b>GACHA</b></span><span>${lucky ? '🍀 GIRO DA SORTE' : '🎰 GIRO NORMAL'}</span></div>
          <div class="reel-title">${header}</div>
          <div class="reel-window is-fast">
            <div class="reel-pointer"><i></i></div>
            <div class="reel-strip" id="reel-strip" style="--card:${CARD}px">${strip.map(cardHtml).join('')}</div>
          </div>
          <div class="reel-odds">${TIERS.map((k) => {
            const t = window.RARITY_TIERS[k];
            const pct = lucky ? window.LUCKY_CHANCES[t.id] : t.chance;
            return `<span class="${pct ? '' : 'off'}" style="--rc:${t.color}">${t.name.split(' ')[0]} <b>${fmtPct(pct)}%</b></span>`;
          }).join('')}</div>
          <div id="reel-reveal"></div>
        </div>
      `;
      modal.classList.add('open');

      const box = content.querySelector('.reel-box');
      const stripEl = document.getElementById('reel-strip');
      const windowEl = stripEl.parentElement;
      const windowW = windowEl.clientWidth || 900;
      // Para com a carta vencedora sob o ponteiro (com um pequeno desvio aleatório dentro da carta)
      const jitter = (Math.random() - 0.5) * CARD * 0.32;
      const targetX = -(WIN * CARD + CARD / 2 - windowW / 2 + jitter);
      stripEl.style.transform = 'translateX(0px)';
      void stripEl.offsetWidth;
      stripEl.style.transition = 'transform 4.6s cubic-bezier(0.08, 0.72, 0.12, 1)';
      stripEl.style.transform = `translateX(${targetX}px)`;

      // "Tic" a cada carta que passa pelo ponteiro
      let stopped = false;
      let lastIdx = -1;
      let lastTick = 0;
      const tick = (now) => {
        if (stopped || !stripEl.isConnected) return;
        const tf = getComputedStyle(stripEl).transform;
        let x = 0;
        try { x = new DOMMatrixReadOnly(tf === 'none' ? undefined : tf).m41; } catch (e) { x = 0; }
        const idx = Math.floor((-x + windowW / 2) / CARD);
        if (idx !== lastIdx) {
          if (lastIdx >= 0 && now - lastTick > 45) {
            window.SFX?.blip?.(1150);
            lastTick = now;
          }
          lastIdx = idx;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      // As linhas de velocidade somem enquanto a fita desacelera
      setTimeout(() => windowEl.classList.remove('is-fast'), 1700);

      const showReveal = () => {
        // Só agora a tela de trás mostra a arma/fluxo novo
        this.renderAll();
        const wc = chosen.rarity === 'WORLD_CLASS' || chosen.rarity === 'MITICO';
        const reveal = document.getElementById('reel-reveal');
        if (!reveal) return;
        box?.classList.add('revealed');
        const [main, sub] = splitName(chosen.name);
        const pic = this.colPortrait(chosen, isWeapon, 230, 260, 'full');
        reveal.innerHTML = `
          ${wc ? `<div class="reel-flash" style="background:${r.color}"></div>` : ''}
          <div class="reel-result ${ri.cls}" style="--rc:${r.color}">
            <div class="reel-result-art">
              <div class="reel-result-lines" aria-hidden="true"></div>
              ${pic ? `<img src="${pic}" alt="">` : ''}
              <span class="reel-result-tier">${pips(ri.tier)}</span>
            </div>
            <div class="reel-result-info">
              <div class="reel-result-top">
                <span class="reel-badge">${ri.short}</span>
                ${isWeapon ? `<span class="reel-bonus"><b>+${r.ovrBonus}</b> OVR</span>` : `<span class="reel-bonus"><b>${chosen.duration || 10}s</b> DE FLUXO</span>`}
              </div>
              <h1>${main}</h1>
              ${sub ? `<div class="reel-sub">${sub}</div>` : ''}
              ${chosen.inspiration ? `<div class="reel-insp">Inspiração: <b>${chosen.inspiration}</b></div>` : ''}
              <p>${chosen.desc}</p>
              <div class="reveal-skills">${detailHtml}</div>
              <div class="reel-result-foot">
                ${lostName ? `<div class="reel-lost">✖ ${lostName} se foi para sempre.</div>` : '<span></span>'}
                <button class="reel-cta" onclick="App.closeCinematicModal()"><span>ESSE É O MEU EGO ▶</span></button>
              </div>
            </div>
          </div>
        `;
      };

      // A fita para (4,6s): só então a vencedora acende e as outras apagam.
      // Lendário, Mítico e World Class: depois explode na animação de raridade
      setTimeout(() => {
        stopped = true;
        const win = stripEl.children[WIN];
        windowEl.classList.add('stopped');
        if (win) win.classList.add('won');
        if (this.RARITY_BURST_LEVEL[chosen.rarity]) {
          setTimeout(() => this.playRarityBurst(chosen, showReveal), 650);
        } else {
          setTimeout(showReveal, 550);
        }
      }, 4700);
    },

    // ==========================================================================
    // ANIMAÇÃO DE RARIDADE ALTA: mesma sequência (carga -> explosão -> personagem ->
    // nome da raridade), com linhas de velocidade de mangá, faixa inclinada para o
    // nome e partículas de cor fixa (sem piscar). Tremor suave que acaba sozinho.
    // ==========================================================================
    drawRarityBurst(ctx, W, H, t, st) {
      const CHARGE = 0.75;
      const cx = W / 2;
      const cy = H * 0.42;
      const lv = st.level;
      const col = st.color;
      const easeOutBack = (x) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);
      const k = t - CHARGE;
      if (!st.lines) {
        st.lines = [];
        for (let i = 0; i < 70 + lv * 20; i++) st.lines.push({ a: Math.random() * Math.PI * 2, r0: 0.18 + Math.random() * 0.22, w: 0.004 + Math.random() * 0.012, white: Math.random() < 0.35 });
      }
      const amp = t < CHARGE ? (t / CHARGE) * 3 * lv : Math.max(0, 12 * lv * (1 - k / 0.55));
      ctx.setTransform(1, 0, 0, 1, Math.sin(t * 47) * amp, Math.cos(t * 39) * amp * 0.7);
      // Fundo navy com vinheta
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75);
      bg.addColorStop(0, '#0d1b38');
      bg.addColorStop(0.6, '#060c1a');
      bg.addColorStop(1, '#02040a');
      ctx.fillStyle = bg;
      ctx.fillRect(-40, -40, W + 80, H + 80);
      const R = Math.max(W, H);

      if (t < CHARGE) {
        for (let i = 0; i < 3 * lv; i++) {
          const a = Math.random() * Math.PI * 2;
          const RR = R * (0.45 + Math.random() * 0.2);
          st.parts.push({ x: cx + Math.cos(a) * RR, y: cy + Math.sin(a) * RR, vx: -Math.cos(a) * RR / 30, vy: -Math.sin(a) * RR / 30, life: 30, max: 30, size: 2 + Math.random() * 2, c: Math.random() < 0.3 ? '#ffffff' : col });
        }
        // Linhas de velocidade convergindo
        const pc = t / CHARGE;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = 0.25 * pc;
        st.lines.forEach((ln) => {
          ctx.fillStyle = ln.white ? '#ffffff' : col;
          ctx.beginPath();
          ctx.arc(0, 0, R, ln.a, ln.a + ln.w);
          ctx.arc(0, 0, R * (ln.r0 + (1 - pc) * 0.5), ln.a + ln.w, ln.a, true);
          ctx.closePath();
          ctx.fill();
        });
        ctx.restore();
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 + pc * 160);
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
            st.parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 70, max: 70, size: 2 + Math.random() * 4, grav: 0.12, c: Math.random() < 0.3 ? '#ffffff' : col });
          }
          window.SFX?.kick(1);
          if (lv >= 2) window.SFX?.goal(true);
        }
        // Raios girando devagar
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(k * (0.25 + lv * 0.08));
        const rays = 10 + lv * 4;
        ctx.globalAlpha = 0.12 + lv * 0.03;
        ctx.fillStyle = col;
        for (let i = 0; i < rays; i++) {
          const a = (i / rays) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, R, a, a + (Math.PI / rays) * 0.7);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        // Linhas de velocidade de mangá saindo do centro (fixas, vão sumindo)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = Math.max(0.1, 0.55 - k * 0.25);
        st.lines.forEach((ln) => {
          ctx.fillStyle = ln.white ? '#ffffff' : col;
          ctx.beginPath();
          ctx.arc(0, 0, R, ln.a, ln.a + ln.w);
          ctx.arc(0, 0, R * (ln.r0 + 0.12), ln.a + ln.w, ln.a, true);
          ctx.closePath();
          ctx.fill();
        });
        ctx.restore();
        // Anéis de choque
        for (let i = 0; i <= lv; i++) {
          const rr = k * 1100 - i * 170;
          if (rr <= 0) continue;
          ctx.globalAlpha = Math.max(0, 1 - rr / (R * 0.8));
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
        window.PixelRenderer.drawCharacterSprite(ctx, st.hero, s, s * 1.1, { facing: 'front', frame: 4 + Math.floor(t * 30), showAura: true, animState: 'idle' });
        ctx.restore();
        // Faixa inclinada (painel de mangá) com o nome da raridade
        const tp = Math.min(1, Math.max(0, (k - 0.12) / 0.3));
        const ease = 1 - Math.pow(1 - tp, 3);
        const by = H * 0.8;
        const bh = H * 0.15;
        const slant = bh * 0.5;
        ctx.save();
        ctx.globalAlpha = tp;
        const bx = -W * (1 - ease);
        ctx.beginPath();
        ctx.moveTo(bx + slant, by - bh / 2);
        ctx.lineTo(bx + W + 40, by - bh / 2);
        ctx.lineTo(bx + W + 40 - slant, by + bh / 2);
        ctx.lineTo(bx - 40, by + bh / 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(2, 4, 10, 0.86)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = col;
        ctx.stroke();
        ctx.restore();
        const scale = 1.9 - 0.9 * ease;
        ctx.save();
        ctx.translate(cx, by + H * 0.035);
        ctx.transform(1, 0, -0.18, 1, 0, 0);
        ctx.scale(scale, scale);
        ctx.globalAlpha = tp;
        ctx.textAlign = 'center';
        ctx.font = `italic 900 ${Math.round(H * 0.1)}px "Segoe UI", sans-serif`;
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#03060d';
        ctx.strokeText(st.label, 0, 0);
        const tg = ctx.createLinearGradient(0, -H * 0.08, 0, H * 0.01);
        tg.addColorStop(0, '#ffffff');
        tg.addColorStop(0.45, '#ffffff');
        tg.addColorStop(1, col);
        ctx.shadowColor = col;
        ctx.shadowBlur = 26;
        ctx.fillStyle = tg;
        ctx.fillText(st.label, 0, 0);
        ctx.restore();
        if (k > 0.45) {
          ctx.globalAlpha = Math.min(1, (k - 0.45) / 0.3);
          ctx.textAlign = 'center';
          ctx.font = `italic 800 ${Math.round(H * 0.03)}px "Segoe UI", sans-serif`;
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(st.chosen.name, cx, H * 0.935);
          ctx.globalAlpha = 1;
        }
        // Um único clarão da explosão (some em 0,35s)
        if (k < 0.35) {
          ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - k / 0.35)})`;
          ctx.fillRect(-40, -40, W + 80, H + 80);
        }
      }
      // Faíscas (cada uma com sua cor fixa)
      st.parts = st.parts.filter((p) => --p.life > 0);
      st.parts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.grav) p.vy += p.grav;
        ctx.globalAlpha = p.life / p.max;
        ctx.fillStyle = p.c || col;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  });
})();
