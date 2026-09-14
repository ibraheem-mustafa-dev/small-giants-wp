---
doc_type: report
date: 2026-09-14
topic: Claude Design draft (Ward End Eye Care) vs SGS cloning pipeline + block framework
status: findings — §7 mechanism BUILT same day (D1057/D1058); §7/§8 corrected against what was actually found building it — see inline corrections
---

# Claude Design draft → SGS pipeline: what actually blocks it

Subject: `sites/eye-care-ward-end/design_handoff_ward_end_eye_care/` — the Q1 measurement
input. Produced by Claude Design with no SGS-BEM convention, no effect inventory and no
technical constraints in the brief, deliberately (see `sites/eye-care-ward-end/CLAUDE.md`
§"Role in the cloning pipeline").

Everything below is command-verified. Claims that came from a subagent and did not survive
first-hand checking are marked as corrected, with the correction.

## Implementation state

Zero. No `mockups/`, no `theme-snapshot.json`, no `pipeline-state/` run for this client.
`sites/eye-care-ward-end/Ward End Eye Care shop site/` is an empty directory. There is no
code of ours to lint or diagnose — only the design.

## 1. Static analysis of the draft

`Eye Care Birmingham.dc.html`, 2,220 lines:

| Measure | Value | Command |
|---|---|---|
| inline `style="` attributes | 815 | `grep -o 'style="' … \| wc -l` |
| `class="` attributes | 1 (`rev-rail`) | `grep -o 'class="' … \| wc -l` |
| SGS-BEM classes | 0 | `grep -o 'sgs-' … \| wc -l` |
| `{{ }}` template bindings | 756 | `grep -o '{{' … \| wc -l` |
| `@media` queries | 1 — `prefers-reduced-motion` only | `grep -o '@media[^{]*' … \| sort -u` |
| `onClick=` handlers | 106 | `grep -o 'onClick=' … \| wc -l` |

It is not static HTML. It is Claude Design's own component DSL (`x-dc`, `sc-for`, `sc-if`,
mustache bindings) requiring `support.js` to produce any DOM.

**Responsiveness is JavaScript, not CSS.** Line 1808:
`const mob = effW < 760, narrow = effW < 1024, wide = effW >= 1280, lensStack = effW < 700`
— `mob` is referenced 47 times, `narrow` 15, `wide` 4, each selecting a different inline
style string. Width comes from a `ResizeObserver` on the root element
(`Eye Care Birmingham.dc.html::measure`).

## 2. The BEM gate has no coverage check — a missing feature, not a defect

> **Council correction (sceptic seat).** An earlier version of this section called draft
> mode's behaviour a "false green" and "the one defect to fix now". That mischaracterised
> it. Draft mode's exit-0-on-violations is **explicit, documented and self-tested** —
> `bem-lint.py`'s docstring specifies it and a self-test (`"draft mode on malformed"`)
> asserts `passed=True, exit_code=0` on a violating class. It is working exactly as
> designed. The real gap is that **no coverage check has ever been built**, so a PASS
> carries no information when almost nothing was in scope to be checked. Missing feature,
> not regression.

```
$ python plugins/sgs-blocks/scripts/lints/bem-lint.py "…/Eye Care Birmingham.dc.html" --mode strict
…:318:10: error: class 'rev-rail' does not match the SGS-BEM regex
FAIL - 1 violation(s) in 1 SGS-prefixed or uncategorised class(es) checked [mode=strict]
strict exit: 1

$ python … --mode draft
…:318:10: warning: class 'rev-rail' does not match the SGS-BEM regex
PASS - 1 violation(s) in 1 SGS-prefixed or uncategorised class(es) checked [mode=draft]
draft exit: 0
```

**Draft mode PASSES, exit 0**, on a file supplying essentially none of the recognition
signal the pipeline needs. The lint only inspects classes that exist; with one class there
is almost nothing to fail. A green run reads as "broadly compliant, proceed" — and that
reading is wrong, even though the lint is behaving to contract.

`bem-lint.py::_ClassExtractor` collects tokens from `class="…"` only — it has no notion of
`style=""`, so 815 styled elements are invisible to it.

**Fix shape:** gate on **class coverage** (what fraction of *styled* elements carry any
class) in addition to conformance of classes present. Below a threshold, fail closed in
both modes with a message naming the real problem. Sibling rule:
`feedback_a_check_with_no_positive_control_passes_against_a_dead_feature` — this is the
same shape, a check that cannot fail against the input it most needs to catch.

## 3. Rendered-DOM probe (the part that changed the conclusion)

