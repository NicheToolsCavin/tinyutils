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
      icon: '🗺️',
      name: 'Sitemap Generator',
      href: '/tools/sitemap-generator/',
      tier: 'beta',
      description:
        'Generate XML sitemaps from URL lists. Configure changefreq, priority, and lastmod for search engines.',
      badges: ['XML output', 'Copy/download', 'SEO ready'],
      section: 'seo'
    },
    {
      icon: '📊',
      name: 'Keyword Density',
      href: '/tools/keyword-density/',
      tier: 'beta',
      description:
        'Analyze keyword frequency in your content. Get density percentages and CSV exports for SEO optimization.',
      badges: ['SEO analysis', 'CSV export', 'Stop words'],
      section: 'seo'
    },
    {
      icon: '🔍',
      name: 'Meta Preview',
      href: '/tools/meta-preview/',
      tier: 'beta',
      description:
        'Preview how your page title and description will appear when shared or listed in search results.',
      badges: ['Meta tags', 'Title & description'],
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
    },
    {
      icon: '📋',
      name: 'Formats',
      href: '/tools/formats/',
      tier: 'free',
      description:
        'View all supported document formats for our converter. See what files you can upload and download.',
      badges: ['100+ formats', 'Input/output', 'Reference'],
      section: 'doc'
    },
    {
      icon: '🩺',
      name: 'Encoding Doctor',
      href: '/tools/encoding-doctor/',
      tier: 'beta',
      description:
        'Fix mojibake and encoding errors like "FranÃ§ois dâ€™Arcy" → "François d\'Arcy". Repair broken accents, smart quotes, and Unicode normalization issues.',
      badges: ['UTF-8 repair', 'Smart quotes', 'Mojibake fix'],
      section: 'doc'
    }
  ];

  // Image & Media Tools - featured prominently
  const imageTools = [
    {
      icon: '🖼️',
      name: 'Image Compressor & Converter',
      href: '/tools/image-compressor/',
      tier: 'free',
      description:
        'Compress and convert images in your browser - PNG, JPG, WebP, and HEIC. Batch process and download as a ZIP. Files never leave your device.',
      badges: ['HEIC support', 'Batch ZIP', 'Quality slider', 'Resize']
    }
  ];

  // SEO & Migration Tools
  const migrationTools = [
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
      icon: '⏪',
      name: 'Wayback Fixer',
      href: '/tools/wayback-fixer/',
      tier: 'free',
      description:
        'Bulk-map broken URLs to Internet Archive snapshots. Configurable time windows, optional HEAD verification, and Save Page Now integration.',
      badges: ['Bulk mapping', 'Time windows', 'HEAD verify', 'SPN queue']
    }
  ];

  // Data & File Processing Tools
  const dataTools = [
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
      icon: '🧬',
      name: 'Big CSV Joiner',
      href: '/tools/csv-joiner/',
      tier: 'free',
      description:
        'Merge two CSV/TSV files on a shared column (like Email or ID). Supports inner and left joins with automatic delimiter and header detection.',
      badges: ['Auto delimiter', 'Inner/Left joins', 'Large files']
    },
    {
      icon: '🥨',
      name: 'Smart JSON ↔ CSV Converter',
      href: '/tools/json-to-csv/',
      tier: 'free',
      description:
        'Flatten nested JSON and JSONL logs into spreadsheet-ready CSV, or convert CSV back into JSON arrays without writing code.',
      badges: ['JSONL support', 'Nested flattening', 'Up to 50MB']
    },
    {
      icon: '📑',
      name: 'Bulk PDF Text Extractor',
      href: '/tools/pdf-text-extractor/',
      tier: 'free',
      description:
        'Upload a ZIP of PDFs and get back a ZIP of .txt files. Ideal for research corpora, contracts, and AI pre-processing.',
      badges: ['Batch PDFs', 'Plain text output', 'Error report']
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
<Hero subtitle="Advanced features for professionals and for passersby." data-testid="tools-hero" />

<!-- Top tools layout -->
<div class="tools-top-layout">
  <!-- SEO Tools Section -->
  <section class="tools-section" data-testid="tools-section-seo">
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
  <section class="tools-section" data-testid="tools-section-doc">
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
<div class="see-more" data-testid="tools-see-more">
  <a class="btn secondary" href="#more-tools" id="see-more" data-testid="tools-see-more-button">See more tools ↓</a>
</div>

<!-- Real Ad Slot -->
<AdSlot wrapperClass="ad-slot ad-slot-wide" />

<!-- More Tools - Categorized Sections -->
<div class="tools-sections-wrapper" id="more-tools" data-testid="tools-more-tools">
  <!-- Image & Media Section -->
  <section class="tools-section-bottom" data-testid="tools-section-image">
    <SectionHeader
      title="Image &amp; Media"
      description="Process images locally - nothing leaves your device."
    />
    <div class="tools-grid single-featured">
      {#each imageTools as tool, i}
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
    </div>
  </section>

  <!-- Migration & Archives Section -->
  <div class="tools-bottom-layout">
    <section class="tools-section-bottom" data-testid="tools-section-migration">
      <SectionHeader
        title="Migration &amp; Archives"
        description="Compare sitemaps and recover broken URLs."
      />
      <div class="tools-grid">
        {#each migrationTools as tool, i}
          <ToolCard
            icon={tool.icon}
            name={tool.name}
            href={tool.href}
            description={tool.description}
            badges={tool.badges}
            tier={tool.tier}
            delay={i + 3}
          />
        {/each}
      </div>
    </section>

    <!-- Data & File Processing Section -->
    <section class="tools-section-bottom" data-testid="tools-section-data">
      <SectionHeader
        title="Data &amp; Files"
        description="Transform, join, and extract data from various formats."
      />
      <div class="tools-grid">
        {#each dataTools as tool, i}
          <ToolCard
            icon={tool.icon}
            name={tool.name}
            href={tool.href}
            description={tool.description}
            badges={tool.badges}
            tier={tool.tier}
            delay={i + 5}
          />
        {/each}
      </div>
    </section>
  </div>
</div>

<style>
  /* ═══════════════════════════════════════════════════════════
     LIQUID GLASS TOOLS HUB
     ═══════════════════════════════════════════════════════════ */

  .tools-sections-wrapper {
    margin-top: var(--space-12);
  }

  /* Tool Section Headers */
  .tools-section {
    margin-top: 0;
    margin-bottom: 0;
  }

  .tools-section-bottom {
    margin-top: var(--space-10);
  }

  .tools-section-bottom:first-child {
    margin-top: 0;
  }

  .tools-top-layout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
    gap: var(--space-8);
    margin-top: var(--space-8);
  }

  /* Bottom layout mirrors top layout structure */
  .tools-bottom-layout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
    gap: var(--space-8);
    margin-top: var(--space-10);
  }

  /* Enhanced Tool Cards Grid */
  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
    gap: var(--space-6);
    align-items: stretch;
  }

  .tools-top-layout .tools-grid {
    grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
  }

  /* Single featured tool - centered with max-width */
  .tools-grid.single-featured {
    max-width: 640px;
    margin: 0 auto;
  }

  /* Glass "See more" button */
  .see-more {
    text-align: center;
    margin: var(--space-10) 0 var(--space-6);
  }

  .see-more .btn {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    padding: var(--space-3) var(--space-6);
    border-radius: var(--radius-xl);
    color: var(--text-primary);
    font-weight: var(--font-medium);
    transition: all 0.3s ease;
  }

  .see-more .btn:hover {
    background: var(--glass-bg-hover);
    border-color: var(--accent-primary);
    transform: translateY(-2px);
  }

  /* Light mode enhancements */
  :global(html[data-theme="light"]) .see-more .btn {
    background: rgba(255, 255, 255, 0.6);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  :global(html[data-theme="light"]) .see-more .btn:hover {
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .tools-top-layout,
    .tools-bottom-layout {
      grid-template-columns: 1fr;
      gap: var(--space-6);
    }

    .tools-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
