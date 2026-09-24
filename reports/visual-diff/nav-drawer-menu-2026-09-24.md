# Live verification: nav-drawer-menu in Wave 3C U-9 + U-11, 2026-09-24

verdict: PASS
intent_capture_passed: true
commit_sha: c36105939

The full capture (one headed Chrome window on sandybrown, method, per-check measurements and limits) is `reports/visual-diff/nav-drawer-2026-09-24.md`. This block's row there: #8 accordionExclusive false drops the details name (the test menu has one submenu, so two-open was unit-tested, not exercised live).
