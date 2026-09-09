# Council Seat A — DOM-shape divergence in the CSS-transfer gap

**Date:** 2026-09-09 · **Remit:** the 46 unmatched elements / 418 lost properties (58% of the
whole CSS gap) in `pipeline-state/mamas-munches-3448-2026-09-08-232235/computed-parity.json`.
**Method:** artefact enumeration + source read of
`plugins/sgs-blocks/scripts/parity/computed-parity.js` + four live read-only Playwright probes
that reimplement the tool's own anchor-key algorithm against the same draft and the same live
clone. Every claim below is marked PROVEN (with artefact value, file:line, or probe output) or
ASSUMED.

---

## Headline

**PROVEN — none of the 46 "unmatched" elements is missing from the clone. All 46 are
measurement failures in the parity tool's anchor-key matcher, introduced by the v1.4.0 rewrite
that shipped the same day as this clone run.**

Three independent proofs:

1. **Content parity is 100% (78/78, `dropped: 0`, `dropped_text/images/links` all empty)** —
   artefact `viewports.1440.content`. Not one draft text node, image or link is absent from the
   clone. An element cannot simultaneously be "MISSING ENTIRELY" (the tool's own words,
   `computed-parity.js:906-911`) and have all its content present.
2. **`tag.mismatches` is an EMPTY list while `tag.pct` is 76% (143/189 pairs).**
   189 − 143 = 46 = exactly the unmatched count. PROVEN arithmetic from the artefact: every
   single tag miss came from the unmatched bucket (`runTier` does `tagT++` with no `tagMis`
   push at `computed-parity.js:1168`), and *every pair that actually matched had identical
   tags*. That is the signature of a matcher that cannot pair across a tag change — not of a
   clone with missing elements.
3. **Counterfactual probe (live, both pages, 1440px):** re-running the tool's own key algorithm
   with the tag dropped out of the key takes unmatched from **46 → 10**; with three further
   fixes, **46 → 5**. Baseline run of my reimplementation reproduces `draftKeys=189,
   unmatched=46` — byte-identical to the artefact's `tag.pairs=189` / 46 — so the
   reimplementation is faithful.

**PROVEN regression evidence.** Same draft file, earlier runs, before commit `2baf3171e`
("unify short-text blindness + 80-char truncation into one anchor-key mechanism", 2026-09-08):

| Run | CSS % | meaningful_props | unmatched elements | props lost to unmatched | tag pairs |
|---|---|---|---|---|---|
| `mamas-munches-homepage-2026-09-07-233003` | 83 | 900 | **4** | **3** | 104 |
| `mamas-munches-homepage-2026-09-08-105524` | 84 | 889 | **4** | **3** | 104 |
| `mamas-munches-3448-2026-09-08-232235` (this run) | **59** | 1753 | **46** | **418** | 189 |

Caveat (stated, not hidden): the clone target differs between rows (page 2742 vs 3448), so the
CSS % is not a controlled comparison. The **draft file is byte-identical across all three**, and
the draft alone determines the key population — so `104 → 189` draft-side keys is attributable
to the tool change and nothing else. ASSUMED-but-strongly-indicated: most of the 83% → 59% drop
is the tool, not the clone.

---

## The five mechanisms (all PROVEN)

### M1 — the clone's screen-reader `<legend>` poisons every ancestor-anchored key (90 props)

`sgs/option-picker` renders `<legend id="…-legend" class="sgs-sr-only">Pack size</legend>`
(PROVEN, live clone HTML). `sgs-sr-only` is clip-based, so `innerText` still returns it. The
v1.4.0 structural key anchors a short-text element on **`norm(ancestor.innerText)` capped at 300
chars** (`computed-parity.js:745-748`, `:429`). Probe output, same wrapper on both sides:

```
DRAFT struct|DIV|0|… no shortcuts no preservatives 8pack 12pack 20pack 40pack £1000 8pack  fr   (len 313)
CLONE struct|DIV|0|… no shortcuts no preservatives pack size 8pack 12pack 20pack 40pack £1000   (len 313)
```

Ten characters of accessibility text injected **mid-string** shifts the whole 300-char window.
`findByAnchor`'s fuzzy fallback (`:835`) is a *substring* test — a mid-string divergence defeats
it. Every struct key under that product card dies at once: artefact entries 2, 3, 4, 5, 11, 12,
36, 37, 38, 39 = **90 props**.

