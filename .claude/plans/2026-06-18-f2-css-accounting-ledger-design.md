---
doc_type: spec
project: small-giants-wp
thread: cloning-pipeline
title: "Phase F step F2 — draft-derived CSS Accounting Ledger (input parser)"
created: 2026-06-18
updated: 2026-06-18
version: v2 (adversarial-council-corrected + Bean DB-duplication catch)
status: DESIGN v2 — pending Bean design-gate sign-off
spec_ref: specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §12.2.1 + §12.7 (row F2)
council: adversarial-council 2026-06-18 (6 personas) — synthesis folded in below (§10)
binding_rules: R-22-1 (DB-first / no hardcoded dicts), R-22-6 (no inline @media), R-22-8 (schema enumeration), STOP-3 (ledger input is DRAFT-derived not converter-derived), STOP-11 (schema enumeration ≠ usage enumeration)
---

# F2 — the draft-derived CSS Accounting Ledger (input half)

## 0. Plain English (what this is, why it exists)

**What.** A small standalone module that reads each Phase-F test fixture's raw HTML+CSS and records **every CSS declaration the draft contains** into a complete list — *before* the cloning converter touches it. That list is the denominator the whole rebuild is measured against.

**Why.** The legacy converter resolves each property via a DB lookup; properties it cannot place silently vanish — not lifted, not logged, not rendered as a tracked gap. You cannot gate "nothing was silently dropped" if the dropped things were never counted. F2 counts them. It is **MF-1 — the keystone** of the Tier-1 foundation; without it, "no silent drops" is theatre.

