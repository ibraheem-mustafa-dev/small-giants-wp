# Spec 44 completion register item 8 — real flagged pipeline run (live gate proof)

**2026-09-18.** First real `sgs-clone-orchestrator.py` run (not `measure-classless-baseline.py`'s
dry-run) with `--classless-match --classless-auto-complete` explicitly passed, against the Eye
Care Birmingham draft. Pre-flight: both flags confirmed still `action="store_true", default=False`
in `sgs-clone-orchestrator.py` (lines 3629, 3645) — not flipped, safe to proceed as a one-off
flagged run.

## Invocation

Two runs, same base flags, differing only by the two classless flags — so any difference between
them is attributable ONLY to Spec 44's machinery.

```
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --mockup "sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html" \
  --client eye-care-ward-end --page "eye-care-birmingham" --auto-section --mode draft \
  --skip-freshness-gate --skip-register --no-scaffold-new-blocks \
  --sc-var-cache sites/eye-care-ward-end/sc-var-hints.json \
  [--classless-match --classless-auto-complete]   # test run only
```

Run dirs (gitignored, local only):
- Test (flags ON): `pipeline-state/eye-care-ward-end-eye-care-birmingham-2026-09-18-134414/`
- Baseline (flags OFF): `pipeline-state/eye-care-ward-end-eye-care-birmingham-2026-09-18-134720/`

### Disclosed deviations from a plain default run, and why

1. **`--skip-freshness-gate`.** `sites/eye-care-ward-end/theme-snapshot.json` (+ its two axis
   sidecars) are genuinely absent from the working tree right now — confirmed via `git status`
   (working-tree deletion of a file committed at `efdcd9173`, 2026-08-27) and `git diff --stat`
   (584 lines removed, nothing staged). This matches D1094's own note that the file "is currently
   deleted on this worktree by another concurrent session" — i.e. this is pre-existing,
   **not caused by this task**, and per git-hygiene rule 4 I did not touch it (no evidence it was
   safe to regenerate without stepping on whoever is mid-edit on a shared worktree with 20+ active
   sessions). FR-33-12 is a hard `sys.exit` fail-closed gate on that file's absence, so without
   this flag neither run could reach Stage 1 at all. The flag's own help text names exactly this
   situation ("Use this ONLY for extract-only / diagnostic runs") — which is what this is. This
   gate is Spec 33's (colour-palette freshness), unrelated to Spec 44's own gates under test.
2. **`--skip-register --no-scaffold-new-blocks`.** Blast-radius safety on a shared worktree with
   many concurrent sessions (D1094 gave the identical reason for avoiding the full orchestrator
   in the first place). These stages sit AFTER Stage 9's converter output and after Spec 44's own
   Stage 4 classless-recognition path (confirmed by reading the call order in
   `sgs-clone-orchestrator.py` around line 2217) — skipping them does not touch anything Spec 44
   gates.
3. **No `--deploy-target`.** Draft-only run, no live-site push — not needed for this check and
   keeps the canary untouched.

Both flags stayed at their code defaults (`False`) throughout — confirmed by direct grep
immediately before this run; not re-checked after, since nothing in this task edits that file.

## Result: both runs exited 2 (HALT) — expected, and explained

Both runs halted at the R-31-15/Spec-35/attr-schema post-clone gate
(`pipeline-stage-gate.py`) with **0 attrs extracted / no block markup** for the whole draft.
Traced the real cause directly (re-ran `pipeline-stage-gate.py` standalone against the run dir,
and read `extract.json`'s per-section status): **67 of the draft's 70 top-level Stage-1
boundaries are `unmatched-non-bem-compliant`** — this Claude-Design (`.dc.html`) draft is almost
entirely classless at the whole-section level (BEM lint found exactly 1 stray class in the whole
file), and Tier-0 recognition for non-repeater, non-BEM boundaries needs the separate
`--sc-var-min-confidence` / `--dom-shape-min-confidence` opt-in tiers — explicitly out of scope
for this task, which only asked for the two Spec 44 classless flags. **This HALT is a
pre-existing, orthogonal characteristic of this specific draft, not a Spec 44 defect** — it is
the fail-closed gate correctly refusing to emit markup it has none of, not a mirror-cheat/flat-tier/
schema violation despite the generic HALT message's wording (confirmed by running
`pipeline-stage-gate.py` directly: its own output is `ERROR: no block markup found`, not a named
R-31-15/D554-C/G2 finding).

