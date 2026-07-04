---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / feature-grid 4-column → product-card structure
generated: 2026-07-03-EVEN-EVEN-LATER
primary_goal: "feature-grid 4-col is DONE + LANDED + PUSHED (D270, this session). Bean's flag was right (STOP-43): the shared wrapper ALREADY emitted repeat(4,1fr); feature-grid's own render.php auto-flex <style> overrode it by CSS specificity. Fix = block delegates to the shared grid engine when an explicit gridTemplateColumns is present (grid=default, auto-flex opt-in) + wrapper suppresses the tablet/mobile count shorthand when a base template governs; NO converter change. LANDED 4/4/2 on page 8, all 6 grids regression-clean, review clean, 374 tests green. Also done earlier this thread: L2 content-width (D267), Task-4 re-clone (D264-266), icon-source, core→sgs mapping. NEXT (the LAST cloning-fidelity task in this prompt): product-card typed-mode Layer-B structure (price 28px Fraunces bold → renders 18px Inter) — its own design-gate. Follow Spec 31 in every detail; parity = computed values matched by content (CLAUDE.md rule 4a). NOTE: the AUDIO/VIDEO block build + core→sgs table completion is a SEPARATE one-time prompt `next-session-prompt-audio-video-blocks.md`."
---

# ⚡ NEXT SESSION (2026-07-04) — FACT-CHECK the converter-rebuild scope, then approve the phase-plan

Invoke `/autopilot` first. This is a `/sgs-wp-engine` + `/systematic-debugging` + spec-conformance session. **The feature-grid content BELOW is SUPERSEDED** (feature-grid + the immediate product-card typography are done/deferred); the converter REBUILD is the new thread. **The full STOP catalogue + MANDATORY READING GATE below are RETAINED (load-bearing — Gate 6.5 carry-forward; do NOT drop them).**

