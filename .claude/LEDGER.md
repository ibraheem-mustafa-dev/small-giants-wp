---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-09
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**The measurement tool is now trustworthy. The clone still has real fixable gaps, and we know
exactly what they are — but nothing has been fixed yet, on your instruction.**

Last session's parity tool had five real bugs (a dead SVG skip, elements scored twice, a tag
change wiping a whole element's score, a screen-reader element poisoning a text anchor, and a
hardcoded property blocklist). All five are fixed and proven with before/after fixtures
(`.claude/plans/phase-measurement-integrity.md`, 13 commits).

While reading the fixed tool's output, you correctly caught a sixth problem: it was counting a
native SGS block choosing its own semantic HTML tag (a `<footer>` for a testimonial's
attribution, a `<label>` instead of a `<button>` for a picker option) as a **defect**. That's
backwards — cloning to native blocks, not mirroring the draft's exact DOM, is the whole point of
this framework. Fixed same day; tag choice is now informational only, never scored.

With the ruler finally honest, I re-ran the ACTUAL clone pipeline fresh (not a stale artefact)
and root-caused the real remaining diffs — investigation and fix-design only, no code changed,
per your explicit instruction. Full register: `.claude/reports/2026-09-09-fresh-clone-diff-triage.md`.

**The headline finding: the clone is better than it looked.** All 8 elements the tool called
"missing" are genuinely present with correct content — that's a measurement-window limitation,
not a clone defect. The REAL gaps are 4 clusters, and 3 of them likely share ONE root cause (a
block's own background/border isn't transferring from its root selector — trust-bar badges,
testimonial cards, and a product trial badge). The 4th is pack-size pill typography, plus one
confirmed spec gap (pill text-align has no CSS routing at all).

**Nothing in that register has been built.** The next session's job is to pick which fixes to
build, starting with the shared-root-cause one (it's the biggest single lever).

## Shipped this session (2026-09-09)

1. **Measurement-integrity phase — 13 steps, all committed** (`75d22d92b`..`578e03d2e`,
   `.claude/plans/phase-measurement-integrity.md`). Five proven ruler bugs fixed, each behind a
   self-test fixture that failed before its fix and passes after. Step 7 (tag-tolerant matching)
   needed a genuine rollback + qc-council-corrected re-implementation — see D1013 for the
   detail. The tool now reports four independent dimensions instead of one aggregate.
2. **STRUCTURE dimension corrected to stop scoring tag identity** (`3abb141ea`, Bean-directed).
   Live effect: STRUCTURE 69% → 94%, later confirmed by direct investigation to be a true 100%
   (see item 3).
3. **Fresh clone-pipeline re-run + full root-cause triage, investigation only**
   (`.claude/reports/2026-09-09-fresh-clone-diff-triage.md`). Re-cloned page 3448 from the
   CURRENT converter (not a stale artefact) so the diffs being triaged reflect the pipeline as
   it stands today. Verified live that all 8 "unmatched" elements are a measurement-window
   artefact, not real content loss. Root-caused 4 real CSS clusters with proposed fix-shapes;
   nothing implemented.

See D1013 in `decisions.md` for full technical detail on both the phase and the correction.

## Blockers

**None blocking work.** One environmental note: 4 of 5 dispatched investigation subagents this
session hit the account's weekly rate limit (resets 11pm London time); the remaining two
investigations were completed inline instead. Not expected to recur next session.

**Concurrent session activity (not this session's work, noted for completeness):** two nav-drawer
fix commits landed in this same window (`2bdcb73b7`, `32a98183e`) from a different concurrent
session on this shared checkout — see `decisions.md` D1011 (design decision, not yet built) and
D1012 (an incident write-up on dead code found in the drawer's fallback branch). Unrelated to the
parity-tool work above; flagged here only so a future session isn't blind to it.

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
- **D-ceiling:** **D1013** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Canary:** sandybrown, WP 7.1. Fresh-clone verification page **3448**
  (`/fresh-clone-verification-mamas-munches-homepage-re-clone/`) — re-cloned this session from
  the current converter, so it reflects the pipeline as it stands today.
- **Parity (now trustworthy, ruler-side):** CONTENT 100% (234/234), STRUCTURE true 100% (the
  reported 94%/8-unmatched is a measurement-window artefact, see Finding 0 in the triage
  report), LAYOUT 79% (635/802), PAINT+TYPE 82% (1383/1689). These LAYOUT/PAINT+TYPE numbers are
  real, honest, and not yet acted on — see THE FRONT.

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
