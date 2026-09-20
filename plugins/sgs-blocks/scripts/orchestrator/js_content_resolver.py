"""js_content_resolver.py — expand `<sc-for>` loops whose repeated content lives ONLY in a draft's
JS `static ARRAY = [...]` class property, never as static text in the DOM.

Problem (Spec 31 FR-31-26, `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` §15, design-gated with Bean
2026-09-19; extended to multi-field items by plan step A2b, D1134): a Claude Design draft's `<sc-for>`
item template binds to `{{ r.title }}` / `{{ r.body }}` mustaches, and the real content exists only inside a
`static X = [...]` class property, resolved at runtime by the draft's own JS. Every extraction signal this
pipeline has operates on DOM text, so such a loop hands them nothing.

Mechanism (proven live, not guessed): render the draft with its OWN JS runtime in a real browser — NOT parse
the JS ourselves. The draft's `support.js` resolves `<sc-for>` / `{{ }}` / `dc-import` for real when the draft
is served over actual HTTP and loaded with Playwright (`file://` blocks the runtime's own `fetch()` calls).
Same pattern as Spec 33's `theme-extractor/measure.js`.

Capture is PER FIELD, keyed by marker, never by document order (FR-31-26.2). In a TEMPORARY served copy every
`{{ }}` in the item body that mentions the loop variable gets a carrier: a text-position mustache is wrapped
in `<span data-sgs-f="fK">`, an attribute-position mustache gets a sibling `data-sgs-a-fK="{{ ... }}"`
attribute, and the item's first element gets `data-sgs-resolve-id="rN"`. The runtime clones that element once
per array row, so reading `fK` from each clone gives every field of every row. A mustache that does not
mention the loop variable (`{{ secPad }}`, a width-driven style value) is never touched: the script-bindings
stage (A1) resolves those per device, and baking a desktop value here would undo that.

Splice-back is SURGICAL STRING-LEVEL patching, exactly mirroring `dc_import_resolver.py`'s discipline: the
`<sc-for>` is replaced by N copies of its ORIGINAL body with each captured mustache replaced by its
HTML-escaped value. This module never parses the pipeline-bound mockup through BeautifulSoup.

Never silent: a mustache that could not be captured (a branch that did not render, a handler, a computed value
that is a function) stays as it was and is listed in the report with its loop, item number and expression. A
loop that renders zero rows at load (empty bag, nothing selected), starts with a conditional, or contains a
nested loop is skipped with its reason.

Regression safety (FR-31-26.3): (1) a draft with no `<sc-for>` returns the same string with no subprocess
spawned; (2) fail-soft: ANY failure (server, Playwright, timeout, an unrendered runtime) returns the ORIGINAL
html unchanged and never raises. The pipeline runs it by default; `--no-resolve-js-content` opts out.
"""
from __future__ import annotations

import html as _html
import json
import logging
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any

_LOG = logging.getLogger(__name__)

# Same explicit-close-only, non-greedy span convention as `dc_import_resolver.py::_DC_IMPORT_RE`.
_SC_FOR_RE = re.compile(r"<sc-for\b([^>]*)>(.*?)</sc-for>", re.IGNORECASE | re.DOTALL)
_ATTR_RE = re.compile(r'([a-zA-Z_:][-\w:.]*)\s*=\s*"([^"]*)"')
_MUSTACHE_RE = re.compile(r"\{\{[^}]*\}\}")
_SC_IF_RE = re.compile(r"<sc-if\b[^>]*>(.*?)</sc-if>", re.IGNORECASE | re.DOTALL)
# A start tag with quoted attribute values (a `>` inside quotes does not end it).
_TAG_RE = re.compile(r"""<([a-zA-Z][\w-]*)((?:[^<>"']|"[^"]*"|'[^']*')*)>""")
_TAG_ATTR_RE = re.compile(r"""([a-zA-Z_:@][-\w:.@]*)\s*=\s*(?:"([^"]*)"|'([^']*)')""")
# The item template's own opening tag: the FIRST element inside `<sc-for>...</sc-for>`.
_FIRST_CHILD_RE = re.compile(r"^\s*<([a-zA-Z][\w-]*)", re.DOTALL)
_UNUSABLE_VALUE_RE = re.compile(r"^\s*(?:function\b|\(?[\w$,\s]*\)?\s*=>)|\[object ")
_NEVER_CAPTURED_ATTRS = frozenset({"ref", "key"})

