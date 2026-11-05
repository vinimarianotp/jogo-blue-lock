// ============================================================================
// BLUE LOCK: EGOIST CAREER - ARMAS (WEAPONS), SKILLS (1, 2, 3) & FLUXOS (FLOWS)
// 7 RARIDADES: Comum, Incomum, Raro, Épico, Lendário, Mítico, World Class
// ============================================================================

window.RARITY_TIERS = {
  COMUM: {
    id: 'COMUM', name: 'Comum', chance: 34, color: '#94a3b8', bg: '#1e293b', glow: 'rgba(148,163,184,0.4)', ovrBonus: 2
  },
  INCOMUM: {
    id: 'INCOMUM', name: 'Incomum', chance: 25, color: '#22c55e', bg: '#064e3b', glow: 'rgba(34,197,94,0.5)', ovrBonus: 5
  },
  RARO: {
    id: 'RARO', name: 'Raro', chance: 18, color: '#38bdf8', bg: '#0c4a6e', glow: 'rgba(56,189,248,0.6)', ovrBonus: 9
  },
  EPICO: {
    id: 'EPICO', name: 'Épico', chance: 11, color: '#a855f7', bg: '#3b0764', glow: 'rgba(168,85,247,0.7)', ovrBonus: 14
  },
  LENDARIO: {
    id: 'LENDARIO', name: 'Lendário', chance: 7, color: '#facc15', bg: '#713f12', glow: 'rgba(250,204,21,0.8)', ovrBonus: 20
  },
  MITICO: {
    id: 'MITICO', name: 'Mítico', chance: 3.5, color: '#ef4444', bg: '#7f1d1d', glow: 'rgba(239,68,68,0.9)', ovrBonus: 28
  },
  WORLD_CLASS: {
    id: 'WORLD_CLASS', name: 'World Class (Classe Mundial)', chance: 1.5, color: '#00f5d4', bg: '#090d16', glow: 'rgba(0,245,212,1)', ovrBonus: 40
  }
};

