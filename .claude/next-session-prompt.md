---
doc_type: next-session-prompt
project: small-giants-wp
thread: UNIVERSAL RESPONSIVE ROUTING → then the container L1-L4 cascade (Bean-set at the D288 close, 2026-07-07)
generated: 2026-07-07
primary_goal: "Build UNIVERSAL RESPONSIVE ROUTING for the cloning pipeline (CSS + content): (1) device-tier breakpoints (768/1024) route to the SGS device-tier responsive attrs (*Tablet/*Mobile) so they are proper editable block controls; (2) non-device/arbitrary breakpoints (e.g. 1280) route to the relevant block's Additional-CSS field (sgsCustomCss) per STOP-52. First concrete target: the cloned hero content LEFT-padding (draft 56px 48px @>=768 + 72px 64px @>=1280 vs clone 16px). THEN resume the container L1-L4 cascade deep-dive (Steps 3-6)."
---

# NEXT SESSION — universal responsive routing (device-tier → Additional-CSS), THEN the container L1-L4 cascade

Invoke /autopilot first. Two fronts THIS session, in order: (A) **universal responsive routing**, then (B) the **container L1-L4 cascade** deep-dive (Bean directive at the D288 close).

**Agent identity.** SGS cloning-pipeline engineer for the converter's responsive routing + the container L1-L4 layer model. Prove every premise on the REAL draft node + live DOM (STOP-43); LANDED on page 8 before "done" (STOP-21); one solo coding subagent at a time (STOP-39).

**State recap (plain English).** The D288 button session shipped + LANDED: buttons have no wrapper div, stack full-width on mobile, the colour controls are a linked palette picker, preset Apply visibly restyles, and the hero content is vertically centred on desktop. The parallel D284/D285 thread is CLOSED (its files were flushed in the D288 commit). ONE visible hero diff remains: on desktop the content hugs the LEFT edge (16px) where the draft wants 48-64px — because the converter does NOT transfer the draft's responsive `.sgs-hero__content` padding. Bean's fix = a UNIVERSAL responsive-routing design: device-tier breakpoints (768/1024) become SGS `*Tablet`/`*Mobile` block attrs; non-device breakpoints (1280 etc.) get pasted into the block's Additional-CSS field. Do that first (it fixes the hero padding + generalises), then resume the container L1-L4 cascade.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes.
2. **NO CHEATS** — no hardcoded `!important`/default overriding faithful draft CSS, no hand-declared per-block/per-draft selectors, no client copy baked into a base block, no per-slug/per-slot/per-role literal in a resolver body.
3. **UNIVERSAL, no carve-outs** — a fix fires for every qualifying block/case; universal signal = a DB fact, never `if slug == X`.
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone at 375/768/1440. Emit-green ≠ LANDED. WRITTEN ≠ LANDED. "Deploy to homepage" = overwrite page 8, never a new page.
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS** (except the deliberate Additional-CSS channel for non-device breakpoints — STOP-52).
7. **FOLLOW THE SPEC IN EVERY DETAIL** — Spec 31 settled authority; where silent, pin the smallest spec-consistent rule + write it INTO the spec. **Shared-mechanism / DB-schema changes need a pre-build design-gate + Bean approval.**

## Mandatory READING (tick each in your first message; verify against ground truth)
1. [ ] `.claude/handoff.md` top entry (2026-07-07, D288) + `.claude/decisions.md` head (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — was D288 at write time).
2. [ ] `.claude/parking.md` — `P-UNIVERSAL-RESPONSIVE-ROUTING` (the front) + `P-HERO-SUB-MAXWIDTH-NESTED-CHILD` (L1-L4).
3. [ ] `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` IN FULL (Bean-locked, extends STOP-26) — §2 layer model, §3.A + §13.4 CSS routing, §2.9 Axis 1 L1-L4, §13.6 composite-mirror. Plus the "Responsive: device-tier vs visual breakpoint (the F-fork)" note in §3.
4. [ ] The converter's CSS routing: `plugins/sgs-blocks/scripts/converter/services/` (root_supports.py, styling_helpers.py, the dispatch/resolver layer) + how `@media` tiers are currently mapped (device-tier `_GRID_TABLET_BP` etc.).
5. [ ] The hero: `plugins/sgs-blocks/src/blocks/hero/{render.php,style.css,block.json}` — the contentPadding* system (render.php ~499-521) + the draft `.sgs-hero__content` responsive rules (mockups/homepage/index.html:258/281-308/310-313).
6. [ ] `CLAUDE.md` §"Responsive breakpoint discipline — device-tier vs visual" (768/1024 device system vs arbitrary visual breakpoints) + the `sgsCustomCss`/Additional-CSS field on the target blocks.

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE (Spec 31 IN FULL + handoff + D-ceiling + the converter CSS-routing + the hero contentPadding system)? Quote one specific thing to prove it.
2. What branch + D-ceiling? (`git branch --show-current` → main; ceiling D288 — verify.) Working tree clean (ignore the 0-byte stray `sgs-framework.db`)?
3. For every fix: premise proven on the REAL draft node BEFORE + AFTER (STOP-43), gated on the REAL page 8 (computed values + Bean eye), never emit alone?
4. Baselines I must not regress: converter suite green except the known-golden failures (do NOT re-seed them); block gates exit 0; the D288 button/hero LANDED state unaffected.
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
- **STOP-63 (NEW, D288) — "Apply/control does nothing" can be a PREVIEW-RENDERING bug, not a handler bug.** The button preset handler wrote the right attrs, but the editor preview applied token SLUGS as raw CSS (invalid → browser drops them) so nothing visibly changed. When a user reports "X does nothing", verify whether the ATTR changed (handler works) separately from whether the PREVIEW/render RESOLVES the value (slug→colour). Bean's live report is ground truth over a static code-trace (STOP-15).

