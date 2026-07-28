# Visual-diff report — sgs/nav-drawer desktop variants + sgs/nav-menu listColumns (2026-07-28)

**Scope:** nav-drawer {block.json, edit.js, index.js, render.php, style.css, variations.js (new)} +
nav-menu {block.json, edit.js, render.php} + shared nav-interactivity/store.js (header-offset
custom-property value on open). Design: `.claude/plans/2026-07-28-nav-drawer-variants-design-gate.md`
(Bean-approved). Multi-rater pre-commit council run (2 Opus + 1 Haiku raters); 9 confirmed findings
fixed and re-verified before this report.

## Evidence (all observed, none inferred)

1. **Default-instance no-regression (the 16 stored zero-attribute drawers).** Live canary page 1648
   fetched post-deploy: the drawer's scoped CSS emits the IDENTICAL property set to the pre-change
   logic — `background-color:var(--wp--preset--color--primary); color:#000` on the dialog,
   `align-items:flex-start` + `gap:20px` on the body; no geometry/surface/animation rules fire on
   defaults. Markup class tokens changed (uid hash; `--close-separate-x` replacing
   `--edge-full-screen`) — verified NO CSS or JS references either token, so the render is visually
   identical. (Honest note: this is a property-set equivalence check, not a byte-diff — the
   pre-deploy lifted CSS file was purged before capture.)
2. **D338 gate.** Regex scan of source + deployed CSS: zero `display` declarations on the dialog
   root at any tier.
3. **Editor surface (D388 pass, isolated Playwright).** Canvas loads with zero console errors; both
   drawer instances editable; `floating-capped-card` inserted → computed `opacity:1`,
   `backgroundColor: color(srgb … / 0.85)` (color-mix fill), `backdropFilter: blur(4px)`,
   `maxWidth:438px`; `getActiveBlockVariation()` returns the variation (isActive discriminator
   working).
4. **Frontend geometry at 400px viewport (isolated Playwright, forced open):**
   `anchored-card-stack` → `inset:0/0/0/0, width:400px` (tablet `full-screen` correctly cascades to
   mobile); `floating-capped-card` → `width:368px = min(438px, 100vw−32px)` (stays a capped card).
5. **Gates:** `check-dead-controls` 0 findings / `check-dead-pattern-attrs` OK / build green /
   `php -l` clean both render.php files. Conformance sweep 11/11 PASS (7 variations, descriptive
   names, retired attrs gone incl. theme patterns, no version bumps, hideExtensions intact,
   supports.sgs.variants + variantAttr declared).

## Outstanding (deliberately deferred to Task 5 — the pre-registered live gate)

Openness-guarded axe per variant per breakpoint · ESC/focus-return re-observation · listColumns
editor-canvas visibility · the 7 exact-content POC fixtures (design doc §6) · Bean's eye (R-31-13).

**Verdict: PASS for commit** — no default-instance regression observed; new surfaces verified at
the probe level; full variant-by-variant visual verification is Task 5's job and is NOT claimed here.
