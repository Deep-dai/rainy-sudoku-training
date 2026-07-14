const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const stateSource = fs.readFileSync("scripts/app-state.js", "utf8");
const sizeConfigSource = stateSource.slice(0, stateSource.indexOf("const SETTINGS_VERSION"));
const gameSource = fs.readFileSync("scripts/app-game.js", "utf8");
const context = vm.createContext({ console, Math, Number, Set });

vm.runInContext(`${sizeConfigSource}

function shuffle(list) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function bitCount(mask) {
  let count = 0;
  while (mask) {
    count += mask & 1;
    mask >>>= 1;
  }
  return count;
}

function getBoxIndex(row, col, config, size) {
  return Math.floor(row / config.boxRows) * (size / config.boxCols) + Math.floor(col / config.boxCols);
}
`, context);
vm.runInContext(gameSource, context, { filename: "scripts/app-game.js" });

const startedAt = Date.now();
const samples = JSON.parse(JSON.stringify(vm.runInContext(`
  Array.from({ length: 10 }, () => {
    const result = createPuzzle(9, "master");
    const blankCount = result.puzzle.flat().filter((value) => !value).length;
    return {
      blankCount,
      openingSingles: countOpeningSingles(result.puzzle, 9),
      nakedOnlySolvable: canSolveWithBasicLogic(result.puzzle, 9, false),
      basicSolvable: canSolveWithBasicLogic(result.puzzle, 9, true),
      solutions: countSolutions(result.puzzle, 9, 2),
    };
  })
`, context)));

for (const sample of samples) {
  assert.equal(sample.solutions, 1, "超级高手题必须保持唯一解");
  assert.ok(sample.blankCount >= 44 && sample.blankCount <= 47, `空格数越界: ${sample.blankCount}`);
  assert.ok(sample.openingSingles >= 2 && sample.openingSingles <= 6, `开局单数数量不合适: ${sample.openingSingles}`);
  assert.equal(sample.nakedOnlySolvable, false, "超级高手应包含至少一步隐性单数排除");
  assert.equal(sample.basicSolvable, true, "超级高手必须能用基础单数排除完成");
}

const regressionSamples = JSON.parse(JSON.stringify(vm.runInContext(`
  [
    { size: 6, difficulty: "expert" },
    { size: 9, difficulty: "super" },
    { size: 9, difficulty: "expert" },
  ].map(({ size, difficulty }) => {
    const result = createPuzzle(size, difficulty);
    const limits = getDifficultyConfig(size, difficulty);
    return {
      size,
      difficulty,
      blankCount: result.puzzle.flat().filter((value) => !value).length,
      min: limits.min,
      max: limits.max,
      solutions: countSolutions(result.puzzle, size, 2),
      basicSolvable: canSolveWithBasicLogic(result.puzzle, size, Boolean(limits.allowHiddenSingles)),
    };
  })
`, context)));

for (const sample of regressionSamples) {
  assert.equal(sample.solutions, 1, `${sample.size} 阶 ${sample.difficulty} 必须保持唯一解`);
  assert.ok(sample.blankCount >= sample.min && sample.blankCount <= sample.max);
  assert.equal(sample.basicSolvable, true, `${sample.size} 阶 ${sample.difficulty} 的既有基础策略边界不应改变`);
}

console.log(JSON.stringify({ elapsedMs: Date.now() - startedAt, samples, regressionSamples }, null, 2));
