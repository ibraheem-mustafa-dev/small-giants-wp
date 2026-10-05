---
title: "Eye Care: the register-proven framework repairs (parallel track)"
project: small-giants-wp
created: 2026-10-05
status: not started
governs: a track that runs beside Session C, never inside it
references:
  - .claude/plans/2026-10-02-eye-care-fix-register.md
  - .claude/plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md
  - .claude/plans/2026-10-05-eye-care-session-c2-finding-assessment.md
---

# Eye Care: the register-proven framework repairs (parallel track)

**Goal:** every fix the register has already investigated, whose cause is written down in code terms and whose fix
is already decided, is built and verified on the canary. No investigation, no judgement calls, no waiting on Bean.

**Why this track exists.** Session C repairs the measuring route and touches only `scripts/`. Session C2 then judges
the walker's findings, which is where investigation and Bean's approval belong. The items below need neither: the
register already names the cause in the code and states the fix, so they can be built while Session C runs. Same
shape as the Google reviews track beside Session B.

## Why these items and not others

The register was read end to end. An item qualifies only when **all four** hold:

1. Its remaining work is **framework code**, not a page-tree value. A tree value needs a Solve run, which is
   Session D, and the trees are the route's write target.
2. The register states the **cause in code terms**: a named file, selector, function or attribute, or a measured
   value. A symptom is not a cause.
3. The register states **the fix**, specifically enough to act on.
4. It is **outstanding**. Where a row carries a "Framework done" note, the outstanding part is its `Open:` clause,
   and that clause must itself be framework code.

**48 further register items were examined and left out** because the cause is not stated in code terms, so they
need investigating first. They are not dropped: they belong to Session C2, which investigates, or to Session D,
which writes tree values. The list is in "What was left out, and why" below.

## The work

Each item cites the register id. **The register's fix stands**: this track implements the decided fix, and does not
redesign it. If an item's cause turns out to be wrong, stop, record what you found against that register row, and
move on; do not invent a replacement fix.

### Verified in the code before this plan was written

For these five the cause was re-checked against the source, and the citation below is the result, not the
register's claim.

| id | The defect | The cause, verified | The decided fix |
|---|---|---|---|
| **S1** | No button anywhere takes the site's 0.25s hover timing; About's "Shop the range" transitions over 0.3s | `button/render.php` unconditionally emits `.{uid}.sgs-button{transition:all {$transition_duration}ms …}`, and `button/block.json::attributes.transitionDuration` has `"default": 300`. The site value lives at `theme-snapshot.json` `settings.custom.buttonPresets.default.hover-transition` = `0.25s`, which WordPress renders as a custom property, so the per-instance rule always wins | Write the per-instance transition **only when the button sets its own timing**, otherwise read the preset. ⚠️ **A `300` default makes "unset" and "deliberately 300" indistinguishable**, so the default has to change to a value meaning *inherit*. That is a default change: the framework is pre-production, so choose on merit and record the choice in the commit |
| **N46** | A footer row given a width cap collapses to zero content width and every column squeezes | `maxWidth` on `sgs/site-footer-row` gives the row auto side margins that cancel its stretch. **The precedent is exact**: `acc2a3b6d` fixed the header by adding `:where(<root> > *){width:100%;}` inside `includes/sgs-header-rows-align-css.php::sgs_header_rows_align_css`, with the comment that "a row with a width cap carries centring auto margins" and must "be given full width explicitly" | Give footer rows the same full-width rule. Read that helper and its standalone test (`tests/php/run-header-rows-align-standalone.php`) first: the footer needs the same rule, not the same function |
| **38** | The hours day labels are bold and the block's weight setting does not reach them | `business-info/style.css` declares `font-weight: 600` on `.sgs-business-hours__day` as a literal, with no custom property, so nothing can override it | The day label follows the block's weight setting, or gets its own setting. **Also fixes register 130** |
| **N11(b)** | A normal second pair cannot be added to the bag | `includes/class-cart-proxy.php::COOLDOWN_SECONDS = 30`, applied as a per-fingerprint cooldown (`sha1(IP|cart_token)`) | No cooldown for an item already in the bag, plus clearer wording. Leave the global per-variation rate limit alone: it is a different guard |
| **15** | The drawer's bottom group sits below the fold | `nav-drawer/style.css` gives the body `min-height: 100%` ("lets a short menu still fill the screen") while the title row above it is `min-height: 64px`, so the body ends 64px below the screen | Make the drawer a column and let the body fill only the space left. The "More" list's gap and line height are tree values: record them, do not write them |

### Register-stated, locate the rule first

The register names a mechanism for each of these, but the exact rule was not located while writing this plan. **The
first task on each is a two-minute locate**, and if the cause is not where the register says, that item stops and is
recorded rather than guessed.

