# Open R-items — animation-harvest + sgs-discover

**Origin:** `~/.claude/gap-analysis/reports/2026-04-08-pipeline-audit.md` (lines 149-165)
**Status:** OPEN — never executed (confirmed by Bean 2026-04-29)
**Parked from:** the deleted `.claude/plans/current_mission.md` audit; preserved here so they don't get lost
**Disposition:** Handle in a future session, NOT in 2026-04-29 (Bean wants Folder 1 cleanup + overnight-run fixes only this session, then Folder 2 next session)

---

## CRITICAL (7 items)

| ID | Skill | Problem |
|----|-------|---------|
| R1 | sgs-discover | `site:` operator doesn't work on gallery sites (Brave returns blog posts not award entries). Core search broken. Gallery fallback URLs not implemented |
| R2 | sgs-discover | No autonomous mode — Step 6 blocks on human input with no timeout. Stalls any pipeline calling it overnight |
| R3 | sgs-discover | No run artefact schema — returns JSON in conversation only. Pipeline callers (animation-harvest Mode 2) get no file-based output |
| R4 | animation-harvest | `interactive-design` has no "animation analysis mode" — Stage 3 dispatch target doesn't exist |
| R5 | animation-harvest | `visual-qa` has no "animation-specific mode" — Stage 7 dispatch target doesn't exist. No FPS/CLS measurement |
| R6 | animation-harvest | Path B not executable — Playwright MCP has no `record_video` tool. Kling API has no key location or CLI. Nano Banana is interactive-only |
| R7 | animation-harvest | CSS @keyframes not extractable via getComputedStyle — Stage 1 needs `document.styleSheets + CSSKeyframesRule` filtering |

## HIGH (5 items)

| ID | Skill | Problem |
|----|-------|---------|
| R8 | animation-harvest | `sgs-wp-engine` has no "block extension mode" — Stage 5 dispatch target doesn't exist |
| R9 | sgs-discover | Gallery screenshots fail silently (Cloudflare/JS blocks Playwright). Gallery thumbnail fallback has no URL extraction logic |
| R10 | animation-harvest | Pipeline state dir `~/.claude/pipeline-state/animation-harvest/` never created before first artefact write |
| R11 | animation-harvest | Path B timeout: 45 min × 3-5 animations = 225+ min. Silent failures produce empty reports with no alert |
| R12 | animation-harvest | Stage 0 (sgs-discover dispatch) has no halt handling — stall with no timeout in Mode 2 |

---

## Notes for the future session that picks these up

- The 2026-04-28 handoff lists "4 invisible skills in autopilot domain table" as a known blocker — that claim is partially stale. animation-harvest IS in the autopilot domain table at line 206 of `~/.claude/skills/autopilot/SKILL.md`. The R-items above are a different concern (skill quality / dispatch correctness), not visibility.
- Three R-items (R4, R5, R8) require creating dispatch modes/sections in `interactive-design`, `visual-qa`, and `sgs-wp-engine`. These are sibling skills; touching them invokes lifecycle gates.
- R6 (Path B media generation) is a research/feasibility question, not a code fix. May be answered "drop Path B" if Playwright record_video and Kling API access don't materialise.
- These R-items were originally tracked in `current_mission.md` which was deleted in the 2026-04-29 cleanup as superseded. The current_mission.md mission scope (Tasks 3a→4→5) was rolled into the new 5-phase optimisation-toolkit plan, but the specific R-items were NOT carried forward into that plan. This file is the safety net.