window.WEAPONS_DB = [
  // ================= COMUM =================
  {
    id: 'wp_comum_passe',
    name: 'Fundamentos Colegiais',
    inspiration: 'Jogador de Ensino Médio',
    rarity: 'COMUM',
    desc: 'Domínio básico e chute simples de quem acabou de entrar no projeto.',
    statBoosts: { conducao: 5, finalizando: 5, velocidade: 5 },
    skills: [
      { key: '1', name: 'Corte Simples', type: 'dribble', cd: 5, power: 1.15, color: '#94a3b8', desc: 'Adiantada curta para fugir do bote.' },
      { key: '2', name: 'Chute Colocado', type: 'shot', cd: 7, power: 1.25, color: '#cbd5e1', desc: 'Chute básico buscando o canto do goleiro.' },
      { key: '3', name: 'Arrancada de Fôlego', type: 'buff', cd: 10, power: 1.2, color: '#64748b', desc: 'Aumenta a velocidade por 3 segundos.' }
    ]
  },
  {
    id: 'wp_comum_malicia',
    name: 'Espírito do Templo (Malícia)',
    inspiration: 'Gurimu Igarashi',
    rarity: 'COMUM',
    desc: 'Usa o corpo para proteger a bola, cavar faltas e sobreviver em campo.',
    statBoosts: { compostura: 8, posicionamento: 6, resistencia: 6 },
    skills: [
      { key: '1', name: 'Giro Namusan', type: 'dribble', move: 'spin', cd: 5, power: 1.2, color: '#fbbf24', desc: 'Protege a bola girando de costas para o marcador.' },
      { key: '2', name: 'Bico de Sobrevivência', type: 'shot', cd: 7, power: 1.25, color: '#f59e0b', desc: 'Chute de bico inesperado que pega o goleiro no contrapé.' },
      { key: '3', name: 'Bloqueio de Rosto', type: 'defense', cd: 9, power: 1.3, color: '#fde047', desc: 'Atira-se na frente da bola para recuperar a posse.' }
    ]
  },

  // ================= INCOMUM =================
  {
    id: 'wp_incomum_raichi',
    name: 'Futebol Sexy & Estamina',
    inspiration: 'Jingo Raichi',
    rarity: 'INCOMUM',
    desc: 'Pressão incansável no meio-campo e chutes pesados de média distância.',
    statBoosts: { resistencia: 15, forca: 12, poderDisparo: 10 },
    skills: [
      { key: '1', name: 'Tranco de Ombro Brutal', type: 'dribble', move: 'shield', cd: 5, power: 1.35, color: '#facc15', desc: 'Derruba o marcador próximo usando força física.' },
      { key: '2', name: 'Bomba Sexy de Fora', type: 'shot', cd: 7, power: 1.4, color: '#eab308', desc: 'Disparo violento e reto de fora da área.' },
      { key: '3', name: 'Marcação Carrapato', type: 'defense', cd: 8, power: 1.45, color: '#ca8a04', desc: 'Avança rapidamente e rouba a bola do adversário.' }
    ]
  },
  {
    id: 'wp_incomum_nanase',
    name: 'Ponto de Apoio Ambidestro',
    inspiration: 'Nijiro Nanase',
    rarity: 'INCOMUM',
    desc: 'Uso natural das duas pernas para conduzir, tabelar e finalizar rápido.',
    statBoosts: { conducao: 12, visao: 12, finalizando: 10 },
    skills: [
      { key: '1', name: 'Toque Duplo Ambidestro', type: 'dribble', move: 'zigzag', cd: 5, power: 1.35, color: '#38bdf8', desc: 'Muda a bola do pé direito para o esquerdo em velocidade.' },
      { key: '2', name: 'Finalização Cruzada', type: 'shot', cd: 6, power: 1.4, color: '#0ea5e9', desc: 'Chute cruzado rápido sem precisar ajeitar o corpo.' },
      { key: '3', name: 'Tabela de Primeira', type: 'pass', cd: 8, power: 1.4, color: '#0284c7', desc: 'Passe teleguiado para o companheiro mais próximo da área.' }
    ]
  },

  // ================= RARO =================
  {
    id: 'wp_raro_zantetsu',
    name: 'Trem-Bala da Zona Esquerda',
    inspiration: 'Zantetsu Tsurugi',
    rarity: 'RARO',
    desc: 'Aceleração explosiva nos primeiros metros e chute curvo de canhota.',
    statBoosts: { velocidade: 22, tirosLongos: 18, conducao: 14 },
    skills: [
      { key: '1', name: 'Ignicao Explosiva (0 a 100)', type: 'dribble', move: 'burst', cd: 5, power: 1.55, color: '#10b981', desc: 'Teleporta 6 metros à frente com aceleração instantânea.' },
      { key: '2', name: 'Curva da Zona Dourada', type: 'shot', cd: 7, power: 1.6, color: '#059669', desc: 'Chute curvo letal no ângulo oposto.' },
      { key: '3', name: 'Corte para Dentro', type: 'dribble', cd: 8, power: 1.5, color: '#34d399', desc: 'Quebra a direção em 90 graus deixando o zagueiro no chão.' }
    ]
  },
  {
    id: 'wp_raro_niko',
    name: 'Torre de Vigia Tática',
    inspiration: 'Ikki Niko',
    rarity: 'RARO',
    desc: 'Visão espacial completa do campo para interceptar e armar contra-ataques.',
    statBoosts: { visao: 25, posicionamento: 20, compostura: 15 },
    skills: [
      { key: '1', name: 'Leitura de Xadrez (Roubo)', type: 'defense', cd: 5, power: 1.6, color: '#38bdf8', desc: 'Desarma instantaneamente qualquer adversário no raio.' },
      { key: '2', name: 'Chute Rasteiro Calculado', type: 'shot', cd: 7, power: 1.55, color: '#0284c7', desc: 'Chute rasteiro milimétrico que passa entre as pernas da zaga.' },
      { key: '3', name: 'Lançamento de Torre', type: 'pass', cd: 7, power: 1.65, color: '#7dd3fc', desc: 'Enfiada profunda que rasga o campo inteiro.' }
    ]
  },
  {
    id: 'wp_raro_gagamaru',
    name: 'Instinto Selvagem Acrobático',
    inspiration: 'Gin Gagamaru',
    rarity: 'RARO',
    desc: 'Flexibilidade sobre-humana para peixinhos, escorpiões e defesas milagrosas.',
    statBoosts: { habilidadeAerea: 26, finalizando: 16, forca: 15 },
    skills: [
      { key: '1', name: 'Salto de Mola Selvagem', type: 'dribble', move: 'hop', cd: 5, power: 1.55, color: '#22c55e', desc: 'Salta por cima do carrinho adversário mantendo a bola.' },
      { key: '2', name: 'Chute Escorpião Acrobático', type: 'shot', cd: 7, power: 1.68, color: '#16a34a', desc: 'Finalização de calcanhar no ar com força absurda.' },
      { key: '3', name: 'Bote do Urso da Montanha', type: 'defense', cd: 8, power: 1.6, color: '#4ade80', desc: 'Mergulho elástico que recupera bolas perdidas longe.' }
    ]
  },

  // ================= ÉPICO (INCLUI A ARMA DO YUKIMIYA PEDIDA PELO USUÁRIO!) =================
  {
    id: 'wp_epico_yukimiya',
    name: 'Imperador do 1v1 (Yukimiya)',
    inspiration: 'Kenyu Yukimiya',
    rarity: 'EPICO',
    desc: 'O estilo de rua supremo no 1 contra 1: Rabona hipnótica, Gyro Shot com efeito giroscópico e o lendário Sword Screw!',
    statBoosts: { conducao: 32, tirosLongos: 28, velocidade: 22, finalizando: 24 },
    skills: [
      { key: '1', name: 'Rabona de Rua Imperial', type: 'dribble', move: 'spin', cd: 4, power: 1.85, color: '#f59e0b', desc: 'Cruza a perna por trás em uma Rabona elástica que congela todos os marcadores próximos!' },
      { key: '2', name: 'Gyro Shot (Chute Giroscópico)', type: 'shot', cd: 6, power: 1.9, color: '#fbbf24', desc: 'Chute com rotação giroscópica que faz uma curva fechada e cai de repente no ângulo!' },
      { key: '3', name: 'Sword Screw (Parafuso de Espada)', type: 'shot', cd: 9, power: 2.1, color: '#d97706', desc: 'Disparo giratório vertical que quica no gramado e muda de direção enganando o goleiro!' }
    ]
  },
  {
    id: 'wp_epico_kurona',
    name: 'Órbita Planetária (Shark)',
    inspiration: 'Kurona Ranze',
    rarity: 'EPICO',
    desc: 'Velocidade de giro curto e tabelas em órbita que destroem linhas defensivas.',
    statBoosts: { velocidade: 30, conducao: 26, visao: 22 },
    skills: [
      { key: '1', name: 'Giro em Órbita Curta', type: 'dribble', move: 'spin', cd: 4, power: 1.75, color: '#f43f5e', desc: 'Contorna o defensor em alta velocidade sem perder o controle.' },
      { key: '2', name: 'Finalização Satélite', type: 'shot', cd: 6, power: 1.8, color: '#e11d48', desc: 'Chute rápido no contrapé após giro de 180 graus.' },
      { key: '3', name: 'Tabela Planetária 1-2', type: 'pass', cd: 7, power: 1.9, color: '#fb7185', desc: 'Tabelinha automática que teletransporta a bola de volta ao seu pé na frente!' }
    ]
  },
  {
    id: 'wp_epico_hiori',
    name: 'Maestro Reflexivo (Ultra-Sadista)',
    inspiration: 'Yo Hiori',
    rarity: 'EPICO',
    desc: 'Controle de bola gelado, fintas de corpo suaves e passes/chutes sem olhar.',
    statBoosts: { visao: 34, conducao: 26, tirosLongos: 22, compostura: 24 },
    skills: [
      { key: '1', name: 'Finta deGelo Sem Olhar', type: 'dribble', cd: 4, power: 1.8, color: '#22d3ee', desc: 'Ameaça o passe e desliza pelo lado oposto deixando o marcador perdido.' },
      { key: '2', name: 'Arco Ciano de Fora da Área', type: 'shot', cd: 6, power: 1.85, color: '#06b6d4', desc: 'Chute de folha seca com curva congelante na gaveta.' },
      { key: '3', name: 'Passe Reflexivo Laser', type: 'pass', cd: 7, power: 1.95, color: '#67e8f9', desc: 'Atravessa toda a defesa adversária com um passe teleguiado.' }
    ]
  },
  {
    id: 'wp_epico_karasu',
    name: 'Análise do Corvo Assassino',
    inspiration: 'Tabito Karasu',
    rarity: 'EPICO',
    desc: 'Uso magistral das mãos, distância de braço e fintas cadenciadas letais.',
    statBoosts: { conducao: 28, compostura: 28, visao: 26, finalizando: 20 },
    skills: [
      { key: '1', name: 'Passo do Corvo (Braço de Ferro)', type: 'dribble', move: 'shield', cd: 4, power: 1.8, color: '#6366f1', desc: 'Mantém o rival afastado com o braço e gira em velocidade.' },
      { key: '2', name: 'Disparo no Ponto Fraco', type: 'shot', cd: 6, power: 1.88, color: '#4f46e5', desc: 'Encontra a brecha exata entre o zagueiro e o goleiro.' },
      { key: '3', name: 'Caçada ao Elo Fraco', type: 'defense', cd: 7, power: 1.9, color: '#818cf8', desc: 'Rouba a bola instantaneamente e ganha bônus de velocidade.' }
    ]
  },

  // ================= LENDÁRIO =================
  {
    id: 'wp_lendario_bachira',
    name: 'Monstro do Drible (Ginga X)',
    inspiration: 'Meguru Bachira',
    rarity: 'LENDARIO',
    desc: 'Dribles imprevisíveis em estado de transe: elásticos aéreos, carretilhas e rabonas monstruosas.',
    statBoosts: { conducao: 45, velocidade: 32, visao: 28, ego: 30 },
    skills: [
      { key: '1', name: 'Roleta Aérea do Monstro', type: 'dribble', move: 'spin', cd: 4, power: 2.1, color: '#facc15', desc: 'Atravessa até 3 marcadores seguidos com elásticos e carretilha!' },
      { key: '2', name: 'Bee Shot (Aguilhão da Abelha)', type: 'shot', cd: 6, power: 2.15, color: '#eab308', desc: 'Finalização acrobática rápida após drible curto na cara do gol!' },
      { key: '3', name: 'Transe do Monstro Interior', type: 'buff', cd: 10, power: 2.2, color: '#fde047', desc: 'Aumenta Condução e Velocidade em +50% por 5 segundos!' }
    ]
  },
  {
    id: 'wp_lendario_chigiri',
    name: 'Pantera Carmesim 44°',
    inspiration: 'Hyoma Chigiri',
    rarity: 'LENDARIO',
    desc: 'Velocidade máxima da Pantera combinada com o corte de 44 graus para a Zona Dourada.',
    statBoosts: { velocidade: 50, conducao: 32, finalizando: 30, tirosLongos: 25 },
    skills: [
      { key: '1', name: 'Sprint da Pantera Sem Freio', type: 'dribble', move: 'burst', cd: 4, power: 2.2, color: '#f43f5e', desc: 'Adianta a bola e corre na velocidade da luz deixando rastros vermelhos!' },
      { key: '2', name: '44 Panther Snipe (Zona Dourada)', type: 'shot', cd: 6, power: 2.25, color: '#e11d48', desc: 'Corta em 44 graus e dispara um míssil curvo indefensável no canto!' },
      { key: '3', name: 'Corte Relâmpago Carmesim', type: 'dribble', move: 'zigzag', cd: 8, power: 2.05, color: '#fb7185', desc: 'Finta em Z em velocidade máxima que congela a defesa.' }
    ]
  },
  {
    id: 'wp_lendario_nagi',
    name: 'Domínio Divino (Cinco Estágios)',
    inspiration: 'Seishiro Nagi',
    rarity: 'LENDARIO',
    desc: 'Toque de bola sobrenatural que zera o impulso de qualquer passe e emenda voleios irreais.',
    statBoosts: { finalizando: 45, conducao: 38, habilidadeAerea: 35, compostura: 32 },
    skills: [
      { key: '1', name: 'Trap Mortal de Costas', type: 'dribble', move: 'hop', cd: 4, power: 2.1, color: '#e2e8f0', desc: 'Amortece a bola girando no ar por cima do defensor.' },
      { key: '2', name: 'Voleio Revolver de 5 Estágios', type: 'shot', cd: 7, power: 2.4, color: '#f8fafc', desc: 'Finta 4 vezes no ar sem deixar a bola cair e fuzila o gol!' },
      { key: '3', name: 'Toque Fantasma da Morte', type: 'shot', cd: 6, power: 2.15, color: '#94a3b8', desc: 'Chute de bico no ar em ângulo impossível.' }
    ]
  },
  {
    id: 'wp_lendario_barou',
    name: 'Investida do Rei Tirano',
    inspiration: 'Shouei Barou',
    rarity: 'LENDARIO',
    desc: 'O futebol do Rei: o zigue-zague que atravessou o Time Z, o canhão de longe e, depois de perder a coroa, o Predador que devora os gols dos outros.',
    statBoosts: { poderDisparo: 48, forca: 40, tirosLongos: 42, ego: 45 },
    skills: [
      { key: '1', name: 'Zigue-Zague do Rei', type: 'dribble', move: 'zigzag', cd: 4, power: 2.15, color: '#dc2626', desc: 'O drible que atravessou o Time Z inteiro: corta para um lado, para o outro e de novo, em velocidade, sem deixar ninguém encostar.' },
      { key: '2', name: 'Disparo do Rei (Zona de 29m)', type: 'shot', cd: 6, power: 2.35, color: '#ef4444', desc: 'Bomba colossal de longa distância que rasga a rede.' },
      { key: '3', name: 'Devorar a Luz (Predator Shot)', type: 'shot', cd: 8, power: 2.45, color: '#991b1b', desc: 'Espera o goleiro perder a visão e chuta entre as pernas dos zagueiros!' }
    ]
  },
  {
    id: 'wp_lendario_kunigami',
    name: 'Cyborg Wild Card (Ambidestro)',
    inspiration: 'Rensuke Kunigami',
    rarity: 'LENDARIO',
    desc: 'Físico moldado à imagem de Noel Noa com canhões destrutivos de ambas as pernas.',
    statBoosts: { forca: 48, poderDisparo: 46, finalizando: 38, tirosLongos: 35 },
    skills: [
      { key: '1', name: 'Carga Blindada Wild Card', type: 'dribble', move: 'shield', cd: 5, power: 2.1, color: '#f97316', desc: 'Empurra todos os marcadores ao redor como um tanque.' },
      { key: '2', name: 'Knuckleball de Canhota', type: 'shot', cd: 6, power: 2.35, color: '#ea580c', desc: 'Míssil sem rotação que oscila violentamente no ar.' },
      { key: '3', name: 'Voleio Ambidestro Heroico', type: 'shot', cd: 8, power: 2.3, color: '#fb923c', desc: 'Salta mais alto que a zaga e fuzila de primeira no ar.' }
    ]
  },

  // ================= MÍTICO =================
  {
    id: 'wp_mitico_shidou',
    name: 'Big Bang Drive (Demônio da Área)',
    inspiration: 'Ryusei Shidou',
    rarity: 'MITICO',
    desc: 'Percepção espacial extrema dentro da grande área: faz gols de bicicleta e costas sem nem olhar para a trave.',
    statBoosts: { finalizando: 60, habilidadeAerea: 55, poderDisparo: 48, ego: 55, posicionamento: 50 },
    skills: [
      { key: '1', name: 'Voo das Asas do Demônio', type: 'dribble', move: 'hop', cd: 4, power: 2.4, color: '#ec4899', desc: 'Salta sobre a marcação com reflexos felinos explosivos.' },
      { key: '2', name: 'Dragon Drive (Voadora Aérea)', type: 'shot', cd: 5, power: 2.6, color: '#f472b6', desc: 'Finalização voadora de costas que explode no ângulo!' },
      { key: '3', name: 'BIG BANG DRIVE (Bicicleta do Meio)', type: 'shot', cd: 9, power: 2.85, color: '#db2777', desc: 'Bicicleta lendária de fora da área que encobre qualquer goleiro!' }
    ]
  },
  {
    id: 'wp_mitico_rin',
    name: 'Destruidor Berserker & Marionete',
    inspiration: 'Rin Itoshi',
    rarity: 'MITICO',
    desc: 'Precisão cirúrgica absoluta combinada com o instinto destrutivo que humilha a arma mais forte do adversário.',
    statBoosts: { finalizando: 58, tirosLongos: 58, conducao: 52, visao: 50, ego: 55 },
    skills: [
      { key: '1', name: 'Destruição de Armas (1v1)', type: 'dribble', cd: 4, power: 2.5, color: '#14b8a6', desc: 'Usa o ponto forte do marcador contra ele mesmo e o humilha.' },
      { key: '2', name: 'Trivela Curva de Precisão Cirúrgica', type: 'shot', cd: 5, power: 2.65, color: '#0d9488', desc: 'Chute de três dedos que faz uma curva impossível por fora da trave e entra!' },
      { key: '3', name: 'Crash Shot (Colisão Berserker)', type: 'shot', cd: 8, power: 2.85, color: '#2dd4bf', desc: 'Chuta no ar dividindo o corpo com o zagueiro para um gol imparável!' }
    ]
  },
  {
    id: 'wp_mitico_isagi_adapt',
    name: 'Quebra-Cabeça do Rei Adaptativo (Two-Gun Volley)',
    inspiration: 'Egoísta Supremo (Adaptação)',
    rarity: 'MITICO',
    desc: 'Desmonta e reconstrói o campo como peças de quebra-cabeça, finalizando com o Two-Gun Volley!',
    statBoosts: { visao: 62, posicionamento: 60, finalizando: 55, compostura: 52, ego: 58 },
    skills: [
      { key: '1', name: 'Infiltração pelo Ponto Cego (Puzzle)', type: 'dribble', cd: 4, power: 2.45, color: '#22c55e', desc: 'Desaparece do campo de visão do marcador e surge livre na frente.' },
      { key: '2', name: 'Direct Shot (Chute Direto Letal)', type: 'shot', cd: 5, power: 2.6, color: '#10b981', desc: 'Fuzila de primeira sem dar tempo do goleiro respirar!' },
      { key: '3', name: 'Two-Gun Volley (Voleio de Duas Pistolas)', type: 'shot', cd: 8, power: 2.9, color: '#4ade80', desc: 'Finge o chute com uma perna no ar e dispara um míssil com a outra!' }
    ]
  },
  {
    id: 'wp_mitico_lorenzo',
    name: 'Devorador de Ás (Drible Zumbi)',
    inspiration: 'Don Lorenzo (New Gen 11)',
    rarity: 'MITICO',
    desc: 'Centro de gravidade impossível de ler que anula estrelas mundiais e atravessa o campo inteiro.',
    statBoosts: { conducao: 58, posicionamento: 56, visao: 50, resistencia: 52 },
    skills: [
      { key: '1', name: 'Passo dos Mortos-Vivos (Zombie)', type: 'dribble', move: 'zigzag', cd: 4, power: 2.55, color: '#9333ea', desc: 'Balança o tronco de forma bizarra passando por 3 marcadores.' },
      { key: '2', name: 'Finalização de Ouro Maciço', type: 'shot', cd: 6, power: 2.55, color: '#a855f7', desc: 'Chute colocado desconcertante após arrancada desde a defesa.' },
      { key: '3', name: 'Devorador de Ás (Roubo Absoluto)', type: 'defense', cd: 7, power: 2.75, color: '#c084fc', desc: 'Teleporta na frente da bola e rouba a posse sem chance de reação.' }
    ]
  },

  // ================= WORLD CLASS (CLASSE MUNDIAL) =================
  {
    id: 'wp_wc_kaiser',
    name: 'Kaiser Impact (Imperador Escolhido)',
    inspiration: 'Michael Kaiser (World Class)',
    rarity: 'WORLD_CLASS',
    desc: 'O balanço de perna mais rápido da humanidade. Inclui o lendário Kaiser Impact e o Kaiser Impact Magnus!',
    statBoosts: { poderDisparo: 80, finalizando: 78, tirosLongos: 75, visao: 65, ego: 80 },
    skills: [
      { key: '1', name: 'Rota do Imperador (Submissão)', type: 'dribble', cd: 4, power: 2.8, color: '#2563eb', desc: 'Rompe a linha defensiva com pétalas de rosa azul e velocidade imperial.' },
      { key: '2', name: 'KAISER IMPACT (Raio Azul)', type: 'shot', cd: 5, power: 3.1, color: '#3b82f6', desc: 'O chute mais rápido do mundo: atravessa 4 defensores como um raio laser azul!' },
      { key: '3', name: 'KAISER IMPACT: MAGNUS', type: 'shot', cd: 8, power: 3.35, color: '#60a5fa', desc: 'Curva extrema impossível que contorna toda a área e explode na gaveta!' }
    ]
  },
  {
    id: 'wp_wc_sae',
    name: 'Destruição Bela (Gênio de Re Al)',
    inspiration: 'Sae Itoshi (World Class)',
    rarity: 'WORLD_CLASS',
    desc: 'Dribles matematicamente perfeitos que humilham qualquer marcador no contrapé, passes divinos e trivela na gaveta.',
    statBoosts: { conducao: 82, visao: 85, tirosLongos: 72, compostura: 78, ego: 75 },
    skills: [
      { key: '1', name: 'Counter-Dribble da Destruição Bela', type: 'dribble', cd: 3, power: 2.95, color: '#ec4899', desc: 'Elástico aéreo + Caneta instantânea com rastro de números geométricos!' },
      { key: '2', name: 'Disparo de Ângulo Zero (Linha de Fundo)', type: 'shot', cd: 5, power: 3.1, color: '#f43f5e', desc: 'Curva mágica que entra mesmo chutando quase sem ângulo!' },
      { key: '3', name: 'Passe Divino dos Quatro Egos', type: 'pass', cd: 6, power: 3.2, color: '#fb7185', desc: 'Ou serve o companheiro livre na cara do gol ou dispara uma trivela teleguiada!' }
    ]
  },
  {
    id: 'wp_wc_loki',
    name: 'Godspeed (Velocidade Divina)',
    inspiration: 'Julian Loki (World Class)',
    rarity: 'WORLD_CLASS',
    desc: 'Aceleração que dobra o espaço-tempo no gramado. Quando Loki acelera, o resto do mundo parece congelado.',
    statBoosts: { velocidade: 95, conducao: 78, finalizando: 75, resistencia: 75, ego: 80 },
    skills: [
      { key: '1', name: 'Godspeed Warp (Dobra Espacial)', type: 'dribble', move: 'burst', cd: 3, power: 3.15, color: '#38bdf8', desc: 'Atravessa metade do campo em um piscar de olhos com raios dourados e azuis!' },
      { key: '2', name: 'Disparo Supersônico Mach 2', type: 'shot', cd: 5, power: 3.15, color: '#facc15', desc: 'Finalização em velocidade máxima antes mesmo do goleiro levantar os braços!' },
      { key: '3', name: 'Intercepção Temporal Godspeed', type: 'defense', cd: 7, power: 3.1, color: '#0ea5e9', desc: 'Alcança a bola em qualquer ponto próximo e inicia contra-ataque letal!' }
    ]
  },
  {
    id: 'wp_wc_noa',
    name: 'Máquina Racional N° 1 do Mundo',
    inspiration: 'Noel Noa (World Class)',
    rarity: 'WORLD_CLASS',
    desc: '100% ambidestro, 0% movimentos desperdiçados. A perfeição mecânica do Melhor Atacante do Mundo.',
    statBoosts: { finalizando: 88, poderDisparo: 85, forca: 80, conducao: 75, compostura: 85 },
    skills: [
      { key: '1', name: 'Corte Ciborgue de Precisão', type: 'dribble', cd: 4, power: 2.9, color: '#facc15', desc: 'Finta mecânica de fintas múltiplas que anula qualquer leitura defensiva.' },
      { key: '2', name: 'Canhão Racional Ambidestro', type: 'shot', cd: 5, power: 3.25, color: '#eab308', desc: 'Disparo de 130 km/h no ângulo exato com qualquer perna.' },
      { key: '3', name: 'Domínio Supremo Ballon d\'Or', type: 'shot', cd: 8, power: 3.4, color: '#fde047', desc: 'Avança atropelando a defesa e finaliza com 99% de letalidade!' }
    ]
  },
  {
    id: 'wp_wc_lavinho',
    name: 'Dança da Borboleta (Ginga Divina)',
    inspiration: 'Lavinho (World Class)',
    rarity: 'WORLD_CLASS',
    desc: 'O ápice da criatividade brasileira: ginga hipnótica que transforma a defesa inteira em espectadores.',
    statBoosts: { conducao: 92, velocidade: 78, finalizando: 76, ego: 82 },
    skills: [
      { key: '1', name: 'Voo da Borboleta Dourada', type: 'dribble', move: 'spin', cd: 3, power: 3.1, color: '#f59e0b', desc: 'Sequência de pedaladas, lambreta e elástico que deixa todos no chão!' },
      { key: '2', name: 'Chute Samba de Trivela', type: 'shot', cd: 5, power: 3.15, color: '#facc15', desc: 'Bola dançante que engana o goleiro no ar e morre no ângulo!' },
      { key: '3', name: 'Showtime Carnaval Supremo', type: 'shot', cd: 8, power: 3.35, color: '#ef4444', desc: 'Dribla o próprio goleiro com um chapéu curto e empurra de letra!' }
    ]
  },

  // ================= SEGREDO (fora da roleta) =================
  // Liberada pelo segredo da madrugada (js/easter_eggs.js: abrir o jogo entre meia-noite e
  // 4 da manhã); fica em "🥚 SEGREDOS" na aba ARMAS para equipar (state.unlockedWeapons).
  // Depois da Lendária do Bachira de propósito: o Bachira rival continua usando a dele.
  {
    id: 'wp_wc_segredo_monstro',
    name: 'Monstro da Madrugada (Segredo)',
    inspiration: 'Meguru Bachira (Segredo)',
    rarity: 'WORLD_CLASS',
    secret: true,
    desc: 'O monstro que não dorme. Dribles em transe noturno que deixam a defesa inteira sonâmbula. Só aparece para quem também não dormiu.',
    statBoosts: { conducao: 92, velocidade: 82, visao: 74, finalizando: 76, ego: 85 },
    skills: [
      { key: '1', name: 'Roleta da Meia-Noite', type: 'dribble', move: 'spin', cd: 3, power: 3.15, color: '#a78bfa', desc: 'Roleta, elástico e carretilha em transe: atravessa a marcação como se ela estivesse dormindo!' },
      { key: '2', name: 'Monster Shot Sonâmbulo', type: 'shot', cd: 5, power: 3.2, color: '#facc15', desc: 'Chute acrobático que muda de direção no ar, no meio do drible, sem o goleiro acordar a tempo!' },
      { key: '3', name: 'Insônia do Monstro', type: 'buff', cd: 9, power: 3.1, color: '#818cf8', desc: 'O monstro acorda: Condução e Velocidade lá em cima por alguns segundos!' }
    ]
  }
];

