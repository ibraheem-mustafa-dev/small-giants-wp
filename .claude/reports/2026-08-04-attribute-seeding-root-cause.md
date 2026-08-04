---
doc_type: report
title: Attribute-seeding root cause — role / canonical_slot / css_property / css_tier / emit_shape / derived_selector
date: 2026-08-04
status: investigation complete, no code/DB changes made
---

# Attribute-seeding root cause

**Method note:** all queries ran against a COPY of `sgs-framework.db`
(`C:\Users\Bean\AppData\Local\Temp\claude\...\scratchpad\sgs-framework-copy.db`,
taken 2026-08-04 00:14) — the live DB was never written. The DB is shared with
other active tracks this session (`legacy-attr-purge`, `team-member-attrs`,
`drop-legacy-table` etc.), so some counts below **differ from the brief's
numbers** because the brief was written against an earlier snapshot. Where
that happened I say so explicitly rather than silently reconciling.

---

## 1. Bean's hypothesis — VERDICT: FALSE, proven against the actual code path

**Hypothesis:** the new attribute (`memberMedia`, `splitMedia`, `decorMedia`…)
fails to seed because the OLD attribute (`photo`, `splitImage`, `imageUrl`)
already occupies the slot, and deleting the old row would free it up.

**Verdict: false.** `canonical_slot` resolution is a pure name→dictionary
lookup with **no notion of "occupied."** It never looks at what other rows
exist for the block. Proof, run against the live seeder code
(`assign-canonical.py`) and a copy of the DB:

```
memberMedia     stem='memberMedia'    canonical_slot=None   via=NONE
decorMedia      stem='decorMedia'     canonical_slot=None   via=NONE
splitMedia      stem='splitMedia'     canonical_slot=None   via=NONE
photo           stem='photo'          canonical_slot='media' via=tier0-full
splitImage      stem='split'          canonical_slot='media' via=tier0-full
backgroundMedia stem='backgroundMedia' canonical_slot='backgroundMedia' via=tier0-full
```

The mechanism (`assign-canonical.py:264-276` `resolve_canonical_slot`, called
from `run()` at `assign-canonical.py:694-697`) does two lookups against a
plain `dict` built once at start of run from the `slots` table
(`load_slot_aliases`, `assign-canonical.py:67-114`):

1. Tier 0 — is the **full** attr name itself a `slots.slot_name` or an entry
   in that slot's `aliases` JSON array?
2. Tier 1 — same lookup against the **stem** left after peeling one property
   suffix + modifiers.

`photo` resolves because `"photo"` is literally listed in the `media` slot's
alias array (`sgs-framework.db` → `slots` row `slot_name='media'`, verified
`aliases` column contains `"photo"`, `"splitimage"`). `memberMedia` /
`decorMedia` / `splitMedia` are **not present in any slot's alias list at
all** — not in `media`, not in `backgroundMedia`, not anywhere. This is
independent of whether `photo` exists as a row: deleting `photo` from
`block_attributes` does not remove `"photo"` from the `slots.aliases` JSON
(a completely separate table), so the alias dictionary the lookup consults is
unchanged either way.

**What this means for the fix Bean proposed:** deleting the legacy attribute
and re-running `/sgs-update` would **not** populate the current attribute. It
would only remove the legacy row from the gap — `memberMedia` etc. would stay
NULL, exactly as today, and (if `photo` had been the block's only working
canonical-slot row) would likely make things *worse*, not better, because the
walker/converter would lose the one working alias-mapped attr and gain
nothing. Confirmed structurally at `assign-canonical.py:696-710`: the `else`
branch that runs when `canonical_slot is None` inserts a
`attribute_gap_candidates` row and moves on — it never re-checks sibling
rows.

**The real fix shape** (not executed — read-only investigation): add
`"memberMedia"`, `"decorMedia"`, `"splitMedia"` etc. to the relevant slot's
`aliases` JSON array in the `slots` table (or, better — see §3 — replace the
alias-list approach with something the block itself declares). This is a
**data-only** fix (one UPDATE per missing alias), not a code fix, and not
predicated on deleting anything.

**Note on `sgs/cta-section` — not the same shape.** `backgroundMedia` on
`cta-section` **already has `canonical_slot='backgroundMedia'` populated**
(it resolves via Tier 0 because `backgroundMedia` is itself a registered
`slot_name`, not just an alias) — but its `role` is NULL while the legacy
`backgroundImage` sibling has `role='image-object'`. This is a *different*
column failing for a *different* reason (see §2) — worth flagging because it
would be wrongly folded into "the same collision bug" otherwise.

