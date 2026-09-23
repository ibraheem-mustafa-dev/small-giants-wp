#!/usr/bin/env python3
"""
check-shadow-sources.py — the shadow-source detector (D4/D5 follow-on, survey stage).

Design: `.claude/reports/2026-09-23-shadow-tone-design.md` (D4, D5 and the Council
section). Precedent for the survey/fix/check/self-test shape: `dedupe-shadow-colour-rows.py`
and `fanout-overlay-sibling-attrs.py`.

WHAT THIS SCRIPT DOES:

  1. CSS literals — every `box-shadow:` and `filter:`/`-webkit-filter:` containing
     `drop-shadow(` in `src/blocks/*/style.css` (editor.css excluded) plus the theme's own
     CSS. Each layer's colour is classified (`site-var` / `preset-var` / `black-literal` /
     `brand` / `currentColor` / `custom-var`), and whether the SAME rule or a
     `@media (forced-colors:active)` block in the same file covers it with an outline/border
     on the same selector.
  2. `text-shadow` — counted, never flagged (out of scope by design).
  3. PHP emitters — calls to `sgs_shadow_box_decls`, `sgs_shadow_decls`,
     `sgs_shadow_value_composed`, `sgs_shadow_layers`, `wp_style_engine_get_styles` with a
     `shadow` key, and literal `box-shadow:` / `drop-shadow(` string building in
     `includes/*.php` and `src/blocks/*/render.php`. A value written into a custom property
     is traced to the CSS that consumes it and judged there.
  4. `supports.shadow` in `src/blocks/*/block.json` — whether render.php appends the fallback
     where it scopes the style-engine shadow.
  5. The `is-style-elevated` variations under `includes/variations/` that reference
     `--wp--custom--shadow--*` — flagged `undefined-variable` when no theme.json or
     `sites/*/theme-snapshot.json` declares `settings.custom.shadow`.

A VIOLATION (for `--check`) is one of:
  - a `black-literal` colour layer anywhere (it cannot follow the dark scope)
  - a source whose forced-colours fallback does not reach it
  - an `undefined-variable` variation
`brand`, `currentColor`, `preset-var` and `site-var` layers are never colour violations.

    python scripts/check-shadow-sources.py --survey       table + writes reports/shadow-sources-survey.json
    python scripts/check-shadow-sources.py --fix           deterministic CSS rewrite (colour + forced-colours); reports exemptions
    python scripts/check-shadow-sources.py --check         gate: exit 1 on any NEW violation, ratcheted against shadow-sources-baseline.json
    python scripts/check-shadow-sources.py --self-test     fixtures prove every rule, incl. a disabled-rule control

`--fix` only ever writes CSS (`src/blocks/*/style.css` except `google-reviews`, plus the
theme's own CSS) -- never a PHP file. `--check`'s baseline ratchet (`shadow-sources-baseline.json`,
precedent `editor-render-parity-baseline.json`) lists findings allowed to remain (google-reviews'
un-touched findings, plus anything genuinely un-fixable): a NEW finding not in the baseline fails
the gate, and so does a stale baseline entry that no longer occurs (the baseline can only shrink).

An existing code convention this detector honours: a `// sgs-shadow-fallback: <reason>`
comment within a few lines of a raw shadow write is a recorded, reviewed exemption (the
resting rule elsewhere on the same selector already carries the fallback) — found live at
`class-sgs-container-wrapper.php`, `helpers-colour-variants.php`, `sgs-header-float-css.php`,
`mega-panel/render.php` and `trust-bar/render.php`. The detector reports these as EXEMPT, not
as violations, but always with the reason text so a reviewer can see why.

UK English throughout. `--survey`, `--check` and `--self-test` only ever READ files. `--fix`
is the one mode that writes, and only to CSS (`src/blocks/*/style.css` except google-reviews,
plus the theme's CSS) -- it never touches a PHP file.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
HERE = Path(__file__).resolve().parent               # plugins/sgs-blocks/scripts/
PLUGIN = HERE.parent                                  # plugins/sgs-blocks/
ROOT = PLUGIN.parents[1]                              # small-giants-wp/
THEME = ROOT / "theme" / "sgs-theme"
BLOCKS_DIR = PLUGIN / "src" / "blocks"
INCLUDES_DIR = PLUGIN / "includes"
VARIATIONS_DIR = INCLUDES_DIR / "variations"
SITES_DIR = ROOT / "sites"
REPORTS_DIR = PLUGIN / "reports"
FIXTURES_DIR = HERE / "fixtures" / "shadow-sources"

SURVEY_JSON = REPORTS_DIR / "shadow-sources-survey.json"
BASELINE_JSON = HERE / "shadow-sources-baseline.json"

TARGET_PHP_FUNCS = (
    "sgs_shadow_box_decls",
    "sgs_shadow_decls",
    "sgs_shadow_value_composed",
    "sgs_shadow_layers",
)
WRAPPER_SAFE_FUNCS = ("sgs_shadow_box_decls", "sgs_shadow_decls")

IGNORE_VALUES = {"none", "inherit", "initial", "unset"}


# ---------------------------------------------------------------------------
# Colour classification
# ---------------------------------------------------------------------------
SITE_VAR_RE = re.compile(r"var\(\s*--wp--custom--shadow-colour\b")
PRESET_VAR_WHOLE_RE = re.compile(r"^var\(\s*--wp--preset--shadow--[\w-]+\s*(?:,.*)?\)$")
BLACK_RE = re.compile(
    r"(?i)#000(?:000)?(?:[0-9a-f]{2})?\b"
    r"|rgba?\(\s*0\s*,\s*0\s*,\s*0\s*(?:,\s*[\d.]+\s*)?\)"
    r"|rgb\(\s*0\s+0\s+0\s*(?:/\s*[\d.%]+\s*)?\)"
    r"|\bblack\b"
)
CURRENTCOLOUR_RE = re.compile(r"(?i)\bcurrentcolor\b")
PALETTE_VAR_RE = re.compile(r"var\(\s*--wp--preset--colou?r--[\w-]+")
ANY_VAR_RE = re.compile(r"var\(\s*(--[\w-]+)")
HEX_RE = re.compile(r"#[0-9a-fA-F]{3,8}\b")
RGB_HSL_FUNC_RE = re.compile(r"\brgba?\(|\bhsla?\(")


def classify_layer_colour(layer: str, *, black_literal_enabled: bool = True) -> str:
    """Classify one shadow layer's colour token. Order is load-bearing: a layer that
    resolves the site colour or a whole shadow preset is never re-classified as black
    just because its declared FALLBACK inside color-mix()/var() happens to read black."""
    stripped = layer.strip()
    if SITE_VAR_RE.search(stripped):
        return "site-var"
    if PRESET_VAR_WHOLE_RE.match(stripped):
        return "preset-var"
    if black_literal_enabled and BLACK_RE.search(stripped):
        return "black-literal"
    if CURRENTCOLOUR_RE.search(stripped):
        return "currentColor"
    if PALETTE_VAR_RE.search(stripped):
        return "brand"
    m = ANY_VAR_RE.search(stripped)
    if m:
        return "custom-var"
    if HEX_RE.search(stripped) or RGB_HSL_FUNC_RE.search(stripped):
        return "brand"
    return "unclassified"


# ---------------------------------------------------------------------------
# Small parsing helpers shared by CSS and PHP scanning
# ---------------------------------------------------------------------------
def split_top_level(value: str, sep: str) -> list[str]:
    """Split on `sep` at paren-depth 0 only."""
    out: list[str] = []
    depth = 0
    cur: list[str] = []
    for ch in value:
        if ch == "(":
            depth += 1
            cur.append(ch)
        elif ch == ")":
            depth = max(0, depth - 1)
            cur.append(ch)
        elif ch == sep and depth == 0:
            out.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
    out.append("".join(cur))
    return out


def split_top_level_with_offsets(value: str, sep: str) -> list[tuple[str, int]]:
    out: list[tuple[str, int]] = []
    depth = 0
    cur: list[str] = []
    start = 0
    for i, ch in enumerate(value):
        if ch == "(":
            depth += 1
            cur.append(ch)
        elif ch == ")":
            depth = max(0, depth - 1)
            cur.append(ch)
        elif ch == sep and depth == 0:
            out.append(("".join(cur), start))
            cur = []
            start = i + 1
        else:
            cur.append(ch)
    out.append(("".join(cur), start))
    return out


def extract_calls(value: str, fn: str) -> list[str]:
    """Every balanced-paren argument list of `fn(...)` inside `value` (handles nested parens,
    e.g. `drop-shadow(0 1px 2px color-mix(in srgb, red 40%, transparent))`)."""
    out: list[str] = []
    idx = 0
    needle = fn + "("
    while True:
        i = value.find(needle, idx)
        if i == -1:
            break
        open_pos = i + len(needle) - 1
        depth = 0
        j = open_pos
        while j < len(value):
            if value[j] == "(":
                depth += 1
            elif value[j] == ")":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        out.append(value[open_pos + 1 : j])
        idx = j + 1
    return out


def classify_declaration(prop: str, value: str, *, black_literal_enabled: bool = True) -> list[tuple[str, str]]:
    """[(layer_text, colour_class), ...] for a box-shadow/filter declaration. [] when the
    value is one of the ignored keywords or (for filter) carries no drop-shadow()."""
    value = value.strip()
    bare_value = re.sub(r"(?i)\s*!\s*important\s*$", "", value).strip()
    if bare_value.lower() in IGNORE_VALUES:
        return []
    prop_l = prop.lower()
    if prop_l == "box-shadow":
        layers = split_top_level(bare_value, ",")
        return [
            (layer.strip(), classify_layer_colour(layer, black_literal_enabled=black_literal_enabled))
            for layer in layers
            if layer.strip()
        ]
    if prop_l in ("filter", "-webkit-filter"):
        calls = extract_calls(bare_value, "drop-shadow")
        return [
            (call.strip(), classify_layer_colour(call, black_literal_enabled=black_literal_enabled))
            for call in calls
        ]
    return []


# ---------------------------------------------------------------------------
# CSS block parsing (comment-safe, brace-depth, forced-colours aware)
# ---------------------------------------------------------------------------
COMMENT_RE = re.compile(r"/\*.*?\*/", re.S)


def strip_comments_preserve_length(text: str) -> str:
    def repl(m: re.Match) -> str:
        return "".join(ch if ch == "\n" else " " for ch in m.group(0))

    return COMMENT_RE.sub(repl, text)


def parse_css_blocks(clean_text: str) -> list[dict]:
    """Every `{...}` block, with a parent link and a start/end into `clean_text`."""
    blocks: list[dict] = []
    stack: list[dict] = []
    sel_start = 0
    for i, ch in enumerate(clean_text):
        if ch == "{":
            selector = clean_text[sel_start:i]
            parent = stack[-1] if stack else None
            b = {"selector": selector, "start": i + 1, "parent": parent, "children": []}
            if parent is not None:
                parent["children"].append(b)
            stack.append(b)
            blocks.append(b)
            sel_start = i + 1
        elif ch == "}":
            if stack:
                b = stack.pop()
                b["end"] = i
            sel_start = i + 1
    for b in blocks:
        b.setdefault("end", len(clean_text))
    return blocks


def own_text_with_map(block: dict, original: str) -> tuple[str, list[tuple[int, int, int]]]:
    """A block's own declaration text (nested blocks' bodies excluded) plus a segment map
    of (own_offset, original_offset, length) so a position inside `own` can be traced back
    to a real line number in `original`."""
    parts: list[str] = []
    seg_map: list[tuple[int, int, int]] = []
    cursor = block["start"]
    own_pos = 0
    for child in sorted(block["children"], key=lambda c: c["start"]):
        seg = original[cursor : child["start"] - 1]
        parts.append(seg)
        seg_map.append((own_pos, cursor, len(seg)))
        own_pos += len(seg)
        cursor = child["end"] + 1
    seg = original[cursor : block["end"]]
    parts.append(seg)
    seg_map.append((own_pos, cursor, len(seg)))
    return "".join(parts), seg_map


def map_own_offset(seg_map: list[tuple[int, int, int]], own_offset: int) -> int:
    for own_start, orig_start, length in seg_map:
        if own_start <= own_offset < own_start + length:
            return orig_start + (own_offset - own_start)
    if seg_map:
        own_start, orig_start, length = seg_map[-1]
        return orig_start + length
    return 0


FORCED_COLOURS_RE = re.compile(r"@media[^{]*forced-colors\s*:\s*active", re.I)
# The declared PROPERTY NAME only (never the value) — `border-radius`/`border-top-left-radius`
# etc. are deliberately excluded: a radius with no width/style/colour draws no visible edge at
# all, so it is not a real outline/border fallback under forced-colors.
DECLARATION_PROP_RE = re.compile(r"(?:^|;)\s*([\w-]+)\s*:")


def in_forced_colours(block: dict) -> bool:
    node: dict | None = block
    while node is not None:
        if FORCED_COLOURS_RE.search(node["selector"]):
            return True
        node = node["parent"]
    return False


def normalise_selector(sel: str) -> str:
    return re.sub(r"\s+", " ", sel.strip())


def declares_outline_or_border(text: str) -> bool:
    for m in DECLARATION_PROP_RE.finditer(text):
        name = m.group(1).lower()
        if "radius" in name:
            continue
        if name == "outline" or name.startswith("outline-") or name == "border" or name.startswith("border-"):
            return True
    return False


def forced_colours_covered_css(all_blocks: list[dict], shadow_block: dict, shadow_own: str,
                                 own_text_cache: dict[int, str]) -> bool:
    if declares_outline_or_border(shadow_own):
        return True
    target = normalise_selector(shadow_block["selector"])
    for b in all_blocks:
        if b is shadow_block or not in_forced_colours(b):
            continue
        if normalise_selector(b["selector"]) != target:
            continue
        text = own_text_cache.get(id(b))
        if text is not None and declares_outline_or_border(text):
            return True
    return False


def scan_css_text(original: str, relpath: str, *, black_literal_enabled: bool = True) -> tuple[list[dict], int]:
    """Return (shadow sources, text-shadow count) for one CSS file's text."""
    clean = strip_comments_preserve_length(original)
    blocks = parse_css_blocks(clean)
    own_cache: dict[int, str] = {}
    seg_cache: dict[int, list[tuple[int, int, int]]] = {}
    for b in blocks:
        own, seg = own_text_with_map(b, original)
        own_cache[id(b)] = own
        seg_cache[id(b)] = seg

    results: list[dict] = []
    text_shadow_count = 0
    for b in blocks:
        own = own_cache[id(b)]
        for raw_decl, offset in split_top_level_with_offsets(own, ";"):
            stripped = raw_decl.strip()
            if not stripped or ":" not in stripped:
                continue
            prop_part, _, value_part = stripped.partition(":")
            prop = prop_part.strip().lower()
            if prop == "text-shadow":
                text_shadow_count += 1
                continue
            if prop not in ("box-shadow", "filter", "-webkit-filter"):
                continue
            layers = classify_declaration(prop, value_part, black_literal_enabled=black_literal_enabled)
            if not layers:
                continue
            leading_ws = len(raw_decl) - len(raw_decl.lstrip())
            orig_offset = map_own_offset(seg_cache[id(b)], offset + leading_ws)
            line_no = original.count("\n", 0, orig_offset) + 1
            covered = forced_colours_covered_css(blocks, b, own, own_cache)
            bare_for_exempt = re.sub(r"(?i)\s*!\s*important\s*$", "", value_part.strip()).strip()
            is_filter_prop = prop in ("filter", "-webkit-filter")
            is_inset = "inset" in bare_for_exempt.lower()
            exempt = is_filter_prop or is_inset
            if is_filter_prop:
                exempt_reason = (
                    "drop-shadow() renders through `filter`, which forced-colours mode does not "
                    "strip (CSS Color Adjust) -- no outline fallback is needed"
                )
            elif is_inset:
                exempt_reason = "inset shadow used as an inner line -- reported, never auto-fixed"
            else:
                exempt_reason = ""
            results.append(
                {
                    "file": relpath,
                    "line": line_no,
                    "selector": normalise_selector(b["selector"]),
                    "property": prop,
                    "declaration": stripped + ";",
                    "layers": [{"text": t, "colour": c} for t, c in layers],
                    "forced_colours_covered": covered,
                    "has_black_literal": any(c == "black-literal" for _, c in layers),
                    "exempt": exempt,
                    "exempt_reason": exempt_reason,
                }
            )
    return results, text_shadow_count


