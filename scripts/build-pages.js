#!/usr/bin/env node
/**
 * ピッチの辞書 — 静的ページ生成スクリプト（SEO用・日英2言語）
 *
 * index.html（SPA）に埋め込まれた用語データ(TERMS)・英訳(TR_EN)・戦術ボード(VIZ)を読み取り、
 *   日本語
 *     terms/<id>/index.html … 用語ページ 118枚
 *     terms/index.html      … 全用語一覧
 *   英語
 *     en/index.html         … 英語トップ（ランディング）
 *     en/terms/index.html   … 英語の全用語一覧
 *     en/terms/<id>/index.html … 英語の用語ページ 118枚
 *   共通
 *     terms.css             … 上記ページ用CSS（戦術ボードのアニメCSSは index.html から抽出）
 *     sitemap.xml           … 全URL（日英）
 * を生成する。
 *
 * 使い方:  node scripts/build-pages.js
 *   index.html の用語データや戦術ボードを更新したら、必ずこれを実行してからコミットする。
 *   （GitHub Pages はコミット済みファイルをそのまま配信するため、生成物もコミットする）
 *
 * 日英の対応付けは hreflang で明示している。同じ用語の日本語ページと英語ページは
 * 互いに alternate として参照し合う。英訳は118語すべてに存在する（TR_EN）。
 * 戦術ボード内のキャプションも VIZ_TXT により英語に差し替わる。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SITE = "https://pitch.kokokikaku.com";
// index.html は CRLF。抽出・照合はすべて LF に正規化した上で行う
const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/\r\n/g, "\n");

/* ---------- 1) index.html のメインスクリプトを Node 上で評価してデータを取り出す ---------- */
const scriptStart = src.indexOf("<script>\n/* ================= SVG 戦術ボード部品");
if (scriptStart < 0) throw new Error("メインスクリプトの開始位置が見つかりません");
const scriptEnd = src.indexOf("</script>", scriptStart);
const mainJs = src.slice(scriptStart + "<script>".length, scriptEnd);

// DOM / ブラウザAPIをすべて「何をしても壊れないダミー」に置き換える
function makeStub() {
  const fn = function () { return stub; };
  const stub = new Proxy(fn, {
    get(_, k) {
      // Symbol系（Symbol.match 等）を返すと正規表現扱いされて String.includes が落ちるので undefined に
      if (typeof k === "symbol") return k === Symbol.toPrimitive ? () => "" : undefined;
      if (k === "toString" || k === "valueOf") return () => "";
      if (k === "then") return undefined;
      if (k === "length") return 0;
      if (k === "matches") return false;
      return stub;
    },
    set() { return true; },
    apply() { return stub; },
    construct() { return stub; },
    has() { return true; },
  });
  return stub;
}
const stub = makeStub();
const ctx = vm.createContext({
  window: stub, document: stub, navigator: stub, localStorage: stub, history: stub,
  location: { hash: "", pathname: "/", search: "" }, matchMedia: () => ({ matches: false }),
  setTimeout: () => 0, clearTimeout: () => 0, requestAnimationFrame: () => 0,
  prompt: () => "", alert: () => {}, console, gtag: () => {}, dataLayer: [],
  encodeURIComponent, decodeURIComponent, URLSearchParams,
});
vm.runInContext(mainJs, ctx, { filename: "index.html(main)" });
const D = vm.runInContext("({TERMS,CAT,EMOJI,TR_EN,I18N,TREND,VIZ,trViz})", ctx);
const { TERMS, CAT, EMOJI, TR_EN, I18N, TREND, VIZ, trViz } = D;
if (!TERMS || !TERMS.length) throw new Error("TERMS が空です");
const missingEn = TERMS.filter((t) => !TR_EN[t.id] || !TR_EN[t.id].one || !TR_EN[t.id].why);
if (missingEn.length) throw new Error("英訳が欠けている用語: " + missingEn.map((t) => t.id).join(", "));

/* 戦術ボードのSVGを言語別に描く。
   trViz() は index.html 側の変数 lang を見て VIZ_TXT でキャプションを差し替えるので、
   呼び出す前に lang をその言語に設定する。 */
function vizFor(t, lang) {
  if (!VIZ[t.viz]) return "";
  vm.runInContext("lang=" + JSON.stringify(lang), ctx);
  const svg = trViz(VIZ[t.viz]());
  vm.runInContext('lang="ja"', ctx);
  return svg;
}

/* ---------- 2) index.html から戦術ボード用CSSと共有<defs>を抽出 ---------- */
function between(s, a, b, inclusive = true) {
  const i = s.indexOf(a); if (i < 0) throw new Error("not found: " + a);
  const j = s.indexOf(b, i + a.length); if (j < 0) throw new Error("not found: " + b);
  return inclusive ? s.slice(i, j + b.length) : s.slice(i + a.length, j);
}
const vizCss = between(src, ".viz{", ".viz svg{width:100%;height:auto;display:block}");
const animCss = between(src, "/* ---------- SVG anim ---------- */", "@media (prefers-reduced-motion: reduce){", false)
  + "@media (prefers-reduced-motion: reduce){.mv,.mv2,.pulse,.dash,.fadein,.blinkel{animation:none}}\n@keyframes blink{50%{opacity:.25}}\n";
const sharedDefs = between(src, "<!-- 共有グラデーション＆フィルター定義 -->", "</defs></svg>");
const cspMeta = (src.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/) || [""])[0];
const gaId = (src.match(/gtag\/js\?id=([A-Z0-9-]+)/) || [])[1] || "";
const adsClient = (src.match(/adsbygoogle\.js\?client=([a-z0-9-]+)/) || [])[1] || "";

/* ---------- 3) ユーティリティ ---------- */
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const strip = (s) => String(s == null ? "" : s).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
/* 文の単位で n 字に収める。英語の description 用。
   clip() は文字数で機械的に切るので、英語だと "explanation of th…" のように
   単語の途中で終わる。検索結果の説明文が全118ページで途切れていた（2026-09-10 判明）。
   先頭の文は必ず入れ、続く文は丸ごと収まるときだけ足す。 */
