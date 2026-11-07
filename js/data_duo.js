// ============================================================================
// CARREIRA EM DUPLA — "PROJETO ELO" (dados)
// Lore original: o Ego cria um experimento secreto em que atacantes jogam presos em
// duplas por uma pulseira eletrônica, o Elo — se um cai, os dois caem.
//   Arco 1 O Elo • Arco 2 Ressonância • Arco 3 A Regra do Um • Arco 4 O Mundo •
//   Arco 5 Dois Egos, Um Gol
// Falas: '@A' / '@B' viram os nomes dos dois jogadores; '@<tag>' (numa escolha dupla)
// vira o nome de quem escolheu aquela opção. path: 'pacto' | 'rivalidade' filtra a fala.
// ============================================================================
(function () {
  // ---------------------------------------------------------------- elenco
  // Personagens originais do Projeto Elo (entram em NEL_KEEPERS: o findCharacter e as
  // falas acham eles, mas não aparecem na roleta, no time nem nas relações da carreira solo)
  const C = (id, name, pos, ovr, number, team, skin, hair, hair2, eye, style, j1, j2, aura, extra = {}) =>
    Object.assign(
      { id, name, pos, ovr, number, team, skinColor: skin, hairColor: hair, hairSecondary: hair2, eyeColor: eye, hairStyle: style, jerseyPrimary: j1, jerseySecondary: j2, auraColor: aura, weaponName: team, chemName: 'Jogada de Dupla', chemBonus: '', quote: '', duo: true },
      extra
    );
  const ELO = ['#111c44', '#fde047'];
  const DUO_CHARACTERS = [
    // a dupla aliada (Dupla 09) e o goleiro do Projeto
    C('elo_tamaki', 'Yuto Tamaki', 'CM', 80, 8, 'Projeto Elo • Dupla 09', '#f3d1b8', '#facc15', '#f59e0b', '#7c2d12', 'star_spiky', ...ELO, '#facc15'),
    C('elo_ishida', 'Goro Ishida', 'CB', 81, 4, 'Projeto Elo • Dupla 09', '#c99472', '#1c1917', '#3f3f46', '#1c1917', 'buzz_tall', ...ELO, '#94a3b8'),
    C('elo_ono', 'Mamoru Ono', 'GK', 80, 1, 'Projeto Elo', '#ecc9ae', '#57534e', '#78716c', '#3f2a1d', 'short_sharp', '#fde047', '#111c44', '#94a3b8'),
    // treinandos genéricos e goleiros
    C('elo_gen_a', 'Meia do Projeto Elo', 'CM', 78, 6, 'Projeto Elo', '#ecc9ae', '#1c1917', '#1c1917', '#3f2a1d', 'short_sharp', '#334155', '#94a3b8', '#94a3b8'),
    C('elo_gen_b', 'Zagueiro do Projeto Elo', 'CB', 78, 3, 'Projeto Elo', '#e5b899', '#3f2a1d', '#3f2a1d', '#3f2a1d', 'buzz_tall', '#334155', '#94a3b8', '#94a3b8'),
    C('elo_gen_c', 'Ponta do Projeto Elo', 'RW', 79, 7, 'Projeto Elo', '#f1d3bd', '#0f0f10', '#0f0f10', '#3f2a1d', 'short_sharp', '#334155', '#94a3b8', '#94a3b8'),
    C('elo_gen_d', 'Volante do Projeto Elo', 'CDM', 79, 5, 'Projeto Elo', '#c99472', '#1c1917', '#1c1917', '#1c1917', 'spiky_tall', '#334155', '#94a3b8', '#94a3b8'),
    C('elo_gk_treino', 'Goleiro do Projeto Elo', 'GK', 78, 1, 'Projeto Elo', '#f1d3bd', '#3f2a1d', '#3f2a1d', '#3f2a1d', 'short_sharp', '#94a3b8', '#334155', '#94a3b8'),
    // Dupla Navalha
    C('elo_aramaki', 'Toga Aramaki', 'CF', 84, 9, 'Dupla Navalha', '#e8c4a4', '#0f0f10', '#dc2626', '#dc2626', 'shark_spiky', '#18181b', '#dc2626', '#dc2626', { quote: 'Vaga é vaga.' }),
    C('elo_kurobane', 'Shin Kurobane', 'LW', 81, 11, 'Dupla Navalha', '#f5d5be', '#f8fafc', '#cbd5e1', '#475569', 'short_sharp', '#18181b', '#dc2626', '#cbd5e1'),
    C('elo_kiryu', 'Akira Kiryu', 'CAM', 86, 10, 'Dupla Navalha', '#f1dfcd', '#1e3a8a', '#60a5fa', '#60a5fa', 'tall_swept', '#18181b', '#dc2626', '#60a5fa', { quote: 'Você trocou por um parceiro. Eles têm uma dupla.' }),
    // Dupla Tsunami
    C('elo_umino', 'Riku Umino', 'ST', 82, 9, 'Dupla Tsunami', '#c99472', '#0e7490', '#22d3ee', '#0e7490', 'wild_long_top', '#0c4a6e', '#67e8f9', '#22d3ee'),
    C('elo_hamada', 'Kaito Hamada', 'RW', 81, 7, 'Dupla Tsunami', '#e5b899', '#1c1917', '#0e7490', '#1c1917', 'spiky_tall', '#0c4a6e', '#67e8f9', '#22d3ee'),
    // Gêmeos Kagura (jogam espelhados)
    C('elo_ren', 'Ren Kagura', 'LW', 85, 17, 'Gêmeos Kagura', '#f5e1d0', '#6d28d9', '#c4b5fd', '#a78bfa', 'tall_fringe', '#f8fafc', '#6d28d9', '#a78bfa', { quote: 'A gente não precisa olhar.' }),
    C('elo_rei', 'Rei Kagura', 'RW', 85, 71, 'Gêmeos Kagura', '#f5e1d0', '#6d28d9', '#c4b5fd', '#a78bfa', 'tall_fringe', '#f8fafc', '#6d28d9', '#a78bfa'),
    C('elo_gk_kagura', 'Goleiro dos Kagura', 'GK', 80, 1, 'Gêmeos Kagura', '#ecc9ae', '#1c1917', '#1c1917', '#3f2a1d', 'short_sharp', '#6d28d9', '#f8fafc', '#a78bfa'),
    // Dupla Muralha
    C('elo_gondo', 'Daigo Gondo', 'CB', 85, 5, 'Dupla Muralha', '#b07a55', '#1c1917', '#57534e', '#1c1917', 'buzz_tall', '#422006', '#f59e0b', '#f59e0b', { quote: 'Ninguém passou pela Muralha esse ano.' }),
    C('elo_mizuki', 'Kai Mizuki', 'CB', 83, 3, 'Dupla Muralha', '#f1d3bd', '#78350f', '#b45309', '#78350f', 'short_sharp', '#422006', '#f59e0b', '#f59e0b'),
    C('elo_gk_muralha', 'Goleiro da Muralha', 'GK', 82, 1, 'Dupla Muralha', '#e5b899', '#0f0f10', '#0f0f10', '#3f2a1d', 'short_sharp', '#f59e0b', '#422006', '#f59e0b'),
    // Dupla Coroa (1ª do ranking)
    C('elo_saotome', 'Leo Saotome', 'CF', 87, 1, 'Dupla Coroa', '#f3d1b8', '#fef3c7', '#facc15', '#ca8a04', 'prince_pompadour', '#fefce8', '#ca8a04', '#facc15', { quote: 'Primeiro do ranking não é título. É hábito.' }),
    C('elo_amano', 'Shu Amano', 'CAM', 86, 14, 'Dupla Coroa', '#e8c4a4', '#0f172a', '#334155', '#0ea5e9', 'soft_side', '#fefce8', '#ca8a04', '#0ea5e9'),
    C('elo_gk_coroa', 'Goleiro da Coroa', 'GK', 83, 1, 'Dupla Coroa', '#f1d3bd', '#3f2a1d', '#3f2a1d', '#3f2a1d', 'short_sharp', '#ca8a04', '#fefce8', '#facc15'),
    // Vésper FC (o clube europeu)
    C('elo_vesper_dir', 'Diretor do Vésper', 'CM', 70, 0, 'Vésper FC', '#f1dfcd', '#d4d4d8', '#a1a1aa', '#334155', 'slick_back', '#0b1120', '#be123c', '#be123c', { outfit: 'suit' }),
    C('elo_vesper_a', 'Atacante do Vésper', 'CF', 84, 9, 'Vésper FC', '#e5b899', '#3f2a1d', '#3f2a1d', '#3f2a1d', 'spiky_tall', '#0b1120', '#be123c', '#be123c'),
    C('elo_vesper_b', 'Meia do Vésper', 'CM', 84, 8, 'Vésper FC', '#f1d3bd', '#a16207', '#a16207', '#1e3a8a', 'soft_side', '#0b1120', '#be123c', '#be123c'),
    C('elo_vesper_c', 'Ponta do Vésper', 'LW', 83, 11, 'Vésper FC', '#a26a47', '#0f0f10', '#0f0f10', '#1c1917', 'tall_dreads', '#0b1120', '#be123c', '#be123c'),
    C('elo_vesper_d', 'Zagueiro do Vésper', 'CB', 84, 4, 'Vésper FC', '#ecc9ae', '#1c1917', '#1c1917', '#3f2a1d', 'buzz_tall', '#0b1120', '#be123c', '#be123c'),
    C('elo_gk_vesper', 'Goleiro do Vésper', 'GK', 84, 1, 'Vésper FC', '#f1d3bd', '#78350f', '#78350f', '#3f2a1d', 'short_sharp', '#be123c', '#0b1120', '#be123c'),
    // Brasil (Liga dos Pares)
    C('elo_caio', 'Caio Moraes', 'LW', 87, 10, 'Dupla do Brasil', '#a26a47', '#0f0f10', '#facc15', '#3f2a1d', 'tall_dreads', '#facc15', '#15803d', '#22c55e', { quote: 'Na praia, se pensar, perde a bola.' }),
    C('elo_davi', 'Davi Rocha', 'CF', 86, 9, 'Dupla do Brasil', '#c99472', '#1c1917', '#3f3f46', '#1c1917', 'buzz_tall', '#facc15', '#15803d', '#22c55e'),
    C('elo_gen_br_a', 'Meia do Brasil', 'CM', 83, 8, 'Brasil', '#b07a55', '#0f0f10', '#0f0f10', '#1c1917', 'short_sharp', '#facc15', '#15803d', '#22c55e'),
    C('elo_gen_br_b', 'Zagueiro do Brasil', 'CB', 83, 4, 'Brasil', '#e5b899', '#3f2a1d', '#3f2a1d', '#3f2a1d', 'buzz_tall', '#facc15', '#15803d', '#22c55e'),
    C('elo_gk_br', 'Goleiro do Brasil', 'GK', 84, 1, 'Brasil', '#c99472', '#0f0f10', '#0f0f10', '#1c1917', 'short_sharp', '#15803d', '#facc15', '#22c55e'),
    // Alemanha (Liga dos Pares)
    C('elo_falk', 'Jonas Falk', 'CF', 87, 9, 'Dupla da Alemanha', '#f5e1d0', '#fef08a', '#facc15', '#0ea5e9', 'short_sharp', '#f8fafc', '#18181b', '#e2e8f0', { quote: 'Disciplina vence talento. Sempre.' }),
    C('elo_brandt', 'Emil Brandt', 'CDM', 86, 6, 'Dupla da Alemanha', '#f1dfcd', '#78350f', '#a16207', '#166534', 'slick_back', '#f8fafc', '#18181b', '#e2e8f0'),
    C('elo_gen_de_a', 'Meia da Alemanha', 'CM', 84, 8, 'Alemanha', '#f1d3bd', '#a16207', '#a16207', '#1e3a8a', 'short_sharp', '#f8fafc', '#18181b', '#e2e8f0'),
    C('elo_gen_de_b', 'Zagueiro da Alemanha', 'CB', 84, 4, 'Alemanha', '#f5e1d0', '#3f2a1d', '#3f2a1d', '#3f2a1d', 'buzz_tall', '#f8fafc', '#18181b', '#e2e8f0'),
    C('elo_gk_de', 'Goleiro da Alemanha', 'GK', 85, 1, 'Alemanha', '#f1d3bd', '#1c1917', '#1c1917', '#3f2a1d', 'short_sharp', '#18181b', '#f8fafc', '#e2e8f0'),
    // Os mascarados — Shion Mikami e Haru Ibuki, a primeira dupla do Projeto Elo
    C('elo_mask_1', 'Máscara Branca', 'CF', 88, 0, 'Os Mascarados', '#e8c7aa', '#0b0b0f', '#1f2937', '#e5e7eb', 'slick_back', '#0a0a0a', '#e5e7eb', '#e5e7eb'),
    C('elo_mask_2', 'Máscara Vermelha', 'LW', 88, 0, 'Os Mascarados', '#c99a78', '#f1f5f9', '#94a3b8', '#ef4444', 'short_sharp', '#0a0a0a', '#dc2626', '#ef4444'),
    C('elo_shion', 'Shion Mikami', 'CF', 90, 1, 'Os Mascarados', '#e8c7aa', '#0b0b0f', '#1f2937', '#e5e7eb', 'slick_back', '#0a0a0a', '#e5e7eb', '#e5e7eb', { quote: 'Sozinhos, vocês dois são só barulho.' }),
    C('elo_haru', 'Haru Ibuki', 'LW', 90, 2, 'Os Mascarados', '#c99a78', '#f1f5f9', '#94a3b8', '#ef4444', 'short_sharp', '#0a0a0a', '#dc2626', '#ef4444', { quote: 'A Regra do Um foi inventada com a gente.' }),
    C('elo_gen_rua_a', 'Meia da Rua', 'CM', 84, 8, 'Ponte Velha', '#c99472', '#1c1917', '#1c1917', '#1c1917', 'spiky_tall', '#262626', '#a3a3a3', '#a3a3a3'),
    C('elo_gen_rua_b', 'Zagueiro da Rua', 'CB', 84, 4, 'Ponte Velha', '#e5b899', '#3f2a1d', '#3f2a1d', '#3f2a1d', 'buzz_tall', '#262626', '#a3a3a3', '#a3a3a3'),
    C('elo_gk_rua', 'Goleiro da Rua', 'GK', 84, 1, 'Ponte Velha', '#f1d3bd', '#0f0f10', '#0f0f10', '#3f2a1d', 'short_sharp', '#a3a3a3', '#262626', '#a3a3a3'),
    C('elo_gk_final', 'Goleiro dos Mascarados', 'GK', 86, 99, 'Os Mascarados', '#ecc9ae', '#0f0f10', '#0f0f10', '#3f2a1d', 'short_sharp', '#dc2626', '#0a0a0a', '#ef4444')
  ];
  window.DUO_CHARACTERS = DUO_CHARACTERS;
  if (Array.isArray(window.NEL_KEEPERS)) {
    DUO_CHARACTERS.forEach((c) => {
      if (!window.NEL_KEEPERS.some((k) => k.id === c.id)) window.NEL_KEEPERS.push(c);
    });
  }

  // ---------------------------------------------------------------- estilos (Cap. 3)
  // Cada um escolhe o seu estilo: é a Arma que o Elo libera e os atributos que crescem mais
  window.DUO_STYLES = {
    finalizador: {
      id: 'finalizador',
      name: 'FINALIZADOR',
      icon: '🎯',
      desc: 'Vive na área. Chute mais forte e mais certo.',
      grow: ['finalizando', 'poderDisparo', 'ego', 'posicionamento'],
      weapon: {
        id: 'wp_elo_finalizador',
        name: 'Canhão do Elo',
        rarity: 'RARO',
        desc: 'A pulseira libera o chute de quem vive na área.',
        statBoosts: { finalizando: 18, poderDisparo: 18 },
        skills: [
          { key: '1', name: 'Disparo Corrente', type: 'shot', cd: 6, power: 1.7, color: '#fde047', desc: 'Chute seco que estala como uma corrente esticada.' },
          { key: '2', name: 'Arrancada do Elo', type: 'dribble', move: 'burst', cd: 5, power: 1.5, color: '#facc15', desc: 'Explosão curta para ganhar o espaço do chute.' },
          { key: '3', name: 'Voleio da Ressonância', type: 'shot', cd: 9, power: 1.9, color: '#f59e0b', desc: 'O chute mais forte que a pulseira aguenta.' }
        ]
      }
    },
    maestro: {
      id: 'maestro',
      name: 'MAESTRO',
      icon: '🎼',
      desc: 'Pensa a jogada. Passe que rasga e drible de giro.',
      grow: ['visao', 'compostura', 'conducao', 'tirosLongos'],
      weapon: {
        id: 'wp_elo_maestro',
        name: 'Batuta do Elo',
        rarity: 'RARO',
        desc: 'A pulseira libera o passe de quem enxerga o campo inteiro.',
        statBoosts: { visao: 18, compostura: 18 },
        skills: [
          { key: '1', name: 'Passe Corrente', type: 'pass', cd: 6, power: 1.7, color: '#a78bfa', desc: 'Passe que atravessa a defesa direto no pé do parceiro.' },
          { key: '2', name: 'Giro do Maestro', type: 'dribble', move: 'spin', cd: 5, power: 1.55, color: '#c4b5fd', desc: 'Giro de corpo que deixa o marcador olhando para o nada.' },
          { key: '3', name: 'Cobertura de Longe', type: 'shot', cd: 8, power: 1.75, color: '#8b5cf6', desc: 'Chute colocado por cima do goleiro adiantado.' }
        ]
      }
    },
    relampago: {
      id: 'relampago',
      name: 'RELÂMPAGO',
      icon: '⚡',
      desc: 'Velocidade e drible. Ninguém alcança.',
      grow: ['velocidade', 'conducao', 'resistencia', 'forca'],
      weapon: {
        id: 'wp_elo_relampago',
        name: 'Raio do Elo',
        rarity: 'RARO',
        desc: 'A pulseira libera as pernas de quem corre na frente de todo mundo.',
        statBoosts: { velocidade: 18, conducao: 18 },
        skills: [
          { key: '1', name: 'Zigue-Zague do Elo', type: 'dribble', move: 'zigzag', cd: 5, power: 1.6, color: '#38bdf8', desc: 'Corta para um lado e para o outro sem perder a bola.' },
          { key: '2', name: 'Relâmpago Duplo', type: 'dribble', move: 'burst', cd: 6, power: 1.7, color: '#0ea5e9', desc: 'Duas arrancadas seguidas, rápidas demais para o bote.' },
          { key: '3', name: 'Tiro de Primeira', type: 'shot', cd: 8, power: 1.75, color: '#7dd3fc', desc: 'Chute sem domínio, na corrida.' }
        ]
      }
    }
  };

  // O Fluxo que o Elo libera (Cap. 5). Os dois no Fluxo ao mesmo tempo = RESSONÂNCIA
  window.DUO_FLOW = {
    id: 'fl_elo',
    name: 'Fluxo do Elo',
    rarity: 'EPICO',
    color: '#fde047',
    auraParticles: 'lightning',
    duration: 11,
    effect: 'Corrente Acesa',
    effectDesc: 'o drible recarrega na metade do tempo',
    fx: { dribble_cd: 0.5 },
    desc: 'A pulseira esquenta no pulso. Se o parceiro entrar no Fluxo junto, os dois entram em RESSONÂNCIA.'
  };

  // Atributos iniciais de quem entra no Projeto Elo (talento de rua: um pouco acima do zero)
  window.DUO_BASE_STATS = { velocidade: 12, resistencia: 12, forca: 12, habilidadeAerea: 12, finalizando: 12, poderDisparo: 12, tirosLongos: 12, conducao: 12, visao: 12, posicionamento: 12, compostura: 12, ego: 12 };

  // ---------------------------------------------------------------- capítulos
  const L = (speaker, text, extra) => Object.assign({ speaker, text, mood: /EGO/.test(speaker) ? 'ego' : 'normal' }, extra || {});
  const N = (text, extra) => L('NARRADOR', text, extra);
  const EGO = (text, extra) => L('JINPACHI EGO', text, Object.assign({ mood: 'ego' }, extra || {}));
  const ANRI = (text, extra) => L('ANRI TEIERI', text, extra);
  const A = (text, extra) => L('@A', text, extra);
  const B = (text, extra) => L('@B', text, extra);
  const HOME = { homeColor: '#111c44', homeSecondary: '#fde047' };
  const MATES = ['elo_tamaki', 'elo_ishida', 'elo_ono'];

  window.DUO_ARCS = ['ARCO 1 • O ELO', 'ARCO 2 • RESSONÂNCIA', 'ARCO 3 • A REGRA DO UM', 'ARCO 4 • O MUNDO', 'ARCO 5 • DOIS EGOS, UM GOL'];

  window.DUO_CHAPTERS = [
    // ===================================================== ARCO 1 — O ELO
    {
      id: 'elo1',
      arc: 0,
      title: 'A Ponte Velha',
      summary: 'Dois rivais de rua, uma dupla mascarada e a mesma carta nas duas casas. No Blue Lock, as pulseiras se fecham.',
      pre: [
        { lines: [{ cinematic: 'duo_ponte' }] },
        {
          bg: 'monitor_room',
          lines: [
            N('Uma semana depois. Um prédio sem placa, nos fundos do Blue Lock. Sessenta atacantes. Trinta duplas.', { dark: true }),
            A('...Você?! O cara do Seiran?'),
            B('Era só o que faltava. O fominha do Hokuto.'),
            EGO('(no telão) Bem-vindos ao PROJETO ELO. O Blue Lock cria egoístas. Aqui eu quero ver o que acontece quando dois egoístas não conseguem se livrar um do outro.'),
            ANRI('Cada dupla recebe um Elo: uma pulseira eletrônica. O ranking é da dupla. Se um de vocês for eliminado...'),
            EGO('...os dois voltam pra casa. Sem exceção. Sem recurso. Sem choro.'),
            { cinematic: 'duo_elo' },
            B('Eu. Preso. Com ESSE cara.'),
            A('Relaxa. Se eu fizer os gols, você nem precisa encostar na bola.'),
            EGO('Primeiro teste: dois gols contra uma dupla de treino. Vamos ver se esse Elo aguenta um jogo.')
          ]
        }
      ],
      match: { title: 'Teste de Entrada', opp: ['elo_gen_a', 'elo_gen_c', 'elo_gen_d', 'elo_gen_b', 'elo_gk_treino'], oppName: 'Dupla de Treino', oppColor: '#334155', oppSec: '#94a3b8', theme: 'bluelock_bunker', diff: 0.8, target: 2, duration: 120 },
      win: [
        {
          bg: 'monitor_room',
          lines: [
            ANRI('Teste concluído. A dupla de vocês entra no ranking na posição 21 de 30.'),
            A('21?! Com dois gols?'),
            EGO('Dois gols de duas pessoas que nem se olharam. O Elo pontua a dupla. Não o seu ego.'),
            B('...Então da próxima vez, olha pra mim antes de chutar.')
          ]
        }
      ],
      loss: [{ bg: 'monitor_room', lines: [EGO('Perderam para uma dupla de treino. O Elo apitou... mas eu dou mais uma chance. Só uma.')] }],
      reward: { stats: 8, sintonia: 5 }
    },
    {
      id: 'elo2',
      arc: 0,
      title: 'Presos pelo Elo',
      summary: 'Rodada 1 contra a Dupla Navalha. Eles sabem dos mascarados da Ponte Velha.',
      pre: [
        {
          bg: 'locker_room',
          lines: [
            N('Rodada 1 do Projeto Elo. Do outro lado: a Dupla Navalha, 4ª do ranking.'),
            L('TOGA ARAMAKI', 'Hokuto e Seiran? Vi a final de vocês na Ponte Velha. Os dois perderam pros mascarados, né?'),
            L('SHIN KUROBANE', 'Hehe. Dupla de perdedores ganhando pulseirinha.'),
            A('Como você sabe dos mascarados?'),
            L('TOGA ARAMAKI', 'Todo mundo que joga na rua sabe. Eles aparecem, tiram a bola de quem é bom... e somem.'),
            B('Esquece eles. Hoje quem some são vocês.'),
            L('SHIN KUROBANE', 'A Navalha corta em dupla. Um aperta, o outro rouba. Vocês nem vão saber de onde veio.')
          ]
        }
      ],
      match: { title: 'Rodada 1', opp: ['elo_aramaki', 'elo_kurobane', 'elo_gen_c', 'elo_gen_b', 'elo_gk_treino'], oppName: 'Dupla Navalha', oppColor: '#18181b', oppSec: '#dc2626', theme: 'bluelock_bunker', diff: 0.95, target: 3 },
      win: [
        {
          bg: 'locker_room',
          lines: [
            L('TOGA ARAMAKI', '...Tsc. Vocês não jogam juntos. Mas quando um corre, o outro já está lá. Isso não é treino.'),
            L('SHIN KUROBANE', 'Aramaki, eles...'),
            L('TOGA ARAMAKI', 'Cala a boca, Shin. Se você tivesse feito a sua parte, a gente não perdia.'),
            N('Uma rachadura pequena. Ninguém percebeu... ainda.')
          ]
        }
      ],
      loss: [{ bg: 'locker_room', lines: [L('TOGA ARAMAKI', 'Viu? Dois egos brigando pela mesma bola não fazem uma dupla.')] }],
      reward: { stats: 8, sintonia: 5 }
    },
    {
      id: 'elo3',
      arc: 0,
      title: 'Quem Toca, Quem Chuta',
      summary: 'A primeira briga de verdade. Cada um escolhe o seu estilo no Elo.',
      pre: [
        {
          bg: 'locker_room',
          lines: [
            N('O vestiário da dupla, depois do treino. A primeira briga de verdade.'),
            B('Eu estava livre. Três vezes. Você chutou as três.'),
            A('E fiz gol em uma. Você ia fazer melhor?'),
            EGO('(no rádio) Que lindo. Briguem. Mas briguem com uma pergunta: quem dessa dupla é o finalizador?'),
            ANRI('Antes da próxima rodada, cada um escolhe o seu estilo no Elo. É a arma que a pulseira libera para você.')
          ]
        },
        { style: true },
        {
          dual: {
            id: 'elo3_quem_chuta',
            prompt: 'Na cara do gol, com o parceiro livre do lado. O que você faz?',
            options: [
              { tag: 'chuto', label: '"Eu chuto. Sempre."' },
              { tag: 'toco', label: '"Se ele estiver melhor, eu toco."' }
            ],
            out: {
              'chuto+chuto': { sintonia: 0, lines: [A('Então vai ser assim: quem chegar primeiro, chuta.'), B('Fechado. E quem chegar segundo fica olhando.'), EGO('Hehe. Dois egos na mesma bola. Isso ou vira desastre... ou vira arte.')] },
              'chuto+toco': { sintonia: 6, lines: [L('@chuto', 'Eu chuto.'), L('@toco', 'E eu deixo você chutar... quando valer a pena.'), N('Um quer o gol. O outro quer a vitória. O Elo acende em amarelo pela primeira vez.')] },
              'toco+toco': { sintonia: 3, lines: [EGO('Dois garçons. Que tédio. O Elo não premia gentileza... mas premia gol. Vamos ver.')] }
            }
          }
        }
      ],
      match: { title: 'Rodada 3', opp: ['elo_umino', 'elo_hamada', 'elo_gen_a', 'elo_gen_b', 'elo_gk_treino'], oppName: 'Dupla Tsunami', oppColor: '#0c4a6e', oppSec: '#67e8f9', theme: 'bluelock_bunker', diff: 1.0, target: 3 },
      win: [{ bg: 'monitor_room', lines: [ANRI('A dupla de vocês subiu para a posição 12.'), EGO('Começou a ficar interessante. Agora eu vou colocar um espelho na frente de vocês.')] }],
      loss: [{ bg: 'monitor_room', lines: [EGO('A onda passou por cima de vocês. Levantem. A pulseira ainda está verde.')] }],
      reward: { stats: 9, sintonia: 4 }
    },

    // ===================================================== ARCO 2 — RESSONÂNCIA
    {
      id: 'elo4',
      arc: 1,
      title: 'Os Gêmeos Kagura',
      summary: 'Ren e Rei Kagura jogam espelhados há quinze anos. Vocês têm noventa minutos.',
      pre: [
        {
          bg: 'bluelock_holo',
          lines: [
            N('Rodada 4. Os 2º colocados: Ren e Rei Kagura. Gêmeos. Jogam espelhados há quinze anos.'),
            L('REN KAGURA', 'Vocês dois se olham antes de passar.'),
            L('REI KAGURA', 'A gente não precisa olhar.'),
            L('REN KAGURA', 'Somos a mesma pessoa em dois corpos.'),
            B('Que medo. Dois chatos pelo preço de um.'),
            A('(...Eles estão certos. A gente perde um segundo se olhando. Contra eles, um segundo é a partida.)'),
            EGO('Vocês não são gêmeos. Não têm quinze anos. Têm noventa minutos. Aprendam.')
          ]
        }
      ],
      match: { title: 'Rodada 4', opp: ['elo_ren', 'elo_rei', 'elo_gen_c', 'elo_gen_d', 'elo_gk_kagura'], oppName: 'Gêmeos Kagura', oppColor: '#f8fafc', oppSec: '#6d28d9', theme: 'bluelock_holo', diff: 1.1, target: 3 },
      win: [
        {
          bg: 'bluelock_holo',
          lines: [
            L('REI KAGURA', '...No último gol, vocês não se olharam.'),
            L('REN KAGURA', 'Quem ensinou isso a vocês?'),
            A('Ninguém. Só... deu.'),
            EGO('Não "deu". Isso tem nome. No próximo treino vocês vão descobrir qual.')
          ]
        }
      ],
      loss: [{ bg: 'bluelock_holo', lines: [L('REN KAGURA', 'Um segundo.'), L('REI KAGURA', 'Foi o que faltou.')] }],
      reward: { stats: 9, sintonia: 6 }
    },
    {
      id: 'elo5',
      arc: 1,
      title: 'Ressonância',
      summary: 'O Elo dispara quando os dois entram no Fluxo no mesmo segundo. Nasce o Ataque de Dupla.',
      pre: [
        {
          bg: 'bluelock_holo',
          lines: [
            ANRI('Treino especial. O Ego mandou ligar o Elo de vocês no modo de leitura.'),
            EGO('Toda vez que vocês dois entram em Fluxo no MESMO segundo, as pulseiras disparam. Trinta duplas. Três já dispararam. Nunca ao mesmo tempo.'),
            B('E o que acontece se disparar?'),
            EGO('Chama-se RESSONÂNCIA. Dois egos queimando juntos. Não somam. Multiplicam.')
          ]
        },
        { flow: true },
        {
          bg: 'bluelock_holo',
          lines: [
            { cinematic: 'duo_ressonancia' },
            N('A partir de agora, na partida: quando os DOIS estiverem no Fluxo (G) ao mesmo tempo, quem estiver com a bola aperta C — ATAQUE DE DUPLA.'),
            A('...Isso foi a gente?'),
            B('Foi. E eu quero de novo.')
          ]
        }
      ],
      match: { title: 'Rodada 5', opp: ['elo_gondo', 'elo_mizuki', 'elo_gen_a', 'elo_gen_d', 'elo_gk_muralha'], oppName: 'Dupla Muralha', oppColor: '#422006', oppSec: '#f59e0b', theme: 'bluelock_holo', diff: 1.15, target: 3 },
      win: [{ bg: 'bluelock_holo', lines: [L('DAIGO GONDO', 'Ninguém passou pela Muralha esse ano. Ninguém.'), B('Agora alguém passou.'), ANRI('Posição 6 do ranking.')] }],
      loss: [{ bg: 'bluelock_holo', lines: [L('DAIGO GONDO', 'Muralha não se derruba com um ego. Nem com dois.')] }],
      reward: { stats: 10, sintonia: 6 }
    },
    {
      id: 'elo6',
      arc: 1,
      title: 'A Dupla que se Desfez',
      summary: 'Uma noite no corredor do Projeto. A Navalha se corta sozinha.',
      pre: [
        {
          bg: 'monitor_room',
          dark: true,
          lines: [
            N('Noite. Corredor do Projeto Elo. Uma pulseira apita sozinha.', { dark: true }),
            L('SHIN KUROBANE', 'Aramaki... você me denunciou? Você disse pro Ego que eu...'),
            L('TOGA ARAMAKI', 'Eu disse a verdade. Você atrasa a dupla. O Ego deixou eu trocar de parceiro. Vaga é vaga.'),
            L('SHIN KUROBANE', 'A gente joga junto desde os oito anos!'),
            L('TOGA ARAMAKI', 'E foi por isso que eu demorei tanto pra fazer isso.'),
            N('A pulseira do Shin Kurobane fica vermelha. Eliminado. Sozinho.')
          ]
        },
        {
          dual: {
            id: 'elo6_shin',
            prompt: 'O Shin passa por vocês carregando a mala. O que você faz?',
            options: [
              { tag: 'fala', label: 'Para e fala com ele' },
              { tag: 'segue', label: 'Segue em frente: não é problema seu' }
            ],
            out: {
              'fala+fala': { sintonia: 5, flags: { shin: 'amigo' }, lines: [L('SHIN KUROBANE', 'Cuidem desse Elo. Parece corrente... mas é a única coisa que segura.')] },
              'fala+segue': { sintonia: 2, lines: [L('@fala', 'Ei... Shin. Desculpa.'), L('SHIN KUROBANE', 'Não pede desculpa. Só não vira o Aramaki.'), L('@segue', '(...)')] },
              'segue+segue': { sintonia: 0, lines: [N('Vocês dois desviam o olhar. No fundo, os dois pensam a mesma coisa: e se fosse comigo?')] }
            }
          }
        }
      ],
      match: { title: 'Rodada 6', opp: ['elo_aramaki', 'elo_kiryu', 'elo_gen_c', 'elo_gen_b', 'elo_gk_treino'], oppName: 'Navalha 2.0 (Aramaki & Kiryu)', oppColor: '#18181b', oppSec: '#dc2626', theme: 'bluelock_bunker', diff: 1.2, target: 3 },
      win: [
        {
          bg: 'locker_room',
          lines: [
            L('TOGA ARAMAKI', '...Impossível. Eu troquei por um parceiro melhor.'),
            L('AKIRA KIRYU', 'Você trocou por um parceiro. Eles têm uma dupla. É diferente.'),
            EGO('Gravem essa noite. Na próxima rodada eu vou mudar a regra.')
          ]
        }
      ],
      loss: [{ bg: 'locker_room', lines: [L('TOGA ARAMAKI', 'Tá vendo? Troca de parceiro e pronto. Simples.')] }],
      reward: { stats: 10, sintonia: 5 }
    },

    // ===================================================== ARCO 3 — A REGRA DO UM
    {
      id: 'elo7',
      arc: 2,
      title: 'A Regra do Um',
      summary: 'A Sub-20 vai levar UM atacante do Projeto. O Elo passa a contar os gols de cada um.',
      pre: [
        {
          bg: 'auditorium',
          lines: [
            N('Auditório do Projeto Elo. Restam doze duplas.'),
            EGO('Parabéns. Vocês aprenderam a ser uma dupla. Agora esqueçam.'),
            { cinematic: 'duo_regra' },
            EGO('A Seleção Sub-20 vai levar UM atacante do Projeto Elo. Um. A partir de hoje, o Elo conta os gols de cada um. Separado.'),
            ANRI('O ranking da dupla continua valendo para a eliminação. Mas a vaga... é de quem fizer mais.'),
            A('...Então a gente continua preso. E agora é pra brigar.'),
            B('Ou não.')
          ]
        },
        {
          dual: {
            id: 'elo7_regra',
            prompt: 'A Regra do Um. O que você faz com o Elo daqui pra frente?',
            options: [
              { tag: 'pacto', label: '"Pacto: a gente joga junto. A vaga que se dane."' },
              { tag: 'rival', label: '"Rivalidade: a partir de hoje, cada gol é meu."' }
            ],
            out: {
              'pacto+pacto': { path: 'pacto', sintonia: 12, lines: [A('Pacto, então.'), B('Pacto. Se o Ego quiser um, vai ter que levar os dois.'), EGO('Hehe... Que sentimental. Vou adorar ver isso quebrar.')] },
              'pacto+rival': { path: 'rivalidade', sintonia: -2, lines: [L('@pacto', '...Sério? Depois de tudo?'), L('@rival', 'Exatamente por causa de tudo. Eu quero ganhar de você. Não com você.'), N('Um estende a mão. O outro fecha o punho. O Elo fica em silêncio.')] },
              'rival+rival': { path: 'rivalidade', sintonia: -4, lines: [A('Rivalidade, então.'), B('Desde a Ponte Velha. Nunca deixou de ser.'), EGO('AGORA sim. Dois egos presos na mesma corrente, se mordendo. O Elo vai ferver.')] }
            }
          }
        }
      ],
      match: { title: 'Rodada 7', opp: ['elo_saotome', 'elo_amano', 'elo_gen_a', 'elo_gen_d', 'elo_gk_coroa'], oppName: 'Dupla Coroa (1ª do ranking)', oppColor: '#fefce8', oppSec: '#ca8a04', theme: 'bluelock_holo', diff: 1.25, target: 3 },
      win: [
        {
          bg: 'bluelock_holo',
          lines: [
            L('LEO SAOTOME', 'Os primeiros do ranking perdendo pra uma dupla que acabou de brigar no auditório...'),
            L('SHU AMANO', 'Eles não brigaram. Eles escolheram.'),
            A('Viu? Junto.', { path: 'pacto' }),
            B('Junto. Mas o próximo gol é meu.', { path: 'pacto' }),
            B('Hoje foi da dupla. A partir de amanhã, é de quem fizer mais.', { path: 'rivalidade' }),
            A('Pode contar. Eu também estou contando.', { path: 'rivalidade' })
          ]
        }
      ],
      loss: [{ bg: 'bluelock_holo', lines: [L('LEO SAOTOME', 'Primeiro do ranking não é título. É hábito.')] }],
      reward: { stats: 10, sintonia: 4 }
    },
    {
      id: 'elo8',
      arc: 2,
      title: 'Partida Dividida',
      summary: 'Revanche contra os Kagura. Pela primeira vez o telão mostra dois números embaixo do nome da dupla.',
      pre: [
        {
          bg: 'bluelock_holo',
          lines: [
            N('Rodada 8. Revanche contra os Gêmeos Kagura. E pela primeira vez, o telão mostra dois números embaixo do nome da dupla.'),
            L('REI KAGURA', 'Ouvimos falar da Regra do Um.'),
            L('REN KAGURA', 'Pra nós não muda nada. Um de nós vai. O outro vai junto, por dentro.'),
            B('A gente pensa igual.', { path: 'pacto' }),
            A('Pra nós muda tudo.', { path: 'rivalidade' }),
            EGO('Hoje o telão conta. Vamos ver o que vocês fazem com a bola quando o parceiro está livre.')
          ]
        }
      ],
      match: { title: 'Rodada 8', opp: ['elo_ren', 'elo_rei', 'elo_gen_c', 'elo_gen_a', 'elo_gk_kagura'], oppName: 'Gêmeos Kagura (revanche)', oppColor: '#f8fafc', oppSec: '#6d28d9', theme: 'bluelock_holo', diff: 1.3, target: 3 },
      win: [
        {
          bg: 'bluelock_holo',
          lines: [
            ANRI('Gols da rodada no telão: @top na frente.'),
            L('@low', 'Tanto faz quem fez. Ganhamos.', { path: 'pacto' }),
            L('@top', 'Tanto faz. Mas foi bonito, né?', { path: 'pacto' }),
            L('@top', 'Um a mais. Anota aí.', { path: 'rivalidade' }),
            L('@low', 'Anota você. Eu vou lembrar.', { path: 'rivalidade' })
          ]
        }
      ],
      loss: [{ bg: 'bluelock_holo', lines: [L('REI KAGURA', 'O telão dividiu vocês.'), L('REN KAGURA', 'A gente nem precisou.')] }],
      reward: { stats: 10, sintonia: 4 }
    },
    {
      id: 'elo9',
      arc: 2,
      title: 'O Elo Quebrado',
      summary: 'Véspera da Seletiva Final. O Ego manda tirar as pulseiras.',
      pre: [
        {
          bg: 'monitor_room',
          dark: true,
          lines: [
            N('Véspera da Seletiva Final do Projeto. O Ego chama as últimas seis duplas.', { dark: true }),
            EGO('Tirem as pulseiras. A partir de agora ninguém é eliminado pelo parceiro. Quem quiser jogar sozinho na Seletiva, pode.'),
            ANRI('Os Kagura continuaram juntos. A Coroa se separou na hora.')
          ]
        },
        {
          dual: {
            id: 'elo9_corrente',
            prompt: 'Sem o Elo no pulso. Você continua com a dupla?',
            options: [
              { tag: 'fica', label: '"Fico. Não era a pulseira que me prendia."' },
              { tag: 'solo', label: '"Vou sozinho. Preciso saber se sou bom sem você."' }
            ],
            out: {
              'fica+fica': { sintonia: 10, lines: [A('Sem pulseira.'), B('Sem pulseira. Ainda dupla.'), N('Os dois guardam o Elo no bolso. Desligado. Mas guardado.')] },
              'fica+solo': { sintonia: -3, lines: [L('@solo', 'Eu preciso saber. Só isso.'), L('@fica', '...Então vai.'), EGO('Hehe. Ninguém vai a lugar nenhum: a Seletiva é em dupla. Eu menti. Só queria ver quem ia tentar.')] },
              'solo+solo': { sintonia: -6, lines: [EGO('Os dois querem ir sozinhos. Perfeito. Pois vão jogar a Seletiva... juntos. Eu menti. Ninguém sai da dupla.'), A('Você é doente.'), EGO('Eu sou o Ego.')] }
            }
          }
        }
      ],
      match: { title: 'Seletiva Final', opp: ['elo_saotome', 'elo_kiryu', 'elo_aramaki', 'elo_amano', 'elo_gk_coroa'], oppName: 'Seleção do Projeto Elo', oppColor: '#0f172a', oppSec: '#e2e8f0', theme: 'u20_national', diff: 1.35, target: 3, duration: 140 },
      win: [
        {
          bg: 'monitor_room',
          lines: [
            EGO('A vaga da Sub-20... fica em aberto. Uma proposta da Europa chegou antes. Para um de vocês.'),
            A('Um?'),
            N('FIM DO ARCO 3 — A REGRA DO UM.')
          ]
        }
      ],
      loss: [{ bg: 'monitor_room', lines: [EGO('A Seletiva não espera ninguém. Mas eu espero vocês mais uma vez.')] }],
      reward: { stats: 11, sintonia: 5 }
    },

    // ===================================================== ARCO 4 — O MUNDO
    {
      id: 'elo10',
      arc: 3,
      title: 'A Proposta',
      summary: 'O Vésper FC, da Europa, quer um atacante. Um.',
      pre: [
        {
          bg: 'monitor_room',
          lines: [
            N('Uma videochamada. Do outro lado, o diretor do Vésper FC, um clube europeu que nunca contratou um japonês.'),
            L('DIRETOR DO VÉSPER', 'Vimos a Seletiva. Queremos um atacante. Um. Escolham entre vocês até amanhã.')
          ]
        },
        {
          dual: {
            id: 'elo10_proposta',
            prompt: 'O Vésper quer só um. O que você responde?',
            options: [
              { tag: 'dois', label: '"Ou leva os dois, ou não leva nenhum."' },
              { tag: 'eu', label: '"Eu vou. Ele que me alcance."' }
            ],
            out: {
              'dois+dois': { sintonia: 8, lines: [L('DIRETOR DO VÉSPER', '...Ninguém nunca recusou o Vésper.'), B('Então anota: os primeiros.'), L('DIRETOR DO VÉSPER', 'Há um torneio de duplas na Europa. A Liga dos Pares. Vençam e o contrato é dos dois.')] },
              'dois+eu': { sintonia: -4, lines: [L('@eu', 'Eu vou.'), L('@dois', '...'), L('DIRETOR DO VÉSPER', 'Hm. Não. Vocês têm mais gols juntos do que separados. Vençam a Liga dos Pares. Aí conversamos sobre um... ou dois.')] },
              'eu+eu': { sintonia: -6, lines: [A('Eu vou.'), B('Não. EU vou.'), L('DIRETOR DO VÉSPER', 'Hahaha! Dois egos. Ótimo. Resolvam em campo: Liga dos Pares, na Europa. Quem brilhar mais leva o contrato.')] }
            }
          }
        }
      ],
      match: { title: 'Teste no Vésper', opp: ['elo_vesper_a', 'elo_vesper_b', 'elo_vesper_c', 'elo_vesper_d', 'elo_gk_vesper'], oppName: 'Vésper FC Sub-19', oppColor: '#0b1120', oppSec: '#be123c', theme: 'nel_dome', diff: 1.35, target: 3 },
      win: [{ bg: 'monitor_room', lines: [L('DIRETOR DO VÉSPER', 'Malas prontas. A Liga dos Pares começa em uma semana, em Lisboa.')] }],
      loss: [{ bg: 'monitor_room', lines: [L('DIRETOR DO VÉSPER', 'Esperava mais. Amanhã tem outro teste. Só mais um.')] }],
      reward: { stats: 11, sintonia: 4 }
    },
    {
      id: 'elo11',
      arc: 3,
      title: 'A Liga dos Pares',
      summary: 'Lisboa. Dezesseis duplas de dezesseis países. Na arquibancada, duas máscaras brancas.',
      pre: [
        {
          bg: 'worldcup_final',
          lines: [
            N('Liga dos Pares, Lisboa. Dezesseis duplas de dezesseis países.'),
            L('CAIO MORAES', 'Japoneses? Vocês jogam em dupla igual a gente joga na praia? Sem pensar?'),
            L('DAVI ROCHA', 'Na praia, se pensar, perde a bola. A gente só sente.'),
            B('A gente também sente. Principalmente quando ganha.'),
            ANRI('(no telefone) Atenção: na arquibancada... tem duas pessoas de máscara branca.')
          ]
        }
      ],
      match: { title: 'Liga dos Pares • Oitavas', opp: ['elo_caio', 'elo_davi', 'elo_gen_br_a', 'elo_gen_br_b', 'elo_gk_br'], oppName: 'Dupla do Brasil', oppColor: '#facc15', oppSec: '#15803d', theme: 'worldcup_england', diff: 1.4, target: 3 },
      win: [{ bg: 'worldcup_final', lines: [L('DAVI ROCHA', 'Sentiram, hein?'), L('CAIO MORAES', 'Boa sorte com os mascarados. Passaram por todo mundo sem levar gol.'), A('...São eles. Da Ponte Velha.')] }],
      loss: [{ bg: 'worldcup_final', lines: [L('CAIO MORAES', 'Pensaram demais. Na próxima, só sintam.')] }],
      reward: { stats: 11, sintonia: 4 }
    },
    {
      id: 'elo12',
      arc: 3,
      title: 'Os Mascarados',
      summary: 'Semifinal contra a Alemanha. No túnel, as máscaras caem.',
      pre: [
        {
          bg: 'worldcup_final',
          lines: [
            N('Semifinal da Liga dos Pares: Alemanha. Do outro lado da chave, os mascarados já estão na final.'),
            L('JONAS FALK', 'Disciplina vence talento. Sempre.'),
            L('EMIL BRANDT', 'E vocês dois brigam demais pra ter disciplina.')
          ]
        }
      ],
      match: { title: 'Liga dos Pares • Semifinal', opp: ['elo_falk', 'elo_brandt', 'elo_gen_de_a', 'elo_gen_de_b', 'elo_gk_de'], oppName: 'Dupla da Alemanha', oppColor: '#f8fafc', oppSec: '#18181b', theme: 'worldcup_england', diff: 1.45, target: 3 },
      win: [
        {
          bg: 'monitor_room',
          dark: true,
          lines: [
            N('Depois do jogo, no túnel. Duas máscaras brancas esperando.', { dark: true }),
            { cinematic: 'duo_mascaras' },
            L('SHION MIKAMI', 'Faz tempo, Ponte Velha.'),
            L('HARU IBUKI', 'Três anos atrás, nós fomos a primeira dupla do Projeto Elo. O teste. A Regra do Um foi inventada com a gente.'),
            L('SHION MIKAMI', 'O Ego levou o Haru pra seleção. Eu fui pra casa. Com a pulseira ainda no pulso.'),
            L('HARU IBUKI', 'E eu larguei a seleção pra voltar pra rua. Com ele. A gente usa máscara porque, oficialmente... essa dupla não existe.'),
            A('Então por que roubaram a nossa final?'),
            L('SHION MIKAMI', 'Pra ver se vocês iam se separar depois de perder. Não se separaram. Agora vamos ver se aguentam ganhar.')
          ]
        },
        {
          dual: {
            id: 'elo12_mascaras',
            prompt: 'O que você sente pelos mascarados agora?',
            options: [
              { tag: 'respeito', label: 'Respeito: eles provaram que dá pra voltar' },
              { tag: 'raiva', label: 'Raiva: eles brincaram com a gente' }
            ],
            out: {
              'respeito+respeito': { sintonia: 4, lines: [B('Na final, a gente joga sério com vocês.'), L('HARU IBUKI', 'É só assim que a gente sabe jogar.')] },
              'raiva+respeito': { sintonia: 1, lines: [L('@raiva', 'Vocês brincaram com a nossa final.'), L('@respeito', '...E ensinaram a gente a não largar. As duas coisas.')] },
              'raiva+raiva': { sintonia: 4, lines: [A('A gente vai devolver aquele último lance.'), B('Com juros.'), L('SHION MIKAMI', 'Hehe. Era isso que eu queria ouvir.')] }
            }
          }
        }
      ],
      loss: [{ bg: 'worldcup_final', lines: [L('JONAS FALK', 'Disciplina. Eu avisei.')] }],
      reward: { stats: 12, sintonia: 4 }
    },

    // ===================================================== ARCO 5 — DOIS EGOS, UM GOL
    {
      id: 'elo13',
      arc: 4,
      title: 'Revanche na Ponte Velha',
      summary: 'Meia-noite, a rua onde tudo começou. Sem Elo, sem Ego: só a bola.',
      pre: [
        {
          bg: 'rain_street',
          dark: true,
          lines: [
            N('Antes da final em Lisboa, uma mensagem: "Ponte Velha. Meia-noite. Como da primeira vez."', { dark: true }),
            L('HARU IBUKI', 'Na final de Lisboa tem câmera, torcida, contrato. Aqui não tem nada. É o único lugar onde dá pra saber quem é melhor de verdade.'),
            L('SHION MIKAMI', 'Sem Elo. Sem Ego. Só a bola e a rua.'),
            B('Da última vez vocês levaram a bola no último lance.'),
            A('Hoje o último lance é nosso.')
          ]
        }
      ],
      match: { title: 'Revanche na Rua', opp: ['elo_shion', 'elo_haru', 'elo_gen_rua_a', 'elo_gen_rua_b', 'elo_gk_rua'], oppName: 'Shion & Haru (na rua)', oppColor: '#0a0a0a', oppSec: '#dc2626', theme: 'school_sunset', diff: 1.5, target: 2, duration: 110 },
      advanceOnLoss: true,
      win: [{ bg: 'rain_street', dark: true, lines: [L('SHION MIKAMI', '...Hehe. Agora sim.'), L('HARU IBUKI', 'Vejo vocês em Lisboa. Lá a gente joga sério.'), B('Isso NÃO foi sério?!')] }],
      loss: [{ bg: 'rain_street', dark: true, lines: [L('SHION MIKAMI', 'A rua não perdoa.'), L('HARU IBUKI', 'Mas a final é outra história. Não chorem: guardem pra lá.')] }],
      reward: { stats: 12, sintonia: 5 }
    },
    {
      id: 'elo14',
      arc: 4,
      title: 'O Último Teste do Ego',
      summary: 'O Ego chega em Lisboa. Antes da final, vocês contra o melhor que o Projeto Elo produziu.',
      pre: [
        {
          bg: 'worldcup_final',
          lines: [
            EGO('Lisboa. Que bonito. Vim buscar o meu atacante da Sub-20.'),
            EGO('Antes da final, um último teste: vocês contra o melhor que o Projeto Elo produziu. Os Gêmeos e a Coroa. Juntos.'),
            L('REN KAGURA', 'Sem ressentimento.'),
            L('REI KAGURA', 'Só um pouco.'),
            A('Ele ainda acha que vai separar a gente.', { path: 'pacto' }),
            B('Seja quem for o escolhido... hoje eu quero os gols.', { path: 'rivalidade' })
          ]
        }
      ],
      match: { title: 'O Teste do Ego', opp: ['elo_ren', 'elo_rei', 'elo_saotome', 'elo_amano', 'elo_gk_coroa'], oppName: 'Elite do Projeto Elo', oppColor: '#0f172a', oppSec: '#a78bfa', theme: 'u20_national', diff: 1.55, target: 3, duration: 140 },
      win: [{ bg: 'worldcup_final', lines: [EGO('Hehe... A vaga da Sub-20 tem dono.'), A('Quem?'), EGO('Respondo depois da final. Se ganharem.')] }],
      loss: [{ bg: 'worldcup_final', lines: [EGO('O melhor do Projeto ainda é melhor que vocês. Por enquanto. De novo.')] }],
      reward: { stats: 12, sintonia: 4 }
    },
    {
      id: 'elo15',
      arc: 4,
      title: 'Dois Egos, Um Gol',
      summary: 'A final da Liga dos Pares contra Shion e Haru. O último lance é de quem?',
      pre: [
        {
          bg: 'worldcup_final',
          lines: [
            N('Final da Liga dos Pares. Estádio cheio em Lisboa. Do outro lado, sem máscaras: Shion Mikami e Haru Ibuki.'),
            L('HARU IBUKI', 'Três anos atrás, a Regra do Um quebrou a gente. Hoje a gente prova que ela é mentira.'),
            L('SHION MIKAMI', 'Ou que ela é verdade. Depende de vocês.')
          ]
        },
        {
          dual: {
            id: 'elo15_ultimo',
            prompt: 'Se o último lance da final chegar em você, o que você faz?',
            options: [
              { tag: 'eu', label: '"Eu chuto."' },
              { tag: 'passo', label: '"Eu passo pra ele."' }
            ],
            out: {
              'eu+eu': { flags: { final: 'eu+eu' }, lines: [N('Os dois pensam a mesma coisa. Ninguém fala nada.')] },
              'eu+passo': { flags: { final: 'eu+passo' }, sintonia: 4, lines: [N('Um vai chutar. O outro vai entregar. Os dois sabem disso sem dizer.')] },
              'passo+passo': { flags: { final: 'passo+passo' }, sintonia: 2, lines: [N('Os dois querem dar o gol ao outro. Que tipo de egoísta faz isso?')] }
            }
          }
        }
      ],
      match: { title: 'Final da Liga dos Pares', opp: ['elo_shion', 'elo_haru', 'elo_gen_rua_a', 'elo_gen_rua_b', 'elo_gk_final'], oppName: 'Shion & Haru', oppColor: '#0a0a0a', oppSec: '#dc2626', theme: 'worldcup_final', diff: 1.6, target: 3, duration: 150 },
      win: [
        {
          bg: 'worldcup_final',
          lines: [
            { cinematic: 'duo_final' },
            N('No último lance, @passo olha pra @eu sem olhar. O passe sai antes do pensamento. @eu não chuta: devora.', { flag: ['final', 'eu+passo'] }),
            EGO('A vaga da Sub-20 é de vocês DOIS. Eu mudei a regra. Quem manda aqui sou eu, afinal.', { flag: ['final', 'eu+passo'] }),
            N('Os dois chegam na bola no mesmo segundo. Os dois chutam. Um chute só, dois pés.', { flag: ['final', 'eu+eu'] }),
            L('HARU IBUKI', 'Isso... não existe.', { flag: ['final', 'eu+eu'], path: 'pacto' }),
            L('SHION MIKAMI', 'Existe agora.', { flag: ['final', 'eu+eu'], path: 'pacto' }),
            A('Esse gol foi meu.', { flag: ['final', 'eu+eu'], path: 'rivalidade' }),
            B('Foi MEU.', { flag: ['final', 'eu+eu'], path: 'rivalidade' }),
            EGO('Foi dos dois, idiotas. Os dois vão pra Sub-20. Briguem lá.', { flag: ['final', 'eu+eu'] }),
            N('Os dois tocam um pro outro. A defesa inteira cai pro lado errado. A bola vai e volta... e entra no vazio que os dois criaram.', { flag: ['final', 'passo+passo'] }),
            L('SHION MIKAMI', 'Eles não queriam o gol. Queriam o parceiro.', { flag: ['final', 'passo+passo'] }),
            EGO('...Detesto admitir. Foi bonito. Os dois vão pra Sub-20.', { flag: ['final', 'passo+passo'] }),
            L('DIRETOR DO VÉSPER', 'O contrato é dos dois. Eu não perco essa dupla por nada.'),
            L('HARU IBUKI', 'Agora vocês são a primeira dupla. A gente vira lenda de rua.'),
            L('SHION MIKAMI', 'Cuidem desse Elo.'),
            N('FIM DO PROJETO ELO. Hoje, toda dupla que entra no Blue Lock ganha uma pulseira. Desligada. Pra lembrar.')
          ]
        }
      ],
      loss: [{ bg: 'worldcup_final', lines: [L('SHION MIKAMI', 'Perderam. Mas não se separaram.'), L('HARU IBUKI', 'Então ainda não acabou. Voltem.')] }],
      reward: { stats: 14, sintonia: 6 },
      ending: true
    }
  ].map((ch, i) => {
    ch.number = i + 1;
    ch.era = `PROJETO ELO — ${window.DUO_ARCS[ch.arc]}`;
    ch.match = Object.assign({ mates: MATES.slice(), duration: 130 }, HOME, ch.match);
    return ch;
  });
})();
