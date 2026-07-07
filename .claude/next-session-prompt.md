---
doc_type: next-session-prompt
project: small-giants-wp
thread: the container L1-L4 cascade — WIRE the L4 per-area extraction (the hero padding) + residual render-precedence (Bean-set at the D289 close, 2026-07-07)
generated: 2026-07-07
primary_goal: "The container L1-L4 cascade. HEADLINE: WIRE the L4 per-area extraction so a composite area-wrapper's box-CSS routes to its per-area attrs (content->contentPadding*) — this lands the hero content PADDING (the visible 'cramped left' defect). Root cause PROVEN D289: L4 is UNWIRED — nothing sets ctx.area_name, so grid_area resolver + attr_for_area_property never fire, and .sgs-hero__content's box-CSS is never collected. Once wired, the padding routes class-scoped and the D289 residual overrides at equal specificity. ALSO fold in: the residual render-precedence (STOP-64 — wrapper-class residual can't beat an ID-scoped block rule). Bean's agenda: understand-first (map -> group L1-L4 -> prove universal -> explain simply -> layer-by-layer test); needs L1-3 working first + must work for ALL block types."
---

# NEXT SESSION — the container L1-L4 cascade: WIRE the L4 per-area extraction (hero padding) + residual render-precedence

Invoke /autopilot first. THIS session = the **container L1-L4 cascade**, headlined by **wiring the L4 per-area extraction** so the hero content padding finally lands (Bean directive at the D289 close).

**Agent identity.** SGS cloning-pipeline engineer for the container L1-L4 layer model + the L4 per-area extraction wiring. Prove every premise on the REAL draft node + live DOM (STOP-43); LANDED on page 8 before "done" (STOP-21); one solo coding subagent at a time (STOP-39). Shared-mechanism / walker changes need a pre-build design-gate + Bean approval (Rule 7).

**State recap (plain English).** D289 SHIPPED + LANDED (`9a22b6f2`): the **universal responsive breakpoint router** — a draft `@media` rule now routes by breakpoint CLASS for every element of every block (device-tier 768/1024 → the block's `*Tablet`/`*Mobile`/base attrs; non-device 600/640/1280 → the block's `sgsCustomCss` Additional-CSS). Proven: hero h1 52px at 768/1024 (was 58); ingredients/gift/social non-device breakpoints captured (were dropped). BUT the visible hero content PADDING still doesn't land — root cause PROVEN this session: the **L4 per-area extraction is UNWIRED for composites**. Nothing in the live pipeline sets `ctx.area_name`, so `layer_detect` never returns `GRID_AREA`, the `grid_area` resolver + `attr_for_area_property` (which DO map `content`→`contentPadding*`) never fire, and `.sgs-hero__content`'s box-CSS is never even collected (it's a Branch-C slug-None content wrapper, descended for content only). `route_area_css_to_block_attrs` (`fold_helpers.py:247`) EXISTS but is unwired (zero callers) — the wiring may reuse it. Once L4 is wired, the padding routes to `contentPadding*` (class-scoped `.uid .sgs-hero__content`, 0,2,0) and the D289 residual overrides at equal specificity + append. ALSO fold in: the residual render-precedence limitation (STOP-64 — the wrapper-class residual can't override an ID-scoped block rule like the typography helper `#sgs-hdg`; same per-block render-specificity problem class).

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes.
2. **NO CHEATS** — no hardcoded `!important`/default overriding faithful draft CSS, no hand-declared per-block/per-draft selectors, no client copy baked into a base block, no per-slug/per-slot/per-role literal in a resolver body.
3. **UNIVERSAL, no carve-outs** — a fix fires for every qualifying block/case; universal signal = a DB fact, never `if slug == X`.
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone at 375/768/1440. Emit-green ≠ LANDED. WRITTEN ≠ LANDED. "Deploy to homepage" = overwrite page 8, never a new page.
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS** (except the deliberate Additional-CSS channel for non-device breakpoints — STOP-52).
7. **FOLLOW THE SPEC IN EVERY DETAIL** — Spec 31 settled authority; where silent, pin the smallest spec-consistent rule + write it INTO the spec. **Shared-mechanism / DB-schema changes need a pre-build design-gate + Bean approval.**

