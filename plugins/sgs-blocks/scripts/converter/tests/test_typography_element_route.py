"""test_typography_element_route.py -- a container's text typography reaches the block's text element.

A draft container declaring ``font-size:12.5px;letter-spacing:.04em`` CSS-inherits that into every text node
inside it. ``resolvers/typography.py`` used to look only for a block-level ``fontSize`` / ``letterSpacing``; a
block whose typography attrs are element-scoped (``sgs/trust-bar``: ``labelFontSize`` / ``titleFontSize``)
silently gapped. ``db_lookup.attr_for_typography_property`` now falls through, when the block has NO
root-domain row for the property, to the block's text element -- but ONLY when the block's own
``block_selectors`` element='typography' row (the DB's one declaration of a block's primary text element) names
exactly one element-scoped attr. Anything else is a reported GAP naming the candidates.

QC-council fix (2026-09-21): the first version also routed to "the one element-level attr the block declares".
That is not a primary-text signal: ``sgs/nav-drawer``'s only typography attr is ``closeFontSize`` (the close
button), so ``.sgs-nav-drawer{font-size:18px}`` styled a button. 59 such un-adjudicated routes existed (80 routed
pairs before, 21 selector-adjudicated after); they are gaps now. The native-support guard is also whole-block: ``sgs/quote`` natively hosts ``fontSize`` / ``lineHeight``,
so its ``letter-spacing`` must not go to ``attributionLetterSpacing`` either.

Everything below is derived from the DB (read-only), never a hand list. ``_reference_root_answer`` is a frozen
copy of the previous root-domain function so "unchanged" is a comparison, not an assertion of intent, and
``_classify(..., native="property", fallback=True)`` freezes the first version's rules so "previously routed" is a
measurement.

Each behaviour carries a NEGATIVE CONTROL (a deliberately broken implementation the same check must reject):
  * widening off                          -> the routed census fails;
  * an only-candidate fallback restored   -> the un-adjudicated census fails;
  * the whole-block native guard reverted -> the native-support check fails.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_typography_element_route.py -q -p no:cacheprovider
"""
from __future__ import annotations

import json
import re
import sqlite3
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from converter.context import Ctx, Decl
from converter.db import db_lookup
from converter.db.db_lookup import SGS_DB
from converter.entry import convert_section
from converter.models import GAP, Write
from converter.resolvers import typography
from converter.services import content_gap_collector as gap_collector

_PROPS = tuple(sorted(db_lookup._TYPO_LIFT_TYPOGRAPHY_CSS_PROPS))
_BASE_TIER = "(css_tier IS NULL OR css_tier = 'desktop') AND css_state IS NULL"
_VALUES = {"font-size": "13px", "line-height": "1.4", "letter-spacing": "0.04em", "font-weight": "600",
           "font-style": "italic", "text-align": "center", "text-decoration": "underline",
           "text-transform": "uppercase"}


# ---------------------------------------------------------------------------
# The census, built from the DB
# ---------------------------------------------------------------------------

def _reference_root_answer(conn: sqlite3.Connection, block: str, prop: str) -> "str | None":
    """The PREVIOUS ``attr_for_typography_property``, frozen: root-domain rows only, ambiguity -> None."""
    clause, params = db_lookup._root_domain_element_clause(block)
    rows = conn.execute(
        f"SELECT attr_name FROM block_attributes WHERE block_slug = ? AND css_property = ? AND ({clause}) "
        f"AND {_BASE_TIER} ORDER BY rowid",
        (block, prop, *params),
    ).fetchall()
    return rows[0][0] if len(rows) == 1 else None


def _first_version_native(conn: sqlite3.Connection, block: str, prop: str) -> bool:
    """The FIRST version's per-property native-support test, frozen (the negative control's reference)."""
    row = conn.execute(
        "SELECT support_value FROM block_supports WHERE block_slug = ? AND support_name = 'typography' "
        "AND COALESCE(is_stale, 0) = 0", (block,)).fetchone()
    camel = re.sub(r"-([a-z])", lambda m: m.group(1).upper(), prop)
    return bool(row and json.loads(row[0]).get(camel))


