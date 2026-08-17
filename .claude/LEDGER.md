---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-18
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**S1 of the verification programme ran, and it worked — 197 of 219 points in Spec 32 now carry a
verdict backed by a command and its raw output. Along the way it found three real bugs that every
existing gate had passed.**

**The method proved itself.** Last session's audit produced claims nobody had tested. This session
every claim got a prediction written before anything ran, then a command, then its output. The
pleasant surprise: the status table that carries its own warning ("this is a cache, re-derive before
quoting") turned out to be accurate on all 12 rows. The thing that had been hedged hardest was the
thing that held up.

**Three real bugs, all invisible to the ~50-gate build chain because the code is syntactically
perfect.** First: the button's "reduce motion" rule could never match anything, so anyone browsing
with motion reduced still got the animation. Second — and this is the big one — **72 colour
references across the whole framework pointed at colour names that don't exist.** Nothing looked
broken, because each one had a hardcoded fallback that quietly won. The cost was invisible: those
72 properties could never change colour per client. A framework block was serving Mama's beige to
every client on the platform. Third: a spec requirement said "there should be a lint check for this"
— and that check had never been built, for months.

**You spotted the thread that unravelled the big one.** Noticing that `border-subtle` existed without
a plain `border` led to finding that most of the 72 were WordPress's own colour names, used by
mistake instead of ours. The palette is now 21 colours with every family complete, and two new gates
make the whole class of mistake impossible to reintroduce.

**What I got wrong, repeatedly.** About twelve of my own measurements were wrong before they were
right — a bad regex, the wrong shell, a parser that misread its own output. Every single one was
caught by re-reading the raw output instead of trusting the tool. One is worth naming: a check I
wrote returned "passed" without ever looking at its own result, and reported a clean bill of health
on a real defect. I also had a subagent revert one of my fixes mid-deploy.

**Where it stands.** Steps 1–4c of S1 are done. Steps 5, 6 and 7 (write the verdicts into the spec,
reverse-check, close) remain, and the full open list is written up so the next session starts cold
without losing anything.

## Shipped today

| What | Detail lives at |
|---|---|
| **S1 verdicts — 197/219 DONE, 0 AGENT-classed, 0 live points carried** | `.claude/reports/2026-08-18-spec32-points-roster.json` |
| **Open-points report — what remains, why, and what closes it** | `.claude/reports/2026-08-18-s1-open-points.md` |
| `sgs/button` reduced-motion rule fixed (live-proven 0→1 match) + `check-id-scoped-emits.js` | D657 · `f52c6b53` |
| 72 phantom colour refs fixed; palette completed to 21 slugs across 9 files | D658 · `0def190f` |
| `check-palette-slug-refs.py` + `check-preset-token-naming.py` (FR-32-9's own missing gate) | `0def190f` |
| Step 1b (triage unnumbered normative statements) added to the programme plan | D656 · `6ed24ee5` |
| Tree cleaned — hook artefacts, LEDGER pointer, 3 untracked reports committed | `010d7d41`–`62855152` |

## Blockers

**One, and it is contained.** `push-theme-snapshot.py` aborts safely for mamas-munches — it refuses
to write `wp_global_styles` without a verified rollback backup, and its own REST read reports
unavailable. **The credentials are fine** (`curl` against `/wp-json/wp/v2/global-styles/7` returns
HTTP 200), so the fault is inside the script. Consequence: the canary serves the framework `border`
(#D4DBE5) instead of mamas' (#e8d5c0), so product-card borders render grey-blue rather than beige.
The local snapshot is correct; only the live DB layer is stale.

## THE FRONT — finish S1, then S2

**Read `.claude/reports/2026-08-18-s1-open-points.md` FIRST.** It separates what is already settled
and merely needs transcribing into Spec 32 from what is genuinely open. Do not re-derive either.

### Task 1 — Step 5: write the verdicts into Spec 32
**What:** Transcribe the settled verdicts into the spec — 10 stale claims corrected, 3 SUPERSEDED
entries deleted, §12.2's palette section rewritten for the 21-slug roster.
**Why:** The roster is the evidence; the spec is what the next session reads. Until Step 5 runs they
disagree.
**Orchestration:** inline (Opus) — governing-doc edits. **Not** delegated.
**Depends on:** none. **/qc gate after:** yes, `/qc-inline`.
**Acceptance:** no claim in Spec 32 disagrees with the roster; `handoff-preflight.py --check` passes.
**Time:** ~40 min.

### Task 2 — unblock the canary palette push
**What:** Fix `push-theme-snapshot.py`'s wp_global_styles read, then push mamas-munches and confirm
`border` resolves to #e8d5c0 live.
**Why:** Until it lands, the canary renders framework defaults where it should render client values,
and `ACC-03` (the re-skin test Bean approved) stays blocked behind it.
**Orchestration:** delegated — **sonnet** via `/delegate`; single agent.
**Brief:** the REST route returns HTTP 200 with the canary app password; the script reports it
unavailable. Find and fix the discrepancy. Do NOT use `--force-no-backup`.
**Depends on:** none. **Parallel with:** Task 1. **/qc gate after:** yes — verify live, not exit code.
**Acceptance:** `border` resolves to #e8d5c0 at `:root` on the canary.
**Time:** ~25 min.

### Task 3 — Step 6 (reverse check) + Step 7 (cross-spec, commit)
**What:** Find what exists in code but is absent from Spec 32; move items owned by other specs.
Already banked: 3 undocumented `nth-child` emitters (gallery:438, google-reviews:488,
pricing-table:244) and the dead page-144 canary reference in root `CLAUDE.md`.
**Orchestration:** sonnet for the scan, **verified inline** — re-derive every count before writing it.
**Depends on:** Task 1. **/qc gate after:** yes.
**Acceptance:** every item cites a path; moved items exist in the destination spec.
**Time:** ~35 min.

### Then S2 — Spec 35 Parts A–L
Per the programme. ⛔ NEVER S2 ∥ S3 (same file). ⛔ ONE canary lock.

## Open — carried

- **`text-secondary` is a client-only slug that framework code reads.**
  `includes/variations/sgs-text-variations.php:83` references it; only 5 clients declare it, so
  helping-doctors / indus-foods / mamas-munches fall back forever. ⚠ `check-palette-slug-refs.py`
  does NOT catch this by design — it accepts a slug declared by ANY client. Per-client resolution is
  the durable fix.
- **5 blocks have `:hover` with no `:focus-visible`** (§5's a11y NFR): `hero`, `icon-list`,
  `mega-panel`, `process-steps`, `testimonial`. 35 blocks comply.
- **Four points need a fixture that does not exist** — `FR-32-4a` positional integrity (needs a page
  with social-icons/card-grid/trust-bar), `FR-32-10` (asymmetric 4-side box), `§6.1(e)`/`FR-32-4` (an
  instance with a real override). **One probe page closes three of them.**
- **`ACC-03` re-skin** — Bean approved running it; blocked behind the canary push.
- **`inspector-scan` rule 21 is unhealthy on `main`** — `--self-test` FAILS at HEAD; treat as tier 4.
- **45 attributes a client can never reach** — needs per-attribute judgement, not a blind fix.
- **Two dead components** (`StateToggleControl`, `SgsLinkControl`) — clutter, not gaps.
- **Two parallel hover systems** — the COLOUR subset already uses the D609 toggle; re-derive what is
  genuinely still duplicated before treating it as a defect.
- **Six gates look like enforcement and are not** — 5 shell-neutralised by `|| echo [ADVISORY]`.
- **17 stale agent worktrees** under `.claude/worktrees/` — inflate a naive `grep -r` ~18×.

## Methodology guardrails (carried forward — all still true)

- ⛔ **`git grep` only, never `grep -r`** — 17 stale worktrees inflate counts ~18×.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first (`| wc -l`).
- ⛔ **`$?` after a pipe reads the LAST command's status.** Redirect first.
- ⛔ **`git grep -c` with an explicit path prints `path:count`, not a bare integer.** An `isdigit()`
  test on it manufactured **9 false NOT-DONE verdicts** in one pass (2026-08-18).
- ⛔ **Python `shell=True` on Windows is cmd.exe, not bash.** Quoted git pathspecs silently match
  nothing; two logically-opposite greps both returned 0. The tell: every fixture gave identical output.
- ⛔ **A regex `\b` after a slug matches inside a hyphenated sibling** — `contrast\b` matched inside
  `contrast-2` and rewrote it to `text-2`.
- ⛔ **A name-mention is not a usage.** A string match for `SGS_Container_Wrapper` reported all 12
  composites as using it; real call-detection gave a perfect 6/6 block-private / 6/6 wrapper split.
- ⛔ **A verdict function needs the same can-this-fail proof as a gate** (D660).
- ⛔ **A subagent must never mutate a repo file as a test fixture** — require temp fixtures (D659).
- ⛔ **Metadata is not evidence.** Filename, line count, file existence, grep-hit count — open the file.
- **A completeness error is invisible to every correctness gate.**
- **A pre-commit gate can fail SILENTLY** after ~250 lines of passing output — never `--no-verify`;
  use the scoped `SGS_VISUAL_GATE_SKIP` + `SGS_VISUAL_GATE_REASON`.
- **Run builds synchronously, never backgrounded.**
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.

## State Snapshot

- **Branch:** `main` at `12b70c6f`. 6 commits this session, all pushed.
- **D-ceiling:** **D660** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Build:** `npx wp-scripts build` exit 0. Gates green: `check-palette-slug-refs`,
  `check-preset-token-naming`, `check-id-scoped-emits`, `audit-inline-styling` all exit 0.
- **Canary:** deployed and live-verified — all 21 palette slugs resolve at `:root`, 0 inline styles
  across 59 blocks, reduced-motion rule matches 1 element. ⚠ `wp_global_styles` push still pending.
- **Uncommitted:** `plugins/sgs-blocks/scripts/check-dead-controls.js` — **another session's work**
  (a real fix to its comment-stripper). Deliberately untouched. Do not commit or revert it.

## Pointers

| For | Read |
|---|---|
| **THE FRONT — what remains of S1** | **`.claude/reports/2026-08-18-s1-open-points.md`** |
| S1 verdict roster (219 points, all evidence) | `.claude/reports/2026-08-18-spec32-points-roster.json` |
| The programme (loop, ladder, Step 1b, Step 4c) | `.claude/plans/2026-08-17-spec-verification-programme.md` |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |
