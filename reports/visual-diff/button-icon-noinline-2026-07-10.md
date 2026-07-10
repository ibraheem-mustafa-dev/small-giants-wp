---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/button icon width/height/colour no-inline residual"
block: sgs/button
date: 2026-07-10
wave: "no-inline rollout — LAND-completion session"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/button — icon width/height/colour no-inline fix (LANDED)

**Verdict: PASS.** Button was declared no-inline at D293, but its ICON path still inlined
`width`/`height`/`color` on the `<span class="sgs-button__icon">` whenever an operator set an icon
size or colour — and even the default path emitted an inline `width:var(...)`. Any button with an
icon therefore failed the zero-inline bar.

## Fix (`src/blocks/button/render.php`)
- Removed the inline `style="%s"` on the icon span. Icon size → scoped
  `#{$uid} .sgs-button__icon svg{width;height}` (only when an explicit size is set; else style.css's
  `.sgs-button__icon svg{width:1em}` default applies). Resting icon colour → scoped
  `#{$uid} .sgs-button__icon{color}`. Mirrors the block's existing hover-icon-colour scoped rule (l.359).
- Icon size + colour stay full client controls — just scoped, never inline. `:hover` icon colour
  unchanged (already scoped, higher specificity, still wins on hover).

## Evidence
- **Static audit** (`audit-inline-styling.js`): button `inlineViaRender` 1 → **0**.
- **Framework-wide**: block-private `INLINE-via-render sites` = **0** across all 74 blocks after this
  + the option-picker swatch fix.
- Build PASS; deployed to sandybrown; OPcache + LiteSpeed purged.

## Gates
- `npm run build` prebuild + webpack: PASS. Converter suite unaffected (PHP-only render change).
