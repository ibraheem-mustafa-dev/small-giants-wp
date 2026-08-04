#!/usr/bin/env python3
"""
Detector 1 (step 2 of 2) — classify raw escaping-call facts extracted by
detector1_render_escaping.php into content categories.

The PHP tokenizer stage produces raw facts (which attribute key flows into
which escaping function, on which statement). Classification (is this
visible text / a11y metadata / SVG markup / link href / styling-exclude /
NOT-content) needs a wider text window than is convenient to hand-roll in
PHP regex, so it is a separate pass here — same detector, second stage.

Usage:
    php detector1_render_escaping.php --glob > d1_raw.ndjson
    python classify_detector1.py d1_raw.ndjson > d1_classified.ndjson
"""
import json
import re
import sys

FUNC_CATEGORY = {
    "esc_html": "visible-text",
    "esc_html__": "visible-text",  # added 2026-08-04, see wp_kses_post note below
    "esc_html_e": "visible-text",
    "esc_textarea": "visible-text",
    "esc_url": "link-href",
    "esc_url_raw": "link-href",
}

# CONFIRMED LIVE BUG (2026-08-04, independent verification): `wp_kses_post`
# was entirely absent from both this dict AND the PHP tokenizer stage's
# tracked-function regex, so `sgs/hero.svgContent`
# (hero/render.php:831 — `wp_kses_post( $svg_content )`) produced ZERO rows
# from Detector 1, with no error and no ::UNRESOLVED:: marker — it simply
# never appeared. This was a plain function-name-allowlist gap, not a hard
# dynamic-key/indirection case. Fixed in the PHP stage's call regex + here.
FUNC_WP_KSES_LIKE = {"wp_kses", "wp_kses_post"}

# Attribute-key name fragments that indicate the value feeds a CSS class /
# modifier token, not content — even though it is technically escaped with
# esc_attr() before being concatenated into a class string.
NOT_CONTENT_KEY_HINTS = re.compile(
    r"(style$|Position$|^direction$|Type$|Target$|^rel$|^anchor$|Shape$|"
    r"^wrap$|Direction$|Colour|Color|Unit$|Ref$|Key$|Scheme$|Format$|"
    r"Placement$|^orientation$)",
    re.IGNORECASE,
)

# attr-key hints that indicate a genuine CSS-value / motion-parameter feeding
# a `--sgs-*` custom property or a JS positioning/animation data-attr —
# STYLING or behavioural, not content.
STYLING_OR_BEHAVIOURAL_KEY_HINTS = re.compile(
    r"(Opacity$|Duration|Offset$|Easing$|^scaleHover$|Strength$|"
    r"^position[XY]|Width(Tablet|Mobile)?$|Rotation|Speed$|MinHeight$|"
    r"^aspectRatio$|^parallax)",
    re.IGNORECASE,
)

# attr-key hints for text genuinely rendered to the visitor via a data-*
# attribute consumed by JS (e.g. counter's data-prefix/-suffix, countdown's
# data-expired-message) rather than server-escaped HTML.
JS_RENDERED_TEXT_KEY_HINTS = re.compile(
    r"(Message$|Label$|Title$|^text$)", re.IGNORECASE
)
JS_RENDERED_ADORNMENT_KEY_HINTS = re.compile(r"^(prefix|suffix|separator)$", re.IGNORECASE)


def classify_esc_attr(row: dict) -> str:
    stmt = row["statement"]
    key = row["attr_key"]
    idx = stmt.find("esc_attr")
    before = stmt[:idx] if idx != -1 else ""
    after = stmt[idx:] if idx != -1 else ""

    # 1) STYLING exclude — feeds a style="" attribute.
    if re.search(r"style\s*=\s*['\"]?[^'\";]{0,80}$", before, re.IGNORECASE):
        return "STYLING-exclude"
    if "sgsCustomCss" in stmt or "sgs_custom_css" in stmt:
        return "STYLING-exclude"

    # 2) a11y-metadata — feeds aria-*, alt=, title=, placeholder=.
    window = before[-80:]
    if re.search(r"(aria-[a-z]+|alt|title|placeholder)\s*=\s*['\"]{0,2}\s*\.?\s*$", window, re.IGNORECASE):
        return "a11y-metadata"
    # Sometimes the attribute name appears just AFTER, e.g.
    # `. esc_attr($x) . '" aria-label="' ...` (rare, but check).
    windowAfter = after[:80]
    if re.search(r"^\)\s*\.\s*['\"][^'\"]*\b(aria-[a-z]+|alt|title)\s*=", windowAfter, re.IGNORECASE):
        return "a11y-metadata"

    # 3) STYLING/behavioural — feeds a `--sgs-*` custom property or a JS
    # positioning/animation data-attr (parallax, path-draw, rotation...).
    if "--sgs-" in window or STYLING_OR_BEHAVIOURAL_KEY_HINTS.search(key):
        return "STYLING-exclude"

    # 4) JS-rendered text — a data-* attribute whose VALUE is genuinely
    # shown to the visitor by frontend JS (counter's data-prefix, the
    # countdown's data-expired-message) rather than server-escaped HTML.
    if re.search(r"data-[a-z-]+\s*[\]'\"]?\s*(\]|=)\s*$", window, re.IGNORECASE) or "data-" in window[-40:]:
        if JS_RENDERED_ADORNMENT_KEY_HINTS.search(key):
            return "numeric-adornment"
        if JS_RENDERED_TEXT_KEY_HINTS.search(key):
            return "visible-text"
        return "NOT-content"

    # 5) NOT-content — class/modifier tokens, ids, enum-like settings.
    if NOT_CONTENT_KEY_HINTS.search(key):
        return "NOT-content"
    if re.search(r"class(name)?s?\s*(\[|=|\.)", window, re.IGNORECASE) or "'sgs-" in window:
        return "NOT-content"
    if key == "anchor" or re.search(r"\bid\s*(\]|=)\s*$", window, re.IGNORECASE):
        return "NOT-content"
    # Technical HTML form/input attributes — never visible content.
    if re.search(
        r"\b(name|id|min|max|step|accept|for|method|type|autocomplete)\s*=\s*['\"]{0,2}\s*\.?\s*$",
        window,
        re.IGNORECASE,
    ):
        return "NOT-content"

    return "esc_attr-unresolved"


def classify_wp_kses(row: dict) -> str:
    stmt = row["statement"].lower()
    if "svg" in stmt or "allowed_svg" in stmt or "svgcontent" in row["attr_key"].lower():
        return "svg-markup"
    return "wp_kses-other"


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else None
    lines = open(path, encoding="utf-8") if path else sys.stdin
    for line in lines:
        line = line.strip()
        if not line:
            continue
        row = json.loads(line)
        func = row["func"].lower()
        if func in FUNC_CATEGORY:
            row["final_category"] = FUNC_CATEGORY[func]
        elif func in ("esc_attr", "esc_attr_e", "esc_attr__"):
            row["final_category"] = classify_esc_attr(row)
        elif func in FUNC_WP_KSES_LIKE:
            row["final_category"] = classify_wp_kses(row)
        else:
            row["final_category"] = "unclassified"
        print(json.dumps(row))


if __name__ == "__main__":
    main()
