---
doc_type: plan
plan_id: spec-verification-programme
project: small-giants-wp
created: 2026-08-17
status: ACTIVE — not started
sessions: 6 (one doc per session, plus one close-out)
---

# Spec verification programme — one doc per session

**USP:** Right now no completion claim in Spec 32, Spec 35 or the Track 1b plan can be trusted,
because most were never tested against the code. This programme replaces every claim with a verdict
that carries a re-runnable command. After it, "done" means something.

**Plan label:** `[PLAN: opus]` — verdict assignment is judgement; the mechanical halves delegate.

---

## The rule that makes this work

This programme exists because the 2026-08-17 audit produced claims with no verification. The worst
one: I judged whether a component had been split by its **file's line count**, never opened the file,
and wrote the wrong answer into two governing docs.

So, one rule, applied to every point:

> **No verdict without a command and its raw output. No doc edit from a number you did not
> personally re-derive.**

Three things follow from it, and they are not optional.

**1. Every point carries an evidence class.**

| Class | Meaning |
|---|---|
| `LIVE` | Observed in the running editor or on the rendered page |
| `RAN-TOOL` | A gate/detector was run; its output is the verdict |
| `READ-CODE` | The file was opened and read |
| `AGENT` | A subagent reported it — **not yet verified** |

**2. `AGENT` never reaches a doc.** An agent's number gets re-derived by the main session first, or
it is written as `UNVERIFIED` in plain sight. Agents miscounted three times on 2026-08-17 — twice
counting comments as live code usage, once from a Windows path split.

**3. Metadata is not evidence.** A filename, a line count, a file's existence, a grep hit count.
None of these decide a verdict. Open the file.

---

## How to talk to Bean during these sessions

**Plain English, always.** No jargon without a plain-English anchor first. A file path or function
name is fine *after* you have said what the thing does and why it matters. Bean is a non-coder — if a
sentence needs three proper nouns to make sense, rewrite it.

**Never defer a decision. Ask it.**

⛔ Banned: "flagged for Bean", "needs your sign-off", "goes on a list", "we'll decide later",
"raised for a future session". Every one of those is a decision *not made* — it stalls the work and
grows a backlog nobody clears.

✅ Instead, the moment a decision is needed, say all four things and stop:

1. **The situation** — what is true, in plain words
2. **The options** — what each one actually means in practice, not just its name
3. **The recommendation** — one, not a menu of equals
4. **Why** — the reasoning, including what it costs if the choice is wrong

Then wait for the answer and carry on. A decision takes Bean under a minute when it is put like
that; a deferred one costs a whole session later.

**Summaries:** what happened → what it means → what is next. Short. Lead with the thing that
changes what Bean does.

**Never report a finding and stop.** Finding something is not the deliverable. Either fix it, or ask
which of the options Bean wants — in the same message.

---

## Method: the docs are a map, never the answer

This mirrors `/systematic-debugging`'s iron law — no fix without a proven root cause. Here: **no
verdict without direct evidence from the thing itself.**

> **A doc tells you WHICH FILE TO OPEN. It never tells you what is true.**

Use the docs for exactly three things: to locate the file, function or attribute; to learn what was
*intended*; to find the decision that explains why. Then close the doc and go to the source.

### The verification ladder — climb as high as the point needs

| Tier | Evidence | Settles |
|---|---|---|
| **1. LIVE** | Observed in the running system — the block editor or the rendered page on the canary | Anything. Highest authority |
| **2. SOURCE** | The file opened and read — the actual code, attribute, or markup | What the system is built to do |
| **3. TOOL** | A gate or detector's output, **when that tool's own `--self-test` passes** | Population-scale questions |
| **4. DOC** | ⛔ **Not evidence.** A claim awaiting verification | Nothing |

**A tool whose self-test fails is tier 4, not tier 3.** `inspector-scan` rule 21 fails its self-test
on `main` today — its numbers are claims, not evidence, until that is fixed.

### Live testing is required, not optional, for these

A static check cannot answer any of them. If a point is one of these, tier 2 is **not enough**:

- **Can the client actually reach it?** A control can exist in source and be unreachable — wrong tab,
  collapsed disclosure, a parent that never renders, a variant that hides it.
- **Does changing it do anything?** The 2026-08-17 audit found controls that painted nothing. Only
  moving the control and watching the page settles that.
