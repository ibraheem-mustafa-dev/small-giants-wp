"""Evidence shapes the css_property seeder adds on top of its statement tracer.

Each function returns plain dictionaries keyed by attribute name, merged by
`extract-signatures.py::_gather_php_evidence`:

- `composer_result_elements`: the BEM element a value-composer's declarations
  land on, read from the selector its result variable is concatenated after
  (`'.' . $uid . ' .sgs-container__overlay{' . $overlay_decls . '}'`).
- `paint_table_evidence`: attribute-keyed `'attr' => array( '<selector>', '<prop>' )` tables.
- `CrossBlockCss`: custom properties a block sets and another block's stylesheet
  reads (`multi-button` sets `--sgs-btn-*`, `button/style.css` consumes it).
"""

from __future__ import annotations

import re
from pathlib import Path
from types import ModuleType

import helper_maps
import php_preprocess as pp
from php_source_index import matching_close, split_top_level_args


def composer_result_elements(
    es: ModuleType,
    php_src: str,
    composers: "dict[str, dict[int, set[str]]]",
    var_attr: "dict[str, str]",
    block_short_slug: str,
) -> dict[str, set[str]]:
    """attr -> BEM elements for attributes whose composer result is concatenated
    after a BEM selector in a later statement."""
    if not composers or not block_short_slug:
        return {}
    results: dict[str, set[str]] = {}
    call_re = re.compile(
        r"\$(\w+)\s*=\s*(" + "|".join(re.escape(c) for c in sorted(composers)) + r")\s*\("
    )
    for m in call_re.finditer(php_src):
        close = matching_close(php_src, m.end() - 1, "(", ")")
        if close < 0:
            continue
        args = split_top_level_args(php_src[m.end() : close])
        for idx in composers[m.group(2)]:
            if idx < len(args):
                attr = es._resolve_call_arg_to_attr(args[idx], var_attr)
                if attr:
                    results.setdefault(m.group(1), set()).add(attr)
    # One plain hop: `$overlay_decls = $overlay_decls_computed;`
    for m in re.finditer(r"\$(\w+)\s*=\s*\$(\w+)\s*;", php_src):
        if m.group(2) in results:
            results.setdefault(m.group(1), set()).update(results[m.group(2)])
    out: dict[str, set[str]] = {}
    if not results:
        return out
    for stmt in es._split_php_statements(php_src):
        for var, attrs in results.items():
            for ref in re.finditer(r"\$" + re.escape(var) + r"\b(?!\s*=(?![=>]))", stmt):
                before = stmt[: ref.start()]
                literal = "".join(a or b for a, b in re.findall(r"'([^'\\]*)'|\"([^\"\\]*)\"", before))
                # The value must open the rule: `<selector>{' . $decls`.
                if not literal.rstrip().endswith("{"):
                    continue
                selector = literal[: literal.rfind("{")]
                element = es._derive_bem_element_with_fallback(selector, block_short_slug)
                if element:
                    for attr in attrs:
                        out.setdefault(attr, set()).add(element)
    return out


def loose_arg_attr(arg: str, var_attr: "dict[str, str]") -> "str | None":
    """The one attribute a call argument carries, read through a null-coalescing
    default, casts, wrapping sanitiser calls and a ternary's condition:
    `(string) ( $attributes['x'] ?? 'ease' )` and
    `$uses_gradient ? '' : sgs_colour_value( $colour_raw )` both name one
    attribute. More than one attribute in the value branches is refused."""
    text = arg.strip()
    depth = 0
    quote = None
    for i, ch in enumerate(text):
        if quote:
            if ch == quote and text[i - 1] != "\\":
                quote = None
            continue
        if ch in "'\"":
            quote = ch
        elif ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        elif ch == "?" and depth == 0 and not text.startswith("??", i) and text[i - 1] != "?":
            text = text[i + 1:]
            break
    text = re.sub(r"\?\?[^?]*$", "", text)
    attrs = set(re.findall(r"\$attributes\['(\w+)'\]", text))
    attrs |= {var_attr[v] for v in re.findall(r"\$(\w+)", text) if v in var_attr}
    return next(iter(attrs)) if len(attrs) == 1 else None


def paint_table_evidence(
    es: ModuleType, php_src: str, vocab: "frozenset[str]", block_short_slug: str
) -> tuple[dict[str, set[str]], dict[str, set[str]]]:
    """(attr -> props, attr -> elements) for attribute-keyed paint tables."""
    props: dict[str, set[str]] = {}
    elements: dict[str, set[str]] = {}
    for attr, prop, selector in pp.paint_table_props(php_src, vocab):
        props.setdefault(attr, set()).add(prop)
        element = es._derive_bem_element_from_selector(selector, block_short_slug)
        if element:
            elements.setdefault(attr, set()).add(element)
    return props, elements


