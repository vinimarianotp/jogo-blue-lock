# STYLE_GUIDE.md — Design system do Blue Lock: Egoist Career

A fonte de verdade de cor, tipo, espaço, componentes e movimento.

| Arquivo | Papel |
|---|---|
| `css/tokens.css` | os valores (variáveis `--bl-*`) |
| `css/componentes.css` | os componentes prontos (classes `.bl-*`) |
| `testes/vitrine.html` | todos os componentes e estados lado a lado (abra no navegador ou tire print com o harness) |
| `docs/DIRECAO_DE_ARTE.md` | o mundo do jogo: bonecos, mapa, partida e cutscenes. Tudo em pixel art. |

**Regra de ouro:** nenhuma cor, tamanho de fonte, espaçamento ou duração "solta" no CSS ou no JS. Use o token. Se o token não existe, crie aqui primeiro.

---

## 1. Princípios

1. **O mundo é pixel art; a interface é neon com chanfro.**
   - Bonecos, cenários e cut-ins seguem a `DIRECAO_DE_ARTE.md`.
   - Janelas, botões e HUD usam cantos cortados (`clip-path`), bordas finas de neon e o fundo navy.
2. **Uma ação principal por tela.** Só um botão primário por tela. O resto é secundário.
3. **O olho bate primeiro no que importa:** o número que mudou, o próximo passo, o resultado.
4. **Nada morto.** Todo clique tem resposta (hover, active, som) e todo ganho tem animação curta.
5. **Proibido** (decisão do dono):
   - aura atrás de personagem;
   - close ou cut-in de olho;
   - números flutuando no rosto;
   - legendas grandes que explicam a cena;
   - sprite gigante ou cortado na frente;
   - pixel ampliado borrado.

## 2. Cores

| Token | Valor | Uso | Não usar para |
|---|---|---|---|
| `--bl-ink` | `#03060e` | preto profundo: tela cheia, tarjas de cinema, fundo de trilho de barra | texto |
| `--bl-bg` | `#060b16` | fundo da página | |
| `--bl-surface` | `#0c172e` | janelas e painéis | |
| `--bl-surface-2` | `#102040` | cartões dentro de painéis | |
| `--bl-surface-hover` | `#162b54` | cartão ou linha sob o mouse | |
| `--bl-line` | `rgba(96,165,250,.22)` | bordas finas e divisórias | |
| `--bl-line-strong` | `#1e3a6e` | borda de modal e de destaque discreto | |
| `--bl-electric` | `#3b82f6` | **azul elétrico:** ação principal, seleção, links, a cor do Blue Lock | erro |
| `--bl-electric-deep` | `#2563eb` | fundo do botão primário | |
| `--bl-neon` | `#00f5d4` | **destaque:** foco de teclado, ganho, o que acabou de mudar, você no ranking | decoração constante (perde o efeito) |
| `--bl-ego` | `#ff3b5c` | **alerta de ego e perigo:** despertar, rival, linha de corte, risco de eliminação | erro técnico (use `--bl-danger`) |
| `--bl-text` | `#f8fafc` | texto principal | |
| `--bl-text-2` | `#b9c6dc` | descrições e texto de apoio | |
| `--bl-muted` | `#7f93b5` | rótulos, legendas, desabilitado | texto longo (contraste baixo) |
| `--bl-success` | `#4ade80` | vitória, confirmação | |
| `--bl-danger` | `#ef4444` | erro, derrota, ação destrutiva | |
| `--bl-warning` | `#f59e0b` | aviso, energia baixa | |
| `--bl-gold` | `#facc15` | recompensa, raridade, título de seção | |

**Contraste:**
- Texto corrido sempre `--bl-text` ou `--bl-text-2` sobre `--bl-surface` ou mais escuro.
- `--bl-muted` só em rótulos curtos.
- Cor nunca é a única informação: junte ícone ou texto ("✕ Não salvou", não só vermelho).

**Cores de times e personagens** (camisas, cor do falante no diálogo) continuam nos dados (`data_*.js`). Na UI, elas entram via `--who`, `--card-edge` e similares.

## 3. Tipografia

Duas famílias, na pasta `fonts/`, com licença OFL e iguais em todo aparelho:

| Família | Token | Para quê |
|---|---|---|
| **Jersey 10** (pixel, estilo número de camisa) | `--bl-font-display` | títulos, botões, números grandes (OVR, placar, nota, valor), nome de quem fala, onomatopeia. **Sempre curto e em CAIXA ALTA.** |
| **Inter** | `--bl-font-text` | texto corrido, diálogos, descrições, rótulos, dados em tabela |

