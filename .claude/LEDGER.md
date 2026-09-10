---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-09
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**The measurement tool is now trustworthy — twice-checked. You spotted regressions after the
first round of fixes, a council found 4 real ones, all 4 are now fixed too.**

Round 1: last session's parity tool had five real bugs (a dead SVG skip, elements scored twice,
a tag change wiping a whole element's score, a screen-reader element poisoning a text anchor,
and a hardcoded property blocklist). All five fixed and proven with before/after fixtures
(`.claude/plans/phase-measurement-integrity.md`, 13 commits). You then caught a sixth problem —
the tool was counting a native SGS block's own semantic tag choice as a defect, which is
backwards for a "convert, don't mirror" framework. Fixed same day.

**Round 2 (this update): you said you'd seen regressions in areas seemingly unrelated to the
work, and asked for a proper council + root-cause hunt rather than telling me what you'd seen
(to keep the search honest).** 4 parallel reviewers, split by CODE AREA not by hypothesis, found
4 real regressions — each proven with a live fixture, each the same shape you were worried about
("fixed the fixture, not the general case"): a longhand family silently dropping a second real
defect, a text-normalisation bug gluing words together across a block boundary (site-wide blast
radius), a `display:contents` wrapper wrongly flagged as hidden, and a pairing strategy that
mispairs a legitimately reordered product list. The 4th needed your call, not mine — I asked, you
picked "decline rather than guess" over either guessing strategy. All 4 fixed, each with its own
regression-lock fixture. Full detail: D1014 in `decisions.md`.

**What this means for the fresh clone-diff triage report** (`.claude/reports/2026-09-09-fresh-clone-diff-triage.md`,
written before round 2): its specific numbers are now STALE — a fresh spot-check after round 2's
fixes shows STRUCTURE 93%/LAYOUT 75%/PAINT+TYPE 87% (was 94%/79%/82%). The report's ROOT-CAUSE
FINDINGS (trust-bar/testimonial/pill background-transfer bug, the rating-alias lookup, the
text-align spec gap) are still the right leads — the population just shrank slightly because
some previously-scored elements are now correctly DECLINED as ambiguous rather than guessed at.
**Re-run the tool fresh before trusting exact diff counts; the mechanisms found are still real.**

**Nothing in the triage register has been built yet.** The next session's job is still to pick
which fixes to build, starting with the shared-root-cause one (biggest single lever).

## Shipped this session (2026-09-09/10)

1. **Measurement-integrity phase — 13 steps, all committed** (`75d22d92b`..`578e03d2e`,
   `.claude/plans/phase-measurement-integrity.md`). Five proven ruler bugs fixed, each behind a
   self-test fixture that failed before its fix and passes after. Step 7 (tag-tolerant matching)
   needed a genuine rollback + qc-council-corrected re-implementation — see D1013 for the
   detail. The tool now reports four independent dimensions instead of one aggregate.
2. **STRUCTURE dimension corrected to stop scoring tag identity** (`3abb141ea`, Bean-directed).
3. **Fresh clone-pipeline re-run + full root-cause triage, investigation only**
   (`.claude/reports/2026-09-09-fresh-clone-diff-triage.md`, now stale on exact numbers — see
   above). Verified live that all 8 "unmatched" elements were a measurement-window artefact, not
   real content loss. Root-caused 4 real CSS clusters with proposed fix-shapes; nothing built.
4. **4 regressions found and fixed, Bean-directed qc-council + systematic-debugging pass**
   (`82e8be453`, `467d3ba82`, `e26e70232`, `1129f1cb6`) — see D1014 for full technical detail on
   each: longhand-family silent-drop, block-boundary-newline text gluing (site-wide blast
   radius), `display:contents` misclassified as hidden, and ambiguous-pairing now DECLINES
   rather than guessing (a genuine tradeoff Bean resolved directly). Each fix has its own
   live-fixture regression lock in `--self-test`.

See D1013 and D1014 in `decisions.md` for full technical detail.

**Nav-drawer track (concurrent, same window):**