def _block_native(conn: sqlite3.Connection, block: str) -> bool:
    """Independent restatement of the whole-block rule (any truthy control key, __experimental* prefix dropped)."""
    row = conn.execute(
        "SELECT support_value FROM block_supports WHERE block_slug = ? AND support_name = 'typography' "
        "AND COALESCE(is_stale, 0) = 0", (block,)).fetchone()
    if not row:
        return False
    skip = {"skipSerialization", "defaultControls", "fluid"}
    for key, val in json.loads(row[0]).items():
        bare = re.sub(r"^_+(?:experimental)?", "", key)
        if val and (bare[:1].lower() + bare[1:]) not in skip:
            return True
    return False


def _classify(conn: sqlite3.Connection, native: str = "block", fallback: bool = False) -> dict:
    """{(block, prop): {kind, ...}} for every block declaring a base-tier row for a sink property.

    kind: 'root' (a root-domain row exists), 'has_global' (no root row but the block declares the global-pick
    attr itself), 'native' (the block enables WP-native typography support: its wrapper-level home, so the
    element route stays out), 'none', 'authoritative' (block_selectors names exactly one element attr) or
    'unadjudicated' (element attrs exist and nothing names one: a GAP; ``multi`` says whether several).

    ``native='property'`` + ``fallback=True`` reproduces the FIRST version (per-property native test, "the one
    attr the block declares" fallback) so the census can say which pairs used to route.
    """
    global_pick = {c: p for c, p, _u in db_lookup.typography_css_to_attrs()}
    selectors: dict[str, set[str]] = {}
    for slug, sel in conn.execute("SELECT block_slug, selector FROM block_selectors WHERE element = 'typography'"):
        selectors.setdefault(slug, set()).update(p.strip() for p in sel.split(",") if p.strip())
    out: dict = {}
    marks = ",".join("?" for _ in _PROPS)
    pairs = conn.execute(
        f"SELECT DISTINCT block_slug, css_property FROM block_attributes WHERE css_property IN ({marks})", _PROPS
    ).fetchall()
    for block, prop in pairs:
        clause, params = db_lookup._root_domain_element_clause(block)
        root = conn.execute(
            f"SELECT 1 FROM block_attributes WHERE block_slug = ? AND css_property = ? AND ({clause}) "
            f"AND {_BASE_TIER} LIMIT 1", (block, prop, *params)).fetchone()
        if root:
            out[(block, prop)] = {"kind": "root"}
            continue
        if conn.execute("SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
                        (block, global_pick[prop])).fetchone():
            out[(block, prop)] = {"kind": "has_global"}
            continue
        if (_block_native(conn, block) if native == "block" else _first_version_native(conn, block, prop)):
            out[(block, prop)] = {"kind": "native"}
            continue
        rows = conn.execute(
            f"SELECT attr_name, css_element, derived_selector FROM block_attributes WHERE block_slug = ? "
            f"AND css_property = ? AND role = 'typography' AND NOT ({clause}) AND {_BASE_TIER} ORDER BY rowid",
            (block, prop, *params)).fetchall()
        if not rows:
            out[(block, prop)] = {"kind": "none"}
            continue
        names = [r[0] for r in rows]
        bem = {m.group(1) for sel in selectors.get(block, set()) for m in re.finditer(r"__([a-z0-9-]+)", sel)}
        named = [r[0] for r in rows
                 if selectors.get(block, set()) & {p.strip() for p in (r[2] or "").split(",") if p.strip()}
                 or (r[1] and r[1] in bem)]
        if len(named) == 1:
            out[(block, prop)] = {"kind": "authoritative", "attr": named[0], "names": names}
        elif fallback and len(rows) == 1:
            out[(block, prop)] = {"kind": "authoritative", "attr": names[0], "names": names}  # first-version route
        else:
            out[(block, prop)] = {"kind": "unadjudicated", "names": names, "multi": len(names) > 1}
    return out


@pytest.fixture(scope="module")
def conn():
    c = sqlite3.connect(f"file:{SGS_DB}?mode=ro", uri=True)
    yield c
    c.close()


@pytest.fixture(scope="module")
def census(conn):
    return _classify(conn)


