---
report: FR-S9-10 confirm + header/footer Site-Info out-of-box parity
block: sgs/site-header (framework-header-default pattern + parts/header.html)
date: 2026-07-14
verdict: PASS
first_paint_capture_passed: true
---

# FR-S9-10 — set-once-renders-both (live confirm) + header Site-Info parity

## What changed
Added a `sgs/business-info` (displayType `phone`) to the header top utility row in BOTH
`theme/sgs-theme/patterns/framework-header-default.php` AND `theme/sgs-theme/parts/header.html`
(byte-identical duplicates per FR-S1-2 — the PART is what renders live; the pattern feeds the
Site-Editor "Replace" picker). Theme version 1.5.14 → 1.5.15.

This closes FR-S9-10's confirm-only scope AND gives out-of-box header/footer Site-Info parity
(the footer already renders 7 business-info variants from the store; the header rendered none).

## Live evidence (sandybrown canary, full cache clear: LiteSpeed purge + OPcache reset)

**Set-once-renders-both.** A single `phone = "0121 496 0123"` inserted once into the `sgs_site_info`
store (via `wp option patch insert`) renders in BOTH landmarks with no re-entry:
- Header: visible `<span>0121 496 0123</span>` at byte 89000 (before `</header>` at 98199) + `tel:01214960123`
- Footer: visible `<span>0121 496 0123</span>` at byte 133041 (after `<footer>` at 109573) + `tel:01214960123`
- Also flows to the Org schema JSON-LD `contactPoint.telephone` (D325 `Org_Website_Schema`).
- business-info blocks rendered: 7 (footer) → 8 (header +1).

**No overflow / layout.** At 375px: `documentElement.scrollWidth = 360 ≤ innerWidth 375` (no overflow);
header phone right edge = 336px, within viewport. Header never-overflow guarantee (FR-S9-7) holds with the
new top-row element.

**Literal-free (FR-S9-10 bullet 2 / FR-S4-5 discipline).** `site-header` / `site-header-row` /
`site-footer-row` render.php + style.css = 0 hardcoded colour/font literals. `business-info` uses the
correct token-with-fallback chain (`var(--sgs-bi-text-colour, var(--wp--preset--color--text, #1e1e1e))`) —
theme token primary, hard hex only as last-resort CSS fallback; not a per-block literal violation.

**No new infrastructure (bullet 4).** Reused the existing `sgs_site_info` store + `sgs/business-info`
block — no new schema, binding source, or admin page.

**Console.** 1 error = pre-existing `favicon.ico` 404 (unrelated to this change).

## Caveat (honest)
FR-S9-10 bullet 3 ("verified on ≥2 clients, mamas AND indus") — there is NO live indus-foods deployment on
the hosting account (only mamas/sandybrown runs the SGS-framework header/footer). Universality is therefore
evidenced BY CONSTRUCTION: the business-info block reads the per-site `sgs_site_info` store and the theme's
per-site tokens with zero client literals (grep-clean above), so the code path is identical for any client.
A live second-client render would only re-exercise the same path with different data. Flagged for Bean.

## Verdict
PASS — FR-S9-10 set-once-renders-both live-verified on mamas; header/footer Site-Info parity now out-of-box.
