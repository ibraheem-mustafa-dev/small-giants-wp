---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-11
primary_goal: "Design the WooCommerce page-type solution (PDP/shop/cart/checkout) via /brainstorming + /research-buddies, then delegate the BUILD to the theme thread — the product-page draft is a WC page type, not a homepage re-author (6-persona council, 2026-06-11). The pipeline/draft work is GATED on the page-vs-product-template decision. Secondary: correct the Step C mapping's gap labels (the fact-check found ~30 of 68 were FALSE — native WP supports / presets / child-blocks / shipped fixes cover them)."
---

# Next session — WooCommerce page-type design + Step C label correction

> Invoke `/autopilot` first. Read this prompt + `.claude/reports/wave2/WOOCOMMERCE-PAGE-TYPE-BRIEF-2026-06-11.md` IN FULL before acting. This session was COMPACTED — the warm summary carries the detail; the brief is the authoritative input.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter action)

1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM. *(Violation: an emitted block whose `className` carries a draft BEM element class like `sgs-x__y`.)*
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. Only the live WC configurator `sourceMode='wc-product'/'sgs-cpt'` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception without universal justification.
4. **NO SKIPPING** — every draft class's content + CSS transfers to the clone, OR is reported skipped-with-reason, per class.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright live DOM + computed-style on page 8 vs the draft's real values. *(Violation: closing on assertion output / a test page / the emit alone.)*
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS** — inline beats `@media` and kills responsiveness.
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English)

