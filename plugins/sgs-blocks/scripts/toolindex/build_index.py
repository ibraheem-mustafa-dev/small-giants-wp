#!/usr/bin/env python3
"""
build_index.py — extracts a searchable purpose index from every script in
plugins/sgs-blocks/scripts/.

Problem this solves: a session knows its INTENT ("check whether the CSS I
emit is actually correct on the live site") but not a tool's filename, and
with ~800 scripts in this tree there is no way to browse them all. Many of
these scripts carry unusually rich header docblocks (prose, not just a
one-liner) — this tool extracts that prose into one JSON index so a later
query script can rank scripts against a free-text intent description
instead of a filename guess.

Extraction rules (language-specific, header-only — never full-file scan):
  - .py   : the module-level triple-quoted docstring (after an optional
            shebang / encoding comment / blank lines).
  - .js/.mjs : the first /** ... */ block comment (after an optional
            shebang, 'use strict', and blank lines). Falls back to a
            leading run of // line comments if no block comment is found.
  - .sh/.ps1 : a leading run of '#' line comments (after an optional
            shebang).

A file with none of the above gets doc_text = "" and is recorded as
UNDOCUMENTED in the coverage summary — it is not dropped from the index,
so the coverage number in the report is exact, not a filtered guess.

Usage:
    python build_index.py                # writes index.json + prints summary
    python build_index.py --scripts-root <path>   # override root (testing)
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

CODE_EXTS = {".py", ".js", ".mjs", ".sh", ".ps1"}
SKIP_DIR_NAMES = {"__pycache__", "node_modules", ".git", "pytest_cache", "mypy_cache", "toolindex"}
# toolindex is this indexer's own directory — excluded from the corpus it
# builds so the tool never lists itself as a search result for a query
# whose wording happens to echo this file's own docstring.

# Header scanning is done with a manual line walk, not a single greedy
# DOTALL regex over the whole file — an early version of this used
# `(?:#.*\n|\s*\n)*` / `(.*?)` under re.DOTALL and hung (catastrophic
# backtracking) on files where the pattern didn't match near the top. A
# bounded line-by-line scan of at most HEADER_SCAN_LINES has no backtracking
# and is the only extraction strategy shipped here.
HEADER_SCAN_LINES = 80


def clean_js_block(raw: str) -> str:
    lines = []
    for line in raw.splitlines():
        line = line.strip()
        line = re.sub(r"^\*\s?", "", line)
        lines.append(line)
    return "\n".join(lines).strip()


def clean_line_comments(lines, marker: str) -> str:
    out = []
    for line in lines:
        line = line.strip()
        if line.startswith(marker):
            line = line[len(marker):].strip()
        out.append(line)
    return "\n".join(out).strip()


def extract_python_doc(text: str) -> str:
    lines = text.split("\n", HEADER_SCAN_LINES)[:HEADER_SCAN_LINES]
    i = 0
    n = len(lines)
    if i < n and lines[i].startswith("#!"):
        i += 1
    # skip leading blank lines / '#'-coding comments before the docstring
    while i < n and (lines[i].strip() == "" or lines[i].strip().startswith("#")):
        i += 1
    if i >= n:
        return ""
    line = lines[i]
    stripped = line.lstrip()
    quote = None
    for prefix_len in (0, 1, 2):
        candidate = stripped[prefix_len:prefix_len + 3]
        if candidate in ('"""', "'''"):
            quote = candidate
            stripped = stripped[prefix_len + 3:]
            break
    if quote is None:
        return ""
    # Reassemble the remainder of the file (bounded) to find the closing
    # triple-quote without re-scanning the whole file as one regex target.
    remainder = stripped + "\n" + "\n".join(lines[i + 1:])
    end = remainder.find(quote)
    if end == -1:
        return remainder.strip()
    return remainder[:end].strip()


