const EVOLUTION_STORAGE_KEY = "rainy-sudoku-evolution-v1";
const EVOLUTION_STORAGE_VERSION = 1;
const EVOLUTION_MAX_FORM = 2;
const EVOLUTION_RECORD_MULTIPLIER = 1.5;

const EVOLUTION_FORM_INFO = [
  { label: "三星原图", shortLabel: "三星" },
  { label: "进化 1", shortLabel: "进化1" },
  { label: "进化 2", shortLabel: "进化2" },
];

const EVOLUTION_THRESHOLDS = { 1: 100, 2: 150 };

const EVOLUTION_ART = {
  4: ["./assets/stickers/tier-4-evo1.png", "./assets/stickers/tier-4-evo2.png"],
  5: ["./assets/stickers/tier-5-evo1.png", "./assets/stickers/tier-5-evo2.png"],
};

// 由易到难排列，第二级进化把下限往后挪一档。
const EVOLUTION_DIFFICULTIES = [
  { key: "6:expert", size: 6, difficulty: "expert", energy: 18 },
  { key: "9:super", size: 9, difficulty: "super", energy: 18 },
  { key: "9:very", size: 9, difficulty: "very", energy: 20 },
  { key: "9:expert", size: 9, difficulty: "expert", energy: 25 },
  { key: "9:master", size: 9, difficulty: "master", energy: 25 },
];

let evolutionCollection = createEmptyEvolutionCollection();

function initEvolution() {
  evolutionCollection = readEvolutionCollection();
  // 点一下可以提前跳过进化动画。
  els.evolutionBurst.addEventListener("click", hideEvolutionBurst);
  els.evolutionBurst.addEventListener("cancel", (event) => {
    event.preventDefault();
    hideEvolutionBurst();
  });
  els.cultivationCancel.addEventListener("click", () => {
    const target = getCultivationTarget();
    clearCultivationTarget();
    setMessage(target ? "已取消定向培养，接下来会照常获得贴纸。" : "已取消定向培养。", "good");
  });
  updateCultivationChip();
}

function createEmptyEvolutionCollection() {
  return {
    version: EVOLUTION_STORAGE_VERSION,
    stickers: {},
    bests: {},
    targetId: null,
  };
}

function readEvolutionCollection(storage = window.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(EVOLUTION_STORAGE_KEY) ?? "{}");
    const collection = createEmptyEvolutionCollection();
    const knownIds = new Set(STICKER_CATALOG.filter(isEvolvableSticker).map((sticker) => sticker.id));

    if (parsed.stickers && typeof parsed.stickers === "object") {
      Object.entries(parsed.stickers).forEach(([id, entry]) => {
        if (!knownIds.has(id)) {
          return;
        }

        const form = Number.parseInt(entry?.form, 10);
        const energy = Number.parseInt(entry?.energy, 10);
        const plays = Number.parseInt(entry?.plays, 10);
        collection.stickers[id] = {
          form: Number.isFinite(form) ? Math.min(EVOLUTION_MAX_FORM, Math.max(0, form)) : 0,
          energy: Number.isFinite(energy) && energy > 0 ? energy : 0,
          plays: Number.isFinite(plays) && plays > 0 ? plays : 0,
        };
      });
    }

    if (parsed.bests && typeof parsed.bests === "object") {
      Object.entries(parsed.bests).forEach(([key, value]) => {
        const seconds = Number.parseInt(value, 10);
        if (Number.isFinite(seconds) && seconds > 0) {
          collection.bests[key] = seconds;
        }
      });
    }

    if (typeof parsed.targetId === "string" && knownIds.has(parsed.targetId)) {
      collection.targetId = parsed.targetId;
    }

    return collection;
  } catch {
    return createEmptyEvolutionCollection();
  }
}

function saveEvolutionCollection(storage = window.localStorage) {
  try {
    storage.setItem(EVOLUTION_STORAGE_KEY, JSON.stringify(evolutionCollection));
  } catch {
    // The game remains usable when private browsing blocks local storage.
  }
}

function isEvolvableSticker(sticker) {
  return Boolean(sticker) && sticker.tier >= 4;
}

function getEvolutionEntry(stickerId) {
  return evolutionCollection.stickers[stickerId] ?? { form: 0, energy: 0, plays: 0 };
}

function getStickerForm(stickerId) {
  return getEvolutionEntry(stickerId).form;
}