Script: `scratchpad/probe-responsive.js` — renders `Ward End Eye Care (offline).html` in
headless Chromium at 1440 / 768 / 375, walks the tree recording a tag+index path per
element plus inline style and computed layout, and diffs across widths.

```
desktop  width=1440  elements=883
tablet   width=768   elements=869
mobile   width=375   elements=893

union of paths     904
present at ALL 3   864  (95.6% of union)
desktop-only       11
mobile-only        16

shared elements               864
inline style differs by width  58
computed layout differs        33
fully identical across widths 806

property breakdown of the 33: padding 18, gridTemplateColumns 8, fontSize 8, display 1
```

**Two findings, but they are HOME-VIEW ONLY — see the correction immediately below
before using either number to size anything:**

1. **Structure is 95.6% stable across widths.** The JS re-render does not rebuild a
   different tree; it re-styles the same one. The DOM is diffable.
2. **The responsive surface is 33 elements.** Mapping those onto SGS device-tier
   attributes (768/1024) is a small job, and the properties involved (padding, grid
   columns, font-size, one display) are all first-class SGS attributes.

### CORRECTION — these figures are not representative of the site (council, sceptic seat)

The sceptic drove the prototype into the other routes with real clicks and re-ran the same
structural diff per view. The home view is the **least complex** view in the app, and the
numbers do not generalise:

| view | union paths | stable across all 3 widths | stability | computed-layout changed |
|---|---|---|---|---|
| home | 904 | 864 | **95.6%** | 33 |
| shop | 1140 | 615 | **53.9%** | 11 (drawer never opened — understates) |
| product | 573 | 533 | 93.0% | 16 |
| bag drawer | 916 | 876 | 95.6% | 33 |
| about | 155 | 115 | 74.2% | 9 |

**The shop view nearly halves the stability figure**, and it does so in the worst possible
place: at ≤1024px the entire left-hand filter column (colour swatches, price slider,
40-brand checklist, style pills) collapses to a single "FILTER" button which opens a
**full-screen modal subtree with no desktop counterpart at all**. That is not a restyle of
a shared tree — it is markup that exists on one tier and not the other, which is precisely
what a tag+index path diff cannot see. The 53.9% therefore *overstates* shop stability.

This matters because the shop view is both the commercially critical page and the one
carrying the biggest new-build items (faceted filter rail, colour swatches). **Any sizing
of the normaliser idea taken from the home-page numbers is wrong.**

### What survived the sceptic's other attacks

- **tag+index path masking silent reordering:** attack did not land. Re-running with a
  content fingerprint (`tag+index+leaf-text`) returns the *identical* 864/904 on the home
  view — 0 tag mismatches, 0 text mismatches.
- **The 375px render not taking the mobile branch:** attack did not land. Measured directly,
  `rootClientWidth === windowInnerWidth` at all three widths with `rootPadding: 0px`
  (`mobilePreview` is hardcoded `false` at line 1806), so `mob = effW < 760` genuinely
  evaluated true at 375. Note for future runs: `mobilePreview` is a real second code path
  a regeneration could flip on — re-check this if the file is regenerated.
- **Scope-token count:** this report said 106 of 540 styled elements carry a scope token;
  an independent count of the same data gave **94**. The `styled=540` and
  `no-class-at-all=425` figures matched exactly, as did "only 1 of the 33 responsive
  elements carries a scope token". The gap is a differing definition of "scope token" and
  does not change any conclusion — but the regex was not stated, so treat 94–106 as the
  range rather than either as exact.

### CORRECTION — "render then scrape is not viable" was wrong

A subagent reported the rendered output carries 1 class, concluding render-then-scrape was
dead. It had grepped the *offline bundle file* (which contains the same un-rendered source),
never rendered it. The actual rendered DOM carries **297 classed elements of 883**.

### CORRECTION — the scope classes are NOT component identity

My own follow-up hypothesis, also wrong. The 22 `scpN` tokens are tag-homogeneous (21/22)
and sibling-repeated, which looked like component-instance identity. It isn't:

- Only **106 of 540 styled elements** carry a scope token; **425 carry no class at all**.
- The groups are almost entirely `<a>` and `<button>` — they are **hover/pseudo-class
  scoping hooks** (a `:hover` rule cannot be inline, so the runtime emits a scope class),
  not semantic component markers.
- **Only 1 of the 33 responsive-changing elements carries a scope token** — so they are
  useless for the responsive mapping specifically.

`sc-interp` (181 uses) is a string-interpolation marker. All of it is runtime plumbing,
semantically equivalent to a styled-components hash.

