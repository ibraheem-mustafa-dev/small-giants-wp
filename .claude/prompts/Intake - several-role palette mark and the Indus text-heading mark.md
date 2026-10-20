Invoke /autopilot before doing anything else.

TRACK: intake (scripts/computed-route/ and sites/*/build/intake/). Single-use prompt: delete this file in the commit that finishes it.

CONTEXT (plain English)
- Bean decided on 2026-10-20 that Indus keeps the draft's own colour #2C3E50 for `accent-text` and `section-text` (today they are hand-set in sites/indus-foods/theme-snapshot.json). For a re-extraction to keep it, the choice must be a palette mark in the intake review, not a hand edit.
- #2C3E50 is the draft token `--text-heading`, whose row is marked `accept` (proposed role `heading`). A mark names one slug, so the token cannot also fill the two text slugs.
- The extractor side is built (commit after 0f8048c60): `plugins/sgs-blocks/scripts/theme-extractor/confirmed_palette.py::_mark_slugs` accepts `role:<slug>,<slug>,...`, giving the token's colour to each slug, each slug validated as before (`tests/test_confirmed_palette.py::test_one_mark_can_give_a_draft_colour_several_roles`). A scratch extraction with the mark below reproduces Indus's live palette with zero differences.
- What is missing is the intake half: `scripts/computed-route/lib/intake-review.mjs` validates a `palette-role` mark with `SLUG = /^[a-z0-9-]+$/` against everything after `role:`, so it refuses `role:heading,accent-text,section-text`.

TASKS, IN ORDER
1. In `scripts/computed-route/lib/intake-review.mjs`, the `palette-role` mark shape `role:<slug>` accepts a comma-separated list: split on `,`, trim each part, each part must pass `SLUG`, an empty part is refused (`role:heading,` and `role:,heading` fail), the shape label reads `role:<slug>[,<slug>...]`. Add cases to `scripts/computed-route/tests/intake-review.test.mjs` (one accepted list, one list with a bad slug refused). Check `data/intake.schema.json` and the review.md legend for any wording that names the single-slug form and update it.
2. Record Bean's decision on Indus: the `palette:--text-heading` review row's mark becomes `role:heading,accent-text,section-text` (in review.md, then applied into intake.json the way intake normally applies marks).
3. Prove it: `python plugins/sgs-blocks/scripts/theme-extractor/extract.py --client indus-foods --draft "sites/indus-foods/handoff/Indus Foods Website v2.dc.html" --intake sites/indus-foods/build/intake/intake.json --out <scratch>/snap.json --trace <scratch>/trace.json` (add `--facts` with a cached facts file if you have one; extract.py otherwise measures in a browser) and confirm `accent-text`, `section-text` and `heading` are #2c3e50 and every palette slug equals sites/indus-foods/theme-snapshot.json. Do not overwrite the real snapshot or push it.
4. Update Spec 48 FR-33-2's Status (the sentence naming the `role:<slug>[,<slug>...]` mark: say intake accepts it) and the Indus plan step 17 note (`.claude/plans/2026-10-11-spec48-indus-build.md`: the mark is recorded). Commit with explicit pathspecs (`git branch --show-current` in the same command), push.
