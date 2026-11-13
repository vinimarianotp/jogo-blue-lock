# CHANGELOG

O que mudou em cada fase do `PROMPT_MESTRE_BLUE_LOCK.md`. As mais recentes ficam em cima.

## Fase 1 — Fundação (em andamento)

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
