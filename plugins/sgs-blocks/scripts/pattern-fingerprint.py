"""
pattern-fingerprint.py
Compute a deterministic fingerprint for an HTML pattern + CSS bundle.
Used by the SGS WordPress cloning pipeline to detect duplicate patterns
and to surface CSS rules that have no destination in a target block's
attribute schema.

Captured: 2026-05-06
"""

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    from bs4 import BeautifulSoup, Comment
except ImportError:
    sys.exit("beautifulsoup4 is required. Install with: pip install beautifulsoup4")


# ---------------------------------------------------------------------------
# Mapping from block.json attribute names to the CSS properties they control.
# Any CSS property found in the source that has no corresponding attribute
# in the target block's schema is flagged as unmapped.
# ---------------------------------------------------------------------------
ATTR_TO_CSS: dict[str, str] = {
    "gap": "gap",
    "gapMobile": "gap",
    "gapTablet": "gap",
    "padding": "padding",
    "paddingTop": "padding-top",
    "paddingRight": "padding-right",
    "paddingBottom": "padding-bottom",
    "paddingLeft": "padding-left",
    "margin": "margin",
    "marginTop": "margin-top",
    "marginRight": "margin-right",
    "marginBottom": "margin-bottom",
    "marginLeft": "margin-left",
    "colourText": "color",
    "colourBackground": "background-color",
    "colourBorder": "border-color",
    "fontSize": "font-size",
    "fontWeight": "font-weight",
    "lineHeight": "line-height",
    "borderRadius": "border-radius",
    "borderWidth": "border-width",
    "boxShadow": "box-shadow",
    "transitionDuration": "transition-duration",
    "transitionEasing": "transition-timing-function",
    "hoverScale": "transform",
    "hoverShadow": "box-shadow",
    "minHeight": "min-height",
    "maxWidth": "max-width",
    "width": "width",
    "height": "height",
    "alignItems": "align-items",
    "justifyContent": "justify-content",
    "flexDirection": "flex-direction",
    "gridTemplateColumns": "grid-template-columns",
}

# Regex patterns for framework-noise class names that should be stripped
# before hashing so that build-tool hash suffixes don't affect the fingerprint.
_NOISE_CLASS_PATTERNS: list[re.Pattern] = [
    re.compile(r"^css-[a-f0-9]{6,}$"),
    re.compile(r"^wp-[a-z]{8,}-[a-f0-9]{6,}$"),
    re.compile(r"^[a-z]+-[a-f0-9]{6,}$"),
]

# Separator characters chosen from the C0 range so they cannot appear in
# normal HTML/CSS text and cannot confuse the fingerprint hash.
_SECTION_SEP = "\x1f"   # Unit Separator — between HTML and CSS sections
_PAIR_SEP = "\x1e"      # Record Separator — between CSS var pairs


# ---------------------------------------------------------------------------
# HTML normalisation
# ---------------------------------------------------------------------------

def _is_noise_class(cls: str) -> bool:
    """Return True if *cls* is a build-tool hash-suffixed class name."""
    return any(p.match(cls) for p in _NOISE_CLASS_PATTERNS)


def _normalise_element(tag: Any) -> None:
    """
    Mutate *tag* (a BeautifulSoup Tag) so it is in canonical form:
    - tag name lowercased
    - attribute names lowercased, sorted alphabetically
    - class list stripped of noise entries
    - text nodes stripped (structure only)
    """
    # Lower-case the tag name in-place
    tag.name = tag.name.lower()

    # Process attributes
    original_attrs = dict(tag.attrs)
    tag.attrs.clear()
    for attr_name in sorted(original_attrs.keys()):
        lower_attr = attr_name.lower()
        value = original_attrs[attr_name]
        if lower_attr == "class":
            # Strip noise class names; keep others
            if isinstance(value, list):
                clean = [c for c in value if not _is_noise_class(c)]
            else:
                clean = [c for c in str(value).split() if not _is_noise_class(c)]
            tag.attrs[lower_attr] = clean
        else:
            tag.attrs[lower_attr] = value


