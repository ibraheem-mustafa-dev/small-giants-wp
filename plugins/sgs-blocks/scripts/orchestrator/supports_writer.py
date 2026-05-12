#!/usr/bin/env python3
"""supports_writer.py -- Spec 15 Phase 5d.4 supports-first attribute writer.

Before writing a per-block override, check whether the resolved value
matches the block's `supports` native default. If it matches, OMIT the
override (let WP native styling apply via the cascade). Otherwise emit
the override.

Parallels Phase 1's default-inheritance check (plugins/sgs-blocks/scripts/
value-matcher/inheritance.py) but at WRITE time instead of EXTRACT time.

Cascade order (per Spec 15 Â§4):
  theme.json defaults  ->  style variation overrides  ->  block.json
  defaults  ->  per-instance overrides

The writer assumes the resolved value has ALREADY been snapped to a
token (or marked as a gap candidate) by token_resolver. The role of
this module is the OMIT-vs-EMIT decision -- not snap-or-not.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import importlib.util as _ilu
import json
import sys
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent
_VALUE_MATCHER_DIR = HERE.parent / "value-matcher"

# Optional consult of Phase 1's inheritance.py if present. We never crash
# without it -- the module ships with a self-contained default lookup.
_inh = None
_inh_path = _VALUE_MATCHER_DIR / "inheritance.py"
if _inh_path.exists():
    _spec = _ilu.spec_from_file_location("inheritance_check", _inh_path)
    _inh = _ilu.module_from_spec(_spec)
    sys.modules.setdefault("inheritance_check", _inh)
    try:
        _spec.loader.exec_module(_inh)
    except Exception:                                  # noqa: BLE001
        _inh = None


# Map attr-name shape to the support path in block.json + theme.json
# slice to consult for the inherited default.
_ATTR_TO_SUPPORT: dict[str, dict] = {
    # attr keyword            support path            theme.json key
    "background":              {"supports_path": ["color", "background"],
                                "theme_path":    ["styles", "color", "background"]},
    "textcolor":               {"supports_path": ["color", "text"],
                                "theme_path":    ["styles", "color", "text"]},
    "color":                   {"supports_path": ["color", "text"],
                                "theme_path":    ["styles", "color", "text"]},
    "bordercolor":             {"supports_path": ["__experimentalBorder", "color"],
                                "theme_path":    ["styles", "border", "color"]},
    "fontfamily":              {"supports_path": ["typography", "fontFamily"],
                                "theme_path":    ["styles", "typography", "fontFamily"]},
    "fontsize":                {"supports_path": ["typography", "fontSize"],
                                "theme_path":    ["styles", "typography", "fontSize"]},
    "padding":                 {"supports_path": ["spacing", "padding"],
                                "theme_path":    ["styles", "spacing", "padding"]},
    "margin":                  {"supports_path": ["spacing", "margin"],
                                "theme_path":    ["styles", "spacing", "margin"]},
}


def _attr_to_support_key(attr_name: str) -> str | None:
    n = attr_name.lower()
    # match the longest key that is a substring of the attr name
    matches = [k for k in _ATTR_TO_SUPPORT if k in n]
    if not matches:
        return None
    return max(matches, key=len)


def _walk(d: dict | None, path: list[str]) -> Any:
    cur: Any = d or {}
    for key in path:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(key)
        if cur is None:
            return None
    return cur


def supports_declares(block_json: dict, supports_path: list[str]) -> bool:
    """True if block.json declares the support (value is truthy at the path)."""
    return bool(_walk(block_json, ["supports", *supports_path]))


def inherited_default(theme_json: dict, theme_path: list[str]) -> Any:
    """Look up the cascade default for this support from theme.json styles."""
    return _walk(theme_json, theme_path)


def decide(
    block_slug: str,                # noqa: ARG001 -- reserved for per-block policies
    attr_name: str,
    resolved_value: Any,
    block_json: dict,
    theme_json: dict,
) -> dict:
    """Return the emit/omit decision for one attribute write."""
    key = _attr_to_support_key(attr_name)
    base = {
        "attr_name":      attr_name,
        "resolved_value": resolved_value,
        "supports_key":   key,
    }
    if key is None:
        # No supports mapping known -- always emit (write the override).
        return {**base, "emit": True, "reason": "no supports mapping known for attr"}

    cfg = _ATTR_TO_SUPPORT[key]
    if not supports_declares(block_json, cfg["supports_path"]):
        # Block doesn't expose this support -- write the override to be safe.
        return {**base, "emit": True,
                "reason": f"supports.{'.'.join(cfg['supports_path'])} not declared by block"}
    default = inherited_default(theme_json, cfg["theme_path"])
    if default is None:
        return {**base, "emit": True,
                "reason": f"no inherited default at theme.{'.'.join(cfg['theme_path'])}"}
    if resolved_value == default:
        return {**base, "emit": False, "reason": "matches inherited default; OMIT override",
                "inherited_default": default}
    return {**base, "emit": True,
            "reason": "differs from inherited default; emit override",
            "inherited_default": default}


def filter_writes(
    block_slug: str,
    attribute_writes: dict,           # attr_name -> resolved_value
    block_json: dict,
    theme_json: dict,
) -> dict:
    """Apply decide() across a dict of pending writes.

    Returns:
      {
        "emitted_attributes":  {attr_name: value, ...}   # what to actually write
        "omitted_attributes":  {attr_name: value, ...}   # let WP supports cascade handle
        "decisions":           [decision_dict, ...]      # debug trail
      }
    """
    emitted: dict = {}
    omitted: dict = {}
    decisions: list[dict] = []
    for name, value in attribute_writes.items():
        d = decide(block_slug, name, value, block_json, theme_json)
        decisions.append(d)
        (emitted if d["emit"] else omitted)[name] = value
    return {
        "emitted_attributes": emitted,
        "omitted_attributes": omitted,
        "decisions": decisions,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--block-slug", required=True)
    parser.add_argument("--block-json", type=Path, required=True)
    parser.add_argument("--theme-json", type=Path, required=True)
    parser.add_argument("--writes", type=Path, required=True,
                        help="JSON dict of {attr_name: resolved_value}")
    args = parser.parse_args(argv)

    bj = json.loads(args.block_json.read_text(encoding="utf-8"))
    tj = json.loads(args.theme_json.read_text(encoding="utf-8"))
    writes = json.loads(args.writes.read_text(encoding="utf-8"))
    result = filter_writes(args.block_slug, writes, bj, tj)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
