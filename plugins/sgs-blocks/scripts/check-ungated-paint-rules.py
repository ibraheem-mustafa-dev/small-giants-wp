#!/usr/bin/env python3
"""
check-ungated-paint-rules.py

STRUCTURAL GUARD (WARN-ONLY for this build) — Spec 41 FR-41-35 / gate §11 G20c.

WHAT IT DETECTS
---------------
A `background` or `border` declaration EMITTED (a block's `render.php`) or
AUTHORED (a block's `style.css`) on a selector that is neither wrapped in a
PHP `if` gating an operator attribute, nor structurally incapable of the
defect (a reset, a zero-specificity `:where()` default, an a11y rule, a
wrapper-delegated paint, or a genuinely attribute-driven `var()` with a real
writer). Both CSS surfaces, one run, per block.

This is the enforcement half of FR-41-15's `sgs/nav-menu` census: three
consecutive human reviews of that one block each under-counted the same
defect class (a `background`/`border` SHORTHAND emitted unconditionally,
resetting `background-image` to `none` and silently erasing a text-sweep
gradient on hover) because the search was bounded one notch narrower than the
defect each time — literal-string scan, then a line-RANGE, then a
line-ANCHORED grep restricted to one file. Prose describing the correct
method is not enforcement; this script is.

⛔ FRAMEWORK-WIDE BY DESIGN, NOT A `sgs/nav-menu` LINT. FR-41-15's corrected
methodology contains nothing nav-menu-specific: join each CSS-emitting
statement to its terminating `;`, test the joined text for a `background`/
`border` declaration, then read the block's own `style.css` for the same
shape. The classification input ("is this gated on an operator attribute?")
is read from the SAME file's own PHP structure (an enclosing `if`), never
from a block-name lookup. If you find yourself writing a literal BEM class
name belonging to one specific block into an EXEMPTION rule, you have
written a lint, not a gate — generalise instead. (The `--block` CLI flag and
the fixtures directory are the only places a concrete block slug legitimately
appears; this file's own source carries none — see the grep proof in the
phase plan's Step 11.)

WHY A CHARACTER-BOUNDARY PARSER, NOT FR-41-15's LINE-JOIN VERBATIM
-------------------------------------------------------------------
FR-41-15's own worked script joins LINES up to a terminating `;`, because it
is a quick one-off scan. This script instead builds a mask over the WHOLE
FILE that marks every character as "real code" or "inside a string/comment"
(a PHP string can itself contain a literal `{`/`}`/`;` character — e.g.
`$css .= $sel . '{' . $decl . '}';` — which would corrupt a naive brace or
line-based join), then walks the file once from a stack of every currently
OPEN `{`-block, splitting on each real (`;`) or (`{`)/(`}`) boundary. This
achieves EXACTLY the same semantic FR-41-15 asks for — "join to the
terminating `;` before testing" — generalised so it is immune to the same
three failure shapes FR-41-15's own history table names (a literal-string
scan, a line-RANGE, a line-ANCHORED grep), because it never looks at a line
count at all. The same walk is reused, unmodified, for `style.css` (a real
CSS declaration list, where `;` boundaries are never inside a string in this
codebase's own stylesheets), which is why one function serves both surfaces.

⚠ NOT VARIABLE-AWARE — carried forward from FR-41-15, not fixed here (see
`VARIABLE_AWARENESS_LIMIT` below, always printed by `--survey`). A
declaration assembled into an intermediate PHP variable in one statement and
appended to the CSS accumulator in a LATER, separate statement is invisible
to a single-statement join, by construction. `sgs/nav-menu`'s own
`$sgs_nm_featured_vars` assembly is a live instance of this exact shape.

⚠ ALSO NOT FULLY CROSS-STATEMENT AWARE for the "reset" exemption — see
`RESET_STATEMENT_LIMIT` below, also always printed by `--survey`.

MODES
-----
    --survey [--block sgs/x]   census, in FR-41-15's three-bucket form
    --check  [--block sgs/x]   WARN-ONLY: print every finding, ALWAYS exit 0
    --self-test                fixture round-trip, both directions

`--check` is deliberately warn-only for this build (Spec 41 phase-plan Step
11 / owner ruling 4). The hard-fail scope is a single named module constant,
`HARD_FAIL_BLOCKS`, left empty here; Step 26 sets it (reading the scope from
`plugins/sgs-blocks/scripts/gates.json`'s own config for this gate's entry,
never as a dict hardcoded in this file — R-31-1) to `['sgs/nav-menu']` once
the tree is clean. Framework-wide hardening beyond that is separate future
work, triaged against a real no-filter `--survey` run.

UK English throughout.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent            # plugins/sgs-blocks/scripts/
_PLUGIN_ROOT = _HERE.parent                         # plugins/sgs-blocks/
_BLOCKS_DIR = _PLUGIN_ROOT / "src" / "blocks"
_FIXTURES_DIR = _HERE / "fixtures" / "ungated-paint"

# ---------------------------------------------------------------------------
# Enforcement scope (FR-41-35(f), owner ruling 4, 2026-09-11)
# ---------------------------------------------------------------------------
# WARN-ONLY for this build. `--check` always exits 0 regardless of findings —
# the tree still holds the eleven `sgs/nav-menu` rules FR-41-15 has not yet
# removed, and a gate that always fails trains readers to skip it (this
# project's own recorded `wp-pre-merge-gate` failure shape).
#
# Step 26 sets this to the gates.json-configured scope — `['sgs/nav-menu']`
# for this phase — and flips `--check` to fail closed for exactly those
# blocks while every other block's findings stay printed-and-passing.
# Framework-wide hardening beyond that is separate future work, triaged
# against a real no-filter `--survey` run.
HARD_FAIL_BLOCKS: list[str] = []


# ---------------------------------------------------------------------------
# Disclosed limits — printed verbatim by every `--survey` run (FR-41-35c).
# A census that overstates its own reach is the defect this detector exists
# to end, so these are never silent.
# ---------------------------------------------------------------------------
VARIABLE_AWARENESS_LIMIT = (
    "This scan is STATEMENT-aware (a declaration split across multiple "
    "physical lines within one PHP statement or one CSS rule is still seen) "
    "but NOT VARIABLE-aware. A declaration assembled into an intermediate "
    "PHP variable in one statement and appended to the CSS accumulator in a "
    "LATER, separate statement is outside what this scan can see — the join "
    "follows one statement to its terminating ';', never a value carried "
    "across two. `sgs/nav-menu`'s own `$sgs_nm_featured_vars` assembly is a "
    "live instance of this exact shape; it happens not to matter there only "
    "because its declarations are custom-property ASSIGNMENTS "
    "(`--sgs-nm-featured-bg:`), which never match the background/border "
    "regex. The next rule built the same way, with a real property name "
    "inside it, would be invisible here."
)

RESET_STATEMENT_LIMIT = (
    "The 'reset with no competing operator value' exemption is evaluated "
    "PER STATEMENT / PER RULE only — it checks sibling declarations in the "
    "SAME statement or rule, not the rest of the file. A suppression that "
    "must stay conditional because a DIFFERENT statement elsewhere in the "
    "file governs the same property on the same selector is exempted here "
    "as a bare reset. FR-41-15 census #1's `border:0` (which must be gated "
    "on `submenuBorderWidth`, a condition that lives in a different "
    "statement) is a known instance of this residual."
)

WRAPPER_DELEGATED_LIMIT = (
    "The 'wrapper-delegated' exemption fires on any statement/rule whose "
    "text references the shared `SGS_Container_Wrapper` symbol. It does "
    "NOT walk into that shared class's own source to verify the delegation "
    "is genuine — a block that merely NAMES the symbol in a comment would "
    "also be exempted. No false instance of this is known today; disclosed "
    "as a limit of the heuristic, not a proven gap."
)

VAR_WRITER_UNCONDITIONAL_READ_LIMIT = (
    "The var()-with-writer exemption verifies the WRITER exists and is "
    "empty-guarded — it does NOT verify the READING statement is ALSO "
    "conditional on that same write having happened. FR-41-15 census #7 "
    "(`sgs/nav-menu`'s featured sub-item resting paint) is exactly this "
    "shape: `--sgs-nm-featured-bg` genuinely has a guarded writer, so this "
    "exemption fires and dismisses it — but FR-41-15 still classifies the "
    "statement as CENSUSED (fate: CONVERT), because the READ itself is "
    "unconditional and paints its own hardcoded fallback whenever the "
    "writer's guard did not fire. This detector cannot see that distinction "
    "from the declaration alone; a writer existing is treated as sufficient. "
    "Read a var()-with-writer dismissal by hand before trusting it closed."
)

ALL_LIMITS = (
    VARIABLE_AWARENESS_LIMIT,
    RESET_STATEMENT_LIMIT,
    WRAPPER_DELEGATED_LIMIT,
    VAR_WRITER_UNCONDITIONAL_READ_LIMIT,
)


# ---------------------------------------------------------------------------
# Regexes
# ---------------------------------------------------------------------------
# (?<!-) refuses a match where `background`/`border` is itself a hyphenated
# SEGMENT of a longer identifier — the concrete case is a CSS custom-property
# NAME like `--sgs-btn-border:`, which is a variable WRITE, not a border paint
# declaration. Without the lookbehind, \b still matches at the `-`/`b` boundary
# inside `-btn-border`, so the scan miscounted 17+ real custom-property writers
# across other blocks' style.css files as CENSUSED paint (found by adversarial
# review, 2026-09-11). A genuine declaration is never preceded by a bare `-`
# (it follows `{`, `;`, whitespace, or the string start), so this costs nothing
# on the real defect shape.
DECL_RE = re.compile(r"(?<!-)\b(background|border)(-[a-zA-Z]+)*\s*:", re.IGNORECASE)
PROP_VALUE_RE = re.compile(r"^\s*([a-zA-Z-]+)\s*:\s*(.*)$", re.DOTALL)
IF_HEADER_RE = re.compile(r"^\s*(else\s*)?if\s*\(", re.IGNORECASE)
RESET_VALUE_RE = re.compile(r"^(none|0|transparent)$", re.IGNORECASE)
VAR_CALL_RE = re.compile(r"^var\(\s*(--[A-Za-z0-9_-]+)\s*(,.*)?\)$", re.IGNORECASE)
WHERE_RE = re.compile(r":where\(", re.IGNORECASE)
FORCED_COLORS_RE = re.compile(r"forced-colors|@supports", re.IGNORECASE)
WRAPPER_DELEGATED_RE = re.compile(r"Container_Wrapper", re.IGNORECASE)
STRING_LITERAL_RE = re.compile(r"'((?:\\.|[^'\\])*)'|\"((?:\\.|[^\"\\])*)\"", re.DOTALL)
VAR_TOKEN_RE = re.compile(r"\$([A-Za-z_][A-Za-z0-9_]*)")


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------
@dataclass
class Statement:
    text: str            # the raw source text between two boundaries
    stack: list[str]      # enclosing block headers, outermost first
    start: int
    file_is_css: bool


@dataclass
class Finding:
    file: str
    block: str
    bucket: str           # "gated" | "dismissed" | "census"
    declaration: str
    context: str           # selector (CSS) or humanised statement (PHP)
    reason: str = ""       # gate condition (GATED) or dismissal reason (DISMISSED)


# ---------------------------------------------------------------------------
# Character-boundary masker — marks every index as real code (True) or
# inside a string/comment (False). Shared by PHP and CSS; only the comment
# style differs (`//`/`#` line comments exist in PHP, not in this project's
# plain CSS, where `#` is a valid hex-colour character and must never be
# mistaken for a comment starter).
# ---------------------------------------------------------------------------
def _mask_source(text: str, allow_line_comments: bool) -> list[bool]:
    n = len(text)
    mask = [True] * n
    i = 0
    while i < n:
        c = text[i]
        two = text[i : i + 2]
        if allow_line_comments and (two == "//" or c == "#"):
            while i < n and text[i] != "\n":
                mask[i] = False
                i += 1
            continue
        if two == "/*":
            mask[i] = False
            mask[i + 1] = False
            i += 2
            while i < n and text[i : i + 2] != "*/":
                mask[i] = False
                i += 1
            if i < n:
                mask[i] = False
                if i + 1 < n:
                    mask[i + 1] = False
                i += 2
            continue
        if c in ("'", '"'):
            quote = c
            mask[i] = False
            i += 1
            while i < n:
                mask[i] = False
                if text[i] == "\\":
                    i += 1
                    if i < n:
                        mask[i] = False
                        i += 1
                    continue
                if text[i] == quote:
                    i += 1
                    break
                i += 1
            continue
        i += 1
    return mask


def _blank_comments(text: str, allow_line_comments: bool) -> str:
    """Same-length copy of `text` with comment regions replaced by spaces
    (string content is left untouched). A CSS `/* … */` comment sitting
    directly before a selector's `{` would otherwise leak its own prose
    into the header/context text used for exemption matching — e.g. a
    comment that happens to mention ":where()" or "@supports" while
    documenting a fixture would falsely trip the exemption it is merely
    describing. Positions are preserved so boundary offsets computed from
    the original text remain valid slice indices into this copy."""
    n = len(text)
    out = list(text)
    i = 0
    while i < n:
        c = text[i]
        two = text[i : i + 2]
        if allow_line_comments and (two == "//" or c == "#"):
            while i < n and text[i] != "\n":
                out[i] = " "
                i += 1
            continue
        if two == "/*":
            out[i] = " "
            out[i + 1] = " "
            i += 2
            while i < n and text[i : i + 2] != "*/":
                out[i] = " "
                i += 1
            if i < n:
                out[i] = " "
                if i + 1 < n:
                    out[i + 1] = " "
                i += 2
            continue
        if c in ("'", '"'):
            quote = c
            i += 1
            while i < n:
                if text[i] == "\\":
                    i += 2
                    continue
                if text[i] == quote:
                    i += 1
                    break
                i += 1
            continue
        i += 1
    return "".join(out)


def _parse_statements(text: str, is_css: bool) -> list[Statement]:
    """Walk the whole file once, splitting on every real (`;`/`{`/`}`)
    boundary, maintaining a stack of currently-open block headers. Returns
    one Statement per `;`-terminated (or brace-closed, trailing) segment,
    carrying the FULL stack of ancestor headers open at that point —
    for CSS this is the selector plus any @-rule ancestors; for PHP it is
    every enclosing `if`/`foreach`/function header.

    Boundaries are found against the RAW text (a real `{`/`}`/`;` never
    appears inside a string in this codebase's own PHP/CSS); the segment
    TEXT used for headers/declarations is sliced from a comment-blanked
    copy, so a comment's own prose can never be mistaken for code."""
    mask = _mask_source(text, allow_line_comments=not is_css)
    display = _blank_comments(text, allow_line_comments=not is_css)
    boundaries = [i for i, ch in enumerate(text) if mask[i] and ch in "{};"]
    stack: list[str] = []
    results: list[Statement] = []
    prev = -1
    for pos in boundaries:
        seg = display[prev + 1 : pos]
        ch = text[pos]
        if ch == "{":
            stack.append(seg.strip())
        elif ch == "}":
            if seg.strip():
                results.append(Statement(seg.strip(), list(stack), prev + 1, is_css))
            if stack:
                stack.pop()
        else:  # ';'
            if seg.strip():
                results.append(Statement(seg.strip(), list(stack), prev + 1, is_css))
        prev = pos
    return results


# ---------------------------------------------------------------------------
# Declaration extraction
# ---------------------------------------------------------------------------
def _split_top_level(text: str, sep: str = ";") -> list[str]:
    """Split on `sep` at paren-depth 0 only — a CSS function argument list
    (`color-mix(in srgb, currentColor 6%, transparent)`) never contains the
    separator, but this guards the (unused today, cheap to keep) case where
    it might."""
    parts, buf, depth = [], "", 0
    for ch in text:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch == sep and depth == 0:
            parts.append(buf)
            buf = ""
        else:
            buf += ch
    if buf.strip():
        parts.append(buf)
    return [p.strip() for p in parts if p.strip()]


def _extract_declarations(stmt: Statement) -> list[str]:
    """For a CSS statement, the statement text IS already one declaration
    (real ';' boundaries are never inside a string in this codebase's own
    stylesheets). For a PHP statement, the declaration lives inside one or
    more embedded string literals — extract every literal's content and
    split each on top-level ';' to isolate individual declarations."""
    if stmt.file_is_css:
        return [stmt.text] if DECL_RE.search(stmt.text) else []

    found: list[str] = []
    for m in STRING_LITERAL_RE.finditer(stmt.text):
        literal = m.group(1) if m.group(1) is not None else m.group(2)
        if literal is None or not DECL_RE.search(literal):
            continue
        for piece in _split_top_level(literal):
            # A literal like '{background:var(x);}' embeds the CSS rule's
            # own braces as literal characters — strip them (and any
            # surrounding whitespace) so the declaration regex sees
            # "background:…" at position 0, not "{background:…".
            candidate = piece.strip().strip("{}").strip()
            if DECL_RE.match(candidate):
                found.append(candidate)
    return found


def _humanise_php(text: str) -> str:
    s = VAR_TOKEN_RE.sub(r"{\1}", text)
    s = STRING_LITERAL_RE.sub(lambda m: (m.group(1) or m.group(2) or ""), s)
    s = re.sub(r"\s*\.\s*", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


# ---------------------------------------------------------------------------
# Writer verification (the (d) exemption's own ⛔: verify the WRITER exists,
# not merely that a var() call is present).
# ---------------------------------------------------------------------------
def _has_guarded_writer(file_text: str, custom_prop: str) -> bool:
    """True when `custom_prop` (e.g. "--sgs-nm-submenu-bg") is ASSIGNED
    somewhere in this file — not merely READ inside a var() call — and that
    assignment sits within an `if (` ancestor somewhere nearby (the
    "empty-guarded" half of the exemption). A bare `--wp--preset--*` token
    never has a local writer by construction (it is a global theme.json
    value, not a block-specific write), so this correctly returns False for
    it without any special-casing."""
    pattern = re.escape(custom_prop) + r"(?![A-Za-z0-9_-])"
    for m in re.finditer(pattern, file_text):
        start = m.start()
        preceding = file_text[max(0, start - 6) : start]
        if preceding.rstrip().endswith("var("):
            continue  # this occurrence is a READ, not a write
        # A generous lookahead: this codebase aligns array-key `=>` arrows
        # with padding spaces (`'--x'        => …`), so the arrow can sit
        # many characters after the closing quote.
        after = file_text[m.end() : m.end() + 40]
        looks_like_write = bool(re.match(r"""\s*['"]?\s*(:|=>|\.=)""", after))
        if not looks_like_write:
            continue
        # "Empty-guarded" is read generously: a wrapping `if (`, a ternary
        # (`'' !== $x ? … : ''`), a null-coalesce (`?? ''`), or a strict
        # (in)equality check anywhere within a small window EITHER side of
        # the write. This codebase writes these guards three different
        # ways (a preceding `if`, an inline ternary on the value itself, or
        # a later `if` gating the append) — this is the disclosed
        # `WRAPPER_DELEGATED_LIMIT`-style heuristic trade-off: generous
        # enough to recognise all three real shapes, at the cost of also
        # accepting a `?`/`!==` that is not genuinely an empty-guard.
        window = file_text[max(0, start - 400) : min(len(file_text), start + 400)]
        if re.search(r"if\s*\(|!==|!=\s|\?\?|\?\s", window):
            return True
    return False


# ---------------------------------------------------------------------------
# Classification — the judgement half. GATED / DISMISSED / CENSUSED.
# ---------------------------------------------------------------------------
def _is_reset_exempt(prop: str, value: str, sibling_decls: list[str]) -> bool:
    root_match = re.match(r"[a-zA-Z]+", prop)
    root = root_match.group(0).lower() if root_match else prop.lower()
    for other in sibling_decls:
        m = PROP_VALUE_RE.match(other)
        if not m:
            continue
        other_prop, other_value = m.group(1).strip(), m.group(2).strip()
        if other_prop.lower() == prop.lower():
            continue
        other_root_match = re.match(r"[a-zA-Z]+", other_prop)
        other_root = other_root_match.group(0).lower() if other_root_match else other_prop.lower()
        if other_root != root:
            continue
        other_clean = re.sub(r"!important", "", other_value, flags=re.IGNORECASE).strip()
        if not RESET_VALUE_RE.match(other_clean):
            return False  # a competing value for the same property root exists
    return True


def _classify_declaration(
    decl: str, context_text: str, sibling_decls: list[str], whole_file_text: str
) -> tuple[str, str]:
    """Returns (bucket, reason) for ONE declaration — "dismissed" or
    "census". GATED is decided one level up (it applies to the whole
    statement, via its enclosing `if`, not per declaration)."""
    m = PROP_VALUE_RE.match(decl)
    if not m:
        return "census", ""
    prop, value = m.group(1).strip(), m.group(2).strip().rstrip(";").strip()

    if WHERE_RE.search(context_text):
        return "dismissed", ":where() zero-specificity default — any operator rule out-ranks it by construction"
    if FORCED_COLORS_RE.search(context_text):
        return "dismissed", "forced-colors / @supports accessibility rule — not operator-facing paint"
    if WRAPPER_DELEGATED_RE.search(context_text):
        return "dismissed", "wrapper-delegated — the paint belongs to SGS_Container_Wrapper, no local attribute expected"

    value_clean = re.sub(r"!important", "", value, flags=re.IGNORECASE).strip()
    if RESET_VALUE_RE.match(value_clean) and _is_reset_exempt(prop, value, sibling_decls):
        return (
            "dismissed",
            f"reset to {value_clean} with no competing operator value in this statement/rule "
            "(returns to the census the day a sibling declaration for the same property carries a real value)",
        )

    var_match = VAR_CALL_RE.match(value_clean)
    if var_match:
        custom_prop = var_match.group(1)
        if custom_prop.startswith("--") and not custom_prop.startswith("--wp--"):
            if _has_guarded_writer(whole_file_text, custom_prop):
                return (
                    "dismissed",
                    f"attribute-driven var({custom_prop}) with a verified, empty-guarded writer in this file "
                    "(returns to the census the day that writer is removed)",
                )

    return "census", ""


def _find_enclosing_if(stack: list[str]) -> str | None:
    for header in reversed(stack):
        if IF_HEADER_RE.match(header.strip()):
            return header.strip()
    return None


# ---------------------------------------------------------------------------
# Per-file / per-block scan
# ---------------------------------------------------------------------------
def scan_source_text(
    text: str,
    is_css: bool,
    file_label: str,
    block_slug: str,
    writer_lookup_text: str | None = None,
) -> list[Finding]:
    """`writer_lookup_text` defaults to `text` itself. A block's custom-
    property WRITER can live in the other of its two files (e.g. a
    `render.php`-written `--sgs-x-*` value consumed by a static
    `style.css` rule) — pass the block's COMBINED render.php+style.css
    text here so the var-writer exemption is checked across both
    surfaces, not just whichever one is currently being scanned."""
    writer_text = writer_lookup_text if writer_lookup_text is not None else text
    findings: list[Finding] = []
    for stmt in _parse_statements(text, is_css):
        decls = _extract_declarations(stmt)
        if not decls:
            continue

        gate = _find_enclosing_if(stmt.stack)
        context = stmt.stack[-1] if (is_css and stmt.stack) else _humanise_php(stmt.text)
        # Classification looks at the FULL ancestor stack (every enclosing
        # @-rule/if/etc — a CSS declaration's `forced-colors`/`@supports`
        # ancestor is almost never the leaf selector itself), not just the
        # innermost header used for the printed "context" column.
        full_context = " | ".join(stmt.stack) + " " + stmt.text

        if gate is not None:
            for decl in decls:
                findings.append(
                    Finding(file_label, block_slug, "gated", decl, context, reason=gate)
                )
            continue

        for decl in decls:
            bucket, reason = _classify_declaration(decl, full_context, decls, writer_text)
            findings.append(Finding(file_label, block_slug, bucket, decl, context, reason=reason))

    return findings


def scan_file(
    path: Path, block_slug: str, repo_label_root: Path, writer_lookup_text: str | None = None
) -> list[Finding]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8", errors="replace")
    is_css = path.suffix == ".css"
    try:
        label = str(path.relative_to(repo_label_root)).replace("\\", "/")
    except ValueError:
        label = str(path).replace("\\", "/")
    return scan_source_text(text, is_css, label, block_slug, writer_lookup_text)


# ---------------------------------------------------------------------------
# Block discovery — DB-first per R-31-1 would mean reading `sgs-framework.db`,
# but the two files this gate needs (a block's own `render.php`/`style.css`)
# are file-path facts, not DB rows; block SLUGS are read from each block's
# own `block.json`, never a cached/hardcoded roster (R-31-1/R-31-9).
# ---------------------------------------------------------------------------
def discover_blocks() -> dict[str, Path]:
    """Returns {block_slug: block_dir} for every block under src/blocks/
    whose block.json declares an `sgs/` name."""
    out: dict[str, Path] = {}
    if not _BLOCKS_DIR.exists():
        return out
    for block_dir in sorted(_BLOCKS_DIR.iterdir()):
        bj = block_dir / "block.json"
        if not bj.exists():
            continue
        try:
            data = json.loads(bj.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        name = data.get("name", "")
        if name.startswith("sgs/"):
            out[name] = block_dir
    return out


def scan_block(slug: str, block_dir: Path) -> list[Finding]:
    render_path = block_dir / "render.php"
    style_path = block_dir / "style.css"
    render_text = render_path.read_text(encoding="utf-8", errors="replace") if render_path.exists() else ""
    style_text = style_path.read_text(encoding="utf-8", errors="replace") if style_path.exists() else ""
    # A block's CSS custom-property WRITER (render.php) and a READER of that
    # same property (style.css, or vice versa) can live in either file — the
    # var-writer exemption is checked against BOTH combined, never just
    # whichever file is currently being scanned.
    combined = render_text + "\n" + style_text
    findings: list[Finding] = []
    findings += scan_file(render_path, slug, _PLUGIN_ROOT.parent, writer_lookup_text=combined)
    findings += scan_file(style_path, slug, _PLUGIN_ROOT.parent, writer_lookup_text=combined)
    return findings


# ---------------------------------------------------------------------------
# --survey — always all three buckets, always the disclosed limits.
# ---------------------------------------------------------------------------
def do_survey(block_filter: str | None) -> int:
    blocks = discover_blocks()
    if block_filter:
        if block_filter not in blocks:
            print(f"[ungated-paint] ERROR: unknown block '{block_filter}'.")
            return 1
        blocks = {block_filter: blocks[block_filter]}

    all_findings: list[Finding] = []
    for slug, block_dir in blocks.items():
        all_findings += scan_block(slug, block_dir)

    print("=" * 78)
    print(f"UNGATED-PAINT SURVEY — {len(blocks)} block(s) scanned"
          + (f" (filtered: {block_filter})" if block_filter else " (framework-wide)"))
    print("=" * 78)
    print()
    print("DISCLOSED LIMITS (this census is only as wide as these bounds):")
    for i, limit in enumerate(ALL_LIMITS, 1):
        print(f"  {i}. {limit}")
    print()

    for bucket_name, bucket_key in (
        ("CENSUSED — real hardcoded/ungated paint", "census"),
        ("GATED — wrapped in an if on an operator attribute", "gated"),
        ("DISMISSED — ungated but structurally incapable of the defect", "dismissed"),
    ):
        rows = [f for f in all_findings if f.bucket == bucket_key]
        print("-" * 78)
        print(f"{bucket_name}  ({len(rows)})")
        print("-" * 78)
        if not rows:
            print("  (none)")
        for f in rows:
            print(f"  [{f.block}] {f.file}")
            print(f"    selector/context : {f.context}")
            print(f"    declaration      : {f.declaration}")
            if f.bucket == "gated":
                print(f"    gate (if)        : {f.reason}")
            elif f.bucket == "dismissed":
                print(f"    reason           : {f.reason}")
            print()

    censused = [f for f in all_findings if f.bucket == "census"]
    print("=" * 78)
    print(f"TOTAL: {len(censused)} CENSUSED / {len(all_findings)} scanned declaration(s) "
          f"across {len(blocks)} block(s)")
    print("=" * 78)
    return 0


# ---------------------------------------------------------------------------
# --check — WARN-ONLY for this build (see HARD_FAIL_BLOCKS docblock above).
# ---------------------------------------------------------------------------
def do_check(block_filter: str | None) -> int:
    blocks = discover_blocks()
    if block_filter:
        if block_filter not in blocks:
            print(f"[ungated-paint] ERROR: unknown block '{block_filter}'.")
            return 1
        blocks = {block_filter: blocks[block_filter]}

    any_hard_fail = False
    for slug, block_dir in blocks.items():
        findings = [f for f in scan_block(slug, block_dir) if f.bucket == "census"]
        if not findings:
            continue
        hard = slug in HARD_FAIL_BLOCKS
        tag = "HARD-FAIL SCOPE" if hard else "warn-only (not yet enforced)"
        print(f"[ungated-paint] {slug} — {len(findings)} ungated paint finding(s) — {tag}")
        for f in findings:
            print(f"    {f.file}")
            print(f"    selector/context : {f.context}")
            print(f"    declaration      : {f.declaration}")
        print()
        if hard:
            any_hard_fail = True

    if any_hard_fail:
        print("[ungated-paint] GATE FAILED — findings in a hard-fail-scoped block "
              f"({HARD_FAIL_BLOCKS}). Fix the declarations above.")
        return 1

    if not HARD_FAIL_BLOCKS:
        print("[ungated-paint] WARN-ONLY build (Spec 41 Step 11) — findings printed "
              "above (if any), exiting 0 regardless. Step 26 sets HARD_FAIL_BLOCKS.")
    print("[ungated-paint] check complete (exit 0 — no block in HARD_FAIL_BLOCKS failed).")
    return 0


# ---------------------------------------------------------------------------
# --self-test — tests the DETECTOR's own classification logic directly
# (scan_source_text), independent of the WARN-ONLY policy in do_check(): a
# fixture "FAILS the check" means it produces >=1 CENSUSED finding; a
# fixture "PASSES" means it produces zero. FR-41-35(e)'s negative controls
# are census #4, #6 and #8 — three real, already-diagnosed instances of the
# identical defect signature. One legit/trap pair per (d) exemption proves
# each does not over-match a real defect wearing its shape.
# ---------------------------------------------------------------------------
def _fixture_censused(name: str, is_css: bool = False) -> int:
    path = _FIXTURES_DIR / name
    text = path.read_text(encoding="utf-8")
    findings = scan_source_text(text, is_css, name, "fx/fixture")
    return len([f for f in findings if f.bucket == "census"])


def run_self_test() -> bool:
    ok = True

    def check(label: str, cond: bool, detail: str = "") -> None:
        nonlocal ok
        mark = "ok  " if cond else "FAIL"
        print(f"  {mark} {label}" + (f" — {detail}" if detail and not cond else ""))
        if not cond:
            ok = False

    print("=" * 78)
    print("SELF-TEST — check-ungated-paint-rules.py")
    print("=" * 78)

    # --- Negative controls: census #4, #6, #8 (FR-41-15) -------------------
    for n in (4, 6, 8):
        dirty = _fixture_censused(f"census{n}-dirty.php")
        clean = _fixture_censused(f"census{n}-clean.php")
        check(f"census #{n} dirty fixture is CENSUSED (>=1 finding)", dirty >= 1, f"got {dirty}")
        check(f"census #{n} cleaned fixture is CLEAN (0 findings)", clean == 0, f"got {clean}")

    # --- Exemption (d): each fixture pair proves the rule fires AND does
    #     not over-match a real defect wearing the same shape. -------------
    exemptions = [
        ("reset", "php"),
        ("where", "css"),
        ("forced-colors", "css"),
        ("wrapper-delegated", "php"),
        ("var-writer", "php"),
    ]
    for name, ext in exemptions:
        is_css = ext == "css"
        legit = _fixture_censused(f"exempt-{name}-legit.{ext}", is_css=is_css)
        trap = _fixture_censused(f"exempt-{name}-trap.{ext}", is_css=is_css)
        check(f"exemption '{name}' fires on its legit fixture (0 findings)", legit == 0, f"got {legit}")
        check(
            f"exemption '{name}' does NOT over-match its trap fixture (>=1 finding)",
            trap >= 1,
            f"got {trap}",
        )

    print()
    print("=" * 78)
    if ok:
        print("SELF-TEST PASS — all assertions, both directions, all controls.")
    else:
        print("SELF-TEST FAIL — see FAIL lines above.")
    print("=" * 78)
    return ok


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ungated background/border paint detector (Spec 41 FR-41-35)."
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--survey", action="store_true", help="Emit the three-bucket census.")
    mode.add_argument("--check", action="store_true", help="WARN-ONLY for this build — see HARD_FAIL_BLOCKS.")
    mode.add_argument("--self-test", action="store_true", help="Run the fixture regression suite.")
    parser.add_argument("--block", default=None, help="Scope to one block slug, e.g. sgs/nav-menu.")
    args = parser.parse_args()

    if args.self_test:
        return 0 if run_self_test() else 1
    if args.survey:
        return do_survey(args.block)
    # default: --check
    return do_check(args.block)


if __name__ == "__main__":
    sys.exit(main())
