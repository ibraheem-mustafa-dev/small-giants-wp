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


_LINK_TEMPLATE_PLACEHOLDER = "{value}"


def _detect_link_template(
    lines: list[str], attr_name: str, var_to_attr: dict[str, str]
) -> Optional[str]:
    """Recover the URL template a block assembles around a fragment attribute.

    THE SHAPE THIS CATCHES (sgs/whatsapp-cta, render.php:54-58):

        $clean_phone     = preg_replace( '/[^0-9]/', '', $phone_number );
        $wa_url          = 'https://wa.me/' . $clean_phone;
        $wa_url         .= '?text=' . $encoded_message;

    The operator supplies only the VARIABLE part; the block supplies the rest.
    Returned as e.g. ``https://wa.me/{value}`` — the literal, with the attribute's
    position marked.

    WHY THIS IS NEEDED AT ALL. Cloning a draft gives you the finished
    ``<a href>``. Without the template there is no way back to the fragment: the
    `link-href` role would write the whole assembled URL into an attribute the
    render then re-prefixes, producing `https://wa.me/https://wa.me/...`. The
    template is what makes the round trip reversible.

    WHY IT LIVES IN output_signature AND NOT A NEW COLUMN (Bean, 2026-08-05).
    `output_signature` is already the structured record of *what render.php does
    with the value*, and a URL template is exactly that. `default_value` is
    occupied and load-bearing (whatsapp-cta.message holds real default copy —
    overwriting it would corrupt the block). `description` is human prose, and
    parsing a machine contract out of prose is the wrong-document failure this
    programme exists to stop.

    Deliberately conservative: only a LITERAL string concatenated with a tracked
    variable counts. A template built from another variable is not guessed at —
    it returns None and the attribute stays unclaimed, which is honest.
    """
    # Variables carrying this attribute's value, including one hop of aliasing
    # (`$clean_phone = preg_replace(..., $phone_number)`), because the
    # concatenation is almost always applied to the sanitised alias rather than
    # the raw attribute.
    carriers = {v for v, a in var_to_attr.items() if a == attr_name}
    if not carriers:
        return None
    for _ in range(2):  # two passes = up to two hops; enough for every real case
        for line in lines:
            m = re.match(r"\s*\$([A-Za-z_]\w*)\s*=\s*(.+?);\s*$", line)
            if not m:
                continue
            target, expr = m.group(1), m.group(2)
            if target in carriers:
                continue
            if any(re.search(rf"\${re.escape(c)}\b", expr) for c in carriers):
                carriers.add(target)

    for line in lines:
        for carrier in carriers:
            # 'literal' . $carrier      → prefix template
            m = re.search(rf"(['\"])([^'\"]{{1,120}})\1\s*\.\s*\${re.escape(carrier)}\b", line)
            if m and ("://" in m.group(2) or m.group(2).startswith(("?", "&", "#", "/"))):
                return m.group(2) + _LINK_TEMPLATE_PLACEHOLDER
            # $carrier . 'literal'      → suffix template
            m = re.search(rf"\${re.escape(carrier)}\s*\.\s*(['\"])([^'\"]{{1,120}})\1", line)
            if m and ("://" in m.group(2) or m.group(2).startswith(("?", "&", "#", "/"))):
                return _LINK_TEMPLATE_PLACEHOLDER + m.group(2)
    return None


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

            # LINK TEMPLATE (2026-08-05). Recorded on the signature rather than in
            # a new column — output_signature already describes what render.php
            # does with the value, and a URL template is precisely that.
            if final_sig and php_lines:
                link_template = _detect_link_template(php_lines, attr_name, var_to_attr)
                if link_template:
                    final_sig["link_template"] = link_template

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
# the whole framework: 'hover' and 'current'. Only those two are mapped here.
# `[aria-selected="true"]` maps to 'current' — NOT CSS `:active` (tabActive* is a
# documented example of this: the manifest's own tabs.block.json note says
# tabActiveIndicatorColour "renders as [aria-selected='true']... NOT CSS :active").
# `:hover` maps to 'hover'. Other pseudo-classes/attribute-selectors that plainly
# express a state concept but have NO existing manifest word (`:focus`,
# `:focus-visible`, `:disabled`, `[aria-expanded="true"]`) are DETECTED but left
# unmapped (None) — recorded in `_UNMAPPED_STATE_SELECTORS` for the Task-2 audit
# rather than inventing new vocabulary unilaterally.
_STATE_SELECTOR_PATTERNS: tuple[tuple[str, str], ...] = (
    (r'aria-selected\s*=\s*["\']true["\']', "current"),
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
_BEM_CURRENT_MODIFIER_RE = re.compile(
    r"sgs-([a-z0-9-]+?)__([a-z0-9-]+)--current\b", re.IGNORECASE
)
_BEM_ANY_MODIFIER_RE = re.compile(
    r"sgs-([a-z0-9-]+?)__([a-z0-9-]+)--([a-z0-9-]+)", re.IGNORECASE
)


def _bem_modifier_siblings(css_src: str, block_short_slug: str) -> "dict[str, set[str]]":
    """For THIS block's own BEM elements, return element -> the set of every
    `--modifier` suffix (lowercased) seen anywhere in the stylesheet for that
    element, e.g. breadcrumbs -> {'item': {'current'}}, buybox ->
    {'price': {'current', 'regular', 'pct-off'}}. Feeds `_bem_current_state`'s
    state-vs-variant disambiguation (2026-08-15, Class 4 fix-of-the-fix) — see
    that function's docstring for why the sibling set is the signal.
    """
    out: "dict[str, set[str]]" = defaultdict(set)
    for m in _BEM_ANY_MODIFIER_RE.finditer(css_src):
        if m.group(1).lower() != block_short_slug.lower():
            continue
        out[m.group(2).lower()].add(m.group(3).lower())
    return out


def _bem_current_state(
    selector: str,
    block_short_slug: str,
    sibling_modifiers: "dict[str, set[str]]",
) -> "str | None":
    """A BEM `--current` modifier expresses the manifest 'current' state — ONLY when `current` is the SOLE modifier
    this stylesheet ever pairs with that element. Added 2026-08-15 as the fix for
    the regression the same day's Class 4 fix (bare `--modifier` stripped from
    the captured element) caused: `sgs/breadcrumbs.linkColour` and
    `.currentColour` both derived `css_element='item'` with no state, an
    identical-on-every-axis collision the column-first resolver can't route.

    PROVEN this element's `current` really is a state, not a label: breadcrumbs'
    `render.php:342` emits `aria-current="page"` on the exact markup
    `.sgs-breadcrumbs__item--current` renders; `sgs/card-grid`/`sgs/post-grid`
    literally group `.page-btn--current` with `.page-btn[aria-current="page"]`
    in the SAME selector; `sgs/post-grid`'s `view.js:208` toggles the class from
    an `isActive` boolean. All three: `item`/`page-btn` carries NO modifier other
    than `current` anywhere in that block's stylesheet.

    PROVEN the opposite for two other live blocks — `current` there is a VALUE
    VARIANT, not a state, and must NOT collect 'current': `sgs/buybox`'s
    `.buybox__price--current` sits alongside `.buybox__price--regular` and
    `.buybox__price--pct-off` (the live selling price vs the struck-through
    original — a display choice, never an interaction/selection state), and
    `sgs/product-card` has the identical `.price--current` / `.price--regular`
    pair. Tagging either as `css_state='current'` would fabricate a selection
    concept on a plain price display.

    So the rule is the SIBLING-MODIFIER SET for that element across the whole
    stylesheet, not the word "current" alone: a lone `current` -> state
    'current'; `current` plus any other modifier on the same element -> left
    unmapped (falls through exactly as before this fix — base element only, no
    state — the correct behaviour for a variant). Universal (R-31-9): every
    block with this shape is classified by the same rule, no per-block carve-out.
    """
    for m in _BEM_CURRENT_MODIFIER_RE.finditer(selector):
        if m.group(1).lower() != block_short_slug.lower():
            continue
        element = m.group(2).lower()
        siblings = sibling_modifiers.get(element, set())
        if siblings <= {"current"}:
            return "current"
    return None


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

    A BEM MODIFIER is never an ELEMENT (2026-08-15, Class 4 fix) — `__el--modifier`
    names a variant of `el`, not a new element, and this codebase's own convention
    always separates them with a double hyphen (`.sgs-breadcrumbs__item--current`,
    `.sgs-card-grid--overlay-slide`, `.sgs-product-card__cta--primary`), never
    reusing `--` inside a bare element/modifier name (those use a SINGLE hyphen:
    `card-tile`, `card-title`, `image-badge`). So the captured element run is cut
    at its first `--`, which fixes the exact live regression this fix surfaced:
    `_BEM_ELEMENT_RE`'s greedy `[a-z0-9-]+` swallowed `cta--primary` whole for
    `sgs/product-card`'s `ctaFontSize`/`ctaBorderStyle`/etc (fed by the Class 2
    Shape D fix's new selector-arg evidence, `.sgs-product-card__cta--primary`) —
    proven live before this line existed: it returned `element='cta--primary'`,
    which would have OUTRANKED the clean prefix-convention element `cta` for every
    attr not covered by an explicit attrMap entry. Confirmed no `block_attributes`
    consumer (`converter/db/db_lookup.py`) ever expects a compound `el--modifier`
    value — every declared manifest element key in every block.json is a bare
    name — so the base element is the correct value to store, not a raw truncation
    the audit detector would then need to strip again downstream.
    """
    first_part = selector.split(",")[0]
    matches = [
        m for m in _BEM_ELEMENT_RE.finditer(first_part)
        if m.group(1).lower() == block_short_slug.lower()
    ]
    if not matches:
        return None
    element = matches[-1].group(2)
    return element.split("--", 1)[0]


def _custom_props_consumed(
    css_src: str,
    block_short_slug: str = "",
) -> tuple[
    dict[str, set[str]],
    dict[str, set[str]],
    dict[tuple[str, str], str],
    dict[tuple[str, str], str],
    dict[tuple[str, str], "set[str]"],
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
      `element_of` — for each (var, prop) pair, the SET of BEM element names any
        OWNING SELECTOR expresses (`_derive_bem_element_from_selector`), gated to the
        SAME top-level-var-only rule as state (a var nested inside another var's
        fallback does not inherit the outer rule's element either — same
        `sgs/icon` nested-fallback reasoning as state). New 2026-07-21 (widen-
        css_element task) — this is what let sgs/hero mediaBackground resolve to
        the 'media' element and backgroundOverlayColour to 'overlay', proving they
        are NOT the same concept despite `hero/block.json:189`'s note (that note
        covers `mediaBackground` vs `mediaBackgroundColour` — BOTH targeting
        `.sgs-hero__media` — not this pair).

        SET-valued, not scalar (fixed 2026-08-05, Defect 1 — non-deterministic
        sgs/google-reviews `starColour` css_element): the same (var, prop) pair can
        legitimately be fed by TWO DIFFERENT selectors targeting TWO DIFFERENT BEM
        elements — e.g. google-reviews' `--sgs-gr-star-colour` feeds
        `background-color` from BOTH `.sgs-google-reviews__breakdown-fill{...}`
        (style.css:120, resting) AND `.sgs-google-reviews__dot.is-active::before{...}`
        (style.css:579, active state). A scalar `dict[(var, prop)] = element`
        silently OVERWRITES the first candidate with whichever selector occurs LAST
        in the stylesheet — an undocumented "last selector in the file wins"
        tie-break, never a stated rule, that fed the "unanimous or unassigned" check
        below a pre-collapsed single-candidate evidence set instead of the true
        multi-candidate set, so the check could never catch the ambiguity it exists
        to catch. Collecting a SET here lets that unanimity check see the REAL
        evidence and correctly decline to guess (mirrors `sgs/trust-bar`'s
        `icon-badge` element, which sidesteps this ambiguity entirely via an
        explicit manifest `attrMap` declaration — not available here because
        `starColour` is deliberately UNDECLARED in google-reviews' element manifest,
        block.json:48, as a variant/preset selector rather than a style-cluster
        member).
    """
    css_src = _strip_css_comments(css_src)
    out: dict[str, set[str]] = defaultdict(set)
    gradient_props: dict[str, set[str]] = defaultdict(set)
    shorthand_slot: dict[tuple[str, str], str] = {}
    state_of: dict[tuple[str, str], str] = {}
    element_of: dict[tuple[str, str], "set[str]"] = defaultdict(set)
    sibling_modifiers = _bem_modifier_siblings(css_src, block_short_slug) if block_short_slug else {}
    for selector, body in _iter_rule_blocks(css_src):
        state = _derive_state_from_selector(selector)
        if state is None and block_short_slug:
            state = _bem_current_state(selector, block_short_slug, sibling_modifiers)
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
                    element_of[(var, prop)].add(element)
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
# Tier precedence for _derive_tier when a chain touches MORE THAN ONE tier var.
# Desktop first: it is the base member of a responsive family (see _derive_tier).
_TIER_PRECEDENCE = {"desktop": 0, "tablet": 1, "mobile": 2}


def _resolve_var_chain(
    var: str,
    consumed: dict[str, set[str]],
    gradient_props: "dict[str, set[str]] | None" = None,
    shorthand_slot: "dict[tuple[str, str], str] | None" = None,
    state_of: "dict[tuple[str, str], str] | None" = None,
    element_of: "dict[tuple[str, str], set[str]] | None" = None,
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
        leaf_elements = element_of.get((var, p))
        if leaf_elements:
            elements |= leaf_elements
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
    # DETERMINISM (2026-08-22). `chain_vars` is a SET, and Python salts string hashing
    # per process, so set-iteration order differs between runs. The old code did
    # `for cv in chain_vars: ... return` — first match wins — so an attr whose chain
    # legitimately touches SEVERAL tier vars (every `columns` attr does: it feeds
    # --…-desktop, --…-tablet and --…-mobile) resolved to a DIFFERENT tier depending on
    # which var the set happened to yield first. Two runs on an unchanged tree flipped
    # sgs/card-grid, sgs/gallery and sgs/post-grid, in opposite directions, three
    # separate sessions running (D742 + the colour-golden track + 2026-08-22), each
    # reverting the diff by hand without the cause ever being found.
    #
    # Fixed by collecting ALL tier hits over a SORTED iteration and picking by explicit
    # precedence rather than by whichever arrived first. Desktop wins because it is the
    # BASE member of a responsive family — the same answer precedence rule 2 below
    # already returns for an unsuffixed base var whose tier siblings exist.
    # Single-suffix chains (the overwhelming majority) are unaffected: one hit, one
    # answer, identical to before.
    tier_hits = [
        m.group(1)
        for cv in sorted(chain_vars)
        if (m := _TIER_SUFFIX_RE.search(cv))
    ]
    if tier_hits:
        return min(tier_hits, key=lambda t: _TIER_PRECEDENCE.get(t, 99))
    if chain_vars and known_vars:
        for cv in sorted(chain_vars):
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
    helper: re.compile(re.escape(helper) + r"\s*\(")
    for helper in _HELPER_SUFFIX_PROPS
}


def _split_balanced_call_args(php_src: str, call_open_paren_end: int) -> "list[str] | None":
    """From the position just AFTER a call's opening `(`, walk to the matching
    closing `)` and return the top-level argument fragments as raw text — a comma
    inside a quoted string (PHP allows a CSS selector GROUP like
    `'.a, .b'` as one string literal) or inside a nested `(...)` is NOT a split
    point. Returns None if the call is unterminated within the source (malformed
    input, never guessed at).

    Both known helpers (`sgs_typography_css_rule`, `sgs_button_element_style_css`)
    take exactly 3 positional args — `($attrs, $prefix, $selector)` — so this
    generic PHP-argument splitter (not a helper-specific regex) is reusable for
    any future helper with the same call shape.
    """
    depth = 1
    i = call_open_paren_end
    n = len(php_src)
    args: list[str] = []
    current: list[str] = []
    quote: "str | None" = None
    while i < n and depth > 0:
        ch = php_src[i]
        if quote:
            current.append(ch)
            if ch == "\\" and i + 1 < n:
                current.append(php_src[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in ("'", '"'):
            quote = ch
            current.append(ch)
            i += 1
            continue
        if ch == "(":
            depth += 1
            current.append(ch)
            i += 1
            continue
        if ch == ")":
            depth -= 1
            if depth == 0:
                args.append("".join(current))
                return args
            current.append(ch)
            i += 1
            continue
        if ch == "," and depth == 1:
            args.append("".join(current))
            current = []
            i += 1
            continue
        current.append(ch)
        i += 1
    return None  # unterminated call — malformed input, not a silent guess


def _attrs_from_helper_calls(
    php_src: str, attr_names: "set[str]", block_short_slug: str = ""
) -> "tuple[dict[str, set[str]], dict[str, set[str]]]":
    """Shape D: find every call site of a known shared style-emitter helper with a
    LITERAL string prefix, and map each `{prefix}{Suffix}` attribute the helper reads
    to the real CSS property it emits. Only literal prefixes are resolved (the codebase
    exclusively uses literal prefixes at every call site checked — a variable prefix
    would be a documented, reported gap, not a silent guess).

    Also returns `elements`: attr -> SET of BEM element names found in the call's
    THIRD argument (the selector the helper scopes its `<style>` rule to), reusing
    `_derive_bem_element_from_selector` on that argument's raw text — a literal
    concatenation like `'.' . $uid . ' .sgs-card-grid__title'` still contains the
    real `sgs-card-grid__title` substring the regex matches, dots and quotes
    notwithstanding (2026-08-15, Class 2 fix — closes the exact gap that made
    sgs/card-grid titleFontSize/subtitleFontSize resolve to the manifest's own
    element KEY `card-title`/`card-subtitle` instead of the real BEM element
    `title`/`subtitle`: this Shape D path fed `_attrs_from_helper_calls` REAL
    css_property evidence but never fed ANY css_element evidence at all, so
    precedence fell all the way through BEM-observation to the weak prefix-
    convention guess — the CSS/PHP-string paths [`_custom_props_consumed`,
    `_attr_to_raw_props_php`] never had this gap, which is why
    sgs/breadcrumbs.linkColour already correctly resolves to 'item' via direct
    PHP-string concatenation. A selector arg that is a bare `$variable` (most
    other call sites — counter/icon-list/option-picker/trust-bar/whatsapp-cta) is
    now resolved via `_build_php_selector_var_map` (Cause B, root-cause report
    2026-08-27) WHEN that variable was assigned a literal BEM-bearing selector
    in an earlier statement — e.g. sgs/nav-menu/render.php:829/833:
      `$link_sel = $uid_sel . ' .sgs-nav-menu__link';`
      `$css .= sgs_typography_css_rule( $attributes, 'item', $link_sel );`
    This is the SAME general "trace any selector variable" mechanism Cause B
    built for the Shapes A/B/C path (`_attr_to_raw_props_php`) — it was never
    wired into THIS path, so an already-allowlisted helper call
    (`sgs_typography_css_rule`, in `_HELPER_SUFFIX_PROPS` since before Cause
    A/B) using a selector variable still fell through to no element evidence —
    the exact gap this fix closes: sgs/nav-menu's `itemFontSize`, applied via
    the same `$link_sel` as `itemBg`/`itemColour`/`itemRadius`, kept resolving
    to `css_element='item'` after those three flipped to `'link'`. A selector
    variable with no BEM substring in its own assignment (Cause C, root-scoped)
    still correctly yields no element evidence — an honest gap, not a guess.
    """
    props: dict[str, set[str]] = defaultdict(set)
    elements: dict[str, set[str]] = defaultdict(set)
    selector_var_element: "dict[str, str]" = (
        _build_php_selector_var_map(php_src, block_short_slug)[0]
        if block_short_slug
        else {}
    )
    for helper, suffix_map in _HELPER_SUFFIX_PROPS.items():
        for m in _HELPER_CALL_RE[helper].finditer(php_src):
            call_args = _split_balanced_call_args(php_src, m.end())
            if not call_args or len(call_args) < 3:
                continue
            prefix_arg = call_args[1].strip()
            prefix_m = re.match(r"^'([^']*)'$", prefix_arg)
            if not prefix_m:
                continue  # non-literal prefix — documented gap, never guessed
            prefix = prefix_m.group(1)
            selector_arg = call_args[2]
            bem_element = (
                _derive_bem_element_from_selector(selector_arg, block_short_slug)
                if block_short_slug
                else None
            )
            if not bem_element:
                var_m = re.match(r"^\s*\$(\w+)\s*$", selector_arg)
                if var_m:
                    bem_element = selector_var_element.get(var_m.group(1))
            for suffix, prop in suffix_map.items():
                attr = prefix + suffix if prefix else (suffix[0].lower() + suffix[1:])
                if attr in attr_names:
                    props[attr].add(prop)
                    if bem_element:
                        elements[attr].add(bem_element)
    return props, elements


# ── Shape D2: the state-colour helper (Cause A, root-cause report 2026-08-27) ──
# `sgs_emit_state_colour_css( $selector, $decls_normal, $decls_hover )`
# (includes/helpers-tokens.php:1275) is used by ~21 files but was never
# registered in `_HELPER_SUFFIX_PROPS` above — its signature has no attribute-
# suffix map at all, so it needed its own parsing shape rather than a dict entry.
_STATE_COLOUR_HELPER_CALL_RE = re.compile(r"sgs_emit_state_colour_css\s*\(")


def _attrs_from_state_colour_helper_calls(
    php_src: str,
    attr_names: "set[str]",
    block_short_slug: str,
    var_attr: "dict[str, str]",
) -> "dict[str, set[str]]":
    """Shape D2 (Cause A): `sgs_emit_state_colour_css($selector, $decls_normal,
    $decls_hover)` paints its declarations on a real BEM selector (its 1st arg),
    but that selector never reaches the attribute whose value feeds the decls
    array — the array is BUILT in one statement (e.g. card-grid/render.php:270-271
    `$card_grid_hover_decls[] = 'color:' . sgs_colour_value( $hover_text );`) and
    CONSUMED by the helper call in a separate, later statement (render.php:277-281).
    css_property for that attr is already resolved elsewhere (Shapes B/C, on the
    array-building statement itself); this fills in the missing css_element.

    Two-pass, evidence-only (mirrors Shape D's "only literal prefixes resolved,
    never guessed" discipline):

    1. Walk every `$arrVar[] = ...;` push statement, and resolve every attribute
       feeding it — either a direct `$attributes['x']` read, or a local variable
       already resolved by `_build_php_var_attr_map` (the SAME `var_attr` map the
       rest of this module uses) — giving {array-var-name -> set of attrs}.
    2. Walk every `sgs_emit_state_colour_css(...)` call site, derive the BEM
       element from the LITERAL selector text of its 1st arg (reusing
       `_derive_bem_element_from_selector`, the same evidence Shape D already
       reads off a helper's selector argument), and apply that element to every
       attr feeding the 2nd/3rd-arg decls array — ONLY when that arg is a bare
       `$variable` reference (a literal `array()` with no element evidence, or
       any other expression shape, is refused rather than guessed).

    A call whose selector reduces to a bare root variable (`$root_sel`, no
    `sgs-{slug}__` substring — e.g. sgs/testimonial's `quoteColourHover` call)
    correctly yields NO element here: that is Cause C (root-scoped, no BEM
    element), explicitly out of scope for this fix. `_derive_bem_element_from_
    selector` already returns None for it — Causes A and C are told apart by
    this evidence, never by helper name or attr name pattern (the root-cause
    report's Q3 explicitly warns the helper's use does not predict A vs C; each
    call site must be read on its own selector text).
    """
    elements: "dict[str, set[str]]" = defaultdict(set)
    if not block_short_slug:
        return elements

    # Module-wide `finditer`, NOT per-`_split_php_statements`-chunk-anchored — this
    # codebase's real push shape is routinely `if ( $x ) { $arr[] = ...; }`
    # (card-grid/render.php:263-274), and `_split_php_statements` splits ONLY on
    # top-level `;`, so an unterminated `if ( ... ) {` merges into the SAME
    # statement chunk as the push that follows it — an anchor at that chunk's
    # start would land on "if (" text, not "$arr[]", and never match. Mirrors
    # `_build_php_var_attr_map`'s own `assign_re` precedent (finditer over the
    # whole file, non-greedy up to the first `;`) for the identical reason.
    array_push_attrs: "dict[str, set[str]]" = defaultdict(set)
    push_re = re.compile(r"\$(\w+)\[\]\s*=\s*(.+?);", re.DOTALL)
    for m in push_re.finditer(php_src):
        arr_var, rhs = m.group(1), m.group(2)
        for a in re.findall(r"\$(?:attributes|attrs)\[['\"](\w+)['\"]\]", rhs):
            array_push_attrs[arr_var].add(a)
        for v in re.findall(r"\$(\w+)", rhs):
            if v == arr_var:
                continue
            mapped = var_attr.get(v)
            if mapped:
                array_push_attrs[arr_var].add(mapped)

    for m in _STATE_COLOUR_HELPER_CALL_RE.finditer(php_src):
        call_args = _split_balanced_call_args(php_src, m.end())
        if not call_args or len(call_args) != 3:
            continue
        selector_arg, normal_arg, hover_arg = call_args
        bem_element = _derive_bem_element_from_selector(selector_arg, block_short_slug)
        if not bem_element:
            continue  # Cause C shape (root-scoped selector) — out of scope, no guess
        for decls_arg in (normal_arg, hover_arg):
            arg_var_m = re.match(r"^\s*\$(\w+)\s*$", decls_arg)
            if not arg_var_m:
                continue  # non-bare-variable decls arg — documented gap, never guessed
            for attr in array_push_attrs.get(arg_var_m.group(1), ()):
                if attr in attr_names:
                    elements[attr].add(bem_element)
    return elements


# ── Shape E: the text-colour-or-gradient resolver pair ─────────────────────────
# `sgs_resolve_text_colour_or_gradient( $flat, $gradient )` (includes/helpers-tokens.php)
# picks between a flat text-colour attribute and its `{attr}Gradient` sibling; its
# result is fed straight into `sgs_text_colour_decl()`, which returns a bare
# `color:...` (flat branch) or `background-image:...;...;color:transparent` (gradient
# branch) declaration fragment — WITHOUT the literal property name ever appearing in
# render.php's own source text (it is built INSIDE the helper, in helpers-tokens.php).
# Shapes A/B/C (`_attr_to_raw_props_php`) and Shape D (`_attrs_from_helper_calls`)
# both only see literal property tokens actually written in render.php, so neither
# can see this one — a real consumption-pattern gap, not a naming-pattern gap
# (D636, 2026-08-16 rollout; found live 2026-08-17 via sgs/counter.numberColour
# missing `css_property` and vanishing on every reseed — db-consistency Check #8
# "rogue seed").
#
# Every one of this codebase's 6 call sites (sgs/heading, sgs/text ×2, sgs/testimonial,
# sgs/pricing-table, sgs/counter, verified by reading each render.php) passes the FLAT
# attribute as the resolver's first argument and its `{attr}Gradient` sibling as the
# second; the gradient sibling already resolves correctly everywhere via an explicit,
# hand-curated `"css:background-image": "{attr}Gradient"` block.json attrMap entry, so
# only the FLAT (first) argument needs recovering here — the gradient half is a solved
# problem, not a gap. This mirrors Shape D's "closed, documented helper vocabulary"
# pattern (`_HELPER_SUFFIX_PROPS`) rather than guessing from the attribute's name: the
# fix is "trace what the CODE does", general to every current AND future call site,
# not a per-block special case.
_TEXT_COLOUR_RESOLVER_CALL_RE = re.compile(
    r"sgs_resolve_text_colour_or_gradient\s*\("
)


def _attrs_from_text_colour_resolver_calls(
    php_src: str, var_attr: "dict[str, str]"
) -> "dict[str, set[str]]":
    """Shape E: every `sgs_resolve_text_colour_or_gradient( $flat, $gradient )` call
    site resolves its FIRST argument to a real `color` css_property — see the module
    comment above `_TEXT_COLOUR_RESOLVER_CALL_RE` for the full mechanism + evidence.

    The first argument is almost always a bare `$var` (resolved through the
    multi-hop `var_attr` map built by `_build_php_var_attr_map`, so a cast/
    null-coalesce/ternary wrapper upstream of the resolver call — e.g.
    sgs/testimonial's `$quote_colour_raw = (string) ( $attributes['quoteColour']
    ?? '' );` — is already handled); a direct `$attributes['attrName']` literal is
    also matched as a documented fallback shape. Anything else (a non-var, non-
    direct-attribute expression) is left unresolved — an honest gap, not a guess.
    """
    props: dict[str, set[str]] = defaultdict(set)
    for m in _TEXT_COLOUR_RESOLVER_CALL_RE.finditer(php_src):
        call_args = _split_balanced_call_args(php_src, m.end())
        if not call_args or len(call_args) < 1:
            continue
        flat_arg = call_args[0].strip()
        attr_m = re.match(r"^\$(?:attributes|attrs)\[['\"](\w+)['\"]\]$", flat_arg)
        if attr_m:
            props[attr_m.group(1)].add("color")
            continue
        var_m = re.match(r"^\$(\w+)$", flat_arg)
        if var_m and var_m.group(1) in var_attr:
            props[var_attr[var_m.group(1)]].add("color")
    return props


_SELECTOR_VAR_STRING_LITERAL_RE = re.compile(
    r"'([^'\\]*(?:\\.[^'\\]*)*)'|\"([^\"\\]*(?:\\.[^\"\\]*)*)\""
)


def _build_php_selector_var_map(
    php_src: str, block_short_slug: str
) -> "tuple[dict[str, str], dict[str, str]]":
    """Cause B (root-cause report 2026-08-27): cross-statement SELECTOR variables.

    The existing shapes B/C tracer below already does the "most recently declared
    X, consumed later" hop for a CSS PROPERTY held in a chain of PHP variables
    (`$v = $attributes['x']; ... 'prop:' . $v`). It never does the mirror hop for a
    SELECTOR held in a variable assigned once in an EARLIER statement and consumed
    by NAME in a later one — e.g. sgs/hero/render.php:630:

        $sgs_hero_split_media_fit_selector = '.' . $uid . ' .sgs-hero__split-media--image,.' . $uid . ' .sgs-hero__split-media--video';
        ...
        $responsive_css .= '@media (max-width:1023px){' . $sgs_hero_split_media_fit_selector . '{object-position:' . $safe_object_position_tablet . '}}';

    The BEM element text (`sgs-hero__split-media--image`) lives entirely in the
    FIRST statement; the per-statement tracer resets its fragment scan at every
    top-level `;`, so a bare `$sgs_hero_split_media_fit_selector` reference in the
    second statement carries no literal text of its own to scan.

    This function pre-computes {selector-var-name -> BEM element} and
    {selector-var-name -> state} from every PLAIN `$name = <rhs>;` assignment
    (never `[]=`/`.=`/`+=` — those are accumulators/augmentations, not a fresh
    selector declaration, the same reason `_build_php_var_attr_map` skips
    `array(`-constructed RHS) whose RHS's STRING-LITERAL portions (ignoring any
    interpolated `$uid`/`$root_sel` variable — a literal fragment like
    `' .sgs-hero__split-media--image,.'` still contains the real BEM substring
    regardless of what surrounds it, exactly how Shape D's helper-call selector
    parsing already treats a literal concatenation) contain a `sgs-{slug}__`
    element token or a mapped state selector. The caller then treats a matching
    bare `$var` reference exactly like a literal selector string fragment: sticky
    within the statement, evidence-only (never a guess) — a selector variable
    with no BEM substring correctly yields nothing here (Cause C, out of scope).
    """
    element_map: "dict[str, str]" = {}
    state_map: "dict[str, str]" = {}
    if not block_short_slug:
        return element_map, state_map
    assign_re = re.compile(r"^\$(\w+)\s*=(?!=)\s*(.+);\s*$", re.DOTALL)
    for stmt in _split_php_statements(php_src):
        m = assign_re.match(stmt.strip())
        if not m:
            continue
        var_name, rhs = m.group(1), m.group(2)
        if re.match(r"^\s*array\s*\(", rhs, re.IGNORECASE):
            continue  # accumulator, not a fresh selector declaration
        literal_text = "".join(
            (g1 if g1 else g2) or ""
            for g1, g2 in _SELECTOR_VAR_STRING_LITERAL_RE.findall(rhs)
        )
        if "sgs-" not in literal_text:
            continue
        element = _derive_bem_element_from_selector(literal_text, block_short_slug)
        if element:
            element_map[var_name] = element
        state = _derive_state_from_selector(literal_text)
        if state:
            state_map[var_name] = state
    return element_map, state_map


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
    # Cause B (2026-08-27): cross-statement selector variables — see
    # `_build_php_selector_var_map`'s docstring. Computed once per render.php.
    selector_var_element, selector_var_state = _build_php_selector_var_map(
        php_src, block_short_slug
    )

    # ---- shape A: 'attrName' => '--sgs-foo'
    for m in re.finditer(
        r"['\"](\w+)['\"]\s*=>\s*['\"](" + CUSTOM_PROP_RE + r")['\"]", php_src
    ):
        attr_props[m.group(1)].add(m.group(2))

    # ---- shape A-INVERSE: '--sgs-foo' => ... $attributes['attrName'] ...
    # Shape A above is DIRECTIONAL: it only matches an array whose KEY is the
    # attribute name. Several blocks write the map the other way round, keying on
    # the custom property and putting the attribute in the VALUE:
    #   sgs/product-search/render.php:108-114
    #     '--sgs-ps-input-border' => $attributes['inputBorderColour'] ?? '',
    #   sgs/nav-menu/render.php:1217-1222   (value is a multi-line ternary)
    #     '--sgs-nm-submenu-bg' => '' !== (string) ( $attributes['submenuBg'] ?? '' )
    #         ? sgs_colour_value( (string) $attributes['submenuBg'] ) : '',
    # Neither is reachable by shape A (the key is not an attr name) nor by shapes
    # B/C (no `'--sgs-foo:' . $x` concatenation, no `$v = $attributes[...]`
    # assignment — the attribute is referenced inline inside an array VALUE).
    # Result: 7 colour attributes across those two blocks carried css_property
    # NULL, so survey.js reported REFUSED:no-css_property and rule 31's mechanism
    # axis was blind to them.
    #
    # CONSERVATIVE BY CONSTRUCTION. This function's history is a list of
    # over-pairing bugs (audio accent/spectrum, trustpilot-reviews column tiers,
    # media borderRadiusMobile), so ambiguity REFUSES rather than guesses: the
    # value span runs to the next '--sgs-*' key or the array's close, and a span
    # naming MORE THAN ONE distinct attribute is skipped entirely. A span naming
    # the same attribute repeatedly (nav-menu's ternary tests `submenuBg` and then
    # re-reads it) collapses to one name and pairs normally.
    _inv_keys = list(re.finditer(r"['\"](" + CUSTOM_PROP_RE + r")['\"]\s*=>", php_src))
    for _i, _m in enumerate(_inv_keys):
        _end = _inv_keys[_i + 1].start() if _i + 1 < len(_inv_keys) else len(php_src)
        _value = php_src[_m.end() : _end]
        _close = re.search(r"\n\s*\)\s*;", _value)
        if _close:
            _value = _value[: _close.start()]
        _names = set(re.findall(r"\$attributes\[\s*['\"](\w+)['\"]\s*\]", _value))
        if len(_names) == 1:
            attr_props[_names.pop()].add(_m.group(1))

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
        # Cause B robustness guard (2026-08-27) — see the invalidation check below,
        # by the selector-var branch, for why this is tracked separately from
        # `current_element` rather than folded into the same sticky value.
        element_from_selector_var = False
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
            # Cause B (2026-08-27): a bare reference to a variable that was
            # assigned a selector STRING in an earlier statement. Treated exactly
            # like a literal selector-string fragment above — sticky within the
            # statement, evidence-only — and checked BEFORE the prop_queue gate
            # below because this codebase's concatenation style puts the selector
            # variable ahead of the property literal (`$selector_var . '{prop:' .
            # $value . '}'`), so `prop_queue` may still be empty at this point.
            if var_ref and (var_ref in selector_var_element or var_ref in selector_var_state):
                found_element = selector_var_element.get(var_ref)
                if found_element:
                    current_element = found_element
                    element_from_selector_var = True
                found_state = selector_var_state.get(var_ref)
                if found_state:
                    current_state = found_state
                continue
            # Cause B robustness guard (2026-08-27, found + fixed via live
            # verification against sgs/post-grid's real render.php, NOT invented):
            # a selector variable used as an ANCESTOR-HOVER TRIGGER, followed by a
            # SEPARATE unresolved variable naming the actual (descendant) paint
            # target, must NOT hand its own element to that later declaration.
            # sgs/post-grid's textColourHover shape: `$post_grid_card_sel . ':hover'
            # . $post_grid_hover_text_target . '{color:' . $hover_text . '}'` — the
            # real target is one of 4 descendant elements named inside a PHP array
            # this tracer cannot see (`$post_grid_hover_text_targets`), NOT the
            # card itself; before this guard, the sticky element from
            # `$post_grid_card_sel` (Cause B's own new evidence) survived past the
            # unrelated `$post_grid_hover_text_target` reference and wrongly
            # attributed 'card' — a wrong element is worse than the honest NULL
            # this attr correctly had before. An unresolved variable reference
            # (present, but neither a known selector var NOR a known attr var) is
            # exactly the "something else might be the real target" signal:
            # refuse a selector-var-derived element rather than let it survive
            # past evidence we cannot read. Literal-string-derived elements are
            # UNCHANGED by this guard (their own sticky rule predates this fix and
            # is not implicated by the bug found).
            if var_ref and var_ref not in var_attr and element_from_selector_var:
                current_element = None
                element_from_selector_var = False
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

    # Case-insensitive attr lookup, mirroring check-element-manifest-conformance.js's
    # own `findAttrKeyCaseInsensitive()` exactly (2026-08-06 fix). Without this, a
    # bare-attrs element (`prefix: ""`) builds `base_candidate = "" + suffix`, e.g.
    # `"" + "Gap" = "Gap"` — PascalCase, because every cluster-member suffix in
    # cluster-member-sets.json is PascalCase by convention (tried against
    # `{prefix}{suffix}`). A real bare attribute is camelCase (`gap`, not `Gap`), so
    # the old exact `candidate in block_attr_names` check could never match it: the
    # prefix-convention path was silently disabled for every bare-lowercase attr on
    # every block with a "" prefix. The real JS linter never had this bug — it always
    # matched case-insensitively (see its own comment: "findAttrKeyCaseInsensitive()
    # makes the bare case work: prefix '' + suffix 'FontSize' -> candidate 'FontSize'
    # -> matches the real attr `fontSize`"). Measured impact (2026-08-06, via this
    # function itself, pre-fix HEAD vs on-disk fix): 224 -> 280 prefix-source matches
    # (+56) across the framework's `sgs/*` blocks. All 56 came from the 7 blocks that
    # declare an explicit `"prefix": ""` element — collapsible-text (`body`),
    # decorative-image (`image`), google-reviews (`wrapper`), modal (`dialog`),
    # nav-menu (`bar`), responsive-logo (`wrapper`), trustpilot-reviews (`wrapper`) —
    # every other block was unaffected (its prefix/suffix already happened to be
    # already-correctly-cased camelCase, e.g. "title" + "Gap" = "titleGap").
    attr_lower_map: dict[str, str] = {}
    if block_attr_names is not None:
        for real_attr in block_attr_names:
            attr_lower_map.setdefault(real_attr.lower(), real_attr)

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

        # An attr may be mapped to MORE THAN ONE css key on the same element — a
        # SHORTHAND. `sgs/container.gridItemBorder` declares css:border-width +
        # css:border-style + css:border-color, three entries pointing at one attr.
        # This used to `out[attr_name] = {...}` per key, so the last key silently WON
        # and the other two were lost: a 3-property shorthand recorded as the single
        # property `border-color`, indistinguishable from a genuine colour attr. That
        # loss erased the only signal separating the two (2026-08-06, A7). Keys now
        # ACCUMULATE per attr; `manifest_css_key` carries them comma-joined, the same
        # multi-value shape the emission path already writes (see `emission_css_property`
        # in extract_css_property_and_layer). Everything else stays last-wins, exactly
        # as before — only the key set changed.
        def _record(attr_name: str, css_key: str, state_name: "str | None") -> None:
            prop = css_key[4:] if css_key.startswith("css:") else css_key
            entry = out.get(attr_name)
            # Accumulate only over PRIOR attrMap entries. A prefix-convention entry
            # carries no keys and is not a declaration — attrMap replaces it outright,
            # exactly as it did before this accumulation existed.
            keys: set[str] = set()
            if entry and entry.get("source") == "attrMap":
                keys = set(entry.get("manifest_css_keys") or [])  # type: ignore[arg-type]
            keys.add(prop)
            out[attr_name] = {
                "css_element": element_key,
                "css_state": state_name,
                "css_layer": element_layer,
                "manifest_css_key": ",".join(sorted(keys)),
                "manifest_css_keys": sorted(keys),
                "source": "attrMap",
            }

        # Base (resting) attrMap — no state.
        for css_key, attr_name in (element_def.get("attrMap") or {}).items():
            if not isinstance(attr_name, str):
                continue
            _record(attr_name, css_key, None)
        # Per-state attrMaps (e.g. states.current.attrMap, states.hover.attrMap).
        for state_name, state_def in (element_def.get("states") or {}).items():
            if not isinstance(state_def, dict):
                continue
            for css_key, attr_name in (state_def.get("attrMap") or {}).items():
                if not isinstance(attr_name, str):
                    continue
                _record(attr_name, css_key, state_name)
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
                    if block_attr_names is None:
                        real_attr = candidate
                    else:
                        real_attr = attr_lower_map.get(candidate.lower())
                        if real_attr is None:
                            continue
                    if real_attr in out:
                        continue  # an explicit attrMap/state entry already claimed it — wins
                    out[real_attr] = {
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


def _load_colour_terminal_props(conn: sqlite3.Connection) -> frozenset[str]:
    """CSS properties whose VALUE *is* a colour, derived by SET-DIFFERENCE over
    `property_suffixes` — no hardcoded property dict (R-31-1).

    A property qualifies when every suffix that declares it agrees on role='color'.
    `box-shadow` is the case that makes the set-difference load-bearing rather than
    decorative: the `Shadow` suffix calls it `color` while `BoxShadow` calls it
    `visual`, so the table itself does not agree that a box-shadow value is a colour —
    and it is not (offset/blur/spread precede the colour). Selecting role='color'
    naively would have swept 8 live `boxShadow*` attrs off their correct `visual` role.
    The DB's own disagreement is the honest signal, and the query below reads it.
    """
    rows = conn.execute(
        """
        SELECT css_property
          FROM property_suffixes
         WHERE css_property IS NOT NULL
           AND css_property IN (SELECT css_property FROM property_suffixes WHERE role = 'color')
         GROUP BY css_property
        HAVING COUNT(DISTINCT role) = 1
        """
    ).fetchall()
    return frozenset(r[0] for r in rows)


def _manifest_role_verdict(
    css_keys: "list[str] | None",
    existing_role: "str | None",
    colour_terminal: frozenset[str],
) -> "str | None":
    """A7 (2026-08-06) — the OCCURRENCE-COUNT method, from the /qc-council that
    rejected the Detector-7 shape I proposed first.

    An attrMap declaration answers "colour or shorthand?" by ARITY, which is a fact
    about the declaration rather than a guess about the attr's name:

      * exactly ONE css key, and that property is colour-terminal  -> `color`
      * MORE THAN ONE css key                                      -> a shorthand,
        so no single-property role fits -> `styling`

    WHY THIS AND NOT DETECTOR 7: D7 cannot reach `sgs/product-card` at all — the block
    passes its whole `$attributes` bag to `sgs_button_element_style_css`, so
    `carriers_for()` builds no carrier and the tokeniser has nothing to follow. A JSON
    key-count needs no PHP tokeniser and cannot be defeated by a call shape.

    POSITIVE-ONLY, AND IT NEVER DEMOTES A MORE SPECIFIC ROLE. The `>1` leg fires only
    against NULL or `color` — i.e. only where the row would otherwise be mistaken for a
    single colour. Measured before writing: an unconditional `>1` leg would have
    overwritten `select-from-enum` on `nav-menu.burgerSize`, `trust-bar.badgeImageSize`
    and `trust-bar.iconCircleSize` (each an enum size picker mapped to width+height) —
    three regressions dressed as three fixes. The `color` leg DOES override `styling`
    and `text-content`, both of which are wrong about a value that is a colour
    (`text-content` is content-BEARING: it would send a colour into rich-text
    extraction).

    This is also what finally makes `gridItemBorder`'s `styling` hold BY CONSTRUCTION.
    Today it survives only because D7 cannot reach the file, so the reasoning recorded
    in its comment has never actually been exercised; here the shorthand arity is read
    every run, and this layer is the final writer on role (sgs-update-v2 Stage 1C).
    """
    if not css_keys:
        return None
    if len(css_keys) == 1:
        return "color" if css_keys[0] in colour_terminal else None
    return "styling" if existing_role in (None, "color") else None


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
    colour_terminal = _load_colour_terminal_props(conn)

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
        # Root cause (2026-09-05, D962-adjacent): this scan hardcoded the
        # `style.css` filename and silently skipped the ENTIRE per-block
        # CSS-consumption pass (`_custom_props_consumed` below) for any block
        # that ships `style.scss` instead — a real, existing sibling naming
        # convention in this codebase (sgs/timeline, sgs/responsive-logo), NOT
        # a hypothetical. Cost: every colour attr on sgs/timeline that only
        # resolves via its stylesheet (rowStripeColourA/rowStripeColourB) came
        # back css_property=NULL, and survey.js's colour-conformance census
        # refused both with REFUSED:no-css_property, undercounting the block's
        # true conformance. Fall back to `style.scss` when `style.css` is
        # absent — same file, later build step compiles one to the other, so
        # reading whichever source file exists is faithful either way.
        if not css_path.exists():
            scss_path = block_dir / "style.scss"
            if scss_path.exists():
                css_path = scss_path

        # Manifest-derived data (element layers, root element, attrMap reverse
        # lookup) is read from block.json alone — a pure declarative fact that
        # does not depend on render.php or style.css existing. Read it for EVERY
        # sgs block BEFORE the render.php+style.css gate below, so a block this
        # gate skips wholesale still populates `manifest_by_block`/
        # `elem_layer_by_block`/`root_elem_by_block` and remains reachable by the
        # manifest-only seed pass further down (2026-08-01 fix). Previously this
        # whole per-block block ran only past the gate, so sgs/form-field-tiles
        # and sgs/form-step — which declare no style.css at all (neither block
        # emits its own scoped stylesheet) — were skipped before manifest data was
        # ever recorded for them, leaving them absent from
        # `manifest_by_block.items()` in the fallback loop entirely and their
        # declared `layer`/`attrMap` silently unreachable.
        block_attr_names = attrs_by_block.get(slug, set())
        manifest_by_block[slug] = _load_element_manifest_reverse(block_dir, block_attr_names)
        elem_layer_by_block[slug] = _load_element_layers(block_dir)
        root_elem_by_block[slug] = _load_root_element(block_dir)

        if not php_path.exists() or not css_path.exists():
            continue

        php_src_raw = php_path.read_text(encoding="utf-8", errors="ignore")
        css_src_raw = css_path.read_text(encoding="utf-8", errors="ignore")
        php_src = _strip_php_comments(php_src_raw)

        consumed, gradient_props, shorthand_slot, state_of, element_of = _custom_props_consumed(css_src_raw, short_slug)
        var_attr = _build_php_var_attr_map(php_src)

        raw, php_attr_state, php_attr_element = _attr_to_raw_props_php(php_src, known_css_props, var_attr, short_slug)
        helper_props, helper_elements = _attrs_from_helper_calls(php_src, block_attr_names, short_slug)
        for attr, props in helper_props.items():
            raw[attr] = raw.get(attr, set()) | props
        # Cause A (2026-08-27): sgs_emit_state_colour_css() call sites — see
        # `_attrs_from_state_colour_helper_calls` docstring. css_property for
        # these attrs is already resolved above (Shapes B/C on the decls-array
        # build statement); this contributes only css_element evidence, merged
        # alongside `helper_elements` at the `attr_bem_elements` union below.
        state_colour_elements = _attrs_from_state_colour_helper_calls(
            php_src, block_attr_names, short_slug, var_attr
        )
        text_colour_resolver_props = _attrs_from_text_colour_resolver_calls(php_src, var_attr)
        for attr, props in text_colour_resolver_props.items():
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
            # Shape D (helper-call selector arg) BEM element evidence — same
            # "unanimous or unassigned" merge as every other evidence source here
            # (2026-08-15, Class 2 fix; see `_attrs_from_helper_calls` docstring).
            attr_bem_elements |= helper_elements.get(attr, set())
            # Cause A (2026-08-27) — same unanimous-or-unassigned merge.
            attr_bem_elements |= state_colour_elements.get(attr, set())
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
        emission_css_property = ",".join(sorted(real_props))
        manifest_hit = manifest_by_block.get(slug, {}).get(attr)
        # css_property precedence (2026-07-23, Bean — mirrors the element precedence
        # below): an EXPLICIT manifest `attrMap` `css:<property>` key is a hand-curated,
        # authoritative declaration of WHICH property this attr sets. It WINS over the
        # emission-parse guess, which can grab a neighbouring property from the same
        # rendered rule — e.g. sgs/nav-menu underlineOffset: the manifest declares
        # `css:bottom`, but emission scraped `position` from the rule's leading
        # `position:absolute`. Only the attrMap source carries a css key (prefix-
        # convention hits are None), so this never touches an attr the author did not
        # explicitly map, and the emission value stays the fallback everywhere else.
        manifest_css_property = None
        if manifest_hit and manifest_hit.get("source") == "attrMap":
            manifest_css_property = manifest_hit.get("manifest_css_key")
        css_property = manifest_css_property or emission_css_property
        fields: dict[str, object] = {"css_property": css_property}
        css_property_written += 1
        # A7 role verdict — attrMap arity only (see _manifest_role_verdict). Emission-
        # derived rows are untouched: sgs/post-grid.borderColourHover legitimately
        # carries three EMISSION-parsed properties and is correctly `color`, which the
        # `>1 -> styling` leg would have wrecked had it keyed on css_property instead.
        if manifest_hit and manifest_hit.get("source") == "attrMap":
            verdict = _manifest_role_verdict(
                manifest_hit.get("manifest_css_keys"),
                role_of.get((slug, attr)),
                colour_terminal,
            )
            if verdict:
                fields["role"] = verdict
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
        #
        # 2026-09-05 (db-consistency residual close-out) — an attrMap hit must win
        # OUTRIGHT on the state axis, even when its OWN css_state is None. `None`
        # here means "this attrMap entry is the BASE (resting) attrMap, not a
        # states.<name>.attrMap entry" — an explicit declaration, not "no opinion".
        # The old `or` treated it as "no opinion" and fell through to the emission
        # guess whenever one existed, so a resting attrMap-declared attr could
        # silently inherit a hover state from an unrelated (mis-paired) emission
        # token — e.g. sgs/post-grid's `cardBgColour` (base attrMap, no state)
        # picking up state='hover' from emission evidence that actually belongs to
        # a different custom property chain entirely. Mirrors the css_property
        # precedence above: only fall through to the emission guess when there is
        # NO attrMap declaration for this attr at all.
        if manifest_hit and manifest_hit.get("source") == "attrMap":
            state = manifest_hit.get("css_state")
        else:
            state = resolved_state.get((slug, attr))
        if state:
            fields["css_state"] = state
        # 2026-09-05 (db-consistency residual close-out) — track WHICH source won
        # css_property, so the slot-precedence eviction pass below (just before the
        # JSON write) can tell an authoritative manifest declaration apart from an
        # emission-parse guess. Internal bookkeeping only — stripped before write.
        fields["_prop_source"] = "manifest" if manifest_css_property else "emission"
        classification_entries.append({"slug": slug, "attr": attr, "fields": fields})

    # Manifest-only attrs (2026-07-23, Bean — declarative-first, R-31-1). An attr the block
    # DECLARES in its `supports.sgs.elements.<el>.attrMap` but whose paint the emission
    # parser could NOT trace (e.g. a colour built through a $var + implode() indirection the
    # parser can't follow — sgs/separator `contentColour`, read into two vars) is absent from
    # `resolved` and would otherwise be DROPPED (NULL css_property/element), leaving a
    # manifest-declared attr unrouted. The explicit attrMap `css:<property>` key is an
    # authoritative human declaration on its own, so SEED the entry from the manifest — a
    # declared attr is never lost to a parser blind spot. Only the `attrMap` source seeds
    # (prefix-convention hits are guesses, not declarations); `native:*` attrMap targets are
    # not real block attrs (excluded by the `attr in known_attrs` gate); unit attrs excluded.
    _manifest_seeded = 0
    emitted = {(e["slug"], e["attr"]) for e in classification_entries}
    for slug, reverse in sorted(manifest_by_block.items()):
        known_attrs = attrs_by_block.get(slug, set())
        root_key = root_elem_by_block.get(slug)
        for attr, hit in sorted(reverse.items()):
            if (slug, attr) in emitted or (slug, attr) in unit_attrs_excluded:
                continue
            if hit.get("source") != "attrMap":
                continue
            css_key = hit.get("manifest_css_key")
            if not css_key or attr not in known_attrs:
                continue
            element = hit.get("css_element")
            is_root_element = (
                element in (None, "", "root", "self")
                or (root_key is not None and element == root_key)
            )
            # Every entry on this pass is seeded FROM an attrMap declaration (guarded
            # above by `hit.get("source") != "attrMap"`) — always manifest-sourced.
            fields = {"css_property": css_key, "_prop_source": "manifest"}
            # Same A7 verdict on the manifest-only path (an attrMap-declared attr the
            # emission parser could not trace). `attr in known_attrs` above already
            # excludes `native:*` targets, which are not real block attrs.
            verdict = _manifest_role_verdict(
                hit.get("manifest_css_keys"), role_of.get((slug, attr)), colour_terminal,
            )
            if verdict:
                fields["role"] = verdict
            css_layer = (
                elem_layer_by_block.get(slug, {}).get(element)
                or hit.get("css_layer")
                or _classify_css_layer(
                    attr,
                    # The real key SET, not the comma-joined string: a shorthand's
                    # `manifest_css_key` is now "border-color,border-style,..." and
                    # passing that as a single pseudo-property would match nothing.
                    set(hit.get("manifest_css_keys") or [css_key]),
                    is_root_element,
                )
            )
            if css_layer:
                fields["css_layer"] = css_layer
                css_layer_written += 1
            if element:
                fields["css_element"] = (
                    "wrapper" if (root_key is not None and element == root_key) else element
                )
            state = hit.get("css_state")
            if state:
                fields["css_state"] = state
            classification_entries.append({"slug": slug, "attr": attr, "fields": fields})
            emitted.add((slug, attr))
            css_property_written += 1
            _manifest_seeded += 1

    # Device-tier siblings (2026-08-05, Bean). Gap-fill pass, same shape and same
    # `emitted` guard as the manifest-only pass above.
    #
    # THE GAP, measured before the rule was written: of the 183 attrs no content-role
    # detector reaches, 65 (36%) are device-tier siblings — `gapTablet`, `gapMobile`,
    # `gridTemplateColumnsTablet` — whose BASE attr is already fully classified:
    #
    #     gap                        role=layout  css_property=gap                    is_responsive=1
    #     gapTablet                  role=NULL    css_property=NULL                   is_responsive=0
    #     gridTemplateColumns                     css_property=grid-template-columns  is_responsive=1
    #     gridTemplateColumnsTablet               css_property=NULL                   is_responsive=0
    #
    # The base paints through a --sgs-* chain the emission parser can follow; the tier
    # sibling usually only appears inside an @media block the parser does not resolve to
    # the same token, so it drops out with no evidence and no marker. Nothing is
    # malformed and every gate reads green — the same failure shape as
    # sgs/responsive-logo's prefix naming, where a device tier sat somewhere the
    # classifier structurally could not look.
    #
    # ON PARSING THE NAME: _derive_tier's docstring says tier must come from emission
    # evidence "never by parsing the attribute's own name WHERE THAT EVIDENCE IS
    # AVAILABLE". This pass runs only where it is NOT available — every row it touches
    # produced zero emission evidence. It never competes with `resolved`, never
    # overwrites an emission-derived tier, and the `emitted` guard makes that structural
    # rather than a promise.
    #
    # The inherited property is the BASE's, not a guess: `gapTablet` sets the same CSS
    # property as `gap` by construction — that is what the suffix convention MEANS. Only
    # the tier differs, and the suffix names it.
    _tier_inherited = 0
    _TIER_SUFFIXES = (("Tablet", "tablet"), ("Mobile", "mobile"), ("Desktop", "desktop"))
    _entry_by_key = {(e["slug"], e["attr"]): e["fields"] for e in classification_entries}
    for slug in sorted(attrs_by_block):
        for attr in sorted(attrs_by_block[slug]):
            if (slug, attr) in emitted or (slug, attr) in unit_attrs_excluded:
                continue
            for suffix, tier in _TIER_SUFFIXES:
                if not attr.endswith(suffix):
                    continue
                base = attr[: -len(suffix)]
                if not base:
                    continue
                base_fields = _entry_by_key.get((slug, base))
                # The base must carry a real css_property. A base that is itself
                # unclassified proves nothing about the sibling — inheriting NULL would
                # manufacture a classification out of two unknowns. Measured: 4 of the 65
                # are this shape (google-reviews / trustpilot-reviews
                # gridTemplateColumns*), and they stay open, correctly.
                if not base_fields or not base_fields.get("css_property"):
                    continue
                fields = {
                    "css_property": base_fields["css_property"],
                    "css_tier": tier,
                    # Inherit the base's provenance too — a tier sibling of a
                    # manifest-owned attr is just as authoritative as its base.
                    "_prop_source": base_fields.get("_prop_source", "emission"),
                }
                # Carry the base's SELECTOR context too. The sibling paints the same
                # property on the same element in the same state — only the breakpoint
                # differs. Dropping these would leave the tier row routable but aimed at
                # the wrong element, which is harder to spot than a plain NULL.
                for inherited in ("css_layer", "css_element", "css_state"):
                    if base_fields.get(inherited):
                        fields[inherited] = base_fields[inherited]
                classification_entries.append({"slug": slug, "attr": attr, "fields": fields})
                emitted.add((slug, attr))
                css_property_written += 1
                _tier_inherited += 1
                break

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

    # ---- slot-level precedence eviction (2026-09-05, db-consistency residual
    # close-out; see reports/2026-09-05-db-consistency-residual-ambiguities.md).
    #
    # THE GAP: the per-attribute manifest-wins principle above (2026-07-23, Bean —
    # "an explicit manifest attrMap `css:<property>` key ... WINS over the
    # emission-parse guess") was applied PER-ATTRIBUTE but never PER-SLOT. An attr
    # WITH its own manifest entry gets the right property; an attr with NO
    # manifest entry falls through to the emission parse, which can grab a
    # NEIGHBOURING property off the same rendered rule and pile onto a slot a
    # manifest has already authoritatively assigned to someone else. Nothing
    # evicted the guess, because precedence was additive, not exclusive — an
    # explicit declaration must be able to RETRACT a heuristic guess, not merely
    # sit alongside it.
    #
    # Slot key mirrors exactly how db-consistency's own resolver_bridge.py groups
    # column-derived candidates for the live resolver
    # (css_property, css_element, css_state, css_tier) — see enumerate_candidates's
    # `col_by_key` grouping. NULL and "" are normalised to the same sentinel so a
    # manifest row that omits a field and one that stores it empty are treated as
    # the same slot (mirrors db-consistency's own `IFNULL(...,'')` grouping).
    def _slot_key(fields: dict) -> tuple:
        def _norm(v):
            return v if v not in (None, "") else None

        return (
            fields.get("css_property"),
            _norm(fields.get("css_element")),
            _norm(fields.get("css_state")),
            _norm(fields.get("css_tier")),
        )

    manifest_slots: set[tuple] = set()
    for entry in classification_entries:
        fields = entry["fields"]
        if fields.get("_prop_source") == "manifest" and fields.get("css_property"):
            manifest_slots.add((entry["slug"], *_slot_key(fields)))

    _slot_evicted = 0
    _slot_eviction_log: list[dict] = []
    for entry in classification_entries:
        fields = entry["fields"]
        if fields.get("_prop_source") != "manifest" and fields.get("css_property"):
            key = (entry["slug"], *_slot_key(fields))
            if key in manifest_slots:
                _slot_eviction_log.append(
                    {
                        "slug": entry["slug"],
                        "attr": entry["attr"],
                        "evicted_css_property": fields["css_property"],
                    }
                )
                # Drop the property AND its dependent layer classification — a
                # css_layer with no owning css_property is meaningless for
                # routing. css_element/css_state are left untouched: they rest on
                # independent evidence (BEM-selector / selector-context) and
                # remain honest facts about the attr regardless of which slot it
                # no longer contends for.
                fields.pop("css_property", None)
                fields.pop("css_layer", None)
                _slot_evicted += 1

    # Role guard (2026-09-05, same close-out): a non-painting role never carries a
    # css_property, for the case where no manifest owner exists to evict it (the
    # slot-precedence pass above only fires when a manifest-owned slot exists at
    # the SAME key — this is the backstop for when it doesn't). Keyed on ROLE,
    # never on attr_type: a type-based guard was measured and rejected — 1,680
    # string + 105 boolean rows carry a legitimate css_property tree-wide
    # (including 59 colour attrs with no manifest entry, and booleans that
    # legitimately drive effects, e.g. card-grid.imageZoomHover -> transform,
    # container.bgKenBurns -> animation). Role-based blast radius is exactly the
    # 2 rows these roles actually describe (both sgs/responsive-logo: `alt`
    # role=image-alt, `logoDecorative` role=boolean-visibility).
    _NON_PAINTING_ROLES = frozenset({"image-alt", "boolean-visibility"})
    _role_guarded = 0
    for entry in classification_entries:
        fields = entry["fields"]
        if role_of.get((entry["slug"], entry["attr"])) in _NON_PAINTING_ROLES and fields.get(
            "css_property"
        ):
            fields.pop("css_property", None)
            fields.pop("css_layer", None)
            _role_guarded += 1

    # Strip the internal bookkeeping key from every entry before it reaches the
    # on-disk truth file — it is provenance for THIS pass only, never a real
    # classification field Stage 1C should apply.
    for entry in classification_entries:
        entry["fields"].pop("_prop_source", None)

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
        "tier_inherited": _tier_inherited,
        "unit_control_written": unit_control_written,
        "slot_precedence_evicted": _slot_evicted,
        "slot_precedence_eviction_log": _slot_eviction_log,
        "role_guard_evicted": _role_guarded,
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

# A tag NOT in this tuple yields no candidate, so no write happens and whatever
# stale value the row already holds survives forever — silently, and looking
# derived. Until 2026-08-08 the tuple held sixteen CORE WordPress components and
# ZERO of this framework's own, so every attribute edited by an SGS component was
# frozen at whatever the long-deleted `enrich-db.py` last wrote: `sgs/heading`'s
# box-shaped `borderWidth` read `DesignTokenPicker`, `sgs/counter`'s `icon` read
# `RangeControl`, `sgs/button`'s `url` read `TextControl`. Measured on a sandbox
# copy of the live DB: widening the roster corrected 44 rows (13 previously NULL,
# 31 previously wrong) and changed nothing else.
#
# ⚠ Membership is what the component DOES, not what it is called: every entry
# here is a control that edits ONE attribute through its own
# `value`/`checked`/`values`/`onChange` props. A PANEL that merely groups other
# controls (`ToolsPanel`, `WidthPanel`, `LayoutPanel`, `BackgroundPanel`…) does
# not belong — it never names an attribute in its own props, so listing it buys
# nothing and invites a wrong association. Likewise a multi-attribute façade
# (`TypographyControls`, `ContainerWrapperControls`) takes `attributes` +
# `setAttributes` wholesale and can name no single attr.
_KNOWN_CONTROLS = (
    # Core WordPress components.
    "SelectControl", "TextControl", "ToggleControl", "RangeControl", "UnitControl",
    "NumberControl", "TextareaControl", "CheckboxControl", "RadioControl", "BoxControl",
    "ComboboxControl", "SearchControl", "GradientPicker", "FocalPointPicker",
    "LinkControl", "URLInput",
    "DesignTokenPicker", "MediaUpload", "MediaPicker", "ResponsiveControl",
    "ToggleGroupControl", "Button",
    # This framework's own single-attribute controls (src/components/).
    "ResponsiveBoxControl", "ResponsiveBorderRadiusControl", "BorderRadiusControl",
    "SpacingControl", "ShadowControl", "GradientOverlayControl", "AnimationControl",
    "IconPicker", "SgsLinkControl", "StateToggleControl",
    "ResponsiveTriStateControl", "BooleanResponsiveControl",
    "RRangeControl", "RUnitControl",
    "MediaSlotPicker", "MediaGalleryPicker", "ContentImpactPicker",
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


def _repeater_item_spans(js_src: str, destructure_map: dict, valid_attrs: "set[str]") -> "dict[str, list[tuple[int, int]]]":
    """Character spans of every `someAttr.map( … )` iteration over an attribute's OWN
    value, keyed by that attribute.

    A control rendered INSIDE such an iteration edits one FIELD of one ITEM — its
    `onChange` rebuilds and writes the whole array, so the naive derivation credits
    the array attr to the item control. That answer is wrong in the way that matters:
    `sgs/pricing-table::plans` is edited by a repeater UI, not by the `SgsLinkControl`
    that happens to sit in the last row of it, and a Spec 35 rule scoped on
    `inspector_control_type` would then check the wrong contract.

    The discriminator is what the code DOES, not what anything is named: iterating
    the attribute itself means per-item editing. A `.map()` over a CONSTANT list
    (`ADDRESS_FIELDS.map`, `HEADING_LEVELS.map`) is the opposite case — N controls
    that between them edit the one array as a whole — and is deliberately not matched,
    which is why `sgs/form-field-address::fields` keeps its `CheckboxControl`.
    """
    spans: dict[str, list[tuple[int, int]]] = {}
    for m in re.finditer(r"\b([A-Za-z_$][\w$]*)\s*\.map\s*\(", js_src):
        ident = m.group(1)
        attr = ident if ident in valid_attrs else destructure_map.get(ident)
        if attr not in valid_attrs:
            continue
        open_paren = js_src.index("(", m.end() - 1)
        extracted = _extract_balanced(js_src, open_paren, "(", ")")
        if extracted is None:
            continue  # unbalanced — no span rather than a guessed one
        spans.setdefault(attr, []).append((open_paren, extracted[1]))
    return spans


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
    # --- 2026-08-06 addition: same primary/default-path rule as sgs/hero above. ---
    # Both blocks post-date the 2026-07-21 audit, so neither was in its 93 rows; both
    # were hand-traced against edit.js before being written here (never derived).
    #
    # nav-menu::collapsePoint — ToggleGroupControl "Show the burger on"
    # (Always/Tablet/Mobile/Custom) is ALWAYS rendered; the UnitControl "Switch to
    # burger below" renders only when the scope resolves to 'custom'. Structurally
    # identical to sgs/hero::gridTemplateColumns, so it takes the same ruling.
    ("sgs/nav-menu", "collapsePoint"): "ToggleGroupControl",
    # mega-panel::asideSeparator — an OBJECT attr {style, colour, width} written by
    # THREE controls. The detector offered UnitControl vs DesignTokenPicker and
    # NEITHER is the client-facing answer: the ToggleGroupControl "Divider"
    # (Line/None) is the always-visible control, and it GATES the other two, which
    # render only while style === 'line'.
    ("sgs/mega-panel", "asideSeparator"): "ToggleGroupControl",
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
        repeater_spans = _repeater_item_spans(js_src, destructure_map, valid_attrs)

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
            if any(lo <= m.start() < hi for lo, hi in repeater_spans.get(attr, ())):
                unresolved.append({
                    "block": slug, "control": control, "attr": attr,
                    "reason": "per-item control inside a repeater over its own attribute "
                              "— the array's control is the repeater UI, not this",
                })
                continue
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


# ── Regression guard (Defect 1, 2026-08-05) ─────────────────────────────────

def _self_test_multi_element_var_is_not_collapsed() -> bool:
    """`--self-test` fixture proving `element_of`/`_resolve_var_chain` correctly
    surface a `--sgs-*` custom property that genuinely feeds the SAME real CSS
    property under TWO DIFFERENT BEM-element selectors (google-reviews'
    `starColour`: `--sgs-gr-star-colour` feeds `background-color` from BOTH
    `.sgs-google-reviews__breakdown-fill{...}` (resting) and
    `.sgs-google-reviews__dot.is-active::before{...}` (active state) —
    style.css:120/579).

    Before the 2026-08-05 fix, `element_of` was a SCALAR dict
    (`dict[(var, prop)] = element`), so the second matching selector silently
    OVERWROTE the first — an undocumented "last selector in the file wins"
    tie-break, never a stated rule. The unanimous-or-unassigned check at
    `extract_css_property_and_layer` (`if len(attr_bem_elements) == 1`) then saw
    only ONE (already-collapsed) candidate and confidently, wrongly, "resolved"
    a genuinely ambiguous attribute.

    This fixture recreates that exact shape with a synthetic block/CSS pair and
    asserts BOTH elements survive into `_resolve_var_chain`'s returned element
    set — i.e. the ambiguity is preserved for the unanimity check to correctly
    decline, rather than silently pre-collapsed. Reverting `element_of`/the
    `elements.add(leaf_element)` call in `_resolve_var_chain` back to a scalar
    assignment makes this fixture FAIL (only one of the two elements would
    survive) — proving the guard is not vacuous.
    """
    fixture_css = (
        ".sgs-selftest__alpha { background-color: var(--sgs-selftest-colour, red); }\n"
        ".sgs-selftest__beta.is-active::before { "
        "background-color: var(--sgs-selftest-colour, red); }\n"
    )
    consumed, gradient_props, shorthand_slot, state_of, element_of = _custom_props_consumed(
        fixture_css, "selftest"
    )
    var = "--sgs-selftest-colour"
    prop = "background-color"

    raw_evidence = element_of.get((var, prop))
    expected = {"alpha", "beta"}
    if raw_evidence != expected:
        print(
            f"[self-test] FAIL: element_of[{(var, prop)!r}] = {raw_evidence!r}, "
            f"expected {expected!r} (both selectors' elements should survive, "
            "not be collapsed to one)",
            file=sys.stderr,
        )
        return False

    real_props, visited_vars, states, elements = _resolve_var_chain(
        var, consumed, gradient_props, shorthand_slot, state_of, element_of
    )
    if elements != expected:
        print(
            f"[self-test] FAIL: _resolve_var_chain(...) elements = {elements!r}, "
            f"expected {expected!r}",
            file=sys.stderr,
        )
        return False

    print("[self-test] PASS: a --sgs-* var feeding the same property under two "
          "different BEM-element selectors is NOT silently collapsed to one "
          f"(element_of + _resolve_var_chain both returned {sorted(expected)}).")
    return True


def _self_test_helper_call_selector_yields_bem_element() -> bool:
    """`--self-test` fixture proving `_attrs_from_helper_calls` (Shape D) now
    extracts BEM-element evidence from its selector argument (2026-08-15, Class 2
    fix). Before the fix, this function returned ONLY `css_property` evidence, so
    an attr reached exclusively through a shared style-emitter helper call (e.g.
    `sgs_typography_css_rule($attributes, 'title', '.uid .sgs-card-grid__title')`)
    fell all the way through the element-precedence chain to the weak prefix-
    convention guess, which echoes the MANIFEST's own element key
    (`card-title`) rather than the real BEM element (`title`) — proven live:
    `sgs/card-grid.titleFontSize` carried `css_element='card-title'` in the DB
    while `sgs/card-grid.titleColour` (resolved via a DIFFERENT, already-working
    PHP-string-concat path) correctly carried `css_element='title'` for the
    exact same manifest element.

    POSITIVE CONTROL: a literal, concatenated selector arg containing the real
    class must yield the element.
    NEGATIVE CONTROL: a bare-`$variable` selector arg (the majority call shape —
    counter/icon-list/nav-menu/option-picker/trust-bar/whatsapp-cta) must yield
    NO element evidence (an honest gap, never a guessed one) — and a selector
    referencing a DIFFERENT block's own BEM class must also yield nothing.
    """
    ok = True
    fixture_php = (
        "<?php\n"
        "$out = sgs_typography_css_rule( $attributes, 'title', "
        "'.' . $uid . ' .sgs-selftest__title' );\n"
        "$out .= sgs_typography_css_rule( $attributes, 'label', $label_sel );\n"
        "$out .= sgs_typography_css_rule( $attributes, 'pill', "
        "'.' . $uid . ' .sgs-option-picker__pill' );\n"
    )
    attr_names = {"titleFontSize", "labelFontSize", "pillFontSize"}
    props, elements = _attrs_from_helper_calls(fixture_php, attr_names, "selftest")

    if props.get("titleFontSize") != {"font-size"}:
        print(
            f"[self-test] FAIL: helper-call props['titleFontSize'] = "
            f"{props.get('titleFontSize')!r}, expected {{'font-size'}}",
            file=sys.stderr,
        )
        ok = False
    if elements.get("titleFontSize") != {"title"}:
        print(
            f"[self-test] FAIL: helper-call elements['titleFontSize'] = "
            f"{elements.get('titleFontSize')!r}, expected {{'title'}} (POSITIVE "
            "control — a literal selector arg must yield real BEM element evidence)",
            file=sys.stderr,
        )
        ok = False
    if elements.get("labelFontSize"):
        print(
            f"[self-test] FAIL: helper-call elements['labelFontSize'] = "
            f"{elements.get('labelFontSize')!r}, expected no evidence (NEGATIVE "
            "control — a bare $variable selector arg has no BEM substring to find)",
            file=sys.stderr,
        )
        ok = False
    if elements.get("pillFontSize"):
        print(
            f"[self-test] FAIL: helper-call elements['pillFontSize'] = "
            f"{elements.get('pillFontSize')!r}, expected no evidence (NEGATIVE "
            "control — the selector names a DIFFERENT block's own BEM class, "
            "option-picker's, not this block's)",
            file=sys.stderr,
        )
        ok = False

    if ok:
        print(
            "[self-test] PASS: Shape D helper-call selector args now feed BEM "
            "element evidence for a literal selector, and correctly feed none "
            "for a variable ref or a foreign block's class."
        )
    return ok


def _self_test_bem_modifier_is_not_an_element() -> bool:
    """`--self-test` fixture proving `_derive_bem_element_from_selector` strips a
    trailing `--modifier` from the captured element (2026-08-15, Class 4 fix).

    Before the fix, `_BEM_ELEMENT_RE`'s greedy `[a-z0-9-]+` swallowed the whole
    `el--modifier` run as one "element" — proven live for
    `sgs/brand-strip.scrollSpeed` (`css_element='track--ready'`) and
    `sgs/product-card.tagTextColour` (`css_element='tag--trial'`), and would have
    ALSO newly broken `sgs/product-card`'s prefix-convention `cta*` attrs
    (ctaFontSize/ctaBorderStyle/ctaBorderWidth/ctaBorderRadius/ctaFontWeight) the
    moment the Class 2 fix above started feeding
    `.sgs-product-card__cta--primary` as selector-arg evidence, since those attrs
    have no attrMap to protect them and would have taken the compound value
    outright.

    POSITIVE CONTROL: `__el--modifier` selectors resolve to the base `el`.
    NEGATIVE CONTROL: an element/modifier-free selector, and one whose element
    name itself legitimately contains a SINGLE hyphen (`card-tile`), are
    unaffected — only a genuine `--` (BEM's own modifier separator) is a cut
    point, never a bare `-`.
    """
    ok = True
    cases = [
        (".sgs-brand-strip__track--ready", "brand-strip", "track"),
        (".sgs-product-card__tag--trial", "product-card", "tag"),
        (".sgs-product-card__cta--primary", "product-card", "cta"),
        (".sgs-card-grid__card-tile", "card-grid", "card-tile"),  # negative control
        (".sgs-card-grid__title", "card-grid", "title"),  # negative control
    ]
    for selector, slug, expected in cases:
        actual = _derive_bem_element_from_selector(selector, slug)
        if actual != expected:
            print(
                f"[self-test] FAIL: _derive_bem_element_from_selector({selector!r}, "
                f"{slug!r}) = {actual!r}, expected {expected!r}",
                file=sys.stderr,
            )
            ok = False
    if ok:
        print(
            "[self-test] PASS: a BEM `--modifier` suffix is stripped from the "
            "captured element; a genuine single-hyphen element name is untouched."
        )
    return ok


def _self_test_bem_current_modifier_is_state_aware() -> bool:
    """`--self-test` fixture proving the fix-of-the-fix (2026-08-15): a bare
    `--current` BEM modifier populates `css_state='current'` when it's the
    element's ONLY modifier (breadcrumbs shape), but is left unmapped when the
    element ALSO carries a sibling modifier (buybox/product-card shape) — so
    `current` there stays a variant, never a fabricated selection state.

    Reproduces the exact live regression: without this fix,
    `sgs/breadcrumbs.linkColour` and `.currentColour` both collapse to
    `(element='item', state=None, property='color')` — an identical, ambiguous
    key the column-first resolver raises `AmbiguousLayerAttrError` on at clone
    time (proven live via `db-consistency/run.py --check`, 2026-08-15).

    POSITIVE CONTROL: breadcrumbs' `--sgs-breadcrumbs-current-colour` (fed only
    by `.sgs-breadcrumbs__item--current`, `item` has no other modifier) resolves
    to `state='current'`, `element='item'` — now DISTINCT from `linkColour`'s
    `(item, color, state=None)`, so no collision.
    NEGATIVE CONTROL: a synthetic block reproducing buybox/product-card's own
    shape (a `price` element carrying `--current` PLUS sibling `--regular`/
    `--pct-off` modifiers — buybox and product-card's actual selectors are
    `.buybox__price--current`/`.price--current`, unprefixed, so this exact
    real-world regex never even reaches them; the synthetic fixture uses the
    full `sgs-{slug}__el--modifier` convention so the sibling-disambiguation
    branch is genuinely exercised rather than short-circuited by prefix
    mismatch) resolves to `state=None` — `current` stays a variant, never
    upgraded to a fabricated 'current' state.
    """
    ok = True

    breadcrumbs_css = (
        ".sgs-breadcrumbs__item a { color: var(--sgs-breadcrumbs-link-colour); }\n"
        ".sgs-breadcrumbs__item--current { color: var(--sgs-breadcrumbs-current-colour); }\n"
    )
    _out, _grad, _slot, state_of, element_of = _custom_props_consumed(
        breadcrumbs_css, block_short_slug="breadcrumbs"
    )
    link_key = ("--sgs-breadcrumbs-link-colour", "color")
    current_key = ("--sgs-breadcrumbs-current-colour", "color")
    if state_of.get(current_key) != "current":
        print(
            "[self-test] FAIL: breadcrumbs POSITIVE CONTROL — "
            f"currentColour state_of = {state_of.get(current_key)!r}, expected 'current'",
            file=sys.stderr,
        )
        ok = False
    if element_of.get(current_key) != {"item"} or element_of.get(link_key) != {"item"}:
        print(
            "[self-test] FAIL: breadcrumbs POSITIVE CONTROL — expected both "
            f"linkColour and currentColour to resolve element='item', got "
            f"link={element_of.get(link_key)!r} current={element_of.get(current_key)!r}",
            file=sys.stderr,
        )
        ok = False
    if current_key in state_of and link_key in state_of and state_of[current_key] == state_of.get(link_key):
        print(
            "[self-test] FAIL: breadcrumbs POSITIVE CONTROL — linkColour and "
            "currentColour must NOT collide (same element+state+property)",
            file=sys.stderr,
        )
        ok = False

    variant_css = (
        ".sgs-widget__price--current { color: var(--sgs-widget-price-colour); }\n"
        ".sgs-widget__price--regular { opacity: 0.7; }\n"
        ".sgs-widget__price--pct-off { font-weight: 700; }\n"
    )
    _out2, _grad2, _slot2, state_of2, element_of2 = _custom_props_consumed(
        variant_css, block_short_slug="widget"
    )
    price_key = ("--sgs-widget-price-colour", "color")
    if state_of2.get(price_key) is not None:
        print(
            "[self-test] FAIL: NEGATIVE CONTROL — price--current has a "
            f"sibling --regular/--pct-off modifier, so state_of must be None, "
            f"got {state_of2.get(price_key)!r}",
            file=sys.stderr,
        )
        ok = False
    if element_of2.get(price_key) != {"price"}:
        print(
            "[self-test] FAIL: NEGATIVE CONTROL — expected element='price', "
            f"got {element_of2.get(price_key)!r}",
            file=sys.stderr,
        )
        ok = False

    if ok:
        print(
            "[self-test] PASS: a lone `--current` BEM modifier resolves to "
            "css_state='current' (breadcrumbs, no collision with linkColour); "
            "a `--current` sharing its element with sibling modifiers "
            "(price--current/--regular/--pct-off) stays unmapped, not "
            "a fabricated 'current' state."
        )
    return ok


def _self_test_state_colour_helper_selector_yields_bem_element() -> bool:
    """`--self-test` fixture proving `_attrs_from_state_colour_helper_calls`
    (Shape D2, Cause A, root-cause report 2026-08-27) extracts BEM-element
    evidence from `sgs_emit_state_colour_css()`'s 1st-arg selector, mirroring
    sgs/card-grid's real `textColourHover` shape (card-grid/render.php:64-282):
    a `$hover_text = $attributes['textColourHover'] ?? '';` local, pushed into a
    decls array as `'color:' . sgs_colour_value($hover_text)` inside an
    `if ( $hover_text ) { ... }` guard, consumed by the helper call on a real
    `__item` sub-element selector in a LATER statement.

    POSITIVE CONTROL: the item-scoped call must yield css_element='item' for the
    attribute feeding its decls array.
    NEGATIVE CONTROL: the SAME helper called on a bare root selector (sgs/
    testimonial's real `quoteColourHover` shape, `render.php:524`) must yield NO
    element evidence — that is Cause C (root-scoped, no BEM element), explicitly
    out of scope for this fix. The root-cause report's Q3 explicitly warns "the
    helper's use does not predict Cause A vs Cause C" — this proves the two are
    told apart by the selector's own text, never by helper name or attr name.
    """
    ok = True
    fixture_php = (
        "<?php\n"
        "$hover_text = $attributes['textColourHover'] ?? '';\n"
        "$item_decls = array();\n"
        "if ( $hover_text ) {\n"
        "\t$item_decls[] = 'color:' . sgs_colour_value( $hover_text );\n"
        "}\n"
        "$out .= sgs_emit_state_colour_css( $root_sel . ' .sgs-selftest__item', array(), $item_decls );\n"
        "\n"
        "$quote_hover = $attributes['quoteColourHover'] ?? '';\n"
        "$quote_decls = array();\n"
        "if ( $quote_hover ) {\n"
        "\t$quote_decls[] = 'color:' . sgs_colour_value( $quote_hover );\n"
        "}\n"
        "$out .= sgs_emit_state_colour_css( $root_sel, array(), $quote_decls );\n"
    )
    attr_names = {"textColourHover", "quoteColourHover"}
    var_attr = _build_php_var_attr_map(fixture_php)
    elements = _attrs_from_state_colour_helper_calls(fixture_php, attr_names, "selftest", var_attr)

    if elements.get("textColourHover") != {"item"}:
        print(
            f"[self-test] FAIL: state-colour-helper elements['textColourHover'] = "
            f"{elements.get('textColourHover')!r}, expected {{'item'}} (POSITIVE "
            "control — the helper's selector arg names a real BEM sub-element)",
            file=sys.stderr,
        )
        ok = False
    if elements.get("quoteColourHover"):
        print(
            f"[self-test] FAIL: state-colour-helper elements['quoteColourHover'] = "
            f"{elements.get('quoteColourHover')!r}, expected no evidence (NEGATIVE "
            "control — a bare root selector carries no BEM element; this is "
            "Cause C, out of scope, and must never be guessed)",
            file=sys.stderr,
        )
        ok = False

    if ok:
        print(
            "[self-test] PASS: sgs_emit_state_colour_css() call sites now feed "
            "BEM element evidence for an item-scoped selector, and correctly "
            "feed none for a bare root selector."
        )
    return ok


def _self_test_cross_statement_selector_var_yields_bem_element() -> bool:
    """`--self-test` fixture proving `_build_php_selector_var_map` (Cause B,
    root-cause report 2026-08-27) traces a CSS SELECTOR held in a local variable
    assigned in one statement and consumed by NAME in a LATER statement,
    mirroring sgs/hero's real shape (`render.php:630,644`):
    `$sgs_hero_split_media_fit_selector` is assigned once from a literal
    concatenation containing `sgs-hero__split-media--image/--video`, then
    referenced by name inside a later `object-position` declaration wrapped in a
    Tablet `@media` block.

    POSITIVE CONTROL: the attr fed via the selector variable must resolve
    css_property='object-position' (already worked, via the existing
    shapes-B/C property tracer) AND the NEW css_element='split-media' evidence.
    NEGATIVE CONTROL: a property fed via a genuinely root-scoped selector
    (`$root_sel`, never assigned any BEM-bearing literal) must yield NO element
    evidence — proving this doesn't over-match every bare variable reference,
    only ones actually traced back to a BEM-bearing selector assignment.
    """
    ok = True
    fixture_php = (
        "<?php\n"
        "$position_tablet = $attributes['splitMediaObjectPositionTablet'] ?? '';\n"
        "$root_only_position = $attributes['positionX'] ?? '';\n"
        "$sgs_selftest_split_media_fit_selector = '.' . $uid . "
        "' .sgs-selftest__split-media--image,.' . $uid . ' .sgs-selftest__split-media--video';\n"
        "$out .= '@media (max-width:1023px){' . $sgs_selftest_split_media_fit_selector . "
        "'{object-position:' . $position_tablet . '}}';\n"
        "$out .= $root_sel . '{left:' . $root_only_position . '}';\n"
    )
    var_attr = _build_php_var_attr_map(fixture_php)
    known_css_props = frozenset({"object-position", "left"})
    raw_props, _raw_state, raw_element = _attr_to_raw_props_php(
        fixture_php, known_css_props, var_attr, "selftest"
    )

    if raw_props.get("splitMediaObjectPositionTablet") != {"object-position"}:
        print(
            f"[self-test] FAIL: cross-statement selector-var raw_props"
            f"['splitMediaObjectPositionTablet'] = "
            f"{raw_props.get('splitMediaObjectPositionTablet')!r}, expected "
            "{'object-position'} — css_property resolution must survive "
            "unchanged alongside the new css_element evidence",
            file=sys.stderr,
        )
        ok = False
    if raw_element.get("splitMediaObjectPositionTablet") != "split-media":
        print(
            f"[self-test] FAIL: cross-statement selector-var raw_element"
            f"['splitMediaObjectPositionTablet'] = "
            f"{raw_element.get('splitMediaObjectPositionTablet')!r}, expected "
            "'split-media' (POSITIVE control — the selector variable was "
            "assigned a literal containing the real BEM element)",
            file=sys.stderr,
        )
        ok = False
    if raw_element.get("positionX"):
        print(
            f"[self-test] FAIL: cross-statement selector-var raw_element"
            f"['positionX'] = {raw_element.get('positionX')!r}, expected no "
            "evidence (NEGATIVE control — fed via a bare $root_sel that was "
            "never assigned any BEM-bearing literal; must not be guessed)",
            file=sys.stderr,
        )
        ok = False

    if ok:
        print(
            "[self-test] PASS: a CSS selector held in a variable assigned in an "
            "earlier statement and consumed by name in a later one now feeds "
            "BEM element evidence, and a genuinely root-scoped variable "
            "correctly feeds none."
        )
    return ok


def _self_test_ancestor_hover_selector_var_does_not_leak_element() -> bool:
    """`--self-test` fixture proving the Cause B robustness guard: a selector
    variable used as an ANCESTOR-HOVER TRIGGER must NOT hand its own element to a
    LATER declaration whose real target is named by a separate, unresolved
    variable — mirroring sgs/post-grid's real `textColourHover` shape
    (render.php:531,564-575): `$post_grid_card_sel . ':hover' .
    $post_grid_hover_text_target . '{color:' . $hover_text . '}'`, where
    `$post_grid_hover_text_target` iterates a PHP array naming 4 real descendant
    elements (title link/excerpt/meta/read-more) this tracer cannot see.

    Found live during this fix's own verification pass (2026-08-27): the FIRST
    version of the cross-statement selector-var tracer (Cause B) let
    `$post_grid_card_sel`'s element ('card') survive past the unresolved
    `$post_grid_hover_text_target` reference and wrongly attributed
    `css_element='card'` to `textColourHover` — a WRONG value where the
    attribute previously, correctly, had NO element evidence at all. Per the
    root-cause report: "a wrong element is worse than NULL." This is the
    regression control for that exact bug.

    NEGATIVE CONTROL (the bug this proves is fixed): `textColourHover` must
    resolve NO css_element (honest gap — the real target is unrecoverable from
    this source shape), while still correctly resolving css_property='color'
    and css_state='hover' (unaffected — pre-existing, correct behaviour this fix
    must not disturb).
    POSITIVE CONTROL (proves the guard is scoped, not a blanket regression):
    `backgroundColourHover`, fed via the SAME `$post_grid_card_sel` selector
    variable with NO intervening unresolved variable, must still resolve
    css_element='card' — proving the guard only fires on a genuine intervening
    unknown, not on every use of a selector variable.
    """
    ok = True
    fixture_php = (
        "<?php\n"
        "$hover_bg = $attributes['backgroundColourHover'] ?? '';\n"
        "$hover_text = $attributes['textColourHover'] ?? '';\n"
        "$post_grid_card_sel = $root_sel . ' .sgs-selftest__card';\n"
        "$out .= sgs_emit_state_colour_css( $post_grid_card_sel, array(), "
        "array( 'background-color:' . $hover_bg ) );\n"
        "$post_grid_hover_text_targets = array( ' .sgs-selftest__title a', "
        "' .sgs-selftest__excerpt' );\n"
        "foreach ( $post_grid_hover_text_targets as $post_grid_hover_text_target ) {\n"
        "\t$out .= $post_grid_card_sel . ':hover' . $post_grid_hover_text_target . "
        "'{color:' . $hover_text . '}';\n"
        "}\n"
    )
    var_attr = _build_php_var_attr_map(fixture_php)
    known_css_props = frozenset({"background-color", "color"})
    raw_props, raw_state, raw_element = _attr_to_raw_props_php(
        fixture_php, known_css_props, var_attr, "selftest"
    )

    if raw_element.get("textColourHover"):
        print(
            f"[self-test] FAIL: ancestor-hover raw_element['textColourHover'] = "
            f"{raw_element.get('textColourHover')!r}, expected no evidence "
            "(NEGATIVE control — the real target is one of several descendants "
            "named inside a PHP array this tracer cannot see; the trigger "
            "selector's own element must not leak onto it)",
            file=sys.stderr,
        )
        ok = False
    if raw_props.get("textColourHover") != {"color"} or raw_state.get("textColourHover") != "hover":
        print(
            f"[self-test] FAIL: ancestor-hover textColourHover css_property/"
            f"css_state = {raw_props.get('textColourHover')!r}/"
            f"{raw_state.get('textColourHover')!r}, expected 'color'/'hover' "
            "(pre-existing correct behaviour must survive the guard)",
            file=sys.stderr,
        )
        ok = False
    if raw_element.get("backgroundColourHover") != "card":
        print(
            f"[self-test] FAIL: ancestor-hover raw_element"
            f"['backgroundColourHover'] = "
            f"{raw_element.get('backgroundColourHover')!r}, expected 'card' "
            "(POSITIVE control — no intervening unresolved variable here, so "
            "the guard must not fire and the selector-var element must survive)",
            file=sys.stderr,
        )
        ok = False

    if ok:
        print(
            "[self-test] PASS: an ancestor-hover-trigger selector variable no "
            "longer leaks its own element onto a later declaration whose real "
            "target is named by an unresolved variable, while a genuine "
            "direct use of the same selector variable is unaffected."
        )
    return ok


def _self_test_helper_call_selector_var_yields_bem_element() -> bool:
    """`--self-test` fixture proving `_attrs_from_helper_calls` (Shape D) now
    wires the Cause B selector-variable resolver (`_build_php_selector_var_map`)
    into its OWN selector-argument handling — closing the gap found live on
    sgs/nav-menu: `itemBg`/`itemColour`/`itemRadius` (Cause A,
    `_attrs_from_state_colour_helper_calls`) flipped to `css_element='link'`,
    but the fourth "item"-prefixed attribute, `itemFontSize`, is applied via
    the SAME `$link_sel` variable through the ALREADY-allowlisted
    `sgs_typography_css_rule` helper (render.php:829,833):
      `$link_sel = $uid_sel . ' .sgs-nav-menu__link';`
      `$css .= sgs_typography_css_rule( $attributes, 'item', $link_sel );`
    Before this fix, `_attrs_from_helper_calls` only ever tried
    `_derive_bem_element_from_selector` directly on the raw argument text — a
    bare `$link_sel` reference carries no literal BEM substring of its own, so
    it always fell through to no element evidence, regardless of what Cause B
    could otherwise resolve.

    POSITIVE CONTROL: `itemFontSize`, fed via `$link_sel` (assigned a literal
    containing `sgs-selftest__link` in an earlier statement), must resolve
    css_element='link' AND keep its pre-existing css_property='font-size'
    evidence unchanged.
    NEGATIVE CONTROL: `labelFontSize`, fed via `$unassigned_sel` (never
    assigned any literal selector anywhere in the fixture — the Cause C /
    "genuinely unresolvable" shape), must still yield NO element evidence —
    proving the wiring only resolves a variable Cause B can actually trace,
    never guesses at an unknown one.
    """
    ok = True
    fixture_php = (
        "<?php\n"
        "$css = '';\n"
        "$link_sel = $uid_sel . ' .sgs-selftest__link';\n"
        "$css .= sgs_typography_css_rule( $attributes, 'item', $link_sel );\n"
        "$css .= sgs_typography_css_rule( $attributes, 'label', $unassigned_sel );\n"
    )
    attr_names = {"itemFontSize", "labelFontSize"}
    props, elements = _attrs_from_helper_calls(fixture_php, attr_names, "selftest")

    if props.get("itemFontSize") != {"font-size"}:
        print(
            f"[self-test] FAIL: helper-call-selector-var props['itemFontSize'] = "
            f"{props.get('itemFontSize')!r}, expected {{'font-size'}} — "
            "css_property resolution must survive unchanged alongside the new "
            "css_element evidence",
            file=sys.stderr,
        )
        ok = False
    if elements.get("itemFontSize") != {"link"}:
        print(
            f"[self-test] FAIL: helper-call-selector-var elements['itemFontSize'] "
            f"= {elements.get('itemFontSize')!r}, expected {{'link'}} (POSITIVE "
            "control — a selector variable assigned a literal BEM-bearing "
            "selector in an earlier statement must now resolve, mirroring "
            "sgs/nav-menu's real $link_sel shape)",
            file=sys.stderr,
        )
        ok = False
    if elements.get("labelFontSize"):
        print(
            f"[self-test] FAIL: helper-call-selector-var elements['labelFontSize'] "
            f"= {elements.get('labelFontSize')!r}, expected no evidence (NEGATIVE "
            "control — a selector variable never assigned any literal selector "
            "must not be guessed at)",
            file=sys.stderr,
        )
        ok = False

    if ok:
        print(
            "[self-test] PASS: Shape D helper-call selector args now resolve a "
            "bare selector VARIABLE through Cause B's cross-statement tracer "
            "when that variable was assigned a literal BEM-bearing selector, "
            "and correctly feed no evidence for one that was never assigned."
        )
    return ok


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if "--self-test" in sys.argv:
        results = [
            _self_test_multi_element_var_is_not_collapsed(),
            _self_test_helper_call_selector_yields_bem_element(),
            _self_test_bem_modifier_is_not_an_element(),
            _self_test_bem_current_modifier_is_state_aware(),
            _self_test_state_colour_helper_selector_yields_bem_element(),
            _self_test_cross_statement_selector_var_yields_bem_element(),
            _self_test_ancestor_hover_selector_var_does_not_leak_element(),
            _self_test_helper_call_selector_var_yields_bem_element(),
        ]
        sys.exit(0 if all(results) else 1)

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
        print("  with NO word in the element-manifest vocabulary (only 'hover'/'current'")
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
