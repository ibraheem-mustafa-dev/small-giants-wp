# Uniformity sweep — resolve every finding

Invoke `/autopilot` first.

**Your plan is `.claude/plans/2026-08-30-uniformity-sweep-execution.md`. Read its STATUS section at
the top in full — it names exactly what shipped 2026-09-02, what's still open per shape, and the
two rulings Bean reversed. Then read `.claude/decisions.md` D917 for the full account, including two
real bugs this session's own tooling produced and two near-losses in the commit flow.**

---

## First action

`git status`, then `git log --oneline -15` to confirm the 11 commits from 2026-09-02 are present and
pushed. Read the plan's STATUS section and D917. Then read
`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` in full — Bean-locked, every session, no exceptions.

⛔ **Before building any script, read the GENERATED tooling catalogue in `.claude/dev-setup.md`
(§"Tooling catalogue").** It lists every gate in real execution order with each script's own stated
purpose. This repo's recorded failure mode is rebuilding a tool that already exists. Search the
SUBJECT, never the verb — the same idea is spelled `check-`, `audit-`, `survey-`, `scan-`, `probe-`,
`migrate-` and `report-`.

---

## The goal, in Bean's words

> *"Resolve all findings to either figure out it's not a problem and fix the script, or fix the
> issues — via a script if possible."*

This widens the previous session's brief. Every finding from every detector gets one of two
outcomes, not "measured and left honest":

1. **Not a real problem** → the DETECTOR is wrong (false positive, overmatching regex, stale
   assumption). Fix the script, verify the fix with a positive AND negative control, re-measure.
2. **A real problem** → fix it. If the same shape repeats across more than ~3 blocks, the first
   deliverable is the fix-script (`--survey`/`--fix`/`--check`/`--self-test` triad), not the edit —
   per `.claude/THE-MIGRATION-METHOD.md`. A one-off gets fixed directly.

Still not a perfection exercise — don't chase every edge case blind. But the scope is now genuinely
"every finding," not "the cheap wins." Close what you can close. If something needs a real design
decision (like S3's `LayoutPanel` gap or S7's other 14 candidates), say so and take it to Bean rather
than parking it silently.

---

## Everything is in scope now — nothing deferred without asking

The 2026-08-30 session parked three things as "out of scope." **Bean reversed that 2026-09-02 — all
three are in scope:**

- **Rule 20** (`20-pattern-template-lock`, 23 findings, theme pattern files missing `templateLock`)
- **The `dead-api-checker` allowlist** (321 entries as of 2026-09-02, was 305 — spot-check a sample
  against real WP/WC function names before extending it; an allowlist that overmatches hides real
  dead calls)
- **S9 / C14 tab-splits** (12 unconfirmed candidates) — re-triage against Bean's own exception first:
  a control that owns its OWN colour (border, background-overlay) sitting in one panel is NOT a
  split. The plan's own §"Bean's C14 nuance" narrows the list before you touch anything.

Also carried forward from last session's Wave A enumeration, never actioned:

