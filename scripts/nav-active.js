;(function () {
  function markActiveMany(hrefs, currentHref) {
    if (!hrefs || !hrefs.length) return;
    var nav = document.querySelector('header .nav');
    if (!nav) return;

    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href]'));
    for (var i = 0; i < links.length; i++) {
      links[i].classList.remove('active');
      links[i].removeAttribute('aria-current');
    }

    for (var j = 0; j < links.length; j++) {
      var href = links[j].getAttribute('href');
      if (hrefs.indexOf(href) !== -1) {
        links[j].classList.add('active');
        if (currentHref && href === currentHref) {
          links[j].setAttribute('aria-current', 'page');
        }
      }
    }
  }

  function markActive(href) {
    markActiveMany([href], href);
  }

  function markBrandActive() {
    var brand = document.querySelector('header .brand');
    if (!brand) return;
    brand.classList.add('active');
    brand.setAttribute('aria-current', 'page');
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onReady(function () {
    var path = (window.location && window.location.pathname) || '/';
    if (!path) path = '/';

    if (path === '/' || path === '/index.html') {
      markBrandActive();
      return;
    }

    if (path === '/about.html') return markActive('/about.html');
    if (path.indexOf('/blog/') === 0 || path === '/blog') return markActive('/blog/');
    if (path.indexOf('/tools/') === 0 || path === '/tools') return markActive('/tools/');

    if (path === '/privacy.html') return markActive('/privacy.html');
    if (path === '/terms.html') return markActiveMany(['/privacy.html', '/terms.html'], '/terms.html');
    if (path === '/cookies.html') return markActiveMany(['/privacy.html', '/cookies.html'], '/cookies.html');
  });
})();
