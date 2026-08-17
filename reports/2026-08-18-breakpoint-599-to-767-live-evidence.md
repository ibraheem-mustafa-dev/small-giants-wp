---
doc_type: report
title: Live evidence — device-tier breakpoint 599px → 767px (4 block stylesheets)
date: 2026-08-18
commit: efe5c2a3
---

# Live evidence — 599px → 767px device-tier fix

**Why this file is not a `reports/visual-diff/<block>-<date>.md` gate report.** The commit was made
with a scoped, logged `SGS_VISUAL_GATE_SKIP` (see `reports/visual-diff/manual-skips.log`) because of
a genuine ordering constraint: live evidence needs the canary to carry the CSS, the deploy dirty-gate
needs the source committed first. After deploying, `visual-report-sha.py` cannot produce a
`source_sha` for an already-committed change (nothing staged), and a gate report carrying no valid
sha is exactly the "report describes a different change" failure the sha check exists to catch. So
the evidence is recorded here instead, as a report, rather than as a gate artefact that would be
stale by construction.

## Assertions, stated before measuring

1. On the live canary, each of the four changed blocks serves `max-width: 767px` and no `599px`.
2. `post-grid`'s companion tablet range serves as `768px <= width <= 1023px`, not `600px <= …`.
   Without this, 600–767px matches both blocks and the tablet block wins on source order — the fix
   would be silently cancelled.
3. `form` still serves `599px`. Its query sits inside `@supports not (container-type: inline-size)`,
   a container-query fallback, not a device tier. It must NOT have changed.
4. On a rendered page, `.sgs-info-box--media-left` resolves to `flex-direction: column` at ≤767px.

## Live results

Deployed to sandybrown at `efe5c2a3` (payload-verify: all 83 block.json checksums matched).

Served build CSS, read over SSH from
`…/wp-content/plugins/sgs-blocks/build/blocks/<block>/style-index.css`:

| block | `767px` | `599px` |
|---|---|---|
| info-box | 1 | 0 |
| tabs | 2 | 0 |
| gallery | 1 | 0 |
| post-grid | 1 | 0 |
| **form** (control) | 0 | **1** |

- Assertion 1 — **PASS**.
- Assertion 2 — **PASS**. Server returns `768px <= width <= 1023px`.
- Assertion 3 — **PASS**. `form` retains its 599px. This is the negative control proving the change
  was targeted and not a blanket sweep.
- Assertion 4 — **PASS**, measured on a rendered page
  (`/bp640-probe/`, page 2500). The page's own `sgs-info-box-style-inline-css` block serves:

  ```css
  .sgs-info-box--media-left{flex-direction:row}
  @media (max-width:767px){
    .sgs-info-box--media-left,.sgs-info-box--media-right{flex-direction:column}
  }
  ```

  At a 640px viewport `640 <= 767`, so the query matches and the box stacks. Before the change
  `640 > 599`, so it did not match and the box stayed side-by-side. `grep -c '599px'` on the rendered
  page returns **0**.

## Scope deliberately excluded

`countdown-timer`, `google-reviews`, `process-steps`, `trust-bar` keep their 599px values. They are
cosmetic-only rules (font-size / gap / padding / touch-target), not layout-direction or column-count
device tiers — and `google-reviews` + `process-steps` already carry correct 767px device-tier rules
elsewhere in the same file. Changing them would have been churn, not a fix.

## Follow-up

`CLAUDE.md` cites "D228, unified 2026-06-16" as the decision retiring 599px. That D-number does not
resolve to that content in `decisions.md`. The 767/1023 standard itself is real and verified in code
(`includes/class-sgs-breakpoints.php`: `MOBILE_MAX = 767`, `TABLET_MAX = 1023`) — only the citation
is wrong, and it should be repaired or dropped.
