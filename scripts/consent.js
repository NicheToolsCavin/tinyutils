(function(){
  // Minimal consent helper for TinyUtils.
  // Responsibilities:
  // - Manage the local "hide ads" toggle (tu-ads-hidden) so users can reduce
  //   visual noise without changing how Google serves ads.
  // - Provide a helper to re-open the official Google Funding Choices dialog
  //   when it is available (three-option Google CMP banner).

  const ADS_KEY = 'tu-ads-hidden';

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function initAdsToggle() {
    var el = document.getElementById('tu-ads-toggle');
    if (!el) return;
    var stored = read(ADS_KEY);
    if (stored === '1') {
      document.documentElement.classList.add('ads-hidden');
    }

    el.addEventListener('change', function (event) {
      var on = !!event.target.checked;
      document.documentElement.classList.toggle('ads-hidden', on);
      save(ADS_KEY, on ? '1' : '0');
    });
  }

  function init() {
    initAdsToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose a minimal helper so pages like /cookies.html can politely request
  // that the official Google Funding Choices dialog be shown again, when present.
  try {
    window.tuConsent = window.tuConsent || {};
    window.tuConsent.reopen = function () {
      try {
        if (window.googlefc && typeof window.googlefc.showDialog === 'function') {
          window.googlefc.showDialog();
          return;
        }
      } catch (e) {}
      // Fallback: if Funding Choices is not available, do nothing here;
      // we avoid showing any custom banner that could conflict with Google CMP.
    };
  } catch (e) {
    // If the global cannot be set (very old browsers), we simply skip the helper.
  }
})();

