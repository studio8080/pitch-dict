/* =====================================================================
 * ピッチの辞書 — アフィリエイト広告 設定ファイル
 * =====================================================================
 * このファイルだけ編集すれば、トップ(index.html)・用語モーダル・全用語ページ(terms/)の
 * 広告枠がまとめて切り替わります。HTMLの再生成（build-pages.js）は不要です。
 *
 * ▼ 現在の提携状況（2026-09-04 時点）
 *   もしもアフィリエイト … メディア「ピッチの辞書」(ID 687480) 登録済み
 *     ・WOWOW                提携中（成果 1,269円 / 有料申込完了）
 *     ・スカパー！            提携中（成果 3,909円 / 本登録）
 *     ・楽天市場の商品購入     提携中（成果 2% / どこでもリンクで任意ページへ）
 *   A8.net … 副サイト「ピッチの辞書【アピールサイト】」(websiteId 007) 登録済み
 *     ・ABEMAプレミアム          提携中（成果 902円 / 新規会員登録）
 *     ・スーパースポーツゼビオ    提携中（成果 購入6.5%）
 *     ・チケットジャム           提携申請中（審査待ち）
 *     ※ 広告リンクを取り直すときは、掲載サイトに必ず「ピッチの辞書【アピールサイト】」を選ぶ。
 *        他サイト用に発行したリンクをこのサイトに貼るのは規約違反になるので絶対にしない。
 *
 * ▼ item の書き方（2種類）
 *   A) kind:"card"  … サイトのデザインに合わせたカード型
 *        url … アフィリエイトのクリック計測リンク
 *        imp … インプレッション計測用の1x1画像のsrc（任意。無ければ省略可）
 *   B) kind:"html"  … もしも「かんたんリンク」やA8のバナーなど、発行されたHTMLをそのまま貼る
 *        html の値はバッククォート `…` で囲むと、内部の " や ' をエスケープせずに済みます。
 *        ※ <script> を含む広告素材は index.html の CSP（script-src）に載っていないと動きません。
 *           script不要の素材を選んでください。画像ドメインは img-src への追加が必要です。
 *
 * ▼ 表示先の絞り込み（任意）
 *   cats:["live","column"]  … 用語カテゴリ（live/column/data/rule）が一致するページ・モーダルのみ
 *   terms:["derby","xg"]    … 特定の用語のみ
 *   slots:["home","term"]   … home=トップ＆一覧, term=用語ページ, modal=用語モーダル（省略時は全枠）
 *   langs:["ja","en"]       … 表示する言語。**省略時は ["ja"]（日本語ページのみ）**。
 *                             英語ページ(/en/)は世界中から読まれるため、日本国内限定の
 *                             サービスを出しても成約せず体験も損なう。海外でも申し込める
 *                             広告主と提携できたら langs に "en" を足すこと。
 *   contextPriority:10       … 用語ページ・モーダルでの掲載優先度（省略時0）。
 *                             内容に直接関連する広告を優先。トップの順序には影響しない。
 *
 * ▼ 法令対応（2023年10月〜 景品表示法ステマ規制）
 *   広告枠には自動で「PR」表記と disclosure の文言が付きます。消さないでください。
 *   リンクには自動で rel="nofollow sponsored noopener" が付きます。
 * ===================================================================== */

/* もしも「どこでもリンク」（楽天市場・提携中）で任意の楽天ページへ飛ばすためのヘルパー。
   楽天の検索結果ページに飛ばすので、個別商品と違って品切れで無効にならない。 */
var PD_RAKUTEN_CLICK = "https://af.moshimo.com/af/c/click?a_id=5791139&p_id=54&pc_id=54&pl_id=616&url=";
var PD_RAKUTEN_IMP = "https://i.moshimo.com/af/i/impression?a_id=5791139&p_id=54&pc_id=54&pl_id=616";
function pdRakutenSearch(words) {
  return PD_RAKUTEN_CLICK + encodeURIComponent("https://search.rakuten.co.jp/search/mall/" + encodeURIComponent(words) + "/");
}

