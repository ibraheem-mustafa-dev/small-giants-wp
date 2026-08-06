"""test_link_content_role.py — the `link-content` role (Spec 31 §3.B.0 role library).

GROUND TRUTH for every expectation in this file is
``plugins/sgs-blocks/src/blocks/whatsapp-cta/render.php:54-58``:

    $clean_phone     = preg_replace( '/[^0-9]/', '', $phone_number );
    $encoded_message = $message ? rawurlencode( $message ) : '';
    $wa_url          = 'https://wa.me/' . $clean_phone;
    if ( $encoded_message ) { $wa_url .= '?text=' . $encoded_message; }

So the draft's rendered href is BLOCK LITERAL + OPERATOR VALUE, and the two
templates the behavioural analyser recovers from that source (verified against
the real file, not assumed) are:

    phoneNumber -> 'https://wa.me/{value}'
    message     -> '?text={value}'

The NEGATIVE CONTROLS are the load-bearing half of this file. A silently WRONG
fragment is far worse than no fragment: it would write a mangled phone number
into a client's live WhatsApp button while still looking like a clean clone.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from converter.context import ScalarLift
from converter.services.field_extractors import (
    extract_field_value,
    extract_link_fragment,
)

PHONE_TEMPLATE = "https://wa.me/{value}"
MESSAGE_TEMPLATE = "?text={value}"


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


# ---------------------------------------------------------------------------
# The template is REAL — recovered from the shipped render.php, not invented
# ---------------------------------------------------------------------------

def test_templates_used_here_match_the_shipped_render_php():
    """Pins this suite's templates to the actual block source.

    If someone changes how whatsapp-cta assembles its URL, this fails FIRST and
    names the cause, instead of the extraction tests failing with a confusing
    'fragment mismatch'.
    """
    render_php = (
        Path(__file__).resolve().parents[3]
        / "src" / "blocks" / "whatsapp-cta" / "render.php"
    )
    source = render_php.read_text(encoding="utf-8")
    assert "'https://wa.me/' . $clean_phone" in source, (
        "whatsapp-cta no longer prefixes the phone with 'https://wa.me/' — "
        "the phoneNumber template in this suite is stale"
    )
    assert "'?text=' . $encoded_message" in source, (
        "whatsapp-cta no longer appends '?text=' — the message template is stale"
    )
    assert "rawurlencode( $message )" in source, (
        "whatsapp-cta no longer rawurlencodes the message — the query-fragment "
        "percent-DECODE in extract_link_fragment is no longer the inverse"
    )


# ---------------------------------------------------------------------------
# POSITIVE — both attrs extract from one assembled href
# ---------------------------------------------------------------------------

def test_phone_fragment_extracts_from_full_wa_me_url():
    el = _node(
        '<a class="sgs-whatsapp-cta" '
        'href="https://wa.me/447700900123?text=Hi%20there">Chat</a>'
    )
    assert extract_link_fragment(el, PHONE_TEMPLATE) == "447700900123"


def test_message_fragment_extracts_and_is_percent_decoded():
    el = _node(
        '<a class="sgs-whatsapp-cta" '
        'href="https://wa.me/447700900123?text=Hi%20there">Chat</a>'
    )
    assert extract_link_fragment(el, MESSAGE_TEMPLATE) == "Hi there"


def test_message_fragment_decodes_reserved_characters():
    """rawurlencode()'s inverse — an operator message containing ?, & and # is
    stored decoded, exactly as the block's `message` attribute holds it."""
    el = _node(
        '<a href="https://wa.me/447700900123'
        '?text=Order%20%231%3F%20Yes%20%26%20thanks">Chat</a>'
    )
    assert extract_link_fragment(el, MESSAGE_TEMPLATE) == "Order #1? Yes & thanks"


def test_phone_fragment_stops_at_the_query_delimiter():
    """The path fragment must END at '?' — swallowing the query would store
    '447700900123?text=Hi' as the phone number."""
    el = _node('<a href="https://wa.me/447700900123?text=Hi">Chat</a>')
    assert extract_link_fragment(el, PHONE_TEMPLATE) == "447700900123"


def test_phone_fragment_stops_at_the_hash_delimiter():
    el = _node('<a href="https://wa.me/447700900123#frag">Chat</a>')
    assert extract_link_fragment(el, PHONE_TEMPLATE) == "447700900123"


def test_message_fragment_stops_at_the_next_query_parameter():
    el = _node('<a href="https://wa.me/447700900123?text=Hi&utm=x">Chat</a>')
    assert extract_link_fragment(el, MESSAGE_TEMPLATE) == "Hi"


