---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-11-23
---

# small-giants-wp: LEDGER (the one living status)

## Summary for Bean

- **The one active track is general cloning (Front H, Spec 48):** before 2026-11-28 you clone two new sites from Claude Design drafts, SGS and MIC (which has a shop), with no hand-built copy to lean on. Plan `plans/2026-11-19-general-cloning-work.md`; a session starts from `prompts/2026-11-22-general-cloning-next-session.md` (the proof clones of all three clients, one findings report, then your register of confirmed issues).
- **The rest of the WordPress framework is frozen** (your decision, 2026-11-12): security updates and client fixes only. The web engine is a separate project (`C:\Users\Bean\Projects\small-giants-engine`, its own LEDGER).
- **Live sites:** Mama's Munches is a live shop (`mamasmunches.com`); Indus and Eye Care are signed off. Each site's open items sit in its own brief (`sites/<client>/CLAUDE.md`).
- **Need you:** your eye on the proof pairs when the general track brings them.

## Blockers

- **Record stamps are stale** (blocks the deploy's full gate tier, so any `build-deploy.py` run that needs it): the lint autofix of 2026-11-23 touched 18 blocks, and their setting records need fresh browser verdicts, then `python plugins/sgs-blocks/scripts/setting-record/check.py --changed --restamp`. In hand in worktree `E:\sgs-tmp\wt-record`; clear this line when that lands on `main`.
- **Secrets lookup** (blocks media upload, refresh-from-remote, editor checks and motion probes for `mamas-test`): tools that build `.claude/secrets/<target>.env` from a target name do not find `live-mamas.env`. The fix, one lookup through the target's `calibration-targets.json` entry, is in hand in `E:\sgs-tmp\wt-secrets`; clear this line when it lands on `main`.

## Front H: general cloning

**State (2026-11-23):** calibration is retired. The route reads where each block setting paints from the setting record (DB table `setting_placements`, records in `plugins/sgs-blocks/scripts/data/setting-records/`) and each block's default look from the client's site look (`plugins/sgs-blocks/scripts/site-look/site_look.py`, built offline); the gate `retire-calibration` keeps the removed files gone. The last proof of the setting record (Mama's home on the scratch copy `local-mediatest-setrec4`) and the framed pictures' mat fix are in the plan's Task 8. Next: the plan's Task 8 (proof), as the start prompt orders it.

**Dead Custom CSS:** two rules name classes the framework no longer prints (Mama's Home, post 154, `.sgs-buybox__form`; Indus post 432, `.sgs-article-meta`), in their site briefs. Eye Care's phone hero framing had the same cause (a media class renamed on 2026-11-12) and now sits in the hero's own focal setting (62% 12% on phones, Bean's round 12; backup `darkcyan-grouse-898606.hostingersite.com-20261123-225354-before-hero-focal-write.sql.gz`).

## Live sites

- **What each runs** (`ssh hd "cat ~/.sgs-deploy-marker-<target>.json"`, read 2026-11-23): sandybrown and indus-test `ca6abcbeb`, eye-care-test and eye-care-clone-test `cf6ca94e5`, mamas-test `ed5effd01`. `main` is ahead of all five: the setting record and calibration's retirement, Custom CSS kept on every save and usable by anyone who may edit the page (Spec 32 FR-32-30), named extension settings sent only to their own blocks (the block editor's settings 16.9 MB to 2.9 MB on a copy of Mama's), the box-string rule refusing, the archive heading binding (`sgs/archive`) and the buy box's one-pick summary (`summaryTextOne`). Before a site's next deploy run `scripts/render-scope/render-scope.py` against the build it runs.
- **mamas-test (live shop):** back up first (`bash scripts/local-wp/backup-remote-db.sh mamas-test <label>`), check basket, checkout and account before and after any deploy or content change, never push a mirror onto it, never delete the `lightsalmon-tarsier-683012` hosting entry. Its open items: `sites/mamas-munches-redesign/CLAUDE.md`, "Live shop: open items".
- **Hosting entries (Bean, 2026-11-23):** `lightgreen-whale-237337` and `palegreen-goose-450620` (Hostinger's default page only) are kept for the SGS and MIC test sites. A client's test entry is deleted only when both hold: its main site is live, and the cloning pipeline is complete (today only Mama's meets the first; none meets the second). `lightsalmon-tarsier-683012` IS Mama's live shop and is never deleted. Mama's logins are `.claude/secrets/live-mamas.env` (keys `WP_*_MAMAS`); the deploy target keeps the name `mamas-test`.
- **eye-care-test** is Eye Care's hand-built, presented site: no clone or push ever writes to it; Eye Care clones go to eye-care-clone-test. **indus-test** is signed off. **sandybrown** is the canary (`CLAUDE.md`, Sites).
- **A Shop manager login is now safe on a site with Custom CSS** once that site runs `main`: a save keeps every block's Custom CSS (Spec 32 FR-32-30).

## Parked (framework, frozen; each is built when a client needs it)

- **Header and navigation, Specs 36 and 37:** Gate 3C item 4's last mile (deferred by you; list `archive/verify/merged-spec36-37-track.md`, "Gate 3C last mile"), Waves 4 and 5 (FR-37-56, FR-37-23; the substitution policy W4-a2 waits for your signature). FR-36-16 (the drawer's late-CSS A/B), FR-36-17 (mega pages over the CSS and JS budget), FR-38-31 (two wave styles painting black in a local Chrome).
- **Motion, Specs 38A and 49:** FR-38A-33's script-built effect layers, FR-38A-57 (slant, custom axis angle, typing cursor); Spec 49 Stage C (native parallax, uploaded mask shapes).
- **Shop look table** (Spec 27; template rework Task 5 b and c, `plans/archive/2026-11-18-template-rework.md`): hover and focus colours in the Cart and Checkout look table, and the table reaching other shop blocks. Fill and text colour are built.
- **Reusable looks** (template rework Task 6): Custom CSS that clones keep writing becomes settings. The button and carousel audit is 8 of 11 built and 3 partly; of the 75 ranked groups in `.claude/reports/2026-11-18-template-rework/by-missing-setting.md` 11 are built and 4 partly; none is yet proved by replacing Mama's Custom CSS.
- **JavaScript lint:** 3,018 errors left in `plugins/sgs-blocks/src` after the formatting autofix of 2026-11-23 (`ce1a9b318`, from 22,582); by rule, the twelve files left unformatted on purpose and what each rule needs: `plugins/sgs-blocks/CLAUDE.md`, "Lint".
- **Site speed leftovers:** one ready prompt, `.claude/prompts/2026-11-21-site-speed-leftovers.md`.
- **Custom CSS rulings and others:** CR12 (dark-mode toggle, three options on its register row), CR23 (about 72 Eye Care differences no setting reaches), WW-SH-04, the unwired nav-QA and motion-QA probes (`plugins/sgs-blocks/scripts/audit-live-script-closure.py`), the product card's 24 editor-canvas controls (baseline `plugins/sgs-blocks/scripts/wiring-fingerprint-baseline.json`), optional editor-check speed-ups (`plans/patches/`).
- **Parked plans:** the Snooza Chair configurator (`plans/2026-08-03-snooza-configurator-build-plan.md`); form and choice-flow pipeline and analytics (`plans/2026-09-26-form-choiceflow-pipeline-and-analytics.md`).

## Known failing tests

- **PHP:** 89 of 5,287 fail on `main` (83 failures, 6 errors; full run 2026-11-23), among them `CustomCssOutranksSettingsTest`'s commerce-look row at `root_repeat` 4 and `BuyboxSnapshotTest`. Compare failures test by test, never by the total.
- **Jest:** about 11 suites fail on `main`, among them `configurator-schema-compat` and `cursor-field-reveal-open`.
- **Python:** `plugins/sgs-blocks/scripts/db-consistency/tests/test_f6_consistency.py::TestCheck5VariantReseed` (4 tests whose fixtures predate the `slot_value` column).
- **Route:** `scripts/computed-route/tests/lint.test.mjs` fails 2 tests in a worktree without `plugins/sgs-blocks/node_modules` (the walker loads Playwright from there); a fresh worktree needs `npm ci` in `plugins/sgs-blocks` (`dev-setup.md`).