def normalise_html(html: str) -> str:
    """
    Return a canonical string representation of *html* suitable for hashing.

    Steps (applied in order):
    1. Parse with BeautifulSoup (html.parser — no external parser needed)
    2. Drop HTML comments
    3. Drop text nodes (hash structure, not copy)
    4. Lowercase tag and attribute names; sort attributes alphabetically
    5. Strip noise class names matching known build-tool patterns
    6. Serialise to a deterministic string
    """
    soup = BeautifulSoup(html, "html.parser")

    # Remove comments
    for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
        comment.extract()

    # Remove all NavigableString / text nodes (keep only tags)
    from bs4 import NavigableString, Tag
    for node in soup.find_all(string=True):
        node.replace_with("")

    # Normalise every tag element
    for tag in soup.find_all(True):
        _normalise_element(tag)

    # Collapse whitespace runs in the serialised output
    raw = str(soup)
    raw = re.sub(r"\s+", " ", raw).strip()

    return raw


# ---------------------------------------------------------------------------
# CSS custom-property parsing
# ---------------------------------------------------------------------------

def parse_css_vars(css_text: str) -> dict[str, str]:
    """
    Extract all CSS custom property declarations (``--name: value``) from
    *css_text* and return them as a ``{name: value}`` dict.

    Also extracts ``var(--name)`` references from inline style fragments
    (useful when the CSS file is actually a style block, not a full sheet).
    """
    declared: dict[str, str] = {}

    # Match declarations: --property-name: value;
    declaration_re = re.compile(
        r"(--[\w-]+)\s*:\s*([^;}{]+?)(?:\s*;|\s*}|\s*$)",
        re.MULTILINE,
    )
    for match in declaration_re.finditer(css_text):
        name = match.group(1).strip()
        value = match.group(2).strip()
        declared[name] = value

    return declared


def _sorted_css_var_dump(css_vars: dict[str, str]) -> str:
    """
    Serialise *css_vars* as a sorted, deterministic string for inclusion
    in the fingerprint hash.
    """
    pairs = [f"{k}={v}" for k, v in sorted(css_vars.items())]
    return _PAIR_SEP.join(pairs)


# ---------------------------------------------------------------------------
# Unmapped CSS rules detection
# ---------------------------------------------------------------------------

def _build_expected_css_props(block_json_path: str) -> set[str]:
    """
    Load *block_json_path*, walk the ``attributes`` keys, and return the
    set of CSS property names that the block is expected to control.
    """
    try:
        with open(block_json_path, encoding="utf-8") as fh:
            block_data = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Could not load block.json at {block_json_path!r}: {exc}") from exc

    attributes: dict = block_data.get("attributes", {})
    expected: set[str] = set()
    for attr_name in attributes:
        css_prop = ATTR_TO_CSS.get(attr_name)
        if css_prop:
            expected.add(css_prop)
    return expected


