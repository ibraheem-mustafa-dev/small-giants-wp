"""
Token-discovery lint — Stage 0.5 of /sgs-clone (Spec 15 §7, FR38).

Architectural pivot (2026-05-12): additive token-discovery mode.
Previously, the lint flagged non-token CSS values as violations.  The new
default behaviour is to REGISTER them as new tokens in a client-specific style
variation JSON — making the lint a "token-discovery pass" that produces a
TokenWritePlan, not a verdict.

Cloning workflows preserve intentional bespoke detail.  A margin-bottom of
28px that sits between two spacing tokens is a real designer choice, not a
near-miss to snap.  The right behaviour is to ADD it as a new spacing token in
the client's style variation.

Confidence tiers (from value-matcher §5.4):
  confidence == 1.0 → already a registered token; do nothing.
  confidence  < 1.0 → new token candidate; record for write-plan.

Three modes (Spec 15 §9):
  strict  — discovery pass; passed=True; new candidates are gathered.
  draft   — identical to strict (mode affects downstream outputs, not discovery).
  legacy  — short-circuit; no candidates; passed=True; exit=0.

New --no-new-tokens flag re-enables the old verdict behaviour:
  strict + --no-new-tokens — gap-candidates and low-confidence-snaps cause
    passed=False, exit=1.
  draft  + --no-new-tokens — same violations but passed=True, is_warning=True.
  legacy + --no-new-tokens — always bypass.

Used by:
  - /sgs-clone orchestrator (Stage 0.5) — reads .passed to decide whether to
    halt (always True in additive mode; may be False in --no-new-tokens strict).
  - Pre-commit hook on sites/*/mockups/ files (FR39).

Depends on:
  - plugins/sgs-blocks/scripts/value-matcher/match.py (Phase 1)
  - theme/sgs-theme/theme.json (canonical token source)
  - A client style variation JSON for apply_write_plan().

Known parsing gaps (v1 — regex-based, not a full CSS AST):
  - Multi-level nested @media blocks are walked normally; deeply nested
    @keyframes or @font-face inside @media may not be fully skipped (rare in
    mockup CSS).
  - Shorthand border: 1px solid #abc — only the colour component is extracted;
    the 1px dimension is not additionally routed to snap_spacing.
  - background shorthand with multiple components is partially parsed: only
    colour-like tokens that don't start with url( are attempted; others are
    skipped.
  - CSS calc(), env() values, and multi-value border-radius shorthands are
    skipped (not tokenisable without an AST).
  - max-width / min-width values route to a dedicated _snap_max_width matcher
    against settings.layout.contentSize, settings.layout.wideSize, and
    settings.custom.maxWidth.* — exact-match only (no fuzzy tolerance).
    Discoveries appear under token_class="maxWidth". width / height / inset
    still route to snap_spacing as they are dimension tokens, not container
    widths. (Shipped Phase 4.5, 2026-05-12.)
"""

from __future__ import annotations

import argparse
import copy
import dataclasses
import html.parser
import json
import math
import re
import sys
import tempfile
from pathlib import Path
from typing import Any, Literal

# ---------------------------------------------------------------------------
# Value-matcher import — resolve relative to this file's location.
# ---------------------------------------------------------------------------
# The value-matcher directory uses a hyphen in its name so it cannot be
# imported as a normal Python package.  We load match.py directly via
# importlib.util so the import is portable regardless of working directory.

import importlib.util as _importlib_util

_MATCH_PY = Path(__file__).resolve().parents[1] / "value-matcher" / "match.py"
_match_spec = _importlib_util.spec_from_file_location("sgs_value_matcher", _MATCH_PY)
assert _match_spec is not None and _match_spec.loader is not None, (
    f"Could not load value-matcher match.py from {_MATCH_PY}"
)
_match_mod = _importlib_util.module_from_spec(_match_spec)
_match_spec.loader.exec_module(_match_mod)  # type: ignore[union-attr]

snap_color = _match_mod.snap_color
snap_spacing = _match_mod.snap_spacing
snap_font_size = _match_mod.snap_font_size
snap_shadow = _match_mod.snap_shadow
snap_family = _match_mod.snap_family

# ---------------------------------------------------------------------------
# Public types — new (additive) API
# ---------------------------------------------------------------------------

Mode = Literal["strict", "draft", "legacy"]
TokenClass = Literal["color", "spacing", "fontSize", "fontFamily", "shadow", "maxWidth"]
_VALID_MODES: tuple[str, ...] = ("strict", "draft", "legacy")


@dataclasses.dataclass
class Occurrence:
    """One usage of a raw CSS value in the source."""

    line: int
    col: int
    source_label: str
    css_property: str


@dataclasses.dataclass
class NewTokenCandidate:
    """A CSS value that is NOT already a registered token — proposed as a new one."""

    token_class: TokenClass   # "color" | "spacing" | "fontSize" | "fontFamily" | "shadow" | "maxWidth"
    proposed_slug: str        # auto-generated slug (e.g. "28" for 28px, "fraunces" for Fraunces)
    raw_value: str            # the original CSS value string
    occurrences: list[Occurrence]  # one entry per usage in source


@dataclasses.dataclass
class TokenWritePlan:
    """Aggregate result from a discovery pass over one CSS document or HTML file."""

    mode: Mode
    new_tokens: list[NewTokenCandidate]
    total_declarations_checked: int
    passed: bool   # always True in additive mode; may be False in --no-new-tokens strict
    summary: str   # human-readable one-liner


# ---------------------------------------------------------------------------
# Deprecated shims — kept for callers that iterate result.violations
# ---------------------------------------------------------------------------
# The orchestrator (sgs-clone-orchestrator.py Stage 0.5) accesses
# result.violations, result.total_declarations_checked, result.passed, and
# result.exit_code by attribute.  Those callers need updating to use
# TokenWritePlan.new_tokens.  Until they are updated these shim types remain
# importable but are marked deprecated.
#
# DEPRECATED: TokenViolation and LintResult. Use NewTokenCandidate and
# TokenWritePlan instead.

_Flag = Literal["gap-candidate", "low-confidence-snap"]


@dataclasses.dataclass
class TokenViolation:
    """DEPRECATED — use NewTokenCandidate instead.

    Kept as a shim for callers that access result.violations.
    """

    property: str
    raw_value: str
    nearest_token: str
    confidence: float
    line: int
    col: int
    source_label: str
    flag: _Flag
    is_warning: bool = False


@dataclasses.dataclass
class LintResult:
    """DEPRECATED — use TokenWritePlan instead.

    Kept as a shim for callers that access result.violations, result.passed,
    result.exit_code.
    """

    violations: list[TokenViolation]
    mode: Mode
    total_declarations_checked: int
    passed: bool
    exit_code: int


# ---------------------------------------------------------------------------
# Theme loading
# ---------------------------------------------------------------------------

def _find_project_root(start: Path) -> Path:
    """Walk upward from *start* until we find theme/sgs-theme/theme.json."""
    current = start.resolve()
    for _ in range(12):  # limit depth to prevent runaway
        candidate = current / "theme" / "sgs-theme" / "theme.json"
        if candidate.exists():
            return current
        parent = current.parent
        if parent == current:
            break
        current = parent
    # Fallback: assume 4 levels up from this script's location is the project root.
    return Path(__file__).resolve().parents[4]