## 4. Where this lands against the Q1 plan

`.claude/plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md` predicted
this input's convention: *"Claude Artifacts / claude.ai output → hand-rolled semantic
kebab-case → Tier 0/1"*.

**That prediction is wrong.** Claude Design emits classless, inline-styled markup with
opaque runtime scope hooks — the same shape the plan's own table assigns to CSS Modules and
styled-components, marked **"Tier 2 only — no class-string signal exists"**.

Consequence: **Tier 0 (D1034/D1035, shipped 2026-09-11) is inert against this draft.** It
reads `primary_sgs_bem` off a class string; there is no semantic class string to read. The
measurement Tier 0 was shipped to enable cannot be performed on this input.

This is the headline Q1 result, and it arrives without running a clone.

## 5. Block/theme coverage — conservative read

Two subagents disagreed; where they did, the contested claims were checked directly and the
conservative agent was right both times.

| Contested claim | Verdict | Evidence |
|---|---|---|
| `sgs/product-card` covers swatches + rating | **False** | 163 attributes; `swatch`/`rating`/`review`/`brand`/`wordmark`/`overlay` → 0 hits in `product-card/block.json` |
| Checkout is covered | **False** | Spec 30 line 54 puts rebuilding cart/checkout out of scope; FR-30-4 is "styling only" |

84 block directories exist and every named block is real on disk (`google-reviews`,
`whatsapp-cta`, `buybox`, `modal`, `filter-search`, `trust-bar`, `mega-panel`, `nav-drawer`,
`star-rating`, `option-picker`, `cart`, `product-search`). "Block exists" ≠ "surface covered".

**Genuinely new build:** lens configurator (prescription data on a cart line item, carried
through checkout — `sgs-configurator-pro` is a chair configurator on a deliberately
non-WooCommerce stack and cannot be reused); adaptive checkout with prescription capture;
faceted filter rail (10 core WC filter instances assembled, plus colour-swatch circles —
0 hits for "swatch" anywhere); wishlist (0 hits for "wishlist" anywhere); product-card brand
overlay + swatch row + `+N` pill + rating line; Google reviews curated-items mode (block is
live-API-only, Places caps at 5, design needs 13 verbatim); measurement-diagram block; toast.

**Cheap:** kenburns preset row, badge-pop preset row, an amber `warning` palette slug,
Google mini-palette slugs. Motion is **entirely Tier V** — nothing needs GSAP, WebGL or any
banned technique; parallax already has a row.

**Decisions for Bean (shared-mechanism → Rule 7 design-gate):**
- Draft reveals are **900ms**; all 13 seeded entrance presets are **300ms** with zero
  variance. Deviate or conform?
- Taupe/sage/navy as a swappable palette **set** — `theme-snapshot.json` is a single flat
  palette; WP style variations do this natively but `theme/sgs-theme/styles/` is
  deliberately empty by project convention.
- Draft's manual `data-rm="1"` reduce-motion toggle has no SGS equivalent (OS media query
  only).
- Draft breaks at **760**; SGS device tier is **768**.

## 6. Council findings — the format itself

Four adversarial seats (sceptic, pipeline architect, pragmatist, durability) reviewed the
above. Their load-bearing additions:

**There is no cleaner export.** Claude Design's export menu offers ZIP, PDF, PPTX,
Standalone HTML, Canva and third-party handoffs. The "Standalone HTML" is the 3.2MB
`(offline).html` in this bundle — not flattened markup, but the same DSL plus runtime
packaged for offline use (`<script type="__bundler/manifest">`, a `__bundler/template`
holding the escaped `<x-dc>` string, fonts as UUID blobs). **There is no HTML/CSS or React
export tier that avoids this problem.** Ruled out by inspection, not assumption.

**The source DSL carries the semantic identity the rendered DOM destroys.** This is the
single most important thing the static analysis in §1 missed — it counted classes in the
source and classes in the render, and concluded identity was absent. Identity was never
going to be in classes. Verified counts in `Eye Care Birmingham.dc.html`:

- **87 `sc-if` tags** ⛔ **CORRECTED 2026-09-14** — this line originally said "48"; a QC
  pass building D1057/D1058 re-verified directly (`grep -o '<sc-if\b'`, open/close tag
  counts agree, 87=87) and found the original figure simply wrong, not a different counting
  method. Includes all ten routes (`isHome`, `isShop`, `isProduct`, `isLenses`, `isAbout`,
  `isHelp`, `isContact`, `isCheckout`, `isDone`, `isDelivery`), component states (`megaSun`,
  `lensOpen`, `bagEmpty`, `tabDesc`, `rxUpload`), and — critically — **the named responsive
  branches themselves** (`navFull`/`navCompact`, `filtersFull`/`drawerFilters`,
  `lensStacked`/`lensNotStacked`).
