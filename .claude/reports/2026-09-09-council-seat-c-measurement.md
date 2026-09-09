# Council Seat C — is the 59% real?

**Date:** 2026-09-09 · **Scope:** `plugins/sgs-blocks/scripts/parity/computed-parity.js` v1.4.0
· run `pipeline-state/mamas-munches-3448-2026-09-08-232235/computed-parity.json` (viewport 1440)
**Verdict:** **The 59% is not trustworthy. Corrected CSS parity is 75–81% (best estimate ~78%).**
Every claim below is marked PROVEN (file:line or computed) or ASSUMED.

---

## 1. Headline: the brief's own framing understates the problem

The brief asks about the 301 property diffs. Those are only **42%** of the gap.

PROVEN (computed from the artefact, viewport 1440):

```
meaningful_props T = 1753 ; match M = 1034 ; pct = 59%
misses = 719 = 418 "meaningful_props_lost_to_unmatched"  +  301 matched-pair diffs
                └─ 58% of the gap ─┘                        └─ 42% ─┘
```

**58% of the reported gap comes from 46 draft elements the tool says have NO counterpart in
the clone.** Content parity in the same run is **100% (78/78 texts + images + links)**. Those two
statements cannot both describe a clone with 46 missing elements. The unmatched bucket is
measuring the tool's own anchor-key mechanism, not the clone.

---

## 2. Four proven defects in the ruler

### D-1 — Every container element is scored TWICE (PROVEN, source + artefact)

`computed-parity.js:749-786`. The per-element loop has two **independent** `if` blocks:

- lines 755-773: direct text ≥4 → push to `textElsRaw` under `TAG|directText`;
  **`else if (!isHtmlOrBody)`** → push to `textElsRaw` under `struct|TAG|i|ancestorText`.
  There is no path by which a non-html/body element skips this block.
- lines 775-786: `childElementCount > 0 || IMG` → push to `boxElsRaw` under
  `TAG|innerText` (≥5) or the same `struct|…` key.

Both maps are then scored into the **same** `T`/`M` accumulators —
`computed-parity.js:1188-1189`: `runTier(d.textEls, …); runTier(d.boxEls, …);`

Re-derived the maps offline from `sites/mamas-munches/mockups/homepage/index.html`:
**49 of 49 `boxEls` elements are also in `textEls` (100% overlap).** Tier 2 contributes zero new
elements; its entire contribution to the score is duplication.

Caught red-handed in the artefact — **identical key strings appearing twice** (impossible within
one JS object, so these are one element scored in both tiers):

| Duplicated key (1440) | Entries | Props each |
|---|---|---|
| `struct\|SPAN\|0\|handmade in birmingham` (+3 sibling trust badges) | 2 each | 9 |
| `struct\|svg\|0\|handmade in birmingham` (+3 siblings) | 2 each | 3 |
| `struct\|DIV\|1\|handmade in birmingham made for t` | 2 | 3 |

Exact-duplicate keys alone: **50 redundant matched-pair diffs + 47 redundant unmatched props = 97
props charged twice**, with zero inference. Cross-map twins (a `struct|…` key in tier 1 and a
`TAG|innerText` key in tier 2 for the same element — e.g. `struct|SECTION|0|handmade…` and
`SECTION|handmade in birmingham made for…`, identical 5-prop diff set) add substantially more.

### D-2 — The anchor key embeds the TAG, so a tag substitution scores as "element missing entirely"

`computed-parity.js:767` (`anchorEl.tagName + '|' + dkey`) and `:747` (`'struct|' + el.tagName + …`).
If the clone renders the same content in a different tag, no key matches, and
`computed-parity.js:1157-1169` charges **every meaningful property** as lost. Meanwhile the TAG
dimension — which exists precisely to score this — reports `mismatches: []`, because it only runs
on pairs that matched.

PROVEN on the live clone (`curl` of the deployed page 3448) vs the draft:

| Draft | Clone | Unmatched entries | Props charged |
|---|---|---|---|
| `<article class="sgs-testimonial">` ×3 | `<div class="sgs-testimonial sgs-testimonial--classic-card">` ×3 | 6 (×2 per D-1) | **108** |
| `<button class="sgs-product-card__pill">8-pack…` ×4 | `<label class="sgs-option-picker__option" for="…-8-pack">` ×4 | 4 | **80** |
| `<section>` ×2, `<main>` ×1 | present (clone has 12 `<section>`, 3 `<main>`) | 3 | **10** |

