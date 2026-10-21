Invoke /autopilot before doing anything else.

CONTEXT (plain English) SGS clones Claude Design drafts into WordPress through the "computed route" (scripts/computed-route/, Spec 48). "Fill" writes each draft element's measured styling into block settings and keeps a "confirm record" per written value (declared code value vs rendered value, verdict confirmed / render-wins / draft-defect / open). The FR-48-8 plan (Fill reads declared values with a confirm record) is done except its final step 6: every earlier step shipped on 2026-10-20/21 (declared-value write, justify-items read, the menus' current-page item, the Indus recalibration under read key 5dc0f761b1c9, the 13 non-Indus re-measures). Step 6 needs an Indus "surface" (a skeleton tree Fill can run on), which arrives with Indus step 20 (the Indus header clone, being run by another session).

READ FIRST
- C:\Users\Bean\Projects\small-giants-wp\.claude\plans\2026-10-19-fr48-8-declared-values.md (step 6, Progress, Open)
- C:\Users\Bean\Projects\small-giants-wp\.claude\specs\48-CLONING-SYSTEM.md: FR-48-8 (its done-when), FR-48-36 ("What is written"), FR-48-34 (draft defects)
- C:\Users\Bean\Projects\small-giants-wp\scripts\computed-route\lib\fill-state.mjs (the state writer, FR-48-81)
- C:\Users\Bean\Projects\small-giants-wp\.claude\LEDGER.md, the Indus front

TASKS, IN ORDER
1. Pre-flight (5 min): git pull --ff-only; ListAgents; message any busy peer before using indus-test or local-indus. The Indus header surface exists (sites/indus-foods/build/trees/sgs_header/header.json); step 6 runs on it.
2. Step 3(b), the draft-defect write (about 30 min, inline): a draft-defect row (a code-declared state rule that never paints, intake.json draftDefects) is built from the code value and listed for Bean (FR-48-69), written through the states wave's state writer (scripts/computed-route/lib/fill-state.mjs). MUST FAIL test plus a mutation check (node scripts/computed-route/tools/mutate.mjs <route dir> <mutations.json> <test file>; write the JSON with the Write tool, escape tabs).
3. Step 6, the Indus surface proof (about 45 min machine plus 20 min review): fill.mjs on the Indus surface writes a confirm record for every written value; a planted code value that differs from its render is reported and the rendered value written; a planted draft defect is built from the code and listed; each case fails with its check removed. Then resolve the draft reading wave's CSS-group coverage entries (recognise lib/fill-declared.mjs, write lib/fill-prop.mjs#resolveProperty, check lib/fill-confirm.mjs). Delegate the fill/calibration runs to one Sonnet operator agent (serial: one calibration and one browser at a time); judge results in the main thread against fill-report.json.
4. Close: mark step 6 done, archive the plan to .claude/plans/archive/ and repoint links, set Spec 48 FR-48-8's Status to built and FR-48-36's record and draft-to-resolve half to built (its rendered-live half belongs to the Indus delivery plan's U16). Session A's closing commit carries LEDGER, its /qc-council and its /handoff.

GUARDRAILS
- In scripts/computed-route: node --test "tests/*.test.mjs" (all pass; 1,851 on 2026-10-21), node capabilities.mjs --gate, node lint.mjs; run tests only when no peer is reseeding.
- A framework-DB reseed runs ONLY from a clean worktree at origin/main with `npm ci` in scripts/computed-route first, then sgs-update-v2.py and seed_reference_data.py (npm run build does not reseed block_attributes). If the build's db-consistency F6 flags rogue seeds, regenerate plugins/sgs-blocks/scripts/behavioural-analyser/css-property-classifications.json with extract-signatures.py and check its diff removes nothing.
- check-text-stroke-routing must stay green: a new *TextStroke* attribute needs an element-manifest claim (its --fix, and a hand-placed element where it reports UNPLACED).
- Message peers before any build, reseed, provisioning, mirror refresh or calibration; the states-wave session owns calibrate-read.mjs, calibrate-instances.mjs and calibration-fixtures.json.
- Gate every commit chain on the real exit code of python .claude/hooks/handoff-preflight.py --check.
