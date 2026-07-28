# Design gate — canonical `resolveTier()` cascade (Spec 35 D4 / Spec 37 FR-37-14 / P2 §6a)

```
doc_type: design-gate
status: AWAITING BEAN SIGN-OFF (T0.2 of the Spec 35 full close-out plan, 2026-07-28)
consumers: Spec 37 FR-37-14 (behaviour tri-state), Spec 37 §3.8 (content cascade),
           Spec 35 D4 (responsive-visibility), Spec 36 FR-36-24 (per-tier settings guard),
           Spec 37 FR-37-16 (responsive value shape — already half-built as resolveResponsiveTier)
policy inputs (Bean, 2026-07-28): CLEAN reshape (same attr names, no read-time fallback,
           D270/D293/R-31-14); fresh header-behaviour inventory (T1.4a) before any reshape.
```

## Problem

Three specs need per-device inheritance (desktop → tablet → mobile) and the rule "build ONE
cascade, never fork a second". Today the cascade exists three times in partial forms:
`resolveResponsiveTier()` (JS, scalar/null-marker), `sgs_resolve_tier_booleans()` (PHP,
boolean-only, no 'inherit' token), and `ResponsiveOverride` (UI). Nothing guarantees JS and PHP
agree, and neither handles the tri-state `'inherit'|'on'|'off'` shape FR-37-14 requires.

## Effect

Spec 37 Group B is blocked; the visibility extension can't gain inheritance; and any independent
implementation risks editor-preview and frontend-render disagreeing about which tier wins —
invisible until a client reports it.

## Solution — the contract

### 1. Stored value shapes (two families, ONE algorithm)

- **Tri-state enum (behaviours, visibility):** `{ desktop: 'on'|'off', tablet: 'inherit'|'on'|'off',
  mobile: 'inherit'|'on'|'off' }`. Desktop never stores `'inherit'` legitimately (§6b guard below).
- **Scalar/value (FR-37-16 responsive props):** `{ desktop: <value>, tablet: <value|null>,
  mobile: <value|null> }` — `null`/absent = inherit. (This is what `resolveResponsiveTier`
  already implements; unchanged semantics.)

Both are the same algorithm with a different inherit-marker. Internal normalisation:
`isInherit(v) = (v === 'inherit' || v === null || v === undefined)`.

### 2. Canonical resolver — identical in both runtimes

- **JS:** `resolveTier(value, tier, defaultValue)` in `src/utils/responsive.js`
  → returns `{ value, inherited }` (matches the existing `resolveResponsiveTier` return shape).
- **PHP:** `sgs_resolve_tier( $value, $tier, $default )` in `includes/helpers-responsive.php`
  → returns `[ 'value' => …, 'inherited' => bool ]`.

Algorithm (P2 §6a verbatim, generalised):

```
desktop: isInherit(value.desktop) ? defaultValue          : value.desktop
tablet:  isInherit(value.tablet)  ? resolveTier(desktop)  : value.tablet
mobile:  isInherit(value.mobile)  ? resolveTier(tablet)   : value.mobile
```

- **§6b guard:** `desktop:'inherit'` (or missing) coerces to `defaultValue` deterministically —
  never throws. For behaviours `defaultValue = 'off'` (DEFAULT_OFF).
- `inherit` resolves **at render, never copies down at save** (D4 rule) — an inherited value
  stays distinguishable from an explicit override forever.
- Coexistence: `resolveResponsiveTier` remains and becomes a thin alias over `resolveTier`
  (scalar family) in the same commit; `sgs_resolve_tier_booleans` gains a deprecation comment
  and its two row-block call sites migrate post-T1.4 (deferred cleanup, not now).

### 3. Golden agreement test (the load-bearing QC)

ONE fixtures file — `plugins/sgs-blocks/tests/fixtures/resolve-tier-fixtures.json` — consumed by
BOTH a node test and a PHP test. Each fixture: `{ value, tier, default, expect: {value, inherited} }`.
A fixture change without both tests passing fails the build. Initial fixture matrix (16 cases):

