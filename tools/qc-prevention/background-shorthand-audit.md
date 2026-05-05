# Background Shorthand Audit — Prevention Pattern

## Finding (H-9, 2026-05-06)

Multiple SGS framework block CSS files used `background: linear-gradient(...)` shorthand as a
default rule without `:not(.has-background)` selector guard.

**Root cause:** `background:` shorthand resets ALL background sub-properties including
`background-color`. When WordPress applies palette colours via `.has-X-background-color` class
(NOT inline style), the shorthand's reset silently overrides user colour choices.

## Required Pattern

```css
/* WRONG — shorthand resets background-color + no has-background guard */
.sgs-block:not([style*="background-color"]) {
  background: linear-gradient(135deg, #xxx, #yyy);
}

/* CORRECT — longhand only sets image, leaves background-color; both guards present */
.sgs-block:not([style*="background-color"]):not(.has-background) {
  background-image: linear-gradient(135deg, #xxx, #yyy);
}
```

## How to Detect Re-introduction

Run `scripts/css-pattern-audit.js` (from project root). The `checkBackgroundShorthand()` check
exits code 1 if any R4 (block-wrapper rule without `:not(.has-background)`) violations are found.
Add this to CI or run before every deploy.

```bash
node scripts/css-pattern-audit.js
```

## Grep Command (manual)

```bash
grep -rn "background:\s*linear-gradient\|background:\s*url(" plugins/sgs-blocks/src/blocks/*/style.css
```

For each match, verify the enclosing rule has `:not(.has-background)` in its selector OR is an
inner-element/pseudo-element rule that cannot receive the WP class.

## Affected Blocks — H-9 Audit, 2026-05-06

### Fixed (shorthand converted + guard added)

| Block | File | Line | Element | Action |
|---|---|---|---|---|
| cta-section | `cta-section/style.css` | 205 | `.sgs-cta-section__btn--gradient` button | `background:` → `background-image:` (already had `[style*="background"]` guard — no `.has-background` needed on a button child) |
| cta-section | `cta-section/style.css` | 365 | `.sgs-cta-section--gradient-primary-fade` block wrapper | `background: ... !important` → `background-image: ... !important` + `:not(.has-background)` guard |
| cta-section | `cta-section/style.css` | 377 | `.sgs-cta-section--gradient-accent-glow` block wrapper | Same fix |
| cta-section | `cta-section/style.css` | 384 | `.sgs-cta-section--gradient-dark-radial` block wrapper | Same fix |
| cta-section | `cta-section/style.css` | 393 | `.sgs-cta-section--gradient-mesh-soft` block wrapper | Same fix |
| post-grid | `post-grid/style.css` | 686 | `.sgs-post-grid__card--skeleton` | `background:` → `background-image:` (skeleton state — cannot receive `.has-background`, but shorthand→longhand still required) |

### Deferred — inner-element/pseudo-element rules (no guard needed)

These matches are on child elements or pseudo-elements that cannot receive `.has-background`.
Shorthand→longhand conversion is recommended for hygiene but not blocking.

| Block | File | Line | Element | Reason exempt |
|---|---|---|---|---|
| brand-strip | `brand-strip/style.css` | 127 | `.sgs-brand-strip--fade::before` | Pseudo-element — WP class is on the block element, not its ::before |
| brand-strip | `brand-strip/style.css` | 132 | `.sgs-brand-strip--fade::after` | Pseudo-element — same |
| brand-strip | `brand-strip/style.css` | 137 | `.sgs-brand-strip[style*="background-color"]::before` | Pseudo-element, already gated on inline style — no WP class pathway |
| brand-strip | `brand-strip/style.css` | 140 | `.sgs-brand-strip[style*="background-color"]::after` | Pseudo-element — same |
| card-grid | `card-grid/style.css` | 72 | `.sgs-card-grid__overlay` | Inner BEM element (`__overlay`) — cannot receive `.has-background` |
| card-grid | `card-grid/style.css` | 176 | `.sgs-card-grid__overlay` (slide variant) | Inner BEM element — same |
| gallery | `gallery/style.css` | 225 | `.sgs-gallery__overlay` | Inner BEM element — same |
| mega-menu | `mega-menu/style.css` | 485 | `.sgs-mega-menu__featured-caption` (or similar overlay) | Inner child — same |
| mobile-nav | `mobile-nav/style.css` | 562 | `.sgs-mobile-nav__social-link--instagram` | Brand colour gradient (Instagram) — hardcoded brand identity, not a palette colour |
| post-grid | `post-grid/style.css` | 188 | `.sgs-post-grid__card--overlay .sgs-post-grid__content` | Inner child overlay — cannot receive `.has-background` |
| team-member | `team-member/style.css` | 130 | `.sgs-team-member__overlay` | Inner absolute-positioned child — cannot receive `.has-background` |

## Classification Logic

A match requires the `:not(.has-background)` guard when ALL of:
1. The selector targets a block wrapper (not a BEM `__element` child or `::before`/`::after`)
2. The gradient/image is a default visual (not a state-specific or brand-hardcoded rule)
3. The user can set a background colour via the WP editor on this element

The `checkBackgroundShorthand()` function in `scripts/css-pattern-audit.js` uses the presence of
`__`, `::before`, `::after`, or known state-class tokens (`--skeleton`, `--shimmer`, `--overlay`,
`--fade`, `--caption`) to classify inner-element vs block-wrapper rules automatically.
