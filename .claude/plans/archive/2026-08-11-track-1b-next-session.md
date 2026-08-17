---
doc_type: plan
title: "Track 1b — finish pass 1, then passes 2-3, then Spec 39's design calls"
date: 2026-08-11
spec_ref: .claude/plans/spec-35-flat-to-object-migration-design.md (signed off) · D552-D555
status: PLANNED
---

# Next session — Track 1b

## FOR BEAN — plain English

**Where we are.** The first property (`gap`) is migrated across 21 blocks, deployed, and proven
working on the live canary. It is **not committed** — the visual-diff gate wants one report per
block and there are 21 of them. That is the first job, and it is mostly a scripting job.

**Then two more passes**, which should be far cheaper than the first: the codemod now exists, the
wrapper already handles the new shape universally, and the traps are known and written down.

**Then the converter.** Cloning still emits the old shape. Spec 39 is that rework — it is still a
SEED, not a spec, and it needs three genuine design decisions before anything is built.

---

## Reading list — Spec 35 order, NOT the cloning-pipeline order

⛔ **Do NOT open Spec 31 end-to-end for this session.** The project rule that mandates it says
*"every **cloning-pipeline** session"* — this is BLOCK-STANDARD work, so the precondition does not
hold. It was carried into an earlier handoff as boilerplate and displaced the spec that actually
governs. Spec 31 is ~195KB; reading it whole here is a large unjustified cost.

| # | Read | Why |
|---|---|---|
| 1 | `.claude/LEDGER.md` | State + orchestration plan |
| 2 | **`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md`** | **THE GOVERNING SPEC** (ACTIVE v2.0) — the one that was missing from the list |
| 3 | `plans/spec-35-control-type-contract.md` | The canonical control set (GOVERNING for §12 storage shape) |
| 4 | `plans/spec-35-flat-to-object-migration-design.md` | The live migration design + rulings A-D |
| 5 | This plan | The task breakdown |
| 6 | `decisions.md` D556-D559 | This migration's rulings |
| 7 | `.claude/STOP-CATALOGUE.md` | 202 entries; the newest 5 are last session's |
| 8 | `~/.claude/plans/go-track-1b-playful-hamster.md` | Programme scope + phase status — for WHY/WHAT-ELSE, **not the entry point** |
| 9 | `plans/spec-39-seed-requirements.md` | **Wave 3 only** — do not front-load it |
| 10 | Spec 31 §13 + the orchestrator gate slot (`:70`, `:2053`, `~:2645-2670`) | **T2 only, targeted** — never end-to-end for this track |

## Delegation shape (Bean-directed: parallel, delegate, offload the repetitive)

| Kind of work | Who | Why |
|---|---|---|
| Design calls, gates, anything with a judgement | **Opus inline** | This month proved gates fail three distinct ways when rushed |
| Repeated per-block application behind a proven detector | **Sonnet, ONE block at a time** | STOP-2 / STOP-39 — parallel writers cascade-fail here |
| Pure mechanical text/file work with a checkable result | **Haiku** | Archiving, report generation, roster edits |
| Anything done more than twice | **A script, committed** | The triad rule (D542): survey → fix → check |

⛔ **The rule I broke tonight, written down so it does not recur: never dispatch an agent onto a
file the main thread is still editing.** I sent a rename agent into
`class-sgs-container-wrapper.php` mid-migration; it half-renamed a variable, `php -l` passed
anyway (undefined variables are not syntax errors), and the broken state reached the canary.
**Before any dispatch: list the agent's files, and confirm none is open in my own working set.**

---

## WAVE 1 — four tracks, fully parallel, file-disjoint

### T1 — Unblock the pass-1 commit *(INLINE + script; the blocker)*

**Problem.** The commit needs `reports/visual-diff/<block>-<date>.md` per block with
`verdict: PASS`, `first_paint_capture_passed: true`, and a `source_sha` matching staged content.
21 blocks. Most of the pages that carried those blocks were binned in the gap migration.

**Do NOT** write 21 reports from one block's capture and call it evidence — that is the
fabrication the gate exists to prevent, and this repo has a recorded incident of exactly that.

