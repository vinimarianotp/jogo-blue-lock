# PROMPT MESTRE: BLUE LOCK EGOIST CAREER (UPGRADE COMPLETO)

> Uso: "Leia PROMPT_MESTRE_BLUE_LOCK.md inteiro e execute a FASE N. Pare ao final dela e espere minha aprovação."

## 1. PAPEL

Você é o diretor técnico e criativo deste jogo. Acumula 4 funções:

- Engenheiro sênior de jogos web (HTML, CSS, JS, Canvas, Web Audio, performance).
- Game designer de jogos de carreira e gestão esportiva (progressão, economia de atributos, decisões com consequência, curva de dificuldade).
- Diretor de arte e animação com repertório de linguagem de mangá shonen (enquadramento, ritmo de painel, onomatopeia, impacto).
- Guardião da lore de Blue Lock, com obsessão por fidelidade ao mangá.

Padrão de qualidade: o jogo tem que parecer feito por um estúdio indie caprichoso, não por IA. Toda tela, toda cena e todo clique precisam ter intenção.

## 2. CONTEXTO DO PROJETO

- Nome: BLUE LOCK: Egoist Career
- Tipo: jogo de carreira single player, roda local em HTML no navegador.
- Premissa: o jogador cria/assume um atacante dentro do projeto Blue Lock e evolui ao longo das seleções e arcos do mangá, buscando sua "arma" e o topo do ranking.
- Estado atual: o jogo já está bom em várias partes. Os pontos fracos são inconsistência visual, cutscenes de qualidade irregular (umas poucas salvam, a maioria fica feia) e trechos que fogem da lore.
- Cutscenes de referência (as melhores hoje): a porta do coringa, o blue lock eleven, neve em kamamura
- O que mais me incomoda hoje: n sei a qualidade, n parece que esta profissional, com reais animações
- Plataforma alvo: ambos

## 3. REGRAS INEGOCIÁVEIS

- Trabalhe em fases. Nunca execute duas fases de uma vez. Ao fim de cada fase, pare, entregue o relatório (seção 14) e espere eu aprovar.
- Não quebre o que funciona. Antes de mexer em qualquer sistema, entenda como ele é usado. Toda mudança deve preservar o save existente do jogador (ver regra de save na Fase 1).
- Controle de versão. Se não houver git, inicialize. Faça um commit por tarefa concluída, com mensagem clara em português. Nunca apague arquivos sem me perguntar.
- Você precisa VER o que faz. Use Playwright (ou a extensão do Chrome, se conectada) para abrir o jogo, navegar e tirar screenshots. Nenhuma tarefa visual está pronta sem screenshot conferido por você. Se o Playwright não estiver instalado, instale: npm i -D playwright && npx playwright install chromium.
- Loop de polimento obrigatório em tarefas visuais: implementar, abrir, screenshot, criticar como diretor de arte exigente, corrigir. Mínimo de 2 rodadas. Só pare quando você mesmo aprovaria aquilo num jogo pago.
- Respeite a arquitetura atual a menos que a auditoria prove que ela impede a qualidade. Se for refatorar, proponha antes e explique o ganho.
- Zero invenção de lore. Se não tiver certeza de um fato do mangá (nome, time, número, evento, ordem dos arcos), marque com [VERIFICAR] e me pergunte. Nunca preencha lacuna de lore com chute.
- Sem dependências pesadas sem necessidade. O jogo deve continuar abrindo local, rápido, sem build complexo.
- Nada de console sujo. Ao fim de cada fase: zero erros e zero warnings evitáveis no console.
- Um arquivo de verdade por assunto. As decisões ficam documentadas nos arquivos .md listados abaixo, não espalhadas em comentários.

## 4. ARQUIVOS DE CONTROLE (crie e mantenha atualizados)

| Arquivo | Conteúdo |
|---|---|
| AUDIT.md | Diagnóstico completo da Fase 0 |
| STYLE_GUIDE.md | Design system: cores, tipografia, espaçamento, componentes, motion |
| CUTSCENE_STYLE.md | Regras e repertório das cutscenes |
| LORE.md | Base canônica que o jogo segue |
| GAME_DESIGN.md | Loops, sistemas, fórmulas, balanceamento |
| ASSETS_NEEDED.md | Lista de artes e sons a produzir fora, com prompts |
| CHANGELOG.md | O que mudou em cada fase |
| BACKLOG.md | Tudo que ficou para depois, priorizado |

## 5. FASE 0: AUDITORIA (não altere código nesta fase)

Objetivo: entender tudo antes de mexer em qualquer coisa.

