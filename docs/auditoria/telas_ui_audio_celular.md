# FASE 0 — Auditoria de TELAS, UI, NAVEGAÇÃO, GAME FEEL, ÁUDIO E CELULAR

Escopo desta parte: jogar o jogo do título até o fim da carreira, fotografar todas as telas (menos as 63 cutscenes, que são de outro agente), avaliar UI/UX/game feel/áudio/responsividade e listar bugs e backlog. Nenhum arquivo do projeto foi alterado.

## 0. Como foi feito (e limites do método)

- Chrome sem janela via DevTools (cópia do harness em `scratchpad\audit0\run_jpg.ps1`, JPG q80). Correções que fiz **só na minha cópia** do harness: viewport de desktop forçado com `Emulation.setDeviceMetricsOverride` (sem isso o "1366x768" virava 1350x621), confirmação de cada print antes de seguir (sem isso os prints chegavam fora de ordem e com o nome errado), nomes de arquivo higienizados e CPU do celular sem o "throttle x4" (a máquina já é lenta).
- Scripts: `scratchpad\audit0\ui\` (`_pre.js` = utilitários, `r1_inicio.js` título→criação→prólogo, `r2_mapa_abas.js` mapa e abas, `r3_partida_treino.js` treino e partida, `r4_capitulos.js` + `r4b_capitulos.js` capítulos avançados, `r5_principais.js` telas principais em 1920 e no celular). Execução: `audit0\ui_run.ps1` / `ui_batch.ps1`.
- Pulos de capítulo com `App.state.currentChapterIndex` + atributos e moedas forçados. Por isso alguns números nos prints (ex.: "0 partidas" no fim da carreira, "chutes no alvo 0/0" com 1 gol) são efeito do pulo e NÃO foram contados como bug.
- O 3D roda em SwiftShader (sem GPU) com `GL3D.scale` 0,45–0,5: o mapa 3D nos prints está mais borrado do que numa GPU de verdade. Avalie composição, cor e layout, não a nitidez do 3D.
- Hover e foco por Tab não dá para capturar com este harness (eventos sintéticos). Hover/foco foram avaliados pelo CSS.

## 1. Onde estão os prints

`C:\Users\Usuário\Saved Games\BlueLockCareer\audit_screens\telas\`
- `1366x768\` — conjunto completo (105 prints)
- `1920x1080\` — telas principais (21 prints): 01 título, 02–03 criação, 04–05 mapa, 06–11 abas HISTÓRIA/PERFIL/ATRIBUTOS/ARMAS/TREINOS/LOJA, 12–13 VN, 14 cena 3D no meio do capítulo, 15 gol, 15b–15c Fluxo (cena + em campo), 16 pausa, 17 resultado, 18–19 treino e nota
- `celular\` — mesmos 21 nomes com prefixo `retrato_` (390x844, dpr 3, toque) e `paisagem_` (844x390)

Índice do conjunto 1366x768:

| Prints | O que mostram |
|---|---|
| 01–02 | Título sem save (02 = botão principal com foco de teclado: nenhuma diferença visível) |
| 03–07 | Criação: tela inicial (só nome + dificuldade), PERSONALIZAR aberto, meio da rolagem, dificuldades, EGOÍSTA selecionada |
| 08–09 | Primeira entrada no mapa 3D (quarto, tema colégio), aviso "Bem-vindo" |
| 11–12 | Menu ☰ do mapa; aviso de interação "ABRIR ARMÁRIO (PERFIL)" |
| 13–16 | Diálogo VN do prólogo (fala, digitação, escolha com 3 opções, resposta) |
| 17–18 | Partida do prólogo com o tutorial 1/6 |
| 20–30 | Mapa 3D, cada área: quarto, ala dos quartos (com NPC Bachira), saguão, telão do Ego (= sala do monitor/HISTÓRIA), refeitório, ala do treino, academia, campo, escada/subsolo, sala das armas, vestiário |
| 40–50 (+b) | Todas as abas como janela sobre o mapa: HISTÓRIA, PERFIL, ATRIBUTOS, TREINOS, ARMAS (+fim), FLUXO (+fim), LOJA, EQUIPE, RELAÇÕES (+fim), CONQUISTAS (+fim), OBJETIVOS (+fim) |
| 52–53 | Atributo subindo (+) |
| 54–57 | Giro da roleta de armas (gacha) e resultado |
| 58 | Compra na LOJA |
| 59–60 | "Modo clássico" (abas no topo, sem mapa) |
| 61–63 | Título com save, "Nova carreira", Modo Dupla |
| 70–73 | Treino: VN de abertura, minigame "100 gols", acerto, tela de nota |
| 74–89 | Partida do Cap. 1: VN pré-jogo, cena 3D do capítulo no meio, ataque/carga de chute, GOL (efeito), depois do gol, Fluxo sem fluxo equipado, skill da arma, pausa, pós-jogo, resultado (vitória), mapa depois do capítulo, HISTÓRIA com o próximo capítulo, DERROTA |
| 100–103 | Torneio de Trios (HISTÓRIA + escolha do trio), tema Sub-20 no mapa e na HISTÓRIA |
| 104–108 | NEL: VN do draft, escolha do clube, clube escolhido, tema NEL no mapa, tabela e ranking de valor |
| 109 | Copa Sub-20 (chave) |
| 110–116 | Carreira pro: propostas de clube, apartamento, cidade (portaria, rua, praça), liga pro |
| 117–120b | Copa do Mundo adulta (grupo e caminho até a taça), final, fim de carreira, mapa no fim |
| 121 | Título depois de campeão |

## 2. Fluxo de telas (como estão ligadas hoje)

```
TÍTULO ─┬─ COMEÇAR/NOVA CARREIRA → CRIADOR (nome+dificuldade; ✏️ abre PERSONALIZAR) → MAPA 3D
        ├─ CARREIRA n (continuar) → MAPA 3D
        ├─ 🤝 MODO DUPLA (sala online) ─ ✕ volta ao título
        ├─ 🛒 LOJA (entra na carreira e abre a aba LOJA)
        └─ EXPORTAR / IMPORTAR SAVE
