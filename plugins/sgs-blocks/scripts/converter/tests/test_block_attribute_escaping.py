"""test_block_attribute_escaping.py — SECURITY regression guard for the WP block
comment boundary (found 2026-09-04 by an adversarial-council abuse-red-team review).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_block_attribute_escaping.py

The defect: every `<!-- wp:… {json} -->` emitter serialised its attrs with plain
``json.dumps``, which escapes only JSON-structural characters. An attribute VALUE
containing ``-->`` therefore CLOSED the HTML comment early, and everything after
it landed in stored ``post_content`` as raw, unparsed HTML — arbitrary
``<script>`` executing in wp-admin and on the public frontend (stored-XSS class).

WP core prevents this in ``serialize_block_attributes()`` (wp-includes/blocks.php)
by escaping ``\\``, ``--``, ``<``, ``>``, ``&`` and ``\\"`` to ``\\uXXXX`` inside
the encoded JSON. These tests pin that behaviour at all three emit/re-emit sites.

Every escaping test is paired with a NEGATIVE CONTROL asserting the unescaped
form really does breach the comment — without it these assertions could pass
against a payload that was never dangerous.
"""
from __future__ import annotations

import json

from converter.block_serialization import serialize_block_attributes
from converter.db.db_lookup import _emit_wp_block_markup
from converter.dispatch_spine import emit_block_markup
from converter.services.section_passes import ensure_root_section_class

# The attack value: closes the comment, then injects live markup.
ATTACK = '--> <script>alert(document.cookie)</script> <!-- '
ATTACK_ATTRS = {"className": ATTACK}


# -- negative controls: prove the payload is genuinely dangerous unescaped ----

def test_negative_control_plain_json_dumps_breaches_the_comment():
    """Without core's escaping the payload DOES terminate the comment early."""
    naive = json.dumps(ATTACK_ATTRS, separators=(",", ":"))
    naive_markup = f"<!-- wp:sgs/container {naive} /-->"
    # The first "-->" is the injected one, not the emitter's terminator.
    assert naive_markup.index("-->") < len(naive_markup) - len("/-->")
    assert "<script>" in naive_markup.split("-->", 1)[1]


def test_negative_control_plain_json_dumps_leaves_raw_angle_brackets():
    naive = json.dumps(ATTACK_ATTRS, separators=(",", ":"))
    assert "<script>" in naive
    assert "--" in naive


# -- serialize_block_attributes: matches core, round-trips --------------------

def test_serializer_escapes_every_comment_breaking_character():
    out = serialize_block_attributes(ATTACK_ATTRS)
    for forbidden in ("--", "<", ">", "&"):
        assert forbidden not in out, f"{forbidden!r} survived escaping: {out}"


def test_serializer_round_trips_the_value_unchanged():
    """Escaping must be lossless — WP_Block_Parser decodes back to the original."""
    out = serialize_block_attributes(ATTACK_ATTRS)
    assert json.loads(out) == ATTACK_ATTRS


def test_serializer_matches_wp_core_output_byte_for_byte():
    """Pinned against core's serialize_block_attributes() escape map + order."""
    assert serialize_block_attributes({"a": "a--b<c>d&e"}) == (
        '{"a":"a\\u002d\\u002db\\u003cc\\u003ed\\u0026e"}'
    )
    # Backslash consumed before the escaped-quote rule (core's strtr ordering).
    assert serialize_block_attributes({"a": '\\"'}) == '{"a":"\\u005c\\u0022"}'
    assert json.loads(serialize_block_attributes({"a": '\\"'})) == {"a": '\\"'}


def test_serializer_unicode_mode_does_not_affect_the_escaping():
    """ensure_ascii is a cosmetic knob; both modes are equally comment-safe."""
    attrs = {"a": "— " + ATTACK}
    for mode in (True, False):
        out = serialize_block_attributes(attrs, ensure_ascii=mode)
        for forbidden in ("--", "<", ">", "&"):
            assert forbidden not in out
        assert json.loads(out) == attrs
    assert serialize_block_attributes({"a": "—"}, ensure_ascii=True) == '{"a":"\\u2014"}'
    assert serialize_block_attributes({"a": "—"}, ensure_ascii=False) == '{"a":"—"}'


def test_serializer_leaves_safe_values_untouched():
    assert serialize_block_attributes({"maxWidth": "1200px"}) == '{"maxWidth":"1200px"}'
    assert serialize_block_attributes({"columns": 3}) == '{"columns":3}'


