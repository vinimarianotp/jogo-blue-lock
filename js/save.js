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

  // O estado temporariamente trocado pelo save que está sendo aberto (js/state.js): as
  // migrações e as regras usam os métodos do App, que leem this.state. Nada é gravado,
  // redesenhado ou avisado enquanto isso.
  const comEstado = (outro, fn) => window.GameState.comEstado(outro, fn);

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

  // ------------------------------------------------------------------ cópias de segurança
  // <chave>_bak            o save anterior, guardado antes de cada gravação por cima
  //                        (só se ele abria bem)
  // <chave>_quebrado       o texto cru de um save que não abriu (nunca é apagado pelo jogo)
  // <chave>_antes_v<N>     o save como estava antes de ser migrado para a versão N (uma vez)
  const BAK = '_bak';
  const QUEBRADO = '_quebrado';
  // Espaços que esta aba NÃO pode gravar: 'quebrado' (a carreira não abriu e o estado na
  // memória é só o padrão; gravar destruiria o save) e 'outra-aba' (ver vigiarOutrasAbas)
  const travas = {};

  // Abre bem o bastante para valer de backup (texto de uma carreira)
  const abreBem = (texto) => {
    try {
      const o = JSON.parse(texto);
      return ehObj(o) && pareceCarreira(o);
    } catch (e) {
      return false;
    }
  };
  const guardarQuebrado = (chave, texto) => {
    if (texto && ler(chave + QUEBRADO).valor !== texto) gravar(chave + QUEBRADO, texto);
  };

  // Grava por cima guardando a versão anterior: em <chave>_bak se ela abria bem, em
  // <chave>_quebrado se não abria (assim nada se perde)
  function gravarComBackup(chave, texto) {
    const antes = ler(chave).valor;
    if (antes && antes !== texto) {
      if (abreBem(antes)) gravar(chave + BAK, antes);
      else guardarQuebrado(chave, antes);
    }
    const g = gravar(chave, texto);
    if (g.ok) espiados[chave] = null;
    return g;
  }

  // A versão de um save aberto, para mostrar ao jogador (importar)
  function textoVersao(r) {
    if (!r || !r.ok) return '';
    if (r.de > SAVE_VERSION) return `save da versão ${r.de}, mais nova que a deste jogo (${SAVE_VERSION})`;
    return r.migrou ? `save da versão ${r.de}, convertido para a ${r.para}` : `save da versão ${r.para}`;
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
      if (!r.res.ok) guardarQuebrado(chave, lido.valor);
    }
    if (!r.res.ok) return { estado: 'quebrado', erro: r.res.erro };
    return { estado: 'ok', save: copia(r.res.save), de: r.res.de, para: r.res.para, migrou: r.res.migrou, consertos: r.res.consertos.slice() };
  }

  // Abre o espaço para jogar. Se precisou migrar ou consertar, grava a versão nova (com o
  // save de antes guardado). Se não abriu, guarda o texto cru e TRAVA o espaço: o estado
  // padrão que fica na memória nunca é gravado por cima da carreira.
  // { estado: 'ok' | 'vazio' | 'quebrado' | 'sem-storage', save, erro, ... }
  function carregarEspaco(chave) {
    const lido = ler(chave);
    if (!lido.ok) return { estado: 'sem-storage', erro: lido.erro };
    // abrir de novo lê o que a outra aba gravou: esta aba volta a poder salvar
    if (travas[chave] === 'outra-aba') limparAviso('outra-aba');
    delete travas[chave];
    if (!lido.valor) return { estado: 'vazio' };
    const r = abrirTexto(lido.valor);
    if (!r.ok) {
      guardarQuebrado(chave, lido.valor);
      travas[chave] = 'quebrado';
      return { estado: 'quebrado', erro: r.erro };
    }
    if (r.migrou && !ler(`${chave}_antes_v${r.para}`).valor) gravar(`${chave}_antes_v${r.para}`, lido.valor);
    if (r.migrou || r.consertos.length) gravarComBackup(chave, JSON.stringify(r.save));
    return { estado: 'ok', save: r.save, de: r.de, para: r.para, migrou: r.migrou, consertos: r.consertos };
  }

  // Grava o estado da carreira no espaço (sempre com a saveVersion e o backup do anterior).
  // Devolve { ok, erro }. Se não gravar, avisa na tela (uma vez por problema; o aviso some
  // quando uma gravação der certo). opcoes.forcar: o jogador escolheu substituir (recuperar
  // backup, importar, recomeçar).
  const MOTIVO_TRAVA = {
    quebrado: 'o save desta carreira não abriu (use o painel da tela inicial)',
    'outra-aba': 'esta carreira foi salva em outra aba, então esta parou de salvar (recarregue a página)'
  };
  function salvar(chave, estado, opcoes = {}) {
    if (travas[chave] && !opcoes.forcar) return { ok: false, erro: MOTIVO_TRAVA[travas[chave]] || travas[chave], travado: travas[chave] };
    estado.saveVersion = Math.max(SAVE_VERSION, num(estado.saveVersion) || 0);
    let texto;
    let g;
    try {
      texto = JSON.stringify(estado);
    } catch (e) {
      g = { ok: false, erro: `o estado do jogo não pôde virar texto (${e.message})` };
    }
    if (!g) g = gravarComBackup(chave, texto);
    if (g.ok) {
      delete travas[chave];
      limparAviso('falha');
    } else {
      avisar('falha', `O jogo NÃO conseguiu salvar: ${g.erro}. O que você fez desde a última gravação pode se perder ao fechar a aba. Libere espaço no navegador (ou saia do modo anônimo): o jogo tenta de novo a cada ação.`);
    }
    return g;
  }

  // ------------------------------------------------------------------ aviso no topo da tela
  // Uma faixa fixa (não um aviso que some): aparece uma vez por problema, não se repete a
  // cada gravação e, se o jogador fechar, só volta quando o problema mudar.
  let aviso = null;
  function avisar(tipo, texto, botao) {
    if (aviso && aviso.tipo === tipo && aviso.texto === texto) return;
    let el = document.getElementById('save-aviso');
    if (!el) {
      el = document.createElement('div');
      el.id = 'save-aviso';
      el.setAttribute('role', 'alert');
      document.body.appendChild(el);
    }
    aviso = { tipo, texto };
    el.className = `save-aviso save-aviso-${tipo}`;
    el.innerHTML = `<span class="save-aviso-ico">⚠</span><span class="save-aviso-txt">${esc(texto)}</span>${
      botao ? `<button class="save-aviso-btn" onclick="${botao.acao}">${esc(botao.rotulo)}</button>` : ''
    }<button class="save-aviso-x" onclick="SaveSystem.fecharAviso()" aria-label="Fechar o aviso">✕</button>`;
    el.hidden = false;
  }
  function fecharAviso() {
    const el = document.getElementById('save-aviso');
    if (el) el.hidden = true;
  }
  function limparAviso(tipo) {
    if (!aviso || aviso.tipo !== tipo) return;
    aviso = null;
    fecharAviso();
  }

  // O backup que abre: o _bak e, se ele não servir, a cópia de antes da última migração
  function melhorBackup(chave) {
    for (const k of [chave + BAK, `${chave}_antes_v${SAVE_VERSION}`]) {
      const t = ler(k).valor;
      if (!t) continue;
      const r = abrirTexto(t);
      if (r.ok) return { chave: k, save: r.save, de: r.de };
    }
    return null;
  }

  // Volta o espaço para o backup (o save quebrado continua guardado em _quebrado)
  function restaurarBackup(chave) {
    const b = melhorBackup(chave);
    if (!b) return { ok: false, erro: 'não há backup que abra' };
    const atual = ler(chave).valor;
    if (atual && !abreBem(atual)) guardarQuebrado(chave, atual);
    b.save.saveVersion = Math.max(SAVE_VERSION, num(b.save.saveVersion) || 0);
    const g = gravar(chave, JSON.stringify(b.save));
    if (!g.ok) return g;
    delete travas[chave];
    espiados[chave] = null;
    return { ok: true, origem: b.chave };
  }

  // Carreira nova no espaço: tira o save (se estava quebrado, o texto fica em _quebrado)
  function recomecarEspaco(chave) {
    const atual = ler(chave).valor;
    if (atual && !abreBem(atual)) guardarQuebrado(chave, atual);
    delete travas[chave];
    espiados[chave] = null;
    return apagar(chave);
  }

  // ------------------------------------------------------------------ duas abas
  // O evento 'storage' só chega quando OUTRA aba (ou janela) do jogo grava. Se for a
  // carreira aberta aqui, esta aba para de salvar (senão apagaria o progresso feito lá) e
  // avisa, com o botão de recarregar. Na tela inicial não há o que perder: o menu só é
  // atualizado (entrar na carreira lê o save de novo e destrava).
  function quandoOutraAbaGravar(e) {
    const A = window.App;
    if (!A || !A.SLOT_KEYS || (e.storageArea && e.storageArea !== localStorage)) return;
    if (e.key !== null && !Object.values(A.SLOT_KEYS).includes(e.key)) return; // null = clear()
    const naTelaInicial = !!document.getElementById('title-screen')?.classList.contains('open');
    const minha = A.saveKey();
    if (!naTelaInicial && A.state && (e.key === null || e.key === minha)) {
      travas[minha] = 'outra-aba';
      avisar(
        'outra-aba',
        `A Carreira ${A.activeSlot || 1} foi salva em outra aba ou janela do jogo. Para não apagar o progresso feito lá, esta aba parou de salvar. Recarregue para continuar com o save mais novo.`,
        { rotulo: 'RECARREGAR', acao: 'location.reload()' }
      );
      return;
    }
    if (naTelaInicial && (!A.titleMode || A.titleMode === 'main')) A.renderTitleMenu();
  }
  window.addEventListener('storage', (e) => {
    try {
      quandoOutraAbaGravar(e);
    } catch (err) {
      console.error('[save] erro ao tratar a gravação de outra aba:', err);
    }
  });

  // ------------------------------------------------------------------ tela inicial
  // Painel "Sua carreira não abriu" (App.renderTitleMenu põe um por espaço quebrado)
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const chaveDo = (n) => window.App.SLOT_KEYS[n];

  function painelQuebradoHtml(n) {
    const chave = chaveDo(n);
    const r = espiar(chave);
    const b = melhorBackup(chave);
    const info = b && window.App.saveSummary?.(b.save, n);
    const resumo = info ? `${info.name} • ${info.chapter} • ${info.rank}` : '';
    return `
      <div class="title-broken" role="alert">
        <div class="title-broken-head">⚠ SUA CARREIRA NÃO ABRIU</div>
        <p class="title-broken-txt"><b>Carreira ${n}:</b> ${esc(r.erro || 'o save não pôde ser lido')}. Nada foi apagado: o texto original ficou guardado à parte e o jogo não grava por cima dele.</p>
        ${b
          ? `<button class="title-btn primary" onclick="SaveSystem.recuperarBackup(${n})">RECUPERAR BACKUP<small>Último save bom: ${esc(resumo)}</small></button>`
          : '<button class="title-btn" disabled>RECUPERAR BACKUP<small>Ainda não há backup deste espaço</small></button>'}
        <button class="title-btn" onclick="SaveSystem.exportarQuebrado(${n})">EXPORTAR SAVE QUEBRADO<small>Copia o texto para guardar ou pedir ajuda</small></button>
        <button class="title-btn danger" onclick="SaveSystem.pedirRecomeco(${n})">COMEÇAR DE NOVO NESTE ESPAÇO<small>Carreira nova na Carreira ${n} (pede confirmação)</small></button>
      </div>`;
  }

  function confirmarRecomecoHtml(n) {
    return `
      <div class="title-confirm">Começar uma carreira nova na Carreira ${n}? O save quebrado continua guardado neste navegador e ainda pode ser exportado.</div>
      <button class="title-btn danger" onclick="App.createCareerInSlot(${n})">SIM, COMEÇAR DE NOVO<small>Você cria o jogador e a carreira começa no prólogo</small></button>
      <button class="title-btn ghost" onclick="App.setTitleMode('main')">VOLTAR</button>`;
  }

  function recuperarBackup(n) {
    const A = window.App;
    const r = restaurarBackup(chaveDo(n));
    if (!r.ok) {
      A.notify?.(`Não deu para recuperar o backup da Carreira ${n} (${r.erro}).`, '#ef4444');
      return r;
    }
    A.activeSlot = n;
    gravar('bluelock_active_slot', String(n));
    A.loadState();
    A.titleMode = 'main';
    A.renderTitleMenu();
    const info = A.slotSummary(n);
    A.notify?.(`✅ Backup recuperado: Carreira ${n}${info ? ` • ${info.chapter}` : ''}.`, '#22c55e');
    return r;
  }

  function pedirRecomeco(n) {
    window.App.titleBrokenSlot = n;
    window.App.setTitleMode('recomecar');
  }

  // Janela com o texto do save quebrado (copiar ou baixar)
  const janela = (html) => {
    const m = document.getElementById('cinematic-modal');
    const c = document.getElementById('cinematic-modal-content');
    if (!m || !c) return null;
    c.innerHTML = `<div class="cinematic-box save-box" style="max-width:640px; border-top-color:#ef4444">${html}</div>`;
    m.style.zIndex = '3100'; // acima da tela inicial
    m.classList.add('open');
    return c;
  };
  function fecharJanela() {
    const m = document.getElementById('cinematic-modal');
    if (!m) return;
    m.classList.remove('open');
    m.style.zIndex = '';
  }
  const textoQuebrado = (n) => ler(chaveDo(n) + QUEBRADO).valor || ler(chaveDo(n)).valor || '';

  function exportarQuebrado(n) {
    const t = textoQuebrado(n);
    janela(`
      <div class="cinematic-badge" style="background:#ef4444; color:#fff">⚠ SAVE QUEBRADO</div>
      <h2>CARREIRA ${n}</h2>
      <p class="cinematic-desc">Este é o texto do save que não abriu (${Math.ceil(t.length / 1024)} KB). Copie e guarde num arquivo: dá para tentar consertar depois. Ele também continua guardado neste navegador.</p>
      <textarea id="save-code" class="save-code" readonly>${esc(t)}</textarea>
      <div class="dilemma-buttons save-col">
        <button class="btn-dilemma shoot-choice" onclick="SaveSystem.copiarTexto()">📋 COPIAR TEXTO</button>
        <button class="btn-dilemma" onclick="SaveSystem.baixarQuebrado(${n})">💾 BAIXAR ARQUIVO</button>
        <button class="btn-dilemma" onclick="SaveSystem.fecharJanela()">FECHAR</button>
      </div>`);
  }

  function copiarTexto() {
    const ta = document.getElementById('save-code');
    if (!ta) return;
    const A = window.App;
    const pronto = () => A.notify?.('📋 Texto do save copiado!', '#38bdf8');
    const reserva = () => {
      ta.select();
      try {
        document.execCommand('copy');
        pronto();
      } catch (e) {
        A.notify?.('Selecione o texto e copie manualmente.', '#f59e0b');
      }
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(ta.value).then(pronto, reserva);
    else reserva();
  }

  function baixarQuebrado(n) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([textoQuebrado(n)], { type: 'text/plain' }));
    a.download = `blue-lock-save-quebrado-carreira${n}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
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
    textoVersao,
    espiar,
    carregarEspaco,
    salvar,
    melhorBackup,
    restaurarBackup,
    recomecarEspaco,
    travado: (chave) => travas[chave] || null,
    comEstado,
    avisar,
    fecharAviso,
    limparAviso,
    // tela inicial
    painelQuebradoHtml,
    confirmarRecomecoHtml,
    recuperarBackup,
    pedirRecomeco,
    exportarQuebrado,
    copiarTexto,
    baixarQuebrado,
    fecharJanela
  };
})();
