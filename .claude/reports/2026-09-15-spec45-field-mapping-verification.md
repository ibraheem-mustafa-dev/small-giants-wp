# Spec 45 field-mapping — DB/code verification (2026-09-15)

Real, re-runnable figures behind Spec 45 v1.1.0. Written specifically because the
adversarial council on v1.0.0 flagged the spec's headline match-rate figure as
"conversation-derived, not yet written to a report" — the same citation gap
Spec 44's own council caught twice. Every number below was queried live against
`C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db` (read-only) on
2026-09-15, independently re-run after a 5-persona `/adversarial-council` pass
to confirm council findings against ground truth rather than trusting them.

## 1. `array_item_schema` (Tier 1's backbone)

```sql
SELECT COUNT(*) FROM array_item_schema;                              -- 88
SELECT COUNT(DISTINCT block_slug) FROM array_item_schema;            -- 13
SELECT COUNT(*) FROM array_item_schema WHERE role IS NOT NULL;       -- 25
SELECT DISTINCT role FROM array_item_schema WHERE role IS NOT NULL;
-- image-object, text-content, icon, icon-slug, url-href, state-modifier-boolean
```

**No `role='link'` value exists anywhere in this table.** The real value for a
URL-carrying field is `url-href`.

## 2. `block_attributes.canonical_slot` (Tier 2's backbone)

```sql
SELECT COUNT(*) FROM block_attributes;                                          -- 7759
SELECT COUNT(*) FROM block_attributes WHERE canonical_slot IS NOT NULL;         -- 1958
SELECT COUNT(DISTINCT canonical_slot) FROM block_attributes WHERE ...;          -- 84
SELECT COUNT(DISTINCT block_slug) FROM block_attributes WHERE ...;              -- 148
```

Breakdown of those 1958 rows by `role`:

```
typography 425 | layout 387 | color 292 | visual 219 | text-content 113 |
colour-gradient 79 | motion 77 | technical 64 | image-object 51 |
select-from-enum 45 | behaviour 37 | styling 32 | content 32 |
enum-class-probe 23 | boolean-visibility 17 | link-href 15 | core 13 |
identity 6 | (none) 6 | svg 4
```

**Genuinely content-bearing subset** (per `_content_bearing_roles()`,
`db_lookup.py:4699` — reads `roles` table WHERE `classification='content-bearing'`,
D99): `text-content` (113) + `image-object` (51) + `content` (32) +
`link-href` (15) + `identity` (6) = **217 of 1958** canonical_slot rows —
roughly 11%, not the 60%+ the v1.0.0 spec implied. The rest (typography, layout,
colour, motion, technical, styling, etc.) are styling/behaviour slots, explicitly
out of this spec's scope.

**This is the correct scoping for Tier 2's match-rate claim.** A future measurement
should compute the hit rate against this 217-row content-bearing set, per resolved
parent block (median 4 distinct canonical_slot values per block — ambiguity within
a single block is real: 293 of 813 distinct `(block, canonical_slot)` pairs have
more than one candidate attribute, ~36%).

## 3. `nested_attr_named()` — what it can and cannot match

```sql
SELECT emit_shape, COUNT(*) FROM block_attributes
WHERE box_family IS NOT NULL AND box_family != '' GROUP BY emit_shape;
-- (NULL, 237)
```

**Every box-family attribute has `emit_shape = NULL`.** `nested_attr_named()`
(`db_lookup.py:7082`) filters `WHERE emit_shape = 'nested' AND role IN
(content_bearing_roles)` — it can never return a box/tier-object attribute. Its
real, documented purpose (own docstring, `db_lookup.py:7089-7103`) is the D279
regression guard: exact-name-only matching to avoid the unsafe
canonical_slot/alias cross-family hijack that broke a golden fixture
(`sgs-accordion__heading` → wrongly matched `title` via canonical_slot).

Of the 234 `emit_shape='nested'` content-bearing attrs that DO exist,
`attr_type` breaks down: `string` 138, `object` 56, `object` rows are all
`role='image-object'`. The real caller in `extraction.py` (line 1241) only lifts
when `attr_type == "string"` — the object-typed rows never lift through this
path.

## 4. File locations (three council reviewers independently flagged the same wrong path)

```
find . -name "sc_var_classifier.py"        → ./recogniser/sc_var_classifier.py
find . -name "dom_shape_classifier.py"     → ./recogniser/dom_shape_classifier.py
find . -name "sc_var_responsive_bridge.py" → ./converter/services/sc_var_responsive_bridge.py
```

`sc_var_classifier.py` and `dom_shape_classifier.py` both live in `recogniser/`,
**not** `converter/services/` (only `sc_var_responsive_bridge.py` and
`sc_var_responsive_correlator.py`'s sibling module are there — actually
`sc_var_responsive_correlator.py` is also in `recogniser/`; only the bridge is
in `converter/services/`).

## 5. `dom_shape_classifier.py`'s real public API

```
class Hint
def classify_heading(element, is_first_child) -> Hint | None      # emits "hero"
def classify_button_shaped(element) -> Hint | None                # emits "cta"
def classify_landmark_tag(element, is_top_level) -> Hint | None    # emits "header"/"footer"
def classify_repeated_siblings(siblings) -> Hint | None             # emits "card-grid"
def classify_element(...)                                          # dispatcher
```

Four classifiers, each emitting a bare **block-name guess** (not a slug — `"hero"`
not `"sgs/hero"`) with a confidence ≤ 0.5. **No field-resolution logic exists in
this module.** It takes DOM elements (reads tag names, HTML attributes), not JS
object values — it cannot be applied to a nested JS-object field the way Spec 45
v1.0.0's Tier 3/4 proposed.

## 6. Real priority chain in `extraction.py::_try_route_generic_child_once`

Read lines 1179-1273 directly. Confirmed order:

1. Extract BEM `__element` token
2. **G1** `child_block_for_parent_token(rec.slug, element)` — parent-scoped
3. **G-resolve** `resolve_slug_from_bem(csgs)` — global alias fallback (only if G1 missed)
4. **G-atomic** `recognise(child)` bare-tag fallback (only if still missing)
5. **Nested-attr pre-empt** — `nested_attr_named(rec.slug, element)`, gated
   `if (not via_parent_token and element)` — **skipped entirely when G1 hit**,
   and only lifts when the matched attr is `attr_type == "string"`
6. **G3 validation** — cross-check `child_slug` against `accepts_allowed_blocks`.
   `None` → permissive, logged at **`_LOG.debug`** level (not a gap, not
   surfaced to any review file). Not-in-list → loud `ContentGap`.

`accepts_allowed_blocks` returns `None` (permissive) for **196 of 216**
`block_composition` rows; only 20 declare a real allow-list.

## Conclusion

Fixes v1.0.0 needed and how each is now grounded:

- Tier 2's match-rate claim: recompute against the 217-row content-bearing
  subset (§2), never the full 1958-row/84-slot pool.
- Tier 3's "tier-object box attribute" worked example: impossible per §3 —
  replaced or removed.
- Tier 3/4's "runs first" and "reused as-is" claims: corrected per §3/§5/§6.
- File citations: corrected per §4.
