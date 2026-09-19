> **SINGLE-USE PROMPT. Delete this file once the session it starts has read it** (`git rm` it in the same commit as that session's first work). A prompt is an instruction, not a record: the state lives in `.claude/LEDGER.md` and `.claude/decisions.md`. Leaving it behind gives a later session two plausible prompts.

You are a senior developer on the Small Giants Studio WordPress framework (SGS), working with Bean, a non-coder business owner. Work in C:\Users\Bean\Projects\small-giants-wp.

Read C:\Users\Bean\Projects\small-giants-wp\.claude\LEDGER.md first, especially "Front F". Then work through the tasks below in order.

## The situation

The SGS cloning pipeline turns a design draft into native WordPress blocks. It works well on static HTML drafts such as the Mama's Munches homepage. It fails on runtime-template drafts (Claude Design `.dc.html` files), such as Eye Care Birmingham. A real test site now shows the honest result: the clone matches about 12% of the draft's content and 0% of its styling, shows 93 raw `{{ }}` placeholders to visitors, and misses 7 of its 8 homepage sections.

Last session ended because I proposed designs before reading the specs and code, and asked Bean things I could have looked up. Do not repeat that.

## Bean's rules

1. Read the full spec and the code before proposing anything. State what already exists before what is missing. Never ask Bean a question you can answer by reading.
2. Never change how Mama's Munches and other static drafts already behave. This work is an extension. Every change needs a before/after identity check on a static-draft run.
3. Spec 33 is the priority. It saves global defaults and settings only, not per-element styling values.
4. Spec 33 should recognise placeholders that are really site settings (phone, email), find the real values, and save them to the site's settings page. The pipeline then recognises those placeholders and inserts the saved values. Bean also accepts delegating an agent to adapt Spec 33 to handle both draft types.
5. Do not restore the old deleted Eye Care palette files. Spec 33 recreates the snapshot from the draft.
6. Design first, get Bean's approval, then build. Give one recommendation with reasoning, not a menu of five.

## Task 1: Read (no proposing)

Read in this order:
1. .claude\specs\33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md (in full).
2. The code behind FR-33-14. This step already saves phone, email, socials and copyright to the Site Info settings page: plugins\sgs-blocks\scripts\sync-business-info.py, plugins\sgs-blocks\includes\class-sgs-site-info-admin.php, class-sgs-site-info-rest.php, the Sgs_Site_Info store class, and its wiring in plugins\sgs-blocks\scripts\orchestrator\upload_and_patch.py.
3. The extractor: plugins\sgs-blocks\scripts\theme-extractor\ (extract.py, roles.py, palette.py, derive.py, measure.js).
4. .claude\specs\31-UNIVERSAL-CLONING-PIPELINE.md in full (project rule), then .claude\specs\44-CLASSLESS-REPEATER-RECOGNITION.md section 11.
5. The reports .claude\reports\2026-09-19-inv-spec33-palette.md, -inv-non-bem-sections.md and -inv-stage116-draft-side.md.

Deliverable: a plain-English "what exists / what is missing" for Spec 33 that Bean can check. Check whether FR-33-14 finds anything behind `{{ phone }}` bindings, and whether it ever ran on this draft (it only runs with `--push-theme-snapshot`). Do this inline, with no subagent.

## Task 2: Spec 33 upgrade design

Use /brainstorming (design mode). Cover runtime-template drafts and plain HTML, the settings placeholders, and the palette findings (scrollbar colours, the runtime-set `--acc` accent, overlay-not-replace). Bean approves the plan before you build. Then build with an independent /qc, and verify on the test site.

## Task 3: Missing sections (Problem 1)

Use /brainstorming after Task 2. The homepage sections b3-b9 of Eye Care Birmingham never convert, because classless sections are admitted only if a hint attaches. The investigator proposes: admit any classless boundary as the container default, put only the default routed view on the page, and fix the halt message. Test that proposal; do not assume it. Acceptance: those sections appear on the test page, checked with Playwright `innerText`.

## Task 4: Runtime bindings (Stage 2)

After Tasks 2 and 3. Success metric: visible placeholders fall from 93 to 0 for content bindings. Keeping the `<sc-for>` wrapper lands only item 0 of N, so full conservation needs container-level handling.

## Running a clone on the real test site

Test page: https://darkcyan-grouse-898606.hostingersite.com/eye-care-birmingham/ (page 11; credentials in .claude\secrets\eye-care-test.env).

Set `SGS_DEPLOY_SITE=eye-care-test`. Set `SSL_CERT_FILE` and `NODE_EXTRA_CA_CERTS` to C:/Users/Bean/AppData/Roaming/Python/Python313/site-packages/certifi/cacert.pem. Python's Windows certificate store rejects every hostingersite.com host.

Run: python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup "sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html" --client eye-care-ward-end --page eye-care-birmingham --auto-section --mode draft --skip-register --no-scaffold-new-blocks --sc-var-cache sites/eye-care-ward-end/sc-var-hints.json --sc-var-min-confidence 0.0 --dom-shape-min-confidence 0.0 --classless-match --classless-auto-complete --deploy-target page:11

Add `--resolve-js-content` for the JS-array comparison. Do not add `--skip-freshness-gate`.

## Skills

| Skill | When |
|---|---|
| /autopilot | First, before any response |
| /brainstorming | Tasks 2 and 3, design gate with Bean |
| /strategic-plan | After the design gates: write the Front F plan (none exists yet) |
| /systematic-debugging | Any failure: prove the cause before fixing |
| /qc-council or /qc | Independent check before committing converter, pipeline or extractor changes |
| /sgs-wp-engine, /sgs-clone | Any SGS block, pipeline or clone work |
| /sgs-db, /wp-blocks | Before claiming a block or attribute is missing |
| /library-docs | Library or WordPress API questions |
| /verify-loop | Load-bearing claims need two independent pieces of evidence |
| /dispatching-parallel-agents | Read-only investigators, one directory each |
| /writing-clearly-and-concisely | Anything Bean reads |

## Tools

| Tool | Use |
|---|---|
| Playwright (browser_evaluate, screenshots) | What a visitor sees: `innerText`, never a tag-stripping regex |
| plugins\sgs-blocks\scripts\parity\computed-parity.js | Fidelity. Serve `.dc.html` drafts over HTTP so their runtime renders |
| `ssh hd` + wp-cli | Read the test site: options, posts, palette |
| Hostinger MCP tools (load with ToolSearch) | Site listing only; site creation is already done |
| python plugins\sgs-blocks\scripts\build-deploy.py --target eye-care-test | The only deploy path |
| python .claude\hooks\handoff-preflight.py --check | Doc gate before any handoff |

## Agents

| Agent | When |
|---|---|
| general-purpose (sonnet), read-only | Parallel investigators. Give each its own scratch folder and its own report file |
| wp-sgs-developer | Heavy block or theme work, once the design is approved |
| design-reviewer | Visual comparison of the clone against the draft |

## Research approach

1. Read Spec 33 and Spec 31 in full, then grep for the capability (`git grep`, `/sgs-db`). Do not rely on summaries.
2. Read the run dumps under pipeline-state\eye-care-ward-end-eye-care-birmingham-*\ (stage-4.json, voter.json, tagged-mockup.html, content-gaps.json) before theorising.
3. Check the gold standard before designing: how comparable tools handle template variables and settings extraction (/search or /research-check).
4. Verify every investigator's claim yourself. Two of mine were wrong last session.

## Guardrails

- Commit straight to main. No PRs, no `git stash`, no `git add -A`. Use `git commit -- <explicit paths>` and check `git branch --show-current` in the same command. No Co-Authored-By.
- Bash `/tmp` and Python `/tmp` are different folders here. Use relative filenames or a project scratch path for files shared between them.
- Verify a stage claim by finding one string it should have produced in the emitted output, not by a count.
- Compare runs by (selector, block) identity, never `boundary_id`.
- Parallel agents get one directory each and never deploy. The main thread owns deploys and commits.
- Check the D-number ceiling with `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1` immediately before writing a decision.
- Read the LEDGER fresh before editing it. Other sessions write to it.
- UK English, no emoji, no time padding. Put a plain-English anchor before any technical term when writing to Bean.
