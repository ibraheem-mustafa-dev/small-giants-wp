#!/usr/bin/env python3
"""generate-helper-catalogue.py — DERIVE the helper/component/atom catalogue in
.claude/dev-setup.md.

WHY THIS IS GENERATED AND NOT HAND-WRITTEN
------------------------------------------
Sibling to generate-tooling-catalogue.py, same philosophy: a hand-maintained
roster of PHP helper functions and JS components is a copy that rots the moment
a new helper is added and nobody remembers to write it down. This repo has
already proven that pattern fails — `sgs_svg_stroke_gradient()` was
independently rediscovered as "the answer" to the same problem shape THREE
separate times in one week (see plugins/sgs-blocks/CLAUDE.md's "Known
precedent-function registry"), and `sgs_custom_property_gradient_decls()`
was not known about at all until stumbled on mid-task. The tooling catalogue
covers CHECKER/MIGRATION SCRIPTS; this generator covers the other half of the
"what already exists" question — the PHP helper FUNCTIONS in
plugins/sgs-blocks/includes/helpers-*.php and the JS components/atoms in
plugins/sgs-blocks/src/components/. Both are derived straight from source
(docblocks + signatures), never invented, so a stale entry cannot occur —
running `--check` after any helper/component edit proves the doc is current.

Regenerate with:  python plugins/sgs-blocks/scripts/generate-helper-catalogue.py
Check without writing:  ... --check   (exit 1 if dev-setup.md is out of date)

⚠ A purpose this generator cannot find in the source is written as
**UNDOCUMENTED**, never invented. An invented purpose is worse than a missing
one — it looks authoritative and is wrong.
"""
from __future__ import annotations

import importlib.util as _ilu
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
BLOCKS = REPO / "plugins" / "sgs-blocks"
DOC = REPO / ".claude" / "dev-setup.md"
START = "<!-- HELPER-CATALOGUE:START -->"
END = "<!-- HELPER-CATALOGUE:END -->"

HELPERS_GLOB = "helpers-*.php"
HELPERS_DIR = BLOCKS / "includes"
COMPONENTS_DIR = BLOCKS / "src" / "components"
ATOMS_DIR = COMPONENTS_DIR / "media" / "atoms"

# Reuse the sibling generator's JS/PHP header-purpose extractor rather than
# duplicating it — it already handles JSDoc blocks, bare `//` headers, PHP
# docstrings, banner-line filtering and multi-line-sentence joining, and any
# divergence between two hand-maintained copies of that logic is exactly the
# kind of drift this whole file exists to prevent. Used here ONLY for the
# top-of-file JS component header, not for PHP (PHP helper purposes come from
# the per-FUNCTION docblock immediately above each function, which this
# module's own `_php_functions()` extracts directly — a file-level PHP
# docstring would be the wrong thing to attribute to every function in it).
_TOOLING_GEN = Path(__file__).resolve().parent / "generate-tooling-catalogue.py"
_spec = _ilu.spec_from_file_location("_tooling_gen", str(_TOOLING_GEN))
_tooling_gen = _ilu.module_from_spec(_spec)
_spec.loader.exec_module(_tooling_gen)
first_purpose = _tooling_gen.first_purpose
_clip = _tooling_gen._clip


# ---------------------------------------------------------------------------
# PHP helper functions
# ---------------------------------------------------------------------------

_RE_PHP_FUNC = re.compile(r"\bfunction\s+(sgs_[A-Za-z0-9_]+)\s*\(")


def _block_comment_spans(text: str) -> list[tuple[int, int]]:
    """Every `/* ... */` span (docblocks included) in the file, as
    (start, end) character-offset pairs. Used to exclude a `function
    sgs_x(` MENTION inside prose (a docblock/comment describing behaviour in
    words, e.g. quoting a hypothetical error message) from being mistaken
    for a real declaration. Does not account for `/*`/`*/` inside a string
    literal — not a real risk in this codebase's helper files."""
    spans: list[tuple[int, int]] = []
    i = 0
    while True:
        start = text.find("/*", i)
        if start == -1:
            break
        end = text.find("*/", start + 2)
        if end == -1:
            spans.append((start, len(text)))
            break
        spans.append((start, end + 2))
        i = end + 2
    return spans


def _in_spans(pos: int, spans: list[tuple[int, int]]) -> bool:
    return any(s <= pos < e for s, e in spans)


