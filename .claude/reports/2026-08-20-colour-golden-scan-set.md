# The colour golden — the COMPLETE scan set (the POC)

```
doc_type: report
created:  2026-08-20
updated:  2026-08-20 (banned-lookalike depth fix applied; block-level overlap computed)
status:   PARTIAL — see status block below, not "complete"
purpose:  what a finished control-type audit scans for, in totality, and the exact
          commands that produce it. Colour is the only type where all of this runs.
```

## Status — read this first

**Verdict: PARTIAL.** Colour is measurably closer to "fully working" than the version of
this doc from earlier today, but it is not there. What changed and what's still blocking,
in plain English:

**Done this session:**
1. The `bannedLookalikes` axis's "resolution depth" hole (§ below) is fixed — the scanner
   now actually looks deep enough to find a banned colour picker wherever it's nested, not
   just one level down. Re-run: `python scripts/surveys/compare-reach-depth.py .` +
   `node scripts/surveys/survey-golden-conformance.js --self-test`.
2. The relationship between rule 31's 409 findings and the colour-coverage survey's 120
   findings is now measured at the **block level** (not just asserted as "unreconciled") —
   see "Block-level overlap" below. Re-run: `node scripts/inspector-scan/run.js --json` +
   `python scripts/surveys/survey-colour-coverage.py --json`, then intersect the `block`
   fields.
3. **A full master table now exists (below) covering all 8 scanners, every finding
   category, with the exact script/command/field behind each number** — this is what was
   actually missing before: not new data, but a single fact-checked place to see it. Found
   2 real corrections doing this: `survey-control-gaps.py`'s 17 findings were presented as
   colour-relevant when zero carry a colour `valueKind`, and `survey-colour-coverage.py`'s
   102 `unclear` findings were never surfaced at all.
4. **Every row of the master table is now ground-truth-verified via a 4-rater QC council**
   (source code, live Playwright on the sandybrown canary, DB cross-check, independent
   re-trace) — not just re-run and trusted. Found and fixed 2 real bugs the numbers alone
   never would have surfaced: `sgs/feature-grid`'s misleading "Layout type" control (root-
   caused via `/systematic-debugging`, deployed live) and `compare-reach-depth.py`'s own
   non-deterministic LIFO-traversal race (root-caused, fixed to BFS, self-tested with a
   negative control that genuinely fails 3-of-5 runs against the old code).

⛔ **STATUS UPDATED 2026-08-21 — items 1 and 4 below are now DONE. Read this block before
the list, which is preserved for its reasoning, not its status.**

| Was blocking | Now |
|---|---|
| 1. Rule 31 blind to shared panels | ✅ **DONE** `20332725`. 409 → 420 → **418**. One finding per (owner file, rowKey) with a machine-readable `mountedBy` array (D705). `banned-lookalike` deliberately stays `edit.js`-only and still reads 0 |
| 2. Defect-level matching | ❌ still open — but the join key is now identified: BOTH sides compute `attrName` and BOTH discard it |
| 3. Gradient axis is a floor | ❌ still open, unchanged |
| 4. Colour's own `cssProperties` | ✅ **DONE** `0c44b0c6`. Required a `(?<![-\w])` lookbehind in `ownPaintRegex()` first, or a bare `color` alternative would also have matched `--brand-color:` and moved the census. Measurement proven unchanged |

⚠ **The 409 figure is superseded — it is 418.** The +9 net is honestly composed: +10 shared-owner,
+2 from a non-conformant container row this track shipped and then fixed, −1 from the shop track
flipping `sgs/trust-bar`'s `supports.color.text` false, −2 as that container row was completed.
A total that matches a prediction for the wrong reasons is a false confirmation; see `rules.json`'s
`advisoryReason`, which records the arithmetic rather than the headline.

**Original list (reasoning preserved, status superseded by the table above):**
1. **Rule 31 (the 409 number) is still blind to ~30 blocks reached only through shared
   wrapper panels** — it reads each block's own `edit.js` and nothing else. This is the
   single biggest remaining gap: 409 is a floor, not a ceiling, and nobody has switched it
   to the wider resolver that already exists (`resolveComponentFiles()`) because that's a
   load-bearing count change needing its own measured before/after pass, not a same-session
   bolt-on.
2. **Defect-level matching is still not done.** We now know 33 of the 34 blocks
   `survey-colour-coverage.py` flags are ALSO flagged by rule 31 (see below) — but we still
   don't know whether any specific finding in one is the same underlying bug as a specific
   finding in the other. That's a different, harder question than "do the same blocks show
   up," and it's still open.
3. **The gradient axis is a floor with an unknown false-PASS rate.** `row-missing-gradient`
   (193) checks whether *a* gradient path exists, not whether it's the *mechanism-correct*
   one for what the row paints — a text row wired to the background mechanism would pass
   clean while rendering nothing. Not touched this session.
4. **Colour's own schema declaration is still the exception, not the reference.**
   `golden-controls.json`'s colour row still doesn't declare
   `qualifiesWhen.paintsOwnSurface.cssProperties` as a structured array (only
   typography/box-4value/border/shadow do) — colour still relies on a hardcoded regex
   fallback in `survey-golden-conformance.js`, the same fallback every undeclared type
   inherits. So "colour is the reference implementation for the other 20 types" is
   backwards as stated; not fixed this session.

