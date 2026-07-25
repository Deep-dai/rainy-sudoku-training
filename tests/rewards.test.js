const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

function createElementStub() {
  return {
    hidden: false,
    textContent: "",
    className: "",
    dataset: {},
    style: { setProperty() {}, removeProperty() {} },
    classList: { toggle() {}, add() {}, remove() {} },
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    append() {},
    replaceChildren() {},
  };
}

// 任意取到的元素都返回同一个稳定的桩，省去逐个声明。
const elementStubs = new Map();
const elsProxy = new Proxy({}, {
  get(target, key) {
    if (!elementStubs.has(key)) {
      elementStubs.set(key, createElementStub());
    }
    return elementStubs.get(key);
  },
});

const storage = createStorage();
const context = vm.createContext({
  console,
  Math,
  Number,
  JSON,
  Object,
  Set,
  Boolean,
  String,
  Array,
  window: { localStorage: storage },
  document: {
    createElement: () => createElementStub(),
    createDocumentFragment: () => createElementStub(),
  },
  settings: { size: 6, difficulty: "super", durationMinutes: 10 },
  SIZE_CONFIG: { 6: { defaultMinutes: 8 }, 9: { defaultMinutes: 20 } },
  COPY: {
    super: "超级简单",
    very: "非常简单",
    easy: "简单",
    expert: "高手难度",
    master: "超级高手",
  },
  state: {
    size: 6,
    difficulty: "super",
    usedHint: false,
    rewardGranted: false,
    currentReward: null,
    outcomeGranted: false,
    currentOutcome: null,
  },
  els: elsProxy,
});

context.applySettingsToControls = () => {};
context.saveSettings = () => {};
context.startNewGame = () => {};

context.displayValues = [];
context.getDisplayValues = () => context.displayValues;
context.hideNumberPad = () => {};
context.setMessage = () => {};
context.playTone = () => {};
context.render = () => {};
context.stopTimer = () => {};
context.formatSeconds = () => "00:10";
context.getElapsedSeconds = () => 10;
context.lastResult = null;
context.showResult = (title, text, options = {}) => {
  context.lastResult = { title, text, hasReward: Boolean(options.reward) };
};

vm.runInContext(fs.readFileSync("scripts/app-rewards.js", "utf8"), context, {
  filename: "scripts/app-rewards.js",
});

const mapping = JSON.parse(JSON.stringify(vm.runInContext(`({
  sixSuper: getRewardTier(6, "super"),
  sixVery: getRewardTier(6, "very"),
  sixEasy: getRewardTier(6, "easy"),
  sixExpert: getRewardTier(6, "expert"),
  nineSuper: getRewardTier(9, "super"),
  nineVery: getRewardTier(9, "very"),
  nineExpert: getRewardTier(9, "expert"),
  nineMaster: getRewardTier(9, "master"),
  catalogSize: STICKER_CATALOG.length,
})`, context)));

assert.deepEqual(mapping, {
  sixSuper: 1,
  sixVery: 2,
  sixEasy: 3,
  sixExpert: 4,
  nineSuper: 3,
  nineVery: 4,
  nineExpert: 5,
  nineMaster: 5,
  catalogSize: 20,
});

const illustratedStickers = JSON.parse(JSON.stringify(vm.runInContext(`STICKER_CATALOG
  .filter((sticker) => sticker.tier >= 2)
  .map(({ tier, name, spriteImage, spritePosition }) => ({ tier, name, spriteImage, spritePosition }))`, context)));
assert.equal(illustratedStickers.length, 16);
assert.equal(illustratedStickers.every((sticker) => sticker.spriteImage && sticker.spritePosition), true);
assert.deepEqual([...new Set(illustratedStickers.map((sticker) => sticker.spriteImage))], [
  "./assets/stickers/tier-2-cute.jpg",
  "./assets/stickers/tier-3-magic.jpg",
  "./assets/stickers/tier-4-plush.jpg",
  "./assets/stickers/tier-5-friends.jpg",
]);
assert.deepEqual(
  illustratedStickers.filter((sticker) => sticker.tier === 4).map((sticker) => sticker.name),
  ["粉色兔兔", "灰色兔兔", "毛绒长颈鹿", "星光伊布"],
);
assert.deepEqual(
  illustratedStickers.filter((sticker) => sticker.tier === 5).map((sticker) => sticker.name),
  ["金瞳小黑龙", "星雪小白虎", "皇冠小黄鸭", "月光光煞"],
);
assert.equal(fs.existsSync("assets/stickers/tier-5-friends.jpg"), true);

