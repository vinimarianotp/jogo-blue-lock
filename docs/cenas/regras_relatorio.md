# Teste de regras das cutscenes — linha de base

Gerado por `testes/cenas_regras.js` (`powershell -NoProfile -File testes\rodar.ps1 -teste cenas_regras -saida <pasta>`).
Regras medidas (`CUTSCENE_STYLE.md`): §1.5 boneco ≤ 45% da altura da imagem e nada cortado na borda; §1.6 no máximo 40% do quadro quase preto (luma < 16) e nenhum quadro estourado de branco por mais de 0,15 s; §1.4 fala ≤ 90 caracteres.

**Como mede:** 3 quadros por plano (~15%, 50% e 85%, fora do escurecimento automático do motor no começo e no fim do plano).
- *Imagem* = o palco entre as tarjas. A altura do boneco é a distância na tela entre o pé e a cabeça projetados (pessoa = k ladrilhos, k padrão 0,9), como no `K.screen`. Os bonecos vêm do último quadro desenhado (`CE._c3Last`, com o recuo automático do kit já aplicado).
- *Cortado* = o retângulo do boneco (largura = metade da altura) tem parte dentro e parte fora do palco. Boneco inteiro fora não conta. Não distingue o boneco que entra/sai em movimento (permitido).
- *Escuro* = algum dos 3 quadros com mais de 40% do palco quase preto. *Estourado* = quadro com mais de 30% do palco quase branco que continua estourado 9 quadros (0,15 s) antes ou depois; *clarão* = estourou, mas por menos de 0,15 s (permitido).
- Limitações: um boneco atrás de um quadro de mangá (cut-in) ou de uma parede conta como visível; as poses deitadas/sentadas contam com a altura de uma pessoa em pé. As cenas só 2D não têm medida de boneco.

Nome do jogador no teste: "Teste". 63 cenas, 336 planos, 372 s, erros de console: 0.

## Resumo (nº de planos que furam cada regra)

