---
doc_type: report
project: small-giants-wp
created: 2026-08-17
status: COMPLETE
scope: Track 1b plan · Spec 35 · Spec 32 · spec-35-control-type-contract
method: curated-roster predicate evaluation (self-tested) + 3 adversarial raters + hand adjudication
---

# Track 1b / Spec 35 / Spec 32 — completion audit

## The headline, in plain English

**The premise that "three docs were marked complete" does not hold.** Not one of the four documents
claims to be finished. Every one declares open items in its own status field. What *was* marked
complete are **sub-initiatives inside them** — the colour panel's Track A, the wrapper-decomposition's
seven steps, roadmap Part J. Those sub-claims are, in the main, **true**.

So the correct answer to "are they complete?" is: **the work that was claimed done is genuinely done;
the documents were never claiming to be done.** The real problem is different and smaller — a handful
of stale cross-references where one doc says a thing is open that another doc closed weeks ago.

## Method

Three tiers, cheapest first, so agent tokens were spent only on what a script could not settle.

A curated roster of **79 mechanically-checkable claims** was evaluated by a throwaway script
(`audit_claims.py`, scratchpad-only). **The instrument was self-tested before any verdict was
trusted** — seven controls, including a fabricated commit hash, a symbol asserted absent that is
plainly present, and a shipped-then-reverted commit. All seven pass; the detector is proven able to
fail.

Design constraints, each earned by a verified failure during this audit:

| Constraint | Why |
|---|---|
| `git grep` only, never `grep -r` | `.claude/worktrees/` holds 17 stale doc copies. One symbol: **54 hits** by naive grep, **3** real. An 18× inflation |
| COMMIT never evaluated alone | A reverted commit still passes `git cat-file -e`. Paired with ancestry + a subject-filtered revert scan over the paths it touched |
| RULING searches **three** heading formats across **two** files | The archive carries 75 `## D<N>` + 345 `**D<N>` + 118 `## <date>…D<N>:`. Knowing only two reported D346 as missing when it exists |
| SYMBOL strips comments before counting | `BorderBoxControl` returns 3 hits, all non-usages. The self-test caught my first comment-detector missing continuation lines inside `/* */` blocks |
| EXIT normalises whitespace | The real idiom is `process.exit( allOk ? 0 : 1 )` **with spaces**; a literal match on the spaceless form returns 0 |

## Results

| Verdict | Count |
|---|---|
| CONFIRMED | 70 |
| CONTRADICTED | 4 |
| REVERTED | 1 |
| AMBIGUOUS (adjudicated by hand) | 4 |
| **Total** | **79** |

**The one REVERTED** is correct and already documented: `2b6ec9d7` (inspector tab bar) was shipped then
reverted by `47576545`, which undoes 12 of its 17 paths. The plan records this accurately.

## What each document actually says about itself

| Doc | Own status | Self-declared open |
|---|---|---|
| Track 1b plan | `ACTIVE` | B4, B6, F1, G1 |
| Spec 35 | `ACTIVE` | Part I: spacing token, dynamic content, colour Track B. **Part L: 21 checkboxes, 0 ticked** |
| Control-type contract | `AUTHORITATIVE … G/H open by design` | Findings G + H; conditions 22/24/25/26 "CARRIED, NO DESTINATION NAMED", self-flagged `UNVERIFIED` |
| Capability-routing doctrine | partial-shipped | Part 6 gate "never built" for its original target |

`specs/README.md` already warns against exactly this: *"The 2026-07-28 'build surface complete' claim
did not hold."* Spec 35 line 820 says the build surface is "SUBSTANTIALLY COMPLETE" and contradicts
itself three lines later.

## Cross-doc contradictions — 4 found, all adjudicated

| # | Conflict | Verdict |
|---|---|---|
| 1 | `sgs/quote` shadow: plan says CLOSED (D634); Spec 35 Part I says OPEN | **Plan right, Spec 35 stale.** D634 exists; `quote/block.json` carries the migrated attrs; `edit.js` mounts `ShadowControl` |
| 2 | `imageControls` gate: plan says shipped `ceec53b3`; doctrine says "never built" | **Plan right.** Built 2026-08-12, one day after the doctrine's claim. ⚠ It is ADVISORY-wrapped, so "in prebuild" ≠ "gates" |
| 3 | `check-universal-fit.js`: contract lists it under *"gates wired to nothing… zero references in package.json"* | **Contract falsified.** 1 reference, in the hard-gating part of prebuild, with a real failing exit path |
| 4 | `LEDGER.md` says wrapper decomposition "all closed" | **Split.** The `gridAreas` half is genuinely CLOSED. The colour-panel half is genuinely OPEN (`parking.md` `P-COLOUR-PANEL-TRACK-B-SHARED-WRAPPER`) |

