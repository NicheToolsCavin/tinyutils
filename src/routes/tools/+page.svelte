<script>
  import { onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import ToolCard from '$lib/components/ToolCard.svelte';
  import Hero from '$lib/components/Hero.svelte';
  import SectionHeader from '$lib/components/SectionHeader.svelte';
  import AdSlot from '$lib/components/AdSlot.svelte';

  // Tool data - restructured to match static HTML
  const topTools = [
    {
      icon: '🔍',
      name: 'Dead Link Finder',
      href: '/tools/dead-link-finder/',
      tier: 'free',
      description:
        'Scan any page, list, or sitemap for broken links. Get detailed status codes, redirect chains, and instant CSV/JSON exports. Respects robots.txt and handles HSTS.',
      badges: ['Robots-aware', 'Redirect chains', 'HSTS guard', 'Wayback links'],
      section: 'seo'
    },
    {
      icon: '📄',
      name: 'Document Converter',
      href: '/tools/text-converter/',
      tier: 'pro',
      description:
        'Convert between 100+ document formats powered by Pandoc. Supports Markdown, PDF, DOCX, HTML, RTF, ODT, LaTeX, and more. Track changes, extract media.',
      badges: ['100+ formats', 'Track changes', 'Media extract', 'Batch convert'],
      section: 'doc',
      subbox: {
        text: 'Need details on inputs and outputs?',
        link: '/tools/formats/',
        linkText: 'View supported formats →'
      }
    }
  ];

  const moreTools = [
    {
      icon: '🗺️',
      name: 'Sitemap Delta + Redirect Mapper',
      href: '/tools/sitemap-delta/',
      tier: 'free',
      description:
        'Compare two sitemaps to identify added, removed, and changed URLs. Export nginx/Apache rewrite rules and 410 Gone lists for migrations.',
      badges: ['Smart mapping', 'Confidence scores', 'Rewrite exports', '410 CSV']
    },
    {
      icon: '🔍',
      name: 'Bulk Find & Replace',
      href: '/tools/multi-file-search-replace/',
      tier: 'free',
      description:
        'Upload a ZIP and find/replace text across 500 files at once. Visual diff preview, regex support, CSV export. No command line required.',
      badges: ['500 files', 'Visual diffs', 'Regex patterns', 'CSV export']
    },
    {
      icon: '⏪',
      name: 'Wayback Fixer',
      href: '/tools/wayback-fixer/',
      tier: 'free',
      description:
        'Bulk-map broken URLs to Internet Archive snapshots. Configurable time windows, optional HEAD verification, and Save Page Now integration.',
      badges: ['Bulk mapping', 'Time windows', 'HEAD verify', 'SPN queue']
    },
    {
      icon: '🩺',
      name: 'Encoding Doctor',
      href: '/tools/encoding-doctor/',
      tier: 'beta',
      description:
        'Fix mojibake and encoding errors like "FranÃ§ois dâ€™Arcy" → "François d\'Arcy". Repair broken accents, smart quotes, and Unicode normalization issues.',
      badges: ['UTF-8 repair', 'Smart quotes', 'Mojibake fix']
    }
  ];

  let showMoreTools = false;

  function scrollToMoreTools() {
    const target = document.getElementById('more-tools');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Initialize scroll behavior when component mounts
  onMount(() => {
    // Add smooth scroll behavior for the "See more tools" link
    const seeMoreLink = document.getElementById('see-more');
    const target = document.getElementById('more-tools');

    if (seeMoreLink && target) {
      seeMoreLink.addEventListener('click', (e) => {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  });
</script>

<svelte:head>
  <title>Tools — TinyUtils</title>
  <meta
    name="description"
    content="Free web tools: Dead Link Finder, Sitemap Delta, Wayback Fixer, and Document Converter (100+ formats). Built for SEO professionals and anyone needing powerful utilities."
  />
  <link rel="canonical" href="/tools/" />
</svelte:head>

<!-- Hero section with gradient -->
<Hero subtitle="Advanced features for professionals and for passersby." />

<!-- Top tools layout -->
<div class="tools-top-layout">
  <!-- SEO Tools Section -->
  <section class="tools-section">
    <SectionHeader
      title="SEO &amp; Site Management"
      description="Find broken links, compare sitemaps, and map URLs to archive snapshots."
    />
    <div class="tools-grid">
      {#each topTools.filter((tool) => tool.section === 'seo') as tool}
        <ToolCard
          icon={tool.icon}
          name={tool.name}
          href={tool.href}
          description={tool.description}
          badges={tool.badges}
          tier={tool.tier}
          delay={1}
        />
      {/each}
    </div>
  </section>

  <!-- Document Tools Section -->
  <section class="tools-section">
    <SectionHeader
      title="Document Tools"
      description="Convert between 100+ formats with our Pandoc-powered engine."
    />
    <div class="tools-grid">
      {#each topTools.filter((tool) => tool.section === 'doc') as tool}
        <ToolCard
          icon={tool.icon}
          name={tool.name}
          href={tool.href}
          description={tool.description}
          badges={tool.badges}
          subbox={tool.subbox}
          tier={tool.tier}
          delay={1}
        />
      {/each}
    </div>
  </section>
</div>

<!-- See More Button -->
<div class="see-more">
  <a class="btn secondary" href="#more-tools" id="see-more">See more tools ↓</a>
</div>

<!-- Real Ad Slot -->
<AdSlot wrapperClass="ad-slot ad-slot-wide" />

<!-- More Tools Grid -->
<div class="tools-sections-wrapper" id="more-tools">
  <div class="tools-grid two-col-bottom">
    {#each moreTools as tool, i}
      <ToolCard
        icon={tool.icon}
        name={tool.name}
        href={tool.href}
        description={tool.description}
        badges={tool.badges}
        tier={tool.tier}
        delay={i + 2}
      />
    {/each}
    <div class="tool-card-spacer" aria-hidden="true"></div>
  </div>
</div>

<style>
  .tools-sections-wrapper {
    margin-top: var(--space-8);
  }

  /* Tool Section Headers */
  .tools-section {
    margin-top: 0;
    margin-bottom: 0;
  }

  .tools-top-layout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: var(--space-6);
    margin-top: var(--space-6);
  }

  /* Enhanced Tool Cards */
  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-6);
    align-items: stretch;
  }

  .tools-top-layout .tools-grid {
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  }

  .two-col-bottom {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 820px) {
    .two-col-bottom {
      grid-template-columns: 1fr;
    }
  }

  .tool-card-spacer {
    visibility: hidden;
  }

  .see-more {
    text-align: center;
    margin: var(--space-6) 0 var(--space-2);
  }
</style>
