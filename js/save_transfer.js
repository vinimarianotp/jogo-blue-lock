// ============================================================================
// EXPORTAR / IMPORTAR SAVE (tela inicial): leva a carreira de um lugar para outro
// (o jogo aberto pela pasta do PC, o site no navegador, o celular...). Cada
// endereço guarda o próprio save; aqui ele vira um código de texto (ou arquivo)
// que você cola/abre do outro lado.
// ============================================================================
(function () {
  const App = window.App;
  if (!App) return;
  const PREFIX = 'BLSAVE1:';

  // Save que veio de fora (código/arquivo de outra pessoa, ou o save da dupla que chega
  // pela rede): as telas do jogo montam os textos dele com innerHTML, então NENHUM texto
  // pode carregar HTML/JS (um nome "<img onerror=...>" rodaria código no navegador de quem
  // importou). Tira < >, troca aspas e & por versões tipográficas, corta textos gigantes e
  // descarta chaves perigosas (__proto__...). Nomes e descrições continuam legíveis.
  const clean = (v, depth = 0) => {
    if (depth > 16) return null;
    if (typeof v === 'string') {
      return v
        .slice(0, 4000)
        .replace(/[<>]/g, '')
        .replace(/"/g, '”')
        .replace(/'/g, '’')
        .replace(/`/g, '´')
        .replace(/&/g, '＆');
    }
    if (Array.isArray(v)) return v.slice(0, 20000).map((x) => clean(x, depth + 1));
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).forEach((k) => {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype' || /[<>"'`&]/.test(k)) return;
        o[k] = clean(v[k], depth + 1);
      });
      return o;
    }
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    return typeof v === 'boolean' ? v : null;
  };
  App.cleanForeignSave = clean;

  const encode = (obj) => PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  const decode = (text) => {
    let t = String(text || '').trim();
    if (!t) throw new Error('vazio');
    if (t.length > 6e6) throw new Error('grande demais');
    if (t.startsWith(PREFIX)) t = decodeURIComponent(escape(atob(t.slice(PREFIX.length).replace(/\s+/g, ''))));
    const s = clean(JSON.parse(t));
    if (!s || typeof s !== 'object' || !s.profile || !s.currencies) throw new Error('não é um save do jogo');
    return s;
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const modal = (html) => {
    const m = document.getElementById('cinematic-modal');
    const c = document.getElementById('cinematic-modal-content');
    if (!m || !c) return null;
    c.innerHTML = `<div class="cinematic-box save-box" style="max-width:640px; border-top-color:#38bdf8">${html}</div>`;
    // A tela inicial (z 3000) fica acima das janelas (z 2600): esta sobe só enquanto está aberta
    m.style.zIndex = '3100';
    m.classList.add('open');
    return c;
  };
  const close = () => {
    const m = document.getElementById('cinematic-modal');
    if (!m) return;
    m.classList.remove('open');
    m.style.zIndex = '';
  };

  Object.assign(App, {
    // ---------------------------------------------------------------- exportar
    openSaveExport(n) {
      const used = [1, 2].filter((k) => this.readSlot(k));
      if (!used.length) return;
      if (!n && used.length > 1) {
        modal(`
          <div class="cinematic-badge" style="background:#38bdf8; color:#090d16">📤 EXPORTAR SAVE</div>
          <h2>QUAL CARREIRA?</h2>
          <div class="dilemma-buttons save-col">
            ${used.map((k) => `<button class="btn-dilemma shoot-choice" onclick="App.openSaveExport(${k})">CARREIRA ${k} • ${esc(this.slotSummary(k).name.toUpperCase())}</button>`).join('')}
            <button class="btn-dilemma" onclick="App.closeSaveModal()">CANCELAR</button>
          </div>`);
        return;
      }
      const slot = n || used[0];
      const code = encode(this.readSlot(slot));
      const info = this.slotSummary(slot);
      modal(`
        <div class="cinematic-badge" style="background:#38bdf8; color:#090d16">📤 EXPORTAR SAVE</div>
        <h2>${esc(info.name.toUpperCase())}</h2>
        <p class="cinematic-desc">${esc(info.chapter)} • ${esc(info.rank)}<br>Copie o código (ou baixe o arquivo) e, no outro lugar onde vai jogar, abra a tela inicial → <b>📥 IMPORTAR SAVE</b>.</p>
        <textarea id="save-code" class="save-code" readonly>${code}</textarea>
        <div class="dilemma-buttons save-col">
          <button class="btn-dilemma shoot-choice" onclick="App.copySaveCode()">📋 COPIAR CÓDIGO</button>
          <button class="btn-dilemma" onclick="App.downloadSave(${slot})">💾 BAIXAR ARQUIVO</button>
          <button class="btn-dilemma" onclick="App.closeSaveModal()">FECHAR</button>
        </div>`);
    },

    copySaveCode() {
      const ta = document.getElementById('save-code');
      if (!ta) return;
      const done = () => this.notify('📋 Código do save copiado!', '#38bdf8');
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(ta.value).then(done, () => this.copySaveFallback(ta, done));
      else this.copySaveFallback(ta, done);
    },
    copySaveFallback(ta, done) {
      ta.select();
      try {
        document.execCommand('copy');
        done();
      } catch (e) {
        this.notify('Selecione o código e copie manualmente.', '#f59e0b');
      }
    },

    downloadSave(slot) {
      const s = this.readSlot(slot);
      if (!s) return;
      const name = String(s.profile?.name || `carreira${slot}`).replace(/[^\w\-]+/g, '_');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([encode(s)], { type: 'text/plain' }));
      a.download = `blue-lock-save-${name}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },

    // ---------------------------------------------------------------- importar
    openSaveImport() {
      modal(`
        <div class="cinematic-badge" style="background:#38bdf8; color:#090d16">📥 IMPORTAR SAVE</div>
        <h2>TRAGA A SUA CARREIRA</h2>
        <p class="cinematic-desc">Cole o código que você copiou em <b>📤 EXPORTAR SAVE</b> (ou escolha o arquivo baixado).</p>
        <textarea id="save-code" class="save-code" placeholder="BLSAVE1:..."></textarea>
        <label class="save-file">📂 OU ESCOLHER ARQUIVO<input type="file" accept=".txt,.json,text/plain,application/json" onchange="App.readSaveFile(this)"></label>
        <div class="save-slot-pick">
          <span>GUARDAR EM:</span>
          ${[1, 2].map((k) => {
            const info = this.slotSummary(k);
            return `<label><input type="radio" name="save-slot" value="${k}" ${k === (this.readSlot(1) ? (this.readSlot(2) ? 1 : 2) : 1) ? 'checked' : ''}> CARREIRA ${k} <small>${info ? `(substitui ${esc(info.name)})` : '(vazio)'}</small></label>`;
          }).join('')}
        </div>
        <div class="dilemma-buttons save-col">
          <button class="btn-dilemma shoot-choice" onclick="App.confirmSaveImport()">📥 IMPORTAR</button>
          <button class="btn-dilemma" onclick="App.closeSaveModal()">CANCELAR</button>
        </div>`);
    },

    readSaveFile(input) {
      const f = input.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const ta = document.getElementById('save-code');
        if (ta) ta.value = String(r.result || '');
      };
      r.readAsText(f);
    },

    confirmSaveImport() {
      const text = document.getElementById('save-code')?.value;
      const slot = Number(document.querySelector('input[name="save-slot"]:checked')?.value || 1);
      let s;
      try {
        s = decode(text);
      } catch (e) {
        this.notify('Esse código não é um save do Blue Lock (confira se copiou ele inteiro).', '#ef4444');
        return;
      }
      if (this.readSlot(slot) && this._saveOverwriteOk !== slot) {
        this._saveOverwriteOk = slot; // a confirmação vale só para ESTA carreira
        this.notify(`A Carreira ${slot} já tem um save. Clique em IMPORTAR de novo para substituir.`, '#f59e0b');
        return;
      }
      this._saveOverwriteOk = false;
      try {
        localStorage.setItem(this.SLOT_KEYS[slot], JSON.stringify(s));
        localStorage.setItem('bluelock_active_slot', String(slot));
      } catch (e) {
        this.notify('Não deu para salvar neste navegador (sem espaço ou modo anônimo).', '#ef4444');
        return;
      }
      this.activeSlot = slot;
      close();
      this.titleMode = 'main';
      this.renderTitleMenu();
      this.notify(`📥 Carreira de ${s.profile?.name || 'você'} importada na Carreira ${slot}!`, '#22c55e');
    },

    closeSaveModal() {
      this._saveOverwriteOk = false;
      close();
    }
  });

  // Botões na tela inicial (no menu principal, embaixo das carreiras)
  const orig = App.renderTitleMenu;
  App.renderTitleMenu = function () {
    orig.apply(this, arguments);
    const box = document.getElementById('title-menu');
    if (!box || (this.titleMode && this.titleMode !== 'main')) return;
    const hasSave = [1, 2].some((k) => this.readSlot(k));
    const row = document.createElement('div');
    row.className = 'title-save-row';
    row.innerHTML = `
      ${hasSave ? '<button class="title-btn ghost" onclick="App.openSaveExport()">📤 EXPORTAR SAVE</button>' : ''}
      <button class="title-btn ghost" onclick="App.openSaveImport()">📥 IMPORTAR SAVE</button>`;
    box.appendChild(row);
  };
})();
