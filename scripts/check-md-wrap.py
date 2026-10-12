#!/usr/bin/env python
"""No hard-wrapped Markdown: every paragraph, list item and blockquote paragraph is one unbroken line.

Bean reads these files on screens of every width; a line broken at a fixed column reads as a break in the middle of a
sentence. This joins the lines of each paragraph and list item with one space and changes nothing else: code (fenced
or indented), tables, headings, HTML, front matter and hard line breaks are copied as they are. A line that starts its
own block although Markdown would read it as the paragraph above continuing (a label such as `Status:` or
`*Done when:*`, an ordered list starting past 1, a table) gets a blank line before it instead of being joined.

The only changes are whitespace and blockquote markers on joined lines, so `--write` refuses to save a file whose text
differs from the original in anything else (the safety check in `same_text`).

Usage:
  python scripts/check-md-wrap.py --check [files…]   exit 1 naming each wrapped file (default: staged .md files)
  python scripts/check-md-wrap.py --write [files…]   unwrap in place (default: every tracked .md file in scope)
  python scripts/check-md-wrap.py --self-test

Out of scope (never rewritten): a client's Claude Design export (sites/*/handoff/, Spec 48A FR-48A-1) and older
exports (sites/*/design_handoff*/), any folder under a MANIFEST.json, test fixtures, reference/, the frozen
.claude/archive/ and .claude/claude-design-handoff/ (uploaded to Claude Design as is).
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_OF_SCOPE_PREFIX = re.compile(r"^(sites/[^/]+/(handoff|design_handoff[^/]*|[^/]*Handoff)/|reference/|\.claude/archive/|\.claude/claude-design-handoff/)")
OUT_OF_SCOPE_DIR = re.compile(r"(^|/)(node_modules|fixtures)/")

FENCE = re.compile(r"^\s*(`{3,}|~{3,})")
LIST_ITEM = re.compile(r"^\s*([-*+]|\d+[.)])(\s+|$)")
ORDERED_PAST_ONE = re.compile(r"^(\d+)[.)]\s")
HEADING = re.compile(r"^\s{0,3}#{1,6}(\s|$)")
RULE_OR_SETEXT = re.compile(r"^\s{0,3}([-*_=])(\s*\1){2,}\s*$|^\s{0,3}=+\s*$")
DELIMITER = re.compile(r"^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$")
LINK_DEF = re.compile(r"^\s{0,3}\[[^\]]+\]:\s")
LABEL = re.compile(r"^(Status:|\*\*[^*\n]{1,60}?[:.]\*\*|\*[A-Z][^*\n]{0,60}?[:.]\*|_[A-Z][^_\n]{0,60}?[:.]_)(\s|$)")
QUOTE = re.compile(r"^(\s*(?:>\s?)+)")


def in_scope(rel):
    """A Markdown file we may rewrite: not a draft export, a fixture or a frozen record, nor under a MANIFEST.json."""
    rel = rel.replace("\\", "/")
    if not rel.endswith(".md") or OUT_OF_SCOPE_PREFIX.match(rel) or OUT_OF_SCOPE_DIR.search(rel):
        return False
    d = (ROOT / rel).parent
    while d != ROOT and ROOT in d.parents:
        if (d / "MANIFEST.json").exists():
            return False
        d = d.parent
    return True


def front_matter_end(lines):
    """The index after a leading `---` front-matter block, or 0."""
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                return i + 1
    return 0


def is_table_row(lines, i, in_table):
    s = lines[i].lstrip()
    return s.startswith("|") and (in_table or (i + 1 < len(lines) and bool(DELIMITER.match(lines[i + 1]))))


def standalone(line):
    """A line that is never joined onto, and never joins onto, another: a heading, rule, HTML or link definition."""
    s = line.lstrip()
    return bool(HEADING.match(line) or RULE_OR_SETEXT.match(line) or LINK_DEF.match(line) or s.startswith("<"))


def hard_break(line):
    return line.endswith("  ") or line.endswith("\\")


def starts_own_block(line):
    """A line Markdown reads as paragraph text but the author meant as its own block."""
    m = ORDERED_PAST_ONE.match(line)
    return bool(LABEL.match(line) or (m and m.group(1) != "1"))


class Joiner:
    """Walks the lines once, keeping the last emitted line open for joining while it is prose."""

    def __init__(self, lines):
        self.lines = lines
        self.out = []
        self.open = None  # 'para', 'item' or 'quote:<prefix>' while the last emitted line may take a continuation

    def emit(self, line, open_kind=None):
        self.out.append(line)
        self.open = open_kind

    def join(self, text):
        self.out[-1] = self.out[-1].rstrip() + " " + text.strip()

    def prose(self, line):
        quote = QUOTE.match(line)
        if quote:
            kind = "quote:" + quote.group(1).replace(" ", "")
            body = line[len(quote.group(1)):]
            if self.open == kind and body.strip() and not LIST_ITEM.match(body) and not standalone(body) and not hard_break(self.out[-1]):
                self.join(body)
            else:
                self.emit(line, kind if body.strip() else None)
            return
        after_para = self.open == "para" and not self.out[-1][:1].isspace()
        if LIST_ITEM.match(line):
            if after_para and starts_own_block(line):
                self.emit("")
            self.emit(line, "item")
            return
        if self.open in ("para", "item") and not hard_break(self.out[-1]):
            if after_para and starts_own_block(line):
                self.emit("")
                self.emit(line, "para")
                return
            self.join(line)
            return
        self.emit(line, "para")


def unwrap(text):
    """The text with every paragraph, list item and blockquote paragraph on one line; nothing else changes."""
    lines = text.split("\n")
    at = front_matter_end(lines)
    j = Joiner(lines)
    j.out = lines[:at]
    fence = None
    in_table = False
    for i in range(at, len(lines)):
        line = lines[i]
        if fence:
            j.emit(line)
            if FENCE.match(line) and line.strip().startswith(fence):
                fence = None
            continue
        m = FENCE.match(line)
        if m:
            fence = m.group(1)[0] * 3
            j.emit(line)
            continue
        opens_table = not in_table and is_table_row(lines, i, False)
        in_table = is_table_row(lines, i, in_table)
        if in_table:
            if opens_table and j.open in ("para", "item"):
                j.emit("")  # a table straight after a paragraph is read as that paragraph continuing
            j.emit(line)
            continue
        if not line.strip():
            j.emit(line)
            continue
        if standalone(line):
            j.emit(line)
            continue
        if j.open is None and (j.out and not j.out[-1].strip()) and line.startswith("    ") and not LIST_ITEM.match(line):
            j.emit(line)  # indented code after a blank line
            continue
        j.prose(line)
    return "\n".join(j.out)


def same_text(a, b):
    """True when a and b differ only in whitespace and in the blockquote markers that start joined lines."""
    strip = lambda t: re.sub(r"\s+", "", re.sub(r"(?m)^\s*(>\s?)+", "", t))  # noqa: E731
    return strip(a) == strip(b)


def tracked():
    r = subprocess.run(["git", "ls-files", "*.md"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    return [f for f in r.stdout.splitlines() if in_scope(f)]


def staged():
    r = subprocess.run(["git", "diff", "--cached", "--name-only", "--diff-filter=AM"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    return [f for f in r.stdout.splitlines() if in_scope(f)]


def read(rel):
    try:
        return (ROOT / rel).read_bytes().decode("utf-8")
    except (UnicodeDecodeError, FileNotFoundError):
        return None


def check(files):
    bad = []
    for rel in files:
        t = read(rel)
        if t is not None and unwrap(t.replace("\r\n", "\n")) != t.replace("\r\n", "\n"):
            bad.append(rel)
    if bad:
        print("check-md-wrap: hard-wrapped Markdown (one line per paragraph or list item). Fix with:", file=sys.stderr)
        print(f"    python scripts/check-md-wrap.py --write {' '.join(bad)}", file=sys.stderr)
        return 1
    return 0


def write(files):
    done, skipped = 0, []
    for rel in files:
        t = read(rel)
        if t is None:
            skipped.append(f"{rel} (not UTF-8)")
            continue
        crlf = "\r\n" in t
        src = t.replace("\r\n", "\n")
        new = unwrap(src)
        if not same_text(src, new):
            skipped.append(f"{rel} (the joiner changed more than whitespace; left as it was)")
            continue
        if new != src:
            (ROOT / rel).write_bytes((new.replace("\n", "\r\n") if crlf else new).encode("utf-8"))
            done += 1
    for s in skipped:
        print(f"check-md-wrap: skipped {s}", file=sys.stderr)
    print(f"check-md-wrap: {done} file(s) unwrapped, {len(skipped)} skipped")
    return 1 if any("joiner" in s for s in skipped) else 0


def self_test():
    cases = [
        ("A sentence broken\nat a column.\n", "A sentence broken at a column.\n"),
        ("Text here.\nStatus: built.\n", "Text here.\n\nStatus: built.\n"),
        ("Text here.\n*Done when:* x\n", "Text here.\n\n*Done when:* x\n"),
        ("- a list item broken\n  over two lines\n- next\n", "- a list item broken over two lines\n- next\n"),
        ("Steps:\n4. four\n5. five\n", "Steps:\n\n4. four\n5. five\n"),
        ("```js\nconst a = {\n  b: 1 };\n```\n", "```js\nconst a = {\n  b: 1 };\n```\n"),
        ("Intro.\n| a | b |\n|---|---|\n| `x|y` | 2 |\n", "Intro.\n\n| a | b |\n|---|---|\n| `x|y` | 2 |\n"),
        ("Run (`wp x a|b\n| c`) now.\n", "Run (`wp x a|b | c`) now.\n"),
        ("> quoted line\n> carries on\n", "> quoted line carries on\n"),
        ("Line with break  \nnext line\n", "Line with break  \nnext line\n"),
        ("# Heading\ntext\n", "# Heading\ntext\n"),
        ("Title\n---\n", "Title\n---\n"),
        ("---\nname: x\ndescription: a\n  b\n---\n\nbody\nmore\n", "---\nname: x\ndescription: a\n  b\n---\n\nbody more\n"),
        ("Para.\n\n    code line\n    more code\n", "Para.\n\n    code line\n    more code\n"),
        ("css `rm -rf a/*.css`\nand styles/*.json\n", "css `rm -rf a/*.css` and styles/*.json\n"),
    ]
    for src, want in cases:
        got = unwrap(src)
        assert got == want, f"\nsrc  {src!r}\nwant {want!r}\ngot  {got!r}"
        assert same_text(src, got) and unwrap(got) == got, f"not a whitespace-only fixed point: {src!r}"
    assert not same_text("a *b*", "a _b_"), "MUST FAIL: the safety check refuses any non-whitespace change"
    assert not in_scope("sites/acme/handoff/README.md") and not in_scope(".claude/archive/x.md") and in_scope(".claude/LEDGER.md")
    assert not in_scope("scripts/computed-route/tests/fixtures/x/README.md"), "fixtures are never rewritten"
    print("check-md-wrap self-test: OK")
    return 0


def main(argv):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    args = [a for a in argv if not a.startswith("--")]
    if "--self-test" in argv:
        return self_test()
    if "--write" in argv:
        return write([a for a in args if in_scope(a)] or tracked())
    if "--check" in argv:
        return check([a for a in args if in_scope(a)] if args else staged())
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
