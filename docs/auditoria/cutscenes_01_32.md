# Auditoria Fase 0 — Cutscenes 01 a 32 (lote A)

Só leitura: nenhum arquivo do projeto foi alterado.

**Método.** Abri as 32 folhas de quadros (2 quadros por plano, a 25% e a 75%) e li o código de cada cena (`js/cine3d_*.js`, `cine3d_kit.js`, `cine_art.js`, `cine_kit.js`, `cutscene_engine.js`), o lugar onde ela toca (`data_story.js`, `app.js`) e `docs/DIRECAO_DE_ARTE.md`. Comecei pela régua: 27, 21 e 24. O movimento de câmera eu julguei pelo código, porque a folha só mostra 2 quadros por plano.

**AVISO IMPORTANTE (vale para quem mais estiver usando estas folhas):** as folhas originais `18_nagi_reo_split.jpg` (do P3 75% em diante), `19_world_five_fall.jpg`, `20_world_five_win.jpg`, `21_bl_eleven.jpg` e `22_ego_federation.jpg` estão **corrompidas pelo bug da seção 5**. Mostram a imagem congelada do Reo/Nagi, e só um retângulo no canto de cima à direita muda. Recapturei as 5 num navegador limpo, sem erro nenhum:
`C:\Users\USURIO~2\AppData\Local\Temp\claude\89391ab5feac08f8\ddd56ff4-27b5-4e23-81d7-b68fdd201010\scratchpad\audit0\recap_A\` (18, 19, 20, 21 e 22). As notas dessas cenas usam as recapturas.

Legenda: q = quadros (60 q ≈ 1 s). "Molde" = a sequência do gol da Sub-20 que quase todas as cenas copiam: P&B azulado → cut-in de bola e chuteira com linhas radiais → "DOM!!" → câmera atrás da rede → "GOOOL!!" → confete ou cartela final.

---

## 1. As 32 cenas

| nº | id | onde toca (capítulo real) | planos / duração | veredito | motivo exato |
|---|---|---|---|---|---|
| 01 | prologue_tada_miss | ch0_prologue — só se o jogador escolhe PASSAR (app.js:4015) | 6 / 17,2 s | **MÉDIA** | + Estádio no pôr do sol (paleta própria). "CLANG!!" na trave é o único efeito sonoro escrito do lote que não é DOM/GOOOL. Fecha na sala de monitores do Ego, um bom gancho. − **P1 75%**: dois cut-ins (chuteira+bola e a silhueta do Tada) cobrem ~90% da tela e o 3D some. **P2**: o "você" ocupa ~70% da altura e está cortado na borda esquerda (fura a regra dos 45%). **P3**: a rede vira um bloco branco que tapa 1/4 do quadro. **P4** repete o cut-in chuteira+bola do P1. O narrador descreve a imagem ("Goleiro batido...", "Na trave."). A cartela "PROJETO BLUE LOCK / O seu ego começa agora." explica demais. |
| 02 | ego_speech | ch1_first_selection_x_y (diálogo do auditório) | 5 / 15,2 s | **MÉDIA** | + O auditório lotado lê bem e o Ego aparece no telão. A ideia "299 em cinza, você em cor" é boa. − **P2**: o telão estoura em branco e lava o quadro por 2 s; o Ego vira recorte e o letreiro "CAP... DO BUNKER" fica ilegível. **P3**: na plateia em P&B você é um pontinho azul lá no fundo, então a ideia não lê. **P4**: halo azul atrás do boneco, ou seja, aura. O cut-in "bola na trave" é o mesmo do 01. |
| 03 | bluelock_door | ch1 (depois de escolher passar pela porta) | 4 / 10,7 s | **MÉDIA** | + Curta. A luz da porta "engole tudo", e o letreiro final informa algo útil ("299º de 300 no ranking"). − **P0**: multidão de costas, escura e desfocada, sem ponto de foco. **P2**: câmera colada nas costas do #10, com a cabeça de outro boneco gigante e borrada embaixo (proibido no §8). Cut-in de chuteira genérico. A cartela grande "BEM-VINDO AO BLUE LOCK" é o mesmo fecho de outras 9 cenas. |
| 04 | onigokko | ch1 (Quarto Z) | 5 / 14,5 s | **MÉDIA** | + O cronômetro da parede (2:12 → 0:03) conta a tensão sem texto: é assinatura de verdade. "PÁ!!" no golpe. − Quarto azul-roxo escuro e bonecos pequenos: não dá para saber quem é o Kira até ele cair. O golpe principal (P3, chute na cabeça) acontece no fundo do quadro, e a legenda "Na cabeça!" explica o que não se vê. **P4**: o Kira caído é um borrão. Cut-in da mão aberta repetido em 05 e 07. |
| 05 | barou_king | ch1 (derrota) | 5 / 24,8 s | **RUIM** | O momento-chave (o Rei faz 3 gols) não aparece. **P2** é o Barou de costas, com um flare branco em cima da cabeça, enquanto o narrador diz "Gol. E outro. E mais outro.". Mancha vermelha no chão e olhos vermelhos acesos (aura). Cut-in de bola genérico. **P4** fecha na mão (repetida de 04/07) e o quadro fica cinza com você minúsculo. ~5 s por plano para uma fala só. |
| 06 | barou_king_win | ch1 (vitória) | 5 / 26,3 s | **RUIM** | P0–P2 são idênticos ao 05: a vitória começa com a imagem da derrota. "A virada" (**P3**) é um cut-in de tela cheia (bola+linhas) que esconde o 3D. **P4** fica 7 s (420 q) em dois planos de olhos acesos (o Barou vermelho com flare na cabeça, você em ciano). O letreiro "FIM DE JOGO" só termina de digitar aos 270 q de 330 e fica ~1 s na tela. |
| 07 | ego_victory | ch1b_team_y (pós-jogo) | 6 / 26,2 s | **MÉDIA** | + As linhas vermelhas de leitura no gramado (o Niko lendo tudo) e o círculo verde "um passo depois" no P&B contam a ideia sem texto. − **P2**: cut-in bola+chuteira idêntico ao 06 P3. "GOOOOL!!" atrás da rede (molde). **P3**: câmera nas costas do Niko. **P4**: mão repetida. **P5**: olhos acesos e flare em cima da cabeça. |
| 08 | kuon_betrayal | ch1c_team_w (intervalo, midMatchLore) | 5 / 24,2 s | **MÉDIA** | + Os gêmeos de frente, simétricos, funcionam. O vestiário bate com o "Intervalo" do diálogo. Sem efeito sonoro e sem cut-in, a cena respira. − Nenhum efeito próprio. Flashback em P&B genérico. **P4 25%**: gol vazio com a rede estourada em branco (um bloco luminoso). Planos de 4,5–5,7 s quase parados. **P3 75%**: o Kuon sentado sozinho, muito escuro. |
| 09 | chigiri_sprint | ch1c (gol roteirizado do Chigiri, na partida) | 5 / 23,2 s | **MÉDIA** | + As correntes em volta da perna (o medo do joelho) são o melhor cut-in simbólico do lote. − 4 dos 5 planos têm cut-in, e o P1 tem dois. **P3**: cut-in de bola rosa genérico. **P3 75%**: GOOOOL atrás da rede (molde). A corrida, o "voo" do Chigiri, é um plano lateral médio sem sensação de velocidade. Zagueiro cortado na borda esquerda (P2). |
| 10 | rin_rival | ch5_u20_japan (pós-jogo, RIN_RIVAL_SCENE) | 5 / 17,8 s | **RUIM** | + O lugar está certo (vestiário 23:40, uma luz acesa). − **P1**: cut-in azul-escuro em que não se entende o objeto. **P2**: o punho é o MESMO desenho do 25 P4. **P3 e P4**: ~85% de tela preta. O clímax "VOCÊ É O MEU RIVAL" vira dois pontos ciano (olhos acesos) num quadro preto, que é a aura/olho que o dono odeia. A legenda repete a fala que o jogador acabou de ler na conversa ("Esse gol é de nós dois"). |
| 11 | scripted_shot | qualquer partida (gol garantido do roteiro, `playShotCutscene`) | 5 / 8,8 s | **MÉDIA** | Funciona como replay limpo (placar, cores, confete), mas **é o próprio molde**: arrancada → P&B + cut-in de bola → DOM!! → rede + GOOOL!! → confete. O narrador fala como locutor e explica a imagem ("O tempo congela...", "A rede estufa!"). Rival cortado na borda direita (P0). Planos de 1,7 s. Toca muitas vezes na campanha, então é a cena que mais cansa. |
| 12 | chem_reaction | qualquer partida (`playChemCutscene`) | 4 / 7,5 s | **MÉDIA** | + Anel da cor do parceiro; é curta. − **P1 75%**: os zagueiros caídos viram placas deitadas e sobrepostas (parece erro de renderização). **P3**: goleiro enorme deitado na frente do gol. DOM!! e cut-in diagonal de bola (molde). As legendas narram o óbvio ("Um só chute!", "O goleiro vai alcançar?"). |
| 13 | first_selection_awakening | ch2_first_selection_v (1º gol, firstGoalSakuga) | 5 / 9,3 s | **MÉDIA** | + O cut-in do quebra-cabeça ("a última peça sou EU") é assinatura legítima. − O resto é o molde: **P2** usa o cut-in de bola idêntico ao 07/11, DOM!!, GOOOL atrás da rede e confete. "Nem o Nagi!" e "Voleio sem dominar!" descrevem a imagem. O P3 dura 1,5 s. |
| 14 | bluelock_man_test | ch2b_second_selection (interlúdio) | 8 / 23 s | **MÉDIA (alta)** | + A primeira metade conta tudo sem fala: o robô no gol, o arco tracejado da previsão, as bolas se acumulando no chão com "TENTATIVA Nº 12 → 47". É a melhor ideia de "passagem de tempo" do lote. − A segunda metade volta ao molde: cut-in de bola (P4), P&B + DOM!! (P5) e rede vista de dentro com o robô borrado atrás da malha (P6). Fecha num plano aberto minúsculo, sem pontuação. |
| 15 | rin_takes_bachira | ch2b (derrota) | 6 / 20,8 s | **RUIM** | 21 s de planos abertos e médios quase parados. O Rin, que é quem leva o Bachira, só aparece de costas (P1). A escolha do Bachira é um plano médio com um cut-in genérico de "pé na bola". O fecho é você com um ponto ciano **na testa** (o brilho dos olhos na altura errada, seção 4). Nenhuma imagem própria. |
| 16 | rin_takes_bachira_win | ch2b (vitória) | 6 / 20,8 s | **RUIM** | É **visualmente idêntica à 15** em todos os planos; só mudam as legendas e o letreiro "VOCÊS VENCERAM". Quem venceu assiste à cena da derrota. Tem os mesmos defeitos da 15. |
| 17 | barou_devour | ch3_second_selection_world5 (interlúdio) | 7 / 23,3 s | **MÉDIA** | + A metavisão do alto em P&B, com as duas rotas no chão, é legível. − **P2**: o roubo é visto colado nas costas do #11 e do #10 (vira mancha). **P3**: rede vista de dentro (molde). A coroa rachando é a mesma peça do 18. **P5**: ponto ciano na testa. A cartela "DEVORANDO O REI" explica em cima de um plano em que o Rin fala. As tags dão spoiler ("PLANO 4 • O GOL ROUBADO", "PLANO 6 • EU DEVOREI"). |
| 18 | nagi_reo_split | ch2b (interlúdio "nagi_choice"; a lista da galeria diz ch3) | 5 / 19,7 s | **MÉDIA + BUG CRÍTICO** | + Lugar certo (campo 'bluelock_holo'). **P4 75%**: o Reo sozinho no círculo de luz, num plano alto, é uma imagem forte. − O cut-in do braço (P1) é um retângulo preto com um bloco rosa e não lê como braço. **P2**: o Reo e você cortados nas bordas. A coroa é a mesma do 17 e o punho é repetido. Trava, ver seção 5. |
| 19 | world_five_fall | ch3 (derrota) | 6 / 22 s | **RUIM** | (avaliada na recaptura) O "mundo" nunca aparece. **P2**, a "velocidade divina", é o Loki parado com a bola. **P3**: os 4 gols viram um plano escuro e parado do campo, com o placar trocando sozinho (1x2→1x4). **P1**: rede vista de dentro, sem legenda. **P0 75%**: o Rin cortado na borda. Mão do Loki repetida (P4). A cartela "TOP 6" explica. |
| 20 | world_five_win | ch3 (vitória) | 6 / 22 s | **RUIM** | (recaptura) P0–P2 e P4 são idênticos à 19. A virada (2x1) também é o plano escuro com o placar mudando. "O TOPO EXISTE" aparece em cima de um amontoado minúsculo no meio do campo. |
| 21 | bl_eleven | ch5_u20_japan (interlúdio; a galeria diz ch4) | 6 / 27,5 s | **BOA** | Ver a seção 2. − **P1/P4/P5 75%**: 70–90% do quadro preto. Cabeças borradas e cortadas na borda de baixo (P0, P2, P5 25%) e o Bachira cortado na esquerda (P4 25%). Fecha com olhos rosados acesos (o Shidou). |
| 22 | ego_federation | ch4_third_selection (interlúdio) | 6 / 27,8 s | **MÉDIA** | + Os objetos contam a história (plaquinhas PRESIDENTE/TESOURARIA, carimbo "OK", porta dupla). Começa e termina na sala do Ego, como o diálogo. − **P0 75%**: só a cabeça do Ego aparece, cortada pela mesa. **P2**: a porta é um quadro quase preto com flare. O cut-in do carimbo é o mesmo do 23. **P5**: a Anri pequena no canto. |
| 23 | shidou_cut | ch5_u20_japan (interlúdio; a galeria diz ch4b) | 5 / 25,2 s | **MÉDIA** | + O quadro tático com o X vermelho (cortado) é ótimo. A sala da JFU, laranja, quebra a monotonia azul. O túnel com Chigiri, você e Shidou funciona. − **P0**: ~80% preto. A cena mistura duas histórias (o corte do Shidou e "irmão contra irmão"). A cartela "IRMÃO CONTRA IRMÃO" aparece junto com a legenda do narrador "Irmão contra irmão." (o mesmo texto duas vezes). Carimbo repetido do 22, punho repetido. |
| 24 | itoshi_snow | ch5_u20_japan (interlúdio; a galeria diz ch4b) | 6 / 28,7 s | **BOA** | Ver a seção 2. − **P5**: o brilho ciano está na testa do Rin (altura 0.74). É a cena mais longa junto com a 26, e o P3 deixa o Sae parado no cone de luz por ~3,7 s. |
| 25 | sae_interview | ch5 (pós-jogo, RIN_RIVAL_SCENE) | 5 / 15,8 s | **RUIM** | + A sala de imprensa com faixas JAPAN/SUB-20/JFU bate com o diálogo. − **P1 e P2**: cabeças gigantes, borradas e cortadas em primeiro plano, que é exatamente o que o dono odeia. O momento "o Sae diz o SEU nome" é o Sae pequeno no canto direito, sem pontuação nenhuma. **P3**: o Rin minúsculo no escuro (não se vê a toalha). **P4**: o punho é o mesmo desenho do 10 e a rachadura de vidro é o mesmo efeito do 24. |
| 26 | u20_direct_shoot | ch5 (gol da partida, evento sakuga) | 13 / 32,5 s | **RUIM** | A coreografia é boa (chapéu, rabona, raspão, a cor sumindo em círculo), mas a cena fura o próprio DIRECAO_DE_ARTE 4 vezes. **P6 25%**: close do rosto pixelado ocupando o quadro ("rosto em blocos", §8). **P7**: boneco gigante cortado no primeiro plano. **P9 75%**: rede borrada tapando 2/3 da tela. Letreiros explicativos "O TEMPO PAROU" e "O GOL DA VITÓRIA". Além disso: **P2 75%** com o Rin e o Sae cortados na borda de baixo; **P6 75%** com o ponto ciano na testa; **P12** com a câmera nas costas do #10 e o Sae cortado na borda. É o molde que quase todas copiam. |
| 27 | wildcard_door | ch4_third_selection (interlúdio; listada também no ch5b, mas só toca uma vez) | 6 / 26,5 s | **BOA** | Ver a seção 2. − **P4 25%**: câmera colada nas costas do Kunigami; o boneco fica grande e borrado na névoa. |
| 28 | wildcard_hell | ch5b_wild_card (interlúdio) | 5 / 28 s | **MÉDIA** | + Conceito forte e lugar próprio: o laboratório no vazio com paredes de luzes, o contador "DIA 01 → DIA 47", a capa de herói se desfazendo e a cor indo embora no fim (o herói apagado). − Anel laranja brilhando no chão em 4 dos 5 planos (aura de chão, e repetida). Bonecos pequenos e tudo escuro. Os tombos do P2 não se leem. **P3**: o Kunigami com cabelo vermelho, sem motivo aparente. Planos de 6,3 s (380 q). |
| 29 | wildcard_verdict | ch5b (pós-jogo, a MESMA cena na vitória e na derrota) | 5 / 27 s | **MÉDIA** | + A tela partida, metade P&B e metade cor ("alguma coisa lá dentro sorriu"), é assinatura. O telão do Ego diz "Aprovado. Destino: Manshine City". − O corte da tela tem borda dura e parece erro de renderização. O cut-in das mãos não se entende. **P4**: a porta laranja pela 3ª vez no arco (27/30), num plano de 6,2 s. |
| 30 | kunigami_return | ch5b (introCutscene) | 5 / 27,2 s | **MÉDIA** | + Os refletores morrendo e a porta abrindo são legíveis, e batem com a fala "a porta preta do fim do campo". − É a 27 piorada: porta laranja, cartela "O RETORNO DO CORINGA" e a capa do 28 de novo. **P1**: ~90% preto, as três silhuetas não se distinguem. 5 planos de 5,3–5,7 s, com uma fala curta cada. |
| 31 | nel_metavision_goal | ch7_nel_ubers_pxg (1º gol na NEL; a galeria diz ch6) | 5 / 9,5 s | **MÉDIA** | + O P&B do alto com marcadores vermelhos (metavisão) e o telão BLTV do leilão, que é diegético. − É o molde (cut-in de bola, DOM!! duas vezes, GOOOL atrás da rede, confete). Elenco fixo: o Kaiser joga pelo rival e o placar diz sempre "UBERS" (`cine_partida.js:1842-1859`), mesmo que o rival seja o PxG ou que o jogador seja do Bastard (o time do Kaiser). Planos de 1,5 s. |
| 32 | rin_challenge | ch12_pro_season_2 (interlúdio "rin_rivalry"; a galeria diz ch7) | 4 / 12,5 s | **BOA** | Ver a seção 2. − **P2**: os olhos do Rin viram dois blocos pretos (lê como óculos). **P3**: azul sobre azul, pouco contraste. Termina sem pontuação. |

**Total: 4 BOA (21, 24, 27, 32) · 19 MÉDIA · 9 RUIM (05, 06, 10, 15, 16, 19, 20, 25, 26).**

---

## 2. O que faz as BOAS funcionarem

### 27 wildcard_door (a melhor do lote)
- **O lugar é o do diálogo** (bg 'corridor'). O letreiro é discreto e informa sem explicar: "BLUE LOCK · ALA DOS ELIMINADOS / FIM DA SEGUNDA SELEÇÃO · 02:14".
- **Composição com ponto de fuga central em TODOS os planos.** As linhas de neon do corredor convergem para a porta, e o olho vai para o objetivo sem nenhuma seta. O Kunigami fica sempre no eixo.
- **A cor conta a história.** Tudo é ciano e azul frio até o P4; aí a luz laranja da porta invade o quadro (cor complementar). A decisão "vira" cor, e o laranja só aparece quando a escolha é feita.
- **Os cut-ins são narrativos, não genéricos:** a mão na alça da mala, a lembrança do herói (silhueta no pôr do sol), o punho fechado sobre verde e laranja. Cada um só cabe nesta cena.
- **A escolha aparece literalmente** (P2, "duas portas"): a SAÍDA verde contra a porta preta com luz vermelha.
- **Ritmo:** 6 planos de 3,8–5 s, uma fala por plano, câmera andando junto. É calmo e combina com "decisão".
- **Uma única cartela, no último plano, depois da ação:** "WILD CARD", com o subtítulo pequeno "UMA SEGUNDA CHANCE · UM PREÇO".

### 24 itoshi_snow
- **Duas paletas que marcam o tempo:** a praia laranja e rosa (verão, a lembrança) contra a rua azul de neve à noite (o presente). Não precisa de legenda para entender "anos depois".
- **Um poste como palco:** quem está no cone de luz tem a fala, e o Sae entra e sai da luz.
- **A distância física é a distância emocional:** os planos de dois são abertos, com espaço vazio entre os irmãos.
- **Efeito-assinatura:** a lembrança congela em branco-gelo e racha como vidro (P4 75%). É a imagem do sonho quebrando.
- **Tipografia contida:** letreiros pequenos de contexto ("KAMAKURA · VERÃO", "KAMAKURA · INVERNO · ANOS DEPOIS") e o título "NEVE EM KAMAKURA" só no fim.
- **Cut-ins com objeto da história:** as duas pernas e a bola no pôr do sol; a bola parada entre os dois.

### 21 bl_eleven
- **O ritmo de chamada:** cada fala do Ego é um grupo de nomes, e cada grupo acende num círculo de luz próprio. É repetição com variação, como numa escalação de anime.
- **O telão que monta a escalação** prende a cena ao lugar (bg 'monitor_room').
- **O suspense do centro:** uma silhueta escura num cut-in verde (P2 75%) antes da revelação, que vem com um letreiro discreto ("ENJIN TSUBAZA · CENTRO") e o nome do jogador na fala do Ego.
- **Gancho no fim:** "Onze nomes. Faltava um." e o Shidou isolado no escuro levam direto à cena seguinte (shidou_cut).
- O que a impede de ser a melhor: a escuridão e as cabeças borradas e cortadas no primeiro plano.

### 32 rin_challenge
- **O jornal molhado no chão com a sua manchete e o Rin pisando nele** (P1, panorâmica de baixo para cima): é a imagem simbólica mais forte do lote depois da 27.
- **Fotografia de filme noir:** chuva, um poste, o farol do carro atrás do Rin (P2). O lugar é exatamente o do diálogo ('rain_street', "na frente do seu prédio").
- **Nenhum efeito do molde:** sem P&B, sem DOM, sem cut-in, sem cartela. Mostra que a cena não precisa deles.
- **Curta (4 planos, 12,5 s)**, com uma fala por plano.

---

## 3. Repetições e efeito-assinatura

### 3a. O que se repete (efeito → cenas)
| efeito / composição | cenas |
|---|---|
| **Molde completo do gol** (P&B → cut-in de bola → DOM!! → rede vista de dentro → GOOOL!! → confete/cartela) | 11, 12, 13, 26, 31 inteiros; pedaços em 07, 09, 14, 17, 19/20 |
| **Câmera atrás/dentro da rede** (a malha cobrindo a tela) | 07 P2, 09 P3, 11 P3, 13 P4, 14 P6, 17 P3, 19/20 P1, 26 P10, 31 P4 (10 vezes) |
| **Cut-in "bola + chuteira com linhas radiais"** (o mesmo desenho) | 01 (2x), 05/06 P1, 06 P3, 07 P2, 09 P3, 11 P1, 12 P0, 13 P2, 14 P4, 31 P1 |
| **Cut-in da mão aberta** | 04 P4, 05 P4, 07 P4, 19/20 P4 (luva do Loki), 29 P1 (as mãos) |
| **Cut-in do punho fechado** | 10 P2 e 25 P4 (desenho IDÊNTICO), 18 P4, 23 P0, 27 P3 |
| **P&B azulado** ("tempo parado" ou flashback) | 02, 04, 07, 08, 11, 13, 14, 17, 26, 28, 29, 31 (12 cenas) |
| **Olhos acesos / brilho ciano no rosto** | 06, 07, 10, 15, 16, 17, 21, 24, 26 |
| **Cartela de título no último plano** (itálico 900 grande) | 01, 03, 17, 19, 20, 23, 24, 26, 27, 30 (10 de 32) |
| **Porta que abre em luz** | 03 (branca), 22 P2 (branca), 27, 29 P4, 30 (laranja) |
| **Rachadura de vidro na tela** | 24 P4, 25 P4 |
| **Coroa rachando** | 17, 18 |
| **Papel com carimbo** | 22 P1/P4, 23 P2 |
| **Rotas e marcadores no chão** ("leitura de jogo") | 07 P0, 17 P1, 31 P0 |
| **Luzes apagando em cima de alguém** | 10 (a lâmpada), 18 P4, 30 P0–P1 |
| **Anel ou mancha de luz no chão sob o boneco** | 05 (vermelha), 12 (amarelo), 18 (ciano), 28 (laranja, 4 planos) |
| **Silhueta escura com halo em cut-in** | 01 P1, 21 P2, 22 P3, 23 P3 |
| **Câmera nas costas de um boneco** (proibido §8) | 03 P2, 05 P2, 07 P3, 15 P1/P4, 17 P2, 26 P12, 27 P4 |
| **Pares com a mesma imagem** | 05/06 (P0–P2), 15/16 (todos os planos), 19/20 (P0–P2 e P4) |

Causa de fundo: os cabeçalhos de todos os `cine3d_*.js` dizem "refeitas no padrão do gol da Sub-20 (js/cine3d_u20.js)". Um molde só foi aplicado a ~60 cenas e trouxe junto a mesma caixa de efeitos. É o oposto do "um efeito-assinatura por cena" que o dono pede.

### 3b. Efeito-assinatura atual de cada cena
| nº | id | assinatura atual |
|---|---|---|
| 01 | prologue_tada_miss | o chute que bate na trave ("CLANG!!") e a sala de monitores revelada — própria |
| 02 | ego_speech | o telão estourando em branco atrás do Ego (contraluz) — própria, mas mal dosada |
| 03 | bluelock_door | a luz branca da porta que engole tudo — **compartilhada** (porta: 22/27/29/30) |
| 04 | onigokko | o cronômetro da parede contando — própria |
| 05 | barou_king | **nenhuma** |
| 06 | barou_king_win | **nenhuma** (é a 05 com olhos vermelhos contra ciano) |
| 07 | ego_victory | as linhas vermelhas de leitura no gramado — **compartilhada** (17/31) |
| 08 | kuon_betrayal | **nenhuma** |
| 09 | chigiri_sprint | as correntes na perna — própria |
| 10 | rin_rival | a única lâmpada que se apaga — própria, mas o clímax vira olhos acesos (genérico) |
| 11 | scripted_shot | **nenhuma** (é o molde) |
| 12 | chem_reaction | o anel da cor do parceiro — fraca |
| 13 | first_selection_awakening | o quebra-cabeça (a última peça) — própria |
| 14 | bluelock_man_test | o arco tracejado da previsão e as bolas se acumulando — própria |
| 15 | rin_takes_bachira | **nenhuma** |
| 16 | rin_takes_bachira_win | **nenhuma** |
| 17 | barou_devour | a coroa rachando — **compartilhada** (18) |
| 18 | nagi_reo_split | a mão estendida e as luzes apagando — coroa compartilhada (17), apagão compartilhado (30) |
| 19 | world_five_fall | o placar subindo sozinho — própria, mas mal executada |
| 20 | world_five_win | a mesma da 19 |
| 21 | bl_eleven | a chamada com círculos de luz e o telão montando a escalação — própria |
| 22 | ego_federation | as plaquinhas da mesa e o carimbo — carimbo **compartilhado** (23) |
| 23 | shidou_cut | o quadro tático com o X vermelho — própria (o carimbo é repetido) |
| 24 | itoshi_snow | a lembrança que congela e racha — rachadura **compartilhada** (25) |
| 25 | sae_interview | **nenhuma própria** (a rachadura é do 24, o punho é do 10) |
| 26 | u20_direct_shoot | a cor indo embora em círculo e voltando no chute — própria, mas virou o molde de todas |
| 27 | wildcard_door | o corredor com ponto de fuga e a porta preta que vira laranja — própria (copiada por 29 e 30) |
| 28 | wildcard_hell | a capa de herói se desfazendo e o anel de escaneamento — própria (a capa volta no 30) |
| 29 | wildcard_verdict | a tela partida, metade P&B e metade cor — própria |
| 30 | kunigami_return | os refletores morrendo e a porta laranja — **derivada** (18 + 27) |
| 31 | nel_metavision_goal | o telão do leilão BLTV — os marcadores no chão são compartilhados (07/17) |
| 32 | rin_challenge | o jornal molhado com a sua manchete — própria |

Sem assinatura nenhuma: 05, 06, 08, 11, 15, 16, 25. Assinatura compartilhada ou derivada: 03, 07, 17, 18, 20, 22, 24, 30, 31.

---

## 4. Problemas que se repetem (do maior para o menor impacto)

1. **Bug que trava a cena e quebra todas as cutscenes seguintes até recarregar a página** (seção 5). Uma linha de cache derruba a sessão inteira.
2. **Um molde só para tudo.** P&B azulado, cut-in de bola e chuteira, DOM!!, rede vista de dentro, GOOOL!! e cartela final aparecem em até 12 cenas cada. As cenas de gol (11, 12, 13, 26, 31) são intercambiáveis, e as de drama herdaram os mesmos cut-ins (mão, punho). O jogador vê o mesmo desenho de bola mais de 11 vezes até o cap. 7.
3. **Momento-chave fora da tela, contado pelo narrador em plano parado:** 05 ("Gol. E outro. E mais outro." sobre as costas do Barou), 19/20 (os gols e a virada num plano escuro com o placar mudando sozinho), 15/16 (a escolha do Bachira num plano médio genérico). A cena existe justamente para mostrar isso.
4. **Escuridão.** Em 10 P3/P4, 21 P1/P4/P5, 22 P2, 23 P0, 25 P3, 30 P1 e 28, 70–90% do quadro é preto. Some a vinheta 0,5, a granulação e as tarjas de 12% em cima e embaixo (24% da tela já é preto): no celular com brilho baixo essas cenas viram uma tela preta com legenda.
5. **Personagem gigante, cortado ou borrado no primeiro plano** (furando a regra dos 45% e o §8): 01 P2, 03 P2, 18 P2, 19 P0, 21 P0/P2/P4/P5, 25 P1/P2, 26 P6/P7/P9/P12, 27 P4, 32 P1 25%, 11 P0. O desfoque de profundidade borra os bonecos da frente, e o resultado é o "sprite ampliado borrado" que o dono odeia.
6. **Olhos acesos como muleta dramática e brilho na altura errada.** Em 9 cenas a emoção é resolvida com olhos brilhando (06, 07, 10, 15, 16, 17, 21, 24, 26). Em 15/16/17/24/26 o brilho fica **na testa**: `st.eyes` usa altura 0.74 (`cine3d_selecao2.js:851,1093`; `cine3d_u20.js:376`; `cine3d_manga.js:579`; também `cine3d_wildcard.js:1227`), enquanto em `cine3d_selecao1.js` é 0.57 e cai nos olhos. Os dois pontos (afastados u*0,015) se fundem num ponto ciano só, parecendo uma pedra na testa. O próprio DIRECAO_DE_ARTE §5 manda "só os olhos acesos" e conflita com o gosto do dono contra aura.
7. **Narrador-locutor e letreiros que explicam a imagem:** "Goleiro batido...", "Na trave." (01), "Na cabeça!" (04), "O tempo congela...", "A rede estufa!" (11), "Um só chute!", "O goleiro vai alcançar?" (12), "Nem o Nagi!", "Voleio sem dominar!" (13), "DE PRIMEIRA!!", "FUKAKU não alcança!" (26), "Bomba de direita!" (31). Mais o letreiro "O TEMPO PAROU" (26) e as cartelas "O GOL DA VITÓRIA", "DEVORANDO O REI", "TOP 6" e "IRMÃO CONTRA IRMÃO" (esta duplicada pela legenda). É o caso "O SAE CONDUZ!" que o próprio doc proíbe (§6).
8. **Vitória e derrota com a mesma imagem:** 05/06, 15/16 e 19/20 só trocam a legenda. Quem venceu não ganha imagem própria; a 16 é cópia integral da 15.
9. **A tarja de cima mostra o título com emoji e "PLANO N • ..." em todas as cenas** (`cine_kit.js`, `cineTag`). As tags dão spoiler antes do acontecimento ("PLANO 5 • RYOSUKE KIRA, ELIMINADO", "PLANO 4 • O GOL ROUBADO", "PLANO 6 • EU DEVOREI", "PLANO 5 • ¥ 300.000.000") e, em 13–15 px numa tela de 1280, viram ruído ilegível no celular.
10. **Ritmo desigual.** As cenas de diálogo se arrastam: 5–7 s por plano com uma fala curta (06 P4 7 s; 28 P2/P4 6,3 s; 29 P4 6,2 s; 30 inteira; 05 P3/P4). As cenas de gol correm: 90–110 q (1,5–1,8 s) com legenda em 11, 12, 13 e 31.
11. **Cenários e objetos de cena reaproveitados entre arcos.** A porta (03, 22, 27, 29, 30), a capa (28, 30), a coroa (17, 18), o carimbo (22, 23) e a rachadura (24, 25) diluem as poucas assinaturas boas que existem.
12. **Coerência de elenco na NEL** (31): Kaiser e Hiori fixos e o placar "UBERS" fixo, independentemente do clube escolhido e do rival real do ch7.

---

## 5. Bug do `nagi_reo_split` (TypeError ... 'ppu' em mgmPartAt ← mgmCrown ← cutin.border)

**Conclusão: acontece no jogo de verdade, não é só da captura congelada. Gravidade: CRÍTICA (P0).**

**Causa (confirmada no código e por recaptura).**
1. `CE.mgmCrownPieces()` (`js/cine_manga.js:279-305`) guarda o resultado uma vez em `this._mgmCrownP = { e, list, P, Q }` e depois devolve esse objeto sempre que ele for verdadeiro.
2. No fim de **toda** cutscene, `finishSakuga()` (`js/cutscene_engine.js:426-431`) chama `releaseCineCaches()` (`:400-424`). Essa função percorre as chaves do CE que começam com "_"; quando encontra um objeto simples que contém canvas (aqui `e.cv`), faz `delete` em **todas as chaves** dele. O `_mgmCrownP` vira `{}`, que continua verdadeiro.
3. Na próxima vez que a coroa é desenhada, `const { e } = {}` deixa `e` indefinido, e `mgmPartAt` lê `e.ppu` (linha 155): TypeError.
4. Prova: na captura em lote, o `barou_devour` (17, que monta a coroa) tocou logo antes do 18 e o erro apareceu. Recapturado sozinho num navegador limpo, o `nagi_reo_split` tem **0 erros** (`recap_A\outB.txt`).

**O que o jogador vê.**
- `CA.panel` (`js/cine_art.js:592-656`) faz `ctx.save()` + `ctx.clip()` e chama `draw()` sem try/finally. `drawCine` (`js/cine_kit.js:72-107`) não tem try/catch. O laço da cutscene (`js/cutscene_engine.js:337-348`) chama `drawSakuga()` **antes** de agendar o próximo `requestAnimationFrame`. A exceção mata o laço.
- **Na cena:** a imagem congela no quadro do erro, sem tarjas e sem legenda, só com a sombra escura do cut-in. A música continua. Os cliques no canvas (`nextSakugaAngle`) avançam os planos às cegas até a cena fechar.
- **Depois dela:** o `#sakuga-action-canvas` é fixo em 1280×720 (`index.html:529`) e nunca é redimensionado, então o clip e 2 níveis de `save()` ficam presos no contexto. **Todas as cutscenes seguintes da sessão** só desenham dentro do retângulo do cut-in (canto de cima à direita); o resto da tela mostra a imagem congelada. É exatamente o que aparece nas folhas originais 19–22. Só volta ao normal recarregando a página (F5).

