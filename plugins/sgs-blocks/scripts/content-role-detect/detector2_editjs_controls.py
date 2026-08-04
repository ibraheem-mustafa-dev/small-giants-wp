#!/usr/bin/env python3
"""
Detector 2 — edit.js control-binding walk (structural, JSX-tag-aware).

Independent from Detector 1 (PHP escaping) and Detector 3 (i18n wrapping):
this one never looks at render.php at all. It scans each block's edit.js
(+ any shared component under src/components/ that block imports) for JSX
control elements that indicate CONTENT (RichText/PlainText/TextControl/
TextareaControl) vs STYLING (ColorPicker/DesignTokenPicker/RangeControl/
UnitControl/SelectControl/ToggleControl/BoxControl), and resolves the
control's `value={...}` binding back to an attribute key.

Method: rather than a single-line regex (which cannot span the common
multi-line JSX prop layout), this walks the raw source character-by-character
to find each `<ComponentName ... />` or `<ComponentName ...>` tag as a
balanced-brace span (JSX attribute values often contain `{ ... }` expressions
with their own nested braces/parens — a naive `>` search would truncate
mid-expression). It then regex-scans just that isolated tag span for the
`value=` binding, including the TEMPLATE-LITERAL case
(`` value={ attributes[`${side}SvgContent`] } ``) which a literal-string
`attributes\\.foo` / `attributes\\['foo'\\]` pattern alone would miss.

Output: NDJSON on stdout, one row per (file, attr_key, control) hit.

Usage:
    python detector2_editjs_controls.py --glob > d2_raw.ndjson
    python detector2_editjs_controls.py file1.js file2.js ...
"""
import glob
import json
import re
import sys
from pathlib import Path

CONTENT_CONTROLS = {"RichText", "PlainText", "TextControl", "TextareaControl"}
STYLING_CONTROLS = {
    "ColorPicker",
    "DesignTokenPicker",
    "RangeControl",
    "UnitControl",
    "SelectControl",
    "ToggleControl",
    "BoxControl",
    "__experimentalNumberControl",
    "NumberControl",
}
ALL_CONTROLS = CONTENT_CONTROLS | STYLING_CONTROLS

REPO_ROOT = Path("c:/Users/Bean/Projects/small-giants-wp")


def find_tag_spans(src: str, tag_names: set) -> list:
    """
    Find every `<TagName ...>` or `<TagName ... />` span in src for tags in
    tag_names, respecting nested `{}` / `()` / `[]` depth inside the tag so
    a multi-line JSX expression prop doesn't truncate the match early.
    Returns list of (tag_name, start_idx, end_idx, span_text, line_no).
    """
    spans = []
    open_re = re.compile(r"<(" + "|".join(re.escape(t) for t in tag_names) + r")\b")
    for m in open_re.finditer(src):
        tag = m.group(1)
        i = m.end()
        depth = 0  # brace/paren/bracket depth
        n = len(src)
        while i < n:
            c = src[i]
            if c in "{(":
                depth += 1
            elif c in ")}":
                depth -= 1
            elif c == "[" and depth >= 0:
                depth += 1
            elif c == "]" and depth >= 0:
                depth -= 1
            elif c == ">" and depth <= 0:
                # Tag ends here (self-closing `/>` or plain `>`).
                end = i + 1
                span_text = src[m.start():end]
                line_no = src.count("\n", 0, m.start()) + 1
                spans.append((tag, m.start(), end, span_text, line_no))
                break
            i += 1
    return spans


