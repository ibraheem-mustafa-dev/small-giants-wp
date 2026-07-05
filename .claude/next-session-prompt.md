---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / ROOT-CAUSE DIAGNOSIS SESSION (Bean-directed at the D278 close, 2026-07-05)
generated: 2026-07-05
primary_goal: "Bean-directed flow: fresh /sgs-clone run FIRST -> enumerate EVERY drop and mismatch (content + CSS, element+property level) into one register -> parallel root-cause investigation (/dispatching-parallel-agents + /systematic-debugging + /sgs-wp-engine) -> GROUP the register by root cause -> present the cause-groups to Bean for agreement BEFORE fixing (the D278 explain-agree-clear pattern)."
---

# ⚡ NEXT SESSION — the ROOT-CAUSE DIAGNOSIS run (Bean-directed)

Invoke `/autopilot` first. The QC arc is fully closed (D277+D278). Bean set this session's shape at the close: **run a fresh clone first, list EVERY drop and mistake, root-cause each one, and group them by cause — agree the groups with Bean before fixing anything** (the explain→agree→clear pattern that worked at D278). **Assume nothing; fact-check everything against ground truth (9 false agent/rater claims caught by tracing across the last two sessions).**

**Agent identity.** You are the SGS pipeline diagnostician: you produce the definitive, cause-grouped register of every remaining draft→clone drop and mismatch, evidence-cited, for Bean to agree fixes against. Ground truths: Spec 31 (read IN FULL), the A2 baseline (`ledger/content-coverage-baseline.json`, 5 keys), the live page 8, the draft `sites/mamas-munches/mockups/homepage/index.html`, and `.claude/parking.md` (P-GATE-A-CARD-RESIDUALS + the P-QC-* register).

**State recap (plain English).** The modular `converter/` engine is the only converter and is QC-verified universal + DB-rooted. Honest parity: content 90% / CSS 67-69-76. The 5 remaining A2-baselined content drops: 3 product-card pack-size pills, the card CTA text ("Add to Cart — £10"), and the skip-link (chrome, permanent). The CTA's link also drops. Root causes are known: the element→attr resolver returns ONE best match per element (a CTA needs text AND href lifted); pills are array-owned but have no `array_item_schema` items schema; string image attrs drop alt text.

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
1. ☐ **`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — READ IN FULL, END TO END** (Bean directive; STOP-26). §12 build-state is now CURRENT (regenerated D277). §13.3 FR-31-2/2.1/2.2/2.5/2.6 is the content-fork architecture this session extends.
2. ☐ **`.claude/handoff.md` top entry (D277)** + **`.claude/decisions.md` head** (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — was **D278** at write time).
3. ☐ **`.claude/parking.md`** — P-GATE-A-CARD-RESIDUALS (the residuals + what the QC already fixed) + P-STYLESHEET-DEFAULTS (ALL 8 P-QC-* entries were CLEARED at D278 — archived with outcomes).
4. ☐ **`ledger/content-coverage-baseline.json`** (5 keys — every accepted drop, named) + the QC fix sites: `converter/walk.py:210-315` (the two nested legs + child leg + leaf fallback), `converter/db/db_lookup.py` `content_attr_for_element` (the single-winner ranking to extend) + `inherit_style_for_modifier` (the alias-channel precedent).
5. ☐ **CLAUDE.md root-cause methodology rule 4a** + the draft `sites/mamas-munches/mockups/homepage/index.html`.
6. ☐ **The live canary** — `https://sandybrown-nightingale-600381.hostingersite.com/` (page 8; creds `.claude/secrets/sandybrown.env`).

