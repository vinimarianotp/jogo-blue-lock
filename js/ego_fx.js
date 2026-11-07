// ============================================================================
// MOMENTOS DE ANIME NA PARTIDA (inspirados na linguagem visual de Blue Lock)
//
//  • Emblema do ego: no Fluxo, o símbolo do jogador aparece atrás dele (peça de
//    quebra-cabeça, coroa, monstro, caveira, rosa...), em pixel art com contorno
//    escuro e brilho na cor do Fluxo. Ao despertar ele entra grande e encolhe.
//  • Faixa dos olhos: antes do chute especial / transe, uma faixa atravessa a tela com
//    os olhos do jogador ampliados (no Fluxo: olho escuro com a íris acesa e o rastro).
//  • Campo escurece: no especial o estádio afunda num azul-noite, com linhas de foco
//    (as de mangá) apontando para o jogador; os jogadores e a bola continuam acesos.
//
// Tudo que é desenho fica pronto em canvas guardados (emblema por ícone/cor/tamanho,
// brilho por cor, recorte dos olhos por aparência): por quadro são só drawImage.
// ============================================================================
(function () {
  const ME = window.MatchEngine;
  const PR = window.PixelRenderer;
  if (!ME || !PR) return;

  // ---------------------------------------------------------------- ícones 13 x 13
  // '#' cor do Fluxo (com luz em cima/esquerda e sombra embaixo/direita automáticas),
  // '+' branco, 'o' escuro (furo/detalhe), 'g' verde (folha), '.' vazio
  const ICONS = {
    puzzle: ['....###......', '...#####.....', '...#####.....', '.#########...', '.#########...', '.##########..', '...##########', '...##########', '...##########', '.##########..', '.#########...', '.#########...', '.............'],
    crown: ['.............', '.............', '.#....#....#.', '.##..###..##.', '.##..###..##.', '.###.###.###.', '.###########.', '.###########.', '.##+##+##+##.', '.###########.', '.###########.', '.............', '.............'],
    monster: ['.#.........#.', '.##.......##.', '..##.....##..', '..#########..', '.###########.', '.##++###++##.', '.##+o###+o##.', '.###########.', '.##ooooooo##.', '.##o+o+o+o##.', '..#########..', '...#######...', '.............'],
    skull: ['...#######...', '..#########..', '.###########.', '.###########.', '.##ooo#ooo##.', '.##ooo#ooo##.', '.###########.', '..####o####..', '..#########..', '...#o#o#o#...', '...#######...', '.............', '.............'],
    rose: ['....#####....', '...###o###...', '..##o###o##..', '..#o##o##o#..', '..##o###o##..', '...###o###...', '....#####....', '......g......', '..gg..g......', '...gggg..gg..', '......gggg...', '......g......', '......g......'],
    bolt: ['.......####..', '......####...', '.....####....', '....####.....', '...########..', '..########...', '......####...', '.....####....', '....####.....', '...###.......', '..##.........', '.#...........', '.............'],
    drop: ['......#......', '.....###.....', '.....###.....', '....#####....', '...#######...', '..#########..', '..#+#######..', '.##+########.', '.###+#######.', '.###########.', '..#########..', '...#######...', '....#####....'],
    sword: ['...........++', '..........+++', '.........+++.', '........+++..', '.......+++...', '......+++....', '.....+++.....', '..#.+++......', '...###.......', '..####.......', '.##..#.......', '##...........', '#............'],
    snow: ['......+......', '.+...+++...+.', '..+...+...+..', '...+..+..+...', '....+.+.+....', '.....###.....', '+++++###+++++', '.....###.....', '....+.+.+....', '...+..+..+...', '..+...+...+..', '.+...+++...+.', '......+......'],
    snake: ['.....#####...', '....##o####..', '...###...##..', '...##........', '...###.......', '....#####....', '......####...', '........###..', '.........##..', '........###..', '..#######....', '.######......', '.##..........'],
    knight: ['....##.......', '...####......', '..######.....', '.##o#####....', '.#########...', '.####.####...', '.##...####...', '.....#####...', '....######...', '...#######...', '...#######...', '..#########..', '.###########.'],
    shield: ['.###########.', '.#####+#####.', '.#####+#####.', '.##+++++++##.', '.#####+#####.', '.#####+#####.', '.#####+#####.', '..####+####..', '..####+####..', '...###+###...', '....##+##....', '.....###.....', '......#......'],
    star: ['......#......', '......#......', '.#...###...#.', '..#.#####.#..', '...#######...', '..####+####..', '######+######', '..####+####..', '...#######...', '..#.#####.#..', '.#...###...#.', '......#......', '......#......'],
    diamond: ['.............', '.............', '...#######...', '..##+###+##..', '.###########.', '..#########..', '...#######...', '....#####....', '.....###.....', '......#......', '.............', '.............', '.............'],
    arrow: ['.......######', '........#####', '.........####', '........#####', '.......###.##', '......###...#', '.....###.....', '....###......', '...###.......', '#.###........', '####.........', '.##..........', '#.#..........'],
    spiral: ['...#######...', '..##.....##..', '.##.......##.', '.#...###...#.', '##..##.##..##', '#..##...#...#', '#..#..#.#...#', '#..#.##.#..##', '#..#....#..#.', '##..####..##.', '.##......##..', '..########...', '.............'],
    fang: ['.............', '.###########.', '#############', '#############', '##+++###+++##', '.#+++#.#+++#.', '..+++...+++..', '..+++...+++..', '...+.....+...', '.............', '.............', '.............', '.............'],
    gear: ['.....###.....', '..#..###..#..', '.###########.', '..#########..', '.####ooo####.', '####ooooo####', '####ooooo####', '####ooooo####', '.####ooo####.', '..#########..', '.###########.', '..#..###..#..', '.....###.....'],
    eye: ['.............', '.............', '.............', '....#####....', '..##+++++##..', '.#+++###+++#.', '#+++##o##+++#', '.#+++###+++#.', '..##+++++##..', '....#####....', '.............', '.............', '.............']
  };
  // Fluxo → símbolo do ego (o personagem de cada um)
  const FLOW_ICON = {
    fl_comum_foco: 'eye', fl_comum_pulmao: 'spiral', fl_comum_borracha: 'shield',
    fl_incomum_adrenalina: 'bolt', fl_incomum_maestro: 'snow', fl_incomum_capitao: 'snake',
    fl_raro_cacador: 'eye', fl_raro_muralha: 'shield', fl_raro_ginga: 'monster', fl_raro_camaleao: 'diamond',
    fl_epico_rua: 'sword', fl_epico_preguica: 'skull', fl_epico_xadrez: 'knight', fl_epico_passe: 'arrow',
    fl_lendario_rei: 'crown', fl_lendario_bigbang: 'star', fl_lendario_kaiser: 'rose', fl_lendario_snuffy: 'gear',
    fl_mitico_destruidor: 'drop', fl_mitico_godspeed: 'bolt', fl_mitico_lorenzo: 'fang', fl_mitico_sae: 'spiral', fl_mitico_olhar_ego: 'eye',
    fl_wc_quatro_egos: 'puzzle', fl_wc_metavision: 'puzzle', fl_wc_noa: 'gear',
    evo_metavision: 'puzzle', evo_predator_eye: 'eye', evo_protagonism: 'crown'
  };
  const iconForFlow = (flow) => {
    if (!flow) return 'puzzle';
    const ids = String(flow.id || '').split('+');
    // Fluxos combinados: o símbolo do mais forte (o que deu a cor)
    const db = window.FLOWS_DB || [];
    const best = ids.find((id) => (db.find((f) => f.id === id) || {}).color === flow.color) || ids[0];
    return FLOW_ICON[best] || 'puzzle';
  };

  const OUT = '#0b0e1a';
  const hexRgb = (h) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
    const n = m ? parseInt(m[1], 16) : 0x38bdf8;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const mix = (c, t, k) => {
    const a = hexRgb(c);
    const b = hexRgb(t);
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
  };

  // emblema pronto: cell = pixels por quadradinho (inteiro, nunca borra)
  const EMB = new Map();
  function emblem(icon, color, cell) {
    const key = `${icon}|${color}|${cell}`;
    let cv = EMB.get(key);
    if (cv) return cv;
    const rows = ICONS[icon] || ICONS.puzzle;
    const N = 13;
    const G = N + 2; // +1 de contorno em volta
    const at = (x, y) => (y >= 0 && y < N && x >= 0 && x < N ? rows[y][x] || '.' : '.');
    const solid = (x, y) => at(x, y) !== '.';
    cv = document.createElement('canvas');
    cv.width = G * cell;
    cv.height = G * cell;
    const g = cv.getContext('2d');
    const light = mix(color, '#ffffff', 0.45);
    const dark = mix(color, '#000000', 0.35);
    for (let y = -1; y <= N; y++) {
      for (let x = -1; x <= N; x++) {
        const ch = at(x, y);
        let c = null;
        if (ch === '.') {
          // contorno: vizinho (8 lados) cheio
          for (let dy = -1; dy <= 1 && !c; dy++) for (let dx = -1; dx <= 1 && !c; dx++) if (solid(x + dx, y + dy)) c = OUT;
        } else if (ch === '+') c = '#ffffff';
        else if (ch === 'o') c = OUT;
        else if (ch === 'g') c = '#22c55e';
        else {
          // luz de cima/esquerda, sombra de baixo/direita (relevo de pixel art)
          const up = !solid(x, y - 1) || !solid(x - 1, y);
          const dn = !solid(x, y + 1) || !solid(x + 1, y);
          c = up && !dn ? light : dn && !up ? dark : color;
        }
        if (!c) continue;
        g.fillStyle = c;
        g.fillRect((x + 1) * cell, (y + 1) * cell, cell, cell);
      }
    }
    if (EMB.size > 60) EMB.clear();
    EMB.set(key, cv);
    return cv;
  }

  // brilho redondo e suave numa cor (desenhado esticado)
  const GLOW = new Map();
  function glow(color) {
    let cv = GLOW.get(color);
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const [r, gg, b] = hexRgb(color);
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${r},${gg},${b},0.75)`);
    gr.addColorStop(0.45, `rgba(${r},${gg},${b},0.3)`);
    gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    if (GLOW.size > 24) GLOW.clear();
    GLOW.set(color, cv);
    return cv;
  }

  // Recorte dos olhos do boneco (de frente, determinado, com o olho do Fluxo aceso):
  // das sobrancelhas até embaixo dos olhos, com o rastro de luz do lado
  const EYES = new Map();
  function eyeCrop(cd, color, accessories) {
    const RIG = PR.SpriteRig;
    const A = window.SPRITE_ANIMS;
    if (!RIG || !A || !cd) return null;
    const key = `${RIG.lookKey(cd)}|${color}|${(accessories || []).join(',')}`;
    let e = EYES.get(key);
    if (e) return e;
    // (sem o rastro do olho do boneco: em close ele vira um bloco solto; a faixa desenha
    // o rastro dela, liso, saindo de cada íris)
    const f = RIG.frame(cd, A.idle.frames[0], { view: 'front', left: false, mirror: false, expr: 'determined', accessories: accessories || [], shirtNumber: cd.number, blink: false, showAura: true, auraColor: color, noTrail: true, frame: 0 });
    if (!f) return null;
    // linha dos olhos no boneco chibi (estilo D): 10,1 do corpo antigo + 2,5 (medido:
    // íris nas linhas 12–13,5 do quadro)
    const eyeU = 12.6;
    const u0 = 9.5;
    const u1 = 26.5;
    // (medido no seu boneco: olho das linhas 55 a 59 do quadro, íris 56–58; o recorte
    // pega da sobrancelha até logo abaixo do olho, com o olho no meio)
    const v0 = eyeU - 1.9;
    const v1 = eyeU + 2.1;
    const sx = Math.round((u0 - RIG.X0) * RIG.PX - (f.ox || 0));
    const sy = Math.round((v0 - RIG.Y0) * RIG.PX - (f.oy || 0));
    const sw = Math.round((u1 - u0) * RIG.PX);
    const sh = Math.round((v1 - v0) * RIG.PX);
    // copia o pedaço (o quadro inteiro pode sair do cache depois)
    const cv = document.createElement('canvas');
    cv.width = sw;
    cv.height = sh;
    cv.getContext('2d').drawImage(f.cv, sx, sy, sw, sh, 0, 0, sw, sh);
    // onde ficam as íris dentro do recorte (0..1): para o rastro de luz da faixa
    cv.irisL = (14.9 - u0) / (u1 - u0);
    cv.irisR = (21.1 - u0) / (u1 - u0);
    cv.irisY = (12.75 - v0) / (v1 - v0);
    e = cv;
    if (EYES.size > 12) EYES.clear();
    EYES.set(key, e);
    return e;
  }

  // número "aleatório" fixo (as linhas de foco piscam trocando a semente)
  const hash = (a, b) => {
    let h = (a * 374761393 + b * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  window.EgoFx = { ICONS, FLOW_ICON, iconForFlow, emblem, glow, eyeCrop };

  Object.assign(ME, {
    // Começa um momento especial. opts: { eye (faixa dos olhos), emblem (emblema
    // entra grande), dur (ms do campo escuro) }
    startSpecialMoment(color, opts = {}) {
      if (this.replay) return;
      const p = this.playerEntity;
      this.special = {
        start: performance.now(),
        dur: opts.dur || 1300,
        color: color || '#38bdf8',
        eye: !!opts.eye,
        emblem: !!opts.emblem,
        cd: p && p.charData,
        acc: (this.playerState && this.playerState.equippedAccessories) || [],
        // quem fez o lance (no Modo Dupla pode ser o parceiro)
        ent: p
      };
      // pré-monta o recorte dos olhos agora (não no meio da faixa)
      if (this.special.eye && this.special.cd) eyeCrop(this.special.cd, this.special.color, this.special.acc);
    },

    // 1) Campo escurecendo (antes dos jogadores: eles ficam acesos por cima)
    drawSpecialDarken(ctx, W, H) {
      const s = this.special;
      if (!s || this.replay) return;
      const t = performance.now() - s.start;
      if (t > Math.max(s.dur, 1100)) {
        this.special = null;
        return;
      }
      if (t > s.dur) return;
      const a = t < 120 ? t / 120 : t > s.dur - 380 ? Math.max(0, (s.dur - t) / 380) : 1;
      const p = s.ent || this.playerEntity;
      ctx.save();
      ctx.globalAlpha = a * 0.66;
      ctx.fillStyle = '#0b0e1a';
      ctx.fillRect(-20, -20, W + 40, H + 40);
      if (p) {
        const pr = this.project3D(p.x, p.y, 34);
        const gp = this.project3D(p.x, p.y, 0);
        // linhas de foco (cunhas finas do lado de fora, apontando para o jogador)
        const seed = Math.floor(t / 60);
        const R1 = Math.max(W, H) * 1.3;
        ctx.globalAlpha = a * 0.24;
        ctx.fillStyle = '#f2f6ff';
        ctx.beginPath();
        for (let i = 0; i < 52; i++) {
          const ang = (i / 52) * Math.PI * 2 + (hash(i, seed) - 0.5) * 0.1;
          const r0 = 110 + hash(i + 99, seed) * 220;
          const half = 0.006 + hash(i + 7, seed) * 0.014;
          ctx.moveTo(pr.sx + Math.cos(ang) * r0, pr.sy + Math.sin(ang) * r0);
          ctx.lineTo(pr.sx + Math.cos(ang - half) * R1, pr.sy + Math.sin(ang - half) * R1);
          ctx.lineTo(pr.sx + Math.cos(ang + half) * R1, pr.sy + Math.sin(ang + half) * R1);
          ctx.closePath();
        }
        ctx.fill();
        // luz no chão em volta do jogador (o "holofote" na cor do especial)
        const gl = glow(s.color);
        const rr = 150 * gp.scale;
        ctx.globalAlpha = a * 0.85;
        ctx.drawImage(gl, gp.sx - rr, gp.groundY - rr * 0.45, rr * 2, rr * 0.9);
      }
      ctx.restore();
    },

    // 2) Emblema do ego. No DESPERTAR (campo escuro) ele entra gigante atrás de você e
    //    some junto com o escuro; no resto do Fluxo fica um brilho no chão embaixo de
    //    você e o símbolo pequeno em cima da cabeça (drawEgoMarker), no lugar da seta —
    //    gigante atrás o tempo todo escondia o boneco (virava um bloco colorido)
    egoColorIcon() {
      const s = this.special;
      const flow = this.flowFx || (this.playerState && this.playerState.equippedFlow);
      return { color: (flow && flow.color) || (s && s.color) || '#00f5d4', icon: iconForFlow(flow) };
    },
    drawEgoEmblem(ctx, ent, proj, size) {
      if (!ent.isPlayer || this.replay) return;
      const s = this.special;
      const flowOn = this.flowState && this.flowState.active && this.flowFx;
      const t = s && s.emblem ? performance.now() - s.start : Infinity;
      const popping = t < s?.dur;
      if (!flowOn && !popping) return;
      const { color, icon } = this.egoColorIcon();
      ctx.save();
      // brilho no chão (o jogador "aceso" no Fluxo)
      const gp = this.project3D(ent.x, ent.y, 0);
      const gl = glow(color);
      const rr = 46 * gp.scale;
      ctx.globalAlpha = 0.55 + 0.15 * Math.sin((this.animClock || 0) * 0.1);
      ctx.drawImage(gl, gp.sx - rr, gp.groundY - rr * 0.4, rr * 2, rr * 0.8);
      if (popping) {
        // entra 2,7x maior e assenta em 1,7x o boneco; some com o escuro
        const e = Math.min(1, t / 520);
        const k = 1 + 1.7 * (1 - e) * (1 - e);
        const fade = t > s.dur - 380 ? Math.max(0, (s.dur - t) / 380) : 1;
        const alpha = Math.min(0.95, 0.35 + e * 0.75) * fade;
        const top = proj.sy - size + 6;
        const cy = top + size * 0.32;
        const cell = Math.max(2, Math.round((size * 1.7 * k) / 15));
        const em = emblem(icon, color, cell);
        const R = em.width * 0.85;
        ctx.globalAlpha = alpha * 0.8;
        ctx.drawImage(gl, proj.sx - R, cy - R, R * 2, R * 2);
        ctx.globalAlpha = alpha;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(em, Math.round(proj.sx - em.width / 2), Math.round(cy - em.height / 2));
      }
      ctx.restore();
    },
    // símbolo do ego pequeno em cima da cabeça no Fluxo (no lugar da seta do "VOCÊ").
    // Devolve true se desenhou (aí a seta não é desenhada)
    drawEgoMarker(ctx, ent, proj, tagY) {
      if (!ent.isPlayer || this.replay || !(this.flowState && this.flowState.active && this.flowFx)) return false;
      const { color, icon } = this.egoColorIcon();
      const cell = proj.scale > 1.05 ? 3 : 2;
      const em = emblem(icon, color, cell);
      const bob = Math.round(Math.sin((this.animClock || 0) * 0.12) * 2);
      const cy = tagY - 12 - em.height / 2 + bob;
      const gl = glow(color);
      const R = em.width * 0.9;
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.drawImage(gl, proj.sx - R, cy - R, R * 2, R * 2);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(em, Math.round(proj.sx - em.width / 2), Math.round(cy - em.height / 2));
      ctx.restore();
      return true;
    },

    // 3) Faixa dos olhos (por cima do campo, embaixo do HUD)
    drawEyeCutIn(ctx, W, H) {
      const s = this.special;
      if (!s || !s.eye || this.replay || !s.cd) return;
      const IN = 150;
      const HOLD = 620;
      const OUT = 170;
      const t = performance.now() - s.start;
      if (t > IN + HOLD + OUT) return;
      const eyes = eyeCrop(s.cd, s.color, s.acc);
      if (!eyes) return;
      const bh = Math.round(Math.min(H * 0.16, 150));
      const cy = Math.round(H * 0.3);
      const sk = bh * 0.32;
      let h = bh;
      let x1 = W + sk;
      if (t < IN) {
        const e = t / IN;
        x1 = (W + sk * 2) * (1 - (1 - e) * (1 - e));
      } else if (t > IN + HOLD) {
        h = bh * Math.max(0, 1 - (t - IN - HOLD) / OUT);
      }
      if (h < 1) return;
      const y0 = cy - h / 2;
      const y1 = cy + h / 2;
      ctx.save();
      // a faixa (paralelogramo inclinado), bordas na cor do especial
      ctx.beginPath();
      ctx.moveTo(-sk, y0);
      ctx.lineTo(x1, y0);
      ctx.lineTo(x1 - sk, y1);
      ctx.lineTo(-sk * 2, y1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(11,14,26,0.95)';
      ctx.fill();
      ctx.save();
      ctx.clip();
      // linhas de velocidade correndo para a esquerda
      ctx.fillStyle = s.color;
      for (let i = 0; i < 18; i++) {
        const ly = y0 + hash(i, 3) * h;
        const len = 80 + hash(i, 5) * 260;
        const span = W + len + 200;
        const lx = W - ((hash(i, 9) * span + t * (1.6 + hash(i, 11) * 1.4)) % span);
        ctx.globalAlpha = 0.25 + hash(i, 13) * 0.35;
        ctx.fillRect(lx, ly, len, 1 + Math.floor(hash(i, 17) * 3));
      }
      // os olhos ampliados (pixel inteiro, sem borrar), andando devagar
      ctx.globalAlpha = 1;
      const sc = Math.max(2, Math.floor((bh * 0.98) / eyes.height));
      const ew = eyes.width * sc;
      const eh = eyes.height * sc;
      const drift = (1 - t / (IN + HOLD + OUT)) * 26;
      const ex = Math.round(W / 2 - ew / 2 + drift);
      const ey = Math.round(cy - eh / 2);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(eyes, ex, ey, ew, eh);
      // rastro de luz saindo das íris (o "olho aceso" do anime): cunha na cor do
      // especial com miolo branco, para fora de cada olho, subindo de leve
      const grow = Math.min(1, t / 260);
      [[eyes.irisL, -1], [eyes.irisR, 1]].forEach(([fx, dir]) => {
        const x0 = ex + fx * ew + dir * sc * 2.2;
        const y0 = ey + eyes.irisY * eh;
        const len = W * 0.34 * grow;
        const hw = sc * 1.1;
        const wedge = (half, rise) => {
          ctx.beginPath();
          ctx.moveTo(x0, y0 - half);
          ctx.lineTo(x0 + dir * len, y0 - rise - half * 0.15);
          ctx.lineTo(x0 + dir * len, y0 - rise + half * 0.15);
          ctx.lineTo(x0, y0 + half);
          ctx.closePath();
          ctx.fill();
        };
        ctx.fillStyle = s.color;
        ctx.globalAlpha = 0.35;
        wedge(hw * 2.2, len * 0.12);
        ctx.globalAlpha = 0.95;
        wedge(hw, len * 0.12);
        ctx.fillStyle = '#ffffff';
        wedge(hw * 0.38, len * 0.12);
      });
      ctx.globalAlpha = 1;
      // clarão branco quando a faixa entra
      if (t < 160) {
        ctx.globalAlpha = 0.85 * (1 - t / 160);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-sk * 2, y0, W + sk * 4, h);
      }
      ctx.restore();
      // bordas: cor forte + fio branco
      ctx.globalAlpha = 1;
      ctx.lineWidth = 4;
      ctx.strokeStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(-sk, y0);
      ctx.lineTo(x1, y0);
      ctx.moveTo(-sk * 2, y1);
      ctx.lineTo(x1 - sk, y1);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#f2f6ff';
      ctx.beginPath();
      ctx.moveTo(-sk, y0 + 4);
      ctx.lineTo(x1, y0 + 4);
      ctx.moveTo(-sk * 2, y1 - 4);
      ctx.lineTo(x1 - sk, y1 - 4);
      ctx.stroke();
      ctx.restore();
    }
  });
})();
