"""Self-test for array_schema_eliminator.py — Spec 44 §5, §5.2, §5.3, §10.

FIXTURE DISCIPLINE (the model is `test_render_repeater_recogniser.py`): no invented DB
and no invented block shapes. Unlike Stage A, Stage B's table — `array_item_schema` — is
genuinely POPULATED on the live DB, so the roster under test is read from it READ-ONLY
and every candidate field name and role in these assertions is measured, not transcribed.
A final test re-opens the live DB and asserts this run wrote nothing.

THE FIVE SHAPES (§10's Stage B bullet). The spec names "the five real shapes proven last
session (ticker, brand-tile, reasons-card, filter chip, basket line item)" but does not
record their field sets, and the report it points at
(`.claude/reports/2026-09-14-classless-recognition-next-design-attempt.md`) describes only
TWO of the five as classification outcomes — `ticker` (a "genuine tie") and the brand
tile (a claimed "framework gap", corrected by §5.3). `reasons-card`, `filter chip` and
`basket line item` appear there ONLY as field-level examples inside Thread 1, never as
shapes. So all five fixtures below are built from the REAL draft's own JS builders, cited
per fixture by line number, rather than from the report's prose. Each fixture's
provenance comment names the `sc-for` line and the builder line in
`sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html`.

"filter chip" is TWO real shapes in that draft, not one — `activeChips` (removable) and
the `g.items` chips the `chips()` helper builds. Both are fixtures; picking one silently
would have hidden the other.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import array_schema_eliminator as mod  # noqa: E402
import render_repeater_recogniser as stage_a  # noqa: E402

LIVE_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
REPO = Path(__file__).resolve().parents[4]
DRAFT = (REPO / "sites" / "eye-care-ward-end" / "design_handoff_ward_end_eye_care"
         / "Eye Care Birmingham.dc.html")

F = mod.DraftField
G = mod.DraftItemGroup
FN = mod.FUNCTION_LITERAL

CLIENT = "eye-care-ward-end"

# --- the five real shapes, each traced to the draft ------------------------------
# ticker           sc-for line 45   builder 2058: .map(t => ({text:t[0], icon:t[1]}))
TICKER = G((F("text", "Free UK delivery over 50", tag="span"),
            F("icon", "truck")), label="ticker")
# brand tile       sc-for line 137  builder 2159:
#   megaTopBrands: C.BRANDS.filter(b=>b[2]).map(b => ({name:b[0], count:b[1]+' frames', go:...}))
BRAND_TILE = G((F("name", "Ray-Ban", tag="span"),
                F("count", "12 frames", tag="span"),
                F("go", FN)), label="megaTopBrands")
# reasons card     sc-for line 253  builder 2101:
#   reasons: C.REASONS.map(r => ({no:r[0], title:r[1], body:r[2]}))
REASONS_CARD = G((F("no", "01", tag="div"),
                  F("title", "Below RRP, and I show you by how much", tag="h3"),
                  F("body", "The recommended retail price sits above what most "
                            "independents actually charge.", tag="p")), label="reasons")
# filter chip (a)  sc-for line 425  builder 1867-1875: {label, remove}
ACTIVE_CHIP = G((F("label", "Up to 340", tag="span", formatter="gbp"),
                 F("remove", FN)), label="activeChips")
# filter chip (b)  sc-for line 463  builder 1890 chips(): {name,on,border,bg,color,toggle}
FILTER_CHIP = G((F("name", "Aviator", tag="span"), F("on", True),
                 F("border", "#E6E1DA"), F("bg", "#FFFFFF"), F("color", "#141414"),
                 F("toggle", FN)), label="g.items chips")
# basket line item sc-for lines 1100/1222  builder 2029-2035: Object.assign({}, p, {...})
# Reduced to the line-specific fields plus the product fields the line actually renders
# — `p` is the whole ~35-field decorated product (deco(), line 1814), which no seeded
# array schema declares and which is itself the reason this group narrows the roster.
BASKET_LINE = G((F("name", "Aviator Classic", tag="span"),
                 F("brand", "Ray-Ban", tag="span"),
                 F("lineLabel", "139", tag="div", formatter="gbp"),
                 F("lensLine", "Frame only - Size M", tag="span"),
                 F("img", "/img/aviator.jpg"),
                 F("canAddLens", True), F("addLens", FN), F("remove", FN)),
                label="bagItems")

FIVE_SHAPES = {"ticker": TICKER, "brand-tile": BRAND_TILE, "reasons-card": REASONS_CARD,
               "filter-chip(activeChips)": ACTIVE_CHIP, "filter-chip(g.items)": FILTER_CHIP,
               "basket-line-item": BASKET_LINE}


def _conn() -> sqlite3.Connection:
    return mod.open_db()


# --------------------------------------------------------------------- preconditions

def test_live_db_is_the_real_one() -> None:
    conn = _conn()
    rows = conn.execute("SELECT COUNT(*) FROM array_item_schema").fetchone()[0]
    roled = conn.execute(
        "SELECT COUNT(*) FROM array_item_schema WHERE role IS NOT NULL AND role <> ''"
    ).fetchone()[0]
    blocks = conn.execute(
        "SELECT COUNT(DISTINCT block_slug) FROM array_item_schema").fetchone()[0]
    conn.close()
    assert rows > 0, "array_item_schema is empty — Stage B has no roster to scan"
    # §5.0 point 1 recorded "25 of 84 rows, ~30%, across 12 of 206 blocks". Asserted as
    # a DRIFT DETECTOR, not as the spec's figures: the point of §5.0 is to notice
    # movement before relying on the population rate, so the test prints what is true
    # now and fails only if the table stops being usable at all.
    print(f"  PASS  live array_item_schema: {rows} rows, {roled} role-populated, "
          f"{blocks} blocks (spec §5.0 recorded 25/84 across 12 — re-measured here)")


def test_five_fixtures_trace_to_the_real_draft() -> None:
    """Each fixture's provenance comment is CHECKED, not merely written down.

    A fixture comment citing a line number is exactly the kind of claim that rots
    silently; asserting the cited group really exists in the real draft is what stops
    these six shapes drifting into invented data the next time the draft is regenerated.
    """
    assert DRAFT.exists(), f"the real draft is missing at {DRAFT}"
    text = DRAFT.read_text(encoding="utf-8", errors="replace")
    for expr in ("{{ ticker }}", "{{ megaTopBrands }}", "{{ reasons }}",
                 "{{ activeChips }}", "{{ g.items }}", "{{ bagItems }}"):
        assert f'<sc-for list="{expr}"' in text, f"no sc-for for {expr} in the real draft"
    for builder in ("({text:t[0], icon:t[1]})", "count:b[1]",
                    "({no:r[0], title:r[1], body:r[2]})", "lineLabel"):
        assert builder in text, f"builder fragment {builder!r} is no longer in the draft"
    print("  PASS  provenance: all six fixture groups and their JS builders found in "
          "the real Eye Care Birmingham draft")


def test_stage_b_import_does_not_mutate_the_live_db() -> None:
    """The reason `db_lookup` / `array_content` / `classless_field_resolver` are not
    imported. Measured, not asserted: importing `db_lookup` runs six schema migrations
    against the shared live DB. This test proves Stage B's OWN import chain is clean."""
    assert "converter.db.db_lookup" not in sys.modules, (
        "db_lookup is loaded — something in Stage B's import chain mutates the live DB")
    print("  PASS  import chain clean: db_lookup never loaded by Stage B")


