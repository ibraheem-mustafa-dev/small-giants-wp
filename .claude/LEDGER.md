---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-08
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

The homepage clone had a long list of visible faults. We fixed twelve of them, and every fix
is a change to the **pipeline**, not a patch to make this one page look right.

The bigger finding is about the measuring tool. You inspected the page by eye and found
**fourteen defects the parity tool scored as clean** — while several things it *did* report
turned out to render correctly. So the ruler is bent in both directions, and the 81% score
it prints does not mean much yet. **The next session fixes the ruler before the clone.**

Two things I got wrong and corrected on the record: the hero's `max-width:420px` and the
trust-bar font sizes are faithful — your draft specifies both. I had reported them as bugs.

The type scale is now settled and shipped (D1007): no fluid typography, six presets instead
of nine, and the two font bugs you spotted are fixed and measured live — body text was 14px on
phones and is now 16px; footer text was 13px and is now 16px.

## Shipped this session (2026-09-07/08)

Twelve numbered fixes across 12 fix/feat commits, but the mapping is NOT one-to-one: items 8,
9, 10 and 11 all landed in `5faf0e181` ("four extraction gaps"), 9 and 10 each needed a second
commit for their block.json half, and item 6 bundles three related credit-line changes. Each
has a live-measured evidence report.

1. **Trustpilot slider rendered 0px wide** — `contain:inline-size` met a flex parent and
   zeroed the block's intrinsic width. Now 960×326 (was 0×880).
2. **Hero hover-zoom scrolled the whole page sideways** — nothing clipped horizontally up to
   `<html>`. Section now `overflow-x:clip`; the zoom still escapes its column.
3. **Buttons forced a 10px radius** onto drafts that declare none. Moved to the presets.
4. **Gift badges square + "no background"** — one cause: a bare `6` read as a spacing-preset
   slug, emitting an undefined var. Bare numbers now checked against the theme's real slugs.
5. **Footer columns rendered sideways** — headings beside their links. Fixed in the pattern
   AND the live template part (it is a stored DB record the pattern does not reach).
6. **Credit line** — it was already in the correct ROW, but sat left-aligned inside its half of
   the bottom bar; now right-aligned to the bar's end (`775c4f71f`). Size fixed to match the
   footer's own scale (14px — an earlier `x-small` made it smaller than everything around it),
   and the hover replaced with the muslimsinconstruction.uk underline-grow to `#d4a73c`.
7. **Wrong nav menu site-wide** — the resolver picked the highest-ID classic menu, so a leftover
   dev fixture ("T1 Dropdown Test") won on every page. Unassigned classic menus now rank last.
8. **Paragraph spacing lost** — no per-side merge path for `margin-*` after the box-object
   migration. New `converter/services/box_side.py`.
9. **Brand Story image missing** — block lacked `scalarContentLift`; lift gate required an
   object-typed attr; no self-match for an atomic `<img>`.
10. **Wrong pack size preselected** — `array_item_schema.role` was NULL, so the lifter never
    read the draft's `--active` marker. New `state-modifier-boolean` role.
11. **"Find out more" link black not pink** — typography resolver used a global suffix map;
    `sgs/button` names the attr `colourText`. Now a per-block lookup.
12. **`sgs/container` layout default flex → flow (D1005)** — this was the big one. See below.

**Parity across three runs: 76% → 80% → 81% CSS, 97% → 99% content.**

### Later in the same session — three more tracks

13. **Type scale rebuilt and shipped (D1007).** No fluid typography; ladder 9 → 6. Both font
    defects Bean reported are closed and measured live: body 14px → **16px** on phones, `small`
    13.0082px → **14px**, footer body text → **16px**. New `theme/sgs-theme/assets/css/type-scale.css`
    (redefines the three display presets per breakpoint at `:root:root`, so it wins on specificity
    not enqueue order) + `scripts/migrate-font-size-ladder.py` (43 declarations rehomed; 20
    self-test assertions with negative controls; `--check` is a standing gate).
    ⚠ **One regression shipped and was caught by Bean's question, not by me:** moving every preset
    to `fluid: false` without adding `display` to the media overrides left the 404 numeral flat at
    120px on phones (it had been 56px). Fixed by retiring `display` and putting explicit tiers on
    the block. **A preset moved off fluid needs its media-query override in the SAME change.**
14. **Doc audit — four parallel agents** across `plans/`, `specs/` (two clusters) and `.claude/`
    root. Nine fixes applied, each re-verified before use. **Three agent claims were REJECTED after
    checking:** a "37 xfail goldens is stale, it's 10" claim (the file says 37 — applying it would
    have replaced a correct number with a wrong one), a "`--dry-run` really deploys" claim
    (unprovable either way — documented as a contradiction instead of guessed), and a "this plan is
    DONE" claim (the plan contradicted itself; that was the real defect).
