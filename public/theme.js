// Apply before the stylesheet loads. Only explicit theme choices are saved.
(() => {
  let theme = 'modern';
  try { if (localStorage.getItem('verdestats-theme') === 'legacy') theme = 'legacy'; } catch (_) {}
  function apply() {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'legacy' ? '#050505' : '#0d1117');
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    });
  }
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', () => {
      if (!['modern', 'legacy'].includes(button.dataset.themeChoice)) return;
      theme = button.dataset.themeChoice;
      try { localStorage.setItem('verdestats-theme', theme); } catch (_) {}
      apply();
    }));
  });
})();