**Quando acontece no jogo real.**
- **Na história normal:** `nagi_choice` (interlúdio do ch2b) monta a coroa e, ao terminar, o cache é esvaziado. Depois, o `barou_devour` (interlúdio do ch3) quebra no plano 5 "DE JOELHOS" (aos ~121 q, quando a coroa entra). A partir daí ficam corrompidas world_five, wildcard_door, ego_federation e todas as outras, até recarregar a página. Só escapa quem recarregar a página entre os dois capítulos.
- **Ao rever** pelo botão "🎬 REVER" (`app.js:2876`): ver o nagi_choice duas vezes, ou o barou_devour depois do nagi_choice, na mesma sessão.
- A versão 2D (aparelho sem 3D) usa o mesmo `mgmCrownPieces` (`cine_manga.js:1763, 2650`) e tem o mesmo risco.

**Correção sugerida** (para a fase de execução, não aplicada):
- (a) Em `mgmCrownPieces`, testar `this._mgmCrownP?.e`. Ou pôr `'_mgmCrownP'` em `CINE_KEEP_CACHES`. Ou fazer `releaseCineCaches` zerar a chave (`this[k] = null`) em vez de apagar as chaves de dentro do objeto.
- (b) Blindar o desenho: try/finally no `CA.panel` com `ctx.restore()`; try/catch no `drawCine` que restaure o contexto; e em `playActionSakuga`, `ctx.reset?.()` (ou `cv.width = cv.width`) para nenhuma cena herdar o estado de outra.
- (c) No laço, agendar o próximo `requestAnimationFrame` antes de desenhar (ou envolver em try/catch), para que um quadro ruim não congele a cena.
- (d) Teste automático: tocar todas as cenas em sequência no mesmo navegador (como a captura fez) e falhar se houver erro.

