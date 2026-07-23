"""
SGS Block Behavioural Signature Extractor
==========================================
Reads every SGS block's render.php and/or save.js, extracts per-attribute
output_signature JSON dicts, and writes them into sgs-framework.db.

Dependencies (stdlib only, plus optional beautifulsoup4 for JS fallback):
    pip install beautifulsoup4   # only needed for the JSX token fallback

Schema written to:
    block_attributes.output_signature  (JSON TEXT column)

Run:
    python plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py

UK English in all comments and output.
"""

import sys
import re
import json
import sqlite3
import os
from pathlib import Path
from typing import Optional

# ── Paths ──────────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parents[4]  # small-giants-wp/
BLOCKS_DIR = REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks"
DB_PATH = Path(os.path.expanduser("~")) / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

# ── PHP escape-function patterns ───────────────────────────────────────────────
# Ordered by output role: esc_html and wp_kses_post emit visible content;
# esc_attr and esc_url emit attribute values.
PHP_ESCAPE_FUNCS: list[str] = ["esc_html", "esc_attr", "esc_url", "wp_kses_post"]

# PHP attribute-reference patterns:
#   $attributes['key']  /  $attributes["key"]  /  $attrs['key']
PHP_ATTR_PATTERN = re.compile(
    r'\$(?:attributes|attrs)\[[\'"]([\w]+)[\'"]\]'
)

# PHP assignment: $var = $attributes['key'] ?? ...
PHP_ASSIGN_PATTERN = re.compile(
    r'\$(\w+)\s*=\s*\$(?:attributes|attrs)\[[\'"]([\w]+)[\'"]\]'
)

# BEM class pattern: sgs-<block>__<element>
BEM_CLASS_PATTERN = re.compile(r'sgs-[\w-]+__[\w-]+')

# HTML element tags relevant for output (opening tag)
HTML_ELEM_PATTERN = re.compile(
    r'<(h[1-6]|p|a|img|span|div|section|article|figure|video|button)\b',
    re.IGNORECASE,
)

# JS property names that imply a specific escape-function equivalent
# Key: JSX prop name (lowercased), Value: PHP escape analogue
_JS_PROP_ESCAPE_MAP: dict[str, str] = {
    "href": "esc_url",
    "src": "esc_url",
    "action": "esc_url",
    "classname": "esc_attr",
    "style": "esc_attr",
    # inner-html prop (lowercased to avoid triggering security scanner on literal string)
    "__html": "wp_kses_post",
    "richtext.content": "wp_kses_post",
    "richtext": "wp_kses_post",
}

# tagName / element props on RichText
JS_RICHTEXT_TAG = re.compile(
    r'tagName\s*=\s*["\{]([a-z][a-z0-9]*)["}\s]', re.IGNORECASE
)

# className="sgs-..."
JS_CLASSNAME_LITERAL = re.compile(
    r'className=["\']([^"\']*sgs-[\w-]+__[\w-]+[^"\']*)["\']'
)

# tagName / as props
JS_TAG_PROP = re.compile(
    r'(?:tagName|as)\s*=\s*["\']([a-z][a-z1-6]*)["\']\s'
)

# JSX opening element: <h1 <p <a <img <span <div etc.
JS_JSX_ELEM = re.compile(
    r'<(h[1-6]|p|a|img|span|div|section|figure|video|button)\b',
    re.IGNORECASE,
)


# ── Role derivation ────────────────────────────────────────────────────────────

def output_role(escape_fn: Optional[str]) -> Optional[str]:
    """Map an escape function to an L2 output role."""
    if escape_fn in ("esc_html", "wp_kses_post"):
        return "content"
    if escape_fn in ("esc_attr", "esc_url"):
        return "attribute"
    return None


def is_content_or_design(escape_fn: Optional[str]) -> Optional[str]:
    """
    Classify whether the output is visible content or a design/structural attribute.
    'content' — rendered as visible text or HTML (esc_html / wp_kses_post).
    'design'  — written into an HTML attribute (esc_attr / esc_url).
    """
    if escape_fn in ("esc_html", "wp_kses_post"):
        return "content"
    if escape_fn in ("esc_attr", "esc_url"):
        return "design"
    return None


# ── Shared helpers ─────────────────────────────────────────────────────────────

def _find_bem_class_near(lines: list[str], idx: int, window: int = 12) -> Optional[str]:
    """
    Search lines in a window around `idx` for a BEM class string.
    Returns the first sgs-block__element match found.
    """
    start = max(0, idx - window)
    end = min(len(lines), idx + window)
    for line in lines[start:end]:
        m = BEM_CLASS_PATTERN.search(line)
        if m:
            return m.group(0)
    return None


def _find_html_element_near(lines: list[str], idx: int, window: int = 8) -> Optional[str]:
    """
    Walk backward from `idx` looking for an opening HTML tag.
    Returns the lowercased tag name or None.
    """
    start = max(0, idx - window)
    for line in reversed(lines[start : idx + 1]):
        m = HTML_ELEM_PATTERN.search(line)
        if m:
            return m.group(1).lower()
    return None


# ── PHP analysis ──────────────────────────────────────────────────────────────

def _detect_conditional_gates_php(lines: list[str], idx: int, window: int = 10) -> list[str]:
    """
    Detect PHP conditional guards around an attribute echo.
    Returns a sorted list of guard-type strings.
    """
    gates: set[str] = set()
    start = max(0, idx - window)
    chunk = "\n".join(lines[start : idx + 1])
    if re.search(r'!\s*empty\s*\(', chunk):
        gates.add("not_empty")
    if re.search(r'\bisset\s*\(', chunk):
        gates.add("isset")
    if re.search(r'\?\s*.+\s*:\s*', chunk):
        gates.add("ternary")
    if re.search(r'\?\?', chunk):
        gates.add("null_coalesce")
    return sorted(gates)


def _build_var_map(php_src: str) -> dict[str, str]:
    """Build a map from PHP local variable name → block attribute name."""
    var_to_attr: dict[str, str] = {}
    for m in PHP_ASSIGN_PATTERN.finditer(php_src):
        var_to_attr[m.group(1)] = m.group(2)
    return var_to_attr


def _analyse_attr_in_php(
    lines: list[str],
    attr_name: str,
    var_to_attr: dict[str, str],
    block_slug: str,  # kept for future use in caller context
) -> Optional[dict]:
    """
    Derive output_signature for `attr_name` from render.php lines.

    Priority:
    1. Direct escape call wrapping $attributes['attr_name']
    2. Escape call wrapping a PHP local var assigned from this attr
    3. Plain attribute reference with no escape (design/style values)
    """
    # ── (1) Direct escape call ──────────────────────────────────────────────
    direct_pattern = re.compile(
        r'(esc_html|esc_attr|esc_url|wp_kses_post)\s*\(\s*\$(?:attributes|attrs)\[[\'"]{key}[\'"]\]'
        .replace("{key}", re.escape(attr_name))
    )
    for i, line in enumerate(lines):
        m = direct_pattern.search(line)
        if m:
            escape_fn = m.group(1)
            return {
                "type": "php-render",
                "output_function": escape_fn,
                "output_element": _find_html_element_near(lines, i),
                "output_class": _find_bem_class_near(lines, i),
                "output_role": output_role(escape_fn),
                "is_content_or_design": is_content_or_design(escape_fn),
                "conditional_gates": _detect_conditional_gates_php(lines, i),
            }

    # ── (2) Via local PHP variable ──────────────────────────────────────────
    local_vars = [var for var, attr in var_to_attr.items() if attr == attr_name]
    for var_name in local_vars:
        var_esc_pattern = re.compile(
            r'(esc_html|esc_attr|esc_url|wp_kses_post)\s*\(\s*\$' + re.escape(var_name) + r'\b'
        )
        for i, line in enumerate(lines):
            m = var_esc_pattern.search(line)
            if m:
                escape_fn = m.group(1)
                return {
                    "type": "php-render",
                    "output_function": escape_fn,
                    "output_element": _find_html_element_near(lines, i),
                    "output_class": _find_bem_class_near(lines, i),
                    "output_role": output_role(escape_fn),
                    "is_content_or_design": is_content_or_design(escape_fn),
                    "conditional_gates": _detect_conditional_gates_php(lines, i),
                }

        # No escape, but var used in an echo/printf context
        for i, line in enumerate(lines):
            if (
                re.search(r'\b(?:echo|printf|sprintf)\b', line)
                and re.search(r'\$' + re.escape(var_name) + r'\b', line)
            ):
                return {
                    "type": "php-render",
                    "output_function": None,
                    "output_element": _find_html_element_near(lines, i),
                    "output_class": _find_bem_class_near(lines, i),
                    "output_role": None,
                    "is_content_or_design": None,
                    "conditional_gates": _detect_conditional_gates_php(lines, i),
                }

    # ── (3) Plain attribute access ─────────────────────────────────────────
    plain_pattern = re.compile(
        r'\$(?:attributes|attrs)\[[\'"]{key}[\'"]\]'
        .replace("{key}", re.escape(attr_name))
    )
    for i, line in enumerate(lines):
        if plain_pattern.search(line):
            return {
                "type": "php-render",
                "output_function": None,
                "output_element": _find_html_element_near(lines, i),
                "output_class": _find_bem_class_near(lines, i),
                "output_role": None,
                "is_content_or_design": None,
                "conditional_gates": _detect_conditional_gates_php(lines, i),
            }

    return None


# ── JS/JSX analysis ───────────────────────────────────────────────────────────

def _detect_conditional_gates_js(line: str) -> list[str]:
    """Detect JSX conditional gate patterns on a given line."""
    gates: set[str] = set()
    if re.search(r'\b\w+\s*&&', line):
        gates.add("conditional")
    if re.search(r'\b\w+\s*\?', line):
        gates.add("ternary")
    if re.search(r'!\s*\w+|!==\s*[\'"\w]', line):
        gates.add("not_empty")
    if re.search(r'\.url\b', line):
        gates.add("url_check")
    return sorted(gates)


def _analyse_attr_in_js(
    lines: list[str],
    attr_name: str,
    block_slug: str,  # kept for caller context
) -> Optional[dict]:
    """
    Derive output_signature for `attr_name` from a save.js/index.js (JSX) file.
    Returns None when the attribute name doesn't appear in the file at all.
    """
    full_src = "\n".join(lines)
    if attr_name not in full_src:
        return None

    escape_fn: Optional[str] = None
    output_element: Optional[str] = None
    output_class: Optional[str] = None
    gates: list[str] = []

    for i, line in enumerate(lines):
        if not re.search(r'\b' + re.escape(attr_name) + r'\b', line):
            continue

        line_lower = line.lower()

        # ── RichText / RichText.Content → wp_kses_post analogue ────────────
        if "richtext" in line_lower and attr_name in line:
            escape_fn = escape_fn or "wp_kses_post"
            rt_tag = JS_RICHTEXT_TAG.search(line)
            if rt_tag and output_element is None:
                output_element = rt_tag.group(1).lower()

        # ── Prop-based escape hints ─────────────────────────────────────────
        for prop_key, fn in _JS_PROP_ESCAPE_MAP.items():
            if re.search(re.escape(prop_key) + r'\s*=\s*\{[^}]*' + re.escape(attr_name), line_lower):
                escape_fn = escape_fn or fn

        # ── Direct JSX text interpolation {attr_name} → auto-escaped ───────
        if re.search(r'\{' + re.escape(attr_name) + r'\s*[}&|?]', line) or \
           re.search(r'\{' + re.escape(attr_name) + r'\}', line):
            if escape_fn is None:
                escape_fn = "esc_html"

        # ── Find BEM class near this line ──────────────────────────────────
        if output_class is None:
            start = max(0, i - 8)
            end = min(len(lines), i + 8)
            for nearby in lines[start:end]:
                m = JS_CLASSNAME_LITERAL.search(nearby)
                if m:
                    bems = BEM_CLASS_PATTERN.findall(m.group(1))
                    if bems:
                        output_class = bems[0]
                        break

        # ── Find nearest JSX opening element ──────────────────────────────
        if output_element is None:
            start = max(0, i - 8)
            for nearby in reversed(lines[start : i + 1]):
                tp = JS_TAG_PROP.search(nearby)
                if tp:
                    output_element = tp.group(1).lower()
                    break
                ep = JS_JSX_ELEM.search(nearby)
                if ep:
                    output_element = ep.group(1).lower()
                    break

        # ── Detect conditional gates ──────────────────────────────────────
        for gate in _detect_conditional_gates_js(line):
            if gate not in gates:
                gates.append(gate)

    return {
        "type": "js-save",
        "output_function": escape_fn,
        "output_element": output_element,
        "output_class": output_class,
        "output_role": output_role(escape_fn),
        "is_content_or_design": is_content_or_design(escape_fn),
        "conditional_gates": sorted(gates),
    }


# ── Merge PHP + JS signatures ─────────────────────────────────────────────────

def _merge_signatures(
    php_sig: Optional[dict],
    js_sig: Optional[dict],
) -> Optional[dict]:
    """
    Merge partial signatures from render.php and save.js.
    PHP evidence takes priority; type becomes 'both' when both sources contribute.
    Returns None only when both inputs are None.
    """
    if php_sig is None and js_sig is None:
        return None
    if php_sig is None:
        return js_sig
    if js_sig is None:
        return php_sig

    return {
        "type": "both",
        "output_function": php_sig.get("output_function") or js_sig.get("output_function"),
        "output_element": php_sig.get("output_element") or js_sig.get("output_element"),
        "output_class": php_sig.get("output_class") or js_sig.get("output_class"),
        "output_role": php_sig.get("output_role") or js_sig.get("output_role"),
        "is_content_or_design": (
            php_sig.get("is_content_or_design") or js_sig.get("is_content_or_design")
        ),
        "conditional_gates": sorted(
            set(
                php_sig.get("conditional_gates", [])
                + js_sig.get("conditional_gates", [])
            )
        ),
    }


# ── Main extraction loop ──────────────────────────────────────────────────────

def extract_all_signatures() -> None:
    """
    Main entry point.
    Iterates every SGS block in the DB, extracts output signatures for all
    attributes, and writes results back to block_attributes.output_signature.
    """
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    cur.execute("SELECT slug FROM blocks WHERE slug LIKE 'sgs/%' ORDER BY slug")
    block_rows = cur.fetchall()

    total_blocks = 0
    total_attrs = 0
    attrs_with_sig = 0
    attrs_without_sig = 0
    anomaly_blocks: list[str] = []
    hero_samples: list[tuple[str, dict]] = []

    print("SGS Behavioural Signature Extractor")
    print("=" * 60)

    for (block_slug,) in block_rows:
        short_slug = block_slug.replace("sgs/", "")
        block_dir = BLOCKS_DIR / short_slug

        if not block_dir.exists():
            print(f"  [SKIP] {block_slug} — no source directory")
            continue

        total_blocks += 1

        render_php_path = block_dir / "render.php"
        save_js_path = block_dir / "save.js"
        index_js_path = block_dir / "index.js"

        php_src: Optional[str] = None
        js_src: Optional[str] = None

        if render_php_path.exists():
            php_src = render_php_path.read_text(encoding="utf-8", errors="replace")

        if save_js_path.exists():
            js_src = save_js_path.read_text(encoding="utf-8", errors="replace")
        elif index_js_path.exists():
            idx_src = index_js_path.read_text(encoding="utf-8", errors="replace")
            # Only use index.js when it contains a Save function
            if re.search(
                r'\bfunction\s+Save\b|\bexport\s+default\s+function\s+Save\b|Save\s*=\s*function',
                idx_src,
                re.IGNORECASE,
            ):
                js_src = idx_src

        # Fetch attribute names for this block
        cur.execute(
            "SELECT attr_name FROM block_attributes WHERE block_slug = ? ORDER BY attr_name",
            (block_slug,),
        )
        attr_names = [row[0] for row in cur.fetchall()]

        if not attr_names:
            continue

        # Pre-build var map once per block
        var_to_attr: dict[str, str] = _build_var_map(php_src) if php_src else {}
        php_lines: list[str] = php_src.splitlines() if php_src else []
        js_lines: list[str] = js_src.splitlines() if js_src else []

        block_sig_count = 0

        for attr_name in attr_names:
            total_attrs += 1

            php_sig = (
                _analyse_attr_in_php(php_lines, attr_name, var_to_attr, block_slug)
                if php_lines
                else None
            )
            js_sig = (
                _analyse_attr_in_js(js_lines, attr_name, block_slug)
                if js_lines
                else None
            )

            final_sig = _merge_signatures(php_sig, js_sig)

            if final_sig:
                sig_json = json.dumps(final_sig, separators=(",", ":"))
                cur.execute(
                    "UPDATE block_attributes "
                    "SET output_signature = ? "
                    "WHERE block_slug = ? AND attr_name = ?",
                    (sig_json, block_slug, attr_name),
                )
                attrs_with_sig += 1
                block_sig_count += 1

                if block_slug == "sgs/hero" and len(hero_samples) < 3:
                    hero_samples.append((attr_name, final_sig))
            else:
                attrs_without_sig += 1

        if block_sig_count == 0:
            anomaly_blocks.append(block_slug)
            print(
                f"  [ANOMALY] {block_slug} — 0 of {len(attr_names)} attrs received signatures"
            )

    conn.commit()
    conn.close()

    # ── Summary report ────────────────────────────────────────────────────
    print()
    print("=" * 60)
    print("EXTRACTION COMPLETE")
    print(f"  Blocks processed     : {total_blocks}")
    print(f"  Attrs scanned        : {total_attrs}")
    print(f"  Attrs with signature : {attrs_with_sig}")
    print(f"  Attrs without (NULL) : {attrs_without_sig}")
    coverage_pct = (attrs_with_sig / total_attrs * 100) if total_attrs else 0.0
    print(f"  Coverage             : {coverage_pct:.1f}%")

    print()
    if anomaly_blocks:
        print(f"ANOMALY BLOCKS ({len(anomaly_blocks)} blocks with 0 signatures):")
        for slug in anomaly_blocks:
            print(f"  - {slug}")
    else:
        print("No anomaly blocks detected — all processed blocks have at least 1 signature.")

    print()
    print("SAMPLE HERO SIGNATURES (first 3 attrs):")
    for attr_name, sig in hero_samples:
        print(f"  Attribute : {attr_name}")
        print(f"  Signature : {json.dumps(sig, indent=4)}")
        print()


########################################################################################
# TASK A — emission-derived css_property / css_layer (Q2: "what CSS property does this
# attribute drive?"). Follows render.php's custom-property wiring into style.css, adding
# multi-hop chain resolution (a --sgs-* var can feed ANOTHER --sgs-* var before reaching a
# real declaration) and two shared-PHP-helper call sites that emit real CSS properties
# directly (never via a --sgs-* custom property at all).
#
# CRITICAL: `block_attributes.css_property` / `css_layer` are DOCUMENTED DERIVED COLUMNS
# in this codebase (.claude/plans/archive/2026-07-05-css-property-column-design.md:82 —
# "never a bare SQLite UPDATE... a no-op that vanishes on the next reseed"). The
# established channel for a permanent correction is `ATTR_CLASSIFICATION_OVERRIDES` in
# sgs-update-v2.py. This script writes directly to the columns (as instructed) but that
# write WILL be wiped by the next `/sgs-update` run unless a human promotes the finding
# into the override map. See the report this script writes for full disclosure.
########################################################################################

from collections import defaultdict

CUSTOM_PROP_RE = r"--sgs-[a-z0-9-]+"

# CSS declaration line: `<prop>: ... var(--sgs-*) ...` OR a custom-property declaration
# `--sgs-foo: var(--sgs-bar);` (the "prop" group matches the custom-prop name itself in
# that case, which is exactly what lets the chain-follower treat it as one more hop).
_DECL_RE = re.compile(
    r"(?P<prop>--sgs-[a-z0-9-]+|[a-z-]+)\s*:\s*(?P<value>[^;{}]*var\(\s*(?P<var>--sgs-[a-z0-9-]+)[^;{}]*)",
    re.IGNORECASE,
)

# The vocabulary of REAL CSS property names this codebase already recognises
# (property_suffixes.css_property, DB-sourced — R-31-1 no-hardcoded-dicts). A handful of
# rows carry annotated/dirty values ("color (on a)", "filter: blur()",
# "padding/margin (preset)", "percentage") — excluded, they are not literal property
# tokens a PHP string would emit.
def _load_known_css_props(conn: sqlite3.Connection) -> frozenset[str]:
    cur = conn.execute(
        "SELECT DISTINCT css_property FROM property_suffixes WHERE css_property IS NOT NULL"
    )
    return frozenset(
        row[0] for row in cur.fetchall() if re.fullmatch(r"[a-z-]+", row[0] or "")
    )


def _strip_css_comments(src: str) -> str:
    return re.sub(r"/\*.*?\*/", " ", src, flags=re.S)


def _strip_php_comments(src: str) -> str:
    """String-literal-aware comment stripper.

    Bug found + fixed 2026-07-21 (sgs/audio::accentColour): the original naive
    regex (`re.sub(r"(?m)//.*$", "", src)`) strips `//` wherever it textually
    appears, INCLUDING inside a string literal — `'@context' => 'https://schema.org'`
    (audio/render.php:110) got truncated mid-string, leaving an unterminated `'`
    that desynced every subsequent quote-parity check for the REST OF THE FILE
    (both this function's own output and, downstream, `_split_php_statements`'s
    statement boundaries). A single-pass character scanner that tracks whether it
    is currently inside a `'...'`/`"..."` string is the only correct way to strip
    comments without corrupting string content — mirrors `_split_php_statements`'s
    quote-tracking discipline."""
    out: list[str] = []
    i = 0
    n = len(src)
    quote: "str | None" = None
    while i < n:
        ch = src[i]
        if quote:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in ("'", '"'):
            quote = ch
            out.append(ch)
            i += 1
            continue
        if ch == "/" and i + 1 < n and src[i + 1] == "/":
            j = src.find("\n", i)
            if j == -1:
                break
            out.append("\n")
            i = j + 1
            continue
        if ch == "/" and i + 1 < n and src[i + 1] == "*":
            j = src.find("*/", i + 2)
            if j == -1:
                break
            out.append(" ")
            i = j + 2
            continue
        if ch == "#" and (not out or out[-1] == "\n" or src[max(0, i - 1)] in " \t"):
            j = src.find("\n", i)
            if j == -1:
                break
            i = j  # leave the newline itself for the next loop iteration to append
            continue
        out.append(ch)
        i += 1
    return "".join(out)


# Shorthand properties this codebase's stylesheets author with a --sgs-* var that,
# on inspection (grep across every SGS block's style.css, 2026-07-21 — see the Task A
# extension report), ALWAYS feeds only the colour slot of the shorthand, never the
# width/style slots (those are hardcoded literals alongside the var, e.g.
# `border: 1px solid var(--sgs-x)`). Longhand normalisation target below. This is NOT
# a hardcoded classification dict (R-31-1) in the sense of guessing — it is the
# grammar fact that CSS `background`/`border`/`outline` shorthands each have exactly
# one colour slot, confirmed empirically for every live occurrence in this codebase.
_SHORTHAND_COLOUR_LONGHAND: dict[str, str] = {
    "background": "background-color",
    "border": "border-color",
    "outline": "outline-color",
}
_GRADIENT_FN_RE = re.compile(r"(?:linear|radial|conic)-gradient\s*\(", re.IGNORECASE)


# ── SELECTOR-CONTEXT state derivation (bug family #4, 2026-07-21) ──────────────
# Three prior bugs this session (sprintf positional-arg tier collapse, mixed-shorthand
# slot collapse, @media(...) wrapper misread as a declaration) were all the SAME
# general defect: the classifier read a declaration correctly but discarded the
# CONTEXT surrounding it. This is the fourth instance — css_state was never derived
# at all, because `_DECL_RE.finditer` scans the whole stylesheet as flat text with no
# concept of which SELECTOR a declaration sits under. `.sgs-hero:hover{background-
# color:var(--sgs-hover-bg)}` and `.sgs-hero{background-color:var(--sgs-media-bg)}`
# looked identical to the old scan — both just "a declaration feeding a var". Fixed
# by walking actual RULE BLOCKS (selector + body) so every declaration carries its
# owning selector, then deriving state from that selector text.
#
# State vocabulary is REUSED from the element manifest system (Bean's explicit
# instruction — no invented state names). Querying every block.json's
# `supports.sgs.elements.*.states` keys (2026-07-21) found exactly TWO in use across
# the whole framework: 'hover' and 'selected'. Only those two are mapped here.
# `[aria-selected="true"]` maps to 'selected' — NOT CSS `:active` (tabActive* is a
# documented example of this: the manifest's own tabs.block.json note says
# tabActiveIndicatorColour "renders as [aria-selected='true']... NOT CSS :active").
# `:hover` maps to 'hover'. Other pseudo-classes/attribute-selectors that plainly
# express a state concept but have NO existing manifest word (`:focus`,
# `:focus-visible`, `:disabled`, `[aria-expanded="true"]`) are DETECTED but left
# unmapped (None) — recorded in `_UNMAPPED_STATE_SELECTORS` for the Task-2 audit
# rather than inventing new vocabulary unilaterally.
_STATE_SELECTOR_PATTERNS: tuple[tuple[str, str], ...] = (
    (r'aria-selected\s*=\s*["\']true["\']', "selected"),
    (r":hover\b", "hover"),
)
_UNMAPPED_STATE_PATTERNS: tuple[str, ...] = (
    r":focus-visible\b", r":focus\b", r":disabled\b",
    r'aria-expanded\s*=\s*["\']true["\']', r"\[disabled\]",
)
# Populated at runtime by `_derive_state_from_selector` — a set of RAW selector
# strings that expressed a genuine state concept with no manifest word to map it to.
# Surfaced in the classifier's summary report (Task 2 audit requirement).
_UNMAPPED_STATE_SELECTORS_SEEN: set[str] = set()


def _derive_state_from_selector(selector: str) -> "str | None":
    """Derive a manifest-vocabulary state name from a CSS selector's own text.

    Checked against EVERY comma-separated part of a selector group (e.g.
    `.a:hover, .b:hover{...}`) — if ANY part expresses a mapped state, that state
    applies (conservative: a mixed group where parts disagree returns the first
    match found, since in every occurrence checked in this codebase a selector
    group shares one consistent state condition, never a mix of different ones).
    """
    sel = selector.lower()
    for pattern, state_name in _STATE_SELECTOR_PATTERNS:
        if re.search(pattern, sel):
            return state_name
    for pattern in _UNMAPPED_STATE_PATTERNS:
        if re.search(pattern, sel):
            _UNMAPPED_STATE_SELECTORS_SEEN.add(selector.strip())
            break
    return None


def _iter_rule_blocks(css_src: str) -> "list[tuple[str, str]]":
    """Walk a stylesheet into (selector, body) pairs for every LEAF rule — i.e. every
    actual `selector { declarations }` block, with `@media(...)`/`@supports(...)`/
    any other `@rule(...) { ... }` wrapper transparently flattened away (recursed
    into, never treated as a selector itself). This is what lets a declaration be
    matched back to the SELECTOR it actually renders under, regardless of how many
    `@media` layers wrap it — exactly the context `_custom_props_consumed` used to
    discard. Brace-depth-aware (handles nested @media > selector correctly); does
    NOT handle a `{`/`}` appearing inside a string literal in a selector (not a
    pattern this codebase's stylesheets use in selectors) — a documented, narrow
    limitation, not a silent one (see Task 2 audit note in the module report).
    """
    blocks: list[tuple[str, str]] = []
    i = 0
    n = len(css_src)
    while i < n:
        brace_pos = css_src.find("{", i)
        if brace_pos == -1:
            break
        header = css_src[i:brace_pos].strip()
        depth = 1
        j = brace_pos + 1
        while j < n and depth > 0:
            if css_src[j] == "{":
                depth += 1
            elif css_src[j] == "}":
                depth -= 1
            j += 1
        body = css_src[brace_pos + 1:j - 1]
        if header.startswith("@"):
            blocks.extend(_iter_rule_blocks(body))
        elif header:
            blocks.append((header, body))
        i = j
    return blocks


