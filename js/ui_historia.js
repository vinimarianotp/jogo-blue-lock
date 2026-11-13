// ============================================================================
// ABA HISTÓRIA (#tab-HISTORIA) — tela de "seleção de capítulo" cinematográfica.
// Visual em css/ui_historia.css (tudo escopado em #tab-HISTORIA), no mesmo
// estilo da aba ATRIBUTOS: navy escuro, painéis de canto cortado com borda neon,
// tipografia itálica 900, linhas de velocidade, granulação estática.
//
// Substitui App.renderStoryHub (o original fica em js/app.js) mantendo tudo o que
// ele fazia: arte do capítulo no canvas #story-art (cenário + seu time x rival),
// era, título, resumo, SEU TIME / ADVERSÁRIO / OBJETIVO / SEU RANKING, o botão
// que chama App.launchChapterMatch(), tabelas da liga, chave e grupo da Copa,
// os botões de rever interlúdios (App.replayInterlude) e a linha do tempo.
// ============================================================================
(function () {
  if (!window.App) return;

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad2 = (n) => String(n).padStart(2, '0');

  // Luminância simples (0-255) de uma cor #rrggbb
  const lum = (hex) => {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return 128;
    const n = parseInt(hex.slice(1), 16);
    return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  };
  // Cor de destaque legível sobre o navy: das duas cores do uniforme, a que não é nem preta nem branca demais
  const pickAccent = (a, b, fallback) => {
    const ok = (c) => /^#[0-9a-f]{6}$/i.test(c || '') && lum(c) > 70 && lum(c) < 236;
    if (ok(a)) return a;
    if (ok(b)) return b;
    if (/^#[0-9a-f]{6}$/i.test(a || '') && lum(a) >= 236) return '#e2e8f0';
    return fallback;
  };

  // Pseudo-aleatório fixo (as linhas de velocidade e o confete não mudam a cada render)
  const rng = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  Object.assign(App, {
    // ------------------------------------------------------------------------
    // Miniaturas dos cenários (capas dos "volumes" da linha do tempo). São
    // desenhadas uma vez por tema num canvas guardado, fora do cache do
    // CutsceneEngine, e geradas aos poucos para não travar a tela.
    // ------------------------------------------------------------------------
    _shThumbs: {},
    _shThumbQueue: [],

    shThumb(theme) {
      return this._shThumbs[theme] || null;
    },

    shQueueThumbs(themes) {
      themes.forEach((t) => {
        if (t && !this._shThumbs[t] && !this._shThumbQueue.includes(t)) this._shThumbQueue.push(t);
      });
      // (as capas só são desenhadas com a aba HISTÓRIA na tela: atrás da tela de título ou do
      // mapa eram ~0,6 s de CPU à toa na abertura do jogo. Quando a aba abre, o renderAll
      // passa por aqui de novo e elas começam)
      const box = document.getElementById('story-hub');
      if (!box || box.offsetParent === null || document.getElementById('title-screen')?.classList.contains('open')) return;
      if (this._shThumbQueue.length && !this._shThumbBusy) {
        this._shThumbBusy = true;
        setTimeout(() => this.shBuildNextThumb(), 60);
      }
    },

    shBuildNextThumb() {
      const theme = this._shThumbQueue.shift();
      if (!theme) {
        this._shThumbBusy = false;
        return;
      }
      try {
        const cv = document.createElement('canvas');
        cv.width = 480;
        cv.height = 300;
        const g = cv.getContext('2d');
        const CE = window.CutsceneEngine;
        g.save();
        if (CE.VN_BG?.[theme]) CE.VN_BG[theme].call(CE, g, cv.width, cv.height);
        else CE.drawVnBackground(g, cv.width, cv.height, theme);
        g.restore();
        this._shThumbs[theme] = cv;
        document.querySelectorAll(`#tab-HISTORIA canvas.sh-vol-cv[data-theme="${theme}"]`).forEach((c) => this.shPaintThumb(c));
      } catch (e) {
        this._shThumbs[theme] = this._shThumbs[theme] || null;
      }
      setTimeout(() => this.shBuildNextThumb(), 40);
    },

    // Recorte "capa de mangá" (retrato) do cenário largo, alinhado embaixo
    shPaintThumb(c) {
      const src = this._shThumbs[c.dataset.theme];
      if (!src) return;
      const g = c.getContext('2d');
      const sh = src.height;
      const sw = Math.min(src.width, (sh * c.width) / c.height);
      const sx = (src.width - sw) * (+(c.dataset.fx || 0.5));
      g.clearRect(0, 0, c.width, c.height);
      g.drawImage(src, sx, 0, sw, sh, 0, 0, c.width, c.height);
      c.classList.add('sh-ready');
    },

    // ------------------------------------------------------------------------
    // ABA HISTÓRIA
    // ------------------------------------------------------------------------
    renderStoryHub() {
      const box = document.getElementById('story-hub');
      if (!box) return;
      const chapters = window.CAREER_CHAPTERS;
      const idx = this.state.currentChapterIndex;
      const ch = this.getChapter(idx);
      const total = chapters.length;
      const lastNum = chapters[total - 1]?.chapterNumber ?? total - 1;

      // Abriu a aba agora: a entrada (letterbox, título, volumes) toca uma vez só
      const visible = box.offsetParent !== null;
      const intro = visible && !this._shWasVisible;
      this._shWasVisible = visible;
      const dark = this.isDarkEra(ch || undefined);

      // ---------- Linha do tempo: a estante de volumes ----------
      // Feito = concluído de verdade (um capítulo novo que ficou para trás no save não conta:
      // aparece com 🃏 até ser jogado)
      const doneIds = this.state.completedChapters || [];
      const doneCount = chapters.filter((c) => doneIds.includes(c.id)).length;
      const vols = chapters
        .map((c, i) => {
          const isDone = doneIds.includes(c.id);
          const pending = !isDone && i < idx;
          const cls = isDone ? 'done' : i === idx ? 'current' : 'locked';
          const icon = isDone ? '✔' : i === idx ? '▶' : pending ? '🃏' : '🔒';
          const [eraMain, eraSub] = c.era.split('—').map((s) => s.trim());
          const tip = `Cap. ${c.chapterNumber} • ${c.era}${i <= idx ? `\n${c.title}` : ''}`;
          const fx = i % 3 === 0 ? 0.35 : i % 3 === 1 ? 0.55 : 0.72;
          const cur = i === idx;
          // Rótulo curto na lombada (o completo fica no título/tooltip)
          const eraShort = cur ? eraMain : eraMain.replace(/\s*\(.*?\)\s*/g, ' ').replace('PROFISSIONAL', 'PRO').trim();
          return `
            <div class="sh-vol ${cls}" style="--i:${i}" title="${esc(tip)}">
              <div class="sh-vol-cover">
                <canvas class="sh-vol-cv" data-theme="${esc(c.mapTheme)}" data-fx="${fx}" width="${cur ? 320 : 150}" height="200"></canvas>
                ${cur ? '<span class="sh-vol-tag">VOCÊ ESTÁ AQUI</span>' : ''}
                <span class="sh-vol-state">${icon}</span>
                <b class="sh-vol-num">${pad2(c.chapterNumber)}</b>
              </div>
              <div class="sh-vol-era">${esc(eraShort)}${cur && eraSub ? `<small>${esc(eraSub)}</small>` : ''}</div>
              <i class="sh-vol-rail"></i>
            </div>`;
        })
        .join('');

      // ---------- Rever interlúdios (🎬) ----------
      const seen = this.state.seenInterludes || {};
      const sceneIds = window.storySceneIds(seen);
      const scenes = sceneIds.length
        ? `<div class="sh-scenes">
            <span class="sh-scenes-cap">🎬 REVER CENAS</span>
            ${sceneIds.map((id, k) => `<button class="sh-scene" onclick="App.replayInterlude('${id}')"><i>${pad2(k + 1)}</i><span>${esc(window.STORY_INTERLUDES[id].title)}</span><b>▶</b></button>`).join('')}
          </div>`
        : '';

      const shelf = `
        <section class="sh-shelf sh-frame">
          <header class="sh-head">
            <div class="sh-head-title"><span class="sh-chip">LINHA DO TEMPO</span><span class="sh-cap">A CAMPANHA DO EGOÍSTA • ${total} CAPÍTULOS</span></div>
            <div class="sh-progress">
              <span class="sh-cap">PROGRESSO</span>
              <b>${pad2(doneCount)}<small>/${total}</small></b>
              <div class="sh-progress-bar"><i style="width:${Math.round((doneCount / total) * 100)}%"></i></div>
            </div>
          </header>
          <div class="sh-vols">${vols}</div>
          ${scenes}
        </section>`;

      const rootCls = `sh-root sh-grain${dark && ch ? ' sh-dark' : ''}${intro ? ' sh-intro' : ''}`;

      // ---------- Fim da carreira ----------
      if (!ch) {
        const st = this.state;
        box.innerHTML = `
          <div class="${rootCls} sh-final">
            <section class="story-card story-done sh-hero sh-frame">
              <div class="sh-lb sh-lb-top"><span>BLUE LOCK • <b>EGOIST CAREER</b></span><span>FIM DA CARREIRA • <b>${doneCount}/${total}</b> CAPÍTULOS</span></div>
              <div class="sh-art">
                <div class="sh-stage">
                  <canvas id="story-art" class="story-art" width="1440" height="440"></canvas>
                  <div class="sh-art-shade"></div>
                </div>
                <div class="sh-info">
                  <div class="sh-headline">
                    <b class="sh-num">FIM</b>
                    <div class="sh-headline-txt">
                      <span class="sh-cap">${doneCount} CAPÍTULOS CONCLUÍDOS</span>
                      <div class="sh-era"><span>FIM DA CARREIRA</span></div>
                      <em class="sh-era-sub">LENDA DO FUTEBOL</em>
                    </div>
                  </div>
                  <h1 class="sh-title">CAMPEÃO DO MUNDO</h1>
                  <p class="sh-lore">Da final perdida no colégio até a taça da Copa do Mundo. O Blue Lock gerou o atacante mais egoísta do planeta: você.<br>🦊 O monstro ainda está com fome. Você pode rever as cenas da história nos botões abaixo e continuar treinando, girando armas e caçando conquistas.</p>
                </div>
              </div>
              <div class="sh-lb sh-lb-bottom sh-command">
                <div class="sh-meta sh-meta-4">
                  <span class="sh-cell"><b>PARTIDAS NA CARREIRA</b><strong>${st.careerMatches || 0}</strong></span>
                  <span class="sh-cell"><b>GOLS NA CARREIRA</b><strong>${st.careerGoals || 0}</strong></span>
                  <span class="sh-cell"><b>OVERALL</b><strong>${this.calculateOVR()}</strong></span>
                  <span class="sh-cell"><b>SEU RANKING</b><strong>${this.getBlueLockRank() ? `#${this.getBlueLockRank()} de 300` : 'Lenda'}</strong></span>
                </div>
                <button class="story-play-btn sh-cta sh-cta-gold" onclick="App.switchTab('CONQUISTAS')"><small>CARREIRA CONCLUÍDA ✔</small><span>VER CONQUISTAS</span><i>▶</i></button>
              </div>
            </section>
            ${this.extraChapterHtml?.() || ''}
            ${shelf}
          </div>`;
        this.shDrawFinalArt();
        this.shAfterRender();
        return;
      }

      // ---------- Capítulo atual ----------
      const trio = this.getActiveTrio(ch);
      const mates = trio ? trio.mates : ch.teammateIds || [];
      const rivals = (ch.format === 'trio' ? ch.opponentIds?.slice(0, 3) : ch.opponentIds) || [];
      const metaLine = ch.format === 'trio'
        ? `Torneio de Trios • ${ch.trioRounds.length} mata-matas${trio ? ` • próxima: ${ch.trioRounds[trio.round]?.name}` : ''}`
        : ch.leagueMatch
        ? `${this.lg().name} • Jogo ${this.lgState().games + 1} de 8 • 7 contra 7 • ${ch.goalLimit ? `quem fizer ${ch.goalLimit} gols primeiro vence • ` : ''}vale a tabela`
        : ch.format === 'cup'
        ? `${ch.friendly ? 'Amistoso' : ch.cupName || 'Copa do Mundo'} • ${ch.cupRounds[ch.cupIdx].name} (${ch.cupIdx + 1} de ${ch.cupRounds.length}) • ${ch.friendly ? 'perdeu, joga de novo' : ch.cupRounds[ch.cupIdx].group ? 'fase de grupos: os 2 primeiros passam' : 'mata-mata: precisa vencer'}`
        : (() => {
            const secs = window.MatchEngine.matchTime(ch.matchDuration);
            return `Meta: ${ch.targetGoals} gol${ch.targetGoals > 1 ? 's' : ''} • ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} de partida`;
          })();
      const playLabel = trio
        ? 'CONTINUAR TORNEIO'
        : ch.nelPhase !== undefined && !ch.nelClub
        ? 'ESCOLHER CLUBE E JOGAR'
        : ch.league === 'pro' && !ch.proClub
        ? 'VER AS PROPOSTAS'
        : ch.leagueMatch
        ? `JOGAR JOGO ${this.lgState().games + 1} DA LIGA`
        : ch.format === 'cup'
        ? `JOGAR: ${ch.cupRounds[ch.cupIdx].name}`
        : 'JOGAR CAPÍTULO';
      const playKicker = trio
        ? `TORNEIO DE TRIOS • ${ch.trioRounds[trio.round]?.name || ''}`
        : ch.nelPhase !== undefined && !ch.nelClub
        ? 'DRAFT DA NEL'
        : ch.league === 'pro' && !ch.proClub
        ? 'MERCADO DE TRANSFERÊNCIAS'
        : ch.leagueMatch
        ? 'PRÓXIMA RODADA'
        : ch.format === 'cup'
        ? `${ch.friendly ? 'AMISTOSO' : 'COPA DO MUNDO'} • PRÓXIMO JOGO`
        : 'PRÓXIMA PARTIDA';
      const rank = this.getBlueLockRank();
      const [eraMain, eraSub] = ch.era.split('—').map((s) => s.trim());
      const neonDefault = dark ? '#ff3b5c' : '#00f5d4';
      const rivalAccent = pickAccent(ch.opponentColor, ch.opponentSecondary, '#f97316');
      const homeAccent = pickAccent(ch.homeColor, ch.homeSecondary, neonDefault);
      const kit = (a, b) => `<i class="sh-kit" style="background:linear-gradient(90deg, ${a || '#0f2942'} 58%, ${b || '#1d4ed8'} 58%)"></i>`;
      const progressPct = Math.round((idx / total) * 100);

      // Competição: liga (tabela + ranking de valor) ou Copa (chave + grupo)
      let comp = '';
      if (ch.format === 'league' && this.lgState()) {
        comp = `
          <section class="sh-comp sh-league">
            <header class="sh-sec-head"><span class="sh-chip">CLASSIFICAÇÃO</span><span class="sh-cap">${esc(this.lg().name)} • ${this.lgState().games}/8 JOGOS SEUS</span></header>
            ${this.leagueTablesHtml(true)}
          </section>`;
      } else if (ch.format === 'cup') {
        const group = ch.groupTeams && ch.cupRounds[ch.cupIdx].group ? this.groupTableHtml(ch, this.state.cup?.group) : '';
        comp = `
          <section class="sh-comp sh-cup${group ? ' sh-has-group' : ''}">
            <header class="sh-sec-head"><span class="sh-chip">${ch.friendly ? 'PRÉ-COPA' : 'CAMINHO ATÉ A TAÇA'}</span><span class="sh-cap">FASE ${ch.cupIdx + 1} DE ${ch.cupRounds.length}</span></header>
            <div class="sh-cup-grid">
              <div class="cup-bracket sh-route">${ch.cupRounds
                .map((cr, k) => `<span class="${k < ch.cupIdx ? 'done' : k === ch.cupIdx ? 'now' : ''}" style="--i:${k}"><em>${k < ch.cupIdx ? '✔' : k === ch.cupIdx ? '▶' : pad2(k + 1)}</em>${esc(cr.name)}<b>${esc(cr.label)}</b></span>`)
                .join('')}</div>
              ${group}
            </div>
          </section>`;
      }

      box.innerHTML = `
        <div class="${rootCls}" style="--sh-rival:${rivalAccent}; --sh-home:${homeAccent}">
          <section class="story-card sh-hero sh-frame" style="--story-accent:${ch.opponentSecondary || '#2563eb'}">
            <div class="sh-lb sh-lb-top">
              <span>MODO HISTÓRIA • <b>BLUE LOCK</b></span>
              <span class="sh-lb-mid">${esc(eraMain)}</span>
              <span>CAP. <b>${pad2(ch.chapterNumber)}</b> / ${pad2(lastNum)} • ${progressPct}% DA CARREIRA</span>
            </div>
            <div class="sh-art">
              <div class="sh-stage">
                <canvas id="story-art" class="story-art" width="1440" height="440"></canvas>
                <div class="sh-art-shade"></div>
                <div class="sh-plate sh-plate-home"><small>SEU TIME</small><strong>${kit(ch.homeColor, ch.homeSecondary)}<span>${esc(ch.teamName || 'Blue Lock')}</span></strong></div>
                <div class="sh-plate sh-plate-rival"><small>ADVERSÁRIO</small><strong>${kit(ch.opponentColor, ch.opponentSecondary)}<span>${esc(ch.opponentName)}</span></strong></div>
              </div>
              <div class="sh-info">
                <div class="sh-headline">
                  <b class="sh-num">${pad2(ch.chapterNumber)}</b>
                  <div class="sh-headline-txt">
                    <span class="sh-cap">CAPÍTULO ${ch.chapterNumber} DE ${lastNum}</span>
                    <div class="sh-era"><span>${esc(eraMain)}</span></div>
                    ${eraSub ? `<em class="sh-era-sub">${esc(eraSub)}</em>` : ''}
                  </div>
                </div>
                <h1 class="sh-title">${esc(ch.title)}</h1>
                <p class="sh-lore">${ch.loreSummary}</p>
              </div>
            </div>
            <div class="sh-lb sh-lb-bottom sh-command">
              <div class="sh-meta">
                <span class="sh-cell sh-cell-goal"><b>OBJETIVO</b><strong>${esc(metaLine)}</strong></span>
                <span class="sh-cell sh-cell-rank"><b>SEU RANKING</b><strong>${rank ? `#${rank} <small>de 300</small>` : 'Fora do Blue Lock'}</strong></span>
              </div>
              <button class="story-play-btn sh-cta" onclick="App.launchChapterMatch()"><small>${esc(playKicker)}</small><span>${esc(playLabel)}</span><i>▶</i></button>
            </div>
          </section>
          ${this.extraChapterHtml?.() || ''}
          ${shelf}
          ${comp}
        </div>`;

      this.shDrawChapterArt(ch, mates, rivals);
      this.shAfterRender();
    },

    // Depois de montar: capas dos volumes e o volume atual visível na estante
    shAfterRender() {
      const themes = [];
      document.querySelectorAll('#tab-HISTORIA canvas.sh-vol-cv').forEach((c) => {
        if (this._shThumbs[c.dataset.theme]) this.shPaintThumb(c);
        else themes.push(c.dataset.theme);
      });
      // o tema do capítulo atual primeiro
      const cur = document.querySelector('#tab-HISTORIA .sh-vol.current canvas');
      if (cur) themes.unshift(cur.dataset.theme);
      this.shQueueThumbs([...new Set(themes)]);
      const vols = document.querySelector('#tab-HISTORIA .sh-vols');
      const curVol = vols && vols.querySelector('.sh-vol.current');
      if (vols && curVol && vols.scrollWidth > vols.clientWidth) {
        vols.scrollLeft = Math.max(0, curVol.offsetLeft - vols.clientWidth / 2 + curVol.offsetWidth / 2);
      }
    },

    // A arte grande do capítulo só é pintada com a aba na tela: atrás da tela de título (na
    // abertura do jogo) ou do mapa ela custava um cenário inteiro à toa. Ao abrir a aba, o
    // switchTab → renderAll passa por aqui de novo e pinta antes de aparecer.
    shArtHidden(cv) {
      return cv.offsetParent === null || !!document.getElementById('title-screen')?.classList.contains('open');
    },

    // Ajusta o canvas à proporção da caixa (altura interna fixa, largura em degraus
    // de 40 px para o cache de cenários do CutsceneEngine não encher à toa)
    shFitArtCanvas(cv) {
      const art = cv.parentElement;
      const H = 440;
      const aspect = art && art.clientWidth > 0 && art.clientHeight > 0 ? art.clientWidth / art.clientHeight : 1440 / 440;
      const W = Math.max(720, Math.min(1840, Math.round((H * aspect) / 40) * 40));
      cv.width = W;
      cv.height = H;
      const small = window.matchMedia && window.matchMedia('(max-width: 1100px)').matches;
      return { W, H, narrow: small || aspect < 2.35 };
    },

    // Linhas de velocidade radiais (estáticas) saindo de um ponto
    shSpeedLines(ctx, W, H, x, y, color, alpha, seed) {
      const r = rng(seed);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const R = Math.hypot(W, H);
      for (let i = 0; i < 70; i++) {
        const a = r() * Math.PI * 2;
        const w = 0.004 + r() * 0.012;
        const r0 = H * (0.32 + r() * 0.25);
        ctx.globalAlpha = alpha * (0.35 + r() * 0.65);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
        ctx.lineTo(x + Math.cos(a - w) * R, y + Math.sin(a - w) * R);
        ctx.lineTo(x + Math.cos(a + w) * R, y + Math.sin(a + w) * R);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    // Arte do capítulo: o cenário da fase, seu time de um lado e o rival do outro
    shDrawChapterArt(ch, mates, rivals) {
      const cv = document.getElementById('story-art');
      if (!cv || this.shArtHidden(cv)) return;
      const { W, H, narrow } = this.shFitArtCanvas(cv);
      const ctx = cv.getContext('2d');
      window.CutsceneEngine.drawVnBackground(ctx, W, H, ch.mapTheme);
      const shade = ctx.createLinearGradient(0, H * 0.3, 0, H);
      shade.addColorStop(0, 'rgba(6, 11, 22, 0)');
      shade.addColorStop(1, 'rgba(6, 11, 22, 0.85)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, W, H);

      // O confronto ocupa a parte direita (o texto fica à esquerda); em tela estreita, o centro
      const cx = narrow ? W * 0.5 : W * 0.72;
      const hw = narrow ? W * 0.47 : Math.min(W * 0.25, H * 0.95);
      const k = H / 420;
      const vsY = H * 0.6;
      const dark = this.isDarkEra(ch);
      const rivalAccent = pickAccent(ch.opponentColor, ch.opponentSecondary, '#f97316');
      // Linhas de velocidade + faixa diagonal atrás do VS
      this.shSpeedLines(ctx, W, H, cx, vsY, '#ffffff', 0.1, 7 + (ch.chapterNumber || 0));
      ctx.save();
      ctx.translate(cx, vsY);
      ctx.rotate(-0.32);
      const band = ctx.createLinearGradient(-hw, 0, hw, 0);
      band.addColorStop(0, 'rgba(0,0,0,0)');
      band.addColorStop(0.5, dark ? 'rgba(255, 59, 92, 0.16)' : 'rgba(0, 245, 212, 0.13)');
      band.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = band;
      ctx.fillRect(-hw * 1.4, -H * 0.12, hw * 2.8, H * 0.24);
      ctx.restore();

      const find = (id) => window.findCharacter(id);
      const p = this.state.profile;
      const you = { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: ch.homeColor || '#0f2942', jerseySecondary: ch.homeSecondary || '#1d4ed8' };
      const drawAt = (c, x, size, flip, lift = 0) => {
        ctx.save();
        ctx.translate(Math.round(x - size / 2), Math.round(H - size * 0.98 - lift));
        window.PixelRenderer.drawCharacterSprite(ctx, c, size, size * 1.1, { facing: 'front', frame: 4, flipX: flip });
        ctx.restore();
      };
      const homeKit = ch.homeColor ? { jerseyPrimary: ch.homeColor, jerseySecondary: ch.homeSecondary } : {};
      const home = mates.slice(0, 3).map(find).filter(Boolean).map((c) => Object.assign({}, c, homeKit));
      const away = rivals.slice(0, 4).map(find).filter(Boolean).map((c) => Object.assign({}, c, { jerseyPrimary: ch.opponentColor || c.jerseyPrimary, jerseySecondary: ch.opponentSecondary || c.jerseySecondary }));
      const big = 250 * k;
      const small = 165 * k;
      // Fila de trás (mais escura, um pouco mais alta): profundidade de pôster
      ctx.save();
      ctx.filter = 'brightness(0.62) saturate(0.85)';
      const backX = [0.92, 0.74, 0.56];
      home.forEach((c, i) => drawAt(c, cx - hw * backX[i], small, false, H * 0.05));
      away.slice(1).forEach((c, i) => drawAt(c, cx + hw * backX[i], small, true, H * 0.05));
      ctx.restore();
      // Brilho de recorte atrás dos dois protagonistas
      const glow = (x, color) => {
        const g = ctx.createRadialGradient(x, H * 0.62, 10, x, H * 0.62, big * 0.75);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = g;
        ctx.fillRect(x - big, 0, big * 2, H);
        ctx.restore();
      };
      const homeX = cx - hw * 0.4;
      const rivalX = cx + hw * 0.4;
      glow(homeX, dark ? '#ff3b5c' : '#00f5d4');
      if (away[0]) glow(rivalX, rivalAccent);
      drawAt(you, homeX, big, false);
      if (away[0]) drawAt(away[0], rivalX, big, true);

      // VS
      ctx.save();
      ctx.translate(cx, vsY);
      ctx.transform(1, 0, -0.18, 1, 0, 0);
      ctx.font = `italic 900 ${Math.round(112 * k)}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(250, 204, 21, 0.55)';
      ctx.shadowBlur = 26 * k;
      ctx.lineWidth = 12 * k;
      ctx.strokeStyle = '#060b16';
      ctx.strokeText('VS', 0, 0);
      ctx.shadowBlur = 0;
      const vg = ctx.createLinearGradient(0, -50 * k, 0, 50 * k);
      vg.addColorStop(0, '#fff7c2');
      vg.addColorStop(0.45, '#facc15');
      vg.addColorStop(1, '#f97316');
      ctx.fillStyle = vg;
      ctx.fillText('VS', 0, 0);
      ctx.restore();

      // Posição das plaquinhas de time (em % da largura, igual ao canvas)
      const hero = cv.closest('.sh-hero');
      if (hero) {
        // Plaquinhas: a do seu time termina antes do VS e a do rival começa depois dele
        hero.style.setProperty('--sh-vs-x', `${((cx / W) * 100).toFixed(2)}%`);
        hero.style.setProperty('--sh-plate-room', `${(((narrow ? cx - W * 0.02 : Math.min(cx - W * 0.45, W - cx)) / W) * 100).toFixed(2)}%`);
        hero.classList.toggle('sh-narrow', narrow);
      }
    },

    // Arte do fim da carreira: você no centro do estádio da final, luz dourada e confete
    shDrawFinalArt() {
      const cv = document.getElementById('story-art');
      if (!cv || this.shArtHidden(cv)) return;
      const { W, H, narrow } = this.shFitArtCanvas(cv);
      const ctx = cv.getContext('2d');
      window.CutsceneEngine.drawVnBackground(ctx, W, H, 'worldcup_final');
      const shade = ctx.createLinearGradient(0, H * 0.3, 0, H);
      shade.addColorStop(0, 'rgba(6, 11, 22, 0)');
      shade.addColorStop(1, 'rgba(6, 11, 22, 0.85)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, W, H);
      const cx = narrow ? W * 0.5 : W * 0.72;
      this.shSpeedLines(ctx, W, H, cx, H * 0.45, '#facc15', 0.12, 99);
      const g = ctx.createRadialGradient(cx, H * 0.55, 10, cx, H * 0.55, H * 0.75);
      g.addColorStop(0, 'rgba(250, 204, 21, 0.55)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      // Confete parado no ar
      const r = rng(2026);
      const cols = ['#facc15', '#00f5d4', '#f8fafc', '#3b82f6', '#ef4444'];
      for (let i = 0; i < 90; i++) {
        const x = cx + (r() - 0.5) * W * 0.62;
        const y = r() * H * 0.8;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(r() * Math.PI);
        ctx.globalAlpha = 0.5 + r() * 0.5;
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
      }
      const p = this.state.profile;
      const you = { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' };
      const k = H / 420;
      const mates = ['sae', 'rin', 'bachira', 'nagi'].map((id) => window.findCharacter(id)).filter(Boolean).map((c) => Object.assign({}, c, { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' }));
      const drawAt = (c, x, size, flip, lift = 0) => {
        ctx.save();
        ctx.translate(Math.round(x - size / 2), Math.round(H - size * 0.98 - lift));
        window.PixelRenderer.drawCharacterSprite(ctx, c, size, size * 1.1, { facing: 'front', frame: 4, flipX: flip });
        ctx.restore();
      };
      ctx.save();
      ctx.filter = 'brightness(0.6) saturate(0.85)';
      const hw = narrow ? W * 0.45 : W * 0.25;
      [-0.85, -0.5, 0.5, 0.85].forEach((f, i) => mates[i] && drawAt(mates[i], cx + hw * f, 165 * k, f > 0, H * 0.05));
      ctx.restore();
      drawAt(you, cx, 280 * k, false);
    }
  });

  // Redimensionou a janela com a aba aberta: a arte se ajusta à nova proporção
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const box = document.getElementById('story-hub');
      if (box && box.offsetParent !== null && App.state) App.renderStoryHub();
    }, 180);
  });
})();