- **Does it render correctly?** Anything about output, layout or applied styling.
- **Keyboard, focus and contrast.** No static detector in this repo covers them.

Canary + credentials: `.claude/dev-setup.md`; creds at `.claude/secrets/sandybrown.env`. Use Playwright MCP.

### The three traps this ladder exists to stop

Each one happened on 2026-08-17:

1. **Judging a file by its metadata.** I decided a component had not been split from its *line count*
   and never opened it. It had been split — the six panels were in its export list.
2. **Trusting a doc's own status line.** Spec 32 said "ROLLOUT ONGOING" while root `CLAUDE.md` said
   "COMPLETE". Neither was evidence; running the gate was.
3. **Counting name-mentions as usage.** Three separate agents counted comments saying a component
   *used to* live somewhere as live usage. Check imports and `<JSX` mounts.

---

## Order of docs, and why

| # | Session | Doc | Why here |
|---|---|---|---|
| 1 | S1 | **Spec 32** (~500 lines, 11 FRs) | Smallest and most self-contained. Proves the method before the expensive docs. It already has a status block to test the method against |
| 2 | S2 | **Spec 35 Parts A–L** | The client-facing standard. Part L is the definition-of-done and drives everything else |
| 3 | S3 | **Spec 35 Parts M–O** | Part O is the folded-in contract (14 control types). Split from S2 because Spec 35 is now 2,676 lines — one session cannot verify it honestly |
| 4 | S4 | **Track 1b plan** | Register + every phase/task/wave step. Depends on S2/S3 verdicts |
| 5 | S5 | **capability-routing doctrine** (~600 lines) | Smallest remaining; mostly confirms or contradicts S2–S4 |
| 6 | S6 | **Close-out** | Point 2 (archive sweep) + Point 3b (cross-doc consistency). Only possible once every doc is verified. **No live backlog** — each session cleared its own |

---

## ⛔ MANDATORY READING GATE — read these IN FULL before Step 1

Not a skim. Not a grep. **End to end, before touching anything.**

The reason is this project's own hard rule: issues surface mid-work in sections you weren't planning
to touch, and with the whole doc already in your head you can diagnose them instead of guessing. It
is also how the 2026-08-17 session went wrong — a section was judged from a summary of it rather than
the thing itself.

### Every session, without exception

| Read fully | Why |
|---|---|
| **This plan** | The loop, the ladder, the rules. You cannot run the session without it |
| **`.claude/LEDGER.md`** | Where the project actually is today |
| **`CLAUDE.md`** (root) + **`.claude/CLAUDE.md`** | The 7 non-negotiable rules and the doc conventions |
| **`.claude/STOP-CATALOGUE.md`** | Every recorded failure pattern. Several fired during 2026-08-17 |

⚠ **Read as reference, never as truth:**
`.claude/reports/2026-08-17-track1b-spec35-32-completion-audit.md` — the prior audit. **Its verdicts
are unverified input.** Use it to find *where to look*, never to decide what is true. Roughly a third
of it rests on single-agent reports that were never re-derived.

### ⛔ NOT in the reading gate: `.claude/decisions.md` and `.claude/memory/decisions-archive.md`

**Do not read the decision logs before starting.** Consult a specific decision only while
investigating a specific point, and only to learn *why* something was done — never to learn what is
true.

Three reasons, all of them live:

1. **They bias the investigation.** Read a decision saying "X was closed" and you go looking for
   confirmation of X instead of testing X. That is the failure mode this whole programme exists to
   break.
2. **A decision can be overturned by a later one, and the earlier entry is rarely updated.** Part L
   still cites a component D609 banned months later.
3. **A decision can simply be wrong.** They are written by session agents at the end of long
   sessions. Several from 2026-08-17 were provably wrong — one entry contradicted itself 60 lines
   further down, and reading only its opening produced a false finding that reached two governing
   docs.

A decision log sits at **tier 4** of the ladder, exactly like any other doc: it tells you where to
look and what was intended. It never settles anything.

### Per session

