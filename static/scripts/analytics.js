// TinyUtils - Vercel Web Analytics bootstrap (first-party, minimal)
// Loads the Vercel insights script and sets the global queue helper `va`.
;(function(){
  function hasAnalyticsConsentFromAdapter() {
    try {
      if (window.TinyUtilsConsent && typeof window.TinyUtilsConsent.hasAnalyticsConsent === 'function') {
        return !!window.TinyUtilsConsent.hasAnalyticsConsent();
      }
    } catch (e) {}
    // If no adapter is available, default to allowed so behavior
    // remains stable until CMP wiring is fully integrated.
    return true;
  }

  function loadVercelAnalytics() {
    if (window.va) return;
    window.va = window.va || function(){ (window.vaq = window.vaq || []).push(arguments); };
    var s = document.createElement('script');
    s.defer = true;
    s.src = '/_vercel/insights/script.js';
    document.head.appendChild(s);
  }

  function init() {
    if (!hasAnalyticsConsentFromAdapter()) return;
    loadVercelAnalytics();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
