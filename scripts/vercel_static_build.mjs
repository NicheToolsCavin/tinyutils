// Minimal Build Output API v3 for a static site
import { mkdirSync, rmSync, cpSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = process.cwd();
const outDir = `${root}/.vercel/output`;
const staticDir = `${outDir}/static`;
const publicDir = `${root}/public`;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });

if (existsSync(publicDir)) {
  cpSync(publicDir, staticDir, { recursive: true });
} else if (existsSync(`${root}/index.html`)) {
  cpSync(`${root}/index.html`, `${staticDir}/index.html`);
  if (existsSync(`${root}/assets`)) cpSync(`${root}/assets`, `${staticDir}/assets`, { recursive: true });
  if (existsSync(`${root}/css`))    cpSync(`${root}/css`, `${staticDir}/css`, { recursive: true });
  if (existsSync(`${root}/js`))     cpSync(`${root}/js`, `${staticDir}/js`, { recursive: true });
} else {
  console.error("No /public folder or root index.html found.");
  process.exit(1);
}

writeFileSync(`${outDir}/config.json`, JSON.stringify({ version: 3 }));
console.log("Built .vercel/output (static).");
