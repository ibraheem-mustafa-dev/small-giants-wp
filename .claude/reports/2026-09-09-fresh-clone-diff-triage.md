# Fresh clone-diff triage — root cause + fix design (no implementation)

**Date:** 2026-09-09 · **Scope:** the REAL remaining diffs from the fixed computed-parity.js,
measured against a FRESH re-run of the clone pipeline (`pipeline-state/mamas-munches-3448-2026-09-09-035047/`,
deployed to page 3448). Tag divergences are explicitly EXCLUDED from this triage — Bean-directed
2026-09-09: a native SGS block choosing its own semantic tag (blockquote/cite/footer for a
testimonial, a `<label>` instead of a `<button>` for a picker option) is not a defect under
CLAUDE.md Rule 1 ("CONVERT, don't mirror"). Nothing in this document has been implemented —
every finding is diagnosis + a proposed fix-shape only, per Bean's explicit instruction to
uncover and design before touching any code.

**Fresh dimensions (post-fix, this run):** CONTENT 100% · STRUCTURE 94% (126/134; see finding
below — the true rate is higher) · LAYOUT 79% (209/266) · PAINT+TYPE 82% (461/565).

---

## Finding 0 — the "8 unmatched" STRUCTURE gap is a measurement-tool limitation, not a clone defect

Verified live (Playwright, page 3448) for all 8 entries in `unmatched_elements`: "our signature
zookies — our signature giant cookie...", "a story that started with a friend...", "give the
gift of nourishment...", "what mums are saying...", and three "mama's munches zookies baked
fresh every week..." entries at different nesting depths. **Every single one genuinely exists in
the clone with correct, matching content** — none is missing.

Root cause: `computed-parity.js`'s structural anchor caps the ancestor-text window at 300 chars
(raised from 80 in `2baf3171e`). These sections' live `innerText` runs 430–1600 chars, and the
clone composes MORE or DIFFERENTLY-ordered surrounding text at the same DOM depth than the draft
does, so the 300-char window never lines up between draft and clone even though the underlying
content is the same. This is the SAME class of defect Step 8 fixed for sr-only text — different
trigger (ordinary long body copy, not visually-hidden text), same mechanism (a fixed-length text
window defeated by injected/differently-composed surrounding content).

**Practical implication: STRUCTURE's true real-defect rate is 0/134, not 8/134 (94%).** The
remaining 6% is entirely a ruler limitation.

