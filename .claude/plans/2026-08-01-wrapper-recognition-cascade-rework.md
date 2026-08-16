---
doc_type: plan
project: small-giants-wp
created: 2026-08-01
track: Track 1 — cloning pipeline
status: SCOPED, NOT STARTED — this is the next session's Phase 1, in full
spec: .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md §2.3 / §2.4 / §3.A / §13.2
owner_decision: Bean, 2026-07-31→08-01 (the relational L2 model is HIS, not derived)
---
Invoke /autopilot before doing anything else.

# Wrapper recognition — cascade rework + universal L-identification

**Read this whole file before touching code. It is the register for the session.**

---

## ⛔ READ FIRST — four claims I made last session that were WRONG

Each was corrected by Bean with evidence. Do not re-derive them, and do not
re-introduce the thinking behind them.

1. **"The pipeline is losing repeater content."** WITHDRAWN. The pipeline behaves
   as specified. Two separate real defects were found instead (both now fixed and
   committed — see "Already shipped" below).
2. **"The tabs draft is malformed — 2 triggers but only 1 panel."** WRONG. One panel
   is the CORRECT static representation of tabs: the triggers switch what is shown
   in the single panel, and a static draft can only author the active tab's content.
3. **"Map `__panel` → `sgs/tab` via forced parentage."** WRONG, and it was proposed
   without reading `sgs/tab`'s attributes. `sgs/tab` declares `label` (role
   text-content, emit_shape=**child**) and IS the panel (`render.php` emits
   `role="tabpanel"`, content is `$content`). One `sgs/tab` = the trigger's LABEL
   plus the panel's CONTENT, synthesised. Neither `__nav` nor `__panel` maps to a
   `sgs/tab` on its own.
4. **"A structural wrapper declares only layout CSS; background/border disqualify."**
   WRONG twice over. Our own corpus has `__nav` carrying `border-bottom` and a
   `__content` wrapper carrying `background`; and `CLAUDE.md:210` requires composites
   to mirror `sgs/container`'s wrapper capabilities **including `background`**, with
   Spec 31's L1 OUTER row routing `background*` and `border*` to the wrapper.

---

## ⭐ BEAN'S MODEL — the thing to build (his words, not a derivation)

> "The way to tell it's a fake wrapper is the fact that the parent (AKA L1) is a real
> block equivalent, that block is a type of container, but it barely has any CSS
> applied to it. Just think about it, a parent block that's a container equivalent and
> then a direct child that has literally no content in it but it has all of the CSS
> that the L1 was missing like the display type, gaps etc. That's a very clear L2."

**The signal is RELATIONAL, not per-element.** The L2 is identified by the
parent↔child pairing:

- the PARENT is a recognised container-equivalent block, and carries little/no CSS
- the CHILD has no content of its own
- the CHILD carries the layout CSS the parent is missing (display, gap, tracks…)

Two supporting rulings from the same conversation:

- **L1 and L2 can BOTH carry L3 CSS.** `__nav` having `gap` + multiple same-type
  children is arrangement (L3) sitting on an L2. So a border/gap on a wrapper is not
  evidence against it being a wrapper.
- **Borders belong to the structural cluster.** They make invisible structure visible;
  they do not make a node content. Bean added them to his structural cluster
  deliberately.

---

## THE THREE QUESTIONS TO ANSWER AT THE START OF THE SESSION

Bean deferred these from 2026-08-01 explicitly. Answer them **before** designing.

### Q1 — universal or per-site?

Are any of the current fake-wrapper mechanisms used **outside** the cascade, or should
one universal script replace all of them? Extend the same question to the other Ls:
once the cascade's logic is settled, can L1/L3/L4 identification be universalised the
same way? The deliverable is a decision + the roster of call sites it must serve.

### Q2 — the FULL cascade, in order

Give the **complete** set of mechanisms with their branching logic for L1→L4 in
execution order. Last session produced 4 disconnected pieces and Bean's verdict was
that pieces are useless without the whole picture. This must be the whole cascade,
start to finish, with every branch.

