# Direção de arte das cutscenes — Blue Lock: Egoist Career

Este documento manda em toda cutscene nova ou refeita. Quem for mexer numa cena lê antes.

## 1. A ideia
- **Tudo em pixel art** (pedido do dono do jogo). As cutscenes usam o cenário 3D (estádio, prédio) com os bonecos 2D **em planos abertos e médios**; os closes (chuteira, bola) são desenhados em baixa resolução e ampliados sem suavizar (`CA.panel(..., { pixel: 6 })`), na mesma escala de pixel dos bonecos. Nunca o boneco de 72 px ampliado e nunca ilustração lisa (vetorial) à mostra. A bola das cenas é a bola em pixel art de 20 px (8 giros).
- Arte feita por código (vetor), sem custo: `js/cine_art.js`. Se um dia houver imagem pronta (gerada ou desenhada), ela entra no lugar do desenho de código pelo mesmo nome de arquivo (ver seção 7).

## 2. Regras de câmera
- **Planos abertos e médios para os bonecos.** O boneco pode ocupar no máximo ~45% da altura da imagem. Mais perto que isso, corta para uma ilustração de close (cut-in).
- Câmera **sempre se mexendo um pouco** (grua, travelling, push-in), nunca parada. Tremida só em impacto.
- **Regra dos 180°**: numa sequência de ação, a direção de tela não inverte sem um plano de transição.
- Câmera lenta com **rampa** (entra e sai suave), só nos 1–2 momentos-chave da cena.
- Vista de cima: no máximo ~55° de inclinação (os bonecos são placas em pé; reto de cima eles somem).
- A câmera nunca entra em parede, arquibancada ou dentro de boneco.

## 3. Regras de impacto ("game feel")
- **Quadro de impacto**: 1–2 quadros, imagem em preto e branco invertida (estilo anime), só no golpe principal.
- **Pausa no impacto (hit-stop)**: 3–6 quadros congelados no contato.
- **Tremida por trauma**: o impacto soma "trauma" (0–1), que cai com o tempo; a tremida usa trauma² e ruído suave (nunca aleatório por quadro). Impacto leve quase não treme; o grande treme forte e curto.
- **Linhas de velocidade seguem o caminho do movimento** (radiais no impacto, paralelas na corrida).
- Clarão: no máximo 0,15 s.
- **Não exagerar**: no máximo 1 quadro de impacto e 2 tremidas fortes por cena.

## 4. Quadros de mangá (cut-ins)
- Sempre em pixel art (`pixel: 6`, ~6 tons por canal).
- Não usar quadro com olhos ampliados (o dono do jogo não gostou).
- Ação: quadros **diagonais**, com divisória branca de 8–14 px; calma: quadros retos.
- O quadro entra deslizando em 6–10 quadros e sai em corte seco.
- Conteúdo típico: faixa dos olhos, pé na bola, bola girando, silhueta em contraluz.
- No máximo 3 quadros ao mesmo tempo; o quadro principal é o maior.
- Retícula (pontinhos de mangá) nas sombras dos cut-ins; nunca por cima dos rostos inteiros.

## 5. Cor e luz
- Noite de estádio: céu azul-marinho (#0b1636 → #1e3a8a), refletores brancos frios, gramado verde vivo.
- Cada personagem tem a sua cor de destaque (aura, olhos, linhas):
  - Você: ciano `#00f5d4` · Rin: verde-água `#2dd4bf` · Sae: rosa `#fb7185`
  - Aiku: âmbar `#f59e0b` · Ego: ciano frio `#22d3ee` · Bachira: amarelo `#facc15`
- Momentos de "tempo parado": preto e branco com tom azulado; a cor volta no golpe.
- Contraluz: silhueta escura com brilho em volta e só os olhos acesos.

## 6. Texto na tela
- **Pouco texto.** Fala vai na legenda. Na imagem só: placar, um letreiro discreto de lugar/minuto, e no máximo 1–2 onomatopeias no golpe principal ("DOM!!", "GOOOL!!").
- Nada de letreiro explicando o que está acontecendo ("O SAE CONDUZ!"): a imagem conta.
- Fonte: itálico pesado (900) para impacto; letreiros pequenos espaçados (letter-spacing) para lugar/minuto.

## 7. Arquivos de imagem (opcional)
- Pasta: `img/cenas/<cena>/<nome>.png` (fundo transparente quando for personagem).
- Se o arquivo existir, `cine_art.js` usa a imagem; se não, desenha a versão de código.
- Lista do que cada cena usa: `docs/cenas/<cena>.md`.

## 8. Proibido
- Close do boneco pixelado ampliado (rosto em blocos).
- Auras gigantes por cima dos bonecos, números flutuando no rosto, letreiros explicativos.
- Quadro de olhos ampliados; bonecos cortados e enormes na frente da câmera.
- Câmera colada nas costas de um boneco (vira mancha).
- Prints/frames do anime dentro do jogo (são só referência).

## 9. Processo de cada cena
1. Roteiro de planos (o que cada plano mostra e quanto dura).
2. Montar a cena; fotografar um quadro de cada plano; corrigir enquadramento.
3. Gerar o vídeo de quadros (`previa_sprites/<cena>/assistir.html`) e revisar o movimento.
4. Só depois mostrar para aprovação.
