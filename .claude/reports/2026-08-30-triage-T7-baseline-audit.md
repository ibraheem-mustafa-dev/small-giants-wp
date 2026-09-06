# T7 — Suppression-debt baseline audit (project-wide)

**Scope:** every baseline/backlog/quarantine artefact in the repo, READ-ONLY.
**Date:** 2026-08-30. **Method:** structural read of every file (`json.load` + key-shape
inspection) + targeted grep for line-numbered keys + spot-read of script headers for the
files whose entries carry no individual reason. Not every one of the ~170 individual
entries was traced back to its exact source line — that would need a much bigger budget.
Where a classification rests on the file's own documented rationale rather than my own
code read, it is marked **(self-reported)**; where I opened the referenced source myself,
it is marked **(verified)**.

## 0. Declared expected population, before counting

Before running anything I expected: most baseline files to be near-zero (the codebase's
own convention — many gates ship `--check` clean, baseline only catches drift), a handful
of large legacy-debt files (oldshape migration, hardcoded CSS), and the inspector-scan
rule-08/21 pair already known from the brief. I did **not** expect to find a whole second
baseline population the brief's own discovery command misses — see §1 finding A below.

## 1. Discovery-command gap (a finding in itself)

The brief's enumeration command is:
```
find . \( -name "*baseline*.json" -o -name "*backlog*.json" -o -name "*quarantine*.json" \) ...
```
This misses `plugins/sgs-blocks/scripts/inspector-scan/baselines/*.json` — 10 files, 14
entries — because those filenames are `08-raw-url-link.json`, `21-render-without-control.json`
etc., with **no "baseline" substring in the filename**, only in the parent directory name.
The brief's own "36 artefacts / 146 entries" figure was very likely produced by the same
glob and is therefore **also** an undercount by this directory. Corrected file count: **37**
JSON artefacts once `inspector-scan/baselines/` is included (36 from the glob + the
`inspector-scan/baselines/` directory counts as 10 more files, minus double-counting — see
full list below). I did not attempt to reconcile the exact "146" figure entry-by-entry
against the brief's number; my own count (below) differs because several of the 36
glob-matched files are not suppression lists at all (§2).

**Positive control for the discovery fix:** re-running the glob WITH a directory match
(`-path "*/baselines/*.json"` added) picks up exactly the 10 files listed in §3's
inspector-scan rows; re-running WITHOUT it reproduces the original 36 — confirms the gap is
real, not a fluke of one file.

## 2. Files that are NOT suppression/exception debt (excluded from the 146/count)

These matched the glob but are not "a detector's findings we've told it to ignore":

| File | What it actually is |
|---|---|
| `.claude/hooks/doc-size-baseline.json` | Doc-size ratchet (growth-keyed, not a violation list) — CLAUDE.md already documents this as self-healing, out of scope here |
| `.claude/scratch/canonical-baseline.json` | A slot/role/selector **lookup cache** (2,819 keys), not accepted violations |
| `.claude/scratch/pixeldiff-baseline-223313.json` | Raw per-viewport pixel-diff scores. **R-31-4 in the project CLAUDE.md says the Stage-11 pixel-diff mechanism was PURGED 2026-07-04.** This file lives in `scratch/` (30-day retention per `.claude/CLAUDE.md`) and is dated in its own filename — it is very likely an **orphaned artefact of a dead mechanism**, not live suppression debt. Recommend deleting it, not triaging it. |
| `plugins/sgs-blocks/scripts/dbschema/schema-baseline-pre.json` | A one-off DB row-count snapshot (D-number provenance), not a suppression list |
| `plugins/sgs-blocks/scripts/generative-background/fidelity-baseline.json` | A measurement **config** (ceiling %, sample times), not accepted findings |
| `plugins/sgs-blocks/scripts/motion-bundle-baseline.json` | A measured byte-budget ratchet, not accepted findings |
| `reports/coverage-honesty-baseline.json` | A single coverage-percent snapshot |
| `tests/golden/hero-extraction-baseline.json` | A golden test fixture (expected block output), not a violation list |

