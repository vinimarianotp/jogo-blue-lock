// ============================================================================
// BLUE LOCK: EGOIST CAREER - LORE PROFUNDA EM CADA FASE, MAPAS DINÂMICOS E TREINOS
// • Cada fase tem seu próprio Mapa/Estádio (mapTheme) que muda com a história!
// • Cutscenes de Introdução, Diálogos Dinâmicos no Meio da Partida e Pós-Jogo!
// • script: gols garantidos da lore (cutscene de chute com a habilidade de quem
//   marca) e, se tiver climax, o placar que a partida precisa atingir (ex: 3 x 3
//   na Sub-20) antes da animação final. Detalhes em MatchEngine.checkScriptedGoals.
// • format: 'trio' = Torneio de Trios (você escolhe 2 companheiros, 3 contra 3).
// ============================================================================

// ============================================================================
// DEPOIS DO BLUE LOCK x SUB-20 DO JAPÃO (como no mangá, clima sombrio): a
// coletiva em que o Sae diz o SEU nome, o Rin destruído no vestiário e a aura
// dele virando seu rival mortal. Toca no pós-jogo do Cap. 6 e dá para rever
// (STORY_INTERLUDES.rin_rival_scene).
// ============================================================================
window.RIN_RIVAL_SCENE = [
  { dark: true, bg: 'auditorium', music: 'dread', speaker: 'NARRADOR', text: 'Naquela mesma noite. Sala de imprensa do Estádio Nacional. O Sae Itoshi senta na frente de cem câmeras como se estivesse sozinho.', mood: 'tense' },
  { speaker: 'REPÓRTER', text: '"Sae! O Blue Lock venceu a Sub-20. Teve algum jogador deles que te impressionou?"', mood: 'tense' },
  { cinematic: 'sae_interview' },
  { bg: 'locker_room', speaker: 'NARRADOR', text: 'Vestiário do Blue Lock. A festa já foi para os corredores. Só uma luz ficou acesa.', mood: 'tense' },
  { speaker: 'NARRADOR', text: 'O Rin está sentado no banco, sozinho, com a toalha cobrindo a cabeça. A camisa 10 do Blue Lock ainda encharcada de suor.', mood: 'tense' },
  { speaker: 'VOCÊ', text: '"...Rin. Eu precisava te falar uma coisa."', mood: 'normal' },
  { speaker: 'VOCÊ', text: '"Aquela bola que espirrou do seu choque com o Sae... Foi graças a você que eu entendi como a sorte funciona. Ela não cai do céu: ela cai pra quem já está esperando embaixo."', mood: 'ego' },
  { speaker: 'VOCÊ', text: '"Por isso aquele gol não foi só meu. Ele vale pra nós dois."', mood: 'ego' },
  { cinematic: 'rin_rival' },
  { speaker: 'RIN ITOSHI', text: '"Você me roubou o gol. Me roubou o olhar do meu irmão. E ainda vem me oferecer metade?"', mood: 'tense' },
  { speaker: 'RIN ITOSHI', text: '"Não esquece o que eu disse. A partir de hoje eu vivo pra uma coisa só: te destruir."', mood: 'tense' },
  { speaker: 'NARRADOR', text: 'Ele sai sem olhar para trás. No escuro do corredor, a sombra dele ainda parece se mexer sozinha.', mood: 'tense' },
  { speaker: 'VOCÊ', text: '(Rival mortal... Então tá, Rin. Vem.)', mood: 'ego' },
  { dark: false, music: 'none', speaker: 'NARRADOR', text: 'Na manhã seguinte, o Blue Lock acorda com uma notícia que muda tudo.', mood: 'tense' }
];

// ============================================================================
// DEPOIS DA FINAL DA COPA SUB-20 (daqui em diante tudo é sombrio): a entrada do
// Fox. Toca no pós-jogo da final e dá para rever (STORY_INTERLUDES.fox_arrival).
// ============================================================================
window.FOX_ARRIVAL = [
  // A entrada do Fox: o técnico da Inglaterra Sub-20 que vocês eliminaram
  { dark: true, music: 'dread', bg: 'bluelock_bunker', speaker: 'NARRADOR', text: 'Uma semana depois do título. Madrugada no campo vazio do Blue Lock. Você chuta sozinho, de novo e de novo.', mood: 'tense' },
  { cinematic: 'fox_entrance' },
  { speaker: 'FOX', text: '"Hehehe... Boa noite, campeão. Desculpa as luzes. Eu gosto de conversar no escuro."', mood: 'ego' },
  { speaker: 'VOCÊ', text: '"...Você é o técnico da Inglaterra Sub-20. A gente eliminou vocês."', mood: 'tense' },
  { speaker: 'FOX', text: '"Eliminou. Humilhou. Na frente da minha federação inteira. Me demitiram na manhã seguinte. Hehehe... e eu nunca me senti tão livre."', mood: 'ego' },
  { speaker: 'FOX', text: '"Eu vi a sua final inteira. Vi um monstro acordando em você quando o jogo parecia perdido... e vi o Ego colocar uma coleira nele."', mood: 'ego' },
  { speaker: 'FOX', text: '"O Ego cria egoístas. Eu crio coisa pior: jogadores que os outros têm MEDO de marcar. E eu não ligo pra quantos quebram no caminho."', mood: 'ego' },
  { speaker: 'VOCÊ', text: '(Esse sorriso... nenhum pedaço dele está brincando.)', mood: 'tense' },
  {
    id: 'fox_offer',
    speaker: 'FOX',
    text: '"Então? Vai continuar chutando sozinho no escuro... ou deixa a raposa abrir a jaula?"',
    mood: 'ego',
    choices: [
      {
        label: '"Me ensina."',
        effects: { stats: { ego: 3 } },
        reply: [{ speaker: 'FOX', text: '"Hehehe! Quatro da manhã. Atrasa um minuto e eu escolho outro garoto pra quebrar no seu lugar."', mood: 'happy' }]
      },
      {
        label: '"Por que eu confiaria em você?"',
        effects: { stats: { visao: 3 } },
        reply: [{ speaker: 'FOX', text: '"Não confia. Ninguém confia numa raposa. Mas você vai vir... porque o monstro quer vir."', mood: 'ego' }]
      }
    ]
  },
  { speaker: 'NARRADOR', text: 'Quando você olha de novo, a arquibancada está vazia. Só ficou o cheiro de café frio e uma risada ecoando no corredor.', mood: 'tense' },
  { speaker: 'NARRADOR', text: 'A Copa do Mundo Sub-20 acabou. O que vem agora não tem mais nada de brincadeira.', mood: 'ego' },
  { music: 'none', speaker: 'NARRADOR', text: 'CONTINUA...', mood: 'ego' }
];

