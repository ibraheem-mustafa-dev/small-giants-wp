# Live verification — sgs/nav-drawer — 2026-09-21 (Wave 3C U-1 commit 3: drawer stacking derives from the header)

verdict: PASS
intent_capture_passed: true
source_sha: 5e6204077634b7b5
commit_sha: e8c70192c (feat(site-header): per-tier zIndex attribute, single writer; drawer stacking derives from the header)

> `source_sha` is the `visual-report-sha.py` recipe applied to the committed bytes of
> `src/blocks/nav-drawer/style.css` in e8c70192c (the only nav-drawer file in the commit; the script
> reads the git index, which is empty after the commit).

Change: the drawer's `z-index` (was 90) and the scrim's (was 89) now read the header's published
`--sgs-header-z` (default 100 when unset): drawer `min(90, max(2, var(--sgs-header-z, 100) - 1))`, scrim
`min(89, max(1, var(--sgs-header-z, 100) - 2))`. At the default this is the previous 90 and 89.

Verified on the sandybrown canary with fixture page 3799 (`qa-hdr-z-index`) in real headed Chrome, page
fully loaded, one window:

| # | Check | Result | Measured evidence |
|---|---|---|---|
| 1 | Header at z 10 (desktop, 1440) | PASS | `dialog#sgs-nav-drawer` computed `z-index 9` |
| 2 | Header at z 999 (mobile, 375) | PASS | drawer computed `z-index 90` (cap) |
| 3 | Default (no header value) unchanged | PASS | the formula's fallback is 100, giving 90 and 89 (same as before); template header measured at 100 |

Not measured: the scrim and the non-modal open state over a low-z header (the default `modal` mode
uses the top layer, where z-index does not apply). The drawer's visible behaviour is unchanged at the
default; this is a stacking-scale change only.
