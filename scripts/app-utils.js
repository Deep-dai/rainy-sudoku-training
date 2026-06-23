function startTimer() {
  updateTimerLabel();
  state.timerId = window.setInterval(() => {
    updateTimerLabel();
    if (state.mode === "race" && getRemainingSeconds() <= 0) {
      handleTimeUp();
    }
  }, 500);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function handleTimeUp() {
  if (state.locked) {
    return;
  }

  state.locked = true;
  state.wrongs = findWrongCells(true);
  stopTimer();
  render();
  setMessage("时间到，已经自动交卷。", "alert");
  playTone("bad");
  showResult("时间到", `倒计时结束，用时 ${formatSeconds(getElapsedSeconds())}，有 ${state.wrongs.size} 个空格或错误格子。`);
}

function updateTimerLabel() {
  if (!state.timerVisible) {
    els.timerLabel.textContent = "计时隐藏";
    return;
  }

  const seconds = state.mode === "race" ? getRemainingSeconds() : getElapsedSeconds();
  els.timerLabel.textContent = formatSeconds(seconds);
}

function updateStatus() {
  const filled = getDisplayValues().filter(Boolean).length;
  els.progressLabel.textContent = `${filled}/${state.size * state.size}`;
  updateTimerLabel();
}

function updateCoachText() {
  if (state.mode === "race") {
    els.coachText.textContent = "比赛模式会隐藏主动提示，交卷或时间到后再统一显示结果。";
  } else {
    els.coachText.textContent = "先自己观察行、列和宫，填完后再认真复盘。";
  }
}

function handleKeyboard(event) {
  const key = event.key;

  if (/^[1-9]$/.test(key)) {
    const number = Number(key);
    if (number <= state.size) {
      enterNumber(number);
      event.preventDefault();
    }
    return;
  }

  if (key === "Backspace" || key === "Delete" || key === "0") {
    eraseSelected();
    event.preventDefault();
    return;
  }

  if (key.toLowerCase() === "n") {
    toggleNoteMode();
    event.preventDefault();
    return;
  }

  if (state.selected === null || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
    return;
  }

  const row = Math.floor(state.selected / state.size);
  const col = state.selected % state.size;
  const next = {
    ArrowUp: [Math.max(0, row - 1), col],
    ArrowDown: [Math.min(state.size - 1, row + 1), col],
    ArrowLeft: [row, Math.max(0, col - 1)],
    ArrowRight: [row, Math.min(state.size - 1, col + 1)],
  }[key];

  selectCell(next[0] * state.size + next[1]);
  event.preventDefault();
}

function getElapsedSeconds() {
  return Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
}

function getRemainingSeconds() {
  return Math.max(0, state.durationSeconds - getElapsedSeconds());
}

function getDisplayGrid() {
  const values = getDisplayValues();
  return Array.from({ length: state.size }, (_, row) => {
    return values.slice(row * state.size, row * state.size + state.size);
  });
}

function getDisplayValues() {
  return Array.from({ length: state.size * state.size }, (_, index) => {
    return getPuzzleValue(index) || state.entries[index] || 0;
  });
}

function getPuzzleValue(index) {
  if (!state.puzzle.length) {
    return 0;
  }

  const row = Math.floor(index / state.size);
  const col = index % state.size;
  return state.puzzle[row][col];
}

function getBoxIndex(row, col, config, size = state.size) {
  return Math.floor(row / config.boxRows) * (size / config.boxCols) + Math.floor(col / config.boxCols);
}

function bitCount(mask) {
  let count = 0;
  let value = mask;
  while (value) {
    value &= value - 1;
    count += 1;
  }
  return count;
}

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function setMessage(text, tone = "normal") {
  els.messageLine.textContent = text;
  els.messageLine.classList.toggle("is-alert", tone === "alert");
  els.messageLine.classList.toggle("is-good", tone === "good");
}

function showResult(title, text) {
  els.resultTitle.textContent = title;
  els.resultText.textContent = text;

  if (typeof els.resultDialog.showModal === "function") {
    els.resultDialog.showModal();
  } else {
    window.alert(`${title}\n${text}`);
  }
}

function toggleSound() {
  state.sound = !state.sound;
  els.soundButton.setAttribute("aria-pressed", String(state.sound));
  setMessage(state.sound ? "声音已开启。" : "声音已关闭。");
  if (state.sound) {
    playTone("tap");
  }
}

function playTone(type) {
  if (!state.sound) {
    return;
  }

  try {
    audioContext = audioContext || new AudioContext();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequency = type === "good" ? 660 : type === "bad" ? 180 : 420;

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  } catch {
    state.sound = false;
    els.soundButton.setAttribute("aria-pressed", "false");
  }
}

function applySettingsToControls() {
  const availableDifficulties = new Set(getAvailableDifficultyKeys(settings.size));

  els.settingButtons.forEach((button) => {
    const setting = button.dataset.setting;
    const rawValue = button.dataset.value;
    const value = coerceSettingValue(setting, rawValue);
    const isAvailable = setting !== "difficulty" || availableDifficulties.has(rawValue);
    button.hidden = !isAvailable;
    button.disabled = !isAvailable;
    button.classList.toggle("is-active", Object.is(settings[setting], value));
  });

  els.durationInput.value = settings.durationMinutes;
}

function coerceSettingValue(setting, rawValue) {
  if (setting === "size") {
    return Number(rawValue);
  }

  if (setting === "timerVisible") {
    return rawValue === "on";
  }

  return rawValue;
}

function readSettings() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem("rainy-sudoku-settings") ?? "{}");
    return {
      size: [6, 9].includes(parsed.size) ? parsed.size : undefined,
      difficulty: normalizeDifficulty(parsed.difficulty, parsed.settingsVersion),
      mode: ["practice", "race"].includes(parsed.mode) ? parsed.mode : undefined,
      durationMinutes: parsed.durationMinutes ? clampMinutes(parsed.durationMinutes) : undefined,
      timerVisible: typeof parsed.timerVisible === "boolean" ? parsed.timerVisible : undefined,
    };
  } catch {
    return {};
  }
}

function saveSettings() {
  window.localStorage.setItem("rainy-sudoku-settings", JSON.stringify({
    ...settings,
    settingsVersion: SETTINGS_VERSION,
  }));
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    return;
  }

  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function clampMinutes(value) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) {
    return 10;
  }

  return Math.min(60, Math.max(1, number));
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

init();
