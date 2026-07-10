---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-10
thread: no-inline rollout — LAND-COMPLETION + rollout close (post-INTEGRATION)
---

# NEXT SESSION — complete the no-inline LAND + close the rollout

Invoke `/autopilot` first. The INTEGRATION session (D300/D301) merged all 6 no-inline branches to `main`,
made box_family fully declarative, fixed the hero dark-pink bug, and fixed 6 universal pill-cloning
converter bugs. What remains is **finishing the LAND** (the rollout's outcome is code-complete but only
spot-verified) + 4 close-out follow-ups.

## State recap (plain English)
`main` @ `89dcaf41`, build green, 440 converter tests pass, sandybrown + page 8 deployed/re-cloned. The ~35
newly-merged blocks (Tracks A–E sets) emit no-inline styling + build green + the DB is reseeded, but only a
spot-sample is LANDED-verified (wave-1 harness re-run, a custom-value proof, the page-8 hero/pill/product-card).
Bean's 3 priorities are all verified live (hero responsive padding, custom values not preset-locked, pill 7/8).
The pill's selected FILL is the one remaining fidelity gap (a `colourPreset='solid'` interaction, not converter).

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (this session's record) + `.claude/decisions.md` head (D300 + D301 + D294–D299).
2. `.claude/plans/block-migration-DONE-checklist.md` (11 end conditions) + `.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md`.
3. **Spec 31 IN FULL** (Bean-locked every session) + Spec 32 §6.1.
4. `.claude/parking.md` head — the 5 open D300/D301 + D298 follow-up entries this session's tasks map to.

## ⛔ ANTI-PATTERN STOPs (carry forward + this session's new ones)
- **STOP-16** — a subagent/track "it works" is a HYPOTHESIS. Re-run yourself: `npm run build`; `python -m pytest converter/tests -q --import-mode=importlib` (440 pass); `python check-box-family-guard.py --check` (0).
- **STOP-21 / 43 / 44** — LANDED only by deploy + (re-clone if attr-shape changed) + live computed-style at 375/768/1440. Emit-green ≠ LANDED. Asymmetric instance (4 distinct sides / corners) is the box-family proof.
- **STOP-66** — after any block.json attr-shape change, `python scripts/sgs-update-v2.py --stage 1` (seeds) + `--stage 10` (prune orphans) before re-clone.
- **STOP-67** — the pre-commit visual-diff gate needs `reports/visual-diff/<block>-<date>.md` at repo ROOT (`verdict: PASS` + `first_paint_capture_passed: true`) per changed block. No report = commit blocked (use `--no-verify` only for genuinely non-visual commits, path-scoped).
- **STOP-68 (lesson stands)** — grid CSS is scoped in the SHARED wrapper (once), never per block. Do not re-inline grid.
- **NEW (D301) — colour routing is by DB role, never a css_property name-list.** Route colour-resolution off `role='color'` (threaded through `_compute_value`); keep the concrete hex/rgba when no palette token matches. A hardcoded `(color,background-color,border-color)` list is a cheat — the next colour property silently breaks. Do NOT reintroduce it.
- **NEW (D300) — box_family is DECLARATIVE.** Add box families in `block.json supports.sgs.boxFamilies`, NEVER grow the `ATTR_CLASSIFICATION_OVERRIDES` dict (Bean-directed).
- **NEW — the harness/node runs via PowerShell**, not Git Bash (nvm4w shim broken). Python works in Bash.
- **Path-scoped commits** — two threads share `main`; always `git commit -- <paths>`, never `git add -A`.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS INCLUDE — the `colourPreset` pill-fill design decision |
| `/gap-analysis` | ALWAYS INCLUDE — grade outputs before delivery |
| `/lifecycle` | ALWAYS INCLUDE — before any skill/agent/pipeline changes |
| `/research` | ALWAYS INCLUDE — auto-routes to the right tier |
| `/strategic-plan` | ALWAYS INCLUDE — order the LAND waves before executing |
| `/qc-council` | any converter/shared-render change (blub-255) — e.g. the colourPreset emit decision |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | pipeline + schema ground truth |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright / chrome-devtools | LANDED computed-style + inline scan at 375/768/1440 (page 8 + page 1356) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | LiteSpeed purge before live verify (user `u945238940`, domain `sandybrown-nightingale-600381.hostingersite.com`) |
| `sgs-db.py sql` (READ) + `sgs-update-v2.py` (--stage 1/10) | DB ground truth + seed/prune |
| REST app-pwd `.claude/secrets/sandybrown.env` | harness auth on page 1356 |

## Agents to Delegate To

| Agent | When |
|-------|------|
| general-purpose (Sonnet, solo) | any per-block migration touch-up (disjoint dir); read-only Explore agents parallel-fine |
| test-and-explain | plain-English verify of a LANDED batch if wanted |

---

## Task 1 — Complete the roster LAND (`P-NO-INLINE-LAND-ROSTER`)
**What:** LANDED-verify the ~35 merged blocks + write per-block visual-diff reports.
**Why:** the rollout's OUTCOME (every styling-support block proven zero-inline live) is not hit until this is done.
**Estimated time:** 60–90 min (harness-automated; batched manifests).
**Orchestration:** inline (main thread, Opus) — the harness IS the automation. Copy `no-inline-wave{1,2}-manifest.json`, add the remaining blocks + asymmetric custom instances; run `node scripts/no-inline-land-verify.js <manifest>` via PowerShell. Blocks on page 8 (info-box/testimonial/cta-section/card-grid/feature-grid/trust-bar/product-card): re-clone + live-verify. `/qc-inline` gate after each batch. **Acceptance:** every block PASS (zero inline property declarations + correct computed box at 375/768/1440); a `reports/visual-diff/<block>-2026-07-DD.md` per block; `leftover-buckets.json` shows nothing wrongly dropped.

## Task 2 — `colourPreset` pill-fill fix (`P-PILL-SELECTED-FILL-PRESET`)
**What:** the cloned option-picker/product-card should set `colourPreset=''` when it supplies explicit per-pill colours, so the draft's pale-tint selected fill (`rgba(230,138,149,0.1)`) governs instead of the `solid` preset's primary fill.
**Why:** the last pill-fidelity gap; the converter already extracts + stores the rgba correctly.
**Estimated time:** 20 min.
**Orchestration:** inline. `/brainstorming` the emit decision (converter suppresses the preset when explicit pill colours present, OR product-card forward nulls the preset). `/qc-council` (converter-adjacent). Re-clone page 8 + live-verify the selected pill fills the pale tint. **Acceptance:** live selected pill bg == `rgba(230,138,149,0.1)` (computed alpha < 1), not solid primary.

## Task 3 — Container inline-gap check + wire the zero-tolerance gates (`P-CONTAINER-INLINE-GAP-CHECK` + Task 4)
**What:** confirm whether `sgs-container`'s inline `gap:16px` (seen live on page 8) is scoped-correct or a residual vs D296; then wire `audit-inline-styling.js --check` + `check-box-family-guard.py --check` into `package.json prebuild` as ZERO-TOLERANCE.
**Why:** the zero-tolerance gate would FAIL on a real inline residual — resolve first.
**Estimated time:** 30 min.
**Orchestration:** inline. `/qc-council` if the wrapper needs a change (shared file). **Acceptance:** `audit-inline-styling.js --check` = 0 across all SGS blocks; both gates in `prebuild`; build still green.

## Task 4 — Spec + gate reconciliation (`P-DECLARATIVE-BOXFAMILY-SPEC-RECONCILE` + `P-F3-NAV-MISTAG-GATE`)
**What:** reconcile Spec 31 §4 / Spec 32 §6.1(c) + CLAUDE.md to the declarative box_family mechanism (they still name the dict); fix the hardcoded-defaults gate's attr↔property precision + var()-fallback counting.
**Why:** docs drift + the gate mis-flags structural CSS as dead-control debt.
**Estimated time:** 30 min.
**Orchestration:** inline. `/docscore` the edited specs. **Acceptance:** specs say declarative; the 3 mis-tagged F3 baseline rows re-evaluated by the fixed gate; CLAUDE.md consistent.

## Dependency graph
```
Task 1 (inline, Opus — harness LAND, batched)   ─┐
Task 2 (inline — colourPreset, /qc-council)      ─┤ (parallel-independent)
Task 3 (inline — container gap → wire gates)     ─┘
   ↓ (Tasks 1+2+3 done)
Task 4 (inline — spec + gate reconcile) → /handoff → push
```

## Methodology guardrails (do not skip)
- **Deploy + (re-clone if attr-shape changed) + purge (OPcache + LiteSpeed) BEFORE measure** (STOP-21). Emit-green ≠ LANDED.
- **Root cause before instance fix** — a class-of-failure fix (converter/wrapper) beats per-block tuning.
- **Outcome vs completion** — the rollout is NOT done until every block is LANDED + the gates wired; code-merged ≠ outcome-hit.
- **/qc-council before any converter / shared-render / wrapper commit** (blub-255).
- **No version bumps, no deprecations** (D293). Visual-diff report at repo-ROOT (STOP-67). Branch `main`; path-scoped commits.
