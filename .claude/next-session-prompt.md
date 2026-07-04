---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / converter completion EXECUTION (Steps 3-16)
generated: 2026-07-04-EVENING
primary_goal: "Execute the Bean-APPROVED converter completion plan from Step 3 onward: the Phase-2 modular walk (Ctx destination contract → monolith split → walker+registry → emit_shape wiring → the ONE cascade → has_inner migration → QA Gate A, landing product-card + zero-fallback + a parity rise), then Phases 3-6 to parity and the converter_v2 deletion. Single-session target (Bean-set); gates A/B/C are HANDOFF-safe insurance. The architecture is LOCKED in Spec 31 FR-31-2.7 + FR-31-2.8 — build to it, no re-derivation."
---

# ⚡ NEXT SESSION — EXECUTE the completion plan (Step 3 →), architecture pre-locked

Invoke `/autopilot` first. This is a `/sgs-wp-engine` + spec-conformance BUILD session. **Everything is pre-decided:** the plan is APPROVED (D274), the architecture is spec text (FR-31-2.7/2.8), the fact-check corrected every known-stale claim (D273), and the docs you'll read were verified accurate on 2026-07-04. Do not re-plan; execute.

**Agent identity.** You are the SGS converter-completion engineer. Your working documents: `.claude/plans/2026-07-04-converter-completion-EXECUTION.md` (the 16-step plan — Steps 1-2 DONE) + its requirements register `2026-07-04-new-engine-to-parity-delete-converter-v2.md`. You build inline for architectural steps and dispatch ONE solo Sonnet coding subagent at a time for mechanical steps (foreground, named files, "do the work yourself, spawn no agents", you verify its edits + tests yourself).

**State recap (plain English).** The new modular converter already clones the whole Mama's homepage with ZERO frozen-fallback sections (measured 2026-07-04) and live media; parity baseline is content 77% / CSS 47-54%. What remains: the Phase-2 re-architecture (per-attr emit_shape walk + the ONE cascade — the biggest fidelity lever), then decoupling from `converter_v2`, the parity backlog, and delete-last. A parallel session (D275, committed + pushed `291ed7ce`/`68cd32ba`/`7f58a95c`) purged product-card's legacy InnerBlocks at source AND built `db_lookup.content_attr_for_element` (TDD-green, INERT — the element→attr content router Phase 2 wires). Page-8 cards render content-EMPTY until your Phase 2 lands them (expected, NOT a regression — the pre-D275 emission was text-block soup).

---

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS, **no hand-declared per-block/per-draft selectors**, **no client copy baked into a base block**, **no per-slug/per-slot/per-role literal in a resolver body**. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix fires for every qualifying block/case; over-broad universality is ALSO a break. Universal signal = a DB fact (`is_root`, `container_kind`, a capability, a `role`, `blocks.variant_attr`, `emit_shape`), never `if slug == X`.
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone at 375/768/1440. Emit-green ≠ LANDED. WRITTEN ≠ LANDED. "Deploy to homepage" = overwrite the REAL homepage page (sandybrown = page 8), never a new page (D254). Don't declare a section fixed from a grid+N-items impression (STOP-40).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **FOLLOW THE SPEC IN EVERY DETAIL** — Spec 31 is the settled authority. Read the governing section IN FULL and implement exactly what it specifies. Where silent, pin the smallest spec-consistent rule and write it INTO the spec.

