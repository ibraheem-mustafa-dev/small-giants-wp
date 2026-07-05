---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / 6-RESIDUAL FACT-FIRST INVESTIGATION (Bean-directed at the D279 close, 2026-07-05)
generated: 2026-07-05
primary_goal: "Investigate + DISCUSS the true causes and spec-aligned solutions for the 6 residuals (heading level / maxWidth serialiser / button padding channel + presets / trust-bar label lift / multi-button responsive / the D2 inline style block) using ONLY facts. Discuss with Bean BEFORE fixing (explain-agree-clear). Bean D2 doctrine: the page must never DEPEND on non-block-settings CSS - D2 is acceptable only as a drops/debug log, deleted by an end-gate at 100 percent parity."
---

# NEXT SESSION - the 6-RESIDUAL fact-first investigation (Bean-directed)

Invoke /autopilot first. The D279 fix wave shipped 9 commits (honest parity content 96 / CSS 77-78-80, A2 4 keys). Bean set this session's shape: **investigate the 6 residuals fact-first, present true causes + spec-aligned solution options, agree with Bean, THEN fix.** Assume nothing; 3 more false/imprecise agent claims were caught by tracing this session.

**Agent identity.** You are the SGS pipeline diagnostician-fixer: you produce fact-based cause analyses + spec-aligned solution menus for Bean to pick from, then clear agreed items same-session.

**State recap (plain English).** The modular converter is QC-verified; the D278/D279 waves cleared the register's 12 cause groups except these residuals. Live baselines: content 96 / CSS 77-78-80 / unmatched 7 / A2 4 keys (skip-link + 3 pills) / 806+13 tests / cheat-gate 33 baselined. Ground truths: Spec 31 (READ IN FULL), .claude/reports/2026-07-05-defect-register-cause-groups.md (register + resolution table), .claude/handoff.md D279 entry, the draft sites/mamas-munches/mockups/homepage/index.html, live page 8.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS, **no hand-declared per-block/per-draft selectors**, **no client copy baked into a base block**, **no per-slug/per-slot/per-role literal in a resolver body**. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix fires for every qualifying block/case; over-broad universality is ALSO a break. Universal signal = a DB fact, never `if slug == X`.
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone at 375/768/1440. Emit-green ≠ LANDED. WRITTEN ≠ LANDED. "Deploy to homepage" = overwrite page 8, never a new page.
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **FOLLOW THE SPEC IN EVERY DETAIL** — Spec 31 is the settled authority. Where silent, pin the smallest spec-consistent rule and write it INTO the spec.

## Mandatory READING