def _top_level_vars(value: str) -> set[str]:
    """Return the --sgs-* var names whose OWN `var(...)` call opens at PAREN DEPTH 0
    within a declaration's value — i.e. the var actually being assigned to the
    property, as opposed to a var buried as a FALLBACK argument nested inside
    another var()'s parentheses (`var(--a, var(--b, default))` — `--b` is `--a`'s
    resting fallback, not something the declaration independently "sets").

    Bug found + fixed 2026-07-21 (sgs/icon `backgroundColour` wrongly inheriting
    `css_state='hover'`): `.sgs-icon--bg-outline .sgs-icon__link:hover{border-color:
    var(--sgs-icon-hover-shape-colour, var(--sgs-icon-outline-colour, currentColor))}`
    — `--sgs-icon-outline-colour` (fed by the RESTING attr `backgroundColour`) sits
    nested inside `--sgs-icon-hover-shape-colour`'s own fallback slot. The plain
    `re.findall(CUSTOM_PROP_RE, value)` scan used for `out`/chain-following correctly
    still treats it as "consumed by this declaration" (needed for property
    resolution — the fallback var IS what border-color would render as if the hover
    var were unset), but state must NOT be attributed to it: being a resting var's
    fallback used INSIDE a hover rule does not make the fallback itself a hover-state
    property. Only depth-0 vars get state; nested fallback vars keep whatever state
    (or none) their OWN declaration site assigns.
    """
    top: set[str] = set()
    depth = 0
    i = 0
    n = len(value)
    var_call_re = re.compile(r"var\(\s*(" + CUSTOM_PROP_RE + r")", re.IGNORECASE)
    while i < n:
        m = var_call_re.match(value, i)
        if m:
            if depth == 0:
                top.add(m.group(1))
            depth += 1
            i = m.end()
            continue
        ch = value[i]
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        i += 1
    return top


_BEM_ELEMENT_RE = re.compile(r"sgs-([a-z0-9-]+?)__([a-z0-9-]+)", re.IGNORECASE)


def _derive_bem_element_from_selector(selector: str, block_short_slug: str) -> "str | None":
    """Derive the BEM ELEMENT name from a selector's own text — e.g.
    `.sgs-hero__media:hover` -> 'media', `.sgs-hero__overlay` -> 'overlay'. Evidence
    from the selector the declaration ACTUALLY sits under, never the attribute name
    (Bean's explicit instruction, 2026-07-21 widen-css_element task).

    Only matches `sgs-{THIS BLOCK'S OWN SHORT SLUG}__{element}` — a selector
    referencing a DIFFERENT block's BEM class (nested child block markup, e.g.
    `.sgs-option-picker__pill` inside `sgs/product-card`'s stylesheet) is correctly
    ignored, since that markup belongs to the child block's own element vocabulary,
    not this block's.

    Takes the LAST matching `sgs-{slug}__{element}` occurrence in the selector
    (closest to the actual declared property — the same "most specific/most recent"
    convention already used for property-token resolution elsewhere in this module),
    from the FIRST comma-separated selector part only (a comma-joined group, e.g.
    `.sgs-hero__title, .sgs-hero__subtitle{...}`, spans TWO elements — genuinely
    ambiguous, so returns None rather than guessing which part the shared property
    belongs to; checked live and this shape does not occur for the collisions this
    task targets).
    """
    first_part = selector.split(",")[0]
    matches = [
        m for m in _BEM_ELEMENT_RE.finditer(first_part)
        if m.group(1).lower() == block_short_slug.lower()
    ]
    if not matches:
        return None
    return matches[-1].group(2)


def _custom_props_consumed(
    css_src: str,
    block_short_slug: str = "",
) -> tuple[
    dict[str, set[str]],
    dict[str, set[str]],
    dict[tuple[str, str], str],
    dict[tuple[str, str], str],
    dict[tuple[str, str], str],
]:
    """Map ``--sgs-var`` -> the set of props (real CSS OR another --sgs-* var) whose
    declared value consumes it, anywhere in the stylesheet (base + every @media tier —
    layer/tier distinction is not needed for Q2, only "what property, ultimately").

    Also returns:
      `gradient_props` — for each var, the subset of those props where the var's
        occurrence sits INSIDE a `linear-gradient()`/`radial-gradient()`/
        `conic-gradient()` call within that declaration's value — e.g.
        `background: linear-gradient(to right, var(--sgs-x) 50%, transparent)`. In
        that shape the var feeds a gradient colour-stop, not the plain fill colour,
        so the shorthand-normalisation step below must resolve `background` to
        `background-image`, never `background-color` (verified: `audio`,
        `brand-strip`, `media` blocks all use this shape for accent/track gradients).
      `shorthand_slot` — for each (var, prop) pair where prop is `border`/`outline`
        AND the declaration's value contains TWO OR MORE distinct --sgs-* vars, which
        SLOT that specific var occupies: 'width' for every var except the LAST one in
        the value, 'colour' for the last. Bug found + fixed 2026-07-21
        (sgs/card-grid `cardBorderWidth`/`cardBorderColour` BOTH resolving to
        'border-color', root-caused live at card-grid/style.css:37 —
        `border: var(--sgs-card-border-width, 0) solid var(--sgs-card-border-color,
        transparent);` — a MIXED shorthand where one var is genuinely the width slot
        and another is the colour slot; the earlier blanket "every var in a border/
        outline shorthand is colour-only" rule was true for every SINGLE-var
        occurrence checked but false here. Confirmed the codebase's own convention is
        width-first/colour-last in every mixed occurrence found (also
        `sgs/form`'s `formFocusRingWidth`+`formFocusRingColour` via
        `--sgs-focus-ring-width`+`--sgs-focus-ring-colour` in an `outline:` shorthand)
        — CSS's own canonical shorthand order is width/style/colour, and no
        counter-example exists in this codebase.
      `state_of` — for each (var, prop) pair, the manifest-vocabulary state the
        OWNING SELECTOR expresses (`_derive_state_from_selector`), or absent if the
        selector expresses no mapped state. Bug found + fixed 2026-07-21
        (sgs/hero `backgroundColourHover`/`borderColourHover` colliding with resting
        attrs on the same property purely because state was never captured — see the
        selector-context bug-family note above `_derive_state_from_selector`).
      `element_of` — for each (var, prop) pair, the BEM element name the OWNING
        SELECTOR expresses (`_derive_bem_element_from_selector`), gated to the
        SAME top-level-var-only rule as state (a var nested inside another var's
        fallback does not inherit the outer rule's element either — same
        `sgs/icon` nested-fallback reasoning as state). New 2026-07-21 (widen-
        css_element task) — this is what let sgs/hero mediaBackground resolve to
        the 'media' element and backgroundOverlayColour to 'overlay', proving they
        are NOT the same concept despite `hero/block.json:189`'s note (that note
        covers `mediaBackground` vs `mediaBackgroundColour` — BOTH targeting
        `.sgs-hero__media` — not this pair).
    """
    css_src = _strip_css_comments(css_src)
    out: dict[str, set[str]] = defaultdict(set)
    gradient_props: dict[str, set[str]] = defaultdict(set)
    shorthand_slot: dict[tuple[str, str], str] = {}
    state_of: dict[tuple[str, str], str] = {}
    element_of: dict[tuple[str, str], str] = {}
    for selector, body in _iter_rule_blocks(css_src):
        state = _derive_state_from_selector(selector)
        element = _derive_bem_element_from_selector(selector, block_short_slug) if block_short_slug else None
        for m in _DECL_RE.finditer(body):
            prop = m.group("prop").strip().lower()
            value = m.group("value")
            is_gradient_value = bool(_GRADIENT_FN_RE.search(value))
            var_occurrences = re.findall(CUSTOM_PROP_RE, value)
            distinct_vars_in_order = list(dict.fromkeys(var_occurrences))  # de-dup, keep first-seen order
            mixed_border_outline = (
                prop in ("border", "outline")
                and not is_gradient_value
                and len(distinct_vars_in_order) >= 2
            )
            top_level = _top_level_vars(value) if (state or element) else set()
            for var in var_occurrences:
                out[var].add(prop)
                if is_gradient_value:
                    gradient_props[var].add(prop)
                if mixed_border_outline:
                    is_last = var == distinct_vars_in_order[-1]
                    shorthand_slot[(var, prop)] = "colour" if is_last else "width"
                if state and var in top_level:
                    state_of[(var, prop)] = state
                if element and var in top_level:
                    element_of[(var, prop)] = element
    return out, gradient_props, shorthand_slot, state_of, element_of


def _normalise_shorthand(
    prop: str,
    var: str,
    gradient_props: dict[str, set[str]],
    shorthand_slot: "dict[tuple[str, str], str] | None" = None,
) -> str:
    """Resolve a shorthand property token (`background`/`border`/`outline`) to the
    longhand it actually sets, given the emission evidence gathered above. Non-shorthand
    tokens pass through unchanged. See `_SHORTHAND_COLOUR_LONGHAND` for the rationale,
    and `_custom_props_consumed`'s `shorthand_slot` docstring for the mixed-var case."""
    if prop == "background" and var in gradient_props and prop in gradient_props[var]:
        return "background-image"
    if shorthand_slot and prop in ("border", "outline"):
        slot = shorthand_slot.get((var, prop))
        if slot == "width":
            return f"{prop}-width"
    return _SHORTHAND_COLOUR_LONGHAND.get(prop, prop)


# Tier-suffix vocabulary read off this codebase's OWN emission convention, not
# invented: `includes/helpers-responsive.php` names its two override params
# `tablet_attr` / `mobile_attr` (base/desktop has no suffix — it's the unsuffixed
# `attr` param), and every chained --sgs-* custom-property name in this codebase
# follows the same base/-tablet/-mobile convention (e.g. --sgs-columns-desktop /
# --sgs-columns-tablet / --sgs-columns-mobile, cited in this module's own Task A
# docstring). "desktop" is accepted as an explicit suffix too, since some var names
# spell the base tier out rather than leaving it bare.
_TIER_SUFFIX_RE = re.compile(r"-(desktop|tablet|mobile)$")


def _resolve_var_chain(
    var: str,
    consumed: dict[str, set[str]],
    gradient_props: "dict[str, set[str]] | None" = None,
    shorthand_slot: "dict[tuple[str, str], str] | None" = None,
    state_of: "dict[tuple[str, str], str] | None" = None,
    element_of: "dict[tuple[str, str], str] | None" = None,
    depth: int = 0,
    visited: "set[str] | None" = None,
) -> tuple[set[str], set[str], set[str], set[str]]:
    """Follow a --sgs-* custom property through however many intermediate --sgs-*
    hand-offs it takes to reach real CSS declarations (REQUIREMENT 3: chained custom
    properties, e.g. --sgs-columns-desktop -> --sgs-columns -> grid-template-columns).

    Depth-capped at 5 and loop-guarded via a visited set — a var that resolves back to
    itself (directly or through a cycle) returns whatever real properties were already
    found on the way in, never hangs.

    Returns (real_props, visited_vars, states):
      `visited_vars` is the FULL set of --sgs-* custom-property names traversed to
        reach those real props, i.e. the emission-chain evidence a caller can scan
        for a tier suffix (FR: "tier from emission evidence, not name-parsing the
        attribute"). Shorthand tokens are normalised to their longhand at this point
        (`_normalise_shorthand`), so a caller never sees a bare
        `background`/`border`/`outline` token.
      `states` is the set of manifest-vocabulary state names (`state_of`, keyed by
        (var, prop) at the LEAF hop where a var directly feeds a real declaration —
        an intermediate --sgs-* hand-off carries no state of its own) collected while
        resolving this chain. Selector-context evidence, not name-parsing.
    """
    if gradient_props is None:
        gradient_props = {}
    if shorthand_slot is None:
        shorthand_slot = {}
    if state_of is None:
        state_of = {}
    if element_of is None:
        element_of = {}
    if visited is None:
        visited = set()
    if depth > 5 or var in visited:
        return set(), set(), set(), set()
    visited = visited | {var}

    direct = consumed.get(var, set())
    real: set[str] = set()
    states: set[str] = set()
    elements: set[str] = set()
    for p in direct:
        if p.startswith("--"):
            continue
        real.add(_normalise_shorthand(p, var, gradient_props, shorthand_slot))
        leaf_state = state_of.get((var, p))
        if leaf_state:
            states.add(leaf_state)
        leaf_element = element_of.get((var, p))
        if leaf_element:
            elements.add(leaf_element)
    chained_vars = {p for p in direct if p.startswith("--")}
    for cv in chained_vars:
        cv_real, cv_visited, cv_states, cv_elements = _resolve_var_chain(
            cv, consumed, gradient_props, shorthand_slot, state_of, element_of, depth + 1, visited
        )
        real |= cv_real
        visited |= cv_visited
        states |= cv_states
        elements |= cv_elements
    return real, visited, states, elements