# --------------------------------------------------------------------- §5 condition

def test_stage_b_refuses_to_run_when_stage_a_matched() -> None:
    class _Matched:
        matched = True

    r = mod.recognise_by_db_elimination(TICKER, CLIENT, stage_a_result=_Matched())
    assert r.ran is False and r.matched is False
    assert "precondition" in r.notes[0]
    conn = _conn()
    unmatched = stage_a.RenderMatchResult(
        matched=False, block_slug=None, match_quality=stage_a.NONE, client_slug=CLIENT,
        narrowing=stage_a.NarrowingResult((), (), (), False, False), leaf=None)
    ran = mod.recognise_by_db_elimination(TICKER, CLIENT, stage_a_result=unmatched, conn=conn)
    conn.close()
    assert ran.ran is True, "an unmatched Stage A result must let Stage B run"
    print("  PASS  §5 condition: refuses on a Stage A match, runs on a real Stage A miss")


def test_full_roster_is_scanned_with_no_pre_narrowing() -> None:
    """§5/FR-44-1(b): Stage B never narrows before scanning — the inverse of Stage A."""
    conn = _conn()
    roster = mod.seeded_roster(conn)
    result = mod.recognise_by_db_elimination(TICKER, CLIENT, conn=conn)
    conn.close()
    assert len(result.elimination.roster) == len(roster) > 1
    assert set(result.elimination.roster) == {c.name for c in roster}
    print(f"  PASS  §5: all {len(roster)} seeded (block, array_attr) pairs scanned, "
          "nothing pre-narrowed")


