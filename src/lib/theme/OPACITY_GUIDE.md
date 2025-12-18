# Opacity Value Guide for TinyUtils Glass Theme

This document explains why different components use different opacity values in the liquid glass design system.

## Philosophy

Opacity values are carefully tuned based on:
1. **Context**: Where the element appears (card, table, code block)
2. **Content importance**: How prominently it should stand out
3. **Readability**: Ensuring text remains clear
4. **Visual hierarchy**: Creating depth without overwhelming

## Component-Specific Opacity Values

### Tool Cards (`ToolCard.svelte`)

**Purpose**: Hero components on landing page - need to feel substantial and clickable

```css
/* Light mode */
background: rgba(255, 255, 255, 0.55) → rgba(255, 255, 255, 0.25)  /* 55%-25% gradient */

/* Dark mode */
background: rgba(255, 255, 255, 0.15) → rgba(255, 255, 255, 0.05)  /* 15%-5% gradient */
```

**Why these values:**
- **Higher opacity (55% / 15%)**: Cards are primary UI elements that need to stand out
- **Gradient**: Creates depth and 3D effect, simulating curved glass surface
- **Light mode is stronger**: White cards on light backgrounds need more opacity to be visible

---

### Preview Tables & Code Blocks (`text-converter/+page.svelte`)

**Purpose**: Inline previews in iframes - need to be subtle and not distract from content

```css
/* Light mode */
tableBorder: rgba(0,0,0,0.15)    /* 15% - table outline */
tableBg: rgba(0,0,0,0.02)        /* 2% - table background */
cellBorder: rgba(0,0,0,0.08)     /* 8% - cell separation */
headerBg: rgba(0,0,0,0.05)       /* 5% - sticky header */
preBg: rgba(0,0,0,0.03)          /* 3% - code background */
preBorder: rgba(0,0,0,0.1)       /* 10% - code outline */

/* Dark mode */
tableBorder: rgba(255,255,255,0.2)    /* 20% - table outline */
tableBg: rgba(255,255,255,0.03)       /* 3% - table background */
cellBorder: rgba(255,255,255,0.1)     /* 10% - cell separation */
headerBg: rgba(255,255,255,0.08)      /* 8% - sticky header */
preBg: rgba(255,255,255,0.05)         /* 5% - code background */
preBorder: rgba(255,255,255,0.1)      /* 10% - code outline */
```

**Why these values:**
- **Much lower opacity (2%-20%)**: Previews are secondary - content is the star
- **Borders stronger than backgrounds**: Structure needs to be visible without overwhelming
- **Headers slightly stronger**: Need to stand out when sticky-scrolling
- **Very subtle backgrounds (2%-5%)**: Just enough depth to distinguish sections

**Key difference from Tool Cards:**
- Tool Cards: `55%` (primary UI, needs presence)
- Preview Tables: `2%-5%` backgrounds (support content, stay subtle)
- **10x difference** reflects their different roles in the hierarchy

---

### Feature Badges (`ToolCard.svelte`)

```css
/* Dark mode */
background: rgba(59, 130, 246, 0.15)    /* 15% blue */
border: rgba(59, 130, 246, 0.25)        /* 25% blue */

/* Light mode */
background: rgba(255, 255, 255, 0.85) → rgba(255, 255, 255, 0.5)  /* 85%-50% gradient */
box-shadow: 0 2px 8px rgba(31, 38, 135, 0.06)
```

**Why these values:**
- **Brand color alpha (15%-25%)**: Subtle brand accent, not overpowering
- **Light mode stronger (85%-50%)**: Needs to "pop" against white background
- **Gradient**: Creates pill-shaped 3D effect

---

### Header Transparency (`components.css`)

```css
/* Light mode */
background: rgba(255, 255, 255, 0.5) → rgba(255, 255, 255, 0.25)  /* 50%-25% gradient */

/* Dark mode */
background: rgba(0, 0, 0, 0.8)  /* 80% black */
```

**Why these values:**
- **Light mode very transparent (50%-25%)**: Allows content to show through when scrolling
- **Dark mode more opaque (80%)**: Ensures text legibility over varying backgrounds
- **User-requested feature**: "super cool when you can see things pass behind it"

---

## General Guidelines

### For Borders
- **Light mode**: 8%-15% black (gentle on white)
- **Dark mode**: 10%-20% white (visible structure)
- **Rule**: Borders always stronger than backgrounds

### For Backgrounds
- **Interactive elements** (cards, buttons): 15%-55%
- **Passive containers** (tables, code): 2%-8%
- **Headers/overlays**: 25%-80%

### For Text Containers
- **Code blocks**: 3%-5% (subtle depth)
- **Table cells**: 2%-3% (barely there)
- **Table headers**: 5%-8% (sticky distinction)

---

## Decision Tree

When choosing opacity for a new component:

1. **Is it interactive/clickable?**
   - Yes → Higher opacity (15%-55%)
   - No → Lower opacity (2%-15%)

2. **Is it a primary or secondary element?**
   - Primary (Tool Card) → 55%/15%
   - Secondary (Preview) → 2%-5%

3. **Does it need to show content behind it?**
   - Yes (Header) → 25%-50%
   - No (Card) → Higher values OK

4. **Light or dark mode?**
   - Light → Often needs HIGHER opacity (white on white needs contrast)
   - Dark → Can use lower opacity (white on black shows easier)

---

## Testing Opacity Values

Before committing to an opacity value:

1. **Test both themes**: Light and dark mode
2. **Test on real backgrounds**: Gradients, images, colored sections
3. **Test with real content**: Don't just use Lorem Ipsum
4. **Test accessibility**: Ensure sufficient contrast for text
5. **Test on mobile**: Smaller screens may need different values

---

## Common Mistakes to Avoid

❌ **Don't**: Use same opacity for all components
✅ **Do**: Match opacity to component's role in hierarchy

❌ **Don't**: Forget to test light mode separately
✅ **Do**: Remember white-on-white needs different opacity than white-on-black

❌ **Don't**: Use very high opacity (>60%) for backgrounds
✅ **Do**: Keep backgrounds subtle, use gradients for depth

❌ **Don't**: Make borders weaker than backgrounds
✅ **Do**: Borders should always be MORE visible than fills

---

## Quick Reference

| Component Type | Light Mode | Dark Mode | Rationale |
|----------------|------------|-----------|-----------|
| Primary Cards | 55%-25% | 15%-5% | Needs presence, clickable |
| Feature Badges | 85%-50% | 15%-25% | Accent, brand color |
| Table Borders | 15% | 20% | Structure visibility |
| Table Backgrounds | 2%-5% | 3%-8% | Subtle depth only |
| Code Blocks | 3% | 5% | Distinguish from text |
| Headers | 50%-25% | 80% | See-through vs legibility |
| Cell Borders | 8% | 10% | Gentle separation |

**Key Insight**: Primary UI elements use 10-20x higher opacity than content containers!