def test_phone_fragment_extracts_with_no_message_present():
    el = _node('<a href="https://wa.me/447700900123">Chat</a>')
    assert extract_link_fragment(el, PHONE_TEMPLATE) == "447700900123"


def test_fragment_resolves_from_a_descendant_anchor():
    """Mirrors url-href/link-href: the element itself, or its first <a>."""
    el = _node(
        '<div class="sgs-whatsapp-cta">'
        '<a href="https://wa.me/447700900123">Chat</a></div>'
    )
    assert extract_link_fragment(el, PHONE_TEMPLATE) == "447700900123"


def test_suffix_template_is_supported():
    """The capture recovers SUFFIX templates too (`$carrier . 'literal'`), so
    the extractor must bound the fragment on the right-hand literal."""
    el = _node('<a href="https://example.com/u/jane/profile">Jane</a>')
    assert extract_link_fragment(el, "https://example.com/u/{value}/profile") == "jane"


# ---------------------------------------------------------------------------
# NEGATIVE CONTROLS — no value, never a wrong value
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "html,template,why",
    [
        (
            '<a href="/contact">Contact</a>',
            PHONE_TEMPLATE,
            "a relative link is not a wa.me link — must not yield 'contact'",
        ),
        (
            '<a href="https://example.com/447700900123">Call</a>',
            PHONE_TEMPLATE,
            "a DIFFERENT host must not yield the path — the absolute template "
            "is anchored to the start of the href",
        ),
        (
            '<a href="https://wa.me/447700900123">Chat</a>',
            MESSAGE_TEMPLATE,
            "no '?text=' in the href — must not fall back to the phone digits",
        ),
        (
            '<a href="tel:+447700900123">Call</a>',
            PHONE_TEMPLATE,
            "a tel: URL carries the same digits but is not the block's template",
        ),
        (
            '<a href="https://wa.me/">Chat</a>',
            PHONE_TEMPLATE,
            "template literals present but the fragment is EMPTY",
        ),
        (
            '<a href="https://wa.me/447700900123?text=">Chat</a>',
            MESSAGE_TEMPLATE,
            "empty query value — an empty string is not a message",
        ),
        (
            '<span class="sgs-whatsapp-cta">Chat</span>',
            PHONE_TEMPLATE,
            "no anchor anywhere — nothing to subtract a template from",
        ),
        (
            '<a href="javascript:alert(1)">Chat</a>',
            "javascript:{value}",
            "a non-allowlisted scheme is rejected by the shared _safe_href, "
            "exactly as url-href rejects it",
        ),
        (
            '<a href="https://example.com/u/jane">Jane</a>',
            "https://example.com/u/{value}/profile",
            "the suffix literal is absent — the right bound cannot be found",
        ),
    ],
)
def test_negative_control_returns_none_never_a_wrong_fragment(html, template, why):
    assert extract_link_fragment(_node(html), template) is None, why


@pytest.mark.parametrize(
    "template,why",
    [
        (None, "no captured template at all"),
        ("", "empty template"),
        ("https://wa.me/", "template with NO placeholder"),
        ("{value}/{value}", "ambiguous — two placeholders, no single fragment"),
        (12345, "a non-string template (corrupt output_signature)"),
    ],
)
def test_unusable_template_returns_none(template, why):
    el = _node('<a href="https://wa.me/447700900123?text=Hi">Chat</a>')
    assert extract_link_fragment(el, template) is None, why


def test_role_without_a_template_is_a_strict_no_op():
    """The trap the capture commit (580f7885) called out: a DB-only role flip
    with no template must return None, never the whole href."""
    el = _node('<a href="https://wa.me/447700900123?text=Hi">Chat</a>')
    assert extract_field_value(el, "link-content", {}) is None


# ---------------------------------------------------------------------------
# THE SHARED ENTRY POINT — both existing call paths keep working
# ---------------------------------------------------------------------------

def test_link_content_dispatches_through_the_shared_entry_point():
    el = _node('<a href="https://wa.me/447700900123?text=Hi">Chat</a>')
    assert extract_field_value(
        el, "link-content", {}, link_template=PHONE_TEMPLATE
    ) == "447700900123"


