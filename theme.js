// WaxFrame — shared theme utility
// Build: 20260415-001
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('waxframe_v2_theme', t);
  document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === t));
}
(function() {
  const t = localStorage.getItem('waxframe_v2_theme') || 'auto';
  setTheme(t);
})();
