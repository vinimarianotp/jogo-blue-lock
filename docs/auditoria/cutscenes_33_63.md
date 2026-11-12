# Auditoria FASE 0 — Cutscenes 33 a 63 (lote B)

Só leitura. Fonte: folhas de quadros `audit0/cutscenes/NN_id.jpg` (cada plano a 25% e 75%), código `js/cine3d_espanha.js`, `cine3d_fox.js`, `cine3d_fox2.js`, `cine3d_final.js`, `cine3d_bola_ouro.js`, `cine3d_rin.js`, `cine3d_partida.js`, `cine3d_duo.js`, onde toca em `js/data_story.js`, `js/data_duo.js`, `js/match_engine.js`, `js/duo_match.js`, `js/duo_saga.js`, `js/app.js`, e as regras de `docs/DIRECAO_DE_ARTE.md`. Recortes ampliados usados na análise: `audit0/zoomB/`.

**Contagem: 4 BOA · 20 MÉDIA · 7 RUIM.**

## 0. Régua (calibragem)

- **27_wildcard_door** funciona porque: um lugar só, legível e com placas dentro da cena (a ala dos eliminados); direção de tela constante (ele sempre anda de costas, rumo à porta); a cor conta a história (corredor azul → porta laranja); cut-ins pequenos, no canto e calmos; o título "WILD CARD" só no último plano; planos de 230–300 q, cada um com um avanço claro.
- **24_itoshi_snow** funciona porque: um motivo visual que atravessa a cena (o cone de luz do poste com a neve); contraste verão/inverno; planos e contraplanos simples; o "vidro rachando" é um efeito usado uma vez só; título só no fim.
- **21_bl_eleven**: a folha parece capturada sem a camada de cinema (sem tarja, sem legenda, o mesmo quadro nos 12 recortes, só a tela do canto muda). Usei 24 e 27 como régua principal; vale capturar a 21 de novo.
- Regra que tirei das três: **um lugar coerente + um motivo visual próprio + pouco texto + plano com começo, meio e fim**. É o que a nota abaixo cobra.

Durações (60 q = 1 s) calculadas pelas fases do código.

## 1. Tabela das 31

