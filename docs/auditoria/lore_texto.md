# FASE 0 — Auditoria de LORE e TEXTO (só leitura)

Escopo lido: `js/data_story.js` (inteiro), `js/data_characters.js` (inteiro), `js/data_weapons_flows.js` (nomes/descrições), `js/data_duo.js` + `js/duo_saga.js` (falas), legendas de todas as `js/cine3d_*.js` e `js/cine_*.js` (extraídas por varredura), falas de NPC em `js/hub.js` / `js/hub3d*.js`, diálogos e strings de UI em `js/app.js`, `js/ui_*.js`, `js/match_engine.js`, `js/easter_eggs.js`, `index.html`.
Nenhum arquivo do projeto foi alterado.

**Fontes externas consultadas (só para reduzir chute; são de fãs, não oficiais, então tudo que vem delas segue marcado como [VERIFICAR]):** Wikipedia "List of Blue Lock characters"; recaps de capítulos (soapcentral, superherohype, animeexplained, sportskeeda). Resumo do que elas dizem e que importa aqui:
- O arco da **Copa do Mundo Sub-20 já existe no mangá** (começou por volta de dez/2025). Grupo A do Japão: Nigéria, França e Inglaterra. Japão 4 x 0 Nigéria; França 2 x 1 Inglaterra; **Japão 2 x 4 França**; Japão x Inglaterra é o último jogo do grupo (em andamento por volta dos caps. 354–356, jul/ago 2026).
- **Fox existe no mangá**: é o técnico da Inglaterra Sub-20 (cap. ~355). **Teddy Knight** (New Gen 11, Inglaterra) e **Agi** (Inglaterra, camisa 20) também existem. **Hugo** existe: titular da França, camisa 9, meio-campista; ele e o Loki prometeram ganhar a Copa (fala em "4 vezes"). Charles marca segundos depois do apito contra o Japão.
- Time Z x Time W terminou **4 x 4**, com o gol do Chigiri superando o medo do joelho **direito**; os Wanima **eram ex-companheiros do Chigiri**. (O jogo acerta tudo isso.)
- Blue Lock x Sub-20: Nagi abriu o placar; **Barou marcou entrando do banco**; **Shidou marcou 2 e entrou no 2º tempo** pela Sub-20; Isagi fez o gol decisivo.
- Wikipedia diz que **Kunigami "joga pelo Bastard München"** na NEL (pode ser depois de uma transferência; ver [VERIFICAR]).

---

## 1. Ordem dos arcos: jogo x mangá

| # (chapterNumber) | id | O que o jogo conta | Cânone | Veredito |
|---|---|---|---|---|
| 0 | `ch0_prologue` | Final do colégio Ichinan x Matsukaze Kokuo (Kira), passe para o Tada | Final da eliminatória de Saitama, Isagi passa para o Tada, perde | Fiel (o jogador assume o lugar do Isagi) |
| — | diálogo `ch1_first_selection_x_y` | Auditório, discurso do Ego, porta, Quarto Z, pique-pega de 136 s, Kira eliminado | Igual | Fiel |
| 1 | `ch1_first_selection_x_y` | Time Z x Time X (Barou) | Derrota do Z | Fiel (vitória vira rota alternativa documentada) |
| 2 | `ch1b_team_y` | Time Z x Time Y (Niko) | Vitória do Z | Fiel |
| 3 | `ch1c_team_w` | Time Z x Time W, traição do Kuon, Chigiri corre, 4 x 4 | Igual | Fiel |
| 4 | `ch2_first_selection_v` | Time Z x Time V (Nagi, Reo, Zantetsu), chute direto | Igual | Fiel |
| 5 | `ch2b_second_selection` | Blue Lock Man, Nagi larga o Reo, 3x3 contra Rin/Aryu/Tokimitsu, Rin leva o Bachira | Igual no essencial | Fiel; detalhes das etapas 2x2/4x4/5x5 achatados [VERIFICAR] |
| 6 | `ch3_second_selection_world5` | Barou devorado, Rin te escolhe, World Five | Igual no essencial | Fiel; placar/quem marcou [VERIFICAR] |
| 7 | `ch4_third_selection` | Aposta com a JFU, Top 6 em 3 duplas, Time A (Rin & Shidou + você, Hiori, Nanase) | 3ª Seleção existe | Composição/critério do Top 6 e presença do Hiori [VERIFICAR] |
| 8 | `ch4b_trio_tournament` | **Torneio de Trios** decide o Blue Lock Eleven | Não reconheço esse torneio no mangá | Provável invenção apresentada como cânone [VERIFICAR] |
| 9 | `ch5_u20_japan` | Blue Lock x Sub-20 (4 x 3), coletiva do Sae, Rin rival | Igual no essencial | Autores dos gols divergem (ver seção 2) |
| 10 | `ch5b_wild_card` | Kunigami volta do Wild Card e joga um teste contra o Blue Lock | Volta na NEL; o teste não existe | Invenção **declarada** no código (`data_story.js:686`) — ok |
| 11–12 | `ch6_nel_barcha_manshine`, `ch7_nel_ubers_pxg` | NEL, 5 clubes, escolha do mestre, 8 jogos (turno e returno), top 23 vão à Copa | NEL com 5 clubes e corte de 23 | Formato "turno e returno, 8 jogos" [VERIFICAR] |
| 13 | `ch8_u20_england` | Copa Sub-20: Grupo F (Nigéria, Coreia, Argentina), quartas x Portugal, **semi x Inglaterra** (Fox na arquibancada) | Grupo A (Nigéria, França, Inglaterra); Inglaterra é jogo de **grupo**; Fox é o **técnico** | **Contradiz o mangá** e ainda se rotula "ARCO ATUAL DO MANGÁ" |
| 14 | `ch9_world_cup_final` | **Final x França**, Japão vence 3 x 2, "Quatro Egos", Hugo | Japão **perdeu de 2 x 4** para a França na fase de grupos | Contradiz o que já saiu |
| 15 | `ch10_fox_training` | Fox demitido vira mentor do jogador, "monstro" | Fox existe; o resto não aconteceu | Extrapolação do jogo — vai bater de frente com o mangá em breve [VERIFICAR] |
| 16–17 | `ch11/12_pro_season` | Liga Europeia, clubes paródia, Bola de Ouro | Não aconteceu | Extrapolação do jogo |
| 18 | `ch12b_wc_camp` | Convocação da seleção principal, amistosos | Não aconteceu | Extrapolação do jogo |
| 19 | `ch13_world_cup` | Copa do Mundo de 48 seleções, 16-avos até a final | Não aconteceu | Extrapolação (o formato de 48 seleções com 16-avos está certo) |
| 20 | `ch14_rin_final` | Duelo pelo nº 1, Bola de Ouro, destinos, créditos | Não aconteceu | Extrapolação; tem contradição interna (seção 4) |
| — | `hub3d_cidade.js` | Cidade com fãs, autógrafos | — | Extrapolação, sem conflito |
| — | Modo Dupla (`data_duo.js`) | Projeto Elo, original | — | Original de propósito; 2 atritos leves (seção 2) |

