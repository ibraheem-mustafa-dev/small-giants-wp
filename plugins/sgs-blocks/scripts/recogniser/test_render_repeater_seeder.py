"""Self-test for render_repeater_seeder.py — Spec 44 §4.2/§4.3, §10.

Fixture discipline, matching `test_classless_field_resolver.py`: no invented block
fixtures and no fixture DB copy of the SCHEMA — every source fixture is a REAL
`render.php`/partial read off disk, and the `array_item_schema` DDL replayed in the
reseed test is read from the LIVE `sgs-framework.db` rather than hand-typed here
(a hand-typed copy is a fixture that silently drifts from the table it claims to
model). Writes go to a temp DB — the seeder's real target is the live DB, but a
test must not mutate it.

The three §10 fixtures this file owes are `test_render_time_row_survives_reseed`,
`test_negative_control_*` and `test_source_mutation_*`. The rest are controls
proving those three can actually fail.
"""
from __future__ import annotations

import os
import re
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import render_repeater_seeder as mod  # noqa: E402

LIVE_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
GALLERY_COL = "gallery-col.php"
_TEMP_DBS: list[str] = []


def _tmp_conn() -> sqlite3.Connection:
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    _TEMP_DBS.append(path)
    return sqlite3.connect(path)


def _roles_for(slug: str, source_file: str) -> list[str]:
    repeaters, warnings = mod.detect_repeaters(slug)
    assert not warnings, f"{slug} parse warnings: {warnings}"
    return [r for rep in repeaters if rep["source_file"] == source_file
            for r, _o in rep["roles"]]


# ---------------------------------------------------------------- ground truth

def test_live_db_is_the_real_one() -> None:
    """Real-DB discipline: assert the fixtures below are measured against the live
    schema, not an empty file that would make every later assertion vacuous."""
    assert LIVE_DB.exists(), f"live DB missing at {LIVE_DB}"
    con = sqlite3.connect(f"file:{LIVE_DB}?mode=ro", uri=True)
    total = con.execute("SELECT COUNT(*) FROM array_item_schema").fetchone()[0]
    blocks = con.execute("SELECT COUNT(DISTINCT block_slug) FROM array_item_schema").fetchone()[0]
    con.close()
    assert total > 0 and blocks > 0, "array_item_schema is empty — fixtures would be vacuous"
    print(f"  PASS  live-db: array_item_schema {total} rows / {blocks} blocks")


def test_buybox_worked_example_matches_the_spec() -> None:
    """Spec 44 §4.1, re-derived against the real file: the per-thumbnail loop in
    gallery-col.php carries a click action, a toggled current-state indicator and a
    label — and NO image-or-fallback, because the `<img>` there is unconditional."""
    src = mod.BLOCKS_DIR / "buybox" / GALLERY_COL
    assert src.exists(), f"fixture source missing: {src}"
    text = src.read_text(encoding="utf-8")
    assert "foreach ( $buybox_def_gallery as $buybox_thumb_idx => $buybox_thumb )" in text
    roles = _roles_for("sgs/buybox", GALLERY_COL)
    assert roles == [mod.ROLE_ACTION, mod.ROLE_CURRENT, mod.ROLE_LABEL], roles
    assert mod.ROLE_IMAGE not in roles, "the thumbnail image is unconditional (§4.1)"
    print(f"  PASS  buybox-worked-example: {roles}")


def test_negative_control_ordinary_foreach_seeds_zero_rows() -> None:
    """§4.3's required negative control. `sgs/container`'s only `foreach` is a
    corner-radius value builder over an array literal — non-attribute-backed, so the
    attribute filter alone does NOT reject it; it is rejected for emitting no markup.
    That is what makes it a discriminating control rather than a free pass."""
    text = (mod.BLOCKS_DIR / "container" / "render.php").read_text(encoding="utf-8")
    assert "foreach" in text, "control is vacuous if the block has no foreach at all"
    repeaters, warnings = mod.detect_repeaters("sgs/container")
    assert not warnings and repeaters == [], repeaters

    conn = _tmp_conn()
    counts = mod.seed_render_repeaters(conn, slugs=["sgs/container"])
    rows = conn.execute("SELECT COUNT(*) FROM block_render_repeaters").fetchone()[0]
    conn.close()
    assert rows == 0 and counts["rows"] == 0, counts
    print("  PASS  negative-control: sgs/container has a foreach and seeds 0 rows")


def test_attribute_backed_loop_is_not_a_render_time_repeater() -> None:
    """`sgs/cta-section` iterates `$stats = $attributes['stats']` — one alias hop.
    It has a block.json attribute, so it is array_item_schema's row, not this
    table's (§4.2)."""
    text = (mod.BLOCKS_DIR / "cta-section" / "render.php").read_text(encoding="utf-8")
    assert "$stats        = $attributes['stats']" in text
    assert mod._attribute_backed("$stats as $stat", text) is True
    assert mod.detect_repeaters("sgs/cta-section")[0] == []
    print("  PASS  attribute-backed: sgs/cta-section's $stats loop excluded")