| Session | Read IN FULL before starting | Also open |
|---|---|---|
| **S1 — Spec 32** | `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` | Root `CLAUDE.md` Spec 32 section — it disagreed with the spec, so the disagreement itself is a finding |
| **S2 — Spec 35 A–L** | `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` **Parts A–L** | **Part G's verdict table** — it overrides Part L in at least two places, so Part L cannot be judged without it. `plugins/sgs-blocks/scripts/inspector-scan/rules.json` `_meta` (the mode table + the `zeroIsAClaim` doctrine) |
| **S3 — Spec 35 M–O** | `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` **Parts M–O** | `plugins/sgs-blocks/package.json` `prebuild` (the real wiring); `.githooks/pre-commit` + `sgs-gates.sh`. Part N's claims are about gates — read the gates, not the prose |
| **S4 — Track 1b plan** | `~/.claude/plans/go-track-1b-playful-hamster.md` — **all three PARTs** | S2+S3 verdict rosters. PART 3 is marked "settled, never a work-list" — verify that claim too |
| **S5 — doctrine** | `.claude/plans/spec-35-capability-routing-doctrine.md` | S1–S4 rosters. It mostly confirms or contradicts them |
| **S6 — close-out** | All five `points.json` rosters | `.claude/parking.md` in full (61 entries); both plans folders |

### Reading-gate self-check — answer before Step 1

1. Did I read the target doc **end to end**, or skim to the parts I expected to matter?
2. Can I name the sections that **contradict each other** inside it?
3. Do I know which of its claims are **status prose** versus **requirements**?

Any "no" → read again. Starting the loop half-read is how the last attempt failed.


### Running sessions in parallel — what is safe, and what is not

**Safe to run together: S1 + S5 only** (Bean-ruled 2026-08-17). Different target docs, no write
overlap, and S5 is small. **S4 is NOT in the parallel set** — its register cross-references Spec 35
throughout, so it runs after S2/S3 have produced their verdicts.

⛔ **NEVER run S2 and S3 in parallel.** Both write to the same file — Spec 35, Parts A–L and Parts
M–O. Concurrent edits collide and the later write silently clobbers the earlier. Sequential, always.

⛔ **ONE CANARY LOCK.** Every session's Step 4b deploys to the same canary. Two sessions deploying at
once means each is live-testing the other's code without knowing it — the exact class of error this
programme exists to remove. Whoever is running a live pass holds the canary; the others do their
static work and wait.

⚠ **Shared worktree.** Concurrent sessions committing to `main` has caused real trouble here — it is
why the pathspec-scoped commit gate exists. Commit with an explicit pathspec, never `git add -A`, and
re-check `git status` for another session's files before every commit.

**S6 cannot start until all five rosters exist** — it resolves disagreements between them.

Schedule: **`S1 ∥ S5` → `S2` → `S3` → `S4` → `S6`.** Six sessions become five slots.

---

## The loop — identical in every doc session

Same seven steps each time. Learn once, run five times.

### The roster schema — ONE row per point, these exact field names

Every step below adds fields to the same row. **Use these names exactly** — QA Gate A queries them
by name, and a differently-named field fails the gate against otherwise-correct work.

```jsonc
{
  "id":       "S32-FR-01",            // step 1
  "section":  "§4 FR-32-1",           // step 1
  "quote":    "<the claim, verbatim>",// step 1
  "type":     "requirement",          // step 1 — requirement|status-claim|checklist-item|step
  "grouped_with": null,               // step 1b — parent "FR-32-N" when this is an UNNUMBERED
                                      //   normative statement that restates an existing FR.
                                      //   null for everything else. Never used to copy a verdict
                                      //   across unmatched: a BROADER child stays PARTIAL.
  "predict":  "if done, X returns 0", // step 2 — written BEFORE running
  "command":  "node scripts/…",       // step 2 — '' if live-only
  "live":     false,                  // step 2 — true = settle at step 4b
  "output":   "<verbatim stdout>",    // step 3  ⛔ this exact key
  "verdict":  "DONE",                 // step 4 — DONE|PARTIAL (n/m)|NOT-DONE|UNVERIFIABLE
  "evidence": "RAN-TOOL",             // step 4 — LIVE|RAN-TOOL|READ-CODE|AGENT
  "disposition": null                 // step 4 — DELETE|KEEP(<reason>), superseded points only
}
```

### Step 1 — Extract the point roster `[SESSION-START]`
- **Model:** sonnet (mechanical)
- **Action:** Walk the doc top to bottom. Emit one row per checkable point to
  `scratchpad/<doc>-points.json`: `{id, section, quote, type}` where `type` is
  `requirement | status-claim | checklist-item | step`.