function getStickerArtImage(sticker, form = 0) {
  if (form > 0 && EVOLUTION_ART[sticker.tier]) {
    return EVOLUTION_ART[sticker.tier][form - 1];
  }

  return sticker.spriteImage;
}

// 只有集满三星（count >= 4）且未到最终形态的 4/5 级贴纸才积累能量。
function canAccumulateEnergy(sticker, count) {
  return isEvolvableSticker(sticker) && count >= 4 && getStickerForm(sticker.id) < EVOLUTION_MAX_FORM;
}

function getEvolutionTargetForm(stickerId) {
  return Math.min(EVOLUTION_MAX_FORM, getStickerForm(stickerId) + 1);
}

function getEvolutionThreshold(targetForm) {
  return EVOLUTION_THRESHOLDS[targetForm] ?? EVOLUTION_THRESHOLDS[EVOLUTION_MAX_FORM];
}

function getQualifierStartIndex(tier, targetForm) {
  if (tier === 4) {
    return targetForm === 1 ? 0 : 1;
  }

  return targetForm === 1 ? 1 : 2;
}

function getEnergyQualifiers(sticker, targetForm) {
  if (!isEvolvableSticker(sticker)) {
    return [];
  }

  return EVOLUTION_DIFFICULTIES.slice(getQualifierStartIndex(sticker.tier, targetForm));
}

function findEnergyQualifier(sticker, targetForm, size, difficulty) {
  return getEnergyQualifiers(sticker, targetForm).find((entry) => {
    return entry.size === size && entry.difficulty === difficulty;
  });
}

function getDifficultyLabel(entry) {
  return `${entry.size} 宫格 · ${COPY[entry.difficulty]}`;
}

function getBestKey(size, difficulty) {
  return `${size}:${difficulty}`;
}

function recordBestTime(size, difficulty, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return false;
  }

  const key = getBestKey(size, difficulty);
  const previous = evolutionCollection.bests[key];
  if (previous && previous <= seconds) {
    return false;
  }

  evolutionCollection.bests[key] = seconds;
  return true;
}

function grantEvolutionEnergy(sticker, options = {}) {
  const targetForm = getEvolutionTargetForm(sticker.id);
  const qualifier = findEnergyQualifier(sticker, targetForm, state.size, state.difficulty);
  if (!qualifier) {
    return null;
  }

  const entry = getEvolutionEntry(sticker.id);
  const threshold = getEvolutionThreshold(targetForm);
  const isRecord = Boolean(options.isRecord);
  const gain = isRecord ? Math.round(qualifier.energy * EVOLUTION_RECORD_MULTIPLIER) : qualifier.energy;
  const previousForm = entry.form;
  const previousEnergy = entry.energy;
  let energy = entry.energy + gain;
  let form = previousForm;

  if (energy >= threshold) {
    form = targetForm;
    energy -= threshold;
  }

  evolutionCollection.stickers[sticker.id] = {
    form,
    energy: form >= EVOLUTION_MAX_FORM ? 0 : energy,
    plays: entry.plays + 1,
  };
  saveEvolutionCollection();

  const evolved = form > previousForm;
  const nextTargetForm = Math.min(EVOLUTION_MAX_FORM, form + 1);
  const nextThreshold = getEvolutionThreshold(nextTargetForm);
  const currentEnergy = evolutionCollection.stickers[sticker.id].energy;

  return {
    sticker,
    gain,
    isRecord,
    targeted: Boolean(options.targeted),
    previousForm,
    previousEnergy,
    previousThreshold: threshold,
    form,
    evolved,
    maxed: form >= EVOLUTION_MAX_FORM,
    energy: currentEnergy,
    threshold: evolved && form >= EVOLUTION_MAX_FORM ? threshold : nextThreshold,
    remaining: form >= EVOLUTION_MAX_FORM ? 0 : Math.max(0, nextThreshold - currentEnergy),
    qualifier,
    plays: evolutionCollection.stickers[sticker.id].plays,
  };
}

