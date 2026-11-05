// ============================================================================
// PONTE DOS BONECOS NOVOS (SPRITES 2.0)
//
// O jogo inteiro (partida, cutscenes, perfil, coleção) desenha os bonecos pelo
// PixelRenderer.drawCharacterSprite. Aqui ele passa a usar o esqueleto novo
// (sprite_rig.js + data_animations.js), traduzindo as opções antigas:
//   animState 'idle' | 'run' | 'windup' | 'shoot' | 'rabona' | 'bicycle' | 'dive' |
//             'slide' | 'call_pass' | 'stun'  (+ novos: 'fall' | 'hurt' |
//             'celebrate' | 'jump' | 'kick' | 'tackle')
//   facing 'front' | 'back' (+ novo: 'side'), flipX = olhando pra esquerda
//   tint, showAura/auraColor, accessories, shirtNumber, frame
// Opções novas (a partida usa): view, left, animTime (ticks desde que o estado
// começou: chute/carrinho/queda andam quadro a quadro), animIndex (quadro fixo), expr.
//
// Volta para os bonecos antigos: ?sprites=old na URL (ou localStorage
// bl_sprites = 'old'). O desenho antigo continua em drawCharacterSpriteOld.
// ============================================================================
(function () {
  const PR = window.PixelRenderer;
  const RIG = PR && PR.SpriteRig;
  const A = window.SPRITE_ANIMS;
  if (!PR || !RIG || !A) return;

  let off = false;
  try {
    off = /[?&]sprites=old\b/.test(location.search) || localStorage.getItem('bl_sprites') === 'old';
  } catch (e) {}
  PR.spritesV2 = !off;
  RIG.cropFrames = true;

  const legacy = PR.drawCharacterSprite;
  PR.drawCharacterSpriteOld = legacy;

  const ticks = (an) => an.frames.reduce((s, f) => s + (f.d || 6), 0);
  // quadro da animação no tempo t (ticks), só entre os quadros 'from' e 'to'
  function frameAt(an, t, from, to, loop) {
    const fr = an.frames;
    const last = Math.min(fr.length - 1, to);
    let total = 0;
    for (let i = from; i <= last; i++) total += fr[i].d || 6;
    let tt = loop ? ((t % total) + total) % total : Math.min(Math.max(0, t), total - 1);
    for (let i = from; i <= last; i++) {
      tt -= fr[i].d || 6;
      if (tt < 0) return i;
    }
    return last;
  }

  // estado antigo → [animação, quadro fixo (sem animTime), do quadro, até o quadro, em loop?]
  const MAP = {
    idle: ['idle', -1, 0, 99, true],
    run: ['run', -1, 0, 99, true],
    windup: ['kick', 2, 0, 2, false],
    shoot: ['kick', 3, 3, 99, false],
    kick: ['kick', 3, 0, 99, false],
    rabona: ['rabona', 2, 0, 99, false],
    bicycle: ['bicycle', 2, 0, 99, false],
    dive: ['dive', 2, 0, 99, false],
    slide: ['tackle', 2, 0, 99, false],
    tackle: ['tackle', 2, 0, 99, false],
    call_pass: ['call', -1, 0, 99, true],
    stun: ['hurt', -1, 0, 99, true],
    hurt: ['hurt', -1, 0, 99, true],
    fall: ['fall', 6, 0, 99, false],
    celebrate: ['celebrate', -1, 0, 99, true],
    jump: ['jump', 3, 0, 99, false]
  };

  // a partida desenha a bola dela: tira a bola que vem nas poses
  const NOBALL = new WeakMap();
  function noBall(p) {
    if (!p.ball && !p.ballAtToe && !p.ballFx) return p;
    let q = NOBALL.get(p);
    if (!q) {
      q = Object.assign({}, p);
      delete q.ball;
      delete q.ballAtToe;
      delete q.ballFx;
      NOBALL.set(p, q);
    }
    return q;
  }

  // Monta pose + opções do esqueleto a partir das opções do jogo
  function resolve(cd, o) {
    let st = o.animState || (o.moving ? 'run' : o.rabonaPose ? 'rabona' : 'idle');
    if (!MAP[st]) st = 'idle';
    const [name, still, from, to, loop] = MAP[st];
    const an = A[name] || A.idle;
    let idx;
    if (o.animIndex !== undefined) idx = Math.max(0, Math.min(an.frames.length - 1, o.animIndex | 0));
    else if (loop) idx = frameAt(an, o.frame || 0, from, to, true);
    else if (o.animTime !== undefined) idx = frameAt(an, o.animTime, from, to, false);
    else idx = still;
    const pose = noBall(an.frames[idx]);
    // direção: 'side' = 3/4 (esquerda nativa, sem espelhar o cabelo/braçadeira)
    let view = o.view || (o.facing === 'back' ? 'back' : o.facing === 'side' ? 'side' : null);
    if (!view) view = an.view === 'side' ? 'side' : 'front';
    if (st === 'run' && o.facing === 'back' && !o.view) view = 'back';
    const left = o.left !== undefined ? !!o.left : !!o.flipX;
    // De frente/de costas o flipX também vale nas poses que não são simétricas
    // (mergulho cai pro outro lado, braço levantado troca de lado). Pedir a bola:
    // sem flipX o braço levantado fica à DIREITA da tela, como no boneco antigo
    // (é o lado em que as cenas desenham a taça).
    let fl = false;
    let mirror = false;
    if (view !== 'side' && name !== 'idle' && name !== 'run') {
      fl = left;
      mirror = name === 'call' ? !left : left;
    }
    // piscada de vez em quando (só onde o tempo anda de verdade, ex.: a partida;
    // retrato parado com frame fixo ficaria de olho fechado pra sempre)
    const fr = o.frame || 0;
    const blink = !!o.blinkable && name === 'idle' && view !== 'back' && (fr + (cd.number || 0) * 37) % 220 < 5;
    return {
      pose,
      name,
      opts: {
        view,
        left: view === 'side' ? left : fl,
        mirror,
        expr: o.expr,
        accessories: o.accessories || [],
        shirtNumber: o.shirtNumber !== undefined ? o.shirtNumber : cd.number,
        blink,
        showAura: !!o.showAura && !o.tint,
        auraColor: o.auraColor,
        frame: fr
      }
    };
  }

  // Orçamento: no máximo ~6 ms montando quadro novo a cada ~16 ms. Passou disso,
  // repete o último quadro bom daquele boneco (e monta o novo no próximo quadro).
  let winT = 0;
  let used = 0;
  const LAST = new Map();
  // (só a partida usa o orçamento — 'budget: true'; tela de menu e cutscene desenham
  // poucas vezes e sempre montam o quadro certo)
  function getFrame(cd, pose, opts, lk, priority, budget) {
    const hit = RIG.peek(cd, pose, opts);
    if (hit || priority || !budget) return RIG.frame(cd, pose, opts);
    const now = performance.now();
    if (now - winT > 16) {
      winT = now;
      used = 0;
    }
    const fb = LAST.get(lk) || LAST.get(lk.split('@')[0]) || RIG.peek(cd, A.idle.frames[0], opts) || RIG.peek(cd, A.idle.frames[0], Object.assign({}, opts, { view: 'side', left: !opts.left }));
    // estourou o orçamento: repete o último quadro bom; boneco que ainda não tem
    // nenhum quadro sai no desenho antigo só neste quadro (null)
    if (used > 6) return fb || null;
    const t0 = performance.now();
    const f = RIG.frame(cd, pose, opts);
    used += performance.now() - t0;
    return f;
  }

  PR.drawCharacterSprite = function (ctx, cd, w, h, options = {}) {
    if (!PR.spritesV2 || options.legacy || !cd) return legacy.call(PR, ctx, cd, w, h, options);
    let r;
    try {
      r = resolve(cd, options);
    } catch (e) {
      return legacy.call(PR, ctx, cd, w, h, options);
    }
    // aura (labaredas atrás do boneco) continua a do desenho antigo
    if (options.showAura && !options.tint) {
      PR.drawCharacterBody(ctx, cd, w, h, Object.assign({}, options, { auraOnly: true }));
    }
    // "último quadro bom" é por aparência completa (dois bonecos sem id não se misturam)
    const id = RIG.lookKey(cd) + '|' + r.opts.accessories.join(',') + '|' + r.opts.shirtNumber;
    const lk = id + '@' + r.name + '|' + r.opts.view + '|' + (r.opts.left ? 1 : 0);
    // priority: o seu jogador nunca espera (o chute sai no quadro certo)
    const f = getFrame(cd, r.pose, r.opts, lk, !!options.priority, !!options.budget);
    if (!f) return legacy.call(PR, ctx, cd, w, h, Object.assign({}, options, { showAura: false }));
    LAST.set(lk, f);
    LAST.set(id, f);
    if (LAST.size > 600) LAST.clear();
    RIG.put(ctx, options.tint ? tinted(f, options.tint) : f, w, h);
  };

  // silhueta inteira numa cor (rastro/fantasma do drible), guardada por quadro e cor
  const TINT = new WeakMap();
  function tinted(f, color) {
    let m = TINT.get(f);
    if (!m) TINT.set(f, (m = new Map()));
    let tf = m.get(color);
    if (tf) return tf;
    const cv = document.createElement('canvas');
    cv.width = f.cv.width;
    cv.height = f.cv.height;
    const g = cv.getContext('2d');
    g.drawImage(f.cv, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, cv.width, cv.height);
    tf = Object.assign({}, f, { cv });
    if (m.size > 6) m.clear();
    m.set(color, tf);
    return tf;
  }

  // Pré-monta (em pedaços, sem travar) os quadros mais usados de uma lista de
  // bonecos: parado e correndo nos 4 lados. A partida chama no começo do jogo.
  let warmQ = [];
  let warmOn = false;
  function pump() {
    const t0 = performance.now();
    while (warmQ.length && performance.now() - t0 < 8) {
      const [cd, pose, opts] = warmQ.shift();
      if (!RIG.peek(cd, pose, opts)) RIG.frame(cd, pose, opts);
    }
    if (warmQ.length) setTimeout(pump, 16);
    else warmOn = false;
  }
  PR.prewarmSprites = function (list) {
    if (!PR.spritesV2) return;
    // primeiro o básico de todo mundo, depois as ações de quem tem 'actions' (você)
    const later = [];
    list.forEach(({ cd, accessories, number, actions, left: faceLeft }) => {
      if (!cd) return;
      // mesmas opções que o desenho usa (senão a chave do cache não bate)
      const base = { expr: undefined, accessories: accessories || [], shirtNumber: number !== undefined ? number : cd.number, blink: false, showAura: false, frame: 0 };
      // já na hora (antes do 1º quadro): o boneco parado, virado pro lado em que ele
      // começa — assim ninguém aparece no desenho antigo no começo do jogo
      RIG.frame(cd, A.idle.frames[0], Object.assign({}, base, { view: 'side', left: !!faceLeft }));
      [false, true].forEach((left) => {
        const o = Object.assign({}, base, { view: 'side', left });
        A.run.frames.forEach((p) => warmQ.push([cd, noBall(p), o]));
        A.idle.frames.forEach((p) => warmQ.push([cd, p, o]));
        if (actions) ['kick', 'tackle', 'rabona', 'bicycle'].forEach((n) => A[n].frames.forEach((p) => later.push([cd, noBall(p), o])));
      });
      if (actions) {
        [[false, true], [true, false]].forEach(([l, m]) => A.call.frames.forEach((p) => later.push([cd, p, Object.assign({}, base, { view: 'front', left: l, mirror: m })])));
      }
    });
    warmQ.push(...later);
    if (!warmOn) {
      warmOn = true;
      setTimeout(pump, 0);
    }
  };

  PR.spriteAnimTicks = (name) => (A[name] ? ticks(A[name]) : 0);
})();
