(function(){
  // Minimal consent helper for TinyUtils.
  // Responsibilities:
  // - Manage the local "hide ads" toggle (tu-ads-hidden) so users can reduce
  //   visual noise without changing how Google serves ads.

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

})();
