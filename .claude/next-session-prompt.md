---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / sgs-container DEFAULT (FR-31-4) + canary LANDED test
generated: 2026-06-30
primary_goal: "Make the new converter engine clone a FULL homepage, not just 2 composite sections. The keystone child-lift LANDED-in-engine this session (D252) + the engine is wired to /sgs-clone behind SGS_NEW_ENGINE=1 + Spec 22 was merged into Spec 31 (D253, now THE pipeline spec). The full-homepage run exposed the #1 blocker: the new engine's recognition FAILS LOUD for a slug-None section instead of DEFAULTING it to sgs/container + recurse children (FR-31-4) — 7/9 real sections gap because of this. NEXT = fix the sgs/container default (design-gate first, walker-adjacent STOP-19), then run the canary LANDED test (SGS_NEW_ENGINE=1 + Bean eye)."
---

# Next session — the new engine must clone a FULL homepage (sgs/container DEFAULT + canary LANDED)

Invoke `/autopilot` before anything else.

**Agent identity.** You are the SGS cloning-pipeline engineer. The new converter engine now lifts a hero's CTAs faithfully and is reachable from `/sgs-clone`, but it only clones the 2 sections that map to a registered composite — every other section honestly gaps. Your job: make it DEFAULT a no-name-match section to `sgs/container` + recurse its children (FR-31-4), so it clones any real homepage, then prove it LANDED on the canary.

**State recap (plain English).** A "class-section" is a top-level page section (`<section class="sgs-hero">`, `<section class="sgs-brand">`, …). MOST sections have NO block of their own and are supposed to become a generic `sgs/container` with their blocks recursed inside; only a few (hero, trust-bar, cta-section — `blocks.tier='class-section'`) become a named composite. This default is **FR-31-4 (Spec 31 §13.2)**. The new engine's recognition (`converter/recognition.py`) gets it BACKWARDS: its 4th branch returns `unrecognised` (a LOUD RED, emits nothing) for any slug-None section instead of defaulting to `sgs/container`+recurse. So in the full-homepage run, 2/9 sections cloned and 7/9 emitted nothing. The walker (`run_mechanism_b`) already recurses children — the missing piece is recognition/dispatch defaulting a slug-None section to `sgs/container` instead of failing. This is the #1 unblock. The engine is INERT in prod by default; `SGS_NEW_ENGINE=1` routes a `/sgs-clone` run through it (else frozen `convert.py`). Spec 22 is now merged into **Spec 31 §13** (R-22-N ≡ R-31-N).

---

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change AND every council)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-slot exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP (visible to F5). Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (renders on the page). Synthetic-fixture-green ≠ real-draft-correct (STOP-34).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, recognition, converter, seeding, ledger, gates) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building. The recognition/default change IS this — its own design-gate is Task-1 Step 1.

