
  const burger = document.querySelector('.hamburger');
  const menu = document.getElementById('main-menu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
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
