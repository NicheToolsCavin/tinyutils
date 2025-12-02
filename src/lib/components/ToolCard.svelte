<script>
  export let icon;
  export let name;
  export let href;
  export let description;
  export let badges = [];
  export let subbox = null;
  export let delay = 1;
  export let tier = null;
</script>

<article class="tool-card-enhanced fade-in-up delay-{delay}">
  <span class="tool-card-icon" aria-hidden="true">{icon}</span>
  <h3 class="tool-card-title">
    {name}
    {#if tier && tier !== 'free'}
      <span class="tool-pill tool-pill-{tier}">{tier.toUpperCase()}</span>
    {/if}
  </h3>
  <p class="tool-card-description">
    {description}
  </p>
  <div class="tool-features">
    {#each badges as badge}
      <span class="feature-badge-small">{badge}</span>
    {/each}
  </div>
  <div class="tool-card-action">
    <a class="btn primary" href={href}>Open tool →</a>
    {#if subbox}
      <div class="tool-card-subbox">
        <span>{subbox.text}</span>
        <a href={subbox.link}>{subbox.linkText}</a>
      </div>
    {/if}
  </div>
</article>

<style>
  .tool-card-enhanced {
    position: relative;
    background: var(--surface-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-2xl);
    padding: var(--space-5);
    transition: all var(--transition-base);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    height: 100%;
    min-height: 440px;
  }

  .tool-card-enhanced::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    border: 1px solid rgba(148, 163, 184, 0.35);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-base), border-color var(--transition-base);
  }

  .tool-card-enhanced:hover {
    transform: translateY(-4px);
    border-color: var(--hover-accent);
    box-shadow: 0 18px 50px var(--hover-shadow-color);
  }

  .tool-card-enhanced:hover::before {
    opacity: 1;
    border-color: var(--brand-500, #3b82f6);
  }

  .tool-card-icon {
    font-size: 3rem;
    line-height: 1;
    margin-bottom: var(--space-2);
    display: block;
  }

  .tool-card-title {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    margin: 0 0 var(--space-2);
    line-height: 1.3;
  }

  .tool-card-description {
    color: var(--text-secondary);
    line-height: 1.6;
    flex: 1;
    margin: 0;
  }

  .tool-features {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .feature-badge-small {
    display: inline-block;
    padding: var(--space-1) var(--space-2);
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: var(--radius-md);
    font-size: var(--text-xs);
    color: var(--brand-400);
    white-space: nowrap;
  }

  .tool-card-action {
    margin-top: auto;
    padding-top: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .tool-card-subbox {
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-subtle);
    background: var(--surface-raised);
    padding: 0.6rem 0.8rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .tool-card-subbox span {
    opacity: 0.9;
  }

  .tool-card-subbox a {
    color: var(--brand-500);
    font-weight: var(--font-medium);
    text-decoration: none;
    white-space: nowrap;
    transition: color var(--transition-base);
  }

  .tool-card-subbox a:hover {
    text-decoration: underline;
  }

  .tool-card-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .tool-pill {
    border-radius: var(--radius-full);
    padding: 2px 8px;
    font-size: 0.7rem;
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tool-pill-pro {
    background: var(--brand-500);
    color: white;
    border: 1px solid var(--brand-600);
  }

  .tool-pill-beta {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  /* Staggered animations */
  .fade-in-up {
    animation: fadeInUp 0.6s ease-out;
  }

  .delay-1 { animation-delay: 0.1s; opacity: 0; animation-fill-mode: forwards; }
  .delay-2 { animation-delay: 0.2s; opacity: 0; animation-fill-mode: forwards; }
  .delay-3 { animation-delay: 0.3s; opacity: 0; animation-fill-mode: forwards; }
  .delay-4 { animation-delay: 0.4s; opacity: 0; animation-fill-mode: forwards; }
  .delay-5 { animation-delay: 0.5s; opacity: 0; animation-fill-mode: forwards; }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .tool-card-enhanced {
      padding: var(--space-3);
      gap: var(--space-1);
      min-height: auto;
    }

    .tool-card-icon {
      font-size: 2rem;
      margin-bottom: var(--space-1);
    }

    .tool-card-title {
      font-size: var(--text-base);
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-1);
    }

    .tool-card-description {
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .feature-badge-small {
      font-size: 0.65rem;
      padding: 2px 6px;
    }

    .btn {
      font-size: var(--text-sm);
      padding: 8px 12px;
    }
  }
</style>
