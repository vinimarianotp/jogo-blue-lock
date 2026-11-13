// ============================================================================
// ABAS SOB DEMANDA (desempenho)
// O App.renderAll remonta todas as abas a cada troca de aba e a cada mudança de estado
// (o switchTab chama o renderAll). A ARMAS sozinha custava 281 ms no PC e 874 ms no
// celular emulado, mesmo escondida. Agora as abas pesadas — ARMAS, FLUXO, LOJA e PERFIL —
// só são montadas quando estão na tela; escondidas, ficam marcadas como "sujas" e são
// montadas quando abrem (abrir uma aba passa pelo switchTab → renderAll, que monta a que
// acabou de aparecer). As leves continuam como antes: a entrada animada delas e o "novo!"
// das conquistas contam com a chamada de sempre, e elas custam ~1 ms.
// Precisa vir DEPOIS dos js/ui_*.js (eles trocam as funções render* do App) — as funções
// são embrulhadas do jeito que estiverem aqui. O hub.js e o mobile.js embrulham o
// switchTab, não estas.
// ============================================================================
(function () {
  const App = window.App;
  if (!App) return;
  // aba → função que monta a aba
  const LAZY = { ARMAS: 'renderWeaponsTab', FLUXO: 'renderFlowsTab', LOJA: 'renderShopTab', PROFILE: 'renderProfileTab' };
  const dirty = new Set();
  // (a aba está na tela? o mesmo teste que as próprias abas usam para a entrada animada)
  const shown = (tab) => {
    const p = document.getElementById(`tab-${tab}`);
    return !!p && p.offsetParent !== null;
  };
  Object.keys(LAZY).forEach((tab) => {
    const name = LAZY[tab];
    const orig = App[name];
    if (typeof orig !== 'function') return;
    App[name] = function () {
      if (!shown(tab)) {
        dirty.add(tab);
        // Chamada escondida: as abas guardam "estava na tela?" para tocar a entrada animada
        // quando voltam a aparecer; antes isso era atualizado por esta chamada escondida
        if (tab === 'PROFILE') {
          if (this._prfVis) this._prfVis.PROFILE = false;
        } else if (this._colVis) this._colVis[tab] = false;
        return undefined;
      }
      dirty.delete(tab);
      return orig.apply(this, arguments);
    };
  });
  // (para os testes: quais abas estão esperando para ser montadas)
  App.abasSujas = () => Array.from(dirty);
})();
