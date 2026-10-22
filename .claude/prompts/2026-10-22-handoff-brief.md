# Handoff brief, 2026-10-22: plan consolidation session

Written for the cloud session that runs `/handoff` Steps 2 to 9. Repo `small-giants-wp`, branch `main`.

## Tasks and intended outcomes

1. **Consolidate the overlapping plans in `.claude/plans/`** so every open item has exactly one home, every finished plan is archived, nothing is duplicated, and every surviving item names the task it serves. The readers plan (`.claude/plans/2026-10-21-handoff-readers.md`) is owned by another live session (small-giants-wp-b9); this session never edits it, and b9 merged this session's items into it itself (`0480ee550`). Outcome achieved.
2. **Re-verify every open Eye Care row** (Bean's ruling: the three Eye Care plans stay as they are, because their framework upgrades exist to serve that client's build; check that each open row is still real and is not absorbed into the readers plan). Outcome achieved: about 110 open rows checked against code and git.
3. **/qc-council on the session's work.** Outcome achieved: 10 confirmed findings, all doc pointers or wording, fixed in `80052f422`.

## This session's commits

- `32565e831` docs(plans): one home per open item (the consolidation).
- `80052f422` docs(plans): qc-council fixes on the plan consolidation.

Run `git show --stat` on each for the file list.

## What changed (current truth)

- **Archived** to `.claude/plans/archive/`: `2026-10-11-spec48-indus-build.md`, `2026-10-12-clone-coverage-foundation.md`, `2026-10-19-fr48-8-declared-values.md`, `2026-10-20-states-wave.md`, `2026-10-21-header-slice-council.md`.
- **`.claude/plans/2026-10-21-indus-delivery.md` is the Indus home.** `scripts/computed-route/delivery-map.mjs indus-foods --check` reads its work table as the owner list for all 466 delivery-map keys (`lib/delivery-map.mjs::planUnits`), so it must stay live. Edits: the "Starting point" section is current; FR-48-50 was removed from U16 (readers wave 3 owns it); the "Step 0" section and its prompt task were removed (the archiving is done); "Carried from the archived plans" was renamed "Also owned here"; and U9 names the Enquiry chips' description typography and colour.
- **New `.claude/plans/2026-10-22-mamas-delivery.md`** holds the Mama's-only items: the writers for the label end shapes, the buybox sticky bar, the inline highlight and photo, the link underline colour and the floating layers (each taught only by Mama's draft, e.g. `polygon()` appears only there); Mama's recalibration; and the FR-48-55 shop parts. It starts after the Indus sign-off. LEDGER's Parked list points at it.
- **Spec 48 §5.4 Residual** gained Res 54 to 63: framework leftovers no client unit needs yet. FR-48-8, FR-48-78, FR-48-79, FR-48-80, FR-48-81, FR-48-82, FR-48-84, FR-48-85, the §12 site-build row and Appendix B step 20b now name their live owners.
- **Eye Care register notes:**
  - N36A is built in code (`afae93d66`); its live check is still open, so the lane stays Fix.
  - Mega 11 is partly written (`6d6518f6f`).
  - S5 is partly written (`0a9c3ed46`).
  - S6, 8, N5 and N20 wait on the readers plan's container band layers migration.
- **Eye Care backlog:** rows CR12 (a duplicate of the fuller register row) and 19 (built; register row 19 is already closed) were removed.
- **LEDGER** Fronts M and H and Parked are repointed. It is at 24,553 bytes against a 24,576-byte cap, so any LEDGER edit must stay byte-neutral or shorter.
- **Other repoints:**
  - Spec 38A and `architecture.md`.
  - The prompts `indus-session-A.md`, `indus-session-S.md` and `Declared-values-final-session-prompt.md`.
  - The header comments of two migrations and `scripts/computed-route/lib/fill-timing.mjs`.
  - `.claude/catalogues/tooling.md`, regenerated.

## Findings (including ones where no file changed)

- The "columns-tier floors" backlog item was already built (`f5f224347`), so it was deleted.
- The declared-values plan's note "`sgs/tabs` belongs to the states wave" matches no item anywhere, so it was dropped.
- `plugins/sgs-blocks/scripts/migrate-motion/consumer-groups.json` still globs `.claude/plans/2026-10-12-clone-coverage-foundation.md`. It is detector input data, so it was left unchanged deliberately: changing the glob changes the detector's behaviour.
- Eye Care: Phase 7's answer-key items (C1, C3, C4, C5) are not covered by the readers plan's Eye Care comparison, so they stay in `.claude/plans/2026-10-02-eye-care-plan.md`.
- Eye Care: register rows 112 and 115 have their colours swapped in the trees against the draft (`help.tree.json` uses `text-soft` where the draft is `text-muted`; `size-guide.tree.json` the reverse). Both rows are open already.
- The lesson "grep a plan's nicknames before archiving it" is saved to local auto memory (`doc-edit-discipline.md`); the cloud session has no memory to update.

## State

- Branch `main`, HEAD `80052f422`, pushed, 0 ahead and 0 behind `origin/main` at writing.
- No build, deploy, reseed or SSH: a docs-only session, apart from three one-line header comments.
- Gates at `80052f422`:
  - `python scripts/check-md-wrap.py --check` on every edited `.md`: exit 0.
  - `plugins/sgs-blocks/scripts/lints/lint-spec-drift.py`: exit 0.
  - `python .claude/hooks/handoff-preflight.py --check`: 5 of 5.
  - `node scripts/computed-route/delivery-map.mjs indus-foods --check`: OK, 466 keys.
  - `generate-tooling-catalogue.py --check`: up to date.
- Nothing of this session's is left uncommitted. The working tree holds other sessions' uncommitted files: never stage them.
- Prompt files: this session was started from a pasted prompt, not a file, so none needs deleting for it. This brief is deleted by the cloud session's commit.