15. **Repo hygiene.** 1 worktree + 4 merged branches pruned (all verified ancestors of
    `origin/main`, zero salvage), 2,499 dangling commits cleared, 0 stashes. 39 non-stash orphans
    preserved as `refs/salvage/*` rather than deleted on a judgement call — one is
    `feat(icon-list): per-item icon colour`, which the plugin CLAUDE.md still lists as an open gap.
    ⚠ A 152MB orphaned pack could not be removed — VS Code's Git extension holds it open.

Two further commits this session were NOT part of that twelve — they were uncommitted work
already in the shared checkout, which I read, verified and committed rather than deploy on a
dirty tree: `4f441cac8` (container `min-height` flex-fill onto the content band, a documented
in-flight fix) and `c98e2b53b` (stale `media*` → `splitMedia*` comment references). Neither
originated this session.

### Why D1005 mattered more than its size

WordPress substitutes a schema default when an attribute is **absent**, before render.php runs.
The converter faithfully writes no `layout` when the draft declares none — so "the draft said
nothing" and "the author chose a flex row" arrived identically. Every block-level child became a
shrink-wrapping flex item. Measured: the gift section's label and H2 were rendering **side by
side**, unreported, and the strip was 592px inside a 960px band. All five children now 960px.

D742's reasoning still holds where it was aimed; it just did not anticipate the absent case.

## Blockers

**None blocking.** No decisions pending.

## THE FRONT — what to pick up next

**Read `.claude/prompts/2026-09-08-clone-fidelity-programme.md` in full.** It is the
four-phase plan, with a complete 524-diff parity ledger and every one of Bean's points.

### ⚠ TWO PARALLEL TRACKS as of 2026-09-08 — do not cross them

Bean split typography out of the clone-fidelity programme so the two can run in separate
sessions. **They both edit `theme.json` and the same pattern files, so a session must pick one.**

| Track | Owns | Doc |
|---|---|---|
| **A — Type scale** | theme.json presets, fluid, footer size | D1007 + `specs/01-SGS-THEME.md` "Type scale" |
| **B — Clone fidelity** | parity tool, the 14 defects, the 524-diff ledger | the programme prompt (its §2.1 is now an out-of-scope stub) |

### 1. TRACK A — type scale: DONE (D1007), shipped + verified live

**No fluid typography.** Explicit per-device values via the SGS tier system. Grounded in GOV.UK
(never adopted `clamp()`) and Designsystemet Norway (shipped it, then reversed it in production);
`clamp()` on `vw` can also fail WCAG 1.4.4. Research:
`~/.claude/memory/research/2026-09-08-sgs-responsive-type-scale.md`.

**Ladder 9 → 6:** `small` 14 / `regular` 16 / `large` 20 / `x-large` 24 / `xx-large` 36 /
`hero` 50. Retired `x-small`, `medium` and `display`. Reading sizes never shrink; only the
top three compress. Measured live at 375 / 900 / 1440 — `x-large` 21/22/24, `xx-large` 27/30/36,
`hero` 33/40/50, body 16px, zero `clamp()` on any SGS preset.

**Both reported defects closed:** the base body font (`efb7ec5de`) and `small`, which rendered
**13.0082px** on a phone and now renders 14px. Footer body text now 16px.

⚠ **`display` took two passes.** First it was nearly deleted as dead — wrong; the "zero uses"
survey read `patterns/*.php` only and `templates/404.html` uses it. Then it was kept on that
basis — also wrong, per Bean: one use is a reason to write an explicit value, not to carry a
permanent picker row. It is now retired, and `404.html` carries
`{"desktop":120,"tablet":80,"mobile":56}` on the block. That ALSO closed a regression this
programme shipped: `display` had been fluid 56→120px, and moving it to `fluid: false` without a
media-query override left it flat at 120px on phones. **A preset moved off fluid needs its
override in the same change.**

⚠ **Accepted, not fixed:** three phantom presets leak from WordPress (`normal`, `huge`, fluid
`medium`) despite `defaultFontSizes: false` in every layer on a v3 theme.json under WP 7.1.
Four causes disproven, none proven, so nothing was shipped for a guessed cause. Three extra
entries in the editor picker; nothing references them, nothing renders wrong.

**Still open, low priority:** the Spec 33 extractor does not emit per-client display-tier values,
so a client with a materially different ladder inherits the framework curve. Affects
hand-authored patterns only — the cloner writes measured raw numbers and never touches presets.

### 2. TRACK B — parity tool + the 14 defects: IN FLIGHT IN ANOTHER SESSION

