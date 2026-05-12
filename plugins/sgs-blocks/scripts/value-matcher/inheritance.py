"""
inheritance.py — Default-inheritance lookup module.

For a given (block_slug, slot, property_path, value) tuple, determines whether
the supplied value matches the global default resolved from theme.json, or
whether it represents a per-block override.

WP precedence order (FR35, Spec 15 §10):
  styles.blocks.<block> > styles.elements.<html_tag> > styles (root)

If no default exists at any level, the value is always an OVERRIDE.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Literal, Union

# ---------------------------------------------------------------------------
# Slot → HTML element map
# Canonical mapping from SGS canonical slot names to their rendered HTML tags.
# Used to resolve which styles.elements.<el> entry to consult.
# ---------------------------------------------------------------------------
SLOT_TO_HTML_ELEMENT: dict[str, str] = {
    "heading": "h1",
    "subheading": "h2",
    "text": "p",
    "button": "a",
    "buttonPrimary": "a",
    "buttonSecondary": "a",
    "label": "span",
    "link": "a",
    "caption": "span",
    "eyebrow": "span",
}

# ---------------------------------------------------------------------------
# Default theme.json path (relative to this script's location)
# scripts/value-matcher/ → plugins/sgs-blocks/ → plugins/ → repo root → theme/
# ---------------------------------------------------------------------------
_DEFAULT_THEME_JSON = (
    Path(__file__).parents[3] / "theme" / "sgs-theme" / "theme.json"
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _load_theme(theme_json_path: Path | str | None) -> dict:
    """Load and return the parsed theme.json dict."""
    path = Path(theme_json_path) if theme_json_path is not None else _DEFAULT_THEME_JSON
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def _get_by_dot_path(obj: dict, dot_path: str) -> object | None:
    """
    Walk a nested dict using dot-notation.

    Example: _get_by_dot_path(d, 'typography.fontSize')
             returns d['typography']['fontSize'] or None if any key is absent.
    """
    parts = dot_path.split(".")
    current: object = obj
    for part in parts:
        if not isinstance(current, dict):
            return None
        current = current.get(part)
        if current is None:
            return None
    return current


def _normalise(value: object) -> object:
    """
    Normalise a value for comparison.

    Strings: lowercased and whitespace-stripped.
    Dicts: recursively normalise each string value.
    Everything else: returned unchanged.
    """
    if isinstance(value, str):
        return value.strip().lower()
    if isinstance(value, dict):
        return {k: _normalise(v) for k, v in value.items()}
    return value


def _values_match(a: object, b: object) -> bool:
    """Return True if two values are equal after normalisation."""
    return _normalise(a) == _normalise(b)


# ---------------------------------------------------------------------------
# Core function
# ---------------------------------------------------------------------------

def inherits_global_default(
    block_slug: str,
    slot: str,
    property_path: str,
    value: Union[str, dict],
    theme_json_path: Union[Path, str, None] = None,
) -> Literal["INHERIT", "OVERRIDE"]:
    """
    Determine whether *value* matches the theme.json global default for
    (block_slug, slot, property_path).

    Parameters
    ----------
    block_slug:
        WP block slug, e.g. 'sgs/hero'.
    slot:
        SGS canonical slot name, e.g. 'heading'.
    property_path:
        Dot-notation path into a styles sub-object, e.g. 'color' or
        'typography.fontSize'.
    value:
        The value to compare against the resolved default.
    theme_json_path:
        Optional path to theme.json. Defaults to the framework's
        theme/sgs-theme/theme.json. May also be a pre-parsed dict
        (used in tests via _inherits_from_dict).

    Returns
    -------
    'INHERIT'  — the value matches the resolved global default; no
                 per-block override is needed.
    'OVERRIDE' — the value differs from the default, or no default exists.
    """
    if isinstance(theme_json_path, dict):
        # Test convenience: accept a pre-parsed dict directly.
        theme = theme_json_path
    else:
        theme = _load_theme(theme_json_path)

    return _inherits_from_dict(block_slug, slot, property_path, value, theme)


def _inherits_from_dict(
    block_slug: str,
    slot: str,
    property_path: str,
    value: Union[str, dict],
    theme: dict,
) -> Literal["INHERIT", "OVERRIDE"]:
    """
    Core logic — operates on an already-parsed theme dict.
    Separated so tests can inject mock data without touching the filesystem.
    """
    styles: dict = theme.get("styles", {})

    # --- 1. Block-level default (highest precedence) -----------------------
    # styles.blocks.<block_slug>.<slot>.<property_path>
    # Note: theme.json nests block styles as styles.blocks[slug][slot][prop]
    # or styles.blocks[slug][prop] — we check both slot-scoped and direct.
    blocks_section: dict = styles.get("blocks", {})
    block_styles: dict = blocks_section.get(block_slug, {})

    # Try slot-scoped path first: styles.blocks[slug][slot][property_path]
    slot_scoped = block_styles.get(slot, {})
    block_default = _get_by_dot_path(slot_scoped, property_path)

    # Fall back to flat path: styles.blocks[slug][property_path]
    if block_default is None:
        block_default = _get_by_dot_path(block_styles, property_path)

    if block_default is not None:
        return "INHERIT" if _values_match(value, block_default) else "OVERRIDE"

    # --- 2. Element-level default ------------------------------------------
    # Resolve HTML element for this slot.
    html_tag: str | None = SLOT_TO_HTML_ELEMENT.get(slot)
    if html_tag is not None:
        elements_section: dict = styles.get("elements", {})
        element_styles: dict = elements_section.get(html_tag, {})
        element_default = _get_by_dot_path(element_styles, property_path)
        if element_default is not None:
            return "INHERIT" if _values_match(value, element_default) else "OVERRIDE"

    # --- 3. Root-level default (lowest precedence) -------------------------
    # styles.<property_path>
    root_default = _get_by_dot_path(styles, property_path)
    if root_default is not None:
        return "INHERIT" if _values_match(value, root_default) else "OVERRIDE"

    # --- 4. No default found — any value is an override -------------------
    return "OVERRIDE"


# ---------------------------------------------------------------------------
# Self-tests
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    pass_count = 0
    total = 4

    # --- Test 1: block-level beats element-level ---------------------------
    # Block says #FF0000 for heading colour; element says #00FF00.
    # Supplying #FF0000 should resolve to INHERIT (block-level matches).
    mock_1 = {
        "styles": {
            "blocks": {
                "sgs/hero": {
                    "heading": {
                        "color": "#FF0000",
                    }
                }
            },
            "elements": {
                "h1": {
                    "color": "#00FF00",
                }
            },
        }
    }
    result_1 = inherits_global_default(
        block_slug="sgs/hero",
        slot="heading",
        property_path="color",
        value="#FF0000",
        theme_json_path=mock_1,
    )
    passed_1 = result_1 == "INHERIT"
    pass_count += int(passed_1)
    status_1 = "PASS" if passed_1 else "FAIL"
    print(
        f"[{status_1}] Test 1 — block-level beats element-level: "
        f"expected INHERIT, got {result_1}"
    )

    # --- Test 2: element-level applies when no block override --------------
    # No block-level entry; element h1 colour is #00FF00.
    # Supplying #00FF00 for sgs/hero heading should be INHERIT.
    mock_2 = {
        "styles": {
            "elements": {
                "h1": {
                    "color": "#00FF00",
                }
            }
        }
    }
    result_2 = inherits_global_default(
        block_slug="sgs/hero",
        slot="heading",
        property_path="color",
        value="#00FF00",
        theme_json_path=mock_2,
    )
    passed_2 = result_2 == "INHERIT"
    pass_count += int(passed_2)
    status_2 = "PASS" if passed_2 else "FAIL"
    print(
        f"[{status_2}] Test 2 — element-level applies with no block override: "
        f"expected INHERIT, got {result_2}"
    )

    # --- Test 3: root fallback --------------------------------------------
    # No block or element default; root styles.color is '#0000FF'.
    # slot 'text' maps to 'p' — no elements.p entry, so falls to root.
    mock_3 = {
        "styles": {
            "color": "#0000FF",
        }
    }
    result_3 = inherits_global_default(
        block_slug="sgs/hero",
        slot="text",
        property_path="color",
        value="#0000FF",
        theme_json_path=mock_3,
    )
    passed_3 = result_3 == "INHERIT"
    pass_count += int(passed_3)
    status_3 = "PASS" if passed_3 else "FAIL"
    print(
        f"[{status_3}] Test 3 — root fallback: "
        f"expected INHERIT, got {result_3}"
    )

    # --- Test 4: OVERRIDE when value differs ------------------------------
    # Element h1 colour is #00FF00; we supply #FF0000 — must be OVERRIDE.
    mock_4 = {
        "styles": {
            "elements": {
                "h1": {
                    "color": "#00FF00",
                }
            }
        }
    }
    result_4 = inherits_global_default(
        block_slug="sgs/hero",
        slot="heading",
        property_path="color",
        value="#FF0000",
        theme_json_path=mock_4,
    )
    passed_4 = result_4 == "OVERRIDE"
    pass_count += int(passed_4)
    status_4 = "PASS" if passed_4 else "FAIL"
    print(
        f"[{status_4}] Test 4 — OVERRIDE when value differs: "
        f"expected OVERRIDE, got {result_4}"
    )

    # --- Summary -----------------------------------------------------------
    print(f"\n{pass_count}/{total} tests passed.")
