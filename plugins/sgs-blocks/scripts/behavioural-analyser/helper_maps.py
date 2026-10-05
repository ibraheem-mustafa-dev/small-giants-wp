"""Derive the seeder's helper contracts from the helper PHP source.

The css_property seeder (`extract-signatures.py::extract_css_property_and_layer`)
must know, for every shared emitter in `plugins/sgs-blocks/includes/`:

- **prefix helpers** (`sgs_typography_css_rule( $attributes, $prefix, $selector )`):
  which `{prefix}{Suffix}` attribute feeds which CSS property, and which
  parameter positions carry the attributes, the prefix and the selector;
- **value composers** (`sgs_background_paint_decl( $colour, $gradient )`): which
  CSS property each positional argument ends up in.

Both are read off the helper bodies here, so a suffix or argument added to a
helper is routed on the next seed without anyone editing a list. The method is
the seeder's own: each helper body is rewritten so that its inputs look like
block attributes (`$attributes['zqzqFontFamily']` for a prefixed read,
`$attributes['zqarg0']` for argument 0), then scanned with the same statement
tracer that reads render.php (`_attr_to_raw_props_php`), plus two shapes found
in helper bodies: responsive spec arrays (`'value' => ..., 'css' => 'font-size'`)
and calls to other helpers already derived (resolved to a fixed point).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Callable

import php_preprocess as pp
from php_source_index import PhpFunction, attrs_param_index, matching_close, split_top_level_args

PREFIX_SENTINEL = "zqzq"
_ARG_SENTINEL = "zqarg"
_MAX_ROUNDS = 8

# Keys of a responsive spec array that name the value or attribute feeding `'css'`.
# `unit_attr` names a unit companion, which is a measurement type, not a property.
_SPEC_VALUE_KEYS = ("value", "attr", "tablet_attr", "mobile_attr")


@dataclass
class PrefixHelper:
    """Contract of one `(attributes, prefix, selector)`-style helper."""

    name: str
    attrs_index: int
    prefix_index: int
    selector_index: "int | None"
    suffix_props: dict[str, set[str]] = field(default_factory=dict)
    # Suffixes the helper paints only inside a hover rule (hover_states.py).
    suffix_states: dict[str, str] = field(default_factory=dict)


def css_vocabulary(db_props: "frozenset[str]", plugin_root: Path, iter_rule_blocks: Callable) -> frozenset[str]:
    """Real CSS property names: the DB's property vocabulary, every property
    declared in the plugin's own stylesheets, and the `known-css-properties`
    list shipped in node_modules when it is installed."""
    declared: set[str] = set()
    for path in sorted((plugin_root / "src").rglob("*")):
        if path.suffix not in (".css", ".scss") or "node_modules" in path.parts:
            continue
        try:
            text = re.sub(r"/\*.*?\*/", " ", path.read_text(encoding="utf-8", errors="ignore"), flags=re.S)
        except OSError:
            continue
        for _selector, body in iter_rule_blocks(text):
            declared.update(re.findall(r"(?:^|;)\s*([a-z][a-z-]*[a-z])\s*:", body))
    known = plugin_root / "node_modules" / "known-css-properties" / "data" / "all.json"
    vocab: set[str] = set(db_props)
    if known.is_file():
        import json

        try:
            listed = set(json.loads(known.read_text(encoding="utf-8")).get("properties", []))
        except (OSError, ValueError):
            listed = set()
        vocab |= listed if listed else declared
    else:
        vocab |= declared
    return frozenset(p for p in vocab if re.fullmatch(r"[a-z][a-z-]*[a-z]", p))


def spec_array_props(
    src: str, vocab: "frozenset[str]", var_attr: "dict[str, str] | None" = None
) -> dict[str, set[str]]:
    """attr -> props for property/value arrays: an `array( ... )` holding exactly one
    `'css' => '<prop>'` (responsive spec) or `'property' => '<prop>'` (paint value)
    entry, whose value keys name `$attributes['x']`, `'x'` or a traced `$var`."""
    var_attr = var_attr or {}
    out: dict[str, set[str]] = {}
    for m in re.finditer(r"\barray\s*\(", src):
        close = matching_close(src, m.end() - 1, "(", ")")
        if close < 0:
            continue
        span = src[m.end() : close]
        css = re.findall(r"'(?:css|property)'\s*=>\s*'([a-z-]+)'", span)
        if len(css) != 1 or css[0] not in vocab:
            continue
        for key in _SPEC_VALUE_KEYS:
            for vm in re.finditer(
                r"'" + key + r"'\s*=>\s*(?:\$attributes\['(\w+)'\]|'(\w+)'|\$(\w+)\b(?!\s*\())", span
            ):
                attr = vm.group(1) or vm.group(2) or var_attr.get(vm.group(3) or "")
                if attr:
                    out.setdefault(attr, set()).add(css[0])
    return out


_FRAGMENT_RE = re.compile(
    r"'([^'\\]*(?:\\.[^'\\]*)*)'|\"([^\"\\]*(?:\\.[^\"\\]*)*)\"|\$attributes\['(\w+)'\]|\$(\w+)"
)
_MEDIA_COND_RE = re.compile(r"@media\s*\([^)]*\)", re.IGNORECASE)
_DECL_START_RE = re.compile(r"(?:^|(?<=[{;]))\s*(--[a-z0-9-]+|[a-z][a-z-]*)\s*:")


def open_declaration_pairs(
    src: str,
    vocab: "frozenset[str]",
    var_attr: dict[str, str],
    split_statements: Callable[[str], list[str]],
    custom_properties: bool = False,
) -> dict[str, set[str]]:
    """attr -> props, pairing a value only with a declaration still open where it is
    concatenated: the nearest `prop:` before it with no `;`, `{` or `}` in between.

    Stricter than the render.php tracer (which keeps reusing the last property for
    every later value in a statement): helper bodies routinely append selectors and
    unrelated values after a declaration has closed."""
    out: dict[str, set[str]] = {}
    for stmt in split_statements(src):
        open_prop: "str | None" = None
        for m in _FRAGMENT_RE.finditer(stmt):
            single, double, direct, var = m.groups()
            text = single if single is not None else double
            if text is not None:
                text = _MEDIA_COND_RE.sub("", text)
                last = None
                for pm in _DECL_START_RE.finditer(text):
                    name = pm.group(1)
                    if name.startswith("--") or name in vocab:
                        last = pm
                if last is not None:
                    tail = text[last.end():]
                    open_prop = None if re.search(r"[;{}]", tail) else last.group(1)
                elif re.search(r"[;{}]", text):
                    open_prop = None
                continue
            attr = direct or var_attr.get(var or "")
            if attr and open_prop and (custom_properties or not open_prop.startswith("--")):
                out.setdefault(attr, set()).add(open_prop)
    return out


def _selector_params(fn: PhpFunction, body: str) -> set[str]:
    """Parameters the body uses as a CSS selector (concatenated before a `{`)."""
    found = set()
    for p in fn.params:
        if re.search(r"\$" + re.escape(p) + r"\s*\.\s*'[^'\\]*\{", body):
            found.add(p)
    return found


def _composer_calls(
    src: str,
    composers: dict[str, dict[int, set[str]]],
    var_attr: dict[str, str],
    resolve_arg: Callable[[str, dict[str, str]], "str | None"],
) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {}
    if not composers:
        return out
    call_re = re.compile(r"\b(" + "|".join(re.escape(c) for c in sorted(composers)) + r")\s*\(")
    for m in call_re.finditer(src):
        close = matching_close(src, m.end() - 1, "(", ")")
        if close < 0:
            continue
        args = split_top_level_args(src[m.end() : close])
        for idx, props in composers[m.group(1)].items():
            if idx < len(args):
                attr = resolve_arg(args[idx], var_attr)
                if attr:
                    out.setdefault(attr, set()).update(props)
    return out


# Shorthands whose slot a value fills cannot be told from the helper body alone
# (`background:` takes a colour or a gradient); they never become a derived route.
_SLOT_AMBIGUOUS_SHORTHANDS = frozenset({"background", "border", "outline"})


def unambiguous_var_attr(es: ModuleType, src: str) -> dict[str, str]:
    """`_build_php_var_attr_map`, minus variables re-assigned from a different
    attribute in another statement (a reused `$shorthand` local must not carry one
    attribute's identity into another's declaration), and minus every variable
    whose value is taken from such an ambiguous variable."""
    var_attr = es._build_php_var_attr_map(src)
    assignments: dict[str, list[tuple[frozenset[str], frozenset[str]]]] = {}
    for m in re.finditer(r"\$(\w+)\s*=(?![=>])\s*(.+?);", src, re.DOTALL):
        rhs = m.group(2)
        direct = frozenset(re.findall(r"\$attributes\['(\w+)'\]", rhs))
        used = frozenset(v for v in re.findall(r"\$(\w+)", rhs) if v != m.group(1))
        assignments.setdefault(m.group(1), []).append((direct, used))
    # The attribute array itself is never one attribute's value.
    dropped: set[str] = {"attributes", "attrs"}
    changed = True
    while changed:
        changed = False
        for var, rows in assignments.items():
            if var in dropped:
                continue
            roots = set()
            tainted = False
            for direct, used in rows:
                row_roots = set(direct) | {var_attr[v] for v in used if v in var_attr and v not in dropped}
                if not direct and any(v in dropped for v in used):
                    tainted = True
                if row_roots:
                    roots.add(frozenset(row_roots))
            if tainted or len(roots) > 1:
                dropped.add(var)
                changed = True
    return {v: a for v, a in var_attr.items() if v not in dropped}


_IF_RE = re.compile(r"\bif\s*\(")


def gate_props(src: str, vocab: "frozenset[str]", var_attr: dict[str, str]) -> dict[str, set[str]]:
    """attr -> props for a mode switch: `if ( 'full' === $width_type ) { ... 'width:100%' ... }`.

    The condition must compare exactly one traced value with a string literal, and
    the branch body must declare the property in a string literal."""
    out: dict[str, set[str]] = {}
    for m in _IF_RE.finditer(src):
        cond_end = matching_close(src, m.end() - 1, "(", ")")
        if cond_end < 0:
            continue
        cond = src[m.end() : cond_end]
        if not re.search(r"'[\w-]+'\s*[!=]==|[!=]==\s*'[\w-]+'", cond):
            continue
        refs = {var_attr.get(v) for v in re.findall(r"\$(\w+)", cond)} - {None}
        refs |= set(re.findall(r"\$attributes\['(\w+)'\]", cond))
        if len(refs) != 1:
            continue
        brace = src.find("{", cond_end)
        if brace < 0 or src[cond_end + 1 : brace].strip():
            continue
        body_end = matching_close(src, brace, "{", "}")
        if body_end < 0:
            continue
        props = set()
        for lit in re.findall(r"'([^'\\]*)'", src[brace:body_end]):
            for pm in _DECL_START_RE.finditer(lit):
                if pm.group(1) in vocab:
                    props.add(pm.group(1))
        if props:
            out.setdefault(next(iter(refs)), set()).update(props)
    return out


def _scan(
    es: ModuleType,
    src: str,
    vocab: "frozenset[str]",
    composers: "dict[str, dict[int, set[str]]]",
    gates: bool = False,
) -> dict[str, set[str]]:
    """attr -> props in one rewritten helper body. Props an attribute reaches through
    its own declarations win; props inherited through another helper's argument are
    used only when the attribute has no declaration of its own."""
    var_attr = unambiguous_var_attr(es, src)
    direct = open_declaration_pairs(src, vocab, var_attr, es._split_php_statements)
    for attr, props in spec_array_props(src, vocab, var_attr).items():
        direct.setdefault(attr, set()).update(props)
    found = {a: set(p) for a, p in direct.items()}
    for attr, props in (gate_props(src, vocab, var_attr) if gates else {}).items():
        if not direct.get(attr):
            found.setdefault(attr, set()).update(props)
    for attr, props in _composer_calls(src, composers, var_attr, es._resolve_call_arg_to_attr).items():
        if not direct.get(attr):
            found.setdefault(attr, set()).update(props)
    return {a: p - _SLOT_AMBIGUOUS_SHORTHANDS for a, p in found.items() if p - _SLOT_AMBIGUOUS_SHORTHANDS}


def derive_value_composers(
    index: dict[str, PhpFunction], es: ModuleType, vocab: "frozenset[str]"
) -> dict[str, dict[int, set[str]]]:
    """{helper: {arg index: {css property}}} for every top-level function without an
    attributes parameter whose arguments reach a CSS declaration."""
    prepared: dict[str, tuple[PhpFunction, str]] = {}
    for name, fn in index.items():
        if fn.owner_class or not fn.params or attrs_param_index(fn) is not None:
            continue
        body = pp.expand_double_quoted(fn.body)
        selector_like = _selector_params(fn, body)
        for i, p in enumerate(fn.params):
            if p in selector_like:
                continue
            body = re.sub(r"\$" + re.escape(p) + r"\b", f"$attributes['{_ARG_SENTINEL}{i}']", body)
        prepared[name] = (fn, body)
    derived: dict[str, dict[int, set[str]]] = {}
    for _ in range(_MAX_ROUNDS):
        changed = False
        for name, (fn, body) in prepared.items():
            found = _scan(es, body, vocab, derived)
            result: dict[int, set[str]] = {}
            for attr, props in found.items():
                m = re.fullmatch(_ARG_SENTINEL + r"(\d+)", attr)
                if m:
                    result[int(m.group(1))] = set(props)
            if result and result != derived.get(name):
                derived[name] = result
                changed = True
        if not changed:
            break
    return derived


def _prefix_param_index(fn: PhpFunction) -> "int | None":
    for i, p in enumerate(fn.params):
        if "prefix" in p:
            return i
    return None


def _selector_param_index(fn: PhpFunction, start: int) -> "int | None":
    for i in range(start, len(fn.params)):
        if re.search(r"sel|scope", fn.params[i]):
            return i
    return None


def prepare_prefix_body(fn: PhpFunction, attrs_i: int, prefix_i: int, literal: str) -> str:
    """The helper body with the prefixed reads rewritten as `$attributes['<literal>X']`."""
    body = pp.expand_double_quoted(fn.body)
    body = pp.rename_variable(body, fn.params[attrs_i], "attributes")
    prefix = fn.params[prefix_i]
    body = pp.normalise_attr_index(body)
    body = pp.rewrite_reader_closures(body, prefix_var=prefix, literal_prefix=literal)
    body = re.sub(
        r"sgs_typography_attr\(\s*\$" + re.escape(prefix) + r"\s*,\s*'(\w+)'\s*\)",
        lambda m: f"'{literal}{m.group(1)}'",
        body,
    )
    body = re.sub(
        r"\$" + re.escape(prefix) + r"\s*\.\s*'(\w+)'", lambda m: f"'{literal}{m.group(1)}'", body
    )
    return pp.propagate_string_constants(body)


def derive_prefix_helpers(
    index: dict[str, PhpFunction],
    es: ModuleType,
    vocab: "frozenset[str]",
    composers: dict[str, dict[int, set[str]]],
) -> dict[str, PrefixHelper]:
    """Contracts of every top-level function taking an attributes array and a prefix."""
    helpers: dict[str, PrefixHelper] = {}
    bodies: dict[str, str] = {}
    for name, fn in index.items():
        if fn.owner_class:
            continue
        ai = attrs_param_index(fn)
        pi = _prefix_param_index(fn)
        if ai is None or pi is None:
            continue
        helpers[name] = PrefixHelper(name, ai, pi, _selector_param_index(fn, pi + 1))
        bodies[name] = prepare_prefix_body(fn, ai, pi, PREFIX_SENTINEL)
    for _ in range(_MAX_ROUNDS):
        changed = False
        for name, body in bodies.items():
            found = _scan(es, body, vocab, composers, gates=True)
            # Nested prefix helpers called with `'<sentinel>Sub'` (or the bare prefix,
            # already rewritten to the sentinel by the suffix substitution when the
            # helper passes `$prefix . 'Sub'`).
            fn = index[name]
            prefix = fn.params[helpers[name].prefix_index]
            for other, contract in helpers.items():
                if not contract.suffix_props:
                    continue
                for cm in re.finditer(r"\b" + re.escape(other) + r"\s*\(", body):
                    close = matching_close(body, cm.end() - 1, "(", ")")
                    if close < 0:
                        continue
                    args = split_top_level_args(body[cm.end() : close])
                    if contract.prefix_index >= len(args):
                        continue
                    parg = args[contract.prefix_index].strip()
                    sub = None
                    if parg == "$" + prefix:
                        sub = PREFIX_SENTINEL
                    else:
                        lm = re.fullmatch(r"'(" + PREFIX_SENTINEL + r"\w*)'", parg)
                        if lm:
                            sub = lm.group(1)
                    if sub is None:
                        continue
                    for suffix, props in contract.suffix_props.items():
                        found.setdefault(sub + suffix, set()).update(props)
            result = {
                attr[len(PREFIX_SENTINEL):]: set(props)
                for attr, props in found.items()
                if attr.startswith(PREFIX_SENTINEL) and len(attr) > len(PREFIX_SENTINEL)
            }
            if result != helpers[name].suffix_props:
                helpers[name].suffix_props = result
                changed = True
        if not changed:
            break
    _derive_suffix_states(index, es, vocab, helpers, bodies)
    return {n: h for n, h in helpers.items() if h.suffix_props}


def _derive_suffix_states(
    index: dict[str, PhpFunction],
    es: ModuleType,
    vocab: "frozenset[str]",
    helpers: dict[str, PrefixHelper],
    bodies: dict[str, str],
) -> None:
    """Mark each routed suffix the helper paints only in a hover rule as 'hover'."""
    import hover_states

    files = sorted({fn.file for fn in index.values()})
    constants = hover_states.hover_constants(
        [es._strip_php_comments(f.read_text(encoding="utf-8", errors="ignore")) for f in files]
    )
    emitters = hover_states.derive_hover_emitters(index, constants)
    for name, body in bodies.items():
        hover = hover_states.hover_attrs(body, emitters, constants, es._split_php_statements)
        # A value also declared in a statement that neither carries a hover marker
        # nor feeds a variable bound for a hover rule paints at rest too.
        flow = hover_states.hover_flow_vars(body, emitters, constants, es._split_php_statements)
        resting = " ".join(
            st for st in es._split_php_statements(body)
            if not hover_states.has_marker(st, constants)
            and not set(re.findall(r"\$(\w+)\s*(?:\[\])?\s*\.?=(?![=>])", st)) & flow
        )
        hover -= set(open_declaration_pairs(resting, vocab, unambiguous_var_attr(es, body), es._split_php_statements))
        helpers[name].suffix_states = {
            attr[len(PREFIX_SENTINEL):]: "hover"
            for attr in hover
            if attr.startswith(PREFIX_SENTINEL) and attr[len(PREFIX_SENTINEL):] in helpers[name].suffix_props
        }
