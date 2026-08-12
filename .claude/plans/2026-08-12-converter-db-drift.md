# Converter ↔ DB drift — 14 failing tests, diagnosed

```
doc_type: plan
status: OPEN — diagnosed, designed, NOT built
opened: 2026-08-12
origin: D590 (the /sgs-update reseed that exposed it)
owner: cloning converter (NOT Track 1b)
```

## The one-paragraph version

`npm run build` is RED: 14 tests under `scripts/converter/tests/` fail. They were passing **only
because `sgs-framework.db` carried 467 stale `block_attributes` rows**. The 2026-08-12 `/sgs-update`
reseed pruned those rows, and the DB now matches the code exactly — so the converter's drift became
visible. **This is a pre-existing defect made visible, not one the reseed created.** The converter
has been emitting attributes WordPress silently discards for every property migrated to the
tier-object model (D563–D580) and for at least one attribute deleted outright.

⛔ **DO NOT restore the pre-reseed DB.** It is now correct; rolling back re-hides the drift and
guarantees rediscovery later at higher cost.

## Why this is not cosmetic

The converter reads `block_attributes.attr_type` to decide what shape to write
(`services/validate.py:43 attr_is_number`, and the same pattern elsewhere). With the DB corrected,
the resolvers now take different branches. The failing tests assert the OLD branch. But the deeper
consequence is on **live clone output, not just tests**: an attribute the converter emits that the
block does not declare is **silently discarded by WordPress** (D338). So cloned pages have been
losing responsive values since the tier-object migrations.

**Proven, not inferred:** `grep -l '"fontSizeTablet"' src/blocks/*/block.json` → **0 blocks**.
`fontSize` is `"object"` on all 5 blocks declaring it. The converter still emits `fontSizeTablet`.

## Ground truth established 2026-08-12 (do not re-derive)

| Fact | Value | How |
|---|---|---|
| `sgs/*` attribute rows in DB | **2245** | `SELECT COUNT(*) … WHERE block_slug LIKE 'sgs/%'` |
| Attributes declared across 83 `block.json` | **2261** | set-difference script over the corpus |
| Rows in DB that no block declares | **0** | same set-difference |
| The 16-row gap | `_comment_*` / `_note_*` doc pseudo-attrs | listed in full, all 16 |

So the DB is authoritative and correct. Every fix below moves the CONVERTER toward it.

## The three groups (four failure shapes; two fold together)

### G1 — tier-object emission *(largest; 10 of the 14)*

`test_css_resolvers` ×5, `test_outer_box_step12_properties` ×3, `test_l4_area_wiring`,
`test_css_pass_partition::…flows_through`, `test_state_value_lift`.

The converter emits a **flat tier-suffixed attr** (`gapMobile`, `fontSizeTablet`,
`contentPaddingTablet`, `contentBandPaddingTablet`) for properties whose block.json is now ONE
object attr holding `{desktop,tablet,mobile}`. Those suffixed names are declared by **no block**.

`sgs/decorative-image.positionX`/`positionY` belong here too — both are now
`{"type":"object","default":{"desktop":50}}`, which is why `test_decorative_image_top_left_lift…`
sees `"positionY":"20"` where it expects a bare `20`.

**The seam.** `services/tier_suffix.py::tier_suffix()` returns a *name* (`maxWidth` + `Mobile`), so
it structurally cannot express "write into a tier object". 16 call sites across 7 files
(`grid.py` ×7, `content_band.py` ×2, `grid_area.py` ×2, `outer_box.py` ×2, `typography.py`,
`services/border_side.py`, `services/state_value_lift.py`) all follow the identical shape:

```python
attr = tier_state_suffix(base_attr, decl, ctx.conn)
if not validate(ctx, attr, value): return gap(...)
… Write(attr=attr, value=…, …)
```

**DESIGN (validated, not built).** Do **not** edit 16 call sites. Add ONE DB-driven normalisation
pass over the collected writes:

- `TIER_KEY = {"Base":"desktop","Desktop":"desktop","Tablet":"tablet","Mobile":"mobile"}`
- For each `Write`, if its attr is `base` or `base + <breakpoint suffix>` **and** the block declares
  `base` as `attr_type='object'` → rewrite to `Write(base, {TIER_KEY[tier]: value})`.
- Breakpoint suffixes come from `db_lookup.modifier_suffixes('breakpoint')` — **never a hardcoded
  dict** (R-31-1; `tier_suffix.py`'s own docstring records that the literal `_TIER_SUFFIX` was a
  live R-31-1 violation).

⭐ **The merge already exists and is the reason this is small.** `orchestrator.ElementResult.attrs()`
already merges multiple dict-valued writes to one attr via `setdefault` (first-write-per-key wins)
as a *sanctioned* exception to the collision rule — that is exactly desktop+tablet+mobile folding
into one object.

⚠ **But `attrs()` will RAISE on it as written.** Its merge branch is gated on
`box_family_for(slug, attr) is not None`; a non-box dict attr receiving a 2nd dict write raises
`ConservationError` by design. `gap`/`fontSize`/`columns` are not box families. **The merge
predicate must widen from "is a box family" to "is a box family OR an object-typed tier attr."**
Miss this and the fix trades silent data loss for a hard crash.

### G2 — `backgroundOverlayOpacity` no longer exists *(1 test)*

`test_pseudo_overlay_lift::test_resolve_solid_colour_onto_container` → `KeyError`.
`services/pseudo_overlay.py:66` hardcodes `_OVERLAY_SOLID_OPACITY = "backgroundOverlayOpacity"`.
**Zero blocks declare that attribute.** Independent of G1: a hardcoded attr name that outlived its
schema. Find what replaced it (or whether the capability was retired, as `contentBandBackground`
was at D589) before rewiring — do not assume a rename.

### G3 — natively-consumed colour routes nowhere *(1 test)*

`test_css_pass_partition::test_natively_consumed_property_does_not_double_emit` — expects a
`background-color` to appear exactly once as `style.color.background`; got **0** occurrences, and
the emitted container carries only `style.spacing.padding`. So the native-colour route is not firing
at all. Likely a `css_property`/`role` classification change from the same reseed
(`css_property` rows fell 1056 → 857). Diagnose from the classification data before touching code.

## Verification bar (this project's standard, non-negotiable)

- Fixing the tests is **not** the goal — the goal is correct emitted markup. For G1, the proof is a
  **live clone** whose output carries `{"gap":{"desktop":…,"mobile":…}}` and renders the mobile
  value at a mobile viewport, not merely a green pytest.
- Each group needs a **negative control**: prove the detector/test can still fail (this session
  already caught one wrong assumption that way — see D589's gate work).
- ⛔ Do not "fix" a test by asserting current behaviour. Establish the correct shape from
  `block.json` + the PHP consumer FIRST. The PHP side is already dual-shape tolerant and correct:
  `includes/helpers-typography.php:72-107` routes each property independently by `is_array()`, with
  a comment stating migration runs property-by-property, not block-by-block.

## What is NOT wrong

- The DB. Verified against the block.json corpus, 0 extras.
- The runtime/PHP. Already handles both flat and tier-object shapes.
- The D589 inspector work. It shipped, deployed and live-verified on a green build **before** the
  reseed; none of the 14 failures touch the attributes it changed.
