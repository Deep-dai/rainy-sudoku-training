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

const storage = createStorage();
const context = vm.createContext({
  console,
  Math,
  Number,
  JSON,
  Object,
  Set,
  window: { localStorage: storage },
  state: {
    size: 6,
    difficulty: "super",
    usedHint: false,
    rewardGranted: false,
    currentReward: null,
  },
  els: {
    collectionCount: { textContent: "" },
    collectionButton: { setAttribute() {} },
    collectionProgress: { textContent: "" },
    coachText: { textContent: "" },
  },
});

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
["stickerPreviewDialog", "stickerPreviewArt", "stickerPreviewName", "stickerPreviewCount"].forEach((id) => {
  assert.match(collectionMarkup, new RegExp(`id="${id}"`));
});

const rewardStyles = fs.readFileSync("styles.css", "utf8");
assert.match(rewardStyles, /\.sticker-card-art \.sticker-sprite\s*\{[\s\S]*?animation: none !important;/);
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
  const randomValues = [0.9, 0, 0.9, 0];
  const fixedRandom = () => randomValues.shift();
  const first = grantCompletionReward(fixedRandom);
  const repeatedCall = grantCompletionReward(fixedRandom);
  state.rewardGranted = false;
  state.currentReward = null;
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

console.log("Reward tests passed: mapping, tier probability, draw weighting, duplicate guard, upgrades, hint badge, storage recovery, and submission paths.");
