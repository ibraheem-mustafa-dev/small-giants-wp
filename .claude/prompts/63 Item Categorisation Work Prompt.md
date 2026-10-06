Invoke /autopilot before doing anything else.

Context: Eye Care (`eye-care-ward-end`) is being rebuilt from a Claude Design draft onto the SGS WordPress
block framework. Spec 47's measuring route reports 193 candidate gaps, but Session C2 established that the
route only ever sees VISUAL differences — and that **63 of the fix register's 208 rows are invisible to it
by design**. Those 63 are the behavioural, content and motion half of the build, and they are what a
visitor actually notices: a second different product never reaching the bag (N11), the filter panel
breaking when a filter is removed (N25), the missing "Added to bag" toast (18), `.00` on prices, empty spec
rows, missing `/privacy` and `/terms`. Bean's words: several of these "aren't even walker issues, they need
to be fixed/built". A clean F count is not a measure of how finished the site is.

Read first:
- `.claude/reports/2026-10-06-session-c2/BEAN-LIST.md` §D2 "THE BIG ONE: 63 register items the walker cannot
  see at all" — the grouped list and what each group is.
- `.claude/plans/2026-10-02-eye-care-fix-register.md` — the source of truth. Bean: "Do not edit the
  register's content. It is correct." The 63 are the rows whose Sweep column reads `not walker-measurable`.

THREE THINGS TO ABSORB FIRST:
1. **Six of the 63 were built after the code Session C2 measured, so they read as open there.** Five are now
   BUILT AND DEPLOYED to both sites and fully verified - 18 (`c8c2c4162`), 20+23 (`e4735072d`), 59/61
   (`5a9e28ee5`), S10 (`80b9deaa4`, then rebuilt in `e62f45952`) and S9 (`2b4122c77`) - with their proofs in
   the register rows; treat them as CLOSED, not open. The 75/82/158 gallery strip (`b68db67c9`) is the one
   still to check against what is live.
2. **Only 7 of the 63 narrate a completion** in their Fix cell. The rest are genuinely open or unstarted.
3. **14 of the 63 are CR items** — route and calibration findings, not client-visible work. They belong
   with the route, not with this list.

The task, per Bean: **go through the 63, deploy and test live, compare each against the draft, then
categorise the remainder.** Use `/phase-planner` to turn that into an executable phase plan. The four
categories to sort into: built and verified; genuinely open (with its fix shape); needs content from the
client; or an accepted divergence from the draft.

⚠️ **START ORDER: this session deploys and tests live, so it runs AFTER the Spec 47 route cleanup's
verification sweep.** Two sibling tracks are live: `.claude/prompts/Spec 47 Cleanup Prompt.md` **owns the
host** until its sweep completes (its F 193 → 148–168 prediction is only single-variable while the live site
holds still), and `.claude/prompts/Eye Care Block Fixes Prompt.md` is holding its own deploy and reseed for
the same reason. **Confirm the cleanup has signalled clear before your first host write**, and expect the
block-fix track to want the host too — its 5 fixes close ~19 walker rows and need an `sgs-update` reseed.
Message peer session `small-giants-wp-41` as well.

Guardrails:
- eye-care-test runs block code `6d6906b98`; verify by the deploy marker and by checksum, never by
  liveness. `build-deploy.py` builds from an isolated worktree at HEAD, so an uncommitted change CANNOT
  ship and the deploy still prints `[DONE]` with every gate green.
- A straight `md5sum` reports CRLF-versus-LF as a content mismatch. Normalise with `tr -d '\r'` first.
- The shared host `141.136.39.73` is shared with sandybrown. Message peer session `small-giants-wp-41`
  before any deploy or reseed.
- `MEMORY.md` was consolidated on 2026-10-06: 111 lesson files folded into 74, and the index is 10,241 bytes against its 16,384 cap, so ~6,100 bytes are free and a new lesson fits without cutting anything. Index lines use a short human title, not the slug repeated: `- [Short Title](the-slug.md) — hook`.
