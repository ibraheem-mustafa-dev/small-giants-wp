"""js_content_resolver.py — resolve `<sc-for>` groups whose repeated content
lives ONLY in a draft's JS `static ARRAY = [...]` class property, never as
static text in the DOM.

Problem (Spec 31 FR-31-26, `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md`
§15, design-gated with Bean 2026-09-19): a Claude Design draft's `<sc-for>`
item template can bind entirely to `{{ t.field }}` mustaches with NO literal
fallback text anywhere — the real content exists only inside a
`static X = [...]` class property elsewhere in the file, resolved at runtime
by the draft's own JS. Every extraction signal this pipeline has (role
derivation, Spec 44 Stage A/B, the text-leaf ladder) operates on DOM text —
such a group hands them nothing.

⚠ `hint-placeholder-count` is a CARDINALITY hint only (how many items the loop
probably renders), not a content signal — a `<sc-for>` can carry a nonzero
`hint-placeholder-count` and still have zero literal text (confirmed live:
Eye Care Birmingham's ticker has `hint-placeholder-count="4"` and its item
template is `<span><svg><path d="{{ t.icon }}"/></svg>{{ t.text }}</span>` —
both fields pure mustache, nothing literal). Eligibility here is decided
purely by whether literal (non-mustache) text/attribute content survives
inside the `<sc-for>` body — never by that attribute.

Mechanism (proven live this session via a disposable probe, not guessed):
render the draft with its OWN JS runtime in a real browser — NOT parse the
JS ourselves. The draft's `support.js` (a `DCLogic`-based renderer) resolves
`<sc-for>`/`{{ }}`/`dc-import` for real when the draft is served over actual
HTTP and loaded with Playwright (`file://` blocks the runtime's own `fetch()`
calls for self-loading and sibling `dc-import` components — confirmed by a
failed first attempt this session). Same pattern Spec 33's
`theme-extractor/measure.js` already uses for CSS (render, read what the
runtime produced, never parse the source), extended here to content.

Correlation is MARKER-based, not document-order (FR-31-26.2): document order
is proven fragile by this very draft (`ticker: mob ? TICKER.concat(TICKER) :
TICKER.slice(...)` — viewport-conditional count/order). A unique
`data-sgs-resolve-id="rN"` is injected onto each eligible `<sc-for>`'s
item-template element in a TEMPORARY served copy (never the pipeline-bound
mockup); the runtime clones that template per item, so every rendered
instance carries the same marker, letting us query by identity rather than
position.

Splice-back is SURGICAL STRING-LEVEL patching, exactly mirroring
`dc_import_resolver.py`'s own discipline (and its own hard-learned lesson —
D1107's first implementation round-tripped the whole document through
BeautifulSoup and silently corrupted camelCase pseudo-attributes across the
ENTIRE document, not just the spliced sites). This module never parses the
pipeline-bound mockup through BeautifulSoup either — every byte outside a
resolved `<sc-for>` body is untouched.

Regression-safety (FR-31-26.3), three independent stacking guarantees:
  1. Scope-narrowed by construction — only a `<sc-for>` with genuinely NO
     literal content is ever touched; one that already has content is
     skipped entirely, byte-identical.
  2. Opt-in — ships behind `--resolve-js-content`, off by default (wired in
     `sgs-clone-orchestrator.py`), mirroring `--classless-match`'s own
     rollout discipline.
  3. Fail-soft — ANY failure (server won't start, Playwright unavailable,
     timeout, an unresolvable array) returns the ORIGINAL html unchanged,
     never raises, never a new failure mode — mirrors
     `dc_import_resolver.py`'s own "unresolvable import left as-is,
     non-fatal" behaviour.
"""
from __future__ import annotations

import json
import logging
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any

_LOG = logging.getLogger(__name__)

# Same explicit-close-only, non-greedy span convention as
# `dc_import_resolver.py::_DC_IMPORT_RE` — `<sc-for>` never self-closes in
# real drafts (it always wraps an item template), so this form is exact.
_SC_FOR_RE = re.compile(r"<sc-for\b([^>]*)>(.*?)</sc-for>", re.IGNORECASE | re.DOTALL)
_ATTR_RE = re.compile(r'([a-zA-Z_:][-\w:.]*)\s*=\s*"([^"]*)"')
_MUSTACHE_RE = re.compile(r"\{\{[^}]*\}\}")
# `{{ t.field }}` — the SAME binding convention as
# `classless_draft_adapter.py::_BINDING_RE` / `dc_import_resolver.py`'s local
# copy; kept local for the same reason those two are (different concern, no
# cross-package coupling).
_BINDING_RE = re.compile(r"\{\{\s*([A-Za-z_$][\w$]*)((?:\.[\w$]+)*)\s*\}\}")
_ICON_FIELD_NAMES = frozenset({"icon", "iconpath", "path", "svg", "svgpath"})
# The item template's own opening tag — the FIRST element immediately inside
# `<sc-for>...</sc-for>` (its direct child; the runtime clones exactly this
# element once per array item).
_FIRST_CHILD_OPEN_TAG_RE = re.compile(r"^\s*<([a-zA-Z][\w-]*)((?:\s+[^<>]*)?)(/?)>", re.DOTALL)

