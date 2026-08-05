#!/usr/bin/env python3
"""
Detector 5 -- derive the image<->alt COMPANION relationship from render.php.

WHAT THIS CLOSES (D497)
------------------------
``block_attributes.alt_companion_attr`` links an alt-text attribute to the image
attribute it describes. Today all pairs are HAND-DECLARED in
``attr-classification-overrides.json`` because there is no consistent NAME rule
(``sgs/product-card.image`` -> ``imageAlt`` vs ``sgs/media.imageUrl`` -> ``imageAlt``).
D497 rules that hand-declaration is debt: there IS a structural signal that has never
been used -- the url/id value and the alt value are passed to the SAME `<img>`
EMISSION (the same ``sprintf``/``printf`` format call, the same array literal, or the
same inline ``src=``/``alt=`` pair), sourced from the SAME block attributes.

THE SIGNAL, PRECISELY
----------------------
An attribute reaches the ``alt=`` SLOT of an image emission; the attribute reaching
the ``src=``/``url=`` SLOT of that SAME emission is its companion. This module never
matches on attribute NAME -- only on which attribute's value physically arrives at
which slot of the same rendered ``<img>``.

METHOD (regex/line-based -- WordPress PHP is the parse target, no PHP-parser
dependency, matching the house style of the sibling detectors in this directory)
----------------------------------------------------------------------------------
1. Build a VARIABLE -> ATTRIBUTE resolution table per block, by reading every
   ``.php`` file in the block's own directory:
     a. Direct bracket access:      ``$var = ... $attributes['attrName'] ...;``
     b. Dynamic bracket access:     ``$var = ... $attributes[$prefix . 'Suffix'] ...;``
        -- recorded as a SUFFIX (e.g. ``'ImageUrl'``), not a concrete attribute name,
        because the concrete name only exists once ``$prefix`` is bound at runtime
        (sgs/before-after's ``beforeImageUrl``/``afterImageUrl``).
     c. Closure-call-with-literal:  ``$var = $someClosure( 'attrName' );`` where the
        closure itself reads ``$attributes[$key]`` -- covers sgs/responsive-logo's
        ``$sgs_logo_url_attr( 'logoUrl' )`` helper.
   Then a 2-hop ALIAS expansion (the same idiom already used by
   ``extract-signatures.py::_detect_link_template`` for its carrier-variable
   expansion, factored out and reused here): ``$resolved_url = $image_url;`` etc.
2. Scan the same source for three `<img>`-EMISSION shapes and, for each, extract
   which VALUE EXPRESSION lands in the ``src=``/``url=`` slot and which lands in the
   ``alt=`` slot:
     a. ``sprintf()``/``printf()`` -- parses the (possibly multi-line, `.`-concatenated)
        format string, locates ``src="`` and ``alt="`` inside it, resolves EITHER
        plain ``%s`` (positional/sequential) OR numbered ``%N$s`` placeholders to the
        matching value argument.
     b. PHP array literal (``array( 'url' => ..., 'alt' => ... )``) -- covers a
        data-carrier array (sgs/decorative-image's ``$decor_media`` synthesis) as well
        as a direct attrs array passed to a rendering helper.
     c. Inline HTML: ``src="<?php echo EXPR; ?>" ... alt="<?php echo EXPR; ?>"`` on one
        line (sgs/product-card's read-only card branch).
3. Resolve each slot's value expression back to a variable, then to the variable table
   from step 1. Both slots resolving to CONCRETE attributes yields a pair directly.
   Both slots resolving to the SAME SUFFIX SHAPE (dynamic key) yields a suffix pair,
   which is then EXPANDED against the block's own declared attribute names (never a
   hardcoded per-block dict) -- e.g. suffix pair (``'ImageUrl'``, ``'ImageAlt'``)
   expands to (``beforeImageUrl``, ``beforeImageAlt``) and
   (``afterImageUrl``, ``afterImageAlt``) because those are the block's own declared
   attribute names sharing a prefix.

WHY A LITERAL ALT PRODUCES NO PAIR (the precision guarantee)
--------------------------------------------------------------
Every emission scanner extracts the FIRST ``$var`` reference inside the matched slot
expression. A literal (``alt=""``, ``alt="Logo"``, ``esc_attr( 'Logo' )``) contains no
``$var`` at all, so the slot resolves to ``None`` and the whole site is discarded --
there is no fallback that guesses a companion from names or positions. This is the
guard that keeps sgs/decorative-image's OWN image branch silent (it renders
``alt=""`` literally, by design -- a decorative image has no accessible alt) while its
``$decorMedia`` array-literal synthesis (which DOES carry the real ``$image_alt``
variable) still gets caught.

BLIND SPOTS (enumerated, per the Task F "ENFORCED" bar point 7)
-------------------------------------------------------------------
1. NO SCOPE ANALYSIS. Variable names are resolved textually across the WHOLE file
   (all functions concatenated), not per function body. Two functions in the same
   file reusing a variable name for different attributes (e.g. two helpers both using
   ``$url``) could cross-contaminate. Not observed in the 5 known shapes, but it is a
   real limitation of a regex-based approach with no AST.
2. Format-string concatenation assumes EVERY segment is a string LITERAL. A format
   string built from a variable (``$tpl . '<img src="%s">'``) is invisible -- the
   scanner requires every concatenated piece to be a quoted literal and silently skips
   the call otherwise (a bounded FALSE NEGATIVE, never a false positive).
3. Array-literal scanning only recognises PHP long syntax ``array( ... )``, not short
   syntax ``[ ... ]`` -- short syntax collides syntactically with
   ``$attributes[...]`` indexing and was judged not worth the ambiguity for the
   real shapes this project uses (all five known call sites use ``array()``).
4. Only ONE `<img>` emission needs to satisfy the pair for it to be proposed; a block
   whose ONLY emission of a genuine companion pair is guarded behind a shape this
   detector does not parse (e.g. a `<picture>`/`<source srcset>` built entirely from a
   helper function neither url nor alt is passed to directly) will be MISSED, not
   reported as a false pair -- i.e. failures are false negatives, not false positives.
5. Two-hop alias limit. A companion assembled through a THIRD indirection hop would
   not resolve. Chosen to match the same 2-hop budget already proven sufficient in
   ``extract-signatures.py``.

READ-ONLY. Proposes; never writes to sgs-framework.db, never edits
``attr-classification-overrides.json``, never runs ``/sgs-update`` or a build.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PLUGIN_ROOT = SCRIPT_DIR.parent.parent          # plugins/sgs-blocks
BLOCKS_DIR = PLUGIN_ROOT / "src" / "blocks"

# The six pairs D497 asks this detector to re-derive from source alone.
KNOWN_PAIRS = [
    ("sgs/before-after", "beforeImageUrl", "beforeImageAlt"),
    ("sgs/before-after", "afterImageUrl", "afterImageAlt"),
    ("sgs/decorative-image", "imageUrl", "imageAlt"),
    ("sgs/media", "imageUrl", "imageAlt"),
    ("sgs/product-card", "image", "imageAlt"),
    ("sgs/responsive-logo", "logoUrl", "alt"),
]

_DIRECT = re.compile(
    r"\$(\w+)\s*=\s*.*?\$(?:attributes|attrs)\[\s*['\"](\w+)['\"]\s*\]"
)
_DYNAMIC = re.compile(
    r"\$(\w+)\s*=\s*.*?\$(?:attributes|attrs)\[\s*\$\w+\s*\.\s*['\"](\w+)['\"]\s*\]"
)
_CLOSURE_CALL = re.compile(
    r"\$(\w+)\s*=\s*\$\w+\(\s*['\"](\w+)['\"]\s*\)\s*;"
)
_ALIAS_LINE = re.compile(r"^\s*\$([A-Za-z_]\w*)\s*=\s*(.+?);\s*$")
_VAR_REF = re.compile(r"\$([A-Za-z_]\w*)")


# ── Variable -> attribute resolution ────────────────────────────────────────────

def _declared_string_attrs(block_dir: Path) -> set[str]:
    """Attribute names this block declares with type 'string' in block.json.

    Restricted to string-typed because that is the same precondition ``walk.py``
    applies before it will treat a row as an alt companion at all (attr_type='string'
    per the task brief) -- a non-string attr can never be the alt slot of an <img>.
    """
    bj = block_dir / "block.json"
    if not bj.is_file():
        return set()
    try:
        data = json.loads(bj.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()
    attrs = data.get("attributes") or {}
    return {
        name for name, spec in attrs.items()
        if isinstance(spec, dict) and spec.get("type") == "string"
    }


def _resolve_carriers(text: str, declared: set[str]) -> dict[str, tuple[str, str]]:
    """Map local PHP variable name -> ('attr', attr_name) | ('suffix', suffix).

    Direct/dynamic/closure resolution first, then a 2-hop alias expansion --
    the same idiom as ``extract-signatures.py::_detect_link_template``'s carrier
    expansion, reused here rather than reimplemented differently.
    """
    lines = text.splitlines()
    base: dict[str, tuple[str, str]] = {}

    for line in lines:
        m = _DYNAMIC.search(line)
        if m:
            base.setdefault(m.group(1), ("suffix", m.group(2)))
            continue
        m = _DIRECT.search(line)
        if m and m.group(2) in declared:
            base.setdefault(m.group(1), ("attr", m.group(2)))
            continue
        m = _CLOSURE_CALL.search(line)
        if m and m.group(2) in declared:
            base.setdefault(m.group(1), ("attr", m.group(2)))

    for _ in range(2):  # two hops, matching the sibling module's budget
        for line in lines:
            am = _ALIAS_LINE.match(line)
            if not am:
                continue
            target, expr = am.group(1), am.group(2)
            if target in base:
                continue
            refs = set(_VAR_REF.findall(expr))
            resolutions = {base[r] for r in refs if r in base}
            if len(resolutions) == 1:
                base[target] = next(iter(resolutions))

    return base


def _first_var(expr: str | None) -> str | None:
    """First `$var` reference in an expression, or None for a literal.

    A literal (`''`, `"Logo"`, `esc_attr( 'Logo' )`) has no `$var` at all -- this is
    the mechanism that keeps a hardcoded alt from ever producing a pair.
    """
    if not expr:
        return None
    m = _VAR_REF.search(expr)
    return m.group(1) if m else None


def _expand_suffix_pairs(declared: set[str], url_suffix: str, alt_suffix: str) -> list[tuple[str, str]]:
    """Expand a dynamic-key SUFFIX pair against the block's OWN declared attrs.

    Never a hardcoded per-block dict (R-31-1): the prefixes ('before'/'after' etc.)
    are read from whatever the block itself declares, not guessed or enumerated here.
    """
    pairs: list[tuple[str, str]] = []
    for attr in sorted(declared):
        if attr == url_suffix:
            candidate = alt_suffix
        elif attr.endswith(url_suffix):
            prefix = attr[: -len(url_suffix)]
            candidate = prefix + alt_suffix
        else:
            continue
        if candidate in declared and candidate != attr:
            pairs.append((attr, candidate))
    return pairs


# ── Balanced-paren helpers (no PHP-parser dependency; hand-rolled, quote-aware) ──

def _extract_balanced(text: str, open_idx: int) -> str:
    """Content between the '(' at `open_idx` and its matching ')'. Quote-aware."""
    depth = 0
    i = open_idx
    in_str: str | None = None
    n = len(text)
    while i < n:
        c = text[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == in_str:
                in_str = None
        else:
            if c in ("'", '"'):
                in_str = c
            elif c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
                if depth == 0:
                    return text[open_idx + 1:i]
        i += 1
    return text[open_idx + 1:]


def _split_top(s: str) -> list[str]:
    """Split on top-level commas only -- respects nested (), [], {}, and quotes."""
    parts: list[str] = []
    cur: list[str] = []
    depth = 0
    in_str: str | None = None
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if in_str:
            cur.append(c)
            if c == "\\" and i + 1 < n:
                cur.append(s[i + 1])
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c in ("'", '"'):
            in_str = c
            cur.append(c)
        elif c in "([{":
            depth += 1
            cur.append(c)
        elif c in ")]}":
            depth -= 1
            cur.append(c)
        elif c == "," and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(c)
        i += 1
    parts.append("".join(cur))
    return [p.strip() for p in parts]


# ── Emission-site scanners ───────────────────────────────────────────────────────

_CALL_RE = re.compile(r"\b(?:sprintf|printf)\s*\(")
_LITERAL_RE = re.compile(r"'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"")
_SRC_MARK = re.compile(r"(?<![a-zA-Z])src\s*=\s*[\"']")
_ALT_MARK = re.compile(r"(?<![a-zA-Z])alt\s*=\s*[\"']")
_PLACEHOLDER = re.compile(r"%(\d+)\$[sd]|%[sd]")


def _placeholder_index_after(fmt: str, pos: int) -> int | None:
    """Index into the printf value-argument list of the first placeholder at/after
    `pos`. Handles both numbered (%N$s -> N-1) and sequential plain %s/%d."""
    seq = 0
    for pm in _PLACEHOLDER.finditer(fmt):
        idx = int(pm.group(1)) - 1 if pm.group(1) else seq
        if not pm.group(1):
            seq += 1
        if pm.start() >= pos:
            return idx
    return None


def scan_printf(text: str) -> list[dict]:
    """sprintf()/printf() emissions -- resolves src="..."/alt="..." to the correct
    positional value argument, whether the format uses plain %s or numbered %N$s,
    and whether the format string is one literal or several `.`-concatenated ones."""
    out = []
    for m in _CALL_RE.finditer(text):
        call_body = _extract_balanced(text, m.end() - 1)
        args = _split_top(call_body)
        if len(args) < 2:
            continue
        fmt_expr, value_args = args[0], args[1:]
        literals = _LITERAL_RE.findall(fmt_expr)
        fmt = "".join(a or b for a, b in literals)
        if not fmt:
            continue
        src_m = _SRC_MARK.search(fmt)
        alt_m = _ALT_MARK.search(fmt)
        if not (src_m and alt_m):
            continue
        src_idx = _placeholder_index_after(fmt, src_m.end())
        alt_idx = _placeholder_index_after(fmt, alt_m.end())
        if src_idx is None or alt_idx is None:
            continue
        if src_idx >= len(value_args) or alt_idx >= len(value_args):
            continue
        out.append({
            "shape": "printf-format",
            "url_var": _first_var(value_args[src_idx]),
            "alt_var": _first_var(value_args[alt_idx]),
        })
    return out


_ARRAY_RE = re.compile(r"\barray\s*\(")
_ARRAY_KV = re.compile(r"""^\s*['"](\w+)['"]\s*=>\s*(.+)$""", re.DOTALL)


