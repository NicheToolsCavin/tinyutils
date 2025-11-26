<svelte:head>
  <title>Privacy — TinyUtils</title>
  <meta
    name="description"
    content="Privacy posture for TinyUtils: no logins, no selling personal data, and limited operational logging via Vercel."
  />
  <link rel="canonical" href="/privacy.html" />
  <meta property="og:title" content="Privacy — TinyUtils" />
  <meta
    property="og:description"
    content="Privacy posture for TinyUtils: no logins, no selling personal data, and limited operational logging via Vercel."
  />
</svelte:head>

<div class="container">
  <section class="card card-page" aria-labelledby="privacyHeading">
    <h2 id="privacyHeading">Privacy</h2>
    <p>
      No login, no user accounts, and no selling of your personal data. TinyUtils runs on Vercel's
      infrastructure, which maintains server logs (including URLs and IP addresses) for operational
      purposes. We don't directly access or sell this data, but Vercel retains logs per their own
      policies.
    </p>
    <p>
      We may use privacy-friendly analytics to understand which tools are used the most; when analytics
      are on, measurements are aggregated and you can disable them at any time. For a detailed view of
      cookies, ads, and local storage, see our <a href="/cookies.html">Cookie &amp; privacy settings</a>
      page.
    </p>
    <p>
      Google Ads (AdSense) may appear on some pages. Google may use cookies or similar technologies to
      deliver and measure ads; TinyUtils does not get access to your raw ad profile. For more about how
      Google uses information from sites like ours, see
      <a href="https://business.safety.google/privacy/" target="_blank" rel="noreferrer"
        >Google's Privacy &amp; Terms for partners</a
      >.
    </p>
  </section>
</div>

<style>
  .card-page {
    margin-top: var(--space-10);
  }

  .card-page h2:first-child {
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
    background: var(--gradient-brand);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: var(--space-4);
  }

  .card-page p {
    color: var(--text-secondary);
    line-height: 1.7;
  }
</style>