**198 of the 418 unmatched props are charged for elements that demonstrably exist in the clone.**
The real defects here are 7 tag substitutions and a section-boundary divergence — worth reporting,
worth ~7 tag misses, not 198 CSS misses.

### D-3 — The SVG skip never fires (PROVEN, case bug)

`computed-parity.js:434`: `SKIP_TAGS = { STYLE:1, SCRIPT:1, NOSCRIPT:1, SVG:1, PATH:1, … }`
`computed-parity.js:750`: `if (inChrome(el) || SKIP_TAGS[el.tagName]) return;`

`Element.tagName` is uppercase for HTML elements but **preserves the lowercase name for inline SVG**
(`svg`, `path`, `rect`, `circle`, `polygon`). `SKIP_TAGS['svg']` is `undefined`, so the intended skip
never applies. Corroborated by the artefact: tags `svg`, `path`, `circle`, `polygon`, `rect` appear
throughout `mismatches` and `unmatched_elements`.

Cost at 1440: **36 SVG-internal property diffs** (`stroke-linecap` 12, `stroke-linejoin` 12,
`stroke` 3, `d` 3, `cx` 2, `cy` 2, `r` 2) plus a `struct|rect|0|…` unmatched entry (6 props) plus 15
`color` diffs on SVG children that merely mirror the parent's `currentColor` diff.

### D-4 — Longhand multiplication (PROVEN, exact arithmetic)

The authors already recognised this problem and fixed it **for colour only** —
`computed-parity.js:373-375` blocklists `border-*-color` with the comment *"one colour diff counts
many times"*. The same reasoning was not applied to width/style, radius, gap or grid.

| Longhand family | Diffs at 1440 | Authored declarations | Inflation |
|---|---|---|---|
| `border-{top,right,bottom,left}-{style,width}` | 80 (exactly 10 each) | 10 × `border` | **8×** |
| `row-gap` + `column-gap` | 14 (7 each) | 7 × `gap` | 2× |
| `grid-template-{columns,rows,areas}` | 12 | ~5 | ~2.4× |
| `border-*-radius` ×4 corners | 8 | 2 | 4× |
| `overflow-{block,x,y}` | 12 | 4 | 3× |
| **Total** | **126** | **28** | |

Two of the twelve `overflow` diffs are `hidden` vs `clip` on a non-scrollable `<section>` —
visually equivalent by a different mechanism.

### D-5 — `background-*` / `border-image-*` on `<img>` (already closed, still scoring)

36 diffs at 1440: `background-position` 9, `background-repeat` 9, `background-size` 9,
`border-image-slice` 9 — **all on `tag: "img"`**. A replaced element paints via `src`; these layers
never render. Investigated and closed as tool noise earlier today (clone-fidelity programme item
3.22, `object-fit`/`object-position` live-verified correct). The tool still counts them.

---

## 3. Corrected CSS parity — the arithmetic

Each removal is taken out of **both** the miss count and the denominator `T` (these properties
should never have entered the population).

**Matched-pair side (301 diffs):**

| # | Correction | −props |
|---|---|---|
| M1 | SVG-internal geometry/stroke (D-3) | 36 |
| M2 | `background-*`/`border-image-slice` on `<img>` (D-5) | 36 |
| M3 | border longhands 80 → 10 declarations (D-4) | 70 |
| M4 | `gap` 14 → 7 | 7 |
| M5 | `grid-template-*` 12 → 5 | 7 |
| M6 | `border-radius` 8 → 2 | 6 |
| M7 | `overflow` 12 → 4, less 2 `hidden`↔`clip` equivalences → 3 | 9 |
| | **Subtotal** | **171** |