Resumo: do Prólogo até a Sub-20 do Japão o jogo está bem pesquisado e honesto nos comentários sobre o que muda. Os problemas sérios estão na **3ª Seleção (Torneio de Trios)** e na **Copa Sub-20**, que o jogo vende como "arco atual do mangá" mas monta com grupo, chave e resultados diferentes do que o mangá já publicou.

---

## 2. Contradições com o mangá

### 2.1 Tabela

| Arquivo:linha | O jogo diz | O mangá diz | Gravidade |
|---|---|---|---|
| `data_story.js:865`, `:3358` | Copa Sub-20 = "ARCO ATUAL DO MANGÁ" / conquista "(Arco Atual do Mangá)" | O arco existe, mas o conteúdo do jogo é outro (linhas abaixo) | **Alta** |
| `data_story.js:881`, `:899`, `:974` | Grupo F com Nigéria, Coreia do Sul e Argentina | Grupo A com Nigéria, França e Inglaterra [VERIFICAR] | **Alta** |
| `data_story.js:930` | Do grupo direto para as quartas (Portugal) | Copa de 24 seleções tem oitavas; o mangá fala em "Round of 16" [VERIFICAR] | Média |
| `data_story.js:940-958` | Inglaterra é a **semifinal**, o Fox só assiste da arquibancada como "???" | Inglaterra é o 3º jogo do grupo; o Fox é o **técnico** dela [VERIFICAR] | **Alta** |
| `data_story.js:986-1063` | Final contra a França, Japão vence 3 x 2 | Japão perdeu da França por 2 x 4 na fase de grupos [VERIFICAR] | **Alta** (muda um evento central já publicado) |
| `data_story.js:43-46` | O Fox "foi demitido" depois que vocês eliminaram a Inglaterra | Ainda não aconteceu | Média (extrapolação que já nasce em conflito) |
| `data_story.js:940-941`, `:1326-1329`; `data_characters.js:426` | Chris Prince e Adam Blake jogam pela Inglaterra **Sub-20** | Chris Prince é profissional e mestre do Manshine; idade de Blake não confirmada [VERIFICAR] | Alta se forem maiores de 20 |
| `data_characters.js:564` | Hugo: CF, camisa 11, "PXG / França U-20", filosofia do "segundo lugar" | Hugo: meio-campista, camisa 9; clube [VERIFICAR] | Média |
| `data_characters.js:434`, `:442` | Agi: CF nº 9 "Manshine City"; Teddy Knight: CAM nº 10 "Manshine City" | Agi camisa 20 pela Inglaterra; Teddy é New Gen 11; clubes [VERIFICAR] | Baixa |
| `data_story.js:645-653` | Gols da Sub-20: você, Nagi, Rin (Blue Lock); Shidou x2 e Sae (Sub-20); Shidou marca cedo | Nagi abriu, **Barou entrou do banco e marcou**, Isagi decidiu; Shidou x2 entrando no **2º tempo** [VERIFICAR o 3º gol do Blue Lock] | Média |
| `cine3d_federacao.js:1020-1031` (e `cine_federacao.js:2488-2499`) | Blue Lock Eleven: Gagamaru, Aryu, Niko, Bachira, Chigiri, Karasu, Otoya, Yukimiya, Nagi, Rin + você | Escalação titular real [VERIFICAR]; Barou e Reo existem no jogo do mangá e aqui somem | Média |
| `data_story.js:536-615`, `app.js:3886` | O Ego cria o "Torneio de Trios" para escolher o Eleven | Não reconheço no mangá [VERIFICAR] | **Alta** se for invenção (muda como o Eleven é escolhido) |
| `data_story.js:484` | "Só dois marcaram contra o World Five... **É isso que define o TOP 6**" | O próprio jogo lista 6 nomes no Top 6 (`:511`, `:517`), 4 deles sem gol | Média (contradição interna + critério [VERIFICAR]) |
| `data_story.js:759`, `:1773`, `:3019` x `data_characters.js:30` | História: Kunigami entra pelo **Manshine**. Ficha do personagem: "**Bastard München** / Japão U-20" | Wikipedia: joga pelo Bastard München [VERIFICAR se estreou no Manshine e depois se transferiu] | Média (a contradição interna é certa) |
| `data_story.js:2944` x `cine3d_manga.js:63-64` | No texto, VOCÊ escolhe o Nagi; na cena, o Nagi pede para ir ("Eu quero jogar com ele") | No mangá o Nagi decide ir com o Isagi (alta confiança, mas [VERIFICAR]) | Baixa |
| `data_story.js:2177` | Rin pergunta "Quer jogar no meu time?" e dá a opção de recusar (`:2186`) | O Rin escolhe, não convida; e recusar não muda nada no jogo | Baixa |
| `data_story.js:827`, `:842` | Base do Cap. NEL final tem **Kaiser como rival** do Bastard | O Kaiser é do Bastard. Corrigido em `NEL_CLUBS.bastard.phases[1]` (`:1508-1512`), mas o dado morto continua | Baixa |
| `data_story.js:782` | Título "Manshine City (Chris Prince & **Agi**)" | Agi não está no elenco do Manshine do próprio jogo (`:1773`) | Baixa |
| `data_characters.js:474` | Snuffy: "Ubers / **Malta**" | Nacionalidade [VERIFICAR] | Baixa |
| `data_story.js:1252`, `:1289`; `data_characters.js:482` | Don Lorenzo joga pela Itália | Nacionalidade [VERIFICAR] | Baixa |
| `data_characters.js` (vários) | Números de camisa: Kunigami 50, Chigiri 44, Shidou 99, Igarashi 108, Nanase 97, Kiyora 69 etc. | Não reconheço como canônicos [VERIFICAR] | Baixa |
| `data_weapons_flows.js:237-245`; `data_characters.js:33` | Kunigami pós-Wild Card = "Ambidestro", "físico moldado à imagem de Noel Noa", "Knuckleball de canhota" | [VERIFICAR] | Baixa |
| `data_weapons_flows.js:157` | Hiori = "Maestro Reflexivo (**Ultra-Sadista**)"; quote `data_characters.js:91` "eu te descarto" | O Hiori é calmo e inseguro; "sádico" não combina [VERIFICAR] | Baixa |
| `data_story.js:126`, `:158` | "Bunker **subterrâneo**" do Prédio 5 | O Blue Lock não é descrito como subterrâneo [VERIFICAR] | Baixa |
| `data_story.js:76`, `:95`, `:97`, `:3352` | "Final Regional", "Final das Eliminatórias Nacionais", "Final do Ensino Médio" para o mesmo jogo | Final da eliminatória de Saitama para o torneio nacional | Baixa (nome inconsistente) |
| `hub3d.js:206`, `:224`, `:399`, `:415` | Pôsteres com "ISAGI" escrito nas paredes do Blue Lock | No jogo o Isagi não existe ("esse nome já tem dono... em outro universo", `easter_eggs.js:81`) | Baixa/média (quebra a regra do próprio jogo) |
| `cine3d_final.js:2473`, `cine_final.js:2871` | Destino do Shidou: "O **PXG** já trocou a rede três vezes" | Na carreira pro do jogo o Shidou está no **Marsella** (`data_story.js:1907`) | Baixa (interna) |
| `duo_saga.js:89` x `:91` | "A Sub-20 levou os DOIS" e logo depois "os 23 mais valiosos vão para a Copa" | Interna do modo Dupla | Média (interna) |
| `data_duo.js:418` | O Ego decide quem vai para a Sub-20 durante o Projeto Elo | No cânone o Ego só controla a Sub-20 depois de vencer a aposta. Não é erro (lore original), mas o momento fica ambíguo | Baixa |