Escala fixa (não use outros tamanhos):

| Token | px | Uso |
|---|---|---|
| `--bl-fs-1` | 12 | legenda mínima (**nunca menor que 12**) |
| `--bl-fs-2` | 14 | rótulo, dado secundário, toast |
| `--bl-fs-3` | 16 | texto corrido, diálogo |
| `--bl-fs-4` | 20 | botão, subtítulo, nome no cartão |
| `--bl-fs-5` | 28 | título de seção, número de destaque |
| `--bl-fs-6` | 40 | título de tela ou modal |
| `--bl-fs-7` | 64 | impacto: GOL, VITÓRIA, nota S |

- **Altura de linha:** `--bl-lh-tight` (1.05) no display; `--bl-lh-text` (1.45) no texto.
- **Não use:**
  - Jersey 10 em frase longa;
  - itálico em Jersey 10 (ela não tem itálico; o falso fica torto);
  - Inter abaixo de 12 px.
- **Canvas** (partida, cenas, mapa): use as mesmas famílias. Antes de desenhar texto, espere `document.fonts.load('16px "Jersey 10"')`. *(Migração das fontes do canvas: ver §11.)*

## 4. Espaçamento

Só `--bl-sp-1` a `--bl-sp-8` = **4, 8, 12, 16, 24, 32, 48, 64 px**.

| Uso | Token | px |
|---|---|---|
| Espaço dentro de botão | `--bl-sp-2` × `--bl-sp-5` | 8 × 24 |
| Espaço dentro de cartão | `--bl-sp-3` × `--bl-sp-4` | 12 × 16 |
| Espaço dentro de modal | `--bl-sp-5` | 24 |
| Distância entre itens de uma lista | `--bl-sp-2` | 8 |
| Distância entre blocos | `--bl-sp-5` | 24 |

**Toque:** tudo que é clicável tem pelo menos `--bl-touch` (44 px) de altura no celular.

## 5. Componentes (`css/componentes.css`)

Cada componente tem os estados **normal, hover, active (apertado), focus (teclado) e disabled**. Para conferir, abra `testes/vitrine.html`.

| Componente | Classes | Estados e regras |
|---|---|---|
| **Botão** | `.bl-btn` (primário), `.bl-btn--secondary`, `.bl-btn--danger`, `:disabled` ou `[aria-disabled=true]` | hover: brilho +15% e sobe 1 px. Active: desce 1 px e encolhe 2%. Focus: contorno neon por dentro do chanfro. Disabled: cinza, sem animação, e **a tela diz por que** (ex.: "SEM ENERGIA"). Um primário por tela. Perigo só para desistir ou apagar, sempre com confirmação. |
| **Cartão de jogador** | `.bl-card` (+ `__ava`, `__name`, `__meta`, `__ovr`); `--card-edge` muda a faixa lateral | Se for clicável (`button.bl-card`): hover clareia e desliza 2 px. Bloqueado: `aria-disabled` deixa meio apagado e diz quando libera. |
| **Barra de atributo** | `.bl-bar` (+ `__label`, `__value`, `__track`, `__fill`), valor em `--v: 62%` | Ganho recente: `.bl-bar--up` (o número pula e o trecho brilha neon). Bloqueado: `.bl-bar--locked`. A barra enche com `--bl-dur-slow` e `--bl-ease-out`. |
| **Modal** | `.bl-modal-backdrop` > `.bl-modal` (+ `__title`, `__actions`); `.bl-modal--ego` para momento de ego ou perigo | Entra subindo (`bl-rise`). Ações à direita, com a primária por último. ESC ou ✕ fecham, se não for uma decisão obrigatória. |
| **Caixa de diálogo** | `.bl-dialog` (+ `__who`, cor do falante em `--who`); `--grito`, `--pensamento`, `--sussurro` | Fundo 94% opaco: nunca transparente sobre a cena. Grito: negrito e borda de alerta. Pensamento: itálico e cinza (nome sem itálico). Sussurro: menor e cinza. |
| **Toast (aviso)** | `.bl-toast` + `--ok`, `--erro`, `--aviso`, `--ego` | Entra deslizando da direita. Some sozinho em cerca de 3 s. **Nunca por cima do HUD da partida:** na partida, os avisos esperam o apito ou vão para a faixa própria. |
| **Ranking** | `.bl-rank` > `.bl-rank-row` (+ `__pos`, `__val`); `.bl-rank-row--you`; `.bl-rank-cut` (linha de corte) | Você sempre destacado em neon. A linha de corte usa `--bl-ego`: abaixo dela, está fora. |
| **Tooltip** | `.bl-tip` com `data-tip="texto"` | Aparece no hover e no foco de teclado. No celular, a mesma informação precisa estar visível na tela (toque não tem hover). |