---

## 2. `role` — root cause: writing `role` is gated behind `canonical_slot`
resolving, and there is no "root-level, no sub-element" slot

**This is the single highest-leverage finding in this investigation** — it
explains the 106/113-colour-attr defect directly, independent of §1.

Trace `assign-canonical.py` `run()`, lines 671-748: for every row, `role` is
computed correctly from `property_suffixes` (`prop_info["role"]`,
line 712-717) **regardless of whether `canonical_slot` resolves**. But the
computed `role` is only ever written to the DB inside the
`if canonical_slot is not None:` branch (line 719-741). If `canonical_slot`
stays `None`, the row falls into the `else` branch (line 742-747) —
`attribute_gap_candidates` insert only — and the already-correctly-derived
`role` is **thrown away**, never reaching the `UPDATE` batch at line 750-760.

Proof, run against the live decomposition functions:

```
borderColourHover      stem=''  prop_suffix='BorderColour'     info={'role': 'color', 'css_property': 'border-color'}  canonical_slot=None
backgroundColourHover  stem=''  prop_suffix='BackgroundColour' info={'role': 'color', 'css_property': 'background-color'} canonical_slot=None
textColourHover        stem=''  prop_suffix='TextColour'       info={'role': 'color', 'css_property': 'color'}          canonical_slot=None
asideBorderColour      stem='aside' prop_suffix='BorderColour' info={'role': 'color', 'css_property': 'border-color'}   canonical_slot=None
colourBorder           stem='colourBorder' prop_suffix=None    info=None (UK-order name — not decomposed at all)        canonical_slot=None
```

In every case `role='color'` was **correctly computed** and then discarded.
Compare with `borderColor` (no `Hover` suffix): its stem is *also* empty
after the property-suffix peel, but its **full name** happens to match the
`border` slot in `slots.slot_name`/`aliases` via the Tier-0 pre-peel check —
so it accidentally survives. That's not because the mechanism is designed to
handle root-level colour attrs; it's a coincidence of one specific attr name
matching an unrelated slot alias.

**Why the stem is empty for these:** attributes like `borderColourHover`,
`backgroundColourHover`, `textColourHover` target the **block's own root
wrapper**, not a named sub-element. After peeling the state modifier
(`Hover`) and the property suffix (`BorderColour`), there is nothing left —
correctly, because there IS no element word; the CSS property applies to
the block root. But `resolve_canonical_slot("")` never matches anything, and
the `slots` table has **no "self"/"root" slot** to catch this case. The
seeder treats "no element word" as "unresolved," when for root-scoped colour
props it should mean "this targets the block's own root — role is
sufficient, no selector element needed."