Tick each in your first message; verify against ground truth, never guess; read WHOLE docs:
1. [ ] .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md - READ IN FULL, END TO END (Bean directive; STOP-26).
2. [ ] .claude/handoff.md top entry (D279) + .claude/decisions.md head (verify D-ceiling: grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1 - was D279 at write time).
3. [ ] .claude/reports/2026-07-05-defect-register-cause-groups.md - the register, cause groups, RESOLUTION TABLE + the 6 residuals.
4. [ ] .claude/parking.md (P-GATE-A-CARD-RESIDUALS + open entries) + ledger/content-coverage-baseline.json (4 keys).
5. [ ] .claude/HTML_Insert.html (Bean's paste of the D2 style block) + the draft sites/mamas-munches/mockups/homepage/index.html.
6. [ ] CLAUDE.md root-cause methodology rule 4a + the live canary page 8 (creds .claude/secrets/sandybrown.env).

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE - Spec 31 IN FULL + handoff + D-ceiling + the resolution report + the D2 paste? (Quote one specific thing to prove it.)
2. What branch + D-ceiling? (git branch --show-current -> main; ceiling was D279 - verify before any new D.) Is the working tree clean?
3. For every fix I build: premise proven on the REAL draft node BEFORE and AFTER (STOP-43), gated on the REAL page 8 (computed values matched by content + Bean eye), never on emit alone?
4. Baselines I must not regress: content 96 / CSS 77-78-80 / A2 = 4 keys (each content fix must SHRINK it); 806+13 tests; cheat-gate 33 baselined 0 NEW.
5. Subagents: read-only raters/tracers parallel OK; FIX work = ONE solo coding subagent at a time, foreground, named files, spawn-no-agents; I verify every subagent's edits + tests myself (STOP-16).

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward; do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, the raw artefacts.
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.**
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Grep the wiring + confirm it RUNS before claiming "enforced". (Live example: the f5-commit-gate's content check fail-safes GREEN without `--draft` — P-QC-A2-COMMIT-GATE-NOOP.)
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints** (768/1024 vs 600/640/781).
- **STOP-10 — Empty cloned section = usually a soft-fail** — read extract.json + trace.jsonl first; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column exists is necessary-not-sufficient; grep how it's WRITTEN and READ.
- **STOP-15 — A council/analysis finding is a HYPOTHESIS.** FACT-CHECK it against ground truth before acting. When two raters DISAGREE, resolve by tracing yourself — never pick a verdict by authority. (9 false claims across the last two sessions, all caught by tracing.)
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + gates YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`).
- **STOP-21 — LANDED-proven only by deploying the GENUINE emit to a live page + computed-style/innerText.** Recipe: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8 --skip-autonomy-gate` → anonymous chrome-devtools/Playwright. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **STOP-23 — Run a pre-commit `/qc-council` (or 2-rater review) on BUILT converter/block code** (blub 255). Verify input-class ≠ output-class; render.php reads the attr you write AND PAINTS the element you check.
- **STOP-24 — A DB change a reseed RE-DERIVES must use a reseed-surviving channel** (block.json / a dated migration / `sgs-update` seeder), never a manual DB edit.
- **STOP-26 — Read the WHOLE target spec section holistically before building.**
- **STOP-27 — A conservation/regression guard is `raise`, NEVER a bare `assert`.**
- **STOP-28 (post-Step-16 form) — entry.py's failure contract is LOUD** (`status:'failed'` + reason, now also LOUD at the orchestrator caller per the D277 fix) — never re-add a silent fallback or a silent empty 'complete'.
- **STOP-31 — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context; plant-test it.**
- **STOP-32 — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped"** (native supports→style.*, custom attrs, wrapper render, spec destination — plus the D2 passthrough channel as a FIFTH surface for pseudo/non-device rules).
- **STOP-34 — SYNTHETIC-FIXTURE-GREEN ≠ REAL-DRAFT-CORRECT.** Reproduce on the FULL real draft. (Live example: the metamorphic relations are synthetic-only — P-QC-METAMORPHIC-REAL-DRAFT.)
- **STOP-35 — DEFAULT-IS-CONTAINER: a slug-None class-section defaults to `sgs/container` + recurse; it does NOT fail.**
- **STOP-37 — LANDED catches EMIT/SERIALISATION bugs unit tests structurally cannot.** Deploy + count rendered sections/items.
- **STOP-38 — A section-outer/wrapper fix scoped to ONE slug is an R-31-9 carve-out CHEAT.** Fire on a DB signal, never a slug literal.
- **STOP-39 — PARALLEL coding subagents interfere/revert each other; a SOLO coding subagent is optimal.** ONE implementer at a time, foreground, named files, "do the work yourself, spawn no agents"; read-only analysis/council/Explore agents may run in parallel.
- **STOP-40 — Don't declare a section "fixed" from seeing a grid + N items.** Check the RENDERED result vs the DRAFT's actual layout at 375/768/1440.
- **STOP-41 — the `no_slug_literal` gate guards `role`/`slot`/`canonical_slot` AND (since D277) `mod`/`_mod`/`modifier` too.** Scope: dispatch_table.py/orchestrator.py/walk.py/recognition.py + resolvers/ + services/ dirs.
- **STOP-42 — PARITY = computed values matched by CONTENT, never source-declaration-diff, never wrapper-class-keying.** Use `parity/computed-parity.js` (Stage 11.6). Input-side drop-logs are NOT rendered fidelity.
- **STOP-43 — PROVE THE PREMISE ON THE REAL NODE, not code inference.** Before designing OR committing a converter fix, REPRODUCE by RUNNING the engine on the real draft node BEFORE + AFTER.
- **STOP-44 — A schema-valid, EMITTED converter attr can still be a RENDER no-op.** Verify the class/style paints on the LIVE element.
- **STOP-45 — A "regenerated-from-ground-truth" doc is still a HYPOTHESIS.** QC every regenerated/synthesised doc against the scripts, and fact-check the QC's own claims before acting on them.
- **STOP-46 — An in-code allowlist duplicating a DB fact is the R-31-1 drift pattern one level up.** "Which properties/attrs/blocks/ROLES are in scope" must be a (cached) DB membership query — never a frozenset/tuple a migration then has to chase. (D277 live example: the `content_attr_for_element` role tuple had drifted, excluding link-href.)
- **STOP-47 — `git stash` proves NOTHING about DB-state-dependent behaviour.** A gate/tool whose vocabulary is DB-derived can only be proven "pre-existing failure" by isolating the DB state.
- **STOP-48 — A "dead output" claim is SCOPE-RELATIVE.** Before retiring any output/function, grep ALL consumers (engine + gates + ledgers + tooling), not just the primary reader.
- **STOP-49 — The MEASUREMENT INSTRUMENT is itself QC-able code.** When a number contradicts the eye or the A2 ledger, audit the instrument's element collection + pairing BEFORE trusting the number. **A2-specific (D277):** the content-coverage check's canonical `--markup` input is the LIVE PAGE SOURCE (curl page 8), never the raw stage-4 emit — JSON-escaped attr values false-fail array content against the emit.
- **STOP-50 (NEW, D277) — A cheat can evade a gate by SHAPE, and a gate's identifier/scope vocabulary is a blind-spot surface.** The 'ghost' branch's own comment admitted using a bare `if` so the dict-literal detector couldn't flag it — and it was invisible to no_slug_literal because a BEM modifier wasn't a tracked ident. When hunting cheats: grep code comments for gate names (self-documented evasions exist), and audit each gate's ident set + scan scope as attack surface, not just its positive matches.
- **STOP-51 (NEW, D279) - A #uid-scoped rule is DEAD unless the element actually carries the id.** The Pattern-A migration emitted #sgs-text-xxx rules while the element's id attachment was still gated on an operator anchor - every scoped base value silently no-opped (caught LIVE, not by tests). When scoping by id/class, verify the LIVE element carries the hook attribute.
- **STOP-52 (NEW, D279, Bean doctrine) - The page must NEVER DEPEND on non-block-settings CSS emitted by the pipeline.** Everything a client can set in block settings must BE in block settings; a D2-scoped rule the page depends on is an extreme hardcoding cheat. D2 may exist ONLY as a transfer-visibility/debug log, deleted (or not inserted) by an end-gate when the page hits 100 percent content+CSS parity.


---

## ORCHESTRATION PLAN (Bean-directed: investigate -> discuss -> agree -> fix)

### Task 1 - D2 inline style block: full fact enumeration (the big one)
**What:** parse the live D2 block (variation-d0-d2.css / the page 8 style#sgs-cv2-page-css) rule by rule. For EVERY rule: (a) which element(s) it paints on the live page (computed-style proof, not selector reading); (b) does a block-setting destination EXIST (block_attributes/native supports - four-channel check STOP-32); (c) why css_router routed it D2 not D1 (classification trace); (d) bucket: should-be-D1-lift | genuine-gap-needs-attr | draft-convention | debug-only. Output = a disposition table Bean reads.
**Why:** Bean doctrine (STOP-52): load-bearing D2 = cheat. The fix design (lift-everything + end-gate deletion at 100 percent parity + fix the lying "not a deploy artefact" header comment) follows the facts.
**Orchestration:** parallel read-only tracers per D2 rule-family (sonnet) + main-session fact-check; NO fixes before Bean agreement; /qc-council on resulting fix-shapes.
**Acceptance:** every D2 rule bucketed with file:line/DB/computed evidence; Bean has the table.

### Task 2 - Heading level (zero h1 on the page)
**What:** trace where recognition knows the source tag (atomic_tag_map h1->sgs/heading), where that fact dies, and what should write the block's level attr (render.php:94 defaults h2). Spec check: R-31-2 tag-is-shape. Propose the spec-aligned write + verify the editor level control.
**Acceptance:** cause traced + solution agreed; if built: page 8 has exactly one h1 (hero), h3/h4 real levels, LANDED.

### Task 3 - CG-4 maxWidth serialiser
**What:** value_serialise.py ignores attr_type (documented stub). Confirm blast radius (which attrs/types flow through - DB query), design type-aware serialisation (number -> bare numeric + Unit companion; string -> literal), STOP-43 emit-diff.
**Acceptance:** hero sub 420px / intro 540px / disclaimer 620px cap live at 1440; no other emit changes.

### Task 4 - Button padding channel + preset build-out
**What:** trace why lifted paddings land on the wrapper (WP style channel) vs the block's flat attrs; decide the ONE channel per Bean's block-settings doctrine; build out the barebones presets (primary/secondary/outline full definitions). Preset-sync itself is design-gated at .claude/plans/2026-07-05-preset-sync-design.md - ask Bean before building it.
**Acceptance:** find-out-more renders draft-exact (6px 0 padding); presets complete; controls visible in editor.

### Task 5 - Trust-bar label lift
**What:** the exposed labelFontSize attr exists; the converter never lifts the draft's 13px into it. Trace which lift path owns a composite's own-element typography (scalar-styling-lift capability - only testimonial has it today: does trust-bar need the capability row, or a different path?).
**Acceptance:** label computes 13px at 375/768 live (draft-exact), via a client-editable attr.

### Task 6 - CG-5-D multi-button responsive (Bean-held - investigate only until agreed)
**What:** confirm the two-collection-path hypothesis with facts (arrangement layout_attrs collects its own decls vs the partitioned stream; tier sampling absent for flex props). Present the spec-aligned unification (FR-31-2.8 point 4: EVERY node's full stream through the SAME cascade).
**Acceptance:** cause proven on the real hero ctas node; solution agreed with Bean before any build.

### Dependency graph
Task 1 (parallel tracers) -> Bean discussion gate -> agreed fixes (solo agents, sequential).
Tasks 2-6 investigations run parallel (read-only) alongside Task 1; ALL fixes wait for the discussion.
End of session if scope allows: option-picker design discussion (pills/packSizes).

## Skills to Invoke
| Skill | When to use |
|-------|-------------|
| /brainstorming | ALWAYS INCLUDE - the D2 end-state + channel designs are design decisions |
| /gap-analysis | ALWAYS INCLUDE - grade outputs before delivery |
| /lifecycle | ALWAYS INCLUDE - before any skill/agent/pipeline change |
| /research | ALWAYS INCLUDE - auto-routes if a residual needs external reference |
| /strategic-plan | ALWAYS INCLUDE - only if Bean changes scope |
| /qc-council | fix-shape validation BEFORE building (R-31-7) + pre-commit review (blub 255) |
| /systematic-debugging | THE per-residual protocol - cause proven before fix |
| /dispatching-parallel-agents | the read-only tracer fan-outs |
| /sgs-clone /sgs-db /wp-blocks | LANDED runs + DB ground truth (STOP-11/R-31-8) |
| /verify-loop /handoff /capture-lesson | 2-attestation / session close |

## Tool bindings (MCP servers & tools)
| Tool | What for |
|------|----------|
| Playwright / chrome-devtools | LANDED proof on page 8 - computed values matched by CONTENT at 375/768/1440 |
| python ~/.claude/hooks/wp-blocks.py dump + sgs-db.py sql | schema/DB ground truth BEFORE any missing-X claim |
| node.exe plugins/sgs-blocks/scripts/parity/computed-parity.js | the honest parity instrument (fixed 2026-07-05; pre/post numbers NOT comparable) |
| ledger/content_coverage_check.py --check --draft <draft> --markup <LIVE page source> | A2 accounting - markup = curl'd live page 8, NEVER the raw emit (STOP-49) |
| python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown | plugin/theme deploy (render.php changes need this BEFORE measuring - STOP-21) |
| python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client mamas-munches --target sandybrown --target-domain sandybrown-nightingale-600381.hostingersite.com --yes | per-client snapshot deploy |

## Agents to Delegate To
| Agent | When |
|-------|------|
| Explore (read-only, parallel OK) | Task 1-6 investigations, tracers, pre-commit raters |
| solo Sonnet coding subagent (general-purpose, foreground) | agreed fixes - ONE at a time, named files, spawn-no-agents |
| wp-sgs-developer | block-side work (heading level control, preset build-out) |

## First action
Complete the Mandatory READING gate + the pre-flight ritual (answers in your first message), then Task 1's D2 enumeration. Smallest first action: grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1 (under 1 minute, zero dependencies).

## Methodology guardrails (do not skip)
- Tests from the CANONICAL cwd plugins/sgs-blocks/scripts: python -m pytest orchestrator/test_css_router.py converter/tests cheat-gate/tests tests/test_converter_conformance.py ledger/tests -q --import-mode=importlib (806 baseline + 13 orchestrator) + gates: cheat-gate/run.py --check + no_slug_literal + import_ban + check_raw_sqlite all exit 0.
- Deploy before measure (STOP-21): render.php/theme changes require build-deploy + snapshot push BEFORE any live check.
- /qc-council (or 2-rater review) before every commit touching converter/block/theme (blub 255) - then fact-check the council (STOP-15/45).
- Prove the premise on the real node (STOP-43) before + after every converter change; emit-diff the FULL draft per fix.
- Every A2 re-baseline must SHRINK; parity baselines content 96 / CSS 77-78-80 must not regress.
- Branch main; verify D-ceiling (D279); commits path-scoped (PowerShell piped git commit -F -); push after every green fix.
- Discussion gate: NO residual fix ships before Bean has agreed its cause + solution (the explain-agree-clear pattern).
