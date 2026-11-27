import { createScene, initialCamera } from './pitch-scene.js';
import { kickAt, phaseAt, plays, sampleTrack } from './pitch-plays.mjs';
import styles from './pitch-board.css';

const SVG = 'http://www.w3.org/2000/svg';
const MOTION = '(prefers-reduced-motion: reduce)';
const MOVE = '.mv,.mv2,.fadein,.blinkel';
const COPY = {
  ja: { orbit: '視点操作', done: '視点操作を終了', reset: '視点を戻す', closer: '拡大', farther: '縮小', left: '左に回す', right: '右に回す', up: '視点を上げる', down: '視点を下げる', stage: '3D戦術ボード。ドラッグまたは矢印キーで視点を変更', pause: '動きを止める', play: '動きを再生', loading: '3D戦術ボードを読み込み中', failed: '3D戦術ボードを表示できませんでした。', retry: '再読み込み' },
  en: { orbit: 'Move camera', done: 'Done moving camera', reset: 'Reset view', closer: 'Zoom in', farther: 'Zoom out', left: 'Rotate left', right: 'Rotate right', up: 'Raise viewpoint', down: 'Lower viewpoint', stage: '3D tactical board. Drag or use the arrow keys to move the camera.', pause: 'Pause motion', play: 'Play motion', loading: 'Loading 3D tactical board', failed: 'The 3D tactical board could not be displayed.', retry: 'Retry' },
};

