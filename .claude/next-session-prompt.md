---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-31-wrapper-perfection-wave1-wave2
generated: 2026-05-31
primary_goal: "Verify Wave-2 + A-1 render correctly on the live canary (build + /sgs-update + deploy + re-clone + wireframe), then close the remaining wrapper-mechanism gaps: trust-bar hybrid FR-22-6 migration (so the renamed block renders the section), product-card full dual-mode build (Spec 24 + atomic pill block + variation-sets logic), slot-level responsive typography lift (A-1 Phase 2). All measured from RENDERED HTML (wireframe structural parity), NOT pixel-diff."
---

# Next Session — Verify Wave-2/A-1 + close remaining wrapper gaps

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — then read the full list below ⚠
> Invoke `/autopilot` first. Then read the MANDATORY READING LIST **end-to-end, not grep-skim**, before any work. This session (2026-05-31) made real progress BUT repeated avoidable mistakes (see "Mistake analysis"). The pre-flight ritual + STOP catalogue exist to stop those recurring — quote them back to yourself before acting.

## Branch + state
- **Branch:** `feat/fr22-4-1-universal-wrapper` (NOT merged to main). Commits (newest first): `6d9fabfb` trust-bar rename · `1e214d49` hero FR-22-6 · `d9c11ed7` A-1 responsive lift · `797bb45d` info-box FR-22-6 · `7b8f3046` blocks.replaces · `94c6ee75` responsive grid · `ce07728d` recursive fold · `8f900750` WIP(do-not-merge).
- **main** clean (untouched).
- Canary page 144 (`sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/`) reflects **Wave 1 only**. Wave 2 (hero, trust-bar rename) + A-1 are committed + `/sgs-update`-persisted but **NOT yet built/deployed/re-cloned** → NOT verified on live DOM.

