# Track L (label l-layout; plan Task 14): the layout items the dropped `layout` branch never started

Start now from `main` on your own branch. Evidence: `.claude/plans/2026-11-24-clone-root-fixes.md` RF5, its Restore map and "Built-check corrections" (the sections naming these items only). Each with a test that fails on main.

1. Indus hero content in a two-column grid. `heroInner` used to unwrap the hero's layout wrappers (proven at `0ea1a6cb2~1`). Prove the trigger first (`822b6b400`, the paint guard, or the removed hero picture), then restore the unwrap. When an unwrap promotes children into a grid, re-derive the grid's tracks (250 unwrap rows; hero content squeezed). Guard: a post-Fill check that explicit tracks match the in-flow child count.
2. Mama's header order: `lib/skeleton-header-slots.mjs::mergeWidthAlternatives` drops moved nodes to the tail (since `647007ae1`). Moved nodes keep their own slot in each width's order. Guard: a reading-order check (visible nodes follow their draft elements' order at each width).
3. Mama's logo `maxHeight`: built and broken (`9454cb152`, `31ac60837`) by the site look's `max-height: none`. Prove which fix applies: `blockPaint` treats a declared `max-*: none` as unbounded, or the look stores measured boxes.
4. Social icon sizes: Mama's footer wrote 48px and 20px on 2026-11-19 (`0acc3d028`) and a later change lost them (suspects include `43c395b42`). Bisect with the offline sweep, then fix the cause.
5. `sgs/media` ratio and height (Indus mega cards): Spec 49's `style-rows`, `fill-height` and `absorb` modules are built but never wired. Pass element reads through `slotFromReads` in `lib/fill-media.mjs::mediaDecisions` so the slot's `ratio` is written.

Do not touch the apply width family (`maxWidth`).

Done when: the offline sweep of `indus-foods/home`, `indus-foods/header`, `mamas-munches-redesign/header` and `mamas-munches-redesign/footer` against `baseline-main` shows the Indus hero two columns with matching tracks, Mama's header in draft order at 375, 768 and 1440, the logo `maxHeight` and the 48px and 20px social icon sizes written, and the Indus mega card images' ratio written, with no surface worse.
