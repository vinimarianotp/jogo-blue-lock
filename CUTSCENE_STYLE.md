# CUTSCENE_STYLE.md — regras e repertório das cutscenes

Este arquivo manda em toda cutscene nova ou refeita. Quem for mexer numa cena lê antes.

- Ele substitui o `docs/DIRECAO_DE_ARTE.md`: o que valia lá está aqui.
- O visual das telas (cores, fontes, botões) está no `STYLE_GUIDE.md`.
- A lista do que falta fazer está no `BACKLOG.md`.

**A régua:** as três cenas de referência do dono são a porta do Coringa (27, `wildcard_door`), o Blue Lock Eleven (21, `bl_eleven`) e a neve em Kamakura (24, `itoshi_snow`).
- Elas definem só o **nível de acabamento**.
- É proibido copiar a composição, a ordem dos efeitos ou o ritmo delas (§7).

---

## 1. O que é fixo (vale para todas as cenas)

### 1.1 Técnica
- **Tudo em pixel art.** A cena usa o cenário 3D do jogo, com os bonecos 2D em **planos abertos e médios**.
- **Closes são quadros de mangá (cut-ins)** desenhados em baixa resolução e ampliados sem suavizar (`CA.panel(..., { pixel: 6 })`). Exemplos: chuteira, bola, mão, objeto.
- Nunca usar o boneco de 72 px ampliado nem ilustração lisa (vetorial) à mostra.
- A bola é a bola em pixel art de 20 px, com 8 giros.
- **Toda cena nova ou refeita nasce do roteiro de dados** (§8): uma lista de planos, não código solto.

### 1.2 Paleta
- **Base:** os tokens do `STYLE_GUIDE.md`.
- **Noite de estádio:**
  - céu azul-marinho (`#0b1636` → `#1e3a8a`);
  - refletores brancos frios;
  - gramado verde vivo.
- **Cor de cada personagem** (no nome da legenda, nas linhas e na luz de destaque):

  | Personagem | Cor |
  |---|---|
  | Você | ciano `#00f5d4` |
  | Rin | verde-água `#2dd4bf` |
  | Sae | rosa `#fb7185` |
  | Aiku | âmbar `#f59e0b` |
  | Ego | ciano frio `#22d3ee` |
  | Bachira | amarelo `#facc15` |
  | Kunigami | laranja `#fb923c` |
  | Narrador | cinza `#94a3b8` |

  Personagem novo ganha uma cor própria aqui, antes de entrar em cena.
- **Tempo parado:** preto e branco com tom azulado. A cor volta no golpe.

### 1.3 Fontes
| Uso | Fonte |
|---|---|
| Legenda e falas | **Inter** 700. O nome de quem fala vai em **Jersey 10**, na cor do personagem. |
| Onomatopeia, placar, cartela final | **Jersey 10**, sempre em CAIXA ALTA e curta. Sem itálico falso. |
| Letreiro de lugar e hora | Inter 600, pequeno, com espaçamento entre as letras |

### 1.4 Legibilidade
- **A legenda fica na tarja de baixo.** Nunca há texto pequeno em cima de imagem poluída.
- **Tamanho mínimo:** 20 px numa tela de 1280 de largura. O motor reduz até 16 px e nada abaixo disso.
- **Fala:** no máximo 90 caracteres. O ideal é uma fala por plano.
- **Tempo de leitura:** é automático (cerca de 17 letras/s, mais meio segundo). O jogador escolhe a velocidade no ☰ MENU.
- **Na imagem só entram:**
  - o placar;
  - um letreiro discreto de lugar ou hora;
  - **uma** onomatopeia no golpe principal;
  - **uma** cartela no último plano, depois da ação.
- **A tarja de cima não dá spoiler.** Ela mostra só o título da cena e os pontinhos dos planos, nunca "PLANO 3 • O GOL".