## ⛔⛔ MANDATORY READING GATE (verify against ground truth, never guess; read WHOLE docs, not greps). Tick each in your first message:
1. ☐ **`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — READ IN FULL, END TO END (Bean directive; STOP-26).** Especially §2 (core mechanism + the 2026-07-04 two-variant-mechanisms clarification), §13.3 **FR-31-2.6/2.7/2.8** (the emit_shape walk + classifier + registry/destination contract — your build blueprint), §13.1 R-31-1..15, §3.A/§3.B. The spec was staleness-swept 2026-07-04 — it is accurate; trust it over any older doc.
2. ☐ **`.claude/plans/2026-07-04-converter-completion-EXECUTION.md`** (the 16-step plan — your task list) + **`2026-07-04-new-engine-to-parity-delete-converter-v2.md`** (the requirements register with the fact-check table + council fixes).
3. ☐ **`.claude/specs/29-CONTAINER-EQUIVALENT-BLOCKS.md`** — the L1-L4 model + 3-KIND roster.
4. ☐ **`.claude/handoff.md`** (top TWO entries — D273-D274 this thread + the D275 parallel product-card purge).
5. ☐ **`.claude/decisions.md` head** (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → **D275** at write time — re-verify).
6. ☐ **CLAUDE.md root-cause methodology rule 4a** (parity = computed values matched by CONTENT) + the draft `sites/mamas-munches/mockups/homepage/index.html`.
7. ☐ **The live canary** — `https://sandybrown-nightingale-600381.hostingersite.com/` (page 8; creds `.claude/secrets/sandybrown.env`).

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE — Spec 31 IN FULL (incl. FR-31-2.7/2.8) + both plans + handoff + D-ceiling + rule 4a + the draft? (Quote one specific thing to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; ceiling was **D275** — verify before any new D.) Is `converter/tests/test_extraction.py` still carrying uncommitted parallel-session modifications? (Reconcile before editing it.)
3. For the step I'm about to build: is it INLINE (architectural) or SOLO-SONNET (mechanical) per the EXECUTION plan? Is the mechanism UNIVERSAL on a DB signal (Rule 3)? Does it follow FR-31-2.8 (structural signature, additive emission, destination-parametric)?
4. Am I gating on the REAL page 8 (computed-parity matched by content, Bean eye) not emit-green (Rules 4/5, STOP-4/21/37/40)? Baselines: fallback=0 sections; parity 77/47/49/54.
5. Subagents: ONE solo coding subagent at a time, foreground, named files, spawn-no-agents; read-only reviewers/tracers may run parallel (STOP-39 refined 2026-07-04). I verify every subagent's edits + tests myself (STOP-16).

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward; do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, the raw artefacts.
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.**
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Grep the wiring + confirm it RUNS before claiming "enforced".
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints** (768/1024 vs 600/640/781).
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail** — read extract.json + trace.jsonl first; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column exists is necessary-not-sufficient; grep how it's WRITTEN and READ.
- **STOP-15 — A council/analysis finding is a HYPOTHESIS.** FACT-CHECK it against ground truth (file:line, DB rows) before acting. **EXTENDED 2026-07-04: when two raters DISAGREE, resolve by tracing yourself — never pick a verdict by authority. Five false rater/agent claims were caught in one session this way.**
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + gate `--check` YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`).
- **STOP-21 — LANDED-proven only by deploying the GENUINE emit to a live page + computed-style/innerText.** Recipe: `SGS_NEW_ENGINE=1 python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8 --skip-autonomy-gate` → anonymous chrome-devtools/Playwright. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **STOP-23 — Run a pre-commit `/qc-council` (or adversarial council) on the BUILT converter/block code** (blub 255). Verify input-class ≠ output-class; render.php reads the attr you write AND PAINTS the element you check.
- **STOP-24 — A DB change a reseed RE-DERIVES must use a reseed-surviving channel** (block.json / a dated migration / `sgs-update` seeder), never a manual DB edit.
- **STOP-26 — Read the WHOLE target spec section holistically before building.**
- **STOP-27 — A conservation/regression guard is `raise`, NEVER a bare `assert`** (`python -O` strips assert).
- **STOP-28 — Do NOT flip the PRODUCTION default to the new engine** until A2 (content ledger) is green (A1 RESOLVED 2026-07-04 — was a stale claim). `SGS_NEW_ENGINE=1` is the opt-in switch; the flip is EXECUTION Step 16, after Gate C only.
- **STOP-31 — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context; plant-test it.**
- **STOP-32 — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped"** (native supports→style.*, custom attrs, wrapper render, spec destination).
- **STOP-34 — SYNTHETIC-FIXTURE-GREEN ≠ REAL-DRAFT-CORRECT.** Reproduce on the FULL real draft.
- **STOP-35 — DEFAULT-IS-CONTAINER: a slug-None class-section defaults to `sgs/container` + recurse, it does NOT fail.**
- **STOP-37 — LANDED catches EMIT/SERIALISATION bugs unit tests structurally cannot.** Deploy + count rendered sections/items.
- **STOP-38 — A section-outer/wrapper fix scoped to ONE slug is an R-31-9 carve-out CHEAT.** Fire on a DB signal, never a slug literal.
- **STOP-39 (REFINED 2026-07-04) — PARALLEL coding subagents interfere/revert each other; a SOLO coding subagent is optimal.** ONE implementer at a time, foreground, named files, "do the work yourself, spawn no agents"; verify its edits + tests yourself. Read-only analysis/council/Explore agents may run in parallel.
- **STOP-40 — Don't declare a section "fixed" from seeing a grid + N items.** Check the RENDERED result vs the DRAFT's actual layout at 375/768/1440.
- **STOP-41 — the `no_slug_literal` gate guards `role`/`slot`/`canonical_slot` too, not just `block_slug`.** Any per-slot/per-role LITERAL comparison in a resolver body is a carve-out it blocks. (Widen its scope to `dispatch_table.py`/`orchestrator.py`/`walk.py` at Step 5 — `recognition.py` is ALREADY scanned.)
- **STOP-42 — PARITY = computed values matched by CONTENT, never source-declaration-diff, never wrapper-class-keying.** Use `parity/computed-parity.js` (Stage 11.6). Input-side drop-logs are NOT rendered fidelity.
- **STOP-43 — PROVE THE PREMISE ON THE REAL NODE, not code inference.** Before designing OR committing a converter fix, REPRODUCE by RUNNING the engine on the real draft node BEFORE + AFTER.
- **STOP-44 — A schema-valid, EMITTED converter attr can still be a RENDER no-op.** WP core doesn't reliably apply native supports for DYNAMIC blocks — verify the class/style paints on the LIVE element.
- **STOP-45 (NEW, 2026-07-04) — A "regenerated-from-ground-truth" doc is still a HYPOTHESIS.** The flow-doc agent claimed a module "does not exist" that convert.py lazy-loads (`:216-226`); a council rater claimed a gate scope one grep disproved. QC every regenerated/synthesised doc against the scripts, and fact-check the QC's own claims before acting on them.

---

## ORCHESTRATION PLAN — execute `.claude/plans/2026-07-04-converter-completion-EXECUTION.md` from Step 3

> The EXECUTION plan is the authoritative per-step detail (models, files, rules/cheats citations, tests, gates). Do NOT duplicate it here — this section is the entry sequence + session shape. Steps 1-2 are DONE (flow docs regenerated + FR-31-2.7/2.8 spec lock).

### Task 1 — Phase 2 core (EXECUTION Steps 3-8 → QA Gate A)
**What:** the modular universal walk — Ctx destination contract (Step 3, INLINE), monolith split (Step 4, SOLO-SONNET), walker + total registry (Step 5, INLINE), emit_shape wiring + fork deletion with the FULL guard keep-list (Step 6, INLINE — wire `content_attr_for_element` as the element→attr router), the ONE cascade / 2e2 (Step 7, INLINE — Bean's vital requirement), has_inner reader migration (Step 8, SOLO-SONNET).
**Why:** lands product-card (the D275 brick + `emit_shape` are waiting) + kills the lossy band-fold seams — the biggest CSS-parity lever (47-54% today).
**Orchestration:** inline for 3/5/6/7; ONE solo Sonnet at a time for 4/8 (prompts embed the plan's session-wide invariants block). Read-only reviewers at Gate A (parallel OK). ≥3 path-scoped commits (R-31-5).
**Acceptance (Gate A):** suites + cheat-gate green; product-card LANDS on page 8 (price 28px Fraunces, computed matched by content); fallback probe = 0; computed-parity ≥ baseline with CSS RISING; all 6 grids + bands unregressed; 2 read-only reviewers clean; Bean eye.

### Task 2 — Phases 3-4 (Steps 9-10 → QA Gate B)
db_lookup/icon_resolver extraction WITH the re-export shim (convert.py:37/:3612 depend on it), then relocate the entry + rewire ALL consumers (the verified list incl. the 4 importlib loaders). Gate B: both flag-states clone; whole-tree grep clean.

### Task 3 — Phase 5 (Steps 11-15 → QA Gate C)
A2 ledger (the last STOP-28 gate) · CSS resolver completeness · pseudo/F-ii passthrough channel · the 2 frozen passes + css_router D1 decision (it is a DEAD output — decide retire-or-rewire) · variant data + F3 oracle + metamorphic relations + F6. Gate C = the full parity gate + Bean eye.

### Task 4 — Phase 6 (Step 16)
Re-point the 2 dying cheat-gates → flip the default → delete `converter_v2` + shims + has_inner column → reseed → final council → LANDED → push.

### Dependency graph
```
Step 3 (inline) → Step 4 (solo) → Steps 5-7 (inline) → Step 8 (solo) → GATE A [HANDOFF-safe]
  → Step 9 (solo) → Step 10 (solo) → GATE B [HANDOFF-safe]
  → Steps 11-15 (mixed per plan) → GATE C [HANDOFF-safe]
  → Step 16 (inline) → final LANDED + push
