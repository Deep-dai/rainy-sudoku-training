const REWARD_STORAGE_KEY = "rainy-sudoku-rewards-v1";
const REWARD_STORAGE_VERSION = 1;

const STICKER_LEVEL_INFO = [
  { label: "初始形态 · 无星", shortLabel: "无星" },
  { label: "一星形态 · 点亮", shortLabel: "一星" },
  { label: "二星形态 · 聚能", shortLabel: "二星" },
  { label: "三星形态 · 觉醒", shortLabel: "三星" },
];

const REWARD_TIER_INFO = {
  1: { name: "小贴纸", shortName: "1级", description: "快乐的小小收藏" },
  2: { name: "可爱动物", shortName: "2级", description: "认识新的动物朋友" },
  3: { name: "闪亮动物", shortName: "3级", description: "会发光的动物伙伴" },
  4: { name: "珍藏毛绒", shortName: "4级", description: "闪闪发光的毛绒伙伴" },
  5: { name: "超级珍藏", shortName: "5级", description: "最特别的传奇朋友" },
};

const REWARD_DIFFICULTY_MAP = {
  "6:super": 1,
  "6:very": 2,
  "6:easy": 3,
  "6:expert": 4,
  "9:super": 3,
  "9:very": 4,
  "9:expert": 5,
  "9:master": 5,
};

const REWARD_TIER_CHANCES = {
  "9:very": [
    { tier: 4, upperBound: 0.8 },
    { tier: 5, upperBound: 1 },
  ],
};

const STICKER_CATALOG = [
  { id: "sunny-star", tier: 1, name: "晴天星星", symbol: "⭐", colors: ["#ffe57a", "#ff9d72"], ink: "#704500" },
  { id: "rainbow-bridge", tier: 1, name: "彩虹桥", symbol: "🌈", colors: ["#9de7dc", "#ffc4df"], ink: "#275b66" },
  { id: "berry-smile", tier: 1, name: "草莓甜心", symbol: "🍓", colors: ["#ffb4b0", "#fff0a8"], ink: "#7b2743" },
  { id: "rainy-umbrella", tier: 1, name: "Rainy 小雨伞", symbol: "☂️", colors: ["#b8c9f2", "#eed0f5"], ink: "#453a79" },
  { id: "bounce-bunny", tier: 2, name: "蹦蹦兔", symbol: "🐰", spriteImage: "./assets/stickers/tier-2-cute.jpg", spritePosition: "0% 0%", colors: ["#ffd7e8", "#fff2b5"], ink: "#7a3e62" },
  { id: "marmalade-cat", tier: 2, name: "橘子猫", symbol: "🐱", spriteImage: "./assets/stickers/tier-2-cute.jpg", spritePosition: "100% 0%", colors: ["#ffc594", "#ffe7ae"], ink: "#74431f" },
  { id: "sunny-duck", tier: 2, name: "太阳小鸭", symbol: "🐥", spriteImage: "./assets/stickers/tier-2-cute.jpg", spritePosition: "0% 100%", colors: ["#fff07a", "#bdebd1"], ink: "#5a551f" },
  { id: "ice-penguin", tier: 2, name: "冰川企鹅", symbol: "🐧", spriteImage: "./assets/stickers/tier-2-cute.jpg", spritePosition: "100% 100%", colors: ["#adddf4", "#d9d3f5"], ink: "#244b68" },
  { id: "forest-fox", tier: 3, name: "森林狐狸", symbol: "🦊", spriteImage: "./assets/stickers/tier-3-magic.jpg", spritePosition: "0% 0%", colors: ["#ffad78", "#c9e7a5"], ink: "#6f321c" },
  { id: "bamboo-panda", tier: 3, name: "竹林熊猫", symbol: "🐼", spriteImage: "./assets/stickers/tier-3-magic.jpg", spritePosition: "100% 0%", colors: ["#bfe0bd", "#f6d8e7"], ink: "#294f3b" },
  { id: "ocean-dolphin", tier: 3, name: "浪花海豚", symbol: "🐬", spriteImage: "./assets/stickers/tier-3-magic.jpg", spritePosition: "0% 100%", colors: ["#8cddea", "#b9c8f4"], ink: "#1c5c75" },
  { id: "night-owl", tier: 3, name: "月光猫头鹰", symbol: "🦉", spriteImage: "./assets/stickers/tier-3-magic.jpg", spritePosition: "100% 100%", colors: ["#c7b5ec", "#ffd68c"], ink: "#513f78" },
  { id: "sun-tiger", tier: 4, name: "粉色兔兔", symbol: "🐰", spriteImage: "./assets/stickers/tier-4-plush.jpg", spritePosition: "0% 0%", colors: ["#f7b8ce", "#bce9e5"], ink: "#74435f" },
  { id: "blue-whale", tier: 4, name: "灰色兔兔", symbol: "🐰", spriteImage: "./assets/stickers/tier-4-plush.jpg", spritePosition: "100% 0%", colors: ["#c8c1c6", "#cfc0ed"], ink: "#51485d" },
  { id: "jewel-peacock", tier: 4, name: "毛绒长颈鹿", symbol: "🦒", spriteImage: "./assets/stickers/tier-4-plush.jpg", spritePosition: "0% 100%", colors: ["#f5c36f", "#f3aa94"], ink: "#71461f" },
  { id: "snow-leopard", tier: 4, name: "星光伊布", symbol: "✦", spriteImage: "./assets/stickers/tier-4-plush.jpg", spritePosition: "100% 100%", colors: ["#c98e64", "#ffe0a8"], ink: "#5f3b2b" },
  { id: "golden-lion", tier: 5, name: "金瞳小黑龙", symbol: "🐉", spriteImage: "./assets/stickers/tier-5-friends.jpg", spritePosition: "0% 0%", colors: ["#ffd65a", "#ff8c75"], ink: "#6c3d00" },
  { id: "aurora-deer", tier: 5, name: "星雪小白虎", symbol: "🐯", spriteImage: "./assets/stickers/tier-5-friends.jpg", spritePosition: "100% 0%", colors: ["#73d7ef", "#8b9ff3"], ink: "#174f7a" },
  { id: "cosmic-whale", tier: 5, name: "皇冠小黄鸭", symbol: "🐥", spriteImage: "./assets/stickers/tier-5-friends.jpg", spritePosition: "0% 100%", colors: ["#65d8ad", "#a67de8"], ink: "#205d53" },
  { id: "rainbow-unicorn", tier: 5, name: "月光光煞", symbol: "🐲", spriteImage: "./assets/stickers/tier-5-friends.jpg", spritePosition: "100% 100%", colors: ["#d1d8ea", "#f2acd8"], ink: "#3e4b68" },
];

