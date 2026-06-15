function init() {
  applySettingsToControls();
  bindEvents();
  startNewGame();
  registerServiceWorker();
}

function bindEvents() {
  els.settingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const setting = button.dataset.setting;
      const rawValue = button.dataset.value;
      settings[setting] = setting === "size" ? Number(rawValue) : rawValue;

      if (setting === "size") {
        settings.durationMinutes = SIZE_CONFIG[settings.size].defaultMinutes;
        els.durationInput.value = settings.durationMinutes;
      }

      applySettingsToControls();
      saveSettings();
      setMessage("设置已选好，点“新题开始”后生效。", "good");
    });
  });

  els.durationInput.addEventListener("change", () => {
    settings.durationMinutes = clampMinutes(els.durationInput.value);
    els.durationInput.value = settings.durationMinutes;
    saveSettings();
    setMessage("倒计时时间已更新，下一题比赛会使用这个时间。", "good");
  });

  els.durationInput.addEventListener("input", () => {
    const minutes = Number.parseInt(els.durationInput.value, 10);
    if (!Number.isNaN(minutes)) {
      settings.durationMinutes = Math.min(60, Math.max(1, minutes));
      saveSettings();
    }
  });

  els.newGameButton.addEventListener("click", startNewGame);
  els.noteButton.addEventListener("click", toggleNoteMode);
  els.eraseButton.addEventListener("click", eraseSelected);
  els.hintButton.addEventListener("click", showHint);
  els.checkButton.addEventListener("click", checkPracticeBoard);
  els.submitButton.addEventListener("click", submitRace);
  els.soundButton.addEventListener("click", toggleSound);
  els.closeResultButton.addEventListener("click", () => els.resultDialog.close());
  els.resultNewButton.addEventListener("click", () => {
    els.resultDialog.close();
    startNewGame();
  });

  document.addEventListener("pointerdown", handleOutsidePointerDown);
  window.addEventListener("resize", updateNumberPadPosition);
  window.addEventListener("scroll", updateNumberPadPosition, true);
  window.addEventListener("keydown", handleKeyboard);
}

function startNewGame() {
  stopTimer();
  settings.durationMinutes = clampMinutes(els.durationInput.value);
  els.durationInput.value = settings.durationMinutes;
  saveSettings();
  state.size = settings.size;
  state.boxRows = SIZE_CONFIG[state.size].boxRows;
  state.boxCols = SIZE_CONFIG[state.size].boxCols;
  state.difficulty = settings.difficulty;
  state.mode = settings.mode;
  state.durationSeconds = clampMinutes(settings.durationMinutes) * 60;
  state.selected = null;
  state.noteMode = false;
  state.conflicts = new Set();
  state.deadEnds = new Set();
  state.wrongs = new Set();
  state.hints = new Set();
  state.locked = false;
  state.numberPadOpen = false;
  hideNumberPad();
  state.startedAt = Date.now();
  state.solution = [];
  state.puzzle = [];
  state.entries = [];
  state.notes = [];

  els.noteButton.setAttribute("aria-pressed", "false");
  setMessage("正在准备一题新的数独。", "good");
  renderShellState();

  window.setTimeout(() => {
    const puzzleData = createPuzzle(state.size, state.difficulty);
    state.solution = puzzleData.solution;
    state.puzzle = puzzleData.puzzle;
    state.entries = Array.from({ length: state.size * state.size }, () => 0);
    state.notes = Array.from({ length: state.size * state.size }, () => new Set());
    state.startedAt = Date.now();
    render();
    startTimer();

    const modeText = state.mode === "race" ? "比赛开始，倒计时已经启动。" : "新题开始，慢慢观察行、列和宫。";
    setMessage(modeText, "good");
    updateCoachText();
  }, 40);
}

function createPuzzle(size, difficulty) {
  const solution = createSolution(size);
  const puzzle = solution.map((row) => row.slice());
  const targetClues = SIZE_CONFIG[size].clues[difficulty];
  const cells = shuffle([...Array(size * size).keys()]);
  let clues = size * size;

  for (const index of cells) {
    if (clues <= targetClues) {
      break;
    }

    const row = Math.floor(index / size);
    const col = index % size;
    const saved = puzzle[row][col];
    puzzle[row][col] = 0;

    if (countSolutions(puzzle, size, 2) === 1 && matchesDifficulty(puzzle, size, difficulty)) {
      clues -= 1;
    } else {
      puzzle[row][col] = saved;
    }
  }

  return { solution, puzzle };
}

function matchesDifficulty(grid, size, difficulty) {
  if (difficulty === "easy") {
    return canSolveWithBasicLogic(grid, size, false);
  }

  return canSolveWithBasicLogic(grid, size, true);
}

function createSolution(size) {
  const config = SIZE_CONFIG[size];
  const rows = shuffleGroups(size, config.boxRows);
  const cols = shuffleGroups(size, config.boxCols);
  const values = shuffle([...Array(size).keys()].map((number) => number + 1));
  const base = Array.from({ length: size }, (_, row) => {
    return Array.from({ length: size }, (_, col) => {
      const valueIndex = (config.boxCols * (row % config.boxRows) + Math.floor(row / config.boxRows) + col) % size;
      return valueIndex + 1;
    });
  });

  return rows.map((row) => cols.map((col) => values[base[row][col] - 1]));
}