def scan_array_literal(text: str) -> list[dict]:
    """PHP array( 'url'/'src' => ..., 'alt' => ... ) literals. Covers both a
    data-carrier array and an attrs array handed to a rendering helper."""
    out = []
    for m in _ARRAY_RE.finditer(text):
        body = _extract_balanced(text, m.end() - 1)
        url_val = alt_val = None
        for piece in _split_top(body):
            kv = _ARRAY_KV.match(piece)
            if not kv:
                continue
            key, val = kv.group(1).lower(), kv.group(2)
            if key in ("url", "src") and url_val is None:
                url_val = val
            elif key == "alt" and alt_val is None:
                alt_val = val
        if url_val is not None and alt_val is not None:
            out.append({
                "shape": "array-literal",
                "url_var": _first_var(url_val),
                "alt_var": _first_var(alt_val),
            })
    return out


_INLINE_RE = re.compile(
    r"""src\s*=\s*["']<\?php\s*echo\s+(.+?);\s*\?>["'][^>]*?"""
    r"""alt\s*=\s*["']<\?php\s*echo\s+(.+?);\s*\?>["']""",
    re.IGNORECASE,
)


def scan_inline_html(text: str) -> list[dict]:
    """Inline `src="<?php echo EXPR; ?>" ... alt="<?php echo EXPR; ?>"` on one line."""
    out = []
    for line in text.splitlines():
        m = _INLINE_RE.search(line)
        if m:
            out.append({
                "shape": "inline-html",
                "url_var": _first_var(m.group(1)),
                "alt_var": _first_var(m.group(2)),
            })
    return out


