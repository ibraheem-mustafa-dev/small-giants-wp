"""
test_list_pairing.py
====================
Tests for the core/list -> sgs/icon-list migration pairing
(scripts/migrate-core-blocks/pairings/list_pairing.py) through the shared
engine (driver.transform_text), so the anti-silent-discard gate and the
terminating invariant run on every case.

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_list_pairing.py -v

UK English throughout.
"""

from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path

import pytest

sys.stdout.reconfigure(encoding="utf-8")

MIG = Path(__file__).resolve().parents[1] / "migrate-core-blocks"
sys.path.insert(0, str(MIG))

import driver  # noqa: E402
from block_parser import parse_blocks, walk  # noqa: E402

LIST = importlib.import_module("pairings.list_pairing")
LIST_ITEM = importlib.import_module("pairings.list_item_pairing")
DECLARED = driver.load_target_schema("sgs/icon-list")


def migrate(markup: str):
    """Run the core/list pairing over markup; return (new_text, log)."""
    return driver.transform_text(markup, "fixture", "core/list", LIST, DECLARED)


def icon_lists(text: str) -> list[dict]:
    return [n.attrs for n in walk(parse_blocks(text, "out")) if n.name == "sgs/icon-list"]


def core_nodes(text: str, name: str) -> int:
    return sum(1 for n in walk(parse_blocks(text, "out")) if n.name == name)


PRICING = (
    '<!-- wp:list {"style":{"spacing":{"blockGap":"var:preset|spacing|10"}},"textColor":"text-muted"} -->\n'
    '<ul class="has-text-muted-color has-text-color"><!-- wp:list-item -->\n'
    "<li>Up to 5 pages</li>\n"
    "<!-- /wp:list-item --><!-- wp:list-item -->\n"
    "<li>Mobile <strong>responsive</strong> &amp; fast</li>\n"
    "<!-- /wp:list-item --></ul>\n"
    "<!-- /wp:list -->"
)

FOOTER = (
    '<!-- wp:list {"style":{"typography":{"lineHeight":"2"},"spacing":{"padding":{"left":"0"}}},'
    '"textColor":"text-inverse","fontSize":"small","className":"is-style-no-bullets footer-links"} -->\n'
    '<ul style="padding-left:0;line-height:2" class="is-style-no-bullets footer-links"><!-- wp:list-item -->\n'
    '<li><a href="/about/">About Us</a></li>\n'
    "<!-- /wp:list-item --><!-- wp:list-item -->\n"
    '<li><a href="https://example.com/" target="_blank" rel="noreferrer noopener">Partner</a></li>\n'
    "<!-- /wp:list-item --><!-- wp:list-item -->\n"
    '<li><a href="/a/">One</a> and <a href="/b/">two</a></li>\n'
    "<!-- /wp:list-item --></ul>\n"
    "<!-- /wp:list -->"
)


def test_pairing_is_registered_in_the_replacement_map():
    replaces = driver.load_replaces_map(driver.DEFAULT_DB)
    assert replaces.get("core/list") == "sgs/icon-list"
    assert replaces.get("core/list-item") == "sgs/icon-list"
    # driver.py and lint-page.py find a pairing by this naming convention.
    for core in ("core/list", "core/list-item"):
        name = "pairings." + core.split("/", 1)[1].replace("-", "_") + "_pairing"
        assert hasattr(importlib.import_module(name), "transform")


def test_unordered_list_maps_every_item_text_and_style():
    out, log = migrate(PRICING)
    assert [e["action"] for e in log] == ["swapped"]
    assert core_nodes(out, "core/list") == 0 and core_nodes(out, "core/list-item") == 0
    (attrs,) = icon_lists(out)
    assert attrs["items"] == [
        {"text": "Up to 5 pages"},
        {"text": "Mobile <strong>responsive</strong> &amp; fast"},
    ]
    assert attrs["markerType"] == "bullet"
    assert attrs["gap"] == "10"
    assert attrs["textColour"] == "text-muted"


def test_single_links_become_item_urls_and_mixed_html_stays_in_text():
    out, _ = migrate(FOOTER)
    (attrs,) = icon_lists(out)
    assert attrs["items"] == [
        {"text": "About Us", "url": "/about/"},
        {"text": "Partner", "url": "https://example.com/", "newTab": True},
        {"text": '<a href="/a/">One</a> and <a href="/b/">two</a>'},
    ]
    assert attrs["markerType"] == "none"
    assert attrs["className"] == "footer-links"
    assert attrs["gap"] == "0"
    assert attrs["padding"] == {"desktop": {"left": "0"}}
    assert attrs["itemLineHeight"] == 2 and attrs["itemLineHeightUnit"] == ""
    assert attrs["itemFontSize"] == {"desktop": "small"}
    assert attrs["textColour"] == "text-inverse"


def test_ordered_list_becomes_numbered():
    markup = (
        '<!-- wp:list {"ordered":true} -->\n<ol><!-- wp:list-item -->\n<li>First</li>\n'
        "<!-- /wp:list-item --></ol>\n<!-- /wp:list -->"
    )
    out, _ = migrate(markup)
    (attrs,) = icon_lists(out)
    assert attrs["markerType"] == "numbered"
    assert attrs["items"] == [{"text": "First"}]


@pytest.mark.parametrize(
    "markup, reason",
    [
        (
            '<!-- wp:list {"ordered":true,"start":3} -->\n<ol start="3"><!-- wp:list-item -->\n'
            "<li>Third</li>\n<!-- /wp:list-item --></ol>\n<!-- /wp:list -->",
            "start",
        ),
        (
            "<!-- wp:list -->\n<ul><!-- wp:list-item -->\n<li>Parent<!-- wp:list -->\n"
            "<ul><!-- wp:list-item -->\n<li>Child</li>\n<!-- /wp:list-item --></ul>\n"
            "<!-- /wp:list --></li>\n<!-- /wp:list-item --></ul>\n<!-- /wp:list -->",
            "nested list",
        ),
    ],
)
def test_unrepresentable_lists_are_refused_and_left_intact(markup, reason):
    out, log = migrate(markup)
    assert out == markup, "a refused list must be left byte-for-byte as it was"
    assert log and all(e["action"] == "REFUSED" for e in log)
    assert any(reason in e["reason"] for e in log)


def test_orphan_list_item_is_refused():
    markup = "<!-- wp:list-item -->\n<li>Alone</li>\n<!-- /wp:list-item -->"
    out, log = driver.transform_text(markup, "fixture", "core/list-item", LIST_ITEM, DECLARED)
    assert out == markup
    assert [e["action"] for e in log] == ["REFUSED"]


def test_item_html_cannot_close_the_block_comment():
    markup = (
        "<!-- wp:list -->\n<ul><!-- wp:list-item -->\n<li>a -- b</li>\n"
        "<!-- /wp:list-item --></ul>\n<!-- /wp:list -->"
    )
    out, _ = migrate(markup)
    assert "a -- b" not in out
    (attrs,) = icon_lists(out)
    assert attrs["items"] == [{"text": "a -- b"}]
    assert json.loads(json.dumps(attrs))["items"][0]["text"] == "a -- b"