_RESOLVE_SCRIPT = Path(__file__).with_name("resolve-js-content.js")
_RENDER_TIMEOUT_SECONDS = 30


def _parse_attrs(attr_str: str) -> dict[str, str]:
    return {name: value for name, value in _ATTR_RE.findall(attr_str)}


def _has_literal_content(sc_for_body: str) -> bool:
    """True when real (non-mustache) TEXT survives inside the item body.

    Deliberately TEXT-only, matching `extraction.py::_emit_content_leaf`'s
    own "has content" gate (`node.get_text(strip=True)`) rather than any
    attribute value — a first version also checked attribute values and
    wrongly classified the ticker as "has content" because of ordinary
    structural SVG attributes (`width="15"`, `stroke="..."`, `viewBox="..."`)
    that carry no real content at all (caught live: `_has_literal_content`
    returned `True` for a `<span><svg width="15" .../>{{ t.text }}</span>`
    item with ZERO real text). Strips every `{{ ... }}` mustache, then every
    tag, then checks whether non-whitespace TEXT remains. A `<img>`/`<path>`
    tag whose `src`/`d` is itself entirely mustache-bound never counts as
    content by this check — correct, since there is nothing literal to
    extract from it either.
    """
    stripped_mustaches = _MUSTACHE_RE.sub("", sc_for_body)
    text_only = re.sub(r"<[^>]*>", " ", stripped_mustaches)
    return bool(text_only.strip())


def _simple_shape_fields(body: str, as_name: str) -> tuple[bool, str | None, str | None]:
    """`(is_simple, text_field, icon_field)` for the item template's loop var.

    `is_simple` is True when at most ONE distinct non-icon field is
    referenced — the shape this module's splice mechanism (Step 4: one
    resolved `text` + optional `iconPath` per item) can honestly
    reconstruct. `text_field`/`icon_field` are the LITERAL field names used
    in the template (e.g. `name` for `{{ b.name }}`, `icon` for
    `{{ t.icon }}`) — `_splice_resolved_items` needs these to map the render
    script's generic `{text, iconPath}` keys back onto the RIGHT `{{ }}`
    binding, since different arrays name their text field differently
    (`t.text`, `b.name`, `s.label`, ...) — a raw-key-match splice against a
    generic render payload silently produces empty content for anything
    named other than literally `text` (caught live by this module's own
    test suite: `{{ b.name }}` spliced to `""` because the payload's key was
    `text`, not `name`).

    A multi-field item (a product card's `{{ p.name }}` + `{{ p.price }}` +
    `{{ p.rating }}`, each a DIFFERENT field) cannot be spliced correctly by
    this mechanism at all — live-tested: reading `.textContent` of the whole
    resolved element concatenates every field into one blob with no way to
    tell which words belong to which `{{ }}` binding, so naively splicing it
    would replace every distinct mustache with the SAME garbled blob. Rather
    than ship that, a multi-field group is excluded from `find_unresolved_
    sc_fors()`'s candidates entirely — untouched, exactly today's behaviour,
    a disclosed limit (Spec 31 FR-31-26.3 #1's scope-narrowing extended to
    field-shape, not just presence-of-content). Field-level correlation for
    multi-field arrays is Spec 45 Tier 1's domain, not this module's.

    ⚠ A BARE self-reference (`{{ p }}`, no dotted field at all) is NEVER
    treated as simple, on purpose — live-tested against the real draft's
    `featured` products array: its item template is a bare `{{ p }}`, which
    looked field-count-simple, but the resolved element turns out to be a
    WHOLE nested product-card composition (image/brand/price/rating all
    concatenated into one `.textContent` blob), not literal text. A bare
    self-reference gives no signal either way, so it is excluded rather than
    guessed at — the same "ship nothing over ship garbled" discipline as the
    multi-field case above.
    """
    if not as_name:
        return True, None, None
    text_fields: set[str] = set()
    icon_field: str | None = None
    bare_self_ref = False
    for base, tail in _BINDING_RE.findall(body):
        if base != as_name:
            continue
        field = tail.lstrip(".").lower()
        if not field:
            bare_self_ref = True  # `{{ t }}` itself, no sub-field
        elif field in _ICON_FIELD_NAMES:
            icon_field = tail.lstrip(".")  # keep original casing for the splice
        else:
            text_fields.add(tail.lstrip("."))
    if bare_self_ref:
        return False, None, None
    if len(text_fields) > 1:
        return False, None, None
    text_field = next(iter(text_fields), None)
    return True, text_field, icon_field


