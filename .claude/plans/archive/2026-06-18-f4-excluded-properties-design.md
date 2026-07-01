---
doc_type: spec
project: small-giants-wp
thread: cloning-pipeline
title: "Phase F step F4 — closed, audited EXCLUDED-properties TABLE (MF-4); the gate moves to F5"
created: 2026-06-18
updated: 2026-06-18
status: DESIGN v2 — Bean-approved RE-SCOPE after /qc-council (2026-06-18): F4 = the empty table + migration ONLY; the literal-ban gate is MOVED to F5 (designed there around the coverage invariant). Ready to build.
spec_ref: specs/31-UNIVERSAL-CLONING-PIPELINE.md §12.2.4 (MF-4) + §12.2.1 (the no-silent-drop equation) + §12.0/§12.4 (D-MODULAR) + §12.7 F4/F5
depends_on: F2 (declare_input ledger, f8a746c7) + F3-core (oracle, 6b430dae)
council: /qc-council 2026-06-18 (3 raters: spec-fidelity / adversarial-gamer / D-MODULAR-blast-radius)
binding_rules: R-22-1 (DB-first), STOP-3 (closed audited set not in-code dict), STOP-6 (a gate must be WIRED to something that runs)
---

# F4 — closed, audited EXCLUDED TABLE (the gate is F5's job)

## 0. Plain English + the re-scope (why F4 shrank)

**What F4 is now.** A single DB table `excluded_properties(css_property, reason, decided_by, date)` that records every CSS property we deliberately do NOT reproduce in the clone — each with an audited, dated, reasoned row. It SHIPS EMPTY (there are no real clone-drops — confirmed by the code). It is created by a dated migration; the migration is the only seed path.

**What F4 is NOT (the /qc-council re-scope).** F4 originally also proposed a "literal-ban gate". A 3-rater /qc-council (2026-06-18) convergently found that a static literal-scan gate is a NARROW TRIPWIRE that OVERCLAIMS — it catches only "a new named denylist set in `converter_v2/`" and is blind to the real drop surface (inline `if prop=="x":continue`, anonymous local sets like `_area_excluded`, `.startswith("--")` guards, value-transforms returning ""/None, DB-lookup-None, broad-except, and drops in `css_router.py`/`db_lookup.py` one directory UP that the scan never opens). **The real no-silent-drop guarantee rests on F2 (the draft ledger's UNACCOUNTED equation) + F3 (LANDED) + the css_router coverage invariant (every declaration routes to exactly one bucket — §12.2.1) + F5's pipeline-close ledger checker that joins them.** F4's only job is to be the audited `excluded` set that F5's checker joins. **Bean-approved 2026-06-18: F4 = table only; the gate → F5.**

**Why the table is genuinely EMPTY (grounded in the code).** §12.7's "seed width/max-width" is WRONG. `_LIFT_EXCLUDED_PROPS={"max-width","width"}` (convert.py:966) is DEAD (never referenced; max-width is cloned via dedicated code at 4560/4673). `_CROSS_NODE_EXCLUDED_PROPS={display,grid-template-*}` (2206) is a PLACEMENT rule (don't inline-lift across nodes — GAP-3/R-22-6), NOT a clone-drop: `grid-template-*` clone via `gridTemplateColumns`, and `display` clones via the `layout:grid` attr → wrapper CSS (VERIFIED: the F3-core live probe showed computed `display:grid` on the rendered container). So no property is excluded-from-CLONE. Excluded-from-lift ≠ excluded-from-clone (§12.2.4).

## 1. What builds now (F4 done-when — re-scoped)

1. **A dated migration** `migrations/2026-06-18-create-excluded-properties.py` (idempotent, existence-gated, the canonical pattern of `migrations/2026-06-13-property-suffixes-align-items.py`; DB at `~/.claude/skills/sgs-wp-engine/sgs-framework.db`) that runs `CREATE TABLE IF NOT EXISTS excluded_properties (css_property TEXT NOT NULL, reason TEXT NOT NULL, decided_by TEXT NOT NULL, date TEXT NOT NULL)` and seeds ZERO rows. Re-runs are no-ops.
2. That is the entire F4 build. No gate, no scanner, no convert.py edit.

