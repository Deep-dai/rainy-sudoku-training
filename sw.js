const CACHE_NAME = "rainy-sudoku-v38";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=38",
  "./scripts/app-state.js?v=38",
  "./scripts/app-game.js?v=38",
  "./scripts/app-ui.js?v=38",
  "./scripts/app-rules.js?v=38",
  "./scripts/app-rewards.js?v=38",
  "./scripts/app-evolution.js?v=38",
  "./scripts/app-utils.js?v=38",
  "./assets/stickers/tier-2-cute.jpg",
  "./assets/stickers/tier-3-magic.jpg",
  "./assets/stickers/tier-4-plush.jpg",
  "./assets/stickers/tier-5-friends.jpg",
  "./assets/stickers/tier-4-evo1.png",
  "./assets/stickers/tier-4-evo2.png",
  "./assets/stickers/tier-5-evo1.png",
  "./assets/stickers/tier-5-evo2.png",
  "./manifest.webmanifest",
  "./app-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
  // 不再自动 skipWaiting：新版本先等着，让页面弹出“点这里更新”，由用户决定何时刷新。
});

// 用户点了“更新”按钮后，页面发来这条消息，新版本立刻接管。
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
