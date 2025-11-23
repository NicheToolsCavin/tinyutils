;(function(){
  const ADS_HIDDEN_KEY = 'tu-ads-hidden';

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function initAdsToggle() {
    var el = document.getElementById('tu-ads-toggle');
    if (!el) return;
    var stored = read(ADS_HIDDEN_KEY);
    if (stored === '1') {
      document.documentElement.classList.add('ads-hidden');
      el.checked = true;
    }

    el.addEventListener('change', function (event) {
      var hide = !!event.target.checked;
      document.documentElement.classList.toggle('ads-hidden', hide);
      save(ADS_HIDDEN_KEY, hide ? '1' : '0');
    });
  }

  function initAdapter() {
    // Expose a tiny adapter that other scripts can use to consult
    // CMP-provided consent state. Funding Choices remains the
    // canonical source of consent; this object is just a thin
    // compatibility layer. In the absence of CMP wiring, it
    // defaults to `true` to avoid surprising regressions.
    var adapter = window.TinyUtilsConsent || {};
    if (typeof adapter.hasAnalyticsConsent !== 'function') {
      adapter.hasAnalyticsConsent = function () { return true; };
    }
    if (typeof adapter.hasAdsConsent !== 'function') {
      adapter.hasAdsConsent = function () { return true; };
    }
    window.TinyUtilsConsent = adapter;
  }

  function init() {
    initAdsToggle();
    initAdapter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