window.PD_AFF = {
  /* 枠の見出し（slot ごと） */
  titles: {
    home: "⚽ サッカー観戦をもっと楽しむ",
    term: "⚽ この用語を「実際の試合」で確かめる",
    modal: "⚽ 観戦をもっと楽しむ",
  },
  contextTitles: {
    column: "⚽ 戦術をもっと深く知る",
    data: "⚽ サッカーのデータをもっと詳しく",
    rule: "⚽ 判定やルールをもっと詳しく",
  },
  /* 枠の下に出る注記（ステマ規制対応。文言の変更は可、削除は不可） */
  disclosure: "※ アフィリエイト広告（PR）を含みます。リンク先での申込・購入により当サイトに報酬が支払われることがあります。",
  /* 1枠に出す最大件数。トップは横並びのグリッドが折り返すので多めでも崩れない */
  max: { home: 6, term: 3, modal: 2 },

  items: [
    /* ---------- もしもアフィリエイト（提携済み） ---------- */
    {
      enabled: true, kind: "card",
      provider: "moshimo", advertiserId: "wowow",
      badge: "UEFAチャンピオンズリーグ",
      title: "WOWOW（ワウワウ）",
      desc: "チャンピオンズリーグやヨーロッパリーグを配信。実況で飛び交う戦術用語を、その場の映像で確かめられる。",
      btn: "WOWOWを見る",
      url: "https://af.moshimo.com/af/c/click?a_id=5791141&p_id=5300&pc_id=14446&pl_id=69351",
      imp: "https://i.moshimo.com/af/i/impression?a_id=5791141&p_id=5300&pc_id=14446&pl_id=69351",
      cats: ["live", "column", "data"],
    },
    {
      enabled: true, kind: "card",
      provider: "moshimo", advertiserId: "skyperfectv",
      badge: "海外サッカー・代表戦",
      title: "スカパー！",
      desc: "海外サッカーや日本代表戦を放送。試合を観ながら用語の意味を確かめたい人へ。",
      btn: "スカパー！を見る",
      url: "https://af.moshimo.com/af/c/click?a_id=5791142&p_id=1080&pc_id=1564&pl_id=16147",
      imp: "https://i.moshimo.com/af/i/impression?a_id=5791142&p_id=1080&pc_id=1564&pl_id=16147",
      cats: ["live", "column", "rule"],
    },
    {
      enabled: true, kind: "card",
      provider: "moshimo", advertiserId: "rakuten_tactics_books",
      badge: "楽天市場",
      title: "サッカー戦術の本",
      contextPriority: 10,
      desc: "ハーフスペースやポジショナルプレーをもっと深く。戦術・分析の書籍を楽天で探せます。",
      btn: "戦術本を探す",
      url: pdRakutenSearch("サッカー 戦術 本"),
      imp: PD_RAKUTEN_IMP,
      slots: ["term", "modal"], cats: ["column"],
    },
    {
      enabled: true, kind: "card",
      provider: "moshimo", advertiserId: "rakuten_data_books",
      badge: "楽天市場",
      title: "サッカーのデータ分析本",
      contextPriority: 10,
      desc: "xG・PPDAなどのスタッツをもっと知りたい人へ。データ分析の書籍を楽天で探せます。",
      btn: "データ分析本を探す",
      url: pdRakutenSearch("サッカー データ 分析 本"),
      imp: PD_RAKUTEN_IMP,
      slots: ["term", "modal"], cats: ["data"],
    },
    {
      enabled: true, kind: "card",
      provider: "moshimo", advertiserId: "rakuten_rules_books",
      badge: "楽天市場",
      title: "サッカー競技規則の本",
      contextPriority: 10,
      desc: "オフサイド・DOGSO・VARの判定基準を原典で。競技規則やレフェリングの本を楽天で探せます。",
      btn: "ルールの本を探す",
      url: pdRakutenSearch("サッカー 競技規則"),
      imp: PD_RAKUTEN_IMP,
      slots: ["term", "modal"], cats: ["rule"],
    },
    {
      enabled: true, kind: "card",
      provider: "moshimo", advertiserId: "rakuten_fan_goods",
      badge: "楽天市場",
      title: "観戦グッズ・サッカーボール",
      desc: "スタジアム観戦のおともに。マフラータオル、ユニフォーム、ボールなど。",
      btn: "観戦グッズを見る",
      url: pdRakutenSearch("サッカー 観戦 グッズ"),
      imp: PD_RAKUTEN_IMP,
      slots: ["home"],
    },

    /* ---------- A8.net（提携済み） ----------
       サイト登録名は「ピッチの辞書【アピールサイト】」(websiteId 007)。
       リンクを取り直すときは、必ず掲載サイトにこれを選ぶこと。 */
    {
      enabled: true, kind: "card",
      provider: "a8", advertiserId: "abema_premium",
      badge: "日本代表戦・海外サッカー",
      title: "ABEMAプレミアム",
      desc: "サッカー中継やオリジナル番組が見放題。試合を観ながら用語の意味を確かめたい人へ。",
      btn: "ABEMAを見る",
      url: "https://px.a8.net/svt/ejp?a8mat=4BC36O+8SQR8I+4EKC+5YRHE",
      imp: "https://www12.a8.net/0.gif?a8mat=4BC36O+8SQR8I+4EKC+5YRHE",
      cats: ["live", "column", "data"],
    },
    {
      enabled: true, kind: "card",
      provider: "a8", advertiserId: "xebio",
      badge: "スーパースポーツゼビオ",
      title: "サッカー用品・スパイク",
      desc: "スパイク、ボール、ウェアまで。自分でプレーする人にも、観戦グッズを探す人にも。",
      btn: "サッカー用品を見る",
      url: "https://px.a8.net/svt/ejp?a8mat=4BC36O+8WBCV6+4ABU+5YRHE",
      imp: "https://www14.a8.net/0.gif?a8mat=4BC36O+8WBCV6+4ABU+5YRHE",
      slots: ["home"],
    },

    /* ---------- 審査待ち・未提携 ----------
       承認されたら enabled を true にして url / imp を貼る。
       ・チケットジャム（A8 / s00000025165001）… 2026-09-04 提携申請済み。審査待ち
       ・DAZN と U-NEXT は A8・もしものどちらにも掲載が無い（2026-09-04 時点）。
         直接提携かバリューコマース等、別ASPを当たる必要がある。 */
    {
      /* もしも「かんたんリンク」で作った商品カードのHTMLを html に貼る（バッククォートの中） */
      enabled: false, kind: "html", slots: ["home", "term"],
      html: ``,
    },
  ],
};

