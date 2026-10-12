#!/usr/bin/env python
"""No hard-wrapped Markdown: every paragraph, list item and blockquote paragraph is one unbroken line.

Bean reads these files on screens of every width; a line broken at a fixed column reads as a break in the middle of a
sentence. This joins the lines of each paragraph and list item with one space and changes nothing else: code (fenced
or indented), tables, headings, HTML, front matter and hard line breaks are copied as they are. A line that starts its
own block although Markdown would read it as the paragraph above continuing (a label such as `Status:` or
`*Done when:*`, or `2.` to `99.` after a line ending in `:`) gets a blank line before it instead of being joined. The
block rules (HTML blocks, tables, quotes, code) live in scripts/md_wrap_blocks.py.

`--write` refuses a file whose text changes in more than whitespace and blockquote markers (`same_text`), and, when
markdown-it-py is installed, a file whose CommonMark + table rendering changes beyond those intended blank lines
(`render_same`).

Usage:
  python scripts/check-md-wrap.py --check [files…]   exit 1 naming each wrapped file (default: staged .md files)
  python scripts/check-md-wrap.py --write [files…]   unwrap in place (default: every tracked .md file in scope)
  python scripts/check-md-wrap.py --self-test [--against <older check-md-wrap.py>]

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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from md_wrap_blocks import unwrap_lines  # noqa: E402  (the block reader; loaded by file path from the catalogue generators too)


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



def unwrap_entries(text):
    """The block reader's entries for text: (line, source index, inserted) per output line."""
    lines = text.split("\n")
    return unwrap_lines(lines, front_matter_end(lines))


def unwrap(text):
    """The text with every paragraph, list item and blockquote paragraph on one line; nothing else changes."""
    return "\n".join(e[0] for e in unwrap_entries(text))


def with_inserted_blanks(text, entries):
    """The original text with only the joiner's intended blank lines (before a label or an ordered list) added."""
    before = {}
    for line, src, inserted in entries:
        if inserted:
            before.setdefault(src, []).append(line)
    out = []
    for k, line in enumerate(text.split("\n")):
        out.extend(before.get(k, []))
        out.append(line)
    return "\n".join(out)


_MD = None


def render(text):
    """markdown-it-py's CommonMark + table HTML for text with whitespace normalised, or None when it is not installed."""
    global _MD
    if _MD is None:
        try:
            from markdown_it import MarkdownIt
        except ImportError:
            return None
        _MD = MarkdownIt("commonmark").enable("table")
    parts = re.split(r"(<pre[\s>].*?</pre>)", _MD.render(text), flags=re.S | re.I)  # whitespace inside <pre> counts
    return "".join(p if k % 2 else re.sub(r"\s+", " ", re.sub(r">\s+<", "><", p)) for k, p in enumerate(parts)).strip()


def render_same(src, entries=None):
    """True when unwrapping src changes its rendering only by the intended blank lines (or markdown-it is missing)."""
    entries = unwrap_entries(src) if entries is None else entries
    new = "\n".join(e[0] for e in entries)
    a = render(with_inserted_blanks(src, entries))
    return a is None or a == render(new)


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
        entries = unwrap_entries(src)
        new = "\n".join(e[0] for e in entries)
        if not same_text(src, new):
            skipped.append(f"{rel} (the joiner changed more than whitespace; left as it was)")
            continue
        if not render_same(src, entries):
            skipped.append(f"{rel} (the joiner changed the rendering; left as it was)")
            continue
        if new != src:
            (ROOT / rel).write_bytes((new.replace("\n", "\r\n") if crlf else new).encode("utf-8"))
            done += 1
    for s in skipped:
        print(f"check-md-wrap: skipped {s}", file=sys.stderr)
    print(f"check-md-wrap: {done} file(s) unwrapped, {len(skipped)} skipped")
    return 1 if any("joiner" in s for s in skipped) else 0


