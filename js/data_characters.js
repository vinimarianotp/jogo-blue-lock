// ============================================================================
// BLUE LOCK: EGOIST CAREER - BANCO DE DADOS DOS 66 PERSONAGENS & ACESSÓRIOS
// ============================================================================

window.LOCKER_ITEMS = [
  { id: 'wristband', name: 'MUNHEQUEIRA', slot: 'WRIST', cost: 0, currency: 'EGOCOINS', ownedDefault: true, color: '#18181b', desc: 'Munhequeira preta clássica de treino.' },
  { id: 'headband', name: 'FAIXA DE CABEÇA', slot: 'HEAD', cost: 500, currency: 'EGOCOINS', ownedDefault: false, color: '#f8fafc', desc: 'Faixa de cabeça estilo foco absoluto.' },
  { id: 'player_gloves', name: 'LUVAS TÉRMICAS', slot: 'HANDS', cost: 500, currency: 'EGOCOINS', ownedDefault: false, color: '#0f172a', desc: 'Luvas térmicas de jogador de linha.' },
  { id: 'gk_gloves', name: 'LUVAS DE GOLEIRO', slot: 'HANDS', cost: 600, currency: 'EGOCOINS', ownedDefault: false, color: '#ffffff', desc: 'Luvas aderentes de goleiro (estilo Gagamaru).' },
  { id: 'captain_armband', name: 'BRAÇADEIRA', slot: 'ARM', cost: 800, currency: 'EGOCOINS', ownedDefault: false, color: '#ef4444', desc: 'Braçadeira vermelha de Capitão.' },
  { id: 'balaclava', name: 'BALACLAVA', slot: 'FACE', cost: 500, currency: 'EGOCOINS', ownedDefault: false, color: '#111827', desc: 'Balaclava tática preta.' },
  { id: 'face_guard', name: 'ÓCULOS PROTETOR', slot: 'FACE', cost: 650, currency: 'EGOCOINS', ownedDefault: false, color: '#1e293b', desc: 'Máscara protetora facial e óculos estilo Yukimiya.' },
  { id: 'hand_wraps', name: 'BANDAGENS', slot: 'HANDS', cost: 750, currency: 'EGOCOINS', ownedDefault: false, color: '#e2e8f0', desc: 'Bandagens de combate nas mãos.' },
  { id: 'bone_wings', name: 'ASAS DE OSSO', slot: 'BACK', cost: 1500, currency: 'EGOCOINS', ownedDefault: false, color: '#cbd5e1', desc: 'Asas ósseas despertadas no Ego.' },
  { id: 'crow_mask', name: 'MÁSCARA DO CORVO', slot: 'FACE', cost: 1200, currency: 'EGOCOINS', ownedDefault: false, color: '#090d16', desc: 'Máscara de Corvo Assassino (estilo Karasu).' }
];