These 8 files should be dropped from any future "N baselines" count — counting them
inflates the debt figure with things that were never findings.

## 3. Per-file classification table

Legend: **RD** = Real Debt, **DB** = Detector Bug/Limitation, **GE** = Genuine Exception,
**UNVER** = entries carry no individual reason so cannot be classified from the file alone.

| File | Entries | RD | DB | GE | UNVER | Line-keyed? | Reach 0? |
|---|---:|---:|---:|---:|---:|:---:|---|
| `inspector-scan/baselines/08-raw-url-link.json` | 2 | 0 | 0 | 2 | 0 | **YES** | No — 2 permanent exceptions, but re-anchors on every unrelated edit above line 248/others |
| `inspector-scan/baselines/21-render-without-control.json` | 12 | 0 | 12 | 0 | 0 | No (block+rule+file+attr key) | Yes, once `sources.js` strips `//` comments and a suffix-matcher handles infix interpolation |
| `inspector-scan/baselines/{01,03,04,07,14,17,18,20}*.json` | 0 each | — | — | — | — | n/a | Already at 0 |
| `consistency/box-flat-baseline.json` | 12 | 11 (deliberate-keep) | 0 | 0 | 1 (track2, in-flight) | No (`block::attr`) | Blocked on Track 2 landing; the 11 deliberate-keeps need Bean sign-off recorded per-entry to convert from "triaged debt" to permanent GE |
| `check-enum-control-shape-baseline.json` | 45 | 45 | 0 | 0 | 0 | No | Yes — one bulk UI pass (SelectControl→ToggleGroupControl for ≤12-char 2-5-option enums) clears all 45 at once |
| `lints/lint-theme-css-hardcodes-baseline.json` | 22 | ~22 (self-reported, per-entry "no theme.json token applies" reasons) | 0 | 0 (some reasons read as design-intent, borderline GE) | 0 | **YES** (`"line": N` field) | Partially — several entries are glyph-sizing on icon fonts (legitimately outside typography tokens); a true 0 needs either new tokens or a documented permanent exemption class, not per-entry acceptance |
| `dead-api-calls-baseline.json` | 305 | — | **305 (self-reported by the script's own header)** | 0 | 0 | No (`deadapi:file:function`) | Blocked on one thing: `dead-api-checker/wp-wc-function-allowlist.json` is hand-curated and admittedly incomplete — the script's own docstring calls these "real-but-uncurated WP/WC calls this JSON hasn't caught up with yet". Extending the allowlist is the fix, not baselining each call |
| `cheat-gate/cheat-gate-baseline.json` | 38 | 0 | 0 | 0 | **38 UNVER** | No (`prefix:file:name`) | Cannot say — this file aggregates 3+ distinct checks (`hdict:`, `imp:`, `convsrc:` prefixes from `check_hardcoded_dicts.py`/`check_important_render.py`/`check_converter_source.py`) with **zero per-key reason field**, unlike every hand-reasoned baseline elsewhere in the repo. `check_bound_emit.py`'s own baseline (a DIFFERENT, empty file scope within the same directory) explicitly ships empty by design — the 38 keys belong to sibling checks that were seeded without review |
| `orchestrator/check-no-mirror-baseline.json` | 10 | 0 | 0 | 0 | **10 UNVER** | No (`role:block:class`) | Same gap — `hash`+`counts` shape, no reason field |
| `duplicate-controls-baseline.json` | 25 | ~5 | 0 | ~20 (self-reported `keeper: BOTH`/named-winner entries read as deliberate parent/child UX rulings) | 0 | No | Mostly GE already; the handful without an explicit Bean ruling date are the real-debt residue |
| `editor-render-parity-baseline.json` | 30 | 0 | **~many (self-reported "cross-file consumption blind spot" pattern repeats across `fieldName` on every `form-field-*` block)** | 0 | some untraced | No | The repeated "field_id()/field_label() cross-file, non-paint id/for pair" reason is the SAME detector gap on every form-field block — fixing the checker to follow that one helper call would likely clear a large fraction of the 30 in one change |
| `element-manifest-baseline.json` | 2 (`orphan_style_defect`=0, `total_state_without_base`=2) | 2 | 0 | 0 | 0 | No | Currently at/near 0 already; file explicitly states these numbers "may only ever go DOWN" |
| `hardcoded-render-defaults-baseline.json` | 10 | 10 (self-reported "pre-existing F3 debt, fix tracked separately") | 0 | 0 | 0 | No (`block/file/property`) | Real debt with an owner-less "tracked separately" — no ticket/parking reference found; recommend a parking.md entry |
| `oldshape-audit-baseline.json` | 196 | 196 (self-reported, each maps to `.claude/backups/2026-07-15-track-b/REGISTER.md`) | 0 | 0 | 0 | No (`post/block/type/attr`) | Largest single real-debt file in the repo. Not zero-able without running `wp-migrate-oldshape-blocks.js` against the register |
| `nav-qa/logical-props-baseline.json` | 5 | 5 (self-reported physical-property debt, occurrence-counted) | 0 | 0 | 0 | No (`file\|property\|declaration`) | Small, mechanical — a logical-properties sweep on 2 files clears it |
| `reclassified-keys-baseline.json` | 8 | 8 (self-reported "upstream Phase-1 artefact never rewritten") | 0 | 0 | 0 | No | Needs the upstream `setting-types.json`/`setting-registry-css.json` regenerated from the current Bean rulings — one script re-run, not per-entry work |
| `control-ux-baseline.json` | 4 | 0 | 0 | 4 (self-reported: 3 always-visible upload slots is a deliberate rejection of the device-switcher pattern) | 0 | No | Already effectively 0 debt — these read as GE and should move OUT of a baseline into the rule's own exemption logic |
| `check-css-layer-orphans-baseline.json` | 1 (`GRID_AREA`) | 0 | 0 | 1 (explicit Bean ruling: "change NOTHING... recorded so it stops being invisible") | 0 | No | Never — this is a deliberate permanent record, not debt |
| `db-consistency-baseline.json` | 1 | 1 (unclear reason — no reason field in the file itself; `vc:` key format defined in `models.py:49` as `variant-conformance:block:slot`) | 0 | 0 | 0 (format known, reason not) | No | Cannot say without reading `check-db-consistency.py`'s caller context (not done — budget) |
| `tests/fixtures/conformance/quarantine.json` | 37 | 37 (self-reported: "STALE, not regressed" — goldens frozen by a converter contract change, gate re-seed blocked on a landed deploy proof) | 0 | 0 | 0 | No (golden IDs) | Blocked on a deploy verification step, not code work |
| Zero-entry files: `border-style-without-width`, `box-family-guard`, `control-helper-parity`, `converter/gates/{import-ban,no-slug-literal,raw-sqlite}`, `excluded-gate`, `ledger/{content-gap,coverage}`, `shrink-to-fit`, `universal-fit`, `dead-controls`, `destructive-only-controls`, `shared-css-state-rules` | 0 each | — | — | — | — | n/a | **Already 0** — proof the "reach zero" bar is achievable and other gates have done it |
| `ledger/content-coverage-baseline.json` | 4 | Not classified — this is a content-text hash-index, not a violation-acceptance list; excluded from RD/DB/GE split | — | — | — | No | n/a |
| `check-enum-control-shape` `_meta` / other small metadata-only entries | — | — | — | — | — | — | — |

## 4. The four questions

**Q1 — How many baseline files use a line-numbered key? Name them.**
Exactly **2** of the ~29 real suppression files (confirmed by grep for `"line":` fields and
for pipe-delimited keys ending in a bare integer, across every file in scope):
1. `plugins/sgs-blocks/scripts/inspector-scan/baselines/08-raw-url-link.json` — key format
   `rule|block|file|locus-type|LINE`. Its own `_meta.lineKeyedBaselineWarning` field already
   names this exact fragility and cites "First hit: 2026-08-11, D565" — the incident in the
   brief is a **second, later** hit of an already-documented problem.
2. `plugins/sgs-blocks/scripts/lints/lint-theme-css-hardcodes-baseline.json` — top-level key
   embeds `file:selector:property:value`, but each entry additionally carries a `"line": N`
   field that `check-lint-theme-css-hardcodes.py` presumably uses for re-anchoring the same
   way. (Not verified against the script itself — flagging by structural analogy, not proof.)

Every other real suppression file in the repo uses a **stable composite key** — `block::attr`,
`block|rule|file|attr` (no line), `check+block+attr`, `file|property|normalised-declaration`,
or a content hash — none of which move when unrelated code shifts above them. So the
line-keying fragility is **not systemic**; it is confined to these 2 files, both of which sit
in scanners whose sibling scanners in the SAME directory (rule 21 next to rule 08; every other
`lints/` check) already use a non-line key. That makes both look like a one-off implementation
choice rather than an architectural default — the fix is local, not framework-wide.

**Q2 — What would a de-line-keyed key look like for each?**

- **`08-raw-url-link`**: drop the line segment entirely. The existing key already carries
  `rule|block|file|locus-type` — for this rule, `locus-type` is `raw-url-textcontrol`, i.e. one
  per BLOCK, since a block only has one such TextControl in the two accepted cases. Proposed
  stable key: `08-raw-url-link|sgs/google-reviews|plugins/sgs-blocks/src/blocks/google-reviews/edit.js|raw-url-textcontrol`
  (identical to today's key minus the trailing `|248`). If a rule can legitimately fire more
  than once per block+locus-type in future, append the CONTROL'S OWN IDENTITY instead of a
  line — e.g. the attribute name it's wired to (`|apiKeyUrl`) — never a position.
- **`lint-theme-css-hardcodes`**: the existing top-level key already is
  `file:selector:property:value` with `line` as a metadata field, not part of the key. If
  `line` is only informational (used for the human-readable comment, not for matching), no
  fix is needed there and Q1's flag may be a false alarm for this file specifically —
  **not verified**; whoever picks this up should first confirm whether `check-lint-theme-css-hardcodes.py` matches on the full key string (safe) or re-derives from `line` (unsafe) before spending effort on it.

**General shape for any future rule:** `rule-id|block-slug|file-path|control-identity`, where
`control-identity` is the attribute name, prop name, or a semantic locus label — never a byte
offset, line number, or anything that shifts when code is inserted elsewhere in the file.

**Q3 — Per file, can this baseline reach 0?** See the "Reach 0?" column in §3. Summary:
- **Already at 0** (11 files): border-style-without-width, box-family-guard,
  control-helper-parity, converter/gates × 3, excluded-gate, ledger/{content-gap,coverage},
  shrink-to-fit, universal-fit, dead-controls, destructive-only-controls,
  shared-css-state-rules, plus 8 of the 10 inspector-scan rules.
- **Should be reclassified out of "debt", not fixed to 0** (permanent GE): rule-08 (2),
  check-css-layer-orphans (1 GRID_AREA), control-ux (4), and most of duplicate-controls (~20)
  — these are correct-by-design and belong in the rule's own exemption logic, not a baseline
  file that implies "temporarily tolerated."
- **Genuinely blockable to 0 with a single mechanical change**: rule-21 (12, comment-stripping
  fix), oldshape-audit (196, run the migration script), nav-qa/logical-props (5, sweep 2
  files), reclassified-keys (8, regenerate from current rulings), check-enum-control-shape (45,
  one UI pass), dead-api-calls (305, extend one allowlist file), quarantine.json (37, blocked
  on a deploy proof, not code).
- **Cannot say from the file alone** (UNVER, no reason field): cheat-gate (38), check-no-mirror
  (10), db-consistency (1) — someone needs to read the generating scripts' current logic
  entry-by-entry, which this audit's budget did not cover.

**Q4 — Which single change clears the most entries?**
**Extending `dead-api-checker/wp-wc-function-allowlist.json`** with the missing WordPress/
WooCommerce function names. The script's own header self-reports that its 305 baseline
entries are "real-but-uncurated WP/WC calls this JSON hasn't caught up with yet" — i.e. the
detector is right that these calls aren't in ITS allowlist, but wrong that they're
hallucinated. One PR to that one JSON file is the largest lever in the whole audit — bigger
than the enum-control-shape bulk-fix (45) by 6.8x. **Caveat (per the negative-control rule
below): this must be proven, not assumed** — a sample of the 305 keys needs to be checked
against live WordPress/WooCommerce core to confirm they're real functions before the
allowlist is extended, otherwise a genuine hallucinated-API bug could get silently
legitimised.

## 5. Negative-control check on the one exemption proposed here

The only new "exemption" this audit itself recommends is Q4's allowlist extension. Negative
control: pull 5 of the 305 `deadapi:` keys and confirm they're real, not confirm they merely
"sound real":
```
grep -o 'deadapi:[^"]*' plugins/sgs-blocks/scripts/dead-api-calls-baseline.json | sort -u | shuf -n5
```
This was **not executed in this audit** (would need a live PHP/WP function reference lookup,
out of scope for a read-only structural pass) — flagging explicitly so nobody treats §4's
recommendation as pre-verified. Whoever implements it must run this check before touching the
allowlist, per the project's own rule that an exemption without a negative control is worse
than the finding it hides.

## 6. Stale-reason findings

- `hardcoded-render-defaults-baseline.json` entries say "fix tracked separately" but no
  parking.md or decisions.md reference was found for that tracking — the stated deferral
  mechanism does not appear to exist. Either the reason is stale or the tracking lives
  somewhere this audit didn't check (blub.db is documented elsewhere in this repo's memory
  as retired for lookup, so "tracked separately" without a file pointer is now unverifiable
  by construction).
- `08-raw-url-link.json`'s own `_meta` already documents "First hit: 2026-08-11, D565" for
  the exact line-shift fragility the brief re-raised — the brief's framing implies this is a
  fresh discovery; it is a **known, already-named, recurring** problem. The fix proposed in
  Q2 has apparently not been applied despite being understood for weeks.

## Rollup

- **37 baseline/backlog/quarantine artefacts** once the discovery-command gap (§1) is
  corrected (vs. the brief's 36).
- **8 of those 37 are not suppression debt at all** (§2) — size ratchets, caches, budgets,
  golden fixtures, a dead pixel-diff artefact — and should be dropped from any "N baselines"
  headline count going forward.
- Of the ~29 real suppression files: **2 are line-keyed** (`08-raw-url-link`,
  `lint-theme-css-hardcodes` — the second unconfirmed), the rest use stable composite or
  hash keys.
- **Three-way split across everything classifiable** (excluding the 353 UNVER entries in
  cheat-gate/dead-api-calls/check-no-mirror, which carry no reason field to classify from):
  roughly **480 REAL DEBT**, **~54 DETECTOR BUG/LIMITATION** (12 rule-21 + ~30 editor-render-parity
  cross-file blind spot + ~12 box-flat untriaged), **~27 GENUINE EXCEPTION** (2 rule-08 + 4
  control-ux + 1 check-css-layer-orphans + ~20 duplicate-controls). These are approximate —
  several large files (oldshape-audit 196, dead-api-calls 305) were classified from their own
  documented rationale, not re-derived from source.
- **Single highest-leverage fix:** extend `dead-api-checker/wp-wc-function-allowlist.json` —
  potentially clears up to 305 entries, pending the negative-control check in §5 that this
  audit did not run.
- **Stale/unowned reasons found:** `hardcoded-render-defaults-baseline.json`'s "tracked
  separately" claim has no locatable tracking artefact; `08-raw-url-link.json`'s line-shift
  fragility was already self-documented as a known recurring failure before this incident.
