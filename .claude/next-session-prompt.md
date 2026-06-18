---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-17
primary_goal: "Continue the cloning CSS-transfer CLEAN MODULAR STAGE-BY-STAGE REBUILD per Spec 31 §12. Phase F step F1 (multi-shape fixture corpus) is DONE (`tests/fixtures/phase-f/`). NEXT = F2 (draft-declaration parser → the draft-DERIVED CSS Accounting Ledger, the keystone, per §12.2.1 + §12.7), then F3 render-diff oracle (canary-only — Bean-chosen), F4 closed EXCLUDED set (ships EMPTY — Bean: no exceptions we don't copy), F5 the 3 missing gates built+ARMED, F6 DB-consistency suite — then the stage-by-stage rebuild gated by the ledger. The prior converter is unsoundly patchable (22-finding persona audit, 6 HIGH); spot-fixes regress (trust-bar precedent). NOTE: the exact-match WIDTH model shipped this session (D230/D231 — widthMode→align/maxWidth/contentWidth, LANDED) is a SHIPPED universal fix the rebuild will re-absorb as a per-resolver module; do NOT redo it. Mama's parity is the METRIC (content 100%; full mobile 61.82/tablet 59.09/desktop 55.45%), not the goal."
---

# Next session — CLONING CSS-TRANSFER: clean modular rebuild (Phase F foundation first)

## ⛔⛔ READ THIS FIRST — MANDATORY READING GATE (Bean directive 2026-06-17: do NOT guess, assume, or proceed under-read)

This rebuild has failed repeatedly because sessions GUESSED, ASSUMED things were missing, or reasoned from a doc's cached status instead of ground truth. **You may not propose a single fix-shape, dispatch a subagent, or write code until you have READ IN FULL and can self-attest to each of these.** Tick them in your first message:

1. ☐ `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` — **the build blueprint.** Read the TOP BANNER + **§12 in full** (the clean-modular-rebuild direction: §12.0 Bean's locked decisions · §12.2 the Tier-1 foundation · §12.3 the HIGH gaps · §12.4 modular architecture · §12.6 build sequence · §12.7 foundation build order F1-F6 + the gap-to-stage map), THEN §1-§11 (the architecture). §12 SUPERSEDES the v0.2 fix-in-place wording in §1/§11.
2. ☐ `.claude/reports/pipeline-routing-map-2026-06-17.html` — the exhaustive 24-stage routing map. Open it. Read the 3 cross-stage mechanism traces (**M1** nested grid/wrapper layers · **M2** child-block/atomic/CSS/variant classification fork · **M3** complete CSS transfer) + the **22-finding gap register** (6 HIGH). This is the structural map you build the modular files against.
3. ☐ `.claude/reports/2026-06-17-adversarial-council-register-and-rebuild-direction.md` — WHY clean rebuild, WHY the draft-derived ledger, WHY modular files. The convergence-weighted must-fix register.
4. ☐ `.claude/specs/22-...md` (underlying architecture) + `.claude/cloning-pipeline-flow.md` + `-stages.md` (the as-is pipeline you map from).
5. ☐ `.claude/decisions.md` D229 (this rebuild decision) + the GROUND-TRUTH-FIRST block in `.claude/state.md`.

**If you skip the reading and start guessing, you WILL recreate the exact failure this whole session existed to end. Do not.** The reading order is `docs-registry.yaml` `cold_start_reading_order` (restructured D229 — Spec 31 + the map are now items 4-6).

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block/wrapper action — verbatim)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default that overrides faithfully-transferred draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops (the draft-derived ledger enforces this structurally).
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live computed-style + the draft-vs-clone render-diff. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (pixel matches draft).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding, ledger, gates) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-18 close — D231)
Previous planning session (D229) concluded the cloning CSS-transfer system must be **rebuilt clean** (per-resolver modular files behind one dispatch table, remade orchestrator, stage-by-stage, each stage proven universal on a multi-shape fixture set). **This session shipped two things:** (1) a Bean-initiated **exact-match WIDTH fix** — D230 (`484d04d9`) retired `widthMode`/`customWidth` for the 3-layer `align`/`maxWidth`/`contentWidth` model, D231 (`d5416ae8`) renamed contentWidth tokens (`normal`/`wide`/`full`, default `full`) + swept 29 vestigial widthMode decls; designed via brainstorming→adversarial-council→qc-council, **LANDED-verified live on canary**, DB reseeded. This is a SHIPPED universal fix; the rebuild re-absorbs it as a module — **do NOT redo it.** (2) **Phase F step F1 DONE** — the multi-shape fixture corpus at `plugins/sgs-blocks/scripts/tests/fixtures/phase-f/`. The spine is still a **draft-DERIVED CSS Accounting Ledger** — input = the draft's parsed CSS declarations (Stage 0.7, BEFORE any routing), so the ~15 property classes the old converter silently drops (background-image, filter, opacity, transform, object-fit, pseudo-elements, font shorthand) become UNACCOUNTED → hard fail. Blueprint = **Spec 31 §12** (§2/§3/§8 now reflect the shipped width model; §12.7 F1 marked done); structural map = the **24-stage routing chart**.

