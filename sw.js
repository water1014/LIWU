/* 离线壳：静态资源 stale-while-revalidate，页面导航失败时回退 index */
const CACHE = 'liwu-v8';
const SHELL = [
  './', './index.html',
  './assets/css/01-tokens.css', './assets/css/02-shell.css', './assets/css/03-chat.css',
  './assets/css/04-apps.css', './assets/css/05-life.css', './assets/css/06-parts.css', './assets/css/07-us.css',
  './assets/css/09-fix.css', './assets/css/10-look.css', './assets/css/11-polish.css',
  './assets/js/10-icons.js', './assets/js/11-db.js', './assets/js/12-core.js',
  './assets/js/13-api.js', './assets/js/14-ui.js', './assets/js/20-home.js',
  './assets/js/21-chat.js', './assets/js/30-wb-mem.js', './assets/js/31-archive-store.js',
  './assets/js/32-beauty-settings.js', './assets/js/33-life.js', './assets/js/34-stickers.js', './assets/js/35-us.js',
  './assets/js/40-main.js', './assets/img/wall-window.jpg', './assets/img/wall-curtain.jpg', './assets/img/wall-fog.jpg', './vendor/vue.global.prod.js', './manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;

  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(
    caches.match(r).then((hit) => {
      const net = fetch(r).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(r, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
