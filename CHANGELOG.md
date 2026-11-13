# CHANGELOG

O que mudou em cada fase do `PROMPT_MESTRE_BLUE_LOCK.md`. As mais recentes ficam em cima.

## Fase 2 — Cutscenes (em andamento)

### Regras (`CUTSCENE_STYLE.md`)
O guia das cenas reúne:
- o que é fixo: técnica, paleta, fontes, legibilidade, enquadramento, piso de luz, duração e impacto;
- o que é livre;
- o repertório de 24 recursos de mangá, com quando usar cada um;
- os proibidos;
- o checklist de pronto;
- o registro de assinaturas (8 travadas, 23 reservadas);
- a regra anti-cópia;
- o formato do roteiro de dados.

O `docs/DIRECAO_DE_ARTE.md` passa a apontar para ele.

### Motor: o roteiro de dados (`js/cine_roteiro.js`)
- **Formato:** a cena passa a ser uma lista de planos (`CE.roteiro`).
  - Cada plano tem câmera, atores, falas, quadros de mangá, efeitos, onomatopeias, letreiros, cartela, sons e corte.
  - Há uma escolha que pausa a cena.
  - Quando a cena precisa de desenho próprio, usa os ganchos de escape.
  - Referência da API: `CUTSCENE_STYLE.md` §8.
- **Legendas, em todas as 63 cenas:**
  - texto em Inter e nome de quem fala em Jersey 10;
  - tipos de fala: grito, pensamento e sussurro;
  - o texto aparece sendo digitado;
  - a tarja de cima mostra só o título e os pontinhos, sem o "PLANO N • ..." que dava spoiler.
- **Letra de impacto:** "DOM!!", "GOOOL!!", "CRACK" e as cartelas finais estão em Jersey 10 pixel, com contorno.
- **Controles:**
  - clique, toque, ESPAÇO ou ENTER completam a fala ou passam o plano;
  - ESC pula a cena.
- **Velocidade do texto:** ☰ MENU → 💬 TEXTO. Vale para as cenas e os diálogos.
- **Pré-carregamento:** os bonecos de cada plano são montados antes do 1º quadro, e o relógio não anda enquanto isso.
- **Sem 3D:** se o aparelho não tem WebGL2 ou se a placa falha no meio da cena, toca a versão 2D antiga.
- **As 3 referências** (21, 24, 27) foram migradas para o roteiro com **0 pixels de diferença** e depois corrigidas:
  - a sala do Blue Lock Eleven saiu da escuridão e ninguém mais sai cortado;
  - os olhos do Rin estão na altura certa;
  - na porta do Coringa, o boneco de costas ficou menor.

### Regras e correções
- **Teste de regras (`testes/cenas_regras.js`):** mede os 336 planos das 63 cenas:
  - boneco acima de 45% da altura;
  - boneco cortado na borda;
  - quadro escuro ou estourado;
  - fala longa.

  A linha de base está em `docs/cenas/regras_relatorio.md`.
- **Gol da Sub-20 (K5):** a coreografia do dono continua igual. Saíram:
  - o close de rosto;
  - o boneco gigante cortado;
  - a rede borrada;
  - os letreiros "O TEMPO PAROU" e "O GOL DA VITÓRIA";
  - o marcador com o nome;
  - a aura;
  - os olhos brilhando.

  Os 13 planos agora estão dentro da regra (antes, 12 passavam de 45% e 11 tinham boneco cortado).
- **Brilho dos olhos na testa:** corrigido nas cenas 15/16, 17 e 26.
- **Fim da Copa:** antes eram três apitos seguidos (cena 49, a partida e o pós-jogo). Agora é um só.
- **Textos:**
  - o nome inteiro no cartão de embarque (33), sem o retângulo preto;
  - sem o marcador "▼ ENJI" (35);
  - o seu número de camisa, e não um segundo 10 (38 e 49).
- **Memória das cenas:** registro central com limite. Depois das 63 cenas, 65,5 → 54,7 MB.

## Fase 1 — Fundação (concluída; aprovada em 13/11/2026)

