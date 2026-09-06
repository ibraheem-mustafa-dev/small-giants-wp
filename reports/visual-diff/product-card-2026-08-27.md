# Visual diff — sgs/product-card — 2026-08-27

verdict: PASS
intent_capture_passed: true
source_sha: (not applicable — see "Why this report is retrospective" below)
certifies_commits: 9104915fb, f038c57a1

## Why this report is retrospective, and why that is disclosed rather than hidden

Both commits were made with the scoped visual-diff bypass
(`SGS_VISUAL_GATE_SKIP=product-card`), and both bypass reasons promised this
capture "immediately post-deploy". This is that capture, and it is written to
close that promise rather than leave it outstanding.

An `intent_capture` needs a LIVE canary. The canary serves the DEPLOYED plugin,
the deploy refuses a dirty tree, and the tree could not be clean until these
changes were committed. So the capture could not precede the commit. The bypass
exists for exactly this ordering, and unlike `--no-verify` it leaves gitleaks,
block-uniformity, cheat-gate, F5, F6 and Gate A all running — they did, and all
passed.

`source_sha` is therefore not set: `visual-report-sha.py` hashes the STAGED bytes
at commit time, and there are none now — the work is already in. This report
names the two commit SHAs it certifies instead. **A later edit to this block
still needs its own report**; nothing here grandfathers future changes.

## What changed

1. **`block.json` + `edit.js`** (`9104915fb`) — added `descFontFamily`,
   `priceFontFamily`, `priceNoteFontFamily` and passed `showFontFamily` on the
   three matching `<TypographyControls>` calls. `titleFontFamily` was previously
   the block's ONLY font-family attribute, so description, price and price-note
   text could never carry a typeface.
2. **`style.css`** (`f038c57a1`) — a hover/focus affordance for TYPED cards,
   reversing the "typed cards stay unstyled" scope guardrail (blub.db 304) on
   Bean's instruction: future drafts will carry their own hover effects to clone,
   so byte-identical cloning is no longer a goal.

## Assertions — stated BEFORE measuring

| # | Assertion |
|---|---|
| A1 | A resting 2px TRANSPARENT border is reserved, so only the border COLOUR changes on interaction and the hover costs no reflow. |
| A2 | The affordance fires on `:hover` **and** `:focus-within` **and** `:focus-visible` — a hover-only rule would give keyboard users nothing (WCAG 2.1 AA). |
| A3 | `prefers-reduced-motion: reduce` disables the transition on the new selector. |
| A4 | The colour resolves through theme tokens only — no client hex anywhere but the documented framework fallback. |
| A5 | All three new font-family props reach the DEPLOYED editor bundle. |

## Live result — measured against the canary over HTTP

Source: `GET …/wp-content/plugins/sgs-blocks/build/blocks/product-card/style-index.css`
→ **HTTP 200, 12,885 bytes** (the stylesheet the page actually links, confirmed by
`<link id='sgs-product-card-style-css'>` on the live clone page 2884, which renders
**23 typed product cards**).

**A1 — PASS**
```css
.product-card:not(.product-card--live){border:2px solid transparent;transition:border-color .2s ease}
```

**A2 — PASS** (all three states present in one rule)
```css
.product-card:not(.product-card--live):focus-visible,
.product-card:not(.product-card--live):focus-within,
.product-card:not(.product-card--live):hover{border-color:var( --sgs-hover-primary,var( --wp--preset--color--primary,#1f7a7a ) )}
```

**A3 — PASS** — inside `@media (prefers-reduced-motion: reduce)`:
`product-card:not(.product-card--live){transition:none}`

**A4 — PASS** — the only two `border-color` values in the file are
`var( --sgs-hover-primary, var( --wp--preset--color--primary, #1f7a7a ) )` and its
inner fallback. `#1f7a7a` is the framework default from
`core-blocks-critical.css:484`, not a client colour; Mama's own primary is
`#e68a95` and is picked up through the token.

**A5 — PASS** — measured on the DEPLOYED bundle on the server, not the local build:
```
prefix:"desc",showFontFamily:!0,…
prefix:"price",showFontFamily:!0,…
prefix:"priceNote",showFontFamily:!0,…
```

## Named limitation, not glossed

The theme applies a global `box-sizing: border-box`, so each typed card's OUTER
size is unchanged, but its content box is now **4px narrower** than before (2px of
reserved border each side). That is a real change on every typed card. It is the
deliberate cost of reserving the border so the hover itself causes no reflow, and
it is recorded here rather than described as "no layout shift".

## Two things this capture does NOT cover

- **No screenshot.** Playwright was held by a concurrent session for the whole
  window. This is a computed-CSS capture of the served stylesheet, which proves
  the rules are delivered — it does not prove they look right. Per R-31-13,
  Bean's eye is co-authoritative and has not yet been applied to the hover.
- **Font-family controls were not exercised in the editor UI** for the same
  reason. The deployed bundle carries the props, and the identical mechanism was
  verified end-to-end on `sgs/button` earlier today (a set value produced
  `.sgs-btn-ba3ea562.sgs-button{font-family:"Fraunces", serif}` in the live CSS).
  The inference is strong but it is an inference, and is labelled as one.