_RESOLVE_SCRIPT = Path(__file__).with_name("resolve-js-content.js")
_RENDER_TIMEOUT_SECONDS = 90


def _parse_attrs(attr_str: str) -> dict[str, str]:
    return {name: value for name, value in _ATTR_RE.findall(attr_str)}


def _mentions(expr: str, var: str) -> bool:
    return bool(re.search(r"(?<![\w$.])" + re.escape(var) + r"(?![\w$])", expr))


def _is_directive(tag: str) -> bool:
    """`sc-if`, `sc-for`, `dc-import` ...: the draft runtime consumes these, so a carrier on one is lost."""
    return tag.lower().startswith(("sc-", "dc-"))


def item_slots(body: str, var: str) -> list[dict[str, Any]]:
    """Every `{{ ... }}` in `body` that mentions the loop variable, in document order.

    ``{"id": "fK", "kind": "text"|"attr", "start", "end", "mustache", "tag_insert"}`` where ``start``/``end``
    are offsets in ``body`` and ``tag_insert`` (attr only) is the offset just after the tag name, where a
    carrier attribute can be added without disturbing anything else.
    """
    slots: list[dict[str, Any]] = []

    def add(kind: str, start: int, end: int, tag_insert: int | None = None) -> None:
        text = body[start:end]
        inner = text[2:-2].strip()
        # A bare `{{ p }}` is the whole row (in a product loop, a nested card): no single value to capture.
        if inner != var and _mentions(inner, var):
            slots.append({"id": "f%d" % len(slots), "kind": kind, "start": start, "end": end,
                          "mustache": text, "tag_insert": tag_insert})

    pos = 0
    for tag in _TAG_RE.finditer(body):
        for m in _MUSTACHE_RE.finditer(body, pos, tag.start()):
            add("text", m.start(), m.end())
        if not _is_directive(tag.group(1)):
            attrs_at = tag.start(2)
            for a in _TAG_ATTR_RE.finditer(tag.group(2)):
                if a.group(1).lower().startswith("on") or a.group(1).lower() in _NEVER_CAPTURED_ATTRS:
                    continue
                value_at = attrs_at + a.start(2) if a.group(2) is not None else attrs_at + a.start(3)
                for m in _MUSTACHE_RE.finditer(a.group(2) if a.group(2) is not None else a.group(3)):
                    add("attr", value_at + m.start(), value_at + m.end(), tag.end(1))
        pos = tag.end()
    for m in _MUSTACHE_RE.finditer(body, pos):
        add("text", m.start(), m.end())
    return slots


def find_expandable_sc_fors(html: str) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    """``(candidates, skipped)``: every `<sc-for>` this module can expand, and each one it cannot with why.

    A candidate has a loop variable, at least one capturable mustache, an ordinary HTML element as its first
    child (the runtime clones exactly that element per row) and no nested `<sc-for>`. ``span`` is the
    `(start, end)` of the whole `<sc-for>...</sc-for>` in `html`.
    """
    candidates: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []
    for m in _SC_FOR_RE.finditer(html):
        attrs = _parse_attrs(m.group(1))
        loop = attrs.get("list", "")
        body = m.group(2)
        var = attrs.get("as", "")

        def skip(reason: str, _loop: str = loop) -> None:
            skipped.append({"loop": _loop, "reason": reason})

        if not var:
            skip("no loop variable (`as`)")
            continue
        if re.search(r"<sc-for\b", body, re.IGNORECASE):
            skip("contains a nested loop")
            continue
        first = _FIRST_CHILD_RE.match(body)
        if first is None or _is_directive(first.group(1)):
            skip("item template does not start with an ordinary element (a conditional or bare text)")
            continue
        slots = item_slots(body, var)
        if not slots:
            continue                                  # nothing bound to the loop variable: nothing to resolve
        candidates.append({
            "span": (m.start(), m.end()), "list_expr": loop, "as_name": var, "body": body,
            "slots": slots, "first_child_insert": first.end(1), "branches": if_branches(body),
        })
    return candidates, skipped


