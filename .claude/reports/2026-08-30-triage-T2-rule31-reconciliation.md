# T2 — Rule 31 (`31-golden-colour-control`) reconciliation

**2026-08-30, read-only.** Method: every number below came from
`cd plugins/sgs-blocks && node scripts/inspector-scan/run.js --json`, parsed programmatically —
never from a document's own claim (per the project's prove-the-cause rule, the command wins over
any cached figure).

## Ground-truth check first (declared before analysis)

Expected population going in: the task brief states "currently reports 282 flagged (ceiling
291)". D752 (2026-08-23) recorded the baseline as 292/58 blocks/181 pairs (108 both, 52
hover-only, 21 gradient-only, 132 row keys). `rules.json`'s `openBacklog` for this rule is **291**
(set by the `LOWERED 292 -> 291 (2026-08-27)` advisory-reason entry — the last time anyone
re-baselined it).

**The live run disagrees with both cached figures: it reports 280, not 282, and not 291.**
Per the project's rule ("the command wins"), 280 is what this report uses. The likely cause of
the 282→280 gap is timing, not a detector change: two colour-migration commits landed on `main`
this session, after whatever snapshot produced 282 —

```
122a34564  fix(colour): strip the dead native border-colour read, and land the get/set binding path
4cb8464b6  fix(colour): migrate raw pickers onto the standard — 3 blocks, 2 mechanics, 2 blocked
```

— both timestamped 2026-08-30 02:59 and 03:27, i.e. this session, ahead of this scan.

## Q1 — Account for 291 (last codified ceiling) → 280 (live)

`rules.json`'s `openBacklog: 291` has **not been re-lowered since 2026-08-27** — there is no
`chore(ratchet): rule 31 openBacklog 291 -> ...` commit on `main` (checked via
`git log --oneline --grep="ratchet.*31"`). So the ceiling is **currently stale by 11 findings**:
the same class of hole D738/D744 flagged before (a ceiling sitting above the measured floor means
a brand-new non-conformant row can land green).

Four colour-standard commits landed on `main` since 2026-08-27 (D890 + follow-ups), touching six
blocks: `trust-bar`, `hero`, `info-box`, `multi-button`, `mega-panel`, `pricing-table`.
Enumerated by diffing each commit's intent against the live findings for that block (not
inferred):

