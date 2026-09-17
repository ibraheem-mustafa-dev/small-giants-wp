"""Self-test for render_repeater_recogniser.py — Spec 44 §3.1/§4.1/§4.3, §10.

FIXTURE DISCIPLINE (the model is `test_render_repeater_seeder.py`): no invented block
shapes and no invented DB. `block_render_repeaters` is EMPTY on the live DB — Task 1's
seeder is deliberately not wired into `/sgs-update` yet — so the fixture DB is built by
running that seeder against the REAL block PHP on disk, into a temp DB, with the
`blocks` / `block_attributes` / `block_composition` rows copied verbatim from the live
DB. Every role sequence and every attribute name under test is therefore measured, and
the live DB is never written.

The draft side is equally real: the `thumbs` group's roles are read off
`sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html`
line 561's `<sc-for list="{{ thumbs }}" as="t">` and asserted against that file, not
transcribed from the spec's prose.
"""
from __future__ import annotations

import importlib.util
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SCRIPTS_DIR = HERE.parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import render_repeater_recogniser as mod  # noqa: E402
import render_repeater_seeder as seeder  # noqa: E402


def _load_hyphenated(name: str, filename: str):
    """Front C Task 4 fixtures need the composition/singleton seeders, both hyphenated
    filenames — same dynamic-load pattern `seed-render-singletons.py` itself uses for
    its own sibling import (see that file's `_load_composition_module`)."""
    path = SCRIPTS_DIR / filename
    spec = importlib.util.spec_from_file_location(name, str(path))
    module = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


_seed_composition = _load_hyphenated("sgs_seed_render_composition", "seed-render-composition.py")
_seed_singletons = _load_hyphenated("sgs_seed_render_singletons", "seed-render-singletons.py")

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

BUYBOX = "sgs/buybox"
PRODUCT_CARD = "sgs/product-card"
PAIR = [BUYBOX, PRODUCT_CARD]
GALLERY_COL = "gallery-col.php"

# The draft's own per-thumbnail item, in document order, in the seeder's role vocabulary:
#   <button onClick="{{ t.pick }}"          -> action-trigger
#           aria-label="{{ t.label }}">     -> label
#     <sc-if t.hasImg> image </sc-if>
#     <sc-if t.noImg>  text  </sc-if>       -> image-or-fallback
# Asserted against the real file by `test_draft_thumbs_group_is_read_from_the_real_draft`.
DRAFT_THUMBS_ROLES = (seeder.ROLE_ACTION, seeder.ROLE_LABEL, seeder.ROLE_IMAGE)

_TEMP_DBS: list[str] = []


