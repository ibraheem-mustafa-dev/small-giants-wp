---
report: page-8 draft-vs-live DOM ledger
project: small-giants-wp
generated: 2026-07-12
draft: sites/mamas-munches/mockups/homepage/index.html
clone: sandybrown page 8 (https://sandybrown-nightingale-600381.hostingersite.com/?page_id=8)
method: independent capture+diff (curated human-check prop set + live getComputedStyle probes + screenshot pairs at 375/768/1440); DELIBERATELY a different methodology from computed-parity.js so it is an independent ground truth
verdict: NOT 100% — ~95% faithful. 5 confirmed real divergences (all clone-side styling-default departures, no content losses). Structure/content/layout/typography otherwise faithful.
caches_cleared_before_measure: LiteSpeed purge-all + OPcache reset + Hostinger CDN clear
---

# Page-8 clone-vs-draft DOM ledger (Task 1)

## Headline

The clone is **very close but not a pixel-100% clone — ~95% faithful.** Every section's
**content, copy, images, overall layout, colours and fonts transferred**. There are **5 small
but real divergences**, all of the same kind: an **SGS block applied its own default styling
instead of faithfully matching the draft**. None are content losses; all are on the clone side
(the clone *departs from* the draft, so per R-31-9 these are converter/block fixes, NOT
draft fixes — the opposite of the D313 a11y case).

Evidence basis: all 5 are confirmed by **live `getComputedStyle` on the real page** (immune to
image lazy-loading), cross-checked against draft. Screenshot pairs at 375/768/1440 corroborate.

## Out-of-contract (excluded from the fidelity verdict, per memory `clone-fidelity-excludes-header-footer`)

- **Header + footer** — theme chrome, not part of the clone contract.
- **Testimonials section** — draft renders 3 static `<article>` cards; clone renders the accepted
  **static-grid → slider** (arrows + dots). This is THE accepted exception. The 3 "MISSING" rows
  the raw diff flagged are all this slider transform — not gaps.

## One false alarm I caught + killed (method note for Task 2)

My first **full-page screenshots showed the brand-story image missing** (empty right column).
That was a **lazy-loading artifact** — `fullPage` screenshot fired before the below-fold
`loading="lazy"` image resolved. Scrolling it into view + waiting shows the "BAKED WITH LOVE"
photo rendering correctly, top-right, exactly like the draft (live probe: img 450×440, opacity 1,
right grid column — identical to draft). **The story image is faithful.** → Task 2's tool must
force-load lazy images before measuring, or it will false-flag below-fold images.

---

## The 5 confirmed divergences (grouped by cause)

### CAUSE A — `sgs/product-card` pack-size pills (zookies section)
| Dimension | Draft | Clone | Visible? |
|---|---|---|---|
| Default-selected pill | **12-pack** highlighted (pink bg+border) | **8-pack** highlighted | yes (minor) |
| Selected marker | none | adds a **✓ checkmark** | yes (minor) |
| Font size | 13px | 14px | barely |
| Font weight | 600 (all) | 700 selected / 500 others | barely |
| Tag | `<button>` | `<span>` (+ hidden radio) | no — acceptable (real control is the radio) |

**Root cause:** the option-picker defaults to the *first* option (8-pack) and adds a selected-✓;
the draft shows 12-pack pre-selected with no tick. Pill typography is the block's own, not the
draft's. **Fix location: converter/block** (product-card / option-picker defaults + pill type).

### CAUSE B — `sgs/info-box` card elevation (ingredients + gift sections)
| | Draft | Clone |
|---|---|---|
| Ingredient cards (Oats/Brewer's Yeast/Flaxseed/Fenugreek) | flat, `box-shadow: none` | `sgs-info-box--elevated` → `box-shadow: 0 4px 12px rgba(0,0,0,.1)` |
| Gift cards (New Baby Gift Box / 40-Day Care Bundle) | flat | elevated (same shadow) |

**Root cause:** the clone applied the info-box **`--elevated` variant**; the draft cards are flat.
Most visible of the five. **Fix location: converter** (should not add `--elevated` when the draft
card has no shadow — faithful-absence, STOP-D228).

### CAUSE C — product description text colour (zookies + trial-pack)
| | Draft | Clone |
|---|---|---|
| "Baked fresh every week…" / "Not sure yet? Try 3…" | `rgb(107,92,80)` (muted brown) | `rgb(58,46,38)` (charcoal `--text`) |
| Tag | `<p>` | `<div>` |

**Root cause:** the product-card description defaults to `--text` (charcoal) instead of the
draft's muted brown. **Fix location: converter/block** (transfer the draft's colour, don't default).

### CAUSE D — "Find out more" (Send-to-Ward banner) rendered as a button
| | Draft | Clone |
|---|---|---|
| Border | `0` (plain link) | `2px` |
| Border-radius | `0` | `10px` |

**Root cause:** the clone rendered a plain inline link as a **bordered pill button**. **Fix
location: converter** (link vs button treatment).

### CAUSE E — primary CTA buttons slightly smaller (zookies "Add to Cart", "Try 3 for £5")
| | Draft | Clone |
|---|---|---|
| Padding | 14px / 24px | 12px / 20px |
| Display | `flex` | `block` |
| line-height | 24px | 21px |

**Root cause:** the button block's own padding/line-height defaults are marginally tighter than the
draft. Least visible of the five. **Fix location: converter/block.**

### (candidate, low-confidence) trial-pack box background
The "NEW! START HERE / The Trial Pack" box shows `background-image: gradient` in the draft vs
`none` in the clone. Subtle; not clearly visible in the pairs. Flag for a look, not yet confirmed.

---

## What transferred faithfully (the other ~95%)

Hero (headline, subtext, 2 CTAs, hero image right), trust bar (4 items), zookies section
structure + copy + product image + price + trial-pack card, brand-story (heading, full copy,
**image**, "Read the full story" link), ingredients section (4 cards, emoji, copy, disclaimer),
gift section (2 cards, badges, prices, CTAs, banner copy), all section backgrounds/bands, all
headings + body typography, all colours except Cause C. Content presence: 0 real text/image/link
losses (the only 3 raw "missing" are the accepted testimonial-slider transform).

## Raw diff artefacts
`scratchpad/task1-ledger.json` (per-viewport rows), screenshot pairs
`scratchpad/shot-{draft,clone}-{d,m}.png`, live probes captured in-session.

## For Bean — decision needed
All 5 are **clone-side departures from the draft** → converter/block fixes (R-31-9), not draft
edits. Options: (1) log them for a follow-up fidelity-fix session (recommended — Task 2 is the
priority ask), or (2) fix now before Task 2. None block Task 2.

---

## Root-cause investigation (Bean-directed, /systematic-debugging) — A/B accepted, E by design, C + D root-caused

**Bean's dispositions:** A (pill selected-state) + B (card `--elevated` shadow) = **accepted**,
not gaps. E (CTA padding) = **by design**. C + D = **root-cause the pipeline gap** so future
clones aren't affected. D also carried a test: does the `<a>`→button routing fire on INLINE text
hyperlinks?

### D — `<a>` → `sgs/button` routing — ROOT CAUSE PROVEN, routing is SAFE
- **Mechanism:** `html_tag_to_core_block` maps `a → sgs/button` (atomic-tag recognition, when an
  `<a>` has no `sgs-` root class). `recognition.py` §2 atomic path → `db_lookup.atomic_tag_map()`.
- **Bean's worry case — TESTED via `convert_section` (real converter, `_repro_inline_anchor.py`):**
  - INLINE `<a>` inside a `<p>` → **`sgs/text` with the link preserved as inline HTML**:
    `{"text":"Read our <a href=\"/guide\">complete guide</a> today."}` — **NOT a button.**
  - STANDALONE bare `<a>` → `sgs/button`.
  - **Verdict: inline hyperlinks in body text do NOT become buttons.** Per Bean's rule
    ("if no, keep it that way") → **KEEP the routing. No change needed.**
- **Residual (minor, separate):** the draft distinguishes buttons (`<a class="sgs-button ...">`)
  from plain links (bare `<a>`). The standalone "Find out more" plain link becomes a *styled*
  button (border 2px / radius 10px from the button block's default). Cosmetic; not the
  inline-safety issue. Optional future enhancement: keep a bare standalone `<a>` as a plain text
  link unless it carries `.sgs-button`.

### C — description colour dropped — ROOT CAUSE PROVEN, SYSTEMIC DB-seeding gap
- **Draft:** `.sgs-product-card__description { font-size:14px; color:var(--text-muted) }`
  (`--text-muted = #6B5C50`). **Clone:** rendered `--text` (`#3A2E26`, block default).
- **Proven via the real converter (`_repro_desc_colour.py`):** the product-card emit contained
  `titleFontSize/titleFontWeight/titleLineHeight` and `priceFontSize/priceFontWeight` — but **no
  `descColour` and no `descFontSize`**, despite the block *having* those attrs.
- **Root cause (DB-level):** in `block_attributes`, `title*`/`price*` styling attrs carry a
  `role` (`typography` / `color`) but **`descColour`, `descFontSize`, `descLineHeight` (and
  `priceNoteColour`, `priceFromLabel*`, `priceNote*`) have `role = NULL`.** The converter's
  role-driven CSS router (D301 "route by role, not a hardcoded property list") only routes attrs
  with a recognised role → **null-role attrs are invisible to routing** → the draft's colour +
  font-size never populate them → the block default renders.
- **This is SYSTEMIC, not per-block:** any attr added without a `role` is silently un-routable —
  the client can set it in the editor, but the pipeline can never transfer it from a draft.
- **Fix (scoped, universal, design-gated):** seed the missing `role` values (`typography` for
  `*FontSize/*LineHeight/*FontWeight`, `color` for `*Colour`) for all null-role styling attrs,
  via `/sgs-update` or a dated migration. **Caution (`enabling-a-capability-wakes-latent-misseeds`):**
  waking routing on dormant attrs can surface latent mis-seeds — pre-audit each before seeding.
  Recommend a scoped follow-up session, not an inline mass-seed.

### Repro artefacts (temporary, deleted after)
`_repro_inline_anchor.py` (D inline-vs-standalone), `_repro_desc_colour.py` (C descColour drop),
`_repro_button_box.py` (E standalone-vs-CTA), `_task1-*.js` (ledger + probes).

---

## DISPOSITIONS + OUTCOMES (D314 session close)

- **A (pack-pill selected-state + ✓) — ACCEPTED** (Bean). Not a gap.
- **B (info-box `--elevated` card shadow) — ACCEPTED** (Bean). Not a gap.
- **D (`<a>`→button routing) — SAFE, KEEP.** Proven on the real converter: an INLINE `<a>` inside a
  `<p>` stays inline HTML inside `sgs/text` (NOT a button); only a STANDALONE bare `<a>` becomes
  `sgs/button`. Per Bean's rule ("if inline links don't become buttons, keep it"), no change.
- **C (description colour/font drop) — FIXED + LANDED LIVE (D314).** Root cause: product-card
  `descColour`/`descFontSize`/`descLineHeight` had `role=NULL` + `derived_selector=NULL` (missed in
  the D285 title-family pass) → the D301 role-driven router couldn't route them. Fix: seeded
  `role` + `derived_selector='.sgs-product-card__description'` via `ATTR_CLASSIFICATION_OVERRIDES`
  in `sgs-update-v2.py` (R-31-1 channel), `/sgs-update --stage 1`, re-cloned page 8. **Verified
  live:** both descriptions now render `rgb(107,92,80)` (#6B5C50), `14px`, `1.55` line-height —
  exactly the draft.
- **E (product-card CTA padding drop) — DEFERRED to next session (D284-entangled).** Live-proven E
  is EXCLUSIVELY the product-card CTA (standalone buttons transfer padding faithfully: 14/24, 48).
  E is NOT a role-seed like C: `ctaPaddingX`/`ctaPaddingY` have **no `property_suffixes` row** and
  padding isn't a scalar-styling-lift role, AND the cta* styling is owned by the D284
  `sgs_button_element_style_css` on `.sgs-product-card__cta--primary` (per the sgs-update override
  comment). Fixing E needs new routing infrastructure (new suffixes + a box-CSS→scalar path) or a
  product-card `__cta` CSS-default alignment to the framework button standard — a design-gate build,
  bundled with the parity-tool rebuild next session.

## Scoring correction (Bean-challenged, D314)
The v1.0.0 computed-parity number (76%) badly UNDER-counts visible fidelity. Honest breakdown on
page 8: 76% raw → 84% (remove font-family-stack + `interactivity`/`appearance` false buckets) → 89%
(count accepted A/B as OK) → **~94–95% visible fidelity** (remove sub-visible representational twins:
line-height reps, margin absorbed by flex-gap, `display:flex↔block`, `align-items:normal↔stretch`,
flex-grow). Bean's "high 90s" instinct was correct. This is captured as **Spec 20 FR-20-3a** for the
next-session parity-tool rebuild (the tool must track VISIBLE fidelity, not representation drift).
