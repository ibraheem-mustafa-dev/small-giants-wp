---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-12
primary_goal: "Burn down the ~44 OPEN ledger rows per converter family — the PRIORITY is the Stage 1 universal converter core: the cross-node router SHIPPED emit-green (D207) but 0/52 ledger rows closed because it routes padding to the WRONG layer (gridItemPadding/outer instead of contentPadding*) and misses CONTENT on shorthand `padding`. Fix the core, then the family rows follow. Testimonial-empty is DONE (D212, this session). FR-30-12 product-page clone is UNGATED, queued."
---

# Next session — Stage 1 converter-core padding routing + ledger family burn-down

> Invoke `/autopilot` first. Read this prompt + `.claude/plans/2026-06-09-clone-fix-build-plan.md` (the canonical build plan) + `.claude/plans/2026-06-09-clone-fix-sign-off-ledger.md` (the 55-row tracker — THE acceptance surface) before acting.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter action)

1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM. *(Violation: an emitted block whose `className` carries a draft BEM element class like `sgs-x__y`.)*
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. Only the live WC configurator `sourceMode='wc-product'/'sgs-cpt'` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception without universal justification. *(The fold fix's scalar-media carve-out cost a whole cycle — removed only when the per-area router landed. This session: the testimonial lift was caught firing on ~50 blocks and narrowed to a DB opt-in capability — over-broad universality is also a Rule-3 break.)*
4. **NO SKIPPING** — every draft class's content + CSS transfers to the clone, OR is reported skipped-with-reason, per class.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live DOM + computed-style on page 8 vs the draft's real values. *(Violation: closing on assertion output / a test page / the emit alone.)*
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS** — inline beats `@media` and kills responsiveness. *(The container thread fixed the cascade so tier stylesheets now win — do not reintroduce inline bases.)*
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-12 close)

**Testimonial-empty is FIXED + LIVE-VERIFIED + on main** (D212): page-8 testimonials render quote/name/5★ at 1440/768/~500. The fix was the UNIVERSAL DB-driven scalar-lift (`_lift_scalar_attrs_by_selector` in convert.py, G3-attrs path) — gated on a `scalar-content-lift` `block_capabilities` opt-in (declared via `supports.sgs.scalarContentLift` in block.json, reproduced by `/sgs-update`). qc-council caught it firing on ~50 blocks and narrowed it. Commits on main: `3938a7b0` converter + `09a908fd` block-side + docs. **SP-C/D.1/D.2/E are now UNBLOCKED but still OPEN** — distinct fidelity rows (verticalAlign / star-size / F8), not yet measured; **SP-D fix-shape is SUPERSEDED** (stars are now a typed `ratingStars` attr, not a child `sgs/star-rating` block — re-scope before measuring).

**The priority now is the Stage 1 universal converter core.** The cross-node router SHIPPED emit-green (D207) but **0/52 ledger rows closed** because it routes padding to the WRONG layer (`gridItemPadding`/outer instead of `contentPadding*`) and misses CONTENT on shorthand `padding`. ~44 ledger rows remain OPEN, clustered by family: featured-product 14, social-proof 8 (now measurable), ingredients 5, hero/trust-bar/brand tails 9, GF-B.2/C. Two instruments are known-bad: clone-parity.js's aggregate (BEM-class blind spot — RETIRED as a gate; per-row live-DOM probes are the acceptance) and a global 16→18px base-font drift inflating every comparison.

## Task 1 — Stage 1 universal converter core: fix cross-node padding routing [THE PRIORITY]