def load_theme(path: Path) -> dict[str, Any]:
    """Load theme.json and return a normalised dict.

    Keys returned:
      palette       — settings.color.palette (list of {slug, color})
      spacing_sizes — settings.spacing.spacingSizes (list of {slug, size})
      font_sizes    — settings.typography.fontSizes (list of {slug, size})
      shadow_presets— settings.shadow.presets (list of {slug, shadow})
      font_families — settings.typography.fontFamilies (list of {slug, fontFamily})
      max_widths    — settings.layout.contentSize + wideSize + settings.custom.maxWidth.*
                      flattened as list of {slug, size}
    """
    with open(path, encoding="utf-8") as fh:
        raw: dict[str, Any] = json.load(fh)

    settings = raw.get("settings", {})
    max_widths: list[dict[str, str]] = []
    layout = settings.get("layout", {})
    if layout.get("contentSize"):
        max_widths.append({"slug": "content", "size": str(layout["contentSize"])})
    if layout.get("wideSize"):
        max_widths.append({"slug": "wide", "size": str(layout["wideSize"])})
    custom_max = settings.get("custom", {}).get("maxWidth", {}) or {}
    for slug, size in custom_max.items():
        max_widths.append({"slug": str(slug), "size": str(size)})

    return {
        "palette": settings.get("color", {}).get("palette", []),
        "spacing_sizes": settings.get("spacing", {}).get("spacingSizes", []),
        "font_sizes": settings.get("typography", {}).get("fontSizes", []),
        "shadow_presets": settings.get("shadow", {}).get("presets", []),
        "font_families": settings.get("typography", {}).get("fontFamilies", []),
        "max_widths": max_widths,
    }


def merge_variation(theme: dict[str, Any], variation_path: Path) -> dict[str, Any]:
    """Overlay a client style variation's tokens on top of the base theme.

    Returns a new dict — does not mutate ``theme``. Tokens from the variation
    extend the corresponding lists; matching slugs in the variation override
    the base entries.
    """
    variation = load_theme(variation_path)
    merged: dict[str, Any] = {k: list(v) for k, v in theme.items()}
    for key in ("palette", "spacing_sizes", "font_sizes", "shadow_presets",
                "font_families", "max_widths"):
        base_by_slug = {e.get("slug"): i for i, e in enumerate(merged[key]) if isinstance(e, dict)}
        for entry in variation.get(key, []):
            if not isinstance(entry, dict):
                continue
            slug = entry.get("slug")
            if slug in base_by_slug:
                merged[key][base_by_slug[slug]] = entry
            else:
                merged[key].append(entry)
    return merged


def _snap_max_width(value: str, max_widths: list[dict[str, Any]]) -> tuple[str, float]:
    """Snap a CSS length value to the nearest registered maxWidth token.

    maxWidth tokens are discrete named container widths (contentSize, wideSize,
    custom.maxWidth.*). We treat them as exact-match only — if the supplied
    value normalises to one of the registered sizes, confidence is 1.0;
    otherwise it's a gap candidate (confidence 0.0).
    """
    cleaned = value.strip().lower()
    if not max_widths:
        return (value, 0.0)
    for entry in max_widths:
        if str(entry.get("size", "")).strip().lower() == cleaned:
            return (str(entry.get("slug", "")), 1.0)
    return (value, 0.0)


def _default_theme_path() -> Path:
    """Resolve the default theme.json path relative to the project root."""
    project_root = _find_project_root(Path(__file__).resolve())
    return project_root / "theme" / "sgs-theme" / "theme.json"


# ---------------------------------------------------------------------------
# CSS property routing
# ---------------------------------------------------------------------------

# Properties routed to snap_color.
_COLOUR_PROPERTIES: frozenset[str] = frozenset({
    "color",
    "background-color",
    "border-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "outline-color",
    "fill",
    "stroke",
    "caret-color",
    "column-rule-color",
    "text-decoration-color",
    "text-emphasis-color",
})

# Properties routed to snap_spacing (layout dimensions).
_SPACING_PROPERTIES: frozenset[str] = frozenset({
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "gap",
    "row-gap",
    "column-gap",
    "top",
    "right",
    "bottom",
    "left",
    "width",
    "min-width",
    "max-width",
    "height",
    "min-height",
    "max-height",
    "border-radius",
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-left-radius",
    "border-bottom-right-radius",
    "flex-basis",
    "inset",
    "inset-block",
    "inset-block-start",
    "inset-block-end",
    "inset-inline",
    "inset-inline-start",
    "inset-inline-end",
})

# max-width / width are spacing-routed in v1 but semantically belong to a
# dedicated maxWidth token class.  Track them so the write-plan can route them
# correctly when apply_write_plan() is called.
_MAX_WIDTH_PROPERTIES: frozenset[str] = frozenset({"max-width", "min-width"})

# Properties handled by specialised matchers.
_FONT_SIZE_PROPERTIES: frozenset[str] = frozenset({"font-size"})
_SHADOW_PROPERTIES: frozenset[str] = frozenset({"box-shadow", "text-shadow"})
_FAMILY_PROPERTIES: frozenset[str] = frozenset({"font-family"})


def _route_property(prop: str) -> str | None:
    """Return the matcher key for *prop*, or None if it should be skipped."""
    prop = prop.strip().lower()

    if prop in _COLOUR_PROPERTIES:
        return "color"
    if prop.endswith("-color"):
        return "color"
    if prop == "background":
        return "background"  # special partial handling
    if prop in _MAX_WIDTH_PROPERTIES:
        return "max-width"
    if prop in _SPACING_PROPERTIES:
        return "spacing"
    if prop in _FONT_SIZE_PROPERTIES:
        return "font-size"
    if prop in _SHADOW_PROPERTIES:
        return "shadow"
    if prop in _FAMILY_PROPERTIES:
        return "family"
    return None


def _token_class_for_route(route: str, prop: str) -> TokenClass:
    """Map a matcher route + original property to a TokenClass."""
    if route == "color" or route == "background":
        return "color"
    if route == "max-width":
        return "maxWidth"
    if route == "spacing":
        return "spacing"
    if route == "font-size":
        return "fontSize"
    if route == "shadow":
        return "shadow"
    if route == "family":
        return "fontFamily"
    return "spacing"  # unreachable fallback


# ---------------------------------------------------------------------------
# Value exemption helpers
# ---------------------------------------------------------------------------

# Patterns that are already-token or non-tokenisable — exempt from checking.
_EXEMPT_VALUE_PATTERNS = re.compile(
    r"""
    var\(                   # CSS variable reference
    | currentcolor          # special keyword
    | inherit
    | initial
    | unset
    | revert
    | revert-layer
    | transparent
    | ^auto$
    | ^none$
    | ^normal$
    | ^0$                   # bare zero
    | ^0px$
    | ^0rem$
    | ^0em$
    | ^0\%$
    """,
    re.IGNORECASE | re.VERBOSE,
)


def _is_exempt_value(value: str) -> bool:
    """Return True if *value* should be skipped entirely (already a token or non-snappable)."""
    stripped = value.strip()
    return bool(_EXEMPT_VALUE_PATTERNS.search(stripped))


# Length-like pattern for splitting spacing shorthands.
_LENGTH_TOKEN_RE = re.compile(
    r"-?[\d.]+\s*(?:px|rem|em|%|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc)"
    r"|^0$",
    re.IGNORECASE,
)