| Nº | Cena | 3D | Planos | Boneco > 45% | Cortado | Escuro > 40% | Estourado > 0,15 s | Clarão | Falas > 90 |
|---|---|---|---|---|---|---|---|---|---|
| 01 | prologue_tada_miss | sim | 6 | 6 | 5 | 0 | 0 | 0 | 0 |
| 02 | ego_speech | sim | 5 | 5 | 4 | 0 | 0 | 0 | 0 |
| 03 | bluelock_door | sim | 4 | 3 | 3 | 0 | 0 | 0 | 0 |
| 04 | onigokko | sim | 5 | 3 | 3 | 0 | 0 | 0 | 0 |
| 05 | barou_king | sim | 5 | 5 | 3 | 0 | 0 | 0 | 0 |
| 06 | barou_king_win | sim | 5 | 5 | 3 | 0 | 0 | 0 | 0 |
| 07 | ego_victory | sim | 6 | 5 | 1 | 0 | 0 | 0 | 0 |
| 08 | kuon_betrayal | sim | 5 | 5 | 2 | 1 | 0 | 0 | 0 |
| 09 | chigiri_sprint | sim | 5 | 4 | 0 | 0 | 0 | 0 | 0 |
| 10 | rin_rival | sim | 5 | 3 | 0 | 5 | 0 | 0 | 0 |
| 11 | scripted_shot | sim | 5 | 5 | 1 | 0 | 0 | 0 | 0 |
| 12 | chem_reaction | sim | 4 | 3 | 3 | 0 | 0 | 0 | 0 |
| 13 | first_selection_awakening | sim | 5 | 3 | 2 | 0 | 0 | 0 | 0 |
| 14 | bluelock_man_test | sim | 8 | 6 | 2 | 0 | 0 | 0 | 0 |
| 15 | rin_takes_bachira | sim | 6 | 4 | 2 | 0 | 0 | 0 | 0 |
| 16 | rin_takes_bachira_win | sim | 6 | 4 | 2 | 0 | 0 | 0 | 0 |
| 17 | barou_devour | sim | 7 | 5 | 3 | 0 | 0 | 0 | 0 |
| 18 | nagi_reo_split | sim | 5 | 4 | 0 | 0 | 0 | 0 | 0 |
| 19 | world_five_fall | sim | 6 | 5 | 0 | 0 | 0 | 0 | 0 |
| 20 | world_five_win | sim | 6 | 5 | 0 | 0 | 0 | 0 | 0 |
| 21 | bl_eleven | sim | 6 | 6 | 6 | 6 | 0 | 0 | 0 |
| 22 | ego_federation | sim | 6 | 4 | 5 | 5 | 0 | 0 | 0 |
| 23 | shidou_cut | sim | 5 | 4 | 1 | 3 | 0 | 0 | 0 |
| 24 | itoshi_snow | sim | 6 | 6 | 1 | 0 | 0 | 0 | 0 |
| 25 | sae_interview | sim | 5 | 3 | 3 | 2 | 0 | 0 | 0 |
| 26 | u20_direct_shoot | sim | 13 | 12 | 11 | 0 | 0 | 0 | 0 |
| 27 | wildcard_door | sim | 6 | 4 | 0 | 4 | 0 | 0 | 0 |
| 28 | wildcard_hell | sim | 5 | 5 | 1 | 5 | 0 | 0 | 0 |
| 29 | wildcard_verdict | sim | 5 | 4 | 1 | 1 | 0 | 0 | 0 |
| 30 | kunigami_return | sim | 5 | 4 | 0 | 4 | 0 | 0 | 0 |
| 31 | nel_metavision_goal | sim | 5 | 4 | 3 | 0 | 0 | 0 | 0 |
| 32 | rin_challenge | sim | 4 | 4 | 1 | 1 | 0 | 0 | 0 |
| 33 | ego_ticket | sim | 4 | 4 | 2 | 4 | 0 | 0 | 0 |
| 34 | spain_flight | sim | 4 | 2 | 1 | 0 | 0 | 0 | 0 |
| 35 | clasico_bunny | sim | 5 | 4 | 3 | 0 | 0 | 0 | 0 |
| 36 | fox_watch | sim | 3 | 3 | 3 | 2 | 0 | 0 | 0 |
| 37 | captain_speech | sim | 6 | 6 | 4 | 0 | 0 | 0 | 0 |
| 38 | four_egos_intro | sim | 5 | 4 | 3 | 0 | 0 | 0 | 0 |
| 39 | loki_hugo_promise | sim | 4 | 2 | 0 | 0 | 0 | 0 | 0 |
| 40 | hugo_gears | sim | 4 | 4 | 1 | 0 | 0 | 0 | 0 |
| 41 | u20_final_goal | sim | 11 | 8 | 3 | 0 | 0 | 0 | 0 |
| 42 | u20_celebration | sim | 4 | 4 | 2 | 0 | 0 | 0 | 0 |
| 43 | fox_entrance | sim | 5 | 3 | 0 | 4 | 0 | 0 | 0 |
| 44 | fox_training | sim | 5 | 3 | 0 | 4 | 0 | 0 | 0 |
| 45 | monster_awaken | sim | 3 | 2 | 0 | 0 | 0 | 0 | 0 |
| 46 | convocation_call | sim | 5 | 4 | 4 | 3 | 0 | 0 | 0 |
| 47 | wc_opening | sim | 5 | 2 | 2 | 0 | 0 | 0 | 0 |
| 48 | camp_night | sim | 5 | 3 | 1 | 3 | 0 | 0 | 0 |
| 49 | wc_final_goal | sim | 13 | 12 | 5 | 0 | 0 | 0 | 0 |
| 50 | wc_champion | sim | 4 | 4 | 2 | 0 | 0 | 0 | 0 |
| 51 | rin_final_duel | sim | 5 | 4 | 1 | 1 | 0 | 0 | 0 |
| 52 | rin_final_end | sim | 5 | 0 | 0 | 1 | 0 | 0 | 0 |
| 53 | ballon_dor | sim | 5 | 5 | 3 | 0 | 0 | 0 | 0 |
| 54 | bola_de_ouro_discurso | sim | 5 | 4 | 5 | 5 | 0 | 0 | 0 |
| 55 | rin_sae_licao | sim | 7 | 4 | 0 | 3 | 0 | 0 | 0 |
| 56 | epilogue_destinies | sim | 6 | 5 | 1 | 1 | 0 | 0 | 0 |
| 57 | credits | sim | 6 | 5 | 2 | 2 | 0 | 0 | 0 |
| 58 | duo_ponte | sim | 5 | 2 | 3 | 1 | 0 | 0 | 0 |
| 59 | duo_elo | sim | 3 | 3 | 1 | 3 | 0 | 0 | 0 |
| 60 | duo_ressonancia | sim | 4 | 4 | 1 | 0 | 0 | 0 | 0 |
| 61 | duo_regra | sim | 3 | 2 | 1 | 2 | 0 | 0 | 0 |
| 62 | duo_mascaras | sim | 3 | 3 | 0 | 3 | 0 | 0 | 0 |
| 63 | duo_final | sim | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| | **total** | | 336 | 267 | 126 | 79 | 0 | 0 | 0 |

## As 10 piores (pontos = 2 × (boneco > 45% + cortado + escuro) + 3 × estourado + clarão + falas longas)

| Nº | Cena | Pontos | Boneco > 45% | Cortado | Escuro | Estourado | Falas |
|---|---|---|---|---|---|---|---|
| 26 | u20_direct_shoot | 46 | 12/13 | 11/13 | 0/13 | 0 | 0 |
| 21 | bl_eleven | 36 | 6/6 | 6/6 | 6/6 | 0 | 0 |
| 49 | wc_final_goal | 34 | 12/13 | 5/13 | 0/13 | 0 | 0 |
| 22 | ego_federation | 28 | 4/6 | 5/6 | 5/6 | 0 | 0 |
| 54 | bola_de_ouro_discurso | 28 | 4/5 | 5/5 | 5/5 | 0 | 0 |
| 01 | prologue_tada_miss | 22 | 6/6 | 5/6 | 0/6 | 0 | 0 |
| 28 | wildcard_hell | 22 | 5/5 | 1/5 | 5/5 | 0 | 0 |
| 41 | u20_final_goal | 22 | 8/11 | 3/11 | 0/11 | 0 | 0 |
| 46 | convocation_call | 22 | 4/5 | 4/5 | 3/5 | 0 | 0 |
| 33 | ego_ticket | 20 | 4/4 | 2/4 | 4/4 | 0 | 0 |

## Detalhe por plano

P = plano (começa em 0, como nas folhas da auditoria). "Maior" = o boneco mais alto nos 3 quadros (% da altura da imagem). Escuro e branco = o máximo dos 3 quadros.