class CrossBlockCss:
    """Every block stylesheet's custom-property consumers, for a property set by
    one block and read by another (the parent sets it, a child block paints it)."""

    def __init__(self, es: ModuleType, blocks_dir: Path) -> None:
        self._es = es
        self._sheets: list[tuple[str, str, tuple]] = []
        for block_dir in sorted(p for p in blocks_dir.iterdir() if p.is_dir()):
            css_path = block_dir / "style.css"
            if not css_path.exists():
                css_path = block_dir / "style.scss"
            if not css_path.exists():
                continue
            text = css_path.read_text(encoding="utf-8", errors="ignore")
            self._sheets.append((block_dir.name, text, ()))

    def resolve(self, token: str, own_slug: str) -> set[str]:
        """Real properties `token` reaches in another block's stylesheet."""
        found: set[str] = set()
        for i, (slug, text, maps) in enumerate(self._sheets):
            if slug == own_slug or token not in text:
                continue
            if not maps:
                maps = self._es._custom_props_consumed(text, slug)
                self._sheets[i] = (slug, text, maps)
            consumed, gradient_props, shorthand_slot, state_of, element_of = maps
            real, _chain, _states, _elements = self._es._resolve_var_chain(
                token, consumed, gradient_props, shorthand_slot, state_of, element_of
            )
            found |= real
        return found


def gather_php_evidence(
    es: ModuleType,
    php_src: str,
    php_src_own: str,
    block_short_slug: str,
    attr_names: "set[str]",
    props_vocab: "frozenset[str]",
    extended: bool = False,
) -> dict:
    """Every shape's evidence for one block's PHP text, keyed as the per-attribute
    resolver in `extract-signatures.py::extract_css_property_and_layer` reads it.

    `extended` adds the shapes only the supplementary pass uses (paint tables and
    composite `transition` values), which read the wider property vocabulary."""
    # The supplementary text joins many function bodies: a local re-assigned from
    # different attributes there must not carry one attribute's identity.
    var_attr = (
        helper_maps.unambiguous_var_attr(es, php_src) if extended else es._build_php_var_attr_map(php_src)
    )
    raw, php_attr_state, php_attr_element = es._attr_to_raw_props_php(
        php_src, props_vocab, var_attr, block_short_slug
    )
    if extended:
        # Inlined helper bodies append selectors and unrelated values after a
        # declaration has closed; the statement tracer keeps pairing those with the
        # last property it saw. Keep only tokens whose declaration is still open
        # where the value is concatenated.
        strict = helper_maps.open_declaration_pairs(
            php_src, props_vocab, var_attr, es._split_php_statements, custom_properties=True
        )
        raw = {attr: toks & strict.get(attr, set()) for attr, toks in raw.items()}
        raw = {attr: toks for attr, toks in raw.items() if toks}
    helper_props, helper_elements = es._attrs_from_helper_calls(php_src, attr_names, block_short_slug)
    for attr, props in helper_props.items():
        raw[attr] = raw.get(attr, set()) | props
    # Cause A (2026-08-27): sgs_emit_state_colour_css() call sites contribute
    # element and hover-position state evidence (see that function's docstring).
    state_colour_elements, state_colour_states = es._attrs_from_state_colour_helper_calls(
        php_src, attr_names, block_short_slug, var_attr
    )
    # Shape E reads the block's own text only (2026-09-10 db-consistency F6 fix:
    # it has no selector evidence, so a shared file's grid-item code must not feed it).
    for attr, props in es._attrs_from_text_colour_resolver_calls(php_src_own, var_attr).items():
        raw[attr] = raw.get(attr, set()) | props
    # Shape F: used by the resolver only for an attribute no other shape routes.
    value_composer_props = es._attrs_from_value_composer_calls(
        php_src, var_attr, loose_arg_attr if extended else None
    )
    for attr in value_composer_props:
        raw.setdefault(attr, set())
    # Shape G: the documented config-map convention ('base'/'hover'/'gradient'/...).
    config_map_props, config_map_elements, config_map_states = es._attrs_from_config_map_calls(
        php_src, block_short_slug
    )
    for attr, props in config_map_props.items():
        raw[attr] = raw.get(attr, set()) | props
    extra_elements = composer_result_elements(
        es, php_src, es._helper_contracts()["composers"], var_attr, block_short_slug
    )
    if extended:
        # Responsive spec arrays handed to sgs_emit_responsive_css():
        # `array( 'value' => $attributes['x'], 'css' => 'padding', 'box' => true )`.
        for attr, props in helper_maps.spec_array_props(php_src, props_vocab, var_attr).items():
            raw[attr] = raw.get(attr, set()) | props
        table_props, table_elements = paint_table_evidence(es, php_src, props_vocab, block_short_slug)
        for attr, props in table_props.items():
            raw[attr] = raw.get(attr, set()) | props
        for attr, elements in table_elements.items():
            extra_elements.setdefault(attr, set()).update(elements)
        for attr, props in pp.composite_transition_props(es._split_php_statements(php_src), var_attr).items():
            raw[attr] = (raw.get(attr, set()) - {"transition", "animation"}) | props
    return {
        "raw": raw,
        "php_attr_state": php_attr_state,
        "php_attr_element": php_attr_element,
        "helper_elements": helper_elements,
        "state_colour_elements": state_colour_elements,
        "state_colour_states": state_colour_states,
        "value_composer_props": value_composer_props,
        "config_map_props": config_map_props,
        "config_map_elements": config_map_elements,
        "config_map_states": config_map_states,
        "extra_elements": extra_elements,
    }
