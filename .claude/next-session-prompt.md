---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / product-card typed-mode Layer-B rebuild + min-width tier fix + trust-bar/icon
generated: 2026-07-02
primary_goal: "Rebuild sgs/product-card TYPED mode to feature-parity with BOUND mode (bound works perfectly, pulling from a product page; typed is broken/plain-text). Typed must expose the SAME elements with the SAME naming conventions, but manually settable: optional-element toggles (variations/option-picker, a label/selling-point e.g. 'Most popular'), an ARRAY of variation categories with effects on price/content/image, full customisation — everything bound mode derives from the source page, typed lets the operator set by hand. THEN the unified min-width tier fix (#1 ingredients 4-in-a-row / #3 products / #4 gift all stack because min-width:X is mapped to one tier / dropped). Use /systematic-debugging. START Task 1 by reading sgs/product-card's block.json end-to-end to internalise the bound-vs-typed difference before designing."
---

# Next session — product-card typed-mode Layer-B rebuild + the min-width tier fix

Invoke `/autopilot` before anything else. This is a `/systematic-debugging` session (root-cause each defect on the DRAFT + live page before any fix).

**Agent identity.** You are the SGS cloning-pipeline + block engineer. Last session built Spec 31 §2 layer-extraction + Layer-A bare-tag lift + the §2.3 layout trigger + image lift + media-sideload determinism (all LANDED on sandybrown page 8, qc-council-audited CLEAN + universal). Your job: (1) rebuild `sgs/product-card` TYPED mode to feature-parity with BOUND mode; (2) fix the unified `min-width` responsive-tier bug that leaves ingredients/products/gift stacking.

**State recap (plain English).** The new engine (`SGS_NEW_ENGINE=1`) now clones the Mama's homepage with faithful content + grids that RENDER. Bean's re-review: ingredients grid + social-proof flex-row are fixed; brand/product images load. STILL BROKEN: products + gift + ingredients don't reach their DESKTOP column counts (a shared `min-width` tier bug), the product-card body is plain text in typed mode, the trust-bar has a spurious all-caps first row, and the ingredient `__icon` emoji doesn't lift. 4 commits from last session (`87816090`→`db501007`) are on `main`, NOT pushed. D-ceiling D255. convert.py byte-identical (D-MODULAR).

