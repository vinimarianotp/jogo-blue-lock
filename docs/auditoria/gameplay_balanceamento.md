# AUDITORIA FASE 0 — Gameplay, progressão e balanceamento

Escopo: `js/app.js`, `js/data_story.js`, `js/data_weapons_flows.js`, `js/match_engine.js`, `js/ui_time.js`, `js/ui_perfil.js`, `js/ui_colecao.js` (e pontas em `easter_eggs.js`, `duo_*.js`, `hub3d_cidade.js`). Nada do projeto foi alterado.

## Como medi

- Li o código e rodei o jogo de verdade no Chrome sem janela (`run_game_gl2.ps1`), num perfil descartável (o save do dono não foi tocado).
- Escrevi um **bot** que joga a partida pelo próprio motor (`MatchEngine.update()`), com **relógio falso** (`performance.now` acelerado, sem desenho): ~1–2 s por partida em vez de 3 min. O bot corre para o gol, dribla quando é apertado, chuta dentro da área mirando o canto oposto ao goleiro, usa skill de chute/drible/bote, Fluxo e Química quando dá, dá carrinho e pede a bola. É um jogador "mediano e consistente": serve para **comparar** dificuldades, builds e capítulos, não para dizer o que um humano muito bom faz.
- Carreiras inteiras jogadas pelo bot: 3 treinos com nota A (simulados direto em `onTrainingMinigameFinished`) antes de cada capítulo novo — **não** entre jogos seguidos de liga/Copa/Trio nem entre tentativas, porque o botão "PRÓXIMO JOGO"/"TENTAR DE NOVO" já começa a partida (um humano que treina sempre teria ~+550 atributos a mais no fim) —, SP gastos por estratégia, giros até tirar Épico. Teto de 10 tentativas por capítulo (depois disso o script força a vitória e marca "FORÇADO").
- Scripts e saídas: `C:\Users\USURIO~2\AppData\Local\Temp\claude\89391ab5feac08f8\ddd56ff4-27b5-4e23-81d7-b68fdd201010\scratchpad\audit0\gp\` (`lib.js` = harness + bot, `career_lib.js` = carreira, `expA/B/C.js`, `car1/2.js`, `bugs.js`, `data.js`, e os `*_out.txt`). Rodar: `run.ps1 -name expA` (ou `-name car1 -extra career_lib.js`).
- Total medido: ~560 partidas simuladas + 6 carreiras completas.

## Resumo em 12 linhas

1. O loop existe e é claro (HISTÓRIA → JOGAR → relatório → treinos/SP/giros → próximo capítulo), mas **quase nada pode te parar**: de 21 capítulos, só 9 bloqueiam se você perder; 5 avançam mesmo perdendo, 4 ligas fecham com qualquer resultado, 2 finais têm placar roteirizado que **sempre termina em vitória** (reproduzido com o jogador parado no Egoísta) e o prólogo sempre "vence".
2. **Perder não custa nada e paga**: +80 EgoCoins, +1 SP, bônus de nota, os atributos ganhos na partida (~10–13 por derrota no bot) e a energia de treino volta (3 treinos ≈ +28 atributos, +188 moedas). Eliminação nunca é definitiva ("a não ser que você volte no tempo"). Pressão de ranking/eliminação: praticamente zero.
3. **OVR é decorativo para a dificuldade**: os rivais são escalados para o SEU OVR (`app.js:1027-1042`); o que decide a partida são os atributos crus e a dificuldade do capítulo. O card da arma promete "+40 OVR" e entrega +8 (reproduzido).
4. Atributos têm efeito real e o jogo mostra o efeito ao lado da barra (`describeStatEffect`) — ponto forte. Mas há saturações escondidas (Velocidade para de render no 88, Hab. Aérea no 103, Poder de Disparo no 70) e partes decorativas (o "passa pelo goleiro" da Finalização não vale em partida; a velocidade do chute quase não importa).
5. **Curva**: Fácil = o bot vence tudo, até com atributos zerados (carreira inteira sem perder). Normal = desafio só do Cap. 2 ao Torneio de Trios; do meio para o fim o bot vence até com metade dos atributos, e **zerou a carreira sem fazer nenhum treino** (OVR 54 no fim). Egoísta = parede (0 vitórias e **0 chutes** do Cap. 1b ao Trio com atributos "normais"); só passa grindando derrotas até ter ~2x os atributos.
6. **Economia inflada**: carreira Normal termina com ~51 mil EgoCoins e 156 giros sem uso (a loja mais cara custa 2.700; os acessórios todos somam 7.000).
7. Armas = roleta (gacha), sem descoberta nem evolução; diferenças são sobretudo numéricas (força da skill + 1 passiva). Fluxos são mais distintos (13 mecânicas exclusivas), mas o Fluxo não é raro no fim (ego alto enche a barra em ~38 s, 3–4 Fluxos por jogo).
8. Escolhas de diálogo (48, todas valem uma vez) mudam afinidade ±2–10 e +1–3 atributos; o efeito em campo é quase nulo (Química 100 x 0 deu o mesmo resultado medido). Sem ramificação, sem "consequência mostrada depois".
9. Melhor do sistema: HUD com % de acerto/drible ao vivo, faixas que explicam cada lance ("DRIBLE FALHOU (34%)"), nota da partida com ganhos por ação, Monstro como mecânica de virada, escolha de clube na NEL/profissional mudando elenco e falas.
10. Bugs principais: treino de Química sobe a química de 4 personagens fixos escondidos (não do seu time); NEL perdida 8x0 com valor fora dos 23 ainda toca "você conquistou o topo do ranking salarial"; "Química alta = até +2 OVR" não faz nada em campo; `statBoosts` das armas nunca são aplicados.
11. Notas: **Profundidade de gameplay 5/10**; **Progressão e balanceamento 3,5/10**.
12. Prioridade nº 1: dar consequência à derrota/ranking (corte da NEL, eliminação com custo), destravar as finais roteirizadas e alinhar a curva Normal/Egoísta.

---

## 1. Loops (como existe hoje)

```
HISTÓRIA (card do capítulo: time, rival, OBJETIVO "Meta: N gols • m:ss", ranking)
  └─ JOGAR → interlúdio/diálogos (escolhas com efeito) → intro → PARTIDA
        └─ fim: relatório (nota S/A/B…, +EgoCoins, +atributos por ação) → energia de treino volta a 3
              ├─ venceu: pós-jogo + anúncio do ranking do Ego + recompensas → próximo capítulo
              └─ perdeu: tela do Ego + "+80 EgoCoins • +1 SP" → TENTAR DE NOVO / IR TREINAR
  entre partidas: TREINOS (3 por partida, minigame com nota S/A/B/C) → ATRIBUTOS (gastar SP 1:1)
                  → ARMAS/FLUXO (roleta, giros) → LOJA (giros) → EQUIPE/RELAÇÕES (só leitura)
