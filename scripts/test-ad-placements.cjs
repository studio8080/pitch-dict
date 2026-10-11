const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const slot = 'data-ad-slot="7497202207"';

for (const lang of ['ja', 'en']) {
  test(`${lang}: all 118 term pages have one dedicated unit after the explanation`, () => {
    const base = lang === 'ja' ? 'terms' : 'en/terms';
    const dirs = fs.readdirSync(path.join(root, base), { withFileTypes: true }).filter(entry => entry.isDirectory());
    assert.equal(dirs.length, 118);
    for (const dir of dirs) {
      const html = read(`${base}/${dir.name}/index.html`);
      assert.equal(html.split(slot).length - 1, 1, dir.name);
      assert.equal((html.match(/<script async src="https:\/\/pagead2\.googlesyndication\.com/g) || []).length, 1, dir.name);
      assert.ok(html.indexOf(slot) > html.indexOf('<nav class="tpn"'), dir.name);
      assert.ok(html.indexOf(slot) < html.indexOf('</article>'), dir.name);
      assert.ok(html.includes('data-ad-client="ca-pub-5958158070981810"'), dir.name);
      assert.ok(html.includes('data-ad-format="auto" data-full-width-responsive="true"'), dir.name);
      assert.ok(html.includes(`aria-label="${lang === 'ja' ? '広告' : 'Advertisement'}"`), dir.name);
      assert.ok(html.includes("ad_storage:'denied'"), dir.name);
      assert.ok(html.includes('"GB","CH"'), dir.name);
      assert.ok(html.includes('<div class="affslot" data-aff="term"'), dir.name);
    }
  });
}

test('interactive home, English landing and glossary indexes have no manual unit', () => {
  for (const file of ['index.html', 'en/index.html', 'terms/index.html', 'en/terms/index.html']) {
    assert.equal(read(file).includes(slot), false, file);
  }
});

test('unfilled ads collapse and narrow layouts do not set a fixed width', () => {
  const css = read('terms.css');
  assert.ok(css.includes('.tdisplay:has(.adsbygoogle[data-ad-status="unfilled"]){display:none}'));
  assert.ok(css.includes('.tdisplay{margin-top:26px;min-width:0;min-height:280px}'));
});
