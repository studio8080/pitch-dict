const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'affiliates.js'), 'utf8');

// The renderer writes HTML only; this fixture never loads advertising images or follows links.
function fixture(slot, cat = '', lang = 'ja', term = '') {
  const attrs = { 'data-aff': slot, 'data-cat': cat, 'data-lang': lang, 'data-term': term };
  const node = {
    hidden: true, innerHTML: '',
    getAttribute(name) { return attrs[name] || null; },
    setAttribute(name, value) { attrs[name] = value; },
    querySelectorAll() { return []; },
  };
  const document = { readyState: 'loading', addEventListener() {}, querySelectorAll() { return [node]; } };
  const window = {};
  vm.runInNewContext(source, { window, document });
  return { node, window, render() { window.PD_AFF_render(document); } };
}

function titles(node) {
  return [...node.innerHTML.matchAll(/data-aff-title="([^"]*)"/g)].map(match => match[1]);
}

for (const [cat, book, other, heading] of [
  ['column', '林陵平のサッカー観戦術2', 'WOWOW（ワウワウ）', '戦術をもっと深く知る'],
  ['data', 'サッカーのデータ分析本', 'WOWOW（ワウワウ）', 'サッカーのデータをもっと詳しく'],
  ['rule', 'サッカー競技規則の本', 'スカパー！', '判定やルールをもっと詳しく'],
]) {
  test(`${cat}: relevant book fits in the two-card modal`, () => {
    const f = fixture('modal', cat);
    f.render();
    assert.deepEqual(titles(f.node), [book, other]);
    assert.ok(f.node.innerHTML.includes(heading));
  });
}

test('term page keeps three cards and the same eligible advertisers', () => {
  const f = fixture('term', 'column');
  f.render();
  assert.deepEqual(titles(f.node), ['林陵平のサッカー観戦術2', 'WOWOW（ワウワウ）', 'スカパー！']);
});

test('home introduces one book and replaces the generic goods slot within its six-card limit', () => {
  const f = fixture('home');
  f.render();
  assert.deepEqual(titles(f.node), ['林陵平のサッカー観戦術2', 'JUST A TOUCH Tシャツ', 'WOWOW（ワウワウ）', 'スカパー！', 'ABEMAプレミアム', 'サッカー用品・スパイク']);
  assert.ok(f.node.innerHTML.includes('サッカー観戦をもっと楽しむ'));
});

test('live terms keep existing order for equal priorities', () => {
  const f = fixture('modal', 'live');
  f.render();
  assert.deepEqual(titles(f.node), ['WOWOW（ワウワウ）', 'スカパー！']);
});

test('Japanese-only advertisers stay hidden in English slots', () => {
  for (const slot of ['home', 'term', 'modal']) {
    const f = fixture(slot, 'column', 'en');
    f.render();
    assert.equal(f.node.hidden, true);
    assert.equal(f.node.innerHTML, '');
  }
});

test('priority cannot bypass eligibility filters', () => {
  const f = fixture('modal', 'column', 'ja', 'halfspace');
  for (const item of [
    { enabled: false, url: 'https://example.invalid/disabled' },
    { enabled: true, url: '' },
    { enabled: true, url: 'https://example.invalid/slot', slots: ['home'] },
    { enabled: true, url: 'https://example.invalid/cat', cats: ['data'] },
    { enabled: true, url: 'https://example.invalid/term', terms: ['xg'] },
    { enabled: true, url: 'https://example.invalid/lang', langs: ['en'] },
  ]) f.window.PD_AFF.items.unshift({ kind: 'card', title: 'ineligible', contextPriority: 999, ...item });
  f.render();
  assert.equal(f.node.innerHTML.includes('example.invalid'), false);
  assert.equal(titles(f.node)[0], '林陵平のサッカー観戦術2');
});

test('PR, existing affiliate URLs and impression pixels are retained', () => {
  const f = fixture('modal', 'column');
  f.render();
  const cards = titles(f.node);
  for (const title of cards) {
    const item = f.window.PD_AFF.items.find(item => item.title === title);
    const escape = value => value.replace(/&/g, '&amp;');
    assert.ok(f.node.innerHTML.includes(`href="${escape(item.url)}"`));
    if (item.imp) assert.ok(f.node.innerHTML.includes(`src="${escape(item.imp)}"`));
    else assert.ok(f.node.innerHTML.includes(item.html));
  }
  assert.equal((f.node.innerHTML.match(/rel="nofollow sponsored noopener"/g) || []).length, 2);
  assert.ok(f.node.innerHTML.includes('class="affpr">PR'));
  assert.ok(f.node.innerHTML.includes(f.window.PD_AFF.disclosure));
  const ownPixelBox = f.node.innerHTML.match(/<div style="position:absolute;width:0;height:0;overflow:hidden">([\s\S]*?)<\/div>/)[1];
  assert.equal(ownPixelBox.includes('loading="lazy"'), false);
  assert.equal((f.node.innerHTML.match(/width="1" height="1"/g) || []).length, 2);
});