def css_targets() -> list[Path]:
    files = sorted(BLOCKS_DIR.glob("*/style.css"))
    if (THEME / "assets" / "css").is_dir():
        files += sorted((THEME / "assets" / "css").glob("*.css"))
    if (THEME / "style.css").exists():
        files.append(THEME / "style.css")
    return files


def scan_all_css() -> tuple[list[dict], int]:
    results: list[dict] = []
    text_shadow_total = 0
    for path in css_targets():
        text = path.read_text(encoding="utf-8")
        relpath = path.relative_to(ROOT).as_posix()
        found, ts = scan_css_text(text, relpath)
        results.extend(found)
        text_shadow_total += ts
    return results, text_shadow_total


# ---------------------------------------------------------------------------
# PHP emitter scanning
# ---------------------------------------------------------------------------
PHP_BLOCK_COMMENT_RE = re.compile(r"/\*.*?\*/", re.S)
PHP_LINE_COMMENT_RE = re.compile(r"(?://|#)[^\n]*")


def strip_php_comments_preserve_length(text: str) -> str:
    """Blank out PHP comments (keeping length and newlines intact, so every match position
    found against the result still maps 1:1 onto the ORIGINAL text's line numbers). A docblock
    mentioning `sgs_shadow_value_composed()` in prose must never be mistaken for a real call —
    every regex below that looks for a CALL or a WRITE runs against this code-only text; the
    exemption-comment search deliberately runs against the real lines instead (the exemption
    marker IS a comment)."""
    text = PHP_BLOCK_COMMENT_RE.sub(lambda m: "".join(ch if ch == "\n" else " " for ch in m.group(0)), text)
    text = PHP_LINE_COMMENT_RE.sub(lambda m: " " * len(m.group(0)), text)
    return text