# Pattern to identify a value that looks like a CSS colour (hex, rgb, rgba, named).
_COLOUR_LIKE_RE = re.compile(
    r"^#[0-9a-fA-F]{3,8}$"
    r"|^rgb[a]?\("
    r"|^[a-z][-a-z]+$",  # named colours are lower-alpha only; value already stripped
    re.IGNORECASE,
)


def _split_shorthand_lengths(value: str) -> list[str]:
    """Split a shorthand value like '16px 24px' into individual length strings."""
    return _LENGTH_TOKEN_RE.findall(value)


# ---------------------------------------------------------------------------
# Core snapping logic
# ---------------------------------------------------------------------------

def _snap_value(
    value: str,
    route: str,
    theme: dict[str, Any],
) -> tuple[str, float] | None:
    """
    Route *value* to the correct matcher function.

    Returns (nearest_token_or_raw, confidence) or None if the value
    is not snappable for this property/route combination.
    """
    cleaned = value.strip()

    if route == "color":
        if not _COLOUR_LIKE_RE.match(cleaned) and not cleaned.startswith("rgb"):
            return None
        return snap_color(cleaned, theme["palette"])

    if route == "background":
        # Attempt to extract a bare colour token from a background shorthand.
        if re.search(r"url\s*\(|gradient\s*\(|linear-gradient|radial-gradient", cleaned, re.IGNORECASE):
            return None
        if _COLOUR_LIKE_RE.match(cleaned):
            return snap_color(cleaned, theme["palette"])
        return None

    if route == "spacing":
        # For shorthand properties like padding/margin, snap the first part.
        parts = _split_shorthand_lengths(cleaned)
        if not parts:
            return None
        return snap_spacing(parts[0], theme["spacing_sizes"])

    if route == "max-width":
        return _snap_max_width(cleaned, theme.get("max_widths", []))

    if route == "font-size":
        return snap_font_size(cleaned, theme["font_sizes"])

    if route == "shadow":
        return snap_shadow(cleaned, theme["shadow_presets"])

    if route == "family":
        return snap_family(cleaned, theme["font_families"])

    return None


def _snap_spacing_multi(
    value: str,
    theme: dict[str, Any],
) -> list[tuple[str, str, float]]:
    """
    Snap all length tokens in a spacing shorthand value.

    Returns list of (individual_length_str, nearest_token_or_raw, confidence).
    """
    cleaned = value.strip()
    parts = _split_shorthand_lengths(cleaned)
    results = []
    for part in parts:
        token, conf = snap_spacing(part, theme["spacing_sizes"])
        results.append((part, token, conf))
    return results


# ---------------------------------------------------------------------------
# CSS parser (regex-based, not full AST)
# ---------------------------------------------------------------------------

def _strip_comments(css: str) -> str:
    """Remove /* ... */ block comments from CSS source."""
    return re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)


def _skip_at_blocks(css: str, block_names: tuple[str, ...]) -> str:
    """
    Remove @<name> { ... } blocks from CSS source where the braces may contain
    the source.  Only handles single-level nesting reliably.
    """
    for name in block_names:
        pattern = re.compile(
            r"@" + name + r"\s[^{]*\{",
            re.IGNORECASE,
        )
        while True:
            m = pattern.search(css)
            if not m:
                break
            start = m.start()
            open_pos = m.end() - 1
            depth = 1
            pos = open_pos + 1
            while pos < len(css) and depth > 0:
                if css[pos] == "{":
                    depth += 1
                elif css[pos] == "}":
                    depth -= 1
                pos += 1
            replacement = re.sub(r"[^\n]", " ", css[start:pos])
            css = css[:start] + replacement + css[pos:]
    return css


def _compute_line_col(source: str, offset: int) -> tuple[int, int]:
    """Return (line, col) for *offset* in *source* (1-based)."""
    before = source[:offset]
    line = before.count("\n") + 1
    last_newline = before.rfind("\n")
    col = offset - last_newline
    return line, col


def _flush_decl(
    chars: list[str],
    decl_start: int,
    css_source: str,
    declarations: list[tuple[str, str, int, int]],
) -> None:
    """Parse accumulated chars as a CSS declaration and append to *declarations* if valid."""
    decl_str = "".join(chars).strip()
    if ":" not in decl_str:
        return
    colon_pos = decl_str.index(":")
    prop = decl_str[:colon_pos].strip()
    val = decl_str[colon_pos + 1:].strip()
    if prop and val:
        line, col = _compute_line_col(css_source, decl_start)
        declarations.append((prop, val, line, col))


def _parse_css_declarations(
    css_source: str,
) -> list[tuple[str, str, int, int]]:
    """
    Walk *css_source* and yield (property, value, line, col) for every
    declaration found inside a rule body (brace depth >= 1).
    """
    cleaned = _strip_comments(css_source)
    cleaned = _skip_at_blocks(cleaned, ("keyframes", "font-face"))

    declarations: list[tuple[str, str, int, int]] = []
    depth = 0
    i = 0
    length = len(cleaned)
    current_decl_start = -1
    current_chars: list[str] = []

    while i < length:
        ch = cleaned[i]

        if ch == "{":
            depth += 1
            current_chars = []
            current_decl_start = i + 1
        elif ch == "}":
            depth = max(0, depth - 1)
            current_chars = []
        elif depth >= 1:
            if ch == ";":
                _flush_decl(current_chars, current_decl_start, css_source, declarations)
                current_chars = []
                current_decl_start = i + 1
            else:
                current_chars.append(ch)

        i += 1

    return declarations


# ---------------------------------------------------------------------------
# Proposed slug generators
# ---------------------------------------------------------------------------

def _slug_for_color(raw_value: str) -> str:
    """Generate a proposed slug for a colour token.

    e.g. '#abcdef' → 'client-abcdef', 'rgb(10,20,30)' → 'client-rgb-10-20-30'
    """
    cleaned = raw_value.strip().lstrip("#")
    # Normalise rgb/rgba to something slug-safe.
    cleaned = re.sub(r"[^a-zA-Z0-9]", "-", cleaned).strip("-")
    cleaned = re.sub(r"-{2,}", "-", cleaned).lower()
    return f"client-{cleaned}"


def _slug_for_spacing(raw_value: str) -> str:
    """Generate a proposed slug for a spacing token.

    e.g. '28px' → '28', '1.75rem' → '28' (converted to px equivalent).
    """
    cleaned = raw_value.strip()
    # Try to extract integer pixel equivalent.
    px_m = re.match(r"^([\d.]+)\s*px$", cleaned, re.IGNORECASE)
    if px_m:
        px = float(px_m.group(1))
        return str(int(px)) if px == int(px) else str(px)
    rem_m = re.match(r"^([\d.]+)\s*rem$", cleaned, re.IGNORECASE)
    if rem_m:
        px = float(rem_m.group(1)) * 16.0
        return str(int(px)) if px == int(px) else str(px)
    em_m = re.match(r"^([\d.]+)\s*em$", cleaned, re.IGNORECASE)
    if em_m:
        px = float(em_m.group(1)) * 16.0
        return str(int(px)) if px == int(px) else str(px)
    # Fallback: sanitise the raw value.
    return re.sub(r"[^a-z0-9]", "-", cleaned.lower()).strip("-")


