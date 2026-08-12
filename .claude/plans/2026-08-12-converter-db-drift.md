# Converter ↔ DB drift — 14 failing tests, diagnosed

```
doc_type: plan
status: BUILD GREEN — G2 + G3 FIXED; G1 (12 tests) xfail(strict) pending Spec 39 per D554
opened: 2026-08-12
revised: 2026-08-12 (QC council — 3 raters; the original G1 design was FALSIFIED)
origin: D590 (the /sgs-update reseed that exposed it)
owner: cloning converter (NOT Track 1b)
```

## OUTCOME (2026-08-12, post-council)

**Build restored to GREEN** — `npm run build` exit 0; 915 passed, 2 skipped, **12 xfailed**.

| Group | Verdict | Action taken |
|---|---|---|
| **G1** (12) | `validated-rejected` — **do not build** | Tests marked `xfail(strict=True)` citing D554. **strict** so they FAIL LOUD the moment the converter starts emitting tier objects — a live Spec 39 checklist, not silenced tests. Converter code UNTOUCHED. |
| **G2** (1) | `validated-shipped` | Removed the `backgroundOverlayOpacity` write from `services/pseudo_overlay.py` (attr retired at D581; declared by 0 blocks; alpha already rides in the `rgba()` colour). Test now asserts its ABSENCE. **Negative control run:** re-injecting the write makes the test fail, so the assertion is not vacuous. |
| **G3** (1) | `falsified` → stale test | Rewrote `test_natively_consumed_property_does_not_double_emit` onto `padding-top` (still genuinely native) and added a guard that fails if anyone restores `supports.color.background`. |

⛔ **The 12 xfails are NOT "done".** They are the D554-accepted consequence — cloning stays blocked
for migrated properties until Spec 39.

✅ **The D554 clone-output gate that makes this loud at CLONE time already existed and is now FIXED**
(`4ec6ed83`) — it had Shape-2/3 confusion AND was self-promoting per-tier siblings into "migrated"
status (259 false positives). See §G9a of `spec-39-seed-requirements.md`. An earlier revision of this
doc reported it as "never built"; that was my search error, corrected below.

## ⛔ COUNCIL VERDICT — READ BEFORE ANYTHING ELSE

A QC council (Stage 1.5 structural gates + 3 raters) **falsified the central proposal of this plan.**

**G1 must NOT be built. D554 ruling C already decided the opposite**, verbatim:
*"**C — The converter stays flat; its output gets gated.** … Accepted consequence: cloning is blocked
for migrated properties until the Spec 39 rework lands… ⛔ **Rejected: a temporary converter shim.** It
would make the pipeline pace the standard (inverting the ordering ruling), and a shim written under
time pressure becomes the permanent implementation."*

So "teach the converter to emit tier objects" is **named future work (Spec 39), explicitly deferred** —
not a bug to fix now. `.claude/plans/spec-39-seed-requirements.md:14-16`: *"the block standard leads,
the cloning pipeline is reworked afterwards… The converter's inability to emit the new shape is
scheduled work, never a precondition."* **Spec 39 does not exist yet** (verified: no `.claude/specs/39-*`).

**What D554 asked for — ⛔ I WRONGLY REPORTED THIS AS NEVER BUILT (corrected 2026-08-12): the
clone-output gate HAS existed since 2026-08-11** (`fa638cea`,
`scripts/orchestrator/check_flat_tier_regression.py`, wired into `pipeline-stage-gate.py` +
`sgs-clone-orchestrator.py`). My check missed it twice over — grepped `"flat tier"` (space)
against a `flat_tier` (underscore) filename, AND looked in `.claude/hooks/` when the live file is
in `scripts/orchestrator/`. It WAS broken, though (Shape-2/3 confusion + 259 false positives from
per-tier siblings self-promoting); both fixed at `4ec6ed83`. Detail: seed doc §G9a.
**The gate as originally described:** A check that FAILS a clone run when it
emits a flat tier for a property already migrated on the target block, so divergence is loud. The design doc (`spec-35-flat-to-object-migration-design.md:216-241`) already specifies the slot
(`sgs-clone-orchestrator.py:2053`, beside the existing R-31-15 gate) **and** warns its retirement
criterion needs a **positive control** — a fixture clone that provably triggers it — or it goes
vacuously green, the same shape as `empty-section-false-pixel-diff-win`.