// 完成一题后统一决定：定向培养只积累能量，自由练习照常发贴纸并在满三星时补充能量。
function grantCompletionOutcome() {
  if (state.outcomeGranted && state.currentOutcome) {
    return state.currentOutcome;
  }

  const isRecord = recordBestTime(state.size, state.difficulty, getElapsedSeconds());
  const target = getCultivationTarget();
  let outcome;

  if (target && findEnergyQualifier(target, getEvolutionTargetForm(target.id), state.size, state.difficulty)) {
    outcome = { evolution: grantEvolutionEnergy(target, { targeted: true, isRecord }) };
    if (outcome.evolution?.maxed) {
      clearCultivationTarget({ silent: true });
    }
  } else {
    const reward = grantCompletionReward();
    let evolution = null;

    // previousLevel === 3 表示这张贴纸在本局之前就已经集满三星，不抢走升到三星的高光时刻。
    if (reward.previousLevel === 3 && canAccumulateEnergy(reward.sticker, reward.count)) {
      evolution = grantEvolutionEnergy(reward.sticker, { targeted: false, isRecord });
    }

    outcome = { reward, evolution };
  }

  saveEvolutionCollection();
  state.outcomeGranted = true;
  state.currentOutcome = outcome;
  updateCultivationChip();
  return outcome;
}

/* ---------- 定向培养 ---------- */

function getCultivationTarget() {
  if (!evolutionCollection.targetId) {
    return null;
  }

  const sticker = STICKER_CATALOG.find((entry) => entry.id === evolutionCollection.targetId);
  if (!sticker || getStickerForm(sticker.id) >= EVOLUTION_MAX_FORM) {
    return null;
  }

  return sticker;
}

function setCultivationTarget(stickerId) {
  evolutionCollection.targetId = stickerId;
  saveEvolutionCollection();
  updateCultivationChip();
}

function clearCultivationTarget(options = {}) {
  evolutionCollection.targetId = null;
  saveEvolutionCollection();
  updateCultivationChip();
  if (!options.silent) {
    renderCollectionIfOpen();
  }
}

function startCultivationGame(sticker, qualifier) {
  setCultivationTarget(sticker.id);
  settings.size = qualifier.size;
  settings.difficulty = qualifier.difficulty;
  settings.durationMinutes = SIZE_CONFIG[qualifier.size].defaultMinutes;
  els.durationInput.value = settings.durationMinutes;
  applySettingsToControls();
  saveSettings();
  closeStickerPreview();
  closeCollection();
  startNewGame();
  setMessage(`开始为「${sticker.name}」积累能量，加油！`, "good");
}

// 换题或改设置后仍然合格就继续培养，切到不合格难度时退出。返回 true 表示已经给出了自己的提示。
function syncCultivationWithSettings() {
  const target = getCultivationTarget();
  if (!target) {
    updateCultivationChip();
    return false;
  }

  const qualifier = findEnergyQualifier(target, getEvolutionTargetForm(target.id), settings.size, settings.difficulty);
  if (qualifier) {
    updateCultivationChip();
    return false;
  }

  clearCultivationTarget({ silent: true });
  setMessage(`这个难度不能为「${target.name}」积累能量，已经回到普通模式。`, "alert");
  return true;
}

function updateCultivationChip() {
  const target = getCultivationTarget();
  if (!target) {
    els.cultivationChip.hidden = true;
    return;
  }

  const targetForm = getEvolutionTargetForm(target.id);
  const entry = getEvolutionEntry(target.id);
  const threshold = getEvolutionThreshold(targetForm);
  els.cultivationChip.hidden = false;
  applyStickerTheme(els.cultivationArt, target, 0, entry.form);
  renderStickerGraphic(els.cultivationArtSymbol, target, entry.form);
  els.cultivationName.textContent = `培养中 · ${target.name}`;
  els.cultivationProgress.textContent = `能量 ${entry.energy}/${threshold} · 还差 ${Math.max(0, threshold - entry.energy)}`;
  els.cultivationName.title = `培养中 · ${target.name} → ${EVOLUTION_FORM_INFO[targetForm].label}`;
  els.cultivationFill.style.width = `${Math.min(100, Math.round((entry.energy / threshold) * 100))}%`;
}

/* ---------- 完成揭晓 ---------- */

function energyPercent(value, total) {
  return Math.min(100, Math.max(0, Math.round((value / (total || 1)) * 100)));
}