def _line_starts_as_comment(text: str, pos: int) -> bool:
    """True when everything on the match's own line, before the match, is
    comment-opener whitespace — i.e. the match sits inside a `//` line
    comment (or a docblock continuation line starting `*`), not real code."""
    line_start = text.rfind("\n", 0, pos) + 1
    prefix = text[line_start:pos].strip()
    return prefix.startswith("//") or prefix.startswith("*") or prefix.startswith("#")


def _php_signature(text: str, func_kw_start: int) -> tuple[str, int]:
    """Join `function name(...)[: type]` up to (not including) the opening
    `{`, collapsing internal whitespace. Returns (signature, index of `{`)."""
    paren_start = text.index("(", func_kw_start)
    depth = 0
    i = paren_start
    while i < len(text):
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
            if depth == 0:
                break
        i += 1
    close_paren = i
    brace_pos = text.index("{", close_paren)
    header = text[func_kw_start:brace_pos].strip()
    header = re.sub(r"\s+", " ", header)
    return header, brace_pos


def _php_docblock_before(text: str, func_kw_start: int) -> str:
    """The nearest immediately-preceding `/** ... */` docblock's one-line
    summary, or '' if none is directly adjacent (only whitespace between)."""
    before = text[:func_kw_start]
    stripped = before.rstrip()
    if not stripped.endswith("*/"):
        return ""
    start = stripped.rfind("/**")
    if start == -1:
        return ""
    block = stripped[start:]
    content: list[str] = []
    for raw in block.splitlines():
        s = raw.strip()
        if s.startswith("/**"):
            s = s[3:].strip()
        if s.endswith("*/"):
            s = s[:-2].strip()
        if s.startswith("*"):
            s = s[1:].strip()
        content.append(s)
    parts: list[str] = []
    for s in content:
        if not s:
            if parts:
                break
            continue
        if s.startswith("@"):
            break
        parts.append(s)
    return " ".join(parts).strip()


def _php_line_comment_before(text: str, func_kw_start: int) -> str:
    """A bare `//` comment (or contiguous run of them) immediately above the
    function, when no docblock is present. Never crosses a blank line."""
    before = text[:func_kw_start]
    lines = before.splitlines()
    idx = len(lines) - 1
    while idx >= 0 and lines[idx].strip() == "":
        idx -= 1
    if idx < 0 or not lines[idx].strip().startswith("//"):
        return ""
    comment_lines: list[str] = []
    j = idx
    while j >= 0 and lines[j].strip().startswith("//"):
        comment_lines.insert(0, lines[j].strip()[2:].strip())
        j -= 1
    return " ".join(comment_lines).strip()


