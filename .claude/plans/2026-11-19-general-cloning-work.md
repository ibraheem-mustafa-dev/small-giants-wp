---
status: active
doc_type: plan
created: 2026-11-19
---

# General cloning work: a site cloned from a handoff folder with almost no hand work

Status (2026-11-19): approved by Bean and started. Task 1's safety half, Task 2's fixes and Task 7's instructions draft are being built; nothing is merged yet. The brief this plan carries out is `.claude/prompts/2026-11-18-route-regular-pages.md` (deleted in the same commit as the last change). The shop surfaces and the before-and-after check are the other stream, `.claude/plans/2026-11-18-template-rework.md`.

## Goal and why

Mama's Munches took two rounds of hand-tuning. Before 2026-11-28 Bean designs, builds and clones two more whole sites (Small Giants Studio with no shop, and a redesign with a shop), and his time is the scarcest thing. Done, as Bean sees it: a foundation is built once from one command, each surface arrives presentable from one command, and he looks at one page per layout type. Work is ranked by hand work removed per day of building.

## Evidence

`.claude/reports/2026-11-18-template-rework/`: `council-report.md` (read first), `clone-audit.md` (gaps G-1 to G-11 and process bugs 1 to 9), `class-a-results.md`. What the code said when the brief was checked on 2026-11-19 is under "Checked against the code" below.

## Bean's rulings that bind this plan (2026-11-18)

- Fix what exists before building on it.
- A site is cloned as a foundation built once (tokens with the animation records, media, menus, business details, then header, footer, nav drawer and basket drawer), then one surface at a time, each fix made in the system.
- A clone goes through by default. Bean reads no long review table; the agent compares the built clone with the draft, proposes fixes and says where Bean's own eye would do better. Bean looks at one page per layout type.
- A control's look is cloned from the draft where it stands. Buttons that differ are never merged: one that matches a family takes the preset, one that differs keeps its difference. A preset takes the size most of its family share.
- A draft carries the tokens and presets it uses, as many as it has and under its own names, set on the blocks they apply to. The theme carries and uses tokens the general stylesheet has no place for.
- What no setting holds is written as Custom CSS by the route, never by hand.
- The handoff gets no Components page, no block map and no section-level block choice. It gets a list of the blocks we have, in design words.
- A change for one client never alters what another client's site renders unless that site opts in.

## Standing limits

- Never touch `local-mamas`, `mamas-test` or `eye-care-test`; any other mirror only through a scratch copy (`scripts/local-wp/scratch-mirror.sh`). Ask Bean before creating anything on the hosting account.
- Route runs happen in a worktree under `E:\sgs-tmp` with the calibration cache copied in. Working copies in use: `E:\sgs-tmp\wt-general` (the integration copy), `wt-general-b`, `wt-general-c`, `wt-general-d` (one helper each).
- Route code, the extractor and documents go straight to `main`. A plugin or theme change that alters what a page renders stays on a `feature/` branch until the other stream's Task 1 (`scripts/render-check/`) exists.
- The other stream owns `plugins/sgs-blocks/includes/woocommerce/`, the shop look settings, the WooCommerce stylesheet's shop rules and `scripts/render-check/`; edits there are handed over as a patch. A database reseed is announced first.
- Every route fix lands with a test that fails first, a negative control and a mutation list; `node scripts/computed-route/check-approved.mjs indus-foods` exits 0; a walker, architecture or migration change is three or more commits (FP-5).

## Checked against the code (2026-11-19)

- The route's reader of the draft's own token names was built on 2026-10-31 (`2e3986425`, `scripts/computed-route/lib/fill-token-ref.mjs`) and removed by the 2026-11-02 rewind: restore it.
- The 6 and 8 slot limits are Spec 32 FR-32-29 (Bean, 2026-10-31), enforced by `plugins/sgs-blocks/scripts/snapshot_token_roster.py`; the 2026-11-18 ruling replaces them. Framework slot names stay (block defaults read them by meaning); the draft's names are added beside them.
- Spacing, font size and shadow controls already list whatever a site carries; corners have no token list in any control.
- The wrong-page motion fault is proven: `scripts/computed-route/apply.mjs::main` treats the handoff's first draft as the page for every surface.
- A new button name meets these closed lists only: the block (settings file, variations, render, editor, stylesheet), `presets.py::_VARIANT_SLOT` and `sgs_button_preset_css`. `lib/fill-preset.mjs::presetVariants` already reads names from the snapshot.
- WooCommerce's buttons read the preset's hover colours and hover shadow; only resting colours come from the palette.
- Re-extracting Mama's tokens writes to a scratch file, never `sites/mamas-munches-redesign/theme-snapshot.json` (the live shop's session pushes that file).
- A narrow Custom CSS writer exists (`lib/fill-width-gate.mjs::scopedCssPuts`): Task 6 extends it.
- A scratch copy has no site-targets entry and a `--site` run still takes each surface's login from `sites/<client>/build/surfaces.json`: Task 1 fixes both.

## Session breaks

Read this plan and `git log --oneline -15`. Find the first task whose Status is not done, rerun the previous task's check, continue.