### 2.2 O que o jogo acerta (vale manter)
- Isagi começa em **299º**; pique-pega de **136 s**; Kira eliminado no 1º dia (`data_story.js:2093-2096`, `:1059`).
- Wanima ex-companheiros do Chigiri, joelho direito, 4 x 4 (`:240`, `:284`, `:2102`).
- Nagi joga há 6 meses; Reo chama o Nagi de "tesouro" (`:336`, `:2147`).
- Kunigami: chute de canhota de média distância; sonho de "herói" (`:2155`, `:2033`).
- Rin e Sae de Kamakura; o Sae largou o ataque e a frase "você não serve" (`cine3d_manga.js:458-463`).
- O Sae pede o Shidou para a Sub-20 (`cine3d_federacao.js:1294-1295`); o Sae diz o nome do protagonista na coletiva (`cine3d_rin.js:401-412`).
- NEL: 5 clubes com seus mestres (Noa, Chris Prince, Lavinho, Snuffy, Loki), "escolham seu mestre", corte de 23 para a Copa (`:1964`, `:858`).
- Conceitos: arma reproduzível, Metavision, Kaiser Impact/Magnus, rosa azul do Kaiser, "OSHAA" do Aryu, células do Shidou.
- Loki com 17 anos (`:462`), Luna no Re Al/Espanha.