def test_three_positional_args_still_work_for_every_other_role():
    """array_content (`extract_field_value(match, frole, media_map)`) and
    scalar_content call this with THREE positional args. The template is a
    keyword-defaulted 4th parameter precisely so neither path changes."""
    el = _node('<p class="x">Hello <strong>world</strong></p>')
    assert extract_field_value(el, "text-content", {}) == "Hello <strong>world</strong>"
    link = _node('<a href="https://example.com/x">x</a>')
    assert extract_field_value(link, "link-href", {}) == "https://example.com/x"
    assert extract_field_value(link, "url-href", {}) == "https://example.com/x"


def test_link_href_still_returns_the_whole_url_unchanged():
    """The new role must not alter the existing whole-value roles: link-href on
    the SAME element still returns the complete assembled href."""
    el = _node('<a href="https://wa.me/447700900123?text=Hi">Chat</a>')
    assert extract_field_value(el, "link-href", {}) == "https://wa.me/447700900123?text=Hi"


def test_link_template_argument_is_ignored_by_other_roles():
    el = _node('<a href="https://wa.me/447700900123">Chat</a>')
    assert extract_field_value(
        el, "link-href", {}, link_template=PHONE_TEMPLATE
    ) == "https://wa.me/447700900123"


# ---------------------------------------------------------------------------
# INTEGRATION — the walk's leg 1b lifts BOTH attrs off ONE root href
# ---------------------------------------------------------------------------

def _stub_whatsapp_cta_db(monkeypatch):
    """Stub the DB rows the parent track wires via assign-canonical, so this
    suite proves the CODE PATH without writing to the shared framework DB."""
    import converter.db.db_lookup as db_lookup_mod

    catalogue = {
        "phoneNumber": {
            "role": "link-content", "attr_type": "string",
            "canonical_slot": None, "derived_selector": None,
        },
        "message": {
            "role": "link-content", "attr_type": "string",
            "canonical_slot": "text", "derived_selector": ".sgs-whatsapp-cta__text",
        },
        "label": {
            "role": "text-content", "attr_type": "string",
            "canonical_slot": "label", "derived_selector": ".sgs-whatsapp-cta__label",
        },
    }
    templates = {"phoneNumber": PHONE_TEMPLATE, "message": MESSAGE_TEMPLATE}

    monkeypatch.setattr(db_lookup_mod, "block_attrs", lambda slug: catalogue)
    monkeypatch.setattr(
        db_lookup_mod, "link_template_for",
        lambda slug, attr: templates.get(attr),
    )
    monkeypatch.setattr(db_lookup_mod, "emit_shape_for", lambda slug, attr: "nested")
    monkeypatch.setattr(db_lookup_mod, "capabilities_for", lambda slug: frozenset())
    monkeypatch.setattr(db_lookup_mod, "primary_content_attr", lambda slug: None)
    monkeypatch.setattr(db_lookup_mod, "array_item_slot_for", lambda slug, attr: None)
    monkeypatch.setattr(db_lookup_mod, "array_item_field_names", lambda slug, attr: ())


def _recognition():
    from converter.context import Recognition
    return Recognition(
        kind="named", slug="sgs/whatsapp-cta",
        container_kind="content", delegates_content=0,
    )


def test_walk_lifts_both_fragments_from_one_root_href(monkeypatch):
    """THE TASK'S CLOSING CLAIM: phoneNumber AND message both extract, from the
    SAME assembled href, in one pass — they are disjoint parts of one URL, not
    competing candidates for one slot."""
    from converter.walk import run_universal_content_walk

    _stub_whatsapp_cta_db(monkeypatch)
    node = _node(
        '<a class="sgs-whatsapp-cta sgs-whatsapp-cta--inline" '
        'href="https://wa.me/447700900123?text=Hi%20there%2C%20I%27d%20like%20to%20order">'
        '<span class="sgs-whatsapp-cta__label">Message us</span></a>'
    )
    results = run_universal_content_walk(_recognition(), node, {}, None)
    lifted = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    assert lifted.get("phoneNumber") == "447700900123", (
        f"phoneNumber not lifted from the root href: {results}"
    )
    assert lifted.get("message") == "Hi there, I'd like to order", (
        f"message not lifted from the root href: {results}"
    )


def test_walk_lift_survives_alongside_other_content(monkeypatch):
    """The fragments must NOT depend on the leaf fallback (which only fires
    when nothing else lifted) — a variant that also carries a label element
    still lifts both fragments."""
    from converter.walk import run_universal_content_walk

    _stub_whatsapp_cta_db(monkeypatch)
    node = _node(
        '<a class="sgs-whatsapp-cta" href="https://wa.me/447700900123?text=Hi">'
        '<span class="sgs-whatsapp-cta__label">Message us</span></a>'
    )
    results = run_universal_content_walk(_recognition(), node, {}, None)
    lifted = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    assert lifted.get("label") == "Message us", f"label regression: {results}"
    assert lifted.get("phoneNumber") == "447700900123", f"{results}"
    assert lifted.get("message") == "Hi", f"{results}"


