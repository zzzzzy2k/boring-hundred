/* ============================================================================
   小事杂货铺 —— Service Worker
   策略：预缓存全部静态资源，断网可完整使用。
   数据本身存在 localStorage，不经过这里，所以不需要处理数据同步。
   ============================================================================ */

var VERSION = 'boring-hundred-v3';
var CACHE = VERSION;

var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon-32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      // 单个资源失败不该让整次安装挂掉
      .then(function (c) { return Promise.allSettled(ASSETS.map(function (u) { return c.add(u); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;

  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // 外链（如 GitHub）不拦

  // 页面导航：网络优先，失败回缓存，保证更新能及时拿到，
  // 同时断网时也能打开（对这种纯本地工具，可用性优先于新鲜度）
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
          return res;
        })
        .catch(function () {
          return caches.match('./index.html').then(function (r) {
            return r || caches.match('./');
          });
        })
    );
    return;
  }

  // 静态资源：缓存优先，命中就直接用（图标之类不会变）
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});

// 页面里点了「检查更新」时，立刻切到新版本
self.addEventListener('message', function (e) {
  if (e.data === 'skip-waiting') self.skipWaiting();
});