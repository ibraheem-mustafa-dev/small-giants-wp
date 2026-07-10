# Per-track next-session prompts — no-inline rollout (split-edit / serial-land)

These are self-contained kickoff prompts for the PARALLEL completion of the no-inline styling
rollout. Master plan + rationale: `.claude/plans/2026-07-10-no-inline-parallel-rollout.md`.

## How to use
1. **Run the EDIT tracks in parallel** — open a Claude Code window per track and paste "Go, run
   `.claude/next-session-prompts/track-<X>.md`". Each works in its OWN git worktree (`feat/no-inline-track-<X>`),
   FILES ONLY, and writes `reports/no-inline-track-<X>-report.md`. They do NOT deploy, seed the DB, or commit to `main`.
   You can run as many in parallel as you like — they touch disjoint block dirs, so they never collide.
2. **When the edit tracks are done, run ONE integration session** — `.claude/next-session-prompts/INTEGRATION.md`
   merges every branch, seeds the DB centrally, deploys ONCE, and harness-LANDs every block, then closes the rollout.

The tracks are IDENTICAL in their shared instructions (reading gate, shared-resource protocol, recipe, STOPs) —
they differ ONLY in their block roster + per-block classification.

## Tracks (disjoint block sets — together = the whole remaining roster)
| Track | Pattern | Blocks |
|-------|---------|--------|
| A | leaf / simple → block-private | audio, buybox, cart, filter-search, mobile-nav-toggle, product-search, responsive-logo, multi-button |
| B | content-KIND composites → block-private (like quote) | info-box, testimonial, team-member, product-faq, product-faq-item, notice-banner, option-picker |
| C | section/layout composites → keep-wrapper (like hero), grid family | card-grid, feature-grid, cta-section, gallery, post-grid, google-reviews, trustpilot-reviews, modal |
| D | composites w/ child items + forms + F3-drain | accordion(+item), tabs(+tab), testimonial-slider, content-collection, trust-bar, pricing-table, form(+step+field-tiles) |
| E | product-card (complex, own window) | product-card |
| — INTEGRATION — | serial LAND (merge → seed → deploy once → harness-LAND all → Task 4 close) | (all of the above) |

Reconcile-6 bucket (button/container/business-info/social-icons residual native supports) = DONE (D298, `ee01c887`).
Sequential Wave-3/Wave-4 in `.claude/next-session-prompt.md` remains valid if you prefer one window at a time.