### 1.5 Enquadramento
- **Boneco:** no máximo **45% da altura** da imagem. Mais perto que isso, corta para um cut-in.
- **Nada cortado na borda,** exceto um boneco entrando ou saindo do quadro em movimento.
- **A câmera nunca fica colada nas costas de um boneco,** porque ele vira uma mancha.
- **Câmera sempre se mexendo um pouco:** grua, travelling ou aproximação lenta. Tremida só no impacto.
- **Regra dos 180°:** numa sequência de ação, a direção de tela não inverte sem um plano de transição.
- **Vista de cima:** no máximo cerca de 55° de inclinação. Reto de cima, os bonecos-placa somem.
- **A câmera nunca entra** em parede, arquibancada ou boneco.

### 1.6 Exposição (piso de luz)
- **Escuro:** no máximo 40% do quadro quase preto (brilho < 16 de 255). O escuro dramático vem de contraluz e vinheta, não de apagar a cena.
- **Branco:** nenhum quadro estourado de branco por mais de 0,15 s. Clarão: no máximo 0,15 s.
- **Sujeito visível:** o sujeito do plano sempre se destaca do fundo, por luz, cor ou silhueta.

### 1.7 Duração e ritmo
| O quê | Duração |
|---|---|
| Cena de história | 12 a 30 s, com 4 a 7 planos |
| Cena que interrompe a partida (gol roteirizado, Fluxo, Ataque de Dupla) | 5 a 10 s, porque toca muitas vezes |
| Plano | 3 a 5 s, com **um avanço claro** e uma fala |

- **Câmera lenta:** só em 1 ou 2 momentos-chave, com rampa de entrada e de saída.
- **Corte padrão: seco.** O fade é só para passagem de tempo.

### 1.8 Impacto
- **Quadro de impacto:** 1 a 2 quadros em preto e branco invertido, só no golpe principal.
- **Pausa no impacto (hit-stop):** 3 a 6 quadros congelados no contato.
- **Tremida por trauma:** o trauma vai de 0 a 1 e cai com o tempo. A tremida usa trauma² com ruído suave, nunca sorteado por quadro.
- **Linhas de velocidade** seguem o caminho do movimento: radiais no impacto, paralelas na corrida.
- **Um pico por cena.** "Pico" é qualquer um destes:
  - quadro de impacto;
  - inversão de cor;
  - clarão;
  - preto e branco total;
  - onomatopeia gigante;
  - tremida forte.

  A cena escolhe **um**, e os outros, se aparecerem, são leves.

---

## 2. O que é livre (e precisa variar)

Cada cena escolhe o seu **enquadramento**, o seu **ritmo**, a sua **estrutura** e o seu **efeito-assinatura**.
- O **efeito-assinatura** é a ideia visual que só aquela cena tem e que atravessa a cena inteira. Exemplos: a cor fria que vira laranja na porta (27), a neve e o verão que se cruzam (24), o jornal molhado (32).
- **Nenhuma assinatura se repete.** Antes de implementar, ela entra no registro (§6). Se já estiver lá, troque.

---

## 3. Repertório de linguagem de mangá

Cada recurso tem um uso certo. Uma cena usa poucos: um é a assinatura, os outros apoiam.

