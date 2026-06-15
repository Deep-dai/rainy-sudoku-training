const SIZE_CONFIG = {
  6: {
    boxRows: 2,
    boxCols: 3,
    clues: {
      easy: 24,
      next: 18,
    },
    defaultMinutes: 8,
  },
  9: {
    boxRows: 3,
    boxCols: 3,
    clues: {
      easy: 54,
      next: 42,
    },
    defaultMinutes: 12,
  },
};

const COPY = {
  practice: "练习模式",
  race: "比赛模式",
  easy: "基础",
  next: "进阶",
};

const els = {
  app: document.querySelector(".app-shell"),
  board: document.querySelector("#sudokuBoard"),
  numberPad: document.querySelector("#numberPad"),
  newGameButton: document.querySelector("#newGameButton"),
  durationInput: document.querySelector("#durationInput"),
  timerLabel: document.querySelector("#timerLabel"),
  modeLabel: document.querySelector("#modeLabel"),
  progressLabel: document.querySelector("#progressLabel"),
  messageLine: document.querySelector("#messageLine"),
  noteButton: document.querySelector("#noteButton"),
  eraseButton: document.querySelector("#eraseButton"),
  hintButton: document.querySelector("#hintButton"),
  checkButton: document.querySelector("#checkButton"),
  submitButton: document.querySelector("#submitButton"),
  coachText: document.querySelector("#coachText"),
  soundButton: document.querySelector("#soundButton"),
  resultDialog: document.querySelector("#resultDialog"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  closeResultButton: document.querySelector("#closeResultButton"),
  resultNewButton: document.querySelector("#resultNewButton"),
  settingButtons: [...document.querySelectorAll("[data-setting]")],
};

const savedSettings = readSettings();

const settings = {
  size: savedSettings.size ?? 6,
  difficulty: savedSettings.difficulty ?? "easy",
  mode: savedSettings.mode ?? "practice",
  durationMinutes: savedSettings.durationMinutes ?? 10,
};

const state = {
  size: 6,
  boxRows: 2,
  boxCols: 3,
  difficulty: "easy",
  mode: "practice",
  durationSeconds: 600,
  solution: [],
  puzzle: [],
  entries: [],
  notes: [],
  selected: null,
  noteMode: false,
  conflicts: new Set(),
  deadEnds: new Set(),
  wrongs: new Set(),
  hints: new Set(),
  locked: false,
  numberPadOpen: false,
  startedAt: 0,
  timerId: null,
  sound: true,
};

let audioContext = null;

function readSettings() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem("rainy-sudoku-settings") ?? "{}");
    return {
      size: [6, 9].includes(parsed.size) ? parsed.size : undefined,
      difficulty: ["easy", "next"].includes(parsed.difficulty) ? parsed.difficulty : undefined,
      mode: ["practice", "race"].includes(parsed.mode) ? parsed.mode : undefined,
      durationMinutes: parsed.durationMinutes ? clampMinutes(parsed.durationMinutes) : undefined,
    };
  } catch {
    return {};
  }
}

function clampMinutes(value) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) {
    return 10;
  }

  return Math.min(60, Math.max(1, number));
}
