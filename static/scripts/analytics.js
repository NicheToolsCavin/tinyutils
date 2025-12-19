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

  // Delay analytics init until after first user interaction to improve INP
  function initOnInteraction() {
    init();
    // Remove listeners after first interaction
    removeEventListener('click', initOnInteraction, { once: true });
    removeEventListener('keydown', initOnInteraction, { once: true });
    removeEventListener('touchstart', initOnInteraction, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Wait for first interaction before loading analytics
      addEventListener('click', initOnInteraction, { once: true });
      addEventListener('keydown', initOnInteraction, { once: true });
      addEventListener('touchstart', initOnInteraction, { once: true });
      // Fallback: load after 3 seconds if no interaction
      setTimeout(init, 3000);
    });
  } else {
    // Page already loaded, wait for interaction or 3s timeout
    addEventListener('click', initOnInteraction, { once: true });
    addEventListener('keydown', initOnInteraction, { once: true });
    addEventListener('touchstart', initOnInteraction, { once: true });
    setTimeout(init, 3000);
  }
})();
