function render() {
  renderShellState();
  renderBoard();
  renderNumberPad();
  updateStatus();
}

function renderShellState() {
  els.app.classList.toggle("is-race", state.mode === "race");
  els.app.classList.toggle("is-finished", state.locked);
  els.board.style.setProperty("--size", state.size);
  els.board.style.setProperty("--box-rows", state.boxRows);
  els.board.style.setProperty("--box-cols", state.boxCols);
  els.board.style.setProperty("--boxes-per-row", state.size / state.boxCols);
  els.board.dataset.size = String(state.size);
  els.numberPad.style.setProperty("--pad-cols", 3);
  els.modeLabel.textContent = COPY[state.mode];
}

function renderBoard() {
  els.board.innerHTML = "";
  const display = getDisplayValues();
  const selectedValue = state.selected === null ? 0 : display[state.selected];
  const related = getRelatedCells(state.selected);
  const boxesPerRow = state.size / state.boxCols;
  const boxCount = state.size;

  for (let boxIndex = 0; boxIndex < boxCount; boxIndex += 1) {
    const boxRow = Math.floor(boxIndex / boxesPerRow);
    const boxCol = boxIndex % boxesPerRow;
    const cluster = document.createElement("div");
    cluster.className = "box-cluster";
    cluster.dataset.box = String(boxIndex);
    cluster.setAttribute("role", "group");
    cluster.setAttribute("aria-label", `第 ${boxIndex + 1} 宫`);

    for (let localRow = 0; localRow < state.boxRows; localRow += 1) {
      for (let localCol = 0; localCol < state.boxCols; localCol += 1) {
        const row = boxRow * state.boxRows + localRow;
        const col = boxCol * state.boxCols + localCol;
        const index = row * state.size + col;
        cluster.append(createCell(index, row, col, display, selectedValue, related));
      }
    }

    els.board.append(cluster);
  }
}

function createCell(index, row, col, display, selectedValue, related) {
  const value = display[index];
  const isGiven = getPuzzleValue(index) !== 0;
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "cell";
  cell.dataset.index = String(index);
  cell.dataset.value = value ? String(value) : "empty";
  cell.dataset.box = String(getBoxIndex(row, col, { boxRows: state.boxRows, boxCols: state.boxCols }));
  cell.style.setProperty("--tilt", `${((row * 3 + col * 5) % 7) - 3}deg`);
  cell.setAttribute("aria-label", `第 ${row + 1} 行第 ${col + 1} 列${value ? `，数字 ${value}` : ""}`);

  cell.classList.toggle("is-given", isGiven);
  cell.classList.toggle("is-selected", index === state.selected);
  cell.classList.toggle("is-related", related.has(index));
  cell.classList.toggle("is-same-number", Boolean(value && selectedValue && value === selectedValue));
  cell.classList.toggle("is-conflict", state.mode === "practice" && state.conflicts.has(index));
  cell.classList.toggle("is-dead-end", state.mode === "practice" && state.deadEnds.has(index));
  cell.classList.toggle("is-wrong", state.wrongs.has(index));
  cell.classList.toggle("is-hint", state.hints.has(index));
  cell.classList.toggle("is-locked", state.locked);

  if (value) {
    const valueNode = document.createElement("span");
    valueNode.className = "cell-value";
    valueNode.textContent = value;
    cell.append(valueNode);
  } else if (state.notes[index]?.size) {
    cell.append(createNotesNode(index));
  }

  cell.addEventListener("click", () => selectCell(index));
  return cell;
}

function createNotesNode(index) {
  const notes = document.createElement("div");
  notes.className = "notes";
  notes.style.setProperty("--note-cols", state.boxCols);

  for (let number = 1; number <= state.size; number += 1) {
    const note = document.createElement("span");
    note.className = "note-item";
    note.textContent = state.notes[index].has(number) ? number : "";
    notes.append(note);
  }

  return notes;
}

