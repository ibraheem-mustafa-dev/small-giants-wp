# Session prompt B — three gate and verification items

Paste this whole file into a fresh session.

---

Invoke `/autopilot` before doing anything else.

**Plan label:** `[PLAN: opus]` for Phase 0; Phases 1–3 are largely dispatchable.
**USP:** every item here is a hole in the safety net rather than a feature. One of them let a
client-facing bug live in `sgs/hero` indefinitely — the overlay gradient was silently replaced by
the flat colour and no gate in a ~55-gate chain could see it. Closing these means the next bug of
that shape fails a build instead of shipping.

## Read first (cold entry)

1. `.claude/reports/2026-08-21-unenforced-prohibition-register.md` — where these three came from
2. `reports/visual-diff/hero-overlay-gradient-2026-08-21.md` — the bug item 2 would have caught
3. `plugins/sgs-blocks/scripts/check-fx-list-drift.py` — item 1's target
4. `plugins/sgs-blocks/CLAUDE.md`, the gates section — how gates are wired and baselined here

## The through-line

All three are the same failure in different clothes: **a check that cannot fail, and therefore
proves nothing.** Item 1 is a gate admitting two of its seven invariants are vacuous. Item 2 is a
whole class of defect nothing checks. Item 3 is three claims marked verified that were never
tested. Treat "it passes" as a hypothesis in all three.

---

## PHASE 0 — decide the shapes, inline — `[SESSION-START]`

**Model:** inline · **Time:** 30 min · **Exec:** SEQUENTIAL · **Deps:** none

Answer four questions in writing before dispatching anything.

**Q1 — what are I4 and I5 actually failing to prove?** Run
`python plugins/sgs-blocks/scripts/check-fx-list-drift.py --self-test`. It reports
*"unproven: I4, I5. Those invariants read green forever."* I4 checks that every non-universal
`FX_ATTR_MAP` key is claimed by an effect; I5 checks that param-scope rows reference only real
keys and shipped effects. **Decide whether each is unprovable because (a) the self-test cannot
construct a breaking case, or (b) the invariant is genuinely unreachable given current data.**
These need different fixes: (a) is a better self-test, (b) is either dead logic to delete or a
data gap to fill. Do not fix before classifying.

**Q2 — what tool catches an undefined variable in `render.php`?** This is the big one. PHP
evaluates an undefined variable to null with a notice, notices are not surfaced, and nothing in
the prebuild chain looks. **Intelephense caught the hero bug in seconds** the moment the file was
opened, which proves the class is statically detectable. **Choose the instrument:** PHPStan (level
0 catches undefined variables and is the industry default for this), Psalm, or a bespoke check.
Recommend PHPStan at the lowest useful level, scoped to `src/blocks/*/render.php` first.
⚠ `render.php` files are unusual — `$attributes`, `$block` and `$content` are injected by
WordPress and are undefined by static analysis. Any tool will flood on those unless they are
declared or baselined. **Decide how to handle that before writing config**, or the gate is
unusable on day one.

**Q3 — baseline or clean start?** These files will have pre-existing findings. **Decide: baseline
everything and gate only on NEW findings, or fix first and gate clean?** Recommend baseline —
gating on new findings delivers value immediately, and a clean-up can follow. Whatever you pick,
the baseline must be committed and reviewable, not generated silently.

**Q4 — how do the three gap-register claims get verified?** They are: does `fx-morph` work live;
is D451's motion-path repeat-trigger defect still present; is "good by default" true for
pin / scrub / scramble / split-reveal. Each needs a canary page and a probe.
`plugins/sgs-blocks/scripts/motion-qa/` already holds probes — check whether one covers each case
before writing anything new. **Decide which are answerable with existing probes and which need a
new fixture.**

**Outcome:** four written answers, including a named tool for Q2 and a baseline decision for Q3.
**Test — Happy:** a cold agent can write the gate config without another decision.
**Edge:** if PHPStan floods on WP-injected variables, the answer to Q2 is incomplete — resolve it
here, not mid-implementation.
**Fail:** if Q1 cannot classify I4/I5, read the invariants' source and their self-test fixtures
before guessing.
**Integration:** Q2 and Q3's answers become the gate config directly.

## QA Gate 0 — the shapes are decided

**Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Phase 0
**Check:** Q2 names one specific tool and one specific scope; Q3 is baseline or clean, not both.
**Pass:** both concrete. **Fail:** return to Phase 0.

---

## PHASE 1 — the undefined-variable gate — `[SESSION-START]`

