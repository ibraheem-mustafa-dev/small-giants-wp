"""used_fonts.py — FR-33-18: every font family a draft LOADS and actually RENDERS becomes a
``settings.typography.fontFamilies`` entry, beside the three role slots (body / heading / display).

The role slots answer "which family is the body text / the headings". They cannot answer "which
families does this design need on the site": a draft that sets its Google-reviews widget in Roboto
loads and paints Roboto on a handful of nodes, and no role slot ever names it. Before this module
the snapshot simply lost that family.

Two tests, BOTH required, so the entry list is neither padded nor lossy:
  1. LOADED — the draft asks for the family: a Google Fonts CSS ``<link>`` / ``@import`` names it,
     or a draft ``@font-face`` rule declares it.
  2. RENDERED — the in-page census (``font-usage.js`` via measure.js, ``facts["fontUsage"]``) found a
     rendered element whose computed stack resolves to it. A family is taken to paint an element when
     it is the first LOADED name in that element's stack and no generic family precedes it (a generic
     such as ``sans-serif`` always resolves, so nothing after it can paint).

A family that is loaded but never rendered is NOT added (the negative control in the tests). A family
that renders but is neither a Google font nor already bundled by the framework is reported as a gap
and not added: the extractor has no file to self-host, and a name with nothing loading it is the
exact silent-fallback bug the font-face gate (``extract.py::validate_font_faces``) fails the run
closed on.

Pure except for ``resolve_face``, the extractor's own self-host callable, passed in so this module
never fetches or writes anything itself.
"""
from __future__ import annotations

import re
import urllib.parse

GOOGLE_CSS_HOSTS = {"fonts.googleapis.com"}
GOOGLE_FILE_HOSTS = {"fonts.gstatic.com"}

# CSS generic families + system keywords. Any of these in a stack always resolves, so a family
# listed AFTER one can never be the one that paints.
_GENERIC = {
    "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "emoji", "math",
    "fangsong", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "-apple-system",
    "blinkmacsystemfont", "inherit", "initial", "unset",
}

_FONT_FACE = re.compile(r"@font-face\s*\{([^}]*)\}", re.I)
_IMPORT = re.compile(r"""@import\s+(?:url\()?\s*['"]?([^'")\s;]+)""", re.I)


def _host(url: str) -> str | None:
    try:
        parsed = urllib.parse.urlparse(url)
    except ValueError:
        return None
    return parsed.hostname if parsed.scheme == "https" else None


def _clean(name: str) -> str:
    return (name or "").strip().strip("'\"").strip()


def stack_names(stack: str) -> list[str]:
    """``'"Playfair Display", serif'`` -> ``['Playfair Display', 'serif']``."""
    return [n for n in (_clean(part) for part in (stack or "").split(",")) if n]


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def link_families(url: str) -> list[str]:
    """Family names a Google Fonts CSS URL requests. Handles CSS2 (``family=`` repeated, one family
    each, ``Name:wght@400;500``) and CSS v1 (``family=A:400,700|B``)."""
    try:
        query = urllib.parse.urlparse(url).query
    except ValueError:
        return []
    out: list[str] = []
    for value in urllib.parse.parse_qs(query).get("family", []):
        for part in value.split("|"):
            name = _clean(part.split(":")[0])
            if name and name not in out:
                out.append(name)
    return out


def loaded_families(links: list, css: str) -> dict:
    """LOWERCASED family name -> ``{"name", "google"}`` for every family the draft asks the browser
    to load: Google CSS links / @imports, and draft @font-face rules (Google when the rule's src is
    on fonts.gstatic.com). Insertion order is the draft's declaration order."""
    out: dict = {}
    urls = list(links) + [m.group(1) for m in _IMPORT.finditer(css or "")]
    for url in urls:
        if _host(url) in GOOGLE_CSS_HOSTS:
            for name in link_families(url):
                out.setdefault(name.lower(), {"name": name, "google": True})
    for m in _FONT_FACE.finditer(css or ""):
        body = m.group(1)
        fam = re.search(r"font-family:\s*([^;]+);?", body, re.I)
        if not fam:
            continue
        name = _clean(fam.group(1))
        srcs = re.findall(r"url\(\s*['\"]?([^'\")]+)", body, re.I)
        google = any(_host(s) in GOOGLE_FILE_HOSTS for s in srcs)
        row = out.setdefault(name.lower(), {"name": name, "google": google})
        row["google"] = row["google"] or google
    return out