---

## 6. Nota e backlog

**Nota "Cutscenes" (lote 01–32): 5/10.**
O nível técnico é alto: cenário 3D com bonecos em pixel art, câmera viva, 32 cenas com lugar coerente na grande maioria, e quatro cenas (27, 24, 21, 32) mostram que o time sabe fazer cinema com identidade. Mas só 4 de 32 têm a régua do dono. 9 são ruins: o momento-chave fica fora da tela, há cópias integrais entre vitória e derrota, e há violações explícitas do próprio guia na cena de gol mais importante (26). Um molde único achata quase tudo. Acima de tudo, há um bug que congela a cena e corrompe todas as cutscenes seguintes da sessão em um caminho normal da história (ch2b → ch3).

### Backlog
| # | tarefa | impacto (1–5) | esforço (1–5) |
|---|---|---|---|
| 1 | Corrigir o cache da coroa (`_mgmCrownP` esvaziado por `releaseCineCaches`) | 5 | 1 |
| 2 | Blindar o desenho: try/finally no `CA.panel`, try/catch no `drawCine`, reset do contexto do canvas a cada cena, `requestAnimationFrame` agendado antes do desenho | 5 | 2 |
| 3 | Teste automático: tocar todas as cenas em sequência no mesmo navegador e falhar com erro (ou com parte da tela congelada) | 4 | 2 |
| 4 | Definir 1 efeito-assinatura por cena (usar a tabela 3b) e tirar das outras o molde (P&B, cut-in de bola, rede vista de dentro, GOOOL, cartela). Começar pelos gols genéricos 11/12/13/31, que são os que mais tocam | 5 | 4 |
| 5 | Refazer 05/06, 15/16 e 19/20: momento-chave EM CENA (os gols do Rei, a velocidade do Loki, a escolha do Bachira) e imagem própria para a variante de vitória | 4 | 4 |
| 6 | Tirar da 26 as violações do guia: close do rosto (P6), boneco gigante (P7), rede borrada (P9), "O TEMPO PAROU", "O GOL DA VITÓRIA", cortes na borda (P2/P12) | 4 | 2 |
| 7 | Regra de enquadramento: nenhum boneco cortado pela borda, nenhum boneco na frente acima de 45% da altura, desfoque só no fundo. Corrigir 01 P2, 03 P2, 18 P2, 19 P0, 21, 25 P1/P2, 27 P4 | 4 | 2 |
| 8 | Piso de exposição nas cenas escuras (luz de recorte nos bonecos, vinheta menor): 10, 21, 22 P2, 23 P0, 25 P3, 28, 30 P1. Conferir no celular com brilho baixo | 4 | 2 |
| 9 | Corrigir a altura do brilho dos olhos (0.74 → ~0.57) em selecao2/u20/manga/wildcard e limitar olhos acesos a 1 cena por arco. Revisar o §5 do DIRECAO_DE_ARTE ("só os olhos acesos") | 3 | 1 |
| 10 | Cortar o narrador-locutor que descreve a imagem e as cartelas explicativas (TOP 6, DEVORANDO O REI, O GOL DA VITÓRIA; IRMÃO CONTRA IRMÃO duplicada pela legenda) | 3 | 1 |
| 11 | Proibir reuso do mesmo cut-in em mais de uma cena (mão, punho, bola+chuteira, carimbo, coroa, rachadura) e criar um objeto próprio por cena (como as correntes da 09 e o jornal da 32) | 3 | 3 |
| 12 | Elenco e placar da 31 de acordo com o clube do jogador e o rival real do ch7 (hoje: Kaiser, Hiori e "UBERS" fixos) | 3 | 2 |
| 13 | Tirar da tarja de cima as tags "PLANO N • ..." que dão spoiler e o emoji do título (ou mostrar só no modo galeria) | 2 | 1 |
| 14 | Ritmo: encurtar planos de mais de 5 s com uma fala (06 P4, 28 P2/P4, 29 P4, 30) e dar pelo menos ~2 s aos planos com legenda nos gols (11/12/13/31) | 2 | 1 |
| 15 | Reservar a porta laranja só para 27 (e talvez 30); 29 termina de outro jeito; a capa fica só no 28; a coroa só no 18; o carimbo só no 22; a rachadura só no 24 | 2 | 2 |
| 16 | Polir a régua: 24 (brilho na testa), 21 (escuridão e cabeças cortadas), 27 P4 (boneco borrado nas costas), 32 (olhos do Rin, contraste do P3, um último plano de fecho) | 2 | 1 |
| 17 | Refazer 10 e 25 com assinatura própria (hoje dividem o punho e a rachadura e terminam no escuro) | 3 | 3 |