⛔ **Do not start Track B blind.** Bean is running it in a parallel session and it has already
landed `computed-parity.js` v1.3.0 (pseudo-element paint fallback + widened tag-defaults census,
both council-falsified). **Check `git log -- plugins/sgs-blocks/scripts/parity/` before touching
anything there.** The programme doc is
`.claude/prompts/2026-09-08-clone-fidelity-programme.md`; its §2.1 is an out-of-scope stub
because typography moved to Track A.

⚠ **Its §1.4 ledger is now partly obsolete:** the `font-size` (77) and `line-height` (74)
clusters — 151 diffs, 29% of the total — had fluid typography as their root cause, which Track A
removed. **Re-measure before investigating them**; chasing them now measures a defect that is
gone.

---

## Task 1 — Deploy-verify the type scale on a second page

**What:** confirm the 6-preset ladder renders correctly somewhere other than the homepage + 404.
**Why:** both surfaces verified so far are ones Track A touched directly. A page nobody edited is
the honest control.
**Estimated time:** 10 min

**Orchestration:**
- Execution: inline (main thread) — it is a measurement, not a build
- Depends on: none. Parallel with: Task 2
- /qc gate after: no — the measurement IS the gate
- **Acceptance:** at 375 / 900 / 1440, `small`/`regular`/`large` are flat 14/16/20 and
  `x-large`/`xx-large`/`hero` step 21-22-24 / 27-30-36 / 33-40-50, on a page not edited this
  session. Any preset resolving to a `clamp()` is a failure.

## Task 2 — Resolve the `--dry-run` contradiction

**What:** `.claude/dev-setup.md` now documents an unresolved conflict — the code says `--dry-run`
never deploys (every step passes `args.dry_run` to `run()`, which returns early), but D991 records
a real incident where it built, packaged, SCP'd and installed live. `build-deploy.py` has had no
commits since.
**Why:** an operator cannot currently trust a "safe preview". One of the two records is wrong and
nobody knows which.
**Estimated time:** 20 min

**Orchestration:**
- Execution: inline. This needs a deliberate empirical test, not a code read — two agents have
  now reasoned about it and reasoning is what produced the disagreement.
- Method: run `--dry-run` against a throwaway target with a tripwire file, then check whether the
  remote changed. Do NOT test against the live canary.
- Depends on: none. Parallel with: Task 1
- /qc gate after: no
- **Acceptance:** a one-line verdict in `dev-setup.md` + D991 amended, backed by an observed
  remote state — not by reading the script again.

## Task 3 — Decide the fate of `refs/salvage/*` (39 refs)

**What:** 39 orphaned commits were preserved rather than deleted during the gc. Most are junk
(`probe2`, `test commit message`, an empty subject) or log-only chores. **One is
`feat(icon-list): per-item icon colour + gradient override`**, and `plugins/sgs-blocks/CLAUDE.md`
lists icon-list per-item colour as a still-OPEN gap.
**Why:** either that commit is real unlanded work worth recovering, or the refs are dead weight.
**Estimated time:** 15 min

**Orchestration:**
- Execution: delegated — cold, mechanical triage
  - Model: sonnet via `/delegate`
  - Dispatch: single agent
  - Brief: for each `refs/salvage/*`, diff against `origin/main` and classify KEEP / DROP. Report
    only; do not delete refs and do not cherry-pick.
  - Context it needs: the framework is pre-production; `git cherry`/patch-id is unreliable here
    because the repo squash-merges, so compare CONTENT not commit identity.
- Depends on: none
- /qc gate after: yes — `/qc-inline` on the KEEP list before anything is cherry-picked
- **Acceptance:** every ref classified with evidence; Bean decides on the KEEP list. Deleting the
  refs is not this task's job.

## Task 4 — Two doc items the audit surfaced but did not close

**What:** (a) **47 living-doc citations point into `plans/archive/`**, against the working-area
rule that archived plans are git-blame-only. Many are deliberately labelled "(ARCHIVED —
historical)", so the RULE may be wrong rather than the citations — that needs Bean's call, not a
mass edit. (b) Three plans are stalled with no doc saying so: `merged-spec36-37` (partial since
D423, 2026-07-30), the `drawer-architecture` design gate (still un-run 40 days on), and
`snooza-configurator` — **which has real client stakes, a fixed pitch date and a 6-week quote, and
nothing anywhere flags that it stopped moving.**
**Why:** (b) is the one with money attached.
**Estimated time:** 10 min to surface; the decisions are Bean's

**Orchestration:**
- Execution: inline — these are questions for Bean, not work
- Depends on: none
- /qc gate after: no
- **Acceptance:** Bean has answered on snooza and on the archive-citation rule. Do NOT open
  parking entries for either without asking first.

