---
doc_type: next-session-prompt
project: small-giants-wp
thread: no-inline styling rollout — finish the container+button pilot, then universal rollout
generated: 2026-07-09
primary_goal: "Finish the box-object no-inline PILOT: build the button half (corners/hover/editor), prove A3 (tier-object accumulator) live, run a /qc-council on the orchestrator.py dict-merge (blub-255), THEN begin the universal rollout. Container CORE is already proven live (D292); the mechanism WORKS — this session completes the pilot's coverage + the converter sign-off, then scales it."
---

# NEXT SESSION — finish the box-object no-inline pilot (button + A3 live + orchestrator council), then roll out

Invoke `/autopilot` first. Container CORE is PROVEN LIVE (D292, `764ab2e6`): the no-inline mechanism (skipSerialization + Style-Engine-scoped + box-object attrs + box_family guard) works end-to-end on a real dynamic block. This session CLOSES the pilot's remaining coverage + signs off the converter change, then begins the universal rollout.

**Agent identity.** SGS cloning-pipeline + block engineer completing a Bean-approved, council-hardened styling re-architecture. You ORCHESTRATE (Opus) + GATE; delegate the code to Haiku (mechanical) / Sonnet (architectural) subagents against the FIXED interface contract. Prove every premise on the REAL node + LANDED on page 8 before "done" (STOP-21/43); one solo coding subagent at a time on shared files (STOP-39); shared-mechanism/schema changes gate with Bean (Rule 7).

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes.
2. **NO CHEATS** — no hardcoded `!important`/default overriding faithful draft CSS, no per-slug/per-role literal in a resolver body, no name-regex box merge (use the DB `box_family` — enforced by `check-box-family-guard.py`).
3. **UNIVERSAL, no carve-outs** — a fix fires for every qualifying block via a DB fact, never `if slug==X`.
4. **NO SKIPPING** — every draft CSS declaration transfers, is EXCLUDED-with-reason, or is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone at 375/768/1440. Emit-green ≠ LANDED. WRITTEN ≠ LANDED. "Deploy to homepage" = overwrite page 8.
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES / SCOPED CSS, never inline** (the deliberate `sgsCustomCss` channel for non-device breakpoints is the only non-attr output).
7. **FOLLOW THE SPEC + design-gate shared-mechanism/DB-schema changes with Bean before building.**

