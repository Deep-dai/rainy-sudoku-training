function checkPracticeBoard() {
  if (state.locked || state.mode !== "practice") {
    return;
  }

  updateBoardWarnings();
  state.wrongs = findWrongCells(false);
  const wrongCount = state.wrongs.size;
  const conflictCount = state.conflicts.size;
  const deadEndCount = state.deadEnds.size;

  if (!wrongCount && !conflictCount && !deadEndCount) {
    setMessage("目前填过的数字都对。", "good");
    playTone("good");
  } else if (state.selected !== null && state.conflicts.has(state.selected)) {
    setMessage(formatConflictMessage(state.selected), "alert");
    els.coachText.textContent = formatConflictCoachText(state.selected);
    playTone("bad");
  } else if (deadEndCount) {
    setMessage(`发现 ${deadEndCount} 个空格已经无数可填，先检查标红位置附近。`, "alert");
    playTone("bad");
  } else {
    setMessage(`发现 ${wrongCount || conflictCount} 个需要再看看的格子。`, "alert");
    playTone("bad");
  }

  render();
}

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
    showResult("交卷完成", `有 ${wrongs.size} 个空格或错误格子。可以关闭结果后查看标红的位置。`);
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
  if (wrongs.size === 0 && state.conflicts.size === 0 && state.deadEnds.size === 0) {
    state.locked = true;
    stopTimer();
    setMessage("完成了，全都正确。", "good");
    playTone("good");
    showResult("完成", `全部正确，用时 ${formatSeconds(getElapsedSeconds())}。`);
  }
}

function findHint() {
  const display = getDisplayGrid();
  let best = null;

  for (let index = 0; index < state.size * state.size; index += 1) {
    const row = Math.floor(index / state.size);
    const col = index % state.size;
    if (display[row][col] !== 0) {
      continue;
    }

    const candidates = getCandidates(display, row, col);
    if (!best || candidates.length < best.candidates.length) {
      best = { index, row, col, candidates };
    }

    if (candidates.length === 1) {
      break;
    }
  }

  return best;
}

function updateBoardWarnings() {
  updateConflicts();
  state.deadEnds = state.mode === "practice" ? findDeadEndCells() : new Set();
}

function updateConflicts() {
  state.conflicts = findConflicts();
}

function findDeadEndCells() {
  const deadEnds = new Set();
  const grid = getDisplayGrid();

  for (let row = 0; row < state.size; row += 1) {
    for (let col = 0; col < state.size; col += 1) {
      if (grid[row][col] !== 0) {
        continue;
      }

      if (getCandidates(grid, row, col).length === 0) {
        deadEnds.add(row * state.size + col);
      }
    }
  }

  return deadEnds;
}

function findConflicts() {
  const conflicts = new Set();
  const display = getDisplayValues();
  const groups = [];

  for (let row = 0; row < state.size; row += 1) {
    groups.push([...Array(state.size).keys()].map((col) => row * state.size + col));
  }

  for (let col = 0; col < state.size; col += 1) {
    groups.push([...Array(state.size).keys()].map((row) => row * state.size + col));
  }

  for (let boxRow = 0; boxRow < state.size; boxRow += state.boxRows) {
    for (let boxCol = 0; boxCol < state.size; boxCol += state.boxCols) {
      const group = [];
      for (let row = boxRow; row < boxRow + state.boxRows; row += 1) {
        for (let col = boxCol; col < boxCol + state.boxCols; col += 1) {
          group.push(row * state.size + col);
        }
      }
      groups.push(group);
    }
  }

  groups.forEach((group) => {
    const seen = new Map();
    group.forEach((index) => {
      const value = display[index];
      if (!value) {
        return;
      }

      if (!seen.has(value)) {
        seen.set(value, []);
      }
      seen.get(value).push(index);
    });

    seen.forEach((indexes) => {
      if (indexes.length > 1) {
        indexes.forEach((index) => conflicts.add(index));
      }
    });
  });

  return conflicts;
}

function getConflictDetails(index) {
  const display = getDisplayValues();
  const value = display[index];
  if (!value) {
    return [];
  }

  const row = Math.floor(index / state.size);
  const col = index % state.size;
  const boxStartRow = Math.floor(row / state.boxRows) * state.boxRows;
  const boxStartCol = Math.floor(col / state.boxCols) * state.boxCols;
  const units = [
    {
      label: "同一行",
      indexes: [...Array(state.size).keys()].map((c) => row * state.size + c),
    },
    {
      label: "同一列",
      indexes: [...Array(state.size).keys()].map((r) => r * state.size + col),
    },
    {
      label: "同一宫",
      indexes: Array.from({ length: state.boxRows }, (_, r) => {
        return Array.from({ length: state.boxCols }, (_, c) => {
          return (boxStartRow + r) * state.size + boxStartCol + c;
        });
      }).flat(),
    },
  ];

  return units
    .map((unit) => {
      const peers = unit.indexes.filter((peerIndex) => peerIndex !== index && display[peerIndex] === value);
      return { label: unit.label, peers };
    })
    .filter((unit) => unit.peers.length);
}

function formatConflictMessage(index) {
  const value = getDisplayValues()[index];
  const details = getConflictDetails(index);
  if (!details.length) {
    return "这里和同一行、列或宫里的数字冲突了。";
  }

  const firstDetail = details[0];
  const firstPeer = firstDetail.peers[0];
  const extraCount = details.reduce((sum, detail) => sum + detail.peers.length, 0) - 1;
  const extraText = extraCount > 0 ? `，还有 ${extraCount} 个冲突位置` : "";
  return `数字 ${value} 和${firstDetail.label}里的${formatCellPosition(firstPeer)}冲突${extraText}。`;
}

function formatConflictCoachText(index) {
  const details = getConflictDetails(index);
  if (!details.length) {
    return "先看粗线围起来的宫，再看这一行和这一列是否已有相同数字。";
  }

  const detail = details[0];
  const peer = detail.peers[0];
  if (detail.label === "同一宫") {
    return `${formatCellPosition(index)} 和 ${formatCellPosition(peer)} 在同一个粗线宫里，宫内不能重复。`;
  }

  return `${formatCellPosition(index)} 和 ${formatCellPosition(peer)} 在${detail.label}里，不能填相同数字。`;
}

function formatCellPosition(index) {
  const row = Math.floor(index / state.size) + 1;
  const col = (index % state.size) + 1;
  return `第 ${row} 行第 ${col} 列`;
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
