---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-18
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**S1 of the verification programme ran, and it worked — 199 of 219 points in Spec 32 now carry a
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
| **S1 verdicts — 199/219 DONE, 0 AGENT-classed, 0 live points carried** | `.claude/reports/2026-08-18-spec32-points-roster.json` |
| **Open-points report — what remains, why, and what closes it** | `.claude/reports/2026-08-18-s1-open-points.md` |
| `sgs/button` reduced-motion rule fixed (live-proven 0→1 match) + `check-id-scoped-emits.js` | D657 · `f52c6b53` |
| 72 phantom colour refs fixed; palette completed to 21 slugs across 9 files | D658 · `0def190f` |
| `check-palette-slug-refs.py` + `check-preset-token-naming.py` (FR-32-9's own missing gate) | `0def190f` |
| Step 1b (triage unnumbered normative statements) added to the programme plan | D656 · `6ed24ee5` |
| Tree cleaned — hook artefacts, LEDGER pointer, 3 untracked reports committed | `010d7d41`–`62855152` |
| **[2nd thread] Plans-folder audit — 14 docs archived, 58 citations repointed first. Plans root 29→20, strategy 9→4** | `4dd5f895` · `69fe8024` · this session |
| **[2nd thread] `check-dead-controls` CHECK 5 — 24 false advisories → 0.** Comment-stripper ran `/* */` before `//`, so a `//` comment containing `/*` swallowed 715 lines of `hero/render.php` | D661 · `a2bdbae7` |
| **[2nd thread] Device-tier breakpoint 599→767 on 4 stylesheets** (+ post-grid companion range). Live-verified on canary; `form` deliberately untouched | D662 · `efe5c2a3` · `reports/2026-08-18-breakpoint-599-to-767-live-evidence.md` |
| **[2nd thread] Stage 8 runtime audit — CWV + network + console from ONE Lighthouse run** | D663 · **PR #31**, not merged |

## Blockers

**One, and it is contained.** `push-theme-snapshot.py` aborts safely for mamas-munches — it refuses
to write `wp_global_styles` without a verified rollback backup, and its own REST read reports
unavailable. **The credentials are fine** (`curl` against `/wp-json/wp/v2/global-styles/7` returns
HTTP 200), so the fault is inside the script. Consequence: the canary serves the framework `border`
(#D4DBE5) instead of mamas' (#e8d5c0), so product-card borders render grey-blue rather than beige.
The local snapshot is correct; only the live DB layer is stale.

## THE FRONT — close the WHOLE of S1, then S2

**Goal: S1 finishes.** Not "make progress on S1" — every open point either closes with evidence, or
is recorded as genuinely unclosable with the named blocker. Then Spec 32 is written once and
committed. Total ~3h.

### ⛔ MANDATORY READING GATE — read these IN FULL before touching anything

Not a skim, not a grep. The 2026-08-17 session failed precisely by acting on a summary of a document
rather than the document.

| Read fully | Why |
|---|---|
| **`.claude/reports/2026-08-18-s1-open-points.md`** | THE brief. Separates what is settled-and-needs-transcribing from what is genuinely open. Read this first |
| **`.claude/reports/2026-08-18-spec32-points-roster.json`** | All 219 points with prediction, command, raw output, verdict, evidence. The evidence base for Step 5 |
| **`.claude/plans/2026-08-17-spec-verification-programme.md`** | The loop, the verification ladder, Step 1b, Step 4c, the 8-condition done-gate |
| **`.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md`** | The doc being corrected — END TO END, per the programme's own rule |
| **`.claude/STOP-CATALOGUE.md`** | §E16 is this session's five new entries, all earned by real failures |

**Self-check before Task 1:** can you name the 3 SUPERSEDED entries to delete, the 10 stale claims to
correct, and the 4 points that need a fixture? If not, re-read — the brief already lists all of them.

⛔ **Do NOT read `decisions.md` end-to-end.** Consult a specific D-number only while investigating a
specific point, and only for *why* — never for what is true.

### Task 1 — unblock the canary palette push `[start here, it gates Task 3]`
**What:** Fix `push-theme-snapshot.py`'s `wp_global_styles` read, push mamas-munches, confirm `border`
resolves to `#e8d5c0` live (currently serving the framework `#D4DBE5`).
**Why:** Blocks `ACC-03`. The credentials are fine — `curl -u` against `/wp-json/wp/v2/global-styles/7`
returns HTTP 200 — so the fault is inside the script.
**Orchestration:** delegated, **sonnet** via `/delegate`. ⛔ Dispatch prompt MUST forbid mutating any
repo file as a fixture (D659). ⛔ Never `--force-no-backup`.
**Acceptance:** `border` = `#e8d5c0` at `:root` on the canary, verified live not by exit code. **~25 min.**

### Task 2 — build ONE probe page, close 4 live points
**What:** A canary page carrying `social-icons` + `card-grid` + `trust-bar` (repeaters), an instance
with a real per-instance override, and an asymmetric 4-side box.
**Closes:** `FR-32-4a` positional integrity · `FR-32-10` · `§6.1(e)` · `FR-32-4`.
**Orchestration:** inline (Playwright) — cannot be delegated, needs the editor and the eye.
**Parallel with:** Task 1. **Acceptance:** all 4 rows carry `LIVE` evidence. **~30 min.**

### Task 3 — the remaining close-outs
**a.** `ACC-03` re-skin (Bean-approved): edit `buttonPresets.primary.text`, push, measure, revert.
**Depends on Task 1.**
**b.** `§6.2(d)` head mode: flip `sgs_css_output_mode`, measure, flip back.
**c.** `NFR-02` editor parity: open the editor, compare against the frontend.
**d.** `ACC-05`: render a site actually running the fallback path.
**e.** `NFR-03`: add `:focus-visible` to the 5 blocks that have `:hover` without it — `hero`,
`icon-list`, `mega-panel`, `process-steps`, `testimonial`.
**f.** `text-secondary`: framework code reads a slug only 5 clients declare. Decide — seed it for all,
or drop the reference. Then tighten `check-palette-slug-refs.py` to per-client resolution.
**Orchestration:** a–d inline; e–f may delegate to sonnet. **~50 min.**

### Task 4 — Step 5: write every verdict into Spec 32 `[the deliverable]`
**What:** 10 stale claims corrected, 3 SUPERSEDED entries DELETED, §12.2 rewritten for the 21-slug
roster, the two discharged "live not re-run" caveats dropped. All listed in the brief.
**Orchestration:** inline (Opus) — governing doc, never delegated.
**Depends on:** Tasks 1–3 (so the doc is written ONCE, per Step 4c). **/qc gate:** `/qc-inline`.
**Acceptance:** no claim in Spec 32 disagrees with the roster. **~40 min.**

### Task 5 — Steps 6 + 7: reverse check, cross-spec, commit `[close]`
**What:** Find what exists in code but is absent from Spec 32. Already banked: 3 undocumented
`nth-child` emitters (`gallery:438`, `google-reviews:488`, `pricing-table:244`) and the dead page-144
canary reference in root `CLAUDE.md`. Move other-spec items to their owning spec, then commit.
**Orchestration:** sonnet scans, **verified inline** — re-derive every count before writing it (D660).
**Acceptance:** the programme's 8-condition done-gate, all eight. **~35 min.**

```
Task 1 (sonnet) ── Task 2 (inline, parallel)
      └─> Task 3a          Task 3b-f
              └──────┬──────┘
                  Task 4 (Step 5, inline)  ← doc written ONCE
                     └─> Task 5 (Steps 6+7) ─> commit ─> S1 CLOSED
```

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
- ~~17 stale agent worktrees~~ — **RESOLVED 2026-08-18.** `git worktree list` returns only the
  live checkouts and `.claude/worktrees/` is empty. The `git grep`-not-`grep -r` guardrail below
  still stands on its own merits, but the ~18× inflation this item warned about is gone.

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
- **Uncommitted: a CO-ACTIVE SESSION is live on this repo.** At handoff it held
  `gallery/style.css`, `info-box/style.css`, `post-grid/style.css`, `tabs/style.css` (and earlier
  `scripts/check-dead-controls.js`, a real fix to its comment-stripper, since committed). **The set
  moves — re-run `git status` yourself; do not trust this list.** Deliberately untouched: commit by
  explicit pathspec only, never `git add -A`, and never revert a file you did not change.

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
