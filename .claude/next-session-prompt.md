---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-14
primary_goal: "TOP TASK = the block.json-declared, auto-seeded selector mechanism (P-BLOCKJSON-SELECTOR-AUTOSEED) — replace the hardcoded selector dict in /sgs-update with block-owned declarations seeded by /sgs-update, COVERING canonical_slot-populated rows (which assign-canonical's `WHERE canonical_slot IS NULL` + fingerprints.json both skip). Rule-7 seeding-pipeline change → DESIGN-GATE + /adversarial-council BEFORE build. THEN: Bean deploys + live-verifies the 4 shipped converter fixes (GF-B.2 / H-C1 / IN-B / gridItem*, commit a8bf5616, conformance-green but NOT live-verified) on canary page 8. THEN the 3 deferred design-gate phases (array→child FR-22-2.5, draft breakpoints FR-22-5.2, D1 sidecar) each get their own design session. IN-E after the live-probe."
---

# Next session — block.json selector auto-seed (design-gate first), then live-verify the shipped fixes

> Invoke `/autopilot` first. Then READ end-to-end BEFORE acting: `.claude/decisions.md` D225 (this session) + `.claude/parking.md` P-BLOCKJSON-SELECTOR-AUTOSEED + P-SPEC22-DESIGN-GATE-PHASES + `.claude/state.md` cloning block + Spec 22 §FR-22-2 (capability-seeding pattern) + §FR-22-5.1/5.3/21 (now built_status-corrected with file:line).

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block/seeding action — carry forward verbatim)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft class's content + CSS transfers, OR is reported skipped-with-reason, per class.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live DOM + computed-style on canary page 8 vs the draft. Emit-green ≠ rendered.
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, **the /sgs-update seeding pipeline**, most-used block) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-14 close — D225)
A subagent-driven build run shipped **4 converter fixes** to `main` (commit `a8bf5616`, each with a fire-proof lock-in test, both conformance suites green 84/84 — but **NOT live-verified**): GF-B.2 selector-scope matcher (no cross-section CSS bleed), H-C1 per-slot max-width, IN-B co-declared `var()` resolver, gridItem* uniform per-item CSS. The **verify-first discipline correctly DEFERRED** the other "Spec-22 gaps" (array→child, draft breakpoints, D1 sidecar) as design-gate PHASES — they were bigger-than-labelled, not quick wires. Bean's questioning exposed a **selector-seeding smell**: per-attr styling selectors were hardcoded in `ATTR_CLASSIFICATION_OVERRIDES` (a code dict in `sgs-update-v2.py`) because assign-canonical (`:485 WHERE canonical_slot IS NULL`) + fingerprints.json both **skip canonical_slot-populated rows** — so the override dict was the only channel reaching the 5 testimonial styling attrs. The hardcoded `nameFontWeight` selector was **reverted entirely** (Bean: no hardcoded selectors). The proper fix is the **top task below**. Spec-22 `built_status:` labels were truth-synced (FR-22-5.1/5.3 were mislabelled PLANNED but are BUILT). **D-CEILING: D225.**

## Tasks