**The v2 simplification (Bean's DB catch, 2026-06-18).** F2 does **NOT** decompose shorthands. The DB (`property_suffixes` shorthand+longhand rows + `modifier_suffixes` side/corner vocabulary) already owns box-model shorthand→longhand decomposition; rebuilding it would violate R-22-1, and *sourcing* expansion from that DB would make the ledger circular (STOP-3 — it could only see what the converter already handles). So F2 records **physical declarations exactly as the draft wrote them**, and the guarantee splits cleanly:
- **F2 (this) catches any WHOLE declaration silently dropped** — its job.
- **F3 (render-oracle) catches any PART of a declaration dropped** (e.g. a `background:` shorthand whose image didn't land) — by pixel-diffing the rendered draft vs the rendered clone, the only true test of partial transfer. This is exactly the ledger+oracle split §12.2 designed.

**The one-sentence target.** `declare_input` = a surjective, deterministic set of every physical `(selector, property, value, media)` declaration in a draft, captured by an INDEPENDENT raw-HTML+tinycss2 parse at Stage 0.7 before any routing, so the F5 gate can compute `UNACCOUNTED = draft_decls − (transferred ∪ excluded-with-reason ∪ gap)` and hard-fail on any remainder.

## 1. Scope — what F2 IS and is NOT

**F2 IS** (this design):
- The **input half** of the ledger: parse a draft's raw HTML+CSS → the complete physical `declare_input` set.
- A standalone, independently-tested module producing per-fixture + aggregate ledger artefacts.
- Run against the Phase-F fixture corpus (`tests/fixtures/phase-f/`) **and** the referenced standard-shape `tests/fixtures/conformance/*.html`.

**F2 IS NOT** (later Phase-F steps — do not build here):
- Any shorthand expansion / value-decomposition — **removed in v2** (DB owns decomposition; partial-lifts are F3's job).
- The **fate half** (`declare_fate`: transferred / excluded / gap) — instrumented into the converter terminals, joined by the F5 gate.
- The `UNACCOUNTED` computation + the build-failing gate — **F5**.
- The render-diff / LANDED oracle that catches partial-shorthand drops — **F3**.
- The `excluded_properties` DB table — **F4**. F2 tags ONLY structural at-rules as excluded-candidate (deterministic); it makes NO guess about WP-native-handled properties (that is F4's authoritative call).
- Wiring into the live page-8 Stage 0.7 extract — later. F2 is fixture-scoped first (§12.7 F2 done-when), but its function signature takes raw HTML so the live wiring is the same code (§4).

**Independence is the whole point (STOP-3).** F2 must NOT import or transitively reach `css_router.py`, `convert.py`, `db_lookup.py`, OR query `property_suffixes`/`block_attributes`. A ledger fed by the converter's recognised set (or the same gap-bearing DB) is circular and re-hides the drops it exists to catch. F2 owns a *separate* tinycss2 parse. The legacy parse's known flaws (silent skip on parse error css_router.py:135-137; pseudo-element class-strip css_router.py:182; `@keyframes/@font-face/@import` skip css_router.py:153) are exactly why sharing it is forbidden.

## 2. Module location + structure (the D-MODULAR architecture, §12.4)

```
plugins/sgs-blocks/scripts/ledger/
├── __init__.py
├── declare_input.py        # the F2 parser → declare_input set (THIS design)
├── models.py               # the InputDecl dataclass + ledger-artefact schema
└── tests/
    └── test_declare_input.py     # per-fixture parse correctness + determinism + independence
```
No `shorthand.py` (v2 — expansion removed). Small single-purpose files, independently frozen golden.

## 3. The data model — one ledger row

`InputDecl` (frozen dataclass in `models.py`). One row per physical declaration:

| Field | Type | Meaning |
|-------|------|---------|
| `fixture` | str | source fixture stem |
| `selector` | str | the rule's full selector **verbatim**, incl. pseudo-elements (`.x::before`) and pseudo-classes — NOT class-stripped. For inline styles: `[inline:<element-path>]` |
| `property` | str | the declaration property, lower-cased (incl. custom props `--x`) |
| `value` | str | the declaration value **verbatim** (URLs/functions/`var()`/tokens kept raw — no token-snap, no resolution, no normalisation beyond `!important` extraction) |
| `important` | bool | True if the declaration carried `!important` (extracted, not discarded — cascade-load-bearing) |
| `media` | str \| None | enclosing `@media`/`@supports` condition verbatim (`None` = base) |
| `media_kind` | enum | `none` \| `media` \| `supports` — so tier derivation reads only `media` conditions |
| `tier` | str | derived label per §5: `Base`/`Mobile`/`Tablet`/`Desktop`/`Other:<cond>`. ACCOUNTING-only; NOT the converter's mapping |
| `source_index` | int | monotonic declaration counter across the concatenated stylesheet (cascade source-order) |
| `shadowed` | bool | True if a later `source_index` re-declares the same `(selector, property, media)` (the cascade loser) |
| `kind` | enum | `box-css` \| `custom-prop` \| `inline-style` \| `at-keyframes` \| `at-fontface` \| `at-import` \| `at-other` |
| `excluded_candidate` | bool | True ONLY for `at-keyframes`/`at-fontface`/`at-import`/`at-other` (structural at-rules). NEVER set for box-css/custom-prop — F4 owns property-level exclusion. ADVISORY hint; F5 MUST join the F4 table, never this bool |

**Row identity (dedup/count key):** `(fixture, selector, property, value, media, source_index)`. `source_index` keeps two cascade declarations of the same property distinct (surjective); identical duplicate declarations collapse only when `source_index` ties (they can't — counter is monotonic, so true duplicates in one rule body collapse at parse, cross-rule duplicates stay).

## 4. The parse pipeline (independent, raw-HTML, fail-CLOSED)

`declare_input(raw_html: str, fixture_stem: str) -> list[InputDecl]` — takes **raw HTML**, owns its own CSS-surface extraction (council MF: do not trust a pre-extracted CSS string; the surjectivity guarantee must cover the whole HTML):

1. **Parse HTML with a real parser** (`html.parser`/BeautifulSoup — decodes entities correctly). Extract **(a) every `<style>` element** regardless of `type`/`scoped`/`media` attribute (a `<style media="print">` is draft CSS — captured, its media attr becomes a `media` wrapper), in document order; do NOT descend into `<template>`. **(b) every `style=""` attribute** on every element → synthetic rows (`selector=[inline:<bem-class-or-tag-path>]`, `media=None`, `kind=inline-style`).
2. **Strip comments**, then tinycss2 `parse_stylesheet(skip_comments, skip_whitespace)` per `<style>` block.
3. **Recurse `@media`/`@supports`** carrying the condition + `media_kind`. The recursion **appends** context; a nested `@media`+`@supports` keeps both (a tuple internally; the `media` field serialises the innermost `@media` for tier, with the `@supports` recorded — no current fixture nests, but the recursion must not silently overwrite).
4. **Capture `@keyframes`/`@font-face`/`@import`/`@layer`** — do NOT skip. One `InputDecl` per at-rule, `kind=at-*`, `excluded_candidate=True`. **`@import` for a non-font-provider URL → raise `LedgerParseError`** (the imported file's declarations are outside F2's reach — fail-closed rather than pretend-accounted; a Google-Fonts `@import` is an allow-listed exception).
5. **Per qualified rule:** split the selector list via tinycss2's parsed `prelude` (NOT `str.split(',')` — handles `:is(.a,.b)`); for EACH selector part, for EACH declaration → one `InputDecl`. Selector kept **verbatim** (pseudo-elements preserved — the M3-S7 fix at the accounting layer).
6. **Custom properties** (`--x: …`): captured verbatim, `kind=custom-prop`, never resolved, never expanded.
7. **NO shorthand expansion** (v2). Physical declarations only.
8. **FAIL-CLOSED:** any tinycss2 error, any untokenisable declaration, any unclassifiable at-rule, any non-font `@import` → raise `LedgerParseError`. Never a warning, never a skip.
9. **Deterministic output:** assign `source_index` in parse order; compute `shadowed`; sort rows by `(selector, media or '', property, source_index)` using a `locale='C'`/codepoint sort (no locale dependence). Counts stable across runs.

## 5. Tier derivation (accounting-only — precise algorithm, council DEFECT 1/7/13)

Operate on the **parsed numeric value** of `min-width`/`max-width` (tinycss2 tokenises `767px`→767), not string match. For a `media_kind=media` condition:
- contains `max-width ≤ 767` (any feature) → **Mobile**;
- forms exactly `[min-width ≥ 768] AND [max-width ≤ 1023]` → **Tablet**;
- `min-width ≥ 1024` with no max-width (or max-width ≥ theme wideSize) → **Desktop**;
- **anything else** (`min-width:768` alone, `max-width:600/640/781`, `min-width:1280` standalone, `orientation`, `print`, `min-resolution`, `prefers-*`, any compound not matching the above) → **`Other:<verbatim-condition>`**. Never coerced into a device tier, never dropped (STOP-8 / Family-F lock).
`media_kind=supports` or `none` → `Base` (unless an `@media` is also in the stack). Document explicitly: a standalone `@media (min-width:768px)` is `Other:` by design (it spans Tablet+Desktop — a visual breakpoint, not a device tier).

## 6. (REMOVED in v2) Shorthand expansion

Deleted. The DB owns box-model shorthand→longhand decomposition (`property_suffixes` + `modifier_suffixes` side/corner); duplicating it violates R-22-1, and sourcing from it violates STOP-3. F2 records physical declarations; F3's render-oracle catches partial-shorthand drops by rendered-pixel comparison. (Council's value-vs-names debate is moot under this cut.)

## 7. Output artefacts

- Per-fixture: `tests/fixtures/phase-f/_ledger/<fixture>.declare-input.json` — normative schema: `{fixture, generated_by:{module, module_version, tinycss2_version}, row_count, by_kind:{…}, rows:[InputDecl…]}`. All `None` fields emitted as `null`; field order = dataclass order.
- Aggregate: `_ledger/declare-input.aggregate.json` — per-fixture counts + grand totals.
- **Live-DB baseline cross-reference** (replaces the stale doc list): for each physical row, a one-time report flagging which properties have NO usable `block_attributes` destination **as measured against the live DB at run time** (NOT the doc's stale "~15 missing" list — STOP-11; `background-image`/`object-fit`/`opacity`/`aspect-ratio`/`filter` already have `property_suffixes` rows). This is reporting only; F5 owns the gate.
- Plain-English summary line per fixture for the non-coder QC owner (a prediction, clearly labelled as such until F5/F4 confirm).

## 8. Acceptance criteria (done-when — §12.7 F2)

1. **Mechanically checked** (council DEFECT 4): each `.expected.md`'s named properties are asserted present in `declare_input` by a parametrised test over the fixture directory; PLUS a committed per-fixture declaration-count golden so "zero omissions" is a diff, not a human read.
2. **Stable + reproducible:** a `--check` mode re-runs and diffs the committed aggregate; exit-nonzero on drift. The check ALSO fails if any per-fixture `row_count` *decreases* without that fixture being deleted (the ledger's own count silently dropping = the exact failure F2 exists to catch). `--regenerate` writes a dated reason line to a `_ledger/REGEN-LOG.md` (full PreToolUse regen-ban hook deferred to F5).
3. The known legacy drops (per the LIVE-DB baseline, §7) are all present in `declare_input`.
4. **Fail-CLOSED:** a malformed-CSS fixture and a non-font `@import` each raise `LedgerParseError` (negative tests).
5. **Independence:** a transitive-import test (import `ledger.*` in an environment where `css_router`/`convert`/`db_lookup` raise on import) proves no dependency; AND no `property_suffixes`/`block_attributes` query string appears under `ledger/`.
6. `test_declare_input.py` green and **wired into `package.json prebuild`** now (a literal `ledger-check` script that fails the build on test failure) — so F2 is exercised every build, not inert until F5. The UNACCOUNTED *gate* arming stays F5.

## 9. The F2↔F5 join contract (FROZEN here — council MF-A/MF-B/ROT-5)

F2's row granularity is meaningless without the consumer contract, so it is fixed now:
- **Join key = `(selector, property, media)`** — `value` is EXCLUDED from the join (it is a *compared* field, not a join field; the converter writes a normalised value, so joining on raw value produces phantom-UNACCOUNTED).
- **Denominator = the non-`shadowed`, non-`excluded_candidate` physical rows.** `shadowed` cascade-losers and structural at-rules are not in the UNACCOUNTED denominator.
- F5 must apply the **same normalisation** to `declare_fate` before comparing values, and must join exclusion against the **F4 `excluded_properties` table**, never F2's `excluded_candidate` hint.
- The converter's `declare_fate` MUST report against the **original property the draft wrote** (if it internally decomposes a shorthand, fate is recorded for the shorthand the draft used) — so the join lines up at physical granularity.

## 10. Council synthesis (2026-06-18) — what was accepted / rejected (Bean-reviewed)

- **ACCEPTED & folded in:** raw-HTML extraction + inline-`style=""` capture (§4.1); `!important` as a field (§3); custom-props captured (§4.6); precise tier algorithm (§5); freeze the F5 join (§9); `source_index`/`shadowed` for cascade (§3); pin tinycss2 + provenance (§7); mechanically-checkable AC1 + count-floor (§8); transitive independence test (§8.5); wire tests into prebuild now (§8.6); fail-closed on non-font `@import` (§4.4); locale-C sort, tinycss2-prelude selector split, no `all:`/logical-cross-expansion (§4-5, moot under v2 no-expansion).
- **SUPERSEDED by Bean's DB catch:** the council's whole shorthand value-vs-names debate (their convergent headline) — F2 now does NO expansion at all (§6), simpler than either side.
- **REJECTED:** fetching `@import`ed CSS over the network (wrong for an offline parser — fail-closed instead). **DEFERRED to F5:** the hard PreToolUse regen-ban git hook (F5 builds the commit hook; F2 ships the count-floor + regen-log).
- **STALE-PREMISE CORRECTED (STOP-11):** the doc/expected.md "~15 no-suffix-row properties" list is partly out of date — `background-image`/`object-fit`/`opacity`/`aspect-ratio`/`filter` already have `property_suffixes` rows. F2's baseline is measured against the LIVE DB (§7), never the doc.