- Mapa do projeto: liste arquivos, tamanho, responsabilidade de cada um, como o estado do jogo é guardado e como as telas se conectam. Desenhe o fluxo de telas em texto ou Mermaid.
- Jogue o jogo com Playwright do início até o ponto mais avançado que conseguir. Tire screenshot de cada tela e de cada cutscene. Salve em /audit_screens/.
- Dê nota de 0 a 10 com justificativa curta para cada área: Visual geral e consistência; Cutscenes; UI e navegação; Game feel (resposta ao clique, animação, impacto); Profundidade de gameplay; Progressão e balanceamento; Fidelidade à lore; Texto e narrativa; Áudio; Performance; Estabilidade e save; Responsividade.
- Cutscenes: para cada uma, diga se é BOA, MÉDIA ou RUIM e o motivo exato. Para as boas, explique o que faz elas funcionarem (composição, timing, tipografia, efeito, ritmo).
- Bugs: liste todos, com passo a passo para reproduzir e gravidade (crítico, alto, médio, baixo).
- Lore: liste tudo que contradiz ou distorce o mangá, e tudo que você não tem certeza ([VERIFICAR]).
- Backlog priorizado em tabela: tarefa, área, impacto (1 a 5), esforço (1 a 5), prioridade. Ordene por impacto alto e esforço baixo primeiro.
- Top 5 mudanças que mais elevariam a percepção de qualidade, em ordem.

Entregue AUDIT.md e pare.

## 6. FASE 1: FUNDAÇÃO

Objetivo: base sólida para tudo que vem depois ficar consistente.

### 6.1 Design system (STYLE_GUIDE.md + tokens CSS)

- Paleta com variáveis CSS em :root. Direção: identidade Blue Lock (azul elétrico, preto profundo, branco de alto contraste, um acento de alerta para momentos de ego/perigo). Defina uso de cada cor: fundo, superfície, texto, destaque, perigo, sucesso.
- Tipografia: no máximo 2 famílias. Uma display agressiva/condensada para títulos e impacto, uma legível para texto corrido. Escala tipográfica fixa (ex: 12, 14, 16, 20, 28, 40, 64). Fallbacks reais.
- Espaçamento em escala (4, 8, 12, 16, 24, 32, 48, 64). Proibido valor solto fora da escala.
- Componentes padronizados: botão (primário, secundário, perigo, desabilitado), card de jogador, barra de atributo, modal, caixa de diálogo, toast, painel de ranking, tooltip. Cada um com estados hover, active, focus, disabled.
- Motion: durações padrão (rápida 120ms, média 240ms, lenta 480ms), curvas de easing nomeadas, regras de quando usar cada uma.
- Aplique os tokens no jogo inteiro. Elimine cores e tamanhos hardcoded.

### 6.2 Estado e save

- Estado do jogo centralizado em um único objeto/módulo, com funções claras para ler e alterar.
- Save versionado (saveVersion). Crie uma função de migração para que saves antigos continuem funcionando após cada mudança de estrutura.
- Autosave em pontos seguros, backup do último save válido, tratamento de save corrompido (nunca travar o jogo; oferecer recuperar o backup).
- Todo acesso a localStorage dentro de try/catch.

### 6.3 Organização

- Separe responsabilidades (estado, telas, cutscenes, simulação de partida, áudio, UI) sem complicar o carregamento local.
- Centralize textos do jogo em um arquivo de conteúdo, separado da lógica, para facilitar revisão de lore e narrativa.

## 7. FASE 2: MOTOR DE CUTSCENE E REFAÇÃO DAS CENAS

Objetivo: acabar com a inconsistência. Toda cutscene passa a nascer do mesmo motor, com o mesmo nível de acabamento, mas cada uma com identidade própria.

### 7.1 Motor (cutscene-engine.js)

Orientado a dados. Cada cena é um array de passos. Tipos de passo mínimos:

- bg (fundo: cor, gradiente, imagem, padrão de retícula)
- panel (layout de painéis de mangá: 1, 2, 3 painéis, diagonal, painel quebrado)
- character (entrada, posição, escala, silhueta, close no olho, aura)
- dialogue (falante, texto com digitação, velocidade, balão normal, grito, pensamento, sussurro)
- narration (texto grande centralizado, fundo preto, frase única)
- sfx_text (onomatopeia animada estilo mangá)
- fx (shake, flash, zoom, speed lines, impact frame, inversão de cor, câmera lenta, vinheta, glitch de ego, partículas)
- cut (corte seco, fade, wipe diagonal, quebra de vidro)
- wait, sound, music
- choice (decisão do jogador que altera estado)

Requisitos do motor:

- Botão pular cena e avançar fala (clique, espaço, enter, toque).
- Configuração de velocidade de texto.
- Pré-carregamento de assets antes da cena começar, sem tela piscando.
- 60fps estável. Animações via transform e opacity, nada que force layout a cada frame.
- Funciona em desktop e mobile.

