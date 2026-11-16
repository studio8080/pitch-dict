const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'viz-controls.js'), 'utf8');

function fixture({ lang = 'ja', reduced = false, figures = 1 } = {}) {
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.attrs = {}; this.handlers = {}; this.children = []; this.siblings = []; this.hidden = false; this.disabled = false; }
    getAttribute(name) { return this.attrs[name] ?? null; }
    setAttribute(name, value) { this.attrs[name] = value; }
    appendChild(child) { this.children.push(child); }
    insertAdjacentElement(position, child) { assert.equal(position, 'afterend'); this.siblings.push(child); }
    addEventListener(name, handler) { this.handlers[name] = handler; }
    click() { if (!this.disabled) this.handlers.click?.(); }
  }
  const diagrams = Array.from({ length: figures }, (_, i) => { const element = new Element('div'); element.id = 'term-viz-' + i; return element; });
  const mediaHandlers = [];
  const media = { matches: reduced, addEventListener(name, fn) { assert.equal(name, 'change'); mediaHandlers.push(fn); } };
  const document = { readyState: 'complete', documentElement: { lang }, querySelectorAll(selector) { assert.equal(selector, '[data-viz-controls]'); return diagrams; }, createElement(tag) { return new Element(tag); } };
  const window = { matchMedia(query) { assert.equal(query, '(prefers-reduced-motion: reduce)'); return media; } };
  const context = { document, window };
  vm.runInNewContext(code, context);
  return { diagrams, button: i => diagrams[i || 0].siblings[0].children[0], status: i => diagrams[i || 0].siblings[0].children[1],
    reduce(value) { media.matches = value; mediaHandlers.forEach(fn => fn()); }, rerun() { vm.runInNewContext(code, context); } };
}

test('Japanese pause/resume changes only the selected diagram and announces the current state', () => {
  const f = fixture({ figures: 2 });
  const button = f.button();
  assert.equal(button.tagName, 'BUTTON');
  assert.equal(button.type, 'button');
  assert.equal(button.textContent, '動きを止める');
  assert.equal(button.getAttribute('aria-controls'), f.diagrams[0].id);
  assert.equal(button.getAttribute('aria-describedby'), f.status().id);
  assert.equal(f.status().getAttribute('role'), 'status');
  button.click();
  assert.equal(f.diagrams[0].getAttribute('data-viz-paused'), 'true');
  assert.equal(f.diagrams[1].getAttribute('data-viz-paused'), 'false');
  assert.equal(button.textContent, '再開する');
  assert.equal(f.status().textContent, '停止中');
  button.click();
  assert.equal(f.diagrams[0].getAttribute('data-viz-paused'), 'false');
  assert.equal(f.status().textContent, '再生中');
  f.rerun();
  assert.equal(f.diagrams[0].siblings.length, 1);
});

test('English commands use a native enabled keyboard button without custom key interception', () => {
  const f = fixture({ lang: 'en' });
  const button = f.button();
  assert.equal(button.tagName, 'BUTTON');
  assert.equal(button.disabled, false);
  assert.equal(button.getAttribute('tabindex'), null); // Native button is keyboard-focusable.
  assert.equal(button.handlers.keydown, undefined); // Enter/Space retain browser default activation.
  assert.equal(button.textContent, 'Pause animation');
  button.click();
  assert.equal(button.textContent, 'Resume animation');
  assert.equal(f.status().textContent, 'Paused');
});

test('reduced motion hides/disables the command and preserves a previous user pause when toggled', () => {
  const f = fixture({ lang: 'en', reduced: true });
  assert.equal(f.button().hidden, true);
  assert.equal(f.button().disabled, true);
  assert.match(f.status().textContent, /reduced motion/);
  f.button().click();
  assert.equal(f.diagrams[0].getAttribute('data-viz-paused'), 'false');
  f.reduce(false); f.button().click(); f.reduce(true); f.reduce(false);
  assert.equal(f.button().hidden, false);
  assert.equal(f.diagrams[0].getAttribute('data-viz-paused'), 'true');
  assert.equal(f.button().textContent, 'Resume animation');
});

test('generated Japanese/English diagrams get controls only when animated; no-JS HTML has no dead button', () => {
  for (const base of ['terms', 'en/terms']) {
    let animated = 0, still = 0;
    for (const dir of fs.readdirSync(path.join(root, base), { withFileTypes: true }).filter(d => d.isDirectory())) {
      const html = fs.readFileSync(path.join(root, base, dir.name, 'index.html'), 'utf8');
      assert.equal(/<button[^>]*class="viz-toggle"/.test(html), false);
      const svg = html.match(/<div class="viz"[^>]*>([\s\S]*?)<\/div>\s*<p class="vizcap">/)[1];
      const moves = [...svg.matchAll(/\bclass=["']([^"']*)["']/g)].some(m => m[1].split(/\s+/).some(c => ['mv', 'mv2', 'pulse', 'dash', 'fadein', 'blinkel'].includes(c)));
      assert.equal(html.includes('data-viz-controls'), moves, base + '/' + dir.name);
      assert.equal(html.includes('/viz-controls.js?v=20261116'), moves);
      assert.equal(html.includes('/viz-controls.css?v=20261116'), moves);
      if (moves) animated++; else still++;
    }
    assert.ok(animated > 0 && still > 0);
    assert.equal(animated + still, 118);
    assert.equal(fs.readFileSync(path.join(root, base, 'apt/index.html'), 'utf8').includes('data-viz-controls'), false);
  }
  const css = fs.readFileSync(path.join(root, 'viz-controls.css'), 'utf8');
  assert.match(css, /\.viz\[data-viz-paused="true"\] svg \*\{animation-play-state:paused!important\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.equal(/(?:body|\.affcard|\.affslot)[^{]*\{/.test(css), false);
});