## 2. Acceptance (F4 done-when — corrected per council Finding 6)

1. The migration, run manually (the canonical pattern — `/sgs-update` does NOT auto-run migrations; council Finding 6 corrected the original false claim), creates `excluded_properties` and seeds ZERO rows. Re-running it is a no-op (idempotent).
2. The table ships EMPTY: `SELECT COUNT(*) FROM excluded_properties` = 0.
3. convert.py UNCHANGED (grep proves zero edits).
4. Both conformance suites still green after the migration (Gate A converter conformance + F2 ledger `--check` + F3 oracle tests) — the migration adds a table, touches no existing row.

## 3. F5 HAND-OFF — the gate requirements the council established (do NOT re-derive; build in F5)

F5's gate cluster inherits the exclusion-enforcement. The council established the gate's REAL design (record here so F5 builds it right, not the overclaiming tripwire):
- **Anchor on the COVERAGE-CONSERVATION invariant, not a literal scan.** The guarantee is "count-in == count-routed": every draft declaration (from F2's ledger) lands in exactly one bucket — transferred ∪ excluded-with-reason (joins THIS table) ∪ tracked-gap. F5's pipeline-close ledger checker computes `UNACCOUNTED = draft − (transferred ∪ excluded ∪ gap)` and fails on `UNACCOUNTED>0`. This is the real structural guarantee; the literal-scan is at most a cheap secondary tripwire.
- **If F5 keeps a literal-scan tripwire, scope it HONESTLY + widen it:** scan the WHOLE reachable CSS-routing pipeline (import-graph-derived from convert.py/convert_page.py, so fresh modular files auto-cover — NOT just `converter_v2/*.py`; the live drop surface is in `css_router.py`/`db_lookup.py` one dir up). Detect inline equality drops (`if prop=="x":continue`), tuple-membership, anonymous local sets (`if prop in <var>:continue` regardless of name), `.startswith("--")` guards. Explicitly DELEGATE the classes a static scan can't catch: value-transform drops → F3 (LANDED); DB-lookup-None / no-suffix-row → F2 (UNACCOUNTED); broad-except fail-silent → a separate bare-except lint. State in F5 that the tripwire guarantees nothing about those classes.
- **Harden the baseline against self-blessing:** content-hash the committed legacy baseline; ANY growth (new signature, or a property added to an existing set) hard-fails with the SAME "needs a dated migration + reason" requirement; baseline may only SHRINK via an explicit reviewed diff that an automated "this literal no longer exists in code" check confirms — never a silent hand-edit.
- **Wire to something that actually runs (STOP-6):** prebuild is bypassable (CSS-routing edits are Python, need no `npm build`; no CI here). Wire to a pre-commit hook on the Python path (the `.claude/settings.json` PreToolUse git-commit hook MF-5 names) AND `prestart` (council Finding 5 — `prestart` currently skips the ledger/oracle checks too). Don't claim "the build fails" without that.
- **`SKIP_TOP_LEVEL_TAGS` is OUT of scope** (the R-22-1 permitted tag-skip; header/footer/nav are not CSS properties).

## 4. Council record (3 raters, 2026-06-18 — verdicts FIX-FIRST on the original gate design, GO on the table)
- **Spec-fidelity (Sonnet):** EMPTY-table decision spec-correct for grid-template-*/display (display clones via layout attr — confirmed by F3-core probe, refuting the rater's own HIGH #2); D-MODULAR correct; the original gate missed `_area_excluded` + `.startswith("--")`.
- **Adversarial-gamer (Opus):** the original literal-gate is "theatre against a motivated developer" — the no-drop guarantee rests on F2+F3+coverage-invariant, not F4; enumerated the full false-negative surface (out-of-tree, transform, None-lookup, allowlist-by-omission, broad-except, self-blessable baseline, bypassable wiring).
- **D-MODULAR (Sonnet):** convert.py genuinely untouched ✓; baseline pattern sound in principle but inline-equality + anonymous-local forms evade detection; AC1 false (`/sgs-update` doesn't auto-run migrations); prebuild misses prestart; commit-hook bypass.
- **Resolution:** Bean re-scoped F4 to the table only; all gate work + the council's gate requirements move to F5 (§3 above).
