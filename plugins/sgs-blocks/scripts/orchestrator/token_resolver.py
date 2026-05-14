#!/usr/bin/env python3
"""token_resolver.py -- Spec 15 Phase 5d.2 token resolver.

Wraps Phase 1's value-matcher (plugins/sgs-blocks/scripts/value-matcher/
match.py) into a single attr-aware entry point. Given an extracted
(block_slug, attr_name, raw_value), the resolver:

  1. Picks the right snap function by inferring the attr's role
     (colour / spacing / font-size / shadow / font-family).
  2. Calls the matcher against the theme.json registry (base + optional
     client variation overlay per Spec 15 Â§4.7).
  3. Returns either:
       - `var(--wp--preset--<type>--<slug>)` when confidence >= threshold
       - the raw value + `is_gap_candidate=true` when no snap fits

The resolver NEVER mutates theme.json -- discovery of new tokens belongs
to /sgs-clone Phase 4.5 additive-token discovery, not here.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import importlib.util as _ilu
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent
_VALUE_MATCHER = HERE.parent / "value-matcher" / "match.py"

# Lazy load value-matcher (sibling package, hyphenated dir name).
_vm_spec = _ilu.spec_from_file_location("value_matcher", _VALUE_MATCHER)
_vm = _ilu.module_from_spec(_vm_spec)
sys.modules.setdefault("value_matcher", _vm)
_vm_spec.loader.exec_module(_vm)


# Confidence threshold below which we treat the snap as a gap candidate.
# 0.6 maps to the "close match" tier across all snap_* functions; below
# that the value-matcher already returns the raw value.
DEFAULT_MIN_CONFIDENCE = 0.6


# ---------------------------------------------------------------------------
# Lazy-load trace.Trace; soft-fail to None if unavailable.
# ---------------------------------------------------------------------------
def _load_trace():
    """Locate and load trace.Trace; return None on any failure."""
    import importlib.util as _ilu
    from pathlib import Path as _Path
    here = _Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        candidate = parent / "orchestrator" / "trace.py"
        if candidate.exists():
            spec = _ilu.spec_from_file_location("orchestrator_trace", candidate)
            mod = _ilu.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
        candidate2 = parent / "trace.py"
        if candidate2.exists() and parent.name == "orchestrator":
            spec = _ilu.spec_from_file_location("orchestrator_trace", candidate2)
            mod = _ilu.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
    return None

_Trace = _load_trace()


# Attr-name heuristics -> role. The role determines which snap_* function
# to call and which theme.json registry slice to read.
def _role_for_attr(attr_name: str) -> str | None:
    n = attr_name.lower()
    # font-family must take precedence over generic font-size match
    if "fontfamily" in n or "font_family" in n:
        return "family"
    if "fontsize" in n or "font_size" in n:
        return "font_size"
    if "shadow" in n or "boxshadow" in n:
        return "shadow"
    if any(k in n for k in ("color", "colour", "background", "border", "stroke")):
        return "color"
    if any(k in n for k in ("padding", "margin", "gap", "spacing", "indent",
                            "rowgap", "columngap")):
        return "spacing"
    return None


def _registry_slice(theme_json: dict, role: str) -> list[dict] | None:
    settings = theme_json.get("settings") or {}
    if role == "color":
        return (settings.get("color") or {}).get("palette") or []
    if role == "spacing":
        return (settings.get("spacing") or {}).get("spacingSizes") or []
    if role == "font_size":
        return (settings.get("typography") or {}).get("fontSizes") or []
    if role == "shadow":
        return (settings.get("shadow") or {}).get("presets") or []
    if role == "family":
        return (settings.get("typography") or {}).get("fontFamilies") or []
    return None


def _css_var(role: str, slug: str) -> str:
    # WP convention: var(--wp--preset--<role>--<slug>) with shadow/font-size
    # using their own preset namespaces.
    role_to_namespace = {
        "color":     "color",
        "spacing":   "spacing",
        "font_size": "font-size",
        "shadow":    "shadow",
        "family":    "font-family",
    }
    ns = role_to_namespace.get(role, role)
    return f"var(--wp--preset--{ns}--{slug})"


def resolve(
    block_slug: str,            # noqa: ARG001 -- reserved for future per-block snap policies
    attr_name: str,
    raw_value,
    theme_json: dict,
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
    run_dir=None,
) -> dict:
    """Resolve ONE extracted attribute to a token CSS var or a gap candidate.

    Returns:
        {
          "block_slug":     ...,
          "attr_name":      ...,
          "raw_value":      ...,
          "role":           "color" | "spacing" | "font_size" | "shadow" |
                            "family" | None,
          "token_slug":     <slug> when snapped,
          "css_var":        "var(--wp--preset--...)" when snapped,
          "confidence":     0.0-1.0,
          "is_gap_candidate": True when no snap fits,
          "snap_skipped_reason": <str> when the resolver skipped without
                                 calling the matcher,
        }
    """
    tr = (_Trace.for_run(run_dir) if _Trace else None)

    role = _role_for_attr(attr_name)
    base = {
        "block_slug": block_slug,
        "attr_name":  attr_name,
        "raw_value":  raw_value,
        "role":       role,
    }
    if role is None:
        result = {**base, "token_slug": None, "css_var": None, "confidence": 0.0,
                  "is_gap_candidate": False,
                  "snap_skipped_reason": "no role mapping for attr"}
        if tr:
            try:
                tr.event(stage="stage_4_5_token_resolve", **result)
            except Exception:
                pass
        return result
    if not isinstance(raw_value, str) or not raw_value.strip():
        result = {**base, "token_slug": None, "css_var": None, "confidence": 0.0,
                  "is_gap_candidate": False,
                  "snap_skipped_reason": "raw_value not a non-empty string"}
        if tr:
            try:
                tr.event(stage="stage_4_5_token_resolve", **result)
            except Exception:
                pass
        return result
    registry = _registry_slice(theme_json, role) or []
    if not registry:
        result = {**base, "token_slug": None, "css_var": None, "confidence": 0.0,
                  "is_gap_candidate": True,
                  "snap_skipped_reason": f"theme.json registry slice for {role!r} is empty"}
        if tr:
            try:
                tr.event(stage="stage_4_5_token_resolve", **result)
            except Exception:
                pass
        return result

    snap_fn = {
        "color":     _vm.snap_color,
        "spacing":   _vm.snap_spacing,
        "font_size": _vm.snap_font_size,
        "shadow":    _vm.snap_shadow,
        "family":    _vm.snap_family,
    }[role]
    slug, confidence = snap_fn(raw_value, registry)

    if confidence >= min_confidence:
        result = {**base, "token_slug": slug, "css_var": _css_var(role, slug),
                  "confidence": confidence, "is_gap_candidate": False,
                  "snap_skipped_reason": None}
        if tr:
            try:
                tr.event(stage="stage_4_5_token_resolve", **result)
            except Exception:
                pass
        return result
    # Below threshold -- write gap candidate; downstream additive-token
    # discovery decides whether to emit a NewTokenCandidate.
    result = {**base, "token_slug": None, "css_var": None,
              "confidence": confidence, "is_gap_candidate": True,
              "snap_skipped_reason": f"confidence {confidence:.2f} below {min_confidence}"}
    if tr:
        try:
            tr.event(stage="stage_4_5_token_resolve", **result)
        except Exception:
            pass
    return result


def resolve_batch(
    items: list[dict],
    theme_json: dict,
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
    run_dir=None,
) -> list[dict]:
    """Convenience: resolve a list of {block_slug, attr_name, raw_value}."""
    return [
        resolve(i.get("block_slug", ""), i["attr_name"], i.get("raw_value"),
                theme_json, min_confidence=min_confidence, run_dir=run_dir)
        for i in items
    ]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--theme-json", type=Path, required=True)
    parser.add_argument("--input", type=Path, required=True,
                        help="JSON list of {block_slug, attr_name, raw_value}")
    parser.add_argument("--min-confidence", type=float, default=DEFAULT_MIN_CONFIDENCE)
    args = parser.parse_args(argv)

    theme = json.loads(args.theme_json.read_text(encoding="utf-8"))
    items = json.loads(args.input.read_text(encoding="utf-8"))
    out = resolve_batch(items, theme, min_confidence=args.min_confidence)
    print(json.dumps(out, indent=2, ensure_ascii=False, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
