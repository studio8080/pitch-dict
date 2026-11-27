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
        script.src = '/assets/pitch-board-3d.js?v=1';
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
        const zoom = host.classList.contains('vz-content');
        const heroPanel = document.getElementById('heroDemo');
        const playback = host.nextElementSibling;
        record.controller = board?.mount(host, {
          lang: document.documentElement.lang,
          anchor: hero ? document.getElementById('heroExpand') : host,
          inside: playback?.matches('.viz-controls') ? playback : null,
          motionHost: hero ? heroPanel : host,
          withPause: host.id === 'vizbox' && !!host.querySelector('.mv,.mv2,.pulse,.dash,.fadein,.blinkel'),
          view: zoom ? host.dataset.startView : record.view,
          controls: !zoom,
        });
      }).catch(() => {}); // The original diagram stays available if 3D can't load.
    }
  });

  function refresh() {
    const hosts = [...document.querySelectorAll('[data-pitch-board],#heroViz,#mback.open #vizbox,#vzoom.open .vz-content')];
    const views = new Map();
    for (const [host, record] of records) {
      if (hosts.includes(host) && host.contains(record.svg)) continue;
      views.set(host, host.dataset.pbView);
      visibility.unobserve(host);
      record.controller?.destroy();
      records.delete(host);
    }
    for (const host of hosts) {
      if (records.has(host)) continue;
      const svg = host.querySelector(part)?.ownerSVGElement;
      if (!svg) continue;
      records.set(host, { svg, view: views.get(host) });
      visibility.observe(host);
    }
  }

  const changes = new MutationObserver(refresh);
  for (const id of ['heroViz', 'mback', 'vzoom']) {
    const panel = document.getElementById(id);
    if (panel) changes.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  refresh();
})();