**The contract's defect register is stale on 4 of the 5 scripts it names.** It claims
`check-universal-fit.js`, `check-duplicate-controls.js`, `audit-block-uniformity.py` and
`audit-block-file-consistency.py` have "zero references in package.json". Measured: three are wired
blocking, one is wired advisory. Only the register's general point survives, not its instances.

## Enforcement machinery — the "stop diverging" half

This is where the real, actionable findings are. **The gates exist. Several do not gate.**

| # | Finding | Evidence |
|---|---|---|
| F3 | **Five prebuild gates are shell-neutralised** — written `(script --check \|\| echo [ADVISORY])`, so `\|\|` absorbs `exit 1` before the `&&` chain sees it | `check-dead-api-calls.py`, `audit-declared-vs-seeded-roles.py`, `audit-block-uniformity.py`, `check-editor-render-parity.js`, `check-image-controls-support.py` |
| F4 | **One is flag-neutralised** — fails only under `--strict`, which prebuild never passes | `check-simple-surface-cap.js:704` |
| F5 | **One parses `--check` and discards it** — *"exits 0 ALWAYS, regardless of findings or `--check`"* (its own docstring), yet wired with `--check` as though it gates | `audit-block-file-consistency.py:89` |
| F6 | **Three of the four commit-floor gates silently no-op without the local DB** — return 0 in every mode including `--check` when `sgs-framework.db` is absent. The hook calls this set *"the ONLY git-level floor"* | `db-consistency/run.py`, `excluded-gate/run.py`, `ledger/coverage_check.py`. Only `cheat-gate/run.py` degrades gracefully |
| F7 | **Spec 32's live gate passes on network failure** — *canary UNREACHABLE → WARN + PASS (exit 0)*. "Zero inline styles" rests on a check that goes quiet exactly when it cannot see | `no-inline/check-no-inline.py:36` |
| F7b | `audit-inline-styling.js:4` calls itself *"READ-ONLY DETECTION INSTRUMENT (not a build gate)"* while `:1097` sets `process.exitCode = 1` under `--check` | self-contradicting header |

### F8 — rules.json bookkeeping is stale, but the gates are REAL

⛔ **A correction to an earlier draft of this audit.** I initially read the `--json` output as showing
rules 24/25/27 declared `gate` but running `advisory`, and nearly reported the promotions as cosmetic.
**A decisive experiment refuted that**: rule 24 had a live finding, so if the gate were real `--check`
had to fail. Run directly:

```
RULE 24-raw-canonical-component     [GATE    ] 0 flagged · 0 baselined
RULE 25-no-own-device-switcher      [GATE    ] 0 flagged · 0 baselined
RULE 27-superseded-link-control     [GATE    ] 0 flagged · 0 baselined
SUMMARY  gate rules: 7 · gating findings: 0
```

**The gates work. Plan items A1 and A3 are CONFIRMED, not falsified.** My JSON parse had misread the
report structure — an inferred mechanism, not a tested one.

The genuine, narrower finding is **stale bookkeeping** in the mode table:

| Rule | `openBacklog` declared | Live | `promotedOn` |
|---|---|---|---|
| `21-render-without-control` | 129 | **65** | — |
| `24-raw-canonical-component` | 1 | **0** | **missing** (mode is `gate`) |
| `26-responsive-duplicate` | 8 | **2** | — |

Rule 24 is `mode: gate` with no `promotedOn`, against its own `_meta` protocol
(*"promotion to gate is a one-line edit here… once its openBacklog reaches 0"*). And
`_meta.checklist` points at `spec-35-inspector-DONE-checklist.md`, which is `doc_type: tombstone`,
`governs: nothing` — documentation-only, since nothing parses that path at runtime.

## Spec 32

- `32-…md:146` heading still reads **"ROLLOUT ONGOING"**; root `CLAUDE.md:254` says **"Rollout COMPLETE
  (D346) — zero inline `style` attributes on both live sites."** That `CLAUDE.md` line is doubly stale:
  *"both live sites"* — palestine-lives.org left TARGETS on 2026-08-10.
- **D405 already records that D346's win was partly vacuous**: *"D346's 'inline-zero win' was partly an
  accident of this bug"* — four `render_block` injectors had their inline writes silently stripped, so
  the gate passed while the features were functionally dead. Neither Spec 32 §6.1 nor `CLAUDE.md:254`
  carries that caveat.
- §11 Open Questions holds **3 questions due in "Phase 1"/"Phase 2"** — phases dated 2026-07-07.
- Its parked gap `P-NO-INLINE-GATE-COVERAGE-GAPS` was resolved and archived under the title *"the
  inline-zero gate can pass vacuously"* — the same defect class F7 shows still exists (network mode).

## Genuinely open work (Spec 36/37/38 excluded)