function renderEvolutionReveal(evolution) {
  const { sticker, gain, isRecord, targeted, form, evolved, maxed, energy, threshold, remaining, previousEnergy, previousThreshold } = evolution;
  els.evolutionReveal.hidden = false;
  els.evolutionReveal.dataset.evolved = evolved ? "true" : "false";
  applyStickerTheme(els.evolutionRevealArt, sticker, 0, form);
  renderStickerGraphic(els.evolutionRevealSymbol, sticker, form);
  els.evolutionRevealArt.dataset.reveal = evolved ? "evolve" : "energy";
  els.evolutionRevealName.textContent = `${sticker.name} · ${EVOLUTION_FORM_INFO[form].label}`;

  // 让能量条从上一局的位置涨到这一局的位置，而不是直接停在终值。
  // 进化了就从空条开始，让新形态的进度条重新填起来。
  const startPercent = evolved ? 0 : energyPercent(previousEnergy, previousThreshold);
  const endPercent = maxed ? 100 : energyPercent(energy, threshold);
  els.evolutionRevealFill.style.transition = "none";
  els.evolutionRevealFill.style.width = `${startPercent}%`;
  els.evolutionRevealFill.dataset.targetWidth = String(endPercent);

  const parts = [];
  parts.push(isRecord ? `刷新最快纪录，能量 +${gain}！` : `能量 +${gain}。`);

  if (evolved && maxed) {
    parts.push("觉醒最终形态！");
  } else if (evolved) {
    parts.push(`进化成「${EVOLUTION_FORM_INFO[form].label}」！`);
  } else {
    parts.push(`离「${EVOLUTION_FORM_INFO[Math.min(EVOLUTION_MAX_FORM, form + 1)].label}」还差 ${remaining} 能量。`);
  }

  if (targeted && !evolved) {
    parts.push("这一局的能量全部给了它。");
  }

  els.evolutionRevealMessage.textContent = parts.join("");
}

function hideEvolutionReveal() {
  hideEvolutionBurst();
  els.evolutionReveal.hidden = true;
  els.evolutionReveal.removeAttribute("data-evolved");
  els.evolutionRevealArt.removeAttribute("data-reveal");
  stopStickerAnimation(els.evolutionRevealArt, els.rewardStickerStars);
}

// 弹窗打开后才能看到过渡动画，所以填充动作单独在这里触发。
function playEvolutionEnergyFill() {
  const fill = els.evolutionRevealFill;
  void fill.offsetWidth; // 先把起始宽度落实
  fill.style.transition = ""; // 恢复 CSS 里的 width 过渡
  window.requestAnimationFrame(() => {
    fill.style.width = `${fill.dataset.targetWidth ?? 0}%`;
  });
}

function playEvolutionRevealAnimation() {
  els.evolutionRevealArt.classList.remove("is-animating");
  void els.evolutionRevealArt.offsetWidth;
  els.evolutionRevealArt.classList.add("is-animating");
}

const EVOLUTION_BURST_COLORS = ["#fff1a8", "#7ee2d0", "#df91e6", "#ffffff"];
let evolutionBurstTimer = null;

function buildEvolutionBurstParticles() {
  if (els.evolutionBurstParticles.childElementCount) {
    return;
  }

  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 28; index += 1) {
    const particle = document.createElement("span");
    particle.className = "evolution-particle";
    particle.style.setProperty("--x", `${6 + Math.random() * 88}%`);
    particle.style.setProperty("--y", `${44 + Math.random() * 48}%`);
    particle.style.setProperty("--size", `${3 + Math.random() * 6}px`);
    particle.style.setProperty("--color", EVOLUTION_BURST_COLORS[index % EVOLUTION_BURST_COLORS.length]);
    particle.style.setProperty("--delay", `${0.35 + Math.random() * 1.2}s`);
    particle.style.setProperty("--drift", Math.random().toFixed(2));
    fragment.append(particle);
  }
  els.evolutionBurstParticles.append(fragment);
}

// 进化专属的全屏揭晓：光环炸开 + 粒子上升 + 新形态亮相。
function playEvolutionBurst(evolution) {
  const { sticker, form, maxed } = evolution;
  buildEvolutionBurstParticles();
  applyStickerTheme(els.evolutionBurstArt, sticker, 0, form);
  renderStickerGraphic(els.evolutionBurstSymbol, sticker, form);
  els.evolutionBurstTitle.textContent = maxed ? "觉醒最终形态！" : "进化啦！";
  els.evolutionBurstSub.textContent = `${sticker.name} · ${EVOLUTION_FORM_INFO[form].label}`;

  if (typeof els.evolutionBurst.showModal === "function") {
    if (!els.evolutionBurst.open) {
      els.evolutionBurst.showModal();
    }
  } else {
    els.evolutionBurst.setAttribute("open", "");
  }

  els.evolutionBurst.classList.remove("is-playing");
  void els.evolutionBurst.offsetWidth;
  els.evolutionBurst.classList.add("is-playing");

  window.clearTimeout(evolutionBurstTimer);
  evolutionBurstTimer = window.setTimeout(hideEvolutionBurst, 3400);
}

