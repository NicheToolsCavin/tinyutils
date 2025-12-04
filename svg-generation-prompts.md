# Direct SVG Code Generation Prompts - Liquid Glass Design

Copy-paste each section to ChatGPT (regular or o1) to generate production-ready SVG code. Request clean, optimized SVG that can be directly embedded in our codebase.

---

## Priority 1: Tool Icon Set

### Dead Link Finder Icon
```
Generate a clean, production-ready SVG icon for a "Dead Link Finder" tool:

Concept: Broken chain or broken link symbol
Specifications:
- ViewBox: 0 0 64 64
- Style: Outline icon, 2px stroke width
- Color: currentColor (so we can style with CSS)
- Rounded line caps and joins (stroke-linecap="round" stroke-linejoin="round")
- Geometric and minimal
- Show a chain link that's broken/split in the middle

Requirements:
- Clean, optimized SVG code
- No unnecessary groups or transforms
- Use currentColor for stroke
- Include width/height attributes: 64x64
- Add aria-label for accessibility

Output the complete SVG code ready to paste into a .svg file.
```

### Sitemap Delta Icon
```
Generate a clean, production-ready SVG icon for a "Sitemap Delta" comparison tool:

Concept: Two overlapping documents with comparison/diff arrows
Specifications:
- ViewBox: 0 0 64 64
- Style: Outline icon, 2px stroke width
- Color: currentColor
- Rounded line caps and joins
- Show two document outlines with arrows indicating comparison (left/right arrows or up/down)

Requirements:
- Clean, optimized SVG code
- Use currentColor for stroke
- Include width/height: 64x64
- Accessible markup

Output the complete SVG code ready to paste into a .svg file.
```

### Wayback Fixer Icon
```
Generate a clean, production-ready SVG icon for a "Wayback Fixer" archive/time-travel tool:

Concept: Clock with counterclockwise arrow, or archive box with time symbol
Specifications:
- ViewBox: 0 0 64 64
- Style: Outline icon, 2px stroke width
- Color: currentColor
- Rounded line caps and joins
- Convey "going back in time" or "historical restoration"

Requirements:
- Clean, optimized SVG code
- Use currentColor for stroke
- Include width/height: 64x64
- Accessible markup

Output the complete SVG code ready to paste into a .svg file.
```

### Document Converter Icon
```
Generate a clean, production-ready SVG icon for a "Document Converter" tool:

Concept: Document with circular conversion arrows or transformation symbol
Specifications:
- ViewBox: 0 0 64 64
- Style: Outline icon, 2px stroke width
- Color: currentColor
- Rounded line caps and joins
- Show document outline with arrows suggesting format conversion

Requirements:
- Clean, optimized SVG code
- Use currentColor for stroke
- Include width/height: 64x64
- Accessible markup

Output the complete SVG code ready to paste into a .svg file.
```

### Keyword Density Icon
```
Generate a clean, production-ready SVG icon for a "Keyword Density" analytics tool:

Concept: Magnifying glass over document with bar chart or percentage
Specifications:
- ViewBox: 0 0 64 64
- Style: Outline icon, 2px stroke width
- Color: currentColor
- Rounded line caps and joins
- Combine search/magnifier with analytics visualization

Requirements:
- Clean, optimized SVG code
- Use currentColor for stroke
- Include width/height: 64x64
- Accessible markup

Output the complete SVG code ready to paste into a .svg file.
```

### Meta Preview Icon
```
Generate a clean, production-ready SVG icon for a "Meta Preview" tool:

Concept: Eye icon with browser window or preview card frame
Specifications:
- ViewBox: 0 0 64 64
- Style: Outline icon, 2px stroke width
- Color: currentColor
- Rounded line caps and joins
- Show eye/visibility concept with browser or card frame

Requirements:
- Clean, optimized SVG code
- Use currentColor for stroke
- Include width/height: 64x64
- Accessible markup

Output the complete SVG code ready to paste into a .svg file.
```

---

## Priority 2: Star Icon for Badges

### Custom Star Icon (No Emoji)
```
Generate a clean, production-ready SVG star icon for "Popular" badges:

Concept: Classic 5-point star, filled style
Specifications:
- ViewBox: 0 0 24 24
- Style: Filled star (not outline)
- Color: currentColor (so we can apply gold via CSS)
- Smooth, rounded points (not too sharp)
- Centered in viewBox

Requirements:
- Clean SVG path (single path element)
- Use currentColor for fill
- Include width/height: 24x24
- No stroke, filled only

Output the complete SVG code ready to use inline in HTML.
```

### Sparkle Icon (for "New" badge)
```
Generate a clean, production-ready SVG sparkle/twinkle icon:

Concept: 4-point sparkle (like a plus with diagonal lines)
Specifications:
- ViewBox: 0 0 24 24
- Style: Thin crossed lines forming sparkle
- Color: currentColor
- Geometric and minimal

Requirements:
- Clean SVG paths
- Use currentColor for stroke/fill
- Include width/height: 24x24

Output the complete SVG code ready to use inline in HTML.
```

