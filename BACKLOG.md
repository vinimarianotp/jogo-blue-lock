# BACKLOG.md — o que ficou para depois, priorizado

A lista viva do que falta. A origem é o `AUDIT.md` §11, com os números da auditoria entre parênteses. Ela é atualizada no fim de cada fase. O que já foi feito está no `CHANGELOG.md`.

**Prioridade:**
- **P1:** impacto alto e esforço baixo.
- **P2:** impacto alto com esforço maior, ou impacto médio com esforço baixo.
- **P3:** o resto.

## Feito na Fase 1 (não repetir)

| Área | Itens da auditoria |
|---|---|
| Estabilidade e save | cutscene que congelava (1); abertura à prova de falha (2); backup e recuperação (5); validação por esquema (6); `saveVersion` e migração em cadeia (46); aviso de falha ao gravar, interlúdio e `onComplete` (31) |
| Desempenho | bonecos do mapa com cache (7); troca de fase em fatias com cortina (20); abas sob demanda (21); PeerJS sob demanda (30) |
| Testes e console | teste de regressão (22): cenas ×2, saves, abertura e treinos; console limpo (17) |
| Design | design system: tokens, fontes, componentes e vitrine (28, parte do 41); foco visível e META/NOTA (parte do 33) |
| Arte | aura nas vitrines (UI 33) |
| Organização | fachada `GameState` (parte do 53) |

---

## Fase 2 — Cutscenes

| Tarefa | Prior. |
|---|:-:|
| Cutscenes no lugar certo: 53 no teatro de Paris (ou fundir com a 54), 48 num hotel de verdade, 61 num auditório (12) | P1 |
| Um apito final só (49 → 42 → pós-jogo) (16) | P1 |
| Regras de enquadramento e exposição em todas: boneco ≤ 45%, nada cortado, piso de luz (23) | P1 |
| Olhos acesos na altura certa (0.57) e no máximo 1 por arco; cortar o narrador que descreve e as cartelas explicativas (36) | P2 |
| **1 efeito-assinatura por cena**, saindo do molde do gol. Começar pelas que mais tocam: 11, 12, 13, 31, 45, 60 (42) | P2 |
| Refazer as RUINS: 05/06, 15/16, 19/20 (momento-chave em cena e imagem própria para a vitória), 10, 25, 45, 63 (43) | P2 |
| Cena do gol da Sub-20 (K5, decidido em 13/11): tirar só as 4 violações do guia e manter a coreografia | P1 |
| Memória das cenas: registro central dos caches dos `cine3d_*` com limite em MB (item 5 do desempenho, não feito) | P2 |
| Legendas num só lugar para as versões 2D e 3D (hoje estão copiadas) | P2 |

## Fase 3 — Gameplay e balanceamento

| Tarefa | Prior. |
|---|:-:|
| Derrota com custo: sem +80 moedas e +1 SP, e sem recarregar os treinos (3) | P1 |
| Corte real da NEL: fora dos 23 → repescagem (10) | P1 |
| Degrau "Difícil" entre Normal e Egoísta, e Egoísta mais suave até o cap. 4 (11) | P1 |
| Finais da Sub-20 que podem ser perdidas (18) | P1 |
| Afinidade com peso em campo, ou tirar a promessa "+2 OVR" (24) | P1 |
| Meio do Normal mais desafiador (25) | P1 |
| Decidir os `statBoosts` das armas (29) | P1 |
| Card da arma com o OVR real; treino de Química subindo o time do capítulo (38) | P2 |
| Fluxo raro também no fim da carreira (39) | P2 |
| Arma descoberta pela história (45) | P2 |
| Ranking do Blue Lock por desempenho (48) | P2 |
| Consequência mostrada depois: escolhas citadas em cenas futuras (49) | P2 |
| Sumidouro de moedas (50) | P2 |
| Momentos de decisão narrados na partida (54) | P2 |
| **Treinos novos:** ajustar as metas (12, 10, 15, 4) jogando de verdade; tirar "CHANCE DE GOL", FLUXO e QUÍMICA do HUD nos treinos do campo | P2 |
| Rejogabilidade: eventos entre capítulos e Novo Jogo+ (57) | P3 |

## Fase 4 — Lore e texto

