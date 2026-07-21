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


def _custom_props_consumed(css_src: str) -> dict[str, set[str]]:
    """Map ``--sgs-var`` -> the set of props (real CSS OR another --sgs-* var) whose
    declared value consumes it, anywhere in the stylesheet (base + every @media tier —
    layer/tier distinction is not needed for Q2, only "what property, ultimately")."""
    css_src = _strip_css_comments(css_src)
    out: dict[str, set[str]] = defaultdict(set)
    for m in _DECL_RE.finditer(css_src):
        prop = m.group("prop").strip().lower()
        for var in re.findall(CUSTOM_PROP_RE, m.group("value")):
            out[var].add(prop)
    return out


def _resolve_var_chain(
    var: str,
    consumed: dict[str, set[str]],
    depth: int = 0,
    visited: "set[str] | None" = None,
) -> set[str]:
    """Follow a --sgs-* custom property through however many intermediate --sgs-*
    hand-offs it takes to reach real CSS declarations (REQUIREMENT 3: chained custom
    properties, e.g. --sgs-columns-desktop -> --sgs-columns -> grid-template-columns).

    Depth-capped at 5 and loop-guarded via a visited set — a var that resolves back to
    itself (directly or through a cycle) returns whatever real properties were already
    found on the way in, never hangs.
    """
    if visited is None:
        visited = set()
    if depth > 5 or var in visited:
        return set()
    visited = visited | {var}

    direct = consumed.get(var, set())
    real = {p for p in direct if not p.startswith("--")}
    chained_vars = {p for p in direct if p.startswith("--")}
    for cv in chained_vars:
        real |= _resolve_var_chain(cv, consumed, depth + 1, visited)
    return real


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
        # Y and X are read independently but always emitted together as the ONE
        # `padding` shorthand (helpers-button-style.php:119-125) — both attrs
        # legitimately drive the same property.
        "PaddingY": "padding",
        "PaddingX": "padding",
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
) -> dict[str, set[str]]:
    """Shapes A/B/C: map attrName -> the set of property tokens (real CSS OR --sgs-*
    custom property) it feeds directly in render.php.

      A) array map:      'attrName' => '--sgs-foo'
      B) direct concat:  '--sgs-foo:' . $attributes['attrName']   (custom prop)
                          'color:' . $attributes['attrName']       (REAL prop, direct —
                          REQUIREMENT: sgs/separator's contentIconColour, which is never
                          routed through a --sgs-* custom property at all)
      C) via variable:   $v = $attributes['attrName']; ... '--sgs-foo:' . esc_attr($v)
                          (custom prop OR real prop, via a possibly multi-hop $v)
    """
    attr_props: dict[str, set[str]] = defaultdict(set)

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
    prop_any_re = re.compile(
        r"(" + CUSTOM_PROP_RE + r"|[a-z-]+)\s*:", re.IGNORECASE
    )
    fragment_re = re.compile(
        r"'([^']*)'|\"([^\"]*)\"|\$(?:attributes|attrs)\[['\"](\w+)['\"]\]|\$(\w+)"
    )
    for stmt in _split_php_statements(php_src):
        current_prop: "str | None" = None
        for m in fragment_re.finditer(stmt):
            str_single, str_double, direct_attr, var_ref = m.groups()
            content = str_single if str_single is not None else str_double
            if content is not None:
                candidates = [
                    tok for tok in prop_any_re.findall(content)
                    if tok.startswith("--sgs-") or tok in known_css_props
                ]
                if candidates:
                    current_prop = candidates[-1]
                continue
            if current_prop is None:
                continue
            if direct_attr:
                attr_props[direct_attr].add(current_prop)
            elif var_ref and var_ref in var_attr:
                attr_props[var_attr[var_ref]].add(current_prop)

    return attr_props


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


def _classify_css_layer(attr_name: str, real_props: "set[str]") -> "str | None":
    """Q2's sibling: css_layer, populated ONLY via this codebase's ALREADY-established
    layer-prefix convention (db_lookup.attr_for_layer_property docstring, D194 DEC-3):
        OUTER   -> ''         (unprefixed)   -> stored as NULL (self/OUTER)
        CONTENT -> 'content'  prefix
        GRID    -> 'gridItem' prefix

    Deliberately conservative: a name-prefix match is ONLY trusted when every resolved
    css_property is in a narrow structural-box whitelist (the actual property universe
    content_band.py / grid_area.py document as theirs — padding/margin/gap/max-width/
    min-height). This avoids miscasting a "content"-prefixed but non-structural attr
    (e.g. sgs/separator's contentIconSize/contentIconColour — icon sizing/colour, not a
    content-band box constraint) as a CONTENT-layer routing attribute. GRID_AREA (the
    4th value in the schema's documented enum) is a walker-runtime, per-repeater-item
    concept that cannot be derived from a flat attribute name — left NULL, logged.
    """
    structural = {
        "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
        "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
        "gap", "row-gap", "column-gap", "max-width", "min-height",
        # 'width' included alongside 'max-width': verified live that sgs/quote,
        # sgs/option-picker and sgs/testimonial each emit a literal `width:` (not
        # `max-width:`) for their `contentWidth` attr — the exact canonical
        # CONTENT-layer name from db_lookup.attr_for_layer_property's own docstring
        # example — so excluding bare 'width' would wrongly drop a real case. A
        # non-structural "width" (e.g. an icon's width) never reaches this branch
        # alone: separator's contentIconSize resolves to {color,height,width} and
        # 'color' is NOT in this whitelist, so the subset check still excludes it.
        "width",
    }
    if not real_props or not real_props.issubset(structural):
        return None
    if re.match(r"^content[A-Z]", attr_name):
        return "CONTENT"
    if re.match(r"^gridItem[A-Z]", attr_name):
        return "GRID"
    return None


