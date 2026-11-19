---
status: active
doc_type: plan
created: 2026-11-19
---

# General cloning work: a site cloned from a handoff folder with almost no hand work

Status (2026-11-19, 03:00): started. Three commits are on `main` (this plan, the extractor's reveal reader, the new Claude Design instructions). Thirteen route commits are combined and tested but not yet on `main`. A first live clone of Mama's Contact and Help shows real but partial progress; neither page is presentable yet, and no header, footer or token set has been cloned from scratch. The brief this plan carries out is `.claude/prompts/2026-11-18-route-regular-pages.md` (deleted in the same commit as the last change). The shop surfaces and the before-and-after check are the other stream, `.claude/plans/2026-11-18-template-rework.md`.

## Goal and why

Mama's Munches took two rounds of hand-tuning. Before 2026-11-28 Bean designs, builds and clones two more whole sites (Small Giants Studio with no shop, and a redesign with a shop), and his time is the scarcest thing. Done, as Bean sees it: a foundation is built once from one command, each surface arrives presentable from one command, and he looks at one page per layout type. Work is ranked by hand work removed per day of building. **Bean will not start designing until he has seen evidence that cloning has improved (2026-11-19): evidence comes before any request of his time.**

## Evidence

`.claude/reports/2026-11-18-template-rework/`: `council-report.md` (read first), `clone-audit.md` (gaps G-1 to G-11 and process bugs 1 to 9), `class-a-results.md`. Today's live evidence is in `E:\sgs-tmp\general-cloning\proof\` (`pairs-contact-1440.png`, `crops/contact-375-top.png`, `pairs-help-1440.png`; `shots/*.probe.json`; tools `probe.mjs`, `cov.py`, `pair.py` copied from the audit).

## Bean's rulings that bind this plan

2026-11-18:
- Fix what exists before building on it.
- A site is cloned as a foundation built once (tokens with the animation records, media, menus, business details, then header, footer, nav drawer and basket drawer), then one surface at a time, each fix made in the system.
- A clone goes through by default. Bean reads no long review table; the agent compares the built clone with the draft, proposes fixes and says where Bean's own eye would do better. Bean looks at one page per layout type.
- A button that matches a preset takes the preset; one that differs keeps its difference. A preset takes the size most of its family share.
- A draft carries the tokens and presets it uses, as many as it has and under its own names, set on the blocks they apply to.
- What no setting holds is written as Custom CSS by the route, never by hand.
- The handoff gets no Components page, no block map and no section-level block choice. It gets a list of what we have, in design words.
- A change for one client never alters what another client's site renders unless that site opts in.

2026-11-19:
- The Claude Design instructions trust the tool's judgement and list no cases: tidy the drafts, say what changed, ask only where a change would alter the design or the meaning is unclear.
- A button is cloned as a preset when the draft mounts it with a preset name, and with its own styles otherwise. No rule forces a differing button to be a named version.
- Bean does not re-export a project to test the instructions: the handoff files are edited here.
- Stale intake records are fixed by rerunning intake, not worked around.
- "Control" means an editor sidebar control. A button or field on a page is called a button or a field.

## Standing limits

- Never touch `local-mamas`, `mamas-test` or `eye-care-test`; any other mirror only through a scratch copy (`scripts/local-wp/scratch-mirror.sh`). Ask Bean before creating anything on the hosting account.
- Route runs happen in a worktree under `E:\sgs-tmp` with the calibration cache copied in, against a scratch copy registered with `node scripts/computed-route/tools/scratch-target.mjs add <name> --source <mirror> --url http://localhost:<port>` (once the route commits are on `main`).
- **No test or mutation run may launch a route command.** A helper's mutation run removed a guard and a spawned command then wrote to `eye-care-test` (2026-11-19, cleaned up with Bean's go, database backup taken first). A guard is tested by calling the guard function. Tests run through `node scripts/computed-route/tools/run-tests.mjs` and mutations through `tools/mutate.mjs`, both of which set `SGS_NO_SITE=1` (once the route commits are on `main`).
- A helper that runs a live clone gets its own scratch copy and one exact `site-run.mjs` command naming it.
- Route code, the extractor and documents go straight to `main`. A plugin or theme change that alters what a page renders stays on a `feature/` branch until the other stream's Task 1 (`scripts/render-check/`) exists.
- The other stream owns `plugins/sgs-blocks/includes/woocommerce/`, the shop look settings, the WooCommerce stylesheet's shop rules and `scripts/render-check/`; edits there are handed over as a patch. A database reseed is announced first.
- Every route fix lands with a test that fails first, a negative control and a mutation list; a walker, architecture or migration change is three or more commits (FP-5).
- Pictures of a clone state what was cloned and what was not. Today's pictures sit on a copy of the hand-finished Mama's site, so the header, footer, colours, fonts and button looks in them are hand work.

