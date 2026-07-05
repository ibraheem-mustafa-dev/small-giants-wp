---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / POST-PROGRAMME QC (Bean-mandated, 2026-07-05)
generated: 2026-07-05
primary_goal: "THE MASSIVE QC SESSION: verify each of the 16 executed EXECUTION-plan steps against (1) Spec 31 alignment, (2) the 7 rules + R-31-1..15, (3) the known-cheat catalogue, (4) homepage-drop attribution (no step silently dropped draft items / none of the current drops trace to a step's work). Then QC the FULL SHAPE: the pipeline is the universal, draft-agnostic, DB-rooted design Bean specified, and the flow docs match reality."
---

# ⚡ NEXT SESSION — the MASSIVE QC of the executed converter-completion programme

Invoke `/autopilot` first. This is a `/qc` + spec-conformance VERIFICATION session, not a build session. The programme (Steps 3-16, D274/D276) is EXECUTED and pushed; your job is to prove — or disprove — that every step is what it claims to be. **Assume nothing; fact-check everything against ground truth (8 false agent/rater claims were caught by tracing in the build session alone).**

**Agent identity.** You are the SGS pipeline QC auditor. Your ground truths: Spec 31 (read IN FULL), the 18 programme commits `c85254db..c8690345` (each commit message states its claims — those claims are your per-step audit checklist), the A2 baseline (`ledger/content-coverage-baseline.json`), the live page 8, and the draft `sites/mamas-munches/mockups/homepage/index.html`.

**State recap (plain English).** The new modular converter is now the ONLY engine (frozen tree deleted, flag gone, has_inner column dropped). Honest parity: content 90% / CSS 67-69-76 (the parity instrument itself was de-polluted twice — pre-2026-07-05 numbers are non-comparable). Tracked residuals: product-card CTA text/link, packSizes pills, 3 image alt texts (all A2-baselined + parked as P-GATE-A-CARD-RESIDUALS). 744 tests + all gates green.

---

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS, **no hand-declared per-block/per-draft selectors**, **no client copy baked into a base block**, **no per-slug/per-slot/per-role literal in a resolver body**. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix fires for every qualifying block/case; over-broad universality is ALSO a break. Universal signal = a DB fact, never `if slug == X`.
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone at 375/768/1440. Emit-green ≠ LANDED. WRITTEN ≠ LANDED. "Deploy to homepage" = overwrite page 8, never a new page.
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **FOLLOW THE SPEC IN EVERY DETAIL** — Spec 31 is the settled authority. Where silent, pin the smallest spec-consistent rule and write it INTO the spec.

## Mandatory READING

