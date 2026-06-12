---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-12
primary_goal: "Close the P5 block-quality cluster (the largest remaining family) on the homepage clone — BR-C button, SP-F slide-card, TB-A/B gap+circle-bg, FP-N/I/O/P, IN-C — as a block-quality pass (render-defaults, NOT converter routing). The text-CSS cluster (P1/P2/P4 margin/font/colour/text-align/border-radius) is CLOSED + live-verified this session. Acceptance = ledger rows flip VERIFIED with per-row live page-8 evidence."
---

# Next session — P5 block-quality cluster (+ P7/P8 + P3 content-band)

> Invoke `/autopilot` first. Read this prompt + `.claude/plans/2026-06-09-clone-fix-sign-off-ledger.md` (THE acceptance surface) + `.claude/reports/2026-06-12-ledger-rebaseline-live-dom.md` (the live re-baseline — trust it over old family tags) before acting.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block action)

1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM. *(Violation: an emitted block whose `className` carries a draft BEM element class like `sgs-x__y`. NOTE: the text-leaf path still carries draft classes additively — a deferred cleanup, not this session's scope.)*
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. Only the live WC configurator `sourceMode='wc-product'/'sgs-cpt'` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception without universal justification. Over-broad universality is also a Rule-3 break (the testimonial lift hit ~50 blocks and was narrowed to a DB opt-in capability).
4. **NO SKIPPING** — every draft class's content + CSS transfers to the clone, OR is reported skipped-with-reason, per class.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live DOM + computed-style on page 8 vs the draft's real values. *(Violation: closing on assertion output / a test page / the emit alone. THIS SESSION'S LESSON: emit-green ≠ rendered — a lift can be correct in the emit and paint NOTHING; verify the full render chain.)*
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS** — inline beats `@media` and kills responsiveness.
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, most-used block) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-12 close)

**The text-CSS cluster is DONE + live-verified + on main.** Section padding was a non-bug (renders fine via WP-native spacing — the prior "Stage 1 padding routing" priority was a misdiagnosis, disproved live). The 55-row ledger was re-baselined against the live DOM: ~13 rows were already fixed, ~22 are genuinely broken in 8 patterns (P1–P8), ~7 are design decisions. **Closed this session:** P1 margin (GF-C/GF-E/SP-B), P2 Fraunces font (FP-M/GF-E/F), colour + text-align on lifted text, P4 label border-radius (GF-D.2). The fix was a 3-layer render chain (orphaned scoped CSS → block attrs; number+unit split for number-typed attrs; font-family esc_attr→safecss mangling). **Remaining real defects cluster in P5 (largest), P7, P8, and a correctly-rescoped P3 (content-band max-width).** All cloning commits are on `origin/main` (top `44ab24fa`); the theme thread completed Spec 30 P2 (D214).

## Task 1 — P5 block-quality cluster [THE PRIORITY]

