"""extract.py::drop_inherited_heading_colour — a heading colour equal to the body text colour is dropped
so headings inherit their section's colour; a distinct heading colour is a design choice and stays."""
from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import extract  # noqa: E402


def _snap(body: str, heading_colour: dict | None) -> dict:
    heading = {"typography": {"fontWeight": "500"}}
    if heading_colour is not None:
        heading["color"] = heading_colour
    return {"styles": {"color": {"text": body}, "elements": {"heading": heading}}}


def test_equal_to_body_is_dropped():
    trace: list = []
    snap = extract.drop_inherited_heading_colour(
        _snap("var:preset|color|text", {"text": "var:preset|color|text"}), trace)
    assert "color" not in snap["styles"]["elements"]["heading"]
    assert snap["styles"]["elements"]["heading"]["typography"] == {"fontWeight": "500"}
    assert trace and trace[0]["what"] == "styles.elements.heading.color.text"


def test_distinct_colour_is_kept():
    """Negative control: a real heading colour must survive, or the rule would erase design choices."""
    trace: list = []
    snap = extract.drop_inherited_heading_colour(
        _snap("var:preset|color|text", {"text": "var:preset|color|primary"}), trace)
    assert snap["styles"]["elements"]["heading"]["color"] == {"text": "var:preset|color|primary"}
    assert trace == []


def test_other_colour_keys_survive():
    snap = extract.drop_inherited_heading_colour(
        _snap("#141414", {"text": "#141414", "background": "#fff"}), [])
    assert snap["styles"]["elements"]["heading"]["color"] == {"background": "#fff"}


def test_no_heading_or_no_body_is_a_no_op():
    assert extract.drop_inherited_heading_colour({"styles": {}}, []) == {"styles": {}}
    snap = _snap("", {"text": "#141414"})
    assert extract.drop_inherited_heading_colour(snap, [])["styles"]["elements"]["heading"]["color"] == {
        "text": "#141414"}