def _php_functions(path: Path) -> list[dict]:
    """Every top-level `function sgs_xxx(...)` in one helpers-*.php file, in
    source order. Never guesses a purpose — UNDOCUMENTED when neither a
    docblock nor an adjacent `//` comment is found."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    out: list[dict] = []
    seen_names: set[str] = set()
    block_spans = _block_comment_spans(text)
    for m in _RE_PHP_FUNC.finditer(text):
        # A comment (block or `//` line) can MENTION "function sgs_x(" in
        # prose without declaring it — e.g. quoting a hypothetical fatal
        # error message. Caught live: helpers-responsive.php's own comment
        # explaining a require_once ordering fix names
        # "sgs_css_length_value()" inside a `//` line, which a naive regex
        # miscounted as a second real definition of a function that is only
        # ever declared once (helpers-css-safety.php).
        if _in_spans(m.start(), block_spans) or _line_starts_as_comment(text, m.start()):
            continue
        name = m.group(1)
        # A function guarded by `if ( ! function_exists( 'name' ) ) { function
        # name() {...} }` appears once in source — but if a file genuinely
        # redeclares (shouldn't happen), keep first occurrence only so the
        # catalogue doesn't double-list.
        if name in seen_names:
            continue
        seen_names.add(name)
        sig, _brace = _php_signature(text, m.start())
        purpose = _php_docblock_before(text, m.start())
        source = "docblock"
        if not purpose:
            purpose = _php_line_comment_before(text, m.start())
            source = "comment" if purpose else "none"
        if not purpose:
            purpose = "**UNDOCUMENTED**"
        out.append(
            {
                "name": name,
                "signature": sig,
                "purpose": purpose,
                "purpose_source": source,
            }
        )
    return out


def build_php_section() -> list[str]:
    out: list[str] = []
    out.append("### PHP helper functions — `includes/helpers-*.php`")
    out.append("")
    out.append(
        "Every top-level `function sgs_xxx(...)` across every `helpers-*.php` file, "
        "grouped by file, with the one-line purpose from its own docblock (or the "
        "adjacent `//` comment when it has no docblock). **UNDOCUMENTED** means "
        "neither exists in source — that is a real gap in the code, not a gap in "
        "this catalogue; add a docblock rather than inferring a purpose here."
    )
    out.append("")
    files = sorted(HELPERS_DIR.glob(HELPERS_GLOB))
    total_fns = 0
    for f in files:
        fns = _php_functions(f)
        total_fns += len(fns)
        out.append(f"#### `includes/{f.name}` — {len(fns)} function(s)")
        out.append("")
        if not fns:
            out.append("_No top-level `sgs_*` functions found._")
            out.append("")
            continue
        out.append("| Function | Signature | Purpose |")
        out.append("|---|---|---|")
        for fn in fns:
            sig = _clip(fn["signature"].replace("|", chr(92) + "|"), 110)
            purpose = _clip(fn["purpose"].replace("|", chr(92) + "|"), 140)
            out.append(f"| `{fn['name']}` | `{sig}` | {purpose} |")
        out.append("")
    out.append(
        f"**{len(files)} files, {total_fns} functions.** Regenerate with "
        "`python plugins/sgs-blocks/scripts/generate-helper-catalogue.py`."
    )
    out.append("")
    return out


def build_php_json_rows() -> list[dict]:
    """PHP helper-FUNCTION rows only, shaped to match scan-component-adoption.js's
    own `--json` row schema exactly (`name`, `family`, `file_path`, `functionality`,
    `adopters`, `adopter_list`) — see that script's `add()` call sites. Consumed by
    `scan-component-adoption.js` itself (which shells out to this script with
    `--json` and merges the result into its own `rows` before printing), so
    `seed-component-adoption.py` keeps trusting ONE mechanism
    (`scan-component-adoption.js --json`) even though the PHP-function extraction
    lives here. Real per-function adoption counting is out of scope for this
    row shape — `adopters`/`adopter_list` are sane defaults (0 / []), not
    invented data.

    JS component/atom rows are deliberately NOT emitted here — those are
    scan-component-adoption.js's own job (family='editor-component'/'util') and
    duplicating that extraction here would be the second mechanism this whole
    file's docstring warns against for the sibling tooling catalogue.
    """
    rows: list[dict] = []
    for f in sorted(HELPERS_DIR.glob(HELPERS_GLOB)):
        rel_path = f.relative_to(REPO).as_posix()
        for fn in _php_functions(f):
            purpose = fn["purpose"]
            functionality = "" if purpose == "**UNDOCUMENTED**" else purpose
            rows.append(
                {
                    "name": fn["name"],
                    "family": "render-helper-function",
                    "file_path": rel_path,
                    "functionality": functionality,
                    "adopters": 0,
                    "adopter_list": [],
                }
            )
    return rows


# ---------------------------------------------------------------------------
# JS components + atoms
# ---------------------------------------------------------------------------

_RE_EXPORT_DEFAULT_FN = re.compile(r"export\s+default\s+function\s+([A-Za-z0-9_]+)")
_RE_EXPORT_DEFAULT_CLASS = re.compile(r"export\s+default\s+class\s+([A-Za-z0-9_]+)")
_RE_EXPORT_DEFAULT_NAME = re.compile(r"export\s+default\s+([A-Za-z0-9_]+)\s*;")
_RE_EXPORT_FN = re.compile(r"export\s+function\s+([A-Za-z0-9_]+)")
_RE_EXPORT_CONST = re.compile(r"export\s+const\s+([A-Za-z0-9_]+)")
_RE_EXPORT_CLASS = re.compile(r"export\s+class\s+([A-Za-z0-9_]+)")
_RE_EXPORT_BRACES = re.compile(r"export\s*\{([^}]+)\}")


def _js_exports(path: Path) -> list[str]:
    """Every export this file declares, source order, default marked. Never
    invents a name for a genuinely anonymous default export — falls back to
    the file's own basename with an explicit note instead."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    exports: list[str] = []
    seen: set[str] = set()

    def add(name: str, is_default: bool = False) -> None:
        label = f"{name} (default)" if is_default else name
        key = (name, is_default)
        if key in seen:
            return
        seen.add(key)
        exports.append(label)

    default_found = False
    for m in _RE_EXPORT_DEFAULT_FN.finditer(text):
        add(m.group(1), is_default=True)
        default_found = True
    for m in _RE_EXPORT_DEFAULT_CLASS.finditer(text):
        add(m.group(1), is_default=True)
        default_found = True
    for m in _RE_EXPORT_DEFAULT_NAME.finditer(text):
        add(m.group(1), is_default=True)
        default_found = True
    if not default_found and re.search(r"export\s+default\s*[({]", text):
        # A genuinely anonymous default export (arrow fn / object literal
        # exported inline). Name it after the file rather than inventing an
        # identifier that doesn't exist in source.
        add(f"{path.stem} (default, anonymous)")

    for m in _RE_EXPORT_FN.finditer(text):
        add(m.group(1))
    for m in _RE_EXPORT_CLASS.finditer(text):
        add(m.group(1))
    for m in _RE_EXPORT_CONST.finditer(text):
        add(m.group(1))
    for m in _RE_EXPORT_BRACES.finditer(text):
        for part in m.group(1).split(","):
            part = part.strip()
            if not part:
                continue
            # `export { A as B }` -> B is the exported name
            name = part.split(" as ")[-1].strip()
            if re.match(r"^[A-Za-z0-9_]+$", name):
                add(name)
    return exports