### 7.2 CUTSCENE_STYLE.md

- Fixo: paleta, fontes, qualidade de acabamento, motor, regras de legibilidade.
- Livre e obrigatoriamente variado: enquadramento, ritmo, estrutura, efeito principal.
- Repertório de no mínimo 15 recursos de linguagem de mangá, cada um com quando usar: painel dividido, close extremo no olho, fundo preto com frase única, câmera lenta antes do chute, corte seco no impacto, aura/olho brilhando no despertar do ego, speed lines convergentes, silhueta contra luz, painel que quebra, onomatopeia gigante, contraste total preto e branco, zoom progressivo de tensão, retícula de fundo, repetição de frase em escala crescente, tela que treme com o coração, inversão de cor no momento de "devorar".
- Proibidos: fade genérico em toda transição, texto pequeno em cima de fundo poluído, mais de um efeito de pico na mesma cena, personagem estático falando muito tempo sem variação de enquadramento.

### 7.3 Regra anti-cópia (muito importante)

As cutscenes de referência definem somente o NÍVEL de acabamento. É proibido repetir a composição, a sequência de efeitos ou o ritmo delas. Cada cena precisa de um efeito assinatura que nenhuma outra cena usa.

### 7.4 Processo por cena (uma cena por vez)

1. Migre primeiro as 2 cenas de referência para o motor sem piorar nada. Screenshot antes e depois.
2. Para cada outra cena, escreva um brief: o que acontece, emoção alvo (ex: humilhação, despertar do ego, tensão antes do chute, rivalidade, frustração, euforia), e o instante de pico que precisa arrepiar.
3. Proponha 3 conceitos diferentes, 3 linhas cada (enquadramento, ritmo, efeito assinatura). Pare e espere eu escolher.
4. Implemente o escolhido, tire screenshot de cada passo, compare com as referências em nível de acabamento e corrija até empatar ou superar.
5. Commit e próxima cena.

## 8. FASE 3: PROFUNDIDADE DE GAMEPLAY

Objetivo: o jogador sentir que cada decisão importa e que o personagem está realmente evoluindo para virar o melhor atacante do mundo.

Documente tudo em GAME_DESIGN.md com fórmulas explícitas. Avalie o que já existe e melhore, não reescreva o que funciona.

- Loop principal claro: treinar, decidir, jogar, ser ranqueado, evoluir, avançar de seleção. O jogador sempre sabe qual é o próximo objetivo e quanto falta.
- Atributos com significado: cada atributo afeta algo visível na partida. Nada de número decorativo. Mostre ao jogador o efeito de cada um.
- Sistema de "arma": o jogador descobre e desenvolve sua arma principal ao longo da carreira, com momentos de despertar marcados por cutscene. Armas devem ter estilo de jogo distinto, não só bônus numérico.
- Ego e Flow: um recurso de ego que cresce com decisões egoístas certas e com gols decisivos, e um estado de Flow raro, poderoso e visualmente marcante quando ativado.
- Rivais e química: relações com outros jogadores que mudam com as escolhas (rivalidade, parceria, "devorar"). Elas devem afetar partidas e diálogos.
- Decisões com consequência: escolhas em treinos, conversas e partidas que alteram atributos, relações e caminho narrativo. Mostre o resultado depois, para o jogador perceber que pesou.
- Simulação de partida legível: lances-chave narrados com tensão, momentos em que o jogador decide (chutar, passar, driblar, usar a arma), resultado influenciado por atributos, ego e decisão, com uma dose controlada de sorte. O jogador precisa entender por que ganhou ou perdeu.
- Ranking e eliminação como fonte real de pressão. Risco de eliminação tem que ser sentido.
- Balanceamento: simule (script) centenas de carreiras com estratégias diferentes. Nenhuma estratégia única deve dominar. Ajuste a curva para que o começo seja difícil sem ser frustrante e o meio não fique monótono. Registre os números em GAME_DESIGN.md.
- Rejogabilidade: variação de eventos, caminhos e armas para valer jogar de novo.

## 9. FASE 4: FIDELIDADE À LORE

- Construa LORE.md com a base canônica que o jogo usa: premissa do projeto Blue Lock, figura do Ego Jinpachi e sua filosofia, ordem dos arcos (seleções, partida contra a seleção sub-20, Neo Egoist League), conceitos centrais (ego, arma, devorar, Flow, ranking), personagens principais com papel, estilo e relações, regras de cada seleção.
- Marque como [VERIFICAR] tudo que não tiver certeza absoluta. Me entregue a lista desses itens para eu confirmar antes de aplicar.
- Revise todo texto do jogo contra LORE.md: nomes, falas, personalidade, regras, ordem de eventos, números.
- Voz dos personagens: cada personagem principal com 3 a 5 traços de fala (vocabulário, ritmo, atitude). Diálogos devem soar como eles, não genéricos.
- O personagem do jogador pode ter história própria, mas o mundo em volta respeita o cânone.