## ⛔⛔ MANDATORY READING GATE (verify against ground truth, never guess; read WHOLE docs/files, not greps). Tick each in your first message:
1. ☐ **`.claude/handoff.md` (2026-06-30)** — the D252/D253 entry (keystone + wiring + merge + the DEFAULT-IS-CONTAINER deviation).
2. ☐ **`.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md`** — the DEFAULT-IS-CONTAINER box (§12.6) + **§13.2 FR-31-4/4.1** (the sgs/container default + the fold/recurse precedence #1-#5 incl. the content-leaf-not-container rule) + §13.8 Appendix A (the 3-exception walker) + §1/§3/§3.B.0. **Spec 31 is now THE pipeline spec (Spec 22 merged in, §13).**
3. ☐ **The new engine recognition + dispatch:** `converter/recognition.py` (the 4-branch recognise(); the 4th UNRECOGNISED branch is the deviation to fix) + `converter/services/extraction.py` (`extract_content` 4-case dispatch + `run_mechanism_b` + `build_block_markup`) + `converter/services/fold_helpers.py`.
4. ☐ **The frozen `convert.py` port-SOURCE (read-to-port SANCTIONED, STOP-22 carve-out):** `walk()` (:4337) — exception #3 "top-level container wrap" + how a slug-None section emits `sgs/container` + recurses; `FR-31-4.1` fold/recurse. The meaty read before designing the default fix.
5. ☐ **`.claude/decisions.md` (head → D253)** — D253 = the merge; D252 = the keystone. Verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D253.
6. ☐ **`.claude/state.md` + `.claude/parking.md` + `.claude/OUT-OF-SCOPE-NOTES.md`** + the foundation modules (`ledger/` F2, `oracle/` F3, `cheat-gate/`, `coverage-matrix/`) + `orchestrator/converter_v2/db_lookup.py`.
7. ☐ `pipeline-state/<latest-run>/{leftover-buckets,extract,trace}.json` — raw artefacts before ANY converter-quality conjecture.
8. ☐ **The full-homepage harness** — re-run the new engine across all 9 Mama's sections (parse CSS via `convert.parse_css`, loop `find_top_level_sections`, `recognise()`+`build_block_markup()` each) to reproduce the 2/9-vs-7/9 map before/after the fix.

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE — handoff (D253) + Spec 31 §13.2 FR-31-4/4.1 + the recognition.py 4th branch + the convert.py `walk()` container-wrap port-source + decisions→D253? (Quote one specific thing — the FR-31-4.1 precedence steps, or the recognition.py UNRECOGNISED branch lines — to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; D-ceiling → D253.) Anything uncommitted that's MINE? (lucide/W3-plan/render.php are NOT mine.)
3. Am I DESIGN-GATING the recognition/default change (council + Bean sign-off) BEFORE any code (Rule 7, STOP-19 — recognition is walker-adjacent, highest-regression), and FACT-CHECKING every council finding against ground truth (STOP-15)?
4. Am I gating on the REAL FULL HOMEPAGE (all 9 sections cloning, draft-vs-clone, computed-style/innerText), NOT a synthetic fixture (STOP-34) and NOT emit-green (Rules 4/5, STOP-4)?
5. For any subagent: did I tell it "implement only your assigned files / RETURN findings; do NOT write shared docs or touch the shared git tree" (STOP-2)? Am I verifying its test/gate claims from the canonical cwd + proving the FAILURE path (STOP-16)?

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward, D101 — verbatim; do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, decisions.md, the raw run artefacts. The reading gate is non-skippable. (blub 353.)
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.** Opus orchestrates all shared-file writes; commit valuable artefacts BEFORE dispatching.
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** (Spec 31 §12.2.1.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.**
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** The F5 gates run on every CC `git commit` (`.claude/hooks/f5-commit-gate.py`). Before claiming "enforced", grep the wiring + confirm it RUNS.
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers** (R-31-1).
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = {767/768, 1023/1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier.
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined** (`variant_slots` + `blocks.variant_attr`; query, don't guess).
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl FIRST; gate on `innerText.length>0`. A content-gated block renders EMPTY without content BY DESIGN.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column/function EXISTS is necessary but NOT sufficient; grep the real signature + how it's WRITTEN and READ first.
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions** (D233).
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace** (D234).
- **STOP-14 — Before ARMING any gate, run it in report mode against CURRENT output + baseline today's legacy violations (key by identity, not line); fail only on NEW** (D236).
- **STOP-15 — Validate routing/variant claims against pipeline-PRODUCIBLE inputs, not synthetic dicts; run an adversarial-council AFTER a qc-council; then FACT-CHECK the council against ground truth** (D237/D242 — a council finding is a HYPOTHESIS).
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + the gate's `--check` YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`); prove the FAILURE path; inspect the committed baseline for stale plants.
- **STOP-17 — A coverage/no-drop/diff gate's set-difference join must key BOTH sides on the FULL unit identity incl. responsive tier/media; red-team a BUILT gate before trusting it** (D240).
- **STOP-18 — Don't defer residuals out of habit; fact-check each against ground truth first** (D241). Label each DONE-NOW / DISMISSED-with-evidence / DEFERRED-with-cited-blocker.
- **STOP-19 — A path-scoped `git commit -- $(...)` can DROP the source-path deletion of a `git mv`.** After any rename commit, verify `git ls-tree -r HEAD --name-only | grep <oldpath>`; commit by an explicit path list naming BOTH sides of every rename. (Also: the walker/recognition is the HIGHEST-regression surface — design-gate + don't grind under context pressure.)
- **STOP-20 — Restructure a multi-file rebuild as a VERTICAL SLICE (one real output LANDED), not a horizontal scaffold of empty stubs; make LANDED the headline signal; DOUBLE-VERIFY a design before build then FACT-CHECK the verifiers** (D242).
- **STOP-21 — A new-engine resolver is only LANDED-proven by deploying its GENUINE output to a live page + computed-style/innerText + verdict — NOT by new-vs-frozen attr equivalence** (D243). Recipe: build markup via the engine → `orchestrator.emit_block_markup()` → REST-create a FRESH canary page (guard-safe; the wp-content-guard blocks post_content REWRITES, not REST page CREATE) → anonymous Chrome-DevTools/Playwright `getComputedStyle`/innerText (no admin bar) → require the OUTPUT marker + non-default. Delete the test page + 404-confirm. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`). Now also reachable via `/sgs-clone` with `SGS_NEW_ENGINE=1`.
- **STOP-22 — The frozen `convert.py` is NEVER the design reference or the fact-check oracle for a rebuild stage — WITH ONE CARVE-OUT (D246).** Authority = Spec 31 + the modern DB tables + the draft. `convert.py` is consulted only to (1) NAME the bug being killed; (2) READ-TO-PORT a function Spec 31 names as WORKING + in-scope (the `walk()` container-wrap + FR-31-4.1 fold/recurse ARE the port source for the default fix — reading them in full to port faithfully is MANDATORY). Tell raters to fact-check against Spec+DB+draft, never the BROKEN engine logic.
- **STOP-23 — Run a pre-commit `/qc-council` on the BUILT converter code, not just the design** (blub 255). Input class ≠ output class is a live trap; verify render.php reads the attr you write AND paints the element you check (WRITTEN-not-LANDED).
- **STOP-24 — A DB change to a column `/sgs-update` RE-DERIVES (role/canonical_slot/derived_selector) must use the reseed-surviving `ATTR_CLASSIFICATION_OVERRIDES` channel (sgs-update-v2.py), not a bare migration.** Pair the override with a dated migration.
- **STOP-25 — A rebuild's "fresh/modular" = RE-HOUSE the existing WORKING logic into smaller files behind one dispatch; NEVER recreate it with new logic + new DB columns.** Read the WHOLE spec/file holistically; enumerate what ALREADY works; PORT working code rather than re-derive.
- **STOP-26 — Before designing ANY rebuild stage, read the WHOLE target spec holistically (not greps), and state Spec 31's COMPLETE function inventory in plain English BEFORE the first design sketch.**
- **STOP-27 — A regression/conservation guard is `raise`, NEVER a bare `assert`.** `python -O` strips `assert`, silently disabling the guard. If it protects against a silent drop, it must `raise`/emit a loud `ContentGap`.
- **STOP-28 — Do NOT seat the new engine into the PRODUCTION-DEFAULT clone path until A1-FULL (media-map loader) AND A2 (content conservation-ledger) are green.** The `SGS_NEW_ENGINE=1` flag is the opt-in test switch (safe — default-off keeps frozen convert.py live); flipping the DEFAULT to the new engine is gated on both being green.
- **STOP-29 — BIND DEFINITION-OF-DONE TO THE SPEC'S FULL SCOPE; never ship a minimum increment and call the rest "out of scope".** Read the subsystem's COMPLETE spec section first; map every not-built part to a named spec STAGE. The universal stream = identify → migrate content → transfer attached CSS, for EVERY element, ONE dispatch.
- **STOP-30 — A subagent's "covered / N routes / no-cheating" verdict is a HYPOTHESIS.** Re-enumerate + verify against ground truth; never relay a count you didn't derive. A worktree dispatched via `isolation:worktree` may branch from a STALE base — `git merge-base main <branch>` before trusting it.
- **STOP-31 (D249) — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context, NOT all string constants.** Plant-test every new gate (it FIRES on each real cheat kind) AND verify it stays SILENT on a docstring that quotes the pattern, BEFORE wiring it.
- **STOP-32 (D250) — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped / not routed / unbuilt".** A property has a destination if ANY of FOUR channels is positive: (a) WP native `supports`→`style.*`, (b) custom block attrs, (c) the wrapper render, (d) the spec's declared destination. A gap is real ONLY after all four are negative. The INERT new engine ≠ the LIVE convert.py — say "the new engine hasn't ported X yet", never "a clone drops X". (blub #373.)
- **STOP-33 (D251) — A "deterministic" DB tool only guarantees correct data for the steps it ACTUALLY runs.** Before blaming wrong/missing DB data, check whether the derivation STEP that should set it is even WIRED INTO the standard flow. FIX the derivation (wire it in + name-regex UPGRADE the generic `content`), NEVER a per-entry override. FACT-CHECK council DB claims against the DB.
- **STOP-34 (NEW, D252) — SYNTHETIC-FIXTURE-GREEN ≠ REAL-DRAFT-CORRECT.** A unit test built from a hand-written node can take a DIFFERENT code path than the real draft and mask a bug. This session: a synthetic `<div class="sgs-multi-button">` used recognise()'s NAMED-root-class branch (has_inner=1, correct); the REAL draft's `.sgs-hero__ctas` used the SCALAR element-class branch (has_inner hardcoded 0, BUG) → buttons silently dropped. The synthetic test passed while the real hero failed. ALWAYS reproduce on the FULL real draft (all sections), not a synthetic node, before claiming a fix LANDED. The full-homepage run is the universality test; one synthetic fixture is not.
- **STOP-35 (NEW, D252) — DEFAULT-IS-CONTAINER: a slug-None class-section DEFAULTS to `sgs/container` + recurse children (FR-31-4), it does NOT fail.** Most sections have no registered block; `sgs/container`+children is the COMMON case, a name-match (hero/trust-bar, `blocks.tier='class-section'`) is the EXCEPTION. The new engine's recognition 4th branch wrongly returns `unrecognised` (loud RED, emits nothing) for a slug-None section — that CONTRADICTS FR-31-4 and is why 7/9 real sections gap. The D244 "never a silent empty sgs/container" guard over-corrected: it conflated an EMPTY container (bad) with a container CARRYING its recursed children (the correct default). Fix recognition/dispatch to default, not the walker (which already recurses).
- **STOP-36 (NEW, D253) — Merging/renumbering a canonical spec: renumber via SCRIPT on an ACTIVE-FILE ALLOWLIST only; a clean repo-wide renumber is IMPOSSIBLE when frozen code (convert.py, D-MODULAR) holds the refs + gates are named after rules.** Exclude frozen code + all archives/historical; keep an ID-mapping note (`R-22-N ≡ R-31-N`). Verify tests + cheat-gate green AFTER the renumber (a gate could match a rule string). QC-council a merged spec — raters caught rule-ID miscites, a phantom FR, stale counts that self-review missed.

---

## ORCHESTRATION PLAN

### Task 1 — sgs/container DEFAULT for slug-None sections (FR-31-4) — THE #1 UNBLOCK
**What:** Make the new engine emit `sgs/container` + recurse children for a top-level section whose root class maps to no registered composite, instead of returning `unrecognised` (emitting nothing).
**Why:** Unblocks 7/9 real homepage sections (header, featured-product, brand, ingredients, gift, social-proof, footer) — takes the new engine from "2 composite sections" to "any real homepage." Measurable: the full-homepage harness goes from 2/9 → 9/9 sections emitting non-empty markup with their content present.
**Estimated time:** design-gate ~10 min; build ~20-30 min (recognition + dispatch, walker-adjacent).
**Orchestration:**
- Execution: **inline Opus** (highest-regression recognition/walker surface, STOP-19).
- Step 1 — DESIGN-GATE (Rule 7): `/adversarial-council` on the fix shape (where does the default fire — `recognise()` returning a container Recognition for slug-None section roots, or `extract_content`/`build_block_markup` dispatch? how does it recurse children via `run_mechanism_b`? how does the content-leaf-not-container rule, FR-31-4.1 #5, avoid a `sgs/container` wrapping raw text?). PORT-source = convert.py `walk()` exception #3 + FR-31-4.1 (STOP-22 carve-out). Bean sign-off before code.
- Step 2 — build + tests (named-vs-slug-None section recognition; the fold/recurse precedence #1-#5; the content-leaf exception). Keep 286+ tests green.
- `/qc-council` gate after: **yes** — pre-commit on the BUILT recognition/dispatch code (STOP-23).
**Depends on:** none. **Parallel with:** none.
**Acceptance:** the full-homepage harness emits non-empty faithful markup for ALL 9 Mama's sections (slug-None → `sgs/container` with the right children, draft-vs-clone content present), zero cheats, zero `sgs/container` wrapping raw text. NOT emit-green alone.

### Task 2 — Canary LANDED test (SGS_NEW_ENGINE=1 + Bean eye)
**What:** Run `/sgs-clone` with `SGS_NEW_ENGINE=1` on the Mama's homepage, deploy to the sandybrown canary, verify the rendered page section-by-section.
**Why:** The real "is it faithful" gate (R-31-13, STOP-21). The engine is WRITTEN+tested but not LANDED on a rendered page.
**Estimated time:** ~20 min (deploy + 3-breakpoint capture + compare).
**Orchestration:**
- Execution: inline Opus + chrome-devtools/Playwright + REST (guard-safe canary page CREATE, creds `.claude/secrets/sandybrown.env`).
- Method: direct page-source-vs-draft compare per section + computed-style at 375/768/1440 + Bean eye. The JS parity scripts are UNRELIABLE (blub #374) — do NOT use them.
- `/qc` gate after: no (Bean-eye IS the gate, R-31-13).
**Depends on:** Task 1. **Parallel with:** none.
**Acceptance:** the hero CTAs render with working links + primary/secondary style AND the 7 previously-gapping sections now render their content via `sgs/container`, at 3 breakpoints, with Bean's sign-off.

### Task 3 — W3 remainder (after the page LANDS)
**What:** A2 content-conservation ledger (`declare_input` → content routing units); §5 lift-path (make seeded grid/position/object-fit/etc. actually lift); base-selector `!important` sweep; dead-code (`content_attrs_with_selector`, grep 0 readers first per STOP-11).
**Orchestration:** Sonnet subagents for the disjoint pieces (each RETURNS findings / implements assigned files, STOP-2); inline judgement for the !important cheat-vs-legit calls (STOP-8 — a Haiku agent can't make the device-tier classification).
**Depends on:** Task 1 + 2. **Acceptance:** each maps to its named Spec 31 §12 stage (STOP-29); coverage baseline shrinks; tests hold.

### Dependency graph
```
Task 1 (inline Opus; design-gate -> build -> /qc-council)
  -> full homepage clones via the new engine
Task 2 (canary LANDED + Bean eye, R-31-13/STOP-21)
  ->
Task 3 (W3 remainder — Sonnet subagents + inline judgement)
```

## Skills to Invoke
| Skill | When to use |
|-------|-------------|
| `/brainstorming` | architectural decisions (the recognition-default fix shape) |
| `/gap-analysis` | grade any output before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` | auto-routes if a Task-1 unknown surfaces |
| `/strategic-plan` | only if scope shifts materially |
| `/adversarial-council` · `/qc-council` | Task-1 design-gate + every pre-commit on recognition/walker/converter code (STOP-23) |
| `/subagent-driven-development` · `/subagent-prompt` · `/delegate` | Task-3 dispatch |
| `/systematic-debugging` · `/verify-loop` | Task-1 regressions + 2-attestation per load-bearing claim |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` | DB ground-truth; the canary LANDED run |
| `/handoff` · `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | What to use it for |
|------|-------------------|
| Playwright / chrome-devtools | Task-2 LANDED proof (anonymous computed-style at 375/768/1440) |
| `python ~/.claude/hooks/wp-blocks.py dump` · `sgs-db.py` | schema/DB ground-truth before any "missing X" claim |
| REST (Store-API basic auth) | Task-2 guard-safe canary page CREATE (creds `.claude/secrets/sandybrown.env`) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy build steps if dispatched (Task 3 disjoint pieces) |
| `code-reviewer` (feature-dev) | pre-commit review on the recognition/dispatch diff |

## Methodology guardrails (do not skip)
- **Deploy before measure** — any LANDED check requires the genuine emit deployed to the live canary (STOP-21 recipe / `SGS_NEW_ENGINE=1`) BEFORE any computed-style read.
- **Root cause before instance fix** — when a section fails, ask "what's the class of failure?" (recognition / dispatch / walker / DB) before a per-section tweak.
- **Outcome vs completion** — Task 1 is done only when the FULL homepage clones via the new engine (all 9 sections), not when the recognition compiles. Code shipped ≠ outcome.
- **/qc-council BEFORE every commit** touching recognition/walker/converter (blub 255). **Per-section cropped pixel-diff** via `--selector`, never full-page (blub 256) — and pixel-diff is DIAGNOSTIC; the closing gate is computed-style-vs-draft + Bean eye (R-31-4 / §7b).
- **Synthetic-fixture-green ≠ real-draft-correct** (STOP-34) — reproduce on the full real draft.
- **convert.py stays byte-identical** (D-MODULAR) — never edit the frozen engine.
- Tests: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests cheat-gate/tests -q --import-mode=importlib` (286 baseline; never let the count drop). Cheat gate: `python cheat-gate/run.py --check` exits 0. Branch `main`; D-ceiling D253; commit path-scoped (lucide/W3-plan/render.php are NOT yours).