const collectionMarkup = fs.readFileSync("index.html", "utf8");
["stickerPreviewDialog", "stickerPreviewArt", "stickerPreviewName", "stickerPreviewCount", "previousStickerLevelButton", "nextStickerLevelButton", "stickerPreviewLevelLabel", "stickerPreviewLevelDots"].forEach((id) => {
  assert.match(collectionMarkup, new RegExp(`id="${id}"`));
});
assert.equal((collectionMarkup.match(/class="sticker-level-decor"/g) || []).length, 5);
["cultivationChip", "cultivationName", "cultivationProgress", "cultivationFill", "cultivationCancel"].forEach((id) => {
  assert.match(collectionMarkup, new RegExp(`id="${id}"`));
});
["evolutionReveal", "evolutionRevealArt", "evolutionRevealName", "evolutionRevealFill", "evolutionRevealMessage"].forEach((id) => {
  assert.match(collectionMarkup, new RegExp(`id="${id}"`));
});
["evolutionPanel", "evolutionEnergyNow", "evolutionEnergyTarget", "evolutionEnergyFill", "evolutionHint", "evolutionDifficulties", "evolutionMaxed"].forEach((id) => {
  assert.match(collectionMarkup, new RegExp(`id="${id}"`));
});
assert.match(collectionMarkup, /scripts\/app-evolution\.js/);

