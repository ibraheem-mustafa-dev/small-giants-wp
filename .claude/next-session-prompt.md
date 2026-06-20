---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-18
primary_goal: "BUILD Phase-F step F6 — the DB-as-code consistency suite (Spec 31 §12.4 + §12.7 F6): a prebuild-wired suite proving the routing DATA is safe for name-free routing — (1) no `(block, layer, property)` resolves to ≥2 attrs without a `block_selectors.element` disambiguator; (2) every `block_composition.has_inner_blocks` agrees with the block's save.js marker; (3) no `variant_slots` discriminator name-collides with a liftable structural attr. F1/F2/F3-core/F4 DONE; F5 is PARTIAL (check_no_mirror armed with a legacy baseline, `6193f3e9`/D236 — but NOT auto-wired, and the other 5 F5 gates remain OPEN). Bean chose F6 next; F5-remaining is tracked in parking. Mama's parity is the METRIC (content 100%; full mobile 61.82/tablet 59.09/desktop 55.45%), not the goal."
---

# Next session — CLONING CSS-TRANSFER: build Phase-F step F6 (DB-as-code consistency suite)

## ⛔⛔ READ THIS FIRST — MANDATORY READING GATE (Bean directive: do NOT guess, assume, or proceed under-read)

This rebuild has failed repeatedly because sessions GUESSED, ASSUMED things were missing, or reasoned from a doc's cached status instead of ground truth. **You may not propose a fix-shape, dispatch a subagent, or write code until you have READ IN FULL and can self-attest to each.** Tick them in your first message:

1. ☐ `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` — §12.4 (TIER-3 modular architecture: the **DB-as-code consistency suite** — "name-free routing is safe only if the DATA is tested": no `(block,layer,property)`→≥2 attrs without a `block_selectors.element` disambiguator; every `has_inner_blocks` agrees with save.js; no `variant_slots` discriminator collides with a liftable structural attr) + §12.7 F6 row + §12.0 (D-MODULAR — fresh scripts, convert.py is frozen legacy).
2. ☐ The DB ground truth (query, don't guess — `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`): the tables F6 audits — `block_attributes`, `block_composition` (esp `has_inner_blocks`, `container_kind`), `block_selectors` (the `element` disambiguator), `variant_slots` + `blocks.variant_attr`, `property_suffixes`. Confirm which exist + their columns. The D221 lesson: `has_inner_blocks` was left STALE → empty clone slides (the testimonial bug) — F6 is the suite that catches that class structurally.
3. ☐ The sibling foundation modules F6 mirrors (fresh-module pattern): `plugins/sgs-blocks/scripts/ledger/` (F2), `plugins/sgs-blocks/scripts/oracle/` (F3), `plugins/sgs-blocks/scripts/migrations/2026-06-18-create-excluded-properties.py` (F4), `plugins/sgs-blocks/scripts/orchestrator/check_no_mirror.py` + `check-no-mirror-baseline.json` (F5-partial). F6 is a fresh `scripts/db-consistency/` (or similar) module wired into prebuild.
4. ☐ The F5-REMAINING open work (so you know what's NOT done): the F4 design doc §3 (the F5 gate hand-off — the EXCLUDED-literal gate's hardened requirements) + parking.md `P-F5-REMAINING`. F5 has 5 gates still OPEN + the check_no_mirror orchestrator-call wire (STOP-6 gap). Do NOT assume F5 is complete.
5. ☐ `.claude/decisions.md` D232 (F2) + D233 (F3 re-scope) + D234 (F3-core) + D235 (F4) + **D236 (F5-partial)** + the GROUND-TRUTH-FIRST block in `.claude/state.md`.

**If you skip the reading and start guessing, you WILL recreate the exact failure this whole rebuild existed to end. Do not.** Reading order = `docs-registry.yaml` `cold_start_reading_order`.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block/wrapper action — verbatim)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default that overrides faithfully-transferred draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft CSS declaration transfers, OR is EXCLUDED-with-reason (the F4 `excluded_properties` table), OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live computed-style + the draft-vs-clone render-diff. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (computed-style matches draft). (F3-core mechanises this.)
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding, ledger, oracle, gates, the EXCLUDED set, DB-consistency) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-18 close — D236)
The cloning CSS-transfer system is being **rebuilt clean** (Spec 31 §12) — a Tier-1 FOUNDATION (ledger + oracle + EXCLUDED table + armed gates + DB-consistency) built BEFORE any stage, then a stage-by-stage rebuild gated by it. **DONE:** F1 (fixtures); F2 (draft-derived CSS Accounting Ledger, `ledger/`, D232); F3-core (LANDED render-oracle, `oracle/`, D234, live-canary-proven); F4 (closed `excluded_properties` table ships EMPTY, D235). **F5 PARTIAL (D236):** the anti-mirror gate `check_no_mirror.py` is armed with a committed legacy baseline (10 keys / 13 instances; fails on a NEW draft-class violation, grandfathers the 13 the rebuild will fix) — BUT it does NOT auto-run yet (the orchestrator doesn't call `pipeline-stage-gate.py` — STOP-6 gap) and the OTHER 5 F5 gates are OPEN (`check-converter-cheats.py`, `generate-coverage-matrix.py`, the pipeline-close ledger checker, the EXCLUDED-literal gate, the PreToolUse git hook). **NEXT = F6** (DB-as-code consistency suite — Bean's call to do F6 before finishing F5). F6 proves the routing DATA is safe for name-free routing (the D221 stale-`has_inner_blocks` class of bug, caught structurally).

