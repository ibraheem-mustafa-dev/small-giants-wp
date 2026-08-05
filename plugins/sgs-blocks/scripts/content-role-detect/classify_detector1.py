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


def _classify_esc_attr_core(before: str, after: str, stmt: str, key: str) -> str:
    """Core esc_attr classification given an explicit 'before' window.

    Factored out 2026-08-05 (D1 forward variable-tracking fix) so the SAME
    rule set can be retried against PHP's `printf_context`/`forward_context`
    fallback windows without duplicating the rules. Unchanged from the
    pre-2026-08-05 body except: (a) the a11y match narrowed from a blanket
    `aria-[a-z]+` to `aria-label` specifically, and (b) two PHP
    associative-array-literal ('aria-label' => ..., 'style' => ...,
    'name' => ...) branches added alongside the existing HTML-attribute
    (`aria-label="..."`) branches — see the module docstring update below.
    """
    # 1) STYLING exclude — feeds a style="" attribute (HTML or PHP array-key form).
    if re.search(r"style\s*=\s*['\"]?[^'\";]{0,80}$", before, re.IGNORECASE):
        return "STYLING-exclude"
    # `style="` closed by a string-concatenation quote before the esc_attr()
    # call — e.g. `'style="color:' . esc_attr( $x ) . '"'` — found by the
    # negative-control fixture (plant_forward_and_printf.php) 2026-08-05:
    # the pattern above requires NO quote character in the tail, so it never
    # matched this (very common) concatenation shape; the aria-label/alt/
    # title branch below already tolerates it via `['"]{0,2}\s*\.?\s*$` and
    # style needed the same tolerance.
    if re.search(r"style\s*=\s*['\"][^'\";]{0,80}['\"]{0,2}\s*\.?\s*$", before, re.IGNORECASE):
        return "STYLING-exclude"
    if re.search(r"['\"]style['\"]\s*=>\s*$", before, re.IGNORECASE):
        return "STYLING-exclude"
    if "sgsCustomCss" in stmt or "sgs_custom_css" in stmt:
        return "STYLING-exclude"

    # 2) a11y-metadata — feeds aria-label=, alt=, title=, placeholder=.
    # Narrowed 2026-08-05 from a blanket `aria-[a-z]+` to `aria-label`
    # specifically: most other aria-* attributes (aria-describedby,
    # aria-controls, aria-owns, aria-hidden...) hold ID REFERENCES or
    # boolean state, not accessible TEXT. This was previously moot (the
    # broader pattern never got REACHED for those rows because the
    # printf/forward resolution below didn't exist yet) but the new
    # fallback windows make some of those rows reachable, so the pattern
    # must not over-claim them as a11y-metadata (e.g.
    # sgs/form-field-address's aria-describedby, built from `fieldName`).
    # SPLIT 2026-08-05 (Bean challenged the lumping; mirrors the PHP-side
    # split in detector1_render_escaping.php's classify_call()). `alt` and
    # `placeholder` were classified 'a11y-metadata' alongside aria-label/
    # title. That routes them to the a11y-text role, classification
    # styling-behaviour — EXCLUDED from the converter's content walk. Both
    # are wrong there:
    #   * alt         — a client AUTHORS alt text and edits it; it must
    #                    transfer from a draft.
    #   * placeholder — D482 ruled explicitly "a placeholder is content" and
    #                    reclassified 13 rows from 'behaviour' to content on
    #                    exactly that basis.
    # aria-label/title ARE functional accessible names, often DERIVED in
    # render.php rather than authored (responsive-logo builds a fallback
    # from the site name), so they stay a11y-metadata. One coarse category
    # made two real content shapes invisible.
    window = before[-80:]
    if re.search(r"(alt|placeholder)\s*=\s*['\"]{0,2}\s*\.?\s*$", window, re.IGNORECASE):
        return "authored-alt-text"
    if re.search(r"(aria-label|title)\s*=\s*['\"]{0,2}\s*\.?\s*$", window, re.IGNORECASE):
        return "a11y-metadata"
    # PHP associative-array literal form: 'aria-label' => esc_attr( $x ) —
    # the SGS_Container_Wrapper::render() `extra_attrs` shape (sgs/nav-menu).
    if re.search(r"['\"](alt|placeholder)['\"]\s*=>\s*$", window, re.IGNORECASE):
        return "authored-alt-text"
    if re.search(r"['\"](aria-label|title)['\"]\s*=>\s*$", window, re.IGNORECASE):
        return "a11y-metadata"
    # Sometimes the attribute name appears just AFTER, e.g.
    # `. esc_attr($x) . '" aria-label="' ...` (rare, but check).
    windowAfter = after[:80]
    if re.search(r"^\)\s*\.\s*['\"][^'\"]*\balt\s*=", windowAfter, re.IGNORECASE):
        return "authored-alt-text"
    if re.search(r"^\)\s*\.\s*['\"][^'\"]*\b(aria-label|title)\s*=", windowAfter, re.IGNORECASE):
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
    # Any aria-* attribute OTHER than aria-label is an ID reference or
    # boolean state (aria-describedby, aria-controls, aria-owns,
    # aria-hidden, aria-expanded...), never accessible TEXT — added
    # 2026-08-05 alongside the aria-label narrowing above. Needed so
    # sgs/form-field-address.fieldName's aria-describedby row (built from
    # `$base_fid`, which the multi-variable resolution also attributes to
    # `fieldName`) resolves to an explicit NOT-content veto rather than
    # staying an ambiguous 'esc_attr-unresolved' — the aggregation in
    # fingerprint_content_roles.py picks content_cats[0] over any
    # unresolved leftover, which is exactly the trap that hid
    # button.ariaLabel's correct a11y-metadata verdict behind an unrelated
    # unresolved row on 2026-08-04/05 (see report).
    if re.search(r"aria-(?!label\b)[a-z]+\s*=\s*['\"]{0,2}\s*\.?\s*$", window, re.IGNORECASE):
        return "NOT-content"
    if re.search(r"['\"]aria-(?!label['\"])[a-z]+['\"]\s*=>\s*$", window, re.IGNORECASE):
        return "NOT-content"
    # Technical HTML form/input attributes — never visible content. `rel`
    # and `value` added 2026-08-05: `rel` is a machine-readable
    # link-relationship token (sgs/icon.linkRel, sgs/media.linkRel), never
    # visible content; `value` on a hidden field is the raw submitted
    # payload (sgs/form-field-hidden.defaultValue) rather than displayed
    # text — verified narrow (only 2 render.php files in the whole plugin
    # feed an esc_attr()'d value into a `value="` placeholder; the other,
    # sgs/option-picker, binds an array element outside this detector's
    # tracked pool, so this addition is scoped to the one row it targets).
    if re.search(
        r"\b(name|id|min|max|step|accept|for|method|type|autocomplete|rel|value)\s*=\s*['\"]{0,2}\s*\.?\s*$",
        window,
        re.IGNORECASE,
    ):
        return "NOT-content"
    # PHP associative-array literal form of the same technical-attribute set.
    if re.search(
        r"['\"](name|id|min|max|step|accept|for|method|type|autocomplete|rel|value)['\"]\s*=>\s*$",
        window,
        re.IGNORECASE,
    ):
        return "NOT-content"

    return "esc_attr-unresolved"


