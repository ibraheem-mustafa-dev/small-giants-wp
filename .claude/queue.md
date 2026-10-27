# Cross-track queue (append-only)

The signal between parallel sessions working the cloning tool plan (`.claude/plans/2026-10-23-cloning-tool-completion.md`, "How the work runs"): one line per event (`- <date> <track> <event> (<detail>)`), appended, committed and pushed at once. Read it before any reseed, deploy, calibration, mirror use, Fill run or framework-DB read, and write a start and an end line around each.

- 2026-10-27 F calibration-start local-mamas (sgs/account: proves the council's test-order fix)
- 2026-10-27 F calibration-end local-mamas (sgs/account 96 settings accepted with the council's test-order fix; the mirror holds 0 orders afterwards). local-mamas free
- 2026-10-27 F deploy-start all (6a5cd9f09 empty-string tier, 105fc7665 account selectors, 660f0b09c; hold site runs, calibrations and mirror syncs until F deployed)
- 2026-10-27 F deployed all five at 27096528e (code 660f0b09c: empty-string tier, account selectors, calibration test-order key), gate-full 13/13; mirrors synced (local-eye-care, local-sandybrown, local-indus, local-mamas). F calibrations follow on mirrors one at a time (selector-less state targets)
- 2026-10-27 F calibration-start local-eye-care (--recalibrate 15 blocks after c66a378cf: accordion, audio, container, form, heading, measured-diagram, mega-panel, nav-bar-menu, nav-drawer-menu, nav-drawer, product-faq, social-icons, text, timeline, wishlist-panel)
- 2026-10-27 F calibration-start local-indus (sgs/mega-panel with the drawer-context fixture variant, alongside the local-eye-care run)
- 2026-10-27 F calibration-end local-eye-care, local-indus (after c66a378cf/69fbe21df: 14 of 15 blocks accepted - mega-panel 65 settings with 23 drawer settings measured on local-indus, timeline 55 twice in a row; sgs/wishlist-panel refused on both mirrors for sgsHideOnDesktop, old map kept, cause open). Mirrors free
- 2026-10-27 F reseed-start (from main 825b13036: sgs/info-box scaleHover element correction; hold calibrations and Fills until reseed-done)
