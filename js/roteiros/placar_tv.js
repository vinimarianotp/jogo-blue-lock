// ============================================================================
// O PLACAR DA PARTIDA NAS CENAS QUE INTERROMPEM O JOGO (grupo B do lote 1)
// Um placar pequeno de transmissão no canto de cima da imagem (Jersey 10, CUTSCENE_STYLE
// §1.3), igual nas cenas 11 (scripted_shot), 31 (nel_metavision_goal) e 45
// (monster_awaken): o mesmo placar que o jogador está vendo no jogo, nunca um placar fixo.
//   CE.rtPlacar(ctx, S, { hl, al, hs, as, min, pop: 'home'|'away', popK: 0..1 })
// pop/popK: o número que acabou de mudar dá um pulo e fica na cor do time por um instante.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE) return;
  const FONTE = '"Jersey 10", "Arial Narrow", sans-serif';
  CE.rtPlacar = function (ctx, S, o) {
    const x = 30;
    const y = S.top + 16;
    const h = 34;
    const hl = String(o.hl || 'CASA').toUpperCase().slice(0, 16);
    const al = String(o.al || 'RIVAL').toUpperCase().slice(0, 16);
    const min = o.min ? String(o.min) : '';
    ctx.save();
    ctx.font = `26px ${FONTE}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const wh = Math.max(70, ctx.measureText(hl).width + 22);
    const wa = Math.max(70, ctx.measureText(al).width + 22);
    const ws = 74;
    const wm = min ? 56 : 0;
    ctx.fillStyle = 'rgba(2,6,23,0.82)';
    ctx.fillRect(x, y, wh + ws + wa + wm, h);
    // a faixa de cada time: a casa em azul, o rival em vermelho (como no placar do jogo)
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x, y, 5, h);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + wh + ws + wa - 5, y, 5, h);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(hl, x + wh / 2 + 2, y + h / 2 + 1);
    ctx.fillText(al, x + wh + ws + wa / 2 - 2, y + h / 2 + 1);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x + wh, y, ws, h);
    const num = (v, cx, lado) => {
      const k = o.pop === lado ? o.popK || 0 : 0;
      const vivo = k > 0 && k < 1;
      ctx.save();
      ctx.translate(cx, y + h / 2 + 1);
      const sc = 1 + (vivo ? Math.sin(k * Math.PI) * 0.5 : 0);
      ctx.scale(sc, sc);
      ctx.fillStyle = vivo ? (lado === 'home' ? '#0e7490' : '#b91c1c') : '#0b1020';
      ctx.font = `30px ${FONTE}`;
      ctx.fillText(String(v), 0, 0);
      ctx.restore();
    };
    num(o.hs ?? 0, x + wh + ws * 0.25, 'home');
    num(o.as ?? 0, x + wh + ws * 0.75, 'away');
    ctx.fillStyle = '#0b1020';
    ctx.font = `26px ${FONTE}`;
    ctx.fillText('-', x + wh + ws / 2, y + h / 2);
    if (wm) {
      ctx.fillStyle = '#facc15';
      ctx.fillText(min, x + wh + ws + wa + wm / 2, y + h / 2 + 1);
    }
    ctx.restore();
  };
})();