- **Files:** the target doc (read-only), `scratchpad/<doc>-points.json`
- **Outcome:** Every section has ≥1 row, or an explicit `no-checkable-points` marker.
- **Cold-Entry:** this plan; the target doc; `.claude/reports/2026-08-17-track1b-spec35-32-completion-audit.md`
- **Time:** 15 min
- **On-Fail:** If a section resists extraction, record it as `MANUAL` and handle it inline. Never skip.
- **Test:** *Happy:* row count ≥ section count. *Edge:* a prose section with no testable claim gets
  `no-checkable-points`, not silence. *Fail:* malformed JSON → regenerate, do not hand-patch.
  *Integration:* standalone.

### Step 1b — Triage the UNNUMBERED normative statements `[ADDED after S1, 2026-08-17]`
- **Model:** inline (judgement — a script cannot decide this)
- **Action:** Walk every row typed `requirement` that carries NO `FR-` id. For each, decide which
  of three things it is, and record the decision on the row.
- **Time:** 15 min
- **Files:** `.claude/scratch/<doc>-points.json`

**Why this step exists.** S1 found that all six of Spec 32's §3 "hard constraints" — binding,
unnumbered, no `Done when:` — were **restatements of FRs that were already verified elsewhere**.
Without this step they read as six unverified requirements. Two wrong reflexes were both tried and
both rejected:

- ⛔ **Do NOT demote them** ("only numbered items are binding"). That turns *an agent forgot to
  number this* into *this is no longer a requirement* — de-scoping by clerical accident, which is
  the exact failure class this programme exists to stop. **A missing number NEVER de-scopes a
  requirement. Identification is by CONTENT — is it binding? — never by formatting.**
- ⛔ **Do NOT blanket-promote them** to new FR ids either. On Spec 32 that would have manufactured
  six duplicate requirements, each a second copy of an FR, each then drifting independently.

**The three outcomes — pick one per statement, per case:**

| Outcome | When | What to record |
|---|---|---|
| **GROUP** | It is the end-goal, restatement or plain-English framing of an existing FR | `grouped_with: "FR-32-N"`, and inherit that FR's evidence **only so far as it genuinely settles this claim** |
| **PROMOTE** | Genuinely distinct and covered by no FR | Give it its own FR id at Step 5; it then needs its own `predict`/`command` like any requirement |
| **RECLASSIFY** | It is not a requirement at all — a decision rule, a definition, or rationale | Re-type the row; say what it governs |

**⛔ Grouping is NOT free inheritance — this is where the judgement actually bites.** Copying the
parent's verdict across is the whole trap. Compare the two claims:

- If the child's claim is the SAME as its parent's → it inherits the verdict and the evidence.
- If the child's claim is **BROADER** than its parent's → it stays `PARTIAL`, and the reason names
  the gap. Worked example from S1: §3's *"No client brand value hardcoded in block PHP/JS/CSS"*
  grouped to `FR-32-6`, whose evidence covers the reference block's fallbacks and the one known
  `product-card` hardcode. But the constraint claims *no client value anywhere in ANY block* — a
  population claim nothing in the session measured. It stayed `PARTIAL` with that gap stated.

**Also at this step — a `Done when:` clause naming a verifier is a RESOURCE, not a defect.** When a
requirement names its own check and that check does not exist, the requirement is telling you what
to build. `FR-32-9` requires a *"lint/grep check per component"*; no such script exists. That is the
cheapest verification work in the programme — build it and the requirement becomes self-verifying.
Record it as a Step 7 item against the spec that owns it; never mark the requirement DONE because
the sentence exists.

- **Outcome:** No row typed `requirement` is left both un-numbered and un-triaged.
- **On-Fail:** Genuinely ambiguous ownership → **ask Bean in that moment** with the statement, the
  two or three candidate parents, your recommendation and why. Do not guess and do not park it.
- **Test:** *Happy:* every unnumbered requirement carries `grouped_with`, a promotion note, or a
  re-type. *Edge:* a statement broader than its parent is `PARTIAL`, never `DONE`-by-association.
  *Fail:* a row silently inherits a verdict with no reason recorded. *Integration:* the counts move
  only for rows whose parent evidence genuinely covers them.

### Step 2 — Predict before running
- **Model:** inline
- **Action:** For every row, write `predict` and `command` **before running anything**. The
  prediction states what the command returns if the point is implemented.
- **Outcome:** No row has an empty `predict` or `command`.
- **Time:** 20 min
- **On-Fail:** A point no static command can settle is tagged `live` and carried to Step 4b — it is
  NOT a dead end. Record the exact live check it needs (reachable? / does it do anything? / correct?).
