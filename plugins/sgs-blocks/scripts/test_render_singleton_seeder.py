"""Self-test for seed-render-singletons.py — Spec 31 §13.10.

Fixture discipline, matching `test_render_repeater_seeder.py`: no invented block
fixtures — every source fixture is a REAL `render.php`/partial read off disk (or a
real, disclosed mutation of one). Writes go to a temp DB — the seeder's real target
is the live DB, but a test must not mutate it.

The six required fixtures (per the task brief): positive control (real buybox
`image-or-fallback`), disjointness (the single most important correctness property
here — no byte overlap with the two sibling tables' own claimed spans), negative
control (zero rows on a real block with no static-role signal), staleness (source_sha
discipline), read-only survey, and fail-loud (a block already flagged by a sibling
detector is also skipped here, not silently seeded).
"""
from __future__ import annotations

import importlib.util
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
RECOGNISER_DIR = HERE / "recogniser"
if str(RECOGNISER_DIR) not in sys.path:
    sys.path.insert(0, str(RECOGNISER_DIR))

import render_repeater_seeder as rrs  # noqa: E402

_spec = importlib.util.spec_from_file_location(
    "sgs_seed_render_singletons", str(HERE / "seed-render-singletons.py")
)
mod = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
_spec.loader.exec_module(mod)  # type: ignore[union-attr]

GALLERY_COL = "gallery-col.php"
_TEMP_DBS: list[str] = []


def _tmp_conn() -> sqlite3.Connection:
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    _TEMP_DBS.append(path)
    return sqlite3.connect(path)


# ---------------------------------------------------------------- positive control

def test_buybox_main_image_has_a_real_if_else_image_shape() -> None:
    """Confirm directly against the real file (not a mocked/invented snippet) that
    `sgs/buybox`'s main image genuinely has an `if (...) { <img> } else { <svg> }`
    shape, then assert the seeder detects `image-or-fallback` for it."""
    src = rrs.BLOCKS_DIR / "buybox" / GALLERY_COL
    assert src.exists(), f"fixture source missing: {src}"
    text = src.read_text(encoding="utf-8")
    assert "if ( '' !== $buybox_img_src ) :" in text
    assert "<img" in text and "<svg" in text and "<?php else :" in text

    rows, warnings = mod.detect_singletons("sgs/buybox")
    assert not warnings, warnings
    gallery_roles = [r for row in rows if row["source_file"] == GALLERY_COL
                      for r, _o in row["roles"]]
    assert mod._rrs.ROLE_IMAGE in gallery_roles, gallery_roles
    print(f"  PASS  buybox-main-image: {gallery_roles}")


# ---------------------------------------------------------------- disjointness

