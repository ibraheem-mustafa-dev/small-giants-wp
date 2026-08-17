---
doc_type: design
title: "Flat tier siblings → tier objects: the migration sequencing"
spec_ref: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §12 (governing) · D549 · D552
date: 2026-08-10
updated: 2026-08-11
status: COMPLETE — 2026-08-11 (D580). The original 6-pass plan never named the real terminal
  shape (a 4-side box per tier, not a scalar per tier), but every property that shape covers is
  now migrated: `gap` (D563), `maxWidth`+`contentWidth` (D568), `gridTemplateColumns`+
  `gridTemplateRows` (D569/D570), `columns` (D578), and the box-tier close —
  `contentBandPadding`/`contentPadding`/`pillPadding`/`padding` (D580). Font-size families were
  never part of this migration (already object-shaped, folded in an earlier unrelated batch —
  verified 2026-08-11). Post-migration survey re-run found exactly 1 unrelated residual
  (`sgs/team-member.photo`, a media art-direction tier, different shape, different migration —
  not scheduled here) plus the known `card-grid.maxWidth`/`contentWidth` string residual from
  Pass 2 (D568, unrelated, unscheduled). `migrate-tier-object.py`'s box-typed-but-flat-tier
  classifier gap (documented below) was hand-worked around for this migration's 10-block scope
  rather than fixed generically — revisit only if a 6th shape surfaces. Full detail:
  `.claude/LEDGER.md` + `.claude/decisions.md` D580.
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

## Phase overview — the property order

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

**How a block declares its phase — key on `block.json`'s attribute `type`, and NOTHING else.**

⛔ **CORRECTED after council review (Rater B, BLOCKER — confirmed by direct measurement).** An earlier
draft named `'responsive_model' => 'object'` (`class-sgs-container-wrapper.php:160`) as "the phase
marker". **That is wrong: it is a block-level, all-or-nothing boolean that says nothing about any
individual property.** `sgs/gallery` opts in at `render.php:658` and is nonetheless *mixed today*:

```
gap                 type=string  siblings=[gapTablet, gapMobile]        <- FLAT
columns             type=number  siblings=[columnsTablet, columnsMobile] <- FLAT
gridTemplateColumns type=string  siblings=[…Tablet, …Mobile]            <- FLAT
gridTemplateRows    type=string  siblings=[…Tablet, …Mobile]            <- FLAT
maxWidth            type=object  siblings=[]                            <- OBJECT
contentWidth        type=object  siblings=[]                            <- OBJECT
padding / margin    type=object  siblings=[]                            <- OBJECT
```

So the opt-in flag is already FALSE-as-a-phase-label for 4 of gallery's 8 families. A gate reading it
would call those 4 violations on day one.

**The correct signal is per-property and already in the schema:** a family is OBJECT if its base attr
is `"type": "object"` with no `Tablet`/`Mobile` siblings, and FLAT if the base is a scalar type WITH
siblings. Blended = both at once. **Parse `block.json` directly — not `render.php`, not the DB.**
Rater B's reasoning, which holds: `block.json`'s `type` is what WordPress itself enforces at runtime;
it needs no reseed (unlike the DB, whose `attr_type` is *seeded from* that same file); it is not a
cross-track action; and it is the file the codemod edits each pass, so gate and codemod read one truth.

⛔ **Therefore the gate needs no block-level phase marker at all**, and `responsive_model` stays purely
what it is — the wrapper's runtime switch.

**Required of the gate:**
- a **positive and negative control per assertion**, and **proven able to fail on the real tree** —
  inject a violation, watch it flag, revert, confirm on disk;