- **39 `sc-for` tags** ⛔ **CORRECTED 2026-09-14** (was "35", same re-verification) —
  `featured`, `results`, `filterGroups`, `reviews`, `pdpReviews`, `faqs`, `shapeTiles`,
  `reasons`, `bagItems`, `specs`, `sizes`, `thumbs`, `megaTopBrands`, `ticker`,
  `assurances`, `related`, `sameBrand` …

Most map directly onto known SGS concepts. This collapses the identity problem from ~880
elements to a few dozen named groups.

**The format is stable across projects and time — additive, but uncontracted.** Compared
against the two other Claude Design outputs in this repo (`sites/Mega-menu design/`,
`sites/Indus Foods Mega Menu Design/`, both dated 2026-07-24, ~7 weeks earlier, different
client, different design problem):

| | Ward End (14 Sep) | Mega Menu (24 Jul) | Indus Mega Menu (24 Jul) |
|---|---|---|---|
| `sc-for` / `sc-if` | 39 / 87 (corrected 2026-09-14, was 35/48) | 14 / 20 | 18 / 32 |
| `class="` | 1 | 0 | 0 |
| `style="` | 815 | 77 | 107 |

Identical convention. The runtime itself did change (`support.js` 66,404 → 69,150 bytes,
+3 functions, **0 removed**) but the tokens a normaliser would key on (`x-dc`, `sc-for`,
`sc-if`, `sc-interp`) are **byte-identical across both builds**. `support.js` line 1:
`// GENERATED from dc-runtime/src/*.ts — do not edit.` — an unversioned internal build
artefact with no changelog, so there is no signal to detect a future break.

Caveat: the July names are more generic (`items`, `activePanel.links`, `col.links`) than
September's. Name *quality* tracks design complexity. Names are reliably semantic, not
reliably specific.

**`scpN` scope tokens are provably unstable — never key on them.** Read from
`support.js::createPseudoSheet`: a de-dup cache keyed on `pseudo + "|" + css`, minting
`"scp" + (n++).toString(36)` on first encounter **per render pass**. Consequences: the
tokens are insertion-order dependent, so any edit that adds or reorders an element ahead of
a scoped one shifts every subsequent value; and because the cache is per-pass, they are not
reliably comparable even between the three width renders of a single probe run. The §3
correction already established they are hover/pseudo-class hooks rather than identity; this
is the mechanism proving it.

## 6a. What the pipeline actually delivers on a BEM draft (Bean-corrected 2026-09-14)

**The pipeline produces an exact visual copy.** Mama's Munches — the canary, a BEM-compliant
draft — clones to a visually exact homepage outside the separately-cloned header/footer, with
a few known, deliberate exceptions: hover effects added because the draft had none, and the
testimonial row upgraded from three static cards to a slider. Those are the theme *improving*
on the draft, not fidelity loss.

