(() => {
  const header = document.querySelector('.ec-header');
  if (!header) return;

  const toggle = header.querySelector('.ec-menu-toggle');
  const nav = header.querySelector('.ec-nav');
  const courses = header.querySelector('.ec-dropdown');

  if (!toggle || !nav || !courses) return;

  const mobile = window.matchMedia('(max-width: 760px)');

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    if (!open) courses.open = false;
  }

  header.classList.add('is-enhanced');
  toggle.hidden = false;

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  mobile.addEventListener('change', () => setOpen(false));

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setOpen(false);
    else if (!courses.contains(event.target)) courses.open = false;
  });

  header.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    if (courses.open) {
      courses.open = false;
      courses.querySelector('summary').focus();
    } else if (mobile.matches && nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
})();