## First action (~5 min, zero deps)
Complete the MANDATORY READING GATE above, then run the pre-flight self-attestation ritual (below). Then re-confirm ground truth: `git branch --show-current` + `git status` + `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (D-ceiling **D231**). Confirm F1 done (`ls plugins/sgs-blocks/scripts/tests/fixtures/phase-f/` → README + sgs-media + 5 rt-* fixtures). Verify the 3 gates STILL DON'T exist (`ls plugins/sgs-blocks/scripts/check-converter-cheats.py plugins/sgs-blocks/scripts/orchestrator/generate-coverage-matrix.py 2>&1` → absent; building them IS F5).

## Tasks

### Task 1 — Phase F step F2: the draft-derived CSS Accounting Ledger (the keystone) [Spec 31 §12.2.1 + §12.7]
**F1 is DONE** (the fixture corpus). NEXT = F2: a standalone draft-declaration parser (tinycss2) that parses each phase-f fixture's CSS into the surjective `declare_input` set `(selector, property, value)` at Stage 0.7 — **independent of css_router's parse** (independence is the whole point; a ledger fed by the converter's recognised set is circular — STOP-3). Done-when: every declaration in every fixture is in the input ledger; count is stable + reproducible. THEN F3 (render-diff oracle, **canary-only per Bean** + 3 metamorphic relations), F4 (closed DB-backed `excluded_properties` table — **ships EMPTY per Bean: no exceptions we don't copy**; max-width is TRANSFERRED via re-expression, not excluded), F5 (the 3 gates built + WIRED: `check-converter-cheats.py` + `generate-coverage-matrix.py` + pipeline-close ledger check; `check_no_mirror.py --enforce` + a `PreToolUse` git-commit hook into prebuild), F6 (DB-as-code consistency suite).
**Why:** without the draft-derived ledger + render-oracle + armed gates, "no silent drops / cheat-proof" is theatre (the v0.2 plan's fatal flaw the council caught). This is the only thing that makes each stage's "universal" claim TESTABLE.
**Orchestration:** `/brainstorming` design-mode (Opus) for the ledger/parser shape → `/adversarial-council` on the foundation design (Rule 7) → Bean design-gate → delegate per-file builds to subagents (NO commit authority; RETURN data/files, never write shared docs) → `/qc-council` + run BOTH conformance suites.
**Depends on:** F1 (done). **/qc gate after:** `/qc-council` + the ledger must flag the KNOWN legacy drops on current output across the phase-f fixtures (baseline captured).
**Acceptance:** the ledger reports the legacy converter's UNACCOUNTED set across the multi-shape fixtures as the measured baseline; reproducible counts; later F5 gates run automatically on prebuild + pre-commit; no green-on-broken.

### Task 2 — Stage-by-stage modular rebuild [Spec 31 §12.6 step 3 + the §12.7 gap-to-stage map]
**What:** rebuild the converter in pipeline order (Stage 2 recognition incl. Method-2 native-composite routing → Stage 3 fold → Stage 4 lift → …), each stage a set of per-resolver files behind the dispatch table, each owning its mapped Tier-2 HIGH gaps (see §12.7 table). Do NOT start stage N+1 until stage N passes the ledger gate (zero UNACCOUNTED + zero WRITTEN-not-LANDED) on the fixture set.
**Why:** stage-by-stage isolates failures (if stage 4 fails, only stage 4 needs fixing) and never builds on a flawed lower stage. The ledger is the per-stage universality TEST (correctness is cross-stage; the stage is just the build order).
**Orchestration:** per stage — `/brainstorming` design → `/adversarial-council` (shared mechanism) → SDD build (subagents, no commit/no-shared-write) → `/qc-council` + ledger gate + live page-8 + render-diff verify.
**Depends on:** Task 1. **/qc gate after:** every stage, before the next.
**Acceptance:** each stage's declarations are TRANSFERRED-and-LANDED / EXCLUDED-with-reason / tracked-GAP on the multi-shape fixture set; render-diff passes per section at 375/768/1440.

## Dependency graph
```
MANDATORY READING GATE + pre-flight ritual (inline, Opus)
  → Task 1 Phase F foundation (/brainstorming → /adversarial-council → Bean gate → SDD → /qc-council)  [the spine]
      → Task 2 stage-by-stage rebuild (per stage: design → council → SDD → ledger gate + live + render-diff, before next stage)