### Flask Icon (for "Beta" badge)
```
Generate a clean, production-ready SVG flask/beaker icon:

Concept: Laboratory flask (experiment/testing symbol)
Specifications:
- ViewBox: 0 0 24 24
- Style: Simple outline, 2px stroke
- Color: currentColor
- Minimal lab flask shape

Requirements:
- Clean SVG path
- Use currentColor for stroke
- Include width/height: 24x24

Output the complete SVG code ready to use inline in HTML.
```

---

## Priority 3: Background Blob Shapes

### Organic Gradient Blobs (Set of 5)
```
Generate 5 unique organic blob shapes as individual SVG files:

Specifications for EACH blob:
- ViewBox: 0 0 400 400
- Style: Smooth, organic curves (use bezier curves)
- No sharp angles
- Asymmetric but balanced
- Each blob should be unique but cohesive
- Include linear or radial gradient definitions

Blob characteristics:
- Use <path> with smooth bezier curves
- Define gradient in <defs> section
- Apply gradient as fill
- Make shapes look liquid/morphable

Gradient colors (one per blob):
1. Blob 1: Pink to purple (#FF6B9D → #C084FC)
2. Blob 2: Cyan to blue (#4ECDC4 → #3B82F6)
3. Blob 3: Green to teal (#A8E6CF → #2DD4BF)
4. Blob 4: Yellow to orange (#FFD93D → #FB923C)
5. Blob 5: Purple to indigo (#A78BFA → #6366F1)

Requirements:
- 5 separate SVG code blocks
- Clean, optimized paths
- Gradients defined inline
- Include width/height: 400x400

Output 5 complete SVG code blocks labeled blob-1.svg through blob-5.svg.
```

---

## Priority 4: Corner Brackets

### Decorative Corner Brackets
```
Generate 4 corner bracket SVGs (one for each corner):

Concept: Thin L-shaped brackets for card corners
Specifications:
- ViewBox: 0 0 24 24
- Style: 1px stroke, L-shaped corner lines
- Color: currentColor with low opacity
- Rounded line caps
- Length: 16px on each side of the L

Create 4 variants:
1. Top-left (lines extend right and down)
2. Top-right (lines extend left and down)
3. Bottom-left (lines extend right and up)
4. Bottom-right (lines extend left and up)

Requirements:
- Clean SVG code for each variant
- Use currentColor for stroke
- stroke-width: 1
- stroke-linecap: round

Output 4 separate SVG code blocks labeled:
- corner-tl.svg
- corner-tr.svg
- corner-bl.svg
- corner-br.svg
```

---

## Priority 5: Loading Spinner

### Glass Loading Spinner
```
Generate a loading spinner SVG with glassmorphism aesthetic:

Concept: Partial circle (270° arc, not complete)
Specifications:
- ViewBox: 0 0 48 48
- Style: Circular arc, 3px stroke width
- Rounded line caps
- Gradient stroke (purple to cyan)
- Designed to rotate via CSS animation

Requirements:
- Use <circle> with stroke-dasharray/dashoffset for partial arc
- Define gradient in <defs>: #A78BFA → #4ECDC4
- Apply gradient as stroke
- Center the arc in viewBox
- Include width/height: 48x48

Output complete SVG code ready for CSS rotation animation.
```

---

## Priority 6: Sparkles for Micro-Animations

### Sparkle/Star Set for Animations
```
Generate 5 small sparkle/star shapes for floating animations:

Variations needed:
1. 4-point star (diamond, 8x8px)
2. 6-point star (classic, 12x12px)
3. 8-point star (detailed, 16x16px)
4. Small dot (circle, 4x4px)
5. Plus sign (8x8px)

Specifications for each:
- Appropriate viewBox for size
- Filled style (not outline)
- Color: currentColor
- Geometric and clean

Requirements:
- 5 separate SVG code blocks
- Use currentColor for fill
- Minimal, optimized paths

Output 5 SVG code blocks labeled:
- sparkle-4pt.svg
- sparkle-6pt.svg
- sparkle-8pt.svg
- sparkle-dot.svg
- sparkle-plus.svg
```

---

## General Instructions for ALL SVGs

When generating SVG code, please ensure:

1. **Clean markup**: No unnecessary groups, transforms, or metadata
2. **currentColor**: Use `currentColor` for colors so we can style with CSS
3. **Optimized paths**: Use minimal path commands, round numbers
4. **Accessibility**: Include `role="img"` and `aria-label` where appropriate
5. **ViewBox**: Always include viewBox for scalability
6. **Dimensions**: Include width and height attributes
7. **Semantic naming**: Use descriptive IDs for gradients/defs

## Example of Perfect SVG Output:

```xml
<svg
  width="64"
  height="64"
  viewBox="0 0 64 64"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="Tool icon"
>
  <path
    d="M..."
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
```

## Color Palette Reference

For gradients that need specific colors:

| Color Name | Hex Code |
|------------|----------|
| Pink | #FF6B9D |
| Purple | #C084FC |
| Lavender | #A78BFA |
| Cyan | #4ECDC4 |
| Blue | #3B82F6 |
| Teal | #2DD4BF |
| Green | #A8E6CF |
| Yellow | #FFD93D |
| Orange | #FB923C |
| Indigo | #6366F1 |
| Gold | #FFD700 |

---

**Usage:** Copy each prompt section and paste into ChatGPT. Request "Give me the complete SVG code for this" and you'll get production-ready code to paste directly into .svg files or inline in HTML!
