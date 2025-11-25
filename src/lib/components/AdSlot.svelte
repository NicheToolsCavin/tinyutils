<script>
  export let wrapperClass = 'ad-slot';
  export let style = '';
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
  <slot />
</section>

