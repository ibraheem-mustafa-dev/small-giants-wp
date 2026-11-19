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

## Where it stands (2026-11-19, 12:00)

**Everything built so far is on `main` (tip `645f96c55`); no route work is waiting in a worktree except the helpers' work in progress named below.** Landed today, in order: the extractor's reveal reader; Spec 48A v1.4 with the Claude Design instructions and their nine wording fixes from the trial (`E:\sgs-tmp\general-cloning\upload\` matches `main`); the 28-commit first round (safe `--site` runs, the `protected` rule, the `SGS_NO_SITE` kill switch, pairing, per-surface motion records, accordions, sliders and tabs from the draft's code, icon discs, spacing, the paint rule and gate, nine review fixes); the recorder fix (`lib/intake-record.mjs::bodyContent`: a font served as `text/html` is kept byte for byte); `intake.mjs --apply-review <client> --go-through` (Spec 48 FR-48-17: Bean's review is optional, each unmarked row takes its proposal as a default mark, rows with nothing to take are listed in `build/intake/go-through-open.json`); the page-body fixes (an element whose own words sit beside inline children is one text block, a list item's key, a background picture as media, a text block's own look, the busy check); the new-shape fixes (`mountValues` constants, a component inside a parent's form, the `mountWrapper` rule); the header and footer fixes (footer rows from the band that holds the grid, the logo's inner image and maximum size, the header's width-variant bars merged, the gap reading across an undrawn wrapper, a code-built marquee's items, a band's own padding, a link to a draft page resolved through the page map). The route suite's only failures are the 62 stale Indus and Eye Care record tests and the older `fill-layer-box`, `skeleton-propose`, `apply-*`, `calibrate*`, `db`, `resolve` and `tokens` failures that predate this work.

**Proven findings that changed the picture:**
- Fill ran without default paint for 67 of 94 blocks from 2026-11-15 until today (paint files recorded under scratch copies no targets file named). Fixed: `lib/cache.mjs::paintOwner`, and `lib/paint-gate.mjs::assertPaints` stops a run naming each block with no paint.
- The route had never produced Mama's header, footer or menu drawer: the committed trees were rebuilt by hand on 2026-11-02 (`559e6737b`).
- Tokens from the handoff alone equal the hand-finished snapshot on 439 of 484 values (`E:\sgs-tmp\general-cloning\clean\snapdiff.txt`); the misses are the buttons' shadow, hover and press (14), the email tokens (9, not in a draft), the inline photo's border and tilt, the highlight, the scrollbar track and a few timings.
- A draft made under the new instructions clones as well as an old-shape one (converted Mama's Contact 25 of 30 and Help 42 of 54 text leaves, the same as the original at that time; pictures in `E:\sgs-tmp\general-cloning\trial\`).

**The clean copy (`local-mediatest-clean`, http://localhost:8108, run from `E:\sgs-tmp\wt-general` at `main`):** a scratch copy of `local-mamas` with the header (178), footer (176), menu drawer (180), Contact (148), Help (152), Home (154) and the Additional CSS emptied (`E:\sgs-tmp\general-cloning\clean\strip.php`). Not stripped: the theme snapshot, the user global styles post, menus, products, WooCommerce pages, templates. Run 2 (07:00, before the page-body and header and footer fixes) is what Bean has seen: `clean\shots2\pair-contact-1440.png`, `pair-contact-375-top.png`, `pair-help-1440.png`, `pair-home-1440.png` (Contact 25 of 30 text leaves, Help 42 of 54, Home 104 of 156). Run 3 (all fixes on `main`; header, footer, drawer, Contact, Help and the Zookie flow): log `clean\run-all-3.log`. `local-mamas`'s posts 148, 152, 154, 176, 178 were byte-identical before and after the runs up to 04:30 (`local-mamas-before.txt`, `local-mamas-after.txt`).

**Open route faults, by what a visitor sees (none needs a plugin change unless marked):**
- Home cannot run on `main`: `sgs/decorative-image` has no default paint and its calibration fails ("paint state(s) empty not measured"). Helper `paint-gate` is adding a named allowance (`--allow-missing-paint`) and finding the cause.
- A declared value written as `var(--token)` is invisible to the standing rules, Fill's confirm checks and the unit reader; the token-by-name writer (`lib/fill-token-ref.mjs`, git `2e3986425`) is not restored; a handler passed to a mount as a prop is not followed. Helper `trial` is on all three.
- The marquee's items arrive but stack with the block's default icon (the route cannot read a code-built item's look); the pink band's content runs 80px narrow (its maximum width does not add the band's padding); the header's columns are equal thirds, not `auto 1fr auto`, and the phone account icon is oversized; a Trustpilot tile prints over the footer (cause unknown).
- The menu drawer: its `<nav>` is removed by the `listWrapper` rule before the `navigation` rule can make it the drawer menu block; two close buttons; the panel is full width with no backdrop.
- A page linking a flow or form whose post is unpublished gets no warning ("Build your Zookie" printed "not available" because post 161 was a draft on the copy).
- `intake.mjs` runs its skeleton stage before its facts stage (a rerun after a draft change needs two runs); intake proposes skeletons without a site, so without calibration keys; an unresolved skeleton row with no pick builds nothing for its element (under `--go-through` it is listed, and should become a container holding its contents); `site-run.mjs` reports an apply stage as failed when a no-setting row names a setting the block has.
- The FAQ's open row has no shadow (an open-state setting the resting pass does not read); Help's chips wrap with a stray legend.

**Needs a plugin or theme change (recorded; held off `main` until the render check):** the FAQ topic line prints only with the filter on and has no look settings, and the toggle icon has no plus option; slider arrows and dots have no look settings; the hero holds one picture (Home's collage of three captioned, tilted photos and a sticker cannot be held), has no split variant in its calibration fixture, no width-to-max-width equivalent for its media and no declared values for `splitContentOrder` (the phone hero shows the picture first and large), and its split content column keeps a default padding calibration never read; `sgs/form-field-text` has no settings for input height, font size, padding or max width (Help's search box); the icon's ring and glyph colours meet FR-48-101's open equal-judging item; a button preset under the draft's own name (the button block, `presets.py::_VARIANT_SLOT`, `sgs_button_preset_css`).

**Helpers running:** `paint-gate` (`E:\sgs-tmp\wt-general-g`, scratch copy `local-mediatest-genb` 8106), `trial` (`wt-general-j`, `local-mediatest-trial` 8111, handoff server on 5391), `intake-rerun` (`wt-general-b`: Indus done in two passes, Eye Care running). Finished, checked and landed: `badge-logo`, `widget-look`, `spacing`, `review-fixes`, `go-through`, `page-body` (`wt-general-i`, `local-mediatest-body` 8110), `foundation` (`wt-general-h`, `local-mediatest-found` 8109), `handoff-convert` (branch `feature/mamas-handoff-trial`, never merged). Worktrees `wt-general-d`, `-e`, `-f`, `-h`, `-i`, `-k` hold nothing unlanded except run outputs; scratch copies `gena` 8105 and `genc` 8107 are free. A local server on 127.0.0.1:5390 serves Mama's original handoff.

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
- Found by converting Mama's and written into the instructions and Spec 48A FR-48A-17 on 2026-11-19: (1) "uses a token by name wherever its value is meant" does not say whether a token is matched by value or by role (`.3s` is the card duration token and is also used on dots); (2) "rest, hover, keyboard focus, pressed, disabled" inside a preset contradicts "never style focus per element" and implies inventing a disabled look a design lacks; (3) a `style-*` rule cannot hold a `{{ }}` value, so each preset needs its own element in the component; (4) "mount inside a flex or grid parent" is not enough, since `align-self` never reaches the mount's wrapper; (5) a `data-part` on a mount arrives as the prop `dataPart` and the component must pass it on; (6) the carousel roles do not fit link slides or a strip that is a slider only on a phone; (7) a panel drawn only when open leaves `aria-controls` pointing at nothing while closed.
- Expected route trouble on the new shape, from reading the code (not yet run): `lib/intake-props.mjs` treats `secondary` and `lg` as states of one component, not presets; each mount adds a wrapper element (and Button another), so extra group blocks; a mounted button's handler is a passed-in prop, so handler-based recognisers will not find it; Field labels are holes with no source text and fields sit across a component boundary; the token-reference reader is not running.
- Status: instructions approved by Bean and committed; Mama's private copy is converted; intake and the clone from it are next.

### Task 8: Proof
- Why: the Goal. The walker cannot tell a broken Contact from the finished one.
- Changes: none to code.
- Done when: Mama's Home, Contact and Help on a clean scratch copy (foundation cloned too, Task 3), then one Indus or Eye Care page on a scratch copy of its mirror with the hand-finished site as the answer sheet, are judged by text and image coverage, working blocks and side-by-side pairs at 375, 768 and 1440, and Bean has seen the pairs with a plain statement of what was cloned and what was not.
- Status: not started.
- Depends on: 1 to 6.
