"""Art-directed media routing, exercised on the LIVE PATH with NOTHING stubbed.

WHY THIS FILE EXISTS
--------------------
``test_extraction.py::test_mech_b_scalar_media_dual_art_direction_keeps_both``
asserts this same behaviour and passes — while the feature was dead in
production for roughly two months. It passes for two reasons, and both are the
point of this file:

  1. It monkeypatches ``db_lookup.scalar_media_attr_for`` to return a value.
     That function is *the gate that was broken*: the DB rows it depends on had
     been silently reclassified, so the real one returned ``None`` for every
     block. The test stubbed out the exact thing that was failing.
  2. It calls ``run_mechanism_b`` directly. The live pipeline does not — it
     enters at ``walk.run_universal_content_walk``, which runs its own content
     leg FIRST and only then delegates. A test that skips that leg cannot catch
     a regression in the hand-off between them, which is precisely where the
     bug lived.

That sibling test is still worth keeping: it pins branch A's internal logic in
isolation. But it must never again be the ONLY coverage, because a green suite
reporting a dead feature is worse than no coverage at all — it actively
suppresses investigation.

WHAT THIS FILE DOES DIFFERENTLY
-------------------------------
  * Enters at ``run_universal_content_walk`` — the function the pipeline calls.
  * Stubs NOTHING. It reads the real database, so it fails if the
    ``role='scalar-media'`` rows drift again (the actual failure that occurred).
  * Uses the REAL markup shape from the canary mockup — TWO classes per image
    (``sgs-hero__split-image sgs-hero__split-image--mobile``), not the
    single combined class the synthetic repro used. That distinction decided the
    whole fix: with two classes, ``_family_element`` returns on the first class,
    which carries no modifier, so any "read the modifier during resolution"
    approach never reaches it.

If the DB is absent (fresh clone, CI) these skip rather than fail — the same
contract the prebuild DB gates use. A skip is honest; a false pass is not.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from converter import walk as W
from converter.context import Recognition, ScalarLift
from converter.db import db_lookup


# Verbatim shape from sites/mamas-munches/mockups/homepage/index.html — the
# canary. Both <img> carry the base element class AND a modifier class.
REAL_CANARY_MARKUP = (
    '<section class="sgs-hero sgs-hero--split">'
    '  <div class="sgs-hero__split-image">'
    '    <img class="sgs-hero__split-image sgs-hero__split-image--mobile"'
    '         src="/hero-mob.jpg" alt="Mobile crop">'
    '    <img class="sgs-hero__split-image sgs-hero__split-image--desktop"'
    '         src="/hero-desk.webp" alt="Desktop crop">'
    '  </div>'
    '</section>'
)


def _db_available() -> bool:
    try:
        con = sqlite3.connect(f"file:{db_lookup.SGS_DB}?mode=ro", uri=True)
    except sqlite3.OperationalError:
        return False
    try:
        con.execute("SELECT 1 FROM block_attributes LIMIT 1").fetchone()
        return True
    except sqlite3.OperationalError:
        return False
    finally:
        con.close()


requires_db = pytest.mark.skipif(
    not _db_available(), reason="knowledge-base DB absent (gitignored local artefact)"
)


def _walk(markup: str) -> dict[str, object]:
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    return {
        "lifts": {
            r.attr: (r.value.get("url") if isinstance(r.value, dict) else r.value)
            for r in results
            if isinstance(r, ScalarLift)
        },
        "others": [type(r).__name__ for r in results if not isinstance(r, ScalarLift)],
    }


def test_the_drift_detector_itself_catches_a_reclassified_role():
    """The role-drift detector must FAIL on the exact historical corruption.

    ⚠ THIS DELIBERATELY DOES NOT ASSERT AGAINST THE LIVE DB, and the reason is
    the whole lesson of this file. A test that queries the live database for
    these roles is VACUOUS: importing ``converter.db.db_lookup`` — which this
    module does, and which the pipeline does — re-asserts them at module load,
    silently repairing any drift BEFORE the assertion runs. I wrote that test
    first; a negative control (revert the rows in a sandbox, run the test)
    showed it passing against a corrupted database. It could never fail.

    So the real detector is ``dbschema/check_row_floor.py``, which runs as a
    separate process importing sqlite3 only, never db_lookup, and therefore
    observes the true stored state. What IS testable here is that the detector
    works — so that is what this asserts, against a synthetic database.
    """
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "_row_floor",
        Path(db_lookup.__file__).resolve().parents[2] / "dbschema" / "check_row_floor.py",
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    # Build the synthetic DB from VALUE_ASSERTIONS itself, so this test adapts when
    # the roster grows instead of silently asserting against a stale shape. (It did
    # exactly that: three assertions were added and this test failed because its
    # hand-built schema only had one of the three tables — the test working.)
    con = sqlite3.connect(":memory:")
    cols_by_table: dict[str, list[str]] = {}
    for a in mod.VALUE_ASSERTIONS:
        cols = list(a["key"]) + [a["column"]]
        cols_by_table.setdefault(a["table"], [])
        for c in cols:
            if c not in cols_by_table[a["table"]]:
                cols_by_table[a["table"]].append(c)
    for table, cols in cols_by_table.items():
        con.execute(f'CREATE TABLE "{table}" ({", ".join(f'"{c}" TEXT' for c in cols)})')
    # ⚠ Group by (table, key) FIRST. Two assertions can target the SAME row via
    # different columns (splitImage's `role` and its `emit_shape`); inserting one row
    # per ASSERTION then produces two half-populated rows for one logical row, and the
    # lookup's fetchone() picks whichever came first. Caught by this test failing.
    rows: dict[tuple, dict] = {}
    for a in mod.VALUE_ASSERTIONS:
        key = (a["table"], tuple(sorted(a["key"].items())))
        rows.setdefault(key, dict(a["key"]))[a["column"]] = a["expected"]
    for (table, _), row in rows.items():
        cols = cols_by_table[table]
        con.execute(
            f'INSERT INTO "{table}" ({", ".join(f'"{c}"' for c in cols)}) '
            f'VALUES ({", ".join("?" for _ in cols)})',
            [row.get(c) for c in cols],
        )
    assert mod.check_value_assertions(con) == [], "clean DB must produce no findings"

    # The exact historical corruption: right row, wrong-but-plausible value.
    for a in mod.VALUE_ASSERTIONS:
        where = " AND ".join(f'"{k}" = ?' for k in a["key"])
        con.execute(f'UPDATE "{a["table"]}" SET "{a["column"]}" = ? WHERE {where}',
                    ["WRONG-BUT-PLAUSIBLE", *a["key"].values()])
    findings = mod.check_value_assertions(con)
    con.close()

    assert len(findings) == len(mod.VALUE_ASSERTIONS), (
        f"detector missed a reclassification; got {findings}"
    )
    assert "WRONG-BUT-PLAUSIBLE" in findings[0], "finding must name the wrong value it found"


@requires_db
def test_art_direction_on_the_live_path_routes_both_images():
    """THE regression test: real entry point, real DB, real markup, no stubs."""
    out = _walk(REAL_CANARY_MARKUP)
    lifts = out["lifts"]

    assert lifts.get("splitImage") == "/hero-desk.webp", (
        f"desktop image did not reach splitImage; got {lifts.get('splitImage')!r}. "
        f"A value of '/hero-mob.jpg' is the known failure: the mobile crop lands in "
        f"the desktop attribute and would render on desktop. Full lifts: {lifts}"
    )
    assert lifts.get("splitImageMobile") == "/hero-mob.jpg", (
        f"mobile image did not reach splitImageMobile; got "
        f"{lifts.get('splitImageMobile')!r}. Full lifts: {lifts}"
    )


@requires_db
def test_art_direction_leaves_no_stray_child_block():
    """The second, quieter half of the bug.

    When routing failed, the unclaimed image did not vanish — it was emitted as
    a bare ``sgs/media`` ChildBlock, so the clone rendered a loose duplicate
    image outside the hero's own layout. Asserting only on the two attrs would
    let that regress unnoticed.
    """
    out = _walk(REAL_CANARY_MARKUP)
    assert out["others"] == [], (
        f"expected no stray child blocks, got {out['others']} — an image was not "
        f"claimed by either attribute and leaked into the content region."
    )


@requires_db
def test_single_class_markup_also_routes_both_images():
    """The synthetic single-class shape must keep working too.

    Drafts are hand-authored, so both shapes occur. This is the shape the
    original investigation used; keeping it pins that the fix is not
    accidentally specific to the two-class canary markup.
    """
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <img class="sgs-hero__split-image--mobile" src="/m.jpg">'
        '    <img class="sgs-hero__split-image--desktop" src="/d.webp">'
        '  </div>'
        '</section>'
    )
    lifts = _walk(markup)["lifts"]
    assert lifts.get("splitImage") == "/d.webp", f"got {lifts}"
    assert lifts.get("splitImageMobile") == "/m.jpg", f"got {lifts}"
