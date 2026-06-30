---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / Phase W3 — interior-walker wiring + CSS↔content unification
generated: 2026-06-30
primary_goal: "W3 Steps 1–7 BUILT this session (D250): walker port + CSS↔content unification conductor + grid fix + native-style/box-shadow/§5 fixes — the two inert halves now connect. EVERYTHING IS WRITTEN, NOTHING IS LANDED. Next = the LANDED proof (Step 10, the real faithfulness gate, STOP-21) + A1 media-map + A2 ledger (Steps 8–9, STOP-28 preconditions) + the §5 lift-path + the broader base-selector !important sweep. Plan: `.claude/plans/2026-06-30-phase-W3-interior-walker-css-content-unification.md`; D250 in decisions.md."
---

# Next session — Phase W3 (the keystone: wire the engine + LAND it)

Invoke `/autopilot` before anything else.

**Agent identity.** You are the SGS cloning-pipeline engineer executing Phase W3 — the step that turns the converter from tested-but-inert parts into a live engine that converts an SGS-BEM draft into faithful native SGS blocks on the real homepage, zero cheats.

**State recap (plain English).** W3 Steps 1–7 are BUILT (D250, this session): `run_mechanism_b` is now the faithful `_route_composite_interior` walker port (Step 4), and `build_block_markup`'s `_build_css_attrs` (Step 7) drives BOTH `process_element` (CSS — incl. the new `root_supports.py` native-`style.*` lift + `outer_box` background-*/box-shadow) AND `extract_content` (content) into ONE emit. Finding A is fixed — the two halves connect; `process_element` has a production caller. BUT it is all WRITTEN, not LANDED: the new engine is still INERT in production (frozen `convert.py` runs every live clone, STOP-28), and nothing has been computed-style-verified on a real page. The §5 properties are SEEDED (Fix 3) but not LIFTED. A `/adversarial-council` this session corrected 2 phantom over-claims (the "padding/background/radius dropped" was BS — they emit via native `style.*`); the four-channel-check rule (memory + blub #373) is the fix. Next = LANDED proof (Step 10) + A1/A2 (Steps 8–9) + §5 lift-path + the base-selector !important sweep.

---

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change AND every council)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-slot exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP (ContentGap visible to F5). Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (renders on the page).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding, ledger, oracle, gates, EACH rebuild stage) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building. The W3 walker-port is EXACTLY this — its own design-gate is W3 Step 1.