| # | Recurso | Quando usar | No motor (§8) |
|---|---|---|---|
| 1 | **Tela dividida** em 2 ou 3 quadros | confronto, simultaneidade, dois lados de uma escolha | `quadros` com layout `2`, `3` ou `diagonal` |
| 2 | **Fundo preto com frase única** | uma virada interna, a frase que fica | plano `narracao` |
| 3 | **Câmera lenta antes do chute** | os 1–2 s de tensão antes do golpe decisivo | efeito `lento` (com rampa) |
| 4 | **Corte seco no impacto** | o contato: corta no golpe, sem fade | `corte: 'seco'` no quadro do contato |
| 5 | **Linhas de velocidade convergentes** | arrancada, foco no alvo (apontam para ele) | efeito `linhas` (`radial` ou `paralelas`) |
| 6 | **Silhueta contra a luz** | revelação, presença que ameaça, o herói de costas | ator com `contraluz` |
| 7 | **Painel que quebra** | ruptura: eliminação, promessa quebrada, derrota | `corte: 'vidro'` |
| 8 | **Onomatopeia gigante** | o golpe principal (uma por cena) | `onomatopeias` |
| 9 | **Preto e branco total (1-bit)** | o instante em que o mundo para | efeito `pb` |
| 10 | **Aproximação lenta e contínua** | decisão iminente, a pressão crescendo | `cam` de → para, curva lenta |
| 11 | **Retícula de fundo** | memória, interioridade, flashback | `fundo: { reticula }` |
| 12 | **Frase repetida em escala crescente** | obsessão, o ego crescendo | `onomatopeias` em sequência, maiores |
| 13 | **Tela que pulsa com o coração** | medo, pressão, tempo acabando | efeito `pulso` |
| 14 | **Inversão de cor no "devorar"** | o instante em que um devora o outro | efeito `inverter` (é o pico) |
| 15 | **Cor que vira (paleta fria → quente)** | uma escolha ou um despertar, **sem aura** | efeito `cor` (de, para) |
| 16 | **Apagão com olhos no escuro** | ameaça, alguém que observa (no máximo 1 por arco; olhos pequenos, na altura certa) | `fundo` escuro + ator `olhos` |
| 17 | **Sombra gigante projetada** | domínio, o mentor maior que o jogador | ator com `sombra: 'gigante'` |
| 18 | **Objeto-símbolo em cut-in** | memória concreta (mala, jornal, foto, pulseira) | `quadros` com um desenho de objeto |
| 19 | **Grua ou plano-sequência** | mostrar o tamanho do lugar, a solidão | `cam` longa num plano só |
| 20 | **Clima como motivo** (chuva, neve, vento) | estado emocional que dura a cena toda | `clima` no cenário |
| 21 | **Relógio ou contador no cenário** | pressão de tempo sem legenda | peça no cenário + `letreiros` |
| 22 | **Vista do alto com linhas de leitura** | ler o jogo (metavisão, passe que ninguém viu) | `cam` alta + efeito `linhas: 'leitura'` |
| 23 | **Lembrança dentro do lance** | ligar o golpe a uma promessa antiga | plano curto com `fundo: { reticula }`, entre dois planos de ação |
| 24 | **Diagonal com duas paletas** | passado × presente, eu × ele | `quadros` com layout `diagonal` e duas cores |

**Trocas por causa da decisão do dono (K1):**
- "Close extremo no olho" virou o recurso 16 (apagão com olhos no escuro) e o 6 (silhueta).
- "Aura ou olho brilhando no despertar" virou o recurso 15 (cor que vira).

Aura, cut-in de olho e close de rosto continuam **proibidos**.

---

## 4. Proibido

- **Aura** em volta ou por cima dos bonecos, **cut-in de olho** e **close de rosto** (boneco pixelado ampliado).
- Números ou letreiros flutuando sobre o rosto ou o corpo.
- **Legenda grande explicando a imagem** ("O SAE CONDUZ!"). Narrador descrevendo o que já se vê.
- Boneco gigante, cortado ou borrado na frente da câmera. Câmera colada nas costas de alguém.
- **Fade genérico em toda transição.**
- **Texto pequeno em cima de fundo poluído.**
- **Mais de um efeito de pico na mesma cena** (§1.8).
- **Personagem parado falando muito tempo sem mudar o enquadramento.** Mais de 4 s no mesmo quadro parado exige um avanço (câmera, gesto ou corte).
- **Momento-chave fora da tela**, contado pelo narrador: o gol, a virada, o roubo de bola aparecem.
- **Vitória e derrota com a mesma imagem.** A versão "venceu" tem planos próprios.
- **Lugar errado:** a cena acontece no lugar de que a fala fala. Hotel é hotel, Paris é Paris.
- **Copiar o "molde do gol"** (P&B azulado → cut-in de bola e chuteira → "DOM!!" → câmera atrás da rede → "GOOOL!!" → cartela). Cada gol tem a sua leitura.
- Prints ou quadros do anime dentro do jogo (só servem de referência).
- Invenção de lore. Em caso de dúvida, marque [VERIFICAR] e pergunte ao dono.