## First action (~5 min, zero deps)
Complete the MANDATORY READING GATE, then the pre-flight ritual (below). Re-confirm ground truth: `git branch --show-current` (→ main) + `git status` + `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (D-ceiling **D236**). Confirm the foundation green: `python -m pytest plugins/sgs-blocks/scripts/ledger/tests/ plugins/sgs-blocks/scripts/oracle/tests/ plugins/sgs-blocks/scripts/orchestrator/test_check_no_mirror_baseline.py -q` (→ 167 + 181 + 10 pass). Query the DB for the F6 audit inputs: `block_selectors` (the disambiguator), `block_composition.has_inner_blocks`, `variant_slots`.

## Tasks

### Task 1 — DESIGN-GATE then BUILD F6: the DB-as-code consistency suite [Spec 31 §12.4 + §12.7 F6]
**What:** a fresh `scripts/db-consistency/` module (sibling of `ledger/`/`oracle/`) — a prebuild-wired suite with 3 checks: (1) **routing ambiguity** — no `(block, layer, property)` resolves to ≥2 candidate attrs without a `block_selectors.element` disambiguator (the thing that makes name-free routing deterministic); (2) **has_inner_blocks truth** — every `block_composition.has_inner_blocks` agrees with the block's actual save.js marker (`<InnerBlocks.Content />` present ⇒ 1; the D221/D212 stale-flag bug class); (3) **variant collision** — no `variant_slots` discriminator name-collides with a liftable structural attr. Plain-English failure messages (MF-5).
**Why:** name-free routing (the whole converter architecture) is only safe if the DATA is consistent — a stale `has_inner_blocks` or an ambiguous `(block,layer,property)` silently mis-routes. F6 makes those structural, build-time failures instead of live-clone surprises. §12.7 done-when: "suite runs in prebuild; current DB violations enumerated."
**Estimated time:** ~15 min design-gate + ~45 min build (3 DB-querying checks + tests + prebuild wire).
**Orchestration:** Rule-7 (a build-blocking gate on shared DATA). FIRST `/brainstorming` (design-mode: the 3 checks' exact queries + the save.js-marker derivation + baseline-vs-zero-tolerance for current violations) → `/qc-council` or `/adversarial-council` (gate red-team) → Bean approval. THEN `/subagent-driven-development` (sonnet implementer, NO commit authority, NO shared-file writes, RETURN data) → independent verify (run it; confirm it flags a planted stale `has_inner_blocks`) → `/qc-inline` or `/qc-council` before commit. Like F5's check_no_mirror, current DB likely HAS violations → use the §12.6-step-1 baseline pattern (enumerate + baseline today's violations; fail on NEW).
**Depends on:** the DB (live). **/qc gate after:** the suite proven to FAIL on a planted stale `has_inner_blocks` + a planted ambiguous routing row + wired into prebuild + current violations enumerated/baselined.
**Acceptance:** the 3 checks run in prebuild; each proven to fail correctly on a planted violation; current real DB violations enumerated (+ baselined if non-zero); convert.py UNTOUCHED. NOT "suite written" — it must demonstrably catch a real inconsistency.

### Task 2 — (after F6) FINISH F5, then the stage-by-stage rebuild [Spec 31 §12.7 + §12.6]
**What:** F5-REMAINING (tracked, `P-F5-REMAINING`): (a) wire `pipeline-stage-gate.py` into the clone orchestrator so check_no_mirror actually auto-runs (close the STOP-6 gap); (b) `check-converter-cheats.py` (§7a, whole-tree + PHP/CSS, 7 checks — BASELINE the legacy `_SUFFIX_ATTR_OVERRIDES`/`prop_map`/`_BP_SUFFIX_MAP` violations, do NOT edit convert.py); (c) `generate-coverage-matrix.py` (§5 dashboard); (d) the pipeline-close ledger checker (UNACCOUNTED/WRITTEN-not-LANDED join of F2∪F3∪F4∪gap — its LANDED leg needs F3-runtime); (e) the EXCLUDED-literal gate per the F4 design §3 hand-off; (f) the PreToolUse git-commit hook. THEN the stage-by-stage rebuild (§12.6 step 3).
**Why:** without ALL gates armed+wired, "no silent drops / cheat-proof" is theatre (the council's fatal-flaw finding). The check_no_mirror auto-wire (a) is the smallest remaining F5 piece.
**Orchestration:** each gate is its own `/brainstorming` → `/adversarial-council` → Bean gate → SDD → `/qc-council`/`/qc-inline`. Do NOT batch — high-blast.
**Depends on:** F6 (Bean's chosen order). **/qc gate after:** each gate.
**Acceptance:** per the §12.7 done-when of each; F3-runtime (full-37, cache, pixel-diff, deploy choreography, %-calc-vw length, MR-1/MR-3) DEFERRED until the rebuild first renders many fixtures.

## Dependency graph
```
MANDATORY READING GATE + pre-flight ritual (inline, Opus)
  → Task 1 F6 (/brainstorming → /qc-council → Bean gate → SDD → /qc-inline → commit)  [DB-as-code consistency, baseline current violations]
      → Task 2 FINISH F5 (per-gate: design→council→Bean→SDD→qc; check_no_mirror auto-wire first = smallest)
          → stage-by-stage rebuild (per stage: design→council→SDD→ledger+oracle gate, before next stage)
