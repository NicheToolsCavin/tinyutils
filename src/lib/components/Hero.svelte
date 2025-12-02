<script>
  export let title = "Professional-Grade Web Tools";
  export let subtitle = "Advanced features without the complexity. No installation, no setup—just powerful utilities that work.";
  export let delay = 1;
</script>

<section class="tools-hero">
  <h1 class="tools-hero-title fade-in-up">{title}</h1>
  <p class="tools-hero-subtitle fade-in-up delay-{delay}">
    {subtitle}
  </p>
</section>

<style>
  .tools-hero {
    text-align: center;
    padding: var(--space-12) var(--space-4) var(--space-8);
    position: relative;
    overflow: hidden;
  }

  .tools-hero::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(59, 130, 246, 0.08) 0%,
      rgba(59, 130, 246, 0.02) 40%,
      transparent 70%
    );
    animation: pulse 10s ease-in-out infinite;
    pointer-events: none;
  }

  .tools-hero-title {
    position: relative;
    font-size: var(--text-4xl);
    font-weight: var(--font-bold);
    background: var(--gradient-brand);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: var(--space-3);
  }

  .tools-hero-subtitle {
    position: relative;
    font-size: var(--text-lg);
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  /* Staggered animations */
  .fade-in-up {
    animation: fadeInUp 0.6s ease-out;
  }

  .delay-1 { animation-delay: 0.1s; opacity: 0; animation-fill-mode: forwards; }
  .delay-2 { animation-delay: 0.2s; opacity: 0; animation-fill-mode: forwards; }

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

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .tools-hero {
      padding: var(--space-8) var(--space-4) var(--space-6);
    }

    .tools-hero-title {
      font-size: var(--text-2xl);
    }

    .tools-hero-subtitle {
      font-size: var(--text-base);
    }
  }

  /* Accessibility: Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .fade-in-up,
    .tools-hero::before {
      animation: none !important;
      transition: none !important;
    }
    .delay-1, .delay-2 {
      opacity: 1 !important;
    }
  }
</style>

