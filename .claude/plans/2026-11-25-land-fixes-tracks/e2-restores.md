# Track E2 (label e2-restores; plan Task 8): restores, part 2

Start from `main` once rf4 and rf6 have merged (the main session tells you). Evidence: `i6-restores.out` item 4 and its Restore-map section; the Restore map in `.claude/plans/2026-11-24-clone-root-fixes.md` with its "Built-check corrections"; patches in `E:\sgs-tmp\general-cloning\investigate\i6-restores\`, and `run-rec2.mjs` there for the recognisers. Already landed through Task 2, so verify and skip: `7f18560bd` (rf4 `3a6be2cd3`), `7721da8e2` (rf1 `c391fb8a1`), `82bc238bf` (rf6). Yours, each checked against today's files first:

1. The code-reading motion recognisers as an ordered chain: `de991e5c9`, `b2bd67359`, `86bee91ae`. Keep today's `scrollShrinkOf` and `lib/fill-header-sticky.mjs`.
2. Then `421c512f9`, `bfb53147d`, `52aca34ef`, `1294b5ae3`, `2a393e23a`, `99770b683`, `36044f919`, `e8a7a8916`; check `a979a54c9` against `bf7d225b9` and `9294f12ab` last. `lib/element-facts.mjs` exists on main but lacks `7f18560bd`'s `textHoles` lines, if any item needs them.

Each with its test failing on old main and passing after.

Done when: `run-rec2.mjs` over the proof records in `E:\sgs-tmp\wt-clone-in` recognises Indus's open-status dot pulse (footer, contact) and the drawer accordion scroll.
