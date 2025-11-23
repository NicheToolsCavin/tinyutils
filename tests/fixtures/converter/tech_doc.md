# Fidelity Test Document 

This document is used to exercise the TinyUtils converter. It combines
headings, lists, tables, images, links, and code blocks in one place so
we can spot where fidelity breaks.

## 1. Text formatting

This paragraph mixes **bold text**, *italic text*, and ~~strikethrough~~
for emphasis. It also includes `inline code` for short technical terms
and references.

## 2. Lists

### 2.1 Ordered list

**Ordered:**

1. First item
2. Second item with **bold**
3. Third item with *italic*

### 2.2 Unordered + nested

**Unordered:**

- Bullet one
- Bullet two
  - Nested bullet
  - Another nested
- Bullet three

## 3. Code block

```javascript
function test() {
  console.log("Does code formatting survive?");
}
```

Another fenced block with a different language:

```python
def add(a, b):
    return a + b
```

## 4. Tables

| Feature      | Support | Notes                          |
|--------------|---------|--------------------------------|
| Images       | ✅      | Should preserve                |
| Tables       | ✅      | Formatting intact              |
| Bold/Italic  | ✅      | Styles maintained              |
| Links        | ✅      | [Example](https://example.com) |

**Complex table with alignment:**

| Left Align | Center Align | Right Align |
|:-----------|:------------:|------------:|
| Text       | Centered     | 123         |
| More text  | Also centered| 456         |

## 5. Blockquote

> This is a blockquote
> with multiple lines
> to test preservation

## 6. Image

Here is a test image that should appear in all converted formats:

![Test Image](test_image.png)

## 7. Horizontal rule and links

---

Visit [TinyUtils](https://tinyutils.net) for more tools.

## 8. Metadata

- Approximate word count: ~150
- Last updated: 2025-11-18