def _fixture_db() -> sqlite3.Connection:
    """Temp DB: real reference rows copied from live, repeater rows seeded from real PHP."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    _TEMP_DBS.append(path)
    conn = sqlite3.connect(path)
    # Copied through a READ-ONLY handle rather than ATTACH: the live DB is shared by
    # concurrent sessions, and a read-write attach is a write path waiting to be used.
    live = sqlite3.connect(f"file:{LIVE_DB}?mode=ro", uri=True)
    try:
        for table in ("blocks", "block_attributes", "block_composition"):
            ddl = live.execute(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table,)
            ).fetchone()[0]
            conn.execute(ddl)
            rows = live.execute(f"SELECT * FROM {table}").fetchall()
            if rows:
                placeholders = ",".join("?" * len(rows[0]))
                conn.executemany(f"INSERT INTO {table} VALUES ({placeholders})", rows)
    finally:
        live.close()
    seeder.seed_render_repeaters(conn, slugs=list(PAIR))
    # Front C Task 4: composition + singleton rows, same real-PHP-source discipline,
    # for the pair plus sgs/container (a real negative control — composes nothing).
    composition_slugs = list(PAIR) + ["sgs/container"]
    _seed_composition.seed_render_composition(conn, slugs=composition_slugs)
    _seed_singletons.seed_render_singletons(conn, slugs=composition_slugs)
    return conn


def _parent(repetition: str = mod.UNKNOWN, capabilities: tuple[str, ...] = ()) -> mod.ParentContext:
    return mod.ParentContext(repetition=repetition, required_capabilities=frozenset(capabilities))


# ---------------------------------------------------------------- ground truth

def test_live_db_is_the_real_one() -> None:
    assert LIVE_DB.exists(), f"live DB missing at {LIVE_DB}"
    con = sqlite3.connect(f"file:{LIVE_DB}?mode=ro", uri=True)
    attrs = con.execute("SELECT COUNT(*) FROM block_attributes").fetchone()[0]
    seeded = con.execute("SELECT COUNT(*) FROM block_render_repeaters").fetchone()[0]
    con.close()
    assert attrs > 0, "block_attributes is empty — every narrowing assertion would be vacuous"
    print(f"  PASS  live-db: block_attributes {attrs} rows; "
          f"block_render_repeaters {seeded} rows (0 expected — seeder not wired to /sgs-update)")


def test_draft_thumbs_group_is_read_from_the_real_draft() -> None:
    """The draft fixture is measured off the real Claude Design export, not the spec prose."""
    assert DRAFT.exists(), f"draft missing at {DRAFT}"
    text = DRAFT.read_text(encoding="utf-8", errors="replace")
    assert '<sc-for list="{{ thumbs }}" as="t"' in text
    item = text.split('<sc-for list="{{ thumbs }}" as="t"', 1)[1].split("</sc-for>", 1)[0]
    assert 'onClick="{{ t.pick }}"' in item          # action-trigger
    assert 'aria-label="{{ t.label }}"' in item      # label
    assert '{{ t.hasImg }}' in item and '{{ t.noImg }}' in item  # image-or-fallback
    assert "aria-current" not in item and "aria-selected" not in item, (
        "the draft thumb carries no ARIA current-state marker — its selected state is a "
        "border colour, so the block's current-state-indicator has no draft counterpart")
    print("  PASS  draft: thumbs item = action-trigger + label + image-or-fallback, no ARIA state")


def test_seeded_pair_reproduces_the_documented_collision() -> None:
    """§4.1's premise, measured: both blocks really do seed an identical thumbnail shape."""
    conn = _fixture_db()
    buybox = mod.candidate_role_sequences(conn, BUYBOX)
    card = mod.candidate_role_sequences(conn, PRODUCT_CARD)
    thumb = (seeder.ROLE_ACTION, seeder.ROLE_CURRENT, seeder.ROLE_LABEL)
    assert buybox[GALLERY_COL] == thumb, buybox
    assert thumb == card["render.php"][:3], card
    conn.close()
    print(f"  PASS  collision: {BUYBOX}/{GALLERY_COL} and {PRODUCT_CARD}/render.php both seed {thumb}")


def test_source_file_grouping_is_not_optional() -> None:
    """Task 1's DISCLOSED LIMIT: role_order is one continuous counter across source_files,
    so a consumer reading a block's rows ungrouped compares a shape no item renders."""
    conn = _fixture_db()
    ungrouped = [r[0] for r in conn.execute(
        "SELECT role FROM block_render_repeaters WHERE block_slug = ? ORDER BY role_order",
        (BUYBOX,))]
    grouped = mod.candidate_role_sequences(conn, BUYBOX)
    conn.close()
    assert len(grouped) == 2, grouped
    assert ungrouped != list(grouped[GALLERY_COL])
    assert len(ungrouped) == sum(len(v) for v in grouped.values())
    print(f"  PASS  grouping: merged {tuple(ungrouped)} is no real item; per-file cut gives "
          f"{sorted(grouped)}")


# ---------------------------------------------------------------- Step 0 (§4.3)

def test_capability_narrowing_separates_the_pair_both_ways() -> None:
    """§4.3 Step 0 signal (ii). Discriminates in BOTH directions — a filter that only
    ever excludes one side of a pair is indistinguishable from a hardcoded preference."""
    conn = _fixture_db()
    pdp = mod.narrow_candidates(conn, PAIR, _parent(capabilities=("add-to-cart",)))
    card = mod.narrow_candidates(conn, PAIR, _parent(capabilities=("cta-url",)))
    conn.close()
    assert pdp.survivors == (BUYBOX,), pdp
    assert pdp.capability_conclusive and pdp.sole_survivor
    assert card.survivors == (PRODUCT_CARD,), card
    assert card.capability_conclusive
    print("  PASS  step-0(ii): add-to-cart -> buybox only; cta-url -> product-card only")