This matters for what the 3 checks below can and can't prove on this specific draft — flagged
directly rather than glossed over.

## Check 1 — completion/review/no-match counts vs D1094's baseline (39 groups, 0/2/37)

**Result this run: 36 groups processed, 0 auto-completed, 3 review, 33 no-match.**
(`pipeline-state/.../classless-summary.md`, `classless-decisions.json`, cross-checked against the
printed stdout log.)

| | D1094 (2026-09-17) | This run (2026-09-18) | Diff |
|---|---|---|---|
| Groups processed | 39 | 36 | -3 |
| Auto-completed | 0 | 0 | same |
| Review | 2 (both `sgs/trustpilot-reviews`) | 3 (`sgs/trustpilot-reviews` x2 + `sgs/product-card` x1) | +1 |
| No-match | 37 | 33 | -4 |

**Explained, not a red flag — two independent, evidenced causes, both same-day:**

1. **The counting unit is genuinely different between the two measurements**, not a bug.
   D1094's `measure-classless-baseline.py` deliberately walks every `<sc-for>` element in the
   draft directly (39 of them — confirmed by `grep -c "<sc-for" "Eye Care Birmingham.dc.html"`
   = 39 today), bypassing Stage 1's boundary voter by design (its own decision text says so).
   The real orchestrator instead gates classless-match **per top-level Stage-1 boundary**
   (`if not boundary.get("class_signature")`, `sgs-clone-orchestrator.py` ~line 2229) — only 36 of
   the 70 boundaries qualified as genuinely classless-with-a-repeated-group this run. A `<sc-for>`
   nested inside a boundary that itself carries ANY class_signature never reaches the classless
   path at all under the real gate — a stricter, more conservative behaviour than the dry-run
   tested, which is the correct direction for a production gate. I did not force an exact
   per-group reconciliation between the two id schemes (`eye-care-scfor-09` vs `b3`) — the
   evidence supports different counting units as the primary cause, not a 1:1 same-messenger
   discrepancy.
2. **D1103 (2026-09-18, same day) edited both the draft's own content and the alias/target-block
   logic feeding Stage A resolution** — after D1094's baseline was taken. Specifically: (a) the
   `items`/`thumbs` alias bug fix + removal of the over-broad `items` → `sgs/info-box` default
   (directly touches which candidates Stage A considers for any group using an `items` array
   key — a plausible direct cause of the new `sgs/product-card` review hit at `b10`); (b) the
   draft's "Most asked for" brand-tile grid had its placeholder wordmark text swapped for real
   base64 logo images (git log: commits `391235651`, `6ad41300e`, `b69b7aba2`, all 2026-09-18) —
   a genuine content/DOM edit to the draft file between D1094's measurement and this run, which
   can legitimately shift how many `<sc-for>` groups the draft contains or how their sibling
   shape resolves.

