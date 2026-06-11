---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-11
primary_goal: "Fix the testimonial-empty live bug (customer-visible; inner sgs/testimonial content not surfacing in the slider on page 8), then burn down the ~44 OPEN ledger rows per converter family (F1–F8) with per-row live-DOM probe acceptance. The container 4-layer programme is COMPLETE (D211) and proved the loop: 8 ledger rows flipped VERIFIED (H-B + 7 Gift). FR-30-12 product-page clone is UNGATED (Spec 30 P1 complete, D210) — queued behind the homepage families."
---

# Next session — testimonial-empty fix + ledger family burn-down

> Invoke `/autopilot` first. Read this prompt + `.claude/plans/2026-06-09-clone-fix-sign-off-ledger.md` (the 55-row tracker — THE acceptance surface) before acting.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter action)

1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM. *(Violation: an emitted block whose `className` carries a draft BEM element class like `sgs-x__y`.)*
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. Only the live WC configurator `sourceMode='wc-product'/'sgs-cpt'` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception without universal justification. *(The fold fix's scalar-media carve-out cost a whole cycle — removed only when the per-area router landed.)*
4. **NO SKIPPING** — every draft class's content + CSS transfers to the clone, OR is reported skipped-with-reason, per class.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live DOM + computed-style on page 8 vs the draft's real values. *(Violation: closing on assertion output / a test page / the emit alone.)*
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS** — inline beats `@media` and kills responsiveness. *(The container thread fixed the cascade so tier stylesheets now win — do not reintroduce inline bases.)*
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-11 close)

Both side-programmes are COMPLETE and merged to main: **Spec 30 P1** (WC chassis: theme support, single-product/archive templates + parts, dependency manifest, runtime compat check — D210; FR-30-12 ungated) and the **container 4-layer programme** (responsive padding/margin, content band, per-area `<area>+<Suffix>` grid layer per FR-22-21.3, hero aligned with splitColumnRatio→gridTemplateColumns migration, control-UX standard + zero-tolerance guard — D211). The re-clone + full ledger walk flipped **8 rows VERIFIED** (H-B + GF-B.1/B.3/B.4/D.1/G/H/I — live-confirmed on page 8). **~44 rows remain OPEN**, clustered by converter family: featured-product 14, social-proof 8, ingredients 5, hero/trust-bar/brand tails 9, GF-B.2/C. Two instruments are known-bad: clone-parity.js's aggregate (BEM-class blind spot — RETIRED as a gate; per-row live-DOM probes are the acceptance) and a global 16→18px base-font drift inflating every comparison.

## Task 1 — Testimonial slides render EMPTY on the live page [FIRST — customer-visible defect]

