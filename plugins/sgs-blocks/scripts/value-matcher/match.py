# Requires: pip install colormath
"""
Token value-matcher for the SGS Deterministic Draft-to-SGS Converter pipeline.

Implements §5.4 of Spec 31: snap arbitrary CSS values to the nearest theme.json
token using perceptual distance metrics, returning (token_slug, confidence).

Confidence tiers:
  Colour  — ΔE2000 ≤ 2.0 → 1.0 | ≤ 5.0 → 0.85 | ≤ 10.0 → 0.6 | > 10.0 → 0.0
  Spacing — ±5 % → 1.0          | ±15 % → 0.6  | else         → 0.0
  Shadow  — exact → 1.0          | near  → 0.6  | else         → 0.0
  Family  — exact → 1.0          | case-insensitive → 0.85      | else → 0.0
"""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path
from typing import Any

import numpy
# colormath uses numpy.asscalar which was removed in NumPy 1.24.
# Patch it back in before importing colormath's diff module.
if not hasattr(numpy, "asscalar"):
    numpy.asscalar = lambda a: a.item()  # type: ignore[attr-defined]

from colormath.color_objects import sRGBColor, LabColor
from colormath.color_conversions import convert_color
from colormath.color_diff import delta_e_cie2000

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Minimal table of CSS named colours → hex. Covers the basic 17 + common extras.
_CSS_NAMED_COLOURS: dict[str, str] = {
    "black": "#000000",
    "silver": "#C0C0C0",
    "gray": "#808080",
    "grey": "#808080",
    "white": "#FFFFFF",
    "maroon": "#800000",
    "red": "#FF0000",
    "purple": "#800080",
    "fuchsia": "#FF00FF",
    "green": "#008000",
    "lime": "#00FF00",
    "olive": "#808000",
    "yellow": "#FFFF00",
    "navy": "#000080",
    "blue": "#0000FF",
    "teal": "#008080",
    "aqua": "#00FFFF",
    "cyan": "#00FFFF",
    "coral": "#FF7F50",
    "salmon": "#FA8072",
    "orange": "#FFA500",
    "pink": "#FFC0CB",
    "violet": "#EE82EE",
    "indigo": "#4B0082",
    "tan": "#D2B48C",
    "beige": "#F5F5DC",
    "ivory": "#FFFFF0",
    "lavender": "#E6E6FA",
    "khaki": "#F0E68C",
    "magenta": "#FF00FF",
    "crimson": "#DC143C",
    "tomato": "#FF6347",
    "gold": "#FFD700",
    "skyblue": "#87CEEB",
    "lightblue": "#ADD8E6",
    "lightgreen": "#90EE90",
    "darkgreen": "#006400",
    "darkblue": "#00008B",
    "darkred": "#8B0000",
    "transparent": "#00000000",
}


def _hex_to_srgb(hex_colour: str) -> sRGBColor:
    """Convert a 6- or 8-character hex string (with leading #) to sRGBColor.

    The alpha channel (8-char hex) is stripped — alpha does not affect Lab
    colour-distance in this model.
    """
    h = hex_colour.lstrip("#")
    if len(h) == 8:
        h = h[:6]  # strip alpha
    if len(h) != 6:
        raise ValueError(f"Cannot parse hex colour: {hex_colour!r}")
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0
    return sRGBColor(r, g, b, is_upscaled=False)


def _parse_colour_to_srgb(value: str) -> sRGBColor:
    """Parse an arbitrary CSS colour string into an sRGBColor.

    Accepts: #RRGGBB, #RRGGBBAA, rgb(r,g,b), rgba(r,g,b,a), named CSS colours.
    Raises ValueError for unrecognised formats.
    """
    cleaned = value.strip()

    # Hex
    if cleaned.startswith("#"):
        return _hex_to_srgb(cleaned)

    # rgb(...) / rgba(...)
    m = re.match(
        r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)",
        cleaned,
        re.IGNORECASE,
    )
    if m:
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return sRGBColor(r / 255.0, g / 255.0, b / 255.0, is_upscaled=False)

    # Named colour
    lower = cleaned.lower().replace(" ", "")
    if lower in _CSS_NAMED_COLOURS:
        return _hex_to_srgb(_CSS_NAMED_COLOURS[lower])

    raise ValueError(f"Unrecognised CSS colour format: {value!r}")


def _srgb_to_lab(colour: sRGBColor) -> LabColor:
    return convert_color(colour, LabColor)


def _colour_delta_e(a: sRGBColor, b: sRGBColor) -> float:
    """Return ΔE2000 between two sRGBColor instances."""
    lab_a = _srgb_to_lab(a)
    lab_b = _srgb_to_lab(b)
    return float(delta_e_cie2000(lab_a, lab_b))


