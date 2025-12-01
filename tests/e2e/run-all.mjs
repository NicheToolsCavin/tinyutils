#!/usr/bin/env node
// Aggregate tiny-reactive UI E2E flows.
//
// For now this script runs the converter, Dead Link Finder,
// Sitemap Delta, Wayback Fixer, Encoding Doctor, Keyword
// Density, and Meta Preview exemplars and writes a small
// aggregated JSON summary under `artifacts/ui/`.

import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { runNodeScript } from './util-runner.mjs';
import { resolve } from 'node:path';

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;

async function runConverterFlow() {
  const previewScriptPath = 'tests/e2e/tiny-reactive-harness.mjs';
  const convertScriptPath = 'tests/e2e/converter-convert-tiny-reactive-harness.mjs';
  const dataToolsApiScript = 'tests/e2e/data-tools-api-assert.mjs';
  const urlGuardApiScript = 'tests/e2e/url-guard-api-assert.mjs';

  const artifactDir = resolve('artifacts', 'ui', 'converter', dateSlug);

  // Helper to run a script and read its summary/error JSON.
  async function runOne(scriptPath, summaryFile, errorFile) {
    const exitCode = await new Promise((resolveCode) => {
      const child = spawn('node', [scriptPath], {
        stdio: 'inherit',
      });
      child.on('close', (code) => {
        resolveCode(typeof code === 'number' ? code : 1);
      });
    });

    const summaryPath = resolve(artifactDir, summaryFile);
    const errorPath = resolve(artifactDir, errorFile);

    let summary = null;
    let usedPath = null;

    try {
      const buf = await readFile(summaryPath, 'utf8');
      summary = JSON.parse(buf);
      usedPath = summaryPath;
    } catch {
      try {
        const buf = await readFile(errorPath, 'utf8');
        summary = JSON.parse(buf);
        usedPath = errorPath;
      } catch {
        // Leave summary null if nothing could be read.
      }
    }

    const ok = exitCode === 0 && summary && summary.ok !== false;

    // Fail fast if a declared screenshot is missing or tiny
    if (summary?.screenshot) {
      try {
        const st = await stat(summary.screenshot);
        if (!st || st.size < 1024) {
          return { ok: false, exitCode: exitCode || 1, summaryPath: usedPath, reason: 'screenshot_missing_or_small' };
        }
      } catch {
        return { ok: false, exitCode: exitCode || 1, summaryPath: usedPath, reason: 'screenshot_missing' };
      }
    }

    return { ok, exitCode, summaryPath: usedPath };
  }

  const preview = await runOne(
    previewScriptPath,
    'converter-preview.json',
    'converter-preview.error.json',
  );
  const convert = await runOne(
    convertScriptPath,
    'converter-convert.json',
    'converter-convert.error.json',
  );

  // Run API asserts for data-tools and URL guard in the same sweep
  const apiTasks = [];
  apiTasks.push(runNodeScript('data-tools-api-assert', dataToolsApiScript));
  apiTasks.push(runNodeScript('url-guard-api-assert', urlGuardApiScript));
  const apiResults = await Promise.allSettled(apiTasks);
  const apisOk = apiResults.every((r) => r.status === 'fulfilled');

  const ok = preview.ok && convert.ok && apisOk;

  return {
    name: 'converter',
    ok,
    exitCode: ok ? 0 : convert.exitCode || preview.exitCode,
    summaryPath: convert.summaryPath || preview.summaryPath,
    details: {
      preview,
      convert,
      apiResults,
    },
  };
}

async function runDeadLinkFinderFlow() {
  const scriptPath = 'tests/e2e/dlf-tiny-reactive-harness.mjs';

  const exitCode = await new Promise((resolveCode) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      resolveCode(typeof code === 'number' ? code : 1);
    });
  });

  const artifactDir = resolve('artifacts', 'ui', 'dead-link-finder', dateSlug);
  const summaryPath = resolve(artifactDir, 'dlf-preview.json');
  const errorPath = resolve(artifactDir, 'dlf-preview.error.json');

  let summary = null;
  let usedPath = null;

  try {
    const buf = await readFile(summaryPath, 'utf8');
    summary = JSON.parse(buf);
    usedPath = summaryPath;
  } catch {
    try {
      const buf = await readFile(errorPath, 'utf8');
      summary = JSON.parse(buf);
      usedPath = errorPath;
    } catch {
      // Leave summary null if nothing could be read.
    }
  }

  const ok = exitCode === 0 && summary && summary.ok !== false;

  return {
    name: 'dead-link-finder',
    ok,
    exitCode,
    summaryPath: usedPath,
  };
}

