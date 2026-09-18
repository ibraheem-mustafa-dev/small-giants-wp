"""dc_import_resolver.py — resolve Claude Design `<dc-import>` cross-component
references by splicing the referenced component's own markup in at the import
site, with its declared prop renamed to the caller's bound expression.

Problem (D1106 follow-up, `<dc-import>` design-gate, Bean-approved 2026-09-18):
a Claude Design draft that reuses a card/component across multiple sections
factors the repeated markup out into its own `<name>.dc.html` file and
references it at each use site via
``<dc-import name="X" propA="{{ exprA }}" ...></dc-import>``. Nothing in the
walker has ever handled this shape — it sees an unknown, empty tag — so every
section using it clones with nothing inside it. This is Claude Design's
GENERAL reuse mechanism (any future client draft that factors a repeated card
into its own component hits the identical shape), so this resolves ANY
``<dc-import>``, not a Frame-Card-only carve-out.

Mechanism: SURGICAL STRING-LEVEL patching. First implementation parsed the
WHOLE draft through BeautifulSoup and re-serialised it (``str(soup)``) — that
round-trip silently LOWERCASES the DSL's camelCase pseudo-attributes
(``onClick``->``onclick``, ``onMouseEnter``->``onmouseenter``), reorders
attributes, and collapses whitespace across the ENTIRE document, not just the
spliced sites. Measured live against Eye Care Birmingham: every one of 74
boundaries failed (down from the pre-existing 38/70 baseline) because
downstream case-sensitive matching on those pseudo-attributes broke
project-wide, not just at the 4 real dc-import sites. This version never
calls a BeautifulSoup serialiser on pipeline-bound output — it locates
``<dc-import>`` spans and the referenced component's ``<x-dc>...</x-dc>``
root with regex over the RAW TEXT and substitutes only those spans, so every
byte outside a resolved span is untouched and a draft with zero
``<dc-import>`` tags is a true no-op (returned unchanged, no parse cost).

For each ``<dc-import name="X" propA="{{ exprA }}" ...></dc-import>`` found:
  1. Locate ``X.dc.html`` next to the draft file.
  2. Extract its root markup verbatim: the raw text between its own
     ``<x-dc>`` and ``</x-dc>`` tags (Claude Design's convention: one
     component file = one ``<x-dc>`` wrapping exactly one root element; the
     tag itself never nests, so a first-match non-greedy span is exact).
  3. Read the component's declared prop contract from its own
     ``<script ... data-dc-script data-props="...">`` JSON attribute value
     (HTML-entity-decoded, excluding the ``$preview`` meta key) — the DSL's
     own source of truth for which ``dc-import`` attributes are real prop
     bindings, never a name/hint-prefix heuristic.
  4. Rebind: every ``{{ propName... }}`` mustache expression inside the
     spliced markup has its LEADING identifier renamed to the caller's bound
     expression, via the same string-regex substitution as before (this part
     was never BeautifulSoup-based and is unchanged).
  5. Merge the ``dc-import`` tag's own ``style=`` (sizing at the call site)
     onto the spliced root's OPENING TAG only, call-site LAST — via direct
     string surgery on that one attribute, not a DOM re-serialisation.
  6. Substitute the matched ``<dc-import>...</dc-import>`` span with the
     rebound, style-merged root markup.

Recurses (depth-guarded, cycle-guarded via a visited-name set) so a component
that itself imports another component resolves fully. An import that can't be
resolved (missing file, no ``<x-dc>`` root, no matching ``data-props``) is
left AS-IS (the matched span is returned byte-for-byte) and logged loud
(Rule 4 — never silent-empty): downstream sees exactly today's behaviour for
that one import, not a new regression, and the log line makes the gap visible
instead of silent.

Disclosed limit: only the ``<dc-import ...></dc-import>`` explicit-close form
is handled — the only form observed in real drafts so far. A self-closing
``<dc-import .../>`` would be left unresolved (same loud-non-fatal path) if
it ever appears; named rather than silently mishandled.
"""
from __future__ import annotations

import html as _html_module
import json
import logging
import re
from pathlib import Path
from typing import Any

_LOG = logging.getLogger(__name__)

# `{{ p.hasImg }}` / `{{ p }}` — same mustache-binding convention as
# recogniser/classless_draft_adapter.py's `_BINDING_RE`; kept as a local copy
# rather than a cross-package import because that module is deliberately
# scoped to Stage A/B role derivation, a different concern from this splice.
_BINDING_RE = re.compile(r"\{\{\s*([A-Za-z_$][\w$]*)((?:\.[\w$]+)*)\s*\}\}")

# The explicit-close form only (see "Disclosed limit" above).
_DC_IMPORT_RE = re.compile(r"<dc-import\b([^>]*)>(.*?)</dc-import>", re.IGNORECASE | re.DOTALL)
_ATTR_RE = re.compile(r'([a-zA-Z_:][-\w:.]*)\s*=\s*"([^"]*)"')
_XDC_RE = re.compile(r"<x-dc>(.*?)</x-dc>", re.DOTALL)
_DATA_PROPS_RE = re.compile(
    r'<script[^>]*\bdata-dc-script\b[^>]*\bdata-props\s*=\s*"([^"]*)"',
    re.IGNORECASE | re.DOTALL,
)
_OPEN_TAG_RE = re.compile(r"^<([a-zA-Z][\w-]*)((?:\s+[^<>]*)?)(/?)>", re.DOTALL)
_STYLE_ATTR_RE = re.compile(r'(\sstyle\s*=\s*")([^"]*)(")')