def test_capability_narrowing_is_per_attribute_not_per_block() -> None:
    """A block-wide token union would let two unrelated attributes fake a capability."""
    tokens = (frozenset({"add", "ons"}), frozenset({"cart", "padding"}))
    assert not mod.satisfies_capability(tokens, "add-to-cart")
    assert mod.satisfies_capability((frozenset(mod.tokenise("addToCartLabel")),), "add-to-cart")
    assert mod.tokenise("addToCartLabel") == {"add", "to", "cart", "label"}
    print("  PASS  step-0(ii) control: split tokens across two attrs do NOT satisfy a capability")


def test_repetition_filter_is_honest_about_being_inconclusive_here() -> None:
    """Signal (i) is real but has nothing to say about THIS pair — neither block declares a
    `parent_block` nor is a `section-root`. It must narrow NOTHING rather than invent a
    fact; the separation above is signal (ii)'s work, and the report says so."""
    conn = _fixture_db()
    for repetition in (mod.SINGLETON, mod.REPEATED):
        result = mod.narrow_candidates(conn, PAIR, _parent(repetition=repetition))
        assert result.survivors == tuple(PAIR), (repetition, result)
        assert not result.repetition_conclusive
    conn.close()
    print("  PASS  step-0(i): inconclusive for buybox/product-card, narrows nothing, says so")


def test_repetition_filter_can_actually_fire() -> None:
    """Positive control for signal (i) — without it the test above passes against a dead
    filter. `sgs/accordion-item` declares parent_block `sgs/accordion` in the live DB."""
    conn = _fixture_db()
    child = conn.execute(
        "SELECT slug, parent_block FROM blocks WHERE parent_block IS NOT NULL "
        "AND parent_block <> '' ORDER BY slug LIMIT 1").fetchone()
    assert child, "no block declares a parent_block — positive control is vacuous"
    result = mod.narrow_candidates(conn, [child[0], BUYBOX], _parent(repetition=mod.SINGLETON))
    conn.close()
    assert result.survivors == (BUYBOX,), result
    assert result.repetition_conclusive
    print(f"  PASS  step-0(i) positive control: {child[0]} (inside {child[1]}) excluded "
          f"from a singleton parent")


def test_parent_repetition_context_uses_the_real_detector() -> None:
    """`repeated_sibling_detector` reused as is — same duck-typed dict shape it accepts."""
    card = {"tag": "div", "class": ["card"], "children": [{"tag": "p", "class": []}]}
    grid = [dict(card) for _ in range(4)]
    lone = {"tag": "section", "class": ["hero"], "children": []}
    assert mod.parent_repetition_context(grid[0], grid) == mod.REPEATED
    assert mod.parent_repetition_context(lone, [lone, grid[0]]) == mod.SINGLETON
    assert mod.parent_repetition_context(lone, []) == mod.SINGLETON
    print("  PASS  step-0(i): singleton vs repeated derived via detect_repeater_groups")


# ---------------------------------------------------------------- leaf match (§3.1)

def test_worked_example_is_buybox_and_partial() -> None:
    """§4.1's corrected worked example, end to end: narrowed to the one survivor, the leaf
    match is PARTIAL — the honest result, not a bug to loosen the rule for."""
    conn = _fixture_db()
    group = mod.DraftGroup(
        roles=DRAFT_THUMBS_ROLES,
        parent=_parent(repetition=mod.SINGLETON, capabilities=("add-to-cart",)),
        label="thumbs",
    )
    result = mod.recognise_render_time_repeater(group, "eye-care-ward-end", conn=conn)
    conn.close()
    assert result.matched and result.block_slug == BUYBOX, result
    assert result.match_quality == mod.PARTIAL, result
    assert result.leaf.source_file == GALLERY_COL, result.leaf
    assert result.leaf.unmatched_draft_roles == (seeder.ROLE_IMAGE,), result.leaf
    assert result.leaf.unmatched_candidate_roles == (seeder.ROLE_CURRENT,), result.leaf
    assert result.narrowing.survivors == (BUYBOX,), result.narrowing
    assert PRODUCT_CARD not in result.narrowing.survivors
    assert result.client_slug == "eye-care-ward-end"
    print(f"  PASS  §4.1: {result.block_slug} / PARTIAL "
          f"(draft-only {result.leaf.unmatched_draft_roles}, "
          f"block-only {result.leaf.unmatched_candidate_roles})")