let rewardCollection = createEmptyRewardCollection();
let stickerPreviewState = null;

function initRewards() {
  rewardCollection = readRewardCollection();
  updateCollectionSummary();

  els.collectionButton.addEventListener("click", openCollection);
  els.closeCollectionButton.addEventListener("click", closeCollection);
  els.resultCollectionButton.addEventListener("click", () => {
    els.resultDialog.close();
    openCollection();
  });
  els.collectionDialog.addEventListener("click", (event) => {
    if (event.target === els.collectionDialog) {
      closeCollection();
    }
  });
  els.closeStickerPreviewButton.addEventListener("click", closeStickerPreview);
  els.previousStickerLevelButton.addEventListener("click", () => changeStickerPreviewLevel(-1));
  els.nextStickerLevelButton.addEventListener("click", () => changeStickerPreviewLevel(1));
  els.stickerPreviewDialog.addEventListener("click", (event) => {
    if (event.target === els.stickerPreviewDialog) {
      closeStickerPreview();
    }
  });
  els.stickerPreviewDialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      changeStickerPreviewLevel(event.key === "ArrowLeft" ? -1 : 1);
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

function createEmptyRewardCollection() {
  return {
    version: REWARD_STORAGE_VERSION,
    totalAwards: 0,
    stickers: {},
  };
}

function readRewardCollection(storage = window.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(REWARD_STORAGE_KEY) ?? "{}");
    const collection = createEmptyRewardCollection();
    const knownIds = new Set(STICKER_CATALOG.map((sticker) => sticker.id));

    if (parsed.stickers && typeof parsed.stickers === "object") {
      Object.entries(parsed.stickers).forEach(([id, entry]) => {
        const count = Number.parseInt(entry?.count, 10);
        if (knownIds.has(id) && Number.isFinite(count) && count > 0) {
          collection.stickers[id] = { count };
        }
      });
    }

    collection.totalAwards = Object.values(collection.stickers).reduce((sum, entry) => sum + entry.count, 0);
    return collection;
  } catch {
    return createEmptyRewardCollection();
  }
}

function saveRewardCollection(storage = window.localStorage) {
  try {
    storage.setItem(REWARD_STORAGE_KEY, JSON.stringify(rewardCollection));
  } catch {
    // The game remains usable when private browsing blocks local storage.
  }
}

