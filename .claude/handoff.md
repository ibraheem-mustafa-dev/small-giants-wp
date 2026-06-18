---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline
session_date: 2026-06-18
---

# Session Handoff — 2026-06-18

## Completed This Session
1. **Exact-match WIDTH model SHIPPED (D230 `484d04d9` + D231 `d5416ae8`)** — a Bean-initiated fidelity fix (NOT the planned Phase-F work, but real forward progress). Retired `widthMode`/`customWidth` end-to-end for a **3-layer model**: `align` (WP-native breakout) / `maxWidth` (string literal, exact draft value — no 5% snap, no decimal truncation, responsive tiers) / `contentWidth` (token `normal`→content-size / `wide`→wide-size / `full`→no cap, OR literal; default `full`). Editor controls → `UnitControl` (number+unit). `sgs/quote` bespoke control migrated to the shared one. 6 conformance goldens rebaselined (`widthMode:full`→`align:full` only).
2. **Process:** designed via `/brainstorming` → `/adversarial-council` (6-persona; caught a FATAL premise — `maxWidth` was wrongly assumed unused, it was a live keyword attr) → Bean design-gate (4 iterations, model evolved v0.1→v0.5) → SDD build (subagents implement, Opus orchestrates) → `/qc-council` (caught a responsive-specificity WRITTEN-not-LANDED bug pre-commit) → **LANDED-verified live on the canary** (Playwright computed-style + do_blocks, fonts loaded).
3. **DB reseeded** (`/sgs-update` ×2) — pruned 8 then 113 orphan attrs (widthMode×4 across 30 blocks + customWidth). DB now matches code; zero widthMode anywhere.
4. **Phase F step F1 DONE** — multi-shape fixture corpus at `plugins/sgs-blocks/scripts/tests/fixtures/phase-f/` (README index + `sgs-media` + 5 red-team fixtures `rt-pseudo-before`/`rt-video-media`/`rt-media-600`/`rt-background-url`/`rt-centred-maxwidth`, each with an `expected.md`: HIGH gap + current-failure + target behaviour).
5. **Cosmetic sweep:** 29 composite block.json vestigial `widthMode*` declarations removed + 8 stale render.php comments fixed.
6. **Docs updated thoroughly:** decisions.md D230+D231; Spec 22 §FR-22-21 (3-layer model); Spec 31 §2 Axis 1 / §3 step 3 / §8 Family D (shipped width model) + §12.7 F1 marked done; cloning-pipeline-flow.md + -stages.md + architecture.md (width refs); the width design doc marked SHIPPED; state.md, this handoff, next-session-prompt (carried forward the reading gate + STOP catalogue, added STOP-11 schema≠usage, retasked to F2).

## Current State
- **Branch:** main at `d5416ae8` (pushed). **D-CEILING: D231.**
- Width model shipped + LANDED on canary; both conformance suites green (43+41); build green.
- Phase F: F1 done. F2-F6 pending.

## Known Issues / Blockers
- None blocking. The width work is a spot-fix the clean rebuild will re-absorb as a per-resolver module (noted in Spec 31 §8 Family D) — do not redo it.
- Minor: a section with an outer `maxWidth` + default `contentWidth:full` now fills correctly (the earlier outer-800+1200-band nuance is resolved by default-full).

## Next Priorities (in order)
1. **Phase F step F2** — the draft-declaration parser → CSS Accounting Ledger (Spec 31 §12.2.1 + §12.7), independent of css_router's parse (STOP-3).
2. F3 render-diff oracle (canary-only) + metamorphic relations; F4 closed EXCLUDED set (ships empty); F5 the 3 gates built+armed; F6 DB-consistency suite.
3. Then the stage-by-stage modular rebuild.