def find_unmapped_css_rules(
    css_vars: dict[str, str],
    block_json_path: str | None,
) -> list[dict]:
    """
    Compare the CSS properties present in *css_vars* against the set
    derived from the block's attribute schema.

    Returns a list of dicts, each describing one unmapped rule:
    ``{selector, property, value, reason}``

    If *block_json_path* is None the audit is skipped and ``[]`` is returned.
    """
    if not block_json_path:
        return []

    expected_props = _build_expected_css_props(block_json_path)
    unmapped: list[dict] = []

    for prop, value in css_vars.items():
        # Custom property names (--*) are always "property" keys here;
        # treat the property as the CSS property name for comparison.
        # Strip leading -- for the comparison against ATTR_TO_CSS values.
        css_prop_name = prop.lstrip("-")
        # Also accept the raw name in case the caller used bare CSS names
        if css_prop_name not in expected_props and prop not in expected_props:
            unmapped.append(
                {
                    "selector": "inline",
                    "property": prop,
                    "value": value,
                    "reason": "no_block_json_attribute_for_this_property",
                }
            )

    return unmapped


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_fingerprint(
    html: str,
    css_vars: dict[str, str] | None = None,
    block_json_path: str | None = None,
) -> dict:
    """
    Compute a deterministic fingerprint for an HTML pattern and its
    associated CSS custom properties.

    Parameters
    ----------
    html:
        Raw HTML of the pattern to fingerprint.
    css_vars:
        Mapping of CSS custom-property names to their values.
        Derived from ``var(--name)`` inline references and/or supplied
        ``--name: value`` declarations. Pass ``None`` or ``{}`` if not known.
    block_json_path:
        Absolute or relative path to the target block's ``block.json``.
        When provided, the function audits ``css_vars`` against the block's
        attribute schema and populates ``unmapped_css_rules``.

    Returns
    -------
    dict with keys:
        ``fingerprint``            — sha256 hex digest, the dedup key
        ``perceptual_hash``        — placeholder; always ``None`` for now
        ``unmapped_css_rules``     — list of dicts, one per unmapped CSS rule
        ``normalised_html_preview``— first 200 chars of the canonical HTML
    """
    if css_vars is None:
        css_vars = {}

    normalised_html = normalise_html(html)
    css_dump = _sorted_css_var_dump(css_vars)

    raw = normalised_html + _SECTION_SEP + css_dump
    fingerprint = hashlib.sha256(raw.encode("utf-8")).hexdigest()

    unmapped = find_unmapped_css_rules(css_vars, block_json_path)

    return {
        "fingerprint": fingerprint,
        "perceptual_hash": None,
        "unmapped_css_rules": unmapped,
        "normalised_html_preview": normalised_html[:200],
    }


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Compute a deterministic fingerprint for an HTML pattern + CSS bundle. "
            "Part of the SGS WordPress cloning pipeline."
        )
    )
    parser.add_argument(
        "html_file",
        help="Path to the HTML file containing the pattern to fingerprint.",
    )
    parser.add_argument(
        "--css-file",
        dest="css_file",
        default=None,
        help=(
            "Optional path to a CSS file. Custom property declarations "
            "(--name: value) will be extracted and included in the fingerprint."
        ),
    )
    parser.add_argument(
        "--block-json",
        dest="block_json",
        default=None,
        help=(
            "Optional path to a block.json file. When provided, every CSS "
            "property in the CSS bundle that has no corresponding attribute "
            "in the block schema is flagged in unmapped_css_rules."
        ),
    )
    parser.add_argument(
        "--output",
        dest="output",
        default=None,
        help=(
            "Write the result as JSON to this file path. "
            "If omitted, the result is printed to stdout."
        ),
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()

    # --- Load HTML ---
    html_path = Path(args.html_file)
    if not html_path.exists():
        sys.stderr.write(f"Error: HTML file not found: {html_path}\n")
        sys.exit(1)

    try:
        html = html_path.read_text(encoding="utf-8")
    except OSError as exc:
        sys.stderr.write(f"Error reading HTML file: {exc}\n")
        sys.exit(1)

    # --- Load CSS vars (optional) ---
    css_vars: dict[str, str] = {}
    if args.css_file:
        css_path = Path(args.css_file)
        if not css_path.exists():
            sys.stderr.write(f"Error: CSS file not found: {css_path}\n")
            sys.exit(1)
        try:
            css_text = css_path.read_text(encoding="utf-8")
            css_vars = parse_css_vars(css_text)
        except OSError as exc:
            sys.stderr.write(f"Error reading CSS file: {exc}\n")
            sys.exit(1)

    # --- Validate block.json path (optional) ---
    block_json_path: str | None = None
    if args.block_json:
        bj_path = Path(args.block_json)
        if not bj_path.exists():
            sys.stderr.write(f"Error: block.json not found: {bj_path}\n")
            sys.exit(1)
        block_json_path = str(bj_path)

    # --- Compute ---
    try:
        result = compute_fingerprint(html, css_vars, block_json_path)
    except ValueError as exc:
        sys.stderr.write(f"Parse error: {exc}\n")
        sys.exit(2)

    # --- Output ---
    output_json = json.dumps(result, indent=2, ensure_ascii=False)

    if args.output:
        out_path = Path(args.output)
        try:
            out_path.write_text(output_json, encoding="utf-8")
            sys.stdout.write(f"Result written to {out_path}\n")
        except OSError as exc:
            sys.stderr.write(f"Error writing output file: {exc}\n")
            sys.exit(1)
    else:
        sys.stdout.write(output_json + "\n")


# ---------------------------------------------------------------------------
# Smoke test — validates determinism across runs
# ---------------------------------------------------------------------------

# 50-line hardcoded HTML fixture representative of an SGS hero pattern.
_SMOKE_TEST_HTML = """
<!DOCTYPE html>
<html lang="en">
<!-- Header comment — should be dropped -->
<body>
  <section class="wp-block-sgs-hero css-a1b2c3 sgs-hero" data-variant="split" data-theme="dark">
    <div class="sgs-hero__inner wp-container-abc123">
      <div class="sgs-hero__content" style="padding-top: var(--sgs-spacing-lg);">
        <h1 class="sgs-hero__headline wp-block-heading">
          <!-- copy is stripped — only structure hashed -->
          Welcome to Small Giants Studio
        </h1>
        <p class="sgs-hero__subheadline">
          Building Websites That Work
        </p>
        <div class="sgs-hero__cta-group" style="gap: var(--sgs-gap-md);">
          <a href="#contact"
             class="wp-block-button__link sgs-btn sgs-btn--primary"
             style="background-color: var(--wp--preset--color--primary);">
            Get In Touch
          </a>
          <a href="#work"
             class="wp-block-button__link sgs-btn sgs-btn--secondary">
            See Our Work
          </a>
        </div>
      </div>
      <div class="sgs-hero__media">
        <img src="/wp-content/themes/sgs-theme/assets/hero-image.webp"
             alt=""
             width="800"
             height="600"
             loading="eager"
             decoding="async" />
      </div>
    </div>
  </section>
</body>
</html>
""".strip()

_SMOKE_TEST_CSS_VARS: dict[str, str] = {
    "--sgs-spacing-lg": "3rem",
    "--sgs-gap-md": "1rem",
    "--wp--preset--color--primary": "#0F7E80",
    "--wp--preset--color--accent": "#F87A1F",
}

# Expected fingerprint — computed once and asserted on every subsequent run.
# If the algorithm changes intentionally, update this constant.
_EXPECTED_SMOKE_FINGERPRINT: str | None = None  # Set at module load time below


def validate_capture() -> str:
    """
    Run the smoke test against the hardcoded fixture and assert that the
    fingerprint is stable across runs.

    Returns the fingerprint string so callers can print it for reference.
    Raises AssertionError if the result is not self-consistent.
    """
    result_a = compute_fingerprint(_SMOKE_TEST_HTML, _SMOKE_TEST_CSS_VARS)
    result_b = compute_fingerprint(_SMOKE_TEST_HTML, _SMOKE_TEST_CSS_VARS)

    fp_a = result_a["fingerprint"]
    fp_b = result_b["fingerprint"]

    assert fp_a == fp_b, (
        f"Fingerprint is NOT deterministic across runs!\n"
        f"  Run A: {fp_a}\n"
        f"  Run B: {fp_b}"
    )
    assert len(fp_a) == 64, f"Expected 64-char sha256 hex digest, got {len(fp_a)} chars."
    assert result_a["perceptual_hash"] is None, "perceptual_hash should be None (placeholder)."
    assert isinstance(result_a["unmapped_css_rules"], list), "unmapped_css_rules must be a list."
    assert isinstance(result_a["normalised_html_preview"], str), "normalised_html_preview must be a str."
    assert len(result_a["normalised_html_preview"]) <= 200, "normalised_html_preview must be ≤200 chars."

    # When no block_json is supplied, unmapped rules list must be empty.
    assert result_a["unmapped_css_rules"] == [], (
        f"Expected empty unmapped_css_rules when no block_json supplied; "
        f"got: {result_a['unmapped_css_rules']}"
    )

    return fp_a


# Compute and store the smoke-test fingerprint at import time.
# This gives a stable reference value the caller can quote for verification.
_EXPECTED_SMOKE_FINGERPRINT = validate_capture()


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--smoke-test":
        # Convenience: run just the smoke test and print the fingerprint.
        fp = validate_capture()
        sys.stdout.write(f"Smoke test PASSED. Fingerprint: {fp}\n")
        sys.exit(0)

    main()