# ---------------------------------------------------------------- §10 fixture (a)

def test_render_time_row_survives_reseed() -> None:
    """§10(a). Two survival questions, both answered against real behaviour:
    the array_item_schema rebuild (delete-then-insert per block, the routine §4.2
    names) must not touch these rows, and re-running this seeder must not lose them.
    """
    live = sqlite3.connect(f"file:{LIVE_DB}?mode=ro", uri=True)
    ddl = live.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='array_item_schema'"
    ).fetchone()[0]
    donor = live.execute(
        "SELECT block_slug FROM array_item_schema GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1"
    ).fetchone()[0]
    donor_rows = live.execute(
        "SELECT * FROM array_item_schema WHERE block_slug = ?", (donor,)
    ).fetchall()
    live.close()

    conn = _tmp_conn()
    conn.execute(ddl)
    conn.executemany(
        f"INSERT INTO array_item_schema VALUES ({','.join('?' * len(donor_rows[0]))})",
        donor_rows,
    )
    before = mod.seed_render_repeaters(conn, slugs=["sgs/buybox", donor])
    assert before["rows"] > 0, "fixture vacuous — nothing seeded to survive anything"

    # The exact shape sgs-update-v2.py's array_item_schema seeder runs per block.
    conn.execute("DELETE FROM array_item_schema WHERE block_slug = ?", (donor,))
    conn.executemany(
        f"INSERT OR REPLACE INTO array_item_schema VALUES ({','.join('?' * len(donor_rows[0]))})",
        donor_rows,
    )
    conn.commit()
    after_rebuild = conn.execute(
        "SELECT COUNT(*) FROM block_render_repeaters").fetchone()[0]
    assert after_rebuild == before["rows"], f"{after_rebuild} != {before['rows']}"

    mod.seed_render_repeaters(conn, slugs=["sgs/buybox", donor])
    after_reseed = conn.execute(
        "SELECT COUNT(*) FROM block_render_repeaters WHERE block_slug = 'sgs/buybox'"
    ).fetchall()
    conn.close()
    assert len(after_reseed) == 1 and after_reseed[0][0] > 0
    print(f"  PASS  survives-reseed: {before['rows']} row(s) intact through the "
          f"array_item_schema rebuild for {donor} + a full reseed")


# ---------------------------------------------------------------- §10 fixture (c)

def test_source_mutation_changes_sha_and_warns(capture: list[str]) -> None:
    """§10(c). Mutate the REAL gallery-col.php source in memory, drive it through the
    same detector, and assert the seeder announces a reseed rather than going stale.
    """
    real = mod.resolve_sources("sgs/buybox")
    mutated = [(f, t.replace('aria-current="', 'aria-checked-x="') if f == GALLERY_COL else t)
               for f, t in real]
    # Positive control for the INJECTION itself: a fixture that silently falls back
    # to the real tree would make every assertion below vacuous while printing PASS.
    assert mutated != real, "mutation did not take — the fixture is not being used"

    conn = _tmp_conn()
    mod.seed_render_repeaters(conn, slugs=["sgs/buybox"])
    original_sha = conn.execute(
        "SELECT DISTINCT source_sha FROM block_render_repeaters WHERE block_slug='sgs/buybox'"
    ).fetchone()[0]

    new_sha = "f" * 64
    capture.clear()
    mod.seed_render_repeaters(
        conn,
        slugs=["sgs/buybox"],
        detector=lambda slug, _s=mutated: mod.detect_repeaters(slug, sources=_s),
        sha_fn=lambda _slug: new_sha,
    )
    stored_sha = conn.execute(
        "SELECT DISTINCT source_sha FROM block_render_repeaters WHERE block_slug='sgs/buybox'"
    ).fetchone()[0]
    roles = [r[0] for r in conn.execute(
        "SELECT role FROM block_render_repeaters WHERE block_slug='sgs/buybox' "
        "AND source_file = ? ORDER BY role_order", (GALLERY_COL,)).fetchall()]
    conn.close()

    assert stored_sha == new_sha != original_sha, (stored_sha, original_sha)
    assert any("source_sha changed" in line for line in capture), capture
    assert mod.ROLE_CURRENT not in roles, "the mutated source no longer toggles a state"
    print("  PASS  staleness: sha change reseeded and WARNed, not silently stale")


# ---------------------------------------------------------------- fail-loud control