**Approach:**
1. Build ONE canary page carrying an instance of each of the 21 migrated blocks (WP-CLI/REST).
   Each block gets a real object-shaped `gap` so the migrated property is genuinely exercised.
2. Capture it once at 1440/900/390 with the existing script shape
   (`scratchpad/capture-hero.py` is the working reference — computed values, not just pixels).
3. **Write `scripts/make-visual-diff-reports.py`** — takes the capture JSON + the block list and
   emits one report per block, each citing *its own* measured element from that capture, with the
   correct `source_sha` from `visual-report-sha.py`. Mechanical, repeatable, reusable for passes
   2-6. **This script is the deliverable, not the 21 files.**
4. Commit pass 1.

**Acceptance:** every report cites a measurement of *that block*; the gate passes; the commit lands.
**Estimate:** 40 min. **Model:** Opus inline for the page + script design; the per-block report
generation is the script's job, not an agent's.

### T2 — T6 clone-output gate *(DELEGATE · Sonnet · file-disjoint)*

Fail a clone run that emits a flat tier for a property already migrated on the target block
(ruling C). The slot is known and precedented: `sgs-clone-orchestrator.py:2053` writes
`extract.json`; the R-31-15 gate already runs there (`:70`, ~`:2645-2670`, `--skip-stage-gate`
at `:2404`). Build beside it with its own skip flag.

⛔ **Needs a POSITIVE CONTROL** — a fixture clone that provably TRIGGERS it. `gap` is now migrated,
so unlike last session that control can finally exist. "It stopped firing" is vacuous.
**Estimate:** 45 min. **Gate after:** `/qc-inline`.

### T3 — Compact `MEMORY.md` *(DELEGATE · Haiku · pure mechanical)*

At **24,531 of 24,576 bytes** — 45 bytes of headroom. Past the cap the file is silently truncated
and rules stop loading with no error, so this blocks every new memory entry.
**Archive, do not trim** (the standing rule): move older entries verbatim to `MEMORY-archive.md`,
keep one-line index pointers. Target ≤ 20,000 bytes to leave real headroom.
**Acceptance:** `handoff-preflight.py --check` passes; no entry lost, only moved.
**Estimate:** 15 min.

### T4 — Spec 39 pre-reads *(DELEGATE · Sonnet · READ-ONLY)*

Spec 39's own R6a says two things must be read before designing:
- `route_area_css_to_block_attrs` docstring — GRID_AREA object shape may already be half-solved.
- `css_pass.py:211-255` — the merge-order site object emission must slot into.

Also **re-verify R1's file/line table against current `main`** — it was captured 2026-08-10 and
this session moved code. Report drift; change nothing.
**Estimate:** 25 min.

---

## WAVE 2 — passes 2 and 3 *(SEQUENTIAL — they touch the same blocks)*

Both follow the pass-1 recipe, which is now proven end-to-end:

```
python scripts/migrate-tier-object.py --property <p> --survey     # census
python scripts/migrate-tier-object.py --property <p> --fix        # propose (writes nothing)
python scripts/migrate-tier-object.py --property <p> --fix --apply
# then the follow-ups the codemod REPORTS, per block
python scripts/migrate-tier-object.py --property <p> --check      # gate
```

**Pass 2 — `maxWidth` + `contentWidth`.** Already object on gallery + both row blocks, and their
centring defect was fixed at `1979c419`, so the known trap is closed.
**Pass 3 — `gridTemplateColumns` + `gridTemplateRows`.** `site-footer-row.gridTemplateColumns` is
the ONE finding the P1 gate still baselines — pass 3 takes that gate to **zero**, which is its
named promotion trigger. **Wire it into `prebuild` at that point.**

**Worth doing first, and it pays for itself twice:** extend `migrate-tier-object.py` with a
`--fix-reads` mode that applies the now-proven `render.php` pattern
(`sgs_responsive_normalise_object()` + per-tier fallbacks) as a PROPOSAL for human sign-off.
Pass 1 needed 6 such edits by hand; passes 2-6 will need dozens. **Offload it to the script.**