/* ---------------- 描画（ここから下は編集不要） ---------------- */
(function () {
  "use strict";
  var A = window.PD_AFF;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pick(slot, ctx) {
    var eligible = A.items.filter(function (it) {
      if (!it.enabled) return false;
      if (it.kind === "card" && !it.url) return false;
      if (it.kind === "html" && !(it.html && it.html.trim())) return false;
      /* 言語で出し分ける。langs 未指定なら日本語ページのみ（既存の広告主はすべて日本国内向け）。
         英語ページに日本限定のサービスを出しても成約しないうえ、読者の体験を損なう。 */
      var langs = it.langs || ["ja"];
      if (langs.indexOf(ctx.lang) < 0) return false;
      if (it.slots && it.slots.indexOf(slot) < 0) return false;
      if (slot !== "home" && it.cats && ctx.cat && it.cats.indexOf(ctx.cat) < 0) return false;
      if (slot !== "home" && it.terms && ctx.term && it.terms.indexOf(ctx.term) < 0) return false;
      return true;
    });
    /* 絞り込み後、件数で切る前に優先度を適用する。
       戦術モーダルは2枠なので、従来の固定順では戦術本が一度も掲載されなかった。
       同順位は設定順を維持し、トップの並びと掲載件数は変えない。 */
    if (slot !== "home") {
      eligible = eligible.map(function (it, index) { return { item: it, index: index }; })
        .sort(function (a, b) {
          return (Number(b.item.contextPriority) || 0) - (Number(a.item.contextPriority) || 0) || a.index - b.index;
        }).map(function (entry) { return entry.item; });
    }
    return eligible.slice(0, (A.max && A.max[slot]) || 3);
  }
  function placement(slot, ctx) {
    return slot + (ctx.cat ? "_" + ctx.cat : "_general");
  }
  function cardHTML(it, slot, ctx) {
    return '<a class="affcard" href="' + esc(it.url) + '" target="_blank" rel="nofollow sponsored noopener" referrerpolicy="no-referrer-when-downgrade"'
      + ' data-aff-provider="' + esc(it.provider || "unknown") + '"'
      + ' data-aff-advertiser="' + esc(it.advertiserId || "unknown") + '"'
      + ' data-aff-placement="' + esc(placement(slot, ctx)) + '">'
      + (it.badge ? '<span class="affbadge">' + esc(it.badge) + "</span>" : "")
      + "<b>" + esc(it.title) + "</b>"
      + (it.desc ? "<p>" + esc(it.desc) + "</p>" : "")
      + '<span class="affbtn">' + esc(it.btn || "詳しく見る") + " →</span></a>";
  }
  function impHTML(it) {
    /* インプレッション計測用の1x1画像。
       loading="lazy" を付けてはいけない：この画像は0x0の隠しコンテナに入るため、
       遅延読み込みだとビューポートに入らず永久に読み込まれず、表示回数が計上されない。 */
    return it.imp ? '<img src="' + esc(it.imp) + '" width="1" height="1" alt="" style="border:none">' : "";
  }
  function analyticsAllowed() {
    var nav = typeof navigator !== "undefined" ? navigator : {};
    var dnt = nav.doNotTrack || (typeof window !== "undefined" && window.doNotTrack) || nav.msDoNotTrack;
    return dnt !== "1" && dnt !== "yes" && nav.globalPrivacyControl !== true
      && typeof window.gtag === "function";
  }
  function eventParams(link, action) {
    return {
      provider: link.getAttribute("data-aff-provider") || "unknown",
      advertiser_id: link.getAttribute("data-aff-advertiser") || "unknown",
      placement: link.getAttribute("data-aff-placement") || "unknown",
      action: action,
    };
  }
  function sendAffiliateEvent(name, link, action) {
    if (!analyticsAllowed()) return;
    try { window.gtag("event", name, eventParams(link, action)); } catch (_) {}
  }
  function bindMeasurement(root) {
    if (!root || typeof root.querySelectorAll !== "function" || !analyticsAllowed()) return;
    var links = root.querySelectorAll(".affcard[data-aff-advertiser]");
    Array.prototype.forEach.call(links, function (link) {
      if (link.getAttribute("data-aff-measured")) return;
      link.setAttribute("data-aff-measured", "1");
      link.addEventListener("click", function () {
        sendAffiliateEvent("affiliate_click", link, "click");
      }, { passive: true });
    });
    if (typeof IntersectionObserver !== "function") return;
    var timers = typeof WeakMap === "function" ? new WeakMap() : null;
    var seen = typeof WeakSet === "function" ? new WeakSet() : null;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = entry.target;
        if (seen && seen.has(link)) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (timers && timers.has(link)) return;
          var timer = setTimeout(function () {
            if (seen) seen.add(link);
            if (timers) timers.delete(link);
            observer.unobserve(link);
            sendAffiliateEvent("affiliate_view", link, "view");
          }, 1000);
          if (timers) timers.set(link, timer);
        } else if (timers && timers.has(link)) {
          clearTimeout(timers.get(link));
          timers.delete(link);
        }
      });
    }, { threshold: [0, 0.5] });
    Array.prototype.forEach.call(links, function (link) { observer.observe(link); });
  }
  function render(root) {
    var nodes = (root || document).querySelectorAll("[data-aff]");
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.getAttribute("data-aff-done")) return;
      var slot = el.getAttribute("data-aff");
      var ctx = {
        term: el.getAttribute("data-term") || "",
        cat: el.getAttribute("data-cat") || "",
        lang: el.getAttribute("data-lang") || "ja",
      };
      var items = pick(slot, ctx);
      if (!items.length) { el.hidden = true; return; }
      var cards = items.filter(function (i) { return i.kind !== "html"; });
      var raws = items.filter(function (i) { return i.kind === "html"; });
      var title = (slot !== "home" && A.contextTitles && A.contextTitles[ctx.cat]) || (A.titles && A.titles[slot]) || "おすすめ";
      var h = '<div class="affbox"><div class="afft"><span class="affpr">PR</span>' + esc(title) + "</div>";
      if (cards.length) h += '<div class="affgrid">' + cards.map(function (it) { return cardHTML(it, slot, ctx); }).join("") + "</div>";
      if (raws.length) h += '<div class="affraw"' + (cards.length ? ' style="margin-top:10px"' : "") + ">" + raws.map(function (i) { return "<div>" + i.html + "</div>"; }).join("") + "</div>";
      if (A.disclosure) h += '<p class="affnote">' + esc(A.disclosure) + "</p>";
      /* インプレッション計測用の1x1画像は枠の外（見えない位置）にまとめる */
      h += '<div style="position:absolute;width:0;height:0;overflow:hidden">' + cards.map(impHTML).join("") + "</div>";
      h += "</div>";
      el.innerHTML = h;
      el.hidden = false;
      el.setAttribute("data-aff-done", "1");
      bindMeasurement(el);
    });
  }
  window.PD_AFF_render = render;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { render(); });
  else render();
})();