### 01 prologue_tada_miss (ch0_prologue)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 180 | **shiguma 64%** | **fukaku** | 1% | 0% | – |
| 1 | 170 | **shiguma 67%** | **shiguma** | 7% | 1% | – |
| 2 | 150 | **Teste 57%** | – | 1% | 0% | – |
| 3 | 170 | **fukaku 57%** | **Teste** | 2% | 2% | – |
| 4 | 170 | **Tada (Amigo) 63%** | **Tada** | 2% | 0% | – |
| 5 | 190 | **Jinpachi Ego 70%** | **Jinpachi** | 37% | 2% | – |

### 02 ego_speech (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 180 | **atacante36 75%** | **atacante39, atacante45, atacante46, atacante47, atacante48 +16** | 34% | 0% | – |
| 1 | 200 | **atacante5 119%** | **atacante5** | 16% | 0% | – |
| 2 | 120 | **atacante5 116%** | **atacante5** | 11% | 16% | – |
| 3 | 220 | **atacante56 82%** | **atacante49, atacante55, atacante56, atacante57, atacante58 +4** | 24% | 0% | – |
| 4 | 190 | **Teste 66%** | – | 26% | 0% | – |

### 03 bluelock_door (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 160 | **porta25 72%** | **porta9, porta19, porta25, porta30, porta34 +11** | 33% | 0% | – |
| 1 | 130 | **porta6 72%** | **porta2, porta6, porta17, porta39, porta56 +1** | 30% | 0% | – |
| 2 | 190 | **porta4 66%** | **porta2, porta6, porta3, porta4, Teste** | 32% | 19% | – |
| 3 | 160 | Teste 38% | – | 36% | 2% | – |

### 04 onigokko (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 170 | chigiri 33% | – | 19% | 0% | – |
| 1 | 150 | **Teste 61%** | **bachira, quartoz2** | 9% | 0% | – |
| 2 | 180 | **Teste 71%** | **chigiri, igarashi, quartoz0, Teste** | 10% | 0% | – |
| 3 | 150 | **Teste 65%** | **Teste** | 14% | 0% | – |
| 4 | 220 | Teste 44% | – | 25% | 0% | – |

### 05 barou_king (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 240 | **barou 56%** | **igarashi** | 10% | 0% | – |
| 1 | 300 | **barou 49%** | – | 7% | 1% | – |
| 2 | 290 | **Teste 58%** | **bachira** | 11% | 0% | – |
| 3 | 330 | **Teste 67%** | – | 7% | 0% | – |
| 4 | 330 | **bachira 70%** | **gen_teamx_b, barou, bachira** | 31% | 0% | – |

### 06 barou_king_win (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 240 | **barou 56%** | **igarashi** | 10% | 0% | – |
| 1 | 300 | **barou 49%** | – | 7% | 1% | – |
| 2 | 290 | **Teste 58%** | **bachira** | 11% | 0% | – |
| 3 | 330 | **barou 67%** | – | 10% | 0% | – |
| 4 | 420 | **Teste 53%** | **barou, Teste** | 15% | 0% | – |

### 07 ego_victory (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 240 | okawa 41% | – | 4% | 0% | – |
| 1 | 280 | **Teste 52%** | – | 1% | 0% | – |
| 2 | 230 | **gk_teamy 45%** | – | 13% | 4% | – |
| 3 | 290 | **niko 52%** | – | 3% | 0% | – |
| 4 | 260 | **Teste 67%** | – | 4% | 0% | – |
| 5 | 270 | **Teste 67%** | **Teste** | 10% | 0% | – |

### 08 kuon_betrayal (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 270 | **bachira 66%** | **bachira** | 5% | 0% | – |
| 1 | 260 | **kuon 68%** | – | 5% | 0% | – |
| 2 | 280 | **Teste 69%** | **Teste** | 22% | 0% | – |
| 3 | 340 | **kuon 71%** | – | **48%** | 0% | – |
| 4 | 300 | **Teste 50%** | – | 27% | 0% | – |

### 09 chigiri_sprint (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 220 | chigiri 35% | – | 6% | 0% | – |
| 1 | 330 | **chigiri 60%** | – | 2% | 1% | – |
| 2 | 280 | **chigiri 54%** | – | 5% | 0% | – |
| 3 | 260 | **gk_teamw 53%** | – | 15% | 4% | – |
| 4 | 300 | **chigiri 65%** | – | 6% | 0% | – |

### 10 rin_rival (ch2_first_selection_v)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 200 | Teste 38% | – | **60%** | 0% | – |
| 1 | 190 | **Teste 56%** | – | **53%** | 0% | – |
| 2 | 190 | – | – | **56%** | 0% | – |
| 3 | 220 | **Teste 59%** | – | **84%** | 0% | – |
| 4 | 270 | **Teste 79%** | – | **80%** | 0% | – |

### 11 scripted_shot (ch2_first_selection_v)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 110 | **reo 61%** | – | 5% | 0% | – |
| 1 | 100 | **Teste 63%** | – | 8% | 1% | – |
| 2 | 100 | **Teste 76%** | **reo** | 5% | 1% | – |
| 3 | 110 | **fukaku 64%** | – | 12% | 4% | – |
| 4 | 110 | **Teste 72%** | – | 12% | 0% | – |