### Task 1 — block.json-declared, auto-seeded selector mechanism (TOP — design-gate first)
**What:** make per-attr styling selectors BLOCK-OWNED (declared in `block.json` `supports.sgs`, same rails as `scalarStylingLift`/`variants`/`containerKind`) and AUTO-SEEDED by `/sgs-update` into `block_attributes.derived_selector` — COVERING `canonical_slot`-populated rows. Remove the hardcoded selector dict (`ATTR_CLASSIFICATION_OVERRIDES`) + the fingerprint/migration copies; `ATTR_CLASSIFICATION_OVERRIDES` keeps only genuine `role` corrections.
**Why:** R-22-1 (DB-driven, no hardcoded Python selector dict) + single-source (kills the override/fingerprint/migration triple-drift). Bean directive (D225).
**Estimated:** design ~20 min, council ~10 min, build ~30 min.
**Orchestration:** Execution = **design inline (Opus)** → `/brainstorming` design mode for the block.json schema + the /sgs-update seed step → `/adversarial-council` on the seeding-pipeline approach (Rule 7 — touches every block's selector seeding) → then **delegate the build to a sonnet subagent** (`/delegate`), main agent `/qc-council` + full `/sgs-update` reseed verify + commit. Context the subagent needs: assign-canonical `:485 WHERE canonical_slot IS NULL` is why the auto-channels skip these rows; the fix must seed canonical_slot-populated rows; verify via a FULL reseed that all 5 testimonial styling selectors survive from the block.json source alone; both conformance suites green.
**Depends on:** none. **/qc gate after:** `/qc-council` + full reseed + both suites.
**Acceptance:** selectors declared only in block.json; a full `/sgs-update` reseed reproduces all derived_selectors (incl canonical_slot-populated rows) with ZERO hardcoded Python selector dict + ZERO fingerprint/migration duplicate; 84/84 suites green.

### Task 2 — Bean: deploy + live-verify the 4 shipped converter fixes (closes ledger rows)
**What:** re-clone the Mama's mockup + deploy + computed-style probe page 8 to confirm GF-B.2 (no cross-section bleed), H-C1 (sub-headline max-width = draft), IN-B (content band = resolved literal), gridItem* (uniform card CSS) RENDER.
**Why:** conformance = no-regression only; R-22-11 demands live computed-style. Emit-green ≠ rendered.
**Orchestration:** Bean deploys (per the orchestration model — deploy + live-verify on canary is Bean's); main agent drives the computed-style probe via chrome-devtools (Playwright fallback on "Browser already in use"). Build via PowerShell `npm run build`. Then flip the GF-B.2/H-C1/IN-B/gridItem* ledger rows to VERIFIED with the commit hash.
**Depends on:** none. **Acceptance:** live computed-style on page 8 = draft values, no regression on other sections/clients.

### Task 3 — the 3 deferred Spec-22 design-gate phases (each its own design session)
**What:** (a) FR-22-2.5 array→child wiring (per-item emit machinery absent + deprecations + has_inner_blocks=0); (b) FR-22-5.2 draft-driven breakpoints (tiering policy + _BREAKPOINT_RULES suffix-validation + dual-mechanism); (c) D1 layout sidecar (verify-first whether superseded by the name-free router). See P-SPEC22-DESIGN-GATE-PHASES.
**Orchestration:** each = `/brainstorming` design + `/adversarial-council` BEFORE build (Rule 7). Do NOT build any blindly — verify-first confirmed they're phases, not wires.
**Depends on:** none (independent). **Acceptance:** per phase — design-gate GO + built + both suites + live-verify.

### Task 4 — IN-E inherited text-align emit-gate widen
**What:** widen the `_resolve_inherited_typography` emit gate (`convert.py:1836`) to emit onto WP-native `supports.typography.textAlign` attrs (universal, R-22-9) so info-box (which uses supports, not a DB attr) gets the inherited centre.
**Orchestration:** PROBE-FIRST (Bean deploy) — the ledger flags IN-E "SUSPECT-MISDIAGNOSIS"; confirm it's a real defect on the live draft before building. Then `/adversarial-council` (widening the universal inherited path is high-blast). Orchestrator pre-resolves the exact WP attr name via `/wp-blocks` + render.php.
**Depends on:** Task 2 (live baseline). **Acceptance:** live info-box computed `text-align: center`; no `textAlign:left` over-emit on the ~16 supports-typography blocks.

## Dependency graph
```
Task 1 (block.json selector auto-seed: design inline → /adversarial-council → sonnet build → /qc-council → reseed-verify → commit)   [TOP]
Task 2 (Bean deploy + live-verify the 4 shipped fixes → flip ledger rows)   [parallel with Task 1]
Task 3 (3 design-gate phases — each /brainstorming + /adversarial-council BEFORE build; independent)
Task 4 (IN-E — depends on Task 2 live baseline; probe-first then council)
each commit: path-scoped (`git commit -- <paths>`); merge to main via temp-worktree if co-actively held
```

## Methodology guardrails (do not skip — carried forward + extended)
- **Read the implementing SCRIPT before proposing/critiquing ANY converter/seeding mechanism** — never trust spec `built_status:` labels, attr/column names, or "probably true" (blub.db 353, D225). A council/subagent finding is a HYPOTHESIS — fact-check it against the code.
- **Verify-first on any "gap"** — labels undersell scope. Of 4 Spec-22 "gaps" this session, only 1 was a clean build; 3 were design-gate phases. Confirm a gap is a contained wire before dispatching a build (D225).
- **Emit-green ≠ rendered** — verify the full render chain on the LIVE DOM (attr TYPE → WP supports → render.php → safecss). Grep render.php + the wrapper for the attr BEFORE lifting onto it.
- **TWO conformance suites** — Gate A golden harness `plugins/sgs-blocks/scripts/tests/test_converter_conformance.py` (pre-commit) AND `converter_v2/tests/`. Run BOTH; a subagent "conformance passed" can miss Gate A.
- **DB changes reproducible from the CANONICAL PATH** — block.json `supports.sgs` (preferred, auto-seeded) OR dated `migrations/*.py` OR `ATTR_CLASSIFICATION_OVERRIDES` (role-only, NOT selectors after Task 1); verified by a FULL `/sgs-update` reseed. NEVER a manual DB edit, a module-load write-side-effect, or a hardcoded Python selector dict.
- **Golden regen is high-risk** — a subagent can pass conformance by rewriting the golden to its own (wrong) output. ALWAYS diff a regenerated golden vs the FIXTURE DRAFT CSS; confirm nothing dropped (Rule 4).
- **Deploy before measure** — `npm run build` (PowerShell) + deploy + OPcache reset BEFORE any pixel-diff/computed-style. Bump block.json/style.css version on any CSS change (Hostinger CDN 7-day cache).
- **/qc-council BEFORE every converter/SGS-block/seeding commit** (blub.db 255). **/adversarial-council before any shared-mechanism change** (Rule 7).
- **Commit by explicit path** (`git commit -- <paths>`). Merge to co-actively-held main via temp-worktree cherry-pick; verify is-ancestor + staged-count after each push.
- **Subagents implement; Opus orchestrates** (plan/delegate/QC/live-test/commit). Subagents have NO commit/deploy authority; NEVER `git checkout/restore/stash/reset/clean` the shared tree.
- **Pixel-diff is misleading — verify the LIVE DOM (R-22-11), not the number** (empty section = false WIN). Per-row live probes are the acceptance, never the aggregate differ.
- **Bean's "are you sure?"/"why?" on a hardcode/deletion = a mandate to investigate the architecture, not reassure.** Default to the block-owned/DB-driven pattern over a command-script hack.

## Pre-flight self-attestation ritual (answer before the first action)
1. Which thread am I? (cloning-pipeline — owner of convert.py + the homepage pipeline + state.md/handoff/next-session-prompt.)
2. What branch is the tree on? (`git branch --show-current`.) Has `origin/main` moved? Anything co-actively staged? (`git status` — commit ONLY by explicit path.)
3. Have I read decisions D225 + the parking entries + the relevant Spec 22 FR (built_status now code-verified) end-to-end before proposing a fix-shape?
4. What is the MEASURABLE acceptance (live computed-style on page 8 = draft, OR a full-reseed reproduction for seeding) — not "code shipped"?
5. Is this Rule-7 high-blast (seeding pipeline / cross-node router / convert.py / most-used block)? Then `/adversarial-council` (approach) + `/qc-council` (per commit) BEFORE/AROUND the build.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Task 1 schema design + each Task-3 phase design (design mode) |
| `/gap-analysis` | grade any unit vs its FR acceptance before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | any WP/block.json `supports.sgs` pattern you're unsure of |
| `/strategic-plan` + `/phase-planner` | if Task 1/3 needs a formal phased plan |
| `/adversarial-council` | MANDATORY on the seeding-pipeline approach (Task 1) + each Task-3 phase + IN-E BEFORE building (Rule 7) |
| `/qc-council` | MANDATORY before every converter/SGS-block/seeding commit (blub.db 255) |
| `/subagent-driven-development` · `/dispatching-parallel-agents` · `/subagent-prompt` | per-task dispatch (subagents implement) |
| `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | re-clone / DB reseed / schema + attr TYPES ground truth |
| `/verify-loop` · `/capture-lesson` · `/handoff` | 2-attestation / new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| chrome-devtools (Playwright fallback on "Browser already in use") | live page-8 DOM + computed-style probes (creds `.claude/secrets/sandybrown.env` — grep/cut, never `source`) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema + attr TYPES + the WP-native supports attr name (Task 4) |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs / derived_selector / classification (DB-authoritative) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | Task 1 build + each Task-3 build — NO commit/deploy authority, returns uncommitted |
| general-purpose (haiku / gemini-flash) | 2nd cross-family rater on the /qc-council pass |
| `wp-sgs-developer` | if a task needs heavier WP/block.json/seeding work |
| `design-reviewer` | if a fix changes a visible surface (live page-8 3-breakpoint) |

## Guardrails
Cloning thread owns the converter + homepage pipeline + the /sgs-update seeding path. The seeding-pipeline change (Task 1) is Rule-7 high-blast → design-gate. Build per task, `/qc-council` + Gate A + (live page-8 for visible work) per commit. The FR-22-3 guard blocks new `if slug==` literals. Run BOTH conformance suites. D-ceiling check before any new D (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`).