def test_leaf_shape_is_only_ever_checked_against_the_narrowed_set() -> None:
    """§10's other half. Un-narrowed, the same draft group is AMBIGUOUS across the pair —
    the collision the spec says leaf-first matching could never resolve."""
    conn = _fixture_db()
    group = mod.DraftGroup(roles=DRAFT_THUMBS_ROLES, parent=_parent(), label="thumbs")
    result = mod.recognise_render_time_repeater(group, "eye-care-ward-end", conn=conn)
    conn.close()
    assert result.narrowing.survivors == tuple(PAIR), result.narrowing
    assert not result.matched and result.block_slug is None, result
    assert result.ambiguous_candidates == tuple(sorted(PAIR)), result
    print(f"  PASS  no-narrowing control: ambiguous across {result.ambiguous_candidates}")


def test_exact_match_is_reachable() -> None:
    """Positive control for match quality — without it, `PARTIAL` above could be a matcher
    that can never return anything else."""
    conn = _fixture_db()
    group = mod.DraftGroup(
        roles=(seeder.ROLE_ACTION, seeder.ROLE_CURRENT, seeder.ROLE_LABEL),
        parent=_parent(capabilities=("add-to-cart",)),
    )
    result = mod.recognise_render_time_repeater(group, "fixture-client", conn=conn)
    conn.close()
    assert result.matched and result.match_quality == mod.EXACT, result
    assert result.leaf.source_file == GALLERY_COL and not result.leaf.merged_shape_hypothesis
    print("  PASS  exact: gallery-col.php sequence matched exactly, whole-file window")


def test_close_but_partial_after_narrowing_is_not_exact() -> None:
    """§10's negative control: one extra marker on the draft side, single survivor, still
    partial — an extra marker is a real structural difference, never rounded away."""
    conn = _fixture_db()
    group = mod.DraftGroup(
        roles=(seeder.ROLE_ACTION, seeder.ROLE_CURRENT, seeder.ROLE_LABEL, seeder.ROLE_IMAGE),
        parent=_parent(capabilities=("add-to-cart",)),
    )
    result = mod.recognise_render_time_repeater(group, "fixture-client", conn=conn)
    conn.close()
    assert result.narrowing.sole_survivor and result.block_slug == BUYBOX
    assert result.match_quality == mod.PARTIAL, result
    assert result.leaf.unmatched_draft_roles == (seeder.ROLE_IMAGE,)
    assert result.leaf.unmatched_candidate_roles == ()
    print("  PASS  negative control: close-but-partial after narrowing stays PARTIAL")


def test_order_is_part_of_the_structure() -> None:
    """§3.1 names the element-role SEQUENCE — a reordered sequence is not an exact match."""
    conn = _fixture_db()
    group = mod.DraftGroup(
        roles=(seeder.ROLE_LABEL, seeder.ROLE_CURRENT, seeder.ROLE_ACTION),
        parent=_parent(capabilities=("add-to-cart",)),
    )
    result = mod.recognise_render_time_repeater(group, "fixture-client", conn=conn)
    conn.close()
    assert result.match_quality == mod.PARTIAL, result
    print("  PASS  order: same multiset, different sequence -> PARTIAL, not EXACT")


def test_short_window_never_outranks_the_real_item_shape() -> None:
    """buybox's render.php value ladder is three `label`s. A one-role window off it ties the
    real thumbnail item on unmatched-count; shared-count is what stops it winning."""
    conn = _fixture_db()
    best = mod.match_leaf(BUYBOX, DRAFT_THUMBS_ROLES, mod.candidate_role_sequences(conn, BUYBOX))
    conn.close()
    assert best.source_file == GALLERY_COL, best
    assert best.shared_count == 2, best
    print("  PASS  window ranking: three-role thumbnail item beats a one-role ladder window")


def test_merged_shape_window_is_flagged_not_silent() -> None:
    """product-card's render.php holds TWO repeaters the table's PK cannot separate — a
    sub-file window is a hypothesis and must say so."""
    conn = _fixture_db()
    best = mod.match_leaf(
        PRODUCT_CARD,
        (seeder.ROLE_ACTION, seeder.ROLE_CURRENT, seeder.ROLE_LABEL),
        mod.candidate_role_sequences(conn, PRODUCT_CARD),
    )
    conn.close()
    assert best.quality == mod.EXACT and best.source_file == "render.php", best
    assert best.merged_shape_hypothesis, best
    print("  PASS  merged shape: sub-file window returned flagged as a per-item hypothesis")


