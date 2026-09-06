---
doc_type: prompt
title: Colour conformance — group by paint target, one POC per group
created: 2026-09-06
updated: 2026-09-06 (later session) — corrected two recurring misreadings
  from the original version below (see "Corrections" section) and closed
  the ICON/SVG surface's rollout scope down to its real remaining work
  after ground-truth verification. Original body preserved below the
  corrections, only the stale counts/claims it made are struck through
  and corrected inline — per this project's D101 carry-forward rule,
  history is superseded-and-appended, not deleted.
governs: plugins/sgs-blocks/scripts/colour-codemod/
supersedes: 2026-09-06-colour-conformance-end-shape-method.md (consumed the
  night this doc was first written — svg-paint-gradient CLOSED at the time,
  classifier hardened, deleted in the same commit as this file)
retention: delete once consumed
---

# Session start: colour conformance, paint-target grouping

Read `CLAUDE.md` in full, then this prompt in full, before touching any code.

## Corrections (read first — these are standing rules now, not one-off notes)

1. **The four paint SURFACES are FILL / TEXT / BORDER / ICON.** Everything
   named below with a hyphenated key (`fill-custom-property-gradient`,
   `fill-base-hover-flat`, `text-gradient`, `text-gradient-needs-bg-layer`,
   `border-base-hover`, `svg-paint-gradient`, `per-item-loop`) is a
   `classify-end-shape.js` shape-key **inside** one of those four surfaces —
   a detection/mechanism label, not a peer surface. Do not present a
   shape-key as if it were a fifth or sixth surface alongside BORDER/ICON;
   group session scoping by the four real surfaces, sub-group by shape-key
   within one.

2. **A classifier "gap" is a hypothesis, not a fact — read the actual
   render.php before treating it as real work.** Worked example: this
   session's `svg-paint-gradient` census still shows 1 open row
   (`social-icons.iconGlyphColourHover`, gap: `hover-state`). Reading the
   actual code shows hover is fully wired — a flat custom-property route
   AND a `sgs_svg_stroke_gradient()` gradient route, both touch-guarded,
   untouched by any recent commit. The classifier can't detect hover
   coverage delivered via a separately-scoped rule rather than a same-call
   hover sibling. This is at least the second time this exact row has
   false-positived (the original version of this doc, below, already
   claimed it was fixed as a "state-counting false positive" — it wasn't;
   the census still shows it open). Don't spend a session "investigating a
   regression" here again — the row is not a functional bug, it never was.

3. **Any fix touching more than 3 blocks or call sites goes through
   `.claude/THE-MIGRATION-METHOD.md` — build the codemod, don't hand-edit
   render.php files one at a time.** Worked example, the same night this
   correction was written: the fix that migrated `cart`, `accordion-item`,
   and `before-after` onto `sgs_icon_gradient_css()` was a hand-edit that
   only touched each block's *hover* state — base state was left on the old
   `sgs_svg_stroke_gradient()` call in all three, undetected until the next
   session's fresh survey. A codemod run in one pass treats base+hover as
   one shape and cannot silently do half the job on 3 separate files. This
   mirrors D542 (`.claude/plans/phase-colour-conformance.md` S-5, S-8) —
   this doc's own methodology was inconsistent with that decision until now.

4. **ICON/SVG surface — corrected scope after ground-truth verification**
   (supersedes the "Not yet rolled out" list below): of the ~10 blocks
   named as pending `sgs_icon_gradient_css()` adoption, only **icon-list**
   and **notice-banner** have a real functional bug (all 4 `IconPicker`
   sources selectable including dashicon/emoji, and their render.php
   genuinely renders `<span>` markup that the old SVG-targeted call can't
   paint). The rest are either lucide/wp-icon-only in practice (no
   functional bug, a swap is pure convention) or have no selectable icon
   source at all:
   - **Real bug, fix first:** `icon-list`, `notice-banner`.
   - **Lucide-only, hover already migrated, base still stale (last night's
     hand-edit gap — see Correction 3):** `cart`, `accordion-item`,
     `before-after`.
   - **Lucide-only or fixed-glyph, no functional bug, convention swap
     only:** `social-icons` (both states still old — do this one per Bean's
     direction, to match the shared convention), `trust-bar`, `button`,
     `business-info`.
   - **No `iconSource` concept at all — correct mechanism already, do not
     touch:** `google-reviews`, `star-rating` (fixed inline SVG shape-fill,
     not an icon-source case).
   - **Known gap, not a fix target:** `social-icons`'s `custom` (uploaded
     image) icon platform renders as `<img>` — neither the old nor new
     mechanism can paint it, base or hover. Record, don't attempt.