def _js_files(directory: Path) -> list[Path]:
    if not directory.exists():
        return []
    return sorted(f for f in directory.glob("*.js") if f.is_file())


def build_js_section(directory: Path, rel_label: str, heading: str) -> list[str]:
    out: list[str] = []
    files = _js_files(directory)
    out.append(f"### {heading} — `{rel_label}`")
    out.append("")
    out.append(
        "One row per file (top-level only, not sub-directories, except the "
        "dedicated `media/atoms/` table below). Purpose is the file's own "
        "top-of-file JSDoc/comment header — **UNDOCUMENTED** when absent."
    )
    out.append("")
    out.append("| File | Exports | Purpose |")
    out.append("|---|---|---|")
    for f in files:
        exports = _js_exports(f)
        exports_str = ", ".join(f"`{e}`" for e in exports) if exports else "_none found_"
        exports_str = _clip(exports_str, 90)
        purpose = first_purpose(f) or "**UNDOCUMENTED**"
        purpose = _clip(purpose.replace("|", chr(92) + "|"), 130)
        out.append(f"| `{f.name}` | {exports_str} | {purpose} |")
    out.append("")
    out.append(f"**{len(files)} files.**")
    out.append("")
    return out


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------


def build() -> str:
    out: list[str] = [START, ""]
    out.append(
        "This section is **GENERATED** by "
        "`plugins/sgs-blocks/scripts/generate-helper-catalogue.py`. Do not "
        "hand-edit — edits are overwritten. It covers the other half of "
        "\"what already exists\" that the tooling catalogue above doesn't: "
        "PHP helper FUNCTIONS (not scripts) and JS editor components/atoms. "
        "Built because `sgs_svg_stroke_gradient()` was independently "
        "rediscovered from scratch three times in one week, and "
        "`sgs_custom_property_gradient_decls()` wasn't known about at all "
        "until stumbled on mid-task — read this before writing a new helper "
        "or component that might already exist."
    )
    out.append("")
    out.extend(build_php_section())
    out.extend(
        build_js_section(
            COMPONENTS_DIR,
            "src/components/*.js",
            "JS shared editor components",
        )
    )
    out.extend(
        build_js_section(
            ATOMS_DIR,
            "src/components/media/atoms/*.js",
            "JS media atoms",
        )
    )
    out.append(END)
    return "\n".join(out)


def main() -> int:
    if "--json" in sys.argv:
        # Additive output mode alongside the existing default/--check markdown
        # modes — does not touch dev-setup.md at all. PHP helper-FUNCTION rows
        # only; see build_php_json_rows()'s own docstring for why JS rows are
        # excluded.
        sys.stdout.write(json.dumps(build_php_json_rows()))
        return 0
    check = "--check" in sys.argv
    doc = DOC.read_text(encoding="utf-8", newline="")
    nl = "\r\n" if "\r\n" in doc else "\n"
    section = build().replace("\n", nl)
    if START in doc and END in doc:
        pre, rest = doc.split(START, 1)
        _, post = rest.split(END, 1)
        new = pre + section + post
    else:
        raise SystemExit(
            f"FAIL-CLOSED: markers not found in {DOC}. Add {START} / {END} first."
        )
    if new == doc:
        print("[helper-catalogue] up to date")
        return 0
    if check:
        print("[helper-catalogue] OUT OF DATE — run without --check to regenerate")
        return 1
    DOC.write_text(new, encoding="utf-8", newline="")
    print(f"[helper-catalogue] regenerated {DOC.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
