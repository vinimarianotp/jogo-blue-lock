// ============================================================================
// ANIMAÇÕES DOS BONECOS (SPRITES 2.0) — tabela de quadros-chave do esqueleto
//
// Animação nova = entrada nova aqui; TODOS os personagens herdam (cada um só
// fornece paleta, cabelo, olhos e itens). Cada quadro tem a sua duração (d, em
// ticks de 1/60 s), então o impacto pode "segurar" e o resto andar rápido.
//
// Campos do quadro (ângulos em graus, distâncias em unidades da grade de 36):
//   view   'front' | 'side' | 'back'   (o jogo pode trocar a direção)
//   lean   inclinação do tronco pra frente        breath  tronco mais alto (respira)
//   y      quadril mais baixo (+) / alto (−)      air     altura do chão (pulo)
//   roll   corpo inteiro girado na tela (deitado) ground  false = não encosta no chão
//   head   [inclinação, dx, dy]                   hair    [dx, dy] atraso do cabelo (px)
//   LR/LL  perna direita/esquerda: [coxa, dobra do joelho, ponta do pé, abertura]
//          coxa + = pra frente; joelho + = canela pra trás; pé + = ponta pra baixo
//   AR/AL  braço direito/esquerdo: [ombro, dobra do cotovelo, abertura, abertura do antebraço]
//          ombro + = pra frente; cotovelo + = antebraço pra frente/cima
//   expr   expressão; fx: efeitos (dustS, dustL, dustTrail, speed, impact, stars,
//          sparkle, sweat); ball / ballAtToe / ballFx: bola na pose
// ============================================================================
(function () {
  // Espelha um quadro (troca direita ↔ esquerda): metade de um ciclo vira a outra
  const swap = (f) => Object.assign({}, f, { LR: f.LL, LL: f.LR, AR: f.AL, AL: f.AR });

  // CORRER: contato → recebe o peso → passagem → impulso (e o espelho)
  const RUN_HALF = [
    { d: 5, lean: 13, LR: [34, 10, 4], LL: [-34, 72, 22], AR: [-42, 72], AL: [42, 86], hair: [-1, 1], fx: ['dustS'] },
    { d: 5, lean: 15, y: 0.5, LR: [14, 34, -2], LL: [-12, 104, 34], AR: [-24, 78], AL: [24, 90], hair: [-1, 0] },
    { d: 5, lean: 14, LR: [-8, 18, 14], LL: [30, 112, 30], AR: [2, 84], AL: [0, 88], hair: [-1, -1] },
    { d: 5, lean: 13, air: 0.9, LR: [-34, 34, 52], LL: [60, 92, 4], AR: [40, 84], AL: [-38, 70], hair: [-1, 0] }
  ];

  const ANIMS = {
    // PARADO: respira (ombro e cabeça sobem 1 px), braços acompanham; pisca no jogo
    idle: {
      loop: true,
      view: 'front',
      frames: [
        { d: 18, AR: [2, 12, 9], AL: [2, 12, 9], LR: [0, 2, 0, 4], LL: [0, 2, 0, 4] },
        { d: 10, breath: 0.5, AR: [3, 13, 10], AL: [3, 13, 10], LR: [0, 2, 0, 4], LL: [0, 2, 0, 4], hair: [0, 1] },
        { d: 18, breath: 0.5, AR: [3, 15, 11], AL: [3, 15, 11], LR: [0, 2, 0, 4], LL: [0, 2, 0, 4] },
        { d: 10, AR: [2, 13, 10], AL: [2, 13, 10], LR: [0, 2, 0, 4], LL: [0, 2, 0, 4], hair: [0, -1] }
      ]
    },
    run: {
      loop: true,
      view: 'side',
      frames: RUN_HALF.concat(RUN_HALF.map(swap))
    },
    // CORRER DE FRENTE / DE COSTAS: de frente a passada (perna pra frente/trás) quase não
    // aparece — o que mostra a corrida é o JOELHO SUBINDO, uma perna de cada vez, o pé
    // de baixo no chão e o corpo quicando na troca. Mesmo número de quadros da corrida (8).
    runFB: {
      loop: true,
      view: 'front',
      frames: (() => {
        const half = [
          { d: 5, lean: 5, LR: [38, 74, 4, 4], LL: [-4, 10, 0, 4], AR: [-28, 60, 12], AL: [30, 82, 12], hair: [0, 1] },
          { d: 5, lean: 6, air: 0.5, LR: [66, 108, 10, 4], LL: [-8, 16, 4, 4], AR: [-40, 52, 12], AL: [46, 92, 12], hair: [0, 1] },
          { d: 5, lean: 5, air: 0.9, LR: [30, 44, 0, 4], LL: [-6, 30, 8, 4], AR: [-14, 66, 12], AL: [14, 76, 12], hair: [0, 0] },
          { d: 5, lean: 4, LR: [4, 10, 0, 4], LL: [8, 40, 4, 4], AR: [2, 70, 12], AL: [-2, 72, 12], hair: [0, -1], fx: ['dustS'] }
        ];
        return half.concat(half.map(swap));
      })()
    },
    // CORRER DE COSTAS: o joelho que sobe vai pra longe da câmera e some atrás do corpo; o
    // que aparece é a SOLA da chuteira subindo atrás (calcanhar no bumbum), um pé de cada vez
    runB: {
      loop: true,
      view: 'back',
      frames: (() => {
        const half = [
          { d: 5, lean: 6, LR: [8, 112, 22, 4], LL: [-6, 12, 2, 4], AR: [30, 76, 12], AL: [-28, 62, 12], hair: [0, 1] },
          { d: 5, lean: 7, air: 0.5, LR: [2, 132, 34, 4], LL: [-10, 18, 6, 4], AR: [44, 90, 12], AL: [-40, 52, 12], hair: [0, 1] },
          { d: 5, lean: 6, air: 0.9, LR: [18, 64, 4, 4], LL: [-6, 34, 10, 4], AR: [14, 76, 12], AL: [-14, 66, 12], hair: [0, 0] },
          { d: 5, lean: 5, LR: [4, 10, 0, 4], LL: [6, 46, 6, 4], AR: [-2, 72, 12], AL: [2, 70, 12], hair: [0, -1], fx: ['dustS'] }
        ];
        return half.concat(half.map(swap));
      })()
    },

    // PULAR: agacha (antecipação) → impulso → sobe encolhendo → topo (segura) → cai → amortece
    jump: {
      view: 'side',
      frames: [
        { d: 7, lean: 20, LR: [44, 78, -12], LL: [38, 82, -12], AR: [-52, 18, 16], AL: [-58, 14, 16], hair: [0, -1], expr: 'determined' },
        // (de 3/4 os braços sobem em "V": o da frente vai pra trás da cabeça pelo lado de fora
        // e o de trás pra frente — assim a mão nunca tampa a cara)
        { d: 4, lean: 6, air: 1.2, LR: [-6, 6, 48], LL: [-14, 20, 44], AR: [-112, 16, 26], AL: [112, 16, 26], hair: [0, 2] },
        { d: 5, lean: 2, air: 4.4, LR: [34, 60, 18], LL: [14, 64, 26], AR: [-142, 10, 30], AL: [142, 10, 30], hair: [0, 2] },
        { d: 9, lean: 0, air: 5.8, LR: [58, 84, 8], LL: [42, 92, 16], AR: [-152, 6, 32], AL: [152, 6, 32], expr: 'happy' },
        { d: 5, lean: 4, air: 3.0, LR: [22, 22, 0], LL: [10, 28, 8], AR: [-104, 20, 34], AL: [104, 20, 34], hair: [0, -2] },
        { d: 6, lean: 16, breath: -0.5, LR: [46, 84, -8], LL: [40, 88, -8], AR: [40, 50, 40], AL: [30, 50, 40], hair: [0, -1], fx: ['dustS'] },
        { d: 9, lean: 4, LR: [8, 12, 0], LL: [4, 14, 0], AR: [10, 30, 12], AL: [-4, 22, 12] }
      ]
    },

    // CHUTAR: aproximação → pé de apoio → perna lá atrás (segura) → IMPACTO (segura, com
    // rastro) → follow-through (perna sobe, corpo vai pra trás) → volta
    kick: {
      view: 'side',
      frames: [
        { d: 6, lean: 10, LR: [28, 22, 4], LL: [-26, 62, 22], AR: [-30, 50, 12], AL: [32, 70, 12], ball: [26.5, 30.6] },
        { d: 5, lean: 6, LL: [20, 16, 0], LR: [-36, 92, 30], AR: [-42, 24, 34], AL: [58, 34, 40], expr: 'determined', ball: [26.5, 30.6], hair: [-1, 0] },
        { d: 9, lean: 0, head: [-4], LL: [14, 18, 0], LR: [-58, 112, 44], AR: [-62, 14, 44], AL: [84, 22, 54], expr: 'determined', ball: [26.5, 30.6], hair: [-1, 1] },
        { d: 11, lean: -8, LL: [6, 10, 0], LR: [50, 4, 52], AR: [-34, 18, 56], AL: [40, 12, 64], expr: 'shout', fx: ['impact'], swoosh: [-58, 52], ballAtToe: true, hair: [1, 0] },
        { d: 6, lean: -16, head: [6], LL: [-2, 4, 22], LR: [96, 18, 60], AR: [-52, 10, 52], AL: [14, 22, 70], expr: 'shout', ball: [36, 21], ballFx: true, hair: [2, -1] },
        { d: 8, lean: -5, LL: [2, 8, 0], LR: [40, 52, 12], AR: [-12, 30, 22], AL: [20, 32, 30], hair: [1, 0] },
        { d: 9, lean: 4, LL: [0, 4, 0], LR: [10, 14, 0], AR: [6, 20, 10], AL: [-2, 18, 10] }
      ]
    },

    // DESLIZAR: entra de lado no chão, perna da frente esticada, mão de apoio atrás, poeira
    slide: {
      view: 'side',
      frames: [
        Object.assign({}, RUN_HALF[0], { fx: [] }),
        { d: 4, lean: -22, LR: [66, 14, 10], LL: [16, 92, 18], AR: [-64, 12, 40], AL: [72, 40, 40], expr: 'determined', fx: ['dustS'], hair: [-1, 1] },
        { d: 6, lean: -58, head: [-18], LR: [84, 0, 24], LL: [44, 104, 10], AR: [-128, 16, 22], AL: [66, 60, 34], expr: 'determined', fx: ['dustL'], hair: [-2, 0] },
        { d: 6, lean: -60, head: [-18], LR: [86, 0, 26], LL: [46, 106, 10], AR: [-130, 16, 22], AL: [70, 58, 34], expr: 'determined', fx: ['dustL', 'dustTrail'], hair: [-2, 1] },
        { d: 6, lean: -46, head: [-10], LR: [78, 4, 18], LL: [40, 100, 8], AR: [-120, 20, 22], AL: [50, 70, 30], fx: ['dustTrail'], hair: [-1, 0] },
        { d: 8, lean: 14, LR: [52, 84, 0], LL: [32, 96, 0], AR: [30, 50, 20], AL: [-10, 40, 20], hair: [0, -1] }
      ]
    },

    // DIVIDIR (carrinho): investida → carrinho na bola → desliza → levanta
    tackle: {
      view: 'side',
      frames: [
        Object.assign({}, RUN_HALF[1], { fx: [] }),
        { d: 4, lean: 26, LR: [52, 30, 10], LL: [-40, 62, 30], AR: [-42, 22, 30], AL: [44, 40, 30], expr: 'determined', fx: ['dustS'], hair: [-1, 1] },
        { d: 9, lean: -42, head: [-12], LR: [88, 0, 34], LL: [30, 112, 0], AR: [-112, 12, 30], AL: [72, 40, 50], expr: 'shout', fx: ['dustL', 'impact'], ballAtToe: true, hair: [-2, 0] },
        { d: 6, lean: -40, head: [-12], LR: [86, 2, 30], LL: [32, 110, 0], AR: [-110, 14, 30], AL: [64, 46, 46], expr: 'determined', fx: ['dustTrail'], ball: [37, 30.6], hair: [-1, 1] },
        { d: 7, lean: 22, LR: [62, 96, 0], LL: [74, 116, 0], AR: [34, 60, 16], AL: [-12, 40, 16], ball: [32, 30.6] },
        { d: 8, lean: 6, LR: [12, 14, 0], LL: [-4, 12, 0], AR: [10, 30, 12], AL: [-6, 20, 12], expr: 'determined', ball: [28, 30.6] }
      ]
    },

    // CAIR: tropeça → voa → bate de cara no chão → quica → fica deitado (tonto)
    fall: {
      view: 'side',
      loop: false,
      frames: [
        { d: 5, lean: 24, LR: [-22, 42, 20], LL: [30, 12, 0], AR: [42, 60, 40], AL: [74, 40, 40], expr: 'scared', hair: [0, 1] },
        { d: 5, lean: 46, air: 0.8, LR: [-42, 62, 30], LL: [-12, 40, 20], AR: [112, 12, 30], AL: [124, 12, 30], expr: 'scared', hair: [-1, 1] },
        { d: 5, roll: 70, air: 1.6, LR: [-14, 34, 30], LL: [-32, 64, 30], AR: [150, 10, 24], AL: [160, 8, 24], expr: 'scared', hair: [-2, 0] },
        { d: 4, roll: 90, LR: [0, 14, 30], LL: [-10, 46, 30], AR: [168, 8, 16], AL: [176, 6, 16], expr: 'hurt', fx: ['dustL'] },
        { d: 4, roll: 88, air: 0.5, LR: [-4, 30, 30], LL: [-18, 74, 30], AR: [170, 8, 16], AL: [176, 6, 16], expr: 'hurt', fx: ['dustS'], hair: [1, 0] },
        { d: 14, roll: 90, LR: [0, 4, 34], LL: [-4, 34, 34], AR: [172, 6, 14], AL: [178, 4, 14], expr: 'hurt' },
        { d: 24, roll: 90, LR: [0, 4, 34], LL: [-4, 34, 34], AR: [172, 6, 14], AL: [178, 4, 14], expr: 'hurt', fx: ['stars'] }
      ]
    },

    // FERIDO: recua com o golpe → encolhe com a mão na barriga → segura o joelho e pula num pé só
    hurt: {
      view: 'side',
      frames: [
        { d: 4, lean: -10, head: [-8], LR: [6, 6, 0], LL: [-4, 8, 0], AR: [34, 104, 12], AL: [20, 30, 34], expr: 'hurt', hair: [1, 0] },
        { d: 7, lean: 20, LR: [22, 32, 0], LL: [6, 20, 0], AR: [44, 112, 10], AL: [34, 104, 10], expr: 'hurt', fx: ['sweat'] },
        { d: 8, lean: 34, LR: [62, 104, 0], LL: [10, 22, 0], AR: [74, 70, 12], AL: [64, 80, 12], expr: 'hurt', fx: ['sweat'] },
        { d: 6, lean: 30, air: 1.3, LR: [66, 112, 0], LL: [-4, 30, 30], AR: [72, 74, 12], AL: [62, 84, 12], expr: 'hurt', fx: ['sweat'], hair: [0, 1] },
        { d: 9, lean: 12, LR: [20, 30, 0], LL: [4, 10, 0], AR: [34, 104, 12], AL: [10, 24, 12], expr: 'hurt' }
      ]
    },

    // COMEMORAÇÃO: prepara → soco no ar → pulo com os dois braços → aterrissa → aponta pro céu → muque
    celebrate: {
      view: 'front',
      frames: [
        { d: 6, LR: [20, 40, 0, 8], LL: [20, 40, 0, 8], AR: [24, 116, 12], AL: [24, 116, 12], expr: 'determined', hair: [0, -1] },
        { d: 6, air: 1.2, LR: [0, 4, 30, 6], LL: [0, 4, 30, 6], AR: [0, 4, 166], AL: [16, 122, 22], expr: 'shout', hair: [0, 1] },
        { d: 9, air: 4.2, LR: [26, 58, 10, 12], LL: [26, 58, 10, 12], AR: [0, 0, 162], AL: [0, 0, 162], expr: 'laugh', fx: ['sparkle'], hair: [0, 1] },
        { d: 6, breath: -0.5, LR: [18, 36, 0, 10], LL: [18, 36, 0, 10], AR: [0, 20, 142], AL: [0, 20, 142], expr: 'happy', hair: [0, -1] },
        { d: 10, AR: [10, 0, 172], AL: [4, 18, 14], LR: [0, 2, 0, 5], LL: [0, 2, 0, 5], expr: 'smirk' },
        { d: 16, AR: [0, 0, 92, 176], AL: [0, 0, 92, 176], LR: [0, 2, 0, 7], LL: [0, 2, 0, 7], expr: 'laugh', fx: ['sparkle'] }
      ]
    },

    // APLAUDIR: as duas mãos se encontram na frente do peito (abre / bate)
    clap: {
      view: 'front',
      loop: true,
      frames: [
        // (sem expressão: cada um aplaude com a própria cara — o Noa continua sério)
        { d: 6, AR: [36, 82, 4, -52], AL: [36, 82, 4, -52], LR: [0, 2, 0, 4], LL: [0, 2, 0, 4] },
        { d: 6, AR: [40, 88, -2, -88], AL: [40, 88, -2, -88], LR: [0, 2, 0, 4], LL: [0, 2, 0, 4], hair: [0, 1] }
      ]
    },

    // ---- as que o motor da partida já usa (refeitas no mesmo padrão)
    // PEDIR A BOLA: levanta o braço e acena
    call: {
      view: 'front',
      loop: true,
      frames: [
        { d: 8, AR: [0, 10, 150, 170], AL: [2, 12, 9], LR: [0, 2, 0, 4], LL: [0, 2, 0, 4], expr: 'happy' },
        { d: 8, AR: [0, 24, 158, 140], AL: [2, 12, 9], LR: [0, 2, 0, 4], LL: [0, 2, 0, 4], expr: 'happy', hair: [0, 1] }
      ]
    },
    // RABONA: a perna do chute cruza por TRÁS da perna de apoio
    rabona: {
      view: 'side',
      frames: [
        { d: 6, lean: 8, LL: [22, 18, 0], LR: [-30, 70, 30, -10], AR: [-36, 30, 40], AL: [52, 30, 40], ball: [26.5, 30.6], expr: 'determined' },
        { d: 8, lean: 4, LL: [16, 16, 0], LR: [-24, 108, 40, -36], AR: [-50, 20, 50], AL: [70, 24, 50], ball: [26.5, 30.6], expr: 'smirk' },
        { d: 10, lean: -4, LL: [12, 12, 0], LR: [40, 30, 40, -40], AR: [-40, 20, 60], AL: [56, 20, 60], fx: ['impact'], ballAtToe: true, expr: 'smirk' },
        { d: 8, lean: -6, LL: [4, 8, 0], LR: [60, 30, 30, -24], AR: [-30, 20, 40], AL: [30, 30, 40], ball: [35, 26], ballFx: true }
      ]
    },
    // BICICLETA: pula de costas, o corpo gira no ar e a perna passa por cima da cabeça
    bicycle: {
      view: 'side',
      loop: false,
      frames: [
        { d: 6, lean: -16, LR: [30, 60, 0], LL: [36, 70, 0], AR: [-40, 30, 30], AL: [-30, 30, 30], expr: 'determined' },
        { d: 5, roll: -50, air: 3.5, LR: [70, 50, 20], LL: [20, 70, 20], AR: [60, 30, 70], AL: [50, 30, 70], expr: 'determined', hair: [0, 1] },
        { d: 11, roll: -112, air: 6, LR: [126, 0, 40], LL: [24, 96, 20], AR: [20, 20, 86], AL: [10, 20, 86], expr: 'shout', fx: ['impact'], swoosh: [40, 130], ballAtToe: true },
        { d: 6, roll: -118, air: 3.2, LR: [70, 30, 30], LL: [96, 10, 30], AR: [50, 30, 76], AL: [40, 30, 76], expr: 'shout', ball: [8, 4], ballFx: true },
        { d: 10, roll: -90, LR: [40, 34, 10], LL: [30, 56, 10], AR: [-40, 20, 60], AL: [-30, 20, 60], fx: ['dustL'], expr: 'happy' }
      ]
    },
    // GOLEIRO (ponte): agacha → impulso de lado → voa esticado com as luvas na bola → cai
    dive: {
      view: 'front',
      loop: false,
      frames: [
        { d: 6, LR: [30, 60, 0, 14], LL: [30, 60, 0, 14], AR: [40, 60, 30], AL: [40, 60, 30], expr: 'determined' },
        { d: 4, roll: 28, air: 1.5, LR: [0, 10, 30, 6], LL: [10, 40, 20, 24], AR: [0, 10, 120], AL: [0, 10, 70], expr: 'determined' },
        { d: 12, roll: 74, air: 4.5, LR: [0, 4, 30, 4], LL: [0, 20, 30, 16], AR: [0, 0, 172], AL: [0, 4, 164], expr: 'shout', fx: ['impact'] },
        { d: 8, roll: 86, air: 1.2, LR: [0, 4, 30, 4], LL: [0, 30, 30, 18], AR: [0, 0, 170], AL: [0, 8, 160], expr: 'determined' },
        { d: 12, roll: 90, LR: [0, 10, 30, 4], LL: [10, 40, 30, 14], AR: [0, 10, 164], AL: [0, 14, 150], fx: ['dustL'] }
      ]
    }
  };
  // Expressões do rosto (nomes usados pelo jogo e pelo laboratório)
  ANIMS.EXPRESSIONS = ['normal', 'happy', 'determined', 'angry', 'laugh', 'sweat', 'sparkle', 'scared', 'smirk'];
  Object.defineProperty(ANIMS, 'EXPRESSIONS', { enumerable: false });

  window.SPRITE_ANIMS = ANIMS;
})();
