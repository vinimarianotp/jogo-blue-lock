// ============================================================================
// SAVE DA CARREIRA: versão, migração, validação e leitura/gravação seguras.
// Carregado logo antes do app.js. O App chama daqui no loadState/saveState/readSlot.
//
// Caminho de um save ao abrir (abrirTexto):
//   texto → JSON.parse → validate (tipos, antes de migrar) → migrate (v→v+1 até
//   SAVE_VERSION) → validate (de novo) → regras (consistência com os capítulos e
//   fluxos atuais) → estado pronto
//
// Versões (saveVersion; saves sem ela usam o storyVersion antigo):
//   1 → 2  o Torneio de Trios entrou entre a 3ª Seleção e a Sub-20 (índice pela lista antiga)
//   2 → 3  visual do protagonista estilo Isagi
//   3 → 4  as migrações sem versão que o loadState repetia em toda abertura (tutorial,
//          amistosos ch12b, Copa com grupos, resultado do cap. 1, clubes profissionais
//          novos, monstro). Rodam uma vez e o save é gravado já na v4.
// Para mudar o formato do save: suba SAVE_VERSION, escreva MIGRACOES[versão antiga] e
// gere um save de exemplo da versão antiga em testes/saves/ (ver testes/gerar_saves.js).
// ============================================================================
(function () {
  const SAVE_VERSION = 4;

  // ------------------------------------------------------------------ utilidades
  const ehObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  const copia = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  // número de verdade: "50" vira 50; NaN, Infinity, texto e null não são número
  const num = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
    return undefined;
  };
  const bool = (v) => (typeof v === 'boolean' ? v : v === 'true' || v === 1 ? true : v === 'false' || v === 0 ? false : undefined);
  const mostra = (v) => {
    let t;
    try {
      t = v === undefined ? 'nada' : JSON.stringify(v);
    } catch (e) {
      t = String(v);
    }
    return t.length > 40 ? t.slice(0, 37) + '...' : t;
  };

  // ------------------------------------------------------------------ armazenamento
  // Todo acesso ao localStorage passa por aqui: nunca lança, devolve { ok, valor/erro }
  const motivo = (e) => {
    const n = String((e && e.name) || '');
    if (/quota/i.test(n) || (e && (e.code === 22 || e.code === 1014))) return 'o navegador está sem espaço para o save';
    if (/security/i.test(n)) return 'o navegador bloqueou o armazenamento (modo restrito ou anônimo)';
    return (e && e.message) || String(e);
  };
  const ler = (chave) => {
    try {
      return { ok: true, valor: localStorage.getItem(chave) };
    } catch (e) {
      return { ok: false, valor: null, erro: motivo(e) };
    }
  };
  const gravar = (chave, texto) => {
    try {
      localStorage.setItem(chave, texto);
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: motivo(e) };
    }
  };
  const apagar = (chave) => {
    try {
      localStorage.removeItem(chave);
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: motivo(e) };
    }
  };

  // O App.state temporariamente trocado por outro objeto: as migrações e as regras usam os
  // métodos do App (que leem this.state) sobre o save que está sendo aberto. Nada é gravado,
  // redesenhado ou avisado enquanto isso.
  const comEstado = (outro, fn) => {
    const A = window.App;
    const real = A.state;
    const keep = { saveState: A.saveState, renderAll: A.renderAll, unlockAchievement: A.unlockAchievement, notify: A.notify };
    A.state = outro;
    A.saveState = () => ({ ok: true, sombra: true });
    A.renderAll = () => {};
    A.unlockAchievement = () => {};
    A.notify = () => {};
    try {
      return fn();
    } finally {
      A.state = real;
      Object.assign(A, keep);
    }
  };

  // ------------------------------------------------------------------ versão e migração
  // Saves sem saveVersion são de antes deste arquivo: a versão é o storyVersion (1 a 3)
  const versaoDoSave = (s) => {
    const v = num(s && s.saveVersion);
    if (v !== undefined && v >= 4) return Math.floor(v);
    const h = num(s && s.storyVersion);
    return Math.max(1, Math.min(3, Math.floor(h || 1)));
  };

  // MIGRACOES[v] leva um save da versão v para a v+1. Recebe o save já validado e o objeto
  // original (o que veio do texto), porque algumas regras antigas olhavam o que o save
  // tinha de verdade antes de receber os valores padrão.
  const MIGRACOES = {
    // 1 → 2: índice do capítulo convertido pelo id (App.migrateChapterIndex)
    1: (s) => comEstado(s, () => window.App.migrateChapterIndex()),
    // 2 → 3: cabelo e cores antigos do protagonista (App.migrateProtagonistLook)
    2: (s) => comEstado(s, () => window.App.migrateProtagonistLook()),
    // 3 → 4: as regras sem versão que o loadState rodava em toda abertura (app.js antigo,
    // linhas 734-783), na mesma ordem e com o mesmo resultado
    3: (s, orig) =>
      comEstado(s, () => {
        const A = window.App;
        // Quem já jogou antes do tutorial existir não precisa ver de novo
        if (!orig.tutorial) {
          const cc = orig.completedChapters;
          const played = Array.isArray(cc) ? cc.length : ehObj(cc) ? Object.values(cc).filter((x) => typeof x === 'string').length : 0;
          s.tutorial = { basic: played >= 1, advanced: played >= 2 };
        }
        // Quem já tinha começado a Copa (ou passado dela) antes dos amistosos existirem não
        // volta para eles (ter visto a convocação NÃO conta)
        const done = s.completedChapters;
        if (!done.includes('ch12b_wc_camp') && (done.includes('ch13_world_cup') || s.cup?.chapterId === 'ch13_world_cup')) {
          done.push('ch12b_wc_camp');
        }
        // A Copa antiga ganha a fase de grupos no começo (cup.v)
        A.migrateCupGroups();
        // O antigo Cap. 1 só fechava vencendo: quem o concluiu antes de existir o registro
        // de resultados venceu o Time X
        if (done.includes('ch1_first_selection_x_y') && !s.chapterResults?.ch1_first_selection_x_y && !orig.chapterResults) {
          s.chapterResults = Object.assign({}, s.chapterResults, { ch1_first_selection_x_y: 'win' });
        }
        // Carreira profissional assinada com um clube da NEL (antes dos clubes novos)
        if (window.PRO_LEGACY_MAP?.[s.proClub]) A.migrateProClubs();
        // Quem já passou do treino do Fox tem o monstro (saves de antes da marca existir)
        if (done.includes('ch10_fox_training')) s.monsterUnlocked = true;
      })
  };

  // Leva o save até a SAVE_VERSION, um passo por vez. Mexe no próprio objeto (que já deve
  // ter passado pelo validate) e devolve { save, de, para, passos }.
  function migrate(save, opcoes = {}) {
    const orig = opcoes.orig || save;
    const de = versaoDoSave(orig);
    const passos = [];
    for (let v = de; v < SAVE_VERSION; v++) {
      const passo = MIGRACOES[v];
      if (!passo) throw new Error(`falta a migração da versão ${v} para a ${v + 1}`);
      passo(save, orig);
      passos.push(`v${v}→v${v + 1}`);
    }
    // Save de uma versão MAIS NOVA do jogo (ex.: importado do site já atualizado): abre com
    // o que este jogo conhece, mas não rebaixa o número
    save.saveVersion = Math.max(SAVE_VERSION, de);
    return { save, de, para: save.saveVersion, passos };
  }

  // ------------------------------------------------------------------ validação
  // Campos de lista de ids (texto)
  const LISTAS_DE_TEXTO = ['completedChapters', 'unlockedAchievements', 'ownedAccessories', 'equippedAccessories', 'selectedSquad', 'unlockedWeapons', 'unlockedFlows'];
  // Campos que o jogo grava mas não estão no estado padrão: se vierem estragados, saem
  const EXTRAS_OBJETO = ['chapterResults', 'trainingRecords', 'easterEggs', 'fanMeets'];

  // Valor com o mesmo tipo do padrão (recursivo nos objetos)
  function porTipo(v, p, campo, nota) {
    if (typeof p === 'number') {
      const n = num(v);
      if (n === undefined) {
        nota(campo, v, p);
        return p;
      }
      if (typeof v !== 'number') nota(campo, v, n);
      return n;
    }
    if (typeof p === 'boolean') {
      const b = bool(v);
      if (b === undefined) {
        nota(campo, v, p);
        return p;
      }
      if (typeof v !== 'boolean') nota(campo, v, b);
      return b;
    }
    if (typeof p === 'string') {
      if (typeof v === 'string') return v;
      if (typeof v === 'number' && Number.isFinite(v)) {
        nota(campo, v, String(v));
        return String(v);
      }
      nota(campo, v, p);
      return p;
    }
    if (Array.isArray(p)) return lista(v, p, campo, nota);
    if (ehObj(p)) {
      if (!ehObj(v)) {
        nota(campo, v, p);
        return copia(p);
      }
      const out = Object.assign({}, v);
      Object.keys(p).forEach((k) => (out[k] = porTipo(out[k] === undefined ? p[k] : out[k], p[k], `${campo}.${k}`, nota)));
      // objeto só de números (moedas, atributos, estatísticas): as chaves a mais também
      Object.keys(out).forEach((k) => {
        if (k in p || !Object.values(p).every((x) => typeof x === 'number')) return;
        const n = num(out[k]);
        if (n !== undefined && typeof out[k] !== 'number') {
          nota(`${campo}.${k}`, out[k], n);
          out[k] = n;
        }
      });
      return out;
    }
    return v;
  }

  // Lista de texto: objeto {0:..,1:..} vira lista, texto sozinho vira [texto], o que não é
  // texto sai, null/número volta para o padrão
  function lista(v, p, campo, nota) {
    let out;
    if (Array.isArray(v)) out = v;
    else if (ehObj(v)) out = Object.values(v);
    else if (typeof v === 'string' && v) out = [v];
    else {
      nota(campo, v, p);
      return copia(p);
    }
    const limpa = out.filter((x) => typeof x === 'string');
    if (!Array.isArray(v) || limpa.length !== out.length) nota(campo, v, limpa);
    return limpa;
  }

  // Liga (NEL ou profissional): sem rodadas ou tabela não dá para continuar e ela recomeça
  // (o jogo monta de novo ao jogar o capítulo); o resto é consertado
  function liga(v, chaveLiga, nota) {
    if (v == null) return null;
    const campo = chaveLiga;
    const rodadasOk = ehObj(v) && Array.isArray(v.rounds) && v.rounds.length && v.rounds.every((r) => Array.isArray(r) && r.every((p) => Array.isArray(p)));
    if (!rodadasOk || !ehObj(v.table)) {
      nota(campo, v, null);
      return null;
    }
    const L = window.LEAGUES?.[chaveLiga];
    const out = Object.assign({}, v);
    const clubes = new Set();
    out.rounds.forEach((r) => r.forEach((p) => p.forEach((c) => typeof c === 'string' && clubes.add(c))));
    clubes.forEach((c) => {
      const row = out.table[c];
      const ok = ehObj(row) && ['j', 'v', 'e', 'd', 'gp', 'gc', 'pts'].every((k) => num(row[k]) !== undefined);
      if (ok) return;
      const novo = {};
      ['j', 'v', 'e', 'd', 'gp', 'gc', 'pts'].forEach((k) => (novo[k] = (ehObj(row) && num(row[k])) || 0));
      nota(`${campo}.table.${c}`, row, novo);
      out.table[c] = novo;
    });
    if (!Array.isArray(out.results) || out.results.length !== out.rounds.length || !out.results.every((r) => Array.isArray(r))) {
      const res = out.rounds.map((r, i) => (Array.isArray(out.results?.[i]) ? out.results[i] : []));
      nota(`${campo}.results`, out.results, '(uma lista por rodada)');
      out.results = res;
    }
    out.results = out.results.map((rs) => {
      const f = rs.filter((x) => ehObj(x));
      if (f.length !== rs.length) nota(`${campo}.results`, rs, f);
      return f;
    });
    if (!ehObj(out.values)) {
      nota(`${campo}.values`, out.values, '(valores iniciais da liga)');
      out.values = Object.assign({}, L?.startValues || {});
    }
    if (!ehObj(out.prevValues)) out.prevValues = Object.assign({}, out.values);
    ['round', 'games'].forEach((k) => {
      const n = num(out[k]);
      const f = n === undefined ? 0 : Math.max(0, Math.floor(n));
      if (f !== out[k]) nota(`${campo}.${k}`, out[k], f);
      out[k] = f;
    });
    return out;
  }

  // Arma ou fluxo equipado: objeto com id; um id solto em texto vira o item do banco
  function equipado(v, banco, campo, nota) {
    if (v == null) return null;
    if (ehObj(v) && typeof v.id === 'string') return v;
    const achado = typeof v === 'string' && (banco || []).find((x) => x.id === v);
    const out = achado ? Object.assign({}, achado) : null;
    nota(campo, v, out ? out.id : null);
    return out;
  }

  const textoOuNulo = (v, campo, nota) => {
    if (v == null || typeof v === 'string') return v ?? null;
    nota(campo, v, null);
    return null;
  };

  // Regras de cada campo que não saem só do tipo do padrão
  const ESPECIAIS = {
    currentChapterIndex(v, p, nota, s, opcoes) {
      const chs = window.CAREER_CHAPTERS || [];
      const n = num(v);
      if (opcoes.antesDeMigrar) {
        // ainda pode ser o índice da lista antiga: só precisa ser um número inteiro
        const f = n === undefined ? 0 : Math.max(0, Math.floor(n));
        if (f !== v) nota('currentChapterIndex', v, f);
        return f;
      }
      // Fora da lista (999, 'abc') ou "campeão" sem ter vencido o último capítulo: volta
      // para o começo e as regras andam por cima dos capítulos concluídos
      const ultimo = chs[chs.length - 1];
      const done = Array.isArray(s.completedChapters) ? s.completedChapters : [];
      const ok = Number.isInteger(n) && n >= 0 && n <= chs.length && (n < chs.length || !ultimo || done.includes(ultimo.id));
      if (ok) return n;
      nota('currentChapterIndex', v, '(recalculado pelos capítulos concluídos)');
      return 0;
    },
    difficulty(v, p, nota) {
      if (typeof v === 'string' && window.DIFFICULTY_MODES?.[v]) return v;
      nota('difficulty', v, p);
      return p;
    },
    nelClub: (v, p, nota) => textoOuNulo(v, 'nelClub', nota),
    proClub: (v, p, nota) => textoOuNulo(v, 'proClub', nota),
    selectedNelEvolution: (v, p, nota) => textoOuNulo(v, 'selectedNelEvolution', nota),
    nel: (v, p, nota) => liga(v, 'nel', nota),
    pro: (v, p, nota) => liga(v, 'pro', nota),
    trio(v, p, nota) {
      if (v == null) return null;
      if (!ehObj(v) || typeof v.chapterId !== 'string') {
        nota('trio', v, null);
        return null;
      }
      const out = Object.assign({}, v);
      out.mates = lista(Array.isArray(v.mates) ? v.mates : [], [], 'trio.mates', nota);
      out.round = porTipo(v.round, 0, 'trio.round', nota);
      return out;
    },
    cup(v, p, nota) {
      if (v == null) return null;
      if (!ehObj(v) || typeof v.chapterId !== 'string') {
        nota('cup', v, null);
        return null;
      }
      const out = Object.assign({}, v);
      out.round = porTipo(v.round, 0, 'cup.round', nota);
      if ('group' in out && out.group != null) {
        if (!ehObj(out.group)) {
          nota('cup.group', out.group, null);
          delete out.group;
        } else {
          const g = Object.assign({}, out.group);
          if (!ehObj(g.results)) (nota('cup.group.results', g.results, {}), (g.results = {}));
          if (!Array.isArray(g.sims)) (nota('cup.group.sims', g.sims, []), (g.sims = []));
          g.sims = g.sims.filter((x) => Array.isArray(x) && x.length >= 4);
          out.group = g;
        }
      }
      return out;
    },
    equippedWeapon: (v, p, nota) => equipado(v, window.WEAPONS_DB, 'equippedWeapon', nota),
    equippedWeapon2: (v, p, nota) => equipado(v, window.WEAPONS_DB, 'equippedWeapon2', nota),
    equippedFlow: (v, p, nota) => equipado(v, window.FLOWS_DB, 'equippedFlow', nota),
    equippedFlow2: (v, p, nota) => equipado(v, window.FLOWS_DB, 'equippedFlow2', nota),
    affinities(v, p, nota) {
      if (!ehObj(v)) {
        nota('affinities', v, p);
        return copia(p);
      }
      const out = Object.assign({}, v);
      Object.keys(out).forEach((k) => {
        const n = num(out[k]);
        const f = n === undefined ? (typeof p[k] === 'number' ? p[k] : 50) : n;
        if (f !== out[k]) nota(`affinities.${k}`, out[k], f);
        out[k] = f;
      });
      return out;
    },
    seenInterludes: (v, p, nota) => (ehObj(v) ? v : (nota('seenInterludes', v, {}), {})),
    dialogueChoices: (v, p, nota) => (ehObj(v) ? v : (nota('dialogueChoices', v, {}), {}))
  };

  // Confere o tipo de cada campo do save contra o estado padrão e CONSERTA o que vier
  // errado (nunca descarta a carreira): "50" vira 50, NaN/null vira o padrão, lista que
  // veio como objeto vira lista, índice de capítulo fora da faixa é recalculado.
  // Devolve { save (cópia nova), consertos: ['campo: antes → depois', ...] }.
  function validate(entrada, padrao, opcoes = {}) {
    if (!ehObj(entrada)) throw new Error('o save não é um objeto');
    padrao = padrao || window.App.defaultState();
    const consertos = opcoes.consertos || [];
    const nota = (campo, de, para) => consertos.push(`${campo}: ${mostra(de)} → ${mostra(para)}`);
    const s = Object.assign(copia(padrao), copia(entrada));
    Object.keys(padrao).forEach((k) => {
      if (k === 'currentChapterIndex') return; // depois das listas (olha os capítulos concluídos)
      if (ESPECIAIS[k]) s[k] = ESPECIAIS[k](s[k], padrao[k], nota, s, opcoes);
      else if (LISTAS_DE_TEXTO.includes(k)) s[k] = lista(s[k], padrao[k], k, nota);
      else s[k] = porTipo(s[k], padrao[k], k, nota);
    });
    s.currentChapterIndex = ESPECIAIS.currentChapterIndex(s.currentChapterIndex, 0, nota, s, opcoes);
    EXTRAS_OBJETO.forEach((k) => {
      if (k in s && !ehObj(s[k])) {
        nota(k, s[k], 'nada');
        delete s[k];
      }
    });
    if ('cityClock' in s && num(s.cityClock) === undefined) {
      nota('cityClock', s.cityClock, 'nada');
      delete s.cityClock;
    }
    return { save: s, consertos };
  }

  // ------------------------------------------------------------------ regras de consistência
  // Rodam em TODA abertura porque dependem dos dados atuais do jogo (lista de capítulos,
  // cenas, fluxos, OVR), não da versão do save. São idempotentes: num save que já está
  // certo, não mudam nada. (Antes ficavam no meio do loadState.)
  function regras(s) {
    const A = window.App;
    const chs = window.CAREER_CHAPTERS || [];
    comEstado(s, () => {
      // Capítulos novos inseridos no meio: o índice anda por cima dos já concluídos e dos
      // novos que o save já passou (viram CAPÍTULO NOVO na HISTÓRIA)
      A.skipCompletedChapters(s);
      // Rodada do Trio/Copa fora do limite (save mexido ou de outra versão) travava a tela
      const fitRound = (key, listKey) => {
        const st = s[key];
        if (!st) return;
        const n = (chs.find((c) => c.id === st.chapterId)?.[listKey] || []).length;
        if (!n) s[key] = null;
        else st.round = Math.max(0, Math.min(n - 1, Math.floor(Number(st.round) || 0)));
      };
      fitRound('trio', 'trioRounds');
      fitRound('cup', 'cupRounds');
      // Cenas que entraram depois: quem já passou delas pode ver no 🎬 REVER
      A.markPostMatchScenesSeen();
      // O Rin é rival mortal depois da Sub-20 (química 0 para sempre)
      A.enforceRivalries();
      // O save guarda o Fluxo inteiro: troca pela versão atual (as passivas novas)
      s.equippedFlow = window.resolveFlow?.(s.equippedFlow) ?? s.equippedFlow;
      s.equippedFlow2 = window.resolveFlow?.(s.equippedFlow2) ?? s.equippedFlow2;
      // AMBOS escolhido antes de virar passiva de nascença: só fica se já tem o OVR
      if (s.profile.dominantFoot === 'AMBOS' && !A.canBeAmbidextrous()) s.profile.dominantFoot = 'DIREITA';
    });
  }

  // ------------------------------------------------------------------ abrir um save
  const pareceCarreira = (o) => ['profile', 'currencies', 'stats', 'completedChapters', 'currentChapterIndex'].some((k) => k in o);

  // Objeto (já lido do texto) → { ok, save, de, para, migrou, consertos } ou { ok: false, erro }
  function abrirObjeto(orig) {
    if (!ehObj(orig) || !pareceCarreira(orig)) return { ok: false, erro: 'o arquivo não tem o formato de uma carreira do jogo' };
    try {
      const padrao = window.App.defaultState();
      const consertos = [];
      const s0 = validate(orig, padrao, { consertos, antesDeMigrar: true }).save;
      const m = migrate(s0, { orig });
      const s = validate(m.save, padrao, { consertos }).save;
      regras(s);
      return { ok: true, save: s, de: m.de, para: m.para, migrou: m.de !== m.para, passos: m.passos, consertos };
    } catch (e) {
      // Erro inesperado (bug numa migração ou regra): a carreira NÃO é trocada pela padrão
      console.error('[save] o save não pôde ser convertido:', e);
      return { ok: false, erro: `erro ao converter o save (${(e && e.message) || e})` };
    }
  }

  function abrirTexto(texto) {
    let orig;
    try {
      orig = JSON.parse(texto);
    } catch (e) {
      return { ok: false, erro: 'o texto do save está cortado ou estragado' };
    }
    return abrirObjeto(orig);
  }

  // Espiar um espaço sem gravar nada (resumo do menu, exportar): o resultado fica guardado
  // enquanto o texto do espaço for o mesmo. Devolve uma CÓPIA do save.
  const espiados = {};
  function espiar(chave) {
    const lido = ler(chave);
    if (!lido.ok) return { estado: 'sem-storage', erro: lido.erro };
    if (!lido.valor) return { estado: 'vazio' };
    let r = espiados[chave];
    if (!r || r.texto !== lido.valor) {
      r = { texto: lido.valor, res: abrirTexto(lido.valor) };
      espiados[chave] = r;
    }
    if (!r.res.ok) return { estado: 'quebrado', erro: r.res.erro };
    return { estado: 'ok', save: copia(r.res.save), de: r.res.de, para: r.res.para, migrou: r.res.migrou, consertos: r.res.consertos.slice() };
  }

  // Abre o espaço para jogar. Se precisou migrar ou consertar, grava a versão nova.
  // { estado: 'ok' | 'vazio' | 'quebrado' | 'sem-storage', save, erro, ... }
  function carregarEspaco(chave) {
    const lido = ler(chave);
    if (!lido.ok) return { estado: 'sem-storage', erro: lido.erro };
    if (!lido.valor) return { estado: 'vazio' };
    const r = abrirTexto(lido.valor);
    if (!r.ok) return { estado: 'quebrado', erro: r.erro };
    if (r.migrou || r.consertos.length) gravar(chave, JSON.stringify(r.save));
    return { estado: 'ok', save: r.save, de: r.de, para: r.para, migrou: r.migrou, consertos: r.consertos };
  }

  // Grava o estado da carreira no espaço (sempre com a saveVersion)
  function salvar(chave, estado) {
    estado.saveVersion = Math.max(SAVE_VERSION, num(estado.saveVersion) || 0);
    let texto;
    try {
      texto = JSON.stringify(estado);
    } catch (e) {
      return { ok: false, erro: `o estado não pôde virar texto (${e.message})` };
    }
    return gravar(chave, texto);
  }

  window.SaveSystem = {
    SAVE_VERSION,
    ler,
    gravar,
    apagar,
    versaoDoSave,
    migrate,
    validate,
    regras,
    abrirTexto,
    abrirObjeto,
    espiar,
    carregarEspaco,
    salvar,
    comEstado
  };
})();