const fitSentences = (sentences, n) => {
  const parts = sentences.map((s) => strip(s)).filter(Boolean);
  let out = parts[0] || "";
  if (out.length > n) {
    const cut = out.slice(0, n - 1);
    out = cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)) + "…";
  }
  for (const s of parts.slice(1)) {
    if (out.length + 1 + s.length > n) break;
    out += " " + s;
  }
  return out;
};
const CATS = ["live", "column", "data", "rule"];
const byCat = Object.fromEntries(CATS.map((c) => [c, TERMS.filter((t) => t.cat === c)]));

/* 言語ごとの表記ゆれを1か所にまとめる */
const shortJa = (t) => t.name.split("（")[0].split("／")[0];
const shortEn = (t) => t.en.split("(")[0].split("/")[0].trim();
const nameOf = (t, lang) => (lang === "ja" ? t.name : t.en);
const shortOf = (t, lang) => (lang === "ja" ? shortJa(t) : shortEn(t));
const subOf = (t, lang) => (lang === "ja" ? t.en : t.name);
const oneOf = (t, lang) => strip(lang === "ja" ? t.one : TR_EN[t.id].one);
const catchOf = (t, lang) => (lang === "ja" ? t.catch : TR_EN[t.id].catch);
const whyOf = (t, lang) => (lang === "ja" ? t.why : TR_EN[t.id].why);
const useWhoOf = (t, lang) => (lang === "ja" ? t.use.who : (TR_EN[t.id].who || "In commentary"));
const useTextOf = (t, lang) => (lang === "ja" ? t.use.text : TR_EN[t.id].text);
const catLabel = (cat, lang) => (lang === "ja" ? CAT[cat].label : CAT[cat].labelEn);
const catName = (cat, lang) => strip(catLabel(cat, lang)).replace(/^\S+\s/, "");
const lvlOf = (t, lang) => I18N[lang].lvl[t.lvl];

/* URL設計：日本語はルート直下、英語は /en/ 配下。同じ用語IDを共有する */
const homePath = (lang) => (lang === "ja" ? "/" : "/en/");
const indexPath = (lang) => (lang === "ja" ? "/terms/" : "/en/terms/");
const termPath = (id, lang) => (lang === "ja" ? `/terms/${id}/` : `/en/terms/${id}/`);
const abs = (p) => SITE + p;

const today = new Date().toISOString().slice(0, 10);
let lastmod = today;
try { lastmod = execSync("git log -1 --format=%cs -- index.html", { cwd: ROOT }).toString().trim() || today; } catch (_) {}

/* ---------- 4) 共通ヘッダ / フッタ ---------- */
const UI = {
  ja: {
    htmlLang: "ja", ogLocale: "ja_JP",
    brand: "ピッチの辞書", brandsub: "PITCH DICTIONARY",
    search: "用語を検索（例：ハーフスペース、xG）", searchAria: "用語を検索",
    switchTo: "English", switchAria: "Switch to English",
    home: "🏠 ホーム（動く戦術ボード）", glossary: "📚 全用語一覧",
    privacy: "プライバシーポリシー", company: "ここ企画",
    footNote: "図解はすべてオリジナルの戦術ボードで表現しています（実際の試合映像・写真は使用していません）。<br>本サイトにはアフィリエイト広告（PR）を含む場合があります。",
    crumbHome: "ピッチの辞書", crumbGlossary: "用語一覧",
    vizCap: "オリジナルの戦術ボードで図解（青＝注目チーム／赤＝相手、攻撃方向は左→右）。ボードは自動で動きます。",
    appBtn: (n) => `⚽ アプリ版で拡大して見る（他の${n}語もタップで図解）`,
    share: "この用語をシェア：",
    prevNext: "前後の用語",
    asideTitle: (label, n) => `${label} の用語（${n}語）`,
    allTerms: (n) => `📚 全${n}語の一覧を見る →`,
    otherLang: (name) => `🇬🇧 Read this term in English: ${name} →`,
  },
  en: {
    htmlLang: "en", ogLocale: "en_US",
    brand: "PITCH DICTIONARY", brandsub: "Football terms, visualized",
    search: "Search terms (e.g. half-space, xG)", searchAria: "Search terms",
    switchTo: "日本語", switchAria: "日本語に切り替え",
    home: "🏠 Home", glossary: "📚 All terms",
    privacy: "Privacy policy", company: "Koko Kikaku",
    footNote: "All diagrams are original tactics-board illustrations. No real match footage or photographs are used.<br>This site may contain affiliate advertising (PR).",
    crumbHome: "PITCH DICTIONARY", crumbGlossary: "All terms",
    vizCap: "An original tactics board (blue = the team in focus, red = the opponent; attacking left to right). The board animates on its own.",
    appBtn: (n) => `⚽ Open the interactive version (${n} more terms, each with its own board)`,
    share: "Share this term:",
    prevNext: "Previous and next term",
    asideTitle: (label, n) => `${label} (${n} terms)`,
    allTerms: (n) => `📚 Browse all ${n} terms →`,
    otherLang: (name) => `🇯🇵 この用語を日本語で読む：${name} →`,
  },
};

