// ============================================================================
// EASTER EGGS: segredos escondidos. Cada um encontrado pela 1ª vez dá +100 EgoCoins;
// achar todos libera a conquista "Caçador de Segredos". Ficam em state.easterEggs.
//   konami → ↑ ↑ ↓ ↓ ← → ← → B A (fora da partida): o Ego comenta a "trapaça"
//   logo   → clicar 7 vezes no "BL" do canto superior esquerdo: o Ego te pega no flagra
//   fox    → digitar "fox" (fora da partida): a raposa responde do escuro
//   isagi  → digitar "isagi" (fora da partida): o nome que já tem dono
//   night  → abrir o jogo entre meia-noite e 4 da manhã: o Bachira também não dorme
// (só aparecem para quem já entrou no Blue Lock: nada de spoiler no Prólogo)
// ============================================================================
(function () {
  const App = window.App;
  if (!App) return;

  const EGGS = {
    konami: 'Código Egoísta',
    logo: 'O Ego Te Observa',
    fox: 'A Raposa Escuta',
    isagi: 'O Nome Que Já Tem Dono',
    night: 'Insônia do Monstro'
  };
  const TOTAL = Object.keys(EGGS).length;

  // Pode disparar agora? (fora de partida, cena, modal, tela inicial e criador)
  const idle = () => {
    if (!App.state?.blueLockEntered) return false;
    if (window.MatchEngine?.active || window.CutsceneEngine?.active || window.CutsceneEngine?.sakugaActive) return false;
    if (document.getElementById('cinematic-modal')?.classList.contains('open')) return false;
    if (document.getElementById('title-screen')?.classList.contains('open')) return false;
    if (document.getElementById('creator-screen')?.classList.contains('open')) return false;
    return true;
  };

  const found = (id, lines, opts = {}) => {
    const st = App.state;
    st.easterEggs = st.easterEggs || {};
    const first = !st.easterEggs[id];
    st.easterEggs[id] = true;
    const n = Object.keys(st.easterEggs).filter((k) => EGGS[k]).length;
    if (first) {
      st.currencies.egoCoins += 100;
      App.saveState();
    }
    const after = () => {
      App.renderAll?.();
      App.notify(`🥚 SEGREDO ${first ? 'DESCOBERTO' : 'JÁ ENCONTRADO'}: ${EGGS[id]} (${n}/${TOTAL})${first ? ' • +100 EgoCoins' : ''}`, '#facc15');
      if (first && n === TOTAL) App.unlockAchievement('ach_secrets');
    };
    window.CutsceneEngine.play(Object.assign({ locationTitle: '🥚 SEGREDO', crestTitle: 'BLUE LOCK', bg: 'monitor_room', lines, onComplete: after }, opts));
  };

  // ---------------------------------------------------------------- teclado
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let seq = [];
  let typed = '';
  // Shift, Ctrl, Alt, Caps Lock... não contam (com Shift para o "B" maiúsculo a sequência
  // quebrava sem ninguém entender por quê)
  const MODS = new Set(['shift', 'control', 'alt', 'altgraph', 'meta', 'capslock', 'numlock', 'os', 'fn']);
  let warned = 0;
  window.addEventListener('keydown', (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.repeat) return;
    const k = (e.key || '').toLowerCase();
    if (MODS.has(k)) return;
    seq = [...seq, k].slice(-KONAMI.length);
    if (k.length === 1 && k >= 'a' && k <= 'z') typed = (typed + k).slice(-12);
    if (!idle()) {
      // fez o segredo no lugar errado: avisa onde ele funciona (antes não acontecia nada)
      const hit = seq.join(',') === KONAMI.join(',') || typed.endsWith('fox') || typed.endsWith('isagi');
      if (hit && Date.now() - warned > 4000 && App.notify) {
        warned = Date.now();
        App.notify(App.state?.blueLockEntered ? '🥚 Quase! Os segredos só funcionam nas telas do Blue Lock (fora de partida, cena e janelas abertas).' : '🥚 Quase! Os segredos só aparecem depois que você entra no Blue Lock.', '#facc15');
      }
      return;
    }
    if (seq.join(',') === KONAMI.join(',')) {
      seq = [];
      found('konami', [
        { speaker: 'JINPACHI EGO', text: '"...Você digitou um código de 1986 para conseguir vantagem."', mood: 'ego' },
        { speaker: 'JINPACHI EGO', text: '"Isso é o oposto de talento. É o oposto de esforço."', mood: 'ego' },
        { speaker: 'JINPACHI EGO', text: '"...Mas a audácia de tentar? Isso é egoísmo puro. Fica com as moedas. Não conte para ninguém."', mood: 'ego' }
      ]);
    } else if (typed.endsWith('fox')) {
      typed = '';
      found('fox', [
        { dark: true, music: 'dread', speaker: 'NARRADOR', text: 'A tela escurece. Um charuto acende em algum lugar que não deveria existir.', mood: 'tense' },
        { speaker: 'FOX', displayName: '???', shadowFace: true, text: '"Hehehe... digitando o meu nome no escuro? Eu ouço tudo, monstro."', mood: 'ego' },
        { speaker: 'FOX', displayName: '???', shadowFace: true, text: '"Toma umas moedas. Considera um adiantamento... pelo que você ainda vai me dever."', mood: 'happy' }
      ], { bg: 'tunnel', dark: true });
    } else if (typed.endsWith('isagi')) {
      typed = '';
      found('isagi', [
        { speaker: 'JINPACHI EGO', text: '"Isagi Yoichi? Esse nome já tem dono... em outro universo."', mood: 'ego' },
        { speaker: 'JINPACHI EGO', text: `"Aqui o protagonista se chama ${App.state.profile?.name || 'você'}. Pare de procurar o herói de outra história e vire o da sua."`, mood: 'ego' }
      ]);
    }
  });

  // ---------------------------------------------------------------- o "BL" do canto
  let clicks = 0;
  let clickTimer = null;
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('.sh-brand-mark')) return;
    clicks++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => (clicks = 0), 1500);
    if (clicks >= 7 && idle()) {
      clicks = 0;
      const quotes = [
        '"Clicando sete vezes no logo? Esse é o nível de foco que você leva para o campo?"',
        '"Eu tenho câmeras em cada canto deste prédio. Inclusive neste."',
        '"Pare de apertar botões aleatórios e vá treinar. ...Ou continue. Curiosidade também é fome."'
      ];
      // e libera o Fluxo secreto O Olhar do Ego (vale também para quem já tinha achado
      // este segredo antes dele existir)
      const fresh = App.unlockSecretFlow?.('fl_mitico_olhar_ego');
      const lines = [{ speaker: 'JINPACHI EGO', text: quotes[Math.floor(Math.random() * quotes.length)], mood: 'ego' }];
      if (fresh) {
        lines.push(
          { speaker: 'JINPACHI EGO', text: '"...Já que você gosta tanto de ser observado, leve o meu olhar com você. Quem chegar perto vai sentir o peso dele."', mood: 'ego' },
          { speaker: 'NARRADOR', text: '🥚 FLUXO SECRETO LIBERADO: O Olhar do Ego (Mítico). Equipe na tela de Fluxos, em "Fluxos secretos".', mood: 'ego' }
        );
      }
      found('logo', lines);
    }
  });

  // ---------------------------------------------------------------- de madrugada
  // (uma vez por sessão, alguns segundos depois de abrir, quando já dá para mostrar)
  const h = new Date().getHours();
  if (h < 4) {
    let tries = 0;
    const t = setInterval(() => {
      if (++tries > 120) return clearInterval(t);
      if (!idle()) return;
      clearInterval(t);
      found('night', [
        { speaker: 'MEGURU BACHIRA', text: '"Ei... você também não consegue dormir? Hehe."', mood: 'happy' },
        { speaker: 'MEGURU BACHIRA', text: '"O monstro dentro de mim acorda à noite. Parece que o seu também. Bora jogar mais uma?"', mood: 'happy' }
      ]);
    }, 5000);
  }
})();