This is a **structural** bug, not a vocabulary gap: no amount of adding
aliases to the `slots` table fixes it, because the failure is the *coupling*
of two independent facts (role vs. element target) behind one gate. Classify
this as an **implementation bug** (per project methodology's layer-1 gate),
not a spec/plan gap — Spec 31 §5.1/§5.2 describes role and canonical_slot as
two separate resolutions; nothing in the spec requires role to depend on slot
resolution succeeding.

**Live-DB count (verified against the copy, 2026-08-04):**
- 113 `sgs/*` rows with `role IS NULL` and a colour-ish attr name (case-insensitive `color`/`colour`).
- Denominator: 846 total `sgs/*` rows with a populated `role` at all (per the healing-guard docstring, `assign-canonical.py:455-461`) — so this represents roughly a further 12% on top of what's already correctly seeded, concentrated almost entirely on `*Hover` and bare `border/background/text` colour attrs.
- The brief's "106 colour attrs across 34 blocks" and my "113 across sgs/* today" are close but not identical — plausible drift from concurrent-track edits to this shared DB during the session; both counts describe the same defect class.

**Fix shape (not executed):** decouple `role` writing from `canonical_slot`
resolution — write `role` whenever `prop_info` resolves, independent of
whether a `canonical_slot` was found. For rows where the stem is empty (no
element word after peeling), that's the correct, complete outcome:
`role='color'`, `canonical_slot=NULL` (root-scoped, no sub-element — which
is semantically true), `derived_selector` = the block's own root selector
(not `.sgs-<block>__<slot>`, since there is no slot).

---

## 3. Deterministic signals already present in block files — ranked

Bean's central question. Evaluated against the live code.

### Rank 1 — `render.php`'s actual CSS emission (already built, already the
Task-A extractor's design; the gap is coverage, not the concept)

`extract-signatures.py::extract_css_property_and_layer` (line 1719) already
does exactly this for `css_property`/`css_layer`/`css_element`/`css_state`/
`css_tier`: it parses each block's own `render.php` + `style.css` and derives
the real CSS property a given attribute feeds, by tracing `--sgs-*` custom
property chains and direct string concatenation. This is the most
deterministic signal available — it measures what the block **actually
does**, not what its name implies. It is unambiguous wherever it resolves.

**Where it currently fails, proven:** two distinct blind spots, both
"shared-helper invisibility," not signal weakness:

**(a) A second, unregistered shared PHP helper.** `_HELPER_SUFFIX_PROPS`
(`extract-signatures.py:1174-1207`) hardcodes exactly two recognised helper
function names: `sgs_button_element_style_css` and `sgs_typography_css_rule`.
A third, widely-used helper, `sgs_responsive_css_rule()` — which emits
`font-size`/`line-height`/etc. at base+tablet+mobile tiers on the SAME
selector via an array-of-arrays call shape (`heading/render.php:406-419`) —
is **not in that allowlist and has a different call signature the regex
(`_HELPER_CALL_RE`, line 1209-1214) can't match anyway.** Confirmed by grep:
8 blocks call `sgs_responsive_css_rule` (`before-after`, `button`, `heading`,
`label`, `quote`, `responsive-logo`, `separator`, `text`); this is exactly
why `sgs/heading.fontSizeTablet`/`fontSizeMobile` are absent from
`css-property-classifications.json` while `sgs/collapsible-text` (which
calls the *registered* `sgs_typography_css_rule`) has full base+tablet+mobile
coverage for the same conceptual attribute.

**(b) Grid/gap/padding tiers emitted by a shared PHP CLASS, not the block's
own render.php.** `sgs/accordion`'s `gridTemplateColumnsTablet`/`gapTablet`
etc. are emitted inside `SGS_Container_Wrapper::render()`
(`accordion/render.php:174`, confirmed by grep) — a shared class method in a
different file the per-block scanner never opens. `_attr_to_raw_props_php`
only ever reads the block's OWN `render.php` text
(`extract-signatures.py:1824-1826`); it has no path into the wrapper class at
all. This is a **scan-scope** bug, distinct from (a).

**Quantified, against the live DB copy:**
- 453 `sgs/*` rows total with `attr_name` ending `Mobile`/`Tablet` and `css_property IS NULL`.
- Of those, exactly **145** are true tier-sibling gaps (the base attr, e.g. `fontSize`, HAS `css_property` populated; the `Mobile`/`Tablet` sibling does not) — this exact figure matches the brief's "145 tier-sibling rows" claim precisely, confirmed by direct query.
- Registering `sgs_responsive_css_rule` (extending `_HELPER_SUFFIX_PROPS`/`_HELPER_CALL_RE` to parse its array-literal call shape) would resolve the typography subset — a meaningful chunk of the 145 (button/heading/label/text/quote/before-after/responsive-logo/separator all use it) — but requires writing a new parser branch, not a one-line dict entry, because the call shape differs from the two existing helpers.
- The grid/gap tier gaps (accordion, container, cta-section, trust-bar, hero, site-header/footer — the largest single contributors in the 453-row superset) require either (i) teaching the extractor to also scan `includes/class-sgs-container-wrapper.php` (a second, harder scan target — the wrapper builds selectors dynamically per block, so the block-name association isn't as simple as "this file belongs to this block"), or (ii) an explicit per-block override in `ATTR_CLASSIFICATION_OVERRIDES` (already the sanctioned final-writer channel, `sgs-update-v2.py` Stage 1C) — the safer near-term path since it needs no new parsing.

### Rank 2 — an inline `"role"` key in `block.json` — CURRENTLY DEAD, unused
by anything in the live seeding path

`sgs/media`'s content attributes DO declare `"role": "content"` inline in
`block.json` (verified, 5 occurrences at lines 118/175/180/298/323).
**Nothing in the live pipeline reads it.** Grepped every seeder file
(`assign-canonical.py`, `extract-signatures.py`, `sgs-update-v2.py`) for a
read of that key — the only script that reads a JSON `role` key at all is
`backfill-from-json-catalogue.py`, which reads a **different** JSON file
entirely (a retired fingerprint-builder catalogue at
`.claude/scratch/retired-by-spec-15-p3/...`, not `block.json`), and that
script is **not called from `sgs-update-v2.py`'s Stage 1 tail-step list**
(confirmed against the full grep of `Stage 1 tail` invocations in
`sgs-update-v2.py`) — it is a one-shot, no-longer-wired migration helper.

**Scale:** 48 of the ~90+ `sgs/*` block.json files carry at least one inline
`"role"` key; roughly 124 attribute rows across the roster declare one. This
is a real, already-authored, per-attribute, hand-curated signal sitting
completely unused. It ranks below Rank 1 on determinism (it's declared by a
human at block-authoring time, not measured from what the block actually
renders — so it can drift from reality the way any hand-authored metadata
can), but it is trivial to wire up (a straight JSON read, no parsing), covers
attrs the emission scanner may never reach (SVG/video/non-CSS-property
content attrs like `sgs/media.svgContent`), and is a strong **corroborating**
signal to cross-check Rank-1 emission results against.

### Rank 3 — `supports.sgs.*` block.json declarations

Already the live channel for `containerKind` (composite-mirror rule),
`imageControls`, `presetSelectors`, `boxFamilies`, `variants`. Deterministic
and already wired for those specific concerns, but does not cover
role/canonical_slot/css_property directly today — it's a container for
capability flags, not a per-attribute classification map. Not directly
applicable to the columns under investigation without extending its schema,
which is a bigger design decision than this report's scope.

### Rank 4 — the BEM classes `render.php` actually emits

This is exactly what Tier B of `assign-canonical.py` already does (lines
906-1201, `run_tier_b_dry_run`/`run_tier_b_apply`) — extract the
`.sgs-<block>__<element>` fragment from an already-known `derived_selector`
and map the `<element>` word through the alias dictionary. **Guardrailed by
construction** to only ever touch rows where `canonical_slot IS NULL AND
derived_selector IS NOT NULL` (the 1,142 triple-NULL rows are structurally
unreachable — line 913-917). Useful, but it is downstream of `derived_selector`
already existing, so it doesn't help the empty-stem colour-role rows in §2
(their `derived_selector` is also NULL) or the missing-alias rows in §1
(same reason).

### Rank 5 — `render.php`'s actual attribute reads (which attr feeds which
element)

This is exactly what `emit_shape`'s seeder (`sgs-update-v2.py` Stage 1D,
line 2161-2267) already does via `render_reads_attr()` — deterministic,
source-grounded, and already live. Ranked lowest of the five only because it
answers a narrower question (nested-in-own-markup vs. lives-in-InnerBlocks
`$content`) than the others, not because it's less reliable.

