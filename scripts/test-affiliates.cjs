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
  };
  const document = { readyState: 'loading', addEventListener() {}, querySelectorAll() { return [node]; } };
  const window = {};
  vm.runInNewContext(source, { window, document });
  return { node, window, render() { window.PD_AFF_render(document); } };
}

function titles(node) {
  return [...node.innerHTML.matchAll(/<b>(.*?)<\/b>/g)].map(match => match[1]);
}

for (const [cat, book, other, heading] of [
  ['column', 'サッカー戦術の本', 'WOWOW（ワウワウ）', '戦術をもっと深く知る'],
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
  assert.deepEqual(titles(f.node), ['サッカー戦術の本', 'WOWOW（ワウワウ）', 'スカパー！']);
});

test('home keeps existing five-card order and heading', () => {
  const f = fixture('home');
  f.render();
  assert.deepEqual(titles(f.node), ['WOWOW（ワウワウ）', 'スカパー！', '観戦グッズ・サッカーボール', 'ABEMAプレミアム', 'サッカー用品・スパイク']);
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
  assert.equal(titles(f.node)[0], 'サッカー戦術の本');
});

test('PR, existing affiliate URLs and impression pixels are retained', () => {
  const f = fixture('modal', 'column');
  f.render();
  const cards = titles(f.node);
  for (const title of cards) {
    const item = f.window.PD_AFF.items.find(item => item.title === title);
    const escape = value => value.replace(/&/g, '&amp;');
    assert.ok(f.node.innerHTML.includes(`href="${escape(item.url)}"`));
    assert.ok(f.node.innerHTML.includes(`src="${escape(item.imp)}"`));
  }
  assert.equal((f.node.innerHTML.match(/rel="nofollow sponsored noopener"/g) || []).length, 2);
  assert.ok(f.node.innerHTML.includes('class="affpr">PR'));
  assert.ok(f.node.innerHTML.includes(f.window.PD_AFF.disclosure));
  assert.equal(f.node.innerHTML.includes('loading="lazy"'), false);
  assert.equal((f.node.innerHTML.match(/width="1" height="1"/g) || []).length, 2);
});

test('repeated rendering does not duplicate cards or pixels', () => {
  const f = fixture('modal', 'column');
  f.render();
  const before = f.node.innerHTML;
  f.render();
  assert.equal(f.node.innerHTML, before);
  assert.equal(f.node.getAttribute('data-aff-done'), '1');
});
