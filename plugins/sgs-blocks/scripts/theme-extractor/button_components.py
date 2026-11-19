"""button_components.py — a draft's button component and the presets it names (Spec 48A FR-48A-17).

A Spec 48A export builds each repeated button once, as a component file (``Button.dc.html``) whose presets are the
named options of an enum prop ``version`` in its ``data-props`` (``size`` too, where the design has sizes), and
mounts it wherever it is used (``<dc-import name="Button" version="primary" size="lg" …>``). This module reads those
files and lists one probe per named version for measure.js (``--components``), which mounts each version on a page of
its own and reads its whole look. Which size and which form (link or button) a version is measured in follows its
mounts: the size most of them use (a tie goes to the component's default size, then to the first option), and a link
when most of them carry an ``href``.

A component counts only when its own template draws a link or a button, so a form field with versions is not a
button component; measure.js still confirms the drawn element paints as a button (``painted``).
"""
from __future__ import annotations

import html as html_mod
import json
import pathlib
import re
from collections import Counter

DRAFT_GLOB = "*.dc.html"
SUFFIX = ".dc.html"
# The words a probe mounts with: two words, so the reading is of a labelled button and never of an icon-only one.
PROBE_LABEL = "Sample button"

_PROPS_RE = re.compile(r"<script\b[^>]*\bdata-props=\"([^\"]*)\"", re.I)
_MOUNT_RE = re.compile(r"<dc-import\b([^>]*)>", re.I)
_ATTR_RE = re.compile(r"([:\w-]+)\s*=\s*(\"[^\"]*\"|'[^']*')")
_HELMET_RE = re.compile(r"<helmet>(.*?)</helmet>", re.I | re.S)
_LINK_RE = re.compile(r"<link\b[^>]*>", re.I)
_DRAWS_BUTTON_RE = re.compile(r"<(a|button)\b", re.I)
_TEMPLATE_RE = re.compile(r"<x-dc>(.*?)</x-dc>", re.I | re.S)


def _attrs(text: str) -> dict:
    return {m.group(1): html_mod.unescape(m.group(2)[1:-1]) for m in _ATTR_RE.finditer(text)}


def _enum(props: dict, name: str) -> tuple[list, str | None]:
    """(options, default) of an enum prop, or ([], None) when ``name`` is not one."""
    spec = props.get(name)
    if not isinstance(spec, dict) or spec.get("editor") != "enum" or not isinstance(spec.get("options"), list):
        return [], None
    options = [str(o) for o in spec["options"]]
    default = spec.get("default")
    return options, (str(default) if default is not None else None)


def _stylesheets(text: str) -> list:
    """The stylesheet hrefs the component loads in its own <helmet> (its token files)."""
    m = _HELMET_RE.search(text)
    out = []
    for tag in _LINK_RE.findall(m.group(1) if m else ""):
        a = _attrs(tag)
        if "stylesheet" in a.get("rel", "").lower() and a.get("href"):
            out.append(a["href"])
    return out


def find_components(draft_dir) -> dict:
    """Every button component in the folder: name -> {versions, version_default, sizes, size_default, links}."""
    out = {}
    for path in sorted(pathlib.Path(draft_dir).glob(DRAFT_GLOB)):
        text = path.read_text(encoding="utf-8", errors="replace")
        m = _PROPS_RE.search(text)
        if not m:
            continue
        try:
            props = json.loads(html_mod.unescape(m.group(1)))
        except ValueError:
            continue
        versions, version_default = _enum(props if isinstance(props, dict) else {}, "version")
        m_tpl = _TEMPLATE_RE.search(text)
        template = m_tpl.group(1) if m_tpl else ""
        if not versions or not _DRAWS_BUTTON_RE.search(template):
            continue
        sizes, size_default = _enum(props, "size")
        out[path.name[: -len(SUFFIX)]] = {"versions": versions, "version_default": version_default,
                                          "sizes": sizes, "size_default": size_default,
                                          "links": _stylesheets(text)}
    return out


def find_mounts(draft_dir, names) -> list:
    """Every ``<dc-import>`` of a named component across the folder's drafts: {component, file, attrs}."""
    out = []
    for path in sorted(pathlib.Path(draft_dir).glob(DRAFT_GLOB)):
        text = path.read_text(encoding="utf-8", errors="replace")
        for m in _MOUNT_RE.finditer(text):
            a = _attrs(m.group(1))
            if a.get("name") in names:
                out.append({"component": a["name"], "file": path.name, "attrs": a})
    return out


def _majority(counter: Counter, preferred: list) -> str | None:
    """The most common value; a tie goes to the first of ``preferred`` among the tied."""
    if not counter:
        return None
    top = max(counter.values())
    tied = [v for v, n in counter.items() if n == top]
    for value in preferred:
        if value in tied:
            return value
    return sorted(tied)[0]


def probes(draft_dir) -> list:
    """One probe per named version of every button component (measure.js ``--components``).

    Each probe is ``{component, attrs, links, meta}``: ``attrs`` the mount's attributes (``version``, ``size`` when the
    component has sizes, ``label``, ``href`` for the link form), ``links`` the component's stylesheets, and ``meta``
    the facts the Python layer reports (version, size, form, mounts, the size census)."""
    comps = find_components(draft_dir)
    if not comps:
        return []
    mounts = find_mounts(draft_dir, set(comps))
    out = []
    for name, comp in comps.items():
        for version in comp["versions"]:
            mine = [m for m in mounts if m["component"] == name
                    and (m["attrs"].get("version") or comp["version_default"]) == version]
            sizes = Counter(m["attrs"].get("size") or comp["size_default"] for m in mine
                            if (m["attrs"].get("size") or comp["size_default"]))
            size = _majority(sizes, [s for s in [comp["size_default"]] + comp["sizes"] if s]) or \
                comp["size_default"] or (comp["sizes"][0] if comp["sizes"] else None)
            links = sum(1 for m in mine if m["attrs"].get("href"))
            form = "link" if mine and links * 2 >= len(mine) else "button"
            attrs = {"version": version, "label": PROBE_LABEL}
            if size:
                attrs["size"] = size
            if form == "link":
                attrs["href"] = "#"
            out.append({"component": name, "attrs": attrs, "links": comp["links"],
                        "meta": {"version": version, "size": size, "form": form, "mounts": len(mine),
                                 "sizes": dict(sorted(sizes.items()))}})
    return out