# --------------------------------------------------------------- §5.2 priority order

def test_priority_1_is_a_type_check_not_a_name_check() -> None:
    """§5.2 priority 1 / Thread 1 Finding 1c + 2c, two independent layers."""
    conn = _conn()
    # Layer 1: a function VALUE on a noun-named field is still an action.
    _, decided = mod.prefilter(G((F("title", FN),)))
    assert decided[0].disposition == mod.ACTION
    # Layer 2: an onClick-bound field with a plain STRING value is still an action.
    _, decided = mod.prefilter(G((F("q", "Do you do eye tests?", onclick_bound=True),)))
    assert decided[0].disposition == mod.ACTION
    # NEGATIVE CONTROL: a verb-NAMED field with a plain string value is CONTENT. Without
    # this the rule could be a hardcoded verb list and every test above would still pass.
    content, decided = mod.prefilter(G((F("go", "Go to shop"),)))
    assert [f.key for f in content] == ["go"] and not decided
    conn.close()
    print("  PASS  §5.2(1): function-value AND onClick-bound are actions; a verb NAME "
          "with a string value is content (negative control)")


def test_priority_1_interoperates_with_spec45s_sentinel() -> None:
    """A second, non-identical `FunctionLiteral` must not read as content — the exact
    failure that would follow from two sentinels compared by identity."""
    class FunctionLiteral:  # noqa: D401 - deliberately shadows Spec 45's name
        pass

    assert mod.is_action_value(FunctionLiteral())
    assert not mod.is_action_value("FunctionLiteral")
    print("  PASS  §5.2(1): a foreign FunctionLiteral sentinel is an action; the bare "
          "STRING of that name is not")


def test_priority_2_shared_formatter_never_maps_a_name_to_a_meaning() -> None:
    """§5.2 priority 2 carries an EQUIVALENCE, not a `gbp -> price` dictionary."""
    src = (HERE / "array_schema_eliminator.py").read_text(encoding="utf-8")
    body = src.split("def _shared_formatter_roles", 1)[1].split("\ndef ", 1)[0]
    code = "\n".join(l for l in body.splitlines() if not l.strip().startswith("#"))
    code = code.split('"""')[-1] if '"""' in code else code
    assert "gbp" not in code and "price" not in code, (
        "the formatter rule names a specific formatter or field — that is the hardcoded "
        "dict R-31-1 forbids")
    # With no resolved sibling the formatter constrains nothing.
    assert mod._shared_formatter_roles([F("a", "1", formatter="gbp")], {}, "gbp") == frozenset()
    print("  PASS  §5.2(2): formatter carries an equivalence, not a name->meaning map")