def test_singleton_spans_never_overlap_sibling_claimed_spans() -> None:
    """The single most important correctness property here: for `sgs/buybox`, the
    byte OFFSETS `block_render_singletons` seeds (real offsets `derive_roles()`
    returns, not just role-name spot-checking) must never fall inside a span
    `block_render_repeaters`/`block_render_composition` already claimed for the same
    block+file — a silent overlap would double-count the same markup as both
    'repeated' and 'static'."""
    sources = rrs.resolve_sources("sgs/buybox")
    assert sources, "fixture vacuous — sgs/buybox has no resolvable sources"
    sources_by_file = dict(sources)

    spans_by_file: dict[str, list[tuple[int, int]]] = {}
    _repeaters, rep_warnings = rrs.detect_repeaters(
        "sgs/buybox", sources=sources, spans_out=spans_by_file)
    comp_rows, comp_warnings = mod._comp.detect_composition("sgs/buybox", sources=sources)
    assert not rep_warnings and not comp_warnings, (rep_warnings, comp_warnings)
    assert spans_by_file.get(GALLERY_COL), "fixture vacuous — no foreach span claimed"

    singleton_rows, singleton_warnings = mod.detect_singletons("sgs/buybox", sources=sources)
    assert not singleton_warnings, singleton_warnings
    assert singleton_rows, "fixture vacuous — nothing seeded to check for overlap"

    checked = 0
    for row in singleton_rows:
        fname = row["source_file"]
        text = sources_by_file[fname]
        claimed = list(spans_by_file.get(fname, [])) + mod._render_block_call_spans(text)
        for role, offset in row["roles"]:
            checked += 1
            overlap = [(s, e) for s, e in claimed if s <= offset < e]
            assert not overlap, (
                f"{fname}: {role}#{offset} overlaps sibling-claimed span(s) {overlap}")
    assert checked > 0
    print(f"  PASS  disjointness: {checked} singleton role offset(s), 0 overlaps "
          f"with sibling-claimed spans")

    # ------------------------------------------------- cross-check vs the REAL
    # detect_composition() offsets (not this module's own recomputed spans).
    # The check above compares the seeder's output against `claimed`, which is
    # itself built from this module's OWN `_render_block_call_spans()` helper —
    # true by construction, proves nothing about the two detectors genuinely
    # agreeing. `detect_composition()` scans `_code_view` (string literals kept);
    # `_render_block_call_spans()` scans `mask_php()`'s view (string literals
    # blanked) — these CAN diverge in principle. Assert the REAL detector's own
    # offsets are covered by the same `claimed` spans this module used to blank
    # its remainder — i.e. an independent source confirms the exclusion, not
    # just the module's own recomputation of it.
    assert comp_rows, "fixture vacuous — detect_composition() found no real calls"
    checked_comp = 0
    for r in comp_rows:
        fname = r["source_file"]
        offset = r["offset"]
        text = sources_by_file[fname]
        claimed = list(spans_by_file.get(fname, [])) + mod._render_block_call_spans(text)
        covered = [(s, e) for s, e in claimed if s <= offset < e]
        assert covered, (
            f"{fname}: detect_composition()'s real render_block() offset "
            f"{offset} is NOT covered by any claimed span — the two "
            f"detectors have genuinely diverged and singleton seeding could "
            f"wrongly treat this call as static markup")
        checked_comp += 1
    assert checked_comp > 0
    print(f"  PASS  disjointness (real detect_composition() cross-check): "
          f"{checked_comp} real composition offset(s), all covered by claimed spans")

    # ------------------------------------------------------- negative control
    # Prove the blanking step is load-bearing, not a coincidence of the fixture:
    # running derive_roles() WITHOUT blanking claimed spans first must produce
    # at least one role offset that DOES fall inside a claimed span — otherwise
    # this whole disjointness test would pass even against an implementation
    # that forgot to blank anything at all.
    raw_overlap_count = 0
    for fname, text in sources:
        view = rrs.markup_view(text)
        claimed = list(spans_by_file.get(fname, [])) + mod._render_block_call_spans(text)
        raw_roles = rrs.derive_roles(view, text, loop_vars=())
        for role, offset in raw_roles:
            if any(s <= offset < e for s, e in claimed):
                raw_overlap_count += 1
                print(f"  (negative control) {fname}: unblanked {role}#{offset} "
                      f"overlaps a claimed span, as expected")
    assert raw_overlap_count > 0, (
        "negative control is vacuous — unblanked derive_roles() produced NO "
        "overlap with claimed spans, so this disjointness test cannot "
        "distinguish a correct implementation from one that forgot to blank")
    print(f"  PASS  negative-control: blanking is load-bearing — "
          f"{raw_overlap_count} unblanked role offset(s) genuinely overlap "
          f"claimed spans")


# ---------------------------------------------------------------- negative control

def test_negative_control_container_seeds_zero_rows() -> None:
    """`sgs/container`'s render.php has no static-role signal outside any loop or
    composition call — measured live, not assumed. A discriminating control: it is
    NOT vacuous merely because the block has no foreach (that would make it a free
    pass); it genuinely has other PHP structure and simply carries no action-trigger/
    image-or-fallback/current-state-indicator/label signal in its static remainder."""
    rows, warnings = mod.detect_singletons("sgs/container")
    assert not warnings, warnings
    assert rows == [], rows

    conn = _tmp_conn()
    counts = mod.seed_render_singletons(conn, slugs=["sgs/container"])
    db_rows = conn.execute("SELECT COUNT(*) FROM block_render_singletons").fetchone()[0]
    conn.close()
    assert db_rows == 0 and counts["rows"] == 0, counts
    print("  PASS  negative-control: sgs/container seeds 0 singleton rows")


# ---------------------------------------------------------------- staleness

def test_source_mutation_changes_sha_and_warns(capture: list[str]) -> None:
    """Same `source_sha` discipline as both sibling tables. Mutate the REAL
    `gallery-col.php` main-image `<img>` tag (breaking `image-or-fallback` for that
    file) and assert the seeder announces a reseed rather than going stale."""
    real = rrs.resolve_sources("sgs/buybox")
    old = '<img\n\t\tclass="<?php echo esc_attr( $buybox_main_img_classes )'
    new = '<imgx\n\t\tclass="<?php echo esc_attr( $buybox_main_img_classes )'
    mutated = [(f, t.replace(old, new) if f == GALLERY_COL else t) for f, t in real]
    assert mutated != real, "mutation did not take — the fixture is not being used"

    # Positive control for the mutation's semantic effect: it genuinely removes the
    # image-or-fallback signal for gallery-col.php (not just a sha-only no-op edit).
    pre_rows, pre_warnings = mod.detect_singletons("sgs/buybox", sources=mutated)
    assert not pre_warnings, pre_warnings
    assert not any(r["source_file"] == GALLERY_COL for r in pre_rows), pre_rows

    conn = _tmp_conn()
    mod.seed_render_singletons(conn, slugs=["sgs/buybox"])
    original_sha = conn.execute(
        "SELECT DISTINCT source_sha FROM block_render_singletons WHERE block_slug='sgs/buybox'"
    ).fetchone()[0]

    new_sha = "e" * 64
    capture.clear()
    mod.seed_render_singletons(
        conn,
        slugs=["sgs/buybox"],
        detector=lambda slug, _s=mutated: mod.detect_singletons(slug, sources=_s),
        sha_fn=lambda _slug: new_sha,
    )
    stored_sha = conn.execute(
        "SELECT DISTINCT source_sha FROM block_render_singletons WHERE block_slug='sgs/buybox'"
    ).fetchone()[0]
    remaining = conn.execute(
        "SELECT source_file FROM block_render_singletons WHERE block_slug='sgs/buybox'"
    ).fetchall()
    conn.close()

    assert stored_sha == new_sha != original_sha, (stored_sha, original_sha)
    assert any("source_sha changed" in line for line in capture), capture
    assert not any(r[0] == GALLERY_COL for r in remaining), remaining
    print("  PASS  staleness: sha change reseeded and WARNed, gallery-col.php's "
          "image-or-fallback row correctly dropped")