Remaining real matched-pair defects: **130** (includes 15 `color` diffs on SVG children that mirror
their parent's — arguably 11 more removable; left in, conservatively).

**Unmatched side (418 props / 46 entries):**

| # | Correction | −props |
|---|---|---|
| U1 | 3 testimonial `<article>` — present as `<div class="sgs-testimonial">`, scored ×2 (D-1 + D-2) | 108 |
| U2 | 4 pack-size `<button>` — present as `<label class="sgs-option-picker__option">` | 80 |
| U3 | 2 `<section>` + 1 `<main>` — present; key text differs on section boundaries | 10 |
| U4 | remaining 18 **text-keyed** entries (`P`/`SPAN`/`DIV` with text) — content parity is 100% (78/78), so their content is provably present in the clone; these are key/tag failures | 103 |
| | **Subtotal** | **301** |

Remaining unmatched misses: **117** across 15 `struct|`-keyed entries (wrappers, one `<img>`, one
svg `<rect>`). **Not individually verified — kept as misses.**

**Result:**

```
T' = 1753 − (171 + 301) = 1281        M' = 1034 (unchanged)
CSS parity = 1034 / 1281 = 80.7%  →  81%          (vs reported 59%)
remaining misses = 247 = 130 matched-pair + 117 unmatched
```

**Conservative floor** — drop the U4 content-parity inference and keep those 103 as misses:

```
T' = 1753 − 369 = 1384 ;  1034 / 1384 = 74.7%  →  75%
```

### **Corrected CSS parity: 75–81%, best estimate ~78%. Reported: 59%.**

**Independent cross-check (PROVEN):** the tool's own `pct_matched_only` is **77%** at all three
viewports (`computed-parity.js:1203`) — it drops the unmatched bucket entirely. It lands inside my
band. It gets there for the wrong reason (it also cannot see a genuinely missing element), but the
convergence is real.

### What I cannot compute honestly

**The artefact records only MISMATCHING properties, never matching ones.** Excluding a property
class removes its *passes* from `M` as well as its *failures* from `T`, and those passes are not in
the file. For M1 and M2 the excluded classes mostly PASS, so a full exclusion would move the number
slightly **down** from 81%, not up. **75–81% is therefore an estimate band, not a measurement.** The
only way to get a true number is to fix the tool and re-run.

**This is itself a finding: the report is not sufficient to audit its own score.** Any corrected
model must emit per-property pass/fail counts.

---

## 4. Negative controls — present, but covering ~1% of the tool

PROVEN (`computed-parity.js:959-1099`). `--self-test` is genuine and well built: four checks on
real on-disk fixtures through the real `capture()` + `comparePair()` path, including a true negative
control (a flat 10px clone must still score a miss), a vacuity guard that reads the fixture back off
disk and asserts the injected `10px`/`11px`/`17px` strings landed (`:1015-1017`), and a
misattribution regression for a bug two reviewers previously found.

**But all four tests exercise one rule — fluid font-size / line-height equivalence — on a single
`<p>`.** There is **zero** negative-control coverage of:

| Mechanism | Covered? | What went undetected |
|---|---|---|
| `BLOCK` blocklist (`:360-386`) | **No** | A wrongly-added property silently deletes real defects; nothing fails. |
| Anchor-key construction (`:747, :767`) | **No** | D-2: tag substitution → "element missing", 198 phantom props. |
| Tier-1/tier-2 duplication (`:1188-1189`) | **No** | D-1: every container scored twice. |
| `SKIP_TAGS` (`:434`) | **No** | D-3: a case bug disabled the whole SVG skip. |
| `subVisibleBucket` (`:865`) | **No** | An over-broad predicate silently unscores real diffs. |
| `meaningfulCountUnmatched` (`:912`) | **No** | Charges an element that is present. |

**Assessment: the tool has a negative control for the one rule it was reviewed on, and none for the
five mechanisms that produce the 59%.** This is the exact failure this project's memory records —
*a check with no negative control passes against a dead feature*, and *a gate's scope is not the
defect's scope*.

**Recommendation (concrete):** add a `--self-test` fixture pair that is a *known-good clone with
planted, enumerated defects*:
1. **Blocklist control** — a fixture with one planted diff per blocklisted property, asserting the
   documented count is unscored, and one per *non*-blocklisted property, asserting it IS scored. A
   property silently added to `BLOCK` then fails a named check.
2. **Tag-substitution control** — the same content in `<article>` vs `<div>`. Assert:
   `unmatched_elements` is empty and `tag.mismatches` has exactly 1 entry. Today this fails.
3. **Duplication control** — a fixture with N container elements and one planted diff each. Assert
   `sum(len(diffs)) === N`. Today it returns 2N.
4. **SVG control** — a fixture containing `<svg><path><rect><circle>`. Assert zero SVG-tagged
   records in the output. Today this fails.
5. **Longhand control** — one authored `border: 2px solid red` diff. Assert it counts once.

Each is a one-fixture, one-assertion check, and each one **fails today** — which is the definition
of a working negative control.

---

## 5. Blocklist vs the `excluded_properties` DB table — two lists, already drifted (PROVEN)

They are **not** the same source of truth. Nothing reads the DB into the tool; `BLOCK` is a
hard-coded `new Set([…])` literal at `computed-parity.js:360-386`. This is a
**no-hardcoded-dicts (R-31-1)** exposure in a measurement tool.

| Property | In DB `excluded_properties` | In tool `BLOCK` | Scored at 1440? |
|---|---|---|---|
| `transition`, `position`, `right`, `bottom` | yes | yes | no — agree |
| `inset` | yes | via `LOGICAL_RE` (`:388`) | no — agree by accident |
| **`overflow-x`** | yes | **no** | **yes — 4 diffs** |
| **`overflow-y`** | yes | **no** | **yes — 4 diffs** |
| **`flex-grow`** | yes | **no** | **yes — 3 diffs** |
| **`flex-shrink`** | yes | **no** | 0 this run |
| **`flex-basis`** | yes | **no** | **yes — 2 diffs** |
| ~60 others (`cursor`, `animation-*`, `border-*-color`, `transform`, `width`…) | **no** | yes | no |

**5 of the DB's 10 rows are absent from the tool's blocklist, and 13 property diffs in this run are
on properties the project formally decided (Bean/Spec31-A1, 2026-07-22) no block consumes.**
Conversely ~60 tool exclusions have no DB record and no decision trail beyond a code comment.

Note the two lists have *different jobs* — the DB governs converter attribute LIFT, the tool governs
fidelity scoring — but that distinction is nowhere written down, there is no reconciliation gate, and
they have already diverged in both directions. Recommend: keep two tables, but make the tool read a
`parity_excluded_properties` table (same DB, `reason` + `decided_by` + `date` + `applies_to_tags`),
and add a `handoff-preflight` check that every property in either table names its counterpart's
status.

---

## 6. `leftover-buckets.json` — 54% of it is correct behaviour logged as failure (PROVEN)

```
extraction_failed = 450
  241 × reason "no value extracted"          ← the draft simply doesn't use the feature
  209 × reason "declared in draft CSS but not extracted"   ← the real signal
```

Each of the 241 carries `"gap_level": "attribute", "severity": "medium"`. The slots recur exactly 7×
(once per section): `templateLock`, `bgParallax`, `bgKenBurns`, `bgVideo`/`Tablet`/`Mobile`,
`backgroundImage`/`Mobile`/`Tablet`, `bgSvgAnimation`, `bgSvgContent`, `shapeDividerBottom*`,
`*ColourGradient`, `*ColourHover`…

This does not touch the 59% (Spec 20 / rule 4a explicitly bars the input-side logs from being the
fidelity signal), but it makes the artefact unreadable: a reader looking for the 209 real drops must
first know that 54% of the file is noise.

**Recommendation:** don't delete them — **re-label**. `reason: "not present in draft"`,
`severity: "info"`, and move them to a separate `not_applicable` bucket. `extraction_failed` should
mean *the draft declared it and we failed to take it* — the 209.

---

## 7. Recommended scoring model

### (a) Applicability must be per-element, never a global blocklist — **yes, agreed**

`background-size` on a `<div>` is a real, high-blast defect; on an `<img>` it is unpaintable. A
global blocklist would hide the first to silence the second. There is no per-element applicability
filter today — `readAll()` (`:475-484`) applies one global `BLOCK` to every element, and
`isEmptyPaint` (`:456`) is used only for pseudo-element paint merging, not for scoring.

Add a small, **documented, DB-backed** applicability predicate keyed on `(property, tag)`:

| Rule | Excludes | Rationale |
|---|---|---|
| replaced elements (`img`, `video`, `iframe`, `canvas`, `embed`, `object`) | `background-*`, `border-image-*` | paints via `src`; `object-fit`/`object-position` stay scored |
| SVG namespace (`svg` and every descendant) | the whole element | fix `SKIP_TAGS` case (D-3); icon internals are converter-substituted by design |
| `display: none` / zero-area | the whole element | nothing painted |

Each rule needs a fixture asserting it excludes on the target tag **and still scores on a `<div>`**.

### (b) Collapse longhands for scoring — **yes, with the diff kept**

Score one unit per **authored declaration family** (`border`, `border-radius`, `gap`,
`grid-template`, `overflow`, `margin`, `padding`, `inset`, `background`). Report the longhand diffs
in full underneath — a developer needs to know it's the *bottom* border — but the *count* is 1. This
is not a new principle; it is the `border-*-color` reasoning at `:373-375` applied consistently.

Effect here: 126 diffs → 28. Note this also requires collapsing the *passes*, which is why the
denominator must be rebuilt, not patched.

### (c) Leftover bucket — **re-label, don't delete** (see §6)

### (d) The headline number — **four numbers, not one**

One number is the reason this tool has been wrong in both directions twice. A single percentage
mixes a missing testimonial card with a 2px border, and Bean cannot act on it. Report:

| Score | Population | Fails when | Acts as |
|---|---|---|---|
| **CONTENT** | texts + images + links present | anything is missing | already 100%, already trustworthy |
| **STRUCTURE** | draft elements → clone element, matched by content | tag substituted, element absent, section boundary moved | **new** — absorbs today's `unmatched` + `tag`; would flag the 3 `<article>`→`<div>`, the 4 `<button>`→`<label>`, the 12-vs-7 section split, **as 7+ structural findings, not 198 CSS misses** |
| **LAYOUT** | display, grid/flex, gap, alignment, box spacing, max-width | geometry differs | where the real defects are (`align-items` 14, `display` 12, gaps, `max-width`) |
| **PAINT + TYPE** | colour, background, border, radius, font-*, line-height, text-align | it looks wrong | `color` 19, `background-color` 11, `font-size` 5 |

Rules that keep it honest:
1. **Every percentage carries its denominator** — already enforced at `:1195-1197`; keep it.
2. **No aggregate headline.** Four numbers, and a plain-English one-liner per dimension
   (*"7 elements are built with a different HTML tag than the draft"*). R-31-4 already says the
   aggregate is a diagnostic, never the closing gate.
3. **The tool must emit per-property pass counts**, not only failures — otherwise the next person
   auditing it hits the same wall I did in §3.
4. A **STRUCTURE** miss must never be re-charged as N **LAYOUT** misses. That double-charge is the
   single largest distortion in the current number.

---

## 8. Order of work (highest correction per unit effort)

| # | Fix | Effect on 1440 | Confidence |
|---|---|---|---|
| 1 | Score `boxEls` and `textEls` once per element (D-1) | removes ~97 provable duplicate props, more via cross-map twins | PROVEN |
| 2 | Make the anchor key tag-**agnostic**; route tag differences to the TAG dimension (D-2) | ~198 phantom unmatched props | PROVEN |
| 3 | Fix `SKIP_TAGS` case for SVG (D-3) — one-line | 36 diffs + a `rect` entry | PROVEN |
| 4 | Per-element applicability for replaced elements (D-5) | 36 diffs | PROVEN |
| 5 | Longhand collapse (D-4) | 126 → 28 | PROVEN |
| 6 | Five negative-control fixtures (§4) — each fails today | — | — |
| 7 | Move the blocklist into the DB + reconciliation gate (§5) | 13 diffs | PROVEN |
| 8 | Re-label the 241 not-applicable leftovers (§6) | readability | PROVEN |
| 9 | Split the headline into 4 (§7d) | — | — |

**Do not build a CSS-transfer fix against the 59%.** On this evidence roughly 470 of the 719 reported
misses are artefacts of the ruler. The real defect population is ~250 properties over ~28 authored
declarations plus ~7 structural substitutions — a materially different, and much more tractable,
problem than "41% of the CSS didn't transfer".