- **Test:** *Happy:* 100% of rows carry both fields. *Edge:* a point needing a browser is marked, not
  guessed. *Fail:* a prediction that cannot fail is rewritten. *Integration:* standalone.

### Step 3 — Run and capture
- **Model:** sonnet (dispatch) — mechanical execution only
- **Action:** Run every command. Capture verbatim output into the row. Prefer the repo's own
  detectors over hand-rolled greps.
- **⛔ `git grep` only, never `grep -r`.** `.claude/worktrees/` holds 17 stale repo copies; naive
  grep inflates counts ~18×.
- **⛔ Never `| head` a command that defines a population.** Count first (`| wc -l`).
- **⛔ `$?` after a pipe reads the last command's status.** Redirect first, then check.
- **Outcome:** Every row has raw output.
- **Time:** 20 min
- **On-Fail:** Command errors → fix the command, not the verdict.
- **Test:** *Happy:* rows with output = rows total. *Edge:* zero-match greps exit 1 — that is data,
  not failure. *Fail:* a timeout is recorded, never silently dropped. *Integration:* standalone.

### Step 4 — Assign verdicts
- **Model:** inline (judgement)
- **Action:** Set `verdict` ∈ `DONE | PARTIAL (n/m) | NOT-DONE | UNVERIFIABLE`,
  `evidence` ∈ `LIVE | RAN-TOOL | READ-CODE | AGENT`, and where the point is superseded,
  `disposition` ∈ `DELETE | KEEP(<reason>)`.
  ⛔ `SUPERSEDED` is **not** a resting verdict — it resolves to a disposition and the entry goes.
- **⛔ If the command did not decide it, open the file.** Metadata never decides a verdict.
- **⛔ Before `NOT-DONE`, check for a successor.** A component with zero usages may have been
  replaced, not abandoned. Two of this class on 2026-08-17 (`SgsLinkControl`, `StateToggleControl`).
- **⛔ Before `NOT-DONE`, check whether a later ruling killed the requirement.** Spec 35 Part L
  contradicts Part G in two places.

**Superseded items — DELETE by default (Bean-ruled 2026-08-17):**

When a point is superseded, **delete it, and make sure the replacement is written up.** Do not leave
a tombstone, a struck-through line, or a "see X instead" redirect.

The reasoning, and it is the whole point of this programme: **a superseded record is grep-bait.** An
agent searching for a term finds the dead one, treats it as live, and acts on it — exactly the
surface-level check this plan exists to stop. At best the record redirects to its replacement, which
the replacement's own entry already does. So it adds confusion and work, and buys nothing.

| Disposition | When | Requirement |
|---|---|---|
| **DELETE** (default) | The replacement is documented elsewhere | Confirm the replacement is genuinely written up **first**. Then delete the old entry outright |
| **KEEP** (exception) | Real context makes the record useful — e.g. it records *why* an approach was rejected and that reasoning would otherwise be re-derived | Must carry a one-line named justification. No justification = delete |

Handle these **per case**, not in a batch: each needs the "is the replacement actually written up?"
check before anything is removed.

⚠ **Do not delete the underlying need along with the dead mechanism.** If the requirement was real
and only the named mechanism died, the need moves to the replacement's entry. Worked example: the
`StateToggleControl` entry should go, but the problem it was meant to fix — two parallel hover
systems — is real and belongs in the D609 colour-toggle entry. (Note: the **colour** subset already
uses the D609 toggle, so re-derive what is genuinely still divergent before writing it up.)
- **Outcome:** Every row has a verdict and an evidence class.
- **Time:** 30 min
- **On-Fail:** Genuinely ambiguous → `UNVERIFIABLE` with the reason. Never guess.
- **Test:** *Happy:* no row is `AGENT`. *Edge:* a superseded item is `SUPERSEDED`, not `NOT-DONE`.
  *Fail:* a verdict without output is rejected. *Integration:* cross-check against the 2026-08-17
  audit report; note every disagreement.

### Step 4b — Live verification pass `[REQUIRED EVERY SESSION]`
- **Model:** inline (Playwright MCP)
- **Action:** Deploy, then settle **every** point this doc marked live-only. No point leaves a
  session unverified.