| Nº | id | Onde toca | Duração | Veredito | Motivo (concreto) |
|---|---|---|---|---|---|
| 33 | ego_ticket | Cap. 13, interlúdio "A Viagem para a Espanha" (depois da escolha `spain_why`) | 11,3 s | **MÉDIA** | Lugar certo (sala dos monitores = `bg monitor_room`). P0 escuro: o Ego é um boneco minúsculo atrás da mesa e a parede de monitores domina. P1: o Ego ocupa ~50% da altura e é **cortado pela borda direita** (quebra a regra dos 45%). P2 75%: o cut-in do cartão de embarque toma ~60% do quadro e **a metade de baixo é um retângulo preto vazio** (parece bug de desenho); o nome sai truncado "ENJIN TSUBAZ". São dois cut-ins seguidos (a mão com o envelope e o cartão) para a mesma ideia. P3 (mapa holográfico BARCELONA/TOQUIO) é bom. |
| 34 | spain_flight | Cap. 13, mesmo interlúdio | 11,8 s | **MÉDIA** | O melhor da cena é o cut-in da janela oval passando noite → nascer do sol (14 h em 3 s). P1 decolagem **estourada**: o sol e o flare lavam ~70% do quadro de amarelo-branco, e o avião é um modelo 3D liso, cinza e sem textura (não é pixel art). P0: o jogador vira uma mancha escura contra o vidro. P3: Barcelona sem uma pessoa na rua (cenário vazio), e o herói só aparece no 75%. |
| 35 | clasico_bunny | Cap. 13, interlúdio (depois do café com o Bunny) | 14,7 s | **MÉDIA** | Bom: no último plano o mundo perde a cor em volta do Sae (o amarelo vira azul frio), e isso conta "o olhar do Sae" sem palavra. P0 75%: um bloco de torcedores clonados e um marcador de interface "▼ ENJI" (cortado) flutuando em cima do jogador na arquibancada. P2: o "show do Bunny" é um drible parado (dois bonecos lado a lado, sem linha de movimento). P3: "GOOOL!!" atrás da rede, o mesmo plano de 41/49/60/63. |
| 36 | fox_watch | Cap. 13, semifinal x Inglaterra, 55' (no meio da partida) | 10,0 s | **MÉDIA** | Lugar certo (arquibancada inglesa, faixas THREE LIONS). No P0 o Fox não se acha entre ~40 torcedores, então a legenda tem que explicar ("Menos um homem de terno, imóvel"): a imagem não conta sozinha. P1: o cabelo espetado do Fox aparece enorme e **cortado no canto direito**, em primeiro plano. P2 25%: um painel vermelho de retícula **vazio** desliza pela direita, e o sorriso branco é desenhado por cima do rosto. P2 75%: a câmera recua e o Fox vira um ponto preto, o que desfaz o "reveal". |
| 37 | captain_speech | Cap. 13, vestiário antes da estreia x Nigéria (depois da escolha do tom) | 15,2 s | **MÉDIA** | Bom: o cone de luz cai em quem se levanta (o líder nasce no foco). P0 e P2 repetem o mesmo enquadramento frontal chapado do banco por 370 q. P4 "Os olhos": bonecos a ~60% da altura e o jogador **cortado na borda direita**. P5: "VAMOS!!!" amarelo gigante (a fala vira letreiro) e anéis ciano no chão embaixo do time, que leem como aura. O cut-in de punho é genérico (o mesmo de 54/55/63). |
| 38 | four_egos_intro | Cap. 14, antes da final Sub-20 x França | 17,5 s | **MÉDIA** | Bom: P2 "4 EGO'S", com quatro silhuetas em contraluz colorido e só os olhos acesos, é a referência certa; P4, os quatro de costas para o gol, tem composição forte. P3 fica 300 q (5 s) num só travelling com **4 cut-ins da mesma chuteira trocando de cor**. Há halos coloridos atrás de cada jogador (aura). Letreiro de enchimento: "O EGO DE CABELO ROSA". Continuidade: no P4 você e o Sae vestem **os dois a camisa 10**. "4 EGO'S" está em fonte vetorial grande, não em pixel. |
| 39 | loki_hugo_promise | Cap. 14, durante a final, quando a França fica atrás (flashback) | 9,3 s | **BOA** | Ver seção 2. Ressalvas: P0 tem 80 q de dois bonecos parados em idle; os uniformes da França (azul/branco) são iguais aos do Japão, e o Loki e o Hugo parecem do seu time. |
| 40 | hugo_gears | Cap. 14, 64' da final | 11,8 s | **MÉDIA** | As engrenagens dos cut-ins são ícones chapados preto/rosa (parecem o ícone de "configurações"), e a metáfora do mangá (a engrenagem pequena girando a grande) não aparece. P1: 100 q de dois bonecos parados frente a frente. P3: o Hugo a ~55% da altura, com um flare rosa na cabeça marcando o Fluxo (aura). Hugo e você com uniformes quase iguais, então o P2 parece conversa entre colegas. Três cut-ins em 420 q. |
| 41 | u20_final_goal | **Órfã**: não toca em lugar nenhum. O clímax do cap. 14 virou o 49 (`data_story.js:1041`) e só sobraram referências em `cine_luck.js` e `cutscene_engine.js` | 26,3 s | **RUIM** | Clona a assinatura do 26 (tempo parado P&B + chute) e antecipa o 49 plano a plano ("Velocidade divina", P&B, "O goleiro não alcança", a rede). "GOOOOOL!!" cromado gigante (~80% da largura, degradê liso, não pixel). P7: goleiro grande e **borrado** contra a rede. Termina com o mesmo título "CAMPEÕES DO MUNDO!" de 42 e 50. |
| 42 | u20_celebration | Cap. 14, vitória na final (toca **colada no 49**) | 11,8 s | **RUIM** | O 49 já mostrou o apito e o narrador dizendo "FIM DE JOGO! O JAPÃO É CAMPEÃO DO MUNDO!". O P0 daqui repete "O apito final" / "ACABOU! JAPÃO CAMPEÃO!!" e o pós-jogo repete "APITA O ÁRBITRO!": **três apitos seguidos**. P0 75%: um francês #16 de costas, enorme e cortado em primeiro plano. P2: você "jogado pro alto" flutua sozinho no céu, sem mãos e sem arco de arremesso, como se levitasse; o Rin está de camisa 10. P3: troféu clip-art + título gigante "CAMPEÕES DO MUNDO SUB-20!", estrutura idêntica à do 50. |
| 43 | fox_entrance | Cap. 14, pós-jogo ("uma semana depois do título", `FOX_ARRIVAL`) | 15,2 s | **BOA** | Ver seção 2. Ressalvas: P1 75% e P2 25% ficam quase pretos (o sorriso ocupa <2% da tela); P4 tem o Fox de costas cortado no canto inferior direito, em primeiro plano. |
| 44 | fox_training | Cap. 15 ("Quatro da manhã… campo apagado") | 14,3 s | **MÉDIA** | Lugar certo (letreiro "BLUE LOCK · 04:00 · 9ª SÉRIE DE TIROS"). Bom: P3, a sombra comprida do Fox atravessando o gramado com um ponto vermelho de olho. A cena toda é verde-escura e de baixo contraste. P1 "O corpo desiste" não mostra desistência (o boneco corre normal). P2: a silhueta do Fox com olhos amarelos ao lado do jogador repete o 43. P4 vira P&B (o mesmo truque de 41/45/49). |
| 45 | monster_awaken | Partida, do cap. 15 em diante: toca 1× por jogo sempre que você fica atrás. É **a cena que mais se repete no jogo** | 5,0 s | **RUIM** | P0 (a batida do coração tirando a cor) e P1 (correntes em cut-in) funcionam. Mas o plano que deveria pagar a cena, "O MONSTRO ACORDOU", é só o seu boneco escurecido de roxo conduzindo a bola: lê como erro de luz, não como monstro. A legenda é instrução de jogo ("15 s: mais rápido, preciso e forte!") dentro do cinema. Como toca em toda partida, os dois defeitos se multiplicam. |
| 46 | convocation_call | Cap. 18, abertura "A Convocação" | 14,7 s | **MÉDIA** | Quase BOA: a parede de cartas "JPN" virando os rostos dos 26, com o "?" que vira "11", é uma assinatura clara e conta sem fala. P0 é **o mesmo plano de abertura do 33** (parede de monitores, Ego pequeno na mesa, jogador em primeiro plano). P2: a cabeça do Ego, em primeiro plano, tapa o letreiro "COPA DO MUNDO · 26 CONVOCADOS". P3: jogador minúsculo à esquerda, com ~60% do quadro preto. |
| 47 | wc_opening | Cap. 19, abertura da Copa | 16,0 s | **MÉDIA** | Bom: P0 com anéis de cor no gramado e P1 com o painel do sorteio no céu (legível). P2 "Os rivais" é um boneco sozinho na frente de bandeiras-placa gigantes e lavadas (a da Argentina é um bloco cinza-claro): vira slide. Letreiros cortados ("NI / A VELOCID"). P3: túnel com a câmera colada nas costas do time. Título "COPA DO MUNDO" no meio do P0. |
| 48 | camp_night | Cap. 18, antes do Amistoso 2 (a fala diz "Madrugada no **hotel** da seleção") | 14,7 s | **RUIM** | **Lugar errado**: o "hotel" é o corredor do Blue Lock (o mesmo do 27, com pôster KUNIGAMI), e o quarto tem pôster "ISAGI" na parede e placa "CORREDOR". Na fala o Rin está "na varanda"; na cena, na janela do seu quarto. Tudo azul-escuro chapado; são 5 planos de gente parada, e o único acontecimento visual é o "HA HA HA!" rosa do Shidou. Letreiro final cortado ("AMANHÃ · JAPÃO x COR"). |
| 49 | wc_final_goal | Cap. 14, clímax da final Sub-20 no 2×2 | 32,5 s | **MÉDIA** | Bom: o flashback de 2 s do Colégio Ichinan ("Passar… ou chutar?") dentro do último lance fecha o arco do prólogo; é a melhor ideia narrativa do lote. Mas são 13 planos em 32 s, e a cena recicla 26/41 (P&B da Metavision, raios da "Velocidade divina", "BAM!!", a rede). P8 75%: você a ~60% da altura. P9 75%: trave e bola gigantes e **borradas**. "GOOOOOL!!" cromado gigante. Termina no apito, e o 42 repete o apito. |
| 50 | wc_champion | Cap. 19, vitória na final da Copa x França | 12,2 s | **MÉDIA** | Bom: no P1 o Rin atravessa a festa sem comemorar; no P2 vemos a França de costas (#11 #9 #17) e o Hugo diz "A gente volta". Dois beats shonen certos. P0 e P3, porém, são **o 42 de novo** (placar "FIM DE JOGO" no canto, troféu clip-art em cut-in, título gigante "CAMPEÕES DO MUNDO!!"). P3 75%: o time vira pontinhos embaixo do título. |
| 51 | rin_final_duel | Cap. 20, abertura "O Último Duelo" | 15,8 s | **BOA** | Ver seção 2. Ressalvas: no P2 as costas do jogador ficam cortadas no rodapé, em primeiro plano; o fade final começa cedo (a 75% do último plano a tela já está quase preta, ainda com legenda). |
| 52 | rin_final_end | Cap. 20, pós-jogo | 15,5 s | **MÉDIA** | Bom: a grua sobre os dois deitados, "A chuva para. Enfim, estrelas." e a mão aberta do Rin ("…e quase sorri") têm a contenção certa. P1: 170 q de céu quase vazio (~90% azul-escuro). P3: o placar "3-2" no telão é pequeno e em fonte de LED. P4: o pagamento da cena, o seu nome caindo em Nº1, aparece em fonte pixel minúscula com scanlines enquanto a câmera já sobe e se afasta: **ilegível**. |
| 53 | ballon_dor | Cap. 20, pós-jogo ("Paris, um mês depois. A noite da Bola de Ouro.") | 16,0 s | **RUIM** | **Lugar errado**: letreiro "PARIS · A NOITE DA BOLA DE OURO" em cima do saguão do Blue Lock (neon "EGO" nas paredes, placa "LOJA", estantes, sofás roxos, cadeado do Blue Lock). O jogo já tem o teatro de Paris certo (54). P4: cabeças gigantes cortadas em primeiro plano. P2: envelope com o nome truncado "ENJIN TSUBAZ". A cena revela o nome **antes** da fala da apresentadora que o anuncia. É a segunda cerimônia da Bola de Ouro da campanha, em outro lugar. |
| 54 | bola_de_ouro_discurso | Fim da temporada profissional (`ballon_night`, cap. 16–17, se você ganhou) **e** no Modo Dupla (`duo_saga.js:515`) | 27,8 s | **MÉDIA** | Bom: o Théâtre du Châtelet é coerente; as silhuetas dos rivais devorados vão sendo riscadas; o Rin sai pela porta acesa no fundo da plateia (eco do 27). Mas os planos de 5–6 s carregam 5 cut-ins em 3 planos (camisa 299, punhos, silhuetas, punhos, mão) e viram apresentação de slides. O painel das silhuetas ocupa ~95% da largura. P4: **o troféu fica na frente do rosto** e o apaga. Tudo roxo-escuro. No Modo Dupla a Bola de Ouro é "para dois", mas a cena é um discurso solo com "entrei no Blue Lock como o nº 299" (lore do solo). |
| 55 | rin_sae_licao | Logo depois do 54 (mesma noite) | 41,8 s | **MÉDIA** | Bom: o corredor vermelho e simétrico do hotel e o placar "10 x 0" subindo enquanto o Sae passa pelo Rin caído. Mas são **42 s em 7 planos de 300–420 q**, vários com a câmera quase parada. P2 75%: com a câmera dentro do gol, a rede vira uma grade branca uniforme sobre a tela inteira (lê como grade de debug). P6: cut-in de silhueta com olhos acesos dentro de um "ovo" ciano (aura), seguido do Rin com os olhos acesos. |
| 56 | epilogue_destinies | Cap. 20, pós-jogo (depois do Fox) | 21,3 s | **MÉDIA** | Bom: o conceito de "páginas" com um cenário por personagem (bairro do Bachira com "MONSTRO" pichado, sala de jogos do Nagi/Reo, Alemanha na neve, campinho do Brasil com o Fox em silhueta). Mas são 3 vinhetas em 220 q (~1,2 s cada) com legendas de ~50 caracteres: não dá para ler, e a folha pegou a legenda do Nagi & Reo ainda na tela sobre o Chigiri. Quatro vinhetas usam o mesmo estádio holo do Blue Lock (Rin, Chigiri, Shidou com "o PXG trocou a rede" e você). A última página diz "voltou pro lugar onde tudo começou" mostrando o Blue Lock, e a fala seguinte (Tada) se passa no campinho do colégio. Uma criança #10 aparece cortada no rodapé. |
| 57 | credits | Cap. 20, fim | 40,0 s | **MÉDIA** | P3 (9 s): multidão com cabeças gigantes cortadas em primeiro plano e uma lista de 30 nomes em letra pequena por cima dos bonecos (texto pequeno sobre fundo poluído). "BLUE LOCK" em fonte vetorial lisa com degradê, não pixel. Cenários do hub (quarto roxo, saguão com neon EGO). Bom: o último chute com rastro ciano antes de "OBRIGADO POR JOGAR!". |
| 58 | duo_ponte | Dupla, Arco 1 "A Ponte Velha" (abre o modo) | 13,8 s | **BOA** | Ver seção 2. Ressalvas: as máscaras são ovais brancas chapadas coladas na frente do rosto e parecem adesivo/emoji (o mesmo problema de "coisa flutuando no rosto"); P0 fica 175 q no céu antes de qualquer personagem; a carta "VOCÊS DOIS. JUNTOS. OU NENHUM." é objeto de cena, mas é a frase-tese escrita grande. |
| 59 | duo_elo | Dupla, "A Ponte Velha" (sala do Ego, depois de "os dois voltam pra casa") | 7,3 s | **MÉDIA** | Bom: no P2 a corrente de luz dourada liga os pulsos, e a leitura é clara. Mas são 3 planos de ~2,5 s (rápido demais para a regra que muda o modo). P0: **três cabeças cortadas no rodapé**, depois a câmera vai para as costas dos dois. O cut-in da pulseira ocupa ~60% do quadro. É a mesma parede de monitores de 33/46/62. |
| 60 | duo_ressonancia | Dupla, cap. "Ressonância" e **toda vez** que sai o Ataque de Dupla na partida (`duo_match.js:374`) | 7,2 s | **MÉDIA** | O conceito é o certo: as duas pulseiras piscando no mesmo batimento, em cut-ins nos cantos. Mas os dois cut-ins de pulso são pequenos e iguais; no P2 a dupla ocupa ~50% da altura com "DOM!!"; no P3 o gol atrás da rede está **estourado de branco** e não se vê a bola entrar. Como repete em toda partida, cansa. |
| 61 | duo_regra | Dupla, cap. "A Regra do Um" (fala: "Auditório do Projeto Elo") | 7,0 s | **RUIM** | **Lugar errado**: o "auditório" é o saguão do hub (sofás roxos, neon "EGO", placa "LOJA", estante). P0: cabeças cortadas no rodapé. P2 25%: quadro **estourado de branco** com glitch, ilegível. O "1" vermelho no telão é bom, mas a virada do arco inteiro cabe em 7 s. |
| 62 | duo_mascaras | Dupla, cap. "Os Mascarados" (fala: "a sala do Ego no escuro") | 7,0 s | **MÉDIA** | O lugar está certo, mas os monitores ainda mostram "AO VIVO ESP" (sobra da cena da Espanha), e ~60% da tela fica preta no P0. Máscara-adesivo. P1: o cut-in da máscara rachando com "CRAC" funciona. P2: a revelação de Shion e Haru dura **2,7 s**, com olhos acesos brancos/vermelhos e letreiro: rápido demais para o momento mais importante do arco. |
| 63 | duo_final | Dupla, final da Liga dos Pares (último capítulo do modo) | 8,5 s | **RUIM** | Nenhuma assinatura própria. P2 é o mesmo "11 de costas → chute → DOM!!" do 60, na mesma posição de tela; P3 é o mesmo "GOOOL!!" amarelo atrás da rede do 35; o fecho é o cut-in de pulseiras "27" pela 4ª vez no modo. O clímax da saga inteira dura 8,5 s, menos que a cena de abertura (58). |

## 2. As BOAS: o que faz cada uma funcionar

**39 loki_hugo_promise (9,3 s)**
- Economia: 4 planos e uma ideia (o presente → a memória → a promessa → a volta).
- Tratamento próprio, que nenhuma outra cena usa: o flashback em sépia com cantos arredondados de foto antiga e grão, entre o estádio frio da noite e a volta em P&B → cor.
- Um cut-in só, o soquinho de duas mãos de criança contra o sol, condensa a promessa (é o equivalente ao "vidro rachando" do 24).
- Bonecos pequenos em plano aberto e legenda curta; dá para entender sem o diálogo.

**43 fox_entrance (15,2 s)**
- A luz conta a história, como no 27: campo aceso → apagão → dois olhos no escuro → o sorriso → o cut-in do dedo girando → o holofote revela o Fox sentado → contraplano por cima do ombro dele, olhando você lá embaixo. É gramática de terror shonen (gato de Cheshire), em escala crescente.
- O lugar bate com a fala ("Madrugada no campo vazio do Blue Lock. Você chuta sozinho") e o P0 mostra as bolas espalhadas.
- Pouco texto: só o letreiro "FOX · EX-TÉCNICO DA INGLATERRA SUB-20" na revelação.
- Ritmo regular de 170–200 q por plano.

**51 rin_final_duel (15,8 s)**
- Um motivo de clima do começo ao fim (a chuva), como a neve do 24.
- Lugar e diálogo batem: estádio do Blue Lock vazio às 23:45, com o Ego no telão ("SEM TORCIDA. SÓ EGO.") exatamente onde a fala seguinte diz "(no telão)".
- Os dois cut-ins diagonais das chuteiras afundando na poça, cada um na cor do dono (verde-água do Rin, ciano seu), mostram "os dois monstros acordam" numa imagem só.
- Escalada limpa de enquadramento: geral → frente a frente → telão → corrida → choque ombro a ombro → fade.

**58 duo_ponte (13,8 s)**
- Conta a premissa inteira sem precisar do diálogo: rivais de rua → o lance roubado pelos mascarados → a mesma carta chegando nas duas casas.
- Código de cor consistente (A ciano × B coral), inclusive nos cut-ins diagonais divididos das chuteiras.
- O último plano em tela dividida (quarto azul / quarto laranja com a carta no meio) é a composição mais original do lote, e é a assinatura natural do Modo Dupla.
- O lugar bate com a fala (Ponte Velha, quadra com alambrado, postes).

## 3. Repetições e efeito-assinatura

### 3a. Assinatura atual de cada cena

| Nº | id | Efeito-assinatura atual | Conflita com |
|---|---|---|---|
| 33 | ego_ticket | envelope preto com linhas radiais + cartão de embarque em cut-in | sala de monitores = 46/59/62 |
| 34 | spain_flight | janela oval do avião em time-lapse (noite → nascer do sol) | — (única) |
| 35 | clasico_bunny | dessaturação azul em volta do Sae (o mundo esfria) | o gol pela rede = 41/49/60/63 |
| 36 | fox_watch | o Fox escondido na multidão | sorriso desenhado = 43 |
| 37 | captain_speech | cone de luz em quem se levanta | "VAMOS!!!" e anéis no chão parecem 47; punho = 54/55 |
| 38 | four_egos_intro | "4 EGO'S": silhuetas em contraluz colorido | chuteira em cut-in (×4) = 36/40/51/55/56/58/63 |
| 39 | loki_hugo_promise | flashback sépia de foto antiga + soquinho | — (única) |
| 40 | hugo_gears | engrenagens em cut-in | chuteira em cut-in |
| 41 | u20_final_goal | **nenhum** (P&B do 26 + rede do 35 + título do 42) | 26, 49, 42, 50 |
| 42 | u20_celebration | **nenhum** (troféu em cut-in + "CAMPEÕES" = 50) | 50, 41 |
| 43 | fox_entrance | apagão → olhos/sorriso no escuro → holofote | olhos no escuro = 44 |
| 44 | fox_training | a sombra gigante do Fox no gramado | P&B = 45; silhueta = 43 |
| 45 | monster_awaken | batida do coração tirando a cor + correntes | P&B = 41/44/49 |
| 46 | convocation_call | parede de cartas virando rostos ("?" → "11") | abertura = 33 |
| 47 | wc_opening | anéis de cor na cerimônia + painel do sorteio no céu | — |
| 48 | camp_night | **nenhum** ("HA HA HA!" e mão na janela, fracos) | corredor = 27 |
| 49 | wc_final_goal | flashback do Colégio Ichinan dentro do lance | todo o resto = 26/41 |
| 50 | wc_champion | o lado perdedor de costas | moldura do título = 42 |
| 51 | rin_final_duel | chuva + chuteiras na poça em diagonal dividida | — |
| 52 | rin_final_end | o céu abrindo (a chuva para, as estrelas) | — |
| 53 | ballon_dor | o nome em neon gigante no telão | cerimônia = 54 |
| 54 | bola_de_ouro_discurso | rivais devorados sendo riscados + a porta acesa no fundo | punhos = 37/55/63 |
| 55 | rin_sae_licao | placar "10 x 0" correndo | olhos acesos = 62 |
| 56 | epilogue_destinies | páginas de vinhetas | estádio holo ×4 |
| 57 | credits | multidão do elenco | saguão = 53/61 |
| 58 | duo_ponte | tela dividida: duas casas, uma carta | — (única) |
| 59 | duo_elo | corrente de luz dourada entre os pulsos | pulseira "27" = 60/61/63 |
| 60 | duo_ressonancia | pulseiras piscando no mesmo batimento | gol pela rede; DOM!! = 63 |
| 61 | duo_regra | o "1" vermelho no telão + corrente rachando | saguão = 53 |
| 62 | duo_mascaras | máscara rachando ("CRAC") | olhos acesos = 55 |
| 63 | duo_final | **nenhum** (60 + 35 + 59 recombinados) | 60, 35, 59 |

### 3b. Grupos de repetição (o que o dono vai notar)

1. **Gol "atrás da rede + GOOOL!!"**: 35, 41, 49, 60, 63 (e o 26, fora do lote). São cinco gols com o mesmo plano.
2. **Chute com "DOM!!/BAM!!" na mesma posição de tela**: 41, 49, 60, 63. O 60 e o 63 são o mesmo plano (o 11 de costas chutando para a direita, com a onomatopeia no canto superior direito).
3. **Tempo parado P&B azulado**: 41, 49 (o mesmo do 26 aprovado), e ainda 44 P4 e 45 P1. Era a assinatura do 26 e virou padrão.
4. **Festa do título**: 42 e 50 têm a mesma estrutura de 4 planos (placar "FIM DE JOGO" → time → festa/rival → troféu clip-art em cut-in → "CAMPEÕES DO MUNDO"); o 41 também fecha com "CAMPEÕES DO MUNDO!". O mesmo título aparece 3 vezes.
5. **Sala de monitores do Ego como abertura**: 33, 46, 59 e 62 (e a parede da "próxima geração" no 56). O P0 do 33 e o do 46 são praticamente o mesmo enquadramento.
6. **Saguão do hub fingindo ser outro lugar**: 53 (Paris), 61 (auditório) e 57 (créditos; aceitável). O 48 usa o corredor do 27 como "hotel".
7. **Cut-in de mão/punho**: 37, 39, 48, 52, 54 (×3), 55, 59, 60, 61, 63, pelo menos 10 cenas. **Cut-in de chuteira + bola**: 36, 38 (×4), 40, 51, 55, 56, 58, 63, pelo menos 8 cenas. São as duas muletas do lote.
8. **Pulseira "27" em cut-in**: 59, 60, 61 e 63 (4 das 6 cenas do Modo Dupla).
9. **Estádio holo do Blue Lock como fundo**: 43, 44, 45, 51, 52, 56 (×4), 57, 60.
10. **Olhos acesos / sorriso desenhado sobre o rosto**: 36, 43, 44, 38 P2, 55 P6, 62 P2.

## 4. Problemas que se repetem (ordem de impacto)

1. **Clímax sem assinatura própria.** O kit do gol (rede + GOOOL + DOM + P&B) aparece em 5 cenas e o kit do título em 3. O pior caso é o 63, o final do Modo Dupla, que é só colagem. Isso vai contra o pedido de "um efeito-assinatura por cena".
2. **O lugar não bate com a fala.** 53 (Paris → saguão com neon EGO e placa LOJA), 61 (auditório → o mesmo saguão), 48 (hotel → corredor e quarto do Blue Lock com pôsteres KUNIGAMI e ISAGI), 56 ("onde tudo começou" = Blue Lock, mas o Tada fala no colégio; o Shidou "do PXG" no estádio do Blue Lock), 62 (monitores ainda em "AO VIVO ESP") e 54 no Modo Dupla (discurso solo "nº 299" para uma Bola de Ouro dada a dois).
3. **Sequência e duplicação entre cenas.** 49 → 42 → pós-jogo dá três apitos finais seguidos. 53 e 54 são duas cerimônias da Bola de Ouro em lugares diferentes. O 53 revela o nome antes da apresentadora anunciar. O 41 está órfão (código morto que ainda é mantido).
4. **Regra de enquadramento quebrada** (boneco >45% ou cortado na borda/rodapé em primeiro plano): 33 P1, 36 P1, 37 P4, 40 P3, 42 P0, 43 P4, 49 P8, 51 P2, 53 P4, 56 P1, 57 P3, 59 P0, 61 P0, e a câmera nas costas em 47 P3 e 59.
5. **Exposição.** Quadros quase pretos, com o assunto em menos de 5% da área: 43 P1–P2, 44 (cena toda), 48, 51 fim, 54, 62 P0, 46 P3, 33 P0. Quadros estourados de branco: 34 P1, 60 P3, 61 P2.
6. **Ritmo nos dois extremos.** As cenas do Modo Dupla têm 7–8,5 s com planos de 1,5–2,7 s, e a revelação dos vilões e o clímax da saga passam voando. Do outro lado: 55 com 42 s (planos de 5–7 s), 57 com 40 s (um plano de 9 s), 49 com 32 s, 54 com 28 s. O 56 põe legendas de 50 caracteres em 1,2 s.
7. **Coisa colada no rosto** (o dono odeia): as máscaras-adesivo (58, 62), o troféu cobrindo a cara (54 P4), o sorriso branco desenhado por cima (36, 43) e os olhos acesos (55, 62).
8. **Texto.** Títulos grandes e iguais ("CAMPEÕES DO MUNDO" ×3, "4 EGO'S", "VAMOS!!!"); "GOOOOOL!!" cromado não-pixel ocupando 80% da largura (41, 49); uma linha de tutorial na legenda (45); narração descrevendo o que a imagem deveria mostrar (36); nomes e letreiros truncados ("ENJIN TSUBAZ" em 33 e 53, "▼ ENJI" em 35, "NI / A VELOCID" em 47, "JAPÃO x COR" em 48).
9. **Continuidade de elenco.** Duas camisas 10 no Japão (você e o Sae no 38 e no 49; o Rin com a 10 no 42). Japão e França com camisas azuis quase iguais (39, 40).
10. **Arte fora do pixel.** O avião liso (34), os títulos em fonte vetorial com degradê (38, 41, 49, 57) e as bandeiras-placa lavadas pelo bloom (47).

## 5. Nota e backlog

**Nota "Cutscenes" (lote 33–63): 5/10.**
A base técnica é boa e uniforme: câmera sempre em movimento, tarja, letreiro de lugar, cut-ins em pixel e legendas legíveis. Mas só 4 de 31 chegam na régua do 24/27, e 7 falham no essencial (lugar errado, clímax clonado, cena órfã, pagamento invisível). O lote recicla os mesmos três kits (gol pela rede, título "CAMPEÕES", cut-in de mão/chuteira), e o Modo Dupla fecha a saga com a cena mais fraca do grupo.

### Backlog

| # | Tarefa | Impacto (1–5) | Esforço (1–5) |
|---|---|---|---|
| 1 | 53 ballon_dor: tirar do saguão do hub e passar para o teatro de Paris do 54 (`CE.c3fTheatre`), ou fundir 53 e 54 numa cerimônia só; não revelar o nome antes da fala da apresentadora | 5 | 2 |
| 2 | 63 duo_final: refazer com assinatura própria do Elo (ex.: a tela dividida do 58 se fechando num chute só de dois pés), sem rede/GOOOL/DOM do 35/60; subir para 12–15 s | 5 | 4 |
| 3 | Banir o plano "atrás da rede + GOOOL" fora de uma cena-dona (sugestão: 35) e dar um gol diferente para 49 e 60 (49 já tem o flashback do Ichinan, que deve virar o centro) | 5 | 4 |
| 4 | Sequência 49 → 42 → pós-jogo: um apito só (cortar P11 do 49 ou P0 do 42 e a fala "APITA O ÁRBITRO!" do pós-jogo do cap. 14) | 4 | 1 |
| 5 | 48 camp_night: um corredor e um quarto de hotel de verdade (sem pôster KUNIGAMI/ISAGI nem placa CORREDOR) e uma varanda para o Rin | 4 | 3 |
| 6 | 61 duo_regra: auditório próprio (palco, poltronas, telão; sem neon EGO/LOJA) e corrigir o P2 estourado | 4 | 2 |
| 7 | Ritmo do Modo Dupla: 59/61/62 com planos de 3–4 s (12–14 s por cena); a revelação de Shion e Haru (62) com mais um plano | 4 | 2 |
| 8 | 56 epilogue_destinies: uma vinheta por página (ou páginas de 330 q), legenda de pelo menos 2,5 s; a última página no campinho do colégio (bater com o Tada); o Shidou num estádio do PXG | 4 | 2 |
| 9 | 42 × 50: diferenciar as festas (Sub-20: arremesso com mãos e arco; Copa: o vestiário com a taça), com o título "CAMPEÕES" em só uma delas | 3 | 3 |
| 10 | 45 monster_awaken: um plano final que mostre o monstro (contraluz + olhos, rival recuando) e tirar "15 s: mais rápido…" da legenda (vai para o HUD). Prioridade alta porque toca em toda partida | 3 | 2 |
| 11 | Máscaras do 58 e do 62 desenhadas no sprite (pixel no rosto), não como oval flutuante | 3 | 2 |
| 12 | 54 no Modo Dupla: versão para dois (sem "nº 299") ou outra cena; 54 P4 com o troféu na altura do peito | 3 | 2 |
| 13 | Enquadramento: tirar bonecos cortados ou >45% em 33 P1, 36 P1, 37 P4, 40 P3, 42 P0, 43 P4, 49 P8, 51 P2, 53 P4, 56 P1, 57 P3, 59 P0, 61 P0 | 3 | 2 |
| 14 | Exposição: piso de luz no assunto (43 P1–P2, 44, 48, 62 P0, 46 P3) e teto nos estourados (34 P1, 60 P3, 61 P2) | 3 | 2 |
| 15 | Cut-in de mão/punho/chuteira: no máximo 1 por cena, com objeto específico daquela cena (o dono quer uma assinatura por cena) | 3 | 3 |
| 16 | 52 rin_final_end: segurar a câmera no telão quando o nome cai (t ≈ 92) e dobrar a fonte do ranking | 3 | 1 |
| 17 | Encurtar 55 (42 → ~25 s), 54 (28 → ~20 s) e o P3 do 57 (9 → 5 s) | 3 | 1 |
| 18 | Numeração fixa por seleção (só uma camisa 10 no Japão) e uniforme da França distinguível (manga vermelha / calção branco) em 38/39/40/49 | 3 | 1 |
| 19 | Arquivar o 41 u20_final_goal (órfão), ou reaproveitar algum plano dele num gol que hoje não tem cena | 2 | 1 |
| 20 | Sala de monitores: variar o enquadramento de abertura (33 × 46) e apagar "AO VIVO ESP" fora da cena da Espanha (62) | 2 | 1 |
| 21 | Textos truncados: "ENJIN TSUBAZ" (33, 53), "▼ ENJI" (35, remover o marcador), "NI / A VELOCID" (47), "JAPÃO x COR" (48) | 2 | 1 |
| 22 | "GOOOOOL!!" cromado gigante (41/49) → onomatopeia em pixel no tamanho do 35; títulos de 38/57 em fonte pixel | 2 | 1 |
| 23 | 33 P2: corrigir o retângulo preto vazio embaixo do cartão de embarque | 2 | 1 |
| 24 | Recapturar a folha 21_bl_eleven (saiu sem a camada de cinema) para a régua da próxima rodada | 1 | 1 |