## Mandatory READING (tick each in your first message; verify against ground truth)
1. [ ] `.claude/handoff.md` top entry (2026-07-07, D289) + `.claude/decisions.md` head (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — was D289 at write time).
2. [ ] `.claude/parking.md` — `P-HERO-PADDING-L4-WIRING` (the headline) + `P-RESIDUAL-RENDER-PRECEDENCE` (STOP-64) + `P-HERO-SUB-MAXWIDTH-NESTED-CHILD`.
3. [ ] `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` IN FULL (Bean-locked, extends STOP-26) — §2 layer model, §2.9 Axis 1 L1-L4 (L4 GRID-PER-AREA row), §3.A + §13.4 CSS routing (F-fork RATIFIED D289), §13.6 composite-mirror. Note the historical MF-5 finding "attr_for_area_property has NO converter call-site — L4 unwired" (STILL TRUE — this session's job).
4. [ ] The L4 extraction path (the wiring surface): `converter/resolvers/grid_area.py` (resolve — fires only on `ctx.area_name` + `GRID_AREA` layer), `converter/services/layer_detect.py` (returns GRID_AREA only when area_name set), `converter/recognition.py::build_ctx` (OMITS area_name — the gap), `converter/services/fold_helpers.py::route_area_css_to_block_attrs` (EXISTS, unwired, zero callers), `converter/services/extraction.py` ~672 (Branch-C slug-None content wrapper — descended for content only, box-CSS never collected), `converter/db/db_lookup.py::attr_for_area_property`.
5. [ ] The hero: `plugins/sgs-blocks/src/blocks/hero/{render.php,style.css,block.json}` — `supports.sgs.gridAreas:["content","media"]`, the contentPadding* system (render.php ~499-521, class-scoped `.uid .sgs-hero__content`) + the draft `.sgs-hero__content` responsive padding (mockups/homepage/index.html:258/294/310).
6. [ ] `CLAUDE.md` §"Composite-mirror rule" + §"Responsive breakpoint discipline — device-tier vs visual" + the D289 spec §13.4 render-precedence caveat (residual overrides class-scoped, NOT ID-scoped — STOP-64).

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE (Spec 31 IN FULL + handoff + D-ceiling + the converter CSS-routing + the hero contentPadding system)? Quote one specific thing to prove it.
2. What branch + D-ceiling? (`git branch --show-current` → main; ceiling D289 — verify.) Working tree clean (ignore the 0-byte stray `sgs-framework.db`)?
3. For every fix: premise proven on the REAL draft node BEFORE + AFTER (STOP-43), gated on the REAL page 8 (computed values + Bean eye), never emit alone?
4. Baselines I must not regress: converter suite green except the 4 pre-existing known-golden failures (brand/featured-product/option-picker/product-card — do NOT re-seed them, other threads' debt); block gates exit 0; the D289 router + D288 button/hero LANDED state unaffected.
5. Subagents: read-only raters parallel OK; FIX work = ONE solo coding subagent, foreground, named files, spawn-no-agents; I verify every edit + re-run tests/gates myself (STOP-16/39).
6. Shared-mechanism / DB-schema change ahead (converter routing, a new responsive attr family, `sgsCustomCss` plumbing)? → pre-build design-gate + Bean approval (Rule 7).

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward; do NOT subtract — D101 rule)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, the raw artefacts.
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.**
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Grep the wiring + confirm it RUNS.
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints** (768/1024 vs 600/640/781/1280). THIS SESSION'S CORE DISTINCTION.
- **STOP-10 — Empty cloned section = usually a soft-fail** — read extract.json + trace.jsonl first; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column exists is necessary-not-sufficient; grep how it's WRITTEN and READ.
- **STOP-15 — A council/analysis/subagent finding is a HYPOTHESIS.** FACT-CHECK it against ground truth before acting. When two raters DISAGREE, resolve by tracing yourself.
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + gates YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`).
- **STOP-21 — LANDED-proven only by deploying the GENUINE emit to a live page + computed-style/innerText.** Re-clone recipe: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8 --skip-autonomy-gate` → OPcache reset (HTTP) → anonymous chrome-devtools/Playwright. Creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **STOP-23 — Run a pre-commit `/qc-council` (or 2-rater review) on BUILT converter/block code** (blub 255). Verify input-class ≠ output-class; render reads the attr you write AND PAINTS the element you check.
- **STOP-24 — A DB change a reseed RE-DERIVES must use a reseed-surviving channel** (block.json / dated migration / `sgs-update` seeder / ATTR_CLASSIFICATION_OVERRIDES), never a manual DB edit.
- **STOP-26 — Read the WHOLE target spec section holistically before building.** (Extended: read Spec 31 IN FULL every session.)
- **STOP-27 — A conservation/regression guard is `raise`, NEVER a bare `assert`.**
- **STOP-28 — entry.py's failure contract is LOUD** (`status:'failed'` + reason) — never re-add a silent fallback.
- **STOP-31 — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context; plant-test it.**
- **STOP-32 — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped"** (native supports→style.*, custom attrs, wrapper render, spec destination).
- **STOP-34 — SYNTHETIC-FIXTURE-GREEN ≠ REAL-DRAFT-CORRECT.** Reproduce on the FULL real draft.
- **STOP-35 — DEFAULT-IS-CONTAINER: a slug-None class-section defaults to `sgs/container` + recurse; it does NOT fail.**
- **STOP-38 — A section-outer/wrapper fix scoped to ONE slug is an R-31-9 carve-out CHEAT.** Fire on a DB signal, never a slug literal.
- **STOP-39 — PARALLEL coding subagents interfere/revert each other; a SOLO coding subagent is optimal.** ONE implementer at a time, foreground, named files, "do the work yourself, spawn no agents"; read-only analysis/Explore agents may run in parallel.
- **STOP-40 — Don't declare a section "fixed" from seeing a grid + N items.** Check the RENDERED result vs the DRAFT's actual layout at 375/768/1440.
- **STOP-41 — the `no_slug_literal` gate guards `role`/`slot`/`canonical_slot` AND `mod`/`_mod`/`modifier`.**
- **STOP-42 — PARITY = computed values matched by CONTENT, never source-declaration-diff, never wrapper-class-keying.** Use `parity/computed-parity.js` (Stage 11.6).
- **STOP-43 — PROVE THE PREMISE ON THE REAL NODE, not code inference.** Before designing OR committing a converter/block fix, REPRODUCE by RUNNING the engine / inspecting the live DOM on the real draft node BEFORE + AFTER.
- **STOP-44 — A schema-valid, EMITTED attr can still be a RENDER no-op.** Verify the class/style PAINTS on the LIVE element (WP core does not reliably apply a native support onto a dynamic/naked element).
- **STOP-45 — A "regenerated-from-ground-truth" doc is still a HYPOTHESIS.** QC every regenerated/synthesised doc against the scripts.
- **STOP-46 — An in-code allowlist duplicating a DB fact is the R-31-1 drift pattern.** "Which properties/attrs/blocks/roles are in scope" = a (cached) DB membership query.
- **STOP-47 — `git stash` proves NOTHING about DB-state-dependent behaviour.**
- **STOP-48 — A "dead output" claim is SCOPE-RELATIVE.** Before retiring any output/function, grep ALL consumers.
- **STOP-49 — The MEASUREMENT INSTRUMENT is itself QC-able code.** When a number contradicts the eye, audit the instrument's element collection + pairing BEFORE trusting the number.
- **STOP-50 — A cheat can evade a gate by SHAPE; a gate's identifier/scope vocabulary is a blind-spot surface.**
- **STOP-51 — A #uid-scoped rule is DEAD unless the element actually carries the id.** Verify the LIVE element carries the hook attribute.
- **STOP-52 (Bean doctrine) — The page must NEVER DEPEND on non-block-settings CSS emitted by the pipeline.** Everything a client can set must BE in block settings (odd draft breakpoints → the block's `sgsCustomCss`/Additional-CSS field). THIS SESSION builds the routing that enforces this.
- **STOP-53 (D280) — Replacing a working name-guess resolver with a declarative DB column: DON'T mass-reverse-derive.** Seed ONLY the correcting subset, read column-first-else-fallback.
- **STOP-54 (D280) — Enabling a block capability flag wakes EVERY attr it gates.** Pre-audit each block for latent mis-seeds + selector drift + child-owned dead lifts before flipping.
- **STOP-55 (D282) — A test can CODIFY A BUG as intended behaviour.** When a LANDED-proven fix breaks such a test, UPDATE the test to the correct behaviour; the LANDED live-DOM result is the arbiter.
- **STOP-56 (D282) — A D228 hardcoded default can HIDE behind another attr's override.** When removing an override/dedup, check what STYLE.CSS default it was masking + fix the root default too.
- **STOP-57 (D282) — Redeploying the SAME block version with changed CSS serves STALE via the CDN.** Bump the block version on EVERY CSS change.
- **STOP-58 (D282) — Stage-1 reseed does NOT prune orphaned attr rows.** A manual DB prune is durable; or run the full 10-stage `/sgs-update`.
- **STOP-59 (D282) — The visual-diff commit gate blocks a block.json-META-only commit.** For a pure schema change the gate itself instructs `git commit --no-verify` (STOP-59 sanctioned path). A style.css/render VISUAL change needs `reports/visual-diff/<block>-YYYY-MM-DD.md` (`verdict: PASS` + `first_paint_capture_passed: true`).
- **STOP-60 (D286/D287) — Do NOT re-run a golden SEED script to "make the suite green".** The seed script bypasses its own LANDED-proof gate when run bare; it re-seeds ALL 40 goldens and enshrines OTHER threads' unverified emit. Re-seed a golden ONLY deliberately, per-section, with a cited LANDED proof, for emit changes YOU own.
- **STOP-61 (D287) — A resolver FIX (var-resolution) is not the same as the LIFT that feeds it.** P-DRAFT-CSSVAR resolves `var(--X)`, but the ghost button won't LOOK fixed until the SEED that lifts `border-color→colourBorder` is re-added. Verify the value is actually LIFTED onto the attr, not just that the resolver would resolve it.
- **STOP-62 (NEW, D288) — When a wrapper element is REMOVED and its role moves onto a child, reconcile EVERY descendant scoped selector.** Removing the button `<div>` broke `#uid .sgs-button` (descendant) — the `.sgs-button` was no longer a descendant of `#uid`; it became `#uid` itself → `#uid.sgs-button`. Enumerate every `#uid <space> .X` scoped rule and collapse the space where X moved onto the root; keep the space for genuine descendants (icon/label).
- **STOP-63 (D288) — "Apply/control does nothing" can be a PREVIEW-RENDERING bug, not a handler bug.** The button preset handler wrote the right attrs, but the editor preview applied token SLUGS as raw CSS (invalid → browser drops them) so nothing visibly changed. When a user reports "X does nothing", verify whether the ATTR changed (handler works) separately from whether the PREVIEW/render RESOLVES the value (slug→colour). Bean's live report is ground truth over a static code-trace (STOP-15).
- **STOP-64 (NEW, D289) — a wrapper-CLASS Additional-CSS residual CANNOT override an ID-scoped block render rule; verify the residual PAINTS (STOP-44 extension).** The D289 `sgsCustomCss` residual is a class rule (`.sgs-c-hash`, 0,1,0) appended by `custom-css.php`; it wins over EQUAL-specificity class-scoped block rules but LOSES to an ID-scoped rule (`#uid`, e.g. the typography helper `#sgs-hdg .heading__text{font-size}`, 1,1,0) regardless of source order. Proven live: hero h1 ≥1280 stays 52 not the residual's 58. An emitted+captured residual is a progress signal, NOT a paint guarantee — check the LIVE computed value at the residual's breakpoint. Class-scoped properties (the hero content padding via `.uid .sgs-hero__content`) are unaffected and DO win.

---

## ORCHESTRATION PLAN (do in ORDER; each gated by Bean's agreement on the design before build — Rule 7) Only plan 1 at a time.

### Task A — WIRE the L4 per-area extraction (lands the hero content PADDING) — the headline
**What:** Wire the composite L4 per-area box-CSS extraction so a composite area-wrapper's own box-CSS (padding/background/etc.) is COLLECTED and routed to its per-area attrs (`content`→`contentPadding*`, `media`→`mediaBackground`…). The machinery EXISTS (`grid_area.py::resolve`, `attr_for_area_property`, `route_area_css_to_block_attrs` at `fold_helpers.py:247`) but is UNWIRED — nothing sets `ctx.area_name` (`recognition.py::build_ctx` omits it), so `layer_detect` never returns `GRID_AREA` and the `.sgs-hero__content` wrapper's box-CSS is never collected (it's a Branch-C slug-None wrapper at `extraction.py:672`, descended for content only). MF-5 still true. This is a HIGH-BLAST-RADIUS walker change → design-gate with Bean BEFORE building (Rule 7). Must be UNIVERSAL (a DB/structural signal — `block_composition.container_kind` + `gridAreas` — never per-slug), working for ALL composite block types, not a hero carve-out.
**Why:** the hero content is cramped LEFT on desktop because the draft's `.sgs-hero__content` padding (`28/20/40` base, `56/48` @≥768, `72/64` @≥1280) is never transferred. Concrete acceptance: live page-8 hero content padding = `28/20/40` at 375, `56/48` at 768-1279 (via `contentPadding*` base/tablet attrs), `72/64` at ≥1280 (via the D289 `sgsCustomCss` residual, which — because contentPadding is class-scoped `.uid .sgs-hero__content` (0,2,0) — WILL win at equal specificity + append). Content no longer left-cramped.
**Orchestration:** understand-first (map how a composite area-wrapper flows through the walk → design the area_name assignment + CSS collection → design-gate with Bean). Read-only investigators parallel OK; then ONE solo coding subagent (STOP-39). Depends on: none (D289 router already shipped + feeds it). /qc gate: `/qc-council` (blub 255) on the built walker change + LANDED page 8. Re-clone to verify (STOP-21).
**Acceptance:** hero content padding matches the draft at every tier on live page 8 (375/768/1024/1280/1440); the per-area extraction fires universally (DB signal, not a slug); no regression to the D289 router or existing sections; Spec 31 §2.9 (L4 row) + MF-5 reconciled with what shipped.

### Task B — Residual render-precedence (STOP-64) + prove L1-L4 universal across examples
**What:** (1) Reconcile the residual render-precedence so an ID-scoped block property (typography helper `#sgs-hdg`) can be overridden by its non-device residual (currently the wrapper-class residual loses — hero h1 ≥1280 stays 52 not 58); `P-RESIDUAL-RENDER-PRECEDENCE`. (2) Prove L1-L4 universality across the Mama's + Indus examples, layer-by-layer; close `P-HERO-SUB-MAXWIDTH-NESTED-CHILD` (`.sgs-hero__sub{max-width:420px}`→`sgs/text` child never SET).
**Why:** container standardisation — every wrapper mirrors `sgs/container`; faithful transfer of the layer model + the residual across composites. Measurable: the L1-L4 layers + the ID-scoped residuals land faithfully on live page-8 sections at 375/768/1440 (computed-style + Bean eye).
**Orchestration:** Bean's slow understand-first agenda (map → group L1-L4 → prove universal → explain simply → layer-by-layer test). Read-only investigators parallel OK; solo coding subagent per fix. Depends on: Task A (same per-block render-specificity problem class). /qc gate: `/qc-council` per converter commit + LANDED.
**Acceptance:** the ID-scoped residual paints (hero h1 ≥1280 = 58); L1-L4 proven universal across examples; the nested-child max-width closed + LANDED; Spec 31 §2/§2.9 reconciled.

### Dependency graph
```
Task A (WIRE L4 per-area extraction; design-gate → solo subagent → re-clone) → /qc-council + LANDED page 8
  ↓
Task B (residual render-precedence STOP-64 + L1-L4 universality; solo subagent per fix) → /qc-council per commit + LANDED
  ↓ commit path-scoped + push per green fix
```

## Skills to Invoke
| Skill | When |
|-------|------|
| /autopilot | FIRST (SessionStart hook) — live routing + ADHD support |
| /brainstorming | ALWAYS — the responsive-routing design + L1-L4 universality are design decisions |
| /gap-analysis | ALWAYS — grade outputs before delivery |
| /lifecycle | ALWAYS — before any skill/agent/pipeline change |
| /research | ALWAYS — auto-routes tier |
| /strategic-plan | ALWAYS — order Task A then Task B |
| /systematic-debugging | root-cause the padding non-transfer on the real node before any fix |
| /sgs-clone /sgs-wp-engine /wp-blocks /sgs-db | cloning-pipeline + SGS ground truth (query variant_slots/property_suffixes, never guess) |
| /qc-council /qc-inline | pre-commit on every converter/pipeline/block change (blub 255) |
| /verify-loop /handoff /capture-lesson | 2-attestation / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright / chrome-devtools | LANDED computed-style at 375/768/1024/1280/1440 on page 8 |
| `python ~/.claude/hooks/wp-blocks.py schema <slug>` + `sgs-db.py sql` | block attrs/supports + property_suffixes/variant_slots (never hardcode) |
| PowerShell `npm run build` → `build-deploy.py --target sandybrown --skip-build --blocks-only --allow-dirty` | deploy (bump block version on CSS change — STOP-57); re-clone via sgs-clone-orchestrator (STOP-21) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| Explore / general-purpose (read-only, parallel OK) | converter CSS-routing + hero contentPadding tracing; L1-L4 example mapping |
| solo general-purpose coding subagent (foreground) | each agreed fix — ONE at a time, named files, spawn-no-agents |
| wp-sgs-developer | converter/pipeline routing build |
| design-reviewer | visual QA of the fixed hero + L1-L4 sections at breakpoints |

## Methodology guardrails (do not skip)
- **Deploy + re-clone before measure (STOP-21) + bump block version on CSS change (STOP-57).** Build via PowerShell.
- **Prove the premise on the real node (STOP-43)** before + after; LANDED on page 8 (computed-by-content + Bean eye), never emit alone.
- **Device-tier vs arbitrary-breakpoint is the core classification (STOP-8/52)** — 768/1024 → attrs; everything else → `sgsCustomCss`. Classify BEFORE routing; if unsure, leave it.
- **/qc-council before every commit** touching converter/pipeline/block (blub 255) — then fact-check the council (STOP-15/45).
- **Do NOT re-seed goldens** (STOP-60) or "fix" the known-golden failures (brand debt + the closed D284/D285 thread's).
- Branch main; verify D-ceiling (D288); commits path-scoped; push after every green fix.
- **Root cause before instance fix** — the padding non-transfer is a CLASS (responsive routing), not a per-hero patch.