MAPA 3D (HUD: cartão do jogador, nome da área, ☰ MENU, minimapa, teclas)
   ├─ andar até um "spot" + E → janela da aba (✕ VOLTAR AO MAPA / ESC)
   ├─ ☰ MENU → 11 abas · SOM · MODO CLÁSSICO (ABAS) · TELA INICIAL · FECHAR
   └─ telão do Ego / aba HISTÓRIA → JOGAR CAPÍTULO
          → VN (falas + escolhas) → [cenas 3D/2D] → PARTIDA (tutorial na 1ª) → PAUSA (ESC)
          → pós-jogo (VN/cena) → modal de RESULTADO (vitória) ou DERROTA (tentar de novo / ir treinar) → MAPA
          → (NEL: draft VN → escolha do clube) (Pro: propostas) (Trios: monte seu trio)
TREINOS (aba) → VN curto → MINIGAME → modal de NOTA (S/A/B/C) → aba TREINOS
ARMAS/FLUXO → GIRAR → animação da roleta → modal "NOVA ARMA DESPERTADA"
```

## 3. Avaliação tela a tela (olhar de diretor de arte)

**Título (01, 61, 121; 1920/01).** Bonito e com identidade: logo itálico pesado com brilho, faixa "EGOIST CAREER", grade em perspectiva, menu de botões chanfrados. Problemas: o boneco de pixel ocupa metade da tela (sprite gigante, ~600 px de altura em 1366, ~850 px em 1920) e o logo é fonte de sistema (Segoe UI 900 itálico), não pixel; o choque "pixel gigante x tipografia vetorial lisa" é o maior sinal de mistura de linguagens do jogo. Em 1920 sobra um vazio enorme entre menu e boneco. Aparece uma barra de rolagem vertical na borda direita em 1366 (a página rola 1–2 px).

**Criação (03–07; 1920/02–03).** A primeira visão mostra só nome + dificuldade; a personalização (cabelo, olhos, pele, posição, pé) fica escondida atrás do ✏️ com a dica "Clique no ✏️ para mudar o nome e PERSONALIZAR". Muita gente vai começar sem descobrir que dava para personalizar. Com o painel aberto vira uma parede vertical de 1.379 px (rolagem dupla em 1366). Grade de 25 cabelos e 7 olhos funciona; as miniaturas são do próprio boneco (bom). As 3 dificuldades estão claras, mas a da EGOÍSTA é uma parede de texto (5 linhas). 60 dos 98 botões da tela têm menos de 32 px de altura.

**Mapa 3D (08–30, 102, 107, 112–117, 120b).** O ponto mais forte de "jogo de verdade": salas com luz, neon, cartazes, temas por fase (colégio laranja, Blue Lock ciano, Sub-20 vermelho/azul, NEL nas cores do clube, Pro marrom/dourado, Copa dourado) e a cidade da fase pro (rua com carros, placas, pedestres) é ótima. HUD enxuto (cartão, nome da área, ☰, minimapa, teclas). Problemas:
- **Câmera colada no jogador**: quando há mesa, parede ou NPC atrás, a câmera encosta e o boneco vira um sprite gigante cortado embaixo da tela (refeitório 24, saguão 22/120b, ala dos quartos 21, praça 115 com um NPC gigante cortado no canto). É exatamente o "sprite gigante/cortado" que o dono odeia.
- **Reflexo espelhado dos bonecos no piso** em todas as salas (13, 22, 24): parece fantasma/erro, não chão encerado.
- Objetos perto da câmera ficam enormes e borrados (quadro de cortiça e bebedouro em 21, rede de gol e alambrado em 115).
- NPC sobrepõe o jogador (Bachira "dentro" do boneco em 21).
- **Sem indicação do próximo objetivo no mapa**: o cartão diz "CAP. 5 • 2ª Seleção", mas nada aponta para o telão do Ego (onde se joga o capítulo). Na primeira entrada (09) o jogador nasce no quarto sem saber para onde ir.
- "OVR 0" no cartão no começo da carreira (os atributos começam em 0; fica parecendo bug).
- Sala das armas (29): o jogador não aparece no quadro e a roleta fica cortada na borda; a sala é escura e sem ponto focal.
- Telão do Ego (23): o texto "PRÓXIMO DESAFIO • CAP. 5" é pequeno e borrado; é o objeto mais importante do mapa e não se lê de longe.

**Menu ☰ (11).** Claro, grade 3x4 com emoji + rótulo, mas é outro estilo (cantos arredondados, borda ciano fina) em relação às abas (cantos cortados neon). Há uma barra vazia entre as abas e a linha SOM/MODO CLÁSSICO (elemento sem conteúdo). Não existe "Configurações".

**Abas como janela sobre o mapa (40–60).** Consistentes entre si (ATRIBUTOS, HISTÓRIA, PERFIL, ARMAS, FLUXO, LOJA, TREINOS, EQUIPE, RELAÇÕES, CONQUISTAS, OBJETIVOS usam a mesma linguagem: navy, cantos cortados, itálico 900, faixa "EGOIST X" no topo). É a parte mais profissional da UI. Problemas:
- Cabeçalho da janela corta o nome ("KENJI AR…", "KENJI …") e a fase ("2ª S…", "LIGA NE…", "COPA …") em 1366.
- Barra de rolagem horizontal em TREINOS, CONQUISTAS e OBJETIVOS (conteúdo 15 px mais largo que a janela).
- ARMAS tem 10.178 px de altura (catálogo de todas as armas = 15 telas de rolagem); FLUXO 3.493 px; RELAÇÕES 3.573 px. Falta filtro/abas internas.
- Cartões de RELAÇÕES cortam a descrição com "…" em todos os personagens; texto 10–11 px.
- Textos de arma genéricos de modelo ("Avança em velocidade usando a técnica principal de X", "Finalização especial carregada com a aura de X") — repetidos em dezenas de armas.
- OVR 0 / "CLASSIFICAÇÃO G • INICIANTE (0)" / "MÉDIA 0" no começo: tela de atributos parece vazia/quebrada.
- Hierarquia boa na HISTÓRIA (número do capítulo grande, VS, botão JOGAR CAPÍTULO destacado), mas a contagem de capítulos diverge: "CAPÍTULO 5 DE 20" / "CAP. 05 / 20" no topo x "21 CAPÍTULOS" / "05/21" na linha do tempo.
- Duas "rankings" na mesma tela da NEL: "RANKING BL #5" no cabeçalho e "você é o #27" no Ranking de Valor (108b) — confunde.
- Modais de escolha (Trio 101, clube NEL 105, propostas 110) usam um terceiro estilo, mais antigo: caixas retas com borda colorida, texto 9–11 px Arial/Segoe, sprites pequenos. Destoam das abas novas.

**Modo clássico (59–60).** A barra de abas não cabe em 1366: "☰ MENU" sai cortado na direita. Funciona como plano B, mas duplica caminhos (mapa + abas) e não diz ao jogador qual é o modo "certo".

**Diálogo VN (13–16, 70, 74, 104).** No 3D, com os bonecos no cenário da fase e caixa escura na parte de baixo: legível e limpo. Escolhas com etiqueta "💬 Afeta a relação com Tada" (bom: mostra consequência). Problemas: os números nas costas dos jogadores saem invertidos ("EPS", "E5", "OT" — 74 e 1920/12); a caixa de diálogo é semitransparente sobre a multidão de bonecos, o que suja a leitura; o close do personagem (15, 70) amplia o sprite até ~400 px e fica cortado pela caixa de diálogo (sprite gigante/cortado); reflexo dos bonecos no piso; o botão PULAR fica embaixo à direita, enquanto nas cenas 3D fica em cima à direita como "AVANÇAR ▶ / PULAR ▶▶" (dois padrões de pular). O treino abre com uma VN genérica ("vou destruir todos os alvos desse minigame") que quebra a imersão e sempre se repete.

**Partida (17–18, 75–84; 107, 113 por tabela).** Campo legível, bonecos pequenos mas nítidos, nomes em cima, mira com "CHANCE DE GOL x%", minimapa. Game feel do gol é bom (78): faixa diagonal "GOOOOOL!!", partículas, flash branco, tremida, hit-stop, torcida. Problemas:
- Placar: "META 0/1 GOLS" encosta em "NOTA" ("GOLSNOTA", 18) e o botão "PAUSA ESC" sai cortado na direita em 1366.
- Barra de baixo mostra "Skill 1 / Skill 2 / Skill 3" fixos, em inglês, mesmo com arma equipada (os nomes reais só aparecem no painel do canto) e sem as skills 4–6 da 2ª arma (index.html:490-501; nenhum JS atualiza `#hud-skill-*`).
- Painel "HABILIDADES • CHANCE DE ACERTO" corta os nomes sem reticências ("Gyro Shot (Chute Giroscópi", "(Aguilhão da Abel") e cobre jogadores (nome "…ANZE" atrás dele em 107).
- Números flutuando sobre os bonecos: "-0.3 PERDEU A BOLA", "+1.0", "-0.1 DRIBLE FALHOU" (78, 81, 83) — exatamente o "número flutuando no rosto" que o dono não gosta.
- Texto do gol em dobro: faixa gigante "GOOOOOL!!" + barra de baixo "GOOOOL NO FUNDO DA REDE! (1 x 0) Marcado por…" ao mesmo tempo.
- Avisos (toast) aparecem por cima do HUD da partida (83: "CONQUISTA DESBLOQUEADA" tapa os botões de skill e corta a faixa "RABONA … FALHOU! (70% de ch").
- No treino o HUD mostra NOTA, FLUXO e QUÍMICA, que não valem nada ali; a faixa diz "MINIGAME: SIMULADOR…" (palavra de desenvolvedor).
- Não há intervalo/meio-tempo; a partida é um bloco só (~3 min).
- `#match-intro-modal` ("ENTRAR EM CAMPO ▶") nunca é aberto: código morto.

