---
doc_type: pixel-diff-report
project: small-giants-wp
run_date: 2026-05-17
source_posts:
  mockup_baseline: post 66 — /2026/05/15/spec16-p7-mockup-baseline-2026-05-15/
  sgs_output: post 65 — /2026/05/15/spec16-p7-converter-v2-output-2026-05-15/
  deployment_freshness: deployed 2026-05-15 21:58 (pre-P-PHASE8-NEW-1 voter fix)
threshold: 1%
verdict: all 21 fail threshold — baseline measurement
---

# Per-section pixel-diff baseline — 2026-05-17

## Headline

All 21 diffs (7 sections × 3 viewports) fail the 1% threshold against deployed posts. Numbers match the prior session's recorded baseline expectations almost exactly — confirming we're measuring the same state, with the voter fix from this session's commit `e34618f9` not yet propagated to sandybrown (orchestrator was run with `--skip-register --skip-autonomy-gate` so no deploy happened).

## Per-section numbers

| Section | 1440 desktop | 768 tablet | 375 mobile | Issue family |
|---|---:|---:|---:|---|
| hero | 70.65% | **99.89%** | 80.43% | Tablet viewport selector mismatch (768 = 100% implies cropping wrong element). Per-block render audit gaps on desktop + mobile. |
| trust-bar | **99.70%** | **99.66%** | **99.54%** | Schema/render mismatch — block is stat-counter shape, mockup uses trust-badges shape (deferred decision — Priority #3). |
| featured-product | 35.88% | 31.15% | 59.28% | Per-instance product-card attrs unfilled — extraction_failed bucket. |
| ingredients-section | 49.42% | 28.75% | 29.85% | feature-grid info-box children missing per-item content lift. |
| gift-section | 48.02% | 46.09% | 34.56% | Same pattern as ingredients — feature-grid composition gap. |
| social-proof | 76.13% | 77.82% | 71.82% | Testimonial-slider carousel vs static cards mismatch (deferred decision similar to trust-bar). |
| heritage-strip | **99.74%** | **99.59%** | **99.43%** | Section essentially unrendered. Post-this-session it routes via pattern:brand with sgs-brand classes, but deployed posts still have stale state. Will need re-deploy to measure post-fix numbers. |

## Match against next-session-prompt expectations

The 2026-05-16 handoff recorded these expected baselines:
- trust-bar: 99.7% ✓ matches (99.70%)
- heritage-strip: 99% ✓ matches (99.74%)
- hero 1440: 71% ✓ matches (70.65%)
- hero 768: 100% ✓ matches (99.89%)
- hero 375: 80% ✓ matches (80.43%)

**No drift since 2026-05-16 close** — confirms this is a faithful baseline.

## What this session's commit (`e34618f9`) is expected to change

| Section | Expected change | Why |
|---|---|---|
| heritage-strip | Should improve markedly once deployed | className now sgs-brand matching regenerated CSS selectors. Selector for the next pixel diff: `.sgs-brand` not `.sgs-heritage-strip`. |
| All others | Unchanged | Voter fix is heritage-strip-specific. |

**But** — see parking P-PHASE8-NEW-2: Stage 4 converter doesn't honour `pattern:brand` routing. Even after deploy, the brand section will emit as sgs/container + descendants (preserving classNames but not invoking brand.php composition). To measure brand.php's actual pattern rendering, P-PHASE8-NEW-2 needs to close first.

## Recommended next actions (priority order)

1. **Deploy `e34618f9` to sandybrown** to refresh post 65, then re-run heritage-strip diffs with `--selector .sgs-brand` for a post-fix baseline.
2. **Close P-PHASE8-NEW-2** (Stage 4 pattern routing) so brand.php is actually emitted. This unblocks meaningful pixel-diff closure on the brand section.
3. **Trust-bar schema decision** (Priority #3 from next-session-prompt — was Bean's deferred decision). Numbers confirm the block currently doesn't match the mockup intent in any viewport. Three paths still on the table: variant enum / rewrite mockup / split into two blocks.
4. **Hero 768 selector investigation** — 100% on tablet is almost certainly a selector or media-query bug, not a content issue. Cheap win.
5. **Per-instance lift gaps** for featured-product / ingredients / gift / social-proof — these are LIFT FIDELITY work, downstream of the universal BEM-child array lifter from yesterday's commit.

## Output artefacts

Per-section composite/heatmap/diff.json under:
- `reports/pixel-diff-2026-05-17/<section>-<viewport>/`

21 directories total, each with:
- `mockup.png` — cropped mockup screenshot
- `sgs.png` — cropped SGS screenshot
- `composite.png` — side-by-side
- `heatmap.png` — pixel diff visualisation
- `diff.json` — numerical readout + verdict
