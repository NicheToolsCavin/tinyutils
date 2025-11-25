<script>
  export let title;
  export let description;
</script>

<header class="tools-section-header">
  <h2 class="tools-section-title">{@html title}</h2>
  <p class="tools-section-description">
    {description}
  </p>
</header>

<style>
  .tools-section-header {
    text-align: center;
    margin-bottom: var(--space-6);
  }

  .tools-section-title {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    margin-bottom: var(--space-2);
    position: relative;
    display: inline-block;
  }

  .tools-section-title::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 50px;
    height: 2px;
    background: var(--gradient-brand);
    border-radius: var(--radius-full);
  }

  .tools-section-description {
    color: var(--text-secondary);
    font-size: var(--text-base);
    max-width: 500px;
    margin: var(--space-4) auto 0;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .tools-section-title {
      font-size: var(--text-lg);
    }

    .tools-section-description {
      font-size: var(--text-sm);
    }
  }
</style>