- **Deploy:** `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`
- **Creds:** `.claude/secrets/sandybrown.env` — always available, do not ask
- **Check, per point:**
  1. **Reachable?** Open the block in the editor. Is the control actually visible — right tab, not
     buried behind a disclosure, not hidden by the active variant?
  2. **Does it do anything?** Change the value. Watch the canvas and the rendered page.
  3. **Correct?** Compare against what the point claims.
- **Outcome:** Every live-only point has `LIVE` evidence and a verdict. Zero left marked.
- **Time:** 30 min (+ ~5 min deploy)
- **On-Fail:** Canary unreachable → **stop, do not mark them passed.** `plugins/sgs-blocks/scripts/no-inline/check-no-inline.py` (note the `no-inline/` subdirectory — citing it bare is a known trap) warns and
  PASSES when the canary is down; a green run on a disconnected machine proves nothing. Carry the
  points to the next session rather than recording a false pass.
- **Test:** *Happy:* a control moved on-screen changes the rendered output. *Edge:* a control that
  renders but is unreachable is `NOT-DONE`, not `DONE` — existing in source is not the bar.
  *Fail:* deploy fails → nothing is marked verified. *Integration:* `payload-verify PASS: all 83`.

### QA Gate A — prove the verdicts
- **Model:** inline
- **Exec:** SEQUENTIAL. Deps: steps 1–4.
- **Check:**
  1. `jq '[.[] | select(.evidence=="AGENT")] | length'` → **must be 0**
  2. `jq '[.[] | select(.verdict!=null and .output==null)] | length'` → **must be 0**
  3. Pick 3 `DONE` rows at random; re-derive each independently, by a different command
  4. Seed one deliberately false point; confirm the method returns `NOT-DONE`
- **Pass:** 0, 0, three matches, and the seeded point fails.
- **Fail:** Any mismatch → redo step 4 for that section. Do not proceed.
- **Marker:** QA

### Step 4c — Close-out review with Bean `[DECISION GATE]` `[ADDED after S1, 2026-08-17]`
- **Model:** inline
- **Exec:** SEQUENTIAL. Deps: Step 4, 4b, QA Gate A. **Blocks Step 5.**
- **Time:** 10 min to present; however long Bean's answers take

**Why this sits BEFORE Step 5, not after.** Step 5 writes every verdict into the spec. If Bean then
decides to close out three open items, those same claims have to be rewritten a second time — the
doc is updated twice over for one session's work, and the intermediate version is a published state
that was never true for more than an hour. Verdicts are only final once Bean has had the chance to
act on them. So: **present, decide, close out, THEN write once.**

**Action.** Convert the roster from a verdict tally into an ACTIONABLE view and put it in front of
Bean. A verdict distribution is not a decision aid — "14 PARTIAL" tells him nothing about what to do.
Re-cut every non-DONE row into these buckets, and for each item give the residual scope, what it
would take to close, and a time estimate:

| Bucket | Means | What Bean needs to see |
|---|---|---|
| **Nothing to do** | DONE | A count only. Do not enumerate |
| **Residual — small** | PARTIAL where the remainder is minutes | The item, the residual, the estimate |
| **Residual — real** | PARTIAL/NOT-DONE needing genuine build work | The item, why it matters, the estimate |
| **Not started** | The spec requires it and NOTHING exists | Name it plainly — this is the bucket most likely to be mistaken for "partly done" |
| **Blocked on a fixture** | UNVERIFIABLE because the test surface does not exist | What fixture would settle it, and its cost |
| **Needs a decision** | Cannot proceed without Bean choosing | Situation / options / recommendation / why |
| **Delete** | SUPERSEDED with a DELETE disposition | The entry and its replacement, for confirmation |

**⛔ Separate NOT-STARTED from PARTIAL explicitly.** They collapse into each other in a verdict
count and they are completely different decisions. S1's worked example: `FR-32-9` reads PARTIAL —
the naming convention IS followed — but the per-component lint gate it requires has **never been
built**. "Partly done" and "half of it does not exist" need different words in front of Bean.

**Then act on the answers BEFORE Step 5.** Anything Bean elects to close out gets built and verified
in this session, and its row is re-judged with the new evidence. Step 5 then writes the doc once,
reflecting the final state.

- **Outcome:** Every non-DONE row has been seen by Bean, bucketed, and either closed out this
  session or explicitly left open with its reason recorded.
- **On-Fail:** Bean unavailable → do NOT guess which to close. Write the doc with the verdicts as
  they stand and carry the close-out list into the next session, named.
