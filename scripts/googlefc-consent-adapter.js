;(function(){
  // Bridge Google Funding Choices CMP -> TinyUtilsConsent adapter.
  //
  // Funding Choices exposes a global `googlefc` object. When the
  // consent data for Google Consent Mode is ready, it calls any
  // entries pushed onto `googlefc.callbackQueue` with keys such as
  // `CONSENT_MODE_DATA_READY`. Inside that callback we can read
  // consent mode values and map them to TinyUtilsConsent helpers.

  function withAdapter(updater) {
    var adapter = window.TinyUtilsConsent || {};
    try { updater(adapter); } catch (e) {}
    window.TinyUtilsConsent = adapter;
  }

  function isGranted(status) {
    if (status == null) return true;
    if (typeof status === 'string') {
      var s = status.toUpperCase();
      if (s === 'DENIED') return false;
      // Treat GRANTED / NOT_REQUIRED / NOT_APPLICABLE / NOT_CONFIGURED
      // as allowed for our high-level gating; CMP remains canonical.
      return true;
    }
    if (typeof status === 'number') {
      // Many enums use 0 for denied and >0 for some kind of allowed.
      return status !== 0;
    }
    return true;
  }

  function updateFromConsentMode() {
    try {
      if (!window.googlefc || typeof window.googlefc.getGoogleConsentModeValues !== 'function') return;
      var values = window.googlefc.getGoogleConsentModeValues();
      if (!values) return;

      // Names based on Funding Choices Consent Mode docs; we also
      // check a couple of common alternates defensively in case the
      // shape evolves.
      var analyticsStatus =
        values.analyticsStoragePurposeConsentStatus ||
        values.analytics_storage ||
        values.analyticsStorageState;

      var adsStatus =
        values.adStoragePurposeConsentStatus ||
        values.ad_storage ||
        values.adStorageState;

      withAdapter(function(adapter) {
        adapter.hasAnalyticsConsent = function () {
          return isGranted(analyticsStatus);
        };
        adapter.hasAdsConsent = function () {
          return isGranted(adsStatus);
        };
      });
    } catch (e) {
      // If anything goes wrong, keep existing adapter behavior.
    }
  }

  try {
    // Register callbacks up-front so Funding Choices can invoke
    // them once consent data is available.
    window.googlefc = window.googlefc || {};
    var fc = window.googlefc;
    fc.callbackQueue = fc.callbackQueue || [];
    fc.callbackQueue.push({
      CONSENT_MODE_DATA_READY: updateFromConsentMode,
      // Older variants sometimes use CONSENT_DATA_READY; handle both.
      CONSENT_DATA_READY: updateFromConsentMode
    });
  } catch (e) {
    // If CMP is completely blocked, nothing to do; TinyUtilsConsent
    // will keep its default permissive behavior.
  }

  // In case consent mode values are already available by the time
  // this script loads, try a best-effort update once on load.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateFromConsentMode);
  } else {
    updateFromConsentMode();
  }
})();

