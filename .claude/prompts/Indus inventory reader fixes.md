Invoke /autopilot before doing anything else.

TRACK: Spec 48 FR-48-25, the intake inventory reader fixes Bean's Indus review found (2026-10-19). Must land before Indus build plan step 20 (the header slice reads these triggers).

CONTEXT (plain English)
- Intake re-derives the draft's animation and surface inventory and diffs it against Claude Design's copy; each disagreement is a review row Bean marks `ours` or `theirs`.
- In the 2026-10-19 review, 125 of 420 Indus rows took `theirs` because the draft code proves our reader wrong. Those marks are in `sites/indus-foods/build/intake/review.md` and `intake.json`; the reader is still wrong for every future client.
- The full list of bugs, each with the functions, record IDs and draft lines, is FR-48-25's "Open (Bean's Indus review, 2026-10-19)" paragraph in `.claude/specs/48-CLONING-SYSTEM.md`.

READ FIRST
- `.claude/specs/48-CLONING-SYSTEM.md` FR-48-25 (Status and its Open paragraph).
- `scripts/computed-route/lib/intake-inventory-code.mjs` (`triggerOf`, `reducedMotionOf`), `intake-inventory-anim.mjs` (`statusOf`), `intake-inventory-surfaces.mjs` (route list, states, `readsState`), `intake-inventory-tpl.mjs` (transition triggers, reduced-motion records).
- `.claude/claude-design-handoff/handoff-schema/METHOD.md` §5.3 (trigger types).

TASKS, IN ORDER
1. One fix per bug in the Open paragraph, each with a MUST FAIL fixture test in `scripts/computed-route/tests/intake-inventory*.test.mjs` that fails with the fix reverted. Prove each cause on the Indus draft line the paragraph cites before fixing it.
2. Re-run Indus intake (`node scripts/computed-route/intake.mjs indus-foods`, about 100 minutes; pass B prints nothing for over an hour). Message peers first (ListAgents) so no one else runs intake on Indus. Bean's marks carry over (`lib/intake-review-carry.mjs::withUnappliedMarks`).
3. Check the diff: every row Bean marked `theirs` on 2026-10-19 is either gone (our reader now agrees) or explained in the commit. Rows still marked `theirs` with no remaining disagreement get no new mark. Then `intake.mjs --apply-review indus-foods` (exit 0) and `check-approved.mjs indus-foods` (exit 0).
4. Update FR-48-25's Status (replace the Open paragraph with what was built), commit with explicit pathspecs, push, delete this prompt file in the same commit.

GUARDRAILS
- `node --test "scripts/computed-route/tests/*.test.mjs"` all pass; `node scripts/computed-route/lint.mjs` passes.
- Never edit `sites/*/handoff/`. Motion writing belongs to the Spec 38A session; this session fixes reading only.