**Componentes antigos que precisam migrar** (§11):
- modais de escolha do Trio, do clube da NEL e das propostas;
- tela de derrota;
- toast antigo `.ego-toast`;
- menu ☰;
- modais do Modo Dupla.

## 6. Cantos e bordas

- **Chanfro** em vez de canto redondo:
  - `--bl-cut-s` (8 px): botão, etiqueta;
  - `--bl-cut-m` (16 px): cartão;
  - `--bl-cut-l` (22 px): janela, modal.
- **Borda que acompanha o chanfro:** o elemento leva a cor da borda e o `::before` é o miolo recortado 2 px para dentro (veja `.bl-btn--secondary`). Borda com `box-shadow inset` é cortada nos lados inclinados.
- **Foco:** `outline: 3px solid var(--bl-neon); outline-offset: -5px` fica dentro do recorte e por isso aparece.

## 7. Movimento

| Token | Valor | Quando |
|---|---|---|
| `--bl-dur-fast` | 120 ms | resposta a toque e hover |
| `--bl-dur-med` | 240 ms | abrir ou fechar, trocar de aba, aviso entrando |
| `--bl-dur-slow` | 480 ms | entrada de tela, barra enchendo, transição de fase |
| `--bl-ease-out` | | entrar e aparecer (o padrão) |
| `--bl-ease-in` | | sair e sumir |
| `--bl-ease-inout` | | trocar de lugar |
| `--bl-ease-snap` | | impacto: número que sobe, carimbo, nota |

Animações nomeadas: `bl-fade`, `bl-rise`, `bl-slide`, `bl-pop`.

- **Só `transform` e `opacity` em animação.** Nada que force layout a cada quadro.
- **`prefers-reduced-motion`:** as durações viram 0. O canvas (tremida e flash da partida e das cenas) também deve respeitar *(pendente, Fase 5)*.

## 8. Ícones

- **Hoje:** 81 emojis servem de ícone e mudam de desenho em cada aparelho.
- **Meta:** um conjunto único de ícones em pixel art, 16×16 desenhados em 1×/2×/3×, mesma paleta. Até lá, emoji só ao lado de texto, nunca sozinho como única informação.

## 9. Acessibilidade

- Contraste mínimo de 4.5:1 no texto corrido.
- Foco visível em tudo que é clicável.
- Toque de pelo menos 44 px.
- Nunca informação só por cor.
- Nada essencial só no hover.
- Teclado: Enter e Espaço ativam, ESC volta.

## 10. Celular

- **Retrato (≤600 px):** abas em coluna única.
- **Paisagem baixa (≤500 px de altura):** janelas mais baixas.
- **Texto:** os mesmos tokens. O `--ui-k` (TAMANHO DA TELA) escala tudo por igual.
- **Dicas de teclado** ("WASD", "[F]") não aparecem em aparelho de toque: troque pelo nome do botão de toque.

## 11. Estado da migração (Fase 1)

| Item | Situação |
|---|---|
| `tokens.css`, `componentes.css`, fontes, vitrine | **feito** |
| Apelidos dos módulos (`--sh-*`, `--prf-*`, `--col-*`, `--tm-*`, `--atr-*`, `--hub-*`, `style.css`) apontando para `--bl-*` | a fazer, depois de juntar as branches da Fase 1 |
| Fonte do HTML (Segoe UI → Inter; títulos → Jersey 10) | a fazer |
| Tamanhos de fonte soltos (59 hoje) → escala de 7 | a fazer |
| Cores soltas (311 no CSS) → tokens | a fazer |
| Componentes antigos → `.bl-*` (modais de escolha, derrota, toast, menu ☰, Modo Dupla) | a fazer |
| Fontes do canvas (Segoe UI, monospace, Georgia, Impact, Arial Black) → as duas famílias | a fazer, com print antes e depois de partida e cenas |
| Foco visível global e `prefers-reduced-motion` no canvas | a fazer |
