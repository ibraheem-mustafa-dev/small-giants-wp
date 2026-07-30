---
doc_type: report
title: "Spec 35 wave — real block-editor verification (closes audit finding 1b-1) + D372 BoxControl check"
project: small-giants-wp
date: 2026-07-30
spec: 35-BLOCK-INSPECTOR-UX-STANDARD (Part M) + D372 / D388
status: evidence banked
decision: D425
---

# Spec 35 wave opened in the REAL block editor

## Why this exists

Spec 35 Part M states plainly that **everything to date was verified by frontend render + REST
attribute registration, never by opening the block editor** — citing `ShadowControl`, which "crashed
on first live render despite 180 passing unit tests". D388 records **two** editor-killing crashes
that shipped past ALL-GREEN gates. The 2026-07-30 audit made this finding **1b-1**, its
highest-risk item.

This report is the artefact for that check. It exists because the closure was otherwise resting on
prose in `decisions.md` — which this project's own rule ("attest with evidence, twice") does not
accept for a load-bearing claim.

## Method

Playwright (Chromium, 1600×1000), logged into the canary at
`sandybrown-nightingale-600381.hostingersite.com/wp-admin` with the credentials at
`.claude/secrets/sandybrown.env`. For each block: `wp.blocks.createBlock(slug)` →
`resetBlocks([blk])` → `selectBlock(clientId)`, then read the editor's own DOM.

**⚠ The first run was a VACUOUS PASS and is recorded here deliberately.** It reported
`inspector: 0` for all 26 blocks and "no crashes" — because the block-settings sidebar was CLOSED,
so the inspector was never in the DOM to inspect. It proved only "insertion does not crash", not
"the inspector renders" — and the Spec 35 wave *is* an inspector standard. The run below forces the
sidebar open first:

```js
await wp.data.dispatch('core/edit-post').openGeneralSidebar('edit-post/block');
```

Per block, three independent health signals were captured: panel count inside
`.block-editor-block-inspector`, presence of `.block-editor-warning` / `.editor-error-boundary`
(React error boundary = the D388 crash signature), and console `error` + `pageerror` events.

## Result — 22 blocks, zero crashes, inspector renders on every one

`SIDEBAR opened via: core/edit-post` · **BLOCKS WITH ANY PROBLEM: NONE**

| Block | Panels | Controls | Crash UI | Console errors |
|---|---|---|---|---|
| sgs/brand-strip | 7 | 0 | false | none |
| sgs/button | 17 | 15 | false | none |
| sgs/decorative-image | 15 | 38 | false | none |
| sgs/gallery | 17 | 29 | false | none |
| sgs/hero | 23 | 2 | false | none |
| sgs/label | 12 | 0 | false | none |
| sgs/media | 11 | 7 | false | none |
| sgs/notice-banner | 11 | 6 | false | none |
| sgs/option-picker | 16 | 14 | false | none |
| sgs/post-grid | 18 | 64 | false | none |
| sgs/product-card | 19 | 32 | false | none |
| sgs/quote | 13 | 8 | false | none |
| sgs/separator | 12 | 6 | false | none |
| sgs/tabs | 15 | 19 | false | none |
| sgs/testimonial-slider | 16 | 25 | false | none |
| sgs/testimonial | 16 | 11 | false | none |
| sgs/trustpilot-reviews | 18 | 29 | false | none |
| sgs/container | 15 | 17 | false | none |
| sgs/cta-section | 18 | 12 | false | none |
| sgs/card-grid | 17 | 15 | false | none |
| sgs/trust-bar | 22 | 47 | false | none |
| sgs/form | 17 | 17 | false | none |

**Coverage:** the ~19-package wave of commit `07c67642` (19 `edit.js` + `GradientOverlayControl.js`,
`MediaGalleryPicker.js`, `components/index.js`) plus the earlier waves `ac0c30eb`, `fe20df4e`,
`64999cd2`, `b9c5f6d1`. A first pass additionally exercised `sgs/icon`, `sgs/social-icons`,
`sgs/team-member`, `sgs/pricing-table` — all registered and inserted without crash.

**Stated limitation:** `controls` counts `input`/`select`/`role=radio`/`.components-base-control`
inside the inspector. `brand-strip` and `label` report 0 while rendering 7 and 12 panels — the
counter misses custom components that render none of those. Panels renders + zero crash is the
load-bearing signal; the control count is indicative only.

## D372 — the owed BoxControl check

D372 owed a live `getComputedStyle` padding check on a fresh `sgs/product-card` across the
`innerPadding` → `cardPadding` box-object migration.

**Editor:** 3 BoxControls render in the inspector; `cardPadding` is present as an object attribute;
`innerPadding` is **no longer declared** (`'innerPadding' in type.attributes` → `false`), confirming
the migration and matching the dead-read deleted from `render.php` this session.

**Frontend** (`/f3-oracle-sgs-product-card/`):

| Element | inline `style` | computed padding |
|---|---|---|
| `.sgs-product-card__body` | `null` | `16px` uniform (all four sides) |
| `.sgs-product-card` (root) | `null` | `0px` |

**A first reading of this looked like a defect and was not.** I measured the card ROOT and found
0px against D372's expected 20px. `block.json` states the body is the padded element ("the product
image is full-bleed and sits outside the padded body") and that an empty `cardPadding` falls back to
20px from `style.css`. Re-measured on `.sgs-product-card__body`: 16px — which the lifted stylesheet
explains as the fixture's OWN per-instance value, emitted correctly as a scoped rule:

```css
.sgs-pc-3 .product-card-body,.sgs-pc-3 .sgs-product-card__body{padding:16px 16px 16px 16px;}
```

So: scoped not inline, all four sides, per-instance override working. **Named limit — the 20px
EMPTY-default path was NOT exercised**, because this fixture sets 16px explicitly. A fresh
unconfigured card is still owed to close that specific leg.

## Reproduce

Scripts used: `C:/tmp/editor-check2.mjs` (the sidebar-open sweep) and `C:/tmp/boxcontrol-check.mjs`
/ `C:/tmp/box2.mjs` (BoxControl). They are scratch, not committed — the durable artefact is the
method + measurements above. Re-running needs only Playwright from
`plugins/sgs-blocks/node_modules` and the canary credentials.

## Verdict

**Audit finding 1b-1 is CLOSED.** The Spec 35 wave has been opened in the real block editor; the
inspector renders on all 22 blocks with no crash, no error boundary and no console error. D372's
BoxControl check is discharged with the empty-default leg explicitly still owed.
