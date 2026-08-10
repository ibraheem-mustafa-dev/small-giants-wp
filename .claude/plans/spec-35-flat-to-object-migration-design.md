---
doc_type: design
title: "Flat tier siblings → tier objects: the migration sequencing"
spec_ref: .claude/plans/spec-35-control-type-contract.md §12 (governing) · D549 · D552
date: 2026-08-10
status: DESIGN — awaiting Bean sign-off; P1 and P2 are BUILT NEXT, no block edits until both are green
---

# Flat → object migration — how it happens

## FOR BEAN — plain English first

**What we're moving.** Today a per-device setting is three separate settings: `gap`, `gapTablet`,
`gapMobile`. We're collapsing each of those trios into **one** setting that holds all three values.
160 of these trios exist, across 41 blocks.

**Why it's worth doing.** It's the missing half of the work that shipped yesterday. The shared
container can already *read* the new shape; almost nothing is *stored* in it yet. Until the blocks
change, yesterday's per-device capability reaches nothing.

**Your three rulings, which this design implements:**

1. **Property by property, not block by block.** We migrate `gap` everywhere, then the widths, then
   the grid settings. Each pass is the same edit repeated, which is what makes it safely delegable.
2. **Old saved pages get trashed, not migrated.** They're scratch/test pages on the canary — no
   longer useful even if migrated. If one turns out to be an active test page, it's faster to bin it
   and rebuild it via the API than to write a converter for it. **So there is no content-migration
   script in this plan at all** — that removes an entire category of risk.
3. **The cloning pipeline keeps working the old way for now, and we make that loud.** A check will
   fail a clone run the moment it emits an old-shape value for a property we've already migrated. It
   can't drift silently.

**The one thing that could still bite us,** stated plainly: WordPress throws away a saved value that
doesn't match its setting's declared shape, without an error. That's exactly why ruling 2 matters —
we're not trying to preserve those values, we're deleting the pages that hold them.

---

## Bean's rulings, as constraints

| # | Ruling | What it removes from scope |
|---|---|---|
| A | **Property-by-property** across all 41 blocks | Per-block bespoke codemod parameterisation |
| B | **Trash + rebuild canary pages; no content migration** | Every stored-content migration script, and the pre-production-policy ambiguity with it |
| C | **Converter stays flat; gate its output** | The interim converter shim, and the risk of pacing the standard on pipeline work |
| D | *(earlier)* **Standard leads, pipeline follows** | Converter rework as a precondition — it is scheduled Spec 39 work |

⛔ **Do not re-litigate these.** Record any new evidence against one as a finding for Bean, not as a
reason to change course mid-pass.

---

## The property order

Chosen so that **every early property is already proven in the object shape on a live block** — the
mechanism is never being tried for the first time at scale.

| Pass | Property | Already object on | Why here |
|---|---|---|---|
| 1 | `gap` | site-header-row, site-footer-row | Proven live; simple scalar; high frequency; the wrapper's object path reads it today |
| 2 | `maxWidth` + `contentWidth` | gallery, both row blocks | Proven live; **and their centring defect was fixed at `1979c419`**, so the known trap is already closed |
| 3 | `gridTemplateColumns` + `gridTemplateRows` | site-footer-row (`gridTemplateColumns`) | Proven on one block; the row blocks already bridge the flat siblings into the object UI, so the editor shape exists |
| 4 | `columns` | none | Numeric with real defaults (2/2/1) — needs care that an unset tier does not become `repeat(0,1fr)`; the wrapper already guards this on the flat path |
| 5 | the font-size families (`labelFontSize`, `titleFontSize`, `priceFontSize`…) | none | Bespoke per-block NAMES but one shape; must route through `TypographyControls` + `sgs_typography_css_rule`, so it is a different edit from passes 1-4 |
| 6 | the long tail | none | Whatever the survey still lists; re-run `survey:responsive-shape` to regenerate the work-list rather than trusting a count here |

⚠ **Passes 1-3 are the proving ground.** If the shape does not hold there, stop and redesign — do not
proceed to pass 4 (STOP-19: roll back fast, refine across a session boundary).