### 12 chem_reaction (ch2_first_selection_v)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 110 | **bachira 69%** | – | 4% | 16% | – |
| 1 | 140 | reo 42% | **Teste** | 3% | 0% | – |
| 2 | 100 | **Teste 84%** | **reo** | 8% | 1% | – |
| 3 | 100 | **fukaku 66%** | **reo** | 4% | 0% | – |

### 13 first_selection_awakening (ch2_first_selection_v)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 110 | bachira 39% | **Teste** | 4% | 0% | – |
| 1 | 120 | bachira 28% | **bachira** | 21% | 1% | – |
| 2 | 100 | **Teste 83%** | – | 6% | 1% | – |
| 3 | 90 | **nagi 60%** | – | 8% | 0% | – |
| 4 | 140 | **Teste 68%** | – | 10% | 0% | – |

### 14 bluelock_man_test (ch2b_second_selection)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 180 | Teste 44% | – | 3% | 0% | – |
| 1 | 130 | **ssel_robot 57%** | – | 5% | 0% | – |
| 2 | 190 | **Teste 69%** | **ssel_robot** | 2% | 0% | – |
| 3 | 200 | Teste 29% | – | 0% | 0% | – |
| 4 | 170 | **Teste 71%** | – | 16% | 1% | – |
| 5 | 160 | **Teste 62%** | **ssel_robot** | 3% | 1% | – |
| 6 | 120 | **ssel_robot 52%** | – | 9% | 0% | – |
| 7 | 230 | **Teste 47%** | – | 1% | 0% | – |

### 15 rin_takes_bachira (ch2b_second_selection)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 190 | aryu 37% | – | 5% | 0% | – |
| 1 | 190 | **aryu 54%** | **aryu, rin** | 2% | 0% | – |
| 2 | 220 | **bachira 60%** | – | 2% | 0% | – |
| 3 | 220 | **bachira 78%** | **bachira** | 5% | 6% | – |
| 4 | 230 | Teste 41% | – | 6% | 0% | – |
| 5 | 200 | **Teste 62%** | – | 6% | 0% | – |

### 16 rin_takes_bachira_win (ch2b_second_selection)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 190 | aryu 37% | – | 5% | 0% | – |
| 1 | 190 | **aryu 54%** | **aryu, rin** | 2% | 0% | – |
| 2 | 220 | **bachira 59%** | – | 2% | 0% | – |
| 3 | 220 | **bachira 77%** | **bachira** | 4% | 6% | – |
| 4 | 230 | Teste 41% | – | 6% | 0% | – |
| 5 | 200 | **Teste 62%** | – | 6% | 0% | – |

### 17 barou_devour (ch3_second_selection_world5)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 200 | **barou 47%** | – | 4% | 0% | – |
| 1 | 210 | aryu 24% | **tokimitsu** | 2% | 0% | – |
| 2 | 220 | **Teste 63%** | **bachira** | 6% | 8% | – |
| 3 | 140 | rin 36% | – | 9% | 0% | – |
| 4 | 230 | **barou 75%** | – | 20% | 0% | – |
| 5 | 170 | **Teste 62%** | – | 6% | 0% | – |
| 6 | 230 | **barou 75%** | **barou** | 9% | 2% | – |

### 18 nagi_reo_split (ch3_second_selection_world5)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 200 | reo 44% | – | 5% | 0% | – |
| 1 | 240 | **reo 72%** | – | 7% | 3% | – |
| 2 | 240 | **Teste 68%** | – | 3% | 0% | – |
| 3 | 240 | **reo 73%** | – | 11% | 0% | – |
| 4 | 260 | **reo 51%** | – | 18% | 1% | – |

### 19 world_five_fall (ch3_second_selection_world5)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 170 | **rin 67%** | – | 3% | 0% | – |
| 1 | 120 | luna 30% | – | 6% | 0% | – |
| 2 | 250 | **Teste 46%** | – | 4% | 0% | – |
| 3 | 300 | **aryu 57%** | – | 30% | 0% | – |
| 4 | 240 | **Teste 66%** | – | 6% | 0% | – |
| 5 | 240 | **rin 47%** | – | 3% | 1% | – |

### 20 world_five_win (ch3_second_selection_world5)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 170 | **rin 67%** | – | 3% | 0% | – |
| 1 | 120 | luna 30% | – | 6% | 0% | – |
| 2 | 250 | **Teste 46%** | – | 4% | 0% | – |
| 3 | 300 | **Teste 65%** | – | 30% | 0% | – |
| 4 | 240 | **Teste 65%** | – | 5% | 0% | – |
| 5 | 240 | **rin 48%** | – | 4% | 1% | – |

### 21 bl_eleven (ch4_third_selection)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 230 | **rin 50%** | **aryu, niko, Teste, bachira, chigiri +5** | **51%** | 0% | – |
| 1 | 310 | **bachira 70%** | **otoya, bachira, rin** | **83%** | 0% | – |
| 2 | 300 | **rin 46%** | **otoya, yukimiya, nagi, rin** | **46%** | 0% | – |
| 3 | 260 | **aryu 79%** | **aryu, niko, karasu** | **76%** | 5% | – |
| 4 | 270 | **karasu 76%** | **karasu, shidou, otoya** | **69%** | 0% | – |
| 5 | 280 | **otoya 60%** | **otoya, yukimiya, nagi, rin, gagamaru +2** | **98%** | 0% | – |