---

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change AND every council)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-slot exception. Over-broad universality is ALSO a break. **A section-outer/wrapper fix must fire for container + container-equivalent + composite identically (they share `SGS_Container_Wrapper` + `supports.align`); slug-gating is an R-31-9 carve-out CHEAT. Universal signal = `is_root`.**
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP (visible to F5). Zero silent drops. **A non-device breakpoint routed to a NO_DESTINATION gap is "flagged not dropped" (Rule-4 compliant) but STILL a fidelity failure until §3 F-ii passthrough preserves it — see Task 2.**
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (renders on the page). Synthetic-fixture-green ≠ real-draft-correct (STOP-34). **"Deploy to homepage" = overwrite the REAL homepage page (sandybrown page 8), never a new page + front-page repoint (D254). Do NOT declare a section "fixed" from seeing a grid + N items — check it against the DRAFT's ACTUAL desktop layout (2026-07-02: I called #1 "fixed" as a 2×2 when the draft wants 4-in-a-row — assume nothing positive).**
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, recognition, converter, seeding, ledger, gates, SHARED BLOCK render/save/deprecation) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## ⛔⛔ MANDATORY READING GATE (verify against ground truth, never guess; read WHOLE docs/files, not greps). Tick each in your first message:
1. ☐ **`sgs/product-card` block.json END TO END** (`plugins/sgs-blocks/src/blocks/product-card/block.json`) — Task 1 STARTS here. Internalise the `sourceMode` attr (bound vs typed) + EVERY attr each mode uses + the variation/option-picker/label/pricing attrs, so typed mode can mirror bound's element set with the same naming. Then read its `render.php` + `edit.js` to see how bound derives what typed must let the operator set.
2. ☐ **`.claude/handoff.md` (2026-07-02 top entry)** — what landed + the 5 Bean-review issues + which are fixed.
3. ☐ **`.claude/decisions.md` head** (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`).
4. ☐ **`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — READ IT IN FULL, END TO END (Bean directive 2026-07-01; STOP-26).** The whole spec in context so mid-work issues in untouched sections are grounded. Task-2 anchor: §3 F-fork / F-ii (device-tier vs visual breakpoint — the min-width bug); §3.A step 4 (tier-attr re-append). Task-1 anchor: §13.3 content fork + Spec 27 (product-card master).
5. ☐ **`.claude/specs/27-*.md` (Product & WooCommerce master)** — the canonical product-card dual-mode design (bound/typed, option-picker, variation categories, value-ladder). Task 1 must align to it.
6. ☐ **The min-width tier code** — `converter/services/styling_helpers.py` (`collect_css_decls_for_element` → bp_decls), `converter/resolvers/grid.py` (`is_device_tier` gate), `converter/context.py` (DEVICE_TIERS + the "non-device breakpoint → gap" note), `orchestrator/converter_v2/db_lookup.py::breakpoint_suffix_rules` (min-width:768 → [Tablet,Desktop]).
7. ☐ **The live canary** — `https://sandybrown-nightingale-600381.hostingersite.com/` (page 8) — inspect the actual defects before theorising.

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE — product-card block.json (bound vs typed) + handoff + decisions→D-ceiling + Spec 31 IN FULL + Spec 27 + the min-width tier code? (Quote one specific thing to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; D-ceiling → verify.) The last-session commits are NOT pushed — confirm before adding.
3. For the fix I'm about to build: is it UNIVERSAL (fires for every qualifying block, not one slug — Rule 3 / R-31-9 / STOP-38)? Am I DESIGN-GATING the product-card shared-block rebuild + the min-width tier-mapping change (Rule 7, STOP-19) BEFORE code, and FACT-CHECKING every council finding against ground truth (STOP-15)?
4. Am I gating on the REAL page (LANDED on page 8, draft-vs-clone, Bean eye) not emit-green (Rules 4/5, STOP-4/21/37)? Am I checking the section against the DRAFT's ACTUAL desktop layout, not just "a grid rendered" (Rule 5, 2026-07-02 false-positive lesson)?
5. For any subagent: did I tell it "implement only your assigned files / RETURN findings; do NOT write shared docs or touch the shared git tree" (STOP-2)? Am I verifying its test/gate claims from the canonical cwd + proving the FAILURE path (STOP-16)? Coding subagents cascade-fail here — build INLINE (STOP-39).

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward, D101 — verbatim; do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, decisions.md, the raw run artefacts. The reading gate is non-skippable.
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.** Opus orchestrates all shared-file writes; commit valuable artefacts BEFORE dispatching.
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** (Spec 31 §12.2.1.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.**
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Before claiming "enforced", grep the wiring + confirm it RUNS.
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers** (R-31-1).
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = {767/768, 1023/1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier. **(DIRECTLY RELEVANT TO TASK 2: min-width:600/640 are non-device breakpoints → §3 F-ii preserve-as-passthrough, never coerce to a tier AND never drop.)**
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined** (`variant_slots` + `blocks.variant_attr`; query, don't guess). RELEVANT TO product-card variation categories (Task 1).
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl FIRST; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column/function EXISTS is necessary but NOT sufficient; grep the real signature + how it's WRITTEN and READ first.
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions** (D233).
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace** (D234).
- **STOP-14 — Before ARMING any gate, run it in report mode against CURRENT output + baseline today's legacy violations (key by identity, not line); fail only on NEW** (D236).
- **STOP-15 — Validate routing/variant claims against pipeline-PRODUCIBLE inputs, not synthetic dicts; run an adversarial-council AFTER a qc-council; then FACT-CHECK the council against ground truth** (D237/D242 — a council finding is a HYPOTHESIS). Applied 2026-07-02 — the audit council's claims were re-verified against fresh gate runs + file:line.
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + the gate's `--check` YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`); prove the FAILURE path; inspect the committed baseline for stale plants.
- **STOP-17 — A coverage/no-drop/diff gate's set-difference join must key BOTH sides on the FULL unit identity incl. responsive tier/media; red-team a BUILT gate before trusting it** (D240).
- **STOP-18 — Don't defer residuals out of habit; fact-check each against ground truth first** (D241). Label each DONE-NOW / DISMISSED-with-evidence / DEFERRED-with-cited-blocker.
- **STOP-19 — The walker/recognition/converter + SHARED BLOCK render/save is the HIGHEST-regression surface — design-gate + don't grind under context pressure.** A path-scoped `git commit -- $(...)` can DROP a `git mv` source-path deletion — commit by explicit path list naming BOTH sides.
- **STOP-20 — Restructure a multi-file rebuild as a VERTICAL SLICE (one real output LANDED), not a horizontal scaffold; make LANDED the headline signal; DOUBLE-VERIFY a design then FACT-CHECK the verifiers** (D242).
- **STOP-21 — A new-engine resolver is only LANDED-proven by deploying its GENUINE output to a live page + computed-style/innerText + verdict — NOT by new-vs-frozen attr equivalence** (D243). Recipe: `/sgs-clone` with `SGS_NEW_ENGINE=1` → overwrite page 8 → anonymous Playwright `getComputedStyle`/innerText. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **STOP-22 — The frozen `convert.py` is NEVER the design reference for a rebuild stage — WITH ONE CARVE-OUT: read-to-port a function Spec 31 names as WORKING + in-scope** (D246).
- **STOP-23 — Run a pre-commit `/qc-council` on the BUILT converter code, not just the design** (blub 255). Input class ≠ output class is a live trap; verify render.php reads the attr you write AND paints the element you check.
- **STOP-24 — A DB change to a column `/sgs-update` RE-DERIVES must use the reseed-surviving `ATTR_CLASSIFICATION_OVERRIDES` channel, not a bare migration.**
- **STOP-25 — A rebuild's "fresh/modular" = RE-HOUSE existing WORKING logic behind one dispatch; NEVER recreate it with new logic + new DB columns.**
- **STOP-26 — Before designing ANY rebuild stage, read the WHOLE target spec holistically (not greps).**
- **STOP-27 — A regression/conservation guard is `raise`, NEVER a bare `assert`** (`python -O` strips assert).
- **STOP-28 — Do NOT flip the PRODUCTION-DEFAULT to the new engine until A1 (media-map) + A2 (content-conservation ledger) are green.** `SGS_NEW_ENGINE=1` is the opt-in test switch. Intact.
- **STOP-29 — BIND DEFINITION-OF-DONE TO THE SPEC'S FULL SCOPE; never ship a minimum increment and call the rest "out of scope".** Map every deferral to a named spec STAGE. (Task 1: bind to Spec 27's full product-card typed-mode scope.)
- **STOP-30 — A subagent's "covered / N routes / no-cheating" verdict is a HYPOTHESIS.** Re-enumerate + verify against ground truth.
- **STOP-31 — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context; plant-test it FIRES on each real cheat + stays SILENT on a docstring quoting the pattern** (D249).
- **STOP-32 — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped / not routed / unbuilt"** (D250): (a) WP native `supports`→`style.*`, (b) custom block attrs, (c) the wrapper render, (d) the spec's declared destination. A gap is real ONLY after all four are negative.
- **STOP-33 — A "deterministic" DB tool only guarantees correct data for the steps it ACTUALLY runs** (D251). Before blaming wrong/missing DB data, check whether the derivation STEP is even WIRED into the standard flow.
- **STOP-34 — SYNTHETIC-FIXTURE-GREEN ≠ REAL-DRAFT-CORRECT** (D252). Reproduce on the FULL real draft (all sections).
- **STOP-35 — DEFAULT-IS-CONTAINER: a slug-None class-section DEFAULTS to `sgs/container` + recurse children (FR-31-4), it does NOT fail.** An EMPTY container is still the bad case → conservation `raise`.
- **STOP-36 — Merging/renumbering a canonical spec: renumber via SCRIPT on an ACTIVE-FILE ALLOWLIST only; exclude frozen code + archives; keep an ID-mapping note; verify tests + cheat-gate green AFTER; QC-council the merged spec** (D253).
- **STOP-37 — LANDED catches EMIT/SERIALISATION bugs unit tests structurally cannot** (D254): a line-based post-processor drops children when the engine one-lines a block (WP block markup is newline-separated); an empty dynamic block MUST self-close (`/-->`). ALWAYS deploy to a real page + count rendered sections.
- **STOP-38 — A section-outer/wrapper fix scoped to ONE slug is an R-31-9 carve-out CHEAT** (D254). Apply on the `is_root` signal gated on `block_supports.*`, never `if rec.slug == <one block>`.
- **STOP-39 — CODING SUBAGENTS CASCADE-FAIL in this environment.** A write/coding Agent returns a placeholder "running in the background", does no work, and spawns more of itself (~94K tokens each). Read-only analysis/council/Explore agents work fine. **DO THE BUILD INLINE.** For heavy block-dev, the `wp-sgs-developer` specialist agent per-block may be dispatched but VERIFY its edits + tests yourself (STOP-16).
- **STOP-40 (NEW, 2026-07-02) — Don't declare a section "fixed" from seeing a grid + N items.** Check the RENDERED result against the DRAFT's ACTUAL desktop layout (column count, order) before claiming a fix. I called #1 "fixed" as a 2×2 when the draft wants 4-in-a-row — the desktop rule was silently dropped. Assume nothing positive; prove against the draft (Rule 5).

---

## ORCHESTRATION PLAN

### Task 1 — `sgs/product-card` TYPED-mode Layer-B rebuild → feature-parity with BOUND mode (Bean-specced; BIGGEST)
**START by reading `sgs/product-card`'s `block.json` END TO END** so you totally understand the difference between the two source modes before designing anything.

**What:** BOUND mode works perfectly (pulls all elements from a live product page — think option-picker/variations, price, image, written content, labels). TYPED mode is broken (renders as plain text). Make TYPED mode expose the **EXACT same elements with the same naming conventions** as bound, but **manually settable**:
- Toggle optional elements on/off — variations / the **option-picker**, and a **label / selling-point** (e.g. "Most popular", "New? Start here").
- Full customisation: an **ARRAY of variation categories** with their effects on **pricing / written content / image** (etc.) — everything bound mode derives from the source page, typed lets the operator set by hand.
- Same feature set as bound; the only difference is the data SOURCE (manual vs product page).
**Why:** typed product-cards clone as plain text today (Bean review #3 residual); this is the Layer-B rebuild that makes them real, editable, customisable cards.
**Estimated time:** design ~20 min; build ~45 min (shared block — high blast radius).
**Orchestration:**
- Execution: **INLINE** (or `wp-sgs-developer` per-block, VERIFY its output — STOP-39). Shared block → **DESIGN-GATE via `/adversarial-council` or `/qc-council` BEFORE building** (Rule 7 / STOP-19).
- Read Spec 27 (product-card master) + block.json + render.php + edit.js FIRST. Bind DoD to Spec 27's full typed-mode scope (STOP-29).
- No deprecation ceremony needed (theme not live anywhere — Bean confirmed 2026-07-02), but keep `save`/`render`/edit.js coherent + zero dead controls (HC2).
**Depends on:** none. **Acceptance:** on page 8 a typed product-card renders its image + title + description + price + optional option-picker + optional selling-point label, with a settable array of variation categories affecting price/content/image — matching bound-mode's element set + naming; draft-vs-clone + Bean eye.

### Task 2 — Unified `min-width` responsive-tier fix (#1 ingredients 4-in-a-row, #3 products, #4 gift)
**What:** a draft `@media (min-width:X)` rule means "X and up". The converter maps `min-width:768` to the Tablet tier ONLY (so desktop 1024+ reverts to base) and DROPS non-device breakpoints (600/640) entirely. Fix: `min-width:X` emits EVERY device tier ≥ X (768 → Tablet AND Desktop); non-device breakpoints (600/640) are PRESERVED as raw uid-scoped passthrough (§3 F-ii), never coerced to a tier, never silently dropped.
**Why:** ingredients (should be 4-in-a-row, renders 2×2), products (5fr 3fr desktop), gift (1fr 1fr desktop) all stack/under-column because the desktop rule doesn't land. ONE root cause (Bean-confirmed).
**Estimated time:** design ~15 min; build ~30 min.
**Orchestration:** INLINE. DESIGN-GATE (tier-mapping is converter-adjacent, STOP-8/19). Root-cause in `styling_helpers` bp_decls + `grid.py` `is_device_tier` + `context.py` DEVICE_TIERS + `breakpoint_suffix_rules`. `/qc-council` on the built code (STOP-23). LANDED-verify each section at 375/768/1440.
**Depends on:** none (parallel-safe with Task 1). **Acceptance:** ingredients = 4-in-a-row @≥600, products = 5fr 3fr @≥768, gift = 2-col @≥640, ALL at desktop 1440; draft-vs-clone + Bean eye; STOP-40 (check vs the draft's actual desktop layout).

### Task 3 — Trust-bar spurious first row + ingredient `__icon` emoji lift (#1b, trust-bar)
**What:** (a) trust-bar has an inserted 1st grid item concatenating all 4 columns' text in all-caps — a recognition/extraction bug. (b) The ingredient `__icon` emoji (🌾) doesn't lift (draft `.sgs-info-box__icon` vs the attr's `.sgs-info-box__media` selector) + info-box is InnerBlocks (Layer-B candidate).
**Orchestration:** INLINE, root-cause each on the DRAFT DOM + extract.json/trace.jsonl (STOP-10) before fixing. `/qc-council` + LANDED-verify.
**Depends on:** none. **Acceptance:** trust-bar shows exactly its 4 icon columns; ingredient cards show their icon; page 8, Bean eye.

### Dependency graph
```
Task 1 (product-card Layer-B — INLINE, design-gate -> build -> /qc-council -> LANDED page 8)
Task 2 (min-width tier fix — parallel-safe with Task 1 -> /qc-council -> LANDED)
Task 3 (trust-bar + ingredient icon — parallel-safe)
-> Bean sign-off -> PUSH the held commits (87816090..db501007 + D254 set) to main
```

## Skills to Invoke
| Skill | When to use |
|-------|-------------|
| `/systematic-debugging` | ALWAYS — root-cause each defect on the DRAFT + live page before any fix |
| `/brainstorming` | ALWAYS — the product-card typed-mode design + the tier-mapping design |
| `/gap-analysis` | ALWAYS — grade any output before delivery |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` | ALWAYS — auto-routes if a defect needs external reference |
| `/strategic-plan` | ALWAYS — order the tasks before coding |
| `/adversarial-council` · `/qc-council` | design-gate the product-card shared-block rebuild + the tier-mapping change (Rule 7 / STOP-23) |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` | DB ground-truth + the LANDED run (`SGS_NEW_ENGINE=1`) |
| `/verify-loop` | 2-attestation per load-bearing claim |
| `/handoff` · `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | What to use it for |
|------|-------------------|
| Playwright / chrome-devtools | LANDED proof on page 8 (anonymous computed-style/innerText at 375/768/1440) |
| `python ~/.claude/hooks/wp-blocks.py dump` · `sgs-db.py` | schema/DB ground-truth (product-card attrs, variant_slots, breakpoint_suffix_rules) before any "missing X" |
| REST (Basic auth, `.claude/secrets/sandybrown.env`) | overwrite page 8 (the homepage) — NOT a new page (Rule 5) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | product-card block-dev if dispatched (RETURNS findings / implements assigned files, STOP-2; VERIFY its edits yourself, STOP-16/39) |
| `code-reviewer` (feature-dev) | pre-commit review on the product-card + tier-mapping diff |

## Methodology guardrails (do not skip)
- **Deploy before measure** — any LANDED check requires the genuine emit deployed to page 8 BEFORE any computed-style read (STOP-21). "Deploy to homepage" = overwrite page 8, not a new page (Rule 5).
- **Check vs the DRAFT's actual desktop layout** — a grid + N items rendering is NOT proof of a fix; compare column count + order to the draft (STOP-40).
- **Root cause before instance fix** — for each defect name the class of failure (tier-mapping / recognition / block-shape) before a per-section tweak.
- **Universal or it's a cheat** — every fix fires for all qualifying blocks (Rule 3 / R-31-9 / STOP-38); slug-scoping is a carve-out.
- **/qc-council BEFORE every commit** touching recognition/walker/converter/shared-block (blub 255). **LANDED (Bean eye on page 8) is the closing gate**, not emit-green (R-31-13 / STOP-4/21/37).
- **convert.py stays byte-identical** (D-MODULAR) — never edit the frozen engine; port-read only.
- Tests: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests cheat-gate/tests -q --import-mode=importlib` (326 baseline; never let it drop). Cheat gate: `python cheat-gate/run.py --check` exits 0. Branch `main`; verify D-ceiling; commit path-scoped (lucide/W3-plan are NOT yours).
