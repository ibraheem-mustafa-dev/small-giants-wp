---
doc_type: report
title: "R1 rescoped work-list — tier_object emission, DB-cross-referenced against the D554 xfail tests"
date: 2026-09-10
status: MEASUREMENT — supersedes the 2026-08-11 groundwork survey (105 families/41 blocks) and
  corrects the 2026-09-10 banner's "typography still open" claim in
  `.claude/plans/cloning-pipeline-tier-migration-requirements.md`.
---

# What this is

A live re-run of "what does R1 (object-shape tier emission) still need?", using the new
`block_attributes.tier_shape` column (shipped `58642349d`) cross-referenced against the D554
`xfail(strict=True)` tests and the resolver/merge code directly. Every number below is a live
query or a direct function call, run 2026-09-10 — re-run rather than copying forward, per this
project's own R7.2 rule.

**Headline correction:** R1 is materially closer to done than the plan doc's own 2026-09-10
banner claims. Of the 449 `tier_shape='tier_object'` rows, 432 (96.2%) are already handled by
one of two GENERIC mechanisms already wired into the converter — no per-property code is needed
for them. Only **17 attributes across 9 blocks** are genuinely uncovered. Separately, the 10
existing xfail tests are **stale, not accurate** — they assert a flat shape the resolvers no
longer produce, and should be flipped to real tests (a test-only change, not a code change).

## Method

1. `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, attr_name FROM block_attributes WHERE tier_shape='tier_object'"` → **449 rows, 64 distinct blocks**.
2. `grep -rn "D554 ruling C" --include=*.py plugins/sgs-blocks/scripts/converter/tests` → **10 xfail tests**, covering **7 distinct (block, attr) pairs across 3 blocks**: `sgs/container.{contentWidth, gridTemplateColumns, columns, gap}`, `sgs/heading.{fontSize, lineHeight}`, `sgs/media.order`.
3. `python -m pytest converter/tests/test_css_resolvers.py converter/tests/test_css_pass_partition.py converter/tests/test_outer_box_step12_properties.py -q` → **44 passed, 10 xfailed, 0 unexpected (no xpass)** — the suite genuinely still fails these 10 the old way, confirming they are live signals, not dead markers.
4. Called the resolvers directly (`typography.resolve()`, `grid.resolve()`, `outer_box.resolve()`, `content_band.resolve()`) and the full merge seam (`converter.dispatch_spine.process_element(...).attrs()`) with multi-tier `Decl` lists, to see what the converter **actually emits today**, independent of what the xfail tests assert.
5. Cross-referenced every `tier_shape='tier_object'` row against two live DB predicates already used by the converter at resolve/merge time: `db_lookup.tier_object_base(slug, attr)` and `db_lookup.box_family_is_tier_shaped(slug, attr)`.

## Finding 1 — the 7 xfail-tested attributes are ALREADY object-shaped at both resolver and merge level

Direct calls, not inference:

```
typography.resolve(Decl("font-size","58px","Base"), ctx(slug="sgs/heading"))
  -> Write(attr='fontSize', value={'desktop': 58}, ...)

process_element(ctx, [Decl("font-size","58px","Base"), Decl("font-size","40px","Tablet"),
                       Decl("font-size","34px","Mobile")]).attrs()
  -> {'fontSize': {'desktop': 58, 'tablet': 40, 'mobile': 34}, 'fontSizeUnit': 'px'}

grid.resolve(...)      -> gridTemplateColumns / columns emit {'desktop': ...}, merge to full object
outer_box.resolve(...) -> sgs/media.order emits {'desktop': '3'}, merges to {'desktop':'1','tablet':'2'}
content_band.resolve() -> sgs/container.contentWidth emits {'tablet': '720px'} per-call
```

**Mechanism, not luck.** `typography.py`, `grid.py`, `outer_box.py`, `content_band.py` and
`styling_content.py` each gate on the SAME live DB predicate before falling through to the old
flat-suffix code path:

