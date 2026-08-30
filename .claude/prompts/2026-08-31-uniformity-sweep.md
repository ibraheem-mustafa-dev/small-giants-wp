# Uniformity sweep — clear the blockers

Invoke `/autopilot` first.

**Your plan is `.claude/plans/2026-08-30-uniformity-sweep-execution.md`. Read it in full. It carries
every ruling, every measured count and every guardrail. This prompt only starts you.**

---

## First action

`git status`. Five tracks share this checkout. Then read the plan above, and
`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` in full — Bean-locked, every session, no exceptions.

⛔ **Before building any script, read the GENERATED tooling catalogue in `.claude/dev-setup.md`
(§"Tooling catalogue", line ~686).** It lists every gate in real execution order with each script's
own stated purpose, across **611 runnable files**. This repo's recorded failure mode is rebuilding
a tool that already exists. Search the SUBJECT, never the verb — the same idea is spelled
`check-`, `audit-`, `survey-`, `scan-`, `probe-`, `migrate-` and `report-`.

---

## The goal, in Bean's words

> *"No clear blockers from this aspect to the pipeline or my client's experience with the editor,
> canvas, or the blocks doing what they should on the live pages."*

**This is not a perfection exercise.** Clear large chunks of real findings. Leave the rest measured
and honest.

---

## Two constraints that change the method

**No canary loop.** Bean's ruling: the canary holds scratch content built only to test
functionality. Scanning, deploying and verifying it costs tokens and proves nothing about a client
site. So this track is static-gate-driven — **no deploy, no content migration, no visual-diff.**
The honest cost, accepted knowingly: a change breaking live rendering would not be caught here.

**Tokens are short and a deadline is live.** Order by goal value, not by finding count.

---

## The shape: waves, with you orchestrating

Bean's instruction: *"do all of the different groups with parallel subagents in waves, and have the
main agent orchestrate, direct and fact-check the subagents — then we do it all at once."*

**Wave A — enumerate.** Six read-only agents, disjoint slices of the detector scripts. Each returns
the same table: script, what it detects, current findings, exit code, whether a repair script
exists. Nobody fixes anything.

**You — fact-check and categorise.** This step cannot be delegated. Spot-check every load-bearing
count against source. Group findings into FIX SHAPES, not rules: one shape is one script fixing many
findings across many blocks. Kill false positives. Map each shape to Bean's two goals.

**Wave B — fix.** One agent per shape, disjoint files, each handed its finding list in the prompt so
it never re-runs a scan to discover its own work.

**You — fact-check again.** `git diff --stat` after every agent.

**Converge once.** One build, one `gate:fast`, ratchets lowered with their composition enumerated.

---

## Scope, already settled by Bean

**In:** the rule-08 line-key fix · detector fixes · tier migration (after its two blockers) · the
panel mounts · the colour sweep plus ratchet · rules 29/33/35 · deleting `borderRow` · the
decorative toggle · a ToolsPanel pilot on `team-member` only.

**Out:** rule 20's 23 findings · the 305-entry `dead-api-calls` allowlist · C14 beyond any quick
remainder.

⛔ **Do not re-open a settled item.** Each is recorded in the plan with its reason.

---

## Four things that will bite you

**Every count is a floor, not a total.** The previous session under-reported the population four
times: baselines went 14 → 146 → 171 → **511**, rules 7 → **24**, scripts → **809**. One cause each
time — measuring the layer in front of you and reporting it as the whole. Enumerate before you scope.

**The tier migrator would corrupt art-directed media today.** Its `ASSET` classification is a shape
test, not a semantic one, so 15 media attributes (`imageId`, `imageUrl`, `logoId`, `videoUrl`,
`svgContent`…) classify as FLAT and would be folded into responsive objects — which Bean's C19
ruling forbids. It also throws an unhandled `KeyError` at `migrate-tier-object.py:1025/1034/1036`
that aborts the whole batch. **Fix both before `--fix` runs.**

**A false positive is a detector bug, never baseline fodder.** And every exemption needs a negative
control proving it does not overmatch.

**A grep returning 0 is a hypothesis.** Pair it with a positive control from the same file. A
truncated grep reads exactly like a complete one.

---

## When you finish

Report what cleared, what remains, and what you could not verify. Then `/handoff`.
