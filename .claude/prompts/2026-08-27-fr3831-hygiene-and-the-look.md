# FR-38-31 — clear the hygiene debt, fix three live bugs, then change four CSS values

Invoke `/autopilot` before anything else.

**Your job: execute `.claude/plans/phase-1-fr3831-hygiene-and-look.md`.** That plan holds every
step, test, threshold and pre-made decision. This prompt tells you what to read, which tools to
reach for, and what not to redo.

⛔ **The plan supersedes `.claude/reports/2026-08-25-flowing-gradient-technique-spec.md`.** A
six-seat council returned NO-GO on that spec and the NO-GO still stands — verified 2026-08-26, the
file is unchanged. Do not build shader work from it.

---

## 1. Read these, in this order

1. `.claude/plans/phase-1-fr3831-hygiene-and-look.md` — **read it in full.** It is the session.
   Its Pre-conditions table is five commands; run them before Step 1.
2. `.claude/decisions.md` **D790, D791, D794** — Gate E's ruling, the Q6 cost figures, and the
   redaction incident that produced the GLSL gate.
3. `.claude/specs/38-SGS-MOTION-SYSTEM.md` §1.2b (Tier W) and FR-38-31 — the doctrine you work
   inside, including the CSS fallback contract that KJC-2 proposes amending.

Read the plan's KJC section before Step 1, not when you reach it. Two of the four calls are Bean's,
and hitting them cold wastes a session.

---

## 2. What this session does NOT redo

Closed on 2026-08-25/26. Re-running any of it burns hours for nothing.

- **Q6 is measured.** 0.373ms/frame GPU (RTX 2060, 1393×761). The post pass is 0.261ms of that —
  70%. Harness: `.claude/scratch/stripe-hero-poc/perf/measure-frame-cost.mjs`.
- **Fidelity generalises.** 0.66% → 0.67% held-out → 0.69% at DPR 2. The comparator is committed at
  `perf/compare.py` and validated against a known answer.
- **Gate E is scoped and deferred.** 26 files, manifest by content. **Bean ruled it waits until the
  rework ships**, so the POC stays available as the reference. Do not delete it.
- **The tracked GLSL is redacted** and `.claude/hooks/check-no-third-party-glsl.py` enforces it.
- **The council ran.** Its register lives in the plan's opening table. Do not re-run it.

---

## 3. Skills — invoke each at its point of use

| Skill | When |
|---|---|
| `/autopilot` | First, before any response. Establishes routing for the session. |
| `/delegate` | Before every Agent dispatch. The plan records each tier already; re-run it if you change a step's shape. |
| `/dispatching-parallel-agents` | Steps 1 and 2 only. ⛔ Nothing else in Phase 1 parallelises — see §5. |
| `/subagent-driven-development` | Step 4. Implementer plus two reviewers. |
| `/qc-council` | QA Gate B, on the Step 4 diff. Each seat must give a predicted observable and the command that checks it. |
| `/sgs-wp-engine` | Any block, theme or effect edit. |
| `/wp-sgs-deploy` | Step 6. Wraps `build-deploy.py`. |
| `/ui-ux-pro-max` | Step 5, to choose the hue-adjacent palette. |
| `/systematic-debugging` | If a bug resists the plan's stated fix. Prove the cause before changing code. |
| `/visual-qa` + `/a11y-audit` | QA Gate C, alongside the plan's own checks. |
| `/capture-lesson` | Any new architectural rule the session surfaces. |
| `/handoff` | Session close. |

**Do not invoke `/brainstorming` or `/strategic-plan`.** The design is settled and the plan is
written. Reopening either is how this work stalls.

---

## 4. Tools

| Tool | Use it for |
|---|---|
| Playwright MCP | QA Gate C — live DOM, context-loss test, screenshots at 1440/768/375 |
| `python .claude/hooks/check-no-third-party-glsl.py` | Gate A, first half |
| `python .claude/hooks/handoff-preflight.py --check` | Must pass before the session closes |
| `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` | Step 6, the only deploy path |
| `ssh hd` | Canary shell. Credentials: `.claude/secrets/sandybrown.env` (gitignored, always present) |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | Framework DB. Query it before claiming anything is missing. |
| `python ~/.agents/skills/shared-references/docscore.py <file> --type <type>` | Score any doc you write |

**Canary target: page 2740**, `[GATE — DO NOT DELETE] Flowing gradient — FR-38-31`. Verified live
on 2026-08-26 as the only post using the effect.

---

## 5. Hazards this work has already produced

- ⛔ **Almost every Phase 1 task touches `fx-wave-gradient.js` and `wave-gradient.js`.** Parallel
  agents on those files clobber each other. All edits go through one agent, in one commit.
- ⛔ **`main` is shared by five tracks.** Re-derive the D-ceiling immediately before each commit and
  commit by explicit path. Never `git add -A`.
- ⛔ **`LEDGER.md` sits at its byte cap.** Fold your update into the motion-track section; adding
  lines trips rotation on a file other tracks are using.
- ⛔ **Git Bash heredocs strip backslashes here.** Write scripts to a file and run them.
- ⚠ **A gate that scans nothing must fail, not pass.** Two detectors written this week returned
  zero files and would have reported success: a git pathspec `*` does not recurse, and
  `dirname(dirname(__file__))` from `.claude/hooks/` lands on `.claude/`, not the repo root.
- ⚠ **Verify a claim before acting on it**, including your own diagnostic output and any subagent's.
  This week that caught a council seat's contrast figure (2.7:1, actually 3.36:1), an over-broad fix
  that would have breached an MIT licence, and a filename asserting it was a live capture when the
  file was a rig render.

---

## 6. Start here — under five minutes

Run the plan's five Pre-conditions. They are one command each, and condition 3 (re-derive the
D-ceiling) has already caught two collisions this week.

Then dispatch Steps 1 and 2 in parallel. They are the only two steps that may run together: Step 1
reads and writes a report, Step 2 creates a new file. Neither touches shipped source.

---

## 7. Where Bean decides

Four calls. Bring each to him rather than choosing.

1. **KJC-1 — the look verdict at QA Gate C.** If he still dislikes it, the default is **stop and go
   to the client builds**, not more shader work. ⭐ The council's sharpest finding: he rejected the
   effect as *"B-movie 3D VFX"*, and the spec's top-ranked mechanism builds a sculpted 3D ribbon
   with its flattening antidote deferred. Building it bets against the diagnosis.
2. **KJC-2 — the CSS fallback contract.** Spec 38 binds it to mirror the shader forever. Striations
   cannot be expressed in CSS, so the obligation is unsatisfiable as worded.
3. **KJC-3** is settled; do not re-litigate it.
4. **KJC-4 — the technique spec's legal framing.** Three overstatements to correct. A council seat
   recommends an hour of UK IP solicitor time on s.50BA and on SGS's client indemnity, which is
   where the real exposure sits. ⚠ Nobody in this loop is a lawyer.

---

## 8. Done when

- Both hygiene gates pass, and the attribution gate failed before the fix and passes after.
- The three live bugs are fixed, deployed, and verified on page 2740 — including the context-loss
  test, which must run live.
- The recoloured hero is live and **Bean has given a verdict**.
- Every QA gate closed with its doc update. `handoff-preflight.py --check` passes.
- Phase 2 is either cancelled or scoped from Bean's actual words.

⭐ **The prize: the rejected look is four CSS values in one uncompiled file.** `fxWaveBase` and
`fxWave1..3` all default to `''`, FR-38-31 defaults to off, and only page 2740 uses it. Roughly
thirty minutes of work answers the question the last three sessions circled.