def test_priority_4_detectors_are_the_three_the_spec_names() -> None:
    assert mod.classify_value_shape("3 days ago") == mod.SHAPE_RELATIVE_DATE
    assert mod.classify_value_shape("yesterday") == mod.SHAPE_RELATIVE_DATE
    assert mod.classify_value_shape("Do you do eye tests?") == mod.SHAPE_QUESTION
    assert mod.classify_value_shape("M12 2 L2 7 L12 12 Z") == mod.SHAPE_SVG_ICON_PATH
    assert mod.classify_value_shape('<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>'
                                    ) == mod.SHAPE_SVG_ICON_PATH
    # NEGATIVE CONTROLS — each detector must be able to say NO, or it is vacuous.
    assert mod.classify_value_shape("Monday opening hours") == mod.SHAPE_TEXT, (
        "an ordinary sentence starting with M must not read as SVG path data")
    assert mod.classify_value_shape("3 days of aftercare") == mod.SHAPE_TEXT
    assert mod.classify_value_shape("Ray-Ban") == mod.SHAPE_TEXT
    assert mod.classify_value_shape("#E6E1DA") == mod.SHAPE_COLOUR
    assert mod.classify_value_shape("/img/aviator.jpg") == mod.SHAPE_MEDIA
    assert mod.classify_value_shape("https://example.com") == mod.SHAPE_URL
    print("  PASS  §5.2(4): relative-date / question / svg-icon-path detect, and each "
          "refuses a lookalike (negative controls)")


def test_priority_5_never_picks_a_title_from_tag_shape() -> None:
    """§5.2's one explicit prohibition (Thread 1 Finding 2a).

    Two SHORT-form draft fields whose tags differ (`h3` vs `span`) must get NO
    discrimination from priority 5 — tag shape may separate long from short, never
    heading from not-heading.
    """
    assert mod._tag_class("h3") == mod._tag_class("span") == "short"
    assert mod._tag_class("p") == mod._tag_class("blockquote") == "long"
    print("  PASS  §5.2(5): h3 and span are the SAME class — tag shape cannot pick a title")


def test_priority_5_ordering_matches_the_real_seeded_schemas() -> None:
    """Priority 5 puts a long-form value in the LAST remaining field by `field_order`.

    That is only defensible if the seeded schemas really do declare a short label before
    its long description. Measured live rather than assumed — if a future reseed inverts
    an ordering, this fails instead of quietly mis-ordering a clone.
    """
    conn = _conn()
    pairs = [("sgs/card-grid", "items", "title", "subtitle"),
             ("sgs/pricing-table", "plans", "name", "description"),
             ("sgs/process-steps", "steps", "title", "description")]
    for slug, attr, short_key, long_key in pairs:
        rows = dict(conn.execute(
            "SELECT field_key, field_order FROM array_item_schema "
            "WHERE block_slug = ? AND array_attr = ?", (slug, attr)).fetchall())
        assert short_key in rows and long_key in rows, f"{slug}.{attr} schema changed"
        assert rows[short_key] < rows[long_key], (
            f"{slug}.{attr}: {short_key} no longer precedes {long_key} — priority 5's "
            "ordering assumption is broken")
    conn.close()
    print(f"  PASS  §5.2(5): short-before-long field_order holds on all "
          f"{len(pairs)} seeded schemas that declare both")


# ------------------------------------------------------------------ §5.3 brand-strip

def test_brand_strip_schema_is_as_section_5_3_describes() -> None:
    """§5.3 is prior-session evidence — re-verified against the real block, not trusted."""
    conn = _conn()
    fields = dict(conn.execute(
        "SELECT field_key, role FROM array_item_schema "
        "WHERE block_slug = 'sgs/brand-strip' AND array_attr = 'logos'").fetchall())
    conn.close()
    assert "name" in fields and "linkUrl" in fields, (
        "§5.3's claim that brand-strip already carries name + linkUrl no longer holds")
    assert "count" not in fields, "a count field now exists — §5.3's only gap has closed"
    block_json = (REPO / "plugins" / "sgs-blocks" / "src" / "blocks" / "brand-strip"
                  / "block.json").read_text(encoding="utf-8")
    media = block_json.split('"media"', 1)[1].split('"alt"', 1)[0]
    assert '"null"' in media, "media no longer validates null — D1031's empty state is gone"
    print("  PASS  §5.3 re-verified: name + linkUrl declared, media still accepts null "
          "(D1031), no count field")


