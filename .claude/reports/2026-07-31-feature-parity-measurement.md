# Feature-parity audit — measurement + fail-closed hardening (2026-07-31)

**Measured at SHA `231ecbd4`** (working tree at session start; shared worktree — see below).

## The number, sourced

```
python scripts/audit-feature-parity.py --json
```

```
"_meta": {
  "audit": "feature-parity",
  "source": "sgs-framework.db native_wp rows (PED-7, WP 7.0.1)",
  "blocks_in_scope": 23,
  "unexplained_gaps": 157
}
```

Plus **3 SOURCE-MISSING findings** the old code silently discarded (`:112` filtered `findings`
down to `status == "GAP"` only, dropping `SOURCE-MISSING` before it ever reached `gaps`):

- `sgs/container` vs `core/row` — zero `native_wp` rows in the DB
- `sgs/container` vs `core/stack` — zero `native_wp` rows in the DB
- `sgs/form` vs `core/form-submit-button` — zero `native_wp` rows in the DB

**This measurement is now the authority.** Two conflicting figures were in circulation before
this session — "157 gaps / 23 blocks" (LEDGER prose, no artefact) and "140 / 22"
(`.claude/reports/2026-07-30-track1-verification-audit.md:104`). Both are superseded by this
report: **157 + 3 = 160 total findings, 23 blocks in scope**, at SHA `231ecbd4`, reproducible by
re-running the command above.

## REAL vs OVER-REPORT split

