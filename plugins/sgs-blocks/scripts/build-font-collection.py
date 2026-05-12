#!/usr/bin/env python3
"""
build-font-collection.py
========================
Generates a WordPress Font Library collection manifest (google-fonts.json) from the
uimax SQLite database's google_fonts table (~1,923 rows).

Output: plugins/sgs-blocks/assets/font-collections/google-fonts.json

The manifest is served via wp_register_font_collection() so every Google Font appears
in the editor's "Manage fonts" modal WITHOUT enqueuing any @font-face CSS.  Fonts only
load on the frontend when an operator explicitly installs and activates them (which
writes to wp_global_styles).

Re-run this script whenever the uimax google_fonts table is refreshed (e.g. after a
nextlevelbuilder ingest pass or a google_fonts data update).  The output is
byte-deterministic: same DB contents always produce the same file.

Usage:
    python build-font-collection.py              # build only
    python build-font-collection.py --self-test  # build + run assertions, exit 0 on pass
"""

import argparse
import json
import os
import sqlite3
import sys

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

# This script lives in plugins/sgs-blocks/scripts/
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PLUGIN_DIR = os.path.dirname(_SCRIPT_DIR)

UIMAX_DB_PATH = os.path.join(
    os.path.expanduser("~"),
    ".agents", "skills", "ui-ux-pro-max", "scripts", "ui-ux-pro-max.db",
)
OUTPUT_DIR = os.path.join(_PLUGIN_DIR, "assets", "font-collections")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "google-fonts.json")

# ---------------------------------------------------------------------------
# Category mapping — uimax title-case → WP Font Library slug + display name
# ---------------------------------------------------------------------------

CATEGORY_MAP = {
    "Sans Serif":  ("sans-serif",  "Sans Serif"),
    "Serif":       ("serif",       "Serif"),
    "Display":     ("display",     "Display"),
    "Handwriting": ("handwriting", "Handwriting"),
    "Monospace":   ("monospace",   "Monospace"),
}

# Fallback slug/label when a category value is empty or unrecognised.
_DEFAULT_CATEGORY = ("sans-serif", "Sans Serif")


def _category_slug(raw: str) -> str:
    """Return the WP-compatible slug for a uimax category string."""
    slug, _ = CATEGORY_MAP.get(raw.strip(), _DEFAULT_CATEGORY)
    return slug


def _parse_styles(styles_raw: str, family: str) -> list[dict]:
    """
    Convert a uimax styles string into a list of WP fontFace objects.

    uimax format (pipe-separated):  "400 | 400i | 700 | 700i"
    Suffix 'i' = italic; no suffix = normal.

    For each style entry we emit a fontFace dict pointing at the Google Fonts
    CSS2 API URL.  WP's Font Library resolves these URLs to actual font files
    when the operator clicks "Install".  We do NOT enumerate individual
    font-file URLs here — the CSS API handles that.
    """
    if not styles_raw or not styles_raw.strip():
        # Fallback: at least one regular 400 face.
        return [
            {
                "fontFamily": family,
                "fontStyle":  "normal",
                "fontWeight": "400",
                "src":        [_css2_url(family, "400", "normal")],
            }
        ]

    faces = []
    for part in styles_raw.split("|"):
        part = part.strip()
        if not part:
            continue

        if part.endswith("i"):
            weight     = part[:-1].strip()
            font_style = "italic"
        else:
            weight     = part
            font_style = "normal"

        # Validate weight is numeric; skip malformed entries.
        if not weight.isdigit():
            continue

        faces.append(
            {
                "fontFamily": family,
                "fontStyle":  font_style,
                "fontWeight": weight,
                "src":        [_css2_url(family, weight, font_style)],
            }
        )

    # If nothing was parseable, fall back to 400 regular.
    return faces or [
        {
            "fontFamily": family,
            "fontStyle":  "normal",
            "fontWeight": "400",
            "src":        [_css2_url(family, "400", "normal")],
        }
    ]


def _css2_url(family: str, weight: str, style: str) -> str:
    """
    Build a Google Fonts CSS2 API URL for a single font face.

    Format: https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400&display=swap

    The 'ital' axis uses 0 for normal, 1 for italic.
    WP Font Library follows these URLs to find the actual .woff2 files.
    """
    family_param = family.replace(" ", "+")
    ital = "1" if style == "italic" else "0"
    return (
        f"https://fonts.googleapis.com/css2"
        f"?family={family_param}:ital,wght@{ital},{weight}"
        f"&display=swap"
    )


