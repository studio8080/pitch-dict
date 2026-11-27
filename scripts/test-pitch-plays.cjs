const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { plays, sampleTrack, phaseAt, kickAt } = require('../src/pitch-plays.mjs');

const root = path.join(__dirname, '..');

function glossaryBoards(language) {
  const folder = path.join(root, language === 'en' ? 'en/terms' : 'terms');
  const boards = new Map();
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const html = fs.readFileSync(path.join(folder, entry.name, 'index.html'), 'utf8');
    const match = html.match(/data-viz-key="([^"]+)">\s*(<svg[^>]+>[\s\S]*?<\/svg>)/);
    if (match) boards.set(match[1], match[2]);
  }
  return boards;
}

test('authored motion targets real players in both language editions and stays on the pitch', () => {
  const editions = ['ja', 'en'].map(glossaryBoards);
  for (const [key, play] of Object.entries(plays)) {
    const tracks = [play.ball, ...Object.values(play.players || {})];
    for (const track of tracks) {
      assert.equal(track[0][0], 0, key);
      assert.ok(track.every(([at, x, y, lift = 0], index) => {
        return at >= 0 && at <= 1 && (!index || at > track[index - 1][0]) &&
          x > 0 && x < 600 && y > 0 && y < 400 && lift >= 0;
      }), key);
    }
    for (const boards of editions) {
      const svg = boards.get(key);
      assert.ok(svg, key);
      const roster = new Set([...svg.matchAll(/<circle cx="(\d+)" cy="(\d+)"[^>]+fill="url\(#g[AB]\)"/g)]
        .map(([, x, y]) => x + ',' + y));
      const actors = [...Object.keys(play.players || {}), ...Object.keys(play.face || {}), ...(play.kicks || []).map(([, player]) => player)];
      assert.ok(actors.every(actor => roster.has(actor)), `${key}: missing actor`);
    }
    for (const [at, actor] of play.kicks || []) {
      const [x, y] = play.players?.[actor] ? sampleTrack(play.players[actor], at, true) : actor.split(',').map(Number);
      const [bx, by] = sampleTrack(play.ball, at);
      assert.ok(Math.hypot(x - bx, y - by) <= 25, `${key}: ball is beyond kicking distance`);
      assert.equal(kickAt(play, actor, at).strike, 1);
    }
  }
});

test('wall pass reaches the supporting player and returns to the moving passer', () => {
  const play = plays.wallpass;
  const [first, second] = play.kicks.map(([at]) => at);
  assert.deepEqual(sampleTrack(play.ball, first).slice(0, 2), [309, 248]);
  assert.deepEqual(sampleTrack(play.ball, second).slice(0, 2), [406, 220]);
  assert.ok(sampleTrack(play.players['300,250'], second, true)[0] > 355);
  assert.deepEqual(sampleTrack(play.ball, .83).slice(0, 2), [459, 191]);
  assert.deepEqual(sampleTrack(play.players['300,250'], .83, true).slice(0, 2), [449, 192]);
});

test('through pass beats the runner to space, while crosses have a flight and landing', () => {
  const play = plays.through;
  assert.ok(sampleTrack(play.ball, .52)[0] > 500);
  assert.ok(sampleTrack(play.players['420,110'], .52, true)[0] < 500);
  for (const cross of [plays.crossviz, plays.earlycross, plays.sidechangeviz]) {
    assert.ok(sampleTrack(cross.ball, .49)[2] > 20);
    assert.equal(sampleTrack(cross.ball, .8)[2] ?? 0, 0);
  }
});

test('defensive actions keep the timing at the point of the pass or recovery', () => {
  const press = plays.press;
  assert.ok(sampleTrack(press.players['210,110'], .4, true)[0] < 150);
  assert.ok(sampleTrack(press.ball, .4)[0] < 115);
  assert.ok(sampleTrack(press.ball, .85)[0] > 130);
  const trap = plays.offtrap;
  const [kick] = trap.kicks[0];
  assert.equal(new Set(Object.values(trap.players).map(track => sampleTrack(track, kick, true)[0])).size, 1);
  assert.ok(sampleTrack(trap.players['430,90'], kick, true)[0] < 380);
  assert.deepEqual(sampleTrack(trap.ball, kick).slice(0, 2), [295, 288]);
});

test('reduced motion holds a meaningful frame and separate examples cut back without a reverse pass', () => {
  const play = plays.nearfar;
  assert.equal(phaseAt(play, 0, true), play.still);
  assert.equal(phaseAt(play, 3500, true), play.still);
  assert.equal(phaseAt(play, (play.seconds + 1) * 1000, false), phaseAt(play, 1000, false));
  assert.deepEqual(sampleTrack(play.ball, .49, false, play.cuts), [536, 256, 0]);
  assert.deepEqual(sampleTrack(play.ball, .5, false, play.cuts), [560, 340, 0]);
});