def _slug_for_font_size(raw_value: str) -> str:
    """Generate a proposed slug for a font-size token.  Same logic as spacing."""
    return _slug_for_spacing(raw_value)


def _slug_for_font_family(raw_value: str) -> str:
    """Generate a proposed slug for a font-family token.

    e.g. "'Fraunces', serif" → 'fraunces'
    """
    first_name = raw_value.split(",")[0].strip().strip("'\"")
    return re.sub(r"[^a-z0-9]", "-", first_name.lower()).strip("-")


def _slug_for_shadow(raw_value: str) -> str:
    """Generate a proposed slug for a shadow token."""
    sanitised = re.sub(r"[^a-z0-9]", "-", raw_value.lower()).strip("-")
    sanitised = re.sub(r"-{2,}", "-", sanitised)
    return f"custom-{sanitised[:40]}"


def _slug_for_max_width(raw_value: str) -> str:
    """Generate a proposed slug for a maxWidth token.

    e.g. '420px' → 'narrow-420', '1280px' → 'wide-1280'
    """
    px_m = re.match(r"^([\d.]+)\s*px$", raw_value.strip(), re.IGNORECASE)
    if px_m:
        px = int(float(px_m.group(1)))
        label = "narrow" if px <= 600 else ("medium" if px <= 900 else "wide")
        return f"{label}-{px}"
    return re.sub(r"[^a-z0-9]", "-", raw_value.lower()).strip("-")


def _generate_slug(token_class: TokenClass, raw_value: str, prop: str) -> str:
    """Dispatch to the correct slug generator for *token_class*."""
    if token_class == "color":
        return _slug_for_color(raw_value)
    if token_class == "spacing":
        return _slug_for_spacing(raw_value)
    if token_class == "fontSize":
        return _slug_for_font_size(raw_value)
    if token_class == "fontFamily":
        return _slug_for_font_family(raw_value)
    if token_class == "shadow":
        return _slug_for_shadow(raw_value)
    if token_class == "maxWidth":
        return _slug_for_max_width(raw_value)
    return re.sub(r"[^a-z0-9]", "-", raw_value.lower()).strip("-")


# ---------------------------------------------------------------------------
# Discovery core
# ---------------------------------------------------------------------------

def _discover_from_declaration(
    prop: str,
    value: str,
    line: int,
    col: int,
    source_label: str,
    theme: dict[str, Any],
) -> list[tuple[TokenClass, str, str, Occurrence]]:
    """
    Check a single CSS declaration and return token candidates.

    Returns a list of (token_class, proposed_slug, raw_value, occurrence).
    Empty list if the value is already a registered token or is exempt.
    """
    if _is_exempt_value(value):
        return []

    route = _route_property(prop)
    if route is None:
        return []

    token_class = _token_class_for_route(route, prop)
    occurrence = Occurrence(line=line, col=col, source_label=source_label, css_property=prop)

    if route == "spacing" and prop.strip().lower() in _SPACING_PROPERTIES:
        # Handle shorthands by checking each length token individually.
        parts = _snap_spacing_multi(value, theme)
        results: list[tuple[TokenClass, str, str, Occurrence]] = []
        for raw_part, _nearest, confidence in parts:
            if _is_exempt_value(raw_part):
                continue
            if math.isclose(confidence, 1.0, abs_tol=1e-9):
                continue  # already a registered token
            # Determine whether this is a max-width dimension.
            actual_class: TokenClass = (
                "maxWidth" if prop.strip().lower() in _MAX_WIDTH_PROPERTIES else "spacing"
            )
            slug = _generate_slug(actual_class, raw_part, prop)
            results.append((actual_class, slug, raw_part, occurrence))
        return results

    # All other routes snap a single value.
    result = _snap_value(value, route, theme)
    if result is None:
        return []

    _nearest, confidence = result
    if math.isclose(confidence, 1.0, abs_tol=1e-9):
        return []  # already a registered token

    slug = _generate_slug(token_class, value, prop)
    return [(token_class, slug, value, occurrence)]


def _build_write_plan(
    declarations: list[tuple[str, str, int, int]],
    mode: Mode,
    source_label: str,
    theme: dict[str, Any],
) -> TokenWritePlan:
    """Aggregate token discovery results into a TokenWritePlan."""
    if mode == "legacy":
        return TokenWritePlan(
            mode=mode,
            new_tokens=[],
            total_declarations_checked=0,
            passed=True,
            summary="Legacy mode — discovery bypassed.",
        )

    # key: (token_class, proposed_slug, raw_value) → NewTokenCandidate
    candidates: dict[tuple[str, str, str], NewTokenCandidate] = {}
    total_checked = 0

    for prop, value, line, col in declarations:
        route = _route_property(prop)
        if route is None:
            continue
        if _is_exempt_value(value):
            continue
        total_checked += 1

        discovered = _discover_from_declaration(
            prop, value, line, col, source_label, theme
        )
        for token_class, slug, raw_value, occurrence in discovered:
            key = (token_class, slug, raw_value)
            if key not in candidates:
                candidates[key] = NewTokenCandidate(
                    token_class=token_class,
                    proposed_slug=slug,
                    raw_value=raw_value,
                    occurrences=[],
                )
            candidates[key].occurrences.append(occurrence)

    new_tokens = list(candidates.values())
    n = len(new_tokens)
    summary = (
        f"Discovery pass complete — {n} new token candidate(s) found "
        f"across {total_checked} declaration(s) checked [mode={mode}]."
    )
    if n == 0:
        summary = (
            f"All {total_checked} declaration(s) already use registered tokens [mode={mode}]."
        )

    return TokenWritePlan(
        mode=mode,
        new_tokens=new_tokens,
        total_declarations_checked=total_checked,
        passed=True,
        summary=summary,
    )


# ---------------------------------------------------------------------------
# --no-new-tokens verdict mode (backward-compat with old lint behaviour)
# ---------------------------------------------------------------------------

def _confidence_flag(confidence: float) -> _Flag | None:
    """Return the appropriate flag for *confidence*, or None if no violation."""
    if math.isclose(confidence, 1.0, abs_tol=1e-9):
        return None
    if math.isclose(confidence, 0.0, abs_tol=1e-9):
        return "gap-candidate"
    return "low-confidence-snap"


def _check_declaration_verdict(
    prop: str,
    value: str,
    line: int,
    col: int,
    source_label: str,
    mode: Mode,
    theme: dict[str, Any],
) -> list[TokenViolation]:
    """
    Check a single CSS declaration and return violations (--no-new-tokens mode).

    For spacing shorthands, all individual length tokens in the value are
    checked and may each produce a violation.
    """
    if _is_exempt_value(value):
        return []

    route = _route_property(prop)
    if route is None:
        return []

    is_warning = mode == "draft"
    violations: list[TokenViolation] = []

    if route == "spacing" and prop in _SPACING_PROPERTIES:
        parts = _snap_spacing_multi(value, theme)
        for raw_part, token, confidence in parts:
            v = _make_spacing_violation(
                prop, raw_part, token, confidence, line, col, source_label, is_warning
            )
            if v is not None:
                violations.append(v)
        return violations

    result = _snap_value(value, route, theme)
    if result is None:
        return []

    token, confidence = result
    v = _make_violation(prop, value, token, confidence, line, col, source_label, is_warning)
    if v is not None:
        violations.append(v)
    return violations