**Resultado / Derrota / Nota do treino (73, 86, 89).** Claros e com ação seguinte ("CONTINUAR", "TENTAR DE NOVO / IR TREINAR"). Mas hierarquia invertida na vitória: "VITÓRIA! (3 X 1)" é um texto cinza pequeno e o título do capítulo é o maior elemento; recompensas em lista de texto simples, sem contagem animada. No treino: "OVERALL 14 → 14" depois de +7 pontos de atributo — o jogador não sente o ganho.

**Gacha (54–57).** Bom: carrossel de cartas, destaque com cantos, ficha com teclas 1/2/3 e passiva, botão "ESSE É O MEU EGO ▶". A carta usa o retrato do personagem que inspira a arma (Yuzu) — ok. O resultado de raridade baixa não tem "estouro" diferente (o `playRarityBurst` existe para Lendário+).

**Modo Dupla (63).** Funciona e é claro, mas usa outra paleta (roxo + amarelo) e outro desenho de modal; parece outro jogo.

**Fim de carreira (120–121).** "FIM • CAMPEÃO DO MUNDO" com fogos e o time — boa recompensa. O título passa a mostrar "Campeão do Mundo • Ranking #1" (bom).

## 4. Consistência visual (contagem no código)

| Medida | Valor | Leitura |
|---|---|---|
| Arquivos CSS | 11 (≈17.900 linhas) | cada "agente" criou o seu: style, atributos, ui_shell, ui_historia, ui_perfil, ui_colecao, ui_time, mobile, mobile_telas, duo, hub |
| Conjuntos de variáveis com prefixo próprio | `--sh-*`, `--prf-*`, `--col-*`, `--atr-*`, `--tm-*` + `--bg-`, `--accent-`, `--text-` do style.css (≈150 variáveis em 8 arquivos) | não há um design system único; cada módulo redefine a mesma fonte e cores |
| Famílias de fonte | Segoe UI (com Tahoma/Verdana/sans-serif) em todo o HTML; no canvas: Segoe UI, monospace (21×), Georgia/serif (9×), Impact (1×), Arial Black (1×); fonte de pixel 3x5 própria só nos letreiros do mapa (hub.js) | 6 famílias + pixel. **Segoe UI só existe no Windows**: no Android/iPhone o jogo cai em outra fonte e muda de cara |
| Tamanhos de fonte distintos no CSS | 59 (de 8,5 px a 58 px, incluindo 9,5 / 10,5 / 11,5 / 12,5 / 13,5) | sem escala; 160 declarações abaixo de 11 px |
| Cores hex distintas | 311 no CSS, 2.216 no JS | |
| rgba() distintos no CSS | 295 | |
| `style="…"` inline | 77 no index.html + 152 em templates JS | cores e tamanhos soltos |
| Emojis usados como ícone | 81 diferentes (🔒 🍀 ⚡ ✏️ 🏆 🔥 ⚽ 🧪 🎬 🎰 💠 🥚 👑 🎲 …) | emoji de sistema não é pixel art e muda de desenho em cada aparelho |
| clip-path (cantos cortados) | 147 | é a assinatura visual, mas corta o contorno de foco |
| Durações de transição distintas | 54 | sem tokens de motion |
| @keyframes | 80 | |