⛔ **Never migrate blindly from the survey's candidate list.** It separates `cascading_value` (the real
targets) from **36 `asset_like`** (a per-tier ASSET is a different resource per device — `sgs/media`'s
tiers are a deliberate runtime swap, D521) and **7 `flag_like`** (conjunctive per-device flags the
operator must see all of at once). Those 43 are CORRECT as-is.

---

## P1 — the gate, built and proven able to fail BEFORE any block edit

**The rule it enforces:** a tier family is either fully flat or fully object — never blended on one
attribute (contract §12 field 3 already bans blending `ResponsiveControl` with `ResponsiveOverride` on
one family).

**It must express the PHASE, not a timeless claim.** Flat is *conforming* for an un-migrated block and
*a violation* for a migrated one. A gate asserting "flat is canonical" full-stop would fight the
migration it is policing; one asserting "object is canonical" would fail 80 blocks on day one.

**How a block declares its phase — use what already exists.** `'responsive_model' => 'object'` in
`render.php` is already the runtime switch the wrapper reads (`class-sgs-container-wrapper.php:132`).
Reuse it as the phase marker; do not invent a second roster. Per-property granularity comes from the
property being object-typed in that block's `block.json` — which is a fact about the schema, not a
declaration anyone maintains by hand.

**Required of the gate:**
- a **positive and negative control per assertion**, and **proven able to fail on the real tree** —
  inject a violation, watch it flag, revert, confirm on disk;