---

## ORCHESTRATION PLAN (do in ORDER; each gated by Bean's agreement on the design before build — Rule 7) Only plan 1 at a time.

### Task A — Universal responsive routing (CSS + content): device-tier → attrs, non-device → Additional-CSS
**What:** Build the converter's responsive-routing so a draft `@media` rule lands correctly by breakpoint CLASS: (1) a DEVICE-TIER breakpoint (768 / 1024, and their `max-width` 767/1023 forms) → the SGS device-tier responsive attrs (`*Tablet`/`*Mobile` families) so it's an editable block control; (2) a NON-DEVICE / arbitrary breakpoint (1280, 600, 640, 781, …) → the relevant block's Additional-CSS field (`sgsCustomCss`) verbatim (STOP-52). Applies to BOTH CSS declarations and content routing, universally (a DB/structural signal, never per-slug).
**Why:** the cloned hero content is cramped LEFT on desktop because the draft's `.sgs-hero__content` padding (`56px 48px` @≥768, `72px 64px` @≥1280) is not transferred. Concrete acceptance: live page-8 hero content padding = 56/48 at 1024-1279 (via `contentPadding*` tablet/base attrs) + 72/64 at ≥1280 (via `sgsCustomCss`), draft-matched; content no longer left-cramped. Then verify the same routing on other draft `@media` rules across the page.
**Orchestration:** inline design + design-gate with Bean FIRST (shared converter routing + likely a new responsive-attr destination + `sgsCustomCss` plumbing = Rule 7). Then ONE solo coding subagent (STOP-39). Depends on: none. /qc gate after: `/qc-council` (blub 255) + LANDED page 8. Re-clone to verify (STOP-21).
**Acceptance:** the hero content padding matches the draft at every tier on live page 8 (375/768/1024/1280/1440); device-tier rules are editable block controls; the ≥1280 rule sits in the hero's Additional-CSS; NO inline-CSS beats-@media regressions (Rule 6); universal (fires on a breakpoint-class signal, not a slug). Spec 31 updated with the routing rule.

### Task B — Container L1-L4 cascade deep-dive (Steps 3-6) + hero-sub nested-child max-width
**What:** Resume the container L1-L4 cascade (Steps 1+2 map + grouping DONE + Bean-agreed): prove L1-L4 universality across the Mama's + Indus examples, layer-by-layer test, and close the two proven-open gaps: L4 per-area extraction (composite grid-area box-CSS → the wired area resolver) and the hero-sub nested-child max-width (`P-HERO-SUB-MAXWIDTH-NESTED-CHILD` — `.sgs-hero__sub{max-width:420px}`→`sgs/text` child never SET).
**Why:** the container standardisation goal — every wrapper mirrors `sgs/container`; faithful transfer of the layer model across composites. Measurable: the L1-L4 layers land faithfully on live page-8 sections at 375/768/1440 (computed-style + Bean eye).
**Orchestration:** Bean's slow understand-first agenda (map → group L1-L4 → prove universal → explain simply → layer-by-layer test). Read-only investigators parallel OK; solo coding subagent per fix. Depends on: Task A (the responsive routing feeds the L4 per-area padding). /qc gate: `/qc-council` per converter commit + LANDED.
**Acceptance:** L1-L4 proven universal across examples; the two proven-open gaps closed + LANDED; Spec 31 §2/§2.9 reconciled with what shipped.

### Dependency graph
```
Task A (design-gate → solo subagent → re-clone) → /qc-council + LANDED page 8
  ↓
Task B (L1-L4 cascade; solo subagent per fix) → /qc-council per commit + LANDED
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