def extract_value_binding(tag_span: str) -> list:
    """
    Given an isolated `<Control ... />` span, find its `value={...}` binding
    and resolve it to one or more attribute keys. Returns a list of dicts:
    {'attr_key': str, 'dynamic': bool, 'raw_expr': str}.
    """
    m = re.search(r"\bvalue\s*=\s*\{", tag_span)
    if not m:
        return []
    # Walk forward from the `{` to find the matching `}` (balanced).
    i = m.end()
    depth = 1
    start = i
    n = len(tag_span)
    while i < n and depth > 0:
        if tag_span[i] == "{":
            depth += 1
        elif tag_span[i] == "}":
            depth -= 1
        i += 1
    expr = tag_span[start:i - 1].strip()

    results = []
    # Direct: attributes.foo  OR attributes['foo'] / attributes["foo"]
    for mm in re.finditer(r"attributes\??\.\s*([A-Za-z_][A-Za-z0-9_]*)", expr):
        results.append({"attr_key": mm.group(1), "dynamic": False, "raw_expr": expr})
    for mm in re.finditer(r"attributes\s*\[\s*(['\"])([A-Za-z0-9_]+)\1\s*\]", expr):
        results.append({"attr_key": mm.group(2), "dynamic": False, "raw_expr": expr})

    # Template-literal / dynamic key: attributes[`${side}SvgContent`] or
    # attributes[ side + 'SvgContent' ]
    for mm in re.finditer(r"attributes\s*\[\s*`\$\{[^}]+\}([A-Za-z0-9_]+)`\s*\]", expr):
        results.append({
            "attr_key": "::DYNAMIC_SUFFIX::" + mm.group(1),
            "dynamic": True,
            "raw_expr": expr,
        })
    for mm in re.finditer(r"attributes\s*\[\s*`([A-Za-z0-9_]+)\$\{[^}]+\}`\s*\]", expr):
        results.append({
            "attr_key": "::DYNAMIC_PREFIX::" + mm.group(1),
            "dynamic": True,
            "raw_expr": expr,
        })
    for mm in re.finditer(
        r"attributes\s*\[\s*[A-Za-z_][A-Za-z0-9_]*\s*\+\s*(['\"])([A-Za-z0-9_]+)\1\s*\]", expr
    ):
        results.append({
            "attr_key": "::DYNAMIC_SUFFIX::" + mm.group(2),
            "dynamic": True,
            "raw_expr": expr,
        })

    if not results:
        mm = re.search(r"attributes\s*\[\s*([A-Za-z_][A-Za-z0-9_.]*)\s*\]", expr)
        if mm:
            # attributes[ someVarName ] — the key lives in a variable defined
            # elsewhere in the same file (e.g. before-after's
            # `const svgContentKey = \`${side}SvgContent\`;`). Flag the bare
            # variable name for a second-pass resolution (caller has the
            # full file source).
            results.append({
                "attr_key": "::INDIRECT_VAR::" + mm.group(1),
                "dynamic": True,
                "raw_expr": expr,
            })
        elif "attributes" in expr:
            results.append({"attr_key": "::UNRESOLVED::" + expr[:80], "dynamic": True, "raw_expr": expr})
        else:
            # value={ bio } — a bare identifier. The overwhelming majority
            # of edit.js files destructure `const { bio, ... } = attributes;`
            # near the top, so the RichText binding never literally spells
            # "attributes.bio" — it's `bio`. Flag for destructuring lookup.
            #
            # CONFIRMED LIVE BUG (2026-08-04, independent verification):
            # `value={ svgContent || '' }` (hero/media edit.js — 49 total
            # occurrences of the `ident || literal` / `ident ?? literal`
            # shape across 20 edit.js files) did NOT match the old
            # `re.fullmatch(bare identifier)` check, because the fallback
            # operator makes the expression a BinaryExpression, not a bare
            # Identifier — extract_value_binding returned an EMPTY list for
            # these tags, so they vanished from Detector 2's output with no
            # trace (the tag was found, the value= was found, but nothing
            # was ever emitted for it) rather than surfacing as an
            # ::UNRESOLVED:: marker. Strip a trailing `|| <literal>` /
            # `?? <literal>` fallback before testing for a bare identifier.
            stripped = re.sub(r"\s*(?:\|\||\?\?)\s*(['\"][^'\"]*['\"]|null|undefined)\s*$", "", expr).strip()
            if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", stripped):
                results.append({
                    "attr_key": "::DESTRUCTURED_VAR::" + stripped,
                    "dynamic": True,
                    "raw_expr": expr,
                })
            else:
                # Genuinely couldn't parse this value expression at all —
                # surface it rather than silently dropping the tag, so a
                # future audit of ::UNRESOLVED_EXPR:: rows can catch the
                # NEXT unhandled shape instead of it vanishing again.
                results.append({
                    "attr_key": "::UNRESOLVED_EXPR::" + expr[:80],
                    "dynamic": True,
                    "raw_expr": expr,
                })

    return results


def resolve_indirect_var(src: str, var_name: str) -> list:
    """
    Given a bare identifier used as `attributes[ varName ]`, look up how
    varName was itself assigned in the same file:
      const X = `${side}Suffix`;          -> DYNAMIC_SUFFIX::Suffix
      const X = prefix + 'Suffix';        -> DYNAMIC_SUFFIX::Suffix
      const X = attrMap[breakpoint];      -> unresolved-but-flagged (device map)
    Returns list of resolved key markers (may be empty).
    """
    if "." in var_name:
        return []  # e.g. k.fontSize — object-property indirection, out of scope.
    out = []
    pat_tpl = re.compile(
        r"(?:const|let|var)\s+" + re.escape(var_name) + r"\s*=\s*`\$\{[^}]+\}([A-Za-z0-9_]+)`"
    )
    m = pat_tpl.search(src)
    if m:
        out.append("::DYNAMIC_SUFFIX::" + m.group(1))
        return out
    pat_concat = re.compile(
        r"(?:const|let|var)\s+" + re.escape(var_name) + r"\s*=\s*[A-Za-z_][A-Za-z0-9_]*\s*\+\s*(['\"])([A-Za-z0-9_]+)\1"
    )
    m = pat_concat.search(src)
    if m:
        out.append("::DYNAMIC_SUFFIX::" + m.group(2))
        return out
    return out


_DESTRUCTURE_CACHE: dict = {}