- a named **promotion trigger** up front (the programme's rule: no rule sits advisory indefinitely);
- ⚠ **it must not key on a name appearing in a comment.** Two separate incidents this session: a
  census matched `SGS_Container_Wrapper` inside comments that recorded *dropping* it, and a stray
  `/*` in a comment corrupted two gates' corpora at once (D552 §4).

⛔ **Same-commit change to `lint-responsive-controls.py:106`** (`PRIMITIVE_FILES` names
`ResponsiveControl.js` + `ResponsiveOverride.js` as the only sanctioned primitives) **and to contract
§12 field 1**, which currently calls flat-per-tier canonical while §12's own amendment says collapse
onto the object. That contradiction is settled in the commit that makes it false — not left for later.

## P2 — `/sgs-update` seeding, reworked and verified BEFORE the migration depends on it

**The problem.** Today a tier sibling is its **own `block_attributes` row**, distinguished by
`css_tier` (`db_lookup.py` selects the base with `AND (css_tier IS NULL OR css_tier = 'desktop')`). An
object family collapses three rows into one with the tiers *inside the value* — so a per-tier setting's
identity stops being a row and becomes a path. The converter, every gate and all six surveys read that
identity.

**Proven already (do not re-derive):** `/sgs-update --stage 1` **does** seed `attr_type` correctly for
object attrs — gallery's stale `string` rows became `object` on reseed, +9 rows, and the
`inspector-scan` backlog did not move.

**The one open question P2 turns on, with its answer half-known:** object attrs mostly carry
`css_property = NULL`, **but the shape is not the cause** — gallery's *object* `maxWidth` retains
`css_property = max-width` while the row blocks' object `maxWidth` is NULL. Most likely a fossil
(Stage 1 updating `attr_type` without clearing `css_property`). **Read the seeding extraction and
settle it before designing the representation.** If routing data is genuinely dropped on shape change,
the migration would silently strip `css_property`/`css_tier` from 160 families — load-bearing for Spec
31 §3.A/§4 declarative routing.

**Decide + document:** the target representation for `css_tier` on an object family, and whether a
per-tier row is retained as a *derived view* so existing DB-first consumers keep working through the
transition. A derived view is the cheaper path and keeps the converter untouched until Spec 39.

**Prove it on one already-migrated block end-to-end** before a second property is touched: reseed,
then assert the DB rows match that `block.json`'s reality.

⚠ **A DB reseed is a cross-track action.** Snapshot `sgs-framework.db` first and name the rollback.
`/sgs-update` has broken both tracks' builds before. **Measured 2026-08-10: only one worktree and one
branch exist**, so the current risk is low — re-check rather than assuming it stayed that way.
⚠ The DB lives at `~/.agents/skills/sgs-wp-engine/sgs-framework.db`; `~/.claude/skills/...` is a
Windows **junction to the same file** (`os.path.samefile` → True). Backing up "the other one" backs up
the same bytes — verify with `samefile`, don't assume two databases.

---

## The codemod contract

Model on `scripts/migrate-core-blocks/` — the real precedent triad (`README.md:19`: *lint → judge →
apply*). ⛔ `scripts/wp-migrate-oldshape-blocks.js` **does not exist**; it has been cited twice under
two names in this programme's docs. Do not look for it.

**Copy its load-bearing rule** (`README.md:16-18`): every emitted attr must be declared by the target
`block.json`; every source attr mapped, dropped-with-reason, or flagged — **a loud failure, never a
quiet loss.** That is the D521 silent-coercion protection.

**Per pass:** `--survey` (already exists: `npm run survey:responsive-shape`) → `--fix` **proposes** a
diff → a human signs off → apply → verify. The codemod never applies unreviewed.

**Each pass changes:** `block.json` (delete 2 sibling attrs, retype 1 to `object`) · `edit.js` (the
`attrMap` trio → object sub-keys, or swap `ResponsiveControl` for `ResponsiveOverride`) · `render.php`
where the block reads the attr itself · **plus `'responsive_model' => 'object'` if the block does not
already opt in**.

⚠ **`is_array()` cannot tell "unset" from "set"** — an unset object attr arrives as an empty **ARRAY**
(`"default": {}` → PHP `array()` → JSON `[]`; measured live on gallery and both row blocks). Any new
guard must test for a real tier value. `class-sgs-container-wrapper.php` now has
`$sgs_tier_object_has_value` as the reference shape.

## The clone-output gate (ruling C)

The converter keeps emitting flat tiers (`fold_helpers.py:262`, `extraction.py:652`,
`resolvers/grid.py:19`, `typography.py:101`, `outer_box.py:386` and others build `attr + 'Tablet'`).

**Add one check that FAILS a clone run when it emits a flat tier for a property already migrated on the
target block.** Divergence becomes loud: a clone either succeeds or names the property that is out of
step. **Consequence, accepted:** cloning is blocked for migrated properties until the Spec 39 converter
rework lands, which makes that rework the pacing item for client delivery — the intended trade under
ruling D.

---

## Per-pass definition of done

1. `npm run build` exit 0, all prebuild gates green.
2. `npm run survey:responsive-shape` shows that property's `flat_tiers` count at **0** across all
   blocks it applies to (and the `asset_like`/`flag_like` families untouched).
3. P1's gate green, and **re-proven able to fail** on the newly-migrated property.
4. **Snapshot every `inspector-scan` rule's `rules[].findings` (filtered `status:"FLAGGED"`) BEFORE the
   pass and diff after.** ⚠ There is no top-level `findings` key — the wrong key returns `[]` and looks
   exactly like a clean pass. Baselines safe to cite: rule 21 = **133**, tree-wide **250** at HEAD
   (2026-08-10); 129/245 at `cb209dc1`.
5. **Live verification in BOTH editor surfaces** for at least one affected block: set a tier value,
   assert the stored value round-trips byte-identical, assert the computed style changes at the
   breakpoint, then `ToolsPanel` ⋮ **Reset all** and one undo.
   ⚠ **Measure at a viewport where the value actually binds.** A width band at a narrow viewport is
   trivially "centred" because there is no leftover space — that produced a vacuous pass this session.
6. Old canary pages holding the pre-migration shape: **trashed** (ruling B). Where a page is still
   wanted, recreate it via WP-CLI/REST and re-insert the block rather than converting it.
7. `decisions.md` D-entry + `LEDGER.md` replaced, in the same commit as the change.

## Out of scope, explicitly

- **Converter object emission** → Spec 39 (`.claude/plans/spec-39-seed-requirements.md`).
- **Stored-content migration** → deleted by ruling B.
- **The 43 `asset_like` + `flag_like` families** → correct as-is.
- **Phase 2.1 extension opt-in** → separate item; D551/D553 own the hover half.
- **`helpers-css-safety.php:91,:128`** stray sequences → neutralised by the `f11b122a` stripper fix; no
  edit needed.

## Verification of this design itself

Route through `/qc-council` with raters given **different** angles — (a) stored-content coercion under
ruling B, (b) gate phase-correctness, (c) interim clone divergence — and **fact-check every finding
before applying it**. This session had raters and a doc-claim wrong in both directions: a subagent
correctly refuted my measured figure, and my own measured figure turned out to be of a corrupted tree.
