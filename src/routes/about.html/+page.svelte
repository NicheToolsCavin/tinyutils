<svelte:head>
  <title>About — TinyUtils</title>
  <meta
    name="description"
    content="Learn what TinyUtils is, who it's for, and how we think about privacy and reliability."
  />
  <link rel="canonical" href="/about.html" />
  <meta property="og:title" content="About — TinyUtils" />
  <meta
    property="og:description"
    content="Learn what TinyUtils is, who it's for, and how we think about privacy and reliability."
  />
</svelte:head>

<div class="container">
  <section class="card" aria-labelledby="aboutHeading">
    <h2 id="aboutHeading">What is TinyUtils?</h2>
    <p>
      TinyUtils is a small collection of focused, browser-based tools for people who work with websites
      every day — SEOs, developers, content editors, and site owners. The goal is to make common,
      fiddly tasks (like checking dead links or comparing sitemaps) fast, reliable, and easy to repeat.
    </p>

    <h2>How it’s built</h2>
    <p>
      The site is a static HTML/CSS/JavaScript front-end deployed on Vercel, plus a handful of
      serverless APIs for more complex work (like fetching metadata or converting documents). There are
      no user accounts or dashboards to manage — just tools you can open, use, and close again.
    </p>

    <h2>Privacy &amp; safety</h2>
    <p>
      TinyUtils does not run user logins or sell personal data. Some tools need to fetch URLs you paste
      to do their job; those requests are made on your behalf and may briefly appear in server logs for
      abuse prevention and debugging. For the full picture, see the
      <a href="/cookies.html">Cookie &amp; privacy settings</a> and <a href="/privacy.html">Privacy</a>
      pages.
    </p>

    <h2>Who it’s for</h2>
    <p>
      These tools are designed for people who are comfortable working in the browser and reading raw
      results. They’re intentionally minimal: no animations, no popups, and no onboarding flows. If you
      know what you’re looking for, TinyUtils aims to get you there quickly and stay out of your way.
    </p>

    <h2>How to help</h2>
    <p>If a tool saves you time, the best way to support TinyUtils is to share it with a colleague.</p>
  </section>
</div>