### Estabilidade das cutscenes (bug C1 da auditoria)
- **Corrigido:** a cutscene congelava na 2ª vez em que a "coroa" aparecia. Era o caso do `barou_devour` depois do `nagi_reo_split` (cap. 2b → cap. 3), e também do REVER. Depois disso, todas as cenas da sessão ficavam quebradas até apertar F5.
  - **Causa:** no fim de cada cena, a limpeza de memória (`releaseCineCaches`) esvaziava o cache da coroa, mas deixava um objeto vazio no lugar. A cena seguinte usava esse objeto vazio.
  - **Correção:** agora a limpeza apaga a referência inteira, e a coroa só usa o cache se ele estiver completo.
- **Blindagem:** um erro de desenho numa cena não congela mais a tela nem estraga as cenas seguintes.
  - O próximo quadro é agendado antes de desenhar.
  - O erro é registrado uma vez.
  - O canvas é limpo de estado no começo de cada cena e depois de um erro.
  - `CA.panel` e `drawCine` restauram o canvas mesmo com erro.
  - Um erro no relógio da cena encerra a cena e a história segue.
- **Teste de regressão novo:** `testes/` (`rodar.ps1 -teste cenas_2x`). Toca as 63 cenas duas vezes no mesmo navegador e exige zero erros.

### Desempenho (itens 7, 20, 21, 30 da auditoria)
Medido em pares (antes × depois), com a placa de vídeo real e com o celular emulado (CPU 4× mais lenta).

- **Bonecos do mapa:** a textura de cada quadro fica guardada (até 24 MB) e não é mais relida a cada quadro.
  - `getImageData` no mapa: 300/s → ~0.
  - A qualidade automática decide pela mediana e não cai mais para o mínimo no PC.

  | Onde | PC | Celular |
  |---|---|---|
  | Mapa do Blue Lock | ~43 fps na qualidade mínima → 50–80 fps | 6–7 → 7–12 fps |
  | Cidade | 2–9 → 20–38 fps | 11–18 → 24–25 fps |

- **Troca de fase:** em vez de congelar, aparece uma **cortina com o nome da fase**, e o prédio novo é montado em fatias atrás dela. No PC, o prédio da próxima fase é adiantado.

  | Medida | PC | Celular |
  |---|---|---|
  | Maior travada (máquina livre) | 1,5 s → 0,15 s | 3,1 s → 0,36 s |

- **REVER uma cena de outra fase:** mostra "CARREGANDO A CENA", e a cena começa do início. Antes ela começava andada.
- **Abas:** ARMAS, FLUXO, LOJA e PERFIL só são montadas quando aparecem, e o catálogo carrega aos poucos.

  | Medida | PC | Celular |
  |---|---|---|
  | `renderAll` | 174 → 12 ms | 316 → 58 ms |
  | Abrir ARMAS | — | 4,8 s → 0,65 s |

- **Abertura:** o PeerJS (Modo Dupla online) só carrega quando a sala abre, e os fundos da HISTÓRIA só são pintados quando a aba aparece.
  - CPU até a tela inicial: PC 2,75 → 1,05 s; celular 9,2 → 5,1 s.
- **Visual:** idêntico. No mapa, a diferença é de 0 pixel.

### Save à prova de falha (bugs C2, A1, A2, A3, M1, M2, M3, M4)
- **Versão do save:** `js/save.js` traz `saveVersion` = 4 e migração em cadeia (1→2→3→4) que roda uma vez e grava. As migrações heurísticas que rodavam em toda abertura foram para a 3→4.
- **Validação:** cada campo é conferido e **consertado** em vez de descartado. Exemplos:
  - `"50"` vira 50;
  - `null` vira o padrão;
  - uma lista que chegou como objeto volta a ser lista;
  - um capítulo 999 é recalculado.