# ---------------------------------------------------------------- Front C Task 4

def test_singleton_role_sequences_reads_the_real_buybox_rows() -> None:
    """`singleton_role_sequences()` must be shaped identically to
    `candidate_role_sequences()` — real buybox rows, not invented ones."""
    conn = _fixture_db()
    seqs = mod.singleton_role_sequences(conn, BUYBOX)
    conn.close()
    assert seqs[GALLERY_COL] == (seeder.ROLE_IMAGE,), seqs
    assert seqs["render.php"] == (seeder.ROLE_LABEL, seeder.ROLE_ACTION, seeder.ROLE_LABEL), seqs
    print(f"  PASS  singleton_role_sequences: real buybox rows {seqs}")


def test_composes_child_reads_the_real_composition_table() -> None:
    conn = _fixture_db()
    buybox_composes = mod.composes_child(conn, BUYBOX, "sgs/option-picker")
    container_composes = mod.composes_child(conn, "sgs/container", "sgs/option-picker")
    conn.close()
    assert buybox_composes is True, "buybox really does compose sgs/option-picker"
    assert container_composes is False, "container composes nothing — negative control"
    print("  PASS  composes_child: buybox->option-picker True; container->option-picker "
          "False (real negative control, container has 0 composition rows)")


def test_composition_narrowing_excludes_a_non_composing_candidate() -> None:
    """Step 0's new composition signal, exclusion-only, mirroring the capability check."""
    conn = _fixture_db()
    narrowing = mod.narrow_candidates(
        conn, [BUYBOX, "sgs/container"],
        mod.ParentContext(required_composed_children=frozenset({"sgs/option-picker"})))
    conn.close()
    assert narrowing.survivors == (BUYBOX,), narrowing
    assert narrowing.composition_conclusive is True, narrowing
    assert any("does not compose" in reason for _slug, reason in narrowing.excluded), narrowing
    print(f"  PASS  composition narrowing: {narrowing.survivors} survive requiring "
          "sgs/option-picker; sgs/container excluded")


def test_composition_signal_narrows_nothing_when_empty() -> None:
    """Same discipline as `required_capabilities`: unsupplied means unsupplied, not
    'exclude everything' or 'exclude nothing by coincidence'."""
    conn = _fixture_db()
    narrowing = mod.narrow_candidates(conn, [BUYBOX, "sgs/container"], mod.ParentContext())
    conn.close()
    assert narrowing.composition_conclusive is False, narrowing
    assert set(narrowing.survivors) == {BUYBOX, "sgs/container"}, narrowing
    print("  PASS  composition narrowing: empty required set narrows nothing")


def test_static_leaf_is_computed_for_the_winning_candidate() -> None:
    """End-to-end: a real EXACT repeater match, WITH static_roles supplied, gains a
    real static_leaf corroboration against buybox's own real gallery-col.php singleton
    row — computed via the SAME match_leaf() Stage A already uses for repeaters."""
    conn = _fixture_db()
    group = mod.DraftGroup(
        roles=(seeder.ROLE_ACTION, seeder.ROLE_CURRENT, seeder.ROLE_LABEL),
        static_roles=(seeder.ROLE_IMAGE,),
        parent=_parent(capabilities=("add-to-cart",)),
    )
    result = mod.recognise_render_time_repeater(group, "fixture-client", conn=conn)
    conn.close()
    assert result.matched and result.block_slug == BUYBOX, result
    assert result.static_leaf is not None, result
    assert result.static_leaf.quality == mod.EXACT, result.static_leaf
    assert result.static_leaf.source_file == GALLERY_COL, result.static_leaf
    print(f"  PASS  static_leaf: real EXACT corroboration on {result.static_leaf.source_file} "
          f"({result.static_leaf.candidate_roles})")


def test_static_leaf_is_none_when_no_static_roles_supplied() -> None:
    """Backward compatibility: every existing caller supplies no `static_roles` (the
    field defaults to `()`), and must see `static_leaf=None`, not a crash or a guess."""
    conn = _fixture_db()
    group = mod.DraftGroup(
        roles=(seeder.ROLE_ACTION, seeder.ROLE_CURRENT, seeder.ROLE_LABEL),
        parent=_parent(capabilities=("add-to-cart",)),
    )
    result = mod.recognise_render_time_repeater(group, "fixture-client", conn=conn)
    conn.close()
    assert result.matched and result.static_leaf is None, result
    print("  PASS  static_leaf: None when static_roles is not supplied (default, "
          "every pre-Task-4 caller)")


