"""Tests for orchestrator/breakpoint_snap.py: Bean's breakpoint rule (D1129 / D1132). Pure Python, no node.

Run from plugins/sgs-blocks/scripts:
    python -m pytest tests/test_breakpoint_snap.py -q -p no:cacheprovider
"""
from __future__ import annotations

import pathlib
import sys

import pytest

_SCRIPTS = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_SCRIPTS / "orchestrator"))

import breakpoint_snap as bs  # noqa: E402

E = (768, 1024)


@pytest.mark.parametrize("value, declared, expected", [
    (760, False, 768),     # within 10px of the tablet edge
    (768, False, 768),     # already on it: not a change
    (778, False, 768),     # exactly 10px above
    (779, False, 779),     # 11px above: left alone (negative control for the tolerance)
    (1015, False, 1024),
    (1010, False, 1010),   # 14px away, not declared: left alone
    (700, True, 768),      # declared flag between 640 and 768
    (700, False, 700),     # the same number in an ordinary expression is NOT a flag: left alone
    (640, True, 768),      # the floor is inclusive
    (639, True, 639),      # below the floor: a phone-sized change, left alone
    (400, True, 400),
    (1060, True, 1060),    # above the desktop edge: never moved
    (1280, True, 1280),
])
def test_snap_threshold(value: int, declared: bool, expected: int) -> None:
    assert bs.snap_threshold(value, declared, E)[0] == expected


def test_a_snap_says_why_and_a_no_op_says_nothing() -> None:
    assert "within 10px" in bs.snap_threshold(760, False, E)[1]
    assert "declared width flag" in bs.snap_threshold(700, True, E)[1]
    assert bs.snap_threshold(1280, True, E)[1] == ""


def test_expression_rewrite_reports_the_band_where_the_clone_will_differ() -> None:
    new, rows = bs.snap_expression("effW < 760", "effW", True, E)
    assert new == "effW < 768"
    assert rows[0]["draft"] == 760 and rows[0]["snapped"] == 768 and rows[0]["differs_from_draft_between"] == [760, 767]
    new, rows = bs.snap_expression("effW >= 700", "effW", True, E)          # the other direction
    assert new == "effW >= 768" and rows[0]["differs_from_draft_between"] == [700, 767]


def test_only_the_width_variable_is_rewritten() -> None:
    new, rows = bs.snap_expression("other < 760 ? 1 : effW < 1500", "effW", True, E)
    assert new == "other < 760 ? 1 : effW < 1500" and rows == []


def test_declared_flag_detection() -> None:
    assert bs.is_declared_flag("effW < 700", "effW")
    assert bs.is_declared_flag("effW >= 768 && effW < 1024", "effW")
    assert bs.is_declared_flag("(effW < 600) || (effW >= 1300)", "effW")
    assert not bs.is_declared_flag("mobile || tablet", "effW")               # no width comparison
    assert not bs.is_declared_flag("effW < 700 ? 'a' : 'b'", "effW")         # a value, not a flag
    assert not bs.is_declared_flag("effW - 48", "effW")


SCRIPT = """
class C { renderVals(){
  const S = this.state;
  const effW = mobilePreview ? 390 : S.w;
  const mobile = effW < 768, lensStack = effW < 700, gridWide = effW >= 1280, drawer = effW < 1060;
  return { a: lensStack ? 1 : 2 };
} }
"""


def test_the_width_variable_is_found_by_what_it_reads_not_by_its_name() -> None:
    assert bs.find_width_read(SCRIPT)[0] == "effW"
    assert bs.find_width_read(SCRIPT.replace("effW", "vw"))[0] == "vw"
    assert bs.find_width_read("const a = 1;") is None


def test_snap_scope_moves_only_what_the_rule_allows() -> None:
    decls = [("effW", "mobilePreview ? 390 : S.w", 0), ("mobile", "effW < 768", 1), ("lensStack", "effW < 700", 2),
             ("gridWide", "effW >= 1280", 3), ("drawer", "effW < 1060", 4)]
    new_decls, new_binds, rows = bs.snap_scope(
        decls, {"t": "effW >= 1010 ? 4 : effW >= 820 ? 3 : 2", "p": "effW < 1015 ? 1 : 2"}, "effW", E)
    by_name = {n: e for n, e, _ in new_decls}
    assert by_name["lensStack"] == "effW < 768"
    assert by_name["drawer"] == "effW < 1060" and by_name["gridWide"] == "effW >= 1280"
    assert new_binds["t"] == "effW >= 1010 ? 4 : effW >= 820 ? 3 : 2"        # 14px and 52px away: untouched
    assert new_binds["p"] == "effW < 1024 ? 1 : 2"                           # 9px away: snapped even outside a flag
    assert {(r["in"], r["draft"], r["snapped"]) for r in rows} == {("lensStack", 700, 768), ("p", 1015, 1024)}


def test_no_width_variable_changes_nothing() -> None:
    decls = [("a", "x < 700", 0)]
    assert bs.snap_scope(decls, {"b": "y < 760"}, None, E) == (decls, {"b": "y < 760"}, [])


@pytest.mark.parametrize("expr, expected", [
    ("effW <= 767", "effW <= 767"),      # already on the 768 edge: the inclusive operator must not be moved
    ("effW > 767", "effW > 767"),
    ("effW <= 1023", "effW <= 1023"),
    ("effW <= 760", "effW <= 767"),      # 8px short of the edge: the flip point (761) snaps to 768, written as <= 767
    ("effW > 760", "effW > 767"),
    ("effW < 760", "effW < 768"),
    ("effW >= 760", "effW >= 768"),
])
def test_the_operator_decides_where_a_threshold_flips(expr: str, expected: str) -> None:
    assert bs.snap_expression(expr, "effW", False, E)[0] == expected


def test_the_reported_band_is_the_widths_that_really_change_for_every_operator() -> None:
    for expr, band in (("effW < 760", [760, 767]), ("effW <= 760", [761, 767]), ("effW > 760", [761, 767]),
                       ("effW >= 1020", [1020, 1023])):
        rows = bs.snap_expression(expr, "effW", False, E)[1]
        assert rows[0]["differs_from_draft_between"] == band, expr
        # the band is exactly where the draft's expression and the snapped one disagree
        new = bs.snap_expression(expr, "effW", False, E)[0]
        disagree = [w for w in range(700, 1100) if eval(expr.replace("effW", str(w))) != eval(new.replace("effW", str(w)))]
        assert [disagree[0], disagree[-1]] == band and len(disagree) == band[1] - band[0] + 1, expr


def test_a_width_read_of_another_object_is_not_taken_for_the_viewport_width() -> None:
    script = "const g = grid.w * 2; const effW = S.w; const mob = effW < 760;"
    assert bs.find_width_read(script)[0] == "effW"
    assert bs.find_width_read("const g = grid.w * 2;")[0] == "g"       # nothing compared: the first candidate stands
