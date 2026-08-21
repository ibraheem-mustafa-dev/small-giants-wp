# Session prompt A — four shared-mechanism cleanups

Paste this whole file into a fresh session.

---

Invoke `/autopilot` before doing anything else.

**Plan label:** `[PLAN: opus]` for Phase 0 only; every phase after it is sonnet-dispatchable.
**USP:** finishes the consolidation started 2026-08-21. Four families of duplicated mechanism
collapse onto shared helpers — the largest is 63 files, the biggest single repeated shape in the
codebase. Done well, this is the last time anyone reads the same twenty lines in sixty files.

## Read first (cold entry)

1. `.claude/reports/2026-08-21-unenforced-prohibition-register.md` — the owed list this comes from
2. `plugins/sgs-blocks/scripts/migrate-render-closures.py` — the PROVEN pattern for exactly this
   job (survey / fix / check / self-test, with a negative control). Copy its shape; do not invent
   a new one.
3. `plugins/sgs-blocks/CLAUDE.md`, the triad section — anything touching more than ~3 blocks ships
   a detector first, not an edit.
4. `.claude/LEDGER.md` — check which tracks are live before touching any shared file.

## Non-negotiables (all four earned the hard way on 2026-08-21)

- **Commit by EXACT filenames.** A `src/blocks/*/render.php` glob satisfies the
  path-scoped-commit hook and behaves exactly like `git add -A`. It broke `main` for five minutes.
- **Whitespace-tolerant matching.** Several files use aligned assignment
  (`$sgs_css_keyword  = static function`, two spaces). A literal-space find/replace silently skips
  them — that is why one closure count read 45 before it read 52.
- **Preserve LF.** Verify with `file <path>` after every edit.
- **Compare phpcs to HEAD per file**, not merely "does it pass". Removing lines can merge
  assignment groups and trip an alignment sniff. Fix that by reinstating a BLANK LINE, never with
  `phpcbf` — it aligns the whole file and turns a scoped change into a 68/84-line executable diff.

---

## PHASE 0 — decide everything, inline, before any dispatch — `[SESSION-START]`

**Model:** inline · **Time:** 40 min · **Exec:** SEQUENTIAL · **Deps:** none

This phase exists so that Phases 1–4 need no judgement at all. Produce written answers to all six
questions and paste them into the plan file before dispatching anyone.

**Q1 — the corner-keyed helper's signature.** 21 sites across 8 files use
`$sgs_corner_shorthand` / `$sgs_radius_shorthand`, keyed topLeft/topRight/bottomRight/bottomLeft.
`sgs_box_object_shorthand()` is keyed top/right/bottom/left and cannot accept them.
**`before-after/render.php`'s version is UNTYPED and is called with a raw `null`**, relying on its
own `is_array()` guard; `hero`'s is typed `array`. **Decide: does the new shared helper take
`array` (and every caller pre-guards), or `mixed` (and it guards internally)?** Getting this wrong
fatals a page. Recommend `mixed` plus an internal guard — it matches the riskiest existing caller
and costs one `is_array()` call.

**Q2 — the uid target.** 21 files hand-roll `wp_unique_id()` / `uniqid()` instead of
`sgs_scope_class_for_root()` / `sgs_append_scoped_var_style()` in
`includes/helpers-scoped-instance-vars.php`. **Read three of the 21 and confirm the shared pair
covers what they actually do.** Some blocks derive a CONTENT-ADDRESSED uid
(`md5( wp_json_encode( $attributes ) )`) deliberately, so identical attributes yield an identical
uid on every page and the CSS collector can dedup across pages. That is not a per-request counter
and must not be consolidated away. Decide which of the 21 are genuine adopters.

**Q3 — the style-engine helper's shape.** 63 files carry the same
`if ( function_exists( 'wp_style_engine_get_styles' ) )` guard plus surrounding setup.
**No shared absorber exists — this is a DESIGN, not an adoption.** Read five representative call
sites (`accordion` has three in one file) and decide what the helper takes, what it returns, and
whether it owns only the guard or the whole args-array assembly. Write the signature down before
anyone touches a block.

