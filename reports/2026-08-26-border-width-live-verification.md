---
doc_type: report
date: 2026-08-26
subject: Live verification of the border-style-without-width change (commit 559cc6d97)
status: VERIFIED — assertions stated before measurement, both hold
---

# Live verification — "a border style with no width paints no border"

⚠ **This is NOT a visual-diff gate artefact and must not be mistaken for one.** It carries
no `source_sha`, so no gate reads it. See *Why there is no gate report* at the bottom —
that limitation is the main finding of this pass.

## What was verified

Commit `559cc6d97` stopped `border-style` being emitted when no `border-width` is set
(Bean's ruling, 2026-08-26: *"border with no width should mean no border by default"*).
Before it, a style with no width fell through to CSS's initial `border-width: medium`
(~3px) and painted a border nobody asked for — the defect that bit the hero's split image.

Deployed to sandybrown blocks-only, EXIT 0 in 302s, motion QA 3/3 green.

## Assertions — written BEFORE any measurement

**A1.** After the change no SGS block can emit `border-style` without a width, so no
element on the live canary should render a non-`none` border-style with `0px` width on all
four sides.

**A2.** Elements with a real width still paint their intended style — the change stripped
no live border, and in particular did not silently convert a `dashed` border to `solid`.

## Measured result

`getComputedStyle` over every element (admin bar excluded) on two live pages.

| Page | Elements scanned | SGS blocks present | Style-without-width |
|---|---|---|---|
| `/` | 645 | 26 | **0** |
| `/shop/` | 594 | 15 | **0** |

**A1 — PASS.** Zero SGS-owned elements render a border-style with no width.

> One element was flagged and is **not** a violation. `wc-block-product-filters__apply` on
> `/shop/` renders `outset` with no width — a WooCommerce **core** button carrying the
> browser's default button styling. The probe attributes it to `sgs/container` only because
> it walks up to the nearest SGS ancestor. No SGS code emits it. Recording it because a
> reader re-running the probe will see the same row and should not read it as a defect.

**A2 — PASS.** Real borders survive with their styles intact:

| Block | Element | Width | Style | Colour |
|---|---|---|---|---|
| `sgs/product-card` | `.trial-card` | 2px | **dashed** | `rgba(0,0,0,0)` |
| `sgs/product-card` | `.featured-card` | 1px | solid | `rgb(232,213,192)` |
| `sgs/button` | `.sgs-button--primary` | 2px | solid | `rgb(230,138,149)` |
| `sgs/button` | `.sgs-button--outline` | 2px | solid | `rgb(232,213,192)` |
| `sgs/trust-bar` | `.sgs-trust-bar__circle` ×4 | 1px | solid | `rgba(0,0,0,0.08)` |
| `sgs/option-picker` | `.sgs-option-picker__pill` ×4 | 2px | solid | two colours |
| `sgs/info-box` | root ×5 | 1px | solid | `rgb(232,213,192)` |

⭐ **The trial card is the load-bearing row.** It renders **2px dashed**. That is exactly the
regression Bean identified when he corrected the rule — a block with its own default width
losing the operator's style and falling back to solid. It did not happen here.

## Blocks with live coverage

28 distinct SGS blocks were observed rendering across the two pages: business-info,
breadcrumbs, button, cart, container, feature-grid, heading, hero, icon, info-box, label,
media, multi-button, nav-drawer, nav-menu, option-picker, product-card, product-search,
quote, responsive-logo, site-footer, site-footer-row, site-header, site-header-row,
testimonial, testimonial-slider, text, trust-bar.

**14 of the 37 blocks in commit `559cc6d97` have live evidence here.** The other 23 have no
instance on the canary and are therefore unverified by this pass — named rather than
implied: accordion, accordion-item, before-after, brand-strip, card-grid, countdown-timer,
counter, cta-section, form, form-field-tiles, form-step, gallery, google-reviews, icon-list,
post-grid, pricing-table, process-steps, product-faq, tab, tabs, team-member, timeline,
trustpilot-reviews.

## Why there is no gate report — the finding

**The seven visual-diff bypasses cannot be retired retroactively.** `visual-report-sha.py`
derives `source_sha` from the **staged bytes** of a block's `src/` directory, and the gate
recomputes it at commit time and refuses a mismatch. Its docstring states the reason: a
date-keyed gate once waved six blocks through on reports another track had generated hours
earlier for its own edits to the same blocks.

So a report only certifies the version of a block staged in the commit it accompanies.
Running the tool for an already-committed change returns `no staged files for block '<x>'`
— correctly. There is no post-hoc mode, by design.

**What this means for the bypass debt:**

- The entries in `reports/visual-diff/manual-skips.log` are a permanent audit record. That
  is what they are for; they are not a queue that can be drained.
- The real forward obligation is that the **next** commit touching each of those blocks
  carries a genuine report.
- Producing a passing report now would require re-staging the block files to manufacture a
  matching hash. That is gaming the gate, and it is the precise failure the `source_sha`
  mechanism was built to stop.

This document is the honest substitute: the verification was done, the evidence is real, and
it is filed where it cannot be mistaken for a gate artefact.

## Reproduce

Probe: walk every element, compare the four `border-*-width` computed values against the
four `border-*-style` values, attribute each element to its nearest `wp-block-sgs-*`
ancestor. A violation is *any style ≠ none* with *all widths = 0*.
Detector for the source-side equivalent: `plugins/sgs-blocks/scripts/check-border-style-without-width.py --survey`.