def _make_violation(
    prop: str,
    raw_value: str,
    token: str,
    confidence: float,
    line: int,
    col: int,
    source_label: str,
    is_warning: bool,
) -> TokenViolation | None:
    """Build a TokenViolation for a single-value snap result, or None if no violation."""
    flag = _confidence_flag(confidence)
    if flag is None:
        return None
    nearest = "—" if flag == "gap-candidate" else token
    return TokenViolation(
        property=prop,
        raw_value=raw_value,
        nearest_token=nearest,
        confidence=confidence,
        line=line,
        col=col,
        source_label=source_label,
        flag=flag,
        is_warning=is_warning,
    )


def _make_spacing_violation(
    prop: str,
    raw_part: str,
    token: str,
    confidence: float,
    line: int,
    col: int,
    source_label: str,
    is_warning: bool,
) -> TokenViolation | None:
    """Build a TokenViolation for one part of a spacing shorthand, or None if exempt/passing."""
    if _is_exempt_value(raw_part):
        return None
    return _make_violation(prop, raw_part, token, confidence, line, col, source_label, is_warning)


def _lint_declarations_verdict(
    declarations: list[tuple[str, str, int, int]],
    mode: Mode,
    source_label: str,
    theme: dict[str, Any],
) -> LintResult:
    """Build a LintResult from declarations (--no-new-tokens path)."""
    if mode == "legacy":
        return LintResult(
            violations=[],
            mode=mode,
            total_declarations_checked=0,
            passed=True,
            exit_code=0,
        )

    violations: list[TokenViolation] = []
    total_checked = 0

    for prop, value, line, col in declarations:
        route = _route_property(prop)
        if route is None:
            continue
        if _is_exempt_value(value):
            continue
        total_checked += 1
        new_violations = _check_declaration_verdict(
            prop, value, line, col, source_label, mode, theme
        )
        violations.extend(new_violations)

    passed = not (mode == "strict" and violations)
    exit_code = 0 if passed else 1

    return LintResult(
        violations=violations,
        mode=mode,
        total_declarations_checked=total_checked,
        passed=passed,
        exit_code=exit_code,
    )


# ---------------------------------------------------------------------------
# HTML inline-styles extractor
# ---------------------------------------------------------------------------

class _InlineStyleExtractor(html.parser.HTMLParser):
    """HTMLParser subclass that collects (inline_css_snippet, line, col) from style="" attrs."""

    def __init__(self) -> None:
        super().__init__()
        self._snippets: list[tuple[str, int, int]] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        line, col = self.getpos()
        for attr_name, attr_value in attrs:
            if attr_name == "style" and attr_value:
                self._snippets.append((attr_value, line, col))

    @property
    def snippets(self) -> list[tuple[str, int, int]]:
        return self._snippets


def _extract_inline_styles(html_content: str) -> list[tuple[str, int, int]]:
    """Return list of (inline_css_string, line, col) for all style="" attributes."""
    parser = _InlineStyleExtractor()
    parser.feed(html_content)
    return parser.snippets


def _parse_inline_style_declarations(
    inline_css: str, base_line: int, base_col: int
) -> list[tuple[str, str, int, int]]:
    """
    Parse a style="" attribute value into (property, value, line, col) tuples.

    Inline styles don't have rule blocks — declarations are separated by ';'
    directly.  Line/col are inherited from the element position.
    """
    declarations: list[tuple[str, str, int, int]] = []
    for decl in inline_css.split(";"):
        decl = decl.strip()
        if ":" not in decl:
            continue
        colon_pos = decl.index(":")
        prop = decl[:colon_pos].strip()
        val = decl[colon_pos + 1:].strip()
        if prop and val:
            declarations.append((prop, val, base_line, base_col))
    return declarations


# ---------------------------------------------------------------------------
# Public API — additive discovery (default)
# ---------------------------------------------------------------------------

def _load_theme_with_variations(
    theme_json_path: Path | None,
    variation_paths: list[Path] | None,
) -> dict[str, Any]:
    """Load theme.json then overlay any client style variations supplied."""
    base = load_theme(theme_json_path or _default_theme_path())
    for vpath in variation_paths or []:
        base = merge_variation(base, vpath)
    return base


def lint_css_string(
    css: str,
    mode: Mode = "strict",
    source_label: str = "<string>",
    theme_json_path: Path | None = None,
    no_new_tokens: bool = False,
    variation_paths: list[Path] | None = None,
) -> TokenWritePlan | LintResult:
    """Lint a CSS string for values not already registered as theme.json tokens.

    Default (additive) mode: returns a TokenWritePlan listing new token
    candidates discovered.

    With no_new_tokens=True: returns the deprecated LintResult with
    TokenViolation list (old verdict behaviour).

    If ``variation_paths`` is supplied, the client style variations are
    merged on top of the base theme — tokens registered in any variation
    will dedupe correctly during discovery.
    """
    theme = _load_theme_with_variations(theme_json_path, variation_paths)
    declarations = _parse_css_declarations(css)
    if no_new_tokens:
        return _lint_declarations_verdict(declarations, mode, source_label, theme)
    return _build_write_plan(declarations, mode, source_label, theme)


def lint_css_file(
    path: Path,
    mode: Mode = "strict",
    theme_json_path: Path | None = None,
    no_new_tokens: bool = False,
    variation_paths: list[Path] | None = None,
) -> TokenWritePlan | LintResult:
    """Lint a CSS file for values not already registered as theme.json tokens."""
    content = path.read_text(encoding="utf-8")
    return lint_css_string(
        content,
        mode=mode,
        source_label=str(path),
        theme_json_path=theme_json_path,
        no_new_tokens=no_new_tokens,
        variation_paths=variation_paths,
    )


def lint_html_inline_styles(
    html_path: Path,
    mode: Mode = "strict",
    theme_json_path: Path | None = None,
    no_new_tokens: bool = False,
    variation_paths: list[Path] | None = None,
) -> TokenWritePlan | LintResult:
    """Walk inline style="" attributes inside an HTML file and lint each declaration.

    Default (additive) mode: returns a TokenWritePlan.
    With no_new_tokens=True: returns a LintResult (old verdict behaviour).
    """
    html_content = html_path.read_text(encoding="utf-8")
    theme = _load_theme_with_variations(theme_json_path, variation_paths)
    source_label = str(html_path)

    if mode == "legacy":
        if no_new_tokens:
            return LintResult(
                violations=[],
                mode=mode,
                total_declarations_checked=0,
                passed=True,
                exit_code=0,
            )
        return TokenWritePlan(
            mode=mode,
            new_tokens=[],
            total_declarations_checked=0,
            passed=True,
            summary="Legacy mode — discovery bypassed.",
        )

    snippets = _extract_inline_styles(html_content)
    all_declarations: list[tuple[str, str, int, int]] = []
    for inline_css, line, col in snippets:
        decls = _parse_inline_style_declarations(inline_css, line, col)
        all_declarations.extend(decls)

    if no_new_tokens:
        return _lint_declarations_verdict(all_declarations, mode, source_label, theme)
    return _build_write_plan(all_declarations, mode, source_label, theme)


# ---------------------------------------------------------------------------
# apply_write_plan — write new tokens into a client style variation JSON
# ---------------------------------------------------------------------------