def _violations(census: dict, conn: sqlite3.Connection, pick, kinds: tuple[str, ...]) -> list[str]:
    """Every (block, prop) of the given kinds whose ``pick`` answer disagrees with the DB-derived expectation."""
    bad: list[str] = []
    for (block, prop), info in sorted(census.items()):
        if info["kind"] not in kinds:
            continue
        got = pick(block, prop)
        if info["kind"] in ("root", "has_global", "none", "native"):
            want = _reference_root_answer(conn, block, prop)
        elif info["kind"] == "authoritative":
            want = info["attr"]
        else:
            want = None
        if got != want:
            bad.append(f"{block} {prop}: got {got!r}, want {want!r} ({info['kind']})")
    return bad


def _live(block: str, prop: str) -> "str | None":
    return db_lookup.attr_for_typography_property.__wrapped__(block, prop)


def _resolve(conn: sqlite3.Connection, block: str, prop: str, value: "str | None" = None):
    return typography.resolve(Decl(prop, value or _VALUES[prop], "Base"),
                              Ctx(block, "content", 0, None, None, None, False, None, conn))


# ---------------------------------------------------------------------------
# The census itself (live implementation)
# ---------------------------------------------------------------------------

def test_the_census_has_every_class_of_block(census):
    """Guard the guard: a vacuous census (an empty class) would make every check below pass for nothing."""
    kinds = {i["kind"] for i in census.values()}
    assert {"root", "has_global", "native", "authoritative", "unadjudicated"} <= kinds
    assert any(i["kind"] == "unadjudicated" and not i["multi"] for i in census.values())
    assert any(i["kind"] == "unadjudicated" and i["multi"] for i in census.values())


def test_blocks_with_a_root_level_attr_their_own_global_pick_or_native_support_are_unchanged(census, conn):
    assert _violations(census, conn, _live, ("root", "has_global", "none", "native")) == []


def test_a_block_whose_block_selectors_row_names_its_text_element_routes_to_it(census, conn):
    assert _violations(census, conn, _live, ("authoritative",)) == []


def test_a_block_with_no_authoritative_primary_text_signal_gets_no_pick_and_the_resolver_gap_names_candidates(
        census, conn):
    """Covers the single-candidate blocks (nav-drawer's ``closeFontSize``) AND the several-candidate ones."""
    assert _violations(census, conn, _live, ("unadjudicated",)) == []
    seen = 0
    for (block, prop), info in census.items():
        if info["kind"] != "unadjudicated":
            continue
        assert list(db_lookup.typography_element_candidates(block, prop)) == info["names"]
        out = _resolve(conn, block, prop)
        assert isinstance(out, GAP), (block, prop, out)
        assert all(n in out.detail for n in info["names"]), out.detail
        seen += 1
    assert seen >= 60  # a collapse to a handful would mean the census went vacuous


def test_every_previously_routed_but_unadjudicated_pair_is_now_a_gap(census, conn):
    """The first version routed 80 pairs; only the selector-adjudicated ones (21) may still route."""
    old = _classify(conn, native="property", fallback=True)
    lost = sorted(k for k, i in old.items() if i["kind"] == "authoritative"
                  and census[k]["kind"] != "authoritative")
    assert len(lost) >= 55, len(lost)
    for block, prop in lost:
        assert census[(block, prop)]["kind"] in ("unadjudicated", "native"), (block, prop)
        assert _live(block, prop) is None
        assert isinstance(_resolve(conn, block, prop), GAP), (block, prop)
    # the reviewer's named cases, spelled out
    assert {("sgs/nav-drawer", "font-size"), ("sgs/media", "font-size"), ("sgs/quote", "letter-spacing"),
            ("sgs/before-after", "font-size"), ("sgs/nav-bar-menu", "text-align"),
            ("sgs/nav-drawer-menu", "text-align")} <= set(lost)


