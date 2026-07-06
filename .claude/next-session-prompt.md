---
doc_type: next-session-prompt
project: small-giants-wp
thread: BUTTON WORK ONLY (Bean-set at the D287 close, 2026-07-06). Container L1-L4 cascade resumes the session AFTER.
generated: 2026-07-06
primary_goal: "Rebuild/repair the SGS button + multi-button so cloned buttons behave like the draft: (1) remove the pointless intermediate <div> between the multi-button block and the <a> so the <a> is the DIRECT flex child and align-items:stretch gives full-width-on-mobile-stack automatically; (2) fix the broken editor presets (Apply does nothing); (3) replace the atrocious colour controls (plain hex/preset text box) with a proper DesignTokenPicker + global-palette quick-choices. BUTTON WORK ONLY this session."
---

# NEXT SESSION — BUTTON WORK ONLY (button + multi-button rebuild/repair)

Invoke /autopilot first. **Scope is LOCKED to the button + multi-button blocks this session (Bean directive).** Do NOT touch the container L1-L4 cascade — that resumes the session AFTER this one (its agenda is preserved in `.claude/prompts/` + the D282/D287 handoff history).

**Agent identity.** SGS block builder-diagnostician for the button + multi-button blocks. Prove every premise on the REAL draft node + live DOM (STOP-43); LANDED on page 8 before "done" (STOP-21); one solo coding subagent at a time (STOP-39).

**State recap (plain English).** Two things shipped last session (media converge D286 `9a4f6ca1` + colour-var resolution D287 `fff4c475`, both pushed, LANDED). A parallel session owns the product-card/scalar-lift thread (D284/D285) — leave it alone. Bean then found the button problems: cloned buttons **stack** on mobile but do NOT go **full-width** (the draft does). Root cause Bean found: the draft is `multi-button-wrapper → <a>` directly, but the SGS output inserts an extra **`<div>` section between the multi-button block and the `<a>`** — so the flex `align-items:stretch` (which makes column-flex items full-width) hits the div, not the button. Also: the editor **presets are broken** (Apply does nothing) and the **colour controls are a plain text box** (type a hex or a preset name) with no colour picker and no global-palette quick-choices.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes.
2. **NO CHEATS** — no hardcoded `!important`/default overriding faithful draft CSS, no hand-declared per-block/per-draft selectors, no client copy baked into a base block, no per-slug/per-slot/per-role literal in a resolver body.
3. **UNIVERSAL, no carve-outs** — a fix fires for every qualifying block/case; universal signal = a DB fact, never `if slug == X`.
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone at 375/768/1440. Emit-green ≠ LANDED. WRITTEN ≠ LANDED. "Deploy to homepage" = overwrite page 8, never a new page.
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **FOLLOW THE SPEC IN EVERY DETAIL** — Spec 31 settled authority; where silent, pin the smallest spec-consistent rule + write it INTO the spec. **Shared-mechanism / DB-schema changes need a pre-build design-gate + Bean approval.**

