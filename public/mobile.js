(() => {
  const mobile = matchMedia('(max-width: 800px)');
  const menu = document.getElementById('navigation-dialog');
  const toggle = document.getElementById('menu-toggle');
  const navigation = document.querySelector('.app-nav');
  const filters = document.getElementById('filter-disclosure');
  function closeMenu() { if (menu.open) menu.close(); }
  function layout() {
    closeMenu();
    document.getElementById(mobile.matches ? 'mobile-navigation-slot' : 'desktop-navigation-slot').append(navigation);
    filters.open = !mobile.matches;
  }
  toggle.addEventListener('click', () => {
    menu.showModal();
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('navigation-open');
    menu.querySelector('[aria-current="page"]')?.focus();
  });
  menu.addEventListener('close', () => {
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('navigation-open');
  });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-view], [data-discard]')) closeMenu();
  });
  filters.addEventListener('toggle', () => { if (!mobile.matches && !filters.open) filters.open = true; });
  document.getElementById('filter-form').addEventListener('invalid', () => { filters.open = true; }, true);
  document.getElementById('filter-form').addEventListener('submit', () => {
    if (mobile.matches) filters.open = false;
  });
  mobile.addEventListener('change', layout);
  window.addEventListener('pagehide', closeMenu);
  layout();
})();