def test_every_still_routed_pair_writes_the_chosen_attr_through_the_real_resolver(census, conn):
    routed = [(k, i) for k, i in sorted(census.items()) if i["kind"] == "authoritative"]
    assert {b for (b, _p), _i in routed} >= {"sgs/trust-bar", "sgs/option-picker"}
    assert len(routed) >= 14  # trust-bar + option-picker, 7 sink properties each
    for (block, prop), info in routed:
        out = _resolve(conn, block, prop)
        writes = out if isinstance(out, list) else [out]
        if isinstance(out, GAP):
            # An honest gap is allowed only when the chosen attr rejects THIS value (an enum that lacks it).
            assert repr(info["attr"]) in out.detail, (block, prop, out)
            continue
        assert all(isinstance(w, Write) for w in writes), (block, prop, out)
        assert writes[0].attr == info["attr"], (block, prop, writes[0].attr, info["attr"])


def test_the_census_counts_for_the_report(census, conn, capsys):
    from collections import Counter
    old = _classify(conn, native="property", fallback=True)
    c = Counter(i["kind"] for i in census.values())
    o = Counter(i["kind"] for i in old.values())
    routed = {b for (b, _p), i in census.items() if i["kind"] == "authoritative"}
    lost_blocks = {b for (b, p), i in old.items() if i["kind"] == "authoritative"
                   and census[(b, p)]["kind"] != "authoritative"} - routed
    print(f"\nCENSUS now={dict(c)} first_version={dict(o)} routed_blocks={sorted(routed)} "
          f"blocks_that_lost_the_route={sorted(lost_blocks)}")
    assert c["authoritative"] > 0 and c["unadjudicated"] > 0


# ---------------------------------------------------------------------------
# The whole-block native-support guard (finding 2), on synthetic supports rows
# ---------------------------------------------------------------------------

def _support_conn(value: "dict | None") -> sqlite3.Connection:
    c = sqlite3.connect(":memory:")
    c.execute("CREATE TABLE block_supports (block_slug TEXT, support_name TEXT, support_value TEXT, is_stale INTEGER)")
    if value is not None:
        c.execute("INSERT INTO block_supports VALUES ('x/b', 'typography', ?, 0)", (json.dumps(value),))
    return c


@pytest.mark.parametrize("supports, expected", [
    ({"fontSize": True, "lineHeight": True, "__experimentalSkipSerialization": True}, True),  # sgs/quote's shape
    ({"__experimentalFontFamily": True}, True),                       # experimental spelling, another control
    ({"letterSpacing": True}, True),
    ({"textAlign": True}, True),
    ({"__experimentalSkipSerialization": True}, False),               # a serialisation switch is not a control
    ({"__experimentalDefaultControls": {"fontSize": True}}, False),   # a panel-defaults map is not a control
    ({"fontSize": False, "lineHeight": False}, False),
    ({}, False),
    (None, False),
])
def test_the_native_typography_guard_is_whole_block_and_spelling_robust(supports, expected):
    assert db_lookup._declares_native_typography_support(_support_conn(supports), "x/b") is expected


def _force_selector_naming_first_element(monkeypatch, block: str, prop: str) -> str:
    """Give ``block`` a block_selectors primary-text row naming its first element attr, so ONLY the native guard
    stands between the pair and an element route (isolates the guard from the selector rule)."""
    guard = db_lookup._declares_native_typography_support
    monkeypatch.setattr(db_lookup, "_declares_native_typography_support", lambda *_a: False)
    db_lookup._typography_element_rows.cache_clear()
    rows = db_lookup._typography_element_rows(block, prop)
    monkeypatch.setattr(db_lookup, "_declares_native_typography_support", guard)
    db_lookup._typography_element_rows.cache_clear()
    attr, element, _derived = rows[0]
    sel = f".sgs-x__{element}"
    monkeypatch.setattr(db_lookup, "_typography_primary_selectors",
                        lambda b: (frozenset({sel}), frozenset({element})) if b == block else (frozenset(), frozenset()))
    return attr


@pytest.mark.parametrize("block, prop", [
    ("sgs/quote", "letter-spacing"),   # supports {fontSize, lineHeight}: the citation used to take letter-spacing
    ("sgs/counter", "letter-spacing"),  # supports {fontSize, lineHeight, textAlign}
    ("sgs/quote", "font-size"),
    ("sgs/counter", "font-size"),
])
def test_a_block_with_native_typography_support_never_routes_any_property_to_an_element(conn, monkeypatch, block, prop):
    try:
        _force_selector_naming_first_element(monkeypatch, block, prop)
        assert _live(block, prop) is None
        assert isinstance(_resolve(conn, block, prop), GAP)
    finally:
        monkeypatch.undo()
        db_lookup._typography_element_rows.cache_clear()