each commit: path-scoped (`git commit -m "msg" -- <paths>`, -m BEFORE --); BOTH conformance suites; D-ceiling check before any new D (→ D229)
```

## Methodology guardrails / STOP catalogue (carried forward + extended D229 — do NOT subtract)
- **STOP-1 — READ before you conjecture (Bean directive D229).** Never propose a fix-shape, dispatch a build, or assert built/not-built from a doc's cached status. Read the implementing SCRIPT (file:line), the raw pipeline-state artefacts (extract.json/trace.jsonl/leftover-buckets.json), Spec 31 §12, and the routing map. The MANDATORY READING GATE is non-skippable. (blub 353, this session's whole reason for existing.)
- **STOP-2 — Subagents RETURN data, never write shared files (NEW D229).** A reviewer overwrote the master pipeline-map this session. Every audit/review/extraction cold prompt MUST say "return findings in your final message; do NOT write/edit/create any file." Orchestrator owns shared writes. Commit valuable artefacts BEFORE dispatching file-capable subagents. (`feedback_subagents_must_not_write_shared_files`.)
- **STOP-3 — The ledger input is the DRAFT's declarations, NOT the converter's recognised set (NEW D229).** A ledger fed by the suffix table / what the converter mapped is circular and hides the ~15 no-suffix-row drops. Parse the draft CSS independently at Stage 0.7. (Spec 31 §12.2.1; the council's keystone finding.)
- **STOP-4 — WRITTEN ≠ LANDED (NEW D229).** "An attr was emitted" is a progress signal, never a gate. A value can land on the WRONG layer and still be WRITTEN. Only LANDED (live computed-style = draft on a non-default fixture) closes a cell. (Spec 31 §12.2.2.)
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger is the cross-stage TEST (NEW D229).** Don't mistake "stage 2 green" for "correct" — a value recognised right at stage 2 can be dropped at stage 4. Gate each stage on the end-to-end ledger, not an in-stage conformance suite. (Spec 31 §12.1/§12.6.)
- **STOP-6 — A gate that exists but isn't WIRED protects nothing (NEW D229).** `check_no_mirror.py` runs in report-only mode today; `check-converter-cheats.py`/`generate-coverage-matrix.py` don't exist. Build + ARM them in prebuild + a PreToolUse git hook FIRST. Distinguish "code can check" from "something runs the check on every build." (Spec 31 §12.2.5; `dont-claim-a-guard-is-enforced-unless-wired`.)
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers.** A `!important`/default injection overriding faithful CSS = R-22-1 violation. (`feedback_wrapper_hardcoded_defaults_are_cheats_to_remove_not_blockers`.)
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = 768/1024 consistent; a single-rule visual breakpoint (600/781) is legitimate + must NOT be blanket-changed. Classify each; a mechanical/Haiku agent can't make this call. (`feedback_device_tier_vs_visual_breakpoints_are_distinct`.)
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined.** Ground variant structure in `variant_slots` + `blocks.variant_attr`, never guess. (`feedback_ground_in_variant_db_for_variant_block_setups`.)
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl soft-fail exception FIRST. Empty section scores a FALSE pixel-diff WIN — gate on innerText.length>0. (`feedback_empty_section_check_cv2_softfail_trace_first`.)
- **Deploy before measure** — convert.py needs no build; block.json/render.php/style.css/theme changes need `npm run build` (PowerShell) + deploy + version bump (Hostinger CDN 7-day) BEFORE any pixel/DOM probe.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration (NEW D230, 2026-06-18).** Knowing an attr EXISTS in the DB schema (R-22-8) is necessary but NOT sufficient before repurposing it. The adversarial council caught a fatal premise: the v0.1 width design declared `maxWidth` "unused/free" because the schema showed it existed — but a grep of how it was USED revealed it was a LIVE keyword attr driving a CSS class (`sgs-container--width-content/wide/full`). Repurposing it would have silently vanished widths + thrown editor invalidation. Before reusing/renaming/retiring ANY attr: grep how it is WRITTEN (controls/converter/save.js) AND READ (render.php/wrapper/style.css/edit.js), not just that it's declared. Memory candidate `schema-enumeration-is-not-usage-enumeration`.
- **Root-cause FAMILY before instance fix** (R-22-9). **TWO conformance suites** — Gate A `scripts/tests/test_converter_conformance.py` (pre-commit) AND `converter_v2/tests/` — run BOTH. **DB changes reproducible** from a dated `migrations/*.py` OR `block.json supports.sgs`, verified by a FULL `/sgs-update` reseed — never a manual DB edit. **Commit path-scoped** (`git commit -m "msg" -- <paths>`, -m BEFORE --); the PreToolUse path-gate needs `-- <paths>` OR a `[batch-ok:<reason>]` token; a visual change needs a passing `reports/visual-diff/<block>-<date>.md` (`verdict: PASS` + `first_paint_capture_passed: true`); the visual gate's own guidance allows `--no-verify` for block.json-meta-only (non-visual) changes. **Subagents implement; Opus orchestrates** (plan/delegate/QC/live-test/commit); subagents NEVER `git checkout/restore/stash/reset/clean` the shared tree; recover a context-overflowed subagent via git-status + a tight follow-up, not a re-run. **Bean's "are you sure?"/"why?" = a mandate to GROUND in the architecture, not reassure.**

## Pre-flight self-attestation ritual (answer in your first message, before the first action)
1. Have I completed the MANDATORY READING GATE — Spec 31 §12 (full) + the routing map M1/M2/M3 + the gap register + the council register? (Quote one specific thing from §12.2 to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D229.) Anything uncommitted? (Commit by explicit path, `-m` before `--`.) [This is the only active workstream — the theme/Spec-30 work is COMPLETE + archived; there are no parallel threads.]
3. Am I building the FOUNDATION (Phase F: draft-derived ledger + render-oracle + armed gates) BEFORE any stage? Is the ledger's input the DRAFT's parsed declarations, not the converter's recognised set?
4. For any subagent I dispatch: did I tell it "return data, do NOT write shared files"? Did I commit valuable artefacts first?
5. What is the MEASURABLE acceptance — LANDED (live computed-style = draft on a non-default fixture) + zero UNACCOUNTED on the ledger — NOT "code shipped"/"WRITTEN"/"conformance green"? Is this Rule-7 high-blast (converter/shared wrapper/ledger/gates)? → `/adversarial-council` + `/qc-council` BEFORE/AROUND the build.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — design the foundation module/dispatch shape + each stage before building |
| `/gap-analysis` | ALWAYS — grade any unit/plan vs its acceptance before delivery |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | ALWAYS — any WP/grid/CSS-cascade/transpiler pattern you're unsure of (don't guess) |
| `/strategic-plan` + `/phase-planner` | if Phase F or a stage needs a formal step breakdown (Spec 31 §12 is the strategic plan; phase-plan only the foundation/stage internals) |
| `/adversarial-council` | MANDATORY on the foundation design + every shared-mechanism/converter change (Rule 7) |
| `/qc-council` | MANDATORY before every converter/SGS-block/seeding/gate commit (blub 255) |
| `/subagent-driven-development` · `/subagent-prompt` · `/dispatching-parallel-agents` | per-task dispatch (subagents implement, NO commit authority, NO shared-file writes) |
| `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | re-clone+deploy / DB reseed / schema + attr TYPES + variant_slots ground truth |
| `/systematic-debugging` · `/verify-loop` · `/capture-lesson` · `/handoff` | root-cause / 2-attestation / new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright (chrome-devtools fallback on "Browser already in use") | live page-8 DOM + computed-style + the draft-vs-clone render-diff at 375/768/1440 — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`); canary = `?page_id=8` on `WP_URL_SANDYBROWN` |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema + attr TYPES + WP-native supports (query before "missing X") |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | container attrs / property_suffixes / variant_slots / block_composition / derived_selector (DB-authoritative) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | Phase F per-file builds + stage resolvers — NO commit/deploy authority, NO shared-file writes, return uncommitted |
| general-purpose (haiku / gemini-flash) | 2nd cross-family rater on `/qc-council` (NOT for breakpoint or architecture judgment) |
| `wp-sgs-developer` | heavier WP/block.json/render.php work |
| `design-reviewer` | visible-surface changes (live page-8 + render-diff at 3 breakpoints) |

## Guardrails
This is the only active workstream. It owns convert.py + the homepage pipeline + the SHARED `SGS_Container_Wrapper` + /sgs-update seeding + (now) the new modular converter + ledger + gates. ALL of these are Rule-7 high-blast → design-gate. Build per the §12.7 order; `/qc-council` + Gate A + the ledger gate + live page-8 + render-diff per commit. A visual change needs a passing `reports/visual-diff/<block>-<date>.md`. D-ceiling check before any new D (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D229).