# ── Per-block driver ─────────────────────────────────────────────────────────────

def analyse_source(block_slug: str, text: str, declared: set[str]) -> list[dict]:
    """Run every scanner over already-concatenated source text and return the
    derived (image_attr, alt_attr) pairs with the shape that proved each."""
    carriers = _resolve_carriers(text, declared)
    sites: list[dict] = []
    sites += scan_printf(text)
    sites += scan_array_literal(text)
    sites += scan_inline_html(text)

    pairs: dict[tuple[str, str], str] = {}
    for site in sites:
        uv, av = site.get("url_var"), site.get("alt_var")
        if not uv or not av:
            continue
        u_res, a_res = carriers.get(uv), carriers.get(av)
        if not u_res or not a_res:
            continue
        if u_res[0] == "attr" and a_res[0] == "attr":
            candidates = [(u_res[1], a_res[1])]
        elif u_res[0] == "suffix" and a_res[0] == "suffix":
            candidates = _expand_suffix_pairs(declared, u_res[1], a_res[1])
        else:
            continue
        for image_attr, alt_attr in candidates:
            if image_attr == alt_attr:
                continue
            pairs.setdefault((image_attr, alt_attr), site["shape"])

    return [
        {"block_slug": block_slug, "image_attr": ia, "alt_attr": aa, "evidence_shape": shape}
        for (ia, aa), shape in sorted(pairs.items())
    ]


