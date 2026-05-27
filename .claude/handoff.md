---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-27-spec-22-phase-1-architectural-CLOSED
generated: 2026-05-27
parent_session: small-giants-wp-2026-05-27-spec-22-phase-1-walker-rewrite
---

# Session Handoff — 2026-05-27

## Completed This Session

1. **Phase 1.1** (`507d4f57`) — pre-rewrite snapshot. `convert.py` renamed to `_retired/convert_pre_spec22.py` as rollback reference per F-RA-2.
2. **Phase 1.2** (`0ba53c72`) — `atomic_tag_map()` DB-driven via `html_tag_to_core_block` table + `blocks.replaces` reverse-walk. 14 entries; html-canonical (h1-h6→sgs/heading, button/a→sgs/button, etc.).
3. **Phase 1.2a** (`d4bfa41d`) — R-22-1 hardening: `_HTML_TAG_TO_CORE_SLUG` constant deleted; runtime path queries DB only. 5 conflicting `slot_synonyms.html_semantic_tag` rows NULL'd (subheading/tab/review/step/items).
4. **sgs/heading γ-rebuild** (`35fdab62`) — composite (130+ attrs, label/headline/sub) → single-element + `headingRole` enum (heading/subheading). deprecated.js migration + 2 patterns (label-heading-subheading-cluster + heading-subheading-cluster).
5. **Phase 1.3a** (`909c971a`) — array-attr backfill (product-card.packSizes→button, gallery.mediaItems→media, form-field-address.fields→options, form-field-tiles.tiles→options) + `array_item_slot_for()` helper (17/17 tests) + Spec 22 §FR-22-2.5 drift fix (D89 — 3 of 4 priority entries didn't grep-verify against codebase).
6. **sgs/team-member InnerBlocks** (`cd3bef5e`) — flat `socialLinks` array → InnerBlocks slot defaulting to sgs/social-icons. sgs/social-icons gains `label` field (WCAG 2.2 SC 4.1.2). One known SEO regression parked.
7. **Phase 1.4a** (`b58e5ca3`) — walker helpers in db_lookup.py: `resolve_slug_from_bem` + `lift_behavioural_attrs` + `emit_sgs_container_wrapping`. 26 unit tests PASS.
8. **Phase 1.4b** (`da3de993`) — universal walker rewrite in new `convert.py` (**1873 LoC, 61% reduction from retired 4803**). EXACTLY 3 routing branches per R-22-3. /qc-council 4-rater (Sonnet + Haiku + Gemini Flash + main-thread) surfaced 5 real diagnostics; all 5 fixed in-flight (D1 CSS-loss / D2 ImportError / D3 wrong attr names / D4 dead D1 sidecar / D5 chrome-skip ordering). 16 fix-tests added.

## Current State

- **Branch:** main at `da3de993` (18 commits pushed to origin/main this session)
- **Tests:** 145+/145+ PASS (convert.py self-tests + 6 guardrail suites + 3 convert-importing tests + 16 council-fix tests)
- **Build:** passes (`npm run build` exit 0)
- **Uncommitted changes:** `plugins/sgs-blocks/includes/lucide-icons.php` (auto-regen timestamp drift, will overwrite itself on next icon-build — leave alone)
- **DB state:** 1101 triple-NULL baseline recaptured (legitimate /sgs-update drift from 18 new sgs/heading attrs); 4 array attrs backfilled; 5 slot_synonyms cleaned

## Known Issues / Blockers

- **Dashboard at port 5050 is DOWN** — Gate 4b/4c.5 dashboard POSTs failed throughout session. Lessons captured with `pending_upload: true` flag in workspace files. Restart dashboard before next dashboard-dependent work.
- **5 pre-existing duplicate parking slugs** (P-FR1-VARIATION-BUF-CONSISTENCY, P-G1-EXTEND-TO-OTHER-CONTAINER-SHAPED-COMPOSITES, P-G1-HERO-INNERBLOCKS, P-G3-STAGE-3-VISUAL-SLOT-MAPPING, P-G5-PER-BLOCK-DOM-SHAPE-FIXES) — appear in 2026-05-26 closure notice + as older entries below. NOT introduced this session. Future parking cleanup pass should de-duplicate.
- **P-TEAM-MEMBER-SCHEMA-ORG-SAMEAS-RESTORATION (OPEN, SEO bucket)** — team-member's pre-1.3b Schema.org JSON-LD `sameAs` array was lost in the InnerBlocks refactor. Trigger: Phase 2 OR if a team-member-using client surfaces an SEO Schema audit issue.

## Next Priorities (in order)

1. **Phase 1.5 ran THIS session (2026-05-27).** Walker deployed to sandybrown + page 144 patched + Stage 11 measured. **RESULT: 0/21 body cells PASS ≤5%; mean 81.55%; regression +17.94pp vs pre-walker 63.61% baseline.** This is the empirical Phase 1 → Phase 2 transition signal. Universal walker is structurally correct (R-22-3 PASS, 145+ tests PASS) but Spec 16's hardcoded per-block cheats were hiding the gap; walker exposes it. Per-cell breakdown captured at `pipeline-state/mamas-munches-144-2026-05-27-124306/`. Stage 10 deploy machinery bug (`upload_and_patch.py` abort-on-zero-uploads) was fixed mid-session.
2. **Next session: /systematic-debugging dispatch.** 7 parallel agents (one per body section) read pixel-diff PNGs + convert-trace + leftover-buckets to surface class-of-failure per section. Synthesise → decide Path A (Phase 2 hybrid render.php migrations) / Path B (walker-level adjustments) / Path C (hybrid). See `.claude/next-session-prompt.md` for full 4-task orchestration plan.
3. **Most-likely conclusion:** Phase 2 (61-block hybrid render.php migration roster per `reports/2026-05-27-hybrid-block-roster.md`) is the path. Migrations to `echo $content` for content-bearing slots close the gap. Phase 0.4 audit predicted this.
4. **Restart dashboard at port 5050** for blub.db corrections sync (Gate 4b/4c.5 retries).

## Files Modified

| File | What changed |
|---|---|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | NEW **1873-LoC** universal walker (replaces retired **4803-LoC** Spec 16 walker, **61% reduction**) |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | +3 walker helpers + html_tag_to_core_block table migration + array_item_slot_for helper |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` | flush_essence_matches wrapper added; seed_d1_sidecar reduced to no-op stub; D1_SIDECAR removed from __all__ |
| `plugins/sgs-blocks/scripts/orchestrator/_retired/convert_pre_spec22.py` | NEW (renamed from converter_v2/convert.py — frozen byte-identical reference) |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/tests/test_walker_helpers.py` | NEW 26 tests for Pass 1 helpers |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/tests/test_array_item_slot_for.py` | NEW 17 tests for array routing helper |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/tests/test_atomic_tag_map.py` | NEW 28 tests for DB-driven atomic_tag_map |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/tests/test_qc_council_fixes.py` | NEW 16 tests for D1-D5 council fixes |
| `plugins/sgs-blocks/src/blocks/heading/*` | γ-rebuild: composite → single-element + headingRole enum + deprecated.js (2 versions) |
| `plugins/sgs-blocks/src/blocks/social-icons/*` | per-item `label` field added (WCAG aria-label) |
| `plugins/sgs-blocks/src/blocks/team-member/*` | socialLinks attribute → InnerBlocks slot + deprecated.js migration |
| `theme/sgs-theme/patterns/{heading,label-heading}-subheading-cluster.php` | NEW 2 patterns reconstructing old composite heading visual cluster |
| `.claude/state.md` / `.claude/decisions.md` / `.claude/parking.md` / `.claude/specs/22-*.md` | Spec drift fix (D89/D90) + parking entries + state snapshot updates |

## Notes for Next Session

- The /qc-council 4-rater gate is the binding rule for converter/walker/SGS-block commits (blub.db 255 + lesson `feedback_qc_council_cross_family_triangulation_finds_bugs.md`). Same-family tests pass green AND miss real bugs. Cross-family diversity (Anthropic Sonnet + Google Gemini Flash + main-thread inline) is the lever.
- The walker's R-22-3 PASS test self-runs in `__main__` (convert.py:1740-1810) — AST-walks `walk()` and asserts zero illegal block-slug literals. Will fail if anyone adds a per-block conditional. Structural enforcement floor.
- emit_atomic now has per-(slug, tag) attr maps aligned to current block.json. Future block schema changes for atomic-target blocks must update emit_atomic OR rely on the DB-driven fallback (queries `block_attrs(slug)` for first content-role string attr).
- Bean's standing directives: minimise time / no hardcoded routing dicts (R-22-1) / never amend commits (always new commit) / always merge to main / no co-author tags / UK English / phases never ship as single commits (R-22-5).