**What:** the cross-node router fires but routes padding to the wrong layer. Fix it to route to `contentPadding*` (the content-band layer) not `gridItemPadding`/outer, and to handle CONTENT on the CSS shorthand `padding` property (currently missed). This is the universal mechanism whose failure keeps most family rows open — fixing the core is what closes the rows, not per-section tuning.
**Why:** 0/52 ledger rows closed despite the emit being green. The outcome (rows VERIFIED with live evidence) has not been hit — this is CODE SHIPPED, OUTCOME NOT YET HIT.
**How:** read `.claude/plans/2026-06-09-clone-fix-build-plan.md` Stage 1 section + the D207 finding + the F1 family rows; `/systematic-debugging` the routing (which layer does the cross-node router currently write to, and why); design-gate the fix (shared converter mechanism = Rule 7) via `/qc-council`; build; re-clone; walk the F1 rows with per-row live-DOM probes.
**Acceptance:** F1-family ledger rows flip VERIFIED with per-row live page-8 evidence (the layer's computed padding matches the draft). Aggregate differ NOT the gate. `/qc-council` passed on the converter commit.

## Task 2 — Ledger family burn-down (~44 OPEN rows) [follows Task 1's core fix]

**What:** work the OPEN rows BY FAMILY (per-family clusters share root causes): featured-product (14, F1/F3/F5/F6a), social-proof (8 — now measurable post-testimonial-fix; re-scope SP-D star-size for the typed attr), ingredients (5), hero/trust-bar/brand tails (9), GF-B.2/C.
**How:** per family — read the family's rows + draft CSS + emit + live DOM; fix the converter family mechanism (universal, Rule 3); re-clone; **walk the claimed rows with targeted live-DOM probes and report fixed/stayed PER ROW** (`acceptance-is-the-ledger-not-the-mechanism`). `/qc-council` per converter commit (blub.db 255).
**Acceptance:** ledger rows flip to VERIFIED with live evidence cited per row.

## Task 3 — Measurement layer repairs [parallel/cheap]

(a) **Global 16→18px base-font drift** — root-cause at the theme/global-styles layer (`wp_global_styles` post supersedes theme.json on the canary — memory `canary-live-styles-come-from-wp-global-styles-post`); every probe and Bean's eye currently fight this noise. (b) **clone-parity matcher** — either teach it to pair draft elements to native SGS output (section-scoped, role-based) or formally demote it to draft-side-only triage; the per-row probe harness is the acceptance instrument either way.

## Task 4 — FR-30-12 product-page clone [UNGATED, queued]

Spec 30 P1 complete (D210): single-product template chassis is live. When homepage families are substantially closed (or Bean pulls it forward), run the product-page clone to a real `product` post (`is_product()`), converter-produced end-to-end, zero draft BEM classes. Fixture: published 48-SKU variable product **540** (`mamas-test-box-48-sku-fixture`); product 1017 is DRAFT.

## Open follow-ups from this session (parked)

- **P-TESTIMONIAL-LIFT-DATA-DURABILITY** — the 3 testimonial attr `role`+`derived_selector` rows are direct-SQL in the local DB; a normal `/sgs-update` preserves them (verified) but a FULL from-scratch rebuild loses them. Give them a durable home (`tools/recogniser/data/fingerprints.json` override or a seed-script row) before any full DB rebuild.
- **P-TESTIMONIAL-CONVERTER-FR2220 (PARTIAL)** — only quote/name/stars wired; the OTHER typed fields (`__summary`/`__org`/`__logo`/`__work`/`__date`/avatar) + full FR-22-20 variant-detection generalisation past hero+testimonial are still deferred.

## Dependency graph
```
Task 1 (Stage 1 converter core — padding routing fix; /qc-council design-gate)
   ↓ unblocks most F1-family rows
Task 2 (family burn-down, per-row probes)  ║  Task 3 (font drift + matcher — parallel)
   ↓ /qc-council per converter commit + live page-8 verify per row
Task 4 (product-page clone, FR-30-12) — after Task 2 progress or Bean pull-forward
commit by explicit path (threads share main; merge via temp-worktree cherry-pick)
```

## Methodology guardrails (do not skip)
- **Deploy before measure** — any change visible on page 8 needs `build-deploy.py --blocks-only` + OPcache reset BEFORE any probe/parity run. Bump block.json version with ANY style.css change (CDN ?ver).
- **Root cause before instance fix** — ask "what's the CLASS of failure?" before tuning one instance.
- **Verify the LIVE DOM, not the emit/score** (R-22-11) — emit-green ≠ render-fixed. Open the real page. *(D207 is the live example: emit-green, 0/52 rows closed.)*
- **Verify a "universal mechanism no-ops elsewhere" claim by SQL-querying its trigger across ALL rows** — a narrow negative test isn't enough; the testimonial lift hit ~50 blocks. Fix over-breadth with a DB opt-in capability, not a per-block branch. (`verify-universal-noop-claim-by-querying-trigger`, this session.)
- **Per-row probes are the acceptance; the parity aggregate is RETIRED as a gate** (D211; `parity-bem-class-blind-spot-for-converted-output`). Report fixed/stayed PER LEDGER ROW after every converter change.
- **Fact-check every gap/claim against the DB before acting** — `slots.aliases` incl. synonyms + full `block_attributes` incl. presets/child-blocks/per-area families (the `ghost`=outline false-gap lesson). The per-area layer (`<area>+<Suffix>`) is registered — query it before claiming "missing".
- **/qc-council BEFORE every commit** touching converter/pipeline/SGS-block logic (blub.db 255).
- **Commit by explicit path** (`git commit -- <paths>`) — threads share `main`. Merge to main via the temp-worktree cherry-pick pattern (`git worktree add --detach <tmp> origin/main` → cherry-pick → push HEAD:main), NEVER a branch merge into the primary worktree (`merge-to-coactive-held-main-via-temp-worktree`).
- **`--converter-v2` required** on production orchestrator runs; **WP_DEBUG_DISPLAY false** on staging.
- **On Playwright MCP "Browser is already in use"** → switch to chrome-devtools MCP/CLI (Bean preference).

## Skills to Invoke
| Skill | When |
|-------|------|
| `/systematic-debugging` | Task 1 padding-routing root cause (FIRST) |
| `/qc-council` · `/adversarial-council` | per converter commit / shared-mechanism design gate |
| `/strategic-plan` | if the family burn-down needs re-sequencing |
| `/brainstorming` | architectural/design decisions on the converter core |
| `/subagent-driven-development` · `/dispatching-parallel-agents` | Task 2 family dispatch |
| `/sgs-clone` · `/sgs-update` · `/verify-loop` | re-clone / DB sync / 2-attestation |
| `/wp-blocks` + `/sgs-db` | schema before any "missing X" claim (incl. per-area attrs) |
| `/gap-analysis` | grade outputs before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` | converter-architecture questions (auto-routes tier) |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| chrome-devtools MCP (Playwright fallback) | live page-8 DOM/computed-style probes (375/768/1440; creds `.claude/secrets/sandybrown.env`) |
| `/wp-blocks` + `/sgs-db` | DB ground truth (per-area families registered post-/sgs-update) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` (else general-purpose sonnet) | heavy converter/family builds (Task 1/2) |
| `design-reviewer` | visual verify of re-cloned page 8 |

## Guardrails
This thread owns the converter + homepage pipeline; WC build work belongs to the theme thread (Spec 30 P2 is theirs). Commit by explicit path; merge to main via temp-worktree cherry-pick. Deploy before measure. Per-row probes, never the aggregate. Fact-check against the DB first. The ledger is the acceptance surface — lead every report with the ledger delta. Code shipped ≠ outcome achieved (D207: emit-green, 0/52 closed).