each commit: path-scoped (`git commit -m "msg" -- <paths>`, -m BEFORE --); Gate A conformance; D-ceiling check before any new D (→ D236); convert.py UNTOUCHED
```

## Methodology guardrails / STOP catalogue (carried forward + extended — do NOT subtract)
- **STOP-1 — READ before you conjecture.** Never propose a fix-shape, dispatch a build, or assert built/not-built from a doc's cached status. Read the implementing SCRIPT (file:line), the raw artefacts, Spec 31 §12, the design doc, the routing map. The MANDATORY READING GATE is non-skippable. Even a fixture's `.expected.md` can be STALE (the rt-centred-maxwidth MF-3 case — `widthMode` was retired; the converter's `maxWidth` was correct). Verify the block's CURRENT attr model before trusting a doc's bug claim. (blub 353.)
- **STOP-2 — Subagents RETURN data, never write shared files.** Every audit/review/extraction cold prompt MUST say "return findings in your final message; do NOT write/edit/create any shared file." Orchestrator owns shared writes. Commit valuable artefacts BEFORE dispatching file-capable subagents. SDD IMPLEMENTERS that create a NEW module dir are fine; never give them commit/deploy authority. (`feedback_subagents_must_not_write_shared_files`.)
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** A ledger fed by the converter's recognised set / the same gap-bearing DB is circular and hides drops. F2 parses the draft independently; F3's LANDED probe reads the rendered clone's computed-style directly; F4's excluded set is a CLOSED audited table. (Spec 31 §12.2.1.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate. A value can land on the WRONG layer/tier and still be WRITTEN. Only LANDED (live computed-style = draft on a NON-DEFAULT fixture) closes a cell. (Spec 31 §12.2.2.)
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.** A value recognised right at stage 2 can be dropped at stage 4. Gate each stage on the end-to-end ledger+oracle. (Spec 31 §12.1/§12.6.)
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Distinguish "code can check" from "something runs the check on every build/clone". LIVE THIS SESSION (D236): check_no_mirror was armed+baselined+tested but the orchestrator does NOT call `pipeline-stage-gate.py` → it does NOT auto-run → NOT claimed as enforced (tracked as F5-remaining). A run-output gate (needs a clone `run_dir`) CANNOT wire into `prebuild` (static, no run_dir) — wire it post-clone. Before claiming "enforced", grep for the wiring + confirm it RUNS. (`dont-claim-a-guard-is-enforced-unless-wired`.)
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers** (R-22-1). (`feedback_wrapper_hardcoded_defaults_are_cheats_to_remove_not_blockers`.)
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = canonical {767/768, 1023/1024, 1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier. A mechanical/Haiku agent can't make this call. (`feedback_device_tier_vs_visual_breakpoints_are_distinct`.)
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined.** Ground variant structure in `variant_slots` + `blocks.variant_attr`, never guess. (`feedback_ground_in_variant_db_for_variant_block_setups`.)
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl FIRST. An empty section scores a FALSE pixel-diff WIN — gate on `innerText.length>0` (F3 guard 1, built). (`feedback_empty_section_check_cv2_softfail_trace_first`.)
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column EXISTS (R-22-8) is necessary but NOT sufficient before reusing/renaming/retiring it. Grep how it's WRITTEN and READ first. Baseline against the LIVE DB, not the doc. (`schema-enumeration-is-not-usage-enumeration`.)
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions (D233).** F3 pairs by the rendered SGS block slug + targeted getComputedStyle (NOT parity2's draft-BEM-class matcher). Reuse infra (R-22-1) but CHECK the reused tool's assumptions match your data. (`parity-bem-class-blind-spot`.)
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace (D234).** F3-core's cross-FAMILY Gemini rater was tool-blocked in the Windows harness (3 failures); rather than skip the diversity lens, trace the cardinal-sin questions branch-by-branch yourself (that surfaced FIX-M). Never let a broken optional tool silently drop the diversity check. (blub 255 / `cross-family-rater-tool-broken-stand-in-with-branch-trace` / blub 359.)
- **STOP-14 — Before ARMING any gate, run it in report mode against CURRENT output to check the precondition; don't assume clean (NEW, D236).** check_no_mirror documents "do NOT --enforce until two clean --report runs" — and the current converter STILL emits 13 mirror violations, so arming clean was impossible. The fix is NOT to force-arm (breaks the build) NOR to skip — it's the §12.6-step-1 BASELINE pattern: enumerate + commit today's legacy violations as a baseline, fail only on NEW ones, baseline shrinks as the rebuild fixes them. The SAME applies to F6 (the DB likely has current consistency violations) + every other F5 gate. (`gate-arm-needs-precondition-check-then-baseline`.)
- **Deploy before measure** — convert.py needs no build; block.json/render.php/style.css/theme changes need `npm run build` (PowerShell) + deploy + version bump (Hostinger CDN 7-day) BEFORE any pixel/DOM probe. **Editor-push for live render:** cloned markup → canary via the editor `wp.data` path (parse→resetBlocks→editPost publish→savePost), NOT REST post_content (wp-content-guard). Creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **Root-cause FAMILY before instance fix** (R-22-9). **Gate A** `scripts/tests/test_converter_conformance.py` (pre-commit) is the live converter conformance suite; `converter_v2/tests/` does NOT exist. **DB changes reproducible** from a dated `migrations/*.py` OR `block.json supports.sgs`, verified by a FULL `/sgs-update` reseed — never a manual DB edit (`/sgs-update` does NOT auto-run migrations — run them manually). **Commit path-scoped** (`git commit -m "msg" -- <paths>`, -m before --; the pre-existing lucide-icons/phase4/theme-handoff dirty files are NOT yours — leave them). **Subagents implement; Opus orchestrates** (plan/delegate/QC/live-test/commit); subagents NEVER `git checkout/restore/stash/reset/clean` the shared tree. **Bean's "are you sure?"/"why?" = a mandate to GROUND in the architecture, not reassure** (this session: "why would max-width be excluded?" found dead code; "aren't we writing fresh scripts and leaving convert.py legacy?" corrected the F4 approach). **Verify subagent claims against ground truth** — "correct per spec" can mean "correct per a buggy spec line".

## Pre-flight self-attestation ritual (answer in your first message, before the first action)
1. Have I completed the MANDATORY READING GATE — Spec 31 §12.4/§12.7 F6 + the DB ground truth (block_selectors/has_inner_blocks/variant_slots) + the foundation modules + D232–D236 + the F5-REMAINING list? (Quote one specific thing from §12.4 — e.g. one of the 3 consistency checks — to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D236.) Anything uncommitted that's MINE? (The pre-existing lucide-icons/phase4/theme-handoff files are NOT mine — leave them. Commit by explicit path, `-m` before `--`.) [Only active workstream — no parallel threads.]
3. Have I DESIGN-GATED F6 (Rule 7) — `/brainstorming` → `/qc-council` (or `/adversarial-council`) → Bean approval — BEFORE building? Did I run the suite against the CURRENT DB to check the precondition + baseline current violations (STOP-14)? Is it wired to prebuild (something that RUNS — STOP-6)?
4. For any subagent I dispatch: did I tell it "return data, do NOT write shared files / NO commit authority"? Did I commit valuable artefacts first? Am I verifying its claims against ground truth, not trusting "correct per spec"? Am I NOT editing convert.py (D-MODULAR)?
5. What is the MEASURABLE acceptance — the suite demonstrably REJECTS a planted stale `has_inner_blocks` (and an ambiguous routing row), runs in prebuild, current violations enumerated — NOT "suite written"/"tests green alone"? Is this Rule-7 high-blast? → council BEFORE the commit.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | MANDATORY for F6 design (the 3 checks + queries) BEFORE building; + each F5-remaining gate |
| `/gap-analysis` | ALWAYS — grade any unit/plan vs its acceptance before delivery |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | ALWAYS — any SQLite/SQL-consistency/save.js-marker pattern you're unsure of (don't guess) |
| `/strategic-plan` + `/phase-planner` | if F6 or an F5-remaining gate needs a formal step breakdown |
| `/adversarial-council` | on F6 + every F5-remaining gate design (Rule 7) |
| `/qc-council` · `/qc-inline` | MANDATORY before every gate/SGS-block/oracle commit (blub 255); qc-inline for bounded single-gate tasks (Bean-directed for check_no_mirror) |
| `/subagent-driven-development` · `/subagent-prompt` · `/dispatching-parallel-agents` | per-task dispatch (subagents implement, NO commit authority, NO shared-file writes) |
| `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | re-clone+deploy / DB reseed / schema + attr TYPES + variant_slots ground truth |
| `/systematic-debugging` · `/verify-loop` · `/capture-lesson` · `/handoff` | root-cause / 2-attestation / new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | F6: query `block_selectors`/`block_composition.has_inner_blocks`/`variant_slots`/`block_attributes` — the consistency-audit inputs (DB-authoritative) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema + attr TYPES + the save.js marker truth (query before "missing X") |
| Playwright (chrome-devtools fallback on "Browser already in use") | live computed-style verification on the canary — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`); the F3-core live page is 1199 (`/f3-oracle-rt-centred-maxwidth/`) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | F6 suite build + F5-remaining gate resolvers — NO commit/deploy authority, NO shared-file writes, return uncommitted |
| general-purpose (opus) | cross-model adversarial code-review before commit (caught 4 HIGH+5 MED in F3-core; 3 silent-drop holes in F2) |
| general-purpose (haiku) | 2nd cross-family rater on `/qc-council` (NOT breakpoint/architecture judgment). [Gemini CLI/agent path is tool-blocked on this Windows machine — STOP-13.] |
| `wp-sgs-developer` | heavier WP/block.json/render.php work |

## Guardrails
This is the only active workstream. It owns convert.py (FROZEN legacy — do NOT edit, D-MODULAR) + the homepage pipeline + the SHARED `SGS_Container_Wrapper` + /sgs-update seeding + the modular foundation (`ledger/` F2, `oracle/` F3, the `excluded_properties` table F4, the armed `check_no_mirror` F5-partial) + F6 (DB-consistency) + the OPEN F5 gates. ALL are Rule-7 high-blast → design-gate. `/qc-council`/`/qc-inline` + Gate A + the F2 ledger `--check` + the F3 oracle tests + the F5 baseline test per commit. D-ceiling check before any new D (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D236). **F5 is PARTIAL** — the other 5 gates + the check_no_mirror orchestrator-wire are OPEN (`P-F5-REMAINING`); do NOT treat F5 as done. F3-RUNTIME (full-37 / cache / pixel-diff / deploy-orchestration / %-calc-vw length / MR-1/MR-3) is DEFERRED.
