"""Module 5 — Serialiser.

Emits valid WordPress block-comment markup from a list of
{block_name, attrs, inner_blocks[]} entries. Output must round-trip
through PHP parse_blocks() cleanly.

Spec: .claude/plans/recogniser-v1.md  Module 5.

Public API:
    serialise(blocks)     -> str
    serialise_one(block)  -> str
    validate(markup)      -> tuple[bool, list[str]]

Stdlib-only. UK English. Byte-for-byte WordPress-compatible output:
self-closing tags use ``/-->`` exactly; opener tags end ``-->``;
JSON attributes are encoded with sorted keys, ``ensure_ascii=False``
and ``separators=(',', ':')`` for diff stability.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Block-type catalogue
# ---------------------------------------------------------------------------

# Path to the fingerprints catalogue (relative to this file).
_FINGERPRINTS_PATH = Path(__file__).parent / "data" / "fingerprints.json"

# Cache for the fingerprint catalogue once loaded.
_BLOCK_TYPES: dict[str, str] | None = None


def _load_block_types() -> dict[str, str]:
    """Load the fingerprint catalogue and return a {block_name: block_type} map.

    Falls back to an empty dict if the catalogue is missing — callers then
    use the default rules (SGS = dynamic, core = static).
    """

    global _BLOCK_TYPES
    if _BLOCK_TYPES is not None:
        return _BLOCK_TYPES
    try:
        data = json.loads(_FINGERPRINTS_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        _BLOCK_TYPES = {}
        return _BLOCK_TYPES
    _BLOCK_TYPES = {
        name: (entry.get("block_type") or "").strip().lower()
        for name, entry in data.items()
        if isinstance(entry, dict)
    }
    return _BLOCK_TYPES


def _is_dynamic(block_name: str) -> bool:
    """Determine whether a block is dynamic (server-rendered, self-closing).

    Default rules:
      * SGS blocks default to dynamic.
      * Core blocks default to static.
      * The fingerprint catalogue overrides both defaults when present.
    """

    # Per Module 5 spec: all SGS blocks are treated as dynamic
    # (self-closing) regardless of fingerprint catalogue declaration —
    # the recogniser pipeline does not synthesise save-output HTML
    # for SGS static blocks.
    if block_name.startswith("sgs/"):
        return True
    catalogue = _load_block_types()
    declared = catalogue.get(block_name)
    if declared == "dynamic":
        return True
    if declared == "static":
        return False
    return False


# ---------------------------------------------------------------------------
# Attribute helpers
# ---------------------------------------------------------------------------


def _get_attrs(block: dict[str, Any]) -> dict[str, Any]:
    """Return the attribute dict for a block, preferring ``extracted_attrs``.

    Both ``extracted_attrs`` (recogniser-native) and ``attrs`` (downstream
    normalised) are accepted. ``extracted_attrs`` wins when both are present.
    """

    if "extracted_attrs" in block and block["extracted_attrs"] is not None:
        attrs = block["extracted_attrs"]
    elif "attrs" in block and block["attrs"] is not None:
        attrs = block["attrs"]
    else:
        attrs = {}
    if not isinstance(attrs, dict):
        return {}
    return attrs


def _encode_attrs(attrs: dict[str, Any]) -> str:
    """Encode a block's JSON attributes for the block-comment header.

    Returns an empty string when ``attrs`` is empty so the opener becomes
    ``<!-- wp:name -->`` rather than ``<!-- wp:name {} -->``.
    """

    if not attrs:
        return ""
    return json.dumps(
        attrs,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


# ---------------------------------------------------------------------------
# HTML escaping
# ---------------------------------------------------------------------------


def _esc_html(value: Any) -> str:
    """Minimal HTML escape for text content (not used for attribute values)."""

    if value is None:
        return ""
    text = str(value)
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _esc_attr(value: Any) -> str:
    """Escape a value for use inside an HTML double-quoted attribute."""

    if value is None:
        return ""
    return (
        str(value)
        .replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


# ---------------------------------------------------------------------------
# Core block save-output renderers
# ---------------------------------------------------------------------------


def _render_inner_blocks(inner: list[dict[str, Any]]) -> str:
    """Recursively serialise a list of inner blocks, joined by newlines."""

    return "\n".join(serialise_one(b) for b in inner)


def _render_core_heading(attrs: dict[str, Any]) -> str:
    level = int(attrs.get("level", 2) or 2)
    if level < 1 or level > 6:
        level = 2
    content = _esc_html(attrs.get("content", ""))
    align = attrs.get("textAlign") or attrs.get("align")
    cls = "wp-block-heading"
    if align:
        cls += f" has-text-align-{align}"
    return f'<h{level} class="{cls}">{content}</h{level}>'


def _render_core_paragraph(attrs: dict[str, Any]) -> str:
    content = _esc_html(attrs.get("content", ""))
    align = attrs.get("align")
    if align:
        return f'<p class="has-text-align-{align}">{content}</p>'
    return f"<p>{content}</p>"


def _render_core_image(attrs: dict[str, Any]) -> str:
    url = _esc_attr(attrs.get("url", ""))
    alt = _esc_attr(attrs.get("alt", ""))
    return (
        '<figure class="wp-block-image">'
        f'<img src="{url}" alt="{alt}"/>'
        "</figure>"
    )


def _render_core_quote(attrs: dict[str, Any]) -> str:
    value = attrs.get("value", "")
    citation = attrs.get("citation")
    # Split on blank lines into separate <p> elements (WordPress convention).
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", str(value)) if p.strip()]
    if not paragraphs:
        paragraphs = [str(value)]
    body = "".join(f"<p>{_esc_html(p)}</p>" for p in paragraphs)
    cite = ""
    if citation:
        cite = f"<cite>{_esc_html(citation)}</cite>"
    return f'<blockquote class="wp-block-quote">{body}{cite}</blockquote>'


def _render_core_button(attrs: dict[str, Any]) -> str:
    text = _esc_html(attrs.get("text", ""))
    url = _esc_attr(attrs.get("url", "#"))
    return (
        '<div class="wp-block-button">'
        f'<a class="wp-block-button__link wp-element-button" href="{url}">{text}</a>'
        "</div>"
    )


def _render_core_buttons(_attrs: dict[str, Any], inner: str) -> str:
    return f'<div class="wp-block-buttons">{inner}</div>'


def _render_core_group(_attrs: dict[str, Any], inner: str) -> str:
    return f'<div class="wp-block-group">{inner}</div>'


def _render_core_columns(_attrs: dict[str, Any], inner: str) -> str:
    return f'<div class="wp-block-columns">{inner}</div>'


def _render_core_column(_attrs: dict[str, Any], inner: str) -> str:
    return f'<div class="wp-block-column">{inner}</div>'


def _render_core_list(attrs: dict[str, Any], inner: str) -> str:
    ordered = bool(attrs.get("ordered"))
    tag = "ol" if ordered else "ul"
    cls = "wp-block-list"
    return f'<{tag} class="{cls}">{inner}</{tag}>'


def _render_core_list_item(attrs: dict[str, Any], inner: str) -> str:
    content = _esc_html(attrs.get("content", "")) if attrs.get("content") else ""
    return f"<li>{content}{inner}</li>"


def _render_core_separator(_attrs: dict[str, Any]) -> str:
    return '<hr class="wp-block-separator has-alpha-channel-opacity"/>'


def _render_core_spacer(attrs: dict[str, Any]) -> str:
    height = attrs.get("height", "100px")
    return (
        f'<div style="height:{_esc_attr(height)}" '
        'aria-hidden="true" class="wp-block-spacer"></div>'
    )


# Map of core block renderers. Renderers that wrap inner content take
# (attrs, inner_html); leaf renderers take (attrs,) only.
_WRAPPER_RENDERERS = {
    "core/group": _render_core_group,
    "core/columns": _render_core_columns,
    "core/column": _render_core_column,
    "core/buttons": _render_core_buttons,
    "core/list": _render_core_list,
    "core/list-item": _render_core_list_item,
}

_LEAF_RENDERERS = {
    "core/heading": _render_core_heading,
    "core/paragraph": _render_core_paragraph,
    "core/image": _render_core_image,
    "core/quote": _render_core_quote,
    "core/button": _render_core_button,
    "core/separator": _render_core_separator,
    "core/spacer": _render_core_spacer,
}


# ---------------------------------------------------------------------------
# Single-block serialiser
# ---------------------------------------------------------------------------


def serialise_one(block: dict[str, Any]) -> str:
    """Serialise a single block dict to WordPress block-comment markup.

    Recurses into ``inner_blocks``. Self-closing form is used when the
    block is dynamic AND has no inner HTML AND no inner blocks.
    """

    block_name = block.get("block_name") or block.get("name")
    if not block_name:
        raise ValueError(f"block missing block_name: {block!r}")

    attrs = _get_attrs(block)
    attrs_json = _encode_attrs(attrs)
    header = f"wp:{block_name}"
    if attrs_json:
        header = f"{header} {attrs_json}"

    inner_blocks = block.get("inner_blocks") or []
    inner_html_override = block.get("inner_html")

    # Decide self-closing eligibility.
    dynamic = _is_dynamic(block_name)

    # Build inner content for wrapper core blocks.
    inner_blocks_markup = _render_inner_blocks(inner_blocks) if inner_blocks else ""

    # Wrapper core blocks (group/columns/etc.) embed the inner-block markup
    # inside their save-output HTML.
    if block_name in _WRAPPER_RENDERERS:
        renderer = _WRAPPER_RENDERERS[block_name]
        body = renderer(attrs, inner_blocks_markup)
        return f"<!-- {header} -->\n{body}\n<!-- /wp:{block_name} -->"

    # Leaf core blocks (heading/paragraph/image/etc.) — no inner blocks.
    if block_name in _LEAF_RENDERERS:
        body = _LEAF_RENDERERS[block_name](attrs)
        return f"<!-- {header} -->\n{body}\n<!-- /wp:{block_name} -->"

    # Dynamic SGS blocks (or unknown core blocks): self-close when no body.
    if not inner_blocks and not inner_html_override:
        if dynamic:
            return f"<!-- {header} /-->"
        # Unknown static-style block with no inner content — emit a warning
        # and self-close. Output may be incomplete but remains parseable.
        sys.stderr.write(
            f"[serialiser] warning: no renderer for static block "
            f"{block_name!r}; emitting self-closing form.\n"
        )
        return f"<!-- {header} /-->"

    # Has inner blocks or override HTML — use opener/closer form.
    if inner_html_override is not None:
        body = str(inner_html_override)
    else:
        body = inner_blocks_markup
    return f"<!-- {header} -->\n{body}\n<!-- /wp:{block_name} -->"


def serialise(blocks: list[dict[str, Any]]) -> str:
    """Serialise a list of block dicts, joined by blank lines.

    The trailing newline matches how WordPress stores ``post_content``.
    """

    parts = [serialise_one(b) for b in blocks]
    return "\n\n".join(parts) + ("\n" if parts else "")


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

# Match block-comment markers — opener, closer, or self-closing.
_BLOCK_RE = re.compile(
    r"<!--\s*"
    r"(?P<slash>/)?"                   # closer if present
    r"wp:(?P<name>[a-z][a-z0-9_-]*(?:/[a-z][a-z0-9_-]*)?)"
    r"(?:\s+(?P<attrs>\{.*?\}))?"      # optional JSON attrs (non-greedy)
    r"\s*(?P<self>/)?-->",
    re.DOTALL,
)


def validate(markup: str) -> tuple[bool, list[str]]:
    """Structural sanity-check on serialised block markup.

    Verifies:
      * each opener has a matching closer (or is self-closing)
      * JSON attribute payloads parse cleanly
      * inner-block nesting is balanced
    """

    errors: list[str] = []
    stack: list[tuple[str, int]] = []  # (block_name, position)

    for match in _BLOCK_RE.finditer(markup):
        name = match.group("name")
        is_closer = bool(match.group("slash"))
        is_self = bool(match.group("self"))
        attrs_raw = match.group("attrs")
        pos = match.start()

        if is_closer and is_self:
            errors.append(
                f"malformed marker at {pos}: cannot be both closer and self-closing"
            )
            continue

        if attrs_raw is not None:
            if is_closer:
                errors.append(
                    f"closer at {pos} for {name!r} carries JSON payload"
                )
            else:
                try:
                    json.loads(attrs_raw)
                except json.JSONDecodeError as exc:
                    errors.append(
                        f"invalid JSON for {name!r} at {pos}: {exc.msg}"
                    )

        if is_self:
            # Self-closing — does not affect the stack.
            continue

        if is_closer:
            if not stack:
                errors.append(
                    f"closer for {name!r} at {pos} with no matching opener"
                )
                continue
            opener_name, opener_pos = stack.pop()
            if opener_name != name:
                errors.append(
                    f"mismatched closer at {pos}: expected {opener_name!r} "
                    f"(opened at {opener_pos}), got {name!r}"
                )
        else:
            stack.append((name, pos))

    for opener_name, opener_pos in stack:
        errors.append(
            f"unclosed opener for {opener_name!r} at {opener_pos}"
        )

    return (not errors, errors)


# ---------------------------------------------------------------------------
# Decision-routing helpers
# ---------------------------------------------------------------------------


def _semantic_role(block_name: str, declared: str | None) -> str:
    """Infer semantic role when the decision JSON does not declare one.

    sgs/header  -> header
    sgs/footer  -> footer
    everything else -> main
    """

    if declared:
        return declared
    if block_name == "sgs/header":
        return "header"
    if block_name == "sgs/footer":
        return "footer"
    return "main"


def _decision_to_block(decision: dict[str, Any]) -> dict[str, Any] | None:
    """Convert a recogniser decision entry into a block dict.

    Deferred sections become a ``core/group`` placeholder carrying the
    original note as a className-tagged wrapper. Header and footer entries
    return ``None`` — Module 6 routes those to template parts.
    """

    match = decision.get("match") or {}
    block_name = match.get("block_name")
    if not block_name:
        return None

    role = _semantic_role(block_name, decision.get("semantic_role"))
    if role != "main":
        return None

    tier = (match.get("tier") or "").lower()
    attrs = match.get("extracted_attrs") or {}
    inner = match.get("inner_blocks") or []

    if tier == "deferred":
        # Emit a core/group placeholder. Preserve the className and note so
        # downstream tooling can find and replace it once the missing block
        # is built. ``note`` is kept as a custom attribute (WordPress will
        # round-trip it harmlessly) and surfaced as an HTML comment in the
        # rendered body for human reviewers.
        note = attrs.get("note", "")
        class_name = attrs.get("className", "sgs-deferred-section")
        placeholder = {
            "block_name": "core/group",
            "extracted_attrs": {
                "className": class_name,
            },
            "inner_html": (
                f'<div class="wp-block-group {_esc_attr(class_name)}">'
                f"<!-- DEFERRED: {_esc_html(note)} -->"
                "</div>"
            ),
        }
        return placeholder

    return {
        "block_name": block_name,
        "extracted_attrs": attrs,
        "inner_blocks": inner,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _cli(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Serialise recogniser decisions into WordPress block markup."
        ),
    )
    parser.add_argument(
        "--decisions",
        required=True,
        help="Path to recogniser-decisions JSON file.",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Path to write the serialised block markup.",
    )
    args = parser.parse_args(argv)

    decisions_path = Path(args.decisions)
    output_path = Path(args.output)

    decisions = json.loads(decisions_path.read_text(encoding="utf-8"))
    if not isinstance(decisions, list):
        sys.stderr.write("decisions file must contain a JSON array\n")
        return 2

    blocks: list[dict[str, Any]] = []
    skipped: list[str] = []
    for decision in decisions:
        block = _decision_to_block(decision)
        if block is None:
            skipped.append(decision.get("section_id", "<unknown>"))
            continue
        blocks.append(block)

    markup = serialise(blocks)
    ok, errors = validate(markup)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(markup, encoding="utf-8")

    sys.stderr.write(
        f"[serialiser] wrote {len(blocks)} top-level blocks to "
        f"{output_path} (skipped {len(skipped)}: {skipped})\n"
    )
    if not ok:
        sys.stderr.write("[serialiser] validation FAILED:\n")
        for err in errors:
            sys.stderr.write(f"  - {err}\n")
        return 1
    sys.stderr.write("[serialiser] validation OK\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(_cli())
