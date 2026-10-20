// Runs before first paint (external file so the CSP can stay strict) to avoid a theme flash.
(function () {
  try {
    var m = localStorage.getItem('gs-theme');
    var dark = m === 'dark' || (m !== 'light' && !matchMedia('(prefers-color-scheme: light)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