**What:** on page 8, the testimonial slider renders but the inner `sgs/testimonial` content does not surface — empty slides, live.
**Why first (Bean call, D211):** real content vanishing beats routing backlog; it also blocks measuring SP-C/D/E.
**Orchestration:** `/systematic-debugging` — root cause before any fix. Candidates to rule in/out with evidence: the D8 typed-attr 7-variant rebuild + v8 migration (did the converter emit pre-v8 markup the migration doesn't catch live?), slider render.php InnerBlocks surfacing, converter emitting empty typed attrs. Read the emitted `wp:` markup for the testimonial section + the live DOM + render.php BEFORE theorising. The slider/testimonial split is render-layer vs emission — distinguish per `distinguish-render-artefact-from-converter-emission`.
**Acceptance:** slides show quote/name/role content on live page 8 at 375/768/1440; the relevant ledger rows (SP-C/D/E) become measurable.

## Task 2 — Ledger family burn-down (~44 OPEN rows) [the core work]

**What:** work the OPEN rows BY FAMILY (the per-family clusters share root causes): featured-product (14, families F1/F3/F5/F6a), social-proof (8), ingredients (5), hero/trust-bar/brand tails (9), GF-B.2/C.
**How:** per family — read the family's rows + the draft CSS + the emit + the live DOM; fix the converter family mechanism (universal, Rule 3); re-clone; **walk the claimed rows with targeted live-DOM probes and report fixed/stayed PER ROW** (`acceptance-is-the-ledger-not-the-mechanism`). `/qc-council` per converter commit (blub.db 255).
**Acceptance:** ledger rows flip to VERIFIED with live evidence cited per row. The aggregate differ score is NOT the gate.

## Task 3 — Measurement layer repairs [parallel/cheap]

(a) **Global 16→18px base-font drift** — root-cause at the theme/global-styles layer (`wp_global_styles` post supersedes theme.json on the canary — memory `canary-live-styles-come-from-wp-global-styles-post`); every probe and Bean's eye currently fight this noise. (b) **clone-parity matcher** — either teach it to pair draft elements to native SGS output (section-scoped, role-based) or formally demote it to draft-side-only triage; the per-row probe harness from the ledger walk is the acceptance instrument either way.

## Task 4 — FR-30-12 product-page clone [UNGATED, queued]

Spec 30 P1 is complete (D210): the single-product template chassis is live. When the homepage families are substantially closed (or Bean pulls it forward), run the product-page clone to a real `product` post (`is_product()`), converter-produced end-to-end, zero draft BEM classes. Fixture: published 48-SKU variable product **540** (`mamas-test-box-48-sku-fixture`) — product 1017 is DRAFT.

## Dependency graph
```
Task 1 (testimonial-empty, systematic-debugging) → unblocks SP-C/D/E measurement
Task 2 (family burn-down, per-row probes)  ║  Task 3 (font drift + matcher — parallel)
   ↓ /qc-council per converter commit + live page-8 verify per row
Task 4 (product-page clone, FR-30-12) — after Task 2 progress or Bean pull-forward
commit by explicit path (threads share main)
```

## Methodology guardrails (do not skip)
- **Deploy before measure** — any change visible on page 8 needs `build-deploy.py --blocks-only` + OPcache reset BEFORE any probe/parity run. Bump block.json version with ANY style.css change (CDN ?ver).
- **Root cause before instance fix** — ask "what's the CLASS of failure?" before tuning one instance.
- **Verify the LIVE DOM, not the emit/score** (R-22-11) — emit-green ≠ render-fixed. Open the real page.
- **Per-row probes are the acceptance; the parity aggregate is RETIRED as a gate** (D211; `parity-bem-class-blind-spot-for-converted-output`). Report fixed/stayed PER LEDGER ROW after every converter change.
- **Fact-check every gap/claim against the DB before acting** — `slots.aliases` incl. synonyms + full `block_attributes` incl. presets/child-blocks/per-area families (the `ghost`=outline false-gap lesson). The per-area layer (`<area>+<Suffix>`) is now registered — query it before claiming "missing".
- **/qc-council BEFORE every commit** touching converter/pipeline/SGS-block logic (blub.db 255).
- **Commit by explicit path** (`git commit -- <paths>`) — threads share `main`.
- **`--converter-v2` required** on production orchestrator runs; **WP_DEBUG_DISPLAY false** on staging.
- **On Playwright MCP "Browser is already in use"** → switch to chrome-devtools MCP/CLI (Bean preference).

## Skills to Invoke
| Skill | When |
|-------|------|
| `/systematic-debugging` | Task 1 testimonial-empty root cause (FIRST) |
| `/qc-council` · `/adversarial-council` | per converter commit / shared-mechanism design gate |
| `/subagent-driven-development` · `/dispatching-parallel-agents` | Task 2 family dispatch |
| `/sgs-clone` · `/sgs-update` · `/verify-loop` | re-clone / DB sync / 2-attestation |
| `/wp-blocks` + `/sgs-db` | schema before any "missing X" claim (incl. the new per-area attrs) |
| `/gap-analysis` | grade outputs before delivery |
| `/strategic-plan` | if the family burn-down needs re-sequencing |
| `/lifecycle` | before any skill/agent/pipeline change |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| chrome-devtools MCP (Playwright fallback) | live page-8 DOM/computed-style probes (375/768/1440; login via `.claude/secrets/sandybrown.env`) |
| `/wp-blocks` + `/sgs-db` | DB ground truth (per-area families registered post-/sgs-update) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` (else general-purpose sonnet) | heavy converter/family builds (Task 2) |
| `design-reviewer` | visual verify of re-cloned page 8 |

## Guardrails
This thread owns the converter + homepage pipeline; WC build work belongs to the theme thread (Spec 30 P2 is theirs). Commit by explicit path. Deploy before measure. Per-row probes, never the aggregate. Fact-check against the DB first. The ledger is the acceptance surface — lead every report with the ledger delta.
