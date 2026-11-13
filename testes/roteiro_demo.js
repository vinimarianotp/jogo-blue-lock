(async () => {
  // TESTE DO MOTOR DE ROTEIRO (js/cine_roteiro.js): monta uma cena de demonstração que usa o
  // vocabulário inteiro (câmera de → para, atores andando, arremesso, tempo próprio com câmera
  // lenta, silhueta, falas dos 4 tipos, quadro largo, onomatopeia, letreiro de TV, flashes,
  // narração, cortes wipe e vidro, escolha) e devolve uma folha com 2 quadros por plano.
  // Também toca a cena de verdade até a escolha, clica a 2ª opção e confere o estado.
  //   powershell -NoProfile -File testes\rodar.ps1 -teste roteiro_demo -saida C:\Users\Public\bl_f2motor\demo -timeout 600000
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = [];
  window.addEventListener('error', (e) => errs.push('onerror: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  const ce0 = console.error.bind(console);
  console.error = (...a) => {
    errs.push(a.map((x) => (x && x.stack) || String(x)).join(' ').slice(0, 300));
    ce0(...a);
  };
  const App = window.App, H = window.Hub, CE = window.CutsceneEngine;
  App.startNewCareer(1, { name: 'Teste' }, 'normal');
  await wait(300);
  App.closeTitleScreen();
  for (let i = 0; i < 60; i++) {
    const m = document.querySelector('#cinematic-modal.open');
    if (m) {
      const b = m.querySelector('.dilemma-buttons button, button');
      if (b) b.click();
    } else if (CE.sakugaActive) CE.finishSakuga();
    else if (CE.active) {
      if (CE.awaitingChoice) CE.choose(0);
      else CE.next();
    } else if (i > 4) break;
    await wait(80);
  }
  H.glFix = true;
  if (H.GL3D) H.GL3D.scale = 0.6;
  await wait(500);
  if (!CE.roteiro) return { resultado: 'FALHOU', erro: 'CE.roteiro não existe' };
  const R = CE.roteiro;
  const C = [53, 14.5]; // meio do campo do prédio
  let escolheu = null;
  R('roteiro_demo', {
    titulo: () => 'DEMONSTRAÇÃO DO ROTEIRO',
    musica: 'tension',
    leitura: 0.85,
    cenario(K) {
      K.sky('#0b1636', '#1e3a8a', 0.6);
    },
    planos: [
      {
        id: 'chegada',
        dur: 220,
        expo: 1.0,
        cam: { de: [[C[0] + 5, 1.2, C[1] + 4], [C[0], 0.6, C[1]], 50], para: [[C[0] + 3.2, 0.9, C[1] + 3], [C[0], 0.55, C[1]], 44], curva: 'easeIO' },
        atores: [
          { quem: 'you', de: [C[0] - 2, C[1]], para: [C[0] - 0.3, C[1]], anim: 'andar', olha: [C[0] + 3, C[1]], kit: 'blueLock', sombra: 0.4 },
          { quem: 'rin', x: C[0] + 1.2, y: C[1] - 0.4, olha: [C[0] - 1, C[1]], kit: 'blueLock', luz: [0.9, 0.95, 1.05], olhos: { cor: '#2dd4bf', forca: 0.8 } }
        ],
        falas: [
          { em: 20, quem: 'RIN ITOSHI', texto: '"Você ainda não entendeu o que é jogar aqui."' },
          { em: 130, quem: 'you', texto: '(Eu entendi. Só não vou parar.)', tipo: 'pensamento' }
        ],
        letreiros: [{ em: 10, texto: 'BLUE LOCK • CAMPO • 23:45', cor: '#00f5d4' }, { em: 30, texto: 'REPLAY', estilo: 'tv' }],
        corte: 'wipe'
      },
      {
        id: 'arremesso',
        dur: 200,
        cam: { de: [[C[0], 1.0, C[1] + 5], [C[0], 0.9, C[1]], 46], para: [[C[0] + 0.6, 0.8, C[1] + 4.4], [C[0], 1.1, C[1]], 48] },
        lento: { em: 60, ate: 160, fator: 0.2, rampa: 16 },
        atores: [
          { quem: 'bachira', de: [C[0], C[1], 0], para: [C[0], C[1], 0], arco: 1.4, em: 30, ate: 170, anim: 'celebrate', olha: 'camera', kit: 'blueLock' },
          { quem: 'chigiri', x: C[0] - 0.7, y: C[1] + 0.2, anim: 'clap', olha: 'camera', kit: 'blueLock' },
          { quem: 'you', tempo: 'real', de: [C[0] + 2.4, C[1] + 0.6], para: [C[0] + 0.8, C[1] + 0.4], anim: 'andar', olha: [C[0], C[1]], kit: 'blueLock' },
          { quem: 'you', id: 'sombra', x: C[0] + 0.3, y: C[1] + 0.3, olha: [C[0], C[1]], silhueta: { cor: '#00f5d4', alpha: 0.45 }, kit: 'blueLock' }
        ],
        falas: [{ em: 20, quem: 'BACHIRA', texto: '"VAI, VAI, VAI!!"', tipo: 'grito' }],
        efeitos: [
          { tipo: 'flashes', em: 10, ate: 190, n: 8 },
          { tipo: 'cor', em: 40, ate: 200, de: '#1e3a8a', para: '#f97316', forca: 0.35 }
        ],
        corte: 'vidro'
      },
      {
        id: 'pulsos',
        dur: 200,
        cam: { de: [[C[0] + 2, 0.7, C[1] + 2], [C[0], 0.6, C[1]], 44], para: [[C[0] + 1.6, 0.66, C[1] + 1.6], [C[0], 0.6, C[1]], 40] },
        atores: [{ quem: 'you', x: C[0], y: C[1], olha: 'camera', kit: 'blueLock' }],
        quadros: [
          {
            em: 20,
            ate: 190,
            layout: 'largo',
            desenho(b, g, q) {
              g.fillStyle = '#0f172a';
              g.fillRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16);
              [0.3, 0.7].forEach((fx, i) => {
                g.fillStyle = i ? '#fb7185' : '#00f5d4';
                g.fillRect(b.x + b.w * fx - 50, b.y + b.h * 0.4, 100, 50 + Math.sin(q * 20) * 4);
                g.fillStyle = '#f1c9a5';
                g.fillRect(b.x + b.w * fx - 40, b.y + b.h * 0.4 - 60, 80, 70);
              });
            }
          }
        ],
        falas: [{ em: 30, quem: 'EGO', texto: '"...ouçam."', tipo: 'sussurro' }],
        efeitos: [{ tipo: 'pulso', em: 0, ate: 200, bpm: 100, forca: 0.7 }]
      },
      {
        id: 'golpe',
        dur: 180,
        cam: { de: [[C[0] + 3, 0.5, C[1] + 1], [C[0], 0.5, C[1]], 46], para: [[C[0] + 2.2, 0.45, C[1] + 0.8], [C[0], 0.5, C[1]], 42] },
        atores: [{ quem: 'you', x: C[0], y: C[1], anim: (t) => (t < 60 ? 'windup' : 'shoot'), frame: (t) => (t < 60 ? 1 : 5), olha: [C[0] - 3, C[1]], kit: 'blueLock' }],
        cena(K, S, st) {
          st.pe = R.ponto(C[0] - 0.2, C[1], 0.15);
          K.ball(C[0] - 0.25 - (S.t > 62 ? (S.t - 62) * 0.08 : 0), C[1], 0.06);
        },
        efeitos: [
          { tipo: 'impacto', em: 62, ate: 64 },
          { tipo: 'tremor', em: 62, ate: 90, forca: 0.5 },
          { tipo: 'linhas', modo: 'radial', em: 62, ate: 72, alvo: 'pe', forca: 0.45, cor: '#e0f2fe' }
        ],
        onomatopeias: [{ em: 62, ate: 130, texto: 'DOM', x: 0.62, y: 0.35, tam: 110, cor: '#facc15' }],
        falas: [{ em: 90, quem: 'NARRADOR', texto: 'Uma chance. Um chute.' }]
      },
      { id: 'frase', narracao: 'A última peça do quebra-cabeça sou eu.' },
      {
        id: 'escolha',
        dur: 200,
        cam: { de: [[C[0] + 3, 1.0, C[1] + 3], [C[0], 0.6, C[1]], 48], para: [[C[0] + 2.6, 1.0, C[1] + 2.6], [C[0], 0.6, C[1]], 46] },
        atores: [{ quem: 'you', x: C[0], y: C[1], olha: 'camera', kit: 'blueLock' }],
        falas: [{ em: 10, quem: 'EGO', texto: '"Passa ou chuta?"' }],
        escolha: {
          em: 80,
          opcoes: [
            { texto: 'PASSAR', fn: (e) => (e.decisao = 'passar') },
            { texto: 'CHUTAR', fn: (e) => (e.decisao = 'chutar'), ir: 'fim' }
          ]
        }
      },
      {
        id: 'fim',
        dur: 200,
        cam: { de: [[C[0], 2.4, C[1] + 6], [C[0], 0.6, C[1]], 50], para: [[C[0], 1.8, C[1] + 5], [C[0], 0.6, C[1]], 46] },
        atores: [{ quem: 'you', x: C[0], y: C[1], anim: 'celebrate', olha: 'camera', kit: 'blueLock' }],
        cena(K, S) {
          escolheu = S.estado.decisao || escolheu;
        },
        cartela: { em: 60, kicker: 'DEMONSTRAÇÃO', titulo: 'ROTEIRO PRONTO', cor: '#00f5d4' }
      },
      {
        // extras: câmera que segue, pausa no impacto, bola com arco e sombra no alto, placar,
        // quem como função, "se", silhueta depois do P&B, sombra comprida, canvas animado
        id: 'extras',
        dur: 240,
        cam: { segue: 'corredor', dist: 3.4, altura: 1.2, ang: Math.PI / 2, alvo: 0.5, fov: 48 },
        pausa: { em: 120, quadros: 6 },
        atores: [
          { quem: 'you', id: 'corredor', de: [C[0] - 2, C[1]], para: [C[0] + 2, C[1]], anim: 'correr', olha: [C[0] + 4, C[1]], kit: 'blueLock' },
          { quem: (t) => (t < 120 ? 'rin' : 'bachira'), id: 'troca', x: C[0] + 0.9, y: C[1] - 1.1, olha: 'camera', kit: 'blueLock' },
          { quem: 'nagi', x: C[0] - 1, y: C[1] - 1.2, se: (t) => t > 60, olha: 'camera', kit: 'blueLock' },
          { quem: 'you', id: 'fantasma', x: C[0] + 0.4, y: C[1] + 0.4, silhueta: { cor: '#00f5d4', alpha: 0.7 }, kit: 'blueLock' }
        ],
        bola: { de: [C[0] - 1.5, C[1] + 0.2, 0.1], para: [C[0] + 2.5, C[1] - 0.3, 0.1], arco: 2.6, em: 40, ate: 200 },
        cena(K, S) {
          CE.roteiro.sombra(K, { x: C[0] - 1, y: C[1] - 1.2, ang: 0.5, comp: 2.4, larg: 0.45 });
          const L = CE.roteiro.telaViva('demo_relogio', 32, 16, S.f, 10, (g, w, h, f) => {
            g.fillStyle = '#020617';
            g.fillRect(0, 0, w, h);
            g.fillStyle = '#facc15';
            g.fillRect(2, 4, ((f / 10) % 28) + 1, 8);
          });
          K.floor({ x0: C[0] - 0.6, y0: C[1] + 1.2, x1: C[0] + 0.6, y1: C[1] + 1.8, img: L.cv, dirty: L.dirty, em: true });
        },
        efeitos: [{ tipo: 'pb', em: 100, ate: 160, forca: 0.85 }],
        onomatopeias: [{ em: 120, ate: 175, texto: 'TUM', alvo: 'troca', tam: 64, cor: '#facc15' }],
        placar: { casa: 'BLUE LOCK', fora: 'SUB-20', gols: (t) => (t < 120 ? [3, 3] : [4, 3]), minuto: "90+3'" },
        sons: [{ em: 120, som: 'chute', arg: 0.5, tempo: 'acao' }],
        falas: [
          { em: 10, ate: 100, quem: () => 'EGO', texto: '"Extras do roteiro."' },
          { em: 110, quem: 'RIN', texto: '"Só aparece se a condição deixar."', se: () => true },
          { em: 112, quem: 'NAGI', texto: '"Esta não entra."', se: () => false }
        ]
      }
    ]
  });
  const chk = R.checar('roteiro_demo');
  // pré-carregamento: tocando pela 1ª vez, os bonecos são ensaiados antes do 1º quadro e o
  // relógio da cena não anda enquanto isso
  const pre = { carregou: false, relogioParado: true, ms: null, ensaios: CE.CINE3D.roteiro_demo.ensaio.length };
  CE.playActionSakuga('roteiro_demo', null);
  for (let i = 0; i < 400; i++) {
    await wait(16);
    const L = CE.cine3dLoad && CE.cine3dLoad();
    if (L && L.type === 'roteiro_demo') {
      pre.carregou = true;
      if (!L.done && CE.sakugaPhaseTimer > 0) pre.relogioParado = false;
      if (L.done) {
        pre.ms = L.ms;
        break;
      }
    }
  }
  CE.finishSakuga();
  await wait(300);
  // folha: 2 quadros por plano
  const cv = document.getElementById('sakuga-action-canvas');
  const ph = CE.CINE3D.roteiro_demo.phases;
  const TW = 400, TH = 225, PAD = 8, LAB = 18;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + 2 * (TW + PAD);
  sheet.height = PAD + ph.length * (TH + LAB + PAD);
  const sg = sheet.getContext('2d');
  sg.fillStyle = '#0b0f19';
  sg.fillRect(0, 0, sheet.width, sheet.height);
  CE.cineFreeze('roteiro_demo', 0, 1);
  const amostras = [[0.3, 0.75], [0.35, 0.6], [0.4, 0.8], [0.35, 0.4], [0.3, 0.9], [0.2, 0.6], [0.2, 0.7], [0.45, 0.52]];
  for (let p = 0; p < ph.length; p++) {
    for (let i = 0; i < 2; i++) {
      const t = Math.floor(ph[p] * amostras[p][i]);
      // (o quadro de impacto do plano 4 cai em t 62–64)
      CE.cineFreeze('roteiro_demo', p, p === 3 && i === 1 ? 63 : t);
      const x = PAD + i * (TW + PAD);
      const y = PAD + p * (TH + LAB + PAD);
      sg.drawImage(cv, x, y + LAB, TW, TH);
      sg.fillStyle = '#e2e8f0';
      sg.font = '700 13px Inter, sans-serif';
      sg.fillText(`P${p + 1} • t ${p === 3 && i === 1 ? 63 : t}`, x, y + 13);
      await wait(10);
    }
  }
  // as transições (início do plano depois do wipe e do vidro)
  const tr = document.createElement('canvas');
  tr.width = PAD + 3 * (TW + PAD);
  tr.height = PAD + 2 * (TH + LAB + PAD);
  const tg = tr.getContext('2d');
  tg.fillStyle = '#0b0f19';
  tg.fillRect(0, 0, tr.width, tr.height);
  for (const [row, p] of [[0, 1], [1, 2]]) {
    CE.cineFreeze('roteiro_demo', p - 1, ph[p - 1] - 2);
    for (let i = 0; i < 3; i++) {
      const t = [3, 8, row ? 20 : 12][i];
      CE.cineFreeze('roteiro_demo', p, t);
      const x = PAD + i * (TW + PAD);
      const y = PAD + row * (TH + LAB + PAD);
      tg.drawImage(cv, x, y + LAB, TW, TH);
      tg.fillStyle = '#e2e8f0';
      tg.font = '700 13px Inter, sans-serif';
      tg.fillText(`${row ? 'vidro' : 'wipe'} • P${p + 1} t ${t}`, x, y + 13);
    }
  }
  CE.finishSakuga();
  await wait(300);
  // tocando de verdade: pula até a escolha e escolhe CHUTAR (vai para o plano "fim")
  let fim = false;
  CE.playActionSakuga('roteiro_demo', () => (fim = true));
  await wait(400);
  CE.sakugaPhase = 5;
  CE.sakugaPhaseTimer = 70;
  let apareceu = false;
  for (let i = 0; i < 60 && !apareceu; i++) {
    await wait(100);
    const box = document.getElementById('rt-escolha');
    apareceu = !!(box && !box.hidden && box.querySelectorAll('button.bl-btn').length === 2);
  }
  const parado = CE.sakugaPhaseTimer;
  await wait(500);
  const relogioParado = Math.abs(CE.sakugaPhaseTimer - parado) < 0.01;
  window.__shot('roteiro_escolha');
  await wait(1500);
  const b2 = document.querySelectorAll('#rt-escolha button')[1];
  if (b2) b2.click();
  await wait(300);
  const foiPara = CE.sakugaPhase;
  CE.finishSakuga();
  await wait(300);
  const out = {
    resultado: errs.length ? 'FALHOU' : 'OK',
    preCarga: pre,
    falasNoPlanoExtras: CE.CINE3D.roteiro_demo.subs[7].map((s) => s.who + ': ' + s.text),
    titulo: CE.CINE3D.roteiro_demo.title,
    picos: chk.picos,
    avisos: chk.avisos,
    escolha: { apareceu, relogioParado, foiParaPlano: foiPara + 1, estado: CE.roteiro.cenas.roteiro_demo.estado.decisao, terminou: fim },
    erros: errs.slice(0, 20),
    imgs: { 'roteiro_demo.jpg': sheet.toDataURL('image/jpeg', 0.86), 'roteiro_cortes.jpg': tr.toDataURL('image/jpeg', 0.86) }
  };
  void escolheu;
  await wait(6000);
  return out;
})()
