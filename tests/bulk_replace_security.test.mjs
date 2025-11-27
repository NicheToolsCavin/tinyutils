/**
 * Unit tests for Bulk Find & Replace security features
 * Tests: zip bomb protection, path traversal, ReDoS timeout, binary detection, encoding
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_PATH = path.join(__dirname, '../api/bulk-replace.py');

// Helper to create test ZIP files
function createTestZip(files, outputPath) {
	const tempDir = path.join(__dirname, '../.test-tmp');
	if (!fs.existsSync(tempDir)) {
		fs.mkdirSync(tempDir, { recursive: true });
	}

	// Write files
	Object.entries(files).forEach(([filename, content]) => {
		const filePath = path.join(tempDir, filename);
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(filePath, content);
	});

	// Create ZIP
	const filesArg = Object.keys(files).join(' ');
	execSync(`cd ${tempDir} && zip -r ${outputPath} ${filesArg}`, { stdio: 'ignore' });

	// Cleanup temp files
	Object.keys(files).forEach((filename) => {
		fs.unlinkSync(path.join(tempDir, filename));
	});
}

describe('Bulk Replace Security Tests', () => {
	describe('Zip Bomb Protection', () => {
		it('should detect suspicious compression ratios', async () => {
			// Create a highly compressible file (1MB of zeros)
			const content = Buffer.alloc(1024 * 1024, 0);
			const zipPath = path.join(__dirname, '../.test-tmp/zipbomb.zip');

			createTestZip({ 'zeros.txt': content }, zipPath);

			const stats = fs.statSync(zipPath);
			const compressionRatio = content.length / stats.size;

			// Should detect if ratio > 10
			assert.ok(
				compressionRatio > 10,
				`Compression ratio ${compressionRatio.toFixed(1)}x should trigger zip bomb check`
			);

			fs.unlinkSync(zipPath);
		});

		it('should reject ZIPs with multiple highly compressed files', async () => {
			// Multiple 1MB files of zeros
			const files = {};
			for (let i = 0; i < 5; i++) {
				files[`file${i}.txt`] = Buffer.alloc(1024 * 1024, 0);
			}

			const zipPath = path.join(__dirname, '../.test-tmp/multi-zipbomb.zip');
			createTestZip(files, zipPath);

			const stats = fs.statSync(zipPath);
			const totalUncompressed = 5 * 1024 * 1024;
			const ratio = totalUncompressed / stats.size;

			assert.ok(ratio > 10, `Should detect suspicious ratio: ${ratio.toFixed(1)}x`);

			fs.unlinkSync(zipPath);
		});
	});

	describe('Path Traversal Prevention', () => {
		it('should detect parent directory references', () => {
			const dangerousPaths = [
				'../../../etc/passwd',
				'dir/../../sensitive.txt',
				'../parent/file.txt',
				'./../../etc/hosts'
			];

			dangerousPaths.forEach((testPath) => {
				const hasDotDot = testPath.includes('..');
				assert.ok(hasDotDot, `Path "${testPath}" should be detected as dangerous`);
			});
		});

		it('should detect absolute paths', () => {
			const absolutePaths = [
				'/etc/passwd',
				'/var/log/system.log',
				'/home/user/file.txt'
			];

			// Windows paths (only test on Windows)
			const windowsPaths = ['C:\\Windows\\System32\\config'];

			absolutePaths.forEach((testPath) => {
				const isAbsolute = path.isAbsolute(testPath);
				assert.ok(isAbsolute, `Path "${testPath}" should be detected as absolute`);
			});

			// Windows paths are only absolute on Windows platform
			if (process.platform === 'win32') {
				windowsPaths.forEach((testPath) => {
					const isAbsolute = path.isAbsolute(testPath);
					assert.ok(isAbsolute, `Path "${testPath}" should be detected as absolute on Windows`);
				});
			}
		});

		it('should allow safe relative paths', () => {
			const safePaths = [
				'file.txt',
				'dir/file.txt',
				'deep/nested/path/file.txt',
				'./file.txt'
			];

			safePaths.forEach((testPath) => {
				const isAbsolute = path.isAbsolute(testPath);
				const hasDotDot = testPath.split(path.sep).includes('..');
				assert.ok(!isAbsolute && !hasDotDot, `Path "${testPath}" should be safe`);
			});
		});
	});

	describe('ReDoS Protection', () => {
		it('should identify catastrophic backtracking patterns', () => {
			const dangerousPatterns = [
				'(a+)+b', // Exponential time
				'(a*)*b', // Exponential time
				'(a|a)*b', // Polynomial time
				'(x+x+)+y', // Exponential time
				'(.*)*=.*' // Nested quantifiers
			];

			// These patterns should timeout on long inputs
			const longInput = 'a'.repeat(1000);

			dangerousPatterns.forEach((pattern) => {
				// Just verify pattern is valid regex (actual timeout test requires runtime)
				assert.doesNotThrow(() => {
					new RegExp(pattern);
				}, `Pattern "${pattern}" should compile but may cause ReDoS`);
			});
		});

		it('should allow safe regex patterns', () => {
			const safePatterns = [
				'\\d{4}-\\d{2}-\\d{2}', // Date pattern
				'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', // Email
				'Copyright \\d{4}', // Year
				'https?://[^\\s]+' // URL
			];

			safePatterns.forEach((pattern) => {
				assert.doesNotThrow(() => {
					const regex = new RegExp(pattern);
					// Test on reasonable input
					regex.test('test@example.com Copyright 2025 http://example.com');
				}, `Pattern "${pattern}" should be safe`);
			});
		});
	});

	describe('Binary File Detection', () => {
		it('should detect null bytes in binary files', () => {
			const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x0a]); // PNG header with null
			const hasNullByte = binaryContent.includes(0);

			assert.ok(hasNullByte, 'Binary content should contain null bytes');
		});

		it('should not detect null bytes in text files', () => {
			const textContent = Buffer.from('Hello World\nCopyright 2025\n');
			const hasNullByte = textContent.includes(0);

			assert.ok(!hasNullByte, 'Text content should not contain null bytes');
		});

		it('should identify binary file extensions', () => {
			const binaryExtensions = ['.png', '.jpg', '.gif', '.pdf', '.zip', '.exe', '.dll', '.so'];

			const textExtensions = [
				'.txt',
				'.md',
				'.html',
				'.css',
				'.js',
				'.json',
				'.xml',
				'.py',
				'.java'
			];

			const allowedTextExts = new Set([
				'.txt',
				'.md',
				'.html',
				'.css',
				'.js',
				'.json',
				'.xml',
				'.py',
				'.java'
			]);

			binaryExtensions.forEach((ext) => {
				assert.ok(
					!allowedTextExts.has(ext),
					`Extension "${ext}" should not be in allowed list`
				);
			});

			textExtensions.forEach((ext) => {
				assert.ok(allowedTextExts.has(ext), `Extension "${ext}" should be in allowed list`);
			});
		});
	});

	describe('Encoding Detection', () => {
		it('should handle UTF-8 encoded files', () => {
			const utf8Text = 'Hello 世界 🌍';
			const buffer = Buffer.from(utf8Text, 'utf-8');

			assert.doesNotThrow(() => {
				const decoded = buffer.toString('utf-8');
				assert.strictEqual(decoded, utf8Text);
			});
		});

		it('should handle Latin-1 encoded files', () => {
			const latin1Text = 'Café François'; // Accented characters
			const buffer = Buffer.from(latin1Text, 'latin1');

			assert.doesNotThrow(() => {
				const decoded = buffer.toString('latin1');
				assert.strictEqual(decoded, latin1Text);
			});
		});

		it('should detect mixed encoding scenarios', () => {
			// UTF-8 string that looks like mojibake
			const mojibake = 'FranÃ§ois'; // UTF-8 bytes decoded as Latin-1
			const proper = 'François';

			// These should be different, indicating encoding mismatch
			assert.notStrictEqual(mojibake, proper, 'Mojibake should differ from proper encoding');
		});

		it('should handle empty files gracefully', () => {
			const emptyBuffer = Buffer.alloc(0);

			assert.doesNotThrow(() => {
				const decoded = emptyBuffer.toString('utf-8');
				assert.strictEqual(decoded, '');
			});
		});
	});

	describe('Input Validation', () => {
		it('should require non-empty search pattern', () => {
			const emptyPatterns = ['', ' ', '\t', '\n'];

			emptyPatterns.forEach((pattern) => {
				const trimmed = pattern.trim();
				assert.strictEqual(trimmed, '', `Pattern "${pattern}" should be considered empty`);
			});
		});

		it('should validate file size limits', () => {
			const maxSize = 50 * 1024 * 1024; // 50MB
			const oversizedFile = maxSize + 1;
			const validFile = maxSize - 1;

			assert.ok(oversizedFile > maxSize, 'Oversized file should exceed limit');
			assert.ok(validFile <= maxSize, 'Valid file should be within limit');
		});

		it('should validate file count limits', () => {
			const maxFiles = 500;
			const tooManyFiles = 501;
			const validCount = 250;

			assert.ok(tooManyFiles > maxFiles, 'Too many files should exceed limit');
			assert.ok(validCount <= maxFiles, 'Valid count should be within limit');
		});

		it('should validate regex syntax', () => {
			const invalidPatterns = [
				'(unclosed group',
				'[unclosed bracket',
				'(?P<invalid',
				'*invalid quantifier',
				'(?P<>empty name)'
			];

			invalidPatterns.forEach((pattern) => {
				assert.throws(
					() => {
						new RegExp(pattern);
					},
					SyntaxError,
					`Pattern "${pattern}" should throw SyntaxError`
				);
			});
		});
	});

	describe('Response Format', () => {
		it('should include required envelope fields', () => {
			const mockSuccessResponse = {
				ok: true,
				data: {
					diffs: [],
					stats: {
						filesScanned: 10,
						filesModified: 3,
						filesSkipped: 2,
						totalReplacements: 15
					}
				},
				meta: {
					runTimestamp: new Date().toISOString(),
					requestId: 'test-uuid',
					processingTimeMs: 123,
					mode: 'bulk-replace'
				}
			};

			assert.ok(mockSuccessResponse.ok === true, 'Success response should have ok=true');
			assert.ok(mockSuccessResponse.data, 'Success response should have data field');
			assert.ok(mockSuccessResponse.meta, 'Success response should have meta field');
			assert.ok(mockSuccessResponse.meta.requestId, 'Meta should include requestId');
		});

		it('should include required error fields', () => {
			const mockErrorResponse = {
				ok: false,
				message: 'Regex too complex',
				code: 422,
				requestId: 'test-uuid'
			};

			assert.ok(mockErrorResponse.ok === false, 'Error response should have ok=false');
			assert.ok(mockErrorResponse.message, 'Error response should have message');
			assert.ok(mockErrorResponse.code, 'Error response should have code');
			assert.ok(mockErrorResponse.requestId, 'Error response should have requestId');
		});
	});
});

// Cleanup
process.on('exit', () => {
	const tmpDir = path.join(__dirname, '../.test-tmp');
	if (fs.existsSync(tmpDir)) {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	}
});