**Ranking summary (most to least deterministic, unambiguous-for-every-block first):**
1. Actual CSS emission from render.php + style.css (Rank 1) — already built, coverage gap only.
2. render.php's actual attribute reads (Rank 5, `emit_shape`) — already built and live, narrowest scope.
3. BEM classes render.php emits, via `derived_selector` (Rank 4, Tier B) — already built, structurally scoped to a subset.
4. Inline `"role"` block.json key (Rank 2) — exists, unused, cheap to wire, but hand-authored not measured.
5. `supports.sgs.*` (Rank 3) — deterministic but wrong shape for per-attribute classification without a schema extension.

---

## 4. `derived_selector` — synthesised, not measured; where it would and
would not work if switched to a render.php-derived signal

Confirmed: `derive_selector()` (`assign-canonical.py:377-385`) is a pure
string formula — `.sgs-<block-short-slug>__<canonical_slot>` — built from
the resolved `canonical_slot` name, never from anything render.php actually
outputs. This is why `.sgs-media__media` exists as a selector `sgs/media`
never renders: `canonical_slot='media'` on a block whose own short slug is
also `media` produces the doubled `__media` fragment mechanically, with no
check against real markup.

**Could it be derived from render.php instead?** Partially, and the fraction
is bounded by the SAME two blind spots as §3 Rank 1:

- For blocks whose element-scoped CSS lives entirely in their OWN
  `render.php`/`style.css` (the majority — Task A's `resolved_bem_element`
  mechanism, `extract-signatures.py:1836-1884`, already extracts the real
  BEM element a declaration sits under from CSS-file scanning, and a PHP
  string-concatenation variant for cases like `sgs/hero`'s
  `mediaBackground`/`backgroundOverlayColour`, lines 1253-1271) — a
  render.php-derived selector would be **strictly more accurate** than the
  formula, because it reflects what's actually painted, not what the slot
  name implies.