function shuffleGroups(size, groupSize) {
  const groupCount = size / groupSize;
  const groups = shuffle([...Array(groupCount).keys()]);
  return groups.flatMap((group) => {
    return shuffle([...Array(groupSize).keys()]).map((offset) => group * groupSize + offset);
  });
}

function countSolutions(grid, size, limit = 2) {
  const config = SIZE_CONFIG[size];
  const fullMask = (1 << size) - 1;
  const rows = Array(size).fill(0);
  const cols = Array(size).fill(0);
  const boxes = Array(size).fill(0);
  const empties = [];
  let solutions = 0;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const value = grid[row][col];
      if (!value) {
        empties.push(row * size + col);
        continue;
      }

      const bit = 1 << (value - 1);
      const box = getBoxIndex(row, col, config, size);
      if ((rows[row] & bit) || (cols[col] & bit) || (boxes[box] & bit)) {
        return 0;
      }

      rows[row] |= bit;
      cols[col] |= bit;
      boxes[box] |= bit;
    }
  }

  solve();
  return solutions;

  function solve() {
    if (solutions >= limit) {
      return;
    }

    let bestEmptyPosition = -1;
    let bestMask = 0;
    let bestCount = size + 1;

    for (let i = 0; i < empties.length; i += 1) {
      const index = empties[i];
      if (index === -1) {
        continue;
      }

      const row = Math.floor(index / size);
      const col = index % size;
      const box = getBoxIndex(row, col, config, size);
      const mask = fullMask & ~(rows[row] | cols[col] | boxes[box]);
      const count = bitCount(mask);

      if (count === 0) {
        return;
      }

      if (count < bestCount) {
        bestCount = count;
        bestMask = mask;
        bestEmptyPosition = i;
        if (count === 1) {
          break;
        }
      }
    }

    if (bestEmptyPosition === -1) {
      solutions += 1;
      return;
    }

    const index = empties[bestEmptyPosition];
    const row = Math.floor(index / size);
    const col = index % size;
    const box = getBoxIndex(row, col, config, size);
    empties[bestEmptyPosition] = -1;

    for (let number = 1; number <= size; number += 1) {
      const bit = 1 << (number - 1);
      if (!(bestMask & bit)) {
        continue;
      }

      rows[row] |= bit;
      cols[col] |= bit;
      boxes[box] |= bit;
      solve();
      rows[row] &= ~bit;
      cols[col] &= ~bit;
      boxes[box] &= ~bit;

      if (solutions >= limit) {
        break;
      }
    }

    empties[bestEmptyPosition] = index;
  }
}

function canSolveWithBasicLogic(grid, size, allowHiddenSingles) {
  const config = SIZE_CONFIG[size];
  const board = grid.map((row) => row.slice());
  let progress = true;

  while (progress) {
    progress = false;

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (board[row][col]) {
          continue;
        }

        const candidates = getGridCandidates(board, row, col, config, size);
        if (candidates.length === 0) {
          return false;
        }

        if (candidates.length === 1) {
          board[row][col] = candidates[0];
          progress = true;
        }
      }
    }

    if (!progress && allowHiddenSingles) {
      progress = fillHiddenSingles(board, config, size);
    }
  }

  return board.every((row) => row.every(Boolean));
}

function fillHiddenSingles(board, config, size) {
  const units = getGridUnits(config, size);

  for (const unit of units) {
    for (let number = 1; number <= size; number += 1) {
      const matches = [];

      for (const [row, col] of unit) {
        if (board[row][col]) {
          continue;
        }

        const candidates = getGridCandidates(board, row, col, config, size);
        if (candidates.includes(number)) {
          matches.push([row, col]);
        }
      }

      if (matches.length === 1) {
        const [row, col] = matches[0];
        board[row][col] = number;
        return true;
      }
    }
  }

  return false;
}

function getGridUnits(config, size) {
  const units = [];

  for (let row = 0; row < size; row += 1) {
    units.push([...Array(size).keys()].map((col) => [row, col]));
  }

  for (let col = 0; col < size; col += 1) {
    units.push([...Array(size).keys()].map((row) => [row, col]));
  }

  for (let boxRow = 0; boxRow < size; boxRow += config.boxRows) {
    for (let boxCol = 0; boxCol < size; boxCol += config.boxCols) {
      const unit = [];
      for (let row = boxRow; row < boxRow + config.boxRows; row += 1) {
        for (let col = boxCol; col < boxCol + config.boxCols; col += 1) {
          unit.push([row, col]);
        }
      }
      units.push(unit);
    }
  }

  return units;
}

function getGridCandidates(board, row, col, config, size) {
  const used = new Set();

  for (let index = 0; index < size; index += 1) {
    used.add(board[row][index]);
    used.add(board[index][col]);
  }

  const startRow = Math.floor(row / config.boxRows) * config.boxRows;
  const startCol = Math.floor(col / config.boxCols) * config.boxCols;
  for (let r = startRow; r < startRow + config.boxRows; r += 1) {
    for (let c = startCol; c < startCol + config.boxCols; c += 1) {
      used.add(board[r][c]);
    }
  }

  return [...Array(size).keys()].map((number) => number + 1).filter((number) => !used.has(number));
}