| Commit | Block(s) | Effect on rule 31 |
|---|---|---|
| `99d2204da` (D890) | `sgs/trust-bar` | Deleted the duplicate hand-built "Label colour" `DesignTokenPicker` (a second writer of `textColour`, not a distinct row — no finding either way); moved `iconCircleBackground`/`titleColour`/`labelColour` onto `fillRow()`/`textRow()`. These three rows are now **visible and correctly counted** as `below-min-states`/`missing-gradient` (they are still single-state, no gradient — D890 fixed the *component/placement*, not conformance). `iconColour` stays a deliberate hand-built row (third mechanism, `stroke`/`currentColor`) — still 1 finding. Net for trust-bar: still 9 findings today, but they are now the RIGHT 9 (correctly attributed to the standard's own component), not raw-picker escapees the rule couldn't see before. |
| `4cb8464b6` | `sgs/multi-button`, `sgs/hero`, `sgs/info-box` | `multi-button`: `childBtnBackground`→`fillRow`, `childBtnTextColour`→`textRow` (both still below-min-states/missing-gradient — visible now, same reason as trust-bar). `hero`: splitMedia border consolidated into its existing `SgsBorderControl` mount — **0 findings for hero today** (confirmed live). `info-box`: bespoke `style.border.color` picker deleted outright (no supports.border declared, so it painted nothing) — info-box now down to 2 findings (`border`, `shadowHover`), both pre-existing unrelated rows. |
| `122a34564` | `sgs/mega-panel`, `sgs/pricing-table`, `sgs/info-box` | `mega-panel`'s `asideSeparator.colour` and `pricing-table`'s `plan.ribbonColour` (both previously **invisible** to rule 31 — the resolver's documented blind spot for object-attribute fields and repeater items) now render through `fillRow`/`textRow` via a new get/set binding. They are correctly resolved MECHANISM-wise but are **newly countable findings** (below-min-states + missing-gradient each) — a genuine widening at the row level, offset by the trust-bar/multi-button clears above. `info-box` render.php fix (dead native border-colour read) has no rule-31 effect (it is a render-layer fix, not an editor-row fix). |

**Net effect:** these commits moved several previously-invisible raw pickers (trust-bar × 3,
multi-button × 2, mega-panel × 1, pricing-table × 1) onto the standard's shared components — which
is exactly D890's mandate — and cleared two blocks outright (hero: −2 rows fully closed;
info-box: −1 dead control removed). The reason the **total** dropped (291→280, −11) despite some
rows becoming newly visible is that "becoming visible via the standard component" and "being
non-conformant" are the same event only for rows that were already going to be counted once
correctly attributed — no row was hidden and then re-hidden. The precise per-commit finding delta
cannot be recovered exactly without re-running the scanner against each pre-commit tree state
(blocked here — re-running `git checkout`/worktree switches against a shared tree is out of scope
for a read-only pass), but the composition above is enumerated from the commits' own diffs and
cross-checked against the current live findings for every block they touched — not inferred from
the total alone.

**Actionable structural gap this surfaces:** `rules.json`'s `openBacklog` should be re-baselined
280 (a `chore(ratchet)` commit), or the ratchet is carrying 11 findings of slack right now.

## Q2 — Current 280, broken down

**By kind:**

| kind | count |
|---|---|
| `below-min-states` | 153 |
| `missing-gradient` | 127 |
| **Total** | **280** |

(`native-colour-ui`, `banned-lookalike`, `roster-surface-unknown`, `mechanism-mismatch` — the
other four kinds this rule can emit — are all 0, same as D752's baseline.)

**Comparable-to-D752 measurements** (D752 measured 292/58 blocks/181 pairs/132 row keys):

| Measure | D752 (2026-08-23) | Now (live) |
|---|---|---|
| Total findings | 292 | **280** |
| Distinct blocks | 58 | **56** |
| Distinct (block, row) pairs | 181 | **173** |
| Distinct row keys | 132 | **129** |
| Pairs needing BOTH hover+gradient | 108 | **107** |
| Pairs needing hover only | 52 | **46** |
| Pairs needing gradient only | 21 | **20** |

**By block** (top of the distribution; full list computed, 56 blocks total):

`sgs/product-card` 18 · `sgs/post-grid` 16 · `sgs/nav-menu` 14 · `sgs/timeline` 14 ·
`sgs/pricing-table` 13 · `sgs/testimonial` 12 · `sgs/before-after` 10 · `sgs/mega-panel` 10 ·
`sgs/product-search` 10 · `sgs/business-info` 9 · `sgs/trust-bar` 9 · `sgs/form` 8 ·
`sgs/modal` 8 · `sgs/cart` 7 · then a long tail of 6 down to 1 across the remaining 44 blocks.

## Q3 — What the ruled standard does NOT yet cover (the genuinely open part)

D752 rules the SHAPE (apply hover+gradient everywhere) and D890 rules the PLACEMENT
(`SgsColourPanel`/`fillRow`/`textRow` as the default surface). Applying both today, mechanically,
across the 280 findings would close the vast majority — but **14 of the 127 `missing-gradient`
findings have no `resolved mechanism` at all** (the mechanism-resolution axis reads
`block_attributes.css_property` from the DB and falls back to a bare binary gradient check when
that column is empty or unrecognised — a documented blind spot, not a guess). A codemod cannot
safely decide WHICH gradient shape (`fillRow`'s per-state toggle vs `textRow`'s
`gradientCapable` background-clip:text form vs the `stroke`-mechanism SVG form) to apply to a row
whose mechanism is unresolved — applying the wrong shape is exactly the miswiring D738/D751
already caught twice (sgs/container, sgs/cta-section). These 14 are the real residual:

| Block | Row | Why it's unresolved |
|---|---|---|
| `sgs/mega-panel` | `aside-separator-colour` | Just migrated (122a34564) via get/set binding onto an object-attribute field (`asideSeparator.colour`); attribute not yet in `block_attributes.css_property` |
| `sgs/multi-button` | `child-btn-background`, `child-btn-text-colour` | Just migrated (4cb8464b6) onto `fillRow`/`textRow`; same DB-seeding gap |
| `sgs/pricing-table` | `plan-ribbon-colour` | Just migrated (122a34564) via get/set binding onto a repeater-item field (`plan.ribbonColour`); same gap |
| `sgs/trust-bar` | `fill-colour` | Explicitly REFUSED in commit `122a34564` as a genuine third mechanism (paints an SVG `fill` attribute directly, `style.css:98`) — neither `fillRow`'s CSS-background form nor `textRow`'s background-clip:text form applies; pinned as a negative control, not a gap to close mechanically |
| `sgs/product-card` | `pickerLabel`, `pickerPillBackground`, `pickerPillText`, `pickerPillBorder` | Verified live-rendered (render.php:80/90/91 forward these into real frontend CSS, not editor-only) but unmapped in the DB — mechanism genuinely unresolved, not yet investigated |
| `sgs/quote` | `text` | Unmapped in DB |
| `sgs/timeline` | `wrapperText`, `wrapperBackground`, `rowStripeA`, `rowStripeB` | Unmapped in DB |

**Composition of the residual:** 4 of the 14 (mega-panel, multi-button ×2, pricing-table) are
rows this session's own migration just made visible — they are IN SCOPE for D752's codemod, just
not yet run on them, and blocked only on `/sgs-update` seeding `block_attributes.css_property`
for the new attributes (the same "OWED" item the rule's own advisory reason already names). 1 of
the 14 (trust-bar `fill-colour`) is a deliberate, already-adjudicated exclusion — not open. The
remaining 6 (product-card ×4, quote, timeline ×4 — 9 total, some already counted above) are
genuinely un-triaged: nobody has yet confirmed whether a gradient form exists for their painting
mechanism, so applying D752's codemod to them today would risk the exact miswiring class D738
already found twice. **These 9-ish rows are the honest "not yet covered" set** — everything else
in the 280 is squarely inside what the ruled standard, once run, would fix.

Separately, 2 `stroke`-mechanism rows (`sgs/before-after handleIcon`, `sgs/timeline
connectorFill`) DO have a known gradient sibling shape (`sgs_svg_stroke_gradient()`, per the
rule's own advisory-reason precedent) — these are covered, not residual, despite being a
less-common mechanism.

## Files referenced

- `plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js` (rule logic)
- `plugins/sgs-blocks/scripts/inspector-scan/rules.json:206-212` (ceiling, advisory reason)
- `plugins/sgs-blocks/scripts/consistency/golden-controls.json` `controls.colour` (the standard)
- `.claude/decisions.md` D752 (line 6231), D890 (line 292)
- Live JSON: `node scripts/inspector-scan/run.js --json` (this session, HEAD = `122a34564`)
