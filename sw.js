/* ピッチの辞書 Service Worker
 *
 * キャッシュ戦略（3種類）
 *   HTML            … network-first          更新を確実に取得。オフライン時のみキャッシュ
 *   JS / CSS / JSON … stale-while-revalidate 表示は即座、裏で更新して次回に反映
 *   画像・その他     … cache-first            めったに変わらないので速度優先
 *
 * ── 2026-09-04 に踏んだ罠（3つとも実際に起きた。順に直した）────────────────
 *
 * ⚠️ 1. JS・CSSを cache-first にしてはいけない。
 *    affiliates.js（広告設定）を直しても、再訪問者に永久に古い版が配信される。
 *
 * ⚠️ 2. 裏での再取得は必ず event.waitUntil() に渡すこと。
 *    respondWith がキャッシュで即座に解決すると、ブラウザはSWを終了してよいと判断し、
 *    裏の fetch と cache.put が完了前に打ち切られてキャッシュが更新されない。
 *    waitUntil はイベントハンドラ内で同期的に呼ぶ（.then の中だと InvalidStateError）。
 *
 * ⚠️ 3. サーバへ取りに行く fetch にはすべて cache:"no-cache" を付けること（HTMLも含む）。
 *    GitHub Pages は静的ファイルに Cache-Control: max-age=600 を返す。
 *    素の fetch はブラウザHTTPキャッシュを経由するため、SWは「取り直したつもりで
 *    10分前の古い応答」をキャッシュに書き戻してしまう。no-cache ならETagで
 *    サーバに問い合わせ、変わっていなければ304で安く済み、変わっていれば新版が入る。
 *
 * ⚠️ ASSETS に載せたファイルを増減したら CACHE のバージョンを上げること。
 */
const CACHE = "pitch-v9";
const ASSETS = [
  "/", "/index.html", "/mascotc.webp", "/icon.svg",
  "/icon-512.png", "/manifest.json", "/og-v2.png",
  "/terms.css", "/affiliates.js", "/ask-chatgpt.js?v=1", "/terms/", "/404.html",
  "/en/", "/en/terms/"
];

/* ブラウザHTTPキャッシュを飛ばして取り直す（罠3への対処） */
function fetchFresh(request) {
  const url = typeof request === "string" ? request : request.url;
  return fetch(url, { cache: "no-cache", credentials: "same-origin" });
}

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      // 1ファイルでも失敗するとインストール全体が落ちるので個別に入れる
      .then(c => Promise.all(ASSETS.map(u =>
        fetchFresh(u).then(r => (r && r.ok) ? c.put(u, r) : null).catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 広告・計測など外部は素通し

  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isHTML) {
    // network-first。ここも fetchFresh を使う（罠3）。素の fetch だとブラウザHTTPキャッシュが
    // max-age=600 の古いHTMLを返し、「network-first のはずなのに更新が10分届かない」ことになる。
    e.respondWith(
      fetchFresh(req)
        .then(r => {
          if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
          return r;
        })
        .catch(() => caches.match(req).then(m => m || caches.match("/index.html")))
    );
    return;
  }

  const isCode = /\.(js|css|json|xml)$/i.test(url.pathname);
  if (isCode) {
    // stale-while-revalidate：キャッシュを即返しつつ、裏で必ず取り直す
    const net = fetchFresh(req).then(r => {
      if (r && r.ok) {
        const cp = r.clone();
        return caches.open(CACHE).then(c => c.put(req, cp)).then(() => r);
      }
      return r;
    }).catch(() => null);
    e.waitUntil(net);
    e.respondWith(
      caches.match(req).then(cached => cached || net.then(r => r || fetch(req)))
    );
    return;
  }

  // 画像・フォントなど：cache-first
  e.respondWith(
    caches.match(req).then(m => m || fetch(req).then(r => {
      if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return r;
    }).catch(() => m))
  );
});