### Task 1: A single-surface run is safe
- Why: a run aimed at a scratch copy still wrote into the surface entries' site (`local-mamas`), failed to read secrets from a worktree, degraded silently without the gitignored intake facts and counted a skipped stage as passed (audit process bugs 1 to 6).
- Changes: one reader for the site targets (`scripts/computed-route/lib/site-targets.mjs`) with a gitignored local file for scratch copies and a lint rule refusing any other reader; `site-run.mjs`, `apply.mjs`, `gate-chain.mjs`, `trial.mjs`, `solve.mjs` take the named site everywhere and refuse a site that does not share the surface's post ids; protected sites refuse writing runs; a scratch run refuses to start in the main checkout; missing intake facts stop the run; `--strict` and `--no-copies`.
- Done when: on a fresh scratch copy of a mirror, `site-run.mjs <client> --site <copy> --only <surface> --strict` reads and writes only that copy (the source mirror's posts are byte-identical before and after), and the unit tests and mutation lists pass.
- Status: being built (helper `run-safety` in `E:\sgs-tmp\wt-general`).

### Task 2: Block choice and pairing from signals the handoff already carries
- Why: audit gaps G-1, G-2, G-4, G-5, G-6, G-7.
- Changes: accordions, sliders and tabs recognised by what the draft's code does, with the handoff's `kind` as cross-check; a heading with inline children stays a heading with its image carried; a pairing rule for a draft element that is a block's root and inner part at once; each surface's motion records indexed by its own draft; a wordless control writes an empty label; the Email card's display type follows its strongest evidence.
- Done when: on a fresh scratch copy, Mama's Contact, Home and Help show working accordions and the review slider, Home's `h1` with its photo, the Contact hero's padding, no "Click Here", the Email card's address, and no other page's motion; Spec 48 FR-48-6, FR-48-97, FR-48-101, FR-48-102 and FR-48-105 say what is built.
- Status: being built (helpers `recognisers` in `wt-general-c`, `small-faults` in `wt-general-b`, `pairing` in `wt-general-d`); the live proof needs Task 1.
- Depends on: 1 (for the live proof).

### Task 3: One command for a foundation and one for a surface
- Why: a foundation is about ten commands today; `site-run.mjs` runs six stages with no step for uncertain blocks, no Solve, no extractor, snapshot push, media or site build, in an order that reaches the header 21st of 24.
- Changes: a foundation command chaining `handoff-check.mjs`, `intake.mjs` (with the finaliser request and picks), `extract.py`, `push-theme-snapshot.py` to the mirror, the Site Info apply, `media-upload.mjs`, `site-build.mjs`, then header, footer, nav drawer and basket drawer; a surface command running every stage including the finaliser picks and Solve, failing when a stage is skipped; Spec 48 §8 and FR-48-17 amended to "a clone goes through by default".
- Done when: on a scratch copy, the foundation command then the surface command for one page run end to end with no hand step, and the surface command exits non-zero when a stage is left out.
- Status: not started.
- Depends on: 1.

### Task 4: The token extractor
- Why: Mama's entrance animations never arrived (all five of her reveal records are refused with no trace) and her 15 corner tokens are squeezed into 4.
- Changes: `reveal_tokens.py` accepts `translate`, `scale` and `rotate`, gains an "elements are marked" outcome and logs every refused record; `presets.py` logs each dropped button look; Spec 38A §8.1 gains the marked rule (its renderer half on the branch); every draft token is carried under its own name (`token_families.py`, the roster gate, a theme printer after `theme/sgs-theme/inc/colour-roles.php::colour_roles_css`); `lib/fill-token-ref.mjs` restored.
- Done when: a scratch extraction of Mama's holds her reveal rule and every token she declares, each refusal is in the trace, and the extractor's tests pass.
- Status: not started.

### Task 5: Buttons
- Why: Spec 32 FR-32-2 is partly built; only three names survive extraction and no renderer reads the whole preset.
- Changes: the extractor writes one preset per button family under the draft's own name; preset rules are printed from the snapshot's keys; `sgs/button` reads the preset's shadow; `sgs_button_preset_css` accepts any name; WooCommerce's buttons, the basket drawer, the form button and the product card read the whole preset behind a per-site switch (the pattern is `theme/sgs-theme/inc/choice-controls.php::choice_controls_enabled`).
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
- Why: no draft defines a control once, the instructions limit tokens to four kinds and contradict themselves on editing a draft, and Bean cannot start designing until they are approved.
- Changes: new `.claude/claude-design-handoff/CLAUDE.md`, `PROMPT.txt` and `METHOD.md` §10; a block list in design words generated from the block database; `lib/handoff.mjs::checkHandoff` allows what the new instructions add and warns on each page or state FR-48A-16 lists that a folder lacks; Spec 48A in the same commit.
- Done when: Bean approves the wording, and a re-export of Mama's under the new instructions passes `handoff-check.mjs` and compares cleanly with her old handoff.
- Status: draft being written for approval (fork `handoff-draft`, output in `E:\sgs-tmp\general-cloning\handoff-draft\`).

### Task 8: Proof
- Why: the Goal. The walker cannot tell a broken Contact from the finished one.
- Changes: none to code.
- Done when: Mama's Home, Contact and Help on a fresh scratch copy, then one Indus or Eye Care page on a scratch copy of its mirror with the hand-finished site as the answer sheet, are judged by text and image coverage, working blocks and side-by-side pairs at 375, 768 and 1440, and Bean has seen the pairs.
- Status: not started.
- Depends on: 1 to 6.