## The method (original, still correct)

Group the remaining rows by what they paint — background, text, icon,
border — not by block. Each group already has a proven shared helper (or a
close variant of one). Fix one row per group by hand, confirm the pattern,
then either run a codemod (mandatory past 3 blocks/call-sites — Correction
3) or hand-fix the rest if the group is genuinely 1-3 rows. Do not build a
new mechanism before checking whether one already exists for that paint
target: `plugins/sgs-blocks/CLAUDE.md`'s "Colour EMISSION helpers" and
"Known precedent-function registry" sections list every one built so far.

## Trust the classifier now, but verify its output before acting on it

`classify-end-shape.js` had four real bugs fixed the night this doc was
first written — a bound-variable indirection miss (twice), a per-item-loop
check with no causal scoping, and a complete blind spot for cross-block
Block Context delegation. All four are fixed and pushed. The tool is
reliable for the first time — but "reliable" means "correctly reports what
the code does," not "immune to a fifth undiscovered bug." **See Correction
2**: the social-icons hover row is very likely exactly that fifth bug,
still unfixed as of this update. Read the actual render.php before trusting
any row's classification.

Re-run the census fresh — do not reuse any counts in this doc, which are a
snapshot the moment it was written:

```
cd plugins/sgs-blocks/scripts/colour-codemod
node classify-end-shape.js
node classify-end-shape.js --list <shape-key>
node classify-end-shape.js --json
```

## Groups still open, ranked by expected ease (counts are a snapshot — re-run)

