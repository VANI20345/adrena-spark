

# Design & Branding Refresh Plan

## Current Issues Identified

1. **Font not loading**: The `@font-face` declaration uses `format('otf')` which is incorrect -- it should be `format('opentype')`. This means "The Year of Handicrafts" font never loads and the browser falls back to Noto Kufi Arabic or Space Grotesk.

2. **Hero font sizes are massive**: Currently `text-4xl sm:text-5xl md:text-6xl lg:text-7xl` (up to 4.5rem/72px). The Figma reference shows a much more moderate size -- roughly `text-2xl md:text-3xl lg:text-4xl`.

3. **Hero layout doesn't match the reference**: The Figma shows a clean 2-column layout with the photo collage on the left and text on the right, with colorful floating pill badges. The current code has the right structure but images aren't showing (collage is hidden behind the oversized text). Also missing: the brand-name word "هواية" should appear prominently in green/lime color.

4. **Dark mode is the default view** but the Figma reference shows a bright white background. The design should feel lively and colorful in both modes.

5. **Color vibrancy**: The Figma design uses bold, saturated brand colors (lime green pills, purple pills, orange starburst decorations) against a clean white background. Current dark mode mutes everything.

## Changes to Implement

### 1. Fix Font Loading (`src/index.css`)
- Change `format('otf')` to `format('opentype')` for both font-face declarations
- Add separate `@font-face` block for the SemiBold weight (weight: 600)
- This single fix ensures all Arabic content uses the correct branded font

### 2. Resize Hero Typography (`src/components/Home/HeroSection.tsx`)
- Reduce headline from `text-4xl...lg:text-7xl` to `text-2xl sm:text-3xl md:text-4xl lg:text-5xl`
- Reduce subtitle text from `text-lg md:text-xl` to `text-base md:text-lg`
- Reduce CTA button sizes from `h-14 text-lg px-8` to `h-12 text-base px-6`
- Adjust overall padding from `py-16 md:py-24 lg:py-28` to `py-10 md:py-16 lg:py-20`

### 3. Enhance Hero Visual Design (matching Figma)
- Make the collage images more prominent with rounded corners and slight overlapping layout
- Add a decorative orange starburst SVG at full opacity (currently 0.15, Figma shows it bolder)
- Ensure floating pills are more visible with slightly larger padding and font weight
- Add the brand logo overlay on one of the collage images (like the Figma shows "هواية" logo on a yellow card)

### 4. Improve Color Vibrancy Across Components
- **Navbar**: Keep current clean design, no major changes needed
- **Section Headers**: Add colored accent bars or decorative elements (like the orange `|` bar shown in Figma next to section titles)
- **Cards**: Add subtle brand-color hover borders (e.g., lime or orange glow on hover)
- **Buttons**: The `brand` variant already uses lime -- ensure outline buttons have a more colorful border

### 5. Global Design Polish (`src/index.css`)
- Add utility classes for brand accent decorations (starburst, colored bars)
- Ensure section backgrounds alternate between white and very subtle tinted backgrounds for visual rhythm

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Fix `@font-face` format, add SemiBold weight, add accent utility classes |
| `src/components/Home/HeroSection.tsx` | Reduce font sizes, improve collage layout, enhance decorative elements |
| `src/components/ui/card.tsx` | Add subtle brand-color hover effect |
| `src/components/Home/CategorySection.tsx` | Add colored accent bar to section header |
| `src/pages/Index.tsx` | Minor spacing/color adjustments to signup CTA section |