- **Backup:** `<chave>_bak` guarda o último save bom; o original de antes da versão 4 fica em `_antes_v4`. Um save que não abre nunca é sobrescrito: o texto vai para `_quebrado`.
- **Painel "SUA CARREIRA NÃO ABRIU":** RECUPERAR BACKUP, EXPORTAR SAVE QUEBRADO e COMEÇAR DE NOVO (com confirmação).
- **Abertura protegida etapa por etapa:** o menu mínimo (carreira, importar, exportar) sempre aparece.
- **Falha ao gravar:** aparece uma faixa de aviso, e a cama só diz "salvo" se gravou.
- **Importar:** mostra uma prévia (nome, capítulo, versão), migra, valida e faz backup do espaço substituído.
- **Duas abas abertas:** a aba antiga para de salvar e avisa.
- **Interlúdio:** só fica marcado como visto no fim. O fim de cena com erro volta ao mapa com segurança.
- **`js/state.js`:** fachada `GameState` (get, set, update, evento "mudou", `comEstado`), usada pelo save e pela saga do Modo Dupla.
- **Testes:** `testes/rodar_saves.ps1 -teste saves` deu OK em 23 aberturas.
  - Os 8 saves bons, gerados antes da mudança, abrem **idênticos**, com 0 diferenças.
  - Os estragados são consertados ou vão para o painel de recuperação.

### Design system aplicado nas telas
- **Uma fonte de verdade:** as variáveis de cor dos 11 CSS apontam para os tokens.
- **Fonte do texto:** a Segoe UI, que só existe no Windows, virou Inter em todo lugar.
- **Fonte dos títulos:** 137 títulos, números grandes e botões passaram para a **Jersey 10**. Foram 3 rodadas de print e correção:
  - o tamanho aumentou 30%;
  - os textos pequenos dentro dos títulos voltaram para a Inter;
  - o logo, os botões da tela inicial e o JOGAR CAPÍTULO foram ajustados.
- **Sem aura** nas vitrines de ATRIBUTOS e PERFIL: o boneco fica limpo, com holofote neutro.
- **Foco de teclado** visível em todo botão (auditoria B13).
- **Placar da partida:** o "META" não encosta mais em "NOTA" (B4).
- **Prints:** 21 telas em `previa_sprites/fase1_design/`.

### Juntado da fila paralela (pedido do dono, autorizado a publicar)
- **Estádios gigantes:** Seleção, Copa e liga pro, com torcida viva em pixel e som da torcida sintetizado.
- **Cidade 3× maior:** avenida, calçadão, Rua das Torres, Parque do Lago, metrô, lanche, desafio da criançada e cerca de 70 pedestres.
- **Treinos novos:**
  - **Supino** e **Barra Fixa** na academia, com barra de força e fôlego;
  - **Corredor de Drible** e **Rondo de Leitura** no campo;
  - os recordes antigos ficam guardados no save.
- **Testes:**
  - `testes/treino_academia.js` e `testes/treino_campo.js`;
  - `testes/cenas_2x` com estádio e cidade juntos dá OK, com 0 erros.

### Design system (base)
- **`css/tokens.css`:** cores, tipografia em escala fixa, espaçamento, chanfros, sombras, movimento e camadas.
- **`fonts/`:** **Jersey 10** para títulos e **Inter** para texto, escolhidas pelo dono. Licença OFL, ficam na pasta do jogo.
- **`css/componentes.css`:** botão, cartão de jogador, barra de atributo, modal, caixa de diálogo, toast, ranking e tooltip, todos com os 5 estados.
- **Vitrine:** `testes/vitrine.html`, polida em 2 rodadas com print.
- **`STYLE_GUIDE.md`:** as regras de uso.
- **Sem mudança visível ainda:** a aplicação nas telas do jogo vem depois de juntar as branches.

### Console limpo
- **Mudança:** o jogo não procura mais `musica/*.mp3` em toda abertura. Isso deixava 8 erros vermelhos no console.
- **Como usar música própria:** pelo ☰ MENU → 🎵 MÚSICA PRÓPRIA (fica salvo). O `musica/LEIA-ME.txt` foi atualizado.

## Fase 0 — Auditoria (concluída e aprovada em 12/11/2026)
- `AUDIT.md`: diagnóstico com notas, bugs, lore, backlog e top 5.
- `docs/auditoria/`: os 6 relatórios completos e as ferramentas de teste.
- `PROMPT_MESTRE_BLUE_LOCK.md`: o roteiro das fases.
- **Decisões do dono:**
  - o jogo fica como fan game grátis e fiel ao mangá;
  - a Copa Sub-20 vai seguir o mangá;
  - o Torneio de Trios é canônico;
  - aura e close no olho continuam proibidos.