5. **Spec 36 repaired + citation sweep** (`cd0fcb663`). Six present-but-uncheckable items fixed
   (an undefined acceptance test, a TBD inside a signed gate, "Bean's eye" given a pre-check
   rubric, a binding clause 600 lines from its FR, an inverted dependency claim, uneven FR
   maturity). All 40 code citations converted to symbol form; EIGHT were stale. D1011 (non-modal
   drawer approved) + D1012 (the `.show()` branch is unreachable dead code) recorded.
6. **Five nav/footer fixes shipped, then FIVE regressions found in them by a 3-rater qc-council
   and fixed** (`2bdcb73b7`, `32a98183e`, `53a6c906f`, `80ff62a55`; reports in `604adf704`).
   The council caught: a panel bound derived from a token that publishes 0 on the DEFAULT
   (non-sticky) header — it passed verification only because the canary is sticky; scroll
   containers unreachable by mouse wheel under Lenis; a drawer wrap fix that needed two
   specificity layers and STILL failed because `flex-shrink: 0` disabled shrinking; and a footer
   credit that printed INVISIBLE. All five re-verified live post-deploy.

See D1011, D1012 in `decisions.md`; measurements in `reports/visual-diff/*-2026-09-10.md`.

## Blockers

**None blocking work.** (A weekly account rate limit hit 4 of 5 dispatched agents earlier this
session, worked around by doing the remaining investigation inline; resolved by the time the
D1014 qc-council round ran — all 4 of its dispatched agents completed normally.)

**Two co-active tracks on this shared checkout.** The parity/clone-fidelity track (items 1-4
above) and the nav-drawer track (items 5-6) both shipped in this window. Each has its own front
below. Neither blocks the other; they touch disjoint files.

⚠ **A peer session's `sgs/product-card` classifier fix is UNCOMMITTED.** Any clean or isolated
build fails `db-consistency` on `pillFontWeight`/`pillFontStyle`. `build-deploy.py --no-isolate`
reads the working tree and gets past it; a fresh clone will not. Needs that session to commit.

## THE FRONT — what to pick up next

**Read `.claude/reports/2026-09-09-fresh-clone-diff-triage.md` in full before touching any
converter code.** It is the complete root-cause register for the real remaining clone-fidelity
gaps, each with draft value / clone value / classification (bug vs spec gap vs non-issue) /
proposed fix-shape / predicted diffs closed. Nothing in it has been built — Bean's instruction
was investigate-and-design only.

**The old `.claude/prompts/2026-09-08-clone-fidelity-programme.md` and its diff ledger remain
RETIRED** — they were built against the pre-fix, now-known-wrong artefact from before this
session. Do not resume work from it; the fresh triage report supersedes it entirely.

### Track: clone-fidelity fixes (the front)

The triage register groups the real diffs into 4 clusters + 1 measurement-limitation finding
(already explained, not actionable further without deeper tool work). Priority order by
estimated diffs closed per fix:

1. **Shared root-cause: block-root background/border not transferring** (~41 diffs across
   trust-bar badges, testimonial cards, and a product trial badge). Highest-value single fix —
   likely one converter change closes three clusters at once. Not yet located precisely which
   walker stage extracts a block's own ROOT selector's CSS (as opposed to `route_area_css_to_block_attrs`,
   which correctly handles nested BEM children) — that's the first investigation step before
   building anything.
2. **Testimonial star-rating colour** (12 diffs). Exact mechanism found: the DB's `slots` table
   already aliases `"stars"` to `"rating"`, but the per-area attribute resolver
   (`route_area_css_to_block_attrs` / `db_lookup.attr_for_area_property`) isn't consulting it.
   Small, well-scoped fix.
3. **Pack-size pill typography** (12 diffs: font-size/weight/line-height attrs exist, not
   populated — likely same converter root cause as item 1) **+ pill text-align** (4 diffs,
   genuine spec gap — attribute declared with no routed `css_property` at all).
4. **Testimonial quote text italic/spacing** (6 diffs) — likely folds into item 1's fix once
   found.

