---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / Phase W3 — interior-walker wiring + CSS↔content unification
generated: 2026-06-30
primary_goal: "W3-remainder progressed (D251): A1 media-map + 2 hero LANDED-bugs FIXED + the DB role-derivation root cause FIXED (b921a909). The keystone NEXT job is B = the UNIVERSAL CHILD-LIFT (highest-regression walker, STOP-19, design-gated this session by a 6-persona council): route EVERY child through `build_block_markup` (delete the scalar `primary_attr` bypass, extraction.py:209-225) so content+CSS+variant fire uniformly per Spec 31 §3.B.0, using the EXISTING shared `field_extractors` handlers (reconcile `url-href`→`link-href`, the DB convention; add link-href + css-modifier branches; NOT a clone of convert.py `_atomic_attrs_for`). Then re-run the LANDED hero proof (canary, page-source compare + computed-style + Bean eye), then the W3 remainder (A2 ledger, §5 lift, !important sweep, dead-code). FULL design + council must-fix register: `.claude/reports/2026-06-30-role-derivation-root-cause.md`. D251 in decisions.md."
---

# Next session — Phase W3 (the keystone: wire the engine + LAND it)

Invoke `/autopilot` before anything else.

**Agent identity.** You are the SGS cloning-pipeline engineer executing Phase W3 — the step that turns the converter from tested-but-inert parts into a live engine that converts an SGS-BEM draft into faithful native SGS blocks on the real homepage, zero cheats.

**State recap (plain English).** Building the W3 LANDED proof (genuine `build_block_markup` emit of the real Mama's hero split) surfaced engine gaps. THREE fixed + committed this session (D251): **A1 media-map** (`8ea61b58` — `media_map` now threads through `run_mechanism_b` + the `_child_content_for_node` recursion; images remap), **hero bug 1** (`0b9bc509` — `splitImageMobile` no longer dropped), **hero bug 3** (`1ef2afc2` — variant detection fires so render.php's split gate works). **Hero bug 2 (the CTA buttons) is the keystone left:** child blocks emit LOSSY — a `<a class="sgs-button--primary" href>` emits `{label}` only, dropping `url`+`inheritStyle`, because `_child_content_for_node` returns ONE text value and `ChildBlock(slug, content:str)` can't carry more. A 6-persona `/adversarial-council` design-gated the fix (see register doc) and REVISED it: **route EVERY child through `build_block_markup`** (the same path top-level blocks use) so content+CSS+variant lift uniformly — using the EXISTING shared `field_extractors` role handlers, NOT a clone of `_atomic_attrs_for`. Separately, the DB ROLE DATA root cause was found + FIXED (`b921a909`): the role classifier was never wired into `/sgs-update` (ran with no args) AND was NULL-only, so 11 content roles were wrong/missing — now wired + upgrades generic `content`→specific, deterministic. B = the walker recode is fresh-session work (STOP-19: don't grind the highest-regression surface under context pressure). The new engine is still INERT in production (frozen `convert.py` runs live clones, STOP-28).

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
- **STOP-33 (NEW, D251) — A "deterministic" DB tool only guarantees correct data for the steps it ACTUALLY runs.** Before blaming wrong/missing DB data on a block.json or a per-attr error, check whether the derivation STEP that should set it is even WIRED INTO the standard flow. Root cause this session: the role classifier (`assign-canonical.py --apply-roles`) was a manual CLI mode `/sgs-update` never invoked (`sgs-update-v2.py:703` runs it with NO args) AND was NULL-only (never corrected a wrong populated role) — so wrong/missing roles were only ever fixed by hand-written `ATTR_CLASSIFICATION_OVERRIDES` (the treadmill Bean rejects). FIX the derivation (wire it in + let high-confidence name-regex UPGRADE the generic `content` catch-all), NEVER a per-entry override. And FACT-CHECK council DB claims: 3 of 4 DB-truth findings were false (multi-button=layout wrapper, social-icons=array, `icon-slug` role doesn't exist → use `identity`). Report-first (baseline the changes, Bean eyeballs) before auto-applying a derivation change across all blocks (STOP-14). Report doc: `.claude/reports/2026-06-30-role-derivation-root-cause.md`.

---

## W3 ORCHESTRATION PLAN
**A1 media-map + hero bugs 1&3 + DB role-derivation root-cause fix DONE this session (D251).** The DESIGN for B is council-validated + in `.claude/reports/2026-06-30-role-derivation-root-cause.md` (READ IT FIRST — it has the 6-persona must-fix register + the role facts). Remaining work, start here:

| Step | What | Execution | /qc gate after | Acceptance |
|------|------|-----------|----------------|------------|
| ~~A1, hero 1&3, role-fix~~ | ✅ DONE D251 (`8ea61b58`/`0b9bc509`/`1ef2afc2`/`b921a909`) | — | — | committed, 276 tests, F5/F6 gates green |
| **B — UNIVERSAL CHILD-LIFT (KEYSTONE)** | route EVERY child through `build_block_markup` (delete the scalar `primary_attr` bypass, `extraction.py:209-225`) so content+CSS+variant lift uniformly (Spec 31 §3.B.0); reconcile `field_extractors` role `url-href`→`link-href` (DB convention, 30 attrs); add `link-href`+`css-modifier` branches to the shared lift; make a capability-less leaf (button) lift label+url+inheritStyle via the SHARED handlers (NOT a `_atomic_attrs_for` clone — slug literals fail the gate); handle `None` `has_inner_blocks`; tests across child/array/top-level shapes | **inline Opus** (highest-regression walker, STOP-19) | `/qc-council` BEFORE commit (blub 255) | a hero CTA emits `{label,url,inheritStyle}`; `/qc-council` GREEN; 276+ tests hold |
| LANDED | re-run the LANDED hero proof on a canary (full hero incl CTAs, 375/768/1440) — direct page-source compare + computed-style + Bean eye (blub #374; the JS parity scripts are UNRELIABLE — do NOT use them) | inline Opus + chrome-devtools/Playwright | — | CTAs render with link + primary/secondary style; Bean signs (R-22-13, STOP-21). Creds `.claude/secrets/sandybrown.env` |
| A2 | content-conservation ledger (`declare_input` → content routing units) | inline Opus + Sonnet | QA Gate C | a dropped content node shows UNACCOUNTED (STOP-28 precondition for prod-wiring) |
| §5 lift | make the seeded §5 props (object-fit/position/overflow/etc.) actually lift | Sonnet | QA + coverage gate | seeded props COVER instead of UNACCOUNTED; baseline shrinks |
| !important sweep | base-selector `!important` flagged across blocks; assess each (real cheat → specificity/variant-scope; legit WP-override → exclude) | Sonnet + inline judgement | cheat-gate Check #3 | base-selector !important on faithful props removed or justified |
| dead-code | delete dead `content_attrs_with_selector` (grep 0 readers, STOP-11) | Sonnet | — | 0 readers, suite green |
| commit | split per R-22-5 + D-number + /handoff | inline | — | main carries the work |

**Dependency graph:**
```
B — universal child-lift (inline Opus; READ the register doc first; STOP-19/22/25)
  ↓ /qc-council
LANDED proof (full hero incl CTAs) + Bean sign-off (R-22-13, STOP-21)
  ↓
A2 ledger + §5 lift + !important sweep + dead-code (parallel-ish where disjoint)
  ↓
commit (split) + D-number + /handoff
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