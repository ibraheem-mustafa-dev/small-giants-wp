# Live verification: self-changing header message (Wave 3C U-15, M-07), 2026-09-26

verdict: PASS
intent_capture_passed: true
source_commits: 16e20f873 (notice-banner messages, sgs/notice-message), 7046936cb (gate fixes)
source_sha: not computed; see `reports/visual-diff/furniture-2026-09-26.md` (the SHA script hashes staged files only).
design: `.claude/reports/2026-09-26-u15-notice-message-design.md`
blocks: notice-banner, notice-message

## Environment and method
- Site: sandybrown, fixture page 4072 `/qa-notice/` (tree `plugins/sgs-blocks/scripts/nav-qa/lane-c/qa-notice.json`), 1440 wide, one headed Chrome window.

## Results
| # | Check | Result | Measured |
|---|---|---|---|
| 1 | away: four messages rotate with per-message colours | PASS | active 0 then 1 after 5.6 s; bar fill `rgb(17,17,17)` then `rgb(216,83,88)` (away's #111111 and #d85358) |
| 2 | Pause control (WCAG 2.2.2) | PASS | 44x44; pressed: `aria-pressed` true, messages region `aria-live` polite, no change over 6 s; resumes on a second press |
| 3 | Arrows | PASS | 44x44 hit areas; next steps 1 to 2 |
| 4 | lamalama: random line per load | PASS | one of 8 shown and held, no pause button |
| 5 | studionamma: rotating city clocks | PASS | PARIS, FRANCE then LOS ANGELES, CA, each a live `sgs/local-time` |
| 6 | Regression control: static banner | PASS | not enhanced, output unchanged (byte-identical to the pre-U-15 render in `tests/php/run-notice-message-standalone.php`) |
| 7 | axe (WCAG 2.1 AA) | PASS | 0 violations |

## Recorded divergences and residue
- away's interval and transition were never measured: 5 s and fade are free choices.
- lamalama's mono text reveal is approximated by slide-up.
- lamalama's bar that appears only after the first scroll at 375 belongs to header behaviours (lane B).
- Bean's eye on the result is still open (the unit's review mode).
