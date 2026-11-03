// ============================================================================
// MÚSICA DAS CENAS — trilhas originais tocadas por um pequeno sintetizador
// (cordas, metais, piano elétrico, sinos, baixo e bateria, com reverb, eco e
// compressor). Cada tema tem seções (intro, A, B, C...) tocadas numa ordem que
// volta para loopFrom no fim, em vez de um laço curto de 4 compassos.
//
// Notação das melodias: um compasso = 16 semicolcheias separadas por espaço.
//   "D5" = nota  •  "-" = segura a nota anterior  •  "." = pausa
// Acordes: 'Dm', 'Bb', 'F#', 'Gmaj7', 'Em7', 'C5' (quinta), 'Dsus4'...
//
// MÚSICA PRÓPRIA: um arquivo musica/<tema>.mp3 toca no lugar da trilha
// sintetizada daquele tema (ex: musica/u20.mp3 = Blue Lock x Sub-20).
// A API continua a mesma: SFX.playMusic(id), SFX.stopMusic(fade), SFX.music.id.
// ============================================================================
(function () {
  const SFX = window.SFX;
  if (!SFX) return;

  // ---------------------------------------------------------------- padrões
  // Bateria: uma letra por semicolcheia ("x" = toca)
  const DRUMS = {
    drive: { kick: 'x.....x.x.....x.', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx' },
    rock: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    half: { kick: 'x.........x.....', snare: '........x.......', hat: 'x...x...x...x...' },
    taiko: { taiko: 'x.....x...x.x...', tom: '............x.xx' },
    epic: { taiko: 'x.......x.x.....', kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.' },
    four: { kick: 'x...x...x...x...', clap: '....x.......x...', ohat: '..x...x...x...x.', hat: '.x.x.x.x.x.x.x.x' },
    light: { kick: 'x.......x.......', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    heart: { heart: 'x..x............' },
    soft: { taiko: 'x...............' }
  };
  // Baixo: 1 = fundamental, 2 = oitava acima; dur em semicolcheias
  const BASS = {
    drive16: { p: [1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1], dur: 0.9 },
    drive8: { p: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], dur: 1.8 },
    walk8: { p: [1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0], dur: 1.8 },
    gallop: { p: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 2, 1], dur: 0.9 },
    pulse: { p: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], dur: 7 },
    hold: { p: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], dur: 15.5 }
  };
  // Arpejo: índice da nota do acorde (passando do tamanho = oitava acima), -1 = pausa
  const ARP = {
    up16: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],
    updown8: [0, -1, 1, -1, 2, -1, 3, -1, 4, -1, 3, -1, 2, -1, 1, -1],
    ostinato: [0, 0, 2, 0, 1, 0, 2, 1, 0, 0, 2, 0, 1, 0, 2, 1],
    broken8: [0, -1, 2, -1, 1, -1, 3, -1, 0, -1, 2, -1, 1, -1, 3, -1],
    slow4: [0, -1, -1, -1, 1, -1, -1, -1, 2, -1, -1, -1, 3, -1, -1, -1]
  };
  // Metais (acorde inteiro) nos tempos marcados
  const STAB = {
    push: 'x.....x...x.....',
    one: 'x.......x.......'
  };

  // ---------------------------------------------------------------- temas
  const THEMES = {
    // BLUE LOCK x SUB-20 (Estádio Nacional): ré menor, rápido, rock orquestral
    // Rin x Sae: ré menor frígio (o Mi bemol = ameaça), ostinato grave, timbre escuro,
    // nada de arpejo agudo nem cadência maior (a versão anterior soava feliz)
    u20: {
      bpm: 138, dark: true, arpInst: 'pluck', arpOct: 0, order: ['intro', 'A', 'B', 'A', 'C', 'B'], loopFrom: 1,
      sections: {
        intro: { chords: ['Dm', 'Eb', 'Dm', 'Eb'], pad: 0.022, padCut: 600, bass: 'hold', drums: 'taiko', arp: 'ostinato', riser: true },
        A: {
          chords: ['Dm', 'Eb', 'Dm', 'A', 'Dm', 'Eb', 'Bb', 'A'], lead: 'saw', pad: 0.016, padCut: 900, bass: 'gallop', drums: 'epic', arp: 'ostinato', stab: 'one', crash: true,
          mel: [
            'D5 - - - - - - - A4 - - - D5 - F5 -',
            'Eb5 - - - - - D5 - Bb4 - - - G4 - - -',
            'A4 - - - D5 - - - F5 - - - E5 - D5 -',
            'C#5 - - - - - - - E5 - - - A4 - - -',
            'D5 - - - - - F5 - A5 - - - G5 - F5 -',
            'G5 - - - - - F5 - Eb5 - - - D5 - Bb4 -',
            'F5 - - - - - D5 - Bb4 - - - C5 - D5 -',
            'C#5 - - - - - - - - - - - . . . .'
          ]
        },
        B: {
          chords: ['Gm', 'Dm', 'Eb', 'A', 'Gm', 'Dm', 'Bb', 'A'], lead: 'saw', double: true, pad: 0.02, padCut: 1000, bass: 'drive16', drums: 'drive', arp: 'ostinato', stab: 'push', crash: true,
          mel: [
            'Bb5 - - - - - A5 - G5 - - - D5 - - -',
            'F5 - - - - - E5 - D5 - - - A4 - - -',
            'G5 - - - - - Bb5 - Eb6 - - - D6 - - -',
            'C#6 - - - - - - - A5 - - - E5 - - -',
            'D6 - - - - - C6 - Bb5 - - - A5 - G5 -',
            'A5 - - - - - - - F5 - - - D5 - - -',
            'F5 - - - G5 - - - A5 - - - Bb5 - - -',
            'A5 - - - - - - - E5 - - - C#5 - - -'
          ]
        },
        C: {
          chords: ['Dm', 'Eb', 'Dm', 'C#dim'], lead: 'keys', pad: 0.024, padCut: 650, bass: 'pulse', drums: 'heart', riser: true,
          mel: [
            'A4 - - - - - - - . . . . D5 - - -',
            'Eb5 - - - - - - - D5 - - - - - - -',
            'F5 - - - - - E5 - D5 - - - - - - -',
            'C#5 - - - - - - - E5 - - - G5 - - -'
          ]
        }
      }
    },
    // Despertar / discurso / Reação Química: ré menor heroico, cordas, metais e taikos
    epic: {
      bpm: 96, arpInst: 'pluck', order: ['intro', 'A', 'B', 'A', 'B'], loopFrom: 1,
      sections: {
        intro: { chords: ['Dm', 'Dm'], pad: 0.022, bass: 'hold', drums: 'soft', riser: true },
        A: {
          chords: ['Dm', 'Bb', 'F', 'C'], lead: 'saw', pad: 0.02, bass: 'drive8', drums: 'epic', arp: 'broken8', stab: 'one', crash: true,
          mel: [
            'D5 - - - - - F5 - A5 - - - - - G5 -',
            'F5 - - - - - D5 - Bb4 - - - - - - -',
            'C5 - - - F5 - - - A5 - - - C6 - - -',
            'Bb5 - - - A5 - - - G5 - - - - - - -'
          ]
        },
        B: {
          chords: ['Gm', 'Dm', 'Bb', 'A'], lead: 'saw', double: true, pad: 0.022, bass: 'drive8', drums: 'epic', arp: 'up16', stab: 'push', crash: true, riser: true,
          mel: [
            'G5 - - - Bb5 - - - D6 - - - C6 - Bb5 -',
            'A5 - - - - - - - F5 - - - D5 - - -',
            'F5 - - - G5 - - - A5 - - - Bb5 - C6 -',
            'C#6 - - - - - - - E6 - - - - - - -'
          ]
        }
      }
    },
    // Comemoração: dó maior, sinos, metais e bateria de estádio
    victory: {
      bpm: 124, arpInst: 'pluck', order: ['A', 'B'], loopFrom: 0,
      sections: {
        A: {
          chords: ['C', 'G', 'Am', 'F'], lead: 'saw', pad: 0.014, bass: 'walk8', drums: 'four', arp: 'up16', crash: true,
          mel: [
            'E5 - G5 - C6 - - - B5 - G5 - E5 - - -',
            'D5 - - - G5 - - - B5 - A5 - G5 - - -',
            'A5 - - - C6 - - - E6 - D6 - C6 - - -',
            'A5 - - - - - G5 - F5 - - - . . . .'
          ]
        },
        B: {
          chords: ['F', 'G', 'C', 'C'], lead: 'saw', double: true, pad: 0.016, bass: 'walk8', drums: 'four', arp: 'up16', stab: 'push', crash: true,
          mel: [
            'A5 - - - C6 - - - F6 - - - E6 - D6 -',
            'D6 - - - B5 - - - G5 - - - A5 - B5 -',
            'C6 - - - - - - - G5 - - - E5 - G5 -',
            'C6 - - - - - - - - - - - . . . .'
          ]
        }
      }
    },
    // Clássico / gol de roteiro / tensão: mi menor, ostinato e baixo galopando
    tension: {
      bpm: 108, arpInst: 'pluck', order: ['A', 'B'], loopFrom: 0,
      sections: {
        A: { chords: ['Em', 'Em', 'C', 'B'], pad: 0.018, padCut: 900, bass: 'gallop', drums: 'rock', arp: 'ostinato' },
        B: {
          chords: ['Am', 'Em', 'C', 'B'], lead: 'saw', pad: 0.018, padCut: 1100, bass: 'gallop', drums: 'rock', arp: 'ostinato', stab: 'one', crash: true, riser: true,
          mel: [
            'E5 - - - - - - - G5 - - - F#5 - - -',
            'E5 - - - - - - - B4 - - - - - - -',
            'C5 - - - E5 - - - G5 - - - A5 - - -',
            'B5 - - - - - - - D#5 - - - - - - -'
          ]
        }
      }
    },
    // Viagem para a Espanha: sol maior com sétimas, piano elétrico e dedilhado
    travel: {
      bpm: 100, arpInst: 'pluck', order: ['A', 'B'], loopFrom: 0,
      sections: {
        A: {
          chords: ['Gmaj7', 'Em7', 'Cmaj7', 'D'], lead: 'keys', pad: 0.012, bass: 'walk8', drums: 'light', arp: 'updown8',
          mel: [
            'D5 - - B4 D5 - E5 - D5 - - - B4 - - -',
            'G4 - - - - - - - . . B4 - D5 - E5 -',
            'G5 - - - F#5 - E5 - D5 - - - E5 - - -',
            'F#5 - - - - - - - A5 - - - - - - -'
          ]
        },
        B: {
          chords: ['Am7', 'D', 'Bm7', 'Em7'], lead: 'keys', pad: 0.012, bass: 'walk8', drums: 'light', arp: 'updown8',
          mel: [
            'C6 - - - B5 - A5 - G5 - - - E5 - - -',
            'F#5 - - - - - D5 - . . E5 - F#5 - - -',
            'D5 - - - F#5 - - - A5 - - - B5 - - -',
            'G5 - - - - - - - - - - - . . . .'
          ]
        }
      }
    },
    // Ego / revelações: dó menor, grave e esparso
    mystery: {
      bpm: 64, arpInst: 'keys', order: ['A', 'B'], loopFrom: 0,
      sections: {
        A: {
          chords: ['Cm', 'Ab', 'Fm', 'G'], lead: 'bell', pad: 0.024, padCut: 700, bass: 'hold', arp: 'slow4',
          mel: [
            '. . . . G5 - - - - - - - Eb5 - - -',
            'C5 - - - - - - - . . . . . . . .',
            '. . . . Ab5 - - - - - G5 - F5 - - -',
            'D5 - - - - - - - B4 - - - - - - -'
          ]
        },
        B: {
          chords: ['Fm', 'Db', 'Cm', 'G'], lead: 'bell', pad: 0.026, padCut: 800, bass: 'hold', drums: 'soft', arp: 'slow4',
          mel: [
            'C6 - - - - - - - Ab5 - - - - - - -',
            'F5 - - - - - - - . . . . Db5 - - -',
            'Eb5 - - - - - G5 - C5 - - - - - - -',
            'B4 - - - - - - - D5 - - - - - - -'
          ]
        }
      }
    },
    // Fox / o Rin rival / depois da Copa: si menor, piano grave, coração batendo
    dread: {
      bpm: 54, arpInst: 'keys', order: ['A', 'B'], loopFrom: 0,
      sections: {
        A: {
          chords: ['Bm', 'G', 'Em', 'F#'], lead: 'keys', pad: 0.024, padCut: 520, bass: 'hold', drums: 'heart',
          mel: [
            '. . . . F#5 - - - - - - - D5 - - -',
            'B4 - - - - - - - . . . . . . . .',
            '. . G5 - - - F#5 - E5 - - - - - - -',
            'C5 - - - - - - - A#4 - - - - - - -'
          ]
        },
        B: {
          chords: ['Bm', 'Em', 'C', 'F#'], lead: 'keys', pad: 0.026, padCut: 600, bass: 'hold', drums: 'heart', riser: true,
          mel: [
            'D5 - - - - - C#5 - D5 - - - F#5 - - -',
            'G5 - - - - - - - . . E5 - - - - -',
            'E5 - - - - - D5 - C5 - - - - - - -',
            'A#4 - - - - - - - - - - - . . . .'
          ]
        }
      }
    },
    // Promessas / lembranças: lá menor, piano e violino
    promise: {
      bpm: 70, arpInst: 'keys', order: ['A', 'B'], loopFrom: 0,
      sections: {
        A: {
          chords: ['Am', 'F', 'C', 'G'], lead: 'keys', pad: 0.018, padCut: 1200, bass: 'hold', arp: 'broken8',
          mel: [
            'E5 - - - - - D5 - C5 - - - B4 - C5 -',
            'A4 - - - - - - - . . C5 - D5 - E5 -',
            'G5 - - - - - E5 - C5 - - - D5 - E5 -',
            'D5 - - - - - - - B4 - - - . . . .'
          ]
        },
        B: {
          chords: ['F', 'G', 'Em', 'Am'], lead: 'violin', pad: 0.02, padCut: 1400, bass: 'hold', arp: 'broken8',
          mel: [
            'A5 - - - - - G5 - F5 - - - E5 - D5 -',
            'D5 - - - - - E5 - B4 - - - - - - -',
            'E5 - - - - - D5 - E5 - G5 - B5 - - -',
            'A5 - - - - - - - - - - - . . . .'
          ]
        }
      }
    }
  };

  // ---------------------------------------------------------------- notação
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const noteNum = (s) => {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
    if (!m) return null;
    return NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
  };
  const QUAL = {
    '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], aug: [0, 4, 8],
    sus4: [0, 5, 7], sus2: [0, 2, 7], 5: [0, 7, 12], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14]
  };
  // Acorde com a fundamental entre C3 e B3
  const chordNotes = (sym) => {
    const m = /^([A-G])(#|b)?(.*)$/.exec(sym);
    const root = noteNum(m[1] + (m[2] || '') + '3');
    return (QUAL[m[3]] || QUAL['']).map((i) => root + i);
  };
  // Um compasso → 16 posições com { n, len } onde começa uma nota
  const parseBar = (str) => {
    const tok = str.trim().split(/\s+/);
    const out = new Array(16).fill(null);
    tok.slice(0, 16).forEach((tk, i) => {
      const n = noteNum(tk);
      if (n === null) return;
      let len = 1;
      while (tok[i + len] === '-') len++;
      out[i] = { n, len };
    });
    return out;
  };
  const compile = (th) => {
    if (th._c) return th;
    Object.values(th.sections).forEach((s) => {
      s.chordsN = s.chords.map(chordNotes);
      s.bars = s.chords.length;
      s.melN = (s.mel || []).map(parseBar);
    });
    th._c = true;
    return th;
  };

  Object.assign(SFX, {
    music: null,
    MUSIC_THEMES: THEMES,
    MUSIC_FILES: {},

    // ------------------------------------------------------------ arquivos próprios
    // Procura musica/<tema>.mp3 para cada tema (os que não existem só não carregam)
    probeMusicFiles() {
      if (this._probed) return;
      this._probed = true;
      Object.keys(THEMES).forEach((id) => {
        try {
          const a = new Audio();
          a.preload = 'auto';
          a.loop = true;
          a.addEventListener('canplaythrough', () => (this.MUSIC_FILES[id] = a), { once: true });
          a.src = `musica/${id}.mp3`;
        } catch (e) {
          /* sem suporte a <audio>: fica a trilha sintetizada */
        }
      });
    },

    fadeElement(a, to, secs, then) {
      clearInterval(a._fade);
      const from = a.volume;
      const t0 = performance.now();
      a._fade = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / (secs * 1000));
        a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
        if (k >= 1) {
          clearInterval(a._fade);
          if (then) then();
        }
      }, 40);
    },

    // ------------------------------------------------------------ efeitos da música
    // Compressor no fim, reverb (resposta de sala gerada) e eco estéreo
    musicFx() {
      if (this.mfx) return this.mfx;
      const ctx = this.ctx;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 10;
      comp.ratio.value = 3.5;
      comp.attack.value = 0.005;
      comp.release.value = 0.2;
      const out = ctx.createGain();
      out.gain.value = 0.95;
      comp.connect(out).connect(this.master);
      const len = Math.floor(ctx.sampleRate * 2.6);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
      }
      const rev = ctx.createConvolver();
      rev.buffer = ir;
      const revOut = ctx.createGain();
      revOut.gain.value = 0.55;
      rev.connect(revOut).connect(comp);
      const dl = ctx.createDelay(1.5);
      const dr = ctx.createDelay(1.5);
      const fb = ctx.createGain();
      fb.gain.value = 0.32;
      const dlp = ctx.createBiquadFilter();
      dlp.type = 'lowpass';
      dlp.frequency.value = 2600;
      const merge = ctx.createChannelMerger(2);
      dl.connect(dlp).connect(dr);
      dr.connect(fb).connect(dl);
      dl.connect(merge, 0, 0);
      dr.connect(merge, 0, 1);
      const dOut = ctx.createGain();
      dOut.gain.value = 0.5;
      merge.connect(dOut).connect(comp);
      this.mfx = { comp, rev, delayIn: dl, delays: [dl, dr] };
      return this.mfx;
    },

    // ------------------------------------------------------------ instrumentos
    // Cada nota cria seus nós e se desliga sozinha. m = trilha (bus seco + envios)
    voice(m, kind, n, t, dur, o = {}) {
      const ctx = this.ctx;
      const f = 440 * Math.pow(2, (n - 69) / 12);
      const amp = ctx.createGain();
      amp.gain.value = 0;
      let dest = m.bus;
      if (o.pan && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = o.pan;
        p.connect(m.bus);
        dest = p;
      }
      amp.connect(dest);
      const send = (node, lvl) => {
        if (!lvl) return;
        const g = ctx.createGain();
        g.gain.value = lvl;
        amp.connect(g).connect(node);
      };
      const osc = (type, freq, det = 0) => {
        const x = ctx.createOscillator();
        x.type = type;
        x.frequency.value = freq;
        x.detune.value = det;
        return x;
      };
      const filt = (type, freq, q = 0.7) => {
        const x = ctx.createBiquadFilter();
        x.type = type;
        x.frequency.value = freq;
        x.Q.value = q;
        return x;
      };
      const noise = (when, len) => {
        const s = ctx.createBufferSource();
        s.buffer = this.noiseBuf;
        s.loop = true;
        s.start(when, Math.random() * 1.5);
        s.stop(when + len + 0.05);
        return s;
      };
      const start = (nodes, end) =>
        nodes.forEach((x) => {
          x.start(t);
          x.stop(end + 0.05);
        });
      const g = amp.gain;
      // Ataque/sustentação/soltura (ADSR simples)
      const asr = (peak, a, len, r) => {
        g.setValueAtTime(0.0001, t);
        g.exponentialRampToValueAtTime(peak, t + a);
        g.setValueAtTime(peak, t + Math.max(a, len));
        g.exponentialRampToValueAtTime(0.0001, t + Math.max(a, len) + r);
        return t + Math.max(a, len) + r;
      };
      const perc = (peak, a, decay) => {
        g.setValueAtTime(0.0001, t);
        g.exponentialRampToValueAtTime(peak, t + a);
        g.exponentialRampToValueAtTime(0.0001, t + a + decay);
        return t + a + decay;
      };
      const vol = o.vol || 1;

      if (kind === 'strings') {
        const lp = filt('lowpass', o.cut || 1600, 0.5);
        lp.connect(amp);
        const xs = [osc('sawtooth', f, -9), osc('sawtooth', f, 9), osc('sawtooth', f / 2, 3)];
        xs.forEach((x) => x.connect(lp));
        start(xs, asr(o.peak || 0.02, Math.min(0.45, dur * 0.3), dur, 0.7));
        send(m.rev, 0.6);
      } else if (kind === 'saw' || kind === 'violin') {
        const violin = kind === 'violin';
        const lp = filt('lowpass', 1200, 1.2);
        lp.connect(amp);
        // o.dark: timbre mais fechado (temas sombrios)
        const k = o.dark ? 0.55 : 1;
        lp.frequency.setValueAtTime((violin ? 1400 : 1200) * k, t);
        lp.frequency.exponentialRampToValueAtTime((violin ? 2400 : 3400) * k, t + (violin ? 0.12 : 0.03));
        lp.frequency.exponentialRampToValueAtTime((violin ? 2000 : 2100) * k, t + 0.35);
        const xs = violin ? [osc('sawtooth', f, -5), osc('sawtooth', f, 5)] : [osc('sawtooth', f, -11), osc('sawtooth', f, 0), osc('sawtooth', f, 11)];
        // vibrato que entra devagar
        const lfo = osc('sine', violin ? 5.2 : 5.8);
        const lg = ctx.createGain();
        lg.gain.setValueAtTime(0, t);
        lg.gain.linearRampToValueAtTime(violin ? 14 : 9, t + 0.35);
        lfo.connect(lg);
        xs.forEach((x) => {
          lg.connect(x.detune);
          x.connect(lp);
        });
        const end = asr((violin ? 0.05 : 0.04) * vol, violin ? 0.09 : 0.012, dur, violin ? 0.3 : 0.14);
        start([...xs, lfo], end);
        send(m.rev, 0.35);
        send(m.dly, 0.22);
      } else if (kind === 'brass') {
        const lp = filt('lowpass', 500, 1.5);
        lp.connect(amp);
        lp.frequency.setValueAtTime(500, t);
        lp.frequency.exponentialRampToValueAtTime(2600, t + 0.05);
        lp.frequency.exponentialRampToValueAtTime(900, t + 0.05 + dur);
        const xs = [osc('sawtooth', f, -6), osc('sawtooth', f, 6)];
        xs.forEach((x) => x.connect(lp));
        start(xs, asr(0.028, 0.02, dur, 0.14));
        send(m.rev, 0.4);
      } else if (kind === 'keys') {
        // piano elétrico (FM): portadora + modulador na mesma frequência + "tine" agudo
        const car = osc('sine', f);
        const mod = osc('sine', f);
        const mg = ctx.createGain();
        mg.gain.setValueAtTime(f * 1.8, t);
        mg.gain.exponentialRampToValueAtTime(f * 0.15, t + 1.2);
        mod.connect(mg).connect(car.frequency);
        const tine = osc('sine', f * 14);
        const tg = ctx.createGain();
        tg.gain.setValueAtTime(f * 0.7, t);
        tg.gain.exponentialRampToValueAtTime(1, t + 0.08);
        tine.connect(tg).connect(car.frequency);
        car.connect(amp);
        start([car, mod, tine], perc(0.085 * vol, 0.004, Math.min(2.6, dur + 0.9)));
        send(m.rev, 0.45);
        send(m.dly, 0.15);
      } else if (kind === 'bell') {
        const car = osc('sine', f);
        const mod = osc('sine', f * 3.5);
        const mg = ctx.createGain();
        mg.gain.setValueAtTime(f * 2.2, t);
        mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.6);
        mod.connect(mg).connect(car.frequency);
        car.connect(amp);
        start([car, mod], perc(0.06 * vol, 0.003, 2.2));
        send(m.rev, 0.6);
        send(m.dly, 0.3);
      } else if (kind === 'pluck') {
        const lp = filt('lowpass', 3500, 2);
        lp.connect(amp);
        lp.frequency.setValueAtTime(o.dark ? 1600 : 3800, t);
        lp.frequency.exponentialRampToValueAtTime(o.dark ? 220 : 320, t + 0.28);
        const x = osc('sawtooth', f);
        x.connect(lp);
        start([x], perc(0.034 * vol, 0.003, 0.38));
        send(m.rev, 0.3);
        send(m.dly, 0.18);
      } else if (kind === 'bass') {
        const lp = filt('lowpass', 1400, 1);
        lp.connect(amp);
        lp.frequency.setValueAtTime(1500, t);
        lp.frequency.exponentialRampToValueAtTime(480, t + 0.12);
        const xs = [osc('sawtooth', f), osc('sine', f)];
        xs.forEach((x) => x.connect(lp));
        start(xs, asr(0.1, 0.005, dur, 0.08));
      } else if (kind === 'kick' || kind === 'heart') {
        const heart = kind === 'heart';
        const x = osc('sine', heart ? 80 : 160);
        x.frequency.setValueAtTime(heart ? 80 : 160, t);
        x.frequency.exponentialRampToValueAtTime(heart ? 38 : 42, t + (heart ? 0.2 : 0.14));
        x.connect(amp);
        start([x], perc(heart ? 0.3 : 0.38, 0.003, heart ? 0.4 : 0.32));
        if (!heart) {
          const c = filt('highpass', 3000);
          const cg = ctx.createGain();
          cg.gain.setValueAtTime(0.05, t);
          cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
          noise(t, 0.02).connect(c).connect(cg).connect(dest);
        }
      } else if (kind === 'snare' || kind === 'clap') {
        const clap = kind === 'clap';
        const bp = filt('bandpass', clap ? 1300 : 1900, 0.7);
        bp.connect(amp);
        noise(t, 0.25).connect(bp);
        if (clap) {
          g.setValueAtTime(0.0001, t);
          [0, 0.012, 0.024].forEach((d, i) => {
            g.exponentialRampToValueAtTime(0.12, t + d + 0.002);
            g.exponentialRampToValueAtTime(i === 2 ? 0.0001 : 0.02, t + d + (i === 2 ? 0.14 : 0.01));
          });
        } else {
          perc(0.15, 0.002, 0.17);
          const tn = osc('triangle', 200);
          tn.frequency.setValueAtTime(200, t);
          tn.frequency.exponentialRampToValueAtTime(160, t + 0.08);
          const tg = ctx.createGain();
          tg.gain.setValueAtTime(0.08, t);
          tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
          tn.connect(tg).connect(dest);
          start([tn], t + 0.12);
        }
        send(m.rev, 0.25);
      } else if (kind === 'hat' || kind === 'ohat') {
        const open = kind === 'ohat';
        const hp = filt('highpass', 7500, 0.8);
        hp.connect(amp);
        noise(t, open ? 0.3 : 0.06).connect(hp);
        perc(open ? 0.028 : 0.032, 0.001, open ? 0.22 : 0.035);
      } else if (kind === 'crash') {
        const hp = filt('highpass', 4500, 0.6);
        hp.connect(amp);
        noise(t, 2).connect(hp);
        perc(0.055, 0.002, 1.8);
        send(m.rev, 0.3);
      } else if (kind === 'taiko' || kind === 'tom') {
        const taiko = kind === 'taiko';
        const x = osc(taiko ? 'sine' : 'triangle', taiko ? 95 : 180);
        x.frequency.setValueAtTime(taiko ? 95 : 180, t);
        x.frequency.exponentialRampToValueAtTime(taiko ? 52 : 110, t + (taiko ? 0.3 : 0.16));
        x.connect(amp);
        start([x], perc(taiko ? 0.36 : 0.14, 0.003, taiko ? 0.7 : 0.22));
        if (taiko) {
          const lp = filt('lowpass', 420);
          const ng = ctx.createGain();
          ng.gain.setValueAtTime(0.14, t);
          ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
          noise(t, 0.15).connect(lp).connect(ng).connect(dest);
        }
        send(m.rev, taiko ? 0.4 : 0.2);
      } else if (kind === 'riser') {
        const bp = filt('bandpass', 400, 2);
        bp.connect(amp);
        bp.frequency.setValueAtTime(400, t);
        bp.frequency.exponentialRampToValueAtTime(6000, t + dur);
        noise(t, dur).connect(bp);
        g.setValueAtTime(0.0001, t);
        g.exponentialRampToValueAtTime(0.07, t + dur);
        g.setValueAtTime(0.0001, t + dur + 0.01);
        send(m.rev, 0.5);
      }
    },

    // Uma semicolcheia: acordes no começo do compasso, baixo, arpejo, metais, melodia e bateria
    musicStep(m, t) {
      const th = m.theme;
      const sec = th.sections[th.order[m.oi]];
      const s = m.s16;
      const bar = m.bar;
      const sx = m.sx;
      const chord = sec.chordsN[bar % sec.bars];
      if (s === 0) {
        if (sec.pad) chord.forEach((n) => this.voice(m, 'strings', n + 12, t, sx * 16, { peak: sec.pad, cut: sec.padCut }));
        if (sec.crash && bar === 0) this.voice(m, 'crash', 0, t, 0);
        if (sec.riser && bar === sec.bars - 1) this.voice(m, 'riser', 0, t, sx * 16);
      }
      if (sec.bass) {
        const b = BASS[sec.bass];
        const v = b.p[s];
        if (v) this.voice(m, 'bass', chord[0] - 12 + (v === 2 ? 12 : 0), t, sx * b.dur);
      }
      if (sec.arp) {
        const idx = ARP[sec.arp][s];
        if (idx >= 0) {
          const n = chord[idx % chord.length] + (th.arpOct ?? 12) + Math.floor(idx / chord.length) * 12;
          this.voice(m, th.arpInst || 'pluck', n, t, sx * 2, { pan: s % 2 ? 0.3 : -0.3, vol: th.arpInst === 'keys' ? 0.55 : 1, dark: th.dark });
        }
      }
      if (sec.stab && STAB[sec.stab][s] === 'x') chord.forEach((n) => this.voice(m, 'brass', n + 12, t, sx * 2.5));
      const ev = sec.lead && sec.melN.length ? sec.melN[bar % sec.melN.length][s] : null;
      if (ev) {
        this.voice(m, sec.lead, ev.n, t, ev.len * sx * 0.95, { dark: th.dark });
        if (sec.double) this.voice(m, sec.lead, ev.n - 12, t, ev.len * sx * 0.95, { vol: 0.5, dark: th.dark });
      }
      if (sec.drums) {
        const d = DRUMS[sec.drums];
        Object.keys(d).forEach((k) => {
          if (d[k][s] === 'x') this.voice(m, k, 0, t, 0, k === 'hat' ? { pan: s % 4 < 2 ? -0.2 : 0.2 } : {});
        });
      }
      // avança: semicolcheia → compasso → seção (no fim volta para loopFrom)
      m.s16++;
      if (m.s16 >= 16) {
        m.s16 = 0;
        m.bar++;
        if (m.bar >= sec.bars) {
          m.bar = 0;
          m.oi++;
          if (m.oi >= th.order.length) m.oi = th.loopFrom || 0;
        }
      }
    },

    // Toca um tema (para o anterior com fade). O mesmo que já está tocando continua.
    playMusic(id) {
      if (this.music && this.music.id === id) return;
      this.stopMusic(0.6);
      const file = this.MUSIC_FILES[id];
      if (file) {
        const m = { id, file };
        try {
          file.currentTime = 0;
        } catch (e) {
          /* ainda carregando */
        }
        file.volume = 0;
        file.muted = this.muted;
        const p = file.play();
        if (p && p.catch) p.catch(() => {});
        this.fadeElement(file, 0.6, 1.2);
        this.music = m;
        return;
      }
      const raw = THEMES[id];
      if (!raw || !this.ready()) return;
      const theme = compile(raw);
      const fx = this.musicFx();
      const t0 = this.ctx.currentTime;
      const sx = 60 / theme.bpm / 4;
      const bus = this.ctx.createGain();
      bus.gain.setValueAtTime(0.0001, t0);
      bus.gain.exponentialRampToValueAtTime(0.5, t0 + 1.2);
      bus.connect(fx.comp);
      // envios com o mesmo fade da trilha (o reverb não continua tocando depois do stop)
      const rev = this.ctx.createGain();
      rev.connect(fx.rev);
      const dly = this.ctx.createGain();
      dly.connect(fx.delayIn);
      [rev, dly].forEach((n) => {
        n.gain.setValueAtTime(0.0001, t0);
        n.gain.exponentialRampToValueAtTime(1, t0 + 1.2);
      });
      fx.delays.forEach((d) => d.delayTime.setValueAtTime(sx * 3, t0));
      const m = { id, theme, bus, rev, dly, sx, oi: 0, bar: 0, s16: 0, nextTime: t0 + 0.1 };
      // agenda as notas um pouco à frente do relógio do áudio
      m.timer = setInterval(() => {
        while (m.nextTime < this.ctx.currentTime + 0.3) {
          this.musicStep(m, m.nextTime);
          m.nextTime += sx;
        }
      }, 50);
      this.music = m;
    },

    stopMusic(fade = 0.9) {
      const m = this.music;
      if (!m) return;
      this.music = null;
      if (m.file) {
        const a = m.file;
        this.fadeElement(a, 0, fade, () => a.pause());
        return;
      }
      clearInterval(m.timer);
      const t = this.ctx.currentTime;
      [m.bus, m.rev, m.dly].forEach((n) => {
        n.gain.cancelScheduledValues(t);
        n.gain.setValueAtTime(Math.max(0.0001, n.gain.value), t);
        n.gain.exponentialRampToValueAtTime(0.0001, t + fade);
      });
      setTimeout(() => [m.bus, m.rev, m.dly].forEach((n) => n.disconnect()), (fade + 3) * 1000);
    }
  });

  // O mudo também vale para a música de arquivo; a procura dos arquivos começa no init
  const origMute = SFX.toggleMute;
  SFX.toggleMute = function () {
    origMute.call(this);
    if (this.music && this.music.file) this.music.file.muted = this.muted;
  };
  const origInit = SFX.init;
  SFX.init = function () {
    origInit.call(this);
    this.probeMusicFiles();
  };
})();
