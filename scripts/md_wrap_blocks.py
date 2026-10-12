"""The block reader behind scripts/check-md-wrap.py: joins the lines of each paragraph and list item, copies the rest.

It reads blocks the way CommonMark (plus GFM tables) does, so a line is joined only when Markdown already reads it as
the paragraph above continuing: fenced and indented code, HTML blocks (start conditions 1 to 7 with their own end
conditions), tables (a header row with a pipe over a delimiter row, ending at a blank line), headings, rules and link
definitions are copied as they are, and a blockquote's body is read with the same rules at each quote depth. Leaving a
line unjoined never changes the rendering, so anything uncertain is left as it was.

`unwrap_lines` returns entries `(text, source_index, inserted)`; an inserted entry is a blank line the joiner added
before a label line or a genuine ordered list (the only intended rendering changes), which the render check replays
on the original.
"""
import re

FENCE = re.compile(r"^\s*(`{3,}|~{3,})")
BULLET = re.compile(r"^(\s*)([-*+])(\s+|$)")
ORDERED = re.compile(r"^(\s*)(\d{1,9})([.)])(\s+|$)")
HEADING = re.compile(r"^\s{0,3}#{1,6}(\s|$)")
RULE_OR_SETEXT = re.compile(r"^\s{0,3}([-*_])(\s*\1){2,}\s*$|^\s{0,3}(=+|-+)\s*$")
DELIM_CELL = re.compile(r"^:?-+:?$")
DELIM_CHARS = re.compile(r"^[\s|:-]+$")
LINK_DEF = re.compile(r"^\s{0,3}\[[^\]]+\]:\s")
LABEL = re.compile(r"^(Status:|\*\*[^*\n]{1,60}?[:.]\*\*|\*[A-Z][^*\n]{0,60}?[:.]\*|_[A-Z][^_\n]{0,60}?[:.]_)(\s|$)")
QUOTE_ONE = re.compile(r"^(\s*>\s?)")
HTML_BLOCK_TAGS = (
    "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|"
    "fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|"
    "main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|"
    "title|tr|track|ul"
)
_ATTR = r"(?:\s+[A-Za-z_:][\w.:-]*(?:\s*=\s*(?:[^\"'=<>`\s]+|'[^']*'|\"[^\"]*\"))?)"
HTML_STARTS = [  # (start, end); end None means the block ends at a blank line
    (re.compile(r"^<(pre|script|style|textarea)(\s|>|$)", re.I), re.compile(r"</(pre|script|style|textarea)>", re.I)),
    (re.compile(r"^<!--"), re.compile(r"-->")),
    (re.compile(r"^<\?"), re.compile(r"\?>")),
    (re.compile(r"^<![A-Za-z]"), re.compile(r">")),
    (re.compile(r"^<!\[CDATA\["), re.compile(r"\]\]>")),
    (re.compile(r"^</?(" + HTML_BLOCK_TAGS + r")(\s|/?>|$)", re.I), None),
]
HTML_SEVEN = re.compile(r"^(<[A-Za-z][A-Za-z0-9-]*" + _ATTR + r"*\s*/?>|</[A-Za-z][A-Za-z0-9-]*\s*>)\s*$")


def indent_of(line):
    return len(line) - len(line.lstrip(" "))


def list_item(line):
    """(indent, content column, number or None, delimiter, empty) for a list-item line, else None."""
    m = BULLET.match(line) or ORDERED.match(line)
    if not m:
        return None
    ordered = m.re is ORDERED
    marker_end = m.end(3) if ordered else m.end(2)
    gap = len(m.group(4 if ordered else 3))
    col = marker_end + (gap if 1 <= gap <= 4 else 1)
    empty = not line[m.end():].strip()
    return indent_of(line), col, (int(m.group(2)) if ordered else None), (m.group(3) if ordered else m.group(2)), empty


def html_start(line, para_open):
    """The end pattern (or None for 'blank line') when this line starts an HTML block, else False."""
    s = line.lstrip()
    for start, end in HTML_STARTS:
        if start.match(s):
            return end
    if not para_open and HTML_SEVEN.match(s):
        return None
    return False


def delimiter_row(line):
    s = line.strip()
    if not s or not DELIM_CHARS.match(s) or s[0] not in "|:-" or (s[0] == "-" and len(s) > 1 and s[1] == " "):
        return False
    cells = s.split("|")
    for k, c in enumerate(cells):
        c = c.strip()
        if not c:
            if k in (0, len(cells) - 1):
                continue
            return False
        if not DELIM_CELL.match(c):
            return False
    return True


def table_head(lines, i):
    return "|" in lines[i] and i + 1 < len(lines) and delimiter_row(lines[i + 1])


def hard_break(line):
    return line.endswith("  ") or line.endswith("\\")


def standalone(line):
    """A line never joined onto another and never joined onto: a heading, rule, setext underline or link definition."""
    return bool(HEADING.match(line) or RULE_OR_SETEXT.match(line) or LINK_DEF.match(line))