⛔⛔ Verify against ground truth, never guess; read WHOLE docs, not greps. Tick each in your first message:
1. ☐ **`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — READ IN FULL, END TO END** (Bean directive; STOP-26). NOTE: its §12 build-state prose predates Step 16 (frozen-engine references are historical) — updating it is Task 3 of this session.
2. ☐ **The 18 programme commits:** `git log --format='%h %s' c85254db^..c8690345` + read each commit's full message (`git show -s`) — the messages state each step's claims; they ARE your audit checklist.
3. ☐ **`.claude/plans/2026-07-04-converter-completion-EXECUTION.md`** (the 16-step plan — per-step rules/cheats citations + acceptance) + **`2026-07-04-new-engine-to-parity-delete-converter-v2.md`** (the requirements register).
4. ☐ **`.claude/handoff.md`** top entry (D276) + **`.claude/decisions.md` head** (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — was **D276** at write time).
5. ☐ **`ledger/content-coverage-baseline.json`** (the A2 baseline — every accepted drop, named) + **`.claude/parking.md`** P-GATE-A-CARD-RESIDUALS.
6. ☐ **CLAUDE.md root-cause methodology rule 4a** + the draft `sites/mamas-munches/mockups/homepage/index.html`.
7. ☐ **The live canary** — `https://sandybrown-nightingale-600381.hostingersite.com/` (page 8; creds `.claude/secrets/sandybrown.env`).

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE — Spec 31 IN FULL + the 15 commit messages + both plans + handoff + D-ceiling + the A2 baseline + the draft? (Quote one specific thing to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; ceiling was **D276** — verify before any new D.) Is the working tree clean?
3. For the QC I'm about to run: am I verifying against GROUND TRUTH (file:line, DB rows, live computed style) — never against a commit message's own claim, a doc summary, or an agent's report?
4. Am I gating on the REAL page 8 (computed-parity matched by content, Bean eye) — baselines: content 90% / CSS 67-69-76 / 8 baselined drops?
5. Subagents: read-only raters/tracers may run PARALLEL; any FIX work = ONE solo coding subagent at a time, foreground, named files, spawn-no-agents; I verify every subagent's edits + tests myself (STOP-16).

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward; do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, the raw artefacts.
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.**
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Grep the wiring + confirm it RUNS before claiming "enforced".
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints** (768/1024 vs 600/640/781).
- **STOP-10 — Empty cloned section = usually a soft-fail** — read extract.json + trace.jsonl first; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column exists is necessary-not-sufficient; grep how it's WRITTEN and READ.
- **STOP-15 — A council/analysis finding is a HYPOTHESIS.** FACT-CHECK it against ground truth before acting. When two raters DISAGREE, resolve by tracing yourself — never pick a verdict by authority.
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + gates YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`).
- **STOP-21 — LANDED-proven only by deploying the GENUINE emit to a live page + computed-style/innerText.** Recipe: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8 --skip-autonomy-gate` (NO env flag — the flag died at Step 16) → anonymous chrome-devtools/Playwright. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **STOP-23 — Run a pre-commit `/qc-council` (or adversarial council) on BUILT converter/block code** (blub 255). Verify input-class ≠ output-class; render.php reads the attr you write AND PAINTS the element you check.
- **STOP-24 — A DB change a reseed RE-DERIVES must use a reseed-surviving channel** (block.json / a dated migration / `sgs-update` seeder), never a manual DB edit.
- **STOP-26 — Read the WHOLE target spec section holistically before building.**
- **STOP-27 — A conservation/regression guard is `raise`, NEVER a bare `assert`.**
- **STOP-28 — (UPDATED at Step 16, recorded justification: the flip EXECUTED per the D274 plan after Gates A/B/C + Bean sign-off.)** The production default IS the new engine; there is no fallback to gate. The surviving discipline: entry.py's failure contract is LOUD (`status:'failed'` + reason) — never re-add a silent fallback or a silent empty 'complete'.
- **STOP-31 — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context; plant-test it.**
- **STOP-32 — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped"** (native supports→style.*, custom attrs, wrapper render, spec destination — plus now the D2 passthrough channel: a FIFTH surface for pseudo/non-device rules).
- **STOP-34 — SYNTHETIC-FIXTURE-GREEN ≠ REAL-DRAFT-CORRECT.** Reproduce on the FULL real draft.
- **STOP-35 — DEFAULT-IS-CONTAINER: a slug-None class-section defaults to `sgs/container` + recurse; it does NOT fail.**
- **STOP-37 — LANDED catches EMIT/SERIALISATION bugs unit tests structurally cannot.** Deploy + count rendered sections/items.
- **STOP-38 — A section-outer/wrapper fix scoped to ONE slug is an R-31-9 carve-out CHEAT.** Fire on a DB signal, never a slug literal.
- **STOP-39 — PARALLEL coding subagents interfere/revert each other; a SOLO coding subagent is optimal.** ONE implementer at a time, foreground, named files, "do the work yourself, spawn no agents"; read-only analysis/council/Explore agents may run in parallel.
- **STOP-40 — Don't declare a section "fixed" from seeing a grid + N items.** Check the RENDERED result vs the DRAFT's actual layout at 375/768/1440.
- **STOP-41 — the `no_slug_literal` gate guards `role`/`slot`/`canonical_slot` too, not just `block_slug`.** Scope now includes `dispatch_table.py`/`orchestrator.py`/`walk.py`/`recognition.py` (widened Step 5).
- **STOP-42 — PARITY = computed values matched by CONTENT, never source-declaration-diff, never wrapper-class-keying.** Use `parity/computed-parity.js` (Stage 11.6). Input-side drop-logs are NOT rendered fidelity.
- **STOP-43 — PROVE THE PREMISE ON THE REAL NODE, not code inference.** Before designing OR committing a converter fix, REPRODUCE by RUNNING the engine on the real draft node BEFORE + AFTER.
- **STOP-44 — A schema-valid, EMITTED converter attr can still be a RENDER no-op.** Verify the class/style paints on the LIVE element.
- **STOP-45 — A "regenerated-from-ground-truth" doc is still a HYPOTHESIS.** QC every regenerated/synthesised doc against the scripts, and fact-check the QC's own claims before acting on them.
- **STOP-46 (NEW, 2026-07-05) — An in-code allowlist duplicating a DB fact is the R-31-1 drift pattern one level up.** "Which properties/attrs/blocks are in scope" must be a (cached) DB membership query (`css_property_has_suffix_row` precedent), never a frozenset that a migration then has to chase. Bean-caught at Step 12.
- **STOP-47 (NEW, 2026-07-05) — `git stash` proves NOTHING about DB-state-dependent behaviour.** A gate/tool whose vocabulary is DB-derived can only be proven "pre-existing failure" by isolating the DB state. A subagent's stash-based "clean tree" proof is invalid when its own migrations mutated the DB.
- **STOP-48 (NEW, 2026-07-05) — A "dead output" claim is SCOPE-RELATIVE.** css_router's d1 payload was dead to the ENGINE but live to the F5 LEDGER — the structural gate blocked the wrong retirement at commit time, exactly as designed. Before retiring any output, grep ALL consumers (engine + gates + ledgers + tooling), not just the primary reader.
- **STOP-49 (NEW, 2026-07-05) — The MEASUREMENT INSTRUMENT is itself QC-able code.** The parity tool understated content by 13 points (chrome/title/drive-prefix leaks) and CSS by ~11 (inline-wrapper anchor mis-pairing). When a number contradicts the eye or the A2 ledger, audit the instrument's element collection + pairing BEFORE trusting the number (extends measurement-vs-eye + rule 4a).