- **82 detector-shaped scripts with zero gate reach** — the `surveys/` census triad,
  `motion-qa`/`migrate-core-blocks` live probes (need a live URL, can't run static), 6
  commit-hook-only visual-diff helpers. Full table: ask the agent that produced it, or re-run Wave A6
  (gate-roster reconciliation) fresh — 3 days old already.
- **`check-enum-control-shape.py`** — fails ungated, 6 NEW violations (card-grid.layout,
  form-field-tiles.layout, media.mediaType, pricing-table.layout, quote.attributionFontStyle,
  tabs.layout — all `SelectControl` where D812 calls for `ToggleGroupControl`), no repair script.
- **`survey-wrapper-capability.js`** — 76 orphaned-capability findings across 8 blocks (`sgs/container`,
  `sgs/hero`, `sgs/trust-bar` worst at 13 each) — paintable attrs with no reachable control. This
  looks like a real client-facing gap, not noise; triage it first.
- **`survey-colour-coverage.py`** — 41 STATE-COLOUR-UNCONTROLLED findings across 33/83 blocks.
- 1 broken script (`motion-qa/probe-fr-38-35-timeline-progress.mjs`, fails to parse) + 6
  unreferenced scripts from `audit-script-reachability.py` — decide revive-or-delete for each.

**Every count above is 3 days stale. Re-measure before scoping work from it** — this session's own
Wave A found the population had drifted in both directions since 2026-08-30 (28 `inspector-scan`
rules not 24, `setting-types.json` silently 680 attr instances behind).

---

## What NOT to re-open

The plan's STATUS section names exactly what shipped 2026-09-02 and why the remainder of each shape
was deferred (a real schema gap, a real collision, an architectural call not a mechanical fix). Read
it before re-investigating S1's third item, S3's `LayoutPanel`, or S4's batch migration — the reason
each is still open is already written down; don't re-derive it from scratch.

**S7's other 14 ToolsPanel candidates are blocked on Bean looking at the shipped pilot
(`team-member`'s "Card Settings").** Ask before scripting the rest, don't assume approval.

---

## Two lessons this session earned the hard way — both now in `.claude/STOP-CATALOGUE.md` §E20

**A truncated command-output tail can hide a failed `git commit`.** This project's pre-commit hook
prints many unrelated (passing, baselined) gate diagnostics AFTER the one line that actually says
`❌ COMMIT BLOCKED`. Reading only the last few lines cost three silently-failed commits, sitting
staged unnoticed for the rest of the session. **After every commit, read the full output or grep for
`\[main ` / `COMMIT BLOCKED` specifically, and confirm with `git log --oneline -1`.** Never infer
success from a tail that happens to end on a passing sub-gate.

**A codemod's own `--self-test` passing is not proof its real output is correct.**
`scripts/colour-codemod/fix.js --self-test` passed 100% both before and after a real `--fix --apply`
run that shipped a PHP parse error into two blocks and a JS `ReferenceError` into all three it
touched — its fixtures didn't cover the exact shape those blocks used. **After any codemod's
`--fix --apply`, re-run `gate:fast` and `php -l` on every touched PHP file before trusting the
result**, even when the codemod's own tests are green.

---

## Method (same as last session — it worked)

1. **Enumerate before you scope.** Read `.claude/dev-setup.md`'s tooling catalogue and re-run the
   Wave A slices that are now 3+ days stale. Dispatch parallel read-only agents if the population is
   large enough to warrant it. Check `~/.claude/CLAUDE.md`'s project memory first
   (`coding_subagents_cascade_fail_do_build_inline`): **read-only research agents work fine here;
   write/coding subagents cascade-fail. Fix inline in the main thread, not via dispatched Wave-B
   agents**, regardless of what the original plan's "waves" framing suggests.
2. **Fact-check every count against source** before acting on it — this session found real drift on
   nearly every number it touched.
3. **Group by fix shape, not by rule.** One script, many findings, many blocks.
4. **A false positive is a detector bug, never baseline fodder.** Every exemption needs a negative
   control proving it doesn't overmatch.
5. **Verify with `gate:fast` after every change**, reading the FULL output. Commit path-scoped, one
   shape per commit — five tracks share `main`, branch re-checked in the same command as any commit.
6. **If a pre-commit visual-diff gate blocks a genuinely non-visual or static-verified change**, use
   its own sanctioned bypass — `SGS_VISUAL_GATE_SKIP=<blocks> SGS_VISUAL_GATE_REASON="..." git commit
   ...` — never `--no-verify` (it also skips gitleaks/cheat-gate/F5/F6). Log the reason; that's the
   gate's own required behaviour, not a workaround.
7. **No canary deploy, no content migration, no visual-diff capture** — this track stays
   static-gate-driven, per Bean's original ruling (only the "out of scope" items were reversed, not
   this constraint).

---

## When you finish

Report what cleared, what remains, and what you could not verify — same as last session. Update the
plan doc's STATUS section (replace, don't just append) and add a new `decisions.md` entry. Then
`/handoff`.
