// ============================================================================
// ESTADO CENTRAL (fachada): GameState lê e muda o estado da carreira (o App.state) por um
// caminho só e avisa quem quiser saber (evento "mudou"). Carregado antes do save.js.
//
// Primeiro passo (Fase 1): o jogo ainda lê e escreve App.state direto em ~300 lugares, e
// isso NÃO foi reescrito. Usam a fachada:
//   - js/save.js: migrações e regras rodam sobre o save que está sendo aberto (comEstado)
//   - App.loadState / App.startNewCareer (substituir) e App.saveState (get)
//   - duo_saga.withShadow: as contas da dupla sobre o "save sombra" (comEstado)
// Código novo deve preferir GameState.get/set/update a mexer no App.state.
//
//   GameState.get()                         o estado inteiro
//   GameState.get('currencies.egoCoins')    um valor (undefined se o caminho não existe)
//   GameState.set('currencies.egoCoins', 9) troca um valor e avisa
//   GameState.update('nel', (nel) => {...}) muda com uma função (devolver um valor troca)
//   GameState.on('mudou', (d) => {...})     d = { caminho, valor, antes, motivo }; devolve o "desligar"
//   GameState.comEstado(outro, fn)          roda fn com OUTRO objeto no lugar do estado
// ============================================================================
(function () {
  const ouvintes = {};
  let sombra = 0; // > 0 enquanto comEstado troca o estado: nada é avisado

  const partes = (p) => (Array.isArray(p) ? p.slice() : String(p ?? '').split('.').filter(Boolean));

  function emitir(evento, dados) {
    if (sombra) return;
    (ouvintes[evento] || []).slice().forEach((fn) => {
      try {
        fn(dados);
      } catch (e) {
        console.error(`[estado] erro num ouvinte de "${evento}":`, e);
      }
    });
  }

  const GameState = {
    get(caminho) {
      const s = window.App?.state;
      const ks = partes(caminho);
      return ks.reduce((o, k) => (o == null ? undefined : o[k]), s);
    },

    // Cria os objetos do caminho que faltarem
    set(caminho, valor) {
      const s = window.App?.state;
      const ks = partes(caminho);
      if (!s || !ks.length) return undefined;
      const ultimo = ks.pop();
      let o = s;
      ks.forEach((k) => {
        if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
        o = o[k];
      });
      const antes = o[ultimo];
      o[ultimo] = valor;
      emitir('mudou', { caminho: ks.concat(ultimo).join('.'), valor, antes });
      return valor;
    },

    // update(fn) ou update(caminho, fn): fn recebe o valor atual e pode mexer nele ou
    // devolver outro (que entra no lugar)
    update(caminho, fn) {
      if (typeof caminho === 'function') {
        fn = caminho;
        caminho = '';
      }
      const s = window.App?.state;
      if (!s) return undefined;
      if (!partes(caminho).length) {
        const r = fn(s);
        if (r && typeof r === 'object' && r !== s) return GameState.substituir(r, 'update');
        emitir('mudou', { caminho: '', valor: s });
        return s;
      }
      const atual = GameState.get(caminho);
      const r = fn(atual);
      if (r !== undefined && r !== atual) return GameState.set(caminho, r);
      emitir('mudou', { caminho: partes(caminho).join('.'), valor: atual });
      return atual;
    },

    // O estado todo de uma vez (abrir uma carreira, começar outra)
    substituir(novo, motivo) {
      const A = window.App;
      const antes = A.state;
      A.state = novo;
      emitir('mudou', { caminho: '', valor: novo, antes, motivo });
      return novo;
    },

    on(evento, fn) {
      (ouvintes[evento] = ouvintes[evento] || []).push(fn);
      return () => GameState.off(evento, fn);
    },

    off(evento, fn) {
      ouvintes[evento] = (ouvintes[evento] || []).filter((f) => f !== fn);
    },

    // Roda fn com OUTRO objeto no lugar do estado e devolve o de verdade no fim, mesmo com
    // erro. Enquanto isso nada é gravado, redesenhado nem avisado (saveState, renderAll,
    // unlockAchievement e notify ficam mudos) e o "mudou" não dispara. Pode aninhar.
    comEstado(outro, fn) {
      const A = window.App;
      const real = A.state;
      const keep = { saveState: A.saveState, renderAll: A.renderAll, unlockAchievement: A.unlockAchievement, notify: A.notify };
      A.state = outro;
      A.saveState = () => ({ ok: true, sombra: true });
      A.renderAll = () => {};
      A.unlockAchievement = () => {};
      A.notify = () => {};
      sombra++;
      try {
        return fn();
      } finally {
        sombra--;
        A.state = real;
        Object.assign(A, keep);
      }
    },

    emSombra: () => sombra > 0
  };

  window.GameState = GameState;
})();
