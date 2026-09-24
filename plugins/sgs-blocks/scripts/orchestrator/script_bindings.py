"""Script bindings: the per-device values a Claude Design draft's script gives its template.

A Claude Design draft (``*.dc.html``) is classless. Its template says ``padding: {{ secPad }}`` and its
``text/x-dc`` script defines ``secPad: mob ? '56px 20px' : '104px 52px'`` inside a render function,
where ``mob`` is ``effW < 760`` and ``effW`` is the viewport width. Those definitions are pure
functions of the viewport width, so they can be READ (never guessed) for the three SGS device tiers
(mobile 375, tablet 768, desktop 1440) and handed to block attributes as ``{desktop, tablet, mobile}``.

What this module does, and no more:

* ``template_bindings``      every ``{{ name }}`` inside a template ``style`` value, with its CSS property.
* ``read_render_scope``      the render function that declares the width flags (the ``const mob = ...``
                             line, found by NAME in the script, never hardcoded thresholds), its
                             top-level declarations, and the object it returns.
* ``resolve_tier_bindings``  evaluates each referenced name at the three tier widths in Node
                             (``script-bindings-eval.js``, a locked-down ``vm`` context). A name that
                             reads state, props, data or anything but the width goes into ``unresolved``
                             with the reason. Nothing is guessed.
* ``crosscheck_probe``       compares the evaluated values with what ``draft-responsive-probe.js``
                             MEASURED by rendering the real draft at 375 / 768 / 1440.

It converts nothing and writes nothing. ``resolve_tier_bindings`` is the entry point.
"""
from __future__ import annotations

import html as html_lib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
from typing import Any

