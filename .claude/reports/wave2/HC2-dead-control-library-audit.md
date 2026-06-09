---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "HC2 — library-wide DEAD CONTROL audit (declared+controlled but never rendered)"
created: 2026-06-08
status: COMPLETE. All 71 blocks audited via 6+4 parallel Sonnet agents. Spawned from Hero H-C (inert textAlign attrs). Evidence = block.json + edit.js + render.php/save.js, exact file:line.
---

# HC2 — Dead-control library audit

**Question (Bean, Wave-2 Hero):** the hero `textAlign*` controls are declared + shown in the editor but do nothing at render. Does this affect other settings across the block library?

**Answer: yes — 34 dead controls across 8 blocks**, plus ~20 orphan attrs (declared, no control, no render — schema cruft) and 2 vestigial destructures. Dominant cause: **post-migration debt** — when a block moved its rendering to child InnerBlocks (FR-22-6) or to WP native supports, the old parent-level controls were left in the editor pointing at nothing.

## Definitions
- **DEAD CONTROL** *(actionable — misleads the client)*: attr is declared in `block.json`, has a live editor control in `edit.js`, but is **never consumed** in `render.php`/`save.js`/the shared wrapper. The client changes it and nothing happens.
- **ORPHAN** *(cleanup — not user-visible)*: declared, **no** control, never consumed. Schema cruft; lower priority.
- **BY-DESIGN**: consumed editor-side only (e.g. `container.templateMode` drives `allowedBlocks`) — legitimate, not dead.

---

## DEAD CONTROLS (34) — priority register

| Block | Dead controls | Count | Likely cause |
|---|---|---|---|
| **info-box** | `link`, `linkOpensNewTab`, `iconColour`, `iconBackgroundColour`, `iconSize`, `headingColour`, `headingFontSize`, `subtitleColour`, `subtitleFontSize`, `descriptionColour` | 10 | FR-22-6 migration to child blocks; render.php never updated |
| **hero** | `textAlignDesktop/Mobile/Tablet` (3) + `ctaGap`, `ctaGapTablet`, `ctaGapMobile`, `ctaGapUnit` (4) | 7 | textAlign never wired; ctaGap hardcoded to `--wp--preset--spacing--30` in style.css |
| **testimonial** | `quoteColour`, `nameColour`, `roleColour`, `ratingColour`, `reviewSource`, `reviewDate` | 6 | pre-FR-22-6 remnants; child blocks own this now |
| **testimonial-slider** | `quoteColour`, `nameColour`, `roleColour`, `ratingColour` | 4 | read into PHP vars then never used; child blocks own colour |
| **post-grid** | `hoverBackgroundColour`, `hoverTextColour`, `hoverBorderColour` | 3 | hover-effects panel controls with no render/CSS path |
| **announcement-bar** | `backgroundColour`, `textColour` | 2 | superseded by native `color` supports; custom controls left behind |
| **product-card** | `innerPadding` | 1 | control shown via shared ContainerWrapperControls (kind=content) but attr not in product-card schema/render |
| **google-reviews** | `showBreakdown` | 1 | read into `$show_breakdown` then never output |

**Cross-block pattern:** colour/typography/spacing controls orphaned by the InnerBlocks migration (info-box, testimonial, testimonial-slider) are the same shape as hero's `textAlign*`. This is one systemic fix, not 8 separate ones — see HC2 solution.

## ORPHANS (no control, lower priority — cleanup)
- **info-box**: `showMedia`, `showTitle`, `showSubtitle`, `showText`, `showButton`, `elementOrder`, `hoverImageZoom`, `textAlignMobile/Tablet/Desktop` (10)
- **form**: `paymentEnabled`, `paymentAmount`, `paymentDescription`, `templateMode` (4 — payment feature never built)
- **pricing-table**: `staggerDelay`, `templateMode` (2)
- **tabs**: `templateMode` (1)
- **process-steps**: `staggerDelay` (1)
- **google-reviews**: `cardVariant` (1 — incomplete feature)

## VESTIGIAL (destructured but uncontrolled)
- **form-field-checkbox / form-field-radio**: `placeholder` — destructured in edit.js, no control bound, not rendered (fieldset pattern has no input). Drop from schema.
- **trust-bar**: `showPendingInEditor` — vestigial destructure, was controlled in a previous version.

## BY-DESIGN (NOT dead — leave alone)
- **container**: `templateMode` — editor-only, drives `allowedBlocks`. Legitimate.

## CLEAN (no dead controls)
container, cta-section, card-grid, content-collection, feature-grid, gallery, tab, heading, text, button, multi-button, icon, icon-list, label, quote, star-rating, divider, accordion, accordion-item, modal, mega-menu, mobile-nav, mobile-nav-toggle, timeline, table-of-contents, breadcrumbs, counter, form, form-step, form-review, all text-type form fields, form-field-address/consent/file/hidden/tiles, notice-banner, countdown-timer, whatsapp-cta, social-icons, business-info, brand-strip, media, decorative-image, responsive-logo, team-member, cart, option-picker, trustpilot-reviews.

> One schema bug noted in passing (not a dead control): **feature-grid** declares `columnsDesktop` twice in block.json (the `default:0` entry wins → editor starts at 0 not 4). Worth fixing.

---

## Proposed HC2 solution (systemic, not per-block)

1. **Decide per dead control: WIRE or REMOVE.** For each of the 34, either (a) wire the attr into render.php so the control works (e.g. info-box colours → emit CSS vars on the right element; hero ctaGap → emit gap on the button row), or (b) remove the control + attr if the capability genuinely moved to a child block (e.g. testimonial colours now owned by child `sgs/quote`/`sgs/star-rating`). Default: **wire** if the parent is the natural place to set it; **remove** if a child block already exposes it (avoid duplicate controls).
2. **Add a structural guard so this can't regress (Rule 10).** A build-time check that walks every block: for each attr with an editor control in edit.js, assert it appears in render.php/save.js or a known shared wrapper. Fail the build (or warn) on a new dead control. This is the same shape as the existing `generate-extension-attributes.js --check` pre-commit gate. Without it, the next migration re-introduces the problem.
3. **Sequence:** this is its own workstream (client-experience integrity), parallel to the cloning-fidelity waves. Highest-value targets first: info-box (10) + testimonial pair (10) + hero (7) = 27 of 34 in three blocks.