> **Q2 INPUT — the DECISION/TRANSFER seam (measured 2026-08-01, `d2d0579f`).** The
> cascade has two halves and only the first is being reworked:
>
> | | mechanism | status |
> |---|---|---|
> | **DECISION** — does this wrapper dissolve? | `_sole_passthrough_child` (mechanism #2) → to be replaced by `l2_qualify.qualify` | the rework |
> | **TRANSFER** — where does a dissolved wrapper's CSS go? | `fold_helpers.fold_band_css` (`entry.py`'s own note calls it "the L2 fold") | NOT in scope; leave it |
>
> Two findings that bind the wiring:
>
> 1. **The transfer had to be fixed FIRST.** `l2_qualify._lands_on_parent` returns True
>    for `display` on every container-kind block (container / trust-bar / tabs), so
>    requirement F passes a band partly BECAUSE its `display` is believed to have a
>    destination. That was false until D446 — the transfer dropped it. Wiring the
>    qualifier before fixing it would have widened what dissolves while their
>    arrangement kept vanishing. **Re-measure that the transfer is lossless before
>    wiring; don't assume it.**
> 2. **Wiring widens the sibling count — a known hazard, deliberately not pre-solved.**
>    The old gate demands exactly ONE element child; the qualifier has no such
>    requirement (that is the point — it is what unblocks tabs). Two
>    arrangement-bearing bands under one parent would race for the owner's `layout`
>    attr (setdefault, first wins, silently). **Measured across the homepage draft, the
>    product draft and `sgs-tabs-realistic`: ZERO parents yield >1 qualifying band, and
>    the two gates disagree on ZERO parents.** So it is a re-measure-at-wiring item, not
>    a speculative fix. Only ONE arrangement-bearing L2 band exists on real drafts
>    today: `sgs/trust-bar__inner`.

### Q3 — no background/border in the allowlist, then measure

Do NOT special-case `background`/`border` into the permitted set. Build the L2
qualifier WITHOUT them, then run it across:

- `sites/mamas-munches/mockups/homepage/index.html`
- the product page draft
- the (reworked) tabs example

…with **temporary debug logging** that, for every node that FAILS the L2 qualifier,
records **which requirement failed** and **the specific value that caused it**. The
point is to discover empirically what the allowlist actually needs to contain, rather
than asserting it. Bean expects `__nav`-shaped cases to surface here.

---

## TASK 0 (opening task) — rebuild the tabs conformance fixture

`plugins/sgs-blocks/scripts/tests/fixtures/conformance/sgs-tabs.html` is 29 lines and
**Bean loaded it in a browser: it renders bare-bones and broken.** It does not
represent tabs as they would appear in any real website or app draft. Some of its
shape (the `border-bottom`, the child structure) is likely just poor authoring and has
been actively misleading the analysis.

Build a FRESH, realistic tabs draft — separately, not by patching this one. It must be
SGS-BEM conformant (Spec 00 §3.1) and look like tabs a real client draft would carry.
Keep the old one until the new one proves out, then retire it.

Current content, for reference:

```html
<style>
.sgs-tabs        { padding: 48px 24px; }
.sgs-tabs__nav   { display: flex; gap: 8px; border-bottom: 2px solid #e5e0db; margin-bottom: 24px; }
.sgs-tabs__trigger { padding: 10px 20px; font-size: 14px; font-weight: 500;
                     color: #5c4f46; background: none; border: none; cursor: pointer; }
.sgs-tabs__panel { padding: 16px 0; }
</style>
<section class="sgs-tabs">
  <div class="sgs-tabs__nav">
    <button class="sgs-tabs__trigger">Ingredients</button>
    <button class="sgs-tabs__trigger">Nutrition</button>
  </div>
  <div class="sgs-tabs__panel">
    <p>Oats, honey, flaxseed, coconut oil.</p>
  </div>
</section>
```

---

## THE ROOT CAUSE (proven 2026-07-31 — do not re-investigate, verify if you wish)

**The table that decides "real block or fake wrapper?" is built by filtering out
exactly the rows that say "fake wrapper".**

`db_lookup._slot_alias_to_standalone()` builds its map with:

```sql
SELECT slot_name, aliases, standalone_block FROM slots
WHERE scope='element' AND standalone_block IS NOT NULL AND standalone_block != ''
```

A slot declaring `standalone_block = NULL` — the DB's way of recording "this element is
structural, it has no block equivalent" — **never enters the map**. So the `nav` slot
(which correctly has NULL) can never win, and the only `nav` key in the map is the one
donated by the `items` slot's alias list → `sgs/info-box`.