_MAX_DEPTH = 6


def _parse_attrs(attr_str: str) -> dict[str, str]:
    return {m.group(1): _html_module.unescape(m.group(2)) for m in _ATTR_RE.finditer(attr_str)}


def _load_component(name: str, mockup_dir: Path) -> tuple[str, dict[str, Any]] | None:
    """Read `<name>.dc.html` next to the draft. Returns (root_element_html,
    declared_props) as RAW TEXT (never reparsed/reserialised) or None if the
    component can't be resolved."""
    comp_path = mockup_dir / f"{name}.dc.html"
    if not comp_path.exists():
        return None
    text = comp_path.read_text(encoding="utf-8")
    m = _XDC_RE.search(text)
    if not m:
        return None
    root_html = m.group(1).strip()
    if not root_html:
        return None

    declared: dict[str, Any] = {}
    pm = _DATA_PROPS_RE.search(text)
    if pm:
        raw_json = _html_module.unescape(pm.group(1))
        try:
            props = json.loads(raw_json)
        except json.JSONDecodeError:
            props = {}
        if isinstance(props, dict):
            declared = {k: v for k, v in props.items() if not k.startswith("$")}
    return root_html, declared


def _rebind(html_fragment: str, rebind_map: dict[str, str]) -> str:
    if not rebind_map:
        return html_fragment

    def _sub(m: re.Match) -> str:
        head, tail = m.group(1), m.group(2)
        if head in rebind_map:
            return "{{ " + rebind_map[head] + tail + " }}"
        return m.group(0)

    return _BINDING_RE.sub(_sub, html_fragment)


def _merge_style_into_root(root_html: str, call_style: str) -> str:
    """Append `call_style` onto the root element's OWN opening-tag `style=`
    attribute (call-site LAST, cascade-consistent with
    `styling_helpers._parse_decls` + dict.update elsewhere in the converter).
    Pure string surgery on the one matched attribute span — never touches
    anything else in `root_html`."""
    if not call_style:
        return root_html
    m = _OPEN_TAG_RE.match(root_html)
    if not m:
        return root_html
    tag, attrs, selfclose = m.group(1), m.group(2), m.group(3)
    sm = _STYLE_ATTR_RE.search(attrs)
    if sm:
        new_attrs = (
            attrs[: sm.start()]
            + sm.group(1) + sm.group(2) + ";" + call_style + sm.group(3)
            + attrs[sm.end():]
        )
    else:
        new_attrs = attrs + f' style="{call_style}"'
    return f"<{tag}{new_attrs}{selfclose}>" + root_html[m.end():]


def resolve_dc_imports(
    html: str,
    mockup_dir: Path,
    *,
    _depth: int = 0,
    _seen: frozenset[str] = frozenset(),
) -> tuple[str, int]:
    """Resolve every `<dc-import>` in `html`. Returns (resolved_html, count).

    `mockup_dir` is the directory the draft file lives in (component files are
    siblings of the draft, per Claude Design's own export convention). A
    draft with no `<dc-import>` tags returns `(html, 0)` immediately, the
    SAME string object — no parse cost and no risk of altering an ordinary
    draft on the common case.
    """
    if "<dc-import" not in html:
        return html, 0
    if _depth > _MAX_DEPTH:
        _LOG.error("dc-import: resolution depth exceeded %d — possible import "
                    "cycle, stopping further recursion", _MAX_DEPTH)
        return html, 0

    resolved_count = 0

    def _replace(m: re.Match) -> str:
        nonlocal resolved_count
        attrs = _parse_attrs(m.group(1))
        name = attrs.get("name", "").strip()
        if not name:
            _LOG.warning("dc-import: tag with no name= attribute — left unresolved")
            return m.group(0)
        if name in _seen:
            _LOG.error("dc-import: cycle detected importing '%s' — left unresolved", name)
            return m.group(0)

        loaded = _load_component(name, mockup_dir)
        if loaded is None:
            _LOG.warning(
                "dc-import: name='%s' could not be resolved (missing '%s.dc.html' "
                "next to the draft, or no <x-dc> root inside it) — left "
                "unresolved, downstream sees an empty tag same as before",
                name, name,
            )
            return m.group(0)
        root_html, declared_props = loaded

        rebind_map: dict[str, str] = {}
        for prop_key in declared_props:
            bound = attrs.get(prop_key)
            if not bound:
                continue
            bm = re.fullmatch(r"\{\{\s*([A-Za-z_$][\w$.]*)\s*\}\}", bound.strip())
            if bm:
                rebind_map[prop_key] = bm.group(1)
        rebound_html = _rebind(root_html, rebind_map)

        # Recurse into the spliced fragment for nested dc-imports.
        rebound_html, nested_count = resolve_dc_imports(
            rebound_html, mockup_dir, _depth=_depth + 1, _seen=_seen | {name},
        )

        call_style = attrs.get("style", "").strip()
        rebound_html = _merge_style_into_root(rebound_html, call_style)

        resolved_count += 1 + nested_count
        return rebound_html

    resolved_html = _DC_IMPORT_RE.sub(_replace, html)
    return resolved_html, resolved_count