```

- **Treinar**: hoje são 4 minigames (`data_story.js:2868-2928`, outro agente está trocando): Físico (anéis), Técnica (alvos), Mental (ponto cego), Sinergia (de primeira). Cada um dá um pacote fixo de atributos (6–7 pontos) × nota (S 1,5 / A 1,25 / B 1 / C 0,5), 1 SP e 45–65 moedas (`app.js:4384-4449`). Energia 3, recarrega a 3 em qualquer partida terminada (inclusive derrota), não acumula (`app.js:4096`).
- **Decidir**: escolhas nos diálogos (seção 4), escolha do clube da NEL e da proposta profissional, onde gastar SP, quando girar.
- **Jogar**: partida em tempo real (seção 5).
- **Ser ranqueado**: o "Ranking do Blue Lock" é uma tabela fixa por capítulo concluído (`data_story.js:1457-1478`: #299 → #271 → … → #1 no Cap. 12), **não depende do desempenho**. Só a NEL (valor de mercado) e a Liga Europeia (Bola de Ouro) têm ranking por desempenho (`app.js:3058-3086`), e o resultado só dá conquista/texto.
- **Evoluir**: atributos e equipamento (roleta). Na carreira Normal do bot (1.511 pontos no fim): treinos ≈ 45%, ganhos da partida ≈ 37% (`getMatchReport`, até ~21 por jogo), SP ≈ 16% (1 SP = +1). Ou seja, a decisão do jogador (onde pôr SP) mexe em ~1/6 do personagem; o resto vem do tipo de treino e do jeito de jogar.
- **Avançar**: capítulo vencido → índice +1.

**O jogador sempre sabe o próximo objetivo?** Sim no curto prazo: o card da HISTÓRIA mostra "OBJETIVO: Meta 3 gols • 3:09 de partida" (`ui_historia.js:222-231`), a aba OBJETIVOS tem a "Rota do Egoísta" com etapa atual e "VIRAR WORLD CLASS: OVR x/95" (`ui_time.js:732-812`), e o HUD da partida mostra "META x/y GOLS". **Quanto falta?** Só em OVR (barra até 95). Falta: (a) mostrar o que o próximo capítulo exige (o jogo não diz "esse rival é dif. 7, recomendo X"); (b) o ranking não é meta (sobe sozinho); (c) não há objetivo intermediário com custo (ex.: "fique entre os 23 ou está fora").

**Quantos capítulos podem te parar** (medido em `data.js` + leitura):

| Tipo | Capítulos | Perdeu → |
|---|---|---|
| Bloqueia (tem que vencer) | ch1b, ch2, ch4, ch4b (3 rodadas), ch8 (5), ch10, ch12b (2), ch13 (8), ch14 | tenta de novo, sem limite |
| Avança mesmo perdendo (`advanceOnLoss`) | ch1, ch1c, ch2b, ch3, ch5b | metade das moedas, giros e SP inteiros (`app.js:4126-4160`) |
| Liga (fecha com qualquer resultado) | ch6, ch7 (NEL), ch11, ch12 (Europa) | o turno termina e o capítulo é concluído (`app.js:3250-3283`) |
| Final roteirizada (não dá para perder) | ch5 (Sub-20 Japão, 3x3→4x3), ch9 (Final Sub-20, 2x2→3x2) | não existe derrota |
| Prólogo | ch0 | sempre "vence" |

---

## 2. Atributos → partida

Todos entram por `MatchEngine.getStatEffects()` (`match_engine.js:959-1015`) e a aba ATRIBUTOS mostra o mesmo texto (`describeStatEffect`, `match_engine.js:1106-1125`). Barras vão até 200, sem teto de atributo.

| Atributo | Onde entra (fórmula, arquivo:linha) | Efeito visível? | Saturação / decorativo |
|---|---|---|---|
| Velocidade | trote `2,25 + min(1,1; vel/80)` (`:964`), SHIFT ×1,6; drible +0,12%/pt (`:1472`) | Sim, muito | **Para no 88** (velocidade). Acima disso só +0,12% de drible |
| Resistência | gasto `max(0,18; 0,45 − res/250)` (`:965`), volta `1 + res/100` (`:966`) | Sim (barra de fôlego) | Gasto para de cair no 68 |
| Força | rivais tiram a bola: `0,35 + edge·0,35 − (0,004·for + 0,002·cond)`, piso 12% (`:3850-3852`); seu carrinho `0,45 + 0,004·for + 0,002·pos` (`:1875`) | Sim (desarmes) | Forte; com for 100 o bote rival cai ao piso |
| Hab. Aérea | domina bola até `34 + min(36; aér·0,35)` de altura (`:969`, `:3943`) | Quase nunca (passes são rasteiros) | **Quase decorativo**; para no 103 |
| Finalização | acerto `+0,6/pt` (`:971`, `:1981`); acima de 60 pontos de acerto rende metade (`:985`); o goleiro rival come 55% acima de 12 (`keeperLevelCut`, `:2020-2024`) → rende líquido ~+0,27%/pt e ~+0,14%/pt depois | Sim (% no HUD) | **`keeperBeat` (fin/220) é decorativo em partida**: o seu chute em jogo é decidido só pela rolagem `gkSave` (`:3660-3662`); o "passa pelo goleiro" só vale no treino (`:3676`) |
| Poder de Disparo | acerto +0,1/pt; velocidade da bola `11,5 + min(5; pd/14)` (`:973`), teto `19,5 + min(2,5; pd/40)`; skill `×(1 + min(0,2; pd/400))` | Pouco | Velocidade para no 70; em partida a velocidade **não muda a defesa** (só bola < 6 é sempre defendida e bola < 11,5 pode ser dominada no caminho, `:3943`) → quase decorativo |
| Tiros Longos | perde só `(1 − min(0,7; tl/120))` da penalidade de longe (`:975`, `:1990`), teto de longe +10% (`:2006`) | Sim, de fora da área | Para no 84; nicho (bot chutando de 800 piorou, ver 5) |
| Condução | drible `+0,5%/pt` (cap 92%, `:1472`); recarga `150 − 0,4·cond` quadros (mín. 90, `:1509`); arrancada `+0,4·cond` (cap 48, `:1528`); segura a bola +0,002/pt | Sim, muito | **O mais forte no começo** (medido, seção 6). Recarga/arrancada usam o atributo cru (ignora a Evolução da NEL) |
| Visão | passe `+min(3; vis/25)` (`:977`); Química enche `2 + vis/60` %/s (`:978`) | Pouco (passe) / médio (Química) | Passe para no 75 |
| Posicionamento | raio para dominar bola solta `22 + min(18; pos·0,15)` (`:970`); carrinho +0,002/pt | Médio | Para no 120 |
| Compostura | acerto +0,2/pt; marcação atrapalha `1 − min(0,65; comp/150)` (`:976`, `:1997`); drible +0,1/pt | Sim (% cai menos com marcador) | Para no 97 |
| Ego | Fluxo enche `0,8 + ego/100` %/s (`:981`, aplicado 1×/s em `:3378`) | Sim, se tiver Fluxo | Sem Fluxo equipado é **inútil** |
| **OVR** | `soma/22` + bônus de arma/fluxo (`app.js:999-1025`) | Só na tela | **Decorativo para a partida**: rival = `seu OVR + 0..+2` (`app.js:1036-1041`), vantagem = `(OVR rival − seu OVR)/40` (`match_engine.js:1378`); só libera o pé AMBOS (OVR 52) e 2 conquistas |
| Química (afinidade) | parceiro da Reação = companheiro em campo com mais afinidade; `noAlvo = 70% + 25%·q`, `+40+20·q` de acerto (`match_engine.js:2586-2613`) | Pouco | "Até +2 OVR" para companheiros (`ui_perfil.js:633`) **não faz nada**: o OVR dos companheiros não entra na IA (velocidade fixa 2,35, `:1328`; chute fixo 58/72%, `:2898-2902`) |

**Conta do chute** (dentro da área, sem marcador, Normal, capítulo de dificuldade d): `acerto = 25 + A − 0,55·max(0, A−12) − 1,2·d − 12·edgeGoleiro (+6+6·poder da skill)`, teto 85 (Egoísta −14 e teto 72). Na prática (já com a vantagem do goleiro): começo (A=0, d=3) ≈ **20%**; meio (fin 70/comp 45/pd 66, d=7) ≈ **46%**; fim (fin 175/comp 95/pd 134, d=10) ≈ **59%**. Skill de chute World Class (poder 3,35) soma +26 — é o maior bônus isolado de acerto do jogo e não é comido pelo goleiro.

---

## 3. Armas, Fluxo, Ego e Monstro

**Armas** (`data_weapons_flows.js`, 70 na roleta + 1 secreta)
- Como desperta: **só roleta** (giro normal 34/25/18/11/7/3,5/1,5% por raridade; Giro da Sorte sem Comum/Incomum, 5% WC; `:6-28`, `:555`). Girar de novo **perde a atual** (`app.js:2009-2032`). Não há descoberta pela história, nem cutscene de despertar da arma (só a roleta + explosão de raridade), nem evolução/nível da arma.
- Estilo: cada arma = 3 skills de 5 tipos (drible com 6 movimentos — reto, giro, zigue-zague, arrancada, pulo, ombro —, chute, buff, bote, passe) + 1 passiva de 19 tipos (`:442-515`). O chute especial é a **mesma mecânica** em todas (acerto `+6+6·poder`, velocidade por poder; curva só se o nome tiver "curva/gyro/trivela", `match_engine.js:2407-2453`). Ou seja: **bônus numérico com sabor**; o que muda o jeito de jogar é a passiva (ex.: Camaleão copia skill [V], Passe Perfeito, Predador puxa a bola solta) e o movimento do drible.
- `statBoosts` (ex.: Kaiser `pd 80, fin 78, tl 75…`) **existem nos dados e nunca são aplicados nem mostrados** (procurei em todos os js: só aparecem em `data_weapons_flows.js`/`data_duo.js`).
- O card mostra "+ovrBonus OVR" (`ui_colecao.js:301,363,394,833`): WC "+40"; o OVR real sobe `round(40·0,2)` = **+8** (reproduzido). E OVR não muda a partida (seção 2).
- Peso medido (Cap. 4, Egoísta, atributos 25, 5 jogos cada): sem arma 0V (0x66), Comum 0V, Épica 0V, Lendária 0V (2x38), WC Kaiser 0V (1x51), **WC secreta "Monstro da Madrugada" 1V (8x24)**. Em Normal, com atributos certos, o bot sem nenhuma skill/Fluxo/Química venceu 5/6 contra 8/10 do bot completo. Conclusão: **arma pesa pouco**; o que decide é atributo × dificuldade.
- Arma secreta World Class grátis: abrir o jogo entre 0h e 4h (`easter_eggs.js:265-289`) — basta mudar o relógio do PC. É a melhor arma medida.

**Fluxo** (`FLOWS_DB`, 25 + 1 secreto)
- Mais distinto: dos 25, 13 trazem mecânica exclusiva (o resto repete as passivas das armas com valor maior) — Quatro Egos: 1º chute +35 e +6 s por gol; Racional: +40 livre na área; Kaiser: +30 carregado ≥90; Devorar; Leitura corta passes; Visão de Deus deixa rivais lentos; Gênio devolve 60% da barra… Despertar tem cena própria a partir do Épico (`playFlowCutscene`) + faixa dos olhos e tela escura no chute. **Esse é o sistema com mais identidade.**
- Raridade/impacto: barra começa em 0 e enche `0,8 + ego/100` %/s (+12 por gol, `:4011`), dura 10–14 s. Início (ego 0): ~125 s → 1 Fluxo por jogo (raro, bom). Fim de carreira (ego ~185, medido): ~38 s → **3–4 Fluxos por partida de ~3 min** — deixa de ser raro. Egoísta enche 35% mais devagar. Dois slots na NEL somam efeitos (`combineFlows`).
- Laboratório de Fluxos (testar qualquer um sem prêmio) é ótimo para o jogador entender.

**Ego**: é só um atributo (acelera o Fluxo). Cresce com escolhas "egoístas" nos diálogos (+1 a +3, uma vez cada), com gols (`+min(gols,2)` no relatório), treinos Mental/Sinergia (+2) e prólogo (+6 nas duas escolhas). Não há medidor de Ego próprio nem "decisão egoísta certa" dentro da partida.

**Monstro** (Fox, Cap. 10): liberado ao **entrar** no Cap. 10 (`app.js:3611-3614`); acorda 1× por jogo quando você está atrás (`match_engine.js:2938-2967`): 15 s com +25 de acerto (não comido pelo goleiro), +2 de força do chute, +0,25 para segurar a bola e corrida ×1,3. Boa mecânica de virada, com cena.

**Evolução da NEL** (Metavision / Predator Eye / Protagonismo): +25 a +40 em 3 atributos e +4 OVR; dá para trocar a qualquer momento sem custo (`app.js:2648-2660`).

---

## 4. Decisões e relações

- **Escolhas de diálogo**: 48 pontos de escolha (lista completa em `gp/data_out.txt`), todos com `id` — valem uma vez, mesmo repetindo o capítulo (bom: sem farm). Efeitos: afinidade ±2 a ±10 e/ou +1 a +3 num atributo. A consequência aparece **na hora** num aviso ("RELAÇÃO: ▲ Bachira +8 • +1 EGO") e a escolha mostra "💬 Afeta a relação com X" (`cutscene_engine.js:144-183`). **Não ramificam** (só inserem a resposta, `cutscene_engine.js:132-142`) e **nunca mais são citadas**.
- **Prólogo (passar x chutar)**: as duas dão +6 Ego e +3 giros (`app.js:3992-3996`); muda só o texto da noite. `prologueChoice` fica salvo e não é usado depois.
- **O que a afinidade muda de verdade**: (1) quem faz a Reação Química e quão boa ela sai; (2) Rin = 0 para sempre depois da Sub-20 (`app.js:946-952`, bom gancho de lore); (3) +3/+5 no trio vencedor. Medido (Cap. 4 Normal): Química 100 com todos = 5V 0E 1D; Química 0 com todos = 5V 0E 1D. **Efeito em campo ≈ zero.**
- **Treino de Química (+10%)** sobe 4 personagens fixos escondidos (`selectedSquad` = Shidou, Yukimiya, Bachira, Sae — `app.js:89`, `:4415-4419`), não quem joga com você (bug, seção 8). A tela EQUIPE não permite mudar esse grupo (`toggleSquadMember` e `trainWithPartner` não têm botão: código morto, e o segundo daria +20 química/+4 Ego/+4 Visão grátis sem limite se alguém religar).
- **Caminho narrativo**: ganhar/perder muda a cena em 3 capítulos (Cap. 1 Barou, 2ª Seleção, World Five — `chapterWon`, `data_story.js:3027-3071`); o clube da NEL (5) e a proposta profissional (5) mudam elenco, rivais, uniforme e 16 falas. É a variação real que existe.
- **Rivalidade / "devorar"**: não há sistema (nem medidor de rivalidade, nem efeito de "devorar" um rival além do nome do Fluxo do Lorenzo).
- **O jogador vê a consequência depois?** Não. Nenhuma tela/cena posterior reage a escolhas, afinidade ou desempenho, exceto as 3 cenas de vitória/derrota e o texto da NEL — e este se contradiz (seção 8).

---

## 5. Partida

**Legibilidade (bom)**: HUD com % de acerto ao vivo e painel de skills com % (`match_engine.js:5849`, `:5921-5997`); faixas que explicam cada resultado ("❌ DRIBLE FALHOU! (34% de chance) — Kunigami leu…", "Chance de desarme: 62%", "DEFESA NO REFLEXO: chute com pouca % de acerto"); nota ao vivo com "+0,2 CHUTE NO ALVO / −0,3 PERDEU A BOLA"; relatório final com nota, chutes, dribles e atributos ganhos (`app.js:4066-4084`); tutorial passo a passo.

**Decisões do jogador**: todas em tempo real (mover/correr gastando fôlego, drible com cadeia que piora, passe, pedir bola, carrinho, carregar o chute, curva Q/E, 3 skills, Fluxo G, Química C só dentro da área com ≥60%). Não há momentos narrados de decisão no meio do jogo (só o dilema do prólogo, que dá o mesmo prêmio).

**Peso atributo x habilidade x sorte** (medido, Cap. 4 Normal, atributos 27, arma Épica):

| Variante | Resultado |
|---|---|
| Bot completo (10 jogos) | 8V 1E 1D, saldos de −3 a +3 |
| Sem skills/Fluxo/Química | 5V 0E 1D |
| Sem driblar | 6V 0E 0D (driblar é arriscado: falhou = roubada) |
| Chutando de até 800 | 4V 1E 1D |
| Chute carregado 95 | 4V 0E 2D (acima de 85 de carga, −10 de acerto) |

- **Atributo domina**: Cap. 4 Normal com atributos 14 → 0/3; com 27 → 3/3 (expA). Cap. 2 com atributos 0 → 0x9; com 15 → 3x0.
- **Habilidade manual pesa médio**: decisões ruins (chutar de longe, carregar demais) custam ~30 pontos de taxa de vitória; usar arma/Fluxo/Química pouco ajuda.
- **Sorte**: cada chute é **uma rolagem no momento do chute** (`rollShotDirection`, `match_engine.js:2077-2083`): se falhar, o goleiro "lê" e, se não chegar, faz "defesa no reflexo" na linha (`:4005-4008`). A mesma build no mesmo capítulo variou de −3 a +3 de saldo (10% dos jogos viraram derrota por sorte). Dose de sorte razoável, mas a sensação é de dado escondido, não de chute bem/mal executado (a mira só importa para estar entre as traves).
- **Roteiro tira o controle**: gols do rival por cutscene com prazo (`script.goals`, `match_engine.js:3064-3184`) — ex.: Cap. 1b (1 gol do rival garantido), Cap. 10 (2), Cap. 14 (1) —; e o **clímax** força o placar e a vitória (`:3425-3433`, `:3258-3270`, `scriptBlocksGoal` `:3202-3212`). Reproduzido: Sub-20 Japão 4x3 e Final Sub-20 3x2 **sempre**, inclusive com o jogador parado no Egoísta.

**Dá para perder? O que acontece?**: nas 9 bloqueadoras, sim; tela do Ego com frase, "+80 EgoCoins • +1 SP" e **TENTAR DE NOVO** sem limite (`app.js:4282-4310`). Trio: "o Ego te deu mais uma chance" (`:3932`). Copa: mata-mata perdido = joga a fase de novo (`:3573`); grupo perdido = recomeça o grupo (`:3556-3561`). **Não existe eliminação real.**

**Ranking/eliminação dá pressão?** Não. Reproduzido: perdendo os 8 jogos da NEL por 0x3, valor 5 (27º, corte 23), o jogo diz "Fora dos 23… suba ou fique para trás" e **mesmo assim conclui os dois capítulos e vai para a Copa Sub-20**, tocando "você conquistou o topo do ranking salarial… você é um deles" (`data_story.js:855-859`, `:1494`).

---

## 6. Economia e curva

### Fontes e gastos
| Recurso | Fontes (por vez) | Gastos |
|---|---|---|
| EgoCoins | capítulo `rewardCoins` 120→5.000 (soma 18.260, ×0,8/1/1,6 pela dificuldade); derrota +80; nota da partida 0–250 +40/gol no ângulo; liga 160/90/50; Copa 250/120/60; Trio 90/50; treino 45–65 ×nota; conquistas 80–2.000 (31); luvas do contrato ~370; fãs na cidade +5 (máx. 8 por capítulo); Modo Dupla 30–370 por partida (vai para a carreira solo); segredos +100 | giro 250, 5 giros 1.100, Giro da Sorte 600, 5 por 2.700, redefinir SP 750, acessórios (10, soma 7.000) |
| Giros | capítulo 2→12 (soma 89), prólogo +3, vitória na liga/Copa +1, conquistas 0–10 | girar arma/fluxo |
| SP | capítulo 2→20 (soma 144), derrota +1, jogo de liga/Copa/Trio +1, treino 1 ×nota | 1 SP = +1 no atributo |
| Atributos diretos | treino 6–7 × nota (S 1,5); relatório da partida 1–10 (`match_engine.js:4449-4466`); escolhas +1–3; Evolução NEL | — |
| Energia de treino | qualquer partida terminada → 3 (não acumula) | 1 por treino |

### Curva medida — carreira inteira do bot (3 treinos nota A antes de cada capítulo novo, SP equilibrado)

| Capítulo (dif.) | OVR Normal | Atrib. Normal | Moedas Normal | Jogos Normal | OVR Egoísta | Jogos Egoísta |
|---|---|---|---|---|---|---|
| Cap. 1 Barou (3) | 6 | 37 | 388 | 1 (D, avança) | 6 | 1 (D, avança) |
| Cap. 1b Time Y (2) | 8 | 85 | 1.018 | 1 V | 10 | **11 (10 D, 0x88, forçado)** |
| Cap. 2 Time V (3) | 14 | 183 | 2.847 | 1 V | 19 | **11 (10 D, 5x80, forçado)** |
| Cap. 3 World Five (4) | 19 | 288 | 4.550 | 1 (D 1x8, avança) | 29 | 1 (D, avança) |
| Cap. 4 3ª Seleção (4) | 21 | 330 | 5.076 | 1 V | 31 | **7 (6 D)** |
| Cap. 4b Trio (4) | 23 | 382 | 5.939 | 3 V | 39 | 3 V |
| Cap. 5 Sub-20 Japão (5) | 27 | 462 | 7.377 | 1 V (roteiro) | 42 | 1 V (roteiro) |
| Cap. 6/7 NEL (4/5) | 37 / 42 | 566 / 676 | 9.913 / 12.076 | 4+4 (1 D) | 54 / 59 | 4+4 (3 D) |
| Cap. 8 Copa Sub-20 (7) | 47 | 789 | 16.444 | 5 V | 64 | 5 V |
| Cap. 9 Final Sub-20 (8) | 53 | 914 | 20.314 | 1 V (roteiro) | 69 | 1 V |
| Cap. 10 Fox (7) | 56 | 972 | 23.310 | 1 V | 72 | 1 V |
| Cap. 11/12 Europa (7/8) | 58 / 64 | 1.028 / 1.144 | 24.913 / 28.451 | 4+4 V | 75 / 80 | 4+4 (3 D) |
| Cap. 13 Copa do Mundo (9) | 72 | 1.329 | 36.387 | 8 V | 88 | 8 V |
| Cap. 14 Rin (10) | 80 | 1.497 | 45.830 | 1 V | 96 | 1 V |
| **Fim** | **80 (S)** | 1.511 | **51.160 + 156 giros** | **47 jogos, 4 D** | **97 (WC)** | 73 jogos, 36 D, 2 forçados, 76.297 moedas |

### As 6 carreiras do bot (mesma política; 3 treinos nota A antes de cada capítulo novo, salvo "sem treino")

| Carreira | Partidas | Derrotas | Forçadas (10 derrotas seguidas) | OVR final | Atributos | Moedas no fim | Giros sobrando | Onde travou |
|---|---|---|---|---|---|---|---|---|
| Fácil, SP equilibrado | 47 | 0 | 0 | 80 | 1.501 | 45.222 | 152 | nada |
| Normal, SP equilibrado | 47 | 4 (3 em capítulos que avançam assim mesmo) | 0 | 80 | 1.511 | 51.160 | 156 | nada |
| Normal, todo SP em Finalização (fin 368) | 47 | 2 | 0 | 77 | 1.466 | 50.615 | 157 | nada |
| **Normal, sem nenhum treino** | 50 | 6 (Trio) | 0 | **54** | 946 | 44.610 | 167 | Trio, 2ª e 3ª rodadas (3 + 2 tentativas) |
| Egoísta, SP equilibrado | 73 | 36 | 2 | 97 | 1.828 | 76.297 | 164 | Cap. 1b e Cap. 2 (10 derrotas cada), Cap. 4 (6) |
| Egoísta, sem treino | 82 | 49 | 3 | 71 | 1.332 | 65.575 | 127 | Cap. 1b, 2 e 4 (10 derrotas cada), Trio (3) |

Leitura: no Normal **o treino é opcional** (o bot zerou a carreira sem treinar, com OVR 54) e nenhuma estratégia de SP muda o resultado; no Fácil o bot não perdeu nenhuma partida. A parede do Egoísta é só no começo (Cap. 1b a 4): depois do Trio os atributos acumulados nas derrotas passam a sobrar. Tempo real estimado de uma carreira Normal para um humano que treina sempre: ~47 partidas × ~3 min + ~140 treinos × ~45 s ≈ 4 h.

### Taxa de vitória do bot por capítulo × build × dificuldade (3 jogos cada; "n" = atributos da carreira Normal naquele ponto, "h" = metade, "z" = zero; arma/fluxo Épicos)

| Capítulo | Fácil n / h / z | Normal n / h / z | Egoísta n / h / z |
|---|---|---|---|
| 1b Time Y (2) | 3/3 · 3/3 · 3/3 | 3/3 · 2/3 · 1/3 | **0/3 · 0/3 · 0/3** (0 chutes) |
| 2 Time V (3) | 3/3 · 3/3 · 3/3 | 3/3 · 3/3 · **0/3** | **0/3** (0 chutes) |
| 4 3ª Seleção (4) | 3/3 · 3/3 | 3/3 · **0/3** | **0/3 · 0/3** |
| 4b Trio, 1ª rodada (4) | 3/3 · 3/3 | 2/3 · 1/3 | **0/3 · 0/3** |
| 6 NEL (4) | 3/3 · 3/3 | 3/3 · 1/3 (2E) | 1/3 · 0/3 |
| 8 Copa Sub-20 quartas (7) | 3/3 · 3/3 | 3/3 · 3/3 | 1/3 · 0/3 |
| 10 Fox (7) | 3/3 · 3/3 | 3/3 · 2/3 | 1/3 · 0/3 |
| 13 Copa final (10) | 3/3 · 3/3 | 3/3 · 3/3 | 0/3 · 0/3 |
| 14 Rin (10) | 3/3 · 3/3 | 3/3 · 3/3 | 1/3 · 0/3 |

Leitura: **Fácil não tem desafio** (vence até zerado). **Normal** só aperta do Cap. 2 ao Trio; depois do Cap. 6 o bot vence com metade dos atributos (o "meio monótono" que o PROMPT pede para evitar). **Egoísta** é uma parede no começo: os rivais (`rivalSpeed 1,17`, 3 perseguidores, bote ×1,45, recarga ×0,6 — `data_story.js:3340`) tiram a bola antes de qualquer chute; só se passa **grindando derrotas** (Cap. 1b: atributos 79 → 222 em 11 derrotas, sem treinar entre as tentativas — só com o que as derrotas pagam). Não há degrau intermediário entre Normal e Egoísta.

### Estratégia/atributo dominante (mesmo orçamento: Cap. 4 base 10 +240 num só; Copa Sub-20 base 40 +300; 4 jogos cada, Normal)
- Cap. 4: espalhado 4V (+7), **Condução 4V (+10)**, Velocidade 3V1E (+7); Visão/Compostura 2V; Finalização/Força/Poder/Posic./Tiros Longos 1V; **Resistência e Ego 0–1V** (−8/−9).
- Copa Sub-20: tudo vence 3–4V; Condução/Velocidade/Posicionamento +15 de saldo, Ego +9.
- Conclusão: **nenhum atributo único vence tudo**, mas **Condução e Velocidade dominam o começo** (drible + fuga do bote) e espalhar é quase tão bom. Finalização sozinha rende pouco porque o goleiro "come" 55%. Ego e Resistência sozinhos são armadilha (−8/−9 de saldo); Hab. Aérea concentrada rende pouco (2V 2D).

### Exploits / furos
1. **Derrota paga** (reproduzido em `bugs.js`): uma derrota no Cap. 2 deu +110 moedas (80 + nota), +1 SP, os atributos do relatório (no bot, ~10–13 por derrota) e energia 0→3; os 3 treinos liberados deram +188 moedas, +28 atributos, +3 SP. Ciclo ~5 min ≈ +40 atributos (~1,8 OVR). Sem limite: qualquer parede vira grind. (Desistir pela pausa não paga — isso já foi corrigido.)
2. **Moeda sem destino**: 51 mil moedas e 156 giros sobrando no fim do Normal; 76 mil no Egoísta. Com 156 giros, a chance de ao menos um World Class é ~90%; com 51 mil dá para comprar ~85 Giros da Sorte.
3. **Arma WC grátis** pelo relógio (0h–4h) e Fluxo Mítico grátis clicando 7× no logo (`easter_eggs.js:240-262`).
4. **Dificuldade trocável a qualquer momento** no ✏️ PERSONALIZAR ("dá para trocar quando quiser", `app.js:577`, `:485`): Egoísta (×1,6 moedas) não é compromisso.
5. **Modo Dupla** paga 30–370 moedas por partida na carreira solo (`duo_mode.js:333-337`, `duo_career.js:650-653`), sem teto (precisa de 2 clientes — suspeita, não testei com duas abas).
6. Evolução da NEL trocável grátis a qualquer momento.

---

## 7. Rejogabilidade (o que muda numa 2ª carreira)

Muda: dificuldade; pé ambidestro (sorteio 10%, +5% chute/drible); roleta de armas/fluxos; as 48 escolhas (só afinidade/atributos); clube da NEL (5 elencos/rivais/falas) e proposta profissional (5); 3 cenas alternativas por vitória; segredos. Não muda: a ordem dos capítulos, os rivais de cada capítulo, as finais roteirizadas, o ranking fixo, os eventos (não há eventos aleatórios entre partidas), nenhum "Novo Jogo+" nem herança entre carreiras (são 2 espaços de save independentes). Veredito: **baixa** — a segunda carreira é quase a mesma história com outra arma da roleta.

---

## 8. Bugs de gameplay

| # | Bug | Passo a passo | Gravidade | Onde | Status |
|---|---|---|---|---|---|
| 1 | Finais com clímax **não podem ser perdidas** | Jogue o Cap. 5 (Sub-20 Japão) ou o Cap. 9 (Final Sub-20) no Egoísta sem tocar na bola → placar vira 3x3/2x2 no fim e a cena dá 4x3/3x2 de vitória | Alto (design) | `match_engine.js:3202-3212`, `:3425-3433`, `:3258-3270` | **Reproduzido** (3/3 + jogador parado) |
| 2 | NEL perdida e fora dos 23 ainda vai para a Copa e o Ego diz que você é o topo | Escolha um clube, perca os 8 jogos → "Fora dos 23… suba ou fique para trás" e logo depois "você conquistou o topo do ranking salarial… você é um deles"; capítulo concluído | Alto | `app.js:3250-3283`, `data_story.js:855-859`, `:1494` (+4 cópias por clube) | **Reproduzido** (valor 5, 27º, avançou para ch8) |
| 3 | Treino de Reação Química sobe a química de 4 personagens fixos e escondidos, não do seu time | Na NEL pelo Bastard (Noa, Kaiser, Ness, Kurona em campo) faça o treino Sinergia → +10 em Shidou, Yukimiya, Bachira e Sae; ninguém do seu time muda | Médio | `app.js:89`, `:4415-4419` (sem UI para trocar `selectedSquad`) | **Reproduzido** |
| 4 | "+40 OVR" da arma World Class (e +28, +20… nas outras) é falso | Equipe arma WC → OVR sobe 8 (fluxo WC +5) | Médio | `ui_colecao.js:301,363,394,833` x `app.js:1008-1019` | **Reproduzido** |
| 5 | `statBoosts` das armas nunca aplicados nem mostrados | Kaiser promete pd 80/fin 78/tl 75/vis 65/ego 80 nos dados; nada usa | Baixo (dado morto) | `data_weapons_flows.js` (todas as armas) | Lido + confirmado em `bugs.js` |
| 6 | "Química alta = companheiros jogam melhor (até +2 OVR)" não tem efeito | Suba afinidade de um companheiro → velocidade/chute dele não mudam | Médio (promessa falsa) | `ui_perfil.js:633`, `app.js:1039`, `match_engine.js:1328`, `:2898-2902` | Lido (o OVR dos companheiros só escolhe o artilheiro do roteiro, `:3101`) |
| 7 | Finalização: "+X% de chance de passar pelo goleiro" — a parte `keeperBeat` não vale em partida | Em jogo o seu chute só usa a rolagem `gkSave` | Médio | `match_engine.js:972`, `:3660-3662` x `:3676` | Lido |
| 8 | Derrota paga e recarrega os treinos (farm sem limite) | Perca qualquer capítulo bloqueador → +80 +1 SP + nota + energia 3 → TENTAR DE NOVO | Médio (balanceamento) | `app.js:4096`, `:4164-4168` | **Reproduzido** |
| 9 | Dificuldade pode ser trocada no meio da carreira | ✏️ PERSONALIZAR → DIFICULDADE → SALVAR | Baixo (design; é intencional pelo texto) | `app.js:485`, `:577` | Lido |
| 10 | Drible usa Condução crua para recarga e arrancada (a Evolução Protagonismo +30 não conta) | Escolha Protagonismo → recarga do drible igual | Baixo | `match_engine.js:1509`, `:1528`, `:5864` | Lido |
| 11 | O bônus do 1º chute do Quatro Egos é gasto mesmo em chute mirado para fora | Entre no Fluxo Quatro Egos e chute para fora → banner "QUATRO EGOS!" e o bônus acabou | Baixo | `match_engine.js:2147`, `:1051-1061` | Lido |
| 12 | Multiplicador de moedas da dificuldade não vale em Trio, treino, derrota, conquistas; comentário diz "Egoísta +30%" e o valor é ×1,6 | — | Baixo | `app.js:3912-3914`, `:4167`, `:4413`, `:4252` | Lido |
| 13 | Código morto perigoso: `trainWithPartner` (+20 química, +4 Ego, +4 Visão, sem custo/limite) e `toggleSquadMember` (reescreve `teammateIds` do capítulo em memória) | Sem botão hoje | Baixo (risco se religar) | `app.js:4594-4630` | Lido |
| 14 | Monstro é liberado ao **entrar** no Cap. 10, não ao vencer | Comece o Cap. 10 e desista → monstro liberado | Baixo | `app.js:3611-3614` | Lido |
| 15 | Escolha do prólogo não tem consequência | Passar ou chutar = mesmos +6 Ego/+3 giros; `prologueChoice` nunca é lido | Baixo (design) | `app.js:3992-3996` | Lido |

---

## 9. Notas

- **Profundidade de gameplay: 5/10** — a partida tem bastante verbo (drible com cadeia, fôlego, curva, carga, 3 skills, Fluxos com 13 mecânicas exclusivas, Química, Monstro) e é legível (% ao vivo, faixas explicando cada lance, nota e relatório). Perde pontos porque armas são quase só números, escolhas não ramificam nem voltam, afinidade quase não pesa em campo, OVR é decorativo e duas finais são roteirizadas até o placar.
- **Progressão e balanceamento: 3,5/10** — atributos com efeito real e explicado na aba, curva de OVR constante e previsível (~+0,4 OVR por treino, 22 pontos = 1 OVR). Mas não há risco (derrota paga, eliminação não existe, NEL não corta, 12 de 21 capítulos não podem te parar), Fácil e o meio do Normal não desafiam, Egoísta é uma parede que só cede com grind, a economia termina com 51 mil moedas e 156 giros sem uso, e há saturações escondidas (Velocidade 88, Poder 70, Aérea 103).

---

## 10. Backlog (minha parte)

| Tarefa | Área | Impacto (1–5) | Esforço (1–5) |
|---|---|---|---|
| Derrota com custo: sem +80/+1 SP e sem recarregar treino em capítulo perdido (ou recarregar só 1); manter "tentar de novo" | Progressão | 5 | 1 |
| Corte real da NEL: fora dos 23 → capítulo extra de repescagem (Wild Card) ou repetir o 2º turno; trocar a fala fixa do Ego por uma que dependa de `vpos` | Progressão/Narrativa | 5 | 2 |
| Finais com clímax: o roteiro só ajusta o placar se você estiver ganhando/empatando; perdendo no fim = derrota normal (ou clímax só a partir do empate) | Partida | 4 | 2 |
| Corrigir o treino de Química para subir os companheiros do capítulo atual (`getChapter().teammateIds`) | Relações | 3 | 1 |
| Card da arma mostrar o OVR real (`round(ovrBonus×0,2)`) ou fazer o OVR valer o que mostra | UI/Progressão | 3 | 1 |
| Decidir `statBoosts`: aplicar como bônus de atributo da arma (vira "estilo" da arma) ou apagar dos dados | Armas | 4 | 2 |
| Degrau entre Normal e Egoísta ("Difícil") e reajustar Egoísta cedo (perseguidores 3→2 até o Cap. 4, bote ×1,45→×1,2) — medir de novo com o bot | Balanceamento | 5 | 2 |
| Meio do Normal: subir `difficulty` dos rivais ou fazer `keeperLevelCut`/edge acompanharem os atributos para o Cap. 6–14 não virar passeio (alvo: bot "n" 60–75% de vitória) | Balanceamento | 4 | 2 |
| Sumidouro de moeda: arma evolui com moedas (nível 1–5 da skill/passiva), reforma de Fluxo, treino extra pago; ou cortar recompensas finais pela metade | Economia | 4 | 3 |
| Revelar saturações na aba ATRIBUTOS ("máximo de corrida atingido") ou tirar os tetos duros (rendimento decrescente suave) | Atributos | 3 | 1 |
| Finalização: usar `keeperBeat` também em partida ou corrigir o texto; Poder de Disparo dar algo real em partida (ex.: bola forte reduz a "defesa no reflexo") | Atributos | 3 | 2 |
| Afinidade com peso: química alta = companheiro passa/chuta melhor e corre mais (usar o OVR que já é calculado) e tirar a frase "até +2 OVR" enquanto não existir | Relações | 4 | 2 |
| Consequência mostrada depois: escolhas e afinidade citadas em cenas futuras (ex.: Tada lembra a promessa; Bachira não faz tabela se a química < 40) | Narrativa | 4 | 3 |
| Arma descoberta pela história (1ª arma = cena no Cap. 2 escolhendo entre 3 estilos), roleta só para trocar | Armas | 5 | 4 |
| Fluxo raro no fim: rendimento do Ego decrescente (ex.: `0,8 + 1,2·(1−e^(−ego/120))`) e +12 por gol só para gols decisivos | Fluxo | 3 | 1 |
| Ranking do Blue Lock por desempenho (nota/gols mudam o #) em vez de tabela fixa | Progressão | 4 | 3 |
| Bloquear segredo do relógio (dar a arma secreta como cosmético ou Lendária) e limitar troca de dificuldade a "só para baixo" | Economia | 2 | 1 |
| Momentos de decisão narrados na partida (2–3 por jogo: "Tada livre: passar ou chutar?" com consequência na nota/química) | Partida | 4 | 4 |
| Rejogabilidade: eventos aleatórios entre capítulos (lesão, convite, rival provoca) e herança leve entre carreiras (Novo Jogo+ com uma arma guardada) | Rejogabilidade | 3 | 4 |
| Remover `trainWithPartner`/`toggleSquadMember` ou ligar com custo | Código | 1 | 1 |
| Rodar o bot (`audit0/gp`) em CI de balanceamento a cada mudança de fórmula (meta por capítulo e dificuldade) | Processo | 4 | 2 |
