---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-18
primary_goal: "BUILD Phase F step F3-core — the LANDED render-oracle (computed-style-primary verdict + 4 false-win guards + MR-2 on ONE fixture), per the council-corrected design `.claude/plans/2026-06-18-f3-render-oracle-design.md` (v2) + Spec 31 §12.2.3/§12.7. F1 (fixtures) + F2 (declare_input ledger, `f8a746c7`/D232) are DONE. F3 was designed + 6-persona-council-corrected + Bean-approved-re-scoped this session (D233) but NOT built — the original pixel-diff-of-bare-draft-vs-WP-clone was apples-to-oranges (~100% false-fails); F3-core uses computed-style as the PRIMARY LANDED signal and DEFERS full-37/cache/deploy-orchestration to F3-runtime. Then F4 (excluded_properties, ships EMPTY) → F5 (3 gates built+ARMED) → F6 (DB-consistency) → the stage-by-stage rebuild. Mama's parity is the METRIC (content 100%; full mobile 61.82/tablet 59.09/desktop 55.45%), not the goal."
---

# Next session — CLONING CSS-TRANSFER: build Phase-F step F3-core (the LANDED oracle)

## ⛔⛔ READ THIS FIRST — MANDATORY READING GATE (Bean directive: do NOT guess, assume, or proceed under-read)

This rebuild has failed repeatedly because sessions GUESSED, ASSUMED things were missing, or reasoned from a doc's cached status instead of ground truth. **You may not propose a fix-shape, dispatch a subagent, or write code until you have READ IN FULL and can self-attest to each.** Tick them in your first message:

1. ☐ `.claude/plans/2026-06-18-f3-render-oracle-design.md` (v2) — **the F3-core build blueprint.** §1 (what builds now), §2 (the 4 guards), §3 (verdict taxonomy + section_id), §4 (MR-2), §5 (what's DEFERRED to F3-runtime + why), §6 (the frozen F3→F5 contract), §7 (acceptance), §11 (the Bean-filtered council verdicts).
2. ☐ `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` — §12.2.2 (WRITTEN vs LANDED), §12.2.3 (render-oracle + metamorphic), §7b (false-win guards), §12.7 (F3 row + gap-to-stage map), THEN §12.0-§12.6 (the clean-modular-rebuild direction).
3. ☐ The infra F3 REUSES (R-22-1 — do NOT rebuild): `plugins/sgs-blocks/scripts/orchestrator/visual_qa_capture.py` (Playwright capture + `_pixel_diff`) + `plugins/sgs-blocks/scripts/parity2/` (reuse its TOLERANCE/normalisation helpers ONLY — NOT its BEM-class matcher; it pairs by draft BEM class which native clone output does not carry, memory `parity-bem-class-blind-spot`).
4. ☐ The F2 module just shipped (so F3's contract lines up): `plugins/sgs-blocks/scripts/ledger/declare_input.py` + `models.py` (the `declare_input` shape + the `(selector,property,media,tier)` key F5 joins on).
5. ☐ `.claude/decisions.md` D232 (F2 shipped) + D233 (F3 re-scope) + the GROUND-TRUTH-FIRST block in `.claude/state.md`.

**If you skip the reading and start guessing, you WILL recreate the exact failure this whole rebuild existed to end. Do not.** Reading order = `docs-registry.yaml` `cold_start_reading_order`.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block/wrapper action — verbatim)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default that overrides faithfully-transferred draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops (the draft-derived ledger enforces this structurally).
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live computed-style + the draft-vs-clone render-diff. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (computed-style matches draft).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding, ledger, oracle, gates) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-18 close — D233)
The cloning CSS-transfer system is being **rebuilt clean** (Spec 31 §12) — a Tier-1 FOUNDATION (the draft-derived ledger + render-oracle + armed gates) built BEFORE any stage, then a stage-by-stage rebuild gated by that foundation. **F1** (multi-shape fixture corpus, `tests/fixtures/phase-f/`) and **F2** (the draft-derived CSS Accounting Ledger input parser — `plugins/sgs-blocks/scripts/ledger/`, `f8a746c7`, D232) are DONE. F2 reads any draft's CSS independently into a complete "every declaration" record so silent drops are structurally impossible to hide; it is physical-declarations-only (the DB owns shorthand decomposition — Bean's catch), fail-CLOSED, 167 tests, wired into prebuild. **F3** (the render-oracle that proves what F2 counted actually LANDED) was DESIGNED + 6-persona-adversarial-council-corrected + Bean-approved-re-scoped this session (D233) but NOT built: the original "render bare draft locally + pixel-diff vs WP-rendered clone" was apples-to-oranges (~100% false-fails — the draft has no theme CSS/fonts), so **F3-core** uses targeted computed-style on the rendered SGS block as the PRIMARY LANDED signal and DEFERS full-37/cache/deploy-orchestration/pixel-secondary to F3-runtime. **NEXT = build F3-core** per its design doc.

