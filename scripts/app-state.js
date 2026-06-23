const SIZE_CONFIG = {
  6: {
    boxRows: 2,
    boxCols: 3,
    blanks: {
      super: { min: 6, max: 8, allowHiddenSingles: false },
      very: { min: 9, max: 11, allowHiddenSingles: false },
      easy: { min: 12, max: 14, allowHiddenSingles: false },
      expert: { min: 16, max: 20, allowHiddenSingles: true },
    },
    defaultMinutes: 8,
  },
  9: {
    boxRows: 3,
    boxCols: 3,
    blanks: {
      super: { min: 18, max: 25, allowHiddenSingles: false, openingSingles: 5 },
      very: { min: 25, max: 30, allowHiddenSingles: false },
      expert: { min: 38, max: 44, allowHiddenSingles: true },
      master: { min: 45, max: 50, allowAdvancedLogic: true },
    },
    defaultMinutes: 12,
  },
};

const SETTINGS_VERSION = 3;
const DIFFICULTY_KEYS = ["super", "very", "easy", "expert", "master"];

const COPY = {
  practice: "练习模式",
  race: "比赛模式",
  super: "超级简单",
  very: "非常简单",
  easy: "简单",
  expert: "高手难度",
  master: "超级高手",
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
  submitButton: document.querySelector("#submitButton"),
  submitLabel: document.querySelector("#submitLabel"),
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
  difficulty: savedSettings.difficulty ?? "super",
  mode: savedSettings.mode ?? "practice",
  durationMinutes: savedSettings.durationMinutes ?? 10,
  timerVisible: savedSettings.timerVisible ?? true,
};

if (!getAvailableDifficultyKeys(settings.size).includes(settings.difficulty)) {
  settings.difficulty = "super";
}

const state = {
  size: 6,
  boxRows: 2,
  boxCols: 3,
  difficulty: "super",
  mode: "practice",
  durationSeconds: 600,
  timerVisible: true,
  solution: [],
  puzzle: [],
  entries: [],
  notes: [],
  selected: null,
  noteMode: false,
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
      difficulty: normalizeDifficulty(parsed.difficulty, parsed.settingsVersion),
      mode: ["practice", "race"].includes(parsed.mode) ? parsed.mode : undefined,
      durationMinutes: parsed.durationMinutes ? clampMinutes(parsed.durationMinutes) : undefined,
      timerVisible: typeof parsed.timerVisible === "boolean" ? parsed.timerVisible : undefined,
    };
  } catch {
    return {};
  }
}

function normalizeDifficulty(value, version) {
  if (version !== SETTINGS_VERSION) {
    if (value === "next") {
      return "expert";
    }

    if (value === "easy") {
      return "super";
    }
  }

  return DIFFICULTY_KEYS.includes(value) ? value : undefined;
}

function getAvailableDifficultyKeys(size) {
  return Object.keys(SIZE_CONFIG[size].blanks);
}

function clampMinutes(value) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) {
    return 10;
  }

  return Math.min(60, Math.max(1, number));
}