## Files Modified
convert.py · class-sgs-container-wrapper.php · container/{block.json,edit.js,components/ContainerWrapperControls.js,style.css} · quote/{block.json,edit.js,render.php} · 29 composite block.json (widthMode sweep) · 8 render.php comments · 6 conformance goldens · tests/fixtures/phase-f/* (F1, new) · specs/22 · specs/31 · cloning-pipeline-flow.md · -stages.md · architecture.md · decisions.md · plans/2026-06-17-exact-match-width-model-design.md · reports/visual-diff/{container,quote}-2026-06-18.md

## Notes for Next Session
- Read the MANDATORY READING GATE + STOP catalogue (now incl. STOP-11) in next-session-prompt.md before any code.
- The width design doc (`plans/2026-06-17-exact-match-width-model-design.md`) carries the full v0.1→v0.5 council/decision trail if width context is needed.
- F1 fixtures are the universality test bed F2's ledger parses + F3's oracle renders.

# Session Handoff — 2026-06-17

## Completed This Session
1. **Wrote Spec 31 — Universal Container/Grid CSS-Transfer architecture** (`.claude/specs/31-...md`), then corrected it through two councils to **v0.3** (the build blueprint). §1-§11 = architecture; §12 = the clean-modular-rebuild direction (build-ready).
2. **Built an exhaustive 24-stage pipeline routing map** (`.claude/reports/pipeline-routing-map-2026-06-17.html`) from direct code extraction — every branch/if, DB table.column, and terminal, + 3 cross-stage mechanism traces (M1 nested grid · M2 classification fork · M3 complete CSS transfer) + a **22-finding gap register (6 HIGH)**. Verified rendering (24 stages, 134 nodes).
3. **Ran 3 specialist reviewing subagents** (personas scoped via `/research-check`) over the 3 vital cross-stage mechanisms — surfaced the 22 gaps + the **CSS Accounting Ledger** cure (roster saved at `reports/2026-06-17-cross-stage-reviewer-personas.md`).
4. **Ran `/adversarial-council`** (5 personas) on the whole approach → CONDITIONAL GO; convergent must-fixes (draft-derived ledger, WRITTEN-vs-LANDED, render-diff oracle, closed EXCLUDED set, gates-as-prerequisite). Register: `reports/2026-06-17-adversarial-council-register-and-rebuild-direction.md`.
5. **Bean locked the direction (D229):** clean rebuild (not spot-fixes) · modular per-resolver files + remade orchestrator · stage-by-stage build order with a per-stage ledger test.
6. **Folded all council must-fixes into Spec 31 §12** + appended §12.7 (foundation build order F1-F6 + gap-to-stage map). **`/qc-council`-verified** the fixes landed; fixed 2 stale-text reconciliations (§6.7 Method-2 in-scope, §5 ledger-supersedes-matrix).
7. **Updated living docs:** decisions.md D229, state.md cloning block, docs-registry reading order (Spec 31 + the map now mandatory top reads), this handoff, the next-session-prompt (with a hard MANDATORY READING GATE), MEMORY.md.

## Current State
- **Branch:** main at d8a4475f
- **Tests:** no test run this session (planning only — no code shipped)
- **Build:** n/a (no code changed)
- **Uncommitted changes:** 5 new docs (Spec 31, 3 reports, 1 superseded draft plan) + edited decisions/state/registry/handoff/next-session-prompt — committed this handoff.

## Known Issues / Blockers
- None block the next session. The 3 anti-cheat gates (check-converter-cheats.py / generate-coverage-matrix.py / pipeline-close ledger check) DO NOT EXIST yet — building + arming them is Phase F (the first build task), not a blocker.

## Next Priorities (in order)
1. **Phase F — the Tier-1 foundation** (Spec 31 §12.2 + §12.7): multi-shape fixture set → draft-DERIVED CSS Accounting Ledger → render-diff oracle → closed EXCLUDED set → the 3 gates built+ARMED → DB-consistency suite. This is the spine; build it before any stage.
2. **Stage-by-stage modular rebuild** (§12.6 step 3 + the §12.7 gap-to-stage map), each stage gated by the ledger before the next.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` | NEW — the build blueprint v0.3 (banner + §12 rebuild direction + §12.7 build order) |
| `.claude/reports/pipeline-routing-map-2026-06-17.html` | NEW — exhaustive 24-stage routing map + M1/M2/M3 traces + 22-gap register |
| `.claude/reports/2026-06-17-adversarial-council-register-and-rebuild-direction.md` | NEW — council must-fix register + locked direction |
| `.claude/reports/2026-06-17-cross-stage-reviewer-personas.md` | NEW — reviewer-persona roster |
| `.claude/plans/2026-06-16-grid-container-extraction-rebuild-design.md` | NEW — earlier draft (superseded by Spec 31; kept for trail) |
| `.claude/decisions.md` · `state.md` · `docs-registry.yaml` · `next-session-prompt.md` · MEMORY.md | D229 + cloning block + reading order + the forced-reading opener + lesson index |

## Notes for Next Session
- **Mama's parity is the METRIC, not the goal** — content 100%; full mobile 61.82/tablet 59.09/desktop 55.45%. The hero IS already live on page 8; do not let "it renders" justify spot-fixes (they regress — trust-bar precedent).
- **The keystone insight:** the ledger's input must be the DRAFT's parsed declarations (independent of the converter), or it's circular and hides the ~15 silently-dropped property classes.
- **A subagent overwrote the master pipeline-map this session** (recovered). Bake "return data, never write shared files" into every audit/build subagent prompt. Captured: `feedback_subagents_must_not_write_shared_files`.
- **No code shipped — OUTCOME ACHIEVED for this session's goal** (produce a verified build-ready blueprint). The build outcome (a faithful universal clone) is the NEXT phase, gated by the ledger.

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