- **Would NOT work** for: (a) any block using `SGS_Container_Wrapper::render()`
  or another shared class to build selectors dynamically (same class as the
  accordion grid-tier gap in §3) — the selector text doesn't live in the
  block's own file at all; (b) attrs with no element word (§2's empty-stem
  colour attrs) — there's no BEM fragment to extract because the CSS targets
  the block root, not a sub-element; (c) blocks with no `style.css` at all
  (confirmed to exist — `sgs/form-field-tiles`, `sgs/form-step`, per the
  2026-08-01 fix comment at `extract-signatures.py:1809-1815`) — nothing to
  scan.

**Quantify:** I did not have budget this session to run the Task-A scanner
end-to-end and count exact resolved-vs-unresolved selector fractions across
the full `sgs/*` roster (that would require executing
`extract_css_property_and_layer()`, which is a multi-minute scan over every
block directory — out of scope for a read-only investigation without
altering pipeline-state). What's provable without running it: `derived_selector`
is currently populated on the majority of rows already (via the existing
formula), and the render.php-measured alternative would be strictly better
information wherever Task A already resolves a BEM element for that
`(block, attr)` pair — a straightforward cross-reference of two already-
existing datasets (`resolved_bem_element` output vs.
`block_attributes.derived_selector`), not a new extraction mechanism. That
cross-reference is the correct next investigation step, not a code change to
make blind.

---

## 5. Denominator discipline — what "eligible" means per column

Per the project's own logged mistake
(`establish-the-denominator-before-quoting-a-percentage`), every rate below
is quoted against the population that can *legitimately* carry the value —
not "all rows."