def find_unresolved_sc_fors(html: str) -> list[dict[str, Any]]:
    """Every `<sc-for>` in `html` with genuinely NO literal content AND a
    simple (single-field, `_is_simple_shape`) item template.

    Returns one dict per candidate: `{full_match, span, list_expr, as_name,
    body, first_child_tag, first_child_attrs_str, first_child_open_end}` —
    `span` is the `(start, end)` offset of the WHOLE `<sc-for>...</sc-for>`
    match in `html` (for Step 4's splice); `first_child_open_end` is the
    offset (relative to the match start) immediately before the item
    template's opening tag's closing `>`, i.e. where a new attribute can be
    inserted without disturbing anything else.
    """
    candidates: list[dict[str, Any]] = []
    for m in _SC_FOR_RE.finditer(html):
        attrs_str, body = m.group(1), m.group(2)
        if _has_literal_content(body):
            continue
        attrs = _parse_attrs(attrs_str)
        as_name = attrs.get("as", "")
        is_simple, text_field, icon_field = _simple_shape_fields(body, as_name)
        if not is_simple:
            continue
        child_m = _FIRST_CHILD_OPEN_TAG_RE.match(body)
        if child_m is None:
            # No element child to mark (e.g. a bare `{{ t }}` text-only item)
            # — nothing to attach a marker to; skip rather than guess.
            continue
        self_closing = bool(child_m.group(3))
        open_end = child_m.end() - (2 if self_closing else 1)  # before `/>` or `>`
        candidates.append({
            "full_match": m.group(0),
            "span": (m.start(), m.end()),
            "list_expr": attrs.get("list", ""),
            "as_name": as_name,
            "text_field": text_field,
            "icon_field": icon_field,
            "body": body,
            "first_child_tag": child_m.group(1),
            "first_child_open_end_in_body": open_end,
        })
    return candidates


def inject_resolve_markers(
    html: str, candidates: list[dict[str, Any]]
) -> tuple[str, dict[str, dict[str, Any]]]:
    """Insert a unique `data-sgs-resolve-id="rN"` onto each candidate's
    item-template element, in a COPY of `html` (never mutates the input).

    Returns `(marked_html, {marker_id: candidate})`. IDs are assigned from a
    single incrementing counter across the whole candidate list — never
    per-`<sc-for>`-local — so uniqueness holds by construction, never by
    convention (a colliding ID would misattribute resolved content on
    splice-back, exactly what FR-31-26.2 exists to prevent).

    Empty `candidates` returns `(html, {})` — the exact same string, no
    marker map, matching FR-31-26.3 #1's "byte-identical when nothing is
    eligible" guarantee.
    """
    if not candidates:
        return html, {}
    marker_map: dict[str, dict[str, Any]] = {}
    # Insert from the LAST match backward so earlier offsets stay valid as
    # we splice (each insertion only shifts everything AFTER it).
    ordered = sorted(
        enumerate(candidates), key=lambda pair: pair[1]["span"][0], reverse=True
    )
    marked = html
    for idx, cand in ordered:
        marker_id = f"r{idx + 1}"
        marker_map[marker_id] = cand
        sc_for_start, _sc_for_end = cand["span"]
        # The body's offset within the whole document = the `<sc-for>` match
        # start + the body's offset within the matched text (`full_match`);
        # the item-template open-tag-end offset is relative to the body.
        body_start_in_doc = sc_for_start + cand["full_match"].index(cand["body"])
        insert_at = body_start_in_doc + cand["first_child_open_end_in_body"]
        marked = marked[:insert_at] + f' data-sgs-resolve-id="{marker_id}"' + marked[insert_at:]
    return marked, marker_map


