---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-18
primary_goal: "BUILD Phase-F step F4 — the closed, audited EXCLUDED-properties set (Spec 31 §12.2 MF-4 + §12.7 F4): a DB-backed `excluded_properties(css_property, reason, decided_by, date)` table that SHIPS EMPTY (Bean: no exceptions we don't copy), seeded only via a dated migration, plus a literal-ban gate that fails the build on any in-code exclusion literal OR any table growth without a migration+reason. F1 (fixtures), F2 (declare_input ledger, `f8a746c7`/D232) and F3-core (the LANDED render-oracle, `6b430dae`/D234) are DONE. F4 is a SHARED-MECHANISM / gate change (Rule 7 high-blast) → it gets its OWN `/brainstorming` design → `/adversarial-council` → Bean gate BEFORE any build. Then F5 (build+ARM the 3 gates) → F6 (DB-as-code consistency) → the stage-by-stage rebuild. Mama's parity is the METRIC (content 100%; full mobile 61.82/tablet 59.09/desktop 55.45%), not the goal."
---

# Next session — CLONING CSS-TRANSFER: build Phase-F step F4 (the closed EXCLUDED set)

## ⛔⛔ READ THIS FIRST — MANDATORY READING GATE (Bean directive: do NOT guess, assume, or proceed under-read)

This rebuild has failed repeatedly because sessions GUESSED, ASSUMED things were missing, or reasoned from a doc's cached status instead of ground truth. **You may not propose a fix-shape, dispatch a subagent, or write code until you have READ IN FULL and can self-attest to each.** Tick them in your first message:

1. ☐ `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` — §12.2.4 (MF-4: closed audited EXCLUDED set — `excluded_properties(css_property, reason, decided_by, date)` + the gate that fails on an in-code exclusion literal or growth-without-migration; **excluded-from-LIFT ≠ excluded-from-CLONE — an excluded property must still D2-passthrough for fidelity**), §12.7 (F4 row + done-when), §12.2.1 (the F2 ledger MF-1 — F4's `excluded` set is one of the three legs of `UNACCOUNTED = draft − (transferred ∪ excluded-with-reason ∪ gap)`), §12.3 (the no-suffix-row property class — candidates are seed-row OR exclude-with-reason, NOT silent drop).
2. ☐ The F2 ledger (so F4's join lines up): `plugins/sgs-blocks/scripts/ledger/models.py` (the `InputDecl.excluded_candidate` advisory bool — note its docstring: "F5 MUST join the F4 excluded_properties table, never this bool"; F4 builds that table) + `declare_input.py`. F2's frozen F2↔F5 join key is `(selector,property,media)`.
3. ☐ The F3-core oracle just shipped (so you know the spine F4 plugs into): `plugins/sgs-blocks/scripts/oracle/{models,verdict,guards}.py` — the §6 LANDED contract + the F3→F5 join key `(section_id,block_slug,property,tier)`. F4 + F3 + F2 together are the no-silent-drop spine F5 enforces.
4. ☐ The DB-as-code migration pattern (F4 seeds via a dated migration, NEVER a manual edit): the canonical example `migrations/2026-06-13-property-suffixes-align-items.py` + how `/sgs-update` reseeds. Query the live DB FIRST (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) — does an `excluded_properties` table already exist? what `property_suffixes` rows already cover the "no-suffix-row" class (STOP-11: the doc's list is partly STALE)?
5. ☐ `.claude/decisions.md` D232 (F2) + D233 (F3 re-scope) + **D234 (F3-core shipped)** + the GROUND-TRUTH-FIRST block in `.claude/state.md`. Design doc for F3 (context): `.claude/plans/2026-06-18-f3-render-oracle-design.md`.

**If you skip the reading and start guessing, you WILL recreate the exact failure this whole rebuild existed to end. Do not.** Reading order = `docs-registry.yaml` `cold_start_reading_order`.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block/wrapper action — verbatim)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default that overrides faithfully-transferred draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops (the draft-derived ledger + the F4 excluded table enforce this structurally).
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live computed-style + the draft-vs-clone render-diff. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (computed-style matches draft). (F3-core now mechanises this for one fixture.)
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding, ledger, oracle, gates, the EXCLUDED set) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building. **F4 IS such a change — design-gate it first.**

## State recap (plain English, 2026-06-18 close — D234)
The cloning CSS-transfer system is being **rebuilt clean** (Spec 31 §12) — a Tier-1 FOUNDATION (the draft-derived ledger + render-oracle + armed gates) built BEFORE any stage, then a stage-by-stage rebuild gated by that foundation. **F1** (fixtures), **F2** (the draft-derived CSS Accounting Ledger input parser — `plugins/sgs-blocks/scripts/ledger/`, `f8a746c7`, D232) and **F3-core** (the LANDED render-oracle — `plugins/sgs-blocks/scripts/oracle/`, `6b430dae`, D234) are all DONE. F2 reads any draft's CSS independently so silent drops are structurally impossible to hide; F3-core proves a written value actually LANDED via targeted computed-style on the rendered block (live-canary-proven on `rt-centred-maxwidth`: 4 LANDED + 2 UNVERIFIED, all correct). Together with F4 they form the no-silent-drop spine. **NEXT = build F4**: a closed, audited `excluded_properties` DB table that SHIPS EMPTY (Bean's lock: no exceptions we don't actually copy), seeded only via a dated migration, + a literal-ban gate. F4 closes the third leg of `UNACCOUNTED = draft − (transferred ∪ excluded ∪ gap)`. It is a Rule-7 shared-mechanism/gate change → design-gate it (brainstorming → adversarial-council → Bean) BEFORE building.

## First action (~5 min, zero deps)
Complete the MANDATORY READING GATE, then the pre-flight ritual (below). Re-confirm ground truth: `git branch --show-current` (→ main) + `git status` + `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (D-ceiling **D234**). Confirm F2+F3-core shipped: `python -m pytest plugins/sgs-blocks/scripts/ledger/tests/ plugins/sgs-blocks/scripts/oracle/tests/ -q` (→ 167 + 181 pass). Query the DB: does `excluded_properties` already exist? (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%exclud%'"`). Confirm the 3 F5 gates STILL don't exist (`ls plugins/sgs-blocks/scripts/check-converter-cheats.py plugins/sgs-blocks/scripts/orchestrator/generate-coverage-matrix.py 2>&1` → absent).

