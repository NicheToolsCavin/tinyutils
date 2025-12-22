#!/usr/bin/env node
/**
 * Post-build script to copy Python serverless functions into SvelteKit's .vercel/output/
 *
 * Problem: SvelteKit's adapter-vercel generates .vercel/output/ with a catch-all route
 * that intercepts ALL requests, including /api/* routes for Python functions.
 *
 * Solution: Manually copy Python functions and inject routes into config.json BEFORE
 * the catch-all, so Vercel routes /api/* to Python functions instead of SvelteKit.
 */

import { readFileSync, writeFileSync, cpSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outputDir = join(rootDir, '.vercel/output');
const configPath = join(outputDir, 'config.json');
const functionsDir = join(outputDir, 'functions');

// Python functions to copy
const pythonFunctions = [
  {
    source: 'api/convert',
    dest: 'api/convert',
    // Shared modules that this function imports (relative to rootDir)
    // Note: convert_backend imports from api._lib, so we need to copy that too
    sharedModules: ['convert_backend', 'api/_lib']
  },
  {
    source: 'api/bulk-replace',
    dest: 'api/bulk-replace',
    sharedModules: []
  }
];

console.log('📦 Copying Python serverless functions to .vercel/output/...\n');

// Step 1: Copy Python function source code to output/functions/
for (const fn of pythonFunctions) {
  const sourcePath = join(rootDir, fn.source);
  const destPath = join(functionsDir, fn.dest);

  if (!existsSync(sourcePath)) {
    console.warn(`⚠️  Source not found: ${fn.source}`);
    continue;
  }

  console.log(`  ✓ Copying ${fn.source} → .vercel/output/functions/${fn.dest}`);
  mkdirSync(dirname(destPath), { recursive: true });
  cpSync(sourcePath, destPath, { recursive: true });

  // Copy shared modules into the function directory so imports work
  for (const mod of fn.sharedModules || []) {
    const modSource = join(rootDir, mod);
    const modDest = join(destPath, mod);
    if (!existsSync(modSource)) {
      console.warn(`⚠️  Shared module not found: ${mod}`);
      continue;
    }
    console.log(`  ✓ Copying shared module ${mod} → .vercel/output/functions/${fn.dest}/${mod}`);
    cpSync(modSource, modDest, { recursive: true });
  }
}

// Step 2: Modify config.json to add Python routes BEFORE the catch-all
console.log('\n🔧 Injecting Python API routes into config.json...\n');

const config = JSON.parse(readFileSync(configPath, 'utf-8'));

// Find the catch-all route (usually last)
const catchAllIndex = config.routes.findIndex(r => r.src === '/.*');

if (catchAllIndex === -1) {
  console.error('❌ Could not find catch-all route in config.json');
  process.exit(1);
}

// Insert Python routes BEFORE the catch-all
const pythonRoutes = [
  {
    src: '^/api/convert(/.*)?$',
    dest: '/api/convert',
    check: true
  },
  {
    src: '^/api/bulk-replace(/.*)?$',
    dest: '/api/bulk-replace',
    check: true
  }
];

config.routes.splice(catchAllIndex, 0, ...pythonRoutes);

console.log(`  ✓ Inserted ${pythonRoutes.length} Python routes before catch-all`);
writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('\n✅ Python functions integrated successfully!');
console.log('   Routes: /api/convert, /api/bulk-replace');
console.log('   These will now be handled by Python instead of SvelteKit\n');
