"""Self-test for classless_draft_adapter.py — Spec 44's DRAFT-side input derivation.

FIXTURE DISCIPLINE, inherited from Tasks 1-3: the draft side is the REAL
`Eye Care Birmingham.dc.html`, located by its own `<sc-for list="{{ thumbs }}">`
rather than by a line number that rots; the block side is Task 1's real seeder run
against real block PHP into a TEMP DB, with reference rows copied from the live DB
through a read-only handle. Nothing here is invented and the live DB is never written.

The load-bearing assertion is `test_adapter_reproduces_task_2s_hand_derived_roles`:
Task 2 derived this group's markers BY HAND and asserted them against the same file.
If a mechanical derivation and an independent hand derivation agree, the adapter is
measured rather than fitted. Its companion negative control
(`test_seeder_derive_roles_cannot_do_this_job`) proves the adapter had to exist —
reusing `render_repeater_seeder.derive_roles` on the same draft item returns a
SHORTER sequence, which Stage A would have read as a different item shape.
"""
from __future__ import annotations

import os
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from bs4 import BeautifulSoup  # noqa: E402

import classless_draft_adapter as mod  # noqa: E402
import render_repeater_recogniser as stage_a  # noqa: E402
import render_repeater_seeder as seeder  # noqa: E402

LIVE_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


def _live_repeater_row_count() -> int:
    con = sqlite3.connect(f"file:{LIVE_DB}?mode=ro", uri=True)
    try:
        return con.execute("SELECT COUNT(*) FROM block_render_repeaters").fetchone()[0]
    finally:
        con.close()


# Snapshotted at import time (before any fixture in this module writes anything) so the
# invariant below is "this run didn't change the count", not a hardcoded 0 — D1089 wired
# the real seeder into /sgs-update, so 0 stopped being the correct live value.
_LIVE_ROWS_BEFORE_THIS_RUN = _live_repeater_row_count()

REPO = Path(__file__).resolve().parents[4]
DRAFT = (REPO / "sites" / "eye-care-ward-end" / "design_handoff_ward_end_eye_care"
         / "Eye Care Birmingham.dc.html")

# Task 2's own hand-derived answer for this group, quoted from its report:
#   onClick="{{ t.pick }}" -> action-trigger; aria-label="{{ t.label }}" -> label;
#   {{ t.hasImg }}/{{ t.noImg }} -> image-or-fallback.
TASK_2_HAND_DERIVED = (seeder.ROLE_ACTION, seeder.ROLE_LABEL, seeder.ROLE_IMAGE)

_TEMP_DBS: list[str] = []


def _soup() -> BeautifulSoup:
    assert DRAFT.exists(), f"real draft missing at {DRAFT}"
    return BeautifulSoup(DRAFT.read_text(encoding="utf-8"), "html.parser")


def _thumbs_holder(soup: BeautifulSoup):
    """The real `<sc-for list="{{ thumbs }}">`'s PARENT — the boundary-shaped element."""
    for sc_for in soup.find_all("sc-for"):
        if (sc_for.get("list") or "").strip() == "{{ thumbs }}":
            return sc_for.parent
    raise AssertionError("no <sc-for list='{{ thumbs }}'> in the real draft")


def _fixture_db() -> sqlite3.Connection:
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    _TEMP_DBS.append(path)
    conn = sqlite3.connect(path)
    live = sqlite3.connect(f"file:{LIVE_DB}?mode=ro", uri=True)
    try:
        for table in ("blocks", "block_attributes", "block_composition"):
            ddl = live.execute(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table,)
            ).fetchone()[0]
            conn.execute(ddl)
            rows = live.execute(f"SELECT * FROM {table}").fetchall()
            if rows:
                conn.executemany(
                    f"INSERT INTO {table} VALUES ({','.join('?' * len(rows[0]))})", rows)
    finally:
        live.close()
    seeder.seed_render_repeaters(conn, slugs=["sgs/buybox", "sgs/product-card"])
    return conn


# ---------------------------------------------------------------- ground truth