SELF_TEST_CASES = [
    ("A sentence broken\nat a column.\n", "A sentence broken at a column.\n"),
    ("Text here.\nStatus: built.\n", "Text here.\n\nStatus: built.\n"),
    ("Text here.\n*Done when:* x\n", "Text here.\n\n*Done when:* x\n"),
    ("- a list item broken\n  over two lines\n- next\n", "- a list item broken over two lines\n- next\n"),
    ("Steps:\n4. four\n5. five\n", "Steps:\n\n4. four\n5. five\n"),
    ("Then we do\n4. four\n5. five\n", "Then we do\n\n4. four\n5. five\n"),
    ("Pages fell from\n4. Then they rose.\n", "Pages fell from 4. Then they rose.\n"),
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
# Each of these renders differently under the c814f7fbe joiner (MUST FAIL there); the comment names the defect.
MUST_FAIL_OLD = [
    ("> | a | b |\n> |---|---|\n> | 1 | 2 |\n", "> | a | b |\n> |---|---|\n> | 1 | 2 |\n"),  # 1 quoted table
    ("> ```\n> code\n> more\n> ```\n", "> ```\n> code\n> more\n> ```\n"),  # 1 quoted fence
    ("> # Head\n> text\n> more\n", "> # Head\n> text more\n"),  # 1 quoted heading swallows the next line
    ("<!--\nx\n-->\ntext\nmore\n", "<!--\nx\n-->\ntext more\n"),  # 2 multi-line comment
    ("<pre>\nsome text\nmore\n</pre>\n", "<pre>\nsome text\nmore\n</pre>\n"),  # 2 HTML block to its closing tag
    ("Text ending here\n2425) with more\n", "Text ending here 2425) with more\n"),  # 3 large number, `)`
    ("It sets:\n2) how many\n", "It sets: 2) how many\n"),  # 3 `)` delimiter never splits
    ("a | b\n--|--\n1 | 2\n", "a | b\n--|--\n1 | 2\n"),  # 4 table without a leading pipe
    ("| a |\n|---|\n| 1 |\ntrailing\nline\n", "| a |\n|---|\n| 1 |\ntrailing\nline\n"),  # 5 lines after a table
    ("- item\n  | a | b |\n  |---|---|\n  | 1 | 2 |\n", "- item\n  | a | b |\n  |---|---|\n  | 1 | 2 |\n"),  # 5 table in a list item
    ("Para.\n\n    a\n    b\n    c\n", "Para.\n\n    a\n    b\n    c\n"),  # indented code of three lines
]


def self_test(old_unwrap=None):
    """Every case unwraps as expected, is a fixed point and keeps its rendering; with old_unwrap, prove each
    MUST_FAIL_OLD case fails under it (renders differently from its source)."""
    for src, want in SELF_TEST_CASES + MUST_FAIL_OLD:
        got = unwrap(src)
        assert got == want, f"\nsrc  {src!r}\nwant {want!r}\ngot  {got!r}"
        assert same_text(src, got) and unwrap(got) == got, f"not a whitespace-only fixed point: {src!r}"
        assert render_same(src), f"rendering changed beyond the intended blank lines: {src!r}"
    if render("x") is not None:
        bad = "<!--\nx\n-->\ntext\n"
        assert not render_same(bad, [["<!--", 0, False], ["x --> text", 1, False]]), "MUST FAIL: the render check refuses a joined HTML comment"
    if old_unwrap:
        for src, _ in MUST_FAIL_OLD:
            assert render(old_unwrap(src)) != render(src), f"MUST FAIL case passes under the old joiner: {src!r}"
        print(f"check-md-wrap self-test: all {len(MUST_FAIL_OLD)} MUST FAIL cases render differently under the old joiner")
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
        old = None
        if "--against" in argv:  # a path to an earlier check-md-wrap.py whose unwrap the MUST FAIL cases must fail under
            import importlib.util
            spec = importlib.util.spec_from_file_location("old_md_wrap", argv[argv.index("--against") + 1])
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            old = mod.unwrap
        return self_test(old)
    if "--write" in argv:
        return write([a for a in args if in_scope(a)] or tracked())
    if "--check" in argv:
        return check([a for a in args if in_scope(a)] if args else staged())
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