**Q4 — the sanitiser hardening: accept or reject.** `sgs_css_length_sanitise()` (crude) versus
`sgs_css_length_value()` (hardened, in `helpers-css-safety.php`, whose own header calls this
migration "a separate task"). Four measured deltas:

| input | crude (today) | hardened |
|---|---|---|
| `10` | `10` | `var(--wp--preset--spacing--10)` |
| `-10px` | `10px` — sign silently lost, a real bug | `-10px` |
| `calc(100% - 20px)` | `calc10020px` — corrupted | preserved |
| `16px 12px` | `16px12px` — space lost | preserved |

**Decide whether to migrate at all**, and if yes, whether bare-number inputs actually occur — that
is the only delta which turns a working value into a *different* working value. The other three
turn broken output into correct output.

**Q5 — ordering and parallelism.** Recommended: Phases 1 and 2 run in PARALLEL (disjoint files,
both adoption work on a proven pattern). Phase 3 runs alone and sequential (63 files, one
mechanism, highest blast radius). Phase 4 goes last, because it is the only behaviour change and
must not be entangled with anything else — two overlapping changes are unfalsifiable.

**Q6 — is another track live in these files?** Run `git log --oneline -10` and `git status`. If
another session is committing, pick disjoint blocks or wait. Never share a file.

**Outcome:** six written answers, each a sentence or a function signature.
**Test — Happy:** a cold agent reads them and needs no further decisions.
**Edge:** if Q3 cannot be answered from five call sites, read ten — never guess a signature.
**Fail:** if Q1 or Q4 cannot be settled, STOP and ask Bean; both can break a live page.
**Integration:** the answers become the Phase 1–4 dispatch prompts verbatim.

## QA Gate 0 — the decisions are executable

**Model:** inline · **Exec:** SEQUENTIAL · **Deps:** Phase 0
**Check:** each of Q1–Q4 carries either a concrete function signature or an explicit GO / NO-GO.
**Pass:** no answer contains "probably", "TBD" or "depends".
**Fail:** return to Phase 0. Do not dispatch.

---

## PHASE 1 — corner-keyed shorthand helper — `[SESSION-START]`

**Model:** sonnet · **Time:** 45 min · **Exec:** PARALLEL with Phase 2 · **Deps:** QA Gate 0
**Files:** `includes/helpers-box.php` (new function) plus 8 named `src/blocks/*/render.php`
**Action:** add the helper to Q1's signature, migrate the 21 sites, and extend
`migrate-render-closures.py` to cover the family — it already knows how to skip them.
**On-fail:** `git checkout --` the 8 files; the script is idempotent, so re-run after fixing.
**Cold-entry:** Q1's answer plus `migrate-render-closures.py`
**Test — Happy:** `php -l` clean on all 8; `--check` reports zero corner closures remaining.
**Edge:** `before-after` called with `null` returns null rather than fatalling.
**Fail:** deliberately pass a non-array and confirm the guard catches it.
**Integration:** `npm run build` exits 0.

## PHASE 2 — uid boilerplate adoption — `[SESSION-START]`

**Model:** sonnet · **Time:** 45 min · **Exec:** PARALLEL with Phase 1 · **Deps:** QA Gate 0
**Files:** only the subset Q2 confirmed as genuine adopters — NOT all 21
**Action:** route each to `sgs_scope_class_for_root()` / `sgs_append_scoped_var_style()`. Leave
content-addressed uids alone; they are deliberate, not duplication.
**On-fail:** revert per file; no shared file is touched.
**Cold-entry:** Q2's answer plus `includes/helpers-scoped-instance-vars.php`
**Test — Happy:** the uid a block emits is UNCHANGED for identical attributes — hash before/after.
**Edge:** a page with 2+ instances of the same block still gets distinct scoping.
**Fail:** if any uid changes, stop — that invalidates cached lifted CSS in `uploads/sgs-css/`.
**Integration:** `npm run build` exits 0.