---

## 5. Checklist de pronto (por cena)

- [ ] Brief escrito (o que acontece, emoção, instante de pico) e conceito escolhido pelo dono.
- [ ] Efeito-assinatura no registro (§6), sem repetir outra cena.
- [ ] Feita pelo roteiro de dados (§8).
- [ ] Print de cada plano conferido. Duas rodadas de crítica e correção, no mínimo.
- [ ] O teste de regras (`testes/cenas_regras`) passa: enquadramento, exposição, um pico, tamanho da fala.
- [ ] O teste de regressão (`testes/cenas_2x`) passa, com zero erros.
- [ ] Testada no celular emulado (390 × 844 deitado).
- [ ] Commit com a cena e os prints em `previa_sprites/cenas_fase2/<cena>/`.

---

## 6. Registro de assinaturas

**Regra:** uma assinatura por cena, e nenhuma repetida.
- As das cenas BOAS ficam **travadas**.
- As das cenas MÉDIAS que já têm uma ideia própria ficam **reservadas**: a cena pode manter ou trocar, mas outra cena não pode usar.
- O número é o da auditoria (`AUDIT.md` §6).

| Nº | Cena | Assinatura | Situação |
|---|---|---|---|
| 21 | bl_eleven | chamada por grupos, cada um acendendo num círculo de luz; o telão monta a escalação | travada (referência) |
| 24 | itoshi_snow | duas paletas (verão e inverno) no mesmo poste; a lembrança congela e racha | travada (referência) |
| 27 | wildcard_door | ponto de fuga central; o frio azul que vira laranja quando a porta abre | travada (referência) |
| 32 | rin_challenge | o jornal molhado com a sua manchete, pisado; noir com chuva | travada |
| 39 | loki_hugo_promise | foto antiga em sépia; o soquinho contra o sol | travada |
| 43 | fox_entrance | apagão → olhos → sorriso → holofote | travada (é o recurso 16 deste arco) |
| 51 | rin_final_duel | chuva do começo ao fim; chuteiras afundando na poça em diagonal | travada |
| 58 | duo_ponte | código de cor ciano × coral; a tela dividida no fim | travada |
| 04 | onigokko | o cronômetro na parede | reservada |
| 09 | chigiri_sprint | correntes no joelho | reservada |
| 13 | first_selection_awakening | o quebra-cabeça ("a última peça sou EU") | reservada |
| 14 | bluelock_man_test | o arco da previsão; "TENTATIVA Nº 12 → 47" | reservada |
| 17 | barou_devour | a metavisão do alto | reservada |
| 18 | nagi_reo_split | o Reo sozinho no círculo de luz | reservada |
| 22 | ego_federation | os objetos contam (plaquinhas, carimbo, porta dupla) | reservada |
| 23 | shidou_cut | o quadro tático com o X vermelho | reservada |
| 26 | u20_direct_shoot | a cor sumindo em círculo; chapéu → rabona → raspão | reservada (aprovada pelo dono) |
| 28 | wildcard_hell | DIA 01 → 47; a capa de herói se desfazendo em pixels | reservada |
| 29 | wildcard_verdict | tela partida, metade P&B e metade cor | reservada |
| 34 | spain_flight | a janela oval passando da noite ao nascer do sol | reservada |
| 35 | clasico_bunny | o mundo perde a cor em volta do Sae | reservada |
| 37 | captain_speech | o cone de luz em quem se levanta | reservada |
| 44 | fox_training | a sombra gigante do Fox no gramado (recurso 17) | reservada |
| 46 | convocation_call | a parede de cartas virando rostos | reservada |
| 49 | wc_final_goal | a lembrança do Colégio Ichinan dentro do lance (recurso 23) | reservada |
| 52 | rin_final_end | a grua sobre os dois deitados | reservada |
| 54 | bola_de_ouro_discurso | os rivais devorados sendo riscados | reservada |
| 55 | rin_sae_licao | o corredor vermelho; o placar 10 × 0 subindo | reservada |
| 59 | duo_elo | a corrente dourada entre os pulsos | reservada |
| 60 | duo_ressonancia | as pulseiras no mesmo batimento | reservada |
| 62 | duo_mascaras | a máscara rachando | reservada |