## Mandatory READING (tick each in your first message; verify against ground truth)
1. [ ] `.claude/handoff.md` top entry (2026-07-09, D292) + `.claude/decisions.md` head (verify D-ceiling `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — was D292).
2. [ ] `.claude/plans/2026-07-09-box-object-interface-contract.md` (THE FIXED CONTRACT — every subagent builds against it) + `.claude/plans/2026-07-09-no-inline-styling-design-gate.md` (mechanism + the A1–A9 Pilot Acceptance Test + rollout).
3. [ ] `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` IN FULL (Bean-locked) — esp. §3.A step 3b (accumulator + migration-safety discriminator), §4 (box_family/box_side), §13.4 FR-31-22. + `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` §6.1 (geometry token families).
4. [ ] The container reference impl (the proven pattern to copy for button): `src/blocks/container/{block.json,edit.js}`, `includes/class-sgs-container-wrapper.php` (base+tier object-read + skipSerialization), `src/components/ResponsiveBoxControl.js`, `scripts/converter/services/root_supports.py` + `resolvers/content_band.py` + `orchestrator.py` (the accumulator + dict-merge).
5. [ ] `CLAUDE.md` §"Block styling contract — no inline styling" + the STOP catalogue.

## ⛔ ANTI-PATTERN STOP CATALOGUE — carried forward (STOP-1 … STOP-66; do NOT subtract — D101 rule)
The full catalogue STOP-1…STOP-64 lives in the prior `next-session-prompt.md` (git history) + is distilled across `decisions.md`. STOP-65 (D290) + STOP-66 (D292) are the newest. Most load-bearing for THIS session's work:
- **STOP-16 — a subagent's "tests pass / it works" is a HYPOTHESIS.** Re-run the suite + gates YOURSELF (`cd plugins/sgs-blocks/scripts && python -m pytest converter/tests -q --import-mode=importlib`; `python check-box-family-guard.py --check`).
- **STOP-21 — LANDED only by deploying the genuine emit to a live page + computed-style/innerText.** Re-clone recipe: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8 --skip-autonomy-gate` → OPcache reset (HTTP) → **LiteSpeed purge (Hostinger MCP `hosting_clearWebsiteCacheV1`, user `u945238940`, domain `sandybrown-nightingale-600381.hostingersite.com`)** → anonymous Playwright + cache-bust.
- **STOP-39 — one SOLO coding subagent at a time on shared files; read-only/disjoint-file agents may run parallel.**
- **STOP-43 — prove the premise on the REAL node BEFORE + AFTER, not code inference.**
- **STOP-44 — a schema-valid emitted attr can be a RENDER no-op; verify it PAINTS on the LIVE element.**
- **STOP-57 — bump the block version on every CSS/render change (CDN stale otherwise).**
- **STOP-58 / STOP-66 (NEW, D292) — a stage-1 reseed leaves ORPHANED flat attr rows after a block.json attr-shape change; they mis-route the pipeline slot-list. Prune (manual DELETE on the REAL DB `~/.claude/skills/sgs-wp-engine/sgs-framework.db`, or full `/sgs-update`) before re-clone. `sgs-db.py sql` is READ-ONLY.**
- **STOP-60 — do NOT re-run a golden SEED script to make the suite green; re-seed per-section with a cited LANDED proof only.**

## Pre-flight self-attestation (answer in your first message)
1. Reading gate done (contract + design-gate + Spec 31 §3.A step 3b + the container reference)? Quote one specific thing.
2. Branch (`main`) + D-ceiling (D292 — verify)? Working tree clean (ignore `lucide-icons.php` + 0-byte `.db` strays)?
3. For every fix: proven on the REAL node BEFORE+AFTER (STOP-43), LANDED on page 8 (computed values), never emit alone?
4. Baselines not to regress: converter suite 428 pass; AST gate exit 0; container CORE (A1/A2/A5/A6) still live; the box_family guard intact.
5. Solo coding subagent on shared files (STOP-39); I re-run tests/gates + LANDED-verify myself (STOP-16).

---

## ORCHESTRATION PLAN (do in order; delegate the code, gate each yourself)

### Task 1 — Button half of the pilot (B/C/D) — corners + hover + editor
**What:** migrate `sgs/button` to the box-object model exactly like container: block.json → object attrs (padding/margin/borderWidth 4-SIDE + border-radius 4-CORNER), edit.js wires `ResponsiveBoxControl` + the corner control, the converter already emits (box_family already seeded for button in `ATTR_CLASSIFICATION_OVERRIDES`), re-clone + verify.
**Why:** container can't test corners (A9) or hover (A7) or the custom-border path; button covers all three — required before the universal rollout (council's pilot expansion).
**Orchestration:** Wave B-button (solo Sonnet — button block.json + edit.js + render, following the container pattern) → prune button orphans (STOP-66) → re-clone → verify A7 (hover computed differs), A9 (4 corners incl. asymmetric render), A8 (editor BoxControl writes + preview matches), A1/A2 (no inline). Model: Sonnet (solo, foreground). /qc gate: `/qc-inline` on the built button + LANDED page 8.
**Depends on:** none (container reference exists). **Acceptance:** button LANDED page 8 with zero inline, corners + hover render correct, editor BoxControl works.