| id | The defect | The cause the register states | The decided fix |
|---|---|---|---|
| **S12** | A clicked card or link stays underlined | "The theme draws an underline on any focused link, which beats each block's 'no underline'." ⚠️ `theme/sgs-theme/assets/css/utilities.css` already uses `:focus-visible` for its underline utilities, and `core-blocks.css` carries a "focus underline rather than recolour" comment. **So this may be partly done**: find the rule that fires on mouse focus before changing anything | Show it only for keyboard focus, on text links. The keyboard focus ring stays |
| **N3 + 17B** | The bag count sits too low in its circle | "The bag-count rule inherits a 2px nudge meant for the icon-only badge." Not located: it is not in `cart-trigger/style.css` under an obvious name | Reset it so the circle centres on the text line |
| **N17b** | The hero text sits in the middle when the layout asks for bottom | "The vertical position setting writes to the wrong axis, and a hardcoded 'centre' overrides it." Two separate defects, so expect two fixes | Repair both. The layout file already asks for bottom, so no tree change |
| **68** | The colour tiles are 8px taller than the draft | "the tile's top padding… is meant only for text-only tiles" | Remove the tile's top padding whenever the tile shows a photo or a colour block |
| **N25** | The shop's filter panel breaks after choosing then clearing a filter | "WooCommerce redraws the filters and leaves the shop's own group wrappers behind as empty shells." | Clear the empty shells before each rebuild. **The register supplies the test**: choose a filter, then clear it, and the group count must equal the heading count |

### Check whether these are already done (5 minutes, before anything else)

Both read as complete but carry no "done" note, and a wasted fix here is worse than none: re-fixing something that
already works leaves two overlapping fixes and neither can ever be safely removed
(`~/.claude/rules/prove-the-cause-before-fix.md`).

| id | Why it may be done | What settles it |
|---|---|---|
| **76** | The colour tile lift "snaps" because the lift is missing from the tile's transition list. Its Sweep column says **closed earlier**, and S1's note records that the colour tiles' transitions now take the 0.25s timing | Read the tile's `transition` list in the source for `transform` |
| **87** | The breadcrumb trail ends at the brand, wrongly marked as the current page and forced bold. Its Sweep column says **clean on the walker** | Read the breadcrumb render for the current-item marker and the weight |

## Hard boundaries

This track shares a worktree and a test site with Session C. These are not style preferences.

| Never | Why |
|---|---|
| **Never touch `scripts/computed-route/` or `scripts/parity/`** | Session C owns every file in both, across nine lanes. This track's files are `plugins/sgs-blocks/` and `theme/sgs-theme/` only |
| **Never write a page tree** (`sites/eye-care-ward-end/build/*.tree.json`) | The trees are the route's write target and Session D's work. Where an item's remainder is a tree value, build the framework half and **record the value needed** against its register row |
| **Never add a `divergences.json` entry** | The ledger is Solve's write target, so a wrongly added entry freezes a wrong value permanently and turns no check red |
| **Never deploy to eye-care-test, and never reseed, until Session C's Wave 3 sweep has run** | See below. This is the one that will bite |
| **Never touch `sgs/google-reviews`** | Another track owns it. Its colours and sizes follow Google's own interface, which is an accepted difference and never a gap |

### The deploy and reseed rule, and why

Session C's entire output is a framework-gap count measured on the repaired route, against the 2026-10-05 baseline
taken at block code `4726700c1`. **If block code changes under it, that count moves for reasons that have nothing
to do with the route, and the measurement Session C exists to produce is worthless.** A reseed is worse: Session C's
resolver and calibration lanes read the framework database, and `/sgs-update` rebuilds it.

So this track:

1. Builds, runs the gates, and verifies **on sandybrown**, the canary. That is the designated place for this.
2. Commits to `main` with an explicit pathspec, as normal. Committing is safe; deploying to the measured site is not.
3. **Hands its reseed and its eye-care-test deploy to Session C's Wave 3**, which already runs exactly one of each,
   or runs them itself after Session C's Gate 3 has passed. Message the other session either way.

**If sandybrown will not deploy**, it is the known blocker, not this track: `build-deploy.py --target sandybrown`
aborts on its oldshape audit over 155 old-shape `sgs/cta-section` blocks on the Spec 47 calibration page (post
4750). Migrate with `scripts/wp-migrate-oldshape-blocks.js`, or empty the page, since calibration replaces it with
an empty tree at the end of each run anyway. Session C's C0.2 does the same job: whoever gets there first does it,
and the other checks whether it is already cleared. **Never `--skip-oldshape-audit`.**

## Where this track meets the other two