EXEMPTION_RE = re.compile(r"sgs-shadow-fallback:\s*(.+)")
CALL_RE = re.compile(r"\b(" + "|".join(TARGET_PHP_FUNCS) + r")\s*\(")
STYLE_ENGINE_RE = re.compile(r"\bwp_style_engine_get_styles\s*\(\s*\$(\w+)")
FORCED_DECL_CALL_RE = re.compile(r"\bsgs_shadow_forced_colours_decl\s*\(")
ASSIGN_VAR_RE = re.compile(r"\$(\w+)\s*=\s*$")
CUSTOM_PROP_SINK_RE = re.compile(r"""(['"])(--[\w-]+):[ \t]*\1\s*\.\s*\$(\w+)\b""")
CUSTOM_PROP_PREFIX_RE = re.compile(r"""(['"])(--[\w-]+):[ \t]*\1\s*\.\s*$""")
BOX_SHADOW_PREFIX_RE = re.compile(r"""box-shadow\s*:\s*['"]?\s*\.\s*$|['"]box-shadow:['"]\s*\.\s*$""")
STRING_LITERAL_BOX_SHADOW_RE = re.compile(r"""(['"])([^'"]*?box-shadow:[^'"]*?)\1""")
DROP_SHADOW_EXEMPT_REASON = (
    "drop-shadow() renders through `filter`, which forced-colours mode does not remove "
    "(CSS Color Adjust forces only box-shadow and text-shadow to none), so it needs no outline fallback"
)
STRING_LITERAL_DROP_SHADOW_RE = re.compile(r"""(['"])([^'"]*?drop-shadow\([^'"]*?)\1""")
SHADOW_KEY_ASSIGN_TMPL = r"\$%s\s*\[\s*'shadow'\s*\]\s*="
FUNC_DEF_PRECEDING_RE = re.compile(r"\bfunction\s*$")


