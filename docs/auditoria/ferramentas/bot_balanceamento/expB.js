// Atributo único x distribuído: mesmo orçamento (360 pontos) no Cap. 4 (dif. 4) e na Semifinal da Copa Sub-20 (dif. 7)
const KS = ['velocidade', 'resistencia', 'forca', 'habilidadeAerea', 'finalizando', 'poderDisparo', 'tirosLongos', 'conducao', 'visao', 'posicionamento', 'compostura', 'ego'];
const out = [];
const t0 = realNow();
const run = async (id, diff, extra, N, base, bonus) => {
  const builds = [['espalhado', Object.assign(allStats(base + bonus / 12))]];
  KS.forEach((k) => { const s = allStats(base); s[k] += bonus; builds.push([k, s]); });
  for (const [bn, st] of builds) {
    let W = 0, D = 0, L = 0, gf = 0, ga = 0, my = 0, sh = 0, dr = 0;
    for (let k = 0; k < N; k++) {
      const r = await playOne(id, Object.assign({ diff, stats: st, w1: 'wp_epico_yukimiya', f1: 'fl_epico_rua' }, extra));
      if (r.won) W++; else if (r.gf === r.ga) D++; else L++;
      gf += r.gf; ga += r.ga; my += r.my || 0; sh += r.sh || 0; dr += r.dr || 0;
    }
    out.push(`${id.slice(0, 10)} ${diff} ${bn.padEnd(15)} V${W} E${D} D${L} saldo ${(gf - ga) >= 0 ? '+' : ''}${gf - ga} (${gf}x${ga}) seus gols ${my}/${sh} chutes, dribles ${dr}`);
  }
};
await run('ch4_third_selection', 'normal', {}, 4, 10, 240);
await run('ch8_u20_england', 'normal', { nel: true, round: 3 }, 4, 40, 300);
return { ms: Math.round(realNow() - t0), out, errs: [...new Set(errs)].slice(0, 10) };