### 22 ego_federation (ch4_third_selection)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 230 | **Jinpachi Ego 69%** | **Jinpachi** | 36% | 0% | – |
| 1 | 280 | **fedx_old4 54%** | **fedx_old4** | **78%** | 1% | – |
| 2 | 300 | Jinpachi Ego 39% | **fedx_old2** | **86%** | 1% | – |
| 3 | 330 | **Jinpachi Ego 50%** | **fedx_old3** | **74%** | 1% | – |
| 4 | 230 | **fedx_old4 55%** | **fedx_old4** | **58%** | 3% | – |
| 5 | 300 | Anri Teieri 44% | – | **59%** | 1% | – |

### 23 shidou_cut (ch4b_trio_tournament)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 270 | **shidou 57%** | – | **83%** | 0% | – |
| 1 | 280 | **shidou 54%** | – | **64%** | 0% | – |
| 2 | 340 | **sae 52%** | **fedx_old4** | **56%** | 3% | – |
| 3 | 320 | **shidou 50%** | – | 15% | 3% | – |
| 4 | 300 | rin 45% | – | 10% | 1% | – |

### 24 itoshi_snow (ch4b_trio_tournament)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 300 | **rin 53%** | – | 0% | 1% | – |
| 1 | 320 | **rin 60%** | – | 3% | 0% | – |
| 2 | 240 | **sae 85%** | **sae** | 11% | 0% | – |
| 3 | 220 | **sae 63%** | – | 4% | 0% | – |
| 4 | 340 | **rin 61%** | – | 7% | 0% | – |
| 5 | 300 | **rin 68%** | – | 8% | 2% | – |

### 25 sae_interview (ch5_u20_japan)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 190 | **reporter24 63%** | **reporter21, reporter1, reporter3, reporter4, reporter5 +13** | 21% | 0% | – |
| 1 | 180 | **reporter6 93%** | **reporter6, reporter15, reporter14** | 31% | 0% | – |
| 2 | 180 | **reporter14 80%** | **reporter2, reporter3, reporter4, reporter5, reporter6 +10** | **63%** | 0% | – |
| 3 | 170 | – | – | 31% | 0% | – |
| 4 | 230 | – | – | **72%** | 1% | – |

### 26 u20_direct_shoot (ch5_u20_japan)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 170 | rin 36% | **bachira** | 1% | 0% | – |
| 1 | 150 | **aiku 111%** | **rin, aiku** | 2% | 0% | – |
| 2 | 170 | **rin 61%** | **sae, rin** | 3% | 4% | – |
| 3 | 140 | **sae 50%** | – | 2% | 0% | – |
| 4 | 150 | **rin 66%** | **sae, rin** | 4% | 0% | – |
| 5 | 170 | **aiku 45%** | **aiku** | 0% | 0% | – |
| 6 | 130 | **rin 199%** | **rin, Teste** | 16% | 0% | – |
| 7 | 160 | **sae 116%** | **Teste, sae** | 2% | 0% | – |
| 8 | 140 | **Teste 114%** | **Teste** | 4% | 1% | – |
| 9 | 120 | **fukaku 169%** | **fukaku** | 1% | 1% | – |
| 10 | 140 | **fukaku 76%** | – | 6% | 5% | – |
| 11 | 170 | **Teste 65%** | **Teste** | 3% | 2% | – |
| 12 | 140 | **sae 75%** | **rin, sae** | 3% | 0% | – |

### 27 wildcard_door (ch5b_wild_card)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 300 | **kunigami 59%** | – | **46%** | 0% | – |
| 1 | 230 | **kunigami 53%** | – | **43%** | 2% | – |
| 2 | 290 | kunigami 44% | – | 34% | 0% | – |
| 3 | 270 | **kunigami 53%** | – | 25% | 0% | – |
| 4 | 250 | **kunigami 66%** | – | **59%** | 1% | – |
| 5 | 250 | kunigami 25% | – | **86%** | 2% | – |

### 28 wildcard_hell (ch5b_wild_card)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 300 | **kunigami 48%** | **kunigami** | **76%** | 0% | – |
| 1 | 300 | **kunigami 48%** | – | **62%** | 0% | – |
| 2 | 380 | **kunigami 56%** | – | **71%** | 0% | – |
| 3 | 320 | **kunigami 57%** | – | **71%** | 0% | – |
| 4 | 380 | **kunigami 57%** | – | **65%** | 0% | – |

### 29 wildcard_verdict (ch5b_wild_card)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 300 | kunigami 41% | – | 27% | 0% | – |
| 1 | 320 | **kunigami 54%** | – | 15% | 0% | – |
| 2 | 330 | **kunigami 59%** | – | 24% | 1% | – |
| 3 | 300 | **kunigami 52%** | **kunigami** | 27% | 0% | – |
| 4 | 370 | **kunigami 56%** | – | **44%** | 0% | – |

### 30 kunigami_return (ch6_nel_barcha_manshine)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 320 | Teste 35% | – | **56%** | 0% | – |
| 1 | 330 | **Teste 52%** | – | **46%** | 1% | – |
| 2 | 320 | **kunigami 53%** | – | **41%** | 1% | – |
| 3 | 320 | **kunigami 54%** | – | 35% | 0% | – |
| 4 | 340 | **kunigami 46%** | – | **52%** | 1% | – |