**1. FILL surface — `fill-custom-property-gradient` (~36 rows) — codemod
already hardened, ready to run at scope.**
`migrate-fill-custom-property-gradient.js` had two detector bugs fixed the
night this doc was written (missing-fallback-default regex, a
`DesignTokenPicker` row-shape it couldn't see). ⚠ Its hardcoded
`TARGET_ROWS` list currently only covers 7 of the ~36 rows in this
shape-key — it needs its scope widened before it can close the category,
not just re-run as-is. Also: `business-info.linkHoverBackgroundImage` was
renamed to `attributionHoverColour`/`attributionHoverColourFallback` on
2026-09-05 (D643) — that `TARGET_ROWS` entry is now stale and will silently
refuse rather than fix; update or drop it before relying on the negative
control it was meant to prove.

**2. FILL surface — `fill-base-hover-flat` (~21 rows) —
`sgs_fill_decls()`/`sgs_fill_states_css()`, an established, uniform
pattern.** Pick one row, confirm the helper call matches its real selector
and DOM, then batch the rest via codemod once past 3 blocks (Correction 3).

**3. TEXT surface — `text-gradient` (~33 rows).** Many already have the
full `sgs_resolve_text_colour_or_gradient()` trio and need only a hover
state (the `[gap: hover-state]` rows) — the exact shape already proven on
`accordion`/`cart`/`before-after`'s text rows, copy that pattern directly.
The rest genuinely need the trio built from scratch —
`breadcrumbs.currentColour` is a worked POC already on `main`.

**4. TEXT surface — `text-gradient-needs-bg-layer` (~25 rows) — the
precondition helper already exists, this is not a from-scratch design
problem.** `sgs_block_background_layer_css()` moves a background to its own
`::after` layer so `background-clip:text` doesn't also clip it. Confirm no
block already uses `::before`/`::after` for something else at the same
layer before applying it (`sgs_border_gradient_css()` claims `::before` on
many blocks — that's the one documented collision risk, and it's exactly
why the background-layer helper uses `::after` instead).

**5. BORDER surface — `border-base-hover` (15 rows) —
`sgs_border_states_css()`, watch for `::before` collisions.** A gradient
border uses a masked `::before` ring construct. Any block that already owns
`::before` for something else needs that checked first. Single mechanism,
fully self-contained — a good standalone session unit.

**6. ICON surface — `svg-paint-gradient` — see Correction 4 for the
corrected scope.** Real bug: `icon-list`, `notice-banner` (2 blocks, full
branching composer needed — mirror `sgs/icon`'s POC). Consistency-only
swaps: `cart`/`accordion-item`/`before-after` base state,
`social-icons` both states, `trust-bar`, `button`, `business-info` — 7
blocks, mechanical `sgs_icon_gradient_css('lucide', ...)` swap. Combined
that's 9 blocks/call-sites — build the codemod (Correction 3), do not
hand-edit them one at a time as happened the first time.

**7. `per-item-loop` — check current count, was 2 rows
(`gallery.captionBgColour`, `trust-bar.badgeImageShadowColour`), may now be
0 — too small for a codemod either way, just fix by hand if any remain.

## Exceptions

A row that doesn't fit its group's shared helper cleanly gets its own
variant, found the same way `sgs_icon_gradient_css()` was found: read what
the row actually does, don't force it into the group's default shape.
Expect this for: an attribute with three real states instead of two (base +
hover + something else), an attribute whose gradient sibling maps to a
different mechanism than its own base attribute (check the DB `css_property`
of BOTH the base and the `Gradient` sibling, not just one), or a block whose
markup genuinely has no element for the mechanism to target. Confirm with a
direct DB query or a direct read of render.php before designing the
exception — never from the row's name alone, though a name mismatch (a
"fill" attribute needing a text mechanism, an "icon" attribute needing the
text-gradient trio) is a strong first signal something is wrong.

## Standing rules (carried forward, still true)

- Path-scoped commits only; re-check `git branch --show-current` immediately
  before every commit.
- Push after every commit, not in a batch — this tree runs 150+ concurrent
  sessions. If the local checkout is dirty from another session's live edits,
  push via a throwaway `git worktree add ../<name> origin/main`, cherry-pick,
  resolve any real conflicts (a whitespace-only conflict from an unrelated
  alignment group is safe to take either side of), push, then
  `git worktree remove --force`. Junction the worktree's
  `plugins/sgs-blocks/node_modules` to the main checkout's before running any
  gate there (`New-Item -ItemType Junction`) — a fresh worktree has none, and
  the inspector-scan gate fails closed without it.
- A gate blocked by genuinely unrelated concurrent-session debt needs BOTH
  bypasses together: `[gates-ok:<reason>]` in the commit message AND
  `SGS_F5_SKIP=<script> SGS_F5_SKIP_REASON="..."` as an env var on the SAME
  commit invocation — one alone does not satisfy the other. Verify the
  finding truly doesn't mention your files (`grep` the `--report` output)
  before bypassing either.
- After any block.json change: `python scripts/sgs-update-v2.py --stage 1`
  then `python scripts/generate-attr-role-map.py`.
- Never force a row into a shape it doesn't cleanly match. Refuse with a
  named reason and go find the real model instead.
- **New (Correction 3): more than 3 blocks/call-sites in scope means build
  the codemod first, per `.claude/THE-MIGRATION-METHOD.md`. Do not dispatch
  per-block hand-edits or subagents to hand-edit render.php files past that
  threshold — that's exactly the failure mode that left 3 blocks half-fixed
  the first time this surface was touched.**

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | First — every session |
| `/dispatching-parallel-agents` | Once 2+ rows have confirmed, distinct, disjoint-file fixes ready **and the fix genuinely doesn't cross the 3-block codemod threshold** |
| `/adversarial-council` | Before widening any codemod's scope back toward a universal auto-fix classifier |
| `/handoff` | Session close |