test('illustrations match the category, disclose their nature and do not impersonate product photos', () => {
  const f = fixture('home');
  f.render();
  const book = fixture('modal', 'data');
  book.render();
  for (const category of ['viewing', 'books', 'goods']) {
    assert.ok((f.node.innerHTML + book.node.innerHTML).includes('/assets/affiliate-' + category + '-v01.webp'));
  }
  const cards = (f.node.innerHTML.match(/class="affcard"/g) || []).length;
  assert.equal((f.node.innerHTML.match(/class="affcaption">イメージイラスト/g) || []).length, cards);
  assert.equal((f.node.innerHTML.match(/width="1536" height="1024" loading="lazy"/g) || []).length, cards);
});

test('repeated rendering does not duplicate cards or pixels', () => {
  const f = fixture('modal', 'column');
  f.render();
  const before = f.node.innerHTML;
  f.render();
  assert.equal(f.node.innerHTML, before);
  assert.equal(f.node.getAttribute('data-aff-done'), '1');
});

function measurementFixture({ dnt = '0', globalPrivacyControl = false, provided = false } = {}) {
  const attrs = {
    'data-aff': 'modal', 'data-cat': 'column', 'data-lang': 'ja', 'data-term': 'halfspace',
  };
  const linkAttrs = {
    'data-aff-provider': 'moshimo',
    'data-aff-advertiser': 'rakuten_tactics_books',
    'data-aff-placement': 'modal_column',
    'data-aff-provided': provided ? '1' : '',
  };
  const handlers = {};
  const link = {
    getAttribute(name) { return linkAttrs[name] || null; },
    setAttribute(name, value) { linkAttrs[name] = value; },
    addEventListener(name, handler) { handlers[name] = handler; },
  };
  const node = {
    hidden: true, innerHTML: '',
    getAttribute(name) { return attrs[name] || null; },
    setAttribute(name, value) { attrs[name] = value; },
    querySelectorAll(selector) { return selector === '.affcard[data-aff-advertiser]' ? [link] : []; },
  };
  const document = { readyState: 'loading', addEventListener() {}, querySelectorAll() { return [node]; } };
  const calls = [];
  let observerCallback;
  let timerCallback;
  class FakeIntersectionObserver {
    constructor(callback, options) { observerCallback = callback; this.options = options; }
    observe() {}
    unobserve() {}
  }
  const window = { gtag(...args) { calls.push(args); } };
  const navigator = { doNotTrack: dnt, globalPrivacyControl };
  vm.runInNewContext(source, {
    window, document, navigator,
    IntersectionObserver: FakeIntersectionObserver,
    WeakMap, WeakSet,
    setTimeout(callback) { timerCallback = callback; return 1; },
    clearTimeout() { timerCallback = null; },
  });
  window.PD_AFF_render(document);
  return {
    calls, handlers, link,
    enter() { observerCallback([{ target: link, isIntersecting: true, intersectionRatio: 0.5 }]); timerCallback(); },
  };
}

test('affiliate click and one-second 50% view use fixed privacy-safe dimensions', () => {
  const f = measurementFixture();
  f.enter();
  f.handlers.click();
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls)), [
    ['event', 'affiliate_view', { provider: 'moshimo', advertiser_id: 'rakuten_tactics_books', placement: 'modal_column', action: 'view' }],
    ['event', 'affiliate_click', { provider: 'moshimo', advertiser_id: 'rakuten_tactics_books', placement: 'modal_column', action: 'click' }],
  ]);
  const payload = JSON.stringify(f.calls);
  assert.equal(payload.includes('http'), false);
  assert.equal(payload.includes('halfspace'), false);
});

test('provided product cards measure link clicks but do not count blank-area clicks', () => {
  const f = measurementFixture({ provided: true });
  f.handlers.click({ target: { closest() { return null; } } });
  assert.equal(f.calls.length, 0);
  f.handlers.click({ target: { closest() { return { tagName: 'A' }; } } });
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0][1], 'affiliate_click');
});

test('official product HTML preserves all URLs, images and attributes; only permitted link text changes', () => {
  const issued = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/affiliate-products-issued-20261111.json'), 'utf8').replace(/^\uFEFF/, ''));
  const f = fixture('home');
  const withoutText = html => html.replace(/<br>[^<]*(?=<\/a>)/, '<br>LINK_TEXT');
  for (const [id, key] of [['rakuten_tactics_books', 'book'], ['rakuten_fan_goods', 'shirt']]) {
    const item = f.window.PD_AFF.items.find(it => it.advertiserId === id);
    assert.equal(withoutText(item.html), withoutText(issued[key]));
    assert.ok(!/ポイント|倍|送料無料|最安/.test(item.html));
    const href = item.html.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&');
    assert.equal(item.url, href);
    assert.equal(new URL(href, 'https://pitch.kokokikaku.com').searchParams.get('a_id'), '5791139');
  }
  f.render();
  assert.equal((f.node.innerHTML.match(/data-aff-provided="1"/g) || []).length, 2);
  assert.equal((f.node.innerHTML.match(/width="1" height="1"/g) || []).length, 6);
});

for (const privacy of [{ dnt: '1' }, { globalPrivacyControl: true }]) {
  test(`affiliate measurement stays off for ${privacy.dnt ? 'DNT' : 'GPC'}`, () => {
    const f = measurementFixture(privacy);
    assert.equal(f.handlers.click, undefined);
    assert.deepEqual(f.calls, []);
  });
}