def apply_write_plan(
    plan: TokenWritePlan,
    style_variation_path: Path,
    *,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Apply a write plan to a client style variation JSON.

    Merges new token candidates from *plan* into the style variation at
    *style_variation_path*.  Idempotent — re-running on the same plan and
    variation produces zero changes.

    Parameters
    ----------
    plan:
        A TokenWritePlan produced by one of the lint_* functions.
    style_variation_path:
        Path to the client style variation JSON file (e.g. mamas-munches.json).
    dry_run:
        When True, compute and return the diff plan without writing to disk.

    Returns
    -------
    dict with keys:
        added             — total tokens written
        skipped_duplicates— tokens already present (idempotent skips)
        by_class          — dict of token_class → {"added": int, "skipped": int}
    """
    with open(style_variation_path, encoding="utf-8") as fh:
        variation: dict[str, Any] = json.load(fh)

    # Deep-copy for dry-run comparison.
    original = copy.deepcopy(variation)

    settings: dict[str, Any] = variation.setdefault("settings", {})

    added_total = 0
    skipped_total = 0
    by_class: dict[str, dict[str, int]] = {}

    for candidate in plan.new_tokens:
        tc = candidate.token_class
        by_class.setdefault(tc, {"added": 0, "skipped": 0})

        if tc == "color":
            palette: list[dict[str, Any]] = (
                settings.setdefault("color", {}).setdefault("palette", [])
            )
            existing_slugs = {e["slug"] for e in palette}
            if candidate.proposed_slug in existing_slugs:
                skipped_total += 1
                by_class[tc]["skipped"] += 1
                continue
            raw = candidate.raw_value.strip()
            # Normalise to a 6-char hex if possible for clean JSON.
            hex_val = raw if raw.startswith("#") else raw
            palette.append({
                "slug": candidate.proposed_slug,
                "color": hex_val,
                "name": f"Custom ({hex_val})",
            })
            added_total += 1
            by_class[tc]["added"] += 1

        elif tc == "spacing":
            sizing: list[dict[str, Any]] = (
                settings.setdefault("spacing", {}).setdefault("spacingSizes", [])
            )
            existing_slugs = {e["slug"] for e in sizing}
            if candidate.proposed_slug in existing_slugs:
                skipped_total += 1
                by_class[tc]["skipped"] += 1
                continue
            sizing.append({
                "slug": candidate.proposed_slug,
                "size": candidate.raw_value.strip(),
                "name": candidate.raw_value.strip(),
            })
            added_total += 1
            by_class[tc]["added"] += 1

        elif tc == "fontSize":
            font_sizes: list[dict[str, Any]] = (
                settings.setdefault("typography", {}).setdefault("fontSizes", [])
            )
            existing_slugs = {e["slug"] for e in font_sizes}
            if candidate.proposed_slug in existing_slugs:
                skipped_total += 1
                by_class[tc]["skipped"] += 1
                continue
            font_sizes.append({
                "slug": candidate.proposed_slug,
                "size": candidate.raw_value.strip(),
                "name": candidate.raw_value.strip(),
            })
            added_total += 1
            by_class[tc]["added"] += 1

        elif tc == "fontFamily":
            families: list[dict[str, Any]] = (
                settings.setdefault("typography", {}).setdefault("fontFamilies", [])
            )
            existing_slugs = {e["slug"] for e in families}
            if candidate.proposed_slug in existing_slugs:
                skipped_total += 1
                by_class[tc]["skipped"] += 1
                continue
            # Extract the primary font name for the fontFace entry.
            first_name = candidate.raw_value.split(",")[0].strip().strip("'\"")
            # Build a Google Fonts URL using the first font name.
            gf_name = first_name.replace(" ", "+")
            gf_url = f"https://fonts.googleapis.com/css2?family={gf_name}&display=swap"
            families.append({
                "slug": candidate.proposed_slug,
                "fontFamily": candidate.raw_value.strip(),
                "name": first_name,
                "fontFace": [
                    {
                        "fontFamily": first_name,
                        "fontWeight": "100 900",
                        "fontStyle": "normal",
                        "fontDisplay": "swap",
                        "src": [gf_url],
                    }
                ],
            })
            added_total += 1
            by_class[tc]["added"] += 1

        elif tc == "shadow":
            presets: list[dict[str, Any]] = (
                settings.setdefault("shadow", {}).setdefault("presets", [])
            )
            existing_slugs = {e["slug"] for e in presets}
            if candidate.proposed_slug in existing_slugs:
                skipped_total += 1
                by_class[tc]["skipped"] += 1
                continue
            presets.append({
                "slug": candidate.proposed_slug,
                "shadow": candidate.raw_value.strip(),
                "name": f"Custom ({candidate.proposed_slug})",
            })
            added_total += 1
            by_class[tc]["added"] += 1

        elif tc == "maxWidth":
            custom: dict[str, Any] = settings.setdefault("custom", {})
            max_widths: dict[str, Any] = custom.setdefault("maxWidth", {})
            if candidate.proposed_slug in max_widths:
                skipped_total += 1
                by_class[tc]["skipped"] += 1
                continue
            max_widths[candidate.proposed_slug] = candidate.raw_value.strip()
            added_total += 1
            by_class[tc]["added"] += 1

    summary = {
        "added": added_total,
        "skipped_duplicates": skipped_total,
        "by_class": by_class,
    }

    if dry_run:
        # Restore the original in-memory state (we already deep-copied).
        variation.clear()
        variation.update(original)
        summary["dry_run"] = True
        return summary

    with open(style_variation_path, "w", encoding="utf-8") as fh:
        json.dump(variation, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    return summary


# ---------------------------------------------------------------------------
# Human-readable + JSON output
# ---------------------------------------------------------------------------

def _format_human_plan(plan: TokenWritePlan) -> str:
    """Return a human-readable report for a TokenWritePlan."""
    lines: list[str] = [plan.summary]

    if not plan.new_tokens:
        return "\n".join(lines)

    lines.append("")
    lines.append("New token candidates:")
    for candidate in plan.new_tokens:
        occ_summary = f"{len(candidate.occurrences)} occurrence(s)"
        first = candidate.occurrences[0]
        lines.append(
            f"  [{candidate.token_class}] slug='{candidate.proposed_slug}'"
            f"  value='{candidate.raw_value}'"
            f"  — {occ_summary}"
            f"  (first: {first.source_label}:{first.line}:{first.col}"
            f"  property='{first.css_property}')"
        )

    return "\n".join(lines)


def _format_json_plan(plan: TokenWritePlan) -> str:
    """Return a TokenWritePlan as a JSON string for orchestrator consumption."""
    data = {
        "mode": plan.mode,
        "total_declarations_checked": plan.total_declarations_checked,
        "passed": plan.passed,
        "summary": plan.summary,
        "new_token_count": len(plan.new_tokens),
        "new_tokens": [
            {
                "token_class": c.token_class,
                "proposed_slug": c.proposed_slug,
                "raw_value": c.raw_value,
                "occurrence_count": len(c.occurrences),
                "occurrences": [
                    {
                        "line": o.line,
                        "col": o.col,
                        "source_label": o.source_label,
                        "css_property": o.css_property,
                    }
                    for o in c.occurrences
                ],
            }
            for c in plan.new_tokens
        ],
    }
    return json.dumps(data, indent=2)


def _format_human_verdict(result: LintResult) -> str:
    """Return a human-readable report for a LintResult (--no-new-tokens mode)."""
    lines: list[str] = []
    level = "warning" if result.mode == "draft" else "error"

    for v in result.violations:
        lines.append(
            f"{v.source_label}:{v.line}:{v.col}: {level}: {v.flag} "
            f"property '{v.property}' value '{v.raw_value}' "
            f"-> nearest '{v.nearest_token}' (conf={v.confidence:.2f})"
        )

    total_v = len(result.violations)
    status = "PASS" if result.passed else "FAIL"
    lines.append(
        f"\n{status} - {total_v} violation(s) in "
        f"{result.total_declarations_checked} declaration(s) checked "
        f"[mode={result.mode}, --no-new-tokens]"
    )
    return "\n".join(lines)


def _format_json_verdict(result: LintResult) -> str:
    """Return a LintResult as JSON (--no-new-tokens mode)."""
    data = {
        "mode": result.mode,
        "total_declarations_checked": result.total_declarations_checked,
        "passed": result.passed,
        "exit_code": result.exit_code,
        "violation_count": len(result.violations),
        "violations": [
            {
                "source_label": v.source_label,
                "line": v.line,
                "col": v.col,
                "property": v.property,
                "raw_value": v.raw_value,
                "nearest_token": v.nearest_token,
                "confidence": round(v.confidence, 4),
                "flag": v.flag,
                "is_warning": v.is_warning,
            }
            for v in result.violations
        ],
    }
    return json.dumps(data, indent=2)


# ---------------------------------------------------------------------------
# Self-tests
# ---------------------------------------------------------------------------

_SELF_TEST_CSS = """\
/* --- Self-test CSS --- */

.sgs-hero {
    /* Case 1: already-token var() reference — exempt, no violation */
    color: var(--wp--preset--color--primary);

    /* Case 2: palette colour #1F7A7A (primary) — exact snap, no violation */
    background-color: #1F7A7A;

    /* Case 3: arbitrary colour #abcdef — gap-candidate violation */
    border-color: #abcdef;

    /* Case 4: 32px — spacing scale slug 50 is 2rem = 32px, expect confidence 1.0 */
    padding: 32px;

    /* Case 5: 37px — not on scale, likely low-confidence-snap or gap-candidate */
    margin-top: 37px;
}
"""

_SELF_TEST_CSS_DISCOVERY = """\
.sgs-test {
    /* Case 9a: arbitrary colour — should be a new token candidate */
    color: #abcdef;
    /* Case 9b: arbitrary spacing — should be a new token candidate */
    padding: 37px;
}
"""


def _run_self_tests() -> int:
    """Run built-in self-tests. Returns 0 on all pass, 1 on any failure."""
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

    theme_path = _default_theme_path()
    if not theme_path.exists():
        print(f"  [SKIP] theme.json not found at {theme_path} — cannot run self-tests")
        return 1

    print("Running SGS token-lint self-tests...\n")
    failures: list[str] = []

    # ------------------------------------------------------------------
    # Cases 1-8: --no-new-tokens (backward-compat verdict mode)
    # ------------------------------------------------------------------

    strict_result = lint_css_string(_SELF_TEST_CSS, mode="strict", no_new_tokens=True)
    assert isinstance(strict_result, LintResult), "strict no_new_tokens must return LintResult"
    strict_violations_by_value = {v.raw_value: v for v in strict_result.violations}

    # Case 1: var() exempt — no violation
    case1_ok = not any("var(" in v.raw_value for v in strict_result.violations)
    _report("Case 1: var() exempt — no violation", case1_ok, failures)

    # Case 2: #1F7A7A = primary palette colour — exact snap, no violation
    case2_ok = "#1F7A7A" not in strict_violations_by_value
    _report("Case 2: #1F7A7A (primary) — no violation (exact snap)", case2_ok, failures)

    # Case 3: #abcdef — should be gap-candidate
    case3_ok = (
        "#abcdef" in strict_violations_by_value
        and strict_violations_by_value["#abcdef"].flag == "gap-candidate"
    )
    _report("Case 3: #abcdef — gap-candidate violation present", case3_ok, failures)

    # Case 4: 32px — slug 50 = 2rem = 32px, exact snap, no violation
    case4_ok = "32px" not in strict_violations_by_value
    _report("Case 4: 32px — no violation (snaps to slug 50 at 1.0)", case4_ok, failures)

    # Case 5: 37px — should be flagged
    case5_ok = "37px" in strict_violations_by_value
    _report("Case 5: 37px — violation flagged in strict mode", case5_ok, failures)

    # Strict no_new_tokens: passed should be False (violations present)
    strict_pass_ok = strict_result.passed is False and strict_result.exit_code == 1
    _report("Strict no_new_tokens: passed=False, exit_code=1", strict_pass_ok, failures)

    # Draft no_new_tokens
    draft_result = lint_css_string(_SELF_TEST_CSS, mode="draft", no_new_tokens=True)
    assert isinstance(draft_result, LintResult), "draft no_new_tokens must return LintResult"
    draft_mode_ok = (
        draft_result.passed is True
        and draft_result.exit_code == 0
        and len(draft_result.violations) >= 1
        and all(v.is_warning for v in draft_result.violations)
    )
    _report("Draft no_new_tokens: passed=True, exit=0, violations are warnings", draft_mode_ok, failures)

    # Legacy no_new_tokens
    legacy_result = lint_css_string(_SELF_TEST_CSS, mode="legacy", no_new_tokens=True)
    assert isinstance(legacy_result, LintResult), "legacy no_new_tokens must return LintResult"
    legacy_ok = (
        legacy_result.passed is True
        and legacy_result.exit_code == 0
        and len(legacy_result.violations) == 0
    )
    _report("Legacy no_new_tokens: zero violations, passed=True", legacy_ok, failures)

    # ------------------------------------------------------------------
    # Case 9: Discovery mode — TokenWritePlan with 2 new candidates
    # ------------------------------------------------------------------
    print()
    plan9 = lint_css_string(_SELF_TEST_CSS_DISCOVERY, mode="strict")
    assert isinstance(plan9, TokenWritePlan), "additive mode must return TokenWritePlan"

    candidates_by_value = {c.raw_value: c for c in plan9.new_tokens}

    # #abcdef should be discovered as a color candidate
    case9a_ok = (
        "#abcdef" in candidates_by_value
        and candidates_by_value["#abcdef"].token_class == "color"
    )
    _report("Case 9a: discovery mode — #abcdef found as color candidate", case9a_ok, failures)

    # 37px should be discovered as a spacing candidate
    case9b_ok = (
        "37px" in candidates_by_value
        and candidates_by_value["37px"].token_class == "spacing"
    )
    _report("Case 9b: discovery mode — 37px found as spacing candidate", case9b_ok, failures)

    # passed is always True in additive mode
    case9c_ok = plan9.passed is True
    _report("Case 9c: discovery mode — passed=True", case9c_ok, failures)

    # ------------------------------------------------------------------
    # Case 10: apply_write_plan to a temp style variation — idempotent
    # ------------------------------------------------------------------
    print()
    _run_case10(failures)

    # ------------------------------------------------------------------
    # Case 11: --no-new-tokens strict on discovery CSS → passed=False
    # ------------------------------------------------------------------
    print()
    plan11 = lint_css_string(_SELF_TEST_CSS_DISCOVERY, mode="strict", no_new_tokens=True)
    assert isinstance(plan11, LintResult), "no_new_tokens must return LintResult"
    case11_ok = plan11.passed is False and plan11.exit_code == 1
    _report("Case 11: --no-new-tokens strict → passed=False, exit_code=1", case11_ok, failures)

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print()
    if failures:
        print(f"FAIL — {len(failures)} test(s) failed: {', '.join(failures)}")
        return 1
    else:
        print("All self-tests passed.")
        return 0


def _run_case10(failures: list[str]) -> None:
    """Case 10: apply_write_plan writes tokens; re-run produces zero additions."""
    import shutil

    # Build a minimal style variation JSON for the test.
    minimal_variation: dict[str, Any] = {
        "$schema": "https://schemas.wp.org/trunk/theme.json",
        "version": 3,
        "title": "Test Variation",
        "settings": {
            "color": {
                "palette": [
                    {"slug": "existing-colour", "color": "#123456", "name": "Existing"},
                ]
            }
        },
    }

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as tmp:
        json.dump(minimal_variation, tmp, indent=2)
        tmp_path = Path(tmp.name)

    try:
        # Build a write plan with 2 candidates.
        test_css = ".x { color: #abcdef; padding: 37px; }"
        plan = lint_css_string(test_css, mode="strict")
        assert isinstance(plan, TokenWritePlan)

        # First apply — should add tokens.
        result1 = apply_write_plan(plan, tmp_path)
        case10a_ok = result1["added"] == 2 and result1["skipped_duplicates"] == 0
        _report("Case 10a: apply_write_plan adds 2 new tokens", case10a_ok, failures)

        # Verify the JSON actually contains the new tokens.
        with open(tmp_path, encoding="utf-8") as fh:
            written: dict[str, Any] = json.load(fh)
        palette_slugs = {e["slug"] for e in written["settings"]["color"]["palette"]}
        spacing_slugs = {
            e["slug"] for e in written["settings"].get("spacing", {}).get("spacingSizes", [])
        }
        # #abcdef → slug 'client-abcdef', 37px → slug '37'
        case10b_ok = "client-abcdef" in palette_slugs and "37" in spacing_slugs
        _report("Case 10b: tokens appear in JSON (palette + spacingSizes)", case10b_ok, failures)

        # Second apply — idempotent: 0 added, 2 skipped.
        result2 = apply_write_plan(plan, tmp_path)
        case10c_ok = result2["added"] == 0 and result2["skipped_duplicates"] == 2
        _report("Case 10c: re-run apply_write_plan is idempotent (0 added)", case10c_ok, failures)

    finally:
        tmp_path.unlink(missing_ok=True)


def _report(label: str, condition: bool, failures: list[str]) -> None:
    """Print pass/fail for a single test case."""
    if condition:
        print(f"  [PASS] {label}")
    else:
        print(f"  [FAIL] {label}")
        failures.append(label)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "SGS token-discovery lint — Stage 0.5 of /sgs-clone. "
            "Default: additive discovery mode (produces a TokenWritePlan). "
            "Use --no-new-tokens to revert to the old verdict behaviour."
        ),
    )
    parser.add_argument(
        "path",
        nargs="?",
        type=Path,
        help="Path to the CSS or HTML file to lint.",
    )
    parser.add_argument(
        "--mode",
        choices=_VALID_MODES,
        default="strict",
        help="Lint mode: strict (default), draft, or legacy.",
    )
    parser.add_argument(
        "--theme",
        type=Path,
        dest="theme_path",
        default=None,
        help="Path to theme.json (default: auto-detected from project root).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        dest="output_json",
        help="Emit output as JSON (for orchestrator consumption).",
    )
    parser.add_argument(
        "--inline-styles",
        action="store_true",
        dest="inline_styles",
        help="Lint HTML inline style=\"\" attributes instead of CSS file content.",
    )
    parser.add_argument(
        "--no-new-tokens",
        action="store_true",
        dest="no_new_tokens",
        help=(
            "Revert to old verdict mode — flag non-token values as violations "
            "instead of discovering them as new token candidates. "
            "In strict mode this causes passed=False and exit=1 on any violation."
        ),
    )
    parser.add_argument(
        "--apply-to",
        type=Path,
        dest="apply_to",
        default=None,
        help=(
            "Apply the write plan to this style variation JSON, adding "
            "discovered tokens directly. Combine with --dry-run to preview."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        dest="dry_run",
        help="With --apply-to: show what would change without writing to disk.",
    )
    parser.add_argument(
        "--variation",
        type=Path,
        dest="variations",
        action="append",
        default=None,
        help=(
            "Overlay a client style variation JSON on the base theme before discovery. "
            "Repeat for multiple variations. Tokens registered in any variation will "
            "dedupe correctly — values already in a variation won't be re-proposed as "
            "new-token candidates."
        ),
    )
    parser.add_argument(
        "--self-test",
        action="store_true",
        dest="self_test",
        help="Run built-in self-tests and exit.",
    )
    return parser


def main() -> int:
    """CLI main — returns exit code."""
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

    parser = _build_arg_parser()
    args = parser.parse_args()

    if args.self_test:
        return _run_self_tests()

    if args.path is None:
        parser.print_help()
        return 1

    path: Path = args.path
    mode: Mode = args.mode
    theme_path: Path | None = args.theme_path
    no_new_tokens: bool = args.no_new_tokens
    variation_paths: list[Path] | None = args.variations

    # Auto-detect mode from extension if --inline-styles not explicitly set.
    use_inline = args.inline_styles or path.suffix.lower() == ".html"

    try:
        if use_inline:
            result = lint_html_inline_styles(
                path, mode=mode, theme_json_path=theme_path,
                no_new_tokens=no_new_tokens, variation_paths=variation_paths,
            )
        else:
            result = lint_css_file(
                path, mode=mode, theme_json_path=theme_path,
                no_new_tokens=no_new_tokens, variation_paths=variation_paths,
            )
    except FileNotFoundError:
        print(f"Error: file not found: {path}", file=sys.stderr)
        return 1

    # --no-new-tokens path: LintResult
    if isinstance(result, LintResult):
        if args.output_json:
            print(_format_json_verdict(result))
        else:
            print(_format_human_verdict(result))

        # Handle --apply-to (no-op in verdict mode — nothing to apply)
        if args.apply_to:
            print(
                "Note: --apply-to has no effect in --no-new-tokens mode.",
                file=sys.stderr,
            )

        return result.exit_code

    # Additive (default) path: TokenWritePlan
    if args.output_json:
        print(_format_json_plan(result))
    else:
        print(_format_human_plan(result))

    if args.apply_to:
        if not args.apply_to.exists():
            print(f"Error: style variation not found: {args.apply_to}", file=sys.stderr)
            return 1
        summary = apply_write_plan(result, args.apply_to, dry_run=args.dry_run)
        action = "Dry-run" if args.dry_run else "Applied"
        print(f"\n{action}: {summary['added']} token(s) added, "
              f"{summary['skipped_duplicates']} duplicate(s) skipped.")
        if not args.dry_run and summary["added"] > 0:
            print(f"Written to: {args.apply_to}")

    # In additive mode, passed is always True.
    return 0 if result.passed else 1


if __name__ == "__main__":
    sys.exit(main())