def resolve_destructured_var(src: str, var_name: str, cache_key: str) -> str | None:
    """
    Resolve `value={ bio }` back to its attribute key by finding
    `const { ..., bio, ... } = attributes;` (optionally with a rename,
    `bio: bioText`, or a default, `bio = ''`) anywhere in the file.
    Caches the parsed destructuring set per file (cache_key) since this is
    called once per RichText/TextControl tag but the destructuring pattern
    is scanned once.
    """
    if cache_key not in _DESTRUCTURE_CACHE:
        mapping = {}
        # const { a, b, c: renamed, d = 'x' } = attributes;
        for dm in re.finditer(r"const\s*\{([^}]*)\}\s*=\s*attributes\s*;", src):
            body = dm.group(1)
            for raw_part in body.split(","):
                # CONFIRMED LIVE BUG (2026-08-04, independent verification):
                # media/edit.js groups its ~30-name destructure with `// SVG.`
                # -style section comments on their own line, e.g.:
                #   videoLazyLoad,
                #   // SVG.
                #   svgContent,
                # Splitting on `,` alone glues the comment onto the FRONT of
                # the identifier that follows it (same "glue" bug class as
                # Detector 1's `<?php`/`if (...) {` issue, this time from a
                # `//` comment rather than a control-structure header) —
                # `"// SVG.\n\t\tsvgContent"` matched none of the three
                # per-part regexes below, so `svgContent` silently never
                # entered the mapping and `sgs/media.svgContent` was
                # invisible to Detector 2 even after the `|| ''` fallback
                # fix. Strip any `//...` line-comment segment from each part
                # before matching.
                part = re.sub(r"//[^\n]*", "", raw_part).strip()
                if not part:
                    continue
                # `key: localName` or `key = default` or plain `key`
                mm = re.match(r"([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)", part)
                if mm:
                    mapping[mm.group(2)] = mm.group(1)
                    continue
                mm = re.match(r"([A-Za-z0-9_]+)\s*=", part)
                if mm:
                    mapping[mm.group(1)] = mm.group(1)
                    continue
                mm = re.match(r"([A-Za-z0-9_]+)$", part)
                if mm:
                    mapping[mm.group(1)] = mm.group(1)
        _DESTRUCTURE_CACHE[cache_key] = mapping
    return _DESTRUCTURE_CACHE[cache_key].get(var_name)


def infer_block_slug(path: Path) -> str | None:
    parts = path.parts
    if "blocks" in parts:
        idx = parts.index("blocks")
        if idx + 1 < len(parts):
            return "sgs/" + parts[idx + 1]
    return None  # shared component — not block-scoped by filename alone.


def collect_default_files() -> list:
    files = []
    files += glob.glob(str(REPO_ROOT / "plugins/sgs-blocks/src/blocks/*/edit.js"))
    files += glob.glob(str(REPO_ROOT / "plugins/sgs-blocks/src/blocks/*/*/edit.js"))  # nested (e.g. accordion-item)
    files += glob.glob(str(REPO_ROOT / "plugins/sgs-blocks/src/components/*.js"))
    return sorted(set(files))


def main() -> None:
    args = sys.argv[1:]
    files = collect_default_files() if (not args or args[0] == "--glob") else args

    for f in files:
        p = Path(f)
        if not p.is_file():
            print(f"WARN: file not found: {f}", file=sys.stderr)
            continue
        src = p.read_text(encoding="utf-8", errors="replace")
        block_slug = infer_block_slug(p)
        spans = find_tag_spans(src, ALL_CONTROLS)
        for tag, start, end, span_text, line_no in spans:
            bindings = extract_value_binding(span_text)
            category = "content-control" if tag in CONTENT_CONTROLS else "styling-control"
            for b in bindings:
                key = b["attr_key"]
                if key.startswith("::DESTRUCTURED_VAR::"):
                    var_name = key.split("::DESTRUCTURED_VAR::", 1)[1]
                    resolved = resolve_destructured_var(src, var_name, str(p))
                    key = resolved if resolved else "::UNRESOLVED_DESTRUCTURE::" + var_name
                if key.startswith("::INDIRECT_VAR::"):
                    var_name = key.split("::INDIRECT_VAR::", 1)[1]
                    resolved = resolve_indirect_var(src, var_name)
                    if resolved:
                        for rk in resolved:
                            row = {
                                "file": str(p),
                                "block_slug": block_slug,
                                "line": line_no,
                                "control": tag,
                                "category": category,
                                "attr_key": rk,
                                "dynamic": True,
                                "raw_expr": b["raw_expr"][:200],
                            }
                            print(json.dumps(row))
                        continue
                    key = "::UNRESOLVED_INDIRECT::" + var_name
                row = {
                    "file": str(p),
                    "block_slug": block_slug,
                    "line": line_no,
                    "control": tag,
                    "category": category,
                    "attr_key": key,
                    "dynamic": key.startswith("::"),
                    "raw_expr": b["raw_expr"][:200],
                }
                print(json.dumps(row))


if __name__ == "__main__":
    main()