function getRewardTier(size, difficulty) {
  return REWARD_DIFFICULTY_MAP[`${size}:${difficulty}`] ?? 1;
}

function selectRewardTier(size, difficulty, random = Math.random) {
  const chances = REWARD_TIER_CHANCES[`${size}:${difficulty}`];
  if (!chances) {
    return getRewardTier(size, difficulty);
  }

  const roll = random();
  return chances.find(({ upperBound }) => roll < upperBound)?.tier ?? chances[chances.length - 1].tier;
}

function getStickerLevel(count) {
  return Math.min(3, Math.max(0, count - 1));
}

function selectRewardSticker(tier, collection = rewardCollection, random = Math.random) {
  const tierStickers = STICKER_CATALOG.filter((sticker) => sticker.tier === tier);
  const missing = tierStickers.filter((sticker) => !collection.stickers[sticker.id]?.count);
  const pool = missing.length && random() < 0.8 ? missing : tierStickers;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[Math.max(0, index)];
}

function grantCompletionReward(random = Math.random) {
  if (state.rewardGranted && state.currentReward) {
    return state.currentReward;
  }

  const tier = selectRewardTier(state.size, state.difficulty, random);
  const sticker = selectRewardSticker(tier, rewardCollection, random);
  const previousCount = rewardCollection.stickers[sticker.id]?.count ?? 0;
  const count = previousCount + 1;
  const previousLevel = getStickerLevel(previousCount);
  const level = getStickerLevel(count);

  rewardCollection.stickers[sticker.id] = { count };
  rewardCollection.totalAwards += 1;

  const reward = {
    sticker,
    tier,
    count,
    level,
    previousLevel,
    isNew: previousCount === 0,
    upgraded: level > previousLevel,
    independent: !state.usedHint,
  };

  state.rewardGranted = true;
  state.currentReward = reward;
  saveRewardCollection();
  updateCollectionSummary();
  return reward;
}

function updateCollectionSummary() {
  const unlocked = getUnlockedStickerCount();
  els.collectionCount.textContent = `${unlocked}/${STICKER_CATALOG.length}`;
  els.collectionButton.setAttribute("aria-label", `打开我的贴纸，已收集 ${unlocked} 张`);
  els.collectionProgress.textContent = `已经找到 ${unlocked} 位新朋友，共获得 ${rewardCollection.totalAwards} 张贴纸`;
}

function getUnlockedStickerCount() {
  return STICKER_CATALOG.filter((sticker) => rewardCollection.stickers[sticker.id]?.count > 0).length;
}

function renderRewardReveal(reward) {
  const { sticker, tier, count, level, isNew, upgraded, independent } = reward;
  els.rewardReveal.hidden = false;
  els.rewardReveal.dataset.tier = String(tier);
  els.resultCollectionButton.hidden = false;
  els.resultDialog.classList.add("has-reward");
  applyStickerTheme(els.rewardStickerArt, sticker, level);
  els.rewardStickerArt.dataset.reveal = upgraded ? "upgrade" : isNew ? "new" : "repeat";
  renderStickerGraphic(els.rewardStickerSymbol, sticker);
  els.rewardTierLabel.textContent = `${REWARD_TIER_INFO[tier].shortName} · ${REWARD_TIER_INFO[tier].name}`;
  els.rewardStickerName.textContent = sticker.name;
  renderStars(els.rewardStickerStars, level, upgraded ? level : 0);
  els.independentBadge.hidden = !independent;

  if (isNew) {
    els.rewardMessage.textContent = "新朋友加入收藏！这是第一次获得这张贴纸。";
  } else if (level > 0 && count <= 4) {
    els.rewardMessage.textContent = `贴纸变得更闪亮了！现在是 ${level} 星贴纸。`;
  } else {
    els.rewardMessage.textContent = `这位朋友又来啦，已经收集了 ${count} 次。`;
  }
}

function hideRewardReveal() {
  els.rewardReveal.hidden = true;
  els.resultCollectionButton.hidden = true;
  els.resultDialog.classList.remove("has-reward");
  els.rewardReveal.removeAttribute("data-tier");
  els.rewardStickerArt.removeAttribute("data-reveal");
  els.independentBadge.hidden = true;
  stopStickerAnimation(els.rewardStickerArt, els.rewardStickerStars);
}

