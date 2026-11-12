const res = [];
res.push(await runCareer({ name: 'normal-bal', diff: 'normal', strat: 'bal', keepAt: 3, cap: 10, slot: 1 }));
res.push(await runCareer({ name: 'egoista-bal', diff: 'egoista', strat: 'bal', keepAt: 3, cap: 10, slot: 2 }));
return { res, errs: [...new Set(errs)].slice(0, 15) };