**Proposed fix-shape (not built):** either (a) raise the cap further and/or make it adaptive
(scale with the ancestor's actual content length rather than a fixed 300), or (b) don't rely on
a truncated-text substring match at all for long ancestors — use a token-set/LCS similarity
measure (the alternative Step 8's own plan text named but didn't build), which tolerates extra
or reordered content without needing an ever-larger fixed window.

---

## Finding 1 — Trust-bar badge circles (4 badges, one shared mechanism)

All 4 badges ("handmade in birmingham", "registered food business", "free uk delivery over
£35", "loved by breastfeeding mums") show byte-identical diffs — one shared root cause, one fix
closes all 24 diffs.

| Property | Draft | Clone | Classification |
|---|---|---|---|
| `background-color` | white | cream (surface-alt token) | **Bug** — `iconCircleBackground` attribute exists (`block_attributes`, element `icon-badge`) but the converter never populates it from the draft's `.sgs-trust-bar__icon{background:white}` rule; `render.php:43` defaults to `'surface'` |
| `border-*-style`/`-width` (5 props) | none/0px | solid/1px | **Spec gap** — no `border-*` DB row exists for the badge element at all; `style.css:79` hardcodes `border: var(--sgs-trust-badge-circle-border, 1px solid rgba(0,0,0,0.08))` with no override path (the fallback is a deliberate legibility default per its own comment, but currently unconditional) |

**Proposed fix (not built):** (a) converter: read the icon's authored background, write to
`iconCircleBackground`. (b) add a real border control (width/style/colour) for the badge
element, mirroring the existing block-private Shape-B border pattern (`SgsBorderControl`).

---

## Finding 2 — Testimonial cards (3 cards, 3 distinct sub-mechanisms, all bugs not spec gaps)

| Sub-issue | Draft | Clone | Root cause |
|---|---|---|---|
| Card background/border | white bg, 1px border, 12px radius | transparent, no border | `backgroundColour`/`borderWidth/Style/Colour/Radius` all exist on the card's `quote-box` (wrapper) element and render.php reads them correctly (confirmed lines 1063/1070/1090/1110) — the CONVERTER never populates them from the draft's root `.sgs-testimonial{background:white;border:1px solid var(--border);border-radius:12px}` rule |
| Quote text italic + spacing | `font-style:italic`, `margin-bottom:12px` | `normal`, `16px` | `quoteFontStyle`/`quoteMarginBottom` exist and are wired, same class of bug — not populated from the draft's `.sgs-testimonial__text` rule |
| Star rating colour/size (found the exact mechanism) | gold `var(--accent)`, 15px, 8px margin | brownish text colour, 14px, 16px margin | The draft's BEM class is `sgs-testimonial__stars`; block.json registers this element as `rating` (with `ratingColour`/`ratingSize` attrs, fully wired). The DB's `slots` table already lists `"stars"` as a declared alias of `"rating"` (`slots.aliases` row, slot_name=`rating`). Confirmed live in the pipeline's own fold-gap log: `cross_node_gap_candidate ... reason='no_area_attr' source_class='sgs-testimonial__stars'` — the converter's per-area attribute resolver (`route_area_css_to_block_attrs` / `db_lookup.attr_for_area_property`) isn't consulting the alias table before giving up. |

**Proposed fix (not built):** (a)+(b) need tracing into whichever walker stage extracts the
BLOCK ROOT's own base declarations (not the per-area `route_area_css_to_block_attrs` path,
since these are on the wrapper/root selector, not a nested BEM element) — not yet located
precisely, flagged as the next investigation step if this fix is greenlit. (c) make the
per-area attribute resolver consult `slots.aliases` before reporting `no_area_attr` — this one
IS precisely located and is a small, well-scoped fix.

---

## Finding 3 — Pack-size pills (4 pills) + "new start here" trial badge

| Property | Draft | Clone | Classification |
|---|---|---|---|
| `font-size` | 13px | 14px | **Bug** — `pillFontSize` exists, not populated |
| `font-weight` | 600 | 500 | **Bug** — `pillFontWeight` exists, not populated |
| `line-height` | 13px | 14px | **Bug** — `pillLineHeight` exists, not populated |
| `text-align` | center | start | **Spec gap** — attribute is declared (`pillTextAlign`) but has NO routed `css_property` at all in the DB; it's a dead declaration |
| `padding-bottom` | 7px | 8px | Likely bug — `pillPadding` (box object) exists; probably a rounding/default-fallthrough on the box object rather than the draft's authored value |
| `appearance`, `justify-content` | auto/normal | none/center | **Not a defect** — the block's own internal button-reset + content-centring, not draft-authored intent, no client control exists or should exist for these |

The trial badge (`background-image` gradient + dashed border dropped) is the SAME "wrapper
background/border not populated" bug class as Finding 1 and Finding 2's card background.

**Proposed fix (not built):** same shape as Finding 2(a)/(b) — trace and fix whichever
converter stage extracts a block's own root/wrapper CSS declarations; this single fix likely
also closes the trial badge and contributes to the testimonial card fix once found.

---

## Cross-cutting observation

**Three of four real clusters (trust-bar background, testimonial card background, trial badge
background) are the SAME underlying bug shape: a wrapper/root element's `background`/`border`
attributes exist and are wired in render.php, but the converter isn't populating them from the
draft's OWN block-root CSS selector (as opposed to a nested BEM-classed child element, which
`route_area_css_to_block_attrs` handles correctly).** This strongly suggests ONE shared root
cause in whichever walker stage extracts a block's own top-level/root declarations — fixing
that one mechanism would likely close Findings 1(a), 2(a), and the trial badge in Finding 3 all
at once. Per CLAUDE.md's own "universal mechanisms, no per-block hyperfocus" rule, this should
be investigated as ONE fix, not three.

## Summary table (for prioritisation)

| Fix | Diffs closed (est.) | Confidence in root cause | Scope |
|---|---|---|---|
| Root/wrapper background+border population (shared mechanism) | 24 (trust-bar) + ~8 (testimonial card) + 9 (trial badge) ≈ 41 | High — mechanism identified, exact converter stage not yet located | 1 converter fix, likely universal |
| Testimonial rating alias lookup | 12 | High — exact function + missing lookup identified | 1-line-ish fix in `route_area_css_to_block_attrs`/`attr_for_area_property` |
| Testimonial quote text italic/margin | 6 | High — attrs exist, not populated | Likely same root cause as background+border fix |
| Pill font-size/weight/line-height | 12 (3 props × 4 pills) | High — attrs exist, not populated | Converter fix (possibly same class as above) |
| Pill text-align | 4 | High — genuinely no routed css_property | New DB row + converter wiring |
| Anchor-key 300-char window (STRUCTURE ruler limitation) | 0 real defects, but unblocks accurate STRUCTURE reporting | High | Measurement-tool fix, not a clone fix |

Not yet root-caused: LAYOUT's remaining ~57 non-clustered diffs and PAINT+TYPE's remaining
~104 non-clustered diffs (the census in this doc covers the biggest clusters, not every single
diff on the page).