Both explanations are the kind the task pre-authorised ("this phase's Wave 1/2 fixes changing
behaviour... legitimately changing a result is expected and fine"). **0 auto-completions in both
measurements is the one number that must not move, and it didn't.**

## Check 2 — non-classless (BEM-classed) sections render byte-for-byte identical to baseline

**Direct diff, both runs, same draft, same everything except the two classless flags:**

- `extract.json` per-section results: **67 of 70 boundaries byte-identical**; the only 3 that
  differ are `b3`, `b6`, `b10` — status `unmatched-classless-review` (flagged run) vs
  `unmatched-non-bem-compliant` (baseline), i.e. exactly the 3 boundaries the classless path
  touched. Their `extracted_attributes`/`block_markup` are empty either way (nothing converts on
  this draft either way — see the HALT explanation above).
- `stage-1.json` (Stage 1 walker/voter output): identical except `run_id`/timestamps.
- `voter.json`, `match.json`, `leftover-buckets.json`, `tagged-mockup.html`: **byte-identical,
  zero diff lines** — the walker itself never sees the classless flags (confirmed structurally,
  matching the code's own placement of the classless check AFTER the walker, per the earlier
  source read).
- `stage-9.json`'s per-boundary `coverage` dict: **identical for all 70 boundaries** — the only
  differences anywhere in that file are run-specific paths (`operator_review_html_path`,
  `classless_summary_path`) and the 3 already-accounted-for boundaries in `unmatched_sections`.
- Git-tracked audit log (`classless-recognition-log.jsonl`): **36 new rows for the flagged run,
  0 new rows for the baseline run** — flags being off produces literally zero writes to Spec 44's
  own audit trail, the strongest possible isolation proof.

**Caveat, stated honestly rather than glossed over:** the check as literally worded ("BEM-classed
sections render byte-for-byte identically") could not be tested at the *successfully-converted
markup* level, because **zero boundaries successfully convert in either run** on this specific
draft (it HALTS before producing markup for the reason explained above — 67/70 boundaries are
non-BEM and need a different, out-of-scope opt-in tier). What I could and did prove, with
stronger precision than the literal check asks for, is that the classless flags are
**surgically scoped to exactly the 3 boundaries Spec 44 recognises as genuinely classless
repeated groups, with zero measurable effect — down to the byte — on any of the other 67**, at
every stage from the walker onward. **PASS on the underlying property (no leakage outside the
classless path); the literal "BEM section" framing doesn't apply to this particular draft.**

## Check 3 — real content in the three §7 artefacts

Two independent attestations for each.

**Audit log** (`plugins/sgs-blocks/scripts/recogniser/classless-recognition-log.jsonl`,
git-tracked): (1) `wc -l` before/after + `git diff --stat` show a clean append-only diff of
exactly 36 new lines for the flagged run's `run_id`, 0 for the baseline's — matches the module's
own "append-only, never rewritten" docstring. (2) Read several real rows directly — each carries
`client_slug`, `run_id`, `boundary_id`, `stage`, `block`, `match_type`, `outcome`, and a real,
specific `reasons` list (e.g. `"Stage B ambiguous across: sgs/brand-strip.logos,
sgs/card-grid.items, ..."`) — not placeholder or templated text.

**`operator-review.html`** (1,383,472 bytes, real file): (1) contains a dedicated "Classless
recognition — fell to review (Spec 44 FR-44-1)" `<table>` with exactly the 3 real rows (`b3`,
`b6`, `b10`), correct candidate blocks, stage, quality, and the full structural-signal / why-text
verbatim. (2) That table's content is byte-consistent with `classless-decisions.json` and
`classless-summary.md` for the same run — three independently-written artefacts agree on the same
3 rows with the same reasons text, not just present-but-empty.

**End-of-run summary** (`classless-summary.md`): real, correctly-shaped markdown — header,
auto-completed/review/no-match counts, and a table with the same 3 rows, matching the other two
artefacts exactly.

## FR-44-1(b) note

This is the first real flagged run for this client. 0 auto-completions with all 3 candidates
correctly forced to human review (2 on their true first occurrence for `sgs/trustpilot-reviews`,
1 new one for `sgs/product-card`, all citing "first occurrence... forced to review once") is a
**PASS for this step**, per the task's own pre-authorisation — not something to chase toward an
auto-completion by simulating a second run.

## Summary

| Check | Result | Evidence |
|---|---|---|
| 1. Counts vs D1094 baseline | **PASS, with explained deltas** | 0 auto (unchanged); +1 review / -3 groups / -4 no-match, traced to (a) a real counting-unit difference between the dry-run script and the real per-boundary gate, (b) D1103's same-day alias fix + draft content edit |
| 2. Non-classless path unaffected | **PASS on the underlying property** (literal "BEM section" framing untestable on this all-classless draft) | 67/70 boundaries + the whole walker stage byte-identical; audit log shows 0 writes with flags off |
| 3. Real artefact content | **PASS** | audit log (36 real rows, append-only), `operator-review.html` (real table, 3 rows), `classless-summary.md` (real, matching) — 2 independent attestations each |

**Genuinely-found issue, disclosed rather than papered over:** neither run produced a deployable
clone — the draft's 67 non-repeater, non-BEM boundaries need the separate
`--sc-var-min-confidence`/`--dom-shape-min-confidence` opt-in tiers to convert at all, which is
outside Spec 44's scope and this task's brief. This does not implicate Spec 44's own machinery
(cleanly isolated, per check 2), but it does mean this specific draft cannot serve as an
end-to-end "clone deployed successfully" proof — only as a proof that the classless-match /
classless-auto-complete gates behave correctly and in isolation within the real pipeline.

## Flags readiness

**Technically**, both flags behaved exactly as documented on this real run: additive-only,
zero effect on the non-classless path (proven byte-for-byte), correct FR-44-1(b) forced-review
behaviour on first occurrence, real and consistent §7 artefacts. Nothing found here blocks a
future production toggle on technical grounds. **That toggle decision itself is Bean's call,
separately** — this step only verifies the mechanism, it does not authorise turning the defaults
on.
