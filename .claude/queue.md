# Cross-track queue (append-only)

The signal between parallel sessions working the cloning tool plan (`.claude/plans/2026-10-23-cloning-tool-completion.md`, "How the work runs"): one line per event (`- <date> <track> <event> (<detail>)`), appended, committed and pushed at once. Read it before any reseed, deploy, calibration, mirror use, Fill run or framework-DB read, and write a start and an end line around each.

- 2026-10-27 S intake-start eye-care-ward-end (reach opener cff459cc6, Phase 2 close Wave A1)
- 2026-10-27 S intake-start indus-foods, mamas-munches-redesign (full re-run on current intake code, Bean)
- 2026-10-27 S intake-end mamas-munches-redesign (24 min, 1640 rows, 1602 carried, 18 changed all matching earlier rulings; review applied, page map unchanged)
- 2026-10-27 S intake-end eye-care-ward-end (83 min, 1504 rows; S-27 and the bag drawer reached via reach with roots; review held until the choice-flow skeleton rule lands, then --rerun-skeletons and apply)
- 2026-10-27 S intake-end indus-foods (85 min, 1258 rows, 1031 carried, 122 changed; palette marks restored from the 2026-10-19 review; 4 brand slugs, 4 sector titles and the blog parent kept as confirmed; page map unchanged; check-approved 157/0)
- 2026-10-27 S intake-start mamas-munches-redesign (re-run for the page-root fix ce4772bc7)
- 2026-10-27 S intake-end mamas-munches-redesign (11 min; every page root is main; review applied, page map and decisions unchanged)
- 2026-10-27 S site-run-start indus-foods (Wave B re-clone on 1157da6bb: refresh local-indus from indus-test, site-run --jobs 3)
- 2026-10-27 S site-run-start mamas-munches-redesign (Wave B re-clone on 1157da6bb: refresh local-mamas from mamas-test, site-run --jobs 3)
- 2026-10-27 S site-run-start eye-care-ward-end (Wave B re-clone on 1157da6bb: push local-eye-care to eye-care-clone-test, site-run --jobs 3)
- 2026-10-27 S site-run-end mamas-munches-redesign (24 surfaces, 0 failed; status sites/mamas-munches-redesign/build/qa/site-run/2026-10-27T15-53-15/status.json)
- 2026-10-27 S site-run-end eye-care-ward-end (29 surfaces, 2 failed stages: cart no draft page, S-27 fill opener - both fixed on fix/post-reclone)
- 2026-10-27 S site-run-end indus-foods (47 surfaces, 0 failed; status sites/indus-foods/build/qa/site-run/2026-10-27T15-53-09/status.json)
- 2026-10-27 S site-setup local-eye-care, local-mamas (catalogue --apply, flow-links --apply on f853358db)