```

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | only where the spec is genuinely silent (then write the answer INTO the spec) |
| `/gap-analysis` | grade outputs before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` | auto-routes if a defect needs external reference |
| `/strategic-plan` | NOT needed — the plan exists; re-plan only on a Bean scope change |
| `/systematic-debugging` | any unexpected failure — root-cause before fixing |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` | LANDED runs + DB ground truth |
| `/sgs-wp-engine` | block/theme surfaces (evidence gate) |
| `/qc-council` · `/qc-inline` | pre-commit multi-rater on BUILT code (STOP-23) — and FACT-CHECK the raters (STOP-15/45) |
| `/verify-loop` · `/handoff` · `/capture-lesson` | 2-attestation / session close |

## MCP Servers & Tools
| Tool | What for |
|------|----------|
| Playwright / chrome-devtools | LANDED proof on page 8 — computed-parity matched by CONTENT at 375/768/1440 (on "browser in use", switch to chrome-devtools MCP) |
| `python ~/.claude/hooks/wp-blocks.py dump` · `sgs-db.py sql "..."` | schema/DB ground truth BEFORE any "missing X" claim (STOP-11/R-31-8) |
| REST (Basic auth, `.claude/secrets/sandybrown.env`) | overwrite page 8 (the homepage) — never a new page (Rule 5) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| solo Sonnet coding subagent (general-purpose, foreground) | EXECUTION Steps 4, 8, 9, 10, 12, 15 — ONE at a time, named files, spawn-no-agents |
| `Explore` (read-only, parallel OK) | ground-truth tracing + gate reviewers |
| `wp-sgs-developer` | heavy block-dev if product-card needs block-side work beyond the converter |

## Methodology guardrails (do not skip)
- **Session-wide invariants** (from the EXECUTION plan header) go into EVERY subagent prompt verbatim: canonical test cwd + baselines (374 pass / cheat-gate 73-0), `convert.py` byte-identical until Step 16, raise-not-assert, no slug/slot/role literals, WRITTEN≠LANDED.
- **Deploy before measure** (STOP-21 recipe above) — any LANDED check requires the genuine emit deployed to page 8 first.
- **/qc-council before every commit** touching converter/block/theme (blub 255) — then fact-check the council (STOP-15/45).
- **Prove the premise on the real node** (STOP-43) before + after every converter change.
- Tests: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests cheat-gate/tests tests/test_converter_conformance.py -q --import-mode=importlib` (374 baseline; deletions need named justification). Cheat-gate: `python cheat-gate/run.py --check` exit 0. Branch `main`; verify D-ceiling; commits path-scoped (PowerShell piped `git commit -F -` for Write-tool files).
- Close at the NEAREST QA gate if context pressure hits — never push through degraded (gates leave main green + pushed).
