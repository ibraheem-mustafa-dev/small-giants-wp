# Expected render — rt-pseudo-before.draft.html

## HIGH gap this fixture red-teams

**M3-S7: pseudo-element CSS is never collected.**

The current Stage 0.7 CSS parser (`css_router.py`) resolves rules against the HTML elements in the draft. A `::before` or `::after` rule has no matching HTML node → the parser either errors silently or skips it. The `content`, `position`, `inset`, `background` (gradient), and `z-index` properties on `.sgs-info-box::before` are entirely absent from the `declare_input` stream → they are UNACCOUNTED in the ledger (a hard fail per §12.2.1).

## What the current converter does wrong

`css_router.py` iterates `soup.select(selector)` for each CSS rule. `soup.select('.sgs-info-box::before')` returns an empty NodeList in BeautifulSoup — CSS pseudo-elements have no DOM node. The rule is silently skipped. None of its declarations reach `declare_input`. No `attribute_gap_candidates` row is written. The ledger cannot detect the drop because the property never entered the input stream.

## Target correct behaviour (the oracle must enforce)

1. The Stage 0.7 parser MUST detect pseudo-element selectors (regex: `::(?:before|after)`) BEFORE attempting a DOM lookup.
2. When a pseudo-element rule is detected, its declarations MUST be added to `declare_input` with `selector_type = 'pseudo-element'` and `pseudo = '::before'` / `'::after'`.
3. The routing step MUST then decide: (a) if the target block has a `overlayBackground` / `pseudoBackground` attr → lift to that attr (D1); (b) otherwise → write to `attribute_gap_candidates` with `proposed_action = 'pseudo-element: css=background raw=linear-gradient(...) class=sgs-info-box pseudo=::before'`. NEVER silent-drop, NEVER route to D2.
4. Idempotency: a second-pass parse on the clone must NOT attempt to parse `::before` as a structural selector and fail.

## Block emitted

`sgs/container` (fallback, until Method-2 native-composite routing maps `.sgs-info-box` → `sgs/info-box`; when that ships, `sgs/info-box`).

## Required attrs (via the non-pseudo element rules — these must also pass)

| CSS source | Attr | Value | Tier | Status |
|-----------|------|-------|------|--------|
| `.sgs-info-box { padding: 56px 32px }` | `paddingTop` / `paddingBottom` | `56px` | Desktop | **COVERED** |
| `.sgs-info-box { padding: 40px 20px }` (@media ≤767px) | `paddingTopMobile` / `paddingBottomMobile` | `40px` | Mobile | **COVERED** |
| `.sgs-info-box { background: #1a1a2e }` | `style.color.background` | `#1a1a2e` | Desktop | **COVERED** |
| `.sgs-info-box__inner { max-width: 900px; margin: 0 auto }` | `contentWidth` | `900px` | Desktop | **COVERED** (L2 inner band) |
| `.sgs-info-box::before { background: linear-gradient(...) }` | — | — | — | **GAP** — must appear in `attribute_gap_candidates`; must NOT be silently dropped or UNACCOUNTED |

## CHEAT-FORBIDDEN

- The `::before` overlay MUST NOT be re-emitted as `style="--sgs-overlay: ..."` inline (R-22-6).
- The `::before` rule MUST NOT be silently dropped from `declare_input` — any run where `declare_input` row count for this fixture < total declaration count (including pseudo-element rules) is a hard FAIL.
