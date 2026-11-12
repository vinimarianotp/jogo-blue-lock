// ============================================================================
// A TORCIDA (som) — tudo sintetizado na hora com Web Audio, sem arquivo nenhum
// Nos estádios de fora do Blue Lock (Seleção, Copa do Mundo e liga profissional):
//   • rugido da multidão: ruído filtrado (o "mar" de gente) + um "burburinho" de centenas
//     de vozes curtinhas (sílabas com formantes) montado uma vez fora do tempo real
//     (OfflineAudioContext) e tocado em laço;
//   • gritos soltos ("ê!", "vai!") espalhados no estéreo, ondas de "uuuh" e "aaah";
//   • palmas em uníssono (várias palmas com atraso aleatório) e aplauso solto;
//   • bumbo e caixa da torcida organizada (batucada);
//   • cantos ritmados com vogais: um coro de serras desafinadas passando por filtros de
//     formante ("o-lê, o-lê, o-lê", "ni-ppon! + 3 palmas", "va-mos!");
//   • corneta/vuvuzela de vez em quando (na Copa).
// Onde toca (o volume vem do lugar):
//   • no mapa, no campo desses estádios; no túnel do treino fica abafado e cai com a
//     distância até a porta do campo; no vestiário/academia é um eco abafado bem baixo;
//   • nas partidas desses temas, por cima de tudo: sobe quando o seu time ataca
//     (SFX.crowdTension), explode no gol (SFX.goal), "uuuh" na defesa/trave, lamenta o gol
//     sofrido;
//   • nas cenas de cinema e conversas filmadas nesses estádios (js/hub3d_estadio.js diz
//     quando o estádio está na tela): baixinho por baixo da trilha, sobe no gol.
// Respeita o mudo: com o som desligado nada é criado (e o que estava tocando é desmontado).
// Ao sair do estádio tudo some em ~1 s e os nós são desligados (nada fica tocando à toa).
// ============================================================================
(function () {
  const SFX = window.SFX;
  if (!SFX) return;
  const STAD = { japan: 1, worldcup: 1, pro: 1 };
  const T = {
    g: null, // o grafo montado (null = desligado)
    kind: null,
    vol: 0, // volume atual (0..1), suavizado
    hype: 0.3, // animação da torcida (0..1)
    hypeT: 0.3,
    hypeUntil: 0,
    tension: 0,
    next: {}, // quando cada tipo de evento acontece de novo (tempo do áudio)
    chant: null,
    srcs: new Map(), // nós de um tiro só tocando ou agendados (fonte → nós dela)
    live: 0, // nós de um tiro só ainda tocando (para conferir que não vaza)
    stats: { made: 0, ended: 0 }
  };
  const rnd = Math.random;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // vogais (formantes F1, F2 em Hz)
  const VOW = { a: [760, 1250], e: [420, 2000], i: [300, 2300], o: [470, 860], u: [330, 760] };

  // ---------------------------------------------------------------- onde estamos?
  function matchKind(ME) {
    const ch = ME.chapter || {};
    if (ch.league === 'pro') return 'pro';
    const mt = String(ch.mapTheme || '');
    if (mt === 'u20_national') return 'japan';
    if (mt.startsWith('worldcup')) return 'worldcup';
    return null;
  }
  // o que tocar agora: { kind, vol 0..1, muffle 0/1, ctx } ou null (silêncio)
  function want() {
    // (aba escondida / app em segundo plano: silêncio — o relógio do navegador fica lento lá)
    if (SFX.muted || !SFX.ready() || T.off || document.hidden) return null;
    const ME = window.MatchEngine;
    if (ME && ME.active) {
      if (ME.mode !== 'match') return null;
      const kind = matchKind(ME);
      // (com a partida pausada a torcida continua, mais baixo)
      return kind ? { kind, vol: ME.paused || ME.pauseOpen ? 0.3 : 0.7, muffle: 0, ctx: 'partida' } : null;
    }
    const CE = window.CutsceneEngine;
    const est = window.HubEstadio;
    const seen = est && est.seen;
    // (1,5 s de folga: num corte rápido para um plano fora do estádio o som atravessa o corte)
    const fresh = seen && performance.now() - seen.at < 1500;
    if (CE && (CE.sakugaActive || CE.active)) {
      // cena de cinema / conversa: só se o estádio estiver na tela (câmera no campo/nas arquibancadas)
      if (fresh && seen.cine && STAD[seen.th]) return { kind: seen.th, vol: CE.sakugaActive ? 0.26 : 0.2, muffle: seen.field ? 0 : 1, ctx: 'cena' };
      return null;
    }
    const H = window.Hub;
    if (!H || !H.live || !H.live()) return null;
    const th = H.theme && H.theme();
    if (!th || !STAD[th.id]) return null;
    const pv = H.panel ? 0.6 : 1; // (com uma aba aberta por cima, mais baixo)
    if (H.area === 'campo') return { kind: th.id, vol: 0.7 * pv, muffle: 0, ctx: 'mapa' };
    if (H.area === 'treino') {
      const d = Math.hypot(H.px - 44.5, H.py - 14.5);
      const v = 0.5 * Math.max(0, 1 - d / 11);
      return v > 0.02 ? { kind: th.id, vol: v * pv, muffle: 1, ctx: 'mapa' } : null;
    }
    if (H.area === 'vestiario' || H.area === 'academia') return { kind: th.id, vol: 0.12 * pv, muffle: 1, ctx: 'mapa' };
    return null;
  }

  // ---------------------------------------------------------------- sons prontos (buffers)
  // feitos uma vez só por contexto de áudio: ruído estéreo, palmas em uníssono, aplauso
  const BUF = { ctx: null };
  function bq(type, f, q, sr) {
    // filtro biquad (RBJ) para montar buffers em JS
    const w = (2 * Math.PI * f) / sr;
    const al = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    let b0, b1, b2;
    if (type === 'bp') {
      b0 = al;
      b1 = 0;
      b2 = -al;
    } else {
      b0 = (1 + c) / 2;
      b1 = -(1 + c);
      b2 = (1 + c) / 2;
    }
    const a0 = 1 + al;
    const a1 = -2 * c;
    const a2 = 1 - al;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    return (x) => {
      const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      return y;
    };
  }
  // uma palma: estalos rápidos (2-3) e a cauda curta, filtrada; soma em d[] a partir de i0
  function addClap(d, i0, sr, amp) {
    const f = bq('bp', 900 + rnd() * 1500, 1.1 + rnd() * 1.4, sr);
    const n = Math.floor(sr * 0.09);
    const hits = [0, 0.004 + rnd() * 0.004, 0.009 + rnd() * 0.006];
    for (let k = 0; k < n; k++) {
      const t = k / sr;
      let e = 0;
      hits.forEach((h, j) => {
        if (t >= h) e += Math.exp(-(t - h) / (j === 2 ? 0.018 : 0.004)) * (j === 2 ? 1 : 0.6);
      });
      const i = (i0 + k) % d.length;
      d[i] += f((rnd() * 2 - 1) * e) * amp;
    }
  }
  function buffers(ctx) {
    if (BUF.ctx === ctx) return BUF;
    BUF.ctx = ctx;
    const sr = 22050;
    // ruído estéreo (2 s, laço)
    const nb = ctx.createBuffer(2, sr * 2, sr);
    for (let c = 0; c < 2; c++) {
      const d = nb.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    }
    BUF.noise = nb;
    // palmas em uníssono: ~26 pessoas batendo juntas (com até 35 ms de diferença)
    const cb = ctx.createBuffer(2, Math.floor(sr * 0.2), sr);
    for (let c = 0; c < 2; c++) {
      const d = cb.getChannelData(c);
      for (let p = 0; p < 26; p++) addClap(d, Math.floor(rnd() * 0.035 * sr), sr, 0.16);
    }
    BUF.clap = cb;
    // aplauso solto (3 s em laço): palmas fora de ritmo
    const ab = ctx.createBuffer(2, sr * 3, sr);
    for (let c = 0; c < 2; c++) {
      const d = ab.getChannelData(c);
      for (let p = 0; p < 210; p++) addClap(d, Math.floor(rnd() * d.length), sr, 0.12);
    }
    BUF.applause = ab;
    BUF.babble = null;
    babble(ctx);
    return BUF;
  }
  // Burburinho: ~280 sílabas curtas de gente falando/gritando (serra + 2 formantes), montado
  // fora do tempo real (OfflineAudioContext, em outro fio: não trava o jogo). Fica pronto
  // em instantes e entra no laço do rugido. O fim é misturado no começo (laço sem emenda).
  function babble(ctx) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return;
    const sr = 22050;
    const LEN = 6;
    const X = 0.5;
    let oc;
    try {
      oc = new OAC(2, Math.floor(sr * (LEN + X)), sr);
    } catch (e) {
      return;
    }
    const vows = Object.keys(VOW);
    for (let i = 0; i < 280; i++) {
      const t = rnd() * LEN;
      const dur = 0.12 + rnd() * 0.3;
      const f0 = rnd() < 0.6 ? 105 + rnd() * 70 : 190 + rnd() * 90;
      const v = VOW[pick(vows)];
      const o = oc.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.linearRampToValueAtTime(f0 * (0.85 + rnd() * 0.35), t + dur);
      const g = oc.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.03 + rnd() * 0.05, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
      const f1 = oc.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.value = v[0] * (0.9 + rnd() * 0.2);
      f1.Q.value = 5;
      const f2 = oc.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.value = v[1] * (0.9 + rnd() * 0.2);
      f2.Q.value = 7;
      const p = oc.createStereoPanner ? oc.createStereoPanner() : null;
      if (p) p.pan.value = rnd() * 1.8 - 0.9;
      o.connect(g);
      g.connect(f1);
      g.connect(f2);
      const dst = p || oc.destination;
      f1.connect(dst);
      f2.connect(dst);
      if (p) p.connect(oc.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    oc.startRendering()
      .then((b) => {
        if (BUF.ctx !== ctx) return;
        const n = Math.floor(sr * LEN);
        const x = Math.floor(sr * X);
        const out = ctx.createBuffer(2, n, sr);
        for (let c = 0; c < 2; c++) {
          const s = b.getChannelData(c);
          const d = out.getChannelData(c);
          for (let i = 0; i < n; i++) d[i] = s[i];
          // o pedaço depois do fim volta no começo, em rampa (laço sem emenda)
          for (let i = 0; i < x; i++) d[i] = s[i] * (i / x) + s[n + i] * (1 - i / x);
        }
        BUF.babble = out;
        if (T.g && T.g.ctx === ctx && !T.g.bab) startBabble(T.g);
      })
      .catch(() => {});
  }

  // ---------------------------------------------------------------- o grafo
  function build() {
    const ctx = SFX.ctx;
    const B = buffers(ctx);
    const g = { ctx, nodes: [] };
    const keep = (n) => (g.nodes.push(n), n);
    // saída: volume → abafador (passa-baixa) → master do jogo (mudo e volume valem aqui)
    g.out = keep(ctx.createGain());
    g.out.gain.value = 0.0001;
    g.muf = keep(ctx.createBiquadFilter());
    g.muf.type = 'lowpass';
    g.muf.frequency.value = 16000;
    g.muf.Q.value = 0.5;
    g.out.connect(g.muf);
    // (compressor de segurança: o gol + a trilha + o apito juntos não estouram)
    g.comp = keep(ctx.createDynamicsCompressor());
    g.comp.threshold.value = -20;
    g.comp.knee.value = 8;
    g.comp.ratio.value = 4;
    g.comp.attack.value = 0.004;
    g.comp.release.value = 0.25;
    g.muf.connect(g.comp);
    g.comp.connect(SFX.master);
    // envio para o reverb da música (o eco do estádio), se ele existir
    try {
      const fx = SFX.musicFx && SFX.musicFx();
      if (fx && fx.rev) {
        g.rev = keep(ctx.createGain());
        g.rev.gain.value = 0.35;
        g.muf.connect(g.rev);
        g.rev.connect(fx.rev);
      }
    } catch (e) {}
    // rugido: ruído estéreo → passa-baixa → corcova nas vozes (500 Hz) → volume
    g.src = keep(ctx.createBufferSource());
    g.src.buffer = B.noise;
    g.src.loop = true;
    g.lp = keep(ctx.createBiquadFilter());
    g.lp.type = 'lowpass';
    g.lp.frequency.value = 1300;
    g.lp.Q.value = 0.4;
    g.pk = keep(ctx.createBiquadFilter());
    g.pk.type = 'peaking';
    g.pk.frequency.value = 520;
    g.pk.Q.value = 0.8;
    g.pk.gain.value = 7;
    g.bed = keep(ctx.createGain());
    g.bed.gain.value = 0.05;
    g.src.connect(g.lp);
    g.lp.connect(g.pk);
    g.pk.connect(g.bed);
    g.bed.connect(g.out);
    g.src.start(ctx.currentTime, rnd() * 1.5);
    // eventos (gritos, palmas, bumbo, coro) entram aqui
    g.ev = keep(ctx.createGain());
    g.ev.gain.value = 1;
    g.ev.connect(g.out);
    if (B.babble) startBabble(g);
    T.next = {};
    return g;
  }
  function startBabble(g) {
    const ctx = g.ctx;
    g.bab = ctx.createBufferSource();
    g.bab.buffer = BUF.babble;
    g.bab.loop = true;
    g.babG = ctx.createGain();
    g.babG.gain.value = 0.0001;
    g.bab.connect(g.babG);
    g.babG.connect(g.out);
    g.bab.start(ctx.currentTime, rnd() * 5);
    g.nodes.push(g.bab, g.babG);
  }
  function teardown() {
    const g = T.g;
    if (!g) return;
    T.g = null;
    T.chant = null;
    try {
      g.src.stop();
      if (g.bab) g.bab.stop();
    } catch (e) {}
    // os de um tiro só que ainda não acabaram (até os agendados para daqui a pouco) param já
    T.srcs.forEach((nodes, src) => {
      try {
        src.onended = null;
        src.stop();
      } catch (e) {}
      nodes.forEach((n) => {
        try {
          n.disconnect();
        } catch (e) {}
      });
    });
    T.live = 0;
    T.srcs.clear();
    g.nodes.forEach((n) => {
      try {
        n.disconnect();
      } catch (e) {}
    });
  }
  // nó de um tiro só: desliga sozinho quando acaba (e conta, para os testes de vazamento)
  function oneShot(src, nodes, t1) {
    T.live++;
    T.stats.made++;
    T.srcs.set(src, nodes);
    src.onended = () => {
      T.live--;
      T.stats.ended++;
      T.srcs.delete(src);
      nodes.forEach((n) => {
        try {
          n.disconnect();
        } catch (e) {}
      });
    };
    src.stop(t1);
  }
  const panner = (ctx, v) => {
    if (!ctx.createStereoPanner) return ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = v;
    return p;
  };

  // ---------------------------------------------------------------- vozes
  // um grito solto: serra com vibrato passando por 2 formantes ("ê!", "vai!", "uh!")
  function shout(t, amp = 0.05) {
    const g = T.g;
    const ctx = g.ctx;
    const v = VOW[pick(['e', 'a', 'o', 'a', 'i', 'u'])];
    const f0 = rnd() < 0.65 ? 150 + rnd() * 90 : 260 + rnd() * 120;
    const dur = 0.18 + rnd() * 0.45;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * 0.92, t);
    o.frequency.linearRampToValueAtTime(f0 * (1.05 + rnd() * 0.1), t + dur * 0.4);
    o.frequency.linearRampToValueAtTime(f0 * 0.8, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(amp, t + 0.03);
    env.gain.setValueAtTime(amp, t + dur * 0.5);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = v[0];
    f1.Q.value = 4;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = v[1];
    f2.Q.value = 6;
    const p = panner(ctx, rnd() * 1.6 - 0.8);
    o.connect(env);
    env.connect(f1);
    env.connect(f2);
    f1.connect(p);
    f2.connect(p);
    p.connect(g.ev);
    o.start(t);
    oneShot(o, [o, env, f1, f2, p], t + dur + 0.05);
  }
  // "uuuuh" / "aaaah" de milhares (serras desafinadas com a vogal), subindo ou caindo
  function wave(t, vowel, f0, f1, dur, amp) {
    const g = T.g;
    const ctx = g.ctx;
    const v = VOW[vowel];
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(amp, t + Math.min(0.5, dur * 0.25));
    env.gain.setValueAtTime(amp, t + dur * 0.55);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const fa = ctx.createBiquadFilter();
    fa.type = 'bandpass';
    fa.frequency.value = v[0];
    fa.Q.value = 2.2;
    const fb = ctx.createBiquadFilter();
    fb.type = 'bandpass';
    fb.frequency.value = v[1];
    fb.Q.value = 3;
    env.connect(fa);
    env.connect(fb);
    fa.connect(g.ev);
    fb.connect(g.ev);
    const nodes = [env, fa, fb];
    const oscs = [];
    for (let i = 0; i < 8; i++) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      const det = 1 + (i - 3.5) * 0.017 + (rnd() - 0.5) * 0.01;
      const oct = i % 3 === 0 ? 0.5 : 1;
      o.frequency.setValueAtTime(f0 * det * oct, t);
      o.frequency.linearRampToValueAtTime(f1 * det * oct, t + dur);
      o.connect(env);
      o.start(t);
      nodes.push(o);
      oscs.push(o);
    }
    // (o último a acabar desliga todos)
    oscs.forEach((o, i) => (i ? o.stop(t + dur + 0.05) : 0));
    oneShot(oscs[0], nodes, t + dur + 0.05);
  }
  // palmas em uníssono
  function clap(t, amp = 0.5, pan = 0) {
    const g = T.g;
    const ctx = g.ctx;
    const s = ctx.createBufferSource();
    s.buffer = BUF.clap;
    s.playbackRate.value = 0.94 + rnd() * 0.12;
    const a = ctx.createGain();
    a.gain.value = amp;
    const p = panner(ctx, pan);
    s.connect(a);
    a.connect(p);
    p.connect(g.ev);
    s.start(t);
    oneShot(s, [s, a, p], t + 0.25);
  }
  // aplauso solto (dur segundos, com rampa)
  function applause(t, dur, amp = 0.4) {
    const g = T.g;
    const ctx = g.ctx;
    const s = ctx.createBufferSource();
    s.buffer = BUF.applause;
    s.loop = true;
    const a = ctx.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.exponentialRampToValueAtTime(amp, t + 0.4);
    a.gain.setValueAtTime(amp, t + dur * 0.6);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(a);
    a.connect(g.ev);
    s.start(t, rnd() * 2.5);
    oneShot(s, [s, a], t + dur + 0.05);
  }
  // bumbo (surdo) e caixa da organizada
  function drum(t, type, amp = 0.35) {
    const g = T.g;
    const ctx = g.ctx;
    if (type === 'bumbo') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(82, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.22);
      const a = ctx.createGain();
      a.gain.setValueAtTime(0.0001, t);
      a.gain.exponentialRampToValueAtTime(amp, t + 0.006);
      a.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      const p = panner(ctx, -0.25);
      o.connect(a);
      a.connect(p);
      p.connect(g.ev);
      o.start(t);
      oneShot(o, [o, a, p], t + 0.42);
      return;
    }
    // caixa: ruído com o corpo curtinho
    const s = ctx.createBufferSource();
    s.buffer = BUF.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1900;
    f.Q.value = 0.9;
    const a = ctx.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.exponentialRampToValueAtTime(amp * 0.55, t + 0.003);
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    const p = panner(ctx, -0.2);
    s.connect(f);
    f.connect(a);
    a.connect(p);
    p.connect(g.ev);
    s.start(t, rnd() * 1.5);
    oneShot(s, [s, f, a, p], t + 0.16);
  }
  // corneta / vuvuzela (Copa): serra zumbindo num tom só, com o filtro de metal
  function horn(t) {
    const g = T.g;
    const ctx = g.ctx;
    const dur = 0.7 + rnd() * 1.2;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const f0 = pick([233, 233, 220, 247]);
    o.frequency.setValueAtTime(f0 * 0.97, t);
    o.frequency.linearRampToValueAtTime(f0, t + 0.12);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5 + rnd() * 2;
    const lg = ctx.createGain();
    lg.gain.value = 2.5;
    lfo.connect(lg);
    lg.connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 700;
    f.Q.value = 1.6;
    const a = ctx.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.exponentialRampToValueAtTime(0.022, t + 0.08);
    a.gain.setValueAtTime(0.022, t + dur - 0.15);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = panner(ctx, rnd() * 1.4 - 0.7);
    o.connect(f);
    f.connect(a);
    a.connect(p);
    p.connect(g.ev);
    o.start(t);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
    oneShot(o, [o, lfo, lg, f, a, p], t + dur + 0.05);
  }

  // ---------------------------------------------------------------- cantos (o coro)
  // sílabas: [vogal, nota midi, batidas, força] ('-' = pausa; 'P' = palma; 'B' = bumbo)
  const CHANTS = {
    // "o-lê, o-lê o-lê o-lê, o-lê, o-lê" (Copa e liga)
    ole: { bpm: 126, rep: 2, notes: [['o', 57, 0.5], ['e', 62, 1.5, 1], ['o', 57, 0.5], ['e', 62, 0.5], ['o', 57, 0.5], ['e', 62, 0.5], ['o', 57, 0.5], ['e', 64, 1.5, 1], ['o', 59, 0.5], ['e', 62, 1, 1], ['o', 57, 0.5], ['e', 62, 2, 1]] },
    // "NI-PPON! (palma palma palma)" (Seleção)
    nippon: { bpm: 120, rep: 6, notes: [['i', 64, 0.5, 1], ['o', 60, 1], ['-', 0, 0.5], ['P', 0, 0.5], ['P', 0, 0.5], ['P', 0, 1]] },
    // "VA-MOS! VA-MOS!" (liga e Copa)
    vamos: { bpm: 124, rep: 4, notes: [['a', 62, 0.5, 1], ['o', 65, 1], ['-', 0, 0.5], ['a', 62, 0.5, 1], ['o', 65, 1], ['P', 0, 0.5]] },
    // hino longo "ô-ô-ô-ô" (todos)
    hino: { bpm: 92, rep: 1, notes: [['o', 57, 2], ['o', 62, 2], ['o', 64, 1.5], ['o', 62, 0.5], ['o', 66, 3, 1], ['o', 64, 1], ['o', 62, 2], ['o', 59, 2], ['o', 62, 4, 1]] }
  };
  const SETS = { japan: ['nippon', 'nippon', 'hino', 'ole'], worldcup: ['ole', 'vamos', 'hino', 'ole'], pro: ['vamos', 'ole', 'hino', 'vamos'] };
  // o coro: 7 serras desafinadas (3 uma oitava abaixo) com vibrato, pelos formantes da
  // vogal; um grupo de nós só para o canto inteiro (as notas são automações). As sílabas,
  // palmas e a batucada são agendadas aos poucos, só o que cabe na janela do relógio (no
  // máximo uns 0,4 s à frente): poucos nós vivos de cada vez.
  function chant(t0, name) {
    const g = T.g;
    const ctx = g.ctx;
    const C = CHANTS[name];
    const beat = 60 / C.bpm;
    const seq = [];
    let t = t0;
    for (let r = 0; r < C.rep; r++) {
      C.notes.forEach((n) => {
        seq.push({ t, v: n[0], m: n[1], d: n[2] * beat, acc: n[3] || 0 });
        t += n[2] * beat;
      });
    }
    const end = t + 0.3;
    const env = ctx.createGain();
    env.gain.value = 0.0001;
    const fa = ctx.createBiquadFilter();
    fa.type = 'bandpass';
    fa.Q.value = 2.5;
    const fb = ctx.createBiquadFilter();
    fb.type = 'bandpass';
    fb.Q.value = 3.5;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    env.connect(fa);
    env.connect(fb);
    fa.connect(lp);
    fb.connect(lp);
    lp.connect(g.ev);
    const nodes = [env, fa, fb, lp];
    const oscs = [];
    for (let i = 0; i < 7; i++) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.detune.value = (rnd() - 0.5) * 70 + (i < 3 ? -1200 : 0);
      o.connect(env);
      nodes.push(o);
      oscs.push(o);
    }
    const vib = ctx.createOscillator();
    vib.frequency.value = 4.6;
    const vg = ctx.createGain();
    vg.gain.value = 9;
    vib.connect(vg);
    oscs.forEach((o) => vg.connect(o.detune));
    nodes.push(vib, vg);
    env.gain.setTargetAtTime(0.0001, end - 0.25, 0.08);
    oscs.forEach((o) => o.start(t0));
    vib.start(t0);
    oscs.forEach((o, i) => (i ? o.stop(end + 0.4) : 0));
    vib.stop(end + 0.4);
    oneShot(oscs[0], nodes, end + 0.4);
    return { seq, i: 0, beat, end, nb: t0, env, oscs, fa, fb, lastV: null };
  }
  const CHANT_AMP = 0.11;
  function chantStep(J, ahead) {
    while (J.i < J.seq.length && J.seq[J.i].t <= ahead) {
      const s = J.seq[J.i++];
      if (s.v === 'P') {
        clap(s.t, 0.55, -0.15);
        clap(s.t + 0.012, 0.45, 0.2);
        drum(s.t, 'bumbo', 0.28);
        continue;
      }
      if (s.v === '-' || s.v === 'B') {
        if (s.v === 'B') drum(s.t, 'bumbo', 0.3);
        J.env.gain.setTargetAtTime(0.0001, s.t, 0.04);
        continue;
      }
      const f = mtof(s.m);
      J.oscs.forEach((o) => o.frequency.setTargetAtTime(f, s.t, 0.025));
      const v = VOW[s.v];
      if (s.v !== J.lastV) {
        J.fa.frequency.setTargetAtTime(v[0], s.t, 0.02);
        J.fb.frequency.setTargetAtTime(v[1], s.t, 0.02);
        J.lastV = s.v;
      }
      // cada sílaba ataca (um pouco mais forte no acento) e cai um pouco até a próxima
      const a = CHANT_AMP * (s.acc ? 1.25 : 1);
      J.env.gain.setTargetAtTime(a, s.t, 0.03);
      J.env.gain.setTargetAtTime(a * 0.55, s.t + Math.min(0.18, s.d * 0.5), Math.max(0.05, s.d * 0.5));
      if (s.acc) drum(s.t, 'bumbo', 0.32);
    }
    // a batucada acompanha (bumbo nos tempos, caixa no contratempo)
    while (J.nb <= ahead && J.nb < J.end - J.beat) {
      const b = J.nb;
      drum(b, 'bumbo', 0.2);
      drum(b + J.beat / 2, 'caixa', 0.18);
      if (rnd() < 0.5) drum(b + J.beat * 0.75, 'caixa', 0.12);
      J.nb += J.beat;
    }
  }

  // ---------------------------------------------------------------- o relógio (10x por s)
  function tick() {
    const w = want();
    const g = T.g;
    if (!w) {
      // silêncio: desce e, depois de 1,2 s calado, desmonta tudo
      if (g) {
        const t = g.ctx.currentTime;
        g.out.gain.setTargetAtTime(0.0001, t, 0.25);
        if (!T.quietAt) T.quietAt = t;
        else if (t - T.quietAt > 1.2 || SFX.muted) teardown();
      }
      return;
    }
    T.quietAt = 0;
    if (!T.g || T.g.ctx !== SFX.ctx) {
      teardown();
      T.g = build();
    }
    const G = T.g;
    const ctx = G.ctx;
    const now = ctx.currentTime;
    T.kind = w.kind;
    T.ctx = w.ctx;
    // animação: cai devagar para a base (mais alta na partida quando o time ataca)
    if (performance.now() > T.hypeUntil) T.hypeT = w.ctx === 'partida' ? 0.3 + 0.6 * T.tension : w.ctx === 'cena' ? 0.35 : 0.3;
    T.hype += (T.hypeT - T.hype) * 0.08;
    const h = T.hype;
    // volume, abafado e o rugido (mais alto e mais claro com a torcida animada)
    G.out.gain.setTargetAtTime(Math.max(0.0001, w.vol), now, 0.35);
    G.muf.frequency.setTargetAtTime(w.muffle ? 620 : 16000, now, 0.2);
    // (o mar de gente sobe e desce sozinho um pouco: 0,85..1,15)
    const sway = 0.85 + rnd() * 0.3;
    G.bed.gain.setTargetAtTime((0.045 + 0.075 * h) * sway, now, 0.45);
    G.lp.frequency.setTargetAtTime(1100 + 1400 * h, now, 0.3);
    if (G.babG) G.babG.gain.setTargetAtTime((0.55 + 0.65 * h) * (0.9 + rnd() * 0.2), now, 0.4);
    // eventos até 0,35 s à frente
    const N = T.next;
    const ahead = now + 0.35;
    const due = (k, a, b) => {
      if (T.quiet) return false; // (testes: só o rugido)
      if (N[k] === undefined) N[k] = now + a * rnd() + 0.3;
      if (N[k] > ahead) return false;
      const t = Math.max(now + 0.02, N[k]);
      N[k] = t + a + rnd() * (b - a);
      return t;
    };
    let t;
    // gritos soltos (mais com a torcida animada)
    if ((t = due('shout', 0.25 / (0.4 + h), 1.6 / (0.4 + h)))) shout(t, 0.035 + 0.04 * h);
    // cantos: um a cada 10-22 s (na cena, menos); entre eles, palmas e "uuuh" de vez em quando
    if (T.chant && now > T.chant.end) T.chant = null;
    const busy = !!T.chant;
    if (!busy && !T.quiet && (t = due('chant', w.ctx === 'cena' ? 14 : 9, w.ctx === 'cena' ? 26 : 20))) T.chant = chant(t, pick(SETS[w.kind] || SETS.worldcup));
    if (T.chant) chantStep(T.chant, ahead);
    if (!busy && (t = due('clap', 5, 14))) {
      const n = 3 + Math.floor(rnd() * 5);
      for (let i = 0; i < n; i++) clap(t + i * 0.42, 0.35, rnd() * 0.6 - 0.3);
    }
    if ((t = due('ooh', 18, 40))) wave(t, rnd() < 0.5 ? 'u' : 'o', 230, 170, 1.6, 0.03 + 0.02 * h);
    // a organizada não para: bumbo marcando de leve fora dos cantos
    if (!busy && h > 0.45 && (t = due('beat', 0.5, 0.5))) drum(t, 'bumbo', 0.12 + 0.1 * h);
    if (w.kind === 'worldcup' && (t = due('horn', 6, 16))) horn(t);
  }
  setInterval(() => {
    try {
      tick();
    } catch (e) {
      // (um erro no som nunca derruba o jogo: desliga a torcida)
      teardown();
    }
  }, 100);

  // ---------------------------------------------------------------- reações
  function react(kind, big) {
    // (a torcida do estádio 3D reage mesmo com o som desligado)
    const est = window.HubEstadio;
    if (est && est.excite) {
      if (kind === 'gol') est.excite(1, big ? 9 : 7);
      else if (kind === 'uuh') est.excite(0.7, 2.5);
      else if (kind === 'sofreu') est.excite(0.12, 6);
    }
    const g = T.g;
    if (!g) return;
    const ctx = g.ctx;
    const t = ctx.currentTime + 0.03;
    if (kind === 'gol') {
      // o estádio explode: "AAAAH" subindo, aplauso, batucada e um canto logo depois
      T.hypeT = 1;
      T.hypeUntil = performance.now() + (big ? 9000 : 7000);
      T.hype = Math.max(T.hype, 0.85);
      g.bed.gain.cancelScheduledValues(t);
      g.bed.gain.setTargetAtTime(0.2, t, 0.08);
      wave(t, 'a', 200, 290, big ? 3.6 : 2.8, 0.085);
      wave(t + 0.15, 'a', 300, 400, big ? 3 : 2.4, 0.04);
      applause(t + 0.5, big ? 7 : 5.5, 0.5);
      for (let i = 0; i < 10; i++) shout(t + 0.2 + rnd() * 2.5, 0.06);
      for (let b = 0; b < 12; b++) drum(t + 1.2 + b * 0.24, b % 2 ? 'caixa' : 'bumbo', 0.3);
      T.next.chant = t + (big ? 3.4 : 3);
    } else if (kind === 'uuh') {
      // quase: "uuuuh" de todo mundo e umas palmas de incentivo
      wave(t, 'u', 240, 175, 1.5, 0.06);
      T.hypeT = 0.7;
      T.hypeUntil = performance.now() + 2500;
      for (let i = 0; i < 4; i++) clap(t + 1.3 + i * 0.4, 0.3);
    } else if (kind === 'sofreu') {
      // gol do outro time: lamento e a torcida murcha um pouco
      wave(t, 'o', 210, 140, 1.8, 0.05);
      T.hypeT = 0.12;
      T.hypeUntil = performance.now() + 6000;
      T.next.chant = t + 7;
    }
  }
  // liga nos sons do jogo (partida e cenas de cinema chamam estes)
  const wrap = (name, fn) => {
    const f0 = SFX[name];
    if (typeof f0 !== 'function') return;
    SFX[name] = function () {
      const r = f0.apply(this, arguments);
      try {
        fn.apply(this, arguments);
      } catch (e) {}
      return r;
    };
  };
  wrap('goal', (big) => react('gol', !!big));
  wrap('save', () => react('uuh'));
  wrap('post', () => react('uuh'));
  wrap('concede', () => react('sofreu'));
  // a partida: a torcida sobe quando o seu time chega perto do gol (0..1)
  wrap('crowdTension', (level) => (T.tension = Math.max(0, Math.min(1, level || 0))));
  wrap('toggleMute', () => {
    if (SFX.muted) teardown();
  });

  window.Torcida = {
    // (para os testes) estado e contagem de nós de um tiro só
    get info() {
      return { on: !!T.g, kind: T.kind, ctx: T.ctx, hype: Math.round(T.hype * 100) / 100, live: T.live, made: T.stats.made, ended: T.stats.ended, babble: !!BUF.babble, persistent: T.g ? T.g.nodes.length : 0 };
    },
    want,
    stop: teardown,
    // (testes) quiet = sem eventos (só o rugido); chant = puxa um canto agora
    test: {
      quiet(b) {
        T.quiet = !!b;
      },
      off(b) {
        T.off = !!b;
      },
      chant(name) {
        if (T.g && !T.chant) T.chant = chant(T.g.ctx.currentTime + 0.05, name);
      }
    }
  };
})();
