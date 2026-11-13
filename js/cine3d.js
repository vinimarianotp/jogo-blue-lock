// ============================================================================
// CENA EM 3D (teste): cinema dentro do prédio, com os personagens em 2D
// Mesmo motor do mapa (js/hub3d_gl.js): a câmera segue um roteiro de tomadas
// (abre, chega perto, por cima do ombro, reação), com faixas pretas de cinema,
// nome de quem fala e o texto aparecendo letra por letra. Durante a cena você
// não anda; ao terminar (ou tocar/apertar para pular), tudo volta ao normal.
// Teste: Hub.cine3dTest()  (Ego fala no telão do saguão)
// ============================================================================
(function () {
  const Hub = window.Hub;
  if (!Hub || !Hub._3d) return;
  const X = Hub._3d;
  const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

  let box = null;
  function ui() {
    if (box) return box;
    box = document.createElement('div');
    box.className = 'cine3d';
    box.innerHTML = '<i class="c3-bar c3-top"></i><i class="c3-bar c3-bot"></i><div class="c3-cap"></div><div class="c3-say"><b></b><p></p></div><div class="c3-skip">TOCAR / ESPAÇO: PULAR</div>';
    document.body.appendChild(box);
    const skip = (e) => {
      if (!Hub.cine) return;
      if (e.type === 'keydown' && !(e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) return;
      e.preventDefault?.();
      e.stopPropagation?.();
      next();
    };
    box.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip, true);
    return box;
  }
  // pular: termina a fala que está aparecendo; se já terminou, vai para a próxima tomada
  function next() {
    const c = Hub.cine;
    if (!c) return;
    const s = c.shots[c.i];
    const el = (performance.now() - c.t0) / 1000;
    const typed = s.text ? Math.min(s.text.length, el * 38) : 0;
    if (s.text && typed < s.text.length) c.t0 -= ((s.text.length - typed) / 38) * 1000;
    else c.t0 -= Math.max(0, (s.dur - el) * 1000);
  }

  // roteiro: [{ dur, eye: [a, b], look: [a, b], fov, speaker, text, cap, meView, actors? }]
  // (posições: [x, altura, y] em ladrilhos do prédio)
  Hub.cine3d = function (shots, actors, done) {
    ui();
    const save = { px: this.px, py: this.py, ang: this.ang, camA: this.camA, npcs: this.cineNpcs };
    this.cine = { shots, i: 0, t0: performance.now(), done, save };
    this.cineNpcs = (actors || []).map((a) => Object.assign({ cd: X.charCd(a.id), anim: 'idle', z: 0 }, a)).filter((a) => a.cd);
    if (actors && actors.me) {
      this.px = actors.me[0];
      this.py = actors.me[1];
    }
    document.documentElement.classList.add('hub-cine-on');
    box.classList.add('on');
  };
  Hub.cineCam = function () {
    const c = this.cine;
    if (!c) return null;
    let s = c.shots[c.i];
    let el = (performance.now() - c.t0) / 1000;
    if (c.freezeAt !== undefined) el = Math.min(c.freezeAt, s.dur - 0.01); // (para tirar foto de uma tomada)
    while (s && el >= s.dur) {
      c.i++;
      c.t0 += s.dur * 1000;
      el -= s.dur;
      s = c.shots[c.i];
    }
    if (!s) {
      end();
      return null;
    }
    const k = ease(el / s.dur);
    // texto: cartão do lugar, nome de quem fala e a fala letra por letra
    const cap = box.querySelector('.c3-cap');
    const capTxt = s.cap || '';
    if (cap.textContent !== capTxt) {
      cap.textContent = capTxt;
      cap.classList.remove('show');
      void cap.offsetWidth;
      if (capTxt) cap.classList.add('show');
    }
    const say = box.querySelector('.c3-say');
    say.style.display = s.text ? '' : 'none';
    if (s.text) {
      const who = s.speaker || '';
      if (say.firstChild.textContent !== who) say.firstChild.textContent = who;
      say.style.setProperty('--c3', s.color || 'var(--hub-acc, #22d3ee)');
      const n = Math.min(s.text.length, Math.floor(el * 38));
      const t = s.text.slice(0, n);
      if (say.lastChild.textContent !== t) say.lastChild.textContent = t;
    }
    // quem está em cena olha para onde a tomada pede
    if (s.face) Object.entries(s.face).forEach(([id, ang]) => this.cineNpcs.forEach((a) => a.id === id && (a.ang = ang)));
    return { eye: mix(s.eye[0], s.eye[1], k), look: mix(s.look[0], s.look[1], k), fov: s.fov, meView: s.meView, meLeft: s.meLeft };
  };
  function end() {
    const c = Hub.cine;
    if (!c) return;
    Hub.cine = null;
    Hub.px = c.save.px;
    Hub.py = c.save.py;
    Hub.ang = c.save.ang;
    Hub.camA = c.save.camA;
    Hub.cineNpcs = c.save.npcs || null;
    Hub._back = undefined;
    document.documentElement.classList.remove('hub-cine-on');
    box.classList.remove('on');
    if (c.done) c.done();
  }
  Hub.cine3dEnd = end;
  // durante a cena: os atores no lugar dos companheiros e ninguém anda
  const npcs0 = Hub.npcs;
  Hub.npcs = function () {
    return this.cine && this.cineNpcs ? this.cineNpcs : npcs0.call(this);
  };
  const canAct0 = Hub.canAct;
  Hub.canAct = function () {
    return !this.cine && canAct0.call(this);
  };

  // ---------------------------------------------------------------- cena de teste
  Hub.cine3dTest = function () {
    const ch = window.App?.getChapter?.();
    const mates = (ch?.teammateIds || []).filter((id) => (window.BLUE_LOCK_CHARACTERS || []).some((c) => c.id === id));
    const [a, b, c] = mates.length >= 3 ? mates : ['bachira', 'kunigami', 'chigiri'];
    const N = -Math.PI / 2; // todos olhando para o telão (norte)
    const actors = [
      { id: a, x: 23.8, y: 12.35, ang: N },
      { id: b, x: 26.2, y: 12.35, ang: N },
      { id: c, x: 25.65, y: 12.95, ang: N }
    ];
    actors.me = [25.0, 12.2];
    const ego = { speaker: 'JINPACHI EGO', color: '#22d3ee' };
    const shots = [
      // 1) abre: o saguão inteiro, a câmera entrando devagar
      { dur: 3.6, eye: [[25, 1.5, 20.4], [25, 1.38, 17.6]], look: [[25, 0.95, 9.3], [25, 0.95, 9.3]], cap: 'BLUE LOCK • SAGUÃO • 23:40' },
      // 2) o telão: o Ego fala
      Object.assign({ dur: 4.6, eye: [[24.6, 1.05, 11.75], [25.3, 1.02, 11.5]], look: [[25, 0.9, 9.0], [25.05, 0.9, 9.0]], fov: 60, text: 'Escutem, seus diamantes brutos. Amanhã começa a próxima seleção.' }, ego),
      // 3) por cima do seu ombro: você em primeiro plano, o Ego lá no fundo
      Object.assign({ dur: 4.4, eye: [[26.7, 1.5, 15.3], [26.45, 1.45, 15.0]], look: [[24.75, 0.55, 10.0], [24.8, 0.55, 10.0]], fov: 52, text: 'Só um de vocês vai virar o melhor atacante do mundo. O resto... volta para casa.' }, ego),
      // 4) reação: a câmera do lado do telão, vocês de frente
      { dur: 4.4, eye: [[25.0, 1.05, 9.45], [25.0, 1.0, 9.85]], look: [[25.0, 0.5, 12.6], [25.0, 0.5, 12.6]], fov: 58, meView: 'front', speaker: 'VOCÊ', color: '#facc15', text: 'Então esse um vai ser eu.' },
      // 5) fecha: a câmera sobe e se afasta
      { dur: 3.0, eye: [[25.0, 1.1, 10.4], [25.0, 1.6, 9.4]], look: [[25.0, 0.6, 12.6], [25.0, 0.4, 14.5]], fov: 52, meView: 'front', cap: 'CONTINUA...' }
    ];
    this.cine3d(shots, actors);
  };

  // ==========================================================================
  // AS CENAS DA HISTÓRIA EM 3D
  // Toda conversa da história (CutsceneEngine.play) é filmada no prédio 3D: o cenário da
  // fala (bg) vira um lugar do prédio, quem fala vira ator em pé (2D), e a câmera muda a
  // cada fala (plano aberto na narração, plano médio em quem fala, telão quando o Ego
  // fala do monitor, close em você nas escolhas). A caixa de texto, as escolhas, o PULAR
  // e as animações de anime continuam as mesmas. Sem 3D (aparelho sem WebGL2 ou GRÁFICO
  // SIMPLES), as conversas ficam com o desenho antigo.
  // ==========================================================================
  const CE = window.CutsceneEngine;
  if (!CE) return;
  const R2 = Math.PI / 2;
  // lugar do prédio: c = onde o grupo fica, f = para onde ele olha (a câmera fica na
  // frente), w = largura da fileira; screen = tem o telão do Ego; crowd = plateia
  const SETS = {
    quarto: { c: [12.5, 25.4], f: R2, w: 3.3 },
    saguao: { c: [25, 12.3], f: R2, w: 4.2, screen: true },
    auditorio: { c: [25, 12.3], f: R2, w: 4.2, screen: true, crowd: true },
    corredor: { c: [8.6, 19.5], f: 0, w: 2.2 },
    tunel: { c: [40.4, 14.5], f: Math.PI, w: 2.2 },
    campo: { c: [53, 10.6], f: R2, w: 4.4 },
    vestiario: { c: [39, 18.9], f: R2, w: 4.6 },
    armas: { c: [27.5, 29.4], f: R2, w: 3.1 },
    refeitorio: { c: [12.2, 8.75], f: R2, w: 3.6 },
    // academia (antes dos treinos de lá): de costas para o supino, a câmera do lado da barra fixa
    academia: { c: [38.6, 10.35], f: Math.PI, w: 1.8 },
    // a sala do Ego (a mesma da cena da passagem, montada fora do prédio: js/cine3d_espanha.js)
    sala_ego: { custom: true, c: [86, 16.6], f: R2, w: 1.6 },
    // lugares montados por uma cena de roteiro (CE.c3Sets[prov]: build, lugar, plano, expo);
    // o quarto do hotel da seleção vem de js/roteiros/camp_night.js
    hotel: { custom: true, prov: 'hotel', sem: 'quarto', c: [86.9, 16.6], f: R2, w: 1.6 },
    // a gala da Bola de Ouro em Paris: o teatro da 53/54 (js/roteiros/ballon_dor.js)
    gala: { custom: true, prov: 'gala', sem: 'saguao', c: [86, 13], f: -R2, w: 2 }
  };
  const BG_SET = {
    bluelock_room: 'quarto', night_home: 'quarto', hotel_night: 'hotel', locker_room: 'vestiario', monitor_room: 'sala_ego', paris_gala: 'gala',
    auditorium: 'auditorio', corridor: 'corredor', tunnel: 'tunel', wildcard_lab: 'armas', spain_cafe: 'refeitorio', gym: 'academia'
  };
  const provOf = (S) => (S && S.prov && CE.c3Sets && CE.c3Sets[S.prov]) || null;
  const setKey = (bg) => {
    const k = BG_SET[bg] || (bg && bg !== 'training_centre' ? 'campo' : 'saguao');
    // (sem o lugar montado pela cena, a conversa volta para o lugar do prédio de antes)
    if (SETS[k] && SETS[k].prov && !provOf(SETS[k])) return SETS[k].sem;
    // (sem a sala montada, a conversa volta para o saguão, com o Ego no telão)
    return k === 'sala_ego' && !CE.c3EgoRoom ? 'saguao' : k;
  };
  const isNarr = (s) => !s || /NARRADOR|ALTO-FALANTE|^VOZ\b|REPÓRTER|APRESENTADORA|LOCUTOR/i.test(s);
  const isYou = (s) => {
    const up = String(s || '').toUpperCase();
    const me = String(window.App?.state?.profile?.name || '').toUpperCase().trim();
    return up.includes('VOCÊ') || (me && up.trim() === me);
  };
  const isEgo = (s) => /\bEGO\b/i.test(String(s || '')) && !/EGOÍSTA|EGOIST/i.test(String(s || ''));
  const V = { eye: [0, 0, 0], look: [0, 0, 0] };
  const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

  // a GL está valendo (ou ainda vai ligar) e dá para filmar agora?
  function can3d() {
    const G = Hub.GL3D;
    if (!G || G.ok === false || Hub.forceSW) return false;
    if (window.MatchEngine?.active) return false;
    if (!window.App?.state?.profile || !Hub.cv) return false;
    return true;
  }
  // distância livre (sem parede) andando de p na direção d
  function free(p, d, max) {
    for (let k = 0.2; k <= max; k += 0.1) if (X.World.isSolid(Math.floor(p[0] + d[0] * k), Math.floor(p[1] + d[1] * k))) return k - 0.45;
    return max;
  }
  // plateia genérica do auditório (os "300 atacantes")
  let CROWD = null;
  function crowd() {
    if (CROWD) return CROWD;
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = A.CREATOR_SKIN || ['#f3d1b8'];
    const cols = A.CREATOR_HAIR_COLORS || ['#1b2340'];
    let s = 99;
    const rnd = (n) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % n);
    CROWD = [];
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 9; i++) {
        const x = 18.4 + i * 1.6 + (row % 2) * 0.8 + (rnd(30) - 15) / 100;
        const y = 16.3 + row * 1.25;
        if (x > 32.4 || (Math.abs(x - 21.5) < 0.75 && y < 18.2) || (Math.abs(x - 28.5) < 0.75 && y < 18.2)) continue;
        CROWD.push({
          id: 'extra' + CROWD.length,
          cd: { skinColor: skins[rnd(skins.length)], hairColor: cols[rnd(cols.length)], hairSecondary: cols[rnd(cols.length)], eyeColor: '#1e293b', hairStyle: hairs[rnd(hairs.length)], jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8', number: 1 + rnd(299) },
          x,
          y,
          ang: -R2,
          anim: 'idle',
          z: 0,
          still: true,
          extra: true
        });
      }
    }
    return CROWD;
  }
  // monta o elenco do lugar: quem fala nesse cenário (também nas respostas das escolhas)
  function castFor(bg) {
    const lines = CE.lines || [];
    const seen = new Map();
    let cur = CE.sceneBgStart;
    const visit = (l) => {
      if (l.bg) cur = l.bg;
      if (setKey(cur) !== setKey(bg)) return;
      const sp = l.speaker;
      if (isNarr(sp) || isYou(sp) || seen.has(sp)) return;
      if (isEgo(sp) && SETS[setKey(bg)].screen) return; // o Ego fala do telão
      const cd = CE.getSpeakerCharData(sp);
      if (cd) seen.set(sp, cd);
    };
    lines.forEach((l) => {
      visit(l);
      (l.choices || []).forEach((c) => (c.reply || []).forEach(visit));
    });
    return [...seen.entries()].slice(0, 7);
  }
  // ---- sala do Ego: o Ego de pé atrás da mesa, você na frente dela e quem mais estiver na
  // conversa ao seu lado. Você vira ator (a sala fica fora do prédio: o seu boneco do mapa
  // fica escondido) e a luz é a dos monitores, como na cena da passagem.
  function placeEgoRoom(bg, S) {
    const R = CE.c3EgoRoom;
    const mk = (sp, cd, x, y, ang, light, o = {}) => Object.assign({ id: sp, speaker: sp, cd, x, y, hx: x, hy: y, ang, anim: 'idle', z: 0, light }, o);
    const youCd = (CE.cineYou && CE.cineYou()) || CE.getSpeakerCharData('VOCÊ');
    const actors = [mk('VOCÊ', youCd, R.YOU_T[0], R.YOU_T[1], -R2, [0.56, 0.68, 0.8], { you: true })];
    let n = 0;
    castFor(bg).forEach(([sp, cd]) => {
      if (isEgo(sp)) {
        if (!actors.some((a) => a.ego)) actors.push(mk(sp, cd, R.EGO_AT[0], R.EGO_AT[1], R2, [0.62, 0.82, 0.9], { ego: true }));
        return;
      }
      n++;
      actors.push(mk(sp, cd, R.YOU_T[0] + 0.85 * n, R.YOU_T[1] + 0.15 + 0.1 * n, -R2, [0.5, 0.62, 0.74]));
    });
    // a sala é do Ego: ele fica atrás da mesa mesmo quando não fala
    if (!actors.some((a) => a.ego)) {
      const cd = CE.getSpeakerCharData('JINPACHI EGO');
      if (cd) actors.push(mk('JINPACHI EGO', cd, R.EGO_AT[0], R.EGO_AT[1], R2, [0.62, 0.82, 0.9], { ego: true }));
    }
    Hub.vnActors = actors;
    Hub.vnMeHome = null;
    // (o boneco do mapa não aparece aqui; o mapa fica parado no saguão)
    Hub.px = 25;
    Hub.py = 13;
    Hub.area = 'saguao';
    Hub.vnSet = { key: 'sala_ego', S, F: [0, 1], Rt: [1, 0], far: 2, custom: true };
    Hub.vnShot = null;
  }
  // ---- lugar de uma cena de roteiro (CE.c3Sets): cada um no lugar que a cena dá (lugar),
  // parado na pose dele (fixo), e a tomada de cada fala vem da cena (plano)
  function placeProv(bg, S) {
    const P = provOf(S);
    const PR = window.PixelRenderer;
    const mk = (sp, cd, l, o = {}) => {
      const c = l.extra ? Object.assign({}, cd, l.extra) : cd;
      let z = l.z || 0;
      if (l.seat !== undefined && PR && PR.spriteSeatU) {
        const u = PR.spriteSeatU(c, l.anim || 'sit');
        if (u !== null && u !== undefined) z += l.seat - (u * 2 * 0.9) / X.C.SPX;
      }
      return Object.assign({ id: sp, speaker: sp, cd: c, x: l.x, y: l.y, hx: l.x, hy: l.y, ang: l.ang || 0, anim: l.anim || 'idle', z, z0: z, light: l.luz, fixo: true }, o);
    };
    const youCd = (CE.cineYou && CE.cineYou()) || CE.getSpeakerCharData('VOCÊ');
    const actors = [mk('VOCÊ', youCd, P.lugar('VOCÊ', 0), { you: true })];
    castFor(bg).forEach(([sp, cd], i) => actors.push(mk(sp, cd, P.lugar(sp, i + 1))));
    // figurantes do lugar (a plateia da gala): parados, ninguém fala
    if (P.figurantes) P.figurantes().forEach((f, i) => actors.push(Object.assign(mk('fig' + i, f.cd, f), { speaker: null, extra: true })));
    Hub.vnActors = actors;
    Hub.vnMeHome = null;
    // (o boneco do mapa não aparece aqui; o mapa fica parado no saguão)
    Hub.px = 25;
    Hub.py = 13;
    Hub.area = 'saguao';
    Hub.vnSet = { key: setKey(bg), S, F: [0, 1], Rt: [1, 0], far: 2, custom: true, prov: S.prov };
    Hub.vnShot = null;
  }
  function shootProv(line) {
    const P = provOf(Hub.vnSet.S);
    const actors = Hub.vnActors || [];
    const sp = line.speaker;
    const ask = line.choices && line.choices.length;
    const alt = CE.currentIndex || 0;
    const narr = isNarr(sp) && !ask;
    const voce = !narr && (isYou(sp) || !!ask || !actors.some((a) => a.speaker === sp));
    const shot = P.plano(narr ? null : sp, alt, voce);
    const focus = narr ? null : voce ? actors.find((a) => a.you) : actors.find((a) => a.speaker === sp);
    // tomada nova longe da anterior: corta (deslizando, a câmera atravessava as paredes)
    const d0 = [V.look[0] - V.eye[0], V.look[2] - V.eye[2]];
    const d1 = [shot.look[0] - shot.eye[0], shot.look[2] - shot.eye[2]];
    const cos = (d0[0] * d1[0] + d0[1] * d1[1]) / (Math.hypot(d0[0], d0[1]) * Math.hypot(d1[0], d1[1]) || 1);
    if (cos < 0.7 || Math.hypot(shot.eye[0] - V.eye[0], shot.eye[2] - V.eye[2]) > 1.2) {
      V.eye = shot.eye.slice();
      V.look = shot.look.slice();
      V.fov = shot.fov;
    }
    actors.forEach((a) => (a.dark = a.speaker === sp && !!line.shadowFace));
    Hub.vnSpeaker = focus || null;
    Hub.vnFocus = null;
    Hub.camA = Math.atan2(shot.look[2] - shot.eye[2], shot.look[0] - shot.eye[0]);
    Hub.vnShot = Object.assign({ t0: performance.now() }, shot);
  }
  // plano aberto da sala do Ego: de lado e do alto (por trás de vocês os bonecos tapavam tudo)
  function egoWide(alt) {
    const VX = CE.c3EgoRoom.VX;
    return alt % 2
      ? { eye: [VX + 2.5, 1.6, 18.9], look: [VX - 0.3, 0.55, 15.2], fov: 50, drift: [-0.35, -0.05, -0.2] }
      : { eye: [VX - 2.3, 1.55, 18.7], look: [VX + 0.25, 0.6, 15.0], fov: 50, drift: [0.35, -0.05, -0.2] };
  }
  // tomadas da sala do Ego: aberta por trás de você (o Ego e os monitores no fundo), por cima
  // do seu ombro quando o Ego fala e de trás da mesa quando falam com ele
  function shootEgoRoom(line) {
    const R = CE.c3EgoRoom;
    const VX = R.VX;
    const actors = Hub.vnActors || [];
    const you = actors.find((a) => a.you);
    const ego = actors.find((a) => a.ego);
    const sp = line.speaker;
    const ask = line.choices && line.choices.length;
    const alt = CE.currentIndex || 0;
    let shot;
    let focus = null;
    if (isNarr(sp) && !ask) {
      shot = egoWide(alt);
    } else if (isEgo(sp) && ego) {
      focus = ego;
      // plano médio do Ego, da frente da mesa e de lado (por cima do seu ombro, os bonecos
      // pequenos e perto da câmera tapavam o Ego)
      shot = { eye: [VX - 1.15, 0.98, 15.8], look: [VX + 0.1, 0.78, 14.15], fov: /tense|ego/.test(line.mood || '') ? 36 : 40, drift: [0.12, 0, -0.1] };
    } else {
      // de trás da mesa (a câmera fica do seu lado da mesa, a borda acesa fica fora do quadro)
      const a = isYou(sp) || ask || isNarr(sp) ? you : actors.find((x) => x.speaker === sp) || you;
      focus = a;
      shot = { eye: [VX + 0.55, 1.05, 15.5], look: [a.x, 0.58, a.y], fov: 52, drift: [0, 0, 0.08] };
    }
    // virou para o outro lado da sala ou andou muito: corta (deslizando, a câmera atravessava
    // a mesa e os bonecos)
    const d0 = [V.look[0] - V.eye[0], V.look[2] - V.eye[2]];
    const d1 = [shot.look[0] - shot.eye[0], shot.look[2] - shot.eye[2]];
    const cos = (d0[0] * d1[0] + d0[1] * d1[1]) / (Math.hypot(d0[0], d0[1]) * Math.hypot(d1[0], d1[1]) || 1);
    if (cos < 0.7 || Math.hypot(shot.eye[0] - V.eye[0], shot.eye[2] - V.eye[2]) > 1.5) {
      V.eye = shot.eye.slice();
      V.look = shot.look.slice();
      V.fov = shot.fov;
    }
    // o Ego olha para quem fala com ele; os outros olham para o Ego
    actors.forEach((a) => {
      a.dark = a.speaker === sp && !!line.shadowFace;
      const t = a.ego ? (focus && focus !== ego ? focus : you) : ego || focus;
      if (t && t !== a) a.ang = Math.atan2(t.y - a.y, t.x - a.x);
    });
    Hub.vnSpeaker = focus;
    Hub.vnFocus = null; // (ninguém dá o passo à frente: a mesa está no meio)
    Hub.camA = Math.atan2(shot.look[2] - shot.eye[2], shot.look[0] - shot.eye[0]);
    Hub.vnShot = Object.assign({ t0: performance.now() }, shot);
  }
  // fileira de frente para a câmera; você no meio, os outros alternando dos lados
  function place(bg) {
    const S = SETS[setKey(bg)];
    if (S.custom) return S.prov ? placeProv(bg, S) : placeEgoRoom(bg, S);
    const cast = castFor(bg);
    const F = [Math.cos(S.f), Math.sin(S.f)];
    const Rt = [Math.sin(S.f), -Math.cos(S.f)]; // direita de quem olha da câmera
    const n = cast.length + 1;
    const perRow = Math.max(2, Math.min(n, Math.floor(S.w / 0.72) + 1));
    const order = [];
    for (let i = 0; i < n; i++) order.push(i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2));
    const pos = order.map((o, i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, n - row * perRow);
      const sp = inRow > 1 ? Math.min(0.82, S.w / (inRow - 1)) : 0;
      const off = row ? ((i % perRow) - (inRow - 1) / 2) * sp : o * sp;
      const fwd = off * off * 0.05 - row * 0.85;
      return [S.c[0] + Rt[0] * off + F[0] * fwd, S.c[1] + Rt[1] * off + F[1] * fwd];
    });
    Hub.px = pos[0][0];
    Hub.py = pos[0][1];
    Hub.vnMeHome = [pos[0][0], pos[0][1]];
    Hub.ang = S.f;
    Hub.camA = S.f;
    Hub.area = X.World.areaAt(Hub.px, Hub.py) || Hub.area;
    const actors = cast.map(([sp, cd], i) => ({ id: sp, speaker: sp, cd, x: pos[i + 1][0], y: pos[i + 1][1], hx: pos[i + 1][0], hy: pos[i + 1][1], ang: S.f, anim: 'idle', z: 0 }));
    Hub.vnActors = S.crowd ? actors.concat(crowd()) : actors;
    Hub.vnSet = { key: setKey(bg), S, F, Rt, far: free(S.c, F, 4.6) };
    Hub.vnShot = null;
  }
  // tomadas
  function wide(alt) {
    if (Hub.vnSet.custom) return Hub.vnSet.prov ? provOf(Hub.vnSet.S).plano(null, alt, false) : egoWide(alt);
    const { S, F, Rt, far } = Hub.vnSet;
    const c = [S.c[0], 0, S.c[1]];
    const f3 = [F[0], 0, F[1]];
    const r3 = [Rt[0], 0, Rt[1]];
    if (S.crowd && alt % 2 === 0) return { eye: [25, 1.75, 20.7], look: [25, 0.75, 10.5], fov: 58, drift: [0, -0.15, -1.0] };
    if (alt % 3 === 1) {
      const sg = alt % 2 ? 1 : -1;
      return { eye: add3(add3(c, f3, far * 0.75), r3, 1.7 * sg + 0.0001).map((v, i) => (i === 1 ? 1.75 : v)), look: [c[0], 0.55, c[2]], fov: 54, drift: add3([0, 0, 0], r3, -0.5 * sg) };
    }
    return { eye: [c[0] + F[0] * far, 1.55, c[2] + F[1] * far], look: [c[0] - F[0] * 0.6, 0.6, c[2] - F[1] * 0.6], fov: 56, drift: [-F[0] * 0.55, -0.1, -F[1] * 0.55] };
  }
  // plano médio: quem fala dá um passo à frente (STEP) e o rosto fica acima da caixa de texto
  const STEP = 0.55;
  function medium(h, side, tight, low) {
    const { F, Rt } = Hub.vnSet;
    const p = [h[0] + F[0] * STEP, h[1] + F[1] * STEP];
    const d = Math.min(1.9, free([p[0], p[1]], F, 2.3));
    return {
      eye: [p[0] + F[0] * d + Rt[0] * 0.4 * side, 0.98, p[1] + F[1] * d + Rt[1] * 0.4 * side],
      look: [p[0] - Rt[0] * 0.06 * side, low ? 0.5 : 0.58, p[1] - Rt[1] * 0.06 * side],
      fov: tight ? 40 : 45,
      drift: [-F[0] * 0.2, 0, -F[1] * 0.2]
    };
  }
  const SCREEN = { eye: [25.2, 1.05, 11.65], look: [25, 0.9, 9.0], fov: 60, drift: [0.3, -0.02, -0.15] };
  // escolhe a tomada da fala atual e para onde cada um olha
  function shoot() {
    const line = CE.lines?.[CE.currentIndex];
    if (!line || line.cinematic || !Hub.vnSet) return;
    if (Hub.vnSet.custom) return Hub.vnSet.prov ? shootProv(line) : shootEgoRoom(line);
    const sp = line.speaker;
    const actors = Hub.vnActors || [];
    const home = Hub.vnMeHome || [Hub.px, Hub.py];
    const me = { x: home[0], y: home[1], me: true };
    let shot;
    let focus = null;
    let lookScreen = false;
    const alt = CE.currentIndex || 0;
    const ask = line.choices && line.choices.length;
    if (ask && (isNarr(sp) || isYou(sp) || !actors.some((x) => x.speaker === sp))) {
      // escolha sem ninguém perguntando: você pensando
      shot = medium([me.x, me.y], 1, true, true);
      focus = me;
    } else if (isNarr(sp)) {
      shot = wide(alt);
    } else if (isEgo(sp) && Hub.vnSet.S.screen) {
      shot = SCREEN;
      lookScreen = true;
    } else {
      const a = isYou(sp) ? me : actors.find((x) => x.speaker === sp);
      if (a) {
        const side = a === me ? 1 : actors.indexOf(a) % 2 ? -1 : 1;
        shot = medium([a.me ? a.x : a.hx, a.me ? a.y : a.hy], side, /tense|ego/.test(line.mood || ''));
        focus = a;
      } else shot = wide(alt);
    }
    // quem fala olha para a câmera; os outros olham para quem fala (ou para o telão)
    const face = (o, tx, ty) => Math.atan2(ty - o.y, tx - o.x);
    const all = actors.filter((a) => !a.extra);
    all.forEach((a) => {
      a.dark = a.speaker === sp && !!line.shadowFace;
      if (lookScreen) a.ang = face(a, 25, 9);
      else if (a === focus) a.ang = face(a, shot.eye[0], shot.eye[2]);
      else if (focus) a.ang = face(a, focus.x, focus.y);
      else a.ang = Hub.vnSet.S.f;
    });
    Hub.vnMeAng = lookScreen ? face(me, 25, 9) : focus === me || !focus ? face(me, shot.eye[0], shot.eye[2]) : face(me, focus.x, focus.y);
    Hub.vnSpeaker = focus && focus !== me ? focus : null;
    Hub.vnFocus = focus;
    Hub.vnShot = Object.assign({ t0: performance.now() }, shot);
  }
  function start() {
    if (Hub.vn3d) return;
    Hub.vn3d = true;
    Hub.vnSave = { px: Hub.px, py: Hub.py, ang: Hub.ang, camA: Hub.camA, area: Hub.area };
    Hub.vnBg = undefined;
    Hub.vnN = 0;
    document.documentElement.classList.add('vn3d', 'hub-cine-on');
  }
  function stop() {
    // a fala atual estava só no 3D (o 2D não foi desenhado): desenha ela no 2D agora
    if (CE.vn2dHidden) {
      CE.vn2dHidden = false;
      const ln = CE.active && CE.lines && CE.lines[CE.currentIndex];
      if (ln && !ln.cinematic) {
        try {
          render0.call(CE);
        } catch (e) {}
      }
    }
    if (!Hub.vn3d) return;
    Hub.vn3d = false;
    const s = Hub.vnSave || {};
    Object.assign(Hub, { px: s.px, py: s.py, ang: s.ang, camA: s.camA, area: s.area, vnActors: null, vnSet: null, vnShot: null, _back: undefined });
    document.documentElement.classList.remove('vn3d', 'hub-cine-on');
  }
  Hub.vnStop = stop;
  // liga no CutsceneEngine: cada fala nova escolhe a tomada; o fim da conversa desliga
  const play0 = CE.play;
  CE.play = function (config) {
    this.sceneBgStart = config?.bg || null;
    return play0.apply(this, arguments);
  };
  const render0 = CE.renderCurrentStep;
  CE.renderCurrentStep = function () {
    // em 3D o fundo, o retrato e o palco 2D (escondidos) não são desenhados
    this.vn2dHidden = !!(this.active && can3d());
    const r = render0.apply(this, arguments);
    try {
      if (!this.active || !can3d()) stop();
      else {
        start();
        const bg = this.sceneBg || null;
        if (Hub.vnBg !== bg || !Hub.vnSet) {
          const first = Hub.vnBg === undefined;
          const changed = !Hub.vnSet || setKey(bg) !== Hub.vnSet.key;
          Hub.vnBg = bg;
          if (changed) {
            place(bg);
            // lugar novo: começa no plano aberto e a câmera vai entrando
            const w = wide(0);
            V.eye = w.eye.slice();
            V.look = w.look.slice();
            V.fov = w.fov;
            V.slow = performance.now() + 1700;
            void first;
          }
        }
        shoot();
      }
    } catch (e) {
      console.warn('[cine3d] cena em 3D desligada:', e);
      stop();
    }
    return r;
  };
  const finish0 = CE.finish;
  CE.finish = function () {
    this.vn2dHidden = false; // (a conversa acabou: não redesenha a última fala)
    stop();
    return finish0.apply(this, arguments);
  };
  // câmera das cenas: desliza até a tomada da fala (devagar quando o lugar acabou de mudar)
  // e vai andando um pouquinho enquanto a fala está na tela
  let lastT = 0;
  function vnCam() {
    const s = Hub.vnShot;
    if (!s) return null;
    const now = performance.now();
    const dt = Math.min(0.1, (now - (lastT || now)) / 1000);
    lastT = now;
    const k = ease(Math.min(1, (now - s.t0) / 9000));
    const te = add3(s.eye, s.drift || [0, 0, 0], k);
    const tl = s.look;
    const sp = Math.min(1, dt * (now < (V.slow || 0) ? 1.6 : 5.5));
    V.eye = mix(V.eye, te, sp);
    V.look = mix(V.look, tl, sp);
    V.fov = (V.fov || s.fov) + (s.fov - (V.fov || s.fov)) * sp;
    // quem fala dá um passo à frente (andando) e volta para o lugar depois
    const fo = Hub.vnFocus;
    const Fv = Hub.vnSet ? Hub.vnSet.F : [0, 0];
    const walk = (o, hx, hy, on) => {
      const tx = hx + (on ? Fv[0] * STEP : 0);
      const ty = hy + (on ? Fv[1] * STEP : 0);
      const dx = tx - o.x;
      const dy = ty - o.y;
      const dd = Math.hypot(dx, dy);
      const st = Math.min(dd, dt * 1.7);
      if (dd > 0.0001) {
        o.x += (dx / dd) * st;
        o.y += (dy / dd) * st;
      }
      return dd > 0.03;
    };
    (Hub.vnActors || []).forEach((a) => {
      if (a.extra || a.fixo) return;
      a.anim = walk(a, a.hx, a.hy, a === fo) ? 'run' : 'idle';
    });
    if (Hub.vnMeHome) {
      const o = { x: Hub.px, y: Hub.py };
      Hub.moving = walk(o, Hub.vnMeHome[0], Hub.vnMeHome[1], !!(fo && fo.me));
      Hub.px = o.x;
      Hub.py = o.y;
    }
    // quem está falando pula de leve enquanto as letras aparecem
    const spk = Hub.vnSpeaker;
    (Hub.vnActors || []).forEach((a) => {
      if (!a.extra) a.z = (a.z0 || 0) + (a === spk && CE.typing ? 0.02 * Math.abs(Math.sin(Hub.t * 0.35)) : 0);
    });
    // o seu boneco: de frente, de lado ou de costas conforme a câmera
    Hub.ang = Hub.vnMeAng ?? Hub.ang;
    const rel = Math.atan2(V.eye[2] - Hub.py, V.eye[0] - Hub.px) - Hub.ang;
    const r = Math.atan2(Math.sin(rel), Math.cos(rel));
    const dx = V.look[0] - V.eye[0];
    const dz = V.look[2] - V.eye[2];
    const meLeft = Math.cos(Hub.ang) * -dz + Math.sin(Hub.ang) * dx < 0;
    // a imagem sobe para o meio do espaço livre acima da caixa de texto
    if (!V.boxT || now - V.boxT > 400) {
      V.boxT = now;
      const bx = document.querySelector('.vn-dialogue-box');
      const r = bx && bx.getBoundingClientRect();
      const H = window.innerHeight || 1;
      const top = r && r.height ? Math.max(0.3, Math.min(0.95, r.top / H)) : 0.95;
      V.shiftT = 1 - (0.06 + top);
    }
    V.shift = (V.shift ?? V.shiftT) + ((V.shiftT || 0) - (V.shift ?? V.shiftT)) * Math.min(1, dt * 4);
    const out = { eye: V.eye, look: V.look, fov: V.fov, shiftY: V.shift, meView: Math.abs(r) < 0.75 ? 'front' : Math.abs(r) > 2.4 ? 'back' : 'side', meLeft };
    // sala do Ego (e os lugares das cenas de roteiro): as peças vêm do kit das cenas 3D
    const prov = Hub.vnSet && Hub.vnSet.custom ? provOf(Hub.vnSet.S) : null;
    if (Hub.vnSet && Hub.vnSet.custom && (prov || CE.c3EgoRoom) && CE.cine3dSetGeom) {
      const g = CE.cine3dSetGeom((K) => (prov || CE.c3EgoRoom).build(K, Hub.t || 0, V.eye));
      Hub.camA = Math.atan2(V.look[2] - V.eye[2], V.look[0] - V.eye[0]);
      Object.assign(out, { sk: true, noMe: true, noDust: true, dyn: g.dyn, sprites: g.sprites, fog: g.fog, fogK: g.fogK, skyTop: g.skyTop, skyHor: g.skyHor, stars: g.stars, ambient: g.ambient, expo: prov && prov.expo !== undefined ? prov.expo : 0.95 });
    }
    return out;
  }
  const cc0 = Hub.cineCam;
  Hub.cineCam = function () {
    if (this.cine) return cc0.call(this);
    if (this.vn3d) return vnCam();
    return null;
  };
  const npcs1 = Hub.npcs;
  Hub.npcs = function () {
    if (this.vn3d && !this.cine) return this.vnActors || [];
    return npcs1.call(this);
  };
  const canAct1 = Hub.canAct;
  Hub.canAct = function () {
    return !this.vn3d && canAct1.call(this);
  };
  // o laço do mapa desenha durante a conversa (menos nas animações de anime e na partida)
  Hub.drawLive = function () {
    if (this.vn3d) {
      if (!can3d() || !CE.active) {
        stop();
        return this.live();
      }
      return !CE.sakugaActive;
    }
    return this.live();
  };
})();