Estilos de componentes que convivem hoje: (1) abas novas "cantos cortados neon itálico" (ui_*), (2) modais antigos de escolha/derrota (style.css), (3) menu ☰ e HUD do mapa (hub.css), (4) Modo Dupla roxo/amarelo (duo.css), (5) HUD da partida com `kbd` coloridos (style.css), (6) letreiros em fonte de pixel dentro do 3D. O núcleo (1) é bom e deveria virar o padrão de todos.

Direção de arte x UI: o mundo é pixel art (bonecos, mapa, partida), mas toda a interface é vetorial lisa com fonte de sistema itálica e emojis. Não chega a brigar, porque o estilo das abas é forte, mas o jogo não tem uma "voz" tipográfica própria.

## 5. Navegação

- Sempre há saída nas janelas: "✕ VOLTAR AO MAPA" + ESC; criação tem VOLTAR; derrota tem TENTAR DE NOVO/IR TREINAR. Bom.
- Dois jeitos de navegar (mapa 3D com spots e ☰, ou "modo clássico" com abas) — o clássico fica escondido no ☰ e duplica tudo.
- Falta um "objetivo atual" visível fora da aba HISTÓRIA/OBJETIVOS: no mapa não há seta, marcador ou destaque no minimapa para o telão do Ego; o cartão só diz o nome do capítulo. O mapa é grande (quarto → ala → saguão).
- Os spots têm nomes claros no aviso ("ABRIR ARMÁRIO (PERFIL)", "PRÓXIMO CAPÍTULO (HISTÓRIA)") — bom; mas só aparecem quando você já está perto.
- Abas muito longas (ARMAS 15 telas) sem âncoras/filtros.
- VN não tem "voltar fala" nem histórico (o código diz "SEM botão de voltar"); PULAR para na próxima escolha (bom).

## 6. Onboarding (primeiros 5 minutos)

1. Título → COMEÇAR CARREIRA (claro).
2. Criação: só nome + dificuldade; personalização escondida no ✏️.
3. Mapa: nasce no quarto, aviso "Bem-vindo" + aviso do sorteio de nascimento ("você nasceu com o pé DIREITA. AMBOS só libera no OVR 52") — o segundo é jargão no 1º segundo. Barra de teclas embaixo. **Nenhuma instrução de para onde ir.**
4. Achar o telão/HISTÓRIA → VN de 5 falas + 1 escolha (curta, ok).
5. Partida do prólogo com tutorial de 6 passos que **ensina fazendo** (cada passo só avança quando você executa: WASD, chute etc.) — é o melhor onboarding do jogo.
6. Primeira visita às abas: ATRIBUTOS/TREINOS/ARMAS têm parágrafos explicativos e números (OVR 0, rank G); o mapa de OBJETIVOS explica bem a rota.

Veredito: o tutorial da partida é bom; o que falta é o "primeiro passo" no mapa (objetivo destacado) e reduzir os textos de regra nas primeiras janelas.

## 7. Game feel

| Ação | Resposta hoje |
|---|---|
| Clique em botão | `:hover` em 84 regras, `:active` em 19; som de clique só em troca de aba, menu ☰, criador e pausa. A maioria dos botões das abas não toca som |
| Hover | só visual (sem som); não testável no harness |
| Abrir janela de aba | animação `hub-glass-in` (vidro) — boa |
| Atributo subindo (+) | número e linha piscam (`atr-up`/`atr-pop`) e o radar anima 0,45 s; **sem som**; ganho de 1 ponto quase invisível (52) |
| Compra na loja | jingle + aviso |
| Conquista | só aviso de texto (sem som próprio, sem partículas), e o aviso pode tapar o HUD da partida |
| Gol | faixa diagonal, partículas, flash 0,85, tremida, hit-stop, som de torcida — **o ponto alto** |
| Defesa/trave/carrinho/drible | sons próprios + faixas "DESARME DE…", "DRIBLE FALHOU" |
| Fluxo | jingle "sawtooth" + cena do despertar + partículas + faixa (se não tiver fluxo: faixa de aviso) |
| Nota do treino | modal com letra grande S/A/B/C + jingle diferente por nota |
| Transições de tela | VN com letterbox; cenas 3D com barra superior; título → criador e mapa → partida são cortes secos |

## 8. Legibilidade e acessibilidade

- Contraste: textos principais bons (branco/ciano sobre navy). Fracos: cinza-azulado 10–11 px em descrições (ATRIBUTOS, RELAÇÕES, TREINOS), rótulos "EGOIST PROFILE" quase invisíveis, legendas do telão do Ego.
- **Foco de teclado praticamente invisível**: só 3 regras `:focus-visible` (abas do topo e CTA da HISTÓRIA). Nos demais botões o contorno padrão é cortado pelo `clip-path` (02: foco no botão principal = nenhuma mudança). 5 regras tiram o `outline`.
- `prefers-reduced-motion` respeitado em 6 CSS, **mas não no canvas** (tremida, flash branco de 85% em tela cheia no gol, cenas) e não existe opção no jogo.
- Áreas de toque: ver seção 9.
- 8 elementos `div/span/canvas` com `onclick` (não acessíveis por teclado); 32 atributos aria/role no total.