def test_the_real_draft_is_present() -> None:
    holder = _thumbs_holder(_soup())
    assert holder is not None
    print("  PASS  provenance: <sc-for list='{{ thumbs }}'> found in the real draft")


def test_representative_item_prefers_the_drafts_own_sc_for() -> None:
    item = mod.representative_item(_thumbs_holder(_soup()))
    assert item is not None and item.name == "button", item
    assert "{{ t.pick }}" in str(item.get("onClick") or item.get("onclick") or "")
    print("  PASS  representative: the sc-for's own first child <button>, not a "
          "similarity guess")


def test_a_group_with_no_repetition_yields_no_item() -> None:
    """Negative control: the adapter must not manufacture a group out of a one-off."""
    soup = BeautifulSoup("<div><p>one</p></div>", "html.parser")
    assert mod.representative_item(soup.div) is None
    print("  PASS  negative control: a non-repeated element yields no representative")


# ---------------------------------------------------------------- Stage A input

def test_adapter_reproduces_task_2s_hand_derived_roles() -> None:
    item = mod.representative_item(_thumbs_holder(_soup()))
    pairs = mod.derive_draft_roles(item)
    roles = tuple(r for r, _k in pairs)
    assert roles == TASK_2_HAND_DERIVED, roles
    assert [k for _r, k in pairs] == ["pick", "label", "hasImg"], pairs
    print(f"  PASS  §3.1: mechanical derivation == Task 2's hand derivation {roles}, "
          "each marker naming its own draft key")


def test_seeder_derive_roles_cannot_do_this_job() -> None:
    """Why the adapter exists, measured rather than argued.

    `render_repeater_seeder.derive_roles` reads `<img>`/`sgs_render_media` and PHP
    `else`/`endif`. The draft paints with `background-image:url({{ t.img }})` and
    branches with a second `<sc-if>`, so the image marker cannot fire — a SHORTER
    sequence that Stage A would compare as a genuinely different item shape.
    """
    item = mod.representative_item(_thumbs_holder(_soup()))
    raw = str(item)
    php_view = tuple(r for r, _o in seeder.derive_roles(raw, raw, ("$t",)))
    assert php_view != TASK_2_HAND_DERIVED, php_view
    assert seeder.ROLE_IMAGE not in php_view, php_view
    print(f"  PASS  negative control: the PHP-side deriver returns {php_view} on this "
          "draft item — the image marker is unreachable, so reuse would understate it")


def test_a_field_rendered_twice_contributes_one_marker() -> None:
    """`{{ t.label }}` is both the aria-label and the no-image text fallback."""
    item = mod.representative_item(_thumbs_holder(_soup()))
    assert str(item).count("{{ t.label }}") >= 2, "fixture premise changed"
    labels = [k for r, k in mod.derive_draft_roles(item) if r == seeder.ROLE_LABEL]
    assert labels == ["label"], labels
    print("  PASS  dedupe: one field rendered twice is ONE marker, matching how the "
          "seeder counts the block side")


def test_a_hardcoded_aria_state_is_not_a_per_item_indicator() -> None:
    """Negative control on the current-state signal: chrome must not read as state."""
    bound = BeautifulSoup(
        '<div><a aria-current="{{ t.on }}">x</a><a aria-current="{{ t.on }}">y</a>'
        '<a aria-current="{{ t.on }}">z</a></div>', "html.parser")
    fixed = BeautifulSoup(
        '<div><a aria-current="page">x</a><a aria-current="page">y</a>'
        '<a aria-current="page">z</a></div>', "html.parser")
    got_bound = [r for r, _k in mod.derive_draft_roles(
        mod.representative_item(bound.div))]
    got_fixed = [r for r, _k in mod.derive_draft_roles(
        mod.representative_item(fixed.div))]
    assert seeder.ROLE_CURRENT in got_bound, got_bound
    assert seeder.ROLE_CURRENT not in got_fixed, got_fixed
    print("  PASS  §3.1: a BOUND aria-current is a state marker; a hardcoded one is not")


