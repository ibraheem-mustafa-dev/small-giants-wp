---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / D2-EMPTYING BUILD SEQUENCE (Bean-agreed at the D280 close, 2026-07-05)
generated: 2026-07-05
primary_goal: "Empty the D2 page-scoped CSS block (STOP-52) via the agreed build sequence: (1) preset-as-seed button model, (2) the RE-SCOPED CSS-property column (path A, council-passed), (3) the 3-wave capability-roster rollout, (4) multi-button reconciliation. Build agreed items; discuss the column's remaining must-fixes before dispatch. Every fix LANDED on page 8 before commit."
---

# NEXT SESSION — the D2-emptying build sequence (Bean-agreed)

Invoke /autopilot first. The D280 session cleared 5 of the 6 residuals (5 fixes LANDED; parity 77-78-80 → 79-80-81 honest fresh-clone baseline) and design-gated point 5 (Bean's CSS-routing rework) through a 5-persona adversarial-council that RESHAPED it. This session BUILDS the agreed sequence.

**Agent identity.** You are the SGS pipeline builder-diagnostician: you build agreed, council-passed fix-shapes with LANDED proof, and you keep fact-checking every claim against ground truth (STOP-15).

**State recap (plain English).** The cloned homepage still ships a 129-rule page-scoped CSS block ("D2") the page DEPENDS on — Bean's STOP-52 doctrine says it must never. D2 empties via ~5 workstreams: the point-5 declarative CSS-routing column (naming-mismatch slice), the H1 router-blindness patches (shorthand/hover/native-supports), the 42 genuine-gap attrs, `sgsResponsiveOverrides` (breakpoints, approved), chrome exclusion, and the end-gate. This session builds preset-as-seed + the re-scoped column + the roster rollout + multi-button. Live baselines: content 96 / CSS 79-80-81 / 822 tests / cheat-gate 33 baselined 0 NEW.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS, **no hand-declared per-block/per-draft selectors**, **no client copy baked into a base block**, **no per-slug/per-slot/per-role literal in a resolver body**. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix fires for every qualifying block/case; over-broad universality is ALSO a break. Universal signal = a DB fact, never `if slug == X`.
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone at 375/768/1440. Emit-green ≠ LANDED. WRITTEN ≠ LANDED. "Deploy to homepage" = overwrite page 8, never a new page.
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **FOLLOW THE SPEC IN EVERY DETAIL** — Spec 31 is the settled authority. Where silent, pin the smallest spec-consistent rule and write it INTO the spec. **Shared-mechanism / DB-schema changes need a pre-build design-gate + Bean approval.**

## Mandatory READING (tick each in your first message; verify against ground truth, read WHOLE docs)
1. [ ] `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — READ IN FULL, END TO END (Bean directive; STOP-26). §3.A = the CSS branch the column touches.
2. [ ] `.claude/handoff.md` top entry (D280) + `.claude/decisions.md` head (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — was D280 at write time).
3. [ ] `.claude/plans/2026-07-05-css-property-column-design.md` — the point-5 design + the ⛔ COUNCIL OUTCOME block (build the RE-SCOPE, not the original v1 mass-seed).
4. [ ] `.claude/reports/2026-07-05-residuals-fact-first-investigation.md` — the H1-H8 evidence (the D2 disposition table, the button-channel facts, the inheritance research).
5. [ ] `.claude/parking.md` + `ledger/content-coverage-baseline.json` (A2 = 4 keys).
6. [ ] CLAUDE.md root-cause methodology rule 4a + the live canary page 8 (creds `.claude/secrets/sandybrown.env`).

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE — Spec 31 IN FULL + handoff + D-ceiling + the council-outcome design block? (Quote one specific thing to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; ceiling was D280 — verify before any new D.) Is the working tree clean?
3. For every fix I build: premise proven on the REAL draft node BEFORE + AFTER (STOP-43), gated on the REAL page 8 (computed values matched by content + Bean eye), never on emit alone?
4. Baselines I must not regress: content 96 / CSS 79-80-81 / A2 = 4 keys; 822 tests; cheat-gate 33 baselined 0 NEW.
5. Subagents: read-only raters/tracers parallel OK; FIX work = ONE solo coding subagent at a time, foreground, named files, spawn-no-agents; I verify every subagent's edits + tests myself (STOP-16/39).
6. Shared-mechanism / DB-schema change ahead? → pre-build design-gate + Bean approval (Rule 7). The column is council-passed on the RESHAPE; the 5 must-fixes below must be answered before dispatch.

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward; do NOT subtract — D101 rule)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, the raw artefacts.
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.**
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Grep the wiring + confirm it RUNS. (Live example this session: the D2-when-D1 gate was a silent no-op for the wrong pipeline-state root — STOP-6 in the flesh.)
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints** (768/1024 vs 600/640/781).
- **STOP-10 — Empty cloned section = usually a soft-fail** — read extract.json + trace.jsonl first; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column exists is necessary-not-sufficient; grep how it's WRITTEN and READ.
- **STOP-15 — A council/analysis finding is a HYPOTHESIS.** FACT-CHECK it against ground truth before acting. When two raters DISAGREE, resolve by tracing yourself.
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + gates YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`).
- **STOP-21 — LANDED-proven only by deploying the GENUINE emit to a live page + computed-style/innerText.** Recipe: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8 --skip-autonomy-gate` → anonymous chrome-devtools/Playwright. Creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **STOP-23 — Run a pre-commit `/qc-council` (or 2-rater review) on BUILT converter/block code** (blub 255). Verify input-class ≠ output-class; render.php reads the attr you write AND PAINTS the element you check.
- **STOP-24 — A DB change a reseed RE-DERIVES must use a reseed-surviving channel** (block.json / a dated migration / `sgs-update` seeder / ATTR_CLASSIFICATION_OVERRIDES), never a manual DB edit.
- **STOP-26 — Read the WHOLE target spec section holistically before building.**
- **STOP-27 — A conservation/regression guard is `raise`, NEVER a bare `assert`.**
- **STOP-28 (post-Step-16 form) — entry.py's failure contract is LOUD** (`status:'failed'` + reason, loud at the orchestrator caller per D277) — never re-add a silent fallback or a silent empty 'complete'.
- **STOP-31 — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context; plant-test it.** (Applied this session to the D2-when-D1 repair — plant-tested both directions.)
- **STOP-32 — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped"** (native supports→style.*, custom attrs, wrapper render, spec destination — plus the D2 passthrough channel as a FIFTH surface).
- **STOP-34 — SYNTHETIC-FIXTURE-GREEN ≠ REAL-DRAFT-CORRECT.** Reproduce on the FULL real draft.
- **STOP-35 — DEFAULT-IS-CONTAINER: a slug-None class-section defaults to `sgs/container` + recurse; it does NOT fail.**
- **STOP-37 — LANDED catches EMIT/SERIALISATION bugs unit tests structurally cannot.** Deploy + count rendered sections/items.
- **STOP-38 — A section-outer/wrapper fix scoped to ONE slug is an R-31-9 carve-out CHEAT.** Fire on a DB signal, never a slug literal.
- **STOP-39 — PARALLEL coding subagents interfere/revert each other; a SOLO coding subagent is optimal.** ONE implementer at a time, foreground, named files, "do the work yourself, spawn no agents"; read-only analysis/council/Explore agents may run in parallel. (Held this session: 1 coding writer + N read-only raters.)
- **STOP-40 — Don't declare a section "fixed" from seeing a grid + N items.** Check the RENDERED result vs the DRAFT's actual layout at 375/768/1440.
- **STOP-41 — the `no_slug_literal` gate guards `role`/`slot`/`canonical_slot` AND `mod`/`_mod`/`modifier`.** Scope: dispatch_table/orchestrator/walk/recognition + resolvers/ + services/ dirs.
- **STOP-42 — PARITY = computed values matched by CONTENT, never source-declaration-diff, never wrapper-class-keying.** Use `parity/computed-parity.js` (Stage 11.6). Input-side drop-logs are NOT rendered fidelity.
- **STOP-43 — PROVE THE PREMISE ON THE REAL NODE, not code inference.** Before designing OR committing a converter fix, REPRODUCE by RUNNING the engine on the real draft node BEFORE + AFTER.
- **STOP-44 — A schema-valid, EMITTED converter attr can still be a RENDER no-op.** Verify the class/style paints on the LIVE element. (Relevant to the quote typography attach — mechanism sound via get_block_wrapper_attributes, but a set-a-value editor confirm is owed.)
- **STOP-45 — A "regenerated-from-ground-truth" doc is still a HYPOTHESIS.** QC every regenerated/synthesised doc against the scripts; fact-check the QC's own claims.
- **STOP-46 — An in-code allowlist duplicating a DB fact is the R-31-1 drift pattern one level up.** "Which properties/attrs/blocks/ROLES are in scope" must be a (cached) DB membership query.
- **STOP-47 — `git stash` proves NOTHING about DB-state-dependent behaviour.** A gate/tool whose vocabulary is DB-derived can only be proven "pre-existing" by isolating the DB state.
- **STOP-48 — A "dead output" claim is SCOPE-RELATIVE.** Before retiring any output/function, grep ALL consumers (engine + gates + ledgers + tooling), not just the primary reader.
- **STOP-49 — The MEASUREMENT INSTRUMENT is itself QC-able code.** When a number contradicts the eye or the A2 ledger, audit the instrument's element collection + pairing BEFORE trusting the number. A2's canonical `--markup` input is the LIVE PAGE SOURCE (curl page 8), never the raw emit.
- **STOP-50 — A cheat can evade a gate by SHAPE, and a gate's identifier/scope vocabulary is a blind-spot surface.** When hunting cheats: grep code comments for gate names; audit each gate's ident set + scan scope as attack surface.
- **STOP-51 — A #uid-scoped rule is DEAD unless the element actually carries the id.** When scoping by id/class, verify the LIVE element carries the hook attribute.
- **STOP-52 (Bean doctrine) — The page must NEVER DEPEND on non-block-settings CSS emitted by the pipeline.** Everything a client can set in block settings must BE in block settings; a D2-scoped rule the page depends on is an extreme hardcoding cheat. D2 may exist ONLY as a transfer-visibility/debug log, deleted (or not inserted) by an end-gate when the page hits 100% content+CSS parity.
- **STOP-53 (NEW, D280) — Replacing a working name-guess resolver with a declarative DB column: DON'T mass-reverse-derive to "freeze behaviour."** The reverse-derivation is NOT the inverse of the live forward resolver (contentWidth/borderWidthTop/box-shadow/479-tier all break). Add the column, seed ONLY the correcting subset, read column-first-else-fallback → untouched rows byte-identical BY CONSTRUCTION, commit-per-correction. Run an adversarial-council on any shared-mechanism DB refactor before building.
- **STOP-54 (NEW, D280) — Enabling a block capability flag wakes EVERY attr it gates, not just the intended ones.** Pre-audit each block for latent mis-seeds (boolean/non-CSS attr mis-classed role=color/typography + a selector → raw string into the wrong-typed attr), selector drift, and child-owned dead lifts BEFORE flipping the flag. Stage: Wave-1 flag-only / Wave-2 overrides-then-enable / Wave-3 exclude.

---

## ORCHESTRATION PLAN (build the agreed sequence; discuss the column must-fixes before dispatch)

### Task 1 — Preset-as-seed button styling model (Bean point 1)
**What:** make the button's inheritStyle preset (primary/secondary/outline) a STARTING POINT, not a lock — picking a preset seeds the block's attrs from that preset's defaults, then every value stays editable; remove the `$is_custom` render gate so the block always paints from attrs.
**Why:** the WP block-VARIATION pattern (research-confirmed vs block-STYLE); fixes the "typography inert on preset buttons" defect; matches the overridable-default doctrine (H7).
**Orchestration:** inline main-session build (it rewrites the button styling model — LANDED proof needed). edit.js seeds attrs on inheritStyle change from a PRESET_DEFAULTS map (sourced conceptually from the theme-snapshot preset vars); render.php ungates. /qc-inline + LANDED (set a preset in the editor, override a value, confirm frontend). ~1-1.5h.
**Acceptance:** picking a preset seeds editable defaults; an overridden value wins; all preset buttons render from attrs; page-8 buttons unchanged. LANDED.

### Task 2 — The RE-SCOPED CSS-property column (path A, council-passed)
**What:** add `block_attributes.css_property` + `css_layer`; seed ONLY the ~50-80 stranding attrs (declared per-block in block.json supports.sgs); resolver reads column-first-else-fallback (today's exact resolver UNCHANGED). Each correction = one commit that empties a real D2 rule.
**Why:** the naming-mismatch slice of the ~50 D2 should-lift rules (colourBorder etc.); the declarative D258-consistent home.
**Orchestration:** DESIGN-GATED (Rule 7) — the 5 council must-fixes must be answered in your first design message BEFORE dispatch: (1) state the loud-fail contract per call site (attr_for_layer_property raises on ≥2, attr_for_property first-wins) — the column-first lookup must preserve each; (2) NULL means "not corrected → fallback" (no overload); (3) keep ORDER BY determinism; (4) grep-confirm the ≥5 consumers (drift-validator, fingerprint-builder) aren't broken by column-first; (5) a `check_css_property_reseed.py` diff test for the corrected subset. Then ONE solo coding subagent per correction batch; /qc-council pre-commit; STOP-43 emit-diff; LANDED. Spec 31 FR-31-5.2/5.3 + §4 amendment. ~2-3h.
**Acceptance:** untouched attrs byte-identical (conformance goldens); the corrected attrs lift out of D2 (the repaired D2-when-D1 gate confirms); parity delta measured; the 5 must-fixes answered.

### Task 3 — Capability-roster 3-wave rollout (scalar-styling-lift)
**What:** enable scalar-styling-lift across the 12 typography-target blocks safely, using the pre-audited plan.
**Why:** 12 composites declare lift-able *FontSize typography attrs that never lift (the trust-bar gap, generalised).
**Orchestration:** apply the paste-ready `ATTR_CLASSIFICATION_OVERRIDES` entries (below) + block.json flags, `/sgs-update`, deploy, LANDED. Wave 1 flag-only: **sgs/media, sgs/whatsapp-cta, sgs/mobile-nav**. Wave 2 overrides-then-enable: **counter** (fix `accentStroke` boolean mis-seed first), **card-grid** (`__heading`→`__title`, `__subheading`→`__subtitle`), **option-picker** (`__label`→`__pill` for pill*), **quote** (`__text`→`__attribution`), **product-card** (`__heading`→`__title`, pill/tag drift). Wave 3 EXCLUDE (child-owned/dynamic): **notice-banner text** (icon only), **testimonial-slider name**, **post-grid**. Also fix the 3 pre-flight boolean mis-seeds before any future full-41 rollout: container/cta-section/hero `bgSvgTextShadow` → `{role:behaviour, derived_selector:None}`. Full paste-ready override dict is in the roster-scan agent output (this session). ~45min.
**Acceptance:** each enabled block's label/title typography lifts to its exposed attr, LANDED at 375/768; no boolean-attr corruption.

### Task 4 — Multi-button reconciliation (H6, Bean-held → release then build)
**What:** KEEP the shared container; reconcile the block's duplicate `direction*`/`wrap*` against the shared-wrapper `flexDirection*`/`flexWrap` (pick one owner, remove/alias the other); fix the mobile-tier render bug (non-standard 768/769 bands → 767/1023); the column (Task 2) then maps the draft's flex-direction onto the surviving attr.
**Orchestration:** confirm the render bug on the live element first (STOP-43); design-gate the shared-wrapper touch; ONE solo coding subagent; LANDED at 375. Bean-held — confirm release before building. ~1h.
**Acceptance:** the hero CTAs stack to column on mobile faithfully via a client-editable attr, not a hardcoded default.

### Task 5 — Parity-instrument draft-tier sampling fix (quick, high-value; do EARLY)
**What:** `computed-parity.js` samples the DRAFT's base tier, not the `@media` tier applicable at the measured viewport — it flagged the trust-bar text draft=13 vs clone=14 at 1440, but 14 is CORRECT (the draft's `min-width:1024` tier). Fix it to read the draft's effective value at each viewport (375/768/1440) the same way the live clone is read.
**Why:** a false-negative that understates CSS parity AND would mask a real desktop-tier drop — the measurement instrument must be trustworthy (STOP-49). Parked `P-PARITY-DRAFT-TIER-SAMPLING`.
**Orchestration:** inline; verify by re-running parity + a Playwright spot-check that the trust-text mismatch clears. ~30min. Do this FIRST so the parity numbers you measure the other tasks against are honest.
**Acceptance:** the trust-text font-size false mismatch clears; parity re-baseline is the honest number; no new false mismatches.

### Dependency graph
Task 5 (inline, EARLY — trustworthy measurement first) → Task 1 (inline, LANDED) → Task 2 design-gate (answer the 5 must-fixes) → Task 2 build (commit-per-correction) ∥ Task 3 (roster rollout, independent) → Task 4 (after Bean releases the hold).
The remaining ~19% CSS gap is precisely enumerated in `.claude/handoff.md` Notes (1440: 43 elements/159 diffs) and maps to Tasks 1-4 + block-CSS-default cleanups. End of session if scope allows: `sgsResponsiveOverrides` (approved, the 9 F-ii breakpoint rules) + the D2 end-gate design.

## Skills to Invoke
| Skill | When |
|-------|------|
| /autopilot | FIRST — SessionStart hook injects it; live skill routing + ADHD support |
| /brainstorming | ALWAYS — the column must-fixes + preset-as-seed + multi-button are design decisions |
| /gap-analysis | ALWAYS — grade outputs before delivery |
| /lifecycle | ALWAYS — before any skill/agent/pipeline change |
| /research | ALWAYS — auto-routes if a build needs external reference |
| /strategic-plan | ALWAYS — order the build before writing code |
| /adversarial-council | pre-build pre-mortem on any further shared-mechanism/DB-schema change |
| /qc-council | fix-shape validation + pre-commit review on converter/block/theme (blub 255) |
| /systematic-debugging | root-cause gate per issue |
| /dispatching-parallel-agents /subagent-driven-development | read-only fan-outs (STOP-39: coding = solo) |
| /sgs-clone /sgs-db /wp-blocks | LANDED runs + DB ground truth |
| /verify-loop /handoff /capture-lesson | 2-attestation / session close |

## Tool bindings (MCP servers & tools)
| Tool | What for |
|------|----------|
| Playwright / chrome-devtools | LANDED proof on page 8 — computed values by CONTENT at 375/768/1440 |
| `python ~/.claude/hooks/wp-blocks.py dump` + `sgs-db.py sql` | schema/DB ground truth BEFORE any missing-X claim |
| `node plugins/sgs-blocks/scripts/parity/computed-parity.js` | the honest parity instrument (Stage 11.6) |
| `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --skip-build --allow-dirty` | plugin/theme deploy (render.php changes need this BEFORE measuring — STOP-21). PowerShell for npm (bash node shim broken). |

## Agents to Delegate To
| Agent | When |
|-------|------|
| Explore / general-purpose (read-only, parallel OK) | tracers, pre-commit raters, roster/consumer audits |
| solo general-purpose coding subagent (foreground) | agreed fixes — ONE at a time, named files, spawn-no-agents |
| wp-sgs-developer | block-side work (preset-as-seed, block.json declarations) |

## First action
Complete the READING GATE + pre-flight ritual (answers in your first message), then start Task 1 (preset-as-seed — inline, no design-gate needed, it's a block-side agreed build). Smallest first action: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (under 1 minute, verifies the D-ceiling before any new D).

## Methodology guardrails (do not skip)
- Tests from the CANONICAL cwd `plugins/sgs-blocks/scripts`: `python -m pytest orchestrator/test_css_router.py converter/tests cheat-gate/tests tests/test_converter_conformance.py ledger/tests -q --import-mode=importlib` (822 baseline: 806 + 16 this session) + gates `cheat-gate/run.py --check` + `converter/gates/{no_slug_literal,import_ban,check_raw_sqlite}.py` all exit 0.
- **Deploy before measure (STOP-21):** render.php/theme/block changes require build-deploy BEFORE any live check. Build via PowerShell (`npm run build`), deploy `build-deploy.py`.
- **/qc-council (or 2-rater) before every commit** touching converter/block/theme (blub 255) — then fact-check the council (STOP-15/45).
- **Prove the premise on the real node (STOP-43)** before + after every converter change; emit-diff the FULL draft per fix.
- **Visual-diff gate:** a block style.css/render visual change needs `reports/visual-diff/<block>-YYYY-MM-DD.md` (verdict: PASS + first_paint_capture_passed: true) or the commit hook blocks.
- Every A2 re-baseline must SHRINK; parity content 96 / CSS 79-80-81 must not regress.
- Branch main; verify D-ceiling (D280); commits path-scoped (PowerShell piped `git commit -F -` or explicit paths; add `[batch-ok:<reason>]` only for a verified session-doc set); push after every green fix.
- **Design gate:** any shared-wrapper / DB-schema / converter-mechanism change = pre-build design-gate + Bean approval (Rule 7). The column is council-passed on the RESHAPE; answer its 5 must-fixes before dispatch.
