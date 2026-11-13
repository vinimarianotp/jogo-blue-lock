// ============================================================================
// KIT DAS CUTSCENES EM 3D (cenário 3D, personagens em 2D)
// Uma cutscene refeita em 3D se registra com:
//   CE.registerCine3D('tipo', {
//     phases, music, title, tags, subs, letterbox, grain, vignette,  // iguais à versão 2D
//     theme: 'worldcup_final',      // (opcional) cores do prédio/estádio dessa cena
//     scene(K, S) { ... },          // a cada quadro: câmera, atores, bola, peças
//     overlay(ctx, S, K) { ... }    // (opcional) 2D por cima: linhas de velocidade, clarão
//   });
// S = { W, H, t, phase, dur, p, f, top, bot, stageH } (igual ao kit 2D: 60 frames = 1 s)
// A legenda, as tarjas, o título, o PULAR e a música continuam do kit 2D (js/cine_kit.js).
// Sem 3D (aparelho sem WebGL2 ou GRÁFICO SIMPLES) toca a versão 2D antiga da mesma cena.
//
// K (tudo em ladrilhos do prédio; altura h em ladrilhos, 1 pessoa ≈ 0,9):
//   K.cam([x, h, y], [x, h, y], fov=50)      câmera: posição e ponto que ela olha
//   K.actor(quem, { x, y, z, ang | face: [x, y], anim, frame, view, left, k, alpha,
//            light: [r,g,b], dark, glow, kit, extra, shadow, opts, seat })
//            quem = 'you' | 'EGO' | 'ANRI' | id do personagem ('bachira'...) | charData
//            anim = 'idle' | 'run' | 'windup' | 'shoot' | 'rabona' | 'bicycle' | 'dive' | 'stun'
//                   | 'celebrate' | 'clap' | 'call_pass' | 'hurt' | 'fall' | 'jump'
//                   sentado: 'sit' (mãos no banco) | 'sit_down' (curvado, cabeça baixa)
//                            | 'sit_floor' (no chão, joelhos pra cima)
//                   ajoelhado: 'kneel' (os dois joelhos, tronco em pé) | 'kneel_one' (um
//                            joelho) | 'kneel_down' (abatido, mãos no chão, cabeça baixa)
//            kit = 'japan' | 'blueLock' | 'u20' | 'france' | 'suit' (CE.KITS)
//            seat = altura do assento (ladrilhos) para 'sit'/'sit_down': o boneco sobe até o
//                   calção encostar nele (z soma por cima). O chibi tem perna curta: assento
//                   até ~0,05 deixa o pé no chão (ator na beirada do banco, do lado da câmera).
//                   Banco alto do prédio (vestiário, tampo 0,26): o pé pendurado fica rente ao
//                   tampo e parece agachado em cima — use seat ~0,06 abaixo do tampo com o ator
//                   no MEIO do banco: o colo encosta no tampo e o banco esconde as pernas
//            ajoelhado/sentado no chão: z = 0 (o joelho/o quadril já encosta no chão)
//   K.headZ(ator) → z de um boneco em pé com a cabeça na altura da desse ator (sentado e
//            ajoelhado a cabeça desce ~0,08): para olho/rosto desenhado por cima no overlay
//   K.ball(x, y, z, { k })                   a bola (com sombra)
//   K.sprite(canvas|tex, { x, y, z, w, h, glow, alpha, light, dirty })  imagem em pé virada pra câmera
//   K.box({ x0, y0, x1, y1, z0, z1, color, top, img, em, alpha, light })  caixa
//   K.quad({ x, y, z, w, h, ang, color, img, em, alpha, dirty })  placa em pé virada para ang
//            (a imagem sai espelhada vista do lado de ang: para ler de frente use ang + Math.PI)
//   K.floor({ x0, y0, x1, y1, z, color, img, em, alpha })  placa deitada (chão, tapete, palco)
//   K.fog('#hex', densidade) · K.sky('#topo', '#horizonte', estrelas 0..1) · K.ambient('#hex')
//   K.expo(1.0)                              exposição (mais claro/escuro)
//   K.screen(x, h, y) → { x, y } no canvas da cena (use no overlay; dentro do scene é o quadro anterior)
//   K.seg(t, a, b), K.ease(x), K.easeIO(x), K.lerp(a, b, k), K.mix([..], [..], k), K.noise(t, seed)
//   K.at.<lugar>.<ponto> = [x, y]: pontos prontos do prédio (ver PLACES abaixo)
//   K.VOID = [86, 17]: área vazia fora do prédio (só céu/névoa) para montar cenários com peças
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  const Hub = window.Hub;
  if (!CE || !Hub || !Hub._3d) return;
  const X = Hub._3d;
  CE.CINE3D = CE.CINE3D || {};
  const ORIG = new Map(); // a versão 2D de cada cena (null = desenho antigo do motor)

  CE.registerCine3D = function (type, def) {
    this.CINE3D[type] = def;
    def.type = type;
  };

  // pontos prontos do prédio [x, y] (o 3D usa x, altura, y)
  const PLACES = {
    campo: { center: [53, 14.5], goalN: [53, 6.6], goalS: [53, 22.4], penN: [53, 8.5], penS: [53, 20.5], boxN: [53, 9.4], boxS: [53, 19.6], cornerNW: [45.7, 6.7], cornerSE: [60.3, 22.3], bench: [45.6, 10.2] },
    saguao: { center: [25, 13.5], screen: [25, 9.0], shop: [18.8, 10.4], sofas: [25, 15.1], door: [27.5, 20.6] },
    quarto: { center: [12.5, 25.4], bed: [9.6, 23.5], desk: [15.3, 28.3], door: [12.5, 22.2], lockers: [15.6, 23.9] },
    vestiario: { center: [39, 19.5], lockersN: [39, 17.6], door: [38.5, 17.2], board: [38.5, 22.6] },
    corredor: { center: [8.6, 19.5], end: [2.6, 19.5], door: [12.5, 20.6] },
    tunel: { center: [39.5, 14.5], toField: [43.6, 14.5], fromLobby: [34.4, 14.5] },
    academia: { center: [38.8, 9.2], treadmills: [37.4, 7.4] },
    refeitorio: { center: [12.2, 11.4], counter: [7.7, 8.0], tv: [4.2, 10.5] },
    armas: { center: [27.5, 29.6], roulette: [24.5, 29.6], tube: [30.4, 29.6] }
  };
  const VOID = [86, 17];

  // ---------------------------------------------------------------- tema por cena
  const THEMES = new Map();
  function themeForMap(mt) {
    if (THEMES.has(mt)) return THEMES.get(mt);
    const App = window.App;
    const g0 = App.getChapter;
    let th;
    try {
      const ch = (window.CAREER_CHAPTERS || []).find((c) => c.mapTheme === mt);
      App.getChapter = () => ch || { mapTheme: mt };
      th = Hub.themeFor(App.state);
    } finally {
      App.getChapter = g0;
    }
    THEMES.set(mt, th);
    return th;
  }
  const theme0 = Hub.theme;
  Hub.theme = function () {
    if (this.skTheme) return themeForMap(this.skTheme);
    return theme0.call(this);
  };

  // ---------------------------------------------------------------- utilidades
  const hex = (c, a = 1) => {
    if (Array.isArray(c)) return [c[0], c[1], c[2], c[3] ?? a];
    const [r, g, b] = Hub.rgbOf(c || '#ffffff');
    return [r / 255, g / 255, b / 255, a];
  };
  const pushQuad = (v, a, b, c, d, n, u0 = 0, u1 = 1, v0 = 0, v1 = 1) => {
    const P = (p, u, vv) => v.push(p[0], p[1], p[2], u, vv, n[0], n[1], n[2]);
    P(a, u0, v0);
    P(b, u1, v0);
    P(c, u1, v1);
    P(a, u0, v0);
    P(c, u1, v1);
    P(d, u0, v1);
  };

  function makeKit(def) {
    const cds = new Map();
    const slots = new Map();
    let ballTex = null;
    const K = {
      at: PLACES,
      VOID,
      seg: (t, a, b) => CE.cineSeg(t, a, b),
      ease: (x) => CE.cineEase(x),
      easeIO: (x) => CE.cineEaseInOut(x),
      lerp: (a, b, k) => a + (b - a) * k,
      mix: (a, b, k) => a.map((v, i) => v + (b[i] - v) * k),
      noise: (t, s) => CE.cineNoise(t, s),
      begin(S) {
        this.S = S;
        this.c = { sk: true, noMe: true, noDust: true, eye: [53, 1.4, 18], look: [53, 0.6, 12], fov: 50, actors: [], sprites: [], dyn: [] };
      },
      cam(eye, look, fov) {
        this.c.eye = eye;
        this.c.look = look;
        if (fov) this.c.fov = fov;
      },
      charData(who, o = {}) {
        const key = (typeof who === 'string' ? who : who.name || 'cd') + '|' + (o.kit || '') + '|' + JSON.stringify(o.extra || {});
        let cd = cds.get(key);
        if (cd) return cd;
        const kit = o.kit ? CE.KITS?.[o.kit] || {} : {};
        if (typeof who !== 'string') cd = Object.assign({}, who, kit, o.extra || {});
        else if (who === 'you' || who === 'VOCÊ') cd = CE.cineYou(Object.assign({}, kit, o.extra || {}));
        else if (who === 'EGO' || who === 'ego') cd = Object.assign({}, CE.getSpeakerCharData('JINPACHI EGO'), kit, o.extra || {});
        else if (who === 'ANRI' || who === 'anri') cd = Object.assign({}, CE.getSpeakerCharData('ANRI'), kit, o.extra || {});
        else cd = CE.cineChar(who, Object.assign({}, kit, o.extra || {}));
        cds.set(key, cd);
        return cd;
      },
      actor(who, o = {}) {
        const cd = this.charData(who, o);
        const key = (typeof who === 'string' ? who : cd.name || 'cd') + '#' + (o.id || '');
        if (!slots.has(key)) slots.set(key, 100 + slots.size);
        let ang = o.ang ?? 0;
        if (o.face) ang = Math.atan2(o.face[1] - o.y, o.face[0] - o.x);
        let z = o.z || 0;
        // sentado num banco: sobe até o calção encostar no assento (1 unidade da arte =
        // 2 px do boneco de 72 = 2·k/SPX ladrilhos). Sem o esqueleto novo fica em pé no chão
        if (o.seat !== undefined) {
          const u = window.PixelRenderer?.spriteSeatU?.(cd, o.anim || 'sit');
          if (u !== null && u !== undefined) z += o.seat - (u * 2 * (o.k || 0.9)) / X.C.SPX;
        }
        const a = { cd, x: o.x, y: o.y, z, ang, anim: o.anim || 'idle', frame: o.frame ?? this.S.f, view: o.view, left: o.left, k: o.k, alpha: o.alpha, light: o.light ? hex(o.light).slice(0, 3) : undefined, dark: o.dark, glow: o.glow, shadow: o.shadow, slot: slots.get(key), opts: o.opts };
        this.c.actors.push(a);
        return a;
      },
      // z de um boneco EM PÉ com a cabeça na altura da cabeça deste ator (sentado/ajoelhado
      // a cabeça desce): para os ajudantes de olho/rosto das cenas, que medem no boneco em pé
      headZ(a) {
        const PR = window.PixelRenderer;
        const u = PR && PR.spriteHeadDropU ? PR.spriteHeadDropU(a.cd, a.anim) : 0;
        return a.z - (u * 2 * (a.k || 0.9)) / X.C.SPX;
      },
      ball(x, y, z = 0, o = {}) {
        // a bola em pixel art (js/cine_art.js, 8 giros): a do mapa, de perto, parecia um "@"
        const px = CE.ART && CE.ART.ballPx && CE.ART.ballPx(Math.floor((x + y) * 9));
        if (px) {
          const s = 0.2 * ((o.k || 0.75) / 0.75) * 0.85;
          this.c.sprites.push({ src: px, x, y, z: Math.max(0, z - s * 0.15), w: s, h: s, shadow: z < 1.2 ? 0.1 : 0, light: o.light ? hex(o.light).slice(0, 3) : undefined, glow: o.glow });
          return;
        }
        if (!ballTex) ballTex = X.propTex('ball', () => Hub.P.ball(0, 0), Hub.theme());
        if (!ballTex) return;
        const k = o.k || 0.75;
        this.c.sprites.push({ src: ballTex, x, y, z, w: (ballTex.w / X.C.SPX) * k, h: (ballTex.h / X.C.SPX) * k, shadow: z < 1.2 ? 0.09 : 0, light: o.light ? hex(o.light).slice(0, 3) : undefined, glow: o.glow });
      },
      sprite(src, o = {}) {
        const w = o.w ?? (src.width || src.w) / X.C.SPX;
        const h = o.h ?? (src.height || src.h) / X.C.SPX;
        this.c.sprites.push({ src, x: o.x, y: o.y, z: o.z || 0, w, h, glow: o.glow, alpha: o.alpha ?? 1, shadow: o.shadow || 0, dirty: o.dirty, light: o.light ? hex(o.light).slice(0, 3) : undefined, foot: o.foot || 0 });
      },
      _push(v, o, n) {
        const col = hex(o.color || '#ffffff', o.alpha ?? 1);
        this.c.dyn.push({ verts: new Float32Array(v), col, src: o.img || null, dirty: o.dirty, em: !!o.em, light: o.light ? hex(o.light).slice(0, 3) : this.c.ambient || [1, 1, 1], n });
      },
      box(o) {
        const { x0, y0, x1, y1 } = o;
        const z0 = o.z0 || 0;
        const z1 = o.z1 ?? 1;
        const v = [];
        pushQuad(v, [x1, z1, y0], [x0, z1, y0], [x0, z0, y0], [x1, z0, y0], [0, 0, -1]);
        pushQuad(v, [x0, z1, y1], [x1, z1, y1], [x1, z0, y1], [x0, z0, y1], [0, 0, 1]);
        pushQuad(v, [x0, z1, y0], [x0, z1, y1], [x0, z0, y1], [x0, z0, y0], [-1, 0, 0]);
        pushQuad(v, [x1, z1, y1], [x1, z1, y0], [x1, z0, y0], [x1, z0, y1], [1, 0, 0]);
        this._push(v, o);
        const t = [];
        pushQuad(t, [x0, z1, y0], [x1, z1, y0], [x1, z1, y1], [x0, z1, y1], [0, 1, 0]);
        this._push(t, Object.assign({}, o, { color: o.top || o.color }));
      },
      quad(o) {
        const ang = o.ang ?? 0;
        const nx = Math.cos(ang);
        const ny = Math.sin(ang);
        const rx = -ny * (o.w / 2);
        const ry = nx * (o.w / 2);
        const z0 = o.z || 0;
        const z1 = z0 + o.h;
        const v = [];
        // u da esquerda para a direita olhando a placa de frente
        pushQuad(v, [o.x - rx, z1, o.y - ry], [o.x + rx, z1, o.y + ry], [o.x + rx, z0, o.y + ry], [o.x - rx, z0, o.y - ry], [nx, 0, ny]);
        this._push(v, o);
      },
      floor(o) {
        const z = o.z || 0.005;
        const v = [];
        pushQuad(v, [o.x0, z, o.y0], [o.x1, z, o.y0], [o.x1, z, o.y1], [o.x0, z, o.y1], [0, 1, 0]);
        this._push(v, o);
      },
      fog(c, k) {
        this.c.fog = hex(c).slice(0, 3);
        if (k !== undefined) this.c.fogK = k;
      },
      sky(top, hor, stars) {
        this.c.skyTop = hex(top).slice(0, 3);
        this.c.skyHor = hex(hor).slice(0, 3);
        if (stars !== undefined) this.c.stars = stars * 0.012;
      },
      ambient(c) {
        this.c.ambient = hex(c).slice(0, 3);
      },
      expo(v) {
        this.c.expo = v;
      },
      screen(x, h, y) {
        const m = this.VP;
        if (!m) return null;
        const cx = m[0] * x + m[4] * h + m[8] * y + m[12];
        const cy = m[1] * x + m[5] * h + m[9] * y + m[13];
        const cw = m[3] * x + m[7] * h + m[11] * y + m[15];
        if (cw < 0.05) return null;
        return { x: ((cx / cw + 1) / 2) * this.S.W, y: ((1 - cy / cw) / 2) * this.S.H };
      }
    };
    return K;
  }

  // ---------------------------------------------------------------- desenhar um quadro
  const KITS = new Map();
  function render3D(def, ctx, S) {
    let K = KITS.get(def);
    if (!K || K.run !== CE._cineRun) {
      K = makeKit(def);
      K.run = CE._cineRun;
      KITS.set(def, K);
    }
    K.begin(S);
    const camA0 = Hub.camA;
    def.scene.call(CE, K, S);
    const c = K.c;
    // (o laço do mapa não desenha durante a cena; o motor desenha este quadro agora)
    const save = { px: Hub.px, py: Hub.py, area: Hub.area, t: Hub.t, camA: camA0 };
    // os bonecos em pé viram para Hub.camA: aqui ele aponta para onde a câmera da cena olha
    const dx = c.look[0] - c.eye[0];
    const dy = c.look[2] - c.eye[2];
    if (Math.abs(dx) + Math.abs(dy) > 1e-4) Hub.camA = Math.atan2(dy, dx);
    // boneco colado na câmera (por cima do ombro) vira uma mancha de pixels enorme: ele vai
    // para trás na mesma direção (mesmo lado do quadro) até caber. De costas: no máximo 85%
    // da altura da imagem; de frente: 150% (só corta o exagero, os closes continuam)
    const fl = Math.hypot(dx, dy);
    if (fl > 1e-4) {
      const fx = dx / fl;
      const fy = dy / fl;
      const tanH = Math.tan(((c.fov || 50) * Math.PI) / 360);
      c.actors.forEach((a) => {
        const ax = a.x - c.eye[0];
        const ay = a.y - c.eye[2];
        const depth = ax * fx + ay * fy;
        if (depth <= 0.05) return;
        const back = Math.cos(a.ang) * fx + Math.sin(a.ang) * fy > 0.3;
        const need = (a.k || 0.9) / (2 * tanH * (back ? 0.85 : 1.5));
        if (depth < need) {
          a.x = c.eye[0] + (ax * need) / depth;
          a.y = c.eye[2] + (ay * need) / depth;
        }
      });
    }
    Hub.sk = c;
    Hub.skTheme = def.theme || null;
    const lx = Math.max(0.5, Math.min(X.C.MW - 0.5, c.look[0]));
    const ly = Math.max(0.5, Math.min(X.C.MH - 0.5, c.look[2]));
    Hub.px = lx;
    Hub.py = ly;
    Hub.area = X.World.areaAt(lx, ly) || Hub.area;
    Hub.t = S.f;
    // as bolas e os cones soltos do mapa (treino) confundiam com a bola do lance: saem do quadro
    const W = X.World;
    const spr0 = W.sprites;
    const key0 = W.key;
    if (Array.isArray(spr0)) W.sprites = spr0.filter((s) => s.key !== 'ball' && s.key !== 'cone');
    let cv = null;
    try {
      // (a placa de vídeo que falha no meio — contexto perdido, erro do WebGL — devolve
      // null aqui e a cena troca para a versão 2D: fall2D)
      try {
        cv = Hub.GL3D.renderNow();
      } catch (e) {
        // (no teste das cenas — cineFreeze — o erro aparece, como antes)
        if (CE._c3Sync) throw e;
        cv = null;
        CE._c3Fail = String((e && e.message) || e);
      }
    } finally {
      Hub.sk = null;
      Hub.skTheme = null;
      Object.assign(Hub, save);
      // (se o desenho trocou o tema, o prédio montou uma lista nova: fica a nova)
      if (W.key === key0) W.sprites = spr0;
    }
    if (!cv) return false;
    ctx.drawImage(cv, 0, 0, S.W, S.H);
    K.VP = Hub.GL3D.VP;
    if (def.overlay) def.overlay.call(CE, ctx, S, K);
    return true;
  }

  // durante a cena, o motor pega câmera e atores daqui
  const cc0 = Hub.cineCam;
  Hub.cineCam = function () {
    if (this.sk) return this.sk;
    return cc0.call(this);
  };
  const npcs0 = Hub.npcs;
  Hub.npcs = function () {
    if (this.sk) return this.sk.actors;
    return npcs0.call(this);
  };

  // dá para usar 3D agora?
  // a placa de vídeo já falhou no meio de uma cena nesta sessão: as próximas tocam em 2D
  let BROKEN = false;
  function can3d() {
    const G = Hub.GL3D;
    if (BROKEN || !G || G.ok === false || Hub.forceSW || !Hub.cv || !window.App?.state?.profile) return false;
    if (G.ok === undefined && G.renderNow) {
      // liga a placa de vídeo agora (se não der, fica a versão 2D)
      try {
        G.renderNow();
      } catch (e) {}
      if (G.ok !== true) return false;
    }
    return true;
  }
  CE.cine3dAvailable = can3d;
  // A placa de vídeo falhou no meio da cena (o dono já viu isso no celular): a cena recomeça
  // na versão 2D antiga (registerCine) se ela existir — inclusive as cenas de roteiro — e,
  // sem 2D, é pulada (a história segue). As próximas cenas da sessão já tocam em 2D.
  function fall2D(type, ctx, S) {
    BROKEN = true;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, S.W, S.H);
    // (no teste das cenas o quadro só fica preto: quem testa vê o erro guardado)
    if (CE._c3Sync || !CE.sakugaActive || CE.sakugaType !== type) return;
    const o = ORIG.get(type);
    if (o) {
      CE.CINE[type] = o;
      CE._cineRun = (CE._cineRun || 0) + 1; // (as legendas e o tempo de leitura da 2D)
      CE.sakugaFrame = 0;
      CE.sakugaPhase = 0;
      CE.sakugaPhaseTimer = 0;
      if (o.music) CE.SAKUGA_MUSIC[type] = o.music;
    } else {
      // (fora do laço do quadro: o onComplete da cena leva a história adiante)
      setTimeout(() => CE.sakugaActive && CE.sakugaType === type && CE.finishSakuga(), 0);
    }
  }
  CE.cine3dBroken = () => BROKEN;
  CE.cine3dReset = () => {
    BROKEN = false;
  };
  // na hora de tocar: com 3D entra a versão 3D; sem, a 2D original
  const play0 = CE.playActionSakuga;
  CE.playActionSakuga = function (type, onComplete) {
    const d3 = this.CINE3D[type];
    if (d3) {
      if (!ORIG.has(type)) ORIG.set(type, this.CINE[type] && !this.CINE[type]._is3d ? this.CINE[type] : null);
      if (can3d() && !this.force2D) {
        const proxy = Object.assign({}, d3, {
          _is3d: true,
          draw(ctx, S) {
            // 1º quadro de cada vez que a cena toca: preto (a tela troca na hora do clique).
            // Montar os bonecos e, se a cena usa o cenário de outra fase, o prédio desse
            // tema fica para o quadro seguinte (antes a tela congelava no diálogo)
            if (CE._c3First !== CE._cineRun) {
              CE._c3First = CE._cineRun;
              ctx.fillStyle = '#000';
              ctx.fillRect(0, 0, S.W, S.H);
              loadStep(d3, type, false);
              return;
            }
            // cenário de outra fase ainda não montado: "carregando" (o relógio da cena para)
            if (loadStep(d3, type, true)) return;
            if (d3.theme && WARM.length) warmNow(d3.theme);
            // (erro no roteiro/desenho da cena continua aparecendo como erro; só a falha da
            // placa de vídeo — render3D devolve false — troca a cena para a 2D)
            if (!render3D(d3, ctx, S)) fall2D(type, ctx, S);
          }
        });
        delete proxy.scene;
        this.CINE[type] = proxy;
      } else {
        const o = ORIG.get(type);
        if (o) this.CINE[type] = o;
        else delete this.CINE[type];
      }
    }
    return play0.apply(this, arguments);
  };

  // ---------------------------------------------------------------- prédio adiantado
  // Cena de cinema que usa o cenário de outra fase: o prédio dessa fase é montado aos poucos
  // antes dela (no mapa, parado no capítulo, e durante a conversa da história), em vez de
  // 1-3 s de tela preta no celular quando a cena começa. Fica guardado como os outros
  // prédios (World.prewarmGen); no máximo 2 por vez (o cache guarda 2).
  const WARM = [];
  let warmRaf = 0;
  function warmStep() {
    warmRaf = 0;
    const t0 = performance.now();
    // (durante uma cena de cinema e na partida não disputa o quadro; no mapa vai mais devagar)
    const budget = CE.active ? 12 : 6;
    if (!CE.sakugaActive && !window.MatchEngine?.active) {
      while (WARM.length && performance.now() - t0 < budget) {
        const w = WARM[0];
        let r;
        try {
          r = w.g.next();
        } catch (e) {
          r = { done: true };
        }
        if (r.done) WARM.shift();
      }
    }
    if (WARM.length) warmRaf = requestAnimationFrame(warmStep);
  }
  function prewarm(mt) {
    const W = X.World;
    if (!mt || !W.map || !W.prewarmGen || !can3d()) return;
    const th = themeForMap(mt);
    if (W.ready(th) || WARM.some((w) => w.mt === mt)) return;
    // o prédio (CPU) e depois as texturas dele na placa de vídeo
    const job = function* () {
      yield* W.prewarmGen(th);
      const s = W.snapOf && W.snapOf(th);
      if (s && Hub.GL3D && Hub.GL3D.prewarmGen) yield* Hub.GL3D.prewarmGen(s);
    };
    WARM.push({ mt, th, g: job() });
    if (!warmRaf) warmRaf = requestAnimationFrame(warmStep);
  }
  // a cena chegou antes de o prédio ficar pronto: termina de uma vez (já tem parte feita)
  function warmNow(mt) {
    const i = WARM.findIndex((w) => w.mt === mt);
    if (i < 0) return;
    const w = WARM.splice(i, 1)[0];
    try {
      while (!w.g.next().done);
    } catch (e) {}
  }

  // ---------------------------------------------------------------- carregando
  // Cena com o cenário de outra fase que ainda não foi montado (o 🎬 REVER, ou uma cena
  // fora do roteiro adiantado): antes o 1º quadro montava o prédio e os bonecos de uma vez
  // e a tela ficava parada de 5 a 14 s. Agora a cena espera num "carregando" (o relógio
  // dela não anda), monta em fatias (o que já estava adiantado continua de onde parou) e
  // começa do início quando fica pronta. O teste das cenas (cineFreeze) monta na hora.
  let LOAD = null; // { run, type, g, done, el, t0 }
  function* loadGen(d3, type) {
    const W = X.World;
    const th = d3.theme ? themeForMap(d3.theme) : null;
    if (th && !W.ready(th)) {
      const i = WARM.findIndex((w) => w.mt === d3.theme);
      if (i >= 0) yield* WARM.splice(i, 1)[0].g;
      else {
        yield* W.prewarmGen(th);
        const s = W.snapOf && W.snapOf(th);
        if (s && Hub.GL3D && Hub.GL3D.prewarmGen) yield* Hub.GL3D.prewarmGen(s);
      }
    }
    // os bonecos da cena (o ensaio de js/cine3d_kit.js), já que está carregando mesmo
    const k = WARM.findIndex((w) => w.mt === '#' + type);
    if (k >= 0) yield* WARM.splice(k, 1)[0].g;
    else if (!ACTED_DONE.has(type)) {
      ACTED.add(type);
      yield* actorsGen(type);
    }
  }
  function loadEl(on) {
    let el = document.getElementById('c3-load');
    if (!on) {
      if (el) el.classList.remove('on');
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'c3-load';
      el.className = 'c3-load';
      el.innerHTML = '<b>CARREGANDO A CENA</b><i class="c3-load-bar"><i></i></i>';
    }
    // (dentro da tela da cena, por cima do canvas)
    const host = document.getElementById('sakuga-anime-overlay') || document.body;
    if (el.parentNode !== host) host.appendChild(el);
    el.classList.add('on');
  }
  // true = ainda carregando (não desenha a cena neste quadro).
  // Cena de roteiro (js/cine_roteiro.js): os bonecos dela são ensaiados ANTES do 1º quadro
  // (mesmo com o prédio pronto), nos pontos que o roteiro aponta (def.ensaio)
  function loadStep(d3, type, run) {
    if (CE._c3Sync) return false;
    if (!LOAD || LOAD.run !== CE._cineRun || LOAD.type !== type) {
      const W = X.World;
      const needWorld = !!d3.theme && !!W.map && !!W.prewarmGen && !W.ready(themeForMap(d3.theme));
      const needActors = !!d3._roteiro && !ACTED_DONE.has(type);
      if (!needWorld && !needActors) return false;
      LOAD = { run: CE._cineRun, type, g: loadGen(d3, type), done: false, t0: performance.now() };
      // (o aviso "CARREGANDO" só aparece se demorar: carga curta não pisca nada na tela)
      if (needWorld) loadEl(true);
    }
    if (LOAD.done) return false;
    if (!run) return true;
    if (!LOAD.shown && performance.now() - LOAD.t0 > 350) {
      LOAD.shown = true;
      loadEl(true);
    }
    // Pedaços grandes (~0,1 s): enquanto carrega a tela da cena não é redesenhada (ver o
    // drawSakuga abaixo) e o aviso é HTML, com a barra andando sozinha (CSS). Com pedaços de
    // 30 ms o resto do quadro comia o tempo: no celular emulado levava 3x mais.
    const t0 = performance.now();
    try {
      while (performance.now() - t0 < 100) {
        if (LOAD.g.next().done) {
          LOAD.done = true;
          break;
        }
      }
    } catch (e) {
      LOAD.done = true; // (falhou: a cena monta o que faltar no quadro dela, como antes)
    }
    if (!LOAD.done) return true;
    LOAD.ms = Math.round(performance.now() - LOAD.t0);
    loadEl(false);
    return false;
  }
  // carregando: a tela da cena fica como está (preta, com o título) e o quadro inteiro vai
  // para a montagem — o grão, a vinheta e as tarjas não são refeitos a cada quadro
  const draw0 = CE.drawSakuga;
  CE.drawSakuga = function () {
    if (LOAD && !LOAD.done && LOAD.run === this._cineRun && !this._c3Sync && this.sakugaType === LOAD.type) {
      const d3 = this.CINE3D[LOAD.type];
      if (d3 && loadStep(d3, LOAD.type, true)) return undefined;
    }
    return draw0.apply(this, arguments);
  };
  // o relógio da cena não anda enquanto ela carrega (começa do início quando fica pronta)
  const upd0 = CE.updateSakuga;
  CE.updateSakuga = function () {
    if (LOAD && !LOAD.done && LOAD.run === this._cineRun && this.sakugaActive) return;
    // (nem antes do 1º quadro, que é quem decide se precisa carregar: o relógio começa no 0)
    if (this.sakugaActive && this.CINE?.[this.sakugaType]?._is3d && CE._c3First !== this._cineRun) return;
    return upd0.apply(this, arguments);
  };
  // pulou/fechou a cena no meio do carregando: tira o aviso (o que já montou fica guardado)
  const fin0 = CE.finishSakuga;
  CE.finishSakuga = function () {
    if (LOAD && !LOAD.done) {
      LOAD.done = true;
      loadEl(false);
      // (o resto continua por trás, devagar, como os outros prédios adiantados)
      WARM.push({ mt: '#load', g: LOAD.g });
      if (!warmRaf) warmRaf = requestAnimationFrame(warmStep);
    }
    return fin0.apply(this, arguments);
  };
  CE.cine3dLoad = () => LOAD; // (para os testes e as medições)
  // Os bonecos da cena: no 1º quadro de cada plano cada um era desenhado pela primeira vez
  // (rosto, cabelo, pose: ~30 ms cada no celular; a convocação tem 15). Ensaia a cena sem
  // mostrar (só o roteiro, 1º quadro de cada plano) e deixa esses quadros prontos no cache.
  const ACTED = new Set();
  const ACTED_DONE = new Set(); // (ensaio terminado; o ACTED marca quando entra na fila)
  function* actorsGen(type) {
    const def = CE.CINE3D[type];
    const PR = window.PixelRenderer;
    if (!def || typeof def.scene !== 'function' || !PR) return;
    const K = makeKit(def);
    const cv = document.createElement('canvas');
    cv.width = cv.height = 72;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const seen = new Set();
    const W = 1280;
    const H = 720;
    const top = Math.round(H * (def.letterbox ?? 0.12));
    // quadros ensaiados: o 1º de cada plano ou, na cena de roteiro, os pontos que ele aponta
    // (início/meio/fim de cada plano e os passos de quem anda)
    const starts = [];
    def.phases.reduce((a, d, i) => ((starts[i] = a), a + (d || 120)), 0);
    const pts = Array.isArray(def.ensaio) && def.ensaio.length ? def.ensaio : def.phases.map((d, i) => [i, 1]);
    for (const [phase, t] of pts) {
      const dur = def.phases[phase] || 120;
      const S = { W, H, t, phase, dur, p: t / dur, f: starts[phase] + t, top, bot: H - top, stageH: H - 2 * top };
      try {
        K.begin(S);
        def.scene.call(CE, K, S);
      } catch (e) {
        continue;
      }
      const c = K.c;
      const camA = Math.atan2(c.look[2] - c.eye[2], c.look[0] - c.eye[0]);
      const rX = -Math.sin(camA);
      const rY = Math.cos(camA);
      // (mesma conta de lado/frente/costas do desenho: js/hub3d_gl.js)
      for (const n of c.actors.slice()) {
        if (!n.cd) continue;
        let rel = Math.atan2(c.eye[2] - n.y, c.eye[0] - n.x) - n.ang;
        rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        const view = n.view || (Math.abs(rel) < 0.75 ? 'front' : Math.abs(rel) > 2.4 ? 'back' : 'side');
        const left = n.left !== undefined ? !!n.left : Math.cos(n.ang) * rX + Math.sin(n.ang) * rY < 0;
        const frame = n.frame !== undefined ? n.frame : n.anim === 'run' ? Math.floor(S.f * 0.5) : Math.floor(S.f / 4) * 4;
        const k = [n.cd.id || n.cd.name, n.cd.jerseyPrimary, n.cd.outfit, view, left ? 1 : 0, n.anim, frame].join('|');
        if (seen.has(k)) continue;
        seen.add(k);
        try {
          // (pelo cache de texturas dos bonecos do mapa: o quadro já fica lido e pronto para a
          // placa; o mesmo desenho do drawCharacterSprite num canvas 72x72)
          const G = Hub.GL3D;
          const up = G && G.ok === true && !Hub.forceSW && G.charUp ? G.charUp : undefined;
          if (X.charTex) X.charTex(9999, n.cd, Object.assign({ view, left, animState: n.anim, frame }, n.opts || {}), up);
          else {
            g.clearRect(0, 0, 72, 72);
            PR.drawCharacterSprite(g, n.cd, 72, 72, Object.assign({ facing: 'front', accessories: [], shirtNumber: n.cd.number || 10 }, { view, left, animState: n.anim, frame }, n.opts || {}));
          }
        } catch (e) {}
        yield;
      }
      yield;
    }
    ACTED_DONE.add(type);
  }
  // as cenas 3D citadas nestas falas (com as respostas das escolhas)
  function cinesIn(lines, out) {
    const look = (l) => {
      if (!l || typeof l !== 'object') return;
      if (typeof l.cinematic === 'string' && CE.CINE3D[l.cinematic] && !out.includes(l.cinematic)) out.push(l.cinematic);
      (l.choices || []).forEach((c) => (c.reply || []).forEach(look));
    };
    (Array.isArray(lines) ? lines : []).forEach(look);
    return out;
  }
  // adianta as cenas que vêm aí: o prédio (se for de outra fase; no máximo 2) e os bonecos
  const warmList = (types) => {
    const W = X.World;
    if (!W.map || !can3d()) return;
    let builds = 0;
    types.forEach((type) => {
      const d = CE.CINE3D[type];
      if (!d) return;
      if (d.theme && builds < 2 && !W.ready(themeForMap(d.theme))) {
        builds++;
        prewarm(d.theme);
      }
      if (!ACTED.has(type) && !WARM.some((w) => w.mt === '#' + type)) {
        ACTED.add(type);
        WARM.push({ mt: '#' + type, g: actorsGen(type) });
        if (!warmRaf) warmRaf = requestAnimationFrame(warmStep);
      }
    });
  };
  CE.cine3dPrewarm = prewarm;
  // Só as peças de um cenário montado com o kit (sem tocar cena nenhuma): o diretor das
  // conversas (js/cine3d.js) usa para filmar a conversa no mesmo lugar de uma cena
  let GK = null;
  CE.cine3dSetGeom = function (build) {
    if (!GK) GK = makeKit({});
    GK.begin({ W: 1280, H: 720, t: 0, phase: 0, dur: 1, p: 0, f: Hub.t || 0, top: 0, bot: 720, stageH: 720 });
    build(GK);
    return GK.c;
  };
  const playVn0 = CE.play;
  CE.play = function (config) {
    try {
      warmList(cinesIn(config && config.lines, []));
    } catch (e) {}
    return playVn0.apply(this, arguments);
  };
  // as cenas que a história deste capítulo ainda vai tocar (abertura, interlúdios, pós-jogo)
  let chKey = null;
  let chCines = [];
  function chapterCines() {
    const App = window.App;
    const ch = App && App.getChapter && App.getChapter();
    if (!ch) return [];
    const key = ch.id + '|' + (ch.cupIdx || 0);
    if (key === chKey) return chCines;
    const out = [];
    try {
      const S = window.STORY_INTERLUDES || {};
      [].concat(ch.interlude || [], ch.cupStartInterlude || []).forEach((id) => S[id] && cinesIn(S[id].lines, out));
      cinesIn((window.CHAPTER_DIALOGUES || {})[ch.id], out);
      cinesIn(ch.introCutscene, out);
      (ch.cupRounds || []).forEach((r) => r && Object.keys(r).forEach((k) => cinesIn(r[k], out)));
      cinesIn(ch.postMatchCutscene, out);
      cinesIn(ch.lossCutscene, out);
    } catch (e) {}
    chKey = key;
    chCines = out;
    return out;
  }
  // de vez em quando, no mapa parado (sem conversa, cena ou partida): adianta
  setInterval(() => {
    try {
      if (document.hidden || CE.active || CE.sakugaActive || window.MatchEngine?.active) return;
      if (!Hub.live || !Hub.live() || Hub.vn3d) return;
      warmList(chapterCines());
    } catch (e) {}
  }, 2500);

  // ---------------------------------------------------------------- para os testes
  // Mostra a cena parada no plano/quadro pedido (sem tocar o resto): CE.cineFreeze('tipo', plano, t)
  CE.cineFreeze = function (type, phase, t) {
    if (!this.sakugaActive || this.sakugaType !== type) {
      this.playActionSakuga(type, null);
    }
    this.sakugaToken = {}; // para o laço da cena
    this.sakugaPhase = phase;
    this.sakugaPhaseTimer = t;
    let f = t;
    const ph = this.getSakugaPhaseDurations();
    for (let i = 0; i < phase; i++) f += ph[i] || 0;
    this.sakugaFrame = f;
    // (aqui o cenário monta na hora, sem o "carregando": o teste quer o quadro de verdade)
    this._c3Sync = true;
    try {
      this.drawSakuga();
    } finally {
      this._c3Sync = false;
    }
  };
  CE.CINE3D_PLACES = PLACES;
})();