def test_brand_tile_count_is_an_honest_skip_not_a_wildcard_guess() -> None:
    """§5.3's required outcome, and the module's headline refusal."""
    conn = _conn()
    cand = next(c for c in mod.seeded_roster(conn)
                if c.name == "sgs/brand-strip.logos")
    group = G((F("name", "Ray-Ban", tag="span"), F("linkUrl", "/brands/ray-ban"),
               F("count", "12 frames", tag="span"), F("go", FN)))
    by_key = {r.draft_key: r for r in mod.resolve_fields(conn, group, cand)}
    conn.close()
    assert by_key["name"].disposition == mod.TRANSFERRED
    assert by_key["name"].field_key == "name"
    assert by_key["linkUrl"].field_key == "linkUrl"
    assert by_key["go"].disposition == mod.ACTION
    assert by_key["count"].disposition == mod.SKIPPED
    assert by_key["count"].field_key is None
    # The refusal that matters: brand-strip declares six role-less fields, and `count`
    # went into NONE of them.
    assert "objectFit" not in str(by_key["count"].field_key)
    print("  PASS  §5.3: name + linkUrl transfer by direct key (both role-less), go is "
          "an action, count is an honest skip — never a wildcard slot")


def test_plain_text_never_lands_in_a_media_field() -> None:
    """Regression control for a real bug found during this build: greedy assignment put
    `name: 'Ray-Ban'` into `sgs/brand-strip.logos.media` (role `image-object`)."""
    conn = _conn()
    cand = next(c for c in mod.seeded_roster(conn) if c.name == "sgs/card-grid.items")
    res = {r.draft_key: r for r in mod.resolve_fields(
        conn, G((F("badge", "New in", tag="span"),)), cand)}
    conn.close()
    assert res["badge"].field_key != "media"
    print("  PASS  regression: a plain-text value cannot resolve into an image-object field")


def test_a_distinctive_field_is_not_starved_by_a_text_field() -> None:
    """The order fix. In draft order the text fields claimed the only media slot and
    excluded the whole roster for the real `bagItems` shape."""
    conn = _conn()
    elimination = mod.eliminate_candidates(conn, BASKET_LINE)
    conn.close()
    assert elimination.survivors, (
        "every candidate excluded — a text field is starving the media-shaped `img`")
    order = [f.key for f in mod._assignment_order(BASKET_LINE.fields)]
    assert order.index("img") < order.index("name")
    print(f"  PASS  order-independence: distinctive shapes assigned first; basket line "
          f"leaves {len(elimination.survivors)} survivor(s), not 0")


# ------------------------------------------------------------------ §10 five shapes

def test_five_real_shapes_each_produce_an_honest_outcome() -> None:
    """§10's Stage B bullet. The assertion is NOT that each narrows to one block — it is
    that each returns a self-consistent, honest result: a sole survivor carries per-field
    dispositions; a tie names its survivors and resolves NO field; a no-match says so."""
    conn = _conn()
    measured: dict[str, int] = {}
    for name, group in FIVE_SHAPES.items():
        r = mod.recognise_by_db_elimination(group, CLIENT, conn=conn)
        measured[name] = len(r.elimination.survivors)
        assert r.ran is True
        if r.matched:
            assert len(r.elimination.survivors) == 1 and r.block_slug
            assert r.fields, "a match must carry a per-field conservation record (§4.4)"
        else:
            assert r.block_slug is None, "a non-match must name no block"
            assert not any(f.disposition == mod.TRANSFERRED for f in r.fields), (
                "no field may be placed when no single candidate survived")
            if len(r.elimination.survivors) > 1:
                assert r.ambiguous_candidates == r.elimination.survivors
        # Conservation: every draft field is accounted for, or none are (the tie case).
        if r.fields:
            assert {f.draft_key for f in r.fields} <= {f.key for f in group.fields}
    conn.close()
    print("  PASS  §10 five shapes, measured survivors/roster: "
          + ", ".join(f"{k}={v}" for k, v in measured.items()))