⛔ **Do not cite the computed-parity aggregate (LAYOUT 75% etc.) as evidence the pipeline is
low-fidelity.** That inverts R-31-4 (aggregate scores are per-commit diagnostics, NEVER the
closing gate) and R-31-13 (Bean's eye is co-authoritative), and contradicts `LEDGER.md`'s own
note that the tool "scored clean on real defects and flagged several that render correctly".
The number measures the ruler, not the clone. This report's first draft made exactly that
error in conversation; it is recorded here so it is not repeated.

**Consequence for this decision:** the payoff at the end of a successful BEM conversion is a
faithful clone, not an approximation. That materially raises the value of any work that gets a
Claude Design draft into BEM form, and removes "cloning isn't good enough" from the option
analysis entirely. The remaining question is only *how* the draft reaches BEM form — not
whether it is worth getting there.

## 7. Recommended mechanism — BUILT 2026-09-14 (D1057/D1058), corrected below

**Status update, 2026-09-14: this section's recommendation was acted on the same day it was
written.** Both pieces shipped — `recogniser/sc_var_classifier.py` (identity, D1057, commit
`093af7329`) and `orchestrator/draft-responsive-probe.js` (values, D1058, commit
`5afc455ee`). One claim below turned out to be **wrong in a load-bearing way** and is
corrected inline rather than silently left for a future reader to trust.

- **Render supplies values; source names supply identity; `scpN` supplies nothing.** Still
  correct, and now built as two SEPARATE tools rather than one combined pass — see the
  correction below for why they can't be one pass.
- **This is not a Rule 3 carve-out, and there is a precedent that settles it.**
  `lingua_franca.py` already *is* a per-vendor convention table (Bootstrap 5, Tailwind,
  shadcn/Radix, kebab-semantic, bare BEM). Rule 3 forbids per-case exceptions *to a
  mechanism*; a convention table is the mechanism. Still correct — though in the event,
  `sc_var_classifier.py` shipped as its own advisory module (mirroring `dom_shape_
  classifier.py`'s Tier 2 shape) rather than literally as a new `RULES` entry in
  `lingua_franca.py`, since its signal (an ancestor wrapper's variable name, capped-low
  confidence, DB-read-only) doesn't fit that table's per-class-token contract.
- ⛔ **CORRECTED (was wrong): "`sc-for`/`sc-if` is the identical shape [as `data-slot`]."**
  It is not, in a way that matters beyond the ancestor-vs-attribute difference already known
  when this was written. Verified live building D1058: `data-slot` is a same-element
  attribute that survives into the rendered DOM (it's real output HTML); `<sc-for>`/`<sc-if>`
  are TEMPLATE DIRECTIVES that the runtime fully materialises away — **zero custom-element
  tags of any kind survive rendering** (measured: 39 `sc-for` + 87 `sc-if` in the source
  `.dc.html`, 0 of either in the rendered DOM). Consequence: identity (Piece 1) and values
  (Piece 2) are NOT readable from the same DOM at all — Piece 1 reads the SOURCE file via
  BeautifulSoup; Piece 2 reads the RENDERED page via Playwright. Correlating one to the
  other is real, separate, unbuilt work (see D1058's "still open" note) — not "one build
  serves both" as this section originally claimed.
- **Never parse `support.js` internals.** Held — both shipped tools read two attribute
  patterns from `.dc.html` (Piece 1) or rendered DOM only (Piece 2); neither touches the
  runtime's own JS source.

## 8. Open risks

- ~~Scope-token stability unverified~~ — **RESOLVED, §6**: provably unstable, from the
  minting algorithm. Nothing should key on them.
- ~~Probe covers the home view only~~ — **RESOLVED, §3 correction**: other views measured;
  shop view nearly halves structural stability and adds a mobile-only modal subtree.
- **Route coverage remains the biggest practical risk for any render-based tool — STILL
  UNSOLVED, confirmed again 2026-09-14 building D1058.** `draft-responsive-probe.js`
  deliberately scopes to ONE already-loaded route per run; driving every interaction state
  (mega-menus, filter drawer, lens modal, bag, size guide) to reach the other nine routes is
  named in its own module docstring as explicitly out of scope, not silently assumed away.
- Q2 Tier 1 (repeated-sibling detection, shipped D1037) keys partly on "near-identical class
  signature". With 425 styled elements carrying no class, every such element has an
  identical (empty) signature — whether that makes the detector fire too eagerly or not at
  all is untested against this input. **Still untested** — D1057/D1058 did not touch Q2
  Tier 1; not resolved by this session's work.
- ~~`mobilePreview` is a second code path hardcoded `false`~~ — **RE-VERIFIED LIVE,
  2026-09-14, still `false`.** Both D1057 and D1058 re-checked the real draft directly before
  building rather than trusting this report's earlier snapshot; `draft-responsive-probe.js`
  also carries this as a RUNTIME check (fails loudly if `rootClientWidth !==
  windowInnerWidth` on any future regenerated draft, not just a one-off manual re-check).
- Name quality degrades on simpler designs (July drafts used `items`, `col.links`). An
  identity mapping built on `sc-for` names needs context, not a lookup table. **Partially
  addressed by D1057**: cross-draft GitHub research confirmed generic names (`reasons`/
  `featured`/`ticker`/`marquee`) DO recur reliably; compound/prefixed names (`megaTopBrands`)
  don't and are correctly left to the count-based Tier A fallback or an unbuilt Tier B model
  pass — not force-matched against a static table.
- **NEW (2026-09-14, D1058): `<sc-for>`/`<sc-if>` do not survive rendering at all** (0 of
  either tag found in the real draft's rendered DOM; verified live). This means Piece 1
  (source-side identity) and Piece 2 (rendered-side values) read two DIFFERENT DOMs, and
  correlating a Piece 2 measurement back to a Piece 1 boundary is real, separate, unbuilt
  work — not the "one build serves both" shape §7 originally claimed (corrected above).