```python
if not decl.state and db_lookup.tier_object_base(ctx.block_slug, base_attr):
    return _tier_object_writes(...)   # or the resolver's own equivalent
```

(`converter/resolvers/typography.py:153`, `grid.py:196/240/271/309`, `outer_box.py:324`,
`content_band.py:321`, `styling_content.py:227`.) The shared writer is
`converter/services/tier_object.py::tier_object_write()`. At the merge seam,
`converter/dispatch_spine.py::ElementResult.attrs()` (~line 126) has its own matching branch —
`elif isinstance(w.value, dict) and db_lookup.tier_object_base(self.block_slug, w.attr):` — that
accumulates multiple per-tier partial writes into ONE combined object via `setdefault`, not a
shallow `.update()` (the G3 "shallow-merge risk" the plan doc flagged as unresolved is, for this
predicate, already resolved — first-write-per-key wins, tiers don't clobber each other).

**Conclusion:** for these 7 attributes, the xfail tests fail because the OLD assertion
(`"fontSizeMobile" in attrs`, a list of 1 flat Write, an int not wrapped in a tier key) no longer
describes reality — not because the converter is still flat. Per this project's own G9 "R1
completion ritual" (flip xfail → real object-asserting test in the same commit that makes it
pass), these 10 tests should be rewritten now. **No resolver code change is needed** — this is a
test-debt item, not a converter-debt item.

## Finding 2 — the DB reveals 432 more properties the xfail list never named, and most are already covered by the SAME two mechanisms

Classified all 449 `tier_shape='tier_object'` rows into 3 categories using the two live DB
predicates the converter itself already branches on:

| Category | Count | Mechanism | Needs new code? |
|---|--:|---|---|
| 1 — `tier_object_base()=True` | 339 | The 5-file resolver branch above (`typography`/`grid`/`outer_box`/`content_band`/`styling_content` → `tier_object_write()`) + the matching merge branch in `dispatch_spine.py` | **No**, IF the CSS property in question routes through one of those 5 files |
| 2 — `box_family_is_tier_shaped()=True` (and not already in 1) | 93 | The SEPARATE "TIER-of-BOXES" merge branch in `dispatch_spine.py::ElementResult.attrs()` (the one that nests a box's `{top,right,bottom,left}` under a tier key — `contentBandPadding`, `gridItemPadding` etc.) plus `tier_suffix()`'s own `box_family_is_tier_shaped()` bypass (returns the bare base attr instead of a suffixed name once a block has migrated off flat box-per-tier siblings) | **No** — same reasoning, already-built mechanism |
| 3 — neither | **17** | Nothing | **Yes — this is the real work-list** |

**7/7 of the xfail-tested attributes are Category 1.** The 442 attributes the xfail suite never
named are **425 in Category 1/2 (already mechanically covered)** and **10 in Category 3**
(7 of the 17 Category-3 rows belong to blocks also carrying xfail-tested attrs' siblings, listed
below).

## Finding 3 — the real 17-row work-list (Category 3, genuinely uncovered)

Every row below still declares the OLD flat per-tier sibling shape in its own `block.json`
(verified by reading the file, not inferred) — `box_family_for()` returns a real family for each,
but `box_family_is_tier_shaped()` returns False because the flat `{attr}Tablet`/`{attr}Mobile`
sibling ROWS are still declared, so neither generic mechanism engages:

| block_slug | attr_name | Verified in block.json | file:symbol (where the fix belongs) |
|---|---|---|---|
| `sgs/whatsapp-cta` | `borderRadiusTablet` | `src/blocks/whatsapp-cta/block.json` declares `borderRadiusTablet`/`borderRadiusMobile` as separate rows (lines ~186, ~190) alongside `boxFamilies.borderRadius: [borderRadiusTablet, borderRadiusMobile]` | S1 (block.json fold) — `scripts/migrate-tier-object.py --property borderRadius` |
| `sgs/whatsapp-cta` | `borderRadiusMobile` | (same as above) | (same) |
| `sgs/buybox` | `marginTablet` | `src/blocks/buybox/block.json` declares `marginTablet`/`marginMobile` rows + `boxFamilies.margin: [marginTablet, marginMobile]`; base `margin` is a native WP `supports.spacing.margin:true` flag, not a custom attr, which is why `tier_object_base()`'s sibling test can't see a base to fold onto | S1 fold + confirm whether the fold target is a NEW custom `margin` attr or stays native-WP-driven |
| `sgs/buybox` | `marginMobile` | (same) | (same) |
| `sgs/cart` | `marginTablet` | Same shape as buybox (mini-cart badge block) | S1 fold, same caveat as buybox |
| `sgs/cart` | `marginMobile` | (same) | (same) |
| `sgs/filter-search` | `marginTablet` | Same shape | S1 fold |
| `sgs/filter-search` | `marginMobile` | (same) | (same) |
| `sgs/label` | `marginTablet` | Same shape (`sgs/label` eyebrow/kicker block) | S1 fold |
| `sgs/label` | `marginMobile` | (same) | (same) |
| `sgs/site-footer-row` | `margin` | Declares its own explicit `margin`/`marginTablet`/`marginMobile` box-object trio (D496 migrated 32 flat scalars → 8 box-object attrs, but per-tier siblings were kept as 3 SEPARATE box objects rather than one TIER-of-BOXES envelope) | S1 fold — collapse the 3 siblings into ONE `margin:{desktop:{...},tablet:{...},mobile:{...}}` |
| `sgs/site-footer-row` | `padding` | Same shape as `margin` above | S1 fold |
| `sgs/site-header-row` | `margin` | Same D496 shape as site-footer-row (sibling block) | S1 fold |
| `sgs/site-header-row` | `padding` | (same) | (same) |
| `sgs/nav-drawer` | `drawerPadding` | Declares `drawerPadding`/`drawerPaddingTablet`/`drawerPaddingMobile` as 3 separate box-object rows | S1 fold |
| `sgs/nav-menu` | `submenuPadding` | Declares `submenuPadding`/`submenuPaddingTablet`/`submenuPaddingMobile` as 3 separate box-object rows | S1 fold |
| `sgs/container` | `gridItemBorderRadius` | **Anomaly, needs direct code read before fixing** — block.json declares ONLY `gridItemBorderRadius` (no Tablet/Mobile sibling rows at all: `"boxFamilies.gridItemBorderRadius":["gridItemBorderRadius"]`, self-referential), `attr_type=object`, `default:{}`, no nested schema — yet `box_family_is_tier_shaped()` returns False. Since there is no flat sibling to migrate away from, this looks like a `box_family_is_tier_shaped()` false-negative on the predicate itself (worth 10 minutes reading `converter/db/db_lookup.py::box_family_is_tier_shaped` before assuming a block.json fix is needed) rather than a real flat-shape defect | `converter/db/db_lookup.py::box_family_is_tier_shaped` (read first) |

**9 blocks, 17 attributes.** `migrate-tier-object.py`'s existing S1/S2/S3 triad
(`plugins/sgs-blocks/CLAUDE.md` "Tier-object migration triad") is the right tool for the 15
straightforward rows (whatsapp-cta / buybox / cart / filter-search / label / site-footer-row /
site-header-row / nav-drawer / nav-menu) — run `--survey --property borderRadius`,
`--property margin`, `--property padding` scoped to these blocks to confirm before `--fix --apply`.
The 17th (`sgs/container.gridItemBorderRadius`) needs the predicate itself read before any
block.json edit — do not blind-apply the codemod to it.

## Finding 4 — a genuine correctness risk the new column surfaces, outside R1's scope but worth flagging

Comparing `tier_object_base()=True` (the predicate the 5 resolvers ALREADY trust to branch into
tier-object mode) against the full `attr_type='object'` population (659 rows, not just the 449
tier_object ones) found **67 rows where `tier_object_base()=True` but `tier_shape` is `NULL` or
`box_only`** — i.e., the OLD ad-hoc predicate would wrongly treat a RECORD/ASSET/BOX attribute as
a device-tier object if any CSS declaration for it ever reached one of the 5 gated resolvers.
Confirmed live for one instance:

```
db_lookup.tier_object_base('sgs/gallery', 'padding')       -> True   (should be False — it's a BOX)
db_lookup.box_family_for('sgs/gallery', 'padding')         -> None   (seeding gap — every other
                                                                        block's `padding` has a
                                                                        box_family row; gallery's doesn't)
tier_shape column says: box_only
```

If a padding declaration for `sgs/gallery` ever reaches `outer_box.py`/`content_band.py`'s
`tier_object_base()` gate, it would wrap `{top,right,bottom,left}` under a `{"desktop": {...}}`
tier key instead of decomposing it into box sides — silent corruption, not a gap. Root cause is a
**DB seeding gap** (`block_attributes.box_family` is NULL for `sgs/gallery.padding` when it
should carry `'padding'` like every sibling block), not a converter bug. Other rows in this
67-count include `core/image.focalPoint`, `sgs/testimonial.orgLogo`, `sgs/container.shapeDividerTopScale`
— all RECORD/ASSET shapes the new `tier_shape` classifier correctly excludes but the older
`tier_object_base()` predicate does not. **This is out of R1's flat→object migration scope** (it's
a false-positive risk in the OLD predicate, not a missing object conversion) but is exactly the
kind of gap a DB column surfaces that a hand-maintained heuristic misses — flagging per the task
brief rather than fixing here (fixing it means either re-seeding `box_family` for the affected
rows or switching the 5 resolvers' gate from `tier_object_base()` to the new `tier_shape` column
directly, which is itself a design decision, not a mechanical fix).