### 2.3 Como o jogo trata o protagonista do mangá
O jogador **substitui o Isagi** por completo: cabelo padrão `isagi` (`app.js:29`, `:346`); a arma "adaptação" usa Direct Shot, Two-Gun Volley e Metavision (`data_weapons_flows.js:278-286`); o jogador herda o passe para o Tada, o 299º lugar, o gol da sorte contra a Sub-20 e a rivalidade com o Rin. O Isagi não está na lista de personagens e um easter egg explica a ausência (`easter_eggs.js:81`). É coerente e intencional. As exceções são os pôsteres "ISAGI" no hub (tabela acima) e o comentário em `data_story.js:1455`, que é só de desenvolvedor.

---

## 3. [VERIFICAR] — perguntas objetivas para o dono

**Copa Sub-20 (urgente, porque o jogo diz que é "o arco atual"):**
1. O grupo do Japão é o Grupo A com Nigéria, França e Inglaterra? Quais foram os placares (Japão 4 x 0 Nigéria, Japão 2 x 4 França)?
2. O jogo contra a Inglaterra é o último da fase de grupos, e não uma semifinal?
3. O Fox é técnico da Inglaterra Sub-20 desde a primeira aparição? Em que capítulo ele aparece pela primeira vez, e já tem nome completo?
4. Chris Prince e Adam Blake têm menos de 20 anos? Eles jogam pela Inglaterra Sub-20?
5. Hugo: posição, camisa, clube e cor de cabelo canônicos. A cena/conceito "Quatro Egos / 4 EGO'S" existe no mangá ou foi criada a partir de uma imagem de referência?
6. Teddy Knight e Agi: clube na NEL (Manshine?), posição e camisa.
7. Quer manter a Copa Sub-20 do jogo como "versão alternativa" (tirar o rótulo "arco atual") ou reestruturá-la conforme o mangá?

**3ª Seleção e Blue Lock Eleven:**
8. O "Torneio de Trios" existe no mangá? Se não, como o Eleven é escolhido no cânone?
9. Quem é o Top 6 da 3ª Seleção, e qual é o critério?
10. O Hiori e o Nanase aparecem na 3ª Seleção? O Kurona (`trioPool`, `data_story.js:557`) já está no Blue Lock nessa época?
11. Escalação titular do Blue Lock Eleven contra a Sub-20 e quem entrou do banco (Barou, Reo, Chigiri?).
12. Ordem e autores dos gols do 4 x 3 (o 3º gol do Blue Lock é do Rin, do Isagi ou de outro?).
13. O Ego cortou o Shidou do Eleven com o argumento "você não joga com o Rin"?
14. Elenco da Sub-20 japonesa: Sendo, Fukaku, Darai, Neru, Niou, Hayate, Wakatsuki, Cho e Kitsunezato são nomes do mangá? O Sendo fala em "casar com atriz de Hollywood"?

**1ª e 2ª Seleção:**
15. Time X x Time Z: placar e quantos gols o Barou fez?
16. Time Y: o Okawa existe, é do Time Y e marcou contra o Z?
17. Time V: o Tsunzaki é do Time V? Quem marcou os gols do Time Z?
18. 2ª Seleção: na partida em que o Nagi deixa o Reo, quem eram os três de cada lado? Foi o Nagi quem pediu para ir?
19. Na derrota no 5 x 5 contra o time do Rin, o Rin escolheu o Isagi? O Barou foi "devorado" nesse jogo ou no anterior?
20. World Five: placar (5 x 1?) e quem marcou contra eles (só o Rin e o Shidou?).
21. O Ego diz que o Kuon foi "rejeitado pelo Time W" (`data_story.js:300`)?

**NEL:**
22. Formato: cada clube joga 4 ou 8 partidas?
23. Ordem dos jogos do Bastard (Barcha → Manshine → Ubers → PXG?).
24. Elencos do Blue Lock em cada clube: Kunigami (Manshine e depois Bastard?), Otoya, Darai, Himizu (Barcha?), Aryu, Niko, Aiku (Ubers?), Zantetsu, Karasu, Tokimitsu, Nanase (PXG?), Kiyora e Raichi (Bastard?).
25. Nacionalidades: Noa (francês?), Snuffy (Malta?), Lorenzo (Itália?), Pablo Cavazos (Argentina?), Blake (Inglaterra?).
26. New Gen 11: o Lorenzo e o Bunny fazem parte? O Sae faz? E o Loki? O jogo também chama o Kaiser e o Sae de "World Class" (`data_weapons_flows.js:307`, `:320`).
27. Golpes: "Big Bang Drive"/"Dragon Drive" (Shidou), "Voleio de Cinco Estágios" (Nagi), "Zona Dourada"/"44°" (Chigiri), "Predator Eye" (Isagi ou Barou?), "Sword Screw" (Yukimiya), "Knuckleball" (Chris Prince). Quais são canônicos?
28. Personagens que podem ser de preenchimento: Himizu "Aiki", Hiiragi "Reiji", Nishioka "Hajime", Tanaka "Shigen", Shiguma, Haiji, Ishikari, Endoji, Yuzu, Tsunzaki, Sokura, Grim, Gesner, Birkenstock, Ali, Abdi, Drago, Ignacio Lara. Quais são canônicos? Os inventados devem ser marcados como "originais do jogo" na coleção.
29. Números de camisa canônicos dos principais.
30. O Blue Lock é um bunker subterrâneo?

