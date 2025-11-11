(function(){
  const LS_KEY = 'tu-consent';
  const ADS_KEY = 'tu-ads-hidden';
  const EU_LANGS = ['bg','cs','da','de','el','en-GB','es','et','fi','fr','ga','hr','hu','it','lt','lv','mt','nl','pl','pt','ro','sk','sl','sv','is','no','tr','uk'];

  const isEUByLang = (navigator.languages||[navigator.language||'']).some(l => {
    const lower = (l||'').toLowerCase();
    return EU_LANGS.some(code => lower.startsWith(code.toLowerCase()));
  });
  const isEUByTZ = (()=>{
    try { return /(^|\/)Europe\//.test(Intl.DateTimeFormat().resolvedOptions().timeZone||''); }
    catch { return false; }
  })();
  const needsPrompt = isEUByLang || isEUByTZ;

  function loadScript(id, src){
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.id = id;
    s.defer = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function enableAnalytics(){
    loadScript('plausible', 'https://plausible.io/js/script.js');
  }

  function save(key, value){ try{ localStorage.setItem(key, value); }catch{} }
  function read(key){ try{ return localStorage.getItem(key); }catch{ return null; } }

  function applyConsent(value){
    if (value === 'granted') {
      enableAnalytics();
    }
  }

  function mountBanner(){
    const decided = read(LS_KEY);
    if (decided) { applyConsent(decided); return; }

    const wrap = document.createElement('div');
    wrap.className = 'tu-consent';
    wrap.innerHTML = '<h4>Privacy choices</h4><p>We use cookie-free analytics and optional ads after you agree.</p>' +
      '<div class="row"><a class="link" href="/privacy.html">Privacy</a>' +
      '<button id="tu-consent-decline" class="secondary">Decline</button>' +
      '<button id="tu-consent-accept" class="primary">Accept</button></div>';
    document.body.appendChild(wrap);

    wrap.querySelector('#tu-consent-accept').addEventListener('click', () => {
      save(LS_KEY, 'granted');
      applyConsent('granted');
      wrap.remove();
    });
    wrap.querySelector('#tu-consent-decline').addEventListener('click', () => {
      save(LS_KEY, 'denied');
      wrap.remove();
    });
  }

  function initAdsToggle(){
    const el = document.getElementById('tu-ads-toggle');
    if (!el) return;
    const stored = read(ADS_KEY);
    if (stored === '1') document.documentElement.classList.add('ads-hidden');

    el.addEventListener('change', (event) => {
      const on = !!event.target.checked;
      document.documentElement.classList.toggle('ads-hidden', on);
      save(ADS_KEY, on ? '1' : '0');
    });
  }

  function init(){
    const consent = read(LS_KEY);
    if (consent === 'granted') {
      applyConsent('granted');
    }

    if (needsPrompt) {
      mountBanner();
    } else if (!consent) {
      // Outside EU: respect stored choice if any, no banner by default.
      applyConsent(consent);
    }

    initAdsToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