## Tasks

### Task 1 — DESIGN-GATE F4 (brainstorming → adversarial-council → Bean), THEN build [Spec 31 §12.2.4 + §12.7 F4]
**What:** the closed, audited `excluded_properties(css_property, reason, decided_by, date)` DB table — **ships EMPTY** (Bean: no exceptions we don't copy) — seeded ONLY via a dated `migrations/*.py` + full `/sgs-update` reseed (never a manual DB edit), plus a literal-ban gate that fails the build on (a) any in-code exclusion literal anywhere in the converter, OR (b) any table row added without a migration+reason. The table is the authoritative source F5's ledger checker joins to decide `excluded-with-reason` vs `UNACCOUNTED`.
**Why:** without a CLOSED audited exclusion set, "no silent drops" is unenforceable — a developer could quietly exclude a property in code and the ledger would never know. F4 makes every exclusion a reviewed, dated, reasoned DB row. **Excluded-from-LIFT ≠ excluded-from-CLONE:** an excluded property must still D2-passthrough so fidelity is preserved (it's "we don't lift this to an attr", NOT "we drop it").
**Estimated time:** ~15 min design-gate + ~30 min build (small table + migration + one gate script).
**Orchestration:** F4 is Rule-7 (a gate + shared exclusion mechanism). FIRST `/brainstorming` (design-mode: table shape, the literal-ban gate's detection mechanism, where it wires) → `/adversarial-council` (shared-mechanism red-team) → Bean approval. THEN build via `/subagent-driven-development` (sonnet implementer, NO commit authority, NO shared-file writes, RETURN data) → independent verify (run the gate against current code; confirm it flags a planted literal + an unmigrated row) → `/qc-council` before commit. DB change reproducible via the dated migration + a FULL `/sgs-update` reseed; run BOTH conformance suites.
**Depends on:** F2 (done — the ledger join). **/qc gate after:** `/qc-council` + the gate proven to FAIL on a planted in-code literal AND on an unmigrated row + the empty table verified + reproducible via migration.
**Acceptance:** the `excluded_properties` table exists + ships EMPTY; a dated migration is the only seed path; the literal-ban gate is wired (prebuild) + proven to fail correctly on both violation types; `excluded-from-lift` still D2-passthroughs (no fidelity loss). NOT "table created" — the GATE must demonstrably reject a real violation.

### Task 2 — (after F4) F5 → F6, then the stage-by-stage rebuild [Spec 31 §12.7]
**What:** F5 = build + ARM the 3 gates (`check-converter-cheats.py` whole-tree, `generate-coverage-matrix.py`, the pipeline-close UNACCOUNTED+WRITTEN-not-LANDED ledger checker joining F2+F3+F4) + wire `check_no_mirror.py --enforce` + a PreToolUse git-commit hook. F6 = DB-as-code consistency suite. THEN the stage-by-stage rebuild (§12.6 step 3), each stage gated by the ledger + oracle.
**Why:** without the armed gates, "no silent drops / cheat-proof" is theatre (the council's fatal-flaw finding). F5 is where F2+F3+F4 become an enforced gate, not just modules.
**Orchestration:** each is its own `/brainstorming` design → `/adversarial-council` (shared mechanism / Rule 7) → Bean gate → SDD build → `/qc-council`. Do NOT batch — F5's gates are high-blast-radius.
**Depends on:** F4. **/qc gate after:** each step.
**Acceptance:** per the §12.7 done-when of each row; F3-runtime (full-37, cache, pixel-diff secondary, deploy-orchestration, %/calc/vw length resolution, MR-1/MR-3) is built lazily when the rebuild first needs to render many fixtures, NOT before.

## Dependency graph
```
MANDATORY READING GATE + pre-flight ritual (inline, Opus)
  → Task 1 F4 (/brainstorming design → /adversarial-council → Bean gate → SDD build → independent verify → /qc-council → commit)  [the closed EXCLUDED set + literal-ban gate]
      → F5 (per-gate: design→council→Bean→SDD→/qc-council; ARM in prebuild + PreToolUse git hook) → F6 (DB-as-code consistency)
          → stage-by-stage rebuild (per stage: design→council→SDD→ledger+oracle gate, before next stage)
each commit: path-scoped (`git commit -m "msg" -- <paths>`, -m BEFORE --); Gate A conformance; D-ceiling check before any new D (→ D234)
```

## Methodology guardrails / STOP catalogue (carried forward + extended — do NOT subtract)
- **STOP-1 — READ before you conjecture.** Never propose a fix-shape, dispatch a build, or assert built/not-built from a doc's cached status. Read the implementing SCRIPT (file:line), the raw pipeline-state artefacts, Spec 31 §12, the design doc, the routing map. The MANDATORY READING GATE is non-skippable. **NEW (D234): even a fixture's `.expected.md` can be STALE** — `rt-centred-maxwidth.expected.md` framed an MF-3 `widthMode`/`customWidth` bug, but those attrs were retired v0.4 (D230/D231); the converter's `maxWidth` was actually correct. Verify the block's CURRENT attr model (block.json + the wrapper) before trusting an expected.md's bug claim. (blub 353.)
- **STOP-2 — Subagents RETURN data, never write shared files.** Every audit/review/extraction/build cold prompt MUST say "return findings in your final message; do NOT write/edit/create any shared file." Orchestrator owns shared writes. Commit valuable artefacts BEFORE dispatching file-capable subagents. (`feedback_subagents_must_not_write_shared_files`.) **NB (D234): SDD implementer subagents that create a NEW module dir are acceptable (no shared-file collision) — the rule bites for shared/in-flight files; never give them commit/deploy authority regardless.**
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** A ledger fed by the converter's recognised set / the same gap-bearing DB is circular and hides drops. F2 parses the draft independently; F3's LANDED probe reads the rendered clone's computed-style directly; F4's excluded set is a CLOSED audited table, not an in-code dict. (Spec 31 §12.2.1; the council's keystone.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate. A value can land on the WRONG layer/tier and still be WRITTEN. Only LANDED (live computed-style = draft on a NON-DEFAULT fixture) closes a cell. F3-core now mechanises this. (Spec 31 §12.2.2.)
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.** A value recognised right at stage 2 can be dropped at stage 4. Gate each stage on the end-to-end ledger+oracle, not an in-stage conformance suite. (Spec 31 §12.1/§12.6.)
- **STOP-6 — A gate that exists but isn't WIRED protects nothing.** Build + ARM gates in prebuild + a PreToolUse git hook. Distinguish "code can check" from "something runs the check on every build." (Spec 31 §12.2.5; `dont-claim-a-guard-is-enforced-unless-wired`.) **F4's literal-ban gate + F5's 3 gates MUST be wired, not just written.**
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers.** A `!important`/default injection overriding faithful CSS = R-22-1 violation. (`feedback_wrapper_hardcoded_defaults_are_cheats_to_remove_not_blockers`.)
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = canonical {767/768, 1023/1024, 1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier. Classify each; a mechanical/Haiku agent can't make this call. F2's tier rule enforces this (600 → `Other:<verbatim>`, never Mobile). (`feedback_device_tier_vs_visual_breakpoints_are_distinct`.)
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined.** Ground variant structure in `variant_slots` + `blocks.variant_attr`, never guess. (`feedback_ground_in_variant_db_for_variant_block_setups`.)
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl soft-fail FIRST. An empty section scores a FALSE pixel-diff WIN — gate on `innerText.length>0` (F3 guard 1, now built). (`feedback_empty_section_check_cv2_softfail_trace_first`.)
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column EXISTS (R-22-8) is necessary but NOT sufficient before reusing/renaming/retiring it. Grep how it's WRITTEN and READ first. The doc's "~15 no-suffix-row properties" list is partly STALE (background-image/object-fit/opacity/aspect-ratio/filter already have property_suffixes rows) — F4's exclude-vs-seed decision must baseline against the LIVE DB, not the doc. (`schema-enumeration-is-not-usage-enumeration`.)
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions (D233).** F3 pairs by the rendered SGS block slug + targeted getComputedStyle (NOT parity2's draft-BEM-class matcher, which native clone output doesn't carry). Reuse infra (R-22-1) but CHECK the reused tool's assumptions match your data. (`parity-bem-class-blind-spot`; design doc §11.)
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace, don't skip the lens (NEW, D234).** F3-core's Opus (same-family) review + the live proof were strong, but the qc-council cross-FAMILY (Gemini) rater was tool-blocked in the Windows harness (3 distinct failures: gemini-analyser agent harness, gemini CLI node-path, binary path). Rather than skip the diversity lens, trace the cardinal-sin questions branch-by-branch yourself against the code — that's what surfaced FIX-M (unparseable-length → UNVERIFIABLE consistency). Never let a broken optional tool silently drop the diversity check; substitute the reasoning. (blub 255 / cross-family-triangulation lever.)
- **Deploy before measure** — convert.py needs no build; block.json/render.php/style.css/theme changes need `npm run build` (PowerShell) + deploy + version bump (Hostinger CDN 7-day) BEFORE any pixel/DOM probe. **Editor-push for live render:** put cloned markup on the canary via the editor `wp.data` path (parse → resetBlocks → editPost publish → savePost), NOT REST post_content (wp-content-guard). Creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **Root-cause FAMILY before instance fix** (R-22-9). **Gate A** `scripts/tests/test_converter_conformance.py` (pre-commit) is the live converter conformance suite; `converter_v2/tests/` does NOT exist. **DB changes reproducible** from a dated `migrations/*.py` OR `block.json supports.sgs`, verified by a FULL `/sgs-update` reseed — never a manual DB edit. **Commit path-scoped** (`git commit -m "msg" -- <paths>`, -m BEFORE --; the pre-existing lucide-icons/phase4/theme-handoff dirty files are NOT yours — leave them). **Subagents implement; Opus orchestrates** (plan/delegate/QC/live-test/commit); subagents NEVER `git checkout/restore/stash/reset/clean` the shared tree. **Bean's "are you sure?"/"why?" = a mandate to GROUND in the architecture, not reassure.** **Verify subagent claims against ground truth** — "correct per spec" can mean "correct per a buggy spec line"; read the fixture/contract.

## Pre-flight self-attestation ritual (answer in your first message, before the first action)
1. Have I completed the MANDATORY READING GATE — Spec 31 §12.2.4/§12.7 F4 + §12.2.1 (ledger) + the F2 `excluded_candidate` docstring + the F3-core §6 contract + the migration pattern + D232/D233/D234? (Quote one specific thing from §12.2.4 — e.g. the excluded-from-lift-≠-excluded-from-clone rule — to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D234.) Anything uncommitted that's MINE? (The pre-existing lucide-icons/phase4/theme-handoff files are NOT mine — leave them. Commit by explicit path, `-m` before `--`.) [Only active workstream — no parallel threads.]
3. Have I DESIGN-GATED F4 (Rule 7) — `/brainstorming` → `/adversarial-council` → Bean approval — BEFORE building, and confirmed the table SHIPS EMPTY + is migration-only-seeded? Is the literal-ban gate's detection mechanism actually wired to something that runs (STOP-6)?
4. For any subagent I dispatch: did I tell it "return data, do NOT write shared files / NO commit authority"? Did I commit valuable artefacts first? Am I verifying its claims against ground truth, not trusting "correct per spec"?
5. What is the MEASURABLE acceptance — the literal-ban gate demonstrably REJECTS a planted in-code exclusion literal AND an unmigrated row, the table ships EMPTY, and excluded-from-lift still D2-passthroughs — NOT "table created"/"tests green alone"? Is this Rule-7 high-blast (gate/shared mechanism)? → `/adversarial-council` + `/qc-council` BEFORE the commit.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | MANDATORY for F4 design (table shape + gate mechanism) BEFORE building; + F5/F6 + each rebuild stage |
| `/gap-analysis` | ALWAYS — grade any unit/plan vs its acceptance before delivery |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | ALWAYS — any WP/CSS-cascade/SQLite-migration/getComputedStyle/Playwright pattern you're unsure of (don't guess) |
| `/strategic-plan` + `/phase-planner` | if F5 or a rebuild stage needs a formal step breakdown |
| `/adversarial-council` | MANDATORY on F4 + F5 designs + every shared-mechanism/converter/gate change (Rule 7) |
| `/qc-council` | MANDATORY before every converter/SGS-block/oracle/gate commit (blub 255). Cross-FAMILY rater where tooling allows; else stand in with a branch trace (STOP-13) |
| `/subagent-driven-development` · `/subagent-prompt` · `/dispatching-parallel-agents` | per-task dispatch (subagents implement, NO commit authority, NO shared-file writes) |
| `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | re-clone+deploy / DB reseed (F4 migration) / schema + attr TYPES + variant_slots ground truth |
| `/systematic-debugging` · `/verify-loop` · `/capture-lesson` · `/handoff` | root-cause / 2-attestation / new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | F4: does `excluded_properties` exist? `property_suffixes` rows covering the no-suffix class? container attrs / block_composition (DB-authoritative) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema + attr TYPES + block.json `default` (query before "missing X") |
| Playwright (chrome-devtools fallback on "Browser already in use") | live computed-style verification on the canary — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`); F3-core live render used editor `wp.data` push on page 1199 (`/f3-oracle-rt-centred-maxwidth/`) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | F4 table+migration+gate build + F5 gate resolvers — NO commit/deploy authority, NO shared-file writes, return uncommitted |
| general-purpose (opus) | cross-model adversarial code-review before commit (caught 4 HIGH+5 MED in F3-core, 3 silent-drop holes in F2 this way) |
| general-purpose (haiku) | 2nd cross-family rater on `/qc-council` (NOT for breakpoint or architecture judgment). [Gemini CLI/agent path is currently tool-blocked on this Windows machine — see STOP-13.] |
| `wp-sgs-developer` | heavier WP/block.json/render.php work |
| `design-reviewer` | visible-surface changes (live page at 3 breakpoints) |

## Guardrails
This is the only active workstream. It owns convert.py + the homepage pipeline + the SHARED `SGS_Container_Wrapper` + /sgs-update seeding + the modular ledger (`ledger/`, F2 done) + the oracle (`oracle/`, F3-core done) + the EXCLUDED set (F4) + gates (F5). ALL are Rule-7 high-blast → design-gate. `/qc-council` + Gate A + the F2 ledger `--check` + the F3 oracle unit tests per commit. D-ceiling check before any new D (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D234). F3-RUNTIME (full-37 / content-hash cache / canary deploy-orchestration / pixel-diff secondary / %-calc-vw length resolution / MR-1/MR-3) is DEFERRED — do NOT build it until the rebuild first needs to render many fixtures. The F3-core live-proof canary page is 1199 (`/f3-oracle-rt-centred-maxwidth/`) — leave it or reuse it.