⚠ **The reseed accidentally delivered D554's outcome by the wrong route:** cloning IS now blocked for
migrated properties — but silently, via resolver gaps and red tests, instead of via the loud named gate.

### Two design errors this plan originally contained (kept so they are not repeated)

1. **"One normalisation pass over the collected writes"** — impossible. `resolvers/grid.py:174-179`
   calls `validate()` on the *suffixed* name and `return`s a GAP before any `Write` exists, so a
   post-pass has nothing to normalise. Any future Spec 39 work must act at attr-resolution, not after.
2. **"`attr_type=='object'` ⇒ wrap the value in `{tier: value}`"** — would have corrupted live data.
   `object`-typed ≠ tier-object: `paddingTablet` (38 blocks), `marginMobile` (41), `backgroundImageTablet`
   (6) are **flat siblings whose VALUE is an object** (a box / a media object).

3. ⛔ **"Does `{base}{Tier}` exist?" is NECESSARY BUT NOT SUFFICIENT — my own corrected discriminator
   was still wrong, caught by Rater D.** There are **THREE** shapes under `attr_type='object'`, and that
   test only separates two of them:

   | Shape | Example | Siblings? | PHP consumer | My rule | Correct? |
   |---|---|---|---|---|---|
   | 1 · flat-sibling trio | `sgs/hero.imagePadding`(+Tablet/Mobile) | **yes** | 3 separate array reads | leave alone | ✅ |
   | 2 · migrated tier-of-boxes | `contentBandPadding`, `contentPadding` | no | `sgs_responsive_normalise_object(...)` then `.desktop/.tablet/.mobile` | fold | ✅ |
   | 3 · **base-only box, NO tier support** | `sgs/text.borderWidth` | **no** | its `render.php` reads `is_array($attributes['borderWidth'] ?? null) ? … : array()` — a **FLAT read, no tier call anywhere** | fold ⇠ **WRONG** | ❌ |

   Shape 3 is indistinguishable from shape 2 by sibling-existence *or* by `attr_type`. Folding it to
   `{desktop:{…}}` makes the PHP find no `top`/`right`/… keys and **render nothing — regressing a
   currently-working path.**

   ⛔ **CORRECTION: `container.gridItemPadding` was cited here as the Shape 3 example and is actually
   Shape 2** — `class-sgs-container-wrapper.php:2279-2296` feeds it into `$obj_inner_props[]`, the
   tier-OBJECT emitter. It ALSO has a flat `sgs_serialise_box_sides` read elsewhere in the same file,
   and citing only that produced the misclassification; the `//` comment above `:2279` calling the
   plumbing "deferred" is itself stale and contradicted by the code beneath it. ⚑ **A property can have
   TWO reads in one file — a flat read does not prove there is no tier read.** The three-shape
   CONSTRAINT is unaffected; only the example was wrong.

   The signal that DOES work (built at `4ec6ed83`): **PHP-consumer evidence** — does the value
   demonstrably reach `sgs_responsive_normalise_object()` / `sgs_emit_responsive_css()` /
   `sgs_typography_css_rule()` / `sgs_resolve_on_tiers()`. Neither `attr_type` nor `box_family_for`
   can do it; both are identical for Shape 2 and Shape 3.

4. **"16 call sites" was wrong — there are 15.** `services/state_value_lift.py` only *mentions*
   `tier_state_suffix` in a docstring; it resolves via `db_lookup.attr_for_state_property` instead.
   And **6 of the 15 never call `validate()` at all** — they gate solely on `box_family_for`, so
   mechanism (a)'s whole rationale ("return the base so `validate()` passes") does not even apply
   there. That is precisely the path that produces the shape-3 regression above.

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

### G1 — tier-object emission *(**12** of the 14 — ⛔ DO NOT BUILD, see the council verdict above)*

