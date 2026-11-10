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
//            light: [r,g,b], dark, glow, kit, extra, shadow, opts })
//            quem = 'you' | 'EGO' | 'ANRI' | id do personagem ('bachira'...) | charData
//            anim = 'idle' | 'run' | 'windup' | 'shoot' | 'rabona' | 'bicycle' | 'dive' | 'stun'
//            kit = 'japan' | 'blueLock' | 'u20' | 'france' | 'suit' (CE.KITS)
//   K.ball(x, y, z, { k })                   a bola (com sombra)
//   K.sprite(canvas|tex, { x, y, z, w, h, glow, alpha, light, dirty })  imagem em pé virada pra câmera
//   K.box({ x0, y0, x1, y1, z0, z1, color, top, img, em, alpha, light })  caixa
//   K.quad({ x, y, z, w, h, ang, color, img, em, alpha, dirty })  placa em pé virada para ang
//   K.floor({ x0, y0, x1, y1, z, color, img, em, alpha })  placa deitada (chão, tapete, palco)
//   K.fog('#hex', densidade) · K.sky('#topo', '#horizonte', estrelas 0..1) · K.ambient('#hex')
//   K.expo(1.0)                              exposição (mais claro/escuro)
//   K.screen(x, h, y) → { x, y } no canvas da cena (para o overlay)
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
        const a = { cd, x: o.x, y: o.y, z: o.z || 0, ang, anim: o.anim || 'idle', frame: o.frame ?? this.S.f, view: o.view, left: o.left, k: o.k, alpha: o.alpha, light: o.light ? hex(o.light).slice(0, 3) : undefined, dark: o.dark, glow: o.glow, shadow: o.shadow, slot: slots.get(key), opts: o.opts };
        this.c.actors.push(a);
        return a;
      },
      ball(x, y, z = 0, o = {}) {
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
    def.scene.call(CE, K, S);
    const c = K.c;
    // (o laço do mapa não desenha durante a cena; o motor desenha este quadro agora)
    const save = { px: Hub.px, py: Hub.py, area: Hub.area, t: Hub.t };
    Hub.sk = c;
    Hub.skTheme = def.theme || null;
    const lx = Math.max(0.5, Math.min(X.C.MW - 0.5, c.look[0]));
    const ly = Math.max(0.5, Math.min(X.C.MH - 0.5, c.look[2]));
    Hub.px = lx;
    Hub.py = ly;
    Hub.area = X.World.areaAt(lx, ly) || Hub.area;
    Hub.t = S.f;
    let cv = null;
    try {
      cv = Hub.GL3D.renderNow();
    } finally {
      Hub.sk = null;
      Hub.skTheme = null;
      Object.assign(Hub, save);
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
  function can3d() {
    const G = Hub.GL3D;
    if (!G || G.ok === false || Hub.forceSW || !Hub.cv || !window.App?.state?.profile) return false;
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
            if (!render3D(d3, ctx, S)) {
              // a placa de vídeo falhou no meio: volta para a 2D (se existir)
              const o = ORIG.get(type);
              if (o && o.draw) o.draw.call(this, ctx, S);
            }
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
    this.drawSakuga();
  };
  CE.CINE3D_PLACES = PLACES;
})();
