---
doc_type: plan
title: Finishing the three client sites to sellable quality, in three streams
status: active
created: 2026-11-02
governs: Spec 48 (cloning system) evidence; Front H and Front F
---

# Finishing the three client sites, three streams

**Goal (Bean, 2026-11-02):** three sites good enough to present to prospective clients and start selling, each matching its Claude Design draft visually and functionally at 375, 768 and 1440. Speed matters more than pipeline purity: the sites are finished by hand with real SGS blocks and settings, and every fix on the two cloned sites is catalogued so the pipeline's remaining gaps can be found and fixed afterwards.

## Streams (run in parallel, one session each)

| Stream | Site | Starting point | Draft |
|---|---|---|---|
| Indus | `indus-test` (built on mirror `local-indus`, http://localhost:8083) | the 2026-10-28 clone, restored 2026-11-02 | `sites/indus-foods/handoff/` |
| Mama's | `mamas-test` (built on mirror `local-mamas`, http://localhost:8084) | the 2026-10-28 clone, restored 2026-11-02 | `sites/mamas-munches-redesign/handoff/` |
| Eye Care | `eye-care-test` (darkcyan, the hand-built site, edited directly) | the hand-built site (closer to the draft than the clone) | `sites/eye-care-ward-end/handoff/` and `plans/2026-10-02-eye-care-fix-register.md` |

Rules every stream keeps:
- Fix with real SGS blocks and their settings first; a one-off effect with no setting goes in the block's Custom CSS box (Bean 2026-11-01). Never fake content (static copies of live data, screenshots as content).
- Indus and Mama's: edit on the client's mirror, then copy with `bash scripts/local-wp/push-to-remote.sh local-<client> <client>-test` (dry run first). Never run the clone route (`site-run.mjs`, `fill.mjs`, `intake.mjs`, `site-build.mjs --apply`) for a stream's client: a route run rebuilds the posts and erases the hand fixes.
- A framework defect (a block that cannot do what the draft shows) is fixed in the block itself, deployed with `build-deploy.py --target <site>` before any push to that site, and catalogued as a framework gap.
- Each stream compares its page with the draft at 375, 768 and 1440 before and after each fix (`node scripts/computed-route/tools/vision-capture.mjs <client> <ENVKEY> <surfaces>` makes paired full-page captures), and keeps the site's site-check passing (`node scripts/computed-route/site-check.mjs <client> --site <client>-test`).

## The fix catalogue (Indus and Mama's streams)

Every change an agent makes to the Indus or Mama's site is one row in that client's catalogue, written in the same commit as the fix:
- `sites/indus-foods/build/qa/fix-catalogue.md`
- `sites/mamas-munches-redesign/build/qa/fix-catalogue.md`

Row columns: date; surface and widths; what was wrong compared with the draft; the fix (block, setting and value, or the Custom CSS); the pipeline stage that should have produced it (intake, skeleton, Fill, site build, walker or a framework gap); the suspected cause in the route (file and function when known, else "unknown"); commit. When the streams finish, the catalogues are grouped by cause into the pipeline's fix list (the route as rewound to 2026-10-28, `.claude/plans/2026-10-30-clone-recognition-fixes.md`, "Rewind").

## Done when

Each site matches its draft at 375, 768 and 1440 with no high or medium difference left in a fresh vision review (`.claude/reports/2026-11-02-clone-vision-review.md` is the pattern), its site-check passes, and Bean has seen it and approved it for client presentations.
