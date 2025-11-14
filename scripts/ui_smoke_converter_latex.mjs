// Minimal UI-like smoke for LaTeX → {md,txt}
// Posts the same payload shape the UI uses (data: URL + name)
// Usage: node scripts/ui_smoke_converter_latex.mjs https://<preview-host>/tools/text-converter/

import fs from 'fs/promises';

const base = (process.env.BASE_URL || process.argv[2] || '').replace(/\/$/, '');
if (!base) {
  console.error('Usage: BASE_URL=https://<host> node scripts/ui_smoke_converter_latex.mjs');
  process.exit(2);
}
const api = base.replace(/\/tools\/text-converter\/?$/, '') + '/api/convert';

const tex = String.raw`\\documentclass{article}
\\begin{document}
\\section{Intro}
Here is inline math $a^2+b^2=c^2$ and display:
\\[ E=mc^2 \\\]
\\begin{itemize}
\\item Item A
\\item Item B
\\end{itemize}
\\end{document}`;

const blobUrl = 'data:text/plain;base64,' + Buffer.from(tex, 'utf8').toString('base64');

async function runOnce(from) {
  const body = {
    inputs: [{ blobUrl, name: 'sample.tex' }],
    from,
    to: ['md', 'txt'],
    options: { removeZeroWidth: true }
  };
  const res = await fetch(api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return { status: res.status, ok: res.ok, json };
  } catch {
    return { status: res.status, ok: res.ok, text };
  }
}

const out = { base, api, runs: {} };
out.runs.auto = await runOnce('auto');
out.runs.latex = await runOnce('latex');

const dir = 'tinyutils/artifacts/text-converter/' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '/latex-smoke/';
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(dir + 'result.json', JSON.stringify(out, null, 2));
console.log('latex smoke stored at', dir + 'result.json');