## Checked against the code (2026-11-19)

- The route's reader of the draft's own token names was built on 2026-10-31 (`2e3986425`) and removed by the 2026-11-02 rewind: restore it from history.
- The 6 and 8 slot limits are Spec 32 FR-32-29, enforced by `plugins/sgs-blocks/scripts/snapshot_token_roster.py`; the 2026-11-18 ruling replaces them. Framework slot names stay; the draft's names are added beside them.
- Spacing, font size and shadow controls already list whatever a site carries; corners have no token list in any control.
- A new button name meets these closed lists only: the block (settings file, variations, render, editor, stylesheet), `presets.py::_VARIANT_SLOT` and `sgs_button_preset_css`.
- WooCommerce's buttons read the preset's hover colours and hover shadow; only resting colours come from the palette.
- Re-extracting Mama's tokens writes to a scratch file, never `sites/mamas-munches-redesign/theme-snapshot.json`.
- A narrow Custom CSS writer exists (`scripts/computed-route/lib/fill-width-gate.mjs::scopedCssPuts`): Task 6 extends it.
- A stored entrance can point at the site's entrance tokens (`token:entrance.distance`, `token:entrance.duration`, `token:entrance.easing` in `plugins/sgs-blocks/schemas/motion.schema.json`), so a marked reveal needs no plugin change: the route sets the entrance on each marked block.
- The inventory drops `data-*` attributes, so a draft's `data-reveal` mark is not in `build/skeleton/<surface>.inventory.json`.
- `node scripts/computed-route/lint.mjs` exits 1 on `main` with about 440 README findings that predate this work.

## Where it stands (2026-11-19, 03:00)

