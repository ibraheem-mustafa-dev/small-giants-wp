# Live verification: mega-panel in Wave 3C U-5, 2026-09-24

verdict: PASS
intent_capture_passed: true
commit_sha: 01e4b5a5f

`staggerOnOpen` and the JS stagger module it drove are removed; the panel's item stagger is now the bar's `submenuItemStagger` (CSS). Full capture: `reports/visual-diff/nav-drawer-2026-09-24.md` section "U-5", rows U5-4 to U5-6 (measured on a dropdown: the sandybrown test menu has no mega item, and both forks share one `.sgs-nav-bar-menu__panel-motion` rule set, asserted in `tests/php/run-u5-motion-standalone.php`). Stored `staggerOnOpen: true` on mega post 1745 was stripped before the deploy.