_SCRIPTS = pathlib.Path(__file__).resolve().parent.parent
for _p in (str(_SCRIPTS), str(_SCRIPTS / "draft-manifest"), str(pathlib.Path(__file__).resolve().parent)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from breakpoint_snap import declared_flags, find_width_read, snap_scope  # noqa: E402
from dc_script import script_text  # noqa: E402
from dc_template import balanced_end, find_screens, template_text  # noqa: E402

EVAL_JS = pathlib.Path(__file__).resolve().parent / "script-bindings-eval.js"

# Time budgets for the locked-down evaluator. They exist to stop a hostile or looping script, not to
# police speed: an ordinary draft takes about 0.15 s. Measured 2026-09-20: with 36 busy processes on
# 12 cores 2 of 10 runs hit the old 20 s deadline ("overall deadline exceeded") and every name went
# unresolved, so the budgets are wide enough for a busy machine and a loaded CI box.
EVAL_EXPRESSION_TIMEOUT_MS = 1000
EVAL_DEADLINE_MS = 90000
EVAL_PROCESS_TIMEOUT_S = 120.0

# The draft tool's own names for its width flags. Only used to FIND the render function; the
# thresholds behind them (760, 1024, 1280 ...) are read from the script, never assumed.
FLAG_NAMES: tuple[str, ...] = ("mob", "narrow", "wide")

# The three fixed SGS device tiers (.claude/rules/cloning-pipeline.md's breakpoint-discipline rule): the width each tier
# is sampled at, and the range of viewport widths that tier owns (mobile < 768, tablet < 1024).
TIER_WIDTHS: dict[str, int] = {"mobile": 375, "tablet": 768, "desktop": 1440}
TIER_RANGES: dict[str, tuple[int, int]] = {"mobile": (320, 767), "tablet": (768, 1023), "desktop": (1024, 2560)}
TIER_ORDER: tuple[str, ...] = ("mobile", "tablet", "desktop")

_NAME_RE = re.compile(r"\{\{\s*([A-Za-z_$][\w$.]*)\s*\}\}")
_STYLE_ATTR_RE = re.compile(r"""\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')""", re.IGNORECASE)
_LITERAL_NAMES = {"true", "false", "null", "undefined"}
_DECL_RE = re.compile(r"(?:const|let|var)\s+")
_IDENT_RE = re.compile(r"[A-Za-z_$][\w$]*")
_OPERATOR_CHARS = set("+-*/%&|?:=,<>!(")


# --------------------------------------------------------------------------------------------------
# Lexing: a comment-free copy of the script and a "masked" copy in which strings, comments and regex
# literals are blanked, so brackets and commas inside them never confuse the structure scan.
# --------------------------------------------------------------------------------------------------

def _end_of_braces(src: str, j: int) -> int:
    """Index just past the ``}`` that closes a template literal's ``${`` (``j`` is just after the ``${``)."""
    depth = 1
    while j < len(src):
        ch = src[j]
        if ch in "'\"`":
            j = _end_of_string(src, j)
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return j + 1
        j += 1
    return j


def _end_of_string(src: str, i: int) -> int:
    """Index just past the string or template literal that opens at ``i``."""
    quote, j = src[i], i + 1
    while j < len(src):
        ch = src[j]
        if ch == "\\":
            j += 2
            continue
        if ch == quote:
            return j + 1
        if quote != "`" and ch == "\n":
            return j
        if quote == "`" and ch == "$" and src[j + 1:j + 2] == "{":
            j = _end_of_braces(src, j + 2)
            continue
        j += 1
    return len(src)


def _end_of_regex(src: str, i: int) -> int:
    """Index just past the regex literal that opens at ``i`` (``src[i] == '/'``)."""
    j, in_class = i + 1, False
    while j < len(src):
        ch = src[j]
        if ch == "\\":
            j += 2
            continue
        if ch == "\n":
            return j
        if ch == "[":
            in_class = True
        elif ch == "]":
            in_class = False
        elif ch == "/" and not in_class:
            return j + 1
        j += 1
    return len(src)


def lex(src: str) -> tuple[str, str]:
    """``(masked, plain)``: same length as ``src``. ``plain`` has comments blanked; ``masked`` also has
    string interiors and regex literals blanked (the delimiting quotes stay, so a key is still visible)."""
    plain, masked = list(src), list(src)
    n, i, prev = len(src), 0, ""

    def blank(buf: list[str], a: int, b: int) -> None:
        for k in range(a, min(b, n)):
            if buf[k] != "\n":
                buf[k] = " "

    while i < n:
        ch = src[i]
        if ch == "/" and src[i + 1:i + 2] == "/":
            end = src.find("\n", i)
            end = n if end < 0 else end
            blank(plain, i, end)
            blank(masked, i, end)
            i = end
            continue
        if ch == "/" and src[i + 1:i + 2] == "*":
            end = src.find("*/", i + 2)
            end = n if end < 0 else end + 2
            blank(plain, i, end)
            blank(masked, i, end)
            i = end
            continue
        if ch in "'\"`":
            end = _end_of_string(src, i)
            blank(masked, i + 1, end - 1)
            i, prev = end, ch
            continue
        if ch == "/" and (not prev or prev in "(,=:[!&|?{};+-*%<>~^" or _word_before(src, i) in ("return", "typeof")):
            end = _end_of_regex(src, i)
            blank(masked, i, end)
            i, prev = end, "x"
            continue
        if not ch.isspace():
            prev = ch
        i += 1
    return "".join(masked), "".join(plain)


def _word_before(src: str, i: int) -> str:
    m = re.search(r"([A-Za-z_$][\w$]*)\s*$", src[max(0, i - 12):i])
    return m.group(1) if m else ""


def _bracket_pairs(masked: str) -> dict[int, int]:
    """Opening index -> closing index for every bracket in the masked text."""
    pairs: dict[int, int] = {}
    stack: list[int] = []
    for i, ch in enumerate(masked):
        if ch in "([{":
            stack.append(i)
        elif ch in ")]}" and stack:
            pairs[stack.pop()] = i
    return pairs


# --------------------------------------------------------------------------------------------------
# Structure: the render function, its declarations and the object it returns.
# --------------------------------------------------------------------------------------------------

def _expr_end(masked: str, start: int, end: int) -> int:
    """End of an expression that starts at ``start``: a top-level comma or semicolon, or a newline that
    begins a new statement (the draft may omit semicolons)."""
    depth, i = 0, start
    while i < end:
        ch = masked[i]
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            if depth == 0:
                return i
            depth -= 1
        elif depth == 0 and ch in ",;":
            return i
        elif depth == 0 and ch == "\n":
            before = masked[start:i].rstrip()
            after = masked[i:end].lstrip()
            if before and before[-1] not in _OPERATOR_CHARS and after and (after[0].isalpha() or after[0] in "_$"):
                return i
        i += 1
    return end


def _declarations(masked: str, plain: str, start: int, end: int) -> list[tuple[str, str, int]]:
    """Top-level ``const|let|var name = expr`` declarators between ``start`` and ``end``, in order, as
    ``(name, expression, position)``. Destructuring and declarators without ``=`` are skipped."""
    found: list[tuple[str, str, int]] = []
    depth, i = 0, start
    while i < end:
        ch = masked[i]
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        elif depth == 0 and (i == start or not (masked[i - 1].isalnum() or masked[i - 1] in "_$.")):
            kw = _DECL_RE.match(masked, i)
            if kw:
                j = kw.end()
                while j < end:
                    name = _IDENT_RE.match(masked, j)
                    if not name:
                        break
                    k = name.end()
                    while k < end and masked[k] in " \t":
                        k += 1
                    if masked[k:k + 1] != "=" or masked[k + 1:k + 2] in ("=", ">"):
                        break
                    expr_start = k + 1
                    expr_end = _expr_end(masked, expr_start, end)
                    found.append((name.group(0), plain[expr_start:expr_end].strip(), i))
                    j = expr_end
                    if masked[j:j + 1] != ",":
                        break
                    j += 1
                    while j < end and masked[j].isspace():
                        j += 1
                i = max(i, j - 1)
        i += 1
    return found


def _object_properties(masked: str, plain: str, open_idx: int, close_idx: int) -> dict[str, str]:
    """Top-level ``key: expression`` pairs of an object literal (later duplicates win, as in JS).
    Shorthand keys map to their own name; methods and spreads are skipped."""
    props: dict[str, str] = {}
    i = open_idx + 1
    while i < close_idx:
        while i < close_idx and (masked[i].isspace() or masked[i] == ","):
            i += 1
        if i >= close_idx:
            break
        if masked.startswith("...", i):
            i = _expr_end(masked, i, close_idx) + 1
            continue
        key = _IDENT_RE.match(masked, i)
        if key:
            name, j = key.group(0), key.end()
        elif masked[i] in "'\"":
            end = _end_of_string(plain, i)
            name, j = plain[i + 1:end - 1], end
        else:
            i = _expr_end(masked, i, close_idx) + 1
            continue
        while j < close_idx and masked[j] in " \t\n":
            j += 1
        if masked[j:j + 1] == ":":
            end = _expr_end(masked, j + 1, close_idx)
            props[name] = plain[j + 1:end].strip()
            i = end + 1
        elif masked[j:j + 1] == "(":
            pairs = _bracket_pairs(masked[j:close_idx])
            after = pairs.get(0, 0) + j + 1
            while after < close_idx and masked[after].isspace():
                after += 1
            i = (_bracket_pairs(masked[after:close_idx]).get(0, 0) + after + 1) if masked[after:after + 1] == "{" else after
        else:
            props[name] = name
            i = j
    return props


def read_render_scope(script: str, flag_names: tuple[str, ...] = FLAG_NAMES) -> dict[str, Any] | str:
    """The render function that declares the width flags.

    Returns ``{declarations: [(name, expr, pos)], properties: {name: expr}, flag_source: {name: expr}}``,
    or a string saying why the flags could not be read (no declaration found, no returned object)."""
    masked, plain = lex(script)
    pairs = _bracket_pairs(masked)
    anchor = -1
    for name in flag_names:
        m = re.search(r"(?<![\w$.])(?:const|let|var)\s+(?:[\w$]+\s*=[^;\n]*,\s*)*" + re.escape(name) + r"\s*=(?!=)", masked)
        if m:
            anchor = m.start()
            break
    width_hit = find_width_read(masked)
    structural = False
    if anchor < 0 and width_hit:
        # The draft renamed its flags (mob -> mobile ...): find the render function by what it READS, the
        # viewport width from its state, not by what its flags are called.
        anchor, structural = width_hit[1], True
    if anchor < 0:
        return "no declaration of a width flag (%s) and no read of the viewport width was found in the script" % ", ".join(flag_names)
    opens = [o for o, c in pairs.items() if masked[o] == "{" and o < anchor < c]
    if not opens:
        return "the width flag declaration is not inside a function body"
    body_open = max(opens)
    body_close = pairs[body_open]
    declarations = _declarations(masked, plain, body_open + 1, body_close)
    width_var = width_hit[0] if width_hit else None
    if structural and width_var:
        flag_source = declared_flags(declarations, width_var)
    else:
        flag_source = {n: e for n, e, _ in declarations if n in flag_names}
    if not flag_source:
        return "the width flag declaration could not be parsed"
    returns = [m for m in re.finditer(r"(?<![\w$.])return\s*\{", masked[body_open:body_close])]
    depth_ok = []
    for m in returns:
        o = body_open + m.end() - 1
        if masked[body_open + 1:body_open + m.start()].count("{") - masked[body_open + 1:body_open + m.start()].count("}") == 0:
            depth_ok.append(o)
    if not depth_ok:
        return "the render function returns no object literal of values"
    obj_open = depth_ok[-1]
    properties = _object_properties(masked, plain, obj_open, pairs[obj_open])
    return {"declarations": declarations, "properties": properties, "flag_source": flag_source, "width_var": width_var}


# --------------------------------------------------------------------------------------------------
# Template: which bindings sit in style values.
# --------------------------------------------------------------------------------------------------

def _split_style(style: str) -> list[str]:
    """Split a style value on top-level semicolons (parentheses, quotes and ``{{ }}`` respected)."""
    parts, depth, quote, start, i = [], 0, "", 0, 0
    while i < len(style):
        ch = style[i]
        if quote:
            if ch == quote:
                quote = ""
        elif ch in "'\"":
            quote = ch
        elif style.startswith("{{", i):
            depth += 1
            i += 1
        elif style.startswith("}}", i):
            depth -= 1
            i += 1
        elif ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif ch == ";" and depth <= 0:
            parts.append(style[start:i])
            start = i + 1
        i += 1
    parts.append(style[start:])
    return [p for p in parts if p.strip()]


def template_bindings(html: str) -> dict[str, list[dict[str, Any]]]:
    """``{name: [use, ...]}`` for every ``{{ name }}`` inside a template ``style`` value.

    A use is ``{tag, property, value_template, embedded, offset}``: the element's tag, the CSS property,
    the property's value as written (``{{ secPad }}`` or ``repeat(auto-fill,minmax(min(100%,{{ cardMin }}),1fr))``),
    whether the binding is only PART of that value, and the character offset of the element's opening tag."""
    tpl = template_text(html)
    uses: dict[str, list[dict[str, Any]]] = {}
    for m in _STYLE_ATTR_RE.finditer(tpl):
        style = m.group(1) if m.group(1) is not None else m.group(2)
        if "{{" not in style:
            continue
        tag_start = tpl.rfind("<", 0, m.start())
        tag = re.match(r"<([A-Za-z][\w-]*)", tpl[tag_start:])
        for declaration in _split_style(style):
            prop, _, value = declaration.partition(":")
            value = value.strip()
            for name in dict.fromkeys(n.group(1) for n in _NAME_RE.finditer(value)):
                if name in _LITERAL_NAMES:
                    continue
                uses.setdefault(name, []).append({
                    "tag": tag.group(1).lower() if tag else "",
                    "property": prop.strip().lower(),
                    "value_template": value,
                    "embedded": value != "{{ %s }}" % name and not re.fullmatch(r"\{\{\s*%s\s*\}\}" % re.escape(name), value),
                    "offset": tag_start,
                })
    return uses


# --------------------------------------------------------------------------------------------------
# Resolution.
# --------------------------------------------------------------------------------------------------

def _identifiers(expr: str) -> set[str]:
    masked, _ = lex(expr)
    return {m.group(0) for m in re.finditer(r"(?<![\w$.])[A-Za-z_$][\w$]*", masked)}


def _closure(seed: set[str], declarations: list[tuple[str, str, int]]) -> list[tuple[str, str, int]]:
    """The declarations the seed names depend on, transitively, in source order."""
    by_name: dict[str, tuple[str, str, int]] = {}
    for d in declarations:
        by_name[d[0]] = d
    needed: set[str] = set()
    todo = [n for n in seed if n in by_name]
    while todo:
        name = todo.pop()
        if name in needed:
            continue
        needed.add(name)
        todo.extend(n for n in _identifiers(by_name[name][1]) if n in by_name and n not in needed)
    return [d for d in declarations if d[0] in needed and by_name[d[0]] is d]


def _run_node(payload: dict[str, Any], timeout: float = 30.0) -> dict[str, Any]:
    node = shutil.which("node")
    if not node:
        return {"fatal": "node is not installed or not on PATH"}
    env = {k: os.environ[k] for k in ("PATH", "SYSTEMROOT", "TEMP", "TMP") if k in os.environ}
    try:
        proc = subprocess.run([node, str(EVAL_JS)], input=json.dumps(payload), capture_output=True,
                              text=True, encoding="utf-8", timeout=timeout, env=env)
    except subprocess.TimeoutExpired:
        return {"fatal": "the evaluator timed out after %ss" % timeout}
    try:
        return json.loads(proc.stdout or "{}")
    except json.JSONDecodeError:
        return {"fatal": "the evaluator returned no JSON: %s" % (proc.stderr or proc.stdout)[:300]}


def widths_ranges_edge(ranges: dict[str, tuple[int, int]], tier: str) -> int:
    """The lowest viewport width a device tier owns (tablet 768, desktop 1024): the edge below it."""
    return int(ranges[tier][0])


def resolve_tier_bindings(
    draft_html: str,
    flag_names: tuple[str, ...] = FLAG_NAMES,
    tier_widths: dict[str, int] | None = None,
    tier_ranges: dict[str, tuple[int, int]] | None = None,
    snap: bool = True,
) -> dict[str, Any]:
    """Resolve every style binding the draft's template references to per-tier values.

    Returns::

        {"tier_widths": {...},
         "flags": {"mob": "effW < 760", ...} | None,        # read from the script
         "resolved": {name: {"mobile", "tablet", "desktop", "uniform", "expression", "depends_on",
                             "uses": [...], "intra_tier": {tier: [{from, to, value}]}}},
         "unresolved": [{"name", "reason"}],
         "snaps": [{in, comparison, draft, snapped, reason, differs_from_draft_between}],
         "problems": [str]}                                  # why nothing could be resolved, if so

    ``snap`` (default on) rounds the draft's width thresholds to our device edges before evaluating
    (``breakpoint_snap``: within 10px of 768 / 1024, and a declared flag between 640 and 768 to 768); each
    change is a row in ``snaps``. ``snap=False`` evaluates the draft's own thresholds untouched.

    ``tier_widths`` / ``tier_ranges`` (keys ``mobile`` / ``tablet`` / ``desktop``) default to 375 / 768 / 1440
    and 320-767 / 768-1023 / 1024-2560. A caller wired to the converter should pass the values the converter
    itself uses (``db_lookup.device_tier_samples`` / ``device_tier_ranges``, lower-cased) so both sides agree:
    the converter's tablet sample is 800, this module's default is 768.

    ``uniform`` is True when all three tiers are equal (a caller may then write the plain value).
    ``intra_tier`` lists, for a tier whose range holds more than one value, the runs the sweep found:
    a draft breakpoint that falls inside a device tier (for example 760 inside mobile 320-767)."""
    uses = template_bindings(draft_html)
    widths = dict(tier_widths or TIER_WIDTHS)
    ranges = dict(tier_ranges or TIER_RANGES)
    result: dict[str, Any] = {"tier_widths": widths, "flags": None, "resolved": {}, "unresolved": [], "snaps": [], "problems": []}

    if not uses:
        return result          # a draft with no style binding (every static or BEM draft): nothing to read, no noise

    def refuse_all(why: str) -> dict[str, Any]:
        result["problems"].append(why)
        result["unresolved"] = [{"name": n, "reason": why} for n in uses]
        return result

    scope = read_render_scope(script_text(draft_html), flag_names)
    if isinstance(scope, str):
        return refuse_all(scope)
    result["flags"] = scope["flag_source"]

    to_evaluate: dict[str, str] = {}
    for name in uses:
        if "." in name:
            result["unresolved"].append({"name": name, "reason": "a field of a loop item (dotted name), not a render value"})
        elif name not in scope["properties"]:
            result["unresolved"].append({"name": name, "reason": "no definition in the render function's returned values"})
        else:
            to_evaluate[name] = scope["properties"][name]
    if not to_evaluate:
        return result

    original = dict(to_evaluate)
    scope_declarations = scope["declarations"]
    if snap:
        edges = (widths_ranges_edge(ranges, "tablet"), widths_ranges_edge(ranges, "desktop"))
        scope_declarations, to_evaluate, result["snaps"] = snap_scope(scope_declarations, to_evaluate, scope.get("width_var"), edges)
    seed: set[str] = set()
    for expr in to_evaluate.values():
        seed |= _identifiers(expr)
    declarations = _closure(seed, scope_declarations)
    reply = _run_node({
        "declarations": [{"name": n, "expr": e} for n, e, _ in declarations],
        "bindings": [{"name": n, "expr": e} for n, e in to_evaluate.items()],
        "tiers": widths, "ranges": {t: list(r) for t, r in ranges.items()},
        "timeout_ms": EVAL_EXPRESSION_TIMEOUT_MS, "deadline_ms": EVAL_DEADLINE_MS,
    }, timeout=EVAL_PROCESS_TIMEOUT_S)
    if "fatal" in reply:
        return refuse_all("evaluator failed: %s" % reply["fatal"])

    known = {n for n, _, _ in scope["declarations"]}
    for name, expr in original.items():
        out = reply.get("bindings", {}).get(name)
        if not out or not out.get("ok"):
            result["unresolved"].append({"name": name, "reason": (out or {}).get("error") or "not evaluated"})
            continue
        tiers = out["tiers"]
        entry: dict[str, Any] = {t: tiers[t] for t in TIER_ORDER}
        entry.update({
            "uniform": len({json.dumps(tiers[t]) for t in TIER_ORDER}) == 1,
            "expression": expr,
            "depends_on": sorted(_identifiers(expr) & known),
            "uses": uses[name],
            "intra_tier": {t: runs for t, runs in out["runs"].items() if len(runs) > 1},
        })
        result["resolved"][name] = entry
    return result


def attribute_value(entry: dict[str, Any]) -> Any:
    """What a caller writes into a block attribute: the plain value when all tiers agree, else the tier object."""
    if entry["uniform"]:
        return entry["desktop"]
    return {t: entry[t] for t in ("desktop", "tablet", "mobile")}


# --------------------------------------------------------------------------------------------------
# CSS values (only what the cross-check needs) and the cross-check against the measured probe.
# --------------------------------------------------------------------------------------------------

def _split_top_level(value: str, sep: str = " ") -> list[str]:
    parts, depth, cur = [], 0, ""
    for ch in value.strip():
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if depth == 0 and (ch == sep or (sep == " " and ch.isspace())):
            if cur:
                parts.append(cur)
            cur = ""
        else:
            cur += ch
    if cur:
        parts.append(cur)
    return parts


def css_to_px(value: str, viewport_w: float) -> float | None:
    """A CSS length in px: numbers, ``px``, ``vw``, ``clamp()``, ``min()``, ``max()``. None when it is anything else."""
    v = value.strip()
    m = re.fullmatch(r"(-?\d*\.?\d+)(px|vw)?", v)
    if m:
        n = float(m.group(1))
        return n * viewport_w / 100 if m.group(2) == "vw" else n
    fn = re.fullmatch(r"(clamp|min|max)\((.*)\)", v, re.DOTALL)
    if not fn:
        return None
    args = [css_to_px(a, viewport_w) for a in _split_top_level(fn.group(2), ",")]
    if any(a is None for a in args):
        return None
    nums = [float(a) for a in args if a is not None]
    if fn.group(1) == "min":
        return min(nums)
    if fn.group(1) == "max":
        return max(nums)
    return min(max(nums[1], nums[0]), nums[2]) if len(nums) == 3 else None


def count_tracks(value: str) -> int | None:
    """Number of grid tracks in a ``grid-template-columns`` value (``repeat(N, ...)`` counts N); None when auto-repeating."""
    total = 0
    for token in _split_top_level(value):
        rep = re.match(r"repeat\(\s*([\w-]+)\s*,", token)
        if rep:
            if not rep.group(1).isdigit():
                return None
            total += int(rep.group(1))
        else:
            total += 1
    return total


def _norm_text(text: str) -> str:
    """Lower-case, apostrophes dropped (the probe writes ``im``, the template ``I'm``), everything else a space."""
    return " ".join(re.sub(r"[^a-z0-9]+", " ", re.sub(r"['’`]", "", text.lower())).split())


def _element_text(tpl: str, offset: int, tag: str) -> str:
    """The static text of a template element, normalised: tags, ``{{ }}`` and entities removed."""
    open_tag = re.compile(r"<%s\b(?:[^>\"']|\"[^\"]*\"|'[^']*')*>" % re.escape(tag), re.IGNORECASE).match(tpl, offset)
    if not open_tag or open_tag.group(0).endswith("/>"):
        return ""
    inner = tpl[open_tag.end():balanced_end(tpl, open_tag.end(), tag)]
    inner = re.sub(r"<[^>]*>", " ", inner)
    inner = _NAME_RE.sub(" ", re.sub(r"\{\{[^}]*\}\}", " ", inner))
    return _norm_text(html_lib.unescape(inner))


def _probe_identity(key: str) -> tuple[str, str]:
    tag, _, rest = key.partition("|")
    return tag, _norm_text(re.sub(r"#\d+$", "", rest))


def _same_element(tpl_text: str, probe_text: str) -> bool:
    n = min(len(tpl_text), len(probe_text), 60)
    return n >= 12 and tpl_text[:n] == probe_text[:n]


def _expected(prop: str, value: str, width: int) -> dict[str, float] | str:
    """Probe property -> expected number, or a string saying why this use cannot be compared."""
    if prop in ("padding", "margin"):
        toks = [css_to_px(t, width) for t in _split_top_level(value)]
        if not toks or len(toks) > 4 or any(t is None for t in toks):
            return "value is not plain lengths"
        t, r, b, l = _box([float(x) for x in toks if x is not None])
        return {"%s-top" % prop: t, "%s-right" % prop: r, "%s-bottom" % prop: b, "%s-left" % prop: l}
    if prop in ("gap", "grid-gap"):
        toks = [css_to_px(t, width) for t in _split_top_level(value)]
        if not toks or len(toks) > 2 or any(t is None for t in toks):
            return "value is not plain lengths"
        return {"row-gap": float(toks[0]), "column-gap": float(toks[-1])}
    if prop == "grid-template-columns":
        n = count_tracks(value)
        return {"grid-template-columns": float(n)} if n is not None else "auto-repeating track list"
    px = css_to_px(value, width)
    return {prop: px} if px is not None else "value is not a plain length"


def _compare(entry: dict[str, Any], use: dict[str, Any], by_width: dict[str, Any]) -> tuple[list[dict[str, Any]], str]:
    """Evaluator vs probe for one use on one probe element: ``(comparisons, why-not-comparable)``."""
    comparisons: list[dict[str, Any]] = []
    for tier in TIER_ORDER:
        width = TIER_WIDTHS[tier]
        expected = _expected(use["property"], str(entry[tier]), width)
        if isinstance(expected, str):
            return [], expected
        for probe_prop, want in expected.items():
            got = _probe_number(by_width.get(str(width), {}).get(probe_prop), probe_prop)
            comparisons.append({"tier": tier, "probe_property": probe_prop, "evaluator": want, "probe": got,
                                "match": got is not None and abs(got - want) <= 0.51})
    return comparisons, ""


def crosscheck_probe(draft_html: str, probe: dict[str, Any], result: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Compare each resolved style binding with the value the probe MEASURED.

    Status ``match`` / ``MISMATCH``: the probe element has the same tag, its (normalised) text starts the
    same as the template element's static text (at least 12 characters), and the probe lists the compared
    property as one that changes with width. That last test separates a grid from the panel nested in it,
    which start with the same text. ``value-only``: no element could be identified by text (its content
    comes from a data loop) but at least one probe element of that tag carries the same three values;
    that is consistency, not identification. ``not probed``: neither. The probe renders one screen, so a
    binding used only on another screen is never probed. Every measured property is rounded to whole
    pixels by the probe, so numbers are compared within 0.51 px."""
    result = result or resolve_tier_bindings(draft_html)
    tpl = template_text(draft_html)
    probe_elements = [(e["key"], e["tag"], _probe_identity(e["key"])[1], e["values_by_width"], set(e.get("changed_properties", [])))
                      for e in probe.get("elements", [])]
    rows: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()
    probed_label = str(probe.get("label", "")).strip().lower()
    other_screens = [(sc["start"], sc["end"], sc["label"]) for sc in find_screens(tpl) if sc["label"].strip().lower() != probed_label]

    def add(row: dict[str, Any]) -> None:
        ident = (row["binding"], row["property"], row["status"], str(row["probe_key"]))
        if ident not in seen:
            seen.add(ident)
            rows.append(row)

    for name, entry in result["resolved"].items():
        for use in entry["uses"]:
            base = {"binding": name, "property": use["property"], "tag": use["tag"], "probe_key": None, "comparisons": [], "note": ""}
            if use["embedded"]:
                add({**base, "status": "skipped", "note": "binding is part of a larger value"})
                continue
            elsewhere = next((label for a, b, label in other_screens if a <= use["offset"] < b), None)
            if elsewhere:
                add({**base, "status": "not probed", "note": "on the %s screen; the probe rendered %s" % (elsewhere, probed_label or "one screen")})
                continue
            text = _element_text(tpl, use["offset"], use["tag"])
            same_tag = [p for p in probe_elements if p[1] == use["tag"]]
            hits = [p for p in same_tag if _same_element(text, p[2])]
            varying = not entry["uniform"]
            if varying:
                first_expected = _expected(use["property"], str(entry["desktop"]), TIER_WIDTHS["desktop"])
                if not isinstance(first_expected, str):
                    hits = [p for p in hits if p[4] & set(first_expected)]
            for key, _, _, by_width, _ in hits:
                comparisons, note = _compare(entry, use, by_width)
                status = "skipped" if note else ("match" if comparisons and all(c["match"] for c in comparisons) else "MISMATCH")
                add({**base, "probe_key": key, "status": status, "comparisons": comparisons, "note": note})
            if hits:
                continue
            candidates = []
            for key, _, _, by_width, changed in same_tag:
                comparisons, note = _compare(entry, use, by_width)
                if not note and varying and comparisons and all(c["match"] for c in comparisons)                         and changed & {c["probe_property"] for c in comparisons}:
                    candidates.append((key, comparisons))
            if candidates:
                add({**base, "probe_key": candidates[0][0], "status": "value-only", "comparisons": candidates[0][1],
                     "note": "%d probe element(s) of this tag carry these values; element not identified by text" % len(candidates)})
            else:
                add({**base, "status": "not probed", "note": "no probe element with matching tag and text"})
    return rows


def _probe_number(raw: Any, prop: str) -> float | None:
    """The probe's value as a number. ``grid-template-columns`` is a track count (the probe stores the
    count itself, or a list of pixel tracks to count); other properties are ``12px`` or a bare number."""
    if raw is None:
        return None
    text = str(raw).strip()
    if prop == "grid-template-columns":
        return float(text) if text.isdigit() else (float(len(text.split())) if text != "none" else 0.0)
    m = re.fullmatch(r"(-?\d*\.?\d+)(?:px)?", text)
    return float(m.group(1)) if m else None


def _box(v: list[float]) -> tuple[float, float, float, float]:
    """CSS one-to-four value shorthand -> (top, right, bottom, left)."""
    if len(v) == 1:
        return v[0], v[0], v[0], v[0]
    if len(v) == 2:
        return v[0], v[1], v[0], v[1]
    if len(v) == 3:
        return v[0], v[1], v[2], v[1]
    return v[0], v[1], v[2], v[3]


def format_table(rows: list[dict[str, Any]]) -> str:
    """Plain-text table of a cross-check: one line per compared element."""
    lines = ["%-16s %-22s %-8s %-40s %s" % ("binding", "property", "status", "probe element", "mobile / tablet / desktop (evaluator vs probe)")]
    for r in rows:
        cells = []
        for tier in TIER_ORDER:
            pairs = [c for c in r["comparisons"] if c["tier"] == tier]
            if pairs:
                cells.append("/".join("%g" % c["evaluator"] for c in pairs) + " v " + "/".join("-" if c["probe"] is None else "%g" % c["probe"] for c in pairs))
        lines.append("%-16s %-22s %-8s %-40s %s" % (r["binding"], r["property"], r["status"], (r["probe_key"] or r["note"])[:40], " | ".join(cells)))
    return "\n".join(lines)


def main(argv: list[str]) -> int:
    """``python script_bindings.py <draft.html> [--probe probe.json]``: print the resolution (and the cross-check)."""
    if not argv:
        print(main.__doc__)
        return 2
    draft = pathlib.Path(argv[0]).read_text(encoding="utf-8")
    result = resolve_tier_bindings(draft)
    if "--probe" in argv:
        probe = json.loads(pathlib.Path(argv[argv.index("--probe") + 1]).read_text(encoding="utf-8"))
        print(format_table(crosscheck_probe(draft, probe, result)))
    else:
        print(json.dumps({k: v for k, v in result.items() if k != "resolved"}, indent=1))
        for name, e in result["resolved"].items():
            print(name, json.dumps(attribute_value(e)), "intra-tier:" + ",".join(e["intra_tier"]) if e["intra_tier"] else "")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