## Dependency graph

```
Task 1 + Task 2 + Task 3 (all independent, dispatch together)
  ↓  Task 3 only: /qc-inline on its KEEP list
Task 4 (ask Bean; blocks nothing)

Track B runs in a SEPARATE session — do not start it here.
```

## Open — real, not blocking

- **Hero extends past the right edge on every device** (Bean: "a huge issue"). Possibly the -24px
  side margins he spotted. Not yet root-caused — it is item 3.1 in the programme doc.
- **78 diffs across 12 property clusters had never been triaged** until the programme doc's
  parity ledger (appearance, border-image-slice, background-repeat/position, font-style,
  align-items, display, max-height, flex-basis, order, object-position, flex-direction).
- **Footer text is 14px vs 18px body.** Answered: the draft designs its own footer at 11-14px, so
  ours matching at 14px is correct. Raising it is a design preference, not a fix.
- **3 pre-existing GATES failing on `main`** (`check-element-manifest-conformance`,
  `check-editor-render-parity`, `check-hover-state-classification`), across five blocks
  (heading/quote/timeline/text/product-faq). Three gates, five blocks — not three blocks. Not
  this session's work. `npm run build` fails on them; use `npx wp-scripts build
  --experimental-modules --webpack-copy-php`.

## ⛔ The census gate does NOT protect already-migrated rows — proven, not suspected

**A negative control was run on 2026-09-07 and it FAILED**, which is exactly why it was run. The
promise in this session's own plan ("`--check` exits non-zero on a deliberately reverted row
before I trust it") had not been kept until an adversarial council demanded the evidence.

The test: `sgs/mega-aside/render.php`'s `sgs_border_states_css()` base attribute was renamed to a
bogus value, breaking the migration. `classify-end-shape.js --check` still reported **PASS**.

The cause: the census only ADMITS a row that still `needsHover` or `needsGradient`
(`classify-end-shape.js` row-inclusion gate). A migrated row therefore **leaves the population**
— `sgs/mega-aside` is no longer among the 39 tracked rows at all — so no amount of breaking it can
make the gate fail.

**What the gate really does:** stops a row that is still non-conformant from being declared
complete, and catches a NEW non-conformant row appearing. That is worth having.
**What it does NOT do:** protect the ~130 rows already migrated. Any of them can silently regress
and this gate stays green.

**The fix, if it is wanted:** `--check` needs a recorded roster of completed rows (a manifest
written at migration time) and must re-assert those still resolve, rather than deriving its
population only from what is still broken. Until then, do not describe this gate as protecting
the colour work — it guards the frontier, not the territory.

*(This is the "a gate's scope is not the defect's scope" trap, already in MEMORY.md. It recurred
here despite being indexed, which is itself worth knowing.)*

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
- **NEW (2026-09-08): the visual-diff gate needs a `source_sha` matching the STAGED content.**
  It prints the expected hash on failure — read it, put it in the report, re-commit. And use
  `build-deploy.py --payload <prefix>` to break the deploy↔commit deadlock honestly rather than
  bypassing the gate: deploy the declared payload uncommitted, measure, THEN commit.
- **NEW (2026-09-08): never hand-edit a GENERATED artefact.** `theme-snapshot.json` is written by
  the Spec 33 extractor; an edit there is wiped on the next run. Fix the generator.
- **NEW (2026-09-08): a schema default erases the difference between "absent" and "chosen".**
  WP substitutes it before render.php. If a pipeline relies on absence meaning something, the
  default must be the absent-shaped value (D1005).
- **NEW (2026-09-08): Bean's eye beats the parity tool.** It scored clean on 14 real defects and
  flagged several that render correctly. Treat its output as a hypothesis, never a verdict.

## State Snapshot

- **Branch:** `main`. **Do not trust a SHA written here** — run `git rev-parse --short HEAD`.
  150+ sessions share this tree.
- **D-ceiling:** **D1007** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Canary:** sandybrown, WP 7.1. Homepage page **2742**. **Deployed + re-cloned this session**;
  all twelve fixes verified live.
- **Parity (measured, but by a tool known to be wrong):** CSS 79/79/84 at 375/768/1440,
  content 99%. Treat as provisional until §THE FRONT item 2 lands.

## Pointers

| For | Read |
|---|---|
| **The front — clone-fidelity programme** | `prompts/2026-09-08-clone-fidelity-programme.md` |
| Base font-size research | `~/.claude/memory/research/2026-09-08-mobile-base-font-size-16px-vs-14px.md` |
| Cloning pipeline spec + binding rules | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| System architecture | `architecture.md` |
| Goals + exit criteria | `goals.md` |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Colour + border helper registries | `plugins/sgs-blocks/CLAUDE.md` |
