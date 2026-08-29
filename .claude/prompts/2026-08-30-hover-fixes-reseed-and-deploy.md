# Next session — finish the hover work: reseed, deploy, live-verify

**Written 2026-08-29.** Client-controls track. Invoke `/autopilot` first.
Everything here is BLOCKED WORK, not new work — the code is written, committed and
pushed. What is missing is a clean tree.

---

## What landed 2026-08-29 (do NOT redo any of it)

| Commit | What |
|---|---|
| `18eee2666` | testimonial + process-steps hover fixes, manifest declarations, new guard script |
| `89c4d33fd` | the visual-diff skip-debt record |
| `6c74fb4c7` | Ken Burns animated nothing on the `<img>` fast path |
| (converter) | fractional grayscale gaps instead of silently rendering 100% |

All pushed to `main`. Converter suite **727 passed, 0 failed** (was 724).

Two prompt claims were re-verified FALSE and corrected in the commit messages:
`photoMobile` **does** still exist in the DB, and Ken Burns is **not** broken
"without parallax" — parallax is irrelevant, `$sgs_bg_img_is_simple` is the
discriminator.

Task 7 (mega-panel cross-block manifest) needed **no work at all** —
`.sgs-icon-list__icon` and `.sgs-mega-group` were already declared in `ee0fd9081`,
and `.sgs-icon-list__item` is static variant CSS with no attribute behind it.

---

## THE BLOCKER, and why it is not a code problem

At the time of writing the worktree carried **~27 modified files from other
tracks** (accordion Shape-B, star-rating, tabs, timeline, button, card-grid, block
variations, theme footer patterns). Several sessions were committing concurrently
— `main` moved three times mid-session and `index.lock` collided twice.

That blocks two things, both correctly:

- **`build-deploy.py` refuses a dirty tree.** Forcing it with `--allow-dirty`
  would ship ~27 files of other tracks' half-finished work to the canary. That is
  precisely the D336 trigger. Do not.
- **`/sgs-update --stage 1` would bake their in-flight work into the shared DB.**
  MEASURED, not assumed: `--stage 1 --dry-run` reported `new_attrs: 5` across 83
  blocks, and **none of the five were mine**.

⭐ **First action next session: `git status`. If the tree is clean, everything
below is unblocked and is maybe 30 minutes of work. If it is not, stop and do
something else — none of this is safe on a dirty tree.**

---

## Task A — the reseed, and the one change that is waiting on it

`sgs/team-member.photoTablet` / `photoMobile` are classified `css_property =
'max-width'`. They are object-typed **media** attributes rendered as
`<picture><source media>` art-direction swaps — not a CSS length. Their own base
sibling `photo` correctly carries NULL.

