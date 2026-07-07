/**
 * {{CLIENT_NAME}} -- shared site JS.
 * Single file, deferred. Nav toggle + scroll-reveal only -- add
 * page-specific behavior inline or in a page-scoped script, not here,
 * so this stays a stable shared contract across every page.
 */

(function initNav() {
  var toggle = document.querySelector('[data-nav-toggle]');
  var menu = document.getElementById('site-nav-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', function () {
    var isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    document.documentElement.style.overflow = isOpen ? 'hidden' : '';
  });
})();

(function initReveal() {
  var targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-revealed'); });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach(function (el) { observer.observe(el); });
})();

(function initFooterYear() {
  var el = document.querySelector('[data-year]');
  if (el) el.textContent = String(new Date().getFullYear());
})();
