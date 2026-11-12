const CH = window.CAREER_CHAPTERS;
const chapters = CH.map((c, i) => ({
  i, id: c.id, n: c.chapterNumber, fmt: c.format || '', diff: c.difficulty, tg: c.targetGoals, gl: c.goalLimit || null, dur: c.matchDuration,
  rc: c.rewardCoins, rs: c.rewardSpins, rsp: c.rewardSP, aol: !!c.advanceOnLoss, diw: c.drawIsWin, edgeCap: c.rivalEdgeCap ?? null, hype: !!c.hype,
  big: !!c.bigTeams, v3: !!c.threeVsThree, opp: (c.opponentIds || []).join(','), mates: (c.teammateIds || []).join(','),
  sgA: (c.script?.goals || []).filter((g) => g.team === 'away' && !g.bonus).length, sgH: (c.script?.goals || []).filter((g) => g.team === 'home' && !g.bonus).length,
  sgBonus: (c.script?.goals || []).filter((g) => g.bonus).length, climax: c.script?.climax ? `${c.script.climax.home}x${c.script.climax.away}->${c.script.climax.finalHome ?? c.script.climax.home + 1}` : '',
  flash: c.losingFlashback || '', monster: !!c.unlocksMonster, monsterTest: !!c.monsterTest, extra: !!c.extraForOldSaves,
  rounds: (c.trioRounds || c.cupRounds || []).length, rank: window.BLUE_LOCK_RANKING[c.id], wc: (c.opponentIds || []).filter((id) => window.findCharacter(id)?.worldClass).join(',')
}));
// diálogos com escolhas (data_story + interlúdios + capítulos)
const choiceLines = [];
const scan = (src, lines) => (lines || []).forEach((l, k) => { if (l && l.choices) choiceLines.push({ src, k, id: l.id || null, opts: l.choices.map((c) => ({ label: String(c.label).slice(0, 50), aff: c.effects?.affinity || null, st: c.effects?.stats || null })) }); });
Object.entries(window.CHAPTER_DIALOGUES || {}).forEach(([k, v]) => scan('DLG:' + k, v));
Object.entries(window.STORY_INTERLUDES || {}).forEach(([k, v]) => scan('INT:' + k, v.lines));
CH.forEach((c) => { scan('INTRO:' + c.id, c.introCutscene); scan('POST:' + c.id, c.postMatchCutscene); (c.cupRounds || []).forEach((r, j) => scan('CUP:' + c.id + ':' + j, r.intro)); (c.trioRounds || []).forEach((r, j) => scan('TRIO:' + c.id + ':' + j, r.intro)); });
['RIN_RIVAL_SCENE', 'FOX_ARRIVAL', 'NEL_DRAFT_INTRO'].forEach((k) => scan('G:' + k, window[k]));
const weapons = window.WEAPONS_DB.map((w) => ({ id: w.id, r: w.rarity, secret: !!w.secret, sk: w.skills.map((s) => s.type + ':' + (s.move || '') + ':' + s.power + ':cd' + s.cd).join(' | '), pas: w.passive ? w.passive.kind + '=' + w.passive.value : '' }));
const flows = window.FLOWS_DB.map((f) => ({ id: f.id, r: f.rarity, secret: !!f.secret, dur: f.duration, fx: JSON.stringify(f.fx || {}), eff: f.effect }));
const rar = {}; window.WEAPONS_DB.forEach((w) => { if (!w.secret) rar[w.rarity] = (rar[w.rarity] || 0) + 1; });
const rarF = {}; window.FLOWS_DB.forEach((w) => { if (!w.secret) rarF[w.rarity] = (rarF[w.rarity] || 0) + 1; });
return { nCh: CH.length, chapters, choiceLines, nChoice: choiceLines.length, withId: choiceLines.filter((c) => c.id).length, weaponsN: weapons.length, rar, rarF, weapons, flows, evo: window.NEL_EVOLUTIONS.map((e) => ({ id: e.id, b: e.bonuses })), secretsW: window.WEAPONS_DB.filter((w) => w.secret).map((w) => w.id), secretsF: window.FLOWS_DB.filter((f) => f.secret).map((f) => f.id), drills: window.TRAINING_DRILLS.map((d) => d.id + ':' + JSON.stringify(d.statGains) + ' sp' + d.spGain + ' c' + d.coinGain) };