## ⛔⛔ MANDATORY READING GATE (Bean directive: verify against ground truth, never guess; read WHOLE docs/files, not greps). Tick each in your first message:
1. ☐ **`.claude/handoff.md` (2026-06-30)** — the D249 fact-check outcome + the W3 entry. AND **`.claude/plans/2026-06-30-phase-W3-interior-walker-css-content-unification.md`** — the 12-step W3 plan you are executing.
2. ☐ **The new converter engine** (`plugins/sgs-blocks/scripts/converter/`, a SIBLING of `scripts/orchestrator/`): `orchestrator.py` (`process_element` — CSS spine, **no production caller** — the gap W3 Step 7 closes) + `services/extraction.py` (`extract_content`/`build_block_markup`/`run_mechanism_b` — the current flat content path) + `resolvers/*` (the 5 REAL CSS resolvers) + `dispatch_table.py`. Task-1 fact-check of this is DONE (D249) — read the findings, don't re-litigate.
3. ☐ **`.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md`** — §1 "ONE lift path" (the COMPLETE function inventory, in FULL — names the working content + walker functions) + §3 (unified content+CSS routing) + §3.B3 (child-routing G1–G5) + §2 Axis-3 + §12.0/§12.6/§12.7 (stage map).
4. ☐ **The W3 port-SOURCE in `convert.py` (read-to-port SANCTIONED for working functions — STOP-22 carve-out):** `_route_composite_interior` (:4124) + the single-recursive walker (FR-22-3) + `_lift_styling_attrs_by_selector` (:3903) + its 5-helper closure + the array path (B4, PARTIAL even here). The meaty read — do it before W3 Step 4.
5. ☐ **`.claude/decisions.md` (head → D249)** — D249 = the fact-check; D247/D246/D245/D244/D229. Verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D249.
6. ☐ **`.claude/specs/22-...`** — FR-22-2/2.1/2.2 (child-vs-scalar fork) + FR-22-3 (single-recursive walker) + §FR-22-5.3 (the SLOT-KEYED `slot_has_equivalent_block`, NOT `equivalent_block_for`) + R-22-* rules.
7. ☐ **`.claude/state.md` + `.claude/parking.md` + `.claude/OUT-OF-SCOPE-NOTES.md`** (the reality-first stage map) + the foundation modules (`ledger/` F2, `oracle/` F3, `cheat-gate/` incl. the new Check #9, `coverage-matrix/`, `db-consistency/` F6) + `orchestrator/converter_v2/db_lookup.py`.
8. ☐ `pipeline-state/<latest-run>/{leftover-buckets,extract,trace}.json` — raw artefacts before ANY converter-quality conjecture.
9. ☐ **Register A + B (the W3 port spec, verbatim):** `git show 71a7fbad:.claude/next-session-prompt.md` — B1 full-walker / B2 styling-lift+`_bp_decls` / B3 arrays-as-is / B4 ambiguous-attr / B5 G1–G5 disposition / B-order.

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE — handoff.md (2026-06-30) + the W3 plan + Spec 31 §1/§3/§12 + the convert.py walker (`_route_composite_interior`/FR-22-3) + decisions.md→D249 + Spec 22 (FR-22-2/2.1/2.2 + FR-22-3 + §FR-22-5.3) + Register A/B? (Quote one specific thing — a §1 inventory line, or the `_route_composite_interior` 3 branches — to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D249.) Anything uncommitted that's MINE? (lucide/phase4/theme-handoff are NOT mine.)
3. Am I running the W3 Step-1 DESIGN-GATE (council + G1–G5 disposition + Bean sign-off) BEFORE any W3 code, and FACT-CHECKING every council finding against ground truth (STOP-15) before acting on it? **And verifying every subagent "covered / N-routes / no-cheating / tests-pass" claim against ground truth MYSELF (STOP-30) — never relaying a count I didn't derive?**
4. For W3, am I PORTING the working walker faithfully (read-to-port sanctioned, STOP-22 carve-out) — NOT recreating it (STOP-25) — and gating on draft-vs-clone LANDED (computed-style/innerText, input-class≠output-class checked, STOP-21/23) + Bean sign-off — not emit-green, not a passing self-test alone (Rules 4/5, A14)?
5. For any subagent: did I tell it "implement only your assigned files / RETURN findings; do NOT write shared docs or touch the shared git tree" (STOP-2)? Am I verifying its test/gate claims from the canonical cwd + proving the FAILURE path (STOP-16)?

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward, D101 — verbatim; do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, decisions.md, the raw run artefacts. The reading gate is non-skippable. (blub 353.)
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.** Opus orchestrates all shared-file writes; commit valuable artefacts BEFORE dispatching.
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** (Spec 31 §12.2.1.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.**
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** The F5 gates run on every CC `git commit` (`.claude/hooks/f5-commit-gate.py`). Before claiming "enforced", grep the wiring + confirm it RUNS.
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers** (R-22-1).
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = {767/768, 1023/1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier.
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined** (`variant_slots` + `blocks.variant_attr`; query, don't guess).
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl FIRST; gate on `innerText.length>0`. A content-gated block renders EMPTY without content BY DESIGN.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column/function EXISTS is necessary but NOT sufficient; grep the real signature + how it's WRITTEN and READ first. (The `content_attrs_with_selector` deletion in W3 Step 11 needs this — grep every reader before removing.)
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions** (D233).
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace** (D234).
- **STOP-14 — Before ARMING any gate, run it in report mode against CURRENT output + baseline today's legacy violations (key by identity, not line); fail only on NEW** (D236).
- **STOP-15 — Validate routing/variant claims against pipeline-PRODUCIBLE inputs, not synthetic dicts; run an adversarial-council AFTER a qc-council; then FACT-CHECK the council against ground truth** (D237/D242 — a council finding is a HYPOTHESIS).
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + the gate's `--check` YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`); prove the FAILURE path; inspect the committed baseline for stale plants.
- **STOP-17 — A coverage/no-drop/diff gate's set-difference join must key BOTH sides on the FULL unit identity incl. responsive tier/media; red-team a BUILT gate before trusting it** (D240).
- **STOP-18 — Don't defer residuals out of habit; fact-check each against ground truth first** (D241). Label each DONE-NOW / DISMISSED-with-evidence / DEFERRED-with-cited-blocker. (Arrays B4/FR-22-2.5 is PARTIAL even in convert.py — decide by fixture-set evidence, not habit.)
- **STOP-19 — A path-scoped `git commit -- $(...)` can DROP the source-path deletion of a `git mv`.** After any rename commit, verify `git ls-tree -r HEAD --name-only | grep <oldpath>`; commit by an explicit path list naming BOTH sides of every rename.
- **STOP-20 — Restructure a multi-file rebuild as a VERTICAL SLICE (one real output LANDED), not a horizontal scaffold of empty stubs; make LANDED the headline signal; DOUBLE-VERIFY a design before build then FACT-CHECK the verifiers** (D242).
- **STOP-21 — A new-engine resolver is only LANDED-proven by deploying its GENUINE output to a live page + computed-style/innerText + verdict — NOT by new-vs-frozen attr equivalence** (D243). Recipe: build markup via the engine → `orchestrator.emit_block_markup()` → REST-create a FRESH canary page (guard-safe; the wp-content-guard blocks post_content REWRITES, not REST page CREATE) → anonymous Chrome-DevTools/Playwright `getComputedStyle`/innerText (no admin bar) → require the OUTPUT marker + non-default. Delete the test page + 404-confirm. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **STOP-22 — The frozen `convert.py` is NEVER the design reference or the fact-check oracle for a rebuild stage — WITH ONE CARVE-OUT (D246).** Authority = Spec 31/22 + the modern DB tables + the draft. `convert.py` is consulted only to (1) NAME the bug being killed; (2) READ-TO-PORT a function Spec 31 §1's "ONE lift path" names as WORKING + in-scope for modularisation (the W3 walker `_route_composite_interior`/FR-22-3, `_lift_styling_attrs_by_selector`, the working scalar functions ARE the port source — reading them in full to port faithfully is MANDATORY). Tell raters to fact-check against Spec+DB+draft, never the BROKEN engine logic.
- **STOP-23 — Run a pre-commit `/qc-council` on the BUILT converter code, not just the design** (blub 255). Input class ≠ output class is a live trap (draft `__author` → render `__name`): verify render.php reads the attr you write AND paints the element you check (WRITTEN-not-LANDED).
- **STOP-24 — A DB change to a column `/sgs-update` RE-DERIVES (role/canonical_slot/derived_selector) must use the reseed-surviving `ATTR_CLASSIFICATION_OVERRIDES` channel (sgs-update-v2.py), not a bare migration** (a reseed overwrites a bare migration). Pair the override with a dated migration.
- **STOP-25 — A rebuild's "fresh/modular" = RE-HOUSE the existing WORKING logic into smaller files behind one dispatch; NEVER recreate it with new logic + new DB columns.** Read the WHOLE spec/file holistically; enumerate what ALREADY works (Spec 31 §1); PORT working code rather than re-derive. A council "X is missing from the spec" is a HYPOTHESIS about the spec TEXT — ask "is X actually missing, or elsewhere in the same system?" before adding a parallel mechanism.
- **STOP-26 — Before designing ANY rebuild stage, read the WHOLE target spec holistically (not greps), and state Spec 31 §1's COMPLETE function inventory in plain English BEFORE the first design sketch.** §1 is the SYSTEM MAP naming what exists+works vs what is genuinely absent.
- **STOP-27 — A regression/conservation guard is `raise`, NEVER a bare `assert`.** `python -O` strips `assert`, silently disabling the guard (a Rule-4 silent-drop hole). Audit any new guard — if it protects against a silent drop, it must `raise`/emit a loud `ContentGap`.
- **STOP-28 — Do NOT seat the new engine (`build_block_markup`/the W3 walker/`process_element`) into the PRODUCTION dispatch/clone path until A1-FULL (media-map loader, W3 Step 8) AND A2 (content conservation-ledger, W3 Step 9) are both green.** The "can't bite a real clone yet" safety rests on no production caller existing. Gate the wiring on both being green — structural precondition, not a memory item.
- **STOP-29 — BIND DEFINITION-OF-DONE TO THE SPEC'S FULL SCOPE; never ship a minimum increment and call the rest "out of scope".** Read the subsystem's COMPLETE spec section first; set done = the spec's FULL universal scope; map every not-built part to a named spec STAGE (or a data-model item). The universal stream = identify → migrate content → transfer attached CSS, for EVERY element, ONE dispatch.
- **STOP-30 — A subagent's "covered / N routes / no-cheating" verdict is a HYPOTHESIS; the 9-routes audit confidently conflated REGISTRY-ids with routes + hand-waved the 17. Re-enumerate + verify against ground truth; never relay a count you didn't derive.** Also: a worktree dispatched via `isolation:worktree` may branch from a STALE base — always `git merge-base main <branch>` before trusting/merging a worktree's "all green".
- **STOP-31 (NEW, D249) — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context (e.g. a side-suffix regex flagged ONLY inside `re.*` call args), NOT all string constants — else it false-positives on docstrings/prose that quote the pattern.** Plant-test every new gate (it FIRES on each real cheat kind) AND verify it stays SILENT on a docstring that merely quotes the cheat, BEFORE wiring it. Caught in QC this session: Check #9 (`check_converter_source.py`) flagged its own docstring; fixed by scoping the side-regex detector to `re.*` calls + `visit_Call`.
- **STOP-32 (NEW, D250) — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped / not routed / unbuilt".** A property has a destination if ANY of FOUR channels is positive — check ALL before declaring a gap: (a) WP native `supports` in `block.json` → the `style.*` path (padding/background-color/border-radius land via WP core, NO custom attr), (b) custom block attributes, (c) the wrapper render (`class-sgs-container-wrapper.php`), (d) the spec's declared destination (Spec 31 §2 line 81 + `property_suffixes`). A gap is real ONLY after all four are negative. I claimed "a clone DROPS padding/background/radius — not universal" after checking ONLY `block_attributes` — BS: `convert.py._lift_root_supports_to_style` emits them via native `style.*`. This was the SECOND phantom over-claim in one session (the "17 routes" was the first). Also: the INERT new engine ≠ the LIVE `convert.py` pipeline — say "the new engine hasn't ported X yet", never "a clone drops X". A 5-persona `/adversarial-council` Bean forced caught it. Memory `four-channel-check-before-claiming-a-property-is-not-routed` + blub #373.

---

## W3 ORCHESTRATION PLAN
**Steps 1–7 DONE this session (D250) — see handoff.md.** Full 12-step detail: **`.claude/plans/2026-06-30-phase-W3-interior-walker-css-content-unification.md`**. The REMAINING work (start here):

| Step | What | Execution | /qc gate after | Acceptance |
|------|------|-----------|----------------|------------|
| ~~1–7~~ | ✅ DONE (walker port + conductor unification + grid fix + Fix 1/2/3 + cheat fixes) | — | — | committed `bf1922b3`→`1b3d108c`, 267 tests, 6 gates green |
| **10** | **LANDED proof** on a canary (hero split, 375/768/1440) — THE real faithfulness gate; everything is WRITTEN not LANDED | **inline Opus** + Playwright/chrome-devtools | — | computed-style matches draft; Bean signs (R-22-13, STOP-21). Creds `.claude/secrets/sandybrown.env` |
| 8 | A1 media-map loader (image srcs → WP URLs) | Sonnet | QA Gate C | srcs remap on a wired run (STOP-28 precondition) |
| 9 | A2 content-conservation ledger (`declare_input` → content units) | inline Opus + Sonnet | QA Gate C | a dropped content node shows UNACCOUNTED (STOP-28 precondition) |
| NEW-a | **§5 lift-path** — make the seeded §5 props (object-fit/position/overflow/etc.) actually lift to their destinations | Sonnet | QA + coverage gate | seeded props COVER instead of UNACCOUNTED; baseline shrinks |
| NEW-b | **base-selector `!important` sweep** — ~30 now accurately flagged across blocks; assess each (real cheat → fix via specificity / variant-scope; legit WP-override → exclude) | Sonnet + inline judgement | cheat-gate Check #3 | base-selector !important on faithful props removed or justified |
| 11 | Delete dead `content_attrs_with_selector` (grep 0 readers, STOP-11) | Sonnet | — | 0 readers, suite green |
| 12 | Commit (split per R-22-5) + D-number + /handoff | inline | — | main carries the work |

**Dependency graph:**
```
Step 1 (design-gate, Bean sign-off)
  ↓
Step 2 → Step 3 → QA Gate A
  ↓
Step 4 (walker, inline Opus) + Step 5 + Step 6 → QA Gate B
  ↓
Step 7 (KEYSTONE unification, inline Opus)
  ↓
Step 8 + Step 9 → QA Gate C
  ↓
Step 10 (LANDED proof + Bean sign-off)
  ↓
Step 11 → Step 12 (commit + handoff)
```

## Methodology guardrails (do not skip)
- **Deploy before measure** — any LANDED check requires the genuine emit deployed to the live canary (STOP-21 recipe) BEFORE any computed-style read. A read against stale output measures nothing.
- **Root cause before instance fix** — when a section fails, ask "what's the class of failure?" (converter / walker / DB) before a per-section tweak.
- **Outcome vs completion** — code shipped ≠ outcome. W3 is done only when a composite LANDS draft-faithful (Step 10), not when the walker compiles.
- **/qc-council BEFORE every commit** touching converter/walker/SGS-block logic (blub 255). **Per-section cropped pixel-diff** via `--selector`, never full-page (blub 256).
- **WRITTEN ≠ LANDED; verify on the real homepage** (Rules 4/5). Gate every probe on `innerText.length>0` (empty section = false win, STOP-10).
- **convert.py stays byte-identical** (D-MODULAR) — never edit the frozen engine; the new conductor lives behind a flag until Step 10 proves it.

## Skills to Invoke
| Skill | When to use |
|-------|-------------|
| `/brainstorming` | architectural decisions (e.g. the conductor's Ctx contract, MF-2) |
| `/gap-analysis` | grade any output before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` | auto-routes if a W3 unknown surfaces (unlikely — Register B is pre-resolved) |
| `/strategic-plan` | only if W3 scope shifts materially |
| `/qc-council` · `/adversarial-council` | Step 1 design-gate + every pre-commit on converter/walker code (STOP-23) |
| `/subagent-driven-development` · `/subagent-prompt` · `/delegate` | Steps 2,3,5,6,8,11 (dispatch; prompts in the plan) |
| `/systematic-debugging` · `/verify-loop` | Step 4/7 regressions + 2-attestation per load-bearing claim |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` | DB ground-truth; the LANDED run |
| `/handoff` · `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | What to use it for |
|------|-------------------|
| Playwright / chrome-devtools | Step 10 LANDED proof (anonymous computed-style at 375/768/1440) |
| `python ~/.claude/hooks/wp-blocks.py dump` · `sgs-db.py` | schema/DB ground-truth before any "missing X" claim |
| REST (Store-API basic auth) | Step 10 guard-safe canary page CREATE (creds `.claude/secrets/sandybrown.env`) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy W3 build steps (walker port, conductor) if dispatched |
| `code-reviewer` (feature-dev) | pre-commit review on the walker/conductor diffs |

## Guardrails (commands)
- Tests: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests cheat-gate/tests -q --import-mode=importlib` (176+45 baseline; never let the count drop).
- Cheat gate: `python cheat-gate/run.py --check` must exit 0 (Check #9 now armed — a NEW className-write/suffix-dict fails it; DB-source it, don't baseline).
- Branch: `git branch --show-current` → main; D-ceiling D249; commit path-scoped (lucide/phase4/theme-handoff are NOT yours).