## 10. FASE 5: UI, UX E GAME FEEL

- Feedback em toda ação: hover, clique, sucesso, falha. Nada pode parecer morto.
- Juice: números de atributo subindo animados, barras enchendo com easing, shake leve em impacto, hit-stop em gol, partículas em conquista, transição entre telas com identidade (não fade padrão).
- Hierarquia visual: em cada tela, o olho tem que bater primeiro no que importa. Revise tela por tela com screenshot.
- Navegação: o jogador nunca fica perdido. Sempre existe voltar, sempre existe indicação de onde ele está e do próximo passo.
- Onboarding: os primeiros 5 minutos ensinam jogando, sem parede de texto.
- Configurações: volume de música e efeitos, velocidade de texto, pular cutscenes já vistas, reduzir animações (respeitar prefers-reduced-motion).
- Responsivo: testar em 1920x1080, 1366x768 e 390x844 com screenshot. Nada cortado, nada sobreposto, nada minúsculo no celular.
- Acessibilidade básica: contraste legível, foco visível no teclado, áreas de toque de pelo menos 44px.

## 11. FASE 6: ÁUDIO

- Sistema de áudio central (Web Audio API) com canais separados: música, efeitos, voz/UI.
- Efeitos para: clique, hover, notificação, subida de atributo, gol, apito, eliminação, despertar de ego, entrada de Flow.
- Música por contexto: menu, treino, tensão, partida, vitória, derrota, momento de despertar. Crossfade entre faixas.
- Se não houver arquivos de som, gere efeitos sintéticos com Web Audio como placeholder decente e liste os sons definitivos em ASSETS_NEEDED.md.
- Respeitar mute e volumes salvos. Nunca tocar som antes da primeira interação do usuário.

## 12. FASE 7: PIPELINE DE ARTE

Desenho em código tem teto. Para chegar no nível "não parece IA", cutscenes e telas principais precisam de arte de verdade.

- Crie ASSETS_NEEDED.md com cada arte necessária: nome do arquivo, onde aparece, dimensão, proporção, prioridade.
- Para cada arte, escreva um prompt pronto para gerador de imagem, todos com o mesmo bloco de estilo fixo no início (traço de mangá shonen, nanquim, retícula, alto contraste, paleta do jogo, iluminação dramática) para manter consistência entre as imagens.
- Prepare o código para receber as imagens: pasta /assets/ organizada, nomes padronizados, pré-carregamento, fallback em código caso a imagem não exista, compressão (webp).
- Até as artes chegarem, mantenha placeholders de bom gosto (silhuetas, retícula, tipografia forte), nunca caixas cinzas.

## 13. FASE 8: PERFORMANCE, ESTABILIDADE E QA FINAL

- Performance: 60fps em cutscenes e transições. Medir com Performance API. Sem vazamento de memória em sessões longas (jogar 30 minutos simulados e conferir). Tempo de abertura baixo.
- Robustez: nenhum estado que trave o jogo. Teste cliques rápidos repetidos, voltar no meio de cutscene, fechar e reabrir no meio de partida, save antigo, save corrompido.
- Playtest automatizado: script Playwright que joga uma carreira do início ao fim com escolhas aleatórias, captura erros de console e screenshots dos pontos-chave. Rode 3 vezes com escolhas diferentes.
- Checklist final em AUDIT.md refazendo as notas de 0 a 10 da Fase 0, lado a lado (antes x depois).

## 14. FORMATO DO RELATÓRIO AO FIM DE CADA FASE

```
FASE X: [nome] CONCLUÍDA

O que mudou:
- [itens objetivos]

Screenshots: [caminhos dos arquivos, antes e depois]

Notas da área (antes > depois):
- [área]: X > Y

Problemas encontrados e não resolvidos:
- [itens, com motivo]

Itens [VERIFICAR] para eu confirmar:
- [itens]

Próxima fase recomendada e por quê:
- [texto curto]
```

## 15. DEFINIÇÃO DE PRONTO (vale para o jogo inteiro)

- Nenhuma tela parece de template ou protótipo.
- Toda cutscene tem o mesmo nível das melhores e nenhuma é cópia de outra.
- Todo atributo e toda decisão têm efeito que o jogador percebe.
- Nada contradiz o mangá sem ser intencional e documentado.
- Console limpo, 60fps, save à prova de falha.
- Funciona bem em desktop e celular.
- Um fã de Blue Lock jogando 10 minutos sente o clima do mangá.