---

## ORCHESTRATION PLAN — the QC session

### Task 1 — Per-step QC of all 16 steps (the core; Bean's 4 checks per step)
**What:** for each programme step (3-16; steps 1-2 were flow-docs + spec-lock — include them in the doc pass of Task 2), verify: (1) the built code aligns with the Spec 31 sections the step's commit cites; (2) it follows the 7 rules + R-31-1..15; (3) it matches NO known cheat (walk the cheat-gate check catalogue + Spec 31 §7a + the 7-rules cheat list against the step's diff); (4) drop attribution — none of the CURRENT homepage drops (the A2 baseline's 8) is caused by that step, and the step didn't silently drop draft items it was responsible for (diff the step's emit-scope against the draft; the A2 ledger + `git show <hash>` are your instruments).
**Why:** the build session shipped 15 commits at speed with solo subagents; 8 false claims were caught DURING the build — the QC proves nothing else slipped through.
**Orchestration:** parallel READ-ONLY raters are ideal here — dispatch one rater per phase (Phase 2 = Steps 3-8; Phases 3-4 = Steps 9-10; Phase 5 = Steps 11-15; Phase 6 = Step 16), each with: the commits' diffs, the Spec 31 sections cited, the cheat catalogue, and the A2 baseline. THEN fact-check every rater finding yourself by tracing (STOP-15) before accepting it. Model: sonnet raters, opus synthesis.
**Acceptance:** a per-step verdict table (step | spec-aligned | rules | cheats | drop-attribution | evidence file:line) with EVERY negative finding traced to ground truth and either fixed (solo subagent, one at a time) or parked with a named owner-stage. No verdict accepted on a rater's word alone.

### Task 2 — Full-shape QC (universal / draft-agnostic / DB-rooted / flow-match)
**What:** verify the WHOLE pipeline shape against Bean's design intent: (a) UNIVERSAL — no per-block/per-draft behaviour anywhere in converter/ (registry predicates, resolvers, walk legs — the gates prove absence of literals but NOT absence of shape-carve-outs; audit the predicates); (b) DRAFT-AGNOSTIC — the metamorphic relations (source-order/BEM-synonym/px-scale) pass and genuinely exercise the claim; run them + extend where thin; (c) DB-ROOTED — every routing decision traces to a DB fact (walk the walk.py signature fields, dispatch_table, content_attr_for_element, css_property_has_suffix_row); (d) FLOW-MATCH — `cloning-pipeline-flow.md` + `-stages.md` + Spec 31 §12 still describe reality post-deletion (they predate Step 16 — update them, citing file:line per stage, then QC the update per STOP-45).
**Orchestration:** (a)-(c) = read-only tracers in parallel; (d) = one solo subagent regenerating the flow docs + main-session QC.
**Acceptance:** a shape-verdict with evidence; flow docs regenerated + QC'd; Spec 31 §12 build-state prose updated to post-Step-16 reality.

### Task 3 — Residual close-out (per QC findings)
**What:** the A2-baselined residuals — card CTA text/url (FR-31-2 identity-anchored lift), packSizes (array_item_schema), imageAlt (block-side attr + converter lift) — plus whatever Task 1/2 surfaces. Also: decide the new conformance golden baseline (the frozen-specific goldens died at Step 16; re-seed WITH LANDED proof attached, never from emit alone), and the assembly.py boolean-align latent TypeError.
**Orchestration:** design inline; mechanical builds = solo Sonnet, one at a time; every fix ends with the STOP-21 deploy + computed check + an A2 re-baseline that SHRINKS.
**Acceptance:** each closed residual = its A2 baseline entry removed + the live element computed-verified; parity content ≥ 90 rising.

### Dependency graph
```
Task 1 (4 parallel read-only raters → main-session fact-check of every finding)
  ↓ (findings feed)
Task 2 (3 parallel tracers + 1 solo doc subagent)
  ↓ /qc-council on any fix-shapes BEFORE building (R-31-7)
Task 3 (solo fixes, one at a time, LANDED-gated each)
  ↓ commit + push per fix (path-scoped), /handoff at close
```

## Skills to Invoke
| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS INCLUDE — only where the spec is genuinely silent (then write the answer INTO the spec) |
| `/gap-analysis` | ALWAYS INCLUDE — grade the QC outputs before delivery |
| `/lifecycle` | ALWAYS INCLUDE — before any skill/agent/pipeline change |
| `/research` | ALWAYS INCLUDE — auto-routes if a defect needs external reference |
| `/strategic-plan` | ALWAYS INCLUDE — NOT needed unless Bean changes scope; the QC plan above is the plan |
| `/qc` · `/qc-council` · `/qc-inline` | THE session's core — multi-rater on built code; fact-check the raters (STOP-15/45) |
| `/systematic-debugging` | any defect found — root-cause before fixing |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` | LANDED runs + DB ground truth (STOP-11/R-31-8) |
| `/verify-loop` · `/handoff` · `/capture-lesson` | 2-attestation / session close |

## Tool bindings (MCP servers & tools)
| Tool | What for |
|------|----------|
| Playwright / chrome-devtools | LANDED proof on page 8 — computed values matched by CONTENT at 375/768/1440 |
| `python ~/.claude/hooks/wp-blocks.py dump` · `sgs-db.py sql "..."` | schema/DB ground truth BEFORE any "missing X" claim |
| `node.exe plugins/sgs-blocks/scripts/parity/computed-parity.js` | the honest parity instrument (use `node.exe` — the bash `node` shim breaks) |
| REST (Basic auth, `.claude/secrets/sandybrown.env`) | overwrite page 8 — never a new page |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `Explore` (read-only, parallel OK) | the per-phase QC raters + shape tracers |
| solo Sonnet coding subagent (general-purpose, foreground) | Task-3 fixes — ONE at a time, named files, spawn-no-agents |
| `wp-sgs-developer` | block-side work (imageAlt attr) beyond the converter |

## First action

Complete the Mandatory READING gate + the pre-flight ritual (answers in your first message), then dispatch Task 1's four read-only phase raters in parallel. Smallest first action: `git log --format='%h %s' c85254db^..c8690345` (under 1 minute, zero dependencies).

## Methodology guardrails (do not skip)
- Tests from the CANONICAL cwd `plugins/sgs-blocks/scripts`: `python -m pytest orchestrator/test_css_router.py converter/tests cheat-gate/tests tests/test_converter_conformance.py ledger/tests -q --import-mode=importlib` (744 baseline; deletions need named justification). Gates: `python cheat-gate/run.py --check` + `converter/gates/no_slug_literal.py --check` + `converter/gates/import_ban.py --check` all exit 0.
- **Deploy before measure** (STOP-21, flag-free recipe above) — any LANDED check requires the genuine emit deployed to page 8 first.
- **/qc-council before every commit** touching converter/block/theme (blub 255) — then fact-check the council (STOP-15/45).
- **Prove the premise on the real node** (STOP-43) before + after every converter change.
- Branch `main`; verify D-ceiling; commits path-scoped (PowerShell piped `git commit -F -` for Write-tool files).
- Close at a natural QC boundary if context pressure hits — main stays green + pushed after every fix.