## 9. Responsividade

Como o jogo trata o celular (`js/mobile.js`, `css/mobile.css`, `css/mobile_telas.css`, `css/hub.css`): liga em aparelho de toque (`pointer: coarse`) ou `?touch=1`; a partida ganha joystick + botões grandes (CHUTAR com mira por arraste, PASSE/PEDIR, DRIBLE, CARRINHO, CORRER, FLUXO, QUÍMICA, 1–3); a partida e as cenas são desenhadas **giradas 90° com o celular em pé** ("só deitado", `html.tc-deitado`); há "TAMANHO DA TELA" (título e pausa) e "TAMANHO DO HUD" (pausa); as abas viram uma coluna (≤600 px) ou ficam mais baixas (paisagem ≤500 px de altura).

**1920x1080 (prints `1920x1080\01–19`).** Tudo funciona, mas a interface não cresce com a tela: o HUD do mapa (cartão, dicas, minimapa) e o HUD da partida ficam pequenos (textos de 10–11 px num monitor grande) e os bonecos da partida têm ~40 px de altura. O título fica com um vazio enorme entre o menu e o boneco; a criação fica encostada à esquerda. As janelas das abas ficam à direita com o 3D à esquerda (intencional, fica bonito). Mesmo em 1920 os rótulos de ATRIBUTOS são cortados ("PODER DE DISPA…", "HABILIDADE AÉ…", "CONDUÇÃO DE B…"). Em ATRIBUTOS o boneco tem um halo/aura laranja atrás (o dono não gosta de aura).

**Celular em pé 390x844 (prints `celular\retrato_*`).**
- Bom: título adaptado (logo e botões grandes, "TAMANHO DA TELA"), abas em coluna única com texto grande (HISTÓRIA, ATRIBUTOS, TREINOS, LOJA ficam legíveis), VN em pé com caixa de diálogo larga, controles de toque da partida grandes e bem separados (`retrato_18`), pausa com tamanho do HUD/tela.
- **Criação cortada na lateral**: o conteúdo é mais largo que a tela; ao tocar no ✏️ (o campo de nome ganha foco) a tela rola para o lado e corta a esquerda ("…EIRA • PASSO 1", "O SEU JOGADOR", "RSONALIZAR", "ÁCIL", "ORMAL") com barra de rolagem horizontal (`retrato_02`, `retrato_03`). 67 de 105 alvos de toque da criação têm menos de 44 px.
- **Mapa em pé**: metade de baixo da tela é só piso; some o nome da área, o minimapa e a dica de controles — não há nenhuma indicação de que se anda arrastando o dedo (`retrato_04/05`).
- **Resultado da partida**: a nota gigante "7.6" fica por cima do texto das estatísticas (`retrato_17`).
- **ARMAS**: o retrato grande do personagem da arma passa por cima do texto da passiva (`retrato_09`); "Inspiração Kenyu …" cortado.
- **Dicas de teclado no celular**: "TECLAS 1·2·3" (ARMAS), "WASD + Shift" (TREINOS), "FÔLEGO SHIFT", "[ESPAÇO] Drible", "[F] Carrinho" no HUD, faixa "Aperte [R] para pedir o passe".
- Cenas 3D e partida giradas 90° enquanto VN e abas ficam em pé: o jogador precisa girar o celular várias vezes no mesmo capítulo (`retrato_14/15` girados x `retrato_12` em pé).
- Cabeçalho do card da HISTÓRIA corta "CAP. 01 / 20 • 5% DA C…" na direita (`retrato_06`).
- Botões com menos de 44 px de altura: PERFIL 11, ATRIBUTOS 16.

**Celular deitado 844x390 (prints `celular\paisagem_*`).**
- Bom: partida com HUD de toque bem montado (`paisagem_15c`), mapa com HUD enxuto, criação sem corte lateral.
- Título: o botão "IMPORTAR SAVE" se estica por cima do boneco gigante, cortando o boneco no meio (`paisagem_01`).
- Resultado: o modal não cabe em 390 px; o botão CONTINUAR fica abaixo da dobra (`paisagem_17`).
- ATRIBUTOS: em 390 px de altura só cabe o cabeçalho do painel (OVR + SP); o boneco e os atributos exigem rolar (`paisagem_08`).
- Partida: painel "HABILIDADES" (com teclas [ESPAÇO]/[F]) cobre o canto do campo; botões G/C/1/2/3 tapam a faixa de aviso; o rótulo CARRINHO cobre o nome de um jogador; sem as barras de FLUXO/QUÍMICA no topo (só nos botões).

**Nota de responsividade: 6/10.** Existe um trabalho real de celular (controles de toque bons, tamanho de tela/HUD, layouts próprios), mas há corte lateral na criação, sobreposições (resultado, ARMAS, título deitado), dicas de teclado no toque, mapa em pé sem orientação e HUD que não escala no 1920.

## 10. Textos em inglês e sobras de protótipo

- Inglês visível: "Skill 1/2/3" (HUD da partida), "BLUE LOCK TRAINING CENTRE" / "TRAINING LAB" (aba TREINOS e VN do treino), "EGOIST PROFILE / ENTRY / ARSENAL / FLOW / SHOP / TROPHY ROOM / ROUTE / LOCKER", "CHEMISTRY LINK", "WORLD CUP GRAND FINAL – CATHEDRAL OF FOUR EGOS" (arte da HISTÓRIA), "COACH / EGO" (VN antigo). Alguns são estilo do anime (aceitável se for decisão); "Skill" e "TRAINING LAB" são sobra.
- Palavra de desenvolvedor na tela: "MINIGAME" (aba TREINOS e faixa do treino), "Modo clássico (abas)".
- Sobras no `index.html`: `#match-intro-modal` nunca aberto; overlay VN antigo (nuvens, prédio "TRAINING CENTRE", patrocinadores "EMILIA AUTO / DUCALE…", "CLIQUE PARA CONTINUAR") escondido no modo 3D; botões "🎥 SELECIONAR ÂNGULO DA CÂMERA [1] Disputa & Sorte…" do overlay sakuga antigo; comentários "IGUAL À PRINT 2/3".
- Rótulo "PULAR >>" (VN) x "PULAR ▶▶" (cenas 3D).

