# Golden-colour capability grant — build session

**Written 2026-09-03.** Invoke `/autopilot` first.

## Scope

Build the `grant.js` capability-grant tool from D754's plan and run it. This closes most
of `31-golden-colour-control`'s 277 findings. It is real build work, not detector triage —
give it its own session, not a slot next to the mixed backlog sweep.

## Read first

`.claude/plans/2026-08-23-colour-capability-grant-PLAN.md`, in full. It carries its own
cold-review findings, named failure modes per unit, and a feasibility-risk flag on the
riskiest unit. Do not start from memory of this file — read it fresh; verify the numbers
it quotes before trusting them (it says so itself).

## Where things actually stand (verified 2026-09-02, do not trust an older status line)

| Unit | Produces | Status |
|---|---|---|
| U2 — manifest-seed | `no_css_property` findings → 0 | **Done** (closed 2026-08-24; 27 → 4, remaining 4 are `option-picker`'s by design) |
| U1 — triage the 79 no-paint-path rows | Each row classified | **Done** — answered by an existing tool, not by hand |
| U6 — attribute-identity resolution | `resolveIdentity()` | **Not started** |
| U3 — `grant.js` build | The capability-grant tool itself | **Not started.** Confirmed: no file named `grant.js` or matching `*capability-grant*` exists anywhere in `plugins/sgs-blocks/scripts/` |
| U4 — batched execution | Grant run across 58 blocks, deployed + live-verified per batch | **Not started** (depends on U3) |
| U5, U7, U8, U10, U11 | Supporting units | Not started; not on the critical path to a first working grant |

**Critical path: U6 → U3 → U4, plan's own estimate ≈ 5.4 hours.** Treat that as the floor,
not a target — the plan flags U3's estimate as the one uncalibrated one in the set.

## The one thing to do before writing any code

The plan itself (section "U3 IS A FEASIBILITY RISK, NOT ONLY AN ESTIMATION RISK") says the
automation premise — that `grant.js` can reproduce, unattended, the same judgement six
blocks got by hand — is unproven. Its required first move:

> Point a throwaway `grant.js` at ONE already-migrated block and require it to reproduce
> the hand-written result. If it cannot reproduce a known-good answer, the automation
> premise is false and the programme re-scopes to assisted-manual before U3 is built.

Do this spike before committing to the full U3 build. It is cheap and it tells you whether
the rest of the plan is buildable as written.

## Sequence

1. Re-verify the numbers: `node plugins/sgs-blocks/scripts/colour-codemod/survey.js` and
   `node plugins/sgs-blocks/scripts/inspector-scan/run.js --json` (rule 31, run twice — the
   plan's own instruction, because a single run has been unreliable before).
2. Run the U3 spike against one already-migrated block. Report pass/fail before continuing.
3. If the spike passes: build U6 (attribute-identity resolution) — a genuine subset of U3's
   problem, and the plan's own recommended way to de-risk U3's estimate cheaply.
4. Build U3 (`grant.js`) with the two extra refusals the plan's cold-review found missing
   (see "`grant.js` needs two refusals the design did not list" in the plan).
5. Run U4 batched, one path-scoped commit per batch, full prebuild chain + `git diff --stat`
   after every batch — not a trust-the-green-run pass. The plan names this exact failure
   mode: "Coordinator trusts per-batch green... D750 recorded two agents shipping a defect
   while honestly reporting green."
6. Verification for U3 in particular is **computed style on the painted element, before and
   after, on a live probe page — never a page-HTML grep.** The plan is explicit that this
   check is silent otherwise: CSS is lifted to `uploads/sgs-css/<hash>.css`, so a source-diff
   won't show you whether the paint changed.

## Standing rules for this build

- One batch = one path-scoped commit, branch re-checked in the same command.
- `grant.js` and `fix.js` both write `block.json` — route both through one shared
  attribute-JSON-writing module (the plan's own instruction), not two implementations that
  can drift apart.
- Sequencing (`grant → survey → fix → adopt`) is not self-enforcing — add the guard the plan
  names before relying on running them in order by habit.
- Bean's mandate (D752) governs scope when it conflicts with the machinery: hover + gradient
  everywhere, across all 58 blocks. If a unit's own scope decision fights that, the mandate
  wins.

## Skills

| Skill | When |
|---|---|
| `/autopilot` | First, before any response |
| `/qc-council` | Before trusting the U3 spike's result, and before any batch's commit |
| `/systematic-debugging` | If the spike fails and the automation premise needs re-diagnosing |
| `/phase-planner` | Turning this plan's work units into an executable step sequence, once the spike passes |
| `/verify-loop` | Two independent attestations per batch before commit |
| `/handoff` | Session close |