# ---------------------------------------------------------------- honest no-match

def test_unseeded_table_reports_unseeded_not_no_match() -> None:
    """An empty table is a missing seed, not proof no block has a repeater — the live DB is
    in exactly this state today, so the distinction is not hypothetical."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    _TEMP_DBS.append(path)
    conn = sqlite3.connect(path)
    seeder.ensure_table(conn)
    result = mod.recognise_render_time_repeater(
        mod.DraftGroup(roles=DRAFT_THUMBS_ROLES), "fixture-client", conn=conn)
    conn.close()
    assert not result.matched and result.match_quality == mod.NONE
    assert any("empty" in n for n in result.notes), result.notes
    print("  PASS  unseeded: reported as unseeded, never as a proven absence")


def test_no_stage_a_match_is_a_clean_result() -> None:
    """Stage A's honest miss — the normal trigger for Stage B (§5), not an error."""
    conn = _fixture_db()
    group = mod.DraftGroup(
        roles=DRAFT_THUMBS_ROLES,
        parent=_parent(capabilities=("configurator-warp-drive",)),
    )
    result = mod.recognise_render_time_repeater(group, "fixture-client", conn=conn)
    conn.close()
    assert not result.matched and result.block_slug is None
    assert result.match_quality == mod.NONE and result.leaf is None
    assert result.narrowing.survivors == () and len(result.narrowing.excluded) == 2
    print("  PASS  no-match: every candidate excluded, no leaf comparison run, clean result")


def test_live_db_was_not_written() -> None:
    """The fixtures seed a temp DB; the shared live DB's row COUNT must be unchanged by
    this run (not zero — D1089 wired the real seeder into /sgs-update, so the live table
    legitimately holds real rows now; the invariant this test proves is isolation, not
    emptiness)."""
    rows = _live_repeater_row_count()
    assert rows == _LIVE_ROWS_BEFORE_THIS_RUN, (
        f"live block_render_repeaters had {_LIVE_ROWS_BEFORE_THIS_RUN} rows before this "
        f"run, has {rows} now — this test wrote to it"
    )
    print("  PASS  live DB row count unchanged by this run "
          f"({_LIVE_ROWS_BEFORE_THIS_RUN} rows)")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # cp1252 consoles mangle § and —
    print("Spec 44 §3.1/§4.1/§4.3 — Stage A parent-narrowing + structural match")
    test_live_db_is_the_real_one()
    test_draft_thumbs_group_is_read_from_the_real_draft()
    test_seeded_pair_reproduces_the_documented_collision()
    test_source_file_grouping_is_not_optional()
    test_capability_narrowing_separates_the_pair_both_ways()
    test_capability_narrowing_is_per_attribute_not_per_block()
    test_repetition_filter_is_honest_about_being_inconclusive_here()
    test_repetition_filter_can_actually_fire()
    test_parent_repetition_context_uses_the_real_detector()
    test_worked_example_is_buybox_and_partial()
    test_leaf_shape_is_only_ever_checked_against_the_narrowed_set()
    test_exact_match_is_reachable()
    test_close_but_partial_after_narrowing_is_not_exact()
    test_order_is_part_of_the_structure()
    test_short_window_never_outranks_the_real_item_shape()
    test_merged_shape_window_is_flagged_not_silent()
    test_singleton_role_sequences_reads_the_real_buybox_rows()
    test_composes_child_reads_the_real_composition_table()
    test_composition_narrowing_excludes_a_non_composing_candidate()
    test_composition_signal_narrows_nothing_when_empty()
    test_static_leaf_is_computed_for_the_winning_candidate()
    test_static_leaf_is_none_when_no_static_roles_supplied()
    test_unseeded_table_reports_unseeded_not_no_match()
    test_no_stage_a_match_is_a_clean_result()
    test_live_db_was_not_written()
    for path in _TEMP_DBS:
        try:
            os.unlink(path)
        except OSError:
            pass
    print("\nSTAGE-A RECOGNITION: PASS (real collision reproduced + source_file grouping + "
          "two-way capability narrowing + repetition positive control + worked example PARTIAL "
          "+ un-narrowed ambiguity + exact reachable + merged-shape disclosure + honest no-match)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
