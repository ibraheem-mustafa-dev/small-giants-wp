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

One decision is waiting on you: how to stop WordPress shrinking the base body text to 14px
on phones (§THE FRONT, item 1). The research is done; the choice is a design call.

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

**None blocking.** One decision is pending Bean (base font size, below).

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

**Ladder 9 → 7:** `small` 14 / `regular` 16 / `large` 20 / `x-large` 24 / `xx-large` 36 /
`hero` 50 / `display` 120. Retired `x-small` and `medium`. Reading sizes never shrink; only the
top three compress. Measured live at 375 / 900 / 1440 — `x-large` 21/22/24, `xx-large` 27/30/36,
`hero` 33/40/50, body 16px, zero `clamp()` on any SGS preset.

**Both reported defects closed:** the base body font (`efb7ec5de`) and `small`, which rendered
**13.0082px** on a phone and now renders 14px. Footer body text now 16px.

⚠ **`display` was nearly deleted as dead and is not** — the "zero uses" survey read
`patterns/*.php` only; `templates/404.html` uses it deliberately.

⚠ **Accepted, not fixed:** three phantom presets leak from WordPress (`normal`, `huge`, fluid
`medium`) despite `defaultFontSizes: false` in every layer on a v3 theme.json under WP 7.1.
Four causes disproven, none proven, so nothing was shipped for a guessed cause. Three extra
entries in the editor picker; nothing references them, nothing renders wrong.

**Still open, low priority:** the Spec 33 extractor does not emit per-client display-tier values,
so a client with a materially different ladder inherits the framework curve. Affects
hand-authored patterns only — the cloner writes measured raw numbers and never touches presets.

### 2. Fix the parity tool before fixing the clone

It is wrong in both directions and its score is currently unusable as a gate.

- **False positives, proven:** it reads an element's own `background-color`, but SGS paints
  backgrounds on `::after` by design. `sgs/info-box` own bg is transparent, its `::after` white —
  36 diffs likely artefact. Borders may be the same (Bean says they already work).
- **False negatives:** fourteen real defects scored clean. The likely structural gap is that it
  compares computed CSS properties but **not layout geometry** — and most of Bean's findings are
  position/width defects.
- **Re-baseline after fixing.** Expect the score to move; that is the ruler straightening.

### 3. Then root-cause the fourteen defects, then fix them

Phases 3 and 4 of the programme doc. Bean's binding method: **investigation separate from fixing,
every finding falsified by a second agent (`/qc-council`), fixes explained before building, and no
hardcoding a value to make this draft pass.**

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
- **D-ceiling:** **D1006** — verify with
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