async function runDataToolsUiFlow() {
  const scriptPath = 'tests/e2e/data-tools-tiny-reactive-harness.mjs';
  const exitCode = await new Promise((resolveCode) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      resolveCode(typeof code === 'number' ? code : 1);
    });
  });

  const artifactDir = resolve('artifacts', 'ui', 'data-tools');
  const summaryPath = resolve(artifactDir, 'data-tools-ui.json');
  let summary = null;
  try {
    const buf = await readFile(summaryPath, 'utf8');
    summary = JSON.parse(buf);
  } catch {
    // ignore
  }

  const ok = exitCode === 0 && summary && summary.ok !== false;
  return {
    name: 'data-tools-ui',
    ok,
    exitCode,
    summaryPath: summaryPath,
    details: summary,
  };
}

async function runSitemapDeltaFlow() {
  const scriptPath = 'tests/e2e/sitemap-delta-tiny-reactive-harness.mjs';

  const exitCode = await new Promise((resolveCode) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      resolveCode(typeof code === 'number' ? code : 1);
    });
  });

  const artifactDir = resolve('artifacts', 'ui', 'sitemap-delta', dateSlug);
  const summaryPath = resolve(artifactDir, 'sitemap-delta-preview.json');
  const errorPath = resolve(artifactDir, 'sitemap-delta-preview.error.json');

  let summary = null;
  let usedPath = null;

  try {
    const buf = await readFile(summaryPath, 'utf8');
    summary = JSON.parse(buf);
    usedPath = summaryPath;
  } catch {
    try {
      const buf = await readFile(errorPath, 'utf8');
      summary = JSON.parse(buf);
      usedPath = errorPath;
    } catch {
      // Leave summary null if nothing could be read.
    }
  }

  const ok = exitCode === 0 && summary && summary.ok !== false;

  return {
    name: 'sitemap-delta',
    ok,
    exitCode,
    summaryPath: usedPath,
  };
}

async function runWaybackFixerFlow() {
  const scriptPath = 'tests/e2e/wayback-fixer-tiny-reactive-harness.mjs';

  const exitCode = await new Promise((resolveCode) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      resolveCode(typeof code === 'number' ? code : 1);
    });
  });

  const artifactDir = resolve('artifacts', 'ui', 'wayback-fixer', dateSlug);
  const summaryPath = resolve(artifactDir, 'wayback-fixer-preview.json');
  const errorPath = resolve(artifactDir, 'wayback-fixer-preview.error.json');

  let summary = null;
  let usedPath = null;

  try {
    const buf = await readFile(summaryPath, 'utf8');
    summary = JSON.parse(buf);
    usedPath = summaryPath;
  } catch {
    try {
      const buf = await readFile(errorPath, 'utf8');
      summary = JSON.parse(buf);
      usedPath = errorPath;
    } catch {
      // Leave summary null if nothing could be read.
    }
  }

  const ok = exitCode === 0 && summary && summary.ok !== false;

  return {
    name: 'wayback-fixer',
    ok,
    exitCode,
    summaryPath: usedPath,
  };
}

async function runEncodingDoctorFlow() {
  const scriptPath = 'tests/e2e/encoding-doctor-tiny-reactive-harness.mjs';

  const exitCode = await new Promise((resolveCode) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      resolveCode(typeof code === 'number' ? code : 1);
    });
  });

  const artifactDir = resolve('artifacts', 'ui', 'encoding-doctor', dateSlug);
  const summaryPath = resolve(artifactDir, 'encoding-doctor-preview.json');
  const errorPath = resolve(artifactDir, 'encoding-doctor-preview.error.json');

  let summary = null;
  let usedPath = null;

  try {
    const buf = await readFile(summaryPath, 'utf8');
    summary = JSON.parse(buf);
    usedPath = summaryPath;
  } catch {
    try {
      const buf = await readFile(errorPath, 'utf8');
      summary = JSON.parse(buf);
      usedPath = errorPath;
    } catch {
      // Leave summary null if nothing could be read.
    }
  }

  const ok = exitCode === 0 && summary && summary.ok !== false;

  return {
    name: 'encoding-doctor',
    ok,
    exitCode,
    summaryPath: usedPath,
  };
}