def test_negative_control_the_per_property_native_guard_lets_the_other_property_through(conn, monkeypatch):
    """The first version's guard (per property) restored: quote's ``letter-spacing`` (no native key for it) routes
    to the citation, exactly the reviewer's scenario."""
    def per_property(c: sqlite3.Connection, block: str) -> bool:
        return False  # quote has no native letter-spacing key: the per-property test said "not native"

    try:
        attr = _force_selector_naming_first_element(monkeypatch, "sgs/quote", "letter-spacing")
        monkeypatch.setattr(db_lookup, "_declares_native_typography_support", per_property)
        db_lookup._typography_element_rows.cache_clear()
        assert _live("sgs/quote", "letter-spacing") == attr == "attributionLetterSpacing"
    finally:
        monkeypatch.undo()
        db_lookup._typography_element_rows.cache_clear()


# ---------------------------------------------------------------------------
# NEGATIVE CONTROLS -- the same census must reject a broken implementation
# ---------------------------------------------------------------------------

def test_negative_control_widening_off_fails_the_routed_census(census, conn, monkeypatch):
    monkeypatch.setattr(db_lookup, "_typography_element_pick", lambda block, prop: None)
    assert _violations(census, conn, _live, ("authoritative",)) != []
    # ... while the untouched classes still pass, proving the control breaks ONLY the widening.
    assert _violations(census, conn, _live, ("root", "has_global", "none", "native")) == []


def test_negative_control_an_only_candidate_fallback_fails_the_unadjudicated_census(census, conn, monkeypatch):
    """The first version's ``len(rows) == 1`` fallback restored: nav-drawer -> closeFontSize again."""
    real = db_lookup._typography_element_pick

    def only_candidate(block: str, prop: str) -> "str | None":
        got = real(block, prop)
        rows = db_lookup._typography_element_rows(block, prop)
        return got if got is not None else (rows[0][0] if len(rows) == 1 else None)

    monkeypatch.setattr(db_lookup, "_typography_element_pick", only_candidate)
    bad = _violations(census, conn, _live, ("unadjudicated",))
    assert any(b.startswith("sgs/nav-drawer font-size: got 'closeFontSize'") for b in bad), bad[:3]


def test_negative_control_removing_the_ambiguity_guard_fails_the_unadjudicated_census(census, conn, monkeypatch):
    def rowid_first(block: str, prop: str) -> "str | None":
        rows = db_lookup._typography_element_rows(block, prop)
        return rows[0][0] if rows else None

    monkeypatch.setattr(db_lookup, "_typography_element_pick", rowid_first)
    assert _violations(census, conn, _live, ("unadjudicated",)) != []


def test_negative_control_widening_the_root_filter_instead_changes_root_blocks(census, conn, monkeypatch):
    """A widening implemented by loosening the ROOT filter (rather than a separate element route) would move
    root-level answers; the unchanged-class census must catch that."""
    def picks_any_row(block: str, prop: str) -> "str | None":
        row = conn.execute(
            f"SELECT attr_name FROM block_attributes WHERE block_slug = ? AND css_property = ? "
            f"AND {_BASE_TIER} ORDER BY rowid LIMIT 1", (block, prop)).fetchone()
        return row[0] if row else None

    assert _violations(census, conn, picks_any_row, ("root", "has_global", "none", "native")) != []


# ---------------------------------------------------------------------------
# End to end through the converter (draft-agnostic synthetic ticker)
# ---------------------------------------------------------------------------

ROW = '<span class="sgs-trust-bar__item"><span class="sgs-trust-bar__label">Claim {n}</span></span>'
TICKER = '<div class="sgs-trust-bar"><div class="sgs-trust-bar__track">{items}</div></div>'.format(
    items="".join(ROW.format(n=n) for n in range(4)))


@pytest.fixture(autouse=True)
def _clean_gaps():
    gap_collector.clear()
    yield
    gap_collector.clear()