def extract_js_doc(text: str) -> str:
    lines = text.split("\n", HEADER_SCAN_LINES)[:HEADER_SCAN_LINES]
    i = 0
    n = len(lines)
    if i < n and lines[i].startswith("#!"):
        i += 1
    while i < n and (
        lines[i].strip() == ""
        or re.match(r'^[\'"]use strict[\'"];?$', lines[i].strip())
    ):
        i += 1
    if i >= n:
        return ""
    stripped = lines[i].strip()
    if stripped.startswith("/**") or stripped.startswith("/*"):
        remainder = "\n".join(lines[i:])
        start = remainder.find("/*")
        end = remainder.find("*/", start + 2)
        if end == -1:
            return clean_js_block(remainder[start + 2:])
        return clean_js_block(remainder[start + 2:end])
    if stripped.startswith("//"):
        collected = []
        j = i
        while j < n and lines[j].strip().startswith("//"):
            collected.append(lines[j])
            j += 1
        return clean_line_comments(collected, "//")
    return ""


def extract_shell_doc(text: str) -> str:
    lines = text.split("\n", HEADER_SCAN_LINES)[:HEADER_SCAN_LINES]
    i = 0
    n = len(lines)
    if i < n and lines[i].startswith("#!"):
        i += 1
    collected = []
    while i < n and lines[i].strip().startswith("#"):
        collected.append(lines[i])
        i += 1
    return clean_line_comments(collected, "#")


def extract_doc(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""
    ext = path.suffix.lower()
    if ext == ".py":
        return extract_python_doc(text)
    if ext in (".js", ".mjs"):
        return extract_js_doc(text)
    if ext in (".sh", ".ps1"):
        return extract_shell_doc(text)
    return ""


def first_sentence(doc_text: str, limit: int = 220) -> str:
    if not doc_text:
        return ""
    collapsed = re.sub(r"\s+", " ", doc_text).strip()
    m = re.search(r"^(.{0,%d}?[.!?])(\s|$)" % limit, collapsed)
    snippet = m.group(1) if m else collapsed[:limit]
    return snippet.strip()


def iter_scripts(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIR_NAMES]
        for fn in filenames:
            ext = Path(fn).suffix.lower()
            if ext in CODE_EXTS:
                yield Path(dirpath) / fn


def build(scripts_root: Path, out_path: Path) -> dict:
    entries = []
    undocumented = []
    for path in sorted(iter_scripts(scripts_root)):
        rel = path.relative_to(scripts_root.parent).as_posix()
        doc = extract_doc(path)
        entry = {
            "path": rel,
            "filename": path.name,
            "ext": path.suffix.lower(),
            "doc_text": doc,
            "summary": first_sentence(doc),
            "doc_chars": len(doc),
        }
        entries.append(entry)
        if not doc:
            undocumented.append(rel)

    index = {
        "generated_from": scripts_root.as_posix(),
        "total_scripts": len(entries),
        "documented_count": len(entries) - len(undocumented),
        "undocumented_count": len(undocumented),
        "entries": entries,
    }
    out_path.write_text(json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8")
    return index, undocumented


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    default_root = Path(__file__).resolve().parent.parent
    parser.add_argument("--scripts-root", type=Path, default=default_root)
    parser.add_argument(
        "--out", type=Path, default=Path(__file__).resolve().parent / "index.json"
    )
    args = parser.parse_args()

    index, undocumented = build(args.scripts_root, args.out)

    print(f"Scripts root: {args.scripts_root}")
    print(f"Total code scripts (.py/.js/.mjs/.sh/.ps1): {index['total_scripts']}")
    print(f"With extractable header doc: {index['documented_count']}")
    print(f"Without any extractable header doc: {index['undocumented_count']}")
    print(f"Index written to: {args.out}")
    if undocumented:
        undoc_path = args.out.parent / "undocumented.txt"
        undoc_path.write_text("\n".join(undocumented), encoding="utf-8")
        print(f"List of undocumented files: {undoc_path}")


if __name__ == "__main__":
    sys.exit(main())