## First action (~5 min, zero deps)
Complete the MANDATORY READING GATE, then the pre-flight ritual (below). Re-confirm ground truth: `git branch --show-current` (→ main) + `git status` + `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (D-ceiling **D233**). Confirm F2 shipped (`ls plugins/sgs-blocks/scripts/ledger/` + `python -m pytest plugins/sgs-blocks/scripts/ledger/tests/ -q` → 167 pass). Confirm the 3 F5 gates STILL don't exist (`ls plugins/sgs-blocks/scripts/check-converter-cheats.py plugins/sgs-blocks/scripts/orchestrator/generate-coverage-matrix.py 2>&1` → absent).

## Tasks

### Task 1 — Build Phase F step F3-core: the LANDED render-oracle [design doc §1-§7 + Spec 31 §12.2.3/§12.7]
**What:** the verdict ENGINE proven on ONE fixture — a verdict function that, for a fixture's draft + its rendered clone (on the canary), returns a per-section/per-cell verdict (`LANDED|WRITTEN-not-LANDED|UNVERIFIED|GUARD-FAIL|NOT-RENDERED`), emitting the frozen `_render-oracle/<fixture>.landed.json` (§6). PRIMARY LANDED signal = targeted `getComputedStyle` on the rendered SGS block (pair by block slug → `.wp-block-sgs-<slug>` / block.json `selectors`, NEVER parity2's BEM matcher). Plus the 4 false-win guards (§2: empty / element-present / non-default-from-block.json / NEW height-parity) each with a fail-the-right-way test, and MR-2 (BEM-synonym→identical+correct output, the name-free-routing proof) with a coverage line.
**Why:** F2 guarantees no WHOLE declaration is dropped; F3 guarantees every transferred declaration LANDS (catches WRITTEN-not-LANDED / wrong-layer transfer in the oracle, not Bean's eye — STOP-4). This is the closing-gate engine the stage-by-stage rebuild runs on.
**Estimated time:** ~2 hrs (the live-canary render of one fixture is the heavy bit).
**Orchestration:** Execution = delegated. `/brainstorming` is DONE (design doc v2 approved) — do NOT redesign; if a §5-deferred item tempts you, it's deferred for a reason. Build via `/subagent-driven-development` (sonnet implementer, NO commit authority, NO shared-file writes, RETURN data) → independent verify (run the tests + one real fixture yourself) → `/qc-council` before commit (blub 255). Subagent brief: "build the F3-core verdict function + 4 guards + MR-2 per the design doc §1-§7, reusing visual_qa_capture for capture and parity2 tolerance helpers only; LANDED via targeted getComputedStyle on the rendered block, not parity2 BEM pairing; guard-3 default from block.json."
**Depends on:** F1 + F2 (done). **/qc gate after:** `/qc-council` + the 4 guards each proven to FAIL correctly + one real fixture's `.landed.json` emitted + reuse/independence verified.
**Acceptance:** verdict function returns a per-section/per-cell verdict on ONE real fixture in the §6 schema; 4 guards tested; verdict taxonomy precedence implemented; MR-2 runs with coverage; LANDED uses computed-style on the rendered block (grep proves no parity2 BEM matcher); guard-3 default from block.json; F3-core unit tests wired into prebuild. NOT "code shipped" — the verdict must be correct on a fixture whose draft value ≠ the block default.

### Task 2 — (after F3-core) F4 → F5 → F6, then the stage-by-stage rebuild [Spec 31 §12.7]
**What:** F4 = closed DB-backed `excluded_properties` table (ships EMPTY per Bean — no exceptions we don't copy) + literal-ban gate. F5 = build + ARM the 3 gates (`check-converter-cheats.py` whole-tree, `generate-coverage-matrix.py`, the pipeline-close UNACCOUNTED+WRITTEN-not-LANDED ledger checker) + wire `check_no_mirror.py --enforce` + a PreToolUse git-commit hook. F6 = DB-as-code consistency suite. THEN the stage-by-stage rebuild (§12.6 step 3), each stage gated by the ledger + oracle.
**Why:** without the armed gates, "no silent drops / cheat-proof" is theatre (the council's fatal-flaw finding).
**Orchestration:** each is its own `/brainstorming` design → `/adversarial-council` (shared mechanism / Rule 7) → Bean gate → SDD build → `/qc-council`. Do NOT batch — F5's gates are high-blast-radius.
**Depends on:** F3-core. **/qc gate after:** each step.
**Acceptance:** per the §12.7 done-when of each row; F3-runtime (full-37, cache, deploy-orchestration) is built lazily when the rebuild first needs to render many fixtures, NOT before.

## Dependency graph
```
MANDATORY READING GATE + pre-flight ritual (inline, Opus)
  → Task 1 F3-core (design DONE → SDD build → independent verify → /qc-council → commit)  [the LANDED engine]
      → F4 (design→council→gate→SDD) → F5 (per-gate design→council→gate→SDD) → F6
          → stage-by-stage rebuild (per stage: design→council→SDD→ledger+oracle gate, before next stage)
