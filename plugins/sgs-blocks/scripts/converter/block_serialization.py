"""block_serialization.py — WP-core-faithful block-attribute serialisation.

SECURITY-CRITICAL. Every `<!-- wp:… {json} -->` comment this converter emits must
escape its attribute JSON the way WordPress core does, or an attribute VALUE can
terminate the HTML comment early and inject raw, unparsed HTML into stored
`post_content` (a stored-XSS-class defect — the injected markup executes in
wp-admin and on the public frontend).

Plain ``json.dumps`` escapes only JSON-structural characters (``"`` and ``\\``).
It does NOT escape ``--``, ``<``, ``>`` or ``&``, so a value containing ``-->``
closes the comment. Core solves this in ``serialize_block_attributes()``
(``wp-includes/blocks.php``) by post-processing the encoded JSON — the JSON
*structure* is untouched, only characters inside it become ``\\uXXXX`` escapes,
so ``WP_Block_Parser`` decodes the value back to its exact original form.

``serialize_block_attributes()`` below is a byte-faithful port of core's current
implementation (verified against ``WordPress/wordpress-develop`` trunk):

    $encoded_attributes = wp_json_encode( $block_attributes,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
    return strtr( $encoded_attributes, array(
        '\\\\' => '\\u005c',  '--' => '\\u002d\\u002d',  '<' => '\\u003c',
        '>'   => '\\u003e',   '&'  => '\\u0026',         '\\"' => '\\u0022',
    ) );

Do NOT invent a different escaping scheme here: the markup this converter emits
is re-parsed by WordPress's own block parser, which expects exactly core's
convention. Any divergence is either a security hole or a parse failure.
"""
from __future__ import annotations

import json
import re
from typing import Any

# Core's strtr() map, in core's order. Ordering is load-bearing: ``\\`` must be
# consumed before ``\"`` so a literal backslash followed by an escaped quote is
# split the same way core splits it. The replacement outputs contain only
# ``\uXXXX`` sequences, whose characters can never form a later key, so applying
# these sequentially in Python is equivalent to PHP's single simultaneous
# strtr() pass.
_CORE_ESCAPES: tuple[tuple[str, str], ...] = (
    ("\\\\", "\\u005c"),
    ("--", "\\u002d\\u002d"),
    ("<", "\\u003c"),
    (">", "\\u003e"),
    ("&", "\\u0026"),
    ('\\"', "\\u0022"),
)


def serialize_block_attributes(
    attributes: dict[str, Any], *, sort_keys: bool = False, ensure_ascii: bool = False
) -> str:
    """Encode block attributes as core's ``serialize_block_attributes()`` does.

    Returns valid JSON in which no character can terminate the enclosing HTML
    comment. ``sort_keys`` is an SGS-side determinism knob only (core does not
    sort); it does not affect escaping.

    ``ensure_ascii`` selects how NON-ASCII characters are written. It carries NO
    security weight — both forms are valid JSON that ``WP_Block_Parser`` decodes
    to the identical value, and neither can breach the comment. Default ``False``
    matches core's ``JSON_UNESCAPED_UNICODE``; ``True`` writes ``\\uXXXX`` (what
    ``emit_block_markup`` has always emitted, preserved so this security fix does
    not churn unrelated golden fixtures).
    """
    encoded = json.dumps(
        attributes,
        separators=(",", ":"),
        sort_keys=sort_keys,
        ensure_ascii=ensure_ascii,  # False == JSON_UNESCAPED_UNICODE
    )
    for needle, replacement in _CORE_ESCAPES:
        encoded = encoded.replace(needle, replacement)
    return encoded


# ---------------------------------------------------------------------------
# The read-back side (2026-09-06)
# ---------------------------------------------------------------------------
# `parse_block_open_comment` recovers `(block_name, attributes)` from serialised
# block markup this module produced. It exists so a pass that holds only the
# EMITTED markup for a child block can still read that child's attributes —
# specifically `assembly.py`'s variant-detection step, whose `ChildBlock`
# records carry `(slug, markup)` and no structured attribute dict.
#
# WHY SPLITTING AT THE FIRST `-->` IS SAFE, not a guess: the escaping above
# rewrites every `--` inside the attribute JSON to `--`, so no `-->`
# can occur inside the JSON. The first `-->` after the opening `<!-- wp:` IS
# therefore always the comment terminator. That is the same invariant
# `WP_Block_Parser` relies on.
#
# No un-escaping step is needed either: the replacements produce `\uXXXX` JSON
# escapes, which `json.loads` decodes back to the original characters.

_BLOCK_OPEN_RE = re.compile(
    r"\A\s*<!--\s+wp:(?P<name>[A-Za-z0-9_-]+/[A-Za-z0-9_-]+|[A-Za-z0-9_-]+)"
    r"(?P<json>\s+\{.*?\})?\s*/?-->",
    re.DOTALL,
)


def parse_block_open_comment(markup: str) -> tuple[str, dict[str, Any]] | None:
    """Read back the OPENING block comment of serialised block markup.

    Returns ``(block_name, attributes)`` — ``attributes`` is ``{}`` for a block
    comment carrying no JSON — or ``None`` when `markup` does not begin with a
    parseable ``<!-- wp:… -->`` opener, or its JSON does not decode to an
    object. Never raises and never guesses: an unreadable opener is reported as
    absence, so every caller treats it exactly like a block it could not read.
    """
    if not isinstance(markup, str) or not markup:
        return None
    match = _BLOCK_OPEN_RE.match(markup)
    if match is None:
        return None
    raw_json = match.group("json")
    if raw_json is None:
        return match.group("name"), {}
    try:
        decoded = json.loads(raw_json)
    except ValueError:
        return None
    if not isinstance(decoded, dict):
        return None
    return match.group("name"), decoded
