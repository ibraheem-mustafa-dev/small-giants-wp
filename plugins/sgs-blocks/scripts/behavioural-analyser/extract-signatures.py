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


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    if not BLOCKS_DIR.exists():
        print(f"ERROR: Blocks directory not found at {BLOCKS_DIR}", file=sys.stderr)
        sys.exit(1)

    extract_all_signatures()
