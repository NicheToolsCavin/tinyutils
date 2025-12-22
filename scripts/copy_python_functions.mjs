#!/usr/bin/env node
/**
 * Post-build script to copy Python serverless functions into SvelteKit's .vercel/output/
 *
 * Problem: SvelteKit's adapter-vercel generates .vercel/output/ with a catch-all route
 * that intercepts ALL requests, including /api/* routes for Python functions.
 *
 * Solution: Manually copy Python functions to .vercel/output/functions/ with the required
 * .func suffix, configure .vc-config.json properly, and inject routes into config.json
 * BEFORE the catch-all.
 *
 * Key requirements for Vercel Build Output API:
 * 1. Function directories MUST have .func suffix (e.g., api/convert.func/)
 * 2. .vc-config.json MUST include: runtime, handler, launcherType
 * 3. Routes must point to the function path without .func suffix
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
    // Vercel Build Output API requires .func suffix for function directories
    dest: 'api/convert.func',
    route: '/api/convert',
    // Shared modules that this function imports (relative to rootDir)
    // Note: convert_backend imports from api._lib, so we need to copy that too
    sharedModules: ['convert_backend', 'api/_lib'],
    // .vc-config.json settings
    config: {
      // Using Python 3.9 for maximum compatibility
      runtime: 'python3.9',
      handler: 'index.py',
      launcherType: 'Nodejs',
      shouldAddHelpers: true,
      memory: 2048,
      maxDuration: 120
    }
  },
  {
    source: 'api/bulk-replace',
    dest: 'api/bulk-replace.func',
    route: '/api/bulk-replace',
    sharedModules: [],
    config: {
      runtime: 'python3.9',
      handler: 'index.py',
      launcherType: 'Nodejs',
      shouldAddHelpers: true,
      memory: 1024,
      maxDuration: 60
    }
  }
];

console.log('📦 Copying Python serverless functions to .vercel/output/...\n');

// Step 1: Copy Python function source code to output/functions/ with .func suffix
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

  // Write the proper .vc-config.json with all required fields
  const vcConfigPath = join(destPath, '.vc-config.json');
  console.log(`  ✓ Writing .vc-config.json with handler and launcherType`);
  writeFileSync(vcConfigPath, JSON.stringify(fn.config, null, 2));
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
// Route dest should NOT include .func suffix - Vercel handles that internally
const pythonRoutes = pythonFunctions.map(fn => ({
  src: `^${fn.route}(/.*)?$`,
  dest: fn.route,
  check: true
}));

config.routes.splice(catchAllIndex, 0, ...pythonRoutes);

console.log(`  ✓ Inserted ${pythonRoutes.length} Python routes before catch-all`);
writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('\n✅ Python functions integrated successfully!');
console.log('   Routes:', pythonFunctions.map(fn => fn.route).join(', '));
console.log('   Function dirs:', pythonFunctions.map(fn => fn.dest).join(', '));
console.log('   These will now be handled by Python instead of SvelteKit\n');
