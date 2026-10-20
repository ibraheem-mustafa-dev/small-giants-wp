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

A family that is loaded but never rendered is NOT added (the negative control in the tests), unless the
draft's design system declares it: ``add_token_families`` adds every family the export's
``tokens/typography.css`` names in a ``--*font*`` custom property (the draft's own font roles, such as
``--font-mono``), because a family the design system declares may paint only on a surface the measured
render never opens (a mega menu, a drawer). A family
that renders but is neither a Google font nor already bundled by the framework is reported as a gap
and not added: the extractor has no file to self-host, and a name with nothing loading it is the
exact silent-fallback bug the font-face gate (``extract.py::validate_font_faces``) fails the run
closed on.

Pure except for ``resolve_face``, the extractor's own self-host callable, passed in so this module
never fetches or writes anything itself.
"""
from __future__ import annotations

import pathlib
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
# An @import address: a quoted one runs to its closing quote and an unquoted url() to its ")", so a CSS2
# address's ";" between weights (``wght@500;600&family=...``) never cuts it short.
_IMPORT = re.compile(r"""@import\s+(?:url\(\s*(?:(['"])(?P<q>.*?)\1|(?P<u>[^)\s]+))\s*\)|(['"])(?P<s>.*?)\4)""", re.I)


def import_urls(css: str) -> list:
    """Every @import address in a stylesheet, in order."""
    return [m.group("q") or m.group("u") or m.group("s") for m in _IMPORT.finditer(css or "")]


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
    urls = list(links) + import_urls(css)
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


_NOT_FAMILY = {"normal", "italic", "oblique", "bold", "bolder", "lighter"}
_FONT_VAR = re.compile(r"(--[a-z0-9-]*font[a-z0-9-]*)\s*:\s*([^;}]+)", re.I)


def token_families(draft_dir) -> tuple[list, list]:
    """The families the export's ``tokens/typography.css`` declares, and the Google Fonts URLs it imports:
    ``([{"name", "var", "google"}], [url])``. A family is declared when a ``--*font*`` custom property's
    stack names it first; it is ``google`` when one of the file's ``@import`` URLs loads it. No file: ``([], [])``."""
    path = pathlib.Path(draft_dir) / "tokens" / "typography.css" if draft_dir else None
    if not path or not path.is_file():
        return [], []
    css = path.read_text(encoding="utf-8")
    imports = [u for u in import_urls(css) if _host(u) in GOOGLE_CSS_HOSTS]
    loaded = {n.lower() for u in imports for n in link_families(u)}
    out: list = []
    for var, stack in _FONT_VAR.findall(css):
        names = stack_names(stack)
        # A size, weight, style or alias property (--font-size-body: 16px, --font-weight: 600,
        # --font-alias: var(--font-body)) names no family.
        if (not names or names[0].lower() in _GENERIC | _NOT_FAMILY or "(" in names[0]
                or re.match(r"^[\d.]", names[0])):
            continue
        if not any(f["name"].lower() == names[0].lower() for f in out):
            out.append({"name": names[0], "var": var, "google": names[0].lower() in loaded})
    return out, imports


_FONT_DECL = re.compile(r"font-family\s*:\s*([^;}\"]+)", re.I)


def code_names_family(code: str, name: str, var: str) -> bool:
    """Whether the draft's own code paints with a family: a ``font-family`` declaration (inline style, style
    rule or the logic's style strings) whose stack names it first, or that reads its token (``var(--font-mono)``)."""
    for m in _FONT_DECL.finditer(code or ""):
        value = m.group(1)
        names = stack_names(value)
        if (names and names[0].lower() == name.lower()) or re.search(rf"var\(\s*{re.escape(var)}\s*[,)]", value, re.I):
            return True
    return False


def add_token_families(snap: dict, draft_dir, trace: list, resolve_face, bundled: set, code: str) -> None:
    """Append one ``fontFamilies`` entry per family ``tokens/typography.css`` declares that no entry names
    yet and the draft's ``code`` paints with (``code_names_family``; Spec 48 §11: a token counts only where
    the draft's code uses it), self-hosted through ``resolve_face(name)``. Role slots are never modified. A
    declared family that is neither imported from Google Fonts nor bundled by the framework is a gap: no file
    to self-host."""
    declared, _imports = token_families(draft_dir)
    fams = snap.setdefault("settings", {}).setdefault("typography", {}).setdefault("fontFamilies", [])
    for fam in declared:
        name, key = fam["name"], fam["name"].lower()
        if any(_clean(stack_names(f.get("fontFamily", ""))[0] if f.get("fontFamily") else "").lower() == key
               or _clean(f.get("name", "")).lower() == key for f in fams):
            continue
        if not code_names_family(code, name, fam["var"]):
            trace.append({"kind": "skip", "what": f"fontFamilies:{name}",
                          "reason": f"declared by tokens/typography.css ({fam['var']}) but no font-family in the "
                                    "draft's code uses it: not added (Spec 48 §11)"})
            continue
        if not fam["google"] and key not in bundled:
            trace.append({"kind": "gap", "what": f"fontFamilies:{name}",
                          "reason": f"declared by tokens/typography.css ({fam['var']}) but neither imported from "
                                    "Google Fonts nor bundled by the framework: no file to self-host, so not added"})
            continue
        slug = slugify(name)
        if slug in ("body", "heading", "display"):
            slug = f"{slug}-font"
        entry = {"slug": slug, "name": name, "fontFamily": f"'{name}'", "google": fam["google"], "_source": "tokens"}
        face = resolve_face(name)
        if face:
            entry["fontFace"] = face
        fams.append(entry)
        trace.append({"kind": "font-family", "what": f"fontFamilies:{slug}",
                      "reason": f"declared by the design system's tokens/typography.css ({fam['var']})"})