This session: (1) shipped Stage-1 converter Commits 2/3/4 then DISCOVERED via live page-8 + trace that they did NOT change the rendered page — root cause is the `fold_eligible = len(children)==1` miscount (the hero's `__content`+`__media` = 2 children so `__content` never dissolves, and the Commit-2 cross-node routing lives INSIDE the fold branch that never fires). (2) Built `ROUTING-CATEGORISATION-DESIGN.md` (the DB-driven routing + responsive-CSS + grid-awareness design — APPROVED). (3) Ran Step C: mapped both drafts layer-by-layer (`Step C — Layout Mapping.html`). (4) Fact-checked the 68 gap labels — **~30 were FALSE** (native `supports.__experimentalBorder`/`color.background`/`spacing`/`typography.textAlign`, preset attrs `cardStyle`/`style`/`variant`/`pillStyle`, child-block typography, or shipped fixes B6/E9/C7/D8 cover them; `ghost` is already a `button-outline` alias). (5) 6-persona council triaged the product-page draft → it's a **WooCommerce page type**, not a homepage re-author. Theme thread (co-active) shipped B3–E9 + C7 block-quality fixes.

## Task 1 — WooCommerce page-type design [PRIORITY; inline + research]

**What:** design the WC page-type solution (PDP/shop/cart/checkout) so the build can be delegated to the theme thread.
**Why:** the product-page clone is gated on it (page-vs-product-template decision); future ecom pages depend on it.
**Orchestration:** inline (Opus) for the brainstorm/synthesis; `/research-buddies` (parallel) to validate current WC block coverage + best-practice shop UX (toggle filters, archive top/bottom SEO text + read-more, searchable filters, full per-page schema). Read the brief first.
**Depends on:** none. **Acceptance:** a solution doc answering the 3 open questions (page-vs-template; keep-vs-delegate the parallel product layer; reviews source) + a theme-thread delegation brief covering: `add_theme_support('woocommerce')` + 4 block templates + cart drawer + product search + archive UX + schema completeness, all responsive 375/768/1440. Then DELEGATE the build to the theme thread (do NOT build templates here).

## Task 2 — Correct the Step C mapping labels [after Task 1 or parallel]

**What:** flip the ~30 FALSE gap labels in `Step C — Layout Mapping.html` to ✅ with the real reason (native support / preset / child-block / shipped fix); keep only the genuine gaps (product-card heading/desc/price typography + objectFit; trust-bar icon-circle radius/shadow/stroke + text weight/lineheight; info-box mediaEmojiSize; option-picker labelFontWeight/MarginBottom + pillGap/pillFlexWrap + optionItems.pending; gallery selected-item border; announcement-bar border/padding; subtitle typography) + the genuine homepage aliases (`products`, `badge` singular, `card-price`).
**Why:** the mapping is the converter's spec; false gaps would drive wrong work.
**Acceptance:** every flagged row re-verified against the current DB; no FALSE gap remains.

## Task 3 — Converter padding-layer fix [fold fix SHIPPED + LIVE-VERIFIED 2026-06-11 PM; this is the next defect in the chain]

**DONE 2026-06-11 PM (commit `d1e30996` on feat/stage1-converter-core):** the `fold_eligible` fix shipped (net-of-rule-0 count AND grid-area confirmation, per the Bean-approved gate + a 2-rater qc-council that caught + blocked a multi-fold flattening bug in the first cut). **LIVE-VERIFIED on page 8 (sandybrown homepage):** hero `__content` dissolves (label/heading/text are direct hero children), `__media` lifts to splitImage/splitImageMobile with working responsive image swap, grid areas correct ("media"/"content" → "content media"), tablet columns equal. Run: `pipeline-state/mamas-munches-homepage-2026-06-11-132152` (in the `c:/tmp/wt-fold` worktree; ran with `--skip-register`). 7 stale goldens re-baselined citing e7f28b0f.

**What remains (root-caused with live evidence, NOT yet fixed):** the hero's padding tiers (28/20/40 → 56/48 @768 → 72/64 @1280, all on `__content` in the draft — the root has NONE) are **triple-routed to the wrong layers**: (a) a static copy on the hero's OUTER root (inline, never changes across viewports); (b) a dead copy on `gridItemPadding*` (hero render.php doesn't consume it); (c) `contentPadding*` — the attr render.php actually paints onto `.sgs-hero__content`, which computes 0px at every viewport — gets NOTHING. Mechanical causes, from the trace (`convert-trace-b2.jsonl`, `cross_node_css_lifted` layer=GRID): (1) `_route_interior_css_to_parent_slot`'s padding branch only tries CONTENT `if is_content` (max-width+centring signature) — `__content` has neither; (2) the draft declares `padding` as SHORTHAND and CONTENT has only longhand attrs (`contentPaddingTop`…) so the `CONTENT × padding` DB lookup misses while GRID's shorthand-shaped `gridItemPadding` hits; (3) an unidentified third writer puts the static longhand copy (incl. `paddingTopTablet`) on the OUTER root — find it via the trace (`responsive_attr_lifted` events) before fixing.
**Fix-shape — UNIVERSAL, Bean-directed 2026-06-11 ("these fixes are universal, they shouldn't only impact one block/section" — Rule 3):** do NOT ship another hero-shaped patch. Build the council's option (a), the **universal grid-item router**: for ANY parent whose own CSS declares `display:grid` + `grid-template-areas` (no scalar-media precondition — the shipped gate's `_parent_has_scalar_media` requirement is a carve-out to REMOVE), classify EVERY named child by its area/slot: media-slot child → scalar-media lift where the parent exposes it, else a preserved media block; the content-band child → dissolve + CONTENT-layer CSS routing (with padding shorthand→longhand expansion before the `CONTENT × padding` lookup — the shorthand miss is why GRID won); any OTHER named item → a PRESERVED child container carrying its grid-area + its own CSS (multi-fold never arises, so the b5 protection holds by construction). Also identify + suppress the OUTER duplicate-padding writer (trace `responsive_attr_lifted`). `/qc-council` per commit; live page-8 re-verify: `.sgs-hero__content` computed padding = 28/20/40 → 56/48 → 72/64 at 375/768/1440, hero root has none, AND at least one OTHER grid section demonstrably routes through the same universal path.
**Parity ground truth (clone-parity 2026-06-11, `.claude/reports/clone-parity-2026-06-11.json`, header/footer excluded):** page-wide parity is FLAT vs the 06-07 baseline (107/106/106 of 108 body elements fail at 375/768/1440 vs 106/105/104) — the fold fix repaired hero structure but the dominant failure mass is `ELEMENT present→MISSING` ×291 (draft elements with no matched live counterpart, across the other sections) + a NEW global `fontSize 16→18px`/`lineHeight` drift (3→24 failures — root-cause separately; likely theme/global-styles layer, not converter).
**Also observed live (separate, smaller):** desktop hero columns compute 199px/1169px (image min-content blowing out a `1fr 1fr` track — check img max-width in the hero render at desktop); the `__ctas` wrapper emits as a container with a draft BEM className around the multi-button (pre-existing Rule-1 leftover, not fold-related). Probe scripts: `c:/tmp/verify-hero.py` + `verify-hero2.py`.

## Dependency graph
```
Task 1 (WC page-type design, inline + research-buddies) → delegate BUILD to theme thread
Task 2 (Step C label correction)  ║  Task 3 (converter fold fix — homepage; product-page gated on Task 1)
   ↓ /qc-council per converter commit + live page-8 verify
commit by explicit path (theme thread shares main)
```

## Methodology guardrails (do not skip)
- **Deploy before measure** — any change visible on page 8 needs `build-deploy.py --blocks-only` + OPcache reset BEFORE any Playwright/parity run.
- **Root cause before instance fix** — ask "what's the CLASS of failure?" before tuning one instance.
- **Verify the LIVE DOM, not the emit/score** (R-22-11) — emit-green ≠ render-fixed (this session's central lesson). Open the real page.
- **Fact-check every gap/claim against the DB before acting** — query `slots.aliases` incl. synonyms + full `block_attributes` incl. presets/child-blocks/mirror (the `ghost`=outline false-gap lesson).
- **/qc-council BEFORE every commit** touching converter/pipeline/SGS-block logic (blub.db 255).
- **Commit by explicit path** (`git commit -- <paths>`) — theme thread shares `main`.
- **`--converter-v2` required** on production orchestrator runs; **WP_DEBUG_DISPLAY false** on staging.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Task 1 WC page-type design (ALWAYS for design) |
| `/research-buddies` | Task 1 — validate current WC block coverage + shop UX best practice |
| `/gap-analysis` | grade outputs before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/strategic-plan` | order the WC build + the converter fix |
| `/research` | auto-routes when a decision isn't clear |
| `/systematic-debugging` | Task 3 fold-fix root cause |
| `/adversarial-council` · `/qc-council` | per shared-mechanism / per-converter-commit gate |
| `/subagent-driven-development` · `/dispatching-parallel-agents` | Task 3 dispatch |
| `/sgs-clone` · `/sgs-update` · `/verify-loop` | re-clone / DB sync / 2-attestation |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright MCP | live page-8 + editor DOM verify (375/768/1440; login via `.claude/secrets/sandybrown.env`) |
| `/wp-blocks` + `/sgs-db` | schema before any "missing X" claim (fact-check synonyms + presets) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` (else general-purpose sonnet) | heavy converter/block builds (Task 3) |
| `design-reviewer` | visual verify of re-cloned page 8 |

## Guardrails
The product-page WC BUILD goes to the theme thread, NOT here. This thread designs + continues the homepage pipeline. Commit by explicit path. Deploy before measure. Verify live DOM, not emit. Fact-check gaps against the DB (synonyms + presets) before acting.
