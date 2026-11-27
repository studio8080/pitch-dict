(() => {
  const bar = document.querySelector('.thbar');
  if (!bar) return;
  const root = document.documentElement;
  const english = root.lang === 'en';
  const media = matchMedia('(prefers-color-scheme: dark)');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'tmode';
  toggle.setAttribute('aria-label', english ? 'Dark mode' : 'ダークモード');
  const read = () => { try { return localStorage.getItem('pd_theme'); } catch { return null; } };
  let preference = read();
  function apply() {
    const dark = preference === 'dark' || (preference !== 'light' && media.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.textContent = dark ? '☀' : '☾';
  }
  toggle.addEventListener('click', () => {
    preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('pd_theme', preference); } catch {}
    apply();
  });
  media.addEventListener('change', apply);
  bar.append(toggle);
  apply();
})();
