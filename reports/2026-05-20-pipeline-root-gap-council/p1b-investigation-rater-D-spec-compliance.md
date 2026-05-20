# Rater D — Spec 16 §FR6 Compliance Audit
**P1.B css_router.py — Four-destination router**
Date: 2026-05-20 | Angle: Spec 16 §FR6 compliance

---

## Schema enumeration baseline

`property_suffixes` table: **117 total rows, 70 with `css_property` populated** (47 rows are style/behaviour suffixes with no CSS property — correctly excluded by `css_property_suffixes()` filter). Schema verified via `wp-blocks.py dump` before any gap claims.

---

## Per-destination spec compliance verdicts

### D0 — Global/reset rules: **PASS**

Criterion (css_router.py L188): selector has no class or ID component AND matches `_GLOBAL_BARE_TAGS`. Comma-grouped selectors require ALL parts to be global. Pseudo-elements and `:root` handled. @media nesting recurses correctly via `_extract_rules` (L131).

No silent-drop path for D0-eligible rules. Malformed rules (empty props) route to D2 (L387–389). This is spec-compliant — §FR6 says "at least one of D0/D1/D2/D3", and D2 is the correct fallback for unparseable selectors.

### D1 — Typed-attr lift: **FAIL — matching heuristic misses >90% of eligible attrs**

Criterion (L275): `_css_prop_maps_to_typed_attr` checks three candidates against `block_attrs()`:
1. `suffix[0].lower() + suffix[1:]` — bare camelCase (e.g. `colour`)
2. `f"{block_name}{suffix}"` — block-prefixed (e.g. `heroColour`)
3. `f"background{suffix}"` — background-prefixed (e.g. `backgroundColour`)

**The violation:** SGS attrs use slot-prefixed naming (`labelColour`, `ctaPrimaryColour`, `contentPaddingTop`, `subHeadlineFontSize`, `overlayColour`, `imageWidth`). None of these three candidates matches slot-prefixed attrs. Live measurement confirms the gap:

| Block | Total attrs | D1-able (heuristic) | Should be D1-able |
|---|---|---|---|
| sgs/hero | 174 | 6 (3.4%) | ~60+ (attrs with recognisable suffix) |
| sgs/trust-bar | 15 | 0 | ~6 (labelColour, valueColour, etc.) |
| sgs/brand-strip | 14 | 1 | ~2 |
| sgs/social-proof | 1 | 0 | 0 (no CSS attrs) |

Specific missed attrs on sgs/hero: `headlineColour`, `subHeadlineColour`, `labelColour`, `ctaPrimaryColour`, `ctaSecondaryColour`, `overlayColour`, `contentPaddingTop/Right/Bottom/Left`, `labelFontSize`, `labelFontWeight`, `labelLetterSpacing`, `subHeadlineFontSize`, `imageWidth`, `imageHeight`, `imageObjectFit`, `imageObjectPosition`, `splitGap`, `ctaGap` — 50+ attrs.

**Spec §FR6 violation:** §FR6 requires typed-attr lift when a CSS property has a suffix-table mapping AND the block declares the matching attr. The three-candidate heuristic (L287–296) implements this incorrectly: it checks only the bare suffix form and two fixed-prefix forms, missing the entire slot-prefixed naming scheme that SGS blocks actually use. The correct algorithm requires iterating all block attrs and checking if `attr_name.endswith(suffix)`.

### D2 — Wrapper CSS fallback: **PASS (with note)**

All rules not routed to D0/D1 reach D2 — either directly (L519) or as D3 fallback (L513). The safety net at L522–527 catches the edge case where a rule has populated `selector` but empty `props`. No silent drops observed.

**Note:** D3 entries also write to D2 (L513–514), so `d2_count` in stats includes D3 entries. This is intentional and spec-conformant but inflates the D2 statistic. The `_stats_sum_matches_total` helper in tests (L138–145) compensates by using `≤` rather than `==`, which is correct.

### D3 — Gap candidates: **PARTIAL**

Criterion (L493): CSS prop is in `property_suffixes` table AND block does not have a matching typed attr. Due to the D1 matching bug above, many attrs that SHOULD lift to D1 instead fall through to D3 (suffix IS in the table, but the three-candidate check fails). D3 is therefore **inflated by D1 classification failures** — the 114 D3 entries reported in live stats likely include ~50–80 entries that should have been D1 lifts.

---

## D1 rate root-cause classification

**Classification: Router bug (primary) + schema under-spec (secondary)**

**Router bug (dominant):** The three-candidate heuristic at L287–296 cannot match slot-prefixed attrs (`labelColour`, `contentPaddingTop`, `imageWidth`, etc.). This is the primary cause. sgs/hero has 174 attrs; 6 matched. The heuristic matches ~3.4% of the attr space, not the spec target of ≥40%.

**Schema under-spec (minor, real):** `sgs/trust-bar` and `sgs/social-proof` have sparse attr sets (15 and 1 attr respectively) with no typed CSS-property attrs on `sgs/social-proof`. But even if trust-bar had full coverage, the matching bug would still prevent those lifts.

---

## Chrome-skip: spec violation (silent drop)