## ⛔ PRIORITY 1 — FACT-CHECK EVERYTHING against the running scripts (Bean-directed, non-negotiable)
Last session produced a large converter-rebuild SCOPE (see `handoff.md` top entry + `.claude/plans/2026-07-04-new-engine-to-parity-delete-converter-v2.md`) that is **DOCUMENTATION-DERIVED and must be verified before it is trusted or built from.** Bean's proof: the scope claimed *"media-map loader not started, images broken"* — **WRONG, the current clone loads media.** So:
- **Read the SCRIPTS, follow the actual logic + routing** — do NOT trust Spec 31 §12.6, code comments, or `cloning-pipeline-flow.md` (STALE, references archived files).
- **Run a real clone** (`SGS_NEW_ENGINE=1` on the Mama's homepage → page 8) and observe what ACTUALLY happens per section — which sections the new engine emits vs falls back to frozen `v3.walk`, whether media loads, which resolvers are genuinely stub vs live.
- **Correct the phase-plan's Phase-5 parity backlog** to what the scripts DO, not what the docs CLAIM. Re-verify: media-map (Bean says it works), the "stub" resolvers, the `has_inner`/emit_shape claims, the `converter_v2` deletion surface.
- This is `feedback_read_ground_truth_before_concluding` + the anti-assumption rule (sgs-wp-engine GROUND-TRUTH gate) — apply it to the WHOLE scope.

## PRIORITY 2 — VALIDATE the phase-plan against Spec 31 (it is a DRAFT, NOT agreed — do NOT build from it yet)
`.claude/plans/2026-07-04-new-engine-to-parity-delete-converter-v2.md` carries THREE validation gates at its top; all must pass before Bean approves:
1. **Fact-check vs the running scripts** (Priority 1 above).
2. **Rules + cheats check** — walk the plan against Spec 31 §13.1 R-31-1..15 + the 7 rules + EVERY `cheat-gate/` description. No per-slug/slot/role literal, no mirror-emit, no hardcoded default over faithful CSS, no silent drop; the registry/handler design stays DB-driven (R-31-1) + universal (R-31-9).
3. **Completeness vs ALL of Spec 31** — read Spec 31 END TO END; map every FR (§2 core mechanism, §3 routing, §13 binding rules/content-fork/variant/composite-mirror, §5 CSS props) to a phase. Any uncovered requirement is a plan gap to close (STOP-29: done = the spec's FULL scope, never "out of scope").

The 4 open decisions (delete-last · 6-phase shape · FR-31-2.7 classifier · multi-session scope) + the phases are the PROPOSAL. Only after the 3 gates pass + Bean approves: **Phase 1** (regenerate the stale flow doc) then **Phase 2** (the modular universal walk — single walker + total registry + pure priority-ranked handlers + wire the emit_shape fork + delete Mechanism A/B; lands product-card).

## What's already built (this session; committed) — VERIFY it too
- `emit_shape` column + `/sgs-update _populate_emit_shape` seeder + `db_lookup.emit_shape_for` + `render_emits.render_reads_attr`. Spec 31 FR-31-2.6. Additive + INERT. (product-card leaf conversion was REVERTED — Phase 2 redoes it.)
- **D275 (2026-07-04 later session; UNCOMMITTED — /qc-council then commit first):** product-card legacy InnerBlocks machinery PURGED at source (block.json `allowedBlocks` / index.js `<InnerBlocks.Content/>` save / render.php FP-H `$content` bridge / edit.js legacy UI+warning — all deleted); DB resynced (`has_inner` derived=0, `hib_updated=1`); deployed + page 8 re-cloned. **Cards now emit ZERO children but content attrs EMPTY** (`primary_content_attr → ambiguous`) — page-8 cards render bare until Phase 2 wires the walk; NOT a regression (pre-D275 emission was text-block soup). **`db_lookup.content_attr_for_element` BUILT + TDD-green** (`test_content_attr_resolver.py` 3/3, match-strength ranking per FR-31-2.6) — INERT; Phase 2 wires it as the element→attr content router. 281 converter tests green.

## Skills / tools for the fact-check
| Skill/tool | Use |
|---|---|
| `/sgs-wp-engine` | FIRST — the GROUND-TRUTH gate + anti-assumption rule |
| `/brainstorming` · `/gap-analysis` · `/lifecycle` · `/research` · `/strategic-plan` | mandatory 5 |
| `/systematic-debugging` | root-cause the scope claims against the scripts |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` | run the real clone + DB ground truth |
| Playwright / chrome-devtools | LANDED observation on page 8 (creds `.claude/secrets/sandybrown.env`) |
| `Explore` / `general-purpose` (read-only) | parallel script tracing — CODING subagents CASCADE-FAIL (STOP-39), build INLINE |

Fact-check the scope against ground truth; NEVER build the walker from an unverified doc claim.

---

# (SUPERSEDED) Next session — cloning fidelity: feature-grid 4-column → product-card structure

Invoke `/autopilot` before anything else. This is a `/sgs-clone` (LANDED) + `/systematic-debugging` + `/sgs-wp-engine` + spec-conformance session.

**Agent identity.** You are the SGS cloning-pipeline engineer. The L2 content-width fold (D267) LANDED this session — trust-bar 1100 / featured 1040 / ingredients·gift·social 960 + the ingredients band centred, all verified live on page 8. Your job now: the remaining converter fidelity fixes — feature-grid columns + product-card structure.

**State recap (plain English).** The cloning pipeline converts a draft mockup into native SGS blocks. Page 8 (sandybrown) reflects the current converter and is LANDED-clean for emoji/star/theme/min-width/content-width/text-centring. The remaining fidelity gaps: (A) **feature-grid** renders **3 columns across** on desktop but the draft's ingredient grid wants **4** — the previous prompt blamed `layoutMode=auto-flex ignoring the transferred columns`, but **Bean flags that premise as probably WRONG**: root-cause it on the LIVE page + the draft first (STOP-43), then agree the fix with Bean (it's a quick job once the real cause + user-friendly shape are clear). (B) **product-card** typed-mode structure (price renders 18px Inter not 28px Fraunces bold). NOTE: a SEPARATE one-time prompt (`next-session-prompt-audio-video-blocks.md`) covers the dedicated sgs/audio block + video re-skin + finishing the core→sgs table — distinct workstream; this prompt is the cloning pipeline only.

---

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS, **no hand-declared per-block/per-draft selectors**, **no client copy baked into a base block**, **no per-slug/per-slot/per-role literal in a resolver body**. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix fires for every qualifying block/case; over-broad universality is ALSO a break. Universal signal = a DB fact (`is_root`, `container_kind`, a capability, a `role`, `blocks.variant_attr`), never `if slug == X`.
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone at 375/768/1440. Emit-green ≠ LANDED. WRITTEN ≠ LANDED. "Deploy to homepage" = overwrite the REAL homepage page (sandybrown = page 8), never a new page (D254). Don't declare a section fixed from a grid+N-items impression (STOP-40).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **FOLLOW THE SPEC IN EVERY DETAIL** — Spec 31 is the settled authority for every pipeline change. Read the governing section IN FULL and implement exactly what it specifies. Where silent, state that explicitly and pin the smallest spec-consistent rule (then write it INTO the spec), rather than inventing a mechanism.

## ⛔⛔ MANDATORY READING GATE (verify against ground truth, never guess; read WHOLE docs, not greps). Tick each in your first message:
1. ☐ **`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — READ IT IN FULL, END TO END (Bean directive; STOP-26).** Especially §2 (core mechanism), §2.2 (variant lookup AT recognition — can set grid-or-not), §2.9 Axis-4 VARIANT, §13.5 FR-31-20 (variant detection: `blocks.variant_attr` + `variant_slots`), §13.6 (composite-mirror).
2. ☐ **`.claude/specs/29-CONTAINER-EQUIVALENT-BLOCKS.md`** — the UNIVERSAL L1-L4 model + the 3-KIND roster (feature-grid = `layout` kind).
3. ☐ **`.claude/handoff.md` (2026-07-03 EVEN-EVEN-LATER top entry — D267)** — L2 content-width DONE (the RIGHT way) + the remaining feature-grid/product-card gaps.
4. ☐ **`.claude/decisions.md` head** (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → **D267**).
5. ☐ **`CLAUDE.md` root-cause methodology rule 4a** (parity = computed values matched by CONTENT) + the draft `sites/mamas-munches/mockups/homepage/index.html` (the ingredient grid: `.sgs-feature-grid { grid-template-columns: 1fr 1fr }` → `@media (min-width:600px){ repeat(4,1fr) }`).
6. ☐ **The live canary** — `https://sandybrown-nightingale-600381.hostingersite.com/` (page 8).

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE — Spec 31 IN FULL + Spec 29 + handoff + decisions→D-ceiling + CLAUDE.md rule 4a + the draft? (Quote one specific thing to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; D-ceiling → **D267**.) Nothing is held from push — D264-D267 are all on origin/main. Verify the D-ceiling before any new D.
3. For the fix I'm about to build: theme-layer or converter or block? Is it UNIVERSAL where it should be (Rule 3)? Does it FOLLOW SPEC 31 (Rule 7)?
4. Am I gating on the REAL page (LANDED page 8, computed-parity matched by content, Bean eye) not emit-green (Rules 4/5, STOP-4/21/37/40)?
5. For any subagent: CODING subagents CASCADE-FAIL here (STOP-39) — build INLINE. Read-only analysis/council/Explore agents work.

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward; do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, the raw artefacts.
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.**
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Grep the wiring + confirm it RUNS before claiming "enforced".
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints** (768/1024 vs 600/640/781).
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail** — read extract.json + trace.jsonl first; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column exists is necessary-not-sufficient; grep how it's WRITTEN and READ.
- **STOP-15 — A council/analysis finding is a HYPOTHESIS.** FACT-CHECK it against ground truth (file:line, DB rows) before acting.
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + gate `--check` YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`).
- **STOP-21 — LANDED-proven only by deploying the GENUINE emit to a live page + computed-style/innerText — NOT new-vs-frozen attr equivalence.** Recipe: `SGS_NEW_ENGINE=1 python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup <draft> --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8 --skip-autonomy-gate` → anonymous chrome-devtools/Playwright. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`). NOTE: the autonomy gate ROLLS BACK the deploy on low overall parity — use `--skip-autonomy-gate` for a manual LANDED check.
- **STOP-23 — Run a pre-commit `/qc-council` (or an adversarial council) on the BUILT converter/block code** (blub 255). Verify input-class ≠ output-class; render.php reads the attr you write AND PAINTS the element you check.
- **STOP-24 — A DB change a reseed RE-DERIVES must use a reseed-surviving channel** (block.json / a dated migration / `sgs-update` seeder), never a manual DB edit.
- **STOP-26 — Read the WHOLE target spec section holistically before building.**
- **STOP-27 — A conservation/regression guard is `raise`, NEVER a bare `assert`** (`python -O` strips assert).
- **STOP-28 — Do NOT flip the PRODUCTION default to the new engine** until A1 (media-map) + A2 (content ledger) are green. `SGS_NEW_ENGINE=1` is the opt-in test switch. Intact.
- **STOP-31 — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context; plant-test it.**
- **STOP-32 — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped"** (native supports→style.*, custom attrs, wrapper render, spec destination).
- **STOP-34 — SYNTHETIC-FIXTURE-GREEN ≠ REAL-DRAFT-CORRECT.** Reproduce on the FULL real draft.
- **STOP-35 — DEFAULT-IS-CONTAINER: a slug-None class-section defaults to `sgs/container` + recurse, it does NOT fail.**
- **STOP-37 — LANDED catches EMIT/SERIALISATION bugs unit tests structurally cannot.** Deploy + count rendered sections/items.
- **STOP-38 — A section-outer/wrapper fix scoped to ONE slug is an R-31-9 carve-out CHEAT.** Fire on a DB signal (`is_root`, capability, role, `variant_attr`), never a slug literal.
- **STOP-39 — CODING SUBAGENTS CASCADE-FAIL in this environment.** DO THE BUILD INLINE. Read-only analysis/council/Explore agents work fine.
- **STOP-40 — Don't declare a section "fixed" from seeing a grid + N items.** Check the RENDERED result vs the DRAFT's actual desktop layout (this is EXACTLY the feature-grid task — verify the live column count/order at 375/768/1440 vs the draft's per-breakpoint grid).
- **STOP-41 — the `no_slug_literal` gate guards `role`/`slot`/`canonical_slot` too, not just `block_slug`.** Any per-slot/per-role LITERAL comparison in a resolver body is a carve-out it blocks.
- **STOP-42 — PARITY = computed values matched by CONTENT, never source-declaration-diff, never wrapper-class-keying.** Use `parity/computed-parity.js`. The pipeline drop-logs (`attribute_gap_candidates` cumulative, `leftover-buckets.json`) measure converter INPUT-side, NOT rendered fidelity.
- **STOP-43 — PROVE THE PREMISE ON THE REAL NODE, not code inference.** Before designing OR committing a converter/extraction fix, REPRODUCE the failure by RUNNING the engine on the real draft node (`build_block_markup(recognise(node), node)`), then re-run AFTER. Proven AGAIN 2026-07-03: the "L2 content-width = run the mirror sync" premise was WRONG (4 sections already folded it; only trust-bar dropped it, a composite). Memory: `verify-converter-fix-premise-on-real-node`.
- **STOP-44 (NEW, 2026-07-03) — A schema-valid, EMITTED converter attr can still be a RENDER no-op.** WP core does NOT always apply a block's WP-native support for a DYNAMIC block: `has-text-align-*` was NOT merged into `get_block_wrapper_attributes()` for the dynamic `SGS_Container_Wrapper` (WP 7.0), so the folded `textAlign` attr rendered nothing until the wrapper emitted the class explicitly. LANDED (live computed-style) caught it; the emit-proof AND a code-reading rater did NOT. When you fold a property to a native support, VERIFY the class/style actually renders on the LIVE element — do not assume WP core adds it. Extends STOP-4/21 + `converter-attr-must-match-the-attr-render-reads`.

---

## ORCHESTRATION PLAN (Bean-set order; every task FOLLOWS SPEC 31; parity = computed-matched-by-content)

> **Context:** page 8 reflects the current converter (L2 content-width + text-centring LANDED this session). Re-clone after each fix to LANDED-verify.

### Task 1 — feature-grid renders 4 columns (the ingredient grid) — ✅ DONE (D270, 2026-07-04)
**RESOLVED.** Bean's flag was correct (STOP-43): the shared `SGS_Container_Wrapper` ALREADY emitted `.sgs-container-<uid>{grid-template-columns:repeat(4,1fr)}` + mobile `1fr 1fr` — the grid was transferred fine; feature-grid's OWN render.php printed a higher-specificity `#uid.sgs-feature-grid{repeat(auto-fill,minmax(240px,1fr))}` auto-flex override that beat it. Fix (NO converter change): render.php delegates to the shared engine when an explicit `gridTemplateColumns` is present (force `layout=grid`, no competing `<style>`, `--grid` class; grid=default, auto-flex kept opt-in) + `class-sgs-container-wrapper.php` suppresses the tablet/mobile `sgs-cols-{tier}-N !important` shorthand when a base template governs (D228 family). LANDED page 8: **4/4/2** desktop/tablet/mobile (computed + Bean-eye screenshot); all 6 page grids regression-scanned clean; independent diff review clean; 374 tests + cheat-gate green; convert.py byte-identical. Commits `9a437113`+`be8e721e`+`409a47fc`, pushed. Memory: `block-own-render-can-override-shared-wrapper`. **Historical note (do not act on):** the earlier premise below (`layoutMode=auto-flex ignoring the transferred columns`) was PARTLY right (auto-flex did override) but misframed the fix — the wrapper already had the answer.

<details><summary>Original Task-1 brief (superseded — kept for context)</summary>

**What:** The ingredient grid renders **3 columns across** on desktop; the draft wants **4** (`.sgs-feature-grid { grid-template-columns:1fr 1fr }` → `@media (min-width:600px){ repeat(4,1fr) }`).
**Why:** Visible fidelity gap on the homepage.
**⚠ Premise is probably WRONG (Bean).** The stale prompt blamed `layoutMode=auto-flex ignoring the transferred columns`. **Do NOT build to that premise.** ROOT-CAUSE it on the LIVE page + the draft first (STOP-43/40): what column count does feature-grid actually render at 375/768/1440, what attrs did the clone emit (gridTemplateColumns/columns/layoutMode + tiers), and what does the draft's per-breakpoint grid actually specify? feature-grid is `container_kind='layout'`; check `blocks.variant_attr` + `variant_slots` for feature-grid (query, don't guess — FR-31-20). NOTE: the draft's 4-col is behind `@media (min-width:600px)` — a NON-device breakpoint (600), so the D259 device-tier cascade routes it via the F-ii passthrough, not a device tier (STOP-8). **Then DISCUSS the most sensible, user-friendly fix with Bean before building** (Bean: it's a quick job once the real cause is clear).
**Orchestration:** INLINE. `/systematic-debugging` on the live page + draft → present the root cause + a fix menu to Bean → build → `/qc-council` → re-clone `SGS_NEW_ENGINE=1` → page 8 → verify 4-col at 1440 (+ correct stacking at 375/768).
**Acceptance:** feature-grid renders 4-across at ≥600px on page 8 (computed, matched by content vs the draft) — NOT from a "grid + N items" impression (STOP-40).