### 31 nel_metavision_goal (ch6_nel_barcha_manshine)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 110 | Jogador m1 24% | **Jogador** | 4% | 0% | – |
| 1 | 110 | **lorenzo 85%** | **lorenzo** | 21% | 9% | – |
| 2 | 90 | **kaiser 59%** | – | 15% | 1% | – |
| 3 | 100 | **kaiser 58%** | – | 16% | 0% | – |
| 4 | 160 | **fukaku 64%** | **hiori, kaiser** | 14% | 0% | – |

### 32 rin_challenge (ch7_nel_ubers_pxg)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 190 | **Teste 49%** | – | **42%** | 0% | – |
| 1 | 180 | **rin 103%** | **rin** | 31% | 1% | – |
| 2 | 180 | **rin 58%** | – | 8% | 0% | – |
| 3 | 200 | **Teste 58%** | – | 20% | 0% | – |

### 33 ego_ticket (ch8_u20_england)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 170 | **Teste 56%** | **Teste** | **53%** | 0% | – |
| 1 | 150 | **Jinpachi Ego 72%** | – | **68%** | 1% | – |
| 2 | 210 | **Jinpachi Ego 96%** | **Jinpachi** | **61%** | 5% | – |
| 3 | 150 | **Teste 60%** | – | **56%** | 0% | – |

### 34 spain_flight (ch8_u20_england)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 170 | Teste 27% | – | 20% | 0% | – |
| 1 | 130 | – | – | 2% | 2% | – |
| 2 | 200 | **Teste 69%** | – | 2% | 1% | – |
| 3 | 210 | **Teste 59%** | **Teste** | 0% | 1% | – |

### 35 clasico_bunny (ch8_u20_england)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 170 | cla7 35% | **barcha1, real1** | 28% | 0% | – |
| 1 | 200 | **sae 68%** | **barcha0** | 2% | 0% | – |
| 2 | 190 | **bunny 64%** | – | 5% | 0% | – |
| 3 | 190 | **realgk0 111%** | **realgk0, barcha0** | 3% | 0% | – |
| 4 | 130 | **sae 59%** | – | 4% | 0% | – |

### 36 fox_watch (ch8_u20_england)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 200 | **Fox 46%** | **torcedor2_10, torcedor3_11, torcedor0_11, torcedor1_12, torcedor1_9 +1** | **58%** | 0% | – |
| 1 | 220 | **torcedor3_6 99%** | **torcedor0_3, torcedor1_9, torcedor2_6, torcedor2_8, torcedor2_9 +2** | 37% | 0% | – |
| 2 | 180 | **Fox 49%** | **torcedor2_4, torcedor3_3, torcedor3_10, torcedor4_3, torcedor4_4 +17** | **58%** | 0% | – |

### 37 captain_speech (ch8_u20_england)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 170 | **bachira 60%** | **bachira, rin** | 40% | 0% | – |
| 1 | 120 | **Teste 66%** | **rin** | 27% | 0% | – |
| 2 | 200 | **Teste 60%** | – | 25% | 0% | – |
| 3 | 150 | **Teste 65%** | **rin, Teste** | 26% | 0% | – |
| 4 | 110 | **Teste 81%** | **chigiri** | 31% | 0% | – |
| 5 | 160 | **chigiri 47%** | – | 24% | 0% | – |

### 38 four_egos_intro (ch9_world_cup_final)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 170 | bachira 32% | **bachira, frances5, frances6** | 1% | 0% | – |
| 1 | 270 | **sae 48%** | – | 1% | 0% | – |
| 2 | 130 | **sae 53%** | **hugo** | 39% | 3% | – |
| 3 | 300 | **Teste 56%** | **sae** | 1% | 0% | – |
| 4 | 180 | **sae 46%** | – | 3% | 0% | – |

### 39 loki_hugo_promise (ch9_world_cup_final)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 80 | **loki 64%** | – | 2% | 0% | – |
| 1 | 160 | loki 45% | – | 1% | 0% | – |
| 2 | 170 | hugo 39% | – | 1% | 0% | – |
| 3 | 150 | **hugo 58%** | – | 3% | 0% | – |

### 40 hugo_gears (ch9_world_cup_final)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 190 | **hugo 57%** | – | 1% | 0% | – |
| 1 | 100 | **Teste 64%** | – | 4% | 0% | – |
| 2 | 250 | **hugo 55%** | – | 5% | 5% | – |
| 3 | 170 | **hugo 67%** | **loki** | 3% | 2% | – |

### 41 u20_final_goal (ch9_world_cup_final)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 170 | Teste 30% | – | 2% | 0% | – |
| 1 | 150 | **loki 46%** | – | 3% | 0% | – |
| 2 | 140 | **loki 54%** | **loki** | 2% | 0% | – |
| 3 | 130 | **loki 60%** | – | 4% | 0% | – |
| 4 | 150 | rin 37% | – | 6% | 0% | – |
| 5 | 140 | rin 38% | **rin, loki** | 1% | 0% | – |
| 6 | 150 | **Teste 58%** | – | 4% | 1% | – |
| 7 | 110 | **gk_france 69%** | – | 6% | 0% | – |
| 8 | 130 | **gk_france 64%** | – | 5% | 5% | – |
| 9 | 170 | **Teste 74%** | **Teste** | 4% | 2% | – |
| 10 | 140 | **rin 61%** | – | 4% | 0% | – |

