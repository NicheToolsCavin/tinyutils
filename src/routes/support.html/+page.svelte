<svelte:head>
  <title>Support — TinyUtils</title>
  <meta
    name="description"
    content="If the tools help you, consider buying a coffee to support TinyUtils."
  />
  <link rel="canonical" href="/support.html" />
  <meta property="og:title" content="Support — TinyUtils" />
  <meta
    property="og:description"
    content="If the tools help you, consider buying a coffee to support TinyUtils."
  />
</svelte:head>

<div class="container">
  <section class="card card-page" aria-labelledby="supportHeading">
    <h2 id="supportHeading">Support TinyUtils</h2>
    <p>
      If the tools help you, consider buying a coffee. Replace the link below with your Ko‑fi/BuyMeACoffee handle.
    </p>
    <p><a class="cta" href="https://ko-fi.com/your-handle" target="_blank">Buy me a coffee</a></p>
  </section>
</div>

<style>
  .card-page {
    margin-top: var(--space-10);
    text-align: center;
  }

  .card-page h2 {
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

  .card-page .cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-3) var(--space-6);
    border-radius: var(--radius-full);
    background: var(--gradient-brand);
    color: var(--text-inverse);
    text-decoration: none;
    font-weight: var(--font-medium);
  }

  .card-page .cta:hover {
    filter: brightness(1.05);
  }
</style>