def test_walk_negative_control_emits_no_key_for_a_non_matching_link(monkeypatch):
    """NEGATIVE CONTROL at the walk level: a draft whose CTA is an ordinary
    link must lift NEITHER attr — no phantom phone number reaches the clone."""
    from converter.walk import run_universal_content_walk

    _stub_whatsapp_cta_db(monkeypatch)
    node = _node(
        '<a class="sgs-whatsapp-cta" href="/contact-us">'
        '<span class="sgs-whatsapp-cta__label">Message us</span></a>'
    )
    results = run_universal_content_walk(_recognition(), node, {}, None)
    lifted = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    assert "phoneNumber" not in lifted, f"phantom phone number lifted: {lifted}"
    assert "message" not in lifted, f"phantom message lifted: {lifted}"
    assert lifted.get("label") == "Message us", "unrelated content must still lift"


def test_walk_emits_nothing_when_no_template_was_captured(monkeypatch):
    """A role flip WITHOUT the capture half is a strict no-op, not a whole-href
    write — the exact corruption 580f7885 refused to ship."""
    import converter.db.db_lookup as db_lookup_mod
    from converter.walk import run_universal_content_walk

    _stub_whatsapp_cta_db(monkeypatch)
    monkeypatch.setattr(db_lookup_mod, "link_template_for", lambda slug, attr: None)
    node = _node(
        '<a class="sgs-whatsapp-cta" href="https://wa.me/447700900123?text=Hi"></a>'
    )
    results = run_universal_content_walk(_recognition(), node, {}, None)
    lifted = {r.attr: r.value for r in results if isinstance(r, ScalarLift)}

    assert "phoneNumber" not in lifted, f"whole href written without a template: {lifted}"
    assert "message" not in lifted


# ---------------------------------------------------------------------------
# THE DB ACCESSOR + THE ROLE SEED
# ---------------------------------------------------------------------------

def test_link_template_for_reads_the_output_signature_key(monkeypatch, tmp_path):
    """link_template_for reads output_signature.link_template — the column the
    capture half (580f7885) writes to — and returns None for every other shape."""
    import sqlite3

    import converter.db.db_lookup as db_lookup_mod

    db_path = tmp_path / "probe.db"
    conn = sqlite3.connect(db_path)
    conn.execute(
        "CREATE TABLE block_attributes (block_slug TEXT, attr_name TEXT, "
        "output_signature TEXT)"
    )
    conn.executemany(
        "INSERT INTO block_attributes VALUES (?,?,?)",
        [
            ("sgs/probe", "withTemplate",
             json.dumps({"type": "php-render", "link_template": PHONE_TEMPLATE})),
            ("sgs/probe", "noTemplate", json.dumps({"type": "php-render"})),
            ("sgs/probe", "nullSignature", None),
            ("sgs/probe", "corruptSignature", "{not json"),
        ],
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(db_lookup_mod, "SGS_DB", str(db_path))
    db_lookup_mod.link_template_for.cache_clear()
    try:
        assert db_lookup_mod.link_template_for("sgs/probe", "withTemplate") == PHONE_TEMPLATE
        assert db_lookup_mod.link_template_for("sgs/probe", "noTemplate") is None
        assert db_lookup_mod.link_template_for("sgs/probe", "nullSignature") is None
        assert db_lookup_mod.link_template_for("sgs/probe", "corruptSignature") is None
        assert db_lookup_mod.link_template_for("sgs/probe", "absentAttr") is None
    finally:
        db_lookup_mod.link_template_for.cache_clear()


def test_link_content_role_is_seeded_and_names_its_consumer():
    """R-31-1 / this track's own rule: a role with no real consumer is the
    failure the seed file exists to prevent, so the entry must name it."""
    roles_path = (
        Path(__file__).resolve().parents[2] / "data" / "roles.json"
    )
    roles = json.loads(roles_path.read_text(encoding="utf-8"))
    assert "link-content" in roles, "link-content role not seeded in roles.json"
    classification, description = roles["link-content"]
    assert classification == "content-bearing"
    assert "extract_link_fragment" in description, "role must name its extractor"
    assert "field_extractors.py" in description, "role must name its consumer file"
    assert "link_template_for" in description, "role must name its template source"
