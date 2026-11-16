/* Progressive controls for one static term's original SVG. No storage or network. */
(function () {
  'use strict';
  function start() {
    var english = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
    var copy = english ? {
      pause: 'Pause animation', resume: 'Resume animation', playing: 'Playing', paused: 'Paused',
      reduced: 'Still diagram: reduced motion is enabled on your device.'
    } : {
      pause: '動きを止める', resume: '再開する', playing: '再生中', paused: '停止中',
      reduced: '端末の「動きを抑える」設定に合わせて静止しています。'
    };
    document.querySelectorAll('[data-viz-controls]').forEach(function (viz, index) {
      if (viz.getAttribute('data-viz-ready')) return;
      viz.setAttribute('data-viz-ready', '1');
      if (!viz.id) viz.id = 'term-viz-' + index;
      var media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      var paused = false;
      var controls = document.createElement('div');
      controls.className = 'viz-controls';
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'viz-toggle';
      button.setAttribute('aria-controls', viz.id);
      var status = document.createElement('span');
      status.id = viz.id + '-status';
      status.className = 'viz-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      button.setAttribute('aria-describedby', status.id);
      controls.appendChild(button);
      controls.appendChild(status);
      viz.insertAdjacentElement('afterend', controls);
      function sync() {
        var reduced = !!(media && media.matches);
        viz.setAttribute('data-viz-paused', paused ? 'true' : 'false');
        button.hidden = reduced;
        button.disabled = reduced;
        button.textContent = paused ? copy.resume : copy.pause;
        status.textContent = reduced ? copy.reduced : (paused ? copy.paused : copy.playing);
      }
      // A native command button supplies Enter/Space behavior; its name is the next
      // action, while the associated live status describes the current state.
      button.addEventListener('click', function () {
        if (media && media.matches) return;
        paused = !paused;
        sync();
      });
      if (media && typeof media.addEventListener === 'function') media.addEventListener('change', sync);
      else if (media && typeof media.addListener === 'function') media.addListener(sync);
      sync();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