def _colour_hex_from_entry(entry: dict[str, Any]) -> str:
    """Extract the CSS colour string from a theme.json palette entry."""
    colour = entry.get("color", "")
    if not colour:
        raise ValueError(f"Palette entry has no 'color' key: {entry!r}")
    return colour


# ---------------------------------------------------------------------------
# Spacing / font-size helpers
# ---------------------------------------------------------------------------

_PX_PATTERN = re.compile(r"^([\d.]+)\s*px$", re.IGNORECASE)
_REM_PATTERN = re.compile(r"^([\d.]+)\s*rem$", re.IGNORECASE)
_EM_PATTERN = re.compile(r"^([\d.]+)\s*em$", re.IGNORECASE)
_REM_TO_PX: float = 16.0


def _to_px(value: str) -> float:
    """Normalise a CSS length value (px, rem, em) to pixels.

    1rem = 16px; 1em = 16px (assumes root context).
    Raises ValueError for unsupported units.
    """
    cleaned = value.strip()
    m = _PX_PATTERN.match(cleaned)
    if m:
        return float(m.group(1))
    m = _REM_PATTERN.match(cleaned)
    if m:
        return float(m.group(1)) * _REM_TO_PX
    m = _EM_PATTERN.match(cleaned)
    if m:
        return float(m.group(1)) * _REM_TO_PX
    raise ValueError(f"Unsupported CSS length unit: {value!r}")


def _snap_by_percent_deviation(
    value_px: float,
    scale: list[dict[str, Any]],
) -> tuple[str, float]:
    """Find the closest scale entry by percent deviation from value_px.

    Returns (slug, confidence) using tiers:
      ≤ 5 %  → 1.0
      ≤ 15 % → 0.6
      > 15 % → (value_raw, 0.0)  — but the raw value is handled by callers.
    """
    best_slug: str = ""
    best_deviation: float = float("inf")

    for entry in scale:
        size_raw = entry.get("size", "")
        # Strip clamp() expressions — use the static "size" fallback value as
        # defined in theme.json. The size field may be plain or contain clamp().
        # Extract the first numeric unit from the string.
        plain = re.sub(r"clamp\([^)]+\)", "", size_raw).strip()
        if not plain:
            # Fallback: try to parse the size_raw as a clamp and take the max
            clamp_m = re.search(r"clamp\(\s*[^,]+,\s*[^,]+,\s*([^)]+)\)", size_raw)
            if clamp_m:
                plain = clamp_m.group(1).strip()
            else:
                continue

        try:
            entry_px = _to_px(plain)
        except ValueError:
            continue

        if entry_px == 0:
            continue

        deviation = abs(value_px - entry_px) / entry_px
        if deviation < best_deviation:
            best_deviation = deviation
            best_slug = entry.get("slug", "")

    if not best_slug:
        return ("", float("inf"))

    return (best_slug, best_deviation)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def snap_color(
    value: str,
    palette: list[dict[str, Any]],
) -> tuple[str, float]:
    """Snap a CSS colour value to the nearest theme.json palette token.

    Parameters
    ----------
    value:
        A CSS colour string: hex, rgb(), rgba(), or a named CSS colour.
    palette:
        The ``settings.color.palette`` list from theme.json — each entry must
        have ``slug`` and ``color`` keys.

    Returns
    -------
    (token_slug, confidence)
        token_slug is the palette slug of the closest token when confidence > 0,
        or the raw ``value`` when confidence is 0.0 (gap candidate).

    Confidence tiers
    ----------------
    ΔE2000 ≤ 2.0  → 1.0   (imperceptible difference)
    ΔE2000 ≤ 5.0  → 0.85  (near match)
    ΔE2000 ≤ 10.0 → 0.6   (close match)
    ΔE2000 > 10.0 → 0.0   (gap candidate — return raw value)
    """
    try:
        input_srgb = _parse_colour_to_srgb(value)
    except ValueError:
        # Unparseable value — treat as gap candidate
        return (value, 0.0)

    best_slug: str = ""
    best_delta: float = float("inf")

    for entry in palette:
        try:
            entry_srgb = _parse_colour_to_srgb(_colour_hex_from_entry(entry))
        except ValueError:
            continue

        delta = _colour_delta_e(input_srgb, entry_srgb)
        if delta < best_delta:
            best_delta = delta
            best_slug = entry.get("slug", "")

    if not best_slug:
        return (value, 0.0)

    if best_delta <= 2.0:
        return (best_slug, 1.0)
    if best_delta <= 5.0:
        return (best_slug, 0.85)
    if best_delta <= 10.0:
        return (best_slug, 0.6)

    return (value, 0.0)


