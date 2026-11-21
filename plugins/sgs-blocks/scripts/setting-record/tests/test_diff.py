"""The diff's CSS reader and its data-attribute rule."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import diff as D  # noqa: E402


def test_must_fail_media_nested_in_a_rule_keeps_its_condition():
    # Breaks if a media query nested inside a rule were read as always on (the scanner's reader does that).
    rows = D.read_css('.a{color:red;@media (forced-colors:active){&:not(:focus-visible){outline:1px solid}}}')
    assert ('.a:not(:focus-visible)', 'outline:1px solid', '@media (forced-colors:active)') in rows
    assert not any(sel == '.a:not(:focus-visible)' and media == '' for sel, _, media in rows)


def test_flat_and_one_level_nesting_read_as_the_scanner_does():
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'block-source-scan'))
    from css_read import parse_css
    css = '@media (max-width:767px){.a{color:red}} .b{color:blue; .c{margin:0}} .d:hover{x:y}'
    assert D.read_css(css) == parse_css(css)


def test_must_fail_data_attribute_change_places_only_tests_that_move():
    # Breaks if every rule naming the attribute were placed: a marquee rule cannot match when the value becomes
    # "magnet", so a magnet switch must not place it.
    assert not D.attr_test_moves('[data-sgs-fx~="marquee"] .x', 'data-sgs-fx', {('', 'magnet')})
    assert D.attr_test_moves('[data-sgs-fx~="magnet"] .x', 'data-sgs-fx', {('', 'magnet')})
    assert D.attr_test_moves('.a[data-open]', 'data-open', {(None, '')})
    assert D.attr_test_moves('.a:not([data-x="1"])', 'data-x', {('1', '2')})