// A arma foi inspirada nesse personagem? Compara o nome como palavras inteiras
// (antes "Seishiro Nagi" contava como inspirada no Agi, e "malicia" no Ali)
window.weaponInspiredBy = (w, charName) => {
  const norm = (s) => ` ${String(s || '').toLowerCase().replace(/[()&,]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  return norm(w.inspiration).includes(norm(charName));
};

// Garante que TODOS os 66 personagens tenham sua própria Arma exclusiva com Skills 1, 2 e 3 na Roleta!
if (window.BLUE_LOCK_CHARACTERS) {
  window.BLUE_LOCK_CHARACTERS.forEach((ch) => {
    const alreadyExists = window.WEAPONS_DB.some((w) => window.weaponInspiredBy(w, ch.name) || w.id === `wp_char_${ch.id}`);
    if (!alreadyExists) {
      let rarity = 'COMUM';
      if (ch.ovr >= 97) rarity = 'WORLD_CLASS';
      else if (ch.ovr >= 94) rarity = 'MITICO';
      else if (ch.ovr >= 91) rarity = 'LENDARIO';
      else if (ch.ovr >= 86) rarity = 'EPICO';
      else if (ch.ovr >= 82) rarity = 'RARO';
      else if (ch.ovr >= 80) rarity = 'INCOMUM';

      const pwr = rarity === 'WORLD_CLASS' ? 3.1 : rarity === 'MITICO' ? 2.65 : rarity === 'LENDARIO' ? 2.25 : rarity === 'EPICO' ? 1.85 : rarity === 'RARO' ? 1.6 : 1.35;

      window.WEAPONS_DB.push({
        id: `wp_char_${ch.id}`,
        name: ch.weaponName,
        inspiration: ch.name,
        rarity,
        desc: `Arma assinatura de ${ch.name} (${ch.team}). Combo exclusivo: ${ch.chemName}.`,
        statBoosts: { conducao: 25, finalizando: 25, velocidade: 20, visao: 20 },
        skills: [
          { key: '1', name: `Domínio: ${ch.weaponName.split('&')[0].trim()}`, type: 'dribble', cd: 4, power: pwr, color: ch.auraColor, desc: `Avança em velocidade usando a técnica principal de ${ch.name}.` },
          { key: '2', name: `Disparo Assinatura (${ch.name.split(' ')[0]})`, type: 'shot', cd: 6, power: pwr + 0.1, color: ch.auraColor, desc: `Finalização especial carregada com a aura de ${ch.name}.` },
          { key: '3', name: ch.chemName, type: 'shot', cd: 8, power: pwr + 0.25, color: ch.auraColor, desc: ch.chemBonus }
        ]
      });
    }
  });
}

// ============================================================================
// PASSIVAS DAS ARMAS: cada arma tem um efeito que vale a partida inteira, sem
// apertar nada (as duas armas da NEL somam). kind = o que faz, value = quanto.
//   speed (+% corrida) • stamina (−% gasto de fôlego) • dribble (+% drible)
//   curve (+% acerto em chute com curva, goleiro lê menos) • long_shot (chute de longe)
//   aerial (bola alta) • predator (bola solta na área vem pra você)
//   keeper_beat (−% defesa do goleiro) • steal (+% carrinho/bote) • shield (segura a bola)
//   cooldown (skills recarregam mais rápido) • flow / chem (carregam mais rápido)
//   power (chute mais forte) • composure (marcação atrapalha menos)
//   perfect_pass (passe nunca é cortado) • copy (copia a skill do rival, tecla C)
//   radar (linhas até os companheiros livres) • gk_wall (seu goleiro defende mais)
// ============================================================================
window.WEAPON_PASSIVES = {
  wp_comum_passe: { kind: 'stamina', value: 0.1, name: 'Fôlego de Colegial' },
  wp_comum_malicia: { kind: 'shield', value: 0.12, name: 'Malícia do Templo' },
  wp_incomum_raichi: { kind: 'stamina', value: 0.2, name: 'Pulmão Sexy' },
  wp_incomum_nanase: { kind: 'dribble', value: 6, name: 'Duas Pernas' },
  wp_raro_zantetsu: { kind: 'speed', value: 0.12, name: 'Trem-Bala' },
  wp_raro_niko: { kind: 'steal', value: 0.15, name: 'Leitura de Xadrez' },
  wp_raro_gagamaru: { kind: 'aerial', value: 18, name: 'Corpo de Borracha' },
  wp_epico_yukimiya: { kind: 'dribble', value: 10, name: 'Imperador do 1v1' },
  wp_epico_kurona: { kind: 'chem', value: 0.35, name: 'Órbita' },
  wp_epico_hiori: { kind: 'radar', value: 2.5, name: 'Maestro Reflexivo' },
  wp_epico_karasu: { kind: 'keeper_beat', value: 0.12, name: 'Ponto Fraco' },
  wp_lendario_bachira: { kind: 'dribble', value: 14, name: 'O Monstro Dentro de Mim' },
  wp_lendario_chigiri: { kind: 'speed', value: 0.18, name: 'Pantera Carmesim' },
  wp_lendario_nagi: { kind: 'aerial', value: 30, name: 'Domínio Divino' },
  wp_lendario_barou: { kind: 'long_shot', value: 0.4, name: 'Rei da Zona de 29m' },
  wp_lendario_kunigami: { kind: 'shield', value: 0.2, name: 'Corpo de Ciborgue' },
  wp_mitico_shidou: { kind: 'power', value: 0.15, name: 'Big Bang' },
  wp_mitico_rin: { kind: 'curve', value: 15, name: 'Curva Destruidora' },
  wp_mitico_isagi_adapt: { kind: 'predator', value: 40, name: 'Olho do Predador' },
  wp_mitico_lorenzo: { kind: 'steal', value: 0.25, name: 'Devorador de Ás' },
  wp_wc_kaiser: { kind: 'keeper_beat', value: 0.25, name: 'Impacto Imperial' },
  wp_wc_sae: { kind: 'cooldown', value: 0.35, name: 'Gênio de Re Al' },
  wp_wc_loki: { kind: 'speed', value: 0.28, name: 'Godspeed' },
  wp_wc_noa: { kind: 'composure', value: 0.5, name: 'Máquina Racional' },
  wp_wc_lavinho: { kind: 'dribble', value: 18, name: 'Ginga Divina' },
  wp_wc_segredo_monstro: { kind: 'dribble', value: 20, name: 'O Monstro Não Dorme' },
  // Armas assinatura dos outros personagens (wp_char_<id>)
  wp_char_reo: { kind: 'copy', value: 1, name: 'Camaleão' },
  wp_char_charles: { kind: 'perfect_pass', value: 4, name: 'Passe Perfeito' },
  wp_char_otoya: { kind: 'predator', value: 25, name: 'Ninja Invisível' },
  wp_char_aryu: { kind: 'aerial', value: 22, name: 'Cabeçada Elegante' },
  wp_char_tokimitsu: { kind: 'shield', value: 0.18, name: 'Corpo Monstruoso' },
  wp_char_kiyora: { kind: 'steal', value: 0.12, name: 'Lateral Implacável' },
  wp_char_himizu: { kind: 'chem', value: 0.2, name: 'Parceiro Fiel' },
  wp_char_hiiragi: { kind: 'cooldown', value: 0.15, name: 'Cabeça Fria' },
  wp_char_nishioka: { kind: 'aerial', value: 15, name: 'Torre de Hokkaido' },
  wp_char_tanaka: { kind: 'stamina', value: 0.15, name: 'Cabeça de Batalha' },
  wp_char_shiguma: { kind: 'shield', value: 0.1, name: 'Ombro Firme' },
  wp_char_haiji: { kind: 'dribble', value: 5, name: 'Finta Rápida' },
  wp_char_ishikari: { kind: 'steal', value: 0.1, name: 'Bote Seco' },
  wp_char_endoji: { kind: 'predator', value: 20, name: 'Faro de Gol' },
  wp_char_yuzu: { kind: 'chem', value: 0.15, name: 'Tabela Amiga' },
  wp_char_tsunzaki: { kind: 'speed', value: 0.08, name: 'Pique de Ponta' },
  wp_char_sokura: { kind: 'stamina', value: 0.12, name: 'Lateral Incansável' },
  wp_char_aiku: { kind: 'steal', value: 0.22, name: 'Leitura do Capitão' },
  wp_char_sendo: { kind: 'keeper_beat', value: 0.1, name: 'Instinto Natural' },
  wp_char_darai: { kind: 'steal', value: 0.15, name: 'Muralha do Darai' },
  wp_char_neru: { kind: 'composure', value: 0.2, name: 'Sangue Frio' },
  wp_char_niou: { kind: 'steal', value: 0.15, name: 'Zaga de Ferro' },
  wp_char_fukaku: { kind: 'gk_wall', value: 0.15, name: 'Paredão' },
  wp_char_hayate: { kind: 'speed', value: 0.1, name: 'Vento' },
  wp_char_wakatsuki: { kind: 'stamina', value: 0.15, name: 'Motor do Meio' },
  wp_char_cho: { kind: 'dribble', value: 6, name: 'Corte Rápido' },
  wp_char_kitsunezato: { kind: 'chem', value: 0.2, name: 'Raposa Esperta' },
  wp_char_ness: { kind: 'chem', value: 0.3, name: 'Mágico do Kaiser' },
  wp_char_grim: { kind: 'speed', value: 0.08, name: 'Ponta Veloz' },
  wp_char_gesner: { kind: 'shield', value: 0.12, name: 'Corpo Alemão' },
  wp_char_birkenstock: { kind: 'steal', value: 0.12, name: 'Zagueiro Frio' },
  wp_char_ali: { kind: 'shield', value: 0.15, name: 'Volante Tanque' },
  wp_char_chris_prince: { kind: 'power', value: 0.18, name: 'Corpo Perfeito' },
  wp_char_agi: { kind: 'radar', value: 1.5, name: 'Analista de Química' },
  wp_char_teddy_knight: { kind: 'cooldown', value: 0.2, name: 'Capitão da Inglaterra' },
  wp_char_bunny: { kind: 'dribble', value: 10, name: 'Calcanhar Mágico' },
  wp_char_lara: { kind: 'composure', value: 0.25, name: 'Maestro Espanhol' },
  wp_char_snuffy: { kind: 'cooldown', value: 0.3, name: 'Sistema Perfeito' },
  wp_char_drago: { kind: 'shield', value: 0.18, name: 'Rocha Italiana' },
  wp_char_abdi: { kind: 'stamina', value: 0.18, name: 'Pulmão do Meio' },
  wp_char_luna: { kind: 'dribble', value: 12, name: 'Elegância de Re Al' },
  wp_char_blake: { kind: 'keeper_beat', value: 0.2, name: 'Bomba Inglesa' },
  wp_char_dada_silva: { kind: 'steal', value: 0.3, name: 'Muralha Brasileira' },
  wp_char_pablo: { kind: 'cooldown', value: 0.25, name: 'Cérebro Argentino' },
  wp_char_hugo: { kind: 'flow', value: 0.4, name: 'Ego Rosa' }
};

// O que a passiva faz, escrito para o jogador
window.describePassive = (p) => {
  if (!p) return '';
  const pct = (v) => `${Math.round(v * 100)}%`;
  switch (p.kind) {
    case 'speed': return `Corre ${pct(p.value)} mais rápido o tempo todo.`;
    case 'stamina': return `O fôlego gasta ${pct(p.value)} menos.`;
    case 'dribble': return `Drible e skills de drible com +${p.value}% de chance; o drible recarrega 25% mais rápido.`;
    case 'curve': return `Chute com curva (Q/E ou skill de curva) ganha +${p.value}% de acerto e engana muito mais o goleiro.`;
    case 'long_shot': return `Chute de longe perde ${pct(p.value)} menos precisão e sai mais forte.`;
    case 'aerial': return `Domina bolas até ${p.value} mais altas e alcança a bola solta de mais longe.`;
    case 'predator': return `Bola solta perto da área rival vem até você (alcance +${p.value} dentro da área).`;
    case 'keeper_beat': return `O goleiro rival defende ${pct(p.value)} menos os seus chutes.`;
    case 'steal': return `Carrinho e botes com +${pct(p.value)} de chance de roubar a bola.`;
    case 'shield': return `Os rivais têm ${pct(p.value)} menos chance de tirar a bola de você.`;
    case 'cooldown': return `Suas skills recarregam ${pct(p.value)} mais rápido.`;
    case 'flow': return `O Fluxo carrega ${pct(p.value)} mais rápido.`;
    case 'chem': return `A Reação Química carrega ${pct(p.value)} mais rápido.`;
    case 'power': return `Chutes e skills de chute ${pct(p.value)} mais fortes.`;
    case 'composure': return `Marcador em cima atrapalha ${pct(p.value)} menos o seu chute.`;
    case 'perfect_pass': return 'Seus passes nunca são cortados pelos rivais e saem mais rápidos.';
    case 'copy': return 'Quando um rival usa uma skill, você copia ela: aperte [V] para usar a cópia uma vez.';
    case 'radar': return 'Com a bola no pé, linhas brilham até os companheiros livres e seus passes saem mais rápidos.';
    case 'gk_wall': return `Seu goleiro defende ${pct(p.value)} mais chutes.`;
    default: return '';
  }
};

window.WEAPONS_DB.forEach((w) => {
  w.passive = window.WEAPON_PASSIVES[w.id] || { kind: 'stamina', value: 0.1, name: 'Fôlego Egoísta' };
});

// A arma salva no save é uma cópia antiga do objeto: a passiva vem sempre do banco pelo id
window.getWeaponPassive = (w) => (w ? (window.WEAPONS_DB.find((x) => x.id === w.id) || w).passive || null : null);

// ============================================================================
// GIRO DA SORTE (comprado na LOJA): nunca sai Comum nem Incomum e a chance de
// Lendário, Mítico e World Class é bem maior que no giro normal
// ============================================================================
window.LUCKY_CHANCES = { COMUM: 0, INCOMUM: 0, RARO: 40, EPICO: 28, LENDARIO: 18, MITICO: 9, WORLD_CLASS: 5 };

window.SHOP_ITEMS = [
  { id: 'spin_1', name: 'Giro', icon: '🎰', price: 250, spins: 1, desc: 'Um giro normal de Arma ou Fluxo.' },
  { id: 'spin_5', name: 'Pacote de 5 Giros', icon: '🎰', price: 1100, spins: 5, desc: '5 giros normais com desconto.' },
  { id: 'lucky_1', name: 'Giro da Sorte', icon: '🍀', price: 600, lucky: 1, desc: 'Nunca sai Comum nem Incomum. Muito mais chance de Lendário, Mítico e World Class.' },
  { id: 'lucky_5', name: 'Pacote de 5 Giros da Sorte', icon: '🍀', price: 2700, lucky: 5, desc: '5 Giros da Sorte com desconto.' }
];

// ============================================================================
// BANCO DE DADOS DE FLUXOS (FLOW STATES) - 7 RARIDADES, 25 FLUXOS
// Cada Fluxo tem UMA passiva própria (effect/effectDesc) que só vale enquanto ele
// está ativo [G]. Nada de "velocidade x1,45 / chute x1,5" (deixava tudo fácil
// demais): o efeito é uma mecânica diferente em cada um.
// fx = { tipo: valor } lidos pelo MatchEngine (passive(kind) soma armas + Fluxo):
//   composure, shield, steal, aerial, predator, dribble, radar, endless, gk_wall,
//   copy, long_shot, chem, curve, cooldown, perfect_pass  → os mesmos efeitos das armas
//   revenge      → depois de perder a bola, o próximo carrinho (5 s) é certeiro
//   dribble_stun → quem você dribla fica caído N vezes mais tempo
//   intercept    → raio em que você corta passes e chutes do rival
//   kaiser       → chute carregado no máximo: o goleiro não alcança
//   devour       → carrinho certeiro derruba por 3 s e soma 1,5 s ao Fluxo
//   refund       → quando o Fluxo acaba, a barra volta com N% carregada
//   dribble_cd   → multiplica a recarga do drible
//   first_shot   → o 1º chute no Fluxo não tem defesa
//   goal_extend  → cada gol seu no Fluxo soma N segundos
//   rival_slow   → rivais perto de você correm nessa fração da velocidade
//   rational     → chute livre (ninguém a 110) dentro da área: o goleiro não pega
//   tackle_stun  → quem leva o seu carrinho fica N vezes mais tempo no chão (O Olhar do Ego)
// Fluxos de Épico para cima têm cena própria ('flow_<id>' nos js/cine_fluxos_*.js).
// ============================================================================
window.FLOWS_DB = [
  // ---------------------------------------------------------------- COMUM
  {
    id: 'fl_comum_foco',
    name: 'Concentração de Jogo',
    rarity: 'COMUM',
    color: '#94a3b8',
    auraParticles: 'sparks',
    duration: 10,
    effect: 'Sangue Frio',
    effectDesc: 'marcação em cima não atrapalha mais o seu chute',
    fx: { composure: 0.8 },
    desc: 'Respiração focada: o barulho some e o zagueiro colado em você deixa de existir na hora de finalizar.'
  },
  {
    id: 'fl_comum_pulmao',
    name: 'Pulmão de Aço',
    rarity: 'COMUM',
    color: '#a3e635',
    auraParticles: 'sparks',
    duration: 12,
    effect: 'Fôlego Infinito',
    effectDesc: 'corre com SHIFT o Fluxo inteiro sem gastar fôlego',
    fx: { endless: 1 },
    desc: 'Você para de sentir o cansaço: o pique não acaba enquanto o Fluxo durar.'
  },
  {
    id: 'fl_comum_borracha',
    name: 'Reflexo de Borracha (Gagamaru)',
    rarity: 'COMUM',
    color: '#78716c',
    auraParticles: 'sparks',
    duration: 12,
    effect: 'Paredão',
    effectDesc: 'o seu goleiro defende muito mais chutes',
    fx: { gk_wall: 0.3 },
    desc: 'O corpo de borracha do Gagamaru contagia o time: o seu goleiro estica até onde não dava.'
  },
  // ---------------------------------------------------------------- INCOMUM
  {
    id: 'fl_incomum_adrenalina',
    name: 'Adrenalina de Sobrevivência',
    rarity: 'INCOMUM',
    color: '#22c55e',
    auraParticles: 'flames',
    duration: 11,
    effect: 'Revanche',
    effectDesc: 'quando te desarmam, o seu próximo carrinho (5 s) é certeiro',
    fx: { revenge: 1 },
    desc: 'O medo da eliminação vira fúria: quem tirar a bola de você devolve na hora.'
  },
  {
    id: 'fl_incomum_maestro',
    name: 'Olhar do Maestro (Hiori)',
    rarity: 'INCOMUM',
    color: '#22d3ee',
    auraParticles: 'sparks',
    duration: 11,
    effect: 'Linhas de Passe',
    effectDesc: 'linhas mostram quem está livre e os seus passes saem mais rápidos',
    fx: { radar: 2.5 },
    desc: 'O campo fica transparente, como o Hiori vê: cada companheiro livre ganha uma linha até ele.'
  },
  {
    id: 'fl_incomum_capitao',
    name: 'Leitura do Capitão (Aiku)',
    rarity: 'INCOMUM',
    color: '#64748b',
    auraParticles: 'flames',
    duration: 10,
    effect: 'Bote Certeiro',
    effectDesc: 'os seus carrinhos quase sempre roubam a bola',
    fx: { steal: 0.6 },
    desc: 'Você lê o atacante como o capitão da Sub-20: o carrinho chega no tempo exato.'
  },
  // ---------------------------------------------------------------- RARO
  {
    id: 'fl_raro_cacador',
    name: 'Olhos de Caçador Faminto',
    rarity: 'RARO',
    color: '#38bdf8',
    auraParticles: 'lightning',
    duration: 10,
    effect: 'Faro de Gol',
    effectDesc: 'bola solta perto da área rival vem parar no seu pé',
    fx: { predator: 70 },
    desc: 'Você sente o cheiro do gol: rebote, bola espirrada, cruzamento errado... tudo cai pra você.'
  },
  {
    id: 'fl_raro_muralha',
    name: 'Muralha do Coringa (Kunigami)',
    rarity: 'RARO',
    color: '#f97316',
    auraParticles: 'flames',
    duration: 11,
    effect: 'Corpo de Ferro',
    effectDesc: 'quase ninguém consegue te desarmar',
    fx: { shield: 0.6 },
    desc: 'Corpo de ferro do Kunigami: o zagueiro que tentar o bote quica em você.'
  },
  {
    id: 'fl_raro_ginga',
    name: 'Ginga do Monstro (Bachira)',
    rarity: 'RARO',
    color: '#facc15',
    auraParticles: 'petals',
    duration: 10,
    effect: 'Ginga',
    effectDesc: 'os seus dribles quase sempre passam',
    fx: { dribble: 35 },
    desc: 'O monstro dentro de você assume o controle: o marcador não sabe para que lado você vai.'
  },
  {
    id: 'fl_raro_camaleao',
    name: 'Camaleão (Reo)',
    rarity: 'RARO',
    color: '#c084fc',
    auraParticles: 'sparks',
    duration: 14,
    effect: 'Cópia',
    effectDesc: 'copia a skill do último rival que usou uma e solta ela com [V]',
    fx: { copy: 1 },
    desc: 'O talento do Reo: viu, copiou. A arma do rival vira sua até o Fluxo acabar.'
  },
  // ---------------------------------------------------------------- ÉPICO
  {
    id: 'fl_epico_rua',
    name: 'Fluxo de Rua Iluminado (Yukimiya)',
    rarity: 'EPICO',
    color: '#f59e0b',
    auraParticles: 'petals',
    duration: 11,
    effect: 'Rei do 1v1',
    effectDesc: 'quem você dribla fica caído o triplo do tempo',
    fx: { dribble_stun: 3 },
    desc: 'O caminho dourado do 1v1: cada marcador que você passa fica sentado no chão.'
  },
  {
    id: 'fl_epico_preguica',
    name: 'Domínio Preguiçoso (Nagi)',
    rarity: 'EPICO',
    color: '#e2e8f0',
    auraParticles: 'sparks',
    duration: 12,
    effect: 'Domínio',
    effectDesc: 'qualquer bola, alta ou forte, cai morta no seu pé',
    fx: { aerial: 45 },
    desc: 'Que preguiça... A bola do céu, o passe torto, o chutão: tudo morre no seu peito do pé.'
  },
  {
    id: 'fl_epico_xadrez',
    name: 'Leitura do Xadrez (Niko)',
    rarity: 'EPICO',
    color: '#818cf8',
    auraParticles: 'lightning',
    duration: 11,
    effect: 'Leitura',
    effectDesc: 'você corta os passes e chutes do rival que passam perto',
    fx: { intercept: 70 },
    desc: 'Três lances à frente, como o Niko: a bola do rival passa perto de você e já é sua.'
  },
  {
    id: 'fl_epico_passe',
    name: 'Passe Perfeito (Charles)',
    rarity: 'EPICO',
    color: '#fb7185',
    auraParticles: 'petals',
    duration: 12,
    effect: 'Passe Intocável',
    effectDesc: 'ninguém intercepta o seu passe e ele chega voando',
    fx: { perfect_pass: 5 },
    desc: 'O brinquedo do Charles: o passe faz curva, passa entre as pernas e só para no pé de quem você quis.'
  },
  // ---------------------------------------------------------------- LENDÁRIO
  {
    id: 'fl_lendario_rei',
    name: 'Relâmpago do Rei Tirano (Barou)',
    rarity: 'LENDARIO',
    color: '#ef4444',
    auraParticles: 'dark_lightning',
    duration: 11,
    effect: 'Rei da Zona',
    effectDesc: 'chute de longe sem perder precisão',
    fx: { long_shot: 0.9 },
    desc: 'O campo inteiro é a sua zona de tiro: de 30 metros a bola sai como se fosse da marca do pênalti.'
  },
  {
    id: 'fl_lendario_bigbang',
    name: 'Química Explosiva (Shidou)',
    rarity: 'LENDARIO',
    color: '#ec4899',
    auraParticles: 'flames',
    duration: 12,
    effect: 'Big Bang',
    effectDesc: 'a Reação Química carrega 4x mais rápido',
    fx: { chem: 3 },
    desc: 'As suas células explodem junto com as do time: a Reação Química [C] fica pronta num piscar.'
  },
  {
    id: 'fl_lendario_kaiser',
    name: 'Kaiser Impact (Kaiser)',
    rarity: 'LENDARIO',
    color: '#3b82f6',
    auraParticles: 'dark_lightning',
    duration: 10,
    effect: 'Impacto Imperial',
    effectDesc: 'chute carregado no máximo: o goleiro não alcança',
    fx: { kaiser: 1 },
    desc: 'O chute mais rápido do mundo: segure o chute até o fim da barra e a bola entra antes do goleiro pular.'
  },
  {
    id: 'fl_lendario_snuffy',
    name: 'Sistema Perfeito (Snuffy)',
    rarity: 'LENDARIO',
    color: '#a855f7',
    auraParticles: 'lightning',
    duration: 12,
    effect: 'Recarga Tática',
    effectDesc: 'as suas skills recarregam 3x mais rápido',
    fx: { cooldown: 2 },
    desc: 'O sistema do Snuffy: cada peça no lugar certo, cada skill pronta de novo antes do rival respirar.'
  },
  // ---------------------------------------------------------------- MÍTICO
  {
    id: 'fl_mitico_destruidor',
    name: 'Transe do Destruidor Abissal (Rin)',
    rarity: 'MITICO',
    color: '#14b8a6',
    auraParticles: 'abyss_chains',
    duration: 11,
    effect: 'Curva Destruidora',
    effectDesc: 'chute com curva (Q/E) fica quase indefensável',
    fx: { curve: 40 },
    desc: 'Língua de fora e instinto assassino: a bola faz a curva do Rin e o goleiro pula no vazio.'
  },
  {
    id: 'fl_mitico_godspeed',
    name: 'Velocidade Divina (Loki)',
    rarity: 'MITICO',
    color: '#fde047',
    auraParticles: 'lightning',
    duration: 10,
    effect: 'Arrancada Sem Fim',
    effectDesc: 'o drible quase não precisa recarregar',
    fx: { dribble_cd: 0.25 },
    desc: 'A aceleração do Loki: uma arrancada atrás da outra, sem tempo do rival se recuperar.'
  },
  {
    id: 'fl_mitico_lorenzo',
    name: 'Devorador de Ás (Don Lorenzo)',
    rarity: 'MITICO',
    color: '#a3a3a3',
    auraParticles: 'dark_lightning',
    duration: 11,
    effect: 'Devorar',
    effectDesc: 'quem você desarma fica 3 s no chão e o Fluxo dura mais',
    fx: { devour: 1, steal: 0.25 },
    desc: 'O zumbi da Ubers: cada ás que você desarma vira comida, e você fica com a energia dele.'
  },
  // SEGREDO (js/easter_eggs.js): fora da roleta; os 7 cliques no "BL" do canto liberam e
  // ele fica em "Fluxos secretos" na tela de Fluxos (botão EQUIPAR)
  {
    id: 'fl_mitico_olhar_ego',
    name: 'O Olhar do Ego (Segredo)',
    rarity: 'MITICO',
    secret: true,
    color: '#eab308',
    auraParticles: 'dark_lightning',
    duration: 11,
    effect: 'Sob o Olhar do Ego',
    effectDesc: 'quem chega perto de você fica lento e quem leva o seu carrinho demora o dobro para levantar',
    fx: { rival_slow: 0.6, tackle_stun: 2 },
    desc: 'O Ego está assistindo. Quem chega perto de você sente o peso do olhar dele e trava; quem cai no seu carrinho não consegue levantar.'
  },
  {
    id: 'fl_mitico_sae',
    name: 'Gênio Sem Pausa (Sae)',
    rarity: 'MITICO',
    color: '#be123c',
    auraParticles: 'sparks',
    duration: 11,
    effect: 'Gênio',
    effectDesc: 'quando o Fluxo acaba, a barra volta com 60% carregada',
    fx: { refund: 60 },
    desc: 'O gênio nunca desliga: o Fluxo apaga e já começa a acender de novo.'
  },
  // ---------------------------------------------------------------- WORLD CLASS
  {
    id: 'fl_wc_quatro_egos',
    name: 'Singularidade dos Quatro Egos',
    rarity: 'WORLD_CLASS',
    color: '#00f5d4',
    auraParticles: 'puzzle_galaxy',
    duration: 12,
    effect: 'Quatro Egos',
    effectDesc: 'o 1º chute no Fluxo não tem defesa e cada gol soma 6 s',
    fx: { first_shot: 1, goal_extend: 6 },
    desc: 'O estado divino da Final Mundial (Você, Sae, Loki e Hugo): o primeiro chute é gol escrito.'
  },
  {
    id: 'fl_wc_metavision',
    name: 'Metavision Absoluto',
    rarity: 'WORLD_CLASS',
    color: '#38bdf8',
    auraParticles: 'puzzle_galaxy',
    duration: 11,
    effect: 'Visão de Deus',
    effectDesc: 'rivais perto de você ficam em câmera lenta',
    fx: { rival_slow: 0.55, radar: 1 },
    desc: 'O campo inteiro vira um quebra-cabeça resolvido: você vê o lance antes, e o rival parece andar na água.'
  },
  {
    id: 'fl_wc_noa',
    name: 'Máquina Racional (Noel Noa)',
    rarity: 'WORLD_CLASS',
    color: '#e5e7eb',
    auraParticles: 'puzzle_galaxy',
    duration: 11,
    effect: 'Racional',
    effectDesc: 'chute livre dentro da área (ninguém a menos de 2 passos): o goleiro não pega',
    fx: { rational: 1 },
    desc: 'O número 1 do mundo: sem marcador por perto, dentro da área, não existe chance de errar.'
  }
];

// O Fluxo do save pelo id (o save guarda o objeto inteiro: assim o efeito novo vale
// também para quem girou antes da mudança)
window.resolveFlow = (fl) => (fl ? window.FLOWS_DB.find((x) => x.id === fl.id) || fl : null);

// Texto curto do que um Fluxo faz (catálogo, slot, roleta e banner do [G])
window.describeFlow = (fl) => {
  if (!fl) return '';
  if (fl.effects) return fl.effects.map((e) => `${e.effect}: ${e.effectDesc}`).join(' • ');
  return fl.effect ? `${fl.effect}: ${fl.effectDesc}` : fl.desc || '';
};

// Os Fluxos equipados (o 2º só na NEL em diante) viram um só ao apertar [G]: as duas
// passivas valem juntas (fx somados) e a duração é a do mais longo.
window.combineFlows = (flows) => {
  const list = flows.filter(Boolean).map(window.resolveFlow);
  if (!list.length) return null;
  if (list.length === 1) return Object.assign({}, list[0], { fx: Object.assign({}, list[0].fx) });
  const fx = {};
  list.forEach((f) =>
    Object.entries(f.fx || {}).forEach(([k, v]) => {
      // multiplicadores (menor = mais forte) ficam com o melhor; o resto soma
      if (k === 'rival_slow' || k === 'dribble_cd') fx[k] = Math.min(fx[k] ?? 1, v);
      else fx[k] = (fx[k] || 0) + v;
    })
  );
  const tiers = Object.keys(window.RARITY_TIERS);
  const best = list.slice().sort((a, b) => tiers.indexOf(b.rarity) - tiers.indexOf(a.rarity))[0];
  return {
    id: list.map((f) => f.id).join('+'),
    name: list.map((f) => f.name).join(' + '),
    rarity: best.rarity,
    color: best.color,
    colors: list.map((f) => f.color),
    duration: Math.max(...list.map((f) => f.duration || 10)),
    fx,
    effects: list.map((f) => ({ effect: f.effect, effectDesc: f.effectDesc })),
    desc: list.map((f) => f.desc).join(' ')
  };
};

// Evoluções despertadas ao chegar na Liga Neo Egoísta (NEL)
window.NEL_EVOLUTIONS = [
  {
    id: 'evo_metavision',
    name: 'METAVISION (Visão Meta 4D)',
    color: '#38bdf8',
    desc: 'Escaneia o campo constantemente com visão periférica e central: +35 Visão, +35 Posicionamento e previsão da trajetória da bola.',
    bonuses: { visao: 35, posicionamento: 35, compostura: 25 }
  },
  {
    id: 'evo_predator_eye',
    name: 'PREDATOR EYE (Olho do Predador)',
    color: '#ef4444',
    desc: 'Foca 100% nas micro-reações do goleiro rival para chutar no momento cego: +40 Finalizando, +35 Poder de Disparo e +25 Ego.',
    bonuses: { finalizando: 40, poderDisparo: 35, ego: 25 }
  },
  {
    id: 'evo_protagonism',
    name: 'EGO DO PROTAGONISTA MUNDIAL',
    color: '#facc15',
    desc: 'Combina leitura de egos com explosão física: +30 Velocidade, +30 Condução e +40 Ego.',
    bonuses: { velocidade: 30, conducao: 30, ego: 40 }
  }
];