def test_serializer_escapes_nested_and_list_values():
    attrs = {"items": [{"label": ATTACK}], "box": {"top": ATTACK}}
    out = serialize_block_attributes(attrs)
    for forbidden in ("--", "<", ">", "&"):
        assert forbidden not in out
    assert json.loads(out) == attrs


# -- emit_block_markup (dispatch_spine) --------------------------------------

def _assert_single_terminating_comment(markup: str, closing: str) -> None:
    """The ONLY "-->" in the opening comment is its own terminator."""
    open_comment = markup.split("\n", 1)[0]
    assert open_comment.endswith(closing)
    body = open_comment[: -len(closing)]
    assert "-->" not in body, f"comment breached: {open_comment}"
    assert body.count("<!--") == 1


def test_emit_block_markup_self_closing_survives_the_attack_value():
    markup = emit_block_markup("sgs/container", dict(ATTACK_ATTRS))
    _assert_single_terminating_comment(markup, "/-->")
    assert "<script>" not in markup


def test_emit_block_markup_self_closing_round_trips_the_value():
    markup = emit_block_markup("sgs/container", dict(ATTACK_ATTRS))
    attrs_json = markup[len("<!-- wp:sgs/container ") : -len(" /-->")]
    assert json.loads(attrs_json) == ATTACK_ATTRS


def test_emit_block_markup_with_inner_survives_the_attack_value():
    markup = emit_block_markup("sgs/container", dict(ATTACK_ATTRS), inner="<p>hi</p>")
    _assert_single_terminating_comment(markup, "-->")
    assert markup.endswith("<!-- /wp:sgs/container -->")
    attrs_json = markup.split("\n", 1)[0][len("<!-- wp:sgs/container ") : -len(" -->")]
    assert json.loads(attrs_json) == ATTACK_ATTRS


def test_emit_block_markup_unaffected_for_ordinary_attrs():
    assert emit_block_markup("sgs/container", {"maxWidth": "1200px"}) == (
        '<!-- wp:sgs/container {"maxWidth":"1200px"} /-->'
    )


# -- _emit_wp_block_markup (db_lookup) ---------------------------------------

def test_db_lookup_emitter_self_closing_survives_the_attack_value():
    markup = _emit_wp_block_markup("sgs/container", dict(ATTACK_ATTRS), [])
    _assert_single_terminating_comment(markup, "/-->")
    assert "<script>" not in markup
    attrs_json = markup[len("<!-- wp:sgs/container ") : -len(" /-->")]
    assert json.loads(attrs_json) == ATTACK_ATTRS


def test_db_lookup_emitter_with_children_survives_the_attack_value():
    markup = _emit_wp_block_markup(
        "sgs/container", dict(ATTACK_ATTRS), ["<!-- wp:sgs/text /-->"]
    )
    _assert_single_terminating_comment(markup, "-->")
    assert markup.endswith("<!-- /wp:sgs/container -->")


def test_db_lookup_emitter_unaffected_for_ordinary_attrs():
    assert _emit_wp_block_markup("sgs/container", {"widthMode": "full"}, []) == (
        '<!-- wp:sgs/container {"widthMode":"full"} /-->'
    )


# -- ensure_root_section_class (re-emit path must not strip the escaping) -----

def test_section_class_pass_preserves_escaping_on_re_emit():
    """json.loads DECODES the escapes; the re-emit must re-apply them."""
    markup = emit_block_markup("sgs/container", dict(ATTACK_ATTRS))
    out = ensure_root_section_class(markup, "hero")
    _assert_single_terminating_comment(out, "/-->")
    assert "<script>" not in out
    attrs_json = out[len("<!-- wp:sgs/container ") : -len(" /-->")]
    decoded = json.loads(attrs_json)
    # .strip() is this pass's own pre-existing className normalisation (it trims the
    # payload's trailing space); the VALUE is otherwise decoded back verbatim.
    assert decoded["className"] == ("sgs-hero " + ATTACK).strip()


def test_section_class_pass_unaffected_for_ordinary_attrs():
    markup = '<!-- wp:sgs/container {"maxWidth":"1200px"} /-->'
    assert ensure_root_section_class(markup, "hero") == (
        '<!-- wp:sgs/container {"maxWidth":"1200px","className":"sgs-hero"} /-->'
    )