def _splice_resolved_items(
    html: str, marker_map: dict[str, dict[str, Any]], resolved: dict[str, list[dict[str, Any]]]
) -> tuple[str, int]:
    """Replace each resolved candidate's `<sc-for>...</sc-for>` body with
    literal markup for each resolved item, built by repeating the item
    template once per item with its `{{ t.field }}` mustaches replaced by
    the resolved field values — pure string substitution, the `<sc-for>`
    wrapper itself is REMOVED (the runtime already consumed it; downstream
    extraction reads plain repeated siblings, matching what a real render
    would leave behind for a BEM-classed equivalent).

    `resolved`'s items use GENERIC keys (`text`/`iconPath`), not the
    template's own literal field name — the render script has no way to know
    a draft calls its text field `name` vs `text` vs `label`. The mapping
    from the candidate's own `text_field`/`icon_field` (captured at
    eligibility time by `_simple_shape_fields`) back onto those generic keys
    is what makes the splice correct for any field-naming convention, not
    just a template that happens to use `{{ t.text }}` literally (caught by
    this module's own test suite: a bare key-match splice silently emptied
    `{{ b.name }}` because the payload's key was `text`, not `name`).

    Splices from the LAST span backward so earlier offsets stay valid.
    Returns `(new_html, resolved_count)`.
    """
    resolved_count = 0
    spliced = html
    by_start = sorted(marker_map.items(), key=lambda kv: kv[1]["span"][0], reverse=True)
    for marker_id, cand in by_start:
        items = resolved.get(marker_id)
        if not items:
            continue  # not resolved (failure or genuinely empty) — leave untouched
        if any("{{" in str(value) for item in items for value in item.values()):
            # The runtime never ran (e.g. `mockup_dir` lacks support.js), so the
            # "resolved" element is the raw template and its text still holds
            # the `{{ ... }}` binding. Splicing that in would ship placeholders as
            # content — treat the group as unresolved instead (FR-31-26.3 #3).
            _LOG.warning(
                "js_content_resolver: group %s resolved to unrendered template text; "
                "leaving it untouched", marker_id,
            )
            continue
        as_name = cand["as_name"] or "t"
        text_field = cand.get("text_field")
        icon_field = cand.get("icon_field")
        pieces: list[str] = []
        for item in items:
            item_html = cand["body"]

            def _replace(match: "re.Match[str]", _item=item, _as=as_name) -> str:
                expr = match.group(0)[2:-2].strip()
                if expr == _as or (text_field and expr == f"{_as}.{text_field}"):
                    return str(_item.get("text", ""))
                if icon_field and expr == f"{_as}.{icon_field}":
                    return str(_item.get("iconPath", ""))
                return ""  # a binding outside this item's own scope — drop, never guess

            item_html = _MUSTACHE_RE.sub(_replace, item_html)
            pieces.append(item_html)
        sc_for_start, sc_for_end = cand["span"]
        spliced = spliced[:sc_for_start] + "".join(pieces) + spliced[sc_for_end:]
        resolved_count += 1
    return spliced, resolved_count


def resolve_js_array_content(html: str, mockup_dir: Path) -> tuple[str, int]:
    """Top-level entry point — mirrors
    `dc_import_resolver.py::resolve_dc_imports()`'s `(html, count)` shape.

    Fail-soft at every stage (FR-31-26.3 #3): any error returns `(html, 0)`
    unchanged, never raises. A `html` with zero eligible `<sc-for>`s returns
    immediately with no subprocess spawned at all (FR-31-26.3 #1's
    zero-cost-on-an-already-fine-draft guarantee).
    """
    candidates = find_unresolved_sc_fors(html)
    if not candidates:
        return html, 0

    marked_html, marker_map = inject_resolve_markers(html, candidates)

    tmp_dir = None
    try:
        tmp_dir = tempfile.TemporaryDirectory(prefix="sgs-js-resolve-")
        tmp_path = Path(tmp_dir.name)
        marked_file = tmp_path / "marked.dc.html"
        marked_file.write_text(marked_html, encoding="utf-8")
        # Sibling assets (support.js, image-slot.js, other .dc.html components)
        # must be reachable at the SAME relative paths the runtime expects —
        # copy the whole mockup directory's siblings alongside the marked file.
        for sibling in mockup_dir.iterdir():
            if sibling.is_file() and sibling.name != Path().name:
                dest = tmp_path / sibling.name
                if not dest.exists():
                    dest.write_bytes(sibling.read_bytes())

        proc = subprocess.run(
            ["node", str(_RESOLVE_SCRIPT), "--draft", str(marked_file)],
            capture_output=True, text=True, timeout=_RENDER_TIMEOUT_SECONDS,
        )
        if proc.returncode != 0:
            _LOG.warning(
                "js_content_resolver: render script exited %s; leaving draft unchanged (%s)",
                proc.returncode, proc.stderr[:500],
            )
            return html, 0
        payload = json.loads(proc.stdout)
        if isinstance(payload, dict) and "error" in payload:
            _LOG.warning(
                "js_content_resolver: render failed (%s); leaving draft unchanged", payload["error"]
            )
            return html, 0
    except Exception as exc:  # noqa: BLE001 — fail-soft is the whole point here
        _LOG.warning("js_content_resolver: soft-failed (%s); leaving draft unchanged", exc)
        return html, 0
    finally:
        if tmp_dir is not None:
            tmp_dir.cleanup()

    return _splice_resolved_items(html, marker_map, payload)