# ---------------------------------------------------------------- read-only survey

def test_survey_does_not_mutate_the_database() -> None:
    """A dry run must not even create the table."""
    conn = _tmp_conn()
    mod.seed_render_singletons(conn, slugs=["sgs/buybox"], dry_run=True)
    exists = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE name='block_render_singletons'").fetchone()
    conn.close()
    assert exists is None, "dry run created the table"
    print("  PASS  survey-is-read-only")


# ---------------------------------------------------------------- fail-loud

def test_block_flagged_by_sibling_detector_is_also_skipped_here() -> None:
    """Mirrors `render_repeater_seeder.py::test_unparseable_foreach_is_flagged_not_
    silently_absent`. A block already flagged by `detect_repeaters()` (an unparseable
    `foreach`) must be skipped for singleton seeding too, with a WARN — never guessed
    at from a block whose repeater boundaries are already known-unreliable."""
    real = rrs.resolve_sources("sgs/buybox")
    broken = [(f, t.replace("endforeach;", "") if f == GALLERY_COL else t) for f, t in real]
    assert broken != real, "control is vacuous — nothing was broken"

    _reps, rep_warnings = rrs.detect_repeaters("sgs/buybox", sources=broken)
    assert any("endforeach" in w for w in rep_warnings), rep_warnings

    rows, warnings = mod.detect_singletons("sgs/buybox", sources=broken)
    assert rows == [] and any("endforeach" in w for w in warnings), (rows, warnings)

    conn = _tmp_conn()
    counts = mod.seed_render_singletons(
        conn, slugs=["sgs/buybox"],
        detector=lambda slug, _s=broken: mod.detect_singletons(slug, sources=_s))
    db_rows = conn.execute("SELECT COUNT(*) FROM block_render_singletons").fetchone()[0]
    conn.close()
    assert counts["flagged"] >= 1 and db_rows == 0, (counts, db_rows)
    print(f"  PASS  fail-loud: a sibling detector's own WARN also skips singleton "
          f"seeding (flagged={counts['flagged']}, seeded 0)")


def test_composition_warning_also_skips_singleton_seeding() -> None:
    """Same fail-loud contract, from the OTHER sibling: a `render_block()` call with
    a non-literal `blockName` (unparseable to `detect_composition()`) must also skip
    singleton seeding for that block, not just repeater warnings."""
    real = rrs.resolve_sources("sgs/buybox")
    mutated = [
        (f, t.replace(
            "'blockName' => 'sgs/option-picker',",
            "'blockName' => $some_dynamic_var,",
        ) if f == "render.php" else t)
        for f, t in real
    ]
    assert mutated != real, "mutation did not take — the fixture is not being used"

    _rows, comp_warnings = mod._comp.detect_composition("sgs/buybox", sources=mutated)
    assert comp_warnings, "control is vacuous — the mutation did not trigger a WARN"

    rows, warnings = mod.detect_singletons("sgs/buybox", sources=mutated)
    assert rows == [] and warnings, (rows, warnings)
    print("  PASS  fail-loud: a composition-side WARN also skips singleton seeding")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # cp1252 consoles mangle § and —
    print("Spec 31 §13.10 — block_render_singletons seeder")
    captured: list[str] = []
    real_print = print

    import builtins
    def _tee(*args, **kwargs):  # noqa: ANN202 — capture the seeder's own WARN lines
        captured.append(" ".join(str(a) for a in args))
        real_print(*args, **kwargs)

    test_buybox_main_image_has_a_real_if_else_image_shape()
    test_singleton_spans_never_overlap_sibling_claimed_spans()
    test_negative_control_container_seeds_zero_rows()
    builtins.print = _tee
    try:
        test_source_mutation_changes_sha_and_warns(captured)
    finally:
        builtins.print = real_print
    test_survey_does_not_mutate_the_database()
    test_block_flagged_by_sibling_detector_is_also_skipped_here()
    test_composition_warning_also_skips_singleton_seeding()

    for path in _TEMP_DBS:
        try:
            os.unlink(path)
        except OSError:
            pass
    print("\nBLOCK-RENDER-SINGLETONS: PASS (positive control + disjointness + "
          "negative control + staleness + read-only survey + fail-loud x2)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
