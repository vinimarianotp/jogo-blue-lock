// Peso de equipamento, monstro, habilidade manual (variantes do bot) e sorte
const out = [];
const t0 = realNow();
const agg = async (label, id, o, N, bot = {}) => {
  const keep = Object.assign({}, BOT);
  Object.assign(BOT, bot);
  let W = 0, D = 0, L = 0, gf = 0, ga = 0, my = 0, sh = 0;
  const diffs = [];
  for (let k = 0; k < N; k++) {
    const r = await playOne(id, Object.assign({}, o));
    if (r.won) W++; else if (r.gf === r.ga) D++; else L++;
    gf += r.gf; ga += r.ga; my += r.my || 0; sh += r.sh || 0; diffs.push(r.gf - r.ga);
  }
  Object.assign(BOT, keep);
  out.push(`${label.padEnd(34)} V${W} E${D} D${L} gols ${gf}x${ga} seus ${my}/${sh} chutes | saldos ${diffs.join(',')}`);
};
// 1) equipamento no Cap. 4 Egoísta, atributos 25
const st25 = allStats(25);
await agg('sem arma/fluxo', 'ch4_third_selection', { diff: 'egoista', stats: st25 }, 5);
await agg('arma Comum', 'ch4_third_selection', { diff: 'egoista', stats: st25, w1: 'wp_comum_passe' }, 5);
await agg('arma Épica (Yukimiya)', 'ch4_third_selection', { diff: 'egoista', stats: st25, w1: 'wp_epico_yukimiya' }, 5);
await agg('arma Lendária (Bachira)', 'ch4_third_selection', { diff: 'egoista', stats: st25, w1: 'wp_lendario_bachira' }, 5);
await agg('arma WC (Kaiser)', 'ch4_third_selection', { diff: 'egoista', stats: st25, w1: 'wp_wc_kaiser' }, 5);
await agg('arma WC secreta (madrugada)', 'ch4_third_selection', { diff: 'egoista', stats: st25, w1: 'wp_wc_segredo_monstro' }, 5);
await agg('só Fluxo WC (Quatro Egos)', 'ch4_third_selection', { diff: 'egoista', stats: st25, f1: 'fl_wc_quatro_egos' }, 5);
await agg('arma WC + Fluxo WC', 'ch4_third_selection', { diff: 'egoista', stats: st25, w1: 'wp_wc_kaiser', f1: 'fl_wc_quatro_egos' }, 5);
await agg('monstro liberado (sem arma)', 'ch4_third_selection', { diff: 'egoista', stats: st25, monster: true }, 5);
// 2) habilidade manual: variantes do bot no Cap. 4 Normal, atributos 27, arma Épica
const o27 = { diff: 'normal', stats: allStats(27), w1: 'wp_epico_yukimiya', f1: 'fl_epico_rua' };
await agg('bot completo', 'ch4_third_selection', o27, 10);
await agg('bot sem skills/Fluxo/Química', 'ch4_third_selection', o27, 6, { useSkills: false, useFlow: false, useChem: false });
await agg('bot sem driblar', 'ch4_third_selection', o27, 6, { dribble: false });
await agg('bot chuta de longe (800)', 'ch4_third_selection', o27, 6, { shotDist: 800 });
await agg('bot chute carregado 95', 'ch4_third_selection', o27, 6, { charge: 95 });
// 3) química alta x baixa com o parceiro (Reação Química) no Cap. 4 Normal
await agg('química 100 com todos', 'ch4_third_selection', Object.assign({}, o27, { aff: { bachira: 100, kunigami: 100, chigiri: 100, nagi: 100, reo: 100, barou: 100, isagi: 100, hiori: 100, yukimiya: 100, shidou: 100, sae: 100, rin: 100, kurona: 100 } }), 6);
await agg('química 0 com todos', 'ch4_third_selection', Object.assign({}, o27, { aff: { bachira: 0, kunigami: 0, chigiri: 0, nagi: 0, reo: 0, barou: 0, isagi: 0, hiori: 0, yukimiya: 0, shidou: 0, sae: 0, rin: 0, kurona: 0 } }), 6);
return { ms: Math.round(realNow() - t0), out, errs: [...new Set(errs)].slice(0, 10), mates: CH.find((c) => c.id === 'ch4_third_selection').teammateIds };
