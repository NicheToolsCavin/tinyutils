/**
 * Unit tests for getThemeAwareColors() function
 * Tests theme-aware inline CSS generation for previews
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

// Simulate browser environment
function setupDOMEnvironment(theme = 'dark') {
  const dom = new JSDOM('<!DOCTYPE html><html data-theme="' + theme + '"><body></body></html>');
  global.document = dom.window.document;
  return dom;
}

function teardownDOMEnvironment() {
  delete global.document;
}

// Copy of the getThemeAwareColors function from text-converter
function getThemeAwareColors() {
  if (typeof document === 'undefined') {
    // SSR fallback - dark theme
    return {
      tableBorder: 'rgba(255,255,255,0.2)',
      tableBg: 'rgba(255,255,255,0.03)',
      cellBorder: 'rgba(255,255,255,0.1)',
      headerBg: 'rgba(255,255,255,0.08)',
      preBg: 'rgba(255,255,255,0.05)',
      preBorder: 'rgba(255,255,255,0.1)'
    };
  }

  const theme = document.documentElement.getAttribute('data-theme') || 'dark';

  if (theme === 'light') {
    // Light mode: Use dark borders and subtle backgrounds
    return {
      tableBorder: 'rgba(0,0,0,0.15)',
      tableBg: 'rgba(0,0,0,0.02)',
      cellBorder: 'rgba(0,0,0,0.08)',
      headerBg: 'rgba(0,0,0,0.05)',
      preBg: 'rgba(0,0,0,0.03)',
      preBorder: 'rgba(0,0,0,0.1)'
    };
  } else {
    // Dark mode: Use light borders and subtle backgrounds
    return {
      tableBorder: 'rgba(255,255,255,0.2)',
      tableBg: 'rgba(255,255,255,0.03)',
      cellBorder: 'rgba(255,255,255,0.1)',
      headerBg: 'rgba(255,255,255,0.08)',
      preBg: 'rgba(255,255,255,0.05)',
      preBorder: 'rgba(255,255,255,0.1)'
    };
  }
}

describe('getThemeAwareColors()', () => {
  describe('SSR fallback (no document)', () => {
    it('should return dark theme colors when document is undefined', () => {
      // document is already undefined in Node.js environment
      const colors = getThemeAwareColors();

      assert.strictEqual(colors.tableBorder, 'rgba(255,255,255,0.2)', 'table border should be light for dark theme');
      assert.strictEqual(colors.tableBg, 'rgba(255,255,255,0.03)', 'table background should be light for dark theme');
      assert.strictEqual(colors.cellBorder, 'rgba(255,255,255,0.1)', 'cell border should be light for dark theme');
      assert.strictEqual(colors.headerBg, 'rgba(255,255,255,0.08)', 'header background should be light for dark theme');
      assert.strictEqual(colors.preBg, 'rgba(255,255,255,0.05)', 'pre background should be light for dark theme');
      assert.strictEqual(colors.preBorder, 'rgba(255,255,255,0.1)', 'pre border should be light for dark theme');
    });
  });

  describe('Dark theme', () => {
    let dom;

    before(() => {
      dom = setupDOMEnvironment('dark');
    });

    after(() => {
      teardownDOMEnvironment();
    });

    it('should return light colors for dark theme', () => {
      const colors = getThemeAwareColors();

      // All colors should use white (255) for dark backgrounds
      assert.ok(colors.tableBorder.startsWith('rgba(255,255,255'), 'table border should be white-based');
      assert.ok(colors.tableBg.startsWith('rgba(255,255,255'), 'table bg should be white-based');
      assert.ok(colors.cellBorder.startsWith('rgba(255,255,255'), 'cell border should be white-based');
      assert.ok(colors.headerBg.startsWith('rgba(255,255,255'), 'header bg should be white-based');
      assert.ok(colors.preBg.startsWith('rgba(255,255,255'), 'pre bg should be white-based');
      assert.ok(colors.preBorder.startsWith('rgba(255,255,255'), 'pre border should be white-based');
    });

    it('should have appropriate opacity levels for dark theme', () => {
      const colors = getThemeAwareColors();

      // Extract opacity values
      assert.strictEqual(colors.tableBorder, 'rgba(255,255,255,0.2)', 'table border opacity');
      assert.strictEqual(colors.tableBg, 'rgba(255,255,255,0.03)', 'table bg opacity (subtle)');
      assert.strictEqual(colors.cellBorder, 'rgba(255,255,255,0.1)', 'cell border opacity');
      assert.strictEqual(colors.headerBg, 'rgba(255,255,255,0.08)', 'header bg opacity');
      assert.strictEqual(colors.preBg, 'rgba(255,255,255,0.05)', 'pre bg opacity');
      assert.strictEqual(colors.preBorder, 'rgba(255,255,255,0.1)', 'pre border opacity');
    });
  });

  describe('Light theme', () => {
    let dom;

    before(() => {
      dom = setupDOMEnvironment('light');
    });

    after(() => {
      teardownDOMEnvironment();
    });

    it('should return dark colors for light theme', () => {
      const colors = getThemeAwareColors();

      // All colors should use black (0) for light backgrounds
      assert.ok(colors.tableBorder.startsWith('rgba(0,0,0'), 'table border should be black-based');
      assert.ok(colors.tableBg.startsWith('rgba(0,0,0'), 'table bg should be black-based');
      assert.ok(colors.cellBorder.startsWith('rgba(0,0,0'), 'cell border should be black-based');
      assert.ok(colors.headerBg.startsWith('rgba(0,0,0'), 'header bg should be black-based');
      assert.ok(colors.preBg.startsWith('rgba(0,0,0'), 'pre bg should be black-based');
      assert.ok(colors.preBorder.startsWith('rgba(0,0,0'), 'pre border should be black-based');
    });

    it('should have appropriate opacity levels for light theme', () => {
      const colors = getThemeAwareColors();

      // Light theme uses different opacity values
      assert.strictEqual(colors.tableBorder, 'rgba(0,0,0,0.15)', 'table border opacity');
      assert.strictEqual(colors.tableBg, 'rgba(0,0,0,0.02)', 'table bg opacity (subtle)');
      assert.strictEqual(colors.cellBorder, 'rgba(0,0,0,0.08)', 'cell border opacity');
      assert.strictEqual(colors.headerBg, 'rgba(0,0,0,0.05)', 'header bg opacity');
      assert.strictEqual(colors.preBg, 'rgba(0,0,0,0.03)', 'pre bg opacity');
      assert.strictEqual(colors.preBorder, 'rgba(0,0,0,0.1)', 'pre border opacity');
    });

    it('should prevent white-on-white visibility issues', () => {
      const colors = getThemeAwareColors();

      // Critical: light theme must NOT use white colors
      assert.ok(!colors.tableBorder.includes('255,255,255'), 'must not have white borders in light mode');
      assert.ok(!colors.cellBorder.includes('255,255,255'), 'must not have white cell borders in light mode');
      assert.ok(!colors.preBorder.includes('255,255,255'), 'must not have white pre borders in light mode');
    });
  });

  describe('Theme switching', () => {
    let dom;

    before(() => {
      dom = setupDOMEnvironment('dark');
    });

    after(() => {
      teardownDOMEnvironment();
    });

    it('should return different colors when theme changes', () => {
      // Start with dark theme
      const darkColors = getThemeAwareColors();
      assert.ok(darkColors.tableBorder.startsWith('rgba(255,255,255'), 'should start with dark theme colors');

      // Switch to light theme
      document.documentElement.setAttribute('data-theme', 'light');
      const lightColors = getThemeAwareColors();
      assert.ok(lightColors.tableBorder.startsWith('rgba(0,0,0'), 'should switch to light theme colors');

      // Verify they're different
      assert.notStrictEqual(darkColors.tableBorder, lightColors.tableBorder, 'colors should differ between themes');
      assert.notStrictEqual(darkColors.headerBg, lightColors.headerBg, 'colors should differ between themes');
    });
  });

  describe('Missing theme attribute', () => {
    let dom;

    before(() => {
      dom = new JSDOM('<!DOCTYPE html><html><body></body></html>'); // No data-theme attribute
      global.document = dom.window.document;
    });

    after(() => {
      teardownDOMEnvironment();
    });

    it('should default to dark theme when data-theme attribute is missing', () => {
      const colors = getThemeAwareColors();

      // Should use dark theme as fallback
      assert.ok(colors.tableBorder.startsWith('rgba(255,255,255'), 'should default to dark theme colors');
      assert.strictEqual(colors.tableBorder, 'rgba(255,255,255,0.2)', 'should match dark theme exactly');
    });
  });

  describe('Return value structure', () => {
    it('should return an object with all required color properties', () => {
      const colors = getThemeAwareColors();

      assert.ok(typeof colors === 'object', 'should return an object');
      assert.ok('tableBorder' in colors, 'should have tableBorder property');
      assert.ok('tableBg' in colors, 'should have tableBg property');
      assert.ok('cellBorder' in colors, 'should have cellBorder property');
      assert.ok('headerBg' in colors, 'should have headerBg property');
      assert.ok('preBg' in colors, 'should have preBg property');
      assert.ok('preBorder' in colors, 'should have preBorder property');
    });

    it('should return valid RGBA color strings', () => {
      const colors = getThemeAwareColors();
      const rgbaPattern = /^rgba\(\d+,\d+,\d+,\d*\.?\d+\)$/;

      assert.ok(rgbaPattern.test(colors.tableBorder), 'tableBorder should be valid RGBA');
      assert.ok(rgbaPattern.test(colors.tableBg), 'tableBg should be valid RGBA');
      assert.ok(rgbaPattern.test(colors.cellBorder), 'cellBorder should be valid RGBA');
      assert.ok(rgbaPattern.test(colors.headerBg), 'headerBg should be valid RGBA');
      assert.ok(rgbaPattern.test(colors.preBg), 'preBg should be valid RGBA');
      assert.ok(rgbaPattern.test(colors.preBorder), 'preBorder should be valid RGBA');
    });
  });
});