def line_of(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def is_function_definition(code: str, match_start: int) -> bool:
    """True when `code[match_start]` opens a `function name(...)` DEFINITION rather than a
    call — e.g. `function sgs_shadow_layers( ?string $shape ): string {` in the function's
    own home file, which CALL_RE would otherwise mistake for a caller."""
    return bool(FUNC_DEF_PRECEDING_RE.search(code[max(0, match_start - 20) : match_start]))


def find_exemption(lines: list[str], line_no: int, *, window: int = 4) -> tuple[bool, str]:
    start = max(0, line_no - 1 - window)
    for i in range(start, line_no):
        m = EXEMPTION_RE.search(lines[i])
        if m:
            return True, m.group(1).strip()
    return False, ""


def detect_assignment_var(text: str, match_start: int) -> str | None:
    line_start = text.rfind("\n", 0, match_start) + 1
    before = text[line_start:match_start]
    m = ASSIGN_VAR_RE.search(before)
    return m.group(1) if m else None


def find_var_sink(code: str, var_name: str, after_pos: int, *, window_chars: int = 6000) -> tuple[str, str, int | None]:
    """Where does `$var_name` (a composed shadow value) end up written? Returns
    (sink, detail, absolute match position or None) — matched against the CODE-ONLY text so
    a comment mentioning the variable is never mistaken for its real use."""
    window_end = min(len(code), after_pos + window_chars)
    window = code[after_pos:window_end]
    m = CUSTOM_PROP_SINK_RE.search(window)
    if m and m.group(3) == var_name:
        return "custom-property", m.group(2), after_pos + m.start()
    # box-shadow: <literal> . $var   OR   'box-shadow:' . $var
    box_pat = re.compile(
        r"""box-shadow\s*:['"]?\s*\.\s*\$""" + re.escape(var_name) + r"\b"
        r"""|['"]box-shadow:['"]\s*\.\s*\$""" + re.escape(var_name) + r"\b"
    )
    bm = box_pat.search(window)
    if bm:
        return "box-shadow", "", after_pos + bm.start()
    if re.search(r"\$" + re.escape(var_name) + r"\b", window):
        return "unclassified", "", None
    return "unclassified", "", None


def scan_php_calls(text: str, relpath: str) -> list[dict]:
    """Every shadow-composing call site + literal string build in one PHP file's text.
    Matching runs against a comment-blanked copy (`code`) so a docblock's prose mention of a
    function name is never treated as a real call; line numbers are read back from the
    ORIGINAL text (same length, so positions align) so exemption comments are found for real."""
    code = strip_php_comments_preserve_length(text)
    lines = text.split("\n")
    results: list[dict] = []
    claimed_lines: set[int] = set()

    for m in CALL_RE.finditer(code):
        if is_function_definition(code, m.start()):
            continue  # the function's own `function name(...)` signature, not a caller
        func = m.group(1)
        line_no = line_of(text, m.start())
        exempt, reason = find_exemption(lines, line_no)
        entry = {
            "file": relpath,
            "line": line_no,
            "function": func,
            "snippet": lines[line_no - 1].strip() if line_no - 1 < len(lines) else "",
            "exempt": exempt,
            "exempt_reason": reason,
        }
        if func in WRAPPER_SAFE_FUNCS:
            entry["sink"] = "wrapper-safe"
            entry["forced_colours_reached"] = True
        else:  # sgs_shadow_value_composed / sgs_shadow_layers
            var_name = detect_assignment_var(code, m.start())
            write_pos = None
            if var_name:
                sink, detail, write_pos = find_var_sink(code, var_name, m.end())
            else:
                # Inline use (no intermediate variable): the composed value can be
                # concatenated onto a PREFIX before this call (`'--sgs-card-shadow:' .
                # sgs_shadow_value_composed(...)`) or consumed by a SUFFIX after it. Check
                # both directions before giving up.
                before = code[max(0, m.start() - 120) : m.start()]
                after = code[m.start() : m.end() + 400]
                pm = CUSTOM_PROP_PREFIX_RE.search(before)
                if pm:
                    sink, detail = "custom-property", pm.group(2)
                elif BOX_SHADOW_PREFIX_RE.search(before):
                    sink, detail = "box-shadow", ""
                elif CUSTOM_PROP_SINK_RE.search(after):
                    sink, detail = "custom-property", CUSTOM_PROP_SINK_RE.search(after).group(2)
                elif re.search(r"box-shadow\s*:", after):
                    sink, detail = "box-shadow", ""
                else:
                    sink, detail = "unclassified", ""
            entry["sink"] = sink
            entry["sink_detail"] = detail
            # The exemption comment (like the fallback call itself) sits beside the WRITE,
            # which can be several lines after the composing call — re-check there too.
            if write_pos is not None:
                write_line = line_of(text, write_pos)
                claimed_lines.add(write_line)
                write_exempt, write_reason = find_exemption(lines, write_line)
                if write_exempt and not entry["exempt"]:
                    entry["exempt"], entry["exempt_reason"] = write_exempt, write_reason
                    exempt = True
            if sink == "custom-property":
                entry["forced_colours_reached"] = None  # judged where the CSS consumes it
            elif sink == "box-shadow":
                nearby_window = code[m.start() : m.end() + 4000]
                reached = exempt or bool(FORCED_DECL_CALL_RE.search(nearby_window[:1500]))
                entry["forced_colours_reached"] = reached
            else:
                entry["forced_colours_reached"] = None
        results.append(entry)

    # wp_style_engine_get_styles(...) calls whose args variable had ['shadow'] set earlier.
    file_has_forced_decl = bool(FORCED_DECL_CALL_RE.search(code))
    for m in STYLE_ENGINE_RE.finditer(code):
        args_var = m.group(1)
        line_no = line_of(text, m.start())
        window_start = max(0, m.start() - 4000)
        if re.search(SHADOW_KEY_ASSIGN_TMPL % re.escape(args_var), code[window_start : m.start()]):
            exempt, reason = find_exemption(lines, line_no)
            results.append(
                {
                    "file": relpath,
                    "line": line_no,
                    "function": "wp_style_engine_get_styles",
                    "snippet": lines[line_no - 1].strip() if line_no - 1 < len(lines) else "",
                    "sink": "style-engine-shadow",
                    "sink_detail": "",
                    "forced_colours_reached": exempt or file_has_forced_decl,
                    "exempt": exempt,
                    "exempt_reason": reason,
                }
            )
            claimed_lines.add(line_no)

    # Literal box-shadow:/drop-shadow( string building not already accounted for above.
    # A literal box-shadow value that is just `none` (an explicit CANCEL, e.g. the "off"
    # template argument in sgs-header-float-css.php's suppress/restate pairs) draws nothing,
    # so it carries no forced-colours question — same IGNORE_VALUES treatment as the CSS side.
    traced_lines = {r["line"] for r in results} | claimed_lines
    for regex, kind in ((STRING_LITERAL_BOX_SHADOW_RE, "box-shadow"), (STRING_LITERAL_DROP_SHADOW_RE, "drop-shadow")):
        for m in regex.finditer(code):
            line_no = line_of(text, m.start())
            if line_no in traced_lines:
                continue
            if kind == "box-shadow":
                vm = re.search(r"box-shadow\s*:\s*([^;'\"]*)", m.group(2))
                if vm:
                    bare = re.sub(r"(?i)\s*!\s*important\s*$", "", vm.group(1).strip()).strip()
                    if bare.lower() in IGNORE_VALUES:
                        continue
            exempt, reason = find_exemption(lines, line_no)
            if kind == "drop-shadow":
                exempt, reason = True, DROP_SHADOW_EXEMPT_REASON
            nearby_window = code[max(0, m.start() - 200) : m.end() + 1500]
            reached = exempt or bool(FORCED_DECL_CALL_RE.search(nearby_window))
            results.append(
                {
                    "file": relpath,
                    "line": line_no,
                    "function": "literal-string",
                    "snippet": lines[line_no - 1].strip() if line_no - 1 < len(lines) else "",
                    "sink": kind,
                    "sink_detail": "",
                    "forced_colours_reached": reached,
                    "exempt": exempt,
                    "exempt_reason": reason,
                }
            )
    return results


def php_targets() -> list[Path]:
    files = sorted(INCLUDES_DIR.glob("*.php"))
    files += sorted(BLOCKS_DIR.glob("*/render.php"))
    return files


def scan_all_php() -> list[dict]:
    results: list[dict] = []
    for path in php_targets():
        text = path.read_text(encoding="utf-8")
        results.extend(scan_php_calls(text, path.relative_to(ROOT).as_posix()))
    return results


# ---------------------------------------------------------------------------
# `is-style-elevated` variations — the undefined-variable check
# ---------------------------------------------------------------------------
UNDEFINED_VAR_RE = re.compile(r"var\(\s*(--wp--custom--shadow--[\w-]+)\s*\)")


def defined_custom_shadow_vars() -> set[str]:
    """Every `--wp--custom--shadow--<slug>` a real theme.json or per-client snapshot
    declares via `settings.custom.shadow.<slug>` (never guessed — read live)."""
    defined: set[str] = set()

    def collect(data: dict) -> None:
        custom = data.get("settings", {}).get("custom", {}) if "settings" in data else data.get("custom", {})
        shadow = custom.get("shadow") if isinstance(custom, dict) else None
        if isinstance(shadow, dict):
            for slug in shadow:
                defined.add(f"--wp--custom--shadow--{slug}")

    theme_json = THEME / "theme.json"
    if theme_json.exists():
        try:
            collect(json.loads(theme_json.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            pass
    if SITES_DIR.is_dir():
        for snap in SITES_DIR.glob("*/theme-snapshot.json"):
            try:
                collect(json.loads(snap.read_text(encoding="utf-8")))
            except (json.JSONDecodeError, OSError):
                pass
    return defined


def scan_variations(defined_vars: set[str] | None = None) -> list[dict]:
    if defined_vars is None:
        defined_vars = defined_custom_shadow_vars()
    results: list[dict] = []
    if not VARIATIONS_DIR.is_dir():
        return results
    for path in sorted(VARIATIONS_DIR.glob("sgs-*-variations.php")):
        text = path.read_text(encoding="utf-8")
        relpath = path.relative_to(ROOT).as_posix()
        lines = text.split("\n")
        # A comment naming the variable is not a use of it: match on comment-stripped text
        # (same length, so line numbers still line up with the real file).
        for m in UNDEFINED_VAR_RE.finditer(strip_php_comments_preserve_length(text)):
            var_name = m.group(1)
            line_no = line_of(text, m.start())
            results.append(
                {
                    "file": relpath,
                    "line": line_no,
                    "variable": var_name,
                    "snippet": lines[line_no - 1].strip() if line_no - 1 < len(lines) else "",
                    "classification": "undefined-variable" if var_name not in defined_vars else "defined",
                }
            )
    return results


# ---------------------------------------------------------------------------
# `--fix` mode (D4/D5): deterministic colour rewrite + forced-colours injection.
# ---------------------------------------------------------------------------
# Load-bearing format: `includes/helpers-shadow-dark.php::SGS_SHADOW_DARK_SITE_MIX` matches
# this EXACT shape (verified live 2026-09-23):
#   /^color-mix\(in srgb, var\(--wp--custom--shadow-colour\) (\d{1,3}(?:\.\d)?)%, transparent\)$/D
SGS_SHADOW_DARK_SITE_MIX_PY = re.compile(
    r"^color-mix\(in srgb, var\(--wp--custom--shadow-colour\) (\d{1,3}(?:\.\d)?)%, transparent\)$"
)

BLACK_TOKEN_RE = re.compile(
    r"(?i)"
    r"(?P<hex8>#000000[0-9a-f]{2})\b"
    r"|(?P<hexbare>#000(?:000)?)\b"
    r"|(?P<rgba>rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*[\d.]+\s*\))"
    r"|(?P<rgbslash>rgb\(\s*0\s+0\s+0\s*/\s*[\d.]+%?\s*\))"
    r"|(?P<rgbcomma>rgba?\(\s*0\s*,\s*0\s*,\s*0\s*\))"
    r"|(?P<rgbspace>rgb\(\s*0\s+0\s+0\s*\))"
    r"|(?P<kw>\bblack\b)"
)


def _mix_pct(alpha: float) -> str:
    pct_val = round(max(0.0, min(1.0, alpha)) * 100, 1)
    if pct_val == int(pct_val):
        return str(int(pct_val))
    return f"{pct_val}"


def _mix_expr(alpha: float) -> str:
    pct = _mix_pct(alpha)
    if pct in ("100", "100.0"):
        return "var(--wp--custom--shadow-colour)"
    return f"color-mix(in srgb, var(--wp--custom--shadow-colour) {pct}%, transparent)"


def _black_token_alpha(m: re.Match) -> float:
    if m.group("hex8"):
        return int(m.group("hex8")[-2:], 16) / 255
    if m.group("hexbare") or m.group("kw"):
        return 1.0
    if m.group("rgba"):
        am = re.search(r",\s*([\d.]+)\s*\)$", m.group("rgba"))
        return float(am.group(1)) if am else 1.0
    if m.group("rgbslash"):
        am = re.search(r"/\s*([\d.]+)(%?)\s*\)$", m.group("rgbslash"))
        if not am:
            return 1.0
        val = float(am.group(1))
        return val / 100 if am.group(2) else val
    if m.group("rgbcomma") or m.group("rgbspace"):
        return 1.0
    return 1.0


def _black_token_repl(m: re.Match) -> str:
    return _mix_expr(_black_token_alpha(m))


def rewrite_declaration_colour(prop: str, value: str) -> tuple[str, bool]:
    """Rewrite every black-literal colour token in a box-shadow/filter declaration VALUE to
    the site colour-mix form (D4). Brand colours, currentColor, preset and other variables are
    left untouched (BLACK_TOKEN_RE only matches literal-black tokens)."""
    prop_l = prop.lower()
    if prop_l == "box-shadow":
        new_value, n = BLACK_TOKEN_RE.subn(_black_token_repl, value)
        return new_value, n > 0
    if prop_l in ("filter", "-webkit-filter"):
        changed = False
        new_value = value
        for call in extract_calls(value, "drop-shadow"):
            new_call, n = BLACK_TOKEN_RE.subn(_black_token_repl, call)
            if n:
                new_value = new_value.replace(f"drop-shadow({call})", f"drop-shadow({new_call})", 1)
                changed = True
        return new_value, changed
    return value, False


FOCUS_RING_FALLBACK = ("outline: 2px solid Highlight;", "outline-offset: 2px;")
DEFAULT_FORCED_FALLBACK = ("outline: 1px solid CanvasText;", "outline-offset: -1px;")


def build_forced_colours_rule(selector: str, *, focus_ring: bool) -> str:
    outline, offset = FOCUS_RING_FALLBACK if focus_ring else DEFAULT_FORCED_FALLBACK
    return (
        "\n\n/* Windows High Contrast / forced-colors (auto: check-shadow-sources.py --fix) */\n"
        "@media (forced-colors: active) {\n"
        f"\t{selector} {{\n"
        f"\t\t{outline}\n"
        f"\t\t{offset}\n"
        "\t}\n"
        "}"
    )


def apply_css_fix(original: str) -> tuple[str, list[dict]]:
    """Pure function: given one CSS file's full text, return (new_text, report). `report`
    entries: {"action": "colour-rewritten"|"forced-colours-added"|"exempt", "line", "selector",
    "property"?, "reason"?, "focus_ring"?}. Never guesses -- a declaration only changes when a
    black-literal token or a genuine missing-coverage gap is found by the same rules the
    scanner uses."""
    clean = strip_comments_preserve_length(original)
    blocks = parse_css_blocks(clean)
    own_cache: dict[int, str] = {}
    seg_cache: dict[int, list[tuple[int, int, int]]] = {}
    for b in blocks:
        own, seg = own_text_with_map(b, original)
        own_cache[id(b)] = own
        seg_cache[id(b)] = seg

    ops: list[tuple[int, int, str]] = []  # (start, end, replacement) -- end==start for inserts
    report: list[dict] = []

    for b in blocks:
        own = own_cache[id(b)]
        seg = seg_cache[id(b)]
        selector_norm = normalise_selector(b["selector"])
        is_focus = ":focus" in selector_norm
        block_needs_forced = False

        for raw_decl, offset in split_top_level_with_offsets(own, ";"):
            stripped = raw_decl.strip()
            if not stripped or ":" not in stripped:
                continue
            prop_part, _, value_part = stripped.partition(":")
            prop = prop_part.strip().lower()
            if prop not in ("box-shadow", "filter", "-webkit-filter"):
                continue
            bare_value = re.sub(r"(?i)\s*!\s*important\s*$", "", value_part.strip()).strip()
            if bare_value.lower() in IGNORE_VALUES:
                continue
            if prop in ("filter", "-webkit-filter") and "drop-shadow(" not in bare_value:
                continue

            colon_pos = raw_decl.index(":")
            own_value_start = offset + colon_pos + 1
            own_value_end = offset + len(raw_decl)
            orig_value_start = map_own_offset(seg, own_value_start)
            orig_value_end = map_own_offset(seg, own_value_end)
            orig_value_text = original[orig_value_start:orig_value_end]
            line_no = original.count("\n", 0, orig_value_start) + 1

            new_value, changed = rewrite_declaration_colour(prop, orig_value_text)
            if changed:
                ops.append((orig_value_start, orig_value_end, new_value))
                report.append(
                    {"action": "colour-rewritten", "line": line_no, "selector": selector_norm, "property": prop}
                )

            covered = forced_colours_covered_css(blocks, b, own, own_cache)
            if covered:
                continue
            if prop in ("filter", "-webkit-filter"):
                report.append(
                    {
                        "action": "exempt",
                        "reason": "drop-shadow() renders through `filter`, which forced-colours mode does not "
                        "strip (CSS Color Adjust) -- no outline fallback is needed",
                        "line": line_no,
                        "selector": selector_norm,
                        "property": prop,
                    }
                )
                continue
            if "inset" in bare_value.lower():
                report.append(
                    {
                        "action": "exempt",
                        "reason": "inset shadow used as an inner line -- reported, never auto-fixed",
                        "line": line_no,
                        "selector": selector_norm,
                        "property": prop,
                    }
                )
                continue
            block_needs_forced = True

        if block_needs_forced:
            insert_pos = b["end"] + 1
            ops.append((insert_pos, insert_pos, build_forced_colours_rule(selector_norm, focus_ring=is_focus)))
            report.append(
                {
                    "action": "forced-colours-added",
                    "line": original.count("\n", 0, b["start"]) + 1,
                    "selector": selector_norm,
                    "focus_ring": is_focus,
                }
            )

    ops.sort(key=lambda t: t[0], reverse=True)
    text = original
    for start, end, repl in ops:
        text = text[:start] + repl + text[end:]
    return text, report


def fixable_css_targets() -> list[Path]:
    """Every `--fix`-eligible CSS file: `css_targets()` minus `src/blocks/google-reviews/` --
    that block is another session's uncommitted work and must never be touched (brief)."""
    return [p for p in css_targets() if p.parent.name != "google-reviews"]


def cmd_fix() -> int:
    colour_count = 0
    forced_count = 0
    exempt_count = 0
    per_file: dict[str, int] = {}
    exempt_report: list[str] = []

    for path in fixable_css_targets():
        original = path.read_text(encoding="utf-8")
        new_text, report = apply_css_fix(original)
        relpath = path.relative_to(ROOT).as_posix()
        if new_text != original:
            path.write_text(new_text, encoding="utf-8", newline="\n")
        changes = 0
        for r in report:
            if r["action"] == "colour-rewritten":
                colour_count += 1
                changes += 1
            elif r["action"] == "forced-colours-added":
                forced_count += 1
                changes += 1
            elif r["action"] == "exempt":
                exempt_count += 1
                exempt_report.append(f"  EXEMPT [{r['reason']}] {relpath}:{r['line']}  {r['selector']}")
        if changes:
            per_file[relpath] = changes

    print("=" * 78)
    print("SHADOW SOURCES --fix")
    print("=" * 78)
    print(f"\nColour rewrites: {colour_count}")
    print(f"Forced-colours blocks added: {forced_count}")
    print(f"Exemptions (reported, not auto-fixed): {exempt_count}")
    for line in exempt_report:
        print(line)
    print(f"\nFiles changed: {len(per_file)}")
    for f, n in sorted(per_file.items()):
        print(f"  {f}: {n} change(s)")
    return 0


# ---------------------------------------------------------------------------
# Baseline ratchet (`--check`): precedent `scripts/editor-render-parity-baseline.json`.
# ---------------------------------------------------------------------------
def load_baseline() -> list[dict]:
    if not BASELINE_JSON.exists():
        return []
    data = json.loads(BASELINE_JSON.read_text(encoding="utf-8"))
    return data.get("accepted", [])


def violation_key(v: dict) -> tuple:
    return (v.get("kind"), v.get("file"), v.get("line"), v.get("detail"))


def evaluate_baseline(vs: list[dict], baseline: list[dict]) -> tuple[list[dict], list[dict]]:
    """Return (new_violations, stale_baseline_entries). A finding passes only when it is in
    `vs` AND in `baseline`; `--check` fails on either list being non-empty (ratchet: the
    baseline can only shrink, never silently grow)."""
    baseline_keys = {violation_key(b) for b in baseline}
    found_keys = {violation_key(v) for v in vs}
    new_violations = [v for v in vs if violation_key(v) not in baseline_keys]
    stale_baseline = [b for b in baseline if violation_key(b) not in found_keys]
    return new_violations, stale_baseline


# ---------------------------------------------------------------------------
# Survey assembly + violation predicate
# ---------------------------------------------------------------------------
def build_survey() -> dict:
    css_sources, text_shadow_total = scan_all_css()
    php_sources = scan_all_php()
    variation_sources = scan_variations()

    unclassified: list[dict] = []
    for src in css_sources:
        for layer in src["layers"]:
            if layer["colour"] == "unclassified":
                unclassified.append({"kind": "css", "file": src["file"], "line": src["line"], "text": layer["text"]})
    for src in php_sources:
        if src.get("sink") == "unclassified" or (src.get("sink") is None and src.get("forced_colours_reached") is None and src.get("function") != "wrapper-safe"):
            unclassified.append({"kind": "php", "file": src["file"], "line": src["line"], "text": src.get("snippet", "")})

    supports_shadow_blocks = []
    for block_json in sorted(BLOCKS_DIR.glob("*/block.json")):
        try:
            data = json.loads(block_json.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        shadow_support = data.get("supports", {}).get("shadow")
        if shadow_support:
            block_slug = block_json.parent.name
            render_php = block_json.parent / "render.php"
            matching = [s for s in php_sources if s["file"].endswith(f"src/blocks/{block_slug}/render.php") and s.get("function") in ("wp_style_engine_get_styles",)]
            has_style_engine_shadow = any(s.get("sink") == "style-engine-shadow" for s in matching)
            covered = any(s.get("forced_colours_reached") for s in matching if s.get("sink") == "style-engine-shadow")
            supports_shadow_blocks.append(
                {
                    "block": f"sgs/{block_slug}",
                    "skip_serialised": bool(shadow_support.get("__experimentalSkipSerialization")),
                    "render_php": render_php.relative_to(ROOT).as_posix() if render_php.exists() else None,
                    "style_engine_shadow_found": has_style_engine_shadow,
                    "forced_colours_covered": covered,
                }
            )

    return {
        "generated_by": "check-shadow-sources.py",
        "design_doc": ".claude/reports/2026-09-23-shadow-tone-design.md",
        "css_sources": css_sources,
        "php_sources": php_sources,
        "variation_sources": variation_sources,
        "supports_shadow_blocks": supports_shadow_blocks,
        "text_shadow_count": text_shadow_total,
        "unclassified": unclassified,
    }


def violations(survey: dict) -> list[dict]:
    out: list[dict] = []
    for src in survey["css_sources"]:
        if src["has_black_literal"]:
            out.append({"kind": "css-black-literal", "file": src["file"], "line": src["line"], "detail": src["declaration"]})
        if not src["forced_colours_covered"] and not src.get("exempt"):
            out.append({"kind": "css-missing-forced-colours", "file": src["file"], "line": src["line"], "detail": src["declaration"]})
    for src in survey["php_sources"]:
        if src.get("exempt"):
            continue
        if src.get("forced_colours_reached") is False:
            out.append({"kind": "php-missing-forced-colours", "file": src["file"], "line": src["line"], "detail": src.get("snippet", "")})
    for src in survey["variation_sources"]:
        if src["classification"] == "undefined-variable":
            out.append({"kind": "undefined-variable", "file": src["file"], "line": src["line"], "detail": src["variable"]})
    for block in survey["supports_shadow_blocks"]:
        if block["style_engine_shadow_found"] and not block["forced_colours_covered"]:
            out.append({"kind": "supports-shadow-missing-forced-colours", "file": block["render_php"], "line": None, "detail": block["block"]})
    return out


# ---------------------------------------------------------------------------
# --survey / --check output
# ---------------------------------------------------------------------------
def cmd_survey() -> int:
    survey = build_survey()
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    SURVEY_JSON.write_text(json.dumps(survey, indent=2), encoding="utf-8", newline="\n")

    print("=" * 78)
    print("SHADOW SOURCES SURVEY")
    print("=" * 78)

    print(f"\nCSS sources: {len(survey['css_sources'])}  (text-shadow, out of scope: {survey['text_shadow_count']})")
    by_colour: dict[str, int] = {}
    for src in survey["css_sources"]:
        for layer in src["layers"]:
            by_colour[layer["colour"]] = by_colour.get(layer["colour"], 0) + 1
    for colour, count in sorted(by_colour.items()):
        print(f"  {colour:<16} {count}")
    missing_fallback_css = sum(1 for s in survey["css_sources"] if not s["forced_colours_covered"] and not s.get("exempt"))
    print(f"  missing forced-colours fallback: {missing_fallback_css}/{len(survey['css_sources'])}")
    exempt_css = [s for s in survey["css_sources"] if s.get("exempt")]
    print(f"  exempt (reported, never auto-fixed): {len(exempt_css)}")
    for s in exempt_css:
        print(f"    [{s['exempt_reason']}] {s['file']}:{s['line']}  {s['declaration']}")

    print(f"\nPHP emitter call sites: {len(survey['php_sources'])}")
    by_sink: dict[str, int] = {}
    for src in survey["php_sources"]:
        by_sink[src.get("sink", src["function"])] = by_sink.get(src.get("sink", src["function"]), 0) + 1
    for sink, count in sorted(by_sink.items()):
        print(f"  {sink:<20} {count}")
    missing_fallback_php = [s for s in survey["php_sources"] if s.get("forced_colours_reached") is False and not s.get("exempt")]
    print(f"  missing forced-colours fallback: {len(missing_fallback_php)}")
    for s in missing_fallback_php:
        print(f"    {s['file']}:{s['line']}  {s['function']}  {s.get('snippet', '')}")

    print(f"\nsupports.shadow blocks: {len(survey['supports_shadow_blocks'])}")
    for b in survey["supports_shadow_blocks"]:
        print(f"  {b['block']:<24} style-engine-shadow found: {str(b['style_engine_shadow_found']):<5}  forced-colours covered: {b['forced_colours_covered']}")

    print(f"\nis-style-elevated variations: {len(survey['variation_sources'])}")
    for v in survey["variation_sources"]:
        print(f"  {v['file']}:{v['line']}  {v['variable']}  -> {v['classification']}")

    print(f"\nCould not classify: {len(survey['unclassified'])}")
    for u in survey["unclassified"]:
        print(f"  [{u['kind']}] {u['file']}:{u['line']}  {u['text']}")

    vs = violations(survey)
    print(f"\nTotal violations (--check would fail on): {len(vs)}")
    print(f"\nWrote {SURVEY_JSON.relative_to(ROOT).as_posix()}")
    return 0


def cmd_check() -> int:
    survey = build_survey()
    vs = violations(survey)
    baseline = load_baseline()
    new_violations, stale_baseline = evaluate_baseline(vs, baseline)

    if not new_violations and not stale_baseline:
        print(f"PASS — no NEW shadow-source violations ({len(baseline)} baselined finding(s), all still present).")
        return 0

    if new_violations:
        print(f"FAIL — {len(new_violations)} NEW shadow-source violation(s) (not in {BASELINE_JSON.name}):")
        for v in new_violations:
            print(f"  [{v['kind']}] {v['file']}:{v['line']}  {v['detail']}")
    if stale_baseline:
        plural = "y" if len(stale_baseline) == 1 else "ies"
        print(f"FAIL — {len(stale_baseline)} stale baseline entr{plural} (finding no longer occurs -- shrink {BASELINE_JSON.name}):")
        for b in stale_baseline:
            print(f"  [{b.get('kind')}] {b.get('file')}:{b.get('line')}  {b.get('detail')}")
    return 1


# ---------------------------------------------------------------------------
# --self-test — fixtures prove every rule, plus an observed disabled-rule control
# ---------------------------------------------------------------------------
def cmd_self_test() -> int:
    passed = 0
    failed = 0

    def check(label: str, cond: bool) -> None:
        nonlocal passed, failed
        if cond:
            print(f"  PASS: {label}")
            passed += 1
        else:
            print(f"  FAIL: {label}")
            failed += 1

    css_dir = FIXTURES_DIR / "css"
    php_dir = FIXTURES_DIR / "php"

    # --- CSS: must-flag black-literal, no forced-colours coverage ---------------------
    black_css = css_dir / "must-flag-black-literal.css"
    src, count = scan_css_text(black_css.read_text(encoding="utf-8"), "fixture:must-flag-black-literal.css")
    check("must-flag black-literal fixture found one box-shadow source", len(src) == 1)
    check("must-flag black-literal fixture classified black-literal", src and src[0]["has_black_literal"])
    check("must-flag black-literal fixture has no forced-colours coverage", src and not src[0]["forced_colours_covered"])

    # --- CSS: must-pass — site-var colour, forced-colours covered by an outline in the
    # same file's forced-colors media block on the same selector -----------------------
    pass_css = css_dir / "must-pass-site-var-covered.css"
    src2, _ = scan_css_text(pass_css.read_text(encoding="utf-8"), "fixture:must-pass-site-var-covered.css")
    check("must-pass site-var fixture found one box-shadow source", len(src2) == 1)
    check("must-pass site-var fixture classified site-var, not black", src2 and src2[0]["layers"][0]["colour"] == "site-var")
    check("must-pass site-var fixture IS forced-colours covered", src2 and src2[0]["forced_colours_covered"])

    # --- CSS: must-flag — preset-var colour (not a colour violation) but STILL missing
    # forced-colours coverage, proving the two checks are independent -------------------
    missing_fc_css = css_dir / "must-flag-missing-forced-colours.css"
    src3, _ = scan_css_text(missing_fc_css.read_text(encoding="utf-8"), "fixture:must-flag-missing-forced-colours.css")
    check("must-flag missing-fallback fixture found one source", len(src3) == 1)
    check("must-flag missing-fallback fixture colour is preset-var (not a colour violation)", src3 and src3[0]["layers"][0]["colour"] == "preset-var")
    check("must-flag missing-fallback fixture IS missing forced-colours coverage", src3 and not src3[0]["forced_colours_covered"])

    # --- PHP: must-flag — sgs_shadow_value_composed() written straight to box-shadow,
    # no fallback call nearby, no exemption comment -------------------------------------
    raw_php = (php_dir / "must-flag-raw-box-shadow.php").read_text(encoding="utf-8")
    php_src = scan_php_calls(raw_php, "fixture:must-flag-raw-box-shadow.php")
    box_entries = [e for e in php_src if e.get("sink") == "box-shadow"]
    check("must-flag raw PHP fixture found a box-shadow sink", len(box_entries) == 1)
    check("must-flag raw PHP fixture is NOT exempt", box_entries and not box_entries[0]["exempt"])
    check("must-flag raw PHP fixture forced_colours_reached is False", box_entries and box_entries[0]["forced_colours_reached"] is False)

    # --- PHP: must-pass — sgs_shadow_box_decls() (the safe wrapper) -------------------
    wrapper_php = (php_dir / "must-pass-wrapper-safe.php").read_text(encoding="utf-8")
    wrapper_src = scan_php_calls(wrapper_php, "fixture:must-pass-wrapper-safe.php")
    check("must-pass wrapper fixture found one call", len(wrapper_src) == 1)
    check("must-pass wrapper fixture is wrapper-safe with fallback reached", wrapper_src and wrapper_src[0]["sink"] == "wrapper-safe" and wrapper_src[0]["forced_colours_reached"] is True)

    # --- PHP: must-pass — a hover-only raw write carrying the real `sgs-shadow-fallback:`
    # exemption comment convention ------------------------------------------------------
    exempt_php = (php_dir / "must-pass-exempt-hover.php").read_text(encoding="utf-8")
    exempt_src = scan_php_calls(exempt_php, "fixture:must-pass-exempt-hover.php")
    exempt_entries = [e for e in exempt_src if e.get("sink") == "box-shadow"]
    check("must-pass exempt-hover fixture found a box-shadow sink", len(exempt_entries) == 1)
    check("must-pass exempt-hover fixture IS exempt (comment convention honoured)", exempt_entries and exempt_entries[0]["exempt"])
    check("must-pass exempt-hover fixture forced_colours_reached is True via exemption", exempt_entries and exempt_entries[0]["forced_colours_reached"] is True)

    # --- PHP: custom-property trace — a composed value written to a custom property must
    # be recorded as traced-to-CSS, not itself judged as a violation --------------------
    custom_php = (php_dir / "must-pass-custom-property-trace.php").read_text(encoding="utf-8")
    custom_src = scan_php_calls(custom_php, "fixture:must-pass-custom-property-trace.php")
    custom_entries = [e for e in custom_src if e.get("sink") == "custom-property"]
    check("custom-property fixture found one traced sink", len(custom_entries) == 1)
    check("custom-property fixture names the property", custom_entries and custom_entries[0]["sink_detail"] == "--sgs-fixture-shadow")
    check("custom-property fixture is not itself judged (reached=None)", custom_entries and custom_entries[0]["forced_colours_reached"] is None)

    # --- Variations: must-flag undefined-variable / must-pass defined-variable --------
    var_dir = FIXTURES_DIR / "variations"
    undefined_text = (var_dir / "must-flag-undefined-var.php").read_text(encoding="utf-8")
    fixture_defined = {"--wp--custom--shadow--defined-example"}
    # scan_variations() reads real files by design (it must, in production); for the fixture
    # proof we exercise the same regex + classification directly against fixture text.
    finds = []
    for m in UNDEFINED_VAR_RE.finditer(undefined_text):
        var_name = m.group(1)
        finds.append("undefined-variable" if var_name not in fixture_defined else "defined")
    check("must-flag variation fixture found one reference", len(finds) == 1)
    check("must-flag variation fixture classified undefined-variable", finds == ["undefined-variable"])

    defined_text = (var_dir / "must-pass-defined-var.php").read_text(encoding="utf-8")
    finds2 = []
    for m in UNDEFINED_VAR_RE.finditer(defined_text):
        var_name = m.group(1)
        finds2.append("undefined-variable" if var_name not in fixture_defined else "defined")
    check("must-pass variation fixture found one reference", len(finds2) == 1)
    check("must-pass variation fixture classified defined", finds2 == ["defined"])

    comment_text = (var_dir / "must-pass-comment-only.php").read_text(encoding="utf-8")
    check("a variable named only in a comment is not a reference", not list(UNDEFINED_VAR_RE.finditer(strip_php_comments_preserve_length(comment_text))))
    check("negative control: the same file unstripped DOES match, so the stripping is what passes it", bool(list(UNDEFINED_VAR_RE.finditer(comment_text))))

    drop_php = (php_dir / "must-pass-drop-shadow-literal.php").read_text(encoding="utf-8")
    drop_src = [e for e in scan_php_calls(drop_php, "fixture:must-pass-drop-shadow-literal.php") if e.get("sink") == "drop-shadow"]
    check("a PHP-built drop-shadow is found", len(drop_src) == 1)
    check("a PHP-built drop-shadow is exempt from the forced-colours fallback", drop_src and drop_src[0]["exempt"] and drop_src[0]["forced_colours_reached"] is True)
    box_src = [e for e in scan_php_calls(raw_php, "fixture:must-flag-raw-box-shadow.php") if e.get("sink") == "box-shadow"]
    check("negative control: the drop-shadow exemption does not reach a raw box-shadow", box_src and not box_src[0]["exempt"])

    # --- `--fix`: black-literal + no coverage -> colour rewritten, forced-colours added ---
    fix_a_path = css_dir / "fix-black-literal-no-coverage.css"
    fix_a_text = fix_a_path.read_text(encoding="utf-8")
    fix_a_out, fix_a_report = apply_css_fix(fix_a_text)
    fix_a_rewrites = [r for r in fix_a_report if r["action"] == "colour-rewritten"]
    fix_a_forced = [r for r in fix_a_report if r["action"] == "forced-colours-added"]
    check("fix-a: one colour rewrite reported", len(fix_a_rewrites) == 1)
    check("fix-a: one forced-colours block reported", len(fix_a_forced) == 1 and not fix_a_forced[0]["focus_ring"])
    fix_a_src, _ = scan_css_text(fix_a_out, "fixture:fix-a-after")
    check("fix-a: rewritten colour is site-var, not black-literal", fix_a_src and not fix_a_src[0]["has_black_literal"])
    check("fix-a: alpha 0.2 -> exactly 20%", "20%" in fix_a_out and "color-mix(in srgb, var(--wp--custom--shadow-colour) 20%, transparent)" in fix_a_out)
    check("fix-a: rewritten mix matches SGS_SHADOW_DARK_SITE_MIX (PHP-side regex)",
          bool(SGS_SHADOW_DARK_SITE_MIX_PY.match("color-mix(in srgb, var(--wp--custom--shadow-colour) 20%, transparent)")))
    check("fix-a: is now forced-colours covered", fix_a_src and fix_a_src[0]["forced_colours_covered"])
    fix_a_out2, fix_a_report2 = apply_css_fix(fix_a_out)
    check("fix-a: idempotent -- a second --fix run reports nothing further", not fix_a_report2 and fix_a_out2 == fix_a_out)

    # --- `--fix`: focus ring gets Highlight/2px, never CanvasText/1px ---------------------
    fix_b_text = (css_dir / "fix-focus-ring.css").read_text(encoding="utf-8")
    fix_b_out, fix_b_report = apply_css_fix(fix_b_text)
    fix_b_forced = [r for r in fix_b_report if r["action"] == "forced-colours-added"]
    check("fix-b: one forced-colours block reported, flagged as a focus ring", len(fix_b_forced) == 1 and fix_b_forced[0]["focus_ring"])
    check("fix-b: emits the Highlight/2px fallback", "outline: 2px solid Highlight;" in fix_b_out and "outline-offset: 2px;" in fix_b_out)
    check("fix-b: does NOT emit the default CanvasText/1px fallback", "outline: 1px solid CanvasText;" not in fix_b_out)

    # --- `--fix`: inset shadow -- colour fixed, but reported EXEMPT, no outline added -----
    fix_c_text = (css_dir / "fix-inset-inner-line.css").read_text(encoding="utf-8")
    fix_c_out, fix_c_report = apply_css_fix(fix_c_text)
    fix_c_exempt = [r for r in fix_c_report if r["action"] == "exempt"]
    check("fix-c: reported exempt with the inset reason", len(fix_c_exempt) == 1 and "inset" in fix_c_exempt[0]["reason"])
    check("fix-c: no forced-colours block added", "@media (forced-colors: active)" not in fix_c_out)
    check("fix-c: colour STILL rewritten despite the exemption", "var(--wp--custom--shadow-colour)" in fix_c_out or "color-mix(in srgb, var(--wp--custom--shadow-colour)" in fix_c_out)

    # --- `--fix`: filter drop-shadow -- colour fixed, exempt, no outline added ------------
    fix_d_text = (css_dir / "fix-filter-drop-shadow.css").read_text(encoding="utf-8")
    fix_d_out, fix_d_report = apply_css_fix(fix_d_text)
    fix_d_exempt = [r for r in fix_d_report if r["action"] == "exempt"]
    check("fix-d: reported exempt with the filter/Color-Adjust reason", len(fix_d_exempt) == 1 and "filter" in fix_d_exempt[0]["reason"])
    check("fix-d: no forced-colours block added", "@media (forced-colors: active)" not in fix_d_out)
    check("fix-d: colour rewritten inside drop-shadow()", "color-mix(in srgb, var(--wp--custom--shadow-colour) 30%, transparent)" in fix_d_out)

    # --- `--fix`: opaque black literal (no alpha) -> plain var, never a color-mix() wrapper
    fix_e_text = (css_dir / "fix-opaque-black.css").read_text(encoding="utf-8")
    fix_e_out, fix_e_report = apply_css_fix(fix_e_text)
    check("fix-e: colour rewrite reported", any(r["action"] == "colour-rewritten" for r in fix_e_report))
    check("fix-e: opaque black becomes the PLAIN var, not color-mix()", "box-shadow: 0 2px 4px var(--wp--custom--shadow-colour);" in fix_e_out)
    check("fix-e: the fixed declaration line never emits a redundant 100% color-mix()",
          "color-mix" not in [ln for ln in fix_e_out.splitlines() if "box-shadow" in ln][0])

    # --- `--fix`: a rule that ALREADY has a border -- colour fixed, no SECOND fallback ----
    fix_f_text = (css_dir / "fix-already-covered.css").read_text(encoding="utf-8")
    fix_f_out, fix_f_report = apply_css_fix(fix_f_text)
    check("fix-f: colour rewrite reported", any(r["action"] == "colour-rewritten" for r in fix_f_report))
    check("fix-f: no forced-colours block added (already covered by the existing border)",
          not any(r["action"] == "forced-colours-added" for r in fix_f_report))
    check("fix-f: no @media (forced-colors) block appended to the file", "@media (forced-colors: active)" not in fix_f_out)

    # --- Baseline ratchet (precedent: editor-render-parity-baseline.json) ----------------
    print()
    print("  --- baseline ratchet: new / stale / accepted ---")
    baseline_fixture = [
        {"kind": "css-black-literal", "file": "fixture:baseline.css", "line": 10, "detail": "box-shadow: rgba(0,0,0,.1);"},
    ]
    vs_with_new = baseline_fixture + [
        {"kind": "css-black-literal", "file": "fixture:baseline.css", "line": 20, "detail": "box-shadow: rgba(0,0,0,.2);"}
    ]
    new_v, stale_v = evaluate_baseline(vs_with_new, baseline_fixture)
    check("a NEW finding not in the baseline is reported", len(new_v) == 1 and new_v[0]["line"] == 20)
    check("a baselined finding that is still present is NOT reported as new", len(new_v) == 1)

    new_v2, stale_v2 = evaluate_baseline([], baseline_fixture)
    check("a stale baseline entry (no longer occurring) is reported", len(stale_v2) == 1)
    check("no new violations reported when the only finding vanished", len(new_v2) == 0)

    new_v3, stale_v3 = evaluate_baseline(baseline_fixture, baseline_fixture)
    check("a baselined finding that still occurs passes clean (no new, no stale)", not new_v3 and not stale_v3)

    # --- Idempotence / overall violations() shape on the full built fixture set --------
    fixture_survey = {
        "css_sources": src + src2 + src3,
        "php_sources": php_src + wrapper_src + exempt_src + custom_src,
        "variation_sources": [
            {"file": "fixture:must-flag-undefined-var.php", "line": 1, "variable": "--wp--custom--shadow--x", "classification": c}
            for c in finds
        ] + [
            {"file": "fixture:must-pass-defined-var.php", "line": 1, "variable": "--wp--custom--shadow--x", "classification": c}
            for c in finds2
        ],
        "supports_shadow_blocks": [],
    }
    vs = violations(fixture_survey)
    kinds = {v["kind"] for v in vs}
    check("fixture violation set includes css-black-literal", "css-black-literal" in kinds)
    check("fixture violation set includes css-missing-forced-colours", "css-missing-forced-colours" in kinds)
    check("fixture violation set includes php-missing-forced-colours", "php-missing-forced-colours" in kinds)
    check("fixture violation set includes undefined-variable", "undefined-variable" in kinds)
    check("fixture violation set does NOT flag the wrapper-safe or exempt or custom-property sources",
          not any(v["file"].endswith("must-pass-wrapper-safe.php") or v["file"].endswith("must-pass-exempt-hover.php")
                  or v["file"].endswith("must-pass-custom-property-trace.php") or v["file"].endswith("must-pass-site-var-covered.css")
                  or v["file"].endswith("must-pass-defined-var.php") for v in vs))

    # --- OBSERVED NEGATIVE CONTROL: prove a disabled rule would be caught --------------
    # 1. The black-literal colour rule. With it ON the must-flag fixture is black-literal
    #    (already proven above). Switch it OFF and observe the SAME fixture stop being
    #    flagged — i.e. prove the self-test assertion above would go RED if this rule were
    #    ever removed from classify_layer_colour().
    print()
    print("  --- negative control: black-literal rule switched off ---")
    black_text = black_css.read_text(encoding="utf-8")
    src_off, _ = scan_css_text(black_text, "fixture:must-flag-black-literal.css", black_literal_enabled=False)
    print(f"  rule ON  -> colour = {src[0]['layers'][0]['colour']!r}")
    print(f"  rule OFF -> colour = {src_off[0]['layers'][0]['colour']!r}")
    check("rule ON correctly classifies black-literal", src[0]["layers"][0]["colour"] == "black-literal")
    check("rule OFF (disabled) STOPS classifying it as black-literal — proves the rule is load-bearing",
          src_off[0]["layers"][0]["colour"] != "black-literal")

    # 2. The forced-colours-coverage rule. With detection ON the missing-fallback fixture
    #    is uncovered (already proven above). Monkeypatch declares_outline_or_border() to
    #    always return True (as if the coverage check were disabled/no-oped) and observe
    #    the SAME fixture flip to "covered" — proving --check would go silently green on a
    #    real gap if this function were ever gutted.
    print()
    print("  --- negative control: forced-colours coverage rule switched off ---")
    # Deliberate module-level monkeypatch, restored in the `finally` immediately below.
    global declares_outline_or_border
    real_fn = declares_outline_or_border
    try:

        def _always_covered(_text: str) -> bool:
            return True

        declares_outline_or_border = _always_covered
        src3_off, _ = scan_css_text(missing_fc_css.read_text(encoding="utf-8"), "fixture:must-flag-missing-forced-colours.css")
    finally:
        declares_outline_or_border = real_fn
    print(f"  rule ON  -> forced_colours_covered = {src3[0]['forced_colours_covered']}")
    print(f"  rule OFF -> forced_colours_covered = {src3_off[0]['forced_colours_covered']}")
    check("rule ON correctly reports missing forced-colours coverage", not src3[0]["forced_colours_covered"])
    check("rule OFF (disabled) STOPS reporting the gap — proves the rule is load-bearing", src3_off[0]["forced_colours_covered"])

    print()
    print(f"{passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


# ---------------------------------------------------------------------------
def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--survey", action="store_true", help="Table + write reports/shadow-sources-survey.json (default)")
    group.add_argument("--check", action="store_true", help="Gate: exit 1 on any NEW violation (ratchet against shadow-sources-baseline.json)")
    group.add_argument("--fix", action="store_true", help="Deterministic --fix: black-literal colour rewrite + forced-colours injection in CSS")
    group.add_argument("--self-test", action="store_true", help="Fixture-proven regression suite + disabled-rule controls")
    args = parser.parse_args(argv)

    if args.fix:
        return cmd_fix()
    if args.check:
        return cmd_check()
    if args.self_test:
        return cmd_self_test()
    return cmd_survey()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