async function runKeywordDensityFlow() {
  const scriptPath = 'tests/e2e/keyword-density-tiny-reactive-harness.mjs';

  const exitCode = await new Promise((resolveCode) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      resolveCode(typeof code === 'number' ? code : 1);
    });
  });

  const artifactDir = resolve('artifacts', 'ui', 'keyword-density', dateSlug);
  const summaryPath = resolve(artifactDir, 'keyword-density-preview.json');
  const errorPath = resolve(artifactDir, 'keyword-density-preview.error.json');

  let summary = null;
  let usedPath = null;

  try {
    const buf = await readFile(summaryPath, 'utf8');
    summary = JSON.parse(buf);
    usedPath = summaryPath;
  } catch {
    try {
      const buf = await readFile(errorPath, 'utf8');
      summary = JSON.parse(buf);
      usedPath = errorPath;
    } catch {
      // Leave summary null if nothing could be read.
    }
  }

  const ok = exitCode === 0 && summary && summary.ok !== false;

  return {
    name: 'keyword-density',
    ok,
    exitCode,
    summaryPath: usedPath,
  };
}

async function runMetaPreviewFlow() {
  const scriptPath = 'tests/e2e/meta-preview-tiny-reactive-harness.mjs';

  const exitCode = await new Promise((resolveCode) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      resolveCode(typeof code === 'number' ? code : 1);
    });
  });

  const artifactDir = resolve('artifacts', 'ui', 'meta-preview', dateSlug);
  const summaryPath = resolve(artifactDir, 'meta-preview-preview.json');
  const errorPath = resolve(artifactDir, 'meta-preview-preview.error.json');

  let summary = null;
  let usedPath = null;

  try {
    const buf = await readFile(summaryPath, 'utf8');
    summary = JSON.parse(buf);
    usedPath = summaryPath;
  } catch {
    try {
      const buf = await readFile(errorPath, 'utf8');
      summary = JSON.parse(buf);
      usedPath = errorPath;
    } catch {
      // Leave summary null if nothing could be read.
    }
  }

  const ok = exitCode === 0 && summary && summary.ok !== false;

  return {
    name: 'meta-preview',
    ok,
    exitCode,
    summaryPath: usedPath,
  };
}

async function runCsvJoinerFlow() {
  const scriptPath = 'tests/e2e/csv-joiner-tiny-reactive-harness.mjs';

  const exitCode = await new Promise((resolveCode) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      resolveCode(typeof code === 'number' ? code : 1);
    });
  });

  const artifactDir = resolve('artifacts', 'ui', 'csv-joiner', dateSlug);
  const summaryPath = resolve(artifactDir, 'csv-joiner-preview.json');
  const errorPath = resolve(artifactDir, 'csv-joiner-preview.error.json');

  let summary = null;
  let usedPath = null;

  try {
    const buf = await readFile(summaryPath, 'utf8');
    summary = JSON.parse(buf);
    usedPath = summaryPath;
  } catch {
    try {
      const buf = await readFile(errorPath, 'utf8');
      summary = JSON.parse(buf);
      usedPath = errorPath;
    } catch {
      // Leave summary null if nothing could be read.
    }
  }

  const ok = exitCode === 0 && summary && summary.ok !== false;

  return {
    name: 'csv-joiner',
    ok,
    exitCode,
    summaryPath: usedPath,
  };
}

async function runJsonToCsvFlow() {
  const scriptPath = 'tests/e2e/json-to-csv-tiny-reactive-harness.mjs';

  const exitCode = await new Promise((resolveCode) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      resolveCode(typeof code === 'number' ? code : 1);
    });
  });

  const artifactDir = resolve('artifacts', 'ui', 'json-to-csv', dateSlug);
  const summaryPath = resolve(artifactDir, 'json-to-csv-preview.json');
  const errorPath = resolve(artifactDir, 'json-to-csv-preview.error.json');

  let summary = null;
  let usedPath = null;

  try {
    const buf = await readFile(summaryPath, 'utf8');
    summary = JSON.parse(buf);
    usedPath = summaryPath;
  } catch {
    try {
      const buf = await readFile(errorPath, 'utf8');
      summary = JSON.parse(buf);
      usedPath = errorPath;
    } catch {
      // Leave summary null if nothing could be read.
    }
  }

  const ok = exitCode === 0 && summary && summary.ok !== false;

  return {
    name: 'json-to-csv',
    ok,
    exitCode,
    summaryPath: usedPath,
  };
}