**What:** close the P5 rows — BR-C (brand outline button: transparent border + pink text), SP-F (testimonial slide-card cream bg + 8px radius double-card), TB-A/B (trust-bar gap 7→12px + circle bg cream→white), FP-N (price-row align baseline), FP-I (card image height 220px), FP-P (CTA full-width), FP-O (cards equal height), IN-C (feature-grid alignItems stretch).
**Why:** the biggest remaining family; mostly block-default / F3 issues (the block's render defaults diverge from the draft), better fixed at the BLOCK level than converter routing.
**Estimated time:** ~30-45 min (per-row block-default fixes + one re-clone/verify cycle).

**Orchestration:**
- Execution: per-row root-cause inline; delegate the block edits to subagents.
- Model: sonnet per block edit via /delegate; opus for any shared-mechanism decision.
- Dispatch pattern: `/subagent-driven-development` (implementer + reviews) per block, OR `/dispatching-parallel-agents` across disjoint blocks.
- Brief: for each row, root-cause whether it's a block render-default (fix block.json/render.php/style.css) or a genuine converter non-transfer (fix the lift). Most P5 are block-defaults.
- Context: the re-baseline report has each row's live-vs-draft delta. The text-CSS fix pattern (lift→attr→render→safecss) is the template for any converter-side P5.
- Depends on: none. Parallel with: P7/P8 (disjoint blocks).
- /qc gate after: `/qc-inline` per block; `/qc-council` if any converter/shared-mechanism change (blub.db 255).

**Acceptance:** each P5 ledger row flips VERIFIED with a per-row live page-8 getComputedStyle probe on the RENDERED native element (not the BEM-class differ, not the emit).

## Task 2 — P7 content/icon extraction + P8 testimonial typography [parallel with P5]

**What:** P7 — IN-D (emoji 🌾🍺🌿🌱 emitted as Lucide SVG; wrong field extracted), IN-F (notice-banner renders empty + wrong info-blue bg). P8 — SP-D.1 (star size 18px≠15px), SP-E (quote not italic + wrong size/colour, author weight). **BR-B is media-sideload (image 0×0 = 404), NOT converter — route to the media pipeline.**
**Why:** distinct converter content-extraction + testimonial-block typography defects.
**Estimated time:** ~20-30 min.
**Orchestration:** delegated, sonnet via /delegate; `/subagent-driven-development`. Depends on: none. Parallel with: P5. /qc gate: `/qc-inline` + live probe.
**Acceptance:** rows flip VERIFIED with live page-8 evidence per row.

## Task 3 — P3 content-band max-width + IN-E re-verify [cheap, after P5]

**What:** IN-B (`max-width:var(--content-width)`) + H-C1 (hero per-area `subHeadlineMaxWidth`) need content-band / per-area handling — NOT the literal-px leaf opt-in shipped this session. Re-verify IN-E (feature-card text-align: confirm the draft genuinely renders left before treating as a defect — suspected misdiagnosis).
**Estimated time:** ~15 min.
**Orchestration:** inline root-cause; delegate the converter change if real. /qc gate: live probe.
**Acceptance:** IN-B/H-C1 content-band width lives on the right attr + renders; IN-E confirmed faithful OR fixed.

## Open follow-ups (parked)
- **Design decisions (Bean sign-off):** FP-D (card-grid block resolution), FP-K (intentional pack label), FP-DRAFT/TB-C-draft (draft BEM edits), TB-C (icon — emitted attrs correct, needs visual check), SP-C (no concrete expected value), SP-G (testimonial-slider vs grid block-type choice).
- **Task 4 — FR-30-12 product-page clone** (ungated, queued): once homepage families substantially closed, clone to a real `product` post (`is_product()`), converter-produced, zero draft BEM classes. Fixture: published 48-SKU variable product 540.
- **Measurement (Task 3 of prior plan):** global 16→18px base-font drift (theme layer); clone-parity matcher BEM-blind-spot (per-row probes are the gate, parity aggregate RETIRED).
- **Deferred cleanup:** the text-leaf path still emits draft classes + scoped CSS additively (Rule 1 tension) — retire once the attr-lift fully covers the long tail.

## Dependency graph
```
Task 1 (P5 block-quality)  ║  Task 2 (P7 + P8)      [parallel — disjoint blocks]
   ↓ /qc-inline + per-row live probe per block
Task 3 (P3 content-band + IN-E re-verify)
   ↓ /qc-council per converter/shared-mechanism commit + live page-8 verify per row
commit by explicit path; merge to main via temp-worktree cherry-pick
```

## Methodology guardrails (do not skip)
- **Emit-green ≠ rendered (THIS SESSION'S HARD LESSON).** A converter attr-lift can be correct in the emit and paint NOTHING. Verify the full render chain on the LIVE DOM: block attribute TYPE (number vs string) → WP `supports` → render.php emission → `safecss_filter_attr`. Bisect with an isolated server `do_blocks('<!-- wp:sgs/x {...} /-->')` one-shot runner (token-gated webroot PHP, curl, rm). (`feedback_converter_attr_lift_must_verify_full_render_chain`.)
- **Deploy before measure** — render.php/block changes need `build-deploy.py --skip-build` (deploys current `build/`) + OPcache reset BEFORE any probe. Content-only changes use `upload_and_patch.py <run-dir> --target-id 8`. `npm run build` via PowerShell (broken node wrapper in Bash). Bump block.json version with any style.css change (CDN ?ver).
- **Root cause before instance fix** — ask "is this a BLOCK render-default or a converter non-transfer?" before touching the converter. Most P5 are block-defaults.
- **Verify the LIVE DOM, not the emit/score** (R-22-11) — per-row getComputedStyle on the RENDERED native element. Aggregate parity differ is RETIRED as a gate (BEM-blind-spot).
- **Per-row probes are the acceptance** — report fixed/stayed PER LEDGER ROW after every change; lead with the ledger delta.
- **Fact-check every gap/claim against the DB first** — `db.block_attrs(slug)` (attr names + types), `property_suffixes`, `slots.aliases`. The re-baseline's "540px" was a wrong literal (actually a var); confirm draft values before building.
- **/qc-council BEFORE every commit** touching converter/pipeline/SGS-block logic (blub.db 255). Design-gate shared-mechanism / most-used-block changes (Rule 7).
- **Commit by explicit path** (`git commit -- <paths>`); threads share `main`. Merge via temp-worktree cherry-pick (`git worktree add --detach <tmp> origin/main` → cherry-pick → push HEAD:main), NEVER a branch merge into the primary worktree.
- **--converter-v2 default on; WP_DEBUG_DISPLAY false on staging. On Playwright MCP "Browser is already in use" → switch to chrome-devtools MCP/CLI.**

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | architectural/design decisions on block-quality fixes |
| `/strategic-plan` | if P5 needs re-sequencing across blocks |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` | block-default best-practice questions (auto-routes tier) |
| `/gap-analysis` | grade outputs before delivery |
| `/systematic-debugging` | root-cause any "fix didn't render" (the emit≠render trap) |
| `/qc-council` · `/adversarial-council` | per converter commit / shared-mechanism design gate |
| `/subagent-driven-development` · `/dispatching-parallel-agents` | P5/P7/P8 block dispatch |
| `/sgs-clone` · `/sgs-update` · `/verify-loop` | re-clone / DB sync / 2-attestation |
| `/wp-blocks` + `/sgs-db` | schema + attr TYPES before any "missing X" claim |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| chrome-devtools MCP (Playwright fallback) | live page-8 DOM/computed-style probes (375/768/1440; creds `.claude/secrets/sandybrown.env`) |
| `/wp-blocks` + `/sgs-db` | DB ground truth (attr names + TYPES — number vs string matters for the render chain) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` (else general-purpose sonnet) | block-quality fixes (P5/P7/P8) — block.json/render.php/style.css |
| `design-reviewer` | visual verify of re-cloned page 8 |

## Guardrails
This thread owns the converter + homepage pipeline; WC build work belongs to the theme thread. Commit by explicit path; merge to main via temp-worktree cherry-pick. Deploy before measure. Per-row probes, never the aggregate. Verify the full render chain (emit-green ≠ rendered). Fact-check attr TYPES against the DB first. The ledger is the acceptance surface — lead every report with the ledger delta.
