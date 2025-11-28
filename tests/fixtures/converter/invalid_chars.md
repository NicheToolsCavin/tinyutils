# Test Document with Invalid Characters

This document contains various invalid characters for sanitization testing.

Non-breaking space example: This should be converted to a regular space: "hello world" (that's a non-breaking space between hello and world).

Zero-width characters:
- Zero-width space: "hello​world" (zero-width space between hello and world)
- Zero-width non-joiner: "hello‌world" (zero-width non-joiner between hello and world)
- Zero-width joiner: "hello‍world" (zero-width joiner between hello and world)

Other Unicode characters to clean: 
- Soft hyphen (0x00AD): "re­sume"
- Byte order mark: "text ﻿ with bom"
- Various control characters: "text