async function runPdfTextExtractorFlow() {
  const scriptPath = 'tests/e2e/pdf-text-extractor-tiny-reactive-harness.mjs';

  const exitCode = await new Promise((resolveCode) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      resolveCode(typeof code === 'number' ? code : 1);
    });
  });

  const artifactDir = resolve('artifacts', 'ui', 'pdf-text-extractor', dateSlug);
  const summaryPath = resolve(artifactDir, 'pdf-text-extractor-preview.json');
  const errorPath = resolve(artifactDir, 'pdf-text-extractor-preview.error.json');

  let summary = null;
  let usedPath = null;

  try {
    const buf = await readFile(summaryPath, 'utf8');
    summary = JSON.parse(buf);
    usedPath = summaryPath;
  } catch {
    try {
      const buf = await readFile(errorPath, 'utf8');
      summary = JSON.parse(buf);
      usedPath = errorPath;
    } catch {
      // Leave summary null if nothing could be read.
    }
  }

  const ok = exitCode === 0 && summary && summary.ok !== false;

  return {
    name: 'pdf-text-extractor',
    ok,
    exitCode,
    summaryPath: usedPath,
  };
}

async function runSitemapGeneratorFlow() {
  const scriptPath = 'tests/e2e/sitemap-generator-tiny-reactive-harness.mjs';

  const exitCode = await new Promise((resolveCode) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      resolveCode(typeof code === 'number' ? code : 1);
    });
  });

  const artifactDir = resolve('artifacts', 'ui', 'sitemap-generator', dateSlug);
  const summaryPath = resolve(artifactDir, 'sitemap-generator-preview.json');
  const errorPath = resolve(artifactDir, 'sitemap-generator-preview.error.json');

  let summary = null;
  let usedPath = null;

  try {
    const buf = await readFile(summaryPath, 'utf8');
    summary = JSON.parse(buf);
    usedPath = summaryPath;
  } catch {
    try {
      const buf = await readFile(errorPath, 'utf8');
      summary = JSON.parse(buf);
      usedPath = errorPath;
    } catch {
      // Leave summary null if nothing could be read.
    }
  }

  const ok = exitCode === 0 && summary && summary.ok !== false;

  return {
    name: 'sitemap-generator',
    ok,
    exitCode,
    summaryPath: usedPath,
  };
}

async function main() {
  await mkdir(resolve('artifacts', 'ui'), { recursive: true });

  const converterResult = await runConverterFlow();
  const dlfResult = await runDeadLinkFinderFlow();
  const sitemapResult = await runSitemapDeltaFlow();
  const waybackResult = await runWaybackFixerFlow();
  const encodingResult = await runEncodingDoctorFlow();
  const keywordResult = await runKeywordDensityFlow();
  const metaResult = await runMetaPreviewFlow();
  const csvJoinerResult = await runCsvJoinerFlow();
  const jsonToCsvResult = await runJsonToCsvFlow();
  const pdfTextResult = await runPdfTextExtractorFlow();
  const sitemapGenResult = await runSitemapGeneratorFlow();
  const dataToolsUiResult = await runDataToolsUiFlow();

  const results = {
    ranAt: new Date().toISOString(),
    allOk:
      converterResult.ok &&
      dlfResult.ok &&
      sitemapResult.ok &&
      waybackResult.ok &&
      encodingResult.ok &&
      keywordResult.ok &&
      metaResult.ok &&
      csvJoinerResult.ok &&
      jsonToCsvResult.ok &&
      pdfTextResult.ok &&
      sitemapGenResult.ok &&
      dataToolsUiResult.ok,
    tools: [
      converterResult,
      dlfResult,
      sitemapResult,
      waybackResult,
      encodingResult,
      keywordResult,
      metaResult,
      csvJoinerResult,
      jsonToCsvResult,
      pdfTextResult,
      sitemapGenResult,
      dataToolsUiResult,
    ],
  };

  const aggregatePath = resolve('artifacts', 'ui', `ui-e2e-${dateSlug}.json`);
  await writeFile(aggregatePath, JSON.stringify(results, null, 2), 'utf8');

  if (!results.allOk) {
    console.error('ui-e2e: one or more flows failed or are incomplete');
    const first = results.tools.find((t) => !t.ok);
    process.exitCode = (first && first.exitCode) || 1;
  } else {
    console.log('ui-e2e: all flows OK');
    console.log('Aggregate summary written to', aggregatePath);
  }
}

main().catch((err) => {
  console.error('ui-e2e: run-all crashed:', err);
  process.exit(1);
});