- **Test:** *Happy:* every non-DONE row appears in exactly one bucket with an estimate. *Edge:* a
  NOT-STARTED item is never presented as PARTIAL. *Fail:* Step 5 runs before this gate returns.
  *Integration:* the doc is written exactly ONCE per session.

### Step 5 — Write verdicts into the doc
- **Model:** inline
- **Action:** Update each claim in place. Keep the original wording struck through where it was
  wrong; state the corrected verdict, the command, and the date.
- **Files:** the target doc
- **Outcome:** No claim in the doc disagrees with `points.json`.
- **Time:** 25 min
- **On-Fail:** `git checkout` the doc and redo. Never leave it half-corrected.
- **Test:** *Happy:* every `NOT-DONE`/`PARTIAL` row appears in the doc. *Edge:* a `SUPERSEDED` row
  says what replaced it. *Fail:* preflight passes. *Integration:*
  `python .claude/hooks/handoff-preflight.py --check` → all 9 pass.

### Step 6 — Reverse check (Point 3a)
- **Model:** sonnet (dispatch), verified inline
- **Action:** The opposite direction: find what **exists in the code but is absent from the doc**.
  Scan the doc's own subject surface — its scripts, components, attributes, gates — and list anything
  live that the doc never mentions, plus anything the doc mentions that no longer exists.
- **Outcome:** A list of additions, updates and deletions the doc needs.
- **Time:** 25 min
- **⛔ Re-derive every count the agent returns before writing it.**
- **On-Fail:** Too large to finish → record the population size and what was covered. Never imply
  full coverage.
- **Test:** *Happy:* every item cites a path. *Edge:* a deliberate omission is marked, not "missing".
  *Fail:* an agent count that fails re-derivation is discarded. *Integration:* standalone.

### Step 7 — Cross-spec extraction (Point 4) + close `[HANDOFF]`
- **Model:** inline
- **Action:** Pull out every open item that (a) needs significant time, and (b) belongs to a
  **different** spec. Write it into that spec, remove it from this one. Then commit.
- **Outcome:** This doc holds only its own work. Each moved item is recorded where it belongs.
- **Time:** 20 min
- **⛔ Explicit pathspec on every commit** — shared worktree, concurrent sessions on `main`.
- **On-Fail:** Unsure which spec owns it → **ask Bean in that moment**, with the item, the two or
  three candidate specs, your recommendation and why. Do not guess, and do not park it.
- **Test:** *Happy:* moved items exist in the destination spec. *Edge:* an item spanning two specs is
  flagged for Bean, not split silently. *Fail:* preflight passes. *Integration:* `git status` shows
  only intended files.

**Session done when — all eight, no partial credit:**
0. **Every row typed `requirement` that carries no `FR-` id has been triaged at Step 1b** —
   grouped, promoted, or reclassified. None left both un-numbered and un-judged.
1. Every point has a verdict, a command and its raw output
2. No row is `AGENT`
3. **Every `live`-tagged point was settled on the canary — zero carried forward.**
   ⚠ **One exception, and only one:** the canary is genuinely unreachable. Then the session closes
   as `LIVE-BLOCKED`, naming every unsettled point, and the **next session's Step 4b clears those
   first, before its own.** A blocked session is not a failed session — but it is never "done", and
   the points are never marked passed.
4. Every superseded item has a `DELETE`/`KEEP(<reason>)` disposition, and DELETEs are done
5. QA Gate A passed
6. The doc matches the roster — no claim disagrees with `points.json`
7. Reverse check ran; cross-spec items moved to their owning spec; committed with explicit pathspec

---

## S6 — Close-out session

### Step C1 — Cross-doc consistency (Point 3b) `[SESSION-START]`
- **Model:** inline
- **Action:** Compare the five verdict rosters. Every disagreement gets resolved to the **verified**
  verdict, and the losing doc is corrected.
- **Outcome:** No two docs disagree about the same thing.
- **Cold-Entry:** this plan; all five `points.json`; the 2026-08-17 audit report
- **Time:** 30 min
- **Test:** *Happy:* a scripted diff of the rosters returns no conflicting verdicts. *Edge:* two docs
  describing different scopes are not a conflict. *Fail:* preflight passes. *Integration:* all 9 pass.

### Step C2 — Archive sweep (Point 2)
- **Model:** sonnet (classification), inline (the moves)
- **Action:** For every plan doc in `.claude/plans/` **and** `~/.claude/plans/`, classify:
  `ARCHIVE | ACTIVE | SUPERSEDED-BUT-REFERENCED`. Repoint references, then move.
