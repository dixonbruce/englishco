

  // Toggle main menu (mobile)
  const btn = document.querySelector('.hamburger');
  const menu = document.getElementById('main-menu');
  btn.addEventListener('click', () => {
    menu.classList.toggle('open');
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
  });

  // Reflect submenu expanded state for a11y (mobile)
  const chk = document.getElementById('toggle-cursos');
  const lab = document.querySelector('label[for="toggle-cursos"]');
  chk.addEventListener('change', () => {
    lab.setAttribute('aria-expanded', String(chk.checked));
  });