## QA Gate 1 — Phases 1 + 2

**Model:** haiku · **Exec:** SEQUENTIAL · **Deps:** Phases 1, 2
**Check:** `npm run build` exit 0; `php -l` clean on every touched file; per-file phpcs equals
HEAD; `git diff --stat` lists only intended paths.
**Pass:** all four true. **Fail:** revert the offending phase only, not both.

---

## PHASE 3 — the style-engine guard, 63 files — `[SESSION-START]`

**Model:** sonnet, dispatched in 3 batches of ~21, SEQUENTIAL between batches
**Time:** 2 h · **Deps:** Q3 plus QA Gate 1
**Files:** `includes/` (the new helper) plus 63 `src/blocks/*/render.php`, named per batch
**Action:** build the helper to Q3's signature WITH its own self-test and negative control first,
prove it on 3 files, then roll out in batches with a full gate run between each. Do not dispatch
all 63 at once. Re-baseline any suppression file ONCE after the whole batch and never mid-batch —
mid-batch re-baselining bakes transient false positives into the gate and defeats it.
**On-fail:** revert the batch, keep the helper.
**Cold-entry:** Q3's answer, the helper, and the batch file list
**Test — Happy:** emitted CSS for 3 sample blocks is byte-identical before and after.
**Edge:** a block where `wp_style_engine_get_styles` is genuinely absent still renders.
**Fail:** any emitted-CSS diff that is not byte-identical — stop, that is a behaviour change.
**Integration:** deploy to canary and compare a rendered page before and after.

## QA Gate 2 — Phase 3

**Model:** sonnet · **Exec:** SEQUENTIAL · **Deps:** Phase 3
**Check:** emitted-CSS byte-diff on 3 blocks returns empty; full prebuild chain exits 0.
**Pass:** both true. **Fail:** revert the batch, not the helper.

---

## PHASE 4 — sanitiser hardening, ONLY if Q4 said GO — `[HANDOFF]`

**Model:** inline for the call-site audit, sonnet for the edit
**Time:** 1.5 h · **Deps:** everything above complete and committed
**Files:** `includes/helpers-box.php` plus every confirmed call site
**Action:** migrate `sgs_css_length_sanitise()` callers to `sgs_css_length_value()`. This is the
ONLY behaviour change in the plan. It ships alone, with its own commit and its own live
verification, or the whole plan becomes unfalsifiable.
**On-fail:** revert wholesale; nothing else depends on it.
**Cold-entry:** Q4's answer plus the delta table above
**Test — Happy:** a `calc()` value that was corrupted now renders correctly.
**Edge:** a bare number — the one delta that changes a working value into a different one.
**Fail:** a negative value keeps its sign (it does not today).
**Integration:** canary deploy plus a real page comparison, with a negative control.

---

## Key Judgement Calls

- **Q1, typed vs mixed** — recommend `mixed` with an internal guard.
  Cost of wrong choice: a fatal page on any block that passes null.
- **Q4, migrate or not** — recommend GO, but strictly as its own wave.
  Cost of wrong choice: silent rendering changes attributed to the wrong commit.
- **Phase 3 batch size** — recommend 21.
  Cost of wrong choice: a 63-file diff nobody can meaningfully review.

## Pre-emptive decisions, so nothing pauses mid-execution

- **"Should I also fix the phpcs warnings I can see?"** No. Compare to HEAD and leave pre-existing
  ones alone. Only fix warnings your own change introduced.
- **"The build failed — is it me?"** Revert, rebuild, re-apply, rebuild. A transient failure on
  2026-08-21 was wrongly attributed to a change before that four-step test was run. One
  observation is not a cause.
- **"Can I use phpcbf to tidy the alignment?"** No. It rewrites whole files.
- **"A comment contradicts the code — do I fix it?"** Report it; do not fix facts unilaterally.
  Three such comments were found on 2026-08-21 and two needed Bean's ruling.
- **"Can I run `/sgs-update` or re-seed the DB?"** Not while another track is committing. It has
  broken both tracks' builds before.