### Task 2 — A3/A3b live proof (container tier-object accumulator)
**What:** exercise the tier-object accumulator LIVE — set a container's `paddingTablet` object via the editor BoxControl (or clone a section with responsive/asymmetric padding), verify it renders as a scoped `@media .uid{padding:…}` rule with 4 distinct sides.
**Why:** A3 is currently UNIT-proven only (Mama's containers have base padding only). **Orchestration:** inline (Opus) — editor set + Playwright computed-style at 768/375. **Acceptance:** an asymmetric 4-value tier padding renders all 4 sides distinct + correct, scoped, no inline.

### Task 3 — `/qc-council` on the `orchestrator.py` dict-merge (blub-255)
**What:** multi-model council on the high-blast-radius `orchestrator.py` collision/merge change (the shared dispatch spine) before treating the converter change as fully shipped.
**Why:** blub-255 / STOP-23 — converter commits get a multi-rater review; this change touches every resolver's path. **Orchestration:** `/qc-council` (3 raters). **Acceptance:** council GO, or fix + re-run.

### Task 4 — Begin the universal rollout
**What:** apply the proven pattern to the roster (the other ~50 blocks + the block-private render.php `style=` conversions), per the design-gate doc, one solo coding subagent at a time, each LANDED. Wire `audit-inline-styling.js --check` + `check-box-family-guard.py` into prebuild once the roster is green.
**Why:** the pilot proved the mechanism; the rollout delivers the "zero inline framework-wide" outcome. **Orchestration:** delegated waves (Haiku/Sonnet), Opus gating; group by shared-helper vs block-private (61% is central). **Acceptance:** each block LANDED zero-inline; the two gates wired zero-tolerance.

## Dependency graph
```
Task 1 (button, Sonnet solo) → /qc-inline + LANDED
Task 2 (A3 live, inline Opus)  } can run alongside Task 1
Task 3 (/qc-council on orchestrator) → GO before Task 4
  ↓
Task 4 (universal rollout — delegated waves, gated) → wire the 2 gates when green
```

## Skills to Invoke
| Skill | When |
|-------|------|
| /brainstorming | ALWAYS — design decisions in the rollout |
| /gap-analysis | ALWAYS — grade outputs before delivery |
| /lifecycle | ALWAYS — before any skill/agent change |
| /research | ALWAYS — auto-routes tier (library-docs for WP APIs) |
| /strategic-plan | ALWAYS — order the rollout waves |
| /qc-council | Task 3 (orchestrator) + every converter/block commit (blub-255) |
| /qc-inline | per-block build check |
| /dispatching-parallel-agents /subagent-driven-development | the delegated waves |
| /library-docs | WP BoxControl / Style Engine / skipSerialization APIs |
| /sgs-clone /sgs-db /wp-blocks | pipeline + schema ground truth |
| /verify-loop /handoff /capture-lesson | 2-attestation / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright / chrome-devtools | LANDED computed-style at 375/768/1440 on page 8 |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | LiteSpeed purge before live verify (deploy/re-clone does NOT purge it) |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql` (READ) + a direct sqlite3 admin op for prune | DB queries + STOP-66 orphan prune |
| PowerShell `npm run build` → `build-deploy.py --target sandybrown --skip-build --blocks-only` | deploy (bump version, STOP-57) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (Sonnet, solo) | button block-side + converter architectural work |
| general-purpose (Haiku) | DB seeds, running tests/audits/screenshots, repetitive block.json edits |
| Explore / general-purpose (read-only, parallel) | rollout roster mapping, tracing |
| wp-sgs-developer | heavier WP block builds in the rollout |

## Methodology guardrails (do not skip)
- **Deploy + re-clone + purge (LiteSpeed + OPcache) before measure** (STOP-21); bump block version on CSS change (STOP-57).
- **Prune orphaned flat attr rows after any block.json attr-shape change** (STOP-66) before re-clone.
- **Prove the premise on the real node** (STOP-43); LANDED on page 8, never emit alone (STOP-4/44).
- **/qc-council before every converter/block commit** (blub-255); re-run tests + gates yourself (STOP-16).
- **One solo coding subagent at a time on shared files** (STOP-39); fixed interface contract up front (no drift).
- Branch main; verify D-ceiling; commits path-scoped; container/button render changes need a `reports/visual-diff/<block>-YYYY-MM-DD.md` (verdict: PASS) for the commit gate.