def painting_family(stack: str, loaded: dict) -> str | None:
    """The loaded family that paints an element with this computed stack, or None."""
    for name in stack_names(stack):
        key = name.lower()
        if key in _GENERIC:
            return None
        if key in loaded:
            return key
    return None


def _weight(value) -> str:
    v = str(value or "400").strip().lower()
    return {"normal": "400", "bold": "700"}.get(v, v)


def _style(value) -> str:
    v = str(value or "normal").strip().lower()
    return "italic" if v.startswith(("italic", "oblique")) else "normal"


def rendered_usage(facts: dict, loaded: dict) -> dict:
    """LOWERCASED family -> ``{"weights", "styles", "stacks": {stack: count}, "count"}`` over the
    census rows whose painting family is loaded."""
    used: dict = {}
    for row in facts.get("fontUsage") or []:
        key = painting_family(row.get("fontFamily", ""), loaded)
        if not key:
            continue
        n = int(row.get("count") or 1)
        u = used.setdefault(key, {"weights": set(), "styles": set(), "stacks": {}, "count": 0})
        u["weights"].add(_weight(row.get("fontWeight")))
        u["styles"].add(_style(row.get("fontStyle")))
        stack = row.get("fontFamily", "")
        u["stacks"][stack] = u["stacks"].get(stack, 0) + n
        u["count"] += n
    return used


def _faced_families(fams: list) -> set:
    return {_clean(face.get("fontFamily", "")).lower()
            for fam in fams for face in (fam.get("fontFace") or []) if face.get("fontFamily")}


def add_rendered_families(snap: dict, facts: dict, links: list, css: str, trace: list,
                          resolve_face, bundled: set) -> None:
    """Append (or annotate) one ``fontFamilies`` entry per loaded-and-rendered family. Role slots are
    never modified. ``resolve_face(name)`` returns a fontFace list or None; ``bundled`` is the set of
    lowercased family names the framework already self-hosts."""
    if "fontUsage" not in facts:
        trace.append({"kind": "gap", "what": "fontFamilies:rendered",
                      "reason": "facts carry no fontUsage census (measured by an older measure.js) — "
                                "FR-33-18 skipped; re-measure the draft"})
        return
    fams = snap.setdefault("settings", {}).setdefault("typography", {}).setdefault("fontFamilies", [])
    loaded = loaded_families(links, css)
    used = rendered_usage(facts, loaded)
    by_slug = {f.get("slug"): f for f in fams}

    for key, info in loaded.items():
        name = info["name"]
        if key not in used:
            trace.append({"kind": "skip", "what": f"fontFamilies:{name}",
                          "reason": "the draft loads this family but no rendered element uses it — "
                                    "not added (FR-33-18 negative case)"})
            continue
        u = used[key]
        if not info["google"] and key not in bundled:
            trace.append({"kind": "gap", "what": f"fontFamilies:{name}",
                          "reason": "rendered, but neither a Google font nor bundled by the framework — "
                                    "no file to self-host, so not added; supply the font files by hand"})
            continue
        stack = max(u["stacks"].items(), key=lambda kv: (kv[1], -len(kv[0])))[0]
        meta = {"google": info["google"],
                "fontWeights": sorted(u["weights"], key=lambda w: (len(w), w)),
                "fontStyles": sorted(u["styles"])}
        slug = slugify(name)
        if slug in ("body", "heading", "display"):
            slug = f"{slug}-font"  # a family literally named like a role slot must not replace it
        entry = by_slug.get(slug)
        if entry is None:
            entry = {"slug": slug, "name": name, "fontFamily": stack}
            fams.append(entry)
            by_slug[slug] = entry
        entry.update(meta)
        entry["_source"] = "rendered"
        if key not in _faced_families(fams):
            face = resolve_face(name)
            if face:
                entry["fontFace"] = face
        trace.append({"kind": "font-family", "what": f"fontFamilies:{slug}",
                      "reason": "loaded by the draft and rendered on "
                                f"{u['count']} element(s) — FR-33-18", "fontFamily": stack,
                      "weights": ",".join(meta["fontWeights"]), "google": info["google"]})