*(Carry-forward note: the previous gate's two extra items — the 18 programme commit messages + the two EXECUTION plans — were the QC session's per-step audit checklist; the QC is COMPLETE (D277), so those items are discharged, not dropped. The commits remain readable via `git show` if a fix needs a step's history.)*

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE — Spec 31 IN FULL + handoff + D-ceiling + parking (P-GATE + all P-QC-*) + the A2 baseline + the draft? (Quote one specific thing to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; ceiling was **D278** — verify before any new D.) Is the working tree clean?
3. For every fix I build: am I proving the premise on the REAL draft node BEFORE and AFTER (STOP-43), and gating on the REAL page 8 (computed values matched by content + Bean eye), never on emit alone?
4. Baselines I must not regress: content 90% / CSS 67-69-76 / A2 = 5 keys (each fix must SHRINK it); 790 canonical+orchestrator tests; cheat-gate 35 baselined 0 NEW.
5. Subagents: read-only raters/tracers may run PARALLEL; any FIX work = ONE solo coding subagent at a time, foreground, named files, spawn-no-agents; I verify every subagent's edits + tests myself (STOP-16).

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

---

## ORCHESTRATION PLAN (Bean-directed flow)

### Task 1 — Fresh /sgs-clone run (the ground-truth snapshot)
**What:** run the full pipeline to page 8 (STOP-21 recipe in the catalogue above) so every artefact is FRESH: `computed-parity.json` (per-element, per-property mismatches at 375/768/1440), the A2 accounting vs the live page source (curl page 8 → `ledger/content_coverage_check.py --report --draft <draft> --markup <live source>`), `content-gaps.json`, and the run's trace/gap ledgers.
**Why:** the register must be built from ONE current run, never stale artefacts.
**Orchestration:** inline (one command + artefact collection). ~10 min.
**Acceptance:** deploy green; parity report + A2 report + gap ledgers all from THIS run (baselines: content 90 / CSS 67-69-76 / A2 5 keys).

### Task 2 — Enumerate EVERY drop and mismatch into ONE register
**What:** parse `computed-parity.json` (every mismatched property on every matched element + every unmatched draft element) + the A2 unaccounted keys + dropped images/links into a single numbered register (ID | section | element | kind: content-drop / css-mismatch / element-unmatched | draft value vs live value | viewport(s)). Expect roughly: 5 content units, ~250 mismatched props per viewport, ~15 unmatched draft elements.
**Why:** "group by cause" needs the complete defect population first — no sampling.
**Orchestration:** inline (a small parse script producing a markdown/JSON register). ~10 min.
**Acceptance:** register totals reconcile with the parity report's own counts (conservation applies to the register too — nothing dropped in parsing).

### Task 3 — Parallel root-cause investigation (/dispatching-parallel-agents)
**What:** cluster the register mechanically first (same property family / same section / same element type), then dispatch READ-ONLY investigators in parallel — one per cluster — each running the /systematic-debugging protocol with /sgs-wp-engine + /sgs-db ground truth: trace each defect to its ROOT-cause layer (converter routing | theme default | block CSS/render | wrapper | draft convention | instrument artefact | WP core). KNOWN PRIORS to feed every investigator: P-STYLESHEET-DEFAULTS (clone theme base font 18px vs draft 16px — likely explains many typography mismatches; theme-snapshot fix, NOT converter); card ctaText/ctaUrl = the single-winner element→attr resolver (multi-attr lift needed, FR-31-2); packSizes = missing `array_item_schema` items schema; imageAlt = string image attrs drop alt (block-side attr needed).
**Orchestration:** parallel read-only Explore/general-purpose agents (sonnet), one per cluster; NO fixes, NO writes. The main session fact-checks every claimed cause by tracing (STOP-15 — 9 false claims across the last two sessions).
**Acceptance:** every register row carries a verified root cause with file:line / DB-row / computed-style evidence.

### Task 4 — Group by cause + present to Bean (STOP before fixing)
**What:** collapse the register into CAUSE GROUPS (one row per root cause: cause | plain-English explanation | affected register IDs | proposed fix-shape | smallest-plausible effort | expected parity gain). Present to Bean for agreement — the D278 pattern: explain → agree → clear. Do NOT build fixes before agreement; agreed groups then follow the standard discipline (qc-council on fix-shapes, solo builds, STOP-43 emit-diffs, LANDED + A2/parity gates, A2 baseline must SHRINK per content fix).
**Acceptance:** Bean has the cause-grouped table with per-group proposals; agreed groups cleared same-session where scope allows.

### Dependency graph
```
Task 1 (inline clone run)
  ↓
Task 2 (inline register build — conservation-checked)
  ↓
Task 3 (parallel read-only investigators → main-session fact-check of every cause)
  ↓
Task 4 (cause groups → Bean agreement → then fixes per the standard discipline)
```

## Skills to Invoke
| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS INCLUDE — design decisions (Task 1 fix-shape, Task 4 semantics) |
| `/gap-analysis` | ALWAYS INCLUDE — grade outputs before delivery |
| `/lifecycle` | ALWAYS INCLUDE — before any skill/agent/pipeline change |
| `/research` | ALWAYS INCLUDE — auto-routes if a defect needs external reference |
| `/strategic-plan` | ALWAYS INCLUDE — only if Bean changes scope; the plan above is the plan |
| `/qc-council` · `/qc-inline` | fix-shape validation BEFORE building (R-31-7) + pre-commit review (blub 255) |
| `/dispatching-parallel-agents` | Task 3 — the parallel read-only investigator fan-out |
| `/systematic-debugging` | THE Task-3 protocol — root-cause every register row before any fix |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` | LANDED runs + DB ground truth (STOP-11/R-31-8) |
| `/verify-loop` · `/handoff` · `/capture-lesson` | 2-attestation / session close |

## Tool bindings (MCP servers & tools)
| Tool | What for |
|------|----------|
| Playwright / chrome-devtools | LANDED proof on page 8 — computed values matched by CONTENT at 375/768/1440 |
| `python ~/.claude/hooks/wp-blocks.py dump` · `sgs-db.py sql "..."` | schema/DB ground truth BEFORE any "missing X" claim |
| `node.exe plugins/sgs-blocks/scripts/parity/computed-parity.js` | the honest parity instrument (use `node.exe` — the bash `node` shim breaks) |
| `ledger/content_coverage_check.py --check --draft <draft> --markup <LIVE page source>` | the A2 accounting — markup input = curl'd live page 8, NEVER the raw emit (STOP-49) |
| REST (Basic auth, `.claude/secrets/sandybrown.env`) | overwrite page 8 — never a new page |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `Explore` (read-only, parallel OK) | Task-4 investigation, fix-shape tracers, pre-commit raters |
| solo Sonnet coding subagent (general-purpose, foreground) | Task 1-3 builds — ONE at a time, named files, spawn-no-agents |
| `wp-sgs-developer` | Task 3 block-side work (imageAlt attr) |

## First action

Complete the Mandatory READING gate + the pre-flight ritual (answers in your first message), then Task 1: the fresh clone run (STOP-21 recipe in the catalogue above). Smallest first action: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (under 1 minute, zero dependencies).

## Methodology guardrails (do not skip)
- Tests from the CANONICAL cwd `plugins/sgs-blocks/scripts`: `python -m pytest orchestrator/test_css_router.py converter/tests cheat-gate/tests tests/test_converter_conformance.py ledger/tests -q --import-mode=importlib` (790 baseline incl. 40 byte-compare conformance goldens + real-draft metamorphic legs) + `tests/test_orchestrator_failed_status.py tests/test_orchestrator_non_bem_halt.py` (18). Gates: `python cheat-gate/run.py --check` + `converter/gates/no_slug_literal.py --check` + `converter/gates/import_ban.py --check` + `converter/gates/check_raw_sqlite.py --check` all exit 0.
- **Deploy before measure** (STOP-21, recipe above) — any LANDED check requires the genuine emit deployed to page 8 first.
- **/qc-council (or 2-rater review) before every commit** touching converter/block/theme (blub 255) — then fact-check the council (STOP-15/45).
- **Prove the premise on the real node** (STOP-43) before + after every converter change; emit-diff the FULL draft (9 sections) per fix.
- **Every A2 re-baseline must SHRINK** — a fix that doesn't remove its key from the baseline didn't land.
- Branch `main`; verify D-ceiling (D278); commits path-scoped (PowerShell piped `git commit -F -` for Write-tool files).
- Close at a natural boundary if context pressure hits — main stays green + pushed after every fix.
