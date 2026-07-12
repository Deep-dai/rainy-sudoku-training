const REWARD_STORAGE_KEY = "rainy-sudoku-rewards-v1";
const REWARD_STORAGE_VERSION = 1;

const REWARD_TIER_INFO = {
  1: { name: "小贴纸", shortName: "1级", description: "快乐的小小收藏" },
  2: { name: "可爱动物", shortName: "2级", description: "认识新的动物朋友" },
  3: { name: "闪亮动物", shortName: "3级", description: "会发光的动物伙伴" },
  4: { name: "炫彩动物", shortName: "4级", description: "珍贵的炫彩收藏" },
  5: { name: "超级珍藏", shortName: "5级", description: "最特别的传奇朋友" },
};

const REWARD_DIFFICULTY_MAP = {
  "6:super": 1,
  "6:very": 1,
  "6:easy": 2,
  "6:expert": 3,
  "9:super": 2,
  "9:very": 3,
  "9:expert": 4,
  "9:master": 5,
};

const STICKER_CATALOG = [
  { id: "sunny-star", tier: 1, name: "晴天星星", symbol: "⭐", colors: ["#ffe57a", "#ff9d72"], ink: "#704500" },
  { id: "rainbow-bridge", tier: 1, name: "彩虹桥", symbol: "🌈", colors: ["#9de7dc", "#ffc4df"], ink: "#275b66" },
  { id: "berry-smile", tier: 1, name: "草莓甜心", symbol: "🍓", colors: ["#ffb4b0", "#fff0a8"], ink: "#7b2743" },
  { id: "rainy-umbrella", tier: 1, name: "Rainy 小雨伞", symbol: "☂️", colors: ["#b8c9f2", "#eed0f5"], ink: "#453a79" },
  { id: "bounce-bunny", tier: 2, name: "蹦蹦兔", symbol: "🐰", colors: ["#ffd7e8", "#fff2b5"], ink: "#7a3e62" },
  { id: "marmalade-cat", tier: 2, name: "橘子猫", symbol: "🐱", colors: ["#ffc594", "#ffe7ae"], ink: "#74431f" },
  { id: "sunny-duck", tier: 2, name: "太阳小鸭", symbol: "🐥", colors: ["#fff07a", "#bdebd1"], ink: "#5a551f" },
  { id: "ice-penguin", tier: 2, name: "冰川企鹅", symbol: "🐧", colors: ["#adddf4", "#d9d3f5"], ink: "#244b68" },
  { id: "forest-fox", tier: 3, name: "森林狐狸", symbol: "🦊", colors: ["#ffad78", "#c9e7a5"], ink: "#6f321c" },
  { id: "bamboo-panda", tier: 3, name: "竹林熊猫", symbol: "🐼", colors: ["#bfe0bd", "#f6d8e7"], ink: "#294f3b" },
  { id: "ocean-dolphin", tier: 3, name: "浪花海豚", symbol: "🐬", colors: ["#8cddea", "#b9c8f4"], ink: "#1c5c75" },
  { id: "night-owl", tier: 3, name: "月光猫头鹰", symbol: "🦉", colors: ["#c7b5ec", "#ffd68c"], ink: "#513f78" },
  { id: "sun-tiger", tier: 4, name: "太阳虎", symbol: "🐯", colors: ["#ffab69", "#ffd65c"], ink: "#723913" },
  { id: "blue-whale", tier: 4, name: "蓝宝石鲸", symbol: "🐋", colors: ["#72d5e8", "#8caef2"], ink: "#164e78" },
  { id: "jewel-peacock", tier: 4, name: "宝石孔雀", symbol: "🦚", colors: ["#6ed6b6", "#b18be8"], ink: "#245d54" },
  { id: "snow-leopard", tier: 4, name: "雪山豹", symbol: "🐆", colors: ["#d2d9e8", "#f7c5a4"], ink: "#455064" },
  { id: "golden-lion", tier: 5, name: "日曜虎王", symbol: "🐯", spritePosition: "0% 0%", colors: ["#ffd65a", "#ff8c75"], ink: "#6c3d00" },
  { id: "aurora-deer", tier: 5, name: "星海鲸王", symbol: "🐋", spritePosition: "100% 0%", colors: ["#73d7ef", "#8b9ff3"], ink: "#174f7a" },
  { id: "cosmic-whale", tier: 5, name: "极光孔雀", symbol: "🦚", spritePosition: "0% 100%", colors: ["#65d8ad", "#a67de8"], ink: "#205d53" },
  { id: "rainbow-unicorn", tier: 5, name: "钻石雪豹", symbol: "🐆", spritePosition: "100% 100%", colors: ["#d1d8ea", "#f2acd8"], ink: "#3e4b68" },
];

let rewardCollection = createEmptyRewardCollection();

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

  const tier = getRewardTier(state.size, state.difficulty);
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
  const { sticker, tier, count, level, isNew, independent } = reward;
  els.rewardReveal.hidden = false;
  els.rewardReveal.dataset.tier = String(tier);
  els.resultCollectionButton.hidden = false;
  els.resultDialog.classList.add("has-reward");
  applyStickerTheme(els.rewardStickerArt, sticker, level);
  renderStickerGraphic(els.rewardStickerSymbol, sticker);
  els.rewardTierLabel.textContent = `${REWARD_TIER_INFO[tier].shortName} · ${REWARD_TIER_INFO[tier].name}`;
  els.rewardStickerName.textContent = sticker.name;
  renderStars(els.rewardStickerStars, level);
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
  els.independentBadge.hidden = true;
}

function renderStars(container, level) {
  container.replaceChildren();
  container.setAttribute("aria-label", level ? `${level} 星贴纸` : "新贴纸");

  for (let index = 1; index <= 3; index += 1) {
    const star = document.createElement("span");
    star.className = "sticker-star";
    star.classList.toggle("is-filled", index <= level);
    star.textContent = "★";
    star.setAttribute("aria-hidden", "true");
    container.append(star);
  }
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
    element.style.setProperty("--sprite-image", "url('./assets/stickers/tier-5-legendary.svg')");
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
  const card = document.createElement("article");
  card.className = "sticker-card";
  card.classList.toggle("is-locked", count === 0);

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
  art.append(symbol);

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
