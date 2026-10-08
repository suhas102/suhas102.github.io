// theme + mobile menu
const root = document.documentElement;
const toggle = document.getElementById('themeToggle');
const saved = localStorage.getItem('suhas-theme');
if (saved) root.setAttribute('data-theme', saved);
toggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('suhas-theme', next);
});
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
menuBtn.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
});
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

// highlight the nav link for the section in view
const sections = [...document.querySelectorAll('main section[id]')];
const linkFor = id => navLinks.querySelector(`a[href="#${id}"]`);
const navObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.querySelectorAll('a').forEach(a => a.classList.remove('active'));
    const link = linkFor(e.target.id);
    if (link) link.classList.add('active');
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(s => navObserver.observe(s));

// fade cards in as they scroll into view
const revealTargets = document.querySelectorAll('.card, .job, .skill, .edu, .fact');
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); }
  });
}, { threshold: 0.12 });
revealTargets.forEach(el => { el.classList.add('reveal'); revealObserver.observe(el); });