def _trust_bar(css: str) -> dict:
    res = convert_section(html=TICKER, css=css, media_map={}, boundary_id="b1", section_id="s1")
    m = re.search(r"<!-- wp:sgs/trust-bar (\{.*?\}) /?-->", res["block_markup"], re.S)
    assert m, res["block_markup"][:200]
    return json.loads(m.group(1))


def test_a_ticker_container_font_size_and_letter_spacing_land_on_the_label_attrs():
    a = _trust_bar(".sgs-trust-bar{font-size:12.5px;letter-spacing:.04em}")
    assert a["labelFontSize"] == {"desktop": 12.5} and a["labelFontSizeUnit"] == "px"
    assert a["labelLetterSpacing"] == {"desktop": 0.04} and a["labelLetterSpacingUnit"] == "em"
    assert not [k for k in a if k.startswith("title")]  # the block's title element is not the primary text


def test_the_other_inheritable_text_properties_follow_the_same_route():
    a = _trust_bar(".sgs-trust-bar{font-weight:600;text-transform:uppercase;line-height:1.4}")
    assert (a["labelFontWeight"], a["labelTextTransform"]) == ("600", "uppercase")
    assert a["labelLineHeight"] == {"desktop": 1.4}


def test_a_device_tier_container_value_lands_in_the_tier_object():
    a = _trust_bar(".sgs-trust-bar{font-size:12.5px}@media (max-width:767px){.sgs-trust-bar{font-size:11px}}")
    assert a["labelFontSize"] == {"desktop": 12.5, "mobile": 11}


def test_an_element_level_declaration_for_the_same_property_wins_over_the_container_one():
    """CSS specificity: the label's own rule beats the inherited container value. The content lift's write
    replaces the container-routed one (assembly: content wins collision) -- no DESTINATION COLLISION is raised."""
    a = _trust_bar(".sgs-trust-bar{font-size:12.5px}.sgs-trust-bar__label{font-size:14px}")
    assert a["labelFontSize"] == {"desktop": 14}


def test_the_colour_pair_is_not_in_the_element_route():
    """background-color is not inherited, and colour has its own element naming: neither may be routed here."""
    for prop in ("background-color", "color"):
        assert db_lookup.typography_element_candidates("sgs/trust-bar", prop) == ()


# ---------------------------------------------------------------------------
# The real Eye Care ticker (skips when the local run artefacts are absent)
# ---------------------------------------------------------------------------

REPO = Path(__file__).resolve().parents[5]
RUN = REPO / "pipeline-state" / "eye-care-ward-end-eye-care-birmingham-2026-09-21-134838"
needs_run = pytest.mark.skipif(
    not (RUN / "tagged-mockup.html").exists() or not (RUN / "script-bindings.json").exists(),
    reason="needs the local Eye Care run artefacts in pipeline-state",
)


@needs_run
def test_the_real_eye_care_ticker_carries_its_font_size_and_letter_spacing():
    soup = BeautifulSoup((RUN / "tagged-mockup.html").read_text(encoding="utf-8"), "html.parser")
    css = "\n\n".join(t.get_text() for t in soup.find_all("style"))
    variation = RUN / "variation-d0-d2.css"
    if variation.exists() and variation.read_text(encoding="utf-8").strip():
        css += "\n\n" + variation.read_text(encoding="utf-8")
    bindings = json.loads((RUN / "script-bindings.json").read_text(encoding="utf-8"))["resolved"]
    el = BeautifulSoup(str(soup.find(class_="sgs-trust-bar")), "html.parser").find()
    del el["data-sgs-boundary-id"]
    res = convert_section(html=str(el), css=css, media_map={}, boundary_id="b1", section_id="s1", tier_bindings=bindings)
    m = re.search(r"<!-- wp:sgs/trust-bar (\{.*?\}) /?-->", res["block_markup"], re.S)
    t = json.loads(m.group(1))
    assert t["labelFontSize"] == {"desktop": 12.5} and t["labelFontSizeUnit"] == "px"
    assert t["labelLetterSpacing"] == {"desktop": 0.04} and t["labelLetterSpacingUnit"] == "em"
    assert "titleFontSize" not in t and "titleLetterSpacing" not in t
    # the siblings that always landed are still there (nothing displaced)
    assert t["textColour"] == "#FAF8F5" and t["backgroundColour"] == "#141414"