function hideEvolutionBurst() {
  window.clearTimeout(evolutionBurstTimer);
  els.evolutionBurst.classList.remove("is-playing");

  if (typeof els.evolutionBurst.close === "function") {
    if (els.evolutionBurst.open) {
      els.evolutionBurst.close();
    }
  } else {
    els.evolutionBurst.removeAttribute("open");
  }
}

/* ---------- 贴纸大图里的能量页 ---------- */

function renderEvolutionPanel(sticker, count) {
  const active = canAccumulateEnergy(sticker, count);
  const maxed = isEvolvableSticker(sticker) && count >= 4 && getStickerForm(sticker.id) >= EVOLUTION_MAX_FORM;
  els.evolutionPanel.hidden = !active;
  els.evolutionMaxed.hidden = !maxed;

  if (!active) {
    return;
  }

  const targetForm = getEvolutionTargetForm(sticker.id);
  const entry = getEvolutionEntry(sticker.id);
  const threshold = getEvolutionThreshold(targetForm);
  const isTarget = getCultivationTarget()?.id === sticker.id;

  els.evolutionEnergyNow.textContent = `${entry.energy} / ${threshold}`;
  els.evolutionEnergyTarget.textContent = `进化到${EVOLUTION_FORM_INFO[targetForm].label}`;
  // 先归零，等弹窗打开后再从 0 涨到当前积攒的位置。
  els.evolutionEnergyFill.style.transition = "none";
  els.evolutionEnergyFill.style.width = "0%";
  els.evolutionEnergyFill.dataset.targetWidth = String(energyPercent(entry.energy, threshold));
  els.evolutionHint.textContent = isTarget
    ? "正在培养它。点下面的难度直接开始这一局。"
    : "点下面的难度，直接开始这个难度的数独来喂养它。";

  const fragment = document.createDocumentFragment();
  getEnergyQualifiers(sticker, targetForm).forEach((qualifier) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "evolution-difficulty";
    const label = document.createElement("span");
    label.textContent = getDifficultyLabel(qualifier);
    const energy = document.createElement("span");
    energy.className = "evolution-difficulty-energy";
    energy.textContent = `+${qualifier.energy}`;
    button.append(label, energy);
    button.addEventListener("click", () => startCultivationGame(sticker, qualifier));
    fragment.append(button);
  });

  els.evolutionDifficulties.replaceChildren(fragment);
}

// 贴纸大图打开后触发，让能量条从 0 涨到当前积攒的位置。
function playEvolutionPanelEnergyFill() {
  if (els.evolutionPanel.hidden) {
    return;
  }

  const fill = els.evolutionEnergyFill;
  void fill.offsetWidth;
  fill.style.transition = "";
  window.requestAnimationFrame(() => {
    fill.style.width = `${fill.dataset.targetWidth ?? 0}%`;
  });
}

function hideEvolutionPanel() {
  els.evolutionPanel.hidden = true;
  els.evolutionMaxed.hidden = true;
}

// 集满三星的 4/5 级贴纸才有进化形态可看。
function usesEvolutionPreview(sticker, count) {
  return isEvolvableSticker(sticker) && count >= 4;
}

// 大图把星级历程和进化形态串成一条时间线：0-3 是星级，之后接进化形态。
// 只走到她已经拿到的那一格，没解锁的形态一律不给看，留住期待感。
function getPreviewStageCount(sticker, count) {
  const level = getStickerLevel(count);
  if (!usesEvolutionPreview(sticker, count)) {
    return level;
  }

  return level + getStickerForm(sticker.id);
}

function describePreviewStage(index) {
  if (index <= 3) {
    return { level: index, form: 0, label: STICKER_LEVEL_INFO[index].label };
  }

  const form = Math.min(EVOLUTION_MAX_FORM, index - 3);
  return { level: 3, form, label: EVOLUTION_FORM_INFO[form].label };
}
