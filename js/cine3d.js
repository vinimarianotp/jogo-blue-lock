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
})();
