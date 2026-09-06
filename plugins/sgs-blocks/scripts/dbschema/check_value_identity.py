#!/usr/bin/env python3
"""Assert that named, load-bearing DB rows still hold the EXACT value they must.

WHAT THIS IS, AND WHAT IT USED TO BE
------------------------------------
This file was ``check_row_floor.py``. It carried two mechanisms: a row-count FLOOR
(fail the build if any table/column fell below a committed minimum) and these
value-identity assertions. On 2026-08-07 the floor was DELETED and the file renamed
to what it actually does. The floor's replacement is
``dbschema/seed_history.py`` — a rolling 5-run record of every count that REPORTS
unexpected movement and never blocks.

Why the floor went, in one line each:

  * It failed loudly on INTENDED reductions (dropping a batch of gap candidates
    tripped it), and the only resolutions were "re-baseline" — which silently
    accepts whatever actually happened — or "be blocked".
  * It passed silently on real losses: ``emit_shape`` floor 199 vs 237 live meant
    losing all 38 ``child`` rows landed exactly on the floor and read GREEN.
  * ``roles`` was tracked only in aggregate (floor 2374 against 2728 live), so
    losing both ``tag-identity`` rows moved the number 2728 -> 2726 invisibly.

There is deliberately NO overlap between the two survivors: this file asserts
IDENTITY (a named row's exact value) and blocks; ``seed_history.py`` observes
MAGNITUDE (counts over time) and only reports. Neither can substitute for the
other, so neither is unfalsifiable.

WHY IDENTITY IS THE PART WORTH BLOCKING ON
------------------------------------------
A count is structurally incapable of noticing a row whose value CHANGED from the
right one to a wrong-but-plausible one — the count does not move. That is not
hypothetical: when the ``scalar-media`` role was lost, the rows flipped to
``image-object``, non-null before and after, count unchanged. The floor built to
catch it read green straight through. Measured 2026-08-02.

These assertions are hand-curated and small on purpose: facts that are load-bearing,
easily reclassified by an automated pass, and impossible to notice by eye. Asserting
every seeded value would make this a nuisance gate that gets switched off — which is
exactly what happened to the floor.

⚠ IMPORTS sqlite3 ONLY — NEVER ``db_lookup``. ``converter/db/db_lookup.py``
re-asserts these roles at MODULE LOAD, so anything importing it silently repairs the
drift before it can be observed; a pytest regression test for this is VACUOUS, proven
by negative control rather than assumed. This script observes the true stored state.
Keep it that way: importing db_lookup here would blind the check completely.
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
import tempfile
from pathlib import Path

LIVE_DB_DEFAULT = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


VALUE_ASSERTIONS: list[dict] = [
    {
        "table": "block_attributes",
        "key": {"block_slug": "sgs/hero", "attr_name": "splitMediaType"},
        "column": "role",
        "expected": "scalar-media",
        "why": "Opens run_mechanism_b branch A, the only path that reads an image's "
               "--mobile/--tablet/--desktop modifier. Lost once already (against the "
               "PRIOR anchor, splitImage): a hero clone put the MOBILE crop in the "
               "DESKTOP attribute. Re-anchored here 2026-09-02 (Wave 7b) — splitImage/"
               "splitImageMobile were deleted from block.json the same day, having been "
               "dead on the render/editor side since the Wave 6 media-atom migration and "
               "kept alive for one extra day purely as this assertion's target. "
               "splitMediaType is genuinely read by render.php (it selects the media "
               "family) and is the sole real (non-virtual) anchor row now — Mobile/Tablet "
               "tiers do NOT get their own anchor row (see scalar_media_attr_for's "
               "docstring: it never matches a 'Mobile'-suffixed row, and 'Tablet'-suffixed "
               "real rows were deliberately never created, to avoid two rows both matching "
               "the same canonical_slot with no tier-aware tiebreak). Source of truth: "
               "scripts/data/scalar-media-roles.json.",
    },
    # ------------------------------------------------------------------
    # THE ART-DIRECTION DEPENDENCY CHAIN (added 2026-08-02 after the QC council
    # observed that 6 seeded columns had only a population floor — the exact
    # blind spot that hid the scalar-media loss for two months).
    #
    # These are NOT arbitrary rows. Each is a link the D474 fix DEPENDS ON: if any
    # one flips, art-directed image cloning breaks silently, exactly as before, and
    # a population count would not move because every value stays non-null.
    # Asserting the mechanism's dependencies is the principled scope.
    {
        "table": "blocks",
        "key": {"slug": "sgs/hero"},
        "column": "tier",
        "expected": "class-section",
        "why": "is_class_section_block() reads this. It gates run_mechanism_b branch A — "
               "the only modifier-aware path — AND the seeder's own pre-condition guard. "
               "If it flips to 'block', art direction dies AND the seeder refuses to "
               "re-assert scalar-media, i.e. both the mechanism and its repair fail together.",
    },
    {
        "table": "roles",
        "key": {"role_name": "scalar-media"},
        "column": "classification",
        "expected": "styling-behaviour",
        "why": "This is what keeps scalar-media OUT of the content-bearing allowlist, which "
               "is how the attr is handed to branch A instead of being claimed by the "
               "universal walk. Flip it to 'content-bearing' and the walk re-claims the "
               "image with no modifier awareness — the original bug, restored.",
    },
    # ⚠ The `emit_shape='nested'` assertion that used to live here (removed
    # 2026-09-02, Wave 6 — sgs/hero's media-atom migration) is now STALE, not
    # a regression to fix. `_populate_emit_shape` (sgs-update-v2.py) only
    # classifies attrs whose role is in the content-bearing allowlist —
    # `roles.classification='content-bearing'` — and `splitImage`'s role
    # ('scalar-media', asserted two rows above) is 'styling-behaviour', so it
    # was NEVER eligible for that query in the first place; whatever value it
    # held before was a leftover from an earlier classification pass, not a
    # live invariant `_populate_emit_shape` re-asserts. The real protection
    # against the double-render this assertion named ("'child' would emit a
    # separate block") is the `role='scalar-media'` assertion above — that
    # role is what excludes the attr from the content-bearing walk that
    # decides nested vs child, independent of `emit_shape`'s own value.
    # Confirmed structurally, not assumed: render.php no longer reads
    # `splitImage` at all (its own composite shape retired in favour of
    # splitImageId/Url/Alt — Bean-locked, R-31-14, no legacy read-time
    # fallback), and `run_mechanism_b`'s ScalarLift for `splitImage` is
    # translated at write-time (`assembly.py`, via
    # `db_lookup.scalar_media_emit_as()`) into those three new attrs instead
    # of the composite object — so a future clone still produces content the
    # migrated block actually renders; `emit_shape` merely stopped being the
    # column that proves it.
    # ⛔ sgs/testimonial-slider.sideImage was asserted here on 2026-08-02 and REMOVED the
    # same day: setting role='scalar-media' on it BROKE the block. Measured with the
    # seeder disabled — 'image-object' lifts sideImage, 'scalar-media' lifts nothing,
    # because branch A only fires for is_class_section_block blocks and that one is not.
    # Its correct role is 'image-object'. Do not re-add it here.
]


def check_value_assertions(con: sqlite3.Connection, assertions: list[dict] | None = None) -> list[str]:
    """Return a finding per assertion that does not hold.

    A missing table or column is reported as a finding rather than raising: that is
    schema drift, which ``check_schema_drift.py`` owns, but staying silent here would
    let a dropped column read as a passing value check.
    """
    findings: list[str] = []
    for a in (VALUE_ASSERTIONS if assertions is None else assertions):
        where = " AND ".join(f'"{k}" = ?' for k in a["key"])
        sql = f'SELECT "{a["column"]}" FROM "{a["table"]}" WHERE {where}'  # noqa: S608 — fixed identifiers
        try:
            row = con.execute(sql, list(a["key"].values())).fetchone()
        except sqlite3.OperationalError as exc:
            findings.append(
                f'VALUE  {a["table"]}.{a["column"]} for {a["key"]} — '
                f"could not be read ({exc}); treat as UNVERIFIED, not as passing."
            )
            continue
        keydesc = ", ".join(f"{k}={v!r}" for k, v in a["key"].items())
        if row is None:
            findings.append(
                f'VALUE  {a["table"]} row ({keydesc}) IS MISSING — '
                f'expected {a["column"]}={a["expected"]!r}. {a["why"]}'
            )
        elif row[0] != a["expected"]:
            findings.append(
                f'VALUE  {a["table"]}.{a["column"]} for ({keydesc}) is {row[0]!r}, '
                f'expected {a["expected"]!r}. {a["why"]}'
            )
    return findings


def cmd_check(live_db: Path) -> int:
    if not live_db.exists():
        print(
            f"SKIPPED — DB not found: {live_db}\n"
            "  This is expected on a machine without the local dev DB (it is unversioned "
            "by design). The build proceeds; run "
            "`python plugins/sgs-blocks/scripts/sgs-update-v2.py` to (re)create it if you "
            "need this check to run."
        )
        return 0

    con = sqlite3.connect(f"file:{live_db}?mode=ro", uri=True)
    try:
        findings = check_value_assertions(con)
    finally:
        con.close()

    if findings:
        print(f"VALUE-IDENTITY VIOLATION ({len(findings)} finding(s)):")
        for f in findings:
            print(f"  - {f}")
        print(f"\nlive db    : {live_db}")
        print(
            "\nA named row's value is not what it must be. This is NOT a row-count problem "
            "-- the row is present and populated, it simply holds the wrong value, which is "
            "why any count-based check reads clean. Re-assert it from its source of truth "
            "(for scalar-media: import converter.db.db_lookup, which re-applies "
            "scripts/data/scalar-media-roles.json), then find what reclassified it."
        )
        return 1

    print(f"CLEAN -- {len(VALUE_ASSERTIONS)} value-identity assertion(s) hold ({live_db.name}).")
    return 0


# --------------------------------------------------------------------------
# self-test -- prove the check can FAIL on a real reclassification, and that it
# stays green on the correct values. A gate never shown to fail is decoration.
# --------------------------------------------------------------------------

def _self_test() -> int:
    failures: list[str] = []
    tmp = Path(tempfile.mkdtemp(prefix="sgs-value-identity-selftest-"))
    db_path = tmp / "toy.db"

    # Build the synthetic DB from VALUE_ASSERTIONS itself, so this adapts when the
    # roster grows instead of asserting against a hand-frozen shape.
    con = sqlite3.connect(str(db_path))
    cols_by_table: dict[str, list[str]] = {}
    for a in VALUE_ASSERTIONS:
        for c in list(a["key"]) + [a["column"]]:
            cols_by_table.setdefault(a["table"], [])
            if c not in cols_by_table[a["table"]]:
                cols_by_table[a["table"]].append(c)
    for table, cols in cols_by_table.items():
        coldefs = ", ".join('"%s" TEXT' % c for c in cols)
        con.execute('CREATE TABLE "%s" (%s)' % (table, coldefs))
    # MERGE assertions that share a table AND a key into ONE row. Two assertions do
    # exactly that today (sgs/hero.splitImage is asserted on both `role` and
    # `emit_shape`); inserting a row per assertion instead produced two half-populated
    # rows and made arm 1 fail against values that were in fact correct.
    merged: dict[tuple, dict] = {}
    for a in VALUE_ASSERTIONS:
        key = (a["table"], tuple(sorted(a["key"].items())))
        row = merged.setdefault(key, dict(a["key"]))
        row[a["column"]] = a["expected"]
    for (table, _k), row in merged.items():
        collist = ", ".join('"%s"' % c for c in row)
        placeholders = ", ".join("?" for _ in row)
        con.execute(
            'INSERT INTO "%s" (%s) VALUES (%s)' % (table, collist, placeholders),
            list(row.values()),
        )
    con.commit()
    con.close()

    def findings_now() -> list[str]:
        c = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        try:
            return check_value_assertions(c)
        finally:
            c.close()

    print("arm 1 (passing) -- correct values must produce zero findings:")
    f = findings_now()
    if f:
        failures.append(f"correct values produced findings: {f}")
        print(f"  FAIL  {f}")
    else:
        print(f"  PASS  0 findings across {len(VALUE_ASSERTIONS)} assertion(s)")

    print("\narm 2 (failing) -- reclassify one row to a wrong-but-plausible value, "
          "confirm it is CAUGHT:")
    target = VALUE_ASSERTIONS[0]
    where = " AND ".join(f'"{k}" = ?' for k in target["key"])
    con = sqlite3.connect(str(db_path))
    con.execute(
        f'UPDATE "{target["table"]}" SET "{target["column"]}" = ? WHERE {where}',
        ["WRONG-BUT-PLAUSIBLE", *target["key"].values()],
    )
    con.commit()
    # Confirm the break actually landed before asserting on it -- an UPDATE matching
    # zero rows exits cleanly and would make this arm vacuous.
    stored = con.execute(
        f'SELECT "{target["column"]}" FROM "{target["table"]}" WHERE {where}',
        list(target["key"].values()),
    ).fetchone()
    con.close()
    if not stored or stored[0] != "WRONG-BUT-PLAUSIBLE":
        failures.append(f"the negative control did not land: stored={stored}")
        print(f"  FAIL  the UPDATE did not change the value (stored={stored})")
    else:
        f = findings_now()
        if not any("WRONG-BUT-PLAUSIBLE" in x for x in f):
            failures.append(f"reclassification NOT detected: {f}")
            print(f"  FAIL  {f}")
        else:
            print("  PASS  caught:")
            for x in f:
                print(f"    - {x}")

    print("\narm 3 (missing-row) -- delete the row entirely, confirm absence is CAUGHT "
          "(not read as passing):")
    con = sqlite3.connect(str(db_path))
    con.execute(f'DELETE FROM "{target["table"]}" WHERE {where}', list(target["key"].values()))
    con.commit()
    remaining = con.execute(
        f'SELECT COUNT(*) FROM "{target["table"]}" WHERE {where}', list(target["key"].values())
    ).fetchone()[0]
    con.close()
    if remaining != 0:
        failures.append(f"delete did not land: {remaining} row(s) remain")
        print(f"  FAIL  {remaining} row(s) remain")
    else:
        f = findings_now()
        if not any("IS MISSING" in x for x in f):
            failures.append(f"missing row NOT detected: {f}")
            print(f"  FAIL  {f}")
        else:
            print("  PASS  missing row reported as a finding")

    import shutil

    shutil.rmtree(tmp, ignore_errors=True)

    print()
    if failures:
        print(f"SELF-TEST FAILED ({len(failures)}):")
        for x in failures:
            print(f"  - {x}")
        return 1
    print("SELF-TEST PASSED -- the check was shown to FAIL on a reclassified value and on "
          "a missing row, and to stay GREEN on correct values.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--live-db", type=Path, default=LIVE_DB_DEFAULT,
                    help="live database, opened READ-ONLY (default: the real knowledge base)")
    ap.add_argument("--check", action="store_true",
                    help="assert every value-identity row; exit 1 on any violation")
    ap.add_argument("--self-test", action="store_true",
                    help="prove the check can FAIL on a reclassified value and a missing row")
    args = ap.parse_args()

    if args.self_test:
        return _self_test()
    if args.check:
        return cmd_check(args.live_db)

    ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