## 11. Áudio (lido no código: `js/sound_engine.js`, `js/music_engine.js`)

- **Motor**: Web Audio sintetizado na hora (sem arquivos). `SFX.init()` só registra; o `AudioContext` nasce no primeiro `pointerdown`/`keydown` (`unlock`) → **nada toca antes da 1ª interação** (correto).
- **Canais**: um único `master` (ganho 0,55). A música passa por um compressor que também cai no `master`. **Não há canais separados** de música / efeitos / voz-UI e **não há controle de volume**; só um botão SOM (mudo).
- **Mudo salvo**: `localStorage['bluelock_muted']` (respeita também a música de arquivo). Volume não é salvo porque não existe.
- **Efeitos que existem**: chute (com força), passe, whoosh, carrinho, defesa (+ "uuuh"), trave, gol (normal/no ângulo, com torcida), gol sofrido, apito (1–3), página, blip, jingle (genérico), clique, torcida contínua com tensão que sobe perto do gol.
- **Por evento pedido no prompt**: clique = sim só em alguns lugares (troca de aba, ☰, criador, pausa); hover = **não**; notificação = **não** (aviso é mudo); atributo subindo = **não**; gol = sim; apito = sim (início/fim); eliminação/derrota = **não** (a tela de DERROTA é muda; o apito de fim já tocou); despertar do ego/Fluxo = jingle sawtooth + som da cena; entrada no Fluxo = mesmo jingle; nota do treino = jingle por nota; compra = jingle.
- **Música**: 8 temas sintetizados (u20, epic, victory, tension, travel, mystery, dread, promise) **só tocam em diálogos e cenas** (definidos por `music:` nas falas: epic 46×, dread 41×, tension 35×, mystery 34×…). **Título, mapa, abas, treino e partida não têm música** (a partida tem só torcida). Troca de faixa = fade-out 0,6 s + fade-in 1,2 s (crossfade aproximado, ok).
- **Músicas próprias**: `probeMusicFiles()` tenta carregar `musica/<tema>.mp3` para os 8 temas em toda abertura. A pasta só tem `LEIA-ME.txt` → **8 erros vermelhos no console a cada carregamento**.

## 12. Console

Em todas as execuções (título, criação, prólogo, mapa e todas as áreas, todas as abas, gacha, loja, modo clássico, Modo Dupla, treino, partida, pós-jogo, derrota, NEL, Pro, cidade, Copa, fim de carreira; em 1366, 1920, celular em pé e deitado): **0 exceções JS, 0 `console.error`, 0 `console.warn`**. O único ruído são os 8 `Failed to load resource: net::ERR_FILE_NOT_FOUND …/musica/{u20,epic,victory,tension,travel,mystery,dread,promise}.mp3` em toda abertura da página.

## 13. Bugs de UI e de fluxo