</details>

### Task 2 — product-card typed-mode structure (Layer-B) — NOW THE LEAD TASK
**What:** product-card typed-mode price renders 18px Inter regular; the draft is 28px Fraunces bold. Broader typed-mode Layer-B structure gap (Spec 27 FP-H).
**UPDATE (D275):** the legacy InnerBlocks path no longer exists — typed mode is builtin-render ONLY, and clones emit the card with no children. Layer-B work now presupposes Phase 2 landing the typed content attrs (`productName`/`priceLarge`/`ctaText` currently emit EMPTY — see "What's already built"). Sequence: Phase-2 content walk → THEN Layer-B typography.
**Orchestration:** INLINE (or `wp-sgs-developer` agent for the heavy block-dev, NOT a general-purpose coding subagent — STOP-39). Its own design-gate (big). `/qc-council` before commit; re-clone LANDED-verify.
**Acceptance:** product-card price + structure match the draft on page 8 (computed, matched by content).

## Dependency graph
```
Task 1 (inline — feature-grid: ROOT-CAUSE + discuss with Bean FIRST, then build)  →  /qc-council  →  re-clone LANDED-verify  →  commit + push
  ↓
Task 2 (product-card structure)  →  /qc-council  →  re-clone LANDED-verify  →  commit + push
```
(SEPARATE workstream — NOT in this prompt: the dedicated sgs/audio block + video re-skin + core→sgs table completion → `next-session-prompt-audio-video-blocks.md`, one-time, delete when done.)

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | design thinking where the spec leaves a detail open (then write it into the spec) |
| `/gap-analysis` | grade any output before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` | auto-routes if a defect needs external reference |
| `/strategic-plan` | order the tasks before coding |
| `/systematic-debugging` | ALWAYS — root-cause on the DRAFT + live page before any fix (feature-grid premise!) |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` | the LANDED run (`SGS_NEW_ENGINE=1`) + DB ground-truth (variant_slots/variant_attr) |
| `/sgs-wp-engine` | block/theme work — evidence-gate + SKILL-STATUS harness |
| `/qc-council` · `/qc-inline` | multi-rater on BUILT converter/block code before commit (STOP-23) |
| `/verify-loop` · `/handoff` · `/capture-lesson` | 2-attestation / session close |

