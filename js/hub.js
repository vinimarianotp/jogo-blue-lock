// ============================================================================
// O QUARTO (hub 2.5D): no lugar do lobby de abas, você anda (WASD) pelo seu
// quarto, pelo corredor e pelas salas do Blue Lock. Vista 3/4: o chão é visto
// inclinado (FY), parede de fundo em pé, móveis com tampo e frente, sombras,
// luz do teto e letreiros em fonte de pixel. Tudo é desenhado num canvas
// pequeno (resolução da pixel art) e ampliado sem suavizar.
// Cada lugar abre uma aba de hoje: armário = PERFIL, mesa = ATRIBUTOS, mural =
// OBJETIVOS/CONQUISTAS, Monitor do Ego = HISTÓRIA, Sala de Treino = TREINOS,
// Refeitório = RELAÇÕES/EQUIPE, Loja = LOJA, Sala das Armas = ARMAS/FLUXO.
// O cenário muda com a história: Blue Lock → NEL (cores do clube) → pro.
// ============================================================================
(function () {
  const PR = () => window.PixelRenderer;
  const T = 16; // 1 ladrilho (px da pixel art)
  const FY = 0.62; // chão inclinado: 1 px de profundidade = 0,62 px na tela
  const WALL = 96; // altura da parede de fundo
  const RIM = 8; // espessura das paredes laterais/da frente (vistas de cima)
  const LAYERS = new Map(); // chão + parede de fundo de cada sala, já desenhados
  const VIG = new Map(); // vinhetas por tamanho de tela

  const sh = (c, k) => PR().shade(c, k);
  const R = (g, x, y, w, h, c) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // ---------------------------------------------------------------- fonte 3x5
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
    9: '111101111001110', '-': '000000111000000', '.': '000000000000010', '!': '010010010000010', ':': '000010000010000',
    "'": '010010000000000', '/': '001001010100100', '+': '000010111010000', '#': '101111101111101', '?': '110001010000010', ',': '000000000010100', '(': '010100100100010', ')': '010001001001010'
  };
  const PLAIN = { Á: 'A', À: 'A', Â: 'A', Ã: 'A', É: 'E', Ê: 'E', Í: 'I', Ó: 'O', Ô: 'O', Õ: 'O', Ú: 'U', Ç: 'C' };
  function ptext(g, str, x, y, color, s = 1, align = 'left') {
    const txt = String(str).toUpperCase().split('').map((c) => PLAIN[c] || c);
    const wTot = txt.length * 4 * s - s;
    let cx = Math.round(align === 'center' ? x - wTot / 2 : align === 'right' ? x - wTot : x);
    g.fillStyle = color;
    txt.forEach((c) => {
      const bits = FONT[c];
      if (bits) {
        for (let i = 0; i < 15; i++) if (bits[i] === '1') g.fillRect(cx + (i % 3) * s, Math.round(y) + Math.floor(i / 3) * s, s, s);
      }
      cx += 4 * s;
    });
    return wTot;
  }

  // ---------------------------------------------------------------- temas
  // A paleta muda com a fase da carreira; acc = cor de destaque (LED, letreiros)
  function themeFor(st) {
    const s = st || window.App?.state || {};
    const ch = window.App?.getChapter?.();
    if (ch?.league === 'pro' || s.proClub) {
      const club = window.PRO_CLUBS?.[s.proClub];
      return { id: 'pro', name: 'APARTAMENTO', acc: club?.color || '#f59e0b', acc2: club?.secondary || '#fde68a', wall: '#3b2f2a', wallTop: '#1c1512', floorA: '#7c4a2d', floorB: '#6b3f26', floorLine: '#4a2a18', metal: '#57534e', led: '#fbbf24', dark: 0.28 };
    }
    if (s.nelUnlocked || ch?.nelPhase !== undefined) {
      const club = window.NEL_CLUBS?.[s.nelClub];
      const acc = club?.color || '#ef4444';
      return { id: 'nel', name: club ? club.name.toUpperCase() : 'NEL', acc, acc2: club?.secondary || '#111827', wall: '#161a22', wallTop: '#07090d', floorA: '#262b35', floorB: '#20242d', floorLine: '#13161c', metal: '#4b5563', led: acc, dark: 0.34 };
    }
    return { id: 'bluelock', name: 'BLUE LOCK', acc: '#22d3ee', acc2: '#1d4ed8', wall: '#0e1a33', wallTop: '#050a16', floorA: '#1b2538', floorB: '#172033', floorLine: '#0d1424', metal: '#475569', led: '#22d3ee', dark: 0.36 };
  }

  // ---------------------------------------------------------------- peças
  // Caixa 2.5D: pegada (x, y, w, d) no chão, altura h. top/front = cores das faces
  function box(g, S, x, y, w, d, h, top, front, opt = {}) {
    const sx = S.sx(x);
    const yb = S.sy(y + d);
    const yt = S.sy(y);
    const dh = yb - yt;
    const ol = opt.outline || 'rgba(2,6,23,0.85)';
    R(g, sx - 1, yt - h - 1, w + 2, dh + h + 2, ol);
    R(g, sx, yb - h, w, h, front);
    R(g, sx, yt - h, w, dh, top);
    // luz na quina de cima e sombra embaixo
    R(g, sx, yt - h, w, 1, sh(top, 0.25));
    R(g, sx, yb - h, w, 1, sh(front, 0.2));
    R(g, sx, yb - 2, w, 2, sh(front, -0.25));
    return { sx, yt: yt - h, yb, dh };
  }
  // Sombra suave no chão (pontilhada em 3 anéis, sem gradiente)
  function shadow(g, S, cx, cy, rx, a = 0.35) {
    const x = S.sx(cx);
    const y = S.sy(cy);
    [[1, 0.5], [0.75, 0.75], [0.5, 1]].forEach(([k, m]) => {
      g.fillStyle = `rgba(2,6,23,${a * m})`;
      g.beginPath();
      g.ellipse(Math.round(x), Math.round(y), Math.max(1, rx * k), Math.max(1, rx * k * 0.38), 0, 0, Math.PI * 2);
      g.fill();
    });
  }

  // ---------------------------------------------------------------- props
  // Cada prop: { x, y, w, d, h, draw(g, S, th) } em px do chão; o desenho é ordenado
  // pela frente (y + d). solid = bloqueia a passagem; act = o que a tecla E faz perto.
  const P = {
    bed(x, y, opt = {}) {
      return {
        x, y, w: 44, d: 76, h: 14, solid: true, ...opt,
        draw(g, S, th) {
          const c = opt.color || th.acc2;
          shadow(g, S, x + 22, y + 74, 30, 0.3);
          const b = box(g, S, x, y, 44, 76, 12, '#64748b', '#334155');
          // colchão e lençol
          const m = box(g, S, x + 2, y + 2, 40, 72, 16, '#e2e8f0', '#cbd5e1');
          const ly = S.sy(y + 30) - 16;
          R(g, m.sx, ly, 40, S.sy(y + 74) - ly - 16, c);
          R(g, m.sx, ly, 40, 2, sh(c, 0.3));
          R(g, m.sx, S.sy(y + 74) - 16, 40, 16, sh(c, -0.25));
          // travesseiro
          R(g, m.sx + 6, S.sy(y + 6) - 18, 28, 9, '#f8fafc');
          R(g, m.sx + 6, S.sy(y + 6) - 10, 28, 2, '#cbd5e1');
          // cabeceira de metal
          R(g, b.sx - 1, S.sy(y) - 34, 46, 4, th.metal);
          R(g, b.sx - 1, S.sy(y) - 34, 3, 22, th.metal);
          R(g, b.sx + 42, S.sy(y) - 34, 3, 22, th.metal);
          R(g, b.sx - 1, S.sy(y) - 34, 46, 1, sh(th.metal, 0.4));
        }
      };
    },
    locker(x, y, opt = {}) {
      return {
        x, y, w: 30, d: 16, h: 62, solid: true, ...opt,
        draw(g, S, th) {
          shadow(g, S, x + 15, y + 15, 18, 0.3);
          // (opt.wood = guarda-roupa de madeira do apartamento)
          const mc = opt.wood ? '#7c4a2d' : th.metal;
          const b = box(g, S, x, y, 30, 16, 62, sh(mc, 0.15), mc);
          R(g, b.sx + 14, b.yb - 60, 2, 58, sh(mc, -0.35));
          [0, 1].forEach((k) => {
            const xx = b.sx + 3 + k * 15;
            if (!opt.wood) for (let i = 0; i < 4; i++) R(g, xx, b.yb - 56 + i * 3, 9, 1, sh(mc, -0.3));
            else R(g, xx + 1, b.yb - 56, 8, 48, sh(mc, 0.08));
            R(g, xx + 9, b.yb - 30, 2, 6, opt.wood ? '#fbbf24' : '#e5e7eb');
          });
          // número e faixa da cor do time
          R(g, b.sx, b.yb - 62, 30, 3, th.acc);
          if (!opt.wood) ptext(g, opt.label || '05', b.sx + 15, b.yb - 46, '#f8fafc', 1, 'center');
        }
      };
    },
    desk(x, y, opt = {}) {
      return {
        x, y, w: 52, d: 22, h: 24, solid: true, ...opt,
        draw(g, S, th) {
          shadow(g, S, x + 26, y + 21, 30, 0.28);
          const b = box(g, S, x, y, 52, 22, 22, '#475569', '#1e293b');
          R(g, b.sx + 3, b.yb - 20, 20, 16, '#0f172a');
          R(g, b.sx + 4, b.yb - 14, 18, 1, '#334155');
          // monitor (aceso: a tela dos atributos)
          const mx = b.sx + 26;
          const my = b.yt - 26;
          R(g, mx - 1, my - 1, 24, 18, '#020617');
          R(g, mx, my, 22, 16, '#0b1220');
          R(g, mx + 1, my + 1, 20, 14, sh(th.acc, -0.55));
          for (let i = 0; i < 4; i++) R(g, mx + 3, my + 3 + i * 3, 4 + ((i * 5) % 11), 1, th.acc);
          R(g, mx + 14, my + 3, 5, 9, sh(th.acc, -0.2));
          R(g, mx + 9, my + 16, 4, 4, '#334155');
          R(g, mx + 6, my + 19, 10, 2, '#334155');
          // teclado e caneca
          R(g, b.sx + 5, b.yt + 2, 16, 3, '#cbd5e1');
          R(g, b.sx + 5, b.yt + 4, 16, 1, '#94a3b8');
          R(g, b.sx + 44, b.yt - 2, 4, 5, '#f8fafc');
          R(g, b.sx + 48, b.yt - 1, 1, 3, '#f8fafc');
        }
      };
    },
    chair(x, y) {
      return {
        x, y, w: 16, d: 12, h: 26, solid: false,
        draw(g, S) {
          shadow(g, S, x + 8, y + 11, 10, 0.25);
          box(g, S, x + 1, y + 2, 14, 10, 12, '#334155', '#1e293b');
          const sx = S.sx(x);
          const yt = S.sy(y + 2) - 12;
          R(g, sx + 2, yt - 14, 12, 14, '#1e293b');
          R(g, sx + 3, yt - 13, 10, 12, '#334155');
        }
      };
    },
    rug(x, y, w, d, color) {
      return {
        x, y, w, d, h: 0, solid: false, flat: true,
        draw(g, S, th) {
          const c = color || th.acc2;
          const sx = S.sx(x);
          const y0 = S.sy(y);
          const hh = S.sy(y + d) - y0;
          R(g, sx, y0, w, hh, sh(c, -0.3));
          R(g, sx + 2, y0 + 2, w - 4, hh - 4, sh(c, -0.1));
          R(g, sx + 5, y0 + 4, w - 10, 1, sh(c, 0.25));
          R(g, sx + 5, y0 + hh - 5, w - 10, 1, sh(c, 0.25));
        }
      };
    },
    ball(x, y) {
      return {
        x, y, w: 8, d: 6, h: 8, solid: false,
        draw(g, S) {
          shadow(g, S, x + 4, y + 5, 5, 0.3);
          const sx = S.sx(x);
          const sy = S.sy(y + 5) - 9;
          R(g, sx + 1, sy, 6, 8, '#0f172a');
          R(g, sx, sy + 1, 8, 6, '#0f172a');
          R(g, sx + 1, sy + 1, 6, 6, '#f8fafc');
          R(g, sx + 3, sy + 3, 2, 2, '#0f172a');
          R(g, sx + 1, sy + 1, 2, 1, '#0f172a');
          R(g, sx + 5, sy + 5, 2, 1, '#0f172a');
        }
      };
    },
    plant(x, y) {
      return {
        x, y, w: 14, d: 10, h: 30, solid: true,
        draw(g, S) {
          shadow(g, S, x + 7, y + 9, 9, 0.3);
          const b = box(g, S, x + 2, y + 2, 10, 8, 10, '#9a3412', '#7c2d12');
          const cx = b.sx + 5;
          const cy = b.yt;
          [[0, -16, 6], [-5, -11, 5], [5, -12, 5], [-2, -6, 6], [3, -5, 5]].forEach(([dx, dy, r], i) => {
            R(g, cx + dx - r / 2, cy + dy - r / 2, r, r, i % 2 ? '#15803d' : '#16a34a');
          });
          R(g, cx - 1, cy - 18, 2, 2, '#4ade80');
        }
      };
    },
    // mesa comprida do refeitório (com bandejas)
    table(x, y, w, opt = {}) {
      return {
        x, y, w, d: 26, h: 20, solid: true, ...opt,
        draw(g, S, th) {
          shadow(g, S, x + w / 2, y + 25, w / 2 + 6, 0.3);
          const b = box(g, S, x, y, w, 26, 18, '#e2e8f0', '#94a3b8');
          R(g, b.sx + 4, b.yb - 16, 3, 16, '#64748b');
          R(g, b.sx + w - 7, b.yb - 16, 3, 16, '#64748b');
          for (let tx = 8; tx < w - 10; tx += 22) {
            R(g, b.sx + tx, b.yt + 3, 14, 9, '#cbd5e1');
            R(g, b.sx + tx + 1, b.yt + 4, 5, 4, '#f8fafc');
            R(g, b.sx + tx + 7, b.yt + 4, 6, 3, '#f59e0b');
            R(g, b.sx + tx + 7, b.yt + 7, 4, 3, '#16a34a');
          }
        }
      };
    },
    bench(x, y, w) {
      return {
        x, y, w, d: 10, h: 10, solid: true,
        draw(g, S, th) {
          box(g, S, x, y, w, 10, 7, sh(th.acc2, -0.2), sh(th.acc2, -0.45));
        }
      };
    },
    vending(x, y, color) {
      return {
        x, y, w: 26, d: 16, h: 58, solid: true,
        draw(g, S, th) {
          shadow(g, S, x + 13, y + 15, 16, 0.3);
          const c = color || '#dc2626';
          const b = box(g, S, x, y, 26, 16, 56, sh(c, 0.1), c);
          R(g, b.sx + 3, b.yb - 52, 14, 34, '#0b1220');
          for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) R(g, b.sx + 4 + k * 4, b.yb - 50 + r * 8, 3, 5, ['#38bdf8', '#facc15', '#f472b6', '#4ade80'][(r + k) % 4]);
          R(g, b.sx + 19, b.yb - 50, 4, 10, '#e5e7eb');
          R(g, b.sx + 4, b.yb - 12, 12, 5, '#020617');
        },
        glow: (S) => ({ x: S.sx(x + 13), y: S.sy(y + 16) - 34, r: 26, c: 'rgba(56,189,248,0.18)' })
      };
    },
    counter(x, y, w, opt = {}) {
      return {
        x, y, w, d: 22, h: 26, solid: true, ...opt,
        draw(g, S, th) {
          shadow(g, S, x + w / 2, y + 21, w / 2 + 4, 0.3);
          const b = box(g, S, x, y, w, 22, 24, '#cbd5e1', th.metal);
          R(g, b.sx, b.yb - 24, w, 3, th.acc);
          if (opt.food) {
            for (let k = 6; k < w - 12; k += 18) {
              R(g, b.sx + k, b.yt + 2, 12, 7, '#475569');
              R(g, b.sx + k + 1, b.yt + 3, 10, 4, ['#f59e0b', '#16a34a', '#f8fafc', '#dc2626'][(k / 18) % 4 | 0]);
            }
          }
        }
      };
    },
    treadmill(x, y) {
      return {
        x, y, w: 26, d: 40, h: 12, solid: true,
        draw(g, S, th) {
          shadow(g, S, x + 13, y + 38, 18, 0.3);
          const b = box(g, S, x, y, 26, 40, 8, '#1f2937', '#111827');
          for (let i = 0; i < 6; i++) R(g, b.sx + 3, b.yt + 2 + i * 4, 20, 1, '#374151');
          R(g, b.sx + 1, S.sy(y) - 30, 3, 24, '#6b7280');
          R(g, b.sx + 22, S.sy(y) - 30, 3, 24, '#6b7280');
          R(g, b.sx + 1, S.sy(y) - 32, 24, 5, '#374151');
          R(g, b.sx + 8, S.sy(y) - 31, 10, 3, th.acc);
        }
      };
    },
    weights(x, y) {
      return {
        x, y, w: 40, d: 14, h: 30, solid: true,
        draw(g, S, th) {
          shadow(g, S, x + 20, y + 13, 24, 0.3);
          const b = box(g, S, x, y, 40, 14, 4, '#374151', '#1f2937');
          R(g, b.sx + 2, b.yt - 26, 3, 26, '#4b5563');
          R(g, b.sx + 35, b.yt - 26, 3, 26, '#4b5563');
          [8, 18].forEach((yy) => {
            R(g, b.sx + 2, b.yt - yy - 2, 36, 2, '#9ca3af');
            R(g, b.sx + 6, b.yt - yy - 5, 4, 8, '#111827');
            R(g, b.sx + 30, b.yt - yy - 5, 4, 8, '#111827');
          });
        }
      };
    },
    goal(x, y, w) {
      return {
        x, y, w, d: 22, h: 34, solid: true,
        draw(g, S) {
          const sx = S.sx(x);
          const yf = S.sy(y + 22);
          const yb = S.sy(y);
          // rede
          g.fillStyle = 'rgba(226,232,240,0.35)';
          for (let i = 0; i <= w; i += 4) g.fillRect(sx + i, yb - 34, 1, 34 + (yf - yb));
          for (let j = 0; j <= 34; j += 4) g.fillRect(sx, yb - 34 + j, w, 1);
          // traves
          R(g, sx - 2, yf - 34, 3, 34, '#f8fafc');
          R(g, sx + w - 1, yf - 34, 3, 34, '#f8fafc');
          R(g, sx - 2, yf - 36, w + 4, 3, '#f8fafc');
        }
      };
    },
    cone(x, y) {
      return {
        x, y, w: 8, d: 6, h: 9, solid: false,
        draw(g, S) {
          const sx = S.sx(x);
          const sy = S.sy(y + 5);
          R(g, sx, sy - 2, 8, 2, '#c2410c');
          R(g, sx + 2, sy - 6, 4, 4, '#f97316');
          R(g, sx + 3, sy - 9, 2, 3, '#fdba74');
          R(g, sx + 2, sy - 5, 4, 1, '#f8fafc');
        }
      };
    },
    // tapete de grama (área de treino com campo pintado)
    turf(x, y, w, d) {
      return {
        x, y, w, d, h: 0, solid: false, flat: true,
        draw(g, S) {
          const sx = S.sx(x);
          const y0 = S.sy(y);
          const hh = S.sy(y + d) - y0;
          for (let i = 0; i < w; i += 16) R(g, sx + i, y0, Math.min(16, w - i), hh, (i / 16) % 2 ? '#166534' : '#15803d');
          R(g, sx, y0, w, 1, '#f8fafc');
          R(g, sx, y0 + hh - 1, w, 1, '#f8fafc');
          R(g, sx, y0, 1, hh, '#f8fafc');
          R(g, sx + w - 1, y0, 1, hh, '#f8fafc');
          R(g, sx + w / 2, y0, 1, hh, 'rgba(248,250,252,0.8)');
          g.strokeStyle = 'rgba(248,250,252,0.8)';
          g.lineWidth = 1;
          g.beginPath();
          g.ellipse(sx + w / 2 + 0.5, y0 + hh / 2, 18, 18 * FY, 0, 0, Math.PI * 2);
          g.stroke();
        }
      };
    },
    shelf(x, y, opt = {}) {
      return {
        x, y, w: 40, d: 14, h: 56, solid: true, ...opt,
        draw(g, S, th) {
          shadow(g, S, x + 20, y + 13, 24, 0.3);
          const b = box(g, S, x, y, 40, 14, 54, '#78350f', '#451a03');
          for (let r = 0; r < 3; r++) {
            const yy = b.yb - 50 + r * 16;
            R(g, b.sx + 2, yy + 12, 36, 2, '#92400e');
            for (let k = 0; k < 5; k++) R(g, b.sx + 4 + k * 7, yy + 3 + ((k + r) % 2), 5, 9 - ((k + r) % 2), ['#ef4444', '#facc15', '#38bdf8', '#a855f7', '#22c55e'][(k + r) % 5]);
          }
        }
      };
    },
    gacha(x, y) {
      return {
        x, y, w: 26, d: 18, h: 50, solid: true,
        draw(g, S, th) {
          shadow(g, S, x + 13, y + 17, 16, 0.3);
          const b = box(g, S, x, y, 26, 18, 22, '#dc2626', '#991b1b');
          // globo de cápsulas
          const cx = b.sx + 13;
          const cy = b.yt - 12;
          g.fillStyle = 'rgba(186,230,253,0.35)';
          g.beginPath();
          g.arc(cx, cy, 12, 0, Math.PI * 2);
          g.fill();
          [[-5, 3, '#facc15'], [3, 4, '#38bdf8'], [-1, -3, '#f472b6'], [6, -2, '#4ade80'], [-6, -4, '#a855f7']].forEach(([dx, dy, c]) => R(g, cx + dx - 2, cy + dy - 2, 4, 4, c));
          R(g, cx - 4, cy - 10, 3, 2, '#f8fafc');
          R(g, cx - 7, b.yt - 1, 14, 3, '#7f1d1d');
          R(g, b.sx + 9, b.yb - 14, 8, 6, '#020617');
          R(g, b.sx + 18, b.yb - 18, 3, 3, '#facc15');
        },
        glow: (S) => ({ x: S.sx(x + 13), y: S.sy(y + 18) - 34, r: 24, c: 'rgba(244,114,182,0.2)' })
      };
    },
    // roleta das Armas: disco girando sobre um pedestal
    roulette(x, y, t) {
      return {
        x, y, w: 40, d: 20, h: 64, solid: true,
        draw(g, S, th) {
          shadow(g, S, x + 20, y + 19, 26, 0.35);
          const b = box(g, S, x, y, 40, 20, 16, '#1e293b', '#0f172a');
          R(g, b.sx, b.yb - 16, 40, 2, th.acc);
          const cx = b.sx + 20;
          const cy = b.yt - 26;
          const cols = ['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#a855f7', '#f97316'];
          const a0 = (t || 0) * 0.02;
          for (let k = 0; k < 6; k++) {
            g.fillStyle = cols[k];
            g.beginPath();
            g.moveTo(cx, cy);
            g.arc(cx, cy, 22, a0 + (k * Math.PI) / 3, a0 + ((k + 1) * Math.PI) / 3);
            g.fill();
          }
          g.strokeStyle = '#f8fafc';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(cx, cy, 22, 0, Math.PI * 2);
          g.stroke();
          R(g, cx - 3, cy - 3, 6, 6, '#f8fafc');
          R(g, cx - 2, cy - 30, 4, 7, '#f8fafc');
        },
        glow: (S) => ({ x: S.sx(x + 20), y: S.sy(y) - 40, r: 40, c: 'rgba(250,204,21,0.16)' })
      };
    },
    // câmara do Fluxo: tubo de vidro com luz subindo
    flowTube(x, y, t, color) {
      return {
        x, y, w: 26, d: 22, h: 70, solid: true,
        draw(g, S, th) {
          const c = color || '#a855f7';
          shadow(g, S, x + 13, y + 21, 18, 0.35);
          const b = box(g, S, x, y, 26, 22, 8, '#1e293b', '#0f172a');
          const top = b.yt - 60;
          // líquido do Fluxo aceso: mais claro no meio, bolhas subindo
          R(g, b.sx + 3, top, 20, 60, sh(c, -0.35));
          R(g, b.sx + 7, top, 12, 60, sh(c, -0.1));
          R(g, b.sx + 11, top, 4, 60, sh(c, 0.25));
          for (let i = 0; i < 8; i++) {
            const yy = top + 60 - (((t || 0) * 0.7 + i * 9) % 60);
            R(g, b.sx + 5 + ((i * 5) % 15), yy, 2, 2, '#f5f3ff');
          }
          R(g, b.sx + 3, top, 2, 60, 'rgba(255,255,255,0.35)');
          R(g, b.sx + 1, top - 4, 24, 5, '#334155');
          R(g, b.sx + 1, top - 4, 24, 1, '#64748b');
        },
        glow: (S) => ({ x: S.sx(x + 13), y: S.sy(y + 11) - 40, r: 34, c: 'rgba(168,85,247,0.22)' })
      };
    },
    // telão do Ego (na sala do monitor)
    screen(x, y, w, t) {
      return {
        x, y, w, d: 10, h: 0, solid: true, wall: true,
        draw(g, S, th) {
          const sx = S.sx(x);
          const y0 = S.sy(y) - WALL + 6;
          R(g, sx - 3, y0 - 3, w + 6, 58, '#020617');
          R(g, sx, y0, w, 52, '#04121f');
          // o Ego de verdade no telão (o boneco dele, em holograma azulado)
          const cx = sx + w / 2;
          const ego = window.CutsceneEngine?.getSpeakerCharData?.('EGO');
          if (ego) {
            g.save();
            g.beginPath();
            g.rect(sx, y0, w, 52);
            g.clip();
            g.translate(Math.round(cx - 54), y0 - 6);
            PR().drawCharacterSprite(g, ego, 108, 108, { facing: 'front', frame: 1, animState: 'idle', view: 'front' });
            g.restore();
            g.fillStyle = 'rgba(34,211,238,0.28)';
            g.fillRect(sx, y0, w, 52);
          }
          // linhas de varredura e texto
          for (let i = 0; i < 52; i += 3) R(g, sx, y0 + i, w, 1, 'rgba(34,211,238,0.06)');
          ptext(g, 'PROXIMO DESAFIO', sx + w / 2, y0 + 46, th.acc, 1, 'center');
          if (Math.floor((t || 0) / 30) % 2) R(g, sx + w - 8, y0 + 4, 3, 3, '#ef4444');
        },
        glow: (S) => ({ x: S.sx(x + w / 2), y: S.sy(y) - WALL + 32, r: 70, c: 'rgba(34,211,238,0.2)' })
      };
    },
    seats(x, y, n) {
      return {
        x, y, w: n * 20, d: 14, h: 18, solid: true,
        draw(g, S, th) {
          // fileira de cadeiras de auditório: pé de metal, assento e encosto estofados
          const c = sh(th.acc2, -0.2);
          for (let i = 0; i < n; i++) {
            const xx = x + i * 20;
            const sx = S.sx(xx + 2);
            const yb = S.sy(y + 14);
            shadow(g, S, xx + 10, y + 13, 9, 0.25);
            R(g, sx + 6, yb - 6, 3, 6, th.metal);
            R(g, sx + 2, yb - 1, 11, 1, sh(th.metal, -0.3));
            // encosto (atrás) e assento (na frente)
            R(g, sx - 1, yb - 23, 18, 14, '#020617');
            R(g, sx, yb - 22, 16, 12, c);
            R(g, sx + 1, yb - 21, 14, 1, sh(c, 0.3));
            R(g, sx + 2, yb - 19, 12, 7, sh(c, 0.08));
            R(g, sx - 1, yb - 11, 18, 6, '#020617');
            R(g, sx, yb - 10, 16, 4, sh(c, 0.15));
            R(g, sx, yb - 10, 16, 1, sh(c, 0.4));
          }
        }
      };
    }
  };

  // ---------------------------------------------------------------- paredes
  // Enfeites da parede de fundo: { kind, x, w, label, to (porta) }
  function drawWallItem(g, S, th, it, room, t) {
    const x = S.sx(it.x);
    const base = S.sy(0);
    if (it.kind === 'door') {
      const w = it.w || 34;
      const h = it.h || 66;
      const open = it.big;
      R(g, x - 3, base - h - 3, w + 6, h + 3, '#020617');
      R(g, x - 2, base - h - 2, w + 4, h + 2, th.metal);
      R(g, x, base - h, w, h, open ? '#020617' : sh(th.metal, -0.35));
      if (!open) {
        R(g, x + w / 2, base - h, 1, h, sh(th.metal, -0.55));
        R(g, x + 3, base - h + 4, w - 6, 10, sh(th.metal, -0.15));
        R(g, x + w / 2 - 4, base - h / 2, 2, 5, '#e5e7eb');
        R(g, x + w / 2 + 3, base - h / 2, 2, 5, '#e5e7eb');
      } else {
        // porta grande aberta: luz saindo
        g.fillStyle = sh(th.acc, -0.6);
        g.fillRect(x + 2, base - h + 2, w - 4, h - 2);
        R(g, x + 4, base - 8, w - 8, 8, sh(th.acc, -0.3));
      }
      // letreiro aceso em cima da porta
      if (it.label) {
        const lw = Math.max(w + 8, it.label.length * 4 + 8);
        const lx = x + w / 2 - lw / 2;
        R(g, lx - 1, base - h - 15, lw + 2, 11, '#020617');
        R(g, lx, base - h - 14, lw, 9, '#0b1220');
        ptext(g, it.label, x + w / 2, base - h - 12, it.color || th.acc, 1, 'center');
      }
      // faixa no chão na frente da porta
      R(g, x, base, w, 2, sh(it.color || th.acc, -0.2));
    } else if (it.kind === 'poster') {
      const w = it.w || 22;
      R(g, x - 1, base - 62, w + 2, 30, '#020617');
      R(g, x, base - 61, w, 28, it.color || th.acc2);
      R(g, x + 2, base - 59, w - 4, 16, sh(it.color || th.acc2, -0.35));
      // jogador estilizado no pôster
      R(g, x + w / 2 - 2, base - 57, 4, 4, '#fbd5b5');
      R(g, x + w / 2 - 3, base - 53, 6, 7, '#f8fafc');
      R(g, x + w / 2 - 6, base - 51, 3, 2, '#f8fafc');
      if (it.label) ptext(g, it.label, x + w / 2, base - 40, '#f8fafc', 1, 'center');
    } else if (it.kind === 'board') {
      // mural de cortiça (objetivos e conquistas)
      const w = it.w || 44;
      R(g, x - 2, base - 64, w + 4, 34, '#451a03');
      R(g, x, base - 62, w, 30, '#b45309');
      [[3, 3, '#fef08a'], [15, 5, '#f8fafc'], [28, 2, '#bae6fd'], [6, 16, '#fecaca'], [20, 17, '#fef08a'], [33, 15, '#f8fafc']].forEach(([dx, dy, c]) => {
        if (dx + 10 > w) return;
        R(g, x + dx, base - 62 + dy, 10, 10, c);
        R(g, x + dx + 2, base - 62 + dy + 3, 6, 1, '#64748b');
        R(g, x + dx + 2, base - 62 + dy + 6, 4, 1, '#64748b');
        R(g, x + dx + 4, base - 62 + dy - 1, 2, 2, '#ef4444');
      });
      // medalha (conquistas)
      R(g, x + w - 8, base - 44, 6, 6, '#facc15');
      R(g, x + w - 7, base - 50, 1, 6, '#ef4444');
      R(g, x + w - 4, base - 50, 1, 6, '#2563eb');
    } else if (it.kind === 'logo') {
      // painel com o cadeado do Blue Lock (ou o escudo do clube)
      const w = it.w || 40;
      R(g, x - 1, base - 66, w + 2, 30, '#020617');
      R(g, x, base - 65, w, 28, sh(th.acc2, -0.45));
      const cx = x + w / 2;
      g.strokeStyle = th.acc;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(cx, base - 54, 6, Math.PI, 0);
      g.stroke();
      R(g, cx - 8, base - 54, 16, 12, th.acc);
      R(g, cx - 1, base - 50, 2, 4, '#020617');
      if (it.label) ptext(g, it.label, cx, base - 41, '#e0f2fe', 1, 'center');
    } else if (it.kind === 'window') {
      // janela (NEL/pro: a cidade lá fora; Blue Lock: painel de LED)
      const w = it.w || 44;
      R(g, x - 2, base - 66, w + 4, 36, '#020617');
      const sky = th.id === 'pro' ? '#f59e0b' : th.id === 'nel' ? '#1e3a8a' : '#082f49';
      R(g, x, base - 64, w, 32, sky);
      R(g, x, base - 64, w, 10, sh(sky, 0.25));
      for (let k = 0; k < w; k += 7) {
        const hh = 6 + ((k * 13) % 14);
        R(g, x + k, base - 32 - hh, 6, hh, th.id === 'pro' ? '#7c2d12' : '#0f172a');
        if ((k / 7) % 2) R(g, x + k + 2, base - 32 - hh + 3, 1, 1, '#fde68a');
      }
      R(g, x + w / 2 - 1, base - 64, 2, 32, '#020617');
      R(g, x, base - 49, w, 2, '#020617');
    } else if (it.kind === 'tv') {
      const w = it.w || 40;
      R(g, x - 2, base - 66, w + 4, 26, '#020617');
      R(g, x, base - 64, w, 22, '#0b3b2a');
      R(g, x + 2, base - 50, w - 4, 6, '#15803d');
      R(g, x + w / 2 - 1, base - 58, 2, 2, '#f8fafc');
      ptext(g, it.label || 'NEL 2 X 1', x + w / 2, base - 62, '#f8fafc', 1, 'center');
    } else if (it.kind === 'clock') {
      R(g, x - 1, base - 68, 12, 12, '#020617');
      R(g, x, base - 67, 10, 10, '#f8fafc');
      R(g, x + 5, base - 66, 1, 4, '#020617');
      R(g, x + 5, base - 62, 3, 1, '#020617');
    } else if (it.kind === 'sign') {
      const w = it.label.length * 4 + 10;
      R(g, x - 1, base - 70, w + 2, 13, '#020617');
      R(g, x, base - 69, w, 11, '#0b1220');
      ptext(g, it.label, x + w / 2, base - 66, it.color || th.acc, 1, 'center');
    }
  }

  // Parede de fundo inteira: rodapé, painéis, faixa de LED e luminárias
  function drawBackWall(g, S, th, room, t) {
    const x0 = S.sx(0);
    const W = room.w * T;
    const base = S.sy(0);
    R(g, x0 - RIM, base - WALL - RIM, W + RIM * 2, RIM, th.wallTop);
    R(g, x0, base - WALL, W, WALL, th.wall);
    // painéis
    for (let x = 0; x < W; x += 32) {
      R(g, x0 + x, base - WALL, 1, WALL, sh(th.wall, -0.25));
      R(g, x0 + x + 1, base - WALL, 1, WALL, sh(th.wall, 0.08));
    }
    R(g, x0, base - WALL + 10, W, 1, sh(th.wall, 0.15));
    // faixa de LED (Blue Lock) / sanca (pro)
    R(g, x0, base - WALL + 4, W, 2, th.led);
    R(g, x0, base - WALL + 6, W, 2, sh(th.led, -0.5));
    // rodapé
    R(g, x0, base - 6, W, 6, sh(th.wall, -0.35));
    R(g, x0, base - 6, W, 1, sh(th.wall, 0.15));
    (room.wallItems || []).forEach((it) => drawWallItem(g, S, th, it, room, t));
  }

  // Chão em ladrilhos (ou tábuas no apartamento) + paredes laterais/frente vistas de cima
  function drawFloor(g, S, th, room) {
    const x0 = S.sx(0);
    const W = room.w * T;
    const D = room.d * T;
    const y0 = S.sy(0);
    const y1 = S.sy(D);
    if (th.id === 'pro') {
      for (let y = 0; y < D; y += 10) {
        const a = S.sy(y);
        const b = S.sy(y + 10);
        R(g, x0, a, W, b - a, (y / 10) % 2 ? th.floorA : th.floorB);
        const off = ((y / 10) % 3) * 23;
        for (let x = off; x < W; x += 64) R(g, x0 + x, a, 1, b - a, th.floorLine);
        R(g, x0, a, W, 1, th.floorLine);
      }
    } else {
      for (let y = 0; y < D; y += T) {
        const a = S.sy(y);
        const b = S.sy(y + T);
        for (let x = 0; x < W; x += T) {
          // ladrilhos com leve variação (uns mais gastos, outros mais limpos)
          const hsh = ((x * 73856093) ^ (y * 19349663)) >>> 0;
          const base = ((x + y) / T) % 2 ? th.floorA : th.floorB;
          R(g, x0 + x, a, T, b - a, hsh % 9 === 0 ? sh(base, 0.06) : hsh % 11 === 0 ? sh(base, -0.07) : base);
          if (hsh % 13 === 0) R(g, x0 + x + 3, a + 2, 4, 1, sh(base, 0.12));
        }
        R(g, x0, a, W, 1, th.floorLine);
      }
      for (let x = 0; x <= W; x += T) R(g, x0 + x, y0, 1, y1 - y0, th.floorLine);
    }
    // reflexo da faixa de LED no chão encerado, perto da parede
    [[0, 0.1], [4, 0.07], [9, 0.045], [15, 0.025]].forEach(([dy, a]) => {
      g.globalAlpha = a;
      R(g, x0, y0 + dy, W, 4, th.led);
    });
    g.globalAlpha = 1;
    (room.floorItems || []).forEach((f) => f(g, S, th));
    // sombra da parede de fundo no chão
    g.fillStyle = 'rgba(2,6,23,0.35)';
    g.fillRect(x0, y0, W, 6);
    g.fillStyle = 'rgba(2,6,23,0.18)';
    g.fillRect(x0, y0 + 6, W, 6);
  }
  function drawRims(g, S, th, room) {
    const x0 = S.sx(0);
    const W = room.w * T;
    const y0 = S.sy(0);
    const y1 = S.sy(room.d * T);
    const gapOf = (side) => (room.exits || []).filter((e) => e.side === side);
    // laterais
    ['left', 'right'].forEach((side) => {
      const xx = side === 'left' ? x0 - RIM : x0 + W;
      R(g, xx, y0 - WALL, RIM, y1 - y0 + WALL + RIM, th.wallTop);
      R(g, side === 'left' ? xx + RIM - 1 : xx, y0 - WALL, 1, y1 - y0 + WALL + RIM, sh(th.wall, 0.2));
      gapOf(side).forEach((e) => {
        const a = S.sy(e.at - 18);
        const b = S.sy(e.at + 18);
        R(g, xx, a, RIM, b - a, th.floorB);
        R(g, xx, a, RIM, 1, th.led);
        R(g, xx, b - 1, RIM, 1, th.led);
      });
    });
    // frente (a parede de baixo, vista só de cima)
    R(g, x0 - RIM, y1, W + RIM * 2, RIM, th.wallTop);
    R(g, x0, y1, W, 1, sh(th.wall, 0.2));
    gapOf('bottom').forEach((e) => {
      R(g, S.sx(e.at - 18), y1, 36, RIM, th.floorB);
      R(g, S.sx(e.at - 18), y1, 1, RIM, th.led);
      R(g, S.sx(e.at + 18) - 1, y1, 1, RIM, th.led);
    });
  }

  // ---------------------------------------------------------------- mais peças
  Object.assign(P, {
    // estante com troféus/medalhas (as conquistas)
    trophies(x, y, opt = {}) {
      return {
        x, y, w: 36, d: 12, h: 46, solid: true, ...opt,
        draw(g, S, th) {
          shadow(g, S, x + 18, y + 11, 20, 0.28);
          const b = box(g, S, x, y, 36, 12, 44, '#57534e', '#292524');
          [0, 1].forEach((r) => {
            const yy = b.yb - 40 + r * 18;
            R(g, b.sx + 2, yy + 14, 32, 2, '#78716c');
            R(g, b.sx + 5, yy + 4, 6, 6, '#facc15');
            R(g, b.sx + 7, yy + 10, 2, 4, '#ca8a04');
            R(g, b.sx + 5, yy + 4, 6, 1, '#fef08a');
            R(g, b.sx + 15, yy + 6, 5, 5, r ? '#cbd5e1' : '#f97316');
            R(g, b.sx + 16, yy + 2, 1, 4, '#ef4444');
            R(g, b.sx + 18, yy + 2, 1, 4, '#2563eb');
            R(g, b.sx + 24, yy + 3, 8, 11, r ? '#1d4ed8' : '#f8fafc');
            R(g, b.sx + 26, yy + 5, 4, 4, r ? '#93c5fd' : '#0f172a');
          });
        }
      };
    },
    bag(x, y, color) {
      return {
        x, y, w: 14, d: 8, h: 14, solid: false,
        draw(g, S) {
          shadow(g, S, x + 7, y + 7, 8, 0.3);
          const c = color || '#1d4ed8';
          const sx = S.sx(x);
          const sy = S.sy(y + 8);
          R(g, sx, sy - 13, 14, 13, '#020617');
          R(g, sx + 1, sy - 12, 12, 11, c);
          R(g, sx + 3, sy - 8, 8, 5, PR().shade(c, -0.25));
          R(g, sx + 4, sy - 15, 6, 3, '#020617');
          R(g, sx + 1, sy - 12, 12, 1, PR().shade(c, 0.3));
        }
      };
    },
    shoes(x, y) {
      return {
        x, y, w: 16, d: 6, h: 4, solid: false,
        draw(g, S, th) {
          const sx = S.sx(x);
          const sy = S.sy(y + 6);
          [0, 9].forEach((dx) => {
            R(g, sx + dx, sy - 4, 7, 4, '#020617');
            R(g, sx + dx + 1, sy - 3, 6, 2, th.acc);
            R(g, sx + dx + 1, sy - 1, 6, 1, '#f8fafc');
          });
        }
      };
    },
    cooler(x, y) {
      return {
        x, y, w: 14, d: 12, h: 40, solid: true,
        draw(g, S) {
          shadow(g, S, x + 7, y + 11, 9, 0.3);
          const b = box(g, S, x, y, 14, 12, 26, '#e2e8f0', '#cbd5e1');
          R(g, b.sx + 3, b.yb - 18, 3, 3, '#38bdf8');
          R(g, b.sx + 8, b.yb - 18, 3, 3, '#ef4444');
          R(g, b.sx + 2, b.yt - 14, 10, 14, 'rgba(125,211,252,0.75)');
          R(g, b.sx + 3, b.yt - 13, 2, 12, 'rgba(255,255,255,0.6)');
          R(g, b.sx + 1, b.yt - 15, 12, 2, '#0ea5e9');
        }
      };
    },
    bin(x, y) {
      return {
        x, y, w: 10, d: 8, h: 14, solid: true,
        draw(g, S, th) {
          shadow(g, S, x + 5, y + 7, 6, 0.3);
          box(g, S, x, y, 10, 8, 13, '#334155', '#1e293b');
          R(g, S.sx(x) + 2, S.sy(y + 8) - 10, 6, 1, th.acc);
        }
      };
    },
    lamp(x, y) {
      return {
        x, y, w: 10, d: 8, h: 44, solid: true,
        draw(g, S) {
          shadow(g, S, x + 5, y + 7, 7, 0.3);
          const sx = S.sx(x);
          const sy = S.sy(y + 8);
          R(g, sx + 1, sy - 3, 8, 3, '#292524');
          R(g, sx + 4, sy - 36, 2, 33, '#57534e');
          R(g, sx - 2, sy - 44, 14, 9, '#fde68a');
          R(g, sx - 2, sy - 44, 14, 2, '#fef9c3');
          R(g, sx - 2, sy - 36, 14, 1, '#ca8a04');
        },
        glow: (S) => ({ x: S.sx(x + 5), y: S.sy(y + 8) - 40, r: 46, c: 'rgba(253,224,71,0.18)' })
      };
    },
    sofa(x, y, w, color) {
      return {
        x, y, w, d: 22, h: 26, solid: true,
        draw(g, S) {
          const c = color || '#475569';
          shadow(g, S, x + w / 2, y + 21, w / 2 + 4, 0.3);
          const b = box(g, S, x, y + 6, w, 16, 10, PR().shade(c, 0.12), PR().shade(c, -0.25));
          R(g, b.sx - 1, S.sy(y + 6) - 28, w + 2, 20, '#020617');
          R(g, b.sx, S.sy(y + 6) - 27, w, 18, c);
          R(g, b.sx, S.sy(y + 6) - 27, w, 2, PR().shade(c, 0.25));
          R(g, b.sx - 3, b.yb - 18, 5, 18, PR().shade(c, -0.15));
          R(g, b.sx + w - 2, b.yb - 18, 5, 18, PR().shade(c, -0.15));
        }
      };
    },
    // emblema pintado no chão (cadeado do Blue Lock / escudo do clube)
    emblem(x, y, r) {
      return {
        x, y, w: r * 2, d: r * 2, h: 0, solid: false, flat: true,
        draw(g, S, th) {
          const cx = S.sx(x + r);
          const cy = S.sy(y + r);
          g.strokeStyle = PR().shade(th.acc, -0.45);
          g.lineWidth = 2;
          g.beginPath();
          g.ellipse(cx, cy, r, r * FY, 0, 0, Math.PI * 2);
          g.stroke();
          g.fillStyle = PR().shade(th.acc, -0.55);
          g.fillRect(cx - r * 0.35, cy - r * 0.1, r * 0.7, r * 0.45);
          g.strokeStyle = PR().shade(th.acc, -0.55);
          g.lineWidth = 3;
          g.beginPath();
          g.ellipse(cx, cy - r * 0.1, r * 0.25, r * 0.28, 0, Math.PI, 0);
          g.stroke();
        }
      };
    },
    // pedestal com uma arma (holograma girando)
    pedestal(x, y, t, color) {
      return {
        x, y, w: 18, d: 14, h: 40, solid: true,
        draw(g, S, th) {
          const c = color || th.acc;
          shadow(g, S, x + 9, y + 13, 11, 0.3);
          const b = box(g, S, x, y, 18, 14, 18, '#334155', '#1e293b');
          R(g, b.sx, b.yb - 18, 18, 2, c);
          // feixe de luz e um cristal da cor da arma girando (a largura "respira" com o giro)
          g.fillStyle = PR().shade(c, -0.1) + '33';
          g.fillRect(b.sx + 3, b.yt - 26, 12, 26);
          const k = 0.35 + 0.65 * Math.abs(Math.sin((t || 0) * 0.05));
          const hw = Math.max(1, Math.round(6 * k));
          const cx = b.sx + 9;
          const cy = b.yt - 15 + Math.round(Math.sin((t || 0) * 0.08) * 2);
          for (let i = -6; i <= 6; i++) {
            const w = Math.round(hw * (1 - Math.abs(i) / 7));
            if (w <= 0) continue;
            R(g, cx - w, cy + i, w * 2, 1, i < 0 ? PR().shade(c, 0.25) : PR().shade(c, -0.15));
          }
          R(g, cx - 1, cy - 4, 1, 3, '#f8fafc');
          R(g, cx - Math.max(1, hw - 1), cy, Math.max(2, hw * 2 - 2), 1, PR().shade(c, 0.45));
        },
        glow: (S) => ({ x: S.sx(x + 9), y: S.sy(y + 7) - 28, r: 26, c: 'rgba(250,204,21,0.14)' })
      };
    }
  });

  // ---------------------------------------------------------------- salas
  // w, d em ladrilhos; props em px do chão; exits = passagens nas paredes laterais/frente
  function buildRooms(th, t) {
    const ROOMS = {};
    const bl = th.id === 'bluelock';
    ROOMS.quarto = {
      name: th.id === 'pro' ? 'SEU APARTAMENTO' : 'SEU QUARTO',
      w: 30,
      d: 17,
      wallItems: [
        { kind: bl ? 'logo' : 'window', x: 30, w: 52, label: bl ? 'BLUE LOCK' : '' },
        { kind: 'poster', x: 134, w: 24, label: 'EGO', color: th.acc2 },
        { kind: 'board', x: 196, w: 56, act: 'OBJECTIVES' },
        { kind: 'clock', x: 380 },
        { kind: 'door', x: 430, w: 34, label: 'CORREDOR', to: 'corredor' }
      ],
      props: [
        P.bed(14, 34, { act: 'SLEEP' }),
        P.bed(70, 34, { color: '#475569' }),
        P.bag(64, 118, th.acc2),
        P.shoes(20, 120),
        P.trophies(150, 40, { act: 'CONQUISTAS' }),
        P.locker(266, 2, { act: 'PROFILE', label: '05' }),
        P.locker(298, 2, { label: '06' }),
        P.desk(340, 16, { act: 'ESTATISTICAS' }),
        P.chair(354, 44),
        P.rug(150, 120, 160, 80),
        P.emblem(206, 136, 24),
        P.ball(300, 190),
        P.lamp(122, 30),
        P.plant(440, 230),
        P.bin(400, 50)
      ]
    };
    // Carreira profissional: o quarto vira um apartamento (cama de casal, sofá, TV,
    // guarda-roupa de madeira, janela da cidade)
    if (th.id === 'pro') {
      ROOMS.quarto = {
        name: 'SEU APARTAMENTO',
        w: 30,
        d: 17,
        wallItems: [
          { kind: 'window', x: 26, w: 64 },
          { kind: 'poster', x: 110, w: 24, label: 'GOL', color: th.acc },
          { kind: 'tv', x: 196, w: 60, label: 'LIGA PRO' },
          { kind: 'window', x: 330, w: 52 },
          { kind: 'clock', x: 400 },
          { kind: 'door', x: 430, w: 34, label: 'CORREDOR', to: 'corredor' }
        ],
        props: [
          P.bed(14, 34, { act: 'SLEEP', color: th.acc }),
          P.bed(56, 34, { color: th.acc }),
          P.lamp(110, 30),
          P.locker(150, 2, { act: 'PROFILE', wood: true }),
          P.trophies(262, 4, { act: 'CONQUISTAS' }),
          P.sofa(184, 122, 92, '#7f1d1d'),
          P.rug(170, 112, 124, 70, '#92400e'),
          P.desk(340, 16, { act: 'ESTATISTICAS' }),
          P.chair(354, 44),
          P.plant(306, 30),
          P.plant(440, 230),
          P.ball(80, 200),
          P.bag(50, 130, th.acc)
        ]
      };
    }
    ROOMS.corredor = {
      name: 'CORREDOR',
      w: 74,
      d: 10,
      wallItems: [
        { kind: 'door', x: 30, label: 'QUARTO 5', to: 'quarto' },
        { kind: 'sign', x: 92, label: bl ? 'BLUE LOCK' : th.name },
        { kind: 'door', x: 190, label: 'TREINO', to: 'treino', color: '#4ade80' },
        { kind: 'poster', x: 250, w: 24, label: 'GOL', color: '#1d4ed8' },
        { kind: 'door', x: 320, label: 'REFEITORIO', to: 'refeitorio', color: '#fbbf24' },
        { kind: 'clock', x: 392 },
        { kind: 'door', x: 460, label: 'LOJA', to: 'loja', color: '#f472b6' },
        { kind: 'poster', x: 530, w: 24, label: 'EGO', color: '#7c3aed' },
        { kind: 'door', x: 600, label: 'ARMAS', to: 'armas', color: '#facc15' },
        { kind: 'window', x: 700, w: 60 },
        { kind: 'door', x: 1080, w: 56, h: 76, big: true, label: 'MONITOR DO EGO', to: 'monitor', color: th.acc }
      ],
      floorItems: [
        (g, S, tth) => {
          // faixa central com setas apontando para o Monitor
          const y = S.sy(92);
          R(g, S.sx(0), y, 74 * T, 3, sh(tth.acc, -0.55));
          for (let x = 60; x < 74 * T - 80; x += 64) {
            R(g, S.sx(x), y - 4, 8, 1, sh(tth.acc, -0.25));
            R(g, S.sx(x) + 8, y - 3, 2, 9, sh(tth.acc, -0.25));
            R(g, S.sx(x) + 10, y - 1, 2, 5, sh(tth.acc, -0.25));
          }
        }
      ],
      props: [P.plant(150, 6), P.cooler(420, 4), P.plant(670, 6), P.vending(780, 2, '#2563eb'), P.vending(808, 2, '#dc2626'), P.bin(840, 8), P.plant(1040, 6), P.emblem(560, 100, 26)]
    };
    ROOMS.refeitorio = {
      name: 'REFEITÓRIO',
      w: 34,
      d: 20,
      wallItems: [
        { kind: 'door', x: 22, label: 'CORREDOR', to: 'corredor' },
        { kind: 'sign', x: 80, label: 'REFEITORIO', color: '#fbbf24' },
        { kind: 'tv', x: 250, w: 48, act: 'EQUIPE' },
        { kind: 'window', x: 330, w: 52 },
        { kind: 'clock', x: 410 },
        { kind: 'poster', x: 450, w: 24, label: 'COMA', color: '#16a34a' },
        { kind: 'window', x: 490, w: 44 }
      ],
      props: [
        P.counter(80, 4, 140, { food: true }),
        P.cooler(232, 4),
        P.vending(380, 2, '#dc2626'),
        P.vending(408, 2, '#2563eb'),
        P.bin(440, 8),
        P.table(70, 110, 150),
        P.bench(76, 98, 138),
        P.bench(76, 138, 138),
        P.table(290, 110, 150),
        P.bench(296, 98, 138),
        P.bench(296, 138, 138),
        P.table(70, 210, 150),
        P.bench(76, 198, 138),
        P.bench(76, 238, 138),
        P.table(290, 210, 150),
        P.bench(296, 198, 138),
        P.bench(296, 238, 138),
        P.plant(500, 280),
        P.plant(20, 280)
      ]
    };
    ROOMS.treino = {
      name: 'SALA DE TREINO',
      w: 36,
      d: 20,
      wallItems: [
        { kind: 'door', x: 22, label: 'CORREDOR', to: 'corredor' },
        { kind: 'sign', x: 80, label: 'TREINO', color: '#4ade80' },
        { kind: 'logo', x: 250, w: 52, label: 'EGO' },
        { kind: 'poster', x: 350, w: 24, label: 'FORCA', color: '#dc2626' },
        { kind: 'clock', x: 400 },
        { kind: 'board', x: 440, w: 52 }
      ],
      props: [
        Object.assign(P.treadmill(70, 12), { act: 'TREINO' }),
        P.treadmill(104, 12),
        P.treadmill(138, 12),
        P.weights(180, 8),
        P.cooler(232, 4),
        P.turf(200, 90, 330, 200),
        Object.assign(P.goal(500, 160, 26), { act: 'TREINO' }),
        P.cone(250, 150),
        P.cone(290, 190),
        P.cone(330, 150),
        P.cone(370, 190),
        P.cone(410, 150),
        P.ball(440, 230),
        P.ball(260, 250),
        P.bench(40, 200, 90),
        P.bag(60, 230, '#16a34a')
      ]
    };
    ROOMS.loja = {
      name: 'LOJA',
      w: 22,
      d: 15,
      wallItems: [
        { kind: 'door', x: 22, label: 'CORREDOR', to: 'corredor' },
        { kind: 'sign', x: 120, label: 'LOJA DO EGO', color: '#f472b6' },
        { kind: 'poster', x: 220, w: 24, label: 'GIRO', color: '#db2777' },
        { kind: 'poster', x: 260, w: 24, label: 'SORTE', color: '#ca8a04' },
        { kind: 'clock', x: 310 }
      ],
      props: [
        P.shelf(80, 4),
        P.shelf(124, 4),
        P.shelf(296, 4),
        P.counter(150, 84, 90, { act: 'LOJA' }),
        Object.assign(P.gacha(60, 120), { act: 'LOJA' }),
        P.gacha(92, 120),
        P.gacha(250, 150),
        P.rug(120, 150, 110, 60, '#9d174d'),
        P.plant(320, 200)
      ]
    };
    ROOMS.armas = {
      name: 'SALA DAS ARMAS',
      w: 24,
      d: 15,
      wallItems: [
        { kind: 'door', x: 22, label: 'CORREDOR', to: 'corredor' },
        { kind: 'sign', x: 110, label: 'ROLETA DAS ARMAS', color: '#facc15' },
        { kind: 'sign', x: 270, label: 'FLUXO', color: '#a855f7' },
        { kind: 'logo', x: 320, w: 44, label: 'EGO' }
      ],
      props: [
        Object.assign(P.roulette(160, 40, t), { act: 'ARMAS' }),
        Object.assign(P.flowTube(290, 40, t, '#a855f7'), { act: 'FLUXO' }),
        P.pedestal(80, 120, t, '#ef4444'),
        P.pedestal(120, 150, t + 30, '#38bdf8'),
        P.pedestal(250, 150, t + 60, '#22c55e'),
        P.pedestal(300, 120, t + 90, '#facc15'),
        P.emblem(170, 150, 30)
      ]
    };
    ROOMS.monitor = {
      name: 'SALA DO MONITOR',
      w: 28,
      d: 16,
      wallItems: [
        { kind: 'door', x: 22, label: 'CORREDOR', to: 'corredor' },
        { kind: 'clock', x: 400 }
      ],
      props: [
        Object.assign(P.screen(120, 0, 200, t), { act: 'HISTORIA' }),
        P.seats(110, 130, 6),
        P.seats(110, 180, 6),
        P.emblem(196, 70, 26),
        P.plant(30, 200),
        P.plant(410, 200)
      ]
    };
    return ROOMS;
  }

  // ---------------------------------------------------------------- luz
  // Escurece o canto da sala e acende poças de luz (canvas guardado por sala/tamanho)
  function drawLight(g, S, th, room, glows) {
    // poças de luz das luminárias do teto (pré-feitas)
    const key = `${room.name}|${th.id}|${S.W}x${S.H}|${Math.round(S.cam.x)}|${Math.round(S.cam.y)}`;
    g.save();
    g.globalCompositeOperation = 'lighter';
    glows.forEach((gl) => {
      const grd = g.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r);
      grd.addColorStop(0, gl.c);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(gl.x - gl.r, gl.y - gl.r, gl.r * 2, gl.r * 2);
    });
    g.restore();
    // vinheta escura nas bordas da tela (profundidade): canvas guardado por tamanho
    const vk = `${S.W}x${S.H}|${th.dark}`;
    if (!VIG.has(vk)) {
      const cv = document.createElement('canvas');
      cv.width = S.W;
      cv.height = S.H;
      const vg = cv.getContext('2d');
      const grd = vg.createRadialGradient(S.W / 2, S.H * 0.55, S.H * 0.35, S.W / 2, S.H * 0.55, S.W * 0.75);
      grd.addColorStop(0, 'rgba(2,6,23,0)');
      grd.addColorStop(1, `rgba(2,6,23,${th.dark + 0.2})`);
      vg.fillStyle = grd;
      vg.fillRect(0, 0, S.W, S.H);
      if (VIG.size > 6) VIG.clear();
      VIG.set(vk, cv);
    }
    g.drawImage(VIG.get(vk), 0, 0);
    return key;
  }

  // ---------------------------------------------------------------- personagens
  function drawChar(g, S, cd, x, y, opt = {}) {
    const size = 72;
    shadow(g, S, x, y, 11, 0.4);
    g.save();
    g.translate(Math.round(S.sx(x) - size / 2), Math.round(S.sy(y) - size + 6));
    PR().drawCharacterSprite(g, cd, size, size, Object.assign({ facing: 'front', frame: opt.frame || 0, animState: opt.anim || 'idle', view: opt.view || 'front', left: !!opt.left, accessories: opt.accessories || [], shirtNumber: cd.number || 10 }, opt.extra || {}));
    g.restore();
  }

  // ---------------------------------------------------------------- cena
  // Desenha uma sala inteira (prévia/estado atual): chars = [{cd, x, y, view, anim}]
  function renderRoom(g, W, H, roomId, opt = {}) {
    const th = opt.theme || themeFor(opt.state);
    const t = opt.t || 0;
    const room = (opt.rooms || buildRooms(th, t))[roomId];
    const roomW = room.w * T;
    const roomH = room.d * T * FY;
    // câmera: centraliza a sala se couber, senão segue o foco
    const fx = opt.focus ? opt.focus.x : roomW / 2;
    const fy = opt.focus ? opt.focus.y : (room.d * T) / 2;
    const camX0 = roomW + 2 * RIM <= W ? (roomW - W) / 2 : Math.max(-RIM - 6, Math.min(roomW + RIM + 6 - W, fx - W / 2));
    const totalH = roomH + WALL + RIM * 2;
    const camY0 = totalH <= H ? -(H - totalH) / 2 - WALL - RIM + 4 : Math.max(-WALL - RIM - 6, Math.min(roomH + RIM + 6 - H, fy * FY - H * 0.58));
    // câmera em px inteiros: a camada guardada (chão e parede) casa com os móveis
    const camX = Math.round(camX0);
    const camY = Math.round(camY0);
    const S = { W, H, cam: { x: camX, y: camY }, sx: (x) => Math.round(x - camX), sy: (y) => Math.round(y * FY - camY) };
    g.fillStyle = '#020617';
    g.fillRect(0, 0, W, H);
    // chão + parede de fundo: desenhados uma vez por sala/tema e guardados
    const lk = `${roomId}|${th.id}|${th.acc}|${th.acc2}`;
    let layer = LAYERS.get(lk);
    if (!layer) {
      const pad = RIM + 8;
      const cv = document.createElement('canvas');
      cv.width = roomW + pad * 2;
      cv.height = Math.ceil(WALL + pad * 2 + room.d * T * FY);
      const lg = cv.getContext('2d');
      const S0 = { W: cv.width, H: cv.height, cam: { x: -pad, y: -(WALL + pad) }, sx: (x) => Math.round(x + pad), sy: (y) => Math.round(y * FY) + WALL + pad };
      drawFloor(lg, S0, th, room);
      drawBackWall(lg, S0, th, room, t);
      layer = { cv, pad };
      if (LAYERS.size > 24) LAYERS.clear();
      LAYERS.set(lk, layer);
    }
    g.drawImage(layer.cv, S.sx(0) - layer.pad, S.sy(0) - WALL - layer.pad);
    // props + personagens, ordenados pela frente
    const items = [];
    room.props.forEach((p) => items.push({ z: p.flat ? -1 : p.y + p.d, f: () => p.draw(g, S, th) }));
    (opt.chars || []).forEach((c) => items.push({ z: c.y, f: () => drawChar(g, S, c.cd, c.x, c.y, c) }));
    items.sort((a, b) => a.z - b.z).forEach((i) => i.f());
    drawRims(g, S, th, room);
    const glows = room.props.filter((p) => p.glow).map((p) => p.glow(S));
    // luminárias: uma poça a cada 5 ladrilhos ao longo da parede
    for (let x = 40; x < roomW; x += 80) glows.push({ x: S.sx(x), y: S.sy(room.d * T * 0.45), r: 70, c: th.id === 'pro' ? 'rgba(251,191,36,0.10)' : 'rgba(186,230,253,0.08)' });
    drawLight(g, S, th, room, glows);
    return { S, room, th };
  }

  // ==========================================================================
  // O MAPA JOGÁVEL: laço próprio (60 passos/s), WASD/setas (SHIFT corre), E/ENTER
  // interage, ESC fecha a janela ou abre o ☰. Toque/clique no chão = andar até lá;
  // no aviso = interagir. Cada ação abre a aba de hoje numa janela por cima do mapa.
  // ==========================================================================
  const ACT = {
    PROFILE: { tab: 'PROFILE', label: 'ABRIR ARMÁRIO (PERFIL)', pro: 'ABRIR GUARDA-ROUPA (PERFIL)' },
    ESTATISTICAS: { tab: 'ESTATISTICAS', label: 'USAR O PC (ATRIBUTOS)' },
    OBJECTIVES: { tab: 'OBJECTIVES', label: 'VER O MURAL (OBJETIVOS)' },
    CONQUISTAS: { tab: 'CONQUISTAS', label: 'VER OS TROFÉUS (CONQUISTAS)' },
    SLEEP: { label: 'DESCANSAR (SALVAR O JOGO)' },
    TREINO: { tab: 'TREINO', label: 'TREINAR (TREINOS)' },
    EQUIPE: { tab: 'EQUIPE', label: 'VER A ESCALAÇÃO (EQUIPE)' },
    LOJA: { tab: 'LOJA', label: 'COMPRAR (LOJA)' },
    ARMAS: { tab: 'ARMAS', label: 'GIRAR A ROLETA (ARMAS)' },
    FLUXO: { tab: 'FLUXO', label: 'ENTRAR NO TUBO (FLUXO)' },
    HISTORIA: { tab: 'HISTORIA', label: 'PRÓXIMO CAPÍTULO (HISTÓRIA)' }
  };
  const ROOM_NAMES = { quarto: 'QUARTO', corredor: 'CORREDOR', refeitorio: 'REFEITÓRIO', treino: 'SALA DE TREINO', loja: 'LOJA', armas: 'SALA DAS ARMAS', monitor: 'SALA DO MONITOR' };
  const TABS = [
    ['HISTORIA', '📖 HISTÓRIA'], ['PROFILE', '👤 PERFIL'], ['ESTATISTICAS', '📊 ATRIBUTOS'], ['TREINO', '🏋️ TREINOS'], ['ARMAS', '⚔️ ARMAS'], ['FLUXO', '🌀 FLUXO'],
    ['LOJA', '🛒 LOJA'], ['EQUIPE', '👥 EQUIPE'], ['RELACIONAMENTOS', '💬 RELAÇÕES'], ['CONQUISTAS', '🏆 CONQUISTAS'], ['OBJECTIVES', '🎯 OBJETIVOS']
  ];
  // Falas dos companheiros (a 1ª vez que você aperta E perto; a 2ª abre RELAÇÕES)
  const LINES = {
    bachira: ['Meu monstro quer jogar com o seu!', 'Bora driblar todo mundo no treino?', 'Futebol é mais divertido com você, sabia?'],
    kunigami: ['Herói de verdade treina dobrado.', 'Ainda dá tempo de mais uma série de chutes.', 'Vou ser o melhor. Do jeito certo.'],
    chigiri: ['Quando eu arrancar, ninguém me pega.', 'Minha perna tá 100%. E a sua?', 'Velocidade é a minha arma. Qual é a sua?'],
    nagi: ['Que preguiça... mas fica no meu time.', 'Jogar contra você é menos chato.', 'Zzz... ah, é você.'],
    reo: ['Com o seu talento eu monto um time inteiro.', 'Já pensou na estratégia de amanhã?', 'Dinheiro não compra isso aqui. Só treino.'],
    barou: ['O rei não divide a bola... por enquanto.', 'Saia da minha frente no treino.', 'Você? Talvez sirva de escada para o rei.'],
    rin: ['Sai da frente.', 'Não perca tempo comigo. Treine.', 'O topo é meu.'],
    shidou: ['Big bang! Quero ver você explodir no jogo!', 'Você tem um cheiro de gol, sabia?'],
    hiori: ['Eu acho os passes. Você acha o gol.', 'Seu jogo me dá ideias novas.'],
    _: ['O Ego tá de olho em todo mundo.', 'Amanhã tem jogo. Descansa direito.', 'Aqui ninguém é amigo de ninguém... mas você joga bem.', 'Treinou hoje?']
  };

  const Hub = {
    T, FY, WALL, themeFor, buildRooms, renderRoom, ptext, drawChar,
    on: true, // modo mapa (a preferência fica no navegador: ☰ → MODO CLÁSSICO)
    entered: false, // a carreira está aberta (saiu da tela inicial)
    room: 'quarto',
    x: 300,
    y: 90,
    view: 'front',
    left: false,
    moving: false,
    t: 0,
    keys: {},
    target: null,
    fade: 0,
    fadeTo: null,
    panel: null,
    bubble: null,
    talked: null,

    init() {
      try {
        this.on = localStorage.getItem('bluelock_hub_off') !== '1';
      } catch (e) {}
      this.buildDom();
      this.hookApp();
      this.bindInput();
      const STEP = 1000 / 60;
      let last = performance.now();
      let acc = 0;
      const loop = (now) => {
        requestAnimationFrame(loop);
        if (!this.live()) {
          last = now;
          return;
        }
        acc += Math.min(200, now - last);
        last = now;
        let ran = false;
        while (acc >= STEP) {
          acc -= STEP;
          this.step();
          ran = true;
        }
        // (com uma aba aberta por cima o mapa nem aparece: não desenha)
        if (ran && !this.panel) {
          try {
            this.draw();
          } catch (e) {
            console.error(e);
          }
        }
      };
      requestAnimationFrame(loop);
    },

    // o mapa está na tela agora? (carreira aberta e nada por cima tomando a tela inteira)
    live() {
      if (!this.on || !this.entered || !window.App?.state) return false;
      if (document.getElementById('title-screen')?.classList.contains('open')) return false;
      if (window.MatchEngine?.active) return false;
      const CE = window.CutsceneEngine;
      if (CE?.active || CE?.sakugaActive) return false;
      if (document.getElementById('creator-screen')?.classList.contains('open')) return false;
      if (document.getElementById('duo-screen')?.classList.contains('open')) return false;
      return true;
    },
    // aceita movimento/teclas? (sem janela aberta por cima)
    canAct() {
      if (this.panel || this.menuOpen) return false;
      if (document.querySelector('.ego-modal.open, #cinematic-modal.open')) return false;
      return true;
    },

    // ------------------------------------------------------------ DOM
    buildDom() {
      const cv = document.createElement('canvas');
      cv.id = 'hub-canvas';
      cv.className = 'hub-canvas';
      document.body.appendChild(cv);
      this.cv = cv;
      this.buf = document.createElement('canvas');
      const hud = document.createElement('div');
      hud.id = 'hub-hud';
      hud.className = 'hub-hud';
      hud.innerHTML = `
        <div class="hub-card"><b class="hub-name"></b><span class="hub-sub"></span></div>
        <div class="hub-room"></div>
        <button class="hub-menu-btn" type="button">☰ MENU</button>
        <button class="hub-prompt" type="button" hidden></button>
        <div class="hub-hint">WASD andar • SHIFT correr • E interagir • ESC menu</div>
        <div class="hub-bubble" hidden></div>
        <div class="hub-menu" hidden>
          <div class="hub-menu-title">MENU</div>
          <div class="hub-menu-grid">${TABS.map(([id, label]) => `<button type="button" data-tab="${id}">${label}</button>`).join('')}</div>
          <div class="hub-menu-row">
            <button type="button" data-cmd="mute" class="js-mute-btn">🔊 SOM</button>
            <button type="button" data-cmd="classic">🗂️ MODO CLÁSSICO (ABAS)</button>
            <button type="button" data-cmd="title">🏠 TELA INICIAL</button>
            <button type="button" data-cmd="close">✕ FECHAR</button>
          </div>
        </div>`;
      document.body.appendChild(hud);
      this.hud = hud;
      const close = document.createElement('button');
      close.type = 'button';
      close.id = 'hub-panel-close';
      close.className = 'hub-panel-close';
      close.textContent = '✕ VOLTAR AO MAPA';
      close.onclick = () => this.closePanel();
      document.body.appendChild(close);
      hud.querySelector('.hub-menu-btn').onclick = () => this.toggleMenu();
      hud.querySelector('.hub-prompt').onclick = () => this.interact();
      hud.querySelector('.hub-menu').onclick = (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.tab) {
          this.toggleMenu(false);
          this.openPanel(b.dataset.tab);
        } else if (b.dataset.cmd === 'mute') window.SFX?.toggleMute?.();
        else if (b.dataset.cmd === 'classic') this.setOn(false);
        else if (b.dataset.cmd === 'title') {
          this.toggleMenu(false);
          window.App.openTitleScreen();
        } else this.toggleMenu(false);
      };
      // modo clássico: botão para voltar ao mapa na barra de abas
      const nav = document.querySelector('.top-nav-bar');
      if (nav) {
        const b = document.createElement('button');
        b.className = 'top-tab-btn hub-back-btn';
        b.type = 'button';
        b.textContent = '🗺️ MAPA';
        b.onclick = () => this.setOn(true);
        nav.insertBefore(b, nav.firstChild);
      }
      this.applyBodyClass();
    },
    applyBodyClass() {
      document.body.classList.toggle('hub-on', this.on && this.entered);
      document.body.classList.toggle('hub-panel', !!this.panel);
    },
    setOn(on) {
      this.on = on;
      try {
        localStorage.setItem('bluelock_hub_off', on ? '0' : '1');
      } catch (e) {}
      this.menuOpen = false;
      this.hud.querySelector('.hub-menu').hidden = true;
      if (!on) {
        this.panel = null;
        window.App?.switchTab?.('HISTORIA');
      }
      this.applyBodyClass();
    },
    toggleMenu(force) {
      this.menuOpen = force ?? !this.menuOpen;
      this.hud.querySelector('.hub-menu').hidden = !this.menuOpen;
      window.SFX?.click?.();
    },

    // janela por cima do mapa com a aba de hoje
    openPanel(tab) {
      this.panel = tab;
      this._silent = true;
      try {
        window.App.switchTab(tab);
      } finally {
        this._silent = false;
      }
      this.keys = {};
      this.target = null;
      this.applyBodyClass();
      document.querySelector('.main-workspace')?.scrollTo?.(0, 0);
    },
    closePanel() {
      if (!this.panel) return;
      this.panel = null;
      window.SFX?.click?.();
      this.applyBodyClass();
    },

    // liga no App: entrar na carreira mostra o mapa; trocar de aba com o mapa ligado abre a janela
    hookApp() {
      const App = window.App;
      const sw = App.switchTab;
      App.switchTab = function (tab) {
        sw.call(this, tab);
        if (Hub.on && Hub.entered && !Hub._silent && Hub.panel !== tab) {
          Hub.panel = tab;
          Hub.applyBodyClass();
        }
      };
      const ct = App.closeTitleScreen;
      App.closeTitleScreen = function () {
        Hub._silent = true;
        try {
          ct.apply(this, arguments);
        } finally {
          Hub._silent = false;
        }
        Hub.enter();
      };
    },
    enter() {
      this.entered = true;
      this.panel = null;
      if (!this._placed) {
        this._placed = true;
        this.go('quarto', null, true);
      }
      this.applyBodyClass();
    },

    // ------------------------------------------------------------ entrada
    bindInput() {
      const map = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', shift: 'run' };
      window.addEventListener('keydown', (e) => {
        if (!this.live()) return;
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        const k = e.key.toLowerCase();
        if (k === 'escape') {
          if (this.panel) this.closePanel();
          else this.toggleMenu();
          e.preventDefault();
          return;
        }
        if (!this.canAct()) return;
        if (map[k]) {
          this.keys[map[k]] = true;
          this.target = null;
          e.preventDefault();
        } else if ((k === 'e' || k === 'enter' || k === ' ') && !e.repeat) {
          this.interact();
          e.preventDefault();
        }
      });
      window.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if (map[k]) this.keys[map[k]] = false;
      });
      window.addEventListener('blur', () => (this.keys = {}));
      // toque / clique no chão: anda até lá; perto de uma ação, já interage ao chegar
      this.cv.addEventListener('pointerdown', (e) => {
        if (!this.live() || !this.canAct() || !this.S) return;
        const r = this.cv.getBoundingClientRect();
        const ix = ((e.clientX - r.left) / r.width) * this.S.W;
        const iy = ((e.clientY - r.top) / r.height) * this.S.H;
        const wx = ix + this.S.cam.x;
        const wy = (iy + this.S.cam.y) / FY;
        const spot = this.spots().find((s) => Math.hypot(s.x - wx, (s.y - wy) * 0.8) < 30);
        this.target = { x: spot ? spot.x : wx, y: spot ? spot.y : wy, spot };
      });
      window.addEventListener('resize', () => (this._sized = null));
    },

    // ------------------------------------------------------------ mundo
    theme() {
      if (!this._th || this.t - (this._thAt || 0) > 60) {
        this._th = themeFor(window.App.state);
        this._thAt = this.t;
      }
      return this._th;
    },
    rooms() {
      // (as salas são montadas uma vez por quadro: colisão, ações e desenho usam as mesmas)
      if (this._roomsT !== this.t || !this._rooms) {
        this._rooms = buildRooms(this.theme(), this.t);
        this._roomsT = this.t;
      }
      return this._rooms;
    },
    // companheiros espalhados pelas salas (da escalação do capítulo atual)
    npcs(roomId) {
      const App = window.App;
      const ch = App.getChapter?.();
      let ids = (ch?.teammateIds || []).filter((id) => window.BLUE_LOCK_CHARACTERS.some((c) => c.id === id));
      if (ids.length < 3) ids = ['bachira', 'kunigami', 'chigiri', 'nagi', 'reo', 'barou'];
      const mate = (id) => {
        const c = window.BLUE_LOCK_CHARACTERS.find((x) => x.id === id);
        return c ? Object.assign({}, c, { jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8' }) : null;
      };
      const out = [];
      const add = (id, x, y, o = {}) => {
        const cd = id === 'anri' ? window.CutsceneEngine?.getSpeakerCharData?.('ANRI') : mate(id);
        if (cd) out.push(Object.assign({ id, cd, x, y, view: 'front' }, o));
      };
      if (roomId === 'quarto' && this.theme().id !== 'pro') add(ids[0], 100, 156);
      if (roomId === 'refeitorio') {
        [[120, 100], [160, 100], [330, 100], [370, 100], [150, 200]].forEach(([x, y], i) => ids[i] && add(ids[i], x, y));
        if (ids[5]) add(ids[5], 450, 180, { view: 'side', left: true });
      }
      if (roomId === 'treino') {
        if (ids[1]) add(ids[1], 87, 60, { anim: 'run', view: 'back' });
        if (ids[2]) add(ids[2], 300, 230, { view: 'side' });
      }
      if (roomId === 'corredor') {
        // um companheiro andando pelo corredor, indo e voltando
        const span = 700;
        const p = (this.t * 0.9) % (span * 2);
        const fwd = p < span;
        add(ids[3] || 'nagi', 260 + (fwd ? p : span * 2 - p), 120, { anim: 'run', view: 'side', left: !fwd, frame: Math.floor(this.t * 0.45) });
      }
      if (roomId === 'loja') add('anri', 196, 80);
      return out;
    },
    // lugares com ação perto do jogador (props com act, enfeites de parede, portas, NPCs)
    spots() {
      const room = this.rooms()[this.room];
      const th = this.theme();
      const list = [];
      room.props.forEach((p) => {
        if (!p.act) return;
        const a = ACT[p.act];
        list.push({ x: p.x + p.w / 2, y: Math.min(room.d * T - 10, p.y + p.d + 10), act: p.act, label: (th.id === 'pro' && a.pro) || a.label });
      });
      (room.wallItems || []).forEach((it) => {
        if (it.act) list.push({ x: it.x + (it.w || 30) / 2, y: 22, act: it.act, label: ACT[it.act].label });
        if (it.kind === 'door' && it.to) list.push({ x: it.x + (it.w || 34) / 2, y: 20, door: it.to, label: `ENTRAR: ${ROOM_NAMES[it.to] || it.label}` });
      });
      this.npcs(this.room).forEach((n) => {
        const c = window.BLUE_LOCK_CHARACTERS.find((x) => x.id === n.id);
        const name = n.id === 'anri' ? 'ANRI' : n.id.toUpperCase();
        list.push({ x: n.x, y: n.y + 6, npc: n.id, label: n.id === 'anri' ? 'FALAR COM A ANRI (LOJA)' : `CONVERSAR COM ${name}` });
      });
      return list;
    },
    nearSpot() {
      let best = null;
      let bd = 34;
      this.spots().forEach((s) => {
        const d = Math.hypot(s.x - this.x, (s.y - this.y) * 1.2);
        if (d < bd) {
          bd = d;
          best = s;
        }
      });
      return best;
    },
    blocked(x, y) {
      const room = this.rooms()[this.room];
      if (x < 9 || x > room.w * T - 9 || y < 16 || y > room.d * T - 4) return true;
      if (room.props.some((p) => p.solid && x + 6 > p.x && x - 6 < p.x + p.w && y + 2 > p.y && y - 4 < p.y + p.d)) return true;
      // companheiros parados também ocupam lugar (o que anda pelo corredor, não)
      return this.npcs(this.room).some((n) => n.anim !== 'run' && Math.abs(n.x - x) < 11 && Math.abs(n.y - y) < 7);
    },

    // muda de sala (fade): from = de onde veio (nasce na porta que leva de volta)
    go(roomId, from, instant) {
      const doIt = () => {
        this.room = roomId;
        const room = this.rooms()[roomId];
        const door = (room.wallItems || []).find((it) => it.kind === 'door' && it.to === from);
        if (door) {
          this.x = door.x + (door.w || 34) / 2;
          this.y = 34;
          this.view = 'front';
        } else {
          this.x = (room.w * T) / 2;
          this.y = (room.d * T) / 2;
          this.view = 'front';
        }
        if (this.blocked(this.x, this.y)) this.y += 20;
        this.target = null;
        this.bubble = null;
        this.hud.querySelector('.hub-room').textContent = ROOM_NAMES[roomId] === 'QUARTO' ? room.name : ROOM_NAMES[roomId];
      };
      if (instant) {
        doIt();
        this.fade = 0;
        return;
      }
      if (this.fadeTo) return;
      this.fadeTo = { doIt, k: 0 };
      window.SFX?.click?.();
    },

    interact() {
      if (!this.canAct()) return;
      const s = this.nearSpot();
      if (!s) return;
      if (s.door) return this.go(s.door, this.room);
      if (s.npc) {
        if (s.npc === 'anri') return this.openPanel('LOJA');
        // 1ª vez: o companheiro fala; de novo (enquanto a fala está na tela): RELAÇÕES
        if (this.bubble && this.bubble.npc === s.npc) return this.openPanel('RELACIONAMENTOS');
        const pool = LINES[s.npc] || LINES._;
        const text = pool[Math.floor(Math.random() * pool.length)];
        this.bubble = { npc: s.npc, text, until: this.t + 240, x: s.x, y: s.y - 6 };
        window.SFX?.blip?.(880);
        return;
      }
      if (s.act === 'SLEEP') {
        window.App.saveState?.();
        window.App.notify?.('💾 Você descansou um pouco. Jogo salvo.', '#22d3ee');
        return;
      }
      const a = ACT[s.act];
      if (a?.tab) this.openPanel(a.tab);
    },

    step() {
      this.t++;
      if (this.fadeTo) {
        this.fadeTo.k++;
        if (this.fadeTo.k === 12) this.fadeTo.doIt();
        if (this.fadeTo.k >= 24) this.fadeTo = null;
        return;
      }
      if (this.bubble && this.t > this.bubble.until) this.bubble = null;
      if (!this.canAct()) {
        this.moving = false;
        return;
      }
      let dx = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
      let dy = (this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0);
      let spd = this.keys.run ? 2.6 : 1.6;
      if (!dx && !dy && this.target) {
        const tx = this.target.x - this.x;
        const ty = this.target.y - this.y;
        const d = Math.hypot(tx, ty);
        if (d < 3 || (this.target.spot && d < 18)) {
          const sp = this.target.spot;
          this.target = null;
          if (sp) this.interact();
        } else {
          dx = tx / d;
          dy = ty / d;
          spd = 2;
        }
      }
      this.moving = !!(dx || dy);
      if (this.moving) {
        const n = Math.hypot(dx, dy) || 1;
        const vx = (dx / n) * spd;
        const vy = (dy / n) * spd;
        const nx = this.x + vx;
        const ny = this.y + vy;
        const bx = this.blocked(nx, this.y);
        const by = this.blocked(this.x, ny);
        if (!bx) this.x = nx;
        if (!by) this.y = ny;
        if (bx && by && this.target) this.target = null;
        if (Math.abs(vx) > Math.abs(vy) * 0.8) {
          this.view = 'side';
          this.left = vx < 0;
        } else this.view = vy < 0 ? 'back' : 'front';
        // empurrou a parede de fundo na frente de uma porta: entra
        if (vy < 0 && this.y < 20) {
          const s = this.spots().find((p) => p.door && Math.abs(p.x - this.x) < 16);
          if (s) this.go(s.door, this.room);
        }
      }
    },

    // ------------------------------------------------------------ desenho
    size() {
      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 720;
      const H = 288;
      const K = vh / H;
      const W = Math.max(320, Math.round(vw / K));
      if (!this._sized || this._sized.W !== W || this._sized.H !== H) {
        this.cv.width = vw;
        this.cv.height = vh;
        this.buf.width = W;
        this.buf.height = H;
        this._sized = { W, H, K };
      }
      return this._sized;
    },
    draw() {
      const { W, H, K } = this.size();
      const g = this.buf.getContext('2d');
      g.imageSmoothingEnabled = false;
      const App = window.App;
      const p = App.state.profile;
      const me = { skinColor: p.skinColor, hairColor: p.hairColor, hairSecondary: p.hairSecondary, eyeColor: p.eyeColor, eyeStyle: p.eyeStyle, hairStyle: p.hairStyle, jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8', number: p.number };
      const chars = this.npcs(this.room).map((n) => Object.assign({ frame: this.t, anim: 'idle' }, n));
      chars.push({ cd: me, x: this.x, y: this.y, view: this.view, left: this.left, anim: this.moving ? 'run' : 'idle', frame: this.moving ? Math.floor(this.t * (this.keys.run ? 0.9 : 0.6)) : this.t, accessories: App.state.equippedAccessories || [] });
      const res = renderRoom(g, W, H, this.room, { theme: this.theme(), t: this.t, rooms: this.rooms(), chars, focus: { x: this.x, y: this.y } });
      this.S = res.S;
      // fade entre salas
      if (this.fadeTo) {
        const k = this.fadeTo.k <= 12 ? this.fadeTo.k / 12 : (24 - this.fadeTo.k) / 12;
        g.fillStyle = `rgba(2,6,23,${Math.min(1, k)})`;
        g.fillRect(0, 0, W, H);
      }
      const o = this.cv.getContext('2d');
      o.imageSmoothingEnabled = false;
      o.drawImage(this.buf, 0, 0, this.cv.width, this.cv.height);
      this.drawHud(res.S, K);
    },
    drawHud(S, K) {
      const App = window.App;
      if (this.t % 20 === 0 || !this._hudInit) {
        this._hudInit = true;
        const st = App.state;
        this.hud.querySelector('.hub-name').textContent = (st.profile.name || 'VOCÊ').toUpperCase();
        const ovr = App.calculateOVR ? App.calculateOVR() : '';
        this.hud.querySelector('.hub-sub').textContent = `${st.profile.position || ''} • OVR ${ovr} • 🪙 ${st.currencies.egoCoins} • 🎰 ${st.currencies.spins}`;
      }
      const pr = this.hud.querySelector('.hub-prompt');
      const s = this.canAct() && !this.fadeTo ? this.nearSpot() : null;
      const txt = s ? `E • ${s.label}` : '';
      if (pr.textContent !== txt) pr.textContent = txt;
      pr.hidden = !s;
      const bb = this.hud.querySelector('.hub-bubble');
      if (this.bubble && S) {
        const c = window.BLUE_LOCK_CHARACTERS.find((x) => x.id === this.bubble.npc);
        const html = `<b>${this.bubble.npc.toUpperCase()}</b>${this.bubble.text}<small>E de novo: ver a relação</small>`;
        if (bb.innerHTML !== html) bb.innerHTML = html;
        bb.hidden = false;
        bb.style.left = `${Math.round(S.sx(this.bubble.x) * K)}px`;
        bb.style.top = `${Math.round((S.sy(this.bubble.y) - 60) * K)}px`;
      } else bb.hidden = true;
    }
  };
  window.Hub = Hub;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Hub.init());
  else Hub.init();
})();