def classify_esc_attr(row: dict) -> str:
    stmt = row["statement"]
    key = row["attr_key"]
    idx = stmt.find("esc_attr")
    before = stmt[:idx] if idx != -1 else ""
    after = stmt[idx:] if idx != -1 else ""

    result = _classify_esc_attr_core(before, after, stmt, key)
    if result != "esc_attr-unresolved":
        return result

    # Fallback windows (2026-08-05, D1 forward variable-tracking fix). The
    # same statement's immediate text couldn't place this value into an
    # HTML/array attribute context — retry against the two context windows
    # detector1_render_escaping.php computed structurally:
    #   printf_context  — Blind Spot #3 closure: printf()/sprintf() split
    #                      the HTML attribute name (in the format string)
    #                      from the escaped value (a positional argument),
    #                      so "the text immediately before this call" was
    #                      never the right place to look.
    #   forward_context — the value was escaped INTO a variable at
    #                      assignment time; the attribute name it becomes
    #                      lives in a LATER (or earlier) statement where
    #                      that variable is read. D1 already tracked
    #                      attribute->variable; this is the other
    #                      direction, variable->use-site.
    # Same rule set, same order of trust — a real classification from
    # either fallback wins; if both are absent or also inconclusive, the
    # row stays exactly what it was: an honest, reported gap.
    for ctx_field in ("printf_context", "forward_context"):
        ctx = row.get(ctx_field)
        if not ctx:
            continue
        ctx_result = _classify_esc_attr_core(ctx, "", ctx, key)
        if ctx_result != "esc_attr-unresolved":
            return ctx_result

    return result


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
