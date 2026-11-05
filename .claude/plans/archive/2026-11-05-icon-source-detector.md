---
doc_type: plan
title: Icon-source detector reads its kinds from the database and runs in the gates
status: done
created: 2026-11-05
owner: framework tooling (any session; reseeds on a private copy, see .claude/dev-setup.md "Reseeding on a private copy")
---

# Icon-source detector reads its kinds from the database and runs in the gates

## Why

The Icon block (`sgs/icon`) offers its icon from several sources, chosen by the setting `iconSource`: a Lucide icon, a WordPress icon, a Dashicon, an emoji, a brand logo or the author's own SVG. Each source keeps its choice in a different setting, and the framework labels those settings with a role (`icon-lucide`, `icon-wp-icon`, `icon-dashicon`, `icon-emoji`) so tools know which setting holds which kind of icon.

A detector ("Mechanism C" in `plugins/sgs-blocks/scripts/content-role-detect/detector6_native_support_and_style_emission.py`) works those roles out from a block's own code instead of from a hand-written list. Its tier in `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` (the `icon_family_corrections` tier, guarded by `role NOT LIKE 'icon-%'`) repairs other blocks with it; it was built because `sgs/separator` had these roles wrong. The detector proves itself against `sgs/icon` first (its self-test case 9) before it is trusted to change anything.

`sgs/icon.iconSource` now has six values (`brand` and `custom` were added) and the detector accepts only a source list that is exactly the four old kinds (`_ICON_KIND_VALUES`, `_icon_source_selector_attr_from_text`), so on `sgs/icon` it finds nothing. Effect: the four `sgs/icon` roles are still right only because `plugins/sgs-blocks/scripts/attr-classification-overrides.json` pins them by hand; the detector's own self-test is red on `main` and no gate runs it; and any block that adds an icon source drops out of the automatic repair without a warning. `brandName` (role `text-content`) and `iconSvg` (role `svg`) hold no icon role. Seeded roles are unaffected today (9 attributes hold an `icon-*` role: 4 on `sgs/icon`, 4 on `sgs/separator`, 1 on `sgs/before-after`).

## Steps

0. **Read the whole red first.** Run the detector's self-test on a full tree (`python plugins/sgs-blocks/scripts/content-role-detect/detector6_native_support_and_style_emission.py --self-test` from a worktree at `origin/main`) and list every failure. The four `sgs/icon.*` failures are known; a run on a partial tree showed ten more that may be artefacts of the partial tree, so confirm each on the full tree and fix or record every one before step 5.
1. **Take the icon kinds from the database.** The `roles` table already holds the kinds (`icon-lucide`, `icon-wp-icon`, `icon-dashicon`, `icon-emoji`; `icon-slug` is the array-item spelling and is not a kind); `plugins/sgs-blocks/scripts/lib/identity_markup.py::load_db_inputs` already derives them with `SELECT role_name FROM roles WHERE role_name LIKE 'icon-%'`. Replace `_ICON_KIND_VALUES` with the same derivation (FP-1: no hand-written dict).
2. **Match a source list that contains the kinds, not one that equals them.** The selector is the enum attribute whose values include every known kind that has a role; extra values (`brand`, `custom`) are reported as "no role for this source" and skipped, never guessed. Keep the negative control: an attribute named `iconSource` whose enum lacks the kinds is still rejected.
3. **Make the branch logic work for any number of kinds.** `_branch_windows` finds one render branch per kind and its fallback ("exactly one kind missing and a bare `else`: the else is the missing kind") assumes four; with extra values the else may belong to a source with no role. Resolve each known kind from its own branch only.
4. **Update the self-test.** Case 9 still expects `sgs/icon`'s four roles; add a synthetic block with a six-value source list and a block whose list lacks the kinds.
5. **Wire the self-test into `plugins/sgs-blocks/scripts/gates.json`** (fast tier, shape as the other `--self-test` entries) so this cannot go red unseen again; run `python plugins/sgs-blocks/scripts/run-gates.py --self-test` and `--assert-wired`. Only possible once step 0's failures are all green or deliberately recorded with an owner.
6. **Prove the seeded roles did not change.** On a private copy (`publish-framework-db.py begin --copy <copy>`, then `sgs-update-v2.py --db <copy>`), compare `block_attributes.role` for every `icon-%` row with the shared database: identical, or every difference explained. `plugins/sgs-blocks/scripts/verify-reseed-identity.py` between a baseline and a candidate worktree is the whole-database check.

## Not in this plan (Bean's decision first)

Whether brand logos and custom SVGs get their own roles (`icon-brand`, `icon-custom`) depends on whether the cloning route must place a draft's brand logo or custom SVG into `brandName` or `iconSvg`. The old converter that dispatched on `icon-<kind>` no longer exists; the cloning route's handling of these two sources has not been checked. Add the roles only when Spec 48 shows a need.

## Done when

The self-test is green on a full tree and runs in the fast gate tier, the detector resolves `sgs/icon` and `sgs/separator` from their code, a block with extra source values no longer drops out silently, and a private-copy reseed leaves every `icon-%` role as it was.

## Outcome

Done 2026-11-05. `detector6_native_support_and_style_emission.py::icon_kinds` reads the kinds from the `roles` table; `_icon_source_selector` accepts any enum that contains them; `icon_source_values_without_role` reports the rest (`brand`, `custom`), which detect() prints on stderr and skips; `_branch_windows` keeps every place a kind is tested, ends a window at a no-role source's branch and gives the bare `else` to the last kind only when the source list holds no extra value. Step 0 found five failures on the full tree: the four `sgs/icon` ones and `sgs/nav-drawer.sgsCustomCss` (that render.php no longer reads it since the generic custom-CSS helper; the case now uses `panelSize`); the ten extra failures of the partial-tree run were artefacts. The self-test (20 checks) is gate `detector6-icon-source-selftest` in the fast tier. Step 6: `verify-reseed-identity.py` between `origin/main` and the change showed every table and repo file identical (only a Stage 12 log line cut at 120 characters at a different place because the two worktree paths differ in length); all 100 blocks' icon-family resolution is identical before and after the window-boundary change. `icon-brand` / `icon-custom` roles remain Bean's decision (above).