each commit: path-scoped (`git commit -m "msg" -- <paths>`, -m BEFORE --); Gate A conformance; D-ceiling check before any new D (→ D233)
```

## Methodology guardrails / STOP catalogue (carried forward + extended — do NOT subtract)
- **STOP-1 — READ before you conjecture.** Never propose a fix-shape, dispatch a build, or assert built/not-built from a doc's cached status. Read the implementing SCRIPT (file:line), the raw pipeline-state artefacts, Spec 31 §12, the design doc, the routing map. The MANDATORY READING GATE is non-skippable. (blub 353.)
- **STOP-2 — Subagents RETURN data, never write shared files.** Every audit/review/extraction/build cold prompt MUST say "return findings in your final message; do NOT write/edit/create any shared file." Orchestrator owns shared writes. Commit valuable artefacts BEFORE dispatching file-capable subagents. (`feedback_subagents_must_not_write_shared_files`.)
- **STOP-3 — The ledger/oracle input is the DRAFT, NOT the converter's recognised set.** A ledger fed by the converter's recognised set / the same gap-bearing DB is circular and hides drops. F2 parses the draft independently; F3's LANDED probe reads the rendered clone's computed-style directly, NOT via the converter's claims. (Spec 31 §12.2.1; the council's keystone.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate. A value can land on the WRONG layer/tier and still be WRITTEN. Only LANDED (live computed-style = draft on a NON-DEFAULT fixture) closes a cell. (Spec 31 §12.2.2.)
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.** A value recognised right at stage 2 can be dropped at stage 4. Gate each stage on the end-to-end ledger+oracle, not an in-stage conformance suite. (Spec 31 §12.1/§12.6.)
- **STOP-6 — A gate that exists but isn't WIRED protects nothing.** Build + ARM gates in prebuild + a PreToolUse git hook. Distinguish "code can check" from "something runs the check on every build." (Spec 31 §12.2.5; `dont-claim-a-guard-is-enforced-unless-wired`.)
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers.** A `!important`/default injection overriding faithful CSS = R-22-1 violation. (`feedback_wrapper_hardcoded_defaults_are_cheats_to_remove_not_blockers`.)
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = canonical {767/768, 1023/1024, 1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier. Classify each; a mechanical/Haiku agent can't make this call. F2's tier rule enforces this (600 → `Other:<verbatim>`, never Mobile). (`feedback_device_tier_vs_visual_breakpoints_are_distinct`.)
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined.** Ground variant structure in `variant_slots` + `blocks.variant_attr`, never guess. (`feedback_ground_in_variant_db_for_variant_block_setups`.)
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl soft-fail FIRST. An empty section scores a FALSE pixel-diff WIN — gate on `innerText.length>0` (F3 guard 1). (`feedback_empty_section_check_cv2_softfail_trace_first`.)
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column EXISTS (R-22-8) is necessary but NOT sufficient before reusing/renaming/retiring it. Grep how it's WRITTEN and READ first. Live this session: the doc's "~15 no-suffix-row properties" list was STALE (background-image/object-fit/opacity/aspect-ratio/filter already have property_suffixes rows) — F2 baselines against the LIVE DB, not the doc. (`schema-enumeration-is-not-usage-enumeration`.)
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions (NEW this session, D233).** F3-as-first-designed pixel-diffed a bare-local draft render against a WP-canary clone render — apples-to-oranges (no theme CSS/fonts/resets on the draft side → ~100% false-fails). Two lessons: (a) a verifier comparing two renders MUST render both in the same environment, OR gate on delta-over-a-known-difference-baseline — never an absolute cross-environment pixel threshold; (b) reuse infra (R-22-1) but CHECK the reused tool's assumptions match your data — parity2 pairs by draft BEM class, which native clone output doesn't carry, so reusing it as the LANDED comparator imports a systematic false-negative. Pair by the rendered SGS block + targeted getComputedStyle. (`parity-bem-class-blind-spot`; design doc §11.)
- **Deploy before measure** — convert.py needs no build; block.json/render.php/style.css/theme changes need `npm run build` (PowerShell) + deploy + version bump (Hostinger CDN 7-day) BEFORE any pixel/DOM probe.
- **Root-cause FAMILY before instance fix** (R-22-9). **Gate A** `scripts/tests/test_converter_conformance.py` (pre-commit) is the live converter conformance suite; `converter_v2/tests/` does NOT exist. **DB changes reproducible** from a dated `migrations/*.py` OR `block.json supports.sgs`, verified by a FULL `/sgs-update` reseed — never a manual DB edit. **Commit path-scoped** (`git commit -m "msg" -- <paths>`, -m BEFORE --). **Subagents implement; Opus orchestrates** (plan/delegate/QC/live-test/commit); subagents NEVER `git checkout/restore/stash/reset/clean` the shared tree. **Bean's "are you sure?"/"why?" = a mandate to GROUND in the architecture, not reassure.** **Verify subagent claims against ground truth** — "correct per spec" can mean "correct per a buggy spec line"; read the fixture/contract.

## Pre-flight self-attestation ritual (answer in your first message, before the first action)
1. Have I completed the MANDATORY READING GATE — the F3-core design doc (§1-§7, §11) + Spec 31 §12.2.2/§12.2.3/§7b/§12.7 + the F2 module shape + D232/D233? (Quote one specific thing from the design doc §2 or §3 to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D233.) Anything uncommitted that's MINE? (The pre-existing lucide-icons/phase4/theme-handoff files are NOT mine — leave them. Commit by explicit path, `-m` before `--`.) [Only active workstream — no parallel threads.]
3. Am I building F3-CORE (computed-style-primary verdict + 4 guards + MR-2 on ONE fixture) and NOT the deferred F3-runtime (full-37 / cache / deploy-orchestration)? Is my LANDED signal targeted computed-style on the rendered block, NOT parity2's BEM matcher?
4. For any subagent I dispatch: did I tell it "return data, do NOT write shared files"? Did I commit valuable artefacts first? Am I verifying its claims against ground truth, not trusting "correct per spec"?
5. What is the MEASURABLE acceptance — a correct per-section/per-cell verdict on a NON-DEFAULT fixture (LANDED = live computed-style = draft) — NOT "code shipped"/"WRITTEN"/"tests green alone"? Is this Rule-7 high-blast (oracle/shared infra)? → `/qc-council` BEFORE the commit.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | F3-core design is DONE (do not redo); USE for F4/F5/F6 + each rebuild stage before building |
| `/gap-analysis` | ALWAYS — grade any unit/plan vs its acceptance before delivery |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | ALWAYS — any WP/CSS-cascade/getComputedStyle/Playwright pattern you're unsure of (don't guess) |
| `/strategic-plan` + `/phase-planner` | if F4/F5 or a rebuild stage needs a formal step breakdown |
| `/adversarial-council` | MANDATORY on F4/F5 designs + every shared-mechanism/converter change (Rule 7) |
| `/qc-council` | MANDATORY before every converter/SGS-block/oracle/gate commit (blub 255) |
| `/subagent-driven-development` · `/subagent-prompt` · `/dispatching-parallel-agents` | per-task dispatch (subagents implement, NO commit authority, NO shared-file writes) |
| `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | re-clone+deploy / DB reseed / schema + attr TYPES + variant_slots ground truth |
| `/systematic-debugging` · `/verify-loop` · `/capture-lesson` · `/handoff` | root-cause / 2-attestation / new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright (chrome-devtools fallback on "Browser already in use") | F3-core: render the clone on the canary + targeted `getComputedStyle` probe on the rendered SGS block — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`); canary = `?page_id=8` on `WP_URL_SANDYBROWN` |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema + attr TYPES + the block.json `default` for guard-3 (query before "missing X") |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | container attrs / property_suffixes / modifier_suffixes / variant_slots / block_composition (DB-authoritative) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | F3-core build + F4/F5 resolvers — NO commit/deploy authority, NO shared-file writes, return uncommitted |
| general-purpose (opus) | cross-model adversarial code-review of the built F3-core before commit (it caught 3 silent-drop holes in F2 this way) |
| general-purpose (haiku / gemini-flash) | 2nd cross-family rater on `/qc-council` (NOT for breakpoint or architecture judgment) |
| `wp-sgs-developer` | heavier WP/block.json/render.php work |
| `design-reviewer` | visible-surface changes (live page-8 at 3 breakpoints) |

## Guardrails
This is the only active workstream. It owns convert.py + the homepage pipeline + the SHARED `SGS_Container_Wrapper` + /sgs-update seeding + the new modular ledger (`ledger/`, F2 done) + the new oracle (F3) + gates (F5). ALL are Rule-7 high-blast → design-gate. `/qc-council` + Gate A + the F2 ledger `--check` + (once built) the F3 oracle per commit. D-ceiling check before any new D (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D233). F3-RUNTIME (full-37 / content-hash cache / canary deploy-orchestration / pixel-diff secondary) is DEFERRED — do NOT build it until the rebuild first needs to render many fixtures.