This is the structural fragility of the design, not a one-off: an ancestor-innerText anchor makes
*every* descendant key a hostage to *any* text change anywhere in that ancestor.

### M2 — tag-prefixed keys convert legitimate Rule-1 divergence into total loss (139 props)

`computed-parity.js:764` — `const textKey = anchorEl.tagName + '|' + dkey;` and `:747` —
`'struct|' + el.tagName + '|' + siblingIndex + '|' + ancestorText`.

Proven draft→clone pairs that the tool therefore scores as *missing*:

| Draft key | Clone key (PROVEN present) | Props lost |
|---|---|---|
| `BUTTON\|8pack` … `BUTTON\|40pack` | `SPAN\|8pack` (inside `<label>`), `struct\|INPUT\|0\|8pack` | 20 × 4 = **80** |
| `P\|baked fresh every week…` | `DIV\|baked fresh every week…` | 7 |
| `DIV\|new start here` | `SPAN\|new start here` | 18 |
| `P\|not sure yet try 3 classic…` | `DIV\|not sure yet try 3 classic…` | 7 |
| `SPAN\| trustpilot` | `P\| trustpilot` | 6 |
| `SPAN\|leave us a review…` | `P\|leave us a review…` | 5 |
| `P\|i was sceptical…` ×3 | `BLOCKQUOTE\|i was sceptical…` ×3 | 15 |
| `DIV\|she was struggling…` | `BLOCKQUOTE\|she was struggling…` | 1 |
| `MAIN\|handmade in birmingham…` | `DIV\|handmade in birmingham…` | 0 |

**This directly contradicts the tool's own design intent.** Its header states (`:63-65`) that a
tag divergence "`button→span`, `p→div`" is "EXPECTED convert-divergence (Rule 1) — REPORTED,
never auto-failed; it must not dilute … CSS." The v1.4.0 key change silently made a tag
divergence the *most* punitive possible CSS outcome: a 100% loss of every property on that
element. The dedicated TAG dimension was built precisely so the key would not have to carry the
tag.

### M3 — `norm()` strips decorative characters AFTER `trim()`, leaving a phantom leading space (125 + 21 props)

`computed-parity.js:429`:
`(t||'').replace(WS_RE,' ').trim().toLowerCase().replace(/[^a-z0-9 £]/g,'').slice(0,300)`

The character-class strip runs **after** `trim()`. The draft's testimonial stars are literal text
`★★★★★` (`sites/mamas-munches/mockups/homepage/index.html:998`); the clone renders them as SVG
`<span>`s (PROVEN, live clone HTML). So:

- draft key text → `" i was sceptical but honestly…"` (leading space; the ★ block was stripped
  after trimming)
- clone key text → `"i was sceptical but honestly…"` (no leading space)

Probe: *"no clone key shares the first 28 chars of this text"* for all three testimonial cards.
Combined with M2 (`ARTICLE` vs `DIV`, `P` vs `BLOCKQUOTE`) this kills the whole testimonial
cluster: entries 23, 24, 27, 28, 31, 32, 43, 44, 45, 46 = **125 props**, plus the social-proof
wrappers 18, 20, 22, 41, 42 = **21 props**.

Counterfactual probe V2 (strip-before-trim): 46 → 43 unmatched on its own.

### M4 — chrome scoping excludes in-content semantic `<footer>` (9 props)

`inChrome()` returns true for **any** ancestor whose tag is `HEADER`/`FOOTER`/`NAV`, at any
depth. Probe output, clone side:

```
<FOOTER> cls="sgs-testimonial__footer"        txt="reham london"
<FOOTER> cls="sgs-testimonial__footer"        txt="sarah m manchester"
<FOOTER> cls="sgs-testimonial__footer"        txt="halimah birmingham"
<FOOTER> cls="wp-block-sgs-quote__attribution" txt=" zainab founder of mamas munches"
```

