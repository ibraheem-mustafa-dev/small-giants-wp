---
block: sgs/nav-drawer
date: 2026-08-07
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: chrome-devtools-mcp (Playwright reserved for a co-active session)
deployed_build: sandybrown canary, deploy 2026-08-07, verified by md5 of deployed files vs local build
change: Spec 32 stranded ':not([style*=...])' fallback-guard purge
---

## What changed
`trigger` anchor now reads `var(--sgs-drawer-trigger-top/-right)`, written from the burger's measured rect at open time (the D404 measure-and-write pattern). Stranded guard in the PHP-built CSS de-specified.

## Live measurement (post-deploy, on the real canary)
Deployed `build/blocks/nav-drawer/render.php` on the server contains the trigger custom properties (grep count 2, verified over SSH post-deploy). The properties are absent from the computed stylesheet on drawer pages using other anchors, which is correct — they emit only for `anchor='trigger'`.

## Negative control
No page on the canary currently uses `anchor='trigger'`, so the panel-follows-burger behaviour is NOT yet proven live. Stated as unproven rather than claimed.

## Limits
Measured on the canary only. This report evidences the FIRST-PAINT rest state;
hover and focus states were not captured.