---

## 4. Texto e narrativa

### 4.1 Erros de português
| Arquivo:linha | Erro | Correção |
|---|---|---|
| `data_weapons_flows.js:96` | "Ignicao Explosiva" | "Ignição Explosiva" |
| `data_weapons_flows.js:163` | "Finta deGelo Sem Olhar" | "Finta de Gelo Sem Olhar" |
| `data_characters.js:509` | "Distorsão Temporal" | "Distorção Temporal" |
| `data_weapons_flows.js:340` | "Intercepção Temporal" | "Interceptação" (forma usual no Brasil) |
| `app.js:4366` | "treino intensivo **no** ${dr.name}" gera "no Câmara de Sprint…", "no Sala de Quebra-Cabeça…" | Concordar o artigo com cada treino, ou reescrever a frase |
| `data_characters.js:123` | Otoya: "…só entrar nas costas deles **e caixa**." | Frase sem sentido. Ex.: "…e já era." |
| `data_story.js:1046`, `app.js:3706`, PLANO | "4 EGO'S" | "4 EGOS" (apóstrofo de plural é inglês errado) |
| `match_engine.js:1591` | "MARCADOR(ES) BATIDO(S)" | Usar singular ou plural de acordo com o número |
| `data_story.js:126` | "BUNKER SUBTERRÂNEO PRÉDIO 5" | "…DO PRÉDIO 5" |
| Fonte pixel: `hub3d.js:730`, `:1064`; `hub.js:524`; `cine3d_final.js:669`, `:1344`, `:2628`; `cine3d_wildcard.js:518`; `cine3d_duo.js:954` | "PROXIMO DESAFIO", "SAIDA", "SELECAO… CONVOCACAO", "VOCE", "PROXIMA GERACAO", "VOCES DOIS" | A fonte bitmap não tem acentos. Criar os glifos (Á É Í Ó Ú Ã Õ Ç Ê Ô) |

### 4.2 Inglês misturado na interface
- `ui_time.js:570`, `app.js:4361-4362`, `cutscene_engine.js:15`, `:42`, `index.html:565`: "BLUE LOCK TRAINING CENTRE" / "TRAINING LAB" → "CENTRO DE TREINAMENTO" / "LABORATÓRIO". Placas de estádio (`match_engine.js:4498-4523`) podem ficar em inglês porque fazem parte do cenário; as de UI, não. A placa da Copa também usa a marca real "FIFA U-20" (`match_engine.js:4511`), o que vale reavaliar.
- `ui_perfil.js:129` "EGOIST LOCKER"; `ui_colecao.js:700-701` "SHOP" / "EGOIST SHOP"; `data_story.js:1939` crest "EURO LEAGUE". "NEO EGOIST LEAGUE" pode ficar, porque é nome canônico.
- `data_story.js:991` e `cine3d_fox2.js:600` "Final World Cup U-20" → "Final da Copa do Mundo Sub-20".
- "Overall" (`app.js:4366`, `:4487`, `index.html:276`, `ui_historia.js:204`) e "Skills" (`data_story.js:3354`, `app.js:4080`, `index.html:491-497`, `match_engine.js:124`, `:3706`) → "OVR/Geral" e "Habilidades".
- Nomes de treino: "(Manshine Lab)" e "(2v1)" (`data_story.js:2871`, `:2910`).
- Golpes: nomes canônicos em inglês (Metavision, Direct Shot, Kaiser Impact) podem ficar; nomes inventados em inglês deveriam ir para o português ("44 Panther Snipe", "Bee Shot", "Crash Shot", "Godspeed Warp", "Showtime Carnaval", "Counter-Dribble"). Há também "Ballon d'Or" (`data_weapons_flows.js:353`) no lugar de "Bola de Ouro".
- Times dos personagens em `data_characters.js` usam "Japão U-20", "Inglaterra U-20" etc., e isso aparece na interface (`ui_perfil.js:710`, `:818`). Trocar por "Sub-20".

### 4.3 Texto genérico ou placeholder
- **Diálogo antes do treino** (`app.js:4364-4374`): o mentor diz sempre "Dia de treino intensivo no ${nome}. Mostre em campo que você merece subir seu Overall!" e o jogador responde sempre "Eu comecei do zero, mas vou destruir todos os alvos desse minigame agora mesmo!". A fala quebra a quarta parede ("minigame", "Overall"), não muda com a época ("comecei do zero" mesmo sendo Bola de Ouro) e tem mentores fora de época: Noel Noa, Chris Prince e Marc Snuffy treinam você já no Prólogo e na 1ª Seleção (`data_story.js:2872`, `:2885`, `:2898`, `:2911`).
- **Personagens explicando controles** (quebra a voz e a imersão): Bachira "é só apertar [R]" (`data_story.js:161`); Kunigami "aperte [F]" (`:162`); Shidou "aperte [C]" (`:519`); Hiori "aperte [R]" (`:520`); Anri "goleiros holográficos… Boa sorte, pessoal!" (`:609`); Ego "Aperte [G]… FLUXO!" (`:666`); Ego "Seu 2º Slot de Arma e Fluxo está DESBLOQUEADO!" (`:681`); Ego "química alta faz o seu parceiro jogar melhor" (`:608`). Isso deveria ir para o HUD ou o tutorial.
- Rodada do torneio com fala-modelo do Ego (`app.js:3886`): "${round.name}! Seu trio contra o ${round.rivalName}." Funciona, mas é visivelmente montada por template.
- O capítulo da Copa Sub-20 tem só uma linha de diálogo próprio (`data_story.js:2702-2704`).
- Shiguma tem quote "..." (`data_characters.js:235`).