window.CAREER_CHAPTERS = [
  {
    id: 'ch0_prologue',
    chapterNumber: 0,
    mapTheme: 'school_sunset',
    era: 'PRÓLOGO — ENSINO MÉDIO',
    teamName: 'Colégio Ichinan',
    homeColor: '#0369a1',
    homeSecondary: '#ffffff',
    title: 'Final Regional do Ensino Médio: O Dilema do Passe',
    opponentName: 'Colégio Matsukaze Kokuo',
    opponentColor: '#ffffff',
    opponentSecondary: '#2563eb',
    targetGoals: 1,
    matchDuration: 90,
    difficulty: 1,
    unlocksBlueLock: true,
    unlocksNEL: false,
    rewardCoins: 120,
    rewardSpins: 2,
    rewardSP: 2,
    // Seus colegas do Ichinan (o Tada é o 1º) contra o Matsukaze Kokuo do craque Ryosuke Kira
    teammateIds: ['tada', 'gen_ichinan_a', 'gen_ichinan_b', 'gk_ichinan'],
    opponentIds: ['kira', 'gen_matsukaze_a', 'gen_matsukaze_b', 'gen_matsukaze_c', 'gk_matsukaze'],
    loreSummary: 'Último minuto da Final das Eliminatórias Nacionais no campo do colégio ao pôr do sol, contra o Matsukaze Kokuo do craque Ryosuke Kira. Você arranca rumo à área. Seu amigo Tada pede o passe livre: se você tocar para ele, ele perde o gol na trave e seu colégio é eliminado!',
    introCutscene: [
      { bg: 'school_sunset', speaker: 'NARRADOR', text: 'FINAL REGIONAL DO ENSINO MÉDIO — CAMPO DO COLÉGIO AO PÔR DO SOL (88\').', mood: 'tense' },
      { speaker: 'TREINADOR DO COLÉGIO', text: '"Lembrem-se! Futebol é um esporte coletivo! Um por todos e todos por um! Não joguem sozinhos!"', mood: 'normal' },
      { speaker: 'RYOSUKE KIRA', text: '"(o camisa 10 do Matsukaze Kokuo, sorrindo) Bom jogo, Ichinan. Mas a vaga no Nacional é nossa."', mood: 'ego' },
      { speaker: 'TADA (SEU AMIGO)', text: '"Bora! Só falta 1 minuto! Se você pegar a bola na área, toca pra mim que eu tô livre na direita!"', mood: 'urgent' },
      { speaker: 'VOCÊ', text: '(Meu coração está disparado... Eu quero ir para o Nacional e ser o melhor atacante do Japão!)', mood: 'ego' }
    ],
    midMatchLore: {
      triggerTime: 72,
      lines: [
        { speaker: 'TADA (SEU AMIGO)', text: '"AQUI! PASSA PRA MIM! O GOLEIRO TÁ FECHANDO O SEU ÂNGULO!"', mood: 'urgent' }
      ]
    },
    // A noite depois da eliminação (toca depois da animação da trave, antes do auditório do Cap. 1).
    // when: 'pass' | 'shoot' = a fala só aparece se você tocou pro Tada / chutou sozinho
    postMatchCutscene: [
      { bg: 'night_home', speaker: 'NARRADOR', text: 'Naquela noite você não consegue dormir. O último lance. O apito final. O vestiário em silêncio.', mood: 'tense' },
      { when: 'pass', speaker: 'VOCÊ', text: '(Eu estava na cara do gol... e toquei. Se eu tivesse chutado, será que a gente estaria no Nacional?)', mood: 'tense' },
      { when: 'shoot', speaker: 'VOCÊ', text: '(Eu chutei sozinho e não entrou. Mas por algum motivo... eu não me arrependo de ter tentado.)', mood: 'tense' },
      { speaker: 'NARRADOR', text: 'O celular vibra. É o Tada.', mood: 'normal' },
      { when: 'pass', speaker: 'TADA (NO CELULAR)', text: '"Cara... desculpa. Você confiou em mim e eu chutei de canela. Na próxima vez que estiver na cara do gol... não toca pra ninguém. Nem pra mim."', mood: 'tense' },
      { when: 'shoot', speaker: 'TADA (NO CELULAR)', text: '"Eu tava livre, sabia? ...Mas eu vi a sua cara quando você chutou. Você queria aquilo mais do que todo mundo em campo."', mood: 'tense' },
      { speaker: 'NARRADOR', text: 'Na manhã seguinte, um envelope preto chega na sua casa. "União Japonesa de Futebol — Convocação: Projeto de Fortalecimento Sub-18."', mood: 'tense' },
      { speaker: 'VOCÊ', text: '"...Eu vou."', mood: 'ego' }
    ]
  },
  {
    id: 'ch1_first_selection_x_y',
    chapterNumber: 1,
    mapTheme: 'bluelock_bunker',
    era: '1ª SELEÇÃO — BUNKER SUBTERRÂNEO PRÉDIO 5',
    teamName: 'Time Z (Blue Lock)',
    title: 'A Estreia no Bunker: Time Z vs Time X (Shouei Barou)',
    opponentName: 'Time X (Shouei Barou, o Rei)',
    homeColor: '#1e40af',
    homeSecondary: '#38bdf8',
    opponentColor: '#111827',
    opponentSecondary: '#dc2626',
    targetGoals: 3,
    matchDuration: 100,
    difficulty: 3,
    unlocksBlueLock: true,
    unlocksNEL: false,
    rewardCoins: 160,
    rewardSpins: 2,
    rewardSP: 3,
    // O Time Z como no mangá (Raichi e Igarashi são seus companheiros; o Iemon é o goleiro)
    teammateIds: ['bachira', 'kunigami', 'raichi', 'iemon'],
    opponentIds: ['barou', 'gen_teamx_a', 'gen_teamx_b', 'gen_teamx_c', 'gk_teamx'],
    scoreLabels: { home: 'TIME Z', away: 'TIME X' },
    // No mangá o Time Z é atropelado na estreia. Aqui dá para vencer (o Barou marca pelo
    // menos dois), e a história muda: barou_king (derrota) ou barou_king_win (vitória)
    script: {
      goals: [
        { team: 'away', shooterId: 'barou', deadline: 84 },
        { team: 'away', shooterId: 'barou', deadline: 48 }
      ]
    },
    // Perdendo, a história segue como no mangá
    // Empate não é a vitória da cena alternativa (é derrota, como no mangá)
    drawIsWin: false,
    advanceOnLoss: true,
    loreSummary: 'Trancado no Bunker Subterrâneo do Prédio 5 depois do pega-pega do Quarto Z, o Time Z estreia na 1ª Seleção contra o Time X do "Rei" Shouei Barou, que atravessa o campo sozinho e não passa a bola para ninguém. Como no mangá, essa estreia é um atropelo.',
    introCutscene: [
      { bg: 'bluelock_bunker', speaker: 'JINPACHI EGO', text: '"Bem-vindos ao Prédio 5 do Blue Lock. Aqui vocês estão no fundo da cadeia alimentar: o Time Z."', mood: 'ego' },
      { speaker: 'MEGURU BACHIRA', text: '"Hahaha! Eu ouvi a voz do monstro dentro de você no jogo de pega-pega! Quando quiser a bola na partida, é só apertar [R] que eu te passo!"', mood: 'happy' },
      { speaker: 'RENSUKE KUNIGAMI', text: '"E se eles tentarem passar pela gente, aperte [F] para dar o carrinho e roubar a bola na marra!"', mood: 'tense' },
      { speaker: 'JINGO RAICHI', text: '"Que Rei o quê! Hoje quem manda no campo é o Raichi!"', mood: 'ego' },
      { speaker: 'SHOUEI BAROU', text: '"Onze idiotas correndo atrás de uma bola... Abram caminho, porque no campo EU sou o Rei!"', mood: 'ego' }
    ],
    midMatchLore: {
      triggerTime: 55,
      lines: [
        { speaker: 'SHOUEI BAROU', text: '"Saiam da frente, plebeus. Assistam o Rei atravessar o campo." *ele corta em zigue-zague por três marcadores do Time Z*', mood: 'ego' },
        { speaker: 'VOCÊ', text: '(Ele não passa a bola nem quando está cercado... Isso é um ego de verdade.)', mood: 'tense' }
      ]
    },
    // Fora do mangá: você derrubou o Rei na estreia
    postMatchCutscene: [
      { cinematic: 'barou_king_win' },
      { bg: 'bluelock_room', speaker: 'JINPACHI EGO', text: '"Hehe... o Time Z derrubou o Rei na estreia. Não se iludam: uma vitória com sorte não é uma ARMA. Descubram o que torna vocês únicos!"', mood: 'ego' },
      { speaker: 'RENSUKE KUNIGAMI', text: '"Você viu a cara do Barou? Ele nunca vai esquecer isso."', mood: 'happy' },
      { speaker: 'VOCÊ', text: '(Ele me olhou com ódio. ...E eu gostei.)', mood: 'ego' },
      { speaker: 'MEGURU BACHIRA', text: '"O próximo é o Time Y. Dizem que o Niko lê o jogo inteiro antes de começar."', mood: 'tense' }
    ],
    // Como no mangá: o Rei atropela o Time Z
    lossCutscene: [
      { cinematic: 'barou_king' },
      { bg: 'bluelock_room', speaker: 'NARRADOR', text: 'Quarto Z. Ninguém fala. A estreia acabou, e o Rei nem suou.', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"Perderam. Ótimo. Agora vocês sabem o que é um ego de verdade. Sem uma ARMA reproduzível, vocês são ração dos que têm uma."', mood: 'ego' },
      { speaker: 'RENSUKE KUNIGAMI', text: '"Ainda tem jogo. Se a gente vencer os próximos, o Time Z sobrevive."', mood: 'tense' },
      { speaker: 'VOCÊ', text: '(Sem talento nenhum... Então eu vou achar a minha arma. Nem que seja no último segundo.)', mood: 'ego' },
      { speaker: 'MEGURU BACHIRA', text: '"O próximo é o Time Y. Dizem que o Niko lê o jogo inteiro antes de começar."', mood: 'tense' }
    ]
  },
  {
    // 1ª SELEÇÃO, JOGO 2: o primeiro gosto da vitória (o Niko de joelhos)
    id: 'ch1b_team_y',
    chapterNumber: 2,
    mapTheme: 'bluelock_bunker',
    era: '1ª SELEÇÃO — BUNKER SUBTERRÂNEO PRÉDIO 5',
    extraForOldSaves: true,
    teamName: 'Time Z (Blue Lock)',
    title: 'O Gosto da Vitória: Time Z vs Time Y (Ikki Niko)',
    opponentName: 'Time Y (Ikki Niko)',
    homeColor: '#1e40af',
    homeSecondary: '#38bdf8',
    opponentColor: '#b91c1c',
    opponentSecondary: '#0a0a0a',
    targetGoals: 2,
    matchDuration: 100,
    difficulty: 2,
    unlocksBlueLock: true,
    unlocksNEL: false,
    rewardCoins: 170,
    rewardSpins: 2,
    rewardSP: 3,
    teammateIds: ['bachira', 'kunigami', 'igarashi', 'iemon'],
    opponentIds: ['niko', 'okawa', 'gen_teamy_a', 'gen_teamy_b', 'gk_teamy'],
    scoreLabels: { home: 'TIME Z', away: 'TIME Y' },
    // Como no mangá, o Okawa marca no contra-ataque do Niko. Vencendo, toca a cena do seu
    // gol da vitória com o Niko de joelhos (ego_victory)
    script: {
      goals: [{ team: 'away', shooterId: 'okawa', deadline: 74 }]
    },
    loreSummary: 'Depois da estreia contra o Barou, o Time Z precisa vencer. O Time Y do estrategista Ikki Niko se fecha atrás e mata no contra-ataque. Para ganhar, você vai ter que ler o jogo um passo depois da leitura dele.',
    introCutscene: [
      { bg: 'bluelock_bunker', speaker: 'IKKI NIKO', text: '"Defesa e contra-ataque. Vocês correm, a gente pensa. Já calculei todos os seus passes."', mood: 'tense' },
      { speaker: 'RENSUKE KUNIGAMI', text: '"Só os dois primeiros do prédio passam. Cada jogo vale a vida do Time Z. Hoje não tem erro!"', mood: 'tense' },
      { speaker: 'VOCÊ', text: '(Ele pensa um passo à frente... Então eu tenho que pensar um passo depois dele.)', mood: 'ego' }
    ],
    midMatchLore: {
      triggerTime: 52,
      lines: [
        { speaker: 'IKKI NIKO', text: '"Vocês acham que correr vence tática? Eu já li todos os seus passos!"', mood: 'tense' },
        { speaker: 'VOCÊ', text: '"Se você leu o meu passo anterior, eu vou evoluir agora mesmo e destruir a sua leitura!"', mood: 'ego' }
      ]
    },
    postMatchCutscene: [
      { cinematic: 'ego_victory' },
      { bg: 'bluelock_room', speaker: 'IKKI NIKO', text: '"...Eu tinha calculado tudo. Até você. Como?"', mood: 'tense' },
      { speaker: 'MEGURU BACHIRA', text: '"Ei... você tá sorrindo. Eu nunca vi essa sua cara."', mood: 'happy' },
      { speaker: 'VOCÊ', text: '(Vencer é bom demais. Eu quero sentir isso de novo. E de novo.)', mood: 'ego' },
      { speaker: 'JINPACHI EGO', text: '"Isso! Esse prazer de devorar o outro é a primeira ARMA de um atacante. Não larguem dela."', mood: 'ego' },
      { speaker: 'HYOMA CHIGIRI', text: '"...O próximo é o Time W. Os gêmeos Wanima jogavam comigo antes da lesão."', mood: 'tense' }
    ]
  },
  {
    // 1ª SELEÇÃO, JOGO 3: a traição do Kuon e o Chigiri vencendo o medo do joelho (4 x 4)
    id: 'ch1c_team_w',
    chapterNumber: 3,
    mapTheme: 'bluelock_bunker',
    era: '1ª SELEÇÃO — BUNKER SUBTERRÂNEO PRÉDIO 5',
    extraForOldSaves: true,
    teamName: 'Time Z (Blue Lock)',
    title: 'A Traição e o Joelho: Time Z vs Time W (Gêmeos Wanima)',
    opponentName: 'Time W (Junichi & Keisuke Wanima)',
    homeColor: '#1e40af',
    homeSecondary: '#38bdf8',
    opponentColor: '#14532d',
    opponentSecondary: '#f8fafc',
    // O 4 x 4 do mangá conta como sobrevivência (empate com 4 gols = meta batida)
    targetGoals: 4,
    matchDuration: 105,
    difficulty: 3,
    unlocksBlueLock: true,
    unlocksNEL: false,
    rewardCoins: 180,
    rewardSpins: 2,
    rewardSP: 3,
    teammateIds: ['chigiri', 'kuon', 'bachira', 'iemon'],
    opponentIds: ['wanima_junichi', 'wanima_keisuke', 'gen_teamw_a', 'gen_teamw_b', 'gk_teamw'],
    scoreLabels: { home: 'TIME Z', away: 'TIME W' },
    // Os Wanima marcam com as jogadas que o Kuon entregou (três gols garantidos) e, no fim,
    // o Chigiri corre: um gol extra dele em qualquer placar (chigiri_sprint). Dá para vencer;
    // o 4 x 4 do mangá também conta como sobrevivência
    script: {
      goals: [
        { team: 'away', shooterId: 'wanima_junichi', deadline: 90 },
        { team: 'away', shooterId: 'wanima_keisuke', deadline: 62 },
        { team: 'away', shooterId: 'wanima_junichi', deadline: 38 },
        { team: 'home', shooterId: 'chigiri', deadline: 24, bonus: true, sakuga: 'chigiri_sprint' }
      ]
    },
    // Perdendo, a história segue (o Time Z ainda tem o jogo contra o Time V)
    advanceOnLoss: true,
    loreSummary: 'O Time W dos gêmeos Wanima parece saber todas as jogadas ensaiadas do Time Z. Alguém está passando as informações. E o Chigiri, o mais rápido do prédio, ainda não corre: tem medo de romper o joelho de novo.',
    introCutscene: [
      { bg: 'bluelock_bunker', speaker: 'JUNICHI WANIMA', text: '"Olha só, o Chigiri! O ex-velocista que parou de correr."', mood: 'ego' },
      { speaker: 'KEISUKE WANIMA', text: '"Relaxa, Time Z. A gente já sabe tudo o que vocês vão fazer hoje."', mood: 'ego' },
      { speaker: 'HYOMA CHIGIRI', text: '"...Não olhem pra mim. Eu jogo parado. É só um joelho."', mood: 'tense' },
      { speaker: 'WATARU KUON', text: '"Foco no plano, pessoal. Do jeito que a gente ensaiou."', mood: 'normal' }
    ],
    midMatchLore: {
      triggerTime: 60,
      lines: [
        { speaker: 'NARRADOR', text: 'Intervalo. O Time W leu todas as jogadas ensaiadas, uma por uma.', mood: 'tense' },
        { cinematic: 'kuon_betrayal' },
        { speaker: 'HYOMA CHIGIRI', text: '(Se eu continuar parado... o Time Z morre aqui. E eu morro junto.)', mood: 'tense' }
      ]
    },
    postMatchCutscene: [
      { bg: 'bluelock_room', speaker: 'HYOMA CHIGIRI', text: '"Eu corri. O joelho aguentou. ...Eu ainda sou o mais rápido daqui."', mood: 'happy' },
      { speaker: 'RENSUKE KUNIGAMI', text: '"Com traidor e tudo, o Time Z ainda respira."', mood: 'normal' },
      { speaker: 'JINPACHI EGO', text: '"Wataru Kuon: o Time W não o quis, e o Time Z não confia mais em você. Egoísmo sem gol não é arma. É só traição."', mood: 'ego' },
      { speaker: 'MEGURU BACHIRA', text: '"Agora só falta o Time V. O Nagi e o Reo nunca perderam. Se a gente perder, o Time Z inteiro tá fora."', mood: 'tense' }
    ],
    lossCutscene: [
      { bg: 'bluelock_room', speaker: 'HYOMA CHIGIRI', text: '"Eu corri... tarde demais. Mas o joelho aguentou. Eu ainda sou o mais rápido daqui."', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"Wataru Kuon: o Time W não o quis, e o Time Z não confia mais em você. Egoísmo sem gol não é arma. É só traição."', mood: 'ego' },
      { speaker: 'RENSUKE KUNIGAMI', text: '"Ainda dá. Se a gente vencer o Time V, o Time Z sobrevive."', mood: 'tense' },
      { speaker: 'MEGURU BACHIRA', text: '"O Nagi e o Reo nunca perderam. Vai ser tudo ou nada."', mood: 'tense' }
    ]
  },
  {
    id: 'ch2_first_selection_v',
    chapterNumber: 4,
    mapTheme: 'bluelock_bunker',
    era: '1ª SELEÇÃO — DECISÃO DO PRÉDIO 5',
    teamName: 'Time Z Despertado',
    title: 'Tudo ou Nada no Bunker: Time Z vs Invicto Time V (Nagi, Reo & Zantetsu)',
    opponentName: 'Time V (Seishiro Nagi, Reo Mikage & Zantetsu)',
    homeColor: '#1e40af',
    homeSecondary: '#38bdf8',
    opponentColor: '#f8fafc',
    opponentSecondary: '#7e22ce',
    targetGoals: 3,
    matchDuration: 105,
    difficulty: 3,
    // Seu 1º gol vira a cena do despertar: o chute direto que derrubou o Time V
    firstGoalSakuga: 'first_selection_awakening',
    unlocksBlueLock: true,
    unlocksNEL: false,
    rewardCoins: 200,
    rewardSpins: 2,
    rewardSP: 3,
    teammateIds: ['bachira', 'kunigami', 'chigiri', 'gagamaru'],
    opponentIds: ['nagi', 'reo', 'zantetsu', 'tsunzaki', 'gk_teamv'],
    loreSummary: 'O confronto final para escapar da eliminação no Prédio 5! O trio invicto Seishiro Nagi, Reo Mikage e Zantetsu Tsurugi lidera o Time V.',
    introCutscene: [
      { bg: 'bluelock_bunker', speaker: 'REO MIKAGE', text: '"O Nagi começou a jogar futebol há seis meses e já é um gênio absoluto. Vocês não vão nem encostar na bola."', mood: 'ego' },
      { speaker: 'SEISHIRO NAGI', text: '"Reo, se a gente fizer 3 gols rápido eu posso voltar a jogar no celular?"', mood: 'normal' },
      { speaker: 'HYOMA CHIGIRI', text: '"Contra os Wanima eu voltei a correr. Hoje ninguém me alcança. Nem o Time V."', mood: 'ego' }
    ],
    midMatchLore: {
      triggerTime: 50,
      lines: [
        { speaker: 'SEISHIRO NAGI', text: '"Pela primeira vez na minha vida... eu tô sentindo que o futebol pode ser divertido! Vem pra cima!"', mood: 'ego' }
      ]
    },
    postMatchCutscene: [
      { speaker: 'SEISHIRO NAGI', text: '"...Perdi. Que estranho. Isso me irrita. Pela primeira vez na vida eu QUERO ganhar."', mood: 'tense' },
      { speaker: 'REO MIKAGE', text: '"Nagi...?"', mood: 'tense' },
      { speaker: 'HYOMA CHIGIRI', text: '"Dois jogos correndo e o joelho inteiro. Eu tô de volta de verdade."', mood: 'happy' },
      { speaker: 'JINPACHI EGO', text: '"O Time Z sobreviveu. Parabéns aos sobreviventes da Primeira Seleção. Agora o verdadeiro inferno individual começa: a Segunda Seleção!"', mood: 'ego' }
    ]
  },
  {
    // 2ª SELEÇÃO: o teste contra o BLUE LOCK MAN, o Nagi largando o Reo e o 3 x 3 contra o
    // Top 3. No mangá o seu trio perde e o Bachira vai com o Rin; aqui dá para vencer (e o
    // Bachira vai mesmo assim, por vontade própria)
    id: 'ch2b_second_selection',
    chapterNumber: 5,
    mapTheme: 'bluelock_holo',
    era: '2ª SELEÇÃO — A CÂMARA DE TREINO',
    interlude: ['bluelock_man_test', 'nagi_choice'],
    extraForOldSaves: true,
    teamName: 'Seu Trio (Você, Bachira & Nagi)',
    title: '2ª Seleção: 3 contra 3 diante do Top 3 (Rin, Aryu & Tokimitsu)',
    opponentName: 'Top 3 do Blue Lock (Rin Itoshi, Jyubei Aryu & Aoshi Tokimitsu)',
    homeColor: '#f8fafc',
    homeSecondary: '#2563eb',
    opponentColor: '#1e1b4b',
    opponentSecondary: '#e11d48',
    // 3 contra 3 com goleiros holográficos (o mesmo campo do Torneio de Trios)
    threeVsThree: true,
    targetGoals: 3,
    matchDuration: 95,
    difficulty: 5,
    unlocksBlueLock: true,
    unlocksNEL: false,
    rewardCoins: 230,
    rewardSpins: 2,
    rewardSP: 4,
    teammateIds: ['bachira', 'nagi'],
    opponentIds: ['rin', 'aryu', 'tokimitsu'],
    scoreLabels: { home: 'SEU TRIO', away: 'TOP 3' },
    // O Rin marca pelo menos dois (o Top 1 não perdoa)
    script: {
      goals: [
        { team: 'away', shooterId: 'rin', deadline: 76 },
        { team: 'away', shooterId: 'rin', deadline: 34 }
      ]
    },
    // Empate não é a vitória da cena alternativa (é derrota, como no mangá)
    drawIsWin: false,
    advanceOnLoss: true,
    loreSummary: 'Na câmara branca da 2ª Seleção, quem perde entrega um jogador para quem ganha. Você, o Bachira e o Nagi (que largou o Reo para jogar com você) encaram o Top 3 do Blue Lock: Rin Itoshi, Jyubei Aryu e Aoshi Tokimitsu.',
    introCutscene: [
      { bg: 'bluelock_holo', speaker: 'JINPACHI EGO', text: '"Segunda fase: times de três. Quem perde entrega um jogador para quem ganhou. Escolham bem quem vocês não querem perder."', mood: 'ego' },
      { speaker: 'MEGURU BACHIRA', text: '"Hehe... o Rin. O monstro dele é o mais barulhento que eu já ouvi."', mood: 'happy' },
      { speaker: 'SEISHIRO NAGI', text: '"Que saco... mas eu larguei o Reo pra isso. Então tem que valer."', mood: 'normal' },
      { speaker: 'RIN ITOSHI', text: '"Vocês três juntos não somam um de mim."', mood: 'tense' }
    ],
    midMatchLore: {
      triggerTime: 50,
      lines: [
        { speaker: 'JYUBEI ARYU', text: '"Que trio sem glamour... Vou mostrar o que é beleza no futebol."', mood: 'ego' },
        { speaker: 'VOCÊ', text: '(O Rin vê o campo inteiro. Se eu quiser vencer, tenho que ver mais do que ele.)', mood: 'ego' }
      ]
    },
    // Fora do mangá: vocês venceram o Top 3, mas o Bachira escolhe ir com o Rin
    postMatchCutscene: [
      { cinematic: 'rin_takes_bachira_win' },
      { bg: 'bluelock_holo', speaker: 'SEISHIRO NAGI', text: '"A gente ganhou... e mesmo assim perdeu um. Que jogo estranho."', mood: 'tense' },
      { speaker: 'VOCÊ', text: '(Vai, Bachira. Da próxima vez que a gente se encontrar, eu vou ser o monstro que você quer seguir.)', mood: 'ego' }
    ],
    // Como no mangá: o Top 3 vence e leva o Bachira
    lossCutscene: [
      { cinematic: 'rin_takes_bachira' },
      { bg: 'bluelock_holo', speaker: 'SEISHIRO NAGI', text: '"...Ele foi mesmo. Que saco. Agora somos só nós dois."', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"Quem perdeu fica mais forte... ou some. Encontrem novos parceiros e sigam."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '(Eu vou buscar você, Bachira. E vou passar por cima do Rin pra isso.)', mood: 'ego' }
    ]
  },
  {
    id: 'ch3_second_selection_world5',
    chapterNumber: 6,
    mapTheme: 'bluelock_holo',
    era: '2ª SELEÇÃO — CÂMARA HOLOGRÁFICA & WORLD 5',
    // Antes do jogo: você devora o Barou e sobe para o time do Rin (STORY_INTERLUDES.barou_devour)
    interlude: 'barou_devour',
    teamName: 'Primeiros Aprovados da 2ª Seleção',
    title: 'O Choque Contra o Top 5 Mundial: Blue Lock vs World Five',
    opponentName: 'World Five (Loki, Luna, Blake, Dada Silva & Pablo)',
    homeColor: '#0f2942',
    homeSecondary: '#38bdf8',
    opponentColor: '#ffffff',
    opponentSecondary: '#eab308',
    targetGoals: 3,
    matchDuration: 105,
    difficulty: 4,
    unlocksBlueLock: true,
    unlocksNEL: false,
    rewardCoins: 240,
    rewardSpins: 2,
    rewardSP: 4,
    // Como no mangá: o primeiro grupo a passar (você, Rin, Bachira, Aryu e Tokimitsu)
    teammateIds: ['rin', 'bachira', 'aryu', 'tokimitsu'],
    opponentIds: ['loki', 'luna', 'blake', 'dada_silva', 'pablo'],
    scoreLabels: { home: 'BLUE LOCK', away: 'WORLD 5' },
    // No mangá o Rin abre o placar e o World Five vira para 5 x 1. Aqui eles marcam pelo
    // menos três (Loki, Luna e Blake), mas dá para vencer
    script: {
      goals: [
        { team: 'home', shooterId: 'rin', deadline: 92 },
        { team: 'away', shooterId: 'loki', deadline: 76 },
        { team: 'away', shooterId: 'luna', deadline: 54 },
        { team: 'away', shooterId: 'blake', deadline: 30 }
      ]
    },
    loreSummary: 'Depois de devorar o Barou, o Rin escolhe você para o time dele, e o Bachira está lá também. O primeiro grupo a passar da 2ª Seleção encara os 5 craques mundiais na Câmara Holográfica: Julian Loki, Leonardo Luna, Adam Blake, Dada Silva e Pablo Cavazos. No mangá, só o Rin e o Shidou conseguem marcar contra eles.',
    introCutscene: [
      { speaker: 'MEGURU BACHIRA', text: '"Hehe! Eu disse que a gente ia se encontrar de novo!"', mood: 'happy' },
      { speaker: 'RIN ITOSHI', text: '"Não fique no meu caminho. Quem perde aqui tem a carreira destruída."', mood: 'tense' },
      { speaker: 'LEONARDO LUNA', text: '"Então esses são os garotos do projeto japonês? Vamos dar uma aula gratuita de futebol mundial."', mood: 'ego' },
      { speaker: 'JULIAN LOKI', text: '"Prazer, sou Julian Loki, da França. Tenho 17 anos como vocês. Vamos fazer uma boa partida."', mood: 'ego' }
    ],
    midMatchLore: {
      triggerTime: 55,
      lines: [
        { speaker: 'JULIAN LOKI', text: '"Eu vejo uma brecha na sua defesa. Com a minha aceleração Godspeed, já estou na cara do gol!"', mood: 'ego' }
      ]
    },
    // Fora do mangá: o Blue Lock vence o World Five
    postMatchCutscene: [
      { cinematic: 'world_five_win' },
      { speaker: 'VOCÊ', text: '"O mundo é gigantesco... Julian Loki tem a minha idade e já está nesse nível! Mas na Copa do Mundo eu vou alcançá-lo!"', mood: 'ego' },
      { speaker: 'JINPACHI EGO', text: '"O Rin, o Shidou num outro jogo... e agora vocês. Quem marca contra o mundo entra no topo do ranking. Terceira Seleção, agora."', mood: 'ego' }
    ],
    // Como no mangá: perder para o World Five não elimina, a história segue
    // Empate não é a vitória da cena alternativa (é derrota, como no mangá)
    drawIsWin: false,
    advanceOnLoss: true,
    lossCutscene: [
      { cinematic: 'world_five_fall' },
      { speaker: 'JULIAN LOKI', text: '"Bom jogo. Vocês ainda estão longe... mas eu vi fome nos seus olhos."', mood: 'ego' },
      { speaker: 'JINPACHI EGO', text: '"Perderam. E era isso que eu queria. Agora vocês sabem a distância que existe entre vocês e o topo do mundo."', mood: 'ego' },
      { speaker: 'JINPACHI EGO', text: '"Só dois marcaram contra o World Five: o Rin, aqui, e o Shidou, num outro jogo. É isso que define o TOP 6. Sigam para a Terceira Seleção!"', mood: 'ego' },
      { speaker: 'VOCÊ', text: '"O mundo é gigantesco... Julian Loki tem a minha idade e já está nesse nível! Mas na Copa do Mundo eu vou alcançá-lo!"', mood: 'ego' }
    ]
  },
  {
    id: 'ch4_third_selection',
    chapterNumber: 7,
    mapTheme: 'bluelock_holo',
    era: '3ª SELEÇÃO — ARENA DE REAÇÃO QUÍMICA',
    // Fim da 2ª Seleção: o Kunigami eliminado escolhe a porta do Wild Card e o Ego desafia
    // a Federação (STORY_INTERLUDES.wildcard_door / ego_federation)
    interlude: ['wildcard_door', 'ego_federation'],
    teamName: 'Time A (Rin & Shidou + Você, Hiori & Nanase)',
    title: 'Top 6: Time A (Rin & Shidou) vs Time B (Karasu & Otoya)',
    opponentName: 'Time B do Top 6 (Tabito Karasu & Eita Otoya)',
    homeColor: '#f8fafc',
    homeSecondary: '#0ea5e9',
    opponentColor: '#1e1b4b',
    opponentSecondary: '#e11d48',
    targetGoals: 3,
    matchDuration: 105,
    difficulty: 4,
    unlocksBlueLock: true,
    unlocksNEL: false,
    rewardCoins: 280,
    rewardSpins: 3,
    rewardSP: 4,
    // Como no mangá: o Top 6 (Rin, Shidou, Karasu, Otoya, Yukimiya e Nagi) vira 3 duplas;
    // você entra no Time A da dupla Rin & Shidou com o Hiori e o Nanase
    teammateIds: ['shidou', 'rin', 'hiori', 'nanase'],
    opponentIds: ['karasu', 'otoya', 'niko', 'kiyora', 'hiiragi'],
    loreSummary: 'A aposta do Ego com a Federação está feita: o Blue Lock enfrenta a Sub-20. Na 3ª Seleção, o Top 6 (Rin, Shidou, Karasu, Otoya, Yukimiya e Nagi) é dividido em 3 duplas, e o resto escolhe com quem jogar. Você entra no Time A da dupla Rin & Shidou, com o Hiori e o Nanase, contra o Time B de Karasu & Otoya.',
    introCutscene: [
      { speaker: 'JINPACHI EGO', text: '"O TOP 6: Rin, Shidou, Karasu, Otoya, Yukimiya e Nagi. Três duplas. O resto escolhe com quem quer sobreviver."', mood: 'ego' },
      { speaker: 'RIN ITOSHI', text: '"Vocês três entram no meu time pra não me atrapalhar. Só isso."', mood: 'tense' },
      { speaker: 'RYUSEI SHIDOU', text: '"HAHAHA! Eu sou o número 2 dessa prisão! Se você fizer meu sangue ferver, entra na área e aperta [C] pra nossa REAÇÃO QUÍMICA explodir o gol!"', mood: 'ego' },
      { speaker: 'YO HIORI', text: '"Não olhe para a bola, olhe para o espaço vazio. Quando quiser o passe reflexivo, aperte [R]!"', mood: 'normal' },
      { speaker: 'TABITO KARASU', text: '"Eu adoro dissecar o elo mais fraco do time adversário. Vamos ver se você aguenta a pressão."', mood: 'tense' }
    ],
    midMatchLore: {
      triggerTime: 50,
      lines: [
        { speaker: 'RYUSEI SHIDOU', text: '"ISSO! Sente esse calor no campo?! Minhas células estão prontas pro Big Bang!"', mood: 'ego' }
      ]
    },
    postMatchCutscene: [
      { speaker: 'RYUSEI SHIDOU', text: '"HAHAHA! Sentiu?! Nossas células explodiram juntas! A gente devia jogar assim pra sempre!"', mood: 'ego' },
      { speaker: 'ANRI TEIERI', text: '"Lembrem da aposta do Ego: se o Blue Lock perder pra Sub-20, a Federação fecha o projeto. Se ganhar, vocês viram a seleção."', mood: 'urgent' },
      { speaker: 'JINPACHI EGO', text: '"Bom. Vocês sobreviveram ao teste de aptidão. Mas ainda não existem 11 titulares..."', mood: 'ego' },
      { speaker: 'JINPACHI EGO', text: '"Formem TRIOS. Só o trio que vencer o mata-mata ganha a vaga no Blue Lock Eleven contra a Seleção Sub-20!"', mood: 'ego' }
    ]
  },
  {
    id: 'ch4b_trio_tournament',
    chapterNumber: 8,
    mapTheme: 'bluelock_holo',
    era: '3ª SELEÇÃO — TORNEIO DE TRIOS',
    teamName: 'Seu Trio (Você + 2 escolhidos)',
    title: 'Torneio de Trios: monte sua equipe de 3 e conquiste a vaga contra a Sub-20',
    opponentName: 'Trios Rivais do Blue Lock',
    homeColor: '#0ea5e9',
    homeSecondary: '#0f172a',
    format: 'trio',
    targetGoals: 2,
    matchDuration: 85,
    difficulty: 4,
    unlocksBlueLock: true,
    unlocksNEL: false,
    rewardCoins: 300,
    rewardSpins: 3,
    rewardSP: 4,
    // Companheiros que você pode chamar para o seu trio (os rivais ficam de fora)
    // (o Kunigami está no Wild Card desde o fim da 2ª Seleção)
    trioPool: ['bachira', 'igarashi', 'chigiri', 'nagi', 'reo', 'barou', 'shidou', 'hiori', 'nanase', 'kurona'],
    teammateIds: [],
    opponentIds: ['rin', 'aryu', 'tokimitsu'],
    // Mata-mata 3 contra 3 (cada rodada sobrescreve os dados do capítulo na partida)
    trioRounds: [
      {
        name: 'QUARTAS DE FINAL',
        rivalName: 'Trio da Lâmina (Zantetsu, Raichi & Niko)',
        opponentIds: ['zantetsu', 'raichi', 'niko'],
        opponentColor: '#f8fafc',
        opponentSecondary: '#7e22ce',
        difficulty: 3,
        targetGoals: 2,
        matchDuration: 80,
        intro: [
          { speaker: 'JINGO RAICHI', text: '"Trio de novatos? Vou atropelar vocês três de uma vez!"', mood: 'ego' },
          { speaker: 'IKKI NIKO', text: '"Já calculei seus passes. Esse trio não passa das quartas."', mood: 'tense' }
        ]
      },
      {
        name: 'SEMIFINAL',
        rivalName: 'Trio Corvo (Karasu, Otoya & Yukimiya)',
        opponentIds: ['karasu', 'otoya', 'yukimiya'],
        opponentColor: '#1e1b4b',
        opponentSecondary: '#38bdf8',
        difficulty: 4,
        targetGoals: 2,
        matchDuration: 85,
        intro: [
          { speaker: 'TABITO KARASU', text: '"Elo mais fraco do seu trio: já achei. Vou cortar ele do jogo."', mood: 'tense' },
          { speaker: 'KENYU YUKIMIYA', text: '"Nada pessoal. Eu preciso dessa vaga mais do que vocês."', mood: 'ego' }
        ]
      },
      {
        name: 'FINAL',
        rivalName: 'Trio do Top 1 (Rin, Aryu & Tokimitsu)',
        opponentIds: ['rin', 'aryu', 'tokimitsu'],
        opponentColor: '#1e1b4b',
        opponentSecondary: '#e11d48',
        difficulty: 5,
        targetGoals: 3,
        matchDuration: 95,
        intro: [
          { speaker: 'RIN ITOSHI', text: '"Quem perder aqui assiste a Sub-20 da arquibancada. Não vou perder pra você."', mood: 'ego' },
          { speaker: 'JYUBEI ARYU', text: '"Que trio sem glamour... Vou mostrar o que é beleza no futebol."', mood: 'ego' }
        ]
      }
    ],
    loreSummary: 'Ego anuncia o Torneio de Trios: cada jogador escolhe 2 companheiros e o trio enfrenta outros trios em mata-mata 3 contra 3. Só o trio campeão ganha a vaga no Blue Lock Eleven contra a Seleção Sub-20!',
    introCutscene: [
      { speaker: 'JINPACHI EGO', text: '"Torneio de Trios. Três jogadores, um gol, nenhuma desculpa. Quarta de final, semifinal e final."', mood: 'ego' },
      { speaker: 'JINPACHI EGO', text: '"Escolham bem: química alta faz o seu parceiro jogar melhor. Química ruim... vocês vão descobrir em campo."', mood: 'ego' },
      { speaker: 'ANRI TEIERI', text: '"Os goleiros holográficos BLUE LOCK MAN defendem os dois gols. Boa sorte, pessoal!"', mood: 'happy' }
    ],
    postMatchCutscene: [
      { speaker: 'JINPACHI EGO', text: '"O trio campeão está definido. Vocês três entram no Blue Lock Eleven."', mood: 'ego' },
      { speaker: 'RIN ITOSHI', text: '"...Tsc. Na Sub-20 eu ainda vou ser melhor que você."', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"Preparem-se. Amanhã, no Estádio Nacional, vocês vão destruir a Seleção Japonesa Sub-20!"', mood: 'ego' }
    ]
  },
  {
    id: 'ch5_u20_japan',
    chapterNumber: 9,
    mapTheme: 'u20_national',
    era: 'ESTÁDIO NACIONAL — BLUE LOCK vs JAPÃO SUB-20',
    // Antes do jogo: o anúncio do Blue Lock Eleven, o Shidou cortado e levado pelo Sae para a
    // Sub-20, e a lembrança do Rin (a noite de neve em que o Sae largou o sonho dos dois)
    interlude: ['bl_eleven', 'shidou_cut', 'itoshi_snow'],
    teamName: 'Blue Lock Eleven',
    title: 'Partida Histórica: Blue Lock Eleven vs Seleção Sub-20 (Sae, Aiku & Shidou)',
    opponentName: 'Seleção Japão Sub-20 (Sae, Shidou, Aiku, Sendo & Fukaku)',
    homeColor: '#0f2942',
    homeSecondary: '#38bdf8',
    opponentColor: '#ffffff',
    opponentSecondary: '#dc2626',
    targetGoals: 4,
    matchDuration: 115,
    difficulty: 5,
    unlocksBlueLock: true,
    unlocksNEL: true,
    rewardCoins: 380,
    rewardSpins: 3,
    rewardSP: 5,
    teammateIds: ['rin', 'bachira', 'nagi', 'gagamaru'],
    opponentIds: ['shidou', 'sae', 'sendo', 'aiku', 'fukaku'],
    scoreLabels: { home: 'BLUE LOCK', away: 'U-20' },
    // Como no mangá, o jogo TEM que chegar no 3 x 3 para o gol final (Rin x Sae → chute direto).
    // Se ninguém marcar a tempo, quem está na lista marca numa cutscene com a própria habilidade.
    script: {
      goals: [
        { team: 'away', shooterId: 'shidou', deadline: 100 },
        { team: 'home', shooterId: 'rin', deadline: 88 },
        { team: 'away', shooterId: 'sae', deadline: 74 },
        { team: 'home', shooterId: 'nagi', deadline: 60 },
        { team: 'away', shooterId: 'shidou', deadline: 46 },
        { team: 'home', shooterId: 'player', deadline: 32 }
      ],
      climax: {
        home: 3,
        away: 3,
        sakuga: 'u20_direct_shoot',
        finalHome: 4,
        banner: 'Rin e Sae vão se chocar na entrada da área... e a bola vai sobrar para alguém!'
      }
    },
    loreSummary: 'No Estádio Nacional lotado sob os refletores da noite, Sae Itoshi e o capitão Oliver Aiku lideram a Sub-20 do Japão! Vencer aqui prova o valor do Blue Lock para o mundo e abre a LIGA NEO EGOÍSTA (NEL)!',
    introCutscene: [
      { music: 'u20', speaker: 'SAE ITOSHI', text: '"Eu voltei da Espanha apenas para ver se nasceu algum atacante de verdade neste país. Não me façam perder tempo."', mood: 'ego' },
      { speaker: 'OLIVER AIKU', text: '"O quarteto defensivo de ferro da Sub-20 não vai deixar nenhum egoísta passar!"', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"Aperte [G] durante a partida quando sua barra encher para entrar em estado de FLUXO! Dominem o Estádio Nacional!"', mood: 'urgent' }
    ],
    midMatchLore: {
      triggerTime: 55,
      lines: [
        { speaker: 'SAE ITOSHI', text: '"Interessante... Então ainda existe alguém no Japão que consegue enxergar o mesmo futuro que eu em campo!"', mood: 'ego' }
      ]
    },
    postMatchCutscene: [
      { speaker: 'SAE ITOSHI', text: '"Rin. Você ainda chora quando perde?"', mood: 'ego' },
      { speaker: 'RIN ITOSHI', text: '"...Eu não perdi pra você hoje, Sae. E um dia eu vou te destruir na frente do mundo inteiro."', mood: 'tense' },
      { speaker: 'SAE ITOSHI', text: '"O Japão finalmente mudou. Você... tem o ego necessário para mudar o futebol mundial."', mood: 'ego' },
      { speaker: 'ANRI TEIERI', text: '"Conseguimos! O Blue Lock não vai fechar! E o mundo inteiro assistiu esse jogo!"', mood: 'happy' },
      // A coletiva do Sae e o Rin virando seu rival mortal (RIN_RIVAL_SCENE)
      ...window.RIN_RIVAL_SCENE,
      { speaker: 'JINPACHI EGO', text: '"Vocês venceram a Sub-20! Agora o mundo inteiro quer ver vocês na Fase 2 do projeto: A LIGA NEO EGOÍSTA (NEL)! Seu 2º Slot de Arma e Fluxo está DESBLOQUEADO!"', mood: 'ego' }
    ]
  },
  {
    // ARCO WILD CARD: o Kunigami eliminado na 2ª Seleção volta da porta preta antes da NEL.
    // O mangá não mostra o que acontece lá dentro; o "inferno" e o jogo de teste são nossos.
    id: 'ch5b_wild_card',
    chapterNumber: 10,
    mapTheme: 'bluelock_bunker',
    era: 'WILD CARD — O RETORNO DO CORINGA',
    // A porta do Wild Card já tocou antes do Cap. 4 para quem jogou depois da atualização;
    // para os saves antigos ela abre este capítulo
    interlude: ['wildcard_door', 'wildcard_hell'],
    // Saves que já passaram da NEL jogam este como CAPÍTULO NOVO (App.pendingExtraChapters)
    extraForOldSaves: true,
    teamName: 'Blue Lock (Pré-NEL)',
    title: 'Wild Card: o Herói que Apagou o Coração (Rensuke Kunigami)',
    opponentName: 'Wild Card (Rensuke Kunigami & os Coringas)',
    homeColor: '#1e40af',
    homeSecondary: '#38bdf8',
    opponentColor: '#0a0a0a',
    opponentSecondary: '#f97316',
    targetGoals: 3,
    matchDuration: 105,
    difficulty: 5,
    unlocksBlueLock: true,
    unlocksNEL: true,
    rewardCoins: 400,
    rewardSpins: 3,
    rewardSP: 5,
    teammateIds: ['chigiri', 'bachira', 'nagi', 'gagamaru'],
    opponentIds: ['kunigami', 'gen_wildcard_mf', 'gen_wildcard_wg', 'gen_wildcard_df', 'gk_wildcard'],
    scoreLabels: { home: 'BLUE LOCK', away: 'WILD CARD' },
    // O Coringa sempre marca o dele (frio, sem comemorar)
    script: {
      goals: [{ team: 'away', shooterId: 'kunigami', deadline: 58 }]
    },
    loreSummary: 'Antes da Liga Neo Egoísta, a porta preta se abre: Rensuke Kunigami, eliminado na Segunda Seleção, volta do programa secreto Wild Card sem sorriso, sem raiva e sem medo. Se ele vencer o Blue Lock, ganha a vaga na NEL.',
    introCutscene: [
      { bg: 'bluelock_bunker', music: 'tension', speaker: 'JINPACHI EGO', text: '"Antes da Liga Neo Egoísta, um último teste. Existe um jogador que vocês esqueceram. Ele não esqueceu de vocês."', mood: 'ego' },
      { speaker: 'HYOMA CHIGIRI', text: '"Espera... a porta preta do fim do campo tá abrindo."', mood: 'urgent' },
      { cinematic: 'kunigami_return' },
      { speaker: 'HYOMA CHIGIRI', text: '"Kunigami! Cara, você tá vivo! Eu achei que—"', mood: 'happy' },
      { speaker: 'RENSUKE KUNIGAMI', text: '"Não fala comigo como se a gente fosse amigo. Aquele cara ficou lá embaixo."', mood: 'tense' },
      {
        id: 'wildcard_greet',
        speaker: 'RENSUKE KUNIGAMI',
        text: '"E você. Eu lembro de você. Foi o motivo de eu querer ficar mais forte... e o motivo de eu ter caído."',
        mood: 'tense',
        choices: [
          {
            label: '"Então vem. Eu quero jogar contra o Kunigami de verdade."',
            effects: { affinity: { kunigami: 4 }, stats: { ego: 2 } },
            reply: [{ speaker: 'RENSUKE KUNIGAMI', text: '"O de verdade é esse aqui. Vai se acostumando."', mood: 'tense' }]
          },
          {
            label: '"O herói não morreu. Ele só tá com medo."',
            effects: { affinity: { kunigami: -2, chigiri: 3 }, stats: { compostura: 2 } },
            reply: [{ speaker: 'RENSUKE KUNIGAMI', text: '"Fala isso de novo depois do jogo. Se ainda tiver voz."', mood: 'tense' }]
          }
        ]
      },
      { speaker: 'JINPACHI EGO', text: '"Regras simples: Blue Lock contra o Wild Card. Se ele vencer, ganha a vaga na NEL. Se vocês perderem... aprendam o preço de esquecer alguém."', mood: 'ego' }
    ],
    midMatchLore: {
      triggerTime: 52,
      lines: [
        { speaker: 'RENSUKE KUNIGAMI', text: '"Sem raiva. Sem alegria. Sem medo. Só a jogada certa. Foi isso que sobrou de mim."', mood: 'tense' },
        { speaker: 'HYOMA CHIGIRI', text: '"Ele não comemora nem o próprio gol... O que fizeram com ele lá embaixo?"', mood: 'tense' },
        { speaker: 'VOCÊ', text: '(Ele virou uma máquina perfeita. E máquina é previsível: lê a jogada antes dele!)', mood: 'ego' }
      ]
    },
    postMatchCutscene: [
      { speaker: 'NARRADOR', text: 'Apito final. O Kunigami fica parado no meio do campo, olhando as próprias mãos.', mood: 'tense' },
      { cinematic: 'wildcard_verdict' },
      { speaker: 'RENSUKE KUNIGAMI', text: '"Vocês venceram hoje. Não importa. O programa não mede um jogo: mede quem continua de pé no fim."', mood: 'tense' },
      { speaker: 'HYOMA CHIGIRI', text: '"...Por um segundo ali, eu vi você sorrir. Eu vi, Rensuke."', mood: 'tense' },
      { speaker: 'RENSUKE KUNIGAMI', text: '"Viu errado."', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"Wild Card aprovado. Rensuke Kunigami entra na Liga Neo Egoísta pelo Manshine City. E vocês acabaram de ganhar mais um monstro para devorar."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '(Herói ou máquina, tanto faz. Na NEL eu passo por cima dos dois.)', mood: 'ego' }
    ],
    // Perder para o Wild Card não elimina você: ele entra na NEL do mesmo jeito
    advanceOnLoss: true,
    lossCutscene: [
      { speaker: 'NARRADOR', text: 'Apito final. O placar diz WILD CARD. Ninguém do Blue Lock consegue levantar a cabeça.', mood: 'tense' },
      { cinematic: 'wildcard_verdict' },
      { speaker: 'RENSUKE KUNIGAMI', text: '"Esse é o resultado de apagar tudo que é inútil. Vocês ainda carregam peso demais."', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"O Wild Card venceu e entra na NEL pelo Manshine City. Vocês também entram. Mas lembrem desse gosto: a Liga não perdoa duas vezes."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '(Perdi pra uma máquina. Então eu viro uma coisa que máquina nenhuma consegue calcular.)', mood: 'ego' }
    ]
  },
  {
    id: 'ch6_nel_barcha_manshine',
    chapterNumber: 11,
    mapTheme: 'nel_dome',
    era: 'LIGA NEO EGOÍSTA (NEL) — ARENA BLTV EUROPA',
    // 1º turno da NEL (seus jogos 1-4): elenco, rival e falas mudam pelo clube escolhido
    // (NEL_CLUBS[..].phases[0]) e pela rodada da liga (App.getChapter)
    nelPhase: 0,
    format: 'league',
    teamName: 'Bastard München (NEL)',
    title: 'NEL: FC Barcha (Lavinho & Bunny) e Manshine City (Chris Prince & Agi)',
    opponentName: 'FC Barcha & Manshine (Lavinho, Chris Prince, Bunny, Agi & Lara)',
    opponentColor: '#38bdf8',
    opponentSecondary: '#dc2626',
    targetGoals: 3,
    matchDuration: 115,
    difficulty: 4,
    // Os World Class da NEL ficam no máximo ~12 de OVR acima de você (antes eram +35 e a fase era impossível)
    rivalEdgeCap: 0.3,
    unlocksBlueLock: true,
    unlocksNEL: true,
    rewardCoins: 450,
    rewardSpins: 3,
    rewardSP: 6,
    teammateIds: ['noa', 'kaiser', 'ness', 'kurona'],
    opponentIds: ['lavinho', 'chris_prince', 'bunny', 'agi', 'lara'],
    loreSummary: 'Na Arena Futurista da NEL transmitida pela BLTV para o mundo inteiro, você joga ao lado de Noel Noa, Michael Kaiser, Alexis Ness e Kurona contra Lavinho, Bunny Iglesias, Chris Prince e Agi!',
    introCutscene: [
      { speaker: 'NOEL NOA', text: '"Bem-vindo à Liga Neo Egoísta. Aqui cada gol vale milhões no leilão mundial de salários. Mostre números racionais."', mood: 'ego' },
      { speaker: 'MICHAEL KAISER', text: '"Tente não atrapalhar o meu império, novato, ou eu te esmago com o meu Kaiser Impact."', mood: 'ego' },
      { speaker: 'LAVINHO', text: '"Esquece as regras! Imagina o melhor jogador do mundo dentro da sua cabeça e DANÇA!"', mood: 'happy' }
    ],
    midMatchLore: {
      triggerTime: 55,
      lines: [
        { speaker: 'CHRIS PRINCE', text: '"Hora do Mestre entrar em campo! Vamos ver se o seu corpo aguenta o meu Knuckleball!"', mood: 'ego' }
      ]
    },
    postMatchCutscene: [
      { speaker: 'KURONA RANZE', text: '"Órbita, órbita! Nossa linha planetária destruiu a defesa deles! Sua oferta salarial na NEL já está subindo!"', mood: 'happy' },
      { speaker: 'MICHAEL KAISER', text: '"Um jogo bom e você já acha que é alguém? Você é só uma peça no MEU tabuleiro. Não esqueça disso."', mood: 'ego' },
      { speaker: 'NOEL NOA', text: '"Seus números subiram. Mas o Kaiser ainda é o centro do time. Se quer o lugar dele, tome à força."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '(Então é isso. O próximo que eu vou devorar... é o Kaiser.)', mood: 'ego' }
    ]
  },
  {
    id: 'ch7_nel_ubers_pxg',
    chapterNumber: 12,
    mapTheme: 'nel_dome',
    era: 'LIGA NEO EGOÍSTA (NEL) — DECISÃO UBERS & PXG',
    // 2º turno da NEL (seus jogos 5-8)
    nelPhase: 1,
    format: 'league',
    teamName: 'Bastard München Despertado',
    title: 'NEL Final: Ubers (Snuffy & Lorenzo) e os Invictos do PXG (Loki & Charles)',
    opponentName: 'Ubers & PXG (Marc Snuffy, Don Lorenzo, Julian Loki, Charles & Kaiser)',
    opponentColor: '#1e1b4b',
    opponentSecondary: '#a855f7',
    targetGoals: 3,
    matchDuration: 115,
    difficulty: 5,
    rivalEdgeCap: 0.35,
    // Seu 1º gol vira a cena do Metavision (o passe do Hiori e o chute de duas armas)
    firstGoalSakuga: 'nel_metavision_goal',
    unlocksBlueLock: true,
    unlocksNEL: true,
    rewardCoins: 550,
    rewardSpins: 4,
    rewardSP: 7,
    teammateIds: ['hiori', 'kurona', 'kiyora', 'gagamaru'],
    opponentIds: ['snuffy', 'lorenzo', 'charles', 'kaiser', 'drago'],
    loreSummary: 'O confronto pelo topo da Liga Neo Egoísta contra a fortaleza italiana da Ubers (Snuffy e Don Lorenzo) e o invicto PXG (Loki e Charles Chevalier)!',
    introCutscene: [
      { speaker: 'MARC SNUFFY', text: '"Eu criei centenas de padrões táticos para a Ubers. Como você pretende quebrar um sistema perfeito?"', mood: 'tense' },
      { speaker: 'DON LORENZO', text: '"Hehehe... Sou o melhor zagueiro Sub-20 do mundo! Vou engolir o seu valor de mercado!"', mood: 'ego' },
      { speaker: 'CHARLES CHEVALIER', text: '"Bleh! Se não tiver passe sem olhar pro lugar mais impossível do campo, eu quero ir embora!"', mood: 'happy' }
    ],
    midMatchLore: {
      triggerTime: 50,
      lines: [
        { speaker: 'YO HIORI', text: '"Não olhe pra mim... Apenas corra para o ponto onde nossos reflexos se cruzam!"', mood: 'ego' }
      ]
    },
    postMatchCutscene: [
      { speaker: 'MICHAEL KAISER', text: '"...Você roubou a minha coroa na frente do mundo inteiro. Aproveite. Por enquanto."', mood: 'tense' },
      { speaker: 'NARRADOR', text: 'O telão da BLTV pisca. Os lances dos clubes europeus pelo seu nome não param de subir.', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"A Liga Neo Egoísta chegou ao fim e você conquistou o topo do ranking salarial! Os 23 convocados para a Copa do Mundo Sub-20 saem daqui... e você é um deles."', mood: 'ego' }
    ]
  },
  {
    id: 'ch8_u20_england',
    chapterNumber: 13,
    mapTheme: 'worldcup_england',
    era: 'COPA DO MUNDO SUB-20 (ARCO ATUAL DO MANGÁ)',
    // Antes da Copa: a viagem para a Espanha e o seu discurso no vestiário (STORY_INTERLUDES),
    // cada um tocado uma vez. hype: o time entra pilhado (Química cheia e companheiros +6%)
    interlude: ['spain'],
    // O discurso no vestiário (o grito do time) toca no começo de TODA Copa Sub-20 nova,
    // logo antes da estreia, mesmo para quem já viu (App.launchChapterMatch)
    cupStartInterlude: 'cup_speech',
    hype: true,
    // A Copa do Mundo Sub-20 inteira (format 'cup', App.handleCupMatch): grupo com Nigéria,
    // Coreia do Sul e Argentina (os 2 primeiros passam), quartas contra Portugal e a
    // semifinal contra a Inglaterra (o jogo do Fox na arquibancada). A final contra a França
    // é o capítulo seguinte (ch9_world_cup_final). Roteiro e cena no meio do jogo são da
    // rodada (cupRounds[i].script / .midMatchLore); dialogues = falas com escolha da rodada
    format: 'cup',
    cupName: 'Copa do Mundo Sub-20',
    cupAchievement: null,
    groupName: 'GRUPO F',
    teamName: 'Seleção Japão Sub-20 (Blue Lock)',
    title: 'Copa do Mundo Sub-20',
    opponentName: 'As seleções Sub-20 do mundo',
    homeColor: '#1d4ed8',
    homeSecondary: '#ffffff',
    opponentColor: '#ffffff',
    opponentSecondary: '#dc2626',
    targetGoals: 4,
    matchDuration: 120,
    difficulty: 7,
    unlocksBlueLock: true,
    unlocksNEL: true,
    rewardCoins: 700,
    rewardSpins: 5,
    rewardSP: 8,
    teammateIds: ['rin', 'shidou', 'bachira', 'gagamaru'],
    opponentIds: [],
    groupTeams: { japao: { name: 'Japão', power: 0 }, nigeria: { name: 'Nigéria', power: 0.45 }, coreia: { name: 'Coreia do Sul', power: 0.35 }, argentina: { name: 'Argentina', power: 0.55 } },
    cupRounds: [
      {
        name: 'GRUPO • JOGO 1', label: 'NIGÉRIA', rivalName: 'Nigéria Sub-20', group: 'nigeria',
        opponentIds: ['gen_nigeria_fw', 'gen_nigeria_wg', 'gen_nigeria_mf', 'gen_nigeria_df', 'gk_nigeria'], teammateIds: ['rin', 'chigiri', 'bachira', 'gagamaru'],
        opponentColor: '#16a34a', opponentSecondary: '#f8fafc', difficulty: 6,
        intro: [
          { speaker: 'NARRADOR DA COPA U-20', text: '"Estreia do Japão na Copa Sub-20! Do outro lado, a Nigéria: a defesa mais alta e os pontas mais rápidos do torneio!"', mood: 'urgent' },
          { speaker: 'HYOMA CHIGIRI', text: '"Os pontas mais rápidos do torneio? Tá. Então hoje eles ganham um professor."', mood: 'ego' }
        ]
      },
      {
        name: 'GRUPO • JOGO 2', label: 'COREIA DO SUL', rivalName: 'Coreia do Sul Sub-20', group: 'coreia',
        opponentIds: ['gen_korea_fw', 'gen_korea_wg', 'gen_korea_mf', 'gen_korea_df', 'gk_korea'], teammateIds: ['rin', 'nagi', 'reo', 'gagamaru'],
        opponentColor: '#dc2626', opponentSecondary: '#1e3a8a', difficulty: 6,
        intro: [
          { speaker: 'NARRADOR DA COPA U-20', text: '"Segundo jogo do grupo: Japão x Coreia do Sul! Um clássico asiático que vale a classificação!"', mood: 'urgent' },
          { speaker: 'REO MIKAGE', text: '"Nagi, eles marcam homem a homem. Você só precisa dominar... o resto é comigo."', mood: 'ego' },
          { speaker: 'SEISHIRO NAGI', text: '"Tá... mas se a bola vier torta eu volto pro banco."', mood: 'normal' }
        ]
      },
      {
        name: 'GRUPO • JOGO 3', label: 'ARGENTINA', rivalName: 'Argentina Sub-20', group: 'argentina',
        opponentIds: ['gen_argentina_fw', 'gen_argentina_wg', 'gen_argentina_mf', 'gen_argentina_df', 'gk_argentina'], teammateIds: ['rin', 'shidou', 'barou', 'gagamaru'],
        opponentColor: '#7dd3fc', opponentSecondary: '#f8fafc', difficulty: 7,
        intro: [
          { speaker: 'NARRADOR DA COPA U-20', text: '"Última rodada do grupo! A Argentina Sub-20 é a favorita... e o estádio inteiro canta contra o Japão!"', mood: 'urgent' },
          { speaker: 'SHOUEI BAROU', text: '"Cantem à vontade. O rei não precisa de plateia a favor."', mood: 'ego' }
        ]
      },
      {
        name: 'QUARTAS DE FINAL', label: 'PORTUGAL', rivalName: 'Portugal Sub-20',
        opponentIds: ['gen_portugal_fw', 'gen_portugal_wg', 'gen_portugal_mf', 'gen_portugal_df', 'gk_portugal'], teammateIds: ['rin', 'bachira', 'kunigami', 'gagamaru'],
        opponentColor: '#7f1d1d', opponentSecondary: '#15803d', difficulty: 7,
        intro: [
          { speaker: 'NARRADOR DA COPA U-20', text: '"Mata-mata! Quartas de final: Japão x Portugal. Quem perder, volta pra casa hoje!"', mood: 'urgent' },
          { speaker: 'MEGURU BACHIRA', text: '"Portugal joga com ginga! O meu monstro quer dançar com eles!"', mood: 'happy' },
          { speaker: 'RENSUKE KUNIGAMI', text: '"Sem dança. Eu só quero ganhar."', mood: 'tense' }
        ]
      },
      {
        name: 'SEMIFINAL', label: 'INGLATERRA', rivalName: 'Inglaterra Sub-20 (Agi, Teddy Knight, Chris Prince & Blake)',
        opponentIds: ['agi', 'teddy_knight', 'chris_prince', 'blake', 'gk_england'], teammateIds: ['rin', 'shidou', 'bachira', 'gagamaru'],
        opponentColor: '#ffffff', opponentSecondary: '#dc2626', difficulty: 7,
        dialogues: 'ch8_u20_england_semi',
        intro: [
          { speaker: 'NARRADOR DA COPA U-20', text: '"SEMIFINAL DA COPA DO MUNDO SUB-20! Os hinos terminam e a bola vai rolar para JAPÃO SUB-20 contra INGLATERRA SUB-20!"', mood: 'urgent' },
          { speaker: 'TEDDY KNIGHT', text: '"Vocês venceram na NEL, mas contra a Seleção Oficial da Inglaterra o buraco é muito mais embaixo!"', mood: 'tense' },
          { speaker: 'AGI', text: '"Mostre-me a evolução do futebol japonês! Quero analisar cada reação química de vocês!"', mood: 'ego' },
          // A primeira aparição do Fox: sentado na arquibancada inglesa, o rosto na sombra
          // (shadowFace: só o sorriso aparece; displayName: o nome ainda é segredo)
          { speaker: 'NARRADOR', text: 'Na tribuna de honra, acima da torcida inglesa, um homem de terno assiste sentado, girando o dedo no ar. Ninguém consegue ver o rosto dele. Só o sorriso.', mood: 'tense' },
          { speaker: 'FOX', displayName: '???', shadowFace: true, text: '"(na arquibancada) Hehehe... então esses são os famosos egoístas do Japão. Que fofos. Vou adorar ver vocês chorando."', mood: 'ego' },
          { speaker: 'VOCÊ', text: '"O mundo inteiro está olhando. Nós vamos atropelar a Inglaterra e buscar essa Copa!"', mood: 'ego' }
        ],
        script: {
          goals: [
            { team: 'away', shooterId: 'chris_prince', deadline: 85 },
            { team: 'home', shooterId: 'rin', deadline: 50 }
          ]
        },
        midMatchLore: {
          triggerTime: 55,
          lines: [
            { speaker: 'TEDDY KNIGHT', text: '"Fecharam o meio?! Não importa, a Inglaterra ataca como uma tempestade!"', mood: 'urgent' },
            { speaker: 'RIN ITOSHI', text: '"Cala a boca e passa a bola, ou eu destruo a Inglaterra sozinho!"', mood: 'ego' },
            // Enquanto isso, na arquibancada: o Fox (sem rosto, só o sorriso) vê um monstro
            { cinematic: 'fox_watch' },
            { speaker: 'FOX', displayName: '???', shadowFace: true, text: '"Hehe... Finalmente. Depois de tanto tempo, um monstro de verdade. E ele nem sabe que é um."', mood: 'ego' }
          ]
        }
      }
    ],
    loreSummary: 'A Copa do Mundo Sub-20! Fase de grupos contra Nigéria, Coreia do Sul e Argentina (os 2 primeiros passam), quartas contra Portugal e a semifinal contra a Inglaterra de Agi e Teddy Knight. Quem passar, enfrenta a França na final.',
    introCutscene: [
      { speaker: 'NARRADOR DA COPA U-20', text: '"COPA DO MUNDO SUB-20! Vinte e quatro seleções, um troféu. O Japão cai no Grupo F com Nigéria, Coreia do Sul e Argentina!"', mood: 'urgent' },
      { speaker: 'JINPACHI EGO', text: '"Dois passam do grupo. Depois é mata-mata: perdeu, acabou. A Inglaterra e a França estão do outro lado da chave, esperando."', mood: 'ego' }
    ],
    postMatchCutscene: [
      { speaker: 'AGI', text: '"Incrível... O Japão realmente criou um monstro que supera até os padrões europeus!"', mood: 'ego' },
      { speaker: 'FOX', displayName: '???', shadowFace: true, text: '"(levantando da arquibancada) ...A Inglaterra perdeu. Hehehe. Mas eu vi uma coisa hoje. Uma coisa com fome. Guarda bem esse sorriso, garoto... eu vou voltar pra te buscar."', mood: 'ego' },
      { speaker: 'NARRADOR', text: 'No vestiário, o Sae entra sem bater. Ninguém fala nada.', mood: 'tense' },
      { speaker: 'SAE ITOSHI', text: '"A França tem o Loki e o Hugo. Eu jogo do lado de vocês na final. Não me façam me arrepender."', mood: 'ego' },
      { speaker: 'JINPACHI EGO', text: '"A Inglaterra caiu! Resta apenas 1 partida para o topo do planeta: A GRANDE FINAL DA COPA DO MUNDO!"', mood: 'ego' }
    ]
  },
  {
    id: 'ch9_world_cup_final',
    chapterNumber: 14,
    mapTheme: 'worldcup_final',
    era: 'CATEDRAL MUNDIAL — GRANDE FINAL DA COPA DO MUNDO',
    teamName: 'Seleção Japão Sub-20 Suprema',
    title: 'Final World Cup U-20: Japão vs França — "QUATRO EGOS" (Você, Loki, Sae e Hugo)',
    opponentName: 'Seleção da França Sub-20 (Julian Loki, Hugo, Charles & cia.)',
    homeColor: '#f8fafc',
    homeSecondary: '#1d4ed8',
    opponentColor: '#1e3a8a',
    opponentSecondary: '#ffffff',
    targetGoals: 3,
    matchDuration: 125,
    difficulty: 8,
    unlocksBlueLock: true,
    unlocksNEL: true,
    hasFourEgosCutscene: true,
    // Quando a França ficar atrás no placar: flashback de Loki e Hugo crianças prometendo
    // ganhar a Copa juntos, e a França desperta (MatchEngine.checkLosingFlashback)
    losingFlashback: 'loki_hugo_promise',
    // Ao vencer: a comemoração com o time inteiro e a taça (antes do pós-jogo)
    victorySakuga: 'u20_celebration',
    // Antes do gol dele (prazo 56 no roteiro): o Hugo para do seu lado, "um de nós vai ser o
    // segundo melhor", as engrenagens e a íris de engrenagem — e ele entra no Fluxo
    // (rivalFlow: aura e mais velocidade por alguns segundos; MatchEngine.startRivalFlow)
    midMatchLore: {
      triggerTime: 64,
      lines: [{ cinematic: 'hugo_gears' }],
      // depois de vista, a cena entra no 🎬 REVER CENAS (STORY_INTERLUDES.hugo_gears)
      sceneId: 'hugo_gears',
      rivalFlow: { id: 'hugo', seconds: 14, color: '#ec4899', name: 'A ENGRENAGEM DO SEGUNDO LUGAR' },
      // ...e logo depois de falar, ele faz o gol garantido dele (o 2º da França no roteiro);
      // antes da cena a França não chega no 2º gol sozinha (fica guardado para ele)
      goalAfter: 'hugo'
    },
    rewardCoins: 1500,
    rewardSpins: 8,
    rewardSP: 12,
    teammateIds: ['sae', 'rin', 'shidou', 'gagamaru'],
    // Só franceses (o Kaiser é da Alemanha e o Lorenzo da Itália)
    opponentIds: ['loki', 'hugo', 'charles', 'gen_france_mf', 'gk_france'],
    scoreLabels: { home: 'JAPÃO', away: 'FRANÇA' },
    // A final TEM que chegar no 2 x 2: no último lance nasce o gol dos Quatro Egos (o Sae
    // finalmente passa, o Rin arrasta o Hugo, o Loki corre atrás de você) — wc_final_goal,
    // um filme próprio (antes era o mesmo "Gol da Sorte" da Sub-20 do Japão)
    script: {
      goals: [
        { team: 'away', shooterId: 'loki', deadline: 100 },
        { team: 'home', shooterId: 'player', deadline: 78 },
        { team: 'away', shooterId: 'hugo', deadline: 56 },
        { team: 'home', shooterId: 'rin', deadline: 40 }
      ],
      climax: {
        home: 2,
        away: 2,
        sakuga: 'wc_final_goal',
        finalHome: 3,
        banner: 'O Sae ergueu a cabeça. Pela primeira vez, ele está olhando para alguém...'
      }
    },
    loreSummary: 'Na Final da Copa do Mundo Sub-20 contra a França, Sae Itoshi veste a camisa do Japão ao seu lado contra Julian Loki e Hugo! Antes do apito, a câmera gira pelo campo anunciando: "4 EGO\'S"!',
    introCutscene: [
      { speaker: 'NARRADOR MUNDIAL', text: '"O ESTÁDIO ESTÁ EM CHAMAS! É A GRANDE FINAL DA COPA DO MUNDO SUB-20: JAPÃO x FRANÇA!"', mood: 'urgent' },
      { speaker: 'SAE ITOSHI', text: '"Aquela final no Ensino Médio te trouxe até aqui. Agora receba o meu passe e marque o gol do título mundial."', mood: 'ego' },
      { speaker: 'JULIAN LOKI', text: '"Você evoluiu desde a Segunda Seleção... mas hoje eu usarei 100% da minha Velocidade Divina."', mood: 'ego' },
      { speaker: 'HUGO', text: '"Quatro Egos absolutos dividindo o mesmo gramado... Vamos decidir quem é o Deus do Futebol!"', mood: 'ego' }
    ],
    postMatchCutscene: [
      { speaker: 'NARRADOR MUNDIAL', text: '"APITA O ÁRBITRO! O JAPÃO É CAMPEÃO DA COPA DO MUNDO! NASCE O MAIOR EGOÍSTA DA HISTÓRIA DO FUTEBOL!"', mood: 'ego' },
      { speaker: 'JINPACHI EGO', text: '"Você provou que eu estava certo. Daquela final perdida no colégio até o topo do mundo... O mundo agora gira em torno do seu Ego!"', mood: 'ego' },
      // EPÍLOGO: o Tada (e o Kira) assistindo a final pela TV — o arco do passe se fecha
      { bg: 'night_home', speaker: 'NARRADOR', text: 'EPÍLOGO. Do outro lado do mundo, numa lanchonete perto do Colégio Ichinan, dois garotos assistem a final pela TV.', mood: 'normal' },
      { speaker: 'TADA (SEU AMIGO)', text: '"Ele não passou a bola. Nem uma vez na cara do gol. ...E por isso ele é o melhor do mundo."', mood: 'happy' },
      { speaker: 'RYOSUKE KIRA', text: '"Ele me eliminou no primeiro dia do Blue Lock. Eu odiei ele por um tempo. ...Ele estava certo."', mood: 'normal' },
      { speaker: 'TADA (SEU AMIGO)', text: '"Ei, cara. Se você estiver ouvindo... você chutou. Por nós dois."', mood: 'happy' },
      { speaker: 'VOCÊ', text: '(Obrigado, Tada. Aquele passe na final do colégio... foi o começo de tudo.)', mood: 'ego' },
      // A entrada do Fox fica em FOX_ARRIVAL: dá para rever na aba HISTÓRIA
      ...window.FOX_ARRIVAL
    ]
  },
  // ==========================================================================
  // DEPOIS DA COPA SUB-20: o Fox, a carreira profissional e a Copa do Mundo
  // ==========================================================================
  {
    id: 'ch10_fox_training',
    chapterNumber: 15,
    mapTheme: 'bluelock_holo',
    era: 'PÓS-COPA — O TREINO DA RAPOSA',
    teamName: 'Você + Blue Lock',
    title: 'O Teste da Raposa: acorde o monstro',
    opponentName: 'Time do Fox (Rin, Kaiser, Barou, Shidou & Gagamaru)',
    homeColor: '#0f2942',
    homeSecondary: '#38bdf8',
    opponentColor: '#f59e0b',
    opponentSecondary: '#111827',
    targetGoals: 3,
    matchDuration: 100,
    difficulty: 7,
    rivalEdgeCap: 0.45,
    // O Fox ensina o MONSTRO: daqui em diante, ficando atrás no placar ele desperta (MatchEngine.checkMonster)
    unlocksMonster: true,
    monsterTest: true,
    unlocksBlueLock: true,
    unlocksNEL: true,
    rewardCoins: 800,
    rewardSpins: 4,
    rewardSP: 8,
    teammateIds: ['bachira', 'nagi', 'chigiri', 'kunigami'],
    opponentIds: ['rin', 'kaiser', 'barou', 'shidou', 'gagamaru'],
    scoreLabels: { home: 'VOCÊ', away: 'TIME DO FOX' },
    // O Fox quer te ver perdendo: o time dele marca dois cedo
    script: {
      goals: [
        { team: 'away', shooterId: 'rin', deadline: 92 },
        { team: 'away', shooterId: 'kaiser', deadline: 78 }
      ]
    },
    loreSummary: 'O Fox juntou o Rin, o Kaiser, o Barou e o Shidou contra você e pediu que eles não tivessem pena. O teste é simples: ele quer te ver humilhado... para o monstro acordar. Vire o jogo e marque 3 gols.',
    introCutscene: [
      { speaker: 'FOX', text: '"Regra do teste: eu pedi pra eles te destruírem. Sem pena. Quando você estiver perdendo e o desespero bater... deixa o monstro sair. Ou quebra. Tanto faz pra mim."', mood: 'ego' },
      { speaker: 'MICHAEL KAISER', text: '"Um teste pra um campeãozinho Sub-20? Eu vim só pra rir. E porque a raposa paga bem."', mood: 'ego' },
      { speaker: 'RIN ITOSHI', text: '"Eu disse que ia te matar. Hoje é só o ensaio."', mood: 'tense' }
    ],
    midMatchLore: {
      triggerTime: 60,
      lines: [{ speaker: 'FOX', text: '"(da arquibancada) Tá perdendo? ÓTIMO! Dói? MELHOR AINDA! Agora para de pensar e DEIXA ELE SAIR!"', mood: 'urgent' }]
    },
    postMatchCutscene: [
      { music: 'dread', speaker: 'FOX', text: '"Hehehehe! VIU?! Esse é o monstro. Agora ele sabe o caminho: toda vez que você ficar atrás no placar, ele acorda. E eu sei onde fica a coleira."', mood: 'happy' },
      { speaker: 'RIN ITOSHI', text: '"...Da próxima vez eu mato ele antes de acordar."', mood: 'tense' },
      { speaker: 'FOX', text: '"Ah, e o seu celular não para de tocar. Cinco clubes da Europa. Eu já falei com todos eles... hehehe, antes de você."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '(Ele já falou com todos?... Quem é esse cara de verdade?)', mood: 'tense' }
    ]
  },
  {
    id: 'ch11_pro_season_1',
    chapterNumber: 16,
    mapTheme: 'nel_dome',
    era: 'CARREIRA PROFISSIONAL — TEMPORADA 1',
    // 1º turno da Liga Europeia (seus jogos 1-4): o clube vem das propostas (App.openProOffers)
    league: 'pro',
    leaguePhase: 0,
    format: 'league',
    teamName: 'Seu clube profissional',
    title: 'Temporada 1 • 1º turno da Liga Europeia',
    opponentName: 'Os clubes da Europa',
    opponentColor: '#f8fafc',
    opponentSecondary: '#111827',
    targetGoals: 99,
    matchDuration: 95,
    difficulty: 7,
    rivalEdgeCap: 0.45,
    unlocksBlueLock: true,
    unlocksNEL: true,
    rewardCoins: 900,
    rewardSpins: 5,
    rewardSP: 8,
    teammateIds: [],
    opponentIds: [],
    loreSummary: 'Sua primeira temporada como profissional. Escolha a proposta, entre no vestiário dos craques e comece a corrida pela Bola de Ouro.',
    introCutscene: [
      { speaker: 'FOX', text: '"Estreia profissional. Aqui ninguém liga pro seu título Sub-20. Aqui eles comem garotos como você no café da manhã. Mostra o monstro... ou vira comida."', mood: 'ego' }
    ],
    postMatchCutscene: [
      { speaker: 'NARRADOR', text: 'Metade da temporada. Os jornais da Europa já colocam o seu nome na lista da Bola de Ouro.', mood: 'tense' },
      { ifNotClub: 'marsella', speaker: 'FOX', text: '"Gostei. Mas tem um garoto de cabelo verde escuro lá no Marsella que lê cada manchete sobre você... e jurou te matar. Hehehe. Eu adoro quando prometem."', mood: 'ego' },
      { ifClub: 'marsella', speaker: 'FOX', text: '"Gostei. Mas o seu colega de cabelo verde escuro, aí no mesmo vestiário do Marsella, lê cada manchete sobre você... e jurou te passar. Hehehe. Eu adoro quando prometem."', mood: 'ego' }
    ]
  },
  {
    id: 'ch12_pro_season_2',
    chapterNumber: 17,
    mapTheme: 'nel_dome',
    era: 'CARREIRA PROFISSIONAL — RETA FINAL DA TEMPORADA',
    // Antes do 2º turno: o desafio do Rin (interlúdio); no fim, o ranking da Bola de Ouro
    // (App.finishProTurn). A gala da Bola de Ouro é uma só, no epílogo (ch14_rin_final)
    interlude: 'rin_rivalry',
    league: 'pro',
    leaguePhase: 1,
    format: 'league',
    teamName: 'Seu clube profissional',
    title: 'Temporada 1 • 2º turno e a Bola de Ouro',
    opponentName: 'Os clubes da Europa',
    opponentColor: '#f8fafc',
    opponentSecondary: '#111827',
    targetGoals: 99,
    matchDuration: 95,
    difficulty: 8,
    rivalEdgeCap: 0.5,
    unlocksBlueLock: true,
    unlocksNEL: true,
    rewardCoins: 1200,
    rewardSpins: 6,
    rewardSP: 10,
    teammateIds: [],
    opponentIds: [],
    loreSummary: 'A reta final da temporada. O Rin quer a Bola de Ouro tanto quanto você, e cada gol conta na corrida.',
    introCutscene: [
      { speaker: 'FOX', text: '"Últimos jogos. A Bola de Ouro se decide aqui. Ou você devora todo mundo... ou eu paro de perder tempo com você e vou atrás de outro monstro."', mood: 'ego' }
    ],
    postMatchCutscene: [
      { speaker: 'NARRADOR', text: 'A temporada acabou. Mas uma carta com o símbolo da seleção japonesa já está na sua caixa de correio.', mood: 'tense' }
    ]
  },
  // ==========================================================================
  // PRÉ-COPA: a convocação do Ego e a concentração com dois amistosos (format 'cup' com
  // friendly: perder um amistoso não elimina ninguém, só repete o jogo)
  // ==========================================================================
  {
    id: 'ch12b_wc_camp',
    chapterNumber: 18,
    mapTheme: 'u20_national',
    era: 'PRÉ-COPA — A SELEÇÃO PRINCIPAL',
    interlude: 'convocation',
    format: 'cup',
    friendly: true,
    cupLabel: 'AMISTOSOS',
    teamName: 'Seleção Principal do Japão',
    title: 'A Convocação e os Amistosos',
    opponentName: 'Portugal e Coreia do Sul',
    opponentColor: '#7f1d1d',
    opponentSecondary: '#15803d',
    homeColor: '#1d4ed8',
    homeSecondary: '#ffffff',
    targetGoals: 3,
    matchDuration: 100,
    difficulty: 8,
    rivalEdgeCap: 0.48,
    unlocksBlueLock: true,
    unlocksNEL: true,
    rewardCoins: 1500,
    rewardSpins: 6,
    rewardSP: 10,
    teammateIds: ['sae', 'rin', 'bachira', 'gagamaru'],
    opponentIds: [],
    cupRounds: [
      {
        name: 'AMISTOSO 1', label: 'PORTUGAL', rivalName: 'Portugal',
        opponentIds: ['gen_portugal_fw', 'gen_portugal_wg', 'gen_portugal_mf', 'gen_portugal_df', 'gk_portugal'], teammateIds: ['bachira', 'nagi', 'chigiri', 'gagamaru'],
        opponentColor: '#7f1d1d', opponentSecondary: '#15803d', difficulty: 8,
        intro: [
          { bg: 'locker_room', music: 'tension', speaker: 'NARRADOR', text: 'Centro de treinamento da seleção. Primeiro dia de concentração: vinte e seis egoístas no mesmo vestiário.', mood: 'tense' },
          { speaker: 'MEGURU BACHIRA', text: '"Ei, ei! Lembra quando a gente dividia um quarto no Blue Lock e o monstro só falava comigo? Agora ele fala com o país inteiro!"', mood: 'happy' },
          { speaker: 'SEISHIRO NAGI', text: '"Amistoso é chato... mas se der pra fazer gol de domínio, eu vou."', mood: 'normal' },
          { speaker: 'HYOMA CHIGIRI', text: '"Portugal joga bonito. Bonito não basta contra a gente."', mood: 'ego' },
          { speaker: 'JINPACHI EGO', text: '"Amistoso não existe. Cada minuto é uma audição para a Copa. Quem dormir em campo, assiste o Mundial pela TV."', mood: 'ego' }
        ]
      },
      {
        name: 'AMISTOSO 2', label: 'COREIA DO SUL', rivalName: 'Coreia do Sul',
        opponentIds: ['gen_korea_fw', 'gen_korea_wg', 'gen_korea_mf', 'gen_korea_df', 'gk_korea'], teammateIds: ['sae', 'rin', 'shidou', 'gagamaru'],
        opponentColor: '#dc2626', opponentSecondary: '#1e3a8a', difficulty: 8,
        intro: [
          { cinematic: 'camp_night' },
          { dark: true, bg: 'hotel_night', music: 'mystery', speaker: 'NARRADOR', text: 'Madrugada no hotel da seleção. Ninguém consegue dormir na véspera do último amistoso.', mood: 'tense' },
          { speaker: 'RIN ITOSHI', text: '"(na varanda, sem olhar pra você) Não pense que a gente é time. Na Copa eu jogo do seu lado... pra provar que eu sou melhor do seu lado."', mood: 'tense' },
          { speaker: 'SAE ITOSHI', text: '"(da porta) Os dois falam demais. Amanhã eu vou passar pra quem estiver mais livre. Só isso decide."', mood: 'ego' },
          { speaker: 'RYUSEI SHIDOU', text: '"Hahaha! Que clima de velório! Amanhã eu explodo a Coreia e vocês dois choram juntinhos!"', mood: 'happy' },
          { speaker: 'VOCÊ', text: '(O Rin, o Sae, o Shidou... todos querendo o mesmo gol. É assim que o Japão vai ganhar o mundo.)', mood: 'ego' }
        ]
      }
    ],
    loreSummary: 'O Ego anunciou os 26 da seleção principal. Antes da Copa, a concentração e dois amistosos: Portugal e Coreia do Sul. Perdeu um amistoso? O Ego manda jogar de novo.',
    introCutscene: [],
    postMatchCutscene: [
      { bg: 'auditorium', music: 'epic', speaker: 'NARRADOR', text: 'Coletiva de imprensa. Cem câmeras apontadas para a mesa da seleção.', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"Perguntaram qual é a meta do Japão. A meta não é \'passar das oitavas\'. A meta é sair da Copa com o maior atacante do planeta."', mood: 'ego' },
      { speaker: 'ANRI TEIERI', text: '"O voo sai amanhã às seis. A estreia é contra a Itália... e o Don Lorenzo já está dando entrevista dizendo que vai \'comer o seu valor\'."', mood: 'tense' },
      { speaker: 'VOCÊ', text: '"Deixa ele falar. A gente responde dentro de campo."', mood: 'ego' }
    ]
  },
  {
    id: 'ch13_world_cup',
    chapterNumber: 19,
    mapTheme: 'worldcup_final',
    era: 'COPA DO MUNDO — O GRANDE FINAL',
    // Fase de grupos (3 jogos, os 2 primeiros passam) e mata-mata em 5 jogos (format 'cup',
    // App.handleCupMatch). Rodadas com group: 'A' entram na tabela do grupo
    interlude: 'wc_opening',
    format: 'cup',
    groupName: 'GRUPO E',
    teamName: 'Seleção Principal do Japão',
    title: 'Copa do Mundo',
    opponentName: 'As melhores seleções do mundo',
    opponentColor: '#1e3a8a',
    opponentSecondary: '#ffffff',
    homeColor: '#1d4ed8',
    homeSecondary: '#ffffff',
    targetGoals: 3,
    matchDuration: 110,
    difficulty: 9,
    rivalEdgeCap: 0.5,
    unlocksBlueLock: true,
    unlocksNEL: true,
    rewardCoins: 3000,
    rewardSpins: 10,
    rewardSP: 15,
    teammateIds: ['sae', 'rin', 'shidou', 'gagamaru'],
    opponentIds: [],
    victorySakuga: 'wc_champion',
    // Os rivais do grupo (a tabela simula os outros jogos com essa força)
    groupTeams: { japao: { name: 'Japão', power: 0 }, italia: { name: 'Itália', power: 0.55 }, argentina: { name: 'Argentina', power: 0.6 }, nigeria: { name: 'Nigéria', power: 0.4 } },
    cupRounds: [
      {
        name: 'GRUPO • JOGO 1', label: 'ITÁLIA', rivalName: 'Itália (Don Lorenzo)', group: 'italia',
        opponentIds: ['lorenzo', 'gen_italy_fw', 'gen_italy_mf', 'gen_italy_df', 'gk_italy'], teammateIds: ['sae', 'rin', 'bachira', 'gagamaru'],
        opponentColor: '#1d4ed8', opponentSecondary: '#f8fafc', homeColor: '#f8fafc', homeSecondary: '#1d4ed8', difficulty: 8,
        intro: [
          { music: 'tension', speaker: 'NARRADOR MUNDIAL', text: '"Estreia do Japão na Copa do Mundo! Do outro lado, a Itália do zagueiro mais caro do planeta!"', mood: 'urgent' },
          { speaker: 'DON LORENZO', text: '"Hehehe... Eu li quanto vale a sua cabeça agora. Hoje eu janto ela. Com dente de ouro e tudo."', mood: 'ego' },
          { speaker: 'VOCÊ', text: '"Então mastiga devagar. Eu vou passar por entre os seus dentes."', mood: 'ego' }
        ]
      },
      {
        name: 'GRUPO • JOGO 2', label: 'ARGENTINA', rivalName: 'Argentina', group: 'argentina',
        opponentIds: ['gen_argentina_fw', 'gen_argentina_wg', 'gen_argentina_mf', 'gen_argentina_df', 'gk_argentina'], teammateIds: ['sae', 'rin', 'nagi', 'gagamaru'],
        opponentColor: '#7dd3fc', opponentSecondary: '#f8fafc', difficulty: 8,
        intro: [
          { speaker: 'NARRADOR MUNDIAL', text: '"A Argentina chega com a torcida mais barulhenta do torneio. O estádio inteiro canta contra o Japão!"', mood: 'urgent' },
          { speaker: 'SEISHIRO NAGI', text: '"Que barulho... Tá, eu acordo. Mas só porque o Reo prometeu me pagar um jogo novo se eu fizer gol."', mood: 'normal' }
        ]
      },
      {
        name: 'GRUPO • JOGO 3', label: 'NIGÉRIA', rivalName: 'Nigéria', group: 'nigeria',
        opponentIds: ['gen_nigeria_fw', 'gen_nigeria_wg', 'gen_nigeria_mf', 'gen_nigeria_df', 'gk_nigeria'], teammateIds: ['sae', 'rin', 'chigiri', 'gagamaru'],
        opponentColor: '#16a34a', opponentSecondary: '#f8fafc', difficulty: 8,
        intro: [
          { speaker: 'NARRADOR MUNDIAL', text: '"Última rodada do grupo! A Nigéria é a seleção mais rápida da Copa... e o Japão precisa dos pontos!"', mood: 'urgent' },
          { speaker: 'HYOMA CHIGIRI', text: '"A mais rápida da Copa? Hah. Ninguém me avisou que tinha competição."', mood: 'ego' }
        ]
      },
      {
        name: '16-AVOS DE FINAL', label: 'ALEMANHA', rivalName: 'Alemanha (Kaiser & Ness)',
        opponentIds: ['kaiser', 'ness', 'grim', 'birkenstock', 'gk_germany'], teammateIds: ['sae', 'rin', 'bachira', 'gagamaru'],
        opponentColor: '#f8fafc', opponentSecondary: '#111827', difficulty: 8,
        intro: [
          { speaker: 'MICHAEL KAISER', text: '"Copa do Mundo, Japão. Aqui o imperador não perde. Ajoelha."', mood: 'ego' },
          { speaker: 'ALEXIS NESS', text: '"O Kaiser vai te apagar logo no primeiro jogo!"', mood: 'tense' }
        ]
      },
      {
        name: 'OITAVAS DE FINAL', label: 'INGLATERRA', rivalName: 'Inglaterra (Chris Prince & Agi)',
        opponentIds: ['chris_prince', 'agi', 'teddy_knight', 'blake', 'gk_england'], teammateIds: ['sae', 'rin', 'chigiri', 'gagamaru'],
        opponentColor: '#ffffff', opponentSecondary: '#dc2626', difficulty: 8,
        intro: [{ speaker: 'CHRIS PRINCE', text: '"Revanche da Sub-20! Agora com o MEU corpo de elite em campo. Vamos ver quem aguenta 90 minutos!"', mood: 'ego' }]
      },
      {
        name: 'QUARTAS DE FINAL', label: 'ESPANHA', rivalName: 'Espanha (Bunny & Luna)',
        opponentIds: ['bunny', 'luna', 'lara', 'gen_spain', 'gk_spain'], teammateIds: ['sae', 'rin', 'nagi', 'gagamaru'],
        opponentColor: '#dc2626', opponentSecondary: '#facc15', difficulty: 9,
        intro: [
          { speaker: 'BUNNY IGLESIAS', text: '"Lembra do café em Barcelona, japonês? Eu disse que a Copa ia ser o mais perto que você chega do meu nível. Hoje você vê de perto."', mood: 'ego' },
          { speaker: 'VOCÊ', text: '"Lembro. E hoje você vai sair do campo sem esse sorriso."', mood: 'ego' }
        ]
      },
      {
        name: 'SEMIFINAL', label: 'BRASIL', rivalName: 'Brasil (Lavinho & Dada Silva)',
        opponentIds: ['lavinho', 'dada_silva', 'gen_brazil_fw', 'gen_brazil_mf', 'gk_brazil'], teammateIds: ['sae', 'rin', 'shidou', 'gagamaru'],
        opponentColor: '#facc15', opponentSecondary: '#16a34a', difficulty: 9,
        intro: [{ speaker: 'LAVINHO', text: '"Semifinal de Copa, amigo! O Brasil não joga contra você: o Brasil DANÇA em cima de você!"', mood: 'happy' }]
      },
      {
        name: 'FINAL', label: 'FRANÇA', rivalName: 'França (Noel Noa, Loki & Hugo)',
        opponentIds: ['noa', 'loki', 'hugo', 'charles', 'gk_france'], teammateIds: ['sae', 'rin', 'shidou', 'gagamaru'],
        opponentColor: '#1e3a8a', opponentSecondary: '#ffffff', homeColor: '#f8fafc', homeSecondary: '#1d4ed8', difficulty: 10,
        intro: [
          { music: 'epic', speaker: 'NARRADOR MUNDIAL', text: '"É A GRANDE FINAL DA COPA DO MUNDO! JAPÃO x FRANÇA!"', mood: 'urgent' },
          { speaker: 'NOEL NOA', text: '"O número 1 do mundo contra o garoto que eu vi crescer na NEL. Os números dizem que eu ganho. Prove que os números estão errados."', mood: 'ego' },
          { speaker: 'JULIAN LOKI', text: '"Eu e o Hugo prometemos ganhar a Copa juntos. A Sub-20 era só o começo."', mood: 'ego' },
          { speaker: 'HUGO', text: '"Dessa vez não tem flashback, Japão. Dessa vez a promessa se cumpre."', mood: 'ego' },
          { music: 'none', speaker: 'SAE ITOSHI', text: '"Vai. O passe vai chegar onde você estiver."', mood: 'ego' }
        ]
      }
    ],
    loreSummary: 'A Copa do Mundo de verdade, com a seleção principal. Primeiro a fase de grupos (Itália, Argentina e Nigéria: os 2 primeiros passam), depois cinco jogos de mata-mata contra as seleções mais fortes do planeta. No fim, a França de Noel Noa, Loki e Hugo.',
    introCutscene: [],
    postMatchCutscene: [
      { music: 'victory', speaker: 'NARRADOR MUNDIAL', text: '"APITA O ÁRBITRO! O JAPÃO É CAMPEÃO DA COPA DO MUNDO!"', mood: 'urgent' },
      { speaker: 'JINPACHI EGO', text: '"Da final perdida no colégio ao topo do planeta. O Blue Lock existiu para este momento. O maior atacante do mundo é japonês... e egoísta."', mood: 'ego' },
      { speaker: 'SAE ITOSHI', text: '"...Bom gol. O passe foi meu, mas o gol foi seu."', mood: 'ego' },
      { speaker: 'RIN ITOSHI', text: '"Aproveita a taça. Amanhã eu volto a te caçar. Eu não esqueci."', mood: 'tense' },
      // O acerto de contas com o Fox: ele queria o monstro pra ele
      { bg: 'tunnel', music: 'dread', speaker: 'NARRADOR', text: 'No túnel, longe da festa, alguém te espera encostado na parede, girando o dedo.', mood: 'tense' },
      { speaker: 'FOX', text: '"Hehehe... Campeão do mundo. Agora vem comigo: tem clube, tem contrato, tem um planeta inteiro pra devorar. O monstro é o MEU melhor investimento."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '"Não. O monstro sempre foi meu. Você só abriu a jaula."', mood: 'ego' },
      { speaker: 'FOX', text: '"...Hehe. Hehehehe. Então tá. Mas jaula aberta não fecha mais, garoto. Um dia você vai sentir saudade da coleira."', mood: 'ego' },
      { speaker: 'NARRADOR', text: 'Ele some no escuro do túnel. A risada demora pra parar.', mood: 'tense' },
      { music: 'victory', speaker: 'VOCÊ', text: '(Pode rir. Eu vou continuar com fome... do meu jeito.)', mood: 'ego' },
      { bg: 'night_home', speaker: 'TADA (SEU AMIGO)', text: '"(pela TV, chorando de rir) EU SABIA! Ele chutou! Desde aquela final, ele SEMPRE chuta!"', mood: 'happy' },
      // O gancho do epílogo: o Rin não comemorou
      { bg: 'locker_room', music: 'dread', speaker: 'NARRADOR', text: 'Madrugada. O vestiário vazio ainda cheira a champanhe. Só uma pessoa não comemorou.', mood: 'tense' },
      { speaker: 'RIN ITOSHI', text: '"Campeão do mundo... do seu lado. Isso não conta. Eu quero o que o Ego prometeu no primeiro dia: o número 1 do Blue Lock. Só existe um."', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"(no alto-falante do vestiário) ...Eu ouvi. O Blue Lock nunca decidiu o seu número 1. Daqui a uma semana, no estádio do Blue Lock. Você contra o Rin. Sem seleção, sem clube. Só ego."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '"Fechado. A última peça do quebra-cabeça."', mood: 'ego' }
    ]
  },
  // ==========================================================================
  // EPÍLOGO: o último duelo contra o Rin, a Bola de Ouro e o destino de cada um
  // ==========================================================================
  {
    id: 'ch14_rin_final',
    chapterNumber: 20,
    mapTheme: 'bluelock_holo',
    era: 'EPÍLOGO — O ÚLTIMO DUELO',
    interlude: 'rin_final_eve',
    teamName: 'Time do Herói (Blue Lock)',
    title: 'O Último Duelo: Você x Rin Itoshi',
    opponentName: 'Time do Rin (Rin, Shidou, Barou, Reo & Gagamaru)',
    opponentColor: '#0f766e',
    opponentSecondary: '#020617',
    homeColor: '#0f2942',
    homeSecondary: '#38bdf8',
    targetGoals: 3,
    matchDuration: 110,
    difficulty: 10,
    rivalEdgeCap: 0.55,
    unlocksBlueLock: true,
    unlocksNEL: true,
    rewardCoins: 5000,
    rewardSpins: 12,
    rewardSP: 20,
    teammateIds: ['bachira', 'nagi', 'chigiri', 'kunigami'],
    opponentIds: ['rin', 'shidou', 'barou', 'reo', 'gagamaru'],
    scoreLabels: { home: 'VOCÊ', away: 'RIN' },
    // O Rin abre o placar cedo: o duelo começa com você correndo atrás
    script: { goals: [{ team: 'away', shooterId: 'rin', deadline: 75 }] },
    loreSummary: 'Uma semana depois da Copa, no estádio do Blue Lock vazio: você contra o Rin pelo número 1. Quem fizer 3 gols primeiro fica com o nome no topo para sempre.',
    introCutscene: [
      { speaker: 'RIN ITOSHI', text: '"Sem Sae, sem Ego, sem Fox. Só eu e você. Eu escolhi os meus quatro. Escolhe os seus e vem morrer."', mood: 'tense' },
      { speaker: 'MEGURU BACHIRA', text: '"O monstro do Rin tá acordado... o meu também. Vamos brincar uma última vez, parceiro!"', mood: 'happy' }
    ],
    midMatchLore: {
      triggerTime: 55,
      lines: [
        { speaker: 'RIN ITOSHI', text: '"Isso. ISSO! É só com você que o meu futebol fica desse tamanho! NÃO PARA AGORA!"', mood: 'urgent' },
        { speaker: 'VOCÊ', text: '(Ele está sorrindo... pela primeira vez, o Rin está sorrindo em campo.)', mood: 'ego' }
      ]
    },
    postMatchCutscene: [
      { cinematic: 'rin_final_end' },
      { speaker: 'RIN ITOSHI', text: '"(deitado na grama, ofegante) ...Hah. Hah. Eu odeio você."', mood: 'tense' },
      { speaker: 'VOCÊ', text: '"Eu sei."', mood: 'ego' },
      { speaker: 'RIN ITOSHI', text: '"Amanhã eu acordo e começo de novo. E um dia... eu passo de você. De verdade."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '"Vou estar te esperando lá na frente."', mood: 'ego' },
      { speaker: 'JINPACHI EGO', text: '"O número 1 do Blue Lock agora tem nome. E o número 2 vai passar a vida inteira tentando apagar esse nome. Perfeito. Esse é o futebol que eu queria."', mood: 'ego' },
      // A Bola de Ouro: uma gala só (decisão do dono, 13/11/2026). A 53 abre a cerimônia (o
      // nome sai para a rua junto com a fala da apresentadora, dentro da cena), a 54 é o
      // discurso no palco (o Rin sai pelos fundos) e a 55 é o Sae parando o Rin no corredor
      // do hotel — antes as duas tocavam no fim da temporada profissional (App.finishProTurn)
      { dark: false, bg: 'paris_gala', music: 'epic', speaker: 'NARRADOR', text: 'Paris, um mês depois. A noite da Bola de Ouro.', mood: 'tense' },
      { cinematic: 'ballon_dor' },
      { cinematic: 'bola_de_ouro_discurso' },
      { speaker: 'NOEL NOA', text: '"(aplaudindo de pé) ...Os números estavam errados. Ótimo."', mood: 'ego' },
      { cinematic: 'rin_sae_licao' },
      // A última aparição do Fox
      { dark: true, bg: 'tunnel', music: 'dread', speaker: 'NARRADOR', text: 'Na saída dos fundos, um charuto aceso no escuro. Um homem girando o dedo.', mood: 'tense' },
      { speaker: 'FOX', displayName: '???', shadowFace: true, text: '"Hehehe... Bola de Ouro. Eu te disse que a jaula não fechava mais."', mood: 'ego' },
      { speaker: 'FOX', displayName: '???', shadowFace: true, text: '"Tem um garoto de 14 anos num campinho de terra no Brasil. Fome nos olhos. Ele me lembra você... antes de ficar caro."', mood: 'happy' },
      { speaker: 'VOCÊ', text: '"Se encostar nele, eu vou atrás de você."', mood: 'ego' },
      { speaker: 'FOX', displayName: '???', shadowFace: true, text: '"Hehehehe! Viu? O monstro ainda tem dono. Ele só mudou de lado..."', mood: 'ego' },
      { speaker: 'NARRADOR', text: 'Quando você olha de novo, só sobrou a fumaça.', mood: 'tense' },
      // O destino de cada um
      { cinematic: 'epilogue_destinies' },
      { dark: false, music: 'promise', bg: 'school_sunset', speaker: 'TADA (SEU AMIGO)', text: '"(no campinho do colégio, com uma bola velha) Ei, {NOME}. Chuta uma pra mim, como antigamente?"', mood: 'happy' },
      { speaker: 'VOCÊ', text: '"Sempre. Mas dessa vez... eu não passo. Eu chuto."', mood: 'ego' },
      { cinematic: 'credits' },
      { music: 'none', speaker: 'NARRADOR', text: 'FIM. Obrigado por jogar BLUE LOCK: EGOIST CAREER.', mood: 'ego' }
    ]
  }
];

// ============================================================================
// RANKING DO BLUE LOCK: a sua posição depois de concluir cada capítulo (como o
// Isagi, você entra em 299º e sobe até o 1º). O Ego anuncia no pós-jogo.
// ============================================================================
window.BLUE_LOCK_RANKING = {
  ch0_prologue: 299,
  ch1_first_selection_x_y: 271,
  ch1b_team_y: 262,
  ch1c_team_w: 247,
  ch2_first_selection_v: 208,
  ch2b_second_selection: 112,
  ch3_second_selection_world5: 41,
  ch4_third_selection: 17,
  ch4b_trio_tournament: 9,
  ch5_u20_japan: 6,
  ch5b_wild_card: 5,
  ch6_nel_barcha_manshine: 3,
  ch7_nel_ubers_pxg: 1,
  ch8_u20_england: 1,
  ch9_world_cup_final: 1,
  ch10_fox_training: 1,
  ch11_pro_season_1: 1,
  ch12_pro_season_2: 1,
  ch12b_wc_camp: 1,
  ch13_world_cup: 1,
  ch14_rin_final: 1
};

// ============================================================================
// OS 5 CLUBES DA NEL (você escolhe o seu antes da 1ª partida da Liga)
// • phases[0] / phases[1] substituem os campos dos capítulos com nelPhase 0 / 1
//   (o Bastard München usa o que já está nos capítulos).
// • color / secondary = uniforme do seu time; os rivais usam o kit do 1º clube rival.
// ============================================================================
const NEL_KITS = {
  bastard: ['#111827', '#dc2626'],
  manshine: ['#7dd3fc', '#0c4a6e'],
  barcha: ['#7f1d1d', '#1e40af'],
  ubers: ['#e5e7eb', '#111827'],
  pxg: ['#1e1b4b', '#e11d48']
};
const NEL_LAST_WORD = { speaker: 'JINPACHI EGO', text: '"A Liga Neo Egoísta chegou ao fim e você conquistou o topo do ranking salarial! Os 23 convocados para a Copa do Mundo Sub-20 saem daqui... e você é um deles."', mood: 'ego' };

window.NEL_CLUBS = {
  bastard: {
    id: 'bastard',
    name: 'Bastard München',
    country: 'Alemanha',
    master: 'noa',
    style: 'Futebol racional: cada um por si, só os números importam.',
    blueLock: 'Hiori, Kurona, Kiyora, Gagamaru',
    color: NEL_KITS.bastard[0],
    secondary: NEL_KITS.bastard[1],
    phases: [
      {},
      // Na reta final o Kaiser é seu companheiro, então quem fecha o ataque rival é o Loki
      {
        opponentName: 'Ubers & PXG (Marc Snuffy, Don Lorenzo, Charles, Julian Loki & Drago)',
        opponentIds: ['snuffy', 'lorenzo', 'charles', 'loki', 'drago']
      }
    ]
  },
  manshine: {
    id: 'manshine',
    name: 'Manshine City',
    country: 'Inglaterra',
    master: 'chris_prince',
    style: 'Performance física: o corpo é a arma mais forte.',
    blueLock: 'Nagi, Chigiri, Reo, Kunigami, Niou',
    color: NEL_KITS.manshine[0],
    secondary: NEL_KITS.manshine[1],
    phases: [
      {
        teamName: 'Manshine City (NEL)',
        title: 'NEL: FC Barcha (Lavinho & Bunny) e Bastard München (Kaiser & Ness)',
        opponentName: 'FC Barcha & Bastard (Lavinho, Kaiser, Bunny, Ness & Gagamaru)',
        opponentColor: NEL_KITS.barcha[0],
        opponentSecondary: NEL_KITS.barcha[1],
        teammateIds: ['chris_prince', 'nagi', 'chigiri', 'reo'],
        opponentIds: ['lavinho', 'kaiser', 'bunny', 'ness', 'gagamaru'],
        loreSummary: 'Com a camisa celeste do Manshine City, você joga ao lado de Chris Prince, Nagi, Chigiri e Reo contra a ginga do FC Barcha e o império do Bastard München!',
        introCutscene: [
          { speaker: 'CHRIS PRINCE', text: '"Bem-vindo ao Manshine! Aqui a gente treina o corpo até ele virar a arma perfeita. Mostre performance, garoto!"', mood: 'ego' },
          { speaker: 'SEISHIRO NAGI', text: '"Ah... você veio pro mesmo time que eu? Que bom. Assim dá menos trabalho."', mood: 'normal' },
          { speaker: 'RENSUKE KUNIGAMI', text: '"...Mesmo time. Não muda nada. Eu marco, você fica no caminho ou sai dele."', mood: 'tense' },
          { speaker: 'MICHAEL KAISER', text: '"Manshine? Um time de academia. Vou esmagar todos vocês com o meu Kaiser Impact."', mood: 'ego' }
        ],
        midMatchLore: {
          triggerTime: 55,
          lines: [{ speaker: 'HYOMA CHIGIRI', text: '"Deixa o lado esquerdo comigo! Ninguém me alcança quando eu acelero!"', mood: 'ego' }]
        },
        postMatchCutscene: [
          { speaker: 'REO MIKAGE', text: '"Viu isso, Nagi? A nossa química com ele tá ficando perigosa!"', mood: 'happy' },
          { speaker: 'CHRIS PRINCE', text: '"Fantástico! Seu valor no leilão subiu. Mas esse corpo ainda pode render mais. Treino amanhã às 6!"', mood: 'happy' },
          { speaker: 'VOCÊ', text: '(Velocidade, força, físico... Eu vou devorar tudo o que o Manshine tem.)', mood: 'ego' }
        ]
      },
      {
        teamName: 'Manshine City Despertado',
        title: 'NEL Final: Ubers (Snuffy & Lorenzo) e os Invictos do PXG (Loki & Charles)',
        opponentName: 'Ubers & PXG (Marc Snuffy, Julian Loki, Don Lorenzo, Charles & Fukaku)',
        opponentColor: NEL_KITS.ubers[0],
        opponentSecondary: NEL_KITS.ubers[1],
        teammateIds: ['chris_prince', 'nagi', 'chigiri', 'kunigami'],
        opponentIds: ['snuffy', 'loki', 'lorenzo', 'charles', 'fukaku'],
        loreSummary: 'A decisão da NEL! O Manshine City enfrenta o sistema perfeito da Ubers e a velocidade do invicto PXG de Julian Loki.',
        introCutscene: [
          { speaker: 'MARC SNUFFY', text: '"Físico não quebra um sistema. Cada passo de vocês já está no meu caderno."', mood: 'tense' },
          { speaker: 'JULIAN LOKI', text: '"Manshine... vocês treinam velocidade? Então vamos ver quem é o mais rápido de verdade."', mood: 'ego' },
          { speaker: 'CHRIS PRINCE', text: '"Último jogo da NEL! Quero ver o melhor corpo do mundo em campo: o SEU!"', mood: 'ego' }
        ],
        midMatchLore: {
          triggerTime: 50,
          lines: [{ speaker: 'SEISHIRO NAGI', text: '"Manda a bola alta. Eu domino de qualquer jeito... depois é com você."', mood: 'normal' }]
        },
        postMatchCutscene: [
          { speaker: 'HYOMA CHIGIRI', text: '"A gente conseguiu! Eu nunca corri tanto na minha vida!"', mood: 'happy' },
          { speaker: 'RENSUKE KUNIGAMI', text: '"...Bom jogo." *pela primeira vez desde o Wild Card, a voz dele treme um pouco*', mood: 'normal' },
          { speaker: 'CHRIS PRINCE', text: '"Os clubes ingleses estão loucos por você. Mas primeiro vem a Copa, não é?"', mood: 'ego' },
          NEL_LAST_WORD
        ]
      }
    ]
  },
  barcha: {
    id: 'barcha',
    name: 'FC Barcha',
    country: 'Espanha',
    master: 'lavinho',
    style: 'Ginga e criatividade: imagine o melhor do mundo na sua cabeça e dance.',
    blueLock: 'Bachira, Otoya, Darai, Himizu',
    color: NEL_KITS.barcha[0],
    secondary: NEL_KITS.barcha[1],
    phases: [
      {
        teamName: 'FC Barcha (NEL)',
        title: 'NEL: Manshine City (Chris Prince & Nagi) e Ubers (Snuffy & Lorenzo)',
        opponentName: 'Manshine & Ubers (Chris Prince, Snuffy, Nagi, Don Lorenzo & Fukaku)',
        opponentColor: NEL_KITS.manshine[0],
        opponentSecondary: NEL_KITS.manshine[1],
        teammateIds: ['lavinho', 'bunny', 'bachira', 'lara'],
        opponentIds: ['chris_prince', 'snuffy', 'nagi', 'lorenzo', 'fukaku'],
        loreSummary: 'Com a camisa grená do FC Barcha, você dança ao lado de Lavinho, Bunny, Bachira e Lara contra o físico do Manshine City e o sistema da Ubers!',
        introCutscene: [
          { speaker: 'LAVINHO', text: '"Bem-vindo ao Barcha, amigo! Aqui não tem esquema: imagina o melhor jogador do mundo na sua cabeça e DANÇA!"', mood: 'happy' },
          { speaker: 'MEGURU BACHIRA', text: '"Você veio pro Barcha! Agora a gente dança junto de novo, parceiro!"', mood: 'happy' },
          { speaker: 'CHRIS PRINCE', text: '"Ginga não ganha de físico. Vou te mostrar o que é performance de verdade!"', mood: 'ego' }
        ],
        midMatchLore: {
          triggerTime: 55,
          lines: [{ speaker: 'BUNNY IGLESIAS', text: '"Ei, novato! Toca de calcanhar se tiver coragem!"', mood: 'happy' }]
        },
        postMatchCutscene: [
          { speaker: 'LAVINHO', text: '"HAHAHA! Isso foi samba, amigo! O mundo inteiro viu o seu drible!"', mood: 'happy' },
          { speaker: 'MEGURU BACHIRA', text: '"O meu monstro e o seu estão brincando juntos... que delícia!"', mood: 'happy' },
          { speaker: 'VOCÊ', text: '(Eu achava que futebol era só cálculo. Mas dançar também é devorar.)', mood: 'ego' }
        ]
      },
      {
        teamName: 'FC Barcha Despertado',
        title: 'NEL Final: os Invictos do PXG (Loki & Charles) e Bastard München (Kaiser & Ness)',
        opponentName: 'PXG & Bastard (Julian Loki, Michael Kaiser, Charles, Ness & Gagamaru)',
        opponentColor: NEL_KITS.pxg[0],
        opponentSecondary: NEL_KITS.pxg[1],
        teammateIds: ['lavinho', 'bachira', 'otoya', 'darai'],
        opponentIds: ['loki', 'kaiser', 'charles', 'ness', 'gagamaru'],
        loreSummary: 'A decisão da NEL! O FC Barcha enfrenta o invicto PXG de Julian Loki e o império do Michael Kaiser.',
        introCutscene: [
          { speaker: 'MICHAEL KAISER', text: '"Os dançarinos do Barcha. Vou transformar essa festa num funeral."', mood: 'ego' },
          { speaker: 'EITA OTOYA', text: '"Relaxa. Eu sumo do radar deles e apareço onde você precisar."', mood: 'normal' },
          { speaker: 'LAVINHO', text: '"Último jogo da NEL! Quero ver aquele sorriso de quem se diverte jogando!"', mood: 'happy' }
        ],
        midMatchLore: {
          triggerTime: 50,
          lines: [{ speaker: 'MEGURU BACHIRA', text: '"Agora! Eu puxo dois marcadores e você entra no buraco!"', mood: 'ego' }]
        },
        postMatchCutscene: [
          { speaker: 'EITA OTOYA', text: '"Ninguém viu a gente chegando. Nem o Kaiser."', mood: 'happy' },
          { speaker: 'LAVINHO', text: '"O Barcha queria você pra sempre... mas a Copa está te chamando, amigo."', mood: 'happy' },
          NEL_LAST_WORD
        ]
      }
    ]
  },
  ubers: {
    id: 'ubers',
    name: 'Ubers',
    country: 'Itália',
    master: 'snuffy',
    style: 'O sistema perfeito: defesa de ferro e contra-ataque mortal.',
    blueLock: 'Barou, Aryu, Niko, Aiku',
    color: NEL_KITS.ubers[0],
    secondary: NEL_KITS.ubers[1],
    phases: [
      {
        teamName: 'Ubers (NEL)',
        title: 'NEL: FC Barcha (Lavinho & Bunny) e Bastard München (Kaiser & Ness)',
        opponentName: 'FC Barcha & Bastard (Lavinho, Kaiser, Bunny, Ness & Gagamaru)',
        opponentColor: NEL_KITS.barcha[0],
        opponentSecondary: NEL_KITS.barcha[1],
        teammateIds: ['snuffy', 'barou', 'lorenzo', 'fukaku'],
        opponentIds: ['lavinho', 'kaiser', 'bunny', 'ness', 'gagamaru'],
        loreSummary: 'Na fortaleza italiana da Ubers, você joga com Marc Snuffy, Barou e Don Lorenzo contra a ginga do FC Barcha e o império do Bastard München!',
        introCutscene: [
          { speaker: 'MARC SNUFFY', text: '"Bem-vindo à Ubers. Aqui o sistema vem antes de tudo. Se for quebrar o sistema... que seja para marcar."', mood: 'tense' },
          { speaker: 'SHOUEI BAROU', text: '"Você no meu time? Hah. Nem pense em encostar na bola que é do Rei."', mood: 'ego' },
          { speaker: 'DON LORENZO', text: '"Hehehe... fica tranquilo. Eu como os tornozelos deles e você só empurra pro gol."', mood: 'ego' }
        ],
        midMatchLore: {
          triggerTime: 55,
          lines: [{ speaker: 'MARC SNUFFY', text: '"Agora! Contra-ataque! Corra para o espaço que eu desenhei!"', mood: 'urgent' }]
        },
        postMatchCutscene: [
          { speaker: 'SHOUEI BAROU', text: '"...Tsc. Aquele gol foi digno de um rei. Não se acostuma."', mood: 'ego' },
          { speaker: 'MARC SNUFFY', text: '"Você foi o erro mais bonito do meu sistema hoje. Continue errando assim."', mood: 'ego' },
          { speaker: 'VOCÊ', text: '(Ler o sistema... e quebrar ele na hora certa. É isso que a Ubers vai me ensinar.)', mood: 'ego' }
        ]
      },
      {
        teamName: 'Ubers Despertado',
        title: 'NEL Final: os Invictos do PXG (Loki & Charles) e Manshine City (Chris Prince & Nagi)',
        opponentName: 'PXG & Manshine (Julian Loki, Chris Prince, Charles, Nagi & Niou)',
        opponentColor: NEL_KITS.pxg[0],
        opponentSecondary: NEL_KITS.pxg[1],
        teammateIds: ['snuffy', 'barou', 'aryu', 'fukaku'],
        opponentIds: ['loki', 'chris_prince', 'charles', 'nagi', 'niou'],
        loreSummary: 'A decisão da NEL! A Ubers enfrenta a velocidade do invicto PXG e o físico do Manshine City.',
        introCutscene: [
          { speaker: 'JULIAN LOKI', text: '"A Ubers tem a melhor defesa da Europa. Mas defesa nenhuma alcança quem corre mais que o som."', mood: 'ego' },
          { speaker: 'JYUBEI ARYU', text: '"Fique calmo e elegante. Tudo o que vier pelo alto é meu."', mood: 'ego' },
          { speaker: 'MARC SNUFFY', text: '"Último jogo da NEL. Quero ver o seu ego e o meu sistema na mesma frequência."', mood: 'tense' }
        ],
        midMatchLore: {
          triggerTime: 50,
          lines: [{ speaker: 'SHOUEI BAROU', text: '"Sai da frente! ...Não. Vem junto. Dois reis no ataque!"', mood: 'ego' }]
        },
        postMatchCutscene: [
          { speaker: 'JYUBEI ARYU', text: '"Que vitória elegante. Até o meu cabelo está brilhando mais."', mood: 'happy' },
          { speaker: 'MARC SNUFFY', text: '"A Itália não esquece quem vence com a camisa da Ubers."', mood: 'ego' },
          NEL_LAST_WORD
        ]
      }
    ]
  },
  pxg: {
    id: 'pxg',
    name: 'PXG',
    country: 'França',
    master: 'loki',
    style: 'Elite: velocidade, precisão e o elenco mais caro da Liga.',
    blueLock: 'Rin, Shidou, Karasu, Zantetsu',
    color: NEL_KITS.pxg[0],
    secondary: NEL_KITS.pxg[1],
    phases: [
      {
        teamName: 'PXG (NEL)',
        title: 'NEL: Manshine City (Chris Prince & Nagi) e Ubers (Snuffy & Lorenzo)',
        opponentName: 'Manshine & Ubers (Chris Prince, Snuffy, Nagi, Don Lorenzo & Fukaku)',
        opponentColor: NEL_KITS.manshine[0],
        opponentSecondary: NEL_KITS.manshine[1],
        teammateIds: ['loki', 'rin', 'charles', 'karasu'],
        opponentIds: ['chris_prince', 'snuffy', 'nagi', 'lorenzo', 'fukaku'],
        loreSummary: 'No invicto PXG, você joga com Julian Loki, Rin, Charles e Karasu contra o físico do Manshine City e o sistema da Ubers!',
        introCutscene: [
          { speaker: 'JULIAN LOKI', text: '"Bem-vindo ao PXG. Aqui só fica quem acompanha a minha velocidade. Corra."', mood: 'ego' },
          { speaker: 'RIN ITOSHI', text: '"Você veio pro PXG? ...Não me atrapalha. O gol é meu."', mood: 'tense' },
          { speaker: 'CHARLES CHEVALIER', text: '"Bleh! Finalmente alguém novo pra receber os meus passes impossíveis!"', mood: 'happy' }
        ],
        midMatchLore: {
          triggerTime: 55,
          lines: [{ speaker: 'TABITO KARASU', text: '"Eu seguro o meio. Vai lá e prova que eu te medi errado."', mood: 'ego' }]
        },
        postMatchCutscene: [
          { speaker: 'RIN ITOSHI', text: '"...Nada mal. Mas o próximo gol é meu."', mood: 'ego' },
          { speaker: 'JULIAN LOKI', text: '"Seus números estão acima do previsto. Ainda está longe de mim... mas está vindo."', mood: 'ego' },
          { speaker: 'VOCÊ', text: '(Jogar do lado do Loki é o melhor jeito de aprender a passar dele.)', mood: 'ego' }
        ]
      },
      {
        teamName: 'PXG Despertado',
        title: 'NEL Final: Bastard München (Kaiser & Ness) e FC Barcha (Lavinho & Bunny)',
        opponentName: 'Bastard & FC Barcha (Michael Kaiser, Lavinho, Ness, Bunny & Gagamaru)',
        opponentColor: NEL_KITS.bastard[0],
        opponentSecondary: NEL_KITS.bastard[1],
        teammateIds: ['loki', 'rin', 'shidou', 'karasu'],
        opponentIds: ['kaiser', 'lavinho', 'ness', 'bunny', 'gagamaru'],
        loreSummary: 'A decisão da NEL! O invicto PXG enfrenta o império do Kaiser e a ginga do FC Barcha.',
        introCutscene: [
          { speaker: 'MICHAEL KAISER', text: '"PXG... o time dos invictos. Hoje a invencibilidade de vocês acaba."', mood: 'ego' },
          { speaker: 'RYUSEI SHIDOU', text: '"Ei, Rin! E você, novato! Vamos EXPLODIR esse estádio juntos!"', mood: 'ego' },
          { speaker: 'JULIAN LOKI', text: '"Último jogo da NEL. Quero ver você correr na minha velocidade."', mood: 'ego' }
        ],
        midMatchLore: {
          triggerTime: 50,
          lines: [{ speaker: 'RIN ITOSHI', text: '"Destrói tudo! Se você não marcar, eu marco!"', mood: 'ego' }]
        },
        postMatchCutscene: [
          { speaker: 'RYUSEI SHIDOU', text: '"BIG BANG!! O Kaiser ficou olhando a bola entrar! HAHAHA!"', mood: 'ego' },
          { speaker: 'JULIAN LOKI', text: '"Na Copa eu jogo pela França. Lá você vai estar do outro lado... e eu vou estar esperando."', mood: 'ego' },
          NEL_LAST_WORD
        ]
      }
    ]
  }
};
window.NEL_CLUB_ORDER = ['bastard', 'manshine', 'barcha', 'ubers', 'pxg'];

// ============================================================================
// A LIGA NEO EGOÍSTA: 5 clubes em turno e returno = 8 jogos para cada um.
// O Cap. 7 é o 1º turno (seus jogos 1-4) e o Cap. 8 o 2º turno (jogos 5-8).
// Partidas 7 contra 7. Depois de cada jogo: placares da rodada, tabela e o
// ranking de valor de mercado (os 23 mais valiosos vão para a Copa Sub-20).
// ============================================================================
window.NEL_GAMES_PER_CHAPTER = 4;

// Elenco de 7 de cada clube (o último é o goleiro). No seu clube, você entra no
// lugar do 6º da lista.
window.NEL_ROSTERS = {
  bastard: ['noa', 'kaiser', 'ness', 'kurona', 'hiori', 'yukimiya', 'gagamaru'],
  // O Kunigami chega do Wild Card direto para o Manshine (como no mangá)
  manshine: ['chris_prince', 'nagi', 'chigiri', 'reo', 'kunigami', 'niou', 'gk_manshine'],
  barcha: ['lavinho', 'bunny', 'bachira', 'otoya', 'lara', 'darai', 'gk_barcha'],
  ubers: ['snuffy', 'barou', 'lorenzo', 'aryu', 'niko', 'aiku', 'fukaku'],
  pxg: ['loki', 'rin', 'shidou', 'charles', 'karasu', 'zantetsu', 'gk_pxg']
};

// Goleiros dos clubes que não têm um goleiro entre os personagens
window.NEL_KEEPERS = [
  { id: 'gk_manshine', name: 'Goleiro do Manshine', pos: 'GK', ovr: 88, number: 1, team: 'Manshine City', skinColor: '#f1d3bd', hairColor: '#7c4a1e', hairSecondary: '#a16207', eyeColor: '#1d4ed8', hairStyle: 'short_sharp', jerseyPrimary: '#7dd3fc', jerseySecondary: '#0c4a6e', auraColor: '#7dd3fc', weaponName: 'Luvas de Manchester', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  { id: 'gk_barcha', name: 'Goleiro do Barcha', pos: 'GK', ovr: 88, number: 1, team: 'FC Barcha', skinColor: '#d9a77f', hairColor: '#1c1917', hairSecondary: '#44403c', eyeColor: '#78350f', hairStyle: 'short_sharp', jerseyPrimary: '#7f1d1d', jerseySecondary: '#1e40af', auraColor: '#ef4444', weaponName: 'Luvas da Catalunha', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  { id: 'gk_pxg', name: 'Goleiro do PXG', pos: 'GK', ovr: 88, number: 1, team: 'PXG', skinColor: '#8d5a3b', hairColor: '#0f0f10', hairSecondary: '#27272a', eyeColor: '#3f2a1d', hairStyle: 'short_sharp', jerseyPrimary: '#1e1b4b', jerseySecondary: '#e11d48', auraColor: '#e11d48', weaponName: 'Luvas de Paris', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  // Seleções da Copa do Mundo principal: goleiros e quem completa o time
  { id: 'gk_germany', name: 'Goleiro da Alemanha', pos: 'GK', ovr: 92, number: 1, team: 'Alemanha', skinColor: '#f1d3bd', hairColor: '#d4a85a', hairSecondary: '#a16207', eyeColor: '#1d4ed8', hairStyle: 'short_sharp', jerseyPrimary: '#f8fafc', jerseySecondary: '#111827', auraColor: '#f8fafc', weaponName: 'Muralha de Munique', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  { id: 'gk_england', name: 'Goleiro da Inglaterra', pos: 'GK', ovr: 92, number: 1, team: 'Inglaterra', skinColor: '#f3d1b8', hairColor: '#5b3a1e', hairSecondary: '#78350f', eyeColor: '#166534', hairStyle: 'short_sharp', jerseyPrimary: '#ffffff', jerseySecondary: '#dc2626', auraColor: '#dc2626', weaponName: 'Luvas de Wembley', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  { id: 'gk_spain', name: 'Goleiro da Espanha', pos: 'GK', ovr: 93, number: 1, team: 'Espanha', skinColor: '#e5b899', hairColor: '#1c1917', hairSecondary: '#44403c', eyeColor: '#78350f', hairStyle: 'short_sharp', jerseyPrimary: '#dc2626', jerseySecondary: '#facc15', auraColor: '#facc15', weaponName: 'Luvas de Madri', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  { id: 'gk_brazil', name: 'Goleiro do Brasil', pos: 'GK', ovr: 93, number: 1, team: 'Brasil', skinColor: '#8d5a3b', hairColor: '#0f0f10', hairSecondary: '#27272a', eyeColor: '#3f2a1d', hairStyle: 'short_sharp', jerseyPrimary: '#facc15', jerseySecondary: '#16a34a', auraColor: '#16a34a', weaponName: 'Luvas do Maracanã', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  { id: 'gk_france', name: 'Goleiro da França', pos: 'GK', ovr: 95, number: 1, team: 'França', skinColor: '#f1d3bd', hairColor: '#3f2a1d', hairSecondary: '#5b3a1e', eyeColor: '#1d4ed8', hairStyle: 'short_sharp', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff', auraColor: '#1e3a8a', weaponName: 'Luvas de Saint-Denis', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  // Goleiros dos clubes profissionais (PRO_CLUBS)
  { id: 'gk_real', name: 'Goleiro do Re Al', pos: 'GK', ovr: 94, number: 1, team: 'Re Al', skinColor: '#f1d3bd', hairColor: '#1c1917', hairSecondary: '#44403c', eyeColor: '#1d4ed8', hairStyle: 'short_sharp', jerseyPrimary: '#f8fafc', jerseySecondary: '#a16207', auraColor: '#facc15', weaponName: 'Luvas Merengues', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  { id: 'gk_chelsee', name: 'Goleiro do Chelsee', pos: 'GK', ovr: 92, number: 1, team: 'Chelsee FC', skinColor: '#f3d1b8', hairColor: '#7c4a1e', hairSecondary: '#a16207', eyeColor: '#166534', hairStyle: 'short_sharp', jerseyPrimary: '#1d4ed8', jerseySecondary: '#f8fafc', auraColor: '#1d4ed8', weaponName: 'Luvas de Stamford', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  { id: 'gk_dortmont', name: 'Goleiro do Dortmont', pos: 'GK', ovr: 92, number: 1, team: 'BV Dortmont', skinColor: '#f1d3bd', hairColor: '#d4a85a', hairSecondary: '#a16207', eyeColor: '#1d4ed8', hairStyle: 'short_sharp', jerseyPrimary: '#facc15', jerseySecondary: '#111827', auraColor: '#facc15', weaponName: 'Muralha Amarela', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  { id: 'gk_milanno', name: 'Goleiro do Milanno', pos: 'GK', ovr: 93, number: 1, team: 'AC Milanno', skinColor: '#e5b899', hairColor: '#0f0f10', hairSecondary: '#27272a', eyeColor: '#78350f', hairStyle: 'short_sharp', jerseyPrimary: '#b91c1c', jerseySecondary: '#0a0a0a', auraColor: '#b91c1c', weaponName: 'Luvas de San Siro', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  { id: 'gk_marsella', name: 'Goleiro do Marsella', pos: 'GK', ovr: 93, number: 1, team: 'Olympique Marsella', skinColor: '#8d5a3b', hairColor: '#0f0f10', hairSecondary: '#27272a', eyeColor: '#3f2a1d', hairStyle: 'short_sharp', jerseyPrimary: '#7dd3fc', jerseySecondary: '#0f172a', auraColor: '#7dd3fc', weaponName: 'Luvas do Vélodrome', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  { id: 'gen_spain', name: 'Zagueiro da Espanha', pos: 'CB', ovr: 92, number: 4, team: 'Espanha', skinColor: '#e5b899', hairColor: '#3f2a1d', hairSecondary: '#5b3a1e', eyeColor: '#78350f', hairStyle: 'short_sharp', jerseyPrimary: '#dc2626', jerseySecondary: '#facc15', auraColor: '#facc15', weaponName: 'Defesa da Fúria', chemName: 'Bote Seco', chemBonus: '', quote: '' },
  { id: 'gen_brazil_fw', name: 'Atacante do Brasil', pos: 'CF', ovr: 93, number: 9, team: 'Brasil', skinColor: '#a26a47', hairColor: '#0f0f10', hairSecondary: '#27272a', eyeColor: '#3f2a1d', hairStyle: 'short_sharp', jerseyPrimary: '#facc15', jerseySecondary: '#16a34a', auraColor: '#16a34a', weaponName: 'Ginga Canarinho', chemName: 'Tabela Samba', chemBonus: '', quote: '' },
  { id: 'gen_brazil_mf', name: 'Meia do Brasil', pos: 'CAM', ovr: 92, number: 10, team: 'Brasil', skinColor: '#c99472', hairColor: '#1c1917', hairSecondary: '#44403c', eyeColor: '#3f2a1d', hairStyle: 'short_sharp', jerseyPrimary: '#facc15', jerseySecondary: '#16a34a', auraColor: '#16a34a', weaponName: 'Camisa 10', chemName: 'Passe de Letra', chemBonus: '', quote: '' },
  // Os outros "Coringas" do Wild Card: o mangá nunca mostra quem são, então ficam sem nome
  { id: 'gen_wildcard_mf', name: 'Coringa Nº 2', pos: 'CAM', ovr: 89, number: 2, team: 'Wild Card', skinColor: '#e5b899', hairColor: '#1c1917', hairSecondary: '#3f3f46', eyeColor: '#57534e', hairStyle: 'short_sharp', jerseyPrimary: '#0a0a0a', jerseySecondary: '#f97316', auraColor: '#78716c', weaponName: 'Programa Wild Card', chemName: 'Passe Calculado', chemBonus: '', quote: '' },
  { id: 'gen_wildcard_wg', name: 'Coringa Nº 3', pos: 'RW', ovr: 89, number: 3, team: 'Wild Card', skinColor: '#f1d3bd', hairColor: '#44403c', hairSecondary: '#57534e', eyeColor: '#57534e', hairStyle: 'short_sharp', jerseyPrimary: '#0a0a0a', jerseySecondary: '#f97316', auraColor: '#78716c', weaponName: 'Programa Wild Card', chemName: 'Arrancada Fria', chemBonus: '', quote: '' },
  { id: 'gen_wildcard_df', name: 'Coringa Nº 4', pos: 'CB', ovr: 89, number: 4, team: 'Wild Card', skinColor: '#c99472', hairColor: '#0f0f10', hairSecondary: '#27272a', eyeColor: '#57534e', hairStyle: 'short_sharp', jerseyPrimary: '#0a0a0a', jerseySecondary: '#f97316', auraColor: '#78716c', weaponName: 'Programa Wild Card', chemName: 'Bote Calculado', chemBonus: '', quote: '' },
  { id: 'gk_wildcard', name: 'Goleiro do Wild Card', pos: 'GK', ovr: 89, number: 1, team: 'Wild Card', skinColor: '#f1d3bd', hairColor: '#27272a', hairSecondary: '#3f3f46', eyeColor: '#57534e', hairStyle: 'short_sharp', jerseyPrimary: '#f97316', jerseySecondary: '#0a0a0a', auraColor: '#78716c', weaponName: 'Luvas do Subsolo', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  // Prólogo: o seu colégio (Ichinan) e o craque do Matsukaze Kokuo (Kira)
  { id: 'tada', name: 'Tada (Amigo)', pos: 'RW', ovr: 72, number: 9, team: 'Colégio Ichinan', skinColor: '#f3d1b8', hairColor: '#451a03', hairSecondary: '#78350f', eyeColor: '#451a03', hairStyle: 'short_sharp', jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff', auraColor: '#94a3b8', weaponName: 'Um por Todos', chemName: 'Tabela de Colégio', chemBonus: '', quote: 'Um por todos e todos por um!' },
  { id: 'gen_ichinan_a', name: 'Meia do Ichinan', pos: 'CM', ovr: 70, number: 8, team: 'Colégio Ichinan', skinColor: '#ecc9ae', hairColor: '#1c1917', hairSecondary: '#3f3f46', eyeColor: '#3f2a1d', hairStyle: 'short_sharp', jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff', auraColor: '#94a3b8', weaponName: 'Futebol Coletivo', chemName: 'Passe Seguro', chemBonus: '', quote: '' },
  { id: 'gen_ichinan_b', name: 'Zagueiro do Ichinan', pos: 'CB', ovr: 70, number: 4, team: 'Colégio Ichinan', skinColor: '#f1d3bd', hairColor: '#3f2a1d', hairSecondary: '#57534e', eyeColor: '#3f2a1d', hairStyle: 'buzz_tall', jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff', auraColor: '#94a3b8', weaponName: 'Futebol Coletivo', chemName: 'Corte Seguro', chemBonus: '', quote: '' },
  { id: 'gk_ichinan', name: 'Goleiro do Ichinan', pos: 'GK', ovr: 70, number: 1, team: 'Colégio Ichinan', skinColor: '#ecc9ae', hairColor: '#1c1917', hairSecondary: '#3f3f46', eyeColor: '#3f2a1d', hairStyle: 'short_sharp', jerseyPrimary: '#facc15', jerseySecondary: '#1d4ed8', auraColor: '#94a3b8', weaponName: 'Luvas do Colégio', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  { id: 'kira', name: 'Ryosuke Kira', pos: 'CF', ovr: 80, number: 10, team: 'Matsukaze Kokuo', skinColor: '#f3d1b8', hairColor: '#3f2a1d', hairSecondary: '#6b4a33', eyeColor: '#7c5a3a', hairStyle: 'soft_side', jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8', auraColor: '#94a3b8', weaponName: 'Craque da Região', chemName: 'Jogada Coletiva', chemBonus: '', quote: 'Vamos passar dessa juntos!' },
  { id: 'gk_matsukaze', name: 'Goleiro do Matsukaze', pos: 'GK', ovr: 72, number: 1, team: 'Matsukaze Kokuo', skinColor: '#f1d3bd', hairColor: '#1c1917', hairSecondary: '#3f3f46', eyeColor: '#3f2a1d', hairStyle: 'buzz_tall', jerseyPrimary: '#16a34a', jerseySecondary: '#ffffff', auraColor: '#94a3b8', weaponName: 'Luvas do Matsukaze', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  // 1ª Seleção: o resto do Time Z e os times X, Y e W (como no mangá)
  { id: 'kuon', name: 'Wataru Kuon', pos: 'CB', ovr: 82, number: 5, team: 'Time Z (Blue Lock)', skinColor: '#ecc9ae', hairColor: '#111827', hairSecondary: '#1f2937', eyeColor: '#1f2937', hairStyle: 'short_sharp', jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8', auraColor: '#64748b', weaponName: 'Cabeceio de Zagueiro', chemName: 'Corte Aéreo', chemBonus: '', quote: 'Eu só queria sobreviver...' },
  { id: 'iemon', name: 'Okuhito Iemon', pos: 'GK', ovr: 78, number: 1, team: 'Time Z (Blue Lock)', skinColor: '#f1d3bd', hairColor: '#57534e', hairSecondary: '#78716c', eyeColor: '#3f2a1d', hairStyle: 'short_sharp', jerseyPrimary: '#facc15', jerseySecondary: '#0f2942', auraColor: '#64748b', weaponName: 'Goleiro Improvisado', chemName: 'Reposição Rápida', chemBonus: '', quote: '' },
  { id: 'imamura', name: 'Yudai Imamura', pos: 'RW', ovr: 79, number: 9, team: 'Time Z (Blue Lock)', skinColor: '#f3d1b8', hairColor: '#92400e', hairSecondary: '#b45309', eyeColor: '#78350f', hairStyle: 'short_sharp', jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8', auraColor: '#64748b', weaponName: 'Drible de Velocidade', chemName: 'Corrida pela Ponta', chemBonus: '', quote: '' },
  { id: 'naruhaya', name: 'Asahi Naruhaya', pos: 'CF', ovr: 79, number: 13, team: 'Time Z (Blue Lock)', skinColor: '#ecc9ae', hairColor: '#1f2937', hairSecondary: '#374151', eyeColor: '#1f2937', hairStyle: 'spiky_tall', jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8', auraColor: '#64748b', weaponName: 'Infiltração na Área', chemName: 'Toque de Primeira', chemBonus: '', quote: '' },
  { id: 'wanima_junichi', name: 'Junichi Wanima', pos: 'CF', ovr: 83, number: 10, team: 'Time W (Blue Lock)', skinColor: '#c99472', hairColor: '#1c1917', hairSecondary: '#3f3f46', eyeColor: '#1c1917', hairStyle: 'buzz_tall', jerseyPrimary: '#14532d', jerseySecondary: '#f8fafc', auraColor: '#22c55e', weaponName: 'Tabela dos Gêmeos', chemName: 'Troca de Gêmeo', chemBonus: '', quote: 'Dois corpos, um cérebro!' },
  { id: 'wanima_keisuke', name: 'Keisuke Wanima', pos: 'ST', ovr: 82, number: 11, team: 'Time W (Blue Lock)', skinColor: '#c99472', hairColor: '#1c1917', hairSecondary: '#3f3f46', eyeColor: '#1c1917', hairStyle: 'buzz_tall', jerseyPrimary: '#14532d', jerseySecondary: '#f8fafc', auraColor: '#22c55e', weaponName: 'Tabela dos Gêmeos', chemName: 'Troca de Gêmeo', chemBonus: '', quote: 'Você nunca sabe qual de nós vai chutar!' },
  ...[
    ['gen_matsukaze_a', 'Meia do Matsukaze', 'CM', 8, 'Matsukaze Kokuo', '#ecc9ae', '#1c1917', '#0f2942', '#1d4ed8'],
    ['gen_matsukaze_b', 'Zagueiro do Matsukaze', 'CB', 4, 'Matsukaze Kokuo', '#f1d3bd', '#3f2a1d', '#0f2942', '#1d4ed8'],
    ['gen_matsukaze_c', 'Ponta do Matsukaze', 'LW', 11, 'Matsukaze Kokuo', '#e5b899', '#0f0f10', '#0f2942', '#1d4ed8'],
    ['gen_france_mf', 'Meia da França', 'CM', 8, 'França', '#e5b899', '#3f2a1d', '#1e3a8a', '#ffffff'],
    ['gen_france_df', 'Zagueiro da França', 'CB', 4, 'França', '#a26a47', '#0f0f10', '#1e3a8a', '#ffffff'],
    ['gk_teamv', 'Goleiro do Time V', 'GK', 1, 'Time V', '#f1d3bd', '#1c1917', '#7e22ce', '#f8fafc'],
    ['gen_teamx_a', 'Meia do Time X', 'CM', 8, 'Time X', '#ecc9ae', '#1c1917', '#111827', '#dc2626'],
    ['gen_teamx_b', 'Zagueiro do Time X', 'CB', 4, 'Time X', '#f1d3bd', '#3f2a1d', '#111827', '#dc2626'],
    ['gen_teamx_c', 'Ponta do Time X', 'RW', 7, 'Time X', '#e5b899', '#0f0f10', '#111827', '#dc2626'],
    ['gk_teamx', 'Goleiro do Time X', 'GK', 1, 'Time X', '#f1d3bd', '#1c1917', '#dc2626', '#111827'],
    ['okawa', 'Okawa (Time Y)', 'CF', 9, 'Time Y', '#ecc9ae', '#3f2a1d', '#b91c1c', '#0a0a0a'],
    ['gen_teamy_a', 'Meia do Time Y', 'CM', 8, 'Time Y', '#f1d3bd', '#1c1917', '#b91c1c', '#0a0a0a'],
    ['gen_teamy_b', 'Zagueiro do Time Y', 'CB', 4, 'Time Y', '#e5b899', '#0f0f10', '#b91c1c', '#0a0a0a'],
    ['gk_teamy', 'Goleiro do Time Y', 'GK', 1, 'Time Y', '#f1d3bd', '#3f2a1d', '#0a0a0a', '#b91c1c'],
    ['gen_teamw_a', 'Meia do Time W', 'CM', 8, 'Time W', '#f1d3bd', '#1c1917', '#14532d', '#f8fafc'],
    ['gen_teamw_b', 'Zagueiro do Time W', 'CB', 4, 'Time W', '#ecc9ae', '#3f2a1d', '#14532d', '#f8fafc'],
    ['gk_teamw', 'Goleiro do Time W', 'GK', 1, 'Time W', '#e5b899', '#0f0f10', '#f8fafc', '#14532d']
  ].map(([id, name, pos, number, team, skinColor, hairColor, jerseyPrimary, jerseySecondary]) => ({
    id, name, pos, ovr: 80, number, team, skinColor, hairColor, hairSecondary: hairColor, eyeColor: '#3f2a1d', hairStyle: id === 'okawa' ? 'spiky_tall' : 'short_sharp',
    jerseyPrimary, jerseySecondary, auraColor: jerseySecondary, weaponName: team, chemName: 'Jogada Coletiva', chemBonus: '', quote: ''
  })),
  // Amistosos antes da Copa e o Grupo do Japão (seleções sem personagem do mangá)
  ...[
    ['gen_portugal_fw', 'Atacante de Portugal', 'CF', 9, 'Portugal', '#e5b899', '#1c1917', '#7f1d1d', '#15803d'],
    ['gen_portugal_mf', 'Meia de Portugal', 'CAM', 8, 'Portugal', '#d9a77f', '#3f2a1d', '#7f1d1d', '#15803d'],
    ['gen_portugal_df', 'Zagueiro de Portugal', 'CB', 4, 'Portugal', '#c99472', '#1c1917', '#7f1d1d', '#15803d'],
    ['gen_portugal_wg', 'Ponta de Portugal', 'RW', 7, 'Portugal', '#f1d3bd', '#7c4a1e', '#7f1d1d', '#15803d'],
    ['gk_portugal', 'Goleiro de Portugal', 'GK', 1, 'Portugal', '#f1d3bd', '#5b3a1e', '#7f1d1d', '#15803d'],
    ['gen_korea_df', 'Zagueiro da Coreia', 'CB', 4, 'Coreia do Sul', '#f1d3bd', '#1c1917', '#dc2626', '#1e3a8a'],
    ['gen_korea_wg', 'Ponta da Coreia', 'LW', 11, 'Coreia do Sul', '#ecc9ae', '#3f2a1d', '#dc2626', '#1e3a8a'],
    ['gen_korea_fw', 'Atacante da Coreia', 'CF', 7, 'Coreia do Sul', '#f1d3bd', '#0f0f10', '#dc2626', '#1e3a8a'],
    ['gen_korea_mf', 'Meia da Coreia', 'CM', 10, 'Coreia do Sul', '#ecc9ae', '#1c1917', '#dc2626', '#1e3a8a'],
    ['gk_korea', 'Goleiro da Coreia', 'GK', 1, 'Coreia do Sul', '#f1d3bd', '#0f0f10', '#dc2626', '#1e3a8a'],
    ['gen_italy_fw', 'Atacante da Itália', 'CF', 9, 'Itália', '#e5b899', '#1c1917', '#1d4ed8', '#f8fafc'],
    ['gen_italy_df', 'Zagueiro da Itália', 'CB', 3, 'Itália', '#f1d3bd', '#1c1917', '#1d4ed8', '#f8fafc'],
    ['gen_italy_mf', 'Meia da Itália', 'CM', 8, 'Itália', '#d9a77f', '#3f2a1d', '#1d4ed8', '#f8fafc'],
    ['gk_italy', 'Goleiro da Itália', 'GK', 1, 'Itália', '#e5b899', '#3f2a1d', '#1d4ed8', '#f8fafc'],
    ['gen_argentina_wg', 'Ponta da Argentina', 'RW', 11, 'Argentina', '#e5b899', '#7c4a1e', '#7dd3fc', '#f8fafc'],
    ['gen_nigeria_wg', 'Ponta da Nigéria', 'LW', 7, 'Nigéria', '#6b4129', '#0f0f10', '#16a34a', '#f8fafc'],
    ['gen_argentina_fw', 'Atacante da Argentina', 'CF', 10, 'Argentina', '#e5b899', '#3f2a1d', '#7dd3fc', '#f8fafc'],
    ['gen_argentina_mf', 'Meia da Argentina', 'CM', 5, 'Argentina', '#d9a77f', '#1c1917', '#7dd3fc', '#f8fafc'],
    ['gen_argentina_df', 'Zagueiro da Argentina', 'CB', 2, 'Argentina', '#f1d3bd', '#5b3a1e', '#7dd3fc', '#f8fafc'],
    ['gk_argentina', 'Goleiro da Argentina', 'GK', 1, 'Argentina', '#e5b899', '#1c1917', '#7dd3fc', '#f8fafc'],
    ['gen_nigeria_fw', 'Atacante da Nigéria', 'CF', 9, 'Nigéria', '#6b4129', '#0f0f10', '#16a34a', '#f8fafc'],
    ['gen_nigeria_mf', 'Meia da Nigéria', 'CM', 8, 'Nigéria', '#7a4a2e', '#0f0f10', '#16a34a', '#f8fafc'],
    ['gen_nigeria_df', 'Zagueiro da Nigéria', 'CB', 5, 'Nigéria', '#5c3820', '#0f0f10', '#16a34a', '#f8fafc'],
    ['gk_nigeria', 'Goleiro da Nigéria', 'GK', 1, 'Nigéria', '#6b4129', '#0f0f10', '#16a34a', '#f8fafc']
  ].map(([id, name, pos, number, team, skinColor, hairColor, jerseyPrimary, jerseySecondary]) => ({
    id, name, pos, ovr: 91, number, team, skinColor, hairColor, hairSecondary: hairColor, eyeColor: '#3f2a1d', hairStyle: 'short_sharp',
    jerseyPrimary, jerseySecondary, auraColor: jerseySecondary, weaponName: `Seleção: ${team}`, chemName: 'Toque Rápido', chemBonus: '', quote: ''
  }))
];

// Valor de mercado inicial (milhões de ¥) dos jogadores do Blue Lock na NEL.
// "you" = você. Muda depois de cada rodada (gols, nota da partida, resultado do clube).
window.NEL_START_VALUES = {
  you: 5, rin: 30, shidou: 26, nagi: 24, bachira: 22, barou: 20, kunigami: 19, chigiri: 17, aiku: 16,
  reo: 15, karasu: 14, yukimiya: 13, hiori: 12, otoya: 12, kurona: 11, niko: 10, aryu: 9, sendo: 9,
  zantetsu: 8, kiyora: 8, gagamaru: 7, raichi: 6, tokimitsu: 6, darai: 6, niou: 6, nanase: 5, hiiragi: 4,
  tsunzaki: 3, igarashi: 3
};
window.NEL_CUTOFF = 23;

// ============================================================================
// CARREIRA PROFISSIONAL (depois da Copa Sub-20, com o Fox): 5 clubes NOVOS,
// nenhum da NEL (o Re Al do Sae e do Luna, o Chelsee do Blake, o Dortmont do
// Kaiser, o Milanno do Lavinho e o Marsella do Loki e do Rin). A liga usa o
// mesmo motor da NEL (LEAGUES.pro) e o ranking vira a corrida pela Bola de Ouro.
// ============================================================================
window.PRO_CLUB_ORDER = ['real', 'chelsee', 'dortmont', 'milanno', 'marsella'];

window.PRO_CLUBS = {
  real: { id: 'real', name: 'Re Al', country: 'Espanha • Madri', color: '#f8fafc', secondary: '#a16207' },
  chelsee: { id: 'chelsee', name: 'Chelsee FC', country: 'Inglaterra • Londres', color: '#1d4ed8', secondary: '#f8fafc' },
  dortmont: { id: 'dortmont', name: 'BV Dortmont', country: 'Alemanha • Dortmund', color: '#facc15', secondary: '#111827' },
  milanno: { id: 'milanno', name: 'AC Milanno', country: 'Itália • Milão', color: '#b91c1c', secondary: '#0a0a0a' },
  marsella: { id: 'marsella', name: 'Olympique Marsella', country: 'França • Marselha', color: '#7dd3fc', secondary: '#0f172a' }
};

// Saves que já tinham assinado com um clube da NEL na carreira profissional
window.PRO_LEGACY_MAP = { bastard: 'dortmont', manshine: 'chelsee', barcha: 'milanno', ubers: 'real', pxg: 'marsella' };

// Elencos (7 contra 7: o último é o goleiro; no seu clube você entra no lugar do 6º)
window.PRO_ROSTERS = {
  real: ['luna', 'sae', 'nagi', 'reo', 'karasu', 'aiku', 'gk_real'],
  chelsee: ['blake', 'chris_prince', 'agi', 'teddy_knight', 'chigiri', 'niou', 'gk_chelsee'],
  dortmont: ['kaiser', 'ness', 'kunigami', 'hiori', 'yukimiya', 'birkenstock', 'gk_dortmont'],
  milanno: ['lavinho', 'bunny', 'lorenzo', 'barou', 'bachira', 'aryu', 'gk_milanno'],
  marsella: ['loki', 'rin', 'hugo', 'charles', 'shidou', 'dada_silva', 'gk_marsella']
};

// Pontos iniciais na corrida pela Bola de Ouro (sobem/descem a cada rodada)
window.PRO_START_VALUES = {
  you: 18, loki: 60, kaiser: 58, lavinho: 56, blake: 54, chris_prince: 52, luna: 50, sae: 48, bunny: 46, rin: 44,
  hugo: 42, lorenzo: 36, charles: 36, dada_silva: 34, ness: 32, shidou: 32, nagi: 32, barou: 30, bachira: 30,
  kunigami: 26, chigiri: 24
};

// Propostas dos clubes (milhões de ¥ por ano, antes de somar o seu valor da NEL).
// O Fox comenta cada uma — e nenhum comentário dele é conselho: é cálculo.
window.PRO_OFFERS = {
  real: { base: 50, fox: '"O clube do Sae. Vai ser sempre o segundo nome na camisa do irmão de alguém. ...A não ser que você o devore por dentro."' },
  chelsee: { base: 46, fox: '"Londres. A MINHA cidade. Eu tenho amigos naquele vestiário. Hehehe... amigos que me contam tudo."' },
  dortmont: { base: 42, fox: '"O Kaiser odeia você. Ótimo. Ódio todo dia no treino é ração pro monstro."' },
  milanno: { base: 40, fox: '"Lavinho e o Bunny: dois egos sorrindo. Quero ver quanto tempo o sorriso dura do seu lado."' },
  marsella: { base: 48, fox: '"O Rin assinou lá ontem. Ele jurou te matar. Morar no mesmo vestiário que quem quer te matar... é o melhor treino que existe."' }
};

// As duas ligas usam o mesmo motor (App.lg): de onde vêm o save, o clube escolhido,
// os elencos e os textos de cada uma
window.LEAGUES = {
  nel: {
    id: 'nel', stateKey: 'nel', clubKey: 'nelClub', name: 'Liga Neo Egoísta', short: 'NEL', crest: 'NEO EGOIST LEAGUE',
    clubs: window.NEL_CLUBS, order: window.NEL_CLUB_ORDER, goalLimit: 3,
    rosters: window.NEL_ROSTERS, startValues: window.NEL_START_VALUES, gamesPerChapter: window.NEL_GAMES_PER_CHAPTER, cutoff: window.NEL_CUTOFF,
    valueTitle: '💴 RANKING DE VALOR', valueLabel: 'Seu valor de mercado', unit: 'yen',
    cutoffNote: `os ${window.NEL_CUTOFF} primeiros vão para a Copa`,
    summary: (phase, club, opp) => `${phase} da Liga Neo Egoísta, 7 contra 7. Próximo jogo: ${club.name} x ${opp.name} (mestre ${window.findCharacter(opp.master)?.name || ''}). Cada gol e cada nota alta aumentam o seu valor de mercado: os ${window.NEL_CUTOFF} mais valiosos do Blue Lock vão para a Copa Sub-20.`
  },
  pro: {
    id: 'pro', stateKey: 'pro', clubKey: 'proClub', name: 'Liga Europeia', short: 'LIGA', crest: 'EURO LEAGUE',
    clubs: window.PRO_CLUBS, order: window.PRO_CLUB_ORDER, goalLimit: 4,
    rosters: window.PRO_ROSTERS, startValues: window.PRO_START_VALUES, gamesPerChapter: 4, cutoff: 1,
    valueTitle: '🥇 CORRIDA PELA BOLA DE OURO', valueLabel: 'Seus pontos na Bola de Ouro', unit: 'pts',
    cutoffNote: 'o 1º leva a Bola de Ouro',
    summary: (phase, club, opp) => `${phase} da temporada na Liga Europeia, 7 contra 7. Próximo jogo: ${club.name} x ${opp.name}. Gols e notas altas te levam na corrida pela Bola de Ouro contra os melhores do mundo.`
  }
};

// Personagem pelo id, incluindo os goleiros dos clubes da NEL (que não entram na roleta nem nas relações)
window.findCharacter = (id) =>
  (window.BLUE_LOCK_CHARACTERS || []).find((c) => c.id === id) || window.NEL_KEEPERS.find((c) => c.id === id) || null;

// O capítulo da NEL antes de você escolher o clube
window.NEL_UNCHOSEN = {
  teamName: 'Seu clube na NEL (a escolher)',
  title: 'NEL: escolha o seu clube',
  opponentName: 'Depende do clube que você escolher',
  teammateIds: [],
  opponentIds: [],
  loreSummary: 'A Liga Neo Egoísta vai começar! Cinco clubes da Europa, cada um com um mestre World Class: Bastard München, Manshine City, FC Barcha, Ubers e PXG. Aperte JOGAR e escolha onde você vai jogar.'
};

// Toca antes da tela de escolha do clube
window.NEL_DRAFT_INTRO = [
  { speaker: 'JINPACHI EGO', text: '"Liga Neo Egoísta. Os melhores clubes da Europa vão dar lances pelos seus salários. Escolham seu mestre."', mood: 'ego' },
  { speaker: 'ANRI TEIERI', text: '"São cinco clubes: Bastard München, Manshine City, FC Barcha, Ubers e PXG. Cada um tem um mestre World Class."', mood: 'happy' },
  { speaker: 'JINPACHI EGO', text: '"O clube que vocês escolherem vai moldar o futebol de vocês. Não existe volta. Escolham com o seu ego."', mood: 'ego' }
];

// ============================================================================
// DIÁLOGOS DE LORE ANTES DE CADA PARTIDA (COM ESCOLHAS!)
// • Tocam antes do introCutscene de cada capítulo.
// • Linhas com "choices" param o diálogo até você escolher.
// • effects.affinity sobe/desce a relação (Química) com cada personagem;
//   effects.stats dá pequenos ajustes de atributo. Cada escolha (id) só
//   aplica efeito na primeira vez, para não dar para farmar relação.
// ============================================================================
window.CHAPTER_DIALOGUES = {
  ch0_prologue: [
    { bg: 'locker_room', speaker: 'NARRADOR', text: 'Vestiário do Colégio Ichinan. Faltam 15 minutos para a Final Regional.', mood: 'tense' },
    {
      id: 'ch0_tada_promise',
      speaker: 'TADA (SEU AMIGO)',
      text: '"Cara, se a gente ganhar hoje vamos juntos pro Nacional! Promete que se eu estiver livre você toca pra mim?"',
      mood: 'happy',
      choices: [
        {
          label: '"Prometo. A gente é um time."',
          effects: { affinity: { tada: 10 }, stats: { compostura: 1 } },
          reply: [{ speaker: 'TADA (SEU AMIGO)', text: '"É isso aí! Um por todos e todos por um!"', mood: 'happy' }]
        },
        {
          label: '"Se o gol estiver na minha frente, eu vou chutar."',
          effects: { affinity: { tada: -6 }, stats: { ego: 2 } },
          reply: [
            { speaker: 'TADA (SEU AMIGO)', text: '"...Você tá estranho hoje, hein."', mood: 'tense' },
            { speaker: 'VOCÊ', text: '(Por que eu disse isso? ...Mas é o que eu sinto de verdade.)', mood: 'ego' }
          ]
        },
        {
          label: '"Vamos ver na hora."',
          effects: { affinity: { tada: 2 }, stats: { visao: 1 } },
          reply: [{ speaker: 'TADA (SEU AMIGO)', text: '"Hehe, tá bom. Só não esquece de mim lá na direita!"', mood: 'normal' }]
        }
      ]
    }
  ],

  ch1_first_selection_x_y: [
    { bg: 'auditorium', speaker: 'NARRADOR', text: 'Uma semana depois. 300 atacantes sub-18 reunidos em um auditório escuro no meio do nada.', mood: 'tense' },
    { speaker: 'ANRI TEIERI', text: '"Bem-vindos! O Projeto Blue Lock vai criar o maior atacante do mundo para o Japão vencer a Copa!"', mood: 'happy' },
    // Clímax do auditório: animação "O Discurso de Jinpachi Ego" (300 → 1 → a porta do Blue Lock)
    { cinematic: 'ego_speech' },
    { speaker: 'JINPACHI EGO', text: '"Pensem bem: cara a cara com o gol na final, vocês passariam a bola? Quem acha que o passe estava certo pode ir embora agora mesmo."', mood: 'ego' },
    {
      id: 'ch1_door',
      speaker: 'JINPACHI EGO',
      text: '"Atrás de mim está a porta do Blue Lock. Quem passar por ela não volta atrás. E então... vocês vão passar pela porta?"',
      mood: 'ego',
      choices: [
        {
          label: 'Passar pela porta primeiro, sem olhar pra trás.',
          effects: { affinity: { bachira: 6, kunigami: -2 }, stats: { ego: 3 } },
          reply: [
            { speaker: 'JINPACHI EGO', text: '"Hehe... um idiota faminto. Exatamente o que eu procurava."', mood: 'ego' },
            { speaker: 'MEGURU BACHIRA', text: '"Ohh! Você foi o primeiro! O monstro dentro de você tá rindo, eu consigo ouvir!"', mood: 'happy' }
          ]
        },
        {
          label: 'Hesitar... e lembrar da final do colégio.',
          effects: { affinity: { kunigami: 5, tada: 3 }, stats: { compostura: 2 } },
          reply: [
            { speaker: 'VOCÊ', text: '(Aquela final... Nunca mais eu hesito na cara do gol.)', mood: 'tense' },
            { speaker: 'RENSUKE KUNIGAMI', text: '"Ei, eu também tremi. Mas um herói não foge. Vamos passar juntos."', mood: 'normal' }
          ]
        },
        {
          label: 'Virar as costas e fingir que vai embora.',
          effects: { affinity: { bachira: -3, chigiri: 4 }, stats: { visao: 2 } },
          reply: [
            { speaker: 'JINPACHI EGO', text: '"Vai embora? Então volte pro seu futebol coletivo medíocre."', mood: 'ego' },
            { speaker: 'VOCÊ', text: '"...Mentira. Eu só queria ver quem estava com medo." *você passa pela porta*', mood: 'ego' },
            { speaker: 'HYOMA CHIGIRI', text: '"Hah... você também pensou em ir embora, né? Eu também pensei."', mood: 'tense' }
          ]
        }
      ]
    },
    // Você escolheu passar: só agora a porta abre (antes a animação mostrava a porta ANTES da pergunta)
    { cinematic: 'bluelock_door' },
    { bg: 'bluelock_room', speaker: 'NARRADOR', text: 'Prédio 5, Quarto Z. Você é o 299º do ranking. Um garoto de cabelo duas cores se aproxima.', mood: 'normal' },
    {
      id: 'ch1_bachira',
      speaker: 'MEGURU BACHIRA',
      text: '"Eu sou Meguru Bachira! Me diz uma coisa... você também escuta um monstro dentro de você quando joga?"',
      mood: 'happy',
      choices: [
        {
          label: '"Escuto. E ele quer devorar todo mundo."',
          effects: { affinity: { bachira: 8 }, stats: { ego: 1 } },
          reply: [{ speaker: 'MEGURU BACHIRA', text: '"HAHAHA! Eu sabia! Vamos brincar juntos, parceiro!"', mood: 'happy' }]
        },
        {
          label: '"Monstro? Você é meio estranho, hein."',
          effects: { affinity: { bachira: -5 } },
          reply: [{ speaker: 'MEGURU BACHIRA', text: '"Estranho é quem não escuta o próprio monstro... hmph."', mood: 'tense' }]
        },
        {
          label: '"Não... mas eu quero ver o seu."',
          effects: { affinity: { bachira: 4 }, stats: { visao: 1 } },
          reply: [{ speaker: 'MEGURU BACHIRA', text: '"Hehe! Então fica de olho em mim no jogo!"', mood: 'happy' }]
        }
      ]
    },
    {
      id: 'ch1_barou',
      speaker: 'SHOUEI BAROU',
      text: '"Ei, peixe pequeno do Time Z. Tá olhando o quê?"',
      mood: 'ego',
      choices: [
        {
          label: '"Olhando o rei que eu vou derrubar."',
          effects: { affinity: { barou: 5 }, stats: { ego: 2 } },
          reply: [{ speaker: 'SHOUEI BAROU', text: '"...Heh. Pelo menos tem coragem. Vou te esmagar com prazer."', mood: 'ego' }]
        },
        {
          label: '"Nada não..."',
          effects: { affinity: { barou: -4 }, stats: { compostura: 1 } },
          reply: [{ speaker: 'SHOUEI BAROU', text: '"Isso mesmo. Abaixa a cabeça pro Rei."', mood: 'ego' }]
        }
      ]
    },
    // O primeiro teste: pique-pega com bola no Quarto Z (você elimina o Kira)
    { speaker: 'RYOSUKE KIRA', text: '"Ei, você jogou a final regional contra o Matsukaze Kokuo, né? Eu sou o Kira. Vamos passar dessa juntos!"', mood: 'happy' },
    { speaker: 'JINPACHI EGO', text: '"Primeiro teste do Quarto Z: PIQUE-PEGA. Quem for atingido pela bola vira o pegador. Quem estiver com ela quando os 136 segundos acabarem... ESTÁ ELIMINADO."', mood: 'ego' },
    { cinematic: 'onigokko' },
    { speaker: 'RYOSUKE KIRA', text: '"...Por quê? Eu era o melhor da região... e saio no primeiro dia?"', mood: 'tense' },
    { speaker: 'JINPACHI EGO', text: '"Ryosuke Kira, eliminado. Ele estava pensando em \'passar juntos\'. Você pensou só em você. É ASSIM que nasce um atacante."', mood: 'ego' },
    { speaker: 'MEGURU BACHIRA', text: '"Hehe... eu vi! Na hora do chute o seu monstro acordou!"', mood: 'happy' }
  ],

  // Antes do Time W: o medo do joelho (o Chigiri só volta a correr neste jogo)
  ch1c_team_w: [
    { bg: 'bluelock_room', speaker: 'NARRADOR', text: 'Quarto Z, antes do jogo contra o Time W. O Chigiri está sentado, apertando o joelho direito.', mood: 'tense' },
    {
      id: 'ch2_chigiri',
      speaker: 'HYOMA CHIGIRI',
      text: '"Eu rompi o ligamento uma vez... E se acontecer de novo hoje, na frente de todo mundo?"',
      mood: 'tense',
      choices: [
        {
          label: '"Então corre como se fosse a última vez. Eu boto a bola no espaço pra você."',
          effects: { affinity: { chigiri: 10 } },
          reply: [{ speaker: 'HYOMA CHIGIRI', text: '"...Tá. Hoje eu vou correr!"', mood: 'ego' }]
        },
        {
          label: '"Se tiver medo, fica atrás e deixa comigo."',
          effects: { affinity: { chigiri: -6 }, stats: { ego: 2 } },
          reply: [{ speaker: 'HYOMA CHIGIRI', text: '"...Você acha que eu sou inútil? Então eu vou te mostrar."', mood: 'tense' }]
        },
        {
          label: '"Bachira, cobre ele na defesa hoje."',
          effects: { affinity: { bachira: 5, chigiri: 3 } },
          reply: [{ speaker: 'MEGURU BACHIRA', text: '"Hehe, deixa comigo! Ninguém encosta no nosso velocista."', mood: 'happy' }]
        }
      ]
    },
  ],

  ch2_first_selection_v: [
    { bg: 'corridor', speaker: 'NARRADOR', text: 'Corredor do Prédio 5, minutos antes do jogo decisivo contra o invicto Time V.', mood: 'tense' },
    {
      id: 'ch2_reo',
      speaker: 'REO MIKAGE',
      text: '"Ei, Time Z. Se vocês perderem hoje, eu e o Nagi agradecemos os pontos."',
      mood: 'ego',
      choices: [
        {
          label: '"O Nagi é um gênio. Mas e você, Reo, faz o quê sozinho?"',
          effects: { affinity: { reo: -6, nagi: 4 }, stats: { visao: 1 } },
          reply: [
            { speaker: 'SEISHIRO NAGI', text: '"...Ele tem razão, Reo. Isso foi engraçado."', mood: 'normal' },
            { speaker: 'REO MIKAGE', text: '"NAGI!"', mood: 'urgent' }
          ]
        },
        {
          label: '"Boa sorte. Vai ser um jogo de verdade."',
          effects: { affinity: { reo: 6 } },
          reply: [{ speaker: 'REO MIKAGE', text: '"...Respeito. Mas o meu tesouro não perde."', mood: 'ego' }]
        }
      ]
    },

    {
      id: 'ch2_kunigami',
      speaker: 'RENSUKE KUNIGAMI',
      text: '"Eu quero ser um herói. Se precisar, eu chuto de fora da área com a minha esquerda."',
      mood: 'normal',
      choices: [
        {
          label: '"Herói? Aqui dentro só sobrevive egoísta."',
          effects: { affinity: { kunigami: -4 }, stats: { ego: 1 } },
          reply: [{ speaker: 'RENSUKE KUNIGAMI', text: '"...Então eu vou ser o herói mais egoísta do Blue Lock."', mood: 'tense' }]
        },
        {
          label: '"Então seja meu herói e abre espaço pra mim."',
          effects: { affinity: { kunigami: 6 } },
          reply: [{ speaker: 'RENSUKE KUNIGAMI', text: '"Fechado! Eu atraio os zagueiros, você finaliza!"', mood: 'happy' }]
        }
      ]
    }
  ],

  ch3_second_selection_world5: [
    { bg: 'monitor_room', speaker: 'JINPACHI EGO', text: '"Você devorou o Barou. O primeiro time a chegar a cinco jogadores passa da Segunda Seleção... e o Rin está olhando para você."', mood: 'ego' },
    {
      id: 'ch3_rin',
      speaker: 'RIN ITOSHI',
      text: '"Você chegou até aqui. Quer jogar no meu time?"',
      mood: 'tense',
      choices: [
        {
          label: '"Quero. Vou devorar o seu jogo de dentro."',
          effects: { affinity: { rin: 6 }, stats: { ego: 2 } },
          reply: [{ speaker: 'RIN ITOSHI', text: '"Tente. Se ficar pra trás, eu te descarto."', mood: 'ego' }]
        },
        {
          label: '"Prefiro te derrotar do outro lado."',
          effects: { affinity: { rin: 3, barou: 3 } },
          reply: [{ speaker: 'RIN ITOSHI', text: '"...Hm. Não me decepcione."', mood: 'ego' }]
        },
        {
          label: '"Seu irmão Sae é mais famoso que você, né?"',
          effects: { affinity: { rin: -10 } },
          reply: [{ speaker: 'RIN ITOSHI', text: '*olhar assassino* "Nunca mais fale esse nome perto de mim."', mood: 'tense' }]
        }
      ]
    },
    // O herói que ficou para trás (ele volta na NEL como Wild Card)
    { speaker: 'NARRADOR', text: 'Na porta seguinte, ninguém escolhe o Kunigami. Ele fica para trás.', mood: 'tense' },
    { speaker: 'RENSUKE KUNIGAMI', text: '"Vai na frente... herói não chora. Um dia eu volto. E aí eu vou estar do outro lado."', mood: 'tense' },
    { bg: 'bluelock_holo', speaker: 'JINPACHI EGO', text: '"Os World Five chegaram: Loki, Luna, Blake, Dada Silva e Pablo. Eles são WORLD CLASS. O nível deles está MUITO acima do seu."', mood: 'urgent' },
    {
      id: 'ch3_loki',
      speaker: 'JULIAN LOKI',
      text: '"Vocês sabem quem eu sou? Não? Ótimo. Vai ser mais divertido assim."',
      mood: 'ego',
      choices: [
        {
          label: '"Não importa quem você é. Hoje você perde."',
          effects: { affinity: { loki: 4 }, stats: { ego: 2 } },
          reply: [{ speaker: 'JULIAN LOKI', text: '"Que bom. Eu adoro quando alguém acredita nisso."', mood: 'ego' }]
        },
        {
          label: '"Eu vim aprender com você."',
          effects: { affinity: { loki: 6 }, stats: { visao: 2 } },
          reply: [{ speaker: 'JULIAN LOKI', text: '"Sábio. A maioria só aprende depois de perder."', mood: 'normal' }]
        }
      ]
    }
  ],

  ch4_third_selection: [
    { bg: 'monitor_room', speaker: 'ANRI TEIERI', text: '"A Federação quer fechar o Blue Lock! Vocês precisam vencer a Seleção Sub-20 para o projeto sobreviver!"', mood: 'urgent' },
    {
      id: 'ch4_shidou',
      bg: 'bluelock_holo',
      speaker: 'RYUSEI SHIDOU',
      text: '"Ei! Você! Quer explodir comigo ou vai ficar aí parado igual pedra?"',
      mood: 'ego',
      choices: [
        {
          label: '"Vamos explodir juntos!"',
          effects: { affinity: { shidou: 8 } },
          reply: [{ speaker: 'RYUSEI SHIDOU', text: '"HAHAHA! Isso! Minhas células estão vibrando!"', mood: 'ego' }]
        },
        {
          label: '"Eu explodo sozinho."',
          effects: { affinity: { shidou: -4 }, stats: { ego: 2 } },
          reply: [{ speaker: 'RYUSEI SHIDOU', text: '"Hah! Então eu vou explodir MAIS que você!"', mood: 'ego' }]
        },
        {
          label: '"Calma, Shidou. Precisa de cálculo."',
          effects: { affinity: { shidou: -6, hiori: 4 } },
          reply: [{ speaker: 'YO HIORI', text: '"Ele tem razão... O espaço vem antes da explosão."', mood: 'normal' }]
        }
      ]
    },
    {
      id: 'ch4_yukimiya',
      speaker: 'KENYU YUKIMIYA',
      text: '"Meus olhos estão piorando... Mas eu não vou parar de jogar."',
      mood: 'tense',
      choices: [
        {
          label: '"Então joga cada partida como se fosse a última."',
          effects: { affinity: { yukimiya: 8 } },
          reply: [{ speaker: 'KENYU YUKIMIYA', text: '"...Obrigado. É exatamente isso que eu vou fazer."', mood: 'ego' }]
        },
        {
          label: '"Se for atrapalhar o time, melhor sair."',
          effects: { affinity: { yukimiya: -8 }, stats: { ego: 1 } },
          reply: [{ speaker: 'KENYU YUKIMIYA', text: '"Vou te fazer engolir essas palavras em campo."', mood: 'tense' }]
        },
        {
          label: '"Fica tranquilo, eu te deixo na cara do gol."',
          effects: { affinity: { yukimiya: 5 } },
          reply: [{ speaker: 'KENYU YUKIMIYA', text: '"Hehe... vou cobrar isso."', mood: 'happy' }]
        }
      ]
    },
    {
      id: 'ch4_hiori',
      speaker: 'YO HIORI',
      text: '"Eu jogo porque meus pais querem... Nem sei se gosto de futebol de verdade."',
      mood: 'normal',
      choices: [
        {
          label: '"Então descobre aqui, com a gente, se você gosta."',
          effects: { affinity: { hiori: 8 } },
          reply: [{ speaker: 'YO HIORI', text: '"...Com você eu acho que dá pra descobrir."', mood: 'happy' }]
        },
        {
          label: '"Isso não importa dentro de campo."',
          effects: { affinity: { hiori: -5 }, stats: { compostura: 1 } },
          reply: [{ speaker: 'YO HIORI', text: '"...Entendi."', mood: 'tense' }]
        }
      ]
    },
    {
      id: 'ch4_karasu',
      speaker: 'TABITO KARASU',
      text: '"Elo mais fraco do time detectado. Adivinha quem é?"',
      mood: 'tense',
      choices: [
        {
          label: '"Mede direito, Karasu. Você vai errar feio."',
          effects: { affinity: { karasu: 4 }, stats: { ego: 1 } },
          reply: [{ speaker: 'TABITO KARASU', text: '"Hah. Gostei. Vamos ver em campo."', mood: 'ego' }]
        },
        {
          label: 'Ignorar e continuar se aquecendo.',
          effects: { affinity: { karasu: -2 }, stats: { compostura: 2 } },
          reply: [{ speaker: 'TABITO KARASU', text: '"...Frio, hein. Isso é irritante."', mood: 'tense' }]
        }
      ]
    }
  ],

  ch5_u20_japan: [
    { bg: 'tunnel', speaker: 'NARRADOR', text: 'Estádio Nacional lotado. Se o Blue Lock perder hoje, o projeto acaba para sempre.', mood: 'tense' },
    { bg: 'u20_national', speaker: 'SAE ITOSHI', text: '"Rin. Você ainda está jogando de atacante?"', mood: 'ego' },
    { speaker: 'RIN ITOSHI', text: '"Cala a boca, irmão. Hoje eu te destruo."', mood: 'tense' },
    {
      id: 'ch5_sae',
      speaker: 'SAE ITOSHI',
      text: '"E você... é aquele que joga pensando? Hm."',
      mood: 'ego',
      choices: [
        {
          label: '"Vou provar que o Japão tem um atacante de verdade."',
          effects: { affinity: { sae: 6 }, stats: { ego: 2 } },
          reply: [{ speaker: 'SAE ITOSHI', text: '"Palavras são baratas. Mostra em campo."', mood: 'ego' }]
        },
        {
          label: '"O Rin é melhor do que você pensa."',
          effects: { affinity: { sae: -2, rin: 8 } },
          reply: [
            { speaker: 'RIN ITOSHI', text: '"...Não preciso que você me defenda. Mas... valeu."', mood: 'normal' },
            { speaker: 'SAE ITOSHI', text: '"Hmph."', mood: 'ego' }
          ]
        },
        {
          label: '"Seu passe é o melhor do mundo. Um dia eu quero recebê-lo."',
          effects: { affinity: { sae: 8, rin: -4 } },
          reply: [{ speaker: 'SAE ITOSHI', text: '"...Então sobrevive até lá."', mood: 'ego' }]
        }
      ]
    },
    {
      id: 'ch5_aiku',
      speaker: 'OLIVER AIKU',
      text: '"Eu leio o ataque antes dele acontecer. Você vai sentir na pele."',
      mood: 'tense',
      choices: [
        {
          label: '"Então tenta ler isso."',
          effects: { affinity: { aiku: 5 }, stats: { ego: 1 } },
          reply: [{ speaker: 'OLIVER AIKU', text: '"Hehe... agora sim fiquei animado."', mood: 'ego' }]
        },
        {
          label: '"Respeito a sua defesa, capitão."',
          effects: { affinity: { aiku: 3 }, stats: { compostura: 1 } },
          reply: [{ speaker: 'OLIVER AIKU', text: '"Respeito não vai te fazer passar por mim."', mood: 'normal' }]
        }
      ]
    },
    {
      id: 'ch5_bachira',
      speaker: 'MEGURU BACHIRA',
      text: '"Ei... sabe o que dá medo? Se a gente perder hoje, o Blue Lock acaba."',
      mood: 'tense',
      choices: [
        {
          label: '"Então a gente não perde."',
          effects: { affinity: { bachira: 6 } },
          reply: [{ speaker: 'MEGURU BACHIRA', text: '"Hehe! Isso! Vamos dançar com o monstro!"', mood: 'happy' }]
        },
        {
          label: '"Eu não jogo pelo Blue Lock. Jogo por mim."',
          effects: { affinity: { bachira: -3 }, stats: { ego: 3 } },
          reply: [{ speaker: 'MEGURU BACHIRA', text: '"...É, isso também é muito Blue Lock."', mood: 'normal' }]
        }
      ]
    }
  ],

  // Na NEL, linhas com "club" só tocam se você escolheu aquele clube (state.nelClub).
  // O "Escolham seu mestre" do Ego toca antes da escolha (NEL_DRAFT_INTRO).
  ch6_nel_barcha_manshine: [
    // A volta do Kunigami: o Wild Card
    { speaker: 'NARRADOR', text: 'No meio dos jogadores da NEL, o Kunigami de preto. Desde o Wild Card, ele não falou com ninguém.', mood: 'tense' },
    { speaker: 'RENSUKE KUNIGAMI', text: '"Não me olha assim. O herói ficou lá embaixo, no Wild Card. Agora é só eu e o gol."', mood: 'ego' },
    { speaker: 'VOCÊ', text: '(Os olhos dele... não sobrou nada do Kunigami que eu conhecia.)', mood: 'tense' },
    {
      id: 'ch6_noa',
      club: 'bastard',
      speaker: 'NOEL NOA',
      text: '"Eu avalio jogadores apenas por números. Por que você escolheu o Bastard München?"',
      mood: 'ego',
      choices: [
        {
          label: '"Vim aprender com o número 1 do mundo."',
          effects: { affinity: { noa: 6 }, stats: { visao: 1 } },
          reply: [{ speaker: 'NOEL NOA', text: '"Racional. Então observe e reproduza."', mood: 'ego' }]
        },
        {
          label: '"Quero tomar o seu lugar."',
          effects: { affinity: { noa: 3 }, stats: { ego: 3 } },
          reply: [{ speaker: 'NOEL NOA', text: '"Ambição sem números é ruído. Prove."', mood: 'ego' }]
        }
      ]
    },
    {
      id: 'ch6_kaiser',
      club: 'bastard',
      speaker: 'MICHAEL KAISER',
      text: '"Então você é o cachorrinho do Blue Lock? Fica fora do meu caminho."',
      mood: 'ego',
      choices: [
        {
          label: '"Seu império vai cair, Kaiser."',
          effects: { affinity: { kaiser: -4 }, stats: { ego: 3 } },
          reply: [{ speaker: 'MICHAEL KAISER', text: '"Hah... vou adorar te ver quebrar."', mood: 'ego' }]
        },
        {
          label: '"Vamos ver quem chega na bola primeiro."',
          effects: { affinity: { kaiser: 2, ness: -2 } },
          reply: [{ speaker: 'MICHAEL KAISER', text: '"Divertido. Não chore depois."', mood: 'ego' }]
        }
      ]
    },
    {
      id: 'ch6_ness',
      club: 'bastard',
      speaker: 'ALEXIS NESS',
      text: '"Encosta na bola que é do Kaiser e eu te destruo."',
      mood: 'tense',
      choices: [
        {
          label: '"A bola é de quem marcar o gol."',
          effects: { affinity: { ness: -6 }, stats: { ego: 2 } },
          reply: [{ speaker: 'ALEXIS NESS', text: '"Você vai se arrepender disso..."', mood: 'tense' }]
        },
        {
          label: '"Então passa pra mim também, Ness."',
          effects: { affinity: { ness: 3 } },
          reply: [{ speaker: 'ALEXIS NESS', text: '"...Só se o Kaiser mandar."', mood: 'normal' }]
        }
      ]
    },
    {
      id: 'ch6_kurona',
      club: 'bastard',
      speaker: 'KURONA RANZE',
      text: '"Ah... posso ficar perto de você no jogo? Eu gosto de órbita, órbita."',
      mood: 'happy',
      choices: [
        {
          label: '"Claro. Faz a tabela comigo."',
          effects: { affinity: { kurona: 8 } },
          reply: [{ speaker: 'KURONA RANZE', text: '"Yay! Órbita perfeita!"', mood: 'happy' }]
        },
        {
          label: '"Só não me atrapalha."',
          effects: { affinity: { kurona: -5 } },
          reply: [{ speaker: 'KURONA RANZE', text: '"...Tá. Desculpa, desculpa."', mood: 'tense' }]
        }
      ]
    },
    // Manshine City
    {
      id: 'ch6_prince',
      club: 'manshine',
      bg: 'locker_room',
      speaker: 'CHRIS PRINCE',
      text: '"Corpo, velocidade, recuperação... no Manshine a gente mede tudo. Por que você escolheu o Manshine City?"',
      mood: 'ego',
      choices: [
        {
          label: '"Quero o físico do melhor do mundo."',
          effects: { affinity: { chris_prince: 6 }, stats: { forca: 1 } },
          reply: [{ speaker: 'CHRIS PRINCE', text: '"Resposta perfeita! Agachamento amanhã às 6 da manhã, garoto!"', mood: 'happy' }]
        },
        {
          label: '"Vim jogar do lado do Nagi."',
          effects: { affinity: { nagi: 6 } },
          reply: [{ speaker: 'SEISHIRO NAGI', text: '"...Sério? Que trabalhoso. ...Mas valeu."', mood: 'normal' }]
        }
      ]
    },
    // FC Barcha
    {
      id: 'ch6_lavinho',
      club: 'barcha',
      bg: 'locker_room',
      speaker: 'LAVINHO',
      text: '"Por que o Barcha, amigo? Aqui ninguém te ensina tática. Aqui eu te ensino a se divertir!"',
      mood: 'happy',
      choices: [
        {
          label: '"Quero aprender a ginga do melhor do mundo."',
          effects: { affinity: { lavinho: 6 }, stats: { conducao: 1 } },
          reply: [{ speaker: 'LAVINHO', text: '"Então esquece o placar e escuta a música da bola!"', mood: 'happy' }]
        },
        {
          label: '"Vim pelo Bachira."',
          effects: { affinity: { bachira: 8 } },
          reply: [{ speaker: 'MEGURU BACHIRA', text: '"Parceiro! Eu sabia que o seu monstro ia vir brincar com o meu!"', mood: 'happy' }]
        }
      ]
    },
    // Ubers
    {
      id: 'ch6_snuffy',
      club: 'ubers',
      bg: 'locker_room',
      speaker: 'MARC SNUFFY',
      text: '"Na Ubers cada jogador é uma engrenagem. Por que um atacante egoísta como você escolheu a Ubers?"',
      mood: 'tense',
      choices: [
        {
          label: '"Pra aprender a quebrar sistemas perfeitos."',
          effects: { affinity: { snuffy: 6 }, stats: { visao: 1 } },
          reply: [{ speaker: 'MARC SNUFFY', text: '"Ótimo. Comece estudando o meu."', mood: 'ego' }]
        },
        {
          label: '"Pra marcar mais gols que o Barou."',
          effects: { affinity: { barou: 4 }, stats: { ego: 2 } },
          reply: [{ speaker: 'SHOUEI BAROU', text: '"Hah! Tenta, plebeu. O Rei não divide o trono."', mood: 'ego' }]
        }
      ]
    },
    // PXG
    {
      id: 'ch6_loki',
      club: 'pxg',
      bg: 'locker_room',
      speaker: 'JULIAN LOKI',
      text: '"Na Segunda Seleção eu te venci. Por que escolheu jogar do meu lado?"',
      mood: 'ego',
      choices: [
        {
          label: '"Pra estudar de perto a sua velocidade."',
          effects: { affinity: { loki: 6 }, stats: { velocidade: 1 } },
          reply: [{ speaker: 'JULIAN LOKI', text: '"Então não pisque. Eu não espero ninguém."', mood: 'ego' }]
        },
        {
          label: '"Pra te ultrapassar dentro do seu próprio time."',
          effects: { affinity: { loki: 3 }, stats: { ego: 3 } },
          reply: [{ speaker: 'JULIAN LOKI', text: '"Hm. Pelo menos você não veio pra ser coadjuvante."', mood: 'ego' }]
        }
      ]
    }
  ],

  ch7_nel_ubers_pxg: [
    { speaker: 'NARRADOR', text: 'Reta final da NEL. O telão da BLTV mostra seu salário subindo... ou caindo.', mood: 'tense' },
    {
      id: 'ch7_hiori',
      club: 'bastard',
      speaker: 'YO HIORI',
      text: '"Se a gente cruzar nossos reflexos, ninguém para a gente."',
      mood: 'normal',
      choices: [
        {
          label: '"Confio em você, Hiori."',
          effects: { affinity: { hiori: 8 } },
          reply: [{ speaker: 'YO HIORI', text: '"...Então não olha pra mim. Só corre."', mood: 'ego' }]
        },
        {
          label: '"Só me dá a bola e sai da frente."',
          effects: { affinity: { hiori: -6 }, stats: { ego: 2 } },
          reply: [{ speaker: 'YO HIORI', text: '"...Que egoísta. Mas tudo bem."', mood: 'tense' }]
        }
      ]
    },
    // Lorenzo, Charles e Snuffy são rivais de quem pega Ubers & PXG na reta final
    {
      id: 'ch7_lorenzo',
      club: ['bastard', 'manshine'],
      speaker: 'DON LORENZO',
      text: '"Hehehe... seus tornozelos parecem tão gostosos..."',
      mood: 'ego',
      choices: [
        {
          label: '"Tenta morder, zumbi."',
          effects: { affinity: { lorenzo: 3 }, stats: { ego: 2 } },
          reply: [{ speaker: 'DON LORENZO', text: '"Hehe... vou comer seu valor de mercado inteiro."', mood: 'ego' }]
        },
        {
          label: '"Sai pra lá."',
          effects: { affinity: { lorenzo: -3 } },
          reply: [{ speaker: 'DON LORENZO', text: '"Que sem graça..."', mood: 'normal' }]
        }
      ]
    },
    {
      id: 'ch7_charles',
      club: ['bastard', 'manshine'],
      speaker: 'CHARLES CHEVALIER',
      text: '"Você é divertido? Se não for, eu nem vou olhar pra você."',
      mood: 'happy',
      choices: [
        {
          label: '"Sou o cara mais divertido desse campo."',
          effects: { affinity: { charles: 6 } },
          reply: [{ speaker: 'CHARLES CHEVALIER', text: '"Bleh! Vamos ver, então!"', mood: 'happy' }]
        },
        {
          label: '"Não estou aqui pra te divertir."',
          effects: { affinity: { charles: -4 }, stats: { compostura: 1 } },
          reply: [{ speaker: 'CHARLES CHEVALIER', text: '"Chaaato..."', mood: 'normal' }]
        }
      ]
    },
    {
      id: 'ch7_snuffy',
      club: ['bastard', 'manshine'],
      speaker: 'MARC SNUFFY',
      text: '"Um sistema perfeito não teme um indivíduo. E você é só um indivíduo."',
      mood: 'tense',
      choices: [
        {
          label: '"Então eu sou o erro do seu sistema."',
          effects: { affinity: { snuffy: 5 }, stats: { ego: 2 } },
          reply: [{ speaker: 'MARC SNUFFY', text: '"Interessante. Erros também podem ser corrigidos."', mood: 'ego' }]
        },
        {
          label: '"Vou estudar o seu sistema durante o jogo."',
          effects: { affinity: { snuffy: 3 }, stats: { visao: 2 } },
          reply: [{ speaker: 'MARC SNUFFY', text: '"Boa resposta. Vai precisar de mais de 90 minutos."', mood: 'normal' }]
        }
      ]
    },
    {
      id: 'ch7_chigiri',
      club: 'manshine',
      speaker: 'HYOMA CHIGIRI',
      text: '"Última partida da NEL. Se eu arrancar pela esquerda, você me acompanha?"',
      mood: 'ego',
      choices: [
        {
          label: '"Te acompanho até dentro do gol."',
          effects: { affinity: { chigiri: 8 } },
          reply: [{ speaker: 'HYOMA CHIGIRI', text: '"Então tenta não ficar pra trás!"', mood: 'happy' }]
        },
        {
          label: '"Arranca que eu fico esperando o rebote."',
          effects: { affinity: { chigiri: 3 }, stats: { posicionamento: 1 } },
          reply: [{ speaker: 'HYOMA CHIGIRI', text: '"Típico de você... tá bom, eu abro o caminho."', mood: 'normal' }]
        }
      ]
    },
    {
      id: 'ch7_otoya',
      club: 'barcha',
      speaker: 'EITA OTOYA',
      text: '"Eles nem me veem chegando. Quer que eu suma do radar ou que eu apareça do seu lado?"',
      mood: 'normal',
      choices: [
        {
          label: '"Some. Eu viro a isca e você finaliza."',
          effects: { affinity: { otoya: 6 }, stats: { visao: 1 } },
          reply: [{ speaker: 'EITA OTOYA', text: '"Hehe... ninja que é ninja não recusa um convite desses."', mood: 'happy' }]
        },
        {
          label: '"Aparece no último segundo. O gol é meu."',
          effects: { affinity: { otoya: 3 }, stats: { ego: 2 } },
          reply: [{ speaker: 'EITA OTOYA', text: '"Egoísta... gostei."', mood: 'ego' }]
        }
      ]
    },
    {
      id: 'ch7_barou',
      club: 'ubers',
      speaker: 'SHOUEI BAROU',
      text: '"Hoje quem marca sou eu. Você fica de coadjuvante do Rei."',
      mood: 'ego',
      choices: [
        {
          label: '"Dois reis no mesmo campo, Barou."',
          effects: { affinity: { barou: 6 } },
          reply: [{ speaker: 'SHOUEI BAROU', text: '"...Tsc. Só hoje eu divido o trono."', mood: 'ego' }]
        },
        {
          label: '"O coadjuvante hoje é você."',
          effects: { affinity: { barou: -2 }, stats: { ego: 3 } },
          reply: [{ speaker: 'SHOUEI BAROU', text: '"HAH! Então me prova em campo, plebeu!"', mood: 'ego' }]
        }
      ]
    },
    {
      id: 'ch7_rin',
      club: 'pxg',
      speaker: 'RIN ITOSHI',
      text: '"Hoje é o Kaiser. Não se mete no meu caminho."',
      mood: 'tense',
      choices: [
        {
          label: '"Eu crio o espaço, você destrói."',
          effects: { affinity: { rin: 6 } },
          reply: [{ speaker: 'RIN ITOSHI', text: '"...Hm. Pelo menos você entende o próprio papel."', mood: 'ego' }]
        },
        {
          label: '"O caminho até o gol é meu, Rin."',
          effects: { affinity: { rin: 2 }, stats: { ego: 2 } },
          reply: [{ speaker: 'RIN ITOSHI', text: '"Então corre. Eu chego primeiro."', mood: 'ego' }]
        }
      ]
    }
  ],

  ch8_u20_england: [
    { bg: 'tunnel', speaker: 'JINPACHI EGO', text: '"Copa do Mundo Sub-20. O mundo inteiro está assistindo. Não existe próxima chance."', mood: 'ego' }
  ],
  // Antes da semifinal contra a Inglaterra (cupRounds[].dialogues do capítulo da Copa Sub-20)
  ch8_u20_england_semi: [
    {
      id: 'ch8_teddy',
      bg: 'worldcup_england',
      speaker: 'TEDDY KNIGHT',
      text: '"Vocês, japoneses, acham mesmo que vão passar pela Inglaterra?"',
      mood: 'tense',
      choices: [
        {
          label: '"A Inglaterra vai chorar hoje."',
          effects: { affinity: { teddy_knight: -3 }, stats: { ego: 2 } },
          reply: [{ speaker: 'TEDDY KNIGHT', text: '"Vou lembrar disso quando estiver comemorando."', mood: 'ego' }]
        },
        {
          label: '"Respeito. Bom jogo."',
          effects: { affinity: { teddy_knight: 5 } },
          reply: [{ speaker: 'TEDDY KNIGHT', text: '"...Educado. Mas não vou pegar leve."', mood: 'normal' }]
        }
      ]
    },
    {
      id: 'ch8_agi',
      speaker: 'AGI',
      text: '"Me conta: com quem você tem mais química no seu time?"',
      mood: 'ego',
      choices: [
        {
          label: '"Com o Rin."',
          effects: { affinity: { rin: 6, agi: 2 } },
          reply: [{ speaker: 'RIN ITOSHI', text: '"...Tsc. Não fala besteira." (Ele está sorrindo de leve.)', mood: 'normal' }]
        },
        {
          label: '"Com o Shidou."',
          effects: { affinity: { shidou: 6, agi: 2 } },
          reply: [{ speaker: 'RYUSEI SHIDOU', text: '"HAHAHA! Ouviu, Inglaterra?! BIG BANG!"', mood: 'ego' }]
        },
        {
          label: '"Com ninguém. Eu jogo sozinho."',
          effects: { affinity: { rin: -3, shidou: -3 }, stats: { ego: 3 } },
          reply: [{ speaker: 'AGI', text: '"Fascinante... um ego completamente isolado."', mood: 'ego' }]
        }
      ]
    },
    {
      id: 'ch8_rin',
      speaker: 'RIN ITOSHI',
      text: '"Não me atrapalha hoje."',
      mood: 'tense',
      choices: [
        {
          label: '"Hoje eu e você destruímos a Inglaterra juntos."',
          effects: { affinity: { rin: 6 } },
          reply: [{ speaker: 'RIN ITOSHI', text: '"...Só hoje."', mood: 'ego' }]
        },
        {
          label: '"Você que não me atrapalha."',
          effects: { affinity: { rin: 2 }, stats: { ego: 2 } },
          reply: [{ speaker: 'RIN ITOSHI', text: '"...Heh. Finalmente falou como um atacante."', mood: 'ego' }]
        }
      ]
    }
  ],

  // O treino da Raposa: cinco da manhã, a escada, o Fox e o monstro
  ch10_fox_training: [
    { bg: 'bluelock_bunker', music: 'dread', speaker: 'NARRADOR', text: 'Quatro da manhã. O Fox já está esperando no campo apagado, de terno, girando o dedo e sorrindo com dentes demais.', mood: 'tense' },
    { speaker: 'FOX', text: '"Pontual. Que pena. Eu ia gostar de te castigar."', mood: 'happy' },
    { cinematic: 'fox_training' },
    { speaker: 'FOX', text: '"Escuta: o monstro não aparece quando tá tudo fácil. Ele aparece quando você tá perdendo, humilhado, quando o corpo já desistiu. Então eu vou te humilhar."', mood: 'ego' },
    { speaker: 'VOCÊ', text: '"...E se eu não acordar ele?"', mood: 'tense' },
    { speaker: 'FOX', text: '"Aí você quebra. E eu procuro outro garoto. Hehehe... sempre tem outro garoto."', mood: 'ego' },
    { music: 'none', speaker: 'NARRADOR', text: 'No campo, o time do Fox espera: Rin, Kaiser, Barou e Shidou. O Rin nem olha pra você. Só pra bola.', mood: 'tense' }
  ],

  ch9_world_cup_final: [
    { bg: 'tunnel', speaker: 'NARRADOR', text: 'Noite da Grande Final. Japão Sub-20 contra França Sub-20. O túnel treme com o barulho da torcida.', mood: 'tense' },
    {
      id: 'ch9_sae',
      bg: 'worldcup_final',
      speaker: 'SAE ITOSHI',
      text: '"Hoje eu jogo do seu lado. Não me faça me arrepender."',
      mood: 'ego',
      choices: [
        {
          label: '"Seu passe, meu gol."',
          effects: { affinity: { sae: 8 } },
          reply: [{ speaker: 'SAE ITOSHI', text: '"Simples. Gosto disso."', mood: 'ego' }]
        },
        {
          label: '"Hoje o protagonista sou eu, Sae."',
          effects: { affinity: { sae: 2 }, stats: { ego: 3 } },
          reply: [{ speaker: 'SAE ITOSHI', text: '"...Finalmente alguém com ego suficiente."', mood: 'ego' }]
        }
      ]
    },
    {
      id: 'ch9_rin',
      speaker: 'RIN ITOSHI',
      text: '"Meu irmão do mesmo lado... isso me enoja. Mas a gente vai vencer."',
      mood: 'tense',
      choices: [
        {
          label: '"Rin, você e o Sae juntos são imparáveis."',
          effects: { affinity: { rin: 4, sae: 4 } },
          reply: [{ speaker: 'RIN ITOSHI', text: '"...Não repete isso nunca mais." (Mas ele não discorda.)', mood: 'normal' }]
        },
        {
          label: '"Esquece o Sae. Joga comigo."',
          effects: { affinity: { rin: 8, sae: -4 } },
          reply: [{ speaker: 'RIN ITOSHI', text: '"Hm. Então acompanha meu ritmo."', mood: 'ego' }]
        }
      ]
    },
    {
      id: 'ch9_hugo',
      speaker: 'HUGO',
      text: '"Então você é o japonês que todo mundo comenta? Até o meu cabelo é mais famoso que você."',
      mood: 'ego',
      choices: [
        {
          label: '"Esse cabelo rosa vai sair na foto da minha comemoração."',
          effects: { affinity: { hugo: 4 }, stats: { ego: 2 } },
          reply: [{ speaker: 'HUGO', text: '"Hahaha! Vamos ver, Japão!"', mood: 'happy' }]
        },
        {
          label: '"Prazer, Hugo. Que vença o melhor."',
          effects: { affinity: { hugo: 6 } },
          reply: [{ speaker: 'HUGO', text: '"O melhor sou eu. Mas gostei de você."', mood: 'ego' }]
        }
      ]
    },
    {
      id: 'ch9_loki',
      speaker: 'JULIAN LOKI',
      text: '"Desde a Segunda Seleção eu espero por esse reencontro."',
      mood: 'ego',
      choices: [
        {
          label: '"Dessa vez eu te alcanço."',
          effects: { affinity: { loki: 6 }, stats: { ego: 2 } },
          reply: [{ speaker: 'JULIAN LOKI', text: '"Então corra como nunca correu."', mood: 'ego' }]
        },
        {
          label: '"Você ainda é o mais rápido... mas eu sou o mais faminto."',
          effects: { affinity: { loki: 4 }, stats: { ego: 3 } },
          reply: [{ speaker: 'JULIAN LOKI', text: '"Fome. É isso que faltava no seu jogo."', mood: 'ego' }]
        }
      ]
    }
  ]
};

// ============================================================================
// ESQUEMA DE TREINOS (DIFICULDADE REALISTA: EVOLUÇÃO GRADUAL E SUADA DO OVR!)
// Quatro treinos jogáveis: dois na ACADEMIA do prédio (js/treino_academia.js: o treino
// começa no próprio aparelho, com a câmera de lado) e dois no CAMPO (MatchEngine.trainingTick):
//   bench    → SUPINO: cursor vai e volta numa barra de força; apertar na faixa = repetição
//   pullup   → BARRA FIXA: segurar sobe o cursor, soltar ele cai; dentro da faixa que anda = sobe
//   gauntlet → CORREDOR DE DRIBLE: robôs dão o bote; drible no tempo do bote e gol no fim
//   rondo    → RONDO DE LEITURA: passe para o lado livre, chegue no ponto e bata de fora da área
// place = 'academia' | 'campo' (onde o treino acontece; a aba TREINOS mostra)
// time = segundos, target = meta; no fim sai uma nota S/A/B/C que multiplica os ganhos
// (App.onTrainingMinigameFinished) e fica o recorde de cada treino (state.trainingRecords)
// intro = falas curtas do mentor antes do treino (o nome de quem fala vira o ator da cena)
// (os ids antigos train_physical/train_shooting/train_mental/train_chemical continuam
// guardados nos saves em trainingRecords, só não aparecem mais)
// ============================================================================
window.TRAINING_DRILLS = [
  {
    id: 'trn_supino',
    name: 'Supino de Força (Banco e Barra)',
    mentor: 'Chris Prince',
    category: 'FÍSICO',
    place: 'academia',
    station: 'supino',
    costEnergy: 0,
    cooldownSec: 2,
    statGains: { forca: 3, poderDisparo: 2, resistencia: 1 },
    spGain: 1,
    coinGain: 50,
    mode: 'bench', time: 40, target: 12, unit: 'repetições',
    desc: 'NO BANCO DA ACADEMIA: o cursor vai e volta na barra de força. Aperte [ESPAÇO] (ou toque) na faixa verde para subir a barra; no centro é PERFEITO. Errou, a barra treme e você cansa.',
    intro: [
      { speaker: 'CHRIS PRINCE', text: '"O corpo é a base de tudo. Sem força, a sua técnica vira enfeite."', mood: 'ego' },
      { speaker: 'CHRIS PRINCE', text: '"Empurre no tempo certo. Errou o tempo, a barra desce no seu peito — e cobra caro."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '"Então ela vai subir até o relógio acabar."', mood: 'ego' }
    ]
  },
  {
    id: 'trn_barra',
    name: 'Barra Fixa (Pegada e Fôlego)',
    mentor: 'Rensuke Kunigami',
    category: 'FÍSICO',
    place: 'academia',
    station: 'barra',
    costEnergy: 0,
    cooldownSec: 2,
    statGains: { forca: 1, resistencia: 2, habilidadeAerea: 2, compostura: 1 },
    spGain: 1,
    coinGain: 45,
    mode: 'pullup', time: 45, target: 10, unit: 'barras',
    desc: 'NA BARRA FIXA DA ACADEMIA: segure [ESPAÇO] (ou o botão) para subir o cursor e solte para ele cair. Com o cursor dentro da faixa que anda, você sobe; fora dela, desce e a pegada cansa.',
    intro: [
      { speaker: 'RENSUKE KUNIGAMI', text: '"Quem ganha a bola no alto é quem aguenta o próprio peso."', mood: 'ego' },
      { speaker: 'RENSUKE KUNIGAMI', text: '"Sobe sem pressa e sem balançar. Se escorregar, pega de novo. Do jeito certo."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '"Uma de cada vez, até o queixo passar da barra."', mood: 'ego' }
    ]
  },
  {
    id: 'trn_drible',
    name: 'Corredor de Drible (Robôs do Bote)',
    mentor: 'Meguru Bachira',
    category: 'TÉCNICA',
    place: 'campo',
    costEnergy: 0,
    cooldownSec: 2,
    statGains: { conducao: 2, velocidade: 2, finalizando: 2, ego: 1 },
    spGain: 1,
    coinGain: 55,
    mode: 'gauntlet', time: 50, target: 15, unit: 'pontos',
    desc: 'NO CAMPO: três robôs dão o bote em fila. Chegue perto e drible com [ESPAÇO] quando o anel vermelho fechar no robô. Drible = 1 ponto, gol no fim do corredor = 2 pontos e +3 s.',
    intro: [
      { speaker: 'MEGURU BACHIRA', text: '"Esses robôs dão o bote igualzinho zagueiro de verdade. Que divertido!"', mood: 'ego' },
      { speaker: 'MEGURU BACHIRA', text: '"Espera eles virem. Dribla na hora do bote: antes eles leem, depois já era."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '"Passo pelos três e fecho com gol."', mood: 'ego' }
    ]
  },
  {
    id: 'trn_rondo',
    name: 'Rondo de Leitura (Passe e Chute de Fora)',
    mentor: 'Yo Hiori & Reo Mikage',
    category: 'SINERGIA',
    place: 'campo',
    costEnergy: 0,
    cooldownSec: 3,
    statGains: { visao: 2, posicionamento: 2, compostura: 1, tirosLongos: 2 },
    affinityGain: 10,
    spGain: 1,
    coinGain: 65,
    mode: 'rondo', time: 55, target: 4, unit: 'gols de fora',
    desc: 'NO CAMPO: com o robô pressionando, toque para o parceiro LIVRE (o outro está marcado), corra até o ponto onde a bola volta e chute de FORA DA ÁREA. Cada gol de fora vale 1.',
    intro: [
      { speaker: 'YO HIORI', text: '"No rondo, quem pensa devagar perde a bola. Olha antes de receber."', mood: 'ego' },
      { speaker: 'REO MIKAGE', text: '"Toca pro lado livre, chega no ponto e bate de fora. Eu devolvo redondinho."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '"Vou ler o passe antes do robô."', mood: 'ego' }
    ]
  }
];

// ============================================================================
// INTERLÚDIOS: histórias grandes entre capítulos, tocadas UMA vez antes do
// capítulo que tem "interlude" (App.launchChapterMatch) e que dá para rever na
// aba HISTÓRIA. spain = antes da Copa Sub-20: o Ego te manda para a Espanha, o
// voo, o Bunny disfarçado na cafeteria e o clássico Barcha x Re Al.
// ============================================================================
window.STORY_INTERLUDES = {
  // O gol da sorte contra a Sub-20 e o Rin virando rival: toca no pós-jogo do Cap. 6
  // e fica aqui só para rever
  rin_rival_scene: {
    title: 'O Gol da Sorte e o Rival Mortal',
    lines: [{ cinematic: 'u20_direct_shoot' }, ...window.RIN_RIVAL_SCENE]
  },
  // 2ª Seleção: quem vence escolhe um jogador do time derrotado, e o Nagi larga o Reo
  nagi_choice: {
    title: 'O Tesouro que Foi Embora',
    lines: [
      { bg: 'bluelock_holo', music: 'tension', speaker: 'NARRADOR', text: 'Segunda Seleção. Vocês acabaram de vencer o time do Nagi e do Reo.', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"Regra da Segunda Seleção: o time vencedor leva UM jogador do time derrotado. Escolham."', mood: 'ego' },
      { speaker: 'REO MIKAGE', text: '"Pode escolher qualquer um. Menos o Nagi. O Nagi é o MEU parceiro."', mood: 'tense' },
      { speaker: 'VOCÊ', text: '"Nagi. Eu escolho você."', mood: 'ego' },
      { speaker: 'SEISHIRO NAGI', text: '"..."', mood: 'normal' },
      { cinematic: 'nagi_reo_split' },
      { speaker: 'REO MIKAGE', text: '"Seis meses construindo isso... e você vai embora em um segundo."', mood: 'tense' },
      { speaker: 'SEISHIRO NAGI', text: '"Pela primeira vez na vida eu quero alguma coisa de verdade. Que saco... mas é verdade."', mood: 'normal' },
      {
        id: 'nagi_reo',
        speaker: 'REO MIKAGE',
        text: '"E você? Vai ficar aí parado olhando?"',
        mood: 'tense',
        choices: [
          {
            label: '"Vem atrás da gente, Reo. Fica mais forte e vem buscar ele."',
            effects: { affinity: { reo: 4, nagi: 2 } },
            reply: [{ speaker: 'REO MIKAGE', text: '"Não preciso da sua pena. Mas pode apostar que eu vou voltar."', mood: 'tense' }]
          },
          {
            label: '"Ele escolheu. Aceita."',
            effects: { affinity: { reo: -3, nagi: 4 }, stats: { ego: 2 } },
            reply: [{ speaker: 'REO MIKAGE', text: '"...Guarda bem a minha cara. Um dia eu tiro o Nagi de você na frente de todo mundo."', mood: 'tense' }]
          }
        ]
      },
      { speaker: 'NARRADOR', text: 'O Reo fica sozinho no campo holográfico. A coroa que ele prometeu ao Nagi agora não tem dono.', mood: 'tense' },
      { music: 'none', speaker: 'VOCÊ', text: '(Um gênio do meu lado. Agora não tem desculpa: ou eu fico acima dele, ou eu sumo.)', mood: 'ego' }
    ]
  },
  // Fim da 2ª Seleção: o Kunigami eliminado escolhe a porta preta (toca antes do Cap. 4)
  wildcard_door: {
    title: 'A Porta do Wild Card',
    lines: [
      { dark: true, bg: 'corridor', music: 'dread', speaker: 'NARRADOR', text: 'Fim da Segunda Seleção. Quem passou ganhou um quarto novo. Quem perdeu ganhou uma mala e um corredor.', mood: 'tense' },
      { speaker: 'HYOMA CHIGIRI', text: '"Ei... o Kunigami não passou. Ele perdeu o último jogo depois que eu troquei de time."', mood: 'tense' },
      { speaker: 'VOCÊ', text: '"Ele ainda tá no prédio?"', mood: 'tense' },
      { speaker: 'NARRADOR', text: 'Vocês correm até o fim do corredor. Tarde demais: só dá para ver as costas largas dele virando a esquina.', mood: 'tense' },
      { cinematic: 'wildcard_door' },
      { speaker: 'HYOMA CHIGIRI', text: '"Aquela porta preta... Ninguém sabe o que tem lá. O Ego nunca falou dela."', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"E não vai falar. O que acontece no Wild Card não é da conta de quem ainda está no Blue Lock. Voltem a jogar."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '(Kunigami... o cara que queria ser herói. O que sobra de um herói depois de uma porta dessas?)', mood: 'tense' },
      { dark: false, music: 'none', speaker: 'NARRADOR', text: 'Na manhã seguinte, a cama dele já está feita. Como se ele nunca tivesse existido.', mood: 'tense' }
    ]
  },
  // Antes da Sub-20: a lembrança do Rin (Kamakura, a noite em que o Sae largou o sonho dos dois)
  itoshi_snow: {
    title: 'Neve em Kamakura',
    lines: [
      { bg: 'locker_room', music: 'tension', speaker: 'NARRADOR', text: 'Vestiário do Estádio Nacional, uma hora antes do jogo. O Rin está sentado olhando para o nada.', mood: 'tense' },
      { speaker: 'VOCÊ', text: '"Rin. É o seu irmão do outro lado hoje. Você tá bem?"', mood: 'normal' },
      { speaker: 'RIN ITOSHI', text: '"Não fala dele como se você soubesse alguma coisa."', mood: 'tense' },
      { speaker: 'NARRADOR', text: 'Ele fecha os olhos. Lá fora, a torcida canta. Dentro da cabeça dele, está nevando.', mood: 'tense' },
      { cinematic: 'itoshi_snow' },
      { bg: 'snow_night', music: 'dread', speaker: 'NARRADOR', text: 'Kamakura, anos atrás. Desde aquela noite, o Rin joga para uma coisa só: destruir o irmão.', mood: 'tense' },
      { bg: 'locker_room', speaker: 'RIN ITOSHI', text: '"Hoje eu mostro pra ele que eu não preciso dele. E se você entrar no meu caminho, eu te destruo junto."', mood: 'tense' },
      { music: 'none', speaker: 'VOCÊ', text: '(Então é isso que tem embaixo daquela raiva toda... Mas hoje, Rin, quem vai roubar a cena sou eu.)', mood: 'ego' }
    ]
  },
  // Cap. 7: o que o Kunigami passou lá embaixo enquanto vocês venciam a Sub-20
  wildcard_hell: {
    title: 'O Inferno do Wild Card',
    lines: [
      { dark: true, bg: 'wildcard_lab', music: 'dread', speaker: 'NARRADOR', text: 'Enquanto o Blue Lock vencia a Sub-20 no Estádio Nacional, muitos andares abaixo, alguém não via o sol havia semanas.', mood: 'tense' },
      { cinematic: 'wildcard_hell' },
      { speaker: 'VOZ NO ALTO-FALANTE', text: '"Paixão é ruído. Amizade é ruído. O sonho de ser herói é o ruído mais alto de todos."', mood: 'tense' },
      { speaker: 'RENSUKE KUNIGAMI', text: '"...Então apaga. Apaga tudo que não faz gol."', mood: 'tense' },
      { speaker: 'VOZ NO ALTO-FALANTE', text: '"Dia 47. Programa concluído. Wild Card liberado para o teste final."', mood: 'tense' },
      { dark: false, music: 'none', speaker: 'NARRADOR', text: 'Lá em cima, ninguém sabe. Ainda.', mood: 'tense' }
    ]
  },
  // Só para o 🎬 REVER: a volta e o veredito do Wild Card (tocam dentro do Cap. 7)
  wildcard_return: {
    title: 'O Retorno do Coringa',
    lines: [
      { cinematic: 'kunigami_return' },
      { bg: 'bluelock_bunker', speaker: 'RENSUKE KUNIGAMI', text: '"Não fala comigo como se a gente fosse amigo. Aquele cara ficou lá embaixo."', mood: 'tense' },
      { cinematic: 'wildcard_verdict' },
      { speaker: 'JINPACHI EGO', text: '"Wild Card aprovado. Rensuke Kunigami entra na Liga Neo Egoísta pelo Manshine City."', mood: 'ego' }
    ]
  },
  // ---- 1ª Seleção (só para o 🎬 REVER: tocam dentro dos capítulos; a versão segue o seu
  // resultado: venceu um jogo que no mangá foi derrota = cena da vitória) ----
  barou_king_scene: {
    title: 'O Rei do Time X',
    get lines() {
      return [{ cinematic: window.App?.chapterWon('ch1_first_selection_x_y') ? 'barou_king_win' : 'barou_king' }];
    }
  },
  ego_victory_scene: {
    title: 'O Gosto da Vitória',
    lines: [{ cinematic: 'ego_victory' }]
  },
  team_w_scene: {
    title: 'A Traição e o Joelho',
    lines: [{ cinematic: 'kuon_betrayal' }, { cinematic: 'chigiri_sprint' }]
  },
  // ---- 2ª Seleção ----
  // Antes do 3 x 3: o teste sozinho contra o goleiro holográfico
  bluelock_man_test: {
    title: 'O Teste do BLUE LOCK MAN',
    lines: [
      { bg: 'bluelock_holo', music: 'tension', speaker: 'NARRADOR', text: 'Segunda Seleção. O campo holográfico, um gol, uma bola. E uma coisa azul do outro lado.', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"Primeira fase: vençam o BLUE LOCK MAN. Ele chuta e defende com os dados dos melhores atacantes do mundo."', mood: 'ego' },
      { cinematic: 'bluelock_man_test' },
      { speaker: 'VOCÊ', text: '(A máquina lê tudo o que é óbvio. Então eu tenho que ser o que ela não espera.)', mood: 'ego' },
      { music: 'none', speaker: 'ANRI TEIERI', text: '"Fase 1 concluída! Agora... times de três."', mood: 'happy' }
    ]
  },
  rin_bachira_scene: {
    title: 'O Monstro Vai Embora',
    get lines() {
      return [{ cinematic: window.App?.chapterWon('ch2b_second_selection') ? 'rin_takes_bachira_win' : 'rin_takes_bachira' }];
    }
  },
  // Antes do World Five: o 5 x 5 contra o time do Rin, em que você rouba o gol do próprio Barou
  barou_devour: {
    title: 'O Rei Devorado',
    lines: [
      { bg: 'bluelock_holo', music: 'tension', speaker: 'NARRADOR', text: 'Mais adiante na Segunda Seleção. Você e o Nagi agora jogam com o Barou e o Chigiri, contra o time do Rin.', mood: 'tense' },
      { speaker: 'SHOUEI BAROU', text: '"Vocês são meus súditos. A bola é do Rei. Fiquem fora do meu caminho."', mood: 'ego' },
      { cinematic: 'barou_devour' },
      { speaker: 'SHOUEI BAROU', text: '"...Você roubou o meu gol. Do meu próprio time."', mood: 'tense' },
      { speaker: 'VOCÊ', text: '"Não roubei. Eu só vi antes de você."', mood: 'ego' },
      { speaker: 'RIN ITOSHI', text: '"Você. Vem pro meu time."', mood: 'tense' }
    ]
  },
  world_five_scene: {
    title: 'O Muro do Mundo',
    get lines() {
      return [{ cinematic: window.App?.chapterWon('ch3_second_selection_world5') ? 'world_five_win' : 'world_five_fall' }];
    }
  },
  // Fim da 2ª Seleção: o Ego aposta o Blue Lock contra a Federação (antes do Top 6)
  ego_federation: {
    title: 'A Aposta com a Federação',
    lines: [
      { bg: 'monitor_room', music: 'dread', speaker: 'ANRI TEIERI', text: '"A Federação quer fechar o Blue Lock. Dizem que é caro, perigoso e que não vai dar em nada."', mood: 'urgent' },
      { cinematic: 'ego_federation' },
      { speaker: 'ANRI TEIERI', text: '"Consegui! A Sub-20 aceitou o jogo. Se a gente perder, acabou tudo. Se ganhar... vocês viram a seleção."', mood: 'urgent' },
      { music: 'none', speaker: 'VOCÊ', text: '(Então agora não é mais só a minha carreira. É o Blue Lock inteiro.)', mood: 'ego' }
    ]
  },
  // Antes da Sub-20: o Blue Lock Eleven e o Shidou cortado (o Sae leva ele para a Sub-20)
  bl_eleven: {
    title: 'O Blue Lock Eleven',
    lines: [
      { bg: 'monitor_room', music: 'tension', speaker: 'NARRADOR', text: 'Fim da Terceira Seleção. Todos os aprovados na frente do telão.', mood: 'tense' },
      { cinematic: 'bl_eleven' },
      { speaker: 'MEGURU BACHIRA', text: '"Hehe! Eu, você e o Rin no mesmo time de novo!"', mood: 'happy' }
    ]
  },
  shidou_cut: {
    title: 'O Shidou do Outro Lado',
    lines: [
      { cinematic: 'shidou_cut' },
      { bg: 'bluelock_holo', speaker: 'RYUSEI SHIDOU', text: '"HAHAHA! Que cara é essa? Agora eu posso explodir vocês sem dó!"', mood: 'ego' },
      { speaker: 'RIN ITOSHI', text: '"...O Sae escolheu ele. Não eu."', mood: 'tense' }
    ]
  },
  spain: {
    title: 'A Viagem para a Espanha',
    lines: [
      { bg: 'monitor_room', music: 'mystery', speaker: 'NARRADOR', text: 'Três dias depois do fim da Liga Neo Egoísta. O Ego te chama sozinho à sala de monitores.', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"Sente. Você sobreviveu à NEL. Mas sobreviver não é o mesmo que estar pronto para o mundo."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '"Falta pouco para a Copa Sub-20. O que mais eu preciso fazer?"', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"Ver. Até hoje você só viu futebol de dentro desta prisão. Os monstros de verdade estão lá fora, jogando enquanto a gente conversa."', mood: 'ego' },
      {
        id: 'spain_why',
        speaker: 'JINPACHI EGO',
        text: '"De todos os 23 convocados, eu escolhi você para essa viagem. Sabe por quê?"',
        mood: 'ego',
        choices: [
          {
            label: '"Porque eu sou o mais faminto daqui."',
            effects: { stats: { ego: 2 } },
            reply: [{ speaker: 'JINPACHI EGO', text: '"Fome sem visão é só barulho. Vá ver como os famintos de verdade comem."', mood: 'ego' }]
          },
          {
            label: '"Porque ainda tem coisa que eu não enxergo."',
            effects: { stats: { visao: 2 } },
            reply: [{ speaker: 'JINPACHI EGO', text: '"Exato. Quem sabe que é cego é o único que aprende a ver."', mood: 'ego' }]
          }
        ]
      },
      { cinematic: 'ego_ticket' },
      { speaker: 'JINPACHI EGO', text: '"Uma passagem para Barcelona e um ingresso para o clássico: FC Barcha contra Re Al. O Sae Itoshi joga. E tem alguém lá que quer muito te conhecer."', mood: 'ego' },
      { speaker: 'ANRI TEIERI', text: '"O voo sai amanhã às 6h! Eu coloquei protetor solar na sua mala... e nada de se perder no aeroporto, hein!"', mood: 'happy' },
      { speaker: 'VOCÊ', text: '(Espanha... o país onde o Sae virou um monstro.)', mood: 'ego' },
      { cinematic: 'spain_flight' },
      { bg: 'spain_cafe', music: 'travel', speaker: 'NARRADOR', text: 'Barcelona. Calor, cheiro de café e o estádio do Barcha aparecendo no fim da rua.', mood: 'normal' },
      { speaker: 'NARRADOR', text: 'Na mesa do canto, um cara de gorro preto e cardigã, rindo sozinho. Todo mundo no café finge que não reconheceu.', mood: 'normal' },
      // O Bunny do mangá: arrogante, só pensa em si e tem certeza de que é melhor que todo mundo
      { speaker: 'BUNNY (DISFARÇADO)', text: '"Psiu. Aqui. Senta e fala baixo: se descobrem que o melhor jogador da Espanha tá nesse café, vira tumulto."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '"...Bunny Iglesias? Esse disfarce não esconde nada."', mood: 'tense' },
      { speaker: 'BUNNY (DISFARÇADO)', text: '"Disfarce de famoso não é pra esconder, japonês. É pra lembrar todo mundo que eu sou famoso."', mood: 'ego' },
      { speaker: 'BUNNY (DISFARÇADO)', text: '"Eu vi a NEL. Você é... esforçado. Calcula tudo, corre atrás de tudo. Bonitinho. Eu não preciso disso: eu nasci melhor."', mood: 'ego' },
      {
        id: 'spain_bunny',
        speaker: 'BUNNY (DISFARÇADO)',
        text: '"O Ego te mandou aqui pra aprender comigo, né? Normal. Todo mundo quer aprender comigo."',
        mood: 'ego',
        choices: [
          {
            label: '"Nasceu melhor? Então prova."',
            effects: { affinity: { bunny: 4 }, stats: { ego: 2 } },
            reply: [{ speaker: 'BUNNY (DISFARÇADO)', text: '"Hoje à noite. Só não pisca, senão você perde a melhor jogada da sua vida."', mood: 'ego' }]
          },
          {
            label: '"Vim ver o Sae, não você."',
            effects: { affinity: { bunny: -3 }, stats: { conducao: 2 } },
            reply: [{ speaker: 'BUNNY (DISFARÇADO)', text: '"O Sae? AHAHA! Então hoje você vai ver o Sae sendo o segundo melhor do campo."', mood: 'ego' }]
          }
        ]
      },
      { speaker: 'BUNNY (DISFARÇADO)', text: '"Hoje é o clássico contra o Re Al. Lá chamam o Sae de gênio. Hoje à noite eu vou mostrar pro estádio inteiro quem é o gênio de verdade."', mood: 'ego' },
      { cinematic: 'clasico_bunny' },
      { bg: 'clasico_night', music: 'tension', speaker: 'SAE ITOSHI', text: '"...Um passe bonito não faz de você o melhor, Bunny."', mood: 'tense' },
      { speaker: 'BUNNY IGLESIAS', text: '"Faz sim. Pergunta pro placar. Pergunta pro estádio. Eu sou o melhor dessa geração, Sae, e no fundo você sabe."', mood: 'ego' },
      { speaker: 'SAE ITOSHI', text: '"E você, Blue Lock. Atravessou o mundo pra quê?"', mood: 'tense' },
      { speaker: 'VOCÊ', text: '"Pra ver os monstros de verdade."', mood: 'ego' },
      { speaker: 'SAE ITOSHI', text: '"Então já viu. Na Copa, não me envergonhe."', mood: 'ego' },
      { speaker: 'BUNNY IGLESIAS', text: '"Ah, o japonês. Aproveita a Copa: vai ser o mais perto que você chega de jogar no meu nível."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '(Arrogante... mas ele jogou exatamente como disse que ia jogar. Eu vou devorar isso também.)', mood: 'ego' },
      { bg: 'tunnel', music: 'none', speaker: 'NARRADOR', text: 'Você volta para o Japão com uma ideia nova na cabeça. A Copa do Mundo Sub-20 vai começar.', mood: 'tense' }
    ]
  },
  // O seu discurso no vestiário antes da estreia na Copa Sub-20
  cup_speech: {
    title: 'O Discurso',
    lines: [
      { bg: 'locker_room', music: 'tension', speaker: 'NARRADOR', text: 'Vestiário do Japão, minutos antes da estreia na Copa do Mundo Sub-20 contra a Nigéria.', mood: 'tense' },
      { speaker: 'NARRADOR', text: 'Ninguém fala. O Rin olha para o chão, o Shidou bate o pé sem parar. Até o Bachira está quieto.', mood: 'tense' },
      {
        id: 'cup_speech_tone',
        speaker: 'VOCÊ',
        text: '(Alguém precisa falar alguma coisa... e esse alguém sou eu.)',
        mood: 'ego',
        choices: [
          {
            label: 'Falar do ego: cada um aqui veio devorar o mundo.',
            effects: { affinity: { rin: 4, shidou: 4, barou: 3 }, stats: { ego: 3 } },
            reply: [{ speaker: 'VOCÊ', text: '"Ninguém aqui é coadjuvante. Hoje cada um de vocês vai querer o gol mais do que respirar."', mood: 'ego' }]
          },
          {
            label: 'Falar do time: a gente chegou aqui junto.',
            effects: { affinity: { bachira: 5, nagi: 4, gagamaru: 4, chigiri: 4 }, stats: { compostura: 2 } },
            reply: [{ speaker: 'VOCÊ', text: '"A gente sobreviveu ao Blue Lock juntos. Trezentos entraram. Nós somos o que sobrou."', mood: 'ego' }]
          }
        ]
      },
      { cinematic: 'captain_speech' },
      { music: 'epic', speaker: 'RYUSEI SHIDOU', text: '"HAHAHA! É ISSO! Minhas células estão explodindo! VAMOS DESTRUIR O MUNDO INTEIRO!"', mood: 'ego' },
      { speaker: 'MEGURU BACHIRA', text: '"O meu monstro tá rindo alto, parceiro! Bora brincar com o mundo inteiro!"', mood: 'happy' },
      { speaker: 'SEISHIRO NAGI', text: '"...Ok. Isso foi meio legal. Hoje eu vou me esforçar um pouco mais."', mood: 'normal' },
      { speaker: 'RIN ITOSHI', text: '"Tsc. Discurso não faz gol. ...Mas hoje ninguém nesse vestiário vai perder."', mood: 'ego' },
      { speaker: 'JINPACHI EGO', text: '"(no rádio) Hehe... Ninguém mandou ele falar. É assim que nasce um líder egoísta."', mood: 'ego' },
      { music: 'none', speaker: 'NARRADOR', text: 'O time entra em campo pilhado. A Química do time começa cheia.', mood: 'ego' }
    ]
  },
  // A cena da final da Copa Sub-20 contra a França: toca antes do jogo (App.
  // triggerFourEgosCutscene) e fica aqui para o 🎬 REVER
  four_egos: {
    title: 'Os Quatro Egos',
    lines: [
      { cinematic: 'four_egos_intro' },
      { bg: 'worldcup_final', music: 'epic', speaker: 'NARRADOR', text: '"Final da Copa do Mundo Sub-20. Japão contra França. Quatro egos no mesmo gramado... e só um vai reinar."', mood: 'ego' }
    ]
  },
  // O Hugo entra no Fluxo no meio da final (midMatchLore.sceneId marca como vista)
  hugo_gears: {
    title: 'A Engrenagem do Segundo Lugar',
    lines: [{ cinematic: 'hugo_gears' }]
  },
  // O gol do título e a entrada do Fox: toca no pós-jogo da final e fica aqui só
  // para rever (o clima escuro vem das próprias falas)
  fox_arrival: {
    title: 'O Gol do Título e a Raposa',
    lines: [{ cinematic: 'wc_final_goal' }, ...window.FOX_ARRIVAL]
  },
  // Antes do 2º turno da temporada profissional: o Rin te desafia
  // O final do jogo (depois do último duelo com o Rin): a Bola de Ouro, o Fox, o destino
  // de cada um e os créditos — as mesmas falas do pós-jogo do último capítulo
  final_ending: {
    title: 'O Final: Bola de Ouro e Epílogo',
    get lines() {
      return (window.CAREER_CHAPTERS.find((c) => c.id === 'ch14_rin_final')?.postMatchCutscene || []).slice();
    }
  },
  // A gala da Bola de Ouro: uma só, no epílogo (as mesmas falas do pós-jogo do último
  // capítulo, do "Paris, um mês depois" até a lição do Sae). O fim da temporada
  // profissional (App.finishProTurn) mostra só o ranking da Bola de Ouro.
  ballon_night: {
    title: 'A Noite da Bola de Ouro',
    get lines() {
      const L = window.CAREER_CHAPTERS.find((c) => c.id === 'ch14_rin_final')?.postMatchCutscene || [];
      const i0 = L.findIndex((l) => l.bg === 'paris_gala');
      const i1 = L.findIndex((l) => l.cinematic === 'rin_sae_licao');
      return i0 >= 0 && i1 > i0 ? L.slice(i0, i1 + 1) : [];
    }
  },
  rin_rivalry: {
    title: 'O Desafio do Rin',
    lines: [
      { dark: true, bg: 'rain_street', music: 'dread', speaker: 'NARRADOR', text: 'Noite de folga, chuva fina. Um carro para na frente do seu prédio. Quem desce é o Rin Itoshi, sem guarda-chuva.', mood: 'tense' },
      { speaker: 'RIN ITOSHI', text: '"Os jornais te chamam de favorito à Bola de Ouro. Cada vez que eu leio o seu nome, alguma coisa aqui dentro quer sair."', mood: 'tense' },
      { speaker: 'VOCÊ', text: '"Veio até aqui só pra dizer isso?"', mood: 'ego' },
      { cinematic: 'rin_challenge' },
      {
        id: 'rin_rivalry_answer',
        speaker: 'RIN ITOSHI',
        text: '"No 2º turno eu vou passar por cima de você e da sua corrida. O melhor do mundo vai ser eu. Entendeu?"',
        mood: 'ego',
        choices: [
          {
            label: '"Então vem. Eu devoro você junto com a Bola de Ouro."',
            effects: { affinity: { rin: 4 }, stats: { ego: 3 } },
            reply: [{ speaker: 'RIN ITOSHI', text: '"...Finalmente falou igual a um rival."', mood: 'ego' }]
          },
          {
            label: '"Eu não jogo contra você, Rin. Jogo contra o mundo."',
            effects: { affinity: { rin: -2 }, stats: { compostura: 3 } },
            reply: [{ speaker: 'RIN ITOSHI', text: '"Tsc. Então eu vou ser o mundo inteiro na sua frente."', mood: 'tense' }]
          }
        ]
      },
      { speaker: 'FOX', text: '"(no telefone) Hehehe, eu vi da janela. Fui eu que dei o seu endereço pra ele. Rival com ódio rende mais que rival com saudade."', mood: 'happy' },
      { speaker: 'VOCÊ', text: '(...Ele está usando o Rin. Está usando nós dois.)', mood: 'tense' },
      { music: 'none', speaker: 'NARRADOR', text: 'O 2º turno começa. A corrida pela Bola de Ouro está aberta.', mood: 'tense' }
    ]
  },
  // Antes da Copa do Mundo principal: o Ego convoca a seleção
  convocation: {
    title: 'A Convocação',
    lines: [
      { cinematic: 'convocation_call' },
      { dark: true, bg: 'monitor_room', music: 'mystery', speaker: 'NARRADOR', text: 'Sede da seleção japonesa. Na tela gigante, o rosto de sempre: Jinpachi Ego, agora técnico da seleção principal.', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"A Copa do Mundo. Não a Sub-20: a de verdade. Vinte e seis nomes. O Japão nunca passou das oitavas."', mood: 'ego' },
      { speaker: 'JINPACHI EGO', text: '"Sae Itoshi. Rin Itoshi. Ryusei Shidou. Meguru Bachira. Seishiro Nagi. Hyoma Chigiri. Gin Gagamaru..."', mood: 'ego' },
      { speaker: 'JINPACHI EGO', text: '"...e o atacante titular, camisa 11. O garoto que perdeu uma final no colégio e nunca mais hesitou na cara do gol."', mood: 'ego' },
      { speaker: 'ANRI TEIERI', text: '"Todo mundo está te esperando no vestiário... e o Fox conseguiu uma credencial de sei lá onde. Ninguém sabe quem deixou ele entrar."', mood: 'tense' },
      { speaker: 'JINPACHI EGO', text: '"Aquele homem não é treinador. É um parasita que engorda com o monstro dos outros. Fique longe dele."', mood: 'ego' },
      { speaker: 'FOX', text: '"Hehehe. Credencial de \'consultor\'. O Ego me odeia porque eu fiz em um ano o que ele levou três pra fazer."', mood: 'happy' },
      { speaker: 'SAE ITOSHI', text: '"Capitão: eu. Atacante: você. Não erra o que eu te passar."', mood: 'ego' },
      { music: 'epic', speaker: 'VOCÊ', text: '"Ninguém aqui veio participar. Vamos devorar o mundo inteiro."', mood: 'ego' }
    ]
  },
  // Abertura da Copa do Mundo: a cerimônia e o sorteio do grupo
  wc_opening: {
    title: 'A Abertura da Copa',
    lines: [
      { cinematic: 'wc_opening' },
      { dark: true, bg: 'worldcup_final', music: 'epic', speaker: 'NARRADOR MUNDIAL', text: '"Bem-vindos à Copa do Mundo! Quarenta e oito seleções, um troféu. No Grupo E: Japão, Itália, Argentina e Nigéria!"', mood: 'urgent' },
      { speaker: 'JINPACHI EGO', text: '"Fase de grupos: os dois primeiros passam. Mas eu não quero o segundo lugar de ninguém. Quero nove pontos."', mood: 'ego' },
      { speaker: 'SAE ITOSHI', text: '"Itália primeiro. O Lorenzo marca o homem mais caro do campo. Ou seja: você."', mood: 'ego' },
      { speaker: 'VOCÊ', text: '"Ótimo. Quanto mais caro o marcador, mais gostoso o gol."', mood: 'ego' }
    ]
  },
  // Véspera do último duelo contra o Rin
  rin_final_eve: {
    title: 'O Último Duelo',
    lines: [
      { dark: true, bg: 'bluelock_holo', music: 'dread', speaker: 'NARRADOR', text: 'Uma semana depois da Copa. Noite de chuva. O estádio do Blue Lock tem as luzes acesas, mas nenhum torcedor.', mood: 'tense' },
      { cinematic: 'rin_final_duel' },
      { speaker: 'JINPACHI EGO', text: '"(no telão) Três gols. Quem fizer primeiro é o número 1 do Blue Lock. O outro... carrega o número 2 até o fim da carreira."', mood: 'ego' },
      { speaker: 'RIN ITOSHI', text: '"Desde o vestiário da Sub-20 eu só penso nisso. Hoje eu te mato. E depois eu respiro."', mood: 'tense' },
      { speaker: 'VOCÊ', text: '"Você me ensinou como a sorte funciona, Rin. Hoje eu te mostro o que eu fiz com ela."', mood: 'ego' }
    ]
  }
};
// Ordem do 🎬 REVER = ordem da história (antes seguia a ordem em que as cenas foram escritas)
window.STORY_SCENE_ORDER = [
  'barou_king_scene', 'ego_victory_scene', 'team_w_scene', 'bluelock_man_test', 'nagi_choice', 'rin_bachira_scene',
  'barou_devour', 'world_five_scene', 'wildcard_door', 'ego_federation', 'bl_eleven', 'shidou_cut', 'itoshi_snow',
  'rin_rival_scene', 'wildcard_hell', 'wildcard_return', 'spain', 'cup_speech', 'four_egos', 'hugo_gears', 'fox_arrival', 'rin_rivalry',
  'convocation', 'wc_opening', 'rin_final_eve', 'ballon_night', 'final_ending'
];
window.storySceneIds = (seen = {}) => {
  const order = window.STORY_SCENE_ORDER;
  const pos = (id) => (order.includes(id) ? order.indexOf(id) : order.length);
  return Object.keys(window.STORY_INTERLUDES || {}).filter((id) => seen[id]).sort((x, y) => pos(x) - pos(y));
};

// ============================================================================
// DIFICULDADE (escolhida ao criar o jogador; dá para trocar no ✏️ do nome)
//   rivalEdge: vantagem a mais dos rivais (desarme, leitura de drible, chute)
//   rivalSpeed: multiplica a velocidade dos rivais
//   rivalKeeper: multiplica a chance de defesa do goleiro rival
//   myKeeper: soma na chance de defesa do seu goleiro
//   coinMult: multiplica as EgoCoins de partidas e capítulos
//   (rivalEdge e edgeFloor entram DEPOIS do limite rivalEdgeCap do capítulo — antes
//   o bônus do Egoísta era cortado por esse limite e quase não mudava nada)
//   edgeFloor: vantagem mínima de todo rival
//   tackleMult: chance de desarme dos rivais • tackleCdMult: tempo entre botes
//   chasers: quantos rivais vêm na bola ao mesmo tempo
//   dribbleCut / accCut: tira da chance de drible e do acerto do chute (pontos %)
//   rivalShotMult: frequência de chute dos rivais • gkHardShot: chute que passa direto
//   precisa ser mais forte • flowMult: velocidade da carga do Fluxo • staminaMult: custo de fôlego
// ============================================================================
window.DIFFICULTY_MODES = {
  facil: { id: 'facil', name: 'FÁCIL', icon: '🟢', color: '#22c55e', desc: 'Rivais mais lentos e fracos, goleiro rival defende menos e o seu defende mais.', reward: '−20% de EgoCoins', rivalEdge: -0.15, edgeFloor: -0.5, rivalSpeed: 0.9, rivalKeeper: 0.75, myKeeper: 0.08, tackleMult: 0.85, tackleCdMult: 1.2, chasers: 2, dribbleCut: -5, accCut: -5, rivalShotMult: 0.8, gkHardShot: 0, flowMult: 1.15, staminaMult: 0.9, rivalSprint: 1.28, coinMult: 0.8 },
  normal: { id: 'normal', name: 'NORMAL', icon: '🔵', color: '#38bdf8', desc: 'O jogo como foi pensado: cada capítulo mais difícil que o outro.', reward: 'EgoCoins normais', rivalEdge: 0, edgeFloor: -0.5, rivalSpeed: 1, rivalKeeper: 1, myKeeper: 0, tackleMult: 1, tackleCdMult: 1, chasers: 2, dribbleCut: 0, accCut: 0, rivalShotMult: 1, gkHardShot: 0, flowMult: 1, staminaMult: 1, rivalSprint: 1.42, coinMult: 1 },
  egoista: { id: 'egoista', name: 'EGOÍSTA', icon: '🔴', color: '#ef4444', desc: 'Pra quem quer sofrer: rivais bem mais rápidos que dão bote em três, leem seus dribles, chutam muito mais e um goleiro que pega quase tudo. Seu goleiro piora, o Fluxo demora e o fôlego acaba rápido.', reward: '+60% de EgoCoins', rivalEdge: 0.25, edgeFloor: 0.4, rivalSpeed: 1.17, rivalKeeper: 1.4, myKeeper: -0.18, tackleMult: 1.45, tackleCdMult: 0.6, chasers: 3, dribbleCut: 18, accCut: 14, capCut: 13, rivalShotMult: 1.7, gkHardShot: 2.5, flowMult: 0.65, staminaMult: 1.35, rivalSprint: 1.58, coinMult: 1.6 }
};

// AMBIDESTRO (pé "AMBOS"): passiva de nascença. Ao criar a carreira há um sorteio
// (birthChance); quem não nasce assim só libera ao chegar no OVR unlockOvr (treinou a
// perna ruim). Em campo: +accBonus% de acerto no chute e +dribbleBonus% no drible.
window.AMBIDEXTROUS = { birthChance: 0.1, unlockOvr: 52, accBonus: 5, dribbleBonus: 5 };

// Treinos por partida: cada treino gasta 1 de energia; jogar uma partida enche de novo
window.TRAINING_ENERGY_MAX = 3;

window.ACHIEVEMENTS_DB = [
  { id: 'ach_prologue', title: 'O Arrependimento do Passe', desc: 'Complete a Final do Ensino Médio e entre no Projeto Blue Lock.', rewardCoins: 100, rewardSpins: 1 },
  { id: 'ach_first_spin', title: 'Despertar da Arma Egoísta', desc: 'Gire sua primeira Arma após entrar no Blue Lock.', rewardCoins: 100, rewardSpins: 1 },
  { id: 'ach_yukimiya_style', title: 'Domínio das Skills (1, 2 e 3)', desc: 'Use as Skills da sua Arma em uma partida oficial.', rewardCoins: 120, rewardSpins: 1 },
  { id: 'ach_chem_shidou', title: 'Big Bang Celular', desc: 'Ative uma Reação Química durante a partida (Tecla C).', rewardCoins: 150, rewardSpins: 1 },
  { id: 'ach_u20_win', title: 'Herói do Japão Sub-20', desc: 'Derrote a Seleção Japonesa Sub-20 de Sae Itoshi e Oliver Aiku.', rewardCoins: 250, rewardSpins: 2 },
  { id: 'ach_nel_unlock', title: 'Duas Armas na Liga Neo Egoísta', desc: 'Chegue na NEL e desbloqueie o 2º Slot de Arma e Fluxo.', rewardCoins: 300, rewardSpins: 2 },
  { id: 'ach_england_u20', title: 'Destruidor da Coroa Inglesa', desc: 'Vença a Inglaterra na Copa do Mundo Sub-20 (Arco Atual do Mangá).', rewardCoins: 400, rewardSpins: 2 },
  { id: 'ach_four_egos', title: 'OS QUATRO EGOS (Campeão Mundial)', desc: 'Presencie a cena "Quatro Egos" (Você, Sae, Loki e Hugo) e conquiste a Copa do Mundo!', rewardCoins: 1000, rewardSpins: 5 },
  // Conquistas com progresso: progress(state, app) devolve [atual, meta] e a conquista sai sozinha
  // quando bate a meta (App.checkAchievements). c = state.career (estatísticas da carreira).
  { id: 'ach_first_goal', title: 'Primeiro Gol Egoísta', desc: 'Marque o seu primeiro gol em uma partida.', rewardCoins: 80, rewardSpins: 1, progress: (s) => [s.career.myGoals, 1] },
  { id: 'ach_goals_10', title: 'Artilheiro do Blue Lock', desc: 'Marque 10 gols na carreira.', rewardCoins: 150, rewardSpins: 1, progress: (s) => [s.career.myGoals, 10] },
  { id: 'ach_goals_25', title: 'Predador da Área', desc: 'Marque 25 gols na carreira.', rewardCoins: 300, rewardSpins: 2, progress: (s) => [s.career.myGoals, 25] },
  { id: 'ach_goals_50', title: 'Máquina de Gols', desc: 'Marque 50 gols na carreira.', rewardCoins: 600, rewardSpins: 3, progress: (s) => [s.career.myGoals, 50] },
  { id: 'ach_hat_trick', title: 'Hat-trick!', desc: 'Marque 3 gols na mesma partida.', rewardCoins: 200, rewardSpins: 1, progress: (s) => [s.career.hatTricks, 1] },
  { id: 'ach_angle_5', title: 'Sniper do Ângulo', desc: 'Marque 5 gols no ângulo.', rewardCoins: 200, rewardSpins: 1, progress: (s) => [s.career.angleGoals, 5] },
  { id: 'ach_long_3', title: 'Canhão de Fora da Área', desc: 'Marque 3 gols de longe.', rewardCoins: 200, rewardSpins: 1, progress: (s) => [s.career.longGoals, 3] },
  { id: 'ach_dribble_30', title: 'Quebrador de Tornozelos', desc: 'Acerte 30 dribles em partidas.', rewardCoins: 200, rewardSpins: 1, progress: (s) => [s.career.dribbles, 30] },
  { id: 'ach_steal_20', title: 'Ladrão de Bolas', desc: 'Roube a bola 20 vezes (carrinho ou bote).', rewardCoins: 200, rewardSpins: 1, progress: (s) => [s.career.steals, 20] },
  { id: 'ach_wins_10', title: 'Vencedor Nato', desc: 'Vença 10 partidas.', rewardCoins: 250, rewardSpins: 2, progress: (s) => [s.career.wins, 10] },
  { id: 'ach_rating_9', title: 'Atuação de Gala', desc: 'Termine uma partida com nota 9.0 ou mais.', rewardCoins: 250, rewardSpins: 1, progress: (s) => [s.career.bestRating >= 9 ? 1 : 0, 1] },
  { id: 'ach_legendary', title: 'Tirou Lendário!', desc: 'Tire uma Arma ou Fluxo Lendário (ou melhor) na roleta.', rewardCoins: 150, rewardSpins: 1, progress: (s) => [s.career.legendaryPulls, 1] },
  { id: 'ach_world_class_pull', title: 'Sorte de World Class', desc: 'Tire um World Class na roleta.', rewardCoins: 400, rewardSpins: 2, progress: (s) => [s.career.worldClassPulls, 1] },
  { id: 'ach_lucky', title: 'Freguês da Loja', desc: 'Compre um Giro da Sorte na LOJA.', rewardCoins: 100, rewardSpins: 0, progress: (s) => [s.career.luckyBought, 1] },
  { id: 'ach_rank_s', title: 'Rank S', desc: 'Chegue a OVR 68.', rewardCoins: 300, rewardSpins: 2, progress: (s, app) => [app.calculateOVR(), 68] },
  { id: 'ach_rank_wc', title: 'World Class', desc: 'Chegue a OVR 95, o nível dos melhores do mundo.', rewardCoins: 800, rewardSpins: 4, progress: (s, app) => [app.calculateOVR(), 95] },
  { id: 'ach_nel_champion', title: 'Campeão da NEL', desc: 'Termine a Liga Neo Egoísta em 1º lugar com o seu clube.', rewardCoins: 500, rewardSpins: 3 },
  { id: 'ach_top23', title: 'Entre os 23', desc: 'Termine a NEL entre os 23 jogadores mais valiosos do Blue Lock.', rewardCoins: 300, rewardSpins: 2 },
  { id: 'ach_most_valuable', title: 'O Mais Valioso', desc: 'Termine a NEL como o jogador mais valioso do Blue Lock.', rewardCoins: 600, rewardSpins: 3 },
  { id: 'ach_secrets', title: 'Caçador de Segredos', desc: 'Encontre os 5 segredos escondidos no jogo (easter eggs).', rewardCoins: 500, rewardSpins: 3, progress: (s) => [Object.keys(s.easterEggs || {}).length, 5] },
  { id: 'ach_monster', title: 'O Monstro Acordou', desc: 'Desperte o monstro numa partida (ficando atrás no placar, depois do treino do Fox).', rewardCoins: 300, rewardSpins: 2 },
  { id: 'ach_pro_champion', title: 'Campeão da Europa', desc: 'Termine a temporada profissional em 1º lugar com o seu clube.', rewardCoins: 700, rewardSpins: 4 },
  { id: 'ach_ballon_dor', title: 'Bola de Ouro', desc: 'Termine a temporada em 1º na corrida pela Bola de Ouro.', rewardCoins: 1000, rewardSpins: 5 },
  { id: 'ach_world_cup', title: 'Campeão do Mundo', desc: 'Vença a Copa do Mundo principal com a seleção japonesa.', rewardCoins: 2000, rewardSpins: 10 }
];