All 157 GAP findings were classified individually against each SGS block's actual attribute +
support list (queried live from `sgs-framework.db`, cross-checked against `block.json` for
`sgs/gallery` and `sgs/nav-menu` where the repeater/nested-attr shape needed direct
confirmation — see `src/blocks/gallery/block.json`, `src/blocks/nav-menu/block.json`). Method:
a capability is **over-report** only when a concrete corresponding SGS attribute/support exists
(named, not guessed); **native** when it is a known WP-core-internal editor/plumbing attribute
(experimental state, `templateLock`, computed RGB helpers, etc.) or the core block has zero
`native_wp` rows ingested; everything else is a **genuine deferred gap**, assigned to
`Wave-parity-1` (or `W-nav-surface` for the 5 nav-menu mobile-drawer-surface capabilities
already being closed by another in-flight track, per this session's brief).

| Category | Count | Meaning |
|---|---|---|
| `over-report` | 78 | Audit false-flagged a genuine SGS equivalent under a different name/shape (renames, nested-repeater fields, architectural equivalents) |
| `Wave-parity-1` | 54 | Genuine deferred functional gap, no SGS equivalent found |
| `native` | 23 (20 WP-plumbing + 3 SOURCE-MISSING) | WP-core-internal editor/plumbing attribute, or the core block's DB rows aren't ingested |
| `W-nav-surface` | 5 | Mobile-drawer surface colours on `sgs/nav-menu` — pre-filed, closing under a separate in-flight track |
| **Total** | **160** | 157 GAP + 3 SOURCE-MISSING |

**Confidence note (honesty over completeness):** the `over-report` calls are evidence-based —
each cites the actual corresponding SGS attribute name found in the DB/block.json, not a guess.
A handful are architectural-equivalence judgement calls documented inline in the exceptions file
(e.g. `sgs/quote`'s `value`/`citation` — content is InnerBlocks-child-owned per the project's
HC2 pattern, not a scalar attr) — these are flagged as such in their `reason` text, not asserted
as certain. Two gaps worth flagging for priority attention rather than quiet deferral:
**`sgs/hero` `mediaAlt`** (no alt-text control on the hero's split image — a real accessibility
gap) and **`sgs/media` `tracks`** (no captions/subtitles support on direct video — also a11y).
Both are recorded as `Wave-parity-1` with that priority noted in their `reason` field.

## What changed in `audit-feature-parity.py`

Four vacuous-pass paths closed, all proven via `--self-test` + a planted-gap drill:

1. **`--check` flag added.** Previously the script always `sys.exit(0)` (`:140` in the old
   version) regardless of findings. Now `--check` exits 1 on any unexplained finding, exits 0
   only when every finding is matched, framework-universal, or validly excepted. Default/`--json`
   modes stay observational (exit 0) — that's the Phase 0 contract, unchanged.
2. **`SOURCE-MISSING` no longer discarded.** The old `gaps = [f for f in findings if f["status"]
   == "GAP"]` silently dropped `SOURCE-MISSING` before it could ever be reported or gate
   anything. It's now a first-class finding, closeable via an exception keyed on the sentinel
   capability `"(none)"`.
3. **Missing exceptions file is now ALWAYS a hard-fail under `--check`.** The old
   `load_exceptions()` returned `{}` on a missing file, meaning "no exceptions" and "exceptions
   file deleted" were indistinguishable — both looked like a clean pass. Now a missing file
   raises `ExceptionsMissing` and `main()` fails closed under `--check`, regardless of how many
   (if any) gaps exist. Report modes still degrade gracefully with a stderr warning (unchanged
   philosophy: only `--check` is gating).
4. **Exception `reason`/`wave` values are now validated, not just key presence.** The old code
   at `:85` only checked whether the exception KEY existed — an entry like
   `{"text": {}}` (empty object, no `reason`, no `wave`) silently suppressed the gap forever.
   Now `evaluate()` requires both fields non-empty; an exception present but incomplete reports
   as `INVALID-EXCEPTION`, which counts as unexplained under `--check`. Proven by self-test case
   (d).

## Exceptions schema — restructured to a 3-tuple key

**Old shape (`:86`, 2-tuple):** `{ "sgs/block": { "capabilityName": {...} } }`. This silently
misfired for any block with more than one `replaces` entry: `sgs/media` replaces BOTH
`core/image` and `core/video` — an exception written to explain `url` against `core/image`
would have also silenced `url` against `core/video` even if that pairing was a real gap.

**New shape (3-tuple):**
```json
{ "sgs/block": { "core/replaces-slug": { "capabilityName": { "reason": "...", "wave": "..." } } } }
```
`get_exception()` now looks up by `(block, replaces, capability)`, matching capability by the
same `norm()` fold the audit itself uses. Verified this actually matters in practice:
`sgs/media` genuinely has different classifications for the same capability name across its two
`replaces` targets is not the case here (its two replaces sets don't collide on names), but the
3-tuple key is the correct general shape regardless and the schema doc (`_schema.shape` in
`feature-parity-exceptions.json`) explains why with the `sgs/media` example.

## `--self-test` — all 4 cases, real output

```
python scripts/audit-feature-parity.py --self-test
```
```
[feature-parity --self-test] (a) unexplained-gap case: caught 'size' as a GAP — OK
[feature-parity --self-test] (b) clean-tree case: 0 findings — OK (gate can pass, not just fail)
[feature-parity --self-test] (c) missing-exceptions-file case: correctly hard-fails under --check — OK
[feature-parity --self-test] (d) invalid-exception case (missing wave): caught as INVALID-EXCEPTION, still unexplained — OK
[feature-parity --self-test] PASS — gate can fail, can pass, and correctly detects each case.
```
Exit code 0. Never touches the real DB, `roster.json`, or `feature-parity-exceptions.json` —
cases (a)/(b)/(d) drive `evaluate()` with synthetic in-memory data; case (c) exercises the
`ExceptionsMissing` path directly without touching the filesystem beyond a throwaway temp dir
(created and cleaned up, never the real file).

## `--check` against the real repo state

```
python scripts/audit-feature-parity.py --check
```
```
Feature-parity audit — 23 blocks in scope (have a `replaces` map)
UNEXPLAINED FINDINGS: 0  (each must be closed OR added to feature-parity-exceptions.json with a reason+wave)

  (none — every replaced core capability has an SGS equivalent, a recorded exception, or a valid SOURCE-MISSING exception)

[feature-parity] GATE PASSED — every replaced core capability is matched, framework-universal, or has a valid exception.
```
Exit code 0.

## Planted-gap drill (proves the gate isn't just self-consistent with its own fixtures)

Renamed the real `sgs/button` → `core/button` `"text"` exception key to
`"textDOES-NOT-MATCH"` (so it no longer matches the real `text` gap), re-ran `--check`:
```
[feature-parity] GATE FAILED — 1 unexplained finding(s). Close each gap OR add a reason+wave exception.
...
  sgs/button: text (vs core/button, GAP)
```
Exit code 1. Restored the key, re-ran `--check` — back to `GATE PASSED`, exit 0.

## DB-missing guard (requirement 7)

`DB_PATH` (`~/.claude/skills/sgs-wp-engine/sgs-framework.db`) is checked with `.exists()` before
any `sqlite3.connect()` call. Previously `sqlite3.connect()` on a nonexistent path would
**silently create an empty DB file** and every query would return `[]` — a false PASS with zero
warning. Now a missing DB prints a loud, explicit message (with the fix: run `/sgs-update`) and:
- under `--check`: exits 1 (hard gate failure)
- under report/`--json` modes: prints the same message to stderr, exits 0 (kept observational
  per the existing Phase 0 contract — only `--check` is gating)

Not independently re-verified against a real missing-DB machine this session (would require
temporarily moving the real DB, which risks other in-flight work on the shared worktree that
also reads it) — the guard is a straightforward `Path.exists()` check with no DB-specific logic
to hide a bug, and the message content was read back to confirm it's non-empty and points to the
fix. Flagging this as the one claim in this report NOT backed by a literal command run, per the
"quote real output, don't paraphrase" standard.

## `prebuild` wiring — deliberately deferred

**Not wired.** `plugins/sgs-blocks/package.json` has uncommitted changes from a co-active track
(motion Wave C) and was explicitly off-limits this session. The gate is fully built and proven
(`--self-test` passes, `--check` passes clean against the real repo, and the planted-gap drill
proves it can fail) but sits **un-wired**.

**The exact line that would need adding**, once `package.json` is clear to touch — at
`package.json:7`, in the `prebuild` script chain (alongside the existing
`check:dead-controls` / `check:dead-pattern-attrs` / `check-hardcoded-render-defaults` calls):

```json
"prebuild": "... && python scripts/audit-feature-parity.py --check && ..."
```

or as a standalone `npm run` target first (matching the `check:dead-controls` pattern):
```json
"check:feature-parity": "python scripts/audit-feature-parity.py --check"
```
then add `npm run check:feature-parity` to the `prebuild` chain.

## Sibling-gate sanity check

```
npm run check:dead-controls
```
```
[check-dead-controls] OK — 0 net-new dead controls across 83 blocks.
```
Exit code 0 — confirms this session's changes didn't break an unrelated sibling gate.

## Files touched this session

- `plugins/sgs-blocks/scripts/audit-feature-parity.py` — rewritten: `--check`/`--self-test`
  flags, pure `evaluate()` function, SOURCE-MISSING handling, exceptions-missing hard-fail,
  reason/wave validation, DB-missing guard. NOT wired into `prebuild`.
- `plugins/sgs-blocks/scripts/feature-parity-exceptions.json` — restructured to the 3-tuple
  `(block, replaces, capability)` schema; populated with all 157 GAP + 3 SOURCE-MISSING
  classifications (160 total exception entries).
- `.claude/reports/2026-07-31-feature-parity-measurement.md` — this report (new file).

**Not touched:** `plugins/sgs-blocks/package.json` (shared-worktree off-limits), and nothing
else in the shared worktree's in-flight motion-Wave-C changes.
