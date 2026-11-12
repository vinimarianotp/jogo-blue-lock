// Taxa de vitória do bot por capítulo x build x dificuldade (N partidas cada)
const N = 3;
const chs = [
  ['ch1b_team_y', 7, {}], ['ch2_first_selection_v', 15, {}], ['ch4_third_selection', 27, {}], ['ch4b_trio_tournament', 32, { round: 0 }],
  ['ch6_nel_barcha_manshine', 47, { nel: true }], ['ch8_u20_england', 66, { nel: true, round: 3 }], ['ch10_fox_training', 81, { nel: true, monster: true }],
  ['ch13_world_cup', 110, { nel: true, monster: true, round: 7 }], ['ch14_rin_final', 125, { nel: true, monster: true }]
];
const out = [];
const t0 = realNow();
for (const [id, v, extra] of chs) {
  const builds = [['n', v], ['h', Math.round(v / 2)]];
  if (v <= 15) builds.push(['z', 0]);
  for (const [bn, bv] of builds) {
    for (const diff of ['facil', 'normal', 'egoista']) {
      const agg = { id: id.slice(0, 12), b: bn, v: bv, diff, W: 0, D: 0, L: 0, gf: 0, ga: 0, my: 0, sh: 0 };
      for (let k = 0; k < N; k++) {
        const o = Object.assign({ diff, stats: allStats(bv) }, extra);
        if (bv > 0) { o.w1 = 'wp_epico_yukimiya'; o.f1 = 'fl_epico_rua'; if (o.nel) { o.w2 = 'wp_raro_zantetsu'; o.f2 = 'fl_raro_ginga'; o.evo = 'evo_predator_eye'; } }
        const r = await playOne(id, o);
        if (r.won) agg.W++; else if (r.gf === r.ga) agg.D++; else agg.L++;
        agg.gf += r.gf; agg.ga += r.ga; agg.my += r.my || 0; agg.sh += r.sh || 0;
      }
      out.push(`${agg.id} ${agg.b}${agg.v} ${agg.diff}: V${agg.W} E${agg.D} D${agg.L} gols ${agg.gf}x${agg.ga} (seus ${agg.my}/${agg.sh} chutes)`);
    }
  }
}
return { ms: Math.round(realNow() - t0), out, errs: [...new Set(errs)].slice(0, 10) };