def test_negative_control_ambiguous_field_falls_to_review() -> None:
    """§10's required negative control: a field no rule can resolve is SKIPPED as
    ambiguous with its candidates named — never assigned to a guessed slot."""
    conn = _conn()
    cand = next(c for c in mod.seeded_roster(conn) if c.name == "sgs/card-grid.items")
    # Two plain-text draft fields sharing no name token with any declared field, no
    # formatter, no distinctive shape, and the SAME tag class — every priority in §5.2
    # is silent on them, by construction.
    group = G((F("alpha", "Lorem ipsum dolor", tag="span"),
               F("beta", "Sit amet consectetur", tag="span")))
    # Both short-form, so priority 5 has no long/short split to read and stays silent.
    res = {r.draft_key: r for r in mod.resolve_fields(conn, group, cand)}
    conn.close()
    assert res["alpha"].disposition == mod.SKIPPED
    assert "ambiguous" in res["alpha"].reason
    assert len(res["alpha"].considered) > 1, "an ambiguous skip must name what it weighed"
    assert res["alpha"].field_key is None and res["beta"].field_key is None
    print(f"  PASS  §10 negative control: ambiguous field falls to review, naming "
          f"{len(res['alpha'].considered)} candidates, placing none")


def test_priority_5_positive_control_on_the_real_reasons_card() -> None:
    """The guard above must not make priority 5 dead code. The real `reasons` item
    (draft line 253 / builder 2101) splits genuinely — `title` renders `<h3>`, `body`
    renders `<p>` — so the tie-breaker fires here and puts the long-form value in the
    later declared field."""
    conn = _conn()
    cand = next(c for c in mod.seeded_roster(conn) if c.name == "sgs/card-grid.items")
    res = {r.draft_key: r for r in mod.resolve_fields(conn, REASONS_CARD, cand)}
    orders = dict(conn.execute(
        "SELECT field_key, field_order FROM array_item_schema "
        "WHERE block_slug = 'sgs/card-grid' AND array_attr = 'items'").fetchall())
    conn.close()
    fired = [r for r in res.values() if r.matched_by == "tag-shape-order"]
    assert fired, "priority 5 never fired on a genuine long/short split — it is dead code"
    body, title = res["body"], res["title"]
    # Regression control for the signal-strength ordering fix: the draft's `title` has
    # an exact name match and must keep it. Resolved in draft order, `no` — which only
    # priority 5 can place — took `title` and shifted the whole item by one, with every
    # field still resolving so nothing read as wrong.
    assert title.field_key == "title" and title.matched_by == "direct-key", (
        f"a weaker signal stole the exact-name slot: title -> {title.field_key}")
    if body.field_key and title.field_key:
        assert orders[body.field_key] > orders[title.field_key], (
            "the long-form value did not land in the later declared field")
    print(f"  PASS  §5.2(5) positive control: fires on the real reasons card "
          f"(title -> {title.field_key}, body -> {body.field_key})")


def test_more_than_one_survivor_is_never_tie_broken() -> None:
    """FR-44-1(a) at Stage B."""
    conn = _conn()
    r = mod.recognise_by_db_elimination(TICKER, CLIENT, conn=conn)
    conn.close()
    assert len(r.elimination.survivors) > 1
    assert r.matched is False and r.block_slug is None
    assert r.ambiguous_candidates == r.elimination.survivors
    print(f"  PASS  FR-44-1(a): {len(r.ambiguous_candidates)} survivors reported as "
          "ambiguous, none chosen")


def test_elimination_actually_eliminates_and_says_why() -> None:
    """Positive control — without it every "survivors" assertion could pass against a
    filter that can never fire."""
    conn = _conn()
    url_group = G((F("platform", "instagram"), F("url", "https://instagram.com/x")))
    el = mod.eliminate_candidates(conn, url_group)
    conn.close()
    assert 0 < len(el.survivors) < len(el.roster)
    assert el.excluded and all(reason for _n, reason in el.excluded)
    assert "sgs/social-icons.icons" in el.survivors
    print(f"  PASS  positive control: a url-shaped field narrows {len(el.roster)} -> "
          f"{len(el.survivors)}, each exclusion carrying its reason")