def _carrier(slot: dict[str, Any]) -> str | None:
    mustache = slot["mustache"]
    quote = '"' if '"' not in mustache else ("'" if "'" not in mustache else None)
    return None if quote is None else " data-sgs-a-%s=%s%s%s" % (slot["id"], quote, mustache, quote)


def _apply(body: str, edits: list[tuple[int, int, str, int]]) -> str:
    """Apply ``(start, end, replacement, order)`` edits from the last offset back so earlier offsets stay valid."""
    for start, end, text, _order in sorted(edits, key=lambda e: (e[0], e[3]), reverse=True):
        body = body[:start] + text + body[end:]
    return body


def inject_capture_markers(html: str, candidates: list[dict[str, Any]]) -> tuple[str, dict[str, dict[str, Any]]]:
    """Mark a COPY of `html` for capture. Returns `(marked_html, {marker id: candidate})`; never mutates `html`."""
    if not candidates:
        return html, {}
    marker_map: dict[str, dict[str, Any]] = {}
    marked = html
    for idx, cand in sorted(enumerate(candidates), key=lambda p: p[1]["span"][0], reverse=True):
        marker_id = "r%d" % (idx + 1)
        marker_map[marker_id] = cand
        edits: list[tuple[int, int, str, int]] = [
            (cand["first_child_insert"], cand["first_child_insert"], ' data-sgs-resolve-id="%s"' % marker_id, 0)]
        for order, slot in enumerate(cand["slots"], start=1):
            if slot["kind"] == "text":
                edits.append((slot["start"], slot["end"],
                              '<span data-sgs-f="%s">%s</span>' % (slot["id"], slot["mustache"]), order))
            else:
                carrier = _carrier(slot)
                if carrier is not None:
                    edits.append((slot["tag_insert"], slot["tag_insert"], carrier, order))
        for b in cand["branches"]:
            edits.append((b["open_end"], b["open_end"], '<span data-sgs-b="%s" hidden></span>' % b["id"], 0))
        new_body = _apply(cand["body"], edits)
        start, end = cand["span"]
        whole = marked[start:end]
        marked = marked[:start] + whole.replace(cand["body"], new_body, 1) + marked[end:]
    return marked, marker_map


def _usable(value: Any) -> bool:
    return isinstance(value, str) and "{{" not in value and "}}" not in value and not _UNUSABLE_VALUE_RE.search(value)


def if_branches(body: str) -> list[dict[str, Any]]:
    """Each `<sc-if>...</sc-if>` in `body`: ``{id, start, end, open_end}``; ``open_end`` is the offset just after
    the opening tag, where a presence marker goes.

    A branch containing another `<sc-if>` is skipped (the non-greedy close would mis-pair it)."""
    out: list[dict[str, Any]] = []
    for m in _SC_IF_RE.finditer(body):
        if re.search(r"<sc-if\b", m.group(1), re.IGNORECASE):
            continue
        out.append({"id": "b%d" % len(out), "start": m.start(), "end": m.end(), "open_end": m.start(1)})
    return out


def _not_rendered(branch: dict[str, Any], fields: dict[str, Any]) -> bool:
    """True when the runtime did NOT render this branch for this row: its presence marker (a hidden span the
    temporary copy carries inside every branch) is missing from the row's clone. Exact: it does not depend on
    what the branch contains, so a branch of attributes only or of static text is decided the same way."""
    return branch["id"] not in fields


def _expand(cand: dict[str, Any], items: list[dict[str, Any]], report: dict[str, Any]) -> str:
    pieces: list[str] = []
    captured = 0
    pruned = 0
    for number, item in enumerate(items, start=1):
        fields = item.get("fields") or {}
        edits: list[tuple[int, int, str, int]] = []
        dead = [b for b in cand.get("branches", []) if _not_rendered(b, fields)]
        for b in dead:
            edits.append((b["start"], b["end"], "", -1))
            pruned += 1
        for order, slot in enumerate(cand["slots"]):
            if any(b["start"] <= slot["start"] and slot["end"] <= b["end"] for b in dead):
                continue                                   # inside a branch the runtime did not render: gone with it
            value = fields.get(slot["id"])
            if _usable(value):
                edits.append((slot["start"], slot["end"],
                              _html.escape(value, quote=(slot["kind"] == "attr")), order))
                captured += 1
            else:
                report["gaps"].append({
                    "loop": cand["list_expr"], "item": number, "expr": slot["mustache"],
                    "reason": "the draft's runtime produced no plain value for it (a handler, a computed value or an unrendered branch)"})
        pieces.append(_apply(cand["body"], edits))
    report["resolved"].append({"loop": cand["list_expr"], "items": len(items),
                               "fields_captured": captured, "fields_per_item": len(cand["slots"]),
                               "branches_pruned": pruned})
    return "".join(pieces)