As outras cenas ganham a sua assinatura quando forem refeitas. O conceito escolhido pelo dono entra aqui.

---

## 7. Regra anti-cópia

- As referências (21, 24, 27) definem o **nível**: um lugar coerente e legível, um motivo visual que atravessa a cena, a cor e a luz contando a história, pouco texto e ritmo regular.
- **É proibido repetir delas:**
  - a composição (ponto de fuga central no corredor, chamada por círculos de luz, poste com duas paletas);
  - a ordem dos efeitos;
  - o ritmo (a mesma divisão de planos).
- **Entre cenas também:** dois planos seguidos iguais aos de outra cena (mesma câmera, mesmo efeito, mesma função) contam como cópia.

---

## 8. Motor: o roteiro de dados

A cena é uma lista de planos. Cada plano diz o que mostra, e o motor cuida do acabamento: tarjas, legenda, tempo de leitura, cortes, pré-carregamento, PULAR e AVANÇAR.

O formato está em `js/cine_roteiro.js`, e a referência completa da API fica nesta seção quando o motor estiver pronto.

| Tipo de passo do prompt mestre | No roteiro |
|---|---|
| bg | `cenario` (o lugar 3D), `fundo` (cor, degradê, retícula) e `ceu`, `neblina`, `luz`, `expo` por plano |
| panel | `quadros` (layouts `1`, `2`, `3`, `diagonal` e `quebrado`; o desenho vem de `cine_art.js` ou da cena) |
| character | `atores` (de → para, animação, escala, luz, contraluz). Sem close de olho e sem aura (K1) |
| dialogue | `falas` com `tipo`: `fala`, `grito`, `pensamento` ou `sussurro`; texto com digitação |
| narration | plano `narracao`: fundo preto e frase única, grande e centralizada |
| sfx_text | `onomatopeias` (Jersey 10, entra com impacto, uma por cena) |
| fx | `efeitos`: `tremor`, `flash`, `zoom`, `linhas`, `impacto`, `inverter`, `lento`, `vinheta`, `pulso`, `pb`, `cor`, `particulas` |
| cut | `corte` para o próximo plano: `seco` (padrão), `fade`, `wipe` ou `vidro` |
| wait, sound, music | `dur` do plano, `sons` e `musica` |
| choice | `escolha` (pausa a cena com botões `.bl-btn` e muda o estado) |

**Como o jogador controla:**

| Ação | Efeito |
|---|---|
| Clique, toque, ESPAÇO ou ENTER | completa a fala que está sendo digitada; se ela já estiver completa, passa para o próximo plano |
| PULAR ou ESC | pula a cena inteira |

**Velocidade do texto:** fica no ☰ MENU (lenta, normal, rápida ou instantânea) e é salva no navegador.

**Pré-carregamento:** os bonecos, as texturas e o cenário da cena são montados antes do 1º quadro. Se demorar, aparece "CARREGANDO A CENA" e o relógio da cena não anda.

**Desempenho (meta K6):** 60 fps no PC e pelo menos 24 fps no celular nas cenas.
