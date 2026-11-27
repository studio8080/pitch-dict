import { createScene, elevation, rise } from './pitch-scene.js';
import styles from './pitch-board.css';

const SVG = 'http://www.w3.org/2000/svg';
const MOTION = '(prefers-reduced-motion: reduce)';
const COPY = {
  ja: { angles: '戦術ボードの視点', flat: '真上', model: '3D', pause: '動きを止める', play: '動きを再生' },
  en: { angles: 'Tactical board view', flat: 'Top view', model: '3D', pause: 'Pause motion', play: 'Play motion' },
};

// The saved SVG is the source of the scene. The pitch helper's turf, stripes
// and vignette are unique to pitch diagrams. Charts and illustrations stay 2D.
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

function prepareFrame({ svg, width, depth, paint }, onFailure, beforeDraw) {
  const frameWidth = width + 58;
  const frameHeight = depth * elevation + 48;
  const stage = document.createElement('span');
  stage.className = 'pb-stage';
  stage.style.setProperty('--pb-aspect', `${frameWidth} / ${frameHeight}`);
  stage.style.setProperty('--pb-side', `${(frameWidth - width) / frameWidth * 50}%`);
  stage.style.setProperty('--pb-wide', `${width / frameWidth * 100}%`);
  stage.style.setProperty('--pb-top', `${24 / frameHeight * 100}%`);
  stage.style.setProperty('--pb-tilt', elevation);
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  svg.before(stage);
  stage.append(canvas, svg);
  paint.forEach(element => element.classList.add('pb-paint'));

  const pieces = getPieces(svg);
  pieces.forEach(({ group }) => group.classList.add('pb-piece'));
  const captionCandidate = [...svg.children].filter(text => text.localName === 'text' &&
    Number(text.getAttribute('y')) >= depth - 26 && text.getAttribute('text-anchor') === 'middle' &&
    !text.getAttribute('class') && text.textContent.trim());
  const caption = captionCandidate.length === 1 ? document.createElement('span') : null;
  if (caption) {
    caption.className = 'pb-caption';
    caption.hidden = true;
    caption.textContent = captionCandidate[0].textContent;
    captionCandidate[0].classList.add('pb-inline-caption');
    stage.after(caption);
  }

  const labels = [...svg.querySelectorAll('text')].filter(text => text.hasAttribute('y') && Number.isFinite(Number(text.getAttribute('y')))).map(text => {
    const y = Number(text.getAttribute('y'));
    const parent = text.parentElement;
    const pieceLabel = parent.classList.contains('pb-piece');
    const shift = pieceLabel ? -10.9 * rise / elevation : 0;
    const type = document.createElementNS(SVG, 'g');
    type.setAttribute('class', pieceLabel ? 'pb-type pb-label' : 'pb-type');
    type.style.setProperty('--pb-type', `translateY(${y + shift}px) scaleY(${1 / elevation}) translateY(${-y}px)`);
    type.style.setProperty('--pb-font', `${Math.max(Number(text.getAttribute('font-size')) || 13, pieceLabel ? 10 : 16)}px`);
    text.before(type);
    type.append(text);
    return { text, type };
  });

  let scene;
  let lastWidth = 0;
  let lastHeight = 0;
  let scenePieces = [];
  const signalLost = event => {
    event.preventDefault();
    onFailure();
  };
  canvas.addEventListener('webglcontextlost', signalLost);

  function show(model) {
    if (model && !scene) {
      scene = createScene(canvas, { width, depth, frameWidth, frameHeight });
      scenePieces = pieces.map(piece => {
        const fades = piece.group.matches('.fadein,.blinkel,[opacity]');
        return { ...piece, fades, move: scene.addPiece(piece.kind, fades) };
      });
    }
    stage.dataset.pbView = model ? '3d' : '2d';
    if (caption) caption.hidden = !model;
  }

  function draw() {
    const { clientWidth: w, clientHeight: h } = stage;
    if (!scene || !w || !h) return;
    if (lastWidth !== w || lastHeight !== h) {
      lastWidth = w;
      lastHeight = h;
      scene.resize(w, h);
    }
    const root = svg.getCTM();
    if (!root) return;
    const inverse = root.inverse();
    for (const { group, x, y, fades, move } of scenePieces) {
      const offset = inverse.multiply(group.getCTM());
      const opacity = fades ? Number(getComputedStyle(group).opacity) : 1;
      move(offset.a * x + offset.c * y + offset.e, offset.b * x + offset.d * y + offset.f, opacity);
    }
    scene.draw();
  }

  const resize = new ResizeObserver(beforeDraw);
  resize.observe(stage);
  return {
    show, draw, animated: pieces.some(({ group }) => group.matches('.mv,.mv2,.fadein,.blinkel')),
    stop() {
      canvas.removeEventListener('webglcontextlost', signalLost);
      scene?.dispose();
      scene = undefined;
    },
    destroy() {
      resize.disconnect();
      labels.forEach(({ text, type }) => type.replaceWith(text));
      pieces.forEach(({ group }) => group.classList.remove('pb-piece'));
      paint.forEach(element => element.classList.remove('pb-paint'));
      captionCandidate.forEach(text => text.classList.remove('pb-inline-caption'));
      caption?.remove();
      stage.replaceWith(svg);
    },
  };
}

