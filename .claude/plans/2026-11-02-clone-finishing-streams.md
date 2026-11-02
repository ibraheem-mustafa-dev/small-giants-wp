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

## Mama's stream (state 2026-11-02)

How it runs (Bean): rounds of 10 to 20 items; each round is investigated first (every element measured against the draft at 375/768/1440 at rest, hover, focus and scroll; each cause traced in the code and checked against `sites/mamas-munches-redesign/build/qa/divergences.json`), proposed to Bean with comparison images, then registered in `sites/mamas-munches-redesign/build/qa/fix-catalogue.md` and dispatched. No Custom CSS where a framework fix makes sense.
- Done: Round 1 (header and footer rebuilt, colour slugs `custom-mm-*` → `mm-*`, gallery and site-check fixes, `/qc`); Round 2 header (5 settings on the mirror, the framework batch in `plans/2026-11-02-header-framework-batch.md`). Baseline differences: `sites/mamas-munches-redesign/build/qa/vision-audit/2026-11-02-baseline.md`.
- Next round, the footer (investigated, awaiting Bean's approval). Settings: F1 footer links: move the icon-list hover motion from the list root to its `item-link` target, `linkUnderline: hover` with hover colour `mm-paper`, 2px, offset 4px; F2 Instagram tiles: gallery `item` motion hover lift -6px and `shadowHover` `6px 6px 0` cocoa; F6 attribution: `linkUnderline: hover`, hover colour `primary-text`, `linkMinHeight` 24px; F7 "@mamasmunches" heading `letterSpacing` 0; F8 "Follow along" `iconSize` 20px, "Build your box" label plus an arrow icon after it with a 10px gap; F10 both link lists read the `footer-shop` / `footer-help` WordPress menus (`icon-list` `source` + `menuRef`); the eyebrow's -2deg tilt from Custom CSS to a Motion rest rotation. Framework: FW-A a button's Motion hover replaces the preset's hover transform (today the preset's `transform` and the motion's `translate` add up: "Follow along" lifts 5px, draft 2px; email and Privacy/Terms lift 3px, draft none), with an explicit "no movement" choice; FW-B `business-info` link hover background (the email becomes a `business-info` email item with underline `mm-sparkle` 2px offset 4px); FW-C `icon-list` links fill their row so the target is the row (today 20px, under Bean's 24px floor); FW-D gallery per-photo rotation, straightened by the item hover motion; FW-E gallery layout per breakpoint (grid on desktop and tablet, a scrolling row on mobile, edge to edge), replacing the Round 1 scroller Custom CSS; FW-F per-breakpoint `textAlign` / `alignItems` (Bean to choose the scope: framework-wide with `migrate-tier-object.py`, or container, business-info and text only). Comparison images: `E:/sgs-tmp/qc-r1/ft-pairs/`.
- Then: Rounds for Home, Shop, Product (with the inline Zookie builder, Spec 43 FR-43-7), Gifts, Help, Contact, from the baseline list; the nav drawer panel width (register R1-26); site-check's mirror-to-canary id sharing (R1-28); the uniform pill cart's accessible name (R1-20).