`sgs/testimonial` and `sgs/quote` correctly use `<footer>` for the attribution (that is the HTML
spec's own idiom). The tool therefore deletes the entire attribution sub-tree from the clone
capture, so the draft's `P|reham london` / `P|sarah m manchester` / `P|halimah birmingham` /
`P| zainab founder…` have nothing to pair with. Entries 15, 26, 30, 34 = **9 props**. It also
means those elements' CSS is *never measured at all* on the clone side — a silent blind spot
wider than the score suggests.

### M5 — the SVG skip-list is dead code (6 props)

`SKIP_TAGS = { … SVG:1, PATH:1 … }` (`:434`) is keyed on **uppercase** names, but SVG elements in
an HTML document report **lowercase** `tagName`. Probe: `svgTag=svg rectTag=rect` on both pages.
So no SVG element is ever skipped, and the header's claim that "SVG internals … are skipped"
(`:70`) is false. Artefact entry 1 `struct|rect|0|free uk delivery over £35` = **6 props**, and
the clone side carries phantom `struct|svg|…`, `struct|path|…`, `struct|polygon|…` keys.
Counterfactual V4 (skip by SVG namespace): 46 → 45, draft key population 189 → 173.

### M6 — every element with children and short direct text is counted TWICE (structural)

`computed-parity.js:757-763` pushes into `textEls`; `:771-783` unconditionally pushes the same
element into `boxEls`. Both maps are then scored by separate `runTier` calls (`:1188-1189`).

PROVEN instance: the three testimonial `<article>`s appear as entries 23/27/31
(`struct|ARTICLE|0..2|…`, text tier) **and** 44/45/46 (`ARTICLE|…`, box tier) — 18 props each,
counted twice. **54 of the 418 props are pure double-count.** Counterfactual V1 shows the draft
key population collapsing 189 → 140 once the tag is removed from the key, i.e. 49 keys were
tag-variants or duplicate views of elements already keyed.

**Mechanism tally reconciles exactly to the artefact:**
90 (M1) + 139 (M2) + 146 (M3) + 9 (M4) + 6 (M5) + 28 (sibling-index divergence, below) = **418**.
The sibling-index residue is entries 16 and 17: `struct|DIV|1|give the gift…` (draft) vs
`struct|DIV|0|give the gift…` (clone only) — identical 300-char anchor, different sibling index
because the clone's wrapper has a different child composition. 5 + 23 = 28 props.

---

## Q1 — the classified 46

Class key: **(a)** genuine structural divergence the clone should fix · **(b)** deliberate,
justified divergence · **(c)** matcher limitation · **(d)** draft-side/tool artefact.

| # | Key (artefact) | Props | Mechanism | Class |
|---|---|---|---|---|
| 1 | `struct\|rect\|0\|free uk delivery over £35` | 6 | M5 dead SVG skip-list | **d** |
| 2 | `struct\|DIV\|0\|our signature zookies…` | 3 | M1 `Pack size` legend | **c** |
| 3 | `struct\|DIV\|0\|mamas munches zookies…` | 19 | M1 | **c** |
| 4 | `struct\|IMG\|0\|mamas munches zookies…` | 2 | M1 | **c** |
| 5 | `struct\|DIV\|0\|mamas munches zookies…` | 9 | M1 | **c** |
| 6 | `P\|baked fresh every week…` | 7 | M2 `p→div` | **b** scored as **c** |
| 7–10 | `BUTTON\|8pack/12pack/20pack/40pack` | 80 | M2 `button→label+input+span` | **b** scored as **c** |
| 11 | `struct\|DIV\|1\|mamas munches zookies…` | 6 | M1 | **c** |
| 12 | `struct\|DIV\|1\|mamas munches zookies…` | 19 | M1 | **c** |
| 13 | `DIV\|new start here` | 18 | M2 `div→span` | **b** scored as **c** |
| 14 | `P\|not sure yet try 3 classic…` | 7 | M2 `p→div` | **b** scored as **c** |
| 15 | `P\| zainab founder of mamas munches` | 0 | M3 + M4 | **c** |
| 16 | `struct\|DIV\|0\|most thoughtful 40day…` | 5 | sibling-index + tag (`P`/`A` on clone) | **c** |
| 17 | `struct\|DIV\|1\|give the gift…` | 23 | sibling-index (clone has index 0 only) | **c** |
| 18 | `struct\|DIV\|0\|what mums are saying…` | 3 | M3 (star text in anchor) | **c** |
| 19 | `SPAN\| trustpilot` | 6 | M2 `span→p` + M3 leading space | **b** scored as **c** |
| 20 | `struct\|SPAN\|1\| trustpilot…` | 5 | M2 + M3 | **c** |
| 21 | `SPAN\|leave us a review…` | 5 | M2 `span→p` | **b** scored as **c** |
| 22 | `struct\|DIV\|1\|what mums are saying…` | 5 | M3 | **c** |
| 23 | `struct\|ARTICLE\|0\| i was sceptical…` | 18 | M3 + M2 (**dup of 44**) | **c** + **M6** |
| 24 | `struct\|DIV\|0\| i was sceptical…` | 4 | M3 (draft stars div) | **c** |
| 25 | `P\|i was sceptical…` | 5 | M2 `p→blockquote` | **b** scored as **c** |
| 26 | `P\|reham london` | 3 | M4 in-content `<footer>` | **c** |
| 27 | `struct\|ARTICLE\|1\|…` | 18 | M3 + M2 (**dup of 45**) | **c** + **M6** |
| 28 | `struct\|DIV\|0\| bought these…` | 4 | M3 | **c** |
| 29 | `P\|bought these…` | 5 | M2 `p→blockquote` | **b** scored as **c** |
| 30 | `P\|sarah m manchester` | 3 | M4 | **c** |
| 31 | `struct\|ARTICLE\|2\|…` | 18 | M3 + M2 (**dup of 46**) | **c** + **M6** |
| 32 | `struct\|DIV\|0\| zainab is so responsive…` | 4 | M3 | **c** |
| 33 | `P\|zainab is so responsive…` | 5 | M2 `p→blockquote` | **b** scored as **c** |
| 34 | `P\|halimah birmingham` | 3 | M4 | **c** |
| 35 | `MAIN\|handmade in birmingham…` | 0 | M2 `main→div` | **b** scored as **c** |
| 36 | `SECTION\|our signature zookies…` | 5 | M1 | **c** |
| 37 | `DIV\|our signature zookies…` | 3 | M1 | **c** |
| 38 | `DIV\|mamas munches zookies…` | 5 | M1 | **c** |
| 39 | `DIV\|mamas munches zookies…` | 19 | M1 | **c** |
| 40 | `DIV\|she was struggling…` | 1 | M2 `div→blockquote` | **b** scored as **c** |
| 41 | `SECTION\|what mums are saying…` | 5 | M3 | **c** |
| 42 | `DIV\|what mums are saying…` | 3 | M3 | **c** |
| 43 | `DIV\| i was sceptical…` | 5 | M3 | **c** |
| 44–46 | `ARTICLE\| i was…/bought…/zainab…` | 54 | M3 + M2 (**dups of 23/27/31**) | **c** + **M6** |

**Class totals: (a) 0 props · (b)-driven 139 props (all still scored as (c) failures) ·
(c) 273 props · (d) 6 props.**

---

## Q2 — what would it take to make (a) emit matching structure?

**There is no (a).** Nothing in this bucket is a clone defect. The nearest thing to a real
finding is the *opposite* of a defect: the clone's `<legend class="sgs-sr-only">Pack size</legend>`
and its `<footer>` attributions are **accessibility improvements over the draft** that the
measurement punishes.

Where the clone's DOM does differ, the SGS block's semantics require it, and changing it would be
a regression:

- `sgs/option-picker` — `<button aria-pressed>` (draft) → `<fieldset><legend><label><input
  type=radio>` (clone). The clone's form is the one that works without JS, submits, is
  keyboard-navigable as a radio group, and is announced correctly. Reverting to buttons to score
  better would be trading real accessibility for a number.
- `sgs/testimonial` — `<article>` → `<div>` + `<blockquote>` + `<footer><cite>`. The clone's
  markup is *more* semantically correct than the draft's `<p>`-in-`<article>`.
- `p → div` on `sgs/product-card__description`: cosmetic, no user-visible consequence.
  ASSUMED-low-value; not worth a converter change on its own evidence.

---

## Q3 — the fix is in the matcher, and it is measured

Counterfactual probe (live, 1440px, both pages, tool's own algorithm with one variable changed):

| Variant | draft keys | unmatched |
|---|---|---|
| V0 baseline (current tool) | 189 | **46** |
| V1 tag-agnostic keys (drop tag + sibling index from the key) | 140 | **10** |
| V2 `norm()` strip-before-trim | 189 | 43 |
| V3 chrome = root-level `header/footer/nav` only | 189 | 46 |
| V4 SVG skipped by namespace | 173 | 45 |
| V5 V1+V2+V3+V4 combined | 140 | **5** |

(The probe also printed a "props still lost" column; I am **not** quoting it — the artefact's
prop figures are keyed on tag-prefixed strings that V1/V5 no longer produce, so that column is
not comparable across variants. Element counts are.)

V3 alone changes nothing — the clone-side `<cite>` it un-hides still cannot pair with the draft's
`<p>` while the tag is in the key. The mechanisms **compound**; that is why a single-cause fix
looks disappointing and the combination does not.

The five survivors under V5 are all M1 (`Pack size` legend) plus star-text divergence — i.e. the
one remaining class needs its own fix: **exclude visually-hidden text from anchor text, or stop
using ancestor `innerText` blobs as anchors at all.**

**Caution on V1 (stated, not glossed).** Dropping the tag re-opens exactly the wrapper-vs-child
collision that commit `2baf3171e` was written to close — the key population falls 189 → 140
partly because genuinely different elements now collide. The correct shape is **not** "delete the
tag": it is *key on text only, and use tag as a tie-break inside the existing candidate
machinery*. `collapseRaw` already returns an array of candidates on collision and `bestPairing`
(`:1138-1147`) already tries every draft candidate against every clone candidate and keeps the
lowest-diff pairing. The infrastructure to disambiguate without polluting the key exists and is
unused for this purpose. ASSUMED (not yet measured): tag-as-tie-break lands between V1's 10 and
V0's 46 on false pairings while keeping the unmatched count near V1's.

---

## Q4 — is "same DOM as the draft" even the goal? No. And that makes the current number invalid.

**No — and the tool already agrees with me in its own docstring; the v1.4.0 key change simply
broke that agreement.**

CLAUDE.md Rule 1 is "CONVERT, don't mirror". Spec 20's own header (`:63-70`) says a tag
divergence is **expected**, must be **reported separately**, and **must not dilute the CSS
score**. Class names are explicitly captured as context and never scored, for exactly this
reason. The architecture is coherent. What is incoherent is a **CSS score whose element
identity is keyed on tag and DOM sibling position** — that is DOM-identity scoring smuggled into
the CSS dimension through the back door of the matcher. Measured cost: 139 of 418 props are a
pure Rule-1 divergence penalty, and 46 of 46 tag "misses" are unmatched elements rather than
reported divergences.

So what *should* "CSS parity" mean under CONVERT-don't-mirror? **The draft's painted result must
be reproduced on whatever element the clone chose to paint it on.** Identity between the two
documents can only come from what survives conversion: **rendered content** (text, image
identity, link target) and **rendered geometry/paint**. Not tag. Not class. Not sibling index.
Not an ancestor's text blob.

That gives a clean rule for the 418:

- **139 props (Rule-1 tag divergence)** — must be **paired and compared**, never counted as
  missing. If the clone's `<label><span>` paints the draft's `<button>` styling, that is a PASS;
  if it does not, that is a real, scored mismatch. Today we learn neither.
- **273 props (matcher failure)** — must be **paired and compared**. Same argument.
- **6 props (SVG internals)** — **excluded**, per the tool's own stated (but non-functioning)
  policy.
- **54 props (double-counted `<article>`s)** — **deduplicated**, not fixed and not excluded.

Blanket-excluding any of these would be the wrong move and the project has a rule against it
(the "NEVER blanket-suppress a class by label" note at `:26-30`): a genuinely missing element is
still the worst fidelity outcome, and FR-20-4 exists because that case was once invisible. The
answer is not to un-count missing elements — it is to **stop manufacturing false ones**.

**Consequence for this session's headline number.** `overall_css_pct: 59` is not a clone-quality
measurement; roughly 418 of its 719 misses are the ruler. `pct_matched_only: 77` is not the
answer either — it is 77% over an incomplete population that silently omits 46 elements (and, via
M4, never measures the clone's testimonial/quote attributions at all). **Until the matcher is
fixed, neither figure should be quoted as fidelity to Bean.** The prior comparable runs at 83–84%
are the better current estimate, and even they were taken before M4/M5/M6 were known.

---

## Three candidate design directions

### D1 — Fix the matcher; change nothing in the pipeline (RECOMMENDED)

Five changes inside `computed-parity.js`, all local, all with a measured counterfactual:

1. **Text-only anchor keys; tag becomes a tie-break, not a key component.** Feed tag into the
   existing `bestPairing`/`collapseRaw` candidate machinery instead of the key string.
   (Measured: 46 → 10 unmatched for the crude version.)
2. **`norm()`: strip the character class before `trim()`.** One-line reorder. (46 → 43.)
3. **Chrome scoping by position, not tag name** — a `header`/`footer`/`nav` is chrome only when it
   is not nested inside page content. (Unblocks 4 elements + removes a silent clone-side blind
   spot.)
4. **Skip SVG by namespace**, not by an uppercase name that never matches. (46 → 45; also
   removes 16 phantom draft keys.)
5. **Deduplicate the `textEls`/`boxEls` double-entry** so one element cannot lose its properties
   twice. (54 props of proven double-count.)

Plus the remaining M1 class: **exclude visually-hidden text from anchor text.**

- **For:** every item is PROVEN-cause, cheap, local to one file, and independently measurable.
  It restores agreement between the tool and its own stated design. It changes no block, no
  converter, no client output.
- **Against:** change 1 needs a negative control proving it does not re-introduce the
  wrapper/child collisions `2baf3171e` closed — the honest risk, and it must be measured, not
  asserted.
- **Cost:** small. ASSUMED ~30–45 min of work plus a re-run.

### D2 — Replace text-anchoring with a converter-emitted provenance id

Have the converter stamp each emitted block/element with the draft node it came from (a
data attribute in a debug build), and match on that instead of on text.

- **For:** exact, tag-agnostic, immune to every one of M1–M6, and would survive future block
  redesigns. It is the only option that scales to drafts with repeated or empty-text structures.
- **Against:** the measurement then depends on the converter being *correct about its own
  provenance* — a tool that grades a pipeline using data the pipeline produced can no longer
  catch a whole class of pipeline error. It also requires a debug render path and touches the
  converter, i.e. a shared mechanism → design-gate under Rule 7. Bigger blast radius than the
  defect warrants today.

### D3 — Split the score: report "paired fidelity" and "pairing coverage" separately

Stop folding unpaired elements into the CSS percentage. Publish two numbers: CSS parity over
paired elements, and the pairing coverage (what fraction of the draft got paired at all), with
unpaired elements enumerated for the eye.

- **For:** honest about what is measured; makes a matcher regression like this one visible in one
  glance instead of masquerading as a 24-point fidelity drop. Cheap.
- **Against:** on its own it is only reporting — it fixes nothing, and it partially reverts
  FR-20-4's hard-won decision that a missing element must hurt the score. Only safe **as a
  companion to D1**, once unpaired genuinely means missing.

**Recommendation: D1 now, with D3 as its reporting companion. D2 parked** — revisit only if
text-anchoring proves inadequate after D1 is measured.

---

## ADDENDUM — reconciliation with Seat C + the semantic ruling

### Where Seat C and I agree (independently reached, same conclusion)

Tag-in-the-key (`:747`, `:764`), the unmatched charging path (`:1157-1169`), the double-scoring of
containers (`:757-763` + `:771-783`, both run into the same totals at `:1188-1189`), the dead
uppercase SVG skip-list (`:434`), and the content-100%-vs-CSS-missing self-contradiction. Two
seats reaching this from different directions is the strongest signal in the council.

### Three corrections to Seat C's supporting claims (PROVEN)

1. **"clone renders `<label class="sgs-option-picker__option">`" — true of the DOM, wrong about
   the key.** The tool anchors on the element holding the *direct text*, which is
   `<span class="sgs-option-picker__pill">`, and the inline-wrapper hoist (`:757-763`) stops
   because the `<label>` has **two** children (`<input>` + `<span>`), not one. Live probe: the
   clone keys are `SPAN|8pack` and `struct|INPUT|0|8pack`. This matters for the fix — a
   hoist-only patch will not close it.
2. **"identical duplicate key strings in the artefact, impossible within a single JS object" is
   not load-bearing.** `unmatched_elements` stores `key.slice(0, 44)` (`:1166`), so 44-char
   truncation alone produces identical strings from different keys; and the two maps are keyed
   in different formats (`struct|…` vs `TAG|…`) so the single-object argument does not apply.
   The conclusion is right; the proof should be the construction (both pushes fire
   unconditionally) plus the live element identity — see the count below.
3. **`pct_matched_only` 77% is NOT independent corroboration of ~78%.** It is computed from the
   same matched population (`:1209`), and it *excludes* the 46 rather than pairing them — so it
   cannot move when they are paired correctly. It is also over an incomplete population: M4
   means the clone's testimonial and quote attributions were never measured at all. The honest
   statement is "the corrected figure is not yet known; the nearest comparable measurements are
   the 83–84% of the two prior runs, themselves taken before M4/M5/M6 were known." I would not
   publish a corrected band until the fixed tool has actually run.

Unverified from Seat C: the "36 SVG-internal diffs" figure. My measurement is 6 props on the
`rect` entry plus 16 phantom draft keys removed when SVG is skipped by namespace.

### Distinct-element count (PROVEN, live probe)

**46 unmatched keys = 50 element-records = 41 DISTINCT draft elements.** Nine elements are
counted twice (once via `textElsRaw`, once via `boxElsRaw`): `sgs-featured-product__inner`,
`sgs-products`, `sgs-product-card--featured`, `sgs-product-card__body`, `sgs-social-proof__inner`,
`sgs-testimonial-slider`, and the three `sgs-testimonial` `<article>`s. Seat C's "108 props for
the articles" is correct as *charged*, but only **54** of it is distinct — do not subtract 108
and the double-count separately.

### Q-revised — the four categories, counted on the 41 distinct elements

| Category | Count | What it is |
|---|---:|---|
| **(i-a) Pure tag substitution** — element exists, semantically equivalent, tool's fault | **14** | `p→div` ×2 (product descriptions), `div→span` (trial tag), `span→p` ×2 (Trustpilot logo + text), `div→blockquote` (brand quote), `p→blockquote` ×3 (testimonial text), `p→footer>cite` ×3 (testimonial authors), `p→footer` (brand attribution), `main` scope shift ×1 |
| **(i-b) Same tag, still unmatched** — pure matcher failure, no tag change at all | **15** | Every wrapper poisoned by the `Pack size` legend (M1) or by sibling-index/anchor divergence: `sgs-featured-product`, `__inner`, `sgs-products`, `product-card` ×2, `__body`, `__image`, `__pill-group`, `__price-row`, `__tag--trial`, gift `card-price`, announcement bar, `social-proof`, `social-proof__inner`, `trustpilot-bar`, `testimonial-slider` |
| **(ii) Genuinely absent from the clone** | **0** | None. Content parity 100%, `dropped: 0`, and every element located live. |
| **(iii) Deliberate, defensible structural divergence — must NOT be reverted** | **8** | `<button aria-pressed>` ×4 → `<label><input type=radio><span>`; `★★★★★` text ×4 (3 testimonial star rows + Trustpilot stars) → `<div role="img" aria-label>` + SVG (`render.php:756`) |
| **(iv) Draft-side / tool artefact** | **1** | The SVG `<rect>`, admitted only because the skip-list never fires |
| **(judgement call) `<article>` → `<div>`** | **3** | The three `sgs/testimonial` cards. Ruling below. |

**(i-a) + (i-b) + (iv) = 30 of 41 elements are the ruler. (iii) = 8 are the pipeline doing the
right thing. (ii) = 0. The remaining 3 are the only genuine design question in the bucket.**

### Should the pipeline ever be asked to match the draft's tag?

**No — never as a pipeline behaviour. Chasing the draft's tag IS mirroring, and Rule 1 names it a
violation. But "never chase the tag" is not the same as "never care about the tag": a tag
divergence is a signal to triage the BLOCK once, on its own semantic merits, with the diff tool
having no vote.**

The per-case rule, applied to the 41:

**Verdict A — the clone's tag is BETTER. Keep it; never revert; the tool must learn to pair
across it.** (11 elements)
- `<button aria-pressed>` ×4 → `<label><input type="radio">`. The clone's form works without
  JavaScript, submits, is keyboard-navigable as a single radio group with arrow keys, and is
  announced as "radio, 1 of 4". The draft's `aria-pressed` buttons are four independent toggles
  that only *look* like a choice. Reverting this to score better on a diff would trade a real
  accessibility gain for a number — the exact inversion the project's own R-31-4 warns against.
- `★★★★★` text ×4 → `<div role="img" aria-label="…">` + SVG (`render.php:756`). A screen reader
  reads the draft's glyph run as "black star black star black star…". The clone gives one
  accessible name. Improvement.
- `<p class="sgs-testimonial__text">` ×3 → `<blockquote>`, and `<div class="sgs-brand__quote">` →
  `<blockquote>`. Correct HTML for quoted speech; the draft's was not.
- `<p class="…__author">` ×3 → `<footer><cite>`. The HTML spec's own attribution idiom.
  (These last three are the same elements as above, counted once each in the table.)

**Verdict B — the tag is IMMATERIAL. Keep whatever the block emits; ignore entirely.** (≈8
elements) `p→div` on the product description, `div→span` on the trial tag, `span→p` on the
Trustpilot strings. No AT consequence, no CSS consequence, no client-visible consequence. There
is no case for a converter change here, and no case for a tool exception either — the tool should
simply pair them.

**Verdict C — the clone's tag is WORSE. Fix it in the BLOCK, on its own merits, not because a
diff tool asked.** (3 elements: `<article class="sgs-testimonial">` → `<div>`)

I must correct the framing in the brief: **`<article>` is not a landmark.** It is a
document-structure role in WAI-ARIA, not one of the landmark roles (banner, complementary,
contentinfo, form, main, navigation, region, search). So "an article is a real landmark; a div is
not" overstates the loss, and I would not want that reasoning to carry a decision.

What *is* true, and still enough: a customer review is the HTML specification's own canonical
example of `<article>` (a self-contained, independently distributable composition); `<article>`
maps to `role="article"`, which NVDA and JAWS do expose and offer navigation to; and `sgs/testimonial`
already emits every *other* part of the correct pattern — `<blockquote>` at `render.php:925`,
`<cite>` at `:932`, `<footer>` at `:947`. The root element is the one piece that fell back to a
generic `<div>` (`render.php:1160`). It is an inconsistency inside the block's own markup contract,
and it would be worth closing even if the parity tool did not exist.

**But the fix belongs in the block, not the converter.** One element at
`plugins/sgs-blocks/src/blocks/testimonial/render.php:1160` (`<div <?php echo $wrapper_attrs; ?>>`
→ `<article …>`), plus its editor-side counterpart. ASSUMED, not verified: whether `save.js`
emits matching markup that would also need the change — check before touching it. Teaching the
**converter** to copy the draft's tag would be the Rule-1 violation, would be unbounded (every
draft's idiosyncratic tag choice becomes framework behaviour), and would have produced the
*wrong* answer in all 11 Verdict-A cases.

**Related and separable:** I found no landmark regression. Both pages carry a `<main>` — draft
`<main id="main-content">`, clone `<main … id="main">` (PROVEN, both documents). The
`MAIN|handmade…` entry is an anchor-scope difference, not a missing landmark, and it scores 0
props. I had assumed otherwise before checking; the check falsified it.

### The one-line answer for the council

**Thirty of the 41 elements are the ruler, eight are the pipeline being deliberately better than
the draft, zero are missing, and three are a real but modest semantic inconsistency inside
`sgs/testimonial` that should be fixed in the block for its own reasons. Not one of the 41
justifies teaching the converter to reproduce the draft's DOM.**

## What I did not establish

- Whether the remaining ~301 non-unmatched misses (the 67 `mismatches` entries) are real clone
  defects. Out of remit; not examined.
- Whether the 83–84% figure from the earlier runs is itself sound — those runs predate the
  discovery of M4, M5 and M6, all of which existed then too.
- The precise props recovered per fix. The probe measures elements, not properties; the artefact's
  prop attributions are not comparable across key formats. A re-run of the fixed tool is the only
  honest way to get that number.