function createControls(host, { anchor = host, lang, withPause, inside }) {
  const copy = COPY[lang] || COPY.ja;
  const controls = document.createElement('div');
  controls.className = 'pb-controls';
  const views = document.createElement('div');
  views.className = 'pb-views';
  views.setAttribute('role', 'group');
  views.setAttribute('aria-label', copy.angles);
  const button = (text, parent) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = text;
    element.setAttribute('aria-controls', host.id);
    parent.append(element);
    return element;
  };
  controls.append(views);
  const model = button(copy.model, views);
  const flat = button(copy.flat, views);
  const pause = withPause ? button(copy.pause, controls) : null;
  if (pause) pause.className = 'pb-pause';
  if (inside) inside.prepend(controls);
  else anchor.after(controls);
  return { controls, views, model, flat, pause, copy };
}

let counter = 0;

export function mount(host, options = {}) {
  if (typeof ResizeObserver !== 'function' || typeof IntersectionObserver !== 'function') return null;
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
  const motion = matchMedia(MOTION);
  const motionHost = options.motionHost || host;
  const comparison = diagrams.length > 1 ? host.firstElementChild : null;
  comparison?.classList.add('pb-compare');
  const ui = options.controls === false ? null : createControls(host, options);
  let active = true;
  let visible = true;
  let paused = false;
  let staticMotion = options.reduceMotion || false;
  let failed = false;
  let model = false;
  let request = 0;
  let lastDraw = -Infinity;

  const frames = pitches.map(pitch => prepareFrame(pitch, fallback, schedule));
  const animated = frames.some(frame => frame.animated);
  function fallback() {
    failed = true;
    setView(false);
    frames.forEach(frame => frame.stop());
  }

  function stopped() {
    return paused || !active || !visible || document.hidden || motionHost.dataset.vizPaused === 'true' || motionHost.dataset.paused === 'true';
  }

  function schedule() {
    if (model && active && visible && !document.hidden && !request) request = requestAnimationFrame(draw);
  }

  function draw(now) {
    request = 0;
    if (!model || !active || !visible || document.hidden) return;
    if (!animated || now - lastDraw >= 1000 / 30 - 0.6 || stopped() || staticMotion || motion.matches) {
      try {
        frames.forEach(frame => frame.draw());
        lastDraw = now;
      } catch {
        fallback();
        return;
      }
    }
    if (animated && !stopped() && !staticMotion && !motion.matches) schedule();
  }

  function sync() {
    const still = staticMotion || motion.matches;
    host.toggleAttribute('data-pb-static', still);
    host.toggleAttribute('data-pb-stop', stopped());
    if (ui) {
      ui.views.hidden = failed || !frames.length;
      ui.model.setAttribute('aria-pressed', String(model));
      ui.flat.setAttribute('aria-pressed', String(!model));
      if (ui.pause) {
        ui.pause.textContent = paused ? ui.copy.play : ui.copy.pause;
        ui.pause.hidden = still;
      }
      ui.controls.hidden = ui.views.hidden && (!ui.pause || ui.pause.hidden);
    }
    lastDraw = -Infinity;
    schedule();
  }

  function setView(nextModel) {
    model = nextModel && frames.length > 0 && !failed;
    try {
      frames.forEach(frame => frame.show(model));
    } catch {
      fallback();
      return;
    }
    host.dataset.pbView = model ? '3d' : '2d';
    if (comparison) comparison.dataset.pbComparison = host.dataset.pbView;
    sync();
  }

  ui?.model.addEventListener('click', () => setView(true));
  ui?.flat.addEventListener('click', () => setView(false));
  ui?.pause?.addEventListener('click', () => {
    paused = !paused;
    sync();
  });
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  intersection.observe(host);
  const observer = new MutationObserver(sync);
  observer.observe(motionHost, { attributes: true, attributeFilter: ['data-viz-paused', 'data-paused'] });
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  setView(options.view !== '2d');

  return {
    setActive(enabled) { active = enabled; sync(); },
    setReducedMotion(enabled) { staticMotion = enabled; sync(); },
    destroy() {
      cancelAnimationFrame(request);
      intersection.disconnect();
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
      frames.forEach(frame => { frame.stop(); frame.destroy(); });
      ui?.controls.remove();
      host.removeAttribute('data-pb-static');
      host.removeAttribute('data-pb-stop');
      host.removeAttribute('data-pb-view');
      comparison?.classList.remove('pb-compare');
      comparison?.removeAttribute('data-pb-comparison');
    },
  };
}