### 42 u20_celebration (ch9_world_cup_final)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 150 | **charles 51%** | – | 3% | 0% | – |
| 1 | 170 | **shidou 49%** | **shidou, sae** | 1% | 0% | – |
| 2 | 180 | **rin 51%** | **sae, rin, shidou, gagamaru, bachira +1** | 2% | 0% | – |
| 3 | 210 | **Teste 53%** | – | 6% | 1% | – |

### 43 fox_entrance (ch10_fox_training)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 180 | Teste 43% | – | 16% | 0% | – |
| 1 | 170 | **Teste 45%** | – | **68%** | 0% | – |
| 2 | 190 | Fox 40% | – | **88%** | 0% | – |
| 3 | 200 | **Fox 64%** | – | **56%** | 0% | – |
| 4 | 170 | **Fox 56%** | – | **53%** | 0% | – |

### 44 fox_training (ch10_fox_training)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 180 | Teste 36% | – | **44%** | 0% | – |
| 1 | 170 | **Teste 64%** | – | **43%** | 1% | – |
| 2 | 190 | **Teste 59%** | – | **58%** | 0% | – |
| 3 | 170 | Teste 21% | – | 18% | 0% | – |
| 4 | 150 | **Teste 50%** | – | **82%** | 5% | – |

### 45 monster_awaken (ch10_fox_training)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 80 | **Teste 52%** | – | 11% | 0% | – |
| 1 | 95 | **Teste 51%** | – | 22% | 0% | – |
| 2 | 125 | Teste 43% | – | 20% | 0% | – |

### 46 convocation_call (ch12b_wc_camp)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 170 | **Teste 54%** | **Teste** | **54%** | 0% | – |
| 1 | 210 | **Jinpachi Ego 47%** | **Jinpachi** | 33% | 0% | – |
| 2 | 150 | **Jinpachi Ego 68%** | **Jinpachi** | 5% | 0% | – |
| 3 | 170 | Teste 43% | – | **53%** | 2% | – |
| 4 | 180 | **Teste 55%** | **Teste** | **51%** | 1% | – |

### 47 wc_opening (ch13_world_cup)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 190 | abertura3 19% | – | 1% | 2% | – |
| 1 | 200 | – | – | 8% | 0% | – |
| 2 | 180 | gen_nigeria_fw 39% | – | 1% | 0% | – |
| 3 | 200 | **Teste 62%** | **Teste** | 12% | 1% | – |
| 4 | 190 | **Teste 71%** | **Teste** | 1% | 0% | – |

### 48 camp_night (ch13_world_cup)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 170 | – | – | **48%** | 0% | – |
| 1 | 190 | **rin 52%** | – | **43%** | 0% | – |
| 2 | 170 | sae 34% | – | **48%** | 0% | – |
| 3 | 150 | **Teste 59%** | **Teste** | 33% | 0% | – |
| 4 | 200 | **shidou 45%** | – | 33% | 0% | – |

### 49 wc_final_goal (ch13_world_cup)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 180 | **loki 53%** | **loki** | 2% | 0% | – |
| 1 | 150 | **sae 67%** | – | 3% | 0% | – |
| 2 | 160 | **rin 52%** | – | 3% | 0% | – |
| 3 | 150 | **charles 63%** | – | 4% | 11% | – |
| 4 | 120 | shidou 30% | – | 2% | 0% | – |
| 5 | 120 | **Teste 55%** | – | 0% | 0% | – |
| 6 | 120 | **Teste 53%** | – | 3% | 0% | – |
| 7 | 140 | **loki 60%** | **loki** | 0% | 0% | – |
| 8 | 150 | **Teste 81%** | **gk_france** | 4% | 1% | – |
| 9 | 100 | **gk_france 173%** | **gk_france** | 4% | 1% | – |
| 10 | 140 | **gk_france 68%** | – | 7% | 5% | – |
| 11 | 180 | **Teste 61%** | **Teste, shidou** | 3% | 0% | – |
| 12 | 240 | **rin 61%** | – | 1% | 0% | – |

### 50 wc_champion (ch13_world_cup)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 150 | **Teste 49%** | **sae** | 3% | 0% | – |
| 1 | 170 | **Teste 52%** | – | 1% | 0% | – |
| 2 | 200 | **loki 61%** | – | 2% | 0% | – |
| 3 | 210 | **Teste 56%** | **sae, shidou, bachira, chigiri, kunigami +1** | 3% | 3% | – |

### 51 rin_final_duel (ch14_rin_final)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 190 | Teste 38% | – | 15% | 0% | – |
| 1 | 180 | **Teste 57%** | – | 30% | 1% | – |
| 2 | 170 | **Teste 56%** | **Teste** | 21% | 0% | – |
| 3 | 220 | **rin 57%** | – | 35% | 1% | – |
| 4 | 190 | **Teste 66%** | – | **100%** | 0% | – |

### 52 rin_final_end (ch14_rin_final)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 180 | – | – | 0% | 0% | – |
| 1 | 170 | – | – | **66%** | 0% | – |
| 2 | 210 | – | – | 1% | 0% | – |
| 3 | 160 | – | – | 20% | 0% | – |
| 4 | 210 | – | – | 12% | 0% | – |