## MCP Servers & Tools
| Tool | What for |
|------|----------|
| Playwright / chrome-devtools | LANDED proof on page 8 — computed-parity matched by CONTENT (rule 4a) at 375/768/1440. On "Browser already in use" (parallel session) switch to chrome-devtools MCP. |
| `python ~/.claude/hooks/wp-blocks.py dump` · `sgs-db.py sql "..."` | schema/DB ground-truth (feature-grid `variant_attr` + `variant_slots`) before any "missing X" |
| REST (Basic auth, `.claude/secrets/sandybrown.env`) | overwrite page 8 (the homepage) — NOT a new page (Rule 5) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `Explore` (read-only) | parallel ground-truth analysis (works; coding agents cascade-fail — STOP-39) |
| `wp-sgs-developer` | heavy block-dev (product-card Layer-B) — via the agent OR inline, NOT general-purpose coding subagents |

## Methodology guardrails (do not skip)
- **Prove the premise on the real node (STOP-43)** — reproduce every converter fix by running the engine on the real draft node BEFORE + AFTER; never ship from code inference. The feature-grid premise is FLAGGED wrong — root-cause it first.
- **A folded attr can be a RENDER no-op (STOP-44)** — verify the class/style renders on the LIVE element, don't assume WP core applies a native support for a dynamic block.
- **Deploy before measure** — any LANDED check requires the genuine `SGS_NEW_ENGINE=1` emit deployed to page 8 (`--skip-autonomy-gate`) BEFORE any computed read (STOP-21).
- **Universal or it's a cheat** — a variant/layout fix fires for ALL qualifying blocks on a DB signal (`variant_attr`/`container_kind`), never a slug literal (Rule 3, STOP-38/41).
- **PARITY = computed values matched by CONTENT** (rule 4a / STOP-42) — use `parity/computed-parity.js`, never declaration-diff or the input-side drop-logs.
- **/qc-council BEFORE every commit** touching converter/block/theme (blub 255). **LANDED (Bean eye on page 8) is the closing gate**, not emit-green (R-31-13 / STOP-4/21/37/44).
- **convert.py stays byte-identical** (D-MODULAR) — never edit the frozen engine; port-read only.
- Tests: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests cheat-gate/tests tests/test_converter_conformance.py -q --import-mode=importlib` (374 baseline; never drop). Cheat-gate: `python cheat-gate/run.py --check` exits 0. Branch `main`; verify D-ceiling; commit path-scoped (PowerShell for Write-tool files; `git commit -F - -- <paths>`) to keep unrelated in-flight edits out of a commit. (Single active thread now — the theme thread finished ~2026-06-12; the path-scoped-commit gate's "co-active sessions" warning is stale, but path-scoped commits remain good practice.)