| Tarefa | Prior. |
|---|:-:|
| Tirar o rótulo "ARCO ATUAL DO MANGÁ" (4) | P1 |
| **Copa Sub-20 seguindo o mangá** (decisão do dono): Grupo A com Nigéria, França e Inglaterra; derrota de 2 × 4 para a França; Inglaterra no grupo com o Fox **técnico** no banco; mata-mata inventado; a final pode ser a revanche contra a França (44) | P1 |
| Resolver a contradição do nº 1 do Blue Lock (15) | P1 |
| Tirar os tutoriais da boca dos personagens e levar para o HUD (19) | P1 |
| Traduzir a UI em inglês, corrigir os erros de português, glossário único, glifos acentuados na fonte pixel do mapa (37) | P2 |
| Responder os [VERIFICAR] em aberto (4–6 e 9–30 do `AUDIT.md` §8) e escrever o `LORE.md` | P2 |
| Pôsteres "ISAGI" no mapa; Kunigami (Manshine × Bastard); Top 6 | P2 |

## Fase 5 — UI, UX e game feel

| Tarefa | Prior. |
|---|:-:|
| Próximo objetivo visível no mapa (seta até o telão do Ego; dica "arraste para andar" no celular) (8) | P1 |
| Câmera do mapa: distância mínima, sem sprite gigante nem objeto borrado na frente (9). Também aparece na cidade nova (parque, quadra) | P1 |
| Barra de skills da partida com os nomes reais das skills 1–6 (13) | P1 |
| Criação sem corte no celular em pé (14) | P1 |
| Feedback de progresso: OVR com barra, recompensas contadas, "VITÓRIA" em destaque (27) | P1 |
| Número das costas invertido; reflexo fantasma no piso (32) | P2 |
| Toast fora do HUD da partida; cabeçalho que não corta o nome; sem rolagem lateral (33, o resto) | P2 |
| Tirar os números flutuando sobre os jogadores e o texto do gol em dobro (34) | P2 |
| Celular: rótulos de toque no lugar das dicas de teclado; corrigir as sobreposições (35) | P2 |
| **Tela de Configurações:** volumes, velocidade do texto, pular cenas vistas, reduzir animações também no canvas (40) | P2 |
| **Migrar os componentes antigos para `.bl-*`:** modais de escolha (Trio, clube da NEL, propostas), derrota, toast `.ego-toast`, menu ☰, Modo Dupla (41, o resto) | P2 |
| Cores e tamanhos de fonte soltos → tokens (311 cores no CSS, 59 tamanhos); fontes do canvas → Jersey 10 e Inter | P2 |
| Ícones em pixel no lugar dos 81 emojis (51) | P2 |
| Supino: a pose deitada fica confusa de ler (boneco e anilha viram uma mancha). Melhorar o enquadramento ou a pose | P2 |
| Celular em pé: girar tudo ou nada (55); transições com identidade (56) | P3 |

## Fase 6 — Áudio

| Tarefa | Prior. |
|---|:-:|
| Canais de áudio (música, efeitos, UI) com volume salvo (26) | P1 |
| Música por contexto: título, mapa, treino, partida, vitória e derrota (47) | P2 |
| Sons de UI que faltam: hover, aviso, conquista, atributo subindo, derrota | P2 |
| A torcida sintetizada pode soar "retrô": o dono vai ouvir e dizer | P3 |

## Fase 8 — QA

| Tarefa | Prior. |
|---|:-:|
| Teste automático de uma carreira inteira com escolhas aleatórias (3 rodadas) | P2 |
| Medir em celular de verdade (os números atuais são de celular emulado) | P2 |

## Organização (quando tocar nos arquivos)

| Tarefa | Prior. |
|---|:-:|
| Textos centralizados (`data_ui.js`, `data_cenas.js`) (53, o resto) | P2 |
| `util.js` com os helpers repetidos em 36 a 38 arquivos; trocar os embrulhos em cadeia por ganchos explícitos (58) | P3 |
| Código morto: `match_gfx.js`, as 3 funções sem chamada, cenas órfãs, modos dos treinos antigos no `match_engine.js` | P3 |
| Tirar `_backup_*` e `previa_sprites/` da pasta do jogo (**só com autorização do dono**) (59) | P3 |