**§FR6 violation at L404–410:** Chrome-skipped rules are excluded from ALL four buckets and counted separately in `chrome_skipped`. The spec states "every CSS rule MUST hit at least one of D0/D1/D2/D3." Chrome-skip is an architectural design decision (header/footer CSS belongs in template parts), but it violates the hard-rule wording. These rules are silently dropped from D0–D3.

This is a defensible implementation choice, but the docstring at L10 claims compliance with "Spec 16 §R5: every CSS rule MUST hit exactly one of D0/D1/D2/D3" — chrome-skipped rules violate that claim. The code should either: (a) route chrome rules to D0 with a comment, or (b) update the docstring to note chrome-skip as a named fifth outcome.

---

## D1 sidecar integration in cv2: PARTIAL (additive, not replacement)

The sidecar is correctly written by `stage_0_7_css_lift` (orchestrator L456–463) and loaded via `seed_d1_sidecar` before the per-section loop (orchestrator L1277). However, in `convert.py` the D1 sidecar is implemented as **additive merge** (`base_decls.setdefault(...)` at L2122 and L2502) — it supplements `_collect_css_decls_for_element` output rather than replacing it.

This is explicitly documented (convert.py L107–135) as an intentional design choice with a known limitation: the FR1 typed-attr slot-harvest path (`_lift_attrs_for_block`) does **not** use the D1 sidecar at all (L128–135). So D1 assignments flow only into the WP-supports CSS path and core-block style path — not into the primary typed-attr extraction. The spec target (D1 sidecar replaces `_collect_css_decls_for_element`) is partially met, not fully.

## Strict-exact-match guard (commit 8a996194): NOT INTEGRATED with css_router

The strict exact-match guard (`_strict_snap_passes` / `_token_value_for_slug`) was added to `_snap_leaf()` in `convert.py`. The css_router does not invoke the token resolver at all — it stores raw CSS values in D1 entries with `snap_skipped` metadata. Token-snap runs downstream in convert.py when the D1 sidecar values are merged. The guard is therefore correctly positioned in convert.py, not in css_router. No compliance gap here, but the chain (css_router emits raw value → cv2 snap guard filters it) is split across two modules with no test covering the end-to-end path.

---

## Test coverage gaps

Tests do cover: @media nesting (3 tests), D0/D1/D2/D3 routing, chrome-skip, hard-rule sum, pre-snap filter, malformed CSS.

**Missing coverage:**
1. **Pseudo-class rules on SGS classes** — `.sgs-hero:hover { background-color: red; }` — not tested. The pseudo-strip regex removes `:hover` before routing, but a test should confirm this.
2. **Multi-class selectors where BOTH classes are SGS blocks** — `.sgs-hero .sgs-button { ... }` test exists (L319) but only checks that "at least one bucket" received the rule; it does not assert which block slug wins the D1 routing.
3. **CSS Custom Properties (`--foo: bar`) as rule content** — not tested. A rule like `.sgs-hero { --hero-bg: #F00; }` — the custom property name would fail all suffix lookups and silently route to D2.
4. **D1 attr-path key format** — D1 entries are keyed by `f"{block_slug}.{css_prop}"` (L474). The cv2 sidecar reader at convert.py L178 extracts `css_prop = entry.get("css_prop") or attr_path.split(".")[-1]`. There is no test that roundtrips a D1 entry through `_load_d1_assignments` to confirm the key extraction is correct.

---

## Top 3 highest-leverage spec-compliance fixes

**Fix 1 — D1 matching: replace three-candidate heuristic with suffix-scan (L286–298)**

Replace the `candidates` list with: iterate `block_attrs(block_slug)` and check `attr_name.endswith(suffix)` for each suffix that matches `css_prop`. This is a O(n×m) scan but n and m are small (≤200 attrs × ≤70 suffixes). Projected D1 lift rate: ~40–60% for well-speced blocks like sgs/hero.

```python
# Current (broken):
candidates = [suffix[0].lower() + suffix[1:], f"{block_name}{suffix}", f"background{suffix}"]
for candidate in candidates:
    if candidate in attrs:
        return True

# Fix:
for attr_name in attrs:
    if attr_name.endswith(suffix) or attr_name.lower().endswith(suffix.lower()):
        return True
```

**Fix 2 — Chrome-skip: route to D0 instead of silent drop (L404–410)**

Change the chrome-skip handler to emit chrome rules as D0 (unscoped global) rather than suppressing them entirely. This satisfies §FR6's hard rule that every CSS rule hits at least one bucket. Template-part rules written to D0 are harmless (they'll be overridden by the specific template part CSS) but are no longer silently lost.

**Fix 3 — D1 sidecar: wire into FR1 typed-attr slot-harvest path in convert.py**

The commented limitation at convert.py L128–135 (FR1 path does not use the D1 sidecar) means the primary typed-attr extraction still re-derives CSS via `_collect_css_decls_for_element`. Wiring D1 sidecar values into `_lift_attrs_for_block` (the slot-harvest path) would complete the Spec 16 §FR6 D1 pipeline as designed. Currently D1 assignments only improve the WP-supports path, not the main conversion path.