function renderNumberPad() {
  els.numberPad.innerHTML = "";
  els.numberPad.classList.toggle("is-hidden", !state.numberPadOpen);
  els.numberPad.setAttribute("aria-hidden", String(!state.numberPadOpen));
  const selectedValue = state.selected === null ? 0 : getDisplayValues()[state.selected];
  const selectedNotes = state.selected === null ? new Set() : state.notes[state.selected] ?? new Set();

  for (let number = 1; number <= state.size; number += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "num-button";
    button.dataset.value = String(number);
    button.textContent = number;
    button.disabled = state.locked;
    button.classList.toggle("is-active", state.noteMode ? selectedNotes.has(number) : selectedValue === number);
    button.addEventListener("click", () => enterNumber(number));
    els.numberPad.append(button);
  }

  if (state.numberPadOpen) {
    updateNumberPadPosition();
  }
}

function canOpenNumberPad(index) {
  return index !== null && !state.locked && getPuzzleValue(index) === 0;
}

function showNumberPad(index = state.selected) {
  if (!canOpenNumberPad(index)) {
    hideNumberPad();
    return;
  }

  state.numberPadOpen = true;
  els.numberPad.classList.remove("is-hidden");
  els.numberPad.setAttribute("aria-hidden", "false");
  updateNumberPadPosition();
}

function hideNumberPad() {
  state.numberPadOpen = false;
  els.numberPad.classList.add("is-hidden");
  els.numberPad.setAttribute("aria-hidden", "true");
}

function updateNumberPadPosition() {
  if (!state.numberPadOpen || !canOpenNumberPad(state.selected)) {
    if (state.numberPadOpen) {
      hideNumberPad();
    }
    return;
  }

  const cell = els.board.querySelector(`.cell[data-index="${state.selected}"]`);
  if (!cell) {
    return;
  }

  els.numberPad.classList.remove("is-hidden");
  const cellRect = cell.getBoundingClientRect();
  const padRect = els.numberPad.getBoundingClientRect();
  const margin = 12;
  const preferredX = cellRect.left + cellRect.width / 2;
  const minX = margin + padRect.width / 2;
  const maxX = window.innerWidth - margin - padRect.width / 2;
  const left = Math.min(maxX, Math.max(minX, preferredX));
  let top = cellRect.bottom + 8;

  if (top + padRect.height > window.innerHeight - margin) {
    top = cellRect.top - padRect.height - 8;
  }

  if (top < margin) {
    top = window.innerHeight - padRect.height - margin;
  }

  els.numberPad.style.left = `${left}px`;
  els.numberPad.style.top = `${Math.max(margin, top)}px`;
}

function handleOutsidePointerDown(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  if (target.closest("#numberPad") || target.closest(".cell")) {
    return;
  }

  hideNumberPad();
}

function selectCell(index) {
  state.selected = index;
  state.hints = new Set();
  render();

  const row = Math.floor(index / state.size) + 1;
  const col = (index % state.size) + 1;
  const fixed = getPuzzleValue(index) !== 0;
  if (fixed) {
    hideNumberPad();
    setMessage(`第 ${row} 行第 ${col} 列是题目给出的数字。`);
  } else if (state.mode === "practice" && state.conflicts.has(index)) {
    showNumberPad(index);
    setMessage(formatConflictMessage(index), "alert");
  } else if (state.mode === "practice" && state.deadEnds.has(index)) {
    showNumberPad(index);
    setMessage(`第 ${row} 行第 ${col} 列当前没有可填数字，先检查附近标红的数字。`, "alert");
  } else {
    showNumberPad(index);
    setMessage(`已选择第 ${row} 行第 ${col} 列。`);
  }
}