⚠ **Count corrected by the council: 12, not 10.** The original "10" was self-inconsistent — this
section's own itemisation summed to 11, and it omitted `test_grid_area_tier_suffix`
(`test_css_resolvers.py:202-211`, fails because `contentPaddingTablet` no longer exists —
`box_family_for('sgs/hero','contentPaddingTablet')` → `None`). `test_css_resolvers.py` has **6**
failures, not 5. With G2 and G3 as singletons the split is **12 / 1 / 1 = 14**, which now accounts for
every failure; the original 10/1/1 accounted for only 12.

⭐ Also council-corrected: the three `order` failures are on **`sgs/media`**, whose `order` attr IS
declared as `"type":"object"` (`src/blocks/media/block.json:361-364`) — same object drift as the rest
of G1. D590's original claim that they concerned a deleted `sgs/hero.order` was wrong and has been
struck through in `decisions.md`.

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
**Zero blocks declare that attribute.** ✅ **COUNCIL-CONFIRMED: RETIRED, not renamed — safe to fix now,
independent of D554.** Removed from container/hero/cta-section/trust-bar in `1ccbdbe1` (2026-08-11),
and **deliberate + documented**: `hero/render.php:130-134`, mirrored at
`class-sgs-container-wrapper.php:1186` — *"D5 (Background panel redesign, 2026-08-11):
`backgroundOverlayOpacity` no longer exists as an attribute — the colour/gradient picker's own alpha is
the one dimming mechanism now."* The capability was **folded into the colour's alpha channel**, which
the failing test's own fixture proves: `backgroundOverlayColour == "rgba(10,10,10,0.6)"`, alpha already
embedded. Fix = stop writing the retired attr; the alpha already rides in the colour.

### G3 — container lost `supports.color.background` ⚠ *(1 test — ESCALATE; NOT the reseed)*

⛔ **This plan's original hypothesis ("likely a `css_property`/`role` classification change from the
reseed") is REFUTED by the council.** Real cause: `sgs/container`'s `block.json` no longer declares
`"background": true` (nor `"gradients": true`) under `supports.color` — only `text`/`link`/`heading`.
`root_supports.py:100` maps `background-color → supports_top='color', supports_sub='background'`, so
with that sub-support gone the native lift cannot consume the declaration, and container declares no
custom plain-background-colour attr either. It gaps silently → 0 occurrences.

**Removed in `1ccbdbe1`, 2026-08-11 — the commit MESSAGE does not mention it ("migrate 4 box-per-tier
properties"), which is why it looks like scope-creep at first glance.** This is a **different table**
(`block_supports`) from the reseed's `block_attributes` prune, and `test_css_pass_partition.py` was
last touched 2026-07-11 — so its premise was correct when written and was invalidated by that Aug-11
commit, **not by the Aug-12 reseed**.

✅ **NOT A REGRESSION — DELIBERATE AND D-NUMBERED. Rater C's "there is no documenting note" is REFUTED,
and an earlier revision of this section wrongly escalated it as a possible live client-facing bug.**
The note exists; it is just in `decisions.md`, not the commit message. **D581** — title: *"Background/
overlay panel: root render bug fixed, a CSS collision fixed, **native colour support removed
(conflict)**, D1-D6 of the redesign shipped"*, point 3: *"**Native `supports.color` background/gradients
REMOVED** from hero/container/cta-section/trust-bar (`text` support kept) — it was live and silently
winning a conflict with this panel."* The four blocks with `background:false` are exactly the four that
mount `BackgroundPanel`; removing the native support is what stopped it overriding the redesigned panel.

**So G3 is a STALE TEST, not a bug.** `test_natively_consumed_property_does_not_double_emit` asserts
that `sgs/container` natively consumes `background-color` into `style.color.background` — behaviour
D581 deliberately ended. Fix = update the test to the post-D581 contract. ⛔ Do **not** "fix" it by
restoring `"background": true`; that reinstates the exact conflict D581 removed.

⚠ Discard the earlier "gradients-mutator" lead recorded here — that mutator ADDS `"gradients": true`
during builds and is unrelated to this deliberate removal. Chasing it would have been a dead end.

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
