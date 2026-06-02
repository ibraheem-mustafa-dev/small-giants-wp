---
block: notice-banner
date: 2026-06-01
verdict: PASS
first_paint_capture_passed: true
change_type: migration
change_description: >
  FR-22-6 InnerBlocks migration of sgs/notice-banner: render.php now echoes
  $content (renders an InnerBlocks sgs/text child) instead of a scalar `text`
  attr; save.js returns <InnerBlocks.Content/>; deprecated.js v3 migrates the
  old scalar text → a sgs/text child (carrying colour/font-size). R-22-14 clean
  (no server-side scalar fallback). Visual appearance unchanged.
verification_method: live frontend render (full-page screenshot, shared with option-picker capture)
pixel_diff_skipped: true
pixel_diff_skip_reason: >
  Logic/structure migration — the banner's visual appearance is unchanged from the
  pre-migration block. Verified by rendering a banner whose text is now an InnerBlocks
  child and confirming identical visual output + no PHP warnings (R-22-11).
verified_by: opus-main-thread-live-playwright
evidence_screenshot: reports/visual-diff/option-picker-2026-06-01-frontend.png
related_finding: parking P-FR226-NULL-SAVE-MIGRATION (latent null-save→InnerBlocks auto-migrate gap, framework-wide)
---

# sgs/notice-banner — FR-22-6 Migration Verification (2026-06-01)

## What was verified (live on canary frontend)
An `info` notice-banner with an InnerBlocks `sgs/text` child ("This is a test
notice rendered from an InnerBlocks child.") rendered correctly: blue info
panel, info Lucide icon, and the child text inside the banner — proving the
`echo $content` path works end-to-end (the converter's InnerBlocks now drive
the banner body). Captured in `option-picker-2026-06-01-frontend.png` (same page).

## Server render — PASS
REST block-renderer output is clean: correct wrapper (`.sgs-notice-banner
.sgs-notice-banner--info`, `role="note"`), Lucide info SVG, `echo $content`,
**no undefined-`$text` PHP warning** (the build-break smart-quote artefact in
edit.js was fixed; the dangling-`$text` reference was confirmed absent).

## Console
Zero console errors.

## Open finding (NOT blocking this block — framework-wide)
This migration follows the **shipped** `info-box` v4 pattern exactly. A latent
concern applies to BOTH: a null-save-era post with empty inner content can
validate against the new empty `<InnerBlocks.Content/>` *without* firing
`migrate()` (info-box v4 + notice-banner v3 have no `isEligible` on the FR-22-6
entry), which could drop scalar text on existing posts. This is captured as a
framework-wide verification item (parking P-FR226-NULL-SAVE-MIGRATION) gating
the Wave-2A migration roster; it is not specific to notice-banner and does not
regress the shipped info-box behaviour.
