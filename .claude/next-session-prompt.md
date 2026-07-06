---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / CONTAINER BLOCKS + L1-L4 CASCADE DEEP-DIVE (Bean-set at the D282 close, 2026-07-06)
generated: 2026-07-06
primary_goal: "A slow, layer-by-layer investigation of the container L1-L4 cloning cascade. Understand BEFORE fixing: map sgs/container + the shared wrapper's full setting/CSS surface, explain the responsive system (per-device + custom breakpoint), group all settings into L1-L4 (Bean agrees), prove whether the cascade is UNIVERSAL (class-section vs div-section; container vs container-equivalent vs composite), explain it non-technically THEN reconcile with the spec, then test varied draft shapes per layer (one layer fully fixed + LANDED before adding the next). Universal = ALL L3 CSS lands across DIFFERENT examples, not one rule working once."
---

# NEXT SESSION — Container blocks + the L1-L4 cloning cascade (deep-dive)

Invoke /autopilot first. **This is a slow, understand-before-fix session.** Bean drives the pace; each step is agreed before moving on. The D282 session closed the page-8 QC batch (fixed #1 container gaps via the L3 gap-gate, #4 hero image, #9 testimonial bg, de-duped the hero, cleaned dead schema) and, crucially, **stopped deploying D2 into the page** so the live page now shows the HONEST gap set. The recurring theme was D228 hardcoded-default cheats. This session goes deep on the container cascade itself.

**Agent identity.** SGS pipeline builder-diagnostician: map → explain-simply → agree → fix one layer at a time → LANDED. Prove every premise on the real draft node + live DOM (STOP-43/STOP-1). Understanding is the deliverable before any converter edit.

**State recap (plain English).** **D2 IS NO LONGER DEPLOYED (STOP-52, `6a83281c`)** — the page shows honest gaps; that is why the QC batch surfaced. Honest parity is **content 96 / CSS 70-71-71** (was 80-81-81 D2-masked). This session studies the container L1-L4 CSS cascade end to end. The 3 layers of container-block: `sgs/container` (the plain block) · container-equivalents that mirror it (`card-grid`, `feature-grid`, `multi-button`) · composite container-equivalents (`hero`, `trust-bar`, `info-box`). All route through the shared `SGS_Container_Wrapper` (PHP) + `ContainerWrapperControls` (React). The open converter gaps proven at D282: **L4 per-area extraction** (a composite's grid-area box-CSS — e.g. hero `.sgs-hero__content` padding — is never fed to the wired `grid_area` resolver, so contentPadding gets "no value extracted") and the **universal reach of L3** (Bean: making one gap rule work across examples ≠ universal; universal = every L3 setting landing across different column-counts / composites / container-in-grid-mode / container-equivalents like `sgs/multi-button` whose `max-width` isn't landing).

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS, **no hand-declared per-block/per-draft selectors**, **no client copy baked into a base block**, **no per-slug/per-slot/per-role literal in a resolver body**. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix fires for every qualifying block/case; over-broad universality is ALSO a break. Universal signal = a DB fact, never `if slug == X`.
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone at 375/768/1440. Emit-green ≠ LANDED. WRITTEN ≠ LANDED. "Deploy to homepage" = overwrite page 8, never a new page.
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **FOLLOW THE SPEC IN EVERY DETAIL** — Spec 31 is the settled authority. Where silent, pin the smallest spec-consistent rule and write it INTO the spec. **Shared-mechanism / DB-schema changes need a pre-build design-gate + Bean approval.**

## Mandatory READING (tick each in your first message; verify against ground truth, read WHOLE docs)
1. [ ] `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — READ IN FULL, END TO END (Bean directive; STOP-26). §2 = the LAYER model (L1-L4); §3.A = the CSS branch; §13.4 = CSS routing FRs.
2. [ ] `.claude/handoff.md` top entry (D282) + `.claude/decisions.md` head (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — was D282 at write time).
3. [ ] `.claude/specs/29-*` (container-equivalent 3-KIND roster) + the WRAPPER-CSS-ROUTING-DESIGN-GATE doc (DEC-1..5, the layer-detection rules).
4. [ ] `.claude/cloning-pipeline-flow.md` + `-stages.md` (the stage map the cascade runs through).
5. [ ] `.claude/parking.md` (P-DRAFT-CSSVAR-COLOUR-RESOLUTION, P-MULTIBUTTON-768-WRAP, the L4 note in P-PAGE8-QC-BATCH-9).
6. [ ] The shared wrapper: `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` + `src/blocks/container/components/ContainerWrapperControls.js` + the live canary page 8 (creds `.claude/secrets/sandybrown.env`).

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE — Spec 31 IN FULL (§2 layer model especially) + handoff + D-ceiling? (Quote one specific thing to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; ceiling was D282 — verify before any new D.) Is the working tree clean?
3. For every fix I build: premise proven on the REAL draft node BEFORE + AFTER (STOP-43), gated on the REAL page 8 (computed values matched by content + Bean eye), never on emit alone?
4. Baselines I must not regress: content 96 / CSS 70-71-71; 872 tests; cheat-gate 33 baselined 0 NEW. D2 NOT deployed (honest page).
5. Subagents: read-only raters/tracers parallel OK; FIX work = ONE solo coding subagent at a time, foreground, named files, spawn-no-agents; I verify every subagent's edits + tests myself (STOP-16/39).
6. Shared-mechanism / DB-schema change ahead (the wrapper + the cascade are the highest-blast-radius surface)? → pre-build design-gate + Bean approval (Rule 7).

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward; do NOT subtract — D101 rule)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, the raw artefacts.
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.**
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Grep the wiring + confirm it RUNS.
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints** (768/1024 vs 600/640/781).
- **STOP-10 — Empty cloned section = usually a soft-fail** — read extract.json + trace.jsonl first; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column exists is necessary-not-sufficient; grep how it's WRITTEN and READ.
- **STOP-15 — A council/analysis finding is a HYPOTHESIS.** FACT-CHECK it against ground truth before acting. When two raters DISAGREE, resolve by tracing yourself. (This session: 3 investigators, every root cause main-session-verified before acting.)
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + gates YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`).
- **STOP-21 — LANDED-proven only by deploying the GENUINE emit to a live page + computed-style/innerText.** Recipe: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8 --skip-autonomy-gate` → anonymous chrome-devtools/Playwright. Creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **STOP-23 — Run a pre-commit `/qc-council` (or 2-rater review) on BUILT converter/block code** (blub 255). Verify input-class ≠ output-class; render.php reads the attr you write AND PAINTS the element you check.
- **STOP-24 — A DB change a reseed RE-DERIVES must use a reseed-surviving channel** (block.json / a dated migration / `sgs-update` seeder / ATTR_CLASSIFICATION_OVERRIDES), never a manual DB edit.
- **STOP-26 — Read the WHOLE target spec section holistically before building.**
- **STOP-27 — A conservation/regression guard is `raise`, NEVER a bare `assert`.**
- **STOP-28 — entry.py's failure contract is LOUD** (`status:'failed'` + reason) — never re-add a silent fallback or a silent empty 'complete'.
- **STOP-31 — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context; plant-test it.**
- **STOP-32 — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped"** (native supports→style.*, custom attrs, wrapper render, spec destination — plus the D2 passthrough channel as a FIFTH surface). NOTE: D2 no longer deployed, but it is still WRITTEN to pipeline-state as the debug/transfer-visibility log.
- **STOP-34 — SYNTHETIC-FIXTURE-GREEN ≠ REAL-DRAFT-CORRECT.** Reproduce on the FULL real draft.
- **STOP-35 — DEFAULT-IS-CONTAINER: a slug-None class-section defaults to `sgs/container` + recurse; it does NOT fail.**
- **STOP-37 — LANDED catches EMIT/SERIALISATION bugs unit tests structurally cannot.** Deploy + count rendered sections/items.
- **STOP-38 — A section-outer/wrapper fix scoped to ONE slug is an R-31-9 carve-out CHEAT.** Fire on a DB signal, never a slug literal.
- **STOP-39 — PARALLEL coding subagents interfere/revert each other; a SOLO coding subagent is optimal.** ONE implementer at a time, foreground, named files, "do the work yourself, spawn no agents"; read-only analysis/Explore agents may run in parallel.
- **STOP-40 — Don't declare a section "fixed" from seeing a grid + N items.** Check the RENDERED result vs the DRAFT's actual layout at 375/768/1440.
- **STOP-41 — the `no_slug_literal` gate guards `role`/`slot`/`canonical_slot` AND `mod`/`_mod`/`modifier`.** Scope: dispatch_table/orchestrator/walk/recognition + resolvers/ + services/ dirs.
- **STOP-42 — PARITY = computed values matched by CONTENT, never source-declaration-diff, never wrapper-class-keying.** Use `parity/computed-parity.js` (Stage 11.6).
- **STOP-43 — PROVE THE PREMISE ON THE REAL NODE, not code inference.** Before designing OR committing a converter fix, REPRODUCE by RUNNING the engine on the real draft node BEFORE + AFTER.
- **STOP-44 — A schema-valid, EMITTED converter attr can still be a RENDER no-op.** Verify the class/style paints on the LIVE element.
- **STOP-45 — A "regenerated-from-ground-truth" doc is still a HYPOTHESIS.** QC every regenerated/synthesised doc against the scripts.
- **STOP-46 — An in-code allowlist duplicating a DB fact is the R-31-1 drift pattern one level up.** "Which properties/attrs/blocks/ROLES are in scope" must be a (cached) DB membership query.
- **STOP-47 — `git stash` proves NOTHING about DB-state-dependent behaviour.** A DB-derived gate can only be proven "pre-existing" by isolating the DB state.
- **STOP-48 — A "dead output" claim is SCOPE-RELATIVE.** Before retiring any output/function, grep ALL consumers (engine + gates + ledgers + tooling).
- **STOP-49 — The MEASUREMENT INSTRUMENT is itself QC-able code.** When a number contradicts the eye, audit the instrument's element collection + pairing BEFORE trusting the number.
- **STOP-50 — A cheat can evade a gate by SHAPE; a gate's identifier/scope vocabulary is a blind-spot surface.** When hunting cheats: grep code comments for gate names; audit each gate's ident set + scan scope.
- **STOP-51 — A #uid-scoped rule is DEAD unless the element actually carries the id.** Verify the LIVE element carries the hook attribute.
- **STOP-52 (Bean doctrine) — The page must NEVER DEPEND on non-block-settings CSS emitted by the pipeline.** D2 exists ONLY as a transfer-visibility/debug log — as of `6a83281c` it is NOT deployed into the page (env `SGS_EMIT_D2_PAGE=1` restores injection for a one-off before/after). Everything a client can set must BE in block settings.
- **STOP-53 (D280) — Replacing a working name-guess resolver with a declarative DB column: DON'T mass-reverse-derive.** Add the column, seed ONLY the correcting subset, read column-first-else-fallback → untouched rows byte-identical BY CONSTRUCTION, commit-per-correction.
- **STOP-54 (D280) — Enabling a block capability flag wakes EVERY attr it gates.** Pre-audit each block for latent mis-seeds + selector drift + child-owned dead lifts before flipping.
- **STOP-55 (NEW, D282) — A test can CODIFY A BUG as intended behaviour.** The `test_css_pass_partition` gap tests asserted `gap→style.spacing.blockGap` (the exact dead-channel bug). When a correct fix (LANDED-proven) breaks such a test, UPDATE the test to the correct behaviour — do NOT revert the fix to keep the test green. The LANDED live-DOM result is the arbiter, not the pre-existing test.
- **STOP-56 (NEW, D282) — A D228 hardcoded default can HIDE behind another attr's override.** The hero's 24px `.sgs-hero--split{gap}` default only stayed invisible because `splitGap*=0` forced `gap:0px`; removing the override exposed it. When removing an override/dedup, check what STYLE.CSS default it was masking + fix the root default too.
- **STOP-57 (NEW, D282) — Redeploying the SAME block version with changed CSS serves STALE via the CDN.** `?ver` is the block.json version; the Hostinger CDN caches per full URL. Bump the block version on EVERY CSS change or the browser loads the old stylesheet (proven live: `?ver=0.3.2` cached with the old gap). `curl` without `?ver` can hit origin and mislead — verify with the real `?ver` the page loads.
- **STOP-58 (NEW, D282) — Stage-1 reseed does NOT prune orphaned attr rows.** `sgs-update --stage 1` inserts/updates but does not DELETE `block_attributes` rows for attrs removed from block.json. A manual DB prune is durable (block.json is the source; a future reseed won't re-add) — or run the full 10-stage `/sgs-update` (aggressive prune-orphans).
- **STOP-59 (NEW, D282) — The visual-diff commit gate blocks a block.json-META-only commit.** For a pure schema change (removed attrs/supports, no CSS/render change) the gate itself instructs `git commit --no-verify` — that is the sanctioned path, NOT a circumvention. Confirm the staged set is block.json-only first.

---

## ORCHESTRATION PLAN — the container L1-L4 cascade deep-dive (Bean's agenda; do in ORDER, each gated by Bean's agreement)

**This is a slow, understand-first session — NOT a fix-fast session. Each numbered step is agreed with Bean before the next.**

### 1 — Map the container surface (inline, read-only)
- **1a.** Go through `sgs/container` + shared `SGS_Container_Wrapper` (PHP) + `ContainerWrapperControls` (React) — enumerate EVERY CSS rule + setting they own. (`/sgs-db block sgs/container`, `/wp-blocks schema sgs/container`, read the wrapper + controls in full.)
- **1b.** Explain how the responsive settings work — the per-device (Mobile/Tablet/Desktop) system AND the custom-breakpoint (`sgsResponsiveOverrides`) setup — non-technical + visual.

### 2 — Complete the settings
- **2a.** Find missing/incomplete settings (e.g. a setting that should have responsive variants but doesn't).
- **2b.** Add whatever is missing (design-gate any shared-wrapper/DB change first — Rule 7).
- **2c.** Divide ALL container settings into L1/L2/L3/L4 groups + explain the groupings. **Complete only when Bean AGREES.**

### 3 — Is the cascade universal?
- **3a.** Investigate how the container CSS cascade is scripted. Answer definitively: identical for class-section vs div-section · `sgs/container` vs container-equivalent (`card-grid`/`feature-grid`/`multi-button`) vs composite container-equivalent (`hero`/`trust-bar`/`info-box`)?
- **3b.** Fix inconsistencies/weaknesses (design-gate shared-mechanism changes).

### 4 — Explain + reconcile
- **4a.** Explain exactly how the cascade works from the scripts — each layer, how CSS flows + routes — **non-technical, visual, example-based** (Bean understands FIRST, before any comparison).
- **4b.** THEN compare to the spec + reconcile the differences (amend the spec or flag the code).

### 6 — Layer-by-layer scenario testing (L1→L2→L3→L4, ONE at a time; fix + re-test + LANDED before adding the next)
Per layer, test varied draft shapes: inner layer NOT named `__inner`; NO inner layer (L2/L3 CSS on the top div, and if a grid the L4 = direct descendants); containers-in-containers (featured-product); unique CSS per layer (every container-equivalent exists BECAUSE it has settings the plain container lacks); recognising L4 grid items with CUSTOM names (hero split = `media`/`content`).
- Resolve the **content-width vs max-width** issue + other multi-layer migration quirks here.
- **L4 open bug (proven D282):** the composite grid-area box-CSS is never fed to the (wired) `grid_area` resolver → hero contentPadding "no value extracted". Fix the per-area extraction feed.
- **@media (responsive):** investigate how `@media` CSS transfers universally, explain it ADHD-simple, and confirm whether it behaves differently in the container context vs all blocks (it should be universal — if not, WHY).

### Three carry-forward INSIGHTS (Bean, D282)
1. **Universal = ALL L3 CSS lands across DIFFERENT examples, not one rule across examples.** The gap fix worked (products/gift cards) but that's one rule. Real test: does EVERY L3 setting land on — different column counts · composites · `sgs/container` in grid mode · a container-equivalent? **Probe `sgs/multi-button` / `sgs/button-group` — its `max-width` isn't landing, a good test.**
2. **Card height-matching is a DIAGNOSTIC, not a success condition.** Product cards aren't equal-height. A `sgs/container` default of `align-items:stretch` might be wrong for the general block — meaning the correct routing is to the `card-grid` container-equivalent, not the plain container. Use the mismatch to find the TRUE routing; don't force stretch.
3. **Testimonial slider exposed a layer-model flaw.** The shadow is around the WHOLE grid area, not each review card. The area OUTSIDE the cards should NOT be its own nesting layer — each card is a GRID ITEM. Only gap + padding legitimately style the outside-the-card area; background/shadow belong INSIDE the cards (L3 if parent-dictated/uniform, or L4 per grid item). This reframes composite grid-item background routing.

## Skills to Invoke
| Skill | When |
|-------|------|
| /autopilot | FIRST (SessionStart hook) — live routing + ADHD support |
| /brainstorming | ALWAYS — the L1-L4 grouping (2c) + the layer-model reframe (insight 3) are design decisions |
| /systematic-debugging | root-cause each layer's routing before any fix |
| /gap-analysis | grade outputs before delivery |
| /lifecycle | before any skill/agent/pipeline change |
| /strategic-plan | order the layer-by-layer build |
| /dispatching-parallel-agents | read-only per-layer/per-block investigators (fixes = SOLO, STOP-39) |
| /qc-council | pre-commit on any converter/wrapper/shared change (blub 255) |
| /sgs-db /wp-blocks /sgs-clone | DB ground truth + LANDED runs |
| /verify-loop /handoff /capture-lesson | 2-attestation / session close |

## Tool bindings
| Tool | For |
|------|-----|
| Playwright / chrome-devtools | LANDED computed-style by CONTENT at 375/768/1440 on page 8 |
| `python ~/.claude/hooks/wp-blocks.py schema <slug>` + `sgs-db.py sql` | container attrs/supports/roster (never hardcode counts) |
| `node plugins/sgs-blocks/scripts/parity/computed-parity.js` | honest parity (Stage 11.6; D2 not deployed) |
| PowerShell `npm run build` → `build-deploy.py --target sandybrown --skip-build --allow-dirty` | deploy (bump block version on CSS change — STOP-57) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| Explore / general-purpose (read-only, parallel OK) | per-layer cascade tracers, per-block audits |
| solo general-purpose coding subagent (foreground) | agreed fixes — ONE at a time, named files, spawn-no-agents |
| wp-sgs-developer | block-side work (settings additions, wrapper changes) |
| design-reviewer | visual QA of a fixed layer at breakpoints |

## First action
Complete the READING GATE + pre-flight ritual (answers in your first message), then start Step 1a — enumerate `sgs/container` + the shared wrapper's full setting/CSS surface (`/sgs-db block sgs/container` + read `class-sgs-container-wrapper.php` + `ContainerWrapperControls.js` in full). Smallest first action: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (verify D-ceiling D282 before any new D). Go SLOW — Bean agrees each step before the next.

## Methodology guardrails (do not skip)
- Tests from cwd `plugins/sgs-blocks/scripts`: `python -m pytest orchestrator/test_css_router.py converter/tests cheat-gate/tests tests/test_converter_conformance.py ledger/tests db-consistency/tests -q --import-mode=importlib` (872 baseline) + gates (cheat-gate/run.py --check + converter/gates/*.py) exit 0.
- **Deploy before measure (STOP-21) + bump block version on CSS change (STOP-57).** Build via PowerShell.
- **/qc-council (or 2-rater) before every commit** touching converter/wrapper/shared-block (blub 255) — then fact-check the council (STOP-15/45).
- **Prove the premise on the real node (STOP-43)** before + after every converter change.
- **Visual-diff gate:** a block style.css/render visual change needs `reports/visual-diff/<block>-YYYY-MM-DD.md` (verdict PASS + first_paint_capture_passed:true); a block.json-META-only change uses `--no-verify` (STOP-59).
- Every fix LANDED on page 8 (computed-by-content + Bean eye); parity content 96 / CSS 70-71-71 must not regress; D2 stays NOT-deployed.
- Branch main; verify D-ceiling (D282); commits path-scoped; push after every green fix.