// Todos os 65 personagens pedidos + Hugo (Quatro Egos)
window.BLUE_LOCK_CHARACTERS = [
  // --- TIME Z & NÚCLEO PRINCIPAL DO BLUE LOCK ---
  {
    id: 'bachira', name: 'Meguru Bachira', pos: 'LW', ovr: 92, number: 8, team: 'FC Barcha / Japão U-20',
    hairColor: '#18181b', hairSecondary: '#facc15', skinColor: '#f5d0b5', eyeColor: '#eab308', hairStyle: 'bachira_bob',
    auraColor: '#facc15', jerseyPrimary: '#1e3a8a', jerseySecondary: '#facc15',
    weaponName: 'Monstro do Drible', chemName: 'Dança do Monstro Duplo',
    chemBonus: 'Dribles elásticos automáticos + Passe de calcanhar teleguiado para o seu chute!',
    quote: 'O monstro dentro de mim disse que você é o cara que vai mudar esse jogo!'
  },
  {
    id: 'kunigami', name: 'Rensuke Kunigami', pos: 'CF', ovr: 91, number: 50, team: 'Bastard München / Japão U-20',
    hairColor: '#f6943a', hairSecondary: '#e0761c', skinColor: '#f0cdb2', eyeColor: '#b45309', hairStyle: 'kunigami_spike', eyeStyle: 'sharp',
    auraColor: '#f97316', jerseyPrimary: '#991b1b', jerseySecondary: '#f59e0b',
    weaponName: 'Ambidestria Wild Card', chemName: 'Impacto do Coringa',
    chemBonus: 'Bloqueia zagueiros com o corpo e solta um pivô explosivo de perna esquerda!',
    quote: 'Esqueça o papo de super-herói. No campo, quem marca o gol é rei.'
  },
  {
    id: 'chigiri', name: 'Hyoma Chigiri', pos: 'LW', ovr: 92, number: 44, team: 'Manshine City / Japão U-20',
    hairColor: '#e2374f', hairSecondary: '#ff7a8a', skinColor: '#fce4d6', eyeColor: '#e0559a', hairStyle: 'chigiri_long',
    auraColor: '#f43f5e', jerseyPrimary: '#38bdf8', jerseySecondary: '#ffffff',
    weaponName: 'Pantera 44°', chemName: 'Relâmpago Carmesim 44',
    chemBonus: 'Arrancada supersônica pela ala cruzando na medida ou cortando na Zona Dourada!',
    quote: 'Saia da frente se não quiser ficar comendo poeira, egoísta.'
  },
  {
    id: 'rin', name: 'Rin Itoshi', pos: 'CF', ovr: 96, number: 10, team: 'PXG / Japão U-20',
    hairColor: '#14251f', hairSecondary: '#2f6b58', skinColor: '#f8dcc4', eyeColor: '#20b2a4', hairStyle: 'rin_fringe', shortBrows: true,
    auraColor: '#14b8a6', jerseyPrimary: '#1e1b4b', jerseySecondary: '#e11d48',
    weaponName: 'Destruidor Marionete', chemName: 'Sinfonia da Destruição',
    chemBonus: 'Manipula toda a defesa rival e abre uma linha de chute curva impossível de defender!',
    quote: 'Futebol é um massacre. Eu vou destruir você, o Sae e o mundo inteiro.'
  },
  {
    id: 'nagi', name: 'Seishiro Nagi', pos: 'CF', ovr: 93, number: 11, team: 'Manshine City / Japão U-20',
    hairColor: '#f1f5f9', hairSecondary: '#cbd5e1', skinColor: '#f8e2cf', eyeColor: '#64748b', hairStyle: 'nagi_fluffy',
    auraColor: '#94a3b8', jerseyPrimary: '#38bdf8', jerseySecondary: '#ffffff',
    weaponName: 'Domínio Divino (Trap)', chemName: 'Voleio de Cinco Estágios',
    chemBonus: 'Amortece qualquer bola impossível no ar e devolve de letra para o seu chute letal!',
    quote: 'Que preguiça... mas jogar com você até que deixa as coisas divertidas.'
  },
  {
    id: 'reo', name: 'Reo Mikage', pos: 'CM', ovr: 90, number: 14, team: 'Manshine City / Japão U-20',
    hairColor: '#7e22ce', hairSecondary: '#a855f7', skinColor: '#f5d5be', eyeColor: '#9333ea', hairStyle: 'reo_bun',
    auraColor: '#a855f7', jerseyPrimary: '#38bdf8', jerseySecondary: '#ffffff',
    weaponName: 'Camaleão 99%', chemName: 'Cópia Camaleão Suprema',
    chemBonus: 'Copia a sua arma em tempo real e cria uma tabela espelhada pelo meio-campo!',
    quote: 'Eu consigo tudo o que eu quero. E agora eu quero a Copa do Mundo.'
  },
  {
    id: 'barou', name: 'Shouei Barou', pos: 'CF', ovr: 94, number: 13, team: 'Ubers / Japão U-20',
    hairColor: '#151515', hairSecondary: '#4b4b55', skinColor: '#dca57c', eyeColor: '#dc2626', hairStyle: 'barou_flame',
    auraColor: '#dc2626', jerseyPrimary: '#111827', jerseySecondary: '#ffffff',
    weaponName: 'Investida do Rei & Olho Predador', chemName: 'Devorar a Luz e a Sombra',
    chemBonus: 'Usa você como isca na sombra e rasga a área com um Chop Dribble + Predator Shot!',
    quote: 'Ajoelhe-se, plebeu! No campo, EU sou o único Rei!'
  },
  {
    id: 'shidou', name: 'Ryusei Shidou', pos: 'CF', ovr: 95, number: 99, team: 'PXG / Japão U-20',
    hairColor: '#f4e3a1', hairSecondary: '#f472b6', skinColor: '#c68e68', eyeColor: '#ec4899', hairStyle: 'shidou_horns',
    auraColor: '#ec4899', jerseyPrimary: '#1e1b4b', jerseySecondary: '#ec4899',
    weaponName: 'Instinto Extremo na Área (Big Bang)', chemName: 'Explosão Celular Big Bang Drive',
    chemBonus: 'REAÇÃO QUÍMICA SUPREMA: Você lança na estratosfera e Shidou/Você finalizam de bicicleta demoníaca!',
    quote: 'HAHAHA! Exploda comigo! Essa sensação faz minhas células ferverem!'
  },
  {
    id: 'hiori', name: 'Yo Hiori', pos: 'CAM', ovr: 89, number: 23, team: 'Bastard München / Japão U-20',
    hairColor: '#a6e0ee', hairSecondary: '#d4f4fa', skinColor: '#fce7d6', eyeColor: '#0891b2', hairStyle: 'hiori_soft',
    auraColor: '#22d3ee', jerseyPrimary: '#991b1b', jerseySecondary: '#f59e0b',
    weaponName: 'Passe Reflexivo Sádico', chemName: 'Cruzamento Sem Olhar (Reflexo)',
    chemBonus: 'Passe milimétrico sem olhar que atravessa 4 defensores direto no seu pé!',
    quote: 'Se você não acompanhar o meu passe final, eu te descarto.'
  },
  {
    id: 'kurona', name: 'Kurona Ranze', pos: 'RB', ovr: 87, number: 16, team: 'Bastard München / Japão U-20',
    hairColor: '#e2557f', hairSecondary: '#f287a8', skinColor: '#f5d5be', eyeColor: '#f43f5e', hairStyle: 'kurona_braid',
    auraColor: '#fb7185', jerseyPrimary: '#991b1b', jerseySecondary: '#f59e0b',
    weaponName: 'Linha de Órbita Planetária', chemName: 'Hotline Planetária 1-2',
    chemBonus: 'Gira ao seu redor como um satélite fazendo tabelas ultrarrápidas (1-2)!',
    quote: 'Órbita, órbita. Passa pra mim que eu devolvo no ponto futuro, ponto futuro.'
  },
  {
    id: 'yukimiya', name: 'Kenyu Yukimiya', pos: 'LW', ovr: 90, number: 15, team: 'Bastard München / Japão U-20',
    hairColor: '#7c4a2d', hairSecondary: '#a0673f', skinColor: '#f3d1b8', eyeColor: '#d97706', hairStyle: 'yukimiya_swept', sportGlasses: true,
    auraColor: '#f59e0b', jerseyPrimary: '#991b1b', jerseySecondary: '#f59e0b',
    weaponName: 'Imperador do 1v1 (Rabona & Gyro Shot)', chemName: 'Miragem de Rua & Sword Screw',
    chemBonus: 'Quebra a cintura do marcador de Rabona e prepara o terreno para o Gyro Shot / Sword Screw!',
    quote: 'Mesmo que a escuridão tente fechar meus olhos, meu futebol vai brilhar!'
  },
  {
    id: 'karasu', name: 'Tabito Karasu', pos: 'CDM', ovr: 90, number: 6, team: 'PXG / Japão U-20',
    hairColor: '#1e1b4b', hairSecondary: '#312e81', skinColor: '#ebd0b8', eyeColor: '#4338ca', hairStyle: 'crow_undercut',
    auraColor: '#6366f1', jerseyPrimary: '#1e1b4b', jerseySecondary: '#e11d48',
    weaponName: 'Análise Letal & Controle de Distância', chemName: 'Emboscada do Corvo Assassino',
    chemBonus: 'Rouba a bola do elo mais fraco adversário e inicia contra-ataque relâmpago!',
    quote: 'Você tem um talento extraordinário... ao contrário daqueles caras comuns.'
  },
  {
    id: 'otoya', name: 'Eita Otoya', pos: 'RW', ovr: 89, number: 9, team: 'FC Barcha / Japão U-20',
    hairColor: '#f8fafc', hairSecondary: '#22c55e', skinColor: '#e7c1a3', eyeColor: '#16a34a', hairStyle: 'ninja_streak',
    auraColor: '#22c55e', jerseyPrimary: '#1e3a8a', jerseySecondary: '#dc2626',
    weaponName: 'Passos Furtivos Ninja', chemName: 'Infiltração Sombra & Luz',
    chemBonus: 'Desaparece no ponto cego da zaga e aparece livre na segunda trave!',
    quote: 'Beleza, parceria. Sem estresse, só entrar nas costas deles e caixa.'
  },
  {
    id: 'niko', name: 'Ikki Niko', pos: 'CB', ovr: 88, number: 3, team: 'Ubers / Japão U-20',
    hairColor: '#141414', hairSecondary: '#2e2e2e', skinColor: '#f8dec8', eyeColor: '#38bdf8', hairStyle: 'bangs_over_eyes',
    auraColor: '#38bdf8', jerseyPrimary: '#111827', jerseySecondary: '#ffffff',
    weaponName: 'Torre de Vigia & Metavision', chemName: 'Interceptação de Xadrez Tático',
    chemBonus: 'Antecipa o passe rival com Metavision e lança você cara a cara com o goleiro!',
    quote: 'Esmagar atacantes egoístas é a coisa mais divertida do mundo.'
  },
  {
    id: 'raichi', name: 'Jingo Raichi', pos: 'CDM', ovr: 86, number: 22, team: 'Bastard München / Japão U-20',
    hairColor: '#facc15', hairSecondary: '#ca8a04', skinColor: '#ecc2a1', eyeColor: '#dc2626', hairStyle: 'shark_spiky',
    auraColor: '#eab308', jerseyPrimary: '#991b1b', jerseySecondary: '#f59e0b',
    weaponName: 'Futebol Sexy & Marcação Homem-a-Homem', chemName: 'Duelo de Estamina Infinita',
    chemBonus: 'Anula o craque adversário no grito e recupera a posse na dividida!',
    quote: 'HORA DO MEU FUTEBOL SEXY! Passa a bola pra mim, caramba!'
  },
  {
    id: 'gagamaru', name: 'Gin Gagamaru', pos: 'GK', ovr: 91, number: 1, team: 'Bastard München / Japão U-20',
    hairColor: '#0f172a', hairSecondary: '#94a3b8', skinColor: '#f1cfb3', eyeColor: '#1e293b', hairStyle: 'wild_long_top',
    auraColor: '#10b981', jerseyPrimary: '#facc15', jerseySecondary: '#111827',
    weaponName: 'Reflexos Selvagens de Urso', chemName: 'Defesa Escorpião + Lançamento Direto',
    chemBonus: 'Defende chutes impossíveis de mão trocada e lança a bola até a área rival!',
    quote: 'A bola veio... eu só pulei e peguei.'
  },
  {
    id: 'igarashi', name: 'Gurimu Igarashi', pos: 'RB', ovr: 78, number: 108, team: 'Bastard München / Blue Lock',
    hairColor: '#94a3b8', hairSecondary: '#64748b', skinColor: '#f3d0b5', eyeColor: '#0f172a', hairStyle: 'monk_shaved',
    auraColor: '#fbbf24', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff',
    weaponName: 'Malícia (Cavada de Falta)', chemName: 'Bênção de Buda (Falta Cavada)',
    chemBonus: 'Cava falta na entrada da área contra qualquer atacante apelão!',
    quote: 'NAMUSAN! Buda seja louvado, foi falta clara, juizão!'
  },
  {
    id: 'zantetsu', name: 'Zantetsu Tsurugi', pos: 'RW', ovr: 86, number: 29, team: 'PXG / Japão U-20',
    hairColor: '#1e293b', hairSecondary: '#334155', skinColor: '#f1cfb3', eyeColor: '#10b981', hairStyle: 'spiky_glasses',
    auraColor: '#10b981', jerseyPrimary: '#1e1b4b', jerseySecondary: '#e11d48',
    weaponName: 'Aceleração Explosiva & Zona de Chute', chemName: 'Trem-Bala da Zona Esquerda',
    chemBonus: 'Arrancada explosiva nos primeiros 10 metros abrindo corredor na direita!',
    quote: 'Respeite minha inteligência... quer dizer, minha velocidade supersônica!'
  },
  {
    id: 'aryu', name: 'Jyubei Aryu', pos: 'CB', ovr: 87, number: 2, team: 'Ubers / Japão U-20',
    hairColor: '#090d16', hairSecondary: '#334155', skinColor: '#fce7d6', eyeColor: '#a855f7', hairStyle: 'glam_very_long',
    auraColor: '#c084fc', jerseyPrimary: '#111827', jerseySecondary: '#ffffff',
    weaponName: 'Envergadura Glam & Salto Imperial', chemName: 'Brilho Aéreo OSHAA',
    chemBonus: 'Domina qualquer bola aérea a 3 metros de altura com puro glamour!',
    quote: 'OSHAA! Essa jogada foi absurdamente GLAM!'
  },
  {
    id: 'tokimitsu', name: 'Aoshi Tokimitsu', pos: 'CDM', ovr: 85, number: 20, team: 'PXG / Blue Lock',
    hairColor: '#451a03', hairSecondary: '#78350f', skinColor: '#f5d5be', eyeColor: '#451a03', hairStyle: 'anxious_bowl',
    auraColor: '#84cc16', jerseyPrimary: '#1e1b4b', jerseySecondary: '#e11d48',
    weaponName: 'Músculo-Bala & Vigor Inesgotável', chemName: 'Trator em Pânico',
    chemBonus: 'Atropela dois defensores no puro desespero e sobra a bola limpa para você!',
    quote: 'Aaaah a gente vai perder, vai perder... DESCULPA, EU PASSEI POR CIMA DE VOCÊ!'
  },
  {
    id: 'nanase', name: 'Nijiro Nanase', pos: 'LM', ovr: 84, number: 97, team: 'PXG / Japão U-20',
    hairColor: '#292524', hairSecondary: '#57534e', skinColor: '#f3d1b8', eyeColor: '#78350f', hairStyle: 'bandana_spiky',
    auraColor: '#38bdf8', jerseyPrimary: '#1e1b4b', jerseySecondary: '#e11d48',
    weaponName: 'Ambidestria Natural & Apoio Pós-Trama', chemName: 'Ponte de Apoio Ambidestra',
    chemBonus: 'Serve como tabela imediata com qualquer um dos pés sob pressão!',
    quote: 'Eu vou dar a vida em cada passe pra gente vencer essa partida!'
  },
  {
    id: 'kiyora', name: 'Jin Kiyora', pos: 'LB', ovr: 87, number: 69, team: 'Bastard München / Japão U-20',
    hairColor: '#0f172a', hairSecondary: '#475569', skinColor: '#f5d5be', eyeColor: '#e11d48', hairStyle: 'short_sharp',
    auraColor: '#e11d48', jerseyPrimary: '#991b1b', jerseySecondary: '#f59e0b',
    weaponName: 'Breakdance Grounded & Linha de Fronteira', chemName: 'Passe Rasante na Fronteira',
    chemBonus: 'Equilíbrio no solo estilo breakdance com efeito backspin que para no seu pé!',
    quote: 'Eu vivo na linha divisória. Eu escolho quem vai brilhar no último segundo.'
  },
  {
    id: 'himizu', name: 'Aiki Himizu', pos: 'RB', ovr: 80, number: 77, team: 'FC Barcha / Blue Lock',
    hairColor: '#4c1d95', hairSecondary: '#7c3aed', skinColor: '#f3d1b8', eyeColor: '#8b5cf6', hairStyle: 'slick_snake',
    auraColor: '#8b5cf6', jerseyPrimary: '#1e3a8a', jerseySecondary: '#dc2626',
    weaponName: 'Leitura de Mentiras & Finta Dupla', chemName: 'Bote da Serpente',
    chemBonus: 'Engana a marcação fingindo passe e abre espaço na diagonal!',
    quote: 'Todo mundo mente com os olhos antes de tocar na bola.'
  },
  {
    id: 'hiiragi', name: 'Reiji Hiiragi', pos: 'CM', ovr: 82, number: 26, team: 'Manshine City / Blue Lock',
    hairColor: '#1e293b', hairSecondary: '#64748b', skinColor: '#f5d5be', eyeColor: '#a855f7', hairStyle: 'tarot_tidy',
    auraColor: '#a855f7', jerseyPrimary: '#38bdf8', jerseySecondary: '#ffffff',
    weaponName: 'Previsão de Dados & Controle de Jogo', chemName: 'Oráculo de Dados',
    chemBonus: 'Calcula a probabilidade de gol e entrega a bola no momento exato!',
    quote: 'O destino desta jogada já foi escrito nas minhas estatísticas.'
  },
  {
    id: 'nishioka', name: 'Hajime Nishioka', pos: 'RW', ovr: 83, number: 19, team: 'Manshine City / Blue Lock',
    hairColor: '#451a03', hairSecondary: '#d97706', skinColor: '#f8dec8', eyeColor: '#f59e0b', hairStyle: 'messi_curls',
    auraColor: '#38bdf8', jerseyPrimary: '#38bdf8', jerseySecondary: '#ffffff',
    weaponName: 'Drible Messi de Aomori', chemName: 'Milagre de Aomori',
    chemBonus: 'Costura 3 marcadores em espaço curto como o Messi de Aomori!',
    quote: 'Agora que me recuperei da lesão, vocês vão ver o Messi de Aomori!'
  },
  {
    id: 'tanaka', name: 'Shigen Tanaka', pos: 'CM', ovr: 79, number: 48, team: 'Ubers / Blue Lock',
    hairColor: '#1c1917', hairSecondary: '#44403c', skinColor: '#e7c1a3', eyeColor: '#dc2626', hairStyle: 'tall_dreads',
    auraColor: '#dc2626', jerseyPrimary: '#111827', jerseySecondary: '#ffffff',
    weaponName: 'Pressão Física & Alcance', chemName: 'Muralha do Meio',
    chemBonus: 'Trava o meio-campo e empurra a linha ofensiva!',
    quote: 'Ninguém passa pelo nosso setor sem deixar sangue!'
  },
  {
    id: 'shiguma', name: 'Kyohei Shiguma', pos: 'CB', ovr: 80, number: 49, team: 'Ubers / Blue Lock',
    hairColor: '#27272a', hairSecondary: '#52525b', skinColor: '#d6a98a', eyeColor: '#18181b', hairStyle: 'heavy_titan',
    auraColor: '#71717a', jerseyPrimary: '#111827', jerseySecondary: '#ffffff',
    weaponName: 'Corpo de Titã Implacável', chemName: 'Bloqueio de Rocha',
    chemBonus: 'Usa o porte físico colossal para abrir caminho na área!',
    quote: '...'
  },
  {
    id: 'haiji', name: 'Shizuka Haiji', pos: 'LW', ovr: 79, number: 52, team: 'FC Barcha / Blue Lock',
    hairColor: '#312e81', hairSecondary: '#6366f1', skinColor: '#f3d1b8', eyeColor: '#4f46e5', hairStyle: 'short_sharp',
    auraColor: '#6366f1', jerseyPrimary: '#1e3a8a', jerseySecondary: '#dc2626',
    weaponName: 'Giro Rápido no Espaço Curto', chemName: 'Corte Relâmpago',
    chemBonus: 'Tabelas rápidas pela lateral do campo!',
    quote: 'Se piscar, eu já passei.'
  },
  {
    id: 'ishikari', name: 'Yukio Ishikari', pos: 'CB', ovr: 81, number: 25, team: 'Ubers / Blue Lock',
    hairColor: '#451a03', hairSecondary: '#78350f', skinColor: '#ecc2a1', eyeColor: '#78350f', hairStyle: 'buzz_tall',
    auraColor: '#f59e0b', jerseyPrimary: '#111827', jerseySecondary: '#ffffff',
    weaponName: 'Torre de 2 Metros (Cabeceio)', chemName: 'Pivô de 200cm',
    chemBonus: 'Escora cruzamentos do alto como uma torre de basquete!',
    quote: 'Lá em cima a bola é sempre minha.'
  },
  {
    id: 'endoji', name: 'Akira Endoji', pos: 'CF', ovr: 80, number: 55, team: 'PXG / Blue Lock',
    hairColor: '#ef4444', hairSecondary: '#facc15', skinColor: '#f5d5be', eyeColor: '#ef4444', hairStyle: 'star_spiky',
    auraColor: '#ef4444', jerseyPrimary: '#1e1b4b', jerseySecondary: '#e11d48',
    weaponName: 'Instinto Explosivo de Ataque', chemName: 'Chama Estelar',
    chemBonus: 'Infiltração agressiva buscando o rebote na pequena área!',
    quote: 'Bora incendiar esse jogo logo!'
  },
  {
    id: 'yuzu', name: 'Haruhiko Yuzu', pos: 'CM', ovr: 79, number: 61, team: 'PXG / Blue Lock',
    hairColor: '#fde047', hairSecondary: '#eab308', skinColor: '#f8dec8', eyeColor: '#ca8a04', hairStyle: 'soft_side',
    auraColor: '#fde047', jerseyPrimary: '#1e1b4b', jerseySecondary: '#e11d48',
    weaponName: 'Passe de Ligação Dinâmico', chemName: 'Fluxo Cítrico',
    chemBonus: 'Acelera a transição defesa-ataque com passes de primeira!',
    quote: 'Deixa que eu conecto o meio com o seu ataque!'
  },
  {
    id: 'tsunzaki', name: 'Taiga Tsunzaki', pos: 'RW', ovr: 80, number: 64, team: 'Manshine City / Blue Lock',
    hairColor: '#ea580c', hairSecondary: '#18181b', skinColor: '#e5b899', eyeColor: '#ea580c', hairStyle: 'tiger_stripes',
    auraColor: '#f97316', jerseyPrimary: '#38bdf8', jerseySecondary: '#ffffff',
    weaponName: 'Arrancada Feroz de Tigre', chemName: 'Bote do Tigre',
    chemBonus: 'Rasga a lateral na força bruta e cruza rasteiro!',
    quote: 'Grrrr! Abre espaço que o tigre tá passando!'
  },
  {
    id: 'sokura', name: 'Tetsu Sokura', pos: 'LB', ovr: 80, number: 68, team: 'FC Barcha / Blue Lock',
    hairColor: '#14532d', hairSecondary: '#22c55e', skinColor: '#f3d1b8', eyeColor: '#15803d', hairStyle: 'spiky_tall',
    auraColor: '#22c55e', jerseyPrimary: '#1e3a8a', jerseySecondary: '#dc2626',
    weaponName: 'Apoio Lateral Veloz', chemName: 'Ultrapassagem Verde',
    chemBonus: 'Dobra pela ala esquerda criando superioridade numérica!',
    quote: 'Tô passando nas costas, pode soltar!'
  },

  // --- SELEÇÃO JAPÃO SUB-20 ORIGINAL (AIKU, SENDO E DEFESA DE FERRO) ---
  {
    id: 'aiku', name: 'Oliver Aiku', pos: 'CB', ovr: 93, number: 2, team: 'Ubers / Japão U-20',
    hairColor: '#2c3a8a', hairSecondary: '#a3e635', skinColor: '#e6bc9c', eyeColor: '#65a30d', hairStyle: 'aiku_messy',
    auraColor: '#84cc16', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff',
    weaponName: 'Metavision Total & Parede Serpente', chemName: 'Fortaleza Cobra & Contra-Golpe',
    chemBonus: 'Desarma qualquer atacante com 100% de leitura e lança um míssil de 50 metros para você!',
    quote: 'Como capitão da defesa, eu não deixo ladrãozinho nenhum roubar esse palco!'
  },
  {
    id: 'sendo', name: 'Shuto Sendo', pos: 'CF', ovr: 87, number: 11, team: 'Ubers / Japão U-20',
    hairColor: '#fb7185', hairSecondary: '#f43f5e', skinColor: '#f5d5be', eyeColor: '#e11d48', hairStyle: 'ace_swept',
    auraColor: '#f43f5e', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff',
    weaponName: 'Caçador de Segunda Bola (Hiena)', chemName: 'Instinto de Caça de Hollywood',
    chemBonus: 'Briga com os zagueiros na área abrindo espaço para a sua finalização letal!',
    quote: 'Eu vou marcar o gol da vitória e casar com uma atriz de Hollywood!'
  },
  {
    id: 'darai', name: 'Miroku Darai', pos: 'LB', ovr: 84, number: 4, team: 'FC Barcha / Japão U-20',
    hairColor: '#0f172a', hairSecondary: '#38bdf8', skinColor: '#e5b899', eyeColor: '#0284c7', hairStyle: 'tattoo_monk',
    auraColor: '#0ea5e9', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff',
    weaponName: 'Sombra Silenciosa (Leitura de Passos)', chemName: 'Maré Calma',
    chemBonus: 'Fecha o corredor de drible adversário e entrega a posse limpa!',
    quote: 'Como as ondas do mar, todo movimento deixa um rastro antes de acontecer.'
  },
  {
    id: 'neru', name: 'Teppei Neru', pos: 'RB', ovr: 84, number: 3, team: 'Bastard München / Japão U-20',
    hairColor: '#451a03', hairSecondary: '#facc15', skinColor: '#f3d1b8', eyeColor: '#eab308', hairStyle: 'lightning_bangs',
    auraColor: '#facc15', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff',
    weaponName: 'Reação Elétrica de Velocidade', chemName: 'Descarga Lateral',
    chemBonus: 'Acompanha até os pontas mais rápidos do mundo na corrida pura!',
    quote: 'Se o assunto é velocidade de reação, ninguém me deixa pra trás!'
  },
  {
    id: 'niou', name: 'Kazuma Niou', pos: 'CB', ovr: 85, number: 5, team: 'Manshine City / Japão U-20',
    hairColor: '#18181b', hairSecondary: '#71717a', skinColor: '#d9a887', eyeColor: '#ef4444', hairStyle: 'doberman_goatee',
    auraColor: '#dc2626', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff',
    weaponName: 'Pressão Doberman (Carga de Ombro)', chemName: 'Mordida do Doberman',
    chemBonus: 'Desequilibra o marcador com carga de ombro brutal!',
    quote: 'Vem pro choque! Meu corpo é uma muralha de ferro!'
  },
  {
    id: 'fukaku', name: 'Gen Fukaku', pos: 'GK', ovr: 83, number: 1, team: 'Ubers / Japão U-20',
    hairColor: '#1e293b', hairSecondary: '#475569', skinColor: '#e5b899', eyeColor: '#0f172a', hairStyle: 'buzz_tall',
    auraColor: '#3b82f6', jerseyPrimary: '#16a34a', jerseySecondary: '#ffffff',
    weaponName: 'Posicionamento Sólido Sub-20', chemName: 'Reposição Rápida',
    chemBonus: 'Segura chutes de média distância e repõe rápido no contra-ataque!',
    quote: 'Ninguém passa pela meta da seleção japonesa!'
  },
  {
    id: 'hayate', name: 'Haru Hayate', pos: 'CDM', ovr: 82, number: 7, team: 'FC Barcha / Japão U-20',
    hairColor: '#334155', hairSecondary: '#94a3b8', skinColor: '#f3d1b8', eyeColor: '#38bdf8', hairStyle: 'tall_swept',
    auraColor: '#38bdf8', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff',
    weaponName: 'Pivô Defensivo Aéreo', chemName: 'Âncora do Meio',
    chemBonus: 'Ganha a segunda bola no círculo central e distribui rápido!',
    quote: 'Mantenham o quarteto defensivo alinhado!'
  },
  {
    id: 'wakatsuki', name: 'Itsuki Wakatsuki', pos: 'CDM', ovr: 81, number: 6, team: 'Ubers / Japão U-20',
    hairColor: '#451a03', hairSecondary: '#92400e', skinColor: '#f5d5be', eyeColor: '#78350f', hairStyle: 'short_sharp',
    auraColor: '#60a5fa', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff',
    weaponName: 'Cobertura Tática Dupla', chemName: 'Trava Dupla',
    chemBonus: 'Fecha espaços entre as linhas e aciona o ataque!',
    quote: 'Não deixem eles pensarem no meio-campo!'
  },
  {
    id: 'cho', name: 'Kento Cho', pos: 'LW', ovr: 82, number: 8, team: 'PXG / Japão U-20',
    hairColor: '#1e293b', hairSecondary: '#475569', skinColor: '#f3d1b8', eyeColor: '#475569', hairStyle: 'tall_fringe',
    auraColor: '#6366f1', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff',
    weaponName: 'Pivô de Ala Alta', chemName: 'Toque de Casquinha',
    chemBonus: 'Desvia lançamentos longos de cabeça para a sua infiltração!',
    quote: 'Pode mandar no alto que eu escoro!'
  },
  {
    id: 'kitsunezato', name: 'Teru Kitsunezato', pos: 'RW', ovr: 81, number: 9, team: 'FC Barcha / Japão U-20',
    hairColor: '#d97706', hairSecondary: '#f59e0b', skinColor: '#f5d5be', eyeColor: '#b45309', hairStyle: 'fox_narrow',
    auraColor: '#f59e0b', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff',
    weaponName: 'Finta Astuta da Raposa', chemName: 'Truque da Raposa',
    chemBonus: 'Atrai o lateral e solta a bola no corredor livre!',
    quote: 'Vamos ver se a defesa deles cai nessa armadilha.'
  },

  // --- LIGA NEO EGOÍSTA (NEL) & MESTRES / NEW GEN 11 ---
  {
    id: 'noa', worldClass: true, name: 'Noel Noa', pos: 'CF', ovr: 99, number: 9, team: 'Bastard München / França',
    hairColor: '#f8fafc', hairSecondary: '#94a3b8', skinColor: '#f3d1b8', eyeColor: '#eab308', hairStyle: 'noa_undercut',
    auraColor: '#facc15', jerseyPrimary: '#991b1b', jerseySecondary: '#f59e0b',
    weaponName: 'Racionalidade Absoluta & Chute Ciborgue 100%', chemName: 'Lógica do Melhor do Mundo',
    chemBonus: 'O Melhor Atacante do Mundo cria o espaço matematicamente perfeito para o gol!',
    quote: 'Prove com números e gols que você é a opção mais racional em campo.'
  },
  {
    id: 'kaiser', name: 'Michael Kaiser', pos: 'CF', ovr: 98, number: 10, team: 'Bastard München / Alemanha U-20',
    hairColor: '#f1e3a0', hairSecondary: '#2f5fd0', skinColor: '#fce7d6', eyeColor: '#2563eb', hairStyle: 'kaiser_gradient',
    auraColor: '#2563eb', jerseyPrimary: '#991b1b', jerseySecondary: '#f59e0b',
    weaponName: 'Kaiser Impact & Magnus (New Gen 11)', chemName: 'Colisão de Dois Imperadores',
    chemBonus: 'Rivalidade imperial: força a zaga inteira a marcar o Kaiser Impact, deixando o gol escancarado!',
    quote: 'Ajoelhe-se diante do meu destino impossível. Auf Wiedersehen, palhaço.'
  },
  {
    id: 'ness', name: 'Alexis Ness', pos: 'CAM', ovr: 93, number: 8, team: 'Bastard München / Alemanha U-20',
    hairColor: '#a8346f', hairSecondary: '#cbb6ae', skinColor: '#fce7d6', eyeColor: '#db2777', hairStyle: 'ness_wave',
    auraColor: '#ec4899', jerseyPrimary: '#991b1b', jerseySecondary: '#f59e0b',
    weaponName: 'Tornozelos de Borracha & Passe Mágico', chemName: 'Feitiço do Mago do Meio-Campo',
    chemBonus: 'Curva mágica impossível que encontra o seu pé mesmo cercado por três!',
    quote: 'Minha magia existe para fazer o verdadeiro rei brilhar!'
  },
  {
    id: 'grim', name: 'Benedict Grim', pos: 'LW', ovr: 86, number: 19, team: 'Bastard München',
    hairColor: '#a16207', hairSecondary: '#ca8a04', skinColor: '#f5d5be', eyeColor: '#713f12', hairStyle: 'noble_wavy',
    auraColor: '#eab308', jerseyPrimary: '#991b1b', jerseySecondary: '#f59e0b',
    weaponName: 'Drible de Força e Cruzamento', chemName: 'Lança de Munique',
    chemBonus: 'Avança pela ala esquerda com força e cruza na cabeça!',
    quote: 'Elegância e eficiência a serviço do sistema.'
  },
  {
    id: 'gesner', name: 'Erik Gesner', pos: 'RW', ovr: 85, number: 17, team: 'Bastard München',
    hairColor: '#facc15', hairSecondary: '#a16207', skinColor: '#f5d5be', eyeColor: '#3b82f6', hairStyle: 'slick_back',
    auraColor: '#f59e0b', jerseyPrimary: '#991b1b', jerseySecondary: '#f59e0b',
    weaponName: 'Condução Técnica na Ala', chemName: 'Rota Racional Direita',
    chemBonus: 'Abre a defesa pela direita com passe diagonal rasteiro!',
    quote: 'Os números não mentem, essa jogada é indefensável.'
  },
  {
    id: 'birkenstock', name: 'Birkenstock', pos: 'CB', ovr: 85, number: 4, team: 'Bastard München',
    hairColor: '#78350f', hairSecondary: '#451a03', skinColor: '#f3d1b8', eyeColor: '#1e293b', hairStyle: 'buzz_tall',
    auraColor: '#ef4444', jerseyPrimary: '#991b1b', jerseySecondary: '#f59e0b',
    weaponName: 'Barreira Tática Alemã', chemName: 'Muro de Berlim',
    chemBonus: 'Desarme limpo na entrada da área e passe vertical!',
    quote: 'Ordem e disciplina na linha defensiva.'
  },
  {
    id: 'ali', name: 'Ali', pos: 'CDM', ovr: 84, number: 6, team: 'Bastard München',
    hairColor: '#18181b', hairSecondary: '#3f3f46', skinColor: '#c68e68', eyeColor: '#18181b', hairStyle: 'short_sharp',
    auraColor: '#f59e0b', jerseyPrimary: '#991b1b', jerseySecondary: '#f59e0b',
    weaponName: 'Motor de Transição Alemão', chemName: 'Engrenagem de Munique',
    chemBonus: 'Recupera e distribui a bola em menos de 1 segundo!',
    quote: 'Mantenham a posse girando com precisão.'
  },
  {
    id: 'chris_prince', worldClass: true, name: 'Chris Prince', pos: 'CF', ovr: 99, number: 7, team: 'Manshine City / Inglaterra',
    hairColor: '#fef08a', hairSecondary: '#eab308', skinColor: '#f5d0b5', eyeColor: '#3b82f6', hairStyle: 'prince_pompadour',
    auraColor: '#38bdf8', jerseyPrimary: '#38bdf8', jerseySecondary: '#ffffff',
    weaponName: 'Herói Perfeito & Knuckleball Irreal', chemName: 'Showtime do Herói Perfeito',
    chemBonus: 'Físico perfeito Nível Mundial que atrai o time adversário inteiro e solta um Knuckleball insano!',
    quote: 'Treine cada fibra muscular até superar o seu ideal! Eu sou o Herói Perfeito!'
  },
  {
    id: 'agi', name: 'Agi', pos: 'CF', ovr: 92, number: 9, team: 'Manshine City / Inglaterra U-20',
    hairColor: '#18181b', hairSecondary: '#52525b', skinColor: '#7c4a2d', eyeColor: '#facc15', hairStyle: 'agi_high_top',
    auraColor: '#38bdf8', jerseyPrimary: '#ffffff', jerseySecondary: '#dc2626',
    weaponName: 'Doutor do Futebol & Elasticidade Aérea', chemName: 'Experimento Criativo Inglês',
    chemBonus: 'Usa envergadura absurda na Copa Sub-20 pela Inglaterra ou cria tabelas criativas com você!',
    quote: 'Interessante! Mostre-me que tipo de futebol o seu cérebro consegue criar!'
  },
  {
    id: 'teddy_knight', name: 'Teddy Knight', pos: 'CAM', ovr: 91, number: 10, team: 'Manshine City / Inglaterra U-20',
    hairColor: '#d97706', hairSecondary: '#fef08a', skinColor: '#fce7d6', eyeColor: '#2563eb', hairStyle: 'knight_fringe',
    auraColor: '#ef4444', jerseyPrimary: '#ffffff', jerseySecondary: '#dc2626',
    weaponName: 'Cavaleiro da Coroa Inglesa (U-20)', chemName: 'Lança Real Britânica',
    chemBonus: 'Maestro da Seleção Inglesa U-20 com passes cortantes e chutes de fora da área!',
    quote: 'Pela coroa inglesa, a Copa Sub-20 pertence à nossa geração!'
  },
  {
    id: 'lavinho', worldClass: true, name: 'Lavinho', pos: 'LW', ovr: 99, number: 19, team: 'FC Barcha / Brasil',
    hairColor: '#18181b', hairSecondary: '#facc15', skinColor: '#c68e68', eyeColor: '#eab308', hairStyle: 'dreads_ponytail',
    auraColor: '#f59e0b', jerseyPrimary: '#1e3a8a', jerseySecondary: '#dc2626',
    weaponName: 'Dança da Borboleta (Ginga Suprema)', chemName: 'Carnaval da Borboleta Dourada',
    chemBonus: 'Dança na frente da zaga inteira deixando 5 marcadores no chão antes de te servir!',
    quote: 'Ouça o ritmo do Deus do Futebol dentro do seu peito e DANCE!'
  },
  {
    id: 'bunny', name: 'Bunny Iglesias (Bunnie)', pos: 'CF', ovr: 97, number: 9, team: 'FC Barcha / Espanha U-20',
    hairColor: '#fbcfe8', hairSecondary: '#f43f5e', skinColor: '#f5d5be', eyeColor: '#e11d48', hairStyle: 'bunny_messy',
    auraColor: '#f43f5e', jerseyPrimary: '#dc2626', jerseySecondary: '#facc15',
    weaponName: 'Salto Fantasma & Finalização New Gen 11', chemName: 'Impulso Carmesim de Bunnie',
    chemBonus: 'Impulsão absurda New Gen 11 e finalização acrobática em pleno ar!',
    quote: 'Você realmente achou que conseguiria alcançar o meu salto?'
  },
  {
    id: 'lara', name: 'Ignacio Lara', pos: 'CAM', ovr: 90, number: 10, team: 'FC Barcha / Espanha U-20',
    hairColor: '#451a03', hairSecondary: '#d97706', skinColor: '#e5b899', eyeColor: '#ea580c', hairStyle: 'spiky_tall',
    auraColor: '#dc2626', jerseyPrimary: '#1e3a8a', jerseySecondary: '#dc2626',
    weaponName: 'Tiki-Taka Livre & Passe Curvo', chemName: 'Compasso Catalão',
    chemBonus: 'Ritmo de passe hipnótico que desmonta retrancas!',
    quote: 'No Barcha, a bola tem música própria.'
  },
  {
    id: 'snuffy', worldClass: true, name: 'Marc Snuffy', pos: 'CAM', ovr: 99, number: 17, team: 'Ubers / Malta',
    hairColor: '#0f172a', hairSecondary: '#64748b', skinColor: '#e5b899', eyeColor: '#475569', hairStyle: 'snuffy_dreads',
    auraColor: '#a855f7', jerseyPrimary: '#111827', jerseySecondary: '#ffffff',
    weaponName: 'Mensageiro da Vitória (Jiu-Jitsu & Metavision)', chemName: 'Plano Mestre Infalível',
    chemBonus: 'Conecta 100% do time em uma jogada ensaiada matematicamente imparável!',
    quote: 'Futebol é um trabalho, mas vencer com os seus companheiros é a melhor sensação da vida.'
  },
  {
    id: 'lorenzo', name: 'Don Lorenzo', pos: 'CB', ovr: 97, number: 6, team: 'Ubers / Itália U-20',
    hairColor: '#6d28d9', hairSecondary: '#4c1d95', skinColor: '#f4dccb', eyeColor: '#a78bfa', hairStyle: 'lorenzo_wavy', eyeStyle: 'round', mouth: 'gold_grin',
    auraColor: '#9333ea', jerseyPrimary: '#111827', jerseySecondary: '#ffffff',
    weaponName: 'Devorador de Ás & Drible Zumbi (New Gen 11)', chemName: 'Marcha dos Mortos-Vivos',
    chemBonus: 'Rouba a bola do melhor jogador rival e atravessa o campo inteiro driblando como um zumbi!',
    quote: 'Hehehe... Quanto vale a sua cabeça? Me dá dinheiro, Marc!'
  },
  {
    id: 'drago', name: 'Drago', pos: 'CF', ovr: 86, number: 18, team: 'Ubers / Itália U-20',
    hairColor: '#27272a', hairSecondary: '#dc2626', skinColor: '#e5b899', eyeColor: '#dc2626', hairStyle: 'spiky_tall',
    auraColor: '#ef4444', jerseyPrimary: '#111827', jerseySecondary: '#ffffff',
    weaponName: 'Pivô Tático de Ubers', chemName: 'Escudo do Dragão',
    chemBonus: 'Segura dois zagueiros nas costas e ajeita para a batida de frente!',
    quote: 'Pelos esquemas do Snuffy, a vitória já é nossa.'
  },
  {
    id: 'abdi', name: 'Abdi', pos: 'CM', ovr: 85, number: 8, team: 'Ubers',
    hairColor: '#18181b', hairSecondary: '#52525b', skinColor: '#8d5524', eyeColor: '#18181b', hairStyle: 'short_sharp',
    auraColor: '#94a3b8', jerseyPrimary: '#111827', jerseySecondary: '#ffffff',
    weaponName: 'Engrenagem de Transição Ubers', chemName: 'Contra-Ataque em Onda',
    chemBonus: 'Acelera a onda ofensiva da Ubers em sincronia!',
    quote: 'Transição imediata! Sigam o padrão 3!'
  },
  {
    id: 'loki', worldClass: true, name: 'Julian Loki', pos: 'CF', ovr: 99, number: 17, team: 'PXG / França',
    hairColor: '#151210', hairSecondary: '#3b302a', skinColor: '#6b3e26', eyeColor: '#f0b429', hairStyle: 'loki_flattop',
    auraColor: '#38bdf8', jerseyPrimary: '#1e1b4b', jerseySecondary: '#e11d48',
    weaponName: 'Godspeed (Velocidade Divina)', chemName: 'Distorsão Temporal Godspeed',
    chemBonus: 'Teleporta pelo campo em velocidade sobre-humana — um dos QUATRO EGOS da Final!',
    quote: 'Eu vejo uma brecha. Desculpe, mas nessa velocidade ninguém no mundo me alcança.'
  },
  {
    id: 'charles', name: 'Charles Chevalier', pos: 'CAM', ovr: 94, number: 16, team: 'PXG / França U-20',
    hairColor: '#fde047', hairSecondary: '#f59e0b', skinColor: '#fce7d6', eyeColor: '#3b82f6', hairStyle: 'imp_ears',
    auraColor: '#eab308', jerseyPrimary: '#1e1b4b', jerseySecondary: '#e11d48',
    weaponName: 'Coração de Diabinho Contrariador & Metavision', chemName: 'Passe Impossível do Travesso',
    chemBonus: 'Ignora a jogada óbvia e manda o passe mais insano e imprevisível da história!',
    quote: 'Bleh! Passe normal é chato demais! Corre no lugar mais impossível que eu mando lá!'
  },
  {
    id: 'sae', name: 'Sae Itoshi', pos: 'CAM', ovr: 98, number: 10, team: 'Re Al / Japão U-20',
    hairColor: '#a94e68', hairSecondary: '#d58aa0', skinColor: '#fbe6d8', eyeColor: '#2aa198', hairStyle: 'sae_spiky', shortBrows: true,
    auraColor: '#ec4899', jerseyPrimary: '#ffffff', jerseySecondary: '#ec4899',
    weaponName: 'Destruição Bela & Passe Perfeito (New Gen 11)', chemName: 'Geometria Divina New Gen 11',
    chemBonus: 'Um dos QUATRO EGOS: destrói o meio-campo com elásticos perfeitos e coloca a bola onde só um verdadeiro egoísta alcança!',
    quote: 'Mostre-me se o seu ego consegue sobreviver ao meu passe, atacante.'
  },

  // --- OS 5 CRAQUES MUNDIAIS (WORLD FIVE) + HUGO (QUATRO EGOS) ---
  {
    id: 'luna', worldClass: true, name: 'Leonardo Luna', pos: 'CF', ovr: 98, number: 9, team: 'Re Al / Espanha',
    hairColor: '#fef08a', hairSecondary: '#eab308', skinColor: '#fce7d6', eyeColor: '#8b5cf6', hairStyle: 'prince_pompadour',
    auraColor: '#c084fc', jerseyPrimary: '#ffffff', jerseySecondary: '#eab308',
    weaponName: 'Scion de Re Al (Drible & Caneta Cruel)', chemName: 'Humilhação Real',
    chemBonus: 'Passa a bola por baixo das pernas do defensor com um sorriso sádico!',
    quote: 'Vocês se esforçam tanto... chega a dar pena destruir seus sonhos assim.'
  },
  {
    id: 'blake', worldClass: true, name: 'Adam Blake', pos: 'CF', ovr: 98, number: 9, team: 'Inglaterra (World 5)',
    hairColor: '#991b1b', hairSecondary: '#dc2626', skinColor: '#f3d1b8', eyeColor: '#dc2626', hairStyle: 'beard_undercut',
    auraColor: '#dc2626', jerseyPrimary: '#ffffff', jerseySecondary: '#dc2626',
    weaponName: 'Artilheiro Britânico (Core de Aço)', chemName: 'Canhão de Londres',
    chemBonus: 'Derruba qualquer marcador no tranco e fuzila o canto superior!',
    quote: 'Não importa quão bonito você jogue: quem faz mais gols vence, garoto.'
  },
  {
    id: 'dada_silva', worldClass: true, name: 'Dada Silva', pos: 'CB', ovr: 97, number: 4, team: 'Brasil (World 5)',
    hairColor: '#18181b', hairSecondary: '#facc15', skinColor: '#7c4a2d', eyeColor: '#eab308', hairStyle: 'tall_dreads',
    auraColor: '#22c55e', jerseyPrimary: '#facc15', jerseySecondary: '#16a34a',
    weaponName: 'Tanque Pesado & Impulsão Monstruosa', chemName: 'Míssil Aéreo Brasileiro',
    chemBonus: 'Ganha todas no alto com força bruta e cabeceia com potência de chute!',
    quote: 'Haha! Quer ganhar no corpo de mim? Vai ter que comer muito feijão!'
  },
  {
    id: 'pablo', worldClass: true, name: 'Pablo Cavazos', pos: 'CAM', ovr: 97, number: 23, team: 'Argentina (World 5)',
    hairColor: '#38bdf8', hairSecondary: '#f472b6', skinColor: '#f5d5be', eyeColor: '#ec4899', hairStyle: 'freckle_bob',
    auraColor: '#38bdf8', jerseyPrimary: '#38bdf8', jerseySecondary: '#ffffff',
    weaponName: 'Rei da Bola Parada & Visão 360°', chemName: 'Arco-Íris Argentino',
    chemBonus: 'Lançamentos de trivela com efeito absurdo que caem direto no seu pé!',
    quote: 'Olha pro céu... a bola já está caindo exatamente onde você queria.'
  },
  {
    id: 'hugo', name: 'Hugo', pos: 'CF', ovr: 98, number: 11, team: 'PXG / França U-20',
    hairColor: '#a8173a', hairSecondary: '#d63a5c', skinColor: '#f7e6dc', eyeColor: '#1f2937', hairStyle: 'hugo_wavy', eyeStyle: 'lidded',
    auraColor: '#ec4899', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff',
    weaponName: 'Soberania do Quarto Ego', chemName: 'Convergência dos Quatro Egos',
    chemBonus: 'Protagonista da cena lendária "QUATRO EGOS" ao lado de Você, Sae Itoshi e Julian Loki!',
    quote: 'Quatro Egos no mesmo gramado... só um de nós vai reinar no topo do mundo!'
  }
];