### 4.4 Repetição e tiques
- **Fox**: cerca de 20 das 28 falas dele em `data_story.js` têm "Hehe…". O efeito cansa rápido.
- **Shidou**: 11 das 12 falas giram em torno de "células / Big Bang / explodir" (ex.: `data_story.js:526`, `:530`, `:1242`, `:1750`, `:2740`, `:3193`).
- **Bachira**: 12 das 27 falas falam do "monstro".
- **Sae**: "Não me façam/faça me arrepender" aparece duas vezes seguidas (`data_story.js:981`, `:2786`).
- **Loki** se apresenta duas vezes no mesmo capítulo, em tons diferentes (`:2204` "Vocês sabem quem eu sou? Não? Ótimo." e `:462` "Prazer, sou Julian Loki, da França…").
- **Duas galas da Bola de Ouro** em Paris: fim da temporada (`app.js:3300-3312`) e epílogo (`data_story.js:1431-1435`). A segunda vence sempre, mesmo que você tenha perdido a primeira, e as duas usam "a noite da Bola de Ouro".

### 4.5 Escolhas do jogador que a história ignora (consistência narrativa)
- **Passe ou chute no Prólogo**: o epílogo assume que você passou ("Aquele passe na final do colégio…", `data_story.js:1061`; "dessa vez… eu não passo", `:1446`; "(Dessa vez... eu chutei.)", `cine3d_final.js:3296`), mesmo para quem chutou (`when: 'shoot'` existe em `:114`, `:117`).
- **World Five**: o Loki diz "Na Segunda Seleção eu te venci" (`:2528`) e "Desde a Segunda Seleção eu espero por esse reencontro" (`:2840`) mesmo se você ganhou (`:470-474`).
- **Nº 1 do Blue Lock**: o Ego anuncia "O número 1 do Blue Lock... é você" depois da NEL (`app.js:988-994`, ranking 1 em `data_story.js:1470`). Depois o Rin cobra "o número 1 do Blue Lock" e o Ego diz "O Blue Lock nunca decidiu o seu número 1" (`:1376-1377`, `:3302`). **Contradição direta.**
- Kunigami "não falou com ninguém desde o Wild Card" (`:2380`), mas falou com você no capítulo anterior (`:724-760`).
- Falas de NPC do hub não mudam com a época: o Kunigami diz "Herói de verdade treina dobrado" (`hub.js:1509`) mesmo depois do Wild Card, quando o "herói morreu".

### 4.6 Consistência de termos
| Termo | Variações encontradas | Sugestão |
|---|---|---|
| Sub-20 | "Sub-20" (264x) x "U-20/U20" (134x, várias visíveis) | "Sub-20" no texto; "U-20" só em placa de estádio |
| Pega-pega | "PIQUE-PEGA" (`:2093`, cenas) x "pega-pega" (`:158`, `:161`) | Escolher um ("pega-pega" é o mais usado no Brasil) |
| Ego | "Ego" (a pessoa), "ego" (o conceito), "EGO" (os dois; ex.: `cine3d_partida.js:857` "Esse é o EGO.") | "Ego" = pessoa; "ego" = conceito; caixa alta só em grito |
| Valor na NEL | "ranking salarial" (`:858`), "leilão mundial de salários" (`:800`), "oferta salarial" (`:811`), "RANKING DE VALOR / valor de mercado" (`:1934`), "Seu leilão" (`cine3d_partida.js:1140`) | Um termo só: "valor de mercado" (ou "lance") |
| Fluxo | "Fluxo" consistente; "FLOW" só como marca d'água (`ui_colecao.js:209`) | OK |
| Arma | Consistente; mas é **sorteada na roleta**, inclusive armas de outros personagens ("Kaiser Impact"), o que vai contra a ideia do mangá de que a arma é descoberta | Questão de design para a Fase 3 |
| Wild Card / Coringa | Os dois | "Wild Card" = programa; "Coringa" = apelido |
| Bola de Ouro | Consistente, exceto "Ballon d'Or" (`data_weapons_flows.js:353`) | Padronizar |
| World Class | Kaiser e Sae chamados de "World Class" nas armas (`data_weapons_flows.js:307`, `:320`) sem ter o selo na ficha | Usar "New Gen 11" para eles |

### 4.7 Voz dos personagens (traço canônico → bons exemplos → fora do tom)
- **Jinpachi Ego** (seco, provocador, teórico: "arma", "reprodutibilidade", "devorar").
  Bons: `data_story.js:185` "Sem uma ARMA reproduzível, vocês são ração…"; `:2096`; `:2013`.
  Fora do tom: `:666` e `:681` (manual de controles); `:608` (mecânica de química); `:1377` (contradiz o ranking); "Hehe" em excesso no modo Dupla (`data_duo.js:277`, `:433`, `:516`).
