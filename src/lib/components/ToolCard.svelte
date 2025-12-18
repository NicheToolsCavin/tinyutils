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
  /* Liquid Glass Tool Card */
  .tool-card-enhanced {
    position: relative;
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    height: 100%;
    min-height: 440px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  /* Light mode: Liquid glass effect with subtle transparency */
  :global(html[data-theme="light"]) .tool-card-enhanced {
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.25) 100%);
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow:
      0 8px 32px rgba(31, 38, 135, 0.07),
      0 1px 0 rgba(255, 255, 255, 0.8) inset,
      0 -1px 0 rgba(0, 0, 0, 0.03) inset;
  }

  /* Glass shine overlay - top highlight */
  .tool-card-enhanced::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--card-highlight);
  }

  /* Glass shine - curved surface reflection */
  .tool-card-enhanced::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%);
    border-radius: 24px 24px 100px 100px;
    pointer-events: none;
    opacity: 0;
  }

  :global(html[data-theme="light"]) .tool-card-enhanced::after {
    opacity: 1;
  }

  .tool-card-enhanced:hover {
    transform: translateY(-8px);
    border-color: var(--glass-border-hover);
    box-shadow: 0 24px 64px var(--glass-shadow);
  }

  :global(html[data-theme="light"]) .tool-card-enhanced:hover {
    transform: translateY(-8px);
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.4) 100%);
    border-color: rgba(255, 255, 255, 0.8);
    box-shadow:
      0 24px 64px rgba(31, 38, 135, 0.1),
      0 1px 0 rgba(255, 255, 255, 0.95) inset,
      0 -1px 0 rgba(0, 0, 0, 0.03) inset;
  }

  .tool-card-icon {
    font-size: 3rem;
    line-height: 1;
    margin-bottom: var(--space-2);
    display: block;
    position: relative;
    z-index: 1;
  }

  .tool-card-title {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    margin: 0 0 var(--space-2);
    line-height: 1.3;
    position: relative;
    z-index: 1;
  }

  .tool-card-description {
    color: var(--text-secondary);
    line-height: 1.6;
    flex: 1;
    margin: 0;
    position: relative;
    z-index: 1;
  }

  .tool-features {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-2);
    position: relative;
    z-index: 1;
  }

  .feature-badge-small {
    display: inline-block;
    padding: var(--space-1) var(--space-2);
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.25);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    color: var(--brand-400);
    white-space: nowrap;
    backdrop-filter: blur(4px);
  }

  :global(html[data-theme="light"]) .feature-badge-small {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.5) 100%);
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 2px 8px rgba(31, 38, 135, 0.06), 0 1px 0 rgba(255, 255, 255, 0.9) inset;
    color: #3b82f6;
  }

  .tool-card-action {
    margin-top: auto;
    padding-top: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    position: relative;
    z-index: 1;
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
      /* No transform here - allows hover transforms to work */
    }
  }

  /* Accessibility: Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .fade-in-up,
    .tool-card-enhanced {
      animation: none !important;
      transition: none !important;
    }
    .delay-1, .delay-2, .delay-3, .delay-4, .delay-5 {
      opacity: 1 !important;
      animation: none !important;
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