function renderStars(container, level, highlightedLevel = 0) {
  container.replaceChildren();
  container.setAttribute("aria-label", level ? `${level} 星贴纸` : "新贴纸");
  container.dataset.level = String(level);

  for (let index = 1; index <= 3; index += 1) {
    const star = document.createElement("span");
    star.className = "sticker-star";
    star.classList.toggle("is-filled", index <= level);
    star.classList.toggle("is-newly-earned", index === highlightedLevel);
    star.textContent = "★";
    star.setAttribute("aria-hidden", "true");
    container.append(star);
  }
}

function playRewardRevealAnimation() {
  restartStickerAnimation(els.rewardStickerArt, els.rewardStickerStars);
}

function restartStickerAnimation(art, stars) {
  stopStickerAnimation(art, stars);
  void art.offsetWidth;
  art.classList.add("is-animating");
  stars.classList.add("is-animating");
}

function stopStickerAnimation(art, stars) {
  art.classList.remove("is-animating");
  stars.classList.remove("is-animating");
}

function applyStickerTheme(element, sticker, level = 0) {
  element.style.setProperty("--sticker-a", sticker.colors[0]);
  element.style.setProperty("--sticker-b", sticker.colors[1]);
  element.style.setProperty("--sticker-ink", sticker.ink);
  element.dataset.tier = String(sticker.tier);
  element.dataset.level = String(level);
  element.classList.toggle("has-sprite", Boolean(sticker.spritePosition));
}

function renderStickerGraphic(element, sticker) {
  element.className = sticker.spritePosition ? "sticker-sprite" : "sticker-symbol";
  element.textContent = sticker.spritePosition ? "" : sticker.symbol;
  element.style.removeProperty("--sprite-position");
  element.style.removeProperty("--sprite-image");

  if (sticker.spritePosition) {
    element.style.setProperty("--sprite-position", sticker.spritePosition);
    element.style.setProperty("--sprite-image", `url('${sticker.spriteImage}')`);
  }
}

function openCollection() {
  renderCollection();
  if (typeof els.collectionDialog.showModal === "function") {
    els.collectionDialog.showModal();
  } else {
    els.collectionDialog.setAttribute("open", "");
  }
}

function closeCollection() {
  if (typeof els.collectionDialog.close === "function") {
    els.collectionDialog.close();
  } else {
    els.collectionDialog.removeAttribute("open");
  }
}

function renderCollection() {
  updateCollectionSummary();
  const fragment = document.createDocumentFragment();

  Object.keys(REWARD_TIER_INFO).forEach((tierKey) => {
    const tier = Number(tierKey);
    const info = REWARD_TIER_INFO[tier];
    const section = document.createElement("section");
    section.className = "collection-tier";

    const header = document.createElement("header");
    header.className = "collection-tier-header";
    const titleWrap = document.createElement("div");
    const badge = document.createElement("span");
    badge.className = "tier-badge";
    badge.textContent = info.shortName;
    const title = document.createElement("h3");
    title.textContent = info.name;
    const description = document.createElement("p");
    description.textContent = info.description;
    titleWrap.append(title, description);
    header.append(badge, titleWrap);

    const grid = document.createElement("div");
    grid.className = "sticker-grid";
    STICKER_CATALOG.filter((sticker) => sticker.tier === tier).forEach((sticker) => {
      grid.append(createStickerCard(sticker));
    });

    section.append(header, grid);
    fragment.append(section);
  });

  els.collectionContent.replaceChildren(fragment);
}

function createStickerCard(sticker) {
  const entry = rewardCollection.stickers[sticker.id];
  const count = entry?.count ?? 0;
  const level = getStickerLevel(count);
  const card = document.createElement(count ? "button" : "article");
  card.className = "sticker-card";
  card.classList.toggle("is-locked", count === 0);
  card.classList.toggle("is-unlocked", count > 0);

  if (count) {
    card.type = "button";
    card.setAttribute("aria-label", `放大查看${sticker.name}，已收集${count}次`);
    card.addEventListener("click", () => openStickerPreview(sticker, count, level));
  }

  const art = document.createElement("div");
  art.className = "sticker-art sticker-card-art";
  applyStickerTheme(art, sticker, level);

  const symbol = document.createElement("span");
  if (count) {
    renderStickerGraphic(symbol, sticker);
  } else {
    symbol.className = "sticker-symbol";
    symbol.textContent = "✦";
  }
  symbol.setAttribute("aria-hidden", "true");
  const levelDecor = document.createElement("span");
  levelDecor.className = "sticker-level-decor";
  levelDecor.setAttribute("aria-hidden", "true");
  art.append(symbol, levelDecor);

  const copy = document.createElement("div");
  copy.className = "sticker-card-copy";
  const name = document.createElement("h4");
  name.textContent = count ? sticker.name : "还未发现";
  const stars = document.createElement("div");
  stars.className = "sticker-stars sticker-card-stars";
  renderStars(stars, level);
  const quantity = document.createElement("span");
  quantity.className = "sticker-quantity";
  quantity.textContent = count ? `收集 ×${count}` : "完成对应难度来寻找";
  copy.append(name, stars, quantity);
  card.append(art, copy);
  return card;
}