- **⛔ The reference finder is a per-doc `git grep`, not `handoff-preflight`.** That hook scans 3
  files and matches markdown-link syntax only; every real citation here is backtick-wrapped plain
  text. It is a post-move regression check, nothing more.
- **Outcome:** Only genuinely open plans remain in either plans folder.
- **Time:** 45 min
- **On-Fail:** Unclear ownership → **ask Bean there and then**: name the doc, say what it covers,
  give the archive/keep options and your recommendation. One question, answered, then continue.
- **Test:** *Happy:* `git grep -n "<basename>"` returns nothing outside archive/ and history.
  *Edge:* a tombstone stays at its live path deliberately. *Fail:* preflight `no-dangling-links`
  passes. *Integration:* all 9 pass.

### QA Gate B — programme close
- **Model:** inline
- **Exec:** SEQUENTIAL
- **Check:**
  1. `python .claude/hooks/handoff-preflight.py --check` → all 9 pass
  2. `cd plugins/sgs-blocks && npm run build` → exit 0
  3. Every doc's status line matches its roster — scripted, not eyeballed
- **Pass:** all three.
- **Fail:** Fix before closing.
- **Marker:** QA

---

## Delegation

| Step | Model | Why |
|---|---|---|
| 1 Extract | sonnet | Mechanical walk |
| **1b Triage** | **inline** | Judgement — group vs promote vs reclassify, and whether a child's claim is broader than its parent's. A script cannot decide any of it |
| 2 Predict | **inline** | Needs the doc's intent |
| 3 Run | sonnet | Command execution |
| 4 Verdicts | **inline** | Judgement; successor check + DELETE/KEEP disposition |
| **4b Live pass** | **inline** (Playwright) | Cannot be delegated — needs the editor and the eye |
| 5 Write | **inline** | Governing docs |
| 6 Reverse | sonnet → verified inline | Broad scan, but counts re-derived |
| 7 Cross-spec | **inline** | Ownership calls |
| C1/C2 | inline (+sonnet classify) | Resolution and moves |

**Every dispatch prompt carries these four lines verbatim:**
```
git grep only, never grep -r (17 stale worktree copies inflate counts ~18x)
A name-mention is not a usage — check imports and <JSX mounts
A decision entry is not a paragraph — read to the next '## D' heading
Return the command and its raw output with every claim, or the claim is void
```

---

## Key Judgement Calls — ALL DECIDED 2026-08-17 (Bean). No open questions.

**1. Spec 35 splits across two sessions: Parts A–L, then M–O.**
A–L is the client-facing standard and definition-of-done; M–O is status prose, enforcement rules and
the 14 control-type contracts. 2,676 lines cannot be verified honestly in one pass, and pretending
otherwise is what produced the unverified claims. Programme = 6 sessions.

**2. Superseded items are DELETED by default, handled per case.**
Bean's reasoning, and it supersedes my own recommendation: *if something is superseded, the
replacement should be written up too, so there is usually no reason to keep a record — it is an easy
way to confuse and misinform agents relying on grepping for terms or doing surface-level checks, and
it creates more work when at most it redirects to the replacement.*
Keep only where real context makes the record useful, with a one-line named justification. No
justification = delete. Full rule in Step 4. **Confirm the replacement is written up before deleting**,
and never delete the underlying need along with the dead mechanism.

**3. Live verification runs inside EVERY doc session — Step 4b.**
No point leaves a session unverified, so nothing can be quietly dropped. Costs a deploy cycle per
session; accepted deliberately, and it is the strictest reading of the verification ladder. ⛔ If the
canary is unreachable, points carry to the next session — they are never marked passed.

---

## Entry context

- `.claude/reports/2026-08-17-track1b-spec35-32-completion-audit.md` — the prior audit. **Treat its
  verdicts as unverified input, not truth** — that is the point of this programme.
- `.claude/LEDGER.md` — live status, and the retraction note
- `.claude/hooks/handoff-preflight.py` — the 9-check doc gate

## Known correction, carried in

Colour hover effects already use the new global colour toggle (D609). So the 21-block / 99-attribute
`*Hover` figure from 2026-08-17 is **not** all divergence — the colour subset is already consolidated.
Re-derive that split before treating any of it as a defect.
