# Expected render — rt-background-url.draft.html

## HIGH gap this fixture red-teams

**M3-NOSUFFIX / M3-S1: `background-image` (and the full background family) has no `property_suffixes` row → silent drop.**

The current routing engine resolves a `(css_property, value)` pair by looking up `property_suffixes.css_property`. If no row exists, the property is not lifted (no D1 attr destination found), not logged to `attribute_gap_candidates`, and not written to `declare_input` as UNACCOUNTED. It simply falls through to D2 scoped CSS only — or is silently discarded if D2 generation is also bypassed.

The affected properties in this fixture: `background-image`, `background-size`, `background-position`, `background-repeat`.

`background-color` may have a row (routes to `style.color.background`) — but the background IMAGE family does not.

## What the current converter does wrong

`css_router.py` and `convert.py`'s `_lift_root_supports_to_style` / `_lift_wrapper_css_to_container_attrs` both invoke `property_suffixes` lookup. When the lookup returns no rows, the property is not written to `declare_input` as a candidate — the declaration disappears from the pipeline entirely. No `attribute_gap_candidates` row, no D3 entry, no UNACCOUNTED signal. This means the ledger (once built) cannot detect it unless `declare_input` is written BEFORE the lookup (i.e. the surjective parse captures every declaration first, routing happens after — which is the §12.2.1 requirement).

## Target correct behaviour (the oracle must enforce)

1. `declare_input` MUST be populated by parsing the raw CSS stream **before** any routing lookup. Every `(selector, property, value)` declaration — including `background-image: url(...)`, `background-size`, `background-position`, `background-repeat` — enters the ledger at Stage 0.7, regardless of whether a `property_suffixes` row exists.
2. After routing: properties with no `property_suffixes` row go to `attribute_gap_candidates` with `proposed_action='add property_suffixes row: css=background-image'`. NEVER silent-drop.
3. The DB must eventually gain rows for the background family (§5 known GAP list). Until then, every missing-row property is a tracked GAP, not a silent drop.
4. `background-image: url(...)` is NOT a token-matched property — it must not be snapped (no ΔE colour comparison applies). The raw URL value must be logged verbatim in `attribute_gap_candidates`.
5. The `@media` variant `background-size: 200px 200px` at Mobile tier must also appear in `declare_input` (same parse rule for `@media` rules).

## Block emitted

`sgs/cta-section` (Method-2 composite; `.sgs-cta-section` → `sgs/cta-section`).

## Required attrs

| CSS source | Attr | Value | Tier | Status |
|-----------|------|-------|------|--------|
| `.sgs-cta-section--bg { background-color: #2d1b4e }` | `style.color.background` | `#2d1b4e` | Desktop | **COVERED** |
| `.sgs-cta-section--bg { padding: 72px 32px }` | `paddingTop` / `paddingBottom` | `72px` | Desktop | **COVERED** |
| `.sgs-cta-section--bg { padding: 48px 20px }` (@media ≤767px) | `paddingTopMobile` / `paddingBottomMobile` | `48px` | Mobile | **COVERED** |
| `.__inner { max-width: 760px; margin: 0 auto }` | `contentWidth` | `760px` | Desktop | **COVERED** |
| `.sgs-cta-section--bg { background-image: url('/media/pattern-dots.svg') }` | — | — | — | **GAP** — must appear in `attribute_gap_candidates`; must appear in `declare_input`; must NOT be silently dropped |
| `.sgs-cta-section--bg { background-size: 320px 320px }` | — | — | — | **GAP** — same as above |
| `.sgs-cta-section--bg { background-position: center right }` | — | — | — | **GAP** — same |
| `.sgs-cta-section--bg { background-repeat: repeat }` | — | — | — | **GAP** — same |
| `@media ≤767px { background-size: 200px 200px }` | — | — | — | **GAP** — must be in `declare_input` at the Mobile tier |

## CHEAT-FORBIDDEN

- Routing `background-image` to a D2 `.page-id-N` scoped rule when a future D1 attr destination exists is a **CHEAT** (R-22-15: D2-when-D1 DB cross-join gate must flag it).
- Any `declare_input` row count for this fixture that omits the background-family properties is a **hard FAIL** of the ledger.
- Emitting `style="background-image: url(...)"` inline on the block wrapper is a **CHEAT** (R-22-6: no inline CSS for properties that can route to a block attr).
