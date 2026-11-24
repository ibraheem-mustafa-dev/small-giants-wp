#!/usr/bin/env python3
"""Does a block's view script write a `data-*` attribute's value into visible text?

Detector 1 sees a render print an attribute into `data-summary-one="..."` and stops: the value is
machine-facing on the server side. When the block's view script then reads that data attribute and
writes it into the page (`el.textContent = ...`), the value is visible text for the visitor, and the
attribute is content. This module follows that path, so every block's data-attribute text gets the
same verdict, not only the ones whose name ends in `Message` or `Label`.

How it follows the value:
  1. The block's view scripts are the files `block.json` names under `viewScriptModule` / `viewScript`.
  2. A read of the data attribute (`el.dataset.summaryOne`, `el.dataset['summaryOne']`,
     `el.getAttribute('data-summary-one')`, `const { summaryOne } = el.dataset`) is the taint source.
  3. Taint passes through a name: any statement that assigns `name = <expression using a tainted name>`
     taints `name`, so `const text = format( { template, templateOne } )` carries it across a function call.
  4. A text sink is a statement that assigns `textContent`, `innerText`, `innerHTML`, `nodeValue` or
     `data`, or calls `createTextNode` / `insertAdjacentText` / `insertAdjacentHTML`, with a tainted name
     after the sink token. A tainted name that is only an index (`labels[ name ]`), an operand of an equality
     test (`name === 'a'`) or the condition of a ternary (`name ? 'On' : 'Off'`) does not count: it picks what is
     written, it is not what is written.

The analysis is name-based inside one file and ignores scope. It reads a value that merely shares a
name with a tainted one as tainted too; a wrong content verdict there is caught in the before/after
diff that accompanies a change to this module, not here.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

_IDENT = r"[A-Za-z_$][\w$]*"
_SINK_ASSIGN = re.compile(r"\.(?:textContent|innerText|innerHTML|nodeValue|data)\s*=(?![=>])")
_SINK_CALL = re.compile(r"\b(?:createTextNode|insertAdjacentText|insertAdjacentHTML)\s*\(")
_ASSIGN = re.compile(rf"(?:(?<![\w$.])(?:const|let|var)\s+|(?:^|[{{}};\n])\s*)({_IDENT})\s*=(?![=>])")
_SOURCE = "__DATA_ATTR_READ__"


def data_attr_to_dataset_key(data_attr: str) -> str:
    """`data-summary-one` -> `summaryOne`, the key `el.dataset` exposes."""
    name = data_attr[len("data-"):] if data_attr.startswith("data-") else data_attr
    return re.sub(r"-([a-z0-9])", lambda m: m.group(1).upper(), name)


def _blank_comments_and_strings(source: str) -> str:
    """Source with comments blanked and string contents kept, so the statement splitter never splits inside a
    comment. Strings keep their content because `getAttribute( 'data-x' )` names the attribute inside one."""
    out: list[str] = []
    i, n = 0, len(source)
    quote = ""
    while i < n:
        ch = source[i]
        if quote:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(source[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = ""
            i += 1
            continue
        if ch in "'\"`":
            quote = ch
            out.append(ch)
            i += 1
            continue
        if source.startswith("//", i):
            end = source.find("\n", i)
            i = n if end == -1 else end
            continue
        if source.startswith("/*", i):
            end = source.find("*/", i + 2)
            i = n if end == -1 else end + 2
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def split_statements(source: str) -> list[str]:
    """Split JavaScript at every `;` outside parentheses, brackets and strings.

    Braces are not tracked: a function body is split into its own statements, and an object literal holds no
    `;`. Block openers (`if ( x ) {`) stay glued to the statement that follows, which is harmless for a
    name-based reading."""
    text = _blank_comments_and_strings(source)
    statements: list[str] = []
    depth = 0
    quote = ""
    start = 0
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        if quote:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                quote = ""
        elif ch in "'\"`":
            quote = ch
        elif ch in "([":
            depth += 1
        elif ch in ")]":
            depth = max(0, depth - 1)
        elif ch == ";" and depth == 0:
            statements.append(text[start:i])
            start = i + 1
        i += 1
    statements.append(text[start:])
    return [s for s in statements if s.strip()]


def _source_patterns(data_attr: str) -> list[re.Pattern[str]]:
    key = re.escape(data_attr_to_dataset_key(data_attr))
    attr = re.escape(data_attr)
    return [
        re.compile(rf"\.dataset\s*\.\s*{key}\b"),
        re.compile(rf"\.dataset\s*\[\s*['\"]{key}['\"]\s*\]"),
        re.compile(rf"\.getAttribute\s*\(\s*['\"]{attr}['\"]\s*\)"),
    ]


def _destructuring_pattern(data_attr: str) -> re.Pattern[str]:
    """`const { summaryOne } = el.dataset`: the key itself becomes the tainted name."""
    key = re.escape(data_attr_to_dataset_key(data_attr))
    return re.compile(rf"\{{[^}}]*\b{key}\b[^}}]*\}}\s*=\s*[\w$.?]*\bdataset\b")


_INDEX = re.compile(r"(?<=[\w$\])])\s*\[[^\[\]]*\]")
_FUNCTION_VALUE = re.compile(r"\s*(?:async\s+)?(?:function\b|\([^()]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)")


def _without_index_expressions(text: str) -> str:
    """`labels[ key ]` keeps `labels` and drops `key`: a value used only to pick an entry is a lookup key, and the
    text written is the entry, not the key."""
    previous = None
    while previous != text:
        previous, text = text, _INDEX.sub("", text)
    return text


_OPERAND = r"[\w$.]+(?:\([^()]*\))?"
_LITERAL = r"'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\""
_EQUALITY = r"(?:===|!==|==|!=)"
_COMPARISON = re.compile(
    rf"{_OPERAND}\s*{_EQUALITY}\s*(?:{_OPERAND}|{_LITERAL})|(?:{_LITERAL})\s*{_EQUALITY}\s*{_OPERAND}"
)
_STRING = re.compile(rf"{_LITERAL}|`(?:[^`\\]|\\.)*`")
_TERNARY = re.compile(r"(?<!\?)\?(?![.?])")


def _without_comparisons(text: str) -> str:
    """`x === 'a'` keeps no `x`: an equality test yields a boolean, never the value compared. Only equality is
    stripped; `<` and `>` also open and close markup inside a string and would swallow the text around it."""
    return _COMPARISON.sub(" ", text)


def _without_ternary_tests(text: str) -> str:
    """`test ? a : b` keeps `a` and `b` and drops `test`: the condition picks a branch, and only a branch is written.
    The test runs back from the `?` to the nearest unmatched opening bracket, `,`, `:` or `;` (`:` ends an earlier
    branch, so `a ? b : c ? d : e` drops `a` and `c`). String contents are masked while looking for `?` and the
    boundary, so a question mark in text never counts."""
    while True:
        masked = _STRING.sub(lambda m: m.group(0)[0] + "_" * (len(m.group(0)) - 2) + m.group(0)[-1], text)
        mark = _TERNARY.search(masked)
        if mark is None:
            return text
        depth = 0
        i = mark.start() - 1
        while i >= 0:
            char = masked[i]
            if char in ")]}":
                depth += 1
            elif char in "([{":
                if depth == 0:
                    break
                depth -= 1
            elif char in ",:;" and depth == 0:
                break
            i -= 1
        text = text[: i + 1] + " " + text[mark.end():]


def _tainted_in(text: str, tainted: set[str]) -> bool:
    text = _without_ternary_tests(_without_comparisons(_without_index_expressions(text)))
    return any(re.search(rf"(?<![\w$.]){re.escape(name)}(?![\w$])", text) for name in tainted)


def _after_sink(statement: str) -> str | None:
    """The part of the statement after its text sink, or None when it has no sink."""
    sink = _SINK_ASSIGN.search(statement) or _SINK_CALL.search(statement)
    return statement[sink.end():] if sink else None


def source_reaches_text_sink(source: str, data_attr: str) -> bool:
    """True when `source` (one JavaScript file) reads `data_attr` and a text sink receives it."""
    patterns = _source_patterns(data_attr)
    statements = []
    found_read = False
    for statement in split_statements(source):
        for pattern in patterns:
            if pattern.search(statement):
                found_read = True
                statement = pattern.sub(f" {_SOURCE} ", statement)
        statements.append(statement)
    destructured = _destructuring_pattern(data_attr)
    destructures = any(destructured.search(statement) for statement in statements)
    if not (found_read or destructures):
        return False

    tainted = {_SOURCE}
    if destructures:
        tainted.add(data_attr_to_dataset_key(data_attr))
    changed = True
    while changed:
        changed = False
        for statement in statements:
            for match in _ASSIGN.finditer(statement):
                name = match.group(1)
                value = statement[match.end():]
                if name in tainted or _FUNCTION_VALUE.match(value):
                    continue
                if _tainted_in(value, tainted):
                    tainted.add(name)
                    changed = True

    for statement in statements:
        tail = _after_sink(statement)
        if tail is not None and _tainted_in(tail, tainted):
            return True
    return False


def view_script_paths(block_dir: Path) -> list[Path]:
    """The view script files `block.json` in `block_dir` registers."""
    try:
        meta = json.loads((block_dir / "block.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    paths: list[Path] = []
    for field in ("viewScriptModule", "viewScript"):
        value = meta.get(field)
        for entry in ([value] if isinstance(value, str) else value or []):
            if isinstance(entry, str) and entry.startswith("file:"):
                path = block_dir / entry[len("file:"):]
                if path.is_file():
                    paths.append(path)
    return paths


def find_block_dir(render_file: Path, block_slug: str | None = None) -> Path | None:
    """The block folder (the one holding `block.json`) that owns `render_file`.

    A file inside a block folder belongs to that block. A shared include (`includes/...`) belongs to the block
    named by `block_slug`, whose folder is `src/blocks/<name>` of the same plugin. None when neither resolves."""
    for folder in render_file.resolve().parents:
        if (folder / "block.json").is_file():
            return folder
        if folder.name == "src":
            break
    if block_slug and "/" in block_slug:
        name = block_slug.split("/", 1)[1]
        for folder in render_file.resolve().parents:
            candidate = folder / "src" / "blocks" / name
            if (candidate / "block.json").is_file():
                return candidate
    return None


def view_script_writes_data_attr_as_text(render_file: str | Path, data_attr: str, block_slug: str | None = None) -> bool:
    """True when a view script of the block that owns `render_file` writes `data_attr` into visible text."""
    block_dir = find_block_dir(Path(render_file), block_slug)
    if block_dir is None:
        return False
    for path in view_script_paths(block_dir):
        try:
            if source_reaches_text_sink(path.read_text(encoding="utf-8"), data_attr):
                return True
        except OSError:
            continue
    return False