def _family_slug(family: str) -> str:
    """Slugify a font family name: lowercase, spaces → hyphens, drop non-alnum/-."""
    slug = family.lower().replace(" ", "-")
    slug = "".join(c for c in slug if c.isalnum() or c == "-")
    return slug


# ---------------------------------------------------------------------------
# Main builder
# ---------------------------------------------------------------------------

def build(db_path: str = UIMAX_DB_PATH, output_path: str = OUTPUT_PATH) -> dict:
    """
    Query the uimax DB, build the manifest dict, write to output_path, and return it.
    """
    if not os.path.exists(db_path):
        raise FileNotFoundError(
            f"uimax DB not found at: {db_path}\n"
            "Run the uimax ingest pipeline first, or adjust UIMAX_DB_PATH."
        )

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        """
        SELECT
            family,
            category,
            styles,
            popularity_rank
        FROM google_fonts
        WHERE family IS NOT NULL
          AND family != ''
        ORDER BY
            CAST(popularity_rank AS INTEGER) ASC,
            family ASC
        """
    )
    rows = cur.fetchall()
    conn.close()

    font_families = []
    for row in rows:
        family   = row["family"].strip()
        category = (row["category"] or "").strip()
        styles   = (row["styles"]   or "").strip()

        if not family:
            continue

        slug  = _family_slug(family)
        faces = _parse_styles(styles, family)

        font_families.append(
            {
                "name":       family,
                "font_family": family,
                "slug":       slug,
                "fontFamily": family,
                "category":   _category_slug(category),
                "fontFace":   faces,
            }
        )

    categories = [
        {"name": label, "slug": slug}
        for slug, label in (
            ("sans-serif",  "Sans Serif"),
            ("serif",       "Serif"),
            ("display",     "Display"),
            ("handwriting", "Handwriting"),
            ("monospace",   "Monospace"),
        )
    ]

    manifest = {
        "$schema":      "https://schemas.wp.org/trunk/font-collection.json",
        "version":      1,
        "font_families": font_families,
        "categories":   categories,
    }

    # Write output — UTF-8, no BOM, deterministic key order, compact but readable.
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
        fh.write("\n")  # POSIX trailing newline

    return manifest


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

def self_test() -> None:
    """
    Run the build then assert invariants.  Exits 0 on success, 1 on failure.
    """
    print("Running self-test …")

    manifest = build()

    # 1. Output file exists.
    assert os.path.exists(OUTPUT_PATH), f"Output file missing: {OUTPUT_PATH}"
    print("  [PASS] Output file exists")

    # 2. JSON parses.
    with open(OUTPUT_PATH, encoding="utf-8") as fh:
        parsed = json.load(fh)
    print("  [PASS] JSON parses cleanly")

    # 3. font_families count sanity check.
    count = len(parsed["font_families"])
    assert 1000 <= count <= 2500, f"Unexpected font_families count: {count}"
    print(f"  [PASS] font_families count = {count} (within 1000–2500)")

    # 4. Every font_family has non-empty slug, name, and at least one fontFace.
    for ff in parsed["font_families"]:
        assert ff.get("slug"), f"Empty slug for: {ff}"
        assert ff.get("name"), f"Empty name for: {ff}"
        assert ff.get("fontFace"), f"Empty fontFace for: {ff.get('name')}"
    print("  [PASS] All font_families have slug + name + fontFace")

    # 5. Well-known fonts present.
    names = {ff["name"] for ff in parsed["font_families"]}
    for expected in ("Inter", "Roboto"):
        assert expected in names, f"Well-known font missing: {expected}"
    print("  [PASS] Inter and Roboto both present")

    # 6. Categories array has exactly 5 entries.
    cat_count = len(parsed["categories"])
    assert cat_count == 5, f"Expected 5 categories, got {cat_count}"
    print("  [PASS] Categories count = 5")

    print(f"\nAll assertions passed.  Manifest written to:\n  {OUTPUT_PATH}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Build the SGS Google Fonts collection manifest for WP Font Library."
    )
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Build the manifest then run assertions.  Exits 0 on success.",
    )
    args = parser.parse_args()

    if args.self_test:
        try:
            self_test()
        except AssertionError as exc:
            print(f"\n[FAIL] {exc}", file=sys.stderr)
            sys.exit(1)
    else:
        manifest = build()
        count = len(manifest["font_families"])
        print(f"Done.  {count} font families written to {OUTPUT_PATH}")
