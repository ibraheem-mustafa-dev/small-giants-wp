#!/usr/bin/env python3
"""
Detector 6 -- "WP-core native support" + "value painted inside a <style> element".

Two narrow, provable mechanisms, both structural. Neither one looks at an
attribute's spelling to decide its role -- the same ban that governs every
detector in this programme (FR-31-2.1a).

MECHANISM A -- NATIVE SUPPORT ==> role "technical"
---------------------------------------------------
WordPress core auto-injects an `anchor` attribute when a block declares
`supports.anchor === true`, and a `className` attribute when the block does
NOT explicitly disable `supports.customClassName` (WP's own default is true).
Both are WordPress's own machine-facing plumbing -- an HTML `id`, a CSS class
list -- not client-authored content. The evidence is the block's OWN
`supports` declaration, read from its `block.json`, never the attribute name
alone: this detector only ever proposes `technical` for the literal names
`anchor` / `className`, and only when the matching supports key is found
explicitly TRUE in the file.

CRITICAL, measured 2026-08-06: `className` is NOT backed by `supports.className`
-- WP has no such key. It is backed by `supports.customClassName`. `sgs/button`
has no `supports.className` key at all but does have `supports.customClassName:
true`. Keying on the wrong name makes this detector silently inert; the
implementation below keys on `customClassName` for the `className` attribute
and never invents a `supports.className` lookup.

BLIND SPOT (documented, not fixed here): WP's *default* for `customClassName`
is true even when the key is ABSENT from block.json. This detector does NOT
claim the absent-key case -- there is no line in the file to point evidence at,
and "return nothing you cannot prove" outranks completeness here. A block that
relies on the implicit default stays unclassified by mechanism A; that is an
honest gap, not a bug.

MECHANISM B -- VALUE PAINTED INSIDE A <style> ELEMENT ==> role "styling"
--------------------------------------------------------------------------
If a block's render.php reads an attribute's value into a PHP variable, and
that variable (or a variable it is later concatenated into) is passed to a
`<style>...</style>` print statement, the attribute's value IS CSS text by
construction -- whatever it is named. This is traced as a small forward
data-flow: find the line that reads `$attributes['attr']` INTO a variable via
`$x = ...` or `$x .= ...`; seed a taint set with that variable; walk forward
looking for further `$y = /.= ...$x...` assignments that pull a tainted
variable into another (handles the common "$custom_css read, then merged into
$css" shape); then look for a line containing a literal `<style>` marker whose
printed argument references any tainted variable. Two hops (read -> merge ->
print) covers both target rows measured for this detector; a chain longer than
that is NOT traced and produces no claim, not a wrong one.

BLIND SPOTS (enumerated)
-------------------------
1. The read line must be a genuine assignment (`$x = ...` / `$x .= ...`) on
   the SAME line as the `$attributes['attr']` read. A read split across
   multiple lines (e.g. a multi-line ternary whose `$attributes[...]` sits on
   its own line) will not seed the taint set and the row stays unclaimed.
2. Only `render.php` is examined -- a style emitted from a shared included
   helper (rather than the block's own render.php) is invisible to this
   mechanism. Detector 4's wrapper-only carve-out is the tool for that shape.
3. The chain is variable-name-based, not scope-aware: a variable reused with
   an unrelated meaning elsewhere in the same file could in principle produce
   a false positive. Not observed on either target row, but not structurally
   ruled out either -- a human reviewing the reported evidence_line closes
   the gap the same way every other detector in this programme relies on
   read-the-diff review before a role lands in the DB.
4. A fabricated / nonexistent attribute name never seeds the taint set (no
   read line exists), so it always resolves to nothing -- proven in
   self_test().

MECHANISM C -- ICON-SOURCE FAMILY ==> role "icon-lucide" / "icon-wp-icon" /
"icon-dashicon" / "icon-emoji" (2026-08-06)
--------------------------------------------------------------------------
`sgs/icon` is the reference: `iconSource` is a hard 4-value enum
(`lucide`/`wp-icon`/`dashicon`/`emoji`) and its four sibling value attrs
(`iconName`/`wpIconName`/`dashiconName`/`emojiChar`) each carry the ROUTING
role that matches the kind they feed. `converter/services/extraction.py`
builds `{role: attr_name}` for every role starting `icon-` and dispatches on
it (D503) -- getting this wrong breaks icon cloning, not just misfiles a row.

The mechanism is DERIVED, never a per-block dict (R-31-1): (1) find the
attribute in the block's `block.json` whose OWN `enum` declaration is
exactly the 4-member set `{lucide, wp-icon, dashicon, emoji}` -- read the
enum VALUES, never the attribute's name; (2) find where `render.php` reads
that selector attribute into a variable; (3) walk the branch structure
(switch/case or if/elseif/else) that tests that variable against each of the
4 kind literals; (4) within each branch's own text, trace the first
variable that resolves back to an `$attributes['x']` read -- that `x` is
the sibling attr for that kind, role = `"icon-" + kind`. A chain with only
3 explicit branch conditions plus a trailing unconditional `else` treats
that else as the ONE remaining kind (structural, not "lucide is default" --
see `_branch_windows`).

Verified against BOTH shapes in this codebase: `sgs/icon`'s `switch/case`
(all 4 kinds explicit, incl. `case 'lucide':`) and `sgs/separator`'s
`if/elseif/elseif/else` (only 3 explicit, `lucide` is the implicit else).
Running it against the reference block (`sgs/icon`) reproduces its
already-correct DB roles exactly -- proof before trusting the mechanism on
`sgs/separator`'s unrolled row.

MEASURED FINDING (report only, NOT auto-applied -- see completion notes):
`sgs/separator`'s `contentIconWpIcon`/`contentIconDashicon`/`contentIconEmoji`
already hold a role in the DB (`enum-class-probe`/`enum-class-probe`/
`text-content`), and this mechanism resolves all three to a DIFFERENT
`icon-*` role. That is a live mis-classification -- icon cloning is broken
for `sgs/separator` today -- but per the seed-only-NULL-row discipline this
detector NEVER overwrites an existing role, so `detect()` only ever proposes
the fourth, currently-NULL sibling (`contentIconName` -> `icon-lucide`).

BLIND SPOTS
-----------
1. `_branch_windows` finds the earliest literal match per kind from the
   selector's read position onward -- if the SAME 4 literals appear again
   later in the file for an unrelated purpose, only the FIRST occurrence
   after the read is ever considered. Not observed on either target block.
2. The "missing kind inherits the trailing else" fallback fires only when
   EXACTLY one kind has no explicit literal. Two or more implicit kinds
   (which would require the code to distinguish them by branch ORDER alone,
   with no textual anchor) are not traced -- an honest gap, not a guess.
3. `_first_attr_in_window`'s backward trace is 1-hop, like Mechanism B: a
   sibling attr read through an intermediate helper function call (rather
   than a direct `$var = $attributes['x']` assignment) will not resolve.
4. The window boundary is the START of the NEXT kind's literal match, not a
   parsed brace/`break;` boundary -- a branch containing an inner
   `switch`/`if` that happens to also mention one of the 4 kind literals as
   an unrelated string could shift a window early. Not observed on either
   target block; the evidence_line is always the resolved attr's OWN read
   line, so a human reviewing it catches this the same way every other
   detector in this programme relies on.

MECHANISM D -- JSON-LD `name` KEY ==> role "identity" (2026-08-06)
--------------------------------------------------------------------------
A value written under the literal Schema.org JSON-LD property key `'name'`
IS the block's identifying text by construction -- that is the `identity`
role's own contract. Traced the same way Mechanism B seeds its taint: find
the line that reads `$attributes['attr']` into `$x`, then require a
DIFFERENT line elsewhere in the file containing `'name' => $x` AND require
the file genuinely emits JSON-LD (`ld+json` + `schema.org` both present, so
an unrelated array that happens to have a `name` key on a non-schema block
is never mistaken for this).

BLIND SPOTS
-----------
1. Only the literal key `'name'` is recognised -- a differently-spelled
   schema property that also identifies the entity (`headline`, `title` on
   an `Article`) is not traced. Deliberately narrow: those are different
   Schema.org semantics, not omissions.
2. Single-hop read only (mirrors Mechanism B blind spot 1) -- a `name`
   value assembled from two attributes concatenated together would not be
   traced to either.
3. The `'name' => $x` match is a plain text search across the WHOLE file,
   not scoped to inside the specific schema array literal -- a coincidental
   `'name' => $x` elsewhere (a different array, same variable name reused)
   would false-positive. Not observed on the one measured row.

MECHANISM E -- FILTER-CLOSURE-ONLY OPERAND ==> role "behaviour" (2026-08-06)
--------------------------------------------------------------------------
A value captured into a `function (...) use (..., $x, ...) { ... }` closure
and used inside that closure body ONLY as a comparison/predicate operand
(never reaching an escaping call or an `echo`/`print` ANYWHERE in the file)
is consumed purely to DECIDE something, not to be painted on the page --
exactly the `behaviour` role's contract (excludes the attr from the
content-bearing walk).

Seeded the same way as Mechanisms B and D: find the attribute's own read
line into `$x`, then require a `use (...)` clause naming `$x` whose closure
BODY (brace-balanced, via `_balanced_end` -- the same JSON-brace-balancer
Mechanism C uses, reused here for PHP braces) actually references `$x`.
Guard: if `$x` reaches ANY of `esc_html`/`esc_attr`/`esc_url`/`esc_js`/
`esc_textarea`/`wp_kses` or an `echo`/`print` statement ANYWHERE in the
file (not just inside the one closure), the claim is withdrawn -- a
predicate-only use inside ONE closure does not prove the same value is
never ALSO painted to the page via a different code path.

BLIND SPOTS
-----------
1. The escaping/output guard is a whole-file text search, not a data-flow
   trace of every branch -- a value that reaches an escaping call only on
   an unreachable/dead code path would still be (correctly, conservatively)
   rejected. Errs toward under-claiming, never over-claiming.
2. Only `use (...)` closures are recognised -- an arrow function
   (`fn ($r) => $r['x'] === $x`, implicit capture) is a different PHP
   syntax and is not traced. Not present in this codebase at the time of
   writing.
3. The escaping-function name match (`_reaches_escaping_or_echo`) is a
   same-statement regex (`fn(...$var...)` up to a `;`), not a nested-call
   trace -- an escaping call reached only through an intermediate variable
   (`$safe = $x; echo esc_html($safe);`) would NOT be caught by this guard,
   so a false `behaviour` claim in that specific shape is possible in
   principle. Not observed on the one measured row (`excludeKeywords`
   never reaches ANY output site, escaped or not).

READ-ONLY. Proposes; never writes to sgs-framework.db.
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

_source_cache: dict[Path, str] = {}


def _read(path: Path) -> str:
    if path not in _source_cache:
        try:
            _source_cache[path] = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            _source_cache[path] = ""
    return _source_cache[path]


def _rel(path: Path) -> str:
    try:
        return str(path.relative_to(PLUGIN_ROOT.parent.parent)).replace("\\", "/")
    except ValueError:
        return str(path)


def _block_dir(block_slug: str) -> Path:
    return BLOCKS_DIR / block_slug.split("/", 1)[-1]


# ---------------------------------------------------------------------------
# Mechanism A -- native support.
# ---------------------------------------------------------------------------

# Maps the attribute NAME WordPress core wires from a `supports` key to
# (supports_key, role). `className` deliberately does NOT map to a `className`
# key -- see module docstring CRITICAL note.
#
# THE ROLE IS PER-KEY, NOT A CONSTANT (2026-08-06). It was hardcoded `technical`
# for every native support, which is right for `anchor`/`className` -- plumbing
# WordPress injects, carrying nothing a draft could be cloned from -- and WRONG
# for `align`. `align` is core's ALIGNMENT attribute (`supports.align`), and core
# paints it as `alignleft`/`aligncenter`/`alignright`/`alignwide` on the wrapper:
# it carries real layout information, so a draft with a centred logo SHOULD clone
# to `align: center`. Filing it `technical` (classification styling-behaviour,
# excluded from the content walk) would tell the pipeline to discard that.
# `property_suffixes` independently corroborates the family: every `margin-*`
# row it holds carries role `layout`, and align's only SGS-side effect is a
# margin rule (responsive-logo/render.php:201).
_NATIVE_SUPPORT_KEY = {
    "anchor": ("anchor", "technical"),
    "className": ("customClassName", "technical"),
    "align": ("align", "layout"),
}


def native_support_evidence(block_slug: str, attr: str) -> dict | None:
    """(evidence_file, evidence_line) if block.json explicitly declares the
    matching supports key TRUE. None if the block.json is missing, the key is
    absent, or the key is explicitly false.
    """
    entry = _NATIVE_SUPPORT_KEY.get(attr)
    if entry is None:
        return None
    support_key = entry[0]
    path = _block_dir(block_slug) / "block.json"
    if not path.is_file():
        return None
    text = _read(path)
    # Anchored to `"<key>": true|false` -- a supports boolean flag. This can
    # never collide with an `attributes.anchor` declaration (which is always
    # followed by `{`, an object) or with "anchor" appearing as a STRING
    # element inside a variants array (never followed by `:`).
    m = re.search(rf'"{re.escape(support_key)}"\s*:\s*(true|false)', text)
    if not m:
        # ARRAY FORM (2026-08-06). `supports.align` is declared as a LIST of
        # permitted alignments (`["left","center","right","wide"]`), never a
        # boolean, so the boolean pattern above cannot match it -- adding
        # `align` to the map without this would have been SILENTLY INERT, the
        # same shape as the `supports.className` trap in the module docstring.
        # A non-empty array is the "declared true" equivalent; an empty array
        # means the block permits no alignment at all and is treated as false.
        m_arr = re.search(rf'"{re.escape(support_key)}"\s*:\s*\[([^\]]*)\]', text)
        if not m_arr or not m_arr.group(1).strip():
            return None
        line = text[: m_arr.start()].count("\n") + 1
        return {"evidence_file": str(path), "evidence_line": line}
    if m.group(1) != "true":
        return None
    line_no = text.count("\n", 0, m.start()) + 1
    return {"evidence_file": _rel(path), "evidence_line": line_no}


# ---------------------------------------------------------------------------
# Mechanism B -- style-element emission (forward data-flow, 2-hop).
# ---------------------------------------------------------------------------

_ASSIGN = re.compile(r"^\s*\$([A-Za-z_]\w*)\s*(\.=|=)\s*")


def _find_attr_read(lines: list[str], attr: str) -> tuple[str, int] | tuple[None, None]:
    """First line where `$attributes['attr']` is read INTO a variable via
    `$x = ...` / `$x .= ...` (same line). Returns (var_name, 1-based
    line_no), or (None, None) if no such assignment line exists. Shared
    seed step for mechanisms B, D and E -- all three start a small
    data-flow trace from the same read shape; a fabricated attribute name
    never has a read line, so it always resolves to (None, None) for all
    three (proven in self_test())."""
    read_pat = re.compile(rf"\$attributes\s*\[\s*['\"]{re.escape(attr)}['\"]\s*\]")
    for i, line in enumerate(lines, 1):
        if attr not in line or not read_pat.search(line):
            continue
        m = _ASSIGN.match(line)
        if not m:
            continue
        return m.group(1), i
    return None, None


def style_emission_evidence(block_slug: str, attr: str) -> dict | None:
    path = _block_dir(block_slug) / "render.php"
    if not path.is_file():
        return None
    text = _read(path)
    if attr not in text:
        return None
    lines = text.splitlines()
    seed_var, read_line_no = _find_attr_read(lines, attr)
    if seed_var is None:
        return None

    tainted = {seed_var}
    for line in lines[read_line_no:]:
        m = _ASSIGN.match(line)
        if not m:
            continue
        lhs = m.group(1)
        rhs = line[m.end():]
        if any(re.search(rf"\${re.escape(v)}\b", rhs) for v in tainted):
            tainted.add(lhs)

    for line in lines:
        if "<style>" not in line:
            continue
        if any(re.search(rf"\${re.escape(v)}\b", line) for v in tainted):
            return {"evidence_file": _rel(path), "evidence_line": read_line_no}
    return None


# ---------------------------------------------------------------------------
# Mechanism C -- icon-source family (enum-derived, no per-block dict).
# ---------------------------------------------------------------------------

_ICON_KIND_VALUES = frozenset({"lucide", "wp-icon", "dashicon", "emoji"})


def _balanced_end(text: str, open_brace_idx: int) -> int:
    """Index of the '}' that closes the '{' at open_brace_idx, string-aware
    so a brace character inside a quoted string is never counted. Shared by
    mechanism C (JSON object bounds in block.json) and mechanism E (PHP
    closure body bounds in render.php) -- one balancer, two callers."""
    depth = 0
    in_str = False
    escape = False
    for i in range(open_brace_idx, len(text)):
        c = text[i]
        if in_str:
            if escape:
                escape = False
            elif c == "\\":
                escape = True
            elif c == '"':
                in_str = False
            continue
        if c == '"':
            in_str = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i
    return len(text) - 1


def _top_level_attrs(text: str) -> dict[str, tuple[int, int]]:
    """{attr_name: (obj_start, obj_end)} for DIRECT children of the
    top-level `"attributes": {...}` object in a block.json file, using
    brace-balanced scanning so a key nested inside one attribute's own
    definition (a `default` array, a `properties` sub-object on a
    box-family attr) is never mistaken for a sibling top-level attribute --
    exactly the shape of trap this whole file exists to avoid (see the
    `supports.className` note in the module docstring)."""
    m = re.search(r'"attributes"\s*:\s*\{', text)
    if not m:
        return {}
    outer_start = m.end() - 1
    outer_end = _balanced_end(text, outer_start)
    attrs: dict[str, tuple[int, int]] = {}
    pos = outer_start + 1
    key_pat = re.compile(r'"(\w+)"\s*:\s*\{')
    while pos < outer_end:
        km = key_pat.search(text, pos, outer_end)
        if not km:
            break
        name = km.group(1)
        obj_start = km.end() - 1
        obj_end = _balanced_end(text, obj_start)
        attrs[name] = (obj_start, obj_end)
        pos = obj_end + 1
    return attrs


def _icon_source_selector_attr_from_text(block_json_text: str) -> str | None:
    """The attribute that selects among the 4-member icon-source vocabulary
    {lucide, wp-icon, dashicon, emoji}, found by READING each top-level
    attribute's own `enum` declaration -- never by matching the attribute's
    NAME. An attribute literally called `iconSource` with a DIFFERENT enum
    is rejected (self_test negative control)."""
    for name, (start, end) in _top_level_attrs(block_json_text).items():
        obj_text = block_json_text[start:end + 1]
        enum_m = re.search(r'"enum"\s*:\s*\[(.*?)\]', obj_text, re.DOTALL)
        if not enum_m:
            continue
        values = frozenset(re.findall(r'"([^"]*)"', enum_m.group(1)))
        if values == _ICON_KIND_VALUES:
            return name
    return None


def _branch_windows(text: str, selector_var: str, search_start: int) -> dict[str, tuple[int, int]]:
    """{kind: (window_start, window_end)} for each of the 4 icon-kind
    literals, found from search_start onward as EITHER a `case 'kind':`
    switch label OR an `'kind' === $selector_var` / `$selector_var ===
    'kind'` if/elseif condition. If exactly ONE kind has no explicit
    literal anywhere and the chain closes with a bare `} else {` after the
    last explicit branch, that else inherits the missing kind -- a
    structural fallback (the vocabulary has exactly four members; three
    explicit conditions plus an unconditional else necessarily means the
    else IS the fourth), never a hardcoded "lucide is the default" case.

    CLUSTERING (2026-08-06, found live on the REFERENCE block itself):
    every match of every kind literal is collected first, THEN grouped
    into clusters of matches within 3000 chars of each other, and only the
    cluster with the MOST DISTINCT kinds is used. Without this, the first
    literal match for EACH kind is taken independently across the whole
    file -- and `sgs/icon` render.php has an unrelated one-off
    `if ( 'dashicon' === $icon_source ) { wp_enqueue_style( 'dashicons' );
    }` (a stylesheet-enqueue guard) ~9000 chars BEFORE its real rendering
    switch, which won the naive "first match" race for 'dashicon' and
    caused a downstream token-scan to wander into unrelated code and
    resolve the wrong attribute entirely. Proven wrong before this fix
    (self_test caught it: `sgs/icon.dashiconName` resolved to
    `backgroundShape`, a completely unrelated attribute, until clustering
    was added)."""
    var_esc = re.escape(selector_var)
    all_matches: list[tuple[int, str]] = []
    for kind in _ICON_KIND_VALUES:
        esc = re.escape(kind)
        patterns = (
            rf"case\s*['\"]{esc}['\"]\s*:",
            rf"['\"]{esc}['\"]\s*===\s*\${var_esc}\b",
            rf"\${var_esc}\s*===\s*['\"]{esc}['\"]",
        )
        for pat in patterns:
            for m in re.finditer(pat, text[search_start:]):
                all_matches.append((search_start + m.start(), kind))
    if not all_matches:
        return {}
    all_matches.sort(key=lambda pm: pm[0])

    clusters: list[list[tuple[int, str]]] = [[all_matches[0]]]
    for pos, kind in all_matches[1:]:
        if pos - clusters[-1][-1][0] <= 3000:
            clusters[-1].append((pos, kind))
        else:
            clusters.append([(pos, kind)])
    best_cluster = max(clusters, key=lambda c: (len({k for _, k in c}), -c[0][0]))

    positions: dict[str, int] = {}
    for pos, kind in best_cluster:
        if kind not in positions:
            positions[kind] = pos

    missing = _ICON_KIND_VALUES - positions.keys()
    if len(missing) == 1 and positions:
        last_explicit_end = max(positions.values())
        else_m = re.search(r"\}\s*else\s*\{", text[last_explicit_end:])
        if else_m:
            positions[next(iter(missing))] = last_explicit_end + else_m.end()

    ordered = sorted(positions.items(), key=lambda kv: kv[1])
    windows: dict[str, tuple[int, int]] = {}
    for idx, (kind, start) in enumerate(ordered):
        end = ordered[idx + 1][1] if idx + 1 < len(ordered) else min(start + 1000, len(text))
        windows[kind] = (start, end)
    return windows


def _first_attr_in_window(text: str, win_start: int, win_end: int, exclude_var: str) -> tuple[str, int] | None:
    """First variable referenced inside [win_start, win_end) that traces
    back -- via the LAST assignment of that variable BEFORE win_start
    reading `$attributes['x']` on the same line -- to an attribute. Returns
    (attr_name, read_line_no). `exclude_var` is the selector variable
    itself: every branch's own condition text re-mentions it, and without
    excluding it the very first token found would resolve back to the
    SELECTOR attribute (e.g. contentIconSource), not the sibling value attr
    the branch actually renders."""
    preceding = text[:win_start]
    for vm in re.finditer(r"\$(\w+)", text[win_start:win_end]):
        varname = vm.group(1)
        if varname == exclude_var:
            continue
        assign_re = re.compile(
            rf"\${re.escape(varname)}\s*=\s*[^;]*\$attributes\s*\[\s*['\"](\w+)['\"]\s*\]"
        )
        matches = list(assign_re.finditer(preceding))
        if matches:
            m = matches[-1]
            line_no = preceding.count("\n", 0, m.start()) + 1
            return m.group(1), line_no
    return None


def _resolve_icon_family_from_text(text: str, selector_var: str, search_start: int) -> dict[str, dict]:
    """{attr_name: {"role": "icon-<kind>", "evidence_line": N}} for every
    sibling value attr this render.php's branch structure resolves for the
    icon-source family rooted at selector_var."""
    out: dict[str, dict] = {}
    for kind, (win_start, win_end) in _branch_windows(text, selector_var, search_start).items():
        hit = _first_attr_in_window(text, win_start, win_end, selector_var)
        if hit is None:
            continue
        attr_name, line_no = hit
        out[attr_name] = {"role": "icon-" + kind, "evidence_line": line_no}
    return out


def _icon_source_family(block_slug: str) -> dict[str, dict]:
    """Full icon-source family resolution for a block -- empty dict if the
    block has no icon-source family at all (mechanism C negative control 1)
    or the selector attribute's own read line can't be found."""
    bpath = _block_dir(block_slug) / "block.json"
    rpath = _block_dir(block_slug) / "render.php"
    if not bpath.is_file() or not rpath.is_file():
        return {}
    selector_attr = _icon_source_selector_attr_from_text(_read(bpath))
    if selector_attr is None:
        return {}
    render_text = _read(rpath)
    read_re = re.compile(
        rf"\$(\w+)\s*=\s*[^;]*\$attributes\s*\[\s*['\"]{re.escape(selector_attr)}['\"]\s*\]"
    )
    m = read_re.search(render_text)
    if not m:
        return {}
    return _resolve_icon_family_from_text(render_text, m.group(1), m.end())


def icon_source_family_evidence(block_slug: str, attr: str) -> dict | None:
    family = _icon_source_family(block_slug)
    hit = family.get(attr)
    if hit is None:
        return None
    rpath = _block_dir(block_slug) / "render.php"
    return {
        "role": hit["role"],
        "evidence_file": _rel(rpath),
        "evidence_line": hit["evidence_line"],
    }


# ---------------------------------------------------------------------------
# Mechanism D -- JSON-LD `name` key ==> role "identity".
# ---------------------------------------------------------------------------

def json_ld_name_evidence(block_slug: str, attr: str) -> dict | None:
    path = _block_dir(block_slug) / "render.php"
    if not path.is_file():
        return None
    text = _read(path)
    if "ld+json" not in text or "schema.org" not in text:
        return None
    seed_var, read_line_no = _find_attr_read(text.splitlines(), attr)
    if seed_var is None:
        return None
    if re.search(rf"['\"]name['\"]\s*=>\s*\${re.escape(seed_var)}\b", text):
        return {"evidence_file": _rel(path), "evidence_line": read_line_no}
    return None


# ---------------------------------------------------------------------------
# Mechanism E -- filter-closure-only operand ==> role "behaviour".
# ---------------------------------------------------------------------------

_ESCAPE_OR_OUTPUT_FUNCS = ("esc_html", "esc_attr", "esc_url", "esc_js", "esc_textarea", "wp_kses")


def _reaches_escaping_or_echo(text: str, var: str) -> bool:
    """True if VAR is passed to an escaping call, OR echoed/printed,
    ANYWHERE in the file (same-statement proximity check, not a full
    data-flow trace -- see mechanism E blind spot 3)."""
    var_esc = re.escape(var)
    for fn in _ESCAPE_OR_OUTPUT_FUNCS:
        if re.search(rf"{fn}\s*\([^;]*\${var_esc}\b[^;]*\)", text):
            return True
    if re.search(rf"\becho\s+[^;]*\${var_esc}\b", text):
        return True
    if re.search(rf"\bprint\s+[^;]*\${var_esc}\b", text):
        return True
    return False


def _qualifies_as_filter_predicate(text: str, var: str) -> bool:
    """True if VAR is captured into a `use (...)` closure whose body
    actually references it, AND VAR never reaches escaping/output anywhere
    in the file."""
    for m in re.finditer(r"use\s*\(([^)]*)\)\s*\{", text):
        if not re.search(rf"\${re.escape(var)}\b", m.group(1)):
            continue
        body_start = m.end() - 1
        body_end = _balanced_end(text, body_start)
        body = text[body_start:body_end + 1]
        if not re.search(rf"\${re.escape(var)}\b", body):
            continue
        return not _reaches_escaping_or_echo(text, var)
    return False


def filter_predicate_evidence(block_slug: str, attr: str) -> dict | None:
    path = _block_dir(block_slug) / "render.php"
    if not path.is_file():
        return None
    text = _read(path)
    seed_var, read_line_no = _find_attr_read(text.splitlines(), attr)
    if seed_var is None:
        return None
    if not _qualifies_as_filter_predicate(text, seed_var):
        return None
    return {"evidence_file": _rel(path), "evidence_line": read_line_no}


# ---------------------------------------------------------------------------
# Public API.
# ---------------------------------------------------------------------------

def detect(candidates: list[tuple[str, str]]) -> list[dict]:
    """candidates: [(block_slug, attr_name)] already filtered to role IS NULL."""
    out = []
    for slug, attr in candidates:
        if attr in _NATIVE_SUPPORT_KEY:
            evidence = native_support_evidence(slug, attr)
            if evidence:
                out.append({
                    "block_slug": slug,
                    "attr_name": attr,
                    "role": _NATIVE_SUPPORT_KEY[attr][1],
                    "mechanism": "native-support",
                    **evidence,
                })
            continue

        icon_evidence = icon_source_family_evidence(slug, attr)
        if icon_evidence:
            out.append({
                "block_slug": slug,
                "attr_name": attr,
                "role": icon_evidence["role"],
                "mechanism": "icon-source-family",
                "evidence_file": icon_evidence["evidence_file"],
                "evidence_line": icon_evidence["evidence_line"],
            })
            continue

        jsonld_evidence = json_ld_name_evidence(slug, attr)
        if jsonld_evidence:
            out.append({
                "block_slug": slug,
                "attr_name": attr,
                "role": "identity",
                "mechanism": "json-ld-name",
                **jsonld_evidence,
            })
            continue

        filter_evidence = filter_predicate_evidence(slug, attr)
        if filter_evidence:
            out.append({
                "block_slug": slug,
                "attr_name": attr,
                "role": "behaviour",
                "mechanism": "filter-predicate",
                **filter_evidence,
            })
            continue

        evidence = style_emission_evidence(slug, attr)
        if evidence:
            out.append({
                "block_slug": slug,
                "attr_name": attr,
                "role": "styling",
                "mechanism": "style-emission",
                **evidence,
            })
    return out


def self_test() -> int:
    """Prove the detector can FAIL, and that each guard is load-bearing."""
    failures = []

    # 1. Positive -- sgs/button.anchor: supports.anchor === true (block.json:18).
    r = native_support_evidence("sgs/button", "anchor")
    if not r or "block.json" not in r["evidence_file"]:
        failures.append(f"sgs/button.anchor did not resolve to native-support technical: {r}")

    # 2. Positive -- sgs/heading.anchor: supports.anchor === true (block.json:21).
    r = native_support_evidence("sgs/heading", "anchor")
    if not r:
        failures.append("sgs/heading.anchor did not resolve to native-support technical")

    # 3. Positive -- sgs/button.className: keyed on customClassName, NOT className
    #    (button.json has no "className" supports key at all -- if this detector
    #    were keying on the wrong name it would silently return nothing here).
    r = native_support_evidence("sgs/button", "className")
    if not r:
        failures.append(
            "sgs/button.className did not resolve -- likely keying on the wrong "
            "supports name (className instead of customClassName)."
        )

    # 3b. Positive, ARRAY FORM -- sgs/responsive-logo.align: supports.align is
    #     ["left","center","right","wide"], a LIST not a boolean. The boolean
    #     pattern cannot match it, so without the array branch this detector
    #     would be SILENTLY INERT for align -- the exact failure shape the
    #     module docstring records for supports.className. Also asserts the
    #     per-key role: align is `layout` (core paints alignleft/aligncenter/
    #     alignright/alignwide and the block adds a margin rule), NOT the
    #     `technical` that anchor/className get.
    r = native_support_evidence("sgs/responsive-logo", "align")
    if not r:
        failures.append(
            "sgs/responsive-logo.align did not resolve -- the ARRAY form of "
            "supports.align is not being matched, so the align rule is inert."
        )
    got = detect([("sgs/responsive-logo", "align")])
    if not got or got[0].get("role") != "layout":
        failures.append(
            f"sgs/responsive-logo.align role should be 'layout', got {got!r}. "
            "align carries real layout the converter must be able to target; "
            "'technical' would exclude it from the walk."
        )
    # And the per-key map must NOT have flipped anchor/className to layout.
    got_anchor = detect([("sgs/button", "anchor")])
    if not got_anchor or got_anchor[0].get("role") != "technical":
        failures.append(
            f"sgs/button.anchor role should still be 'technical', got {got_anchor!r} "
            "-- the per-key role map leaked layout onto WP plumbing."
        )

    # 4. NEGATIVE CONTROL -- sgs/nav-drawer.anchor: supports.anchor === FALSE
    #    (block.json:70, real and verified). Must NOT be claimed technical.
    r = native_support_evidence("sgs/nav-drawer", "anchor")
    if r:
        failures.append(
            f"sgs/nav-drawer.anchor resolved to {r} but supports.anchor is FALSE "
            "on this block -- the detector is claiming a row it must not."
        )

    # 5. Positive -- sgs/nav-drawer.sgsCustomCss: read into $custom_css, merged
    #    into $css, printed inside <style>...</style>.
    r = style_emission_evidence("sgs/nav-drawer", "sgsCustomCss")
    if not r:
        failures.append("sgs/nav-drawer.sgsCustomCss did not resolve to style-emission")

    # 6. Positive -- sgs/nav-menu.sgsCustomCss: read+merged into $css in one
    #    line, printed inside <style>...</style>.
    r = style_emission_evidence("sgs/nav-menu", "sgsCustomCss")
    if not r:
        failures.append("sgs/nav-menu.sgsCustomCss did not resolve to style-emission")

    # 7. Fabricated attribute name guard, mechanism A -- must resolve to
    #    nothing (name isn't 'anchor' or 'className').
    r = native_support_evidence("sgs/button", "zzzNotARealAttributeName")
    if r:
        failures.append(f"a fabricated attribute name resolved via mechanism A: {r}")

    # 8. Fabricated attribute name guard, mechanism B -- no read line exists,
    #    so the taint set is never seeded and nothing can be claimed.
    r = style_emission_evidence("sgs/nav-drawer", "zzzNotARealAttributeName")
    if r:
        failures.append(f"a fabricated attribute name resolved via mechanism B: {r}")

    # --- Mechanism C: icon-source family ------------------------------

    # 9. Positive, REFERENCE block -- sgs/icon's 4 sibling attrs all resolve
    #    to the DB's already-correct roles via the switch/case family. Proof
    #    against known-good ground truth before trusting the mechanism on
    #    sgs/separator's unrolled row below.
    _icon_expect = {
        "iconName": "icon-lucide",
        "wpIconName": "icon-wp-icon",
        "dashiconName": "icon-dashicon",
        "emojiChar": "icon-emoji",
    }
    for _attr, _want in _icon_expect.items():
        r = icon_source_family_evidence("sgs/icon", _attr)
        if not r or r.get("role") != _want:
            failures.append(f"sgs/icon.{_attr} should resolve to {_want} via icon-source-family, got {r!r}")

    # 10. Positive, the actual gap this mechanism exists to fill --
    #     sgs/separator.contentIconName resolves to icon-lucide via the
    #     IMPLICIT else branch (separator's if/elseif/elseif/else chain
    #     never writes a literal 'lucide' condition, unlike sgs/icon's
    #     explicit `case 'lucide':`) -- proves the else-inherits-the-
    #     missing-kind fallback, not just the explicit-literal path.
    r = icon_source_family_evidence("sgs/separator", "contentIconName")
    if not r or r.get("role") != "icon-lucide":
        failures.append(f"sgs/separator.contentIconName should resolve to icon-lucide, got {r!r}")

    # 10b. MEASURED FINDING (report, not applied) -- the SAME mechanism
    #      resolves separator's three ALREADY-ROLED siblings to an icon-*
    #      role too, none of which matches what the DB currently holds
    #      (contentIconWpIcon/contentIconDashicon = enum-class-probe,
    #      contentIconEmoji = text-content). This proves the mis-roling is
    #      real, not a one-off misreading -- icon cloning is broken for
    #      sgs/separator today. detect() must NOT propose these three
    #      (seed-only-NULL discipline) -- proven separately in case 15.
    _sep_mis_roled = {
        "contentIconWpIcon": "icon-wp-icon",
        "contentIconDashicon": "icon-dashicon",
        "contentIconEmoji": "icon-emoji",
    }
    for _attr, _want in _sep_mis_roled.items():
        r = icon_source_family_evidence("sgs/separator", _attr)
        if not r or r.get("role") != _want:
            failures.append(f"sgs/separator.{_attr} should resolve to {_want} (mis-roling finding), got {r!r}")

    # 11. NEGATIVE CONTROL -- a block with no icon-source family at all must
    #     resolve to nothing (sgs/star-rating has no iconSource-shaped attr).
    r = icon_source_family_evidence("sgs/star-rating", "starColour")
    if r:
        failures.append(f"sgs/star-rating.starColour resolved via icon-source-family but has no such attr family: {r}")

    # 12. NEGATIVE CONTROL -- an enum that ISN'T the 4-value icon vocabulary
    #     must never be mistaken for the selector, even when the attribute
    #     is literally NAMED iconSource. Matching on the NAME alone would be
    #     exactly the kind of spelling-based guess this programme forbids
    #     (the supports.className trap in the module docstring).
    _fake_block_json = '{"attributes":{"iconSource":{"type":"string","enum":["left","center","right"]}}}'
    if _icon_source_selector_attr_from_text(_fake_block_json) is not None:
        failures.append("a 3-value enum on an attr named iconSource was wrongly accepted as the icon-source selector")

    # 13. PROVE MECHANISM C CAN FAIL -- mutate a copy of sgs/separator's
    #     real render.php so the emoji branch's condition literal is
    #     misspelled; contentIconEmoji must stop resolving (RED), then the
    #     unmodified real text must resolve again (GREEN).
    _sep_render_path = _block_dir("sgs/separator") / "render.php"
    _sep_text = _read(_sep_render_path)
    _sep_broken = _sep_text.replace("'emoji' === $icon_source", "'emojii' === $icon_source")
    if _sep_broken == _sep_text:
        failures.append("mechanism-C break-injection did not change the text -- the literal it targets moved")
    else:
        _read_re = re.compile(r"\$(\w+)\s*=\s*[^;]*\$attributes\s*\[\s*['\"]contentIconSource['\"]\s*\]")
        _m_broken = _read_re.search(_sep_broken)
        _broken_family = (
            _resolve_icon_family_from_text(_sep_broken, _m_broken.group(1), _m_broken.end()) if _m_broken else {}
        )
        if "contentIconEmoji" in _broken_family:
            failures.append("RED CHECK FAILED: mechanism C still resolved contentIconEmoji after breaking the emoji literal")
        _m_restored = _read_re.search(_sep_text)
        _restored_family = (
            _resolve_icon_family_from_text(_sep_text, _m_restored.group(1), _m_restored.end()) if _m_restored else {}
        )
        if "contentIconEmoji" not in _restored_family:
            failures.append("GREEN CHECK FAILED: mechanism C did not resolve contentIconEmoji on the unmodified text")

    # --- Mechanism D: JSON-LD `name` key -------------------------------

    # 14. Positive -- sgs/star-rating.schemaItemName: written as `'name' =>
    #     $schema_item_name` inside a Schema.org Product array
    #     (render.php:36 read, :297 written).
    r = json_ld_name_evidence("sgs/star-rating", "schemaItemName")
    if not r:
        failures.append("sgs/star-rating.schemaItemName did not resolve to json-ld-name identity")

    # 15. NEGATIVE CONTROL -- a schema array key that is NOT 'name' (e.g.
    #     sgs/star-rating.schemaReviewCount, written as `'reviewCount' =>
    #     $schema_review_count`) must NOT be claimed identity, even though
    #     it reads an attribute and reaches the same schema array.
    r = json_ld_name_evidence("sgs/star-rating", "schemaReviewCount")
    if r:
        failures.append(f"sgs/star-rating.schemaReviewCount resolved to identity but its JSON-LD key is 'reviewCount', not 'name': {r}")

    # 16. PROVE MECHANISM D CAN FAIL -- mutate the JSON-LD key from 'name'
    #     to 'nam3'; schemaItemName must stop resolving (RED), then the
    #     unmodified text must resolve again (GREEN).
    _star_render_path = _block_dir("sgs/star-rating") / "render.php"
    _star_text = _read(_star_render_path)
    _star_broken, _n_subs = re.subn(r"'name'(\s*)=>", r"'nam3'\1=>", _star_text, count=1)
    if _n_subs == 0:
        failures.append("mechanism-D break-injection found no 'name' => key to break -- the literal it targets moved")
    else:
        _star_lines_broken = _star_broken.splitlines()
        _seed_broken, _ = _find_attr_read(_star_lines_broken, "schemaItemName")
        if _seed_broken and re.search(rf"['\"]name['\"]\s*=>\s*\${re.escape(_seed_broken)}\b", _star_broken):
            failures.append("RED CHECK FAILED: mechanism D still matched 'name' after the key was broken")
        _star_lines_ok = _star_text.splitlines()
        _seed_ok, _ = _find_attr_read(_star_lines_ok, "schemaItemName")
        if not (_seed_ok and re.search(rf"['\"]name['\"]\s*=>\s*\${re.escape(_seed_ok)}\b", _star_text)):
            failures.append("GREEN CHECK FAILED: mechanism D did not match 'name' on the unmodified text")

    # --- Mechanism E: filter-closure-only operand ----------------------

    # 17. Positive -- sgs/google-reviews.excludeKeywords: captured into the
    #     review-filter closure's `use (...)` clause, compared via
    #     str_contains, never escaped or echoed anywhere in the file.
    r = filter_predicate_evidence("sgs/google-reviews", "excludeKeywords")
    if not r:
        failures.append("sgs/google-reviews.excludeKeywords did not resolve to filter-predicate behaviour")

    # 18. NEGATIVE CONTROL -- a value used in a filter closure that ALSO
    #     reaches an escaping/output call must NOT be claimed behaviour (it
    #     is content). Synthetic: no real second attribute in this codebase
    #     has both shapes at once, so this proves the escaping guard on a
    #     controlled input rather than skipping the check.
    _synthetic_leak = (
        "$foo = $attributes['fooAttr'] ?? '';\n"
        "$out = array_filter($rows, function ( $r ) use ( $foo ) {\n"
        "    return $r['x'] === $foo;\n"
        "});\n"
        "echo esc_html( $foo );\n"
    )
    if _qualifies_as_filter_predicate(_synthetic_leak, "foo"):
        failures.append("a var reaching esc_html() elsewhere in the file was wrongly claimed as filter-predicate behaviour")

    # 19. PROVE MECHANISM E CAN FAIL -- mutate google-reviews' real
    #     render.php so excludeKeywords is dropped from the closure's
    #     use (...) clause; it must stop resolving (RED), then the
    #     unmodified text must resolve again (GREEN).
    _gr_render_path = _block_dir("sgs/google-reviews") / "render.php"
    _gr_text = _read(_gr_render_path)
    _gr_broken = _gr_text.replace(
        "use ( $min_rating, $text_only, $exclude_keywords )",
        "use ( $min_rating, $text_only )",
    )
    if _gr_broken == _gr_text:
        failures.append("mechanism-E break-injection did not change the text -- the use() clause text moved")
    else:
        _seed_broken, _ = _find_attr_read(_gr_broken.splitlines(), "excludeKeywords")
        if _seed_broken and _qualifies_as_filter_predicate(_gr_broken, _seed_broken):
            failures.append("RED CHECK FAILED: mechanism E still qualified excludeKeywords after removing it from use()")
        _seed_ok, _ = _find_attr_read(_gr_text.splitlines(), "excludeKeywords")
        if not (_seed_ok and _qualifies_as_filter_predicate(_gr_text, _seed_ok)):
            failures.append("GREEN CHECK FAILED: mechanism E did not qualify excludeKeywords on the unmodified text")

    # --- detect() end-to-end: exactly the 3 expected proposals ---------

    # 20. detect() over the 3 real candidates this session was scoped to
    #     must return EXACTLY 3 proposals with the right roles -- more than
    #     3 is a finding needing per-row justification (not silently
    #     accepted); fewer means one of the mechanisms regressed.
    _expected_candidates = [
        ("sgs/separator", "contentIconName"),
        ("sgs/star-rating", "schemaItemName"),
        ("sgs/google-reviews", "excludeKeywords"),
    ]
    _expected_roles = {
        ("sgs/separator", "contentIconName"): "icon-lucide",
        ("sgs/star-rating", "schemaItemName"): "identity",
        ("sgs/google-reviews", "excludeKeywords"): "behaviour",
    }
    _got = detect(_expected_candidates)
    if len(_got) != 3:
        failures.append(f"detect() should return exactly 3 proposals for the 3 expected candidates, got {len(_got)}: {_got}")
    else:
        _by_key = {(row["block_slug"], row["attr_name"]): row for row in _got}
        for _key, _want_role in _expected_roles.items():
            _row = _by_key.get(_key)
            if not _row or _row.get("role") != _want_role:
                failures.append(f"{_key} should resolve to role={_want_role} via detect(), got {_row!r}")

    if failures:
        print(f"DETECTOR-6 SELF-TEST FAILED ({len(failures)} checks)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("DETECTOR-6 SELF-TEST PASSED -- 20 checks green.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--candidates", help="JSON file: [[block_slug, attr_name], ...]")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not args.candidates:
        print("nothing to do: pass --candidates <file.json> or --self-test", file=sys.stderr)
        return 2
    cands = [tuple(x) for x in json.loads(Path(args.candidates).read_text(encoding="utf-8"))]
    for row in detect(cands):
        print(json.dumps(row))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
