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
| `RAN-TOOL` | A gate/detector was run; its output is the verdict |
| `READ-CODE` | The file was opened and read |
| `AGENT` | A subagent reported it — **not yet verified** |

**2. `AGENT` never reaches a doc.** An agent's number gets re-derived by the main session first, or
it is written as `UNVERIFIED` in plain sight. Agents miscounted three times on 2026-08-17 — twice
counting comments as live code usage, once from a Windows path split.

**3. Metadata is not evidence.** A filename, a line count, a file's existence, a grep hit count.
None of these decide a verdict. Open the file.

---

## Order of docs, and why

| # | Session | Doc | Why here |
|---|---|---|---|
| 1 | S1 | **Spec 32** (~500 lines, 11 FRs) | Smallest and most self-contained. Proves the method before the expensive docs. It already has a status block to test the method against |
| 2 | S2 | **Spec 35 Parts A–L** | The client-facing standard. Part L is the definition-of-done and drives everything else |
| 3 | S3 | **Spec 35 Parts M–O** | Part O is the folded-in contract (14 control types). Split from S2 because Spec 35 is now 2,676 lines — one session cannot verify it honestly |
| 4 | S4 | **Track 1b plan** | Register + every phase/task/wave step. Depends on S2/S3 verdicts |
| 5 | S5 | **capability-routing doctrine** (~600 lines) | Smallest remaining; mostly confirms or contradicts S2–S4 |
| 6 | S6 | **Close-out** | Point 2 (archive sweep) + Point 3b (cross-doc consistency). Only possible once every doc is verified |

---

## The loop — identical in every doc session

Same seven steps each time. Learn once, run five times.

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

### Step 2 — Predict before running
- **Model:** inline
- **Action:** For every row, write `predict` and `command` **before running anything**. The
  prediction states what the command returns if the point is implemented.
- **Outcome:** No row has an empty `predict` or `command`.
- **Time:** 20 min
- **On-Fail:** A point with no possible command is `UNVERIFIABLE-STATIC` — say what would settle it
  (usually a live editor pass).
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
- **Action:** Set `verdict` ∈ `DONE | PARTIAL (n/m) | NOT-DONE | SUPERSEDED | UNVERIFIABLE` and
  `evidence` ∈ `RAN-TOOL | READ-CODE | AGENT`.
- **⛔ If the command did not decide it, open the file.** Metadata never decides a verdict.
- **⛔ Before `NOT-DONE`, check for a successor.** A component with zero usages may have been
  replaced, not abandoned — that is `SUPERSEDED`, and the fix is to reword the doc, not build
  anything. Two of this class were found on 2026-08-17 (`SgsLinkControl`, `StateToggleControl`).
- **⛔ Before `NOT-DONE`, check whether a later ruling killed the requirement.** Spec 35 Part L
  contradicts Part G in two places.
- **Outcome:** Every row has a verdict and an evidence class.
- **Time:** 30 min
- **On-Fail:** Genuinely ambiguous → `UNVERIFIABLE` with the reason. Never guess.
- **Test:** *Happy:* no row is `AGENT`. *Edge:* a superseded item is `SUPERSEDED`, not `NOT-DONE`.
  *Fail:* a verdict without output is rejected. *Integration:* cross-check against the 2026-08-17
  audit report; note every disagreement.

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
- **On-Fail:** Unsure which spec owns it → leave it and ask Bean. Do not guess ownership.
- **Test:** *Happy:* moved items exist in the destination spec. *Edge:* an item spanning two specs is
  flagged for Bean, not split silently. *Fail:* preflight passes. *Integration:* `git status` shows
  only intended files.

**Session done when:** every point in the doc has a verdict, a command and an output; no row is
`AGENT`; QA Gate A passed; the doc matches the roster; the reverse check ran; cross-spec items moved.

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
- **On-Fail:** A doc with unclear ownership stays put and goes on a short list for Bean.
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
| 2 Predict | **inline** | Needs the doc's intent |
| 3 Run | sonnet | Command execution |
| 4 Verdicts | **inline** | Judgement; successor and superseded-ruling checks |
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

## Key Judgement Calls

- **Decision:** Split Spec 35 across two sessions?
  - **Options:** one session / split A–L and M–O / split by Part
  - **Recommendation:** split A–L and M–O
  - **Why:** It is 2,676 lines since Part O folded in. One session cannot verify that honestly, and
    pretending otherwise is what produced the unverified claims.
  - **Cost of wrong choice:** A rushed pass repeats the failure this plan exists to fix.
  - **Who decides:** Bean

- **Decision:** What happens to a point that is `NOT-DONE` but belongs to a killed design?
  - **Options:** build it / delete the requirement / mark `SUPERSEDED` and reword
  - **Recommendation:** `SUPERSEDED` + reword, and raise the underlying need separately if real
  - **Why:** Two live cases already (`StateToggleControl`, Part L vs Part G). Building to a dead
    design wastes the session; deleting silently loses a real requirement.
  - **Cost of wrong choice:** Either wasted build, or a genuine gap disappears.
  - **Who decides:** Bean, per case

- **Decision:** Verdicts on live-only points (browser needed)?
  - **Options:** run a canary pass per session / batch them at the end / mark and skip
  - **Recommendation:** mark `UNVERIFIABLE-STATIC` and batch into one canary session at the end
  - **Why:** Keeps doc sessions cheap and deterministic. Spec 32's §8 alone has four such rows.
  - **Cost of wrong choice:** A deploy cycle per session for a handful of points.
  - **Who decides:** Bean

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