def _derive_tier(
    attr_name: str,
    chain_vars: "set[str]",
    known_vars: "frozenset[str] | None" = None,
    block_attr_names: "set[str] | None" = None,
) -> "str | None":
    """Derive the responsive tier this attribute drives from EMISSION evidence — the
    --sgs-* custom-property chain it feeds — never by parsing the attribute's own name
    where that evidence is available (spec requirement). Returns 'desktop' / 'tablet' /
    'mobile' or None (genuinely no tier concept applies — not part of any responsive
    family at all).

    BUG FIXED 2026-07-21 (coordinator-verified live: sgs/trustpilot-reviews columns/
    columnsTablet/columnsMobile all read css_tier='mobile'; systematic — desktop=4 vs
    mobile=52/tablet=46 across the whole DB). Two DISTINCT defects, both fixed:
      (a) EXTRACTION bug in `_attr_to_raw_props_php` — a single sprintf()-style string
          fragment declaring multiple property tokens (one per tier) was pairing ALL
          subsequent positional var refs with the LAST token only, so the BASE attr's
          own token got silently swapped for the mobile attr's token before this
          function ever saw it. Fixed at the source (see that function's docstring) —
          this function now genuinely receives the base attr's OWN emitted var, not a
          descendant's.
      (b) This function ITSELF had no way to express "this IS the base tier" as a
          distinct, storable value — a base attr with no explicit suffix always fell
          through to None (NULL in the DB), which is indistinguishable from "not part
          of a responsive family at all" (e.g. a plain boolean toggle). Both cases
          rendered as NULL, so a base/tablet/mobile family's base member was
          invisible in any `GROUP BY css_tier` aggregate — exactly what the
          coordinator's sanity check caught. Fixed by detecting a genuine sibling
          family (below) and returning the explicit string 'desktop' for the base
          member, so base/tablet/mobile are three DISTINCT, equally-visible values.

    Precedence:
      1. Any var in the resolved chain carries an explicit tier suffix (-desktop/
         -tablet/-mobile) -> that tier. This is the strongest emission-evidence path.
      2. The var(s) in the resolved chain are UNSUFFIXED but a sibling tier-suffixed
         variant of the SAME base var name exists elsewhere in the stylesheet
         (`known_vars` — e.g. this attr's own var is `--sgs-tp-cols` and
         `--sgs-tp-cols-tablet` is declared/consumed somewhere in the same file) ->
         this IS the base/desktop member of a genuine responsive family -> 'desktop'.
         This is still emission evidence (the SIBLING'S emission site proves the
         family exists), applied to THIS attr's own token, not inherited from a
         descendant's chain.
      3. No --sgs-* hop exists at all (chain_vars empty — the attr feeds a real CSS
         property directly, Shape B/D):
         a. The attribute's OWN name ends in Tablet/Mobile/Desktop -> that tier
            (name-evidence fallback, used only when there is no --sgs-* chain).
         b. Otherwise, if `block_attr_names` shows a sibling `{attr}Tablet` or
            `{attr}Mobile` attribute declared on the SAME block -> this is the base
            member of a family expressed directly at the attribute level -> 'desktop'.
      4. Otherwise None — genuinely no responsive family involves this attribute.
    """
    for cv in chain_vars:
        m = _TIER_SUFFIX_RE.search(cv)
        if m:
            return m.group(1)
    if chain_vars and known_vars:
        for cv in chain_vars:
            if any(f"{cv}-{suffix}" in known_vars for suffix in ("desktop", "tablet", "mobile")):
                return "desktop"
    if not chain_vars:
        if re.search(r"Tablet$", attr_name):
            return "tablet"
        if re.search(r"Mobile$", attr_name):
            return "mobile"
        if re.search(r"Desktop$", attr_name):
            return "desktop"
        if block_attr_names and (
            f"{attr_name}Tablet" in block_attr_names or f"{attr_name}Mobile" in block_attr_names
        ):
            return "desktop"
    return None


def _build_php_var_attr_map(php_src: str) -> dict[str, str]:
    """Multi-hop PHP local-variable -> attribute-name resolution.

    The stock `_build_var_map` only matches a bare `$var = $attributes['x'];` — it misses
    the common wrapped forms (`isset()`, ternary, `(string)` cast) and misses a SECOND
    hop where one local variable is assigned from ANOTHER local variable that itself
    traces back to an attribute (REQUIREMENT: sgs/audio's `spectrumColour` chain —
    `$spectrum_raw` <- `$attributes['spectrumColour']` (wrapped in `isset()?:`), then
    `$spectrum_val` <- `$spectrum_raw` (wrapped in a ternary) — two hops, neither of
    which is a bare direct assignment).

    Builds a single-hop dependency graph (var -> {candidate attr names on its RHS},
    var -> {candidate other-var names on its RHS}) then resolves each var to its root
    attribute with the same depth-cap-5 / loop-guard discipline as `_resolve_var_chain`.
    Single-line assignments only (matches this codebase's one-statement-per-line style;
    a multi-line assignment RHS is a documented, reported limitation — see the report's
    "could not reach" section).
    """
    direct_attr: dict[str, set[str]] = defaultdict(set)
    direct_var: dict[str, set[str]] = defaultdict(set)

    # DOTALL so a genuine multi-line assignment RHS is captured too (the non-greedy
    # `.+?` still stops at the FIRST `;`, so this cannot over-match past one
    # statement even with DOTALL enabled).
    assign_re = re.compile(r"\$(\w+)\s*=\s*(.+?);", re.MULTILINE | re.DOTALL)
    for m in assign_re.finditer(php_src):
        var_name, rhs = m.group(1), m.group(2)
        # Bug found + fixed 2026-07-21 (sgs/separator::contentIconSize): a variable
        # built via `array( ... )` is an ACCUMULATOR that aggregates multiple
        # independent values ($icon_decls = array('--sgs-x:' . $icon_size . 'px')) —
        # it does NOT represent any single attribute's value, so it must never be
        # registered as a scalar pass-through alias. Left unguarded, the resolver
        # traced `$icon_decls` -> `$icon_size` -> `contentIconSize` from its FIRST
        # assignment, then every LATER unrelated push onto the same array variable
        # (`$icon_decls[] = 'color:' . $icon_colour`, a genuinely different
        # attribute) inherited that identity too, because var_attr is a flat
        # per-file dict keyed by variable name with no notion of "this array holds
        # more than one thing". Skipping `array(`-constructed RHS entirely is the
        # general fix — it applies to every block, not just separator.
        if re.match(r"^\s*array\s*\(", rhs, re.IGNORECASE):
            continue
        attrs_on_rhs = re.findall(r"\$(?:attributes|attrs)\[['\"](\w+)['\"]\]", rhs)
        if attrs_on_rhs:
            direct_attr[var_name].update(attrs_on_rhs)
        vars_on_rhs = [v for v in re.findall(r"\$(\w+)", rhs) if v != var_name]
        if vars_on_rhs:
            direct_var[var_name].update(vars_on_rhs)

    def resolve(var: str, depth: int = 0, visited: "set[str] | None" = None) -> "str | None":
        if visited is None:
            visited = set()
        if depth > 5 or var in visited:
            return None
        visited = visited | {var}
        if direct_attr.get(var):
            # First (leftmost-declared) candidate wins — deterministic, matches the
            # existing codebase convention of "first match wins" in db_lookup.py.
            return sorted(direct_attr[var])[0]
        for other in sorted(direct_var.get(var, ())):
            found = resolve(other, depth + 1, visited)
            if found:
                return found
        return None

    return {v: resolve(v) for v in set(direct_attr) | set(direct_var) if resolve(v)}


# ── Shape D: shared PHP style-emitter helpers ──────────────────────────────────
# A CLOSED, documented vocabulary of the two generic CSS-emitting helpers this codebase
# ships in plugins/sgs-blocks/includes/ (verified by reading both source files in full,
# 2026-07-21). Both take (attributes, prefix, selector) and build `{prefix}{Suffix}`
# attribute keys internally — the mapping below is read directly off their source, not
# guessed from names. This is the same "closed permitted constant" pattern already used
# elsewhere in this codebase (e.g. db_lookup._LAYER_PREFIXES, SKIP_TOP_LEVEL_TAGS).
#
#   sgs_button_element_style_css()  — includes/helpers-button-style.php:59-174
#   sgs_typography_css_rule()       — includes/helpers-typography.php:49-139
_HELPER_SUFFIX_PROPS: dict[str, dict[str, str]] = {
    "sgs_button_element_style_css": {
        "ColourBackground": "background-color",
        "ColourText": "color",
        "ColourBorder": "border-color",
        "ColourBackgroundHover": "background-color",
        "ColourTextHover": "color",
        "ColourBorderHover": "border-color",
        "BorderStyle": "border-style",
        "BorderWidth": "border-width",
        "BorderRadius": "border-radius",
        "FontWeight": "font-weight",
        "FontSize": "font-size",
        # Box-object standard (FR-31-22): a single {top,right,bottom,left} attr
        # shorthanded via sgs_box_object_shorthand() (helpers-button-style.php).
        "Padding": "padding",
        "WidthType": "width",
    },
    "sgs_typography_css_rule": {
        "FontSize": "font-size",
        "FontSizeTablet": "font-size",
        "FontSizeMobile": "font-size",
        "LineHeight": "line-height",
        "LineHeightTablet": "line-height",
        "LineHeightMobile": "line-height",
        "LetterSpacing": "letter-spacing",
        "LetterSpacingTablet": "letter-spacing",
        "LetterSpacingMobile": "letter-spacing",
        "FontWeight": "font-weight",
        "FontStyle": "font-style",
        "TextTransform": "text-transform",
        "TextDecoration": "text-decoration",
    },
}

_HELPER_CALL_RE = {
    helper: re.compile(
        re.escape(helper) + r"\(\s*\$\w+\s*,\s*'([^']*)'\s*,", re.DOTALL
    )
    for helper in _HELPER_SUFFIX_PROPS
}


def _attrs_from_helper_calls(
    php_src: str, attr_names: "set[str]"
) -> dict[str, set[str]]:
    """Shape D: find every call site of a known shared style-emitter helper with a
    LITERAL string prefix, and map each `{prefix}{Suffix}` attribute the helper reads
    to the real CSS property it emits. Only literal prefixes are resolved (the codebase
    exclusively uses literal prefixes at every call site checked — a variable prefix
    would be a documented, reported gap, not a silent guess)."""
    out: dict[str, set[str]] = defaultdict(set)
    for helper, suffix_map in _HELPER_SUFFIX_PROPS.items():
        for m in _HELPER_CALL_RE[helper].finditer(php_src):
            prefix = m.group(1)
            for suffix, prop in suffix_map.items():
                attr = prefix + suffix if prefix else (suffix[0].lower() + suffix[1:])
                if attr in attr_names:
                    out[attr].add(prop)
    return out


