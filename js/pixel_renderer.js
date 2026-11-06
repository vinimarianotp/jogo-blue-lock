// ============================================================================
// BLUE LOCK: EGOIST CAREER - MOTOR DE ANIMAÇÃO 2D PIXEL ART (EM PÉ / SEMI-3D)
// Animações reais quadro-a-quadro: Idle, Corrida (6 frames), Preparo de Chute,
// Chute Explosivo, Bicicleta no Ar, Rabona, Carrinho e Ponte de Goleiro!
// ============================================================================

window.PixelRenderer = {
  rect(ctx, x, y, w, h, color, s) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x * s), Math.round(y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
  },

  // Canvas de rascunho reaproveitados (um por uso) para o contorno e a silhueta colorida
  scratch(name, w, h) {
    if (!this._scratch) this._scratch = {};
    let cv = this._scratch[name];
    if (!cv) cv = this._scratch[name] = document.createElement('canvas');
    if (cv.width < w || cv.height < h) {
      cv.width = Math.max(cv.width, w);
      cv.height = Math.max(cv.height, h);
    }
    return cv;
  },

  // Renderiza o personagem em pé (2.5D) com animações reais de membros articulados.
  // O corpo é desenhado num rascunho e colado com um CONTORNO escuro em volta (o que
  // dá cara de pixel art de verdade); a aura fica atrás, sem contorno.
  // options: {
  //   facing: 'front'|'back'|'side', flipX: false, frame: 0,
  //   animState: 'idle'|'run'|'windup'|'shoot'|'rabona'|'bicycle'|'dive'|'stun',
  //   showAura: false, auraColor: '#38bdf8', accessories: [], shirtNumber: 11,
  //   tint: '#cor' (silhueta inteira nessa cor, para rastros/fantasmas), noOutline: true
  // }
  drawCharacterSprite(ctx, charData, canvasW, canvasH, options = {}) {
    const s = Math.min(canvasW, canvasH) / 36;
    if (options.showAura && !options.tint) {
      this.drawCharacterBody(ctx, charData, canvasW, canvasH, Object.assign({}, options, { auraOnly: true }));
    }
    // Personagem grande é desenhado pequeno (no máximo 5px por unidade, que já é a
    // resolução da pixel art) e ampliado sem suavizar: o custo não cresce com o tamanho
    const rs = Math.min(s, 5);
    const k = s / rs;
    const rw = canvasW / k;
    const rh = canvasH / k;
    const pad = Math.ceil(12 * rs);
    const w = Math.ceil(rw + pad * 2);
    const h = Math.ceil(rh + pad * 2);
    const body = this.scratch('body', w, h);
    const bctx = body.getContext('2d');
    bctx.clearRect(0, 0, w, h);
    bctx.save();
    bctx.translate(pad, pad);
    this.drawCharacterBody(bctx, charData, rw, rh, Object.assign({}, options, { noAura: true }));
    bctx.restore();

    // Monta tudo no tamanho pequeno (contorno + corpo) e amplia UMA vez só no final
    let final = body;
    if (options.tint) {
      bctx.globalCompositeOperation = 'source-in';
      bctx.fillStyle = options.tint;
      bctx.fillRect(0, 0, w, h);
      bctx.globalCompositeOperation = 'source-over';
    } else if (!options.noOutline && s >= 1.2) {
      // Contorno: a silhueta escura deslocada meio "pixel" para os 4 lados, com o corpo por cima
      const comp = this.scratch('comp', w, h);
      const cctx = comp.getContext('2d');
      cctx.clearRect(0, 0, w, h);
      const o = Math.max(1, Math.round(rs * 0.45));
      [[-o, 0], [o, 0], [0, -o], [0, o]].forEach(([dx, dy]) => cctx.drawImage(body, 0, 0, w, h, dx, dy, w, h));
      cctx.globalCompositeOperation = 'source-in';
      cctx.fillStyle = charData.outlineColor || '#0a0f1c';
      cctx.fillRect(0, 0, w, h);
      cctx.globalCompositeOperation = 'source-over';
      cctx.drawImage(body, 0, 0, w, h, 0, 0, w, h);
      final = comp;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(final, 0, 0, w, h, -pad * k, -pad * k, w * k, h * k);
    ctx.restore();
  },

  drawCharacterBody(ctx, charData, canvasW, canvasH, options = {}) {
    const facing = options.facing || 'front';
    const animState = options.animState || (options.moving ? 'run' : 'idle');
    const frame = options.frame || 0;
    const acc = options.accessories || [];
    const grid = 36;
    const s = Math.min(canvasW, canvasH) / grid;

    const skin = charData.skinColor || '#f3d1b8';
    const hair = charData.hairColor || '#0f172a';
    const hair2 = charData.hairSecondary || hair;
    const eye = charData.eyeColor || '#ef4444';
    const jersey1 = charData.jerseyPrimary || '#0f2942';
    const jersey2 = charData.jerseySecondary || '#1d4ed8';
    const style = charData.hairStyle || 'spiky_tall';
    const aura = options.auraColor || charData.auraColor || '#38bdf8';

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Suporte a espelhamento horizontal (olhando para a esquerda ou direita no campo Semi-3D)
    // e rotações de animação (Bicicleta no ar, Ponte de goleiro, Chute)
    const cx = canvasW / 2;
    const cy = canvasH / 2 + 2 * s;
    ctx.translate(cx, cy);
    if (options.flipX) ctx.scale(-1, 1);

    if (animState === 'bicycle') {
      // Giro acrobático no ar (Bicicleta / Dragon Drive)
      ctx.rotate(-Math.PI * 0.65);
    } else if (animState === 'dive') {
      // Ponte horizontal de goleiro voando no ângulo!
      ctx.rotate(Math.PI * 0.38);
    } else if (animState === 'slide') {
      // Carrinho deslizando no gramado (Tecla F)!
      ctx.translate(0, 6 * s);
      ctx.rotate(-Math.PI * 0.42);
    } else if (animState === 'shoot') {
      ctx.rotate(-0.14);
    } else if (animState === 'windup') {
      ctx.rotate(0.12);
    } else if (animState === 'run') {
      ctx.rotate(0.08);
    }
    ctx.translate(-cx, -cy);

    // Cálculo de cinemática de ciclo de corrida (6 quadros reais) e respiração
    const runCycle = (frame * 0.38) % (Math.PI * 2);
    const isRunning = animState === 'run';
    const bob = isRunning
      ? Math.abs(Math.sin(runCycle)) * -1.8
      : Math.sin(frame * 0.14) * 0.6;

    let leftLegX = 0, leftLegY = 0;
    let rightLegX = 0, rightLegY = 0;
    let leftArmX = 0, leftArmY = 0;
    let rightArmX = 0, rightArmY = 0;

    if (isRunning) {
      leftLegX = Math.sin(runCycle) * 3.2;
      leftLegY = Math.max(0, -Math.cos(runCycle) * 2.2);
      rightLegX = -Math.sin(runCycle) * 3.2;
      rightLegY = Math.max(0, Math.cos(runCycle) * 2.2);
      leftArmX = -Math.sin(runCycle) * 2.5;
      leftArmY = Math.cos(runCycle) * 1.2;
      rightArmX = Math.sin(runCycle) * 2.5;
      rightArmY = -Math.cos(runCycle) * 1.2;
    } else if (animState === 'windup') {
      // Perna de chute puxada para trás carregando força!
      rightLegX = -4.5;
      rightLegY = -2.5;
      leftArmX = 2.5;
      rightArmX = -2.5;
    } else if (animState === 'shoot' || animState === 'bicycle') {
      // Perna de chute esticada para frente soltando um míssil!
      rightLegX = 5.5;
      rightLegY = -3.5;
      leftArmX = -3;
      rightArmX = 3.5;
      rightArmY = -2;
    } else if (animState === 'rabona' || options.rabonaPose) {
      // Perna cruzada por trás em Rabona!
      rightLegX = -4.2;
      rightLegY = -1.2;
      leftLegX = 1.5;
    } else if (animState === 'dive') {
      // Braços esticados para buscar na gaveta!
      leftArmY = -6;
      rightArmY = -6;
      leftArmX = 2;
      rightArmX = 3;
    } else if (animState === 'slide') {
      // Perna de carrinho esticada lá na frente e outra recolhida!
      rightLegX = 6.5;
      rightLegY = -1.5;
      leftLegX = -3;
      leftLegY = 1;
      leftArmY = -3;
      rightArmX = 3;
    } else if (animState === 'call_pass') {
      // Braço levantado pedindo a bola (Tecla R)!
      rightArmY = -7;
      rightArmX = 1;
    }

    // 1. Aura do Ego: labaredas tremulando em volta da silhueta (antes era um retângulo).
    // Desenhada numa passada separada (auraOnly), atrás do corpo e sem contorno.
    if (options.showAura && aura && !options.noAura) {
      const flame = (x, base, h, w, alpha, color) => {
        ctx.globalAlpha = alpha;
        for (let k = 0; k < h; k += 1) {
          const ww = w * (1 - k / (h + 1));
          this.rect(ctx, x + (w - ww) / 2 + Math.sin(frame * 0.25 + k * 0.6 + x) * 0.4, base - k - 1, ww, 1, color, s);
        }
      };
      for (let i = 0; i < 12; i++) {
        const x = 7 + i * 1.9;
        const edge = Math.min(i, 11 - i);
        const h = 6 + (edge < 2 ? 18 : 6) + Math.sin(frame * 0.3 + i * 1.7) * 3 + (edge < 2 ? 0 : 20 - edge * 2);
        flame(x, 31 + bob, Math.max(4, h), 2.6, 0.22, aura);
      }
      for (let i = 0; i < 6; i++) {
        const x = 10 + i * 3;
        flame(x, 6 + bob, 4 + Math.abs(Math.sin(frame * 0.35 + i * 2.1)) * 5, 2, 0.32, aura);
      }
      // Faíscas subindo
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < 4; i++) {
        const py = 30 - ((frame * 0.8 + i * 9) % 32);
        const px = 7 + ((i * 7 + Math.floor(frame / 9)) % 22);
        this.rect(ctx, px, py + bob, 1, 1.4, '#ffffff', s);
      }
      ctx.globalAlpha = 1;
    }
    if (options.auraOnly) {
      ctx.restore();
      return;
    }

    // 2. Acessório de Costas: BONE WINGS (Asas Ósseas articuladas)
    if (acc.includes('bone_wings')) {
      const flap = Math.sin(frame * 0.2) * 1.5;
      const wy = 13 + bob + flap;
      this.rect(ctx, 2, wy - 2, 8, 2, '#f1f5f9', s);
      this.rect(ctx, 1, wy, 2, 7, '#cbd5e1', s);
      this.rect(ctx, 5, wy, 2, 5, '#94a3b8', s);
      this.rect(ctx, 26, wy - 2, 8, 2, '#f1f5f9', s);
      this.rect(ctx, 33, wy, 2, 7, '#cbd5e1', s);
      this.rect(ctx, 29, wy, 2, 5, '#94a3b8', s);
    }

    // Roupa: 'kit' (uniforme de jogo, padrão), 'suit' (terno do Ego), 'office' (blazer e saia da Anri),
    // 'casual' (cardigã aberto, camiseta branca, jeans e tênis — o disfarce do Bunny; cor em clothesColor)
    const outfit = charData.outfit || 'kit';
    const skinShade = this.shade(skin, -0.14);
    const clothes = outfit === 'suit' ? '#0b0f1a' : outfit === 'office' ? '#1e2a44' : outfit === 'casual' ? charData.clothesColor || '#8b8f99' : jersey1;
    const legStyle = outfit === 'suit' ? { leg: '#0b0f1a', sock: '#0b0f1a', boot: '#020617', stud: '#334155' }
      : outfit === 'office' ? { leg: '#2b3448', sock: '#2b3448', boot: '#0b0f1a', stud: '#0b0f1a' }
      : outfit === 'casual' ? { leg: '#27406b', sock: '#27406b', boot: '#e5e7eb', stud: '#94a3b8' }
      : { leg: skin, sock: jersey2, boot: '#1e3a8a', stud: null };

    // 3. Perna de Trás (Esquerda) Articulada
    const baseLegY = 23 + bob;
    this.drawLeg(ctx, 12 + leftLegX, baseLegY - leftLegY, legStyle.leg, legStyle.sock, legStyle.boot, legStyle.stud || '#38bdf8', s, outfit);

    // 4. Braço de Trás (Esquerdo) Articulado
    const torsoY = 14 + bob;
    this.drawArm(ctx, 8 + leftArmX, torsoY + leftArmY, skin, acc, s, true, outfit === 'kit' ? null : clothes);

    // 5. Calção (ou calça/saia) e Tronco
    if (outfit === 'office') {
      this.rect(ctx, 11.6, 20 + bob, 12.8, 4.6, clothes, s);
      this.rect(ctx, 21.4, 20 + bob, 3, 4.6, this.shade(clothes, -0.3), s);
    } else {
      const shorts = outfit === 'suit' ? clothes : outfit === 'casual' ? '#27406b' : jersey2 === '#ffffff' ? '#1e3a8a' : '#111827';
      this.rect(ctx, 12, 20 + bob, 12, 4, shorts, s);
      this.rect(ctx, 21, 20 + bob, 3, 4, this.shade(shorts, -0.35), s);
      if (outfit === 'kit') this.rect(ctx, 17, 21 + bob, 2, 3, jersey1, s);
    }

    if (outfit === 'kit') {
      // Camisa / Colete Blue Lock: faixas laterais, gola em V e sombra do lado direito
      this.rect(ctx, 11, torsoY, 14, 7, jersey1, s);
      this.rect(ctx, 11, torsoY, 2, 7, jersey2, s);
      this.rect(ctx, 23, torsoY, 2, 7, jersey2, s);
      this.rect(ctx, 20.6, torsoY + 0.8, 2.4, 6.2, this.shade(jersey1, -0.22), s);
      this.rect(ctx, 11, torsoY + 6.2, 14, 0.8, this.shade(jersey1, -0.32), s);
      this.rect(ctx, 15, torsoY, 6, 1, '#090d16', s);
      if (facing !== 'back') {
        this.rect(ctx, 16, torsoY + 1, 4, 0.8, jersey2, s);
        this.rect(ctx, 17, torsoY + 1.8, 2, 0.8, jersey2, s);
      }
    } else {
      // Terno / blazer: paletó com lapelas, camisa branca e (no Ego) gravata
      this.rect(ctx, 11, torsoY, 14, 7, clothes, s);
      this.rect(ctx, 20.6, torsoY + 0.6, 4.4, 6.4, this.shade(clothes, -0.3), s);
      if (outfit === 'casual' && facing !== 'back') {
        // Cardigã aberto sobre camiseta branca
        this.rect(ctx, 15.4, torsoY, 5.2, 7, '#f1f5f9', s);
        this.rect(ctx, 19.6, torsoY + 0.4, 1, 6.6, '#cbd5e1', s);
        this.rect(ctx, 15, torsoY, 0.8, 7, this.shade(clothes, -0.35), s);
        this.rect(ctx, 20.4, torsoY, 0.8, 7, this.shade(clothes, -0.35), s);
        this.rect(ctx, 16.6, torsoY, 2.8, 0.6, '#cbd5e1', s);
      } else if (facing !== 'back') {
        this.rect(ctx, 16, torsoY, 4, 3.2, '#f1f5f9', s);
        this.rect(ctx, 17, torsoY + 3.2, 2, 1.2, '#f1f5f9', s);
        if (outfit === 'suit') {
          this.rect(ctx, 17.5, torsoY + 0.6, 1, 4.4, '#111827', s);
        } else {
          this.rect(ctx, 16.6, torsoY, 2.8, 0.8, '#e2e8f0', s);
        }
        this.rect(ctx, 15, torsoY, 1, 4.2, this.shade(clothes, 0.18), s);
        this.rect(ctx, 20, torsoY, 1, 4.2, this.shade(clothes, 0.1), s);
        this.rect(ctx, 17.6, torsoY + 5.2, 0.8, 0.8, '#94a3b8', s);
      }
    }

    if (facing === 'back' && outfit === 'kit') {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(8, Math.floor(s * 4.5))}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(String(options.shirtNumber || charData.number || 11), 18 * s, (torsoY + 5.5) * s);
    }

    // 6. Perna da Frente (Direita / Chute) Articulada + Arco de Chute Animado!
    this.drawLeg(ctx, 19 + rightLegX, baseLegY - rightLegY, legStyle.leg, legStyle.sock, legStyle.boot, legStyle.stud || '#facc15', s, outfit);

    if (animState === 'shoot' || animState === 'bicycle') {
      // Arco de vento / energia cortando o ar no chute!
      ctx.globalAlpha = 0.85;
      this.rect(ctx, 24, baseLegY - 5, 8, 2, aura, s);
      this.rect(ctx, 27, baseLegY - 8, 6, 3, '#ffffff', s);
      this.rect(ctx, 29, baseLegY - 12, 4, 4, aura, s);
      ctx.globalAlpha = 1;
    }

    // 7. Braço da Frente (Direito) Articulado
    this.drawArm(ctx, 25 + rightArmX, torsoY + rightArmY, skin, acc, s, false, outfit === 'kit' ? null : clothes);

    // 8. Cabeça: queixo afinando, orelhas, pescoço e sombra no lado direito do rosto
    const headY = 5 + bob;
    this.rect(ctx, 16, headY + 8.4, 4, 1, skinShade, s);
    this.rect(ctx, 12, headY, 12, 8, skin, s);
    this.rect(ctx, 12.8, headY + 8, 10.4, 0.6, skin, s);
    this.rect(ctx, 14, headY + 8.5, 8, 0.6, skin, s);
    // Queixo comprido e fino (Ego)
    if (charData.longChin) {
      this.rect(ctx, 15.2, headY + 9, 5.6, 0.7, skin, s);
      this.rect(ctx, 16.4, headY + 9.6, 3.2, 0.5, skin, s);
    }
    this.rect(ctx, 11.4, headY + 4, 0.8, 2.2, skinShade, s);
    this.rect(ctx, 23.8, headY + 4, 0.8, 2.2, skinShade, s);
    if (facing !== 'back') this.rect(ctx, 22.8, headY + 1, 1.2, 7, this.shade(skin, -0.07), s);

    if (facing !== 'back') {
      if (acc.includes('balaclava')) {
        this.rect(ctx, 12, headY, 12, 9, '#111827', s);
        this.rect(ctx, 13, headY + 3, 10, 3, skin, s);
      }

      // Olhos estilo anime: traço do cílio em cima, íris, pupila e brilho
      // (piscam raramente ou brilham em Fluxo/Chute)
      const blink = frame % 110 === 0 && !options.showAura;
      if (blink) {
        this.rect(ctx, 13, headY + 5, 3, 1, '#090d16', s);
        this.rect(ctx, 20, headY + 5, 3, 1, '#090d16', s);
      } else if (charData.eyeStyle === 'wide') {
        // Olhos arregalados (Ego): branco grande e pupila pequena e escura no meio
        this.rect(ctx, 12.9, headY + 4, 3.3, 2.5, '#ffffff', s);
        this.rect(ctx, 19.8, headY + 4, 3.3, 2.5, '#ffffff', s);
        this.rect(ctx, 14, headY + 4.6, 1.3, 1.4, eye, s);
        this.rect(ctx, 20.7, headY + 4.6, 1.3, 1.4, eye, s);
        this.rect(ctx, 12.9, headY + 3.9, 3.3, 0.4, '#0a0f1c', s);
        this.rect(ctx, 19.8, headY + 3.9, 3.3, 0.4, '#0a0f1c', s);
      } else {
        // Formatos de olho (escolhidos no ✏️ PERSONALIZAR ou fixos de cada personagem).
        // r(x, y, w, h, cor) desenha no olho esquerdo e espelhado no direito
        const es = charData.eyeStyle;
        const dark = '#0a0f1c';
        const pupil = this.shade(eye, -0.5);
        const r = (x, y, w, h, c) => {
          this.rect(ctx, x, headY + y, w, h, c, s);
          this.rect(ctx, 36 - x - w, headY + y, w, h, c, s);
        };
        if (es === 'sharp') {
          // Afiado: olho estreito, íris alta com pupila em fenda e o canto de fora subindo
          r(13, 4.3, 3, 1.6, '#ffffff');
          r(14, 4.1, 1.6, 1.9, eye);
          r(14.55, 4.3, 0.5, 1.5, pupil);
          r(14.1, 4.3, 0.4, 0.4, '#ffffff');
          r(12.8, 3.7, 3.4, 0.5, dark);
          r(12.3, 3.3, 1.1, 0.5, dark);
        } else if (es === 'round') {
          // Brilhante: olho grande e redondo, íris enorme e dois brilhos
          r(13, 3.8, 3, 2.6, '#ffffff');
          r(13.5, 3.9, 2.3, 2.5, eye);
          r(14.2, 4.7, 1, 1.2, pupil);
          r(13.7, 4.0, 0.75, 0.75, '#ffffff');
          r(15.1, 5.6, 0.4, 0.4, '#ffffff');
          r(12.8, 3.4, 3.4, 0.55, dark);
        } else if (es === 'fierce') {
          // Predador: íris pequena no meio do branco e a pálpebra descendo para o meio (bravo)
          r(13, 4.2, 3, 1.8, '#ffffff');
          r(14.1, 4.4, 1.4, 1.4, eye);
          r(14.55, 4.8, 0.5, 0.6, pupil);
          r(12.8, 3.6, 1.2, 0.5, dark);
          r(13.9, 3.9, 1.2, 0.5, dark);
          r(15, 4.2, 1.2, 0.5, dark);
          r(13, 6.0, 3, 0.3, dark);
        } else {
          this.rect(ctx, 13, headY + 4, 3, 2.2, '#ffffff', s);
          this.rect(ctx, 20, headY + 4, 3, 2.2, '#ffffff', s);
          this.rect(ctx, 14, headY + 4, 2, 2.2, eye, s);
          this.rect(ctx, 20, headY + 4, 2, 2.2, eye, s);
          this.rect(ctx, 14.6, headY + 4.8, 1, 1.4, pupil, s);
          this.rect(ctx, 20.4, headY + 4.8, 1, 1.4, pupil, s);
          this.rect(ctx, 14, headY + 4.4, 0.6, 0.6, '#ffffff', s);
          this.rect(ctx, 20, headY + 4.4, 0.6, 0.6, '#ffffff', s);
          this.rect(ctx, 12.8, headY + 3.8, 3.4, 0.5, dark, s);
          this.rect(ctx, 19.8, headY + 3.8, 3.4, 0.5, dark, s);
          if (es === 'lidded') {
            // Olhar semicerrado (Hugo): a pálpebra pesada cobre a metade de cima do olho
            this.rect(ctx, 12.9, headY + 3.9, 3.2, 1.1, skinShade, s);
            this.rect(ctx, 19.9, headY + 3.9, 3.2, 1.1, skinShade, s);
            this.rect(ctx, 12.8, headY + 4.8, 3.4, 0.45, dark, s);
            this.rect(ctx, 19.8, headY + 4.8, 3.4, 0.45, dark, s);
          } else if (es === 'tired') {
            // Sonolento (Nagi): pálpebra cobrindo mais da metade e olheira embaixo
            r(12.9, 3.9, 3.2, 1.4, skinShade);
            r(12.8, 5.1, 3.4, 0.45, dark);
            r(13.2, 6.45, 2.6, 0.3, this.shade(skin, -0.2));
          }
        }
        if (charData.lashes) {
          this.rect(ctx, 12.4, headY + 3.6, 0.8, 0.8, '#0a0f1c', s);
          this.rect(ctx, 22.8, headY + 3.6, 0.8, 0.8, '#0a0f1c', s);
        }

        // Rastro luminoso saindo do olho quando em Fluxo / Ego!
        if (options.showAura || animState === 'shoot' || animState === 'bicycle') {
          this.rect(ctx, 22, headY + 3, 5, 1.2, aura, s);
          this.rect(ctx, 25, headY + 2, 3, 1.2, '#ffffff', s);
        }
      }

      // Sobrancelhas franzidas de determinação (os irmãos Itoshi têm sobrancelha curtinha)
      if (charData.shortBrows) {
        this.rect(ctx, 14, headY + 3, 1.4, 1, '#090d16', s);
        this.rect(ctx, 20.6, headY + 3, 1.4, 1, '#090d16', s);
      } else {
        this.rect(ctx, 13, headY + 3, 3, 1, '#090d16', s);
        this.rect(ctx, 20, headY + 3, 3, 1, '#090d16', s);
      }

      // Nariz (sombrinha) e boca (aberta gritando no chute/fluxo ou fechada)
      this.rect(ctx, 18.2, headY + 6.2, 0.7, 0.7, skinShade, s);
      if (charData.mouth === 'thin') {
        // Boca fina e séria (Ego)
        this.rect(ctx, 16.6, headY + 7.5, 2.8, 0.4, this.shade(skin, -0.45), s);
      } else if (charData.mouth === 'grin') {
        // Sorrisão cheio de dentes (Fox), com os dois da frente maiores
        this.rect(ctx, 15.4, headY + 6.9, 5.2, 1.5, '#0a0f1c', s);
        this.rect(ctx, 15.7, headY + 7.05, 4.6, 0.75, '#f8fafc', s);
        this.rect(ctx, 17.3, headY + 7.05, 0.65, 1.1, '#f8fafc', s);
        this.rect(ctx, 18.05, headY + 7.05, 0.65, 1.1, '#f8fafc', s);
      } else if (charData.mouth === 'gold_grin') {
        // Sorriso de orelha a orelha com os dentes de ouro (Don Lorenzo)
        this.rect(ctx, 14.4, headY + 6.6, 7.2, 2.1, '#1a0b05', s);
        this.rect(ctx, 14, headY + 6.3, 0.8, 0.7, '#1a0b05', s);
        this.rect(ctx, 21.2, headY + 6.3, 0.8, 0.7, '#1a0b05', s);
        this.rect(ctx, 14.8, headY + 6.85, 6.4, 0.75, '#facc15', s);
        this.rect(ctx, 15.2, headY + 7.75, 5.6, 0.7, '#eab308', s);
        [15.9, 17, 18.1, 19.2, 20.3].forEach((x) => this.rect(ctx, x, headY + 6.85, 0.2, 1.6, '#92400e', s));
        this.rect(ctx, 15.2, headY + 6.9, 0.6, 0.3, '#fef9c3', s);
        this.rect(ctx, 18.3, headY + 6.9, 0.6, 0.3, '#fef9c3', s);
      } else if (animState === 'shoot' || animState === 'bicycle' || options.showAura) {
        this.rect(ctx, 16.5, headY + 7, 3, 1.5, '#7f1d1d', s);
        this.rect(ctx, 17, headY + 7, 2, 0.6, '#ffffff', s);
      } else {
        this.rect(ctx, 17, headY + 7, 2, 0.8, '#9a3412', s);
      }

      // Cara de bravo (cutscenes, ex: o Rin virando seu rival): pálpebra baixa, sobrancelhas
      // em "V" descendo para o meio e dentes trincados
      if (charData.angry) {
        this.rect(ctx, 12.9, headY + 3.9, 3.3, 0.9, '#0a0f1c', s);
        this.rect(ctx, 19.8, headY + 3.9, 3.3, 0.9, '#0a0f1c', s);
        // Canto de dentro do olho mais baixo: o olhar fica inclinado mesmo com a franja por cima
        this.rect(ctx, 15, headY + 4.6, 1.3, 0.8, '#0a0f1c', s);
        this.rect(ctx, 19.7, headY + 4.6, 1.3, 0.8, '#0a0f1c', s);
        [[12.6, 2.3], [13.8, 2.7], [15, 3.1]].forEach(([x, y]) => this.rect(ctx, x, headY + y, 1.4, 0.8, '#090d16', s));
        [[22, 2.3], [20.8, 2.7], [19.6, 3.1]].forEach(([x, y]) => this.rect(ctx, x, headY + y, 1.4, 0.8, '#090d16', s));
        this.rect(ctx, 15.8, headY + 6.9, 4.4, 1.2, '#0a0f1c', s);
        this.rect(ctx, 16.1, headY + 7.1, 3.8, 0.7, '#f8fafc', s);
        [17.1, 18, 18.9].forEach((x) => this.rect(ctx, x, headY + 7.1, 0.25, 0.7, '#64748b', s));
      }

      if (charData.glasses) {
        // Óculos retangulares de aro preto grosso (Ego), com o reflexo branco na lente
        const frameC = '#0b0b0f';
        [12.4, 19.4].forEach((gx) => {
          this.rect(ctx, gx + 0.6, headY + 4.2, 3, 2.3, 'rgba(203,213,225,0.18)', s);
          this.rect(ctx, gx, headY + 3.6, 4.2, 0.7, frameC, s);
          this.rect(ctx, gx, headY + 6.4, 4.2, 0.7, frameC, s);
          this.rect(ctx, gx, headY + 3.6, 0.7, 3.5, frameC, s);
          this.rect(ctx, gx + 3.5, headY + 3.6, 0.7, 3.5, frameC, s);
          this.rect(ctx, gx + 0.9, headY + 4.4, 0.5, 0.5, 'rgba(255,255,255,0.95)', s);
          this.rect(ctx, gx + 1.3, headY + 4.9, 0.5, 0.5, 'rgba(255,255,255,0.7)', s);
        });
        this.rect(ctx, 16.6, headY + 4.4, 2.8, 0.6, frameC, s);
        this.rect(ctx, 11.4, headY + 4, 1, 0.6, frameC, s);
        this.rect(ctx, 23.6, headY + 4, 1, 0.6, frameC, s);
      } else if (style === 'parted_glasses' || style === 'spiky_glasses' || acc.includes('face_guard')) {
        this.rect(ctx, 12, headY + 3.5, 12, 1, '#f59e0b', s);
        this.rect(ctx, 13, headY + 3.5, 4, 2.5, 'rgba(56,189,248,0.4)', s);
        this.rect(ctx, 19, headY + 3.5, 4, 2.5, 'rgba(56,189,248,0.4)', s);
      }
      if (acc.includes('crow_mask')) {
        this.rect(ctx, 13, headY + 5.5, 10, 3.5, '#090d16', s);
      }
    } else {
      this.rect(ctx, 12, headY, 12, 7, hair, s);
    }

    // 9. Cabelo com movimento de vento ao correr
    const hairWind = isRunning ? Math.sin(runCycle) * 0.8 : 0;
    this.drawHairStyle(ctx, style, hair, hair2, headY + hairWind * 0.3, s, facing);
    // Chapéu por cima do cabelo (ex: o gorro do disfarce do Bunny)
    if (charData.hat === 'beanie') this.drawHairShapes(ctx, 'hat_beanie', '#16181d', '#2b2f38', headY + hairWind * 0.3, s, facing === 'back');

    // Veia de raiva (💢) por cima do cabelo, no canto da testa
    if (charData.angry && facing !== 'back') {
      const vein = '#dc2626';
      [[21.4, -1.6, 0.6, 1.6], [23, -1.6, 0.6, 1.6], [20.8, -1, 1.6, 0.6], [22.8, -1, 1.6, 0.6], [21.4, 0.2, 0.6, 1.4], [23, 0.2, 0.6, 1.4]].forEach(([x, y, w, h]) =>
        this.rect(ctx, x, headY + y, w, h, vein, s)
      );
    }

    if (acc.includes('headband')) {
      this.rect(ctx, 11, headY + 1.5, 14, 1.5, '#f8fafc', s);
    }

    // Ponto eletrônico no ouvido (Fox)
    if (charData.earpiece && facing !== 'back') {
      this.rect(ctx, 10.9, headY + 4.8, 1.1, 1.5, '#111318', s);
      this.rect(ctx, 11.2, headY + 6.2, 0.4, 1.2, '#111318', s);
    }

    // Headset com microfone (Ego): fone na orelha e a haste descendo até a boca
    if (charData.headset && facing !== 'back') {
      this.rect(ctx, 10.6, headY + 4.4, 1.4, 2, '#111318', s);
      this.rect(ctx, 11.6, headY + 6.2, 0.6, 0.6, '#111318', s);
      this.rect(ctx, 12.1, headY + 6.7, 0.6, 0.6, '#111318', s);
      this.rect(ctx, 12.6, headY + 7.2, 1.4, 0.5, '#111318', s);
      this.rect(ctx, 13.8, headY + 6.9, 1.2, 1.1, '#1f2329', s);
    }

    ctx.restore();
  },

  // skin = cor da perna (pele no uniforme; calça/meia-calça no terno e no blazer)
  drawLeg(ctx, x, y, skin, sockColor, bootColor, studColor, s, outfit = 'kit') {
    if (outfit !== 'kit') {
      // Calça do terno / meia-calça + sapato (salto na Anri)
      this.rect(ctx, x + 0.2, y, 3.8, 6.2, skin, s);
      this.rect(ctx, x + 2.8, y, 1.2, 6.2, this.shade(skin, -0.3), s);
      this.rect(ctx, x - 0.1, y + 6, 4.6, 1.8, bootColor, s);
      this.rect(ctx, x + 0.4, y + 6.2, 1.6, 0.5, 'rgba(255,255,255,0.35)', s);
      if (outfit === 'office') this.rect(ctx, x + 3.4, y + 7.6, 1, 0.8, bootColor, s);
      return;
    }
    // Coxa/Canela com sombra no joelho
    this.rect(ctx, x, y, 4.2, 4, skin, s);
    this.rect(ctx, x + 3, y, 1.2, 4, this.shade(skin, -0.14), s);
    // Meião esportivo
    this.rect(ctx, x, y + 3.2, 4.2, 3, '#0f172a', s);
    this.rect(ctx, x, y + 3.2, 4.2, 1, sockColor, s);
    // Chuteira com brilho em cima e travas embaixo
    this.rect(ctx, x - 0.3, y + 6, 5, 2.2, bootColor, s);
    this.rect(ctx, x + 0.2, y + 6.2, 2, 0.5, this.shade(bootColor, 0.35), s);
    this.rect(ctx, x + 0.5, y + 7.5, 3.5, 0.8, studColor, s);
  },

  // sleeve = cor da manga comprida (terno/blazer); sem ela é a manga térmica preta do uniforme
  drawArm(ctx, x, y, skin, acc, s, isLeft, sleeve = null) {
    if (sleeve) {
      this.rect(ctx, x, y, 3, 6, sleeve, s);
      this.rect(ctx, x + 2, y, 1, 6, this.shade(sleeve, -0.3), s);
      this.rect(ctx, x, y + 5.6, 3, 0.6, '#e2e8f0', s);
      this.rect(ctx, x + 0.2, y + 6.2, 2.6, 1.4, skin, s);
      return;
    }
    // Manga térmica preta
    this.rect(ctx, x, y, 3, 3.5, '#090d16', s);
    // Antebraço
    this.rect(ctx, x, y + 3.5, 3, 3.5, skin, s);
    this.rect(ctx, x + 2.1, y + 3.5, 0.9, 3.5, this.shade(skin, -0.14), s);

    if (isLeft && acc.includes('captain_armband')) {
      this.rect(ctx, x, y + 1.5, 3, 1.8, '#ef4444', s);
    }
    if (acc.includes('wristband')) {
      this.rect(ctx, x, y + 5.2, 3, 1.2, '#090d16', s);
    }
    if (acc.includes('gk_gloves')) {
      this.rect(ctx, x - 0.5, y + 6.2, 4, 2.2, '#ffffff', s);
    } else if (acc.includes('player_gloves')) {
      this.rect(ctx, x, y + 6.2, 3, 2, '#0f172a', s);
    } else if (acc.includes('hand_wraps')) {
      this.rect(ctx, x, y + 5.5, 3, 2, '#e2e8f0', s);
    }
  },

  // Clareia (amt > 0) ou escurece (amt < 0) uma cor hex #rrggbb
  shade(hex, amt) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    if (Number.isNaN(n) || String(hex).length !== 7) return hex;
    const f = (v) => (amt < 0 ? Math.round(v * (1 + amt)) : Math.round(v + (255 - v) * amt));
    return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
  },

  // ==========================================================================
  // CABELOS DESENHADOS A PARTIR DAS IMAGENS DE REFERÊNCIA
  // Cada forma é um polígono em unidades da cabeça (o rosto ocupa x 12..24 e
  // y 0..9 a partir do topo da cabeça; olhos em y 4..6). O polígono vira pixel
  // art numa grade de meia unidade, com contorno escuro automático e sombra na
  // ponta de cada mecha. Cores: main (cor 1), sec (cor 2), light (brilho),
  // beard (barba, sem contorno) e scar (cicatriz, sem contorno).
  // ==========================================================================
  HAIR_SHAPES: {
    // Isagi (protagonista): capacete arredondado, antena no topo e franja em pontas
    isagi: [
      { c: 'main', pts: [[10.6, 1.5], [10.8, -1.8], [12.2, -3.8], [14.8, -4.9], [18, -5.2], [21.2, -4.9], [23.8, -3.8], [25.2, -1.8], [25.4, 1.5]] },
      { c: 'main', e: 'u', pts: [[16.8, -4.6], [17.2, -6.8], [19.8, -7.8], [18.4, -6.4], [18.8, -4.6]] },
      { c: 'main', e: 's', pts: [[10.6, -0.5], [12.6, -0.5], [12.8, 4.4], [11.4, 6.8], [10.6, 3.4]] },
      { c: 'main', e: 's', pts: [[25.4, -0.5], [23.4, -0.5], [23.2, 4.4], [24.6, 6.8], [25.4, 3.4]] },
      { c: 'main', pts: [[11, -1], [25, -1], [25, 0.8], [11, 0.8]] },
      { c: 'main', e: 's', pts: [[11.8, -0.6], [15.2, -0.6], [13, 3.2]] },
      { c: 'main', e: 's', pts: [[14.2, -0.6], [17.8, -0.6], [16.2, 3.6]] },
      { c: 'main', e: 's', pts: [[16.6, -0.6], [19.8, -0.6], [17.8, 4]] },
      { c: 'main', e: 's', pts: [[18.8, -0.6], [22.4, -0.6], [20.8, 3.4]] },
      { c: 'main', e: 's', pts: [[21.2, -0.6], [24.4, -0.6], [23.4, 2.8]] },
      { c: 'light', pts: [[13, -3.2], [15.6, -4.3], [18.6, -4.5], [18.2, -3.9], [15.6, -3.7], [13.4, -2.7]] },
      { c: 'light', pts: [[16.6, 0.4], [17.6, 0.4], [17.4, 2.6]] }
    ],
    // Niko (pelas imagens de referência): capacete preto enorme e arredondado, mais largo
    // que a cabeça, com o contorno picotado e a franja grossa descendo até o nariz,
    // cobrindo os dois olhos (o cabelo é desenhado depois do rosto, então tampa mesmo)
    bangs_over_eyes: [
      // (os vãos entre as pontas da franja ficam abaixo dos olhos, que vão até y 6.2)
      { c: 'main', pts: [[9.9, 6.2], [9.4, 3], [9.2, 0], [9.6, -2.8], [11, -4.8], [13.4, -6.2], [16.4, -6.9], [19.6, -6.9], [22.6, -6.2], [25, -4.8], [26.4, -2.8], [26.8, 0], [26.6, 3], [26.1, 6.2], [25, 5.8], [24.3, 6.9], [23.4, 6.3], [22.6, 7], [21.6, 6.3], [20.7, 6.9], [19.8, 6.3], [18.9, 6.5], [18, 6.1], [17.1, 6.5], [16.2, 6.3], [15.3, 6.9], [14.4, 6.3], [13.4, 7], [12.6, 6.3], [11.7, 6.9], [11, 5.8]] },
      // Pontas no contorno (médias: espetado, mas o volume continua redondo)
      { c: 'main', e: 'S', pts: [[10.6, -3.8], [9.2, -5.4], [11.6, -5]] },
      { c: 'main', e: 'S', pts: [[13, -5.9], [12.6, -7.6], [14.6, -6.6]] },
      { c: 'main', e: 'S', pts: [[16.6, -6.9], [17.6, -8.6], [18.6, -6.9]] },
      { c: 'main', e: 'S', pts: [[20.6, -6.8], [22.4, -8], [22.2, -6.3]] },
      { c: 'main', e: 'S', pts: [[24.2, -5.2], [26.2, -5.8], [25.4, -4.1]] },
      { c: 'main', e: 'S', pts: [[9.4, -1.8], [7.9, -1.6], [9.2, -0.4]] },
      { c: 'main', e: 'S', pts: [[26.6, -1.8], [28.1, -1.6], [26.8, -0.4]] },
      { c: 'main', e: 'S', pts: [[9.3, 1.6], [7.9, 2.6], [9.4, 3.4]] },
      { c: 'main', e: 'S', pts: [[26.7, 1.6], [28.1, 2.6], [26.6, 3.4]] },
      { c: 'main', e: 'S', pts: [[9.7, 4.4], [8.6, 5.8], [10.2, 5.8]] },
      { c: 'main', e: 'S', pts: [[26.3, 4.4], [27.4, 5.8], [25.8, 5.8]] },
      // Mechas da franja (traços mais escuros descendo) e o brilho no alto
      { c: 'shade', only: 'front', pts: [[15.6, -0.4], [16.1, -0.4], [15.3, 5.2], [14.9, 5]] },
      { c: 'shade', only: 'front', pts: [[18, -1.2], [18.4, -1.2], [18.3, 5], [17.9, 5]] },
      { c: 'shade', only: 'front', pts: [[20.2, -0.4], [20.7, -0.4], [21.1, 5.1], [20.7, 5.2]] },
      { c: 'shade', only: 'front', pts: [[12.9, 0.6], [13.4, 0.6], [12.6, 5], [12.2, 4.8]] },
      { c: 'shade', only: 'front', pts: [[22.9, 0.6], [23.4, 0.6], [23.8, 4.8], [23.4, 5]] },
      { c: 'light', pts: [[12.8, -4], [15.4, -5.4], [18.4, -5.8], [18, -5.2], [15.4, -4.8], [13.2, -3.4]] }
    ],
    // Sae: rosa-acinzentado, curto e arrumado, com pontas médias no alto e nas laterais,
    // laterais até o meio da bochecha e franja em mechas pontudas com a mecha do meio
    // chegando na linha dos olhos
    sae_spiky: [
      { c: 'main', pts: [[10.7, 2.6], [10.5, -1.3], [11.5, -3.6], [14, -5], [18, -5.4], [22, -5], [24.5, -3.6], [25.5, -1.3], [25.3, 2.6], [24, 2.6], [24, -0.6], [12, -0.6], [12, 2.6]] },
      { c: 'main', e: 'S', pts: [[12.5, -3.4], [11.3, -5.6], [14.6, -4.7]] },
      { c: 'main', e: 'S', pts: [[15.4, -5.1], [16.6, -7], [18.4, -5.3]] },
      { c: 'main', e: 'S', pts: [[19.4, -5.3], [21.8, -6.7], [22, -4.7]] },
      { c: 'main', e: 'S', pts: [[23.2, -4.1], [25.8, -4.6], [24.8, -2.7]] },
      { c: 'main', e: 'S', pts: [[10.7, -1.1], [9, 0.1], [10.7, 1.3]] },
      { c: 'main', e: 'S', pts: [[25.3, -1.1], [27, 0.1], [25.3, 1.3]] },
      { c: 'main', e: 's', pts: [[10.3, 0.3], [12.7, 0.3], [12.8, 3.6], [11.9, 5.4], [10.7, 3.9]] },
      { c: 'main', e: 's', pts: [[25.7, 0.3], [23.3, 0.3], [23.2, 3.6], [24.1, 5.4], [25.3, 3.9]] },
      { c: 'main', only: 'front', pts: [[11.7, -1.6], [24.3, -1.6], [24.3, 0.3], [11.7, 0.3]] },
      { c: 'main', only: 'front', e: 's', pts: [[11.8, -1.2], [15, -1.2], [13.1, 2.3], [12.2, 1.3]] },
      { c: 'main', only: 'front', e: 's', pts: [[13.8, -1.2], [17.2, -1.2], [15.4, 2.8]] },
      { c: 'main', only: 'front', e: 's', pts: [[18.8, -1.2], [22.2, -1.2], [20.6, 2.5]] },
      { c: 'main', only: 'front', e: 's', pts: [[21, -1.2], [24.2, -1.2], [23.6, 1.5], [22.8, 2.3]] },
      { c: 'main', only: 'front', e: 's', pts: [[16.2, -1.2], [19.6, -1.2], [18.4, 2.1], [17.8, 4.4], [17.1, 2.1]] },
      { c: 'light', pts: [[13.3, -3.4], [15.8, -4.5], [18.2, -4.7], [17.8, -4.1], [15.6, -3.9], [13.7, -2.9]] },
      { c: 'light', pts: [[16.4, -5.2], [16.8, -6.4], [17.2, -5.2]] }
    ],
    // Hiori (pela descrição do dono): azul pastel com leve tom de ciano, curto a médio,
    // LISO, camadas suaves e volume discreto no topo (sem topete, sem fio espetado).
    // Franja longa e ASSIMÉTRICA, risca um pouco à esquerda do meio: o lado maior varre para
    // a direita da tela em fios finos com pontas definidas chegando perto dos olhos; o lado
    // menor é mais curto. Laterais acompanhando o rosto, cobrindo parte das orelhas, com
    // pontinhas desfiadas. A MECHA fina sai do canto de cima à esquerda da tela e cai por
    // fora até a bochecha. Sombra suave (poucos fios, brilho leve)
    hiori_soft: [
      { c: 'main', pts: [[10.1, 1.6], [9.75, 0], [9.7, -2], [10.6, -4.4], [12.6, -6], [15.4, -6.7], [18, -6.9], [20.6, -6.7], [23.4, -6], [25.4, -4.4], [26.3, -2], [26.25, 0], [25.9, 1.6], [24, 1.6], [24, -0.6], [12, -0.6], [12, 1.6]] },
      // laterais: o contorno de fora desce cheio e vai curvando para dentro (redondinho)
      // até a ponta na bochecha
      { c: 'main', e: 's', pts: [[9.75, 0], [12.9, 0], [12.9, 6.6], [12.8, 7.3], [12.55, 7.6], [12.2, 7.1], [11.8, 6], [11.3, 4.8], [10.7, 3.5], [10.15, 2.2], [9.85, 1]] },
      { c: 'main', e: 's', pts: [[26.25, 0], [23.1, 0], [23.1, 6.6], [23.2, 7.3], [23.45, 7.6], [23.8, 7.1], [24.2, 6], [24.7, 4.8], [25.3, 3.5], [25.85, 2.2], [26.15, 1]] },
      // franja: o lado menor (à esquerda da risca), mais curto
      { c: 'main', only: 'front', e: 's', pts: [[11.8, -2.2], [16.2, -2.2], [16, 0], [15.6, 1.8], [15, 2.8], [14.6, 2], [14, 3.2], [13.4, 2.2], [12.8, 2.8], [12.2, 1.8], [11.9, 0.6]] },
      // franja: o lado maior varrendo para a direita da tela, fios finos com pontas definidas
      { c: 'main', only: 'front', e: 's', pts: [[15.8, -2.2], [24.2, -2.2], [24.2, 0.6], [23.8, 2.2], [23.4, 3.4], [22.8, 2.4], [22.2, 3.8], [21.6, 2.8], [20.8, 4], [20.2, 2.8], [19.4, 3.6], [18.8, 2.4], [18.2, 4.2], [17.6, 2.6], [16.8, 3.2], [16.4, 1.6], [16, 0.4]] },
      // a mecha: sai do canto de cima à esquerda da tela e cai por fora até a bochecha
      { c: 'main', only: 'front', e: 's', pts: [[10.4, -4.6], [11.4, -4], [9.8, -2.4], [8.6, 0], [7.8, 2.6], [7.8, 4.8], [7.5, 5.9], [7, 4.8], [6.9, 2.4], [7.5, -0.4], [9, -3]] },
      { c: 'main', only: 'back', e: 's', pts: [[25.6, -4.6], [24.6, -4], [26.2, -2.4], [27.4, 0], [28.2, 2.6], [28.2, 4.8], [28.5, 5.9], [29, 4.8], [29.1, 2.4], [28.5, -0.4], [27, -3]] },
      // sombra suave: a risca e poucos fios
      { c: 'shade', only: 'front', pts: [[15.8, -5.4], [16.3, -5.4], [16.2, -2], [15.7, -2]] },
      { c: 'shade', only: 'front', pts: [[19.6, -1.4], [20, -1.4], [19.4, 2.6], [19, 2.6]] },
      { c: 'shade', only: 'front', pts: [[22.4, -1.2], [22.8, -1.2], [22.6, 2.4], [22.2, 2.4]] },
      { c: 'shade', only: 'front', pts: [[13.8, -1.2], [14.2, -1.2], [13.8, 2], [13.4, 2]] },
      // brilho leve
      { c: 'light', pts: [[12.4, -4.4], [15.2, -5.7], [18, -6], [20.8, -5.7], [23.6, -4.4], [23.2, -3.9], [20.6, -5.1], [18, -5.4], [15.4, -5.1], [12.8, -3.9]] },
      { c: 'light', only: 'front', pts: [[20.8, -1.2], [21.2, -1.2], [21, 1.6], [20.6, 1.6]] }
    ],
    // Teddy Knight (pelas imagens de referência): branco-prateado com sombra azulada,
    // volumoso e bagunçado, mechas espetadas jogadas pro lado (direita da tela) e pra cima;
    // franja comprida caindo nos olhos, com uma mecha descendo entre eles até o nariz
    knight_wild: [
      { c: 'main', pts: [[10.2, 3], [9.6, 0], [9.8, -3], [11.2, -5.4], [13.4, -6.8], [16.2, -7.6], [19.4, -7.8], [22.4, -7.2], [24.8, -5.8], [26.4, -3.6], [26.9, -0.6], [26.3, 3], [24, 3], [24, -0.6], [12, -0.6], [12, 3]] },
      // tufos varridos pro lado (ponta inclinada pra direita, como cabelo no vento)
      { c: 'main', e: 'S', pts: [[12.8, -6.4], [16.6, -9], [15.8, -7.4]] },
      { c: 'main', e: 'S', pts: [[16, -7.6], [20.6, -9.8], [19.2, -7.8]] },
      { c: 'main', e: 'S', pts: [[19.4, -7.8], [24.6, -9], [22.4, -7.2]] },
      { c: 'main', e: 'S', pts: [[22.6, -7.1], [27.8, -7.4], [25, -5.6]] },
      { c: 'main', e: 'S', pts: [[25, -5.4], [29.4, -4.6], [26.5, -3.2]] },
      { c: 'main', e: 'S', pts: [[26.6, -2.6], [29.6, -0.8], [26.9, 0]] },
      { c: 'main', e: 'S', pts: [[10.4, -4.4], [8.4, -3.6], [9.8, -2]] },
      // laterais até a orelha, pontas abrindo pra fora (mais do lado direito)
      { c: 'main', e: 's', pts: [[9.6, 0], [12.9, 0], [12.9, 2.6], [12.5, 4.4], [11.9, 3.6], [11.2, 4.8], [10.6, 3.4], [9.8, 3.8], [9.9, 2.2], [9.4, 1.4]] },
      { c: 'main', e: 's', pts: [[26.6, 0], [23.1, 0], [23.1, 2.6], [23.5, 4.4], [24.2, 3.6], [25, 4.8], [25.6, 3.4], [27.2, 3.6], [26.4, 2.2], [27.4, 1]] },
      // franja comprida caindo inclinada nos olhos (pontas puxadas pra esquerda) e uma
      // mecha descendo entre os olhos
      { c: 'main', only: 'front', e: 's', pts: [[11.6, -2], [24.4, -2], [24.4, 1], [23.9, 2.4], [22.9, 3.2], [23, 1.8], [22.2, 2.4], [21.1, 4], [21.2, 2.4], [20.4, 2.8], [19.2, 4.6], [19.4, 2.8], [18.8, 3.2], [17.6, 6.4], [17.8, 3.2], [17, 3.4], [15.4, 4.8], [15.8, 3], [15, 3], [13.6, 4.4], [13.9, 2.6], [13, 2.6], [12, 3.6], [12.2, 2], [11.6, 1.2]] },
      { c: 'shade', only: 'front', pts: [[20.4, -1], [20.9, -1], [20, 2.4], [19.6, 2.4]] },
      { c: 'shade', only: 'front', pts: [[16.4, -1], [16.9, -1], [16.2, 2.8], [15.8, 2.8]] },
      // sombra azulada (cor 2) em fios finos, seguindo o vento
      { c: 'sec', pts: [[13.4, -4.6], [16.8, -6.4], [17.2, -6], [13.8, -4.1]] },
      { c: 'sec', pts: [[18.6, -5.6], [22.4, -6.6], [22.6, -6.1], [18.9, -5.1]] },
      { c: 'sec', pts: [[24, -3.8], [26.2, -4.6], [26.3, -4.1], [24.2, -3.3]] },
      // brilho no alto
      { c: 'light', pts: [[12.4, -3.8], [14.8, -5.6], [17.6, -6.4], [17.4, -5.8], [15, -5], [12.9, -3.3]] }
    ],
    // Kurona (pelas imagens de referência): rosa, bagunçado, comprimento médio; a franja
    // cai sobre os olhos em mechas compridas (a do meio até o nariz), laterais até o queixo
    // e a TRANÇA do lado esquerdo dele (direita da tela) caindo na frente do ombro
    kurona_braid: [
      { c: 'main', pts: [[10.3, 3], [10, -1], [10.8, -3.6], [12.6, -5.2], [15.2, -6], [18.2, -6.3], [21.2, -6], [23.6, -5], [25.4, -3.4], [26, -0.8], [25.7, 3], [24, 3], [24, -0.6], [12, -0.6], [12, 3]] },
      // pontas bagunçadas no contorno
      { c: 'main', e: 'S', pts: [[11.6, -4.2], [10.4, -5.6], [12.8, -5]] },
      { c: 'main', e: 'S', pts: [[14.6, -5.7], [14.8, -7.3], [16.4, -6]] },
      { c: 'main', e: 'S', pts: [[18.4, -6.2], [19.6, -7.6], [20.4, -6]] },
      { c: 'main', e: 'S', pts: [[22.4, -5.4], [24.2, -6.2], [24, -4.6]] },
      { c: 'main', e: 'S', pts: [[10.1, -1.6], [8.6, -1], [10, 0.2]] },
      { c: 'main', e: 'S', pts: [[25.9, -1.6], [27.4, -1], [26, 0.2]] },
      // laterais: a da esquerda da tela é curta (até a orelha), a do lado da trança desce
      // até o queixo; pontas soltas
      { c: 'main', e: 's', pts: [[10, 0], [12.9, 0], [13, 2.8], [12.7, 4.4], [12.1, 5.4], [11.6, 4.6], [10.9, 5.2], [10.5, 4], [9.8, 4.2], [10.1, 2.8], [9.6, 1.8]] },
      { c: 'main', noSide: true, e: 's', pts: [[26, 0], [23.1, 0], [23, 3.6], [23.2, 6.2], [23.8, 7.8], [24.4, 6.6], [25.1, 7.4], [25.4, 5.6], [26.2, 5.8], [25.9, 3.6], [26.4, 2.2]] },
      // franja bagunçada caindo nos olhos
      { c: 'main', only: 'front', e: 's', pts: [[11.8, -2], [24.2, -2], [24.2, 1], [23.4, 3.4], [22.6, 2.2], [21.8, 4.2], [21, 2.6], [20, 4.6], [19.2, 3], [18.4, 5.8], [17.6, 3.2], [16.6, 4.8], [15.8, 2.8], [14.8, 4.4], [14, 2.6], [13.2, 3.8], [12.4, 2.4], [11.9, 1.2]] },
      { c: 'shade', only: 'front', pts: [[17.8, -1.2], [18.3, -1.2], [18.5, 4.6], [18.1, 4.6]] },
      { c: 'shade', only: 'front', pts: [[15.2, -1], [15.7, -1], [15, 3.4], [14.6, 3.2]] },
      { c: 'shade', only: 'front', pts: [[21, -1], [21.5, -1], [21.4, 3.2], [21, 3.4]] },
      // a trança: sai de trás da orelha e desce só até o ombro (dois gomos, o elástico e a
      // pontinha)
      { c: 'main', only: 'front', noSide: true, e: 's', pts: [[23.6, 4.6], [25.2, 4.4], [25.7, 6.4], [24.2, 6.8]] },
      ...[0, 1].map((i) => {
        const cy = 7.4 + i * 1.45;
        const cx = 24.9 + (i % 2 ? 0.25 : -0.25);
        return { c: 'main', only: 'front', noSide: true, e: 's', pts: [[cx - 0.95, cy - 0.6], [cx, cy - 0.95], [cx + 0.95, cy - 0.5], [cx + 0.8, cy + 0.6], [cx, cy + 0.9], [cx - 0.85, cy + 0.5]] };
      }),
      { c: 'line', only: 'front', noSide: true, pts: [[24.4, 9.75], [25.8, 9.75], [25.8, 10.3], [24.4, 10.3]] },
      { c: 'main', only: 'front', noSide: true, e: 's', pts: [[24.5, 10.3], [25.7, 10.3], [25.7, 11.1], [25.1, 11.8], [24.6, 11.1]] },
      // de lado (cabeça virada) a lateral e a trança esticavam na borda e viravam um bloco;
      // lá elas viram uma mecha mais fina caindo até o ombro:
      // - olhando pra DIREITA (trança do lado de longe): atrás da cabeça, um pouco escondida
      { c: 'main', only: 'side', look: 'right', e: 's', pts: [[26.6, 0], [24.2, 0], [24, 3], [24.2, 5.2], [25.1, 6.6], [26, 5.2], [26.5, 3], [26.9, 1.6]] },
      { c: 'main', only: 'side', look: 'right', e: 's', pts: [[24.41, 5], [26.09, 4.8], [26.15, 6.6], [24.47, 6.8]] },
      { c: 'main', only: 'side', look: 'right', e: 's', pts: [[24.01, 6.9], [25.1, 6.65], [26.19, 6.95], [26.04, 7.9], [25.1, 8.1], [24.09, 7.85]] },
      { c: 'main', only: 'side', look: 'right', e: 's', pts: [[24.31, 8.2], [25.4, 7.95], [26.49, 8.25], [26.34, 9.2], [25.4, 9.4], [24.39, 9.15]] },
      { c: 'line', only: 'side', look: 'right', pts: [[24.38, 9.45], [26.12, 9.45], [26.12, 9.95], [24.38, 9.95]] },
      { c: 'main', only: 'side', look: 'right', e: 's', pts: [[24.53, 9.95], [25.98, 9.95], [25.98, 10.7], [25.25, 11.3], [24.6, 10.7]] },
      // - olhando pra ESQUERDA (trança do lado de perto): jogada pra frente, na frente da
      //   orelha e por cima da bochecha (desenhada já na cabeça virada, coordenadas da tela)
      { c: 'main', only: 'over', look: 'left', e: 's', pts: [[21.8, 1], [23.9, 1], [24.1, 3.5], [23.8, 5.6], [23, 7], [22.1, 5.6], [21.7, 3.5]] },
      { c: 'main', only: 'over', look: 'left', e: 's', pts: [[22, 5.4], [23.8, 5.2], [23.85, 6.9], [22.05, 7.1]] },
      ...[0, 1].map((i) => {
        const cy = 7.6 + i * 1.3;
        const cx = 22.9 + i * 0.2;
        return { c: 'main', only: 'over', look: 'left', e: 's', pts: [[cx - 0.95, cy - 0.5], [cx, cy - 0.8], [cx + 0.95, cy - 0.45], [cx + 0.85, cy + 0.5], [cx, cy + 0.75], [cx - 0.9, cy + 0.45]] };
      }),
      { c: 'line', only: 'over', look: 'left', pts: [[22.3, 9.65], [24, 9.65], [24, 10.15], [22.3, 10.15]] },
      { c: 'main', only: 'over', look: 'left', e: 's', pts: [[22.4, 10.15], [23.9, 10.15], [23.9, 10.9], [23.15, 11.6], [22.45, 10.9]] },
      { c: 'light', pts: [[13.2, -3.8], [15.6, -5], [18.4, -5.3], [18, -4.7], [15.6, -4.4], [13.6, -3.3]] }
    ],
    // Yukimiya (pelas imagens de referência): castanho, volume jogado para o lado com
    // pontas soltas no alto, repartido de lado com a mecha grande da franja caindo para a
    // direita da tela, laterais curtas (os óculos esportivos vêm do sportGlasses)
    yukimiya_swept: [
      { c: 'main', pts: [[10.3, 2.6], [10.1, -1.2], [11, -3.8], [13, -5.6], [15.8, -6.4], [18.8, -6.6], [21.8, -6.1], [24, -4.9], [25.6, -3], [26, -0.8], [25.7, 2.6], [24, 2.6], [24, -0.6], [12, -0.6], [12, 2.6]] },
      // volume jogado para o lado: pontas para a esquerda da tela no alto
      { c: 'main', e: 'S', pts: [[12.4, -4.8], [10.2, -6], [13.6, -5.8]] },
      { c: 'main', e: 'S', pts: [[15, -6.2], [13.8, -7.8], [16.8, -6.6]] },
      { c: 'main', e: 'S', pts: [[18.6, -6.6], [18.2, -8.2], [20.6, -6.6]] },
      { c: 'main', e: 'S', pts: [[22.2, -6], [23.2, -7.4], [24.2, -5.2]] },
      { c: 'main', e: 'S', pts: [[25.4, -2.4], [27.2, -2.2], [25.9, -0.8]] },
      { c: 'main', e: 'S', pts: [[10.4, -2], [8.8, -1.2], [10.2, -0.2]] },
      // laterais curtas (até a orelha)
      { c: 'main', e: 's', pts: [[10.1, 0], [12.9, 0], [13, 2.8], [12.6, 4.8], [12, 5.8], [11.4, 4.8], [10.6, 5.2], [10.4, 3.6], [9.8, 2.6]] },
      { c: 'main', e: 's', pts: [[25.9, 0], [23.1, 0], [23, 2.8], [23.4, 4.8], [24, 5.8], [24.6, 4.8], [25.4, 5.2], [25.6, 3.6], [26.2, 2.6]] },
      // franja repartida de lado: as mechas crescem para a direita da tela
      { c: 'main', only: 'front', e: 's', pts: [[11.8, -2], [24.2, -2], [24.2, 0.8], [23.8, 3.2], [22.8, 2.2], [21.8, 3.6], [20.6, 2], [19.4, 3.2], [18.4, 1.6], [17, 2.4], [15.8, 1], [14.4, 1.6], [13.2, 0.6], [12, 1.2]] },
      // a risca e os traços das mechas
      { c: 'shade', only: 'front', pts: [[14.6, -5], [15.1, -5], [15.4, -1.6], [14.9, -1.6]] },
      { c: 'shade', only: 'front', pts: [[19.6, -1.4], [20.1, -1.4], [21.6, 2.2], [21.1, 2.4]] },
      { c: 'shade', pts: [[18.6, -5.6], [19.1, -5.6], [20.4, -2.6], [19.9, -2.4]] },
      { c: 'light', pts: [[15.6, -4.8], [18.2, -5.6], [21, -5.4], [20.6, -4.8], [18.2, -5], [15.9, -4.2]] }
    ],
    // Ness (pelas imagens de referência): ondulado e fofo, em DUAS CORES — claro e
    // acinzentado em cima (cor 2) descendo em ondas até o meio do cabelo, magenta embaixo
    // (cor 1: franja, laterais e o contorno sombreado combinam com ela); franja ondulada
    // caindo até os olhos e laterais até a bochecha
    ness_wave: [
      { c: 'main', pts: [[10.2, 2.6], [9.9, -1], [10.5, -3.6], [12.2, -5.4], [14.8, -6.4], [18, -6.7], [21.2, -6.4], [23.8, -5.4], [25.5, -3.6], [26.1, -1], [25.8, 2.6], [24, 2.6], [24, -0.6], [12, -0.6], [12, 2.6]] },
      // ondas no alto (pontas macias)
      { c: 'main', e: 'S', pts: [[11.8, -4.8], [11.2, -6.2], [13.2, -5.8]] },
      { c: 'main', e: 'S', pts: [[15, -6.3], [15.6, -7.6], [17, -6.6]] },
      { c: 'main', e: 'S', pts: [[19.4, -6.6], [20.8, -7.4], [21.6, -6.2]] },
      { c: 'main', e: 'S', pts: [[24, -5], [25.6, -5.4], [25.2, -4]] },
      { c: 'main', e: 'S', pts: [[10, -1.8], [8.6, -1], [10, 0]] },
      { c: 'main', e: 'S', pts: [[26, -1.8], [27.4, -1], [26, 0]] },
      // laterais onduladas até a bochecha
      { c: 'main', e: 's', pts: [[9.9, 0], [12.9, 0], [13, 3], [12.7, 5], [12.1, 6.4], [11.5, 5.4], [10.8, 6.2], [10.5, 4.6], [9.7, 4.8], [10, 3], [9.5, 1.8]] },
      { c: 'main', e: 's', pts: [[26.1, 0], [23.1, 0], [23, 3], [23.3, 5], [23.9, 6.4], [24.5, 5.4], [25.2, 6.2], [25.5, 4.6], [26.3, 4.8], [26, 3], [26.5, 1.8]] },
      // a parte de cima clara, descendo em ondas até o meio do cabelo
      { c: 'sec', pts: [[10.8, -2.2], [11.2, -4], [12.6, -5.4], [15, -6.3], [18, -6.6], [21, -6.3], [23.4, -5.4], [24.8, -4], [25.2, -2.2], [24.2, -2.8], [23.2, -1.9], [22, -2.7], [20.8, -1.8], [19.6, -2.6], [18.4, -1.7], [17.2, -2.6], [16, -1.8], [14.8, -2.7], [13.6, -1.9], [12.4, -2.8], [11.6, -2]] },
      { c: 'sec', pts: [[15.4, -6.2], [15.8, -7.3], [16.8, -6.5]] },
      { c: 'sec', pts: [[19.6, -6.5], [20.6, -7.2], [21.3, -6.2]] },
      // franja ondulada caindo até os olhos
      { c: 'main', only: 'front', e: 's', pts: [[11.8, -1.8], [24.2, -1.8], [24.2, 1], [23.6, 2.8], [22.8, 2], [22.2, 3.6], [21.2, 2.6], [20.4, 4], [19.4, 2.8], [18.6, 4.4], [17.6, 3], [16.8, 4.2], [15.8, 2.8], [15, 3.8], [14, 2.4], [13.2, 3.4], [12.4, 2.2], [11.9, 1]] },
      { c: 'shade', only: 'front', pts: [[16.6, -1.2], [17.1, -1.2], [16.5, 3], [16.1, 2.8]] },
      { c: 'shade', only: 'front', pts: [[20.4, -1.2], [20.9, -1.2], [21.1, 3], [20.7, 3]] },
      { c: 'light', only: 'front', pts: [[13.4, -0.6], [15.2, -1.2], [15, -0.6], [13.6, 0]] },
      // costas: a nuca inteira é cabelo (cobre o recorte do rosto da vista de frente)
      { c: 'main', only: 'back', pts: [[10.4, -1.2], [25.6, -1.2], [25.8, 3], [25.4, 6.4], [10.6, 6.4], [10.2, 3]] }
    ],
    // Hugo (refeito pelas imagens de referência, 3ª versão): carmim, CURTO e BAGUNÇADO.
    // Rente à cabeça, com pontinhas soltas espalhadas pelo contorno (pequenas, com borda
    // suave — pontas grandes viravam "orelhas"), franja picotada em mechas de tamanhos
    // diferentes (a mais comprida entre os olhos), laterais terminando na altura da orelha
    // com as pontas para fora e nuca curta (HAIR_CUSTOM_BACK)
    hugo_wavy: [
      { c: 'main', pts: [[10.4, 2.2], [10.2, -1], [10.8, -3.4], [12.4, -4.8], [14.6, -5.6], [17.4, -5.9], [20.4, -5.7], [22.8, -5], [24.8, -3.6], [25.8, -1.2], [25.6, 2.2], [24, 2.2], [24, -0.4], [12, -0.4], [12, 2.2]] },
      // Pontinhas bagunçadas no contorno
      { c: 'main', e: 'S', pts: [[11.4, -3.8], [10.4, -5], [12.6, -4.6]] },
      { c: 'main', e: 'S', pts: [[14, -5.2], [13.8, -6.6], [15.6, -5.6]] },
      { c: 'main', e: 'S', pts: [[17.2, -5.8], [18, -7], [18.8, -5.8]] },
      { c: 'main', e: 'S', pts: [[20.6, -5.6], [22, -6.6], [22.4, -5.2]] },
      { c: 'main', e: 'S', pts: [[23.8, -4.2], [25.4, -5], [25, -3.4]] },
      { c: 'main', e: 'S', pts: [[10.4, -1.8], [9, -1.6], [10.2, -0.4]] },
      { c: 'main', e: 'S', pts: [[25.6, -1.8], [27, -1.6], [25.8, -0.4]] },
      // Laterais curtas (até a orelha) com as pontas para fora
      { c: 'main', e: 's', pts: [[10.2, 0], [12.9, 0], [13, 2.6], [12.6, 4.6], [12, 5.6], [11.6, 4.6], [10.8, 5.4], [10.6, 4.2], [9.6, 4.6], [10, 3], [9.4, 2]] },
      { c: 'main', e: 's', pts: [[25.8, 0], [23.1, 0], [23, 2.6], [23.4, 4.6], [24, 5.6], [24.4, 4.6], [25.2, 5.4], [25.4, 4.2], [26.4, 4.6], [26, 3], [26.6, 2]] },
      // Franja picotada, mechas de tamanhos diferentes
      { c: 'main', only: 'front', e: 's', pts: [[11.8, -1.8], [24.2, -1.8], [24.2, 0.8], [23.6, 2.6], [22.8, 1.6], [22, 3.2], [21.2, 1.8], [20.2, 3], [19.4, 2], [18.6, 4.2], [17.8, 2.2], [16.8, 3.4], [15.8, 2], [14.8, 3.4], [13.8, 2], [12.8, 3.2], [12, 1.6]] },
      { c: 'shade', only: 'front', pts: [[21.4, -1.2], [21.9, -1.2], [20.6, 1.8], [20.2, 1.6]] },
      { c: 'shade', only: 'front', pts: [[16.4, -1.2], [16.9, -1.2], [15.8, 2], [15.4, 1.8]] },
      { c: 'shade', pts: [[15.6, -5.2], [16.1, -5.2], [15.2, -2.2], [14.8, -2.4]] },
      { c: 'shade', pts: [[20.4, -5.2], [20.9, -5.2], [21.4, -2.2], [20.9, -2.2]] },
      { c: 'light', pts: [[13.2, -3.8], [15.4, -4.8], [18, -5.1], [17.6, -4.6], [15.4, -4.3], [13.6, -3.3]] },
      // Costas: nuca curta com pontinhas
      { c: 'main', only: 'back', pts: [[10.4, -1], [25.6, -1], [25.8, 3.4], [24.6, 5], [23.4, 4], [22, 5.2], [20.6, 4], [19, 5.2], [17.6, 4], [16.2, 5.2], [14.8, 4], [13.4, 5.2], [12, 4], [10.2, 3.4]] },
      { c: 'shade', only: 'back', pts: [[14.6, 0.4], [15.1, 0.4], [15, 3.6], [14.6, 3.6]] },
      { c: 'shade', only: 'back', pts: [[18, -0.2], [18.5, -0.2], [18.4, 4], [18, 4]] },
      { c: 'shade', only: 'back', pts: [[21.2, 0.4], [21.7, 0.4], [21.6, 3.6], [21.2, 3.6]] }
    ],
    // Fox (treinador, pelas imagens de referência): grisalho penteado para trás em pontas,
    // com faixas escuras nas laterais (as "marcas" da raposa), testa alta, rugas,
    // cavanhaque fino no queixo
    // 2ª versão: a 1ª (seis espetos em pé) parecia uma coroa. Agora o cabelo é penteado
    // para trás, liso e baixo em cima, e as pontas abrem para TRÁS e para os LADOS
    // (como uma juba varrida pelo vento), com as faixas escuras correndo nas pontas
    fox_slick: [
      // Pontas varridas para trás, abrindo para os lados (desenhadas antes do topo liso)
      { c: 'main', e: 'u', pts: [[14.6, -4], [10.6, -9.2], [12.6, -3.4]] },
      { c: 'main', e: 'u', pts: [[12.8, -3.2], [7.4, -6.8], [11.6, -1.8]] },
      { c: 'main', e: 'u', pts: [[11.8, -1.6], [6.8, -3.2], [11.2, 0.4]] },
      { c: 'main', e: 'u', pts: [[11.4, 0.2], [8, -0.2], [11.4, 2]] },
      { c: 'main', e: 'u', pts: [[21.4, -4], [25.4, -9.2], [23.4, -3.4]] },
      { c: 'main', e: 'u', pts: [[23.2, -3.2], [28.6, -6.8], [24.4, -1.8]] },
      { c: 'main', e: 'u', pts: [[24.2, -1.6], [29.2, -3.2], [24.8, 0.4]] },
      { c: 'main', e: 'u', pts: [[24.6, 0.2], [28, -0.2], [24.6, 2]] },
      { c: 'main', e: 'u', pts: [[16.4, -4.6], [15.2, -7.2], [18, -4.7]] },
      { c: 'main', e: 'u', pts: [[18, -4.7], [20.8, -7.2], [19.6, -4.6]] },
      // Topo liso, penteado para trás, com a testa alta aparecendo
      { c: 'main', pts: [[11.4, 1], [11.2, -1.4], [12.2, -3.4], [14.6, -4.4], [18, -4.8], [21.4, -4.4], [23.8, -3.4], [24.8, -1.4], [24.6, 1], [23.8, 1], [23.6, -0.6], [12.4, -0.6], [12.2, 1]] },
      // Costeletas
      { c: 'main', only: 'front', pts: [[11.4, 1], [12.3, 1], [12.3, 4.6], [11.8, 5.4], [11.4, 4.2]] },
      { c: 'main', only: 'front', pts: [[24.6, 1], [23.7, 1], [23.7, 4.6], [24.2, 5.4], [24.6, 4.2]] },
      // Linhas do pente indo para trás
      { c: 'shade', pts: [[14.4, -3.6], [14.9, -3.8], [13.4, -1.2], [12.9, -1.2]] },
      { c: 'shade', pts: [[17.6, -4.4], [18.1, -4.4], [17.9, -1.6], [17.4, -1.6]] },
      { c: 'shade', pts: [[21.1, -3.8], [21.6, -3.6], [23.1, -1.2], [22.6, -1.2]] },
      // Faixas escuras nas pontas das laterais (as "marcas" da raposa)
      { c: 'sec', pts: [[12.6, -2.8], [8.4, -6.2], [9.2, -6.2], [12.6, -3.6]] },
      { c: 'sec', pts: [[11.6, -0.6], [7.6, -2.8], [8.6, -2.8], [11.6, -1.2]] },
      { c: 'sec', pts: [[23.4, -2.8], [27.6, -6.2], [26.8, -6.2], [23.4, -3.6]] },
      { c: 'sec', pts: [[24.4, -0.6], [28.4, -2.8], [27.4, -2.8], [24.4, -1.2]] },
      { c: 'light', pts: [[13.6, -3.4], [16, -4.2], [18, -4.4], [17.6, -3.8], [15.8, -3.6], [14, -2.9]] },
      { c: 'light', pts: [[13.4, -4.6], [11.2, -7.6], [11.8, -7.6], [13.9, -4.6]] },
      { c: 'light', pts: [[22.6, -4.6], [24.8, -7.6], [24.2, -7.6], [22.1, -4.6]] },
      // Rugas na testa
      { c: 'scar', only: 'front', pts: [[15, 0.9], [21, 0.9], [21, 1.25], [15, 1.25]] },
      { c: 'scar', only: 'front', pts: [[15.8, 2], [20.2, 2], [20.2, 2.35], [15.8, 2.35]] },
      // Vincos do sorriso e o cavanhaque
      { c: 'scar', only: 'front', pts: [[15, 7], [15.35, 7], [15.6, 8.3], [15.25, 8.3]] },
      { c: 'scar', only: 'front', pts: [[21, 7], [20.65, 7], [20.4, 8.3], [20.75, 8.3]] },
      { c: 'beard', pts: [[17, 8.6], [19, 8.6], [18.6, 10.2], [18, 10.6], [17.4, 10.2]] },
      // Costas: nuca curta (o cabelo vai todo para trás e para cima) com as faixas escuras
      { c: 'main', only: 'back', pts: [[11.2, -1], [24.8, -1], [25, 3], [23.6, 4.2], [22, 3.2], [20.4, 4.4], [18.8, 3.2], [17.2, 4.4], [15.6, 3.2], [14, 4.4], [12.4, 3.2], [11, 3]] },
      { c: 'sec', only: 'back', pts: [[11.2, -0.6], [12.4, -0.6], [12.6, 3.2], [11.1, 2.8]] },
      { c: 'sec', only: 'back', pts: [[24.8, -0.6], [23.6, -0.6], [23.4, 3.2], [24.9, 2.8]] }
    ],
    // Loki criança (flashback da promessa): o mesmo topo reto (fica para saves que usam este id)
    loki_kid: [
      { c: 'main', pts: [[11.6, 0.6], [11.6, -2.6], [12.6, -3.8], [23.4, -3.8], [24.4, -2.6], [24.4, 0.6], [23.4, 0.4], [22.8, -0.2], [13.2, -0.2], [12.6, 0.4]] },
      { c: 'main', pts: [[11.4, 0], [12.6, 0], [12.4, 2.4], [11.6, 2.2]] },
      { c: 'main', pts: [[24.6, 0], [23.4, 0], [23.6, 2.4], [24.4, 2.2]] },
      { c: 'light', pts: [[13, -3.4], [23, -3.4], [23, -2.9], [13, -2.9]] }
    ],
    // Loki: topo reto (flat top) com contorno marcado, sem barba
    loki_flattop: [
      { c: 'main', pts: [[11.6, 0.6], [11.6, -2.6], [12.6, -3.8], [23.4, -3.8], [24.4, -2.6], [24.4, 0.6], [23.4, 0.4], [22.8, -0.2], [13.2, -0.2], [12.6, 0.4]] },
      { c: 'main', pts: [[11.4, 0], [12.6, 0], [12.4, 2.4], [11.6, 2.2]] },
      { c: 'main', pts: [[24.6, 0], [23.4, 0], [23.6, 2.4], [24.4, 2.2]] },
      { c: 'light', pts: [[13, -3.4], [23, -3.4], [23, -2.9], [13, -2.9]] }
    ],
    // Barou: preto, penteado para trás em labaredas altas, entradas (bico de viúva) e cicatriz
    barou_flame: [
      { c: 'main', pts: [[11, 2.4], [10.8, -2], [12.6, -3.6], [23.4, -3.6], [25.2, -2], [25, 2.4], [24.2, 2.4], [23, -0.2], [19.4, -0.2], [18, 1.2], [16.6, -0.2], [13, -0.2], [11.8, 2.4]] },
      { c: 'main', e: 'u', pts: [[12, -2.6], [9.2, -7.2], [14.2, -3.4]] },
      { c: 'main', e: 'u', pts: [[22.8, -2.8], [27.8, -6.6], [25, -1]] },
      { c: 'main', e: 'u', pts: [[13.4, -3.2], [12.8, -9.4], [16.4, -3.4]] },
      { c: 'main', e: 'u', pts: [[20.2, -3.2], [24.4, -8.8], [23.4, -2.8]] },
      { c: 'main', e: 'u', pts: [[17.6, -3.4], [20.6, -10], [21, -3.2]] },
      { c: 'main', e: 'u', pts: [[15.6, -3.4], [16.8, -10.4], [18.6, -3.4]] },
      { c: 'main', e: 'a', pts: [[11.2, -1.2], [7.6, -3.2], [11.4, 0.6]] },
      { c: 'main', e: 'a', pts: [[24.8, -1.2], [28.6, -2.6], [24.8, 0.8]] },
      { c: 'light', pts: [[15.8, -4], [16.8, -8.6], [17.4, -4]] },
      { c: 'light', pts: [[13.6, -3.4], [13.2, -7.4], [14.6, -3.6]] },
      { c: 'light', pts: [[20, -3.6], [21.2, -7.4], [21, -3.4]] },
      { c: 'scar', pts: [[22, 0.4], [22.6, 0.2], [23.4, 2.2], [22.8, 2.4]] },
      { c: 'scar', pts: [[23.2, 0.4], [23.6, 0.8], [22.2, 2.2], [21.8, 1.8]] }
    ],
    // Kaiser (3ª versão, pelas imagens do mangá): cabelo MÉDIO e repicado, nada de topete.
    // Loiro em cima virando AZUL da altura dos olhos para baixo; franja bagunçada caindo
    // na testa em mechas até a sobrancelha (uma fininha entre os olhos), laterais longas
    // emoldurando o rosto até o queixo com as pontas azuis. De costas: repicado até a nuca,
    // a metade de baixo azul (HAIR_CUSTOM_BACK)
    kaiser_gradient: [
      // Volume rente à cabeça, com o contorno ondulado (não lambido)
      { c: 'main', pts: [[10.8, 3], [10.7, -1], [11.2, -2.8], [12.2, -4.2], [13.6, -4.7], [14.6, -5.4], [16.2, -5.4], [17.4, -5.8], [19, -5.6], [20.4, -5.9], [21.6, -5.2], [23, -4.8], [24.2, -3.8], [25, -2.6], [25.4, -0.8], [25.2, 3], [24, 3], [24, -0.4], [12, -0.4], [12, 3]] },
      // Cachos curvando para os lados no alto e um tufo no topo
      { c: 'main', e: 'S', pts: [[11.6, -2.8], [10.1, -3.2], [10.3, -2.2], [11, -1.6]] },
      { c: 'main', e: 'S', pts: [[24.4, -2.8], [25.9, -3.2], [25.7, -2.2], [25, -1.6]] },
      { c: 'main', e: 'S', pts: [[17, -5.7], [17.6, -6.9], [18.8, -6.6], [18.4, -5.6]] },
      // Laterais em CURVA: abrem na bochecha e voltam para dentro no queixo, pontas viradas
      { c: 'main', e: 'd', pts: [[10.8, -0.8], [10.1, 1.2], [9.6, 3.2], [9.5, 5], [9.8, 6.6], [9.2, 8], [10.4, 7.6], [10.8, 9], [11.4, 8.2], [12, 9.6], [12.4, 8.4], [12.8, 6.4], [13, 3.6], [12.9, 0.8], [12.8, -0.6]] },
      { c: 'main', e: 'd', pts: [[25.2, -0.8], [25.9, 1.2], [26.4, 3.2], [26.5, 5], [26.2, 6.6], [26.8, 8], [25.6, 7.6], [25.2, 9], [24.6, 8.2], [24, 9.6], [23.6, 8.4], [23.2, 6.4], [23, 3.6], [23.1, 0.8], [23.2, -0.6]] },
      // Mechas que viram para fora na altura da bochecha (o "curvo" do cabelo dele)
      { c: 'main', e: 'S', pts: [[10.6, 1.6], [9, 2.6], [8.6, 4.2], [9.4, 3.6], [10.2, 3.2]] },
      { c: 'main', e: 'S', pts: [[25.4, 1.6], [27, 2.6], [27.4, 4.2], [26.6, 3.6], [25.8, 3.2]] },
      // O azul subindo em pontas pelas laterais (o degradê), seguindo a curva
      { c: 'sec', pts: [[9.5, 4], [10.2, 3.1], [10.8, 3.9], [11.5, 2.8], [12.1, 3.7], [12.95, 3], [12.8, 6.4], [12.4, 8.4], [12, 9.6], [11.4, 8.2], [10.8, 9], [10.4, 7.6], [9.2, 8], [9.8, 6.6], [9.5, 5]] },
      { c: 'sec', pts: [[26.5, 4], [25.8, 3.1], [25.2, 3.9], [24.5, 2.8], [23.9, 3.7], [23.05, 3], [23.2, 6.4], [23.6, 8.4], [24, 9.6], [24.6, 8.2], [25.2, 9], [25.6, 7.6], [26.8, 8], [26.2, 6.6], [26.5, 5]] },
      { c: 'sec', pts: [[8.6, 4.2], [9.4, 3.6], [9.7, 3.4], [9.1, 3.2]] },
      { c: 'sec', pts: [[27.4, 4.2], [26.6, 3.6], [26.3, 3.4], [26.9, 3.2]] },
      // Fios curvos das camadas e o brilho
      { c: 'shade', pts: [[15.4, -5], [15.9, -5], [15, -2], [14.5, -2.2]] },
      { c: 'shade', pts: [[19.8, -5.2], [20.3, -5.2], [21, -2.2], [20.5, -2]] },
      { c: 'shade', pts: [[11.6, 0.8], [12.1, 0.8], [11.3, 3.6], [11.6, 6.2], [11.1, 6.2], [10.8, 3.6]] },
      { c: 'shade', pts: [[24.4, 0.8], [23.9, 0.8], [24.7, 3.6], [24.4, 6.2], [24.9, 6.2], [25.2, 3.6]] },
      { c: 'light', pts: [[13.2, -3.6], [15.4, -4.6], [18.2, -4.9], [17.8, -4.3], [15.4, -4.1], [13.6, -3.1]] },      // Franja bagunçada: mechas de tamanhos diferentes até a sobrancelha, uma fina entre os olhos
      { c: 'main', only: 'front', e: 's', pts: [[11.8, -1.8], [24.2, -1.8], [24.4, 1.2], [24.2, 3.2], [23.2, 2.2], [22.6, 3.6], [21.6, 2], [20.4, 3], [19.4, 1.6], [18.7, 4.9], [18.1, 4.9], [17.6, 1.8], [16.4, 3.2], [15.6, 1.8], [14.2, 3.4], [13.4, 1.8], [11.8, 3], [11.6, 1.2]] },
      // ...com as pontas azuis
      { c: 'sec', only: 'front', pts: [[18.05, 3.4], [18.75, 3.4], [18.6, 4.9], [18, 4.9]] },
      { c: 'sec', only: 'front', pts: [[23.4, 2.4], [24.25, 2.4], [24.2, 3.2]] },
      { c: 'sec', only: 'front', pts: [[22.2, 2.7], [23, 2.7], [22.6, 3.6]] },
      { c: 'sec', only: 'front', pts: [[13.8, 2.6], [14.6, 2.6], [14.2, 3.4]] },
      { c: 'sec', only: 'front', pts: [[11.7, 2.4], [12.6, 2.4], [11.8, 3]] },
      { c: 'shade', only: 'front', pts: [[16.4, -1.2], [16.9, -1.2], [16.2, 2.2], [15.8, 2]] },
      { c: 'shade', only: 'front', pts: [[21.2, -1.2], [21.7, -1.2], [22, 2.2], [21.6, 2.4]] },
      // Costas: repicado até a nuca, a metade de baixo azul
      { c: 'main', only: 'back', pts: [[10.6, -1], [25.4, -1], [25.6, 4], [25.2, 7], [24.2, 8.6], [23, 7.4], [21.6, 9], [20.2, 7.6], [18.6, 9.4], [17, 7.6], [15.6, 9], [14.2, 7.4], [12.8, 8.6], [11.6, 7], [10.4, 4]] },
      { c: 'sec', only: 'back', pts: [[10.5, 4.6], [11.4, 3.6], [12.4, 4.8], [13.6, 3.4], [15, 4.6], [16.6, 3.4], [18, 4.8], [19.6, 3.4], [21, 4.6], [22.6, 3.4], [23.8, 4.8], [24.6, 3.6], [25.5, 4.6], [25.2, 7], [24.2, 8.6], [23, 7.4], [21.6, 9], [20.2, 7.6], [18.6, 9.4], [17, 7.6], [15.6, 9], [14.2, 7.4], [12.8, 8.6], [11.6, 7]] },
      { c: 'shade', only: 'back', pts: [[14.4, -0.4], [14.9, -0.4], [14.8, 7], [14.4, 7]] },
      { c: 'shade', only: 'back', pts: [[18, -0.6], [18.5, -0.6], [18.4, 8], [18, 8]] },
      { c: 'shade', only: 'back', pts: [[21.4, -0.4], [21.9, -0.4], [21.8, 7], [21.4, 7]] }
    ],    // Chigiri: vermelho, liso e longo. Topo liso com reflexo em arco, franja repartida
    // varrida para os dois lados, mechas finas na frente dos ombros e cabelo até o meio das costas
    chigiri_long: [
      { c: 'main', only: 'back', e: 'd', pts: [[10.4, -1], [25.6, -1], [26, 9], [25.4, 12.6], [24, 14.6], [22.6, 13], [21, 15], [19.6, 13.4], [18, 15.4], [16.4, 13.4], [15, 15], [13.4, 13], [12, 14.6], [10.6, 12.6], [10, 9]] },
      { c: 'light', only: 'back', pts: [[13.6, 2], [14.2, 2], [14.3, 11.4], [13.7, 11.4]] },
      { c: 'light', only: 'back', pts: [[21.8, 2], [22.4, 2], [22.3, 11.4], [21.7, 11.4]] },
      { c: 'main', pts: [[10.4, 6], [10.4, -1.2], [11.6, -3.4], [14, -4.6], [18, -5], [22, -4.6], [24.4, -3.4], [25.6, -1.2], [25.6, 6], [24, 6], [24, -0.4], [12, -0.4], [12, 6]] },
      { c: 'main', e: 'd', pts: [[9.8, 0.6], [12.8, 0.6], [13.1, 4.4], [12.8, 7.6], [12.3, 10.4], [11.7, 13.4], [11, 15.6], [10.4, 13], [9.6, 8]] },
      { c: 'main', e: 'd', pts: [[26.2, 0.6], [23.2, 0.6], [22.9, 4.4], [23.2, 7.6], [23.7, 10.4], [24.3, 13.4], [25, 15.6], [25.6, 13], [26.4, 8]] },
      { c: 'main', only: 'front', e: 'd', pts: [[12, -0.8], [17.8, -0.8], [17.3, 0.6], [16.2, 2], [14.8, 3], [13.2, 3.6], [12.2, 2.4]] },
      { c: 'main', only: 'front', e: 'd', pts: [[17.4, -0.8], [24, -0.8], [23.8, 2.4], [23, 3.6], [21.4, 3], [19.8, 2], [18.4, 0.8]] },
      { c: 'main', only: 'front', pts: [[16.4, -1.2], [19.6, -1.2], [19, 2], [18.2, 4.4], [17.4, 2]] },
      { c: 'light', pts: [[12.2, -2.4], [14.4, -3.7], [18, -4.2], [21.6, -3.7], [23.8, -2.4], [23.3, -1.9], [21.4, -3], [18, -3.5], [14.6, -3], [12.7, -1.9]] },
      { c: 'light', pts: [[10.5, 2.4], [11, 2.4], [11.1, 10.4], [10.7, 10.4]] },
      { c: 'light', pts: [[25.5, 2.4], [25, 2.4], [24.9, 10.4], [25.3, 10.4]] }
    ],
    // Rin: verde quase preto, liso; a franja varre para um lado e cobre parte do olho,
    // com uma mecha comprida entre os olhos e as laterais curtas (terminam na bochecha)
    rin_fringe: [
      { c: 'main', pts: [[10.6, 4], [10.5, -1.2], [11.6, -3.6], [14.4, -5], [18, -5.3], [21.6, -5], [24.4, -3.6], [25.5, -1.2], [25.4, 4], [24, 4], [24, -0.6], [12, -0.6], [12, 4]] },
      { c: 'main', e: 's', pts: [[10.3, 0], [12.8, 0], [12.9, 3.6], [12.4, 5.4], [11.6, 6], [10.9, 4.8], [10.3, 3]] },
      { c: 'main', e: 's', pts: [[25.7, 0], [23.2, 0], [23.1, 3.6], [23.6, 5.4], [24.4, 6], [25.1, 4.8], [25.7, 3]] },
      { c: 'main', only: 'front', e: 's', pts: [[21, -1.2], [24.2, -1.2], [24, 1.6], [23.2, 2.8], [22.4, 1.6], [21.6, 2.4], [21.2, 0.8]] },
      { c: 'main', only: 'front', e: 's', pts: [[11.8, -1.2], [21.4, -1.2], [20, 0.4], [18.4, 1.6], [17, 2.8], [15.6, 4.4], [14.6, 6], [13.8, 4.6], [13, 5.6], [12.4, 3.6], [11.8, 2]] },
      { c: 'main', only: 'front', e: 's', pts: [[14.6, 0.6], [17.2, 0.6], [16, 3.4], [15, 5.4], [14.6, 3.2]] },
      { c: 'main', only: 'front', e: 's', pts: [[17, 0.8], [19, 0.8], [18.4, 3.4], [17.6, 5.2], [17.2, 3]] },
      { c: 'sec', pts: [[13, -3.4], [16, -4.4], [18.4, -4.6], [18, -4.1], [15.8, -3.9], [13.4, -2.9]] },
      { c: 'sec', only: 'front', pts: [[17.4, 0.4], [18, 0.2], [16.2, 3.6], [15.8, 3.4]] }
    ],    // Jinpachi Ego: corte tigela (cogumelo) cinza-escuro bem redondo, franja reta cortada
    // na altura dos óculos e laterais curtas na altura da orelha; reflexos em fios verticais
    ego_bob: [
      { c: 'main', pts: [[10.6, 4.8], [10.3, 0], [10.7, -2.6], [12.1, -4.7], [14.6, -5.9], [18, -6.3], [21.4, -5.9], [23.9, -4.7], [25.3, -2.6], [25.7, 0], [25.4, 4.8], [24.2, 5], [24, 3.6], [12, 3.6], [11.8, 5]] },
      { c: 'line', only: 'front', pts: [[13.5, 1.8], [13.9, 1.8], [13.9, 3.6], [13.5, 3.6]] },
      { c: 'line', only: 'front', pts: [[15.4, 1.2], [15.8, 1.2], [15.8, 3.6], [15.4, 3.6]] },
      { c: 'line', only: 'front', pts: [[17.3, 1.6], [17.7, 1.6], [17.7, 3.6], [17.3, 3.6]] },
      { c: 'line', only: 'front', pts: [[19.2, 1.2], [19.6, 1.2], [19.6, 3.6], [19.2, 3.6]] },
      { c: 'line', only: 'front', pts: [[21.1, 1.6], [21.5, 1.6], [21.5, 3.6], [21.1, 3.6]] },
      { c: 'line', only: 'front', pts: [[22.9, 1.8], [23.3, 1.8], [23.3, 3.6], [22.9, 3.6]] },
      { c: 'light', pts: [[13.8, -4.4], [14.4, -4.8], [14.6, -1.2], [14, -1]] },
      { c: 'light', pts: [[17.6, -5.6], [18.2, -5.6], [18.3, -2], [17.7, -1.8]] },
      { c: 'light', pts: [[21.4, -4.8], [22, -4.4], [21.8, -1], [21.2, -1.2]] },
      { c: 'light', pts: [[11.6, -1.6], [12, -2], [12.2, 2.4], [11.8, 2.6]] },
      { c: 'light', pts: [[24.4, -2], [24.8, -1.6], [24.2, 2.6], [23.8, 2.4]] }
    ],
    // Anri Teieri: castanho, na altura dos ombros com as pontas viradas, franja de lado e presilha
    anri_bob: [
      { c: 'main', pts: [[10.4, 10], [10.4, -1], [11.6, -3.4], [14.4, -4.6], [18, -5], [21.6, -4.6], [24.4, -3.4], [25.6, -1], [25.6, 10], [24, 10.6], [23.6, 1.6], [12.4, 1.6], [12, 10.6]] },
      { c: 'main', e: 'a', pts: [[9.4, 8.4], [12.4, 8.4], [12.6, 11.4], [10.8, 11.8], [8.8, 10.8]] },
      { c: 'main', e: 'a', pts: [[26.6, 8.4], [23.6, 8.4], [23.4, 11.4], [25.2, 11.8], [27.2, 10.8]] },
      { c: 'main', only: 'front', e: 'd', pts: [[12, -0.8], [24, -0.8], [23.8, 1.6], [22.6, 2.6], [20.4, 2.2], [18, 3], [15.8, 3.6], [13.8, 3.8], [12.4, 3.2]] },
      { c: 'main', only: 'front', e: 'd', pts: [[12.4, 0], [15.6, 0], [14.4, 3.8], [12.8, 4.6]] },
      { c: 'light', pts: [[12.8, -2.4], [15.2, -3.6], [18, -4], [20.8, -3.6], [23.2, -2.4], [22.8, -1.8], [20.6, -2.9], [18, -3.3], [15.4, -2.9], [13.2, -1.8]] },
      { c: 'sec', only: 'front', pts: [[20.4, -0.6], [23.2, -1.2], [23.4, -0.3], [20.6, 0.3]] }
    ],
    // Bachira (refeito pelas imagens de referência): cogumelo cheio e redondo, franja pesada
    // em pontas até os olhos (uma mecha entre eles), laterais cobrindo as orelhas até o
    // queixo com as pontas AMARELAS virando para fora. De costas: nuca escura com a barra
    // amarela virada para fora (HAIR_CUSTOM_BACK). Brilho em 'gloss' (no cabelo escuro o
    // 'light' vira a cor 2, que aqui é o amarelo)
    bachira_bob: [
      { c: 'main', pts: [[9.8, 1.4], [9.7, -1.2], [10.5, -3.6], [12.5, -5.2], [15.2, -6], [18, -6.2], [20.8, -6], [23.5, -5.2], [25.5, -3.6], [26.3, -1.2], [26.2, 1.4], [24.2, 1.4], [24.2, -0.4], [11.8, -0.4], [11.8, 1.4]] },
      // Laterais até o queixo, pontas abrindo um pouco para fora
      { c: 'main', pts: [[9.8, 0], [12.9, 0], [13.1, 3], [12.9, 5.4], [12.6, 6.6], [12.2, 7.8], [11.3, 7.2], [10.5, 8.2], [9.9, 7.3], [9, 7.8], [9.3, 6.6], [9.6, 5], [9.8, 2.4]] },
      { c: 'main', pts: [[26.2, 0], [23.1, 0], [22.9, 3], [23.1, 5.4], [23.4, 6.6], [23.8, 7.8], [24.7, 7.2], [25.5, 8.2], [26.1, 7.3], [27, 7.8], [26.7, 6.6], [26.4, 5], [26.2, 2.4]] },
      // Pontas amarelas (o amarelo sobe em mechas irregulares)
      { c: 'sec', pts: [[9.5, 5.6], [10.3, 6.1], [11.1, 5.5], [11.9, 6.1], [12.8, 5.5], [12.6, 6.6], [12.2, 7.8], [11.3, 7.2], [10.5, 8.2], [9.9, 7.3], [9, 7.8], [9.3, 6.6]] },
      { c: 'sec', pts: [[26.5, 5.6], [25.7, 6.1], [24.9, 5.5], [24.1, 6.1], [23.2, 5.5], [23.4, 6.6], [23.8, 7.8], [24.7, 7.2], [25.5, 8.2], [26.1, 7.3], [27, 7.8], [26.7, 6.6]] },
      // Franja pesada numa peça só, com as pontas descendo até a linha dos olhos
      // (a do meio, entre os olhos, é a mais comprida)
      { c: 'main', only: 'front', e: 'd', pts: [[11.4, -1.6], [24.6, -1.6], [24.6, 1.6], [24, 3.2], [23.2, 1.8], [22.2, 3.4], [21.2, 1.9], [20, 3.3], [19, 2], [18, 3.6], [17, 2], [16, 3.3], [14.9, 1.9], [13.9, 3.4], [12.9, 1.8], [12, 3.2], [11.4, 1.6]] },
      // Brilho em anel no topo e fios brilhando na franja e nas laterais
      { c: 'gloss', pts: [[12.8, -3.8], [15.4, -5], [18, -5.3], [20.6, -5], [23.2, -3.8], [22.8, -3.3], [20.4, -4.4], [18, -4.7], [15.6, -4.4], [13.2, -3.3]] },
      { c: 'gloss', only: 'front', pts: [[14.8, -0.6], [15.3, -0.6], [14.9, 1.4]] },
      { c: 'gloss', only: 'front', pts: [[20.7, -0.6], [21.2, -0.6], [21.3, 1.4]] },
      { c: 'gloss', pts: [[10.5, 1], [11, 1], [10.7, 4.4], [10.3, 4.4]] },
      { c: 'gloss', pts: [[25.5, 1], [25, 1], [25.3, 4.4], [25.7, 4.4]] },
      // Costas: nuca escura, fios e a barra amarela virando para fora
      { c: 'main', only: 'back', pts: [[9.8, -1], [26.2, -1], [26.3, 6.4], [9.7, 6.4]] },
      { c: 'sec', only: 'back', pts: [[9.7, 6], [11, 6.5], [12.4, 6], [13.8, 6.5], [15.2, 6], [16.6, 6.5], [18, 6], [19.4, 6.5], [20.8, 6], [22.2, 6.5], [23.6, 6], [25, 6.5], [26.3, 6], [26.5, 7.2], [27, 7.9], [25.8, 7.6], [24.6, 8.3], [23.2, 7.5], [21.6, 8.2], [20.2, 7.5], [18.6, 8.2], [17.2, 7.5], [15.6, 8.2], [14.2, 7.5], [12.6, 8.2], [11.4, 7.5], [10.2, 8.3], [9, 7.9], [9.5, 7.2]] },
      { c: 'line', only: 'back', pts: [[14.4, 0.6], [14.9, 0.6], [14.8, 5.4], [14.4, 5.4]] },
      { c: 'line', only: 'back', pts: [[17.8, -0.2], [18.3, -0.2], [18.2, 5.6], [17.8, 5.6]] },
      { c: 'line', only: 'back', pts: [[21.2, 0.6], [21.7, 0.6], [21.6, 5.4], [21.2, 5.4]] }
    ],
    // Nagi: branco, fofo e bagunçado, com tufos saindo para os lados e franja caída nos olhos
    nagi_fluffy: [
      { c: 'main', pts: [[10.2, 4], [10, 0], [10.6, -2.6], [12.2, -4.6], [14.8, -5.8], [18, -6.1], [21.2, -5.8], [23.8, -4.6], [25.4, -2.6], [26, 0], [25.8, 4], [24, 4], [24, -0.6], [12, -0.6], [12, 4]] },
      { c: 'main', e: 'u', pts: [[15, -5.6], [15.4, -7.4], [17.6, -5.9]] },
      { c: 'main', e: 's', pts: [[9.9, 1], [12.6, 1], [12.8, 3.8], [12.2, 5.6], [11.5, 4.6], [10.7, 5.6], [10, 4]] },
      { c: 'main', e: 's', pts: [[26.1, 1], [23.4, 1], [23.2, 3.8], [23.8, 5.6], [24.5, 4.6], [25.3, 5.6], [26, 4]] },
      // Franja em mechas pontudas (sem traço de nanquim: no branco ele vira rabisco cinza)
      { c: 'main', only: 'front', pts: [[11.6, -1.6], [24.4, -1.6], [24.4, 0.6], [11.6, 0.6]] },
      { c: 'main', only: 'front', pts: [[11.8, -1.2], [15, -1.2], [13.2, 3.4], [12.4, 2]] },
      { c: 'main', only: 'front', pts: [[13.6, -1.2], [17, -1.2], [15.6, 3.6]] },
      { c: 'main', only: 'front', pts: [[15.8, -1.2], [19.6, -1.2], [17.8, 3.8]] },
      { c: 'main', only: 'front', pts: [[18.6, -1.2], [22, -1.2], [20.4, 3.4]] },
      { c: 'main', only: 'front', pts: [[21, -1.2], [24.2, -1.2], [23.6, 2], [22.8, 3.2]] },
      { c: 'sec', only: 'front', pts: [[15.4, 0.6], [15.9, 0.6], [15.6, 2.6]] },
      { c: 'sec', only: 'front', pts: [[19.9, 0.6], [20.4, 0.6], [20.2, 2.4]] }
    ],
    // Reo: roxo, franja de cortina repartida no meio (testa aparecendo), mechas até o queixo
    // e um coque pequeno no alto da cabeça
    reo_bun: [
      { c: 'main', e: 'a', pts: [[16.4, -4.8], [16.2, -6.8], [17.2, -7.8], [18.8, -7.8], [19.8, -6.8], [19.6, -4.8]] },
      { c: 'line', pts: [[16.6, -5.2], [19.4, -5.2], [19.4, -4.6], [16.6, -4.6]] },
      { c: 'main', pts: [[10.6, 4.6], [10.6, -1.4], [11.8, -3.6], [14.6, -4.7], [18, -5], [21.4, -4.7], [24.2, -3.6], [25.4, -1.4], [25.4, 4.6], [24, 4.6], [24, -0.6], [12, -0.6], [12, 4.6]] },
      { c: 'main', e: 'd', pts: [[10.4, 0.6], [12.9, 0.6], [13, 5], [12.6, 7.8], [11.6, 8.4], [10.6, 6.4]] },
      { c: 'main', e: 'd', pts: [[25.6, 0.6], [23.1, 0.6], [23, 5], [23.4, 7.8], [24.4, 8.4], [25.4, 6.4]] },
      { c: 'main', only: 'front', e: 'd', pts: [[11.8, -1.2], [17.6, -1.2], [16.4, -0.2], [14.8, 0.8], [13.4, 2.2], [12.8, 3.4], [12.2, 2]] },
      { c: 'main', only: 'front', e: 'd', pts: [[24.2, -1.2], [18.4, -1.2], [19.6, -0.2], [21.2, 0.8], [22.6, 2.2], [23.2, 3.4], [23.8, 2]] },
      { c: 'main', only: 'front', e: 'd', pts: [[17.2, -1.2], [18.6, -1.2], [17.6, 2.4], [16.9, 1.4]] },
      { c: 'sec', pts: [[13, -2.8], [15.4, -3.9], [18, -4.3], [17.6, -3.7], [15.4, -3.3], [13.4, -2.3]] }
    ],
    // Bunny Iglesias: na mesma linha do Teddy Knight (volumoso, mechas varridas pelo vento),
    // só que espelhado — risca à direita, tudo varrendo pra ESQUERDA — e mais liso (tufos
    // menores e mais baixos). Branco-prateado; franja caindo nos olhos com uma mecha entre
    // eles; cicatriz em cruz na bochecha esquerda. Vale com e sem o gorro do disfarce.
    bunny_messy: [
      { c: 'main', pts: [[9.8, 3], [9.3, -0.6], [9.8, -3.4], [11.4, -5.6], [13.8, -7], [16.6, -7.6], [19.6, -7.4], [22.2, -6.6], [24.4, -5], [25.9, -2.8], [26.3, 0], [25.8, 3], [24, 3], [24, -0.6], [12, -0.6], [12, 3]] },
      // tufos varridos pra esquerda (mais baixos e lisos que os do Teddy)
      { c: 'main', e: 'S', pts: [[22.8, -6.6], [19.8, -8.4], [20.2, -7.3]] },
      { c: 'main', e: 'S', pts: [[19.8, -7.4], [15.6, -9], [16.8, -7.6]] },
      { c: 'main', e: 'S', pts: [[16.6, -7.6], [12, -8.4], [13.8, -7]] },
      { c: 'main', e: 'S', pts: [[13.6, -7], [8.8, -6.8], [11.4, -5.6]] },
      { c: 'main', e: 'S', pts: [[11.2, -5.4], [7.4, -4.2], [9.7, -3.2]] },
      { c: 'main', e: 'S', pts: [[9.6, -2.4], [7, -0.4], [9.3, 0.2]] },
      { c: 'main', e: 'S', pts: [[25.4, -4.2], [27, -3], [25.9, -2]] },
      // laterais até a bochecha, pontas abrindo pra fora (mais do lado esquerdo)
      { c: 'main', e: 's', pts: [[9.4, 0], [12.9, 0], [12.9, 2.6], [12.5, 4.6], [11.8, 3.8], [11, 5], [10.4, 3.6], [8.8, 3.8], [9.6, 2.2], [8.6, 1]] },
      { c: 'main', e: 's', pts: [[26.4, 0], [23.1, 0], [23.1, 2.6], [23.5, 4.6], [24.1, 3.8], [24.8, 5], [25.4, 3.6], [26.2, 4], [26.1, 2.2], [26.6, 1.4]] },
      // franja comprida caindo nos olhos (pontas puxadas pra direita) e uma mecha entre eles
      { c: 'main', only: 'front', e: 's', pts: [[24.4, -2], [11.6, -2], [11.6, 1], [12.1, 2.4], [13.1, 3.2], [13, 1.8], [13.8, 2.4], [14.9, 4], [14.8, 2.4], [15.6, 2.8], [16.8, 4.6], [16.6, 2.8], [17.2, 3.2], [18.4, 6.4], [18.2, 3.2], [19, 3.4], [20.6, 4.8], [20.2, 3], [21, 3], [22.4, 4.4], [22.1, 2.6], [23, 2.6], [24, 3.6], [23.8, 2], [24.4, 1.2]] },
      { c: 'shade', only: 'front', pts: [[15.6, -1], [15.1, -1], [16, 2.4], [16.4, 2.4]] },
      { c: 'shade', only: 'front', pts: [[19.6, -1], [19.1, -1], [19.8, 2.8], [20.2, 2.8]] },
      // sombra cinza (cor 2) em fios finos, seguindo o vento
      { c: 'sec', pts: [[22.6, -4.6], [19.2, -6.4], [18.8, -6], [22.2, -4.1]] },
      { c: 'sec', pts: [[17.4, -5.6], [13.6, -6.6], [13.4, -6.1], [17.1, -5.1]] },
      { c: 'sec', pts: [[12, -3.8], [9.8, -4.6], [9.7, -4.1], [11.8, -3.3]] },
      // brilho no alto
      { c: 'gloss', pts: [[23.6, -3.8], [21.2, -5.6], [18.4, -6.4], [18.6, -5.8], [21, -5], [23.1, -3.3]] },
      // Cicatriz em cruz na bochecha esquerda: uma linha até o nariz e outra na diagonal
      { c: 'scar', only: 'front', pts: [[13.2, 6.2], [18.2, 6.3], [18.2, 6.7], [13.2, 6.6]] },
      { c: 'scar', only: 'front', pts: [[15, 5.9], [15.8, 5.9], [14.8, 8.1], [14, 8.1]] }
    ],
    // Gorro preto (disfarce de famoso do Bunny): desenhado por cima do cabelo (charData.hat)
    hat_beanie: [
      { c: 'main', pts: [[10, 1.4], [9.9, -1.4], [10.8, -4], [12.8, -5.9], [15.6, -6.9], [18, -7.1], [20.4, -6.9], [23.2, -5.9], [25.2, -4], [26.1, -1.4], [26, 1.4]] },
      { c: 'sec', pts: [[9.9, -0.8], [26.1, -0.8], [26, 1.6], [10, 1.6]] },
      { c: 'line', pts: [[11.4, -0.6], [11.8, -0.6], [11.8, 1.4], [11.4, 1.4]] },
      { c: 'line', pts: [[13.6, -0.6], [14, -0.6], [14, 1.4], [13.6, 1.4]] },
      { c: 'line', pts: [[15.8, -0.6], [16.2, -0.6], [16.2, 1.4], [15.8, 1.4]] },
      { c: 'line', pts: [[18, -0.6], [18.4, -0.6], [18.4, 1.4], [18, 1.4]] },
      { c: 'line', pts: [[20.2, -0.6], [20.6, -0.6], [20.6, 1.4], [20.2, 1.4]] },
      { c: 'line', pts: [[22.4, -0.6], [22.8, -0.6], [22.8, 1.4], [22.4, 1.4]] },
      { c: 'line', pts: [[24.4, -0.6], [24.8, -0.6], [24.8, 1.4], [24.4, 1.4]] },
      { c: 'gloss', pts: [[13.4, -4.6], [15.8, -5.8], [18, -6], [17.6, -5.4], [15.6, -5.2], [13.8, -4.1]] }
    ],
    // Kunigami (refeito pelas imagens de referência, versão sem barba): laranja, volumoso e
    // bagunçado, com tufos espetados saindo para todos os lados (cima e laterais), laterais
    // picotadas cobrindo a orelha e franja em mechas pontudas até a sobrancelha
    kunigami_spike: [
      { c: 'main', pts: [[10.2, 2.6], [9.8, -1.2], [10.6, -3.8], [12.6, -5.6], [15.2, -6.6], [18, -6.9], [20.8, -6.6], [23.4, -5.6], [25.4, -3.8], [26.2, -1.2], [25.8, 2.6], [24, 2.6], [24, -0.4], [12, -0.4], [12, 2.6]] },
      // Tufos espetados em volta (da esquerda para a direita)
      { c: 'main', e: 'S', pts: [[10.4, 0.6], [7.4, 1.6], [10.2, 2.6]] },
      { c: 'main', e: 'S', pts: [[10, -2], [6.6, -2.6], [10.2, -0.2]] },
      { c: 'main', e: 'S', pts: [[11, -4], [7.4, -6.6], [12.2, -5]] },
      { c: 'main', e: 'S', pts: [[12.6, -5.4], [10.8, -9.4], [14.6, -6.3]] },
      { c: 'main', e: 'S', pts: [[14.8, -6.4], [14.4, -10.8], [17, -6.8]] },
      { c: 'main', e: 'S', pts: [[17.2, -6.8], [18.8, -11.4], [19.6, -6.8]] },
      { c: 'main', e: 'S', pts: [[19.6, -6.7], [22.8, -10.2], [22.4, -6.1]] },
      { c: 'main', e: 'S', pts: [[22.4, -5.9], [26.6, -8], [24.8, -4.6]] },
      { c: 'main', e: 'S', pts: [[25.2, -3.6], [29, -4.6], [26.2, -1.6]] },
      { c: 'main', e: 'S', pts: [[25.8, -0.6], [29.2, 0.4], [25.8, 1.8]] },
      // Laterais picotadas por cima da orelha
      { c: 'main', e: 's', pts: [[9.8, -0.4], [12.9, -0.4], [12.9, 2.8], [12.5, 4.4], [11.9, 3.4], [11.3, 5], [10.6, 3.6], [9.4, 4.4], [9.8, 2.6], [9, 1.6]] },
      { c: 'main', e: 's', pts: [[26.2, -0.4], [23.1, -0.4], [23.1, 2.8], [23.5, 4.4], [24.1, 3.4], [24.7, 5], [25.4, 3.6], [26.6, 4.4], [26.2, 2.6], [27, 1.6]] },
      // Franja em mechas pontudas, a do meio mais comprida
      { c: 'main', only: 'front', e: 's', pts: [[11.8, -2], [24.2, -2], [24.2, 0.8], [23.4, 2.8], [22.6, 1.4], [21.6, 3.4], [20.6, 1.6], [19.4, 3.8], [18.6, 2], [17.6, 4.2], [16.6, 2], [15.4, 3.4], [14.4, 1.4], [13.2, 3], [12.2, 1]] },
      { c: 'shade', only: 'front', pts: [[17.4, -1.4], [17.9, -1.4], [17.6, 3.2], [17.2, 3]] },
      { c: 'shade', only: 'front', pts: [[14.6, -1.4], [15.1, -1.4], [14.4, 1.2], [14, 1]] },
      { c: 'shade', only: 'front', pts: [[21.2, -1.4], [21.7, -1.4], [21.9, 2.4], [21.4, 2.2]] },
      // Fios escuros separando os tufos de cima
      { c: 'shade', pts: [[14.2, -5.8], [14.7, -5.9], [15.2, -2.8], [14.7, -2.8]] },
      { c: 'shade', pts: [[19.8, -6.2], [20.3, -6.1], [19.9, -2.8], [19.4, -2.8]] },
      { c: 'shade', pts: [[11.6, -3.2], [12, -3.6], [13.4, -1.6], [12.9, -1.4]] },
      { c: 'shade', pts: [[24.4, -3.2], [24, -3.6], [22.6, -1.6], [23.1, -1.4]] },
      // Brilho
      { c: 'light', pts: [[12.8, -4.4], [15.2, -5.6], [17.8, -6], [17.4, -5.4], [15.2, -5], [13.2, -3.9]] },
      { c: 'light', pts: [[15.4, -7], [15.2, -9.8], [15.8, -9.8], [16, -7]] },
      { c: 'light', pts: [[18.2, -7.2], [18.8, -10.2], [19.3, -10], [18.8, -7.2]] },
      // Costas: nuca curta e espetada
      { c: 'main', only: 'back', pts: [[10, -1], [26, -1], [26.2, 3.6], [24.8, 5.4], [23.6, 4.2], [22.2, 5.8], [20.8, 4.4], [19.2, 6], [17.8, 4.4], [16.4, 6], [15, 4.4], [13.6, 5.8], [12.2, 4.2], [9.8, 3.6]] },
      { c: 'shade', only: 'back', pts: [[14.6, 0.2], [15.1, 0.2], [15, 3.8], [14.6, 3.8]] },
      { c: 'shade', only: 'back', pts: [[18, -0.4], [18.5, -0.4], [18.4, 4.2], [18, 4.2]] },
      { c: 'shade', only: 'back', pts: [[21.4, 0.2], [21.9, 0.2], [21.8, 3.8], [21.4, 3.8]] }
    ],
    // Don Lorenzo (pelas imagens de referência): roxo, ondulado e médio, repartido no meio
    // com a franja abrindo em cortina, mechas onduladas descendo até o maxilar com as pontas
    // virando para fora e uma mecha solta caindo na testa
    lorenzo_wavy: [
      { c: 'main', pts: [[11.46, 3.68], [11.12, -0.52], [11.81, -2.7], [13.53, -4.05], [15.94, -4.72], [18.34, -4.8], [20.75, -4.55], [22.82, -3.71], [24.36, -2.2], [24.88, -0.18], [24.71, 3.68], [23.16, 3.68], [23.16, -0.02], [12.84, -0.02], [12.84, 3.68]] },
      // Ondas soltas no alto
      { c: 'main', e: 'S', pts: [[12.5, -3.21], [10.95, -4.89], [14.04, -4.05]] },
      { c: 'main', e: 'S', pts: [[15.42, -4.55], [15.76, -6.06], [17.48, -4.72]] },
      { c: 'main', e: 'S', pts: [[19.89, -4.64], [21.78, -5.9], [21.96, -4.22]] },
      { c: 'main', e: 'S', pts: [[23.68, -2.87], [25.74, -3.38], [24.71, -1.53]] },
      // Mechas laterais onduladas até a linha dos olhos
      { c: 'main', e: 's', pts: [[11.29, -0.02], [13.61, -0.02], [13.87, 2.34], [13.6, 4], [13.2, 5.2], [12.4, 5.6], [11.9, 4.9], [11, 5.4], [10.8, 4.4], [10.3, 3.6], [10.95, 2.6], [10.6, 1.66]] },
      { c: 'main', e: 's', pts: [[24.71, -0.02], [22.39, -0.02], [22.13, 2.34], [22.4, 4], [22.8, 5.2], [23.6, 5.6], [24.1, 4.9], [25, 5.4], [25.2, 4.4], [25.7, 3.6], [25.05, 2.6], [25.4, 1.66]] },
      // Pontas virando para fora
      { c: 'main', e: 'S', pts: [[11.1, 4.2], [9.4, 4.7], [9.9, 5.8], [11.6, 5.1]] },
      { c: 'main', e: 'S', pts: [[24.9, 4.2], [26.6, 4.7], [26.1, 5.8], [24.4, 5.1]] },
      // Franja em cortina, repartida no meio, e a mecha solta na testa
      { c: 'main', only: 'front', e: 's', pts: [[17.66, -1.36], [12.67, -1.36], [12.67, 1.33], [13.18, 2.67], [13.87, 1.66], [14.56, 2.17], [15.25, 0.82], [16.28, -0.02]] },
      { c: 'main', only: 'front', e: 's', pts: [[17.66, -1.36], [23.33, -1.36], [23.33, 1.33], [22.82, 2.67], [22.13, 1.66], [21.44, 2.34], [20.41, 0.82], [19.03, -0.02]] },
      { c: 'main', only: 'front', e: 's', pts: [[17.14, -1.02], [18.52, -1.02], [18.69, 0.66], [18.09, 1.5], [18.43, 2.5], [17.66, 2], [17.14, 0.99]] },
      { c: 'shade', only: 'front', pts: [[14.22, -0.86], [14.65, -0.86], [14.04, 1.33], [13.7, 1.16]] },
      { c: 'shade', only: 'front', pts: [[21.44, -0.86], [21.87, -0.86], [22.3, 1.5], [21.87, 1.66]] },
      // Fios das ondas
      { c: 'shade', pts: [[11.64, 1.33], [12.07, 1.33], [12.32, 3.2], [11.9, 4.6], [11.5, 4.6], [11.89, 3.2]] },
      { c: 'shade', pts: [[24.36, 1.33], [23.93, 1.33], [23.68, 3.2], [24.1, 4.6], [24.5, 4.6], [24.11, 3.2]] },
      { c: 'shade', pts: [[15.94, -4.22], [16.37, -4.22], [15.76, -1.86], [15.33, -1.86]] },
      { c: 'shade', pts: [[20.06, -4.22], [20.49, -4.22], [20.92, -1.86], [20.49, -1.86]] },
      { c: 'light', pts: [[13.36, -2.7], [15.42, -3.71], [17.66, -4.05], [17.31, -3.54], [15.42, -3.29], [13.7, -2.28]] },
      { c: 'light', pts: [[19.03, -3.88], [21.1, -3.54], [22.64, -2.54], [22.3, -2.2], [20.92, -3.12], [19.03, -3.46]] },
      // Costas: ondulado e curto (até o meio da nuca)
      { c: 'main', only: 'back', pts: [[11.12, -0.52], [24.88, -0.52], [25.05, 3.4], [24.4, 5], [23.2, 5.8], [22, 5], [20.6, 6], [19.2, 5.2], [18, 6.2], [16.8, 5.2], [15.4, 6], [14, 5], [12.8, 5.8], [11.6, 5], [10.95, 3.4]] },
      { c: 'shade', only: 'back', pts: [[14.9, 0.66], [15.33, 0.66], [15.2, 4.6], [14.8, 4.6]] },
      { c: 'shade', only: 'back', pts: [[18, 0.15], [18.43, 0.15], [18.4, 5.2], [18, 5.2]] },
      { c: 'shade', only: 'back', pts: [[21.1, 0.66], [21.53, 0.66], [21.6, 4.6], [21.2, 4.6]] }
    ],
    // Oliver Aiku (pela imagem de referência): azul-marinho, médio e bagunçado, franja
    // varrida caindo mais de um lado, laterais até a bochecha com a camada de baixo verde-
    // limão aparecendo e barba rala no queixo. Escuro: brilho em 'gloss', verde em 'sec'
    aiku_messy: [
      // Camada de baixo verde-limão (fica por baixo das laterais e aparece nas pontas)
      { c: 'sec', pts: [[10.2, 3.8], [12.8, 3.8], [12.8, 6.2], [12, 6.9], [11.2, 6], [10.4, 5.6]] },
      { c: 'sec', pts: [[25.6, 3.8], [23.2, 3.8], [23.2, 5.6], [24, 6.1], [25, 5.4]] },
      { c: 'main', pts: [[10.4, 3], [10.2, -1.2], [11, -3.8], [13, -5.4], [15.8, -6.2], [18.6, -6.3], [21.4, -5.8], [23.8, -4.6], [25.4, -2.6], [25.8, 0], [25.6, 3], [24, 3], [24, -0.4], [12, -0.4], [12, 3]] },
      // Pontinhas bagunçadas no alto
      { c: 'main', e: 'S', pts: [[11.4, -3.6], [9.2, -5.4], [12.6, -4.8]] },
      { c: 'main', e: 'S', pts: [[14, -5.6], [13.2, -8], [15.8, -6.1]] },
      { c: 'main', e: 'S', pts: [[17.4, -6.2], [18.6, -8.6], [19.6, -6.2]] },
      { c: 'main', e: 'S', pts: [[21.2, -5.8], [23.8, -7.4], [23.4, -4.9]] },
      { c: 'main', e: 'S', pts: [[25, -2.8], [27.6, -3.4], [25.8, -1]] },
      // Laterais picotadas até a bochecha
      { c: 'main', e: 's', pts: [[10.2, -0.4], [12.9, -0.4], [13, 3], [12.6, 5.4], [12, 4.4], [11.4, 5.8], [10.8, 4.4], [10, 4.8], [10.2, 3], [9.6, 2]] },
      { c: 'main', e: 's', pts: [[25.8, -0.4], [23.1, -0.4], [23, 3], [23.4, 5], [24, 4.2], [24.6, 5.4], [25.2, 4.2], [26, 4.4], [25.8, 2.8], [26.4, 1.8]] },
      // Franja varrida, mais comprida do lado direito da tela
      { c: 'main', only: 'front', e: 's', pts: [[11.8, -2], [24.2, -2], [24.2, 0.8], [23.6, 3.4], [22.8, 2.2], [22.2, 4.2], [21.2, 2.8], [20.4, 4.4], [19.6, 2.4], [18.4, 3], [17.2, 1.4], [15.8, 2], [14.4, 0.6], [13, 1.6], [12, 0.4]] },
      { c: 'shade', only: 'front', pts: [[20.6, -1.4], [21.1, -1.4], [21.4, 2.6], [20.9, 2.6]] },
      { c: 'shade', only: 'front', pts: [[17.2, -1.4], [17.7, -1.4], [18.4, 1.8], [17.9, 1.8]] },
      { c: 'shade', only: 'front', pts: [[14, -1.4], [14.5, -1.4], [15, 1.2], [14.5, 1.2]] },
      { c: 'shade', pts: [[15.6, -5.6], [16.1, -5.6], [16.4, -2.6], [15.9, -2.6]] },
      { c: 'shade', pts: [[20.6, -5.4], [21.1, -5.4], [21, -2.6], [20.5, -2.6]] },
      { c: 'gloss', pts: [[12.8, -3.8], [15.2, -5], [18, -5.4], [17.6, -4.8], [15.2, -4.4], [13.2, -3.3]] },
      { c: 'gloss', pts: [[19.6, -5.2], [22, -4.6], [23.6, -3.2], [23.2, -2.8], [21.8, -4], [19.6, -4.7]] },
      // Barba rala: cavanhaque e fio no maxilar
      { c: 'beard', pts: [[16.8, 8.7], [19.2, 8.7], [18.8, 9.9], [17.2, 9.9]] },
      { c: 'beard', pts: [[12.6, 7.8], [13.1, 7.8], [14.8, 8.9], [14.6, 9.3], [12.8, 8.5]] },
      { c: 'beard', pts: [[23.4, 7.8], [22.9, 7.8], [21.2, 8.9], [21.4, 9.3], [23.2, 8.5]] },
      // Costas: nuca média com o verde por baixo nas pontas
      { c: 'sec', only: 'back', pts: [[10.6, 3.6], [14, 3.6], [14, 6.2], [10.6, 6.2]] },
      { c: 'sec', only: 'back', pts: [[22, 3.6], [25.4, 3.6], [25.4, 6.2], [22, 6.2]] },
      { c: 'main', only: 'back', pts: [[10.2, -1], [25.8, -1], [26, 4.4], [24.8, 6], [23.4, 4.8], [22, 6.2], [20.6, 4.8], [19, 6.4], [17.6, 4.8], [16.2, 6.4], [14.8, 4.8], [13.4, 6.2], [12, 4.8], [10, 4.4]] },
      { c: 'shade', only: 'back', pts: [[14.6, 0.2], [15.1, 0.2], [15, 3.8], [14.6, 3.8]] },
      { c: 'shade', only: 'back', pts: [[18, -0.4], [18.5, -0.4], [18.4, 4.4], [18, 4.4]] },
      { c: 'shade', only: 'back', pts: [[21.4, 0.2], [21.9, 0.2], [21.8, 3.8], [21.4, 3.8]] }
    ],
    // Shidou (refeito pelas imagens de referência): loiro claro espetado para cima e para os
    // lados num leque largo, com as pontas de cima rosadas; duas mechas rosa compridas caindo
    // da risca até o queixo dos dois lados do rosto (testa aparecendo no meio), laterais
    // curtas e barba rala no queixo
    shidou_horns: [
      { c: 'main', pts: [[11, 2], [10.8, -1.6], [12.2, -3.8], [18, -4.6], [23.8, -3.8], [25.2, -1.6], [25, 2], [24, 2], [24, -0.6], [12, -0.6], [12, 2]] },
      { c: 'main', pts: [[11, -1.6], [11.6, -4], [13.4, -5.6], [16, -6.4], [18, -6.6], [20.4, -6.4], [22.8, -5.4], [24.6, -3.6], [25, -1.6]] },
      // O leque de pontas (da esquerda para a direita)
      { c: 'main', e: 'u', pts: [[11.2, -1.6], [6.8, -5.2], [12.4, -3.6]] },
      { c: 'main', e: 'u', pts: [[12, -3.2], [8.6, -9.2], [14.4, -4.2]] },
      { c: 'main', e: 'u', pts: [[13.6, -4], [12, -11], [16.4, -4.6]] },
      { c: 'main', e: 'u', pts: [[15.6, -4.6], [16.4, -11.6], [19, -4.6]] },
      { c: 'main', e: 'u', pts: [[17.6, -4.6], [21, -11.2], [21.4, -4.2]] },
      { c: 'main', e: 'u', pts: [[20.2, -4.2], [25, -9.6], [23.6, -3.4]] },
      { c: 'main', e: 'u', pts: [[23, -3.4], [29, -5.6], [24.8, -1.4]] },
      // Pontas rosadas (mais forte nas de cima)
      { c: 'sec', pts: [[8.8, -3.6], [6.8, -5.2], [9.3, -4.5]] },
      { c: 'sec', pts: [[10, -6.8], [8.6, -9.2], [10.9, -7.2]] },
      { c: 'sec', pts: [[12.9, -7.2], [12, -11], [14.4, -7.5]] },
      { c: 'sec', pts: [[16, -7.8], [16.4, -11.6], [17.8, -7.8]] },
      { c: 'sec', pts: [[19.1, -7.6], [21, -11.2], [21.2, -7.4]] },
      { c: 'sec', pts: [[22.4, -6.6], [25, -9.6], [24.2, -6.2]] },
      { c: 'sec', pts: [[26, -4.5], [29, -5.6], [26.9, -3.5]] },
      // Fios de brilho subindo pelas pontas
      { c: 'light', pts: [[14.6, -5], [13.4, -9.4], [13.9, -9.4], [15.1, -5]] },
      { c: 'light', pts: [[17, -5.2], [16.6, -10], [17.1, -10], [17.5, -5.2]] },
      { c: 'light', pts: [[19.6, -5], [20.4, -9.6], [20.9, -9.6], [20.1, -5]] },
      // Linha do cabelo (a testa fica de fora) e as duas mechas rosa até o queixo
      { c: 'main', only: 'front', pts: [[12, -1.6], [24, -1.6], [24, -0.4], [12, -0.4]] },
      { c: 'sec', only: 'front', e: 'd', pts: [[15.4, -1.4], [17.6, -1.4], [16.2, 0.8], [14.6, 3], [13.8, 5.4], [13.6, 8.4], [12.8, 9.2], [12.6, 6], [12.9, 3], [13.8, 0.6]] },
      { c: 'sec', only: 'front', e: 'd', pts: [[20.6, -1.4], [18.4, -1.4], [19.8, 0.8], [21.4, 3], [22.2, 5.4], [22.4, 8.4], [23.2, 9.2], [23.4, 6], [23.1, 3], [22.2, 0.6]] },
      // Costas: nuca curta (o leque fica todo em cima), com pontinhas e fios
      { c: 'main', only: 'back', pts: [[11, -1.2], [25, -1.2], [25.2, 3.6], [24, 5.4], [22.6, 4.4], [21, 5.6], [19.4, 4.4], [18, 5.6], [16.6, 4.4], [15, 5.6], [13.4, 4.4], [12, 5.4], [10.8, 3.6]] },
      { c: 'line', only: 'back', pts: [[14.6, 0.4], [15.1, 0.4], [15, 3.8], [14.6, 3.8]] },
      { c: 'line', only: 'back', pts: [[17.8, -0.2], [18.3, -0.2], [18.2, 4.2], [17.8, 4.2]] },
      { c: 'line', only: 'back', pts: [[21, 0.4], [21.5, 0.4], [21.4, 3.8], [21, 3.8]] }
    ]
  },

  // Estilos que desenham a própria nuca (formas only: 'back') em vez da nuca genérica
  HAIR_CUSTOM_BACK: { bachira_bob: true, shidou_horns: true, hat_beanie: true, hugo_wavy: true, fox_slick: true, kunigami_spike: true, lorenzo_wavy: true, aiku_messy: true, kaiser_gradient: true, ness_wave: true },

  // Rasteriza as formas de um estilo em "corridas" horizontais de pixels (cache por estilo).
  // side = cabeça virada de lado (3/4), com o sinal do giro (-1 olhando pra esquerda, 1 pra
  // direita): a fonte do giro usa as formas only: 'side' e pula as marcadas com noSide (peça
  // que de lado fica grossa demais e ganha uma versão própria).
  // over = só as formas only: 'over', desenhadas por cima da cabeça JÁ virada (coordenadas
  // da tela, sem esticar na borda). look: 'left' | 'right' = só olhando para esse lado.
  getHairRuns(style, back, side, over) {
    const sideSrc = !back && !!side;
    const look = side < 0 ? 'left' : 'right';
    const key = `${style}:${back ? 'b' : over ? 'o' + look : sideSrc ? 's' + look : 'f'}`;
    if (!this._hairCache) this._hairCache = {};
    if (this._hairCache[key]) return this._hairCache[key];

    const CELL = 0.5;
    const X0 = 5;
    const Y0 = -12;
    const COLS = 54;
    const ROWS = 68;
    const grid = new Array(COLS * ROWS).fill(null);
    const inside = (x, y, pts) => {
      let hit = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    };
    // only: 'front' | 'back' = forma que só aparece de frente (franja) ou de costas (cabelo longo)
    const keep = (sh) => {
      if (sh.look && (!sideSrc || sh.look !== look)) return false;
      if (over || sh.only === 'over') return !!over && sh.only === 'over';
      if (sh.only === 'side') return sideSrc;
      if (sideSrc && sh.noSide) return false;
      return sh.only !== (back ? 'front' : 'back');
    };
    let shapes = this.HAIR_SHAPES[style].filter(keep);
    if (back && this.HAIR_CUSTOM_BACK[style]) {
      // Estilo com costas próprias (only: 'back'): sem a nuca e os fios genéricos
      shapes = shapes.map((sh) => (sh.only === 'back' ? sh : Object.assign({}, sh, { e: undefined })));
    } else if (back) {
      // De costas: a nuca inteira é cabelo, com pontas de mecha embaixo; barba/cicatriz
      // não aparecem, e o traço de nanquim da franja (detalhe da frente) sai — era ele
      // que deixava a nuca com aquele zigue-zague. Formas feitas pra costas (only: 'back') ficam como são.
      const nape = { c: 'main', pts: [[11, -1], [25, -1], [25.4, 7], [24.4, 8.8], [23, 7.6], [21.4, 9], [19.8, 7.8], [18, 9.2], [16.2, 7.8], [14.6, 9], [13, 7.6], [11.6, 8.8], [10.6, 7]] };
      const strands = [
        { c: 'line', pts: [[14.4, 3.6], [14.9, 3.6], [14.8, 7.4], [14.4, 7.4]] },
        { c: 'line', pts: [[17.8, 2.8], [18.3, 2.8], [18.2, 7.6], [17.8, 7.6]] },
        { c: 'line', pts: [[21.2, 3.6], [21.7, 3.6], [21.6, 7.4], [21.2, 7.4]] },
        { c: 'light', pts: [[12.6, -2.4], [15, -3.5], [18, -3.9], [21, -3.5], [23.4, -2.4], [23, -1.8], [20.8, -2.8], [18, -3.2], [15.2, -2.8], [13, -1.8]] }
      ];
      // Brilho/mecha colorida que fica em cima da franja (dentro do rosto) é detalhe da frente
      const onBangs = (sh) => (sh.c === 'light' || sh.c === 'sec') && sh.only !== 'back' && sh.pts.every(([x, y]) => x >= 12 && x <= 24 && y > -1.5);
      shapes = [
        nape,
        ...shapes
          .filter((sh) => sh.c !== 'beard' && sh.c !== 'scar' && !onBangs(sh))
          .map((sh) => (sh.only === 'back' || sh.e === 'u' ? sh : Object.assign({}, sh, { e: undefined }))),
        ...strands
      ];
    }
    // e: traço de nanquim na borda da própria mecha, para ela não se fundir com o resto
    //    'd' = lados + ponta de baixo (franja), 'u' = lados + ponta de cima (espeto), 'a' = todos
    shapes.forEach((sh) => {
      const xs = sh.pts.map((p) => p[0]);
      const ys = sh.pts.map((p) => p[1]);
      const c0 = Math.max(0, Math.floor((Math.min(...xs) - X0) / CELL));
      const c1 = Math.min(COLS - 1, Math.ceil((Math.max(...xs) - X0) / CELL));
      const r0 = Math.max(0, Math.floor((Math.min(...ys) - Y0) / CELL));
      const r1 = Math.min(ROWS - 1, Math.ceil((Math.max(...ys) - Y0) / CELL));
      const cells = [];
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          if (inside(X0 + (c + 0.5) * CELL, Y0 + (r + 0.5) * CELL, sh.pts)) cells.push([c, r]);
        }
      }
      const mine = new Set(cells.map(([c, r]) => r * COLS + c));
      const has = (c, r) => mine.has(r * COLS + c);
      // 's'/'S' = como 'd'/'u', mas a borda sai num tom mais escuro do próprio cabelo
      // (separa as mechas sem desenhar um segundo "contorno" preto por dentro do cabelo)
      cells.forEach(([c, r]) => {
        let edge = false;
        if (sh.e) {
          edge = !has(c - 1, r) || !has(c + 1, r);
          if (sh.e === 'd' || sh.e === 'a' || sh.e === 's') edge = edge || !has(c, r + 1);
          if (sh.e === 'u' || sh.e === 'a' || sh.e === 'S') edge = edge || !has(c, r - 1);
        }
        grid[r * COLS + c] = edge ? (sh.e === 's' || sh.e === 'S' ? 'shade' : 'line') : sh.c;
      });
    });

    const isHair = (c, r) => {
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
      const v = grid[r * COLS + c];
      return v !== null && v !== 'beard' && v !== 'scar' && v !== 'outline';
    };
    // De costas, a borda suave das mechas da frente não aparece
    if (back) {
      for (let i = 0; i < grid.length; i++) if (grid[i] === 'shade') grid[i] = 'main';
    }
    const out = grid.slice();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = grid[r * COLS + c];
        if (v === null) {
          if (isHair(c - 1, r) || isHair(c + 1, r) || isHair(c, r - 1) || isHair(c, r + 1)) out[r * COLS + c] = 'outline';
        } else if (v === 'main' && !isHair(c, r + 1)) {
          out[r * COLS + c] = 'shade';
        }
      }
    }

    const runs = [];
    for (let r = 0; r < ROWS; r++) {
      let c = 0;
      while (c < COLS) {
        const v = out[r * COLS + c];
        if (v === null) {
          c++;
          continue;
        }
        let e = c + 1;
        while (e < COLS && out[r * COLS + e] === v) e++;
        runs.push({ x: X0 + c * CELL, y: Y0 + r * CELL, w: (e - c) * CELL, k: v });
        c = e;
      }
    }
    this._hairCache[key] = runs;
    return runs;
  },

  drawHairShapes(ctx, style, c1, c2, headY, s, back) {
    const n = parseInt(String(c1).replace('#', ''), 16);
    const luma = Number.isNaN(n) ? 128 : 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255);
    const pal = {
      main: c1,
      sec: c2,
      light: luma < 70 ? c2 : this.shade(c1, 0.32),
      // Brilho que é sempre o próprio cabelo mais claro (o 'light' do cabelo escuro usa a cor 2)
      gloss: this.shade(c1, luma < 70 ? 0.3 : 0.32),
      shade: this.shade(c1, luma < 70 ? -0.3 : -0.22),
      outline: this.shade(c1, luma < 70 ? -0.6 : -0.55),
      line: this.shade(c1, luma < 70 ? -0.6 : -0.5),
      beard: 'rgba(20, 12, 8, 0.78)',
      scar: '#b45f4a'
    };
    this.getHairRuns(style, back).forEach((run) => {
      // Bordas arredondadas nas duas pontas: sem frestas entre linhas vizinhas
      const x0 = Math.round(run.x * s);
      const x1 = Math.round((run.x + run.w) * s);
      const y0 = Math.round((headY + run.y) * s);
      const y1 = Math.round((headY + run.y + 0.5) * s);
      ctx.fillStyle = pal[run.k];
      ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
    });
  },

  // Cabelo com contorno escuro, volume, brilho e franja; cada estilo muda a silhueta
  drawHairStyle(ctx, style, c1, c2, headY, s, facing = 'front') {
    if (this.HAIR_SHAPES[style]) {
      this.drawHairShapes(ctx, style, c1, c2, headY, s, facing === 'back');
      return;
    }
    const dark = this.shade(c1, -0.45);
    const light = this.shade(c1, 0.25);
    const R = (x, y, w, h, c) => this.rect(ctx, x, headY + y, w, h, c, s);

    // Mecha pontuda subindo (col = cor, lean = inclinação da ponta por linha)
    const spike = (x, h, lean = 0, col = c1) => {
      for (let k = 0; k < h; k++) {
        const w = Math.max(0.8, 3 - (k * 2.2) / h);
        const xo = x + lean * k + (3 - w) / 2;
        R(xo - 0.5, -3 - k, w + 1, 1, dark);
        R(xo, -3 - k, w, 1, col);
      }
      R(x + lean * (h - 1) + 1, -3 - h, 1, 0.6, dark);
    };
    // Mecha caindo na testa ou nas laterais
    const strand = (x, y, w, h, col = c1) => {
      R(x - 0.4, y, w + 0.8, h + 0.4, dark);
      R(x, y, w, h, col);
    };

    // Massa base arredondada (contorno + cor + costeletas + brilho)
    R(12, -3.6, 12, 1, dark);
    R(10.6, -2.8, 14.8, 5.3, dark);
    R(12, -3, 12, 1, c1);
    R(11, -2.2, 14, 4.2, c1);
    R(10.2, 0, 1.8, 5, dark);
    R(24, 0, 1.8, 5, dark);
    R(10.6, 0, 1.4, 4.6, c1);
    R(24, 0, 1.4, 4.6, c1);

    if (facing === 'back') {
      R(10.6, 1.5, 14.8, 7, dark);
      R(11, 1.5, 14, 6.6, c1);
      R(14, -2, 6, 0.8, light);
      return;
    }

    switch (style) {
      case 'bob_two_tone':
        // Bob arredondado (Bachira): preto por cima, amarelo por baixo
        strand(9.6, 0, 2.4, 8, c1);
        strand(24, 0, 2.4, 8, c1);
        R(9.6, 5.5, 2.4, 2.5, c2);
        R(24, 5.5, 2.4, 2.5, c2);
        strand(12, 0.5, 12, 1.6, c1);
        R(13, 1.6, 2, 0.8, c2);
        R(18, 1.6, 2, 0.8, c2);
        R(14, -2.2, 6, 0.8, light);
        break;
      case 'long_flowing':
      case 'glam_very_long':
        // Cabelo longo e liso (Chigiri / Aryu) caindo pelos ombros
        strand(9, 0, 3, style === 'glam_very_long' ? 15 : 12, c1);
        strand(24, 0, 3, style === 'glam_very_long' ? 15 : 12, c1);
        R(9.4, 9, 2.2, 3, c2);
        R(24.4, 9, 2.2, 3, c2);
        strand(12, 0.5, 4, 2, c1);
        strand(19, 0.5, 5, 2, c1);
        R(14, -2.4, 7, 0.8, light);
        R(10, 2, 0.8, 6, light);
        break;
      case 'fringe_right':
        // Franja longa cobrindo um lado (Rin)
        strand(16, 0.4, 8, 2.6, c1);
        strand(20, 2.6, 4, 1.4, c1);
        R(21, 3, 2, 1, c2);
        strand(12, 0.4, 3, 1.4, c1);
        R(17, 0.8, 5, 0.7, light);
        break;
      case 'messy_white':
        // Bagunçado e fofo (Nagi)
        spike(11, 2, -0.4);
        spike(14.5, 3, 0.2);
        spike(18, 2.5, 0.4, c2);
        spike(21, 2, 0.6);
        strand(12, 0.5, 3, 2.2, c1);
        strand(16, 0.5, 2.5, 2.6, c2);
        strand(20, 0.5, 3, 2, c1);
        R(14, -2.2, 5, 0.8, light);
        break;
      case 'tied_bun':
        // Coque no topo (Reo)
        R(14.4, -6.4, 7.2, 3.8, dark);
        R(15, -6, 6, 3.2, c2);
        R(16, -5.6, 2, 0.8, this.shade(c2, 0.35));
        strand(12, 0.4, 5, 1.2, c1);
        strand(19, 0.4, 5, 1.2, c1);
        R(13, -2.2, 4, 0.8, light);
        break;
      case 'king_spiky':
        // Coroa de espinhos (Barou)
        spike(10.5, 3, -0.3);
        spike(13.5, 4, -0.1);
        spike(16.5, 5);
        spike(19.5, 4, 0.1);
        spike(22.5, 3, 0.3);
        R(17, -6, 2, 3, c2);
        strand(12, 0.5, 12, 1, c1);
        R(14, -2.2, 7, 0.8, light);
        break;
      case 'demon_antenna':
        // Lateral raspada com duas antenas (Shidou)
        spike(11, 4, -0.5, c2);
        spike(22, 4, 0.5, c2);
        R(16, -4, 4, 1.4, c1);
        strand(14, 0.4, 8, 1, c1);
        R(15, -2.2, 6, 0.8, light);
        break;
      case 'kaiser_tails':
        // Topete loiro com pontas longas azuis (Kaiser)
        strand(9.6, 2, 2.4, 12, c1);
        strand(24, 2, 2.4, 12, c1);
        R(9.6, 9, 2.4, 5, c2);
        R(24, 9, 2.4, 5, c2);
        spike(15, 3, 0.3);
        strand(12, 0.4, 4, 2, c1);
        strand(19, 0.4, 4, 1.6, c1);
        R(14, -2.2, 6, 0.8, light);
        break;
      case 'parted_glasses':
      case 'spiky_glasses':
        // Repartido no meio
        strand(11.6, 0.3, 6, 1.6, c1);
        strand(18.4, 0.3, 6, 1.6, c1);
        R(17.6, -3, 0.8, 4, dark);
        R(13, -2.2, 4, 0.8, light);
        R(19, -2.2, 4, 0.8, light);
        break;
      case 'sae_swept':
        // Penteado para trás com uma mecha caindo (Sae)
        R(11, -4.2, 13, 1.6, dark);
        R(11.5, -4, 12, 1.4, c1);
        strand(20, 0.4, 3, 3.4, c1);
        R(20.6, 2.6, 1.6, 1.2, c2);
        strand(12, 0.4, 7, 1, c1);
        R(13, -3.4, 8, 0.8, light);
        break;
      case 'loki_fade':
        // Degradê baixo com cachos curtos no topo (Loki)
        R(11, -4.4, 14, 2.2, dark);
        for (let i = 0; i < 6; i++) R(11.6 + i * 2.2, -4.2 + (i % 2) * 0.5, 1.6, 1.6, i % 2 ? c1 : this.shade(c1, 0.18));
        R(10.6, 0, 1.4, 4.6, dark);
        R(24, 0, 1.4, 4.6, dark);
        break;
      case 'hugo_wild':
        // Rosa, volumoso e jogado para trás com mechas soltas (Hugo)
        spike(10.5, 3, -0.6);
        spike(13.5, 4, -0.3, c2);
        spike(17, 4.5, 0.2);
        spike(20.5, 3.5, 0.5, c2);
        spike(23, 2.5, 0.8);
        strand(9.4, 1, 2.6, 7, c1);
        strand(24, 1, 2.6, 7, c1);
        strand(13, 0.4, 3, 2.4, c1);
        strand(19.5, 0.4, 3.5, 2.8, c2);
        R(15, -2.2, 6, 0.8, light);
        break;
      case 'buzz_tall':
      case 'monk_shaved':
      case 'tattoo_monk':
        // Bem curto, quase raspado
        R(12, -2.6, 12, 0.8, light);
        break;
      case 'short_sharp':
      case 'soft_side':
        strand(12, 0.4, 7, 1.4, c1);
        strand(19, 0.4, 5, 1, c1);
        R(17, 1.2, 2, 0.8, c2);
        R(14, -2.2, 6, 0.8, light);
        break;
      default:
        // Espetado de protagonista: pontas para cima + franja em três mechas
        spike(11, 3, -0.4);
        spike(14.5, 4.5, -0.1);
        spike(18, 4, 0.2);
        spike(21.5, 3, 0.5);
        strand(12, 0.4, 3, 2.4, c1);
        strand(15.6, 0.4, 2.8, 2.8, c1);
        strand(19.4, 0.4, 3, 2.2, c1);
        R(13, 1.6, 1.6, 1, c2);
        R(20, 1.4, 1.6, 1, c2);
        R(14, -2.2, 6, 0.8, light);
        R(15, -5, 1, 1.4, light);
        break;
    }
  }
};