**ROOT CAUSE, proven:** the derived classifier read the media query inside
`<source media="(max-width:1023px)">` (`team-member/render.php:261,264`) as if it
were a CSS declaration. The tiers prove the mechanism beyond doubt — `photoTablet`
took tier `tablet` from `1023px` and `photoMobile` took `mobile` from `767px`,
exactly this project's device breakpoints. The fingerprint (`css_property =
'max-width'` AND `css_tier IS NOT NULL`) returns exactly these two rows repo-wide.

**The override was written and then REVERTED on purpose.** An override only takes
effect on reseed, so committing it without one leaves the DB and the override file
disagreeing — and the F5 commit gate reads that state GLOBALLY, not per-path. It
would have fired on **every other track's** next commit, naming `sgs/team-member`
attrs they never touched. Verified both ways: with the edit, F6 reported 2 NEW
violations, both mine; after reverting, 0 NEW.

**Do this, in this order:**

1. Re-apply the patch (it is 2 entries in `scripts/attr-classification-overrides.json`;
   the full `_why` prose is in the file, written to survive). If the scratchpad copy
   is gone, the entries are reconstructable from this section — set
   `css_property: null` and `css_tier: null` for both attrs.
2. `python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1 --dry-run` and
   **read it** — confirm the only changes are yours.
3. Reseed for real.
4. **Commit the override and the reseed together.** They are inseparable.

⚠ Consider fixing this at the classifier instead — teaching the behavioural
analyser that a `media` attribute is not a CSS emission. It was overridden rather
than classifier-fixed because that is a shared-analyser change with real blast
radius for a 2-row defect. The root cause is recorded in the override's `_why` so
that decision can be made deliberately rather than rediscovered.

## Task B — wire the guard (needs Task A's reseed first)

`plugins/sgs-blocks/scripts/check-hover-state-classification.py` is committed but
**deliberately not in `gates.json`**. It reports FAIL until the reseed propagates
the two new `states.hover.attrMap` declarations, and wiring a red gate would break
four other tracks' builds.

After the reseed: run `--check`. It must return **0**. Then add it to
`scripts/gates.json` (fast tier) with a `check:` alias in `package.json`, and
confirm with `npm run gate:list` — grepping `package.json` proves only that the
alias exists, not that the gate runs.

Its predicate is `*Hover` + real `css_property` + `css_state IS NULL` + **a
resting twin exists**. That fourth conjunct is load-bearing: without it the
predicate returns FOUR rows, and the two extras
(`sgs/gallery.overlayColourHover`, `sgs/business-info.linkHoverBackgroundImage`)
are hover-ONLY attributes that both block.json `_note`s record as deliberately
undeclared — FR-35-5 STATE_WITHOUT_BASE fires for any hover with no resting
counterpart, and that baseline only ratchets down. `--self-test` is 9/9 and
includes the exemption's own negative control.

## Task C — deploy, then pay three visual-diff debts

Deploy via `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`.
⚠ The motion track had uncommitted `fx` sources; a deploy may still need
`--payload …/extension-attributes.generated.php` until they regenerate it.
⚠ A deploy can print `[ABORTED] … Nothing was uploaded` while its wrapper exits 0.
Read the output, never the exit code.

Then write these three reports into repo-root `reports/visual-diff/`. All three are
logged as MANUAL SKIP debts in `manual-skips.log` and are **unpaid**:

| Report | The assertion it must carry |
|---|---|
| `testimonial-<date>.md` | Hovering the CARD changes `.sgs-testimonial__quote`'s colour **and leaves the block root unchanged** |
| `process-steps-<date>.md` | Hovering a STEP changes `.sgs-process-steps__number`'s background **and leaves the block root unchanged** |
| `container-<date>.md` | Ken Burns: screenshots at t=0 and t≈10s **differ**, then stop under `prefers-reduced-motion` |

⛔ **Assert BOTH halves of the hover claims.** Checking only that the intended
element changed cannot distinguish the fix from the bug it replaced — the bug also
changed something.

⛔ **`computed-parity.js` cannot supply any of this.** Measured, not inherited:
`grep -c -i hover plugins/sgs-blocks/scripts/parity/computed-parity.js` returns
**0**. It scores resting styles only, so a correct hover fix and a broken one both
come back green. And a computed-style check cannot see a zero-effect animation —
`background-size` resolves perfectly on an element that never moves. Measure hover
by hand in a real browser; prove the animation with a time-separated screenshot pair.

⛔ SGS block CSS is lifted into `uploads/sgs-css/` — grepping page HTML proves
nothing.

**What the testimonial fix should look like:** before it, `quoteColourHover` was
INERT, not merely mis-targeted. The quote carries its own explicit `color` whenever
`quoteColour` is set, and an explicit declaration beats an inherited one regardless
of specificity, so a colour set on the card root could never reach it. If you see
"no change" on the before-state, that is the bug, not a broken capture.

---

## Still open, untouched, carried forward

- **`detector-first-commit-gate.py` has a NAMED HOLE** — `MIN_SHARED_LINES = 3`
  lets a genuine 4-file component rollout through when it shares only one line.
  Needs its own design gate with Bean; nobody has priced the false-positive cost,
  and a gate that fires on every multi-file commit gets bypassed reflexively.
  Whoever fixes it: add a fixture from `1612c7b1e` to `--self-test`.
- **Spec 39 STILL does not exist** and paces the migration — 37 conformance
  goldens sit `xfail(strict=True)` naming it, and finishing more of the tier
  migration INCREASES the blocked surface until it ships. Check first whether its
  scope is already settled across D276/D552/D554; it may be transcription plus a
  design gate rather than open design.
- **CHECK A backlog 207** is a raise against a down-only rule — a debt, not a new
  floor. Re-measure and lower once the hover-gradient-masked-border-ring desync
  class is fixed.
- **The converter's sibling gap**, named in `37a5595b9`'s docstring:
  `resolve_state_property` returns `None` on fall-through rather than a GAP. Left
  deliberately — it is a different shape (a fall-through the chain is DESIGNED to
  use, protecting the D289/D303 hover passthrough), so it needs its own reasoning
  and its own test, not a same-pass widening.
- **Root-filter Shapes A/B/C remain NO-GO.** Six personas, five reported, grades
  D through C+. Do not rebuild them; the brief is
  `.claude/reports/2026-08-28-root-filter-capability-design-gate.md`.

## Instrument faults confirmed this session

- `computed-parity.js` is hover-blind — 0 occurrences of "hover" (re-measured).
- `check-interaction-only-css.py` and `check-markup-neutral.py` both mis-read a
  multi-line `/* */` comment as a code line, so they refuse an exemption a
  comment-only-adjacent change should get. Minor, but it costs a skip debt.
- `gap_writer` does **not** persist to `attribute_gap_candidates` — its docstring
  says persistence "is a step-3 concern". A test asserting that table at resolver
  level returns an empty set while the resolver is behaving correctly. Assert the
  resolver's return value instead.