def test_step_0_capabilities_are_empty_and_say_so() -> None:
    """The disclosed limit, asserted so it cannot quietly become a fake signal."""
    holder = _thumbs_holder(_soup())
    group = mod.build_stage_a_group(holder, mod.representative_item(holder), [])
    assert group.parent.required_capabilities == frozenset(), group.parent
    assert group.parent.repetition in (stage_a.SINGLETON, stage_a.REPEATED)
    print("  PASS  step-0(ii): no capability is supplied from draft markup — narrows "
          "nothing, exclusion-only, never faked")


# ---------------------------------------------------------------- Front C Task 4

def test_derive_static_draft_roles_excludes_the_repeated_group() -> None:
    """A boundary with BOTH a static image-or-fallback conditional AND a repeated
    `<sc-for>` group: the static derivation must see only the outside marker, never
    the repeated item's own action/label markers."""
    soup = BeautifulSoup(
        '<div>'
        '<sc-if value="{{ hero.hasImg }}"><img src="{{ hero.img }}"></sc-if>'
        '<sc-if value="{{ hero.noImg }}"><span>no image</span></sc-if>'
        '<sc-for list="{{ items }}" as="it">'
        '<button onClick="{{ it.pick }}" aria-label="{{ it.label }}">x</button>'
        '</sc-for>'
        '</div>', "html.parser")
    static_roles = mod.derive_static_draft_roles(soup.div)
    assert static_roles == ((seeder.ROLE_IMAGE, "hasImg"),), static_roles
    print(f"  PASS  static derivation: {static_roles} — the sc-for's own action-trigger "
          "and label markers are correctly excluded")


def test_derive_static_draft_roles_on_the_real_thumbs_boundary_is_empty() -> None:
    """Real draft, real negative control: the thumbs `<sc-for>`'s own parent holds
    NOTHING besides the sc-for itself, so its static derivation is correctly empty —
    exactly why Front C Task 4's Stage A consumer never fires for this specific
    boundary on this specific draft (confirmed separately by the Task 3 baseline
    re-measurement finding 0 buybox matches on the real Eye Care draft)."""
    holder = _thumbs_holder(_soup())
    assert mod.derive_static_draft_roles(holder) == (), (
        "if this fixture premise changed, the assertion above is the thing to update, "
        "not silently skip")
    print("  PASS  negative control: the real thumbs boundary's own static content is "
          "empty — matches the draft having no static siblings there")


# ---------------------------------------------------------------- Stage B input

def test_stage_b_fields_come_from_the_real_bindings() -> None:
    item = mod.representative_item(_thumbs_holder(_soup()))
    group = mod.build_stage_b_group(item, label="thumbs")
    keys = sorted(f.key for f in group.fields)
    assert keys == ["border", "filter", "img", "label", "pick"], keys
    pick = next(f for f in group.fields if f.key == "pick")
    assert pick.onclick_bound is True, pick
    assert all(f.value is None for f in group.fields), "values are NOT read from markup"
    print(f"  PASS  §5: fields {keys} derived from real bindings; 'pick' carries the "
          "onClick action signal; every value is None (disclosed limit)")


def test_stage_b_values_being_none_is_visible_to_stage_b() -> None:
    """The ceiling, made explicit: with no values, §5.2's shape priorities are inert."""
    import array_schema_eliminator as stage_b
    item = mod.representative_item(_thumbs_holder(_soup()))
    group = mod.build_stage_b_group(item)
    shapes = {stage_b.classify_value_shape(f.value) for f in group.fields}
    assert shapes == {stage_b.SHAPE_TEXT}, shapes
    print("  PASS  disclosed ceiling: every markup-derived value classifies as plain "
          "text, so Stage B discriminates on arity + action alone")


# ---------------------------------------------------------------- end to end