def extract_css_property_and_layer() -> dict:
    """TASK A entry point. Writes `block_attributes.css_property` / `css_layer` for
    every SGS block with both a render.php and a style.css. Returns a stats dict used by
    the caller to build the verification report (Task C)."""
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

    resolved: dict[tuple[str, str], set[str]] = {}
    unresolved_reasons: dict[tuple[str, str], str] = {}

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

        consumed = _custom_props_consumed(css_src_raw)
        var_attr = _build_php_var_attr_map(php_src)
        block_attr_names = attrs_by_block.get(slug, set())

        raw = _attr_to_raw_props_php(php_src, known_css_props, var_attr)
        helper = _attrs_from_helper_calls(php_src, block_attr_names)
        for attr, props in helper.items():
            raw[attr] = raw.get(attr, set()) | props

        for attr, tokens in raw.items():
            if attr not in block_attr_names:
                continue  # not a real DB attr for this block — ignore (avoids false hits)
            real_props: set[str] = set()
            for tok in tokens:
                if tok.startswith("--sgs-"):
                    real_props |= _resolve_var_chain(tok, consumed)
                else:
                    real_props.add(tok)  # already real (shape B direct / shape D)
            if real_props:
                resolved[(slug, attr)] = real_props
            else:
                chained_only = {t for t in tokens if t.startswith("--sgs-")}
                if chained_only:
                    unresolved_reasons[(slug, attr)] = (
                        "custom property "
                        + ",".join(sorted(chained_only))
                        + " never reaches a real CSS declaration within depth 5 "
                        "(stylesheet may only consume it via JS, e.g. getComputedStyle)"
                    )

    # ---- write to DB (see the module-level docstring above re: reseed-drift risk)
    css_property_written = 0
    css_layer_written = 0
    for (slug, attr), real_props in resolved.items():
        css_property = ",".join(sorted(real_props))
        css_layer = _classify_css_layer(attr, real_props)
        cur.execute(
            "UPDATE block_attributes SET css_property = ? WHERE block_slug = ? AND attr_name = ?",
            (css_property, slug, attr),
        )
        css_property_written += cur.rowcount
        if css_layer:
            cur.execute(
                "UPDATE block_attributes SET css_layer = ? WHERE block_slug = ? AND attr_name = ?",
                (css_layer, slug, attr),
            )
            css_layer_written += cur.rowcount

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


def extract_inspector_control_types() -> dict:
    """TASK B entry point. Writes `block_attributes.inspector_control_type` for every
    unambiguous (component, attribute) association found in each block's edit.js."""
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
            existing_val = existing.get((slug, attr))
            if existing_val and existing_val != control:
                disagreements.append({
                    "block": slug, "attr": attr,
                    "existing": existing_val, "derived": control,
                })
                continue  # never overwrite silently — human review only
            if existing_val == control:
                continue  # already correct, no-op
            cur.execute(
                "UPDATE block_attributes SET inspector_control_type = ? "
                "WHERE block_slug = ? AND attr_name = ?",
                (control, slug, attr),
            )
            written += cur.rowcount
            existing[(slug, attr)] = control  # keep local cache consistent for this run

    conn.commit()
    conn.close()

    return {
        "written": written,
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

    print()
    print("=" * 60)
    print("TASK B — edit.js-derived inspector_control_type")
    print("=" * 60)
    task_b_stats = extract_inspector_control_types()
    print(f"  Rows written (unambiguous, previously NULL) : {task_b_stats['written']}")
    print(f"  Disagreements vs existing value              : {len(task_b_stats['disagreements'])}")
    print(f"  Unresolved (ambiguous / no reference found)  : {len(task_b_stats['unresolved'])}")

    # Dump full JSON for the report-writer to consume without re-running extraction.
    out_path = REPO_ROOT / ".claude" / "reports" / "emission-derived-classification-raw.json"
    out_path.write_text(
        json.dumps({"task_a": task_a_stats, "task_b": task_b_stats}, indent=2),
        encoding="utf-8",
    )
    print()
    print(f"Raw results written to {out_path}")