**Parking — 4 of 61 entries relate, all OPEN:** `P-COLOUR-PANEL-TRACK-B-SHARED-WRAPPER`,
`P-DRIFT-AUDIT-BLIND-TO-DECLARED-BUT-WRONG-ELEMENTS`, `P-PATTERNS-USE-CORE-BLOCKS` (4 pattern files
still use core blocks that inline native supports — a Spec 32 hole), `P-SPEC35-STATE-AUTOSUGGEST`.

**Beyond parking:**
1. **D543's owed sweep, never done and now grown.** D543 recorded *"Spec 35 doc still names raw
   `LinkControl` at 8 line refs; `dev-setup.md` has no `SgsLinkControl` entry."* Today: **11 lines /
   20 occurrences** in Spec 35, and `dev-setup.md` still has **0**.
2. **D602 / Spec 39** — converter cannot emit tier-object shapes; 12 tests xfail **by design**.
   ⛔ Do not "fix" — D554 forbids it.
3. **`check-no-inline.py --deep`** — shipped opt-in (D423–425), never promoted to fail-closed.
   Compounds F7.
4. **`check-control-parity-live.js`** — zero callers; verifies a merged 724-site codemod with no gate.
5. **Label-casing backlog** — corrected to **≥774 strings**, never actioned; duplicate-label count
   unresolved across 51/34/13/17/22 depending on definition.
6. **editor-render-parity** — 143 findings triaged; a later 50-batch fixed 9 and baselined 31;
   denominators don't reconcile; detector deliberately advisory.
7. **`element-manifest-baseline.json`** reason text — awaiting sign-off.
8. **`goals.md`** header says whether Spec 35 belongs on the goals list is "an open question" while the
   body already added it.

## Archive triage

**Project plans (31 files — the earlier "25" was an eyeballed count, re-derived by command):**
- ✅ **`2026-08-11-track-1b-next-session.md`** — stale (D563/D580 superseded it), **zero citations**.
  Safe to archive.
- ⛔ **SUPERSEDED-BUT-REFERENCED, repoint before moving:** `2026-07-09-no-inline-styling-design-gate.md`,
  `2026-08-10-global-device-toggle-design.md`, `background-panel-redesign.md`,
  `spec-35-flat-to-object-migration-design.md`.
- ❓ 8 more UNCLEAR, needing adjudication.

⛔ **`handoff-preflight.py` cannot find these references.** Its link check scans only 3 files
(`.claude/CLAUDE.md`, `specs/README.md`, `LEDGER.md`) and matches **markdown syntax only**
(`](path.md)`). Every real reference to these plan docs is backtick-wrapped bare text in
`decisions.md`, Spec 35 and the doctrine — outside the sources, unmatched by the regex. **Use a
per-doc `git grep` instead; the hook is a post-move regression check only.**

**Global plans (`~/.claude/plans/`) — 68 files, a whole population the project-only sweep misses.**
13 are named `go-track-1b-*` / `go-spec-35-*`; **11 are uncited and unarchived.**

## ⚠ "Track 1b" names two different tracks

`go-track-1b-spicy-rain.md` states it plainly: *"you asked to 'go track 1b' — confirmed this means
LEDGER's Task 1 (gradient rollout), **not** the separate `go-track-1b-playful-hamster.md`
inspector-standardisation doc (that one is a different track)."* A session has already had to stop and
disambiguate. **This needs a rename.**

## Decisions needed from Bean

1. **The control-type contract's home.** It is `AUTHORITATIVE`, 143 KB, `doc_type: reference`, lives in
   `plans/`, and Spec 35 defers to it at 9 line sites. It cannot stay an authoritative reference in the
   plans folder — fold into Spec 35, or promote to `specs/`.
2. **Spec 32's rollout status** — "ONGOING" (its own §6.1) or "COMPLETE" (root `CLAUDE.md`)? Note D405's
   partly-vacuous caveat when deciding.
3. **The "Track 1b" name collision** — pick a disambiguating name for one of the two tracks.
4. **F3–F8 as a scoped build.** Six gates that look like enforcement and aren't. This *is* the
   "stop diverging" purpose the Track 1b plan was written to serve, and it is not currently met. It is
   a build, not a doc edit — its own session.

## Method note: two of my own errors, both caught before they landed

Recorded because they are the audit's own evidence that the method works.

1. **The `gridAreas` misread.** I claimed a migration was left un-run, citing D639's *"DELIBERATELY NOT
   RUN"*. D639 is a **259-line entry**; ~60 lines further on it closes out with *"`gridAreas` and
   `GridAreaPanel` are BOTH DELETED, and the DB column… REVERTED."* Live code agrees — only a
   retirement guard survives, which now fails the build if anyone re-declares it. **Rule: a D-entry is
   not a paragraph. Read to the next `## D` heading.**
2. **The rules-gate false alarm** (above) — an inferred mechanism from a misparsed JSON structure,
   refuted by running the gate.

Both are the exact failure class this audit exists to catch, committed while performing it. Neither
survived verification.