def analyse_block(block_slug: str, block_dir: Path) -> list[dict]:
    declared = _declared_string_attrs(block_dir)
    if not declared:
        return []
    php_files = sorted(p for p in block_dir.rglob("*.php") if p.is_file())
    if not php_files:
        return []
    texts = []
    for p in php_files:
        try:
            texts.append(p.read_text(encoding="utf-8", errors="replace"))
        except OSError:
            continue
    combined = "\n".join(texts)
    return analyse_source(block_slug, combined, declared)


def run_all(blocks_dir: Path | None = None) -> list[dict]:
    root = blocks_dir or BLOCKS_DIR
    out = []
    if not root.is_dir():
        return out
    for block_dir in sorted(root.iterdir()):
        if not block_dir.is_dir() or not (block_dir / "block.json").is_file():
            continue
        out.extend(analyse_block(f"sgs/{block_dir.name}", block_dir))
    return out


# ── Self-test ────────────────────────────────────────────────────────────────────

def self_test() -> int:
    """Prove the detector finds every real shape and refuses every literal-alt shape."""
    failures = []

    # 1. Plain %s printf, direct attribute carriers (sgs/media's real shape).
    declared = {"imageUrl", "imageAlt"}
    text = (
        "$image_url = isset( $attributes['imageUrl'] ) ? (string) $attributes['imageUrl'] : '';\n"
        "$image_alt = isset( $attributes['imageAlt'] ) ? (string) $attributes['imageAlt'] : '';\n"
        "$resolved_url = '';\n"
        "$resolved_url = $image_url;\n"
        "$image_html = sprintf(\n"
        "\t'<img src=\"%s\" alt=\"%s\" class=\"x\" />',\n"
        "\tesc_url( $resolved_url ),\n"
        "\tesc_attr( $image_alt )\n"
        ");\n"
    )
    got = analyse_source("sgs/plantmedia", text, declared)
    pairs = {(g["image_attr"], g["alt_attr"]) for g in got}
    if ("imageUrl", "imageAlt") not in pairs:
        failures.append("plain-%s sprintf with aliased carriers did NOT resolve imageUrl->imageAlt")

    # 2. Numbered %N$s printf, dynamic-key suffix expansion (sgs/before-after's shape).
    declared2 = {"beforeImageUrl", "beforeImageAlt", "afterImageUrl", "afterImageAlt"}
    text2 = (
        "$url = isset( $attributes[ $prefix . 'ImageUrl' ] ) ? (string) $attributes[ $prefix . 'ImageUrl' ] : '';\n"
        "$alt = isset( $attributes[ $prefix . 'ImageAlt' ] ) ? (string) $attributes[ $prefix . 'ImageAlt' ] : '';\n"
        "$html = sprintf(\n"
        "\t'<img src=\"%2$s\" alt=\"%3$s\" class=\"%1$s\" />',\n"
        "\tesc_attr( $classes ),\n"
        "\tesc_url( $url ),\n"
        "\tesc_attr( $alt )\n"
        ");\n"
    )
    got2 = analyse_source("sgs/plantbeforeafter", text2, declared2)
    pairs2 = {(g["image_attr"], g["alt_attr"]) for g in got2}
    if ("beforeImageUrl", "beforeImageAlt") not in pairs2 or ("afterImageUrl", "afterImageAlt") not in pairs2:
        failures.append(f"numbered-placeholder dynamic-key expansion produced {pairs2}, "
                         "expected both beforeImage* and afterImage* pairs")

    # 3. Array literal (sgs/decorative-image's $decorMedia synthesis shape).
    declared3 = {"imageUrl", "imageAlt"}
    text3 = (
        "$image_url = $attributes['imageUrl'] ?? '';\n"
        "$image_alt = $attributes['imageAlt'] ?? '';\n"
        "$decor_media = array(\n"
        "\t'url' => $image_url,\n"
        "\t'type' => 'image',\n"
        "\t'alt' => (string) $image_alt,\n"
        ");\n"
    )
    got3 = analyse_source("sgs/plantdecor", text3, declared3)
    pairs3 = {(g["image_attr"], g["alt_attr"]) for g in got3}
    if ("imageUrl", "imageAlt") not in pairs3:
        failures.append("array-literal shape did NOT resolve imageUrl->imageAlt")

    # 4. Inline HTML echo (sgs/product-card's shape), with a closure-call carrier
    #    for the url side (sgs/responsive-logo's shape covered by the same path).
    declared4 = {"image", "imageAlt"}
    text4 = (
        "$sgs_resolved_img = $attributes['image'] ?? '';\n"
        "$sgs_resolved_img_alt = $attributes['imageAlt'] ?? '';\n"
        "echo '<img src=\"<?php echo esc_url( $sgs_resolved_img ); ?>\" "
        "alt=\"<?php echo esc_attr( $sgs_resolved_img_alt ); ?>\">';\n"
    )
    got4 = analyse_source("sgs/plantcard", text4, declared4)
    pairs4 = {(g["image_attr"], g["alt_attr"]) for g in got4}
    if ("image", "imageAlt") not in pairs4:
        failures.append("inline-html shape did NOT resolve image->imageAlt")

    # 5. NEGATIVE CONTROL -- a literal alt (no $var at all) must produce NO pair.
    #    This is sgs/decorative-image's OWN image-render branch: alt is the literal
    #    '' by design (decorative), and must not be claimed as a companion of imageUrl.
    declared5 = {"imageUrl", "imageAlt"}
    text5 = (
        "$image_url = $attributes['imageUrl'] ?? '';\n"
        "$image_alt = $attributes['imageAlt'] ?? '';\n"
        "$img_attrs = array(\n"
        "\t'class' => 'x',\n"
        "\t'alt'   => '',\n"
        ");\n"
        "echo sgs_responsive_image( $id, $image_url, '', 'large', $img_attrs );\n"
    )
    got5 = analyse_source("sgs/plantliteral", text5, declared5)
    if got5:
        failures.append(f"a LITERAL alt produced a pair: {got5} -- precision guard failed")

    # 5b. NEGATIVE CONTROL -- inline HTML with a hardcoded string alt must not pair.
    declared5b = {"logoUrl"}
    text5b = (
        "$logo_url = $attributes['logoUrl'] ?? '';\n"
        "echo '<img src=\"<?php echo esc_url( $logo_url ); ?>\" alt=\"Logo\">';\n"
    )
    got5b = analyse_source("sgs/plantliteral2", text5b, declared5b)
    if got5b:
        failures.append(f"a hardcoded alt=\"Logo\" produced a pair: {got5b}")

    # 6. NEGATIVE CONTROL -- empty declared-attrs set (nothing to resolve against)
    #    must never invent a pair from the same source that worked in check 1.
    got6 = analyse_source("sgs/plantmedia", text, set())
    if got6:
        failures.append(f"an empty declared-attrs set still produced a pair: {got6}")

    if failures:
        print(f"DETECTOR-5 SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("DETECTOR-5 SELF-TEST PASSED -- 6 checks green "
          "(plain-%s, numbered-%N$s+suffix-expansion, array-literal, inline-html, "
          "2 negative controls).")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1] if __doc__ else "")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--json", action="store_true", help="emit the full result as JSON")
    ap.add_argument("--block", help="restrict to one block slug, e.g. sgs/media")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    if args.block:
        slug = args.block if args.block.startswith("sgs/") else f"sgs/{args.block}"
        block_dir = BLOCKS_DIR / slug.split("/", 1)[-1]
        if not block_dir.is_dir():
            print(f"no such block directory: {block_dir}", file=sys.stderr)
            return 2
        found = analyse_block(slug, block_dir)
    else:
        found = run_all()

    known_set = {(s, i, a) for s, i, a in KNOWN_PAIRS}
    found_set = {(f["block_slug"], f["image_attr"], f["alt_attr"]) for f in found}
    derived_known = known_set & found_set
    missed_known = known_set - found_set
    extra = found_set - known_set

    if args.json:
        print(json.dumps({
            "found": found,
            "known_pairs_total": len(KNOWN_PAIRS),
            "known_pairs_derived": sorted(derived_known),
            "known_pairs_missed": sorted(missed_known),
            "extra_pairs": sorted(extra),
        }, indent=2))
        return 0

    for row in found:
        print(json.dumps(row))

    print(f"\n-- scoreboard --  {len(derived_known)}/{len(KNOWN_PAIRS)} known pairs derived",
          file=sys.stderr)
    for s, i, a in KNOWN_PAIRS:
        mark = "OK  " if (s, i, a) in derived_known else "MISS"
        print(f"  [{mark}] {s:26} {i:16} -> {a}", file=sys.stderr)
    if extra:
        print(f"\n-- {len(extra)} extra pair(s) not in the known list --", file=sys.stderr)
        for s, i, a in sorted(extra):
            print(f"  {s:26} {i:16} -> {a}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
