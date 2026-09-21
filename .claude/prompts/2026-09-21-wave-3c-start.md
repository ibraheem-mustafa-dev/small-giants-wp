Invoke /autopilot before doing anything else.

You are continuing the merged Spec 36 + Spec 37 nav/header/footer/drawer track for Small Giants Studio (small-giants-wp, branch main). Waves 1 to 3B are done: 13 reference sites were captured, clustered into 46 capability families, adversarially reviewed and signed by Bean, who also accepted every recommended decision. Your job is Wave 3C: build the families.

Read, in this order, in full:
1. `.claude/plans/2026-09-21-wave-3c-implementation-plan.md` (the plan; section 6 lists lessons that each cost time).
2. `.claude/reports/reference-requirements/FAMILIES-MASTER.md` (the 46 families, the 17 units, the decisions) and `families-master.json`.
3. `.claude/plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`, sections "Checkpoint protocol", "Wave 3B", "Wave 3C" and the Gate 3C definition.
4. `.claude/reports/reference-requirements/CAPTURE-PROTOCOL.md` and the per-reference `<ref>.md` / `.json` for whichever unit you are building.
5. Spec 36 (`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`) FR-36-6 and FR-36-22, and Spec 37 §1.2, before touching the drawer model.

Then do Step 0 (0a to 0e in the plan), then the units in order. U-12 (four furniture blocks, one agent per block in new directories) and U-15 can run in parallel with the chain from the start; every other unit runs one at a time because they share files.

Rules that apply: commit to main with explicit pathspecs, never a PR, never `git stash`, never `git add -A`, no attribution lines in commits; push after every unit; deploy only through `plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown|indus-test|eye-care-test`; verify in a REAL headed Chrome in ONE window and wait for each page to load fully; measure inside a real `sgs/site-header` fixture (`qa-hdr-*` pages), never a loose block; prove the cause before a fix; design-gate and QC-council every shared-mechanism change before building it; UK English; no em-dashes in anything written in Bean's voice; ADHD-friendly reports (Problem, Effect, Solution; menu plus one recommendation; concise). Never treat a background-task notification as Bean's answer.

First action (under 5 minutes): read the plan, then run Step 0a (`sgs-update-v2.py`) and tell Bean in three lines what you will do first and whether anything blocks it.
