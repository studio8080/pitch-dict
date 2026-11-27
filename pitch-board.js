/* Load the renderer when an eligible board reaches the viewport. */
(() => {
  'use strict';
  if (typeof IntersectionObserver !== 'function' || typeof ResizeObserver !== 'function') return;
  const part = 'svg > rect[fill^="url(#m"][fill$="g)"]';
  const records = new Map();
  let renderer;

  function loadRenderer() {
    if (!renderer) {
      renderer = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/assets/pitch-board-3d.js?v=3';
        script.onload = () => resolve(window.PitchBoard);
        script.onerror = reject;
        document.head.append(script);
      });
    }
    return renderer;
  }

  const visibility = new IntersectionObserver(entries => {
    for (const { target: host, isIntersecting } of entries) {
      const record = records.get(host);
      if (!isIntersecting || !record) continue;
      visibility.unobserve(host);
      loadRenderer().then(board => {
        if (records.get(host) !== record || !host.contains(record.svg)) return;
        const hero = host.id === 'heroViz';
        const heroPanel = document.getElementById('heroDemo');
        const playback = host.nextElementSibling;
        let camera;
        try { camera = JSON.parse(host.dataset.pbStartCamera || record.camera || 'null'); } catch {}
        record.controller = board?.mount(host, {
          lang: document.documentElement.lang,
          anchor: host,
          inside: playback?.matches('.viz-controls') ? playback : null,
          motionHost: hero ? heroPanel : host,
          withPause: (host.id === 'vizbox' || host.hasAttribute('data-pb-expanded')) &&
            !!host.querySelector('.mv,.mv2,.pulse,.dash,.fadein,.blinkel'),
          paused: host.dataset.pbStartPaused === 'true',
          playTime: Number(host.dataset.pbStartTime),
          camera,
        });
        if (!record.controller) showError(host);
      }).catch(() => { if (records.get(host) === record) showError(host); });
    }
  });

  function refresh() {
    const hosts = [...document.querySelectorAll('[data-pitch-board],#heroViz,#mback.open #vizbox,#vzoom.open .vz-content')];
    const views = new Map();
    for (const [host, record] of records) {
      if (hosts.includes(host) && host.contains(record.svg)) continue;
      views.set(host, host.dataset.pbCamera);
      visibility.unobserve(host);
      record.controller?.destroy();
      records.delete(host);
    }
    for (const host of hosts) {
      if (records.has(host)) continue;
      const svg = host.querySelector(part)?.ownerSVGElement;
      if (!svg) continue;
      records.set(host, { svg, camera: views.get(host) });
      visibility.observe(host);
    }
  }

  function showError(host) {
    host.dataset.pbView = 'error';
    const error = document.createElement('span');
    error.className = 'pb-load-error';
    error.setAttribute('role', 'status');
    error.textContent = document.documentElement.lang === 'en'
      ? 'The 3D board could not load. Reload the page to try again.'
      : '3Dボードを読み込めませんでした。ページを再読み込みしてください。';
    host.append(error);
  }

  const changes = new MutationObserver(refresh);
  for (const id of ['heroViz', 'mback', 'vzoom']) {
    const panel = document.getElementById(id);
    if (panel) changes.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  refresh();
})();
