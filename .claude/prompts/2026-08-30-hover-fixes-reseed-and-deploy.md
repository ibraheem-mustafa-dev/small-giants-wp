# Client-controls track — hover work CLOSED; what remains is listed at the bottom

**Written 2026-08-29, updated the same day.** Invoke `/autopilot` first.

⛔ **Tasks A, B and C are ALL DONE** — reseed, guard wired, deployed, live-verified,
and all three visual-diff debts paid. They are kept below for their root-cause
records, which were expensive to establish. **The only live work is
"Still open, untouched, carried forward" near the end** — read that first, and
⛔ read the Spec 39 entry there before repeating anything about its status.

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

## ✅ TASKS A + B ARE DONE (2026-08-29, later the same day) — do NOT redo them

The tree cleared, so the reseed ran. **`c45b4f5dc`** (reseed + the team-member
override) and **`c50066bff`** (the guard wired). Verified by query, not asserted:

| Attribute | Before | After |
|---|---|---|
| `quoteColourHover` | element NULL, state NULL | `quote-text` / `hover` |
| `numberBackgroundHover` | element NULL, state NULL | `number` / `hover` |
| `photoTablet` / `photoMobile` | `max-width` + tier | NULL / NULL / NULL |

`check-hover-state-classification.py --check` **PASSES** (was 2 findings) and is
now gate 78, fast tier — confirmed via `gate:list` / `gate:wired` / `run-gates.py
--only`, never by grepping `package.json` (that is a documented false positive).
Fast tier 70/70. F6 is 0 NEW.

⚠ **One trap worth carrying:** the override needed `css_layer: null` as well as
`css_property`/`css_tier`. F6 compares the PAIR `(css_property, css_layer)`, and
the derived layer sets `css_layer = 'OUTER'`, so clearing the property alone left
it mismatched and F6 still reported 2 NEW. If you clear a `css_property` in an
override in future, clear its layer too.

**The 5 `new_attrs` in the dry-run were never contamination** — they were
`sgs/accordion`'s Shape-B border attrs, already committed and pushed in
`542e256aa`. The DB catching up with committed work is what a reseed is for. The
other 17 block.json-vs-DB differences are `_comment_*` pseudo-attributes the
seeder correctly skips.

**`block_changes` / `pipeline_corrections` showing as GONE in seed history is
expected** — commit `426d10ce2` retired them and removed them from `schema.sql`.
Schema-drift reports CLEAN. Do not go looking for a broken writer.

---

## ✅ TASK C IS ALSO DONE — deployed, live-verified, all three debts paid

A parallel session deployed and its payload carried this work (verified on the server, with a
positive control per file). Live measurements, mouse driven to real coordinates so `:hover`
genuinely matches:

| Block | Element | Resting -> Hover | Block root |
|---|---|---|---|
| testimonial | `.sgs-testimonial__quote` colour | `rgb(26,26,26)` -> `rgb(200,30,30)` | UNCHANGED |
| process-steps | `.sgs-process-steps__number` bg | `rgb(26,26,26)` -> `rgb(200,30,30)` | UNCHANGED |

Ken Burns on Bean's `/test-kenburns/` page captured the bug and the fix in one reading:
`imgFastPath=YES`, `containerBgImage=none` (nothing for the old rule to animate),
`containerAnim=sgs-container-ken-burns` running on nothing, `imgAnim=sgs-container-ken-burns-img`
on the element that paints. Motion proven by transform matrix at t=0 vs t=+17.1s, and the
screenshot pair visibly differs.

Reports: `reports/visual-diff/{testimonial,process-steps,container}-2026-08-29.md`.
⚠ One residual gap, stated honestly in the container report: reduced-motion is verified as
RULE-PRESENCE in the live CSSOM, not as emulated-media behaviour — no `prefers-reduced-motion`
emulation was available. Close that if you have media emulation.

---

## The blocker's shape — kept because it recurs, not because it is live

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

⭐ **The lesson, not the status: on this shared tree, `git status` before any
deploy or reseed. Neither is safe while another track has files in flight.**

---

## ✅ Task A — DONE (`c45b4f5dc`). Kept below for its root-cause record only.

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

## ✅ Task B — DONE (`c50066bff`), gate 78, fast tier. Kept for the predicate's rationale.

`plugins/sgs-blocks/scripts/check-hover-state-classification.py` is now gate **78**,
fast tier, `budget_ms` 150 (measured across three runs, not guessed). Confirmed via
`npm run gate:list`, `npm run gate:wired`, `run-gates.py --only …` and a full fast
tier at 70/70 — never by grepping `package.json`, which proves only that the alias
exists, not that the gate runs.

Its predicate is `*Hover` + real `css_property` + `css_state IS NULL` + **a
resting twin exists**. That fourth conjunct is load-bearing: without it the
predicate returns FOUR rows, and the two extras
(`sgs/gallery.overlayColourHover`, `sgs/business-info.linkHoverBackgroundImage`)
are hover-ONLY attributes that both block.json `_note`s record as deliberately
undeclared — FR-35-5 STATE_WITHOUT_BASE fires for any hover with no resting
counterpart, and that baseline only ratchets down. `--self-test` is 9/9 and
includes the exemption's own negative control.

## ✅ Task C — DONE. Kept below for the assertions each report had to carry.

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
- ⛔ **Spec 39 — READ THIS BEFORE REPEATING THE OLD LINE. It does NOT pace the
  migration, and it is NOT this track's to build** (Bean, 2026-08-29). The line
  that stood here said the opposite and was wrong twice over:

  **Wrong on ordering.** D552 is the governing rule — **the block standard LEADS,
  the cloning pipeline is reworked AFTERWARDS** to the universalised norm. The
  converter's inability to emit the new shape is *scheduled work, never a
  precondition*. The order is: **become uniform first, then build Spec 39 with
  that uniformity as the foundation.** Gating uniformity on Spec 39 inverts it.

  **Wrong on evidence.** "37 conformance goldens sit `xfail(strict=True)` naming
  it" does not survive checking: **0** xfails anywhere in the plugin reference
  Spec 39 (17 exist in total, so the grep does find them). And
  `check_flat_tier_regression.py` lives in `orchestrator/` — the cloning pipeline,
  not the block standard, exactly where D552 puts it.

  **This track's actual job** is CAPTURING prioritised points for whoever writes
  Spec 39 — not writing it. The inputs are already collected in
  `.claude/plans/spec-39-seed-requirements.md` (status: "SEED — do NOT treat as a
  spec") and `.claude/plans/spec-35-capability-routing-doctrine.md`.

  ⚠ The seed doc states the ordering rule and adds that it is "recorded here so a
  future session cannot re-invert it and block a standard change on converter
  cost." It was re-inverted anyway, in the LEDGER and in this prompt, and I
  repeated it from there without checking. **Read the seed doc before writing
  anything about Spec 39's status.**
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