- a named **promotion trigger** up front (the programme's rule: no rule sits advisory indefinitely);
- ⚠ **it must not key on a name appearing in a comment.** Two separate incidents this session: a
  census matched `SGS_Container_Wrapper` inside comments that recorded *dropping* it, and a stray
  `/*` in a comment corrupted two gates' corpora at once (D552 §4).

**P1 does NOT overlap any existing gate — verified, so it is legitimately new rather than a second
overlapping fix** (the project forbids those; two fixes for one cause are unfalsifiable):
- `lint-responsive-controls.py` scans **`edit.js` component-import shape** — whether a bespoke per-tier
  UI was hand-rolled instead of using the two sanctioned wrappers. It never inspects `block.json`
  attribute types or storage shape.
- `check-duplicate-controls.js` checks a different axis again (two controls for one setting).

⚠ **Contract §12 field 1 is NOT a factual contradiction — softened after council review (Rater B).**
The exact wording is *"**Canonical** — `ResponsiveControl` (flat per-tier attrs) and `ResponsiveOverride`
(object-cascade rows). These two are the only sanctioned **primitives**"* (`:927-931`, read verbatim).
That is a statement about **UI components**, while §12's amendment is about **storage**. Both can be
true at once. So the same-commit change is a **one-line clarification** — "both components remain
canonical *during* migration; object storage is the *end state* per D548-550" — not a correction of a
wrong claim. Do not "fix" field 1 as though it were an error.

⛔ **Still same-commit:** if the gate's arrival changes what `lint-responsive-controls.py` should say
about either primitive, that file changes alongside it — its own §12 note warns that renaming or
removing either primitive without updating the gate fails the build.

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

Model on `scripts/migrate-core-blocks/` — the real precedent triad (`README.md:24`: *lint → judge →
apply*). ⛔ `scripts/wp-migrate-oldshape-blocks.js` **does not exist**; it has been cited twice under
two names in this programme's docs. Do not look for it.

**Copy its load-bearing rule** (`README.md:22`): every emitted attr must be declared by the target
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

⭐ **WHERE IT GOES — found by council review (Rater C), and there is a precedent gate in the exact slot.**
`sgs-clone-orchestrator.py:2053` writes `extract_copy = run_dir / "extract.json"` right after Stage 9,
and the **R-31-15 anti-mirror gate already runs at that point** (`PIPELINE_STAGE_GATE_SCRIPT` defined
`:70`, invoked ~`:2645-2670`, hard-halting on failure, with a `--skip-stage-gate` escape at `:2404` /
`:2653-2656`). Build the new check as a second gate in that same slot — or as another check function
inside `pipeline-stage-gate.py` — reading the same `extract.json`, with its own `--skip-…-gate` flag
mirroring the existing one. **This is not a new architectural surface**; the chokepoint, the halt
semantics and the opt-out shape all already exist.

⛔ **The retirement criterion needs a POSITIVE CONTROL or it goes vacuously green (Rater C).** "When the
gate stops firing, the converter rework is done" is satisfiable by nothing ever exercising it — if no
clone run touches a migrated property, it never fires, and 0 findings is indistinguishable from done.
That is the same shape as this project's `empty-section-false-pixel-diff-win` rule. **So: a fixture clone
run against a mockup section that maps to at least one migrated property, confirmed to TRIGGER the gate
before the converter rework and go silent after.** Passive observation is not evidence.

---

## ⛔ Per-pass definition of done — ITEMS 0a-0c ADDED AFTER PASS 1 SHIPPED INCOMPLETE

**Pass 1 (`gap`) satisfied every item below as this document originally listed them, was deployed,
and was still wrong in two ways.** Both are now items in their own right, because both recur on
every remaining pass. Full record: D563.

**0a. Migrate the CONTROL in the same commit as the storage.** A family whose storage becomes an
object MUST have every control that writes it swapped from `ResponsiveControl` (one flat attr per
tier) to `ResponsiveOverride` (the object). Pass 1 did not, and
`ContainerWrapperControls.js` — ONE shared file feeding 19 of the 21 blocks — kept writing
`gapTablet`/`gapMobile`, which no longer existed. WordPress discards an undeclared attribute
silently (D338), so both per-device fields saved nothing; and the desktop branch wrote a STRING into
an object-typed attr, which coerces to the default and **destroys the whole setting**. Find every
writer first: `grep -rn "<propertyName>Tablet\|<propertyName>Mobile" src/` across `edit.js`,
`components/` AND `extensions/`, and remember a match inside a comment is not a usage.

**0b. Prove it in the LIVE EDITOR, not just the frontend.** Register → render the control → write a
value → assert the STORED shape is the object and that no flat siblings appear → assert zero console
errors. Pass 1's frontend verification could not have caught 0a because it set values
programmatically, so they were already object-shaped and the inspector was never the input path
under test. A JSX reference to a deleted symbol is invisible to every static gate here (D567, the
same day, from the other track).

**0c. Declare `unit_default` for every LENGTH-valued property added to the wrapper's object prop
list.** `sgs_responsive_format_atom_value()` appends the unit to a bare number; with none declared it
emits `gap:20`, invalid CSS the browser silently drops. ⚠ A bare number now means **px**
framework-wide (Bean-ruled 2026-08-10) — it previously meant a WordPress spacing-SCALE SLUG through
`sgs_css_length_value()`, where slug 30 is 1rem and slug 20 is 0.5rem. Any block default relying on
the old meaning must be rewritten to an explicit length preserving its MEASURED rendering.

**0d. The evidence toolkit exists — use it, do not hand-write reports.**
`build-tier-fixture-page.py` → `capture-tier-fixture.py` → `make-visual-diff-reports.py`. The
generator refuses to emit a PASS it cannot substantiate; a missing report blocks the commit, which is
the correct outcome. Flags for the honest edge cases: `--expect-change` (rendering deliberately
moved), `--known-dead` (attribute exists but renders nowhere), `--removed-attr` (attribute deleted —
no positive control is possible, and printing one would read as missing evidence).

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
6. ⭐ **Check the property's LEGACY SCALAR READS in every `render.php` that consumes it, and add an
   `is_array()` guard or prove none exist** (added after council review — Rater C). **This class has
   already fired once:** a tier object reaching a scalar read produces PHP *"Array to string
   conversion"* on **every render**, emitting garbage CSS such as `grid-auto-rows:Array`. The wrapper
   carries the fix at `class-sgs-container-wrapper.php:506` and **51 `is_array()` guards** in total,
   and contract §12 (`:923`) warns verbatim: *"Check the legacy read before making any further property
   tier-capable."* **Nothing gates this today** — it is a per-property manual step, which is exactly why
   it belongs in the definition of done rather than in someone's memory.
7. **Old canary pages holding the pre-migration shape: trashed** (ruling B) — and **`trash` is not
   `purge`**. Use `wp post delete <id> --force`; an ordinary trash leaves the row (and its revisions)
   in place. Where a page is still wanted, recreate it via WP-CLI/REST and re-insert the block.
   ⚠ **The rebuild path has its own silent-loss mode** (Rater A): a hand-written insert is precisely the
   shape that produced D338's 45 silently-discarded attrs, because WP drops any attr `block.json` does
   not declare. **After rebuilding, run `audit-post-content-blocks.py` against the new `post_content`**
   — its `undeclared-attr` detector is exactly this check — before calling the rebuild done.
8. **Where else the old shape survives a page deletion** — enumerated, because "trash the page" does not
   reach all of it:
   - **Revisions.** Measured 2026-08-10: of 109 stored instances of the three opted-in blocks, **82 were
     `post_status='inherit'`** (revisions). Reproduce with
     `wp db query "SELECT post_status, COUNT(*) FROM \$wp_posts WHERE post_content LIKE '%sgs/site-header-row%' GROUP BY post_status"`.
     They survive a trash. Either purge them or record explicitly that nothing re-reads a revision, so
     stale values there are inert — **but state which**, do not leave it unaddressed.
   - **Theme patterns.** Clean for passes 1-3 (no `gap`/`maxWidth`/`gridTemplateColumns` siblings), but
     **three files hold `columns` siblings, which lands in pass 4**: `patterns/footer-columns.php:17`
     (`columnsTablet:2`), `patterns/mega-brands-1.php:17` (`columnsTablet:3`, `columnsMobile:2`),
     `patterns/mega-media-cards-1.php:17` (`columnsTablet:2`, `columnsMobile:1`). ✅ **Already protected:**
     `check-dead-pattern-attrs.py` is green today *because those attrs are still declared*, and will go
     RED the moment pass 4 deletes them from `block.json`. Pass 4 must update those 3 files; the existing
     gate is the net. No new guard needed.
   - **Not yet checked, and worth one query before pass 1:** `wp_block` (reusable blocks),
     `wp_global_styles`, autosaves. ⚠ Also UNPROVEN: whether `check-dead-pattern-attrs.py` catches the
     *declared-object-but-stored-flat* coercion or only the wholly-undeclared case — read the script.
9. `decisions.md` D-entry + `LEDGER.md` replaced, in the same commit as the change.

## Out of scope

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
