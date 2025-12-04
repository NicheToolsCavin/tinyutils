// Minimal tool registry for tiny-reactive UI tests.

export const tools = {
  converter: {
    path: '/tools/text-converter/',
    selectors: {
      textInput: '[data-testid="converter-text-input"]',
      previewButton: '[data-testid="converter-preview-button"]',
      previewIframe: '[data-testid="converter-preview-iframe"]',
      previewHeader: '[data-testid="converter-preview-header"]',
      demoButton: '#demoBtn',
      convertButton: '#convertBtn',
      resultsTable: '#results',
    },
  },
  deadLinkFinder: {
    path: '/tools/dead-link-finder/',
    selectors: {
      pageUrlInput: '#pageUrl',
      runButton: '#runBtn',
      progressMessage: '#progressMessage',
      resultsTable: '#results',
      listInput: '#targetsInput',
      exportCsvButton: '#exportCsv',
    },
  },
  sitemapDelta: {
    path: '/tools/sitemap-delta/',
    selectors: {
      loadDemoButton: '[data-testid="sitemap-load-demo"]',
      runButton: '[data-testid="sitemap-run-diff"]',
      summaryLine: '#summaryLine',
      mapTable: '#mapTable',
    },
  },
  waybackFixer: {
    path: '/tools/wayback-fixer/',
    selectors: {
      urlsInput: '[data-testid="wayback-urls-input"]',
      runButton: '[data-testid="wayback-run"]',
      loadDemoButton: '[data-testid="wayback-load-demo"]',
      statusText: '.status',
      resultsTable: '#resultsTable',
    },
  },
  encodingDoctor: {
    path: '/tools/encoding-doctor/',
    selectors: {
      textInput: '[data-testid="encoding-text-input"]',
      runButton: '[data-testid="encoding-run"]',
      afterText: '[data-testid="encoding-after-text"]',
    },
  },
  keywordDensity: {
    path: '/tools/keyword-density/',
    selectors: {
      textInput: '[data-testid="keyword-text-input"]',
      analyzeButton: '[data-testid="keyword-analyze"]',
      resultsTable: '[data-testid="keyword-results-table"]',
    },
  },
  metaPreview: {
    path: '/tools/meta-preview/',
    selectors: {
      urlInput: '[data-testid="meta-url-input"]',
      runButton: '[data-testid="meta-preview-run"]',
      resultsTable: '[data-testid="meta-results-table"]',
      titleCell: '[data-testid="meta-title-cell"]',
    },
  },
  csvJoiner: {
    path: '/tools/csv-joiner/',
    selectors: {
      uploadInput: '[data-testid="csv-joiner-upload-input"]',
      stepHeading: '[data-testid="csv-joiner-step-heading"]',
    },
  },
  jsonToCsv: {
    path: '/tools/json-to-csv/',
    selectors: {
      uploadInput: '[data-testid="jsoncsv-upload-input"]',
      convertButton: '[data-testid="jsoncsv-convert-button"]',
    },
  },
  pdfTextExtractor: {
    path: '/tools/pdf-text-extractor/',
    selectors: {
      uploadInput: '[data-testid="pdf-extract-upload-input"]',
      runButton: '[data-testid="pdf-extract-run-button"]',
    },
  },
  sitemapGenerator: {
    path: '/tools/sitemap-generator/',
    selectors: {
      heading: '[data-testid="sitemap-generator-heading"]',
      baseUrlInput: '[data-testid="sitemap-generator-base-url"]',
      pathsTextarea: '[data-testid="sitemap-generator-paths"]',
      buildButton: '[data-testid="sitemap-generator-build"]',
    },
  },
  home: {
    path: '/',
    selectors: {
      heroTitle: '[data-testid="home-hero-title"]',
      heroSubtitle: '[data-testid="home-hero-subtitle"]',
      toolsList: '[data-testid="home-tools-list"]',
      firstToolCard: '[data-testid="home-tool-card-0"]',
      browseToolsCta: '[data-testid="home-cta-browse-tools"]',
    },
  },
  toolsIndex: {
    path: '/tools/',
    selectors: {
      hero: '[data-testid="tools-hero"]',
      seoSection: '[data-testid="tools-section-seo"]',
      docSection: '[data-testid="tools-section-doc"]',
      seeMoreButton: '[data-testid="tools-see-more-button"]',
      moreTools: '[data-testid="tools-more-tools"]',
    },
  },
  formatsPage: {
    path: '/tools/formats/',
    selectors: {
      hero: '[data-testid="formats-hero"]',
      inputsSection: '[data-testid="formats-inputs-section"]',
      outputsSection: '[data-testid="formats-outputs-section"]',
      openConverterButton: '[data-testid="formats-open-converter"]',
    },
  },
  bulkFindReplace: {
    path: '/tools/multi-file-search-replace/',
    selectors: {
      // Map Bulk Find & Replace harness to existing multi-file search/replace test ids
      fileInput: '[data-testid="mfsr-upload-zone"]',
      findInput: '[data-testid="mfsr-find-input"]',
      replaceInput: '[data-testid="mfsr-replace-input"]',
      caseCheckbox: '[data-testid="mfsr-case-checkbox"]',
      previewButton: '[data-testid="mfsr-preview-button"]',
      reviewSection: '[data-testid="mfsr-review-section"]',
      statsFilesScanned: '[data-testid="mfsr-stats-files-scanned"]',
      statsFilesModified: '[data-testid="mfsr-stats-files-modified"]',
      statsTotalMatches: '[data-testid="mfsr-stats-total-matches"]',
      statsFilesSkipped: '[data-testid="mfsr-stats-files-skipped"]',
      diffItem: '[data-testid="mfsr-diff-item"]',
    },
  },
  multiFileSearchReplace: {
    path: '/tools/multi-file-search-replace/',
    selectors: {
      page: '[data-testid="mfsr-page"]',
      uploadZone: '[data-testid="mfsr-upload-zone"]',
      findInput: '[data-testid="mfsr-find-input"]',
      replaceInput: '[data-testid="mfsr-replace-input"]',
      caseCheckbox: '[data-testid="mfsr-case-checkbox"]',
      previewButton: '[data-testid="mfsr-preview-button"]',
      reviewSection: '[data-testid="mfsr-review-section"]',
      statsFilesScanned: '[data-testid="mfsr-stats-files-scanned"]',
      statsFilesModified: '[data-testid="mfsr-stats-files-modified"]',
      statsTotalMatches: '[data-testid="mfsr-stats-total-matches"]',
      statsFilesSkipped: '[data-testid="mfsr-stats-files-skipped"]',
      diffItem: '[data-testid="mfsr-diff-item"]',
    },
  },
};