def snap_spacing(
    value: str,
    scale: list[dict[str, Any]],
) -> tuple[str, float]:
    """Snap a CSS spacing value to the nearest theme.json spacingSizes token.

    Parameters
    ----------
    value:
        A CSS length string: ``Xpx``, ``Xrem``, or ``Xem``.
        1rem = 16px.
    scale:
        ``settings.spacing.spacingSizes`` from theme.json — each entry must
        have ``slug`` and ``size`` keys.

    Returns
    -------
    (token_slug, confidence) or (raw_value, 0.0) on gap.

    Confidence tiers
    ----------------
    Percent deviation ≤ 5 %  → 1.0
    Percent deviation ≤ 15 % → 0.6
    > 15 %                   → 0.0 (gap candidate)
    """
    try:
        value_px = _to_px(value)
    except ValueError:
        return (value, 0.0)

    best_slug, best_deviation = _snap_by_percent_deviation(value_px, scale)

    if not best_slug or best_deviation == float("inf"):
        return (value, 0.0)

    if best_deviation <= 0.05:
        return (best_slug, 1.0)
    if best_deviation <= 0.15:
        return (best_slug, 0.6)

    return (value, 0.0)


def snap_font_size(
    value: str,
    scale: list[dict[str, Any]],
) -> tuple[str, float]:
    """Snap a CSS font-size value to the nearest theme.json fontSizes token.

    Parameters
    ----------
    value:
        A CSS length string: ``Xpx``, ``Xrem``, or ``Xem``.
    scale:
        ``settings.typography.fontSizes`` from theme.json — each entry must
        have ``slug`` and ``size`` keys.

    Returns
    -------
    (token_slug, confidence) or (raw_value, 0.0) on gap.

    Uses identical percent-deviation tiers to snap_spacing.
    """
    try:
        value_px = _to_px(value)
    except ValueError:
        return (value, 0.0)

    best_slug, best_deviation = _snap_by_percent_deviation(value_px, scale)

    if not best_slug or best_deviation == float("inf"):
        return (value, 0.0)

    if best_deviation <= 0.05:
        return (best_slug, 1.0)
    if best_deviation <= 0.15:
        return (best_slug, 0.6)

    return (value, 0.0)


def snap_shadow(
    value: str,
    presets: list[dict[str, Any]],
) -> tuple[str, float]:
    """Snap a CSS box-shadow value to the nearest theme.json shadow preset.

    Matching is discrete (string-based), not numeric:
    - Normalise whitespace and lowercase both sides before comparing.
    - Exact match after normalisation → confidence 1.0.
    - Substring match where string lengths differ by ≤ 2 chars → confidence 0.6.
    - No match → gap candidate (raw value, confidence 0.0).

    Parameters
    ----------
    value:
        A CSS box-shadow string.
    presets:
        ``settings.shadow.presets`` from theme.json — each entry must have
        ``slug`` and ``shadow`` keys.

    Returns
    -------
    (token_slug, confidence) or (raw_value, 0.0) on gap.
    """
    normalised = re.sub(r"\s+", " ", value.strip()).lower()

    for entry in presets:
        preset_shadow = entry.get("shadow", "")
        preset_normalised = re.sub(r"\s+", " ", preset_shadow.strip()).lower()
        slug = entry.get("slug", "")

        if normalised == preset_normalised:
            return (slug, 1.0)

        # Substring / near match: one is contained in the other and lengths
        # differ by at most 2 characters.
        len_diff = abs(len(normalised) - len(preset_normalised))
        if len_diff <= 2:
            shorter, longer = (
                (normalised, preset_normalised)
                if len(normalised) <= len(preset_normalised)
                else (preset_normalised, normalised)
            )
            if shorter in longer:
                return (slug, 0.6)

    return (value, 0.0)


