# Live verification: header colour follows the section, and the direction restyle (Wave 3C U-13, M-04 and M-03), 2026-09-26

verdict: PASS
intent_capture_passed: true
source_commits: 0844bb1cf, 97b7df3a1, 93196a939, 31c2ed4c5, 51d80ff73 (U-13 build, see plan §4 U-13)
source_sha: not computed; U-13 changed `src/header-behaviours/view.js` and `includes/class-sgs-header-behaviours.php` beside the block directories.
design: `.claude/reports/2026-09-26-u13-header-ink-design.md`
blocks: sgs/site-header (`sectionInk`, `inkOnLight`, `inkOnDark`, `fillOnLight`, `fillOnDark`, `scrolledTrigger`, `scrolledOffset`), sgs/nav-bar-menu links following the ink

## Environment and method
- Site: sandybrown, repo at 84f04635e. Fixture `plugins/sgs-blocks/scripts/nav-qa/qa-item-markup-fixture.php` cases `section-ink`, `section-ink-off` and `direction-fade` on test header 3777 over page `/qa-section-ink/` (light, dark, photo attachment 3459, a plain dark `core/group`, light again), applied, measured and restored to `two-bar` in one trapped command (`plugins/sgs-blocks/scripts/nav-qa/README.md` §11). Restore exit 0.
- `node plugins/sgs-blocks/scripts/nav-qa/u13-ink-probe.mjs https://sandybrown-nightingale-600381.hostingersite.com/qa-section-ink/ --expect on`, then `--expect off` (the negative control), at 375/768/1440.
- `node plugins/sgs-blocks/scripts/nav-qa/m03-direction-probe.mjs https://sandybrown-nightingale-600381.hostingersite.com/qa-section-ink/` (real wheel input) at 375/768/1440.

## Results
| # | Check | Result | Measured |
|---|---|---|---|
| 1 | Ink follows the section under the header (wearecollins' pair) | PASS | light, photo and light-again sections: tone light, ink rgb(20, 7, 0) on rgb(248, 248, 247); dark section and plain dark group: tone dark, ink rgb(248, 248, 247) on rgb(20, 7, 0); 18.64:1 on every section at 375, 768 and 1440 |
| 2 | Menu links follow the ink | PASS | link colour equals the ink on every section at every width |
| 3 | Negative control: feature off | PASS | no tone class; ink rgb(58, 46, 38) on rgb(251, 243, 220), 11.86:1, unchanged across all five sections at every width |
| 4 | Direction restyle (fantasy): fill at rest | PASS | `::after` opacity 1, linear-gradient rgba(0,0,0,0.5) to transparent, transition opacity 0.3s, at every width |
| 5 | Fill gone going down past 100px | PASS | at y=477 scrolled, `::after` 0 (10 samples at 0.00) |
| 6 | A 5px nudge up holds the state | PASS | y=475, still scrolled, `::after` 0 |
| 7 | 15px up brings the fill back | PASS | y=465, fade samples rising 0.00 to 1.00 at 375, 768 and 1440 |

## Residue, named
- fantasy's light half and lusion's black and blue states are not measurable live.
- The ink colours carry no `css_state`, so the converter cannot route a draft's CSS to them.
- axe at 375 reports the top row's phone button, cream on Mama's pink at 2.4:1, with the feature on or off: Mama's `primary-text`, tracked in the LEDGER, not a U-13 defect.