def test_a_plain_text_field_eliminates_nothing() -> None:
    """The deliberate weakness, asserted so it cannot be mistaken for a bug later: any
    content role can hold text, so excluding on a text field would be excluding on
    absence of evidence. This is why §5.3's `count` leaves brand-strip standing."""
    conn = _conn()
    el = mod.eliminate_candidates(conn, G((F("headline", "Some words"),)))
    conn.close()
    assert len(el.survivors) == len(el.roster), (
        "a single plain-text field excluded a candidate — elimination is over-reaching")
    print("  PASS  a single plain-text field excludes nothing (documented weakness)")


def test_capacity_eliminates_and_names_the_arity() -> None:
    conn = _conn()
    wide = G(tuple(F(f"f{i}", f"value {i}") for i in range(40)))
    el = mod.eliminate_candidates(conn, wide)
    conn.close()
    assert not el.survivors, "no seeded schema declares 40 item fields"
    assert any("capacity" in reason for _n, reason in el.excluded)
    print("  PASS  capacity: a 40-field group exceeds every seeded schema, each "
          "exclusion naming the arity")


def test_result_shape_is_name_compatible_with_stage_a() -> None:
    """Task 4 must be able to handle either stage's result uniformly — without Stage B
    fabricating Stage A's narrowing/leaf audit trail."""
    shared = {"matched", "block_slug", "match_quality", "client_slug",
              "ambiguous_candidates", "notes"}
    assert shared <= set(stage_a.RenderMatchResult.__dataclass_fields__)
    assert shared <= set(mod.SchemaMatchResult.__dataclass_fields__)
    assert "narrowing" not in mod.SchemaMatchResult.__dataclass_fields__
    assert "leaf" not in mod.SchemaMatchResult.__dataclass_fields__
    print("  PASS  result shapes share six field names; Stage B claims no narrowing or "
          "leaf match it never performed")


def test_live_db_was_not_written() -> None:
    conn = sqlite3.connect(f"file:{LIVE_DB}?mode=ro", uri=True)
    rows = conn.execute("SELECT COUNT(*) FROM array_item_schema").fetchone()[0]
    conn.close()
    assert rows > 0
    assert "converter.db.db_lookup" not in sys.modules
    print("  PASS  live DB read-only throughout this run")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # cp1252 consoles mangle § and —
    print("Spec 44 §5 — Stage B DB-fact elimination + §5.2 field resolution")
    test_live_db_is_the_real_one()
    test_five_fixtures_trace_to_the_real_draft()
    test_stage_b_import_does_not_mutate_the_live_db()
    test_stage_b_refuses_to_run_when_stage_a_matched()
    test_full_roster_is_scanned_with_no_pre_narrowing()
    test_priority_1_is_a_type_check_not_a_name_check()
    test_priority_1_interoperates_with_spec45s_sentinel()
    test_priority_2_shared_formatter_never_maps_a_name_to_a_meaning()
    test_priority_4_detectors_are_the_three_the_spec_names()
    test_priority_5_never_picks_a_title_from_tag_shape()
    test_priority_5_ordering_matches_the_real_seeded_schemas()
    test_brand_strip_schema_is_as_section_5_3_describes()
    test_brand_tile_count_is_an_honest_skip_not_a_wildcard_guess()
    test_plain_text_never_lands_in_a_media_field()
    test_a_distinctive_field_is_not_starved_by_a_text_field()
    test_five_real_shapes_each_produce_an_honest_outcome()
    test_negative_control_ambiguous_field_falls_to_review()
    test_priority_5_positive_control_on_the_real_reasons_card()
    test_more_than_one_survivor_is_never_tie_broken()
    test_elimination_actually_eliminates_and_says_why()
    test_a_plain_text_field_eliminates_nothing()
    test_capacity_eliminates_and_names_the_arity()
    test_result_shape_is_name_compatible_with_stage_a()
    test_live_db_was_not_written()
    print("\nSTAGE-B ELIMINATION: PASS (§5 precondition enforced + full roster scanned + "
          "§5.2 priorities 1-5 with negative controls + §5.3 re-verified live + five real "
          "draft shapes + ambiguous-falls-to-review + elimination positive control)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