class Reader:
    """One container's lines (a document or a blockquote body), read once top to bottom."""

    def __init__(self, lines):
        self.lines = lines
        self.out = []  # [text, source_index, inserted]
        self.open = None  # 'para' or 'item' while the last emitted line may take a continuation line
        self.items = []  # (content column, marker indent, delimiter) of the open list items, innermost last

    def emit(self, i, text=None, kind=None):
        self.out.append([self.lines[i] if text is None else text, i, False])
        self.open = kind

    def insert_blank(self, i):
        self.out.append(["", i, True])

    def join(self, line):
        text = line.lstrip()
        self.out[-1][0] = self.out[-1][0].rstrip() + " " + (text if hard_break(text) else text.rstrip())

    def last_blank(self):
        return not self.out or not self.out[-1][0].strip()

    def run(self, start=0):
        lines, i, n = self.lines, start, len(self.lines)
        fence = html_end = None
        fence_ind = 0
        in_html = in_table = in_code = False
        while i < n:
            line = lines[i]
            if fence:
                self.emit(i)
                s = line.strip()
                if s[:1] == fence[0] and s == s[0] * len(s) and len(s) >= len(fence) and indent_of(line) <= fence_ind + 3:
                    fence = None
                i += 1
                continue
            if in_html:
                if html_end is None and not line.strip():
                    in_html = False
                    self.emit(i)
                    i += 1
                    continue
                self.emit(i)
                if html_end is not None and html_end.search(line):
                    in_html = False
                i += 1
                continue
            if in_table:
                if not line.strip():
                    in_table = False
                self.emit(i)
                i += 1
                continue
            if not line.strip():
                self.emit(i)
                i += 1
                continue
            ind = indent_of(line)
            code_col = (self.items[-1][0] if self.items else 0) + 4
            if in_code and ind >= code_col:
                self.emit(i)
                i += 1
                continue
            in_code = False
            if self.open is None and self.last_blank() and ind >= code_col:
                in_code = True
                self.emit(i)
                i += 1
                continue
            if self.open is None and self.last_blank():
                while self.items and self.items[-1][0] > ind:
                    self.items.pop()
            q = QUOTE_ONE.match(line)
            if q and ind < code_col:
                i = self.quote(i)
                continue
            m = FENCE.match(line)
            if m:
                fence, fence_ind = m.group(1), ind
                self.emit(i)
                i += 1
                continue
            end = html_start(line, self.open is not None)
            if end is not False:
                in_html = True
                html_end = end
                self.emit(i)
                if end is not None and end.search(line.lstrip()[4 if end.pattern == "-->" else 2:]):
                    in_html = False
                i += 1
                continue
            if table_head(lines, i):
                if self.open == "para" and not self.out[-1][0][:1].isspace():
                    self.out.append(["", i, False])  # GitHub reads a table after a paragraph either way; the blank keeps it plain
                in_table = True
                self.emit(i)
                i += 1
                continue
            if standalone(line):
                if not ind:
                    self.items = []
                self.emit(i)
                i += 1
                continue
            self.prose(i, line, ind)
            i += 1
        return self.out

    def quote(self, i):
        """Read the run of quoted lines from i with the same rules one level down; return the index after the run."""
        j, prefixes, bodies = i, [], []
        while j < len(self.lines):
            q = QUOTE_ONE.match(self.lines[j])
            if not q:
                break
            prefixes.append(q.group(1))
            bodies.append(self.lines[j][len(q.group(1)):])
            j += 1
        for text, src, inserted in Reader(bodies).run():
            pre = prefixes[src]
            self.out.append([pre.rstrip() if inserted or not text else pre + text, i + src, inserted])
        self.open = None
        return j

    def numbered_next(self, i, num):
        """True when the next line is the next item of the same `.` list (`4.` then `5.`): an author's list, not prose."""
        nxt = list_item(self.lines[i + 1]) if i + 1 < len(self.lines) else None
        return bool(nxt) and nxt[2] == num + 1 and nxt[3] == "."

    def prose(self, i, line, ind):
        item = list_item(line)
        top_para = self.open == "para" and not self.out[-1][0][:1].isspace() and not hard_break(self.out[-1][0])
        if item:
            _, col, num, delim, empty = item
            sibling = bool(self.items) and ind < self.items[-1][0]  # markdown-it: a marker left of the item's content starts a new item
            interrupts = sibling or (not empty and (num is None or num == 1) and ind < (self.items[-1][0] if self.items else 0) + 4)
            if self.open in ("para", "item") and not hard_break(self.out[-1][0]) and not interrupts:
                if top_para and num is not None and 2 <= num <= 99 and delim == "." and (self.out[-1][0].rstrip().endswith(":") or self.numbered_next(i, num)):
                    self.insert_blank(i)  # a genuine ordered list starting past 1: after a lead-in line, or numbered on
                else:
                    self.join(line)  # Markdown reads it as the paragraph continuing
                    return
            while self.items and self.items[-1][0] > ind:
                self.items.pop()
            self.items.append((col, ind, delim))
            self.emit(i, kind=None if empty else "item")
            return
        if self.open in ("para", "item") and not hard_break(self.out[-1][0]):
            if line.lstrip().startswith(">") or HTML_SEVEN.match(line.lstrip()):
                self.emit(i, kind=self.open)  # literal `>` text or a lone tag continuing a paragraph keeps its own line
                return
            if top_para and LABEL.match(line):
                self.insert_blank(i)
                self.emit(i, kind="para")
                return
            self.join(line)
            return
        if not ind and self.last_blank():
            self.items = []
        self.emit(i, kind="para")


def unwrap_lines(lines, start=0):
    out = [[t, k, False] for k, t in enumerate(lines[:start])]
    return out + Reader(lines).run(start)