def splice_expanded_items(html: str, marker_map: dict[str, dict[str, Any]],
                          captured: dict[str, list[dict[str, Any]]]) -> tuple[str, int, dict[str, Any]]:
    """Replace each rendered loop's `<sc-for>` with its expanded items. Returns `(html, loops, report)`."""
    report: dict[str, Any] = {"resolved": [], "gaps": [], "skipped": []}
    count = 0
    for _marker, cand in sorted(marker_map.items(), key=lambda kv: kv[1]["span"][0], reverse=True):
        items = captured.get(_marker) or []
        if not items:
            report["skipped"].append({"loop": cand["list_expr"], "reason": "rendered 0 items at load (state-driven or hidden)"})
            continue
        if any(not _usable(v) and isinstance(v, str) and ("{{" in v or "}}" in v)
               for item in items for v in (item.get("fields") or {}).values()):
            _LOG.warning("js_content_resolver: loop %s came back as unrendered template text; leaving it untouched", cand["list_expr"])
            report["skipped"].append({"loop": cand["list_expr"], "reason": "the draft's runtime did not render it"})
            continue
        start, end = cand["span"]
        html = html[:start] + _expand(cand, items, report) + html[end:]
        count += 1
    return html, count, report


def resolve_js_array_content_with_report(html: str, mockup_dir: Path) -> tuple[str, int, dict[str, Any]]:
    """Top-level entry point: `(html, loops expanded, report)`. Fail-soft at every stage; never raises.

    A `html` with no expandable `<sc-for>` returns at once with no subprocess spawned.
    """
    candidates, skipped = find_expandable_sc_fors(html)
    report: dict[str, Any] = {"resolved": [], "gaps": [], "skipped": list(skipped)}
    if not candidates:
        return html, 0, report

    marked_html, marker_map = inject_capture_markers(html, candidates)
    tmp_dir = None
    try:
        tmp_dir = tempfile.TemporaryDirectory(prefix="sgs-js-resolve-")
        tmp_path = Path(tmp_dir.name)
        marked_file = tmp_path / "marked.dc.html"
        marked_file.write_text(marked_html, encoding="utf-8")
        # Sibling assets (support.js, image-slot.js, other .dc.html components) must be reachable at the SAME
        # relative paths the runtime expects.
        for sibling in mockup_dir.iterdir():
            if sibling.is_file():
                dest = tmp_path / sibling.name
                if not dest.exists():
                    dest.write_bytes(sibling.read_bytes())

        proc = subprocess.run(["node", str(_RESOLVE_SCRIPT), "--draft", str(marked_file)],
                              capture_output=True, text=True, encoding="utf-8", timeout=_RENDER_TIMEOUT_SECONDS)
        if proc.returncode != 0:
            _LOG.warning("js_content_resolver: render script exited %s; leaving draft unchanged (%s)",
                         proc.returncode, proc.stderr[:500])
            return html, 0, report
        payload = json.loads(proc.stdout)
        if isinstance(payload, dict) and "error" in payload:
            _LOG.warning("js_content_resolver: render failed (%s); leaving draft unchanged", payload["error"])
            return html, 0, report
    except Exception as exc:  # noqa: BLE001 — fail-soft is the whole point here
        _LOG.warning("js_content_resolver: soft-failed (%s); leaving draft unchanged", exc)
        return html, 0, report
    finally:
        if tmp_dir is not None:
            tmp_dir.cleanup()

    new_html, count, spliced = splice_expanded_items(html, marker_map, payload)
    spliced["skipped"] = report["skipped"] + spliced["skipped"]
    return new_html, count, spliced


def resolve_js_array_content(html: str, mockup_dir: Path) -> tuple[str, int]:
    """`(html, loops expanded)`: `resolve_js_array_content_with_report` without the report."""
    new_html, count, _report = resolve_js_array_content_with_report(html, mockup_dir)
    return new_html, count