## Mandatory READING (tick each in your first message; verify against ground truth)
1. [ ] `.claude/handoff.md` top entry (2026-07-06f, D286/D287) + `.claude/decisions.md` head (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — was D287 at write time).
2. [ ] The button block: `plugins/sgs-blocks/src/blocks/button/{block.json,edit.js,save.js,render.php,style.css}` IN FULL.
3. [ ] The multi-button block: `plugins/sgs-blocks/src/blocks/multi-button/{block.json,edit.js,render.php,style.css}` IN FULL — note it routes through `SGS_Container_Wrapper::render(..., 'content', ...)` (render.php:130).
4. [ ] `plugins/sgs-blocks/CLAUDE.md` §Block Customisation Standard (TypographyControls + DesignTokenPicker mandate) + the shared `src/components/` (DesignTokenPicker, ResponsiveControl, TypographyControls).
5. [ ] `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` §2 (layer model) + §13.3 (content fork) — the button-as-child-of-multi-button routing.
6. [ ] The live page 8 (creds `.claude/secrets/sandybrown.env`): inspect the hero CTA DOM — confirm the extra `<div>` between `.sgs-multi-button` and the `<a>`.

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE (button + multi-button files IN FULL + handoff + D-ceiling)? Quote one specific thing to prove it.
2. What branch + D-ceiling? (`git branch --show-current` → main; ceiling D287 — verify.) Is the working tree clean (note the parallel-thread `scalarStylingLift`/db changes are NOT mine)?
3. For every fix: premise proven on the REAL draft node BEFORE + AFTER (STOP-43), gated on the REAL page 8 (computed values + Bean eye), never emit alone?
4. Baselines I must not regress: converter suite green except the 4 known-golden failures (do NOT re-seed them under this thread); block gates exit 0; media D286 + P-DRAFT-CSSVAR D287 unaffected.
5. Subagents: read-only raters parallel OK; FIX work = ONE solo coding subagent, foreground, named files, spawn-no-agents; I verify every edit + re-run tests/gates myself (STOP-16/39).
6. Shared-mechanism / DB-schema change ahead (SGS_Container_Wrapper, the multi-button↔button structure)? → pre-build design-gate + Bean approval (Rule 7).

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward; do NOT subtract — D101 rule)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, the raw artefacts.
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.**
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Grep the wiring + confirm it RUNS.
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints** (768/1024 vs 600/640/781).
- **STOP-10 — Empty cloned section = usually a soft-fail** — read extract.json + trace.jsonl first; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column exists is necessary-not-sufficient; grep how it's WRITTEN and READ.
- **STOP-15 — A council/analysis/subagent finding is a HYPOTHESIS.** FACT-CHECK it against ground truth before acting. When two raters DISAGREE, resolve by tracing yourself.
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + gates YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`).
- **STOP-21 — LANDED-proven only by deploying the GENUINE emit to a live page + computed-style/innerText.** Re-clone recipe: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8 --skip-autonomy-gate` → OPcache reset (HTTP) → anonymous chrome-devtools/Playwright. Creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **STOP-23 — Run a pre-commit `/qc-council` (or 2-rater review) on BUILT converter/block code** (blub 255). Verify input-class ≠ output-class; render reads the attr you write AND PAINTS the element you check.
- **STOP-24 — A DB change a reseed RE-DERIVES must use a reseed-surviving channel** (block.json / dated migration / `sgs-update` seeder / ATTR_CLASSIFICATION_OVERRIDES), never a manual DB edit.
- **STOP-26 — Read the WHOLE target spec section holistically before building.**
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
- **STOP-52 (Bean doctrine) — The page must NEVER DEPEND on non-block-settings CSS emitted by the pipeline.** Everything a client can set must BE in block settings (odd draft breakpoints → the block's `sgsCustomCss` field, Bean decision).
- **STOP-53 (D280) — Replacing a working name-guess resolver with a declarative DB column: DON'T mass-reverse-derive.** Seed ONLY the correcting subset, read column-first-else-fallback.
- **STOP-54 (D280) — Enabling a block capability flag wakes EVERY attr it gates.** Pre-audit each block for latent mis-seeds + selector drift + child-owned dead lifts before flipping.
- **STOP-55 (D282) — A test can CODIFY A BUG as intended behaviour.** When a LANDED-proven fix breaks such a test, UPDATE the test to the correct behaviour; the LANDED live-DOM result is the arbiter.
- **STOP-56 (D282) — A D228 hardcoded default can HIDE behind another attr's override.** When removing an override/dedup, check what STYLE.CSS default it was masking + fix the root default too.
- **STOP-57 (D282) — Redeploying the SAME block version with changed CSS serves STALE via the CDN.** Bump the block version on EVERY CSS change.
- **STOP-58 (D282) — Stage-1 reseed does NOT prune orphaned attr rows.** A manual DB prune is durable; or run the full 10-stage `/sgs-update`.
- **STOP-59 (D282) — The visual-diff commit gate blocks a block.json-META-only commit.** For a pure schema change the gate itself instructs `git commit --no-verify` (STOP-59 sanctioned path). A style.css/render VISUAL change needs `reports/visual-diff/<block>-YYYY-MM-DD.md` (`verdict: PASS` + `first_paint_capture_passed: true`).
- **STOP-60 (NEW, D286/D287) — Do NOT re-run a golden SEED script to "make the suite green".** The seed script bypasses its own LANDED-proof gate when run bare; it re-seeds ALL 40 goldens and enshrines OTHER threads' unverified emit. Re-seed a golden ONLY deliberately, per-section, with a cited LANDED proof, for emit changes YOU own.
- **STOP-61 (NEW, D287) — A resolver FIX (var-resolution) is not the same as the LIFT that feeds it.** P-DRAFT-CSSVAR resolves `var(--X)`, but the ghost button won't LOOK fixed until the SEED that lifts `border-color→colourBorder` is re-added. Verify the value is actually LIFTED onto the attr, not just that the resolver would resolve it.

---

## ORCHESTRATION PLAN — BUTTON WORK (do in ORDER; each gated by Bean's agreement on the design before build — Rule 7)

### Task 1 — Remove the pointless `<div>` so the `<a>` is the DIRECT flex child (fixes mobile full-width stretch)
**What:** In the SGS clone, a multi-button emits `multi-button → <div> → <a>`; the draft is `multi-button → <a>` directly. The intermediate `<div>` is the flex item, so `align-items:stretch` (which makes column-flex items full-width on mobile) stretches the div, not the button, and the `<a>` inside stays content-width. Rebuild so the `<a>` (or the button block's own wrapper) is the DIRECT child of the multi-button flex container.
**Why:** cloned CTAs must stack **full-width** on mobile like the draft (pure CSS `align-items:stretch` on a column flex — no width attr needed once the div is gone). Measurable: live page 8, hero CTAs render full-container-width at 375px, content-width at ≥768px.
**Orchestration:** Execution = inline design/investigation, then ONE solo subagent for the build (STOP-39). First INSPECT the live DOM + the button/multi-button render.php to find WHERE the extra div comes from (button block's own wrapper? save.js? the InnerBlocks render?). Prove on the real node (STOP-43). Depends on: none. /qc gate after: `/qc-inline` + LANDED.
**Acceptance:** live hero CTAs full-width-stacked at 375, content-width row at ≥768; no intermediate div between `.sgs-multi-button` and the `<a>`; other button uses (standalone, in cards) unregressed.

### Task 2 — Fix the broken editor presets (Apply does nothing)
**What:** In the button/multi-button editor, the style-preset dropdown + Apply button don't work — pressing Apply has no effect. Diagnose (does Apply write the attrs? does the render read them? is the handler wired?) and fix.
**Why:** clients pick a preset + Apply to style buttons; broken = unusable. Measurable: in the block editor, selecting a preset + Apply visibly restyles the button (+ the attrs persist on save).
**Orchestration:** inline diagnose (read edit.js preset/apply handler + block.json preset attrs), then solo subagent build. Depends on: none (parallel with Task 1 is OK — different concern, but same files → do SEQUENTIALLY to avoid the same-file churn). /qc gate: editor functional test (Playwright editor login, creds in `.claude/secrets/sandybrown.env`).
**Acceptance:** preset + Apply restyles the button in the editor AND the frontend, verified live.

### Task 3 — Replace the colour text-boxes with DesignTokenPicker + palette quick-choices
**What:** The button colour settings are a plain `TextControl` (type a hex or a preset name). Replace every button colour control with the shared **`DesignTokenPicker`** (colour picker + global theme-palette quick-choices) — matching the Block Customisation Standard (`plugins/sgs-blocks/CLAUDE.md`).
**Why:** clients can't type hex codes / preset names — they need to click a swatch. Measurable: every button colour control shows the palette swatches + a picker, writes the same attr the render reads (keep the dead-control + hardcoded-default gates green).
**Orchestration:** solo subagent build; use the existing `DesignTokenPicker` from `src/components` (do NOT hand-roll). Depends on: none. /qc gate: editor visual check + `check-dead-controls.js` exit 0.
**Acceptance:** all button colour controls use DesignTokenPicker with palette quick-choices; render reads the written attr; gates 0.

### Dependency graph
```
Task 1 (inline design + solo subagent)  →  /qc-inline + LANDED page 8
Task 2 (solo subagent — SEQUENTIAL after 1; shares button files)  →  editor functional test
Task 3 (solo subagent — after 2)  →  editor visual + dead-control gate
  →  /qc-council pre-commit (blub 255)  →  commit path-scoped + push
```

## Skills to Invoke
| Skill | When |
|-------|------|
| /autopilot | FIRST (SessionStart hook) — live routing + ADHD support |
| /brainstorming | ALWAYS — the div-removal + preset + colour-control design are design decisions |
| /gap-analysis | ALWAYS — grade outputs before delivery |
| /lifecycle | ALWAYS — before any skill/agent/pipeline change |
| /research | ALWAYS — auto-routes tier (e.g. WP block editor DesignTokenPicker patterns) |
| /strategic-plan | ALWAYS — order the 3 button tasks |
| /systematic-debugging | root-cause the extra div + the broken Apply before any fix |
| /sgs-wp-engine /wp-blocks /sgs-db | SGS block ground truth |
| /subagent-driven-development | the solo per-task implementer + review |
| /qc-council /qc-inline | pre-commit on button/render changes (blub 255) |
| /verify-loop /handoff /capture-lesson | 2-attestation / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright / chrome-devtools | LANDED computed-style at 375/768/1440 on page 8 + editor functional tests (preset Apply) |
| `python ~/.claude/hooks/wp-blocks.py schema <slug>` + `sgs-db.py sql` | button/multi-button attrs/supports (never hardcode) |
| PowerShell `npm run build` → `build-deploy.py --target sandybrown --skip-build --allow-dirty` | deploy (bump block version on CSS change — STOP-57) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| Explore / general-purpose (read-only, parallel OK) | button/multi-button render + editor tracing |
| solo general-purpose coding subagent (foreground) | each agreed fix — ONE at a time, named files, spawn-no-agents |
| wp-sgs-developer | block-side rebuild (multi-button structure, editor controls) |
| design-reviewer | visual QA of the fixed buttons at breakpoints |

## Methodology guardrails (do not skip)
- **Deploy before measure (STOP-21) + bump block version on CSS change (STOP-57).** Build via PowerShell.
- **Prove the premise on the real node (STOP-43)** before + after every change; LANDED on page 8 (computed-by-content + Bean eye), never emit alone.
- **/qc-council (or 2-rater) before every commit** touching button/multi-button/render (blub 255) — then fact-check the council (STOP-15/45).
- **Do NOT touch the container L1-L4 cascade** (deferred to the session AFTER) and **do NOT re-seed goldens** (STOP-60) or "fix" the 3 non-brand conformance failures (the parallel D284/D285 thread owns them).
- Branch main; verify D-ceiling (D287); commits path-scoped (button files only); push after every green fix.
- **Root cause before instance fix** — the extra div + the broken Apply are CLASSES of bug; find WHY (render structure / handler wiring) before patching the symptom.