function submitRace() {
  if (state.locked || state.mode !== "race") {
    return;
  }

  const wrongs = findWrongCells(true);
  state.wrongs = wrongs;
  state.locked = true;
  stopTimer();
  render();

  if (wrongs.size === 0) {
    playTone("good");
    showResult("交卷成功", `全部正确，用时 ${formatSeconds(getElapsedSeconds())}。`);
  } else {
    playTone("bad");
    showResult("交卷完成", `用时 ${formatSeconds(getElapsedSeconds())}，有 ${wrongs.size} 个空格或错误格子。可以关闭结果后查看标红的位置。`);
  }
}

function maybeFinishPractice() {
  if (state.mode !== "practice") {
    return;
  }

  const display = getDisplayValues();
  const filled = display.filter(Boolean).length;
  if (filled < state.size * state.size) {
    return;
  }

  const wrongs = findWrongCells(true);
  if (wrongs.size === 0) {
    state.locked = true;
    stopTimer();
    setMessage("完成了，全都正确。", "good");
    playTone("good");
    showResult("完成", `全部正确，用时 ${formatSeconds(getElapsedSeconds())}。`);
  }
}

function findHint() {
  const display = getDisplayGrid();
  const safeGrid = Array.from({ length: state.size }, (_, row) => {
    return Array.from({ length: state.size }, (_, col) => {
      const index = row * state.size + col;
      const puzzleValue = getPuzzleValue(index);
      if (puzzleValue) {
        return puzzleValue;
      }

      return state.entries[index] === state.solution[row][col] ? state.entries[index] : 0;
    });
  });
  let best = null;

  for (let index = 0; index < state.size * state.size; index += 1) {
    const row = Math.floor(index / state.size);
    const col = index % state.size;
    if (display[row][col] !== 0) {
      continue;
    }

    const candidates = getCandidates(safeGrid, row, col);
    if (candidates.length === 0) {
      continue;
    }

    if (!best || candidates.length < best.candidates.length) {
      best = { index, row, col, candidates };
    }

    if (candidates.length === 1) {
      break;
    }
  }

  return best;
}

function findWrongCells(includeEmpty) {
  const wrongs = new Set();
  const display = getDisplayValues();

  for (let index = 0; index < display.length; index += 1) {
    const row = Math.floor(index / state.size);
    const col = index % state.size;
    const value = display[index];

    if ((includeEmpty && !value) || (value && value !== state.solution[row][col])) {
      wrongs.add(index);
    }
  }

  return wrongs;
}

function getCandidates(grid, row, col) {
  const used = new Set();
  for (let index = 0; index < state.size; index += 1) {
    used.add(grid[row][index]);
    used.add(grid[index][col]);
  }

  const startRow = Math.floor(row / state.boxRows) * state.boxRows;
  const startCol = Math.floor(col / state.boxCols) * state.boxCols;
  for (let r = startRow; r < startRow + state.boxRows; r += 1) {
    for (let c = startCol; c < startCol + state.boxCols; c += 1) {
      used.add(grid[r][c]);
    }
  }

  return [...Array(state.size).keys()].map((number) => number + 1).filter((number) => !used.has(number));
}

function getRelatedCells(index) {
  const related = new Set();
  if (index === null) {
    return related;
  }

  const row = Math.floor(index / state.size);
  const col = index % state.size;
  const startRow = Math.floor(row / state.boxRows) * state.boxRows;
  const startCol = Math.floor(col / state.boxCols) * state.boxCols;

  for (let i = 0; i < state.size; i += 1) {
    related.add(row * state.size + i);
    related.add(i * state.size + col);
  }

  for (let r = startRow; r < startRow + state.boxRows; r += 1) {
    for (let c = startCol; c < startCol + state.boxCols; c += 1) {
      related.add(r * state.size + c);
    }
  }

  related.delete(index);
  return related;
}