- **Meguru Bachira** (brincalhão, "monstro", infantil).
  Bons: `:2053`, `:396`, `:1607`.
  Fora do tom: `:161` (tutorial); repetição do "monstro" em quase toda fala.
- **Hyoma Chigiri** (orgulhoso, sarcástico, trauma do joelho).
  Bons: `:286`, `:298`, `:2106`, `:907`.
  Fora do tom: pouca coisa; `:1569` "Eu nunca corri tanto na minha vida!" é genérico.
- **Rensuke Kunigami** (herói direto; depois do Wild Card, frio).
  Bons: `:2155`, `:2033`, `:724`, `:748`.
  Fora do tom: `:162` (tutorial); `data_characters.js:35` "quem marca o gol é rei" (vocabulário do Barou); `hub.js:1509` fora de época.
- **Seishiro Nagi** (preguiçoso, "que saco", games).
  Bons: `:337`, `:347`, `:2948`, `:1304`.
  Fora do tom: `:343` "Vem pra cima!" (energia demais); `:1228` ok.
- **Reo Mikage** (rico, possessivo com o "tesouro", estrategista).
  Bons: `:336`, `:2147`, `:2943`, `:2963`.
  Fora do tom: `:1545` "A nossa química com ele tá ficando perigosa!" (genérico).
- **Shouei Barou** ("Rei", "súditos", nunca divide).
  Bons: `:164`, `:169`, `:3061`, `:926`.
  Fora do tom: `:1687` "Vem junto. Dois reis no ataque!" e `:2672` "Só hoje eu divido o trono" (o Barou não cede assim).
- **Rin Itoshi** (frio, curto, obcecado com o Sae, "destruir").
  Bons: `:398`, `:2193`, `:27-28`, `:1240`.
  Fora do tom: `:2177` (convite educado); `:2327` "…Mas... valeu." (agradecer antes da Sub-20); `:2735` "(Ele está sorrindo de leve.)".
- **Sae Itoshi** (gélido, desdenhoso, frase mínima).
  Bons: `:664`, `:2310`, `:3158`, `cine3d_manga.js:459-462`.
  Fora do tom: `:1049` "Aquela final no Ensino Médio te trouxe até aqui…" (o Sae não sabe nem liga para isso; fala expositiva); `:677` explicativo demais; repetição em `:981` e `:2786`.
- **Ryusei Shidou** (caótico, "células", hiperbólico).
  Bons: `:530`, `:2233`, `:2238`.
  Fora do tom: `:519` (tutorial); monotemático (Big Bang).
- **Michael Kaiser** (imperial, desdenhoso, cruel com elegância).
  Bons: `:812`, `:856`, `:2406`.
  Fora do tom: `:1106` "E porque a raposa paga bem." (o Kaiser não aceitaria ser contratado); `:801` anuncia o nome do próprio golpe; `data_characters.js:383` "Auf Wiedersehen, palhaço" mistura idiomas sem necessidade.
- **Alexis Ness** (devoto do Kaiser, venenoso).
  Bons: `:2425`, `:2436`.
  Fora do tom: `:1322` (genérico). É pouco usado.
- **Noel Noa** (racional, números, mínimo de palavras).
  Bons: `:800`, `:2398` "Ambição sem números é ruído.", `:1435`.
  Fora do tom: quase nada; `:1352` está bom. Jogar a final pela França depende da nacionalidade [VERIFICAR].
- **Anri Teieri** (séria, idealista, trabalhadora).
  Bons: `:531`, `:3080`.
  Fora do tom: `:609` (tutorial animado); `:3128` "Eu coloquei protetor solar na sua mala…" (maternal demais).

### 4.8 Paredes de texto
Não há problema relevante nas falas: a maior tem cerca de 190 caracteres (`data_story.js:1377`), e as cenas de cinema usam frases curtas. Os `loreSummary` são longos (ex.: `:457`, `:515`), mas ficam no cartão do capítulo, não no diálogo.

---

## 5. Notas

- **Fidelidade à lore: 6/10.** Do Prólogo até a Sub-20 do Japão o trabalho é cuidadoso: muitos detalhes finos certos e comentários honestos marcando o que foge do mangá. Perde pontos porque a Copa Sub-20 é apresentada como "arco atual do mangá" mas tem grupo, chave e resultados contrários ao que já foi publicado; o Torneio de Trios provavelmente é inventado e aparece como canônico; há contradições internas de elenco (Kunigami, Agi, Kaiser), lógica quebrada no Top 6, possíveis personagens de preenchimento sem aviso e pôsteres do Isagi num mundo sem Isagi.
- **Texto e narrativa: 6/10.** As falas são enxutas e com ritmo; o Fox, o Rin e o Nagi têm voz própria; as escolhas mexem em relações e há cenas marcantes (Kamakura, coletiva do Sae). Perde pontos pelo inglês na interface, personagens lendo manual de controles, o diálogo-placeholder do treino, tiques repetidos (Fox, Shidou, Bachira), escolhas do jogador ignoradas no epílogo, a contradição do nº 1, duas galas da Bola de Ouro, termos sem padrão e erros de digitação.

