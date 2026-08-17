---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-17
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-17, later session. The honest headline: I audited Spec 35, Spec 32 and the Track 1b plan,
got a significant amount of it wrong, you caught it, and the session's real output is a plan to do it
properly.**

**What went wrong.** I was asked to check whether every point in those docs was genuinely finished. I
mostly checked whether the docs *agreed with each other* — which you never asked for — and I trusted
subagent reports instead of verifying things myself. The worst single error: I decided a shared
component had not been split up by looking at how many **lines** its file had. I never opened the
file. It had been split — the six parts were listed at the top. I wrote that wrong conclusion into
two governing docs and called it the most important finding of the session. You corrected it.

**What that means.** Roughly a third of what I wrote into the specs rests on subagent reports I never
re-checked, including from an agent I later caught miscounting twice. Those claims are marked, not
silently trusted.

**What actually got fixed, verified properly.** Spec 32's rollout is genuinely complete — I confirmed
it by running the check, not by reading a status line. Three of its "open questions" had been answered
in the code for weeks. Spec 35 was wrong in both directions at once: its 21-item done-list had nothing
ticked while several items were genuinely finished, and its status section claimed "build complete"
while three roadmap steps have no code behind them at all.

**Two components are dead.** Both exist, both are exported, neither is used anywhere. Their
replacements are live and working — so that is leftover clutter, not missing work.

**The deliverable.** A six-session programme, one document per session, where **no claim is allowed
without a command and its output**, live browser testing happens inside every session, and docs are
treated as a map to find files rather than a source of truth. You made three decisions that shaped it
and one correction that improved it — superseded things get deleted rather than left as redirects,
because a dead entry misleads anyone searching for the term.

**Also shipped:** the shared wrapper file was split into one file per panel, at your request, because
keeping six panels in one file is what caused my misreading in the first place.

## Shipped today

| What | Detail lives at |
|---|---|
| **Spec verification programme** — 6 sessions, evidence-gated, ready to run | `.claude/plans/2026-08-17-spec-verification-programme.md` |
| Completion audit + report (treat its verdicts as UNVERIFIED input) | `.claude/reports/2026-08-17-track1b-spec35-32-completion-audit.md` |
| Spec 32 — per-FR verified status block; §11's 3 questions closed; §6.1 heading corrected | `specs/32-…md` §0a, §6.1, §11 |
| Spec 35 — Part L per-item verified state; Parts I/J/N corrected; 2 "gap" labels were wrong | `specs/35-…md` |
| Control-type contract FOLDED into Spec 35 as **Part O**; 16 references repointed | `specs/35-…md` Part O |
| `ContainerWrapperControls.js` split 1,887 → 268 lines + 6 panel files + `_shared.js` | `src/blocks/container/components/` |
| Both tombstones DELETED (they formed a redirect chain) | — |
| Root `CLAUDE.md` Spec 32 line corrected (was stale twice over) | `CLAUDE.md` |

## Blockers

**None.**

## THE FRONT — next session is S1 of the verification programme

**Read `.claude/plans/2026-08-17-spec-verification-programme.md` first. It contains the full
orchestration: the mandatory reading gate, the 7-step loop, the roster schema, the verification
ladder and the delegation table. Do not re-plan it — execute it.**

### S1 — Spec 32 (~574 lines, 11 FRs)

**What:** Verify every point in Spec 32 against the code, correct the doc to match, then run the
reverse check for anything that exists in code but is missing from the doc.
**Why:** It is the smallest and most self-contained of the five, so it proves the method before the
expensive docs. It also already carries a status block to test the method against.
**Time:** ~2.5 h including the live pass.

**Orchestration:** steps 1/3/6 delegate to sonnet; steps 2/4/4b/5/7 stay inline (judgement, live
testing, governing-doc edits). Full per-step detail is in the plan — including the four lines every
dispatch prompt must carry verbatim.

**Acceptance — all seven, no partial credit:** every point has a verdict + command + raw output; no
row is `AGENT`-classed; every live-tagged point settled on the canary; superseded items disposed;
QA Gate A passed; the doc matches the roster; reverse check + cross-spec extraction done.

### Then S2 → S6

S2 Spec 35 Parts A–L · S3 Spec 35 Parts M–O · S4 Track 1b plan · S5 capability-routing doctrine ·
S6 close-out (archive sweep + cross-doc consistency).

**Parallelism (Bean-ruled):** `S1 ∥ S5` → `S2` → `S3` → `S4` → `S6`. ⛔ NEVER S2 ∥ S3 — same file.
⛔ ONE canary lock: only one session may hold the canary for its live pass.

### Still queued, NOT this programme

**Typography framework-wide initiative (Task B, D649).** Prerequisites cleared (D653/D654), never
started. W1 data layer → W2 shared component → W3 layout → W4 detector → W5 migration, gated on G1.
Detail: `~/.claude/plans/read-all-of-spec-soft-fairy.md`. **Do not start it mid-programme** — it is a
build, and the programme is a verification pass.

## Open — carried

- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5). Spec 36, not this.
- **`inspector-scan` rule 21 is unhealthy on `main`:** its `--self-test` FAILS at HEAD (proven by
  stashing an unrelated change and re-running) and its recorded `openBacklog` is 129 against a live
  65. **A detector that cannot pass its own self-test is not evidence** — the programme treats it as
  tier 4 until fixed.