Gravidade: crítico = trava/perde progresso; alto = atrapalha jogar ou parece quebrado para todo mundo; médio = visível e incômodo; baixo = acabamento. Prints relativos a `audit_screens\telas\`.

| # | Bug | Como reproduzir | Grav. | Print | Onde |
|---|---|---|---|---|---|
| B1 | Barra de skills da partida mostra "Skill 1 / Skill 2 / Skill 3" fixos (inglês), nunca o nome das skills da arma; as skills 4–6 (2ª arma, NEL) nunca aparecem na barra; os botões aparecem mesmo sem arma | Equipar uma arma → jogar um capítulo → olhar a barra de baixo | alto | 1366x768/18, 78, 107, 113 | `index.html:490-501`; nenhum JS atualiza `#hud-skill-1..6` |
| B2 | Criação no celular em pé: conteúdo mais largo que a tela; ao tocar no ✏️ a tela rola para o lado e corta toda a coluna esquerda (barra horizontal) | Celular 390x844 → COMEÇAR CARREIRA → ✏️ | alto | celular/retrato_02, retrato_03 | `#creator-screen` em `css/ui_perfil.css` / `css/mobile_telas.css` (≤600 px) |
| B3 | Números das costas aparecem invertidos (de cabeça para baixo/ordem trocada): "EPS", "E5", "OT" | Qualquer diálogo 3D com jogadores de costas (ex.: pré-jogo do Cap. 1) | médio | 1920x1080/12; 1366x768/74; celular/retrato_12 | desenho do número nas costas do sprite V2: `js/sprite_rig.js:1467-1476` (provável eixo invertido) |
| B4 | "META x/y GOLS" encosta em "NOTA" (lê-se "GOLSNOTA") e o botão "PAUSA ESC" sai cortado na direita | Prólogo, NEL ou liga em 1366x768 | médio | 1366x768/18, 107, 113 | `index.html:441-442` + `.fullscreen-hud-top` (`css/style.css`) |
| B5 | 8 erros vermelhos no console em toda abertura (`ERR_FILE_NOT_FOUND musica/*.mp3`) | Abrir o jogo sem mp3 em `musica/` | médio | — | `js/music_engine.js:312-324` (`probeMusicFiles`) |
| B6 | Sobreposições no celular: nota "7.6" por cima das estatísticas no resultado (em pé); retrato da arma por cima da passiva (ARMAS, em pé); "IMPORTAR SAVE" por cima do boneco (título deitado); CONTINUAR abaixo da dobra no resultado (deitado) | Jogar no celular e abrir essas telas | médio | celular/retrato_17, retrato_09, paisagem_01, paisagem_17 | `css/mobile_telas.css`, `css/ui_colecao.css`, `css/ui_shell.css` |
| B7 | Dicas de teclado em aparelho de toque: "TECLAS 1·2·3", "WASD + Shift", "FÔLEGO SHIFT", "[ESPAÇO] Drible", "[F] Carrinho", "Aperte [R]…" | Celular → ARMAS / TREINOS / partida | médio | celular/retrato_09, retrato_10, paisagem_15c | textos fixos em `js/ui_colecao.js`, `js/ui_time.js`, `index.html:445-455`, `match_engine` |
| B8 | Câmera do mapa encosta no jogador perto de mesa/parede/NPC: ele vira um sprite gigante cortado no pé da tela; objetos perto da câmera ficam enormes e borrados | Andar no refeitório entre as mesas, no saguão perto do sofá, na ala dos quartos ao lado de um NPC, na praça | alto (direção de arte) | 1366x768/21, 22, 24, 115, 120b | `js/hub3d.js` (`CAM_BACK`, recuo da câmera) / `js/hub3d_gl.js` |
| B9 | Reflexo espelhado dos bonecos no piso de todas as salas (parece fantasma) | Qualquer sala; também nos diálogos 3D | médio | 1366x768/13, 22, 24, 74 | `js/hub3d_gl.js` (`drawWorld(..., mirror)` / `uUseRefl`) |
| B10 | Barra de rolagem horizontal dentro da janela em TREINOS, CONQUISTAS e OBJETIVOS | Abrir essas abas pelo mapa em 1366x768 | médio | 1366x768/43, 49, 50 | `css/ui_time.css` dentro de `body.hub-panel .main-workspace` |
| B11 | Cabeçalho da janela corta nome e fase ("KENJI AR…", "KENJI …", "2ª S…", "LIGA NE…", "COPA …") | Qualquer aba pelo mapa em 1366 | médio | 1366x768/40–50, 108, 118, 120 | `.ego-subheader` com `right: 260px` (`css/hub.css:247-253`) |
| B12 | Aviso (toast) por cima do HUD da partida: tapa os botões de skill e corta a faixa de informação | Usar a skill 1 pela 1ª vez numa partida (conquista "Domínio das Skills") | médio | 1366x768/83 | `.ego-toast` (z-index 3000, `css/style.css:1401`) sem regra para a partida |
| B13 | Foco de teclado invisível na maioria dos botões (o `clip-path` corta o contorno; só 3 regras `:focus-visible`) | Título → focar "COMEÇAR CARREIRA" | médio (acessibilidade) | 1366x768/01 x 02 | `css/ui_shell.css:790+` e demais botões chanfrados |
| B14 | "OVR 0" / "CLASSIFICAÇÃO G • INICIANTE (0)" no começo; no treino "OVERALL 14 → 14" depois de +7 pontos | Nova carreira → ATRIBUTOS; treino com nota B | médio (parece quebrado / ganho invisível) | 1366x768/08, 42, 73 | `App.calculateOVR` (`js/app.js:999`, soma/22) |
| B15 | Mapa no celular em pé: sem nome da área, sem minimapa, sem dica de controle (como andar?) e metade da tela é piso | Celular em pé → entrar na carreira | médio | celular/retrato_04, retrato_05 | `css/hub.css` (media ≤760 px esconde HUD) |
| B16 | Contagem de capítulos diferente na mesma tela: "CAPÍTULO 5 DE 20" / "CAP. 05 / 20" x "21 CAPÍTULOS" / "05/21" | Aba HISTÓRIA | baixo | 1366x768/40, 108; 1920x1080/06 | `js/ui_historia.js` |
| B17 | Painel "HABILIDADES • CHANCE DE ACERTO" corta nomes sem reticências e cobre jogadores | Arma com nome longo | baixo | 1366x768/78, 107 | HUD em `js/match_engine.js` |
| B18 | Modo clássico: barra de abas não cabe em 1366 ("☰ MENU" cortado) | ☰ → MODO CLÁSSICO (ABAS) | baixo | 1366x768/59–60 | `.top-nav-bar` (`css/ui_shell.css`) |
| B19 | Faixa vazia no menu ☰ entre as abas e a linha SOM/MODO CLÁSSICO | Abrir ☰ no mapa | baixo | 1366x768/11 | `js/hub.js:1615-1624` + `css/hub.css` |
| B20 | Gol mostra o texto duas vezes (faixa gigante + faixa de baixo) | Fazer um gol | baixo | 1366x768/78; 1920x1080/15 | `js/match_engine.js:4037-4038` |
| B21 | Rótulos de ATRIBUTOS cortados mesmo em 1920 ("PODER DE DISPA…", "HABILIDADE AÉ…", "CONDUÇÃO DE B…") | ATRIBUTOS pelo mapa | baixo | 1920x1080/08 | `css/atributos.css` |
| B22 | Dois padrões de pular cena: "PULAR >>" embaixo (VN) x "AVANÇAR ▶ / PULAR ▶▶" em cima (cenas 3D) | Diálogo e depois cena 3D | baixo | 1366x768/13, 76 | `index.html:608` x `js/cine3d.js` |
| B23 | Código morto: `#match-intro-modal` nunca abre; overlay VN antigo e botões de ângulo do sakuga antigo seguem no HTML | — | baixo | — | `index.html:514-610` |
| B24 | Sala das armas: virado para o sul o jogador some do quadro e a roleta fica cortada | Entrar pela escada | baixo (visto só por teleporte) | 1366x768/29 | `js/hub3d.js` |

Nenhum bug crítico (travamento ou perda de save) apareceu nos fluxos jogados.

## 14. Notas (0–10)

- **Visual geral e consistência: 6/10.** As abas novas, o mapa 3D com temas por fase e a cidade têm nível de indie caprichado. Perde por 5–6 estilos de componente convivendo (modais antigos de escolha, menu ☰, Modo Dupla roxo/amarelo), 6 famílias de fonte + 81 emojis como ícone, 59 tamanhos de fonte, Segoe UI que muda no celular, sprite gigante no título/VN/mapa, reflexo fantasma no piso e números das costas invertidos.
- **UI e navegação: 6/10.** Sempre há voltar (✕/ESC), as abas têm boa hierarquia, o menu ☰ é claro e os spots dizem o que fazem. Perde por não mostrar o próximo objetivo no mapa, abas gigantes sem filtro (ARMAS = 15 telas), cabeçalho cortando texto, rolagem horizontal e dois modos de navegação concorrendo.
- **Game feel: 7/10.** O gol é muito bom (faixa, partículas, flash, tremida, hit-stop, torcida), a nota do treino e o gacha satisfazem, o tutorial ensina fazendo. Fora da partida a UI é "muda": atributo subindo quase não se nota, conquista é só texto, a maioria dos cliques sem som, números flutuando na cabeça dos jogadores, transições de tela secas.
- **Áudio: 4/10.** Efeitos sintetizados decentes na partida, música própria nas cenas, mudo salvo, nada toca antes do 1º clique. Mas sem canais, sem volume, sem música no título/mapa/partida, sem som de hover/aviso/atributo/derrota e com 8 erros de mp3 no console.
- **Responsividade: 6/10.** Ver seção 9.

## 15. Backlog da minha parte

Ordenado por impacto alto e esforço baixo primeiro.

| # | Tarefa | Área | Impacto | Esforço | Prioridade |
|---|---|---|---|---|---|
| 1 | Barra de skills da partida com nome/ícone real das skills 1–6 (e esconder sem arma) | UI partida | 4 | 1 | P1 |
| 2 | Corrigir a largura da criação no celular em pé (sem rolagem lateral) | Celular | 4 | 1 | P1 |
| 3 | Corrigir número das costas invertido no sprite V2 | Pixel art | 3 | 1 | P1 |
| 4 | Parar de procurar mp3 inexistentes (lista de faixas ou só sob demanda) → console limpo | Áudio/console | 3 | 1 | P1 |
| 5 | Tirar o reflexo dos bonecos no piso (ou só um brilho sem forma) | Mapa 3D | 3 | 1 | P1 |
| 6 | HUD da partida em 1366: META x NOTA, PAUSA cortado, painel de habilidades com reticências e sem cobrir o campo | UI partida | 3 | 1 | P1 |
| 7 | Cabeçalho da janela sem cortar nome/fase; tirar rolagem horizontal de TREINOS/CONQUISTAS/OBJETIVOS | UI abas | 3 | 1 | P1 |
| 8 | Avisos (toast) na partida em posição própria ou em fila até o apito | UI partida | 3 | 1 | P1 |
| 9 | Foco visível em todos os botões (contorno dentro do clip-path, `:focus-visible` global) | Acessibilidade | 3 | 1 | P1 |
| 10 | Tirar números flutuando sobre os jogadores e o texto do gol em dobro (nota só no placar) | Game feel / direção de arte | 3 | 1 | P1 |
| 11 | No toque, trocar as dicas de teclado por rótulos de toque (ou escondê-las) | Celular | 3 | 1 | P1 |
| 12 | Corrigir sobreposições no celular (nota do resultado, retrato da arma, título deitado, CONTINUAR abaixo da dobra) | Celular | 3 | 2 | P1 |
| 13 | Destacar o próximo objetivo no mapa: seta no chão/minimapa até o telão do Ego e linha "PRÓXIMO: …" no cartão (também no celular em pé, com dica "arraste para andar") | Navegação/onboarding | 5 | 2 | P1 |
| 14 | Câmera do mapa: distância mínima, afinar/esconder o que fica entre câmera e jogador, limite de escala do sprite | Mapa 3D / direção de arte | 5 | 2 | P1 |
| 15 | Unificar contagem de capítulos (20 x 21) e explicar "Ranking BL" x "Ranking de valor" | Texto/UI | 2 | 1 | P2 |
| 16 | Canais de áudio (3 GainNodes: música, efeitos, UI) com volume salvo | Áudio | 4 | 2 | P2 |
| 17 | Sons de UI que faltam: hover leve, aviso, conquista, atributo subindo, derrota | Áudio/game feel | 3 | 1 | P2 |
| 18 | Feedback de progresso: OVR com barra até o próximo ponto, contagem animada de recompensas, "VITÓRIA" como maior elemento do modal | Game feel | 4 | 2 | P2 |
| 19 | Personalização visível já na criação (ou passo 2) e descrição curta da EGOÍSTA | Onboarding | 3 | 1 | P2 |
| 20 | HUD do mapa e da partida escalando com a resolução (1920+) | Responsividade | 3 | 2 | P2 |
| 21 | Tela de CONFIGURAÇÕES: volumes, velocidade do texto, pular cenas já vistas, reduzir animações (e `prefers-reduced-motion` também no canvas: flash e tremida) | Áudio/acessibilidade | 5 | 3 | P2 |
| 22 | Música por contexto: título, mapa (por fase), treino, partida (tensão no fim), vitória/derrota | Áudio | 4 | 3 | P2 |
| 23 | ARMAS/FLUXO/RELAÇÕES: filtros por raridade/abas internas, catálogo recolhido | UI abas | 3 | 2 | P2 |
| 24 | Fonte própria com fallback real (1 display condensada + 1 legível, no projeto) para a mesma cara no Android/iPhone | Visual | 4 | 2 | P2 |
| 25 | Design system único (cores, escala de 7 tamanhos, espaçamento, durações) e migrar modais antigos (Trio, clube NEL, propostas, derrota) e Modo Dupla para o estilo das abas | Visual | 5 | 4 | P2 |
| 26 | Celular em pé: decidir girar tudo ou nada (hoje VN/abas em pé e cenas/partida deitadas) | Celular | 3 | 3 | P3 |
| 27 | Trocar os 81 emojis da interface por ícones em pixel art de um só conjunto | Visual | 4 | 3 | P3 |
| 28 | Título: boneco menor (≤45% da altura) e tratamento pixel no logo | Visual | 3 | 2 | P3 |
| 29 | VN: close sem passar da caixa de diálogo; um só padrão de PULAR/AVANÇAR; VN do treino com fala do mentor (sem "minigame") | VN | 3 | 2 | P3 |
| 30 | Limpar sobras do index.html e textos em inglês que não são estilo ("Skill", "TRAINING LAB", "MINIGAME") | Limpeza | 2 | 1 | P3 |
| 31 | Modo clássico: decidir se fica (e caber em 1366) ou sai | Navegação | 2 | 1 | P3 |
| 32 | Transições com identidade entre título → criação → mapa → partida | Game feel | 3 | 3 | P3 |
| 33 | Tirar o halo/aura atrás do boneco em ATRIBUTOS (gosto do dono) | Direção de arte | 2 | 1 | P3 |

