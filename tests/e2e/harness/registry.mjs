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
};