function readPitch(svg) {
  const [defs, turf, stripes] = svg.children;
  const { x, y, width, height } = svg.viewBox.baseVal;
  if (x !== 0 || y !== 0 || !width || !height || defs?.localName !== 'defs' ||
      !/^url\(#m\d+g\)$/.test(turf?.getAttribute('fill')) || stripes?.localName !== 'g' ||
      !/^url\(#m\d+v\)$/.test(svg.lastElementChild?.getAttribute('fill'))) return null;
  return { svg, width, depth: height, paint: [turf, stripes, svg.lastElementChild] };
}

function getPieces(svg) {
  return [...svg.querySelectorAll('circle[fill="url(#gA)"],circle[fill="url(#gB)"],circle[fill="url(#gBall)"]')]
    .filter(circle => circle.parentElement.localName === 'g' && circle.parentElement.firstElementChild?.localName === 'ellipse')
    .map(circle => ({
      group: circle.parentElement,
      kind: { 'url(#gA)': 'blue', 'url(#gB)': 'red', 'url(#gBall)': 'ball' }[circle.getAttribute('fill')],
      x: circle.cx.baseVal.value,
      y: circle.cy.baseVal.value,
    }));
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function bindCamera(stage, adjust, reset, interactive, touch) {
  const pointers = new Map();
  const listeners = new AbortController();
  const on = (type, callback, options = {}) => stage.addEventListener(type, callback, { ...options, signal: listeners.signal });
  const spread = () => {
    const [a, b] = pointers.values();
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  on('pointerdown', event => {
    if ((!interactive() && event.pointerType !== 'mouse') || event.button !== 0 || pointers.size === 2) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch' });
    if (event.pointerType === 'touch') touch(true);
    stage.setPointerCapture(event.pointerId);
    stage.setAttribute('data-pb-grab', '');
  });
  on('pointermove', event => {
    const last = pointers.get(event.pointerId);
    if (!last) return;
    const previousSpread = pointers.size === 2 ? spread() : 0;
    pointers.set(event.pointerId, { ...last, x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      if (previousSpread > 1) adjust(0, 0, spread() / previousSpread);
    } else {
      adjust(-(event.clientX - last.x) * 0.011, (event.clientY - last.y) * 0.009);
    }
  });
  const release = ({ pointerId }) => {
    const pointer = pointers.get(pointerId);
    pointers.delete(pointerId);
    if (!pointers.size) stage.removeAttribute('data-pb-grab');
    if (pointer?.touch && ![...pointers.values()].some(p => p.touch)) touch(false);
  };
  on('lostpointercapture', release);
  on('pointercancel', release);
  on('pointerup', release);
  on('wheel', event => {
    if (!interactive() || event.ctrlKey) return;
    event.preventDefault();
    adjust(0, 0, event.deltaY > 0 ? 0.89 : 1.12);
  }, { passive: false });
  const keys = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, 0.13], ArrowDown: [0, -0.13], '+': [0, 0, 1.16], '=': [0, 0, 1.16], '-': [0, 0, 1 / 1.16] };
  on('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (Object.hasOwn(keys, event.key)) adjust(...keys[event.key]);
    else if (event.key === 'Home') reset();
    else return;
    event.preventDefault();
  });
  return () => listeners.abort();
}

function arrangeLabels(stage, labels, scale) {
  const ordinary = labels.filter(({ text, pieceLabel }) => !pieceLabel && !text.classList.contains('pb-inline-caption'));
  const bounds = stage.getBoundingClientRect();
  ordinary.forEach(({ type }) => type.style.removeProperty('--pb-nudge'));
  const anchored = ordinary.map(label => ({ ...label, rect: label.text.getBoundingClientRect() }))
    .filter(({ rect }) => rect.left < bounds.right && rect.right > bounds.left && rect.top < bounds.bottom && rect.bottom > bounds.top)
    .sort((a, b) => a.rect.top - b.rect.top);
  const placed = [];
  anchored.forEach(({ type, rect }) => {
    const x = clamp(clamp(0, bounds.left + 5 - rect.left, Math.max(bounds.left + 5 - rect.left, bounds.right - 5 - rect.right)), -24, 24);
    const candidates = [0, 6, -6, 12, -12, 18, -18];
    const y = candidates.find(dy => rect.top + dy >= bounds.top + 3 && rect.bottom + dy <= bounds.bottom - 3 &&
      !placed.some(box => rect.left + x < box.right + 3 && rect.right + x > box.left - 3 &&
        rect.top + dy < box.bottom + 2 && rect.bottom + dy > box.top - 2)) ?? 0;
    if (x || y) type.style.setProperty('--pb-nudge', `translate(${x / scale}px,${y / scale}px)`);
    placed.push({ left: rect.left + x, right: rect.right + x, top: rect.top + y, bottom: rect.bottom + y });
  });
}

function prepareFrame({ svg, width, depth, paint }, copy, callbacks, play) {
  const stage = document.createElement('span');
  stage.className = 'pb-stage';
  stage.setAttribute('aria-label', copy.stage);
  stage.setAttribute('role', 'region');
  stage.tabIndex = 0;
  stage.style.setProperty('--pb-aspect', `${width + 60} / ${depth * 0.86 + 62}`);
  const plane = document.createElement('span');
  plane.className = 'pb-plane';
  plane.style.width = `${width}px`;
  plane.style.height = `${depth}px`;
  const status = document.createElement('span');
  status.className = 'pb-stage-status';
  status.setAttribute('role', 'status');
  svg.before(stage);
  stage.append(plane, status);
  plane.append(svg);
  paint.forEach(element => element.classList.add('pb-paint'));

  const pieces = getPieces(svg);
  const ballPiece = play && pieces.find(piece => piece.kind === 'ball');
  for (const piece of pieces) {
    piece.key = `${piece.x},${piece.y}`;
    piece.track = piece.kind === 'ball'
      ? (piece === ballPiece ? play.ball : play?.additionalBalls?.[piece.key])
      : play?.players?.[piece.key];
    piece.group.classList.add('pb-piece');
    if (piece.track) piece.group.classList.add('pb-tracked');
  }
  if (play && !ballPiece) pieces.push({ kind: 'ball', track: play.ball });
  const captions = [...svg.children].filter(text => text.localName === 'text' &&
    Number(text.getAttribute('y')) >= depth - 26 && text.getAttribute('text-anchor') === 'middle' &&
    !text.getAttribute('class') && text.textContent.trim());
  const caption = captions.length === 1 ? document.createElement('span') : null;
  if (caption) {
    caption.className = 'pb-caption';
    caption.textContent = captions[0].textContent;
    captions[0].classList.add('pb-inline-caption');
    stage.after(caption);
  }

  const labels = [...svg.querySelectorAll('text')].filter(text =>
    text.hasAttribute('y') && Number.isFinite(Number(text.getAttribute('y')))).map(text => {
    const x = Number(text.getAttribute('x')) || 0;
    const y = Number(text.getAttribute('y'));
    const pieceLabel = text.parentElement.classList.contains('pb-piece');
    const [anchorX, anchorY] = play?.labels?.[`${x},${y}`] ?? [x, y];
    const type = document.createElementNS(SVG, 'g');
    type.setAttribute('class', pieceLabel ? 'pb-type pb-label' : 'pb-type');
    type.style.setProperty('--pb-anchor', `translate(${anchorX}px,${anchorY}px)`);
    type.style.setProperty('--pb-unanchor', `translate(${-x}px,${-y}px)`);
    type.style.setProperty('--pb-font', `${Math.max(Number(text.getAttribute('font-size')) || 13, pieceLabel ? 13 : 17.5)}px`);
    text.before(type);
    type.append(text);
    return { text, type, pieceLabel };
  });

  let canvas, scene, scenePieces, projection, lastWidth, lastHeight;
  const signalLost = event => {
    event.preventDefault();
    callbacks.fail();
  };
  function stop() {
    canvas?.removeEventListener('webglcontextlost', signalLost);
    scene?.dispose();
    canvas?.remove();
    canvas = scene = scenePieces = projection = lastWidth = lastHeight = undefined;
  }
  function start() {
    stage.dataset.pbState = 'loading';
    status.textContent = copy.loading;
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    stage.prepend(canvas);
    canvas.addEventListener('webglcontextlost', signalLost);
    stage.tabIndex = 0;
    scene = createScene(canvas, { width, depth, pieces });
    scenePieces = pieces.map(piece => {
      const fades = !piece.track && piece.group?.matches('.fadein,.blinkel,[opacity]');
      return { ...piece, fades, move: scene.addPiece(piece.kind, fades) };
    });
  }

  function draw(view, elapsed, still, phase) {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!scene || !w || !h) return;
    if (lastWidth !== w || lastHeight !== h) {
      lastWidth = w;
      lastHeight = h;
      scene.resize(w, h);
      projection = undefined;
    }
    if (view !== projection) {
      const { plane: matrix, lettering, scale, labelLift } = scene.configureView(w, h, view);
      plane.style.transform = matrix;
      plane.style.setProperty('--pb-lettering', lettering);
      plane.style.setProperty('--pb-label-lift', `${-labelLift}px`);
      arrangeLabels(stage, labels, scale);
      projection = view;
    }
    const root = svg.getCTM();
    if (!root) return;
    const inverse = root.inverse();
    for (const { group, kind, key, x, y, track, fades, move } of scenePieces) {
      const player = kind !== 'ball';
      const kick = player && play?.kicks ? kickAt(play, key, phase) : null;
      const heading = kick?.heading ?? play?.face?.[key];
      if (track) {
        const [pitchX, pitchY, lift = 0] = sampleTrack(track, phase, player, play.cuts);
        if (player) group.style.setProperty('--pb-track-shift', `translate(${pitchX - x}px,${pitchY - y}px)`);
        move(pitchX, pitchY, 1, elapsed, still, lift, heading, kick?.strike);
        continue;
      }
      const offset = inverse.multiply(group.getCTM());
      const opacity = fades ? Number(getComputedStyle(group).opacity) : 1;
      move(offset.a * x + offset.c * y + offset.e, offset.b * x + offset.d * y + offset.f, opacity, elapsed, still, 0, heading, kick?.strike);
    }
    scene.draw();
    stage.dataset.pbState = 'ready';
    if (status.textContent) status.textContent = '';
  }

  const resize = new ResizeObserver(callbacks.draw);
  resize.observe(stage);
  const unbind = bindCamera(stage, callbacks.adjust, callbacks.reset, callbacks.interactive, callbacks.touch);
  return {
    start, draw, animated: !!play || pieces.some(({ group }) => group?.matches(MOVE)),
    fail() {
      stop();
      stage.dataset.pbState = 'error';
      status.textContent = copy.failed;
      stage.tabIndex = -1;
    },
    destroy() {
      stop();
      resize.disconnect();
      unbind();
      labels.forEach(({ text, type }) => type.replaceWith(text));
      for (const { group } of pieces) {
        group?.classList.remove('pb-piece', 'pb-tracked');
        group?.style.removeProperty('--pb-track-shift');
      }
      paint.forEach(element => element.classList.remove('pb-paint'));
      captions.forEach(text => text.classList.remove('pb-inline-caption'));
      caption?.remove();
      stage.replaceWith(svg);
    },
  };
}

function createControls(host, { anchor = host, withPause, inside }, copy, view, actions) {
  const controls = document.createElement('div');
  controls.className = 'pb-controls';
  const rail = document.createElement('div');
  rail.className = 'pb-camera-controls';
  const step = document.createElement('div');
  step.className = 'pb-steps';
  const button = (text, parent, action, label) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = text;
    element.setAttribute('aria-controls', host.id);
    if (label) { element.setAttribute('aria-label', label); element.title = label; }
    element.addEventListener('click', action);
    parent.append(element);
    return element;
  };
  controls.append(rail, step);
  const orbit = view ? button(copy.orbit, rail, actions.toggle) : null;
  if (orbit) orbit.className = 'pb-orbit';
  const reset = view ? button('↺', rail, actions.reset, copy.reset) : null;
  const pause = withPause ? button(copy.pause, rail, actions.pause) : null;
  const retry = view ? button(copy.retry, rail, actions.retry) : null;
  if (view) {
    button('←', step, () => actions.adjust(-0.18, 0), copy.left);
    button('→', step, () => actions.adjust(0.18, 0), copy.right);
    button('↑', step, () => actions.adjust(0, 0.14), copy.up);
    button('↓', step, () => actions.adjust(0, -0.14), copy.down);
    button('−', step, () => actions.adjust(0, 0, 1 / 1.18), copy.farther);
    button('+', step, () => actions.adjust(0, 0, 1.18), copy.closer);
  }
  if (inside) inside.prepend(controls);
  else anchor.after(controls);
  return { controls, rail, step, orbit, reset, pause, retry };
}

let counter = 0;

export function mount(host, options = {}) {
  const diagrams = [...host.querySelectorAll('svg')];
  const pitches = diagrams.map(readPitch).filter(Boolean);
  if (!pitches.length && !options.withPause) return null;
  if (!document.getElementById('pitch-board-style')) {
    const style = document.createElement('style');
    style.id = 'pitch-board-style';
    style.textContent = styles;
    document.head.append(style);
  }
  if (!host.id) host.id = `pitch-board-${++counter}`;
  const copy = COPY[options.lang] || COPY.ja;
  const motion = matchMedia(MOTION);
  const motionHost = options.motionHost || host;
  const comparison = pitches.length > 1 ? host.firstElementChild : null;
  comparison?.classList.add('pb-compare');
  let view = initialCamera;
  if (options.camera && ['yaw', 'pitch', 'zoom'].every(key => Number.isFinite(options.camera[key]))) view = options.camera;
  let active = true, visible = true, paused = options.paused === true, orbit = false, failed = false;
  let staticMotion = options.reduceMotion || false;
  let request = 0, lastDraw = -Infinity;
  let playTime = Number.isFinite(options.playTime) && options.playTime > 0 ? options.playTime : 0;
  let lastPlayFrame = null;

  const key = host.dataset.vizKey;
  const play = pitches.length === 1 && Object.hasOwn(plays, key) ? plays[key] : null;
  const frames = pitches.map(pitch => prepareFrame(pitch, copy, {
    fail, draw: schedule, adjust, reset, interactive: () => orbit && !failed, touch: enabled => options.onInteraction?.(enabled),
  }, play));
  const animated = frames.some(frame => frame.animated);
  const toggle = () => {
    orbit = !orbit;
    if (!orbit) options.onInteraction?.(false);
    sync();
  };
  const ui = createControls(host, options, copy, frames.length, {
    adjust, reset, toggle, retry: start, pause() { paused = !paused; sync(); },
  });

  function adjust(yaw, pitch, zoom = 1) {
    if (failed) return;
    view = { yaw: (view.yaw + yaw) % (2 * Math.PI), pitch: clamp(view.pitch + pitch, 0.38, 1.44), zoom: clamp(view.zoom * zoom, 0.83, 2.75) };
    sync();
  }
  function reset() { view = initialCamera; sync(); }

  function fail() {
    failed = true;
    if (orbit) {
      orbit = false;
      options.onInteraction?.(false);
    }
    frames.forEach(frame => frame.fail());
    sync();
  }
  function start() {
    failed = false;
    lastPlayFrame = null;
    try { frames.forEach(frame => frame.start()); }
    catch { fail(); return; }
    sync();
  }

  function stopped() {
    return paused || !active || !visible || document.hidden || motionHost.dataset.vizPaused === 'true' || motionHost.dataset.paused === 'true';
  }
  function schedule() {
    if (frames.length && !failed && active && visible && !document.hidden && !request) request = requestAnimationFrame(draw);
  }
  function draw(now) {
    request = 0;
    if (failed || !active || !visible || document.hidden) return;
    const elapsed = now - lastDraw;
    const reduced = staticMotion || motion.matches;
    const still = stopped() || reduced;
    if (!animated || elapsed >= 1000 / 30 - 0.6 || still) {
      if (play && !still) {
        if (lastPlayFrame !== null) playTime += Math.min(now - lastPlayFrame, 100);
        lastPlayFrame = now;
      }
      const phase = play ? phaseAt(play, playTime, reduced) : 0;
      try { frames.forEach(frame => frame.draw(view, Number.isFinite(elapsed) ? elapsed : 33, still, phase)); }
      catch { fail(); return; }
      if (play) host.dataset.pbPlayTime = String(playTime);
      lastDraw = now;
    }
    if (animated && !still) schedule();
  }

  function sync() {
    const still = staticMotion || motion.matches;
    if (still || stopped()) lastPlayFrame = null;
    host.toggleAttribute('data-pb-static', still);
    host.toggleAttribute('data-pb-stop', stopped());
    host.toggleAttribute('data-pb-orbit', orbit);
    if (frames.length) {
      host.dataset.pbView = failed ? 'error' : '3d';
      host.dataset.pbCamera = JSON.stringify(view);
      ui.orbit.hidden = ui.reset.hidden = failed;
      ui.orbit.textContent = orbit ? copy.done : copy.orbit;
      ui.orbit.setAttribute('aria-pressed', String(orbit));
      ui.retry.hidden = !failed;
    }
    ui.step.hidden = !orbit || failed;
    if (ui.pause) {
      ui.pause.textContent = paused ? copy.play : copy.pause;
      ui.pause.hidden = still || failed;
    }
    ui.controls.hidden = !frames.length && (!ui.pause || ui.pause.hidden);
    lastDraw = -Infinity;
    schedule();
  }

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  intersection.observe(host);
  const observer = new MutationObserver(sync);
  observer.observe(motionHost, { attributes: true, attributeFilter: ['data-viz-paused', 'data-paused'] });
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  start();

  return {
    setActive(enabled) {
      active = enabled;
      if (!enabled && orbit) toggle();
      else sync();
    },
    setReducedMotion(enabled) { staticMotion = enabled; sync(); },
    destroy() {
      if (orbit) options.onInteraction?.(false);
      cancelAnimationFrame(request);
      intersection.disconnect();
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
      frames.forEach(frame => frame.destroy());
      ui.controls.remove();
      for (const name of ['static', 'stop', 'orbit', 'view', 'camera', 'play-time']) host.removeAttribute(`data-pb-${name}`);
      comparison?.classList.remove('pb-compare');
    },
  };
}
