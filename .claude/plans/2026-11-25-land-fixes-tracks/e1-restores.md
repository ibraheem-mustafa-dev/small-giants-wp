# Track E1 (label e1-restores; plan Task 8): restores, part 1

Start from `main` once rf4 and rf10 have merged (the main session tells you). Evidence: `i6-restores.out` items 1, 6 and 7; per-commit patches in `E:\sgs-tmp\general-cloning\investigate\i6-restores\<sha>.lib.patch`. Already landed through Task 2, so verify and skip: `19b0b1395` and `8c48dec56` (as `ea40c9ee9` and `dac31d9a1` on rf4). Yours:

1. Link-only lists (`682a34d40`): `lib/fill-list-content.mjs::listDecisions`, its test, and Spec 48 §3.4 brought in line with FR-48-97.
2. The slider's visible-card count (`608b690b1`): port the reading (`visibleCount`) and write the per-device `slidesVisible` object directly.
3. `dcLogic('<name>').setState` reach calls (`4858883f8`'s change to `lib/intake-reach-calls.mjs`).

Each with its test failing on old main and passing after.

Done when: an offline Fill keeps the Indus brands panel's 10 links (`indus-foods/mega-brands`) and writes 2 cards at 768 on Mama's reviews rail (`mamas-munches-redesign/home`).