const rewardStyles = fs.readFileSync("styles.css", "utf8");
assert.match(rewardStyles, /\.sticker-card-art \.sticker-sprite,[\s\S]*?animation: none !important;/);
assert.match(rewardStyles, /\.sticker-card-art \.sticker-level-decor::after\s*\{[\s\S]*?animation: none !important;/);
assert.match(rewardStyles, /\.sticker-art\[data-level="1"\] \.sticker-level-decor::after/);
assert.match(rewardStyles, /\.sticker-art\[data-level="2"\] \.sticker-level-decor::after/);
assert.match(rewardStyles, /\.sticker-art\[data-level="3"\] \.sticker-level-decor::before/);
assert.doesNotMatch(rewardStyles, /content: "♛"/);
assert.match(rewardStyles, /content: "✦"/);
assert.doesNotMatch(rewardStyles, /level-three-crystal-rise/);
assert.match(rewardStyles, /@keyframes level-three-border-flow/);
assert.match(rewardStyles, /@keyframes level-three-inner-pulse/);
assert.match(rewardStyles, /\.sticker-preview-level-button\.is-previous/);
assert.match(rewardStyles, /\.sticker-preview-level-dot\.is-active/);
assert.match(rewardStyles, /\.reward-sticker-art\.is-animating\[data-reveal="upgrade"\]\[data-level="1"\]/);
assert.match(rewardStyles, /\.reward-sticker-art\.is-animating\[data-reveal="upgrade"\]\[data-level="2"\]/);
assert.match(rewardStyles, /\.reward-sticker-art\.is-animating\[data-reveal="upgrade"\]\[data-level="3"\]/);
assert.match(rewardStyles, /\.sticker-preview-art\.is-animating\[data-level="3"\]/);
assert.match(rewardStyles, /animation: one-star-reveal 820ms/);
assert.match(rewardStyles, /animation: two-star-reveal 1\.58s/);
assert.match(rewardStyles, /animation: three-star-reveal 2\.28s/);
assert.match(rewardStyles, /@keyframes one-star-flash/);
assert.match(rewardStyles, /@keyframes two-star-double-sweep/);
assert.match(rewardStyles, /@keyframes three-star-halo/);
assert.match(rewardStyles, /@keyframes one-star-award/);
assert.match(rewardStyles, /@keyframes two-star-award/);
assert.match(rewardStyles, /@keyframes three-star-award/);
assert.doesNotMatch(rewardStyles, /\.sticker-art\[data-level="[123]"\]::after/);

const rewardScript = fs.readFileSync("scripts/app-rewards.js", "utf8");
assert.match(rewardScript, /function changeStickerPreviewLevel\(direction\)/);
assert.match(rewardScript, /function renderStickerPreviewLevelDots\(maxLevel, displayedLevel\)/);
assert.match(rewardScript, /初始形态 · 无星/);

const tierChanceResults = vm.runInContext(`[
  selectRewardTier(9, "very", () => 0),
  selectRewardTier(9, "very", () => 0.799999),
  selectRewardTier(9, "very", () => 0.8),
  selectRewardTier(9, "very", () => 0.999999),
  selectRewardTier(9, "super", () => 0.99),
  selectRewardTier(9, "expert", () => 0),
]`, context);
assert.deepEqual([...tierChanceResults], [4, 4, 5, 5, 3, 5]);

const mixedGrantTier = vm.runInContext(`(() => {
  rewardCollection = createEmptyRewardCollection();
  state.size = 9;
  state.difficulty = "very";
  state.rewardGranted = false;
  state.currentReward = null;
  state.outcomeGranted = false;
  state.currentOutcome = null;
  const randomValues = [0.9, 0.9, 0];
  return grantCompletionReward(() => randomValues.shift()).tier;
})()`, context);
assert.equal(mixedGrantTier, 5);

const levels = vm.runInContext(`[0, 1, 2, 3, 4, 9].map(getStickerLevel)`, context);
assert.deepEqual([...levels], [0, 0, 1, 2, 3, 3]);

const drawResults = JSON.parse(JSON.stringify(vm.runInContext(`(() => {
  const firstTierSticker = STICKER_CATALOG.find((sticker) => sticker.tier === 1);
  const collection = createEmptyRewardCollection();
  collection.stickers[firstTierSticker.id] = { count: 1 };

  const missingSequence = [0.1, 0];
  const missingPick = selectRewardSticker(1, collection, () => missingSequence.shift());
  const fullPoolSequence = [0.9, 0];
  const fullPoolPick = selectRewardSticker(1, collection, () => fullPoolSequence.shift());
  return { firstId: firstTierSticker.id, missingId: missingPick.id, fullPoolId: fullPoolPick.id };
})()`, context)));

assert.notEqual(drawResults.missingId, drawResults.firstId);
assert.equal(drawResults.fullPoolId, drawResults.firstId);

const grantResults = JSON.parse(JSON.stringify(vm.runInContext(`(() => {
  rewardCollection = createEmptyRewardCollection();
  state.size = 9;
  state.difficulty = "master";
  state.usedHint = false;
  state.rewardGranted = false;
  state.currentReward = null;
  state.outcomeGranted = false;
  state.currentOutcome = null;
  const randomValues = [0.9, 0, 0.9, 0];
  const fixedRandom = () => randomValues.shift();
  const first = grantCompletionReward(fixedRandom);
  const repeatedCall = grantCompletionReward(fixedRandom);
  state.rewardGranted = false;
  state.currentReward = null;
  state.outcomeGranted = false;
  state.currentOutcome = null;
  state.usedHint = true;
  const secondGame = grantCompletionReward(fixedRandom);
  return {
    firstTier: first.tier,
    firstNew: first.isNew,
    firstIndependent: first.independent,
    sameRewardObject: first === repeatedCall,
    awardsAfterTwoGames: rewardCollection.totalAwards,
    secondCount: secondGame.count,
    secondLevel: secondGame.level,
    secondIndependent: secondGame.independent,
  };
})()`, context)));

assert.deepEqual(grantResults, {
  firstTier: 5,
  firstNew: true,
  firstIndependent: true,
  sameRewardObject: true,
  awardsAfterTwoGames: 2,
  secondCount: 2,
  secondLevel: 1,
  secondIndependent: false,
});

const corruptStorage = createStorage({ "rainy-sudoku-rewards-v1": "{broken" });
context.corruptStorage = corruptStorage;
const recovered = vm.runInContext(`readRewardCollection(corruptStorage)`, context);
assert.equal(recovered.totalAwards, 0);
assert.deepEqual(Object.keys(recovered.stickers), []);

vm.runInContext(fs.readFileSync("scripts/app-evolution.js", "utf8"), context, {
  filename: "scripts/app-evolution.js",
});

vm.runInContext(fs.readFileSync("scripts/app-rules.js", "utf8"), context, {
  filename: "scripts/app-rules.js",
});

const submissionResults = JSON.parse(JSON.stringify(vm.runInContext(`(() => {
  rewardCollection = createEmptyRewardCollection();
  state.size = 6;
  state.difficulty = "super";
  state.solution = [[1]];
  state.hints = new Set();
  state.usedHint = false;

  state.mode = "practice";
  state.locked = false;
  state.rewardGranted = false;
  state.currentReward = null;
  state.outcomeGranted = false;
  state.currentOutcome = null;
  displayValues = [0];
  submitPractice();
  const practiceWrong = { locked: state.locked, awards: rewardCollection.totalAwards };

  displayValues = [1];
  submitPractice();
  const practiceCorrected = {
    locked: state.locked,
    awards: rewardCollection.totalAwards,
    hasReward: lastResult.hasReward,
  };

  state.mode = "race";
  state.locked = false;
  state.rewardGranted = false;
  state.currentReward = null;
  state.outcomeGranted = false;
  state.currentOutcome = null;
  displayValues = [0];
  submitRace();
  const raceWrong = {
    locked: state.locked,
    awards: rewardCollection.totalAwards,
    hasReward: lastResult.hasReward,
  };

  state.locked = false;
  state.rewardGranted = false;
  state.currentReward = null;
  state.outcomeGranted = false;
  state.currentOutcome = null;
  displayValues = [1];
  submitRace();
  const raceCorrect = {
    locked: state.locked,
    awards: rewardCollection.totalAwards,
    hasReward: lastResult.hasReward,
  };

  return { practiceWrong, practiceCorrected, raceWrong, raceCorrect };
})()`, context)));

assert.deepEqual(submissionResults, {
  practiceWrong: { locked: false, awards: 0 },
  practiceCorrected: { locked: true, awards: 1, hasReward: true },
  raceWrong: { locked: true, awards: 1, hasReward: false },
  raceCorrect: { locked: true, awards: 2, hasReward: true },
});

/* ---------- 进化系统 ---------- */

["tier-4-evo1.png", "tier-4-evo2.png", "tier-5-evo1.png", "tier-5-evo2.png"].forEach((file) => {
  assert.equal(fs.existsSync(`assets/stickers/${file}`), true);
});

const serviceWorker = fs.readFileSync("sw.js", "utf8");
["tier-4-evo1.png", "tier-4-evo2.png", "tier-5-evo1.png", "tier-5-evo2.png", "app-evolution.js"].forEach((asset) => {
  assert.ok(serviceWorker.includes(asset), `${asset} 应该纳入离线缓存`);
});

// 合格难度：第二级进化的下限往上挪一档，1 至 3 级不参与进化。
const qualifierMatrix = JSON.parse(JSON.stringify(vm.runInContext(`(() => {
  const keys = (tier, form) => getEnergyQualifiers(STICKER_CATALOG.find((s) => s.tier === tier), form).map((e) => e.key);
  return {
    tier4Form1: keys(4, 1),
    tier4Form2: keys(4, 2),
    tier5Form1: keys(5, 1),
    tier5Form2: keys(5, 2),
    tier3: keys(3, 1),
  };
})()`, context)));

assert.deepEqual(qualifierMatrix, {
  tier4Form1: ["6:expert", "9:super", "9:very", "9:expert", "9:master"],
  tier4Form2: ["9:super", "9:very", "9:expert", "9:master"],
  tier5Form1: ["9:super", "9:very", "9:expert", "9:master"],
  tier5Form2: ["9:very", "9:expert", "9:master"],
  tier3: [],
});

const energyValues = JSON.parse(JSON.stringify(vm.runInContext(
  `EVOLUTION_DIFFICULTIES.reduce((acc, entry) => { acc[entry.key] = entry.energy; return acc; }, {})`,
  context,
)));
assert.deepEqual(energyValues, {
  "6:expert": 18,
  "9:super": 18,
  "9:very": 20,
  "9:expert": 25,
  "9:master": 25,
});
// 9 阶超级高手是给成人的难度，不比 9 阶高手更快。
assert.equal(energyValues["9:master"], energyValues["9:expert"]);

// 破纪录 ×1.5、满阈值进化、超出部分结转。
const energyFlow = JSON.parse(JSON.stringify(vm.runInContext(`(() => {
  const tiger = STICKER_CATALOG.find((sticker) => sticker.name === "星雪小白虎");
  rewardCollection = createEmptyRewardCollection();
  evolutionCollection = createEmptyEvolutionCollection();
  rewardCollection.stickers[tiger.id] = { count: 4 };
  state.size = 9;
  state.difficulty = "expert";

  const plain = grantEvolutionEnergy(tiger, {});
  const record = grantEvolutionEnergy(tiger, { isRecord: true });
  const third = grantEvolutionEnergy(tiger, {});
  const fourth = grantEvolutionEnergy(tiger, {});
  const unqualified = (() => {
    state.difficulty = "super";
    state.size = 6;
    const result = grantEvolutionEnergy(tiger, {});
    state.size = 9;
    state.difficulty = "expert";
    return result;
  })();

  return {
    plainGain: plain.gain,
    recordGain: record.gain,
    energyAfterThree: third.energy,
    evolvedOnFourth: fourth.evolved,
    formAfterFourth: fourth.form,
    carryOver: fourth.energy,
    playsAfterFourth: fourth.plays,
    unqualifiedIsNull: unqualified === null,
  };
})()`, context)));

assert.deepEqual(energyFlow, {
  plainGain: 25,
  recordGain: 38,
  energyAfterThree: 88,
  evolvedOnFourth: true,
  formAfterFourth: 1,
  carryOver: 13,
  playsAfterFourth: 4,
  unqualifiedIsNull: true,
});

// 能量条要从上一局的位置涨到这一局，所以结算数据必须带上“旧值”。
const revealFields = JSON.parse(JSON.stringify(vm.runInContext(`(() => {
  const tiger = STICKER_CATALOG.find((sticker) => sticker.name === "星雪小白虎");
  rewardCollection = createEmptyRewardCollection();
  evolutionCollection = createEmptyEvolutionCollection();
  rewardCollection.stickers[tiger.id] = { count: 4 };
  evolutionCollection.stickers[tiger.id] = { form: 1, energy: 40, plays: 5 };
  state.size = 9;
  state.difficulty = "expert";
  const result = grantEvolutionEnergy(tiger, {});
  return {
    previousEnergy: result.previousEnergy,
    previousThreshold: result.previousThreshold,
    energy: result.energy,
    threshold: result.threshold,
    startPercent: energyPercent(result.previousEnergy, result.previousThreshold),
    endPercent: energyPercent(result.energy, result.threshold),
  };
})()`, context)));

// 起始与终点不同，才有涨上去的动画可看。
assert.equal(revealFields.previousEnergy, 40);
assert.equal(revealFields.previousThreshold, 150);
assert.equal(revealFields.energy, 65);
assert.equal(revealFields.startPercent, 27);
assert.equal(revealFields.endPercent, 43);
assert.notEqual(revealFields.startPercent, revealFields.endPercent);

const evolutionScriptForReveal = fs.readFileSync("scripts/app-evolution.js", "utf8");
assert.match(evolutionScriptForReveal, /function playEvolutionEnergyFill\(\)/);
assert.match(evolutionScriptForReveal, /dataset\.targetWidth/);
assert.match(fs.readFileSync("scripts/app-utils.js", "utf8"), /playEvolutionEnergyFill\(\)/);

// 大图里的能量页也从 0 涨到当前积攒的位置。
assert.match(evolutionScriptForReveal, /function playEvolutionPanelEnergyFill\(\)/);
assert.match(fs.readFileSync("scripts/app-rewards.js", "utf8"), /playEvolutionPanelEnergyFill\(\)/);
// 动画时长加长了一点。
assert.match(fs.readFileSync("styles.css", "utf8"), /\.evolution-energy-fill \{[\s\S]*?transition: width 1400ms/);

// 未满三星不积累能量；已到最终形态也不再积累。
const gateResults = JSON.parse(JSON.stringify(vm.runInContext(`(() => {
  const tiger = STICKER_CATALOG.find((sticker) => sticker.name === "星雪小白虎");
  const duck = STICKER_CATALOG.find((sticker) => sticker.name === "皇冠小黄鸭");
  const fox = STICKER_CATALOG.find((sticker) => sticker.tier === 3);
  evolutionCollection = createEmptyEvolutionCollection();
  evolutionCollection.stickers[tiger.id] = { form: 2, energy: 0, plays: 9 };
  return {
    twoStar: canAccumulateEnergy(duck, 3),
    threeStar: canAccumulateEnergy(duck, 4),
    maxed: canAccumulateEnergy(tiger, 4),
    lowTier: canAccumulateEnergy(fox, 9),
  };
})()`, context)));

assert.deepEqual(gateResults, { twoStar: false, threeStar: true, maxed: false, lowTier: false });

// 定向培养局只积累能量，不发放随机贴纸。
const targetedOutcome = JSON.parse(JSON.stringify(vm.runInContext(`(() => {
  const tiger = STICKER_CATALOG.find((sticker) => sticker.name === "星雪小白虎");
  rewardCollection = createEmptyRewardCollection();
  evolutionCollection = createEmptyEvolutionCollection();
  rewardCollection.stickers[tiger.id] = { count: 4 };
  setCultivationTarget(tiger.id);
  state.size = 9;
  state.difficulty = "expert";
  state.rewardGranted = false;
  state.currentReward = null;
  state.outcomeGranted = false;
  state.currentOutcome = null;
  const outcome = grantCompletionOutcome();
  return {
    hasReward: Boolean(outcome.reward),
    hasEvolution: Boolean(outcome.evolution),
    targeted: outcome.evolution.targeted,
    awards: rewardCollection.totalAwards,
  };
})()`, context)));

assert.deepEqual(targetedOutcome, { hasReward: false, hasEvolution: true, targeted: true, awards: 0 });

// 自由练习抽中已满三星的贴纸时，照常发贴纸并同时积累能量。
const freePlayOutcome = JSON.parse(JSON.stringify(vm.runInContext(`(() => {
  rewardCollection = createEmptyRewardCollection();
  evolutionCollection = createEmptyEvolutionCollection();
  STICKER_CATALOG.filter((sticker) => sticker.tier === 5).forEach((sticker) => {
    rewardCollection.stickers[sticker.id] = { count: 4 };
  });
  state.size = 9;
  state.difficulty = "expert";
  state.usedHint = false;
  state.rewardGranted = false;
  state.currentReward = null;
  state.outcomeGranted = false;
  state.currentOutcome = null;
  const maxedOut = grantCompletionOutcome();

  // 同一局重复调用应返回缓存，不会重复发放。
  const repeated = grantCompletionOutcome();

  rewardCollection = createEmptyRewardCollection();
  evolutionCollection = createEmptyEvolutionCollection();
  STICKER_CATALOG.filter((sticker) => sticker.tier === 5).forEach((sticker) => {
    rewardCollection.stickers[sticker.id] = { count: 1 };
  });
  state.rewardGranted = false;
  state.currentReward = null;
  state.outcomeGranted = false;
  state.currentOutcome = null;
  const notYetThreeStar = grantCompletionOutcome();

  return {
    hasReward: Boolean(maxedOut.reward),
    hasEvolution: Boolean(maxedOut.evolution),
    previousLevel: maxedOut.reward.previousLevel,
    cached: repeated === maxedOut,
    lowStarHasReward: Boolean(notYetThreeStar.reward),
    lowStarHasEvolution: Boolean(notYetThreeStar.evolution),
  };
})()`, context)));

assert.deepEqual(freePlayOutcome, {
  hasReward: true,
  hasEvolution: true,
  previousLevel: 3,
  cached: true,
  lowStarHasReward: true,
  lowStarHasEvolution: false,
});

// 大图时间线：星级历程 + 已解锁的进化形态，未解锁的一格都不给看。
const previewTimeline = JSON.parse(JSON.stringify(vm.runInContext(`(() => {
  const tiger = STICKER_CATALOG.find((sticker) => sticker.name === "星雪小白虎");
  const fox = STICKER_CATALOG.find((sticker) => sticker.tier === 3);
  evolutionCollection = createEmptyEvolutionCollection();

  const threeStarNoEvolution = getPreviewStageCount(tiger, 4);
  evolutionCollection.stickers[tiger.id] = { form: 1, energy: 20, plays: 5 };
  const afterFirstEvolution = getPreviewStageCount(tiger, 4);
  evolutionCollection.stickers[tiger.id] = { form: 2, energy: 0, plays: 9 };
  const afterSecondEvolution = getPreviewStageCount(tiger, 4);

  return {
    twoStar: getPreviewStageCount(tiger, 3),
    threeStarNoEvolution,
    afterFirstEvolution,
    afterSecondEvolution,
    lowTierThreeStar: getPreviewStageCount(fox, 6),
    stages: [0, 1, 2, 3, 4, 5].map((index) => {
      const stage = describePreviewStage(index);
      return { index, level: stage.level, form: stage.form, label: stage.label };
    }),
  };
})()`, context)));

// 还没进化时，最远只能翻到三星，看不到任何进化形态。
assert.equal(previewTimeline.threeStarNoEvolution, 3);
assert.equal(previewTimeline.twoStar, 2);
// 每进化一次，时间线才多出一格。
assert.equal(previewTimeline.afterFirstEvolution, 4);
assert.equal(previewTimeline.afterSecondEvolution, 5);
// 1 至 3 级没有进化，永远停在三星。
assert.equal(previewTimeline.lowTierThreeStar, 3);
// 0-3 是星级历程，4/5 才是进化形态。
assert.deepEqual(previewTimeline.stages.map((stage) => `${stage.level}-${stage.form}`), [
  "0-0", "1-0", "2-0", "3-0", "3-1", "3-2",
]);
assert.equal(previewTimeline.stages[3].label, "三星形态 · 觉醒");
assert.equal(previewTimeline.stages[4].label, "进化 1");
assert.equal(previewTimeline.stages[5].label, "进化 2");

const previewScript = fs.readFileSync("scripts/app-rewards.js", "utf8");
assert.match(previewScript, /const maxIndex = getPreviewStageCount\(sticker, count\)/);
assert.doesNotMatch(previewScript, /还没解锁/);

// 定向培养在合格难度间保持，切到不合格难度时退出。
const cultivationSync = JSON.parse(JSON.stringify(vm.runInContext(`(() => {
  const tiger = STICKER_CATALOG.find((sticker) => sticker.name === "星雪小白虎");
  evolutionCollection = createEmptyEvolutionCollection();
  setCultivationTarget(tiger.id);
  settings.size = 9;
  settings.difficulty = "very";
  const keptQualified = syncCultivationWithSettings();
  const stillTargeted = Boolean(getCultivationTarget());
  settings.size = 6;
  settings.difficulty = "super";
  const droppedMessage = syncCultivationWithSettings();
  return { keptQualified, stillTargeted, droppedMessage, targetAfter: getCultivationTarget() };
})()`, context)));

assert.deepEqual(cultivationSync, {
  keptQualified: false,
  stillTargeted: true,
  droppedMessage: true,
  targetAfter: null,
});

const corruptEvolutionStorage = createStorage({ "rainy-sudoku-evolution-v1": "{broken" });
context.corruptEvolutionStorage = corruptEvolutionStorage;
const recoveredEvolution = vm.runInContext(`readEvolutionCollection(corruptEvolutionStorage)`, context);
assert.deepEqual(Object.keys(recoveredEvolution.stickers), []);
assert.equal(recoveredEvolution.targetId, null);

// 旧档里不该进化的贴纸和越界数值都要被清掉。
const sanitizedStorage = createStorage({
  "rainy-sudoku-evolution-v1": JSON.stringify({
    stickers: {
      "forest-fox": { form: 2, energy: 50, plays: 3 },
      "golden-lion": { form: 9, energy: -5, plays: 2 },
    },
    targetId: "forest-fox",
  }),
});
context.sanitizedStorage = sanitizedStorage;
const sanitized = JSON.parse(JSON.stringify(vm.runInContext(`readEvolutionCollection(sanitizedStorage)`, context)));
assert.deepEqual(Object.keys(sanitized.stickers), ["golden-lion"]);
assert.deepEqual(sanitized.stickers["golden-lion"], { form: 2, energy: 0, plays: 2 });
assert.equal(sanitized.targetId, null);

const evolutionStyles = fs.readFileSync("styles.css", "utf8");
assert.match(evolutionStyles, /\.sticker-art\[data-form="2"\]/);
// 没解锁的形态一律不给看，所以不该再有剪影样式。
assert.doesNotMatch(evolutionStyles, /is-locked-form/);
assert.match(evolutionStyles, /\.cultivation-chip/);
assert.match(evolutionStyles, /\.evolution-reveal-art\.is-animating/);
// 进化揭晓复用三星那套动作，保证不比三星弱。
assert.match(evolutionStyles, /\.evolution-reveal-art\.is-animating\s*\{[\s\S]*?three-star-reveal/);
assert.match(evolutionStyles, /\.evolution-reveal\[data-evolved="true"\][\s\S]*?three-star-halo/);

// 进化形态在收藏页也必须有自己的边框和铭牌，不能比三星素。
assert.match(evolutionStyles, /\.sticker-art\[data-form="1"\] \.sticker-level-decor \{[\s\S]*?linear-gradient/);
assert.match(evolutionStyles, /\.sticker-art\[data-form="2"\] \.sticker-level-decor \{[\s\S]*?linear-gradient/);
assert.match(evolutionStyles, /content: "✦ 进化 I ✦"/);
assert.match(evolutionStyles, /content: "✧ 进化 II ✧"/);
assert.match(evolutionStyles, /\.sticker-card-art\[data-form="2"\] \.sticker-level-decor::after/);

// 进化形态的登场必须至少和三星一样强：同样的升空旋转 + 更大的光环。
assert.match(evolutionStyles, /\.sticker-preview-art\.is-animating\[data-form="1"\],[\s\S]*?three-star-reveal/);
assert.match(evolutionStyles, /@keyframes evolution-halo-burst/);
assert.match(evolutionStyles, /\.sticker-preview-art\.is-animating\[data-form="1"\]::after,[\s\S]*?evolution-halo-burst/);

// 装饰层盖在贴纸上方，不能再用大范围模糊内发光，否则画面发雾。
const formDecorBlocks = (evolutionStyles.match(/\.sticker-art\[data-form="[12]"\] \.sticker-level-decor \{[\s\S]*?\n\}/g) || [])
  .filter((block) => block.includes("box-shadow"));
assert.equal(formDecorBlocks.length, 2);
formDecorBlocks.forEach((block) => {
  assert.doesNotMatch(block, /inset 0 0 [1-9]\d+px/, "进化装饰不应有大范围模糊内发光");
});

// 培养挂件的图标太小，放不下铭牌。
assert.match(evolutionStyles, /\.cultivation-art \.sticker-level-decor,[\s\S]*?display: none !important;/);

// 进化时的全屏揭晓。
assert.match(evolutionStyles, /\.evolution-burst\.is-playing \.evolution-burst-art \{[\s\S]*?three-star-reveal/);
assert.match(evolutionStyles, /\.evolution-burst\.is-playing \.evolution-burst-art::after \{[\s\S]*?three-star-halo/);
assert.match(evolutionStyles, /@keyframes evolution-particle-rise/);
assert.match(evolutionStyles, /@keyframes evolution-burst-fade/);

["evolutionBurst", "evolutionBurstParticles", "evolutionBurstArt", "evolutionBurstTitle", "evolutionBurstSub"].forEach((id) => {
  assert.match(collectionMarkup, new RegExp(`id="${id}"`));
});

const evolutionScript = fs.readFileSync("scripts/app-evolution.js", "utf8");
assert.match(evolutionScript, /function playEvolutionBurst\(evolution\)/);
assert.match(evolutionScript, /function buildEvolutionBurstParticles\(\)/);
// 只有真正进化的那一局才播放全屏特效。
assert.match(fs.readFileSync("scripts/app-utils.js", "utf8"), /if \(options\.evolution\.evolved\) \{\s*\n\s*playEvolutionBurst\(options\.evolution\);/);

// 版本号必须三处一致：APP_VERSION（页面角标）、sw.js 缓存名、index.html 资源查询串。
const utilsSource = fs.readFileSync("scripts/app-utils.js", "utf8");
const swSource = fs.readFileSync("sw.js", "utf8");
const indexSource = fs.readFileSync("index.html", "utf8");
const appVersion = utilsSource.match(/const APP_VERSION = "(\d+)"/)[1];
const swVersion = swSource.match(/rainy-sudoku-v(\d+)/)[1];
const indexVersions = [...indexSource.matchAll(/\?v=(\d+)/g)].map((m) => m[1]);
assert.equal(swVersion, appVersion, "sw.js 缓存版本要和 APP_VERSION 一致");
indexVersions.forEach((version) => {
  assert.equal(version, appVersion, "index.html 里每个 ?v= 都要等于 APP_VERSION");
});

// 更新提示：SW 不再自动 skipWaiting，改由页面点“更新”后发消息触发。
// skipWaiting 只应出现一次，且落在 message 处理器里（而非 install 里自动执行）。
const skipWaitingCount = (swSource.match(/self\.skipWaiting\(\)/g) || []).length;
assert.equal(skipWaitingCount, 1, "skipWaiting 应只在 message 处理里出现一次");
assert.match(swSource, /addEventListener\("message"[\s\S]*?SKIP_WAITING[\s\S]*?self\.skipWaiting\(\)/);
assert.match(utilsSource, /function showUpdateToast\(registration\)/);
assert.match(utilsSource, /postMessage\(\{ type: "SKIP_WAITING" \}\)/);
assert.match(utilsSource, /updatefound/);

console.log("Reward tests passed: mapping, tier probability, draw weighting, duplicate guard, upgrades, hint badge, storage recovery, and submission paths.");
console.log("Evolution tests passed: qualifier gating, energy weights, record bonus, threshold carry-over, three-star gate, targeted vs free play, cultivation sync, and storage sanitising.");
