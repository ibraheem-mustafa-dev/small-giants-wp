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

    So the real detector is ``dbschema/check_value_identity.py``, which runs as a
    separate process importing sqlite3 only, never db_lookup, and therefore
    observes the true stored state. What IS testable here is that the detector
    works — so that is what this asserts, against a synthetic database.
    """
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "_value_identity",
        Path(db_lookup.__file__).resolve().parents[2] / "dbschema" / "check_value_identity.py",
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


# ---------------------------------------------------------------------------
# 2026-09-02 widening: Tablet tier + video/svg media kinds.
#
# ⚠ No real draft markup exists anywhere in this repo for a hero split-media
# `--tablet` modifier, a <video> inside the split-media slot, or an inline
# <svg> inside it (grepped sites/**/mockups/**/*.html and converter/tests/ —
# zero hits for `--tablet` on any split-image/split-media class, zero hits
# for <video>/<svg> under a sgs-hero__split-* wrapper). These fixtures are
# therefore SYNTHETIC, following the same two-class BEM shape the real
# canary markup uses for mobile/desktop, not lifted from a real draft. This
# is disclosed rather than silently assumed — see the dispatch report.
# ---------------------------------------------------------------------------

@requires_db
def test_tablet_image_routes_to_the_tablet_attr_alongside_mobile_and_desktop():
    """Three-way tier resolution: --tablet must land on splitImageTablet,
    distinct from both the base (desktop) and Mobile attrs."""
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <img class="sgs-hero__split-image sgs-hero__split-image--mobile"'
        '         src="/hero-mob.jpg" alt="Mobile crop">'
        '    <img class="sgs-hero__split-image sgs-hero__split-image--tablet"'
        '         src="/hero-tab.jpg" alt="Tablet crop">'
        '    <img class="sgs-hero__split-image sgs-hero__split-image--desktop"'
        '         src="/hero-desk.webp" alt="Desktop crop">'
        '  </div>'
        '</section>'
    )
    lifts = _walk(markup)["lifts"]
    assert lifts.get("splitImage") == "/hero-desk.webp", f"got {lifts}"
    assert lifts.get("splitImageTablet") == "/hero-tab.jpg", (
        f"tablet image did not reach splitImageTablet; got "
        f"{lifts.get('splitImageTablet')!r}. Full lifts: {lifts}"
    )
    assert lifts.get("splitImageMobile") == "/hero-mob.jpg", f"got {lifts}"


@requires_db
def test_tablet_image_expands_to_id_url_alt_tablet_trio():
    """The Tablet emit_as expansion must write splitImageIdTablet/UrlTablet/
    AltTablet — not the (dead) composite splitImageTablet object attr."""
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <img class="sgs-hero__split-image sgs-hero__split-image--tablet"'
        '         src="/hero-tab.jpg" alt="Tablet crop">'
        '  </div>'
        '</section>'
    )
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}
    # Branch A still emits the composite attr name as the ScalarLift key —
    # the id/url/alt EXPANSION happens one layer up in assembly.py, not here.
    assert lifts.get("splitImageTablet") == {
        "url": "/hero-tab.jpg", "id": 0, "alt": "Tablet crop",
    }, f"got {lifts}"


@requires_db
def test_video_in_split_media_routes_to_split_video_id_url():
    """A <video> in the scalar-media column must route to splitVideo*, not
    be silently dropped or misrouted onto the image family."""
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <video class="sgs-hero__split-image sgs-hero__split-image--desktop"'
        '           src="/hero-desk.mp4"></video>'
        '  </div>'
        '</section>'
    )
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}
    assert lifts.get("splitVideo") == {"url": "/hero-desk.mp4", "id": 0}, f"got {lifts}"
    assert "splitImage" not in lifts, (
        f"a <video> must not be routed onto the image family; got {lifts}"
    )


@requires_db
def test_video_falls_back_to_source_child_when_no_src_attr():
    """HTML5 <video><source src></video> is a legal alternative to
    <video src>; the lift must not silently drop this shape."""
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <video class="sgs-hero__split-image sgs-hero__split-image--mobile">'
        '      <source src="/hero-mob.mp4" type="video/mp4">'
        '    </video>'
        '  </div>'
        '</section>'
    )
    out = _walk(markup)
    assert out["lifts"].get("splitVideoMobile") == "/hero-mob.mp4", f"got {out}"


@requires_db
def test_svg_in_split_media_routes_to_split_svg_content_directly():
    """An inline <svg> writes directly to splitSvgContent* as a raw string —
    no id/url/alt decomposition (it IS the real block.json attr name)."""
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <svg class="sgs-hero__split-image sgs-hero__split-image--desktop"'
        '         viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
        '  </div>'
        '</section>'
    )
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}
    assert "splitSvgContent" in lifts, f"got {lifts}"
    assert lifts["splitSvgContent"].startswith("<svg"), f"got {lifts['splitSvgContent']!r}"
    assert "circle" in lifts["splitSvgContent"]
    assert isinstance(lifts["splitSvgContent"], str), (
        "svg lift must be a raw string, never a dict — it needs no emit_as expansion"
    )


@requires_db
def test_video_lift_also_writes_matching_split_media_type():
    """Bug fix (2026-09-02, Wave 7b): a video lift must ALSO set the tier's
    splitMediaType, not just its content.

    Pre-fix behaviour (provable from the extraction.py diff, not re-run here
    since the buggy code path no longer exists to execute): the video branch
    emitted ONLY a ScalarLift(attr='splitVideo', value={url,id}) — nothing
    ever wrote splitMediaType. block.json's schema default for that attr is
    'image', so WordPress would silently coerce the unset tier back to
    'image' at render time, and $sgs_hero_resolve_split_type()'s STRICT
    'image' branch (hero/render.php ~1253) requires a non-empty image url —
    which a video-only tier never has — so the tier resolved to '' and the
    video never displayed despite being correctly stored. This test asserts
    BOTH halves so a regression on either one is caught: content presence
    (already covered by test_video_in_split_media_routes_to_split_video_id_url)
    AND the matching type write, which is the half that was missing.
    """
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <video class="sgs-hero__split-image sgs-hero__split-image--desktop"'
        '           src="/hero-desk.mp4"></video>'
        '  </div>'
        '</section>'
    )
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}
    assert lifts.get("splitVideo") == {"url": "/hero-desk.mp4", "id": 0}, f"got {lifts}"
    assert lifts.get("splitMediaType") == "video", (
        f"the video's TYPE was not written alongside its content — a schema-default "
        f"'image' would silently win at render time; got {lifts}"
    )


@requires_db
def test_video_tablet_and_mobile_tiers_each_get_their_own_matching_type():
    """The type write is per-tier, not just desktop — a Tablet video must set
    splitMediaTypeTablet, and a Mobile video splitMediaTypeMobile, without
    disturbing each other's or the (unset) desktop tier's type."""
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <video class="sgs-hero__split-image sgs-hero__split-image--tablet"'
        '           src="/hero-tab.mp4"></video>'
        '    <video class="sgs-hero__split-image sgs-hero__split-image--mobile"'
        '           src="/hero-mob.mp4"></video>'
        '  </div>'
        '</section>'
    )
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}
    assert lifts.get("splitVideoTablet") == {"url": "/hero-tab.mp4", "id": 0}, f"got {lifts}"
    assert lifts.get("splitVideoMobile") == {"url": "/hero-mob.mp4", "id": 0}, f"got {lifts}"
    assert lifts.get("splitMediaTypeTablet") == "video", f"got {lifts}"
    assert lifts.get("splitMediaTypeMobile") == "video", f"got {lifts}"
    assert "splitMediaType" not in lifts, (
        f"desktop tier has no video of its own — its type must not be written; got {lifts}"
    )


@requires_db
def test_svg_lift_also_writes_matching_split_media_type():
    """Bug fix (2026-09-02, Wave 7b): the same defect and the same fix,
    for the inline-SVG media kind. The content stays a raw string
    (test_svg_in_split_media_routes_to_split_svg_content_directly pins that
    shape) — the type write is a SEPARATE plain-string ScalarLift, not folded
    into the content one."""
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <svg class="sgs-hero__split-image sgs-hero__split-image--desktop"'
        '         viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
        '  </div>'
        '</section>'
    )
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}
    assert isinstance(lifts.get("splitSvgContent"), str) and lifts["splitSvgContent"].startswith("<svg"), (
        f"got {lifts}"
    )
    assert lifts.get("splitMediaType") == "svg", (
        f"the svg's TYPE was not written alongside its content; got {lifts}"
    )


@requires_db
def test_image_lift_does_not_write_split_media_type():
    """Negative control for the type-write fix: the IMAGE branch is
    deliberately UNCHANGED (guardrail — 'image' is already block.json's
    schema default, so an image tier resolves correctly with no explicit
    write). If a future change starts writing splitMediaType='image' too, it
    is not wrong, but this test documents that today it does not, so an
    accidental removal of the type-write mechanism from the video/svg
    branches cannot hide behind "image never needed it anyway"."""
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <img class="sgs-hero__split-image sgs-hero__split-image--desktop"'
        '         src="/hero-desk.webp" alt="Desktop crop">'
        '  </div>'
        '</section>'
    )
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}
    assert lifts.get("splitImage", {}).get("url") == "/hero-desk.webp", f"got {lifts}"
    assert "splitMediaType" not in lifts, (
        f"image branch must not write a type — WP's own schema default ('image') "
        f"already resolves it correctly; got {lifts}"
    )


@requires_db
def test_svg_tablet_lift_writes_content_and_matching_split_media_type():
    """Tablet-tier sibling of test_svg_lift_also_writes_matching_split_media_type.

    Closes a real test-coverage gap flagged by an independent QC-council review
    of commit 2cc9cbc56 (2026-09-02): only the DESKTOP svg tier had a test
    proving splitSvgContentTablet + splitMediaTypeTablet both land. The code
    trace was judged correct by that review; this test proves it rather than
    assuming it."""
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <svg class="sgs-hero__split-image sgs-hero__split-image--tablet"'
        '         viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
        '  </div>'
        '</section>'
    )
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}
    assert isinstance(lifts.get("splitSvgContentTablet"), str) and lifts["splitSvgContentTablet"].startswith("<svg"), (
        f"got {lifts}"
    )
    assert lifts.get("splitMediaTypeTablet") == "svg", (
        f"the tablet svg's TYPE was not written alongside its content; got {lifts}"
    )


@requires_db
def test_svg_mobile_lift_writes_content_and_matching_split_media_type():
    """Mobile-tier sibling of test_svg_lift_also_writes_matching_split_media_type.

    Same coverage gap as the tablet test above, for the Mobile tier."""
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <svg class="sgs-hero__split-image sgs-hero__split-image--mobile"'
        '         viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
        '  </div>'
        '</section>'
    )
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}
    assert isinstance(lifts.get("splitSvgContentMobile"), str) and lifts["splitSvgContentMobile"].startswith("<svg"), (
        f"got {lifts}"
    )
    assert lifts.get("splitMediaTypeMobile") == "svg", (
        f"the mobile svg's TYPE was not written alongside its content; got {lifts}"
    )


@requires_db
def test_image_lift_does_not_write_split_media_type_tablet():
    """Negative control for the type-write fix, TABLET tier.

    test_image_lift_does_not_write_split_media_type only pins the desktop
    tier, whose schema default is 'image'. Tablet's schema default is ''
    (empty string, the inherit/cascade branch in render.php's
    $sgs_hero_resolve_split_type resolver) — a genuinely different default
    value and a genuinely different resolver branch, so this is not a
    copy-paste of the desktop test."""
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <img class="sgs-hero__split-image sgs-hero__split-image--tablet"'
        '         src="/hero-tab.jpg" alt="Tablet crop">'
        '  </div>'
        '</section>'
    )
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}
    assert lifts.get("splitImageTablet", {}).get("url") == "/hero-tab.jpg", f"got {lifts}"
    assert "splitMediaTypeTablet" not in lifts, (
        f"image branch must not write a tablet type — the tablet resolver's own "
        f"empty-string inherit/cascade branch already resolves it correctly; got {lifts}"
    )


@requires_db
def test_image_lift_does_not_write_split_media_type_mobile():
    """Negative control for the type-write fix, MOBILE tier — the sibling of
    the tablet test above, same reasoning applied to Mobile's own resolver
    branch."""
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <img class="sgs-hero__split-image sgs-hero__split-image--mobile"'
        '         src="/hero-mob.jpg" alt="Mobile crop">'
        '  </div>'
        '</section>'
    )
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}
    assert lifts.get("splitImageMobile", {}).get("url") == "/hero-mob.jpg", f"got {lifts}"
    assert "splitMediaTypeMobile" not in lifts, (
        f"image branch must not write a mobile type — the mobile resolver's own "
        f"empty-string inherit/cascade branch already resolves it correctly; got {lifts}"
    )


@requires_db
def test_mixed_media_types_across_tiers_resolve_independently_no_cross_contamination():
    """The mixed-type scenario the qc-council rater flagged as traced-but-
    unverified: desktop=video, tablet=svg, mobile=image in ONE hero instance.
    Each tier must resolve to its own content + type attrs with no bleed
    between tiers or media families."""
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <video class="sgs-hero__split-image sgs-hero__split-image--desktop"'
        '           src="/hero-desk.mp4"></video>'
        '    <svg class="sgs-hero__split-image sgs-hero__split-image--tablet"'
        '         viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
        '    <img class="sgs-hero__split-image sgs-hero__split-image--mobile"'
        '         src="/hero-mob.jpg" alt="Mobile crop">'
        '  </div>'
        '</section>'
    )
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    lifts = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    # Desktop: video content + matching type.
    assert lifts.get("splitVideo") == {"url": "/hero-desk.mp4", "id": 0}, f"got {lifts}"
    assert lifts.get("splitMediaType") == "video", f"got {lifts}"

    # Tablet: svg content + matching type.
    assert isinstance(lifts.get("splitSvgContentTablet"), str) and lifts["splitSvgContentTablet"].startswith("<svg"), (
        f"got {lifts}"
    )
    assert lifts.get("splitMediaTypeTablet") == "svg", f"got {lifts}"

    # Mobile: image content, no type write (image is the default, no explicit type needed).
    assert lifts.get("splitImageMobile", {}).get("url") == "/hero-mob.jpg", f"got {lifts}"
    assert "splitMediaTypeMobile" not in lifts, f"got {lifts}"

    # No cross-contamination: each tier's OWN family attrs only, nothing else leaked.
    assert "splitImage" not in lifts, f"desktop is video, not image; got {lifts}"
    assert "splitVideoTablet" not in lifts, f"tablet is svg, not video; got {lifts}"
    assert "splitSvgContentMobile" not in lifts, f"mobile is image, not svg; got {lifts}"
    assert "splitVideoMobile" not in lifts, f"mobile is image, not video; got {lifts}"
    assert "splitImageTablet" not in lifts, f"tablet is svg, not image; got {lifts}"
    assert "splitSvgContent" not in lifts, f"desktop is video, not svg; got {lifts}"


@requires_db
def test_negative_control_plain_div_is_not_mistaken_for_media():
    """A scalar-media column with NO <img>/<video>/<svg> descendant must
    still emit a ContentGap, never a silent drop or a false media lift.

    Negative control for the whole media_els widening: proves find_all
    correctly returns empty rather than matching something it shouldn't.
    """
    markup = (
        '<section class="sgs-hero sgs-hero--split">'
        '  <div class="sgs-hero__split-image">'
        '    <p>not media</p>'
        '  </div>'
        '</section>'
    )
    rec = Recognition(
        kind="named", slug="sgs/hero", container_kind="section", delegates_content=1
    )
    root = BeautifulSoup(markup, "html.parser").find("section")
    results = W.run_universal_content_walk(rec, root, {}, {})
    lifts = [r for r in results if isinstance(r, ScalarLift)]
    from converter.context import ContentGap
    gaps = [r for r in results if isinstance(r, ContentGap)]
    assert lifts == [], f"expected no ScalarLift from a non-media column, got {lifts}"
    assert any("no <img>/<video>/<svg>" in g.detail for g in gaps), (
        f"expected a ContentGap naming the missing media descendant; got {gaps}"
    )