function head({ lang, title, desc, url, altUrl, altPath, jsonld, ogType = "article" }) {
  const u = UI[lang];
  const jaUrl = lang === "ja" ? url : altUrl;
  const enUrl = lang === "en" ? url : altUrl;
  return `<!DOCTYPE html>
<html lang="${u.htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ja" href="${jaUrl}">
<link rel="alternate" hreflang="en" href="${enUrl}">
<link rel="alternate" hreflang="x-default" href="${jaUrl}">
<meta name="theme-color" content="#1536C4">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(u.brand)}">
<meta property="og:locale" content="${u.ogLocale}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og-v2.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}/og-v2.png">
<meta name="referrer" content="strict-origin-when-cross-origin">
${cspMeta}
${jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n")}
${gaId ? `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');</script>` : ""}
${adsClient ? `<!-- Google AdSense -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsClient}" crossorigin="anonymous"></script>` : ""}
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<link rel="apple-touch-icon" href="/icon-512.png">
<link rel="manifest" href="/manifest.json">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@700;900&family=Oswald:wght@600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/terms.css?v=${lastmod.replace(/-/g, "")}">
</head>
<body>
${sharedDefs}
<header class="th">
  <div class="wrap thbar">
    <a class="tlogo" href="${homePath(lang)}"><img src="/mascotc.webp" alt="" width="40" height="40"><span><b>${esc(u.brand)}</b><small>${esc(u.brandsub)}</small></span></a>
    <form class="tsearch" action="/" method="get" role="search">
      <input type="search" name="q" placeholder="${esc(u.search)}" aria-label="${esc(u.searchAria)}">
      ${lang === "en" ? '<input type="hidden" name="lang" value="en">' : ""}
      <button type="submit" aria-label="${esc(u.searchAria)}">🔍</button>
    </form>
    <a class="tlang" href="${altPath || altUrl}" hreflang="${lang === "ja" ? "en" : "ja"}" aria-label="${esc(u.switchAria)}">${esc(u.switchTo)}</a>
  </div>
</header>
`;
}

function foot(lang) {
  const u = UI[lang];
  return `
<footer class="tf">
  <div class="wrap">
    <nav class="tfnav" aria-label="${lang === "ja" ? "サイト内リンク" : "Site links"}">
      <a href="${homePath(lang)}">${esc(u.home)}</a>
      <a href="${indexPath(lang)}">${esc(u.glossary)}</a>
      <a href="/privacy.html">${esc(u.privacy)}</a>
      <a href="https://kokokikaku.com/" target="_blank" rel="noopener">${esc(u.company)}</a>
    </nav>
    <p class="tfnote">${u.footNote}</p>
    <p class="tfcopy">© 2026 ここ企画 / ${esc(u.brand)}</p>
  </div>
</footer>
<script src="/affiliates.js" defer></script>
</body>
</html>
`;
}

function catBadge(cat, lang) {
  const c = CAT[cat];
  return `<a class="tcat" href="${indexPath(lang)}#cat-${cat}" style="--cc:${c.col};--ccd:${c.d}">${esc(catLabel(cat, lang))}</a>`;
}
function chip(t, lang) {
  return `<a class="tchip" href="${termPath(t.id, lang)}" style="--cc:${CAT[t.cat].col};--ccd:${CAT[t.cat].d}"><span>${EMOJI[t.id] || "⚽"}</span>${esc(shortOf(t, lang))}</a>`;
}

/* ---------- 5) 用語ページ ---------- */
function termPage(t, lang) {
  const u = UI[lang];
  const c = CAT[t.cat];
  const name = nameOf(t, lang), sn = shortOf(t, lang);
  const one = oneOf(t, lang);
  const url = abs(termPath(t.id, lang));
  const altLang = lang === "ja" ? "en" : "ja";
  const altPath = termPath(t.id, altLang);
  const altUrl = abs(altPath);

  // Search-intent refinements for existing pages; keep the visual glossary identity.
  const searchCopy = lang === "en" ? {
    cutback: {
      title: 'Cutback in football: meaning & animated example | PITCH DICTIONARY',
      desc: 'A cutback is a pass pulled back from near the goal line to a teammate farther from goal. See the movement and why it creates chances on an animated board.'
    },
    anchor: {
      title: 'Anchor in football: defensive midfield role | PITCH DICTIONARY',
      desc: 'An anchor sits in front of the defence, blocks central passing lanes and links the build-up. See the defensive midfield role on an animated tactics board.'
    }
  }[t.id] : null;
  const title = searchCopy ? searchCopy.title : lang === "ja"
    ? `${sn}とは？意味をサッカー戦術ボードで3秒図解｜ピッチの辞書`
    : `What is ${sn} in football? Explained with a moving tactics board | PITCH DICTIONARY`;
  const desc = searchCopy ? searchCopy.desc : lang === "ja"
    ? clip(`${name}（${t.en}）とは：${one} 実況・コラム・データで使われるサッカー用語「${sn}」の意味を、初心者向けに動く戦術ボードで図解。${strip(t.use.text)}`, 150)
    // 英語ページの説明文に日本語名（t.name）を入れない。検索結果の冒頭にカナが並ぶと
    // 英語圏の検索者には外国語ページに見え、2位に出ても押されなかった（305表示・0クリック）。
    // 定義を先頭に置き、以降は文が丸ごと入るときだけ足す。
    : fitSentences([
      `${name} in football: ${one}`,
      `A beginner-friendly explanation of "${sn}", visualized on an animated tactics board.`,
      TR_EN[t.id].text,
    ], 155);

  const rel = (t.rel || []).map((r) => TERMS.find((x) => x.id === r)).filter(Boolean);
  const sib = byCat[t.cat];
  const i = sib.findIndex((x) => x.id === t.id);
  const prev = sib[(i - 1 + sib.length) % sib.length], next = sib[(i + 1) % sib.length];
  const svg = vizFor(t, lang);

  const shareText = lang === "ja"
    ? `「${sn}」ってこういう意味⚽ サッカー用語を3秒で図解『ピッチの辞書』`
    : `What “${sn}” actually means ⚽ Football terms explained in 3 seconds — PITCH DICTIONARY`;
  const tag = lang === "ja" ? " #サッカー用語" : " #football";
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + tag)}&url=${encodeURIComponent(url)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;

  const setName = lang === "ja" ? "ピッチの辞書 サッカー用語集" : "PITCH DICTIONARY football glossary";
  const jsonld = [
    {
      "@context": "https://schema.org", "@type": "DefinedTerm",
      name, alternateName: subOf(t, lang), description: one, url,
      inDefinedTermSet: { "@type": "DefinedTermSet", name: setName, url: abs(indexPath(lang)) },
      termCode: t.id, inLanguage: lang,
    },
    {
      "@context": "https://schema.org", "@type": "Article",
      headline: lang === "ja" ? `${sn}とは？意味を戦術ボードで図解` : `What is ${sn}? A football term, visualized`,
      description: desc, url, inLanguage: lang,
      mainEntityOfPage: url, dateModified: lastmod, image: SITE + "/og-v2.png",
      author: { "@type": "Organization", name: "ここ企画", url: "https://kokokikaku.com/" },
      publisher: { "@type": "Organization", name: "ここ企画", url: "https://kokokikaku.com/", logo: { "@type": "ImageObject", url: SITE + "/icon-512.png" } },
      about: { "@type": "Thing", name: lang === "ja" ? "サッカー用語" : "Football terminology" },
      keywords: [sn, subOf(t, lang), lang === "ja" ? "サッカー用語" : "football term", catName(t.cat, lang)].join(","),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: u.crumbHome, item: abs(homePath(lang)) },
        { "@type": "ListItem", position: 2, name: u.crumbGlossary, item: abs(indexPath(lang)) },
        { "@type": "ListItem", position: 3, name: sn, item: url },
      ],
    },
  ];

  const leadHtml = lang === "ja"
    ? `<strong>${esc(sn)}とは</strong>、${esc(one)}`
    : `<strong>${esc(sn)}</strong> — ${esc(one)}`;

  return head({ lang, title, desc, url, altUrl, altPath, jsonld }) + `
<main class="wrap tmain">
  <nav class="crumb" aria-label="${lang === "ja" ? "パンくず" : "Breadcrumb"}"><a href="${homePath(lang)}">${esc(u.crumbHome)}</a> › <a href="${indexPath(lang)}">${esc(u.crumbGlossary)}</a> › <a href="${indexPath(lang)}#cat-${t.cat}">${esc(catName(t.cat, lang))}</a> › <span>${esc(sn)}</span></nav>

  <article class="tarticle" style="--cc:${c.col};--ccd:${c.d}">
    <div class="tmeta">${catBadge(t.cat, lang)}<span class="tlvl">${esc(lvlOf(t, lang))}</span></div>
    <h1><span class="temoji" aria-hidden="true">${EMOJI[t.id] || "⚽"}</span>${esc(name)}</h1>
    <p class="ten"><span lang="${lang === "ja" ? "en" : "ja"}">${esc(subOf(t, lang))}</span>${lang === "ja" && t.kana ? `<span class="tkana">読み：${esc(t.kana)}</span>` : ""}</p>
    <p class="tlead">${leadHtml}</p>

    <p class="taltlang"><a href="${altPath}" hreflang="${altLang}">${esc(u.otherLang(shortOf(t, altLang)))}</a></p>

    <section class="tstep">
      <h2><span class="snum">1</span>${esc(I18N[lang].m1)}</h2>
      <p class="tcatch">${catchOf(t, lang)}</p>
    </section>

    <section class="tstep">
      <h2><span class="snum">2</span>${esc(I18N[lang].m2)}</h2>
      <div class="viz">${svg}</div>
      <p class="vizcap">${esc(u.vizCap)}</p>
      <p class="tapp"><a class="tbtn" href="${lang === "ja" ? "/#" + t.id : "/?lang=en#" + t.id}">${esc(u.appBtn(TERMS.length - 1))}</a></p>
    </section>

    <section class="tstep">
      <h2><span class="snum">3</span>${esc(I18N[lang].m3)}</h2>
      <p class="why">${whyOf(t, lang)}</p>
      <div class="usage"><span class="who">${esc(useWhoOf(t, lang))}</span>${useTextOf(t, lang)}</div>
    </section>

    <div class="affslot" data-aff="term" data-lang="${lang}" data-term="${t.id}" data-cat="${t.cat}" hidden></div>

    ${rel.length ? `<section class="tstep">
      <h2>${esc(I18N[lang].mRel)}</h2>
      <div class="tchips">${rel.map((r) => chip(r, lang)).join("")}</div>
    </section>` : ""}

    <div class="tshare">
      <span>${esc(u.share)}</span>
      <a class="sbtn x" href="${xUrl}" target="_blank" rel="noopener noreferrer">𝕏 Post</a>
      <a class="sbtn line" href="${lineUrl}" target="_blank" rel="noopener noreferrer">💬 LINE</a>
    </div>

    <nav class="tpn" aria-label="${esc(u.prevNext)}">
      <a href="${termPath(prev.id, lang)}" rel="prev">← ${esc(shortOf(prev, lang))}</a>
      <a href="${termPath(next.id, lang)}" rel="next">${esc(shortOf(next, lang))} →</a>
    </nav>
  </article>

  <aside class="taside">
    <h2 style="--cc:${c.col};--ccd:${c.d}">${esc(u.asideTitle(catLabel(t.cat, lang), sib.length))}</h2>
    <div class="tchips">${sib.map((s) => chip(s, lang)).join("")}</div>
    <p class="tmore"><a href="${indexPath(lang)}">${esc(u.allTerms(TERMS.length))}</a></p>
  </aside>
</main>
` + foot(lang);
}

/* ---------- 6) 用語一覧ページ ---------- */
function indexPage(lang) {
  const u = UI[lang];
  const url = abs(indexPath(lang));
  const altLang = lang === "ja" ? "en" : "ja";
  const altPath = indexPath(altLang);
  const altUrl = abs(altPath);
  const n = TERMS.length;

  const title = lang === "ja"
    ? `サッカー用語一覧（全${n}語）｜意味を戦術ボードで図解 - ピッチの辞書`
    : `Football glossary — all ${n} terms, each with an animated tactics board | PITCH DICTIONARY`;
  const desc = lang === "ja"
    ? `実況・コラム・データ・ルールで使われるサッカー用語${n}語を、初心者向けに一言解説＋動く戦術ボードで図解。ハーフスペース、ネガトラ、xG、ゲーゲンプレス、DOGSOなど。`
    : `All ${n} football terms used in live commentary, tactics columns, stats and the Laws of the Game — each with a one-line definition and an animated tactics board. Half-space, gegenpressing, xG, DOGSO and more.`;

  const setName = lang === "ja" ? "ピッチの辞書 サッカー用語集" : "PITCH DICTIONARY football glossary";
  const jsonld = [
    {
      "@context": "https://schema.org", "@type": "DefinedTermSet", name: setName, url, inLanguage: lang,
      hasDefinedTerm: TERMS.map((t) => ({ "@type": "DefinedTerm", name: nameOf(t, lang), alternateName: subOf(t, lang), url: abs(termPath(t.id, lang)) })),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: u.crumbHome, item: abs(homePath(lang)) },
        { "@type": "ListItem", position: 2, name: u.crumbGlossary, item: url },
      ],
    },
  ];
  const trend = TREND.map((id) => TERMS.find((t) => t.id === id)).filter(Boolean);

  const lead = lang === "ja"
    ? `実況・コラム・データ・ルールの4カテゴリ。用語名をタップすると、意味の一言解説と<strong>動く戦術ボード</strong>による図解ページが開きます。`
    : `Four categories: live commentary, tactics columns, data and stats, and the Laws of the Game. Tap a term for a one-line definition and an <strong>animated tactics board</strong>.`;
  const trendHead = lang === "ja" ? "🔥 いま実況・SNSでよく飛び交うワード" : "🔥 Trending in commentary and on social right now";

  return head({ lang, title, desc, url, altUrl, altPath, jsonld, ogType: "website" }) + `
<main class="wrap tmain tindex">
  <nav class="crumb" aria-label="${lang === "ja" ? "パンくず" : "Breadcrumb"}"><a href="${homePath(lang)}">${esc(u.crumbHome)}</a> › <span>${esc(u.crumbGlossary)}</span></nav>
  <article class="tarticle">
    <h1>${lang === "ja" ? "サッカー用語一覧" : "Football glossary"} <small>${lang === "ja" ? `全${n}語` : `${n} terms`}</small></h1>
    <p class="tlead">${lead}</p>
    <p class="taltlang"><a href="${altPath}" hreflang="${altLang}">${lang === "ja" ? "🇬🇧 Read the glossary in English →" : "🇯🇵 この用語集を日本語で読む →"}</a></p>
    <nav class="tjump" aria-label="${lang === "ja" ? "カテゴリ" : "Categories"}">${CATS.map((c) => `<a href="#cat-${c}" style="--cc:${CAT[c].col};--ccd:${CAT[c].d}">${esc(catLabel(c, lang))}（${byCat[c].length}）</a>`).join("")}</nav>

    <section class="tstep">
      <h2>${esc(trendHead)}</h2>
      <div class="tchips">${trend.map((t) => chip(t, lang)).join("")}</div>
    </section>

    ${CATS.map((c) => `<section class="tstep tcatsec" id="cat-${c}" style="--cc:${CAT[c].col};--ccd:${CAT[c].d}">
      <h2>${esc(catLabel(c, lang))} <small>${byCat[c].length}${lang === "ja" ? "語" : " terms"}</small></h2>
      <ul class="tlist">
        ${byCat[c].map((t) => `<li><a href="${termPath(t.id, lang)}"><span class="temoji" aria-hidden="true">${EMOJI[t.id] || "⚽"}</span><b>${esc(nameOf(t, lang))}</b><i lang="${lang === "ja" ? "en" : "ja"}">${esc(subOf(t, lang))}</i><span class="tone">${esc(oneOf(t, lang))}</span></a></li>`).join("\n        ")}
      </ul>
    </section>`).join("\n")}

    <div class="affslot" data-aff="home" data-lang="${lang}" hidden></div>
  </article>
</main>
` + foot(lang);
}

/* ---------- 7) 英語トップ（ランディング） ---------- */
function enLanding() {
  const lang = "en", u = UI.en, n = TERMS.length;
  const url = abs("/en/");
  const altPath = "/";
  const altUrl = abs(altPath);
  const title = `PITCH DICTIONARY — ${n} football terms explained with animated tactics boards`;
  const desc = `Half-space? Negative transition? xG? A beginner-friendly visual glossary of ${n} football terms used in live commentary, tactics columns, stats and the Laws of the Game. Every term comes with its own animated tactics board.`;
  const jsonld = [
    {
      "@context": "https://schema.org", "@type": "WebSite", name: "PITCH DICTIONARY",
      url, inLanguage: "en",
      publisher: { "@type": "Organization", name: "Koko Kikaku", url: "https://kokokikaku.com/" },
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage", inLanguage: "en",
      mainEntity: [
        { "@type": "Question", name: "Is PITCH DICTIONARY free?", acceptedAnswer: { "@type": "Answer", text: `Yes. All ${n} football terms are free to read and no sign-up is required.` } },
        { "@type": "Question", name: "Are the diagrams real match footage?", acceptedAnswer: { "@type": "Answer", text: "No. Every diagram is an original tactics board drawn as an SVG animation. No match footage or photographs are used." } },
        { "@type": "Question", name: "What is a half-space in football?", acceptedAnswer: { "@type": "Answer", text: "The zone between the centre and the wing when the pitch is split into five vertical lanes. Defenders are unsure who should mark there, which is what makes it valuable." } },
        { "@type": "Question", name: "What does xG (expected goals) mean?", acceptedAnswer: { "@type": "Answer", text: "A number between 0 and 1 estimating how likely a shot was to become a goal, based on its position and situation. It judges a performance beyond the scoreline." } },
      ],
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [{ "@type": "ListItem", position: 1, name: "PITCH DICTIONARY", item: url }],
    },
  ];
  const trend = TREND.map((id) => TERMS.find((t) => t.id === id)).filter(Boolean);

  return head({ lang, title, desc, url, altUrl, altPath, jsonld, ogType: "website" }) + `
<main class="wrap tmain tindex">
  <article class="tarticle">
    <h1>Football terms, visualized</h1>
    <p class="tlead">Half-space? Negative transition? xG? You don't have to be a football buff. Every one of the <strong>${n} terms</strong> in this glossary comes with its own <strong>animated tactics board</strong>, so you can see what the words mean instead of just reading a definition.</p>
    <p class="taltlang"><a href="/" hreflang="ja">🇯🇵 日本語版はこちら →</a></p>

    <p class="tapp"><a class="tbtn" href="${indexPath("en")}">📚 Browse all ${n} terms →</a></p>

    <section class="tstep">
      <h2>🔥 Trending in commentary and on social right now</h2>
      <div class="tchips">${trend.map((t) => chip(t, "en")).join("")}</div>
    </section>

    <section class="tstep">
      <h2>Four ways football gets talked about</h2>
      <ul class="seocats">
        ${CATS.map((c) => {
          const blurb = {
            live: "Words you hear while the match is on. Delay, low block, second ball, cutting inside.",
            column: "Words that fill tactics columns. Half-space, the five lanes, positional play, the false nine.",
            data: "Words for talking in numbers. xG, xA, PPDA, heat maps, possession.",
            rule: "Words that explain a decision. Offside, VAR, advantage, DOGSO.",
          }[c];
          return `<li><b>${esc(catLabel(c, "en"))}</b> — ${esc(blurb)} <a href="${indexPath("en")}#cat-${c}">${byCat[c].length} terms →</a></li>`;
        }).join("\n        ")}
      </ul>
    </section>

    <section class="tstep">
      <h2>How each term is explained</h2>
      <ol class="seocats">
        <li><b>In a nutshell</b> — one line that gets you to the idea.</li>
        <li><b>See it move</b> — an original tactics board where the players and the ball actually move.</li>
        <li><b>Why it matters</b> — what to watch for, and how commentators use the word.</li>
      </ol>
    </section>

    <section class="tstep">
      <h2>Questions people ask</h2>
      <dl class="seofaq">
        <dt>Is it free?</dt>
        <dd>Yes. All ${n} terms, no sign-up.</dd>
        <dt>Are the diagrams real match footage?</dt>
        <dd>No. Every board is an original SVG animation. No footage or photographs are used.</dd>
        <dt>Does it work offline?</dt>
        <dd>Once you have opened it, the pages are stored by your browser and can be added to your home screen like an app.</dd>
      </dl>
    </section>

    <div class="affslot" data-aff="home" data-lang="en" hidden></div>

    <nav class="seolinks" aria-label="All term pages">
      <h2>All ${n} terms</h2>
      <div>${TERMS.map((t) => `<a href="${termPath(t.id, "en")}">${esc(shortEn(t))}</a>`).join("")}</div>
    </nav>
  </article>
</main>
` + foot("en");
}

/* ---------- 8) CSS ---------- */
const css = `/* 生成物: scripts/build-pages.js が作成。直接編集しない */
:root{--bg:#EAF2FF;--panel:#fff;--ink:#111C36;--muted:#46577A;--accent:#FFC01E;--accentD:#E07C00;--cyan:#1E96E0;--r:18px;
  --round:"Zen Maru Gothic","Zen Kaku Gothic New","Hiragino Maru Gothic ProN",sans-serif}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:#1536C4;color:var(--ink);font-family:"Zen Kaku Gothic New","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif;font-size:16px;line-height:1.75;min-height:100vh;-webkit-font-smoothing:antialiased}
.wrap{max-width:1080px;margin:0 auto;padding:0 18px}
a{color:#0E6EAF}
/* header */
.th{position:sticky;top:0;z-index:50;background:linear-gradient(180deg,#FFC93A,var(--accent) 55%,var(--accentD) 165%);box-shadow:0 3px 16px rgba(10,20,50,.2)}
.th::after{content:"";display:block;height:5px;background:linear-gradient(90deg,#12203C,#12203C 14%,#FFC01E 24%,#FFD84D 50%,#FFC01E 76%,#12203C 86%,#12203C)}
.thbar{display:flex;align-items:center;gap:12px;padding:10px 18px;flex-wrap:wrap}
.tlogo{display:flex;align-items:center;gap:10px;text-decoration:none;white-space:nowrap}
.tlogo img{width:40px;height:40px;border-radius:12px;background:#1536C4;border:2px solid rgba(255,255,255,.85);object-fit:contain;padding:1px}
.tlogo b{display:block;font-family:"Dela Gothic One",var(--round);font-size:19px;color:#fff;line-height:1.1;text-shadow:-2px -2px 0 #12203C,2px -2px 0 #12203C,-2px 2px 0 #12203C,2px 2px 0 #12203C,0 -2px 0 #12203C,0 2px 0 #12203C,-2px 0 0 #12203C,2px 0 0 #12203C}
.tlogo small{display:block;color:#1B2A4A;font-size:10.5px;font-weight:700;letter-spacing:.18em;font-family:Oswald,sans-serif;margin-top:2px}
.tsearch{flex:1;min-width:180px;max-width:440px;display:flex;position:relative}
.tsearch input{width:100%;padding:10px 46px 10px 18px;border-radius:999px;background:#fff;border:2px solid rgba(20,45,95,.18);font:inherit;font-size:15px;outline:none}
.tsearch input:focus{border-color:#12203C}
.tsearch button{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:32px;height:32px;border:none;border-radius:50%;background:#12203C;color:#fff;cursor:pointer;font-size:14px}
.tlang{flex:none;font-family:Oswald,var(--round),sans-serif;font-weight:700;font-size:13px;letter-spacing:.04em;text-decoration:none;
  background:#12203C;color:#fff;border:2px solid #12203C;border-radius:999px;padding:7px 15px;white-space:nowrap;transition:filter .15s,transform .15s}
.tlang:hover{filter:brightness(1.25);transform:translateY(-1px);color:#fff}
/* main */
.tmain{padding:22px 18px 40px;display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:22px;align-items:start}
@media (max-width:900px){.tmain{grid-template-columns:1fr}}
.crumb{grid-column:1/-1;font-size:13px;color:rgba(255,255,255,.85);margin-bottom:-6px;overflow-wrap:anywhere}
.crumb a{color:#fff;font-weight:700}
.tarticle{background:var(--panel);border:2.5px solid rgba(20,40,90,.14);border-radius:22px;padding:24px 24px 26px;box-shadow:0 8px 0 rgba(20,40,90,.12),0 20px 40px rgba(0,0,0,.25);position:relative;overflow:hidden;min-width:0}
.tarticle::before{content:"";position:absolute;left:0;right:0;top:0;height:8px;background:linear-gradient(90deg,var(--cc,#FFC01E),color-mix(in srgb,var(--cc,#FFC01E) 60%,#fff))}
.tmeta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.tcat{font-size:12.5px;font-weight:800;color:var(--ccd,#B26A00);text-decoration:none;background:color-mix(in srgb,var(--cc,#FFC01E) 14%,#fff);border:1.5px solid color-mix(in srgb,var(--cc,#FFC01E) 45%,#fff);padding:4px 12px;border-radius:999px}
.tlvl{font-size:12.5px;font-weight:800;color:var(--accentD);background:#FFF4D6;border:1.5px solid #FFD98A;padding:4px 12px;border-radius:999px}
h1{font-family:var(--round);font-weight:900;font-size:clamp(24px,5.2vw,34px);line-height:1.3;letter-spacing:.01em;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
h1 small{font-size:.5em;color:var(--muted);font-weight:700}
.temoji{display:inline-grid;place-items:center;width:1.5em;height:1.5em;border-radius:.45em;background:#fff;border:2.5px solid var(--cc,#FFC01E);box-shadow:0 3px 0 var(--cc,#FFC01E);font-size:.85em;flex:none}
.ten{font-family:Oswald,sans-serif;font-size:14px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin:6px 0 12px;display:flex;gap:14px;flex-wrap:wrap}
.tkana{font-family:inherit;text-transform:none;letter-spacing:0;font-size:13px}
.tlead{font-size:17px;line-height:1.85;margin-bottom:8px}
/* 言語切り替えの導線 */
.taltlang{margin:12px 0 4px;font-size:14px;font-weight:800}
.taltlang a{display:inline-block;text-decoration:none;color:#0E6EAF;background:#F1F6FF;border:2px solid rgba(30,150,224,.3);border-radius:999px;padding:7px 16px;transition:background .15s,transform .12s}
.taltlang a:hover{background:#E2EEFF;transform:translateY(-1px)}
.tstep{margin-top:26px}
.tstep h2{font-family:var(--round);font-size:16px;font-weight:900;color:#12203C;display:flex;align-items:center;gap:9px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px dashed rgba(20,40,90,.14)}
.tstep h2 small{font-size:12.5px;color:var(--muted);font-weight:700}
.snum{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#12203C;color:var(--accent);font-family:Oswald,sans-serif;font-size:13px;flex:none}
.tcatch{font-family:var(--round);font-size:20px;font-weight:900;line-height:1.55;color:#12203C;background:linear-gradient(180deg,#FFF8E1,#FFF1C2);border-left:6px solid var(--accent);border-radius:0 14px 14px 0;padding:14px 18px}
${vizCss}
.viz{margin-top:4px}
.vizcap{font-size:13px;color:var(--muted);text-align:center;margin-top:8px;line-height:1.65}
.tapp{text-align:center;margin-top:12px}
.tbtn{display:inline-block;font-weight:900;color:#12203C;text-decoration:none;font-size:14.5px;background:linear-gradient(92deg,#FFDA6A,#FFC01E);border:2px solid #12203C;padding:10px 20px;border-radius:999px;box-shadow:0 4px 0 #12203C;transition:transform .12s}
.tbtn:hover{transform:translateY(-2px)}
.why{font-size:15.5px;line-height:1.95}
.why b{color:var(--accentD)}
.usage{font-size:14.5px;color:var(--ink);background:#EAF4FF;border-left:4px solid var(--cyan);border-radius:0 10px 10px 0;padding:13px 17px;line-height:1.8;margin-top:12px}
.usage .who{font-size:12px;color:#0E6EAF;font-weight:800;letter-spacing:.06em;display:block;margin-bottom:3px}
.tchips{display:flex;flex-wrap:wrap;gap:8px}
.tchip{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:800;padding:7px 14px 7px 9px;border-radius:999px;text-decoration:none;background:#fff;color:var(--ccd,#0E6EAF);border:2px solid color-mix(in srgb,var(--cc,#1E96E0) 45%,#fff);transition:background .15s,transform .12s}
.tchip:hover{background:color-mix(in srgb,var(--cc,#1E96E0) 12%,#fff);transform:translateY(-1px)}
.tchip span{font-size:15px}
.tshare{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:26px;font-size:13.5px;font-weight:700;color:var(--muted)}
.sbtn{display:inline-block;text-decoration:none;font-weight:800;font-size:13.5px;padding:8px 16px;border-radius:999px;color:#fff;border:2px solid #12203C;box-shadow:0 3px 0 #12203C}
.sbtn.x{background:#111}.sbtn.line{background:#06C755}
.sbtn:hover{color:#fff}
.tpn{display:flex;justify-content:space-between;gap:12px;margin-top:22px;padding-top:16px;border-top:2px dashed rgba(20,40,90,.14);font-weight:800;font-size:14px}
.tpn a{text-decoration:none;color:#0E6EAF}
.taside{background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.28);border-radius:20px;padding:18px 16px;color:#fff;position:sticky;top:96px}
.taside h2{font-family:var(--round);font-size:15px;font-weight:900;margin-bottom:12px;color:#fff}
.taside .tchip{font-size:13px;padding:6px 12px 6px 8px}
.tmore{margin-top:14px;font-size:14px;font-weight:800}.tmore a{color:#FFD84D}
/* index / landing */
.tindex{grid-template-columns:1fr}
.tjump{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 4px}
.tjump a{text-decoration:none;font-weight:800;font-size:13.5px;color:var(--ccd);background:color-mix(in srgb,var(--cc) 14%,#fff);border:2px solid color-mix(in srgb,var(--cc) 45%,#fff);padding:7px 14px;border-radius:999px}
.tcatsec{scroll-margin-top:90px}
.tcatsec h2{color:var(--ccd);border-bottom-color:color-mix(in srgb,var(--cc) 50%,#fff)}
.tlist{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
.tlist a{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:10px;align-items:center;text-decoration:none;color:var(--ink);background:#fff;border:2px solid rgba(20,40,90,.12);border-radius:14px;padding:11px 13px;height:100%;transition:transform .12s,border-color .12s}
.tlist a:hover{transform:translateY(-2px);border-color:var(--cc)}
.tlist .temoji{grid-row:1/3;font-size:20px}
.tlist b{font-family:var(--round);font-size:15.5px;font-weight:900;line-height:1.3}
.tlist i{font-style:normal;font-family:Oswald,sans-serif;font-size:11px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-left:8px}
.tlist .tone{grid-column:2;font-size:12.5px;color:#33456A;line-height:1.5}
.seocats{list-style:none;display:grid;gap:8px;padding-left:0}
.seocats li{background:#F6F9FF;border-left:4px solid var(--cyan);border-radius:0 10px 10px 0;padding:9px 14px;font-size:14px;line-height:1.75}
.seocats b{color:#12203C}
ol.seocats{counter-reset:s}
ol.seocats li{list-style:none}
.seofaq dt{font-weight:900;font-size:14.5px;margin-top:12px;color:#12203C}
.seofaq dd{font-size:14.5px;color:#33456A;margin-left:0}
.seolinks h2{margin-top:26px}
.seolinks div{display:flex;flex-wrap:wrap;gap:6px}
.seolinks a{font-size:12.5px;font-weight:700;color:#0E6EAF;text-decoration:none;background:#F1F6FF;border:1px solid rgba(30,150,224,.28);border-radius:999px;padding:4px 11px}
.seolinks a:hover{background:#E2EEFF}
/* affiliate slot（affiliates.js が描画） */
.affslot{margin-top:26px}
.affbox{border:2px dashed rgba(20,40,90,.18);border-radius:16px;padding:14px 16px 16px;background:#FBFCFF;position:relative}
.affbox .afft{display:flex;align-items:center;gap:8px;font-family:var(--round);font-weight:900;font-size:15px;color:#12203C;margin-bottom:10px}
.affpr{font-size:10.5px;font-weight:800;letter-spacing:.08em;color:#fff;background:#6B7A99;border-radius:4px;padding:2px 6px;flex:none}
.affgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.affcard{display:flex;flex-direction:column;gap:4px;text-decoration:none;color:var(--ink);background:#fff;border:2px solid rgba(20,40,90,.12);border-radius:14px;padding:12px 14px;transition:transform .12s,border-color .12s}
.affcard:hover{transform:translateY(-2px);border-color:var(--accent)}
.affcard .affbadge{font-size:11px;font-weight:800;color:var(--accentD)}
.affcard b{font-family:var(--round);font-size:15px;font-weight:900;line-height:1.35}
.affcard p{font-size:12.5px;color:#33456A;line-height:1.55}
.affcard .affbtn{margin-top:6px;align-self:flex-start;font-size:12.5px;font-weight:900;color:#12203C;background:var(--accent);border:2px solid #12203C;border-radius:999px;padding:5px 12px;box-shadow:0 2px 0 #12203C}
.affraw{display:grid;gap:10px}
.affraw>div{overflow-x:auto}
.affraw img{max-width:100%;height:auto}
.affnote{font-size:11.5px;color:var(--muted);margin-top:8px;line-height:1.7}
/* footer */
.tf{border-top:1px solid rgba(255,255,255,.2);padding:26px 0 44px;color:rgba(255,255,255,.88);font-size:13.5px;text-align:center;line-height:2}
.tfnav{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 18px;font-weight:800}
.tfnav a{color:#fff;text-decoration:none}
.tfnav a:hover{color:#FFD84D}
.tfnote{margin-top:12px;font-size:12.5px;color:rgba(255,255,255,.75)}
.tfcopy{margin-top:10px;font-size:12.5px;color:#A9BEDF}
@media (max-width:640px){
  .tarticle{padding:18px 15px 20px;border-radius:18px}
  .tmain{padding:16px 12px 30px;gap:16px}
  .tcatch{font-size:17.5px;padding:12px 14px}
  .tlist{grid-template-columns:1fr}
  .taside{position:static}
  .tsearch{order:3;flex-basis:100%;max-width:none}
  .tsearch input{font-size:16px}
}
/* ---------- 戦術ボードのアニメーション（index.html から抽出） ---------- */
${animCss}`;

/* ---------- 9) 書き出し ---------- */
function writePage(relDir, html) {
  const dir = path.join(ROOT, relDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

fs.rmSync(path.join(ROOT, "terms"), { recursive: true, force: true });
fs.rmSync(path.join(ROOT, "en"), { recursive: true, force: true });

for (const lang of ["ja", "en"]) {
  for (const t of TERMS) writePage(path.join(lang === "ja" ? "terms" : "en/terms", t.id), termPage(t, lang));
  writePage(lang === "ja" ? "terms" : "en/terms", indexPage(lang));
}
writePage("en", enLanding());
fs.writeFileSync(path.join(ROOT, "terms.css"), css);

/* index.html の内部リンク一覧を静的に埋め込む（JSを実行しないクローラー対策） */
{
  const file = path.join(ROOT, "index.html");
  const raw = fs.readFileSync(file, "utf8");
  const open = '<div id="seolinklist">';
  const i = raw.indexOf(open);
  if (i < 0) {
    console.warn("⚠ index.html に #seolinklist が見つからないため、内部リンクの埋め込みをスキップしました");
  } else {
    const j = raw.indexOf("</div>", i);
    const links = TERMS.map((t) => `<a href="${termPath(t.id, "ja")}">${esc(shortJa(t))}</a>`).join("");
    const next = raw.slice(0, i + open.length) + links + raw.slice(j);
    if (next !== raw) fs.writeFileSync(file, next);
  }
}

const urls = [
  { loc: abs("/"), lastmod, changefreq: "weekly", priority: "1.0" },
  { loc: abs("/en/"), lastmod, changefreq: "weekly", priority: "0.9" },
  { loc: abs("/terms/"), lastmod, changefreq: "weekly", priority: "0.9" },
  { loc: abs("/en/terms/"), lastmod, changefreq: "weekly", priority: "0.8" },
];
for (const lang of ["ja", "en"]) {
  for (const t of TERMS) {
    urls.push({
      loc: abs(termPath(t.id, lang)), lastmod, changefreq: "monthly",
      priority: TREND.includes(t.id) ? (lang === "ja" ? "0.8" : "0.7") : (lang === "ja" ? "0.7" : "0.6"),
    });
  }
}
urls.push({ loc: abs("/privacy.html"), lastmod: today, changefreq: "yearly", priority: "0.2" });

fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
  urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join("\n") +
  `\n</urlset>\n`);

console.log(`✅ 日本語 ${TERMS.length + 1} ページ / 英語 ${TERMS.length + 2} ページ / terms.css / sitemap.xml（${urls.length} URL）を生成しました。lastmod=${lastmod}`);
