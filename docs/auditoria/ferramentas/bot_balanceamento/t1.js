const out = [];
const t0 = realNow();
for (let k = 0; k < 3; k++) {
  const a = realNow();
  const r = await playOne('ch2_first_selection_v', { diff: 'normal' });
  r.ms = Math.round(realNow() - a);
  out.push(r);
}
const a = realNow();
const r2 = await playOne('ch2_first_selection_v', { diff: 'normal', stats: allStats(60), w1: 'wp_epico_yukimiya', f1: 'fl_comum_foco' });
r2.ms = Math.round(realNow() - a);
out.push(r2);
return { out, total: Math.round(realNow() - t0), errs: errs.slice(0, 10) };