**Model:** sonnet · **Time:** 1.5 h · **Exec:** PARALLEL with Phase 2 · **Deps:** QA Gate 0
**Files:** a new config at repo root or `plugins/sgs-blocks/`, plus `package.json` prebuild wiring
**Action:** install and configure per Q2, scope per Q2, baseline per Q3, wire into `prebuild`.
**⛔ Prove it catches the real thing.** The regression fixture is the actual hero bug: pass an
undefined `$overlay_gradient` to a function and confirm the gate fails. If it does not catch that
exact case, the gate is not worth having — this is its whole reason to exist.
**⛔ Wire it in the SAME commit that builds it.** This repo has a recorded failure where a gate sat
unwired for three weeks while docs claimed it ran. Grep `package.json` to prove it is reachable.
**On-fail:** remove the prebuild wiring, keep the config, report why.
**Cold-entry:** Q2 and Q3's answers plus `reports/visual-diff/hero-overlay-gradient-2026-08-21.md`
**Test — Happy:** the hero-bug fixture FAILS the gate. **Edge:** WP-injected `$attributes` does
NOT flood it. **Fail:** a clean tree passes (no false positives). **Integration:** `npm run build`
still exits 0 on the real tree.

## PHASE 2 — I4 / I5 in check-fx-list-drift — `[SESSION-START]`

**Model:** sonnet · **Time:** 1 h · **Exec:** PARALLEL with Phase 1 · **Deps:** QA Gate 0
**Files:** `plugins/sgs-blocks/scripts/check-fx-list-drift.py` only
**Action:** per Q1's classification — either extend the self-test so it can construct a breaking
case for each invariant, or delete/repair the invariant if it is genuinely unreachable.
**On-fail:** revert; the gate currently passes, so a bad fix is worse than the status quo.
**Cold-entry:** Q1's answer plus the script
**Test — Happy:** `--self-test` reports zero unproven invariants. **Edge:** the gate still passes
on the real tree (`--check`). **Fail:** break each invariant deliberately and confirm `--check`
now fails for it — that is the whole point. **Integration:** `npm run build` exits 0.

## QA Gate 1 — Phases 1 + 2

**Model:** haiku · **Exec:** SEQUENTIAL · **Deps:** Phases 1, 2
**Check:** `npm run build` exit 0; `check-fx-list-drift.py --self-test` reports no unproven
invariants; the new gate is greppable in `package.json`; the hero-bug fixture fails it.
**Pass:** all four. **Fail:** revert the offending phase only.

---

## PHASE 3 — the three unverified gap-register claims — `[HANDOFF]`

**Model:** sonnet, one agent per claim, PARALLEL · **Time:** 1.5 h · **Deps:** QA Gate 1
**Files:** `.claude/plans/2026-08-03-motion-gap-register.md` plus any new probe or fixture
**Action:** answer each of the three claims with live evidence, then update the register from
UNVERIFIED to a dated verdict. A canary deploy is needed first — `build-deploy.py --target
sandybrown` refuses a dirty tree, so commit Phases 1–2 before starting.
**⛔ Each verdict needs a negative control.** "It works" without one is the failure mode this
whole prompt exists to close. Prove the probe can report failure before trusting a pass.
**On-fail:** mark the claim UNVERIFIED with the reason. An honest unknown beats a false verified —
that is exactly how these three got here.
**Cold-entry:** Q4's answer, the gap register, `plugins/sgs-blocks/scripts/motion-qa/`
**Test — Happy:** each claim carries a verdict plus evidence path. **Edge:** a claim that turns
out unanswerable is recorded as such, not quietly dropped. **Fail:** the negative control shows
the probe can fail. **Integration:** the register's own counts match its contents afterwards.

---

## Key Judgement Calls

- **Q2, which static analyser** — recommend PHPStan at the lowest useful level, `render.php` only
  to start. Cost of wrong choice: a flood of noise, the gate gets disabled, and the hole reopens.
- **Q3, baseline vs clean** — recommend baseline. Cost of wrong choice: the gate never ships
  because the cleanup never finishes.
- **Q1, fix vs delete an invariant** — needs the classification first. Cost of wrong choice:
  deleting a check that was merely untested, which is strictly worse than leaving it vacuous.

## Pre-emptive decisions, so nothing pauses mid-execution

- **"The gate finds hundreds of pre-existing issues."** Expected. Baseline them per Q3 and gate on
  new findings only. Do not fix them in this session.
- **"Can I just trust that the gate works because it passes?"** No. A gate that has never failed
  is indistinguishable from a gate that cannot fail — that is item 1's entire lesson. Break
  something on purpose and watch it go red.
- **"Should I add these to parking?"** No. Bean's rule: parking is for BLOCKED or POSTPONED work
  only, and never without asking him first.
- **"The register says a defect exists — do I trust it?"** No. Every claim in it carries a date
  and several were already stale on 2026-08-21. Verify against the code first.