def test_unparseable_foreach_is_flagged_not_silently_absent() -> None:
    """The fail-loud branch must be REACHABLE — a gate that cannot fire is not a gate.
    Real gallery-col.php with its `endforeach` removed: flagged, and the block is left
    unseeded rather than recorded as having no repeater."""
    real = mod.resolve_sources("sgs/buybox")
    broken = [(f, t.replace("endforeach;", "") if f == GALLERY_COL else t) for f, t in real]
    assert broken != real, "control is vacuous — nothing was broken"
    _reps, warnings = mod.detect_repeaters("sgs/buybox", sources=broken)
    assert any("endforeach" in w for w in warnings), warnings

    conn = _tmp_conn()
    counts = mod.seed_render_repeaters(
        conn, slugs=["sgs/buybox"],
        detector=lambda slug, _s=broken: mod.detect_repeaters(slug, sources=_s))
    rows = conn.execute("SELECT COUNT(*) FROM block_render_repeaters").fetchone()[0]
    conn.close()
    assert counts["flagged"] >= 1 and rows == 0, (counts, rows)
    print(f"  PASS  fail-loud: flagged={counts['flagged']}, seeded 0 (not 'no repeater')")


def test_url_literal_in_markup_does_not_blank_a_data_attribute() -> None:
    """`markup_view`'s comment-blanking pass must be scoped to what `mask_php`
    actually classified as a PHP comment, not a fresh regex over the raw source.

    Real gallery-col.php, mutated so the thumbnail button's ONLY `data-*`
    action-trigger signal sits on the SAME LINE as, and AFTER, an absolute-URL
    literal in real markup. `formaction` is a genuine `<button>` attribute and is
    NOT itself a `data-*` signal, so if the `//` in `https://` is misread as a
    line-comment opener the whole action-trigger role disappears — silently.

    The negative half is asserted directly: the OLD unscoped regex is run over
    this exact fixture and must be shown to swallow the `data-index` attribute.
    Without that, this test would pass against either implementation.
    """
    real = mod.resolve_sources("sgs/buybox")
    mutated = [
        (f, t.replace('data-index="<?php',
                      'formaction="https://example.com/gallery" data-index="<?php')
         if f == GALLERY_COL else t)
        for f, t in real
    ]
    assert mutated != real, "mutation did not take — the fixture is not being used"

    text = dict(mutated)[GALLERY_COL]
    inj = text.index('formaction="https://')
    idx = text.index("data-index=", inj)

    # OLD behaviour (the bug): the unscoped regex matches from the `//` inside the
    # URL to end of line, swallowing the data-index attribute that follows it.
    old = re.compile(r"//[^\n]*|#[^\n]*|/\*.*?\*/", re.S)
    assert any(m.start() < idx < m.end() for m in old.finditer(text)), (
        "control is vacuous — the old regex would not have blanked this attribute")

    # NEW behaviour: the attribute survives into the markup view, and the role lands.
    view = mod.markup_view(text)
    assert view[idx:idx + len("data-index=")] == "data-index=", repr(view[idx - 40:idx + 20])

    repeaters, warnings = mod.detect_repeaters("sgs/buybox", sources=mutated)
    assert not warnings, warnings
    roles = [r for rep in repeaters if rep["source_file"] == GALLERY_COL
             for r, _o in rep["roles"]]
    assert roles == [mod.ROLE_ACTION, mod.ROLE_CURRENT, mod.ROLE_LABEL], roles
    print("  PASS  url-literal: `://` in markup no longer blanks a real data-* signal")


def test_survey_does_not_mutate_the_database() -> None:
    """A dry run must not even create the table — a survey that writes schema is a
    write with a read's name."""
    conn = _tmp_conn()
    mod.seed_render_repeaters(conn, slugs=["sgs/buybox"], dry_run=True)
    exists = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE name='block_render_repeaters'").fetchone()
    conn.close()
    assert exists is None, "dry run created the table"
    print("  PASS  survey-is-read-only")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # cp1252 consoles mangle § and —
    print("Spec 44 §4.2/§4.3 — block_render_repeaters seeder")
    captured: list[str] = []
    real_print = print

    import builtins
    def _tee(*args, **kwargs):  # noqa: ANN202 — capture the seeder's own WARN lines
        captured.append(" ".join(str(a) for a in args))
        real_print(*args, **kwargs)

    test_live_db_is_the_real_one()
    test_buybox_worked_example_matches_the_spec()
    test_negative_control_ordinary_foreach_seeds_zero_rows()
    test_attribute_backed_loop_is_not_a_render_time_repeater()
    test_render_time_row_survives_reseed()
    builtins.print = _tee
    try:
        test_source_mutation_changes_sha_and_warns(captured)
    finally:
        builtins.print = real_print
    test_unparseable_foreach_is_flagged_not_silently_absent()
    test_url_literal_in_markup_does_not_blank_a_data_attribute()
    test_survey_does_not_mutate_the_database()
    for path in _TEMP_DBS:
        try:
            os.unlink(path)
        except OSError:
            pass
    print("\nBLOCK-RENDER-REPEATERS: PASS (worked example + negative control + "
          "attribute-backed exclusion + reseed survival + staleness + fail-loud + "
          "url-literal comment scoping + read-only survey)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