function openStickerPreview(sticker, count, level) {
  stickerPreviewState = {
    sticker,
    count,
    maxLevel: level,
    displayedLevel: level,
  };
  els.stickerPreviewTier.textContent = `${REWARD_TIER_INFO[sticker.tier].shortName} · ${REWARD_TIER_INFO[sticker.tier].name}`;
  els.stickerPreviewName.textContent = sticker.name;
  renderStickerPreviewLevel(level);

  if (typeof els.stickerPreviewDialog.showModal === "function") {
    els.stickerPreviewDialog.showModal();
  } else {
    els.stickerPreviewDialog.setAttribute("open", "");
  }

  restartStickerAnimation(els.stickerPreviewArt, els.stickerPreviewStars);
}

function changeStickerPreviewLevel(direction) {
  if (!stickerPreviewState) {
    return;
  }

  const nextLevel = Math.min(
    stickerPreviewState.maxLevel,
    Math.max(0, stickerPreviewState.displayedLevel + direction)
  );

  if (nextLevel === stickerPreviewState.displayedLevel) {
    return;
  }

  renderStickerPreviewLevel(nextLevel, true);
}

function renderStickerPreviewLevel(level, animate = false) {
  if (!stickerPreviewState) {
    return;
  }

  const { sticker, count, maxLevel } = stickerPreviewState;
  const displayedLevel = Math.min(maxLevel, Math.max(0, level));
  stickerPreviewState.displayedLevel = displayedLevel;

  applyStickerTheme(els.stickerPreviewArt, sticker, displayedLevel);
  renderStickerGraphic(els.stickerPreviewSymbol, sticker);
  renderStars(els.stickerPreviewStars, displayedLevel);
  els.stickerPreviewLevelLabel.textContent = STICKER_LEVEL_INFO[displayedLevel].label;
  els.stickerPreviewCount.textContent = displayedLevel === maxLevel
    ? `当前收藏形态 · 已收集 ${count} 次`
    : `形态回顾 ${displayedLevel + 1}/${maxLevel + 1} · 最高已达到 ${STICKER_LEVEL_INFO[maxLevel].shortLabel}`;

  els.previousStickerLevelButton.hidden = maxLevel === 0;
  els.nextStickerLevelButton.hidden = maxLevel === 0;
  els.previousStickerLevelButton.disabled = displayedLevel === 0;
  els.nextStickerLevelButton.disabled = displayedLevel === maxLevel;
  els.previousStickerLevelButton.setAttribute(
    "aria-label",
    displayedLevel > 0 ? `查看${STICKER_LEVEL_INFO[displayedLevel - 1].label}` : "已经是最初形态"
  );
  els.nextStickerLevelButton.setAttribute(
    "aria-label",
    displayedLevel < maxLevel ? `查看${STICKER_LEVEL_INFO[displayedLevel + 1].label}` : "已经是当前最高形态"
  );
  renderStickerPreviewLevelDots(maxLevel, displayedLevel);

  if (animate) {
    restartStickerAnimation(els.stickerPreviewArt, els.stickerPreviewStars);
  }
}

function renderStickerPreviewLevelDots(maxLevel, displayedLevel) {
  const fragment = document.createDocumentFragment();

  for (let level = 0; level <= maxLevel; level += 1) {
    const dot = document.createElement("span");
    dot.className = "sticker-preview-level-dot";
    dot.classList.toggle("is-active", level === displayedLevel);
    dot.classList.toggle("is-reached", level <= maxLevel);
    dot.title = STICKER_LEVEL_INFO[level].label;
    fragment.append(dot);
  }

  els.stickerPreviewLevelDots.replaceChildren(fragment);
  els.stickerPreviewLevelDots.setAttribute("aria-label", `正在查看第 ${displayedLevel + 1} 个形态，共 ${maxLevel + 1} 个`);
}

function closeStickerPreview() {
  stopStickerAnimation(els.stickerPreviewArt, els.stickerPreviewStars);
  if (typeof els.stickerPreviewDialog.close === "function") {
    els.stickerPreviewDialog.close();
  } else {
    els.stickerPreviewDialog.removeAttribute("open");
  }
  stickerPreviewState = null;
}