None of these should be built without first reading the triage register's exact evidence per
cluster — this ledger entry is a pointer, not a substitute for reading it.

### Track: nav drawer (second front)

**Read first:** Spec 36 FR-36-6 / FR-36-4 / FR-36-10 and §12 rows (b)(c)(e); `decisions.md`
D1009 (drawer chrome — SIGNED, not open for re-litigation), D1011, D1012;
`reports/visual-diff/nav-menu-2026-09-10.md` + `-nav-drawer-` + `-business-info-` for what was
measured and the numbers.

1. **LEAD — the drawer's sub-accordions are structurally wrong.** Bean, 2026-09-10: *"they spawn
   inside the parent menu item."* His Spectra/Astra reference has sub-items as FULL-WIDTH rows
   beneath the parent, edge-to-edge. Measured at 375px: drawer 360px, top-level row 317px at
   x=22, but `.sgs-nav-menu__accordion` is **253px at x=86** and the sublinks with it.
   Root cause: `.sgs-nav-menu__accordion-row` is `display:flex` and the `<details>` is a flex
   SIBLING of the label, so the submenu lays out BESIDE the label rather than beneath it. Fix is
   MARKUP in `nav-menu/render.php`'s drawer renderer, not CSS.
   ⚠ Do not mistake `80ff62a55`'s `flex-shrink: 1` for this fix — it removed a real 201px
   overflow and is correct, but it made sub-items NARROWER, not full-width. Keep it.
   Bean also noted the reference opens MEGA panels inside the drawer; FR-36-6 currently declares
   that a gap. Do not build it — record what the structural fix makes reachable.
   **Done when:** sublink left edge + width match a top-level row (modulo a deliberate indent),
   `scrollWidth === clientWidth`, and Bean's eye agrees vs his screenshot (R-31-13).

2. **The scoped-CSS dead write.** `nav-drawer/render.php` assembles a border-style override into
   `$scoped_css` — written once, never read or emitted (1 occurrence vs 24 working `$css .=`
   sinks as a positive control). An explicit `border: none` never reaches the page.

3. **The non-modal rebuild** (approved D1011, ~3 hrs) —
   `parking.md::P-NAV-DRAWER-NONMODAL-BUILD`. Item 2 of its five is a LATENT Level-A a11y fix
   (`STOP-DIALOG-NONMODAL-TAB-RING`) that becomes live the moment the path is reachable; do it
   first. ⚠ `aria-modal="true"` must NEVER be added — it would hide the deliberately-live burger.

**Open decisions — Bean's, do not decide by inference:** the `header` anchor (evidence moved —
vercel/lamalama/lusion all use that geometry); `burger-morph` (renders a static X, animates
nothing); the credit link's two colour controls are CROSS-WIRED ("Hover colour" paints only the
1px underline; the one labelled for older browsers paints the whole text sweep); the submenu drop
shadow is clipped by `overflow-y:auto`; and **scroll-lock has no reference count** — found THREE
times independently, ~8 lines, the highest-value of the five.

---

## Task 1 — Locate the block-root CSS-extraction gap (the shared-root-cause fix)

**What:** find which converter/walker stage is responsible for extracting a block's OWN root
selector's CSS declarations (e.g. `.sgs-testimonial{background:white;border:1px solid...}` on
the block's top-level element) and determine why it isn't populating `backgroundColour`/
`borderWidth`/`borderStyle`/`borderColour`/`borderRadius` even though those attributes exist and
render.php reads them correctly.
**Why:** this one fix likely closes ~41 diffs across 3 separate clusters (trust-bar badges,
testimonial cards, product trial badge) — the single highest-leverage item in the register.
**Estimated time:** 20-30 min investigation before any code change.