| Column | Eligible denominator | Populated | Gap | Notes |
|---|---|---|---|---|
| `role` | rows where `property_suffixes` OR `slots` resolves a role for the attr's suffix/full-name — i.e. rows with a real property or content signal, NOT purely structural/enum attrs (e.g. `photoShape`, `colourMode`) which correctly have no role | 846 rows (`sgs/*`, per the healing-guard's own audited count) | 113 colour-ish rows confirmed NULL that SHOULD resolve (§2) | The 113 is not "role starved" system-wide; it's a specific, provable defect class (root-scoped colour props), not evidence the column is broadly under-seeded |
| `canonical_slot` | rows targeting a NAMED sub-element (content-bearing OR element-scoped styling attrs) — root-scoped block-level attrs have NO eligible canonical_slot by definition (§2) | majority of `sgs/*` rows | ~1,142 triple-NULL rows exist per the Tier-B guardrail comment (`assign-canonical.py:28`), plus the alias-list gaps in §1 | Do not divide 1,142 by "all rows" — a large share of that 1,142 may be root-scoped attrs that structurally have no canonical_slot (same shape as §2), not missing vocabulary |
| `css_property`/`css_tier` | rows with `role` in the content/styling classes AND a real CSS-property-bearing purpose (excludes unit attrs, enums, booleans — Bean's own 2026-07-21 ruling, `extract-signatures.py:1749-1771`) | 145 confirmed tier-sibling gaps out of 453 raw NULL-tier rows in the wider `sgs/*` set (§3) | 145 (proven), not 453 (raw superset includes rows whose BASE also has no css_property, which is a different, likely-legitimate-gap population) | The 453 vs 145 distinction matters: quoting 453 as "the gap" would double-count blocks that never had a base resolved either |
| `emit_shape` | rows with `role` in the content-bearing set (`roles.classification='content-bearing'`) — the seeder's own filter (`sgs-update-v2.py:2212-2216`) | verified live: `sgs/media`'s 6 content attrs are **already fully seeded** (`emit_shape='nested'` on all six) — this part of the brief is now STALE against the live DB | 8 `sgs/*` rows currently NULL, ALL on `sgs/form-field-*` blocks' `label` attr (address/email/file/number/phone/select/text/textarea) | See §6 caveat — the brief's `sgs/media` claim does not match the current DB state; the `sgs/form-field-*.label` gap is the real current instance of this defect shape and was not investigated in depth (budget) |
| `derived_selector` | same denominator as `canonical_slot` (formula requires `canonical_slot` to exist) | tied to canonical_slot population | not separately quantifiable without also fixing §1/§2 first | `derived_selector` cannot out-populate `canonical_slot` under the current formula — fixing the coupling in §2 would ALSO fix a slice of `derived_selector` for the empty-stem rows, if a root-selector fallback is added |

---

## 6. Caveat — the DB moved under this investigation

Two of the brief's specific claims are **not what the live DB shows today**:

- **`sgs/media` emit_shape:** the brief says all six content attrs are NULL.
  Verified live: all six (`imageUrl`, `imageAlt`, `caption`, `linkUrl`,
  `videoUrl`, `videoPoster`) already carry `emit_shape='nested'`. This was
  evidently fixed by another track during this session (the DB is shared
  with `team-member-attrs`, `legacy-attr-purge`, `drop-legacy-table` and
  others per the session's active-agent list). The "8 unseeded content rows
  in the whole DB" figure the brief cites is **still 8** in the live copy,
  but they are now all `sgs/form-field-*.label` rows, not `sgs/media`'s.
- **`sgs/team-member` role/border/live-defect claim** ("hero and brand
  buttons render with no border on client sites") was not independently
  re-verified on a live page this session — that verification step (opening
  the real homepage per this project's Rule 5, R-31-11) is outside a
  read-only-DB investigation and should be the first check before any fix
  ships for §2.

Neither caveat changes the root-cause findings in §1/§2/§3 — both are
independently reproduced against live code, not just DB row counts.

---

## 7. Sequenced remediation plan (what must be PROVEN before each step —
no step below was executed)

1. **Prove the live visual defect first.** Before touching §2's role-gating
   bug, open the actual hero/brand-button pages on the canary and confirm
   the "no border" symptom is currently present and traces to the specific
   `var(--primary)`-passthrough mechanism the brief describes (R-31-11 — live
   DOM/computed-style, not the DB alone). This is cheap (a few Playwright
   checks) and the ONLY thing that turns §2 from "a proven code defect" into
   "a proven live-site defect" — the project's own rule 4a warns against
   closing on a DB read alone.
2. **Fix §2 (role/canonical_slot decoupling)** — the highest-leverage,
   cleanest fix: write `role` independently of `canonical_slot` resolution
   in `assign-canonical.py`'s main loop (lines 719-747). Requires deciding
   what `canonical_slot`/`derived_selector` should be for a root-scoped
   colour attr (NULL is semantically correct; a `derived_selector` fallback
   to the block's own root selector is a separate, smaller design decision —
   flag for Bean's sign-off since it touches the walker's selector contract,
   design-gate rule 7).
3. **Fix §1 (alias-list gaps)** — pure data fix: add the missing aliases
   (`memberMedia`, `decorMedia`, `splitMedia` and any others the same shape
   surfaces on a full audit) to the `slots` table. Do this AFTER step 2 is
   proven, not before — mixing a code-behaviour change and a data patch in
   one pass makes it harder to attribute which fix caused which DB delta.
4. **Register `sgs_responsive_css_rule` in the Task-A extractor** (§3 Rank 1a)
   — a genuine new parser branch (different call shape from the two existing
   helpers), not a one-line dict add. Estimate this properly once someone
   reads the array-literal call sites across all 8 using blocks; do not
   assume it's trivial just because the existing two-helper dict pattern
   looks like one.
5. **Grid/gap tier gaps (§3 Rank 1b)** — recommend the `ATTR_CLASSIFICATION_OVERRIDES`
   per-block-override path over extending the scanner into
   `SGS_Container_Wrapper::render()`, because the override channel already
   exists, is already the sanctioned final-writer (Stage 1C), and avoids
   building a second, harder cross-file scan for a class that constructs
   selectors dynamically per call site rather than declaratively.
6. **Wire the inline block.json `"role"` key as a corroborating signal**
   (§3 Rank 2) — lowest-risk, highest-corroboration-value addition: read it
   alongside the Task-A emission result and WARN (never silently override)
   on disagreement — surfaces drift between what a human declared and what
   the block actually renders, which is valuable independent of anything
   else in this plan.
7. **`sgs/form-field-*.label` emit_shape gap** — not investigated in depth
   this session (budget). Before fixing, first determine whether these 8
   rows hit the FAIL-LOUD "suspect" branch (`sgs-update-v2.py:2228-2239`,
   which prints a WARN and skips the whole block) — if so, the seeder is
   already telling you it can't parse these render paths, and the fix is in
   the render-read scanner, not a value to hand-write.

No step above should be treated as approved to build — this report is
read-only investigation output per the task's own constraints. Steps 2-7 are
proposed fix SHAPES, which per this project's standing rule are hypotheses
requiring their own empirical pre/post measurement (`/qc-council`) before
dispatch, not specs.
