---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline
session_date: 2026-06-16
---

# Session Handoff — 2026-06-16

## Completed This Session
1. **Recovered the missing hero (converter `_trace` bug)** — four `_trace("x",{dict})` calls passed a dict as a 2nd positional to `_trace(stage,**kwargs)` → `TypeError` → caught as `unmatched-cv2-softfail` → whole sections emitted EMPTY. Killed the entire sgs/hero (+ featured-product + brand) off the Mama's homepage. Fix `**{` (commit `2e437a4d`). Extract 265→621 attrs; hero now emits `wp:sgs/hero`, live on page 8.
2. **Full branch reconciliation** — 11 unpushed cloning-thread commits + fixes fast-forwarded to main; `feat/spec30-p2-shop-schema` merged (code already cherry-picked; formalised + 3 doc files, `9cbdddb1`). Single clean main, all feat branches deleted, stale stash dropped.
3. **Issue A** (`7736432c`) — removed 2 hero-specific full-bleed CSS hacks (`.wp-block-group .wp-block-sgs-hero{max-width:100%!important}` + `margin-inline:-24px`). Hero uses universal `alignfull` like trust-bar (right gap 55px→15px). Live-verified.
4. **Issue B** (`437b2f82`) — `ctas`/`buttons` aliased to BOTH `button` + `button-group`; resolved `__ctas`→`sgs/button` → redundant `sgs/container` wrapping the multi-button. Removed from `button` (kept singular `cta`) → no double-nesting. DB-first dated migration.
5. **Wrapper grid de-cheat** (`e66f8973`) — (1) gate `sgs-cols-*` classes on empty ratio so the faithful explicit `gridTemplateColumns*` ratio wins (was crushed by `repeat(N,1fr)!important`); (2) device-tier mobile breakpoint 599→767 (768/1024 standard). Visual-diff report `reports/visual-diff/container-2026-06-16.md` (PASS).
6. **Converter `_GRID_TABLET_BP` 600→768** (`f997af25`) — device-tier extraction mapping now pairs with the wrapper's 768/1024.
7. **Stage-11 container-wrapping WARN fixed** (`70bcf164`) — `sgs/team-member` is structurally identical to product-card (scalar rebuild, own supports, wrapper outer shell, NO sgs/container InnerBlocks) → removed from the container-mirror roster like product-card (D204). Sync now `[VALIDATION PASS]`.
8. **Docs hardened (D228)** (`98859a6e`) — 3 new CLAUDE.md architecture rules + 3 memory guards against this session's wrong mental models; `/qc-council` validated them (2 GUARDED, 3 WEAK gaps fixed). decisions.md D228; mistakes.md 2 stubs. /sgs-update ran (DB synced, 196-block reference regenerated).

## Current State
- **Branch:** main at `70bcf164` (in sync with origin/main)
- **Tests:** conformance 43 pass (Gate A); converter_v2 suite green
- **Build:** passes (sgs-blocks webpack)
- **Uncommitted changes:** none (auto-gen noise discarded)
- **Deployed:** sandybrown canary page 8 (`?page_id=8`) reflects all fixes; hero renders, full-bleed correct.

## Known Issues / Blockers
- Parity full-fidelity is mobile 61.82% / tablet 59.09% / desktop 55.45% (content 100%) — the grid/container-extraction rebuild (next session) closes the layout+css gap. Fidelity drops as viewport widens (desktop weakest).
- Container-bearing detection in `sync-container-wrapping-blocks.py` only catches sgs/container-InnerBlocks blocks; wrapper-attr scalar blocks (team-member, product-card) must be hand-curated in the roster. Non-blocking; flagged.

## Next Priorities (in order)
1. **Grid/container-extraction rebuild** (Bean-scoped) — analyse `sgs/container` block.json + DB (variant_slots/property_suffixes/modifier_suffixes) + `SGS_Container_Wrapper` end-to-end so the converter faithfully maps EVERY container value (and draft-wrapper equivalent) into EVERY composite, with correct responsive.
2. **Hero fold (Stage 2)** — first concrete step: drop hero manual grid + `wrap_inner=false`, route the split grid through the now-faithful helper (ground in `variant_slots`: split = gridTemplateColumns/splitGap). Then Stage 3 (product-card) → Stage 4 (remove `wrap_inner` option).
3. **Then the family defect register** (Fam B/C/D/E/F per the prior register) — once the grid foundation is rebuilt.

## Files Modified
| File | What changed |
|------|--------------|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | `_trace` `**{` fix (hero) + `_GRID_TABLET_BP` 600→768 |
| `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` | gate sgs-cols-* on empty ratio + 599→767 breakpoints |
| `plugins/sgs-blocks/src/blocks/container/{style.css,block.json}` | sgs-cols tablet 1024→1023; version 0.2.1 |
| `theme/sgs-theme/assets/css/{core-blocks,core-blocks-critical}.css` + `style.css` | removed 2 hero full-bleed hacks; v1.5.6 |
| `plugins/sgs-blocks/scripts/uimax-tools/seed-slot-synonyms.py` + `migrations/2026-06-16-button-group-alias-disambiguation.py` | ctas/buttons → button-group only |
| `plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` | remove sgs/team-member from roster |
| `CLAUDE.md` · `.claude/decisions.md` · `.claude/mistakes.md` | D228 architecture rules + decision + stubs |

## Notes for Next Session
- **Device-tier vs visual breakpoints are DISTINCT** — the SGS Mobile/Tablet/Desktop attr system must be 768/1024; an arbitrary visual breakpoint (min-width:600, WP-columns 781) is legitimate and must NOT be blanket-changed.
- **Hardcoded wrapper defaults are CHEATS to remove, not blockers** — a `!important` injection that overrides faithful CSS transfer is an R-22-1 violation to remove/gate, not a wall.
- **Composites are NEVER a separate system** — hero uses `SGS_Container_Wrapper` like every composite; per-block hacks are bugs.
- **Ground variant setups in `variant_slots`/`blocks.variant_attr`** — sgs/hero split = gridTemplateColumns/splitGap; query, don't guess.
- An empty cloned section is usually a cv2 soft-fail — read extract.json `status` + trace.jsonl exception FIRST.
