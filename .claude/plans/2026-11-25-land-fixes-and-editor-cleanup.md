---
doc_type: plan
status: active
created: 2026-11-25
---

# Clone fixes before 28 November, with the block editor clean-up alongside, in parallel tracks

**Goal and why:** Bean must clone SGS and MIC from Claude Design drafts by 2026-11-28 with no hand fixes. The deadline lane (Tasks 1 to 10 and 14 to 16) holds what the clones need. The editor lane (Tasks 11 to 13) is the block editor clean-up Bean approved on 2026-11-25; it builds alongside but merges only after the deadline proof. Done for the deadline means: tonight's branch work and the clone root fixes are on `main`; an offline reclone of Mama's, Eye Care and Indus improves on every named surface with nothing worse; a timed fresh-site rehearsal passes; SGS and MIC have sites to clone onto; Bean's eye check passes.

**Evidence:** every proposal comes from a read-only investigation dated 2026-11-25, kept in `.claude/reports/2026-11-25-clone-investigations/` (cited as `iN`; their scratch scripts stay in `E:\sgs-tmp\general-cloning\investigate\`), reviewed by three independent reviewers with every finding verified (2026-11-25). Fix groups RF1 to RF10 and the Restore map come from `.claude/plans/2026-11-24-clone-root-fixes.md`; this plan governs where they differ. Worker briefs: `.claude/plans/2026-11-25-land-fixes-tracks/` (`_common.md` plus one per track, and the second-session prompt).

**How it runs:**
- Up to 8 workers per session (Claude Code's limit); the editor lane can run in a second session with its own 8 (Bean, 2026-11-25). Launch order, deadline first: A1, A2, A3, A4, B, C, D, F, L. As slots free: G1, then E1, E2, G2 and S when their branches have merged, then the editor lane W1 to W4. Agent-tool subagents (worker API credits are exhausted).
- Heavy runs (sweeps, browsers, render-check, plugin builds, multi-block record checks) go through `scripts/computed-route/tools/heavy-slot.mjs`: two slots, a third only after a ten-minute wait when CPU, memory and C: have room (Bean, 2026-11-25). The full suite runs only in the main session, alone.
- Workers commit on `fix/<label>` in `E:\sgs-tmp\wt-<label>`; temp, the record cache and scratch are on E:. The main session reviews each branch (`/code-review`, its tests, `check-mutation-lists.mjs` showing 0 new), then merges. No new pre-commit gate is added (Bean, 2026-11-25); the existing hook (gitleaks, generated-file sync) stays.
- After each merge group the main session reseeds the shared DB, regenerates the setting records (`check.py --changed --write`), applies the README text workers report, and runs the merged branches' tests.
- Merge order for the three conflicts: rf9 keeps both sides of `tools/run-tests.mjs`; rf5 before rf6 (`fill-prop.mjs`, `fill-resolve-element.mjs`); rf3 before rf7 (`skeleton-classify.mjs`).
- Deploys (Bean, 2026-11-25): Mama's live shop is brought up to date with `main` once now (backup, render-scope from its deployed commit, render-check on the states that lists, basket/checkout/account checks before and after), then paused until this plan is complete. `eye-care-test` is a test site and deploys with the others.

**Out of scope:** the text-only trust bar style (Bean: not restored); the chrome style choices' repair and "More options" (Task 30); stored conditions and "show when" (Task 29).

**Risks:** C: has about 12 GB free; temp, the record cache and scratch are all on E: now. Tracks B, C and D each edit a different part of `lib/setting-record.mjs`, and C and D different functions of `site_look.py`.

**First action:** the main session sweeps `main` once into `E:\sgs-tmp\general-cloning\baseline-main` (every track compares against it), then launches the first nine workers.

## Deadline lane

### Task 1: A safe machine (main session)
Done (2026-11-25): `904c517dc` (heavy-run slots, temp guard on route tools), `4c4451ba6` (a gate that failed on the git-ignored Stackable copy), `~/.claude` `78ce309` (API workers' temp on E:), C: clear-out (5.2 GB), plugin `npm ci` and build passing.

Left: a `tests/lib/tmp.mjs::scratchDir` helper and a detector that moves the 85 route tests (and the plugin's Python checks) that leave temp folders behind onto it. This runs after the branches merge, because it rewrites test files the tracks edit. <!-- dangling-ok: files a worker creates or that exist only on its branch -->

Status: mostly done.

### Task 2: Land tonight's branches (main session; tracks A1 to A4)
Why: the built parts are proven, but four branches change behaviour nobody asked for, six branches carry stale markers, and rf5's Custom CSS log check would fail every real run (`i1`, review).

Changes: A1 (rf1, rf6), A2 (rf2, rf3, rf4, rf5, rf8), A3 (rf7, rf9, rf10), A4 (cart-trigger), per their briefs; then merge in the order above.

Done when: all 11 branches are merged, the full suite passes, `check-mutation-lists.mjs` shows 0 new, and A4's render-check shows Mama's header unchanged.

Depends on: none. Status: not started.

### Task 3: Track C, every block part findable
Brief `c-parts.md` (`i15`, `i5`).

Done when: 0 `paint pairing` lines on Mama's and Eye Care's drawers, and Mama's trust-strip icon colour is written.

Depends on: none. Status: not started.

### Task 4: Track D, choice readings, underlines, the account merge
Brief `d-readings.md` (`i10`, `i7`).

Done when: Mama's 7 underline ties and Eye Care's 2 trust-bar ties resolve.

Depends on: none. Status: not started.

### Task 5: Track G1, render fixes on every site
Brief `g1-render.md` (`i9`, `i13`): card grid logos, product card placeholder, brand strip `sizes`. "Even visual size" and "Trim empty edges" moved to Task 11 (W4).

Depends on: none. Status: not started.

### Task 6: Track G2, the trust bar's clone-relevant fixes
Brief `g2-trustbar.md` (`i12`, `i3`): one stored marquee value, Fill writing the draft's marquee condition, icon fill colours reaching path fills (also `sgs/icon`, `sgs/button`, `sgs/cart`). The editor features moved to Task 11 (W4).

Depends on: rf1, rf5, rf6 merged. Status: not started.

### Task 7: Track B, a look the clone cannot place never stops the run
Brief `b-runstop.md` (`i2`).

Depends on: none (the account shadows wait for Task 4). Status: not started.

### Task 8: Tracks E1 and E2, restores
Briefs `e1-restores.md`, `e2-restores.md` (`i6`). Commits already ported on the branches are skipped.

Depends on: E1 needs rf4 and rf10 merged; E2 needs rf4 and rf6. Status: not started.

### Task 9: Track F, the mega menu
Brief `f-mega.md` (`i4`; Bean approved both rules, 2026-11-25).

Depends on: none. Status: not started.

### Task 14: Track L, the layout items
Brief `l-layout.md`: the Indus hero unwrap and grid tracks, Mama's header order, the logo `maxHeight`, social icon sizes, and `sgs/media` ratio and height. These are the five items of the never-started `layout` branch.

Depends on: none. Status: not started.

### Task 15: Track S, the shop pieces MIC needs
Brief `s-shop.md`: `part-look.mjs` as a run stage, a template card's `variantStyle` and related cards, the buy-box layout write (FR-48-60).

Depends on: rf7 and rf8 merged. Status: not started.

### Task 16: SGS and MIC sites (main session, with Bean)
Why: no draft, deploy target, route target, secrets file or local mirror exists for SGS or MIC. The LEDGER names their hosting entries (`lightgreen-whale-237337`, `palegreen-goose-450620`); nothing is created on the hosting account until Bean says so.

Changes: Bean starts the two drafts once the pipeline is ready (Bean, 2026-11-25). Once they are in `sites/<client>/handoff/`, add each site to `deploy_common.py` `TARGETS`, `scripts/computed-route/calibration-targets.json` and `.claude/secrets/`; create its local mirror; run `provision-site-mail.py`.

Done when: `site-run.mjs` can target each site.

Depends on: the drafts. Status: waiting on the drafts.

### Task 10: Combined proof, rehearsal, deploys (main session)
Changes:
- Tag the deadline lane's head `deadline-proof-2026-11-27` (the editor lane merges only after it).
- Run the full suite alone, one sweep against `baseline-main`, render-scope, then render-check on the states the tracks named.
- Run render-scope from each test site's deployed commit to the tag.
- Run the saved-content migrations each test site needs (cart trigger, account merge, marquee bars), in order with backups.
- Deploy `sandybrown`, `indus-test` and `eye-care-clone-test` (`build-deploy.py --target a,b,c`).
- Before eye-care-test's next deploy, cover its own pages: `local-eye-care` is a copy of eye-care-clone-test, not of eye-care-test, so no other mirror holds its pages (its home's `sgs/google-reviews` slider, and the card-grid, product-card, brand-strip and media changes G1 made). Its read-only scratch mirror is `local-mediatest-eyecaretest` (port 8130, registered in the gitignored `calibration-targets.local.json`); if it is gone, rebuild it through `heavy-slot.mjs run`: `scratch-mirror.sh create local-eye-care local-mediatest-eyecaretest 8130`, then `refresh-from-remote.sh local-mediatest-eyecaretest eye-care-test` (reads the site only), then `scratch-mirror.sh target local-mediatest-eyecaretest eye-care-test`. Include it in render-scope `--mirrors` and run render-check from it.
- Before each site's next deploy, run render-scope and render-check for G1 (merged `dfa7e821b`: card-grid, product-card, brand-strip and the shared media emitters reach every site; Mama's shop templates and Eye Care's mega menus hold them).
- Reclone Mama's, Eye Care and Indus offline in parallel, one per mirror, then `site-run.mjs --only` on the named surfaces.
- Run a timed fresh-site rehearsal: one foundation and one page on a stripped scratch copy, to show how long SGS and MIC take.

Done when: every named surface improves and none gets worse, the rehearsal passes within the time left, and Bean's eye check passes. Then clone SGS and MIC.

Depends on: 2 to 9, 14 to 16. Status: not started.

## Editor lane (builds now, merges after Task 10's tag)

### Task 11: Stage E1, shared components and packages
Briefs:
- `w1-editor-shared.md`: markers, inner section, Background sections, reset component. Bean approved the inner section's look as built (2026-11-26, screenshots `E:\sgs-tmp\general-cloning\build\w1-shared\shots\`), so Stages E2 and E3 may adopt it.
- `w2-editor-packages.md`: separators package, shape dividers.
- `w3-editor-switcher.md`: element switcher, border and shadow upgrades, carousels.
- `w4-trustbar-editor.md`: the trim list (one owner), the trust bar's lean layout and editor fixes, brand strip "Even visual size", "Trim empty edges".

Status: not started.

### Task 12: Stage E2, codemods across blocks (1 worker, after Task 11)
- Only each tab's first panel opens (19).
- The 30 reset-only `ToolsPanel`s and the 61 media menus get the small reset; standard menus stay (20).
- Every block moves onto the shared spacing panel, including the 8 Dimensions blocks (12).
- Kit colours join the main Colour panel, shown only when the feature is on (13).
- Label-less `ResponsiveOverride` mounts get their labels.
- `sgsFocusRests` and the button's `focusStyle` stay as they are (Bean, 2026-11-25): retiring them would change focus behaviour on all three clients, Mama's live shop included, for more work than it saves.
- The "Keyboard focus" switch moves out of its own panel on 85 blocks into a block-wide row at the top of the shared Hover panel; the 4 blocks with hover colours but no Hover panel show it in Colour, and the 3 with no hover value hide it (Bean, 2026-11-25). Only the control moves: the attribute, its behaviour and saved content are unchanged, so no site renders differently.

Status: not started.

### Task 13: Stage E3, per-block owners (up to 4 workers, after Task 12)
Each owner applies, for its blocks:
- The register's moves (`i24`) and the placement rule.
- Dissolving repeated panels, including gallery Layout into Spacing and Border.
- Look controls and renames (`i20`, `i23`; Google reviews' "Style" panel; choice flow picture size as a default plus override).
- More-than-12-colour part panels.
- Adopting the switcher, separators, dividers and layout preview.
- Retiring the heading, quote and text styles, and correcting Spec 32's native-supports rule, Spec 35A Part G and `plugins/sgs-blocks/CLAUDE.md` rule 1.

Named owners:
- **Product card:** a Settings "Buttons" panel (None, One or Two); one "Button style" panel with a switcher; Frame card removed; margin into Spacing; one shared shadow.
- **Nav drawer menu and nav bar menu:** dissolve "List layout"; rename to "Mega menu"; "Accordion open and close" moves to the Settings tab.
- **Responsive logo:** one "Logo" panel with "Use a different logo on dark backgrounds".

Done when (Tasks 11 to 13): the browser panel census (`i8`) shows 0 single-control panels outside the register's kept cases, 0 duplicate titles, 0 order changes after a tab switch, and only first panels open; render-check shows no front-end change except the listed fixes.

Status: not started.

### Task 29: Deferred: stored conditions and "show when"
The setting record stores each setting's conditions in the DB (it computes them in `instances.py::preconditions` and discards them, `i17`). One shared rule hides controls with nothing to affect. The hand-built-panel and dead-control detectors (`i17`) and the panel census become gates, with an allowlist for the 10 intentionally different panels.

### Task 30: Later
Repair the chrome style choices (elevated, boxed, borderless and similar on 9 blocks) so each writes real settings, as card grid's do.

Note only: "More options" (a collapsed section at the foot of a giant panel for rarely used controls) is more effort than it is worth for now (Bean, 2026-11-25).