---

## 6. Backlog (lore e texto)

Ordenado por impacto alto e esforço baixo primeiro.

| # | Tarefa | Área | Impacto (1–5) | Esforço (1–5) |
|---|---|---|---|---|
| 1 | Tirar "ARCO ATUAL DO MANGÁ" (`data_story.js:865`, `:3358`, PLANO) até decidir a nova versão da Copa Sub-20 | Lore | 5 | 1 |
| 2 | Resolver a contradição do nº 1 (`app.js:988-994` x `data_story.js:1376-1377`, `:3302`), por exemplo "nº 1 do ranking ≠ duelo direto" | Narrativa | 4 | 1 |
| 3 | Tirar as falas de tutorial da boca dos personagens (`data_story.js:161`, `:162`, `:519`, `:520`, `:608`, `:609`, `:666`, `:681`) e levar para HUD/tutorial | Texto | 4 | 2 |
| 4 | Reescrever o diálogo pré-treino por mentor e época, sem "minigame/Overall", com o artigo certo (`app.js:4364-4374`) e mentores adequados a cada fase (`data_story.js:2872-2911`) | Texto | 4 | 2 |
| 5 | Corrigir os erros de português da 4.1 | Texto | 2 | 1 |
| 6 | Traduzir as strings de UI em inglês (TRAINING CENTRE/LAB, EGOIST SHOP/LOCKER, EURO LEAGUE, Final World Cup U-20, 4 EGO'S, Overall, Skills, "U-20" nas fichas) | Texto | 3 | 1 |
| 7 | Unificar o clube do Kunigami (`data_characters.js:30` x `data_story.js:759`, `:1773`, `:3019`) depois do [VERIFICAR] 24 | Lore | 3 | 1 |
| 8 | Corrigir a lógica do Top 6 (`data_story.js:484`) e o convite do Rin (`:2177`, `:2186`) | Lore | 3 | 1 |
| 9 | Remover/trocar os pôsteres "ISAGI" do hub (`hub3d.js:206`, `:224`) | Lore | 2 | 1 |
| 10 | Limpar dados mortos e incoerentes: Kaiser como rival (`data_story.js:827`, `:842`), Agi no título do Manshine (`:782`), Shidou no PXG no epílogo (`cine3d_final.js:2473`, `cine_final.js:2871`), Sub-20 "levou os dois" (`duo_saga.js:89-91`) | Narrativa | 2 | 1 |
| 11 | Respeitar escolhas: passe/chute no epílogo (`data_story.js:1061`, `:1446`, `cine3d_final.js:3296`) e vitória/derrota no World Five (`:2528`, `:2840`) | Narrativa | 3 | 2 |
| 12 | Glossário único (Sub-20, pega-pega, Ego/ego, valor de mercado, Wild Card/Coringa, New Gen 11/World Class, Bola de Ouro) aplicado em todo o texto | Texto | 3 | 2 |
| 13 | Quebrar tiques: "Hehe" do Fox, Big Bang do Shidou, "monstro" do Bachira; rever as falas fora do tom da 4.7 (Barou dividindo, Kaiser "raposa paga bem", Anri maternal, Sae expositivo) | Texto | 3 | 2 |
| 14 | Diferenciar ou fundir as duas galas da Bola de Ouro (`app.js:3300-3312` x `data_story.js:1431-1435`) | Narrativa | 3 | 2 |
| 15 | Adicionar glifos acentuados na fonte pixel (SAÍDA, VOCÊ, PRÓXIMO, SELEÇÃO, CONVOCAÇÃO) | Texto/Visual | 2 | 2 |
| 16 | Alinhar quem escolhe o Nagi (`data_story.js:2944` x `cine3d_manga.js:63-64`) | Lore | 2 | 1 |
| 17 | Escrever o LORE.md com as respostas dos [VERIFICAR] da seção 3 | Lore | 5 | 3 |
| 18 | Marcar na coleção quais personagens são "originais do jogo" (lista do [VERIFICAR] 28) e quais armas e golpes são invenção | Lore | 3 | 2 |
| 19 | Revisar Blue Lock x Sub-20: autores dos gols (Barou do banco; Shidou no 2º tempo), escalação do Eleven (`data_story.js:645-653`, `cine3d_federacao.js:1020-1031`) | Lore | 4 | 3 |
| 20 | Decidir sobre o Torneio de Trios: manter como "versão do jogo" declarada ou trocar pelo processo canônico (`data_story.js:536-615`) | Lore | 4 | 3 |
| 21 | Reestruturar a Copa Sub-20 conforme o mangá (Grupo A: Nigéria, França, Inglaterra; Fox técnico; oitavas) ou assumir oficialmente como "rota alternativa" e reescrever `:862-1063` + cenas do Fox, Hugo e Quatro Egos | Lore | 5 | 4 |
| 22 | Trocar Chris Prince e Blake da Inglaterra Sub-20 por um elenco canônico (Teddy Knight, Agi…) se a idade não permitir | Lore | 3 | 2 |
| 23 | Falas de NPC do hub variando por época (`hub.js:1507-1518`) | Texto | 2 | 2 |
| 24 | Dar mais falas próprias ao capítulo da Copa Sub-20 (`data_story.js:2702-2704`) e ao Ness | Texto | 2 | 2 |