⛔ **Per-pass, non-negotiable** (each already fired once tonight):
- Casting an object attr to string emits `"Array to string conversion"` every render plus literal
  `gap:Array`. Fix every direct read or prove none exists.
- Theme patterns store the flat shape too. `check-dead-pattern-attrs.py` catches them — it caught
  16 in 14 files during pass 1. Migrate the pattern markup in the same commit.
- Canary pages holding the flat shape get binned (ruling B), **with a content backup first**.
  `build-deploy.py`'s `oldshape-audit` blocks the deploy until they are gone — that is the gate
  working, not an obstacle to route around.

**Model:** codemod run + design inline; per-block follow-ups delegated to Sonnet **one block at a
time**. **Estimate:** 1h per pass.

---

## WAVE 3 — Spec 39's three design calls *(INLINE, Opus — do not delegate)*

Informed by T4. These are the decisions the seed leaves open, and each is architecture:

1. **R1** — object-only emission, or dual-shape during a transition keyed on per-block status?
2. **R2** — does the object shape need a new tier vocabulary, or does `modifier_suffixes(kind='breakpoint')` retire for tier purposes?
3. **R3** — keep a derived per-tier view (cheap, defers the converter change, but two representations of one truth), or migrate every consumer to read the object directly?

**R4 is already answered by this session's P2** and should be written in as the input it is: a base
attr carries `css_tier='desktop'` when per-tier sibling ROWS exist, and `NULL` when the tiers live
inside the value. `_reconcile_object_family_tiers` enforces it.

⛔ **R5 — keep the BOX `{top,right,bottom,left}` axis and the TIER `{desktop,tablet,mobile}` axis
orthogonal.** Conflating them is what made the P1 gate's first two rule attempts wrong.

**Output:** promote the seed to a real spec (`specs/39-*.md`), or record explicitly why not.
**Estimate:** 1h.

---

## Sequence

```
WAVE 1 — parallel, file-disjoint
  T1 commit-unblock  [INLINE + script]  ── the blocker
  T2 clone gate      [Sonnet]
  T3 MEMORY compact  [Haiku]
  T4 Spec 39 reads   [Sonnet, read-only]
        ↓ T1 must land before Wave 2 (do not stack two uncommitted passes)
WAVE 2 — SEQUENTIAL (same blocks)
  Pass 2  maxWidth + contentWidth   → commit
  Pass 3  gridTemplateColumns/Rows  → commit → P1 gate hits 0 → WIRE INTO PREBUILD
        ↓
WAVE 3 — Spec 39 design calls [INLINE]
```

**Not in scope, and why:** passes 4-6 (`columns`, font-size families, the tail) — pass 4 needs the
3 pattern files carrying `columns` siblings updated in the same commit, and the font-size families
route through `TypographyControls`, a different edit shape. Phase 2.1 (extension opt-in inversion)
— separate front, gated on deriving its roster from real `post_content` (D545).
Phase 3.2a — ⛔ its input has a **measured false-positive rate**; it is a decision, not a build.

---

## Traps that cost real time tonight

- **Never dispatch an agent onto a file you are editing.** Cost: a half-renamed shared wrapper,
  deployed. `php -l` passes on undefined variables — it is not a safety net for a rename.
- **Scope DOM queries.** `querySelector('.wp-block-sgs-container')` returned the site *header*, not
  the probe block, and I reported a false failure from it.
- **Never select a site with a glob.** `ls ~/domains/*/public_html | head -1` picked `feldeluxe.com`.
  There are 11 WordPress installs on that server. Name the path.
- **Check what a number describes.** "12,565 tier-attribute instances" was the *block* count; the
  real figure was 2,962.
- **A match inside a comment is not a usage** — `trust-bar` needed no change for exactly this reason.
- A grep starting `--` is eaten as a flag (use `-e`); `grep -c` exits non-zero on zero matches.

## Verification

- `npm run build` exit 0 · `python -m scripts.db-consistency.run --check` exit 0
- `migrate-tier-object.py --property <p> --check` green per pass
- `check-tier-storage-shape.py --check` — 1 finding now, **0 after pass 3**
- Live editor + frontend check at a viewport where the value actually binds
- Commit path-scoped on `main`, branch re-checked in the same command