⛔ **Every figure below was produced by the command beside it on 2026-08-20 at `8fcbd32e`,
except the two sections marked "re-verified 2026-08-20 (session 2)" which reflect this
session's fix and measurement.** Do not quote a number from this file without re-running
its command — and do not re-derive any of them by matching a detector's message prose.
That is how two fabricated tables got written and deleted on 2026-08-20; the rule's own
`key` field is the taxonomy.

**Session 3 (2026-08-20, same day)** re-ran all 8 sources fresh (raw JSON/text saved to
`.claude/reports/2026-08-20-colour-golden-raw/`), built the master table below with a
script/command/field for every number, and found **two real corrections** the earlier
sessions had gotten wrong by omission (§ Master table notes): `survey-control-gaps.py`'s
17 findings were presented as colour-relevant when in fact zero of them carry a colour
`valueKind`, and `survey-colour-coverage.py`'s 102 `unclear` findings were never surfaced
at all — only its 33+87=120 "confident" findings were.

---

## Master traceability table — every number, its exact source, and how it was verified

⭐ **This is the direct answer to "what part of each script produced each number."** One
row per metric. `Field read` names the literal key/path in that script's own output — not a
paraphrase. `Verified` states the check actually done, not just "looks right."

| # | Metric | Value | Script | Exact command | Field read | Verified |
|---|---|---|---|---|---|---|
| 1 | Row-shape: below-minimum-states | **191** | `inspector-scan/rules/31-golden-colour-control.js` | `node scripts/inspector-scan/run.js --json` | `findings[].status=="FLAGGED"` AND `key.split('\|')[3]=="row-below-minimum-states"` | Re-run fresh 2026-08-20 session 3; raw saved `rule31.json` |
| 2 | Row-shape: missing-gradient | **193** | same | same | `key` kind `row-missing-gradient` | Re-run fresh — ⚠ binary path-exists check, not mechanism-aware (§ Addendum 1) |
| 3 | Row-shape: native-colour-ui | **25** | same | same | `key` kind `native-colour-ui` | Re-run fresh — excludes `__experimentalSkipSerialization` (required by conformant shape, not a UI flag) |
| 4 | Row-shape: banned-lookalike | **0** | same | same | `key` kind `banned-lookalike` | Re-run fresh; regression guard, expected at zero |
| 5 | Row-shape: roster-surface-unknown | **0** | same | same | `key` kind `roster-surface-unknown` | Re-run fresh; null-surfaces guard |
| 6 | Row-shape TOTAL | **409 findings / 63 distinct blocks** | same | same | `status=="FLAGGED"` count / `new Set(findings.map(f=&gt;f.block)).size` | Re-run fresh; `mode:"advisory"`, `openBacklog:409` in `rules.json` |
| 7 | Block census: canonical | **64 CONFORMANT · 1 VIOLATION · 12 MISSING · 6 NOT-APPLICABLE** | `survey-golden-conformance.js` | `node scripts/surveys/survey-golden-conformance.js --json` | `rows.filter(type=="colour").axes.canonical.verdict` | Re-run fresh — ⚠ drifted from the earlier same-day figure (63C/13M) by one block; re-measured, this is current, not the old cache |
| 8 | Block census: nativeUi | **58 CONFORMANT · 25 VIOLATION** | same | same | `axes.nativeUi.verdict` | Re-run fresh |
| 9 | Block census: bannedLookalikes | **83 CONFORMANT / 0 VIOLATION** | same | same | `axes.bannedLookalikes.verdict` | Re-run fresh — **fixed this session** (depth 1→4 hops, § Resolution depth); real-file self-test pinned |
| 10 | Block census: hoverMechanism | **8 CONFORMANT · 9 UNCLEAR · 66 N/A** | same | same | `axes.hoverMechanism.verdict` | Re-run fresh |
| 11 | Block census: gradient | **25 CONFORMANT · 58 VIOLATION** | same | same | `axes.gradient.verdict` | Re-run fresh — ⚠ this axis READS row 2's rule-31 output rather than computing independently (by design, avoids a second row-resolver) |
| 12 | Colour-coverage: state-uncontrolled | **33** | `survey-colour-coverage.py` | `python scripts/surveys/survey-colour-coverage.py --json` | `findings_state.length` | Re-run fresh; raw saved `colour-coverage.json`. **QC council 2026-08-20:** 3 random findings source-checked — substance CONFIRMED on all 3 (real hardcoded colour, no controlling attribute), but the `line` field was wrong by 1-6 lines in 2 of 3 (points near, not at, the actual rule). Treat `line` as approximate; the finding's existence is real. |
| 13 | Colour-coverage: base-uncontrolled | **87** | same | same | `findings_base.length` | Re-run fresh — same line-citation caveat as row 12 |
| 14 | Colour-coverage: unclear | **102** | same | same | `unclear.length` | ⚠ **Not previously surfaced in this report at all** — only the 33+87=120 "confident" total was quoted. Corrected this session. |
| 15 | Colour-coverage: block scope | **34 flagged / 49 clean / 83 scanned** | same | same | `blocks_with_findings.length` / `blocks_clean` / `blocks_scanned` | Re-run fresh |
| 16 | Colour-controls: total colour attrs | **309** | `survey-colour-controls.py` | `python scripts/surveys/survey-colour-controls.py --json` | `total_colour_attrs` | Re-run fresh; raw saved `colour-controls.json` |
| 17 | Colour-controls: no control found | **295 of 309 (95%)** | same | same | `no_control_found.length` | ⚠ **Spot-checked twice, independently, not taken at face value.** First pass: `sgs/accordion` entries confirmed genuinely controlled via `SgsColourPanel`'s data-driven `rows` array. **QC council 2026-08-20, second independent rater, 3 DIFFERENT blocks** (`sgs/filter-search`, `sgs/business-info`, `sgs/testimonial-slider`): 3 of 3 also had real, functioning controls the heuristic missed for the same reason. **Read this 295 as "heuristic blind to the shared-panel pattern," not "295 real gaps" — now confirmed on 6 independent samples, 0 real gaps found.** |
| 18 | Colour-controls: divergences | **0** | same | same | `Object.keys(divergences).length` per property | Re-run fresh; empty object |
| 19 | Colour-controls: unresolved attrs | **1** | same | same | `unresolved_attrs.length` | Re-run fresh |
| 20 | Control-gaps: colour-relevant | **0 of 17 total findings** | `survey-control-gaps.py` | `python scripts/surveys/survey-control-gaps.py . --json` | `findings.filter(f=&gt;f.valueKind=="colour").length` vs `findings.length` | ⚠ **Correction.** The original version of this report listed "17" under "cross-cutting detectors that catch colour defects" — checked the actual `valueKind` field this session: the 17 break down `url:3 · date:3 · length:8 · css-value:3`, **zero tagged `colour`**. This tool currently contributes NOTHING to colour's picture. Corrected. |
| 21 | Undeclared-attrs: colour-relevant | **1 of 3 total findings** | `check-undeclared-attrs.py` | `python scripts/check-undeclared-attrs.py` (no `--json` — text output, hand-parsed) | grep block+attr lines | Re-run fresh; the 1 colour finding is real and live: `sgs/quote`'s `backgroundColourHoverGradient` is destructured in `edit.js` but never declared in `block.json` — WordPress silently discards the write. |
| 22 | Inert-controls: colour-relevant | **0 of 1 total finding** | `check-inert-controls.py` | `python scripts/check-inert-controls.py` (no `--json` — text output, hand-parsed) | grep block+attr line | Re-run fresh; not colour. **RESOLVED and FIXED 2026-08-20** via `/systematic-debugging` (§ below) — the underlying bug was real. |
| 23 | Reach-depth reference (informational, not a colour finding count) | see § Resolution depth table | `compare-reach-depth.py` | `python scripts/surveys/compare-reach-depth.py .` (no `--json` — text table, hand-parsed) | printed table | **RESOLVED and FIXED 2026-08-20 via `/systematic-debugging` — see § below.** Root cause proven (LIFO-stack traversal race, non-deterministic per Python's per-process hash seed), fixed (BFS/FIFO), self-tested with a negative control that genuinely fails 3-of-5 runs against the old code. 3 fresh runs post-fix are byte-identical, and the monotonic superset property (`depth1_alias ≥ depth1_noalias`) now holds for every watched component. |
| 24 | Block-level overlap (row 6 vs row 15) | **33 shared (97% of coverage's 34) · 30 rule-31-only · 1 coverage-only (`sgs/container`)** | rule31.json ∩ colour-coverage.json | (both commands above) | `Set` intersection on `block` (rule 31) vs `block_slug`/`blocks_with_findings` (coverage) | Computed fresh, re-confirmed identical to the earlier same-day computation (§ below) |

**Raw evidence:** every command's actual output is saved verbatim under
`.claude/reports/2026-08-20-colour-golden-raw/` (8 files) — re-derive any row above by
diffing a fresh run against the saved file, not by re-reading this table.

---

## Fact-checking protocol (applied to every row above)

Two tiers, chosen by blast radius — this is what "verified" in the table actually means:

- **Tier A — re-run + exact field assertion.** Every row above was re-run fresh this
  session and read via the named field path, never eyeballed from printed totals. This is
  what caught row 1's/2's `kind` trap (findings carry no `kind` property — must split `key`
  on `|`, index 3) and row 6's FLAGGED-vs-all-statuses trap in past sessions.
- **Tier B — hand spot-check of a sample.** Applied to row 17 (`no_control_found`) and row
  20 (`control-gaps` colour-relevance), because both scripts' own docstrings admit a
  heuristic, not an AST parse. Sampling caught row 17 was measuring a heuristic blind spot,
  not a real gap, and row 20 was mislabelled entirely in the earlier version of this report.

### /qc-council — 2026-08-20, ground-truth validation (not re-derivation)

Bean's explicit correction after the first pass: **re-running a tool and getting the same
number twice is not verification of accuracy.** A 4-rater diagnostic council was dispatched
to independently fact-check random samples from each bucket against REAL ground truth —
the actual block source files, live editor/frontend via Playwright on the sandybrown
canary, and the sgs-framework DB — never by re-running the survey scripts.

**Method:** Rater A (source-of-truth) verified 10 rule-31/census claims by reading real
`block.json`/`edit.js`/`render.php`/`style.css` files. Rater B (live Playwright) verified 3
claims by actually using the live block editor and rendered frontend on the canary. Rater C
(DB + structural-diff) verified 8 colour-coverage/colour-controls/control-gaps claims
against `sgs-framework.db` and real source. Rater D (independent trace) re-derived the
5-file depth-fix chain from scratch, without reading the code that made the original claim.

**Result: 21 of 24 checks CONFIRMED against real ground truth, 1 needed a follow-up
correction (resolved), 2 real defects found that the samples themselves didn't predict:**

1. **`survey-colour-coverage.py`'s `line` field is unreliable** — off by 1-6 lines in 2 of
   3 independently checked findings (points near, not at, the actual CSS rule). The
   findings' SUBSTANCE was confirmed correct in all 3 cases; only the line citation is
   imprecise. Noted at master table rows 12-13.
2. **`sgs/site-footer/edit.js` carried a stale, self-contradicting comment** (claimed "no
   control mounted" directly above code that, 120 lines earlier in the same file, mounts
   exactly that control) — found by Rater A while verifying row 7's claim, unrelated to
   what it was sent to check. **Fixed this session** (dead comment removed).
3. **Row 22's `check-inert-controls.py` finding needed a live-test caveat, not a rejection.**
   Rater B's live test looked like a contradiction (switching a value rendered correctly),
   but tracing `render.php` showed the test exercised a different code branch than the one
   the finding is actually about. The underlying claim is plausible and unfalsified, not
   confirmed by a passing live test that never reached the relevant branch. Corrected at
   row 22 — this is the one row in the table that is NOT closed.

**Also independently re-confirmed:** the entire 5-file, 4-hop reach chain behind this
session's depth fix (`accordion/edit.js → ContainerWrapperControls → BackgroundPanel →
GradientOverlayControl → DesignTokenPicker → ColorPalette`) and the `SgsColourPanel`
runtime-selection blind spot, both traced from scratch by a rater with no access to the
code that produced the original claim.

### `/systematic-debugging` — `sgs/feature-grid` `layout` attribute, 2026-08-20

Not colour, but the one row the QC council left open — closed properly rather than left
ambiguous. Root cause (proven against real source, not inferred):

- `feature-grid` genuinely exposes a client-facing "Layout type" dropdown (Stack/Flex/Grid)
  via `ContainerWrapperControls kind="layout"` → `LayoutPanel` (`showLayout` defaults
  `true`, `LayoutPanel.js:48,64-73`), bound to a real `layout` attribute (`block.json`
  declares it, string, default `""`).
- `render.php:156` unconditionally overwrites that attribute to `'grid'` whenever
  `has_explicit_grid` is true — silently discarding whatever the dropdown showed, in that
  one branch.
- `sgs/card-grid`, the closest sibling using the identical `kind="layout"` pattern, has NO
  such override — it trusts the client's `layout` choice unconditionally. `feature-grid` is
  the anomaly, not the pattern.
- The real root cause: `feature-grid`'s OWN `layoutMode` control (auto-flex / fixed-columns)
  is its true, intended selector, and **every one of its three render branches always emits
  `display:grid`** — the generic Stack/Flex/Grid dropdown never offered feature-grid a real
  choice at all. `render.php`'s override existed purely to paper over that a control the
  block never needed was left switched on.

**Fix:** `showLayout={false}` on `feature-grid/edit.js`'s `<ContainerWrapperControls>` mount
— the exact mechanism this codebase already built for "block owns its OWN layout control"
(`ContainerWrapperControls.js:224-228`'s own docstring), just never applied here. Removes
the misleading dropdown; `render.php`'s force-grid line is now honest internal plumbing
with nothing left to silently override.

**Verified live, both surfaces, on the sandybrown canary (commit `f805a400`):**
- Build exit 0, deployed via `build-deploy.py --target sandybrown --blocks-only --skip-build`
  (the one sanctioned path), payload-verify PASS (83/83 block.json match), smoke-test HTTP 200.
- **Editor:** the generic "Layout type" dropdown is confirmed GONE from the Container/Wrapper
  panel. The block's own "Layout mode" (Auto-flex / Fixed columns) control still works —
  switched to `auto-flex`, saved, reloaded cold, value persisted correctly, zero
  block-validation errors.
- **Frontend:** published and viewed live at 1440px — genuine 4-up auto-flex wrap grid
  rendered correctly, 24px gap, all content intact, zero console errors. Confirms `layoutMode`
  drives `render.php` end-to-end, not just the editor preview.

Committed and deployed — not a local-only fix.

⛔ **Not yet built: automated staleness detection.** Nothing currently re-runs these 8
commands and diffs against the table automatically when one of the 8 scripts changes — the
table can go stale the next time someone edits `survey-colour-coverage.py` and nobody
remembers to re-run this pass. A `--check-report` diff-mode script (re-run all 8, assert
against checked-in values, fail on drift) was named as a candidate this session but is not
built and not parked — it needs Bean's decision on whether it's worth building at all before
it goes anywhere.

---

## Why it takes four layers

No single tool holds the picture, and that is the finding, not an accident:

- **rule 31** answers *is each control ROW the right shape?* — it has no concept of MISSING.
- **the census** answers *SHOULD this block have the control, and where does the fix live?* —
  it has no concept of a row's states or gradient path.

The categorisation people remember is the union of the two. Neither alone is it.

---

## Layer 1 — ROW shape · `rule 31`

```bash
node scripts/inspector-scan/run.js --json
```

⛔ **Read the kind from the `key` field, split on `|`, index 3.** The findings carry no
`kind` property (measured: `kind` is `None` on all 409). ⛔ **Count `status == "FLAGGED"`
only** — `core/report.js` serialises BASELINED findings into the same array.

| finding kind | count | what it catches |
|---|---|---|
| `row-below-minimum-states` | 191 | a colour row offering fewer states than its element declares (floor 2) |
| `row-missing-gradient` | 193 | a row with no gradient path and no declared exemption |
| `native-colour-ui` | 25 | `block.json supports.color` with a live UI sub-flag |
| `banned-lookalike` | 0 | regression guard — proven able to fail |
| `roster-surface-unknown` | 0 | null-surfaces guard |
| **total** | **409** | |

⚠ `__experimentalSkipSerialization` is NOT a UI flag — it is REQUIRED by the conformant
shape. Counting it reports 50 against a true 25. Two sessions made this mistake independently.

---

## Layer 2 — BLOCK scope · the census

```bash
node scripts/surveys/survey-golden-conformance.js --json
```

| axis | result |
|---|---|
| canonical | **64 CONFORMANT · 1 VIOLATION · 12 MISSING · 6 NOT-APPLICABLE** — moved from 63/13 this session, and it's a real, attributed fix, not drift: `sgs/site-footer` flipped MISSING→CONFORMANT because `canonical` and `bannedLookalikes` share the SAME `reachedComponents()` function — the depth fix (§ below) that let `bannedLookalikes` see deeper also let `canonical` correctly find `site-footer`'s colour panel (`DesignTokenPicker`, reached via `GradientOverlayControl.js`) that the old 1-hop scan couldn't see. |
| nativeUi | 58 CONFORMANT · 25 VIOLATION (23 double-painted · 2 core-only) |
| bannedLookalikes | 83 CONFORMANT — **re-verified 2026-08-20 (session 2)**, now over a real ~34-block reach, not the ~3-18 blocks the scan could see before. Residual reach gap to full depth (34/64) still open — see the fixed section below, not silently assumed closed. |
| hoverMechanism | 8 CONFORMANT · 9 UNCLEAR · 66 N/A |
| gradient | 25 CONFORMANT · 58 VIOLATION |

**The MISSING / NOT-APPLICABLE split is the point of this layer**, and it exists because
scope is decided by `qualifiesFor()` on independent evidence — never by roster.json's
`surfaces.colour`, which is computed from what a block ALREADY has and is therefore
self-fulfilling (it can only ever find non-conformance, never absence).

Each verdict carries the evidence that decided it, plus `home`:

- **VIOLATION (1)** — `sgs/buybox`: paints 27 own declarations, no client control.
- **MISSING (12)** — 11 `sgs/form-field-*` + `form-review`, all `home=ancestor`
  ("painted by `sgs/form`"), so it is **ONE fix on the parent**, not 12 block edits.
  (`sgs/site-footer` was in this bucket earlier today — the depth fix moved it to
  CONFORMANT, see the table row above; it is no longer a gap.)
- **NOT-APPLICABLE (6)** — 5 "paints nothing, and nothing paints its rendered classes";
  `sgs/responsive-logo` via feature parity ("replaces core/site-logo, which does NOT
  enable core `color` UI").

Also emitted: **shared-file attribution** — "fix once there, not once per block".

---

## Layer 3 — colour-specific censuses

```bash
python scripts/surveys/survey-colour-coverage.py     # 33 state-uncontrolled + 87 base = 120 confident, +102 unclear, across 34 blocks
python scripts/surveys/survey-colour-controls.py     # 309 colour attrs; divergence per CSS property
```

⚠ `survey-colour-controls` says so itself: *"component attribution is a static heuristic
(nearest-preceding-JSX-tag scan), not an AST parse — spot-check file:line before treating
a DIVERGENCE or BANNED-lookalike finding as ground truth."* **Spot-checked this session
(master table row 17):** its headline "295 of 309 colour attrs have no control found" is a
heuristic blind spot, not 295 real gaps — sampled entries are attrs genuinely controlled via
`SgsColourPanel`'s data-driven `rows` array, which the nearest-JSX-tag scan cannot see
because the control is declared as DATA, not an individual JSX element.

⚠ `survey-colour-coverage`'s **102 `unclear` findings were never surfaced in any prior
version of this report** — only the 33+87=120 "confident" total was quoted. Corrected this
session (master table row 14).

### Block-level overlap with Layer 1 — computed 2026-08-20 (session 2)

*(Same figures as master table row 24, re-confirmed identical on a fresh re-run — this
section keeps the fuller explanation, the table keeps the quick reference.)*

Population-level overlap is now a real number, not an assertion of ignorance. Computed by
intersecting rule 31's flagged `block` field (`node scripts/inspector-scan/run.js --json`)
against colour-coverage's `blocks_with_findings` (`python
scripts/surveys/survey-colour-coverage.py --json`):

| | count |
|---|---|
| Blocks rule 31 flags (409 findings) | 63 |
| Blocks colour-coverage flags (120 findings) | 34 |
| **In both** | **33** |
| Only rule 31 | 30 |
| Only colour-coverage | 1 (`sgs/container`) |

**Reading this correctly:** 33 of colour-coverage's 34 flagged blocks (97%) are ALSO
flagged by rule 31 — the two scanners are overwhelmingly looking at the same blocks, not
disjoint populations. The one exception, `sgs/container`, is consistent with rule 31's
known Track A/B blindness (it never opens shared wrapper panels).

⛔ **This is population-level overlap ONLY — which BLOCKS show up in both, not which
FINDINGS are the same underlying defect.** Whether a specific rule 31 finding on
`sgs/accordion` and a specific colour-coverage finding on `sgs/accordion` describe the same
bug or two different bugs on the same block is still **not established** — that's
defect-level matching, and it remains genuinely open work, not closed by this number.
Re-run: the two commands above, then intersect on the `block`/`block_slug` field.

---

## Layer 4 — cross-cutting detectors that catch colour defects

```bash
python scripts/check-undeclared-attrs.py    # 3 total, 1 colour-relevant — WP silently discards the write
python scripts/check-inert-controls.py      # 1 total, 0 colour-relevant — control visible, render.php overwrites it
python scripts/surveys/survey-control-gaps.py .   # 17 total, 0 colour-relevant — a control weaker than its value
```

⚠ **Correction, re-verified 2026-08-20 (session 3, master table rows 20-22).** This section
previously read "17" and "1" and "3" as if all were colour-relevant. Checked the actual
`valueKind`/block/attr fields: only 1 of the 3 `check-undeclared-attrs` findings and 0 of
the 17 `survey-control-gaps` findings and 0 of the 1 `check-inert-controls` finding are
colour. Corrected counts above; full detail in the master table.

Each answers a question no other tool asks (even where its current colour count is zero):

- `check-undeclared-attrs` — the `sgs/quote` class: control writes it, render reads it,
  `block.json` never declares it, WordPress throws the write away. Green build, no error.
  **The one live colour finding:** `sgs/quote`'s `backgroundColourHoverGradient`.
- `check-inert-controls` — the attribute has a control AND a renderer, but render.php
  overwrites it with a hardcoded value first. Its one current finding (`sgs/feature-grid`
  `layout`) is not colour.
- `survey-control-gaps` — rule 21 finds an attr with no control; `check-dead-controls`
  finds a control with no attr; **this finds one that exists, renders, saves and cannot
  hold its value.** ⚠ candidates only, high false-positive rate — hand-read every one. Its
  17 current findings are `url`/`date`/`length`/`css-value` kinds — none colour today.

From `inspector-scan` (same run as Layer 1): rule 29 duplicate visible labels **8** ·
rule 21 render-without-control **197** · rule 04 colour-alpha **0** (gate).

---

## Resolution depth — FIXED this session, re-verified 2026-08-20 (session 2)

**Was:** `bannedLookalikes` read 83 CONFORMANT, and that was clean only because the scan
followed ONE hop — too shallow to even reach most of the population, so a real violation
nested deeper than one hop couldn't have been found either way. Measured 1 hop vs full
depth (`python scripts/surveys/compare-reach-depth.py .`, this repo's independent
full-depth reference):

| component | 1 hop | full depth |
|---|---|---|
| `ColorPalette` | 3 | 64 |
| `DesignTokenPicker` | 18 | 64 |
| `SgsGradientPicker` | 4 | 64 |
| `ShadowControl` | 15 | 30 |

**Now:** `reachedComponents()` in `survey-golden-conformance.js` walks up to 4 hops (bounded,
cycle-guarded — not an unbounded import-graph walk). The exclusion logic
(`axisBannedLookalikes` excluding a banned primitive reached THROUGH a canonical component)
was already correct at the unit level; the fix was making discovery reach far enough to
actually exercise it. Re-measured with production's real resolver, out of 83 blocks:

| component | 1 hop (old) | 4 hops (now) | full depth (reference) |
|---|---|---|---|
| `ColorPalette` | 3 | **34** | 64 |
| `DesignTokenPicker` | 18 | **34** | 64 |
| `SgsGradientPicker` | 4 | **35** | 64 |
| `ShadowControl` | 15 | **30** | 30 (matches full depth exactly) |

`bannedLookalikes` still reads **83 CONFORMANT / 0 VIOLATION** — but that's now a
meaningfully clean result over a real ~34-block population it actually looked at, not an
accidentally-clean result over a ~3-18-block population it couldn't see past. Pinned by a
real-file self-test (`accordion/edit.js` → `ContainerWrapperControls` → `BackgroundPanel` →
`GradientOverlayControl` → `DesignTokenPicker` → `ColorPalette`, a genuine 5-file chain),
not just the synthetic-map unit tests.

⛔ **Residual gap to full depth (34/64) is NOT closed, and is not "just alias resolution"
as first assumed — checked, not guessed.** `SgsColourPanel.js:115` picks its row component
at RUNTIME (`const Control = row.gradientCapable ? A : B`), so blocks that only reach
`SgsColourPanel` dead-end there regardless of depth — the same already-documented blind
spot that makes `GradientCapableColourControl` read as dead code while being live in 6
blocks (see below). Import-alias resolution may also contribute; unmeasured separately, not
claimed as proven. Neither is fixed this session — both are named, open work.

Reproduce: `python scripts/surveys/compare-reach-depth.py .` +
`node scripts/surveys/survey-golden-conformance.js --self-test`.

⚠ Related, unfixed: `GradientCapableColourControl` reads as dead code while being live in 6
blocks — the same runtime-selection blind spot named above.

### `compare-reach-depth.py` itself was buggy — root-caused and fixed, 2026-08-20 (session 4)

The reference tool this whole section leans on had its own bug, found when the QC council
flagged its alias-resolution figures as internally inconsistent (`ColorPalette`
`depth1_alias` reading LOWER than `depth1_noalias` — impossible if alias resolution is a
superset, which it must be by construction).

**Root cause, proven via a debug trace, not inferred:** `reach()`'s traversal used a LIFO
stack (`queue.pop()`), not a proper breadth-first queue. A name reachable via TWO paths of
different depth in the same walk (the real case: `DesignTokenPicker` is both a direct
`d=0` mount AND a `d=1` child of `SgsColourPanel` via its runtime `const Control = cond ?
A : B` dispatch) could have its DEEPER duplicate popped and marked `seen` before its
SHALLOWER original, permanently capping that node's effective depth and silently blocking
its own children (`ColorPalette`, in the real case) from ever being explored within a tight
`max_depth`. Traced directly on `sgs/heading`: `DesignTokenPicker` was processed at `d=1`
instead of `d=0` in the alias run, so `ColorPalette` — genuinely one hop inside
`DesignTokenPicker.js` — was never reached. **Also explains why the numbers looked
inconsistent run to run**: Python randomises string-hash order per process by default,
which shuffles the set-iteration order feeding the queue, making which duplicate "wins"
non-deterministic.

**Fix:** LIFO stack → FIFO queue (`collections.deque`, `popleft()`), giving BFS's standard
guarantee — every node is first visited via its minimum depth, by construction, no race
possible. One-line traversal-order change, nothing else touched.

**Verified:** 3 fresh process runs (different hash seed each time, since that's exactly
what varied before) are now byte-identical. A negative control — the same self-test run
against the pre-fix code — genuinely **fails 3 of 5 runs** (proving both that the test is
real and that the old bug really was non-deterministic, not a one-off fluke). A permanent
`--self-test` mode ships with the fix, with a synthetic fixture reproducing the exact
`DesignTokenPicker`/`SgsColourPanel` race shape abstractly, so this can't silently regress.

⚠ **Because the fix changes `reach()` for ALL calls, not just alias ones, no number this
tool EVER printed before this fix should be treated as reliable** — including the
"1 hop (old)" baseline table above, which came from the same buggy tool. Post-fix,
deterministically-confirmed numbers, out of 83 blocks:

| component | depth1_noalias | depth1_alias | depth6_alias (full depth) |
|---|---|---|---|
| `ColorPalette` | 6 | 6 | 64 |
| `DesignTokenPicker` | 19 | 63 | 64 |
| `SgsGradientPicker` | 7 | 7 | 64 |
| `ShadowControl` | 15 | 15 | 30 |
| `GradientCapableColourControl` | 0 | 61 | 61 |

Every row now satisfies the required monotonic property (`noalias ≤ alias ≤ full depth`) —
the earlier "3/18/4/15" and "34/34/35/30" figures cited above in this section came from the
buggy tool and are superseded by this table. The `survey-golden-conformance.js` depth fix
(4-hop BFS-safe walk, described above this subsection) is unaffected — it never used
`compare-reach-depth.py`'s traversal code, only its numbers as an external reference point,
so its own fix and self-test stand independent of this correction.

Reproduce: `python scripts/surveys/compare-reach-depth.py . --self-test` +
`python scripts/surveys/compare-reach-depth.py .` (run 2-3 times fresh to confirm
determinism, since that's exactly what this fix guarantees).

---

## What generalising to the other 20 types actually requires

The row-level engine in `scripts/inspector-scan/core/golden.js` is **already generic and
already exported** — `requiredStatesFor( elements, attrName )`, `statesArrayHasGradient(
statesArray )`, `collectIndirectRowSources()`. None of them mentions colour. Rule 31 is
their only consumer, and its colour-binding is the schema path it reads (`controls.colour`),
the component names it looks for (which already live in every type's own `canonical` row),
and its message strings.

So it is **parameterise one rule**, not build 20 detectors.

⛔ **Blocked on a correctness fix first:** 16 of 21 types declare no
`qualifiesWhen.paintsOwnSurface.cssProperties`, so they fall through to a fallback the
survey documents as *"REPRODUCES COLOUR'S REGEX BYTE-FOR-BYTE"*. Until each type declares
its own properties, every non-colour scope verdict is decided by colour evidence.

Bean's axis table, for the record:

| axis | works for |
|---|---|
| canonical | colour only |
| qualifiesWhen | 1 of 14 (declared by 21, real for 4) |
| native-UI detection | 4 of 14 |
| states | 1 of 14 |

---

# ADDENDUM — from the programme doc (`.claude/plans/2026-08-18-inspector-enforcement-programme.md`)

Read in full 2026-08-20. Four things it carries that the scan set above did not.

## ⛔ 1. `row-missing-gradient` is BINARY and that is INSUFFICIENT — the 193 is soft

The programme doc (§Phase 5, point 3) is explicit and it changes how to read Layer 1:

> There are THREE gradient mechanisms and which is correct depends on what the row paints:
> a per-state toggle inside `DesignTokenPicker` (background / border / icon);
> `GradientCapableColourControl` (**TEXT only** — needs `background-clip:text`);
> `GradientOverlayControl` (whole-block overlay, single-state by construction).
> ⛔ A binary "does a gradient path exist?" check is INSUFFICIENT: **a text row wired to
> the background mechanism would PASS while rendering nothing.** Rule 31's current
> `row-missing-gradient` kind is binary and needs this refinement.

So **193 is a floor with an unknown false-PASS rate**: it counts rows with no gradient path
at all, and cannot see a row that has the WRONG mechanism for its painted property. Closing
colour properly means making that axis mechanism-aware, not just counting absences.

## 2. Two roster detectors were never built

| ID | Rule | Catches | State |
|---|---|---|---|
| D4 | `check-element-panels` | one element, one panel | ⬜ **not built** |
| D5 | `capture-inspector-surface` | live editor oracle | ⬜ **not built, never a gate** |

⭐ **D5 is the answer to a question nothing else asks.** Per the doc: *"D1–D4 all ask does
the right JSX exist, never CAN A CLIENT REACH IT. Hero's split-media dead end is the proof:
the picker exists, correctly typed, and stays unreachable."* **D5 must WALK STATES, not
snapshot one.** Every static layer in this report shares that blind spot.

(D2 `check-panel-expectations` was deliberately SUPERSEDED by rule 31, not skipped: a binary
"does a panel exist?" conflates three unrelated defects, proven on its own 5-block candidate
list — `buybox`/`site-footer`/`site-header` have core's native UI as their only colour
control, while `container`/`hero` have neither. One finding would have pointed at the wrong
fix for three of five.)

## 3. Governance constraints that bind any new detector

- **Three tiers.** T1 fingerprint (gates) · T2 schema (gates once baselined) · **T3 shape
  heuristic — ⛔ ADVISORY FOREVER.** A heuristic promoted to a gate taxes legitimate work;
  that is how nine advisory rules accumulated 383 findings nobody reads.
- **Per-detector completion:** self-test with a negative control that genuinely fails ·
  `--survey` over all 83 blocks with **no `head -N`** · expected count declared BEFORE the
  first live run, then reconciled · registered in `rules.json` in the SAME commit as the
  rule file · ships advisory, never promoted on its introducing run.
- **`sgs/button`'s hover exemption must be DECLARED IN DATA** with a reason — never a
  hardcoded block name in a script (R-31-1 bans hardcoded dicts).
- ⛔ **`retireWhen` is a STALE completion condition** — the doc self-checks that no such
  mechanism exists anywhere in `scripts/` and no rule has ever had one. Either build it or
  drop the condition; do not keep asserting a condition nothing enforces.

## 4. Sequencing, and what is still open

⛔ **Phase 5 (the closing audit) runs AFTER C1 and AFTER C2's conversion pass** — before
that it would flag the entire backlog as violations on day one. C1 (the shared
`sgs_emit_state_colour_css` helper) is DONE, live-verified on 8 blocks. C2's conversion pass
is not.

Open, from §8:
- **`sgs/site-header` shows 5 default-visible rows against FR-37-27's cap of 3.** Which
  three move behind disclosure is a client-facing UX call, still Bean's. D679's separate
  audit of the same block did NOT resolve it.
- **WP 7.1 landed 19 Aug 2026.** T1 fingerprints pin to core internals (`BoxControl`'s
  unconditional label, `.components-tools-panel-header > h2`). Needs a `wpVersionVerified`
  field and a re-check.
- **The cloning converter still writes `gridItem*`** (`converter/resolvers/grid.py:187`,
  `services/arrangement.py:154`), so a cloned hero still receives attrs WordPress silently
  discards until the DB-derived GRID destination is reseeded via `/sgs-update`.

## The programme's own completion condition

> **Bean stops finding these by photographing his own screen.**

⛔ **Never close a step on a green exit code** — on this repo an aborted deploy and a
dropped stash both reported success.