| Overlap | How it is handled |
|---|---|
| `sgs/business-info` | This track takes item 38's day-label weight. Session C2 has a separate finding on the same block, the hours row gap, which Session B confirmed as a real gap. C2 runs after this track, so it inherits the weight fix. No concurrent edit |
| `sgs/button` | S1's timing repair is this track's. Any button finding on C2's list is judged against the repaired code, not today's |
| The F count | Every fix here closes rows the walker was reporting. Session C's C3.8 count is measured **before** this track deploys, so C2's input is a count taken on unfixed block code. **C2's step 1 must re-measure after this track deploys**, or it will re-judge rows that are already fixed. Recorded in C2's plan |

## Gates

```
GATE P1: each item is built on its proven cause
AFTER: each item, one at a time
PASS: the cause was located in the source and cited file::symbol before the fix;
      where a new setting was added, it has an inspector control, a style.css or render.php reader IN THE SAME
      COMMIT, and calibrate.mjs plans an instance for it;
      node plugins/sgs-blocks/scripts/check-dead-controls.js passes;
      node plugins/sgs-blocks/scripts/audit-inline-styling.js --check exits 0 (Spec 32);
      a default that changed is named in the commit message with what it changes for other clients
FAIL: the cause was not where the register said. Stop that item, record what you found against its register row,
      move on. Never substitute a fix of your own
TYPE: auto-gate
```

```
GATE P2: the canary is unharmed
AFTER: all items, before any commit of the batch
PASS: python plugins/sgs-blocks/scripts/run-gates.py --tier full passes;
      python plugins/sgs-blocks/scripts/check-wiring-fingerprint.py --check passes with no new blocking gaps;
      python scripts/check-no-client-names.py --check passes;
      sandybrown's motion-QA fixture pages (2103, 2109, 2113, 2603, 2740, 3037) show no unintended computed-style
      change at 375/768/1440 against a before-capture;
      each repaired behaviour checked in a real browser on the real front end AND the real editor, because a green
      build proves neither
FAIL: a change alters something the register did not ask for. Scope it per block rather than widening a default
TYPE: review-gate
```

```
GATE P3: the register is current
AFTER: the batch
PASS: every item built has its register row updated to say so, with the commit hash, in the row's own words;
      every item stopped has what was found recorded in its row;
      every tree value discovered but not written is recorded against its row for Session D;
      the register's own content is otherwise untouched
TYPE: auto-gate
```

## What was left out, and why

Nothing here is dropped; each has an owner.

| Left out | Count | Why, and where it goes |
|---|---|---|
| Register items whose cause is **not stated in code terms** | 48 | They need investigating before anything is built, which is Session C2's step 2 (fact-check with a cited `file::symbol`) and step 3 (live test) |
| Items whose remaining work is a **tree or content value** | S3, S5, S11, N45 and the tree halves of items above | Session D, per `plans/2026-10-04-spec47-full-coverage.md` "Progress". Record the value, never write it |
| Items needing a **new setting plus a design decision** | N4 top bar drop-and-scroll, N5 mega panel width-limit mode, N5.5 mega items link-plus-button, 53 hero drift mode, 65B shop single column below 400px, 75/82/158 gallery and the WooCommerce product gallery | A second sitting of this track, or C2's list. Each is register-decided, so none needs Bean again, but each is larger than the items above and adds editor UI |
| `sgs/google-reviews` | all of it | the parallel Google reviews track |
| The Spec 47 route and its unbuilt parts | all of it | Session C |

**The six "new setting plus design decision" items are the obvious second sitting**, in that order: N5.5 and 65B are
the most contained, 53 and N4 add motion settings that need a reduced-motion path, and 75/82/158 crosses into
WooCommerce data.

## Effort

Headline figures are the optimistic ones. Every item is first-attempt.

| Unit | Headline | Band |
|---|---|---|
| The two "already done?" checks | 5 min | Micro |
| S1 button timing (incl. the default change) | 15 min | Quick |
| N46 footer row full width (precedent in hand) | 10 min | Quick |
| 38 hours day weight | 10 min | Quick |
| N11(b) cooldown | 10 min | Quick |
| 15 drawer body height | 15 min | Quick |
| The five locate-first items | 50 min | Session |
| Gate P2, including the canary before-and-after | 25 min | Block |
| Gate P3, register update | 10 min | Quick |

**About 2 h 30 in total**, and it is parallelisable by block if dispatched as subagents, since no two items above
share a file. The critical path is the locate-first group.

## First action (under 5 minutes, no dependencies)

Settle item 76 by reading the colour tile's transition list for `transform`, and item 87 by reading the breadcrumb
render for its current-item marker. Both are read-only greps and both may remove themselves from the list.
