# Plan Docs Reality Check — 2026-04-18

> **Purpose:** Audit every file in `docs/plans/` — verify status against actual code, not handoff claims.
> **Method:** Cross-checked each plan's goals against filesystem (`plugins/sgs-blocks/src/blocks/`, `src/blocks/extensions/`, git log since 2026-02-26).
> **Date audited:** 2026-04-18

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✓ COMPLETE | All tasks in plan are done and code confirms it |
| ◐ PARTIAL | Some tasks done, some deferred or not started |
| ○ NOT STARTED | Plan written but no code evidence |
| ACTIVE | Ongoing reference document — never "done" |
| ARCHIVE | Work done; plan is now historical only |

---

## Plan Docs Status Table

| Filename | Phase / Goal | Status | Evidence | Recommendation |
|----------|-------------|--------|----------|---------------|
| `2026-02-12-phase-1b-foundation.md` | Plugin infrastructure — multi-block auto-discovery, shared components, extension scaffold | ✓ COMPLETE | Plugin bootstrapped, `class-sgs-blocks.php` exists, 57 blocks auto-registered, `src/blocks/extensions/index.js` present | **Archive** — implementation is live and stable |
| `2026-02-13-content-blocks-batch-2.md` | Counter, Trust Bar, Icon List blocks | ✓ COMPLETE | `counter/block.json`, `trust-bar/block.json`, `icon-list/block.json` all exist in `src/blocks/`. Counter has `viewScriptModule` for count-up animation. | **Archive** — all 3 blocks confirmed in codebase |
| `2026-02-13-sgs-forms.md` | Forms Phase 1 — 13 form blocks + processing engine | ✓ COMPLETE (Phase 1) | 17 form directories confirmed: `form`, `form-step`, `form-review`, + 14 field blocks. Security hardened in session 25. Phase 2 (Stripe, address API) explicitly deferred in plan text. | **Archive** Phase 1 / **Keep as reference** for Phase 2 scope |
| `2026-02-14-accordion-deploy-review-schema-toc.md` | Accordion + Review Schema on Testimonial + Table of Contents block | ✓ COMPLETE | `accordion/block.json`, `accordion-item/block.json` exist. `table-of-contents/block.json` exists (was "Broken" in Feb, now implemented). Testimonial schema added in feat(schema) commit. | **Archive** — all tasks delivered |
| `2026-02-21-framework-completion-plan.md` | Overall 6-phase framework completion plan (Phases 0–6) | ◐ PARTIAL | **Phases 0–3 complete:** bug fixes, device visibility, hover controls, all Phase 2 blocks, responsive controls, block patterns library. **Phase 4 (Indus Foods pages):** partially done — pages were built in sessions 5–10 but not all are verified complete. **Phases 5–6:** not started (popups, chatbot, booking, dark mode). | **Keep + update** — add phase completion dates to header, remove Phase 0–3 task detail (historical noise), keep Phase 4–6 as live roadmap |
| `2026-02-21-master-feature-audit.md` | 354-feature graded roadmap — truth doc for scope and priority | ACTIVE (updated 2026-04-18) | This doc has been re-verified in this session. New verified count: ~45% (139/310). See changelog section in the file. | **Keep as primary truth doc** — re-verify quarterly |
| `2026-02-21-post-grid-block.md` | Post Grid block implementation plan | ✓ COMPLETE | `post-grid/block.json` exists, AJAX pagination via REST endpoint `sgs-blocks/v1/posts`, verified live on palestine-lives.org (Feb 2026 audit). | **Archive** — delivered and live |
| `2026-02-26-phase2-blocks-complete.md` | Fix Countdown Timer + Star Rating CSS, add Person schema to Team Member | ✓ COMPLETE | `countdown-timer/block.json`, `star-rating/block.json`, `team-member/block.json` all exist. Schema fixes confirmed in `feat(schema+typography)` commit. | **Archive** — all tasks delivered |
| `2026-02-27-hero-fixes.md` | Hero block bug fixes (4 bugs) + Indus Foods colour audit | ✓ COMPLETE | Hero block validation errors resolved in architecture audit (sessions 8–10). Block validation recovery documented in memory. Hero `source: html` bug fixed (commit in MEMORY.md). | **Archive** — issues resolved |

---

## Summary

| Status | Count |
|--------|-------|
| ✓ COMPLETE → Archive | 7 |
| ◐ PARTIAL → Keep + Update | 1 |
| ACTIVE → Keep | 1 |
| ○ NOT STARTED | 0 |

**Recommended action:** Archive 7 files by moving them to `docs/plans/archive/` (or adding `[ARCHIVED]` prefix). Keep `2026-02-21-framework-completion-plan.md` as the live Phase 4–6 roadmap after stripping Phases 0–3 task detail.

---

## Blocks Missing from All Plans (Built Since Feb 2026 Without a Dedicated Plan Doc)

These blocks exist in code but had no standalone plan file. They were built within broader session work:

| Block | When built (est.) | Plan coverage |
|-------|------------------|---------------|
| `sgs/mega-menu` | Session 8–9 | Covered in CONVERSATION-HANDOFF.md only |
| `sgs/mobile-nav` | Session 9 | Covered in CONVERSATION-HANDOFF.md only |
| `sgs/announcement-bar` | Sessions 5–8 | No plan doc |
| `sgs/business-info` | Session 10 (header/footer upgrade) | Memory: project_header_footer_upgrade.md |
| `sgs/google-reviews` | Sessions 5–10 | No plan doc |
| `sgs/heritage-strip` | Sessions 5–10 | No plan doc |
| `sgs/modal` | Sessions 5–10 | No plan doc |
| `sgs/notice-banner` | Sessions 5–10 | No plan doc |
| `sgs/process-steps` | Sessions 5–10 | No plan doc |
| `sgs/svg-background` | Sessions 5–10 | No plan doc |
| `sgs/decorative-image` | Sessions 5–10 | No plan doc |
| `sgs/icon` | Internal — icon helper | No plan doc needed |

**Recommendation:** These blocks should be verified live on palestine-lives.org before Phase 3 starts. They are code-confirmed but not live-verified.
