---
doc_type: spec
project: small-giants-wp
thread: cloning-pipeline
title: "Phase F step F2 — draft-derived CSS Accounting Ledger (input parser)"
created: 2026-06-18
status: DESIGN — pending /adversarial-council then Bean design-gate
spec_ref: specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §12.2.1 + §12.7 (row F2)
council_input: reports/2026-06-17-adversarial-council-register-and-rebuild-direction.md (MF-1, the keystone)
binding_rules: R-22-1 (DB-first / no hardcoded dicts), R-22-6 (no inline @media), STOP-3 (ledger input is DRAFT-derived, not converter-derived)
---

# F2 — the draft-derived CSS Accounting Ledger (input half)

## 0. Plain English (what this is, why it exists)

**What.** A small standalone module that reads each Phase-F test fixture's raw CSS and records **every CSS declaration the draft contains** into a complete list — *before* the cloning converter touches it. That list is the denominator the whole rebuild is measured against.

**Why.** The legacy converter resolves each property via a `property_suffixes` table lookup. When there is no row (background-image, filter, opacity, transform, object-fit, pseudo-elements, font shorthand — ~15 property classes), the property silently vanishes: not lifted, not logged, not rendered as a tracked gap. You cannot gate "nothing was silently dropped" if the dropped things were never counted. F2 counts them. It is **MF-1 — the keystone** of the Tier-1 foundation; without it, "no silent drops" is theatre (the council's headline finding).

**The one-sentence target.** `declare_input` = a surjective, deterministic set of every `(selector, property, value, media-context)` declaration in a draft, captured by an INDEPENDENT parse at Stage 0.7 before any routing, so that the F5 gate can later compute `UNACCOUNTED = draft_decls − (transferred ∪ excluded-with-reason ∪ gap)` and hard-fail on any remainder.

## 1. Scope — what F2 IS and is NOT

**F2 IS** (this design):
- The **input half** of the ledger: parse a draft's CSS → the complete `declare_input` set.
- A standalone, independently-tested module producing per-fixture + aggregate ledger artefacts.
- Run against the Phase-F fixture corpus (`tests/fixtures/phase-f/` + the referenced `tests/fixtures/conformance/*`).

**F2 IS NOT** (later Phase-F steps — do not build here):
- The **fate half** (`declare_fate`: transferred / excluded / gap) — that is instrumented into the converter terminals and joined by the F5 pipeline-close gate.
- The `UNACCOUNTED` computation + the build-failing gate — **F5**.
- The render-diff / LANDED oracle — **F3**.
- The `excluded_properties` DB table — **F4** (F2 only TAGS at-rules/known-WP-native props as *excluded-candidate*; F4 owns the audited table + the literal-ban gate).
- Wiring into the live page-8 Stage 0.7 extract — later (the ledger spine). F2 is fixture-scoped first, per §12.7 F2 done-when.

**Independence is the whole point (STOP-3).** F2 must NOT import or call `css_router.py`'s parse (`_parse_qualified_rules` / `_parse_declarations`) or any converter/`property_suffixes` lookup. A ledger fed by the converter's recognised set is circular and re-hides the very drops it exists to catch. F2 owns a *separate* tinycss2 parse. The legacy parse's known flaws (silent skip on parse error css_router.py:135-137; pseudo-element class-strip css_router.py:182; `@keyframes/@font-face/@import` skip css_router.py:153) are exactly why sharing it is forbidden.

## 2. Module location + structure (the D-MODULAR architecture, §12.4)

New package, deliberately separate from both legacy trees:

```
plugins/sgs-blocks/scripts/ledger/
├── __init__.py
├── declare_input.py        # the F2 parser → declare_input set (THIS design)
├── shorthand.py            # the audited shorthand-expansion map + value decomposer
├── models.py               # the InputDecl dataclass + ledger-artefact schema
└── tests/
    ├── test_declare_input.py     # per-fixture parse correctness + determinism
    └── test_shorthand.py         # expansion-map correctness (vetted against CSS spec)
```

Rationale (§12.4 + D-MODULAR): small single-purpose files = locatable failures, visible behaviour, independently frozen goldens. `declare_input.py` and `shorthand.py` each get their own test + frozen golden.

## 3. The data model — one ledger row

`InputDecl` (frozen dataclass in `models.py`):

| Field | Type | Meaning |
|-------|------|---------|
| `fixture` | str | source fixture stem (e.g. `rt-background-url`) |
| `selector` | str | the rule's full selector **verbatim**, including pseudo-elements (`.x::before`) and pseudo-classes (`.x:hover`) — NOT class-stripped |
| `property` | str | the declaration property, lower-cased |
| `value` | str | the declaration value **verbatim** (`!important` stripped, but URLs / functions / tokens kept raw — no token-snap, no normalisation) |
| `media` | str \| None | enclosing `@media`/`@supports` condition verbatim (`None` = top-level / base tier) |
| `tier` | str | derived label: `Base` / `Mobile` / `Tablet` / `Desktop` / `Other:<cond>` — see §5. ACCOUNTING-only; NOT the converter's tier mapping |
| `origin` | enum | `physical` (as written) \| `expanded` (a longhand derived from a shorthand) |
| `derived_from` | str \| None | for `origin=expanded`: the shorthand property it came from (`background`) |
| `kind` | enum | `box-css` \| `at-keyframes` \| `at-fontface` \| `at-import` \| `at-other` — drives excluded-candidate tagging |
| `excluded_candidate` | bool | True for `at-*` kinds + a small vetted WP-native-handled set (F4 owns the authoritative table; this is only a HINT) |

**Row identity (the dedup/count key):** `(fixture, selector, property, value, media, origin)`. Two identical declarations in the same rule collapse to one; the same property at two tiers are two rows (matches the expected.md: base `background-size:320px` and `@media background-size:200px` are distinct). `expanded` rows never displace the `physical` shorthand row — both are recorded (the shorthand is the audit trail; the longhands are the accounting granularity).

## 4. The parse pipeline (independent, fail-CLOSED)

`declare_input(fixture_css: str, fixture_stem: str) -> list[InputDecl]`:

1. **Extract `<style>` blocks** from the fixture HTML (a draft is an HTML file with embedded `<style>`). Concatenate in document order. (A future live-pipeline wiring feeds the Stage-0.7 raw CSS string instead — same function, different caller.)
2. **Strip comments** (`/* … */`), then tinycss2 `parse_stylesheet(skip_comments, skip_whitespace)`.
3. **Recurse `@media`/`@supports`** carrying the condition label (same shape as css_router, independently implemented).
4. **Capture `@keyframes`/`@font-face`/`@import`** — do NOT skip. Emit a single `InputDecl` per at-rule with `kind=at-*`, `excluded_candidate=True`, `property=<at-keyword>`, `value=<serialised prelude/first-line>`. (Accounted-as-excluded, never silently dropped — the legacy `continue` at css_router.py:153 is the bug.)
5. **Per qualified rule:** for EACH comma-separated selector part, for EACH declaration → one `physical` `InputDecl`. The selector part is kept **verbatim** (pseudo-elements preserved — this is the M3-S7 fix at the *accounting* layer; the converter still has to learn to lift them, but the ledger will now SEE them).
6. **Shorthand expansion (§6)** — for each `physical` declaration whose property is in the audited shorthand set, also emit the derived `expanded` longhand rows.
7. **FAIL-CLOSED:** any tinycss2 error, any declaration tinycss2 cannot tokenise, any at-rule we cannot classify → raise `LedgerParseError` (not a warning, not a skip). The fixture parse aborts loudly. (The legacy "log.warning … skipping block" is precisely the silent-drop the ledger exists to kill.)
8. **Deterministic output:** sort rows by `(selector, media or '', property, origin, value)`; counts are stable across runs (no dict-iteration-order leakage, no `Math.random`/timestamps).

## 5. Tier derivation (accounting-only — NOT the converter's mapping)

The ledger labels a row's tier *for reporting/joining*, deliberately independent of the converter's `_BREAKPOINT_RULES`:

- `media is None` → `Base`.
- `max-width:≤767` (or `<768`) → `Mobile`; `min-width:768`/`max-width:1023` → `Tablet`; `min-width:1024`/`1280` → `Desktop`.
- **Any other threshold (600, 640, 781…)** → `Other:<verbatim-condition>`. **Never coerced into a device tier, never dropped** (STOP-8 / the Family-F lock). A row tagged `Other:` is fully accounted; it is the F5 gate's job to confirm the converter preserved or gap-logged it, not the ledger's job to normalise it.

This means the `@media (max-width:600px)` red-team fixture (`rt-media-600`) produces accounted `Other:(max-width:600px)` rows — exactly the declarations the legacy converter silently drops.

## 6. Shorthand expansion — the audited map (Bean-chosen 2026-06-18: strictest)

**Decision (Bean):** capture physical + expand known box/layout shorthands into longhand accounting units, so a converter that lifts part of a shorthand and drops the rest is caught by the ledger (not only by the F3 render-oracle).

**Mechanism (`shorthand.py`):**
- A **vetted, version-pinned expansion table** of the box/layout shorthands relevant to container CSS transfer: `background`, `font`, `margin`, `padding`, `border`(+`-top/right/bottom/left`), `border-width/style/color`, `border-radius`, `inset`, `gap`, `grid`, `grid-template`, `grid-area`, `flex`, `place-items`/`place-content`, `overflow`, `transition`, `animation`, `outline`.
- **Property-slot expansion is exhaustive** (every longhand slot a shorthand can populate is emitted), so the *accounting granularity* matches what a converter can independently drop.
- **Value decomposition is best-effort but honest:** where tinycss2 component-value parsing yields an unambiguous per-slot value (e.g. `margin:10px 20px` → top/bottom=10px, left/right=20px), record it. Where a slot's value is ambiguous or the shorthand omits it (relying on `initial`), record the longhand row with a sentinel `value="<from-shorthand:initial>"` or `"<from-shorthand:unparsed:{raw}>"`. **The expanded row is always ACCOUNTED-as-present-needing-transfer**; the F3 oracle confirms the actual LANDED value. The ledger never claims a precise value it could not decompose — it claims presence.
- **No hidden dict (R-22-1 spirit):** the table is a single vetted module-level constant with a docstring citing the CSS spec slot for each, plus `test_shorthand.py` asserting (a) every listed shorthand expands to the correct longhand slot set, (b) round-trip determinism, (c) a curated set of real value decompositions. **OPEN for the council:** whether this table should instead be a DB-seeded `css_shorthand_expansions` table (DB-first consistency) vs a vetted code module (CSS-spec knowledge is not SGS routing data). Recommended: code module + test, because it is CSS-spec fact not SGS data — but flag for council ruling.

## 7. Output artefacts

- Per-fixture: `tests/fixtures/phase-f/_ledger/<fixture>.declare-input.json` — `{fixture, generated_by, row_count, physical_count, expanded_count, excluded_candidate_count, rows:[InputDecl…]}`.
- Aggregate: `_ledger/declare-input.aggregate.json` — per-fixture counts + grand totals + a `legacy_known_drops` cross-reference (which rows correspond to the HIGH-gap properties the expected.md files name), so F5 has the baseline.
- A plain-English summary line per fixture (for the non-coder QC owner): e.g. `rt-background-url: 19 declarations captured (15 box-css, 4 expanded); 5 are known legacy silent-drops (background-image/-size/-position/-repeat + @media background-size).`

## 8. Acceptance criteria (done-when — §12.7 F2)

1. Every declaration in every Phase-F fixture appears in `declare_input` (verified against each `.expected.md`'s named properties — zero omissions).
2. Counts are **stable + reproducible** across repeated runs (deterministic sort; a `--check` mode re-runs and diffs the committed aggregate, exit-nonzero on drift).
3. The known legacy drops (background family, `::before`/`::after`, `@media 600`, `<video>`-column CSS, object-fit) are all **present** in `declare_input` (so F5 can later flag them UNACCOUNTED against the legacy converter's fate set).
4. Parse is **fail-CLOSED**: a malformed-CSS fixture raises `LedgerParseError`, never a silent skip (covered by a negative test).
5. Independence: a grep proves `ledger/` imports neither `css_router` nor `convert`/`db_lookup`/`property_suffixes` (covered by `test_declare_input.py`).
6. `test_declare_input.py` + `test_shorthand.py` green; both wired into the conformance run (NOT yet build-failing — that arming is F5).

## 9. Risks for the council to red-team

- **R1 (highest) — shorthand value-decomposition correctness.** `background:` and `font:` shorthands are genuinely hard to decompose by value. Does the "presence-not-precise-value" fallback (§6) actually prevent a hidden drop, or does it create a false-ACCOUNTED that masks a partially-lifted shorthand? (Transpiler-correctness persona.)
- **R2 — at-rule accounting.** Is tagging `@keyframes/@font-face` as `excluded_candidate` honest, or a disguised silent-drop? Should `@font-face`/`@import` ever be GAP rather than excluded? (Spec-lawyer.)
- **R3 — tier `Other:` semantics.** Is recording `Other:(max-width:600px)` as accounted-but-unmapped sufficient, or does it let the converter off the hook for preserving it? (Maintenance realist.)
- **R4 — expansion table location.** DB table vs vetted code module (§6). (Cynic / R-22-1 lawyer.)
- **R5 — completeness vs the conformance fixtures.** F2 must also parse the referenced `tests/fixtures/conformance/*.html` standard-shape fixtures, not only the 6 new ones. Are those in a parseable shape? (Ship-PM.)
- **R6 — `<style>`-extraction fidelity.** Multiple `<style>` blocks, `<style>` inside templates, inline `style=""` attributes — does F2's HTML extraction miss any draft CSS surface? Inline `style=""` is draft CSS too. (Completeness.)