`_resolve_slug_from_bem_tuple()` Path 2 then returns "the first canonical_slot **whose
standalone_block is set**", i.e. it is structurally incapable of returning "this is a
wrapper".

**Consequence:** pass-through detection currently works BY ACCIDENT — `__inner`
resolves to None only because no block-bearing slot happens to claim the word "inner".

**Measured blast radius — 4 of 64** element-scope slots declaring no block equivalent
are hijacked by a greedy alias:

```
__attribution  -> WRONGLY resolves to sgs/text
__nav          -> WRONGLY resolves to sgs/info-box
__ribbon       -> WRONGLY resolves to sgs/text
__slot         -> WRONGLY resolves to sgs/info-box
```

`__attribution` is the one to worry about beyond tabs — it is standard in testimonial
and quote drafts.

**Reproduce:**

```python
# from plugins/sgs-blocks/scripts
import sys; sys.path.insert(0,'.')
from converter.db import db_lookup as db
print(db.resolve_slug_from_bem(['sgs-tabs__nav']))   # 'sgs/info-box'  (wrong)
print(db.resolve_slug_from_bem(['sgs-card-grid__inner']))  # None      (right, by luck)
```

---

## THE FOUR COMPETING MECHANISMS (the evidence that a rework, not a patch, is needed)

| # | mechanism | file | decides from | verdict |
|---|---|---|---|---|
| 1 | `layer_detect()` | `converter/services/layer_detect.py` | CSS signature + structural position, explicitly "NEVER its class name" | sound, name-free |
| 2 | `_sole_passthrough_child()` | `converter/services/extraction.py:360` | **recognition** (`only_rec.slug is None`) + parent-not-arranging + **exactly ONE** element child | alias-vulnerable |
| 3 | `_is_absorbable_wrapper()` | `converter/services/section_passes.py:57` | BEM class + has Tag children + root class not a registered block + **NO spacing/positioning CSS** | contradicts #1 |
| 4 | implicit `resolve_slug_from_bem() is None` | `converter/db/db_lookup.py` | the alias map | hijackable |

**Direct contradiction:** #3 treats `padding`/`margin`/`gap` as DISQUALIFYING a wrapper
("child has spacing rule → not absorbable"), while #1 uses `max-width` **+ `margin`** as
the IDENTIFYING signature of the content band. Same property, opposite meanings, two
files.