### 53 ballon_dor (ch14_rin_final)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 180 | **fig21_29 80%** | **fig21_0, fig21_15, fig21_20, fig21_32, fig21_6 +10** | 28% | 0% | – |
| 1 | 190 | **Teste 57%** | **fig31_1, fig21_21, fig21_25, fig21_10, fig21_29** | 6% | 0% | – |
| 2 | 180 | **Apresentadora 62%** | – | 32% | 3% | – |
| 3 | 210 | **Teste 51%** | – | 14% | 0% | – |
| 4 | 200 | **noa 60%** | **fig21_6, fig21_21, fig21_22, fig21_30, fig21_17 +1** | 28% | 0% | – |

### 54 bola_de_ouro_discurso (ch14_rin_final)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 300 | fig23_26 43% | **fig23_12, fig23_16, fig23_19, fig23_20, fig23_21 +8** | **100%** | 0% | – |
| 1 | 360 | **fig25_3 59%** | **fig25_3** | **63%** | 1% | – |
| 2 | 330 | **Teste 69%** | **Teste** | **83%** | 17% | – |
| 3 | 380 | **fig27_17 78%** | **fig27_3, fig27_7, fig27_16, fig27_32, fig27_37** | **79%** | 0% | – |
| 4 | 300 | **fig29_3 112%** | **fig29_3, fig29_1, fig29_2, fig29_4, fig29_6 +7** | **72%** | 1% | – |

### 55 rin_sae_licao (ch14_rin_final)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 300 | rin 36% | – | **77%** | 0% | – |
| 1 | 360 | rin 41% | – | **76%** | 0% | – |
| 2 | 330 | **rin 54%** | – | 28% | 0% | – |
| 3 | 360 | **sae 50%** | – | 24% | 1% | – |
| 4 | 420 | rin 40% | – | 21% | 0% | – |
| 5 | 360 | **sae 47%** | – | 31% | 0% | – |
| 6 | 380 | **rin 58%** | – | **53%** | 2% | – |

### 56 epilogue_destinies (ch14_rin_final)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 220 | **rin 56%** | – | 1% | 0% | – |
| 1 | 220 | **chigiri 53%** | – | **75%** | 0% | – |
| 2 | 220 | **sae 61%** | – | 36% | 0% | – |
| 3 | 210 | **Jinpachi Ego 60%** | **Jinpachi** | 20% | 0% | – |
| 4 | 200 | **Fox 57%** | – | 3% | 0% | – |
| 5 | 210 | Teste 37% | – | 0% | 0% | – |

### 57 credits (ch14_rin_final)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 300 | Tada (Amigo) 32% | – | 14% | 0% | – |
| 1 | 360 | **Teste 51%** | – | 35% | 0% | – |
| 2 | 360 | **rin 68%** | **rin** | **43%** | 2% | – |
| 3 | 540 | **charles 63%** | **nishioka, niou, gesner, birkenstock, ali +10** | 37% | 0% | – |
| 4 | 360 | **Anri Teieri 55%** | – | **48%** | 0% | – |
| 5 | 480 | **Teste 63%** | – | 7% | 1% | – |

### 58 duo_ponte (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 175 | duo_b 29% | **duo_a, duo_b** | 28% | 0% | – |
| 1 | 130 | **duo_b 64%** | **duo_fig31_2, duo_fig31_19** | 13% | 3% | – |
| 2 | 165 | **duo_b 62%** | **duo_fig31_0, duo_fig31_19, duo_fig31_18** | 20% | 1% | – |
| 3 | 160 | duo_a 41% | – | **45%** | 1% | – |
| 4 | 200 | duo_a 36% | – | 37% | 27% | – |

### 59 duo_elo (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 150 | **duo_a 50%** | **duo_a, duo_b, Anri** | **51%** | 0% | – |
| 1 | 150 | **duo_a 66%** | – | **69%** | 1% | – |
| 2 | 140 | **duo_b 58%** | – | **48%** | 0% | – |

### 60 duo_ressonancia (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 110 | **duo_b 57%** | – | 11% | 0% | – |
| 1 | 110 | **duo_a 65%** | **elo_gen_b** | 5% | 0% | – |
| 2 | 90 | **duo_a 80%** | – | 9% | 1% | – |
| 3 | 120 | **elo_gk_final 68%** | – | 15% | 0% | – |

### 61 duo_regra (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 150 | **duo_a 96%** | **duo_fig17_36, duo_fig17_37, duo_fig17_38, duo_fig17_39, duo_fig17_8 +2** | **44%** | 0% | – |
| 1 | 110 | – | – | 35% | 0% | – |
| 2 | 160 | **duo_a 66%** | – | **45%** | 1% | – |

### 62 duo_mascaras (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 150 | **duo_b 51%** | – | **69%** | 0% | – |
| 1 | 110 | **elo_mask_2 70%** | – | **77%** | 1% | – |
| 2 | 160 | **elo_haru 57%** | – | **61%** | 0% | – |

### 63 duo_final (ch1_first_selection_x_y)

| P | Dur. | Maior | Cortados | Escuro | Branco | Falas > 90 |
|---|---|---|---|---|---|---|
| 0 | 110 | **duo_a 65%** | – | 3% | 0% | – |
| 1 | 100 | **duo_a 58%** | – | 3% | 0% | – |
| 2 | 90 | **duo_a 80%** | – | 5% | 1% | – |
| 3 | 210 | **elo_gk_final 68%** | – | 19% | 1% | – |