function enterNumber(number) {
  if (state.locked) {
    hideNumberPad();
    playTone("bad");
    return;
  }

  if (state.selected === null) {
    setMessage("先点一个空格，再选择数字。", "alert");
    playTone("bad");
    return;
  }

  if (getPuzzleValue(state.selected) !== 0) {
    setMessage("这个格子是题目给出的数字，不能修改。", "alert");
    playTone("bad");
    return;
  }

  if (state.noteMode) {
    if (state.entries[state.selected]) {
      setMessage("这个格子已经填了数字，先擦除再写草稿。", "alert");
      playTone("bad");
      return;
    }

    if (state.notes[state.selected].has(number)) {
      state.notes[state.selected].delete(number);
    } else {
      state.notes[state.selected].add(number);
    }
    setMessage(`草稿数字 ${number} 已更新。`);
    playTone("tap");
  } else {
    state.entries[state.selected] = number;
    state.notes[state.selected].clear();
    state.wrongs.delete(state.selected);
    state.hints = new Set();
    updateBoardWarnings();

    if (state.mode === "practice" && state.conflicts.has(state.selected)) {
      setMessage(formatConflictMessage(state.selected), "alert");
      els.coachText.textContent = formatConflictCoachText(state.selected);
      playTone("bad");
    } else if (state.mode === "practice" && state.deadEnds.size) {
      setMessage("当前局面已经有空格无数可填，检查刚刚填过的数字。", "alert");
      playTone("bad");
    } else {
      setMessage("已填入数字。", "good");
      playTone("tap");
    }

    maybeFinishPractice();
    state.numberPadOpen = false;
  }

  render();
}

function eraseSelected() {
  if (state.locked) {
    return;
  }

  if (state.selected === null) {
    setMessage("先点一个要擦除的格子。", "alert");
    playTone("bad");
    return;
  }

  if (getPuzzleValue(state.selected) !== 0) {
    setMessage("题目给出的数字不能擦除。", "alert");
    playTone("bad");
    return;
  }

  state.entries[state.selected] = 0;
  state.notes[state.selected].clear();
  state.wrongs.delete(state.selected);
  state.hints = new Set();
  state.numberPadOpen = false;
  updateBoardWarnings();
  if (state.mode === "practice" && state.deadEnds.size) {
    setMessage("已经擦除，但当前还有空格无数可填。", "alert");
  } else {
    setMessage("已经擦除。");
  }
  playTone("tap");
  render();
}

function toggleNoteMode() {
  if (state.locked) {
    return;
  }

  state.noteMode = !state.noteMode;
  els.noteButton.setAttribute("aria-pressed", String(state.noteMode));
  setMessage(state.noteMode ? "草稿模式开启，点数字会写成小候选数。" : "草稿模式关闭，点数字会直接填入格子。");
  playTone("tap");
  if (canOpenNumberPad(state.selected)) {
    state.numberPadOpen = true;
  }
  renderNumberPad();
}

function showHint() {
  if (state.locked || state.mode !== "practice") {
    return;
  }

  const hint = findHint();
  state.hints = new Set();

  if (!hint) {
    setMessage("目前没有需要提示的空格。", "good");
    return;
  }

  state.selected = hint.index;
  state.hints.add(hint.index);
  state.numberPadOpen = true;

  if (hint.candidates.length === 0) {
    els.coachText.textContent = `第 ${hint.row + 1} 行第 ${hint.col + 1} 列已经没有可填数字，先回头检查前面填过的格子。`;
    setMessage("小教练发现当前局面走不通。", "alert");
    playTone("bad");
    render();
    return;
  }

  if (hint.candidates.length === 1) {
    els.coachText.textContent = `看看第 ${hint.row + 1} 行第 ${hint.col + 1} 列，它只剩下一个可能的数字。`;
  } else {
    els.coachText.textContent = `先观察第 ${hint.row + 1} 行第 ${hint.col + 1} 列，它现在只有 ${hint.candidates.length} 个候选数。`;
  }

  setMessage("小教练已经帮你圈出一个值得观察的格子。", "good");
  playTone("tap");
  render();
}