def snap_family(
    font_stack: str,
    families: list[dict[str, Any]],
) -> tuple[str, float]:
    """Snap a CSS font-family stack to the nearest theme.json fontFamilies token.

    Matching logic:
    - Extract the first font name from the stack (comma-split, strip quotes).
    - Exact string match against ``fontFamily`` first-name → confidence 1.0.
    - Case-insensitive match → confidence 0.85.
    - No match → gap candidate (raw value, confidence 0.0).

    Parameters
    ----------
    font_stack:
        A CSS font-family value e.g. ``"'Inter', system-ui, sans-serif"``.
    families:
        ``settings.typography.fontFamilies`` from theme.json — each entry must
        have ``slug`` and ``fontFamily`` keys.

    Returns
    -------
    (token_slug, confidence) or (raw_value, 0.0) on gap.
    """
    # Extract the first name in the input stack.
    first_input = font_stack.split(",")[0].strip().strip("'\"")

    for entry in families:
        full_stack: str = entry.get("fontFamily", "")
        slug: str = entry.get("slug", "")

        # Extract first name from the token's font-family stack.
        first_token = full_stack.split(",")[0].strip().strip("'\"")

        if first_input == first_token:
            return (slug, 1.0)

        if first_input.lower() == first_token.lower():
            return (slug, 0.85)

    return (font_stack, 0.0)