def _attr_to_raw_props_php(
    php_src: str,
    known_css_props: "frozenset[str]",
    var_attr: dict[str, str],
    block_short_slug: str = "",
) -> tuple[dict[str, set[str]], dict[str, str], dict[str, str]]:
    """Shapes A/B/C: map attrName -> the set of property tokens (real CSS OR --sgs-*
    custom property) it feeds directly in render.php.

      A) array map:      'attrName' => '--sgs-foo'
      B) direct concat:  '--sgs-foo:' . $attributes['attrName']   (custom prop)
                          'color:' . $attributes['attrName']       (REAL prop, direct —
                          REQUIREMENT: sgs/separator's contentIconColour, which is never
                          routed through a --sgs-* custom property at all)
      C) via variable:   $v = $attributes['attrName']; ... '--sgs-foo:' . esc_attr($v)
                          (custom prop OR real prop, via a possibly multi-hop $v)

    Also returns `attr_state`: attrName -> selector-context state (WORKSTREAM 2,
    2026-07-21). Some blocks build a CSS SELECTOR string directly in PHP rather than
    via style.css, e.g. sgs/adaptive-nav/render.php:258 —
      $css .= $root_sel . ' .sgs-adaptive-nav__link:hover,' . $root_sel
        . ' .sgs-adaptive-nav__link:focus-visible{color:var(--wp--preset--color--'
        . $link_hover . ');}';
    — invisible to `_custom_props_consumed` (which only reads style.css). Applying
    the SAME evidence rule here: `_derive_state_from_selector` runs against each
    string fragment's own text (which, unlike a stylesheet declaration, mixes the
    selector AND the property in one literal), tracked with the same reset-per-
    fragment discipline as `prop_queue` above — state comes from what the fragment's
    selector text expresses, never from the attribute name.

    Also returns `attr_element`: attrName -> BEM element name, same PHP-string
    mechanism, for the SAME reason `_custom_props_consumed`'s BEM-element detection
    (2026-07-21 widen-coverage task) needed the CSS-file path — sgs/hero's
    `mediaBackground`/`backgroundOverlayColour` build `.sgs-hero__media{...}`/
    `.sgs-hero__overlay{...}` as PHP string concatenation (render.php:554,843), never
    touching style.css, so the CSS-file BEM scan alone could not see them either.
    """
    attr_props: dict[str, set[str]] = defaultdict(set)
    attr_state: dict[str, str] = {}
    attr_element: dict[str, str] = {}

    # ---- shape A: 'attrName' => '--sgs-foo'
    for m in re.finditer(
        r"['\"](\w+)['\"]\s*=>\s*['\"](" + CUSTOM_PROP_RE + r")['\"]", php_src
    ):
        attr_props[m.group(1)].add(m.group(2))

    # ---- shapes B + C: POSITIONAL, statement-aware scan (rewritten 2026-07-21 —
    # the original per-PHYSICAL-LINE cross-product was WRONG whenever a single line
    # declares more than one custom property for more than one attribute, e.g.
    # sgs/audio/render.php:222:
    #   "{$root_sel}{--sgs-audio-accent:" . esc_attr($accent_val)
    #     . ';--sgs-audio-spectrum:' . esc_attr($spectrum_val) . ';}';
    # A whole-line cross-product paired BOTH $accent_val and $spectrum_val with BOTH
    # tokens, corrupting accentColour with spectrumColour's (JS-only, unresolvable)
    # property. Fix: walk each PHP STATEMENT's string/variable fragments IN THE ORDER
    # THEY APPEAR (finditer over an alternation, not two independent findall passes),
    # tracking "the most recently declared property token" and pairing it ONLY with
    # variable references that follow it — before the NEXT property-declaring string
    # fragment resets it. This also lifts the earlier documented "single-line
    # assignments only" limitation, since statements are extracted quote-aware and
    # `;`-delimited rather than physical-line-delimited (a statement may itself span
    # several source lines; PHP's own grammar unit is the statement, not the line).
    # Bug found + fixed 2026-07-21 (sgs/decorative-image::opacity): a tail-anchored
    # match (`...:$`, requiring the property token to be the LAST thing in the
    # string fragment) misses a declaration that continues with more literal text
    # after the colon inside the SAME string, e.g. render.php:144:
    #   'opacity:var(--sgs-di-op, ' . $opacity_css . ')'
    # "opacity:" sits mid-fragment (followed by "var(--sgs-di-op, "), so the tail
    # anchor found nothing and `current_prop` stayed on the PREVIOUS declaration
    # ('max-width', from the array element above) — silently misattributing the
    # opacity attribute's value to max-width. Fix: search for a property token
    # ANYWHERE in the fragment (not anchored to its end) and take the LAST match —
    # "most recent declaration wins" mirrors how left-to-right concatenation reads.
    # Bug found + fixed 2026-07-21 (sgs/trustpilot-reviews::columns/columnsTablet/
    # columnsMobile — reported live as a tier-mis-derivation, root-caused here): the
    # "last token wins for every subsequent var ref" rule above is WRONG when a SINGLE
    # string fragment declares MULTIPLE property tokens in a positional sprintf()
    # template, each meant for its own later positional arg —
    #   sprintf('--sgs-tp-cols:%d;--sgs-tp-cols-tablet:%d;--sgs-tp-cols-mobile:%d',
    #     max(1,$columns), max(1,$columns_tablet), max(1,$columns_mobile))
    # Taking candidates[-1] ('--sgs-tp-cols-mobile') and pairing it with ALL THREE
    # subsequent var refs collapsed $columns (the BASE/desktop attr) and
    # $columns_tablet onto the MOBILE custom property — so `columns`, a base attr with
    # NO tier, inherited css_tier='mobile' from a token it never actually feeds. Fix:
    # keep the FULL ordered list of property tokens found in a fragment as a
    # POSITIONAL QUEUE, and consume one token per subsequent var/attr reference in the
    # order they appear (matches sprintf's own positional-argument contract). A
    # fragment with exactly one token still behaves exactly as before (every
    # subsequent ref reuses that one token — the audio accent/spectrum case, and the
    # decorative-image opacity case, both still pass; queue length 1 always yields the
    # same index). When there are MORE refs than queued tokens, the queue index is
    # clamped to the last token (matches prior "keep reusing the most recent
    # declaration" semantics for that shape).
    # Bug found + fixed 2026-07-21 (sgs/media borderRadiusMobile/maxWidthMobile both
    # resolving to 'max-width' — root-caused via direct instrumentation): render.php
    # routinely embeds a LITERAL `@media(max-width:767px){` / `@media(max-width:1023px){`
    # breakpoint-wrapper string as plain PHP concatenation, e.g.
    #   $responsive_css .= '@media(max-width:767px){' . $radius_mob_out['css'] . '}';
    # The `@media(max-width:767px)` CONDITION happens to spell a real, recognised CSS
    # property name ("max-width") followed by a colon — indistinguishable from a genuine
    # declaration by the plain `word:` pattern below. So `$radius_mob_out` (a border-
    # radius value from `wp_style_engine_get_styles`) got attributed to the property
    # 'max-width' purely because it's textually positioned right after that media-query
    # wrapper text, not because it feeds max-width at all. Fix: strip any `@media(...)`
    # parenthesised condition out of a string fragment BEFORE scanning it for property
    # candidates — the breakpoint condition is never a real declaration.
    _MEDIA_COND_RE = re.compile(r"@media\s*\([^)]*\)", re.IGNORECASE)
    prop_any_re = re.compile(
        r"(" + CUSTOM_PROP_RE + r"|[a-z-]+)\s*:", re.IGNORECASE
    )
    fragment_re = re.compile(
        r"'([^']*)'|\"([^\"]*)\"|\$(?:attributes|attrs)\[['\"](\w+)['\"]\]|\$(\w+)"
    )
    for stmt in _split_php_statements(php_src):
        prop_queue: list[str] = []
        queue_index = 0
        current_state: "str | None" = None
        current_element: "str | None" = None
        for m in fragment_re.finditer(stmt):
            str_single, str_double, direct_attr, var_ref = m.groups()
            content = str_single if str_single is not None else str_double
            if content is not None:
                content_no_media_cond = _MEDIA_COND_RE.sub("", content)
                # Selector-context state — checked on EVERY string fragment, not just
                # ones carrying a property token. A concatenated selector is routinely
                # split across several fragments before its declaration ever appears,
                # e.g. adaptive-nav/render.php:258:
                #   $root_sel . ' .sgs-adaptive-nav__link:hover,' . $root_sel
                #     . ' .sgs-adaptive-nav__link:focus-visible{color:var(...)'
                # — ":hover" sits in an EARLIER fragment than "color:". Gating state
                # detection on "this fragment also has a property" (as first tried)
                # missed it entirely. `current_state` is STICKY within a statement —
                # a fragment expressing no mapped state does not clear a state an
                # earlier fragment in the SAME statement already established (matches
                # how PHP concatenation builds one selector piecemeal); it only
                # updates when a fragment DOES express a mapped state.
                found_state = _derive_state_from_selector(content_no_media_cond)
                if found_state:
                    current_state = found_state
                # Same sticky-within-statement rule for BEM element (2026-07-21).
                if block_short_slug:
                    found_element = _derive_bem_element_from_selector(content_no_media_cond, block_short_slug)
                    if found_element:
                        current_element = found_element
                candidates = [
                    tok for tok in prop_any_re.findall(content_no_media_cond)
                    if tok.startswith("--sgs-") or tok in known_css_props
                ]
                if candidates:
                    prop_queue = candidates
                    queue_index = 0
                continue
            if not prop_queue:
                continue
            current_prop = prop_queue[min(queue_index, len(prop_queue) - 1)]
            queue_index += 1
            if direct_attr:
                attr_props[direct_attr].add(current_prop)
                if current_state:
                    attr_state[direct_attr] = current_state
                if current_element:
                    attr_element[direct_attr] = current_element
            elif var_ref and var_ref in var_attr:
                attr_props[var_attr[var_ref]].add(current_prop)
                if current_state:
                    attr_state[var_attr[var_ref]] = current_state
                if current_element:
                    attr_element[var_attr[var_ref]] = current_element

    return attr_props, attr_state, attr_element


