// Toggle main menu (mobile)
const btn = document.querySelector('.hamburger');
const menu = document.getElementById('main-menu');

if (btn && menu) {
  btn.addEventListener('click', () => {
    menu.classList.toggle('open');
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
  });
}

// Reflect submenu expanded state for a11y (mobile)
const chk = document.getElementById('toggle-cursos');
const lab = document.querySelector('label[for="toggle-cursos"]');
if (chk && lab) {
  chk.addEventListener('change', () => {
    lab.setAttribute('aria-expanded', String(chk.checked));
  });
}