## Summary counts (all live, re-run 2026-09-10 — do not copy forward per R7.2)

- `tier_shape='tier_object'` rows: **449**, across **64 blocks**.
- D554 `xfail(strict=True)` tests: **10**, covering **7 distinct attributes across 3 blocks**.
- Of the 449: **339 already covered by the resolver-level `tier_object_base()` mechanism**, **93
  already covered by the `box_family_is_tier_shaped()` TIER-of-BOXES mechanism**, **17 genuinely
  uncovered** (9 blocks).
- Full pytest run of the 3 files carrying the 10 xfail tests: **44 passed, 10 xfailed, 0
  unexpected** — confirms the xfail markers are still accurate as *test outcomes*, but 7 of the 10
  underlying attributes are functionally done at the code level; only the test assertions are
  stale.
- 67-row side finding (out of R1 scope): `tier_object_base()` over-matches 67 RECORD/ASSET/BOX
  attributes that the new `tier_shape` column correctly excludes — a latent corruption risk, one
  instance (`sgs/gallery.padding`) confirmed via a DB seeding gap, not yet reached by a live clone.

## Recommended next actions (not executed — this is a measurement task)

1. **Rewrite the 10 xfail tests** to assert the object shape (delete the `xfail` marker; the
   resolvers already emit the correct value — verified above). Zero resolver changes needed.
2. **Run `migrate-tier-object.py --survey`** scoped to `borderRadius` (whatsapp-cta),
   `margin`/`padding` (buybox, cart, filter-search, label, site-footer-row, site-header-row),
   `drawerPadding` (nav-drawer), `submenuPadding` (nav-menu) to confirm the codemod's classifier
   agrees with this report's 15-row list before `--fix --apply`.
3. **Read `box_family_is_tier_shaped()` against `sgs/container.gridItemBorderRadius`** before
   touching its block.json — it may be a predicate bug, not a data bug.
4. **Separately (not R1): re-seed `block_attributes.box_family` for `sgs/gallery.padding`/`.margin`**
   and audit the other 65 rows in the 67-count for the same NULL-`box_family` seeding gap, since
   that is what lets `tier_object_base()` over-match them.
