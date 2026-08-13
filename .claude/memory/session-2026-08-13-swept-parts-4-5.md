# LEDGER narrative swept 2026-08-13 (parts 4-5)

Removed from LEDGER.md to stay under the 24,576-byte cap enforced by
handoff-preflight.py. Part 5 was already marked "superseded by part 6";
part 4 is the earlier editor-preview thread, closed out by part 7.

**2026-08-13 (earlier session, part 5, condensed — superseded by part 6 above).** Validated the
part-4 database fix wasn't a one-off patch job: found the classifier had a systemic blind spot
(a motion-marker it wasn't reading), fixed 3 more instances the same bug caused, then built the
permanent classifier fix so the whole category self-corrects going forward. Commits
`3267384f`–`12007c67`, decision D610 (full narrative there).

**2026-08-13 (latest session, part 4 — new thread). Continued the "does the editor preview match
what the client actually gets" checker (the tool the hero work surfaced). Cleaned up a known blind
spot, fixed 13 wrong entries in the framework's internal database, then had 3 reviewers read every
one of the 143 remaining findings by hand.** Commit `9d827d63`, decisions D603–D606.

- **The checker missed cases where a setting only affects something through a shared helper file**
  (e.g. a form field's machine name, or a hover-transition timing value) rather than directly. Only
  9 of 152 findings were this shape — not worth building a bigger cross-file tracer for, so I
  verified them by hand and documented the limitation directly in the tool instead.
- **Found and fixed 13 wrong labels in the framework's internal settings database** — a toggle that
  emits invisible SEO markup was wrongly tagged as "controls visibility," and a carousel drag-speed
  flag was wrongly tagged as "styling" in 5 blocks (not just the 1 originally flagged).
- **Had 3 people (well, agents) independently read the actual code behind all 143 remaining
  findings** rather than trusting the checker's guess. Result: **70 are real bugs** (settings the
  client can change but never sees change in the editor), 50 are correctly not previewable (things
  like hover effects or scroll animations that genuinely can't show on a still screen), and 23 are
  a different, understood shape (2 blocks that need live data — reviews from Google, live product
  stock — the editor simply doesn't have). Full breakdown:
  `.claude/reports/2026-08-13-editor-render-parity-fresh-triage.md`.
- **Checked whether to build a tool that auto-fixes those 70 bugs** rather than fixing them by
  hand — concluded no: about 20 of the 70 need a missing piece of the editor preview built from
  scratch (a button that doesn't exist yet, a different HTML structure), which a generator can't
  safely do. Fixing the other ~50 by hand is faster than building and testing a generator for a
  one-off batch this size.
- **Found one genuine bug while triaging, not just a missing preview**: on `sgs/hero`, a "match the
  theme's default style" toggle does the OPPOSITE of what it's supposed to in the editor versus
  what actually saves — the editor keeps showing a background/border that the live page correctly
  hides. Flagged as the top-priority item in the 70-bug list.
- **Not done yet, and not started without asking:** actually fixing those 70 bugs is real build
  work across ~25 blocks. See the menu at the end of this session's reply rather than me just
  running ahead with it.


---

# Further LEDGER sweep (part 6 narrative + retained shipped table)

**2026-08-13 (earlier session, part 6, retained). Finished the DB role-classifier
remediation part 4's own "open" items — closed 479 blank labels to 0, then had a
6-persona adversarial council stress-test the two follow-on ideas before building
either.** Commits `b3107413`–`56b41a7e`, decisions D611–D612.

- **The remaining ~469 blank labels closed to zero**, in three permanent, self-fixing
  rules (not hand-patches): one for settings that belong to plain WordPress, not this
  framework (225 of them); one for any yes/no toggle that has no visual effect of its
  own (127); one for a device-specific copy of a setting inheriting its sibling's label
  automatically (6). The rest (121) were genuine one-by-one judgement calls, each
  confirmed by actually reading the relevant code, not guessed from the setting's name.
- **Two ideas for closing the last gaps further were flagged but deliberately NOT
  built** — so I ran a full adversarial council (6 independent reviewers, each trying to
  break the idea from a different angle) on both before deciding. The most important
  thing it found: **assigning either of these settings a more specific label would not
  actually have changed anything on a cloned client site** — the part of the system that
  reads these labels only ever acts on ones marked "this is real content", and both
  ideas were about settings that are decoration or config either way. So both stay
  parked, not because they're risky, but because they wouldn't have moved the needle.
- **What the council DID turn up something real for**: it recommended actually counting
  how many settings feed invisible SEO markup, instead of guessing. Real count was 6, not
  4 — and 2 of those 6 turned out to be mislabelled RIGHT NOW (not just "could be
  automated later"), plus a 3rd one I'd trusted from last session as "definitely SEO-only"
  turned out to also show up as a normal number on the page — meaning a clone of it could
  have silently dropped a visible count. All 3 fixed. Commit `56b41a7e`.
- **A "dead control" I flagged turned out not to be dead.** Delegated a fix for 3
  card-grid filters (show only featured/on-sale/in-stock products) that looked unused —
  turned out they DO work, wired through a helper file my search hadn't checked. Verified
  live on the sandbox site by actually changing product stock/featured status and
  confirming the grid responded correctly, then undid the test changes. No code needed
  changing — my earlier "this is broken" claim was the bug, not the code.


## Shipped earlier session (retained)

| Commit | What |
|---|---|
| `5727825e` | `sgs/media` per-device SVG + **cascade fix for BOTH media families** |
| `b6ccb320` | D595 + Spec 35 D5 amended at source (the cascade rule) |
| `079abbae` | `helpers-tier-media.php` landed WITH its `require_once` (fatal cleared) |
| `f5fdf7e6` | SVG `<style>` finding CLOSED as not-a-vulnerability, on evidence |
| `efa2f0be` | `sgs/container`: 3 stacked background pickers → one `ResponsiveControl` |
| `4fe39e6d` | `sgs/hero`: split media gains per-device TYPE; legacy `splitMedia` deleted |
| `0917bcf3` | `sgs/hero`: background is a ROOT setting — split heroes paint one |
| `89857e39` | `sgs/hero`: second overlay targeting the split MEDIA element |
| `0c270af7` | `sgs/hero`: media panels consolidated, legacy `overlayColour` deleted |
| `b2ffcd40` | D596 |