- **45 attributes a client can never reach** — `site-header`/`site-footer` each declare 13
  `shapeDivider*` attrs with no control and no panel mount; `hero`/`site-header`/`site-footer` carry
  19 layout attrs painted by the shared wrapper with no control. ⚠ **These may be intentional** — if
  support moved to the wrapper and the control was dropped, the attribute is the leftover, not the
  control. Needs a per-attribute judgement review, not a blind fix.
- **Two dead components:** `StateToggleControl` (0 mounts; D609 explicitly banned its shape — states
  are a tab toggle inside the colour popover, never a sibling control; 60 blocks use the successor)
  and `SgsLinkControl` (0 imports; `LinkPopoverField` has 11 live mounts). Both are clutter, not gaps.
  ⚠ `StateToggleControl` is still named in ~15 `setting-registry` entries as the target of an
  unstarted hover consolidation — deleting it needs that plan re-pointed at the D609 shape first.
- **Two parallel hover systems** — universal `sgsHover*` (12 attrs, every block) alongside 21 blocks'
  own `*Hover` attrs (99). ⚠ **The COLOUR subset already uses the D609 global toggle**, so this is
  not all divergence. Re-derive what is genuinely still duplicated before treating it as a defect.
- **D543's owed sweep, never done and grown:** Spec 35 still names raw `LinkControl` on 11 lines
  (recorded as 8); `.claude/dev-setup.md` still has no `SgsLinkControl` entry.
- **Six gates look like enforcement and are not** — 5 shell-neutralised by `|| echo [ADVISORY]`, 1
  needs a `--strict` prebuild never passes, 1 exits 0 always, and 3 of the 4 commit-floor gates
  silently no-op without the local DB. Spec 32's live gate PASSES when the canary is unreachable.
  This is the "stop diverging" purpose the Track 1b plan was written to serve, and it is unmet.
- **17 stale agent worktrees** under `.claude/worktrees/` — branches merged, dirs not removed. They
  inflate a naive `grep -r` by ~18×. Cleanup is `git worktree remove` each.

## Methodology guardrails (carried forward — all still true)

- ⛔ **`git grep` only, never `grep -r`** — the 17 stale worktrees inflate counts ~18×.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first (`| wc -l`).
- ⛔ **`$?` after a pipe reads the LAST command's status**, not the one you care about. Redirect first.
- ⛔ **A name-mention is not a usage.** Check imports and `<JSX` mounts. Three agents got this wrong.
- ⛔ **A decision entry is not a paragraph.** Read to the next `## D` heading — one entry ran 259
  lines and its close-out reversed its own opening.
- ⛔ **Metadata is not evidence.** Filename, line count, file existence, grep-hit count — none of
  them decide anything. Open the file. This is the error that defined this session.
- **A completeness error is invisible to every correctness gate.** The ~50-gate chain, the deploy
  checksum and live DOM checks all validate what you DID touch; none knows what you should have.
- **A clean `git merge` exit code is not proof the merge is correct** — run the full build after.
- **A pre-commit gate can fail SILENTLY** after ~250 lines of passing output. If a commit will not
  complete with no visible error, suspect the visual-diff gate needs
  `SGS_VISUAL_GATE_SKIP`/`SGS_VISUAL_GATE_REASON` — never `--no-verify`.
- **A bypass token belongs to ONE hook** — read the blocking script's own output before typing any
  bypass syntax from memory. Three distinct token vocabularies exist in this repo.
- **Run builds synchronously, never backgrounded** — a backgrounded subagent build just sits.
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.

## State Snapshot

- **Branch:** `main` at `0e38685e`. 17 commits this session, all pushed.
- **D-ceiling:** **D655** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Build:** `npx wp-scripts build` exit 0 after the wrapper split. `check-dead-controls`,
  `check-empty-inspector-containers`, `inspector-scan --check`, `check-duplicate-controls` all exit 0.
  Dead-controls findings byte-identical pre/post split (stash-compared).
- **Docs:** `handoff-preflight.py --check` — all 9 pass.
- **Canary:** NOT redeployed this session. The wrapper split is committed but **not deployed** —
  S1's live pass will deploy.
- **Project plans:** 29 files (was 31; one archived, two tombstones deleted).
- **Pre-existing dirty files, not this session's:** `doc-size-baseline.json`,
  `memory/decisions-archive.md`, `reports/phase4-*.txt`, `reports/visual-diff/manual-skips.log`,
  `reports/inline-styling-audit-2026-07-09.*` (regenerated by an audit run).

## Pointers

| For | Read |
|---|---|
| **THE FRONT — next session** | **`.claude/plans/2026-08-17-spec-verification-programme.md`** |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| This session's audit (UNVERIFIED input, not truth) | `.claude/reports/2026-08-17-track1b-spec35-32-completion-audit.md` |
| Governing spec for inspector UX (now incl. Part O) | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Track 1b plan doc | `C:\Users\Bean\.claude\plans\go-track-1b-playful-hamster.md` |
| Open deferred work | `parking.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |