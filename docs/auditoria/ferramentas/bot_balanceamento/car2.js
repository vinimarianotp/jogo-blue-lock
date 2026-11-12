const res = [];
res.push(await runCareer({ name: 'facil-bal', diff: 'facil', strat: 'bal', keepAt: 3, cap: 10, slot: 1 }));
res.push(await runCareer({ name: 'normal-fin', diff: 'normal', strat: 'fin', keepAt: 3, cap: 10, slot: 2 }));
res.push(await runCareer({ name: 'normal-semtreino', diff: 'normal', strat: 'bal', keepAt: 3, cap: 10, slot: 1, noTrain: true }));
res.push(await runCareer({ name: 'egoista-semtreino', diff: 'egoista', strat: 'bal', keepAt: 3, cap: 10, slot: 2, noTrain: true }));
return { res, errs: [...new Set(errs)].slice(0, 15) };
