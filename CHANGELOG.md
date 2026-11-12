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
