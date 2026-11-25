# Track A1 (label a1-fixes; plan Task 2): fix rf1 and rf6 before they land

Evidence: `i1-branches.out` rows rf1-match and rf6-motion. Work in the existing worktrees `E:/sgs-tmp/wt-rf1-match` and `E:/sgs-tmp/wt-rf6-motion` (skip Setup step 1; use your label `a1-fixes` for temp, scratch and slots).

**rf1-match.** `node.drawnVariants` is read in `scripts/computed-route/lib/fill-prop.mjs` (passed as `variants: node.drawnVariants || []` to `lib/resolve.mjs`) and nothing sets it, so the 21 `featured*` settings on `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` can never be written. Do not remove the gate (that re-opens the proven fault of Mama's plain-link hover going into `featuredBgHover`). Find where the skeleton could mark a node as drawn in a variant (`lib/skeleton-*.mjs`); if it can, set `node.drawnVariants` there; if no code can ever see a featured item (no draft uses one; the 2026-11-24 plan left featured items), set nothing and say so. Proof: a unit test where a node with `drawnVariants: ['featured']` takes `featuredBgHover` and a plain node takes `itemBgHover`, and an offline Fill of `indus-foods/header` and `mamas-munches-redesign/header` showing the same `featured*` writes as `baseline-main` (zero today). Rebase onto `main` after.

**rf6-motion**, in this order:
1. Finish the in-flight cherry-pick of `82bc238bf`: resolve `README.md` (keep both sides), `lib/intake-inventory-trigger.mjs` and `lib/motion-record-text.mjs` (keep this branch's new parts plus main's), confirm `lib/fill-motion.mjs` has no markers, then `git add <paths>` and `git cherry-pick --continue`.
2. Rewrite the unstaged `plugins/sgs-blocks/tests/php/RowScrollSettingsRenderTest.php` so it asserts no `padding-*` transition is printed unless `rowShrinkDuration` or `rowShrinkEasing` is set (it currently asserts a 200ms default), then commit it.
3. Change `plugins/sgs-blocks/includes/helpers-row-behaviour.php::sgs_row_shrink_settings_css` to match: no default easing; the clone writes the timing from the draft.
4. Rebase once onto `main`.
5. Only if under 30 minutes and one function: `holdDefaults` and `sgs/text`'s fixed 300ms. Otherwise list it.

Done when: both branches' changed tests pass, `check-mutation-lists.mjs` shows 0 new on each, and the rf1 proof above is shown.
