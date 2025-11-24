(function(){
  const DISMISS_KEY = 'adToastDismissedAt';
  const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  function now(){ try { return Date.now(); } catch { return new Date().getTime(); } }
  function read(k){ try { return localStorage.getItem(k); } catch { return null; } }
  function save(k,v){ try { localStorage.setItem(k,v); } catch {} }

  function shouldShow(){
    // respect 7-day dismissal
    const ts = parseInt(read(DISMISS_KEY)||'0',10)||0;
    if (ts && (now() - ts) < TTL_MS) return false;
    return true;
  }

  function makeToast(){
    if (!shouldShow()) return;
    const toast = document.createElement('div');
    toast.className = 'adblock-toast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    toast.innerHTML = '<div class="adblock-toast__inner">' +
      '<strong>Heads up</strong><p>Ads seem blocked. TinyUtils uses small, non-intrusive ads to help cover hosting and development costs, but the tools still work if you prefer to keep blocking them.</p>' +
      '<button class="adblock-toast__dismiss" aria-label="Dismiss notice">Dismiss</button>' +
      '</div>';
    document.body.appendChild(toast);
    const btn = toast.querySelector('.adblock-toast__dismiss');
    function dismiss(){ save(DISMISS_KEY, String(now())); toast.remove(); }
    btn.addEventListener('click', dismiss);
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') dismiss(); });
  }

  function detectFailure(){
    // Case 1: AdSense script never initialized -> likely adblock
    const hasGlobal = !!window.adsbygoogle;
    if (!hasGlobal) {
      document.documentElement.classList.add('ads-hidden');
      makeToast();
      return;
    }

    // Case 2: Script loaded but slots never received an iframe.
    // This happens when the account isn't fully approved or when
    // Google chooses not to fill any slots. In that scenario we
    // quietly hide the ad UI instead of showing an error image or
    // suggesting adblock.
    try {
      var slots = Array.prototype.slice.call(document.querySelectorAll('.adsbygoogle'));
      if (!slots.length) return;
      var hasIframe = slots.some(function (el) {
        return !!el.querySelector('iframe');
      });
      if (!hasIframe) {
        document.documentElement.classList.add('ads-hidden');
      }
    } catch (e) {}
  }

  function hasAdsOptIn(){
    try { return localStorage.getItem('ads') === 'on'; } catch { return false; }
  }

  function hasAdsConsentFromAdapter(){
    try {
      if (window.TinyUtilsConsent && typeof window.TinyUtilsConsent.hasAdsConsent === 'function') {
        return !!window.TinyUtilsConsent.hasAdsConsent();
      }
    } catch (e) {}
    // If no adapter is wired yet, default to allowed; CMP is
    // still the canonical source and can tighten this later.
    return true;
  }

  function init(){
    // minimal guard: do not show on local/dev unless explicitly allowed
    const h = location.hostname || '';
    const allowed = (h === 'tinyutils.net' || h === 'www.tinyutils.net' || /vercel\.app$/.test(h));
    if (!allowed) return;
    if (!hasAdsOptIn()) return;
    if (!hasAdsConsentFromAdapter()) return;
    // Wait a bit to let consent.js load AdSense when permitted
    setTimeout(detectFailure, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