**On `main`:** `8cb1bdeeb` (this plan), `740b82ea8` (extractor: marked reveals, the standalone `translate`, `scale` and `rotate` properties, every refused record named in the trace; 421 extractor tests pass; Indus's output unchanged), `3aed77f89` (Spec 48A v1.4: the new instructions, `WHAT-WE-BUILD.md` with its generator, `lib/handoff.mjs::isTokenFile`).

**Combined, not on `main`: `E:\sgs-tmp\wt-general-x`, detached HEAD `c419eb452`, 13 commits on top of `origin/main` at `3aed77f89`.** The pairing rule (`lib/fill-part-pairing.mjs::rootIsPart`); each surface's motion records read against its own draft (Fill and the applier); a wordless control writes an empty label; a look never changes a content-selector setting; a heading with inline children stays a heading with its photo; accordions, sliders and tabs recognised from the draft's code (`lib/skeleton-widgets.mjs`); one reader for site targets with scratch-copy targets and a `protected` rule; a kill switch at the site-contact layer (`SGS_NO_SITE`); a `--site` run reads and writes the named site everywhere; a site run stops on missing intake files, records skipped stages, `--strict`, `--no-copies`; the applier's site-option step follows `--site`; a proposal problem is reported and the page goes on. The 53 tests those commits added pass together. **Not done before the push: one full run of the route suite on the combination, and a review of the diff.**

**Live evidence (Mama's, scratch copy `local-mediatest-general`, http://localhost:8104, run from `E:\sgs-tmp\wt-general`):**
- Contact: the heading is straight (it carried Home's animation in the audit), the phone header is intact, the hero has its padding, the Email card shows the address, the FAQ opens and closes. Still wrong: the FAQ lost its look (narrow pills, no topic line: 123 `sgs/accordion-item` and 21 `sgs/accordion` no-setting rows, because the block holds its rows' look on the parent); the three icon badges are empty rings; on a phone the hero logo is huge and above the text; section gaps and panel padding are missing (the clone is 260px shorter than the draft at 1440). Text coverage 84% (94% in the audit; the loss is the four topic lines).
- Help: built; 78% text coverage; the misses are the same topic lines and one paragraph.
- Home: its propose stage passed after the go-through change (180 nodes, one proposal problem: a sideways slider of gift tiles, `Root/132#0`, has no block that takes its slides); Fill, build and apply were running at handoff (log `E:\sgs-tmp\general-cloning\run-home-2.log`).
- `local-mamas`'s posts 148, 152, 154, 176 and 178 were fingerprinted before the runs (`E:\sgs-tmp\general-cloning\local-mamas-before.txt`); the after comparison is not yet made (another session edits that mirror, so compare `post_modified` with the run times).

**Helpers running at handoff, each in its own worktree at `7ab8d3a4a` (their commits are unpushed; check each claim against its diff and its pictures before cherry-picking onto `wt-general-x`):**

| Helper | Worktree and scratch copy | Job |
|---|---|---|
| `widget-look` | `E:\sgs-tmp\wt-general-d`, `local-mediatest-gena` (8105) | The accordion's and slider's look written on the settings that hold it; the topic line's verdict |
| `badge-logo` | `E:\sgs-tmp\wt-general-e`, `local-mediatest-genb` (8106) | The icon badges, the hero logo's size and stacked order, the hero's height |
| `spacing` | `E:\sgs-tmp\wt-general-f`, `local-mediatest-genc` (8107) | Lost section gaps and panel padding, the two-gaps conflict |
| `intake-rerun` | `E:\sgs-tmp\wt-general-b` | Full intake rerun for `indus-foods` then `eye-care-ward-end` (their records are stale since 2026-11-09 and 2026-10-28), Bean's marks carried, one commit per client |
| `handoff-convert` | `E:\sgs-tmp\wt-general-c` (uncommitted on purpose) | A private copy of Mama's handoff converted to the new instructions on Contact, Home and Help (tokens by name, `Button.dc.html` and `Field.dc.html` with presets, real widget roles), passing `handoff-check.mjs`, visually identical to the original |

Other scratch material: `E:\sgs-tmp\general-cloning\` (`upload\` is the folder Bean uploads to Claude Design and matches `main`; `handoff-draft\` holds the fork's notes and runtime proof; `intake-before\` the build folders before the intake reruns). A local server on 127.0.0.1:5390 serves Mama's original handoff for the probe. Scratch copies in use: `local-mediatest-general` (8104), `gena` (8105), `genb` (8106), `genc` (8107).

## Session breaks

Read this plan and `git log --oneline -15`. Find the first task whose Status is not done, rerun the previous task's check, continue.

### Task 1: A single-surface run is safe
- Why: a run aimed at a scratch copy still wrote into the surface entries' site, failed to read secrets from a worktree, degraded silently without the gitignored intake facts and counted a skipped stage as passed (audit process bugs 1 to 6).
- Changes: built (five commits in `wt-general-x`: `lib/site-targets.mjs`, `tools/scratch-target.mjs`, `SGS_NO_SITE` at the site-contact layer, `tools/run-tests.mjs`, the lint rules, `--strict`, `--no-copies`).
- Done when: the commits are on `main` after a full suite run on the combination; on a scratch copy `site-run.mjs <client> --site <copy> --only <surface>` reads and writes only that copy, shown by the source mirror's post fingerprints.
- Status: built and used for three live runs; not on `main`; the fingerprint comparison is open. Not done inside it: `scripts/local-wp/mirror_theme_json.py` still reads the committed targets file only, and `scratch-mirror.sh` does not call `scratch-target.mjs`.

### Task 2: Block choice and pairing from signals the handoff already carries
- Why: audit gaps G-1, G-2, G-4, G-5, G-6, G-7.
- Changes: built in `wt-general-x` (seven commits). Open from the live run: the accordion's and slider's look (helper `widget-look`), the icon badges and hero logo (`badge-logo`), spacing (`spacing`); a slider whose slides are not quotes has no block (try the container's sideways-scroll mode before calling it a missing feature); the applier still leaves a draft's `data-reveal` entrances unset (check on the live pages whether any entrance arrived now that each surface reads its own records; if not, the inventory must keep the mark and the motion writer set a token-pointing entrance on each marked block, Spec 48 FR-48-102).
- Done when: on a clean scratch copy Mama's Contact, Home and Help show working accordions and the review slider with the draft's look, Home's `h1` with its photo, the hero's padding and logo as drawn, filled icon badges, the draft's section spacing (page height within 2% of the draft's at 375 and 1440), no "Click Here", the Email card's address, each page's own entrances, and text coverage at or above the audit's.
- Status: in build.
- Depends on: 1.

### Task 3: One command for a foundation and one for a surface, and a clean-copy proof of the foundation
- Why: a foundation is about ten commands today, and nothing yet shows how a header, footer, nav drawer, basket drawer or token set clones from scratch: every picture so far sits on a hand-finished base.
- Changes: a foundation command chaining `handoff-check.mjs`, `intake.mjs` (with the finaliser request and picks), `extract.py` (to a scratch snapshot), `push-theme-snapshot.py` to the scratch copy, the Site Info apply, `media-upload.mjs`, `site-build.mjs`, then header, footer, nav drawer and basket drawer; a surface command running every stage including the finaliser picks and Solve, failing when a stage is skipped; Spec 48 §8 and FR-48-17 amended to "a clone goes through by default".
- Done when: on a scratch copy stripped of the hand-finished header, footer, drawers and snapshot, the foundation command builds them from Mama's handoff with no hand step, and the pairs of header, footer and drawers beside the draft are shown to Bean with what differs.
- Status: not started. **This is the next evidence Bean asked for (2026-11-19): do the clean-copy run by hand first if the command is not ready.**
- Depends on: 1.

### Task 4: The token extractor
- Why: Mama's 15 corner tokens are squeezed into 4 and the draft's own token names are read by nothing.
- Changes: done: the reveal reader (`740b82ea8`). Open: `presets.py` logs each dropped button look; every draft token carried under its own name (`token_families.py`, the roster gate, a theme printer after `theme/sgs-theme/inc/colour-roles.php::colour_roles_css`); `lib/fill-token-ref.mjs` restored from `2e3986425`; a named JavaScript easing in a record (`easeOutCubic`) mapped to its curve (Eye Care's reveal is refused for that alone).
- Done when: a scratch extraction of Mama's holds every token she declares, each refusal is in the trace, and the extractor's tests pass.
- Status: reveal reader done; the rest not started.

### Task 5: Buttons
- Why: Spec 32 FR-32-2 is partly built; only three names survive extraction and no renderer reads the whole preset.
- Changes: the extractor writes one preset per button family under the draft's own name (from the draft's Button component versions where it has one, Spec 48A FR-48A-17); the route reads a mount's preset as the button's variant; preset rules are printed from the snapshot's keys; `sgs/button` reads the preset's shadow; `sgs_button_preset_css` accepts any name; WooCommerce's buttons, the basket drawer, the form button and the product card read the whole preset behind a per-site switch (the pattern is `theme/sgs-theme/inc/choice-controls.php::choice_controls_enabled`).
- Done when: on a scratch copy a fifth named preset paints a button, a WooCommerce button and the basket drawer's buttons from the snapshot alone, and with the switch off every existing site copy renders as before.
- Status: not started. Held on a `feature/` branch until the other stream's render check exists.
- Depends on: 4.

### Task 6: The route writes what no setting holds
- Why: Spec 48 FR-48-86 and FR-48-109 say the writer is not built; the "no setting" report is unsound ("3,224 reported, 699 real").
- Changes: diagnose the "no setting" rows per class by reproducing the resolver (method: `.claude/reports/2026-10-25-no-setting-diagnosis.md`), fix the route faults found, then extend `lib/fill-width-gate.mjs::scopedCssPuts` into the residual writer for a declaration all five layers of `lib/css-equivalence/index.mjs::consult` fail, with an instance list and a gap row per run.
- Done when: a planted draft declaration no setting holds renders on the clone through route-written Custom CSS and is listed, and a planted declaration a setting holds is written to the setting.
- Status: not started.
- Depends on: 2.

### Task 7: The Claude Design instructions
- Why: no draft defined a button once, the instructions limited tokens to four kinds and contradicted themselves on editing a draft.
- Changes: done and on `main` (`3aed77f89`): `.claude/claude-design-handoff/CLAUDE.md`, `PROMPT.txt`, `handoff-schema/METHOD.md`, `WHAT-WE-BUILD.md`, `plugins/sgs-blocks/scripts/generate-handoff-block-list.py`, `lib/handoff.mjs::isTokenFile`, Spec 48A FR-48A-17 and FR-48A-18. Open: the trial (helper `handoff-convert` converts a private copy of Mama's handoff; then intake and a clone of Contact from it, compared with the clone of the original); the route reading a mount's preset (Task 5); `handoff-check.mjs` warning on each page or state FR-48A-16 lists that a folder lacks; `generate-handoff-block-list.py --check` wired as a gate after a reseed; any wording the trial shows to be wrong.
- Done when: a clone of the converted Contact is no worse than the clone of the original on text coverage and the pairs, and Bean has uploaded `E:\sgs-tmp\general-cloning\upload\` to his project.
- Status: instructions approved by Bean and committed; the trial is running.

### Task 8: Proof
- Why: the Goal. The walker cannot tell a broken Contact from the finished one.
- Changes: none to code.
- Done when: Mama's Home, Contact and Help on a clean scratch copy (foundation cloned too, Task 3), then one Indus or Eye Care page on a scratch copy of its mirror with the hand-finished site as the answer sheet, are judged by text and image coverage, working blocks and side-by-side pairs at 375, 768 and 1440, and Bean has seen the pairs with a plain statement of what was cloned and what was not.
- Status: not started.
- Depends on: 1 to 6.