**Orchestration:**
- Execution: inline first (root-cause tracing needs the session's own judgement), THEN delegate
  the fix once located
  - Model for the fix (once located): sonnet via `/delegate`
- Depends on: none. Read `.claude/reports/2026-09-09-fresh-clone-diff-triage.md` Finding 1 and
  Finding 2 first — both already narrow the search (attrs exist, render.php reads them, the gap
  is upstream in extraction).
- /qc gate after: yes — `/qc-council` before shipping (this touches converter/pipeline code,
  per blub.db 255's standing rule)
- **Acceptance:** a live re-clone of page 3448 shows the trust-bar badges' background/border,
  the testimonial cards' background/border, and the trial badge's gradient/border all matching
  the draft. Re-run `computed-parity.js` and confirm the specific diff entries from the triage
  register are gone.

## Task 2 — Fix the testimonial rating alias lookup

**What:** make `route_area_css_to_block_attrs` (or `db_lookup.attr_for_area_property`) consult
the `slots.aliases` table before reporting `no_area_attr` for an element token — confirmed live
that `slots.slot_name='rating'` already lists `"stars"` as an alias, but the resolver isn't
checking it.
**Why:** closes 12 diffs (3 testimonial cards × 4 rating props), fully root-caused already.
**Estimated time:** 15 min — the exact function and the exact missing lookup are both named in
the triage register.

**Orchestration:**
- Execution: delegated
  - Model: sonnet via `/delegate`
  - Brief: read Finding 2's rating-colour row in the triage report, trace
    `route_area_css_to_block_attrs`/`attr_for_area_property` in `converter/services/fold_helpers.py`
    and `converter/db/db_lookup.py`, add the alias consultation, verify with a live re-clone.
- Depends on: none. Parallel with Task 1 (different code path).
- /qc gate after: yes — `/qc-inline` (small, well-scoped change)
- **Acceptance:** the 3 testimonial star-rating clusters show the draft's gold colour + correct
  size/margin after a fresh re-clone.

## Task 3 — Decide on the pill typography + text-align fixes

**What:** confirm whether the pill font-size/weight/line-height non-population shares Task 1's
root cause (test AFTER Task 1 ships) or needs its own fix. Separately, `pillTextAlign` needs a
routed `css_property` added to `block_attributes` — currently declared but dead.
**Why:** 16 diffs total (12 + 4).
**Estimated time:** 10 min to re-test after Task 1; 15 min for the text-align DB row + wiring if
still needed.

**Orchestration:**
- Execution: inline (small, needs judgement on whether Task 1 already fixed it)
- Depends on: Task 1 (re-test after, don't build blind)
- /qc gate after: no — small enough for inline verification
- **Acceptance:** pill font-size/weight/line-height match the draft; `pillTextAlign` actually
  changes the rendered alignment when set.

## Dependency graph

```
Task 1 (inline investigation -> delegated fix, sonnet)
  |
  +-- /qc-council gate
  |
Task 2 (delegated, sonnet) -- parallel with Task 1, different code path
  |
  +-- /qc-inline gate
  |
Task 3 (inline) -- depends on Task 1's result
```

## Methodology guardrails (carried forward — all still true)

- ⛔ **`git grep` only, never `grep -r`** — stale worktrees inflate counts massively.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first (`| wc -l`).
- ⛔ **`$?` after a pipe reads the LAST command's status.** Redirect first.
- ⛔ **`git grep -c` with an explicit path prints `path:count`, not a bare integer.**
- ⛔ **Python `shell=True` on Windows is cmd.exe, not bash.**
- ⛔ **A regex `\b` after a slug matches inside a hyphenated sibling.**
- ⛔ **A name-mention is not a usage.** Real call-detection, not string match.
- ⛔ **A subagent must never mutate a repo file as a test fixture.**
- ⛔ **Metadata is not evidence.** Filename, line count, grep-hit count — open the file.
- **A completeness error is invisible to every correctness gate.**
- **A pre-commit gate can fail SILENTLY** after ~250 lines — never `--no-verify`; use the scoped
  `SGS_VISUAL_GATE_SKIP`/`SGS_INSPECTOR_GATE_SKIP`/`SGS_F5_SKIP` + `*_REASON`.
- **Run builds synchronously, never backgrounded.**
- **A new `block.json` attribute needs `sgs-update-v2.py --stage 1` immediately.**
- **Commit straight to `main`; never a PR, never a stash; integrate after every task.**
- **`build-deploy.py --dry-run` is NOT dry** — it builds, packages, SCPs and installs for real.
- **`build-deploy.py` isolates by DEFAULT** (D993) and does NOT abort on dirty files it is not
  shipping. A dirty shared checkout is not a reason to hold a deploy.
- **A Playwright MCP browser profile is SHARED across sessions.** If locked, report
  COULDN'T-TEST or use `chrome-devtools-mcp` — never kill the lock-holder.
- **A commit flushes the WHOLE index, not just your pathspec.** Verify with
  `git diff --cached --name-only` first. `--amend` is worse — it once swept 89 staged files.
- **A raw detector count is an UPPER BOUND, not a workload.**
- **A gate that can never go green is a defect in the gate.**
- **An exact-name exemption set must never become a pattern.**
- **At least THREE sessions hold uncommitted work in this checkout.** Check `git diff` before
  attributing an unfamiliar change.
- **A schema default erases the difference between "absent" and "chosen".** WP substitutes it
  before render.php runs. If a pipeline relies on absence meaning something, the default must be
  the absent-shaped value (D1005).
- **Bean's eye beats the parity tool.** It scored clean on 14 real defects and flagged several
  that render correctly. Treat its output as a hypothesis, never a verdict.
- **NEW (2026-09-09): a fidelity dimension must never score a native block's own semantic
  choices as defects.** Tag identity, and by extension any other CONVERT-not-mirror decision
  (attribute names, wrapper structure), is informational context, never a percentage (D1013).
- **NEW (2026-09-09): a fixed-length text-anchor window degrades on long/differently-composed
  ancestors.** A "missing element" finding on a SECTION-level anchor needs a live content
  comparison before it's trusted — verify the content actually differs, don't assume the tool's
  unmatched-elements list is ground truth for long ancestors.
- **NEW (2026-09-09): when subagent dispatch hits a rate limit, don't retry blind — do the work
  inline instead.** 4 of 5 investigation agents failed identically on the same weekly limit;
  retrying would have failed identically. Direct tool calls in the main thread aren't subject to
  the same per-model subagent quota.

## State Snapshot

- **Branch:** `main`. **Do not trust a SHA written here** — run `git rev-parse --short HEAD`.
  150+ sessions share this tree.
- **D-ceiling:** **D1014** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Canary:** sandybrown, WP 7.1. Fresh-clone verification page **3448**
  (`/fresh-clone-verification-mamas-munches-homepage-re-clone/`) — re-cloned this session from
  the current converter, so it reflects the pipeline as it stands today.
- **Parity — ruler now trustworthy TWICE-checked (D1013 + D1014), figures STALE, re-run before
  quoting:** last measured (before the D1014 regression fixes) CONTENT 100% (234/234), STRUCTURE
  true 100% (the reported 94%/8-unmatched was a measurement-window artefact, see Finding 0 in the
  triage report), LAYOUT 79% (635/802), PAINT+TYPE 82% (1383/1689). A spot-check AFTER the D1014
  fixes on 1440px alone showed STRUCTURE 93%, LAYOUT 75%, PAINT+TYPE 87% — lower populations
  (ambiguous elements now correctly DECLINE instead of being scored), not a regression. Re-run
  `node plugins/sgs-blocks/scripts/parity/computed-parity.js --draft <mockup> --clone <url>`
  fresh before trusting an exact figure for any CSS-transfer fix decision.

## Pointers

| For | Read |
|---|---|
| **The front — clone-diff root-cause register** | `reports/2026-09-09-fresh-clone-diff-triage.md` |
| Measurement-integrity phase (how the ruler was fixed) | `plans/phase-measurement-integrity.md` |
| The STRUCTURE-scoring correction + phase summary | `decisions.md` D1013 |
| Cloning pipeline spec + binding rules | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| System architecture | `architecture.md` |
| Goals + exit criteria | `goals.md` |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Colour + border helper registries | `plugins/sgs-blocks/CLAUDE.md` |