def test_adapter_into_stage_a_is_ambiguous_without_a_capability_signal() -> None:
    """§4.1 end to end, MEASURED — and the headline limit of this whole path.

    Task 2 reached `sgs/buybox` / PARTIAL on this exact group, but only because its
    fixture SUPPLIED `required_capabilities={'add-to-cart'}` by hand. The adapter
    cannot observe that from draft markup (disclosed limit), so Step 0's capability
    signal narrows nothing, and §3.1's documented collision stands: `sgs/buybox` and
    `sgs/product-card` seed a byte-identical thumbnail sequence.

    The correct outcome is therefore AMBIGUOUS — `matched=False`, both candidates
    named, no tie-break — which routes to review under FR-44-1(a). Asserting the
    honest result rather than the spec's prose is the point: a draft-side capability
    detector is the missing piece, and pretending otherwise would hide it.
    """
    holder = _thumbs_holder(_soup())
    group = mod.build_stage_a_group(holder, mod.representative_item(holder), [])
    conn = _fixture_db()
    try:
        result = stage_a.recognise_render_time_repeater(group, "eye-care-ward-end", conn=conn)
        # Positive control: the SAME draft group, with the one capability Task 2
        # supplied by hand, does reach the spec's worked example. Without this the
        # assertion above would pass equally against an adapter that derived nothing.
        narrowed = stage_a.recognise_render_time_repeater(
            stage_a.DraftGroup(
                roles=group.roles,
                parent=stage_a.ParentContext(
                    repetition=group.parent.repetition,
                    required_capabilities=frozenset({"add-to-cart"})),
            ),
            "eye-care-ward-end", conn=conn)
    finally:
        conn.close()
    assert result.matched is False, result.block_slug
    assert set(result.ambiguous_candidates) == {"sgs/buybox", "sgs/product-card"}, \
        result.ambiguous_candidates
    assert narrowed.matched is True and narrowed.block_slug == "sgs/buybox", narrowed
    assert narrowed.match_quality == stage_a.PARTIAL, narrowed.match_quality
    print("  PASS  §4.1 end-to-end: markup alone is AMBIGUOUS across "
          f"{list(result.ambiguous_candidates)} (routes to review); the same group "
          f"WITH a hand-supplied add-to-cart capability reaches "
          f"{narrowed.block_slug} / {narrowed.match_quality}")


def test_live_db_was_not_written() -> None:
    """Proves isolation (unchanged row count), not emptiness — D1089 wired the real
    seeder into /sgs-update, so the live table legitimately holds real rows now."""
    count = _live_repeater_row_count()
    assert count == _LIVE_ROWS_BEFORE_THIS_RUN, (
        f"live block_render_repeaters had {_LIVE_ROWS_BEFORE_THIS_RUN} rows before this "
        f"run, holds {count} now — this run wrote to it"
    )
    print("  PASS  live DB row count unchanged by this run "
          f"({_LIVE_ROWS_BEFORE_THIS_RUN} rows)")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print("Spec 44 — classless DRAFT-side adapter (Stage A + Stage B inputs)")
    test_the_real_draft_is_present()
    test_representative_item_prefers_the_drafts_own_sc_for()
    test_a_group_with_no_repetition_yields_no_item()
    test_adapter_reproduces_task_2s_hand_derived_roles()
    test_seeder_derive_roles_cannot_do_this_job()
    test_a_field_rendered_twice_contributes_one_marker()
    test_a_hardcoded_aria_state_is_not_a_per_item_indicator()
    test_step_0_capabilities_are_empty_and_say_so()
    test_derive_static_draft_roles_excludes_the_repeated_group()
    test_derive_static_draft_roles_on_the_real_thumbs_boundary_is_empty()
    test_stage_b_fields_come_from_the_real_bindings()
    test_stage_b_values_being_none_is_visible_to_stage_b()
    test_adapter_into_stage_a_is_ambiguous_without_a_capability_signal()
    test_live_db_was_not_written()
    for path in _TEMP_DBS:
        try:
            os.unlink(path)
        except OSError:
            pass
    print("\nCLASSLESS DRAFT ADAPTER: PASS (Task 2's hand derivation reproduced "
          "mechanically + the PHP deriver proven insufficient + dedupe + bound-vs-"
          "hardcoded state control + disclosed Stage B ceiling + §4.1 end to end)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