**Why tabs cannot fold today — two independent blockers:**
1. `__nav` has false block identity, so `only_rec.slug is None` fails (mechanism #2).
2. `_sole_passthrough_child` demands the parent have **exactly one** element child.
   `.sgs-tabs` has two (`__nav`, `__panel`), so it could never fold even with
   recognition fixed.

---

## MANDATORY READING

- **Spec 31 IN FULL** (750 lines — project rule, every cloning session, not a grep).
  Especially §2.3 (layer decomposition), §2.4 (the recursive fold / pass-through
  definition), §2.5 (grid items), §3.A (CSS branch), §13.2 (walker contract + the three
  permitted exceptions, R-31-3).
- The cascade scripts IN FULL (~2,760 lines at the time this list was written; `resolvers/grid_area.py`
  deleted 2026-08-16, D642 — it was dead code, struck below rather than silently dropped):
  `services/layer_detect.py` · `resolvers/outer_box.py` · `resolvers/content_band.py` ·
  `resolvers/grid.py` · ~~`resolvers/grid_area.py`~~ (deleted, D642) · `services/fold_helpers.py` ·
  `services/css_pass.py` · `dispatch_table.py` · `services/section_passes.py` ·
  `services/arrangement.py` · `services/attr_resolve.py`
- `.claude/STOP-CATALOGUE.md`
- This file's "READ FIRST" section.

---

## USEFUL EXISTING MATERIAL (do not rebuild these)

- **`db_lookup._TYPOGRAPHY_CSS_SCOPE`** — a DB-sourced frozenset of typography
  properties, already used by `dispatch_table` as a pre-layer sink. If the qualifier
  needs a "content-bearing property" set, this is the single source — do not author a
  new list (R-31-1).
- **`arrangement.carries_arrangement(node, css_rules)`** — already implements §2.4's
  grid-item-test-first. If the parent arranges, its children are grid items, not
  wrappers. This is the principled replacement for any sibling-counting heuristic.
- **`db_lookup.atomic_tag_map()`** — the shared tag→block map (`h3`→`sgs/heading`).
- **`content_gap_collector`** (NEW, `989b761d`) — content gaps and fuzzy-fallback
  events now surface out of `convert_section` as `content_gaps` and are written to
  `content-gaps.json`. **Use this for the Q3 debug logging rather than inventing a
  parallel channel.**

---

## ALREADY SHIPPED (2026-08-01, both pushed to main)

| commit | what |
|---|---|
| `4f83e8d5` | **Bare tags inside a repeater now lift.** Every tier of the array item-field matcher started from `_bem_token(node)`, so a card written as `<h3>`/`<p>` matched nothing and the whole repeater lifted zero items. Added L3, a tag-shape identity tier using the shared `atomic_tag_map`, ties resolved by document order against `field_order`. Strictly additive. Also: `sgs/option-picker` never declared `supports.sgs.arrayContentLift`, so its options could never transfer. ✅ **The "needs a `/sgs-update` reseed" clause is CLOSED (verified 2026-08-01) — it was already done.** `block_capabilities` row 6597 `(sgs/option-picker, array-content-lift)` present; `array_item_schema` holds `optionItems.key`/`.label`; the resolver derives `label → slot 'label' / role 'text-content'` live (`key` correctly has no content role). `arrayContentLift:true` is committed in block.json at `4735b6cf`, so it re-seeds from source. No action owed. |
| `d2d0579f` | **The L2 TRANSFER now carries `display` (D446).** A dissolving band's `display:grid\|flex` was dropped by GAP-3 while its `gap`/`contentWidth`/`flexWrap`/`justifyContent` folded — so the owner rendered `display:block` and every folded arrangement property was inert. Spec 31 §2.4 already mandates the fold-up ("folded up from a sole arrangement inner — brand, trust-bar"). `fold_helpers._fold_band_arrangement` routes `display`→`layout` via `arrangement.layout_attrs` and `grid-template-*`→the grid resolver in a **GRID-pinned** second pass (pinning is load-bearing — putting the tracks in the main stream flips `layer_detect` and degrades the band's `max-width` from `contentWidth` to an UNIMPLEMENTED_STUB, so simply deleting the exclusion is a regression). **⚠ This is a PREREQUISITE for Q2's wiring, not a competitor to it** — see the note below. |
| `989b761d` | **Content gaps are surfaced instead of discarded.** Also found that `ledger/content_gap_check.py` (26 June) and `ledger/content_coverage_check.py` (4 July) have been passing since June because **nothing ever wrote `content-gaps.json`** — the missing writer is now built. |

---

## DELIBERATELY NOT DONE — leave alone until the rework proves out

**Do NOT add `trigger` as an alias of the `tab` slot.** Bean is holding tabs as the
proof case: if the reworked recognition is right, tabs should clone correctly WITHOUT
any vocabulary change. Only after that is proven should the alias question be revisited
(and it may then be unnecessary).

---

## ACCEPTANCE

1. The three questions (Q1/Q2/Q3) answered with evidence, before any code.
2. A fresh, realistic tabs fixture that renders correctly in a browser.
3. The L2 qualifier built WITHOUT background/border in the allowlist, run across the
   Mama's homepage draft, the product page draft and the new tabs fixture, with
   per-failure debug output naming the failed requirement and the offending value.
4. The allowlist then decided FROM that measurement, not asserted.
5. Tabs clones correctly with no alias added.
6. `__attribution` / `__ribbon` / `__slot` no longer mis-resolve.
7. Converter suite green (baseline **587 passed, 1 skipped** — was 586; `d2d0579f`
   added one test, see the D446 row above); the conformance failing
   SET byte-identical to baseline (27 pre-existing stale goldens) — compare the SET,
   never the count.
8. Every new gate ships with a `--self-test` that proves it can fail in BOTH
   directions.
9. `/qc-council` before any commit touching converter or pipeline (blub.db 255).

## METHODOLOGY GUARDRAILS

- **Read the thing before theorising about it.** Four wrong calls last session, all
  the same shape: a claim about code/data I had not read.
- **A matching total is not a matching result** — compare SETS (`comm -23`), never counts.
- **Shared worktree.** Commit by EXACT PATH with `-- <paths>` (a pre-commit gate
  enforces this), `git fetch` first, never `git add -A`, never `git stash`.
- **A gate that cannot fail reads green forever** — this session found the third
  instance. Ship every gate with a planted-failure proof.