| # | desktop | tablet | mobile | queried tier | expect value | inherited |
|---|---|---|---|---|---|---|
| 1 | on | inherit | inherit | desktop | on | false |
| 2 | on | inherit | inherit | tablet | on | true |
| 3 | on | inherit | inherit | mobile | on | true |
| 4 | on | off | inherit | mobile | off | true |
| 5 | on | off | on | mobile | on | false |
| 6 | off | on | inherit | tablet | on | false |
| 7 | off | on | inherit | mobile | on | true |
| 8 | inherit (§6b) | inherit | inherit | desktop | DEFAULT_OFF | true |
| 9 | inherit (§6b) | inherit | inherit | mobile | DEFAULT_OFF | true |
| 10 | missing key | on | inherit | desktop | DEFAULT_OFF | true |
| 11 | `{}` empty object | — | — | any | DEFAULT_OFF | true |
| 12 | scalar: 24px | null | null | mobile | 24px | true |
| 13 | scalar: 24px | 16px | null | mobile | 16px | true |
| 14 | scalar: 24px | null | 8px | mobile | 8px | false |
| 15 | scalar: 24px | null | 8px | tablet | 24px | true |
| 16 | non-object junk (string) | — | — | any | DEFAULT/defaultValue | true |

(#16 = the D328 defence: a malformed stored value resolves to the default, never crashes.)

### 4. Emission — per-tier `#uid` scoped `@media`, no body classes

Resolved per-tier state emits as rules inside the block's own scoped `<style>` (the Spec 32
pattern), one rule per tier inside that tier's `@media`, breakpoints from `SGS_Breakpoints`
(767/1023 max-widths — the locked 768/1024 standard). NOT body classes —
`class-sgs-header-behaviours.php`'s body-class path is retired/repurposed for these behaviours
(P2 §6a). D386 holds by construction: emission is per-block `#uid`, nothing lands in a shared
state-only stylesheet. Editor preview computes the same resolution via the JS resolver (that is
what the golden test protects).

### 5. Visibility (D4) semantics ride the same resolver

`sgsHideOnMobile/Tablet/Desktop` (3 flat booleans) reshape into ONE tri-state object attr
`sgsHide` `{ desktop:'on'|'off', tablet:…, mobile:… }` (clean reshape; grep patterns/templates
for seeded old attrs — WP discards undeclared attrs silently). Resolution through
`resolveTier` gives the spec'd behaviour by construction: hiding at a tier flows to tiers below
(they inherit), never above; an explicitly edited tier stops inheriting. Render stays
**HIDE never REMOVE** — `display:none` media queries via `device-visibility.php`, content in the
DOM. All three current consumers (`responsive-visibility.js` save-classes, `device-visibility.php`
render, `utils/responsive.js:89` `responsiveClasses`) collapse onto the one resolver.

### 6. FR-36-24 compatibility

The Spec 36 per-tier settings guard needs "what is the EFFECTIVE value of setting X at tier Y" —
exactly `resolveTier(value, tier, default).value`. No extra API surface needed; the guard imports
the resolver when Spec 36 builds it. This gate only commits us to keeping the resolver pure
(no DOM/WP dependencies) so lint scripts can consume it in Node.

## What this gate does NOT decide

- The definitive site-header behaviour roster for the FR-37-14 reshape — that is T1.4a's fresh
  inventory (Bean-mandated; `rowShrinkHideTarget`, `contrastSafe`, and the expanded nav modes
  make the original 4-boolean list stale).
- ResponsiveTriStateControl UI details beyond P2 §4.1 (built in T1.2 against this contract).
- Row-block migration off the legacy resolvers (deferred post-T1.4).

## Sign-off request (Bean)

Approve the contract above (shapes, names, algorithm, fixtures, emission) so T1.1 can build.
The one judgment call embedded: **`sgsHide*` three booleans collapse into ONE object attr
`sgsHide`** rather than three tri-state attrs — one attr per capability is the same pattern as
the row behaviours (`rowTransparent` etc.) and halves the manifest surface. Say the word if you
want them kept as three separate attrs instead.