def _split_php_statements(php_src: str) -> list[str]:
    """Quote-aware split on top-level `;` — a PHP statement may span several
    physical source lines (e.g. a multi-line concatenation), and a `;` INSIDE a
    string literal (this codebase's CSS declarations routinely contain one, e.g.
    `';--sgs-focus-ring-offset:'`) must never be treated as a statement boundary."""
    stmts: list[str] = []
    buf: list[str] = []
    quote: "str | None" = None
    i = 0
    n = len(php_src)
    while i < n:
        ch = php_src[i]
        buf.append(ch)
        if quote:
            if ch == "\\" and i + 1 < n:
                buf.append(php_src[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
        else:
            if ch in ("'", '"'):
                quote = ch
            elif ch == ";":
                stmts.append("".join(buf))
                buf = []
        i += 1
    if buf:
        stmts.append("".join(buf))
    return stmts


# Arrangement CSS properties (display:grid/flex track + alignment definition). These
# are unambiguously the GRID (L3) layer regardless of block — a property whose only
# home is the element that lays out its children. Used by _classify_css_layer's
# FALLBACK below. Kept in sync with the shared wrapper's `grid` element attrMap
# (sgs/container block.json) — the canonical L3 vocabulary.
_ARRANGEMENT_PROPS = frozenset({
    "grid-template-columns", "grid-template-rows", "grid-auto-rows", "grid-auto-columns",
    "grid-auto-flow", "gap", "row-gap", "column-gap",
    "justify-items", "justify-content", "align-content", "align-items",
    "flex-direction", "flex-wrap",
})


def _classify_css_layer(
    attr_name: str, real_props: "set[str]", is_root_element: bool = True
) -> "str | None":
    """FALLBACK css_layer derivation — used ONLY when the block.json element manifest
    does not declare a `layer` for the element that owns this attr.

    The PRIMARY, authoritative css_layer source is the element manifest's own `layer`
    field (OUTER/CONTENT/GRID/GRID_AREA), read in `_load_element_manifest_reverse` and
    applied first in `extract_css_property_and_layer` (Bean, 2026-07-23). 22
    shared-wrapper blocks declare it; a leaf/content element declares none, which is the
    leaf guard (a leaf is not a container layer).

    Two fallback tiers, both PER-ATTR (not per-element) so they correctly split a
    "cluster" element such as product-card's `box`, which holds BOTH cardMaxWidth (OUTER)
    and innerPadding (CONTENT) under one manifest key:
      1. ARRANGEMENT css (grid/flex track + alignment) -> GRID (L3), unambiguous on any block.
      2. Block-private STRUCTURAL box css (Bean option 2, 2026-07-23) -> layer by
         css_property + name against the shared-wrapper reference vocabulary (sgs/container):
           * max-width / min-height / box-shadow -> OUTER (the block's own outer box, L1)
           * width + name starting "content"      -> CONTENT (content-width band, L2)
           * padding + name containing "inner"     -> CONTENT (inner-body padding, L2)
    The former name-prefix rules (`^content`->CONTENT, `^gridItem`->GRID) were REMOVED
    2026-07-23: `gridItem*` is L4 GRID_AREA not L3 GRID, and blanket `^content`->CONTENT
    mislabeled hero's GRID_AREA contentPadding. A LEAF sub-element attr (cta padding,
    title colour) matches none of these -> honest NULL = the leaf guard (a leaf is not a
    container layer). The 22 blocks that declare a manifest `layer` never reach this
    fallback (their layer is applied first, upstream).
    """
    if not real_props:
        return None
    if real_props & _ARRANGEMENT_PROPS:
        return "GRID"  # arrangement is unambiguously L3 wherever it sits
    # The box-model structural rules below are the block's OWN OUTER/CONTENT box, so
    # they apply ONLY to an attr on the block's ROOT element. A box property on a named
    # SUB-element (e.g. sgs/tabs `tab` indicator, whose underline delivers via an inset
    # box-shadow) is a leaf, not a container layer -> stays NULL (the leaf guard).
    if not is_root_element:
        return None
    if real_props & {"max-width", "min-height", "box-shadow"}:
        return "OUTER"
    if "width" in real_props and attr_name.startswith("content"):
        return "CONTENT"
    if "padding" in real_props and "inner" in attr_name.lower():
        return "CONTENT"
    return None


_CLUSTER_MEMBER_SETS_PATH = Path(__file__).resolve().parents[1] / "consistency" / "cluster-member-sets.json"


def _load_cluster_suffix_vocabulary() -> dict[str, list[str]]:
    """Load {cluster_name: [suffix, ...]} from the SAME `cluster-member-sets.json`
    truth file `check-element-manifest-conformance.js` itself reads (verified live —
    that script loads `consistency/cluster-member-sets.json` and its "text" cluster's
    member `suffixes` arrays are exactly FontSize/FontWeight/LineHeight/
    LetterSpacing/FontStyle/TextTransform/TextDecoration/Colour+TextColour+Color/
    TextAlign+Align/FontFamily). Reusing this file — not restating the vocabulary —
    is what lets the prefix-convention lookup below never drift from the real linter.
    """
    if not _CLUSTER_MEMBER_SETS_PATH.exists():
        return {}
    try:
        data = json.loads(_CLUSTER_MEMBER_SETS_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    clusters = data.get("clusters")
    if not isinstance(clusters, dict):
        return {}
    out: dict[str, list[str]] = {}
    for cluster_name, cluster_def in clusters.items():
        if not isinstance(cluster_def, dict):
            continue
        suffixes: list[str] = []
        for member in cluster_def.get("members") or []:
            if isinstance(member, dict):
                suffixes.extend(s for s in (member.get("suffixes") or []) if isinstance(s, str))
        if suffixes:
            out[cluster_name] = suffixes
    return out


_CLUSTER_SUFFIX_VOCAB = _load_cluster_suffix_vocabulary()


def _load_element_manifest_reverse(
    block_dir: Path, block_attr_names: "set[str] | None" = None
) -> dict[str, dict[str, "str | None"]]:
    """Read a block's own `block.json` `supports.sgs.elements` manifest (the SAME
    vocabulary `check-element-manifest-conformance.js` validates against — element /
    cluster / member / state) and build the reverse lookup
    attr_name -> {"css_element": <manifest element key>, "css_state": <state name or
    None>, "manifest_css_key": <the css:X property key, "css:" stripped>}.

    This is the spec-mandated element/state source — reusing the EXISTING manifest
    vocabulary rather than inventing a parallel one (the mistake that produced the
    tainted `role` column). Blocks with no manifest (most of the framework — only 67
    blocks have one as of 2026-07-21) contribute nothing here; their attrs keep
    css_element/css_state as an honest NULL rather than a guess.

    TWO sources of membership, BOTH already used by the real linter (2026-07-21 —
    this function only read the first before, which is why e.g. sgs/trust-bar's
    titleFontSize/labelFontSize kept colliding despite the manifest ALREADY declaring
    them correctly via the second):
      1. Explicit `attrMap` — a hand-declared `"css:X": "attrName"` entry.
      2. The DEFAULT PREFIX CONVENTION — `element.prefix` (or the element's own key
         if `prefix` is undefined; `prefix === ""` is a legitimate explicit opt-out,
         tested with `is not None`, never truthiness) concatenated with a declared
         cluster's member SUFFIX (from `cluster-member-sets.json`, reused not
         restated) forms a candidate attr name; if the block actually declares that
         attr, it belongs to this element. E.g. sgs/trust-bar's `title` element
         declares `"prefix": "title"` + `"clusters": ["text"]` — no attrMap needed at
         all for `titleFontSize`/`titleColour` to resolve via this convention, which
         is exactly what the REAL linter already does and this classifier did not.
    """
    bj_path = block_dir / "block.json"
    if not bj_path.exists():
        return {}
    try:
        data = json.loads(bj_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    elements = ((data.get("supports") or {}).get("sgs", {}) or {}).get("elements")
    if not isinstance(elements, dict):
        return {}

    out: dict[str, dict[str, "str | None"]] = {}
    for element_key, element_def in elements.items():
        if not isinstance(element_def, dict):
            continue
        # The element's own declared L1-L4 layer (OUTER/CONTENT/GRID/GRID_AREA), added
        # 2026-07-23 (Bean): the PRIMARY, authoritative css_layer source. An element
        # WITHOUT a `layer` field (a leaf/content element — cta, title, label,
        # decorative) yields None here, which is exactly the leaf guard — a leaf is not
        # a container layer and correctly contributes no css_layer. This value rides on
        # every attr the element claims (attrMap + prefix convention below).
        element_layer = element_def.get("layer")
        # Base (resting) attrMap — no state.
        for css_key, attr_name in (element_def.get("attrMap") or {}).items():
            if not isinstance(attr_name, str):
                continue
            out[attr_name] = {
                "css_element": element_key,
                "css_state": None,
                "css_layer": element_layer,
                "manifest_css_key": css_key[4:] if css_key.startswith("css:") else css_key,
                "source": "attrMap",
            }
        # Per-state attrMaps (e.g. states.selected.attrMap, states.hover.attrMap).
        for state_name, state_def in (element_def.get("states") or {}).items():
            if not isinstance(state_def, dict):
                continue
            for css_key, attr_name in (state_def.get("attrMap") or {}).items():
                if not isinstance(attr_name, str):
                    continue
                out[attr_name] = {
                    "css_element": element_key,
                    "css_state": state_name,
                    "css_layer": element_layer,
                    "manifest_css_key": css_key[4:] if css_key.startswith("css:") else css_key,
                    "source": "attrMap",
                }
        # Default prefix convention (see docstring point 2). `!== undefined` test,
        # not truthiness — an explicit empty-string prefix means "bare attrs, no
        # prefix" and is legitimate (matches the real linter's own rule), NOT "skip".
        # Tagged "source": "prefix" — a GENERIC heuristic guess, weaker evidence than
        # an explicit attrMap OR a direct BEM-selector observation (2026-07-21 bug
        # found live: hero's `media` element declares `prefix: "image"` + cluster
        # "layout" [covers "Padding"], so the convention claims `imagePadding`
        # belongs to `media` — but render.php:449 shows imagePadding ACTUALLY targets
        # `.sgs-hero__split-image`, a DIFFERENT element, when split layout is active.
        # The manifest's own convention is a stale/wrong assumption for this specific
        # attr; concrete BEM-selector evidence overrides it in the merge step below —
        # this function only TAGS the source, the precedence decision lives at the
        # call site so it stays visible/auditable rather than silently baked in here.
        prefix = element_def.get("prefix", element_key)
        if prefix is None:
            continue  # explicit null = opt-out (distinct from "" = bare-attrs)
        clusters = element_def.get("clusters") or []
        for cluster_name in clusters:
            for suffix in _CLUSTER_SUFFIX_VOCAB.get(cluster_name, []):
                base_candidate = prefix + suffix
                # Mirror check-element-manifest-conformance.js's own
                # RESPONSIVE_AND_STATE_SUFFIXES / baseAttrName() logic exactly (that
                # script's own comment: "an attribute in one of these families is
                # 'claimed' whenever its base form is claimed" — verified live,
                # 2026-07-21) — a tiered variant of an already-claimed base member
                # belongs to the SAME element. This is what closed sgs/trust-bar's
                # remaining titleFontSizeMobile/Tablet vs labelFontSizeMobile/Tablet
                # collisions: only the bare `titleFontSize` matched the cluster suffix
                # directly; the tiered forms needed this same suffix-stripping the
                # real linter already does.
                for candidate in (base_candidate, base_candidate + "Tablet", base_candidate + "Mobile", base_candidate + "Desktop"):
                    if block_attr_names is not None and candidate not in block_attr_names:
                        continue
                    if candidate in out:
                        continue  # an explicit attrMap/state entry already claimed it — wins
                    out[candidate] = {
                        "css_element": element_key,
                        "css_state": None,
                        "css_layer": element_layer,
                        "manifest_css_key": None,
                        "source": "prefix",
                    }
    return out


def _load_element_layers(block_dir: Path) -> dict[str, str]:
    """Read a block's `block.json` element manifest into {element_key: layer}
    (OUTER/CONTENT/GRID/GRID_AREA), 2026-07-23. This lets css_layer be keyed on the
    FINAL RESOLVED element (which may be a BEM-selector observation, e.g. hero's
    `mediaPadding`->`media`, that no attrMap/prefix entry claimed) rather than only on
    the claiming manifest_hit. An element with no `layer` field is omitted (the leaf
    guard). No `layer` declared anywhere -> {} (block-private; layer stays a fallback).
    """
    bj_path = block_dir / "block.json"
    if not bj_path.exists():
        return {}
    try:
        data = json.loads(bj_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    elements = ((data.get("supports") or {}).get("sgs", {}) or {}).get("elements")
    if not isinstance(elements, dict):
        return {}
    return {
        k: v["layer"]
        for k, v in elements.items()
        if isinstance(v, dict) and isinstance(v.get("layer"), str)
    }


def _load_root_element(block_dir: Path) -> "str | None":
    """The manifest element key marked `isWrapper: true` — the block's OWN root/outer
    element (2026-07-23). Used to gate the block-private structural css_layer fallback
    to the ROOT only: a box-shadow/max-width on the root is OUTER, but the SAME property
    on a named SUB-element (e.g. sgs/tabs `tab`, whose indicator underline delivers via
    an inset box-shadow) is NOT a container layer — it is a leaf, and must stay NULL
    (the leaf guard). Returns the first isWrapper key, or None if none is declared.
    """
    bj_path = block_dir / "block.json"
    if not bj_path.exists():
        return None
    try:
        data = json.loads(bj_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    elements = ((data.get("supports") or {}).get("sgs", {}) or {}).get("elements")
    if not isinstance(elements, dict):
        return None
    for k, v in elements.items():
        if isinstance(v, dict) and v.get("isWrapper") is True:
            return k
    return None


# Path for the DERIVED-LAYER data file this function now writes to, instead of a bare
# `UPDATE` (2026-07-21 architecture correction — see the module docstring: derived
# classifier output must land in its own generated file, which sgs-update-v2.py's
# Stage 1C reads as the BASE layer, with ATTR_CLASSIFICATION_OVERRIDES applied on top
# as the override layer that wins on any field conflict. This mirrors the existing
# box_family pattern in sgs-update-v2.py exactly — box_family already reads its
# declarative source [block.json] fresh every run rather than writing a bare UPDATE).
CSS_PROPERTY_CLASSIFICATIONS_PATH = Path(__file__).resolve().parent / "css-property-classifications.json"


def extract_css_property_and_layer() -> dict:
    """TASK A entry point. DERIVES `css_property` / `css_layer` / `css_element` /
    `css_state` / `css_tier` for every SGS block with both a render.php and a
    style.css, and writes them to `css-property-classifications.json` — the DERIVED
    LAYER data file `sgs-update-v2.py` Stage 1C reads as its base layer (applied
    before ATTR_CLASSIFICATION_OVERRIDES, which wins on any field conflict). Returns a
    stats dict used by the caller to build the verification report (Task C).

    css_layer (2026-07-23, Bean): PRIMARY source is now the block.json element
    manifest's own `layer` field (OUTER/CONTENT/GRID/GRID_AREA), read via
    `_load_element_manifest_reverse` and applied below — the declarative L1-L4 signal
    that already existed on 22 shared-wrapper blocks but was never read. The old
    name-prefix regex (`_classify_css_layer`) is now a narrow FALLBACK (arrangement->
    GRID only) for attrs whose owning element declares no layer. Routed through the
    same JSON channel Stage 1C applies.
    """
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    known_css_props = _load_known_css_props(conn)

    cur.execute(
        "SELECT block_slug, attr_name, role FROM block_attributes ORDER BY block_slug, attr_name"
    )
    all_rows = cur.fetchall()
    role_of = {(b, a): r for b, a, r in all_rows}
    attrs_by_block: dict[str, set[str]] = defaultdict(set)
    for b, a, _r in all_rows:
        attrs_by_block[b].add(a)

    # ---- Bean's ruling (2026-07-21, verbatim): "[unit attrs are] not a css property.
    # They're a measurement type." A unit attr does not DRIVE a css_property — it
    # modifies a COMPANION attr's value (px/em/rem/%/unitless). Same defect class as
    # sgs/tabs tabIndicatorColour -> box-shadow: accurate-but-unusable. Detect by
    # EVIDENCE, not by the attr name ending "Unit": the block's OWN declared
    # `default_value` is a literal drawn from CSS's small closed length/measurement
    # unit vocabulary (px/em/rem/%/vh/vw/ch/ex/pt/deg/ms/s/unitless — CSS grammar
    # itself, not a framework-specific hardcoded dict, same "grammar fact" standing
    # as `_SHORTHAND_COLOUR_LONGHAND` above). Confirmed empirically: every attr this
    # matches ALSO happens to end in "Unit" (verified via a live DB query, 2026-07-21
    # — ~55 attrs framework-wide), but the SIGNAL used here is the default value, an
    # independent piece of evidence from the block's own declaration, not the name.
    # NOTE: the empty string ("" = CSS unitless, a real member of the vocabulary for
    # `lineHeightUnit`-style attrs) was tried and REJECTED here after live measurement:
    # dozens of unrelated attrs (colours, enums, toggles — `justifyContent`,
    # `linkFontStyle`, `colourBackground`...) ALSO legitimately default to an empty
    # string for unrelated reasons ("no value chosen yet"), so "" is not a safe,
    # SPECIFIC signal — including it wiped css_property on 216 attrs, only a handful
    # of which were genuine unit attrs. Evidence-based detection is NOT feasible for
    # the unitless-default subset without also consulting the attribute's own name
    # (which the brief explicitly forbids as the detection signal) — so those stay
    # OUT of scope for this pass rather than either guessing or falling back to
    # name-parsing. Only the five NON-empty, unambiguous CSS unit tokens are used.
    _CSS_UNIT_TOKENS = frozenset({"px", "em", "rem", "%", "vh", "vw", "ch", "ex", "pt"})
    cur.execute("SELECT block_slug, attr_name, default_value, inspector_control_type FROM block_attributes")
    unit_attr_evidence: set[tuple[str, str]] = set()
    unit_attr_existing_control: dict[tuple[str, str], "str | None"] = {}
    for b, a, dv, ict in cur.fetchall():
        unit_attr_existing_control[(b, a)] = ict
        if dv is None:
            continue
        stripped = dv.strip().strip('"').strip("'")
        if stripped in _CSS_UNIT_TOKENS:
            unit_attr_evidence.add((b, a))

    resolved: dict[tuple[str, str], set[str]] = {}
    resolved_tier: dict[tuple[str, str], "str | None"] = {}
    resolved_state: dict[tuple[str, str], str] = {}
    resolved_bem_element: dict[tuple[str, str], str] = {}
    unit_attrs_excluded: set[tuple[str, str]] = set()
    unresolved_reasons: dict[tuple[str, str], str] = {}
    manifest_by_block: dict[str, dict[str, dict[str, "str | None"]]] = {}
    elem_layer_by_block: dict[str, dict[str, str]] = {}
    root_elem_by_block: dict[str, "str | None"] = {}

    cur.execute("SELECT slug FROM blocks WHERE slug LIKE 'sgs/%' ORDER BY slug")
    block_slugs = [r[0] for r in cur.fetchall()]

    for slug in block_slugs:
        short_slug = slug.replace("sgs/", "")
        block_dir = BLOCKS_DIR / short_slug
        php_path = block_dir / "render.php"
        css_path = block_dir / "style.css"
        if not php_path.exists() or not css_path.exists():
            continue

        php_src_raw = php_path.read_text(encoding="utf-8", errors="ignore")
        css_src_raw = css_path.read_text(encoding="utf-8", errors="ignore")
        php_src = _strip_php_comments(php_src_raw)

        consumed, gradient_props, shorthand_slot, state_of, element_of = _custom_props_consumed(css_src_raw, short_slug)
        var_attr = _build_php_var_attr_map(php_src)
        block_attr_names = attrs_by_block.get(slug, set())
        manifest_by_block[slug] = _load_element_manifest_reverse(block_dir, block_attr_names)
        elem_layer_by_block[slug] = _load_element_layers(block_dir)
        root_elem_by_block[slug] = _load_root_element(block_dir)

        raw, php_attr_state, php_attr_element = _attr_to_raw_props_php(php_src, known_css_props, var_attr, short_slug)
        helper = _attrs_from_helper_calls(php_src, block_attr_names)
        for attr, props in helper.items():
            raw[attr] = raw.get(attr, set()) | props

        for attr, tokens in raw.items():
            if attr not in block_attr_names:
                continue  # not a real DB attr for this block — ignore (avoids false hits)
            if (slug, attr) in unit_attr_evidence:
                # Bean's ruling: a unit attr is a measurement type, not a css_property
                # driver — never enters the resolved/css_property dataset at all.
                unit_attrs_excluded.add((slug, attr))
                continue
            real_props: set[str] = set()
            chain_vars: set[str] = set()
            attr_states: set[str] = set()
            attr_bem_elements: set[str] = set()
            for tok in tokens:
                if tok.startswith("--sgs-"):
                    tok_real, tok_chain, tok_states, tok_elements = _resolve_var_chain(
                        tok, consumed, gradient_props, shorthand_slot, state_of, element_of
                    )
                    real_props |= tok_real
                    chain_vars |= tok_chain
                    attr_states |= tok_states
                    attr_bem_elements |= tok_elements
                else:
                    real_props.add(_SHORTHAND_COLOUR_LONGHAND.get(tok, tok))  # shape B direct / shape D
            # PHP-embedded selector state (WORKSTREAM 2, 2026-07-21) — merge in
            # alongside the CSS-file-derived states above; same "unanimous or
            # unassigned" rule applies to the combined set.
            php_state = php_attr_state.get(attr)
            if php_state:
                attr_states.add(php_state)
            php_element = php_attr_element.get(attr)
            if php_element:
                attr_bem_elements.add(php_element)
            if real_props:
                resolved[(slug, attr)] = real_props
                resolved_tier[(slug, attr)] = _derive_tier(
                    attr, chain_vars,
                    known_vars=frozenset(consumed.keys()),
                    block_attr_names=block_attr_names,
                )
                # Selector-context state (2026-07-21) — only assign when every real
                # declaration this attr resolved to agreed on ONE state; a genuinely
                # mixed set (an attr feeding both a resting AND a hover declaration)
                # is honestly ambiguous and left unassigned rather than guessed.
                if len(attr_states) == 1:
                    resolved_state[(slug, attr)] = next(iter(attr_states))
                # Selector-context BEM element (2026-07-21 widen-coverage task) —
                # same unanimous-or-unassigned discipline as state.
                if len(attr_bem_elements) == 1:
                    resolved_bem_element[(slug, attr)] = next(iter(attr_bem_elements))
            else:
                chained_only = {t for t in tokens if t.startswith("--sgs-")}
                if chained_only:
                    unresolved_reasons[(slug, attr)] = (
                        "custom property "
                        + ",".join(sorted(chained_only))
                        + " never reaches a real CSS declaration within depth 5 "
                        "(stylesheet may only consume it via JS, e.g. getComputedStyle)"
                    )

    # ---- write the DERIVED LAYER to its JSON truth file (base layer; overrides win —
    # see CSS_PROPERTY_CLASSIFICATIONS_PATH docstring above). No bare DB UPDATE here.
    css_property_written = 0
    css_layer_written = 0
    classification_entries: list[dict] = []
    for (slug, attr), real_props in sorted(resolved.items()):
        css_property = ",".join(sorted(real_props))
        manifest_hit = manifest_by_block.get(slug, {}).get(attr)
        fields: dict[str, object] = {"css_property": css_property}
        css_property_written += 1
        tier = resolved_tier.get((slug, attr))
        if tier:
            fields["css_tier"] = tier
        # Element precedence (2026-07-21, refined after a live discrepancy found on
        # sgs/hero — see _load_element_manifest_reverse's "source": "prefix" note):
        #   1. Explicit manifest attrMap (a hand-curated, per-attr declaration) —
        #      strongest evidence, always wins.
        #   2. Direct BEM-selector observation (`resolved_bem_element` — the actual
        #      rendered selector the declaration sits under) — concrete evidence
        #      from the real markup.
        #   3. The generic prefix-convention guess — a heuristic that can be WRONG
        #      when a variant (e.g. hero's split layout) routes a prefixed attr onto
        #      a different element than its "home" element's convention assumes
        #      (imagePadding -> .sgs-hero__split-image, not .sgs-hero__media, despite
        #      the `media` element's `prefix: "image"` + "layout" cluster claiming
        #      it). BEM evidence overrides this guess when they disagree.
        bem_element = resolved_bem_element.get((slug, attr))
        if manifest_hit and manifest_hit.get("source") == "attrMap":
            element = manifest_hit["css_element"]
        elif bem_element:
            element = bem_element
        elif manifest_hit:
            element = manifest_hit["css_element"]
        else:
            element = None
        # css_layer (L1-L4) — computed AFTER element resolution so it keys on the FINAL
        # resolved element (Bean, 2026-07-23). Priority:
        #   1. the final element's own declared manifest `layer` — handles a BEM-resolved
        #      element that NO attrMap/prefix claimed (hero mediaPadding -> `media`,
        #      whose declared layer GRID_AREA the prefix path missed because media's
        #      prefix is `image`);
        #   2. else the claiming manifest_hit's layer — covers a prefix/attrMap element
        #      that differs from the final BEM element (hero imagePadding: claimed by
        #      media/prefix=GRID_AREA, final BEM element `split-image` carries no layer);
        #   3. else the arrangement->GRID fallback (_classify_css_layer).
        # A leaf/content element declares no layer -> None at every step = the leaf guard.
        root_key = root_elem_by_block.get(slug)
        is_root_element = (
            element in (None, "", "root", "self")
            or (root_key is not None and element == root_key)
        )
        css_layer = (
            elem_layer_by_block.get(slug, {}).get(element)
            or (manifest_hit or {}).get("css_layer")
            or _classify_css_layer(attr, real_props, is_root_element)
        )
        if css_layer:
            fields["css_layer"] = css_layer
            css_layer_written += 1
        # css_element — written AFTER the layer block so `element` stayed original for the
        # layer lookup above. Normalise the block's OWN isWrapper root element to a
        # canonical, self-documenting 'wrapper' (Bean 2026-07-23): box/card/grid/quote-box/
        # dialog/banner/… are arbitrary per-block labels for the SAME concept — the block's
        # structural wrapper. The css_layer disambiguates WHICH part (wrapper+OUTER = the
        # root box; wrapper+CONTENT = the inner band). Named SUB-elements (content/media/
        # title/label/…) keep their real name — P4 area routing + styling_content depend on
        # them. Resolution is unaffected: the base resolver keys on css_layer='OUTER'
        # (P3a union), NOT the element name (so 'wrapper' need not be a base-domain element).
        if element:
            fields["css_element"] = (
                "wrapper" if (root_key is not None and element == root_key) else element
            )
        # State: the manifest's own states.<name>.attrMap entry (if this attr is
        # explicitly declared there) is the most authoritative source — it is a
        # human-curated declaration, same standing as element. Selector-context
        # evidence (2026-07-21) is the fallback for the ~465 attrs on blocks with no
        # manifest coverage for this attr; it is still evidence, not name-parsing.
        state = (manifest_hit or {}).get("css_state") or resolved_state.get((slug, attr))
        if state:
            fields["css_state"] = state
        classification_entries.append({"slug": slug, "attr": attr, "fields": fields})

    # Unit attrs (Bean's ruling, 2026-07-21): NEVER enter css_property at all — no
    # entry means the merge/apply layer leaves that column NULL for them (and clears
    # any stale prior value, since the reseed-durable channel is authoritative).
    # Classify them via the EXISTING inspector_control_type mechanism instead (R-31-8
    # — enumerated the schema first: this column already carries a 'UnitControl'
    # value on sgs/hero.imageHeightUnit, proving it's the right existing channel, not
    # a new field). Gap-fill only — never overwrite a value Task B's own edit.js
    # evidence already set (e.g. leaves sgs/hero.imageWidthUnit's existing
    # 'SelectControl' untouched, since that's real evidence from a different source).
    unit_control_written = 0
    for slug, attr in sorted(unit_attrs_excluded):
        fields = {}
        if unit_attr_existing_control.get((slug, attr)) is None:
            fields["inspector_control_type"] = "UnitControl"
            unit_control_written += 1
        classification_entries.append({"slug": slug, "attr": attr, "fields": fields})

    CSS_PROPERTY_CLASSIFICATIONS_PATH.write_text(
        json.dumps(
            {
                "_doc": (
                    "css-property-classifications.json — the DERIVED LAYER (Task A "
                    "classifier output: css_property/css_layer/css_element/css_state/"
                    "css_tier) generated by extract-signatures.py. This is a REGENERATED "
                    "file, not hand-edited — re-run "
                    "`python plugins/sgs-blocks/scripts/behavioural-analyser/"
                    "extract-signatures.py` to refresh it. Applied by sgs-update-v2.py "
                    "Stage 1C as the BASE classification layer; "
                    "attr-classification-overrides.json is applied AFTER and wins on any "
                    "field conflict (2026-07-21 architecture, mirrors the existing "
                    "box_family declarative-source pattern)."
                ),
                "generated_by": "behavioural-analyser/extract-signatures.py::extract_css_property_and_layer",
                "entries": classification_entries,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    conn.commit()

    # ---- disagreement classification vs the name-derived `role` column
    def _coarse_bucket(css_prop: str) -> str:
        p = css_prop
        if "color" in p or "colour" in p:
            return "color"
        if p.startswith(("font", "line-height", "letter-spacing", "text-transform", "text-decoration", "text-align")):
            return "typography"
        if p.startswith(("margin", "padding", "width", "height", "max-", "min-", "gap", "border", "inset", "top", "left", "right", "bottom", "grid", "flex", "aspect")):
            return "layout"
        if p.startswith(("transition", "animation", "transform")):
            return "motion"
        if p.startswith(("box-shadow", "opacity", "filter", "background", "object-")):
            return "visual"
        return "other:" + p

    disagreements = []
    for (slug, attr), real_props in sorted(resolved.items()):
        role = role_of.get((slug, attr))
        if not role:
            continue
        buckets = {_coarse_bucket(p) for p in real_props}
        if role not in buckets:
            disagreements.append(
                {
                    "block": slug,
                    "attr": attr,
                    "role": role,
                    "css_property": sorted(real_props),
                }
            )

    conn.close()

    return {
        "resolved_count": len(resolved),
        "css_property_written": css_property_written,
        "css_layer_written": css_layer_written,
        "unit_attrs_excluded": len(unit_attrs_excluded),
        "unit_control_written": unit_control_written,
        "resolved": {f"{s}::{a}": sorted(p) for (s, a), p in resolved.items()},
        "unresolved_reasons": {f"{s}::{a}": r for (s, a), r in unresolved_reasons.items()},
        "disagreements": disagreements,
    }


########################################################################################
# TASK B — inspector_control_type from edit.js (Q1: "what kind of control edits this
# attribute?"). Associates a known WP/SGS control component with the attribute it edits
# by locating the attribute reference in the component's value=/checked=/onChange= props.
# Only writes when the association is UNAMBIGUOUS — leaves NULL rather than guessing.
########################################################################################

_KNOWN_CONTROLS = (
    "SelectControl", "TextControl", "ToggleControl", "RangeControl", "UnitControl",
    "NumberControl", "TextareaControl", "CheckboxControl", "RadioControl", "BoxControl",
    "DesignTokenPicker", "MediaUpload", "MediaPicker", "ResponsiveControl",
    "ToggleGroupControl", "Button",
)


def _strip_js_block_comments(src: str) -> str:
    """Strips /* */ block comments only. Line comments (//) are deliberately left
    intact — stripping them risks eating string literals such as 'https://...' with a
    simple regex, and in practice this codebase's control JSX never sits after a //."""
    return re.sub(r"/\*.*?\*/", " ", src, flags=re.S)


def _build_js_destructure_map(js_src: str) -> dict[str, str]:
    """Map a locally-destructured identifier -> the attribute name it was destructured
    from, e.g. `const { orientation, tabAlignment } = attributes;` -> both map to
    themselves. Handles the rename form `{ a: b }` (local var `b` <- attribute `a`)."""
    out: dict[str, str] = {}
    for m in re.finditer(r"\{([^{}]*)\}\s*=\s*(?:props\.)?attributes\b", js_src, re.S):
        body = m.group(1)
        for part in body.split(","):
            part = part.strip()
            if not part:
                continue
            part = re.split(r"=", part, maxsplit=1)[0].strip()  # drop default value
            if ":" in part:
                attr_key, local_name = (p.strip() for p in part.split(":", 1))
            else:
                attr_key = local_name = part
            local_name = local_name.rstrip("}").strip()
            if re.fullmatch(r"[A-Za-z_$][\w$]*", local_name):
                out[local_name] = attr_key
    return out


def _extract_balanced(src: str, start: int, open_ch: str, close_ch: str) -> "tuple[str, int] | None":
    """From `src[start]` == open_ch, return (inner_text, index_after_close)."""
    if start >= len(src) or src[start] != open_ch:
        return None
    depth = 0
    i = start
    while i < len(src):
        if src[i] == open_ch:
            depth += 1
        elif src[i] == close_ch:
            depth -= 1
            if depth == 0:
                return src[start + 1 : i], i + 1
        i += 1
    return None  # unbalanced — caller treats as "could not extract"


def _extract_jsx_tag(js_src: str, tag_start: int) -> "tuple[str, int] | None":
    """From the index of `<ComponentName`, scan forward tracking `{}` depth to find the
    end of the OPENING tag (`/>` or `>` at brace-depth 0). Returns (props_text, index
    after the tag)."""
    i = tag_start
    depth = 0
    while i < len(js_src):
        ch = js_src[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        elif depth == 0 and ch == "/" and js_src[i : i + 2] == "/>":
            return js_src[tag_start:i], i + 2
        elif depth == 0 and ch == ">":
            return js_src[tag_start:i], i + 1
        i += 1
    return None


def _attrs_referenced(text: str, destructure_map: dict[str, str], valid_attrs: "set[str]") -> "set[str]":
    """Every DB-valid attribute name referenced in a JS expression fragment, via either
    `attributes.X` / `attributes?.X` or a bare destructured identifier.

    Deliberately EXCLUDES a nested/indexed reference (`attributes.boxShadow.blur`,
    `attributes.boxShadow['blur']`) — a control editing a SUB-FIELD of a compound object
    attribute is not evidence for what type of control governs the flat top-level DB row
    (`boxShadow`) as a whole; treating it as such collided multiple distinct sub-field
    controls — RangeControl(blur), RangeControl(spread), ToggleControl(enabled),
    DesignTokenPicker(colour) — onto the single attribute `boxShadow`, manufacturing
    false "disagreements" (bug found + fixed 2026-07-21, sgs/button::boxShadow /
    boxShadowHover — 9 of the original 105 disagreement rows were this bug, not a real
    classification conflict).

    Also strips quoted string literals before the bare-identifier scan (2nd bug found +
    fixed 2026-07-21, sgs/product-card::description) — a control's own STRING-KEY
    argument (`isOn( 'description' )` / `toggle( 'description', on )`, an unrelated
    override-tracking helper on a DIFFERENT ToggleControl) was matched as if it were the
    bare destructured `description` identifier, because plain word-boundary regex is
    quote-blind. Left unstripped, "Override description" (a boolean toggle governing
    whether the description override is shown at all) collided onto the flat attribute
    `description` (a TextareaControl) purely because both happen to share the English
    word "description" as a token."""
    text = re.sub(r"'[^']*'|\"[^\"]*\"", " ", text)
    found: set[str] = set()
    for m in re.finditer(r"attributes\??\.(\w+)(?![.\[])", text):
        if m.group(1) in valid_attrs:
            found.add(m.group(1))
    for m in re.finditer(r"\b([A-Za-z_$][\w$]*)\b(?![.\[])", text):
        ident = m.group(1)
        attr = destructure_map.get(ident)
        if attr and attr in valid_attrs:
            found.add(attr)
    return found


def _attrs_from_onchange(text: str, valid_attrs: "set[str]") -> "set[str]":
    """`setAttributes( { xxxAttr: val, ... } )` — extract the object-literal keys (a
    non-nested capture; a genuinely nested onChange body is left unresolved rather than
    risking a wrong key)."""
    found: set[str] = set()
    for m in re.finditer(r"setAttributes\(\s*\{([^{}]*)\}", text):
        for key in re.findall(r"(\w+)\s*:", m.group(1)):
            if key in valid_attrs:
                found.add(key)
    return found


# DUAL_BOUND overrides — 2026-07-21, per the independent 2-audit review
# (.claude/reports/inspector-control-type-audit-2026-07-21.md, Finding 3). These 5
# attrs are edited by TWO different components in edit.js (a modern/fallback ternary,
# or two genuinely separate editing surfaces), so the main loop's "last tag wins"
# derivation is not reliable for them — it would self-conflict WITHIN one run
# depending on which JSX tag physically appears first in the file. Forced here as an
# explicit, audited final pass rather than hand-writing all 93 disagreements (the
# other 88 are DERIVED_CORRECT and the loop below gets them right unaided).
# inspector_control_type is the SIDEBAR/inspector control specifically — a canvas
# surface (e.g. `sgs/product-card::productName`'s on-canvas `RichText` heading) does
# NOT count for this column even though it also writes the attribute; `RichText`
# isn't in `_KNOWN_CONTROLS` at all, so the loop below never sees it as a candidate —
# only the genuine sidebar `TextControl` (edit.js:401-410, Advanced panel) can ever be
# derived for this attr, which is exactly the audit's verdict.
_DUAL_BOUND_INSPECTOR_CONTROL_OVERRIDES: dict[tuple[str, str], str] = {
    # NumberControl/TextControl fallback ternary (wp?.components?.__experimentalNumberControl
    # availability) — the modern control (NumberControl) is the client-facing answer;
    # TextControl[type=number] is only the old-WP fallback branch.
    ("sgs/filter-search", "attributeId"): "NumberControl",
    ("sgs/filter-search", "threshold"): "NumberControl",
    ("sgs/product-search", "maxResults"): "NumberControl",
    # SelectControl (preset ratio picker) / TextControl (custom-ratio override, only
    # rendered when isCustom) — SelectControl is the primary/default-path control.
    ("sgs/hero", "gridTemplateColumns"): "SelectControl",
    # Advanced-panel inspector TextControl vs on-canvas RichText — RichText is a
    # canvas surface, not an inspector control (see module comment above).
    ("sgs/product-card", "productName"): "TextControl",
}


def extract_inspector_control_types() -> dict:
    """TASK B entry point. Writes `block_attributes.inspector_control_type` for every
    unambiguous (component, attribute) association found in each block's edit.js.

    POLICY (flipped 2026-07-21, was report-only "never overwrite silently"): now
    OVERWRITES on disagreement. Justified by the independent 2-audit review
    (.claude/reports/inspector-control-type-audit-2026-07-21.md) — of 93 unique
    disagreement rows between the stored value and a fresh derivation, 88 were
    DERIVED_CORRECT (the stored value was a genuine data error — e.g. a colour attr
    stored as `SelectControl` when every colour control in this framework is
    `DesignTokenPicker`) and ZERO were STORED_CORRECT. No case existed where the
    original stored value was right and the derivation was wrong. The disagreements
    list is still returned/reported for visibility — only the WRITE behaviour changed
    from skip-and-report to apply-and-report.
    """
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    cur.execute(
        "SELECT block_slug, attr_name, inspector_control_type FROM block_attributes"
    )
    existing = {(b, a): v for b, a, v in cur.fetchall()}
    attrs_by_block: dict[str, set[str]] = defaultdict(set)
    for (b, a) in existing:
        attrs_by_block[b].add(a)

    cur.execute("SELECT slug FROM blocks WHERE slug LIKE 'sgs/%' ORDER BY slug")
    block_slugs = [r[0] for r in cur.fetchall()]

    tag_re = re.compile(r"<(" + "|".join(_KNOWN_CONTROLS) + r")\b")

    written = 0
    disagreements = []
    unresolved: list[dict] = []

    for slug in block_slugs:
        short_slug = slug.replace("sgs/", "")
        edit_path = BLOCKS_DIR / short_slug / "edit.js"
        if not edit_path.exists():
            continue
        js_src = _strip_js_block_comments(edit_path.read_text(encoding="utf-8", errors="ignore"))
        valid_attrs = attrs_by_block.get(slug, set())
        if not valid_attrs:
            continue
        destructure_map = _build_js_destructure_map(js_src)

        for m in tag_re.finditer(js_src):
            control = m.group(1)
            tag = _extract_jsx_tag(js_src, m.start())
            if tag is None:
                unresolved.append({"block": slug, "control": control, "reason": "unbalanced tag (could not extract props)"})
                continue
            props_text, _end = tag

            candidates: set[str] = set()
            for prop_name in ("value", "checked", "values"):
                pm = re.search(re.escape(prop_name) + r"\s*=\s*", props_text)
                if not pm:
                    continue
                after = props_text[pm.end():]
                if after[:1] == "{":
                    inner = _extract_balanced(after, 0, "{", "}")
                    frag = inner[0] if inner else ""
                else:
                    qm = re.match(r"['\"]([^'\"]*)['\"]", after)
                    frag = qm.group(1) if qm else ""
                candidates |= _attrs_referenced(frag, destructure_map, valid_attrs)

            oc = re.search(r"onChange\s*=\s*", props_text)
            if oc:
                after = props_text[oc.end():]
                if after[:1] == "{":
                    inner = _extract_balanced(after, 0, "{", "}")
                    frag = inner[0] if inner else ""
                    candidates |= _attrs_from_onchange(frag, valid_attrs)

            if len(candidates) == 0:
                unresolved.append({"block": slug, "control": control, "reason": "no attribute reference found in value/checked/onChange"})
                continue
            if len(candidates) > 1:
                unresolved.append({
                    "block": slug, "control": control,
                    "reason": f"ambiguous — multiple distinct attrs referenced in one control: {sorted(candidates)}",
                })
                continue

            attr = next(iter(candidates))
            if (slug, attr) in _DUAL_BOUND_INSPECTOR_CONTROL_OVERRIDES:
                # Handled entirely by the explicit override pass after this loop —
                # skip here so the loop's "whichever tag is encountered" order can
                # never self-conflict for these 5 known dual-write-site attrs.
                continue
            existing_val = existing.get((slug, attr))
            if existing_val and existing_val != control:
                disagreements.append({
                    "block": slug, "attr": attr,
                    "existing": existing_val, "derived": control,
                })
                # POLICY (2026-07-21): overwrite on disagreement — see this function's
                # docstring for the audit citation (88/93 DERIVED_CORRECT, 0
                # STORED_CORRECT). Falls through to the same write below.
            elif existing_val == control:
                continue  # already correct, no-op
            cur.execute(
                "UPDATE block_attributes SET inspector_control_type = ? "
                "WHERE block_slug = ? AND attr_name = ?",
                (control, slug, attr),
            )
            written += cur.rowcount
            existing[(slug, attr)] = control  # keep local cache consistent for this run

    # DUAL_BOUND final pass (see _DUAL_BOUND_INSPECTOR_CONTROL_OVERRIDES docstring) —
    # applied unconditionally, after the main loop, so these 5 always land on the
    # audited sidebar-control answer regardless of edit.js tag order.
    dual_bound_written = 0
    for (slug, attr), control in _DUAL_BOUND_INSPECTOR_CONTROL_OVERRIDES.items():
        if (slug, attr) not in existing:
            continue  # attr not on this block in the live DB — nothing to set
        if existing.get((slug, attr)) == control:
            continue  # already correct, no-op
        cur.execute(
            "UPDATE block_attributes SET inspector_control_type = ? "
            "WHERE block_slug = ? AND attr_name = ?",
            (control, slug, attr),
        )
        dual_bound_written += cur.rowcount

    conn.commit()
    conn.close()

    return {
        "written": written,
        "dual_bound_written": dual_bound_written,
        "disagreements": disagreements,
        "unresolved": unresolved,
    }


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    if not BLOCKS_DIR.exists():
        print(f"ERROR: Blocks directory not found at {BLOCKS_DIR}", file=sys.stderr)
        sys.exit(1)

    # --task-b-only: run ONLY the inspector_control_type seeder (2026-07-21) — this
    # is what sgs-update-v2.py's Stage 1 tail step calls, mirroring
    # _run_canonical_assignment/_run_composition_role_seed's subprocess pattern. Kept
    # separate from the full run (Task A signature extraction + css_property/layer)
    # so wiring this into every /sgs-update doesn't also re-run the heavier,
    # already-Stage-1C-driven css_property classifier on every reseed.
    if "--task-b-only" in sys.argv:
        stats = extract_inspector_control_types()
        print(f"[inspector-control-type] written={stats['written']} "
              f"dual_bound_written={stats['dual_bound_written']} "
              f"disagreements={len(stats['disagreements'])} "
              f"unresolved={len(stats['unresolved'])}")
        sys.exit(0)

    # --task-a-only: regenerate ONLY css-property-classifications.json (the derived
    # css_property/css_layer/css_element/css_state/css_tier base layer Stage 1C
    # applies) WITHOUT the heavier full signature extraction (2026-07-23). Symmetric
    # with --task-b-only. Use this to refresh the JSON after a block.json `layer` /
    # manifest change, then commit the JSON — the reseed-durable channel. JSON-only,
    # no DB mutation.
    if "--task-a-only" in sys.argv:
        task_a_stats = extract_css_property_and_layer()
        print(f"[task-a] css_property_written={task_a_stats['css_property_written']} "
              f"css_layer_written={task_a_stats['css_layer_written']} "
              f"resolved={task_a_stats['resolved_count']} "
              f"unresolved={len(task_a_stats['unresolved_reasons'])}")
        sys.exit(0)

    extract_all_signatures()

    print()
    print("=" * 60)
    print("TASK A — emission-derived css_property / css_layer")
    print("=" * 60)
    task_a_stats = extract_css_property_and_layer()
    print(f"  Attributes resolved to a real css_property : {task_a_stats['resolved_count']}")
    print(f"  css_property rows written                  : {task_a_stats['css_property_written']}")
    print(f"  css_layer rows written                     : {task_a_stats['css_layer_written']}")
    print(f"  Disagreements vs name-derived role          : {len(task_a_stats['disagreements'])}")
    print(f"  Unresolved (chain hit a JS-only sink etc.)  : {len(task_a_stats['unresolved_reasons'])}")
    if _UNMAPPED_STATE_SELECTORS_SEEN:
        print()
        print(f"  UNMAPPED STATE SELECTORS ({len(_UNMAPPED_STATE_SELECTORS_SEEN)}) — genuine state concepts")
        print("  with NO word in the element-manifest vocabulary (only 'hover'/'selected'")
        print("  exist today). Detected, NOT guessed a name for (Task 2 audit — report,")
        print("  don't invent):")
        for sel in sorted(_UNMAPPED_STATE_SELECTORS_SEEN):
            print(f"    - {sel}")

    print()
    print("=" * 60)
    print("TASK B — edit.js-derived inspector_control_type")
    print("=" * 60)
    task_b_stats = extract_inspector_control_types()
    print(f"  Rows written (unambiguous, previously NULL) : {task_b_stats['written']}")
    print(f"  Disagreements vs existing value              : {len(task_b_stats['disagreements'])}")
    print(f"  Unresolved (ambiguous / no reference found)  : {len(task_b_stats['unresolved'])}")

    # Dump full JSON for the report-writer to consume without re-running extraction.
    # REDIRECTED 2026-07-21 (Bean instruction): the old fixed filename
    # "emission-derived-classification-raw.json" is a PRIOR SESSION's cited evidence
    # artefact, not a regenerable output — this run must never overwrite it. Every
    # run now writes its own dated filename instead.
    from datetime import date as _date
    out_path = (
        REPO_ROOT / ".claude" / "reports"
        / f"emission-derived-classification-raw-{_date.today().isoformat()}.json"
    )
    out_path.write_text(
        json.dumps({"task_a": task_a_stats, "task_b": task_b_stats}, indent=2),
        encoding="utf-8",
    )
    print()
    print(f"Raw results written to {out_path}")
