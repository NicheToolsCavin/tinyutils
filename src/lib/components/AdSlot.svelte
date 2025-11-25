<script>
  export let wrapperClass = 'ad-slot';
  export let style = '';
  export let showText = true;
</script>

<section class={wrapperClass} aria-label="Sponsored" style={style}>
  <ins
    class="adsbygoogle"
    style="display:block"
    data-ad-client="ca-pub-3079281180008443"
    data-ad-slot="3664281983"
    data-ad-format="auto"
    data-full-width-responsive="true"
  ></ins>
  <svelte:element this={'script'}>
    {`
      try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    `}
  </svelte:element>
  {#if showText}
    <p class="ad-disclaimer">Ads help keep TinyUtils fast and free for everyone.</p>
  {/if}
  <slot />
</section>

<style>
  .ad-disclaimer {
    margin-top: var(--space-3);
    text-align: center;
    color: var(--text-muted);
    font-size: var(--text-xs);
    line-height: 1.4;
  }
</style>