# ---------------------------------------------------------------------------
# Self-tests
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

    theme_path = Path(__file__).parents[4] / "theme" / "sgs-theme" / "theme.json"
    with open(theme_path, encoding="utf-8") as fh:
        theme: dict[str, Any] = json.load(fh)

    settings = theme["settings"]
    palette: list[dict[str, Any]] = settings["color"]["palette"]
    spacing_scale: list[dict[str, Any]] = settings["spacing"]["spacingSizes"]
    font_size_scale: list[dict[str, Any]] = settings["typography"]["fontSizes"]
    shadow_presets: list[dict[str, Any]] = settings["shadow"]["presets"]
    font_families: list[dict[str, Any]] = settings["typography"]["fontFamilies"]

    failures: list[str] = []

    def check(
        label: str,
        result: tuple[str, float],
        expected_slug: str,
        expected_conf_min: float,
        expected_conf_max: float,
    ) -> None:
        slug, conf = result
        ok = (
            slug == expected_slug
            and expected_conf_min <= conf <= expected_conf_max
        )
        status = "PASS" if ok else "FAIL"
        print(
            f"  [{status}] {label}: slug={slug!r} conf={conf:.2f}"
            f" (expected slug={expected_slug!r}"
            f" conf in [{expected_conf_min}, {expected_conf_max}])"
        )
        if not ok:
            failures.append(label)

    # ------------------------------------------------------------------
    # Colour tests
    # ------------------------------------------------------------------
    print("\n--- Colour tests ---")

    # Test 1: Exact match — #1F7A7A is the 'primary' token in theme.json.
    check(
        "colour exact match (#1F7A7A -> primary)",
        snap_color("#1F7A7A", palette),
        expected_slug="primary",
        expected_conf_min=1.0,
        expected_conf_max=1.0,
    )

    # Test 2: Close but not exact match — #1E7878 is very close to #1F7A7A
    # (primary). ΔE2000 should be small, expected slug = primary, conf ~0.85-1.0.
    check(
        "colour near match (#1E7878 -> primary, conf >= 0.85)",
        snap_color("#1E7878", palette),
        expected_slug="primary",
        expected_conf_min=0.85,
        expected_conf_max=1.0,
    )

    # Test 3: Far-from-palette colour — bright magenta is not in the palette.
    # Expected: gap candidate (raw value returned, conf = 0.0).
    slug_gap, conf_gap = snap_color("#FF00FF", palette)
    gap_ok = math.isclose(conf_gap, 0.0, abs_tol=1e-9) and slug_gap == "#FF00FF"
    status_gap = "PASS" if gap_ok else "FAIL"
    print(
        f"  [{status_gap}] colour gap candidate (#FF00FF): slug={slug_gap!r} conf={conf_gap:.2f}"
        " (expected slug='#FF00FF' conf=0.0)"
    )
    if not gap_ok:
        failures.append("colour gap candidate (#FF00FF)")

    # ------------------------------------------------------------------
    # Spacing tests
    # ------------------------------------------------------------------
    print("\n--- Spacing tests ---")

    # Test 4: Exact match — slug '40' has size '1.5rem' = 24px.
    check(
        "spacing exact match (1.5rem -> slug 40)",
        snap_spacing("1.5rem", spacing_scale),
        expected_slug="40",
        expected_conf_min=1.0,
        expected_conf_max=1.0,
    )

    # Test 5: Within 5 % of '40' (24px). 24.5px is ~2 % off — still tier 1.0.
    check(
        "spacing within 5 % (24.5px -> slug 40, conf 1.0)",
        snap_spacing("24.5px", spacing_scale),
        expected_slug="40",
        expected_conf_min=1.0,
        expected_conf_max=1.0,
    )

    # Test 6: Gap — 500px does not match any spacing token within 15 %.
    slug_sp_gap, conf_sp_gap = snap_spacing("500px", spacing_scale)
    sp_gap_ok = math.isclose(conf_sp_gap, 0.0, abs_tol=1e-9) and slug_sp_gap == "500px"
    status_sp = "PASS" if sp_gap_ok else "FAIL"
    print(
        f"  [{status_sp}] spacing gap (500px): slug={slug_sp_gap!r} conf={conf_sp_gap:.2f}"
        " (expected slug='500px' conf=0.0)"
    )
    if not sp_gap_ok:
        failures.append("spacing gap (500px)")

    # ------------------------------------------------------------------
    # Font-size tests
    # ------------------------------------------------------------------
    print("\n--- Font-size tests ---")

    # Test 7: Exact match — slug 'large' has size '20px'.
    check(
        "font-size exact match (20px -> large)",
        snap_font_size("20px", font_size_scale),
        expected_slug="large",
        expected_conf_min=1.0,
        expected_conf_max=1.0,
    )

    # Test 8: Within 5 % — 19.5px is ~2.5 % below 20px (large), tier 1.0.
    check(
        "font-size within 5 % (19.5px -> large, conf 1.0)",
        snap_font_size("19.5px", font_size_scale),
        expected_slug="large",
        expected_conf_min=1.0,
        expected_conf_max=1.0,
    )

    # Test 9: Gap — 200px is far from every font-size token.
    slug_fs_gap, conf_fs_gap = snap_font_size("200px", font_size_scale)
    fs_gap_ok = math.isclose(conf_fs_gap, 0.0, abs_tol=1e-9) and slug_fs_gap == "200px"
    status_fs = "PASS" if fs_gap_ok else "FAIL"
    print(
        f"  [{status_fs}] font-size gap (200px): slug={slug_fs_gap!r} conf={conf_fs_gap:.2f}"
        " (expected slug='200px' conf=0.0)"
    )
    if not fs_gap_ok:
        failures.append("font-size gap (200px)")

    # ------------------------------------------------------------------
    # Shadow tests
    # ------------------------------------------------------------------
    print("\n--- Shadow tests ---")

    # Test 10: Exact preset match — 'sm' shadow in theme.json.
    sm_shadow = next(p["shadow"] for p in shadow_presets if p["slug"] == "sm")
    check(
        f"shadow exact match ({sm_shadow!r} -> sm)",
        snap_shadow(sm_shadow, shadow_presets),
        expected_slug="sm",
        expected_conf_min=1.0,
        expected_conf_max=1.0,
    )

    # Test 11: Gap — unusual shadow not in the palette.
    unusual_shadow = "5px 5px 0px #FF0000"
    slug_sh_gap, conf_sh_gap = snap_shadow(unusual_shadow, shadow_presets)
    sh_gap_ok = math.isclose(conf_sh_gap, 0.0, abs_tol=1e-9) and slug_sh_gap == unusual_shadow
    status_sh = "PASS" if sh_gap_ok else "FAIL"
    print(
        f"  [{status_sh}] shadow gap ({unusual_shadow!r}): slug={slug_sh_gap!r}"
        f" conf={conf_sh_gap:.2f} (expected slug={unusual_shadow!r} conf=0.0)"
    )
    if not sh_gap_ok:
        failures.append(f"shadow gap ({unusual_shadow!r})")

    # ------------------------------------------------------------------
    # Font-family tests
    # ------------------------------------------------------------------
    print("\n--- Font-family tests ---")

    # Test 12: Exact match — 'Inter' is the 'body' font in theme.json.
    check(
        "family exact match (Inter -> body)",
        snap_family("Inter, system-ui, sans-serif", font_families),
        expected_slug="body",
        expected_conf_min=1.0,
        expected_conf_max=1.0,
    )

    # Test 13: Gap — 'Helvetica Neue' is not in the theme.
    slug_fam_gap, conf_fam_gap = snap_family("Helvetica Neue, Arial, sans-serif", font_families)
    fam_gap_ok = math.isclose(conf_fam_gap, 0.0, abs_tol=1e-9)
    status_fam = "PASS" if fam_gap_ok else "FAIL"
    print(
        f"  [{status_fam}] family gap (Helvetica Neue): slug={slug_fam_gap!r}"
        f" conf={conf_fam_gap:.2f} (expected conf=0.0)"
    )
    if not fam_gap_ok:
        failures.append("family gap (Helvetica Neue)")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    total = 13
    passed = total - len(failures)
    print(f"\n{'=' * 50}")
    print(f"Results: {passed}/{total} tests passed")
    if failures:
        print("Failed tests:")
        for name in failures:
            print(f"  - {name}")
        sys.exit(1)
    else:
        print("All tests passed.")
        sys.exit(0)