## MANDATORY READING LIST (read FULLY before any work — Bean directive)
1. This file.
2. `.claude/handoff.md` (2026-05-31).
3. Root `CLAUDE.md` — "Root-cause methodology (MANDATORY)" + the 14 binding rules (R-22-1..14).
4. `git log --oneline -10` + read the 8 commit messages (each carries root-cause + verification).
5. `.claude/decisions.md` newest entries (A-1; hero/info-box FR-22-6; trust-bar rename; FR-22-18; container per-grid-item correction).
6. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` — §0, §FR-22-2/2.5, §FR-22-3, §FR-22-4/4.1, §FR-22-5 (4-destination CSS router), §FR-22-16/17, §6 (R-22-1..14), NEW §FR-22-18 (structural-parity acceptance).
7. `.claude/specs/24-QUERY-DRIVEN-CONTENT-CARDS.md` — FR-24-1/2/3/9 (product-card dual-mode work).
8. `.claude/parking.md` — open follow-ups.
9. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — debug-artefact map (read BEFORE conjecturing).
10. `.claude/cloning-pipeline-flow.md` + `-stages.md`.
11. `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md`.
12. Wireframe: `wireframe-wave1-full.jpeg` (+ `.playwright-mcp/wireframe-wave1.html`) — the structural-parity measurement artefact.

## What shipped this session (on the branch)
- **Recursive fold (FR-22-4.1)** — the universal wrapper rule: sole pass-through shells fold into the section container (native-attr lift, no extra div); non-direct + grid wrappers get their own container; leaf-with-element-children guard. Brand/featured/gift/social structurally correct.
- **Wave 1 (verified live DOM, 6/7 green):** A) responsive grid templates → native attrs (trust-bar 4-col); B) `blocks.replaces` populated → atomic `<h2>`→`sgs/heading` (all headings render); D) info-box FR-22-6 (card content renders).
- **Wave 2 + A-1 (committed, NOT re-cloned — verify FIRST):** A-1 responsive per-device lift (padding/margin/gap/columns `@media`→`{Tablet,Mobile}` attrs; root cause: `_lift_root_supports_to_style` discarded `bp_decls`; slot-level typography deferred to Phase 2); hero FR-22-6 (content→InnerBlocks, shell scalar, deprecated.js v6); trust-badges→trust-bar rename (block is a HYBRID reading scalar `items` → needs its own FR-22-6 migration before the renamed-block section-routing renders).

## NEXT SESSION — priority order
1. **VERIFY Wave-2 + A-1 on the live canary FIRST.** `npm`/`build-deploy.py --target sandybrown --blocks-only --allow-dirty` + re-clone (`sgs-clone-orchestrator … --converter-v2 --debug-trace --spec-22-acceptance --deploy-target page:144`) → re-extract clone-tree via Playwright → re-generate the wireframe. Confirm: hero renders cleanly (no double-structure), trust-bar mobile 2-col + desktop 4-col, per-device attrs present, no regressions. RENDERED HTML only (R-22-11). Regressions → root-cause via trace/live-DOM, roll back fast (STOP #19).
2. **trust-bar hybrid FR-22-6 migration** — renamed `sgs/trust-bar` reads scalar `items`; migrate to `echo $content` so the `.sgs-trust-bar` section block-override (Req 3) renders.
3. **product-card full dual-mode build** — plan first (Spec 24 + the variation-sets requirement), THEN build. See brain-dump.
4. **A-1 Phase 2** — slot-level responsive typography lift (headlineFontSizeTablet etc.): wire the slot-prefix path into the universal walker.
5. **Minors** (parking): A-1 `>1024` breakpoint edge; 3+ breakpoint trace.

## Product-card brain-dump (Bean 2026-05-31 — articulate + record)
Build the FULL version next session with clear specs first:
- **Atomic "pill" block** — build the pack-size/option pills as a SEPARATE atomic block (reusable, improves theme versatility). NOT sgs/button (no link, different behaviour). Behaviour: exclusive selection (one active), persistent "selected" styling, click changes price/photo/etc.
- **Variation-sets logic on the card** — a product can have MULTIPLE variation types (size, flavour). Each type can change different OR the same card areas: size→price; flavour→picture+price. Card must recognise: (a) how many variation TYPES, (b) whether each changes anything, (c) what content each changes. All logic PULLED FROM THE PRODUCT'S SETTINGS (sgs_product CPT) so the block stays simple — it reads the product's declared variations + their content-impact map.
- **Spec 24 alignment** — dual-mode card (Typed=clone InnerBlocks per FR-24-9; Bound=CPT via Block Bindings FR-24-2/3). The variation-sets logic is a NEW requirement beyond current Spec 24 FRs — WRITE IT INTO Spec 24 (or a sub-spec) before building.

## RESOLVED misunderstandings (do NOT repeat)
- **`sgs/container` DOES support per-grid-item customisation** — instance-wide `gridItem*` DEFAULTS (→ `--sgs-gi-*` custom props) + per-child overrides win via specificity (`edit.js:577`). (I wrongly claimed "uniform only / capability gap" — retracted after reading block.json + edit.js.)
- **Atomic tags redirect to sgs equivalents via `blocks.replaces`** (Spec 22 §14), NOT static core blocks. Was dead (NULL) → now populated.
- **Recognition is BEM, not HTML tag** (R-22-2); atomic non-BEM CONTENT tags emit (→ sgs equivalent); only non-content transparent WRAPPER divs dissolve (CSS folds up). Nothing with content is skipped.
- **FR-22-18 (NEW):** layout/wrapper/logic acceptance = rendered-DOM structural parity (container presence + type + grid-template + child count/type/order + absorbed-attr confirmation), NOT pixel-diff. Pixel-diff is informational-only this phase (can run + share, NEVER use as decision evidence). Amends R-22-4's scope.

## Mistake analysis — what went wrong + pre-emptive fixes (Bean directive)
| Mistake | Root cause | Pre-emptive fix (every session) |
|---|---|---|
| Shipped a "Phase-1 shortcut" (own-container-for-all) not the spec's fold | Invented a simpler-than-spec approach; treated its regression as grounds to stop | **STOP #25:** implement the spec's ACTUAL mechanism, never a self-labelled "Phase 1" shortcut. Inventing simpler-than-spec = re-read the spec. |
| Asserted `sgs/container` has no per-grid-item customisation — WRONG | Reasoned from a partial attr dump; didn't read block.json/edit.js/render.php | **STOP #26:** before asserting what ANY block can/can't do, READ block.json + edit.js + render.php + `/wp-blocks`. Never assert capability from a partial query. |
| Misjudged step scope; gave up after one shortcut failed; didn't use the toolkit until prompted | Didn't apply the full methodology (root-cause→unified-fix→verify) | **STOP #27:** for EVERY gap — root-cause from trace+live-DOM, find why same-class peers PASSED, then ONE unified systemic fix (not a cheat). Use the full toolkit (subagent-driven-development, dispatching-parallel-agents, systematic-debugging, qc-council, verify-loop) every step. |
| Used pixel-diff during structural work | Habitual metric | **STOP #28:** measure from RENDERED HTML for layout/wrapper/logic. Pixel-diff informational-only (FR-22-18). |
| Over-checkpointed (burned Bean's context with questions) | Treated resolvable decisions as needing sign-off | **STOP #29:** if evidence is clear, DECIDE + execute. Bean's responses cost large context. Only ask when a decision genuinely changes direction AND can't be resolved from code/spec/evidence. |

## Pre-flight self-attestation ritual (answer ALL inline before any fix-shape or dispatch)
1. Architectural primitive in plain English (Spec 22 §0)?
2. Which R-22-N binding rule(s) govern this?
3. Did I READ the block's block.json + edit.js + render.php + `/wp-blocks` before asserting its capability? (STOP #26)
4. Is this the spec's ACTUAL mechanism, or a shortcut? (STOP #25)
5. Root cause from trace + live DOM — why did same-class peers PASS? (STOP #27)
6. Unified systemic fix (helps all same-class cases), not a cheat?
7. Measuring from rendered HTML, not pixel-diff? (STOP #28)
8. Genuinely Bean's decision, or resolvable from evidence + execute? (STOP #29)

## Tooling
`/autopilot` (first) · `/sgs-wp-engine` · `/wordpress-router` · `/sgs-clone` · `/wp-blocks` · `/sgs-db` · `/systematic-debugging` · `/qc-council` (per converter/block commit) · `/verify-loop` · `/dispatching-parallel-agents` + `/subagent-driven-development` · `/delegate` · Playwright MCP · `build-deploy.py --target sandybrown --blocks-only --allow-dirty` · `sgs-update-v2.py` · `/handoff`.
SGS visual-diff commit gate fires on block changes; for non-visual/logic/meta it sanctions `--no-verify` (structural phase; pixel reports informational only).
